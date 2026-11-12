/*
 * Microsoft Fabric de práctica: espacios de trabajo, lakehouse (Tables y Files, Load to Tables,
 * SQL analytics endpoint de solo lectura), warehouse con T-SQL, notebooks con PySpark y Spark SQL,
 * pipelines con Copy data y Notebook, modelo semántico, monitor, catálogo de OneLake e integración
 * con Git (los repositorios de la réplica de GitHub).
 *
 * Motores que reutiliza: SQLite (sql.js) con el modo T-SQL del laboratorio SQL para el endpoint y el
 * warehouse; el mini-Spark de Databricks (Pyodide) para las celdas PySpark. Los datos de ejemplo son
 * las bases del curso. Todo vive en el navegador (Store.data.fabric).
 * La interfaz sigue la documentación pública de Microsoft Learn (Fabric, nov. 2026). Sin logos oficiales.
 */
(function () {
  'use strict';
  const esc = (s) => String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ci = (n) => (window.IconosOficiales ? window.IconosOficiales.deCodicon(n) : `<i class="codicon codicon-${n}"></i>`);
  const ahora = () => new Date().toISOString();
  const uid = () => Math.random().toString(36).slice(2, 10);
  let main = null, Store = null, toast = (m) => console.log(m), ruta = [], query = new URLSearchParams();
  const USUARIO = 'alumno@academia.dev';

  // tipos de ítem: ícono, color del mosaico y en qué grupo del panel "New item" aparecen
  const TIPOS = {
    lakehouse: { n: 'Lakehouse', ico: 'database', col: '#0f7b6c', g: 'Store data', d: 'Store big data for cleaning, querying, reporting, and sharing.' },
    warehouse: { n: 'Warehouse', ico: 'server', col: '#1b6ac9', g: 'Store data', d: 'Provide strategic insights from multiple sources into your entire business.' },
    notebook: { n: 'Notebook', ico: 'notebook', col: '#8a3ffc', g: 'Prepare data', d: 'Explore, analyze, and visualize data and build machine learning models.' },
    pipeline: { n: 'Pipeline', ico: 'git-merge', col: '#0078d4', g: 'Get data', d: 'Ingest data at scale and schedule data workflows.' },
    dataflow: { n: 'Dataflow Gen2', ico: 'symbol-structure', col: '#d83b01', g: 'Get data', d: 'Prep, clean, and transform data with a low-code interface.', stub: true },
    copyjob: { n: 'Copy job', ico: 'copy', col: '#0078d4', g: 'Get data', d: 'Copy data from sources to destinations, including incremental copy.', stub: true },
    eventstream: { n: 'Eventstream', ico: 'pulse', col: '#c239b3', g: 'Get data', d: 'Capture, transform, and route real-time event streams.', stub: true },
    eventhouse: { n: 'Eventhouse', ico: 'flame', col: '#c239b3', g: 'Store data', d: 'Store and analyze large volumes of events and time series.', stub: true },
    sqldb: { n: 'SQL database', ico: 'database', col: '#1b6ac9', g: 'Store data', d: 'Build modern operational apps on a SQL database.', stub: true },
    sjd: { n: 'Spark Job Definition', ico: 'flame', col: '#8a3ffc', g: 'Prepare data', d: 'Define, schedule, and manage Apache Spark jobs.', stub: true },
    environment: { n: 'Environment', ico: 'settings-gear', col: '#8a3ffc', g: 'Prepare data', d: 'Set up shared libraries, Spark compute settings, and resources.', stub: true },
    semanticmodel: { n: 'Semantic model', ico: 'type-hierarchy', col: '#c19c00', g: 'Analyze and train data', d: 'Model tables, relationships, and measures for reports.' },
    report: { n: 'Report', ico: 'graph', col: '#c19c00', g: 'Analyze and train data', d: 'Create an interactive presentation of your data.', stub: true },
    experiment: { n: 'Experiment', ico: 'beaker', col: '#107c10', g: 'Analyze and train data', d: 'Create, run, and track the development of multiple models.', stub: true },
    activator: { n: 'Activator', ico: 'zap', col: '#c239b3', g: 'Track data', d: 'Monitor data and trigger actions when patterns occur.', stub: true },
  };
  const GRUPOS = ['Get data', 'Store data', 'Prepare data', 'Analyze and train data', 'Track data'];
  const MUESTRAS = ['clientes', 'productos', 'categorias', 'pedidos', 'detalle_pedidos', 'pagos', 'envios', 'devoluciones'];

  // ------------------------------------------------------------------ estado
  function F() {
    const d = Store.data;
    if (!d.fabric) {
      const w = uid();
      d.fabric = { ws: { [w]: { nombre: 'My workspace', desc: '', personal: true, creado: ahora(), items: {}, git: null } }, act: w, runs: [], tabs: [] };
    }
    d.fabric.runs = d.fabric.runs || []; d.fabric.tabs = d.fabric.tabs || [];
    return d.fabric;
  }
  const guardar = () => { try { Store.save(); } catch (e) { toast('El almacenamiento del navegador está lleno: borra ítems que no uses'); } };
  const wsDe = (id) => F().ws[id];
  const itemDe = (w, i) => (wsDe(w) || { items: {} }).items[i];
  function nuevoItem(wid, tipo, nombre) {
    const W = wsDe(wid), id = uid();
    const it = { id, tipo, nombre, creado: ahora(), mod: ahora(), dueño: 'Alumno' };
    if (tipo === 'lakehouse') Object.assign(it, { files: {}, tablas: {}, atajos: [] });
    if (tipo === 'warehouse') Object.assign(it, { tablas: {}, consultas: [] });
    if (tipo === 'notebook') Object.assign(it, { celdas: [{ id: uid(), tipo: 'code', lang: 'pyspark', src: '# Welcome to your new notebook\n# Type here in the cell editor to add code!\n' }], lh: null });
    if (tipo === 'pipeline') Object.assign(it, { acts: [] });
    if (tipo === 'semanticmodel') Object.assign(it, { origen: null, tablas: [], medidas: [] });
    W.items[id] = it; guardar();
    return it;
  }
  const nombreLibre = (W, base) => { const ns = new Set(Object.values(W.items).map((i) => i.nombre)); let n = 1; while (ns.has(`${base}${n}`)) n++; return `${base}${n}`; };
  const validoNombre = (n) => /^[A-Za-z][A-Za-z0-9_]{0,255}$/.test(n);
  function registrarRun(o) { const r = { id: uid(), inicio: ahora(), estado: 'In progress', por: 'Alumno', ...o }; F().runs.unshift(r); F().runs.length = Math.min(F().runs.length, 80); return r; }
  const terminarRun = (r, ok, det) => { r.estado = ok ? 'Succeeded' : 'Failed'; r.fin = ahora(); if (det) r.det = det; guardar(); };

  // ------------------------------------------------------------------ datos de tablas
  // tabla: { cols: [{n, t}], filas: [[...]], origen?: 'muestra:pedidos', creado }
  function filasMuestra(n) {
    const r = window.Engines.SQL.exec(`SELECT * FROM "${n}"`, window.Engines.SQL.playground());
    if (!r.ok || !r.results[0]) return { cols: [], filas: [] };
    const res = r.results[0];
    return { cols: res.columns.map((c, i) => ({ n: c, t: tipoDe(res.values.map((v) => v[i])) })), filas: res.values };
  }
  function datosTabla(t) { if (t.origen && t.origen.startsWith('muestra:')) { const m = filasMuestra(t.origen.slice(8)); return { cols: t.cols && t.cols.length ? t.cols : m.cols, filas: m.filas }; } return { cols: t.cols, filas: t.filas || [] }; }
  function tipoDe(vals) {
    const v = vals.filter((x) => x !== null && x !== undefined && x !== '');
    if (!v.length) return 'string';
    if (v.every((x) => typeof x === 'number' ? Number.isInteger(x) : /^-?\d+$/.test(x))) return 'int';
    if (v.every((x) => typeof x === 'number' || /^-?\d+(\.\d+)?$/.test(x))) return 'double';
    if (v.every((x) => /^\d{4}-\d{2}-\d{2}$/.test(x))) return 'date';
    if (v.every((x) => /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(x))) return 'timestamp';
    if (v.every((x) => /^(true|false)$/i.test(String(x)))) return 'boolean';
    return 'string';
  }
  const SQLT = { int: 'INTEGER', bigint: 'INTEGER', double: 'REAL', float: 'REAL', decimal: 'REAL', date: 'TEXT', timestamp: 'TEXT', boolean: 'INTEGER', string: 'TEXT' };
  const TSQL = { int: 'int', bigint: 'bigint', double: 'float', date: 'date', timestamp: 'datetime2(6)', boolean: 'bit', string: 'varchar(8000)' };
  function parseCsv(txt, sep = ',') {
    const out = []; let fila = [], cur = '', q = false;
    for (let i = 0; i < txt.length; i++) {
      const c = txt[i];
      if (q) { if (c === '"' && txt[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; continue; }
      if (c === '"') q = true; else if (c === sep) { fila.push(cur); cur = ''; } else if (c === '\n' || c === '\r') { if (c === '\r' && txt[i + 1] === '\n') i++; fila.push(cur); out.push(fila); fila = []; cur = ''; } else cur += c;
    }
    if (cur || fila.length) { fila.push(cur); out.push(fila); }
    return out.filter((f) => f.length > 1 || f[0] !== '');
  }
  function tablaDesdeCsv(txt, header = true, sep = ',') {
    const L = parseCsv(txt, sep); if (!L.length) throw new Error('El archivo está vacío');
    const cols0 = header ? L[0] : L[0].map((_, i) => `_c${i}`);
    const data = header ? L.slice(1) : L;
    const nombres = cols0.map((c, i) => (c || `_c${i}`).trim().replace(/[^A-Za-z0-9_]/g, '_'));
    const cols = nombres.map((n, i) => ({ n, t: tipoDe(data.map((f) => f[i])) }));
    const conv = (v, t) => (v === '' || v === undefined ? null : t === 'int' ? parseInt(v, 10) : t === 'double' ? Number(v) : t === 'boolean' ? /^true$/i.test(v) : v);
    return { cols, filas: data.map((f) => cols.map((c, i) => conv(f[i], c.t))) };
  }

  // ------------------------------------------------------------------ SQL (SQLite con modo T-SQL)
  const clave = (item, t) => `${item.nombre}__${t}`.toLowerCase();
  // crea una base SQLite con las tablas del espacio de trabajo: las del ítem actual con su nombre corto
  function baseDe(W, actual) {
    const S = window.Engines.SQL;
    const db = new S._SQL.Database();
    const cargar = (nombre, t) => {
      const d = datosTabla(t);
      if (!d.cols.length) return;
      db.run(`CREATE TABLE "${nombre}" (${d.cols.map((c) => `"${c.n}" ${SQLT[c.t] || 'TEXT'}`).join(', ')})`);
      if (d.filas.length) {
        const st = db.prepare(`INSERT INTO "${nombre}" VALUES (${d.cols.map(() => '?').join(',')})`);
        db.run('BEGIN'); for (const f of d.filas) st.run(f.map((v) => (typeof v === 'boolean' ? (v ? 1 : 0) : v))); db.run('COMMIT'); st.free();
      }
    };
    for (const it of Object.values(W.items)) if (it.tablas && (it.tipo === 'lakehouse' || it.tipo === 'warehouse')) for (const [n, t] of Object.entries(it.tablas)) { cargar(clave(it, n), t); if (it === actual) cargar(n.toLowerCase(), t); }
    for (const it of Object.values(W.items)) if (it.tipo === 'lakehouse' && it.atajos) for (const a of it.atajos) { const o = itemDe(a.ws, a.item); const t = o && o.tablas[a.tabla]; if (t) { cargar(clave(it, a.nombre), t); if (it === actual) cargar(a.nombre.toLowerCase(), t); } }
    return db;
  }
  // [Lakehouse1].[dbo].[ventas] o Lakehouse1.dbo.ventas → "lakehouse1__ventas"
  function nombresTresPartes(sql, W) {
    const nombres = new Set(Object.values(W.items).map((i) => i.nombre.toLowerCase()));
    return sql.replace(/\[?([A-Za-z_]\w*)\]?\.\[?(dbo)\]?\.\[?([A-Za-z_]\w*)\]?/gi, (m, a, s, t) => (nombres.has(a.toLowerCase()) ? `"${a.toLowerCase()}__${t.toLowerCase()}"` : m));
  }
  const DML = /^\s*(insert|update|delete|merge|truncate|create\s+table|drop\s+table|alter\s+table|select\s[\s\S]*\binto\b)/i;
  // ejecuta T-SQL. modo: 'endpoint' (solo lectura) | 'warehouse' (escritura y sincroniza las tablas)
  function correrTsql(W, item, sql, modo) {
    const sentencias = sql.split(/;\s*(?:\n|$)|\n\s*GO\s*(?:\n|$)/i).map((x) => x.trim()).filter(Boolean);
    if (modo === 'endpoint') { const mala = sentencias.find((s) => DML.test(s)); if (mala) return { ok: false, error: `Msg 15868, Level 16, State 1\nThe data manipulation language (DML) statement '${mala.split(/\s+/).slice(0, 2).join(' ').toUpperCase()}' is not supported on the SQL analytics endpoint. The endpoint is read-only: write with Spark (a notebook) or use a Warehouse.` }; }
    if (!window.SqlMotores) return { ok: false, error: 'Falta el motor SQL' };
    const db = baseDe(W, item);
    const t0 = performance.now();
    const resultados = []; let filasAfectadas = 0;
    try {
      for (const s0 of sentencias) {
        const s1 = nombresTresPartes(s0, W);
        let tr;
        try { tr = window.SqlMotores.traducir(s1, 'sqlserver'); } catch (e) { return { ok: false, error: e.message }; }
        const r = window.Engines.SQL.exec(tr.sql, db);
        if (!r.ok) return { ok: false, error: `Msg 102, Level 15, State 1, Line 1\n${r.error}`, ms: performance.now() - t0 };
        filasAfectadas += r.changes || 0;
        if (r.results.length) resultados.push(r.results[r.results.length - 1]);
      }
      if (modo === 'warehouse') sincronizar(db, item);
      return { ok: true, resultados, cambios: filasAfectadas, ms: performance.now() - t0 };
    } finally { db.close(); }
  }
  // copia de vuelta a la tienda las tablas que el warehouse (o un %%sql) creó o cambió
  function sincronizar(db, item) {
    const r = db.exec("SELECT name FROM sqlite_master WHERE type='table'");
    const atajos = new Set((item.atajos || []).map((a) => a.nombre.toLowerCase()));
    const presentes = new Set();
    for (const [n] of (r[0] || { values: [] }).values) {
      if (n.includes('__') || atajos.has(n.toLowerCase())) continue;
      const info = db.exec(`PRAGMA table_info("${n}")`)[0];
      const datos = db.exec(`SELECT * FROM "${n}" LIMIT 50000`)[0];
      const filas = datos ? datos.values : [];
      const tipos = info.values.map((v) => v[2]);
      const cols = info.values.map((v, i) => ({ n: v[1], t: /INT|BIT/i.test(tipos[i]) ? 'int' : /REAL|FLOA|DOUB|NUM|DEC/i.test(tipos[i]) ? 'double' : tipoDe(filas.map((f) => f[i])) }));
      const ant = Object.keys(item.tablas).find((k) => k.toLowerCase() === n.toLowerCase()) || n;
      const viejo = item.tablas[ant];
      const vd = viejo ? datosTabla(viejo) : null;
      if (!viejo || vd.cols.length !== cols.length || vd.filas.length !== filas.length || JSON.stringify(vd.filas) !== JSON.stringify(filas)) item.tablas[ant] = { cols, filas, creado: (viejo && viejo.creado) || ahora(), mod: ahora() };
      presentes.add(ant.toLowerCase());
    }
    for (const k of Object.keys(item.tablas)) if (!presentes.has(k.toLowerCase())) delete item.tablas[k];
    item.mod = ahora(); guardar();
  }

  // ------------------------------------------------------------------ marco
  const NAV = [['home', 'home', 'Home'], ['ws', 'organization', 'Workspaces'], ['onelake', 'database', 'OneLake'], ['monitor', 'pulse', 'Monitor'], ['realtime', 'zap', 'Real-Time'], ['workloads', 'extensions', 'Workloads']];
  function marco(sel, cuerpo, o = {}) {
    const f = F(), W = wsDe(o.ws || f.act);
    const abiertos = f.tabs.filter((t) => itemDe(t.ws, t.item)).slice(-6);
    main.innerHTML = `<div class="fbp" id="fbp">
      <header class="fb-top"><button class="fb-tb" title="App launcher">${ci('extensions')}</button><a class="fb-marca" href="#/fabric">Microsoft Fabric <span>práctica</span></a>
        ${o.migas ? `<span class="fb-migas">${o.migas}</span>` : ''}
        <label class="fb-buscar">${ci('search')}<input id="fbQ" placeholder="Search" autocomplete="off"></label><span class="fb-sp"></span>
        <span class="fb-trial" title="Capacidad de prueba: F64">Trial: 54 days left</span><button class="fb-tb" title="Notifications">${ci('bell')}</button><button class="fb-tb" title="Settings">${ci('settings-gear')}</button><button class="fb-tb" title="Help">?</button><span class="fb-avatar" title="${USUARIO}">A</span></header>
      <div class="fb-cuerpo"><nav class="fb-nav">${NAV.map(([id, ico, t]) => `<a href="#/fabric${id === 'home' ? '' : '/' + id}" class="${sel === id ? 'sel' : ''}" ${id === 'ws' ? 'data-ws-flyout' : ''}>${ci(ico)}<span>${t}</span></a>`).join('')}
        <hr>${W ? `<a href="#/fabric/ws/${f.act}" class="${sel === 'wsact' ? 'sel' : ''}" title="${esc(W.nombre)}">${ci('folder')}<span>${esc(W.nombre.length > 11 ? W.nombre.slice(0, 10) + '…' : W.nombre)}</span></a>` : ''}
        ${abiertos.map((t) => { const it = itemDe(t.ws, t.item); const T = TIPOS[it.tipo]; return `<a href="#/fabric/ws/${t.ws}/${t.item}" class="${o.item === t.item ? 'sel' : ''}" title="${esc(it.nombre)}"><i class="codicon codicon-${T.ico}" style="color:${T.col}"></i><span>${esc(it.nombre.length > 11 ? it.nombre.slice(0, 10) + '…' : it.nombre)}</span></a>`; }).join('')}
        <span class="fb-sp"></span><a href="#/herramientas" title="Volver al curso">${ci('arrow-left')}<span>Curso</span></a></nav>
        <main class="fb-main">${cuerpo}</main></div>
      <div class="fb-flyout" id="fbFly" hidden></div><div id="fbModal"></div></div>`;
    document.body.classList.add('fb-abierto');
    const fly = main.querySelector('#fbFly');
    main.querySelector('[data-ws-flyout]').addEventListener('click', (e) => { e.preventDefault(); fly.hidden = !fly.hidden; if (!fly.hidden) pintarFlyout(fly); });
    main.addEventListener('click', (e) => { if (!fly.hidden && !e.target.closest('#fbFly') && !e.target.closest('[data-ws-flyout]')) fly.hidden = true; });
    const q = main.querySelector('#fbQ');
    q.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      const t = q.value.trim().toLowerCase(); if (!t) return;
      for (const [wid, w] of Object.entries(F().ws)) for (const it of Object.values(w.items)) if (it.nombre.toLowerCase().includes(t)) { location.hash = `#/fabric/ws/${wid}/${it.id}`; return; }
      toast(`No items matched "${q.value}"`);
    });
  }
  function pintarFlyout(fly) {
    const f = F();
    fly.innerHTML = `<div class="fb-fly-t"><b>Workspaces</b></div><input class="fb-input" placeholder="Search" id="fbFlyQ">
      <div class="fb-fly-l">${Object.entries(f.ws).map(([id, w]) => `<a href="#/fabric/ws/${id}" data-n="${esc(w.nombre.toLowerCase())}">${ci(w.personal ? 'account' : 'folder')} ${esc(w.nombre)}${id === f.act ? ' ' + ci('check') : ''}</a>`).join('')}</div>
      <button class="fb-btn fb-btn-p" id="fbNuevoWs">${ci('add')} New workspace</button>`;
    fly.querySelector('#fbFlyQ').addEventListener('input', (e) => fly.querySelectorAll('[data-n]').forEach((a) => { a.hidden = !a.dataset.n.includes(e.target.value.toLowerCase()); }));
    fly.querySelector('#fbNuevoWs').addEventListener('click', () => { fly.hidden = true; dialogoWs(); });
  }
  function modal(html, alAbrir) {
    const m = document.getElementById('fbModal');
    m.innerHTML = `<div class="fb-modal-f"><div class="fb-modal">${html}</div></div>`;
    const cerrar = () => { m.innerHTML = ''; };
    m.querySelectorAll('[data-cerrar]').forEach((b) => b.addEventListener('click', cerrar));
    if (alAbrir) alAbrir(m, cerrar);
    const i = m.querySelector('input:not([type=checkbox]):not([type=radio]), textarea'); if (i) setTimeout(() => i.focus(), 30);
  }
  function panel(html, alAbrir) {
    const m = document.getElementById('fbModal');
    m.innerHTML = `<div class="fb-panel-f"><aside class="fb-panel">${html}</aside></div>`;
    const cerrar = () => { m.innerHTML = ''; };
    m.querySelectorAll('[data-cerrar]').forEach((b) => b.addEventListener('click', cerrar));
    m.querySelector('.fb-panel-f').addEventListener('click', (e) => { if (e.target.classList.contains('fb-panel-f')) cerrar(); });
    if (alAbrir) alAbrir(m, cerrar);
  }
  function dialogoWs() {
    panel(`<div class="fb-panel-h"><b>Create a workspace</b><button class="fb-tb" data-cerrar>${ci('close')}</button></div><div class="fb-panel-b">
      <label class="fb-lbl">Name <span class="fb-rojo">*</span></label><input class="fb-input" id="wsN"><div class="fb-nota" id="wsNota"></div>
      <label class="fb-lbl">Description</label><textarea class="fb-input" id="wsD" rows="3"></textarea>
      <details class="fb-det" open><summary>Advanced</summary><label class="fb-lbl">License mode</label>
        <label class="fb-radio"><input type="radio" name="wsL" checked> Trial <span class="fb-dim">(capacidad de prueba F64)</span></label><label class="fb-radio"><input type="radio" name="wsL"> Fabric capacity</label><label class="fb-radio"><input type="radio" name="wsL"> Pro <span class="fb-dim">(solo Power BI: sin lakehouse ni notebooks)</span></label></details>
      </div><div class="fb-panel-p"><button class="fb-btn fb-btn-p" id="wsOk">Apply</button><button class="fb-btn" data-cerrar>Cancel</button></div>`, (m, cerrar) => {
      m.querySelector('#wsOk').addEventListener('click', () => {
        const n = m.querySelector('#wsN').value.trim();
        if (!n) { m.querySelector('#wsNota').textContent = 'Name is required'; return; }
        if (Object.values(F().ws).some((w) => w.nombre.toLowerCase() === n.toLowerCase())) { m.querySelector('#wsNota').textContent = 'This name is already in use.'; return; }
        const id = uid(); F().ws[id] = { nombre: n, desc: m.querySelector('#wsD').value, creado: ahora(), items: {}, git: null, pro: m.querySelectorAll('[name=wsL]')[2].checked }; F().act = id; guardar(); cerrar(); location.hash = `#/fabric/ws/${id}`;
      });
    });
  }

  // ------------------------------------------------------------------ Home, OneLake, Monitor
  function vistaHome() {
    const f = F();
    const recientes = Object.entries(f.ws).flatMap(([wid, w]) => Object.values(w.items).map((it) => ({ wid, w, it }))).sort((a, b) => String(b.it.mod).localeCompare(String(a.it.mod))).slice(0, 10);
    const cuerpo = `<div class="fb-pag"><h1 class="fb-h1">Welcome to Fabric, Alumno</h1>
      <div class="fb-practica">${ci('lightbulb')} <span>Fabric junta en un solo lugar lo que en Azure son varios servicios: ingesta (pipelines), almacenamiento (OneLake, lakehouse, warehouse), transformación (notebooks de Spark) y Power BI. Empieza creando un <b>workspace</b> y un <b>lakehouse</b>, carga datos de ejemplo y consúltalos con SQL y con Spark.</span></div>
      <div class="fb-row-t"><h2 class="fb-h2">Create</h2></div>
      <div class="fb-crear">${['lakehouse', 'warehouse', 'notebook', 'pipeline', 'semanticmodel'].map((t) => `<button class="fb-tile" data-crear="${t}"><span class="fb-ico" style="--c:${TIPOS[t].col}">${ci(TIPOS[t].ico)}</span><b>${TIPOS[t].n}</b><span class="fb-dim">${TIPOS[t].d}</span></button>`).join('')}</div>
      <h2 class="fb-h2">Recent items</h2>${recientes.length ? tablaItems(recientes.map((x) => ({ ...x.it, _ws: x.wid, _wsn: x.w.nombre })), true) : '<p class="fb-dim">Todavía no hay ítems. Crea uno arriba.</p>'}
      <h2 class="fb-h2">Workspaces</h2><div class="fb-wslist">${Object.entries(f.ws).map(([id, w]) => `<a class="fb-wscard" href="#/fabric/ws/${id}">${ci(w.personal ? 'account' : 'folder')} <b>${esc(w.nombre)}</b><span class="fb-dim">${Object.keys(w.items).length} items</span></a>`).join('')}<button class="fb-wscard fb-wsnuevo" id="fbWsN">${ci('add')} New workspace</button></div></div>`;
    marco('home', cuerpo);
    main.querySelectorAll('[data-crear]').forEach((b) => b.addEventListener('click', () => dialogoNuevoItem(F().act, b.dataset.crear)));
    main.querySelector('#fbWsN').addEventListener('click', dialogoWs);
  }
  function tablaItems(lista, conWs) {
    return `<table class="fb-tabla"><thead><tr><th>Name</th><th>Type</th>${conWs ? '<th>Location</th>' : '<th>Task</th>'}<th>Owner</th><th>Refreshed</th><th>Endorsement</th><th>Sensitivity</th></tr></thead><tbody>
      ${lista.map((it) => { const T = TIPOS[it.tipo]; return `<tr><td><a class="fb-item" href="#/fabric/ws/${it._ws}/${it.id}"><span class="fb-ico fb-ico-s" style="--c:${T.col}">${ci(T.ico)}</span>${esc(it.nombre)}</a>${it.tipo === 'lakehouse' ? `<div class="fb-sub fb-dim">${ci('database')} SQL analytics endpoint</div>` : ''}</td><td>${T.n}</td><td class="fb-dim">${conWs ? esc(it._wsn) : '—'}</td><td>${esc(it.dueño || 'Alumno')}</td><td class="fb-dim">${tiempo(it.mod)}</td><td class="fb-dim">—</td><td class="fb-dim">—</td></tr>`; }).join('')}</tbody></table>`;
  }
  function tiempo(iso) { if (!iso) return '—'; const s = (Date.now() - new Date(iso)) / 1000; return s < 60 ? 'Just now' : s < 3600 ? `${Math.round(s / 60)} min ago` : s < 86400 ? `${Math.round(s / 3600)} hr ago` : new Date(iso).toLocaleDateString('en-US'); }
  function vistaOneLake() {
    const todos = Object.entries(F().ws).flatMap(([wid, w]) => Object.values(w.items).map((it) => ({ ...it, _ws: wid, _wsn: w.nombre })));
    const filtro = query.get('tipo') || '';
    const cuerpo = `<div class="fb-pag"><h1 class="fb-h1">OneLake catalog</h1><nav class="fb-tabs"><a class="sel">Explore</a><a class="fb-dim">Govern</a><a class="fb-dim">Secure</a></nav>
      <div class="fb-filtros"><a href="#/fabric/onelake" class="${filtro ? '' : 'sel'}">All items</a>${['lakehouse', 'warehouse', 'notebook', 'pipeline', 'semanticmodel'].map((t) => `<a href="#/fabric/onelake?tipo=${t}" class="${filtro === t ? 'sel' : ''}">${TIPOS[t].n}</a>`).join('')}</div>
      ${tablaItems(todos.filter((i) => !filtro || i.tipo === filtro), true)}
      <div class="fb-practica">${ci('lightbulb')} <span><b>OneLake</b> es un único data lake por organización (como OneDrive, pero para datos). Cada lakehouse y warehouse guarda sus tablas en OneLake en formato Delta, así que un notebook, el endpoint SQL y Power BI leen la <b>misma copia</b> sin moverla.</span></div></div>`;
    marco('onelake', cuerpo);
  }
  function vistaMonitor() {
    const runs = F().runs;
    const cuerpo = `<div class="fb-pag"><h1 class="fb-h1">Monitor</h1><p class="fb-dim">View and track the status of the activities across all the workspaces you have permissions to.</p>
      <table class="fb-tabla"><thead><tr><th>Activity name</th><th>Status</th><th>Item type</th><th>Start time</th><th>Submitted by</th><th>Duration</th><th>Location</th></tr></thead><tbody>
      ${runs.map((r) => `<tr><td>${esc(r.nombre)}</td><td><span class="fb-estado fb-estado-${r.estado === 'Succeeded' ? 'ok' : r.estado === 'Failed' ? 'mal' : 'run'}">${r.estado === 'Succeeded' ? ci('pass-filled') : r.estado === 'Failed' ? ci('error') : ci('loading')} ${r.estado}</span>${r.det ? `<div class="fb-dim fb-sm">${esc(String(r.det).slice(0, 140))}</div>` : ''}</td><td>${esc(r.tipo)}</td><td class="fb-dim">${new Date(r.inicio).toLocaleString('en-US')}</td><td>${esc(r.por)}</td><td class="fb-dim">${r.fin ? Math.max(1, Math.round((new Date(r.fin) - new Date(r.inicio)) / 1000)) + 's' : '—'}</td><td class="fb-dim">${esc(r.wsn || '')}</td></tr>`).join('') || '<tr><td colspan="7" class="fb-dim">No hay actividades todavía: corre un notebook, un pipeline o un Load to Tables.</td></tr>'}</tbody></table></div>`;
    marco('monitor', cuerpo);
  }
  function vistaStub(sel, titulo, txt) { marco(sel, `<div class="fb-pag"><h1 class="fb-h1">${titulo}</h1><div class="fb-vacio">${ci('info')}<p>${txt}</p></div></div>`); }

  // ------------------------------------------------------------------ workspace
  function vistaWs(wid) {
    const W = wsDe(wid); if (!W) { location.hash = '#/fabric'; return; }
    F().act = wid;
    const items = Object.values(W.items).map((it) => ({ ...it, _ws: wid }));
    const vista = query.get('vista') || 'list';
    const linaje = () => {
      const nodos = items.map((it) => {
        const T = TIPOS[it.tipo];
        const usa = it.tipo === 'notebook' && it.lh ? [it.lh] : it.tipo === 'semanticmodel' && it.origen ? [it.origen] : it.tipo === 'pipeline' ? it.acts.flatMap((a) => [a.dest && a.dest.item, a.nb]).filter(Boolean) : [];
        return `<div class="fb-lin-n"><span class="fb-ico fb-ico-s" style="--c:${T.col}">${ci(T.ico)}</span><b>${esc(it.nombre)}</b><span class="fb-dim">${T.n}</span>${usa.length ? `<span class="fb-dim fb-sm">→ ${usa.map((u) => esc((W.items[u] || {}).nombre || '')).join(', ')}</span>` : ''}</div>`;
      });
      return `<div class="fb-linaje">${nodos.join('') || '<p class="fb-dim">Sin ítems</p>'}</div>`;
    };
    const cuerpo = `<div class="fb-pag"><div class="fb-ws-h"><span class="fb-ws-ico">${ci(W.personal ? 'account' : 'folder')}</span><h1 class="fb-h1">${esc(W.nombre)}</h1><span class="fb-sp"></span>
        ${W.git ? `<button class="fb-btn" id="fbSrc">${ci('source-control')} Source control ${cambiosGit(W).length ? `<span class="fb-badge">${cambiosGit(W).length}</span>` : ''}</button>` : ''}<button class="fb-btn" id="fbWsSet">${ci('settings-gear')} Workspace settings</button></div>
      ${W.desc ? `<p class="fb-dim">${esc(W.desc)}</p>` : ''}
      <div class="fb-cmd"><button class="fb-btn fb-btn-p" id="fbNuevo">${ci('add')} New item</button><button class="fb-btn" id="fbCarpeta">${ci('new-folder')} New folder</button><button class="fb-btn" id="fbImport">${ci('cloud-upload')} Import</button><span class="fb-sp"></span>
        <span class="fb-seg"><a href="#/fabric/ws/${wid}" class="${vista === 'list' ? 'sel' : ''}">${ci('list-flat')} List</a><a href="#/fabric/ws/${wid}?vista=lineage" class="${vista === 'lineage' ? 'sel' : ''}">${ci('type-hierarchy-sub')} Lineage</a></span></div>
      ${W.pro ? `<div class="fb-aviso">${ci('warning')} Este workspace usa licencia Pro: solo admite ítems de Power BI. Para lakehouse, notebooks o pipelines necesitas una capacidad de Fabric (Trial o F SKU).</div>` : ''}
      ${vista === 'lineage' ? linaje() : items.length ? tablaItems(items) : `<div class="fb-vacio">${ci('folder-opened')}<h3>There's nothing here yet</h3><p class="fb-dim">Create an item to start working with your data.</p><button class="fb-btn fb-btn-p" id="fbNuevo2">${ci('add')} New item</button></div>`}</div>`;
    marco('wsact', cuerpo, { ws: wid, migas: `${esc(W.nombre)}` });
    const abrirNuevo = () => panelNuevoItem(wid);
    main.querySelector('#fbNuevo').addEventListener('click', abrirNuevo);
    const n2 = main.querySelector('#fbNuevo2'); if (n2) n2.addEventListener('click', abrirNuevo);
    main.querySelector('#fbCarpeta').addEventListener('click', () => toast('(práctica) las carpetas de workspace no están simuladas'));
    main.querySelector('#fbImport').addEventListener('click', () => toast('(práctica) importa notebooks con Git: Workspace settings → Git integration'));
    main.querySelector('#fbWsSet').addEventListener('click', () => ajustesWs(wid));
    const sc = main.querySelector('#fbSrc'); if (sc) sc.addEventListener('click', () => panelGit(wid));
  }
  function panelNuevoItem(wid) {
    const W = wsDe(wid);
    panel(`<div class="fb-panel-h"><b>New item</b><button class="fb-tb" data-cerrar>${ci('close')}</button></div><div class="fb-panel-b"><input class="fb-input" placeholder="Filter by item type" id="niQ">
      ${GRUPOS.map((g) => `<div class="fb-ng"><div class="fb-ng-t">${g}</div><div class="fb-ng-l">${Object.entries(TIPOS).filter(([, T]) => T.g === g).map(([k, T]) => `<button class="fb-ni${T.stub ? ' fb-ni-stub' : ''}" data-tipo="${k}" data-n="${T.n.toLowerCase()}"><span class="fb-ico" style="--c:${T.col}">${ci(T.ico)}</span><div><b>${T.n}</b><div class="fb-dim fb-sm">${T.d}</div></div></button>`).join('')}</div></div>`).join('')}</div>`, (m, cerrar) => {
      m.querySelector('#niQ').addEventListener('input', (e) => m.querySelectorAll('[data-n]').forEach((b) => { b.hidden = !b.dataset.n.includes(e.target.value.toLowerCase()); }));
      m.querySelectorAll('[data-tipo]').forEach((b) => b.addEventListener('click', () => {
        const t = b.dataset.tipo;
        if (TIPOS[t].stub) { toast(`(práctica) ${TIPOS[t].n} no está en la réplica: usa Lakehouse, Warehouse, Notebook, Pipeline o Semantic model`); return; }
        if (W.pro && t !== 'semanticmodel') { toast('This item type requires a Fabric capacity. Change the workspace license mode.'); return; }
        cerrar(); dialogoNuevoItem(wid, t);
      }));
    });
  }
  function dialogoNuevoItem(wid, tipo) {
    const W = wsDe(wid), T = TIPOS[tipo];
    const base = { lakehouse: 'Lakehouse', warehouse: 'Warehouse', notebook: 'Notebook', pipeline: 'Pipeline', semanticmodel: 'SemanticModel' }[tipo];
    modal(`<div class="fb-modal-h"><span class="fb-ico fb-ico-s" style="--c:${T.col}">${ci(T.ico)}</span><b>New ${T.n.toLowerCase()}</b><button class="fb-tb" data-cerrar>${ci('close')}</button></div><div class="fb-modal-b">
      <label class="fb-lbl">Name <span class="fb-rojo">*</span></label><input class="fb-input" id="niN" value="${esc(nombreLibre(W, base))}"><div class="fb-nota" id="niNota"></div>
      <label class="fb-lbl">Location</label><select class="fb-input" id="niW">${Object.entries(F().ws).map(([id, w]) => `<option value="${id}"${id === wid ? ' selected' : ''}>${esc(w.nombre)}</option>`).join('')}</select>
      ${tipo === 'lakehouse' ? '<label class="fb-check"><input type="checkbox" checked disabled> Lakehouse schemas <span class="fb-dim">(las tablas van en el esquema dbo)</span></label>' : ''}</div>
      <div class="fb-modal-p"><button class="fb-btn fb-btn-p" id="niOk">Create</button><button class="fb-btn" data-cerrar>Cancel</button></div>`, (m, cerrar) => {
      const ok = () => {
        const n = m.querySelector('#niN').value.trim(), w2 = m.querySelector('#niW').value;
        const msg = !n ? 'Name is required' : (tipo === 'lakehouse' || tipo === 'warehouse') && !validoNombre(n) ? 'Names can only contain letters, numbers and underscores, and must start with a letter.' : Object.values(wsDe(w2).items).some((i) => i.nombre.toLowerCase() === n.toLowerCase() && i.tipo === tipo) ? 'An item with this name already exists in the workspace.' : '';
        if (msg) { m.querySelector('#niNota').textContent = msg; return; }
        const it = nuevoItem(w2, tipo, n); cerrar();
        location.hash = `#/fabric/ws/${w2}/${it.id}`;
      };
      m.querySelector('#niOk').addEventListener('click', ok);
      m.querySelector('#niN').addEventListener('keydown', (e) => { if (e.key === 'Enter') ok(); });
    });
  }
  function ajustesWs(wid) {
    const W = wsDe(wid);
    const repos = window.Shell && window.Shell.github ? Object.keys(window.Shell.github.remotos()).filter((u) => /github\.com\/alumno\//.test(u)) : [];
    panel(`<div class="fb-panel-h"><b>Workspace settings</b><button class="fb-tb" data-cerrar>${ci('close')}</button></div><div class="fb-panel-b">
      <h3 class="fb-h3">General</h3><label class="fb-lbl">Name</label><input class="fb-input" id="saN" value="${esc(W.nombre)}"${W.personal ? ' disabled' : ''}><label class="fb-lbl">Description</label><textarea class="fb-input" id="saD" rows="2">${esc(W.desc || '')}</textarea>
      <h3 class="fb-h3">License info</h3><p class="fb-dim">Current license: <b>${W.pro ? 'Pro' : 'Trial'}</b> · Capacity: ${W.pro ? '—' : 'Trial-Alumno (F64)'} · Region: East US</p>
      <h3 class="fb-h3">Git integration</h3>${W.git ? `<p>Conectado a <b>${esc(W.git.repo)}</b>, rama <b>${esc(W.git.rama)}</b>, carpeta <code>${esc(W.git.carpeta || '/')}</code>.</p><button class="fb-btn" id="saDesc">Disconnect workspace</button>`
        : repos.length ? `<p class="fb-dim">Git provider: <b>GitHub</b> (los repositorios del <a href="#/github">GitHub de práctica</a>).</p><label class="fb-lbl">Repository</label><select class="fb-input" id="saRepo">${repos.map((u) => `<option>${esc(u.replace('https://github.com/', ''))}</option>`).join('')}</select><label class="fb-lbl">Branch</label><input class="fb-input" id="saRama" value="main"><label class="fb-lbl">Git folder</label><input class="fb-input" id="saCarp" value="fabric"><button class="fb-btn fb-btn-p" id="saGit">Connect and sync</button>`
        : `<p class="fb-dim">Para conectar Git crea primero un repositorio tuyo en el <a href="#/github/new">GitHub de práctica</a>.</p>`}
      </div><div class="fb-panel-p"><button class="fb-btn fb-btn-p" id="saOk">Save</button><button class="fb-btn" data-cerrar>Close</button>${W.personal ? '' : '<span class="fb-sp"></span><button class="fb-btn fb-btn-mal" id="saDel">Remove this workspace</button>'}</div>`, (m, cerrar) => {
      m.querySelector('#saOk').addEventListener('click', () => { if (!W.personal) W.nombre = m.querySelector('#saN').value.trim() || W.nombre; W.desc = m.querySelector('#saD').value; guardar(); cerrar(); render(); });
      const g = m.querySelector('#saGit'); if (g) g.addEventListener('click', () => { W.git = { repo: m.querySelector('#saRepo').value, rama: m.querySelector('#saRama').value.trim() || 'main', carpeta: m.querySelector('#saCarp').value.trim().replace(/^\/|\/$/g, ''), ultimo: {} }; guardar(); cerrar(); toast('Workspace connected to Git. Abre Source control para hacer commit.'); render(); });
      const d = m.querySelector('#saDesc'); if (d) d.addEventListener('click', () => { W.git = null; guardar(); cerrar(); render(); });
      const del = m.querySelector('#saDel'); if (del) del.addEventListener('click', () => { if (!confirm(`Delete workspace ${W.nombre} and all its items?`)) return; delete F().ws[wid]; F().act = Object.keys(F().ws)[0]; guardar(); cerrar(); location.hash = '#/fabric'; });
    });
  }

  // ------------------------------------------------------------------ Git (formato de Fabric en el repositorio)
  const EXT = { lakehouse: 'Lakehouse', warehouse: 'Warehouse', notebook: 'Notebook', pipeline: 'DataPipeline', semanticmodel: 'SemanticModel' };
  function archivosGit(W) {
    const out = {};
    for (const it of Object.values(W.items)) {
      const d = `${it.nombre}.${EXT[it.tipo] || it.tipo}`;
      out[`${d}/.platform`] = JSON.stringify({ $schema: 'https://developer.microsoft.com/json-schemas/fabric/gitIntegration/platformProperties/2.0.0/schema.json', metadata: { type: EXT[it.tipo], displayName: it.nombre }, config: { version: '2.0', logicalId: it.id } }, null, 2) + '\n';
      if (it.tipo === 'notebook') out[`${d}/notebook-content.py`] = '# Fabric notebook source\n\n# METADATA ********************\n\n# META {\n# META   "kernel_info": { "name": "synapse_pyspark" }\n# META }\n' + it.celdas.map((c) => (c.tipo === 'md' ? `\n# MARKDOWN ********************\n\n${c.src.split('\n').map((l) => '# ' + l).join('\n')}\n` : `\n# CELL ********************\n\n${c.lang === 'sql' ? '%%sql\n' : ''}${c.src.replace(/\n$/, '')}\n`)).join('');
      if (it.tipo === 'lakehouse') out[`${d}/lakehouse.metadata.json`] = '{"defaultSchema":"dbo"}\n';
      if (it.tipo === 'warehouse') for (const [n, t] of Object.entries(it.tablas)) out[`${d}/dbo/Tables/${n}.sql`] = `CREATE TABLE [dbo].[${n}] (\n${datosTabla(t).cols.map((c) => `    [${c.n}] ${TSQL[c.t] || 'varchar(8000)'} NULL`).join(',\n')}\n);\n`;
      if (it.tipo === 'pipeline') out[`${d}/pipeline-content.json`] = JSON.stringify({ properties: { activities: it.acts.map((a) => ({ name: a.nombre, type: a.tipo === 'copy' ? 'Copy' : 'TridentNotebook', dependsOn: [] })) } }, null, 2) + '\n';
    }
    return out;
  }
  function cambiosGit(W) {
    if (!W.git) return [];
    const ahora0 = archivosGit(W), ant = W.git.ultimo || {};
    const items = new Set();
    for (const k of new Set([...Object.keys(ahora0), ...Object.keys(ant)])) if (ahora0[k] !== ant[k]) items.add(k.split('/')[0]);
    return [...items];
  }
  function panelGit(wid) {
    const W = wsDe(wid), cs = cambiosGit(W);
    panel(`<div class="fb-panel-h"><b>Source control</b><button class="fb-tb" data-cerrar>${ci('close')}</button></div><div class="fb-panel-b">
      <p class="fb-dim">${ci('github')} ${esc(W.git.repo)} · ${ci('git-branch')} ${esc(W.git.rama)}</p><nav class="fb-tabs"><a class="sel">Changes ${cs.length}</a><a class="fb-dim">Updates 0</a></nav>
      ${cs.length ? `<div class="fb-git-l">${cs.map((c) => `<label class="fb-check"><input type="checkbox" checked data-c="${esc(c)}"> ${esc(c)}</label>`).join('')}</div><label class="fb-lbl">Commit message</label><input class="fb-input" id="gcM" value="Actualiza el workspace ${esc(W.nombre)}"><button class="fb-btn fb-btn-p" id="gcOk">Commit</button>` : '<p class="fb-dim">No changes. Everything is up to date.</p>'}</div>`, (m, cerrar) => {
      const ok = m.querySelector('#gcOk');
      if (ok) ok.addEventListener('click', () => {
        const A = window.Shell && window.Shell.github; if (!A) { toast('Falta la terminal del curso'); return; }
        const u = `https://github.com/${W.git.repo}`, R = A.remoto(u); if (!R) { toast('El repositorio ya no existe'); return; }
        const elegidos = new Set([...m.querySelectorAll('[data-c]:checked')].map((c) => c.dataset.c));
        const todos = archivosGit(W), base = W.git.carpeta ? W.git.carpeta + '/' : '';
        const padre = R.branches[W.git.rama] || null, snap = { ...((R.commits[padre] || {}).snap || {}) };
        const nuevoUlt = { ...W.git.ultimo };
        for (const k of new Set([...Object.keys(todos), ...Object.keys(W.git.ultimo || {})])) {
          if (!elegidos.has(k.split('/')[0])) continue;
          if (todos[k] === undefined) { delete snap[base + k]; delete nuevoUlt[k]; } else { snap[base + k] = todos[k]; nuevoUlt[k] = todos[k]; }
        }
        const h = A.nuevoHash();
        R.commits[h] = { msg: m.querySelector('#gcM').value.trim() || 'Commit from Fabric', parent: padre, snap, author: 'alumno', date: ahora() };
        R.branches[W.git.rama] = h;
        W.git.ultimo = nuevoUlt;
        for (const f of A.oyentesPush || []) { try { f(u, W.git.rama, padre, h); } catch (e) { /* la réplica de GitHub no está abierta */ } }
        try { window.Shell.Machine.save(); } catch (e) { /* sin espacio */ }
        guardar(); cerrar(); toast(`Committed ${elegidos.size} item(s) to ${W.git.repo}`); render();
      });
    });
  }

  // ------------------------------------------------------------------ editores de ítems
  function abrirItem(wid, iid) {
    const W = wsDe(wid), it = itemDe(wid, iid);
    if (!it) { location.hash = `#/fabric/ws/${wid}`; return; }
    F().act = wid;
    const tabs = F().tabs; if (!tabs.some((t) => t.item === iid)) { tabs.push({ ws: wid, item: iid }); if (tabs.length > 8) tabs.shift(); }
    const E = window.FabricEditores;
    const migas = `<a href="#/fabric/ws/${wid}">${esc(W.nombre)}</a> <span class="fb-dim">›</span> ${esc(it.nombre)}`;
    const ctx = { W, wid, it, marco: (cuerpo, sel) => marco(sel || 'item', cuerpo, { ws: wid, item: iid, migas }), modal, panel, toast, guardar, render, esc, ci, TIPOS, datosTabla, tablaDesdeCsv, filasMuestra, MUESTRAS, correrTsql, baseDe, sincronizar, clave, registrarRun, terminarRun, itemDe, wsDe, uid, ahora, query: () => query, F };
    if (E && E[it.tipo]) E[it.tipo](ctx);
    else marco('item', `<div class="fb-pag"><h1 class="fb-h1">${esc(it.nombre)}</h1><div class="fb-vacio">${ci('info')}<p>Este tipo de ítem no está en la práctica.</p></div></div>`, { ws: wid, item: iid, migas });
  }

  // ------------------------------------------------------------------ enrutador
  function render() {
    if (!main) return;
    const h = location.hash.replace(/^#\/?/, ''), [camino, qs] = h.split('?');
    query = new URLSearchParams(qs || '');
    ruta = camino.split('/').filter(Boolean).slice(1).map(decodeURIComponent);
    const [a, b, c] = ruta;
    if (!a) vistaHome();
    else if (a === 'ws' && b && c) abrirItem(b, c);
    else if (a === 'ws' && b) vistaWs(b);
    else if (a === 'ws') { const fly = () => { const x = document.querySelector('[data-ws-flyout]'); if (x) x.click(); }; vistaHome(); setTimeout(fly, 0); }
    else if (a === 'onelake') vistaOneLake();
    else if (a === 'monitor') vistaMonitor();
    else if (a === 'realtime') vistaStub('realtime', 'Real-Time hub', 'El Real-Time hub reúne los flujos de datos en movimiento (Eventstreams, Event Hubs, CDC de bases de datos y eventos de OneLake). No está simulado en la práctica.');
    else if (a === 'workloads') vistaStub('workloads', 'Workloads', 'Las cargas de trabajo de Fabric: Data Factory, Data Engineering, Data Science, Data Warehouse, Real-Time Intelligence, Databases y Power BI. En la práctica están Data Engineering (lakehouse y notebooks), Data Warehouse, Data Factory (pipelines) y el modelo semántico.');
    else vistaHome();
  }
  function vista(m, ctx) {
    main = m; Store = ctx.Store; toast = ctx.toast || toast;
    if (window.Engines && window.Engines.SQL && !window.Engines.SQL._SQL) { main.innerHTML = '<div class="fb-cargando">Cargando el motor SQL…</div>'; window.Engines.SQL.init().then(() => render()); return; }
    render();
  }
  window.addEventListener('hashchange', () => { if (!/^#\/fabric/.test(location.hash)) document.body.classList.remove('fb-abierto'); });
  window.FabricPractica = { vista, render, _: { F, nuevoItem, correrTsql, tablaDesdeCsv, archivosGit, cambiosGit, datosTabla } };
})();
