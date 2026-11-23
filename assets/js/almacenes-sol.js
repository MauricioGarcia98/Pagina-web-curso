/* Almacenes del Sol: el proyecto 6. Una cadena regional de 30 supermercados (inventada) con:
 * - El ERP viejo (PostgreSQL 9.6 en el servidor de la oficina): sucursales y productos. El proceso nocturno de las
 *   03:00 pisa precios, costos y categorías sin guardar historia: si quieres la historia (SCD tipo 2), tienes que
 *   sacar una foto todos los días. psql contra erp-sol.almacenes.example.
 * - Las cajas (POS): una API con los tickets de cada sucursal y día, paginada por número de página. Una sucursal se
 *   queda sin conexión y manda sus tickets dos días después (con algunos repetidos).
 * - La planilla de metas semanales por sucursal, que mantiene Planeamiento a mano (sol metas descargar): títulos,
 *   porcentajes como texto, una fila de total, y a mitad del proyecto alguien la reorganiza.
 * Cambio sin aviso en el ERP: Compras divide la categoría "Almacén" en "Almacén seco" y "Frescos".
 *
 * almacenesSolFactory se serializa con toString() y se evalúa en el worker de Python (para requests).
 */
(function () {
  'use strict';
  function almacenesSolFactory(g) {
    const SEG = 1000, MIN = 60000, HORA = 3600000, DIA = 86400000, ZONA_H = -3;
    const cfg = { semilla: 4242, inicio: Date.UTC(2026, 10, 19, 12), desfase: 0 };
    const ahora = () => Date.now() + cfg.desfase;
    function h32() { let h = 2166136261; for (const a of arguments) { const s = String(a); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } h ^= 0x9e3779b9; h = Math.imul(h ^ (h >>> 13), 0x5bd1e995); } return (h ^ (h >>> 15)) >>> 0; }
    function azar(seed) { let a = seed >>> 0; const r = () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; return { r, int: (x, y) => x + Math.floor(r() * (y - x + 1)), chance: (p) => r() < p, pick: (l) => l[Math.floor(r() * l.length)] }; }
    const pad = (n, k = 2) => String(n).padStart(k, '0');
    const local = (ms) => new Date(ms + ZONA_H * HORA);
    const diaLocal = (ms) => { const d = local(ms); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`; };
    const inicioDiaLocal = (ms) => { const d = local(ms); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - ZONA_H * HORA; };
    const msDeDia = (f) => Date.UTC(+f.slice(0, 4), +f.slice(5, 7) - 1, +f.slice(8, 10)) - ZONA_H * HORA;
    const sumarDias = (f, n) => diaLocal(msDeDia(f) + n * DIA + HORA);
    const fmtLocal = (ms) => { const d = local(ms); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`; };
    const lunesDe = (f) => { const d = new Date(msDeDia(f) + 12 * HORA); const w = (d.getUTCDay() + 6) % 7; return sumarDias(f, -w); };
    const hex = (tag, n) => { let o = ''; let k = 0; while (o.length < n) o += h32(cfg.semilla, tag, k++).toString(16).padStart(8, '0'); return o.slice(0, n); };

    const I = () => inicioDiaLocal(cfg.inicio);
    function hitos() { const i = I(); return { categorias: i + DIA + 3 * HORA, caida: i + 2 * DIA, planilla: i + 2 * DIA + 10 * HORA }; }
    const claves = () => ({ erp: { host: 'erp-sol.almacenes.example', puerto: 5432, base: 'erp', usuario: 'consulta_bi', clave: 'Sol' + hex('erp', 10) }, pos: 'pos_' + hex('pos', 26) });
    const SUCURSALES = [['S01', 'Centro', 'Ciudad del Río'], ['S02', 'Puerto Viejo', 'Ciudad del Río'], ['S03', 'La Loma', 'Ciudad del Río'], ['S04', 'Los Álamos', 'Ciudad del Río'], ['S05', 'Villa Sol', 'Costa Azul'], ['S06', 'El Molino', 'Costa Azul'], ['S07', 'Ruta 9', 'San Telmo'], ['S08', 'Mercado Norte', 'San Telmo']];
    // volumen de empresa: la cadena regional completa (30 sucursales). Las 8 originales conservan su código y nombre.
    for (const [k, nom] of ['Las Acacias', 'Bella Vista', 'El Prado', 'Los Pinos', 'Monte Verde', 'Arroyo Seco', 'Las Palmas', 'Barrio Norte', 'Villa Esperanza', 'Los Robles', 'Altos del Río', 'Puerta del Sol', 'Las Flores', 'Nuevo Horizonte', 'El Mirador', 'Campo Alegre', 'Los Sauces', 'Villa del Mar', 'San Lorenzo', 'La Ribera', 'Tres Cruces', 'El Bosque'].entries()) SUCURSALES.push([`S${pad(k + 9)}`, nom, ['Ciudad del Río', 'Costa Azul', 'San Telmo', 'Valle Verde', 'Puerto Claro'][k % 5]]);
    const GRANDES = new Set(['S01', 'S08', 'S02', 'S12', 'S19', 'S26']);
    const MARCAS = ['Del Sol', 'Campo Lindo', 'Primera', 'La Huerta', 'Don Pedro', 'Marca Propia', 'Clásico', 'Premium', 'El Granero', 'Sierra Azul', 'Tres Hermanos', 'Buen Día', 'La Colonia', 'Del Valle', 'Económico', 'Familiar'];
    const CATS = { ALM: 'Almacén', BEB: 'Bebidas', LIM: 'Limpieza', PER: 'Perfumería', LAC: 'Lácteos', CAR: 'Carnes', VER: 'Frutas y verduras', PAN: 'Panadería' };
    const PRODS = { ALM: ['Arroz 1 kg', 'Fideos 500 g', 'Aceite 1,5 l', 'Yerba 1 kg', 'Harina 1 kg', 'Azúcar 1 kg', 'Café 250 g', 'Lentejas 500 g', 'Tomate triturado', 'Galletitas', 'Atún en lata', 'Mermelada'], BEB: ['Agua 2 l', 'Gaseosa cola 2,25 l', 'Jugo naranja 1 l', 'Cerveza 1 l', 'Vino tinto', 'Agua con gas 1,5 l'], LIM: ['Detergente 750 ml', 'Lavandina 2 l', 'Jabón en polvo 3 kg', 'Esponjas x3', 'Papel higiénico x4'], PER: ['Shampoo', 'Jabón de tocador x3', 'Pasta dental', 'Desodorante'], LAC: ['Leche 1 l', 'Yogur 1 kg', 'Queso cremoso 1 kg', 'Manteca 200 g', 'Dulce de leche'], CAR: ['Carne picada 1 kg', 'Pollo entero', 'Milanesas 1 kg', 'Chorizos 1 kg'], VER: ['Papa 2 kg', 'Tomate 1 kg', 'Banana 1 kg', 'Manzana 1 kg', 'Lechuga'], PAN: ['Pan flauta', 'Medialunas x6', 'Pan de molde'] };
    // los productos del almacén que pasan a "Frescos" en la reorganización
    const A_FRESCOS = new Set(['Mermelada', 'Atún en lata']);

    // ---------------------------------------------------------------- catálogo con su historia (el ERP solo ve el presente)
    let cache = null;
    function mundo() {
      const clave = cfg.semilla + ':' + I(); if (cache && cache.clave === clave) return cache;
      const s = cfg.semilla; const R = azar(h32(s, 'sol')); const H = hitos(); const T0 = I() - 21 * DIA, FIN = I() + 30 * DIA;
      const productos = []; let n = 0;
      for (const [cat, lista] of Object.entries(PRODS)) for (const base of lista) for (const marca of MARCAS) { n++; const nombre = `${base} ${marca}`; const precio = Math.round((60 + R.r() * 900) / 5) * 5; productos.push({ id: n, sku: `7790${pad(n, 5)}${(h32(s, 'dv', n) % 10)}`, nombre, base, versiones: [{ desde: T0 - 400 * DIA, categoria: cat, precio, costo: Math.round(precio * (0.55 + R.r() * 0.2)) }] }); }
      // cambios nocturnos de precio y costo (a las 03:00), y la reorganización de categorías
      for (let d = T0; d < FIN; d += DIA) {
        const t = inicioDiaLocal(d) + 3 * HORA;
        for (const p of productos) {
          const v = p.versiones[p.versiones.length - 1];
          if (t === inicioDiaLocal(H.categorias) + 3 * HORA && v.categoria === 'ALM') { p.versiones.push({ ...v, desde: t, categoria: A_FRESCOS.has(p.base || p.nombre) ? 'FRE' : 'ALS' }); continue; }
          const Rd = azar(h32(s, 'precio', p.id, d)); if (Rd.chance(0.04)) { const sube = 1 + Rd.r() * 0.12; p.versiones.push({ ...v, desde: t, precio: Math.round(v.precio * sube / 5) * 5, costo: Rd.chance(0.7) ? Math.round(v.costo * (1 + Rd.r() * 0.1)) : v.costo }); }
        }
      }
      cache = { clave, productos, T0, FIN }; return cache;
    }
    const versionEn = (p, t) => { let v = p.versiones[0]; for (const x of p.versiones) { if (x.desde <= t) v = x; else break; } return v; };
    const CATS_TODAS = { ...CATS, ALS: 'Almacén seco', FRE: 'Frescos' };

    // ---------------------------------------------------------------- las cajas: tickets por sucursal y día
    const cacheT = new Map();
    function tickets(suc, fecha) {
      const k = cfg.semilla + ':' + suc + ':' + fecha; if (cacheT.has(k)) return cacheT.get(k);
      const base = msDeDia(fecha); const R = azar(h32(cfg.semilla, 'pos', suc, fecha)); const W = mundo(); const dom = new Date(base + 12 * HORA).getUTCDay() === 0;
      const grande = GRANDES.has(suc); const n = Math.round((grande ? 450 : 220) * (dom ? 0.7 : 1) * (0.85 + R.r() * 0.3)); const out = [];
      for (let i = 0; i < n; i++) {
        const ts = base + R.int(8 * 60, 21 * 60 + 30) * MIN + R.int(0, 59) * SEG; const nl = R.int(1, 5); const lineas = []; const usados = new Set();
        for (let j = 0; j < nl; j++) { const p = R.pick(W.productos); if (usados.has(p.id)) continue; usados.add(p.id); const v = versionEn(p, ts); const cant = R.chance(0.8) ? 1 : R.int(2, 4); const desc = R.chance(0.08) ? Math.round(v.precio * cant * 0.1) : 0; lineas.push({ sku: p.sku, cantidad: cant, precio_unitario: v.precio, descuento: desc }); }
        out.push({ ticket_id: `${suc}-${fecha.replace(/-/g, '').slice(2)}-${pad(i + 1, 4)}`, sucursal: suc, ts, caja: R.int(1, grande ? 6 : 3), medio_pago: R.pick(['efectivo', 'debito', 'credito', 'qr']), lineas, anulado: R.chance(0.01) });
      }
      out.sort((a, b) => a.ts - b.ts); cacheT.set(k, out); if (cacheT.size > 200) cacheT.delete(cacheT.keys().next().value);
      return out;
    }
    // cuándo están disponibles los tickets de un día en la API (la sucursal que se cayó los manda dos días después)
    const SUC_CAIDA = 'S05';
    function disponible(suc, fecha, t) { const H = hitos(); if (suc === SUC_CAIDA && fecha === diaLocal(H.caida + HORA)) return t >= msDeDia(fecha) + 2 * DIA + 10 * HORA; return t >= msDeDia(fecha) + DIA + 2 * HORA; }
    function ticketsApi(suc, fecha, t) {
      if (!disponible(suc, fecha, t)) return null; const L = tickets(suc, fecha); const H = hitos();
      if (suc === SUC_CAIDA && fecha === diaLocal(H.caida + HORA)) { const R = azar(h32(cfg.semilla, 'rep', fecha)); const out = []; for (const x of L) { out.push(x); if (R.chance(0.06)) out.push(x); } return out; } // reintentos al reconectar
      return L;
    }

    // ---------------------------------------------------------------- metas semanales (la planilla de Planeamiento)
    function metaSemana(suc, lunes) { const R = azar(h32(cfg.semilla, 'meta', suc, lunes)); const grande = GRANDES.has(suc); return Math.round((grande ? 6900000 : 3500000) * (0.95 + R.r() * 0.15) / 1000) * 1000; }
    function planilla(t = ahora()) {
      const H = hitos(); const nueva = t >= H.planilla; const lunesHoy = lunesDe(diaLocal(t)); const semanas = [-3, -2, -1, 0, 1].map((k) => sumarDias(lunesHoy, 7 * k));
      const nombre = (s) => (nueva && s[0] === 'S01' ? 'Centro (local nuevo)' : `Sucursal ${s[1]}`);
      const fmt = (v) => (nueva ? String(v) : '$ ' + v.toLocaleString('es-AR').replace(/,/g, '.'));
      const filas = [];
      if (!nueva) {
        filas.push('METAS DE VENTA SEMANALES 2026 - USO INTERNO;;;;;;', `Actualizado por: Planeamiento (${diaLocal(t - 2 * DIA)});;;;;;`, ';;;;;;');
        filas.push(['Sucursal', 'Código', ...semanas.map((w) => `Semana del ${w.slice(8, 10)}/${w.slice(5, 7)}`), 'Crec. vs 2025'].join(';'));
        for (const s of SUCURSALES) filas.push([nombre(s), s[0], ...semanas.map((w) => fmt(metaSemana(s[0], w))), `${(h32(s[0], 'c') % 15) + 3}%`].join(';'));
        filas.push(['TOTAL', '', ...semanas.map((w) => fmt(SUCURSALES.reduce((a, s) => a + metaSemana(s[0], w), 0))), ''].join(';'));
        return filas.join('\n') + '\n';
      }
      // la versión reorganizada: una fila por sucursal y semana (formato largo), con el código en otra columna y decimales
      filas.push('sucursal_nombre,semana_desde,meta_ventas,codigo_sucursal,comentario');
      for (const s of SUCURSALES) for (const w of semanas) filas.push([`"${nombre(s)}"`, w, metaSemana(s[0], w).toFixed(2), s[0], s[0] === 'S01' && w === lunesHoy ? '"local nuevo desde el lunes"' : ''].join(','));
      return filas.join('\n') + '\n';
    }

    // ---------------------------------------------------------------- la API de las cajas
    const st = { ventanas: {}, n: 0 };
    function res(status, cuerpo, h = {}) { return { status, headers: { 'content-type': 'application/json', 'x-request-id': 'rq_' + h32(cfg.semilla, ++st.n, ahora()).toString(36), ...h }, body: JSON.stringify(cuerpo, null, 2) }; }
    function request(method, url, headers) {
      const t = ahora(); const H = {}; for (const [k, v] of Object.entries(headers || {})) H[k.toLowerCase()] = String(v);
      const u = new URL(url); const ruta = u.pathname.replace(/\/+$/, ''); const q = Object.fromEntries(u.searchParams.entries());
      if (H['x-api-key'] !== claves().pos) return res(401, { error: 'API key inválida o ausente (cabecera X-Api-Key).' });
      if (ruta === '/v1/sucursales') return res(200, { sucursales: SUCURSALES.map((s) => ({ codigo: s[0], nombre: s[1], ciudad: s[2] })) });
      if (ruta === '/v1/tickets') {
        if (!q.sucursal || !/^\d{4}-\d{2}-\d{2}$/.test(q.fecha || '')) return res(400, { error: 'Parámetros obligatorios: sucursal y fecha (AAAA-MM-DD).' });
        if (!SUCURSALES.some((s) => s[0] === q.sucursal)) return res(404, { error: `No existe la sucursal ${q.sucursal}.` });
        const L = ticketsApi(q.sucursal, q.fecha, t); if (!L) return res(404, { error: `Todavía no hay cierre de caja de ${q.sucursal} para ${q.fecha} (se sincroniza a las 02:00).` });
        const tam = 200; const pag = Math.max(1, Number(q.pagina || 1) || 1); const total = Math.ceil(L.length / tam) || 1;
        return res(200, { sucursal: q.sucursal, fecha: q.fecha, pagina: pag, paginas: total, tickets: L.slice((pag - 1) * tam, pag * tam).map((x) => ({ ticket_id: x.ticket_id, fecha_hora: fmtLocal(x.ts), caja: x.caja, medio_pago: x.medio_pago, anulado: x.anulado, lineas: x.lineas })) });
      }
      return res(404, { error: `No existe ${ruta}.` });
    }
    const API = { esDeLaApi: (url) => /^https?:\/\/api\.possol\.example(\/|$|\?)/.test(String(url)), configurar(c) { const a = cfg.semilla + ':' + cfg.inicio; Object.assign(cfg, c || {}); if (a !== cfg.semilla + ':' + cfg.inicio) { cache = null; cacheT.clear(); } }, request(m, url, h) { const hh = h && typeof h.toJs === 'function' ? h.toJs({ dict_converter: Object.fromEntries }) : h; return request(m, url, hh || {}); }, avanzar(s) { cfg.desfase += Math.max(0, Number(s) || 0) * 1000; } };
    const MUNDO = { cfg, ahora, hitos, claves, mundo, versionEn, tickets, ticketsApi, disponible, planilla, metaSemana, lunesDe, SUCURSALES, CATS: CATS_TODAS, SUC_CAIDA, diaLocal, inicioDiaLocal, msDeDia, sumarDias, fmtLocal, API };
    g.AlmacenesSolApi = API; g.AlmacenesSolMundo = MUNDO; return MUNDO;
  }
  const g = typeof window !== 'undefined' ? window : self;
  almacenesSolFactory(g);
  g.ALMACENES_SOL_SRC = almacenesSolFactory.toString();
  if (typeof window === 'undefined') return;
  const AS = window.AlmacenesSolMundo;
  const almacen = () => (window.__almacen && window.__almacen()) || null;
  function datos() { const S = almacen(); if (!S) return null; S.data.sol = S.data.sol || {}; const D = S.data.sol; if (!D.semilla) D.semilla = 1000 + Math.floor(Math.random() * 899000); if (!D.inicio) D.inicio = Date.now(); D.fotos = D.fotos || []; return D; }
  function sincronizar() { const D = datos(); if (!D) return false; AS.API.configurar({ semilla: D.semilla, inicio: D.inicio }); return true; }
  window.AlmacenesSolHost = { datos, sincronizar, guardar() { try { almacen().save(); } catch (e) { /* lleno */ } }, configParaWorker() { sincronizar(); return { semilla: AS.cfg.semilla, inicio: AS.cfg.inicio }; } };
  const intento = setInterval(() => { if (sincronizar()) clearInterval(intento); }, 300);
})();
