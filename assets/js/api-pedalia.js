/* API de Pedalia: https://api.pedalia.example
 *
 * Una API inventada, pero viva. No sale a internet: corre dentro del navegador (y dentro del worker de Python,
 * para que `requests` la use), y se comporta como la de un proveedor real:
 *
 * - Los datos avanzan con el reloj real: cada minuto empiezan y terminan viajes, y algunos se reembolsan horas
 *   después (cambia su updated_at). Hay 14 días de historia antes del día en que empezaste a usarla.
 * - OAuth 2.0 client credentials: registras una app en el portal de desarrolladores (#/pedalia-dev), pides un
 *   token con POST /oauth/token y lo envías como Bearer. El token vence a los 15 minutos (de verdad).
 * - Límite de 60 pedidos por minuto (429 + Retry-After + X-RateLimit-*) y cuota de 2.000 pedidos por día.
 * - Fallas: mantenimiento diario de 03:00 a 03:15 (hora de Ciudad del Río), incidentes de degradación en días
 *   al azar, errores intermitentes (1 %), y en la v1 un 200 con el error dentro del cuerpo.
 * - Versiones: la v1 (paginación por número de página, hora local, nombres en español) está deprecada desde el
 *   día en que empiezas y se da de baja 10 días después (410 Gone). La v2 usa cursor estable por updated_at,
 *   UTC y montos en centavos. El calendario de cambios es propio de cada estudiante y se anuncia en el changelog:
 *   a los 4 días aparecen payment_method y el valor nuevo user_type = "corporate"; a los 6, la estación 73 (Muelle Norte); la red tiene 72.
 *
 * apiPedaliaFactory se serializa con toString() y se evalúa en el worker de Python: no puede usar nada de afuera.
 * La configuración (semilla, inicio, apps registradas, cuota usada, incidentes forzados) llega con configurar().
 */
(function () {
  'use strict';
  function apiPedaliaFactory(g) {
    const HOST = 'api.pedalia.example';
    const BASE = 'https://' + HOST;
    const ZONA_H = -3; // Ciudad del Río: UTC-3, sin horario de verano
    const MIN = 60000, HORA = 3600000, DIA = 86400000;
    const LIMITE_MIN = 60, CUOTA_DIA = 2000, TOKEN_SEG = 900;
    const MAX_DUR = 2.5 * HORA, MAX_REEMB = 31 * HORA;

    const cfg = { semilla: 4242, inicio: Date.UTC(2026, 10, 18, 12), apps: [], cuota: {}, forzados: [], desfase: 0 };
    const st = { ventanas: {}, log: [], n: 0, cacheMin: new Map() };
    const ahora = () => Date.now() + cfg.desfase;

    // ---------------------------------------------------------------- azar determinista
    function h32() { let h = 2166136261; for (const a of arguments) { const s = String(a); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } h ^= 0x9e3779b9; h = Math.imul(h ^ (h >>> 13), 0x5bd1e995); } return (h ^ (h >>> 15)) >>> 0; }
    function azar(seed) { let a = seed >>> 0; const r = () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; return { r, int: (x, y) => x + Math.floor(r() * (y - x + 1)), chance: (p) => r() < p }; }
    const pad = (n, k = 2) => String(n).padStart(k, '0');
    const local = (ms) => new Date(ms + ZONA_H * HORA); // fecha "de pared" en Ciudad del Río, leída con getUTC*
    const fmtLocal = (ms) => { const d = local(ms); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`; };
    const fmtUtc = (ms) => new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z');
    const diaLocal = (ms) => fmtLocal(ms).slice(0, 10);
    const inicioDiaLocal = (ms) => { const d = local(ms); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - ZONA_H * HORA; };

    // ---------------------------------------------------------------- calendario del estudiante
    const t0 = () => inicioDiaLocal(cfg.inicio) - 14 * DIA; // primer dato disponible
    function hitos() {
      const i = inicioDiaLocal(cfg.inicio);
      return {
        v2: i - 45 * DIA, deprecacionV1: i, anuncioCampos: i + 2 * DIA, campos: i + 4 * DIA,
        estacionNueva: i + 6 * DIA, capacidad7: i + 3 * DIA, avisoBajaV1: i + 7 * DIA, bajaV1: i + 10 * DIA,
      };
    }
    function changelog() {
      const H = hitos(), f = (ms) => diaLocal(ms);
      return [
        { fecha: f(H.v2), version: '2.0.0', tipo: 'nuevo', titulo: 'API v2', detalle: 'Paginación por cursor sobre updated_at (estable aunque lleguen datos nuevos), fechas en UTC (ISO 8601) y montos en centavos (amount_cents). La v1 sigue funcionando.' },
        { fecha: f(H.deprecacionV1), version: '1.9.0', tipo: 'deprecacion', titulo: 'La v1 queda deprecada', detalle: `Las respuestas de /v1 traen las cabeceras Deprecation y Sunset. La v1 se da de baja el ${f(H.bajaV1)}: migren a /v2/trips.` },
        { fecha: f(H.anuncioCampos), version: '2.3.0 (anuncio)', tipo: 'aviso', titulo: 'Próximo cambio en /v2/trips', detalle: `A partir del ${f(H.campos)}: (1) campo nuevo payment_method ("card" | "wallet"), (2) user_type puede valer "corporate" (planes de empresas, se facturan por mes: amount_cents = 0). Si validan el enum de forma estricta, actualicen antes de esa fecha.` },
        { fecha: f(H.capacidad7), version: '2.3.1', tipo: 'datos', titulo: 'Capacidad de la estación 7', detalle: 'La estación 7 (Hospital Viejo) pasó de 20 a 30 anclajes. /v2/stations cambia su ETag.' },
        { fecha: f(H.campos), version: '2.4.0', tipo: 'cambio', titulo: 'payment_method y user_type = "corporate"', detalle: 'Ya disponibles en /v2/trips. Los viajes corporativos anteriores a hoy siguen informados como "subscriber".' },
        { fecha: f(H.estacionNueva), version: '2.4.1', tipo: 'datos', titulo: 'Estación nueva: 73 · Muelle Norte', detalle: 'Aparece en /v2/stations y en los viajes desde hoy.' },
        { fecha: f(H.avisoBajaV1), version: '1.9.1', tipo: 'aviso', titulo: 'Recordatorio: la v1 se apaga en 3 días', detalle: `Desde el ${f(H.bajaV1)}, /v1 responde 410 Gone.` },
        { fecha: f(H.bajaV1), version: '—', tipo: 'baja', titulo: 'La v1 fue dada de baja', detalle: 'Todas las rutas /v1 responden 410 Gone.' },
      ];
    }

    // ---------------------------------------------------------------- estaciones
    const NOMBRES = ['Plaza Mayor', 'Mercado Central', 'Terminal Norte', 'Rambla Este', 'Parque Lineal', 'Hospital Viejo', 'Universidad', 'Dique Seco', 'Estación Sur', 'Biblioteca', 'Cerro Bajo', 'Puente Azul', 'Faro', 'Plaza de los Pinos', 'Club Náutico', 'Avenida del Río', 'Molino Rojo', 'Feria Franca', 'Escuela 12', 'Cancha Grande', 'Polo Tecnológico', 'Costanera', 'Jardín Botánico', 'Barrio Obrero', 'Plaza del Sol', 'Estación Central', 'Parque Norte', 'Puerto Deportivo', 'Mercado del Puerto', 'Teatro Municipal', 'Palacio de Justicia', 'Hospital Nuevo', 'Facultad de Ingeniería', 'Parque de los Tilos', 'Rambla Sur', 'Playa Grande', 'Plaza de Armas', 'Torre del Reloj', 'Estadio Municipal', 'Velódromo', 'Parque Central', 'Terminal Sur', 'Aduana', 'Casco Antiguo', 'Plaza Colón', 'Mirador', 'Arroyo Seco', 'Barrio del Sur', 'Paseo del Lago', 'Cuatro Caminos', 'Plaza Nueva', 'Punta del Faro', 'Bahía Chica', 'Los Sauces', 'Las Acacias', 'Villa Esperanza', 'Paso del Molino', 'Bella Vista', 'La Aguada', 'Barrio Jardín', 'Parque Industrial', 'Ciudad Universitaria', 'Hipódromo', 'Vivero Municipal', 'Plaza del Mercado', 'Puente Viejo', 'Avenida Libertad', 'Calle del Puerto', 'Barrio Norte', 'Los Olivos', 'Monte Alto', 'Muelle Sur', 'Muelle Norte']; // 72 estaciones + la 73, Muelle Norte, que abre a mitad del proyecto
    const NUEVA = NOMBRES.length;
    const BARRIOS = ['Puerto Viejo', 'La Loma', 'Centro', 'Los Álamos', 'Villa Sol', 'El Molino'];
    function estaciones(t = ahora()) {
      const H = hitos(); const R = azar(cfg.semilla * 7 + 1);
      return NOMBRES.map((nombre, i) => {
        const id = i + 1; const cap = R.int(12, 30); const lat = Number((-34.88 - R.r() * 0.06).toFixed(5)); const lon = Number((-56.12 - R.r() * 0.09).toFixed(5));
        if (id === NUEVA && t < H.estacionNueva) return null;
        return { id, name: nombre, neighborhood: id === NUEVA ? 'Puerto Viejo' : BARRIOS[i % BARRIOS.length], capacity: id === 7 ? (t >= H.capacidad7 ? 30 : 20) : cap, lat, lon, active: true };
      }).filter(Boolean);
    }

    // ---------------------------------------------------------------- viajes (salen de la semilla y del minuto)
    const LAMBDA = [0.04, 0.02, 0.01, 0.01, 0.02, 0.1, 0.45, 1.1, 1.6, 1.0, 0.6, 0.6, 0.8, 0.85, 0.7, 0.6, 0.75, 1.2, 1.6, 1.1, 0.65, 0.4, 0.25, 0.1];
    function viajesDelMinuto(m) {
      if (st.cacheMin.has(m)) return st.cacheMin.get(m);
      const ini = m * MIN; const L = [];
      if (ini >= t0()) {
        const d = local(ini); const hora = d.getUTCHours(); const finde = d.getUTCDay() === 0 || d.getUTCDay() === 6;
        const dia = Math.floor((ini + ZONA_H * HORA) / DIA); const lluvia = azar(h32(cfg.semilla, 'lluvia', dia)).chance(0.2);
        const lambda = 5 * LAMBDA[hora] * (finde ? 0.8 : 1) * (lluvia ? 0.6 : 1); // ~4.500 viajes en un día hábil
        const R = azar(h32(cfg.semilla, 'min', m));
        let n = 0, p = Math.exp(-lambda), s = p; const u = R.r(); while (u > s && n < 60) { n++; p *= lambda / n; s += p; }
        const H = hitos(); const hayNueva = ini >= H.estacionNueva;
        for (let k = 0; k < n; k++) {
          const start = ini + R.int(0, 59) * 1000;
          const durMin = R.chance(0.04) ? R.int(60, 140) : 4 + Math.pow(R.r(), 1.8) * 48;
          const end = start + Math.round(durMin * MIN);
          const max = hayNueva ? NUEVA : NUEVA - 1;
          const origen = R.int(1, max); let destino = R.int(1, max); if (destino === origen) destino = (destino % max) + 1;
          const x = R.r(); const tipo = x < 0.04 ? 'corporate' : x < 0.68 ? 'subscriber' : 'day_pass';
          const minutos = (end - start) / MIN;
          const centavos = tipo === 'corporate' ? 0 : tipo === 'subscriber' ? (minutos <= 30 ? 0 : Math.ceil((minutos - 30) / 15) * 15000) : 45000 + (minutos > 45 ? Math.ceil((minutos - 45) / 15) * 15000 : 0);
          const fuera = R.chance(0.012);
          const reemb = R.chance(0.03) ? end + R.int(2, 30) * HORA + R.int(0, 59) * MIN : null;
          L.push({ id: m * 100 + k, bike: `B-${pad(R.int(1, 1500), 4)}`, origen, destino: fuera ? null : destino, fuera, start, end, tipo, centavos, pago: R.chance(0.7) ? 'card' : 'wallet', reemb });
        }
      }
      if (st.cacheMin.size > 40000) st.cacheMin.clear();
      st.cacheMin.set(m, L);
      return L;
    }
    // cómo se ve un viaje en un instante dado (lo que devolvería la base del proveedor)
    function estado(v, t) {
      if (t < v.start) return null;
      const st0 = t < v.end ? 'in_progress' : v.reemb && t >= v.reemb ? 'refunded' : 'completed';
      return { st: st0, upd: st0 === 'in_progress' ? v.start : st0 === 'refunded' ? v.reemb : v.end };
    }
    function viajesEntre(desde, hasta, t) {
      const out = [];
      for (let m = Math.floor(Math.max(desde, t0()) / MIN); m * MIN <= hasta; m++) for (const v of viajesDelMinuto(m)) out.push(v);
      return out;
    }
    function aV2(v, e, t) {
      const H = hitos(); const nuevos = t >= H.campos; const corp = v.tipo === 'corporate' && (nuevos && v.start >= H.campos);
      const o = {
        id: v.id, bike_id: v.bike, origin_station_id: v.origen,
        destination_station_id: e.st === 'in_progress' ? null : v.destino,
        started_at: fmtUtc(v.start), ended_at: e.st === 'in_progress' ? null : fmtUtc(v.end),
        status: e.st, user_type: corp ? 'corporate' : v.tipo === 'corporate' ? 'subscriber' : v.tipo,
        amount_cents: e.st === 'in_progress' ? null : e.st === 'refunded' ? 0 : v.centavos,
        currency: 'PES', ended_outside_station: e.st === 'in_progress' ? null : v.fuera, updated_at: fmtUtc(e.upd),
      };
      if (nuevos) o.payment_method = v.pago;
      return o;
    }
    function aV1(v, e) {
      return {
        viaje_id: v.id, bici_id: v.bike, estacion_origen: v.origen,
        estacion_destino: e.st === 'in_progress' ? null : (v.fuera ? 99 : v.destino),
        inicio: fmtLocal(v.start), fin: e.st === 'in_progress' ? null : fmtLocal(v.end),
        tipo_usuario: v.tipo === 'day_pass' ? 'pase_dia' : 'abono',
        monto: e.st === 'in_progress' ? null : (e.st === 'refunded' ? 0 : v.centavos / 100).toFixed(2),
        estado: { in_progress: 'en_curso', completed: 'finalizado', refunded: 'reembolsado' }[e.st],
      };
    }

    // ---------------------------------------------------------------- fallas
    function mantenimiento(t) { const d = local(t); const m = d.getUTCHours() * 60 + d.getUTCMinutes(); return m >= 180 && m < 195; }
    function incidenteDe(t) {
      for (const f of cfg.forzados || []) if (t >= f.desde && t < f.hasta) return { id: f.id, desde: f.desde, hasta: f.hasta, tasa: f.tasa || 0.35, titulo: f.titulo || 'Degradación provocada desde el portal (modo práctica)' };
      const dia = Math.floor((t + ZONA_H * HORA) / DIA);
      for (const dd of [dia, dia - 1]) {
        const R = azar(h32(cfg.semilla, 'incidente', dd));
        if (!R.chance(0.45)) continue;
        const desde = dd * DIA - ZONA_H * HORA + R.int(9 * 60, 21 * 60) * MIN; const hasta = desde + R.int(25, 70) * MIN;
        if (t >= desde && t < hasta) return { id: 'inc_' + dd, desde, hasta, tasa: 0.25 + R.r() * 0.2, titulo: ['Latencia alta y errores 503 en /v2/trips', 'Errores intermitentes de la base de datos de viajes', 'Degradación del servicio de autenticación'][R.int(0, 2)] };
      }
      return null;
    }
    function incidentesRecientes(t) {
      const out = []; const dia = Math.floor((t + ZONA_H * HORA) / DIA);
      for (let dd = dia; dd > dia - 10; dd--) {
        const R = azar(h32(cfg.semilla, 'incidente', dd)); if (!R.chance(0.45)) continue;
        const desde = dd * DIA - ZONA_H * HORA + R.int(9 * 60, 21 * 60) * MIN; const hasta = desde + R.int(25, 70) * MIN;
        if (desde > t || desde < t0()) continue;
        out.push({ id: 'inc_' + dd, desde: fmtUtc(desde), hasta: fmtUtc(hasta), activo: t < hasta, titulo: ['Latencia alta y errores 503 en /v2/trips', 'Errores intermitentes de la base de datos de viajes', 'Degradación del servicio de autenticación'][R.int(0, 2)] });
      }
      for (const f of cfg.forzados || []) if (f.desde <= t) out.unshift({ id: f.id, desde: fmtUtc(f.desde), hasta: fmtUtc(f.hasta), activo: t < f.hasta, titulo: f.titulo || 'Degradación provocada desde el portal (modo práctica)' });
      return out;
    }

    // ---------------------------------------------------------------- respuestas
    const rid = () => 'req_' + (h32(cfg.semilla, st.n, ahora()) >>> 0).toString(36) + (st.n).toString(36);
    function res(status, body, headers = {}) {
      return { status, headers: { 'content-type': 'application/json; charset=utf-8', 'x-request-id': rid(), 'x-response-time-ms': String(40 + (h32(st.n, 'lat') % 320)), ...headers }, body: body === null ? '' : JSON.stringify(body, null, 2) };
    }
    const ERR = (status, error, descripcion, extra = {}, headers = {}) => res(status, { error, error_description: descripcion, ...extra }, headers);

    // tokens autocontenidos (como un JWT firmado): valen en la página y en el worker sin compartir estado
    const b64u = (s) => g.btoa(unescape(encodeURIComponent(s))).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
    const deB64u = (s) => decodeURIComponent(escape(g.atob(s.replace(/-/g, '+').replace(/_/g, '/'))));
    const firma = (p) => (h32('pedalia-firma', cfg.semilla, p) >>> 0).toString(36) + (h32(p, cfg.semilla, 'b') >>> 0).toString(36);
    function emitir(app, t) {
      const payload = b64u(JSON.stringify({ iss: BASE, sub: app.client_id, scope: (app.scopes || []).join(' '), iat: Math.floor(t / 1000), exp: Math.floor(t / 1000) + TOKEN_SEG, jti: (h32(app.client_id, t) >>> 0).toString(36) }));
      const head = b64u(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      return `${head}.${payload}.${firma(head + '.' + payload)}`;
    }
    function leerToken(headers, t) {
      const auth = headers.authorization || '';
      const m = /^Bearer\s+(\S+)$/i.exec(auth);
      if (!m) return { error: ERR(401, 'invalid_request', 'Falta el token. Envía la cabecera Authorization: Bearer <access_token> (se obtiene con POST /oauth/token).', {}, { 'www-authenticate': 'Bearer realm="pedalia"' }) };
      const p = m[1].split('.');
      if (p.length !== 3 || firma(p[0] + '.' + p[1]) !== p[2]) return { error: ERR(401, 'invalid_token', 'El token no es válido (¿lo copiaste completo?).', {}, { 'www-authenticate': 'Bearer error="invalid_token"' }) };
      let c; try { c = JSON.parse(deB64u(p[1])); } catch (e) { return { error: ERR(401, 'invalid_token', 'El token no es válido.') }; }
      if (t / 1000 >= c.exp) return { error: ERR(401, 'invalid_token', 'The access token expired. Pide uno nuevo con POST /oauth/token.', { expired_at: fmtUtc(c.exp * 1000) }, { 'www-authenticate': 'Bearer error="invalid_token", error_description="The access token expired"' }) };
      const app = (cfg.apps || []).find((a) => a.client_id === c.sub);
      if (!app || app.borrada) return { error: ERR(401, 'invalid_token', 'La app de este token ya no existe.') };
      return { claims: c, app };
    }
    function parsearCuerpo(body, headers) {
      if (!body) return {};
      if (typeof body === 'object') return body;
      const ct = headers['content-type'] || '';
      if (/json/.test(ct) || /^\s*\{/.test(body)) { try { return JSON.parse(body); } catch (e) { return { __malo: true }; } }
      return Object.fromEntries(new URLSearchParams(body));
    }
    function limitar(cliente, t) {
      const v = (st.ventanas[cliente] = (st.ventanas[cliente] || []).filter((x) => x > t - MIN));
      const dia = diaLocal(t); const k = cliente + '|' + dia; const usada = (cfg.cuota[k] || 0);
      const cab = { 'x-ratelimit-limit': String(LIMITE_MIN), 'x-ratelimit-remaining': String(Math.max(0, LIMITE_MIN - v.length - 1)), 'x-ratelimit-reset': String(Math.ceil(((v[0] || t) + MIN) / 1000)), 'x-quota-limit': String(CUOTA_DIA), 'x-quota-remaining': String(Math.max(0, CUOTA_DIA - usada - 1)) };
      if (usada >= CUOTA_DIA) { const fin = inicioDiaLocal(t) + DIA; return { error: ERR(429, 'quota_exceeded', `Usaste los ${CUOTA_DIA} pedidos del día. La cuota se renueva a medianoche (hora de Ciudad del Río).`, {}, { ...cab, 'retry-after': String(Math.ceil((fin - t) / 1000)) }) }; }
      if (v.length >= LIMITE_MIN) { const espera = Math.max(1, Math.ceil((v[0] + MIN - t) / 1000)); return { error: ERR(429, 'rate_limited', `Máximo ${LIMITE_MIN} pedidos por minuto. Espera ${espera} s (cabecera Retry-After).`, {}, { ...cab, 'retry-after': String(espera) }) }; }
      v.push(t); cfg.cuota[k] = usada + 1;
      return { cab };
    }
    function falla(t, ruta, cliente) {
      if (mantenimiento(t)) { const d = local(t); const resta = (195 - (d.getUTCHours() * 60 + d.getUTCMinutes())) * 60 - d.getUTCSeconds(); return ERR(503, 'maintenance', 'Mantenimiento programado de 03:00 a 03:15 (hora de Ciudad del Río). Ver https://status.pedalia.example', {}, { 'retry-after': String(Math.max(1, resta)) }); }
      const inc = incidenteDe(t); const x = (h32(cfg.semilla, 'falla', st.n, Math.floor(t / 1000), cliente) % 10000) / 10000;
      if (inc && x < inc.tasa) return ERR(503, 'service_unavailable', `Servicio degradado: ${inc.titulo}. Reintenta con espera exponencial.`, { incident_id: inc.id }, { 'retry-after': String(2 + (st.n % 5)) });
      if (x > 0.99) return ERR(x > 0.995 ? 502 : 500, x > 0.995 ? 'bad_gateway' : 'internal_error', 'Error inesperado del servidor. Es seguro reintentar los GET.', { request_id: rid() });
      return null;
    }

    // ---------------------------------------------------------------- rutas
    function request(method, url, headersIn, body) {
      method = String(method || 'GET').toUpperCase();
      let u; try { u = new URL(url); } catch (e) { return null; }
      if (u.host !== HOST) return null;
      const t = ahora(); st.n++;
      const headers = Object.fromEntries(Object.entries(headersIn || {}).map(([k, v]) => [k.toLowerCase(), String(v)]));
      const q = Object.fromEntries(u.searchParams.entries());
      const ruta = u.pathname.replace(/\/+$/, '') || '/';
      const H = hitos();
      let cliente = 'anonimo', r;
      const registrar = (resp) => { st.log.push({ t, metodo: method, ruta: u.pathname + (u.search || ''), status: resp.status, ms: Number(resp.headers['x-response-time-ms'] || 0), cliente, rid: resp.headers['x-request-id'], error: resp.status >= 400 ? (() => { try { return JSON.parse(resp.body).error; } catch (e) { return ''; } })() : '' }); if (st.log.length > 300) st.log.splice(0, st.log.length - 300); return resp; };

      // públicas
      if (ruta === '/' ) return registrar(res(200, { api: 'Pedalia API', versions: ['v1 (deprecada)', 'v2'], docs: 'https://developers.pedalia.example (en el curso: #/pedalia-dev)', status: BASE + '/status' }));
      if (ruta === '/status') {
        const inc = incidenteDe(t); const man = mantenimiento(t);
        return registrar(res(200, { status: man ? 'maintenance' : inc ? 'degraded' : 'operational', components: { auth: man ? 'maintenance' : 'operational', 'v2/trips': man ? 'maintenance' : inc ? 'degraded' : 'operational', 'v2/stations': man ? 'maintenance' : 'operational', v1: t >= H.bajaV1 ? 'retired' : 'deprecated' }, active_incident: inc ? { id: inc.id, title: inc.titulo, started_at: fmtUtc(inc.desde) } : null, next_maintenance: '03:00-03:15 America/Ciudad_del_Rio (UTC-3), todos los días', time: fmtUtc(t) }));
      }
      if (ruta === '/oauth/token') {
        if (method !== 'POST') return registrar(ERR(405, 'method_not_allowed', 'El token se pide con POST.'));
        if (mantenimiento(t)) return registrar(falla(t, ruta, cliente));
        const b = parsearCuerpo(body, headers);
        let id = b.client_id, sec = b.client_secret;
        const basic = /^Basic\s+(\S+)$/i.exec(headers.authorization || '');
        if (basic) { try { [id, sec] = g.atob(basic[1]).split(':'); } catch (e) { /* cabecera mal formada */ } }
        if (b.__malo) return registrar(ERR(400, 'invalid_request', 'El cuerpo no es JSON válido.'));
        if (b.grant_type !== 'client_credentials') return registrar(ERR(400, 'unsupported_grant_type', 'Esta API solo acepta grant_type=client_credentials.'));
        const app = (cfg.apps || []).find((a) => a.client_id === id && !a.borrada);
        cliente = id || 'anonimo';
        if (!app) return registrar(ERR(401, 'invalid_client', (cfg.apps || []).length ? 'client_id desconocido.' : 'Todavía no registraste ninguna app. Créala en el portal de desarrolladores (#/pedalia-dev) para obtener client_id y client_secret.'));
        const secreto = (app.secretos || []).find((s) => s.valor === sec);
        if (!secreto) return registrar(ERR(401, 'invalid_client', 'client_secret incorrecto.'));
        if (secreto.revocado && t >= secreto.revocado) return registrar(ERR(401, 'invalid_client', 'Ese client_secret fue revocado. Usa el secreto vigente (portal → tu app → Credenciales).'));
        return registrar(res(200, { access_token: emitir(app, t), token_type: 'Bearer', expires_in: TOKEN_SEG, scope: (app.scopes || []).join(' ') }, { 'cache-control': 'no-store' }));
      }

      // con token
      if (!/^\/v[12](\/|$)/.test(ruta)) return registrar(ERR(404, 'not_found', `No existe la ruta ${ruta}. Mira la documentación en el portal.`));
      if (ruta.startsWith('/v1') && t >= H.bajaV1) return registrar(ERR(410, 'gone', `La v1 fue dada de baja el ${diaLocal(H.bajaV1)}. Usa /v2 (ver el changelog del portal).`, { migrate_to: BASE + '/v2/trips' }));
      const tk = leerToken(headers, t); if (tk.error) return registrar(tk.error);
      cliente = tk.app.client_id;
      const lim = limitar(cliente, t); if (lim.error) return registrar(lim.error);
      const caida = falla(t, ruta, cliente); if (caida) return registrar({ ...caida, headers: { ...caida.headers, ...lim.cab } });
      const scope = (s) => (tk.claims.scope || '').split(' ').includes(s) ? null : ERR(403, 'insufficient_scope', `El token no tiene el permiso ${s}. Agrégalo a tu app en el portal y pide un token nuevo.`);
      const dep = ruta.startsWith('/v1') ? { deprecation: '@' + Math.floor(H.deprecacionV1 / 1000), sunset: new Date(H.bajaV1).toUTCString(), link: '<https://developers.pedalia.example/changelog>; rel="deprecation"' } : {};
      const ok = (body0, extra = {}) => registrar(res(200, body0, { ...lim.cab, ...dep, ...extra }));
      if (method !== 'GET') return registrar(ERR(405, 'method_not_allowed', 'Esta ruta solo acepta GET.', {}, lim.cab));

      // v2
      if (ruta === '/v2/trips') {
        const e = scope('trips:read'); if (e) return registrar(e);
        const limit = q.limit === undefined ? 100 : Number(q.limit);
        if (!Number.isInteger(limit) || limit < 1 || limit > 500) return registrar(ERR(400, 'invalid_parameter', 'limit debe ser un entero entre 1 y 500.', {}, lim.cab));
        let desde, despuesDe = null;
        if (q.cursor) {
          try { const c = JSON.parse(deB64u(q.cursor)); desde = c.s; despuesDe = [c.u, c.i]; } catch (er) { return registrar(ERR(400, 'invalid_cursor', 'El cursor no es válido: usa el next_cursor tal como lo devolvió la API.', {}, lim.cab)); }
        } else {
          if (!q.updated_since) return registrar(ERR(400, 'invalid_parameter', 'Falta updated_since (ISO 8601 en UTC, por ejemplo 2026-11-18T00:00:00Z).', {}, lim.cab));
          desde = Date.parse(q.updated_since);
          if (!Number.isFinite(desde) || !/(Z|[+-]\d{2}:?\d{2})$/.test(q.updated_since)) return registrar(ERR(400, 'invalid_parameter', 'updated_since tiene que ser ISO 8601 con zona horaria (termina en Z o en ±hh:mm).', {}, lim.cab));
          if (desde < t0()) desde = t0();
        }
        const lista = [];
        for (const v of viajesEntre(desde - MAX_DUR - MAX_REEMB, t, t)) {
          const est = estado(v, t); if (!est || est.upd < desde) continue;
          if (despuesDe && (est.upd < despuesDe[0] || (est.upd === despuesDe[0] && v.id <= despuesDe[1]))) continue;
          lista.push([est.upd, v, est]);
        }
        lista.sort((a, b) => a[0] - b[0] || a[1].id - b[1].id);
        const pag = lista.slice(0, limit);
        const datos = pag.map(([, v, est]) => aV2(v, est, t));
        // entrega "al menos una vez": a veces el primer elemento repite el último de la página anterior
        if (despuesDe && datos.length && h32(cfg.semilla, q.cursor) % 100 < 6) {
          const prev = viajesEntre(despuesDe[0] - MAX_DUR, despuesDe[0], t).find((v) => v.id === despuesDe[1]);
          const est = prev && estado(prev, t); if (prev && est) datos.unshift(aV2(prev, est, t));
        }
        const ult = pag[pag.length - 1];
        const next = lista.length > limit && ult ? b64u(JSON.stringify({ s: desde, u: ult[0], i: ult[1].id })) : null;
        return ok({ data: datos, has_more: !!next, next_cursor: next });
      }
      if (ruta === '/v2/stations') {
        const e = scope('stations:read'); if (e) return registrar(e);
        const lista = estaciones(t); const etag = '"' + (h32(JSON.stringify(lista)) >>> 0).toString(16) + '"';
        if ((headers['if-none-match'] || '') === etag) return registrar({ status: 304, headers: { etag, ...lim.cab, 'x-request-id': rid(), 'x-response-time-ms': '12' }, body: '' });
        return ok({ data: lista, count: lista.length }, { etag, 'cache-control': 'max-age=300' });
      }
      let m = /^\/v2\/stations\/(\d+)\/status$/.exec(ruta);
      if (m) {
        const e = scope('stations:read'); if (e) return registrar(e);
        const est = estaciones(t).find((x) => x.id === Number(m[1])); if (!est) return registrar(ERR(404, 'not_found', `No existe la estación ${m[1]}.`, {}, lim.cab));
        const bloque = Math.floor(t / (5 * MIN)); const R = azar(h32(cfg.semilla, 'estado', est.id, est.id === 13 ? Math.floor(t / (5 * MIN)) - 24 : bloque));
        const bicis = R.int(0, est.capacity); const reportado = est.id === 13 ? t - 2 * HORA - (t % (5 * MIN)) : bloque * 5 * MIN;
        return ok({ station_id: est.id, bikes_available: bicis, docks_available: est.capacity - bicis, is_renting: true, last_reported: fmtUtc(reportado) });
      }
      m = /^\/v2\/trips\/(\d+)$/.exec(ruta);
      if (m) {
        const e = scope('trips:read'); if (e) return registrar(e);
        const id = Number(m[1]); const v = viajesDelMinuto(Math.floor(id / 100)).find((x) => x.id === id); const est = v && estado(v, t);
        return v && est ? ok(aV2(v, est, t)) : registrar(ERR(404, 'not_found', `No existe el viaje ${m[1]}.`, {}, lim.cab));
      }
      // v1 (deprecada)
      if (ruta === '/v1/viajes') {
        const e = scope('trips:read'); if (e) return registrar(e);
        const fecha = q.fecha || diaLocal(t);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return registrar(ERR(400, 'parametro_invalido', 'fecha debe ser AAAA-MM-DD (hora de Ciudad del Río).', {}, { ...lim.cab, ...dep }));
        const page = q.page === undefined ? 1 : Number(q.page), per = q.per_page === undefined ? 50 : Number(q.per_page);
        if (!Number.isInteger(page) || page < 1 || !Number.isInteger(per) || per < 1 || per > 100) return registrar(ERR(400, 'parametro_invalido', 'page ≥ 1 y per_page entre 1 y 100.', {}, { ...lim.cab, ...dep }));
        // un error "histórico" de la v1: a veces responde 200 con el error adentro
        if (h32(cfg.semilla, 'v1', st.n) % 100 === 0) return ok({ ok: false, error: 'timeout consultando la base de viajes', datos: [] });
        const ini = Date.UTC(+fecha.slice(0, 4), +fecha.slice(5, 7) - 1, +fecha.slice(8, 10)) - ZONA_H * HORA;
        const lista = viajesEntre(ini, Math.min(ini + DIA - 1, t), t).filter((v) => v.start >= ini && v.start < ini + DIA && v.start <= t).sort((a, b) => b.start - a.start || b.id - a.id); // los más nuevos primero
        const total = lista.length, paginas = Math.max(1, Math.ceil(total / per));
        return ok({ ok: true, fecha, pagina: page, por_pagina: per, total, paginas, datos: lista.slice((page - 1) * per, page * per).map((v) => aV1(v, estado(v, t))) });
      }
      if (ruta === '/v1/estaciones') {
        const e = scope('stations:read'); if (e) return registrar(e);
        return ok({ ok: true, datos: estaciones(t).map((x) => ({ estacion_id: x.id, nombre: x.name, barrio: x.neighborhood, capacidad: x.capacity })) });
      }
      return registrar(ERR(404, 'not_found', `No existe la ruta ${ruta}. Mira la documentación en el portal.`, {}, lim.cab));
    }

    const API = {
      HOST, BASE, LIMITE_MIN, CUOTA_DIA, TOKEN_SEG,
      esDeLaApi: (url) => /^https?:\/\/api\.pedalia\.example(\/|$|\?)/.test(String(url)),
      configurar(c) { Object.assign(cfg, c || {}); st.cacheMin.clear(); },
      config: () => cfg,
      request(method, url, headers, body) {
        const h = headers && typeof headers.toJs === 'function' ? headers.toJs({ dict_converter: Object.fromEntries }) : headers;
        const r = request(method, url, h || {}, body);
        if (r && typeof g.__alPedirPedalia === 'function') { try { g.__alPedirPedalia(); } catch (e) { /* nada */ } }
        return r;
      },
      avanzar(seg) { cfg.desfase += Math.max(0, Number(seg) || 0) * 1000; },
      tomarLog() { const l = st.log; st.log = []; return l; },
      verLog: () => st.log.slice(),
      // para el portal
      hitos, changelog, estaciones, incidenteDe, incidentesRecientes, mantenimiento, ahora, fmtUtc, diaLocal, t0,
      // los viajes que empezaron un día (hora de Ciudad del Río), como los devuelve la v2 en el instante t
      viajesDelDia(fecha, t = ahora()) { const ini = Date.UTC(+fecha.slice(0, 4), +fecha.slice(5, 7) - 1, +fecha.slice(8, 10)) - ZONA_H * HORA; return viajesEntre(ini, Math.min(ini + DIA - 1, t), t).filter((v) => v.start >= ini && v.start < ini + DIA && v.start <= t).map((v) => aV2(v, estado(v, t), t)); },
      viajesDeHoy() { const t = ahora(); const ini = inicioDiaLocal(t); return viajesEntre(ini, t, t).filter((v) => v.start >= ini && v.start <= t).map((v) => aV2(v, estado(v, t), t)); },
    };
    g.ApiPedalia = API;
    return API;
  }

  const g = typeof window !== 'undefined' ? window : self;
  apiPedaliaFactory(g);
  g.API_PEDALIA_SRC = apiPedaliaFactory.toString();

  // ---------------------------------------------------------------- en la página: guardar lo que pasa
  if (typeof window === 'undefined') return;
  const A = window.ApiPedalia;
  const almacen = () => (window.__almacen && window.__almacen()) || null;
  function datos() {
    const S = almacen(); if (!S) return null;
    S.data.pedaliaApi = S.data.pedaliaApi || {};
    const D = S.data.pedaliaApi;
    if (!D.inicio) D.inicio = Date.now();
    D.apps = D.apps || []; D.cuota = D.cuota || {}; D.forzados = D.forzados || []; D.log = D.log || [];
    return D;
  }
  function semilla() { const S = almacen(); if (!S) return 4242; S.data.pedalia = S.data.pedalia || {}; if (!S.data.pedalia.semilla) { S.data.pedalia.semilla = 1000 + Math.floor(Math.random() * 899000); } return S.data.pedalia.semilla; }
  let listo = false;
  function sincronizar() {
    const D = datos(); if (!D) return false;
    A.configurar({ semilla: semilla(), inicio: D.inicio, apps: D.apps, cuota: D.cuota, forzados: D.forzados });
    listo = true; return true;
  }
  let pendiente = null;
  function guardar() {
    const D = datos(); if (!D) return;
    const nuevos = A.tomarLog(); if (nuevos.length) { D.log.push(...nuevos); if (D.log.length > 300) D.log.splice(0, D.log.length - 300); }
    clearTimeout(pendiente); pendiente = setTimeout(() => { try { almacen().save(); } catch (e) { /* lleno */ } avisar(); }, 200);
  }
  const oyentes = new Set();
  function avisar() { for (const f of oyentes) { try { f(); } catch (e) { /* nada */ } } }
  window.__alPedirPedalia = () => { if (!listo) sincronizar(); setTimeout(guardar, 0); };
  window.ApiPedaliaHost = {
    datos, sincronizar, guardar, oyentes, semilla,
    // lo que vuelve del worker de Python: su registro de pedidos y la cuota que consumió
    incorporar(log, cuota) {
      const D = datos(); if (!D) return;
      if (Array.isArray(log) && log.length) { D.log.push(...log); if (D.log.length > 300) D.log.splice(0, D.log.length - 300); }
      if (cuota) for (const [k, v] of Object.entries(cuota)) D.cuota[k] = Math.max(D.cuota[k] || 0, v);
      sincronizar(); try { almacen().save(); } catch (e) { /* lleno */ } avisar();
    },
    configParaWorker() { sincronizar(); return JSON.parse(JSON.stringify(A.config())); },
  };
  // la configuración se carga apenas exista el almacén (y antes de cada pedido, por las dudas)
  const intento = setInterval(() => { if (sincronizar()) clearInterval(intento); }, 300);
})();
