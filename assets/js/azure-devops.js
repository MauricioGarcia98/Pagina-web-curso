/* Azure DevOps de práctica — Boards, Repos y Pipelines en el navegador, sin cuenta real.
 *
 * Sigue la forma de trabajar descrita en la documentación pública de Microsoft Learn: organización y proyecto,
 * Boards (tablero Kanban, backlog, sprints y work items Epic › Feature › User Story › Task, y Bug), Repos
 * (archivos, commits, ramas y pull requests) y Pipelines (asistente con YAML, ejecuciones por etapas y logs).
 * No usa logos ni íconos de Microsoft: los íconos son genéricos.
 *
 * Los repositorios son los mismos remotos de la terminal del curso (terminal-git.js): un
 * `git push https://dev.azure.com/academia/tienda-andina/_git/pipelines` aparece en Repos y, si hay un
 * pipeline con `trigger: main`, lo dispara.
 */
(function () {
  'use strict';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ORG = 'academia', PROY = 'tienda-andina';
  const urlRepo = (n) => `https://dev.azure.com/${ORG}/${PROY}/_git/${n}`;
  const G = () => (window.Shell && window.Shell.github) || null;
  const ahora = () => new Date().toISOString();
  const hace = (iso) => { const s = (Date.now() - new Date(iso)) / 1000; return s < 60 ? 'just now' : s < 3600 ? `${Math.floor(s / 60)}m ago` : s < 86400 ? `${Math.floor(s / 3600)}h ago` : new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); };
  const href = (...p) => '#/azure-devops' + (p.length ? '/' + p.map((x) => encodeURIComponent(x)).join('/') : '');
  const PH = (...p) => href(PROY, ...p);
  let main = null, Store = null, toast = () => {}, ruta = [], query = new URLSearchParams();

  const P = {
    resumen: '<rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/>',
    boards: '<rect x="3" y="4" width="5" height="16" rx="1"/><rect x="10" y="4" width="5" height="11" rx="1"/><rect x="17" y="4" width="4" height="7" rx="1"/>',
    repos: '<circle cx="6" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="9" r="2.5"/><path d="M6 8.5v7M18 11.5c0 3-4 3.5-10 5"/>',
    pipelines: '<path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3"/><path d="M18 3v4h-4M6 21v-4h4"/>', test: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.7 3h10.6a2 2 0 0 0 1.7-3l-5-9V3"/>',
    artifacts: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5"/>', ajustes: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
    mas: '<path d="M12 5v14M5 12h14"/>', archivo: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/>', carpeta: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    rama: '<circle cx="6" cy="5" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="7" r="2"/><path d="M6 7v10M18 9c0 4-6 4-12 8"/>', commit: '<circle cx="12" cy="12" r="3.5"/><path d="M3 12h5.5M15.5 12H21"/>', pr: '<circle cx="6" cy="6" r="2"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/><path d="M6 8v8M18 16V9a3 3 0 0 0-3-3h-4M13 4l-2 2 2 2"/>',
    ok: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.7 2.7L16 9.5"/>', mal: '<circle cx="12" cy="12" r="9"/><path d="M15 9l-6 6M9 9l6 6"/>', reloj: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', play: '<path d="M7 4l13 8-13 8z" fill="currentColor"/>',
    copiar: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>', terminal: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9l3 3-3 3M12 15h5"/>', lupa: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
    usuario: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>', sprint: '<path d="M4 18c2-8 6-12 16-12M14 6h6v6"/>', chev: '<path d="M9 6l6 6-6 6"/>',
  };
  const ic = (n, t = 16, cls = '') => `<svg class="ado-ic ${cls}" width="${t}" height="${t}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n] || ''}</svg>`;
  const TIPOS = { Epic: '#ff7b00', Feature: '#773b93', 'User Story': '#009ccc', Task: '#f2cb1d', Bug: '#cc293d' };
  const ESTADOS = ['New', 'Active', 'Resolved', 'Closed'];
  const GENTE = { alumno: 'Alumno', martin: 'Martín Rojas', camila: 'Camila Díaz', sofia: 'Sofía Pérez' };
  const avatar = (u, t = 24) => { const n = GENTE[u] || u || '?'; const col = { alumno: '#0078d4', martin: '#8764b8', camila: '#038387', sofia: '#ca5010' }[u] || '#69797e'; return `<span class="ado-av" style="width:${t}px;height:${t}px;background:${col};font-size:${Math.round(t * 0.42)}px" title="${esc(n)}">${esc(n.split(' ').map((x) => x[0]).join('').slice(0, 2))}</span>`; };

  // ------------------------------------------------------------------ estado
  function st() {
    const s = Store.data.ado; if (s && s.v === 1) return s;
    const hoy = new Date(); const dia = (d) => new Date(hoy.getTime() + d * 864e5).toISOString().slice(0, 10);
    const items = [
      [1, 'Epic', 'Lago de datos de ventas', 'Active', 'martin', null, null, 'Sprint 1'],
      [2, 'Feature', 'Ingesta diaria de pedidos', 'Active', 'martin', 1, null, 'Sprint 1'],
      [3, 'User Story', 'Como analista, quiero los pedidos de ayer en silver antes de las 7:00', 'Active', 'camila', 2, 5, 'Sprint 1'],
      [4, 'Task', 'Escribir la carga incremental de pedidos', 'Active', 'camila', 3, null, 'Sprint 1'],
      [5, 'Task', 'Agregar tests de calidad (nulos y duplicados)', 'New', 'alumno', 3, null, 'Sprint 1'],
      [6, 'User Story', 'Como finanzas, quiero el total diario por canal', 'New', 'alumno', 2, 3, 'Sprint 2'],
      [7, 'Bug', 'El ETL no incluye a México', 'New', 'alumno', 2, null, 'Sprint 1'],
      [8, 'Feature', 'CI/CD del repositorio de pipelines', 'New', 'sofia', 1, null, 'Sprint 2'],
      [9, 'User Story', 'Como equipo, queremos correr los tests en cada pull request', 'New', 'alumno', 8, 3, 'Sprint 2'],
    ].map(([id, tipo, titulo, estado, asignado, padre, puntos, sprint]) => ({ id, tipo, titulo, estado, asignado, padre, puntos, sprint, desc: '', creado: ahora(), coment: [] }));
    items.find((x) => x.id === 7).desc = 'Desde octubre también vendemos en México y el reporte no lo muestra. Hay que agregarlo a PAISES en pipelines/etl.py.';
    items.find((x) => x.id === 9).desc = 'Criterios de aceptación:\n- Un pipeline con trigger en main y en los pull requests.\n- Instala dependencias y corre pytest.\n- Si los tests fallan, el pull request no se puede completar.';
    return (Store.data.ado = { v: 1, items, sig: 10, sprints: [['Sprint 1', dia(-4), dia(10)], ['Sprint 2', dia(11), dia(24)], ['Sprint 3', dia(25), dia(38)]], repos: ['pipelines'], pipes: [], prs: [], ev: {} });
  }
  const guardar = () => { try { Store.saveSoon ? Store.saveSoon() : Store.save(); } catch (e) { /* nada */ } };
  const evento = (k) => { const s = st(); s.ev[k] = (s.ev[k] || 0) + 1; guardar(); };
  const repo = (n) => { const A = G(); if (!A) return null; return A.remoto(urlRepo(n)) || null; };
  function asegurarRepos() {
    const A = G(); if (!A) return;
    for (const n of st().repos) if (!A.remoto(urlRepo(n))) A.crearRemoto(urlRepo(n), n === 'pipelines');
    try { window.Shell.Machine.save(); } catch (e) { /* nada */ }
  }
  const tipRama = (r, b) => r && r.branches[b];
  const snap = (r, b) => { const h = tipRama(r, b); return (h && r.commits[h] && r.commits[h].snap) || {}; };
  const historia = (r, b) => { const out = []; let h = tipRama(r, b); const vis = new Set(); while (h && r.commits[h] && !vis.has(h)) { vis.add(h); out.push([h, r.commits[h]]); h = r.commits[h].parent; } return out; };

  // ------------------------------------------------------------------ marco
  const SECC = [['resumen', 'Overview', 'resumen', '#0078d4', PH()], ['boards', 'Boards', 'boards', '#009b72', PH('boards')], ['repos', 'Repos', 'repos', '#e05d44', PH('repos')], ['pipelines', 'Pipelines', 'pipelines', '#0078d4', PH('pipelines')], ['test', 'Test Plans', 'test', '#8764b8', PH('test')], ['artifacts', 'Artifacts', 'artifacts', '#c239b3', PH('artifacts')]];
  const SUB = { boards: [['work', 'Work items', PH('boards', 'work')], ['board', 'Boards', PH('boards')], ['backlog', 'Backlogs', PH('boards', 'backlog')], ['sprints', 'Sprints', PH('boards', 'sprints')]], repos: [['files', 'Files', PH('repos')], ['commits', 'Commits', PH('repos', 'commits')], ['branches', 'Branches', PH('repos', 'branches')], ['prs', 'Pull requests', PH('repos', 'prs')]], pipelines: [['pipes', 'Pipelines', PH('pipelines')], ['env', 'Environments', PH('pipelines', 'env')]] };
  function marco(secc, sub, migas, cuerpo) {
    return `<div class="adop" id="adop"><header class="ado-top"><a class="ado-marca" href="${href()}"><span class="ado-logo" aria-hidden="true">${ic('pipelines', 18)}</span><b>Azure DevOps</b><span class="ado-tag">práctica</span></a>
      <nav class="ado-migas" aria-label="Breadcrumb"><a href="${href()}">${ORG}</a>${migas.map(([t, h]) => `<span>/</span>${h ? `<a href="${h}">${esc(t)}</a>` : `<span>${esc(t)}</span>`}`).join('')}</nav><span class="ado-sp"></span>
      <label class="ado-buscar">${ic('lupa', 14)}<input id="adoQ" placeholder="Search" aria-label="Search work items"></label>
      <button class="ado-top-i" id="adoTerm" title="Terminal del curso" aria-label="Terminal del curso">${ic('terminal', 18)}</button>${avatar('alumno', 28)}</header>
    <div class="ado-cuerpo">${secc ? `<nav class="ado-nav" aria-label="Project"><a class="ado-proy" href="${PH()}"><span class="ado-proy-ic">TA</span><b>${PROY}</b></a>${SECC.map(([id, t, i, c, h]) => `<a class="ado-nav-i${secc === id ? ' on' : ''}" href="${h}"><span class="ado-nav-ic" style="color:${c}">${ic(i, 18)}</span><span>${t}</span></a>${secc === id && SUB[id] ? SUB[id].map(([sid, st2, sh]) => `<a class="ado-nav-s${sub === sid ? ' on' : ''}" href="${sh}">${st2}</a>`).join('') : ''}`).join('')}<span class="ado-sp"></span><a class="ado-nav-i" href="${PH('settings')}"><span class="ado-nav-ic">${ic('ajustes', 18)}</span><span>Project settings</span></a></nav>` : ''}
      <main class="ado-main">${cuerpo}</main></div><div class="ado-modal" id="adoModal" hidden></div><div class="ado-toast" id="adoToast" role="status" aria-live="polite"></div></div>`;
  }
  function montar() {
    main.querySelector('#adoTerm').onclick = () => { location.hash = '#/lab/terminal'; };
    const q = main.querySelector('#adoQ');
    q.onkeydown = (e) => { if (e.key !== 'Enter') return; const t = q.value.trim(); const n = Number(t.replace('#', '')); if (n && st().items.find((x) => x.id === n)) location.hash = PH('workitem', String(n)); else location.hash = PH('boards', 'work') + '?q=' + encodeURIComponent(t); };
  }
  function aviso(txt) { const t = main.querySelector('#adoToast'); if (!t) return; t.innerHTML = `<div>${txt}</div>`; clearTimeout(aviso.t); aviso.t = setTimeout(() => { t.innerHTML = ''; }, 4500); }
  function modal(html, alMontar) {
    const m = main.querySelector('#adoModal'); m.hidden = false; m.innerHTML = `<div class="ado-modal-c" role="dialog" aria-modal="true">${html}</div>`;
    const cerrar = () => { m.hidden = true; m.innerHTML = ''; };
    m.querySelectorAll('[data-cerrar]').forEach((b) => { b.onclick = cerrar; }); m.onclick = (e) => { if (e.target === m) cerrar(); };
    if (alMontar) alMontar(m, cerrar); const f = m.querySelector('input, textarea, select'); if (f) setTimeout(() => f.focus(), 30);
  }
  const btn = (t, attr = '', tipo = '') => `<button type="button" class="ado-btn${tipo ? ' ado-btn-' + tipo : ''}" ${attr}>${t}</button>`;
  const chipTipo = (t) => `<span class="ado-tipo" style="--c:${TIPOS[t]}"><i></i>${esc(t)}</span>`;
  const chipEstado = (e) => `<span class="ado-estado ado-e-${e.toLowerCase()}"><i></i>${esc(e)}</span>`;

  // ------------------------------------------------------------------ organización y resumen
  function org() {
    main.innerHTML = marco('', '', [], `<h1 class="ado-h1">Projects</h1><div class="ado-proys"><a class="ado-proy-card" href="${PH()}"><span class="ado-proy-ic ado-proy-ic-g">TA</span><div><b>${PROY}</b><p class="ado-dim">Equipo de datos de Tienda Andina: tableros, repositorios y pipelines.</p></div></a></div><p class="ado-dim">En una empresa, la organización (<code>dev.azure.com/empresa</code>) tiene varios proyectos, uno por producto o equipo.</p>`);
    montar();
  }
  function resumen() {
    const s = st(), abiertos = s.items.filter((x) => x.estado !== 'Closed').length, pipes = s.pipes.length, runs = s.pipes.flatMap((p) => p.runs);
    const cuerpo = `<h1 class="ado-h1">${PROY}</h1><div class="ado-grid2"><section class="ado-card"><h2>About this project</h2><p>Repositorio de pipelines de datos, su CI y el trabajo del equipo. Proceso: <b>Agile</b> (Epic › Feature › User Story › Task, y Bug).</p><p class="ado-dim">Es la réplica de práctica: los repositorios son los mismos remotos de la terminal del curso.</p></section>
      <section class="ado-card"><h2>Project stats</h2><div class="ado-stats"><div><b>${abiertos}</b><span>Work items open</span></div><div><b>${s.repos.length}</b><span>Repos</span></div><div><b>${pipes}</b><span>Pipelines</span></div><div><b>${runs.filter((r) => r.estado === 'succeeded').length}/${runs.length}</b><span>Runs succeeded</span></div></div></section></div>
      <section class="ado-card"><h2>Members</h2><div class="ado-miembros">${Object.keys(GENTE).map((u) => `<span>${avatar(u, 32)} ${esc(GENTE[u])}</span>`).join('')}</div></section>`;
    main.innerHTML = marco('resumen', '', [[PROY, PH()], ['Summary', '']], cuerpo); montar();
  }

  // ------------------------------------------------------------------ Boards
  function tablero() {
    const s = st(), cols = ESTADOS;
    const sprintSel = query.get('sprint') || '';
    const items = s.items.filter((x) => ['User Story', 'Bug'].includes(x.tipo) && (!sprintSel || x.sprint === sprintSel));
    const hijos = (id) => s.items.filter((x) => x.padre === id && x.tipo === 'Task');
    const cuerpo = `<div class="ado-barra"><h1 class="ado-h1">Tienda Andina Team <span class="ado-dim">· Stories</span></h1><span class="ado-sp"></span>${btn(ic('mas', 14) + ' New item', 'data-nuevo', 'primario')}<select class="ado-in ado-in-auto" id="adoSprintF" aria-label="Sprint"><option value="">All iterations</option>${s.sprints.map(([n]) => `<option ${n === sprintSel ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></div>
      <p class="ado-dim ado-ayuda">Arrastra una tarjeta a otra columna (o usa su menú de estado). Las columnas siguen los estados del proceso Agile.</p>
      <div class="ado-kanban">${cols.map((c) => { const xs = items.filter((x) => x.estado === c); return `<section class="ado-col" data-col="${c}" aria-label="${c}"><h2>${c} <span class="ado-dim">${xs.length}</span></h2><div class="ado-col-b">${xs.map((x) => `<article class="ado-tarjeta" draggable="true" data-id="${x.id}" style="--c:${TIPOS[x.tipo]}"><div class="ado-t-h"><span class="ado-t-id">${x.id}</span><a href="${PH('workitem', String(x.id))}">${esc(x.titulo)}</a></div>
        <div class="ado-t-m">${avatar(x.asignado, 20)}<span>${esc(GENTE[x.asignado] || 'Unassigned')}</span>${x.puntos ? `<span class="ado-pts" title="Story Points">${x.puntos}</span>` : ''}</div>
        ${hijos(x.id).length ? `<div class="ado-t-tareas">${ic('ok', 12)} ${hijos(x.id).filter((t) => t.estado === 'Closed').length}/${hijos(x.id).length} tasks</div>` : ''}
        <label class="ado-sr" for="adoE${x.id}">State</label><select class="ado-t-sel" id="adoE${x.id}" data-estado="${x.id}">${cols.map((e) => `<option ${e === x.estado ? 'selected' : ''}>${e}</option>`).join('')}</select></article>`).join('')}</div></section>`; }).join('')}</div>`;
    main.innerHTML = marco('boards', 'board', [[PROY, PH()], ['Boards', PH('boards')], ['Boards', '']], cuerpo); montar();
    const mover = (id, e) => { const x = s.items.find((y) => y.id === Number(id)); if (!x || x.estado === e) return; x.estado = e; x.coment.push({ u: 'alumno', t: `State changed to ${e}`, f: ahora(), sistema: true }); guardar(); evento('board-mover'); if (e === 'Closed') evento('board-cerrar'); tablero(); aviso(`#${x.id} → <b>${e}</b>`); };
    main.querySelectorAll('[data-estado]').forEach((sel) => { sel.onchange = () => mover(sel.dataset.estado, sel.value); });
    main.querySelectorAll('.ado-tarjeta').forEach((t) => { t.ondragstart = (e) => { e.dataTransfer.setData('text/plain', t.dataset.id); t.classList.add('arrastrando'); }; t.ondragend = () => t.classList.remove('arrastrando'); });
    main.querySelectorAll('.ado-col').forEach((c) => { c.ondragover = (e) => { e.preventDefault(); c.classList.add('sobre'); }; c.ondragleave = () => c.classList.remove('sobre'); c.ondrop = (e) => { e.preventDefault(); mover(e.dataTransfer.getData('text/plain'), c.dataset.col); }; });
    main.querySelector('#adoSprintF').onchange = (e) => { location.hash = PH('boards') + (e.target.value ? '?sprint=' + encodeURIComponent(e.target.value) : ''); };
    main.querySelector('[data-nuevo]').onclick = () => nuevoItem('User Story');
  }
  function nuevoItem(tipo, padre) {
    const s = st();
    modal(`<h2>New work item</h2><label class="ado-lbl" for="adoNT">Type</label><select class="ado-in" id="adoNT">${Object.keys(TIPOS).map((t) => `<option ${t === tipo ? 'selected' : ''}>${t}</option>`).join('')}</select>
      <label class="ado-lbl" for="adoNTi">Title</label><input class="ado-in" id="adoNTi" placeholder="Como analista, quiero…">
      <label class="ado-lbl" for="adoNA">Assigned to</label><select class="ado-in" id="adoNA">${Object.entries(GENTE).map(([u, n]) => `<option value="${u}">${esc(n)}</option>`).join('')}</select>
      <label class="ado-lbl" for="adoNS">Iteration</label><select class="ado-in" id="adoNS">${s.sprints.map(([n]) => `<option>${esc(n)}</option>`).join('')}</select>
      <label class="ado-lbl" for="adoNP">Parent</label><select class="ado-in" id="adoNP"><option value="">(none)</option>${s.items.filter((x) => ['Epic', 'Feature', 'User Story'].includes(x.tipo)).map((x) => `<option value="${x.id}" ${x.id === padre ? 'selected' : ''}>${x.id} · ${esc(x.titulo.slice(0, 60))}</option>`).join('')}</select>
      <div class="ado-modal-b">${btn('Cancel', 'data-cerrar')}${btn('Save', 'id="adoNOk"', 'primario')}</div>`, (m, cerrar) => {
      m.querySelector('#adoNOk').onclick = () => {
        const t = m.querySelector('#adoNTi').value.trim(); if (!t) { m.querySelector('#adoNTi').focus(); return; }
        const it = { id: s.sig++, tipo: m.querySelector('#adoNT').value, titulo: t, estado: 'New', asignado: m.querySelector('#adoNA').value, padre: Number(m.querySelector('#adoNP').value) || null, puntos: null, sprint: m.querySelector('#adoNS').value, desc: '', creado: ahora(), coment: [] };
        s.items.push(it); guardar(); evento('wi-crear'); cerrar(); location.hash = PH('workitem', String(it.id));
      };
    });
  }
  function workItem(id) {
    const s = st(), x = s.items.find((y) => y.id === Number(id));
    if (!x) { location.hash = PH('boards', 'work'); return; }
    const padre = x.padre && s.items.find((y) => y.id === x.padre), hijos = s.items.filter((y) => y.padre === x.id);
    const prs = s.prs.filter((p) => (p.items || []).includes(x.id));
    const cuerpo = `<div class="ado-wi" style="--c:${TIPOS[x.tipo]}"><div class="ado-wi-h"><span class="ado-wi-tipo">${chipTipo(x.tipo)} ${x.id}</span><input class="ado-wi-tit" id="adoWT" value="${esc(x.titulo)}" aria-label="Title"></div>
      <div class="ado-wi-campos">${avatar(x.asignado, 24)}<label>Assigned <select class="ado-in ado-in-auto" id="adoWA">${Object.entries(GENTE).map(([u, n]) => `<option value="${u}" ${u === x.asignado ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></label>
        <label>State <select class="ado-in ado-in-auto" id="adoWE">${ESTADOS.map((e) => `<option ${e === x.estado ? 'selected' : ''}>${e}</option>`).join('')}</select></label>
        <label>Iteration <select class="ado-in ado-in-auto" id="adoWS">${s.sprints.map(([n]) => `<option ${n === x.sprint ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></label>
        ${x.tipo === 'User Story' ? `<label>Story Points <input class="ado-in ado-in-num" id="adoWP" type="number" min="0" value="${x.puntos || ''}"></label>` : ''}</div>
      <div class="ado-wi-cuerpo"><section><h2>Description</h2><textarea class="ado-in ado-ta" id="adoWD" rows="6" aria-label="Description">${esc(x.desc)}</textarea>
        <h2>Discussion</h2><div class="ado-disc">${x.coment.map((c) => `<div class="ado-com${c.sistema ? ' sis' : ''}">${avatar(c.u, 22)}<div><b>${esc(GENTE[c.u] || c.u)}</b> <span class="ado-dim">${hace(c.f)}</span><p>${esc(c.t)}</p></div></div>`).join('') || '<p class="ado-dim">No comments yet.</p>'}</div>
        <textarea class="ado-in ado-ta" id="adoWC" rows="2" placeholder="Add a comment. Use #ID to mention a work item." aria-label="Add a comment"></textarea>${btn('Comment', 'data-comentar')}</section>
        <aside><h2>Related work</h2>${padre ? `<p>Parent: <a href="${PH('workitem', String(padre.id))}">${chipTipo(padre.tipo)} ${padre.id} ${esc(padre.titulo)}</a></p>` : '<p class="ado-dim">Sin padre.</p>'}
          ${hijos.length ? `<p>Children:</p><ul class="ado-lista">${hijos.map((h) => `<li><a href="${PH('workitem', String(h.id))}">${chipTipo(h.tipo)} ${h.id} ${esc(h.titulo)}</a> ${chipEstado(h.estado)}</li>`).join('')}</ul>` : ''}
          ${btn(ic('mas', 12) + ' Add child', 'data-hijo')}
          <h2>Development</h2>${prs.length ? prs.map((p) => `<p>${ic('pr')} <a href="${PH('repos', 'prs', String(p.id))}">PR ${p.id}: ${esc(p.titulo)}</a> ${chipEstado(p.estado === 'completed' ? 'Closed' : 'Active')}</p>`).join('') : `<p class="ado-dim">Para enlazar un commit o un pull request, escribe <code>AB#${x.id}</code> en el mensaje del commit, o elige este ítem al crear el PR.</p>`}</aside></div>
      <div class="ado-pie">${btn('Save & Close', 'data-guardar', 'primario')}</div></div>`;
    main.innerHTML = marco('boards', 'work', [[PROY, PH()], ['Boards', PH('boards')], [`${x.tipo} ${x.id}`, '']], cuerpo); montar();
    const g = () => { x.titulo = main.querySelector('#adoWT').value.trim() || x.titulo; x.asignado = main.querySelector('#adoWA').value; const e = main.querySelector('#adoWE').value; if (e !== x.estado) { x.coment.push({ u: 'alumno', t: `State changed from ${x.estado} to ${e}`, f: ahora(), sistema: true }); x.estado = e; if (e === 'Closed') evento('board-cerrar'); } x.sprint = main.querySelector('#adoWS').value; const pt = main.querySelector('#adoWP'); if (pt) { x.puntos = Number(pt.value) || null; if (x.puntos) evento('wi-puntos'); } x.desc = main.querySelector('#adoWD').value; guardar(); };
    main.querySelector('[data-guardar]').onclick = () => { g(); evento('wi-editar'); history.length > 1 ? history.back() : (location.hash = PH('boards')); };
    main.querySelector('[data-comentar]').onclick = () => { const t = main.querySelector('#adoWC').value.trim(); if (!t) return; g(); x.coment.push({ u: 'alumno', t, f: ahora() }); guardar(); evento('wi-comentar'); workItem(id); };
    main.querySelector('[data-hijo]').onclick = () => { g(); nuevoItem(x.tipo === 'Epic' ? 'Feature' : x.tipo === 'Feature' ? 'User Story' : 'Task', x.id); };
  }
  function listaItems() {
    const s = st(), q = (query.get('q') || '').toLowerCase();
    const xs = s.items.filter((x) => !q || (x.titulo + ' ' + x.tipo + ' ' + x.estado + ' ' + (GENTE[x.asignado] || '')).toLowerCase().includes(q));
    const cuerpo = `<div class="ado-barra"><h1 class="ado-h1">Work items</h1><span class="ado-sp"></span>${btn(ic('mas', 14) + ' New Work Item', 'data-nuevo', 'primario')}</div>${q ? `<p class="ado-dim">Filtro: “${esc(q)}” · <a href="${PH('boards', 'work')}">quitar</a></p>` : ''}
      <div class="ado-tabla-w"><table class="ado-tabla"><thead><tr><th>ID</th><th>Title</th><th>Assigned To</th><th>State</th><th>Iteration</th></tr></thead><tbody>${xs.map((x) => `<tr><td>${x.id}</td><td>${chipTipo(x.tipo)} <a href="${PH('workitem', String(x.id))}">${esc(x.titulo)}</a></td><td>${avatar(x.asignado, 20)} ${esc(GENTE[x.asignado] || '')}</td><td>${chipEstado(x.estado)}</td><td>${esc(x.sprint || '')}</td></tr>`).join('')}</tbody></table></div>`;
    main.innerHTML = marco('boards', 'work', [[PROY, PH()], ['Boards', PH('boards')], ['Work items', '']], cuerpo); montar();
    main.querySelector('[data-nuevo]').onclick = () => nuevoItem('Task');
  }
  function backlog() {
    const s = st();
    const fila = (x, n) => `<tr><td style="padding-left:${10 + n * 22}px">${chipTipo(x.tipo)} <a href="${PH('workitem', String(x.id))}">${esc(x.titulo)}</a></td><td>${chipEstado(x.estado)}</td><td>${x.puntos || ''}</td><td>${esc(x.sprint || '')}</td></tr>` + s.items.filter((y) => y.padre === x.id).map((y) => fila(y, n + 1)).join('');
    const raices = s.items.filter((x) => !x.padre || !s.items.find((y) => y.id === x.padre));
    const total = s.items.filter((x) => x.tipo === 'User Story').reduce((a, x) => a + (x.puntos || 0), 0);
    const cuerpo = `<div class="ado-barra"><h1 class="ado-h1">Backlog</h1><span class="ado-sp"></span>${btn(ic('mas', 14) + ' New Work Item', 'data-nuevo', 'primario')}</div><p class="ado-dim">La jerarquía del proceso Agile: un <b>Epic</b> se parte en <b>Features</b>, cada Feature en <b>User Stories</b> (con puntos de estimación) y cada historia en <b>Tasks</b>. Total estimado: <b>${total}</b> puntos.</p>
      <div class="ado-tabla-w"><table class="ado-tabla"><thead><tr><th>Title</th><th>State</th><th>Story Points</th><th>Iteration</th></tr></thead><tbody>${raices.map((x) => fila(x, 0)).join('')}</tbody></table></div>`;
    main.innerHTML = marco('boards', 'backlog', [[PROY, PH()], ['Boards', PH('boards')], ['Backlogs', '']], cuerpo); montar();
    main.querySelector('[data-nuevo]').onclick = () => nuevoItem('User Story');
  }
  function sprints() {
    const s = st(), sel = query.get('s') || s.sprints[0][0], sp = s.sprints.find((x) => x[0] === sel) || s.sprints[0];
    const xs = s.items.filter((x) => x.sprint === sp[0] && ['User Story', 'Bug', 'Task'].includes(x.tipo));
    const pts = xs.reduce((a, x) => a + (x.puntos || 0), 0), hechos = xs.filter((x) => x.tipo !== 'Task' && x.estado === 'Closed').reduce((a, x) => a + (x.puntos || 0), 0);
    const cuerpo = `<div class="ado-barra"><h1 class="ado-h1">${esc(sp[0])}</h1><span class="ado-dim">${esc(sp[1])} – ${esc(sp[2])}</span><span class="ado-sp"></span><select class="ado-in ado-in-auto" id="adoSpS" aria-label="Sprint">${s.sprints.map(([n]) => `<option ${n === sp[0] ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></div>
      <div class="ado-grid2"><section class="ado-card"><h2>Sprint progress</h2><div class="ado-barra-p"><i style="width:${pts ? Math.round((hechos / pts) * 100) : 0}%"></i></div><p>${hechos} de ${pts} puntos cerrados.</p><p class="ado-dim">El equipo se compromete a lo que entra en el sprint (dos semanas). Lo que no se termina vuelve al backlog y se habla en la retrospectiva.</p></section>
      <section class="ado-card"><h2>Work in this sprint</h2><ul class="ado-lista">${xs.map((x) => `<li>${chipTipo(x.tipo)} <a href="${PH('workitem', String(x.id))}">${x.id} ${esc(x.titulo)}</a> ${chipEstado(x.estado)}</li>`).join('') || '<li class="ado-dim">Nada asignado a este sprint.</li>'}</ul></section></div>`;
    main.innerHTML = marco('boards', 'sprints', [[PROY, PH()], ['Boards', PH('boards')], ['Sprints', '']], cuerpo); montar();
    main.querySelector('#adoSpS').onchange = (e) => { location.hash = PH('boards', 'sprints') + '?s=' + encodeURIComponent(e.target.value); };
  }

  // ------------------------------------------------------------------ Repos
  function selectorRepo(n, base) { return `<select class="ado-in ado-in-auto" id="adoRepoS" aria-label="Repository">${st().repos.map((x) => `<option ${x === n ? 'selected' : ''}>${esc(x)}</option>`).join('')}<option value="__nuevo">+ New repository</option></select>`; }
  function enlazarRepo(base) { const s = main.querySelector('#adoRepoS'); if (s) s.onchange = (e) => { if (e.target.value === '__nuevo') return nuevoRepo(); location.hash = base + '?repo=' + encodeURIComponent(e.target.value); }; }
  function nuevoRepo() {
    modal(`<h2>Create a repository</h2><label class="ado-lbl">Repository type</label><div class="ado-ro">Git</div><label class="ado-lbl" for="adoRN">Repository name</label><input class="ado-in" id="adoRN" placeholder="dbt-ventas"><label class="ado-check"><input type="checkbox" id="adoRR" checked> Add a README</label>
      <label class="ado-lbl" for="adoRG">Add a .gitignore</label><select class="ado-in" id="adoRG"><option value="">None</option><option>Python</option><option>Terraform</option></select><div class="ado-modal-b">${btn('Cancel', 'data-cerrar')}${btn('Create', 'id="adoROk"', 'primario')}</div>`, (m, cerrar) => {
      m.querySelector('#adoROk').onclick = () => {
        const n = m.querySelector('#adoRN').value.trim().replace(/[^\w.-]+/g, '-'); if (!n || st().repos.includes(n)) return;
        const A = G(); if (!A) { toast('Falta la terminal del curso'); return; }
        const R = A.crearRemoto(urlRepo(n), false), sn = {};
        if (m.querySelector('#adoRR').checked) sn['README.md'] = `# ${n}\n\nIntroduction\n`;
        if (m.querySelector('#adoRG').value === 'Python') sn['.gitignore'] = '__pycache__/\n.venv/\n.env\n';
        if (m.querySelector('#adoRG').value === 'Terraform') sn['.gitignore'] = '.terraform/\n*.tfstate\n*.tfvars\n';
        if (Object.keys(sn).length) { const h = A.nuevoHash(); R.commits[h] = { msg: 'Added README.md', parent: null, snap: sn, author: 'alumno', date: ahora() }; R.branches.main = h; }
        st().repos.push(n); guardar(); try { window.Shell.Machine.save(); } catch (e) { /* nada */ } evento('repo-crear'); cerrar(); location.hash = PH('repos') + '?repo=' + encodeURIComponent(n);
      };
    });
  }
  function repoFiles() {
    asegurarRepos();
    const n = query.get('repo') || st().repos[0], r = repo(n), rama = query.get('rama') || 'main', p = query.get('path') || '';
    const base = PH('repos');
    if (!r || !Object.keys(r.branches).length) {
      const u = urlRepo(n);
      const cuerpo = `<div class="ado-barra">${selectorRepo(n)}</div><h1 class="ado-h1">${esc(n)} is empty. Add some code!</h1>
        <section class="ado-card"><h2>Clone to your computer</h2><div class="ado-copia"><input class="ado-in" readonly value="${esc(u)}" aria-label="Clone URL">${btn(ic('copiar', 14), `data-copiar="${esc(u)}" aria-label="Copy"`)}</div></section>
        <section class="ado-card"><h2>Push an existing repository from command line</h2><pre class="ado-pre">git remote add origin ${esc(u)}\ngit push -u origin --all</pre><p class="ado-dim">En la terminal del curso funciona igual: los commits que subas aparecen acá.</p></section>`;
      main.innerHTML = marco('repos', 'files', [[PROY, PH()], ['Repos', base], ['Files', '']], cuerpo); montar(); enlazarRepo(base); copiar(); return;
    }
    const sn = snap(r, rama), claves = Object.keys(sn).sort();
    const esArchivo = p && sn[p] != null;
    let cuerpoArchivos;
    if (esArchivo) cuerpoArchivos = `<section class="ado-card"><div class="ado-ruta"><a href="${base}?repo=${encodeURIComponent(n)}&rama=${encodeURIComponent(rama)}">${esc(n)}</a> / ${esc(p)}</div><pre class="ado-pre ado-codigo">${esc(sn[p])}</pre></section>`;
    else {
      const pre = p ? p.replace(/\/?$/, '/') : '', dirs = new Set(), files = [];
      for (const k of claves) { if (!k.startsWith(pre)) continue; const rest = k.slice(pre.length); if (rest.includes('/')) dirs.add(rest.split('/')[0]); else files.push(k); }
      const h = historia(r, rama);
      cuerpoArchivos = `<section class="ado-card"><div class="ado-ruta"><a href="${base}?repo=${encodeURIComponent(n)}&rama=${encodeURIComponent(rama)}">${esc(n)}</a>${p ? ' / ' + esc(p) : ''}</div>${h[0] ? `<div class="ado-ultimo">${avatar(h[0][1].author, 20)} <b>${esc(GENTE[h[0][1].author] || h[0][1].author)}</b> ${esc(h[0][1].msg.split('\n')[0])} <span class="ado-dim">· ${esc(h[0][0].slice(0, 8))} · ${hace(h[0][1].date)}</span></div>` : ''}
        <table class="ado-tabla"><thead><tr><th>Name</th></tr></thead><tbody>${[...dirs].sort().map((d) => `<tr><td>${ic('carpeta')} <a href="${base}?repo=${encodeURIComponent(n)}&rama=${encodeURIComponent(rama)}&path=${encodeURIComponent(pre + d)}">${esc(d)}</a></td></tr>`).join('')}${files.map((k) => `<tr><td>${ic('archivo')} <a href="${base}?repo=${encodeURIComponent(n)}&rama=${encodeURIComponent(rama)}&path=${encodeURIComponent(k)}">${esc(k.slice(pre.length))}</a></td></tr>`).join('')}</tbody></table></section>
        ${!p && sn['README.md'] ? `<section class="ado-card"><h2>README.md</h2><pre class="ado-pre">${esc(sn['README.md'])}</pre></section>` : ''}`;
    }
    const cuerpo = `<div class="ado-barra">${selectorRepo(n)}<select class="ado-in ado-in-auto" id="adoRamaS" aria-label="Branch">${Object.keys(r.branches).map((b) => `<option ${b === rama ? 'selected' : ''}>${esc(b)}</option>`).join('')}</select><span class="ado-sp"></span>${btn(ic('terminal', 14) + ' Clone', 'data-clonar', 'primario')}</div>${cuerpoArchivos}`;
    main.innerHTML = marco('repos', 'files', [[PROY, PH()], ['Repos', base], ['Files', ''], [n, '']], cuerpo); montar(); enlazarRepo(base);
    main.querySelector('#adoRamaS').onchange = (e) => { location.hash = `${base}?repo=${encodeURIComponent(n)}&rama=${encodeURIComponent(e.target.value)}`; };
    main.querySelector('[data-clonar]').onclick = () => modal(`<h2>Clone Repository</h2><p class="ado-dim">Copia la URL y en la terminal escribe <code>git clone</code> + la URL. En una empresa, la primera vez Git te pide entrar con tu cuenta de Microsoft (Git Credential Manager).</p><div class="ado-copia"><input class="ado-in" readonly value="${esc(urlRepo(n))}" aria-label="Clone URL">${btn(ic('copiar', 14), `data-copiar="${esc(urlRepo(n))}" aria-label="Copy"`)}</div><div class="ado-modal-b">${btn('Close', 'data-cerrar')}${btn('Clone in the course terminal', 'id="adoClT"', 'primario')}</div>`, (m) => {
      copiar(m); m.querySelector('#adoClT').onclick = async () => { location.hash = '#/lab/terminal'; };
    });
  }
  function copiar(root = main) { root.querySelectorAll('[data-copiar]').forEach((b) => { b.onclick = () => { try { navigator.clipboard.writeText(b.dataset.copiar); } catch (e) { /* nada */ } aviso('Copied to clipboard'); }; }); }
  function repoCommits() {
    asegurarRepos();
    const n = query.get('repo') || st().repos[0], r = repo(n), rama = query.get('rama') || 'main';
    const h = r ? historia(r, rama) : [];
    const cuerpo = `<div class="ado-barra">${selectorRepo(n)}<h1 class="ado-h1">Commits</h1></div><section class="ado-card"><table class="ado-tabla"><thead><tr><th>Commit</th><th>Message</th><th>Author</th><th>Authored date</th></tr></thead><tbody>${h.map(([sha, c]) => `<tr><td><code>${esc(sha.slice(0, 8))}</code></td><td>${esc(c.msg.split('\n')[0]).replace(/AB#(\d+)/g, (m0, id) => `<a href="${PH('workitem', id)}">${m0}</a>`)}</td><td>${avatar(c.author, 20)} ${esc(GENTE[c.author] || c.author)}</td><td>${hace(c.date)}</td></tr>`).join('') || '<tr><td colspan="4" class="ado-dim">No commits yet.</td></tr>'}</tbody></table></section>`;
    main.innerHTML = marco('repos', 'commits', [[PROY, PH()], ['Repos', PH('repos')], ['Commits', '']], cuerpo); montar(); enlazarRepo(PH('repos', 'commits'));
  }
  function repoRamas() {
    asegurarRepos();
    const n = query.get('repo') || st().repos[0], r = repo(n);
    const cuerpo = `<div class="ado-barra">${selectorRepo(n)}<h1 class="ado-h1">Branches</h1></div><section class="ado-card"><table class="ado-tabla"><thead><tr><th>Branch</th><th>Commit</th><th>Policies</th></tr></thead><tbody>${r ? Object.entries(r.branches).map(([b, h]) => `<tr><td>${ic('rama')} ${esc(b)} ${b === 'main' ? '<span class="ado-tag2">default</span>' : ''}</td><td><code>${esc(String(h).slice(0, 8))}</code></td><td>${b === 'main' ? (st().politicaMain ? `${ic('ok', 14)} Require a pull request with 1 reviewer and a successful build` : `<button class="ado-link" data-politica>Add branch policies</button>`) : ''}</td></tr>`).join('') : ''}</tbody></table></section>
      <p class="ado-dim">Las <b>branch policies</b> de <code>main</code> obligan a entrar por pull request, con revisión y con el pipeline en verde: nadie sube directo a producción.</p>`;
    main.innerHTML = marco('repos', 'branches', [[PROY, PH()], ['Repos', PH('repos')], ['Branches', '']], cuerpo); montar(); enlazarRepo(PH('repos', 'branches'));
    const b = main.querySelector('[data-politica]'); if (b) b.onclick = () => { st().politicaMain = true; guardar(); evento('politica'); repoRamas(); aviso('Branch policies saved for main'); };
  }
  function repoPrs() {
    asegurarRepos();
    const s = st();
    if (ruta[2] === 'nuevo') return prNuevo();
    if (ruta[2]) return prVer(Number(ruta[2]));
    const cuerpo = `<div class="ado-barra"><h1 class="ado-h1">Pull requests</h1><span class="ado-sp"></span>${btn('New pull request', 'data-nuevo', 'primario')}</div><section class="ado-card"><table class="ado-tabla"><thead><tr><th>Title</th><th>Repository</th><th>Branches</th><th>Status</th></tr></thead><tbody>${s.prs.map((p) => `<tr><td>${ic('pr')} <a href="${PH('repos', 'prs', String(p.id))}">${p.id} · ${esc(p.titulo)}</a></td><td>${esc(p.repo)}</td><td><code>${esc(p.origen)}</code> → <code>${esc(p.destino)}</code></td><td>${p.estado === 'completed' ? `${ic('ok', 14)} Completed` : 'Active'}</td></tr>`).join('') || '<tr><td colspan="4" class="ado-dim">No pull requests. Sube una rama desde la terminal y crea uno.</td></tr>'}</tbody></table></section>`;
    main.innerHTML = marco('repos', 'prs', [[PROY, PH()], ['Repos', PH('repos')], ['Pull requests', '']], cuerpo); montar();
    main.querySelector('[data-nuevo]').onclick = () => { location.hash = PH('repos', 'prs', 'nuevo'); };
  }
  function prNuevo() {
    const s = st(), n = query.get('repo') || s.repos[0], r = repo(n);
    const ramas = r ? Object.keys(r.branches) : [];
    const cuerpo = `<h1 class="ado-h1">New pull request</h1><section class="ado-card"><div class="ado-barra">${selectorRepo(n)}<select class="ado-in ado-in-auto" id="adoPO" aria-label="Source branch">${ramas.filter((b) => b !== 'main').map((b) => `<option>${esc(b)}</option>`).join('') || '<option value="">(no hay otras ramas)</option>'}</select> into <select class="ado-in ado-in-auto" id="adoPD" aria-label="Target branch">${ramas.map((b) => `<option ${b === 'main' ? 'selected' : ''}>${esc(b)}</option>`).join('')}</select></div>
      ${ramas.length < 2 ? `<p class="ado-dim">Primero sube una rama desde la terminal: <code>git checkout -b feature/mexico</code>, un commit y <code>git push -u origin feature/mexico</code>.</p>` : ''}
      <label class="ado-lbl" for="adoPT">Title</label><input class="ado-in" id="adoPT" placeholder="Agrega México al ETL"><label class="ado-lbl" for="adoPDs">Description</label><textarea class="ado-in ado-ta" id="adoPDs" rows="4"></textarea>
      <label class="ado-lbl" for="adoPW">Work items to link</label><select class="ado-in" id="adoPW"><option value="">(none)</option>${s.items.filter((x) => x.estado !== 'Closed').map((x) => `<option value="${x.id}">${x.id} · ${esc(x.titulo.slice(0, 60))}</option>`).join('')}</select>
      <div class="ado-pie">${btn('Create', 'id="adoPOk"', 'primario')}</div></section>`;
    main.innerHTML = marco('repos', 'prs', [[PROY, PH()], ['Repos', PH('repos')], ['Pull requests', PH('repos', 'prs')], ['New', '']], cuerpo); montar(); enlazarRepo(PH('repos', 'prs', 'nuevo'));
    main.querySelector('#adoPOk').onclick = () => {
      const o = main.querySelector('#adoPO').value, d = main.querySelector('#adoPD').value, t = main.querySelector('#adoPT').value.trim();
      if (!o || !t) { aviso('Elige la rama de origen y escribe un título'); return; }
      const w = Number(main.querySelector('#adoPW').value) || null;
      const p = { id: (s.prs.reduce((m, x) => Math.max(m, x.id), 0) || 0) + 1, repo: n, origen: o, destino: d, titulo: t, desc: main.querySelector('#adoPDs').value, estado: 'active', items: w ? [w] : [], creado: ahora(), votos: [] };
      s.prs.push(p); guardar(); evento('pr-crear');
      // si hay un pipeline para este repositorio, valida el PR (como una build validation de la política de rama)
      const pipe = s.pipes.find((x) => x.repo === n); if (pipe) correr(pipe, o, 'PR ' + p.id);
      location.hash = PH('repos', 'prs', String(p.id));
    };
  }
  function prVer(id) {
    const s = st(), p = s.prs.find((x) => x.id === id); if (!p) { location.hash = PH('repos', 'prs'); return; }
    const r = repo(p.repo), so = snap(r, p.origen), sd = snap(r, p.destino);
    const cambios = [...new Set([...Object.keys(so), ...Object.keys(sd)])].filter((k) => so[k] !== sd[k]);
    const pipe = s.pipes.find((x) => x.repo === p.repo), run = pipe && pipe.runs.slice().reverse().find((x) => x.rama === p.origen);
    const aprobado = p.votos.includes('camila');
    const bloqueos = [];
    if (s.politicaMain && p.destino === 'main') { if (!aprobado) bloqueos.push('Falta la aprobación de 1 revisor'); if (!run || run.estado !== 'succeeded') bloqueos.push('La build de validación tiene que estar en verde'); }
    const cuerpo = `<h1 class="ado-h1">${ic('pr', 22)} ${esc(p.titulo)} <span class="ado-dim">!${p.id}</span></h1><p>${avatar('alumno', 20)} Alumno quiere unir <code>${esc(p.origen)}</code> en <code>${esc(p.destino)}</code> · ${p.estado === 'completed' ? `${ic('ok', 14)} <b>Completed</b>` : '<b>Active</b>'}</p>
      <div class="ado-grid2"><section class="ado-card"><h2>Files <span class="ado-dim">(${cambios.length})</span></h2>${cambios.map((k) => `<details><summary>${ic('archivo', 14)} ${esc(k)}</summary><pre class="ado-pre">${diff(sd[k] || '', so[k] || '')}</pre></details>`).join('') || '<p class="ado-dim">Sin cambios entre las ramas.</p>'}${p.desc ? `<h2>Description</h2><p>${esc(p.desc)}</p>` : ''}</section>
      <aside class="ado-card"><h2>Reviewers</h2><p>${avatar('camila', 22)} Camila Díaz · ${aprobado ? `${ic('ok', 14)} Approved` : 'No vote'}</p>${!aprobado && p.estado !== 'completed' ? btn('Pedir revisión a Camila', 'data-revision') : ''}
        <h2>Checks</h2>${run ? `<p>${run.estado === 'succeeded' ? ic('ok', 14) : run.estado === 'failed' ? ic('mal', 14) : ic('reloj', 14)} <a href="${PH('pipelines', String(pipe.id), 'run', String(run.n))}">Build ${run.n}</a> · ${esc(run.estado)}</p>` : `<p class="ado-dim">${pipe ? 'Sin ejecución para esta rama.' : 'No hay pipeline: créalo en Pipelines para validar los PR.'}</p>`}
        ${p.items.length ? `<h2>Work items</h2>${p.items.map((w) => { const x = s.items.find((y) => y.id === w); return x ? `<p><a href="${PH('workitem', String(w))}">${chipTipo(x.tipo)} ${w} ${esc(x.titulo)}</a></p>` : ''; }).join('')}` : ''}
        ${p.estado !== 'completed' ? `${bloqueos.length ? `<div class="ado-bloq">${bloqueos.map((b) => `<p>${ic('mal', 14)} ${esc(b)}</p>`).join('')}</div>` : ''}${btn('Complete', `data-completar ${bloqueos.length ? 'disabled' : ''}`, 'primario')}` : ''}</aside></div>`;
    main.innerHTML = marco('repos', 'prs', [[PROY, PH()], ['Repos', PH('repos')], ['Pull requests', PH('repos', 'prs')], [`!${p.id}`, '']], cuerpo); montar();
    const rv = main.querySelector('[data-revision]'); if (rv) rv.onclick = () => { aviso('Camila está revisando…'); setTimeout(() => { p.votos.push('camila'); guardar(); if (location.hash === PH('repos', 'prs', String(id))) prVer(id); aviso('Camila aprobó el pull request'); }, 1600); };
    const cp = main.querySelector('[data-completar]'); if (cp) cp.onclick = () => completarPr(p);
  }
  function diff(a, b) { const A = a.split('\n'), B = b.split('\n'); const out = []; const max = Math.max(A.length, B.length); for (let i = 0; i < max; i++) { if (A[i] === B[i]) { if (A[i] != null) out.push(`<span class="ado-d0">  ${esc(A[i])}</span>`); } else { if (A[i] != null) out.push(`<span class="ado-dm">- ${esc(A[i])}</span>`); if (B[i] != null) out.push(`<span class="ado-dp">+ ${esc(B[i])}</span>`); } } return out.join('\n'); }
  function completarPr(p) {
    const A = G(), r = repo(p.repo); if (!A || !r) return;
    const h = A.nuevoHash();
    r.commits[h] = { msg: `Merged PR ${p.id}: ${p.titulo}`, parent: r.branches[p.destino], parent2: r.branches[p.origen], snap: { ...snap(r, p.origen) }, author: 'alumno', date: ahora() };
    r.branches[p.destino] = h; p.estado = 'completed';
    for (const w of p.items) { const x = st().items.find((y) => y.id === w); if (x && x.estado !== 'Closed') { x.estado = 'Closed'; x.coment.push({ u: 'alumno', t: `Closed by PR ${p.id}`, f: ahora(), sistema: true }); } }
    guardar(); try { window.Shell.Machine.save(); } catch (e) { /* nada */ } evento('pr-completar');
    const pipe = st().pipes.find((x) => x.repo === p.repo && /trigger:\s*\n?\s*-?\s*main|trigger:\s*main/.test(x.yaml)); if (pipe) correr(pipe, p.destino, 'Merged PR ' + p.id);
    prVer(p.id); aviso(`PR ${p.id} completed. Run <code>git pull</code> in your terminal to get the merge.`);
  }

  // ------------------------------------------------------------------ Pipelines
  const YAML_INICIAL = `# Pipeline de CI: corre en cada push a main y en cada pull request
trigger:
- main

pool:
  vmImage: ubuntu-latest

steps:
- task: UsePythonVersion@0
  inputs:
    versionSpec: '3.12'
  displayName: 'Use Python 3.12'

- script: pip install -r requirements.txt
  displayName: 'Install dependencies'

- script: pytest -q
  displayName: 'Run tests'
`;
  function pasosDe(yaml) {
    const out = []; const L = yaml.split('\n');
    for (let i = 0; i < L.length; i++) {
      const m = L[i].match(/^\s*-\s*(script|task|bash):\s*(.+)$/); if (!m) continue;
      let nombre = m[1] === 'task' ? m[2].trim() : m[2].trim(); for (let j = i + 1; j < Math.min(L.length, i + 8); j++) { if (/^\s*-\s/.test(L[j])) break; const d = L[j].match(/displayName:\s*['"]?(.+?)['"]?\s*$/); if (d) { nombre = d[1]; break; } }
      out.push({ tipo: m[1], cmd: m[2].trim(), nombre });
    }
    return out;
  }
  // simula cada paso con lo que hay en el repositorio: pytest sin tests falla (código 5), como en un agente real
  function correr(pipe, rama, motivo) {
    const r = repo(pipe.repo), sn = snap(r, rama), n = (pipe.runs.reduce((m, x) => Math.max(m, x.n), 0) || 0) + 1;
    const run = { n, rama, motivo, inicio: ahora(), estado: 'running', pasos: [] };
    const ps = [{ nombre: 'Initialize job', log: ['Agent name: Hosted Agent', 'Agent machine name: fv-az123', 'Image: ubuntu-24.04'] }, { nombre: 'Checkout ' + pipe.repo + '@' + rama, log: [`git fetch --depth=1 origin ${rama}`, `HEAD is now at ${String(r && r.branches[rama] || '').slice(0, 8)}`] }];
    let fallo = false;
    for (const p of pasosDe(pipe.yaml)) {
      const paso = { nombre: p.nombre, log: [] };
      if (fallo) { paso.estado = 'skipped'; ps.push(paso); continue; }
      if (p.tipo === 'task') paso.log.push(`Task: ${p.cmd}`, /UsePython/.test(p.cmd) ? 'Found tool in cache: Python 3.12.7 x64' : 'Task completed.');
      else {
        paso.log.push(`Generating script.`, `========================== Starting Command Output ===========================`, `/usr/bin/bash --noprofile --norc ${p.cmd}`);
        if (/pip install -r\s+(\S+)/.test(p.cmd)) { const f = p.cmd.match(/-r\s+(\S+)/)[1]; if (sn[f] == null) { paso.log.push(`ERROR: Could not open requirements file: [Errno 2] No such file or directory: '${f}'`); fallo = true; } else paso.log.push(`Successfully installed ${sn[f].split('\n').filter((x) => x.trim() && !x.startsWith('#')).join(' ') || '(nothing)'}`); }
        else if (/pytest/.test(p.cmd)) { const tests = Object.keys(sn).filter((k) => /(^|\/)test_[^/]+\.py$/.test(k)); if (!tests.length) { paso.log.push('no tests ran in 0.01s', '##[error]Bash exited with code \'5\'.'); fallo = true; } else { const nT = tests.reduce((a, k) => a + (sn[k].match(/^def test_/gm) || []).length, 0) || tests.length; paso.log.push(`collected ${nT} items`, '', `${tests.map((k) => k + ' ' + '.'.repeat(Math.max(1, (sn[k].match(/^def test_/gm) || []).length))).join('\n')}`, '', `${nT} passed in 0.42s`); } }
        else if (/python\s+(\S+\.py)/.test(p.cmd)) { const f = p.cmd.match(/python\s+(\S+\.py)/)[1]; if (sn[f] == null) { paso.log.push(`python: can't open file '${f}': [Errno 2] No such file or directory`); fallo = true; } else paso.log.push('Done.'); }
        else paso.log.push('Done.');
      }
      paso.estado = fallo ? 'failed' : 'succeeded'; ps.push(paso);
    }
    ps.push({ nombre: 'Finalize Job', log: ['Cleaning up task key', `Finishing: ${fallo ? 'Job failed' : 'Job succeeded'}`] });
    ps.forEach((x) => { if (!x.estado) x.estado = 'succeeded'; });
    run.pasos = ps; pipe.runs.push(run); guardar();
    setTimeout(() => { run.estado = fallo ? 'failed' : 'succeeded'; run.fin = ahora(); guardar(); evento(fallo ? 'run-fallo' : 'run-ok'); if (/^#\/azure-devops/.test(location.hash)) dibujar(); }, 1800);
    return run;
  }
  function pipelines() {
    const s = st();
    if (ruta[2] === 'nuevo') return pipeNuevo();
    if (ruta[2] && ruta[3] === 'run') return runVer(Number(ruta[2]), Number(ruta[4]));
    if (ruta[2] === 'env') return env();
    if (ruta[2]) return pipeVer(Number(ruta[2]));
    const cuerpo = `<div class="ado-barra"><h1 class="ado-h1">Pipelines</h1><span class="ado-sp"></span>${btn('New pipeline', 'data-nuevo', 'primario')}</div>
      ${s.pipes.length ? `<section class="ado-card"><table class="ado-tabla"><thead><tr><th>Pipeline</th><th>Last run</th></tr></thead><tbody>${s.pipes.map((p) => { const u = p.runs[p.runs.length - 1]; return `<tr><td>${ic('pipelines')} <a href="${PH('pipelines', String(p.id))}">${esc(p.nombre)}</a></td><td>${u ? `${u.estado === 'succeeded' ? ic('ok', 14, 'ado-verde') : u.estado === 'failed' ? ic('mal', 14, 'ado-rojo') : ic('reloj', 14)} #${u.n} · ${esc(u.motivo)} · <code>${esc(u.rama)}</code> · ${hace(u.inicio)}` : '<span class="ado-dim">Never run</span>'}</td></tr>`; }).join('')}</tbody></table></section>`
        : `<section class="ado-card ado-vacio"><h2>Create your first Pipeline</h2><p>Automatiza la build y los tests de tu código. El pipeline se define en un archivo <code>azure-pipelines.yml</code> dentro del repositorio.</p>${btn('Create Pipeline', 'data-nuevo2', 'primario')}</section>`}`;
    main.innerHTML = marco('pipelines', 'pipes', [[PROY, PH()], ['Pipelines', '']], cuerpo); montar();
    main.querySelectorAll('[data-nuevo],[data-nuevo2]').forEach((b) => { b.onclick = () => { location.hash = PH('pipelines', 'nuevo'); }; });
  }
  function pipeNuevo() {
    const s = st(), paso = Number(query.get('p') || 1), n = query.get('repo') || '';
    const pasos = ['Connect', 'Select', 'Configure', 'Review'];
    let cont = '';
    if (paso === 1) cont = `<h2>Where is your code?</h2><div class="ado-opciones"><a class="ado-op" href="${PH('pipelines', 'nuevo')}?p=2">${ic('repos', 22)}<div><b>Azure Repos Git</b> <span class="ado-tag2">YAML</span><p class="ado-dim">Free private Git repositories, pull requests, and code search</p></div></a><div class="ado-op ado-op-off">${ic('repos', 22)}<div><b>GitHub</b> <span class="ado-tag2">YAML</span><p class="ado-dim">Home to the world’s largest community of developers (en la práctica, usa GitHub Actions en la réplica de GitHub)</p></div></div></div>`;
    else if (paso === 2) cont = `<h2>Select a repository</h2><ul class="ado-lista">${s.repos.map((x) => `<li><a href="${PH('pipelines', 'nuevo')}?p=3&repo=${encodeURIComponent(x)}">${ic('repos')} ${esc(x)}</a></li>`).join('')}</ul>`;
    else if (paso === 3) cont = `<h2>Configure your pipeline</h2><div class="ado-opciones"><a class="ado-op" href="${PH('pipelines', 'nuevo')}?p=4&repo=${encodeURIComponent(n)}&t=python">${ic('archivo', 22)}<div><b>Python package</b><p class="ado-dim">Create and test a Python package on multiple Python versions.</p></div></a><a class="ado-op" href="${PH('pipelines', 'nuevo')}?p=4&repo=${encodeURIComponent(n)}&t=starter">${ic('archivo', 22)}<div><b>Starter pipeline</b><p class="ado-dim">Start with a minimal pipeline that you can customize to build and deploy your code.</p></div></a></div>`;
    else {
      const y = query.get('t') === 'starter' ? `trigger:\n- main\n\npool:\n  vmImage: ubuntu-latest\n\nsteps:\n- script: echo Hello, world!\n  displayName: 'Run a one-line script'\n` : YAML_INICIAL;
      cont = `<h2>Review your pipeline YAML</h2><p class="ado-dim"><code>${esc(n)}</code> / <b>azure-pipelines.yml</b> · se guarda como un commit en <code>main</code>.</p><textarea class="ado-in ado-ta ado-yaml" id="adoY" rows="20" spellcheck="false" aria-label="Pipeline YAML">${esc(y)}</textarea><div class="ado-pie">${btn('Save and run', 'id="adoYOk"', 'primario')}</div>`;
    }
    const cuerpo = `<h1 class="ado-h1">New pipeline</h1><ol class="ado-pasos">${pasos.map((t, i) => `<li class="${i + 1 === paso ? 'on' : i + 1 < paso ? 'hecho' : ''}">${t}</li>`).join('')}</ol><section class="ado-card">${cont}</section>`;
    main.innerHTML = marco('pipelines', 'pipes', [[PROY, PH()], ['Pipelines', PH('pipelines')], ['New pipeline', '']], cuerpo); montar();
    const ok = main.querySelector('#adoYOk');
    if (ok) ok.onclick = () => {
      const A = G(), r = repo(n), y = main.querySelector('#adoY').value;
      if (!A || !r) return aviso('No se encontró el repositorio');
      const h = A.nuevoHash(); r.commits[h] = { msg: 'Set up CI with Azure Pipelines', parent: r.branches.main || null, snap: { ...snap(r, 'main'), 'azure-pipelines.yml': y }, author: 'alumno', date: ahora() }; r.branches.main = h;
      try { window.Shell.Machine.save(); } catch (e) { /* nada */ }
      const pipe = { id: (s.pipes.reduce((m, x) => Math.max(m, x.id), 0) || 0) + 1, nombre: n, repo: n, yaml: y, runs: [] }; s.pipes.push(pipe); guardar(); evento('pipe-crear');
      const run = correr(pipe, 'main', 'Manually triggered'); location.hash = PH('pipelines', String(pipe.id), 'run', String(run.n));
    };
  }
  function pipeVer(id) {
    const p = st().pipes.find((x) => x.id === id); if (!p) { location.hash = PH('pipelines'); return; }
    const r = repo(p.repo), yml = snap(r, 'main')['azure-pipelines.yml']; if (yml) p.yaml = yml;
    const cuerpo = `<div class="ado-barra"><h1 class="ado-h1">${esc(p.nombre)}</h1><span class="ado-sp"></span>${btn('Edit', 'data-editar')}${btn(ic('play', 12) + ' Run pipeline', 'data-correr', 'primario')}</div>
      <section class="ado-card"><table class="ado-tabla"><thead><tr><th>Run</th><th>Reason</th><th>Branch</th><th>Started</th></tr></thead><tbody>${p.runs.slice().reverse().map((u) => `<tr><td>${u.estado === 'succeeded' ? ic('ok', 14, 'ado-verde') : u.estado === 'failed' ? ic('mal', 14, 'ado-rojo') : ic('reloj', 14)} <a href="${PH('pipelines', String(p.id), 'run', String(u.n))}">#${u.n}</a></td><td>${esc(u.motivo)}</td><td><code>${esc(u.rama)}</code></td><td>${hace(u.inicio)}</td></tr>`).join('') || '<tr><td colspan="4" class="ado-dim">No runs yet.</td></tr>'}</tbody></table></section>`;
    main.innerHTML = marco('pipelines', 'pipes', [[PROY, PH()], ['Pipelines', PH('pipelines')], [p.nombre, '']], cuerpo); montar();
    main.querySelector('[data-correr]').onclick = () => { const run = correr(p, 'main', 'Manually triggered'); location.hash = PH('pipelines', String(p.id), 'run', String(run.n)); };
    main.querySelector('[data-editar]').onclick = () => modal(`<h2>azure-pipelines.yml</h2><textarea class="ado-in ado-ta ado-yaml" id="adoYE" rows="18" spellcheck="false" aria-label="Pipeline YAML">${esc(p.yaml)}</textarea><div class="ado-modal-b">${btn('Cancel', 'data-cerrar')}${btn('Save', 'id="adoYEok"', 'primario')}</div>`, (m, cerrar) => {
      m.querySelector('#adoYEok').onclick = () => { const A = G(); const y = m.querySelector('#adoYE').value; const h = A.nuevoHash(); r.commits[h] = { msg: 'Update azure-pipelines.yml for Azure Pipelines', parent: r.branches.main, snap: { ...snap(r, 'main'), 'azure-pipelines.yml': y }, author: 'alumno', date: ahora() }; r.branches.main = h; p.yaml = y; guardar(); try { window.Shell.Machine.save(); } catch (e) { /* nada */ } cerrar(); const run = correr(p, 'main', 'Individual CI'); location.hash = PH('pipelines', String(p.id), 'run', String(run.n)); };
    });
  }
  function runVer(id, n) {
    const p = st().pipes.find((x) => x.id === id), u = p && p.runs.find((x) => x.n === n); if (!u) { location.hash = PH('pipelines'); return; }
    const sel = Number(query.get('paso') || u.pasos.findIndex((x) => x.estado === 'failed'));
    const iSel = sel >= 0 ? sel : 0;
    const icono = (e) => (u.estado === 'running' && e !== 'skipped' ? ic('reloj', 14) : e === 'succeeded' ? ic('ok', 14, 'ado-verde') : e === 'failed' ? ic('mal', 14, 'ado-rojo') : '<span class="ado-dim">⊘</span>');
    const cuerpo = `<div class="ado-barra"><h1 class="ado-h1">#${u.n} · ${esc(u.motivo)}</h1><span class="ado-sp"></span><span class="ado-run-e ado-run-${u.estado}">${u.estado === 'running' ? 'Running' : u.estado === 'succeeded' ? 'Success' : 'Failed'}</span></div>
      <p class="ado-dim">${esc(p.nombre)} · <code>${esc(u.rama)}</code> · ${hace(u.inicio)}</p>
      <div class="ado-run"><aside class="ado-card"><h2>Jobs</h2><div class="ado-job">${icono(u.estado === 'running' ? 'running' : u.estado)} <b>Job</b></div><ol class="ado-pasos-run">${u.pasos.map((x, i) => `<li class="${i === iSel ? 'on' : ''}"><a href="${PH('pipelines', String(id), 'run', String(n))}?paso=${i}">${icono(x.estado)} ${esc(x.nombre)}</a></li>`).join('')}</ol></aside>
      <section class="ado-card"><h2>${esc(u.pasos[iSel].nombre)}</h2><pre class="ado-pre ado-log">${u.estado === 'running' ? 'Waiting for the step to start…' : u.pasos[iSel].log.map((l, k) => `<span class="ado-ln">${k + 1}</span>${esc(l).replace(/(##\[error\].*|ERROR:.*|no tests ran.*)/, '<b class="ado-rojo">$1</b>')}`).join('\n')}</pre>
        ${u.estado === 'failed' ? `<div class="ado-bloq"><p>${ic('mal', 14)} <b>El pipeline falló.</b> Lee el paso en rojo: casi siempre es un archivo que falta en el repositorio (por ejemplo, <code>requirements.txt</code> o los tests en <code>tests/test_*.py</code>). Súbelo desde la terminal y el pipeline vuelve a correr solo con el push a main.</p></div>` : ''}</section></div>`;
    main.innerHTML = marco('pipelines', 'pipes', [[PROY, PH()], ['Pipelines', PH('pipelines')], [p.nombre, PH('pipelines', String(id))], ['#' + n, '']], cuerpo); montar();
  }
  function env() {
    main.innerHTML = marco('pipelines', 'env', [[PROY, PH()], ['Pipelines', PH('pipelines')], ['Environments', '']], `<h1 class="ado-h1">Environments</h1><section class="ado-card"><p>Un <b>environment</b> (dev, prod) agrupa los despliegues y puede pedir una <b>aprobación</b> manual antes de pasar a producción. En la práctica, el CI está en Pipelines; los despliegues con aprobación se practican en la réplica de GitHub (Actions con environments).</p></section>`);
    montar();
  }
  function noSim(t, d) { main.innerHTML = marco(ruta[1], '', [[PROY, PH()], [t, '']], `<h1 class="ado-h1">${esc(t)}</h1><section class="ado-card"><p>${d}</p></section>`); montar(); }

  // ------------------------------------------------------------------ router
  function dibujar() {
    if (!ruta.length) return org();
    if (ruta[0] !== PROY) return org();
    const sec = ruta[1] || '';
    if (!sec) return resumen();
    if (sec === 'boards') { if (ruta[2] === 'work') return listaItems(); if (ruta[2] === 'backlog') return backlog(); if (ruta[2] === 'sprints') return sprints(); return tablero(); }
    if (sec === 'workitem') return workItem(ruta[2]);
    if (sec === 'repos') { if (ruta[2] === 'commits') return repoCommits(); if (ruta[2] === 'branches') return repoRamas(); if (ruta[2] === 'prs') return repoPrs(); return repoFiles(); }
    if (sec === 'pipelines') return pipelines();
    if (sec === 'test') return noSim('Test Plans', 'Planes de pruebas manuales y exploratorias. Un equipo de datos rara vez los usa: las pruebas de datos van como código (pytest, dbt test) dentro del pipeline.');
    if (sec === 'artifacts') return noSim('Artifacts', 'Un registro privado de paquetes (pip, npm, NuGet, Maven): por ejemplo, la librería interna de utilidades del equipo de datos.');
    if (sec === 'settings') return noSim('Project settings', 'Equipos, permisos, áreas e iteraciones (sprints), y las conexiones de servicio (service connections) que usa un pipeline para desplegar en Azure sin guardar contraseñas en el YAML.');
    return resumen();
  }
  let escuchando = false;
  function vista(m, ctx, sub) {
    main = m; Store = ctx.Store; toast = ctx.toast || toast;
    ruta = (sub || []).map((x) => { try { return decodeURIComponent(x); } catch (e) { return x; } }).filter(Boolean);
    query = new URLSearchParams(location.hash.split('?')[1] || '');
    if (window.Shell && window.Shell.Machine && !window.Shell.Machine.ready && window.Shell.Machine.load) window.Shell.Machine.load();
    asegurarRepos();
    // un push desde la terminal a un repo de Azure Repos dispara el pipeline con trigger: main
    if (!escuchando && G()) { escuchando = true; G().oyentesPush.push((u, rama) => { const mm = String(u).match(/dev\.azure\.com\/academia\/tienda-andina\/_git\/([\w.-]+)/); if (!mm || !Store) return; const s = st(); if (!s.repos.includes(mm[1])) { s.repos.push(mm[1]); guardar(); } evento('push'); const pipe = s.pipes.find((x) => x.repo === mm[1]); if (pipe && rama === 'main') { const yml = snap(repo(mm[1]), 'main')['azure-pipelines.yml']; if (yml) pipe.yaml = yml; correr(pipe, 'main', 'Individual CI'); } }); }
    document.body.classList.add('ado-abierto');
    dibujar();
  }
  window.addEventListener('hashchange', () => { if (!/^#\/azure-devops/.test(location.hash)) document.body.classList.remove('ado-abierto'); });
  window.AzureDevOps = { vista, estado: () => (Store ? st() : null) };
})();
