/* Power BI Desktop (práctica) — #/powerbi
 *
 * Funciona con cualquier dataset y reproduce el flujo real, según la documentación de Microsoft Learn:
 *  Obtener datos → Power Query (pasos aplicados con su M) → Modelo (relaciones con cardinalidad, dirección
 *  y activa/inactiva) → DAX (medidas, columnas y tablas calculadas, con contexto de filtro) → Informe
 *  (objetos visuales, filtros de objeto/página/todas las páginas, segmentaciones, filtrado cruzado, formato)
 *  → Vista de consultas DAX (EVALUATE) y Vista TMDL → Publicar.
 * Módulos: powerbi-dax.js (motor DAX), powerbi-datos.js (archivos y Power Query), powerbi-visuales.js
 * (objetos visuales y formato), powerbi-iconos.js (íconos Fluent UI).
 */
(function () {
  'use strict';
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const q = (n) => '"' + String(n).replace(/"/g, '""') + '"';
  const fl = (n, c) => window.PBIIconos(n, c);
  const V = () => window.PBIVis, D = () => window.PBIDatos;
  const PALETAS = {
    predeterminado: { n: 'Predeterminado', c: ['#118DFF', '#12239E', '#E66C37', '#6B007B', '#E044A7', '#744EC2', '#D9B300', '#D64550', '#197278', '#1AAB40'] },
    clasico: { n: 'Clásico', c: ['#01B8AA', '#374649', '#FD625E', '#F2C80F', '#5F6B6D', '#8AD4EB', '#FE9666', '#A66999', '#3599B8', '#DFBFBF'] },
    accesible: { n: 'Accesible (daltonismo)', c: ['#0072B2', '#E69F00', '#009E73', '#CC79A7', '#56B4E9', '#D55E00', '#F0E442', '#000000'] },
    ejecutivo: { n: 'Ejecutivo', c: ['#3257A8', '#37A794', '#8B3D88', '#DD6B7F', '#6B91C9', '#F5C869', '#77C4A8', '#DEA6CF'] },
    atardecer: { n: 'Atardecer', c: ['#FE9666', '#A66999', '#F2C80F', '#FD625E', '#8E3B5B', '#FFB672', '#D35D6E', '#5A4A6F'] },
    bosque: { n: 'Bosque', c: ['#2E7D32', '#81C784', '#827717', '#C0CA33', '#1B5E20', '#A5D6A7', '#558B2F', '#DCE775'] },
  };
  const TIPO_N = { num: 'Número decimal', int: 'Número entero', texto: 'Texto', fecha: 'Fecha', bool: 'Verdadero/falso' };
  const AGG = { sum: 'Suma', avg: 'Promedio', min: 'Mínimo', max: 'Máximo', count: 'Recuento', distinct: 'Recuento (distintos)', median: 'Mediana', none: 'No resumir' };
  const PARTES = { anio: 'Año', trim: 'Trimestre', mes: 'Mes' };

  // ---------------------------------------------------------------- estado
  const NUEVO = () => ({ version: 2, vista: 'informe', cinta: 'inicio', pagina: 0, paginas: [{ nombre: 'Página 1', visuales: [], filtros: [] }], filtrosTodas: [], medidas: [], tablas: {}, rels: [], sel: null, cruz: null, publicado: false, reto: true, tablaDatos: null, nombreArchivo: 'Sin título', tema: 'predeterminado', panelVis: 'crear', paneles: { filtros: true, vis: true, datos: true }, daxTabs: [{ nombre: 'Consulta 1', texto: '// Escribe una consulta DAX y pulsa Ejecutar (Ctrl+Enter)\nEVALUATE\n' }], daxTab: 0, tmdlTabs: [{ nombre: 'Script 1', texto: '' }], tmdlTab: 0, roles: [], verComo: null });
  function migrar(s) {
    const n = NUEVO();
    for (const k of Object.keys(n)) if (s[k] === undefined) s[k] = n[k];
    s.paginas.forEach((p) => {
      p.filtros = (p.filtros || []).map((f) => ({ tipo: 'basico', ...f }));
      p.visuales.forEach((v) => {
        v.tipo = V().ALIAS[v.tipo] || v.tipo;
        const o = v.formato || {};
        if (typeof o.titulo === 'string' || 'etiquetas' in o || typeof o.color === 'string') v.formato = { titulo: { texto: o.titulo === '-' ? '' : o.titulo || '', mostrar: o.titulo !== '-' }, etiquetas: { mostrar: !!o.etiquetas }, colores: { color: o.color && o.color !== '#118DFF' ? o.color : '' } };
        v.formato = v.formato || {}; v.filtros = v.filtros || [];
      });
    });
    s.rels.forEach((r) => { if (r.activa === undefined) r.activa = true; r.direccion = r.direccion || 'unica'; });
    Object.values(s.tablas).forEach((t) => { t.calc = t.calc || []; t.resumen = t.resumen || {}; });
    s.version = 2; return s;
  }
  const CLAVE_DATOS = 'academia-pbi-datos';
  let S, Store, toast, SQLc, main, ctxApp, DATOS = {}, db = null, dbVersion = -1, version = 0, motor = null, errores = {}, tiempos = {};
  function cargarDatos() { try { DATOS = JSON.parse(localStorage.getItem(CLAVE_DATOS) || '{}'); } catch (e) { DATOS = {}; } }
  function guardarDatos() { try { localStorage.setItem(CLAVE_DATOS, JSON.stringify(DATOS)); return true; } catch (e) { toast('Los datos son grandes para guardarlos en el navegador: los puedes usar en esta sesión, pero no quedan guardados. Usa Archivo → Guardar como.', 6000); return false; } }
  // deshacer / rehacer (Ctrl+Z / Ctrl+Y)
  const hist = { pila: [], i: -1, t: null };
  const foto = () => JSON.stringify(S, (k, v) => (k.startsWith('_') ? undefined : v));
  let lectura = null; // modo lectura: el informe publicado en el servicio de Power BI (no se guarda)
  function guardar(sinHistorial) {
    if (lectura) return;
    Store.data.powerbi = S; Store.saveSoon();
    if (sinHistorial) return;
    clearTimeout(hist.t);
    hist.t = setTimeout(() => { const f = foto(); if (hist.pila[hist.i] === f) return; hist.pila = hist.pila.slice(0, hist.i + 1); hist.pila.push(f); if (hist.pila.length > 60) hist.pila.shift(); hist.i = hist.pila.length - 1; }, 120);
  }
  function deshacer(dir) {
    clearTimeout(hist.t);
    const j = hist.i + dir; if (j < 0 || j >= hist.pila.length) { toast(dir < 0 ? 'No hay nada para deshacer' : 'No hay nada para rehacer'); return; }
    hist.i = j; S = migrar(JSON.parse(hist.pila[j])); Store.data.powerbi = S; Store.saveSoon(); cambioModelo(); pintar();
  }
  let pagForzada = null;
  const pag = () => pagForzada || S.paginas[S.pagina];
  const vis = (id) => pag().visuales.find((v) => v.id === id);
  const todos = () => S.paginas.flatMap((p) => p.visuales);
  const cambioModelo = () => { version++; };
  const tablas = () => Object.keys(S.tablas);
  const paleta = () => (S.temaCustom && S.tema === 'custom' ? S.temaCustom.dataColors : (PALETAS[S.tema] || PALETAS.predeterminado).c);

  // ---------------------------------------------------------------- base SQLite del informe
  function crudo(nombre) {
    const t = S.tablas[nombre]; if (!t) return { cols: [], rows: [] };
    if (t.fuente.tipo === 'calcgroup') return { cols: [t.fuente.columna, 'Ordinal'], rows: t.fuente.items.map((it, i) => [it.nombre, i]), yaTipado: true };
    if (t.fuente.tipo === 'curso') { const T = SQLc.tables[t.fuente.ref]; return T ? { cols: T.columns.slice(), rows: T.rows, yaTipado: true } : { cols: [], rows: [] }; }
    const d = DATOS[t.fuente.clave]; if (!d) return { cols: [], rows: [] };
    return { cols: d.filas[0] ? d.filas[0].map((x, i) => `Column${i + 1}`) : [], rows: d.filas };
  }
  const meta = (t) => (S.tablas[t] && S.tablas[t]._cols) || [];
  const tipoDe = (t, c) => (meta(t).find((x) => x.n === c) || {}).t;
  const esNum = (t, c) => { const r = ((S.tablas[t] || {}).resumen || {})[c]; if (r) return r !== 'none'; return ['num', 'int'].includes(tipoDe(t, c)) && !/(^id$|_id$|^id_|key$|^año$|^anio$|^year$)/i.test(c); };
  const cacheConsultas = {};
  function resolverConsulta(n, pila = []) {
    if (cacheConsultas[n]) return cacheConsultas[n];
    if (pila.includes(n)) throw new Error('Referencia circular entre consultas: ' + [...pila, n].join(' → '));
    const t = S.tablas[n]; if (!t || t.fuente.tipo === 'dax') return null;
    cacheConsultas[n] = D().aplicar(crudo(n), t.pasos, (m) => resolverConsulta(m, [...pila, n]));
    return cacheConsultas[n];
  }
  function crearTablaSql(n, cols, rows) {
    const tipoSql = (x) => ({ num: 'REAL', int: 'INTEGER', bool: 'INTEGER' }[x] || 'TEXT');
    db.run(`CREATE TABLE ${q(n)} (${cols.map((c) => `${q(c.n)} ${tipoSql(c.t)}`).join(', ') || '"_vacia" TEXT'})`);
    if (rows.length && cols.length) { const st = db.prepare(`INSERT INTO ${q(n)} VALUES (${cols.map(() => '?').join(',')})`); db.run('BEGIN'); for (const f of rows) st.run(cols.map((_, i) => (f[i] === undefined ? null : f[i]))); db.run('COMMIT'); st.free(); }
  }
  function construir() {
    if (db && dbVersion === version) return db;
    if (db) db.close();
    db = new SQLc._SQL.Database(); errores = {};
    for (const t of Object.values(S.tablas)) if (t.fuente.tipo === 'dax') t._cols = []; // las tablas calculadas se rearman al final
    for (const k of Object.keys(cacheConsultas)) delete cacheConsultas[k];
    const api = { tablas, meta, rels: () => S.rels, medidas: () => S.medidas, exec: (s) => { const r = db.exec(s); return r.length ? r[r.length - 1].values : []; }, run: (s, p) => db.run(s, p) };
    motor = window.PBIDax.crear(api);
    for (const n of tablas()) {
      const t = S.tablas[n]; if (t.fuente.tipo === 'dax') continue;
      let r; try { r = resolverConsulta(n); } catch (e) { errores[n] = e.message; r = { cols: [], rows: [] }; }
      t._cols = r.cols.map((c) => ({ n: c.n, t: c.t })); t._filas = r.rows.length;
      crearTablaSql(n, t._cols, r.rows);
    }
    for (const n of tablas()) {
      const t = S.tablas[n]; if (t.fuente.tipo !== 'dax') continue;
      try { const r = motor.tablaCalculada(t.fuente.expr); const cols = r.cols.map((c, i) => ({ n: c, t: D().detectarTipo(r.filas.slice(0, 300).map((f) => f[i])) })); t._cols = cols; t._filas = r.filas.length; crearTablaSql(n, cols, r.filas); }
      catch (e) { errores[n] = e.message; t._cols = []; t._filas = 0; crearTablaSql(n, [], []); }
    }
    for (const n of tablas()) {
      const t = S.tablas[n];
      for (const cc of t.calc) {
        try {
          const sql = motor.columnaCalculada(n, cc.expr);
          db.run(`ALTER TABLE ${q(n)} ADD COLUMN ${q(cc.nombre)}`); db.run(`UPDATE ${q(n)} SET ${q(cc.nombre)} = ${sql}`);
          const muestra = api.exec(`SELECT ${q(cc.nombre)} FROM ${q(n)} WHERE ${q(cc.nombre)} IS NOT NULL LIMIT 200`).map((f) => f[0]);
          t._cols.push({ n: cc.nombre, t: D().detectarTipo(muestra), calc: true }); cc.error = null;
        } catch (e) { cc.error = e.message; }
      }
    }
    for (const r of S.rels) { try { db.run(`CREATE INDEX IF NOT EXISTS ${q('ix_' + r.de + '_' + r.cde)} ON ${q(r.de)}(${q(r.cde)})`); db.run(`CREATE INDEX IF NOT EXISTS ${q('ix_' + r.a + '_' + r.ca)} ON ${q(r.a)}(${q(r.ca)})`); } catch (e) { /* columna borrada */ } }
    dbVersion = version;
    return db;
  }
  const ejecutar = (sql) => { const r = construir().exec(sql); return r.length ? r[r.length - 1].values : []; };

  // ---------------------------------------------------------------- importar
  function registrarTabla(nombre, fuente, pasosIniciales) {
    let n = String(nombre).trim() || 'Tabla', k = 2; while (S.tablas[n]) n = `${nombre} (${k++})`;
    S.tablas[n] = { fuente, pasos: pasosIniciales || [], calc: [], resumen: {} };
    if (fuente.tipo !== 'curso' && fuente.tipo !== 'dax') { // tipos detectados al importar, como Power BI
      const r = D().aplicar(crudo(n), S.tablas[n].pasos, (m) => resolverConsulta(m));
      const mapa = {}; r.cols.forEach((c, i) => { mapa[c.n] = D().detectarTipo(r.rows.slice(0, 300).map((x) => x[i])); });
      S.tablas[n].pasos.push({ tipo: 'tipos', mapa });
    }
    cambioModelo(); return n;
  }
  function autodetectar() {
    construir(); const nuevas = [];
    for (const a of tablas()) for (const b of tablas()) {
      if (a === b) continue;
      for (const c of meta(a)) {
        if (!meta(b).some((x) => x.n === c.n) || !/(_id|id|_key|key|codigo|código|sku)$/i.test(c.n)) continue;
        if (S.rels.some((r) => (r.de === a && r.a === b) || (r.de === b && r.a === a))) continue;
        const unicoB = ejecutar(`SELECT COUNT(*) = COUNT(DISTINCT ${q(c.n)}) AND COUNT(*) > 0 FROM ${q(b)}`)[0][0], unicoA = ejecutar(`SELECT COUNT(*) = COUNT(DISTINCT ${q(c.n)}) FROM ${q(a)}`)[0][0];
        if (unicoB && !unicoA) { const activa = !S.rels.some((r) => r.de === a && r.a === b && r.activa); S.rels.push({ de: a, cde: c.n, a: b, ca: c.n, activa, direccion: 'unica' }); nuevas.push(`${a}[${c.n}] * → 1 ${b}[${c.n}]`); }
      }
    }
    if (nuevas.length) cambioModelo();
    return nuevas;
  }


  // ---------------------------------------------------------------- grupos de cálculo
  // Un grupo de cálculo es una tabla con una columna de ítems; cada ítem es una expresión con
  // SELECTEDMEASURE() que reemplaza a la medida del objeto visual (por ejemplo "Año anterior" o "% del total").
  // Si la columna está en el visual, se evalúa la medida una vez por ítem; si una segmentación elige un
  // solo ítem, ese ítem se aplica a todas las medidas. Solo afecta medidas explícitas, como en Power BI.
  const esCG = (t) => !!(S.tablas[t] && S.tablas[t].fuente.tipo === 'calcgroup');
  function conItem(it, cats, valores, filtros, opciones) {
    const tmp = [];
    const vals = valores.map((v, j) => {
      if (!v.medida) return v;
      const m = S.medidas.find((x) => x.nombre === v.medida);
      const nombre = `__cg${j}_${tmp.length}`;
      tmp.push({ nombre, expr: it.expr.replace(/SELECTEDMEASURE\s*\(\s*\)/gi, `[${v.medida}]`).replace(/SELECTEDMEASURENAME\s*\(\s*\)/gi, `"${v.medida}"`), tabla: m ? m.tabla : '' });
      return { medida: nombre };
    });
    S.medidas.push(...tmp);
    try { return motor.consultar(cats, vals, filtros, opciones); } finally { S.medidas.splice(S.medidas.length - tmp.length, tmp.length); }
  }
  function consultar(cats, valores, filtros, opciones) {
    const i = cats.findIndex((c) => esCG(c.t));
    const fcg = filtros.filter((f) => f.campo && esCG(f.campo.t)), resto = filtros.filter((f) => !(f.campo && esCG(f.campo.t)));
    if (i < 0 && !fcg.length) return motor.consultar(cats, valores, filtros, opciones);
    const t = i >= 0 ? cats[i].t : fcg[0].campo.t; const G = S.tablas[t].fuente;
    let items = G.items.slice();
    for (const f of fcg) if (f.valores) items = items.filter((it) => f.valores.includes(it.nombre));
    if (i < 0) return items.length === 1 ? conItem(items[0], cats, valores, resto, opciones) : motor.consultar(cats, valores, resto, opciones);
    if (cats[i].c !== G.columna) return motor.consultar(cats.filter((_, j) => j !== i), valores, resto, opciones);
    const otros = cats.filter((_, j) => j !== i); const filas = []; let sql = '';
    for (const it of items) { const r = conItem(it, otros, valores, resto, opciones); sql = sql || r.sql; for (const f of r.filas) { const nf = f.slice(); nf.splice(i, 0, it.nombre); filas.push(nf); } }
    return { filas, sql };
  }
  const PLANTILLAS_CG = {
    'Inteligencia de tiempo': [['Actual', 'SELECTEDMEASURE()'], ['Año anterior', 'CALCULATE(SELECTEDMEASURE(), SAMEPERIODLASTYEAR(Calendario[Date]))'], ['Acumulado del año', 'CALCULATE(SELECTEDMEASURE(), DATESYTD(Calendario[Date]))']],
    'Participación': [['Valor', 'SELECTEDMEASURE()'], ['% del total', 'DIVIDE(SELECTEDMEASURE(), CALCULATE(SELECTEDMEASURE(), ALLSELECTED()))']],
  };
  function dialogoGrupoCalculo(nombreEdit) {
    const T0 = nombreEdit && S.tablas[nombreEdit];
    const g = T0 ? JSON.parse(JSON.stringify(T0.fuente)) : { tipo: 'calcgroup', columna: 'Cálculo', items: [{ nombre: 'Actual', expr: 'SELECTEDMEASURE()' }] };
    let nombre = nombreEdit || 'Grupo de cálculo';
    const m = modal('<div class="pb-cg"></div>', 'pb-modal-ancho');
    const pintar = () => {
      m.querySelector('.pb-cg').innerHTML = `<div class="pb-m-cab">${T0 ? 'Editar' : 'Nuevo'} grupo de cálculo<button data-cerrar-modal>✕</button></div><div class="pb-form">
        <label>Nombre del grupo (tabla)<input data-cg-n value="${esc(nombre)}"></label><label>Nombre de la columna<input data-cg-c value="${esc(g.columna)}"></label>
        <div class="pb-dim small">Plantillas: ${Object.keys(PLANTILLAS_CG).map((k) => `<button class="pb-btn" data-cg-pl="${esc(k)}">${esc(k)}</button>`).join(' ')}</div>
        <div class="pb-cg-items">${g.items.map((it, i) => `<div class="pb-cg-item"><input data-cg-in="${i}" value="${esc(it.nombre)}" placeholder="Nombre del ítem"><textarea data-cg-ie="${i}" rows="2" placeholder="SELECTEDMEASURE()">${esc(it.expr)}</textarea><button data-cg-del="${i}" title="Quitar">✕</button></div>`).join('')}</div>
        <button class="pb-btn" data-cg-add>+ Nuevo elemento de cálculo</button>
        <small>Usa <code>SELECTEDMEASURE()</code> donde iría la medida y <code>SELECTEDMEASURENAME()</code> para su nombre. Pon la columna <b>${esc(g.columna)}</b> en un objeto visual (Columnas de una matriz, Leyenda o Eje) junto con tus medidas, o en una segmentación para elegir un ítem. "Año anterior" y "Acumulado" necesitan la tabla Calendario (Modelado → Nueva tabla).</small></div>
        <div class="pb-m-pie"><button class="pb-btn pb-btn-am" data-cg-ok>Guardar</button>${T0 ? '<button class="pb-btn" data-cg-borrar>Eliminar grupo</button>' : ''}<button class="pb-btn" data-cerrar-modal>Cancelar</button></div>`;
    };
    pintar();
    m.addEventListener('input', (e) => { const t = e.target; if (t.matches('[data-cg-n]')) nombre = t.value; if (t.matches('[data-cg-c]')) g.columna = t.value; if (t.matches('[data-cg-in]')) g.items[+t.dataset.cgIn].nombre = t.value; if (t.matches('[data-cg-ie]')) g.items[+t.dataset.cgIe].expr = t.value; });
    m.addEventListener('click', (e) => {
      const t = e.target;
      const pl = t.closest('[data-cg-pl]'); if (pl) { g.items = PLANTILLAS_CG[pl.dataset.cgPl].map(([n, x]) => ({ nombre: n, expr: x })); if (!T0) nombre = pl.dataset.cgPl; pintar(); return; }
      if (t.closest('[data-cg-add]')) { g.items.push({ nombre: `Elemento ${g.items.length + 1}`, expr: 'SELECTEDMEASURE()' }); pintar(); return; }
      const d = t.closest('[data-cg-del]'); if (d) { g.items.splice(+d.dataset.cgDel, 1); pintar(); return; }
      if (t.closest('[data-cg-borrar]')) { delete S.tablas[nombreEdit]; cambioModelo(); guardar(); m.parentElement.remove(); render(); toast('Grupo de cálculo eliminado.'); return; }
      if (t.closest('[data-cg-ok]')) {
        nombre = nombre.trim(); g.columna = g.columna.trim() || 'Cálculo'; g.items = g.items.filter((it) => it.nombre.trim());
        if (!nombre) return toast('El grupo necesita un nombre.');
        if (!g.items.length) return toast('Agrega al menos un elemento de cálculo.');
        if (new Set(g.items.map((it) => it.nombre)).size !== g.items.length) return toast('Los nombres de los elementos tienen que ser únicos.');
        const malo = g.items.find((it) => !/SELECTEDMEASURE/i.test(it.expr)); if (malo) return toast(`"${malo.nombre}" no usa SELECTEDMEASURE(): un elemento de cálculo modifica la medida del visual.`);
        if (nombreEdit && nombreEdit !== nombre) delete S.tablas[nombreEdit];
        if (!nombreEdit && S.tablas[nombre]) return toast('Ya existe una tabla con ese nombre.');
        S.tablas[nombre] = { fuente: { tipo: 'calcgroup', columna: g.columna, items: g.items }, pasos: [], calc: [], resumen: {} };
        cambioModelo(); guardar(); m.parentElement.remove(); render(); toast(`Grupo de cálculo "${nombre}" guardado: arrastra la columna ${g.columna} a un objeto visual.`);
      }
    });
  }

  // ---------------------------------------------------------------- seguridad de nivel de fila (RLS)
  // Cada rol tiene reglas por tabla (columna, operador, valor) como el editor de "Administrar roles" de
  // Power BI Desktop; el valor puede ser USERPRINCIPALNAME() (RLS dinámica). "Ver como" aplica el rol al
  // informe: el filtro se propaga por las relaciones y CALCULATE/ALL no lo quitan (origen 'rls').
  const OPS_RLS = { '=': '=', '<>': '<>', '>': '>', '<': '<', '>=': '>=', '<=': '<=' };
  const daxRegla = (g) => { const v = /^USERPRINCIPALNAME\(\)$/i.test(g.val) ? 'USERPRINCIPALNAME()' : g.val !== '' && !isNaN(Number(g.val)) ? g.val : `"${String(g.val).replace(/"/g, '""')}"`; return `[${g.c}] ${g.op === '=' ? '==' : g.op} ${v}`; };
  const daxRol = (rol, t) => rol.reglas.filter((g) => g.t === t).map(daxRegla).join(' && ');
  function filtrosRls() {
    if (!S.verComo || !S.verComo.rol) return [];
    const rol = (S.roles || []).find((r) => r.nombre === S.verComo.rol); if (!rol) return [];
    return rol.reglas.filter((g) => S.tablas[g.t] && meta(g.t).some((c) => c.n === g.c)).map((g) => ({ campo: { t: g.t, c: g.c }, cond: { op: g.op, val: /^USERPRINCIPALNAME\(\)$/i.test(g.val) ? (S.verComo.usuario || 'alumno@academia.dev') : g.val }, origen: 'rls' }));
  }
  function dialogoRoles() {
    construir();
    let sel = S.roles.length ? 0 : -1, tablaSel = tablas()[0];
    const m = modal('<div class="pb-roles"></div>', 'pb-modal-ancho');
    const pintarRoles = () => {
      const R = S.roles[sel];
      m.querySelector('.pb-roles').innerHTML = `<div class="pb-m-cab">Administrar roles de seguridad<button data-cerrar-modal>✕</button></div>
        <div class="pb-roles-cuerpo">
          <div class="pb-roles-col"><div class="pb-roles-t">Roles <button class="pb-btn" data-nuevo-rol>+ Nuevo</button></div>${S.roles.map((r, i) => `<div class="pb-rol ${i === sel ? 'on' : ''}" data-rol="${i}"><span>${esc(r.nombre)}</span><button data-borrar-rol="${i}" title="Eliminar">✕</button></div>`).join('') || '<p class="pb-dim small">Todavía no hay roles.</p>'}</div>
          <div class="pb-roles-col"><div class="pb-roles-t">Seleccionar tablas</div>${R ? tablas().map((t) => `<div class="pb-rol ${t === tablaSel ? 'on' : ''}" data-tabla-rol="${esc(t)}"><span>${esc(t)}</span>${R.reglas.some((g) => g.t === t) ? '<i class="pb-rls-ok">●</i>' : ''}</div>`).join('') : ''}</div>
          <div class="pb-roles-col pb-roles-reglas">${R ? `<label class="pb-roles-nom">Nombre del rol <input data-nom-rol value="${esc(R.nombre)}"></label><div class="pb-roles-t">Filtrar datos de ${esc(tablaSel)}</div>
            ${R.reglas.map((g, i) => (g.t === tablaSel ? `<div class="pb-regla"><select data-rc="${i}">${meta(tablaSel).map((c) => `<option ${c.n === g.c ? 'selected' : ''}>${esc(c.n)}</option>`).join('')}</select><select data-rop="${i}">${Object.keys(OPS_RLS).map((o) => `<option value="${o}" ${o === g.op ? 'selected' : ''}>${o === '=' ? 'Es igual a' : o === '<>' ? 'No es igual a' : o}</option>`).join('')}</select><input data-rv="${i}" value="${esc(g.val)}" placeholder="Valor o USERPRINCIPALNAME()"><button data-rdel="${i}" title="Quitar">✕</button></div>` : '')).join('')}
            <button class="pb-btn" data-nueva-regla>+ Nueva regla</button>
            <div class="pb-roles-dax"><b>DAX equivalente</b><code>${esc(daxRol(R, tablaSel) || '(sin filtro: el rol ve todas las filas de esta tabla)')}</code></div>
            <p class="pb-dim small">El filtro de una tabla se propaga a las tablas relacionadas del lado "varios" (por ejemplo, filtrar <i>clientes</i> filtra sus <i>pedidos</i>). Pruébalo con <b>Ver como</b>. Al publicar, en el servicio se asignan personas o grupos a cada rol.</p>` : '<p class="pb-dim">Crea un rol para empezar.</p>'}</div>
        </div>
        <div class="pb-m-pie"><button class="pb-btn pb-btn-am" data-guardar-roles>Guardar</button></div>`;
    };
    pintarRoles();
    m.addEventListener('click', (e) => {
      const t = e.target;
      if (t.closest('[data-nuevo-rol]')) { let i = 1; while (S.roles.some((r) => r.nombre === 'Rol ' + i)) i++; S.roles.push({ nombre: 'Rol ' + i, reglas: [] }); sel = S.roles.length - 1; pintarRoles(); return; }
      const br = t.closest('[data-borrar-rol]'); if (br) { S.roles.splice(Number(br.dataset.borrarRol), 1); sel = Math.min(sel, S.roles.length - 1); if (S.verComo && !S.roles.some((r) => r.nombre === S.verComo.rol)) S.verComo = null; pintarRoles(); return; }
      const r = t.closest('[data-rol]'); if (r) { sel = Number(r.dataset.rol); pintarRoles(); return; }
      const tr = t.closest('[data-tabla-rol]'); if (tr) { tablaSel = tr.dataset.tablaRol; pintarRoles(); return; }
      if (t.closest('[data-nueva-regla]')) { S.roles[sel].reglas.push({ t: tablaSel, c: (meta(tablaSel)[0] || {}).n, op: '=', val: '' }); pintarRoles(); return; }
      const rd = t.closest('[data-rdel]'); if (rd) { S.roles[sel].reglas.splice(Number(rd.dataset.rdel), 1); pintarRoles(); return; }
      if (t.closest('[data-guardar-roles]')) { S.roles.forEach((R) => { R.reglas = R.reglas.filter((g) => g.c); }); guardar(); m.parentElement.remove(); render(); toast(`Roles guardados (${S.roles.length}). Usa "Ver como" para probarlos.`); }
    });
    m.addEventListener('change', (e) => {
      const t = e.target, R = S.roles[sel]; if (!R) return;
      if (t.matches('[data-nom-rol]')) { const v = t.value.trim(); if (!v || S.roles.some((x) => x !== R && x.nombre === v)) { t.value = R.nombre; toast('El nombre del rol tiene que ser único.'); return; } if (S.verComo && S.verComo.rol === R.nombre) S.verComo.rol = v; R.nombre = v; pintarRoles(); return; }
      if (t.matches('[data-rc]')) R.reglas[Number(t.dataset.rc)].c = t.value;
      if (t.matches('[data-rop]')) R.reglas[Number(t.dataset.rop)].op = t.value;
      if (t.matches('[data-rv]')) R.reglas[Number(t.dataset.rv)].val = t.value.trim();
      pintarRoles();
    });
  }
  function dialogoVerComo() {
    if (!S.roles.length) { toast('Primero crea un rol en Modelado → Administrar roles.'); return; }
    const vc = S.verComo || {};
    const m = modal(`<div class="pb-m-cab">Ver como roles<button data-cerrar-modal>✕</button></div><div class="pb-form">
      <label class="pb-check"><input type="checkbox" data-otro ${vc.usuario ? 'checked' : ''}> Otro usuario <input data-usuario value="${esc(vc.usuario || 'ana.datos@academia.dev')}" placeholder="usuario@empresa.com"></label>
      ${S.roles.map((r) => `<label class="pb-check"><input type="radio" name="vcrol" value="${esc(r.nombre)}" ${vc.rol === r.nombre ? 'checked' : ''}> ${esc(r.nombre)} <span class="pb-dim small">${esc(r.reglas.map(daxRegla).join(' · ') || 'sin reglas')}</span></label>`).join('')}
      <p class="pb-dim small">"Otro usuario" reemplaza <code>USERPRINCIPALNAME()</code> en las reglas, para probar la seguridad dinámica.</p></div>
      <div class="pb-m-pie"><button class="pb-btn pb-btn-am" data-ok-vc>Aceptar</button><button class="pb-btn" data-cerrar-modal>Cancelar</button></div>`);
    m.querySelector('[data-ok-vc]').addEventListener('click', () => {
      const r = m.querySelector('[name=vcrol]:checked'); if (!r) { toast('Elige un rol.'); return; }
      S.verComo = { rol: r.value, usuario: m.querySelector('[data-otro]').checked ? m.querySelector('[data-usuario]').value.trim() : '' }; S.vioComo = true;
      guardar(); m.parentElement.remove(); render();
    });
  }
  // ---------------------------------------------------------------- campos y consultas de los visuales
  const nomCampo = (f) => (f.medida ? f.medida : f.agg && f.agg !== 'none' ? `${AGG[f.agg]} de ${f.c}` : f.parte ? `${f.c} (${PARTES[f.parte]})` : f.c);
  const formatoDe = (f) => (f.medida ? (S.medidas.find((m) => m.nombre === f.medida) || {}).formato : null);
  const esFecha = (f) => !!f.parte || tipoDe(f.t, f.c) === 'fecha';
  function filtrosDe(v) {
    const out = [];
    const agregar = (f, origen) => { const r = filtroEfectivo(f); if (r) out.push({ ...r, origen }); };
    for (const f of S.filtrosTodas) agregar(f, 'pagina');
    for (const f of pag().filtros) agregar(f, 'pagina');
    for (const f of v.filtros || []) agregar(f, 'pagina');
    const X = window.PBIInforme, inter = (src) => (X ? X.interaccion(src, v.id) : 'filtro');
    for (const o of pag().visuales) if (o.tipo === 'segmentacion' && o.id !== v.id && o.pozos.x && o.pozos.x[0] && (o.slicerSel || []).length && inter(o.id) !== 'ninguno') out.push({ campo: o.pozos.x[0], valores: o.slicerSel, origen: 'pagina' });
    if (S.cruz && S.cruz.visual !== v.id && pag().visuales.some((o) => o.id === S.cruz.visual) && inter(S.cruz.visual) !== 'ninguno') out.push({ campo: S.cruz.campo, valores: [S.cruz.valor], origen: 'pagina' });
    if (X) out.push(...X.filtrosExtra(v));
    out.push(...filtrosRls());
    return out;
  }
  // convierte un filtro del panel en el filtro que entiende el motor (básico, avanzado o N superior)
  function filtroEfectivo(f) {
    if (f.tipo === 'avanzado') return f.cond && f.cond.op && (f.cond.val !== '' || /blanco/.test(f.cond.op)) ? { campo: f.campo, cond: f.cond } : null;
    if (f.tipo === 'topn') {
      if (!f.topn || !f.topn.por || !f.topn.n) return null;
      try { const r = consultar([f.campo], [f.topn.por], []); const orden = r.filas.filter((x) => x[1] != null).sort((a, b) => (f.topn.dir === 'Inferior' ? a[1] - b[1] : b[1] - a[1])).slice(0, Number(f.topn.n)); return { campo: f.campo, valores: orden.map((x) => x[0]) }; } catch (e) { return null; }
    }
    return f.valores && f.valores.length ? { campo: f.campo, valores: f.valores } : null;
  }
  const valorDe = (f) => (f.medida ? { medida: f.medida } : { t: f.t, c: f.c, agg: f.agg && f.agg !== 'none' ? f.agg : 'count' });
  function serieDe(cats, campo, filtros) { const r = consultar(cats, [valorDe(campo)], filtros); return { r, vals: Object.fromEntries(r.filas.map((f) => [f[0], f[f.length - 1]])) }; }
  function ordenarCats(v, cats, series, x) {
    const o = v.orden;
    const mo = claveOrden(x);
    if (mo && (!o || o.por === 'cat')) { const d = o && o.desc ? -1 : 1; return cats.sort((a, b) => { const ka = mo.get(a), kb = mo.get(b); return (ka < kb ? -1 : ka > kb ? 1 : 0) * d; }); }
    if (o && o.por !== undefined) { const s = o.por === 'cat' ? null : series[Number(o.por)] || series[0]; return cats.sort((a, b) => { const d = s ? (s.vals[a] ?? -Infinity) - (s.vals[b] ?? -Infinity) : a < b ? -1 : a > b ? 1 : 0; return o.desc ? -d : d; }); }
    if (x && (esFecha(x) || ['linea', 'area', 'areaApilada', 'kpi', 'cascada'].includes(v.tipo) && !['embudo'].includes(v.tipo))) return cats.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    if (series[0]) return cats.sort((a, b) => (series[0].vals[b] ?? -Infinity) - (series[0].vals[a] ?? -Infinity));
    return cats;
  }
  function datosVisual(v) {
    const T = V().TIPOS[v.tipo], P = window.PBIInforme ? window.PBIInforme.resolverPozos(v) : v.pozos, filtros = filtrosDe(v); let sql = '';
    const card = (f) => { if (!f) return null; const r = consultar([], [valorDe(f)], filtros); sql = sql || r.sql; return r.filas[0] ? r.filas[0][0] : null; };
    if (T.g === 'texto') return {};
    if (T.g === 'seg') { const c = P.x && P.x[0]; if (!c) return null; const pred = filtros.filter((f) => f.campo.t === c.t && !(f.campo.c === c.c)); void pred; return { valores: ejecutar(`SELECT DISTINCT ${motor.colSql(c)} FROM ${q(c.t)} ORDER BY 1 LIMIT 1000`).map((x) => x[0]) }; }
    if (v.tipo === 'tarjeta') { const f = P.valores && P.valores[0]; if (!f) return null; return { valor: card(f), nombre: nomCampo(f), formato: formatoDe(f), sql }; }
    if (v.tipo === 'tarjetaFilas') { const fs = P.valores || []; if (!fs.length) return null; return { items: fs.map((f) => ({ nombre: nomCampo(f), valor: card(f), formato: formatoDe(f) })), sql }; }
    if (T.g === 'medidor') { const f = P.y && P.y[0]; if (!f) return null; return { valor: card(f), nombre: nomCampo(f), formato: formatoDe(f), min: card(P.min && P.min[0]), max: card(P.max && P.max[0]), meta: card(P.meta && P.meta[0]), sql }; }
    if (T.g === 'kpi') { const f = P.y && P.y[0]; if (!f) return null; const x = P.x && P.x[0]; let tendencia = null; if (x) { const s = serieDe([x], f, filtros); tendencia = Object.entries(s.vals).sort((a, b) => (a[0] < b[0] ? -1 : 1)); } return { valor: card(f), meta: card(P.meta && P.meta[0]), formato: formatoDe(f), tendencia, sql }; }
    if (T.g === 'disp') {
      const det = P.detalle && P.detalle[0], ex = P.ex && P.ex[0], ey = P.ey && P.ey[0]; if (!det || !ex || !ey) return null;
      const ley = P.leyenda && P.leyenda[0], tam = P.tam && P.tam[0];
      const cats = ley ? [det, ley] : [det];
      const r = consultar(cats, [valorDe(ex), valorDe(ey), ...(tam ? [valorDe(tam)] : [])], filtros);
      return { puntos: r.filas.slice(0, 1500).map((f) => ({ d: f[0], ley: ley ? f[1] : null, x: f[cats.length], y: f[cats.length + 1], tam: tam ? f[cats.length + 2] : null })), nx: nomCampo(ex), ny: nomCampo(ey), nt: tam ? nomCampo(tam) : '', sql: r.sql };
    }
    if (v.tipo === 'tabla') {
      const cols = P.cols || []; if (!cols.length) return null;
      const cats = cols.filter((x) => !x.medida && (!x.agg || x.agg === 'none')), vals = cols.filter((x) => x.medida || (x.agg && x.agg !== 'none'));
      if (!vals.length) { const r = consultar(cats, [], filtros, {}); void r; const filas = ejecutar(`SELECT DISTINCT ${cats.map((c, i) => `${motor.colSql(c)} AS c${i}`).join(', ')} FROM ${q(cats[0].t)} ${joinsSql(cats[0].t, cats)} ORDER BY 1 LIMIT 2000`); return ordenTabla(v, { cab: cats.map(nomCampo), filas, ncat: cats.length }); }
      const mapa = new Map(); let s1 = '';
      vals.forEach((val, k) => { const r = consultar(cats, [valorDe(val)], filtros); s1 = s1 || r.sql; for (const f of r.filas) { const key = JSON.stringify(f.slice(0, cats.length)); if (!mapa.has(key)) mapa.set(key, [...f.slice(0, cats.length), ...vals.map(() => null)]); mapa.get(key)[cats.length + k] = f[cats.length]; } });
      let filas = [...mapa.values()];
      filas = filas.sort((a, b) => (b[cats.length] ?? -Infinity) - (a[cats.length] ?? -Infinity)).slice(0, 2000);
      return ordenTabla(v, { cab: [...cats.map(nomCampo), ...vals.map(nomCampo)], filas, total: cats.length ? vals.map((val) => card(val)) : null, ncat: cats.length, formatos: [...cats.map(() => null), ...vals.map(formatoDe)], sql: s1 });
    }
    if (v.tipo === 'matriz') {
      const xs = P.x || [], col = P.leyenda && P.leyenda[0], ys = P.y || []; if (!xs.length || !ys.length) return null;
      const colsK = col ? ejecutar(`SELECT DISTINCT ${motor.colSql(col)} FROM ${q(col.t)} ORDER BY 1 LIMIT 12`).map((x) => x[0]) : [null];
      const cab = [...xs.map(nomCampo), ...colsK.flatMap((ck) => ys.map((y) => (col ? `${ck ?? '(En blanco)'}${ys.length > 1 ? ` · ${nomCampo(y)}` : ''}` : nomCampo(y)))), ...(col ? ys.map((y) => `Total${ys.length > 1 ? ` · ${nomCampo(y)}` : ''}`) : [])];
      const filasMap = new Map();
      const llenar = (cats, fila0) => ys.forEach((y, k) => { const r = consultar(cats, [valorDe(y)], filtros); sql = sql || r.sql; for (const f of r.filas) { const key = JSON.stringify(f.slice(0, xs.length)); if (!filasMap.has(key)) filasMap.set(key, [...f.slice(0, xs.length), ...Array(cab.length - xs.length).fill(null)]); const fila = filasMap.get(key); const ci = col ? colsK.findIndex((z) => z === f[xs.length]) : 0; if (ci >= 0 && (col ? f.length > xs.length + 1 : true)) fila[xs.length + ci * ys.length + k] = f[f.length - 1]; } void fila0; });
      llenar(col ? [...xs, col] : xs);
      if (col) ys.forEach((y, k) => { const r = consultar(xs, [valorDe(y)], filtros); for (const f of r.filas) { const key = JSON.stringify(f.slice(0, xs.length)); if (filasMap.has(key)) filasMap.get(key)[xs.length + colsK.length * ys.length + k] = f[f.length - 1]; } });
      let filas = [...filasMap.values()].sort((a, b) => { for (let i = 0; i < xs.length; i++) { if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1; } return 0; }).slice(0, 1000);
      // subtotales del primer nivel cuando hay más de un campo en Filas
      if (xs.length > 1) {
        const sub = new Map(); ys.forEach((y, k) => { for (const f of consultar([xs[0], ...(col ? [col] : [])], [valorDe(y)], filtros).filas) { const key = String(f[0]); if (!sub.has(key)) sub.set(key, Array(cab.length - xs.length).fill(null)); const ci = col ? colsK.findIndex((z) => z === f[1]) : 0; if (ci >= 0) sub.get(key)[ci * ys.length + k] = f[f.length - 1]; } });
        const res = []; let prev; for (const f of filas) { if (prev !== undefined && f[0] !== prev) { const t = Object.assign([`Total ${prev}`, ...xs.slice(1).map(() => ''), ...(sub.get(String(prev)) || [])], { subtotal: true }); res.push(t); } res.push(f); prev = f[0]; } if (prev !== undefined) res.push(Object.assign([`Total ${prev}`, ...xs.slice(1).map(() => ''), ...(sub.get(String(prev)) || [])], { subtotal: true })); filas = res;
      }
      const total = [...colsK.flatMap((ck) => ys.map((y) => { if (!col) return card(y); const r = consultar([], [valorDe(y)], [...filtros, { campo: col, valores: [ck], origen: 'visual' }]); return r.filas[0] ? r.filas[0][0] : null; })), ...(col ? ys.map((y) => card(y)) : [])];
      return ordenTabla(v, { cab, filas, total, ncat: xs.length, formatos: [...xs.map(() => null), ...colsK.flatMap(() => ys.map(formatoDe)), ...(col ? ys.map(formatoDe) : [])], sql });
    }
    // categorías: columnas, barras, líneas, áreas, combinado, cascada, embudo, circular, anillo, rectángulos
    const nivel = Math.min(v.nivel || 0, Math.max(0, (P.x || []).length - 1));
    const x = P.x && P.x[nivel]; const ys = (P.y || []), lineas = v.tipo === 'lineaColumna' ? P.linea || [] : [], ley = T.g === 'cart' && P.leyenda && P.leyenda[0];
    if (!x || !(ys.length || lineas.length)) return null;
    let series;
    if (v.expandido && nivel > 0 && !ley) {
      const niv = P.x.slice(0, nivel + 1);
      series = [...ys.map((y) => ({ y, tipo: 'col' })), ...lineas.map((y) => ({ y, tipo: 'linea' }))].map(({ y, tipo }) => { const r = consultar(niv, [valorDe(y)], filtros); sql = sql || r.sql; return { nombre: nomCampo(y), formato: formatoDe(y), tipo, vals: Object.fromEntries(r.filas.map((f) => [f.slice(0, niv.length).map((z) => z ?? '(En blanco)').join(' · '), f[f.length - 1]])) }; });
    } else if (ley && ys[0]) {
      const r = consultar([x, ley], [valorDe(ys[0])], filtros); sql = r.sql;
      const nombres = [...new Set(r.filas.map((f) => f[1]))].slice(0, 12);
      series = nombres.map((s) => ({ nombre: String(s ?? '(En blanco)'), formato: formatoDe(ys[0]), vals: Object.fromEntries(r.filas.filter((f) => f[1] === s).map((f) => [f[0], f[2]])) }));
    } else series = [...ys.map((y) => ({ y, tipo: 'col' })), ...lineas.map((y) => ({ y, tipo: 'linea' }))].map(({ y, tipo }) => { const s = serieDe([x], y, filtros); sql = sql || s.r.sql; return { nombre: nomCampo(y), formato: formatoDe(y), vals: s.vals, tipo }; });
    let cats = [...new Set(series.flatMap((s) => Object.keys(s.vals)))].map((k) => (series.some((s) => typeof Object.keys(s.vals).find((z) => z === k) === 'string') ? k : k));
    cats = ordenarCats(v, cats, series, x);
    const info = T.g === 'cart' && P.info ? P.info.map((f) => ({ nombre: nomCampo(f), formato: formatoDe(f), vals: serieDe([x], f, filtros).vals })) : [];
    const tope = T.linea ? 1000 : v.tipo === 'treemap' ? 60 : 60;
    return { cats: cats.slice(0, tope), recortado: cats.length > tope ? cats.length : 0, series, info, nx: nomCampo(x), ny: series.length === 1 ? series[0].nombre : ys.map(nomCampo).join(' y '), sql };
  }
  function ordenTabla(v, d) { if (v.orden && v.orden.col !== undefined) { const j = v.orden.col; d.filas = d.filas.filter((f) => !f.subtotal).sort((a, b) => { const x = a[j], y = b[j]; const r = x === y ? 0 : x == null ? 1 : y == null ? -1 : x < y ? -1 : 1; return v.orden.desc ? -r : r; }); } return d; }
  function joinsSql(t0, cats) { const out = [], vistos = new Set([t0]); for (const c of cats) { if (vistos.has(c.t)) continue; for (const s of motor.camino(t0, c.t) || []) if (!vistos.has(s.a)) { vistos.add(s.a); out.push(`LEFT JOIN ${q(s.a)} ON ${q(s.a)}.${q(s.colA)} = ${q(s.de)}.${q(s.colDe)}`); } } return out.join(' '); }
  // la consulta DAX equivalente a un objeto visual (como "Copiar consulta" del Analizador de rendimiento)
  function daxDe(v) {
    const P = v.pozos || {}; const campos = Object.values(P).flat();
    const ref = (f) => `'${f.t}'[${f.c}]`;
    const cats = campos.filter((f) => !f.medida && (!f.agg || f.agg === 'none')), vals = campos.filter((f) => f.medida || (f.agg && f.agg !== 'none'));
    const exprV = (f) => (f.medida ? `[${f.medida}]` : `${{ sum: 'SUM', avg: 'AVERAGE', min: 'MIN', max: 'MAX', count: 'COUNT', distinct: 'DISTINCTCOUNT', median: 'MEDIAN' }[f.agg] || 'COUNT'}(${ref(f)})`);
    if (!vals.length) return `EVALUATE\n    SUMMARIZECOLUMNS(${cats.map(ref).join(', ')})`;
    return `// ${V().TIPOS[v.tipo].n}\nEVALUATE\n    SUMMARIZECOLUMNS(\n${[...cats.map((c) => `        ${ref(c)}`), ...vals.map((f) => `        "${nomCampo(f)}", ${exprV(f)}`)].join(',\n')}\n    )`;
  }

  // ---------------------------------------------------------------- reto guiado (sirve con cualquier dataset)
  const RETO = [
    ['Obtén datos: importa al menos una tabla (Inicio → Obtener datos)', () => tablas().length > 0],
    ['Transforma: agrega un paso en Power Query (Inicio → Transformar datos)', () => Object.values(S.tablas).some((t) => t.pasos.some((p) => !['origen', 'tipos', 'encabezados', 'navegacion'].includes(p.tipo)))],
    ['Modela: ten al menos una relación (vista Modelo)', () => S.rels.length > 0],
    ['Crea una medida DAX (Inicio → Nueva medida)', () => S.medidas.length > 0],
    ['Arma un gráfico con esa medida', () => todos().some((v) => Object.values(v.pozos || {}).flat().some((f) => f.medida) && !['tarjeta', 'tarjetaFilas'].includes(v.tipo))],
    ['Agrega una segmentación de datos y una tarjeta', () => todos().some((v) => v.tipo === 'segmentacion' && v.pozos.x && v.pozos.x[0]) && todos().some((v) => v.tipo === 'tarjeta' && v.pozos.valores && v.pozos.valores[0])],
    ['Ejecuta una consulta en la vista de consultas DAX', () => !!S.daxEjecutada],
    ['Publica el informe', () => S.publicado],
  ];
  const RETO_AV = [
    ['Usa CALCULATE en una medida (por ejemplo, ventas de un canal)', () => S.medidas.some((m) => /CALCULATE\s*\(/i.test(m.expr))],
    ['Crea una medida de inteligencia de tiempo (TOTALYTD, SAMEPERIODLASTYEAR o DATEADD)', () => S.medidas.some((m) => /TOTALYTD|SAMEPERIODLASTYEAR|DATEADD|DATESYTD/i.test(m.expr))],
    ['Agrega un visual de mapa por país o ciudad', () => todos().some((v) => v.tipo === 'mapa' && v.pozos.x && v.pozos.x[0])],
    ['Crea un rol de seguridad (RLS) con una regla', () => (S.roles || []).some((r) => r.reglas.length)],
    ['Prueba el rol con "Ver como"', () => !!(S.verComo && S.verComo.rol) || !!S.vioComo],
    ['Crea un grupo de cálculo y úsalo en un visual', () => Object.entries(S.tablas).some(([n, t]) => t.fuente.tipo === 'calcgroup' && todos().some((v) => Object.values(v.pozos || {}).flat().some((f) => f.t === n)))],
    ['Crea una jerarquía y explora en profundidad con ella (clic derecho en una columna → Crear jerarquía)', () => Object.values(S.jerarquias || {}).some((l) => l.some((h) => h.niveles.length > 1)) && todos().some((v) => (v.pozos.x || []).length > 1 && ((v.nivel || 0) > 0 || (v.drillPath || []).length))],
    ['Arma una página de Obtener detalles y llega a ella con clic derecho en un dato', () => S.paginas.some((p) => p.tipo === 'detalles' && (p.detalles || []).length) && !!S.drill],
    ['Crea un marcador y un botón que lo aplique (Insertar → Botones → Marcador)', () => (S.marcadores || []).length > 0 && todos().some((v) => v.tipo === 'boton' && ((v.formato || {}).accion || {}).tipo === 'Marcador' && ((v.formato || {}).accion || {}).destino)],
    ['Agrega una línea de promedio o un objetivo en el panel Análisis', () => todos().some((v) => (v.analisis || []).length > 0)],
    ['Usa formato condicional (fx) en una tabla o una matriz', () => todos().some((v) => v.formatoCond && Object.keys(v.formatoCond).some((k) => k !== '__datos'))],
    ['Publica en el servicio y logra una actualización correcta (puerta de enlace + credenciales)', () => { const d = Store.data.pbiServicio; return !!d && d.ws.some((w) => w.items.some((x) => x.tipo === 'modelo' && (x.historial || []).some((h) => h.estado === 'Completado'))); }],
  ];

  // ---------------------------------------------------------------- arranque
  function verPublicado(m, ctx, foto, opts) {
    main = m; ctxApp = ctx; Store = ctx.Store; toast = ctx.toast; SQLc = window.Engines.SQL; lectura = opts || {};
    S = migrar(JSON.parse(JSON.stringify(foto))); Object.assign(S, { vista: 'informe', reto: false, sel: null, selMulti: [], analizador: false, panelesExtra: {}, editInter: false, enfoque: null, verComo: opts && opts.verComo ? opts.verComo : null });
    S.paneles = { filtros: true, vis: false, datos: false }; if (S.paginas[S.pagina] && S.paginas[S.pagina].oculta) S.pagina = Math.max(0, S.paginas.findIndex((p) => !p.oculta));
    cargarDatos(); version++;
    main.innerHTML = '<div class="loading-block"><span class="spinner"></span> Abriendo el informe…</div>';
    ctx.ensureSql(main).then((ok) => { if (ok) pintar(); });
  }
  function vista(m, ctx) {
    lectura = null;
    main = m; ctxApp = ctx; Store = ctx.Store; toast = ctx.toast; SQLc = window.Engines.SQL;
    S = migrar(Store.data.powerbi && Store.data.powerbi.tablas ? Store.data.powerbi : (Store.data.powerbi = NUEVO()));
    cargarDatos(); version++;
    hist.pila = [foto()]; hist.i = 0;
    main.innerHTML = '<div class="loading-block"><span class="spinner"></span> Abriendo Power BI Desktop…</div>';
    ctx.ensureSql(main).then((ok) => { if (ok) { pintar(); document.addEventListener('keydown', teclas, true); } });
  }
  function teclas(e) {
    if (!document.getElementById('pbi') || lectura) { if (!document.getElementById('pbi')) document.removeEventListener('keydown', teclas, true); return; }
    if (e.target.closest('input, textarea, select, [contenteditable], .monaco-editor')) return;
    const k = e.key.toLowerCase();
    if ((e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); deshacer(-1); }
    else if ((e.ctrlKey || e.metaKey) && k === 'y') { e.preventDefault(); deshacer(1); }
    else if ((e.ctrlKey || e.metaKey) && k === 's') { e.preventDefault(); guardarComo(); }
    else if (window.PBIInforme && S.vista === 'informe' && window.PBIInforme.tecla(e)) { e.preventDefault(); }
    else if (k === 'delete' && S.sel && S.vista === 'informe') { e.preventDefault(); quitarVisual(S.sel); }
    else if (k === 'escape' && S.enfoque) { S.enfoque = null; render(); }
  }
  const BOTON = (acc, ico, txt, extra = '') => `<button class="pb-cb grande" data-acc="${acc}" ${extra}><span class="pb-cb-ic">${ico}</span><span>${txt}</span></button>`;
  const CHICO = (acc, ico, txt) => `<button class="pb-cb chico" data-acc="${acc}"><span class="pb-cb-ic">${ico}</span><span>${txt}</span></button>`;
  const GRUPO = (nombre, html) => `<div class="pb-grupo">${html}<div class="pb-grupo-n">${nombre}</div></div>`;
  function cintaHtml() {
    const medSel = S.medidaSel && S.medidas.find((m) => m.nombre === S.medidaSel);
    const colSel = S.colSel && S.tablas[S.colSel.t] && meta(S.colSel.t).find((c) => c.n === S.colSel.c);
    const c = S.cinta;
    if (c === 'medida' && medSel) {
      const f = medSel.formato || {};
      return GRUPO('Estructura', `<label class="pb-cinta-campo">Nombre<input data-med-nombre value="${esc(medSel.nombre)}"></label><label class="pb-cinta-campo">Tabla principal<select data-med-tabla>${tablas().map((t) => `<option ${medSel.tabla === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></label>`) + GRUPO('Formato', `<label class="pb-cinta-campo">Formato<select data-med-fmt>${[['general', 'General'], ['decimal', 'Número decimal'], ['entero', 'Número entero'], ['moneda', 'Moneda'], ['porcentaje', 'Porcentaje']].map(([k, n]) => `<option value="${k}" ${f.tipo === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label><label class="pb-cinta-campo">Decimales<input type="number" min="0" max="6" data-med-dec value="${f.dec ?? ''}"></label>`) + GRUPO('Cálculos', BOTON('editar-medida', fl('calculator'), 'Editar<br>fórmula') + BOTON('borrar-medida', fl('dismiss'), 'Eliminar<br>medida'));
    }
    if (c === 'columna' && colSel) {
      const r = (S.tablas[S.colSel.t].resumen || {})[S.colSel.c] || (esNum(S.colSel.t, S.colSel.c) ? 'sum' : 'none');
      return GRUPO('Estructura', `<label class="pb-cinta-campo">Nombre<input value="${esc(colSel.n)}" readonly title="Cámbialo en Power Query (Transformar datos)"></label><label class="pb-cinta-campo">Tipo de datos<select data-col-tipo>${Object.entries(TIPO_N).map(([k, n]) => `<option value="${k}" ${colSel.t === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label>`) + GRUPO('Propiedades', `<label class="pb-cinta-campo">Resumen<select data-col-resumen>${Object.entries(AGG).map(([k, n]) => `<option value="${k}" ${r === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label>`) + GRUPO('Cálculos', BOTON('nueva-columna', fl('table_column_top_bottom'), 'Nueva<br>columna') + (colSel.calc ? BOTON('borrar-columna', fl('dismiss'), 'Eliminar<br>columna') : ''));
    }
    if (c === 'insertar') return GRUPO('Páginas', BOTON('nueva-pagina', fl('document_one_page_add'), 'Nueva<br>página')) + GRUPO('Objetos visuales', BOTON('nuevo-visual', fl('data_bar_vertical_add'), 'Nuevo objeto<br>visual') + BOTON('mas-visuales', fl('apps_add_in'), 'Más objetos<br>visuales')) + GRUPO('Elementos', BOTON('cuadro-texto', fl('textbox'), 'Cuadro de<br>texto') + BOTON('imagen', fl('image'), 'Imagen')) + (window.PBIInforme ? window.PBIInforme.cintaInsertar() : '');
    if (c === 'modelado') return GRUPO('Relaciones', BOTON('relaciones', fl('organization_horizontal'), 'Administrar<br>relaciones')) + GRUPO('Cálculos', BOTON('nueva-medida', fl('calculator'), 'Nueva<br>medida') + BOTON('medida-rapida', fl('flash'), 'Medida<br>rápida') + BOTON('nueva-columna', fl('table_column_top_bottom'), 'Nueva<br>columna') + BOTON('nueva-tabla', fl('table_add'), 'Nueva<br>tabla')) + GRUPO('Grupos de cálculo', BOTON('grupo-calculo', fl('table_switch'), 'Grupo de<br>cálculo')) + GRUPO('Seguridad', BOTON('roles', fl('filter'), 'Administrar<br>roles') + BOTON('ver-como', fl('eye'), 'Ver<br>como')) + GRUPO('Vistas de código', BOTON('ir-dax', fl('code'), 'Vista de<br>consultas DAX') + BOTON('ir-tmdl', fl('document'), 'Vista<br>TMDL')) + (window.PBIInforme ? window.PBIInforme.cintaModelado() : '');
    if (c === 'vista') return GRUPO('Temas', `<div class="pb-temas">${Object.entries(PALETAS).map(([k, p]) => `<button data-tema="${k}" class="${S.tema === k ? 'on' : ''}" title="${esc(p.n)}">${p.c.slice(0, 4).map((x) => `<i style="background:${x}"></i>`).join('')}</button>`).join('')}${S.temaCustom ? `<button data-tema="custom" class="${S.tema === 'custom' ? 'on' : ''}" title="${esc(S.temaCustom.name || 'Personalizado')}">${S.temaCustom.dataColors.slice(0, 4).map((x) => `<i style="background:${x}"></i>`).join('')}</button>` : ''}</div>` + CHICO('tema-importar', fl('folder_open'), 'Examinar temas') + CHICO('tema-exportar', fl('save'), 'Guardar tema actual')) + GRUPO('Opciones de página', BOTON('cuadricula', fl('grid'), `Líneas de<br>cuadrícula ${S.cuadricula ? '✓' : ''}`)) + GRUPO('Mostrar paneles', BOTON('panel-filtros', fl('filter'), `Filtros ${S.paneles.filtros ? '✓' : ''}`) + BOTON('panel-vis', fl('data_bar_vertical'), `Visualiza-<br>ciones ${S.paneles.vis ? '✓' : ''}`) + BOTON('panel-datos', fl('table'), `Datos ${S.paneles.datos ? '✓' : ''}`) + BOTON('analizador', fl('top_speed'), `Analizador de<br>rendimiento ${S.analizador ? '✓' : ''}`)) + (window.PBIInforme ? window.PBIInforme.cintaVista() : '');
    if (c === 'formato' && window.PBIInforme) return window.PBIInforme.cintaFormato();
    if (c === 'optimizar') return GRUPO('Rendimiento', BOTON('analizador', fl('top_speed'), `Analizador de<br>rendimiento ${S.analizador ? '✓' : ''}`) + BOTON('actualizar', fl('arrow_sync'), 'Actualizar<br>objetos visuales'));
    if (c === 'ayuda') return GRUPO('Ayuda', BOTON('doc-pbi', fl('question_circle'), 'Documentación<br>de Power BI') + BOTON('doc-dax', fl('code'), 'Referencia<br>de DAX') + BOTON('doc-m', fl('table'), 'Referencia<br>de Power Query M')) + GRUPO('Práctica', BOTON('reto', fl('target_arrow'), S.reto ? 'Ocultar<br>reto' : 'Ver<br>reto') + BOTON('reiniciar', fl('document_add'), 'Informe<br>nuevo'));
    return GRUPO('Datos', BOTON('obtener', fl('database'), 'Obtener<br>datos') + BOTON('excel', '<b class="pb-x">X</b>', 'Libro de<br>Excel') + BOTON('curso', fl('document_table'), 'Bases del<br>curso') + BOTON('escribir', fl('table_edit'), 'Escribir<br>datos'))
      + GRUPO('Consultas', BOTON('transformar', fl('table'), 'Transformar<br>datos') + BOTON('actualizar', fl('arrow_sync'), 'Actualizar'))
      + GRUPO('Insertar', BOTON('nuevo-visual', fl('data_bar_vertical_add'), 'Nuevo objeto<br>visual') + BOTON('cuadro-texto', fl('textbox'), 'Cuadro de<br>texto'))
      + GRUPO('Cálculos', BOTON('nueva-medida', fl('calculator'), 'Nueva<br>medida') + BOTON('medida-rapida', fl('flash'), 'Medida<br>rápida'))
      + GRUPO('Compartir', BOTON('publicar', fl('cloud_arrow_up'), 'Publicar'));
  }
  function cintaCompleta() {
    const pest = [['inicio', 'Inicio'], ['insertar', 'Insertar'], ['modelado', 'Modelado'], ['vista', 'Vista'], ['optimizar', 'Optimizar'], ['ayuda', 'Ayuda']];
    if (S.medidaSel && S.medidas.some((m) => m.nombre === S.medidaSel)) pest.push(['medida', 'Herramientas de medición']);
    if (S.colSel && S.tablas[S.colSel.t]) pest.push(['columna', 'Herramientas de columnas']);
    if (S.vista === 'informe' && (S.sel || (S.selMulti || []).length) && window.PBIInforme) pest.push(['formato', 'Formato']);
    if (!pest.some((x) => x[0] === S.cinta)) S.cinta = 'inicio';
    return `<div class="pb-cinta-tabs"><span class="pb-archivo" data-acc="archivo">Archivo</span>${pest.map(([k, n]) => `<span data-cinta="${k}" class="${S.cinta === k ? 'on' : ''} ${['medida', 'columna', 'formato'].includes(k) ? 'pb-contextual' : ''}">${n}</span>`).join('')}</div><div class="pb-cinta-botones">${cintaHtml()}</div>`;
  }
  function refrescarCinta() { const c = main.querySelector('.pb-cinta'); if (!c) return; c.innerHTML = cintaCompleta(); enlazarCinta(); }
  function pintar() {
    document.body.classList.add('pb-abierto');
    main.innerHTML = `<div class="pbi ${lectura ? 'pb-lectura' : ''}" id="pbi">
      <div class="pb-titulo"><span class="pb-logo"><i></i><i></i><i></i></span><button class="pb-tb" data-acc="guardar-como" title="Guardar (Ctrl+S)">${fl('save')}</button><button class="pb-tb" data-acc="deshacer" title="Deshacer (Ctrl+Z)">${fl('arrow_undo')}</button><button class="pb-tb" data-acc="rehacer" title="Rehacer (Ctrl+Y)">${fl('arrow_redo')}</button><b>${esc(S.nombreArchivo)}</b><span class="pb-dim">- Power BI Desktop</span><div class="pb-busq">${fl('search')} Buscar</div><span class="spacer"></span>${S.publicado ? '<span class="pb-pub">✓ Publicado</span>' : ''}<span class="pb-usuario" title="Cuenta de práctica"><i>AL</i>Alumno</span><a class="pb-salir" href="#/" title="Cerrar Power BI">${fl('dismiss')}</a></div>
      <div class="pb-cinta">${cintaCompleta()}</div>
      <div class="pb-dax" id="pbDax" hidden></div>
      <div class="pb-cuerpo">
        <nav class="pb-vistas"><button data-v="informe" title="Vista de informe">${fl('data_bar_vertical')}</button><button data-v="tabla" title="Vista de tabla">${fl('table_simple')}</button><button data-v="modelo" title="Vista de modelo">${fl('organization_horizontal')}</button><button data-v="dax" title="Vista de consultas DAX">${fl('code')}</button><button data-v="tmdl" title="Vista TMDL">${fl('document')}</button></nav>
        <section class="pb-centro" id="pbCentro"></section>
        <aside class="pb-paneles" id="pbPaneles"></aside>
      </div>
      <div class="pb-pie" id="pbPie"></div>
      <input type="file" id="pbFile" accept=".csv,.txt,.tsv,.json,.xlsx,.xls,.xlsm,.ods" multiple hidden>
      <input type="file" id="pbAbrir" accept=".json,.pbia" hidden><input type="file" id="pbTema" accept=".json" hidden><input type="file" id="pbImg" accept="image/*" hidden>
    </div>`;
    const $ = (s) => main.querySelector(s);
    $('#pbi').addEventListener('click', (e) => {
      const a = e.target.closest('[data-acc]'); if (a) { accion(a.dataset.acc, a); return; }
      const c = e.target.closest('[data-cinta]'); if (c) { S.cinta = c.dataset.cinta; guardar(true); refrescarCinta(); return; }
      const tm = e.target.closest('[data-tema]'); if (tm) { S.tema = tm.dataset.tema; guardar(); pintar(); }
    });
    $('.pb-vistas').addEventListener('click', (e) => { const b = e.target.closest('[data-v]'); if (b) { S.vista = b.dataset.v; S.enfoque = null; guardar(true); render(); } });
    $('#pbFile').addEventListener('change', async (e) => { const fs = [...e.target.files]; e.target.value = ''; if (!fs.length) return; try { const ts = []; for (const f of fs) ts.push(...(await D().leerArchivo(f)).map((t) => ({ ...t, archivo: f.name }))); navegador(ts.map((t) => ({ nombre: t.nombre, filas: t.filas, archivo: t.archivo, tipo: 'archivo' })), fs.map((f) => f.name).join(', ')); } catch (err) { toast('No se pudo leer el archivo: ' + err.message, 5000); } });
    $('#pbAbrir').addEventListener('change', async (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) abrirArchivo(await f.text()); });
    $('#pbTema').addEventListener('change', async (e) => { const f = e.target.files[0]; e.target.value = ''; if (!f) return; try { const t = JSON.parse(await f.text()); if (!Array.isArray(t.dataColors) || !t.dataColors.length) throw new Error('El tema no tiene "dataColors"'); S.temaCustom = { name: t.name || f.name, dataColors: t.dataColors, background: t.background, foreground: t.foreground }; S.tema = 'custom'; guardar(); pintar(); toast(`Tema "${S.temaCustom.name}" aplicado`); } catch (err) { toast('Tema no válido: ' + err.message, 5000); } });
    $('#pbImg').addEventListener('change', (e) => { const f = e.target.files[0]; e.target.value = ''; if (!f) return; if (f.size > 600000) { toast('La imagen es muy grande para guardarla en el navegador (máximo ~600 KB).'); return; } const r = new FileReader(); r.onload = () => { agregarVisual('texto', { imagen: r.result, w: 20, h: 25 }); }; r.readAsDataURL(f); });
    enlazarCinta();
    render();
  }
  function enlazarCinta() {
    const cinta = main.querySelector('.pb-cinta-botones');
    const m = S.medidaSel && S.medidas.find((x) => x.nombre === S.medidaSel);
    const on = (sel, ev, fn) => { const el = cinta.querySelector(sel); if (el) el.addEventListener(ev, fn); };
    on('[data-med-nombre]', 'change', (e) => { const n = e.target.value.trim(); if (!n || !m || S.medidas.some((x) => x !== m && x.nombre.toLowerCase() === n.toLowerCase())) { toast('Ese nombre no es válido o ya existe.'); e.target.value = m.nombre; return; } renombrarMedida(m, n); });
    on('[data-med-tabla]', 'change', (e) => { m.tabla = e.target.value; guardar(); renderPaneles(); });
    on('[data-med-fmt]', 'change', (e) => { m.formato = { ...(m.formato || {}), tipo: e.target.value }; guardar(); render(); });
    on('[data-med-dec]', 'change', (e) => { m.formato = { ...(m.formato || {}), dec: e.target.value === '' ? undefined : Number(e.target.value) }; guardar(); render(); });
    on('[data-col-tipo]', 'change', (e) => { const { t, c } = S.colSel; const tb = S.tablas[t]; if (tb.fuente.tipo === 'dax' || meta(t).find((x) => x.n === c).calc) { toast('El tipo de una columna calculada sale de su fórmula.'); return; } tb.pasos.push({ tipo: 'tipos', mapa: { [c]: e.target.value } }); cambioModelo(); guardar(); render(); toast(`Tipo cambiado: se agregó el paso "Tipo cambiado" en Power Query.`); });
    on('[data-col-resumen]', 'change', (e) => { const { t, c } = S.colSel; S.tablas[t].resumen[c] = e.target.value; guardar(); renderPaneles(); });
  }
  function renombrarMedida(m, n) {
    const viejo = m.nombre;
    for (const v of todos()) for (const k in v.pozos) for (const f of v.pozos[k]) if (f.medida === viejo) f.medida = n;
    for (const x of S.medidas) x.expr = x.expr.split(`[${viejo}]`).join(`[${n}]`);
    m.nombre = n; S.medidaSel = n; guardar(); pintar();
  }

  // ---------------------------------------------------------------- acciones de la cinta
  function accion(a, el) {
    const sinDatos = () => { if (!tablas().length) { toast('Primero obtén datos: el modelo está vacío.'); return true; } return false; };
    switch (a) {
      case 'archivo': return menuArchivo();
      case 'obtener': return dialogoObtener();
      case 'excel': return main.querySelector('#pbFile').click();
      case 'curso': return navegadorCurso();
      case 'escribir': return escribirDatos();
      case 'transformar': if (sinDatos()) return; return powerQuery();
      case 'actualizar': cambioModelo(); render(); toast('Datos actualizados'); return;
      case 'nuevo-visual': if (sinDatos()) return; S.vista = 'informe'; agregarVisual('columnaAgrupada'); return;
      case 'mas-visuales': return toast('En Power BI real, "Más objetos visuales" abre AppSource (visuales de la comunidad, como los del repositorio github.com/microsoft/PowerBI-visuals). En esta práctica están los visuales principales.', 7000);
      case 'cuadro-texto': S.vista = 'informe'; agregarVisual('texto', { texto: 'Título del informe', w: 30, h: 9, formato: { texto: { tam: 22, negrita: true } } }); return;
      case 'imagen': return main.querySelector('#pbImg').click();
      case 'nueva-pagina': S.paginas.push({ nombre: `Página ${S.paginas.length + 1}`, visuales: [], filtros: [] }); S.pagina = S.paginas.length - 1; S.sel = null; S.cruz = null; S.vista = 'informe'; guardar(); render(); return;
      case 'nueva-medida': if (sinDatos()) return; return barraFormula({ tipo: 'medida' });
      case 'editar-medida': return barraFormula({ tipo: 'medida', obj: S.medidas.find((m) => m.nombre === S.medidaSel) });
      case 'borrar-medida': { const m = S.medidas.find((x) => x.nombre === S.medidaSel); if (m && confirm(`¿Eliminar la medida [${m.nombre}]?`)) { S.medidas = S.medidas.filter((x) => x !== m); for (const v of todos()) for (const k in v.pozos) v.pozos[k] = v.pozos[k].filter((f) => f.medida !== m.nombre); S.medidaSel = null; S.cinta = 'inicio'; guardar(); pintar(); } return; }
      case 'medida-rapida': if (sinDatos()) return; return medidaRapida();
      case 'nueva-columna': if (sinDatos()) return; return barraFormula({ tipo: 'columna', tabla: (S.colSel && S.colSel.t) || S.tablaDatos || tablas()[0] });
      case 'borrar-columna': { const { t, c } = S.colSel; if (confirm(`¿Eliminar la columna calculada ${c}?`)) { S.tablas[t].calc = S.tablas[t].calc.filter((x) => x.nombre !== c); S.colSel = null; S.cinta = 'inicio'; cambioModelo(); guardar(); pintar(); } return; }
      case 'nueva-tabla': if (sinDatos()) return; return barraFormula({ tipo: 'tabla' });
      case 'relaciones': return dialogoRelaciones();
      case 'roles': if (sinDatos()) return; return dialogoRoles();
      case 'grupo-calculo': if (sinDatos()) return; return dialogoGrupoCalculo();
      case 'ver-como': if (sinDatos()) return; return dialogoVerComo();
      case 'dejar-ver-como': S.verComo = null; guardar(); render(); toast('Volviste a ver el informe con todos los datos.'); return;
      case 'ir-dax': S.vista = 'dax'; guardar(true); render(); return;
      case 'ir-tmdl': S.vista = 'tmdl'; guardar(true); render(); return;
      case 'publicar': {
        if (!todos().length) { toast('Agrega al menos un objeto visual antes de publicar.'); return; }
        if (window.PBIServicio) { window.PBIServicio.publicar(JSON.parse(foto()), S.nombreArchivo === 'Sin título' ? '' : S.nombreArchivo, (n) => { S.nombreArchivo = n; S.publicado = true; guardar(); pintar(); }); return; }
        const n = prompt('Publicar en Power BI. Nombre del informe:', S.nombreArchivo === 'Sin título' ? 'Mi informe' : S.nombreArchivo); if (!n) return;
        S.nombreArchivo = n; S.publicado = true; guardar(); pintar(); toast(`✓ "${n}" publicado en "Mi área de trabajo" de Power BI Service (simulado).`, 4500); return;
      }
      case 'reto': S.reto = !S.reto; guardar(true); pintar(); return;
      case 'reiniciar': if (confirm('¿Crear un informe nuevo? Se borran las tablas, el modelo, las medidas y los visuales.')) { Store.data.powerbi = S = NUEVO(); DATOS = {}; guardarDatos(); cambioModelo(); guardar(); pintar(); } return;
      case 'guardar-como': return guardarComo();
      case 'deshacer': return deshacer(-1);
      case 'rehacer': return deshacer(1);
      case 'tema-importar': return main.querySelector('#pbTema').click();
      case 'tema-exportar': { const p = paleta(); descargar(`${(PALETAS[S.tema] || { n: 'Personalizado' }).n}.json`, JSON.stringify({ name: (PALETAS[S.tema] || { n: S.temaCustom && S.temaCustom.name }).n, dataColors: p, background: '#FFFFFF', foreground: '#252423', tableAccent: p[0] }, null, 2)); return; }
      case 'cuadricula': S.cuadricula = !S.cuadricula; guardar(true); pintar(); return;
      case 'panel-filtros': case 'panel-vis': case 'panel-datos': { const k = { 'panel-filtros': 'filtros', 'panel-vis': 'vis', 'panel-datos': 'datos' }[a]; S.paneles[k] = !S.paneles[k]; guardar(true); pintar(); return; }
      case 'analizador': S.analizador = !S.analizador; guardar(true); pintar(); return;
      case 'doc-pbi': window.open('https://learn.microsoft.com/power-bi/', '_blank', 'noopener'); return;
      case 'doc-dax': window.open('https://learn.microsoft.com/dax/', '_blank', 'noopener'); return;
      case 'doc-m': window.open('https://learn.microsoft.com/powerquery-m/', '_blank', 'noopener'); return;
      default: if (window.PBIInforme) window.PBIInforme.accion(a, el); return;
    }
  }
  function descargar(nombre, texto, tipo = 'application/json') { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([texto], { type: tipo })); a.download = nombre; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }
  function guardarComo() {
    const claves = new Set(Object.values(S.tablas).map((t) => t.fuente.clave).filter(Boolean));
    const datos = Object.fromEntries(Object.entries(DATOS).filter(([k]) => claves.has(k)));
    descargar(`${S.nombreArchivo === 'Sin título' ? 'informe' : S.nombreArchivo}.pbia.json`, JSON.stringify({ formato: 'academia-powerbi', version: 2, informe: JSON.parse(foto()), datos }));
    toast('Informe descargado (.pbia.json). Ábrelo con Archivo → Abrir. Es el formato de la práctica: Power BI Desktop usa .pbix o un proyecto .pbip.', 6000);
  }
  function abrirArchivo(texto) {
    try {
      const o = JSON.parse(texto); if (o.formato !== 'academia-powerbi') throw new Error('No es un informe de esta práctica');
      Object.assign(DATOS, o.datos || {}); guardarDatos();
      Store.data.powerbi = S = migrar(o.informe); cambioModelo(); guardar(); pintar(); toast(`Abierto: ${S.nombreArchivo}`);
    } catch (e) { toast('No se pudo abrir: ' + e.message, 5000); }
  }
  function menuArchivo() {
    const m = modal(`<div class="pb-back"><div class="pb-back-l"><button data-cerrar-modal class="pb-back-x">←</button><button data-b="nuevo">${fl('document_add')} Nuevo</button><button data-b="abrir">${fl('folder_open')} Abrir</button><button data-b="guardar">${fl('save')} Guardar como</button><button data-b="tmdl">${fl('arrow_download')} Exportar el modelo (carpeta .pbip en TMDL)</button><button data-b="pdf">${fl('document')} Exportar a PDF</button><button data-b="publicar">${fl('cloud_arrow_up')} Publicar</button><button data-b="acerca">${fl('question_circle')} Acerca de</button></div><div class="pb-back-r"><h2>Archivo</h2><p class="pb-dim">Tu informe se guarda solo en este navegador. Para llevarlo a otra computadora, usa <b>Guardar como</b> (descarga un archivo .pbia.json) y luego <b>Abrir</b>.</p><p class="pb-dim"><b>Exportar el modelo (TMDL)</b> descarga la definición del modelo semántico en Tabular Model Definition Language, el mismo formato de texto que usa la carpeta <code>definition/</code> de un proyecto de Power BI (.pbip). Se puede abrir en VS Code y versionar con Git.</p></div></div>`, 'pb-modal-back');
    m.addEventListener('click', (e) => {
      const b = e.target.closest('[data-b]'); if (!b) return; m.parentElement.remove();
      const k = b.dataset.b;
      if (k === 'nuevo') accion('reiniciar'); else if (k === 'abrir') main.querySelector('#pbAbrir').click(); else if (k === 'guardar') guardarComo();
      else if (k === 'tmdl') exportarModeloTmdl();
      else if (k === 'pdf') { S.vista = 'informe'; render(); setTimeout(() => window.print(), 300); }
      else if (k === 'publicar') accion('publicar');
      else if (k === 'acerca') toast('Power BI Desktop de práctica de la Academia de Datos. No es un producto de Microsoft: reproduce su funcionamiento con la documentación pública (learn.microsoft.com), SQLite en el navegador y los íconos Fluent UI (MIT).', 8000);
    });
  }


  // carpeta del modelo semántico de un proyecto de Power BI (.pbip, formato TMDL) + script para la vista TMDL
  function exportarModeloTmdl() {
    construir();
    const base = (S.nombreArchivo && S.nombreArchivo !== 'Sin título' ? S.nombreArchivo : 'Informe').replace(/[^\w .-]+/g, '_');
    const dir = `${base}.SemanticModel/definition/`;
    const rel = S.rels.map((r) => [`relationship ${guid(r.de + r.cde + r.a + r.ca)}`, ...(r.activa ? [] : ['\tisActive: false']), ...(r.direccion === 'ambas' ? ['\tcrossFilteringBehavior: bothDirections'] : []), `\tfromColumn: ${nomTmdl(r.de)}.${nomTmdl(r.cde)}`, `\ttoColumn: ${nomTmdl(r.a)}.${nomTmdl(r.ca)}`, ''].join('\n'));
    const archivos = [
      [`${base}.SemanticModel/definition.pbism`, JSON.stringify({ version: '4.2', settings: {} }, null, 2)],
      [`${dir}database.tmdl`, 'database\n\tcompatibilityLevel: 1600\n'],
      [`${dir}model.tmdl`, `model Model\n\tculture: es-ES\n\tdefaultPowerBIDataSourceVersion: powerBI_V3\n\tsourceQueryCulture: es-AR\n\n${tablas().map((t) => `ref table ${nomTmdl(t)}`).join('\n')}\n${(S.roles || []).map((r) => `ref role ${nomTmdl(r.nombre)}`).join('\n')}\n`],
      ...(rel.length ? [[`${dir}relationships.tmdl`, rel.join('\n')]] : []),
      ...tablas().map((t) => [`${dir}tables/${t.replace(/[\\/:*?"<>|]/g, '_')}.tmdl`, tmdlTabla(t, '') + '\n']),
      ...(S.roles || []).map((r) => [`${dir}roles/${r.nombre.replace(/[\\/:*?"<>|]/g, '_')}.tmdl`, `role ${nomTmdl(r.nombre)}\n\tmodelPermission: read\n${[...new Set(r.reglas.map((g) => g.t))].map((t) => `\n\ttablePermission ${nomTmdl(t)} = ${daxRol(r, t)}`).join('\n')}\n`]),
      ['script_vista_TMDL.tmdl', `createOrReplace\n\n${tmdlModelo().split('\n').map((l) => (l ? '\t' + l : l)).join('\n')}\n`],
      ['LEEME.md', `# ${base}: modelo semántico exportado\n\nExportado desde el Power BI de práctica de la Academia de Datos, en TMDL (Tabular Model Definition Language), el formato de texto de los proyectos de Power BI (.pbip).\n\n## Cómo usarlo en Power BI Desktop\n\n1. Abre Power BI Desktop (gratis, Windows) y activa la vista TMDL (en versiones recientes ya viene activa).\n2. Carga tus datos con los mismos nombres de tabla (las particiones apuntan a los archivos de la práctica: cambia la ruta en Power Query si hace falta).\n3. En la vista TMDL pega **script_vista_TMDL.tmdl** y pulsa Aplicar: crea o reemplaza medidas, relaciones, roles y grupos de cálculo.\n\nLa carpeta **${base}.SemanticModel** sigue la estructura de un proyecto .pbip (definition/tables, relationships.tmdl, roles): sirve para versionar el modelo en Git y revisarlo en pull requests.\n`],
    ];
    if (!window.Generador || !window.Generador.zip) { descargar('model.tmdl', tmdlModelo(), 'text/plain'); return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(window.Generador.zip(archivos)); a.download = `${base}-modelo-tmdl.zip`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast(`Modelo exportado: ${tablas().length} tablas, ${S.medidas.length} medidas, ${S.rels.length} relaciones${(S.roles || []).length ? `, ${S.roles.length} roles` : ''}.`);
  }
  // ---------------------------------------------------------------- diálogos genéricos y obtener datos
  function modal(html, clase = '') {
    const prev = main.querySelector('.pb-modal-fondo'); if (prev) prev.remove();
    const f = document.createElement('div'); f.className = 'pb-modal-fondo'; f.innerHTML = `<div class="pb-modal ${clase}">${html}</div>`;
    main.querySelector('#pbi').appendChild(f);
    f.addEventListener('click', (e) => { if (e.target === f || e.target.closest('[data-cerrar-modal]')) f.remove(); });
    return f.querySelector('.pb-modal');
  }
  function pedir(titulo, campos) { // formulario simple: devuelve una promesa con los valores
    return new Promise((ok) => {
      const m = modal(`<div class="pb-m-cab">${esc(titulo)}<button data-cerrar-modal>✕</button></div><div class="pb-form">${campos.map((c, i) => `<label>${esc(c.n)}${c.opts ? `<select data-i="${i}">${c.opts.map((o) => { const [v, l] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(v)}" ${String(c.v ?? '') === String(v) ? 'selected' : ''}>${esc(l)}</option>`; }).join('')}</select>` : c.area ? `<textarea data-i="${i}" rows="4">${esc(c.v ?? '')}</textarea>` : `<input data-i="${i}" type="${c.tipo || 'text'}" value="${esc(c.v ?? '')}" placeholder="${esc(c.ph || '')}">`}${c.ayuda ? `<small>${c.ayuda}</small>` : ''}</label>`).join('')}</div><div class="pb-m-pie"><span class="spacer"></span><button class="pb-btn pb-btn-am" data-ok>Aceptar</button><button class="pb-btn" data-cerrar-modal>Cancelar</button></div>`, 'ancho');
      const leer = () => campos.map((_, i) => m.querySelector(`[data-i="${i}"]`).value);
      m.querySelector('[data-ok]').addEventListener('click', () => { const v = leer(); m.parentElement.remove(); ok(v); });
      m.parentElement.addEventListener('click', (e) => { if (e.target === m.parentElement || e.target.closest('[data-cerrar-modal]')) ok(null); });
      const p = m.querySelector('[data-i="0"]'); if (p) p.focus();
    });
  }
  function dialogoObtener() {
    const m = modal(`<div class="pb-m-cab">Obtener datos<button data-cerrar-modal>✕</button></div><div class="pb-obt"><div class="pb-obt-l"><b>Todo</b><span>Archivo</span><span>Base de datos</span><span>Otros</span></div><div class="pb-obt-r">
      <div class="pb-obt-i" data-o="excel"><b class="pb-x">X</b> Libro de Excel <small>.xlsx, .xls</small></div>
      <div class="pb-obt-i" data-o="csv">${fl('document_text')} Texto/CSV <small>.csv, .txt, .tsv</small></div>
      <div class="pb-obt-i" data-o="json">${fl('braces')} JSON <small>.json</small></div>
      <div class="pb-obt-i" data-o="curso">${fl('database')} Base de datos del curso (SQLite) <small>99 tablas de 13 empresas</small></div>
      <div class="pb-obt-i" data-o="snowflake">${fl('database')} Snowflake <small>las tablas de tu Snowflake de práctica</small></div>
      <div class="pb-obt-i" data-o="bigquery">${fl('database')} Google BigQuery <small>los datasets de tu BigQuery de práctica</small></div>
      <div class="pb-obt-i" data-o="databricks">${fl('database')} Azure Databricks <small>tablas de Unity Catalog de tu workspace de práctica</small></div>
      <div class="pb-obt-i" data-o="fabric">${fl('database')} Lakehouses y warehouses de Fabric <small>OneLake de tu Fabric de práctica</small></div>
      <div class="pb-obt-i" data-o="web">${fl('globe')} Web <small>una URL a un CSV o JSON</small></div>
      <div class="pb-obt-i" data-o="escribir">${fl('table_edit')} Escribir datos <small>una tabla a mano</small></div>
      <div class="pb-obt-i" data-o="pegar">${fl('clipboard_paste')} Pegar desde Excel o Google Sheets</div>
      <div class="pb-obt-i" data-o="blanca">${fl('table_add')} Consulta en blanco (tabla calculada DAX)</div></div></div><div class="pb-m-pie"><button class="pb-btn" data-cerrar-modal>Cancelar</button></div>`, 'ancho');
    m.addEventListener('click', async (e) => {
      const o = e.target.closest('[data-o]'); if (!o) return;
      const t = o.dataset.o; m.parentElement.remove();
      if (t === 'excel' || t === 'csv' || t === 'json') main.querySelector('#pbFile').click();
      else if (t === 'curso') navegadorCurso();
      else if (t === 'escribir') escribirDatos();
      else if (t === 'snowflake' || t === 'databricks' || t === 'fabric' || t === 'bigquery') conectorReplica(t);
      else if (t === 'pegar') pegarDatos();
      else if (t === 'blanca') barraFormula({ tipo: 'tabla' });
      else if (t === 'web') {
        const r = await pedir('Desde la web', [{ n: 'URL de un archivo CSV o JSON (el sitio debe permitir CORS)', v: 'https://raw.githubusercontent.com/datasets/covid-19/main/data/countries-aggregated.csv' }]); if (!r) return; const url = r[0];
        try { const res = await fetch(url); if (!res.ok) throw new Error(`HTTP ${res.status}`); const txt = await res.text(); const nombre = (url.split('/').pop() || 'web').replace(/\?.*$/, '').replace(/\.[^.]+$/, '') || 'web'; const ts = /\.json(\?|$)/i.test(url) || /^\s*[[{]/.test(txt) ? D().deJson(JSON.parse(txt)) : [{ nombre, filas: D().parseCsv(txt) }]; navegador(ts.map((x) => ({ ...x, tipo: 'archivo', archivo: url })), url); } catch (err) { toast('No se pudo descargar: ' + err.message + '. Muchas páginas no permiten que otra web lea sus datos (CORS): descárgalo y usa Texto/CSV.', 6000); }
      }
    });
  }
  function navegador(lista, origen) {
    let elegida = 0;
    const m = modal(`<div class="pb-m-cab">Navegador<button data-cerrar-modal>✕</button></div><div class="pb-nav"><div class="pb-nav-l"><input placeholder="Buscar" data-nb><div class="pb-nav-lista"></div></div><div class="pb-nav-r"><div class="pb-nav-t"></div><div class="pb-tabla pb-prev"></div></div></div><div class="pb-m-pie"><span class="pb-dim small">${esc(origen)}</span><span class="spacer"></span><button class="pb-btn pb-btn-am" data-cargar>Cargar</button><button class="pb-btn" data-transf>Transformar datos</button><button class="pb-btn" data-cerrar-modal>Cancelar</button></div>`, 'grande');
    const marcadas = new Set(lista.length === 1 ? [0] : []);
    const pintarL = () => { const qt = (m.querySelector('[data-nb]').value || '').toLowerCase(); m.querySelector('.pb-nav-lista').innerHTML = lista.map((t, i) => (!qt || t.nombre.toLowerCase().includes(qt) ? `<label class="${i === elegida ? 'on' : ''}" data-i="${i}"><input type="checkbox" data-c="${i}" ${marcadas.has(i) ? 'checked' : ''}> ${fl('table')} ${esc(t.nombre)}${t.grupo ? ` <small>${esc(t.grupo)}</small>` : ''}</label>` : '')).join(''); };
    const prev = () => { const t = lista[elegida]; if (!t) return; if (!t.filas && t.previa) { m.querySelector('.pb-nav-t').textContent = t.nombre; m.querySelector('.pb-prev').innerHTML = '<p class="pb-dim" style="padding:12px">Cargando vista previa…</p>'; t.previa().then((f) => { t.filas = f; if (lista[elegida] === t && m.isConnected) prev(); }, (e) => { m.querySelector('.pb-prev').innerHTML = `<p class="pb-dim" style="padding:12px">${esc(e.message)}</p>`; }); return; } const filas = t.filas || []; m.querySelector('.pb-nav-t').textContent = t.nombre; const cab = t.cols || filas[0] || []; const cuerpo = t.cols ? filas : filas.slice(1); m.querySelector('.pb-prev').innerHTML = `<table><thead><tr>${cab.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${cuerpo.slice(0, 40).map((f) => `<tr>${f.map((x) => `<td>${esc(x ?? 'null')}</td>`).join('')}</tr>`).join('')}</tbody></table>`; };
    pintarL(); prev();
    m.querySelector('[data-nb]').addEventListener('input', pintarL);
    const listaEl = m.querySelector('.pb-nav-lista');
    listaEl.addEventListener('click', (e) => { const l = e.target.closest('[data-i]'); if (!l || Number(l.dataset.i) === elegida) return; elegida = Number(l.dataset.i); listaEl.querySelectorAll('[data-i]').forEach((x) => x.classList.toggle('on', x === l)); prev(); });
    listaEl.addEventListener('change', (e) => { const cb = e.target.closest('[data-c]'); if (cb) cb.checked ? marcadas.add(Number(cb.dataset.c)) : marcadas.delete(Number(cb.dataset.c)); });
    const cargar = async (transformar) => {
      if (!marcadas.size) { toast('Marca al menos una tabla.'); return; }
      const nuevas = [];
      for (const i of marcadas) {
        const t = lista[i];
        if (t.todas) { try { t.filas = await t.todas(); } catch (e) { toast(`No se pudo cargar ${t.nombre}: ${e.message}`, 7000); return; } }
        if (t.tipo === 'curso') nuevas.push(registrarTabla(t.nombre, { tipo: 'curso', ref: t.ref }, [{ tipo: 'origen', m: '= Sqlite.Database(File.Contents("curso.db"))' }, { tipo: 'navegacion', ref: t.ref }]));
        else {
          const clave = 'd' + Date.now().toString(36) + i; DATOS[clave] = { filas: t.filas };
          const ar = t.archivo || '';
          const m0 = t.m ? t.m : /\.xls/i.test(ar) ? `= Excel.Workbook(File.Contents("${ar}"), null, true)` : /\.json/i.test(ar) ? `= Json.Document(File.Contents("${ar}"))` : ar === 'escritos' ? '= Table.FromRows(Json.Document(Binary.Decompress(Binary.FromText("…"))))' : ar === 'portapapeles' ? '= Table.FromRows(Clipboard)' : /^https?:/.test(ar) ? `= Csv.Document(Web.Contents("${ar}"), [Delimiter=",", Encoding=65001])` : `= Csv.Document(File.Contents("${ar}"), [Delimiter=",", Encoding=65001, QuoteStyle=QuoteStyle.None])`;
          const pasos = [{ tipo: 'origen', m: m0 }]; if (/\.xls/i.test(ar)) pasos.push({ tipo: 'navegacion', m: `= Origen{[Item="${t.nombre}",Kind="Sheet"]}[Data]` });
          pasos.push({ tipo: 'encabezados' });
          nuevas.push(registrarTabla(t.tabla || t.nombre, { tipo: 'archivo', clave, archivo: ar }, pasos));
        }
      }
      guardarDatos(); m.parentElement.remove();
      const rels = autodetectar(); guardar();
      toast(rels.length ? `Cargadas ${nuevas.length} tabla(s). Relaciones detectadas: ${rels.join(' · ')}` : `Cargadas ${nuevas.length} tabla(s) en el modelo.`, rels.length ? 6000 : 3000);
      if (transformar) powerQuery(nuevas[0]); else render();
    };
    m.querySelector('[data-cargar]').addEventListener('click', () => cargar(false));
    m.querySelector('[data-transf]').addEventListener('click', () => cargar(true));
  }
  // Conectores a las otras réplicas del curso: las tablas se importan (modo Import), como en Power BI real.
  async function conectorReplica(cual) {
    const cruce = (k) => { Store.data.cruces = Store.data.cruces || {}; Store.data.cruces[k] = Date.now(); Store.save(); };
    const aFilas = (cols, filas) => [cols, ...filas];
    try {
      if (cual === 'snowflake') {
        toast('Conectando con Snowflake…');
        if (!window.SnowflakeMotor && window.__cargarGrupo) await window.__cargarGrupo('snowflake');
        const M = window.SnowflakeMotor; M.conectar(Store); await M.init();
        const s = M.st(); const bases = (await M.bases()).filter((b) => b !== 'SNOWFLAKE_SAMPLE_DATA');
        const propia = bases.find((b) => b !== 'TIENDA_ANDINA') || 'TIENDA_ANDINA';
        const r = await pedir('Snowflake', [{ n: 'Servidor', v: 'practica01.snowflakecomputing.com' }, { n: `Warehouse (${Object.keys(s.warehouses).join(', ')})`, v: s.ctx.wh || Object.keys(s.warehouses)[0] || '' }, { n: `Base de datos (${bases.join(', ')})`, v: propia }]); if (!r) return;
        const wh = r[1].trim().toUpperCase(), db = r[2].trim().toUpperCase();
        if (!s.warehouses[wh]) { toast(`El warehouse ${wh || '(vacío)'} no existe en tu Snowflake de práctica.`, 6000); return; }
        if (!bases.includes(db)) { toast(`La base ${db} no existe en tu Snowflake de práctica.`, 6000); return; }
        const lista = [];
        for (const e of await M.esquemas(db)) for (const t of await M.tablas(db, e)) {
          const ref = `${db}.${e}.${t.nombre}`;
          lista.push({ nombre: `${e}.${t.nombre}`, tabla: t.nombre.toLowerCase(), grupo: db, tipo: 'archivo', archivo: 'snowflake', m: `= Snowflake.Databases("${r[0]}", "${wh}"){[Name="${db}"]}[Data]{[Name="${e}"]}[Data]{[Name="${t.nombre}"]}[Data]`,
            previa: async () => { const x = await M.leer(`SELECT * FROM ${ref} LIMIT 40`); return aFilas(x.columns, x.values); },
            todas: async () => { const rs = await M.ejecutar(`USE WAREHOUSE ${wh}; SELECT * FROM ${ref}`); const u = rs[rs.length - 1]; if (u.error) throw new Error(u.error.message.split('\n')[0]); cruce('pbiSnowflake'); return aFilas(u.r.columns, u.r.values); } });
        }
        if (!lista.length) { toast(`La base ${db} no tiene tablas todavía.`, 5000); return; }
        navegador(lista, `Snowflake · ${r[0]} · ${db} (se importa con el warehouse ${wh})`);
      } else if (cual === 'bigquery') {
        toast('Conectando con BigQuery…');
        if (!window.BigQueryMotor && window.__cargarGrupo) await window.__cargarGrupo('bigquery');
        const B = window.BigQueryMotor; B.conectar(Store); await B.init();
        const lista = [];
        for (const d of await B.datasets()) for (const t of await B.tablas(d)) {
          lista.push({ nombre: `${d}.${t.nombre}`, tabla: t.nombre, grupo: B.PROYECTO, tipo: 'archivo', archivo: 'bigquery', m: `= GoogleBigQuery.Database(){[Name="${B.PROYECTO}"]}[Data]{[Name="${d}",Kind="Schema"]}[Data]{[Name="${t.nombre}",Kind="Table"]}[Data]`,
            previa: async () => { const x = await B.vistaPrevia(d, t.nombre, 40); return aFilas(x.columns, x.values); },
            todas: async () => { const rs = await B.ejecutar(`SELECT * FROM \`${B.PROYECTO}.${d}.${t.nombre}\``, { usuario: 'powerbi@tienda-andina.example', sinCache: true }); const u = rs[rs.length - 1]; if (u.error) throw new Error(u.error.message); cruce('pbiBigQuery'); toast(`BigQuery procesó ${B.fmtBytes(u.job.procesado)} para importar ${t.nombre}`, 5000); return aFilas(u.r.columns, u.r.values); } });
        }
        navegador(lista, `Google BigQuery · ${B.PROYECTO} (importar hace un SELECT * de la tabla: se cobra entera)`);
      } else if (cual === 'databricks') {
        toast('Conectando con Azure Databricks…');
        if (!window.DBSQL) { toast('El Databricks de práctica no está disponible.'); return; }
        const r = await pedir('Azure Databricks', [{ n: 'Nombre de host del servidor', v: 'adb-1234567890123456.7.azuredatabricks.net' }, { n: 'Ruta HTTP (la del SQL warehouse)', v: '/sql/1.0/warehouses/abc123def456' }]); if (!r) return;
        await window.DBSQL.init({ Store });
        const ts = await window.DBSQL.tablasAlumno();
        if (!ts.length) { toast('Todavía no creaste tablas en tu Databricks de práctica. Crea una (CREATE TABLE … AS SELECT en el editor SQL o un notebook) y vuelve.', 7000); return; }
        navegador(ts.map((t) => { const p = t.nombre.split('.'); return { nombre: `${p[1]}.${p[2]}`, tabla: p[2], grupo: p[0], tipo: 'archivo', archivo: 'databricks', m: `= Databricks.Catalogs("${r[0]}", "${r[1]}"){[Name="${p[0]}",Kind="Database"]}[Data]{[Name="${p[1]}",Kind="Schema"]}[Data]{[Name="${p[2]}",Kind="Table"]}[Data]`, filas: aFilas(t.cols, t.filas.slice(0, 40)), todas: async () => { cruce('pbiDatabricks'); return aFilas(t.cols, t.filas); } }; }), `Azure Databricks · ${r[0]} · Unity Catalog`);
      } else {
        const F = Store.data.fabric; const lista = [];
        if (F) { if (!window.FabricPractica && window.__cargarGrupo) await window.__cargarGrupo('fabric'); }
        const dt = window.FabricPractica && window.FabricPractica._.datosTabla;
        if (F && dt) for (const [wid, W] of Object.entries(F.ws)) for (const it of Object.values(W.items)) {
          if (it.tipo !== 'lakehouse' && it.tipo !== 'warehouse') continue;
          for (const [n, t] of Object.entries(it.tablas || {})) { const d = dt(t); const cols = (d.cols || []).map((c) => (typeof c === 'string' ? c : c.n)); lista.push({ nombre: `${it.nombre}.${n}`, tabla: n, grupo: W.nombre, tipo: 'archivo', archivo: 'fabric', m: it.tipo === 'lakehouse' ? `= Lakehouse.Contents(null){[workspaceId="${wid}"]}[Data]{[lakehouseId="${it.id}"]}[Data]{[Id="${n}",ItemKind="Table"]}[Data]` : `= Fabric.Warehouse(null){[workspaceId="${wid}"]}[Data]{[warehouseId="${it.id}"]}[Data]{[Schema="dbo",Item="${n}"]}[Data]`, filas: aFilas(cols, d.filas.slice(0, 40)), todas: async () => { cruce('pbiFabric'); return aFilas(cols, d.filas); } }); }
        }
        if (!lista.length) { toast('Todavía no hay tablas en ningún lakehouse o warehouse de tu Fabric de práctica. Crea una (por ejemplo, con Load to Tables) y vuelve.', 7000); return; }
        navegador(lista, 'Microsoft Fabric · OneLake');
      }
    } catch (e) { toast('No se pudo conectar: ' + e.message, 7000); }
  }
  function navegadorCurso() {
    const casos = (window.DataGen && window.DataGen.CASOS) || [];
    const grupoDe = {}; if (window.Bases) for (const c of casos) { const b = window.Bases.infoBase(c.id); if (b) b.orden.forEach((t) => { grupoDe[t] = `${c.icono} ${c.nombre}`; }); }
    const nombres = Object.keys(SQLc.tables).sort((a, b) => (grupoDe[a] || 'zz').localeCompare(grupoDe[b] || 'zz') || a.localeCompare(b));
    navegador(nombres.map((n) => ({ nombre: n, ref: n, tipo: 'curso', grupo: grupoDe[n] || '', cols: SQLc.tables[n].columns, filas: SQLc.tables[n].rows.slice(0, 40) })), 'curso.db (SQLite del curso)');
  }
  function escribirDatos() {
    const m = modal(`<div class="pb-m-cab">Crear tabla<button data-cerrar-modal>✕</button></div><div class="pb-escr"><p class="pb-dim">Escribe o pega (Ctrl+V) un rango de Excel. La primera fila son los encabezados.</p><div class="pb-tabla"><table data-grid><thead><tr><th contenteditable>Columna1</th><th contenteditable>Columna2</th></tr></thead><tbody><tr><td contenteditable></td><td contenteditable></td></tr><tr><td contenteditable></td><td contenteditable></td></tr></tbody></table></div><div class="row"><button class="pb-btn" data-fila>+ fila</button><button class="pb-btn" data-col>+ columna</button></div><label class="pb-campo-txt">Nombre <input data-nombre value="Tabla"></label></div><div class="pb-m-pie"><span class="spacer"></span><button class="pb-btn pb-btn-am" data-ok>Cargar</button><button class="pb-btn" data-cerrar-modal>Cancelar</button></div>`, 'ancho');
    const g = m.querySelector('[data-grid]');
    m.querySelector('[data-fila]').addEventListener('click', () => { const n = g.tHead.rows[0].cells.length; g.tBodies[0].insertAdjacentHTML('beforeend', `<tr>${'<td contenteditable></td>'.repeat(n)}</tr>`); });
    m.querySelector('[data-col]').addEventListener('click', () => { const n = g.tHead.rows[0].cells.length + 1; g.tHead.rows[0].insertAdjacentHTML('beforeend', `<th contenteditable>Columna${n}</th>`); [...g.tBodies[0].rows].forEach((r) => r.insertAdjacentHTML('beforeend', '<td contenteditable></td>')); });
    g.addEventListener('paste', (e) => { const txt = (e.clipboardData || window.clipboardData).getData('text'); if (!txt.includes('\t') && !txt.includes('\n')) return; e.preventDefault(); const filas = txt.replace(/\r/g, '').split('\n').filter(Boolean).map((l) => l.split('\t')); g.tHead.rows[0].innerHTML = filas[0].map((c) => `<th contenteditable>${esc(c)}</th>`).join(''); g.tBodies[0].innerHTML = filas.slice(1).map((f) => `<tr>${f.map((c) => `<td contenteditable>${esc(c)}</td>`).join('')}</tr>`).join(''); });
    m.querySelector('[data-ok]').addEventListener('click', () => {
      const filas = [[...g.tHead.rows[0].cells].map((c) => c.textContent.trim()), ...[...g.tBodies[0].rows].map((r) => [...r.cells].map((c) => c.textContent.trim())).filter((f) => f.some((x) => x))];
      if (filas.length < 2) { toast('Escribe al menos una fila de datos.'); return; }
      const clave = 'd' + Date.now().toString(36); DATOS[clave] = { filas }; guardarDatos();
      registrarTabla(m.querySelector('[data-nombre]').value || 'Tabla', { tipo: 'archivo', clave, archivo: 'escritos' }, [{ tipo: 'origen', m: '= Table.FromRows(Json.Document(Binary.Decompress(Binary.FromText("…"))))' }, { tipo: 'encabezados' }]);
      autodetectar(); guardar(); m.parentElement.remove(); render();
    });
  }
  function pegarDatos() {
    const m = modal(`<div class="pb-m-cab">Pegar datos<button data-cerrar-modal>✕</button></div><div class="pb-escr"><p class="pb-dim">Copia un rango en Excel o Google Sheets (con los encabezados en la primera fila) y pégalo aquí.</p><textarea data-pegar rows="10" placeholder="Ctrl+V"></textarea><label class="pb-campo-txt">Nombre <input data-nombre value="Datos pegados"></label></div><div class="pb-m-pie"><span class="spacer"></span><button class="pb-btn pb-btn-am" data-ok>Cargar</button><button class="pb-btn" data-cerrar-modal>Cancelar</button></div>`, 'ancho');
    m.querySelector('[data-ok]').addEventListener('click', () => {
      const txt = m.querySelector('[data-pegar]').value; const filas = txt.includes('\t') ? txt.replace(/\r/g, '').split('\n').filter((l) => l.trim()).map((l) => l.split('\t')) : D().parseCsv(txt);
      if (filas.length < 2) { toast('Pega al menos un encabezado y una fila.'); return; }
      const clave = 'd' + Date.now().toString(36); DATOS[clave] = { filas }; guardarDatos();
      registrarTabla(m.querySelector('[data-nombre]').value, { tipo: 'archivo', clave, archivo: 'portapapeles' }, [{ tipo: 'origen', m: '= Table.FromRows(Clipboard)' }, { tipo: 'encabezados' }]);
      autodetectar(); guardar(); m.parentElement.remove(); render();
    });
  }

  // ---------------------------------------------------------------- Power Query
  function powerQuery(inicial) {
    const consultas = () => tablas().filter((n) => !['dax', 'calcgroup'].includes(S.tablas[n].fuente.tipo));
    let actual = inicial && S.tablas[inicial] && S.tablas[inicial].fuente.tipo !== 'dax' ? inicial : consultas()[0], pasoSel = null, pest = 'inicio', colSelPQ = null;
    if (!actual) { toast('No hay consultas de Power Query (las tablas calculadas con DAX no pasan por Power Query).'); return; }
    const m = modal(`<div class="pq"><div class="pq-titulo"><span class="pq-logo">${fl('table')}</span>Editor de Power Query<span class="spacer"></span><button data-cerrar-pq title="Cerrar">✕</button></div>
      <div class="pq-tabs"><span class="pq-archivo" data-pq="aplicar">Archivo</span>${[['inicio', 'Inicio'], ['transformar', 'Transformar'], ['agregar', 'Agregar columna'], ['vista', 'Vista']].map(([k, n]) => `<span data-pest="${k}">${n}</span>`).join('')}</div>
      <div class="pq-cinta"></div>
      <div class="pq-formula"><span>fx</span><input readonly></div>
      <div class="pq-cuerpo"><div class="pq-consultas"><div class="pq-t">Consultas [${consultas().length}]</div><div class="pq-lista"></div></div><div class="pq-centro"><div class="pq-grid pb-tabla"></div></div><div class="pq-config"><div class="pq-t">Configuración de la consulta</div><div class="pq-sub">PROPIEDADES</div><label>Nombre<input data-pq-nombre></label><div class="pq-sub">PASOS APLICADOS</div><div class="pq-pasos"></div></div></div>
      <div class="pq-estado"></div></div>`, 'pq-modal');
    const B = (k, ico, txt) => `<button class="pb-cb grande" data-pq="${k}"><span class="pb-cb-ic">${ico}</span><span>${txt}</span></button>`;
    const sep = '<i></i>';
    const CINTAS = {
      inicio: B('aplicar', fl('checkmark'), 'Cerrar y<br>aplicar') + sep + B('elegir', fl('table_switch'), 'Elegir<br>columnas') + B('quitarCols', fl('table_dismiss'), 'Quitar<br>columnas') + sep + B('mantenerArriba', fl('arrow_up'), 'Mantener filas<br>superiores') + B('quitarArriba', fl('arrow_down'), 'Quitar filas<br>superiores') + B('duplicados', fl('table_dismiss'), 'Quitar<br>duplicados') + B('vacios', fl('filter'), 'Quitar filas<br>vacías') + sep + B('dividir', fl('table_column_top_bottom'), 'Dividir<br>columna') + B('agrupar', fl('data_bar_horizontal'), 'Agrupar<br>por') + B('encabezados', fl('arrow_up'), 'Usar la primera fila<br>como encabezado') + sep + B('combinar', fl('link'), 'Combinar<br>consultas') + B('anexar', fl('table_add'), 'Anexar<br>consultas'),
      transformar: B('agrupar', fl('data_bar_horizontal'), 'Agrupar<br>por') + B('encabezados', fl('arrow_up'), 'Usar la primera fila<br>como encabezado') + sep + B('detectar', fl('search'), 'Detectar tipo<br>de datos') + B('tipo', fl('table_edit'), 'Tipo de<br>datos') + B('renombrar', fl('textbox'), 'Cambiar<br>nombre') + B('reemplazar', fl('arrow_sync'), 'Reemplazar<br>valores') + B('rellenar', fl('arrow_down'), 'Rellenar<br>hacia abajo') + sep + B('anular', fl('table_switch'), 'Anular dinamización<br>de columnas') + B('anularOtras', fl('table_switch'), 'Anular dinamización<br>de otras columnas') + sep + B('may', fl('text_field'), 'MAYÚSCULAS') + B('min', fl('text_field'), 'minúsculas') + B('recortar', fl('text_field'), 'Recortar') + B('nombre', fl('text_field'), 'Poner en<br>mayúsculas cada palabra'),
      agregar: B('personalizada', fl('code'), 'Columna<br>personalizada') + B('condicional', fl('flash'), 'Columna<br>condicional') + B('indice', fl('table_column_top_bottom'), 'Columna<br>de índice') + B('duplicar', fl('table_add'), 'Duplicar<br>columna'),
      vista: B('avanzado', fl('code'), 'Editor<br>avanzado') + B('perfil', fl('data_bar_vertical'), `Perfil de<br>columna`),
    };
    function pintarPQ() {
      const t = S.tablas[actual], n = pasoSel === null ? t.pasos.length : pasoSel + 1;
      let r, error = null; try { for (const k of Object.keys(cacheConsultas)) delete cacheConsultas[k]; r = D().aplicar(crudo(actual), t.pasos.slice(0, n), (o) => resolverConsulta(o)); } catch (e) { error = e.message; r = { cols: [], rows: [] }; }
      m.querySelectorAll('[data-pest]').forEach((x) => x.classList.toggle('on', x.dataset.pest === pest));
      m.querySelector('.pq-cinta').innerHTML = CINTAS[pest];
      m.querySelector('.pq-lista').innerHTML = consultas().map((x) => `<div class="pq-q ${x === actual ? 'on' : ''}" data-q="${esc(x)}">${fl('table')} ${esc(x)}</div>`).join('');
      m.querySelector('[data-pq-nombre]').value = actual;
      m.querySelector('.pq-pasos').innerHTML = t.pasos.map((p, i) => `<div class="pq-paso ${i === n - 1 ? 'on' : ''}" data-paso="${i}"><span>${esc(D().nombrePaso(p))}</span>${i > 0 ? `<button data-borrar-paso="${i}" title="Eliminar paso">✕</button>` : ''}</div>`).join('');
      const pasoV = t.pasos[n - 1]; m.querySelector('.pq-formula input').value = pasoV ? D().formulaM(pasoV, n > 1 ? D().nombrePaso(t.pasos[n - 2]) : 'Origen') : '';
      const icoT = { num: '1.2', int: '1²3', texto: 'ABC', fecha: '📅', bool: '✓✗' };
      if (error) { m.querySelector('.pq-grid').innerHTML = `<div class="pq-error"><b>Expression.Error:</b> ${esc(error)}<br><small>Elimina o corrige el último paso.</small></div>`; }
      else {
        const perfil = S.pqPerfil ? `<tr class="pq-perfil"><td class="pq-n"></td>${r.cols.map((c, j) => { const vals = r.rows.slice(0, 1000).map((f) => f[j]); const vacios = vals.filter((x) => x === null || x === '').length; const dist = new Set(vals.map(String)).size; return `<td><div class="pq-cal"><i style="width:${100 - (vacios / (vals.length || 1)) * 100}%"></i></div><small>Válido ${(100 - (vacios / (vals.length || 1)) * 100).toFixed(0)} % · Vacío ${((vacios / (vals.length || 1)) * 100).toFixed(0)} %</small><small>${dist} distintos</small></td>`; }).join('')}</tr>` : '';
        m.querySelector('.pq-grid').innerHTML = `<table><thead><tr><th class="pq-n"></th>${r.cols.map((c) => `<th data-col="${esc(c.n)}" class="${colSelPQ === c.n ? 'sel' : ''}"><span class="pq-tipo" data-tipo-col="${esc(c.n)}" title="${TIPO_N[c.t]}">${icoT[c.t] || 'ABC'}</span>${esc(c.n)} <span class="pq-flecha" data-menu-col="${esc(c.n)}">▾</span></th>`).join('')}</tr>${perfil}</thead><tbody>${r.rows.slice(0, 200).map((f, i) => `<tr><td class="pq-n">${i + 1}</td>${f.map((x) => `<td class="${x === null || x === '' ? 'pq-null' : typeof x === 'number' ? 'num' : ''}">${x === null ? 'null' : esc(x)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
      }
      m.querySelector('.pq-estado').textContent = `${r.cols.length} COLUMNAS, ${r.rows.length.toLocaleString('es')} FILAS · Generación de perfiles de columnas basada en las 1000 primeras filas${colSelPQ ? ` · Columna seleccionada: ${colSelPQ}` : ''}`;
      m._r = r;
    }
    const agregarPaso = (p) => { const t = S.tablas[actual]; if (pasoSel !== null && pasoSel < t.pasos.length - 1) { if (!confirm('¿Insertar este paso aquí? Los pasos posteriores pueden fallar si dependen de lo que cambia.')) return; t.pasos.splice(pasoSel + 1, 0, p); pasoSel++; } else { t.pasos.push(p); pasoSel = null; } cambioModelo(); guardar(); pintarPQ(); };
    const cols = () => (m._r ? m._r.cols.map((c) => c.n) : []);
    const necesitaCol = () => { if (!colSelPQ) { toast('Primero haz clic en el encabezado de una columna.'); return null; } return colSelPQ; };
    async function hacer(a) {
      const c0 = colSelPQ;
      switch (a) {
        case 'aplicar': cerrar(); return;
        case 'encabezados': return agregarPaso({ tipo: 'encabezados' });
        case 'duplicados': return agregarPaso({ tipo: 'duplicados', cols: c0 ? [c0] : [] });
        case 'vacios': { const c = c0 || cols()[0]; if (c) agregarPaso({ tipo: 'filtrar', col: c, op: 'novacio' }); return; }
        case 'elegir': { const r = await elegirCols('Elegir columnas', cols(), cols()); if (r) agregarPaso({ tipo: 'elegir', cols: r }); return; }
        case 'quitarCols': { if (c0) return agregarPaso({ tipo: 'quitar', cols: [c0] }); const r = await elegirCols('Quitar columnas', cols(), []); if (r && r.length) agregarPaso({ tipo: 'quitar', cols: r }); return; }
        case 'mantenerArriba': case 'quitarArriba': { const r = await pedir(a === 'mantenerArriba' ? 'Mantener filas superiores' : 'Quitar filas superiores', [{ n: 'Número de filas', v: 10, tipo: 'number' }]); if (r && Number(r[0]) > 0) agregarPaso({ tipo: a, n: Number(r[0]) }); return; }
        case 'dividir': { const c = necesitaCol(); if (!c) return; const r = await pedir('Dividir columna por delimitador', [{ n: 'Delimitador', v: ',', ayuda: 'Por ejemplo: , ; - | o un espacio' }]); if (r && r[0] !== '') agregarPaso({ tipo: 'dividir', col: c, delim: r[0] }); return; }
        case 'agrupar': return dialogoAgrupar();
        case 'combinar': return dialogoCombinar();
        case 'anexar': { const otras = consultas().filter((x) => x !== actual); if (!otras.length) { toast('Necesitas otra consulta para anexar.'); return; } const r = await pedir('Anexar consultas', [{ n: 'Tabla que se anexa (se agregan sus filas debajo)', opts: otras }]); if (r) agregarPaso({ tipo: 'anexar', con: r[0] }); return; }
        case 'detectar': { const r = m._r; if (!r) return; const idx = colSelPQ ? [r.cols.findIndex((c) => c.n === colSelPQ)] : r.cols.map((_, i) => i); const mapa = {}; for (const i of idx) if (i >= 0) mapa[r.cols[i].n] = D().detectarTipo(r.rows.slice(0, 300).map((f) => f[i])); agregarPaso({ tipo: 'tipos', mapa }); toast(`Tipo detectado ${colSelPQ ? `para ${colSelPQ}` : 'para todas las columnas'}: Power Query mira las primeras filas y elige número entero, decimal, fecha o texto.`, 5000); return; }
        case 'tipo': { const c = necesitaCol(); if (!c) return; const r = await pedir(`Tipo de datos de ${c}`, [{ n: 'Tipo', opts: Object.entries(TIPO_N) }]); if (r) agregarPaso({ tipo: 'tipos', mapa: { [c]: r[0] } }); return; }
        case 'renombrar': { const c = necesitaCol(); if (!c) return; const r = await pedir('Cambiar nombre', [{ n: 'Nuevo nombre', v: c }]); if (r && r[0].trim() && r[0] !== c) agregarPaso({ tipo: 'renombrar', col: c, a: r[0].trim() }); return; }
        case 'reemplazar': { const c = necesitaCol(); if (!c) return; const r = await pedir('Reemplazar valores', [{ n: 'Valor que se busca' }, { n: 'Reemplazar con' }]); if (r) agregarPaso({ tipo: 'reemplazar', col: c, de: r[0], a: r[1] }); return; }
        case 'rellenar': { const c = necesitaCol(); if (c) agregarPaso({ tipo: 'rellenar', col: c, dir: 'abajo' }); return; }
        case 'anular': case 'anularOtras': { const r = await elegirCols(a === 'anular' ? 'Columnas que se convierten en filas (Atributo / Valor)' : 'Columnas que se quedan fijas (el resto se convierte en filas)', cols(), c0 ? [c0] : []); if (r && r.length) agregarPaso({ tipo: a, cols: r }); return; }
        case 'may': case 'min': case 'recortar': case 'nombre': { const c = necesitaCol(); if (c) agregarPaso({ tipo: 'mayus', col: c, modo: a }); return; }
        case 'personalizada': {
          const r = await pedir('Columna personalizada', [{ n: 'Nuevo nombre de columna', v: 'Personalizado' }, { n: 'Fórmula de columna personalizada', area: true, v: '= ', ayuda: `Columnas disponibles: ${cols().map((x) => `[${x}]`).join(', ')}<br>Ejemplos: <code>= [precio] * [cantidad]</code> · <code>= if [monto] > 1000 then "Alto" else "Bajo"</code> · <code>= Text.Upper([pais])</code> · <code>= Date.Year([fecha])</code>` }]);
          if (!r) return; try { D().compilarM(r[1]); } catch (e) { toast('Error en la fórmula: ' + e.message, 5000); return; }
          return agregarPaso({ tipo: 'personalizada', nombre: r[0] || 'Personalizado', formula: r[1] });
        }
        case 'condicional': return dialogoCondicional();
        case 'indice': return agregarPaso({ tipo: 'indice', nombre: 'Índice', desde: 1 });
        case 'duplicar': { const c = necesitaCol(); if (c) agregarPaso({ tipo: 'duplicar', col: c }); return; }
        case 'avanzado': { const mm = modal(`<div class="pb-m-cab">Editor avanzado — ${esc(actual)}<button data-cerrar-modal>✕</button></div><pre class="pq-avanzado">${esc(D().scriptM(S.tablas[actual].pasos))}</pre><div class="pb-m-pie"><span class="pb-dim small">Este es el lenguaje M completo de la consulta: cada paso usa el resultado del anterior. En esta práctica se edita con los botones.</span><span class="spacer"></span><button class="pb-btn" data-cerrar-modal>Listo</button></div>`, 'ancho'); void mm; return; }
        case 'perfil': S.pqPerfil = !S.pqPerfil; guardar(true); return pintarPQ();
      }
    }
    function elegirCols(titulo, todas, marcadas) {
      return new Promise((ok) => {
        const mm = modal(`<div class="pb-m-cab">${esc(titulo)}<button data-cerrar-modal>✕</button></div><div class="pb-form pb-checks">${todas.map((c) => `<label><input type="checkbox" value="${esc(c)}" ${marcadas.includes(c) ? 'checked' : ''}> ${esc(c)}</label>`).join('')}</div><div class="pb-m-pie"><span class="spacer"></span><button class="pb-btn pb-btn-am" data-ok>Aceptar</button><button class="pb-btn" data-cerrar-modal>Cancelar</button></div>`, 'ancho');
        mm.querySelector('[data-ok]').addEventListener('click', () => { const v = [...mm.querySelectorAll('input:checked')].map((x) => x.value); mm.parentElement.remove(); ok(v); reabrir(); });
        mm.parentElement.addEventListener('click', (e) => { if (e.target === mm.parentElement || e.target.closest('[data-cerrar-modal]')) { ok(null); reabrir(); } });
      });
    }
    // los diálogos secundarios reemplazan al editor; al cerrarlos se vuelve a abrir en el mismo estado
    const reabrir = () => setTimeout(() => { if (!main.querySelector('.pq')) powerQuery(actual); }, 0);
    async function dialogoAgrupar() {
      const cs = cols();
      const r = await pedir('Agrupar por', [{ n: 'Agrupar por la columna', opts: cs, v: colSelPQ || cs[0] }, { n: 'Nuevo nombre de columna', v: 'Recuento' }, { n: 'Operación', opts: Object.entries(D().AGRUP).map(([k, [n]]) => [k, n]), v: 'contar' }, { n: 'Columna (para Suma, Promedio…)', opts: cs }]);
      reabrir(); if (!r) return;
      setTimeout(() => { S.tablas[actual].pasos.push({ tipo: 'agrupar', por: [r[0]], aggs: [{ nombre: r[1] || 'Recuento', op: r[2], col: r[3] }] }); cambioModelo(); guardar(); const pq = main.querySelector('.pq'); if (pq) pq.closest('.pb-modal-fondo').remove(); powerQuery(actual); }, 10);
    }
    async function dialogoCombinar() {
      const otras = consultas().filter((x) => x !== actual); if (!otras.length) { toast('Necesitas otra consulta para combinar.'); return; }
      const cs = cols();
      const r = await pedir('Combinar consultas', [{ n: `Columna de ${actual}`, opts: cs, v: colSelPQ || cs[0] }, { n: 'Combinar con la tabla', opts: otras }, { n: 'Columna coincidente de esa tabla (se busca la del mismo nombre si la dejas vacía)', v: '' }, { n: 'Tipo de combinación', opts: [['izq', 'Externa izquierda (todas de la primera, coincidentes de la segunda)'], ['interna', 'Interna (solo filas coincidentes)'], ['anti', 'Anti izquierda (solo filas de la primera sin coincidencia)']] }]);
      reabrir(); if (!r) return;
      setTimeout(() => {
        const otra = resolverConsulta(r[1]); const colDer = r[2] || (otra.cols.find((c) => c.n === r[0]) || otra.cols[0]).n;
        S.tablas[actual].pasos.push({ tipo: 'combinar', con: r[1], colIzq: r[0], colDer, tipo: r[3], expandir: otra.cols.map((c) => c.n).filter((n) => n !== colDer) });
        cambioModelo(); guardar(); const pq = main.querySelector('.pq'); if (pq) pq.closest('.pb-modal-fondo').remove(); powerQuery(actual);
      }, 10);
    }
    async function dialogoCondicional() {
      const cs = cols();
      const r = await pedir('Agregar columna condicional', [{ n: 'Nuevo nombre de columna', v: 'Personalizado' }, { n: 'Si el nombre de la columna', opts: cs, v: colSelPQ || cs[0] }, { n: 'Operador', opts: Object.entries(D().OPS_FILTRO) }, { n: 'Valor' }, { n: 'Entonces (resultado)' }, { n: 'Si no (resultado)' }]);
      reabrir(); if (!r) return;
      setTimeout(() => { S.tablas[actual].pasos.push({ tipo: 'condicional', nombre: r[0], reglas: [{ col: r[1], op: r[2], val: r[3], res: r[4] }], otro: r[5] }); cambioModelo(); guardar(); const pq = main.querySelector('.pq'); if (pq) pq.closest('.pb-modal-fondo').remove(); powerQuery(actual); }, 10);
    }
    function cerrar() { m.parentElement.remove(); cambioModelo(); const rels = autodetectar(); guardar(); render(); toast('Cambios aplicados al modelo' + (rels.length ? `. Relaciones nuevas: ${rels.join(' · ')}` : '')); }
    function menuColumna(th) {
      const col = th.dataset.col, rr = th.getBoundingClientRect();
      const prev = document.querySelector('.pq-menu'); if (prev) prev.remove();
      const menu = document.createElement('div'); menu.className = 'pq-menu'; menu.style.left = Math.min(rr.left, innerWidth - 250) + 'px'; menu.style.top = Math.min(rr.bottom, innerHeight - 420) + 'px';
      const vals = [...new Set((m._r.rows || []).slice(0, 2000).map((f) => f[m._r.cols.findIndex((c) => c.n === col)]))].slice(0, 60);
      menu.innerHTML = `<div data-m="asc">↑ Orden ascendente</div><div data-m="desc">↓ Orden descendente</div><hr><div data-m="quitar">✕ Quitar</div><div data-m="otras">Quitar otras columnas</div><div data-m="dup">Quitar duplicados</div><div data-m="novacio">Quitar vacíos</div><hr><div class="pq-menu-sub">Filtros de ${esc(col)}</div>${Object.entries(D().OPS_FILTRO).filter(([k]) => k !== 'novacio').map(([k, n]) => `<div data-m="f" data-op="${k}">&nbsp;&nbsp;${n}…</div>`).join('')}<hr><div class="pq-menu-sub">Mantener solo estos valores</div><div class="pq-menu-vals">${vals.map((x, i) => `<label><input type="checkbox" data-v="${i}" checked> ${esc(x ?? '(null)')}</label>`).join('')}</div><div data-m="valores" class="pq-menu-ok">Aceptar</div>`;
      m.appendChild(menu);
      setTimeout(() => document.addEventListener('mousedown', function f(e) { if (!menu.contains(e.target)) { menu.remove(); document.removeEventListener('mousedown', f); } }), 0);
      menu.addEventListener('click', async (e) => {
        const o = e.target.closest('[data-m]'); if (!o) return;
        const k = o.dataset.m;
        if (k === 'valores') { const no = vals.filter((_, i) => !menu.querySelector(`[data-v="${i}"]`).checked); menu.remove(); if (no.length === 1) agregarPaso({ tipo: 'filtrar', col, op: '<>', val: no[0] }); else if (vals.length - no.length === 1) agregarPaso({ tipo: 'filtrar', col, op: '=', val: vals.find((_, i) => menu.querySelector(`[data-v="${i}"]`) && !no.includes(vals[i])) ?? vals.filter((x) => !no.includes(x))[0] }); else if (no.length) for (const x of no) S.tablas[actual].pasos.push({ tipo: 'filtrar', col, op: '<>', val: x }); if (no.length > 1) { cambioModelo(); guardar(); pintarPQ(); } return; }
        menu.remove();
        if (k === 'asc' || k === 'desc') agregarPaso({ tipo: 'ordenar', col, desc: k === 'desc' });
        else if (k === 'quitar') agregarPaso({ tipo: 'quitar', cols: [col] });
        else if (k === 'otras') agregarPaso({ tipo: 'elegir', cols: [col] });
        else if (k === 'dup') agregarPaso({ tipo: 'duplicados', cols: [col] });
        else if (k === 'novacio') agregarPaso({ tipo: 'filtrar', col, op: 'novacio' });
        else if (k === 'f') { const op = o.dataset.op; const r = await pedir(`Filtrar filas: ${col} ${D().OPS_FILTRO[op]}`, [{ n: 'Valor' }]); reabrir(); if (r) setTimeout(() => { S.tablas[actual].pasos.push({ tipo: 'filtrar', col, op, val: r[0] }); cambioModelo(); guardar(); const pq = main.querySelector('.pq'); if (pq) pq.closest('.pb-modal-fondo').remove(); powerQuery(actual); }, 10); }
      });
    }
    m.addEventListener('click', (e) => {
      const t = e.target;
      if (t.closest('[data-cerrar-pq]')) { if (confirm('¿Aplicar los cambios antes de cerrar?')) cerrar(); else { m.parentElement.remove(); cambioModelo(); render(); } return; }
      const pe = t.closest('[data-pest]'); if (pe) { pest = pe.dataset.pest; pintarPQ(); return; }
      const qq = t.closest('[data-q]'); if (qq) { actual = qq.dataset.q; pasoSel = null; colSelPQ = null; pintarPQ(); return; }
      const bp = t.closest('[data-borrar-paso]'); if (bp) { e.stopPropagation(); S.tablas[actual].pasos.splice(Number(bp.dataset.borrarPaso), 1); pasoSel = null; cambioModelo(); guardar(); pintarPQ(); return; }
      const ps = t.closest('[data-paso]'); if (ps) { pasoSel = Number(ps.dataset.paso); pintarPQ(); return; }
      const b = t.closest('[data-pq]'); if (b) { hacer(b.dataset.pq); return; }
      const mc = t.closest('[data-menu-col]'); if (mc) { colSelPQ = mc.dataset.menuCol; menuColumna(mc.closest('th')); return; }
      const tc = t.closest('[data-tipo-col]'); if (tc) { colSelPQ = tc.dataset.tipoCol; hacer('tipo'); return; }
      const th = t.closest('th[data-col]'); if (th) { colSelPQ = th.dataset.col; pintarPQ(); }
    });
    m.querySelector('[data-pq-nombre]').addEventListener('change', (e) => {
      const nuevo = e.target.value.trim(); if (!nuevo || nuevo === actual || S.tablas[nuevo]) return;
      renombrarTabla(actual, nuevo); actual = nuevo; pintarPQ();
    });
    pintarPQ();
  }
  function renombrarTabla(viejo, nuevo) {
    const o = {}; for (const k of tablas()) o[k === viejo ? nuevo : k] = S.tablas[k]; S.tablas = o;
    S.rels.forEach((r) => { if (r.de === viejo) r.de = nuevo; if (r.a === viejo) r.a = nuevo; });
    for (const v of todos()) for (const k in v.pozos) for (const f of v.pozos[k]) if (f.t === viejo) f.t = nuevo;
    const re = new RegExp(`(^|[^\\w'])${viejo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\[`, 'g');
    const cambiar = (x) => x.split(`'${viejo}'[`).join(`'${nuevo}'[`).replace(re, (m0, a) => `${a}'${nuevo}'[`);
    S.medidas.forEach((m) => { m.expr = cambiar(m.expr); if (m.tabla === viejo) m.tabla = nuevo; });
    Object.values(S.tablas).forEach((t) => t.calc.forEach((c) => { c.expr = cambiar(c.expr); }));
    for (const t of Object.values(S.tablas)) for (const p of t.pasos) if (p.con === viejo) p.con = nuevo;
    if (S.jerarquias && S.jerarquias[viejo]) { S.jerarquias[nuevo] = S.jerarquias[viejo]; delete S.jerarquias[viejo]; }
    if (S.props) for (const k of Object.keys(S.props)) { if (k === `T:${viejo}`) { S.props[`T:${nuevo}`] = S.props[k]; delete S.props[k]; } else if (k.startsWith(viejo + '|')) { S.props[nuevo + k.slice(viejo.length)] = S.props[k]; delete S.props[k]; } }
    if (S.tablaFechas && S.tablaFechas.t === viejo) S.tablaFechas.t = nuevo;
    if (S.posModelo && S.posModelo[viejo]) { S.posModelo[nuevo] = S.posModelo[viejo]; delete S.posModelo[viejo]; }
    for (const r of S.roles || []) for (const g of r.reglas || []) if (g.t === viejo) g.t = nuevo;
    for (const v of todos()) recorrerCampos(v, (f) => { if (f.t === viejo) f.t = nuevo; });
    for (const p of S.paginas) recorrerCampos(p, (f) => { if (f.t === viejo) f.t = nuevo; });
    recorrerCampos(S.filtrosTodas, (f) => { if (f.t === viejo) f.t = nuevo; });
    if (S.selModelo && S.selModelo.t === viejo) S.selModelo.t = nuevo;
    cambioModelo(); guardar();
  }
  // recorre cualquier objeto (objeto visual, página, filtros) y llama a fn con cada referencia a una columna {t, c}
  function recorrerCampos(o, fn, vistos = new Set()) {
    if (!o || typeof o !== 'object' || vistos.has(o)) return; vistos.add(o);
    if (Array.isArray(o)) { o.forEach((x) => recorrerCampos(x, fn, vistos)); return; }
    if (typeof o.t === 'string' && typeof o.c === 'string') fn(o);
    for (const k of Object.keys(o)) if (k !== 'formato' && k !== 'imagen') recorrerCampos(o[k], fn, vistos);
  }
  // cambiar el nombre de una columna desde el modelo: en Power BI agrega el paso "Columnas con nombre cambiado"
  function renombrarColumna(t, viejo, nuevo) {
    const tb = S.tablas[t]; if (!tb || !nuevo || viejo === nuevo) return false;
    if (meta(t).some((c) => c.n.toLowerCase() === nuevo.toLowerCase())) { toast(`Ya hay una columna "${nuevo}" en ${t}.`); return false; }
    const calc = tb.calc.find((c) => c.nombre === viejo);
    if (calc) calc.nombre = nuevo; else if (tb.fuente.tipo === 'dax') { toast('En una tabla calculada el nombre de la columna sale de su fórmula: cámbialo ahí.'); return false; } else tb.pasos.push({ tipo: 'renombrar', col: viejo, a: nuevo });
    const ref = (x) => x.split(`[${viejo}]`).join(`[${nuevo}]`);
    S.medidas.forEach((m) => { m.expr = ref(m.expr); });
    Object.values(S.tablas).forEach((x) => x.calc.forEach((c) => { c.expr = ref(c.expr); }));
    S.rels.forEach((r) => { if (r.de === t && r.cde === viejo) r.cde = nuevo; if (r.a === t && r.ca === viejo) r.ca = nuevo; });
    for (const h of (S.jerarquias || {})[t] || []) h.niveles = h.niveles.map((n) => (n === viejo ? nuevo : n));
    for (const r of S.roles || []) for (const g of r.reglas || []) if (g.t === t && g.c === viejo) g.c = nuevo;
    if (S.props && S.props[`${t}|${viejo}`]) { S.props[`${t}|${nuevo}`] = S.props[`${t}|${viejo}`]; delete S.props[`${t}|${viejo}`]; }
    if (tb.resumen && viejo in tb.resumen) { tb.resumen[nuevo] = tb.resumen[viejo]; delete tb.resumen[viejo]; }
    if (S.tablaFechas && S.tablaFechas.t === t && S.tablaFechas.c === viejo) S.tablaFechas.c = nuevo;
    const fn = (f) => { if (f.t === t && f.c === viejo) f.c = nuevo; };
    for (const v of todos()) recorrerCampos(v, fn); for (const p of S.paginas) recorrerCampos(p, fn); recorrerCampos(S.filtrosTodas, fn); recorrerCampos(S.sincro, fn); recorrerCampos(S.drill, fn);
    if (S.selModelo && S.selModelo.t === t && S.selModelo.c === viejo) S.selModelo.c = nuevo;
    if (S.colSel && S.colSel.t === t && S.colSel.c === viejo) S.colSel.c = nuevo;
    cambioModelo(); guardar(); return true;
  }

  // ---------------------------------------------------------------- relaciones
  function dialogoRelaciones() {
    construir();
    if (tablas().length < 2) { toast('Necesitas al menos dos tablas para crear una relación.'); return; }
    const m = modal(`<div class="pb-m-cab">Administrar relaciones<button data-cerrar-modal>✕</button></div><div class="pb-rels"><div class="row"><button class="pb-btn pb-btn-am" data-nueva>+ Nueva relación</button><button class="pb-btn" data-auto>Detección automática</button></div><table class="pb-rels-t"><thead><tr><th>Activo</th><th>De: tabla (columna)</th><th>Cardinalidad</th><th>A: tabla (columna)</th><th>Dirección del filtro cruzado</th><th></th></tr></thead><tbody></tbody></table></div><div class="pb-m-pie"><span class="pb-dim small">La tabla "De" es el lado varios (*), por ejemplo Ventas[cliente_id]; la tabla "A" es el lado uno (1), donde el valor no se repite. El filtro viaja de A hacia De (o en las dos direcciones si eliges Ambas).</span><span class="spacer"></span><button class="pb-btn pb-btn-am" data-cerrar-modal>Cerrar</button></div>`, 'grande pb-modal-rels');
    const pintarR = () => { m.querySelector('.pb-rels-t tbody').innerHTML = S.rels.map((r, i) => `<tr><td><input type="checkbox" data-activa="${i}" ${r.activa ? 'checked' : ''}></td><td>${esc(r.de)} (${esc(r.cde)})</td><td>Varios a uno (*:1)</td><td>${esc(r.a)} (${esc(r.ca)})</td><td><select data-dir="${i}"><option value="unica" ${r.direccion !== 'ambas' ? 'selected' : ''}>Única</option><option value="ambas" ${r.direccion === 'ambas' ? 'selected' : ''}>Ambas</option></select></td><td><button class="pb-btn" data-editar="${i}">Editar</button> <button class="pb-btn" data-borrar-rel="${i}">Eliminar</button></td></tr>`).join('') || '<tr><td colspan="6" class="pb-dim">No hay relaciones todavía.</td></tr>'; };
    pintarR();
    m.addEventListener('change', (e) => {
      const a = e.target.closest('[data-activa]'); if (a) { const r = S.rels[Number(a.dataset.activa)]; if (a.checked && S.rels.some((x) => x !== r && x.activa && ((x.de === r.de && x.a === r.a) || (x.de === r.a && x.a === r.de)))) { toast('Ya hay una relación activa entre esas tablas: solo puede haber una (desactiva la otra primero). La inactiva se usa con USERELATIONSHIP.', 6000); a.checked = false; return; } r.activa = a.checked; cambioModelo(); guardar(); render(); return; }
      const d = e.target.closest('[data-dir]'); if (d) { S.rels[Number(d.dataset.dir)].direccion = d.value; cambioModelo(); guardar(); render(); }
    });
    m.addEventListener('click', (e) => {
      const b = e.target.closest('[data-borrar-rel]'); if (b) { S.rels.splice(Number(b.dataset.borrarRel), 1); cambioModelo(); guardar(); pintarR(); render(); return; }
      if (e.target.closest('[data-auto]')) { const n = autodetectar(); guardar(); pintarR(); render(); toast(n.length ? `Detectadas: ${n.join(' · ')}` : 'No encontré relaciones nuevas (columnas con el mismo nombre y valores únicos en un lado).'); return; }
      if (e.target.closest('[data-nueva]')) { editarRelacion(null, () => { pintarR(); }); return; }
      const ed = e.target.closest('[data-editar]'); if (ed) editarRelacion(S.rels[Number(ed.dataset.editar)], () => pintarR());
    });
  }
  function editarRelacion(rel, despues) {
    construir();
    const ts = tablas(); const r = rel || { de: ts[0], cde: (meta(ts[0])[0] || {}).n, a: ts[1], ca: (meta(ts[1])[0] || {}).n, activa: true, direccion: 'unica' };
    const fondo = main.querySelector('.pb-modal-fondo'); if (fondo) fondo.remove();
    const m = modal(`<div class="pb-m-cab">${rel ? 'Editar relación' : 'Nueva relación'}<button data-cerrar-modal>✕</button></div><div class="pb-rel-ed"><div class="pb-rel-lado"><b>Desde la tabla</b><select data-ta>${ts.map((t) => `<option ${t === r.de ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select><select data-ca></select><div class="pb-tabla pb-rel-prev" data-pa></div></div><div class="pb-rel-lado"><b>Hasta la tabla</b><select data-tb>${ts.map((t) => `<option ${t === r.a ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select><select data-cb></select><div class="pb-tabla pb-rel-prev" data-pb></div></div>
      <div class="pb-rel-opts"><label>Cardinalidad<select data-card><option value="*:1">Varios a uno (*:1)</option><option value="1:1">Uno a uno (1:1)</option><option value="1:*">Uno a varios (1:*)</option></select></label><label>Dirección del filtro cruzado<select data-dir><option value="unica" ${r.direccion !== 'ambas' ? 'selected' : ''}>Única</option><option value="ambas" ${r.direccion === 'ambas' ? 'selected' : ''}>Ambas</option></select></label><label class="pb-fmt-chk"><input type="checkbox" data-act ${r.activa ? 'checked' : ''}> Activar esta relación</label><p class="pb-dim small" data-aviso></p></div></div><div class="pb-m-pie"><span class="spacer"></span><button class="pb-btn pb-btn-am" data-ok>Guardar</button><button class="pb-btn" data-cerrar-modal>Cancelar</button></div>`, 'grande');
    const prevT = (t, el, col) => { const filas = ejecutar(`SELECT * FROM ${q(t)} LIMIT 4`); const cs = meta(t).map((c) => c.n); el.innerHTML = `<table><thead><tr>${cs.map((c) => `<th class="${c === col ? 'sel' : ''}">${esc(c)}</th>`).join('')}</tr></thead><tbody>${filas.map((f) => `<tr>${f.map((x, i) => `<td class="${cs[i] === col ? 'sel' : ''}">${esc(x ?? '')}</td>`).join('')}</tr>`).join('')}</tbody></table>`; };
    const sync = (inicial) => {
      const ta = m.querySelector('[data-ta]').value, tb = m.querySelector('[data-tb]').value;
      const ca = m.querySelector('[data-ca]'), cb = m.querySelector('[data-cb]');
      if (inicial !== false) { ca.innerHTML = meta(ta).map((c) => `<option>${esc(c.n)}</option>`).join(''); cb.innerHTML = meta(tb).map((c) => `<option>${esc(c.n)}</option>`).join(''); const comun = meta(ta).map((c) => c.n).find((x) => meta(tb).some((c) => c.n === x) && /id|key|cod/i.test(x)) || meta(ta).map((c) => c.n).find((x) => meta(tb).some((c) => c.n === x)); if (inicial === 'rel') { ca.value = r.cde; cb.value = r.ca; } else if (comun) { ca.value = comun; cb.value = comun; } }
      prevT(ta, m.querySelector('[data-pa]'), ca.value); prevT(tb, m.querySelector('[data-pb]'), cb.value);
      const uA = ejecutar(`SELECT COUNT(*) = COUNT(DISTINCT ${q(ca.value)}) FROM ${q(ta)}`)[0][0], uB = ejecutar(`SELECT COUNT(*) = COUNT(DISTINCT ${q(cb.value)}) FROM ${q(tb)}`)[0][0];
      m.querySelector('[data-card]').value = uA && uB ? '1:1' : uB ? '*:1' : uA ? '1:*' : '*:1';
      m.querySelector('[data-aviso]').textContent = !uA && !uB ? '⚠ Ninguna de las dos columnas tiene valores únicos: sería varios a varios. Power BI lo permite, pero en esta práctica conviene una tabla puente o una dimensión.' : `${ta}[${ca.value}] ${uA ? 'no repite' : 'repite'} valores · ${tb}[${cb.value}] ${uB ? 'no repite' : 'repite'} valores.`;
    };
    sync(rel ? 'rel' : true);
    m.querySelector('[data-ta]').addEventListener('change', () => sync(true)); m.querySelector('[data-tb]').addEventListener('change', () => sync(true));
    m.querySelector('[data-ca]').addEventListener('change', () => sync(false)); m.querySelector('[data-cb]').addEventListener('change', () => sync(false));
    m.querySelector('[data-ok]').addEventListener('click', () => {
      let de = m.querySelector('[data-ta]').value, cde = m.querySelector('[data-ca]').value, a = m.querySelector('[data-tb]').value, ca = m.querySelector('[data-cb]').value;
      if (de === a) { toast('Elige dos tablas distintas.'); return; }
      if (m.querySelector('[data-card]').value === '1:*') { [de, cde, a, ca] = [a, ca, de, cde]; }
      const nueva = { de, cde, a, ca, activa: m.querySelector('[data-act]').checked, direccion: m.querySelector('[data-dir]').value };
      if (nueva.activa && S.rels.some((x) => x !== rel && x.activa && ((x.de === de && x.a === a) || (x.de === a && x.a === de)))) { nueva.activa = false; toast('Ya había una relación activa entre esas tablas: esta queda inactiva (úsala con USERELATIONSHIP en una medida).', 6000); }
      if (rel) Object.assign(rel, nueva); else S.rels.push(nueva);
      cambioModelo(); guardar(); m.parentElement.remove(); render(); if (despues) dialogoRelaciones();
    });
  }

  // ---------------------------------------------------------------- render de vistas
  function render() {
    construir();
    main.querySelectorAll('.pb-vistas [data-v]').forEach((b) => b.classList.toggle('on', b.dataset.v === S.vista));
    main.querySelector('#pbi').classList.toggle('pb-modo-codigo', S.vista === 'dax' || S.vista === 'tmdl');
    if (S.vista === 'tabla') return renderTabla();
    if (S.vista === 'modelo') return renderModelo();
    if (S.vista === 'dax') return renderDax();
    if (S.vista === 'tmdl') return renderTmdl();
    const centro = main.querySelector('#pbCentro');
    if (!tablas().length) {
      centro.innerHTML = `<div class="pb-lienzo-wrap"><div class="pb-lienzo pb-vacio"><div class="pb-agregar"><h2>Agregar datos al informe</h2><p>Una vez cargados, los datos aparecerán en el panel <b>Datos</b>.</p><div class="pb-agregar-g"><button data-acc="excel"><b class="pb-x">X</b>Importar datos de Excel</button><button data-acc="curso">${fl('database')}Importar datos de una base (SQLite del curso)</button><button data-acc="escribir">${fl('table_edit')}Pegar o escribir datos en una tabla</button><button data-acc="obtener">${fl('document_text')}Texto/CSV, JSON o web</button></div><a data-acc="obtener">Obtener datos de otro origen →</a></div></div></div>`;
      renderPaneles(); renderPie(); return;
    }
    const enf = S.enfoque && vis(S.enfoque);
    centro.innerHTML = `<div class="pb-lienzo-wrap ${S.verComo && S.verComo.rol ? 'pb-con-vercomo' : ''}">${S.verComo && S.verComo.rol ? `<div class="pb-ver-como">${fl('eye')} Ahora está viendo el informe como: <b>${esc(S.verComo.rol)}</b>${S.verComo.usuario ? ` · usuario <b>${esc(S.verComo.usuario)}</b>` : ''}<button class="pb-btn" data-acc="dejar-ver-como">Detener la vista</button></div>` : ''}${enf ? `<div class="pb-volver"><button data-salir-enfoque>← Volver al informe</button></div>` : ''}<div class="pb-lienzo ${S.cuadricula ? 'pb-con-cuadricula' : ''} ${enf ? 'pb-enfoque' : ''}" id="pbLienzo"></div></div>`;
    const lienzo = main.querySelector('#pbLienzo');
    lienzo.style.background = (S.tema === 'custom' && S.temaCustom && S.temaCustom.background) || '';
    const lista = enf ? [enf] : pag().visuales.filter((x) => !x.oculto);
    if (window.PBIInforme) window.PBIInforme.estiloPagina(lienzo);
    for (const v of lista) {
      const el = document.createElement('div');
      const ef = (k) => V().fmtGet(v, 'efectos', k);
      el.className = 'pb-v' + (S.sel === v.id || (S.selMulti || []).includes(v.id) ? ' sel' : '') + (v.tipo === 'texto' ? ' pb-v-texto' : '') + (['forma', 'boton', 'navPaginas'].includes(v.tipo) ? ' pb-v-forma' : '');
      el.dataset.id = v.id;
      if (!enf) Object.assign(el.style, { left: v.x + '%', top: v.y + '%', width: v.w + '%', height: v.h + '%' }); else Object.assign(el.style, { left: '1%', top: '2%', width: '98%', height: v.verTabla ? '55%' : '96%' });
      el.style.background = ef('fondo') ? hexA(ef('colorFondo'), 1 - (Number(ef('transparencia')) || 0) / 100) : 'transparent';
      if (ef('borde')) el.style.border = `1px solid ${ef('colorBorde')}`; if (Number(ef('radio'))) el.style.borderRadius = ef('radio') + 'px'; if (ef('sombra')) el.style.boxShadow = '0 2px 8px rgba(0,0,0,.18)';
      const tit = tituloDe(v); const al = { Izquierda: 'left', Centro: 'center', Derecha: 'right' }[V().fmtGet(v, 'titulo', 'alineacion')];
      const nFiltros = (v.filtros || []).filter((f) => filtroEfectivo(f)).length + pag().filtros.filter((f) => filtroEfectivo(f)).length + S.filtrosTodas.filter((f) => filtroEfectivo(f)).length;
      const x = v.pozos.x && v.pozos.x[0];
      const drill = window.PBIInforme && (v.pozos.x || []).length > 1 ? window.PBIInforme.botonesDrill(v) : x && esFecha(x) && V().TIPOS[v.tipo].g === 'cart' ? `<button data-drill="arriba" title="Explorar en profundidad: subir un nivel">${fl('arrow_up')}</button><button data-drill="abajo" title="Ir al siguiente nivel de la jerarquía">${fl('arrow_down')}</button>` : '';
      el.innerHTML = `${tit ? `<div class="pb-v-tit" style="font-size:${V().fmtGet(v, 'titulo', 'tam')}px;color:${V().fmtGet(v, 'titulo', 'color')};font-weight:${V().fmtGet(v, 'titulo', 'negrita') ? 600 : 400};text-align:${al}">${esc(tit)}</div>` : ''}${V().fmtGet(v, 'encabezado', 'mostrar') ? `<div class="pb-v-cab">${lectura && lectura.alAnclar && !['forma', 'boton', 'navPaginas'].includes(v.tipo) ? `<button data-anclar title="Anclar objeto visual a un panel">${fl('target_arrow')}</button>` : ''}${drill}${nFiltros ? `<button title="${nFiltros} filtro(s) aplicados a este objeto visual">${fl('filter')}</button>` : ''}<button data-enfoque title="Modo de enfoque">${fl('arrow_maximize')}</button><button data-mas title="Más opciones">${fl('more_horizontal')}</button></div>` : ''}<div class="pb-v-cuerpo"></div>${enf ? '' : '<span class="pb-v-res"></span>'}`;
      lienzo.appendChild(el);
    }
    if (enf && enf.verTabla) { const t = document.createElement('div'); t.className = 'pb-vertabla'; t.style.top = '59%'; lienzo.appendChild(t); }
    if (window.PBIInforme) window.PBIInforme.despuesRender(lienzo);
    requestAnimationFrame(() => {
      tiempos = {};
      for (const v of lista) { const el = lienzo.querySelector(`[data-id="${v.id}"]`); if (el) dibujarVisual(v, el); }
      if (enf && enf.verTabla) verComoTabla(enf, lienzo.querySelector('.pb-vertabla'));
      if (S.analizador) renderPaneles();
    });
    interaccionLienzo(lienzo);
    if (window.PBIInforme) refrescarCinta();
    const se = main.querySelector('[data-salir-enfoque]'); if (se) se.addEventListener('click', () => { S.enfoque = null; render(); });
    renderPaneles(); renderPie();
  }
  const hexA = (hex, a) => { const h = String(hex || '#FFFFFF').replace('#', ''); const n = parseInt(h.length === 3 ? h.split('').map((x) => x + x).join('') : h, 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, a))})`; };
  function tituloDe(v) {
    if (['texto', 'forma', 'boton', 'navPaginas'].includes(v.tipo) || !V().fmtGet(v, 'titulo', 'mostrar')) return '';
    const t = V().fmtGet(v, 'titulo', 'texto'); if (t) return t;
    const P = v.pozos;
    if (v.tipo === 'tarjeta' || v.tipo === 'tabla' || v.tipo === 'tarjetaFilas' || v.tipo === 'matriz') return '';
    if (v.tipo === 'segmentacion') return P.x && P.x[0] ? nomCampo(P.x[0]) : '';
    if (v.tipo === 'medidor' || v.tipo === 'kpi') return P.y && P.y[0] ? nomCampo(P.y[0]) : '';
    if (v.tipo === 'dispersion') return P.ex && P.ex[0] && P.ey && P.ey[0] ? `${nomCampo(P.ey[0])} y ${nomCampo(P.ex[0])}${P.detalle && P.detalle[0] ? ` por ${nomCampo(P.detalle[0])}` : ''}` : '';
    const ys = [...(P.y || []), ...(P.linea || [])].map(nomCampo).join(' y '), x = P.x && P.x[0] ? nomCampo(P.x[0]) : '';
    return ys && x ? `${ys} por ${x}${P.leyenda && P.leyenda[0] ? ` y ${nomCampo(P.leyenda[0])}` : ''}` : '';
  }
  function dibujarVisual(v, el) {
    const cuerpo = el.querySelector('.pb-v-cuerpo');
    if (window.PBIInforme && window.PBIInforme.dibuja(v)) { window.PBIInforme.dibujar(v, cuerpo, el); return; }
    const t0 = performance.now(); let d, t1;
    try { d = datosVisual(v); t1 = performance.now(); } catch (e) { cuerpo.innerHTML = `<div class="pb-v-error"><b>No se puede mostrar este objeto visual.</b><br>${esc(e.message)}<br><button data-ver-detalle>Ver detalles</button></div>`; tiempos[v.id] = { error: e.message }; return; }
    if (!d) {
      if (v.tipo === 'texto' && v.imagen) { cuerpo.innerHTML = `<img src="${v.imagen}" alt="" class="pb-img">`; return; }
      cuerpo.innerHTML = `<div class="pb-v-vacio"><span class="pb-v-vacio-ic">${V().ICO[v.tipo] || ''}</span>Agregue datos a su objeto visual<br><small>Arrastre campos desde el panel Datos</small></div>`; return;
    }
    if (v.tipo === 'texto' && v.imagen) { cuerpo.innerHTML = `<img src="${v.imagen}" alt="" class="pb-img">`; return; }
    const W = el.clientWidth - 16, H = el.clientHeight - (el.querySelector('.pb-v-tit') ? 36 : 12);
    const x = v.pozos.x && v.pozos.x[0];
    V().dibujar(v, cuerpo, d, { paleta: paleta(), ancho: W, alto: H, sel: (c) => S.cruz && S.cruz.visual === v.id && String(S.cruz.valor) === String(c), aten: (c) => S.cruz && S.cruz.visual === v.id && String(S.cruz.valor) !== String(c), nom: nomCampo });
    if (d.recortado) cuerpo.insertAdjacentHTML('beforeend', `<div class="pb-v-nota" title="Power BI muestra una barra de desplazamiento; aquí se muestran las primeras 60">${d.recortado} categorías: se muestran 60</div>`);
    tiempos[v.id] = { consulta: t1 - t0, visual: performance.now() - t1, sql: d.sql || '', modo: x ? '' : '' };
  }
  function verComoTabla(v, el) {
    let d; try { d = datosVisual(v); } catch (e) { el.textContent = e.message; return; } if (!d) return;
    let cab, filas;
    if (d.cats) { cab = [d.nx, ...d.series.map((s) => s.nombre)]; filas = d.cats.map((c) => [c, ...d.series.map((s) => s.vals[c] ?? null)]); }
    else if (d.cab) { cab = d.cab; filas = d.filas; } else if (d.puntos) { cab = ['Detalle', d.nx, d.ny]; filas = d.puntos.map((p) => [p.d, p.x, p.y]); } else { cab = ['Valor']; filas = [[d.valor ?? (d.items ? d.items.map((i) => i.valor).join(' · ') : '')]]; }
    el.innerHTML = `<div class="pb-tabla"><table><thead><tr>${cab.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${filas.slice(0, 500).map((f) => `<tr>${f.map((x) => `<td class="${typeof x === 'number' ? 'num' : ''}">${esc(V().fmtCel(x))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }
  function exportarDatos(v) {
    let d; try { d = datosVisual(v); } catch (e) { toast(e.message); return; } if (!d) return;
    let cab, filas;
    if (d.cats) { cab = [d.nx, ...d.series.map((s) => s.nombre)]; filas = d.cats.map((c) => [c, ...d.series.map((s) => s.vals[c] ?? '')]); }
    else if (d.cab) { cab = d.cab; filas = d.filas; } else if (d.puntos) { cab = ['Detalle', d.nx, d.ny]; filas = d.puntos.map((p) => [p.d, p.x, p.y]); } else { cab = ['Valor']; filas = [[d.valor]]; }
    const csv = [cab, ...filas].map((f) => f.map((x) => { const s = String(x ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }).join(',')).join('\n');
    descargar(`${tituloDe(v) || 'datos'}.csv`, '﻿' + csv, 'text/csv');
  }
  function menuVisual(v, boton) {
    const prev = document.querySelector('.pq-menu'); if (prev) prev.remove();
    const r = boton.getBoundingClientRect();
    const menu = document.createElement('div'); menu.className = 'pq-menu pb-menu-v'; menu.style.left = Math.min(r.left, innerWidth - 240) + 'px'; menu.style.top = r.bottom + 'px';
    const P = v.pozos; const series = [...(P.y || []), ...(P.linea || [])];
    const T = V().TIPOS[v.tipo];
    const ordenes = T.g === 'cart' || T.g === 'parte' ? [['cat', P.x && P.x[0] ? nomCampo(P.x[0]) : 'Categoría'], ...series.map((f, i) => [String(i), nomCampo(f)])] : [];
    menu.innerHTML = `<div data-mv="exportar">${fl('arrow_download')} Exportar datos</div><div data-mv="tabla">${fl('table')} Mostrar como tabla</div><div data-mv="enfoque">${fl('arrow_maximize')} Modo de enfoque</div><div data-mv="dax">${fl('code')} Copiar consulta DAX</div>${ordenes.length ? `<hr><div class="pq-menu-sub">Ordenar eje</div>${ordenes.map(([k, n]) => `<div data-mv="orden" data-por="${k}">&nbsp;&nbsp;${esc(n)}${v.orden && String(v.orden.por) === k ? ' ✓' : ''}</div>`).join('')}<div data-mv="dir">&nbsp;&nbsp;${v.orden && v.orden.desc === false ? 'Orden descendente' : 'Orden ascendente'}</div>` : ''}<hr><div data-mv="duplicar">${fl('table_add')} Duplicar</div><div data-mv="quitar">${fl('dismiss')} Quitar</div>`;
    document.body.appendChild(menu);
    setTimeout(() => document.addEventListener('mousedown', function f(e) { if (!menu.contains(e.target)) { menu.remove(); document.removeEventListener('mousedown', f); } }), 0);
    menu.addEventListener('click', (e) => {
      const o = e.target.closest('[data-mv]'); if (!o) return; menu.remove();
      const k = o.dataset.mv;
      if (k === 'exportar') exportarDatos(v);
      else if (k === 'tabla') { v.verTabla = true; S.enfoque = v.id; render(); }
      else if (k === 'enfoque') { v.verTabla = false; S.enfoque = v.id; render(); }
      else if (k === 'dax') { const t = daxDe(v); navigator.clipboard && navigator.clipboard.writeText(t).catch(() => {}); S.daxTabs.push({ nombre: `Consulta ${S.daxTabs.length + 1}`, texto: t }); S.daxTab = S.daxTabs.length - 1; guardar(true); toast('Consulta copiada. También la abrí en la vista de consultas DAX.'); }
      else if (k === 'orden') { v.orden = { por: o.dataset.por, desc: v.orden ? v.orden.desc : true }; guardar(); render(); }
      else if (k === 'dir') { v.orden = { por: v.orden ? v.orden.por : '0', desc: !(v.orden ? v.orden.desc : true) }; guardar(); render(); }
      else if (k === 'duplicar') { const c = JSON.parse(JSON.stringify(v)); c.id = 'v' + Date.now().toString(36); c.x = Math.min(100 - c.w, c.x + 2); c.y = Math.min(100 - c.h, c.y + 3); pag().visuales.push(c); S.sel = c.id; guardar(); render(); }
      else if (k === 'quitar') quitarVisual(v.id);
    });
  }
  function quitarVisual(id) { pag().visuales = pag().visuales.filter((x) => x.id !== id); if (S.cruz && S.cruz.visual === id) S.cruz = null; S.sel = null; S.enfoque = null; guardar(); render(); }
  function agregarVisual(tipo, extra = {}) {
    S.vista = 'informe';
    const n = pag().visuales.length;
    const v = { id: 'v' + Date.now().toString(36), tipo, pozos: {}, filtros: [], formato: {}, x: 1 + (n % 3) * 33, y: 2 + (Math.floor(n / 3) % 3) * 32, w: 32, h: 30, ...extra };
    if (tipo === 'tarjeta' || tipo === 'kpi') { v.w = 16; v.h = 18; }
    if (tipo === 'segmentacion') { v.w = 16; v.h = 30; }
    pag().visuales.push(v); S.sel = v.id; guardar(); render(); return v;
  }
  const slicerCambio = (v) => { if (window.PBIInforme) window.PBIInforme.slicerCambio(v); };
  function interaccionLienzo(lienzo) {
    lienzo.addEventListener('dblclick', (e) => {
      const el = e.target.closest('.pb-v'); if (!el) return; const v = vis(el.dataset.id); if (!v || v.tipo !== 'texto' || v.imagen) return;
      const box = el.querySelector('.pb-textbox'); if (!box) return;
      box.contentEditable = 'true'; box.innerText = v.texto || ''; box.focus();
      box.addEventListener('blur', () => { v.texto = box.innerText; guardar(); render(); }, { once: true });
    });
    lienzo.addEventListener('pointerdown', (e) => {
      if (e.button === 2) return; // el clic derecho abre el menú contextual: no filtra ni mueve
      const el = e.target.closest('.pb-v');
      if (!el) { if (S.sel || S.cruz) { S.sel = null; S.cruz = null; guardar(true); render(); } return; }
      const v = vis(el.dataset.id); if (!v) return;
      if (e.target.closest('[contenteditable="true"]')) return;
      const mas = e.target.closest('[data-mas]'); if (mas) { e.preventDefault(); menuVisual(v, mas); return; }
      if (e.target.closest('[data-enfoque]')) { S.enfoque = S.enfoque ? null : v.id; v.verTabla = false; render(); return; }
      const dr = e.target.closest('[data-drill]'); if (dr && window.PBIInforme && (v.pozos.x || []).length > 1) { window.PBIInforme.drill(v, dr.dataset.drill); return; }
      if (dr) { const x = v.pozos.x[0]; const niveles = ['anio', 'trim', 'mes', undefined]; let i = niveles.indexOf(x.parte); if (dr.dataset.drill === 'abajo') i = Math.min(3, i + 1); else i = Math.max(0, i === -1 ? 2 : i - 1); x.parte = niveles[i]; if (!x.parte) delete x.parte; v.orden = null; guardar(); render(); return; }
      if (e.target.closest('[data-anclar]') && lectura && lectura.alAnclar) { lectura.alAnclar(v, el); return; }
      if (e.target.closest('.pb-v-cab')) return;
      if (e.target.closest('[data-inter]')) { window.PBIInforme.cambiarInteraccion(v, e.target.closest('[data-inter]').dataset.inter); return; }
      if (window.PBIInforme && window.PBIInforme.clicVisual(v, e)) return;
      if (e.target.closest('input, label, select, button')) return;
      const dato = e.target.closest('[data-cat]');
      if (dato && v.tipo !== 'segmentacion') {
        if (window.PBIInforme && v.modoDrill && (v.pozos.x || []).length > 1 && window.PBIInforme.drillValor(v, dato.dataset.cat)) return;
        const campo = v.tipo === 'tabla' ? (v.pozos.cols || []).find((c) => !c.medida && (!c.agg || c.agg === 'none')) : v.tipo === 'dispersion' ? v.pozos.detalle && v.pozos.detalle[0] : v.pozos.x && v.pozos.x[Math.min(v.nivel || 0, v.pozos.x.length - 1)];
        if (campo) { const raw = dato.dataset.cat; const valor = !campo.parte && ['num', 'int'].includes(tipoDe(campo.t, campo.c)) && raw !== '' ? Number(raw) : campo.parte === 'anio' && raw !== '' ? Number(raw) : raw === '' ? null : raw; S.cruz = S.cruz && S.cruz.visual === v.id && String(S.cruz.valor) === String(valor) ? null : { visual: v.id, campo, valor }; S.sel = v.id; guardar(true); render(); return; }
      }
      if (S.sel !== v.id) { S.sel = v.id; guardar(true); main.querySelectorAll('.pb-v').forEach((x) => x.classList.toggle('sel', x.dataset.id === v.id)); renderPaneles(); refrescarCinta(); }
      if (S.enfoque || lectura) return;
      const r = lienzo.getBoundingClientRect(), x0 = e.clientX, y0 = e.clientY, ini = { x: v.x, y: v.y, w: v.w, h: v.h }, redim = !!e.target.closest('.pb-v-res');
      el.setPointerCapture(e.pointerId);
      const pasoG = S.cuadricula ? 1 : 0.01;
      const snap = (x) => Math.round(x / pasoG) * pasoG;
      const mover = (ev) => { const dx = ((ev.clientX - x0) / r.width) * 100, dy = ((ev.clientY - y0) / r.height) * 100; if (redim) { v.w = snap(Math.max(6, Math.min(100 - v.x, ini.w + dx))); v.h = snap(Math.max(6, Math.min(100 - v.y, ini.h + dy))); } else { v.x = snap(Math.max(0, Math.min(100 - v.w, ini.x + dx))); v.y = snap(Math.max(0, Math.min(100 - v.h, ini.y + dy))); } Object.assign(el.style, { left: v.x + '%', top: v.y + '%', width: v.w + '%', height: v.h + '%' }); };
      const soltar = () => { el.removeEventListener('pointermove', mover); el.removeEventListener('pointerup', soltar); if (v.x !== ini.x || v.y !== ini.y || v.w !== ini.w || v.h !== ini.h) { guardar(); if (redim) dibujarVisual(v, el); } };
      el.addEventListener('pointermove', mover); el.addEventListener('pointerup', soltar);
    });
    const valorSl = (v, raw) => { const campo = v.pozos.x[0]; return raw === '' ? null : !campo.parte && ['num', 'int'].includes(tipoDe(campo.t, campo.c)) ? Number(raw) : campo.parte === 'anio' ? Number(raw) : raw; };
    lienzo.addEventListener('change', (e) => {
      const elV = e.target.closest('.pb-v'); if (!elV) return; const v = vis(elV.dataset.id); if (!v) return;
      if (e.target.matches('[data-sl-todo]')) { v.slicerSel = []; slicerCambio(v); guardar(); render(); return; }
      if (e.target.matches('[data-sl-drop]')) { const sel = [...e.target.selectedOptions].map((o) => o.value).filter((x) => x !== '__todos'); v.slicerSel = sel.map((x) => valorSl(v, x)); slicerCambio(v); guardar(); render(); return; }
      const cb = e.target.closest('[data-sl]'); if (!cb) return;
      const val = valorSl(v, cb.dataset.sl), unica = V().fmtGet(v, 'segmentacion', 'unica');
      const set = new Set(unica ? [] : v.slicerSel || []); cb.checked ? set.add(val) : set.delete(val); v.slicerSel = [...set]; slicerCambio(v); guardar(); render();
    });
    lienzo.addEventListener('click', (e) => {
      const b = e.target.closest('[data-sl-btn]'); if (b) { const v = vis(b.closest('.pb-v').dataset.id); const val = valorSl(v, b.dataset.slBtn); const unica = V().fmtGet(v, 'segmentacion', 'unica'); const set = new Set(unica ? [] : v.slicerSel || []); set.has(val) ? set.delete(val) : set.add(val); if (unica && (v.slicerSel || []).includes(val)) set.clear(); v.slicerSel = [...set]; slicerCambio(v); guardar(); render(); return; }
      const th = e.target.closest('th[data-ord]'); if (th) { const v = vis(th.closest('.pb-v').dataset.id); const j = Number(th.dataset.ord); v.orden = { col: j, desc: v.orden && v.orden.col === j ? !v.orden.desc : true }; guardar(); render(); return; }
      const det = e.target.closest('[data-ver-detalle]'); if (det) { const v = vis(det.closest('.pb-v').dataset.id); toast(tiempos[v.id] && tiempos[v.id].error ? tiempos[v.id].error : 'Sin detalles', 8000); }
    });
    if (window.PBIInforme) window.PBIInforme.enlazarLienzo(lienzo);
    lienzo.addEventListener('input', (e) => { const b = e.target.closest('[data-sl-buscar]'); if (!b) return; const t = b.value.toLowerCase(); b.closest('.pb-slicer').querySelectorAll('[data-sl-l]').forEach((l) => { l.style.display = l.dataset.slL.includes(t) ? '' : 'none'; }); });
    if (!lienzo.dataset.drop) { lienzo.dataset.drop = 1; lienzo.addEventListener('dragover', (e) => e.preventDefault()); lienzo.addEventListener('drop', (e) => { e.preventDefault(); let f; try { f = JSON.parse(e.dataTransfer.getData('text/plain')); } catch (err) { return; } const el = e.target.closest('.pb-v'); if (el) agregarCampo(vis(el.dataset.id), f); else agregarVisualCon(f); }); }
  }

  // ---------------------------------------------------------------- paneles (Filtros, Visualizaciones, Datos)
  const campoKey = (f) => (f.medida ? 'm:' + f.medida : `${f.t}|${f.c}|${f.parte || ''}`);
  // agrupa medidas y columnas por "carpeta para mostrar" (las sin carpeta van primero, como en Power BI)
  function carpetas(t, med, cols) {
    const g = new Map([['', { carpeta: '', med: [], cols: [] }]]);
    const de = (k) => (propsDe(k).carpeta || '');
    for (const m of med) { const c = de('m:' + m.nombre); if (!g.has(c)) g.set(c, { carpeta: c, med: [], cols: [] }); g.get(c).med.push(m); }
    for (const x of cols) { const c = de(propKey(t, x.n)); if (!g.has(c)) g.set(c, { carpeta: c, med: [], cols: [] }); g.get(c).cols.push(x); }
    return [...g.values()].sort((a, b) => (a.carpeta === '' ? 1 : b.carpeta === '' ? -1 : a.carpeta.localeCompare(b.carpeta)));
  }
  function arbolDatos(usados, opts = {}) {
    const abiertas = new Set(S.tablasAbiertas || tablas().slice(0, 2)); const b = (S.buscar || '').toLowerCase();
    return tablas().map((t) => {
      const tb = S.tablas[t];
      const visible = (k) => S.verOcultos || !propsDe(k).oculto;
      if (!visible(propKey(t))) return '';
      const med = S.medidas.filter((m) => (m.tabla || tablas()[0]) === t && (!b || m.nombre.toLowerCase().includes(b)) && visible('m:' + m.nombre));
      const cols = meta(t).filter((c) => (!b || c.n.toLowerCase().includes(b)) && visible(propKey(t, c.n)));
      const abierta = abiertas.has(t) || !!b;
      const icoT = tb.fuente.tipo === 'dax' ? fl('table_add') : fl('table');
      const jerHtml = '';
      return `<div class="pb-tabla-n ${S.tablaDatos === t && opts.tablaSel ? 'abierta' : ''}" data-tabla="${esc(t)}"><span class="pb-chev">${abierta ? '⌄' : '›'}</span><span class="pb-tabla-ic">${icoT}</span><span class="pb-nombre">${esc(t)}</span>${errores[t] ? `<span class="pb-err-ic" title="${esc(errores[t])}">⚠</span>` : ''}<button class="pb-mas-t" data-menu-tabla="${esc(t)}" title="Más opciones">⋯</button></div>${abierta ? carpetas(t, med, cols).map((g) => (g.carpeta ? `<div class="pb-carpeta">${fl('folder_open')} ${esc(g.carpeta)}</div>` : '') + g.med.map((m) => `<div class="pb-campo pb-medida ${g.carpeta ? 'pb-en-carpeta' : ''} ${S.medidaSel === m.nombre ? 'pb-sel' : ''} ${propsDe('m:' + m.nombre).oculto ? 'pb-oculto' : ''}" draggable="true" data-medida="${esc(m.nombre)}" title="${esc(propsDe('m:' + m.nombre).descripcion || '')}"><input type="checkbox" tabindex="-1" ${usados.has('m:' + m.nombre) ? 'checked' : ''}><span class="pb-ic">${fl('calculator')}</span><span class="pb-nombre">${esc(m.nombre)}</span></div>`).join('') + g.cols.map((c) => { const k = `${t}|${c.n}|`; const fecha = c.t === 'fecha' && !(S.tablaFechas && S.tablaFechas.t === t); const P0 = propsDe(propKey(t, c.n)); return `<div class="pb-campo ${g.carpeta ? 'pb-en-carpeta' : ''} ${S.colSel && S.colSel.t === t && S.colSel.c === c.n ? 'pb-sel' : ''} ${P0.oculto ? 'pb-oculto' : ''}" draggable="true" data-t="${esc(t)}" data-c="${esc(c.n)}" title="${esc(P0.descripcion || '')}"><input type="checkbox" tabindex="-1" ${usados.has(k) ? 'checked' : ''}><span class="pb-ic">${c.calc ? '<i class="pb-fx">fx</i>' : P0.categoria && /País|Ciudad|Estado|Continente|Condado|Código postal|Lugar|Latitud|Longitud|Dirección$/.test(P0.categoria) ? fl('globe') : esNum(t, c.n) ? 'Σ' : c.t === 'fecha' ? fl('calendar_ltr') : ''}</span><span class="pb-nombre">${esc(c.n)}</span>${(tb.calc.find((x) => x.nombre === c.n) || {}).error ? '<span class="pb-err-ic">⚠</span>' : ''}</div>${fecha ? `<div class="pb-jerarquia">${['anio', 'trim', 'mes'].map((p) => `<div class="pb-campo pb-sub" draggable="true" data-t="${esc(t)}" data-c="${esc(c.n)}" data-parte="${p}"><input type="checkbox" tabindex="-1" ${usados.has(`${t}|${c.n}|${p}`) ? 'checked' : ''}><span class="pb-ic"></span>${PARTES[p]}</div>`).join('')}</div>` : ''}`; }).join('')).join('') + jerarquias(t).map((h) => `<div class="pb-campo pb-jer" draggable="true" data-jer="${esc(t)}" data-jern="${esc(h.nombre)}" title="Jerarquía: ${esc(h.niveles.join(' › '))}. Arrástrala (o haz clic) para usar todos sus niveles y explorar en profundidad."><input type="checkbox" tabindex="-1"><span class="pb-ic">${fl('text_bullet_list_tree')}</span><span class="pb-nombre">${esc(h.nombre)}</span></div><div class="pb-jerarquia">${h.niveles.map((n) => `<div class="pb-campo pb-sub" draggable="true" data-t="${esc(t)}" data-c="${esc(n)}"><input type="checkbox" tabindex="-1" ${usados.has(`${t}|${n}|`) ? 'checked' : ''}><span class="pb-ic"></span>${esc(n)}</div>`).join('')}</div>`).join('') + tb.calc.filter((cc) => cc.error).map((cc) => `<div class="pb-campo pb-campo-error" title="${esc(cc.error)}"><span class="pb-ic">⚠</span>${esc(cc.nombre)} (error)</div>`).join('') : ''}` + jerHtml;
    }).join('');
  }
  function renderPaneles() {
    const pan = main.querySelector('#pbPaneles'); if (!pan || S.vista !== 'informe') return;
    const v = S.sel && vis(S.sel);
    const usados = new Set(v ? Object.values(v.pozos).flat().map(campoKey) : []);
    const datos = `<div class="pb-pan"><div class="pb-pan-t">Datos <span class="spacer"></span><button data-ver-ocultos title="${S.verOcultos ? 'Ocultar los campos ocultos' : 'Ver ocultos'}" class="${S.verOcultos ? 'on' : ''}">${fl('eye')}</button><button data-pliega="datos">⟩</button></div><input class="pb-buscar" placeholder="Buscar" data-buscar value="${esc(S.buscar || '')}"><div class="pb-arbol">${tablas().length ? arbolDatos(usados) : '<p class="pb-ayuda">Todavía no hay datos. Usa <b>Obtener datos</b>.</p>'}</div></div>`;
    let viz = `<div class="pb-pan"><div class="pb-pan-t">Visualizaciones <button data-pliega="vis">⟩</button></div><div class="pb-viz-tabs"><span data-panelvis="crear" class="${S.panelVis !== 'formato' ? 'on' : ''}">${fl('data_bar_vertical_add')} Crear objeto visual</span><span data-panelvis="formato" class="${S.panelVis === 'formato' ? 'on' : ''}">${fl('color')} Formato</span>${v && window.PBIInforme && window.PBIInforme.tieneAnalisis(v) ? `<span data-panelvis="analisis" class="${S.panelVis === 'analisis' ? 'on' : ''}" title="Análisis">${fl('search')} Análisis</span>` : ''}</div>`;
    const XI = window.PBIInforme;
    if (S.panelVis === 'analisis' && v && XI && XI.tieneAnalisis(v)) viz += XI.panelAnalisis(v);
    else if (S.panelVis === 'formato' && !v && XI) viz += XI.panelPagina();
    else if (S.panelVis !== 'formato' || !v) {
      viz += `<div class="pb-galeria">${Object.entries(V().TIPOS).filter(([, x]) => !x.oculto).map(([k, x]) => `<button data-tipo="${k}" class="${v && v.tipo === k ? 'on' : ''}" title="${esc(x.n)}">${V().ICO[k]}</button>`).join('')}</div>`;
      if (v && v.tipo !== 'texto' && V().TIPOS[v.tipo].pozos.length) viz += V().TIPOS[v.tipo].pozos.map(([k, nombre, , clase]) => `<div class="pb-pozo-t">${esc(nombre)}</div><div class="pb-pozo" data-pozo="${k}" data-clase="${clase}">${(v.pozos[k] || []).map((f, i) => `<div class="pb-chip" draggable="true" data-chip="${k}:${i}"><span>${esc(nomCampo(f))}</span>${!f.medida && (clase !== 'cat' || f.agg) ? `<select data-agg="${k}:${i}" title="Resumen">${Object.entries(AGG).filter(([a]) => clase === 'mixto' || a !== 'none').map(([a, n]) => `<option value="${a}" ${f.agg === a ? 'selected' : ''}>${n}</option>`).join('')}</select>` : ''}<button data-quitar="${k}:${i}" title="Quitar">✕</button></div>`).join('') || '<span class="pb-pozo-vacio">Agregar campos de datos aquí</span>'}</div>`).join('');
      else if (v && v.tipo === 'texto') viz += '<p class="pb-ayuda">Cuadro de texto: haz doble clic sobre él en el lienzo para escribir. Su formato está en la pestaña Formato.</p>';
      else if (v && XI && XI.dibuja(v)) viz += `<p class="pb-ayuda">${v.tipo === 'qa' ? 'Preguntas y respuestas: escribe la pregunta en el objeto visual (por ejemplo, "ventas por país").' : v.tipo === 'narrativa' ? 'Narración inteligente: resume en texto los otros objetos visuales de la página.' : 'Este elemento no usa campos de datos. Su estilo y su acción están en la pestaña Formato.'}</p>`;
      else viz += '<p class="pb-ayuda">Selecciona un objeto visual en el lienzo para ver sus campos y su formato, o elige un tipo de arriba para crear uno. También puedes arrastrar un campo del panel Datos al lienzo.</p>' + (XI ? XI.pozosPagina() : '');
    } else viz += panelFormato(v) + (XI && !S.fmtGeneral ? XI.panelCond(v) : '');
    viz += '</div>';
    const tarjetasFiltro = (lista, nivel) => lista.map((f, i) => tarjetaFiltro(f, nivel, i)).join('');
    const filtrosVis = v && v.tipo !== 'texto' && V().TIPOS[v.tipo].pozos.length ? Object.values(v.pozos).flat().filter((f) => !f.medida && !(v.filtros || []).some((x) => campoKey(x.campo) === campoKey(f))).map((f) => `<div class="pb-filtro pb-filtro-auto"><div class="pb-filtro-cab" data-agregar-filtro-vis="${esc(JSON.stringify(f))}"><b>${esc(nomCampo(f))}</b><span class="pb-dim">es (Todos)</span></div></div>`).join('') : '';
    const filtros = `<div class="pb-pan pb-pan-filtros"><div class="pb-pan-t">Filtros <button data-pliega="filtros">⟩</button></div>
      ${v ? `<div class="pb-pozo-t">Filtros en este objeto visual</div><div class="pb-pozo pb-pozo-f" data-pozo="__fvis" data-clase="cat">${filtrosVis}${tarjetasFiltro(v.filtros || [], 'vis')}<span class="pb-pozo-vacio">Agregar campos de datos aquí</span></div>` : ''}
      <div class="pb-pozo-t">Filtros en esta página</div><div class="pb-pozo pb-pozo-f" data-pozo="__filtro" data-clase="cat">${tarjetasFiltro(pag().filtros, 'pag')}<span class="pb-pozo-vacio">Agregar campos de datos aquí</span></div>
      <div class="pb-pozo-t">Filtros en todas las páginas</div><div class="pb-pozo pb-pozo-f" data-pozo="__todas" data-clase="cat">${tarjetasFiltro(S.filtrosTodas, 'todas')}<span class="pb-pozo-vacio">Agregar campos de datos aquí</span></div>
      ${S.cruz ? `<div class="pb-cruz">Filtrado cruzado: <b>${esc(nomCampo(S.cruz.campo))} = ${esc(S.cruz.valor ?? '(En blanco)')}</b> <button data-limpiar-cruz>Quitar</button></div>` : ''}</div>`;
    const reto = S.reto ? `<div class="pb-pan pb-reto"><div class="pb-pan-t">🎯 Reto: tu primer informe <button data-acc="reto" title="Ocultar">✕</button></div>${RETO.map(([t, f]) => { let ok = false; try { ok = f(); } catch (e) { ok = false; } return `<div class="pb-reto-i ${ok ? 'ok' : ''}">${ok ? '✅' : '⬜'} ${esc(t)}</div>`; }).join('')}<div class="pb-pan-t pb-reto-av">🏆 Retos avanzados</div>${RETO_AV.map(([t, f]) => { let ok = false; try { ok = f(); } catch (e) { ok = false; } return `<div class="pb-reto-i ${ok ? 'ok' : ''}">${ok ? '✅' : '⬜'} ${esc(t)}</div>`; }).join('')}<p class="pb-ayuda">Con cualquier dataset: un CSV tuyo, un Excel o las bases del curso.</p></div>` : '';
    const analizador = S.analizador ? `<div class="pb-pan pb-analizador"><div class="pb-pan-t">Analizador de rendimiento <button data-acc="analizador">✕</button></div><div class="row" style="padding:0 12px"><button class="pb-btn" data-acc="actualizar">Actualizar objetos visuales</button></div>${pag().visuales.map((x) => { const t = tiempos[x.id]; if (!t) return ''; return `<div class="pb-an-i"><b>${esc(tituloDe(x) || V().TIPOS[x.tipo].n)}</b>${t.error ? `<span class="pb-err">${esc(t.error)}</span>` : `<span>Consulta DAX: ${t.consulta.toFixed(0)} ms</span><span>Objeto visual: ${t.visual.toFixed(0)} ms</span><button data-copiar-dax="${esc(x.id)}">Copiar consulta</button>`}</div>`; }).join('') || '<p class="pb-ayuda">Interactúa con el informe o pulsa Actualizar.</p>'}</div>` : '';
    const col = (k, html) => (S.paneles[k] ? `<div class="pb-pan-col pb-col-${k}">${html}</div>` : `<div class="pb-pan-col pb-col-plegada" data-despliega="${k}" title="Mostrar panel">${{ filtros: 'Filtros', vis: 'Visualizaciones', datos: 'Datos' }[k]}</div>`);
    pan.innerHTML = lectura ? col('filtros', filtros) : (XI ? XI.panelesExtra() : '') + col('filtros', reto + analizador + filtros) + col('vis', viz) + col('datos', datos);
    enlazarPaneles(pan, v);
    if (XI) XI.enlazarPaneles(pan, v);
  }
  function tarjetaFiltro(f, nivel, i) {
    const efect = filtroEfectivo(f);
    const resumen = f.tipo === 'avanzado' && efect ? `${D().OPS_FILTRO[f.cond.op] || f.cond.op} ${f.cond.val ?? ''}` : f.tipo === 'topn' && efect ? `${f.topn.dir || 'Superior'} ${f.topn.n} por ${f.topn.por && nomCampo(f.topn.por)}` : f.valores && f.valores.length ? `es ${f.valores.slice(0, 2).map((x) => x ?? '(En blanco)').join(', ')}${f.valores.length > 2 ? '…' : ''}` : 'es (Todos)';
    const id = `${nivel}:${i}`;
    let cuerpo = '';
    if (f.abierto) {
      cuerpo += `<label class="pb-ftipo">Tipo de filtro<select data-ftipo="${id}"><option value="basico" ${f.tipo === 'basico' ? 'selected' : ''}>Filtro básico</option><option value="avanzado" ${f.tipo === 'avanzado' ? 'selected' : ''}>Filtro avanzado</option><option value="topn" ${f.tipo === 'topn' ? 'selected' : ''}>N superior</option></select></label>`;
      if (f.tipo === 'avanzado') cuerpo += `<p class="pb-dim small">Mostrar los elementos cuando el valor</p><select data-fop="${id}">${[['contiene', 'contiene'], ['nocontiene', 'no contiene'], ['empieza', 'comienza por'], ['termina', 'termina con'], ['=', 'es'], ['<>', 'no es'], ['>', 'es mayor que'], ['>=', 'es mayor o igual que'], ['<', 'es menor que'], ['<=', 'es menor o igual que'], ['blanco', 'está en blanco'], ['noblanco', 'no está en blanco']].map(([k, n]) => `<option value="${k}" ${f.cond && f.cond.op === k ? 'selected' : ''}>${n}</option>`).join('')}</select><input data-fval="${id}" value="${esc(f.cond ? f.cond.val : '')}"><button class="pb-btn" data-faplicar="${id}">Aplicar filtro</button>`;
      else if (f.tipo === 'topn') cuerpo += `<p class="pb-dim small">Mostrar elementos</p><div class="row"><select data-fdir="${id}"><option ${(f.topn || {}).dir !== 'Inferior' ? 'selected' : ''}>Superior</option><option ${(f.topn || {}).dir === 'Inferior' ? 'selected' : ''}>Inferior</option></select><input type="number" min="1" data-fn="${id}" value="${(f.topn || {}).n || 5}" style="width:60px"></div><p class="pb-dim small">Por valor</p><select data-fpor="${id}"><option value="">Elige una medida…</option>${S.medidas.map((m) => `<option value="${esc(m.nombre)}" ${(f.topn || {}).por && f.topn.por.medida === m.nombre ? 'selected' : ''}>${esc(m.nombre)}</option>`).join('')}</select><button class="pb-btn" data-faplicar="${id}">Aplicar filtro</button>`;
      else { let vals = []; try { vals = ejecutar(`SELECT DISTINCT ${motor.colSql(f.campo)} FROM ${q(f.campo.t)} ORDER BY 1 LIMIT 200`).map((x) => x[0]); } catch (e) { vals = []; } const sel = new Set((f.valores || []).map(String)); cuerpo += `<div class="pb-fvals"><label><input type="checkbox" data-fall="${id}" ${!sel.size ? 'checked' : ''}> Seleccionar todo</label>${vals.map((x) => `<label><input type="checkbox" data-fv="${id}" data-val="${esc(x ?? '')}" ${sel.has(String(x)) ? 'checked' : ''}> ${esc(x ?? '(En blanco)')}</label>`).join('')}</div>`; }
    }
    return `<div class="pb-filtro ${efect ? 'pb-filtro-on' : ''}"><div class="pb-filtro-cab" data-fabrir="${id}"><span class="pb-chev">${f.abierto ? '⌄' : '›'}</span><b>${esc(nomCampo(f.campo))}</b><span class="pb-dim">${esc(resumen)}</span><button data-fquitar="${id}" title="Quitar filtro">✕</button></div>${cuerpo}</div>`;
  }
  const listaFiltros = (nivel) => (nivel === 'vis' ? vis(S.sel).filtros : nivel === 'pag' ? pag().filtros : S.filtrosTodas);
  const filtroPorId = (id) => { const [n, i] = id.split(':'); return { lista: listaFiltros(n), i: Number(i), f: listaFiltros(n)[Number(i)] }; };
  function panelFormato(v) {
    const secs = V().seccionesDe(v.tipo), SEC = V().SECC;
    const ctl = (sec, p) => {
      const val = V().fmtGet(v, sec, p.k), id = `${sec}.${p.k}`;
      if (p.tipo === 'bool') return `<label class="pb-fmt pb-fmt-chk"><span>${esc(p.n)}</span><input type="checkbox" class="pb-switch" data-fmt="${id}" ${val ? 'checked' : ''}></label>`;
      if (p.tipo === 'color') return `<label class="pb-fmt"><span>${esc(p.n)}</span><input type="color" data-fmt="${id}" value="${esc(val || paleta()[0])}"></label>`;
      if (p.tipo === 'sel') return `<label class="pb-fmt"><span>${esc(p.n)}</span><select data-fmt="${id}">${(typeof p.opts === 'function' ? p.opts(v) : p.opts).map((o) => `<option ${o === val ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></label>`;
      return `<label class="pb-fmt"><span>${esc(p.n)}</span><input ${p.tipo === 'num' ? 'type="number"' : ''} data-fmt="${id}" value="${esc(val ?? '')}" placeholder="${p.k === 'texto' && sec === 'titulo' ? esc(tituloDe({ ...v, formato: { ...v.formato, titulo: { ...(v.formato.titulo || {}), texto: '' } } }) || 'Automático') : ''}"></label>`;
    };
    const abiertas = new Set(S.fmtAbiertas || ['titulo']);
    const grupo = (k) => { const s = SEC[k]; const ab = abiertas.has(k); return `<div class="pb-fsec ${ab ? 'ab' : ''}"><div class="pb-fsec-t" data-fsec="${k}"><span class="pb-chev">${ab ? '⌄' : '›'}</span>${esc(s.n)}${s.p[0].k === 'mostrar' && !['titulo', 'efectos'].includes(k) ? `<input type="checkbox" class="pb-switch" data-fmt="${k}.mostrar" ${V().fmtGet(v, k, 'mostrar') ? 'checked' : ''}>` : ''}</div>${ab ? `<div class="pb-fsec-c">${s.p.filter((p) => !(p.k === 'mostrar' && !['titulo', 'efectos'].includes(k)) && (!p.si || p.si(v))).map((p) => ctl(k, p)).join('')}${k === 'colores' && v.pozos ? seriesColores(v) : ''}</div>` : ''}</div>`; };
    const visual = secs.filter((k) => !SEC[k].general), general = secs.filter((k) => SEC[k].general);
    return `<div class="pb-fmt-busq"><input placeholder="Buscar" data-fmt-buscar></div><div class="pb-fmt-sub"><span class="${S.fmtGeneral ? '' : 'on'}" data-fmtg="0">Objeto visual</span><span class="${S.fmtGeneral ? 'on' : ''}" data-fmtg="1">General</span></div>${(S.fmtGeneral ? general : visual).map(grupo).join('')}${S.fmtGeneral ? `<div class="pb-fsec ab"><div class="pb-fsec-t">Propiedades</div><div class="pb-fsec-c"><div class="row pb-fmt-pos">${['x', 'y', 'w', 'h'].map((k) => `<label class="pb-fmt"><span>${{ x: 'Posición horizontal', y: 'Posición vertical', w: 'Ancho', h: 'Alto' }[k]} (%)</span><input type="number" data-pos="${k}" value="${Math.round(v[k])}"></label>`).join('')}</div></div></div>` : ''}`;
  }
  function seriesColores(v) {
    let nombres = []; try { const d = datosVisual(v); nombres = d && d.series ? (V().TIPOS[v.tipo].g === 'parte' ? d.cats.slice(0, 12) : d.series.map((s) => s.nombre)) : []; } catch (e) { nombres = []; }
    if (nombres.length < 2) return '';
    return `<div class="pb-dim small" style="margin:6px 0 2px">Colores por ${V().TIPOS[v.tipo].g === 'parte' ? 'categoría' : 'serie'}</div>${nombres.map((n, i) => `<label class="pb-fmt"><span>${esc(n)}</span><input type="color" data-serie="${esc(n)}" value="${esc(((v.formato || {}).series || {})[n] || paleta()[i % paleta().length])}"></label>`).join('')}`;
  }
  function enlazarPaneles(pan, v) {
    pan.querySelectorAll('[data-pliega]').forEach((x) => x.addEventListener('click', () => { S.paneles[x.dataset.pliega] = false; guardar(true); renderPaneles(); }));
    pan.querySelectorAll('[data-ver-ocultos]').forEach((x) => x.addEventListener('click', () => { S.verOcultos = !S.verOcultos; guardar(true); renderPaneles(); }));
    pan.querySelectorAll('[data-despliega]').forEach((x) => x.addEventListener('click', () => { S.paneles[x.dataset.despliega] = true; guardar(true); renderPaneles(); }));
    pan.querySelectorAll('[data-tabla]').forEach((x) => x.addEventListener('click', (e) => { if (e.target.closest('[data-menu-tabla]')) return; const s = new Set(S.tablasAbiertas || tablas().slice(0, 2)); s.has(x.dataset.tabla) ? s.delete(x.dataset.tabla) : s.add(x.dataset.tabla); S.tablasAbiertas = [...s]; guardar(true); renderPaneles(); }));
    pan.querySelectorAll('[data-menu-tabla]').forEach((x) => x.addEventListener('click', (e) => { e.stopPropagation(); menuTabla(x.dataset.menuTabla, x); }));
    const b = pan.querySelector('[data-buscar]'); if (b) b.addEventListener('input', () => { S.buscar = b.value; renderPaneles(); const nb = main.querySelector('[data-buscar]'); nb.focus(); nb.setSelectionRange(99, 99); });
    pan.querySelectorAll('[data-panelvis]').forEach((x) => x.addEventListener('click', () => { S.panelVis = x.dataset.panelvis; if (S.panelVis === 'formato' && !v) toast('Selecciona un objeto visual para darle formato.'); guardar(true); renderPaneles(); }));
    pan.querySelectorAll('[data-fmtg]').forEach((x) => x.addEventListener('click', () => { S.fmtGeneral = x.dataset.fmtg === '1'; guardar(true); renderPaneles(); }));
    pan.querySelectorAll('[data-fsec]').forEach((x) => x.addEventListener('click', (e) => { if (e.target.matches('input')) return; const s = new Set(S.fmtAbiertas || ['titulo']); s.has(x.dataset.fsec) ? s.delete(x.dataset.fsec) : s.add(x.dataset.fsec); S.fmtAbiertas = [...s]; guardar(true); renderPaneles(); }));
    const fb = pan.querySelector('[data-fmt-buscar]'); if (fb) fb.addEventListener('input', () => { const t = fb.value.toLowerCase(); pan.querySelectorAll('.pb-fsec').forEach((s) => { s.style.display = !t || s.textContent.toLowerCase().includes(t) ? '' : 'none'; }); });
    pan.querySelectorAll('[data-fmt]').forEach((x) => x.addEventListener(x.type === 'color' ? 'input' : 'change', () => { const [sec, k] = x.dataset.fmt.split('.'); v.formato[sec] = { ...(v.formato[sec] || {}), [k]: x.type === 'checkbox' ? x.checked : x.type === 'number' ? (x.value === '' ? '' : Number(x.value)) : x.value }; guardar(); render(); }));
    pan.querySelectorAll('[data-serie]').forEach((x) => x.addEventListener('input', () => { v.formato.series = { ...(v.formato.series || {}), [x.dataset.serie]: x.value }; guardar(); render(); }));
    pan.querySelectorAll('[data-pos]').forEach((x) => x.addEventListener('change', () => { v[x.dataset.pos] = Math.max(0, Math.min(100, Number(x.value) || 0)); guardar(); render(); }));
    pan.querySelectorAll('[data-tipo]').forEach((x) => x.addEventListener('click', () => {
      if (!tablas().length) { toast('Primero obtén datos.'); return; }
      if (!v) { agregarVisual(x.dataset.tipo); return; }
      cambiarTipo(v, x.dataset.tipo); guardar(); render();
    }));
    pan.querySelectorAll('[data-quitar]').forEach((x) => x.addEventListener('click', () => { const [k, i] = x.dataset.quitar.split(':'); v.pozos[k].splice(Number(i), 1); if (S.cruz && S.cruz.visual === v.id) S.cruz = null; guardar(); render(); }));
    pan.querySelectorAll('[data-agg]').forEach((x) => x.addEventListener('change', () => { const [k, i] = x.dataset.agg.split(':'); v.pozos[k][Number(i)].agg = x.value; guardar(); render(); }));
    pan.querySelectorAll('[data-chip]').forEach((x) => x.addEventListener('dragstart', (e) => { const [k, i] = x.dataset.chip.split(':'); e.dataTransfer.setData('text/plain', JSON.stringify({ ...v.pozos[k][Number(i)], _de: x.dataset.chip })); }));
    const lc = pan.querySelector('[data-limpiar-cruz]'); if (lc) lc.addEventListener('click', () => { S.cruz = null; guardar(true); render(); });
    pan.querySelectorAll('[data-copiar-dax]').forEach((x) => x.addEventListener('click', () => { const t = daxDe(vis(x.dataset.copiarDax)); navigator.clipboard && navigator.clipboard.writeText(t).catch(() => {}); S.daxTabs.push({ nombre: `Consulta ${S.daxTabs.length + 1}`, texto: t }); S.daxTab = S.daxTabs.length - 1; guardar(true); toast('Consulta DAX copiada. También está en la vista de consultas DAX.'); }));
    // filtros
    pan.querySelectorAll('[data-agregar-filtro-vis]').forEach((x) => x.addEventListener('click', () => { v.filtros.push({ campo: JSON.parse(x.dataset.agregarFiltroVis), tipo: 'basico', valores: [], abierto: true }); guardar(); renderPaneles(); }));
    pan.querySelectorAll('[data-fabrir]').forEach((x) => x.addEventListener('click', (e) => { if (e.target.closest('[data-fquitar]')) return; const { f } = filtroPorId(x.dataset.fabrir); f.abierto = !f.abierto; guardar(true); renderPaneles(); }));
    pan.querySelectorAll('[data-fquitar]').forEach((x) => x.addEventListener('click', () => { const { lista, i } = filtroPorId(x.dataset.fquitar); lista.splice(i, 1); guardar(); render(); }));
    pan.querySelectorAll('[data-ftipo]').forEach((x) => x.addEventListener('change', () => { const { f } = filtroPorId(x.dataset.ftipo); f.tipo = x.value; guardar(); render(); }));
    pan.querySelectorAll('[data-fall]').forEach((x) => x.addEventListener('change', () => { const { f } = filtroPorId(x.dataset.fall); f.valores = []; guardar(); render(); }));
    pan.querySelectorAll('[data-fv]').forEach((x) => x.addEventListener('change', () => { const { f } = filtroPorId(x.dataset.fv); const raw = x.dataset.val, val = raw === '' ? null : !f.campo.parte && ['num', 'int'].includes(tipoDe(f.campo.t, f.campo.c)) ? Number(raw) : f.campo.parte === 'anio' ? Number(raw) : raw; const s = new Set(f.valores || []); x.checked ? s.add(val) : s.delete(val); f.valores = [...s]; guardar(); render(); }));
    pan.querySelectorAll('[data-faplicar]').forEach((x) => x.addEventListener('click', () => { const id = x.dataset.faplicar; const { f } = filtroPorId(id); if (f.tipo === 'avanzado') f.cond = { op: pan.querySelector(`[data-fop="${id}"]`).value, val: pan.querySelector(`[data-fval="${id}"]`).value }; else { const m = pan.querySelector(`[data-fpor="${id}"]`).value; if (!m) { toast('Elige la medida por la que se ordena.'); return; } f.topn = { dir: pan.querySelector(`[data-fdir="${id}"]`).value, n: Number(pan.querySelector(`[data-fn="${id}"]`).value) || 5, por: { medida: m } }; } guardar(); render(); }));
    // campos del panel Datos
    pan.querySelectorAll('.pb-campo[draggable]').forEach((x) => {
      x.addEventListener('click', (e) => {
        e.preventDefault();
        const f = campoDe(x);
        if (f.medida) { S.medidaSel = f.medida; S.colSel = null; } else { S.colSel = { t: f.t, c: f.c }; S.medidaSel = null; }
        refrescarCinta();
        // como en Power BI: con un objeto visual seleccionado, el campo se agrega (o se quita si ya estaba);
        // sin selección, se crea un objeto visual nuevo con ese campo
        if (!v) { agregarVisualCon(f); return; }
        if (f.jer) { agregarCampo(v, f); return; }
        const enUso = Object.values(v.pozos).flat().some((x) => campoKey(x) === campoKey(f));
        if (enUso) quitarCampo(v, f); else agregarCampo(v, f);
      });
      x.addEventListener('contextmenu', (e) => { e.preventDefault(); if (window.PBIInforme) window.PBIInforme.menuCampo(campoDe(x), e); else menuCampo(campoDe(x), x); });
      x.addEventListener('dragstart', (e) => e.dataTransfer.setData('text/plain', JSON.stringify(campoDe(x))));
    });
    pan.querySelectorAll('.pb-pozo').forEach((z) => {
      z.addEventListener('dragover', (e) => { e.preventDefault(); z.classList.add('sobre'); });
      z.addEventListener('dragleave', () => z.classList.remove('sobre'));
      z.addEventListener('drop', (e) => {
        e.preventDefault(); e.stopPropagation(); z.classList.remove('sobre'); let f; try { f = JSON.parse(e.dataTransfer.getData('text/plain')); } catch (err) { return; }
        const de = f._de; delete f._de;
        const destino = z.dataset.pozo;
        if (destino.startsWith('__')) { if (f.medida) { toast('Los filtros de página y de informe son sobre columnas. Para filtrar por una medida usa "N superior" o un filtro de objeto visual.'); return; } const lista = destino === '__fvis' ? v.filtros : destino === '__todas' ? S.filtrosTodas : pag().filtros; lista.push({ campo: { t: f.t, c: f.c, ...(f.parte ? { parte: f.parte } : {}) }, tipo: 'basico', valores: [], abierto: true }); guardar(); renderPaneles(); return; }
        if (de) { const [k, i] = de.split(':'); v.pozos[k].splice(Number(i), 1); }
        agregarCampo(v, f, destino);
      });
    });
  }
  function cambiarTipo(v, tipo) {
    const P = v.pozos;
    const todosC = Object.values(P).flat();
    const cats = todosC.filter((c) => !c.medida && (!c.agg || c.agg === 'none')), vals = todosC.filter((c) => c.medida || (c.agg && c.agg !== 'none'));
    v.tipo = tipo; const T = V().TIPOS[tipo];
    const pozos = {};
    if (tipo === 'tarjeta') pozos.valores = vals.slice(0, 1);
    else if (tipo === 'tarjetaFilas') pozos.valores = vals.slice(0, 8);
    else if (tipo === 'tabla') pozos.cols = [...cats, ...vals];
    else if (tipo === 'segmentacion') pozos.x = cats.slice(0, 1);
    else if (tipo === 'matriz') { pozos.x = cats.slice(0, 1); pozos.leyenda = cats.slice(1, 2); pozos.y = vals.slice(0, 5); }
    else if (tipo === 'dispersion') { pozos.detalle = cats.slice(0, 1); pozos.ex = vals.slice(0, 1); pozos.ey = vals.slice(1, 2); pozos.tam = vals.slice(2, 3); }
    else if (T.g === 'medidor') { pozos.y = vals.slice(0, 1); pozos.meta = vals.slice(1, 2); }
    else if (T.g === 'kpi') { pozos.y = vals.slice(0, 1); pozos.x = cats.slice(0, 1); pozos.meta = vals.slice(1, 2); }
    else if (tipo === 'lineaColumna') { pozos.x = cats.slice(0, 1); pozos.y = vals.slice(0, 1); pozos.linea = vals.slice(1, 3); }
    else { pozos.x = cats.slice(0, 1); pozos.y = vals.slice(0, T.g === 'parte' || tipo === 'cascada' ? 1 : 5); if (T.pozos.some((p) => p[0] === 'leyenda') && T.g === 'cart') pozos.leyenda = cats.slice(1, 2); }
    v.pozos = pozos; v.orden = null;
  }
  const campoDe = (x) => (x.dataset.jer ? { jer: { t: x.dataset.jer, nombre: x.dataset.jern } } : x.dataset.medida ? { medida: x.dataset.medida } : { t: x.dataset.t, c: x.dataset.c, ...(x.dataset.parte ? { parte: x.dataset.parte } : {}) });
  function agregarVisualCon(f) {
    if (f.jer) { const v = agregarVisual('columnaAgrupada'); agregarCampo(v, f); return; }
    const esValor = !!f.medida || (!f.parte && esNum(f.t, f.c));
    const v = agregarVisual(esValor ? 'columnaAgrupada' : 'tabla');
    agregarCampo(v, f);
  }
  function quitarCampo(v, f) { for (const k in v.pozos) v.pozos[k] = v.pozos[k].filter((x) => campoKey(x) !== campoKey(f)); guardar(); render(); }
  function agregarCampo(v, f, pozo) {
    if (!v) return;
    if (f.jer) { const h = jerarquias(f.jer.t).find((x) => x.nombre === f.jer.nombre); if (!h) return; const destino = pozo || ((V().TIPOS[v.tipo].pozos.find(([, , max, clase]) => clase === 'cat' && max > 1) || V().TIPOS[v.tipo].pozos.find(([, , , clase]) => clase === 'cat' || clase === 'mixto') || [])[0]); for (const c of h.niveles) agregarCampo(v, { t: f.jer.t, c }, destino); v.nivel = 0; return; }
    const pozos = V().TIPOS[v.tipo].pozos, esValor = !!f.medida || (!f.parte && esNum(f.t, f.c));
    if (!pozo) pozo = (pozos.find(([k, , max, clase]) => (clase === 'mixto' || (esValor ? clase === 'valor' : clase === 'cat')) && (v.pozos[k] || []).length < max) || pozos.find(([, , , clase]) => clase === 'mixto' || (esValor ? clase === 'valor' : clase === 'cat')) || pozos[0] || [])[0];
    const def = pozos.find((p) => p[0] === pozo); if (!def) return;
    const [, , max, clase] = def;
    const campo = { ...f };
    if ((clase === 'valor' || (clase === 'mixto' && esValor)) && !f.medida) { const r = ((S.tablas[f.t] || {}).resumen || {})[f.c]; campo.agg = r && r !== 'none' ? r : esNum(f.t, f.c) ? 'sum' : 'count'; }
    if (clase === 'mixto' && !esValor && !f.medida) campo.agg = 'none';
    if (clase === 'cat' && f.medida) { toast('Una medida no puede ir en un eje o en la leyenda: va en Valores o en el Eje Y.'); return; }
    v.pozos[pozo] = v.pozos[pozo] || [];
    if (v.pozos[pozo].length >= max) v.pozos[pozo].splice(max - 1, 1);
    v.pozos[pozo].push(campo); v.orden = null; guardar(); render();
  }
  function menuTabla(t, el) {
    const prev = document.querySelector('.pq-menu'); if (prev) prev.remove();
    const r = el.getBoundingClientRect(); const menu = document.createElement('div'); menu.className = 'pq-menu'; menu.style.left = Math.min(r.left, innerWidth - 240) + 'px'; menu.style.top = r.bottom + 'px';
    const calc = S.tablas[t].fuente.tipo === 'dax';
    menu.innerHTML = `<div data-mt="medida">${fl('calculator')} Nueva medida</div><div data-mt="columna">${fl('table_column_top_bottom')} Nueva columna</div><div data-mt="rapida">${fl('flash')} Nueva medida rápida</div><hr>${calc ? `<div data-mt="editar">${fl('code')} Editar la fórmula de la tabla</div>` : `<div data-mt="pq">${fl('table')} Editar consulta (Power Query)</div>`}<div data-mt="renombrar">${fl('textbox')} Cambiar nombre</div><div data-mt="ver">${fl('table_simple')} Ver los datos</div><div data-mt="tmdl">${fl('document')} Script TMDL</div><hr><div data-mt="borrar">${fl('dismiss')} Eliminar del modelo</div>`;
    document.body.appendChild(menu);
    setTimeout(() => document.addEventListener('mousedown', function f(e) { if (!menu.contains(e.target)) { menu.remove(); document.removeEventListener('mousedown', f); } }), 0);
    menu.addEventListener('click', async (e) => {
      const o = e.target.closest('[data-mt]'); if (!o) return; menu.remove(); const k = o.dataset.mt;
      if (k === 'medida') barraFormula({ tipo: 'medida', tabla: t });
      else if (k === 'columna') barraFormula({ tipo: 'columna', tabla: t });
      else if (k === 'rapida') medidaRapida();
      else if (k === 'pq') powerQuery(t);
      else if (k === 'editar') barraFormula({ tipo: 'tabla', obj: { nombre: t, expr: S.tablas[t].fuente.expr } });
      else if (k === 'ver') { S.vista = 'tabla'; S.tablaDatos = t; guardar(true); render(); }
      else if (k === 'tmdl') { construir(); S.tmdlTabs.push({ nombre: `Script ${S.tmdlTabs.length + 1}`, texto: `createOrReplace\n\n${tmdlTabla(t, '\t')}` }); S.tmdlTab = S.tmdlTabs.length - 1; S.vista = 'tmdl'; guardar(true); render(); }
      else if (k === 'renombrar') { const r2 = await pedir('Cambiar nombre de la tabla', [{ n: 'Nombre', v: t }]); if (r2 && r2[0].trim() && r2[0] !== t && !S.tablas[r2[0]]) { renombrarTabla(t, r2[0].trim()); render(); } }
      else if (k === 'borrar') { if (!confirm(`¿Eliminar la tabla ${t} del modelo? También se quitan sus relaciones y los campos que la usan.`)) return; delete S.tablas[t]; S.rels = S.rels.filter((r) => r.de !== t && r.a !== t); for (const v of todos()) for (const kk in v.pozos) v.pozos[kk] = v.pozos[kk].filter((f) => f.t !== t); S.medidas = S.medidas.map((m) => (m.tabla === t ? { ...m, tabla: tablas()[0] } : m)); cambioModelo(); guardar(); render(); }
    });
  }
  function menuCampo(f, el) {
    if (f.medida) { S.medidaSel = f.medida; S.cinta = 'medida'; pintar(); return; }
    S.colSel = { t: f.t, c: f.c }; S.cinta = 'columna'; pintar(); void el;
  }

  // ---------------------------------------------------------------- barra de fórmulas (medidas, columnas, tablas)
  function barraFormula({ tipo, obj, tabla }) {
    const bar = main.querySelector('#pbDax'); bar.hidden = false;
    const ts = tablas(), t0 = tabla || (obj && obj.tabla) || ts[0], col0 = (meta(t0).find((c) => ['num', 'int'].includes(c.t)) || meta(t0)[0] || { n: 'columna' }).n;
    const ref = (t) => (/^[A-Za-z_]\w*$/.test(t) ? t : `'${t}'`);
    const inicial = obj ? `${obj.nombre} = ${obj.expr}` : tipo === 'medida' ? 'Medida = ' : tipo === 'columna' ? 'Columna = ' : 'Tabla = ';
    const ayuda = tipo === 'medida' ? `Ejemplos: <code>Total = SUM(${esc(ref(t0))}[${esc(col0)}])</code> · <code>Filas = COUNTROWS(${esc(ref(t0))})</code> · <code>% del total = DIVIDE([Total], CALCULATE([Total], ALL(${esc(ref(t0))})))</code> · <code>Acumulado año = TOTALYTD([Total], 'Calendario'[Date])</code> · <code>VAR x = [Total] RETURN IF(x > 1000, "Alto", "Bajo")</code>`
      : tipo === 'columna' ? `Se calcula fila por fila en la tabla <b>${esc(t0)}</b>. Ejemplos: <code>Importe = ${esc(ref(t0))}[${esc(col0)}] * 2</code> · <code>Año = YEAR(${esc(ref(t0))}[fecha])</code> · <code>Categoría = RELATED(Productos[categoria])</code> · <code>Tamaño = IF(${esc(ref(t0))}[${esc(col0)}] > 100, "Grande", "Chica")</code>`
        : 'Una tabla calculada con DAX. Ejemplos: <code>Calendario = CALENDARAUTO()</code> · <code>Calendario = ADDCOLUMNS(CALENDAR(DATE(2024,1,1), DATE(2025,12,31)), "Año", YEAR([Date]), "Mes", FORMAT([Date], "MMMM"))</code> · <code>Top = TOPN(10, Ventas, Ventas[monto])</code>';
    bar.innerHTML = `<span class="pb-dax-x" title="Cancelar (Esc)">✕</span><span class="pb-dax-ok" title="Confirmar (Enter)">✓</span><div class="pb-dax-ed"><div class="pb-dax-lin"><span class="pb-dax-n">1</span><textarea spellcheck="false" rows="2">${esc(inicial)}</textarea></div><div class="pb-dax-sug" hidden></div><div class="pb-dax-ayuda">${ayuda}</div><div class="pb-dax-err"></div></div>${tipo === 'medida' ? `<label class="pb-dax-tabla">Tabla de inicio <select>${ts.map((t) => `<option ${t === t0 ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></label>` : tipo === 'columna' ? `<label class="pb-dax-tabla">Tabla <select>${ts.map((t) => `<option ${t === t0 ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></label>` : ''}`;
    const ta = bar.querySelector('textarea'); ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length);
    const sug = bar.querySelector('.pb-dax-sug');
    const cerrar = () => { bar.hidden = true; bar.innerHTML = ''; };
    // IntelliSense básico: funciones, tablas, columnas y medidas
    const opciones = () => [...window.PBIDax.FUNCIONES.map((f) => ({ t: f + '(', d: 'función' })), ...ts.flatMap((t) => [{ t: ref(t), d: 'tabla' }, ...meta(t).map((c) => ({ t: `${ref(t)}[${c.n}]`, d: 'columna' }))]), ...S.medidas.map((m) => ({ t: `[${m.nombre}]`, d: 'medida' }))];
    ta.addEventListener('input', () => {
      const antes = ta.value.slice(0, ta.selectionStart); const m = /([\w'\[À-ÿ][\w\s'\[À-ÿ]*)$/.exec(antes.split(/[\s(,=+\-*/<>&]/).pop() || '');
      const pal = m ? m[1] : ''; if (pal.length < 2) { sug.hidden = true; return; }
      const lista = opciones().filter((o) => o.t.toLowerCase().startsWith(pal.toLowerCase()) || o.t.toLowerCase().includes('[' + pal.toLowerCase().replace(/^\[/, ''))).slice(0, 8);
      if (!lista.length) { sug.hidden = true; return; }
      sug.hidden = false; sug.innerHTML = lista.map((o, i) => `<div data-s="${esc(o.t)}" class="${i ? '' : 'on'}"><b>${esc(o.t)}</b><small>${o.d}</small></div>`).join(''); sug.dataset.pal = pal;
    });
    sug.addEventListener('mousedown', (e) => { const o = e.target.closest('[data-s]'); if (!o) return; e.preventDefault(); insertar(o.dataset.s); });
    const insertar = (txt) => { const pal = sug.dataset.pal || ''; const i = ta.selectionStart; ta.value = ta.value.slice(0, i - pal.length) + txt + ta.value.slice(i); ta.selectionStart = ta.selectionEnd = i - pal.length + txt.length; sug.hidden = true; ta.focus(); };
    const confirmar = () => {
      const m = /^\s*([^=]+?)\s*=\s*([\s\S]+)$/.exec(ta.value), errEl = bar.querySelector('.pb-dax-err');
      if (!m) { errEl.textContent = `Se escribe "Nombre = expresión".`; return; }
      const nombre = m[1].trim().replace(/^'|'$/g, ''), expr = m[2].trim();
      construir();
      try {
        if (tipo === 'medida') {
          const otras = S.medidas.filter((x) => x !== obj);
          if (otras.some((x) => x.nombre.toLowerCase() === nombre.toLowerCase())) throw new Error(`Ya existe una medida llamada "${nombre}".`);
          if (tablas().some((t) => meta(t).some((c) => c.n.toLowerCase() === nombre.toLowerCase()))) throw new Error(`"${nombre}" ya es el nombre de una columna: usa otro nombre para la medida.`);
          motor.validarMedida(expr, { nombre, expr });
          const tabla2 = bar.querySelector('select').value;
          if (obj) { if (obj.nombre !== nombre) renombrarMedida(obj, nombre); Object.assign(obj, { expr, tabla: tabla2 }); } else S.medidas.push({ nombre, expr, tabla: tabla2 });
          S.medidaSel = nombre; S.cinta = 'medida';
          toast(`Medida [${nombre}] ${obj ? 'actualizada' : 'creada'} en ${tabla2}.`);
        } else if (tipo === 'columna') {
          const t = bar.querySelector('select').value;
          if (meta(t).some((c) => c.n.toLowerCase() === nombre.toLowerCase() && !(obj && obj.nombre === c.n))) throw new Error(`La tabla ${t} ya tiene una columna "${nombre}".`);
          const sql = motor.columnaCalculada(t, expr); construir().exec(`SELECT ${sql} FROM ${q(t)} LIMIT 3`);
          const cc = S.tablas[t].calc.find((x) => obj && x.nombre === obj.nombre); if (cc) Object.assign(cc, { nombre, expr }); else S.tablas[t].calc.push({ nombre, expr });
          S.colSel = { t, c: nombre }; S.cinta = 'columna'; cambioModelo();
          toast(`Columna calculada ${nombre} agregada a ${t}.`);
        } else {
          if (S.tablas[nombre] && !(obj && obj.nombre === nombre)) throw new Error(`Ya existe una tabla "${nombre}".`);
          const r = motor.tablaCalculada(expr); if (!r.cols.length) throw new Error('La expresión no devuelve columnas.');
          if (obj && obj.nombre !== nombre) renombrarTabla(obj.nombre, nombre);
          if (S.tablas[nombre]) S.tablas[nombre].fuente.expr = expr; else S.tablas[nombre] = { fuente: { tipo: 'dax', expr }, pasos: [], calc: [], resumen: {} };
          cambioModelo(); construir(); const rels = autodetectar();
          toast(`Tabla calculada ${nombre}: ${r.filas.length.toLocaleString('es')} filas.${rels.length ? ' Relaciones: ' + rels.join(' · ') : ''}${/CALENDAR/i.test(expr) ? ' Relaciónala con la fecha de tu tabla de hechos para usar inteligencia de tiempo.' : ''}`, 6000);
        }
      } catch (e) { errEl.textContent = '⚠ ' + e.message; return; }
      guardar(); cerrar(); pintar();
    };
    bar.querySelector('.pb-dax-ok').addEventListener('click', confirmar);
    bar.querySelector('.pb-dax-x').addEventListener('click', cerrar);
    ta.addEventListener('keydown', (e) => {
      if (!sug.hidden && (e.key === 'Tab' || (e.key === 'Enter' && sug.querySelector('.on')))) { e.preventDefault(); insertar(sug.querySelector('.on').dataset.s); return; }
      if (!sug.hidden && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { e.preventDefault(); const it = [...sug.children]; const i = it.findIndex((x) => x.classList.contains('on')); it[i].classList.remove('on'); it[(i + (e.key === 'ArrowDown' ? 1 : it.length - 1)) % it.length].classList.add('on'); return; }
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); confirmar(); }
      if (e.key === 'Escape') { if (!sug.hidden) sug.hidden = true; else cerrar(); }
    });
  }
  // medidas rápidas (Inicio → Medida rápida), las mismas plantillas que documenta Power BI
  async function medidaRapida() {
    construir();
    const bases = [...S.medidas.map((m) => [`m:${m.nombre}`, `[${m.nombre}]`]), ...tablas().flatMap((t) => meta(t).filter((c) => esNum(t, c.n)).map((c) => [`c:${t}|${c.n}`, `Suma de ${t}[${c.n}]`]))];
    if (!bases.length) { toast('Necesitas una medida o una columna numérica.'); return; }
    const cols = tablas().flatMap((t) => meta(t).map((c) => [`${t}|${c.n}`, `${t}[${c.n}]`]));
    const fechas = tablas().flatMap((t) => meta(t).filter((c) => c.t === 'fecha').map((c) => [`${t}|${c.n}`, `${t}[${c.n}]`]));
    const CALC = [['promcat', 'Promedio por categoría'], ['filtrado', 'Valor filtrado'], ['difFiltro', 'Diferencia con el valor filtrado'], ['pctTotal', 'Porcentaje del total general'], ['acum', 'Total acumulado'], ['ytd', 'Total del año hasta la fecha'], ['yoy', 'Cambio año tras año (%)'], ['rank', 'Clasificación'], ['mom', 'Cambio mes tras mes (%)']];
    const r = await pedir('Medidas rápidas', [{ n: 'Cálculo', opts: CALC }, { n: 'Valor base', opts: bases }, { n: 'Categoría o campo (para promedio, filtro, clasificación o acumulado)', opts: cols }, { n: 'Fecha (para cálculos de tiempo)', opts: fechas.length ? fechas : [['', 'No hay columnas de fecha']] }, { n: 'Valor del filtro (para "valor filtrado")', v: '' }, { n: 'Nombre de la medida', v: '' }]);
    if (!r) return;
    const [calc, base, catK, fechaK, valF, nombreIn] = r;
    const baseExpr = base.startsWith('m:') ? `[${base.slice(2)}]` : (() => { const [t, c] = base.slice(2).split('|'); return `SUM('${t}'[${c}])`; })();
    const baseNom = base.startsWith('m:') ? base.slice(2) : `Suma de ${base.split('|')[1]}`;
    const [ct, cc] = (catK || '').split('|'), cat = `'${ct}'[${cc}]`;
    const [ft, fc] = (fechaK || '').split('|'), fecha = `'${ft}'[${fc}]`;
    const litV = isNaN(Number(valF)) || valF === '' ? `"${String(valF).replace(/"/g, '""')}"` : valF;
    const plantillas = {
      promcat: [`${baseNom} promedio por ${cc}`, `AVERAGEX(\n    KEEPFILTERS(VALUES(${cat})),\n    CALCULATE(${baseExpr})\n)`],
      filtrado: [`${baseNom} para ${valF}`, `CALCULATE(\n    ${baseExpr},\n    ${cat} = ${litV}\n)`],
      difFiltro: [`Diferencia de ${baseNom} con ${valF}`, `VAR __base = CALCULATE(${baseExpr}, ${cat} = ${litV})\nRETURN\n    ${baseExpr} - __base`],
      pctTotal: [`% de ${baseNom} del total`, `DIVIDE(\n    ${baseExpr},\n    CALCULATE(${baseExpr}, ALLSELECTED())\n)`],
      acum: [`${baseNom} acumulado en ${cc}`, `CALCULATE(\n    ${baseExpr},\n    FILTER(\n        ALLSELECTED(${cat}),\n        ${cat} <= MAX(${cat})\n    )\n)`],
      ytd: [`${baseNom} año hasta la fecha`, `TOTALYTD(${baseExpr}, ${fecha})`],
      yoy: [`${baseNom} variación interanual %`, `VAR __anterior = CALCULATE(${baseExpr}, DATEADD(${fecha}, -1, YEAR))\nRETURN\n    DIVIDE(${baseExpr} - __anterior, __anterior)`],
      mom: [`${baseNom} variación mensual %`, `VAR __anterior = CALCULATE(${baseExpr}, DATEADD(${fecha}, -1, MONTH))\nRETURN\n    DIVIDE(${baseExpr} - __anterior, __anterior)`],
      rank: [`Clasificación por ${baseNom}`, `RANKX(ALL(${cat}), ${baseExpr})`],
    };
    if (['ytd', 'yoy', 'mom'].includes(calc) && !fechaK) { toast('Ese cálculo necesita una columna de fecha.'); return; }
    let [nombre, expr] = plantillas[calc]; nombre = nombreIn || nombre;
    while (S.medidas.some((m) => m.nombre.toLowerCase() === nombre.toLowerCase())) nombre += ' 2';
    try { motor.validarMedida(expr, { nombre, expr }); } catch (e) { toast('No se pudo crear: ' + e.message, 6000); return; }
    S.medidas.push({ nombre, expr, tabla: base.startsWith('c:') ? base.slice(2).split('|')[0] : (S.medidas.find((m) => m.nombre === base.slice(2)) || {}).tabla || tablas()[0], formato: ['pctTotal', 'yoy', 'mom'].includes(calc) ? { tipo: 'porcentaje', dec: 1 } : undefined });
    S.medidaSel = nombre; S.cinta = 'medida'; guardar(); pintar();
    toast(`Medida rápida [${nombre}] creada. Mira su DAX en Herramientas de medición → Editar fórmula: así se escribe a mano.`, 6000);
  }

  // ---------------------------------------------------------------- vista de tabla y vista de modelo
  function renderTabla() {
    const nombres = tablas(); const t = S.tablaDatos && S.tablas[S.tablaDatos] ? S.tablaDatos : nombres[0];
    const centro = main.querySelector('#pbCentro');
    if (!t) { centro.innerHTML = '<div class="pb-datos"><p class="pb-ayuda">No hay tablas. Usa Obtener datos.</p></div>'; renderPie(); main.querySelector('#pbPaneles').innerHTML = ''; return; }
    const cols = meta(t), o = S.ordenDatos && S.ordenDatos.t === t ? S.ordenDatos : null;
    const filas = cols.length ? ejecutar(`SELECT * FROM ${q(t)}${o ? ` ORDER BY ${q(o.c)} ${o.desc ? 'DESC' : 'ASC'}` : ''} LIMIT 500`) : [];
    centro.innerHTML = `<div class="pb-datos"><div class="pb-datos-cab"><b>${esc(t)}</b><span class="pb-dim">${(S.tablas[t]._filas || 0).toLocaleString('es')} filas · ${cols.length} columnas${errores[t] ? ` · <span class="pb-err">⚠ ${esc(errores[t])}</span>` : ''}</span><span class="spacer"></span><button class="pb-btn" data-acc="nueva-columna">${fl('table_column_top_bottom')} Nueva columna</button><button class="pb-btn" data-acc="nueva-medida">${fl('calculator')} Nueva medida</button></div><div class="pb-tabla pb-tabla-grande"><table><thead><tr>${cols.map((c) => `<th data-ordd="${esc(c.n)}" class="${S.colSel && S.colSel.t === t && S.colSel.c === c.n ? 'sel' : ''}" title="${TIPO_N[c.t] || ''}">${c.calc ? '<i class="pb-fx">fx</i> ' : ['num', 'int'].includes(c.t) ? 'Σ ' : c.t === 'fecha' ? '📅 ' : ''}${esc(c.n)}${o && o.c === c.n ? (o.desc ? ' ▾' : ' ▴') : ''}</th>`).join('')}</tr></thead><tbody>${filas.map((r) => `<tr>${r.map((x) => `<td class="${typeof x === 'number' ? 'num' : ''}">${esc(V().fmtCel(x))}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>`;
    centro.querySelectorAll('[data-ordd]').forEach((th) => { th.addEventListener('click', () => { const c = th.dataset.ordd; S.colSel = { t, c }; S.ordenDatos = { t, c, desc: o && o.c === c ? !o.desc : false }; if (S.cinta !== 'columna') { S.cinta = 'columna'; pintar(); } else renderTabla(); }); });
    main.querySelector('#pbPaneles').innerHTML = `<div class="pb-pan-col pb-col-datos"><div class="pb-pan"><div class="pb-pan-t">Datos</div>${nombres.map((x) => `<div class="pb-tabla-n ${x === t ? 'abierta' : ''}" data-ver="${esc(x)}"><span class="pb-tabla-ic">${S.tablas[x].fuente.tipo === 'dax' ? fl('table_add') : fl('table')}</span>${esc(x)}</div>`).join('')}</div></div>`;
    main.querySelectorAll('[data-ver]').forEach((x) => x.addEventListener('click', () => { S.tablaDatos = x.dataset.ver; guardar(true); renderTabla(); }));
    renderPie();
  }

  // ---------------------------------------------------------------- propiedades del modelo (panel Propiedades de la vista de modelo)
  const propKey = (t, c) => (c == null ? `T:${t}` : `${t}|${c}`);
  const propsDe = (k) => ((S.props || {})[k]) || {};
  const setProp = (k, campo, v) => { S.props = S.props || {}; S.props[k] = { ...(S.props[k] || {}), [campo]: v }; if (v === '' || v === false || v == null) delete S.props[k][campo]; };
  const CATEGORIAS = ['', 'Dirección', 'Ciudad', 'Continente', 'País o región', 'Condado', 'Estado o provincia', 'Código postal', 'Lugar', 'Latitud', 'Longitud', 'Dirección web', 'URL de imagen', 'Código de barras'];
  const CAT_TMDL = { Dirección: 'Address', Ciudad: 'City', Continente: 'Continent', 'País o región': 'Country', Condado: 'County', 'Estado o provincia': 'StateOrProvince', 'Código postal': 'PostalCode', Lugar: 'Place', Latitud: 'Latitude', Longitud: 'Longitude', 'Dirección web': 'WebUrl', 'URL de imagen': 'ImageUrl', 'Código de barras': 'Barcode' };
  const jerarquias = (t) => ((S.jerarquias || {})[t]) || [];
  // "ordenar por columna": mapa valor → clave de orden, calculado con la tabla del modelo
  const cacheOrden = {};
  function claveOrden(x) {
    if (!x || x.parte || x.medida) return null;
    const ob = propsDe(propKey(x.t, x.c)).ordenarPor; if (!ob) return null;
    const k = `${version}|${x.t}|${x.c}|${ob}`;
    if (!cacheOrden[k]) { try { cacheOrden[k] = new Map(ejecutar(`SELECT ${q(x.c)}, MIN(${q(ob)}) FROM ${q(x.t)} GROUP BY 1`).map((f) => [f[0], f[1]])); } catch (e) { cacheOrden[k] = new Map(); } }
    return cacheOrden[k];
  }
  function validarTablaFechas(t, c) {
    const filas = ejecutar(`SELECT COUNT(*), COUNT(DISTINCT ${q(c)}), SUM(CASE WHEN ${q(c)} IS NULL THEN 1 ELSE 0 END), MIN(${q(c)}), MAX(${q(c)}) FROM ${q(t)}`)[0];
    const [n, dist, nulos, min, max] = filas;
    if (nulos) return `La columna ${c} tiene ${nulos} valores en blanco. Una tabla de fechas no puede tener fechas vacías.`;
    if (dist !== n) return `La columna ${c} tiene ${n - dist} valores duplicados. Una tabla de fechas necesita una fila por día.`;
    const dias = Math.round((Date.parse(String(max).slice(0, 10)) - Date.parse(String(min).slice(0, 10))) / 864e5) + 1;
    if (!isFinite(dias)) return `La columna ${c} no tiene fechas válidas.`;
    if (dias !== n) return `Faltan fechas entre ${String(min).slice(0, 10)} y ${String(max).slice(0, 10)}: hay ${n} días de ${dias}. Las fechas tienen que ser contiguas (sin huecos).`;
    return null;
  }
  function panelPropiedades() {
    const sel = S.selModelo; if (!sel) return `<div class="pb-pp-t">Propiedades</div><p class="pb-ayuda">Selecciona una tabla, una columna o una medida en el diagrama para ver y cambiar sus propiedades.</p>`;
    if (sel.tipo === 'tabla') {
      const t = sel.t; if (!S.tablas[t]) return '';
      const P = propsDe(propKey(t)), tf = S.tablaFechas && S.tablaFechas.t === t ? S.tablaFechas : null;
      const fechas = meta(t).filter((c) => c.t === 'fecha');
      return `<div class="pb-pp-t">Propiedades</div><div class="pb-pp-sec">General</div>
        <label class="pb-pp">Nombre<input value="${esc(t)}" data-pp-nombre></label>
        <label class="pb-pp">Descripción<textarea data-pp="descripcion" rows="2">${esc(P.descripcion || '')}</textarea></label>
        <label class="pb-pp">Sinónimos<input data-pp="sinonimos" value="${esc(P.sinonimos || '')}" placeholder="ventas, facturación"></label>
        <label class="pb-pp-sw"><input type="checkbox" data-pp="oculto" ${P.oculto ? 'checked' : ''}> Está oculto</label>
        <div class="pb-pp-sec">Tabla de fechas</div>
        ${tf ? `<p class="pb-pp-ok">✓ Marcada como tabla de fechas (columna <b>${esc(tf.c)}</b>)</p><button class="pb-btn" data-desmarcar-fechas>Desmarcar</button>` : fechas.length ? `<label class="pb-pp">Columna de fecha<select data-col-fechas>${fechas.map((c) => `<option>${esc(c.n)}</option>`).join('')}</select></label><button class="pb-btn" data-marcar-fechas>Marcar como tabla de fechas</button>` : '<p class="pb-ayuda">Esta tabla no tiene columnas de fecha.</p>'}
        <div class="pb-pp-sec">Jerarquías</div>
        ${jerarquias(t).map((h, i) => `<div class="pb-pp-jer"><div class="pb-pp-jer-t"><b>${esc(h.nombre)}</b><button data-ren-jer="${i}" title="Cambiar nombre">✎</button><button data-borrar-jer="${i}" title="Eliminar la jerarquía">✕</button></div>${h.niveles.map((n, j) => `<div class="pb-pp-niv"><span>${j + 1}. ${esc(n)}</span><button data-niv-sub="${i}:${j}" title="Subir un lugar" ${j ? '' : 'disabled'}>↑</button><button data-niv-quitar="${i}:${j}" title="Quitar este nivel">✕</button></div>`).join('')}<select data-niv-add="${i}"><option value="">+ Agregar nivel…</option>${meta(t).filter((c) => !h.niveles.includes(c.n)).map((c) => `<option>${esc(c.n)}</option>`).join('')}</select></div>`).join('') || '<p class="pb-ayuda">Sin jerarquías. También puedes hacer clic derecho en una columna → Crear jerarquía.</p>'}
        <button class="pb-btn" data-nueva-jer>+ Nueva jerarquía</button>`;
    }
    if (sel.tipo === 'medida') {
      const m = S.medidas.find((x) => x.nombre === sel.n); if (!m) return '';
      const P = propsDe('m:' + m.nombre);
      return `<div class="pb-pp-t">Propiedades</div><div class="pb-pp-sec">General</div>
        <label class="pb-pp">Nombre<input value="${esc(m.nombre)}" data-pp-nombre></label>
        <label class="pb-pp">Descripción<textarea data-pp="descripcion" rows="2">${esc(P.descripcion || '')}</textarea></label>
        <label class="pb-pp">Carpeta para mostrar<input data-pp="carpeta" value="${esc(P.carpeta || '')}" placeholder="Ventas\\Tiempo"></label>
        <label class="pb-pp-sw"><input type="checkbox" data-pp="oculto" ${P.oculto ? 'checked' : ''}> Está oculto</label>
        <label class="pb-pp">Tabla principal<select data-med-home>${tablas().filter((x) => S.tablas[x].fuente.tipo !== 'calcgroup').map((x) => `<option ${(m.tabla || tablas()[0]) === x ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select></label>
        <div class="pb-pp-sec">Fórmula</div><pre class="pb-pp-dax">${esc(m.expr)}</pre>`;
    }
    const { t, c } = sel; const col = meta(t).find((x) => x.n === c); if (!col) return '';
    const P = propsDe(propKey(t, c)), tb = S.tablas[t];
    return `<div class="pb-pp-t">Propiedades</div><div class="pb-pp-sec">General</div>
      <label class="pb-pp">Nombre<input value="${esc(c)}" data-pp-nombre></label>
      <label class="pb-pp">Descripción<textarea data-pp="descripcion" rows="2">${esc(P.descripcion || '')}</textarea></label>
      <label class="pb-pp">Sinónimos<input data-pp="sinonimos" value="${esc(P.sinonimos || '')}"></label>
      <label class="pb-pp">Carpeta para mostrar<input data-pp="carpeta" value="${esc(P.carpeta || '')}"></label>
      <label class="pb-pp-sw"><input type="checkbox" data-pp="oculto" ${P.oculto ? 'checked' : ''}> Está oculto</label>
      <div class="pb-pp-sec">Formato</div>
      <label class="pb-pp">Tipo de datos<input value="${esc(TIPO_N[col.t] || col.t)}" disabled></label>
      <div class="pb-pp-sec">Avanzado</div>
      <label class="pb-pp">Ordenar por columna<select data-pp="ordenarPor"><option value="">${esc(c)} (predeterminado)</option>${meta(t).filter((x) => x.n !== c).map((x) => `<option ${P.ordenarPor === x.n ? 'selected' : ''}>${esc(x.n)}</option>`).join('')}</select></label>
      <label class="pb-pp">Categoría de datos<select data-pp="categoria">${CATEGORIAS.map((x) => `<option value="${esc(x)}" ${(P.categoria || '') === x ? 'selected' : ''}>${x || 'Sin categorizar'}</option>`).join('')}</select></label>
      <label class="pb-pp">Resumir por<select data-col-resumen-m>${Object.entries(AGG).filter(([k]) => k !== 'median').map(([k, n]) => `<option value="${k}" ${((tb.resumen || {})[c] || (esNum(t, c) ? 'sum' : 'none')) === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label>`;
  }
  function enlazarPropiedades(box) {
    const sel = S.selModelo; if (!sel) return;
    const k = sel.tipo === 'tabla' ? propKey(sel.t) : sel.tipo === 'medida' ? 'm:' + sel.n : propKey(sel.t, sel.c);
    box.querySelectorAll('[data-pp]').forEach((el) => el.addEventListener('change', () => {
      const campo = el.dataset.pp, v = el.type === 'checkbox' ? el.checked : el.value.trim();
      if (campo === 'ordenarPor' && v) { const dup = ejecutar(`SELECT COUNT(*) FROM (SELECT ${q(sel.c)} FROM ${q(sel.t)} GROUP BY 1 HAVING COUNT(DISTINCT ${q(v)}) > 1)`)[0][0]; if (dup) { toast(`No se puede ordenar la columna "${sel.c}" por "${v}": hay más de un valor de "${v}" para el mismo valor de "${sel.c}". Cada valor tiene que tener un solo valor de orden.`, 7000); el.value = propsDe(k).ordenarPor || ''; return; } }
      setProp(k, campo, v); cambioModelo(); guardar(); setTimeout(() => render(), 0);
    }));
    const pn = box.querySelector('[data-pp-nombre]'); if (pn) pn.addEventListener('change', () => {
      const n = pn.value.trim(); if (!n) { pn.value = sel.tipo === 'tabla' ? sel.t : sel.tipo === 'medida' ? sel.n : sel.c; return; }
      if (sel.tipo === 'tabla') { if (n !== sel.t && !S.tablas[n]) { renombrarTabla(sel.t, n); S.selModelo = { tipo: 'tabla', t: n }; } }
      else if (sel.tipo === 'medida') { const m = S.medidas.find((x) => x.nombre === sel.n); if (m && n !== m.nombre && !S.medidas.some((x) => x.nombre.toLowerCase() === n.toLowerCase())) { const prev = S.vista; renombrarMedida(m, n); S.vista = prev; S.selModelo = { tipo: 'medida', n }; } }
      else renombrarColumna(sel.t, sel.c, n);
      setTimeout(() => render(), 0);
    });
    const hm = box.querySelector('[data-med-home]'); if (hm) hm.addEventListener('change', () => { const m = S.medidas.find((x) => x.nombre === sel.n); m.tabla = hm.value; cambioModelo(); guardar(); setTimeout(() => render(), 0); });
    const rs = box.querySelector('[data-col-resumen-m]'); if (rs) rs.addEventListener('change', () => { S.tablas[sel.t].resumen[sel.c] = rs.value; guardar(); setTimeout(() => render(), 0); });
    const mf = box.querySelector('[data-marcar-fechas]'); if (mf) mf.addEventListener('click', () => { const c = box.querySelector('[data-col-fechas]').value; const e = validarTablaFechas(sel.t, c); if (e) { toast('No se pudo marcar como tabla de fechas. ' + e, 8000); return; } S.tablaFechas = { t: sel.t, c }; cambioModelo(); guardar(); setTimeout(() => render(), 0); toast(`${sel.t} quedó marcada como tabla de fechas. Power BI quita la jerarquía automática de fecha de esta tabla.`); });
    const df = box.querySelector('[data-desmarcar-fechas]'); if (df) df.addEventListener('click', () => { S.tablaFechas = null; cambioModelo(); guardar(); setTimeout(() => render(), 0); });
    const nj = box.querySelector('[data-nueva-jer]'); if (nj) nj.addEventListener('click', async () => {
      const cols = meta(sel.t).map((x) => x.n);
      const r = await pedir('Nueva jerarquía', [{ n: 'Nombre', v: 'Jerarquía' }, { n: 'Nivel 1', opts: cols }, { n: 'Nivel 2', opts: ['', ...cols] }, { n: 'Nivel 3', opts: ['', ...cols] }, { n: 'Nivel 4', opts: ['', ...cols] }]);
      if (!r) return; const niveles = r.slice(1).filter(Boolean); if (new Set(niveles).size !== niveles.length) { toast('Cada columna puede estar una sola vez en la jerarquía.'); return; }
      S.jerarquias = S.jerarquias || {}; (S.jerarquias[sel.t] = S.jerarquias[sel.t] || []).push({ nombre: r[0].trim() || 'Jerarquía', niveles }); cambioModelo(); guardar(); setTimeout(() => render(), 0);
    });
    box.querySelectorAll('[data-borrar-jer]').forEach((b) => b.addEventListener('click', () => { S.jerarquias[sel.t].splice(Number(b.dataset.borrarJer), 1); cambioModelo(); guardar(); setTimeout(() => render(), 0); }));
    const H = () => S.jerarquias[sel.t];
    box.querySelectorAll('[data-ren-jer]').forEach((b) => b.addEventListener('click', async () => { const h = H()[Number(b.dataset.renJer)]; const r = await pedir('Cambiar nombre de la jerarquía', [{ n: 'Nombre', v: h.nombre }]); if (r && r[0].trim()) { h.nombre = r[0].trim(); cambioModelo(); guardar(); render(); } }));
    box.querySelectorAll('[data-niv-sub]').forEach((b) => b.addEventListener('click', () => { const [i, j] = b.dataset.nivSub.split(':').map(Number); const n = H()[i].niveles; [n[j - 1], n[j]] = [n[j], n[j - 1]]; cambioModelo(); guardar(); setTimeout(() => render(), 0); }));
    box.querySelectorAll('[data-niv-quitar]').forEach((b) => b.addEventListener('click', () => { const [i, j] = b.dataset.nivQuitar.split(':').map(Number); H()[i].niveles.splice(j, 1); if (!H()[i].niveles.length) H().splice(i, 1); cambioModelo(); guardar(); setTimeout(() => render(), 0); }));
    box.querySelectorAll('[data-niv-add]').forEach((x) => x.addEventListener('change', () => { if (!x.value) return; H()[Number(x.dataset.nivAdd)].niveles.push(x.value); cambioModelo(); guardar(); setTimeout(() => render(), 0); }));
  }
  function renderModelo() {
    const nombres = tablas(); S.posModelo = S.posModelo || {};
    nombres.forEach((t, i) => { if (!S.posModelo[t]) S.posModelo[t] = [4 + (i % 4) * 24, 6 + Math.floor(i / 4) * 44]; });
    const caja = (t) => { const [x, y] = S.posModelo[t]; return `<div class="pb-mt ${S.tablas[t].fuente.tipo === 'dax' ? 'pb-mt-calc' : ''}" data-mt="${esc(t)}" style="left:${x}%;top:${y}%"><div class="pb-mt-t">${esc(t)}</div><div class="pb-mt-cols">${S.medidas.filter((m) => (m.tabla || nombres[0]) === t).map((m) => `<div data-mmed="${esc(m.nombre)}" class="${propsDe('m:' + m.nombre).oculto ? 'pb-oculto' : ''} ${S.selModelo && S.selModelo.tipo === 'medida' && S.selModelo.n === m.nombre ? 'pb-msel' : ''}">${fl('calculator')} ${esc(m.nombre)}</div>`).join('')}${meta(t).map((c) => `<div draggable="true" data-mcol="${esc(c.n)}" class="${propsDe(propKey(t, c.n)).oculto ? 'pb-oculto' : ''} ${S.selModelo && S.selModelo.tipo === 'col' && S.selModelo.t === t && S.selModelo.c === c.n ? 'pb-msel' : ''}" title="Clic: propiedades · Arrastra sobre la columna de otra tabla para crear una relación">${c.calc ? '<i class="pb-fx">fx</i> ' : esNum(t, c.n) ? 'Σ ' : ''}${esc(c.n)}<button class="pb-mojo ${propsDe(propKey(t, c.n)).oculto ? 'on' : ''}" data-mojo="${esc(c.n)}" title="${propsDe(propKey(t, c.n)).oculto ? 'Mostrar en la vista de informe' : 'Ocultar en la vista de informe'}">${fl(propsDe(propKey(t, c.n)).oculto ? 'eye_off' : 'eye')}</button></div>`).join('')}${jerarquias(t).map((h) => `<div class="pb-mjer" data-mt-jer>⋮ ${esc(h.nombre)}</div>`).join('')}</div></div>`; };
    main.querySelector('#pbCentro').innerHTML = `<div class="pb-modelo-wrap"><div class="pb-modelo" id="pbModelo"><svg class="pb-modelo-svg"></svg>${nombres.map(caja).join('')}<div class="pb-modelo-ayuda">Clic en una tabla, columna o medida para ver sus propiedades · Arrastra una columna sobre la de otra tabla para relacionarlas · Clic en una línea para editarla</div></div><aside class="pb-propiedades" id="pbProps">${panelPropiedades()}</aside></div>`;
    enlazarPropiedades(main.querySelector('#pbProps'));
    const cont = main.querySelector('#pbModelo'), svg = cont.querySelector('svg');
    const lineas = () => {
      const R = cont.getBoundingClientRect();
      svg.innerHTML = '<defs><marker id="pbFlecha" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#605E5C"/></marker></defs>' + S.rels.map((r, i) => {
        const a = cont.querySelector(`[data-mt="${CSS.escape(r.de)}"]`), b = cont.querySelector(`[data-mt="${CSS.escape(r.a)}"]`); if (!a || !b) return '';
        const A = a.getBoundingClientRect(), B = b.getBoundingClientRect();
        // la línea sale del borde de cada tarjeta (no del centro), como en la vista de modelo real
        const borde = (r1, r2) => { const cx = r1.left + r1.width / 2, cy = r1.top + r1.height / 2, dx = r2.left + r2.width / 2 - cx, dy = r2.top + r2.height / 2 - cy; const k = Math.min(Math.abs((r1.width / 2) / (dx || 1e-9)), Math.abs((r1.height / 2) / (dy || 1e-9))); return [cx + dx * k - R.left, cy + dy * k - R.top]; };
        const [x1, y1] = borde(A, B), [x2, y2] = borde(B, A);
        const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, ang = (Math.atan2(y1 - y2, x1 - x2) * 180) / Math.PI;
        const flechas = r.direccion === 'ambas' ? `<polygon points="${mx - 14},${my - 4} ${mx - 4},${my} ${mx - 14},${my + 4}" transform="rotate(${ang} ${mx} ${my})" class="pb-rel-flecha"/><polygon points="${mx + 14},${my - 4} ${mx + 4},${my} ${mx + 14},${my + 4}" transform="rotate(${ang} ${mx} ${my})" class="pb-rel-flecha"/>` : `<polygon points="${mx - 5},${my - 4} ${mx + 5},${my} ${mx - 5},${my + 4}" transform="rotate(${ang} ${mx} ${my})" class="pb-rel-flecha"/>`;
        return `<g class="pb-rel-g" data-rel="${i}"><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="pb-rel-hit"/><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="pb-rel ${r.activa ? '' : 'pb-rel-inactiva'}"/><text x="${x1 + (x2 - x1) * 0.06 + 4}" y="${y1 + (y2 - y1) * 0.06 - 4}" class="pb-rel-t">*</text><text x="${x2 - (x2 - x1) * 0.06 + 4}" y="${y2 - (y2 - y1) * 0.06 - 4}" class="pb-rel-t">1</text>${flechas}<title>${esc(r.de)}[${esc(r.cde)}] * → 1 ${esc(r.a)}[${esc(r.ca)}]${r.activa ? '' : ' (inactiva)'} · filtro ${r.direccion === 'ambas' ? 'en ambas direcciones' : `de ${esc(r.a)} a ${esc(r.de)}`}</title></g>`;
      }).join('');
    };
    requestAnimationFrame(lineas);
    svg.addEventListener('click', (e) => { const g = e.target.closest('[data-rel]'); if (g) editarRelacion(S.rels[Number(g.dataset.rel)]); });
    cont.addEventListener('click', (e) => {
      const ojo = e.target.closest('[data-mojo]'); if (ojo) { const t = ojo.closest('[data-mt]').dataset.mt, k = propKey(t, ojo.dataset.mojo); setProp(k, 'oculto', !propsDe(k).oculto); cambioModelo(); guardar(); renderModelo(); return; }
      const col = e.target.closest('[data-mcol]'), med = e.target.closest('[data-mmed]'), mt = e.target.closest('[data-mt]');
      if (col) S.selModelo = { tipo: 'col', t: mt.dataset.mt, c: col.dataset.mcol };
      else if (med) S.selModelo = { tipo: 'medida', n: med.dataset.mmed };
      else if (mt) { if (cont.dataset.arrastro === '1') { cont.dataset.arrastro = ''; return; } S.selModelo = { tipo: 'tabla', t: mt.dataset.mt }; }
      else return;
      renderModelo();
    });
    cont.addEventListener('pointerdown', (e) => {
      const el = e.target.closest('[data-mt]'); if (!el || !e.target.closest('.pb-mt-t')) return;
      const t = el.dataset.mt, R = cont.getBoundingClientRect(), x0 = e.clientX, y0 = e.clientY, ini = S.posModelo[t].slice();
      el.setPointerCapture(e.pointerId);
      const mover = (ev) => { if (Math.abs(ev.clientX - x0) + Math.abs(ev.clientY - y0) > 4) cont.dataset.arrastro = '1'; S.posModelo[t] = [Math.max(0, Math.min(88, ini[0] + ((ev.clientX - x0) / R.width) * 100)), Math.max(0, Math.min(85, ini[1] + ((ev.clientY - y0) / R.height) * 100))]; el.style.left = S.posModelo[t][0] + '%'; el.style.top = S.posModelo[t][1] + '%'; lineas(); };
      const soltar = () => { el.removeEventListener('pointermove', mover); el.removeEventListener('pointerup', soltar); guardar(); };
      el.addEventListener('pointermove', mover); el.addEventListener('pointerup', soltar);
    });
    cont.querySelectorAll('[data-mcol]').forEach((c) => {
      c.addEventListener('contextmenu', (e) => { if (!window.PBIInforme) return; e.preventDefault(); window.PBIInforme.menuCampo({ t: c.closest('[data-mt]').dataset.mt, c: c.dataset.mcol }, e); });
      c.addEventListener('dragstart', (e) => e.dataTransfer.setData('text/plain', JSON.stringify({ t: c.closest('[data-mt]').dataset.mt, c: c.dataset.mcol })));
      c.addEventListener('dragover', (e) => { e.preventDefault(); c.classList.add('sobre'); });
      c.addEventListener('dragleave', () => c.classList.remove('sobre'));
      c.addEventListener('drop', (e) => {
        e.preventDefault(); c.classList.remove('sobre'); let o; try { o = JSON.parse(e.dataTransfer.getData('text/plain')); } catch (err) { return; }
        const t2 = c.closest('[data-mt]').dataset.mt, c2 = c.dataset.mcol; if (o.t === t2) return;
        const u1 = ejecutar(`SELECT COUNT(*) = COUNT(DISTINCT ${q(o.c)}) FROM ${q(o.t)}`)[0][0], u2 = ejecutar(`SELECT COUNT(*) = COUNT(DISTINCT ${q(c2)}) FROM ${q(t2)}`)[0][0];
        let rel; if (u2 && !u1) rel = { de: o.t, cde: o.c, a: t2, ca: c2 }; else if (u1 && !u2) rel = { de: t2, cde: c2, a: o.t, ca: o.c }; else if (u1 && u2) rel = { de: o.t, cde: o.c, a: t2, ca: c2 }; else { toast('Ninguna de las dos columnas tiene valores únicos (sería varios a varios). Elige la columna clave de la tabla de dimensión.', 6000); return; }
        rel.activa = !S.rels.some((x) => x.activa && ((x.de === rel.de && x.a === rel.a) || (x.de === rel.a && x.a === rel.de))); rel.direccion = 'unica';
        S.rels.push(rel); cambioModelo(); guardar(); renderModelo(); toast(`Relación creada: ${rel.de}[${rel.cde}] * → 1 ${rel.a}[${rel.ca}]${rel.activa ? '' : ' (inactiva: ya había otra activa)'}`);
      });
    });
    main.querySelector('#pbPaneles').innerHTML = `<div class="pb-pan-col pb-col-datos"><div class="pb-pan"><div class="pb-pan-t">Modelo</div><div class="row" style="padding:0 12px"><button class="pb-btn pb-btn-am" data-rel-adm>Administrar relaciones</button></div>${S.rels.map((r, i) => `<div class="pb-rel-i" data-edit-rel="${i}"><b>${esc(r.de)}</b>[${esc(r.cde)}] <span>* → 1</span> <b>${esc(r.a)}</b>[${esc(r.ca)}]${r.activa ? '' : ' <i class="pb-dim">(inactiva)</i>'}${r.direccion === 'ambas' ? ' <i class="pb-dim">(ambas)</i>' : ''}</div>`).join('') || '<p class="pb-ayuda">No hay relaciones. Power BI las detecta cuando dos tablas comparten una columna clave (por ejemplo cliente_id); si no, arrastra una columna sobre otra o usa Administrar relaciones.</p>'}<p class="pb-ayuda">El filtro viaja del lado <b>1</b> al lado <b>*</b>: así funciona un esquema estrella. Solo puede haber una relación <b>activa</b> entre dos tablas; las inactivas (línea punteada) se usan con <code>USERELATIONSHIP</code>.</p></div></div>`;
    main.querySelector('[data-rel-adm]').addEventListener('click', dialogoRelaciones);
    main.querySelectorAll('[data-edit-rel]').forEach((x) => x.addEventListener('click', () => editarRelacion(S.rels[Number(x.dataset.editRel)])));
    renderPie();
  }

  // ---------------------------------------------------------------- editor de código (Monaco, el de VS Code)
  let monacoListo = false;
  function prepararMonaco(monaco) {
    if (monacoListo) return; monacoListo = true;
    const fns = window.PBIDax.FUNCIONES;
    monaco.languages.register({ id: 'dax' });
    monaco.languages.setMonarchTokensProvider('dax', { ignoreCase: true, keywords: ['EVALUATE', 'DEFINE', 'MEASURE', 'VAR', 'RETURN', 'ORDER', 'BY', 'ASC', 'DESC', 'IN', 'NOT', 'TABLE', 'COLUMN', 'START', 'AT'], funciones: fns, tokenizer: { root: [[/\/\/.*$/, 'comment'], [/--.*$/, 'comment'], [/\/\*/, 'comment', '@com'], [/"([^"]|"")*"/, 'string'], [/'[^']*'/, 'type'], [/\[[^\]]*\]/, 'variable'], [/\d+(\.\d+)?/, 'number'], [/[A-Za-z_][\w.]*(?=\s*\()/, { cases: { '@funciones': 'keyword.function', '@default': 'identifier' } }], [/[A-Za-z_]\w*/, { cases: { '@keywords': 'keyword', '@default': 'identifier' } }], [/[=<>&|+\-*/^]+/, 'operator']], com: [[/\*\//, 'comment', '@pop'], [/./, 'comment']] } });
    monaco.languages.register({ id: 'tmdl' });
    monaco.languages.setMonarchTokensProvider('tmdl', { tokenizer: { root: [[/\/\/.*$/, 'comment'], [/^\s*(createOrReplace|model|table|column|measure|partition|relationship|ref|expression|annotation|hierarchy|level|role|culture|perspective)\b/, 'keyword'], [/^\s*[A-Za-z]+:/, 'attribute.name'], [/"([^"]|"")*"/, 'string'], [/'[^']*'/, 'type'], [/\[[^\]]*\]/, 'variable'], [/\b\d+(\.\d+)?\b/, 'number'], [/\b(let|in|each|if|then|else)\b/, 'keyword'], [/[A-Z][A-Za-z]*\.[A-Za-z.]+/, 'keyword.function']] } });
    monaco.editor.defineTheme('pbi-claro', { base: 'vs', inherit: true, rules: [{ token: 'keyword', foreground: '0000FF', fontStyle: 'bold' }, { token: 'keyword.function', foreground: '035ACA' }, { token: 'variable', foreground: '001080' }, { token: 'type', foreground: '267F99' }, { token: 'string', foreground: 'A31515' }, { token: 'comment', foreground: '008000' }, { token: 'number', foreground: '098658' }, { token: 'attribute.name', foreground: '795E26' }], colors: { 'editor.background': '#FFFFFF' } });
    monaco.languages.registerCompletionItemProvider('dax', { triggerCharacters: ['[', "'", '('], provideCompletionItems: (model, pos) => { const w = model.getWordUntilPosition(pos); const range = { startLineNumber: pos.lineNumber, endLineNumber: pos.lineNumber, startColumn: w.startColumn, endColumn: w.endColumn }; const K = monaco.languages.CompletionItemKind; const s = []; for (const f of fns) s.push({ label: f, kind: K.Function, insertText: f + '(', range, detail: 'función DAX' }); for (const t of tablas()) { s.push({ label: t, kind: K.Class, insertText: /^[A-Za-z_]\w*$/.test(t) ? t : `'${t}'`, range, detail: 'tabla' }); for (const c of meta(t)) s.push({ label: `${t}[${c.n}]`, kind: K.Field, insertText: `'${t}'[${c.n}]`, range, detail: TIPO_N[c.t] }); } for (const m of S.medidas) s.push({ label: `[${m.nombre}]`, kind: K.Value, insertText: `[${m.nombre}]`, range, detail: 'medida' }); for (const k of ['EVALUATE', 'DEFINE', 'MEASURE', 'VAR', 'RETURN', 'ORDER BY']) s.push({ label: k, kind: K.Keyword, insertText: k, range }); return { suggestions: s }; } });
  }
  function editorCodigo(cont, valor, lang, onChange, onRun) {
    cont.innerHTML = `<textarea class="pb-code-ta" spellcheck="false"></textarea>`;
    const ta = cont.querySelector('textarea'); ta.value = valor;
    let ed = null;
    const api = { get: () => (ed ? ed.getValue() : ta.value), set: (v) => { if (ed) ed.setValue(v); else ta.value = v; }, insertar: (t) => { if (ed) { const sel = ed.getSelection(); ed.executeEdits('pbi', [{ range: sel, text: t }]); ed.focus(); } else { ta.value += t; } } };
    ta.addEventListener('input', () => onChange(ta.value));
    ta.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' || e.key === 'F5') { e.preventDefault(); onRun(); } });
    if (ctxApp.cargarMonaco) ctxApp.cargarMonaco().then((monaco) => {
      if (!cont.isConnected || !monaco) return;
      prepararMonaco(monaco);
      const v = ta.value; cont.innerHTML = '';
      ed = monaco.editor.create(cont, { value: v, language: lang, theme: 'pbi-claro', automaticLayout: true, minimap: { enabled: false }, fontSize: 13, lineNumbers: 'on', scrollBeyondLastLine: false, wordWrap: 'on', fontFamily: "Consolas, 'Cascadia Mono', 'JetBrains Mono', monospace", tabSize: 4, insertSpaces: false });
      ed.onDidChangeModelContent(() => onChange(ed.getValue()));
      ed.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, onRun); ed.addCommand(monaco.KeyCode.F5, onRun);
      cont._ed = ed;
    }).catch(() => {});
    return api;
  }

  // ---------------------------------------------------------------- vista de consultas DAX
  function renderDax() {
    const centro = main.querySelector('#pbCentro');
    if (S.daxTab >= S.daxTabs.length) S.daxTab = 0;
    const tab = S.daxTabs[S.daxTab];
    centro.innerHTML = `<div class="pb-codigo"><div class="pb-cod-barra"><button class="pb-btn pb-btn-run" data-run>${fl('play')} Ejecutar</button><span class="pb-dim small">Ctrl+Enter o F5 · Clic derecho (o ⋯) sobre una tabla, columna o medida del panel Datos para las consultas rápidas</span><span class="spacer"></span><span class="pb-cod-lente" hidden></span></div><div class="pb-cod-ed" id="pbDaxEd"></div><div class="pb-cod-res" id="pbDaxRes"><p class="pb-ayuda">Escribe una consulta y pulsa Ejecutar. Ejemplos:<br><code>EVALUATE TOPN(100, ${esc(tablas()[0] ? (/^[A-Za-z_]\w*$/.test(tablas()[0]) ? tablas()[0] : `'${tablas()[0]}'`) : 'Ventas')})</code><br><code>EVALUATE SUMMARIZECOLUMNS('Tabla'[columna], "Total", [Medida]) ORDER BY [Total] DESC</code><br><code>DEFINE MEASURE 'Tabla'[Nueva] = [Medida] * 2 EVALUATE {[Nueva]}</code></p></div><div class="pb-cod-tabs">${S.daxTabs.map((t, i) => `<span class="${i === S.daxTab ? 'on' : ''}" data-dtab="${i}">${esc(t.nombre)}${S.daxTabs.length > 1 ? `<button data-dcerrar="${i}">✕</button>` : ''}</span>`).join('')}<span data-dnueva title="Nueva consulta">+</span></div></div>`;
    const ed = editorCodigo(main.querySelector('#pbDaxEd'), tab.texto, 'dax', (v) => { tab.texto = v; guardar(true); lente(v); }, () => correr());
    const lente = (v) => { const l = centro.querySelector('.pb-cod-lente'); const defs = [...v.matchAll(/MEASURE\s+('[^']+'|[\wÀ-ÿ]+)\s*\[([^\]]+)\]\s*=/gi)]; const nuevas = defs.filter((d) => !S.medidas.some((m) => m.nombre.toLowerCase() === d[2].toLowerCase())).length, cambia = defs.length - nuevas; if (!defs.length) { l.hidden = true; return; } l.hidden = false; l.innerHTML = `<button class="pb-btn" data-lente>Actualizar el modelo: ${nuevas ? `agregar ${nuevas} medida(s) nueva(s)` : ''}${nuevas && cambia ? ' y ' : ''}${cambia ? `sobrescribir ${cambia}` : ''}</button>`; };
    lente(tab.texto);
    function correr() {
      const res = main.querySelector('#pbDaxRes'); const t0 = performance.now();
      try {
        construir(); const rs = motor.consulta(ed.get()); const ms = performance.now() - t0; S.daxEjecutada = true; guardar(true);
        res.innerHTML = rs.map((r, k) => `<div class="pb-res-t">Resultado ${rs.length > 1 ? k + 1 : ''} · ${r.filas.length.toLocaleString('es')} fila(s)${r.filas.length >= 5000 ? ' (se muestran 5000)' : ''} · ${ms.toFixed(0)} ms</div><div class="pb-tabla"><table><thead><tr>${r.cols.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${r.filas.slice(0, 1000).map((f) => `<tr>${f.map((x) => `<td class="${typeof x === 'number' ? 'num' : ''}">${esc(V().fmtCel(x))}</td>`).join('')}</tr>`).join('')}</tbody></table></div><details class="pb-sql"><summary>SQL que ejecutó el motor de la práctica</summary><pre>${esc(r.sql)}</pre></details>`).join('');
      } catch (e) { res.innerHTML = `<div class="pb-res-err"><b>Error en la consulta</b><br>${esc(e.message)}</div>`; }
    }
    centro.querySelector('[data-run]').addEventListener('click', correr);
    centro.addEventListener('click', (e) => {
      const lt = e.target.closest('[data-lente]'); if (lt) { const defs = [...ed.get().matchAll(/MEASURE\s+('[^']+'|[\wÀ-ÿ]+)\s*\[([^\]]+)\]\s*=\s*([\s\S]*?)(?=\n\s*(?:MEASURE|VAR|EVALUATE|TABLE|COLUMN)\b|$)/gi)]; let n = 0; for (const d of defs) { const nombre = d[2], expr = d[3].trim(), tabla = d[1].replace(/'/g, ''); try { motor.validarMedida(expr, { nombre, expr }); const ex = S.medidas.find((m) => m.nombre.toLowerCase() === nombre.toLowerCase()); if (ex) Object.assign(ex, { expr }); else S.medidas.push({ nombre, expr, tabla: S.tablas[tabla] ? tabla : tablas()[0] }); n++; } catch (err) { toast(`[${nombre}]: ${err.message}`, 6000); } } guardar(); renderDax(); toast(`Modelo actualizado: ${n} medida(s).`); return; }
      const tb = e.target.closest('[data-dtab]'); if (tb && !e.target.closest('[data-dcerrar]')) { S.daxTab = Number(tb.dataset.dtab); guardar(true); renderDax(); return; }
      const c = e.target.closest('[data-dcerrar]'); if (c) { S.daxTabs.splice(Number(c.dataset.dcerrar), 1); S.daxTab = 0; guardar(true); renderDax(); return; }
      if (e.target.closest('[data-dnueva]')) { S.daxTabs.push({ nombre: `Consulta ${S.daxTabs.length + 1}`, texto: 'EVALUATE\n' }); S.daxTab = S.daxTabs.length - 1; guardar(true); renderDax(); }
    });
    centro.querySelectorAll('[data-dtab]').forEach((x) => x.addEventListener('dblclick', () => { const n = prompt('Nombre de la pestaña:', S.daxTabs[Number(x.dataset.dtab)].nombre); if (n) { S.daxTabs[Number(x.dataset.dtab)].nombre = n; guardar(true); renderDax(); } }));
    // panel Datos con consultas rápidas (Quick queries)
    const pan = main.querySelector('#pbPaneles');
    pan.innerHTML = `<div class="pb-pan-col pb-col-datos"><div class="pb-pan"><div class="pb-pan-t">Datos</div><div class="pb-arbol">${arbolDatos(new Set())}</div><p class="pb-ayuda">Clic en una tabla, columna o medida para ver sus consultas rápidas.</p></div></div>`;
    const ref = (t) => (/^[A-Za-z_]\w*$/.test(t) ? t : `'${t}'`);
    const rapida = (txt) => { const nueva = { nombre: `Consulta ${S.daxTabs.length + 1}`, texto: txt }; S.daxTabs.push(nueva); S.daxTab = S.daxTabs.length - 1; guardar(true); renderDax(); setTimeout(() => main.querySelector('[data-run]').click(), 50); };
    const menuR = (x, items) => { const prev = document.querySelector('.pq-menu'); if (prev) prev.remove(); const r = x.getBoundingClientRect(); const menu = document.createElement('div'); menu.className = 'pq-menu'; menu.style.left = Math.min(r.left, innerWidth - 260) + 'px'; menu.style.top = r.bottom + 'px'; menu.innerHTML = `<div class="pq-menu-sub">Consultas rápidas</div>${items.map(([n], i) => `<div data-qi="${i}">${esc(n)}</div>`).join('')}`; document.body.appendChild(menu); setTimeout(() => document.addEventListener('mousedown', function f(e) { if (!menu.contains(e.target)) { menu.remove(); document.removeEventListener('mousedown', f); } }), 0); menu.addEventListener('click', (e) => { const o = e.target.closest('[data-qi]'); if (!o) return; menu.remove(); rapida(items[Number(o.dataset.qi)][1]); }); };
    pan.querySelectorAll('[data-tabla]').forEach((x) => x.addEventListener('click', (e) => {
      if (e.target.closest('.pb-chev')) { const s = new Set(S.tablasAbiertas || tablas().slice(0, 2)); s.has(x.dataset.tabla) ? s.delete(x.dataset.tabla) : s.add(x.dataset.tabla); S.tablasAbiertas = [...s]; guardar(true); renderDax(); return; }
      const t = x.dataset.tabla, cs = meta(t);
      menuR(x, [['Mostrar las primeras 100 filas', `EVALUATE\n    SELECTCOLUMNS(\n        TOPN(100, ${ref(t)}),\n${cs.map((c) => `        "${c.n}", ${ref(t)}[${c.n}]`).join(',\n')}\n    )`], ['Mostrar estadísticas de columnas', `EVALUATE\n    ROW(\n        "Filas", COUNTROWS(${ref(t)})${cs.filter((c) => ['num', 'int', 'fecha'].includes(c.t)).map((c) => `,\n        "Mín ${c.n}", MIN(${ref(t)}[${c.n}]),\n        "Máx ${c.n}", MAX(${ref(t)}[${c.n}])`).join('')}${cs.map((c) => `,\n        "Distintos ${c.n}", DISTINCTCOUNT(${ref(t)}[${c.n}])`).join('')}\n    )`], ['Definir todas las medidas de esta tabla', `DEFINE\n${S.medidas.filter((m) => m.tabla === t).map((m) => `    MEASURE ${ref(t)}[${m.nombre}] = ${m.expr}`).join('\n') || '    // esta tabla no tiene medidas'}\n\nEVALUATE\n    {1}`]]);
    }));
    pan.querySelectorAll('.pb-campo').forEach((x) => x.addEventListener('click', (e) => {
      e.preventDefault(); const f = campoDe(x);
      if (f.medida) { const m = S.medidas.find((y) => y.nombre === f.medida); menuR(x, [['Evaluar', `EVALUATE\n    SUMMARIZECOLUMNS(\n        "${m.nombre}", [${m.nombre}]\n    )`], ['Definir y evaluar', `DEFINE\n    MEASURE ${ref(m.tabla || tablas()[0])}[${m.nombre}] = ${m.expr}\n\nEVALUATE\n    SUMMARIZECOLUMNS(\n        "${m.nombre}", [${m.nombre}]\n    )`]]); return; }
      menuR(x, [['Mostrar vista previa de datos', `EVALUATE\n    DISTINCT(${ref(f.t)}[${f.c}])`], ['Mostrar estadísticas de la columna', `EVALUATE\n    ROW(\n        "Mín", MIN(${ref(f.t)}[${f.c}]),\n        "Máx", MAX(${ref(f.t)}[${f.c}]),\n        "Distintos", DISTINCTCOUNT(${ref(f.t)}[${f.c}]),\n        "Vacíos", COUNTBLANK(${ref(f.t)}[${f.c}]),\n        "Filas", COUNTROWS(${ref(f.t)})\n    )`]]);
    }));
    renderPie();
  }

  // ---------------------------------------------------------------- vista TMDL
  const nomTmdl = (n) => (/^[A-Za-z_][\w]*$/.test(n) ? n : `'${String(n).replace(/'/g, "''")}'`);
  const TIPO_TMDL = { int: 'int64', num: 'double', texto: 'string', fecha: 'dateTime', bool: 'boolean' };
  const fmtTmdl = (f) => (!f || !f.tipo || f.tipo === 'general' ? null : f.tipo === 'porcentaje' ? `0${f.dec ? '.' + '0'.repeat(f.dec) : ''}%` : f.tipo === 'moneda' ? `\\$#,0${f.dec !== 0 ? '.' + '0'.repeat(f.dec ?? 2) : ''}` : f.tipo === 'entero' ? '#,0' : `#,0.${'0'.repeat(f.dec ?? 2)}`);
  const guid = (s) => { let x = ''; for (let k = 0; x.length < 32; k++) { let h = 2166136261 ^ k; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0; x += h.toString(16).padStart(8, '0'); } return `${x.slice(0, 8)}-${x.slice(8, 12)}-4${x.slice(13, 16)}-a${x.slice(17, 20)}-${x.slice(20, 32)}`; };
  function tmdlTabla(t, i) {
    const tb = S.tablas[t], out = [`${i}table ${nomTmdl(t)}`, `${i}\tlineageTag: ${guid(t)}`, ''];
    if (tb.fuente.tipo === 'calcgroup') {
      out.push(`${i}\tcalculationGroup`, `${i}\t\tprecedence: 0`, '');
      for (const it of tb.fuente.items) out.push(`${i}\t\tcalculationItem ${nomTmdl(it.nombre)} = ${it.expr}`, '');
      out.push(`${i}\tcolumn ${nomTmdl(tb.fuente.columna)}`, `${i}\t\tdataType: string`, `${i}\t\tlineageTag: ${guid(t + '.c')}`, `${i}\t\tsummarizeBy: none`, `${i}\t\tsourceColumn: Name`, `${i}\t\tsortByColumn: Ordinal`, '', `${i}\tcolumn Ordinal`, `${i}\t\tdataType: int64`, `${i}\t\tisHidden`, `${i}\t\tsummarizeBy: sum`, `${i}\t\tsourceColumn: Ordinal`, '');
      return out.join('\n');
    }
    const desc = (k) => { const d = propsDe(k).descripcion; if (d) out.push(...d.split('\n').map((l) => `${i}\t/// ${l}`)); };
    if (propsDe(propKey(t)).descripcion) { out.splice(0, 0, ...propsDe(propKey(t)).descripcion.split('\n').map((l) => `${i}/// ${l}`)); }
    if (S.tablaFechas && S.tablaFechas.t === t) out.splice(out.length - 1, 0, `${i}\tdataCategory: Time`);
    if (propsDe(propKey(t)).oculto) out.splice(out.length - 1, 0, `${i}\tisHidden`);
    for (const m of S.medidas.filter((x) => (x.tabla || tablas()[0]) === t)) { const P = propsDe('m:' + m.nombre); desc('m:' + m.nombre); const ex = m.expr.includes('\n') ? `\n${m.expr.split('\n').map((l) => `${i}\t\t\t${l}`).join('\n')}` : ` ${m.expr}`; out.push(`${i}\tmeasure ${nomTmdl(m.nombre)} =${ex}`); const f = fmtTmdl(m.formato); if (f) out.push(`${i}\t\tformatString: ${f}`); if (P.oculto) out.push(`${i}\t\tisHidden`); if (P.carpeta) out.push(`${i}\t\tdisplayFolder: ${P.carpeta}`); out.push(`${i}\t\tlineageTag: ${guid(t + m.nombre)}`, ''); }
    for (const c of meta(t)) {
      const cc = tb.calc.find((x) => x.nombre === c.n); const P = propsDe(propKey(t, c.n));
      desc(propKey(t, c.n));
      out.push(cc ? `${i}\tcolumn ${nomTmdl(c.n)} = ${cc.expr}` : `${i}\tcolumn ${nomTmdl(c.n)}`);
      if (P.oculto) out.push(`${i}\t\tisHidden`); if (P.carpeta) out.push(`${i}\t\tdisplayFolder: ${P.carpeta}`); if (P.categoria) out.push(`${i}\t\tdataCategory: ${CAT_TMDL[P.categoria] || P.categoria}`); if (P.ordenarPor) out.push(`${i}\t\tsortByColumn: ${nomTmdl(P.ordenarPor)}`); if (S.tablaFechas && S.tablaFechas.t === t && S.tablaFechas.c === c.n) out.push(`${i}\t\tisKey`);
      out.push(`${i}\t\tdataType: ${TIPO_TMDL[c.t] || 'string'}`); if (c.t === 'fecha') out.push(`${i}\t\tformatString: Short Date`);
      out.push(`${i}\t\tlineageTag: ${guid(t + '.' + c.n)}`, `${i}\t\tsummarizeBy: ${esNum(t, c.n) ? ({ sum: 'sum', avg: 'average', min: 'min', max: 'max', count: 'count', distinct: 'distinctCount' }[(tb.resumen || {})[c.n] || 'sum'] || 'sum') : 'none'}`);
      if (!cc) out.push(`${i}\t\tsourceColumn: ${c.n}`);
      out.push('');
    }
    for (const h of jerarquias(t)) { out.push(`${i}\thierarchy ${nomTmdl(h.nombre)}`, `${i}\t\tlineageTag: ${guid(t + '.h.' + h.nombre)}`, ''); for (const n of h.niveles) out.push(`${i}\t\tlevel ${nomTmdl(n)}`, `${i}\t\t\tlineageTag: ${guid(t + '.h.' + h.nombre + n)}`, `${i}\t\t\tcolumn: ${nomTmdl(n)}`, ''); }
    if (tb.fuente.tipo === 'dax') out.push(`${i}\tpartition ${nomTmdl(t)} = calculated`, `${i}\t\tmode: import`, `${i}\t\tsource = ${tb.fuente.expr}`, '');
    else { const m = D().scriptM(tb.pasos).split('\n'); out.push(`${i}\tpartition ${nomTmdl(t)} = m`, `${i}\t\tmode: import`, `${i}\t\tsource =`, ...m.map((l) => `${i}\t\t\t\t${l}`), ''); }
    return out.join('\n');
  }
  function tmdlModelo() {
    const rel = S.rels.map((r) => [`relationship ${guid(r.de + r.cde + r.a + r.ca)}`, ...(r.activa ? [] : ['\tisActive: false']), ...(r.direccion === 'ambas' ? ['\tcrossFilteringBehavior: bothDirections'] : []), `\tfromColumn: ${nomTmdl(r.de)}.${nomTmdl(r.cde)}`, `\ttoColumn: ${nomTmdl(r.a)}.${nomTmdl(r.ca)}`, ''].join('\n'));
    const roles = (S.roles || []).map((r) => `role ${nomTmdl(r.nombre)}\n\tmodelPermission: read\n${[...new Set(r.reglas.map((g) => g.t))].map((t) => `\n\ttablePermission ${nomTmdl(t)} = ${daxRol(r, t)}`).join('\n')}\n`).join('\n');
    return `model Model\n\tculture: es-ES\n\tdefaultPowerBIDataSourceVersion: powerBI_V3\n\tsourceQueryCulture: es-AR\n\n${tablas().map((t) => `ref table ${nomTmdl(t)}`).join('\n')}\n${(S.roles || []).map((r) => `ref role ${nomTmdl(r.nombre)}`).join('\n')}\n\n${rel.join('\n')}\n${tablas().map((t) => tmdlTabla(t, '')).join('\n')}${roles ? '\n' + roles : ''}`;
  }
  // aplica un script TMDL (subconjunto: medidas, columnas calculadas, tablas calculadas, relaciones y formatString)
  function aplicarTmdl(texto) {
    construir();
    const lineas = texto.replace(/\r/g, '').split('\n'); const res = { medidas: 0, columnas: 0, tablas: 0, relaciones: 0, problemas: [] };
    const indent = (l) => (/^\t*/.exec(l)[0].length) + Math.floor((/^ */.exec(l.replace(/^\t*/, ''))[0].length) / 4);
    const nombre = (s) => { s = s.trim(); return s.startsWith("'") ? s.slice(1, s.lastIndexOf("'")).replace(/''/g, "'") : s.split(/\s|=/)[0]; };
    let tabla = null, objeto = null, nivelTabla = -1;
    const pendientes = [];
    for (let k = 0; k < lineas.length; k++) {
      const l = lineas[k]; if (!l.trim() || /^\s*\/\//.test(l)) continue;
      const n = indent(l), t = l.trim();
      let m;
      if ((m = /^(?:ref\s+)?table\s+(.+)$/.exec(t))) { tabla = nombre(m[1]); nivelTabla = n; objeto = null; continue; }
      if (n <= nivelTabla && !/^(ref\s+)?table\b/.test(t)) { tabla = null; }
      const tomarExpr = (desde) => { let ex = desde; while (k + 1 < lineas.length && (!lineas[k + 1].trim() || indent(lineas[k + 1]) > n + 1 || (indent(lineas[k + 1]) > n && !/^\s*[A-Za-z]+\s*:/.test(lineas[k + 1]) && !/^\s*(column|measure|partition|annotation|hierarchy|relationship|table)\b/.test(lineas[k + 1].trim())))) { k++; ex += '\n' + lineas[k].trim(); } return ex.trim(); };
      if ((m = /^measure\s+('(?:[^']|'')+'|[\wÀ-ÿ]+)\s*=\s*(.*)$/.exec(t))) { if (!tabla) { res.problemas.push(`Línea ${k + 1}: la medida debe estar dentro de una tabla.`); continue; } objeto = { tipo: 'medida', nombre: nombre(m[1]), expr: tomarExpr(m[2]), tabla, linea: k + 1 }; pendientes.push(objeto); continue; }
      if ((m = /^column\s+('(?:[^']|'')+'|[\wÀ-ÿ]+)\s*=\s*(.*)$/.exec(t))) { objeto = { tipo: 'columna', nombre: nombre(m[1]), expr: tomarExpr(m[2]), tabla, linea: k + 1 }; pendientes.push(objeto); continue; }
      if ((m = /^partition\s+.+=\s*calculated/.exec(t))) { objeto = { tipo: 'tablaCalc', tabla, linea: k + 1 }; pendientes.push(objeto); continue; }
      if ((m = /^source\s*=\s*(.*)$/.exec(t)) && objeto && objeto.tipo === 'tablaCalc') { objeto.expr = tomarExpr(m[1]); continue; }
      if ((m = /^relationship\s+(.+)$/.exec(t))) { objeto = { tipo: 'rel', linea: k + 1 }; pendientes.push(objeto); tabla = null; continue; }
      if ((m = /^(\w+)\s*:\s*(.*)$/.exec(t)) && objeto) {
        const [, p, v] = m;
        if (objeto.tipo === 'rel') { const par = (s) => { const mm = /^('(?:[^']|'')+'|[\wÀ-ÿ]+)\.('(?:[^']|'')+'|[\wÀ-ÿ]+)$/.exec(s.trim()); return mm ? [nombre(mm[1]), nombre(mm[2])] : null; }; if (p === 'fromColumn') objeto.de = par(v); if (p === 'toColumn') objeto.a = par(v); if (p === 'isActive') objeto.activa = v.trim() !== 'false'; if (p === 'crossFilteringBehavior') objeto.ambas = /both/i.test(v); }
        if (objeto.tipo === 'medida' && p === 'formatString') { const f = v.trim(); objeto.formato = /%/.test(f) ? { tipo: 'porcentaje', dec: ((f.split('.')[1] || '').match(/0/g) || []).length } : /\$/.test(f) ? { tipo: 'moneda', dec: ((f.split('.')[1] || '').match(/0/g) || []).length } : /\./.test(f) ? { tipo: 'decimal', dec: (f.split('.')[1].match(/0/g) || []).length } : { tipo: 'entero' }; }
      }
    }
    for (const o of pendientes) {
      try {
        if (o.tipo === 'medida') { motor.validarMedida(o.expr, { nombre: o.nombre, expr: o.expr }); const ex = S.medidas.find((x) => x.nombre.toLowerCase() === o.nombre.toLowerCase()); const val = { nombre: o.nombre, expr: o.expr, tabla: S.tablas[o.tabla] ? o.tabla : tablas()[0], ...(o.formato ? { formato: o.formato } : {}) }; if (ex) Object.assign(ex, val); else S.medidas.push(val); res.medidas++; }
        else if (o.tipo === 'columna') { if (!S.tablas[o.tabla]) throw new Error(`No existe la tabla ${o.tabla}`); motor.columnaCalculada(o.tabla, o.expr); const ex = S.tablas[o.tabla].calc.find((x) => x.nombre === o.nombre); if (ex) ex.expr = o.expr; else S.tablas[o.tabla].calc.push({ nombre: o.nombre, expr: o.expr }); res.columnas++; cambioModelo(); }
        else if (o.tipo === 'tablaCalc') { if (!o.expr) throw new Error('Falta "source = <expresión DAX>"'); motor.tablaCalculada(o.expr); if (S.tablas[o.tabla]) { if (S.tablas[o.tabla].fuente.tipo !== 'dax') throw new Error(`${o.tabla} viene de Power Query: no se puede convertir en tabla calculada`); S.tablas[o.tabla].fuente.expr = o.expr; } else S.tablas[o.tabla] = { fuente: { tipo: 'dax', expr: o.expr }, pasos: [], calc: [], resumen: {} }; res.tablas++; cambioModelo(); construir(); }
        else if (o.tipo === 'rel') { if (!o.de || !o.a) throw new Error('La relación necesita fromColumn y toColumn (Tabla.columna)'); for (const [tt, cc] of [o.de, o.a]) if (!meta(tt).some((c) => c.n === cc)) throw new Error(`No existe ${tt}.${cc}`); const ex = S.rels.find((r) => r.de === o.de[0] && r.cde === o.de[1] && r.a === o.a[0] && r.ca === o.a[1]); const val = { de: o.de[0], cde: o.de[1], a: o.a[0], ca: o.a[1], activa: o.activa !== false, direccion: o.ambas ? 'ambas' : 'unica' }; if (ex) Object.assign(ex, val); else S.rels.push(val); res.relaciones++; cambioModelo(); }
      } catch (e) { res.problemas.push(`Línea ${o.linea}: ${e.message}`); }
    }
    guardar(); return res;
  }
  function renderTmdl() {
    construir();
    const centro = main.querySelector('#pbCentro');
    if (S.tmdlTab >= S.tmdlTabs.length) S.tmdlTab = 0;
    const tab = S.tmdlTabs[S.tmdlTab];
    centro.innerHTML = `<div class="pb-codigo"><div class="pb-cod-barra"><button class="pb-btn pb-btn-run" data-aplicar>${fl('play')} Aplicar</button><button class="pb-btn" data-todo>Script del modelo completo</button><span class="pb-dim small">Haz clic en un objeto del panel Datos para escribir su TMDL en la pestaña. Edita y pulsa Aplicar (createOrReplace).</span></div><div class="pb-cod-ed" id="pbTmdlEd"></div><div class="pb-cod-res pb-tmdl-out"><div class="pb-cod-ptabs"><span class="on">Salida</span></div><div id="pbTmdlOut"><p class="pb-ayuda">TMDL (Tabular Model Definition Language) es el formato de texto del modelo semántico. En un proyecto .pbip cada tabla es un archivo .tmdl dentro de definition/tables/.</p></div></div><div class="pb-cod-tabs">${S.tmdlTabs.map((t, i) => `<span class="${i === S.tmdlTab ? 'on' : ''}" data-ttab="${i}">${esc(t.nombre)}${S.tmdlTabs.length > 1 ? `<button data-tcerrar="${i}">✕</button>` : ''}</span>`).join('')}<span data-tnueva title="Nuevo script">+</span></div></div>`;
    const ed = editorCodigo(main.querySelector('#pbTmdlEd'), tab.texto, 'tmdl', (v) => { tab.texto = v; guardar(true); }, () => aplicar());
    const out = main.querySelector('#pbTmdlOut');
    function aplicar() { const r = aplicarTmdl(ed.get()); out.innerHTML = `<div class="${r.problemas.length ? 'pb-res-err' : 'pb-res-ok'}">${new Date().toLocaleTimeString('es')} · ${r.problemas.length ? 'Se aplicó con problemas' : 'Se aplicó correctamente'}: ${r.medidas} medida(s), ${r.columnas} columna(s) calculada(s), ${r.tablas} tabla(s) calculada(s), ${r.relaciones} relación(es).${r.problemas.map((p) => `<br>⚠ ${esc(p)}`).join('')}</div>`; renderPie(); }
    centro.querySelector('[data-aplicar]').addEventListener('click', aplicar);
    centro.querySelector('[data-todo]').addEventListener('click', () => { ed.set(`createOrReplace\n\n${tmdlModelo().split('\n').map((l) => (l ? '\t' + l : l)).join('\n')}`); });
    centro.addEventListener('click', (e) => {
      const tb = e.target.closest('[data-ttab]'); if (tb && !e.target.closest('[data-tcerrar]')) { S.tmdlTab = Number(tb.dataset.ttab); guardar(true); renderTmdl(); return; }
      const c = e.target.closest('[data-tcerrar]'); if (c) { S.tmdlTabs.splice(Number(c.dataset.tcerrar), 1); S.tmdlTab = 0; guardar(true); renderTmdl(); return; }
      if (e.target.closest('[data-tnueva]')) { S.tmdlTabs.push({ nombre: `Script ${S.tmdlTabs.length + 1}`, texto: '' }); S.tmdlTab = S.tmdlTabs.length - 1; guardar(true); renderTmdl(); }
    });
    const pan = main.querySelector('#pbPaneles');
    pan.innerHTML = `<div class="pb-pan-col pb-col-datos"><div class="pb-pan"><div class="pb-pan-t">Datos</div><div class="pb-arbol">${arbolDatos(new Set())}</div><div class="pb-tabla-n" data-rels>${fl('organization_horizontal')} Relaciones (${S.rels.length})</div></div></div>`;
    const escribir = (txt) => { const actual = ed.get().trim(); if (actual && !/^createOrReplace\s*$/.test(actual)) { S.tmdlTabs.push({ nombre: `Script ${S.tmdlTabs.length + 1}`, texto: txt }); S.tmdlTab = S.tmdlTabs.length - 1; guardar(true); renderTmdl(); } else ed.set(txt); };
    pan.querySelectorAll('[data-tabla]').forEach((x) => x.addEventListener('click', (e) => { if (e.target.closest('.pb-chev')) { const s = new Set(S.tablasAbiertas || tablas().slice(0, 2)); s.has(x.dataset.tabla) ? s.delete(x.dataset.tabla) : s.add(x.dataset.tabla); S.tablasAbiertas = [...s]; guardar(true); renderTmdl(); return; } escribir(`createOrReplace\n\n${tmdlTabla(x.dataset.tabla, '\t')}`); }));
    pan.querySelectorAll('.pb-campo').forEach((x) => x.addEventListener('click', (e) => { e.preventDefault(); const f = campoDe(x); if (f.medida) { const m = S.medidas.find((y) => y.nombre === f.medida); const fm = fmtTmdl(m.formato); escribir(`createOrReplace\n\n\tref table ${nomTmdl(m.tabla || tablas()[0])}\n\n\t\tmeasure ${nomTmdl(m.nombre)} = ${m.expr}${fm ? `\n\t\t\tformatString: ${fm}` : ''}\n`); return; } const t = tmdlTabla(f.t, '\t').split('\n'); const i = t.findIndex((l) => new RegExp(`^\\t\\tcolumn ${nomTmdl(f.c).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}( =|$)`).test(l)); const fin = t.findIndex((l, j) => j > i && /^\t\t(column|measure|partition)\b/.test(l)); escribir(`createOrReplace\n\n\tref table ${nomTmdl(f.t)}\n\n${t.slice(i, fin < 0 ? undefined : fin).join('\n')}`); }));
    const rr = pan.querySelector('[data-rels]'); if (rr) rr.addEventListener('click', () => escribir(`createOrReplace\n\n${S.rels.map((r) => `\trelationship ${guid(r.de + r.cde + r.a + r.ca)}\n${r.activa ? '' : '\t\tisActive: false\n'}${r.direccion === 'ambas' ? '\t\tcrossFilteringBehavior: bothDirections\n' : ''}\t\tfromColumn: ${nomTmdl(r.de)}.${nomTmdl(r.cde)}\n\t\ttoColumn: ${nomTmdl(r.a)}.${nomTmdl(r.ca)}\n`).join('\n')}`));
    renderPie();
  }

  // ---------------------------------------------------------------- pie: páginas y barra de estado
  function renderPie() {
    const pie = main.querySelector('#pbPie');
    const resumen = `${tablas().length} tablas · ${S.rels.length} relaciones · ${S.medidas.length} medidas`;
    if (S.vista !== 'informe') { pie.innerHTML = `<div class="pb-estado"><span>${{ tabla: 'Vista de tabla', modelo: 'Vista de modelo', dax: 'Vista de consultas DAX', tmdl: 'Vista TMDL' }[S.vista]}</span><span class="spacer"></span><span>${resumen}</span></div>`; return; }
    pie.innerHTML = `<div class="pb-pags">${S.paginas.map((p, i) => (lectura && (p.oculta || p.tipo === 'tooltip') ? '' : `<button class="pb-pag ${i === S.pagina ? 'on' : ''} ${p.oculta ? 'pb-pag-oculta' : ''}" data-pag="${i}" title="Doble clic para cambiar el nombre · clic derecho para más opciones">${p.oculta ? fl('eye_off') + ' ' : ''}${p.tipo === 'tooltip' ? fl('tooltip_quote') + ' ' : p.tipo === 'detalles' ? fl('arrow_step_in') + ' ' : ''}${esc(p.nombre)}</button>`)).join('')}${lectura ? '' : '<button class="pb-pag pb-pag-nueva" data-pag-nueva title="Nueva página">+</button>'}</div><div class="pb-estado"><span>Página ${S.pagina + 1} de ${S.paginas.length}</span><span class="spacer"></span><span>${resumen}</span><span class="pb-zoom">− ━━━●━━━ + 100 %</span></div>`;
    pie.querySelectorAll('[data-pag]').forEach((b) => {
      const i = Number(b.dataset.pag);
      b.addEventListener('click', () => { if (window.PBIInforme) window.PBIInforme.irPagina(i); else { S.pagina = i; S.sel = null; S.cruz = null; S.enfoque = null; guardar(true); render(); } });
      b.addEventListener('dblclick', () => { const n = prompt('Nombre de la página:', S.paginas[i].nombre); if (n) { S.paginas[i].nombre = n; guardar(); renderPie(); } });
      b.addEventListener('contextmenu', (e) => { e.preventDefault(); if (window.PBIInforme) window.PBIInforme.menuPagina(i, e); });
    });
    const pn = pie.querySelector('[data-pag-nueva]'); if (pn) pn.addEventListener('click', () => accion('nueva-pagina'));
  }

  window.addEventListener('hashchange', () => { if (!/^#\/powerbi/.test(location.hash)) document.body.classList.remove('pb-abierto'); });
  window.PowerBI = { vista, verPublicado, NUEVO, _estado: () => S, _motor: () => (construir(), motor), _tmdl: () => (construir(), tmdlModelo()) };
  // funciones internas para los módulos que amplían la práctica (powerbi-informe.js)
  window.PowerBI._i = {
    S: () => S, main: () => main, lectura: () => lectura, toast: (...a) => toast(...a), pag, vis, todos, tablas, meta, tipoDe, esNum, esFecha, nomCampo, campoKey, paleta, fl, esc,
    guardar, render, renderPaneles, renderPie, pintar, refrescarCinta, cambioModelo, construir, consultar, ejecutar: (...a) => ejecutar(...a), filtrosDe, filtroEfectivo, datosVisual, dibujarVisual,
    agregarVisual, agregarCampo, quitarVisual, modal, pedir, descargar, jerarquias, tituloDe, exportarDatos, verComoTabla, barraFormula: (o) => barraFormula(o),
    conPagina: (p, fn) => { const prev = pagForzada; pagForzada = p; try { return fn(); } finally { pagForzada = prev; } }, propsDe: (k) => propsDe(k), setProp: (k, c, v) => setProp(k, c, v), propKey: (...a) => propKey(...a),
    registrarTabla: (n, f, p) => registrarTabla(n, f, p), DATOS: () => DATOS, guardarDatos: () => guardarDatos(), renombrarTabla: (a, b) => renombrarTabla(a, b), renombrarColumna: (t, a, b) => renombrarColumna(t, a, b), renombrarMedida: (m, n) => renombrarMedida(m, n), menuCampoViejo: (f, el) => menuCampo(f, el), powerQuery: (t) => powerQuery(t), D: () => D(), V: () => V(),
  };
})();
