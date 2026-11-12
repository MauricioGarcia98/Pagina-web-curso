/* Databricks de práctica — el workspace en el navegador.
 *
 * Reproduce la interfaz del workspace de Databricks según su documentación pública ("Navigate the
 * workspace UI", notebooks, Catalog Explorer, SQL editor, compute, Lakeflow Jobs): barra superior con
 * búsqueda, menú lateral con las mismas secciones, + New, Workspace, notebooks con celdas Python / SQL /
 * Markdown / %fs / %sh / %run, widgets y dbutils.
 *
 * No se conecta a ninguna cuenta: SQL corre sobre SQLite (dbsql.js), Python y PySpark sobre Pyodide con el
 * mini-Spark del curso, y el estado (clusters, jobs, archivos, secretos) es el mismo de la CLI simulada
 * `databricks` de la terminal: lo que creas en un lado aparece en el otro.
 *
 * Este archivo tiene el marco, el workspace y los notebooks. databricks-datos.js agrega Catalog Explorer,
 * el editor SQL y la ingesta; databricks-computo.js agrega compute, SQL warehouses, jobs y pipelines.
 */
(function () {
  'use strict';
  const D = (window.DBX = window.DBX || {});
  const USUARIO = 'alumno@academia.dev', HOME = '/Workspace/Users/' + USUARIO;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ic = (n, extra = '') => `<i class="codicon codicon-${n}${extra ? ' ' + extra : ''}"></i>`;
  const ahora = () => new Date().toISOString();
  const hora = (iso) => { try { return new Date(iso).toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' }); } catch (e) { return iso; } };
  const nid = () => Math.random().toString(36).slice(2, 10);
  Object.assign(D, { USUARIO, HOME, esc, ic, ahora, hora, nid });

  let main = null, Store = null;
  const VISTAS = {};
  D.registrar = (nombre, fn) => { VISTAS[nombre] = fn; };
  D.ir = (ruta) => { location.hash = '#/databricks/' + ruta; };
  D.ruta = (...p) => p.map((x) => encodeURIComponent(x)).join('/');
  // los ejercicios autocorregidos corren pipelines sin haber abierto el Databricks de práctica
  D.asegurarStore = (s) => { if (!Store) { Store = s; D.Store = s; } return Store; };
  D.guardar = () => { try { Store.saveSoon ? Store.saveSoon() : Store.save(); } catch (e) { /* sin almacenamiento */ } };
  D.cli = () => (window.CloudSim ? window.CloudSim.dbx() : { clusters: {}, jobs: {}, files: {}, scopes: {}, workspace: {} });
  D.cliGuardar = () => { try { window.CloudSim && window.CloudSim.save(); } catch (e) { /* sin terminal */ } };
  D.toast = (m) => { try { (D.ctx && D.ctx.toast) ? D.ctx.toast(m) : console.log(m); } catch (e) { /* sin toast */ } };

  // ------------------------------------------------------------------ estado del workspace
  const NB_EJEMPLO = () => [
    { id: nid(), src: '%md\n# Bienvenido a tu workspace de práctica\nEste notebook se ejecuta **en tu navegador**: el SQL sobre las bases del curso y el Python con un Spark simulado.\n\n- Ejecuta una celda con **Shift + Enter**.\n- Las tablas de ejemplo están en el catálogo `samples` (una base por esquema: `samples.tienda`, `samples.banco`…).\n- Lo que guardes en `main.default` queda en tu Unity Catalog de práctica.' },
    { id: nid(), src: '%sql\nSELECT canal, COUNT(*) AS pedidos\nFROM samples.tienda.pedidos\nGROUP BY canal\nORDER BY pedidos DESC' },
    { id: nid(), src: 'df = spark.table("samples.tienda.pedidos")\ndisplay(df.groupBy("estado").count())' },
    { id: nid(), src: '# guarda un resultado como tabla Delta administrada en Unity Catalog\n(df.groupBy("canal").count()\n   .write.mode("overwrite")\n   .saveAsTable("main.default.pedidos_por_canal"))' },
    { id: nid(), src: '%sql\nDESCRIBE HISTORY main.default.pedidos_por_canal' },
  ];
  function nuevoWs() {
    const t = ahora();
    return {
      v: 1,
      items: {
        '/Workspace': { tipo: 'folder', creado: t }, '/Workspace/Users': { tipo: 'folder', creado: t }, [HOME]: { tipo: 'folder', creado: t }, '/Workspace/Shared': { tipo: 'folder', creado: t },
        [HOME + '/Introducción a Databricks']: { tipo: 'notebook', lang: 'python', celdas: NB_EJEMPLO(), creado: t, modificado: t, compute: 'serverless' },
      },
      papelera: {}, recientes: [], favoritos: [], consultas: [], prefs: {},
    };
  }
  D.ws = () => { const s = Store.data.dbxWs; if (s && s.v === 1) return s; return (Store.data.dbxWs = nuevoWs()); };
  // los objetos del workspace de la CLI (databricks workspace import/mkdirs) aparecen en el navegador
  function sincronizarCli() {
    const W = D.ws(), C = D.cli();
    for (const [k, t] of Object.entries(C.workspace || {})) {
      const p = k.startsWith('/Workspace') ? k : '/Workspace' + k;
      if (!W.items[p]) {
        const partes = p.split('/'); for (let i = 2; i < partes.length; i++) { const x = partes.slice(0, i).join('/'); if (!W.items[x]) W.items[x] = { tipo: 'folder', creado: ahora() }; }
        W.items[p] = t === 'DIRECTORY' ? { tipo: 'folder', creado: ahora() } : { tipo: 'notebook', lang: 'python', celdas: [{ id: nid(), src: '# importado con la CLI (databricks workspace import)\nprint("hola desde la CLI")' }], creado: ahora(), modificado: ahora() };
      }
    }
  }
  D.alCli = (p, tipo) => { const C = D.cli(); C.workspace = C.workspace || {}; const k = p.replace(/^\/Workspace/, ''); if (tipo) C.workspace[k] = tipo; else delete C.workspace[k]; D.cliGuardar(); };
  D.reciente = (tipo, nombre, ruta) => { const W = D.ws(); W.recientes = [{ tipo, nombre, ruta, t: ahora() }, ...W.recientes.filter((r) => r.ruta !== ruta)].slice(0, 30); D.guardar(); };

  // ------------------------------------------------------------------ marco: barra superior y menú lateral
  // organización de la barra lateral vigente desde el 21 de mayo de 2026 (secciones Lakehouse y Analytics)
  const NAV = [
    ['workspace', 'folder', 'Workspace'], ['recientes', 'history', 'Recents'], ['catalogo', 'database', 'Catalog'], ['jobs', 'type-hierarchy', 'Jobs & Pipelines'], ['compute', 'cloud', 'Compute'], ['discover', 'compass', 'Discover'], ['marketplace', 'library', 'Marketplace'],
    ['#Lakehouse'], ['sql', 'code', 'SQL Editor'], ['consultas', 'file-code', 'Queries'], ['historial', 'history', 'Query History'], ['warehouses', 'server', 'SQL Warehouses'],
    ['#Analytics'], ['dashboards', 'dashboard', 'Dashboards'], ['genie', 'sparkle', 'Genie Agents'], ['alertas', 'bell', 'Alerts'],
    ['#Data Engineering'], ['runs', 'checklist', 'Runs'], ['ingesta', 'cloud-upload', 'Data Ingestion'],
    ['#AI/ML'], ['playground', 'sparkle', 'Playground'], ['agentes', 'person', 'Agents'], ['gateway', 'shield', 'AI Gateway'], ['experimentos', 'beaker', 'Experiments'], ['features', 'layers', 'Features'], ['modelos', 'package', 'Models'], ['serving', 'rocket', 'Serving'],
  ];
  const NUEVO = [
    ['notebook', 'notebook', 'Notebook'], ['consulta', 'file-code', 'Query'], ['dashboards', 'dashboard', 'Dashboard'], ['genie', 'sparkle', 'Genie Agent'], ['alertas', 'bell', 'Alert'], ['-'],
    ['job', 'type-hierarchy', 'Job'], ['pipeline', 'combine', 'ETL pipeline'], ['-'],
    ['cluster', 'cloud', 'Compute'], ['warehouse', 'server', 'SQL warehouse'], ['-'],
    ['datos', 'cloud-upload', 'Add or upload data'], ['catalogo-nuevo', 'database', 'Catalog'],
  ];
  // Apariencia (Settings → Preferences): Light, Dark o seguir al sistema (en la práctica, el tema del curso)
  D.temaOscuro = () => { const t = (D.ws().prefs || {}).tema || 'system'; if (t === 'dark') return true; if (t === 'light') return false; const s = document.documentElement.getAttribute('data-theme'); return s ? s === 'dark' : !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches); };
  D.aplicarTema = () => { const o = D.temaOscuro(); const r = document.getElementById('dbx'); if (r) r.classList.toggle('oscuro', o); document.body.classList.toggle('dbx-oscuro', o && !!r); };
  D.cambiarTema = (t) => { const W = D.ws(); W.prefs.tema = t; D.guardar(); D.aplicarTema(); };
  function pintarMarco() {
    document.body.classList.add('dbx-abierto');
    const plegado = D.ws().prefs.plegado;
    main.innerHTML = `<div class="dbx${plegado ? ' plegado' : ''}" id="dbx">
      <header class="dbx-top">
        <button class="dbx-ib" data-acc="plegar" title="Mostrar u ocultar el menú">${ic('menu')}</button>
        <a class="dbx-marca" href="#/databricks" title="Inicio del workspace"><span class="dbx-logo">${ic('layers')}</span><b>Databricks</b><span class="dbx-practica">práctica</span></a>
        <div class="dbx-buscar"><span>${ic('search')}</span><input id="dbxBuscar" placeholder="Search data, notebooks, recents, and more..." autocomplete="off"><kbd>Ctrl P</kbd><div class="dbx-buscar-res" id="dbxBuscarRes" hidden></div></div>
        <div class="dbx-top-der">
          <button class="dbx-ws" title="Workspace (simulado)">${ic('organization')}<span>academia-dev</span>${ic('chevron-down')}</button>
          <a class="dbx-ib" href="https://learn.microsoft.com/azure/databricks/" target="_blank" rel="noopener" title="Documentación oficial">${ic('question')}</a>
          <button class="dbx-avatar" data-acc="usuario" title="${USUARIO}">A</button>
        </div>
      </header>
      <nav class="dbx-nav" id="dbxNav">
        <button class="dbx-nuevo" data-acc="nuevo">${ic('add')}<span>New</span></button>
        ${NAV.map((n) => (n[0][0] === '#' ? `<div class="dbx-nav-sec">${esc(n[0].slice(1))}</div>` : `<a class="dbx-nav-i" data-nav="${n[0]}" href="#/databricks/${n[0]}" title="${esc(n[2])}">${ic(n[1])}<span>${esc(n[2])}</span></a>`)).join('')}
        <div class="dbx-nav-pie"><a class="dbx-nav-i" href="#/" title="Volver al curso">${ic('arrow-left')}<span>Volver al curso</span></a></div>
      </nav>
      <main class="dbx-main" id="dbxMain"></main>
      <div class="dbx-capa" id="dbxCapa" hidden></div>
    </div>`;
    const raiz = main.querySelector('#dbx');
    raiz.addEventListener('click', (e) => {
      const a = e.target.closest('[data-acc]'); if (!a) return;
      const acc = a.dataset.acc;
      if (acc === 'plegar') { const W = D.ws(); W.prefs.plegado = !W.prefs.plegado; raiz.classList.toggle('plegado', W.prefs.plegado); D.guardar(); }
      if (acc === 'nuevo') D.menu(a, NUEVO.map((x) => (x[0] === '-' ? '-' : { ic: x[1], txt: x[2], fn: () => nuevo(x[0]) })));
      if (acc === 'usuario') { const tt = D.ws().prefs.tema || 'system'; D.menu(a, [{ ic: 'account', txt: USUARIO, des: true }, '-', { ic: 'gear', txt: 'Settings', fn: () => D.ir('ajustes') }, { ic: 'color-mode', txt: 'Appearance', des: true }, { ic: tt === 'light' ? 'check' : 'blank', txt: 'Light', fn: () => D.cambiarTema('light') }, { ic: tt === 'dark' ? 'check' : 'blank', txt: 'Dark', fn: () => D.cambiarTema('dark') }, { ic: tt === 'system' ? 'check' : 'blank', txt: 'Match system', fn: () => D.cambiarTema('system') }, '-', { ic: 'arrow-left', txt: 'Volver al curso', fn: () => { location.hash = '#/'; } }, '-', { ic: 'trash', txt: 'Reiniciar toda la práctica…', fn: reiniciarTodo }], 'der'); }
    });
    enlazarBuscar();
  }
  function reiniciarTodo() {
    if (!confirm('¿Borrar todo lo que hiciste en el Databricks de práctica? Se borran tus notebooks, tablas, consultas, jobs y clusters creados.')) return;
    Store.data.dbxWs = nuevoWs(); if (window.DBSQL) window.DBSQL.reiniciar();
    if (window.CloudSim) { const M = window.Shell && window.Shell.Machine; if (M && M.cloud) { delete M.cloud.dbx; D.cliGuardar(); } }
    D.Py && D.Py.reiniciar(); D.guardar(); D.toast('Práctica reiniciada'); location.hash = '#/databricks'; render([]);
  }
  function nuevo(tipo) {
    if (tipo === 'notebook') return D.abrirNuevoNotebook(HOME);
    if (tipo === 'consulta') return D.ir('sql/nueva');
    if (tipo === 'job') return D.ir('jobs/nuevo');
    if (tipo === 'pipeline') return D.ir('pipelines/nuevo');
    if (tipo === 'cluster') return D.ir('compute/nuevo');
    if (tipo === 'warehouse') return D.ir('warehouses/nuevo');
    if (tipo === 'datos') return D.ir('ingesta');
    if (tipo === 'catalogo-nuevo') return D.ir('catalogo/nuevo');
    return D.ir(tipo);
  }
  function marcarNav(v) {
    const mapa = { notebook: 'workspace', tabla: 'catalogo', cluster: 'compute', job: 'jobs', run: 'runs', pipelines: 'jobs', pipeline: 'jobs', warehouse: 'warehouses' };
    const k = mapa[v] || v;
    main.querySelectorAll('.dbx-nav-i').forEach((a) => a.classList.toggle('on', a.dataset.nav === k));
  }

  // ------------------------------------------------------------------ menús, diálogos y utilidades de interfaz
  D.menu = (ancla, items, lado = 'izq') => {
    D.cerrarMenu();
    const r = ancla.getBoundingClientRect();
    const m = document.createElement('div'); m.className = 'dbx-menu'; m.id = 'dbxMenu';
    m.innerHTML = items.map((x, i) => (x === '-' ? '<hr>' : `<button data-i="${i}" ${x.des ? 'disabled' : ''} class="${x.peligro ? 'peligro' : ''}">${x.ic ? ic(x.ic) : '<i class="vacio"></i>'}<span>${esc(x.txt)}</span>${x.atajo ? `<kbd>${esc(x.atajo)}</kbd>` : ''}</button>`)).join('');
    document.body.appendChild(m);
    const w = m.offsetWidth, h = m.offsetHeight;
    let x = lado === 'der' ? r.right - w : r.left, y = r.bottom + 4;
    if (x + w > innerWidth - 8) x = innerWidth - w - 8; if (x < 8) x = 8;
    if (y + h > innerHeight - 8) y = Math.max(8, r.top - h - 4);
    m.style.left = x + 'px'; m.style.top = y + 'px';
    m.addEventListener('click', (e) => { const b = e.target.closest('[data-i]'); if (!b) return; const it = items[Number(b.dataset.i)]; D.cerrarMenu(); if (it && it.fn) it.fn(); });
    setTimeout(() => document.addEventListener('mousedown', fuera, true), 0);
    function fuera(e) { if (!m.contains(e.target)) { D.cerrarMenu(); document.removeEventListener('mousedown', fuera, true); } }
  };
  D.cerrarMenu = () => { const m = document.getElementById('dbxMenu'); if (m) m.remove(); };
  // diálogo modal: devuelve el elemento; botones con data-ok / data-cancelar
  D.dialogo = ({ titulo, cuerpo, ok = 'Create', cancelar = 'Cancel', ancho = 520, alOk, alAbrir, peligro = false }) => {
    const capa = document.getElementById('dbxCapa'); capa.hidden = false;
    capa.innerHTML = `<div class="dbx-dlg" role="dialog" aria-modal="true" style="width:min(${ancho}px, calc(100vw - 32px))"><div class="dbx-dlg-cab"><h3>${esc(titulo)}</h3><button class="dbx-ib" data-cancelar title="Cerrar">${ic('close')}</button></div><div class="dbx-dlg-cuerpo">${cuerpo}</div><div class="dbx-dlg-err" hidden></div><div class="dbx-dlg-pie"><button class="dbx-btn" data-cancelar>${esc(cancelar)}</button>${ok ? `<button class="dbx-btn ${peligro ? 'peligro' : 'primario'}" data-ok>${esc(ok)}</button>` : ''}</div></div>`;
    const dlg = capa.firstElementChild;
    const cerrar = () => { capa.hidden = true; capa.innerHTML = ''; };
    const error = (m) => { const e = dlg.querySelector('.dbx-dlg-err'); e.hidden = !m; e.textContent = m || ''; };
    capa.onclick = (e) => { if (e.target === capa || e.target.closest('[data-cancelar]')) cerrar(); };
    const okB = dlg.querySelector('[data-ok]');
    if (okB) okB.onclick = async () => { try { const r = await alOk(dlg, error); if (r !== false) cerrar(); } catch (e) { error(e.message); } };
    dlg.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrar(); if (e.key === 'Enter' && e.target.tagName === 'INPUT' && okB) okB.click(); });
    if (alAbrir) alAbrir(dlg);
    const f = dlg.querySelector('input, select, textarea'); if (f) setTimeout(() => f.focus(), 30);
    return dlg;
  };
  D.stub = (cont, titulo, texto, enlaces = []) => {
    cont.innerHTML = `<div class="dbx-pag"><div class="dbx-pag-cab"><h1>${esc(titulo)}</h1></div><div class="dbx-vacio grande">${ic('info')}<h3>Esta sección no está simulada</h3><p>${texto}</p>${enlaces.map(([t, h]) => `<a class="dbx-btn" href="${h}" ${h.startsWith('http') ? 'target="_blank" rel="noopener"' : ''}>${esc(t)}</a>`).join(' ')}</div></div>`;
  };
  D.estadoPunto = (estado) => {
    const s = String(estado || '').toUpperCase();
    const cls = s === 'RUNNING' ? 'verde' : /PENDING|RESTARTING|RESIZING|STARTING|TERMINATING|QUEUED|BLOCKED|WAITING/.test(s) ? 'ambar gira' : /ERROR|FAILED|INTERNAL/.test(s) ? 'rojo' : 'gris';
    return `<span class="dbx-punto ${cls}"></span>`;
  };

  // ------------------------------------------------------------------ búsqueda global
  function enlazarBuscar() {
    const inp = main.querySelector('#dbxBuscar'), res = main.querySelector('#dbxBuscarRes');
    const buscar = () => {
      const q = inp.value.trim().toLowerCase();
      const W = D.ws(), C = D.cli();
      let filas = [];
      if (!q) filas = W.recientes.slice(0, 8).map((r) => ({ ic: icoTipo(r.tipo), t: r.nombre, s: 'Reciente', ruta: r.ruta }));
      else {
        for (const [p, it] of Object.entries(W.items)) if (it.tipo !== 'folder' && p.split('/').pop().toLowerCase().includes(q)) filas.push({ ic: icoTipo(it.tipo), t: p.split('/').pop(), s: p.replace(/\/[^/]+$/, ''), ruta: (it.tipo === 'query' ? 'sql/' : 'notebook/') + D.ruta(p) });
        if (window.DBSQL) for (const c of window.DBSQL.arbol()) for (const s of c.schemas) for (const t of s.tablas) if (`${c.nombre}.${s.nombre}.${t.nombre}`.includes(q)) filas.push({ ic: 'table', t: t.nombre, s: `${c.nombre}.${s.nombre}`, ruta: 'catalogo/' + D.ruta(c.nombre, s.nombre, t.nombre) });
        for (const [id, j] of Object.entries(C.jobs || {})) if (String(j.name).toLowerCase().includes(q)) filas.push({ ic: 'type-hierarchy', t: j.name, s: 'Job ' + id, ruta: 'job/' + id });
        for (const [id, c] of Object.entries(C.clusters || {})) if (String(c.name).toLowerCase().includes(q)) filas.push({ ic: 'cloud', t: c.name, s: 'Compute', ruta: 'cluster/' + id });
      }
      res.hidden = !filas.length;
      res.innerHTML = filas.slice(0, 14).map((f, i) => `<a href="#/databricks/${f.ruta}" class="${i ? '' : 'sel'}">${ic(f.ic)}<span><b>${esc(f.t)}</b><small>${esc(f.s)}</small></span></a>`).join('');
    };
    inp.addEventListener('focus', buscar); inp.addEventListener('input', buscar);
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { const a = res.querySelector('a'); if (a) { location.hash = a.getAttribute('href'); inp.blur(); } } if (e.key === 'Escape') inp.blur(); });
    inp.addEventListener('blur', () => setTimeout(() => { res.hidden = true; }, 150));
  }
  const icoTipo = (t) => ({ notebook: 'notebook', query: 'file-code', folder: 'folder', file: 'file', tabla: 'table', job: 'type-hierarchy', cluster: 'cloud', pipeline: 'combine' }[t] || 'file');
  D.icoTipo = icoTipo;
  function teclas(e) {
    if (!document.getElementById('dbx')) { document.removeEventListener('keydown', teclas, true); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p' && !e.shiftKey) { e.preventDefault(); main.querySelector('#dbxBuscar').focus(); }
  }

  // ------------------------------------------------------------------ punto de entrada
  let limpiar = [];
  D.alSalir = (fn) => limpiar.push(fn);
  function render(sub) {
    for (const f of limpiar) { try { f(); } catch (e) { /* nada */ } }
    limpiar = [];
    if (!main.querySelector('#dbx')) pintarMarco();
    D.aplicarTema();
    const [v = 'home', ...resto] = sub || [];
    marcarNav(v);
    const cont = main.querySelector('#dbxMain');
    cont.scrollTop = 0;
    const fn = VISTAS[v] || VISTAS.stub;
    try { fn(cont, resto.map((x) => { try { return decodeURIComponent(x); } catch (e) { return x; } }), v); } catch (e) { console.error(e); cont.innerHTML = `<div class="dbx-pag"><div class="dbx-err">${esc(e.message)}</div></div>`; }
  }
  function vista(m, ctx, sub) {
    main = m; Store = ctx.Store; D.Store = Store; D.ctx = ctx;
    if (window.Shell && window.Shell.Machine && !window.Shell.Machine.ready) window.Shell.Machine.load();
    sincronizarCli();
    if (!main.querySelector('#dbx')) { main.innerHTML = '<div class="loading-block"><span class="spinner"></span> Abriendo el workspace de Databricks…</div>'; }
    const arrancar = () => { main.innerHTML = ''; render(sub); document.removeEventListener('keydown', teclas, true); document.addEventListener('keydown', teclas, true); };
    const listoSql = window.DBSQL ? window.DBSQL.init({ Store }) : Promise.resolve();
    ctx.ensureSql(main).then((ok) => { if (ok) listoSql.then(arrancar).catch((e) => { main.innerHTML = `<div class="dbx-err">${esc(e.message)}</div>`; }); });
  }
  window.addEventListener('hashchange', () => { if (!/^#\/databricks/.test(location.hash)) { document.body.classList.remove('dbx-abierto', 'dbx-oscuro'); for (const f of limpiar) { try { f(); } catch (e) { /* nada */ } } limpiar = []; } });

  // ------------------------------------------------------------------ inicio
  D.registrar('home', (cont) => {
    const W = D.ws(), C = D.cli();
    const corriendo = Object.values(C.clusters || {}).filter((c) => c.state === 'RUNNING').length;
    cont.innerHTML = `<div class="dbx-pag dbx-home">
      <div class="dbx-home-hola"><h1>Buenas, Alumno</h1><p>Este es tu workspace de práctica. Todo corre en tu navegador: no hay costo ni cuenta real.</p></div>
      <div class="dbx-home-genie">${ic('sparkle')}<input id="homeQ" placeholder="Busca notebooks, tablas o jobs… (Enter)"><button class="dbx-btn primario" id="homeIr">Buscar</button></div>
      <h2>Para empezar</h2>
      <div class="dbx-tarjetas">
        <button class="dbx-tarj" data-n="notebook">${ic('notebook')}<b>Crear un notebook</b><span>Python, SQL y Markdown en celdas, con Spark</span></button>
        <button class="dbx-tarj" data-n="sql">${ic('code')}<b>Consultar datos</b><span>Editor SQL sobre Unity Catalog</span></button>
        <button class="dbx-tarj" data-n="ingesta">${ic('cloud-upload')}<b>Subir datos</b><span>CSV o JSON a una tabla Delta</span></button>
        <button class="dbx-tarj" data-n="jobs/nuevo">${ic('type-hierarchy')}<b>Crear un job</b><span>Tareas con dependencias y reintentos</span></button>
        <button class="dbx-tarj" data-n="catalogo">${ic('database')}<b>Explorar el catálogo</b><span>samples, main y system</span></button>
        <button class="dbx-tarj" data-n="compute">${ic('cloud')}<b>Compute</b><span>${corriendo} cluster(s) encendido(s)</span></button>
      </div>
      <h2>Recientes</h2>
      ${W.recientes.length ? `<table class="dbx-tabla"><thead><tr><th>Nombre</th><th>Tipo</th><th>Abierto</th></tr></thead><tbody>${W.recientes.slice(0, 10).map((r) => `<tr><td><a href="#/databricks/${r.ruta}">${ic(icoTipo(r.tipo))} ${esc(r.nombre)}</a></td><td>${esc(r.tipo)}</td><td>${hora(r.t)}</td></tr>`).join('')}</tbody></table>` : '<p class="dbx-dim">Todavía no abriste nada. Empieza por el notebook <a href="#/databricks/notebook/' + D.ruta(HOME + '/Introducción a Databricks') + '">Introducción a Databricks</a>.</p>'}
      <div class="dbx-aviso">${ic('info')}<div><b>Cómo se relaciona con la terminal del curso:</b> la CLI simulada <code>databricks</code> usa el mismo estado. Un archivo que subes con <code>databricks fs cp datos.csv dbfs:/Volumes/main/default/raw/</code> se lee aquí con <code>read_files</code>, y un job o cluster que creas aquí aparece en <code>databricks jobs list</code>.</div></div>
    </div>`;
    cont.querySelectorAll('[data-n]').forEach((b) => b.onclick = () => (b.dataset.n === 'notebook' ? D.abrirNuevoNotebook(HOME) : D.ir(b.dataset.n)));
    const ir = () => { const s = main.querySelector('#dbxBuscar'); s.value = cont.querySelector('#homeQ').value; s.focus(); s.dispatchEvent(new Event('input')); };
    cont.querySelector('#homeIr').onclick = ir; cont.querySelector('#homeQ').onkeydown = (e) => { if (e.key === 'Enter') ir(); };
  });
  D.registrar('recientes', (cont) => {
    const W = D.ws();
    cont.innerHTML = `<div class="dbx-pag"><div class="dbx-pag-cab"><h1>Recents</h1></div>${W.recientes.length ? `<table class="dbx-tabla"><thead><tr><th>Nombre</th><th>Tipo</th><th>Última vez</th></tr></thead><tbody>${W.recientes.map((r) => `<tr><td><a href="#/databricks/${r.ruta}">${ic(icoTipo(r.tipo))} ${esc(r.nombre)}</a></td><td>${esc(r.tipo)}</td><td>${hora(r.t)}</td></tr>`).join('')}</tbody></table>` : '<div class="dbx-vacio">' + ic('history') + '<p>Lo que abras aparece aquí.</p></div>'}</div>`;
  });
  const STUBS = {
    marketplace: ['Marketplace', 'Databricks Marketplace es un catálogo de datasets, notebooks y modelos de terceros que se comparten con Delta Sharing. En esta práctica no hay proveedores externos.'],
    dashboards: ['Dashboards', 'Los dashboards de AI/BI se arman con consultas SQL y visualizaciones. En esta práctica puedes crear visualizaciones en el editor SQL y en los resultados de los notebooks, y armar tableros completos en el Power BI de práctica.', [['Abrir el Power BI de práctica', '#/powerbi'], ['Editor SQL', '#/databricks/sql']]],
    genie: ['Genie Agents', 'Los Genie Agents (antes llamados Genie spaces) responden preguntas en lenguaje natural sobre un conjunto de tablas curadas: el equipo de datos define las tablas, instrucciones, consultas de ejemplo y métricas, y Genie genera el SQL. El curso tiene un módulo completo sobre cómo armarlos y evaluarlos.', [['Ir al módulo de Genie', '#/m/genie'], ['Documentación', 'https://learn.microsoft.com/azure/databricks/genie-agents/']]],
    discover: ['Discover', 'Discover muestra los activos curados de la organización (tablas, dashboards, Genie Agents) agrupados por dominios de negocio, por ejemplo Ventas o Finanzas, para encontrar datos confiables sin conocer el catálogo de memoria.', [['Documentación', 'https://learn.microsoft.com/azure/databricks/discover/discover-page']]],
    agentes: ['Agents', 'Agents (Mosaic AI Agent Framework) sirve para construir, evaluar y desplegar agentes de IA que usan herramientas y datos de Unity Catalog, con trazas en MLflow.'],
    gateway: ['AI Gateway', 'AI Gateway centraliza el acceso a modelos de lenguaje (propios o externos): permisos, límites de uso, registro de pedidos y respuestas, y filtros de seguridad.'],
    features: ['Features', 'El Feature Store guarda variables (features) calculadas para entrenar y servir modelos, como tablas de Unity Catalog con clave primaria.'],
    alertas: ['Alerts', 'Una alerta ejecuta una consulta con un horario y avisa (correo, Slack) cuando el resultado cumple una condición, por ejemplo "pedidos fallidos > 10".', [['Documentación', 'https://learn.microsoft.com/azure/databricks/sql/user/alerts/']]],
    playground: ['Playground', 'El AI Playground sirve para probar modelos de lenguaje servidos en Databricks y comparar respuestas. Necesita endpoints de Model Serving reales.'],
    experimentos: ['Experiments', 'Los experimentos de MLflow guardan parámetros, métricas y artefactos de cada entrenamiento. El laboratorio de Python del curso usa la misma idea con scikit-learn.'],
    modelos: ['Models', 'Los modelos se registran en Unity Catalog (catálogo.esquema.modelo) con versiones y alias (por ejemplo @champion).'],
    serving: ['Serving', 'Model Serving publica un modelo como un endpoint REST con autoescalado. No está simulado.'],
    ajustes: ['Settings', 'Aquí se configuran tus preferencias (tema, idioma, tokens de acceso personal) y, si eres admin, el workspace. En la práctica, los tokens se simulan con la CLI: <code>databricks auth login</code>.'],
  };
  D.registrar('stub', (cont, _r, v) => { const s = STUBS[v] || ['No encontrado', 'Esta página no existe en la práctica.', [['Inicio', '#/databricks']]]; D.stub(cont, s[0], s[1], s[2] || []); });
  for (const k of Object.keys(STUBS)) D.registrar(k, (cont) => D.stub(cont, STUBS[k][0], STUBS[k][1], STUBS[k][2] || []));

  // ------------------------------------------------------------------ Workspace (explorador de archivos)
  const hijos = (p) => { const W = D.ws(); return Object.entries(W.items).filter(([k]) => k.startsWith(p + '/') && !k.slice(p.length + 1).includes('/')).sort((a, b) => (a[1].tipo === 'folder') - (b[1].tipo === 'folder') ? (b[1].tipo === 'folder') - (a[1].tipo === 'folder') : a[0].localeCompare(b[0])); };
  D.nombreLibre = (dir, base) => { const W = D.ws(); let n = base, i = 1; while (W.items[dir + '/' + n]) n = `${base} (${i++})`; return n; };
  D.abrirNuevoNotebook = (dir, lang = 'python') => {
    const W = D.ws(); const nombre = D.nombreLibre(dir, 'Untitled Notebook ' + new Date().toISOString().slice(0, 16).replace('T', ' '));
    const p = dir + '/' + nombre;
    W.items[p] = { tipo: 'notebook', lang, celdas: [{ id: nid(), src: '' }], creado: ahora(), modificado: ahora(), compute: 'serverless' };
    D.alCli(p, 'NOTEBOOK'); D.guardar();
    D.ir('notebook/' + D.ruta(p));
  };
  D.registrar('workspace', (cont, partes) => {
    const W = D.ws();
    let dir = partes[0] || HOME;
    if (dir === 'papelera') return papelera(cont);
    if (!W.items[dir] || W.items[dir].tipo !== 'folder') dir = HOME;
    const migas = dir.split('/').filter(Boolean).map((x, i, a) => `<a href="#/databricks/workspace/${D.ruta('/' + a.slice(0, i + 1).join('/'))}">${esc(x)}</a>`).join('<span>/</span>');
    const lista = hijos(dir);
    cont.innerHTML = `<div class="dbx-ws-lay">
      <aside class="dbx-ws-lado">
        <a href="#/databricks/workspace/${D.ruta(HOME)}" class="${dir === HOME ? 'on' : ''}">${ic('home')} Home</a>
        <a href="#/databricks/workspace/${D.ruta('/Workspace')}" class="${dir === '/Workspace' ? 'on' : ''}">${ic('folder')} Workspace</a>
        <a href="#/databricks/workspace/${D.ruta('/Workspace/Shared')}" class="${dir === '/Workspace/Shared' ? 'on' : ''}">${ic('organization')} Shared</a>
        <a href="#/databricks/workspace/papelera">${ic('trash')} Trash</a>
      </aside>
      <div class="dbx-pag">
        <div class="dbx-migas">${migas}</div>
        <div class="dbx-pag-cab"><h1>${esc(dir.split('/').pop())}</h1><div class="dbx-acciones"><button class="dbx-btn" data-a="importar">${ic('cloud-upload')} Import</button><button class="dbx-btn primario" data-a="crear">Create ${ic('chevron-down')}</button></div></div>
        ${lista.length ? `<table class="dbx-tabla dbx-ws-tabla"><thead><tr><th>Name</th><th>Type</th><th>Owner</th><th>Created at</th><th></th></tr></thead><tbody>${lista.map(([p, it]) => `<tr data-p="${esc(p)}"><td><a href="#/databricks/${it.tipo === 'folder' ? 'workspace' : it.tipo === 'query' ? 'sql' : it.tipo === 'file' ? 'archivo' : 'notebook'}/${D.ruta(p)}">${ic(icoTipo(it.tipo))} ${esc(p.split('/').pop())}</a></td><td>${{ folder: 'Folder', notebook: 'Notebook', query: 'Query', file: 'File' }[it.tipo] || it.tipo}</td><td>${p.startsWith(HOME) ? 'Alumno Academia' : '-'}</td><td>${it.creado ? hora(it.creado) : '-'}</td><td class="der"><button class="dbx-ib" data-a="kebab">${ic('ellipsis')}</button></td></tr>`).join('')}</tbody></table>` : `<div class="dbx-vacio">${ic('folder-opened')}<p>Esta carpeta está vacía.</p><button class="dbx-btn primario" data-a="nb">Crear un notebook</button></div>`}
      </div></div>`;
    const crear = (tipo) => {
      if (tipo === 'notebook') return D.abrirNuevoNotebook(dir);
      if (tipo === 'query') { const n = D.nombreLibre(dir, 'New Query ' + new Date().toISOString().slice(0, 10)); W.items[dir + '/' + n] = { tipo: 'query', sql: '', creado: ahora(), modificado: ahora() }; D.guardar(); return D.ir('sql/' + D.ruta(dir + '/' + n)); }
      D.dialogo({ titulo: tipo === 'folder' ? 'New folder' : 'New file', cuerpo: `<label class="dbx-campo"><span>Name</span><input id="dNom" value="${tipo === 'folder' ? 'Nueva carpeta' : 'config.yml'}"></label>`, alOk: (dlg) => {
        const n = dlg.querySelector('#dNom').value.trim(); if (!n || /[/\\]/.test(n)) throw new Error('El nombre no puede estar vacío ni tener / o \\.'); if (W.items[dir + '/' + n]) throw new Error('Ya existe un objeto con ese nombre.');
        W.items[dir + '/' + n] = tipo === 'folder' ? { tipo: 'folder', creado: ahora() } : { tipo: 'file', contenido: '', creado: ahora(), modificado: ahora() };
        D.alCli(dir + '/' + n, tipo === 'folder' ? 'DIRECTORY' : 'FILE'); D.guardar(); render(['workspace', encodeURIComponent(dir)]);
      } });
    };
    cont.querySelector('.dbx-pag').addEventListener('click', (e) => {
      const b = e.target.closest('[data-a]'); if (!b) return;
      const a = b.dataset.a;
      if (a === 'crear') D.menu(b, [{ ic: 'notebook', txt: 'Notebook', fn: () => crear('notebook') }, { ic: 'file-code', txt: 'Query', fn: () => crear('query') }, { ic: 'folder', txt: 'Folder', fn: () => crear('folder') }, { ic: 'file', txt: 'File', fn: () => crear('file') }], 'der');
      if (a === 'nb') crear('notebook');
      if (a === 'importar') importar(dir);
      if (a === 'kebab') {
        const p = b.closest('tr').dataset.p; const it = W.items[p];
        D.menu(b, [
          { ic: 'edit', txt: 'Rename', fn: () => renombrar(p) },
          ...(it.tipo === 'notebook' ? [{ ic: 'copy', txt: 'Clone', fn: () => { const n = D.nombreLibre(dir, p.split('/').pop() + ' (clone)'); W.items[dir + '/' + n] = JSON.parse(JSON.stringify({ ...it, creado: ahora() })); D.alCli(dir + '/' + n, 'NOTEBOOK'); D.guardar(); render(['workspace', encodeURIComponent(dir)]); } }, { ic: 'cloud-download', txt: 'Export: Source file', fn: () => D.exportarNotebook(p) }] : []),
          { ic: 'copy', txt: 'Copy path', fn: () => { navigator.clipboard && navigator.clipboard.writeText(p); D.toast('Ruta copiada: ' + p); } },
          '-', { ic: 'trash', txt: 'Move to trash', peligro: true, fn: () => moverPapelera(p, dir) },
        ], 'der');
      }
    });
  });
  function renombrar(p) {
    const W = D.ws(); const dir = p.replace(/\/[^/]+$/, '');
    D.dialogo({ titulo: 'Rename', ok: 'Rename', cuerpo: `<label class="dbx-campo"><span>New name</span><input id="dNom" value="${esc(p.split('/').pop())}"></label>`, alOk: (dlg) => {
      const n = dlg.querySelector('#dNom').value.trim(); if (!n || /[/\\]/.test(n)) throw new Error('Nombre inválido.');
      const np = dir + '/' + n; if (np === p) return; if (W.items[np]) throw new Error('Ya existe un objeto con ese nombre.');
      for (const k of Object.keys(W.items)) if (k === p || k.startsWith(p + '/')) { W.items[np + k.slice(p.length)] = W.items[k]; delete W.items[k]; D.alCli(k, null); D.alCli(np + k.slice(p.length), W.items[np + k.slice(p.length)].tipo === 'folder' ? 'DIRECTORY' : 'NOTEBOOK'); }
      W.recientes.forEach((r) => { if (r.ruta.includes(D.ruta(p))) { r.ruta = r.ruta.replace(D.ruta(p), D.ruta(np)); r.nombre = n; } });
      D.guardar(); render(location.hash.replace(/^#\/databricks\/?/, '').split('/').map((x) => x.replace(D.ruta(p), D.ruta(np))));
    } });
  }
  function moverPapelera(p, dir) {
    const W = D.ws();
    for (const k of Object.keys(W.items)) if (k === p || k.startsWith(p + '/')) { W.papelera[k] = { ...W.items[k], borrado: ahora() }; delete W.items[k]; D.alCli(k, null); }
    D.guardar(); D.toast('Movido a la papelera (se borra definitivamente a los 30 días)'); render(['workspace', encodeURIComponent(dir)]);
  }
  function papelera(cont) {
    const W = D.ws(); const l = Object.entries(W.papelera).filter(([k]) => !Object.keys(W.papelera).some((o) => o !== k && k.startsWith(o + '/')));
    cont.innerHTML = `<div class="dbx-pag"><div class="dbx-pag-cab"><h1>Trash</h1><div class="dbx-acciones"><button class="dbx-btn" data-a="vaciar" ${l.length ? '' : 'disabled'}>Empty trash</button></div></div><p class="dbx-dim">Los objetos borrados quedan aquí 30 días y se pueden restaurar.</p>${l.length ? `<table class="dbx-tabla"><thead><tr><th>Name</th><th>Original location</th><th>Deleted</th><th></th></tr></thead><tbody>${l.map(([k, it]) => `<tr data-p="${esc(k)}"><td>${ic(icoTipo(it.tipo))} ${esc(k.split('/').pop())}</td><td>${esc(k.replace(/\/[^/]+$/, ''))}</td><td>${hora(it.borrado)}</td><td class="der"><button class="dbx-btn chico" data-a="restaurar">Restore</button></td></tr>`).join('')}</tbody></table>` : `<div class="dbx-vacio">${ic('trash')}<p>La papelera está vacía.</p></div>`}</div>`;
    cont.onclick = (e) => {
      const b = e.target.closest('[data-a]'); if (!b) return;
      if (b.dataset.a === 'vaciar' && confirm('¿Borrar definitivamente todo lo que está en la papelera?')) { W.papelera = {}; D.guardar(); papelera(cont); }
      if (b.dataset.a === 'restaurar') { const p = b.closest('tr').dataset.p; for (const k of Object.keys(W.papelera)) if (k === p || k.startsWith(p + '/')) { const it = { ...W.papelera[k] }; delete it.borrado; W.items[k] = it; delete W.papelera[k]; D.alCli(k, it.tipo === 'folder' ? 'DIRECTORY' : 'NOTEBOOK'); } D.guardar(); D.toast('Restaurado'); papelera(cont); }
    };
  }
  // formato "source" de Databricks: # Databricks notebook source / # COMMAND ---------- / # MAGIC
  D.fuenteNotebook = (nb) => {
    const com = nb.lang === 'sql' ? '--' : '#';
    return `${com} Databricks notebook source\n` + nb.celdas.map((c) => {
      const m = /^%(\w+)/.exec(c.src);
      if (m && m[1] !== nb.lang) return c.src.split('\n').map((l) => `${com} MAGIC ${l}`.trimEnd()).join('\n');
      return m ? c.src.replace(/^%\w+\n?/, '') : c.src;
    }).join(`\n\n${com} COMMAND ----------\n\n`) + '\n';
  };
  D.parsearFuente = (txt, nombre) => {
    const sql = /^--\s*Databricks notebook source/.test(txt) || /\.sql$/i.test(nombre);
    const com = sql ? '--' : '#';
    const cuerpo = txt.replace(/^(#|--)\s*Databricks notebook source\s*\n/, '');
    const celdas = cuerpo.split(new RegExp(`\\n\\s*${com === '#' ? '#' : '--'} COMMAND -+\\s*\\n`)).map((b) => b.trim()).filter(Boolean).map((b) => {
      const lineas = b.split('\n');
      if (lineas.every((l) => l.startsWith(`${com} MAGIC`))) return { id: nid(), src: lineas.map((l) => l.replace(new RegExp(`^${com} MAGIC ?`), '')).join('\n') };
      return { id: nid(), src: b };
    });
    return { tipo: 'notebook', lang: sql ? 'sql' : 'python', celdas: celdas.length ? celdas : [{ id: nid(), src: '' }], creado: ahora(), modificado: ahora(), compute: 'serverless' };
  };
  D.exportarNotebook = (p) => {
    const it = D.ws().items[p]; const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([D.fuenteNotebook(it)], { type: 'text/plain' }));
    a.download = p.split('/').pop().replace(/[^\w.-]+/g, '_') + (it.lang === 'sql' ? '.sql' : '.py'); a.click();
  };
  function importar(dir) {
    D.dialogo({ titulo: 'Import', ok: 'Import', cuerpo: `<p class="dbx-dim">Importa un notebook en formato fuente de Databricks (.py o .sql con <code># COMMAND ----------</code>), un notebook de Jupyter (.ipynb) o cualquier archivo de texto.</p><label class="dbx-campo"><span>Archivo</span><input type="file" id="dArch" accept=".py,.sql,.ipynb,.txt,.md,.yml,.yaml,.json,.csv"></label>`, alOk: async (dlg) => {
      const f = dlg.querySelector('#dArch').files[0]; if (!f) throw new Error('Elige un archivo.');
      const txt = await f.text(); const W = D.ws();
      let it;
      if (/\.ipynb$/i.test(f.name)) { const j = JSON.parse(txt); it = { tipo: 'notebook', lang: 'python', celdas: (j.cells || []).map((c) => ({ id: nid(), src: (c.cell_type === 'markdown' ? '%md\n' : '') + (Array.isArray(c.source) ? c.source.join('') : c.source || '') })), creado: ahora(), modificado: ahora(), compute: 'serverless' }; }
      else if (/\.(py|sql)$/i.test(f.name)) it = D.parsearFuente(txt, f.name);
      else it = { tipo: 'file', contenido: txt, creado: ahora(), modificado: ahora() };
      const n = D.nombreLibre(dir, f.name.replace(/\.(py|sql|ipynb)$/i, ''));
      W.items[dir + '/' + n] = it; D.alCli(dir + '/' + n, it.tipo === 'notebook' ? 'NOTEBOOK' : 'FILE'); D.guardar(); render(['workspace', encodeURIComponent(dir)]);
    } });
  }
  D.registrar('archivo', (cont, partes) => {
    const W = D.ws(); const p = partes[0]; const it = W.items[p];
    if (!it) return D.stub(cont, 'No encontrado', 'El archivo no existe.', [['Workspace', '#/databricks/workspace']]);
    cont.innerHTML = `<div class="dbx-pag"><div class="dbx-migas"><a href="#/databricks/workspace/${D.ruta(p.replace(/\/[^/]+$/, ''))}">${esc(p.replace(/\/[^/]+$/, ''))}</a></div><div class="dbx-pag-cab"><h1>${ic('file')} ${esc(p.split('/').pop())}</h1><div class="dbx-acciones"><button class="dbx-btn primario" id="fGuardar">Save</button></div></div><textarea class="dbx-archivo" id="fTxt" spellcheck="false">${esc(it.contenido || '')}</textarea></div>`;
    cont.querySelector('#fGuardar').onclick = () => { it.contenido = cont.querySelector('#fTxt').value; it.modificado = ahora(); D.guardar(); D.toast('Guardado'); };
  });

  // ------------------------------------------------------------------ secret scopes (página #secrets/createScope del workspace)
  D.registrar('secrets', (cont) => {
    const C = D.cli(); C.scopes = C.scopes || {};
    const kvs = window.CloudSim && window.CloudSim.az ? window.CloudSim.az().kv || {} : {};
    const pintar = () => {
      cont.innerHTML = `<div class="dbx-pag"><div class="dbx-pag-cab"><h1>Secret scopes</h1></div><p class="dbx-dim">Un <i>secret scope</i> agrupa secretos (contraseñas, claves) para usarlos sin escribirlos en el código: <code>dbutils.secrets.get(scope="…", key="…")</code>. En la salida aparecen como <code>[REDACTED]</code>. Puede guardar los secretos en Databricks o leerlos de un <b>Azure Key Vault</b>.</p>
        <table class="dbx-tabla"><thead><tr><th>Scope</th><th>Backend</th><th>Secrets</th><th></th></tr></thead><tbody>${Object.entries(C.scopes).map(([k, s]) => `<tr><td><b>${esc(k)}</b></td><td>${s.backend === 'AZURE_KEYVAULT' ? `Azure Key Vault (${esc(s.kv)})` : 'Databricks'}</td><td>${Object.keys(s.backend === 'AZURE_KEYVAULT' ? ((kvs[s.kv] || {}).secrets || {}) : s.secrets || {}).map(esc).join(', ') || '<span class="dbx-dim">ninguno</span>'}</td><td class="der"><button class="dbx-ib" data-q="${esc(k)}">${ic('trash')}</button></td></tr>`).join('') || '<tr><td colspan="4" class="dbx-dim">No hay scopes. Créalos aquí o con <code>databricks secrets create-scope</code>.</td></tr>'}</tbody></table>
        <h2>Create Secret Scope</h2><form class="cf-form" id="scF"><label class="dbx-campo"><span>Scope Name</span><input name="n" placeholder="kv-datos"></label><label class="dbx-campo"><span>Manage Principal</span><select name="m"><option>Creator</option><option>All workspace users</option></select></label><h3>Azure Key Vault</h3><label class="dbx-campo"><span>DNS Name</span><input name="dns" placeholder="https://mi-vault.vault.azure.net/"></label><label class="dbx-campo"><span>Resource ID</span><input name="rid" placeholder="/subscriptions/…/resourceGroups/…/providers/Microsoft.KeyVault/vaults/mi-vault"></label><p class="dbx-dim">Los copias del portal de Azure: Key vault → Properties (Vault URI y Resource ID). ${Object.keys(kvs).length ? 'Vaults de tu práctica: ' + Object.keys(kvs).map((v) => `<code>${esc(v)}</code>`).join(', ') : 'Todavía no creaste un Key Vault en el <a href="#/azure/crear/kv">portal de Azure</a>.'}</p><div class="dbx-dlg-err" id="scErr" hidden></div><div class="cf-pie"><button class="dbx-btn primario">Create</button></div></form></div>`;
      cont.querySelectorAll('[data-q]').forEach((b) => b.onclick = () => { if (!confirm('¿Borrar el scope ' + b.dataset.q + '?')) return; delete C.scopes[b.dataset.q]; D.cliGuardar(); pintar(); });
      cont.querySelector('#scF').onsubmit = (e) => {
        e.preventDefault(); const f = e.target; const er = cont.querySelector('#scErr'); const mal = (m) => { er.hidden = false; er.textContent = m; };
        const n = f.elements.n.value.trim(); if (!/^[\w.@-]{1,128}$/.test(n)) return mal('Scope name: letras, números, guiones, guiones bajos, @ y puntos (hasta 128).');
        if (C.scopes[n]) return mal(`Scope ${n} already exists!`);
        const dns = f.elements.dns.value.trim(); const m = /^https:\/\/([a-zA-Z0-9-]{3,24})\.vault\.azure\.net\/?$/.exec(dns);
        if (!m) return mal('DNS Name inválido: tiene la forma https://<vault>.vault.azure.net/');
        if (!kvs[m[1]]) return mal(`No se encontró el key vault ${m[1]} en tu suscripción de práctica. Créalo primero en el portal de Azure.`);
        const rid = f.elements.rid.value.trim(); if (!rid.endsWith('/providers/Microsoft.KeyVault/vaults/' + m[1])) return mal('El Resource ID no corresponde a ese vault (tiene que terminar en /providers/Microsoft.KeyVault/vaults/' + m[1] + ').');
        C.scopes[n] = { backend: 'AZURE_KEYVAULT', kv: m[1], secrets: {}, acls: {} }; D.cliGuardar(); D.toast('Scope creado'); pintar();
      };
    };
    pintar();
  });

  // ------------------------------------------------------------------ Markdown mínimo (celdas %md)
  D.md = (t) => {
    const lineas = String(t).split('\n'); let html = '', lista = null, enCodigo = false, codigo = [];
    const inl = (s) => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/\*([^*]+)\*/g, '<i>$1</i>').replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, a, h) => `<a href="${h.replace(/"/g, '')}" target="_blank" rel="noopener">${a}</a>`);
    const cerrarLista = () => { if (lista) { html += `</${lista}>`; lista = null; } };
    for (let i = 0; i < lineas.length; i++) {
      const l = lineas[i];
      if (/^```/.test(l)) { if (enCodigo) { html += `<pre><code>${esc(codigo.join('\n'))}</code></pre>`; codigo = []; enCodigo = false; } else { cerrarLista(); enCodigo = true; } continue; }
      if (enCodigo) { codigo.push(l); continue; }
      let m;
      if ((m = /^(#{1,6})\s+(.*)$/.exec(l))) { cerrarLista(); html += `<h${m[1].length}>${inl(m[2])}</h${m[1].length}>`; continue; }
      if ((m = /^\s*[-*]\s+(.*)$/.exec(l))) { if (lista !== 'ul') { cerrarLista(); html += '<ul>'; lista = 'ul'; } html += `<li>${inl(m[1])}</li>`; continue; }
      if ((m = /^\s*\d+[.)]\s+(.*)$/.exec(l))) { if (lista !== 'ol') { cerrarLista(); html += '<ol>'; lista = 'ol'; } html += `<li>${inl(m[1])}</li>`; continue; }
      if (/^\|.*\|$/.test(l.trim())) {
        cerrarLista(); const filas = []; while (i < lineas.length && /^\|.*\|$/.test(lineas[i].trim())) filas.push(lineas[i++].trim()); i--;
        const celdas = (f) => f.slice(1, -1).split('|').map((x) => x.trim());
        html += `<table><thead><tr>${celdas(filas[0]).map((c) => `<th>${inl(c)}</th>`).join('')}</tr></thead><tbody>${filas.slice(2).map((f) => `<tr>${celdas(f).map((c) => `<td>${inl(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`; continue;
      }
      if (/^>\s?/.test(l)) { cerrarLista(); html += `<blockquote>${inl(l.replace(/^>\s?/, ''))}</blockquote>`; continue; }
      if (/^---+$/.test(l.trim())) { cerrarLista(); html += '<hr>'; continue; }
      if (!l.trim()) { cerrarLista(); continue; }
      cerrarLista(); html += `<p>${inl(l)}</p>`;
    }
    cerrarLista(); if (enCodigo) html += `<pre><code>${esc(codigo.join('\n'))}</code></pre>`;
    return html;
  };

  // ------------------------------------------------------------------ Python en el navegador (Pyodide + mini-Spark)
  const PRELUDIO = String.raw`
import json as _json, ast as _ast, traceback as _tb, linecache as _lc, re as _re, collections as _col
import __main__ as _h
_e = _h._env('pyspark')
spark = _e['spark']; sc = _e['sc']
import pyspark.sql as _ps
_DBX = {'cur': ['main', 'default'], 'files': {}, 'secrets': {}, 'widgets': {}, 'wdefs': {}, 'snap': {}, 'fs': {}}
def _dbx_nom(name, escribir=False):
    p = [x.strip('\x60').lower() for x in str(name).strip().split('.')]
    if len(p) == 1:
        if not escribir and p[0] in _ps._TEMP_VIEWS: return p[0]
        p = list(_DBX['cur']) + p
    elif len(p) == 2:
        p = [_DBX['cur'][0]] + p
    if p[0] == 'samples':
        if escribir: raise _ps.AnalysisException("[PERMISSION_DENIED] User does not have MODIFY on Table '%s'. El catálogo samples es de solo lectura: escribe en main." % '.'.join(p))
        return p[2]
    if p[0] == 'system': raise _ps.AnalysisException("[UNSUPPORTED_FEATURE] En esta práctica las tablas de system se consultan con una celda %sql.")
    return '__'.join(p)
_orig_table = _ps.SparkSession.table
def _table(self, name):
    try:
        return _orig_table(self, _dbx_nom(name))
    except _ps.AnalysisException as e:
        if 'TABLE_OR_VIEW_NOT_FOUND' in str(e):
            p = [x.strip('\x60') for x in str(name).split('.')]
            full = p if len(p) == 3 else ([_DBX['cur'][0]] + p if len(p) == 2 else list(_DBX['cur']) + p)
            raise _ps.AnalysisException("[TABLE_OR_VIEW_NOT_FOUND] The table or view %s cannot be found. Verify the spelling and correctness of the schema and catalog." % '.'.join('\x60%s\x60' % x for x in full))
        raise
_ps.SparkSession.table = _table
def _silencio(fn):
    import io as _io, sys as _s
    old = _s.stdout; _s.stdout = _io.StringIO()
    try: return fn()
    finally: _s.stdout = old
def _saveAsTable(self, name, format=None, mode=None, partitionBy=None, **kw):
    if mode: self._mode = mode.lower()
    k = _dbx_nom(name, True)
    _silencio(lambda: self._store(_ps._CATALOG, k, 'TABLE_OR_VIEW'))
def _insertInto(self, name, overwrite=False):
    self._mode = 'overwrite' if overwrite else 'append'
    k = _dbx_nom(name, True)
    if k not in _ps._CATALOG: raise _ps.AnalysisException("[TABLE_OR_VIEW_NOT_FOUND] The table %s cannot be found." % name)
    _silencio(lambda: self._store(_ps._CATALOG, k, 'TABLE_OR_VIEW'))
_ps.DataFrameWriter.saveAsTable = _saveAsTable
_ps.DataFrameWriter.insertInto = _insertInto
_orig_sql = _ps.SparkSession.sql
_RX = _re.compile(r'(?i)\b(from|join|into|table|update)\s+(\x60?[A-Za-z_]\w*\x60?(?:\.\x60?[A-Za-z_]\w*\x60?){0,2})(?!\s*\()')
def _sql(self, query, args=None, **kw):
    if kw: query = query.format(**kw)
    def _r(m):
        nombre = m.group(2); esc = m.group(1).lower() in ('into', 'table', 'update')
        if '.' not in nombre:
            k = '__'.join(list(_DBX['cur']) + [nombre.strip('\x60').lower()])
            return m.group(1) + ' ' + (k if k in _ps._CATALOG or esc and _DBX['cur'][0] != 'samples' else nombre)
        return m.group(1) + ' ' + _dbx_nom(nombre, esc)
    return _orig_sql(self, _RX.sub(_r, query))
_ps.SparkSession.sql = _sql
def _filas(x, n=1000):
    if hasattr(x, '_rows') and hasattr(x, 'columns'):
        try: tipos = [t for _, t in x.dtypes]
        except Exception: tipos = None
        return list(x.columns), [list(r) for r in list(x._rows)[:n]], len(x._rows), tipos
    if type(x).__module__.split('.')[0] == 'pandas':
        d = x.to_frame() if not hasattr(x, 'columns') else x
        if not (d.index.name is None and list(d.index) == list(range(len(d)))): d = d.reset_index()
        filas = [[None if (isinstance(v, float) and v != v) else (v.item() if hasattr(v, 'item') else v) for v in r] for r in d.itertuples(index=False)]
        return [str(c) for c in d.columns], filas[:n], len(filas), [str(t) for t in d.dtypes]
    if isinstance(x, list) and x and hasattr(x[0], '__fields__'):
        return list(x[0].__fields__), [list(r) for r in x[:n]], len(x), None
    if isinstance(x, list) and x and hasattr(x[0], '_fields'):
        return list(x[0]._fields), [list(r) for r in x[:n]], len(x), None
    return None
def display(x=None, *a, **k):
    r = _filas(x)
    if r is None:
        print(x); return
    cols, filas, total, tipos = r
    print('\x01DISPLAY' + _json.dumps({'cols': cols, 'filas': filas, 'total': total, 'tipos': tipos}, default=str) + '\x02')
def displayHTML(h):
    print('\x01HTML' + _json.dumps(str(h)) + '\x02')
FileInfo = _col.namedtuple('FileInfo', 'path name size modificationTime')
SecretScope = _col.namedtuple('SecretScope', 'name')
SecretMetadata = _col.namedtuple('SecretMetadata', 'key')
def _sync_fs():
    # los archivos de los volúmenes (dbutils.fs, subidas, CLI) también los lee spark.read / readStream
    for k in [k for k in _ps._FILES if k.startswith(('/Volumes/', '/FileStore/', '/dbfs/', '/Workspace/', '/tmp/')) and k not in _DBX['files']]: del _ps._FILES[k]
    for k, v in _DBX['files'].items(): _ps._FILES[k] = v
class _Fs:
    def _n(self, p):
        p = str(p)
        return p[5:] if p.startswith('dbfs:') else p
    def ls(self, p):
        d = self._n(p).rstrip('/')
        hijos = {}
        for k, v in _DBX['files'].items():
            if k.startswith(d + '/'):
                resto = k[len(d) + 1:]
                n0 = resto.split('/')[0]
                hijos[n0] = None if '/' in resto else len(v)
        if not hijos and d not in _DBX['files']:
            if _re.match(r'^/Volumes/\w+/\w+/\w+$', d): return []
            raise Exception("java.io.FileNotFoundException: No such file or directory: dbfs:%s" % d)
        return [FileInfo('dbfs:%s/%s%s' % (d, n0, '/' if s is None else ''), n0 + ('/' if s is None else ''), s or 0, 0) for n0, s in sorted(hijos.items())]
    def head(self, p, maxBytes=65536):
        c = _DBX['files'].get(self._n(p))
        if c is None: raise Exception("java.io.FileNotFoundException: No such file or directory: %s" % p)
        return c[:maxBytes]
    def put(self, p, contents, overwrite=False):
        k = self._n(p)
        if k in _DBX['files'] and not overwrite: raise Exception("java.nio.file.FileAlreadyExistsException: %s (usa overwrite=True)" % p)
        _DBX['files'][k] = str(contents); _DBX['fs'][k] = str(contents); _sync_fs()
        print('Wrote %d bytes.' % len(str(contents).encode('utf-8')))
        return True
    def rm(self, p, recurse=False):
        k = self._n(p).rstrip('/'); hubo = False
        for x in list(_DBX['files']):
            if x == k or (recurse and x.startswith(k + '/')):
                del _DBX['files'][x]; _DBX['fs'][x] = None; hubo = True
        _sync_fs()
        return hubo
    def mkdirs(self, p): return True
    def cp(self, a, b, recurse=False):
        a, b = self._n(a), self._n(b)
        if a in _DBX['files']:
            destino = b + a.split('/')[-1] if b.endswith('/') else b
            _DBX['files'][destino] = _DBX['files'][a]; _DBX['fs'][destino] = _DBX['files'][a]; _sync_fs(); return True
        if not recurse: raise Exception("java.io.FileNotFoundException: %s (si es una carpeta usa recurse=True)" % a)
        for x in list(_DBX['files']):
            if x.startswith(a.rstrip('/') + '/'):
                d2 = b.rstrip('/') + x[len(a.rstrip('/')):]
                _DBX['files'][d2] = _DBX['files'][x]; _DBX['fs'][d2] = _DBX['files'][x]
        _sync_fs()
        return True
    def mv(self, a, b, recurse=False):
        self.cp(a, b, recurse); self.rm(a, recurse); return True
    def help(self): print('dbutils.fs: ls, head, put, cp, mv, rm, mkdirs')
class _Widgets:
    def _def(self, tipo, name, default, choices=None, label=None):
        _DBX['wdefs'][name] = {'tipo': tipo, 'default': default, 'choices': list(choices) if choices else None, 'label': label}
    def text(self, name, defaultValue='', label=None): self._def('text', name, defaultValue, None, label)
    def dropdown(self, name, defaultValue, choices, label=None): self._def('dropdown', name, defaultValue, choices, label)
    def combobox(self, name, defaultValue, choices, label=None): self._def('combobox', name, defaultValue, choices, label)
    def multiselect(self, name, defaultValue, choices, label=None): self._def('multiselect', name, defaultValue, choices, label)
    def get(self, name):
        if name in _DBX['widgets']: return _DBX['widgets'][name]
        if name in _DBX['wdefs']: return _DBX['wdefs'][name]['default']
        raise Exception("com.databricks.dbutils_v1.InputWidgetNotDefined: No input widget named %s is defined" % name)
    getArgument = get
    def getAll(self): return dict({k: v['default'] for k, v in _DBX['wdefs'].items()}, **_DBX['widgets'])
    def remove(self, name): _DBX['wdefs'][name] = None
    def removeAll(self):
        for k in list(_DBX['wdefs']) + list(_DBX['widgets']): _DBX['wdefs'][k] = None
class _Secrets:
    def get(self, scope, key):
        s = _DBX['secrets'].get(scope)
        if s is None or key not in s: raise Exception("IllegalArgumentException: Secret does not exist with scope: %s and key: %s" % (scope, key))
        return s[key]
    def listScopes(self): return [SecretScope(n) for n in _DBX['secrets']]
    def list(self, scope):
        if scope not in _DBX['secrets']: raise Exception("IllegalArgumentException: Scope %s does not exist" % scope)
        return [SecretMetadata(k) for k in _DBX['secrets'][scope]]
class _Salida(BaseException): pass
class _Notebook:
    def exit(self, value): raise _Salida(str(value))
    def run(self, path, timeout_seconds=0, arguments=None): raise Exception('dbutils.notebook.run no está disponible en esta práctica: usa %run o una tarea de job.')
class _TaskValues:
    def set(self, key, value):
        _json.dumps(value)
        _DBX['tvout'][key] = value
    def get(self, taskKey, key, default=None, debugValue=None):
        if _DBX.get('enjob'):
            t = _DBX['tvin'].get(taskKey)
            if t is None: raise ValueError("No se encontró la tarea '%s': tiene que ejecutarse antes (agrégala en Depends on)." % taskKey)
            if key in t: return t[key]
            if default is not None: return default
            raise ValueError("No task value found for key '%s' in task '%s'." % (key, taskKey))
        if debugValue is None: raise TypeError("Must pass debugValue when calling get outside of a job context. debugValue cannot be None.")
        return debugValue
class _Jobs:
    taskValues = _TaskValues()
class _DBUtils:
    fs = _Fs(); widgets = _Widgets(); secrets = _Secrets(); notebook = _Notebook(); jobs = _Jobs()
    def help(self): print('dbutils: fs, widgets, secrets, notebook (simulados en esta práctica)')
dbutils = _DBUtils()
_N = [0]
def _dbx_run(payload):
    d = _json.loads(payload)
    _DBX['cur'] = d.get('cur') or _DBX['cur']
    _DBX['files'] = d.get('files') or {}
    _sync_fs()
    _DBX['secrets'] = d.get('secrets') or {}
    _DBX['widgets'] = d.get('widgets') or {}
    _DBX['fs'] = {}; _DBX['wdefs'] = {}; _DBX['tvout'] = {}
    _DBX['enjob'] = bool(d.get('enjob')); _DBX['tvin'] = d.get('tvin') or {}
    if d.get('tablas') is not None:
        for k in [k for k in _ps._CATALOG if '__' in k]: del _ps._CATALOG[k]
        for t in d['tablas']:
            k = '__'.join(t['nombre'].lower().split('.'))
            if t['filas']: _ps._CATALOG[k] = spark.createDataFrame([tuple(r) for r in t['filas']], t['cols'])
            else: _ps._CATALOG[k] = spark.createDataFrame([], ', '.join('%s string' % c for c in t['cols']) or 'value string')
    _DBX['snap'] = {k: id(v) for k, v in _ps._CATALOG.items()}
    code = d['code']
    _N[0] += 1
    fname = '<command-%d>' % _N[0]
    _lc.cache[fname] = (len(code), None, [l + '\n' for l in code.splitlines()], fname)
    salida = None; error = None
    try:
        arbol = _ast.parse(code, fname, 'exec')
        ultimo = None
        if arbol.body and isinstance(arbol.body[-1], _ast.Expr):
            ultimo = _ast.Expression(arbol.body.pop().value)
        g = globals()
        exec(compile(arbol, fname, 'exec'), g)
        if ultimo is not None:
            v = eval(compile(ultimo, fname, 'eval'), g)
            if v is not None:
                if hasattr(v, '_rows') and hasattr(v, 'columns'):
                    try: print('Out[%d]: DataFrame[%s]' % (_N[0], ', '.join('%s: %s' % (c, t) for c, t in v.dtypes)))
                    except Exception: print('Out[%d]: DataFrame' % _N[0])
                else:
                    print('Out[%d]: %r' % (_N[0], v))
    except _Salida as x:
        salida = x.args[0] if x.args else ''
    except BaseException as e:
        tb = [f for f in _tb.extract_tb(e.__traceback__) if f.filename == fname]
        error = {'tipo': type(e).__name__, 'msg': str(e), 'linea': tb[-1].lineno if tb else None, 'codigo': (tb[-1].line or '').strip() if tb else None}
        if isinstance(e, SyntaxError): error.update(linea=e.lineno, codigo=(e.text or '').strip())
    escritas = []
    for k, v in list(_ps._CATALOG.items()):
        if '__' in k and _DBX['snap'].get(k) != id(v):
            r = _filas(v, 200000)
            if r: escritas.append({'nombre': '.'.join(k.split('__')), 'cols': r[0], 'filas': r[1]})
    _mlf = __import__('sys').modules.get('mlflow')
    print('\x01POST' + _json.dumps({'escritas': escritas, 'fs': _DBX['fs'], 'wdefs': _DBX['wdefs'], 'exit': salida, 'error': error, 'tv': _DBX['tvout'], 'mlflow': _mlf._exportar() if _mlf and hasattr(_mlf, '_exportar') else None}, default=str) + '\x02')
_BASE = set(globals().keys()) | {'_BASE'}
def _dbx_reset():
    g = globals()
    for k in list(g):
        if k not in _BASE: del g[k]
    _ps._TEMP_VIEWS.clear()
`;
  const Py = D.Py = {
    listo: false, firma: '', cargando: null,
    reiniciar() { this.listo = false; this.firma = ''; this.cargando = null; },
    async preparar(aviso) {
      if (this.listo) return;
      if (!this.cargando) {
        this.cargando = (async () => {
          aviso && aviso('Iniciando Python (Pyodide) y Spark en tu navegador… la primera vez tarda unos segundos.');
          const r = await window.Engines.PY.repl(PRELUDIO, 'pyspark');
          if (!r.ok) { this.cargando = null; throw new Error('No se pudo iniciar Python: ' + (r.error || '')); }
          this.listo = true; this.firma = '';
        })();
      }
      return this.cargando;
    },
    async limpiarEstado() { if (!this.listo) return; await window.Engines.PY.repl('_dbx_reset()', 'pyspark'); },
    async correr(code, { widgets = {}, aviso, job = null } = {}, reintento = false) {
      await this.preparar(aviso);
      const U = window.DBSQL.uc();
      const tablas = await window.DBSQL.tablasAlumno();
      const firma = tablas.map((t) => t.nombre + ':' + t.version + ':' + t.filas.length).join('|');
      const C = D.cli();
      // los scopes respaldados por Azure Key Vault leen los secretos del vault (los del portal de Azure)
      const kvs = window.CloudSim && window.CloudSim.az ? window.CloudSim.az().kv || {} : {};
      const secretos = Object.fromEntries(Object.entries(C.scopes || {}).map(([k, s]) => [k, s.backend === 'AZURE_KEYVAULT' ? ((kvs[s.kv] || {}).secrets || {}) : s.secrets || {}]));
      const payload = { code, cur: [U.cur.catalog, U.cur.schema], files: C.files || {}, secrets: secretos, widgets, tablas: firma !== this.firma ? tablas : null, enjob: !!job, tvin: job ? job.tvin : {} };
      const r = await window.Engines.PY.repl(`_dbx_run(${JSON.stringify(JSON.stringify(payload))})`, 'pyspark');
      if (!r.ok && /_dbx_run/.test(r.error || '') && !reintento) { this.reiniciar(); return this.correr(code, { widgets, aviso, job }, true); }
      this.firma = firma;
      const salidas = []; let post = null;
      const out = String(r.stdout || '');
      const re = /\x01(DISPLAY|HTML|POST)([\s\S]*?)\x02/g; let m, ult = 0;
      const texto = (t) => { if (t) { const prev = salidas[salidas.length - 1]; if (prev && prev.tipo === 'texto') prev.v += t; else salidas.push({ tipo: 'texto', v: t }); } };
      while ((m = re.exec(out))) {
        texto(out.slice(ult, m.index)); ult = re.lastIndex;
        let j; try { j = JSON.parse(m[2]); } catch (e) { continue; }
        if (m[1] === 'DISPLAY') salidas.push({ tipo: 'tabla', cols: j.cols, filas: j.filas, total: j.total, tipos: j.tipos });
        else if (m[1] === 'HTML') salidas.push({ tipo: 'html', v: j });
        else post = j;
      }
      texto(out.slice(ult));
      if (!r.ok && r.error) salidas.push({ tipo: 'error', v: r.error });
      // secretos: Databricks reemplaza sus valores por [REDACTED] en la salida
      const valores = Object.values(secretos).flatMap((s) => Object.values(s)).filter((v) => v && String(v).length >= 3);
      if (valores.length) for (const s of salidas) if (s.tipo === 'texto') for (const v of valores) s.v = s.v.split(v).join('[REDACTED]');
      if (post) {
        if (post.error) salidas.push({ tipo: 'error', v: `${post.error.tipo}: ${post.error.msg}`, linea: post.error.linea, codigo: post.error.codigo });
        if (post.exit != null) salidas.push({ tipo: 'texto', v: `Notebook exited: ${post.exit}` });
        if (post.mlflow && D.sincronizarMlflow) D.sincronizarMlflow(post.mlflow);
        for (const [k, v] of Object.entries(post.fs || {})) { if (v == null) delete C.files[k]; else C.files[k] = v; }
        if (Object.keys(post.fs || {}).length) D.cliGuardar();
        for (const t of post.escritas || []) { try { await window.DBSQL.registrarDesdeDatos(t.nombre, t.cols, t.filas, 'overwrite', 'WRITE'); } catch (e) { salidas.push({ tipo: 'error', v: e.message }); } }
        if ((post.escritas || []).length) { const t2 = await window.DBSQL.tablasAlumno(); this.firma = t2.map((t) => t.nombre + ':' + t.version + ':' + t.filas.length).join('|'); }
      }
      return { salidas, post, ok: !(post && post.error) && r.ok !== false, exit: post && post.exit };
    },
  };

  // ------------------------------------------------------------------ ejecutar una celda (también lo usan los jobs)
  const MAGIAS = { sql: 'sql', python: 'python', py: 'python', md: 'md', fs: 'fs', sh: 'sh', run: 'run', pip: 'pip', scala: 'scala', r: 'r' };
  D.lenguajeCelda = (src, lang) => { const m = /^%(\w+)/.exec(src || ''); return m && MAGIAS[m[1]] ? MAGIAS[m[1]] : lang; };
  const cuerpoCelda = (src) => (/^%(\w+)/.test(src) ? src.replace(/^%\w+[ \t]*\n?/, '') : src);
  // parámetros con nombre :param (y ${param}) desde los widgets
  D.sustituirParams = (sql, vals) => sql.replace(/(^|[^:\w])(?::([A-Za-z_]\w*)|\$\{([A-Za-z_]\w*)\})/g, (m, pre, a, b) => { const k = a || b; if (!(k in vals)) return m; const v = vals[k]; return pre + (v !== '' && v != null && /^-?\d+(\.\d+)?$/.test(String(v)) ? String(v) : `'${String(v).replace(/'/g, "''")}'`); });
  D.ejecutarCelda = async (src, { nb, aviso, origen = 'Notebook', pila = [], job = null } = {}) => {
    const lang = D.lenguajeCelda(src, (nb && nb.lang) || 'python');
    const cuerpo = cuerpoCelda(src);
    const widgets = nb ? Object.fromEntries(Object.entries(nb.widgets || {}).map(([k, w]) => [k, w.valor ?? w.default])) : {};
    if (!cuerpo.trim() && lang !== 'md') return { salidas: [], ok: true };
    if (lang === 'md') return { salidas: [{ tipo: 'md', v: cuerpo }], ok: true };
    if (lang === 'sql') {
      const sql = D.sustituirParams(cuerpo, widgets);
      const res = await window.DBSQL.ejecutar(sql, { origen, compute: nb && nb.compute && nb.compute !== 'serverless' ? 'CLUSTER' : 'SERVERLESS' });
      const ult = res[res.length - 1];
      if (!ult.ok) return { salidas: [{ tipo: 'error', v: ult.error }], ok: false };
      if (!ult.cols.length) return { salidas: [{ tipo: 'texto', v: ult.msg || 'OK' }], ok: true };
      return { salidas: [{ tipo: 'tabla', cols: ult.cols, filas: ult.filas, tipos: ult.tipos, total: ult.truncado || ult.filas.length }], ok: true };
    }
    if (lang === 'python') return Py.correr(cuerpo, { widgets, aviso, job });
    if (lang === 'fs') return { ...fsMagia(cuerpo.trim()), ok: true };
    if (lang === 'sh') {
      if (!window.Shell) return { salidas: [{ tipo: 'error', v: 'La terminal del curso no está disponible.' }], ok: false };
      const r = await window.Shell.runLine(cuerpo.trim(), { autoLogin: true });
      const t = String(r.out || '').replace(/\u0001[^\u0002]*\u0002/g, '').replace(/\u0003/g, '');
      return { salidas: [{ tipo: r.code ? 'error' : 'texto', v: t || (r.code ? `exit code ${r.code}` : '') }], ok: !r.code };
    }
    if (lang === 'pip') { const pk = cuerpo.replace(/^install\s+/, '').trim(); return { salidas: [{ tipo: 'texto', v: `Collecting ${pk}\nSuccessfully installed ${pk} (simulado: en esta práctica Python ya trae lo que usa el curso)\nNote: you may need to restart the kernel using %restart_python or dbutils.library.restartPython() to use updated packages.` }], ok: true }; }
    if (lang === 'run') {
      const ref = cuerpo.trim().split(/\s+/)[0]; const base = nb && nb._ruta ? nb._ruta.replace(/\/[^/]+$/, '') : HOME;
      const ruta = ref.startsWith('/') ? (ref.startsWith('/Workspace') ? ref : '/Workspace' + ref) : normalizar(base + '/' + ref);
      const otro = D.ws().items[ruta];
      if (!otro || otro.tipo !== 'notebook') return { salidas: [{ tipo: 'error', v: `Notebook not found: ${ref} (se buscó ${ruta})` }], ok: false };
      if (pila.includes(ruta)) return { salidas: [{ tipo: 'error', v: '%run circular: un notebook se incluye a sí mismo.' }], ok: false };
      for (const c of otro.celdas) { const r = await D.ejecutarCelda(c.src, { nb: { ...otro, _ruta: ruta, widgets: nb && nb.widgets }, aviso, origen, pila: [...pila, ruta], job }); if (!r.ok) return { salidas: [{ tipo: 'error', v: `Error en ${ref}: ` + ((r.salidas.find((s) => s.tipo === 'error') || {}).v || '') }], ok: false }; }
      return { salidas: [{ tipo: 'texto', v: `Se ejecutó ${ref}: sus variables y funciones ya están disponibles en este notebook.` }], ok: true };
    }
    return { salidas: [{ tipo: 'error', v: `Esta práctica ejecuta Python y SQL. Las celdas %${lang} no están disponibles.` }], ok: false };
  };
  function normalizar(p) { const out = []; for (const x of p.split('/')) { if (x === '..') out.pop(); else if (x && x !== '.') out.push(x); } return '/' + out.join('/'); }
  function fsMagia(cmd) {
    const C = D.cli(); const F = C.files || (C.files = {});
    const [op, ...args] = cmd.split(/\s+/); const n = (p) => String(p || '').replace(/^dbfs:/, '').replace(/\/$/, '');
    if (op === 'ls') {
      const d = n(args[0] || '/'); const h = new Map();
      for (const k of Object.keys(F)) if (k.startsWith(d + '/')) { const resto = k.slice(d.length + 1); h.set(resto.split('/')[0], resto.includes('/') ? null : F[k].length); }
      if (!h.size && d !== '' && !/^\/Volumes\/\w+\/\w+\/\w+$/.test(d)) return { salidas: [{ tipo: 'error', v: `java.io.FileNotFoundException: No such file or directory: dbfs:${d}` }] };
      return { salidas: [{ tipo: 'tabla', cols: ['path', 'name', 'size', 'modificationTime'], filas: [...h].map(([k, s]) => [`dbfs:${d}/${k}${s == null ? '/' : ''}`, k + (s == null ? '/' : ''), s || 0, Date.now()]) }] };
    }
    if (op === 'head') { const c = F[n(args[0])]; return { salidas: [c == null ? { tipo: 'error', v: `java.io.FileNotFoundException: ${args[0]}` } : { tipo: 'texto', v: c.slice(0, 65536) }] }; }
    if (op === 'rm') { const d = n(args.filter((x) => x !== '-r')[0]); let k0 = 0; for (const k of Object.keys(F)) if (k === d || (args.includes('-r') && k.startsWith(d + '/'))) { delete F[k]; k0++; } D.cliGuardar(); return { salidas: [{ tipo: 'texto', v: String(k0 > 0) }] }; }
    if (op === 'mkdirs') return { salidas: [{ tipo: 'texto', v: 'true' }] };
    if (op === 'cp') { const [a, b] = args.filter((x) => x !== '-r'); if (F[n(a)] == null) return { salidas: [{ tipo: 'error', v: `java.io.FileNotFoundException: ${a}` }] }; F[n(b).endsWith('/') ? n(b) + n(a).split('/').pop() : n(b)] = F[n(a)]; D.cliGuardar(); return { salidas: [{ tipo: 'texto', v: 'true' }] }; }
    return { salidas: [{ tipo: 'error', v: `%fs ${op}: comandos disponibles ls, head, cp, rm, mkdirs` }] };
  }

  // ------------------------------------------------------------------ vista de resultados (tabla con pestañas y visualizaciones)
  D.tipoIcono = (t) => { const s = String(t || '').toLowerCase(); return /int|long|double|float|decimal|bigint|number/.test(s) ? '<span class="dbx-t num">123</span>' : /date|time/.test(s) ? `<span class="dbx-t">${ic('calendar')}</span>` : /bool/.test(s) ? '<span class="dbx-t">T/F</span>' : '<span class="dbx-t">ABC</span>'; };
  D.celdaValor = (v) => (v === null || v === undefined ? '<span class="dbx-null">null</span>' : typeof v === 'number' ? `<span class="num">${Number.isInteger(v) ? v : Math.round(v * 1e6) / 1e6}</span>` : esc(String(v).length > 300 ? String(v).slice(0, 300) + '…' : v));
  D.tablaHtml = (r, max = 1000) => {
    const filas = r.filas.slice(0, max);
    return `<div class="dbx-res-tabla"><table><thead><tr><th class="n"></th>${r.cols.map((c, i) => `<th>${D.tipoIcono((r.tipos || [])[i])}${esc(c)}</th>`).join('')}</tr></thead><tbody>${filas.map((f, i) => `<tr><td class="n">${i + 1}</td>${f.map((v) => `<td>${D.celdaValor(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  };
  D.descargarCsv = (r, nombre = 'resultado.csv') => {
    const csv = [r.cols, ...r.filas].map((f) => f.map((v) => (v == null ? '' : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : v)).join(',')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = nombre; a.click();
  };
  // contenedor con pestañas: Table | visualizaciones guardadas | +
  D.resultado = (el, r, { vizs = [], alCambiar } = {}) => {
    let pest = 0;
    const pintar = () => {
      const total = r.total ?? r.filas.length;
      el.innerHTML = `<div class="dbx-res"><div class="dbx-res-pest"><button class="${pest === 0 ? 'on' : ''}" data-p="0">${ic('table')} Table</button>${vizs.map((v, i) => `<button class="${pest === i + 1 ? 'on' : ''}" data-p="${i + 1}">${ic('graph')} ${esc(v.nombre || v.tipo)}</button>`).join('')}<button data-p="nueva" title="Add visualization">${ic('add')}</button><span class="dbx-res-info">${total > r.filas.length ? `Mostrando ${r.filas.length} de ${total} filas` : `${r.filas.length} fila${r.filas.length === 1 ? '' : 's'}`}</span><button class="dbx-ib" data-p="csv" title="Download CSV">${ic('cloud-download')}</button></div><div class="dbx-res-cuerpo"></div></div>`;
      const cuerpo = el.querySelector('.dbx-res-cuerpo');
      if (pest === 0) cuerpo.innerHTML = r.cols.length ? D.tablaHtml(r) : '<p class="dbx-dim">Query returned no columns.</p>';
      else { const v = vizs[pest - 1]; cuerpo.innerHTML = D.Viz ? D.Viz.svg(v, r) : ''; cuerpo.insertAdjacentHTML('beforeend', `<div class="dbx-viz-acc"><button class="dbx-btn chico" data-p="editar">${ic('edit')} Edit</button><button class="dbx-btn chico" data-p="borrar">${ic('trash')} Remove</button></div>`); }
    };
    el.onclick = (e) => {
      const b = e.target.closest('[data-p]'); if (!b) return;
      const p = b.dataset.p;
      if (p === 'csv') return D.descargarCsv(r);
      if (p === 'nueva' || p === 'editar') return D.Viz && D.Viz.editor(r, p === 'editar' ? vizs[pest - 1] : null, (v) => { if (p === 'editar') vizs[pest - 1] = v; else { vizs.push(v); pest = vizs.length; } alCambiar && alCambiar(vizs); pintar(); });
      if (p === 'borrar') { vizs.splice(pest - 1, 1); pest = 0; alCambiar && alCambiar(vizs); return pintar(); }
      pest = Number(p); pintar();
    };
    pintar();
  };

  // ------------------------------------------------------------------ notebook
  D.registrar('notebook', (cont, partes) => {
    const W = D.ws(); const ruta = partes[0]; const nb = W.items[ruta];
    if (!nb || nb.tipo !== 'notebook') return D.stub(cont, 'Notebook no encontrado', 'Puede que lo hayas renombrado o movido a la papelera.', [['Workspace', '#/databricks/workspace'], ['Papelera', '#/databricks/workspace/papelera']]);
    D.reciente('notebook', ruta.split('/').pop(), 'notebook/' + D.ruta(ruta));
    nb._ruta = ruta;
    nb.widgets = nb.widgets || {};
    let sel = nb.celdas[0] && nb.celdas[0].id, corriendo = false, parar = false, contador = 0;
    const eds = new Map();
    D.alSalir(() => { for (const e of eds.values()) e.toTextArea && e.toTextArea(); eds.clear(); });
    const guardarNb = () => { nb.modificado = ahora(); D.guardar(); };
    const nombreCompute = () => { if (!nb.compute || nb.compute === 'serverless') return 'Serverless'; const c = D.cli().clusters[nb.compute]; return c ? c.name : 'Serverless'; };
    const estadoCompute = () => { if (!nb.compute || nb.compute === 'serverless') return 'RUNNING'; const c = D.cli().clusters[nb.compute]; return c ? c.state : 'TERMINATED'; };
    const langNombre = { python: 'Python', sql: 'SQL', md: 'Markdown', fs: 'File system', sh: 'Shell', run: 'Run', pip: 'pip', scala: 'Scala', r: 'R' };
    cont.innerHTML = `<div class="dbx-nb">
      <div class="nb-cab">
        <div class="nb-cab-1"><div class="nb-titulo-w"><input class="nb-titulo" id="nbTit" value="${esc(ruta.split('/').pop())}" spellcheck="false" title="Renombrar"><button class="dbx-sel-lang" id="nbLang">${langNombre[nb.lang] || 'Python'} ${ic('chevron-down')}</button></div>
          <div class="nb-cab-der"><button class="dbx-btn" id="nbRunAll">${ic('run-all')} Run all</button><button class="dbx-compute" id="nbCompute">${D.estadoPunto(estadoCompute())}<span>${esc(nombreCompute())}</span>${ic('chevron-down')}</button><button class="dbx-btn" id="nbSched">${ic('calendar')} Schedule</button><button class="dbx-btn primario" id="nbShare">Share</button></div></div>
        <div class="nb-menus"><button data-m="file">File</button><button data-m="edit">Edit</button><button data-m="view">View</button><button data-m="run">Run</button><button data-m="help">Help</button><span class="nb-guardado" id="nbGuard">Last edit was ${nb.modificado ? hora(nb.modificado) : 'now'}</span></div>
      </div>
      <div class="nb-widgets" id="nbW"></div>
      <div class="nb-celdas" id="nbCeldas"></div>
    </div>`;
    const $ = (s) => cont.querySelector(s);
    // renombrar
    $('#nbTit').addEventListener('change', (e) => {
      const n = e.target.value.trim(); const dir = ruta.replace(/\/[^/]+$/, '');
      if (!n || /[/\\]/.test(n) || (W.items[dir + '/' + n] && dir + '/' + n !== ruta)) { e.target.value = ruta.split('/').pop(); D.toast('Nombre inválido o repetido'); return; }
      const np = dir + '/' + n; W.items[np] = nb; delete W.items[ruta]; D.alCli(ruta, null); D.alCli(np, 'NOTEBOOK');
      W.recientes = W.recientes.filter((r) => r.ruta !== 'notebook/' + D.ruta(ruta)); D.guardar(); D.ir('notebook/' + D.ruta(np));
    });
    $('#nbLang').onclick = (e) => D.menu(e.currentTarget, ['python', 'sql'].map((l) => ({ ic: l === nb.lang ? 'check' : '', txt: langNombre[l], fn: () => { nb.lang = l; guardarNb(); $('#nbLang').innerHTML = `${langNombre[l]} ${ic('chevron-down')}`; pintarCeldas(); } })));
    $('#nbCompute').onclick = (e) => {
      const C = D.cli();
      D.menu(e.currentTarget, [{ ic: 'zap', txt: 'Serverless', fn: () => { nb.compute = 'serverless'; guardarNb(); refrescarCompute(); } }, '-', ...Object.entries(C.clusters || {}).map(([id, c]) => ({ ic: c.state === 'RUNNING' ? 'circle-filled' : 'circle-large-outline', txt: `${c.name} (${c.state.toLowerCase()})`, fn: () => { nb.compute = id; guardarNb(); refrescarCompute(); } })), '-', { ic: 'add', txt: 'Create new resource…', fn: () => D.ir('compute/nuevo') }]);
    };
    const refrescarCompute = () => { $('#nbCompute').innerHTML = `${D.estadoPunto(estadoCompute())}<span>${esc(nombreCompute())}</span>${ic('chevron-down')}`; };
    $('#nbShare').onclick = () => D.dialogo({ titulo: 'Sharing settings', ok: 'Done', cancelar: 'Close', cuerpo: `<p>Permisos del notebook:</p><table class="dbx-tabla"><tbody><tr><td>${ic('person')} Alumno Academia (you)</td><td>Can Manage</td></tr><tr><td>${ic('organization')} admins</td><td>Can Manage</td></tr></tbody></table><p class="dbx-dim">Niveles de permiso en Databricks: Can Read, Can Run, Can Edit y Can Manage. En la práctica hay un solo usuario.</p>`, alOk: () => true });
    $('#nbSched').onclick = () => D.programarNotebook ? D.programarNotebook(ruta) : D.ir('jobs/nuevo');
    $('#nbRunAll').onclick = () => correrTodo(0);
    cont.querySelector('.nb-menus').onclick = (e) => {
      const b = e.target.closest('[data-m]'); if (!b) return;
      const M = {
        file: [{ ic: 'notebook', txt: 'New notebook', fn: () => D.abrirNuevoNotebook(ruta.replace(/\/[^/]+$/, '')) }, { ic: 'copy', txt: 'Clone', fn: () => { const dir = ruta.replace(/\/[^/]+$/, ''); const n = D.nombreLibre(dir, ruta.split('/').pop() + ' (clone)'); W.items[dir + '/' + n] = JSON.parse(JSON.stringify({ ...nb, _ruta: undefined, creado: ahora() })); D.guardar(); D.ir('notebook/' + D.ruta(dir + '/' + n)); } }, { ic: 'cloud-download', txt: 'Export → Source file', fn: () => D.exportarNotebook(ruta) }, '-', { ic: 'trash', txt: 'Move to trash', peligro: true, fn: () => { if (!confirm('¿Mover el notebook a la papelera?')) return; W.papelera[ruta] = { ...nb, borrado: ahora() }; delete W.items[ruta]; D.alCli(ruta, null); D.guardar(); D.ir('workspace/' + D.ruta(ruta.replace(/\/[^/]+$/, ''))); } }],
        edit: [{ ic: 'clear-all', txt: 'Clear all cell outputs', fn: () => { nb.celdas.forEach((c) => { delete c.out; delete c.meta; }); guardarNb(); pintarCeldas(); } }, { ic: 'add', txt: 'Add cell below', fn: () => agregar(idx(sel) + 1, '') }, { ic: 'trash', txt: 'Delete cell', fn: () => borrarCelda(sel) }],
        view: [{ ic: 'symbol-numeric', txt: nb.verNumeros ? 'Hide line numbers' : 'Show line numbers', fn: () => { nb.verNumeros = !nb.verNumeros; guardarNb(); pintarCeldas(); } }],
        run: [{ ic: 'run-all', txt: 'Run all', atajo: '', fn: () => correrTodo(0) }, { ic: 'run-above', txt: 'Run all above', fn: () => correrTodo(0, idx(sel)) }, { ic: 'run-below', txt: 'Run selected cell and below', fn: () => correrTodo(idx(sel)) }, '-', { ic: 'debug-stop', txt: 'Interrupt execution', fn: () => { parar = true; } }, { ic: 'debug-restart', txt: 'Clear state', fn: async () => { await Py.limpiarEstado(); contador = 0; D.toast('Estado de Python limpio (variables borradas)'); } }, { ic: 'debug-restart', txt: 'Clear state and run all', fn: async () => { await Py.limpiarEstado(); contador = 0; correrTodo(0); } }],
        help: [{ ic: 'keyboard', txt: 'Shift+Enter: ejecutar y pasar a la siguiente', des: true }, { txt: 'Ctrl+Enter: ejecutar la celda', des: true }, { txt: 'Alt+Enter: ejecutar e insertar una celda debajo', des: true }, { txt: 'Ctrl+Alt+↑/↓: mover la celda', des: true }, '-', { ic: 'link-external', txt: 'Documentación de notebooks', fn: () => window.open('https://learn.microsoft.com/azure/databricks/notebooks/', '_blank') }],
      }[b.dataset.m];
      D.menu(b, M);
    };
    const idx = (id) => nb.celdas.findIndex((c) => c.id === id);
    function agregar(pos, src) { const c = { id: nid(), src }; nb.celdas.splice(pos, 0, c); sel = c.id; guardarNb(); pintarCeldas(); setTimeout(() => { const e = eds.get(c.id); if (e) e.focus(); }, 30); return c; }
    function borrarCelda(id) { const i = idx(id); if (i < 0) return; nb.celdas.splice(i, 1); if (!nb.celdas.length) nb.celdas.push({ id: nid(), src: '' }); sel = (nb.celdas[Math.min(i, nb.celdas.length - 1)] || {}).id; guardarNb(); pintarCeldas(); D.toast('Celda borrada'); }
    function mover(id, d) { const i = idx(id), j = i + d; if (j < 0 || j >= nb.celdas.length) return; [nb.celdas[i], nb.celdas[j]] = [nb.celdas[j], nb.celdas[i]]; guardarNb(); pintarCeldas(); }
    // widgets
    function pintarWidgets() {
      const ws0 = Object.entries(nb.widgets || {});
      const el = $('#nbW'); el.hidden = !ws0.length;
      el.innerHTML = ws0.map(([k, w]) => `<label class="nb-w"><span>${esc(w.label || k)}</span>${w.tipo === 'dropdown' ? `<select data-w="${esc(k)}">${(w.choices || []).map((c) => `<option ${String(w.valor ?? w.default) === String(c) ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select>` : `<input data-w="${esc(k)}" value="${esc(w.valor ?? w.default ?? '')}" ${w.tipo === 'combobox' ? `list="wl-${esc(k)}"` : ''}>${w.tipo === 'combobox' ? `<datalist id="wl-${esc(k)}">${(w.choices || []).map((c) => `<option value="${esc(c)}">`).join('')}</datalist>` : ''}`}</label>`).join('') + (ws0.length ? '<span class="nb-w-ayuda" title="dbutils.widgets.get(\'nombre\') en Python, :nombre en SQL">' + ic('info') + '</span>' : '');
      el.querySelectorAll('[data-w]').forEach((i) => i.onchange = () => { nb.widgets[i.dataset.w].valor = i.value; guardarNb(); });
    }
    function aplicarWdefs(wdefs) {
      if (!wdefs) return; let cambio = false;
      for (const [k, w] of Object.entries(wdefs)) { if (w === null) { delete nb.widgets[k]; cambio = true; continue; } const prev = nb.widgets[k]; nb.widgets[k] = { ...w, valor: prev ? prev.valor : undefined }; cambio = true; }
      if (cambio) { guardarNb(); pintarWidgets(); }
    }
    // celdas
    function pintarCeldas() {
      for (const e of eds.values()) e.toTextArea && e.toTextArea(); eds.clear();
      const box = $('#nbCeldas');
      box.innerHTML = nb.celdas.map((c, i) => celdaHtml(c, i)).join('') + `<div class="nb-add fin"><button data-add="code">${ic('add')} Code</button><button data-add="text">${ic('add')} Text</button></div>`;
      for (const c of nb.celdas) montarEditor(c);
    }
    function celdaHtml(c) {
      const lang = D.lenguajeCelda(c.src, nb.lang);
      const md = lang === 'md' && !c.editando && c.src.trim();
      return `<div class="nb-add"><button data-add="code" data-antes="${c.id}">${ic('add')} Code</button><button data-add="text" data-antes="${c.id}">${ic('add')} Text</button></div>
        <div class="nb-celda ${sel === c.id ? 'sel' : ''} ${md ? 'md' : ''}" data-id="${c.id}">
          <div class="nb-c-bar"><span class="nb-c-n">${c.n ? `[${c.n}]` : ''}</span>${lang !== 'md' ? `<button class="nb-run" data-c="run" title="Run cell (Ctrl+Enter)">${c.estado === 'corriendo' ? '<span class="dbx-gira"></span>' : ic('play')}</button>` : ''}<span class="nb-c-lang">${langNombre[lang] || lang}</span><span class="nb-c-sp"></span>${lang === 'md' && md ? `<button class="dbx-ib" data-c="editar" title="Edit">${ic('edit')}</button>` : ''}<button class="dbx-ib" data-c="arriba" title="Move up">${ic('arrow-up')}</button><button class="dbx-ib" data-c="abajo" title="Move down">${ic('arrow-down')}</button><button class="dbx-ib" data-c="menu" title="Cell actions">${ic('ellipsis')}</button></div>
          ${md ? `<div class="nb-md">${D.md(c.src.replace(/^%md[ \t]*\n?/, ''))}</div>` : `<div class="nb-c-ed"><textarea>${esc(c.src)}</textarea></div>`}
          <div class="nb-c-out">${salidasHtml(c)}</div>
          ${c.meta ? `<div class="nb-c-meta">${c.meta}</div>` : ''}
        </div>`;
    }
    function salidasHtml(c) {
      if (c.estado === 'corriendo') return `<div class="nb-corriendo"><span class="dbx-gira"></span> ${esc(c.aviso || 'Running command...')}</div>`;
      return (c.out || []).map((s, i) => {
        if (s.tipo === 'texto') return `<pre class="nb-texto">${esc(s.v)}</pre>`;
        if (s.tipo === 'error') return `<div class="nb-error"><pre>${esc(s.v)}</pre>${s.linea ? `<div class="nb-error-l">${ic('error')} Línea ${s.linea}${s.codigo ? `: <code>${esc(s.codigo)}</code>` : ''}</div>` : ''}<div class="nb-error-ayuda">${ayudaError(s.v)}</div></div>`;
        if (s.tipo === 'md') return '';
        if (s.tipo === 'html') return `<iframe class="nb-html" sandbox="" srcdoc="${esc(s.v)}"></iframe>`;
        if (s.tipo === 'tabla') return `<div class="nb-tabla" data-o="${i}"></div>`;
        return '';
      }).join('');
    }
    function montarEditor(c) {
      const el = cont.querySelector(`.nb-celda[data-id="${c.id}"]`); if (!el) return;
      el.querySelectorAll('.nb-tabla').forEach((t) => { const s = c.out[Number(t.dataset.o)]; D.resultado(t, s, { vizs: (c.vizs = c.vizs || []), alCambiar: guardarNb }); });
      const ta = el.querySelector('textarea'); if (!ta || !window.CodeMirror) return;
      const lang = D.lenguajeCelda(c.src, nb.lang);
      const ed = window.CodeMirror.fromTextArea(ta, { mode: lang === 'sql' ? 'text/x-sparksql' : lang === 'python' ? 'python' : lang === 'sh' ? 'shell' : null, lineNumbers: !!nb.verNumeros, viewportMargin: Infinity, matchBrackets: true, autoCloseBrackets: true, indentUnit: 4, tabSize: 4, lineWrapping: false, extraKeys: {
        'Shift-Enter': () => { correrCelda(c).then(() => { const i = idx(c.id); if (i === nb.celdas.length - 1) agregar(i + 1, ''); else { sel = nb.celdas[i + 1].id; marcarSel(); const e2 = eds.get(sel); if (e2) e2.focus(); } }); },
        'Ctrl-Enter': () => correrCelda(c), 'Cmd-Enter': () => correrCelda(c),
        'Alt-Enter': () => { correrCelda(c); agregar(idx(c.id) + 1, ''); },
        'Ctrl-Alt-Up': () => mover(c.id, -1), 'Ctrl-Alt-Down': () => mover(c.id, 1),
        'Ctrl-/': 'toggleComment', 'Cmd-/': 'toggleComment', Tab: (cm) => (cm.somethingSelected() ? cm.indentSelection('add') : cm.replaceSelection('    ')),
      } });
      ed.on('change', () => { c.src = ed.getValue(); clearTimeout(c._t); c._t = setTimeout(() => { guardarNb(); const nl = D.lenguajeCelda(c.src, nb.lang); el.querySelector('.nb-c-lang').textContent = langNombre[nl] || nl; const modo = nl === 'sql' ? 'text/x-sparksql' : nl === 'python' ? 'python' : nl === 'sh' ? 'shell' : null; if (ed.getOption('mode') !== modo) ed.setOption('mode', modo); }, 300); });
      ed.on('focus', () => { sel = c.id; marcarSel(); });
      ed.on('blur', () => { if (D.lenguajeCelda(c.src, nb.lang) === 'md' && c.editando) { c.editando = false; setTimeout(() => { if (!document.activeElement || !el.contains(document.activeElement)) { const i = idx(c.id); if (i >= 0) { const nuevo = document.createElement('div'); nuevo.innerHTML = celdaHtml(c); el.previousElementSibling.remove(); el.replaceWith(...nuevo.children); montarEditor(c); } } }, 120); } });
      eds.set(c.id, ed);
      if (c.editando) setTimeout(() => ed.focus(), 20);
    }
    function marcarSel() { cont.querySelectorAll('.nb-celda').forEach((x) => x.classList.toggle('sel', x.dataset.id === sel)); }
    function repintar(c) {
      const el = cont.querySelector(`.nb-celda[data-id="${c.id}"]`); if (!el) return;
      const ed = eds.get(c.id); if (ed) { ed.toTextArea(); eds.delete(c.id); }
      const nuevo = document.createElement('div'); nuevo.innerHTML = celdaHtml(c);
      el.previousElementSibling.remove(); el.replaceWith(...nuevo.children); montarEditor(c);
    }
    async function asegurarCompute(c) {
      if (!nb.compute || nb.compute === 'serverless') return true;
      const C = D.cli(); const cl = C.clusters[nb.compute];
      if (!cl) { nb.compute = 'serverless'; refrescarCompute(); return true; }
      if (cl.state === 'RUNNING') { cl.ultimaActividad = Date.now(); D.cliGuardar(); return true; }
      if (cl.state === 'TERMINATED' || cl.state === 'ERROR') {
        c.aviso = `Iniciando el cluster ${cl.name}… (en Databricks tarda de 3 a 7 minutos; aquí unos segundos)`; repintar(c);
        await (D.Compute ? D.Compute.iniciar(nb.compute) : Promise.resolve());
        refrescarCompute(); return true;
      }
      c.aviso = `Esperando que el cluster ${cl.name} termine de iniciar…`; repintar(c);
      await (D.Compute ? D.Compute.esperar(nb.compute) : Promise.resolve()); refrescarCompute(); return true;
    }
    async function correrCelda(c) {
      if (corriendo && c.estado !== 'en-cola') { D.toast('Hay otra celda ejecutándose'); return false; }
      corriendo = true;
      const lang = D.lenguajeCelda(c.src, nb.lang);
      if (lang === 'md') { c.editando = false; corriendo = false; repintar(c); return true; }
      c.estado = 'corriendo'; c.aviso = 'Running command...'; repintar(c);
      const t0 = performance.now();
      let r;
      try {
        await asegurarCompute(c);
        r = await D.ejecutarCelda(c.src, { nb, aviso: (m) => { c.aviso = m; repintar(c); } });
      } catch (e) { r = { salidas: [{ tipo: 'error', v: e.message }], ok: false }; }
      if (r.post && r.post.wdefs) aplicarWdefs(r.post.wdefs);
      c.estado = null; c.n = ++contador;
      // solo se guardan hasta 100 filas por tabla en el notebook
      c.out = r.salidas.map((s) => (s.tipo === 'tabla' ? { ...s, filas: s.filas.slice(0, 1000) } : s));
      const seg = (performance.now() - t0) / 1000;
      c.meta = `Command took ${seg < 1 ? seg.toFixed(2) : seg.toFixed(1)} seconds -- by ${USUARIO} at ${new Date().toLocaleString('es')} on ${esc(nombreCompute())}`;
      corriendo = false;
      guardarNb(); repintar(c);
      if (!nb.compute || nb.compute === 'serverless') { if (D.Compute) D.Compute.usoServerless(seg); } else if (D.Compute) D.Compute.actividad(nb.compute);
      $('#nbGuard').textContent = 'Last edit was now';
      return r.ok;
    }
    async function correrTodo(desde = 0, hasta = nb.celdas.length) {
      parar = false;
      for (const c of nb.celdas.slice(desde, hasta)) { if (D.lenguajeCelda(c.src, nb.lang) !== 'md') { c.estado = null; } }
      for (const c of nb.celdas.slice(desde, hasta)) {
        if (parar) { D.toast('Ejecución interrumpida'); break; }
        if (D.lenguajeCelda(c.src, nb.lang) === 'md' || !c.src.trim()) continue;
        const ok = await correrCelda(c);
        if (!ok) { D.toast('Run all se detuvo: la celda falló'); break; }
      }
    }
    $('#nbCeldas').addEventListener('click', (e) => {
      const add = e.target.closest('[data-add]');
      if (add) { const pos = add.dataset.antes ? idx(add.dataset.antes) : nb.celdas.length; const c = agregar(pos, add.dataset.add === 'text' ? '%md\n' : ''); if (add.dataset.add === 'text') { c.editando = true; repintar(c); } return; }
      const celda = e.target.closest('.nb-celda'); if (!celda) return;
      const c = nb.celdas.find((x) => x.id === celda.dataset.id); sel = c.id; marcarSel();
      const b = e.target.closest('[data-c]');
      if (!b) return;
      const a = b.dataset.c;
      if (a === 'run') correrCelda(c);
      if (a === 'arriba') mover(c.id, -1);
      if (a === 'abajo') mover(c.id, 1);
      if (a === 'editar') { c.editando = true; repintar(c); }
      if (a === 'menu') D.menu(b, [{ ic: 'play', txt: 'Run cell', atajo: 'Ctrl+Enter', fn: () => correrCelda(c) }, { ic: 'run-above', txt: 'Run all above', fn: () => correrTodo(0, idx(c.id)) }, { ic: 'run-below', txt: 'Run cell and below', fn: () => correrTodo(idx(c.id)) }, '-', { ic: 'add', txt: 'Add cell above', fn: () => agregar(idx(c.id), '') }, { ic: 'add', txt: 'Add cell below', fn: () => agregar(idx(c.id) + 1, '') }, { ic: 'clear-all', txt: 'Clear cell output', fn: () => { delete c.out; delete c.meta; c.n = null; guardarNb(); repintar(c); } }, '-', { ic: 'trash', txt: 'Delete cell', peligro: true, fn: () => borrarCelda(c.id) }], 'der');
    });
    $('#nbCeldas').addEventListener('dblclick', (e) => { const md = e.target.closest('.nb-md'); if (!md) return; const c = nb.celdas.find((x) => x.id === md.closest('.nb-celda').dataset.id); c.editando = true; repintar(c); });
    pintarWidgets(); pintarCeldas();
  });
  // pistas para los errores más comunes de un principiante
  function ayudaError(m) {
    const s = String(m);
    if (/TABLE_OR_VIEW_NOT_FOUND/.test(s)) return '💡 Revisa el nombre completo <code>catálogo.esquema.tabla</code>. Las tablas de ejemplo están en <code>samples</code> (por ejemplo <code>samples.tienda.pedidos</code>) y las tuyas en <code>main.default</code>. Míralas en <a href="#/databricks/catalogo">Catalog</a>.';
    if (/UNRESOLVED_COLUMN/.test(s)) return '💡 Esa columna no existe en la tabla. Ejecuta <code>DESCRIBE TABLE</code> o mira las columnas en Catalog.';
    if (/PARSE_SYNTAX_ERROR/.test(s)) return '💡 Error de sintaxis: revisa comas, paréntesis y comillas cerca de la palabra que indica el mensaje.';
    if (/CAST_INVALID_INPUT/.test(s)) return '💡 Hay un texto que no se puede convertir a número o fecha. <code>try_cast</code> devuelve NULL en vez de fallar.';
    if (/NameError/.test(s)) return '💡 Esa variable o función no existe todavía: ¿ejecutaste antes la celda que la define?';
    if (/PERMISSION_DENIED/.test(s)) return '💡 Ese objeto es de solo lectura o no tienes el privilegio. Escribe tus tablas en <code>main</code>.';
    if (/DELTA_VIOLATE_CONSTRAINT|NOT_NULL_CONSTRAINT/.test(s)) return '💡 Una restricción de la tabla rechazó la escritura completa: Delta no guarda nada a medias.';
    return '';
  }

  window.Databricks = { vista: (m, ctx, sub) => { if (main === m && m.querySelector('#dbx')) { Store = ctx.Store; render(sub); } else vista(m, ctx, sub); } };
})();
