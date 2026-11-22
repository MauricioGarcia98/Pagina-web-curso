/* Jira de práctica — un proyecto Scrum en el navegador, sin cuenta real.
 *
 * Sigue la forma de trabajar descrita en la documentación pública de Atlassian: backlog con sprints (crear,
 * iniciar y completar), tablero con columnas por estado, issues con clave (TA-12), tipos Epic, Story, Task,
 * Bug y Subtask, estimación en story points, búsqueda con JQL y reportes de burndown y velocidad.
 * No usa logos ni íconos de Atlassian: los íconos son genéricos.
 */
(function () {
  'use strict';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ahora = () => new Date().toISOString();
  const href = (...p) => '#/jira' + (p.length ? '/' + p.map((x) => encodeURIComponent(x)).join('/') : '');
  const CLAVE = 'TA';
  let main = null, Store = null, toast = () => {}, ruta = [], query = new URLSearchParams();
  const TIPOS = { Epic: ['#904ee2', 'M4 6l8-3 8 3v8l-8 7-8-7z'], Story: ['#63ba3c', 'M6 3h12v18l-6-4-6 4z'], Task: ['#4bade8', 'M5 5h14v14H5z M8 12l3 3 5-6'], Bug: ['#e5493a', 'M12 4a5 5 0 0 1 5 5v5a5 5 0 0 1-10 0V9a5 5 0 0 1 5-5z'], Subtask: ['#4bade8', 'M5 5h6v6H5z M13 13h6v6h-6z'] };
  const ESTADOS = ['To Do', 'In Progress', 'In Review', 'Done'];
  const PRIOR = { Highest: '#cd1317', High: '#e9494a', Medium: '#e97f33', Low: '#2d8738', Lowest: '#57a55a' };
  const GENTE = { alumno: 'Alumno', martin: 'Martín Rojas', camila: 'Camila Díaz', sofia: 'Sofía Pérez' };
  const icTipo = (t, s = 16) => { const [c, d] = TIPOS[t] || TIPOS.Task; return `<span class="jr-tipo" style="background:${c};width:${s}px;height:${s}px" title="${esc(t)}" role="img" aria-label="${esc(t)}"><svg viewBox="0 0 24 24" width="${s - 4}" height="${s - 4}" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg></span>`; };
  const icPrior = (p) => `<span class="jr-prior" style="color:${PRIOR[p] || '#999'}" title="${esc(p)}" role="img" aria-label="Priority ${esc(p)}">${/High/.test(p) ? '▲' : /Low/.test(p) ? '▼' : '='}</span>`;
  const avatar = (u, t = 24) => { if (!u) return `<span class="jr-av jr-av-vacio" style="width:${t}px;height:${t}px" title="Unassigned">?</span>`; const n = GENTE[u] || u; const col = { alumno: '#0052cc', martin: '#6554c0', camila: '#00875a', sofia: '#ff5630' }[u] || '#5e6c84'; return `<span class="jr-av" style="width:${t}px;height:${t}px;background:${col};font-size:${Math.round(t * 0.42)}px" title="${esc(n)}">${esc(n.split(' ').map((x) => x[0]).join('').slice(0, 2))}</span>`; };

  // ------------------------------------------------------------------ estado
  function st() {
    const s = Store.data.jira; if (s && s.v === 1) return s;
    const d = (x) => new Date(Date.now() + x * 864e5).toISOString();
    const I = (n, tipo, titulo, estado, asig, pts, sprint, epic, prior, desc = '', padre = null) => ({ n, tipo, titulo, estado, asig, pts, sprint, epic, prior, desc, padre, labels: [], creado: d(-12 + n * 0.3), act: [], com: [] });
    const issues = [
      I(1, 'Epic', 'Lago de datos de ventas', 'In Progress', 'martin', null, null, null, 'High', 'Llevar los pedidos de la tienda a un lago con capas bronze, silver y gold.'),
      I(2, 'Epic', 'Tablero de finanzas', 'To Do', 'sofia', null, null, null, 'Medium'),
      I(3, 'Story', 'Cargar los pedidos de ayer en silver antes de las 7:00', 'In Progress', 'camila', 5, 1, 1, 'High', 'Como analista, quiero los pedidos de ayer en silver antes de las 7:00 para preparar la reunión diaria.\n\nCriterios de aceptación:\n- El job corre a las 6:00.\n- La cuenta de control cierra.'),
      I(4, 'Subtask', 'Escribir la carga incremental', 'In Progress', 'camila', null, 1, 1, 'Medium', '', 3),
      I(5, 'Subtask', 'Tests de nulos y duplicados', 'To Do', 'alumno', null, 1, 1, 'Medium', '', 3),
      I(6, 'Bug', 'El ETL no incluye a México', 'To Do', 'alumno', 2, 1, 1, 'Highest', 'Desde octubre vendemos en México y el reporte no lo muestra. Hay que agregarlo a PAISES en pipelines/etl.py.'),
      I(7, 'Story', 'Total diario por canal para finanzas', 'To Do', 'alumno', 3, 1, 2, 'Medium', 'Como finanzas, quiero el total diario por canal para conciliar con la pasarela de pagos.'),
      I(8, 'Task', 'Documentar el contrato de datos de pedidos', 'Done', 'martin', 2, 1, 1, 'Low'),
      I(9, 'Story', 'Alertas si la carga diaria no llega', 'To Do', null, 5, null, 1, 'High'),
      I(10, 'Story', 'Dimensión de clientes con historia (SCD2)', 'To Do', null, 8, null, 1, 'Medium'),
      I(11, 'Task', 'Revisar costos del warehouse', 'To Do', null, 3, null, 2, 'Low'),
    ];
    issues.find((x) => x.n === 3).labels = ['datos', 'silver']; issues.find((x) => x.n === 6).labels = ['bug-prod'];
    return (Store.data.jira = { v: 1, issues, sig: 12, sprints: [{ id: 1, nombre: 'TA Sprint 1', meta: 'Pedidos en silver todos los días', estado: 'active', inicio: d(-5), fin: d(9) }, { id: 2, nombre: 'TA Sprint 2', meta: '', estado: 'future', inicio: null, fin: null }], cerrados: [{ nombre: 'TA Sprint 0', comprometido: 13, hecho: 10 }], filtros: [], ev: {} });
  }
  const guardar = () => { try { Store.saveSoon ? Store.saveSoon() : Store.save(); } catch (e) { /* nada */ } };
  const evento = (k) => { const s = st(); s.ev[k] = (s.ev[k] || 0) + 1; guardar(); };
  const issue = (n) => st().issues.find((x) => x.n === Number(n));
  const clave = (x) => `${CLAVE}-${x.n}`;
  const activo = () => st().sprints.find((x) => x.estado === 'active');
  const registrar = (x, t) => { x.act.push({ u: 'alumno', t, f: ahora() }); };

  // ------------------------------------------------------------------ marco
  function marco(sel, cuerpo, migas = []) {
    const NAV = [['#PLANNING'], ['timeline', 'Timeline', href('timeline')], ['backlog', 'Backlog', href('backlog')], ['board', 'Board', href('board')], ['reports', 'Reports', href('reports')], ['#'], ['issues', 'Issues', href('issues')], ['code', 'Code', href('code')], ['pages', 'Project pages', href('pages')]];
    return `<div class="jrp" id="jrp"><header class="jr-top"><a class="jr-marca" href="${href('board')}"><span class="jr-logo" aria-hidden="true">◆</span><b>Jira</b><span class="jr-tag">práctica</span></a>
      <nav class="jr-topnav"><a href="${href('issues')}">Your work</a><a href="${href('board')}">Projects</a><a href="${href('issues')}">Filters</a></nav>
      <button class="jr-crear" id="jrCrear">Create</button><span class="jr-sp"></span><label class="jr-buscar"><span aria-hidden="true">⌕</span><input id="jrQ" placeholder="Search" aria-label="Search issues"></label>${avatar('alumno', 28)}</header>
      <div class="jr-cuerpo"><nav class="jr-nav" aria-label="Project"><div class="jr-proy"><span class="jr-proy-ic">TA</span><div><b>Tienda Andina Datos</b><small>Software project</small></div></div>${NAV.map(([id, t, h]) => (id[0] === '#' ? `<div class="jr-nav-sec">${esc(id.slice(1))}</div>` : `<a class="jr-nav-i${sel === id ? ' on' : ''}" href="${h}">${t}</a>`)).join('')}</nav>
      <main class="jr-main">${migas.length ? `<div class="jr-migas">Projects / Tienda Andina Datos${migas.map((m) => ` / ${esc(m)}`).join('')}</div>` : ''}${cuerpo}</main></div>
      <div class="jr-modal" id="jrModal" hidden></div><div class="jr-toast" id="jrToast" role="status" aria-live="polite"></div></div>`;
  }
  function montar() {
    main.querySelector('#jrCrear').onclick = () => crear();
    const q = main.querySelector('#jrQ');
    q.onkeydown = (e) => { if (e.key !== 'Enter') return; const t = q.value.trim(); const m = t.match(/^TA-(\d+)$/i); if (m && issue(m[1])) location.hash = href('browse', 'TA-' + m[1]); else location.hash = href('issues') + '?jql=' + encodeURIComponent(t ? `text ~ "${t.replace(/"/g, '')}"` : ''); };
    main.querySelectorAll('[data-issue]').forEach((a) => { a.onclick = (e) => { e.preventDefault(); verIssue(Number(a.dataset.issue)); }; });
  }
  function aviso(t) { const x = main.querySelector('#jrToast'); if (!x) return; x.innerHTML = `<div>${t}</div>`; clearTimeout(aviso.t); aviso.t = setTimeout(() => { x.innerHTML = ''; }, 4000); }
  function modal(html, alMontar, ancho = 620) {
    const m = main.querySelector('#jrModal'); m.hidden = false; m.innerHTML = `<div class="jr-modal-c" role="dialog" aria-modal="true" style="width:min(${ancho}px,100%)">${html}</div>`;
    const cerrar = () => { m.hidden = true; m.innerHTML = ''; };
    m.querySelectorAll('[data-cerrar]').forEach((b) => { b.onclick = cerrar; }); m.onclick = (e) => { if (e.target === m) cerrar(); };
    if (alMontar) alMontar(m, cerrar); return cerrar;
  }
  const btn = (t, attr = '', tipo = '') => `<button type="button" class="jr-btn${tipo ? ' jr-btn-' + tipo : ''}" ${attr}>${t}</button>`;
  const lozenge = (e) => `<span class="jr-loz jr-loz-${e === 'Done' ? 'done' : e === 'To Do' ? 'todo' : 'prog'}">${esc(e)}</span>`;
  const filaIssue = (x) => `<div class="jr-fila"><span>${icTipo(x.tipo)}</span><a href="#" data-issue="${x.n}" class="jr-key${x.estado === 'Done' ? ' jr-hecho' : ''}">${clave(x)}</a><a href="#" data-issue="${x.n}" class="jr-fila-t">${esc(x.titulo)}</a>${x.epic ? `<span class="jr-epic-tag">${esc((issue(x.epic) || {}).titulo || '')}</span>` : ''}${lozenge(x.estado)}<span class="jr-pts" title="Story points">${x.pts == null ? '-' : x.pts}</span>${icPrior(x.prior)}${avatar(x.asig, 22)}</div>`;

  // ------------------------------------------------------------------ backlog
  function backlog() {
    const s = st(), padres = (xs) => xs.filter((x) => x.tipo !== 'Subtask' && x.tipo !== 'Epic');
    const sumaPts = (xs) => xs.reduce((a, x) => a + (x.pts || 0), 0);
    const bloque = (sp) => { const xs = padres(s.issues.filter((x) => x.sprint === sp.id)); return `<section class="jr-sprint" data-sprint="${sp.id}"><div class="jr-sprint-h"><b>${esc(sp.nombre)}</b> <span class="jr-dim">${sp.estado === 'active' ? `${fechaCorta(sp.inicio)} – ${fechaCorta(sp.fin)}` : 'Add dates'} · ${xs.length} issues</span>${sp.meta ? `<span class="jr-meta">${esc(sp.meta)}</span>` : ''}<span class="jr-sp"></span>
      <span class="jr-sum">${['To Do', 'In Progress', 'Done'].map((e) => `<i class="jr-sum-${e === 'Done' ? 'done' : e === 'To Do' ? 'todo' : 'prog'}" title="${e}">${sumaPts(xs.filter((x) => (e === 'In Progress' ? ['In Progress', 'In Review'].includes(x.estado) : x.estado === e)))}</i>`).join('')}</span>
      ${sp.estado === 'active' ? btn('Complete sprint', `data-completar="${sp.id}"`) : btn('Start sprint', `data-iniciar="${sp.id}" ${activo() ? 'disabled title="Ya hay un sprint activo"' : ''}`)}</div>
      <div class="jr-lista" data-drop="${sp.id}">${xs.map(filaArr).join('') || '<p class="jr-dim jr-vacio">Plan a sprint by dragging issues here from the backlog.</p>'}</div></section>`; };
    const bl = padres(s.issues.filter((x) => !x.sprint && x.estado !== 'Done'));
    const cuerpo = `<div class="jr-barra"><h1 class="jr-h1">Backlog</h1><span class="jr-sp"></span><label class="jr-buscar jr-buscar-sm"><span aria-hidden="true">⌕</span><input id="jrBF" placeholder="Search backlog" aria-label="Search backlog"></label></div>
      ${s.sprints.filter((x) => x.estado !== 'closed').map(bloque).join('')}
      <section class="jr-sprint" data-sprint="0"><div class="jr-sprint-h"><b>Backlog</b> <span class="jr-dim">${bl.length} issues</span><span class="jr-sp"></span>${btn('Create sprint', 'data-nuevo-sprint')}</div><div class="jr-lista" data-drop="0">${bl.map(filaArr).join('') || '<p class="jr-dim jr-vacio">Your backlog is empty.</p>'}</div>
      <button class="jr-crear-rapido" data-crear-rapido>+ Create issue</button></section>
      <p class="jr-dim">Arrastra una issue entre el backlog y un sprint (o usa su menú “Move to”). Las épicas están en <a href="${href('timeline')}">Timeline</a>.</p>`;
    main.innerHTML = marco('backlog', cuerpo, ['Backlog']); montar();
    main.querySelectorAll('.jr-fila[draggable]').forEach((f) => { f.ondragstart = (e) => { e.dataTransfer.setData('text/plain', f.dataset.n); f.classList.add('arrastrando'); }; f.ondragend = () => f.classList.remove('arrastrando'); });
    main.querySelectorAll('[data-drop]').forEach((z) => { z.ondragover = (e) => { e.preventDefault(); z.classList.add('sobre'); }; z.ondragleave = () => z.classList.remove('sobre'); z.ondrop = (e) => { e.preventDefault(); mover(e.dataTransfer.getData('text/plain'), Number(z.dataset.drop)); }; });
    main.querySelectorAll('[data-mover]').forEach((sel) => { sel.onchange = () => mover(sel.dataset.mover, Number(sel.value)); });
    main.querySelectorAll('[data-iniciar]').forEach((b) => { b.onclick = () => iniciarSprint(Number(b.dataset.iniciar)); });
    main.querySelectorAll('[data-completar]').forEach((b) => { b.onclick = () => completarSprint(Number(b.dataset.completar)); });
    main.querySelector('[data-nuevo-sprint]').onclick = () => { const n = s.sprints.reduce((m, x) => Math.max(m, x.id), 0) + 1; s.sprints.push({ id: n, nombre: `TA Sprint ${n}`, meta: '', estado: 'future', inicio: null, fin: null }); guardar(); backlog(); };
    main.querySelector('[data-crear-rapido]').onclick = () => crear();
    const bf = main.querySelector('#jrBF'); bf.oninput = () => main.querySelectorAll('.jr-fila[data-n]').forEach((f) => { f.hidden = !f.textContent.toLowerCase().includes(bf.value.toLowerCase()); });
  }
  const filaArr = (x) => `<div class="jr-fila" draggable="true" data-n="${x.n}"><span>${icTipo(x.tipo)}</span><a href="#" data-issue="${x.n}" class="jr-key">${clave(x)}</a><a href="#" data-issue="${x.n}" class="jr-fila-t">${esc(x.titulo)}</a>${x.epic ? `<span class="jr-epic-tag">${esc((issue(x.epic) || {}).titulo || '')}</span>` : ''}${lozenge(x.estado)}<span class="jr-pts" title="Story points">${x.pts == null ? '-' : x.pts}</span>${icPrior(x.prior)}${avatar(x.asig, 22)}<label class="jr-sr" for="jrMv${x.n}">Move to</label><select class="jr-mover" id="jrMv${x.n}" data-mover="${x.n}"><option value="">Move to…</option>${st().sprints.filter((s) => s.estado !== 'closed').map((s) => `<option value="${s.id}">${esc(s.nombre)}</option>`).join('')}<option value="0">Backlog</option></select></div>`;
  const fechaCorta = (iso) => (iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '');
  function mover(n, sp) { const x = issue(n); if (!x) return; x.sprint = sp || null; st().issues.filter((y) => y.padre === x.n).forEach((y) => { y.sprint = x.sprint; }); registrar(x, sp ? `moved to ${st().sprints.find((s) => s.id === sp).nombre}` : 'moved to Backlog'); guardar(); evento('mover-sprint'); backlog(); }
  function iniciarSprint(id) {
    const sp = st().sprints.find((x) => x.id === id), xs = st().issues.filter((x) => x.sprint === id);
    if (!xs.length) { aviso('Agrega al menos una issue al sprint antes de iniciarlo.'); return; }
    modal(`<h2>Start sprint</h2><p class="jr-dim">${xs.length} issues will be included in this sprint.</p><label class="jr-lbl" for="jrSN">Sprint name</label><input class="jr-in" id="jrSN" value="${esc(sp.nombre)}"><label class="jr-lbl" for="jrSD">Duration</label><select class="jr-in" id="jrSD"><option value="7">1 week</option><option value="14" selected>2 weeks</option><option value="21">3 weeks</option></select><label class="jr-lbl" for="jrSG">Sprint goal</label><textarea class="jr-in jr-ta" id="jrSG" rows="3" placeholder="Qué valor entrega el equipo al terminar">${esc(sp.meta)}</textarea><div class="jr-modal-b">${btn('Cancel', 'data-cerrar', 'sutil')}${btn('Start', 'id="jrSOk"', 'primario')}</div>`, (m, cerrar) => {
      m.querySelector('#jrSOk').onclick = () => { sp.nombre = m.querySelector('#jrSN').value.trim() || sp.nombre; sp.meta = m.querySelector('#jrSG').value.trim(); sp.estado = 'active'; sp.inicio = ahora(); sp.fin = new Date(Date.now() + Number(m.querySelector('#jrSD').value) * 864e5).toISOString(); sp.comprometido = xs.filter((x) => x.tipo !== 'Subtask').reduce((a, x) => a + (x.pts || 0), 0); guardar(); evento('sprint-iniciar'); cerrar(); location.hash = href('board'); };
    });
  }
  function completarSprint(id) {
    const s = st(), sp = s.sprints.find((x) => x.id === id), xs = s.issues.filter((x) => x.sprint === id && x.tipo !== 'Subtask');
    const hechos = xs.filter((x) => x.estado === 'Done'), abiertos = xs.filter((x) => x.estado !== 'Done');
    const futuros = s.sprints.filter((x) => x.estado === 'future');
    modal(`<h2>Complete ${esc(sp.nombre)}</h2><p>This sprint contains <b>${hechos.length} completed issues</b> and <b>${abiertos.length} open issues</b>.</p><p class="jr-dim">Las issues terminadas quedan en el sprint. Las abiertas pasan al lugar que elijas: así se ve qué se arrastra de un sprint a otro (y se habla en la retrospectiva).</p><label class="jr-lbl" for="jrCM">Move open issues to</label><select class="jr-in" id="jrCM">${futuros.map((f) => `<option value="${f.id}">${esc(f.nombre)}</option>`).join('')}<option value="0">Backlog</option></select><div class="jr-modal-b">${btn('Cancel', 'data-cerrar', 'sutil')}${btn('Complete sprint', 'id="jrCOk"', 'primario')}</div>`, (m, cerrar) => {
      m.querySelector('#jrCOk').onclick = () => { const dest = Number(m.querySelector('#jrCM').value) || null; abiertos.forEach((x) => { x.sprint = dest; s.issues.filter((y) => y.padre === x.n).forEach((y) => { y.sprint = dest; }); }); sp.estado = 'closed'; s.cerrados.push({ nombre: sp.nombre, comprometido: sp.comprometido || xs.reduce((a, x) => a + (x.pts || 0), 0), hecho: hechos.reduce((a, x) => a + (x.pts || 0), 0) }); guardar(); evento('sprint-completar'); cerrar(); location.hash = href('reports') + '?r=velocity'; };
    });
  }

  // ------------------------------------------------------------------ tablero
  function tablero() {
    const s = st(), sp = activo();
    if (!sp) { main.innerHTML = marco('board', `<h1 class="jr-h1">Board</h1><div class="jr-card jr-vacio-g"><h2>Get started in the backlog</h2><p>Planifica un sprint en el backlog y presiona <b>Start sprint</b>: sus issues aparecen acá.</p>${btn('Go to Backlog', `onclick="location.hash='${href('backlog')}'"`, 'primario')}</div>`, ['Board']); return montar(); }
    const quien = query.get('asig') || '';
    const xs = s.issues.filter((x) => x.sprint === sp.id && x.tipo !== 'Epic' && (!quien || x.asig === quien));
    const dias = Math.max(0, Math.ceil((new Date(sp.fin) - Date.now()) / 864e5));
    const cuerpo = `<div class="jr-barra"><h1 class="jr-h1">${esc(sp.nombre)}</h1><span class="jr-dim">${dias} days remaining</span><span class="jr-sp"></span>${btn('Complete sprint', `data-completar="${sp.id}"`)}</div>${sp.meta ? `<p class="jr-dim">Sprint goal: <b>${esc(sp.meta)}</b></p>` : ''}
      <div class="jr-filtros"><label class="jr-buscar jr-buscar-sm"><span aria-hidden="true">⌕</span><input id="jrTF" placeholder="Search board" aria-label="Search board"></label>${Object.keys(GENTE).map((u) => `<a class="jr-filtro-av${quien === u ? ' on' : ''}" href="${href('board')}${quien === u ? '' : '?asig=' + u}" title="${esc(GENTE[u])}">${avatar(u, 30)}</a>`).join('')}</div>
      <div class="jr-board">${ESTADOS.map((e) => { const cs = xs.filter((x) => x.estado === e); return `<section class="jr-col" data-col="${e}" aria-label="${e}"><h2>${e.toUpperCase()} <span>${cs.length}</span></h2><div class="jr-col-b">${cs.map((x) => `<article class="jr-tarjeta" draggable="true" data-n="${x.n}"><a href="#" data-issue="${x.n}" class="jr-t-tit">${esc(x.titulo)}</a>${x.epic ? `<span class="jr-epic-tag">${esc((issue(x.epic) || {}).titulo || '')}</span>` : ''}<div class="jr-t-pie">${icTipo(x.tipo)}<span class="jr-key${e === 'Done' ? ' jr-hecho' : ''}">${clave(x)}</span><span class="jr-sp"></span>${x.pts != null ? `<span class="jr-pts">${x.pts}</span>` : ''}${icPrior(x.prior)}${avatar(x.asig, 22)}</div><label class="jr-sr" for="jrE${x.n}">Status</label><select class="jr-t-sel" id="jrE${x.n}" data-estado="${x.n}">${ESTADOS.map((y) => `<option ${y === e ? 'selected' : ''}>${y}</option>`).join('')}</select></article>`).join('')}</div></section>`; }).join('')}</div>`;
    main.innerHTML = marco('board', cuerpo, ['Board']); montar();
    const cambiar = (n, e) => { const x = issue(n); if (!x || x.estado === e) return; registrar(x, `changed the Status from ${x.estado} to ${e}`); x.estado = e; if (e === 'Done') x.hecho = ahora(); guardar(); evento('board-mover'); if (e === 'Done') evento('board-done'); tablero(); aviso(`${clave(x)} → <b>${e}</b>`); };
    main.querySelectorAll('[data-estado]').forEach((sel) => { sel.onchange = () => cambiar(sel.dataset.estado, sel.value); });
    main.querySelectorAll('.jr-tarjeta').forEach((t) => { t.ondragstart = (e) => { e.dataTransfer.setData('text/plain', t.dataset.n); t.classList.add('arrastrando'); }; t.ondragend = () => t.classList.remove('arrastrando'); });
    main.querySelectorAll('.jr-col').forEach((c) => { c.ondragover = (e) => { e.preventDefault(); c.classList.add('sobre'); }; c.ondragleave = () => c.classList.remove('sobre'); c.ondrop = (e) => { e.preventDefault(); cambiar(e.dataTransfer.getData('text/plain'), c.dataset.col); }; });
    main.querySelector('[data-completar]').onclick = () => completarSprint(sp.id);
    const tf = main.querySelector('#jrTF'); tf.oninput = () => main.querySelectorAll('.jr-tarjeta').forEach((t) => { t.hidden = !t.textContent.toLowerCase().includes(tf.value.toLowerCase()); });
  }

  // ------------------------------------------------------------------ issue
  function verIssue(n, comoPagina) {
    const s = st(), x = issue(n); if (!x) return;
    const hijos = s.issues.filter((y) => y.padre === x.n), padre = x.padre && issue(x.padre), epicas = s.issues.filter((y) => y.tipo === 'Epic');
    const html = `<div class="jr-issue"><div class="jr-issue-h"><span class="jr-migas">${padre ? `<a href="#" data-issue="${padre.n}">${clave(padre)}</a> / ` : ''}${icTipo(x.tipo)} ${clave(x)}</span><span class="jr-sp"></span>${comoPagina ? '' : `<a class="jr-btn jr-btn-sutil" href="${href('browse', clave(x))}">Open in page</a>${btn('✕', 'data-cerrar aria-label="Close"', 'sutil')}`}</div>
      <div class="jr-issue-g"><section><input class="jr-tit" id="jrIT" value="${esc(x.titulo)}" aria-label="Summary">
        <h3>Description</h3><textarea class="jr-in jr-ta" id="jrID" rows="6" aria-label="Description" placeholder="Add a description…">${esc(x.desc)}</textarea>
        ${x.tipo !== 'Subtask' && x.tipo !== 'Epic' ? `<h3>Subtasks</h3><div class="jr-sub">${hijos.map((h) => filaIssue(h)).join('') || '<p class="jr-dim">No subtasks.</p>'}<button class="jr-crear-rapido" data-sub>+ Add subtask</button></div>` : ''}
        ${x.tipo === 'Epic' ? `<h3>Issues in this epic</h3><div class="jr-sub">${s.issues.filter((y) => y.epic === x.n).map(filaIssue).join('') || '<p class="jr-dim">No issues.</p>'}</div>` : ''}
        <h3>Activity</h3><div class="jr-acts">${[...x.com.map((c) => ({ ...c, com: true })), ...x.act].sort((a, b) => b.f.localeCompare(a.f)).map((a) => `<div class="jr-act">${avatar(a.u, 26)}<div><b>${esc(GENTE[a.u] || a.u)}</b> ${a.com ? '' : esc(a.t)} <span class="jr-dim">${new Date(a.f).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>${a.com ? `<p>${esc(a.t)}</p>` : ''}</div></div>`).join('') || '<p class="jr-dim">No activity yet.</p>'}</div>
        <textarea class="jr-in jr-ta" id="jrIC" rows="2" placeholder="Add a comment…" aria-label="Add a comment"></textarea>${btn('Save comment', 'data-comentar', 'primario')}</section>
      <aside><select class="jr-in jr-estado-sel" id="jrIE" aria-label="Status">${ESTADOS.map((e) => `<option ${e === x.estado ? 'selected' : ''}>${e}</option>`).join('')}</select>
        <div class="jr-det"><h3>Details</h3>
          <label>Assignee <select class="jr-in" id="jrIA"><option value="">Unassigned</option>${Object.entries(GENTE).map(([u, nn]) => `<option value="${u}" ${u === x.asig ? 'selected' : ''}>${esc(nn)}</option>`).join('')}</select></label>
          ${x.asig !== 'alumno' ? `<button class="jr-link" data-asignarme>Assign to me</button>` : ''}
          <label>Priority <select class="jr-in" id="jrIP">${Object.keys(PRIOR).map((p) => `<option ${p === x.prior ? 'selected' : ''}>${p}</option>`).join('')}</select></label>
          ${x.tipo !== 'Epic' && x.tipo !== 'Subtask' ? `<label>Story point estimate <input class="jr-in" id="jrIS" type="number" min="0" value="${x.pts == null ? '' : x.pts}"></label><label>Parent (epic) <select class="jr-in" id="jrIEp"><option value="">None</option>${epicas.map((ep) => `<option value="${ep.n}" ${ep.n === x.epic ? 'selected' : ''}>${clave(ep)} ${esc(ep.titulo)}</option>`).join('')}</select></label>` : ''}
          <label>Sprint <span class="jr-ro">${esc((s.sprints.find((sp) => sp.id === x.sprint) || { nombre: 'None' }).nombre)}</span></label>
          <label>Labels <input class="jr-in" id="jrIL" value="${esc(x.labels.join(' '))}" placeholder="datos silver"></label>
          <label>Reporter <span class="jr-ro">${avatar('martin', 20)} Martín Rojas</span></label>
          <p class="jr-dim">Development: escribe <code>${clave(x)}</code> en el nombre de la rama o en el mensaje del commit (<code>git commit -m "${clave(x)} …"</code>) y el código aparece enlazado acá.</p></div>
        ${btn('Save', 'data-guardar', 'primario')}</aside></div></div>`;
    const montarIssue = (root, cerrar) => {
      const g = () => {
        const cambios = [];
        const t = root.querySelector('#jrIT').value.trim(); if (t && t !== x.titulo) { x.titulo = t; cambios.push('Summary'); }
        const e = root.querySelector('#jrIE').value; if (e !== x.estado) { registrar(x, `changed the Status from ${x.estado} to ${e}`); x.estado = e; if (e === 'Done') { x.hecho = ahora(); evento('board-done'); } }
        const a = root.querySelector('#jrIA').value || null; if (a !== x.asig) { registrar(x, `changed the Assignee to ${GENTE[a] || 'Unassigned'}`); x.asig = a; }
        x.prior = root.querySelector('#jrIP').value; x.desc = root.querySelector('#jrID').value;
        const sp = root.querySelector('#jrIS'); if (sp) { const v = sp.value === '' ? null : Number(sp.value); if (v !== x.pts) { x.pts = v; if (v != null) evento('estimar'); } }
        const ep = root.querySelector('#jrIEp'); if (ep) x.epic = Number(ep.value) || null;
        x.labels = root.querySelector('#jrIL').value.split(/[\s,]+/).filter(Boolean);
        if (cambios.length) registrar(x, 'updated the ' + cambios.join(', '));
        guardar();
      };
      root.querySelector('[data-guardar]').onclick = () => { g(); evento('issue-editar'); if (cerrar) cerrar(); dibujar(); aviso(`${clave(x)} saved`); };
      root.querySelector('[data-comentar]').onclick = () => { const t = root.querySelector('#jrIC').value.trim(); if (!t) return; g(); x.com.push({ u: 'alumno', t, f: ahora() }); guardar(); evento('comentar'); if (cerrar) cerrar(); verIssue(x.n, comoPagina); };
      const am = root.querySelector('[data-asignarme]'); if (am) am.onclick = () => { root.querySelector('#jrIA').value = 'alumno'; };
      const sb = root.querySelector('[data-sub]'); if (sb) sb.onclick = () => { g(); if (cerrar) cerrar(); crear('Subtask', x.n); };
      root.querySelectorAll('[data-issue]').forEach((aa) => { aa.onclick = (ev) => { ev.preventDefault(); g(); if (cerrar) cerrar(); verIssue(Number(aa.dataset.issue), comoPagina); }; });
    };
    if (comoPagina) { main.innerHTML = marco('issues', html, ['Issues', clave(x)]); montar(); montarIssue(main.querySelector('.jr-issue'), null); }
    else modal(html, (m, cerrar) => montarIssue(m, cerrar), 980);
  }
  function crear(tipo = 'Story', padre = null) {
    const s = st();
    modal(`<h2>Create issue</h2><label class="jr-lbl" for="jrCP">Project</label><select class="jr-in" id="jrCP" disabled><option>Tienda Andina Datos (TA)</option></select>
      <label class="jr-lbl" for="jrCT">Issue type</label><select class="jr-in" id="jrCT">${Object.keys(TIPOS).map((t) => `<option ${t === tipo ? 'selected' : ''}>${t}</option>`).join('')}</select>
      <label class="jr-lbl" for="jrCS">Summary <span class="jr-req">*</span></label><input class="jr-in" id="jrCS" placeholder="Como analista, quiero…">
      <label class="jr-lbl" for="jrCD">Description</label><textarea class="jr-in jr-ta" id="jrCD" rows="4"></textarea>
      <label class="jr-lbl" for="jrCA">Assignee</label><select class="jr-in" id="jrCA"><option value="">Unassigned</option>${Object.entries(GENTE).map(([u, n]) => `<option value="${u}">${esc(n)}</option>`).join('')}</select>
      <label class="jr-lbl" for="jrCPr">Priority</label><select class="jr-in" id="jrCPr">${Object.keys(PRIOR).map((p) => `<option ${p === 'Medium' ? 'selected' : ''}>${p}</option>`).join('')}</select>
      <label class="jr-lbl" for="jrCPa">Parent</label><select class="jr-in" id="jrCPa"><option value="">None</option>${s.issues.filter((y) => y.tipo === 'Epic' || (y.tipo !== 'Subtask' && y.n === padre)).map((y) => `<option value="${y.n}" ${y.n === padre ? 'selected' : ''}>${clave(y)} ${esc(y.titulo)}</option>`).join('')}</select>
      <div class="jr-modal-b">${btn('Cancel', 'data-cerrar', 'sutil')}${btn('Create', 'id="jrCOk"', 'primario')}</div>`, (m, cerrar) => {
      setTimeout(() => m.querySelector('#jrCS').focus(), 30);
      m.querySelector('#jrCOk').onclick = () => {
        const t = m.querySelector('#jrCS').value.trim(); if (!t) { m.querySelector('#jrCS').focus(); return; }
        const tp = m.querySelector('#jrCT').value, pa = Number(m.querySelector('#jrCPa').value) || null, pIssue = pa && issue(pa);
        const x = { n: s.sig++, tipo: tp, titulo: t, estado: 'To Do', asig: m.querySelector('#jrCA').value || null, pts: null, sprint: tp === 'Subtask' && pIssue ? pIssue.sprint : null, epic: pIssue && pIssue.tipo === 'Epic' ? pa : (pIssue ? pIssue.epic : null), prior: m.querySelector('#jrCPr').value, desc: m.querySelector('#jrCD').value, padre: tp === 'Subtask' ? pa : null, labels: [], creado: ahora(), act: [{ u: 'alumno', t: 'created the issue', f: ahora() }], com: [] };
        s.issues.push(x); guardar(); evento('crear'); cerrar(); dibujar(); aviso(`You've created issue <a href="#" data-issue="${x.n}">${clave(x)}</a>`);
        main.querySelectorAll('#jrToast [data-issue]').forEach((a) => { a.onclick = (e) => { e.preventDefault(); verIssue(x.n); }; });
      };
    });
  }

  // ------------------------------------------------------------------ JQL
  // subconjunto de JQL: campo operador valor unidos con AND/OR, IN (…), ~ (contiene), EMPTY, funciones
  // currentUser(), openSprints(), closedSprints(), y ORDER BY campo ASC|DESC
  const CAMPOS = { project: (x) => CLAVE, status: (x) => x.estado, assignee: (x) => x.asig, type: (x) => x.tipo, issuetype: (x) => x.tipo, priority: (x) => x.prior, sprint: (x) => x.sprint, labels: (x) => x.labels, key: (x) => clave(x), summary: (x) => x.titulo, text: (x) => x.titulo + ' ' + x.desc, 'story points': (x) => x.pts, storypoints: (x) => x.pts, epic: (x) => (x.epic ? `${CLAVE}-${x.epic}` : null), parent: (x) => (x.padre ? `${CLAVE}-${x.padre}` : x.epic ? `${CLAVE}-${x.epic}` : null), created: (x) => x.creado };
  function jql(texto) {
    const t = texto.trim(); if (!t) return { ok: true, xs: st().issues.slice() };
    let cuerpo = t, orden = null;
    const om = t.match(/(?:^|\s+)ORDER\s+BY\s+("[^"]+"|'[^']+'|[\w ]+?)\s*(ASC|DESC)?\s*$/i); if (om) { orden = [om[1].replace(/^["']|["']$/g, '').toLowerCase().trim(), (om[2] || 'ASC').toUpperCase()]; cuerpo = t.slice(0, om.index); }
    const tokens = cuerpo.match(/"[^"]*"|'[^']*'|\(|\)|!=|>=|<=|!~|[=~<>]|,|[^\s(),=!~<>]+/g) || [];
    let i = 0; const ver = () => tokens[i], sig = () => tokens[i++];
    const valor = () => { let v = sig(); if (v == null) throw new Error('Expecting a value.'); if (/^["'].*["']$/.test(v)) return v.slice(1, -1); if (/^\w+\(\)$/.test(v) || (tokens[i] === '(' && tokens[i + 1] === ')')) { if (tokens[i] === '(') { i += 2; v += '()'; } return { fn: v.toLowerCase() }; } return v; };
    const resolver = (v) => { if (v && v.fn === 'currentuser()') return 'alumno'; if (v && v.fn === 'opensprints()') return st().sprints.filter((s) => s.estado === 'active').map((s) => s.id); if (v && v.fn === 'closedsprints()') return st().sprints.filter((s) => s.estado === 'closed').map((s) => s.id); if (v && v.fn === 'futuresprints()') return st().sprints.filter((s) => s.estado === 'future').map((s) => s.id); return v; };
    const norm = (v) => String(v == null ? '' : v).toLowerCase();
    const cond = () => {
      if (ver() === '(') { sig(); const r = expr(); if (sig() !== ')') throw new Error("Expecting ')'."); return r; }
      let campo = sig(); if (!campo) throw new Error('Expecting a field.'); campo = campo.replace(/^["']|["']$/g, '').toLowerCase();
      if (campo === 'story' && /^points$/i.test(ver())) { sig(); campo = 'story points'; }
      const f = CAMPOS[campo]; if (!f) throw new Error(`Field '${campo}' does not exist or you do not have permission to view it.`);
      let op = sig(); if (!op) throw new Error('Expecting an operator.');
      let neg = false; if (/^not$/i.test(op)) { neg = true; op = sig(); }
      if (/^is$/i.test(op)) { let n2 = false; if (/^not$/i.test(ver())) { sig(); n2 = true; } const v = sig(); if (!/^(empty|null)$/i.test(v || '')) throw new Error('Expecting EMPTY.'); return (x) => { const val = f(x); const vacio = val == null || val === '' || (Array.isArray(val) && !val.length); return n2 ? !vacio : vacio; }; }
      if (/^in$/i.test(op) && /^\w+$/.test(ver() || '') && tokens[i + 1] === '(' && tokens[i + 2] === ')') { const fv = resolver(valor()); const lista = [].concat(fv).map(norm); return (x) => { const ok = lista.includes(norm(f(x))); return neg ? !ok : ok; }; }
      if (/^in$/i.test(op)) { if (sig() !== '(') throw new Error("Expecting '(' after IN."); const vs = []; while (ver() !== ')') { if (ver() === ',') { sig(); continue; } if (ver() == null) throw new Error("Expecting ')'."); vs.push(resolver(valor())); } sig(); const lista = vs.flat().map(norm); return (x) => { const val = f(x); const ok = Array.isArray(val) ? val.some((v) => lista.includes(norm(v))) : lista.includes(norm(campo === 'assignee' && val == null ? 'empty' : val)); return neg ? !ok : ok; }; }
      const v = resolver(valor());
      if (op === '~' || op === '!~') { const q = norm(v); return (x) => { const ok = norm(f(x)).includes(q); return op === '~' ? ok : !ok; }; }
      if (op === '=' || op === '!=') return (x) => { const val = f(x); const ok = Array.isArray(v) ? v.map(norm).includes(norm(val)) : Array.isArray(val) ? val.map(norm).includes(norm(v)) : norm(val) === norm(v); return op === '=' ? ok : !ok; };
      if (['>', '<', '>=', '<='].includes(op)) return (x) => { const a = f(x), b = isNaN(Number(v)) ? v : Number(v); if (a == null) return false; const A = typeof b === 'number' ? Number(a) : String(a); return op === '>' ? A > b : op === '<' ? A < b : op === '>=' ? A >= b : A <= b; };
      throw new Error(`The operator '${op}' is not supported by the '${campo}' field.`);
    };
    const term = () => { let a = cond(); while (ver() && /^and$/i.test(ver())) { sig(); const b = cond(), a0 = a; a = (x) => a0(x) && b(x); } return a; };
    const expr = () => { let a = term(); while (ver() && /^or$/i.test(ver())) { sig(); const b = term(), a0 = a; a = (x) => a0(x) || b(x); } return a; };
    try {
      const pred = tokens.length ? expr() : () => true;
      if (i < tokens.length) throw new Error(`Error in the JQL Query: Expecting either 'OR' or 'AND' but got '${tokens[i]}'.`);
      let xs = st().issues.filter(pred);
      // prioridad y estado se ordenan por su rango (Highest > … > Lowest; To Do → Done), no alfabéticamente
      const RANGO = { priority: (x) => Object.keys(PRIOR).length - Object.keys(PRIOR).indexOf(x.prior), status: (x) => ESTADOS.indexOf(x.estado) };
      if (orden) { const f = RANGO[orden[0]] || CAMPOS[orden[0]] || CAMPOS.created; xs = xs.sort((a, b) => { const A = f(a), B = f(b); const r = A == null ? 1 : B == null ? -1 : typeof A === 'number' && typeof B === 'number' ? A - B : String(A).localeCompare(String(B)); return orden[1] === 'DESC' ? -r : r; }); }
      return { ok: true, xs };
    } catch (e) { return { ok: false, error: e.message }; }
  }
  function busqueda() {
    const s = st(), q = query.has('jql') ? query.get('jql') : 'project = TA AND assignee = currentUser() AND status != Done ORDER BY priority DESC';
    const r = jql(q);
    const EJ = ['project = TA AND sprint in openSprints() ORDER BY status', 'assignee = currentUser() AND status != Done', 'type = Bug AND priority in (Highest, High)', 'assignee is EMPTY AND type = Story', 'text ~ "silver"', '"story points" >= 5 ORDER BY "story points" DESC'];
    const cuerpo = `<div class="jr-barra"><h1 class="jr-h1">Search issues</h1><span class="jr-sp"></span>${btn('Save filter', 'data-guardar-f')}</div>
      <form class="jr-jql" id="jrJF"><label class="jr-sr" for="jrJQ">JQL</label><textarea class="jr-in jr-jql-in" id="jrJQ" rows="2" spellcheck="false">${esc(q)}</textarea>${btn('Search', 'type="submit"', 'primario')}</form>
      ${r.ok ? '' : `<div class="jr-err">${esc(r.error)}</div>`}
      <p class="jr-dim">Prueba: ${EJ.map((e) => `<button class="jr-link jr-ej" data-jql="${esc(e)}">${esc(e)}</button>`).join(' · ')}</p>
      ${s.filtros.length ? `<p>Your filters: ${s.filtros.map((f) => `<a href="${href('issues')}?jql=${encodeURIComponent(f.jql)}">${esc(f.nombre)}</a>`).join(' · ')}</p>` : ''}
      ${r.ok ? `<div class="jr-tabla-w"><table class="jr-tabla"><thead><tr><th>Type</th><th>Key</th><th>Summary</th><th>Assignee</th><th>Priority</th><th>Status</th><th>Story points</th></tr></thead><tbody>${r.xs.map((x) => `<tr><td>${icTipo(x.tipo)}</td><td><a href="#" data-issue="${x.n}">${clave(x)}</a></td><td><a href="#" data-issue="${x.n}">${esc(x.titulo)}</a></td><td>${avatar(x.asig, 20)} ${esc(GENTE[x.asig] || 'Unassigned')}</td><td>${icPrior(x.prior)} ${esc(x.prior)}</td><td>${lozenge(x.estado)}</td><td>${x.pts == null ? '' : x.pts}</td></tr>`).join('')}</tbody></table></div><p class="jr-dim">${r.xs.length} issues</p>` : ''}`;
    main.innerHTML = marco('issues', cuerpo, ['Issues']); montar();
    main.querySelector('#jrJF').onsubmit = (e) => { e.preventDefault(); const v = main.querySelector('#jrJQ').value; const rr = jql(v); if (rr.ok) evento(/order\s+by/i.test(v) ? 'jql-orden' : 'jql'); if (rr.ok && /\b(and|or)\b/i.test(v)) evento('jql-compuesta'); location.hash = href('issues') + '?jql=' + encodeURIComponent(v); };
    main.querySelector('#jrJQ').onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); main.querySelector('#jrJF').requestSubmit(); } };
    main.querySelectorAll('[data-jql]').forEach((b) => { b.onclick = () => { main.querySelector('#jrJQ').value = b.dataset.jql; main.querySelector('#jrJF').requestSubmit(); }; });
    main.querySelector('[data-guardar-f]').onclick = () => { if (!r.ok) return aviso('Corrige la consulta antes de guardarla'); const nombre = prompt('Filter name', 'Mis issues abiertas'); if (!nombre) return; s.filtros.push({ nombre, jql: q }); guardar(); evento('filtro'); busqueda(); };
  }

  // ------------------------------------------------------------------ reportes, timeline y otras páginas
  function reportes() {
    const s = st(), r = query.get('r') || 'burndown', sp = activo() || s.sprints.filter((x) => x.estado === 'closed').pop();
    let cuerpo = `<h1 class="jr-h1">Reports</h1><div class="jr-tabs"><a class="${r === 'burndown' ? 'on' : ''}" href="${href('reports')}?r=burndown">Burndown chart</a><a class="${r === 'velocity' ? 'on' : ''}" href="${href('reports')}?r=velocity">Velocity report</a></div>`;
    if (r === 'velocity') {
      const xs = s.cerrados, max = Math.max(1, ...xs.flatMap((x) => [x.comprometido, x.hecho]));
      cuerpo += `<div class="jr-card"><h2>Velocity</h2><p class="jr-dim">Puntos comprometidos (gris) y completados (verde) en cada sprint cerrado. El promedio de completados es la <b>velocidad</b>: sirve para no comprometer más de lo que el equipo suele terminar.</p>
        <svg class="jr-graf" viewBox="0 0 ${Math.max(320, xs.length * 120)} 220" role="img" aria-label="Velocity chart">${xs.map((x, i) => { const X = 40 + i * 110, h1 = (x.comprometido / max) * 160, h2 = (x.hecho / max) * 160; return `<rect x="${X}" y="${190 - h1}" width="34" height="${h1}" fill="#c1c7d0"/><rect x="${X + 38}" y="${190 - h2}" width="34" height="${h2}" fill="#36b37e"/><text x="${X + 36}" y="208" text-anchor="middle" font-size="11" fill="currentColor">${esc(x.nombre.replace('TA ', ''))}</text><text x="${X + 17}" y="${185 - h1}" text-anchor="middle" font-size="11" fill="currentColor">${x.comprometido}</text><text x="${X + 55}" y="${185 - h2}" text-anchor="middle" font-size="11" fill="currentColor">${x.hecho}</text>`; }).join('')}<line x1="30" y1="190" x2="${Math.max(320, xs.length * 120)}" y2="190" stroke="currentColor" opacity=".3"/></svg>
        <p>Velocidad promedio: <b>${xs.length ? Math.round(xs.reduce((a, x) => a + x.hecho, 0) / xs.length) : 0}</b> puntos por sprint.</p></div>`;
    } else if (sp && sp.inicio) {
      const items = s.issues.filter((x) => x.sprint === sp.id && x.tipo !== 'Subtask' && x.tipo !== 'Epic'), total = items.reduce((a, x) => a + (x.pts || 0), 0) || 1;
      const ini = new Date(sp.inicio).getTime(), fin = new Date(sp.fin).getTime(), dias = Math.max(1, Math.round((fin - ini) / 864e5));
      const pend = (t) => total - items.filter((x) => x.estado === 'Done' && x.hecho && new Date(x.hecho).getTime() <= t).reduce((a, x) => a + (x.pts || 0), 0) - (t >= Date.now() ? 0 : 0);
      const W = 560, H = 220, X = (d) => 40 + (d / dias) * (W - 60), Y = (p) => 190 - (p / total) * 160;
      const hoy = Math.min(dias, Math.max(0, Math.round((Date.now() - ini) / 864e5)));
      const puntos = Array.from({ length: hoy + 1 }, (_, d) => `${X(d)},${Y(pend(ini + d * 864e5 + 864e5 - 1))}`).join(' ');
      cuerpo += `<div class="jr-card"><h2>Burndown · ${esc(sp.nombre)}</h2><p class="jr-dim">La línea gris es el ritmo ideal (de ${total} puntos a 0 el último día). La roja son los puntos que faltan: baja cuando una issue pasa a <b>Done</b>. Si va por encima de la gris, el sprint viene atrasado.</p>
        <svg class="jr-graf" viewBox="0 0 ${W} ${H}" role="img" aria-label="Burndown chart"><line x1="${X(0)}" y1="${Y(total)}" x2="${X(dias)}" y2="${Y(0)}" stroke="#97a0af" stroke-dasharray="5 4" stroke-width="2"/><polyline points="${puntos}" fill="none" stroke="#de350b" stroke-width="2.5"/><line x1="30" y1="190" x2="${W}" y2="190" stroke="currentColor" opacity=".3"/><text x="${X(0)}" y="208" font-size="11" fill="currentColor">Day 0</text><text x="${X(dias) - 30}" y="208" font-size="11" fill="currentColor">Day ${dias}</text><text x="8" y="${Y(total) + 4}" font-size="11" fill="currentColor">${total}</text></svg>
        <p>Quedan <b>${pend(Date.now())}</b> de ${total} puntos.</p></div>`;
    } else cuerpo += `<div class="jr-card"><p>Inicia un sprint para ver el burndown.</p></div>`;
    main.innerHTML = marco('reports', cuerpo, ['Reports']); montar(); evento('reportes');
  }
  function timeline() {
    const s = st(), eps = s.issues.filter((x) => x.tipo === 'Epic');
    const cuerpo = `<h1 class="jr-h1">Timeline</h1><div class="jr-card">${eps.map((ep) => { const hs = s.issues.filter((x) => x.epic === ep.n && x.tipo !== 'Subtask'); const hechos = hs.filter((x) => x.estado === 'Done').length; return `<div class="jr-tl"><div class="jr-tl-n">${icTipo('Epic')} <a href="#" data-issue="${ep.n}">${clave(ep)} ${esc(ep.titulo)}</a></div><div class="jr-tl-b"><i style="width:${hs.length ? Math.round((hechos / hs.length) * 100) : 0}%"></i></div><span class="jr-dim">${hechos}/${hs.length} done</span></div>`; }).join('')}</div><p class="jr-dim">Las épicas agrupan las historias de una iniciativa. En el Jira real, acá se arrastran las barras para planificar fechas.</p>`;
    main.innerHTML = marco('timeline', cuerpo, ['Timeline']); montar();
  }
  function otra(id, t, txt) { main.innerHTML = marco(id, `<h1 class="jr-h1">${esc(t)}</h1><div class="jr-card"><p>${txt}</p></div>`, [t]); montar(); }

  // ------------------------------------------------------------------ router
  function dibujar() {
    const r = ruta[0] || 'board';
    if (r === 'backlog') return backlog();
    if (r === 'board') return tablero();
    if (r === 'issues') return busqueda();
    if (r === 'reports') return reportes();
    if (r === 'timeline') return timeline();
    if (r === 'browse' && ruta[1]) { const m = ruta[1].match(/(\d+)$/); if (m && issue(m[1])) return verIssue(Number(m[1]), true); }
    if (r === 'code') return otra('code', 'Code', 'Conecta Jira con GitHub, Bitbucket o GitLab y cada rama, commit y pull request que nombre la clave (TA-12) aparece en la issue. En la práctica, usa la clave en tus mensajes de commit de la terminal.');
    if (r === 'pages') return otra('pages', 'Project pages', 'Documentos del proyecto en Confluence: decisiones, contratos de datos, postmortems. En la práctica, esos documentos van en Markdown dentro del repositorio.');
    return tablero();
  }
  function vista(m, ctx, sub) {
    main = m; Store = ctx.Store; toast = ctx.toast || toast;
    ruta = (sub || []).map((x) => { try { return decodeURIComponent(x); } catch (e) { return x; } }).filter(Boolean);
    query = new URLSearchParams(location.hash.split('?')[1] || '');
    document.body.classList.add('jr-abierto');
    dibujar();
  }
  window.addEventListener('hashchange', () => { if (!/^#\/jira/.test(location.hash)) document.body.classList.remove('jr-abierto'); });
  window.JiraPractica = { vista, jql: (t) => (Store ? jql(t) : null), estado: () => (Store ? st() : null) };
})();
