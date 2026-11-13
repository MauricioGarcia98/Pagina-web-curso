/* Réplica de JupyterLab (práctica). Interfaz dibujada desde cero siguiendo la documentación pública de
 * JupyterLab 4: no usa el logo ni código del proyecto Jupyter. El Python corre en tu navegador con
 * JupyterKernel (assets/js/jupyter-kernel.js). Los notebooks se guardan en formato .ipynb (nbformat 4), así
 * que se pueden descargar y abrir en un JupyterLab real. */
(function () {
  'use strict';
  const K = () => window.JupyterKernel;
  let main = null, Store = null, toast = (m) => console.log(m);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const LAUNCHER = '__launcher';
  const IC = {
    carpeta: '<path d="M3 6a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/>',
    archivo: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/>',
    nb: '<path d="M6 3h12v18H6z"/><path d="M9 7h6M9 11h6M9 15h4"/>',
    py: '<path d="M6 3h8l4 4v14H6z"/><path d="M9 13l-2 2 2 2M15 13l2 2-2 2"/>',
    csv: '<rect x="4" y="4" width="16" height="16" rx="1"/><path d="M4 9h16M4 14h16M10 4v16"/>',
    md: '<path d="M6 3h8l4 4v14H6z"/><path d="M8 16v-5l2 2 2-2v5M15 11v5l-1.5-1.5M15 16l1.5-1.5"/>',
    mas: '<path d="M12 5v14M5 12h14"/>', nuevaCarpeta: '<path d="M3 6a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M12 10v6M9 13h6"/>',
    subir: '<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>', refrescar: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>',
    guardar: '<path d="M5 3h11l3 3v15H5z"/><path d="M8 3v5h7V3M8 21v-7h8v7"/>', cortar: '<circle cx="6" cy="18" r="3"/><circle cx="18" cy="18" r="3"/><path d="M8 16L18 4M16 16L6 4"/>',
    copiar: '<rect x="8" y="8" width="12" height="12" rx="1"/><path d="M16 8V4H4v12h4"/>', pegar: '<path d="M8 4h8v3H8z"/><path d="M6 6H5v15h14V6h-1"/>',
    play: '<path d="M7 4l13 8-13 8z" fill="currentColor"/>', stop: '<rect x="6" y="6" width="12" height="12" fill="currentColor"/>', reinicio: '<path d="M4 12a8 8 0 1 0 2.3-5.7M4 4v5h5"/>',
    ffwd: '<path d="M4 5l8 7-8 7zM12 5l8 7-8 7z" fill="currentColor"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>',
    archivos: '<path d="M3 6a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/>', corriendo: '<circle cx="12" cy="12" r="8"/><rect x="9.5" y="9.5" width="5" height="5" fill="currentColor"/>',
    toc: '<path d="M4 6h16M4 12h10M4 18h13"/>', curso: '<path d="M15 6l-6 6 6 6"/>', arriba: '<path d="M12 19V5M6 11l6-6 6 6"/>', abajo: '<path d="M12 5v14M6 13l6 6 6-6"/>', basura: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    descargar: '<path d="M12 4v12M7 11l5 5 5-5M4 20h16"/>',
  };
  // íconos de JupyterLab (@jupyterlab/ui-components, BSD-3); los dibujos propios quedan de respaldo
  const JLMAP = { carpeta: 'folder', archivo: 'file', nb: 'notebook', py: 'python', csv: 'spreadsheet', md: 'markdown', mas: 'add', nuevaCarpeta: 'new-folder', subir: 'file-upload', refrescar: 'refresh', guardar: 'save', cortar: 'cut', copiar: 'copy', pegar: 'paste', play: 'run', stop: 'stop', reinicio: 'refresh', ffwd: 'fast-forward', x: 'close', archivos: 'folder', corriendo: 'running', toc: 'toc', arriba: 'move-up', abajo: 'move-down', basura: 'delete', descargar: 'download' };
  const ic = (n, t = 16) => (window.IconosOficiales && JLMAP[n] && window.IconosOficiales.tiene('jl', JLMAP[n]) ? window.IconosOficiales.jl(JLMAP[n], t, 'jl-ic') : icPropio(n, t));
  const icPropio = (n, t = 16) => `<svg class="jl-ic" width="${t}" height="${t}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[n] || ''}</svg>`;

  // ---------------------------------------------------------------- estado guardado
  function S() {
    const d = Store.data;
    if (!d.jupyter) d.jupyter = { archivos: {}, carpetas: [], tabs: [LAUNCHER], activo: LAUNCHER, cwd: '', eventos: {}, hist: [] };
    const j = d.jupyter;
    if (!j.inicial) { j.inicial = true; j.archivos['Bienvenida.ipynb'] = { t: JSON.stringify(nbBienvenida(), null, 1), m: Date.now() }; j.tabs = [LAUNCHER, 'Bienvenida.ipynb']; j.activo = 'Bienvenida.ipynb'; guardar(); }
    return j;
  }
  function guardar() { Store.saveSoon ? Store.saveSoon() : Store.save(); }
  function evento(nombre) { const j = Store.data.jupyter; if (!j) return; j.eventos[nombre] = (j.eventos[nombre] || 0) + 1; guardar(); }

  // datos del curso como CSV de solo lectura en datos/ (se generan al abrir, no ocupan espacio guardado)
  let DATOS = null;
  const TABLAS_CSV = ['clientes', 'productos', 'pedidos', 'detalle_pedidos', 'clientes_crudo', 'empleados', 'categorias'];
  function datos() {
    if (DATOS) return DATOS;
    DATOS = {};
    try {
      const T = (window.Engines && window.Engines.SQL && window.Engines.SQL.tables) || window.DataGen.build();
      const campo = (v) => (v == null ? '' : /[",\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : String(v));
      for (const n of TABLAS_CSV) { const t = T[n]; if (t) DATOS['datos/' + n + '.csv'] = t.columns.join(',') + '\n' + t.rows.map((r) => r.map(campo).join(',')).join('\n') + '\n'; }
    } catch (e) { /* sin datos del curso */ }
    DATOS['datos/LEEME.md'] = '# Datos de práctica\n\nTablas de Tienda Andina, la empresa ficticia del curso, exportadas a CSV:\n\n' + TABLAS_CSV.map((n) => `- \`${n}.csv\``).join('\n') + '\n\n`clientes_crudo.csv` viene **sucio a propósito** (nulos, mayúsculas, espacios y duplicados) para practicar limpieza con pandas.\n';
    return DATOS;
  }
  // todos los archivos visibles: los del curso (si no los pisaste) y los tuyos
  function todos() { const j = S(); const out = {}; for (const [r, t] of Object.entries(datos())) out[r] = { t, base: true }; for (const [r, f] of Object.entries(j.archivos)) out[r] = { ...f, base: false }; return out; }
  function texto(r) { const f = todos()[r]; return f ? f.t : null; }
  function escribir(r, t) { const j = S(); if (datos()[r] === t && !j.archivos[r]) return; j.archivos[r] = { t, m: Date.now() }; guardar(); }
  function carpetas() { const j = S(); const set = new Set(j.carpetas); for (const r of Object.keys(todos())) { const ps = r.split('/'); for (let i = 1; i < ps.length; i++) set.add(ps.slice(0, i).join('/')); } return [...set].sort(); }
  const tipoDe = (r) => (/\.ipynb$/i.test(r) ? 'nb' : /\.py$/i.test(r) ? 'py' : /\.(csv|tsv)$/i.test(r) ? 'csv' : /\.md$/i.test(r) ? 'md' : 'archivo');
  const base = (r) => r.split('/').pop();
  const dir = (r) => r.split('/').slice(0, -1).join('/');
  function nombreLibre(carpeta, raiz, ext) {
    const t = todos();
    for (let i = 0; ; i++) { const n = (carpeta ? carpeta + '/' : '') + raiz + (i ? i : '') + ext; if (!t[n]) return n; }
  }

  // ---------------------------------------------------------------- notebooks (nbformat 4)
  let uid = 0; const nid = () => 'c' + Date.now().toString(36) + (uid++).toString(36);
  const fuente = (s) => (Array.isArray(s) ? s.join('') : s || '');
  const lineas = (t) => { const ls = String(t).split('\n'); return ls.map((l, i) => (i < ls.length - 1 ? l + '\n' : l)).filter((l, i) => l !== '' || i < ls.length - 1); };
  function nbVacio() { return { cells: [{ cell_type: 'code', execution_count: null, id: nid(), metadata: {}, outputs: [], source: [] }], metadata: { kernelspec: { display_name: 'Python 3 (ipykernel)', language: 'python', name: 'python3' }, language_info: { name: 'python', version: '3.13' } }, nbformat: 4, nbformat_minor: 5 }; }
  function nbBienvenida() {
    const nb = nbVacio();
    const md = (t) => ({ cell_type: 'markdown', id: nid(), metadata: {}, source: lineas(t) });
    const code = (t) => ({ cell_type: 'code', execution_count: null, id: nid(), metadata: {}, outputs: [], source: lineas(t) });
    nb.cells = [
      md('# Bienvenida a JupyterLab de práctica\n\nEste notebook ejecuta **Python de verdad en tu navegador** (con Pyodide). Funciona como un JupyterLab real:\n\n- **Shift + Enter** ejecuta la celda y pasa a la siguiente.\n- **Esc** sale del modo edición; ahí **A** y **B** agregan celdas arriba y abajo, **M** la convierte en Markdown, **Y** en código y **D D** la borra.\n- En la carpeta `datos/` tienes las tablas del curso en CSV.\n\nEjecuta las celdas de abajo, una por una.'),
      code('import pandas as pd\n\npedidos = pd.read_csv("datos/pedidos.csv")\npedidos.head()'),
      code('pedidos["estado"].value_counts()'),
      md('## Un gráfico\n\nLos gráficos de matplotlib aparecen debajo de la celda, como en Jupyter.'),
      code('import matplotlib.pyplot as plt\n\npedidos["canal"].value_counts().plot(kind="bar", title="Pedidos por canal")\nplt.show()'),
      md('## Ahora tú\n\nCrea una celda nueva (tecla **B** en modo comando) y calcula cuántos pedidos **entregados** hay por `metodo_pago`. Pista: filtra con `pedidos[pedidos["estado"] == "entregado"]` y usa `value_counts()`.'),
    ];
    return nb;
  }
  const NBS = {}; // ruta -> { nb, sel, modo, sucio, eds: Map, portapapeles }
  function abrirNb(r) {
    if (NBS[r]) return NBS[r];
    let nb; try { nb = JSON.parse(texto(r) || ''); } catch (e) { nb = null; }
    if (!nb || !Array.isArray(nb.cells)) nb = nbVacio();
    nb.cells.forEach((c) => { if (!c.id) c.id = nid(); if (c.cell_type === 'code' && !c.outputs) c.outputs = []; c._src = fuente(c.source); c._render = c.cell_type === 'markdown'; });
    NBS[r] = { nb, sel: nb.cells[0] ? nb.cells[0].id : null, modo: 'command', sucio: false, eds: new Map() };
    return NBS[r];
  }
  function serializar(nb) {
    const limpio = { ...nb, cells: nb.cells.map((c) => {
      const o = { cell_type: c.cell_type, id: c.id, metadata: c.metadata || {}, source: lineas(c._src ?? fuente(c.source)) };
      if (c.cell_type === 'code') {
        o.execution_count = c.execution_count ?? null;
        o.outputs = (c.outputs || []).map((x) => {
          if (x.output_type === 'stream') return { output_type: 'stream', name: x.name, text: lineas(x.text) };
          if (x.output_type === 'error') return { output_type: 'error', ename: x.ename, evalue: x.evalue, traceback: x.traceback };
          // imágenes y tablas muy grandes no se guardan (el almacenamiento del navegador es chico): se regeneran al ejecutar
          const data = {}; for (const [k, v] of Object.entries(x.data || {})) if (String(v).length < 150000) data[k] = k === 'image/png' ? v : lineas(v);
          return x.output_type === 'execute_result' ? { output_type: 'execute_result', data, metadata: {}, execution_count: x.execution_count } : { output_type: 'display_data', data, metadata: {} };
        });
      }
      return o;
    }) };
    return JSON.stringify(limpio, null, 1) + '\n';
  }
  function guardarNb(r, aviso) { const st = NBS[r]; if (!st) return; escribir(r, serializar(st.nb)); st.sucio = false; pintarTabs(); estado(); if (aviso) toast('Guardado ' + base(r)); }

  // ---------------------------------------------------------------- vista
  let panel = 'archivos';
  function vista(m, ctx) {
    main = m; Store = ctx.Store; toast = ctx.toast || toast;
    document.body.classList.add('jl-abierto');
    const j = S();
    j.tabs = j.tabs.filter((t) => t === LAUNCHER || todos()[t]); if (!j.tabs.length) j.tabs = [LAUNCHER];
    if (!j.tabs.includes(j.activo)) j.activo = j.tabs[0];
    K().alCambiar = () => estado();
    main.innerHTML = `<div class="jlp" id="jlp">
      <header class="jl-menu"><span class="jl-marca" title="JupyterLab de práctica (no es el producto oficial)"><i></i><i></i><i></i></span>${['File', 'Edit', 'View', 'Run', 'Kernel', 'Tabs', 'Settings', 'Help'].map((x) => `<button class="jl-mi" data-menu="${x}">${x}</button>`).join('')}<span class="jl-sp"></span><span class="jl-tag">práctica</span><a class="jl-volver" href="#/herramientas">${ic('curso', 14)} Curso</a></header>
      <div class="jl-cuerpo">
        <nav class="jl-side">${[['archivos', 'File Browser (Ctrl+Shift+F)'], ['corriendo', 'Running Terminals and Kernels'], ['toc', 'Table of Contents']].map(([id, t]) => `<button class="jl-sb${panel === id ? ' on' : ''}" data-panel="${id}" title="${t}">${ic(id, 20)}</button>`).join('')}</nav>
        <aside class="jl-panel" id="jlPanel"></aside>
        <section class="jl-main"><div class="jl-tabs" id="jlTabs"></div><div class="jl-area" id="jlArea"></div></section>
      </div>
      <footer class="jl-status" id="jlStatus"></footer>
      <div class="jl-pop" id="jlPop" hidden></div><div class="jl-modal" id="jlModal" hidden></div>
    </div>`;
    const root = main.querySelector('#jlp');
    root.addEventListener('click', clic);
    root.addEventListener('dblclick', dobleClic);
    root.addEventListener('contextmenu', menuContexto);
    document.removeEventListener('keydown', teclas); document.addEventListener('keydown', teclas);
    if (window.innerWidth < 760) root.querySelector('#jlPanel').classList.add('oculto');
    aplicarTema();
    pintarPanel(); pintarTabs(); pintarArea(); estado();
  }
  function aplicarTema() { const r = main && main.querySelector('#jlp'); if (!r) return; const t = S().tema || 'system'; r.classList.toggle('jl-oscuro', t === 'dark'); r.classList.toggle('jl-claro', t === 'light'); }
  const $ = (s) => main.querySelector(s);
  const activo = () => S().activo;

  function pintarPanel() {
    const el = $('#jlPanel'); if (!el) return;
    main.querySelectorAll('.jl-sb').forEach((b) => b.classList.toggle('on', b.dataset.panel === panel));
    if (panel === 'archivos') {
      const j = S(); const cwd = j.cwd || ''; const t = todos();
      const subdirs = carpetas().filter((c) => dir(c) === cwd);
      const files = Object.keys(t).filter((r) => dir(r) === cwd).sort((a, b) => a.localeCompare(b));
      const migas = ['', ...cwd.split('/').filter(Boolean)];
      el.innerHTML = `<div class="jl-fb-bar"><button class="jl-ib" data-a="nuevo-launcher" title="New Launcher">${ic('mas')}</button><button class="jl-ib" data-a="nueva-carpeta" title="New Folder">${ic('nuevaCarpeta')}</button><label class="jl-ib" title="Upload Files">${ic('subir')}<input type="file" id="jlSubir" multiple hidden></label><button class="jl-ib" data-a="refrescar" title="Refresh the file browser.">${ic('refrescar')}</button></div>
        <div class="jl-migas">${migas.map((x, i) => `<a data-cd="${esc(migas.slice(1, i + 1).join('/'))}">${i ? esc(x) : ic('carpeta', 14)}</a>`).join('<span>/</span>')}</div>
        <div class="jl-fb-cab"><span>Name</span><span>Last Modified</span></div>
        <div class="jl-fb-lista">${subdirs.map((c) => `<div class="jl-fb-i" data-dir="${esc(c)}" tabindex="0">${ic('carpeta')}<span class="jl-fb-n">${esc(base(c))}</span><span class="jl-fb-m"></span></div>`).join('')}${files.map((r) => { const f = t[r]; return `<div class="jl-fb-i${S().tabs.includes(r) ? ' abierto' : ''}" data-file="${esc(r)}" tabindex="0" title="${esc(r)}${f.base ? ' (dato del curso)' : ''}">${ic(tipoDe(r))}<span class="jl-fb-n">${esc(base(r))}</span><span class="jl-fb-m">${f.base ? 'curso' : hace(f.m)}</span></div>`; }).join('')}${!subdirs.length && !files.length ? '<div class="jl-vacio">Carpeta vacía</div>' : ''}</div>`;
      const inp = el.querySelector('#jlSubir'); if (inp) inp.onchange = () => subir(inp.files);
    } else if (panel === 'corriendo') {
      const nbs = S().tabs.filter((t) => tipoDe(t) === 'nb');
      el.innerHTML = `<div class="jl-pt">Running Terminals and Kernels</div><div class="jl-run-s"><b>Kernels</b>${K().listo ? `<button class="jl-link" data-a="apagar">Shut Down All</button>` : ''}</div>${K().listo ? `<div class="jl-run-i">${ic('nb')} Python 3 (ipykernel) <span class="jl-dim">· ${esc(K().estado)}</span></div>${nbs.map((r) => `<div class="jl-run-i jl-run-sub" data-file="${esc(r)}">${esc(base(r))}</div>`).join('')}` : '<div class="jl-vacio">No hay kernels corriendo. Se inicia uno al ejecutar la primera celda.</div>'}<div class="jl-run-s"><b>Open Tabs</b></div>${S().tabs.map((r) => `<div class="jl-run-i" data-tab="${esc(r)}">${ic(r === LAUNCHER ? 'mas' : tipoDe(r))} ${esc(r === LAUNCHER ? 'Launcher' : base(r))}</div>`).join('')}`;
    } else {
      const r = activo(); const st = tipoDe(r) === 'nb' ? abrirNb(r) : null;
      const tit = st ? st.nb.cells.filter((c) => c.cell_type === 'markdown').flatMap((c) => (c._src || '').split('\n').filter((l) => /^#{1,4}\s/.test(l)).map((l) => ({ c: c.id, n: l.match(/^#+/)[0].length, t: l.replace(/^#+\s*/, '') }))) : [];
      el.innerHTML = `<div class="jl-pt">Table of Contents</div>${st ? (tit.length ? tit.map((x) => `<a class="jl-toc-i" style="padding-left:${8 + (x.n - 1) * 14}px" data-ir="${x.c}">${esc(x.t)}</a>`).join('') : '<div class="jl-vacio">Este notebook no tiene títulos. Usa # Título en una celda Markdown.</div>') : '<div class="jl-vacio">Abre un notebook para ver su índice.</div>'}`;
    }
  }
  function hace(ms) { if (!ms) return ''; const s = (Date.now() - ms) / 1000; return s < 60 ? 'now' : s < 3600 ? `${Math.floor(s / 60)} min ago` : s < 86400 ? `${Math.floor(s / 3600)} hours ago` : `${Math.floor(s / 86400)} days ago`; }

  function pintarTabs() {
    const el = $('#jlTabs'); if (!el) return; const j = S();
    el.innerHTML = j.tabs.map((r) => { const st = NBS[r]; const sucio = (st && st.sucio) || (EDS[r] && EDS[r].sucio); return `<div class="jl-tab${r === j.activo ? ' on' : ''}" data-tab="${esc(r)}" title="${esc(r === LAUNCHER ? 'Launcher' : r)}">${ic(r === LAUNCHER ? 'mas' : tipoDe(r), 14)}<span>${esc(r === LAUNCHER ? 'Launcher' : base(r))}</span><button class="jl-tab-x${sucio ? ' sucio' : ''}" data-cerrar="${esc(r)}" title="Close">${sucio ? '●' : ic('x', 12)}</button></div>`; }).join('') + `<button class="jl-tab-mas" data-a="nuevo-launcher" title="New Launcher">${ic('mas', 14)}</button>`;
  }
  function abrir(r) { const j = S(); if (!j.tabs.includes(r)) j.tabs.push(r); j.activo = r; guardar(); pintarTabs(); pintarArea(); pintarPanel(); estado(); }
  function cerrar(r) {
    const j = S(); const st = NBS[r];
    if (st && st.sucio) guardarNb(r);
    if (EDS[r] && EDS[r].sucio) guardarTexto(r);
    delete NBS[r]; delete EDS[r];
    j.tabs = j.tabs.filter((t) => t !== r); if (!j.tabs.length) j.tabs = [LAUNCHER];
    if (j.activo === r) j.activo = j.tabs[j.tabs.length - 1];
    guardar(); pintarTabs(); pintarArea(); pintarPanel(); estado();
  }

  function pintarArea() {
    const el = $('#jlArea'); if (!el) return; const r = activo();
    for (const st of Object.values(NBS)) { for (const e of st.eds.values()) e.toTextArea && e.toTextArea(); st.eds.clear(); }
    if (r === LAUNCHER) return launcher(el);
    const t = tipoDe(r);
    if (t === 'nb') return notebook(el, r);
    if (t === 'csv') return csvVista(el, r);
    return editorTexto(el, r);
  }

  function launcher(el) {
    const tarjeta = (a, icono, t, sub) => `<button class="jl-card" data-a="${a}"><span class="jl-card-ic jl-ci-${icono}">${icono === 'py3' ? '<b>Py</b>' : ic(icono, 34)}</span><span class="jl-card-t">${t}</span>${sub ? `<span class="jl-card-s">${sub}</span>` : ''}</button>`;
    el.innerHTML = `<div class="jl-launcher"><h2 class="jl-l-cab">${ic('carpeta', 18)} /${esc(S().cwd || '')}</h2>
      <div class="jl-l-sec"><h3>${ic('nb', 22)} Notebook</h3><div class="jl-cards">${tarjeta('nuevo-nb', 'py3', 'Python 3<br>(ipykernel)')}</div></div>
      <div class="jl-l-sec"><h3>${ic('archivo', 22)} Other</h3><div class="jl-cards">${tarjeta('nuevo-txt', 'archivo', 'Text File')}${tarjeta('nuevo-md', 'md', 'Markdown File')}${tarjeta('nuevo-py', 'py', 'Python File')}</div></div>
      <p class="jl-l-nota">Práctica: el kernel es Python 3.13 corriendo en tu navegador (Pyodide). Tiene pandas, numpy, matplotlib y la biblioteca estándar; no instala paquetes con <code>pip</code>. Tus archivos se guardan en este navegador.</p></div>`;
  }

  // ---------------------------------------------------------------- notebook
  function notebook(el, r) {
    const st = abrirNb(r);
    const sel = st.nb.cells.find((c) => c.id === st.sel);
    el.innerHTML = `<div class="jl-nb" data-nb="${esc(r)}"><div class="jl-nb-bar">
        <button class="jl-ib" data-nb-a="guardar" title="Save and create checkpoint (Ctrl+S)">${ic('guardar')}</button><button class="jl-ib" data-nb-a="insertar" title="Insert a cell below (B)">${ic('mas')}</button><button class="jl-ib" data-nb-a="cortar" title="Cut this cell (X)">${ic('cortar')}</button><button class="jl-ib" data-nb-a="copiar" title="Copy this cell (C)">${ic('copiar')}</button><button class="jl-ib" data-nb-a="pegar" title="Paste this cell from the clipboard (V)">${ic('pegar')}</button>
        <button class="jl-ib" data-nb-a="correr" title="Run this cell and advance (Shift+Enter)">${ic('play')}</button><button class="jl-ib" data-nb-a="parar" title="Interrupt the kernel">${ic('stop')}</button><button class="jl-ib" data-nb-a="reiniciar" title="Restart the kernel">${ic('reinicio')}</button><button class="jl-ib" data-nb-a="reiniciar-todo" title="Restart the kernel and run all cells">${ic('ffwd')}</button>
        <select class="jl-tipo" id="jlTipo" title="Select the cell type"><option value="code"${sel && sel.cell_type === 'code' ? ' selected' : ''}>Code</option><option value="markdown"${sel && sel.cell_type === 'markdown' ? ' selected' : ''}>Markdown</option><option value="raw"${sel && sel.cell_type === 'raw' ? ' selected' : ''}>Raw</option></select>
        <span class="jl-sp"></span><button class="jl-kernel" data-nb-a="kernel" title="Switch kernel">Python 3 (ipykernel)</button><span class="jl-kdot ${K().estado === 'busy' || K().estado === 'starting' ? 'busy' : ''}" id="jlKdot" title="Kernel status: ${esc(K().estado)}"></span></div>
      <div class="jl-celdas" id="jlCeldas" tabindex="-1">${st.nb.cells.map((c) => celdaHtml(st, c)).join('')}<div class="jl-fin" data-nb-a="agregar-fin" title="Click to add a cell."></div></div></div>`;
    st.nb.cells.forEach((c) => montarCelda(r, c));
    const tipo = el.querySelector('#jlTipo'); tipo.onchange = () => { cambiarTipo(r, tipo.value); };
    if (st.modo === 'edit') { const e = st.eds.get(st.sel); if (e) setTimeout(() => e.focus(), 0); } else el.querySelector('#jlCeldas').focus({ preventScroll: true });
  }
  function prompt(c) { return c.cell_type !== 'code' ? '' : c._corriendo ? '[*]:' : `[${c.execution_count ?? ' '}]:`; }
  function celdaHtml(st, c) {
    const md = c.cell_type === 'markdown' && c._render && (c._src || '').trim();
    return `<div class="jl-celda ${c.cell_type}${st.sel === c.id ? ' sel' : ''}${st.sel === c.id && st.modo === 'edit' ? ' edit' : ''}" data-id="${c.id}">
      <div class="jl-col" title="Click to collapse"></div>
      <div class="jl-in"><div class="jl-prompt">${prompt(c)}</div>${md ? `<div class="jl-md">${mdHtml(c._src)}</div>` : `<div class="jl-ed"><textarea>${esc(c._src || '')}</textarea></div>`}</div>
      ${c.cell_type === 'code' && (c.outputs || []).length ? `<div class="jl-outs">${c.outputs.map((o) => salidaHtml(o)).join('')}</div>` : ''}
      <div class="jl-c-tools">${st.sel === c.id ? `<button class="jl-ib" data-c="arriba" title="Move this cell up">${ic('arriba', 14)}</button><button class="jl-ib" data-c="abajo" title="Move this cell down">${ic('abajo', 14)}</button><button class="jl-ib" data-c="borrar" title="Delete this cell">${ic('basura', 14)}</button>` : ''}</div>
    </div>`;
  }
  function salidaHtml(o) {
    const pr = o.output_type === 'execute_result' ? `<div class="jl-prompt out">[${o.execution_count ?? ' '}]:</div>` : '<div class="jl-prompt out"></div>';
    if (o.output_type === 'stream') return `<div class="jl-out">${pr}<pre class="jl-stream${o.name === 'stderr' ? ' err' : ''}">${esc(fuente(o.text))}</pre></div>`;
    if (o.output_type === 'error') return `<div class="jl-out">${pr}<div class="jl-err-box"><pre class="jl-error">${(o.traceback || []).map((l) => colorTb(l, o.ename)).join('\n')}</pre>${ayudaError(o.ename, o.evalue)}</div></div>`;
    const d = o.data || {};
    if (d['image/png']) return `<div class="jl-out">${pr}<img class="jl-img" alt="${esc(fuente(d['text/plain']) || 'Figura')}" src="data:image/png;base64,${String(fuente(d['image/png'])).replace(/[^A-Za-z0-9+/=]/g, '')}"></div>`;
    if (d['text/html']) return `<div class="jl-out">${pr}<div class="jl-html">${limpiarHtml(fuente(d['text/html']))}</div></div>`;
    return `<div class="jl-out">${pr}<pre class="jl-stream">${esc(fuente(d['text/plain']))}</pre></div>`;
  }
  function colorTb(l, ename) {
    const e = esc(l);
    if (/^-{20,}$/.test(l)) return `<span class="tb-sep">${e}</span>`;
    if (l.startsWith(ename) && /Traceback/.test(l)) return `<span class="tb-nombre">${esc(ename)}</span>${esc(l.slice(ename.length))}`;
    if (/^Cell In\[\d+\]|^File /.test(l)) return `<span class="tb-loc">${e}</span>`;
    if (/^----> /.test(l)) return `<span class="tb-flecha">----&gt;</span>${esc(l.slice(5))}`;
    if (ename && l.startsWith(ename + ':')) return `<span class="tb-nombre">${esc(ename)}</span>${esc(l.slice(ename.length))}`;
    return e;
  }
  const AYUDAS = {
    NameError: 'Usas un nombre que el kernel no conoce. ¿Ejecutaste la celda donde se define? En Jupyter las variables existen solo después de ejecutar su celda (y se borran al reiniciar el kernel).',
    KeyError: 'Esa clave o columna no existe. Revisa el nombre exacto con <code>df.columns</code> (mayúsculas, espacios, acentos).',
    FileNotFoundError: 'El archivo no está en esa ruta. Las rutas son relativas a la carpeta del notebook: prueba <code>%ls</code> o <code>%pwd</code>. Los datos del curso están en <code>datos/</code>.',
    ModuleNotFoundError: 'Ese paquete no está instalado en este kernel de práctica. Tienes pandas, numpy, matplotlib y la biblioteca estándar.',
    SyntaxError: 'Python no puede leer la línea marcada: revisa paréntesis, comillas y los dos puntos de <code>if</code>, <code>for</code> y <code>def</code>.',
    IndentationError: 'La sangría no coincide. Usa 4 espacios dentro de cada bloque.',
    TypeError: 'Mezclaste tipos que no van juntos (por ejemplo, texto + número) o llamaste a una función con argumentos de más o de menos.',
    AttributeError: 'Ese objeto no tiene ese método o atributo. Mira qué tipo es con <code>type(x)</code>.',
    ValueError: 'El tipo es correcto pero el valor no sirve (por ejemplo, convertir "abc" a número).',
    ZeroDivisionError: 'Dividiste por cero. Revisa si la lista o la columna está vacía antes de dividir.',
    UsageError: 'Ese comando mágico no existe en este kernel. Escribe <code>%lsmagic</code> para ver los disponibles.',
    KernelDied: 'El código tardó demasiado (¿un bucle infinito?). El kernel volvió a arrancar sin variables.',
  };
  function ayudaError(n) { return AYUDAS[n] ? `<div class="jl-err-ayuda">💡 ${AYUDAS[n]}</div>` : ''; }
  function limpiarHtml(h) {
    const doc = new DOMParser().parseFromString(`<div>${h}</div>`, 'text/html');
    doc.querySelectorAll('script,iframe,object,embed,link,meta,base,form').forEach((x) => x.remove());
    doc.querySelectorAll('*').forEach((x) => { for (const a of [...x.attributes]) if (/^on/i.test(a.name) || (/^(href|src|xlink:href)$/i.test(a.name) && /^\s*javascript:/i.test(a.value))) x.removeAttribute(a.name); });
    return doc.body.firstChild.innerHTML;
  }
  function montarCelda(r, c) {
    const st = NBS[r]; const el = main.querySelector(`.jl-celda[data-id="${c.id}"]`); if (!el) return;
    const ta = el.querySelector('textarea'); if (!ta || !window.CodeMirror) return;
    const ed = window.CodeMirror.fromTextArea(ta, { mode: c.cell_type === 'code' ? 'python' : null, lineNumbers: !!S().numeros, viewportMargin: Infinity, matchBrackets: true, autoCloseBrackets: true, indentUnit: 4, tabSize: 4, lineWrapping: c.cell_type !== 'code', extraKeys: {
      'Shift-Enter': () => { correrYAvanzar(r); }, 'Ctrl-Enter': () => { correr(r, [c.id]); salirEdicion(r); }, 'Cmd-Enter': () => { correr(r, [c.id]); salirEdicion(r); },
      'Alt-Enter': () => { correr(r, [c.id]); insertar(r, 1, true); },
      Esc: () => salirEdicion(r), 'Ctrl-S': () => guardarNb(r, true), 'Cmd-S': () => guardarNb(r, true),
      'Ctrl-/': 'toggleComment', 'Cmd-/': 'toggleComment', Tab: (cm) => (cm.somethingSelected() ? cm.indentSelection('add') : cm.replaceSelection('    ')), 'Shift-Tab': (cm) => cm.indentSelection('subtract'),
      'Ctrl-Shift--': () => dividir(r, c), Up: (cm) => { if (cm.getCursor().line === 0) { mover1(r, -1, true); return; } return window.CodeMirror.Pass; }, Down: (cm) => { if (cm.getCursor().line === cm.lineCount() - 1) { mover1(r, 1, true); return; } return window.CodeMirror.Pass; },
    } });
    ed.on('change', () => { c._src = ed.getValue(); if (!st.sucio) { st.sucio = true; pintarTabs(); } clearTimeout(st._t); st._t = setTimeout(() => guardarNb(r), 1500); });
    ed.on('focus', () => { if (st.sel !== c.id || st.modo !== 'edit') { st.sel = c.id; st.modo = 'edit'; marcar(r); } });
    ed.on('cursorActivity', () => estado());
    st.eds.set(c.id, ed);
  }
  function marcar(r) {
    const st = NBS[r]; if (!st) return;
    main.querySelectorAll('.jl-celda').forEach((x) => { const on = x.dataset.id === st.sel; x.classList.toggle('sel', on); x.classList.toggle('edit', on && st.modo === 'edit'); const tl = x.querySelector('.jl-c-tools'); if (tl) tl.innerHTML = on ? `<button class="jl-ib" data-c="arriba" title="Move this cell up">${ic('arriba', 14)}</button><button class="jl-ib" data-c="abajo" title="Move this cell down">${ic('abajo', 14)}</button><button class="jl-ib" data-c="borrar" title="Delete this cell">${ic('basura', 14)}</button>` : ''; });
    const c = st.nb.cells.find((x) => x.id === st.sel); const tipo = $('#jlTipo'); if (c && tipo) tipo.value = c.cell_type;
    estado();
  }
  function repintarCelda(r, c) {
    const st = NBS[r]; const el = main.querySelector(`.jl-celda[data-id="${c.id}"]`); if (!el) return;
    const ed = st.eds.get(c.id); if (ed) { ed.toTextArea(); st.eds.delete(c.id); }
    const tmp = document.createElement('div'); tmp.innerHTML = celdaHtml(st, c); el.replaceWith(tmp.firstElementChild); montarCelda(r, c);
  }
  function repintarNb(r) { if (activo() === r) { const sc = $('#jlCeldas'); const y = sc ? sc.scrollTop : 0; pintarArea(); const sc2 = $('#jlCeldas'); if (sc2) sc2.scrollTop = y; } pintarTabs(); }
  function salirEdicion(r) {
    const st = NBS[r]; if (!st) return; st.modo = 'command';
    const c = st.nb.cells.find((x) => x.id === st.sel);
    if (c && c.cell_type === 'markdown' && !c._render) { c._render = true; repintarCelda(r, c); }
    const ed = st.eds.get(st.sel); if (ed) ed.getInputField().blur();
    marcar(r); const cs = $('#jlCeldas'); if (cs) cs.focus({ preventScroll: true });
  }
  function entrarEdicion(r) {
    const st = NBS[r]; const c = st.nb.cells.find((x) => x.id === st.sel); if (!c) return;
    st.modo = 'edit';
    if (c.cell_type === 'markdown' && c._render) { c._render = false; repintarCelda(r, c); }
    const ed = st.eds.get(c.id); if (ed) { ed.focus(); ed.setCursor(ed.lineCount(), 0); }
    marcar(r);
  }
  function mover1(r, d, editar) {
    const st = NBS[r]; const i = st.nb.cells.findIndex((x) => x.id === st.sel); const j = i + d;
    if (j < 0 || j >= st.nb.cells.length) return;
    st.sel = st.nb.cells[j].id;
    if (editar) { const ed = st.eds.get(st.sel); if (ed) { ed.focus(); ed.setCursor(d < 0 ? ed.lineCount() : 0, 0); } else { st.modo = 'command'; } }
    marcar(r); visible(st.sel);
  }
  function visible(id) { const el = main.querySelector(`.jl-celda[data-id="${id}"]`); if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' }); }
  function nuevaCelda(tipo = 'code', src = '') { return tipo === 'code' ? { cell_type: 'code', id: nid(), metadata: {}, outputs: [], execution_count: null, _src: src } : { cell_type: tipo, id: nid(), metadata: {}, _src: src, _render: false }; }
  function insertar(r, d, editar) {
    const st = NBS[r]; const i = st.nb.cells.findIndex((x) => x.id === st.sel);
    const c = nuevaCelda(); st.nb.cells.splice(i < 0 ? st.nb.cells.length : i + (d > 0 ? 1 : 0), 0, c);
    st.sel = c.id; st.modo = editar ? 'edit' : 'command'; st.sucio = true; repintarNb(r); visible(c.id); guardarNb(r);
  }
  function borrarCelda(r) {
    const st = NBS[r]; const i = st.nb.cells.findIndex((x) => x.id === st.sel); if (i < 0) return;
    st.borradas = st.borradas || []; st.borradas.push({ c: st.nb.cells[i], i });
    st.nb.cells.splice(i, 1); if (!st.nb.cells.length) st.nb.cells.push(nuevaCelda());
    st.sel = st.nb.cells[Math.min(i, st.nb.cells.length - 1)].id; st.modo = 'command'; repintarNb(r); guardarNb(r);
  }
  function deshacerBorrado(r) { const st = NBS[r]; const b = (st.borradas || []).pop(); if (!b) return; st.nb.cells.splice(b.i, 0, b.c); st.sel = b.c.id; repintarNb(r); guardarNb(r); }
  function cambiarTipo(r, tipo) {
    const st = NBS[r]; const i = st.nb.cells.findIndex((x) => x.id === st.sel); if (i < 0) return; const c = st.nb.cells[i];
    if (c.cell_type === tipo) return;
    const n = nuevaCelda(tipo, c._src); n.id = c.id; if (tipo === 'markdown') n._render = st.modo !== 'edit' && !!(c._src || '').trim();
    st.nb.cells[i] = n; repintarCelda(r, n); marcar(r); guardarNb(r);
  }
  function moverCelda(r, d) { const st = NBS[r]; const i = st.nb.cells.findIndex((x) => x.id === st.sel); const j = i + d; if (i < 0 || j < 0 || j >= st.nb.cells.length) return; const [c] = st.nb.cells.splice(i, 1); st.nb.cells.splice(j, 0, c); repintarNb(r); guardarNb(r); }
  function dividir(r, c) {
    const st = NBS[r]; const ed = st.eds.get(c.id); if (!ed) return; const pos = ed.indexFromPos(ed.getCursor());
    const a = c._src.slice(0, pos).replace(/\n$/, ''), b = c._src.slice(pos).replace(/^\n/, '');
    c._src = a; const n = nuevaCelda(c.cell_type, b); const i = st.nb.cells.indexOf(c); st.nb.cells.splice(i + 1, 0, n); st.sel = n.id; st.modo = 'edit'; repintarNb(r); guardarNb(r);
  }
  function portapapeles(r, accion) {
    const st = NBS[r]; const i = st.nb.cells.findIndex((x) => x.id === st.sel);
    if (accion === 'pegar') { if (!PORTA) return; const c = JSON.parse(JSON.stringify(PORTA)); c.id = nid(); st.nb.cells.splice(i + 1, 0, c); st.sel = c.id; repintarNb(r); guardarNb(r); return; }
    if (i < 0) return; PORTA = JSON.parse(JSON.stringify(st.nb.cells[i])); if (accion === 'cortar') borrarCelda(r);
  }
  let PORTA = null;

  // ---------------------------------------------------------------- ejecutar
  function archivosParaKernel() { const out = {}; const t = todos(); for (const [r, f] of Object.entries(t)) if (!/\.ipynb$/.test(r) && f.t != null && f.t.length < 3000000) out[r] = f.t; return out; }
  const cola = []; let corriendo = false;
  // al fallar una celda (o al interrumpir/reiniciar) las que esperaban no se ejecutan: vuelven a [ ]
  function vaciarCola() { for (const { r, c } of cola.splice(0)) { c._corriendo = false; actualizarPrompt(r, c); } }
  function correr(r, ids) { const st = NBS[r]; for (const id of ids) { const c = st.nb.cells.find((x) => x.id === id); if (!c) continue; if (c.cell_type === 'markdown') { c._render = true; repintarCelda(r, c); continue; } if (c.cell_type !== 'code') continue; c._corriendo = true; actualizarPrompt(r, c); cola.push({ r, c }); } bombear(); }
  async function bombear() {
    if (corriendo) return; corriendo = true;
    try {
      while (cola.length) {
        const { r, c } = cola.shift();
        const st = NBS[r]; if (!st) continue;
        const code = c._src || '';
        if (!code.trim()) { c._corriendo = false; c.outputs = []; actualizarPrompt(r, c); continue; }
        let res;
        try { res = await K().ejecutar(code, { archivos: archivosParaKernel(), carpetas: S().carpetas }); } catch (e) { res = { outputs: [{ output_type: 'error', ename: 'KernelError', evalue: String(e.message || e), traceback: ['No se pudo iniciar el kernel: ' + (e.message || e), 'Revisa tu conexión a internet (Python se descarga la primera vez) y vuelve a intentar.'] }], n: null }; }
        if (res.murio) toast('El kernel se reinició: las variables anteriores se perdieron.');
        c._corriendo = false; c.outputs = res.outputs; c.execution_count = res.n;
        if (res.fs) aplicarFs(res.fs);
        registrar(code, res);
        if (NBS[r] === st) { if (activo() === r) repintarCelda(r, c); st.sucio = true; guardarNb(r); }
        if (res.outputs.some((o) => o.output_type === 'error')) vaciarCola();
      }
    } finally { corriendo = false; estado(); }
  }
  function actualizarPrompt(r, c) { if (activo() !== r) return; const el = main.querySelector(`.jl-celda[data-id="${c.id}"] .jl-in .jl-prompt`); if (el) el.textContent = prompt(c); }
  function correrYAvanzar(r) {
    const st = NBS[r]; const i = st.nb.cells.findIndex((x) => x.id === st.sel); if (i < 0) return;
    const editando = st.modo === 'edit';
    correr(r, [st.sel]);
    if (i === st.nb.cells.length - 1) insertar(r, 1, true);
    else { st.sel = st.nb.cells[i + 1].id; if (editando && st.nb.cells[i + 1].cell_type !== 'markdown') { st.modo = 'edit'; const ed = st.eds.get(st.sel); if (ed) ed.focus(); } else salirEdicion(r); marcar(r); visible(st.sel); }
  }
  function correrTodo(r, hasta) { const st = NBS[r]; const ids = st.nb.cells.map((c) => c.id); const k = hasta ? ids.indexOf(st.sel) : ids.length; correr(r, ids.slice(0, k)); }
  async function reiniciarKernel(r, { limpiar = false, todo = false } = {}) {
    vaciarCola();
    await K().reiniciar(); evento(todo ? 'reiniciarTodo' : 'reiniciar');
    for (const st of Object.values(NBS)) for (const c of st.nb.cells) if (c.cell_type === 'code') { c.execution_count = null; if (limpiar) c.outputs = []; }
    toast('Kernel restarted'); if (r) repintarNb(r);
    if (todo && r) correrTodo(r);
  }
  function aplicarFs(fs) {
    const j = S(); let cambio = false;
    for (const [rel, v] of Object.entries(fs.cambios || {})) {
      if (/\.ipynb$/.test(rel)) continue;
      if (v.t != null) { if (datos()[rel] !== v.t || j.archivos[rel]) { if (v.t.length > 400000) { SESION[rel] = v; delete j.archivos[rel]; } else j.archivos[rel] = { t: v.t, m: Date.now() }; cambio = true; } } else { SESION[rel] = v; cambio = true; }
    }
    for (const rel of fs.borrados || []) { if (j.archivos[rel]) { delete j.archivos[rel]; cambio = true; } delete SESION[rel]; }
    for (const d of fs.dirs || []) if (!j.carpetas.includes(d)) { j.carpetas.push(d); cambio = true; }
    if (cambio) { guardar(); if (panel === 'archivos') pintarPanel(); }
  }
  const SESION = {}; // archivos grandes o binarios que solo existen en el kernel de esta sesión
  function registrar(code, res) {
    const j = S(); const tipos = res.outputs.map((o) => (o.output_type === 'error' ? 'error:' + o.ename : o.output_type === 'stream' ? 'stream' : o.data && o.data['image/png'] ? 'imagen' : o.data && o.data['text/html'] ? 'html' : 'texto'));
    j.hist.push({ code: code.slice(0, 2000), tipos, t: Date.now() }); if (j.hist.length > 80) j.hist.splice(0, j.hist.length - 80); guardar();
  }

  // ---------------------------------------------------------------- otros editores
  const EDS = {};
  function editorTexto(el, r) {
    const t = tipoDe(r); const ro = todos()[r] && todos()[r].base;
    el.innerHTML = `<div class="jl-txt"><div class="jl-nb-bar">${t === 'md' ? `<button class="jl-btn" data-a="md-preview">Show Markdown Preview</button>` : ''}${t === 'py' ? `<button class="jl-btn" data-a="py-run" title="Ejecuta el archivo en el kernel con %run">Run in kernel (%run)</button>` : ''}<span class="jl-sp"></span>${ro ? '<span class="jl-dim">Dato del curso: si lo editas y guardas, se guarda tu copia.</span>' : ''}</div><div class="jl-txt-ed" id="jlTxt"></div><div class="jl-md-prev" id="jlMdPrev" hidden></div></div>`;
    const ed = window.CodeMirror($('#jlTxt'), { value: texto(r) || '', mode: t === 'py' ? 'python' : t === 'md' ? null : null, lineNumbers: true, indentUnit: 4, tabSize: 4, matchBrackets: true, autoCloseBrackets: true, extraKeys: { 'Ctrl-S': () => guardarTexto(r, true), 'Cmd-S': () => guardarTexto(r, true), Tab: (cm) => cm.replaceSelection('    ') } });
    EDS[r] = { ed, sucio: false };
    ed.on('change', () => { if (!EDS[r].sucio) { EDS[r].sucio = true; pintarTabs(); } });
    ed.on('cursorActivity', () => estado());
    setTimeout(() => { ed.refresh(); ed.focus(); }, 0);
  }
  function guardarTexto(r, aviso) { const e = EDS[r]; if (!e) return; escribir(r, e.ed.getValue()); e.sucio = false; pintarTabs(); if (aviso) toast('Guardado ' + base(r)); }
  function csvVista(el, r) {
    const txt = texto(r) || ''; const filas = parseCsv(txt, 501); const cab = filas.shift() || [];
    const total = Math.max(0, txt.split('\n').filter(Boolean).length - 1);
    el.innerHTML = `<div class="jl-csv"><div class="jl-nb-bar"><span class="jl-dim">Delimiter:</span> <b>,</b><span class="jl-sp"></span><span class="jl-dim">${total.toLocaleString('es')} filas${total > 500 ? ' · se muestran las primeras 500' : ''}</span></div><div class="jl-csv-grid"><table><thead><tr><th></th>${cab.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${filas.map((f, i) => `<tr><th>${i + 1}</th>${cab.map((_, k) => `<td>${esc(f[k] ?? '')}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>`;
  }
  function parseCsv(t, max) {
    const out = []; let fila = [], campo = '', q = false;
    for (let i = 0; i < t.length && out.length < max; i++) {
      const ch = t[i];
      if (q) { if (ch === '"') { if (t[i + 1] === '"') { campo += '"'; i++; } else q = false; } else campo += ch; continue; }
      if (ch === '"') q = true; else if (ch === ',') { fila.push(campo); campo = ''; } else if (ch === '\n') { fila.push(campo); out.push(fila); fila = []; campo = ''; } else if (ch !== '\r') campo += ch;
    }
    if (campo || fila.length) { fila.push(campo); out.push(fila); }
    return out;
  }

  // ---------------------------------------------------------------- Markdown (subconjunto)
  function mdHtml(t) {
    const ls = String(t).split('\n'); let html = '', lista = null, enCod = false, cod = [];
    const inl = (s) => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<i>$2</i>').replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, a, h) => (/^\s*javascript:/i.test(h) ? a : `<a href="${h.replace(/"/g, '')}" target="_blank" rel="noopener">${a}</a>`)).replace(/\$([^$\n]+)\$/g, '<span class="jl-math">$1</span>');
    const cerrar = () => { if (lista) { html += `</${lista}>`; lista = null; } };
    for (let i = 0; i < ls.length; i++) {
      const l = ls[i]; let m;
      if (/^```/.test(l)) { if (enCod) { html += `<pre><code>${esc(cod.join('\n'))}</code></pre>`; cod = []; enCod = false; } else { cerrar(); enCod = true; } continue; }
      if (enCod) { cod.push(l); continue; }
      if ((m = /^(#{1,6})\s+(.*)$/.exec(l))) { cerrar(); html += `<h${m[1].length}>${inl(m[2])}</h${m[1].length}>`; continue; }
      if ((m = /^\s*[-*+]\s+(.*)$/.exec(l))) { if (lista !== 'ul') { cerrar(); html += '<ul>'; lista = 'ul'; } html += `<li>${inl(m[1])}</li>`; continue; }
      if ((m = /^\s*\d+[.)]\s+(.*)$/.exec(l))) { if (lista !== 'ol') { cerrar(); html += '<ol>'; lista = 'ol'; } html += `<li>${inl(m[1])}</li>`; continue; }
      if (/^\|.*\|$/.test(l.trim())) { cerrar(); const fs = []; while (i < ls.length && /^\|.*\|$/.test(ls[i].trim())) fs.push(ls[i++].trim()); i--; const cs = (f) => f.slice(1, -1).split('|').map((x) => x.trim()); html += `<table><thead><tr>${cs(fs[0]).map((c) => `<th>${inl(c)}</th>`).join('')}</tr></thead><tbody>${fs.slice(2).map((f) => `<tr>${cs(f).map((c) => `<td>${inl(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`; continue; }
      if (/^>\s?/.test(l)) { cerrar(); html += `<blockquote>${inl(l.replace(/^>\s?/, ''))}</blockquote>`; continue; }
      if (/^(---+|\*\*\*+)$/.test(l.trim())) { cerrar(); html += '<hr>'; continue; }
      if (!l.trim()) { cerrar(); continue; }
      cerrar(); html += `<p>${inl(l)}</p>`;
    }
    cerrar(); if (enCod) html += `<pre><code>${esc(cod.join('\n'))}</code></pre>`;
    return html;
  }

  // ---------------------------------------------------------------- barra de estado
  function estado() {
    const el = $('#jlStatus'); if (!el) return; const r = activo(); const st = NBS[r];
    const k = K(); const kEst = { idle: 'Idle', busy: 'Busy', starting: 'Starting', restarting: 'Restarting', dead: 'Dead' }[k.estado] || 'Idle';
    let pos = '';
    const ed = st ? st.eds.get(st.sel) : EDS[r] && EDS[r].ed;
    if (ed && (!st || st.modo === 'edit')) { const c = ed.getCursor(); pos = `Ln ${c.line + 1}, Col ${c.ch + 1}`; }
    el.innerHTML = `<span class="jl-st-i">Simple</span>${tipoDe(r) === 'nb' ? `<span class="jl-st-i">Python 3 (ipykernel) | ${kEst}</span>` : ''}<span class="jl-sp"></span>${st ? `<span class="jl-st-i">Mode: ${st.modo === 'edit' ? 'Edit' : 'Command'}</span>` : ''}${pos ? `<span class="jl-st-i">${pos}</span>` : ''}<span class="jl-st-i">${esc(r === LAUNCHER ? 'Launcher' : base(r))}</span>`;
    const dot = $('#jlKdot'); if (dot) { dot.classList.toggle('busy', k.estado === 'busy' || k.estado === 'starting' || k.estado === 'restarting'); dot.title = 'Kernel status: ' + kEst; }
  }

  // ---------------------------------------------------------------- acciones
  function nuevo(ext) {
    const cwd = S().cwd || '';
    const r = ext === '.ipynb' ? nombreLibre(cwd, 'Untitled', '.ipynb') : nombreLibre(cwd, ext === '.md' ? 'untitled' : ext === '.py' ? 'untitled' : 'untitled', ext);
    escribir(r, ext === '.ipynb' ? serializar(nbVacio()) : '');
    if (ext === '.ipynb') { evento('nuevoNb'); const st = abrirNb(r); st.modo = 'edit'; }
    const j = S(); if (j.activo === LAUNCHER) { j.tabs = j.tabs.filter((t) => t !== LAUNCHER); }
    abrir(r);
  }
  async function subir(files) {
    const cwd = S().cwd || '';
    for (const f of files) {
      if (f.size > 1500000) { toast(`${f.name}: el archivo es muy grande para este JupyterLab de práctica (máx. 1,5 MB).`); continue; }
      const t = await f.text(); escribir((cwd ? cwd + '/' : '') + f.name, t);
    }
    pintarPanel(); toast('Archivo subido');
  }
  function descargar(r) {
    const t = r && NBS[r] ? serializar(NBS[r].nb) : texto(r); if (t == null) return;
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([t], { type: 'application/octet-stream' })); a.download = base(r); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    evento('descarga');
  }
  function modal(titulo, valor, ok) {
    const m = $('#jlModal'); m.hidden = false;
    m.innerHTML = `<div class="jl-dlg"><h3>${esc(titulo)}</h3><input id="jlDlgIn" value="${esc(valor)}" spellcheck="false"><div class="jl-dlg-b"><button class="jl-btn" id="jlDlgNo">Cancel</button><button class="jl-btn pri" id="jlDlgOk">${titulo.startsWith('Delete') ? 'Delete' : 'Rename'}</button></div></div>`;
    const inp = m.querySelector('#jlDlgIn'); const fin = (v) => { m.hidden = true; m.innerHTML = ''; if (v != null) ok(v); };
    m.querySelector('#jlDlgNo').onclick = () => fin(null); m.querySelector('#jlDlgOk').onclick = () => fin(inp.value.trim());
    inp.onkeydown = (e) => { if (e.key === 'Enter') fin(inp.value.trim()); if (e.key === 'Escape') fin(null); e.stopPropagation(); };
    setTimeout(() => { inp.focus(); const p = inp.value.lastIndexOf('.'); inp.setSelectionRange(0, p > 0 ? p : inp.value.length); }, 0);
  }
  function confirmar(titulo, texto2, ok) {
    const m = $('#jlModal'); m.hidden = false;
    m.innerHTML = `<div class="jl-dlg"><h3>${esc(titulo)}</h3><p>${texto2}</p><div class="jl-dlg-b"><button class="jl-btn" id="jlDlgNo">Cancel</button><button class="jl-btn pri peligro" id="jlDlgOk">${esc(titulo.split(' ')[0])}</button></div></div>`;
    const fin = (v) => { m.hidden = true; m.innerHTML = ''; if (v) ok(); };
    m.querySelector('#jlDlgNo').onclick = () => fin(false); m.querySelector('#jlDlgOk').onclick = () => fin(true); m.querySelector('#jlDlgOk').focus();
  }
  function renombrar(r) {
    modal('Rename File', base(r), (n) => {
      if (!n || n === base(r)) return; const nuevoR = (dir(r) ? dir(r) + '/' : '') + n; const j = S();
      if (todos()[nuevoR]) { toast('Ya existe un archivo con ese nombre'); return; }
      const t = NBS[r] ? serializar(NBS[r].nb) : texto(r); j.archivos[nuevoR] = { t, m: Date.now() }; if (j.archivos[r]) delete j.archivos[r];
      if (NBS[r]) { NBS[nuevoR] = NBS[r]; delete NBS[r]; }
      j.tabs = j.tabs.map((x) => (x === r ? nuevoR : x)); if (j.activo === r) j.activo = nuevoR; guardar();
      if (K().listo && !NBS[nuevoR]) K().ejecutar(null, { borrar: [r] }).catch(() => {});
      evento('renombrar'); pintarPanel(); pintarTabs(); pintarArea(); estado();
    });
  }
  function borrar(r, esDir) {
    const t = todos();
    if (!esDir && t[r] && t[r].base && !S().archivos[r]) { toast('Es un dato del curso: no se puede borrar (sí puedes crear tus propias copias).'); return; }
    confirmar(esDir ? 'Delete folder' : 'Delete file', `Are you sure you want to permanently delete: <b>${esc(base(r))}</b>?`, () => {
      const j = S();
      if (esDir) { for (const k of Object.keys(j.archivos)) if (k.startsWith(r + '/')) delete j.archivos[k]; j.carpetas = j.carpetas.filter((c) => c !== r && !c.startsWith(r + '/')); pendienteBorrar.push(r); }
      else { delete j.archivos[r]; pendienteBorrar.push(r); if (j.tabs.includes(r)) cerrar(r); }
      guardar(); if (K().listo) K().ejecutar(null, { borrar: [...pendienteBorrar] }).catch(() => {}); pendienteBorrar = []; pintarPanel();
    });
  }
  let pendienteBorrar = [];

  function menuPop(x, y, items) {
    const p = $('#jlPop'); p.hidden = false;
    p.innerHTML = items.map((it) => (it === '-' ? '<hr>' : `<button data-pop="${it[0]}"${it[3] ? ' disabled' : ''}><span>${esc(it[1])}</span><kbd>${esc(it[2] || '')}</kbd></button>`)).join('');
    const rr = main.querySelector('#jlp').getBoundingClientRect();
    p.style.left = Math.min(x - rr.left, rr.width - 260) + 'px'; p.style.top = (y - rr.top) + 'px';
    p._items = items;
  }
  function cerrarPop() { const p = $('#jlPop'); if (p) { p.hidden = true; p.innerHTML = ''; } }
  const MENUS = {
    File: [['nuevo-nb', 'New Notebook'], ['nuevo-txt', 'New Text File'], ['nuevo-md', 'New Markdown File'], ['nuevo-py', 'New Python File'], ['nuevo-launcher', 'New Launcher', 'Ctrl+Shift+L'], '-', ['guardar', 'Save', 'Ctrl+S'], ['renombrar-activo', 'Rename…'], ['descargar-activo', 'Download'], '-', ['cerrar-activo', 'Close Tab', 'Alt+W'], ['cerrar-todo', 'Close All Tabs'], '-', ['salir', 'Volver al curso']],
    Edit: [['deshacer-borrado', 'Undo Cell Operation', 'Z'], '-', ['cortar', 'Cut Cell', 'X'], ['copiar', 'Copy Cell', 'C'], ['pegar', 'Paste Cell Below', 'V'], ['borrar-celda', 'Delete Cell', 'D, D'], '-', ['limpiar-salida', 'Clear Cell Output'], ['limpiar-todo', 'Clear Outputs of All Cells']],
    View: [['numeros', 'Show Line Numbers', 'Shift+L'], ['panel-izq', 'Show Left Sidebar', 'Ctrl+B'], ['ver-toc', 'Table of Contents']],
    Run: [['correr', 'Run Selected Cell', 'Shift+Enter'], ['correr-quedar', 'Run Selected Cell and Do not Advance', 'Ctrl+Enter'], ['correr-insertar', 'Run Selected Cell and Insert Below', 'Alt+Enter'], '-', ['correr-arriba', 'Run All Above Selected Cell'], ['correr-todo', 'Run All Cells'], ['reiniciar-todo', 'Restart Kernel and Run All Cells…']],
    Kernel: [['parar', 'Interrupt Kernel', 'I, I'], ['reiniciar', 'Restart Kernel…', '0, 0'], ['reiniciar-limpiar', 'Restart Kernel and Clear Outputs of All Cells…'], ['reiniciar-todo', 'Restart Kernel and Run All Cells…'], '-', ['apagar', 'Shut Down All Kernels…']],
    Tabs: [], Settings: [['tema-light', 'Theme: JupyterLab Light'], ['tema-dark', 'Theme: JupyterLab Dark'], ['tema-system', 'Theme: Synchronize with System Settings'], '-', ['numeros', 'Show Line Numbers'], ['atajos', 'Settings Editor (atajos)']], Help: [['atajos', 'Show Keyboard Shortcuts'], ['leccion', 'Lección: JupyterLab por dentro'], ['acerca', 'About JupyterLab de práctica']],
  };
  function accion(a, extra) {
    const r = activo(); const st = NBS[r];
    const enNb = (f) => { if (st) f(); else toast('Abre un notebook primero'); };
    switch (a) {
      case 'nuevo-nb': return nuevo('.ipynb');
      case 'nuevo-txt': return nuevo('.txt');
      case 'nuevo-md': return nuevo('.md');
      case 'nuevo-py': return nuevo('.py');
      case 'nuevo-launcher': return abrir(LAUNCHER);
      case 'guardar': if (st) guardarNb(r, true); else if (EDS[r]) guardarTexto(r, true); return;
      case 'renombrar-activo': if (r !== LAUNCHER) renombrar(r); return;
      case 'descargar-activo': if (r !== LAUNCHER) descargar(r); return;
      case 'cerrar-activo': return cerrar(r);
      case 'cerrar-todo': { const j = S(); j.tabs.slice().forEach((t) => cerrar(t)); return; }
      case 'salir': location.hash = '#/herramientas'; return;
      case 'deshacer-borrado': return enNb(() => deshacerBorrado(r));
      case 'cortar': return enNb(() => portapapeles(r, 'cortar'));
      case 'copiar': return enNb(() => portapapeles(r, 'copiar'));
      case 'pegar': return enNb(() => portapapeles(r, 'pegar'));
      case 'borrar-celda': return enNb(() => borrarCelda(r));
      case 'limpiar-salida': return enNb(() => { const c = st.nb.cells.find((x) => x.id === st.sel); if (c && c.outputs) { c.outputs = []; c.execution_count = null; repintarCelda(r, c); guardarNb(r); } });
      case 'limpiar-todo': return enNb(() => { st.nb.cells.forEach((c) => { if (c.outputs) { c.outputs = []; c.execution_count = null; } }); repintarNb(r); guardarNb(r); });
      case 'numeros': S().numeros = !S().numeros; guardar(); pintarArea(); return;
      case 'panel-izq': $('#jlPanel').classList.toggle('oculto'); return;
      case 'ver-toc': panel = 'toc'; pintarPanel(); return;
      case 'correr': return enNb(() => correrYAvanzar(r));
      case 'correr-quedar': return enNb(() => correr(r, [st.sel]));
      case 'correr-insertar': return enNb(() => { correr(r, [st.sel]); insertar(r, 1, true); });
      case 'correr-arriba': return enNb(() => correrTodo(r, true));
      case 'correr-todo': return enNb(() => { evento('correrTodo'); correrTodo(r); });
      case 'parar': toast(cola.length || corriendo ? 'Se cancelaron las celdas en espera. Una celda que ya está corriendo no se puede interrumpir en el navegador: si es un bucle infinito, el kernel se reinicia solo a los 2 minutos.' : 'El kernel no está ejecutando nada.'); vaciarCola(); return;
      case 'reiniciar': return confirmar('Restart Kernel?', 'Do you want to restart the current kernel? All variables will be lost.', () => reiniciarKernel(st ? r : null));
      case 'reiniciar-limpiar': return confirmar('Restart Kernel?', 'Do you want to restart the kernel and clear all output? All variables will be lost.', () => reiniciarKernel(st ? r : null, { limpiar: true }));
      case 'reiniciar-todo': return enNb(() => confirmar('Restart Kernel?', 'Do you want to restart the current kernel and re-execute the whole notebook? All variables and outputs will be lost.', () => reiniciarKernel(r, { limpiar: true, todo: true })));
      case 'apagar': vaciarCola(); K().reiniciar().then(() => { toast('Kernel apagado (las variables se borraron)'); pintarPanel(); }); return;
      case 'tema-light': case 'tema-dark': case 'tema-system': S().tema = a.slice(5); guardar(); aplicarTema(); return;
      case 'atajos': return atajos();
      case 'leccion': location.hash = '#/l/interfaces-jupyterlab-por-dentro'; return;
      case 'acerca': toast('JupyterLab de práctica: una réplica para aprender, con Python en tu navegador. No es el producto oficial del Proyecto Jupyter.'); return;
      case 'md-preview': { const p = $('#jlMdPrev'); const ed = EDS[r] && EDS[r].ed; if (!p || !ed) return; p.hidden = !p.hidden; p.innerHTML = p.hidden ? '' : mdHtml(ed.getValue()); return; }
      case 'py-run': { guardarTexto(r); const nbAbierto = S().tabs.find((t) => tipoDe(t) === 'nb'); K().ejecutar(`%run ${JSON.stringify(r)}`, { archivos: archivosParaKernel() }).then((res) => { const txt = res.outputs.map((o) => o.output_type === 'error' ? (o.traceback || []).join('\n') : fuente(o.text || (o.data && o.data['text/plain']) || '')).join('\n'); toast(txt.trim() ? txt.trim().slice(0, 300) : `Se ejecutó ${base(r)}: sus variables ya están en el kernel${nbAbierto ? ' (úsalas desde el notebook)' : ''}.`); }); return; }
      case 'kernel': toast('Este JupyterLab de práctica tiene un solo kernel: Python 3 (ipykernel), con Pyodide.'); return;
      default: return extra && extra();
    }
  }
  function atajos() {
    const m = $('#jlModal'); m.hidden = false;
    const fila = (k, d) => `<tr><td><kbd>${k}</kbd></td><td>${d}</td></tr>`;
    m.innerHTML = `<div class="jl-dlg ancho"><h3>Keyboard Shortcuts</h3><div class="jl-atajos"><table><tr><th colspan="2">Command mode (Esc)</th></tr>${fila('Enter', 'Edit the cell')}${fila('Shift+Enter', 'Run cell, select below')}${fila('Ctrl+Enter', 'Run cell')}${fila('Alt+Enter', 'Run cell, insert below')}${fila('A / B', 'Insert cell above / below')}${fila('D, D', 'Delete cell')}${fila('Z', 'Undo cell deletion')}${fila('M / Y / R', 'Markdown / Code / Raw')}${fila('X / C / V', 'Cut / Copy / Paste cell')}${fila('↑ / K, ↓ / J', 'Select cell above / below')}${fila('0, 0', 'Restart kernel')}${fila('Shift+L', 'Toggle line numbers')}${fila('Ctrl+S', 'Save')}</table><table><tr><th colspan="2">Edit mode (Enter)</th></tr>${fila('Esc', 'Command mode')}${fila('Tab', 'Indent')}${fila('Shift+Tab', 'Dedent')}${fila('Ctrl+/', 'Toggle comment')}${fila('Ctrl+Shift+-', 'Split cell at cursor')}${fila('Shift+Enter', 'Run cell, select below')}</table></div><div class="jl-dlg-b"><button class="jl-btn pri" id="jlDlgNo">Close</button></div></div>`;
    m.querySelector('#jlDlgNo').onclick = () => { m.hidden = true; m.innerHTML = ''; };
  }

  function clic(e) {
    const t = e.target;
    const pop = t.closest('[data-pop]'); if (pop) { const a = pop.dataset.pop; const p = $('#jlPop'); const ctxR = p._ctx; cerrarPop(); if (a.startsWith('tab:')) return abrir(a.slice(4)); if (a.startsWith('ctx-')) return accionCtx(a, ctxR); return accion(a); }
    if (!t.closest('#jlPop') && !t.closest('[data-menu]')) cerrarPop();
    const menu = t.closest('[data-menu]'); if (menu) { const rr = menu.getBoundingClientRect(); const items = menu.dataset.menu === 'Tabs' ? S().tabs.map((x) => ['tab:' + x, x === LAUNCHER ? 'Launcher' : base(x)]) : MENUS[menu.dataset.menu]; menuPop(rr.left, rr.bottom, items); return; }
    const sb = t.closest('[data-panel]'); if (sb) { const p = $('#jlPanel'); if (panel === sb.dataset.panel && !p.classList.contains('oculto')) p.classList.add('oculto'); else { p.classList.remove('oculto'); panel = sb.dataset.panel; pintarPanel(); } return; }
    const cer = t.closest('[data-cerrar]'); if (cer) { e.stopPropagation(); return cerrar(cer.dataset.cerrar); }
    const tab = t.closest('[data-tab]'); if (tab) { const j = S(); j.activo = tab.dataset.tab; guardar(); pintarTabs(); pintarArea(); pintarPanel(); estado(); return; }
    const a = t.closest('[data-a]'); if (a) return accion(a.dataset.a);
    const cd = t.closest('[data-cd]'); if (cd) { S().cwd = cd.dataset.cd; guardar(); pintarPanel(); return; }
    const fi = t.closest('.jl-fb-i'); if (fi) { main.querySelectorAll('.jl-fb-i').forEach((x) => x.classList.toggle('sel', x === fi)); return; }
    const ir = t.closest('[data-ir]'); if (ir) { const st = NBS[activo()]; if (st) { st.sel = ir.dataset.ir; marcar(activo()); visible(st.sel); } return; }
    const run = t.closest('.jl-run-i[data-file]'); if (run) return abrir(run.dataset.file);
    const nb = t.closest('.jl-nb'); if (!nb) return;
    const r = nb.dataset.nb; const st = NBS[r];
    const na = t.closest('[data-nb-a]'); if (na) {
      const m = { guardar: 'guardar', insertar: null, cortar: 'cortar', copiar: 'copiar', pegar: 'pegar', correr: 'correr', parar: 'parar', reiniciar: 'reiniciar', 'reiniciar-todo': 'reiniciar-todo', kernel: 'kernel' }[na.dataset.nbA];
      if (na.dataset.nbA === 'insertar') return insertar(r, 1, false);
      if (na.dataset.nbA === 'agregar-fin') { st.sel = st.nb.cells[st.nb.cells.length - 1].id; return insertar(r, 1, true); }
      return accion(m);
    }
    const cc = t.closest('[data-c]'); if (cc) { if (cc.dataset.c === 'arriba') moverCelda(r, -1); else if (cc.dataset.c === 'abajo') moverCelda(r, 1); else borrarCelda(r); return; }
    const celda = t.closest('.jl-celda'); if (celda) {
      const enEditor = t.closest('.CodeMirror');
      if (st.sel !== celda.dataset.id || (!enEditor && st.modo === 'edit')) { if (!enEditor && st.modo === 'edit') { const ed0 = st.eds.get(st.sel); if (ed0) ed0.getInputField().blur(); const c0 = st.nb.cells.find((x) => x.id === st.sel); st.sel = celda.dataset.id; st.modo = 'command'; if (c0 && c0.cell_type === 'markdown' && !c0._render && (c0._src || '').trim()) { c0._render = true; repintarCelda(r, c0); } } else st.sel = celda.dataset.id; marcar(r); }
      if (!enEditor) $('#jlCeldas').focus({ preventScroll: true });
    }
  }
  function dobleClic(e) {
    const t = e.target;
    const f = t.closest('.jl-fb-i[data-file]'); if (f) return abrir(f.dataset.file);
    const d = t.closest('.jl-fb-i[data-dir]'); if (d) { S().cwd = d.dataset.dir; guardar(); pintarPanel(); return; }
    const md = t.closest('.jl-md'); if (md) { const r = activo(); const st = NBS[r]; const c = st && st.nb.cells.find((x) => x.id === md.closest('.jl-celda').dataset.id); if (c) { st.sel = c.id; entrarEdicion(r); } }
  }
  function menuContexto(e) {
    const f = e.target.closest('.jl-fb-i'); if (!f) return;
    e.preventDefault(); const r = f.dataset.file || f.dataset.dir; const esDir = !!f.dataset.dir;
    menuPop(e.clientX, e.clientY, esDir ? [['ctx-abrir', 'Open'], ['ctx-borrar', 'Delete']] : [['ctx-abrir', 'Open'], ['ctx-renombrar', 'Rename'], ['ctx-borrar', 'Delete'], ['ctx-duplicar', 'Duplicate'], ['ctx-descargar', 'Download'], ['ctx-ruta', 'Copy Path']]);
    $('#jlPop')._ctx = { r, esDir };
  }
  function accionCtx(a, ctx) {
    if (!ctx) return; const { r, esDir } = ctx;
    if (a === 'ctx-abrir') { if (esDir) { S().cwd = r; guardar(); pintarPanel(); } else abrir(r); return; }
    if (a === 'ctx-renombrar') return renombrar(r);
    if (a === 'ctx-borrar') return borrar(r, esDir);
    if (a === 'ctx-descargar') return descargar(r);
    if (a === 'ctx-ruta') { try { navigator.clipboard.writeText(r); toast('Ruta copiada: ' + r); } catch (er) { toast(r); } return; }
    if (a === 'ctx-duplicar') { const p = r.lastIndexOf('.'); const raiz = base(p > 0 ? r.slice(0, p) : r) + '-Copy'; const ext = p > 0 ? r.slice(p) : ''; const n = nombreLibre(dir(r), raiz, ext); escribir(n, NBS[r] ? serializar(NBS[r].nb) : texto(r) || ''); pintarPanel(); }
  }
  let ultD = 0, ultCero = 0, ultI = 0;
  function teclas(e) {
    if (!document.getElementById('jlp')) { document.removeEventListener('keydown', teclas); return; }
    if (!$('#jlModal').hidden) return;
    const r = activo(); const st = NBS[r];
    const enEditor = e.target.closest && (e.target.closest('.CodeMirror') || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName));
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); return accion('guardar'); }
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'l') { e.preventDefault(); return accion('nuevo-launcher'); }
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'b' && !enEditor) { e.preventDefault(); return accion('panel-izq'); }
    if (e.altKey && e.key.toLowerCase() === 'w') { e.preventDefault(); return accion('cerrar-activo'); }
    if (e.key === 'Escape') cerrarPop();
    if (!st || enEditor || st.modo === 'edit') return;
    if (!e.target.closest || !e.target.closest('#jlp')) return;
    const k = e.key; const ahora = Date.now();
    const hecho = () => { e.preventDefault(); e.stopPropagation(); };
    if (k === 'Enter' && e.shiftKey) { hecho(); return correrYAvanzar(r); }
    if (k === 'Enter' && (e.ctrlKey || e.metaKey)) { hecho(); return correr(r, [st.sel]); }
    if (k === 'Enter' && e.altKey) { hecho(); correr(r, [st.sel]); return insertar(r, 1, true); }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (k === 'Enter') { hecho(); return entrarEdicion(r); }
    if (k === 'ArrowUp' || k === 'k') { hecho(); return mover1(r, -1); }
    if (k === 'ArrowDown' || k === 'j') { hecho(); return mover1(r, 1); }
    if (k === 'a') { hecho(); return insertar(r, -1, false); }
    if (k === 'b') { hecho(); return insertar(r, 1, false); }
    if (k === 'm') { hecho(); return cambiarTipo(r, 'markdown'); }
    if (k === 'y') { hecho(); return cambiarTipo(r, 'code'); }
    if (k === 'r') { hecho(); return cambiarTipo(r, 'raw'); }
    if (k === 'x') { hecho(); return portapapeles(r, 'cortar'); }
    if (k === 'c') { hecho(); return portapapeles(r, 'copiar'); }
    if (k === 'v') { hecho(); return portapapeles(r, 'pegar'); }
    if (k === 'z') { hecho(); return deshacerBorrado(r); }
    if (k === 'L') { hecho(); return accion('numeros'); }
    if (k === 'd') { hecho(); if (ahora - ultD < 600) { ultD = 0; borrarCelda(r); } else ultD = ahora; return; }
    if (k === '0') { hecho(); if (ahora - ultCero < 600) { ultCero = 0; accion('reiniciar'); } else ultCero = ahora; return; }
    if (k === 'i') { hecho(); if (ahora - ultI < 600) { ultI = 0; accion('parar'); } else ultI = ahora; }
  }

  window.addEventListener('hashchange', () => { if (!/^#\/jupyter/.test(location.hash)) { document.body.classList.remove('jl-abierto'); for (const [r, st] of Object.entries(NBS)) if (st.sucio && Store) guardarNb(r); for (const r of Object.keys(EDS)) if (EDS[r].sucio) guardarTexto(r); } });
  window.JupyterPractica = { vista, _S: () => S(), _nb: (r) => NBS[r], _correrTodo: (r) => correrTodo(r), _ocupado: () => corriendo || cola.length > 0 };
})();
