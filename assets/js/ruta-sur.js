/* Ruta Sur: el proyecto 4. Una empresa de reparto de última milla (inventada) con 20 camionetas que mandan GPS y
 * eventos de entrega en tiempo real a Event Hubs (protocolo Kafka, 4 particiones), y un sistema de despachos (TMS)
 * con una API que da el plan de rutas del día (con pedidos urgentes que se agregan durante el día).
 *
 * Problemas reales del streaming: zonas sin señal (los eventos llegan juntos y tarde, desordenados), reenvíos
 * (duplicados), un apagón cuyos eventos llegan al día siguiente, una actualización de firmware que cambia el
 * esquema (velocidad en m/s, hora en milisegundos) y una camioneta con el reloj adelantado dos horas.
 *
 * rutaSurFactory se serializa con toString() y se evalúa en el worker de Python (para requests): no usa nada de afuera.
 */
(function () {
  'use strict';
  function rutaSurFactory(g) {
    const SEG = 1000, MIN = 60000, HORA = 3600000, DIA = 86400000, ZONA_H = -3;
    const cfg = { semilla: 4242, inicio: Date.UTC(2026, 10, 19, 12), desfase: 0 };
    const ahora = () => Date.now() + cfg.desfase;
    function h32() { let h = 2166136261; for (const a of arguments) { const s = String(a); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } h ^= 0x9e3779b9; h = Math.imul(h ^ (h >>> 13), 0x5bd1e995); } return (h ^ (h >>> 15)) >>> 0; }
    function azar(seed) {
      let a = seed >>> 0;
      const r = () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
      return { r, int: (x, y) => x + Math.floor(r() * (y - x + 1)), chance: (p) => r() < p, pick: (l) => l[Math.floor(r() * l.length)] };
    }
    const pad = (n, k = 2) => String(n).padStart(k, '0');
    const local = (ms) => new Date(ms + ZONA_H * HORA);
    const diaLocal = (ms) => { const d = local(ms); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`; };
    const inicioDiaLocal = (ms) => { const d = local(ms); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - ZONA_H * HORA; };
    const msDeDia = (f) => Date.UTC(+f.slice(0, 4), +f.slice(5, 7) - 1, +f.slice(8, 10)) - ZONA_H * HORA;
    const sumarDias = (f, n) => diaLocal(msDeDia(f) + n * DIA + HORA);
    const hhmm = (ms) => { const d = local(ms); return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`; };
    function km(a, b) { const R = 6371, rad = Math.PI / 180; const dLat = (b[0] - a[0]) * rad, dLon = (b[1] - a[1]) * rad; const x = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(dLon / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); }

    const DEPOSITO = [-34.8706, -56.1741];
    const ZONAS = { 'Puerto Viejo': [-34.905, -56.205], 'La Loma': [-34.872, -56.135], 'Centro': [-34.901, -56.172], 'Los Álamos': [-34.856, -56.098], 'Villa Sol': [-34.889, -56.062], 'El Molino': [-34.838, -56.163] };
    const NZ = Object.keys(ZONAS);
    const VEHICULOS = Array.from({ length: 20 }, (_, i) => 'V' + pad(i + 1));
    const PARTICIONES = 4; const TEMA = 'rutasur.telemetria'; const RETENCION = 3 * DIA;
    const T0 = () => inicioDiaLocal(cfg.inicio) - 3 * DIA;
    function hitos() { const i = inicioDiaLocal(cfg.inicio); return { firmware: i + DIA + 6 * HORA, reloj: i + 2 * DIA, apagon: i + 3 * DIA }; }
    const FW2 = new Set(VEHICULOS.slice(0, 10));
    const claves = () => ({
      eh: { broker: 'rutasur-telemetria.servicebus.windows.net:9093', cs: `Endpoint=sb://rutasur-telemetria.servicebus.windows.net/;SharedAccessKeyName=lectura-datos;SharedAccessKey=${[...Array(43)].map((_, k) => 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'[h32(cfg.semilla, 'rseh', k) % 64]).join('')}=` },
      api: 'rs_live_' + [...Array(28)].map((_, k) => '0123456789abcdef'[h32(cfg.semilla, 'rsapi', k) % 16]).join(''),
    });
    const particionDe = (v) => h32('p', v) % PARTICIONES;

    // ---------------------------------------------------------------- un día de la flota
    const cacheDia = new Map();
    function dia(fecha) {
      const k = cfg.semilla + ':' + fecha; if (cacheDia.has(k)) return cacheDia.get(k);
      const base = msDeDia(fecha); const domingo = new Date(base + 12 * HORA).getUTCDay() === 0; const H = hitos();
      const pedidos = [], eventos = []; let nPed = 0;
      if (!domingo) for (const v of VEHICULOS) {
        const R = azar(h32(cfg.semilla, 'ruta', fecha, v)); const zonas = [NZ[h32(v, 'z1') % NZ.length], NZ[h32(v, 'z2') % NZ.length]];
        const n = R.int(18, 25); const paradas = [];
        for (let i = 0; i < n; i++) { const z = R.chance(0.7) ? zonas[0] : zonas[1]; const c = ZONAS[z]; paradas.push({ pedido_id: `P${fecha.replace(/-/g, '').slice(2)}${v.slice(1)}${pad(++nPed, 3)}`, zona: z, lat: Number((c[0] + (R.r() - 0.5) * 0.02).toFixed(5)), lon: Number((c[1] + (R.r() - 0.5) * 0.02).toFixed(5)), urgente: false }); }
        // pedidos urgentes que se agregan a media mañana
        const urg = R.chance(0.35) ? R.int(1, 2) : 0; const tUrg = base + (10 * 60 + R.int(0, 50)) * MIN;
        for (let i = 0; i < urg; i++) { const z = zonas[0]; const c = ZONAS[z]; paradas.splice(R.int(Math.floor(n / 2), n), 0, { pedido_id: `P${fecha.replace(/-/g, '').slice(2)}${v.slice(1)}${pad(++nPed, 3)}`, zona: z, lat: Number((c[0] + (R.r() - 0.5) * 0.02).toFixed(5)), lon: Number((c[1] + (R.r() - 0.5) * 0.02).toFixed(5)), urgente: true, agregado: tUrg }); }
        // ventanas de 3 horas según el orden (con algo de desorden del planificador)
        paradas.forEach((p, i) => { const frac = i / paradas.length; let w = frac < 0.34 ? 9 : frac < 0.67 ? 12 : 15; if (R.chance(0.1)) w = Math.max(9, w - 3); p.ventana_inicio = base + w * HORA; p.ventana_fin = base + (w + 3) * HORA; p.vehiculo = v; p.orden = i + 1; p.fecha = fecha; });
        // la jornada
        let t = base + (8 * 60 + R.int(0, 20)) * MIN; let pos = DEPOSITO.slice(); const evs = [];
        const ev = (tipo, ts, lat, lon, extra = {}) => evs.push({ id: h32(cfg.semilla, fecha, v, evs.length).toString(16).padStart(8, '0') + '-' + h32(v, ts, tipo).toString(16).padStart(8, '0'), vehiculo: v, tipo, ts, lat: Number(lat.toFixed(5)), lon: Number(lon.toFixed(5)), ...extra });
        const pings = (t1, t2, a, b, vel) => { for (let tp = t1 + 3 * MIN - ((t1 - base) % (3 * MIN)); tp < t2; tp += 3 * MIN) { const f = (tp - t1) / Math.max(1, t2 - t1); ev('ping', tp + R.int(0, 20) * SEG, a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, { velocidad_kmh: vel ? Math.max(5, Math.round(vel + (R.r() - 0.5) * 14)) : 0 }); } };
        ev('inicio_jornada', t, pos[0], pos[1]);
        for (const p of paradas) {
          const dist = km(pos, [p.lat, p.lon]) * 1.3; const vel = 18 + R.r() * 10; const llega = t + Math.round((dist / vel) * 60 * MIN) + R.int(1, 6) * MIN;
          pings(t, llega, pos, [p.lat, p.lon], vel); ev('llegada_parada', llega, p.lat, p.lon, { pedido_id: p.pedido_id });
          const fin = llega + R.int(3, 9) * MIN; pings(llega, fin, [p.lat, p.lon], [p.lat, p.lon], 0);
          const ok = R.r() > 0.09; p.estado = ok ? 'completada' : 'fallida'; p.ts_entrega = fin; p.motivo = ok ? null : R.pick(['ausente', 'direccion_incorrecta', 'rechazado']);
          ev(ok ? 'entrega_completada' : 'entrega_fallida', fin, p.lat, p.lon, ok ? { pedido_id: p.pedido_id } : { pedido_id: p.pedido_id, motivo: p.motivo });
          t = fin; pos = [p.lat, p.lon];
        }
        const vuelta = t + Math.round((km(pos, DEPOSITO) * 1.3 / 25) * 60 * MIN); pings(t, vuelta, pos, DEPOSITO, 25); ev('fin_jornada', vuelta, DEPOSITO[0], DEPOSITO[1]);
        // cómo llegan a Event Hubs: ingesta normal, zonas sin señal, apagón y reenvíos
        const sinSenal = R.chance(0.3) ? (() => { const a = base + R.int(9 * 60, 15 * 60) * MIN; return [a, a + R.int(10, 80) * MIN]; })() : null;
        const apagon = v === 'V07' && fecha === diaLocal(H.apagon + HORA) ? [base + 13 * HORA, base + DIA] : null;
        for (const e of evs) {
          let ing = e.ts + R.int(800, 6000);
          if (sinSenal && e.ts >= sinSenal[0] && e.ts < sinSenal[1]) ing = sinSenal[1] + R.int(5, 40) * SEG;
          if (apagon && e.ts >= apagon[0]) ing = base + DIA + (7 * 60 + 30) * MIN + R.int(0, 600) * SEG;
          const fw2 = FW2.has(v) && e.ts >= H.firmware; const reloj = v === 'V13' && fecha === diaLocal(H.reloj + HORA) ? 2 * HORA : 0;
          const x = { ...e, ing, fw2, desvio: reloj };
          eventos.push(x); if (R.chance(0.012)) eventos.push({ ...x, ing: ing + R.int(10, 60) * SEG, dup: true });
        }
        pedidos.push(...paradas);
      }
      const r = { fecha, pedidos, eventos }; cacheDia.set(k, r); if (cacheDia.size > 60) cacheDia.delete(cacheDia.keys().next().value);
      return r;
    }
    // el mensaje tal como lo manda la camioneta (dos versiones de firmware)
    function valor(x) {
      const tsDisp = x.ts + x.desvio;
      if (x.fw2) { const o = { fw: '2.0', event_id: x.id, vehicle: x.vehiculo, type: x.tipo, ts: tsDisp, lat: x.lat, lon: x.lon, precision_m: 3 + (h32(x.id) % 12) }; if (x.velocidad_kmh != null) o.speed_mps = Number((x.velocidad_kmh / 3.6).toFixed(2)); if (x.pedido_id) o.order_id = x.pedido_id; if (x.motivo) o.reason = x.motivo; return JSON.stringify(o); }
      const o = { fw: '1.4', event_id: x.id, vehiculo: x.vehiculo, evento: x.tipo, ts_dispositivo: new Date(tsDisp).toISOString(), lat: x.lat, lon: x.lon }; if (x.velocidad_kmh != null) o.velocidad_kmh = x.velocidad_kmh; if (x.pedido_id) o.pedido_id = x.pedido_id; if (x.motivo) o.motivo = x.motivo; return JSON.stringify(o);
    }

    // ---------------------------------------------------------------- Kafka: 4 particiones por vehículo, retención 3 días
    // offsets estables: cada día (de llegada) es un tramo del log de cada partición; el offset es la cantidad de
    // mensajes que llegaron antes desde que existe el tópico
    const cacheB = new Map();
    function tramo(f) {
      const k = cfg.semilla + ':' + f; if (cacheB.has(k)) return cacheB.get(k);
      const P = Array.from({ length: PARTICIONES }, () => []);
      for (const x of [...(msDeDia(f) > T0() ? dia(sumarDias(f, -1)).eventos : []), ...dia(f).eventos]) if (diaLocal(x.ing) === f) P[particionDe(x.vehiculo)].push(x);
      for (const L of P) L.sort((a, b) => a.ing - b.ing || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
      cacheB.set(k, P); return P;
    }
    let cacheK = null;
    function particiones(t = ahora()) {
      const clave = cfg.semilla + ':' + Math.floor(t / MIN); if (cacheK && cacheK.clave === clave) return cacheK.P;
      const hoy = diaLocal(t); const desde = diaLocal(Math.max(T0(), t - RETENCION - DIA));
      const out = Array.from({ length: PARTICIONES }, (_, p) => ({ p, base: 0, L: [] }));
      for (let f = diaLocal(T0()); f < desde; f = sumarDias(f, 1)) tramo(f).forEach((L, p) => { out[p].base += L.length; });
      for (let f = desde; f <= hoy; f = sumarDias(f, 1)) tramo(f).forEach((L, p) => { for (const x of L) if (x.ing <= t) out[p].L.push(x); });
      cacheK = { clave, P: out }; return out;
    }
    function temas(t = ahora()) {
      return [{ tema: TEMA, particiones: PARTICIONES, rangos: particiones(t).map(({ p, base, L }) => { let bajo = 0; while (bajo < L.length && L[bajo].ing < t - RETENCION) bajo++; return { p, bajo: base + bajo, alto: base + L.length }; }) }];
    }
    function leer(tema, p, desde, hasta, t = ahora()) {
      if (tema !== TEMA) return { mensajes: [], perdidos: 0 };
      const P = particiones(t)[p]; const r = temas(t)[0].rangos[p]; const h = Math.min(hasta == null ? r.alto : hasta, r.alto); const d = Math.max(desde, r.bajo);
      const out = []; for (let o = d; o < h; o++) { const x = P.L[o - P.base]; out.push({ offset: o, ts: x.ing, clave: x.vehiculo, valor: valor(x) }); }
      return { mensajes: out, perdidos: desde < r.bajo ? r.bajo - desde : 0 };
    }
    function offsetPorTiempo(tema, p, ms, t = ahora()) { const P = particiones(t)[p]; const r = temas(t)[0].rangos[p]; for (let o = r.bajo; o < r.alto; o++) if (P.L[o - P.base].ing >= ms) return o; return r.alto; }

    // ---------------------------------------------------------------- la API del TMS
    const st = { ventanas: {}, n: 0 };
    function res(status, cuerpo, h = {}) { return { status, headers: { 'content-type': 'application/json', 'x-request-id': 'rq_' + h32(cfg.semilla, ++st.n, ahora()).toString(36), ...h }, body: JSON.stringify(cuerpo, null, 2) }; }
    const ERR = (s, m) => res(s, { error: m });
    function planDe(fecha, t) {
      if (t < msDeDia(fecha) - 6 * HORA) return null; // el plan se publica a las 18:00 del día anterior
      const D = dia(fecha); const porV = {};
      for (const p of D.pedidos) { if (p.urgente && p.agregado > t) continue; (porV[p.vehiculo] = porV[p.vehiculo] || []).push(p); }
      return Object.entries(porV).map(([v, ps]) => ({ vehiculo: v, conductor: ['Ana', 'Bruno', 'Carla', 'Diego', 'Elena', 'Facundo', 'Gabriela', 'Hernán', 'Inés', 'Joaquín'][h32(v) % 10] + ' ' + v.slice(1), actualizado_en: new Date(Math.max(msDeDia(fecha) - 6 * HORA, ...ps.filter((p) => p.urgente).map((p) => p.agregado))).toISOString(), pedidos: ps.map((p) => ({ pedido_id: p.pedido_id, orden: p.orden, zona: p.zona, lat: p.lat, lon: p.lon, ventana_inicio: new Date(p.ventana_inicio).toISOString(), ventana_fin: new Date(p.ventana_fin).toISOString(), urgente: p.urgente })) }));
    }
    function request(method, url, headers) {
      const t = ahora(); const H = {}; for (const [k, v] of Object.entries(headers || {})) H[k.toLowerCase()] = String(v);
      const u = new URL(url); const ruta = u.pathname.replace(/\/+$/, '');
      if (!H['x-api-key']) return ERR(401, 'Falta la cabecera X-Api-Key.');
      if (H['x-api-key'] !== claves().api) return ERR(403, 'API key inválida.');
      const v = Math.floor(t / MIN); st.ventanas = { [v]: (st.ventanas[v] || 0) + 1 }; if (st.ventanas[v] > 30) return res(429, { error: 'Límite: 30 pedidos por minuto.' }, { 'retry-after': String(60 - Math.floor((t % MIN) / 1000)) });
      let m;
      if (ruta === '/v1/rutas') { const f = u.searchParams.get('fecha'); if (!/^\d{4}-\d{2}-\d{2}$/.test(f || '')) return ERR(400, 'Parámetro fecha (AAAA-MM-DD) obligatorio.'); const p = planDe(f, t); if (!p) return ERR(404, `El plan del ${f} todavía no se publicó (se publica a las 18:00 del día anterior).`); return res(200, { fecha: f, rutas: p }); }
      if ((m = /^\/v1\/pedidos\/(P\d+)$/.exec(ruta))) { const f = `20${m[1].slice(1, 3)}-${m[1].slice(3, 5)}-${m[1].slice(5, 7)}`; const p = dia(f).pedidos.find((x) => x.pedido_id === m[1] && (!x.urgente || x.agregado <= t)); return p ? res(200, { pedido_id: p.pedido_id, vehiculo: p.vehiculo, zona: p.zona, ventana_inicio: new Date(p.ventana_inicio).toISOString(), ventana_fin: new Date(p.ventana_fin).toISOString(), urgente: p.urgente }) : ERR(404, 'No existe el pedido.'); }
      return ERR(404, `No existe la ruta ${ruta}.`);
    }
    const API = { esDeLaApi: (url) => /^https?:\/\/api\.rutasur\.example(\/|$|\?)/.test(String(url)), configurar(c) { Object.assign(cfg, c || {}); cacheDia.clear(); cacheB.clear(); cacheK = null; }, request(m, url, h) { const hh = h && typeof h.toJs === 'function' ? h.toJs({ dict_converter: Object.fromEntries }) : h; return request(m, url, hh || {}); }, avanzar(s) { cfg.desfase += Math.max(0, Number(s) || 0) * 1000; } };
    const MUNDO = { cfg, ahora, hitos, claves, dia, valor, temas, leer, offsetPorTiempo, particionDe, TEMA, PARTICIONES, VEHICULOS, ZONAS, FW2, DEPOSITO, km, diaLocal, inicioDiaLocal, msDeDia, sumarDias, hhmm, T0, API, planDe };
    g.RutaSurApi = API; g.RutaSurMundo = MUNDO; return MUNDO;
  }
  const g = typeof window !== 'undefined' ? window : self;
  rutaSurFactory(g);
  g.RUTA_SUR_SRC = rutaSurFactory.toString();
  if (typeof window === 'undefined') return;

  const RS = window.RutaSurMundo;
  const almacen = () => (window.__almacen && window.__almacen()) || null;
  function datos() { const S = almacen(); if (!S) return null; S.data.ruta = S.data.ruta || {}; const D = S.data.ruta; if (!D.semilla) D.semilla = 1000 + Math.floor(Math.random() * 899000); if (!D.inicio) D.inicio = Date.now(); D.grupos = D.grupos || {}; return D; }
  let ultimo = '';
  function sincronizar() { const D = datos(); if (!D) return false; const k = D.semilla + ':' + D.inicio; if (k !== ultimo) { RS.API.configurar({ semilla: D.semilla, inicio: D.inicio }); ultimo = k; } return true; }
  window.RutaSurHost = { datos, sincronizar, guardar() { try { almacen().save(); } catch (e) { /* lleno */ } }, configParaWorker() { sincronizar(); return { semilla: RS.cfg.semilla, inicio: RS.cfg.inicio }; } };
  const intento = setInterval(() => { if (sincronizar()) clearInterval(intento); }, 300);
})();
