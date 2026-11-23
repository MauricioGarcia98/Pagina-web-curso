/* Almacenes del Sol en las herramientas: psql contra el ERP (PostgreSQL real con PGlite, solo el presente), el comando
 * sol (accesos y planilla de metas), la revisión automática y el tablero.
 * Lecciones: <div data-sol="revisar"></div>, <div data-sol="tablero"></div>.
 */
(function () {
  'use strict';
  const AS = window.AlmacenesSolMundo, Host = window.AlmacenesSolHost, Sh = window.Shell;
  if (!AS || !Host) return;
  const HORA = 3600000, DIA = 86400000;
  const almacen = () => (window.__almacen && window.__almacen()) || null;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = (x) => String(x ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
  const lista = (xs, n = 4) => xs.slice(0, n).join(', ') + (xs.length > n ? ` y ${xs.length - n} más` : '');
  const ahora = () => AS.ahora(); const hoy = () => AS.diaLocal(ahora());

  // ================================================================== terminal: psql al ERP y el comando sol
  const lit = (v) => (v == null ? 'NULL' : typeof v === 'number' ? String(v) : typeof v === 'boolean' ? (v ? 'true' : 'false') : `'${String(v).replace(/'/g, "''")}'`);
  async function erpDb() {
    const url = (window.SqlMotores && window.SqlMotores.PGLITE_URL) || 'https://cdn.jsdelivr.net/npm/@electric-sql/pglite@0.4.6/dist/index.js';
    const mod = await import(/* webpackIgnore: true */ url); const id = (x) => x;
    const db = new mod.PGlite({ parsers: { [mod.types.DATE]: id, [mod.types.TIMESTAMP]: id, [mod.types.NUMERIC]: id, [mod.types.INT8]: id } });
    const t = ahora(); const W = AS.mundo();
    let sql = `CREATE TABLE sucursales (codigo varchar(3) PRIMARY KEY, nombre varchar(40), ciudad varchar(40));
CREATE TABLE categorias (codigo varchar(3) PRIMARY KEY, nombre varchar(40));
CREATE TABLE productos (id integer PRIMARY KEY, sku varchar(13) NOT NULL, nombre varchar(60), categoria varchar(3) REFERENCES categorias(codigo), precio numeric(10,2), costo numeric(10,2), activo char(1) DEFAULT 'S', ult_modif timestamp);
COMMENT ON COLUMN productos.ult_modif IS 'Fecha de la última modificación (la actualiza el proceso nocturno de precios)';
INSERT INTO sucursales VALUES ${AS.SUCURSALES.map((s) => `(${lit(s[0])}, ${lit(s[1])}, ${lit(s[2])})`).join(',')};
INSERT INTO categorias VALUES ${Object.entries(AS.CATS).filter(([k]) => t >= AS.hitos().categorias || !['ALS', 'FRE'].includes(k)).map(([k, v]) => `(${lit(k)}, ${lit(v)})`).join(',')};\n`;
    const filas = W.productos.map((p) => { const v = AS.versionEn(p, t); const vs = p.versiones.filter((x) => x.desde <= t); let ult = vs[0].desde; for (let i = 1; i < vs.length; i++) if (vs[i].precio !== vs[i - 1].precio || vs[i].costo !== vs[i - 1].costo) ult = vs[i].desde; return `(${p.id}, ${lit(p.sku)}, ${lit(p.nombre)}, ${lit(v.categoria)}, ${v.precio}, ${v.costo}, 'S', ${lit(AS.fmtLocal(Math.max(ult, W.T0)))})`; });
    sql += `INSERT INTO productos VALUES ${filas.join(',')};`;
    await db.exec(sql); return db;
  }
  function tablaPsql(r) { const c = r.fields || []; const f = (r.rows || []).map((x) => c.map((k, i) => (x[i] == null ? '' : String(x[i])))); const w = c.map((k, i) => Math.max(k.name.length, ...f.map((x) => x[i].length))); return [' ' + c.map((k, i) => k.name.padEnd(w[i])).join(' | '), c.map((_, i) => '-'.repeat(w[i] + 2)).join('+'), ...f.map((x) => ' ' + x.map((v, i) => v.padEnd(w[i])).join(' | ')), `(${f.length} ${f.length === 1 ? 'row' : 'rows'})`].join('\n'); }
  async function psqlErp(a, ctx) {
    const C = AS.claves().erp; const { flags } = Sh.parseArgs(a.filter((x) => !/^postgres/.test(x)), { bool: ['-A', '-t'] });
    let usuario = flags['-U'], clave = (Sh.Machine.env || {}).PGPASSWORD, base = flags['-d'];
    for (const x of a) { const m = /^postgres(?:ql)?:\/\/(?:([^:@/]+)(?::([^@/]*))?@)?([^:/?]+)(?::(\d+))?(?:\/([^?]+))?/.exec(x); if (m) { usuario = m[1]; if (m[2] != null) clave = decodeURIComponent(m[2]); base = m[5]; } }
    const pre = `psql: error: connection to server at "${C.host}" (192.168.10.4), port 5432 failed: `;
    if (clave == null) return Sh.fail(pre + 'fe_sendauth: no password supplied', 2);
    if (usuario !== C.usuario || clave !== C.clave) return Sh.fail(pre + `FATAL:  password authentication failed for user "${usuario}"`, 2);
    if (base !== C.base) return Sh.fail(pre + `FATAL:  database "${base}" does not exist`, 2);
    let db; try { db = await erpDb(); } catch (e) { return Sh.fail(pre + 'could not load the server (sin conexión a cdn.jsdelivr.net)', 2); }
    const correr = async (sql) => {
      if (/^\s*(insert|update|delete|create|drop|alter|truncate)\b/i.test(sql)) return { err: 'ERROR:  permission denied (el usuario consulta_bi es de solo lectura)', code: 1 };
      const m = /^\\copy\s+\(([\s\S]+)\)\s+to\s+'([^']+)'\s*([\s\S]*)$/i.exec(sql.trim());
      if (/productos/i.test(sql)) { const D = Host.datos(); D.fotos.push(ahora()); if (D.fotos.length > 400) D.fotos.shift(); Host.guardar(); }
      if (m) { let r; try { r = await db.query(m[1], [], { rowMode: 'array' }); } catch (e) { return { err: 'ERROR:  ' + e.message, code: 1 }; } const header = /header/i.test(m[3]); const q = (v) => (v == null ? '' : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v)); const txt = (header ? r.fields.map((x) => x.name).join(',') + '\n' : '') + r.rows.map((x) => x.map(q).join(',')).join('\n') + '\n'; Sh.writeFile(Sh.norm(m[2]), txt); try { Sh.Machine.save(); } catch (e) { /* lleno */ } return { out: `COPY ${r.rows.length}` }; }
      if (sql.trim() === '\\dt') sql = "SELECT tablename AS \"Name\" FROM pg_tables WHERE schemaname = 'public' ORDER BY 1";
      let rs; try { rs = await db.exec(sql, { rowMode: 'array' }); } catch (e) { return { err: 'ERROR:  ' + e.message, code: 1 }; }
      return { out: rs.filter((r) => r.fields && r.fields.length).map(tablaPsql).join('\n\n') };
    };
    if (flags['-c'] && flags['-c'] !== true) { const r = await correr(String(flags['-c'])); return { out: r.out || '', err: r.err || null, code: r.code || 0 }; }
    if (ctx && ctx.opts && ctx.opts.noInteractivo) return Sh.fail('psql: usa -c "SQL"', 1);
    return { out: 'psql (16.4, server 9.6.24)\nType "help" for help.', code: 0, repl: { prompt: 'erp=> ', cont: 'erp-> ', fin: /;\s*$/, esMeta: (l) => l.trim().startsWith('\\'), meta: async (l) => (l.trim() === '\\q' ? { out: '', exitMode: true } : correr(l.trim()).then((r) => ({ out: r.out || r.err || '', code: r.code || 0 }))), ejecutar: async (s) => { const r = await correr(s); return { out: r.out || r.err || '', code: r.code || 0 }; } } };
  }
  if (Sh && Sh.def) {
    const psqlAnterior = Sh.Commands.psql;
    Sh.def('psql', null, async (a, ctx) => (a.some((x) => /erp-sol\.almacenes/.test(String(x))) ? (Host.sincronizar(), psqlErp(a, ctx)) : psqlAnterior(a, ctx)));
    Sh.def('sol', 'Almacenes del Sol (proyecto 6): sol accesos · sol metas descargar [-o archivo]', (a) => {
      Host.sincronizar(); const C = AS.claves();
      if (a[0] === 'accesos') return Sh.ok(`ERP (PostgreSQL 9.6, en la oficina central)\n  host: ${C.erp.host}   base: ${C.erp.base}   usuario: ${C.erp.usuario}   clave: ${C.erp.clave}\n\nAPI de las cajas (POS): https://api.possol.example/v1   cabecera X-Api-Key: ${C.pos}\n  GET /v1/sucursales · GET /v1/tickets?sucursal=S01&fecha=AAAA-MM-DD&pagina=1\n\nPlanilla de metas: la comparte Planeamiento → sol metas descargar`);
      if (a[0] === 'metas' && a[1] === 'descargar') { const i = a.indexOf('-o'); const ruta = Sh.norm(i >= 0 ? a[i + 1] : '~/almacenes/metas_semanales.csv'); Sh.writeFile(ruta, AS.planilla()); try { Sh.Machine.save(); } catch (e) { /* lleno */ } return Sh.ok(`Descargado: ${Sh.display(ruta)} (versión de hoy de la planilla de Planeamiento)`); }
      return Sh.ok('sol accesos | sol metas descargar [-o archivo]');
    });
  }

  // ================================================================== la verdad
  const W = () => AS.mundo();
  const porSku = () => new Map(W().productos.map((p) => [p.sku, p]));
  function ventasDia(suc, f) {
    const P = porSku(); const T = AS.tickets(suc, f).filter((x) => !x.anulado); let ventas = 0, costo = 0;
    for (const x of T) for (const l of x.lineas) { ventas += l.cantidad * l.precio_unitario - l.descuento; costo += l.cantidad * AS.versionEn(P.get(l.sku), x.ts).costo; }
    return { tickets: T.length, ventas, margen: ventas - costo, qr: T.filter((x) => x.medio_pago === 'qr').length };
  }
  const primeraFoto = () => { const D = Host.datos() || {}; return (D.fotos || []).length ? Math.min(...D.fotos) : null; };
  const diasDesde = () => { const f0 = primeraFoto(); const out = []; if (!f0) return out; for (let f = AS.diaLocal(f0); f < hoy(); f = AS.sumarDias(f, 1)) out.push(f); return out.slice(-7); };

  // ================================================================== revisión
  const cargar = async (gr, listo) => { try { if (!listo() && window.__cargarGrupo) await window.__cargarGrupo(gr); } catch (e) { /* sin red */ } return listo(); };
  async function tabla(nombre) { try { if (!(await cargar('databricks', () => window.DBSQL))) throw new Error('No se pudo cargar Databricks'); await window.DBSQL.init({ Store: almacen() }); const r = await window.DBSQL.ejecutar(`SELECT * FROM ${nombre}`, { limite: 1e7 }); const u = Array.isArray(r) ? r[r.length - 1] : r; if (!u || u.error) throw new Error(u && u.error ? String(u.error.message || u.error) : 'sin resultado'); return { cols: (u.cols || []).map((c) => String(c).toLowerCase()), filas: u.filas || [] }; } catch (e) { return { error: e.message.split('\n')[0] }; } }
  const colDe = (T, ...n) => { for (const x of n) { const i = T.cols.indexOf(x); if (i >= 0) return i; } return -1; };
  const casi = (a, b, tol = 0.6) => Math.abs(Number(a) - Number(b)) <= tol;
  async function chequeoKV() { const kv = (window.CloudSim && window.CloudSim.az && window.CloudSim.az().kv) || {}; const C = AS.claves(); const vals = Object.values(kv).flatMap((V) => Object.values(V.secrets || {}).map((x) => (typeof x === 'string' ? x : x && x.value))); return (vals.includes(C.erp.clave) && vals.includes(C.pos)) || 'Guarda la clave del ERP y la API key de las cajas en un Key Vault.'; }
  async function chequeoDim() {
    const T = await tabla('sol.silver.dim_producto'); if (T.error) return `No se pudo leer sol.silver.dim_producto: ${T.error}`;
    const ix = { sku: colDe(T, 'sku'), cat: colDe(T, 'categoria'), p: colDe(T, 'precio'), c: colDe(T, 'costo'), d: colDe(T, 'valido_desde'), h: colDe(T, 'valido_hasta'), v: colDe(T, 'vigente') };
    const falta = Object.entries(ix).filter(([, i]) => i < 0).map(([k]) => ({ sku: 'sku', cat: 'categoria', p: 'precio', c: 'costo', d: 'valido_desde', h: 'valido_hasta', v: 'vigente' }[k])); if (falta.length) return `Faltan columnas: ${falta.join(', ')}.`;
    const D = Host.datos(); const fotos = (D.fotos || []).slice().sort((a, b) => a - b); if (!fotos.length) return 'Todavía no sacaste ninguna foto del ERP (psql … SELECT … FROM productos).';
    const porS = new Map(); for (const f of T.filas) { const k = String(f[ix.sku]); if (!porS.has(k)) porS.set(k, []); porS.get(k).push(f); }
    const m = { vigentes: [], faltan: [], valor: [] }; const t = ahora();
    for (const p of W().productos) {
      const fs = porS.get(p.sku) || []; const vig = fs.filter((f) => f[ix.v] === true || f[ix.v] === 1 || String(f[ix.v]).toLowerCase() === 'true');
      if (vig.length !== 1) { m.vigentes.push(p.sku); continue; }
      const real = AS.versionEn(p, t); const v = vig[0]; if (String(v[ix.cat]) !== real.categoria || !casi(v[ix.p], real.precio, 0.01) || !casi(v[ix.c], real.costo, 0.01)) { m.valor.push(p.sku); continue; }
      // cada cambio ocurrido después de tu primera foto y "visto" por alguna foto tiene que ser una versión que empiece ese día
      for (let i = 1; i < p.versiones.length; i++) { const x = p.versiones[i]; if (x.desde < fotos[0] || x.desde > t) continue; const sig = p.versiones[i + 1] ? p.versiones[i + 1].desde : Infinity; const vio = fotos.find((ft) => ft >= x.desde && ft < sig); if (vio == null) continue; const dia = AS.diaLocal(x.desde), hasta = AS.diaLocal(vio); const tiene = fs.some((f) => { const d = String(f[ix.d]).slice(0, 10); return d >= dia && d <= hasta; }); if (!tiene) m.faltan.push(`${p.sku} ${dia}`); }
    }
    const r = [];
    if (m.vigentes.length) r.push(`${m.vigentes.length} productos sin exactamente una versión vigente (${lista(m.vigentes, 3)})`);
    if (m.valor.length) r.push(`${m.valor.length} productos con la versión vigente distinta al ERP de hoy (${lista(m.valor, 3)})`);
    if (m.faltan.length) r.push(`faltan ${m.faltan.length} versiones de cambios que tus fotos vieron (${lista(m.faltan, 3)}) — valido_desde = el día del cambio${m.faltan.some((x) => x.endsWith(AS.diaLocal(AS.hitos().categorias))) ? '; la reorganización de categorías no tocó ult_modif: una carga incremental por ult_modif no la ve' : ''}`);
    return !r.length || r.join(' · ');
  }
  async function chequeoVentas() {
    const T = await tabla('sol.gold.ventas_diarias'); if (T.error) return `No se pudo leer sol.gold.ventas_diarias: ${T.error}`;
    const ix = { f: colDe(T, 'fecha'), s: colDe(T, 'sucursal'), t: colDe(T, 'tickets'), v: colDe(T, 'ventas_netas'), m: colDe(T, 'margen_bruto') }; if (Object.values(ix).some((i) => i < 0)) return 'La tabla necesita fecha, sucursal, tickets, ventas_netas y margen_bruto.';
    const tuyo = new Map(T.filas.map((f) => [`${String(f[ix.f]).slice(0, 10)}|${f[ix.s]}`, f])); const dias = diasDesde(); if (!dias.length) return 'Primero saca una foto del ERP (sin el costo de cada día no se puede calcular el margen).';
    const m = { falta: [], tk: [], v: [], mg: [] }; let s05 = 0;
    for (const f of dias) for (const [suc] of AS.SUCURSALES) { if (!AS.disponible(suc, f, ahora())) continue; const x = ventasDia(suc, f); const r = tuyo.get(`${f}|${suc}`); if (!r) { m.falta.push(`${f} ${suc}`); continue; } const caida = suc === AS.SUC_CAIDA && f === AS.diaLocal(AS.hitos().caida + HORA); if (Number(r[ix.t]) !== x.tickets) { m.tk.push(`${f} ${suc}`); if (caida) s05++; } else if (!casi(r[ix.v], x.ventas, 1)) { m.v.push(`${f} ${suc}`); if (caida) s05++; } else if (!casi(r[ix.m], x.margen, 1)) m.mg.push(`${f} ${suc}`); }
    const r = [];
    if (m.falta.length) r.push(`faltan ${m.falta.length} sucursal-días (${lista(m.falta, 3)})`);
    if (m.tk.length) r.push(`${m.tk.length} con otra cantidad de tickets (${lista(m.tk, 3)}) — sin los anulados y sin repetidos`);
    if (m.v.length) r.push(`${m.v.length} con otras ventas netas (${lista(m.v, 3)}) — cantidad × precio − descuento, sin anulados`);
    if (s05) r.push('Villa Sol reenvió tickets repetidos al reconectarse: deduplica por ticket_id antes de sumar');
    if (m.mg.length) r.push(`${m.mg.length} con otro margen — el costo es el vigente el día de la venta (tu dimensión SCD2), no el de hoy`);
    return !r.length || r.join(' · ');
  }
  async function chequeoMetas() {
    const T = await tabla('sol.gold.cumplimiento_semanal'); if (T.error) return `No se pudo leer sol.gold.cumplimiento_semanal: ${T.error}`;
    const ix = { w: colDe(T, 'semana_desde'), s: colDe(T, 'sucursal'), v: colDe(T, 'ventas'), m: colDe(T, 'meta'), c: colDe(T, 'cumplimiento_pct') }; if (Object.values(ix).some((i) => i < 0)) return 'La tabla necesita semana_desde, sucursal, ventas, meta y cumplimiento_pct.';
    const w = AS.sumarDias(AS.lunesDe(hoy()), -7); const mal = [];
    for (const [suc] of AS.SUCURSALES) { const f = T.filas.find((x) => String(x[ix.w]).slice(0, 10) === w && String(x[ix.s]) === suc); if (!f) { mal.push(`${suc}: falta`); continue; } let v = 0; for (let k = 0; k < 7; k++) v += ventasDia(suc, AS.sumarDias(w, k)).ventas; const meta = AS.metaSemana(suc, w); if (!casi(f[ix.m], meta, 1)) mal.push(`${suc}: meta ${f[ix.m]} (la planilla dice ${meta})`); else if (!casi(f[ix.v], v, 1)) mal.push(`${suc}: ventas ${f[ix.v]} (esperado ${Math.round(v)})`); else if (!casi(f[ix.c], Math.round(v / meta * 1000) / 10, 0.15)) mal.push(`${suc}: cumplimiento ${f[ix.c]}`); }
    return !mal.length || `Semana del ${w}: ${lista(mal, 4)}`;
  }
  const CHEQUEOS = [['Seguridad', 'Credenciales del ERP y de las cajas en un Key Vault', chequeoKV], ['SCD2', 'sol.silver.dim_producto: la historia de precios, costos y categorías', chequeoDim], ['Ventas', 'sol.gold.ventas_diarias: tickets, ventas y margen por sucursal y día', chequeoVentas]];

  // ================================================================== tablero
  const ayer = (T) => AS.sumarDias(AS.diaLocal(T), -1);
  const total = (f) => AS.SUCURSALES.reduce((a, [s]) => { const x = ventasDia(s, f); return { tk: a.tk + x.tickets, v: a.v + x.ventas }; }, { tk: 0, v: 0 });
  const TICKETS = [
    { id: 'AS-101', tipo: 'requerimiento', de: 'Comercial', cuando: (I) => I, titulo: 'La historia de los precios', texto: 'Cada vez que discutimos un margen, alguien pregunta "¿cuánto valía este producto la semana pasada?" y nadie sabe: el ERP solo muestra el precio de hoy. Necesitamos la historia de precios, costos y categorías.', criterios: ['sol.silver.dim_producto como SCD tipo 2: sku, nombre, categoria, precio, costo, valido_desde, valido_hasta, vigente'], comentarios: ['Sistemas: el proceso de precios corre a las 03:00 y pisa los valores. No hay tabla de historial.'], check: chequeoDim },
    { id: 'AS-102', tipo: 'requerimiento', de: 'Dirección', cuando: (I) => I, titulo: 'Ventas y margen por sucursal', texto: 'Por día y sucursal: tickets, ventas netas y margen bruto.', criterios: ['sol.gold.ventas_diarias: fecha, sucursal, tickets, ventas_netas, margen_bruto (sin anulados ni repetidos; costo vigente el día de la venta)'], check: chequeoVentas },
    { id: 'AS-103', tipo: 'requerimiento', de: 'Seguridad', cuando: (I) => I, titulo: 'Credenciales en el Key Vault', texto: 'La clave del ERP y la API key de las cajas, al Key Vault.', criterios: ['Ambas en un Key Vault'], check: chequeoKV },
    { id: 'AS-104', tipo: 'pregunta', de: 'Dirección', cuando: (I) => I + 10 * HORA, titulo: '¿Cuál fue el ticket promedio ayer?', texto: (T) => `Ticket promedio de toda la cadena el ${ayer(T)}: ventas netas / tickets. En pesos, con dos decimales.`, comentarios: ['Dirección: sin los tickets anulados.'], respuesta: { tipo: 'numero', unidad: '$', verificar: (v, T) => { const x = total(ayer(T)); const r = Math.round(x.v / x.tk * 100) / 100; return Math.abs(v - r) <= 0.5 || 'No coincide. Ventas netas (cantidad × precio − descuento) / tickets, sin anulados, todas las sucursales.'; } } },
    { id: 'AS-105', tipo: 'pregunta', de: 'Finanzas', cuando: (I) => I + DIA + 9 * HORA, titulo: '¿Dónde se paga más con QR?', texto: (T) => `Vamos a renegociar la comisión del QR. ¿Qué sucursal tuvo el mayor porcentaje de tickets pagados con QR el ${ayer(T)}?`, respuesta: { tipo: 'texto', ayuda: 'El código (S01…) o el nombre', verificar: (v, T) => { const f = ayer(T); const p = AS.SUCURSALES.map(([s, n]) => { const x = ventasDia(s, f); return [s, n, x.qr / (x.tickets || 1)]; }); const max = Math.max(...p.map((x) => x[2])); return p.filter((x) => x[2] === max).some(([s, n]) => norm(v) === norm(s) || norm(v).includes(norm(n))) || 'No es la de mayor porcentaje (tickets con medio_pago = qr / tickets, sin anulados).'; } } },
    { id: 'AS-106', tipo: 'incidente', de: 'Comercial', cuando: (I, H) => H.categorias + 6 * HORA, titulo: 'La categoría Almacén quedó vacía', texto: 'Desde hoy el tablero muestra Almacén en cero y aparecen dos categorías nuevas que nadie conoce.', comentarios: ['Compras: anoche dividimos Almacén en Almacén seco (ALS) y Frescos (FRE). Era un pedido de hace meses.', 'Sistemas: lo cargamos directo en la base, no por el proceso de precios.'], criterios: ['sol.silver.dim_producto con la nueva categoría como una versión nueva (valido_desde = el día de la reorganización)', 'Postmortem: por qué una carga incremental por ult_modif no lo vio'], check: async () => { const r = await chequeoDim(); return r === true || !/categor|reorganiz/.test(r) || r; } },
    { id: 'AS-107', tipo: 'incidente', de: 'Operaciones', cuando: (I, H) => H.caida + DIA + 10 * HORA, titulo: 'Villa Sol no mandó las ventas de ayer', texto: 'La sucursal de Villa Sol (S05) aparece sin ventas ayer. El encargado dice que vendieron normal.', comentarios: ['Soporte: se les cayó internet todo el día; la caja guardó los tickets y los va a mandar cuando vuelva la conexión. Puede tardar un día más.'], criterios: ['Cuando lleguen, ventas_diarias de S05 de ese día correcta (sin repetidos)', 'Que el tablero no muestre "0" sino "sin datos" mientras no llegan'], check: async () => { const f = AS.diaLocal(AS.hitos().caida + HORA); if (!AS.disponible(AS.SUC_CAIDA, f, ahora())) return 'Los tickets de Villa Sol todavía no llegaron: vuelve a revisar más tarde (y documenta qué muestra tu tablero mientras tanto).'; const T = await tabla('sol.gold.ventas_diarias'); if (T.error) return T.error; const ix = { f: colDe(T, 'fecha'), s: colDe(T, 'sucursal'), t: colDe(T, 'tickets') }; const r = T.filas.find((x) => String(x[ix.f]).slice(0, 10) === f && String(x[ix.s]) === AS.SUC_CAIDA); const x = ventasDia(AS.SUC_CAIDA, f); return (r && Number(r[ix.t]) === x.tickets) || (r ? `Villa Sol el ${f}: ${r[ix.t]} tickets y son ${x.tickets} (¿repetidos del reenvío?).` : `Falta Villa Sol del ${f}.`); } },
    { id: 'AS-108', tipo: 'incidente', de: 'Planeamiento', cuando: (I, H) => H.planilla + HORA, titulo: 'Reorganizamos la planilla de metas', texto: 'Le dimos otra forma a la planilla para que sea más fácil de mantener. Los números son los mismos. Ah, y Centro cambió de nombre porque se mudó al local nuevo.', criterios: ['sol.gold.cumplimiento_semanal de la última semana cerrada correcta con la planilla nueva'], check: chequeoMetas },
    { id: 'AS-109', tipo: 'pregunta', de: 'Comercial', cuando: (I) => I + 2 * DIA + 10 * HORA, titulo: '¿Qué margen deja Bebidas?', texto: (T) => `Margen bruto de la categoría Bebidas (BEB) el ${ayer(T)}, en % de las ventas netas. Con un decimal.`, comentarios: ['Comercial: con el costo de ese día, no el de hoy.'], respuesta: { tipo: 'numero', unidad: '%', verificar: (v, T) => { const f = ayer(T); const P = porSku(); let vt = 0, ct = 0; for (const [s] of AS.SUCURSALES) for (const x of AS.tickets(s, f)) { if (x.anulado) continue; for (const l of x.lineas) { const p = P.get(l.sku); const ver = AS.versionEn(p, x.ts); if (ver.categoria !== 'BEB') continue; vt += l.cantidad * l.precio_unitario - l.descuento; ct += l.cantidad * ver.costo; } } const r = Math.round((vt - ct) / vt * 1000) / 10; return Math.abs(v - r) <= 0.2 || 'No coincide. (ventas netas − cantidad × costo vigente ese día) / ventas netas, solo productos de BEB.'; } } },
    { id: 'AS-110', tipo: 'pregunta', de: 'Dirección', cuando: (I, H) => H.planilla + 3 * HORA, titulo: '¿Quién quedó más lejos de la meta?', texto: () => `¿Qué sucursal tuvo el menor cumplimiento de su meta la semana del ${AS.sumarDias(AS.lunesDe(hoy()), -7)}?`, respuesta: { tipo: 'texto', ayuda: 'El código o el nombre', verificar: (v) => { const w = AS.sumarDias(AS.lunesDe(hoy()), -7); const c = AS.SUCURSALES.map(([s, n]) => { let x = 0; for (let k = 0; k < 7; k++) x += ventasDia(s, AS.sumarDias(w, k)).ventas; return [s, n, x / AS.metaSemana(s, w)]; }); const min = Math.min(...c.map((x) => x[2])); return c.filter((x) => x[2] === min).some(([s, n]) => norm(v) === norm(s) || norm(v).includes(norm(n))) || 'No es la de menor cumplimiento (ventas netas de la semana lunes a domingo / meta de la planilla).'; } } },
    { id: 'AS-111', tipo: 'requerimiento', de: 'Plataforma', cuando: (I) => I + DIA + 15 * HORA, titulo: 'La foto del ERP no puede depender de una persona', texto: 'Si un día nadie saca la foto del ERP, perdemos la historia para siempre. Automaticen: un DAG diario que la saque y actualice todo.', criterios: ['Un DAG con "sol" en el dag_id, diario, que dispare Databricks', 'Una corrida exitosa (o airflow dags test en verde)'], check: async () => { if (!(await cargar('airflow', () => window.AirflowMotor))) return 'No se pudo cargar Airflow.'; const AM = window.AirflowMotor; try { await AM.parsear(); } catch (e) { /* nada */ } const d = (AM.bolsa().dags || []).find((x) => /sol/i.test(x.id)); if (!d) return 'No hay ningún DAG con "sol" en el dag_id.'; if (!/@daily|^\d{1,2} \d{1,2} \* \* \*$/.test(String((d.sched || {}).txt || '').trim())) return `El DAG ${d.id} no es diario.`; if (!JSON.stringify(d.tasks || []).includes('Databricks')) return `El DAG ${d.id} no dispara Databricks.`; return (AM.runs(d.id) || []).some((r) => r.state === 'success') || !!(AM.st().pruebasOk || {})[d.id] || `El DAG ${d.id} no tiene una corrida exitosa.`; } },
    { id: 'AS-112', tipo: 'requerimiento', de: 'Dirección', cuando: (I) => I + 2 * DIA + 9 * HORA, titulo: 'El cumplimiento de metas en Power BI', texto: 'Por semana y sucursal: ventas, meta y % de cumplimiento, en Power BI.', criterios: ['sol.gold.cumplimiento_semanal (semana_desde, sucursal, ventas, meta, cumplimiento_pct)', 'Informe de Power BI desde Databricks'], check: async () => { const r = await chequeoMetas(); if (r !== true) return r; const c = (almacen() && almacen().data.cruces) || {}; return c.pbiDatabricks ? true : 'Falta el informe de Power BI (Obtener datos → Azure Databricks).'; } },
  ];
  // la misma cola de tickets se ve en el tablero de la lección y en Jira (proyecto AS), que es donde trabaja el equipo
  const cfgTablero = () => ({ titulo: 'Tablero del equipo de datos de Almacenes del Sol', tickets: TICKETS, contexto: () => { Host.sincronizar(); return { I: AS.inicioDiaLocal(AS.cfg.inicio), H: AS.hitos(), t: ahora() }; }, datos: () => Host.datos(), guardar: () => Host.guardar(), hora: (T) => new Date(T - 3 * HORA).toISOString().replace('T', ' ').slice(0, 16) });
  (window.__tableros = window.__tableros || []).push({ clave: 'AS', nombre: 'Almacenes del Sol', modulo: 'proyecto-almacenes-sol', cfg: cfgTablero, chequeos: () => (typeof CHEQUEOS !== 'undefined' ? CHEQUEOS : []) });
  function panelTablero(el) { if (!window.TableroTickets) { setTimeout(() => panelTablero(el), 300); return; } window.TableroTickets.panel(el, cfgTablero()); }
  function panelRevisar(el) {
    el.innerHTML = `<div class="card mv-panel"><h3 style="margin-top:0;font-size:1.05em">🔎 Revisar mi entrega</h3><p class="small muted">Compara tus tablas con el ERP, las cajas y la planilla.</p><button class="btn btn-primary btn-sm" data-revisar>Revisar ahora</button><ol class="pedalia-chequeos"></ol></div>`;
    const ol = el.querySelector('ol');
    el.querySelector('[data-revisar]').addEventListener('click', async (ev) => { const b = ev.currentTarget; b.disabled = true; if (window.__discoListo) await window.__discoListo(); b.textContent = 'Revisando…'; ol.innerHTML = ''; Host.sincronizar(); let bien = 0; for (const [gr, txt, f] of CHEQUEOS) { const li = document.createElement('li'); ol.append(li); let r; try { r = await f(); } catch (e) { r = String(e.message || e); } if (r === true) bien++; li.className = r === true ? 'ok' : 'falta'; li.innerHTML = `${r === true ? '✅' : '⬜'} <b>${esc(gr)}</b> · ${esc(txt)}${r === true ? '' : `<div class="small muted">${esc(r)}</div>`}`; } b.disabled = false; b.textContent = `Revisar de nuevo (${bien} de ${CHEQUEOS.length})`; });
  }
  function montar(root) { (root || document).querySelectorAll('[data-sol]').forEach((el) => { if (el.dataset.montado) return; el.dataset.montado = '1'; if (el.dataset.sol === 'revisar') panelRevisar(el); else if (el.dataset.sol === 'tablero') panelTablero(el); }); }
  window.AlmacenesSolProyecto = { montar, CHEQUEOS, TICKETS, verdad: { ventasDia, total } };
})();
