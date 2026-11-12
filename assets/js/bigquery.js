/* Réplica de la consola de BigQuery (práctica). Dibujada desde cero siguiendo la documentación pública de
 * Google Cloud: no usa logos, íconos ni código de Google. El SQL corre en el navegador con BigQueryMotor
 * (assets/js/bigquery-motor.js) sobre DuckDB-WASM. */
(function () {
  'use strict';
  const M = () => window.BigQueryMotor;
  let main = null, Store = null, toast = (m) => console.log(m);
  let ruta = [], cm = null, ultimo = null, ocupado = false, tEst = null;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const IC = {
    estudio: '<path d="M4 5h16v14H4z"/><path d="M8 10l3 2-3 2M13 15h3"/>', jobs: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', costo: '<circle cx="12" cy="12" r="9"/><path d="M14.5 9.2c-.5-.8-1.4-1.2-2.5-1.2-1.5 0-2.6.8-2.6 2s1 1.7 2.6 2 2.7.9 2.7 2.1-1.1 2-2.7 2c-1.200 0-2.200-.5-2.700-1.400M12 6.300v1.700M12 16.100v1.700"/>',
    volver: '<path d="M15 6l-6 6 6 6"/>', play: '<path d="M7 4l13 8-13 8z" fill="currentColor"/>', mas: '<path d="M12 5v14M5 12h14"/>', flecha: '<path d="M9 6l6 6-6 6"/>', abajo: '<path d="M6 9l6 6 6-6"/>',
    proyecto: '<path d="M12 3l8 4.500v9L12 21l-8-4.500v-9z"/><path d="M12 12l8-4.500M12 12v9M12 12L4 7.500"/>', dataset: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M3 15h18M9 4v16"/>', tabla: '<rect x="3" y="4" width="18" height="16" rx="1"/><path d="M3 10h18M9 10v10"/>', vista: '<path d="M2 12s3.600-7 10-7 10 7 10 7-3.600 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    ok: '<circle cx="12" cy="12" r="9"/><path d="M8 12.500l2.700 2.700L16 9.500"/>', mal: '<circle cx="12" cy="12" r="9"/><path d="M12 7.500v5.500M12 16.300v.200"/>', subir: '<path d="M12 16V4M6 10l6-6 6 6M4 20h16"/>', basura: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>', part: '<rect x="3" y="4" width="18" height="16" rx="1"/><path d="M3 9h18M3 14h18"/>',
  };
  // íconos Material Symbols (los de la consola de Google Cloud, Apache-2.0); los trazos propios quedan de respaldo
  const MSMAP = { resumen: 'grid_view', lupa: 'search', transferir: 'upload', reloj: 'schedule', dataform: 'schema', compartir: 'share', capacidad: 'monitoring', shell: 'terminal', campana: 'notifications', ayuda: 'help', puntos: 'more_vert', menu: 'menu', estrella: 'star', guardar: 'save', descargar: 'download', cerrar: 'close', estudio: 'query_stats', jobs: 'history', costo: 'payments', volver: 'arrow_back', play: 'play_arrow', mas: 'add', flecha: 'chevron_right', abajo: 'keyboard_arrow_down', proyecto: 'deployed_code', dataset: 'dataset', tabla: 'table', vista: 'visibility', ok: 'check_circle', mal: 'error', subir: 'upload', basura: 'delete', part: 'table_view' };
  const ic = (n, t = 16) => (window.IconosOficiales && MSMAP[n] && window.IconosOficiales.tiene('ms', MSMAP[n]) ? window.IconosOficiales.ms(MSMAP[n], t + 2, 'bq-ic') : icPropio(n, t));
  const icPropio = (n, t = 16) => `<svg class="bq-ic" width="${t}" height="${t}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${(IC[n] || '').replace(/(\d)\.(\d)00\b/g, '$1.$2')}</svg>`;
  const href = (h) => '#/bigquery' + (h ? '/' + h : '');
  // menú de BigQuery agrupado como en la consola (lo que no se simula se explica en una página)
  const NAV = [['resumen', 'Overview', 'resumen', 'resumen'], ['estudio', 'Studio', 'estudio', ''], ['buscar', 'Search', 'lupa', 'buscar'],
    ['#Pipelines and integration'], ['transferencias', 'Data transfers', 'transferir', 'transferencias'], ['programadas', 'Scheduled queries', 'reloj', 'programadas'], ['dataform', 'Dataform', 'dataform', 'dataform'],
    ['#Governance'], ['sharing', 'Sharing (Analytics Hub)', 'compartir', 'sharing'],
    ['#Administration'], ['jobs', 'Jobs explorer', 'jobs', 'jobs'], ['costos', 'Costs (práctica)', 'costo', 'costos'], ['capacidad', 'Capacity management', 'capacidad', 'capacidad']];
  const NO_SIMULADO = {
    resumen: ['Overview', 'La portada de BigQuery: novedades, datasets públicos de ejemplo y accesos rápidos. En la práctica, empieza por Studio.', ''],
    buscar: ['Search', 'Busca tablas, vistas y columnas en todos los proyectos a los que tienes acceso (usa el catálogo de Dataplex). En la práctica, el explorador de Studio tiene un buscador.', ''],
    transferencias: ['Data transfers', 'BigQuery Data Transfer Service copia datos a horario desde Google Ads, YouTube, Cloud Storage, Amazon S3, Teradata y otros, sin escribir código.', ''],
    programadas: ['Scheduled queries', 'Consultas que corren solas a horario y escriben su resultado en una tabla. Es la forma más simple de automatizar un SQL en BigQuery.', ''],
    dataform: ['Dataform', 'Proyectos de transformaciones en SQL (SQLX) con dependencias, pruebas y versiones en Git, como dbt pero dentro de BigQuery.', '#/lab/dbt'],
    sharing: ['Sharing (Analytics Hub)', 'Publica datasets para que otras organizaciones los usen sin copiarlos; ellos los ven como un dataset enlazado de solo lectura.', ''],
    capacidad: ['Capacity management', 'Reservas de slots (modelo de capacidad con ediciones Standard, Enterprise y Enterprise Plus) como alternativa a pagar por bytes procesados.', '#/bigquery/costos'],
  };

  function vista(m, ctx, sub) {
    main = m; Store = ctx.Store; toast = ctx.toast || toast; ruta = (sub || []).map(decodeURIComponent);
    M().conectar(Store); document.body.classList.add('bq-abierto');
    dibujar();
  }
  function marco(contenido, seccion) {
    return `<div class="bqp" id="bqp"><header class="bq-top"><button class="bq-icono bq-top-ic" title="Navigation menu">${ic('menu', 20)}</button><b class="bq-marca">Google Cloud</b><span class="bq-tag">práctica</span><button class="bq-proy" title="Select a project">${ic('proyecto', 15)} ${esc(M().PROYECTO)} ${ic('abajo', 14)}</button>
      <label class="bq-gbuscar">${ic('lupa', 18)}<input placeholder="Search (/) for resources, docs, products, and more" aria-label="Search" id="bqGBuscar"></label><span class="bq-sp"></span>
      <button class="bq-icono bq-top-ic" title="Activate Cloud Shell (en la práctica: la terminal del curso)" data-ir="#/lab/terminal">${ic('shell', 20)}</button><button class="bq-icono bq-top-ic" title="Notifications">${ic('campana', 20)}</button><button class="bq-icono bq-top-ic" title="Help">${ic('ayuda', 20)}</button><button class="bq-icono bq-top-ic" title="More">${ic('puntos', 20)}</button><span class="bq-avatar" title="alumno@academia.dev">A</span></header>
      <div class="bq-cuerpo"><aside class="bq-nav"><div class="bq-nav-prod">BigQuery</div><nav>${NAV.map(([id, t, i, h]) => (id[0] === '#' ? `<div class="bq-nav-sec">${id.slice(1)}</div>` : `<a class="bq-nav-i${seccion === id ? ' on' : ''}" href="${href(h)}">${ic(i, 18)}<span>${t}</span></a>`)).join('')}</nav><a class="bq-nav-i bq-curso" href="#/herramientas">${ic('volver', 18)}<span>Curso</span></a></aside>
      <main class="bq-main">${contenido}</main></div><div class="bq-modal" id="bqModal" hidden></div></div>`;
  }
  function noSimulado(id) {
    const [t, txt, enlace] = NO_SIMULADO[id];
    main.innerHTML = marco(`<section class="bq-pag"><h1>${esc(t)}</h1><div class="bq-aviso">${ic('ok')} <div><b>Esta sección no está simulada.</b> ${esc(txt)}</div></div>${enlace ? `<p><a class="bq-btn" href="${enlace}">Ir a lo que sí puedes practicar</a></p>` : ''}</section>`, id);
    montarTop();
  }
  function montarTop() {
    main.querySelectorAll('[data-ir]').forEach((b) => (b.onclick = () => { location.hash = b.dataset.ir; }));
    const gb = main.querySelector('#bqGBuscar'); if (gb) gb.onkeydown = (e) => { if (e.key === 'Enter') { const q = gb.value.trim().toLowerCase(); if (!q) return; const hit = NAV.find((n) => n[1] && n[1].toLowerCase().includes(q)); if (hit) location.hash = href(hit[3]); else toast('En la práctica, el buscador solo encuentra secciones de BigQuery'); } };
  }
  function dibujar() {
    const r = ruta[0] || '';
    if (NO_SIMULADO[r]) return noSimulado(r);
    setTimeout(montarTop, 0);
    if (r === 'jobs') return jobs();
    if (r === 'costos') return costos();
    return estudio();
  }

  // ------------------------------------------------------------------ Studio: explorador + (editor | tabla | dataset)
  function estudio() {
    const s = M().st(); const r = ruta[0] || '';
    let q = s.consultas.find((x) => x.id === (r === 'q' ? ruta[1] : s.actual)) || s.consultas[s.consultas.length - 1];
    const panel = r === 't' ? '<section class="bq-pag" id="bqDet"></section>' : r === 'd' ? '<section class="bq-pag" id="bqDet"></section>' : `<section class="bq-ed-zona">
        <div class="bq-pestanas">${s.consultas.map((x) => `<a class="bq-pest${x.id === q.id ? ' on' : ''}" href="${href('q/' + x.id)}" title="${esc(x.nombre)}">${ic('estudio', 14)}<span>${esc(x.nombre)}</span>${s.consultas.length > 1 ? `<button class="bq-pest-x" data-cerrar="${x.id}" title="Close tab">${ic('cerrar', 14)}</button>` : ''}</a>`).join('')}<button class="bq-icono" id="bqNueva" title="SQL query (nueva pestaña)">${ic('mas')}</button></div>
        <div class="bq-hoja-bar"><button class="bq-icono" id="bqRen" title="Cambiar el nombre">✎</button>
          <button class="bq-btn bq-pri" id="bqRun" title="Ejecutar (Ctrl+Enter)">${ic('play', 13)} Run</button><button class="bq-btn bq-sec" id="bqGuardar" title="Save query">${ic('guardar', 15)} Save</button><button class="bq-btn bq-sec" id="bqCompartir" title="Copy link">${ic('compartir', 15)} Share</button><button class="bq-btn bq-sec" data-ir="#/bigquery/programadas" title="Schedule">${ic('reloj', 15)} Schedule</button><span class="bq-sp"></span><span class="bq-valida" id="bqVal"><span class="bq-spin"></span> Cargando el motor…</span></div>
        <div class="bq-editor" id="bqEd"></div><div class="bq-res" id="bqRes"><div class="bq-res-vacio">Escribe una consulta y mira arriba a la derecha <b>cuántos datos va a procesar</b> antes de ejecutarla. <b>Ctrl+Enter</b> la ejecuta.</div></div></section>`;
    main.innerHTML = marco(`<div class="bq-estudio"><aside class="bq-arbol" id="bqArbol"><div class="bq-dim bq-pad">Cargando…</div></aside>${panel}</div>`, 'estudio');
    M().init((t) => { const a = main.querySelector('#bqArbol'); if (a) a.innerHTML = `<div class="bq-dim bq-pad">${esc(t)}</div>`; const v = main.querySelector('#bqVal'); if (v) v.innerHTML = `<span class="bq-spin"></span> ${esc(t)}`; }).then(() => { arbol(); if (r === 't') tabla(ruta[1], ruta[2]); else if (r === 'd') dataset(ruta[1]); else validar(); }).catch((e) => { const a = main.querySelector('#bqArbol'); if (a) a.innerHTML = `<div class="bq-err bq-pad">${esc(e.message)}</div>`; });
    if (r === 't' || r === 'd') return;
    s.actual = q.id;
    const ed = main.querySelector('#bqEd');
    if (window.CodeMirror) {
      cm = window.CodeMirror(ed, { value: q.sql, mode: 'text/x-sql', lineNumbers: true, indentUnit: 2, matchBrackets: true, autoCloseBrackets: true, extraKeys: { 'Ctrl-Enter': () => correr(), 'Cmd-Enter': () => correr(), 'Ctrl-/': 'toggleComment', 'Cmd-/': 'toggleComment' } });
      cm.on('change', () => { q.sql = cm.getValue(); Store.saveSoon ? Store.saveSoon() : Store.save(); clearTimeout(tEst); tEst = setTimeout(validar, 450); });
      setTimeout(() => cm.refresh(), 0);
    } else { ed.innerHTML = `<textarea class="bq-ta" spellcheck="false">${esc(q.sql)}</textarea>`; const ta = ed.firstChild; cm = { getValue: () => ta.value, getSelection: () => ta.value.slice(ta.selectionStart, ta.selectionEnd), setValue: (v) => { ta.value = v; } }; ta.addEventListener('input', () => { q.sql = ta.value; Store.save(); clearTimeout(tEst); tEst = setTimeout(validar, 450); }); }
    main.querySelector('#bqRun').onclick = correr;
    main.querySelector('#bqGuardar').onclick = () => { Store.save(); toast(`Consulta "${q.nombre}" guardada (en tu navegador)`); };
    main.querySelector('#bqCompartir').onclick = () => { try { navigator.clipboard.writeText(location.href); } catch (e) { /* sin portapapeles */ } toast('Enlace copiado. En BigQuery real, compartir una consulta guardada usa permisos de IAM.'); };
    main.querySelectorAll('[data-cerrar]').forEach((b) => (b.onclick = (e) => { e.preventDefault(); e.stopPropagation(); const i = s.consultas.findIndex((x) => x.id === b.dataset.cerrar); if (i < 0 || s.consultas.length < 2) return; s.consultas.splice(i, 1); if (s.actual === b.dataset.cerrar) s.actual = s.consultas[Math.max(0, i - 1)].id; Store.save(); location.hash = href('q/' + s.actual); estudio(); }));
    main.querySelector('#bqNueva').onclick = () => nuevaConsulta('');
    main.querySelector('#bqRen').onclick = () => { const n = prompt('Nombre de la consulta', q.nombre); if (n && n.trim()) { q.nombre = n.trim(); Store.save(); estudio(); } };
    if (ultimo && ultimo.q === q.id) mostrar(ultimo.rs);
  }
  function nuevaConsulta(sql, nombre) {
    const s = M().st(); const id = 'q' + Date.now().toString(36);
    s.consultas.push({ id, nombre: nombre || `Consulta ${s.consultas.length + 1}`, sql: sql || '', creada: Date.now() }); s.actual = id; Store.save();
    location.hash = href('q/' + id);
  }
  // el "dry run": cuántos bytes procesaría la consulta, sin ejecutarla (y sin costo)
  async function validar() {
    const v = main && main.querySelector('#bqVal'); if (!v || !cm) return;
    const sql = (cm.getSelection && cm.getSelection().trim()) || cm.getValue();
    const partes = M().partir(sql);
    if (!partes.length) { v.className = 'bq-valida'; v.textContent = ''; return; }
    try {
      let total = 0; const notas = [];
      for (const p of partes) { const e = await M().estimar(p); total += e.bytes || 0; for (const t of e.tablas || []) { if (t.todas) notas.push(`${t.tabla}: lee todas las columnas`); if (t.particion && t.fraccion < 1) notas.push(`${t.tabla}: ${Math.round(t.fraccion * 100)} % de las particiones`); else if (t.particion && t.columnas.length) notas.push(`${t.tabla}: sin filtro por ${t.particion}, lee todas las particiones`); } }
      v.className = 'bq-valida ok'; v.title = notas.join('\n');
      v.innerHTML = `${ic('ok', 15)} This query will process <b>${M().fmtBytes(total)}</b> when run.`;
    } catch (e) { v.className = 'bq-valida mal'; v.title = e.message; v.innerHTML = `${ic('mal', 15)} ${esc(e.message.split('\n')[0].slice(0, 110))}`; }
  }
  async function correr() {
    if (ocupado) return; const sql = (cm.getSelection && cm.getSelection().trim()) || cm.getValue();
    if (!M().partir(sql).length) { toast('No hay ninguna consulta para ejecutar'); return; }
    ocupado = true; const res = main.querySelector('#bqRes'); res.innerHTML = '<div class="bq-res-vacio"><span class="bq-spin"></span> Running…</div>'; const btn = main.querySelector('#bqRun'); btn.disabled = true;
    try {
      const rs = await M().ejecutar(sql);
      ultimo = { q: M().st().actual, rs }; mostrar(rs);
      if (rs.some((r) => !r.error && /^(CREATE|DROP|ALTER)\b/i.test(r.sql.trim()))) arbol();
    } catch (e) { res.innerHTML = `<div class="bq-err-caja">${esc(e.message)}</div>`; }
    ocupado = false; btn.disabled = false; validar();
  }
  function infoJob(j) {
    const M0 = M(); const porTabla = (j.tablas || []).map((t) => `<li><code>${esc(t.tabla)}</code>: ${t.todas ? 'todas las columnas' : t.columnas + ' columna' + (t.columnas === 1 ? '' : 's')}${t.particion ? ` · ${Math.round((t.fraccionReal !== undefined ? t.fraccionReal : t.fraccion) * 100)} % de la tabla (partición por ${esc(t.particion)}${t.fraccionReal < t.fraccion ? ' + clustering' : ''})` : ''}</li>`).join('');
    return `<aside class="bq-det"><div class="bq-det-t">Job information</div><dl><dt>Job ID</dt><dd><code>${esc(j.id)}</code></dd><dt>Bytes processed</dt><dd><b>${M0.fmtBytes(j.procesado)}</b>${j.cache ? ' <span class="bq-chip on">results cached</span>' : ''}</dd><dt>Bytes billed</dt><dd>${M0.fmtBytes(j.facturado)}</dd><dt>Costo on-demand</dt><dd>USD ${M0.costo(j.facturado).toFixed(6)}</dd><dt>Duration</dt><dd>${j.ms} ms</dd><dt>Rows</dt><dd>${j.filas}</dd></dl>${porTabla ? `<div class="bq-det-t" style="margin-top:12px">Qué se leyó</div><ul class="bq-leido">${porTabla}</ul>` : ''}${j.cache ? '<p class="bq-dim">La misma consulta, sin cambios en las tablas, se responde desde la caché: no procesa ni cobra nada.</p>' : j.facturado && j.procesado < M0.MIN_FACTURADO ? '<p class="bq-dim">Se factura un mínimo de 10 MB por consulta.</p>' : ''}</aside>`;
  }
  function mostrar(rs) {
    const res = main.querySelector('#bqRes'); if (!res) return;
    const r = rs[rs.length - 1];
    const varias = rs.length > 1 ? `<div class="bq-res-varias">${rs.length} sentencias${rs.some((x) => x.error) ? ' · se detuvo en el error' : ''} · total procesado ${M().fmtBytes(rs.reduce((a, x) => a + x.job.procesado, 0))}</div>` : '';
    if (r.error) { res.innerHTML = `${varias}<div class="bq-err-caja"><b>Error</b><pre>${esc(r.error.message)}</pre></div>`; return; }
    if (!r.r.values) { res.innerHTML = `${varias}<div class="bq-res-fila"><div class="bq-res-ok">${ic('ok')} ${esc(r.r.estado)}</div>${infoJob(r.job)}</div>`; return; }
    const max = 1000, vals = r.r.values.slice(0, max);
    res.innerHTML = `${varias}<div class="bq-res-fila"><div class="bq-grid-caja"><table class="bq-grid"><thead><tr><th class="bq-n">Row</th>${r.r.columns.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${vals.map((f, i) => `<tr><td class="bq-n">${i + 1}</td>${f.map((v) => `<td class="${typeof v === 'number' ? 'bq-num' : ''}">${v === null ? '<span class="bq-null">null</span>' : esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table>${r.r.values.length > max ? `<div class="bq-dim bq-pad">Mostrando ${max} de ${r.r.values.length} filas</div>` : ''}</div>${infoJob(r.job)}</div>`;
  }

  // ------------------------------------------------------------------ explorador
  async function arbol() {
    const el = main.querySelector('#bqArbol'); if (!el) return; const s = M().st();
    let html = `<div class="bq-arbol-t">Explorer<button class="bq-icono" id="bqAdd" title="Crear un dataset">${ic('mas', 14)}</button></div><div class="bq-nodo" style="cursor:default">${ic('abajo', 12)}${ic('proyecto', 14)}<span><b>${esc(M().PROYECTO)}</b></span></div>`;
    for (const d of await M().datasets()) {
      const ab = s.abiertos[d];
      html += `<div class="bq-nodo bq-n2" data-ds="${esc(d)}">${ic(ab ? 'abajo' : 'flecha', 12)}${ic('dataset', 14)}<span>${esc(d)}</span><a class="bq-nodo-ir" href="${href('d/' + d)}" title="Abrir el dataset">↗</a></div>`;
      if (!ab) continue;
      const ts = await M().tablas(d);
      for (const t of ts) html += `<a class="bq-nodo bq-n3" href="${href(`t/${d}/${t.nombre}`)}">${ic(t.vista ? 'vista' : (s.meta[`${d}.${t.nombre}`] || {}).particion ? 'part' : 'tabla', 14)}<span>${esc(t.nombre)}</span></a>`;
      if (!ts.length) html += '<div class="bq-nodo bq-n3 bq-dim">(sin tablas)</div>';
    }
    el.innerHTML = html;
    el.querySelectorAll('[data-ds]').forEach((n) => n.onclick = (e) => { if (e.target.closest('a')) return; s.abiertos[n.dataset.ds] = !s.abiertos[n.dataset.ds]; Store.save(); arbol(); });
    el.querySelector('#bqAdd').onclick = async () => { const n = prompt('Dataset ID (letras, números y guion bajo)', 'analitica'); if (!n) return; const rs = await M().ejecutar(`CREATE SCHEMA ${n.trim()}`); if (rs[0].error) toast(rs[0].error.message); else { s.abiertos[n.trim()] = true; toast('Dataset creado'); arbol(); } };
  }
  const grid = (r) => `<div class="bq-grid-caja bq-grid-alta"><table class="bq-grid"><thead><tr><th class="bq-n">Row</th>${r.columns.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${r.values.map((f, i) => `<tr><td class="bq-n">${i + 1}</td>${f.map((v) => `<td class="${typeof v === 'number' ? 'bq-num' : ''}">${v === null ? '<span class="bq-null">null</span>' : esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  async function tabla(ds, t) {
    const det = main.querySelector('#bqDet'); const s = M().st(); const meta = s.meta[`${ds}.${t}`] || {};
    let T; try { T = await M().tamanos(ds, t); } catch (e) { det.innerHTML = `<div class="bq-err-caja">${esc(e.message)}</div>`; return; }
    if (!T.cols.length) { det.innerHTML = `<p>La tabla <code>${esc(ds)}.${esc(t)}</code> no existe.</p><a class="bq-btn" href="${href()}">Volver al editor</a>`; return; }
    det.innerHTML = `<div class="bq-miga">${esc(M().PROYECTO)} / <a href="${href('d/' + ds)}">${esc(ds)}</a> / <b>${esc(t)}</b></div><div class="bq-cab"><h1>${ic(meta.particion ? 'part' : 'tabla', 20)} ${esc(t)}</h1><span class="bq-sp"></span><button class="bq-btn bq-pri" id="bqQ">Query</button><button class="bq-btn" id="bqDrop">${ic('basura')} Delete</button></div>
      <div class="bq-tabs"><button class="on" data-tab="schema">Schema</button><button data-tab="details">Details</button><button data-tab="preview">Preview</button></div><div id="bqTab"></div>`;
    const maxB = Math.max(1, ...Object.values(T.bytes));
    const pinta = async (tab) => {
      det.querySelectorAll('.bq-tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab)); const box = det.querySelector('#bqTab');
      if (tab === 'schema') box.innerHTML = `<table class="bq-tabla"><thead><tr><th>Field name</th><th>Type</th><th>Mode</th><th>Tamaño de la columna</th></tr></thead><tbody>${T.cols.map((c) => `<tr><td><b>${esc(c.nombre)}</b>${meta.particion && meta.particion.col === c.nombre ? ' <span class="bq-chip on">partición</span>' : ''}${(meta.cluster || []).includes(c.nombre) ? ' <span class="bq-chip">clustering</span>' : ''}</td><td><code>${esc(c.tipo)}</code></td><td>${c.nulo ? 'NULLABLE' : 'REQUIRED'}</td><td><span class="bq-barra"><i style="width:${Math.round(T.bytes[c.nombre] / maxB * 100)}%"></i></span> ${M().fmtBytes(T.bytes[c.nombre])}</td></tr>`).join('')}</tbody></table><p class="bq-dim">BigQuery guarda cada columna por separado. Una consulta solo paga las columnas que nombra: por eso <code>SELECT *</code> es lo más caro.</p>`;
      else if (tab === 'details') box.innerHTML = `<dl class="bq-dl"><dt>Table ID</dt><dd><code>${esc(M().PROYECTO)}.${esc(ds)}.${esc(t)}</code></dd><dt>Number of rows</dt><dd>${T.filas.toLocaleString('en')}</dd><dt>Total logical bytes</dt><dd>${M().fmtBytes(T.total)}</dd><dt>Table type</dt><dd>${meta.particion ? 'Partitioned' : 'Table'}</dd><dt>Partitioned by</dt><dd>${meta.particion ? `${esc(meta.particion.tipo)} · field <code>${esc(meta.particion.col)}</code>` : '—'}</dd><dt>Partition filter</dt><dd>${meta.requiereFiltro ? 'Required' : 'Not required'}</dd><dt>Clustered by</dt><dd>${(meta.cluster || []).length ? meta.cluster.map((c) => `<code>${esc(c)}</code>`).join(', ') : '—'}</dd><dt>Data location</dt><dd>US</dd>${meta.descripcion ? `<dt>Description</dt><dd>${esc(meta.descripcion)}</dd>` : ''}</dl>`;
      else { box.innerHTML = '<p class="bq-dim"><span class="bq-spin"></span> Cargando…</p>'; const r = await M().vistaPrevia(ds, t, 50); box.innerHTML = `<p class="bq-dim">La pestaña Preview es <b>gratis</b>: no ejecuta una consulta. En cambio, <code>SELECT * … LIMIT 10</code> procesa (y cobra) la tabla entera.</p>${grid(r)}`; }
    };
    det.querySelectorAll('.bq-tabs button').forEach((b) => b.onclick = () => pinta(b.dataset.tab));
    det.querySelector('#bqQ').onclick = () => nuevaConsulta(`SELECT ${T.cols.slice(0, 3).map((c) => c.nombre).join(', ')}\nFROM \`${M().PROYECTO}.${ds}.${t}\`${meta.particion ? `\nWHERE ${meta.particion.col} >= '2024-01-01'` : ''}\nLIMIT 100;\n`, `Consulta sobre ${t}`);
    det.querySelector('#bqDrop').onclick = async () => { if (!confirm(`¿Borrar la tabla ${ds}.${t}?`)) return; const rs = await M().ejecutar(`DROP TABLE ${ds}.${t}`); if (rs[0].error) toast(rs[0].error.message); else location.hash = href('d/' + ds); };
    pinta('schema');
  }
  async function dataset(ds) {
    const det = main.querySelector('#bqDet'); const s = M().st();
    if (!(await M().datasets()).includes(ds)) { det.innerHTML = `<p>El dataset <code>${esc(ds)}</code> no existe.</p>`; return; }
    const ts = await M().tablas(ds); const filas = [];
    for (const t of ts) { const T = t.vista ? null : await M().tamanos(ds, t.nombre); const meta = s.meta[`${ds}.${t.nombre}`] || {}; filas.push(`<tr><td><a href="${href(`t/${ds}/${t.nombre}`)}">${ic(t.vista ? 'vista' : meta.particion ? 'part' : 'tabla')} ${esc(t.nombre)}</a></td><td>${t.vista ? 'View' : meta.particion ? 'Partitioned table' : 'Table'}</td><td class="bq-der">${T ? T.filas.toLocaleString('en') : '—'}</td><td class="bq-der">${T ? M().fmtBytes(T.total) : '—'}</td></tr>`); }
    det.innerHTML = `<div class="bq-miga">${esc(M().PROYECTO)} / <b>${esc(ds)}</b></div><div class="bq-cab"><h1>${ic('dataset', 20)} ${esc(ds)}</h1><span class="bq-sp"></span><button class="bq-btn bq-pri" id="bqCrear">${ic('subir')} Create table</button>${ds !== 'tienda' ? `<button class="bq-btn" id="bqDropDs">${ic('basura')} Delete</button>` : ''}</div>
      <p class="bq-dim">Un <b>dataset</b> agrupa tablas y vistas, y define dónde viven (la región) y quién puede usarlas. El nombre completo de una tabla es <code>proyecto.dataset.tabla</code>.</p>
      ${filas.length ? `<table class="bq-tabla"><thead><tr><th>Table</th><th>Type</th><th class="bq-der">Rows</th><th class="bq-der">Size</th></tr></thead><tbody>${filas.join('')}</tbody></table>` : '<div class="bq-vacio">Este dataset no tiene tablas. Crea una con <b>Create table</b> o con <code>CREATE TABLE</code> en el editor.</div>'}`;
    det.querySelector('#bqCrear').onclick = () => modalCrear(ds);
    const dd = det.querySelector('#bqDropDs'); if (dd) dd.onclick = async () => { if (!confirm(`¿Borrar el dataset ${ds} y todas sus tablas?`)) return; const rs = await M().ejecutar(`DROP SCHEMA ${ds} CASCADE`); if (rs[0].error) toast(rs[0].error.message); else location.hash = href(); };
  }
  function modalCrear(ds) {
    const m = main.querySelector('#bqModal');
    m.innerHTML = `<div class="bq-modal-c bq-form"><div class="bq-cab"><h2>Create table</h2><span class="bq-sp"></span><button class="bq-icono" data-cerrar>✕</button></div>
      <label>Create table from<select id="ctOrigen"><option value="archivo">Upload (CSV o JSON por líneas)</option><option value="ejemplo">Archivo de ejemplo del curso (eventos de la app)</option></select></label>
      <label id="ctArch">Select file<input type="file" id="ctFile" accept=".csv,.json,.jsonl,.txt"></label>
      <label>Dataset<input value="${esc(ds)}" disabled></label><label>Table<input id="ctTabla" placeholder="eventos_app"></label>
      <label>Partitioning (opcional): columna de fecha<input id="ctPart" placeholder="por ejemplo: fecha"></label>
      <p class="bq-dim">Schema: <b>Auto detect</b>. Cargar datos (un <i>load job</i>) no tiene costo de consulta en BigQuery; se paga el almacenamiento.</p>
      <div class="bq-acciones"><button class="bq-btn" data-cerrar>Cancel</button><button class="bq-btn bq-pri" id="ctOk">Create table</button></div></div>`;
    m.hidden = false;
    m.querySelectorAll('[data-cerrar]').forEach((x) => x.onclick = () => { m.hidden = true; });
    const origen = m.querySelector('#ctOrigen'); origen.onchange = () => { m.querySelector('#ctArch').hidden = origen.value !== 'archivo'; if (origen.value === 'ejemplo' && !m.querySelector('#ctTabla').value) { m.querySelector('#ctTabla').value = 'eventos_app'; m.querySelector('#ctPart').value = 'fecha'; } };
    m.querySelector('#ctFile').onchange = (e) => { const f = e.target.files[0]; if (f && !m.querySelector('#ctTabla').value) m.querySelector('#ctTabla').value = f.name.replace(/\.[^.]+$/, '').replace(/\W+/g, '_').toLowerCase(); };
    m.querySelector('#ctOk').onclick = async () => {
      const tablaN = m.querySelector('#ctTabla').value.trim(); if (!tablaN) { toast('Escribe el nombre de la tabla'); return; }
      let nombre, texto;
      if (origen.value === 'ejemplo') { nombre = 'eventos_app.csv'; texto = ejemplo(); } else { const f = m.querySelector('#ctFile').files[0]; if (!f) { toast('Elige un archivo'); return; } nombre = f.name; texto = await f.text(); }
      try { const j = await M().cargarArchivo(ds, tablaN, nombre, texto, { particion: m.querySelector('#ctPart').value.trim() || null }); m.hidden = true; toast(`Tabla creada: ${j.filas} filas`); location.hash = href(`t/${ds}/${tablaN}`); arbol(); } catch (e) { toast(e.message); }
    };
  }
  function ejemplo() { // 600 eventos en 60 días: sirve para practicar particiones
    const ev = ['login', 'ver_producto', 'agregar_carrito', 'compra', 'logout'], pl = ['android', 'ios', 'web']; const L = ['evento_id,usuario_id,evento,plataforma,fecha'];
    let x = 7; const rnd = () => { x = (x * 16807) % 2147483647; return x / 2147483647; };
    for (let i = 1; i <= 600; i++) { const d = new Date(Date.UTC(2026, 0, 1 + Math.floor(rnd() * 60))); L.push(`${i},${1 + Math.floor(rnd() * 80)},${ev[Math.floor(rnd() * ev.length)]},${pl[Math.floor(rnd() * pl.length)]},${d.toISOString().slice(0, 10)}`); }
    return L.join('\n') + '\n';
  }

  // ------------------------------------------------------------------ Job history y costos
  function jobs() {
    const s = M().st();
    main.innerHTML = marco(`<div class="bq-pag"><h1>Job history</h1><p class="bq-dim">Cada consulta o carga es un <b>job</b>. Aquí ves quién lo corrió, cuánto procesó, cuánto se facturó y si salió de la caché. Es donde se buscan las consultas caras.</p>
      ${s.jobs.length ? `<table class="bq-tabla bq-hist"><thead><tr><th>Status</th><th>Type</th><th>Query</th><th class="bq-der">Processed</th><th class="bq-der">Billed</th><th class="bq-der">Duration</th><th>Created</th></tr></thead><tbody>${s.jobs.map((j, i) => `<tr data-i="${i}"><td><span class="bq-estado ${j.estado === 'FAILED' ? 'mal' : 'bien'}">${j.estado === 'FAILED' ? '✕ Failed' : '✓ Done'}</span></td><td>${esc(j.tipo)}</td><td class="bq-sqlcorto"><code>${esc(j.sql.replace(/\s+/g, ' ').slice(0, 80))}</code></td><td class="bq-der">${j.cache ? '<span class="bq-chip on">cache</span>' : M().fmtBytes(j.procesado)}</td><td class="bq-der">${M().fmtBytes(j.facturado)}</td><td class="bq-der">${j.ms} ms</td><td class="bq-dim">${hace(j.inicio)}</td></tr>`).join('')}</tbody></table>` : '<div class="bq-vacio">Todavía no ejecutaste nada.</div>'}</div>`, 'jobs');
    main.querySelectorAll('tr[data-i]').forEach((tr) => tr.onclick = () => {
      const j = s.jobs[tr.dataset.i]; const m = main.querySelector('#bqModal');
      m.innerHTML = `<div class="bq-modal-c"><div class="bq-cab"><h2>Job ${esc(j.id)}</h2><span class="bq-sp"></span><button class="bq-icono" data-cerrar>✕</button></div><pre class="bq-codigo">${esc(j.sql)}</pre>${j.error ? `<div class="bq-err-caja"><pre>${esc(j.error)}</pre></div>` : ''}${infoJob(j).replace('<aside class="bq-det">', '<div class="bq-det bq-det-ancho">').replace('</aside>', '</div>')}<div class="bq-acciones"><button class="bq-btn bq-pri" data-abrir>Open as new query</button></div></div>`;
      m.hidden = false; m.querySelector('[data-cerrar]').onclick = () => { m.hidden = true; }; m.onclick = (e) => { if (e.target === m) m.hidden = true; };
      m.querySelector('[data-abrir]').onclick = () => { m.hidden = true; nuevaConsulta(j.sql + ';\n', 'Desde el historial'); };
    });
  }
  function costos() {
    const s = M().st(); const M0 = M(); const q = s.jobs.filter((j) => j.tipo === 'QUERY' && j.estado === 'DONE');
    const proc = q.reduce((a, j) => a + j.procesado, 0), fact = q.reduce((a, j) => a + j.facturado, 0), enCache = q.filter((j) => j.cache).length;
    const caras = [...q].sort((a, b) => b.procesado - a.procesado).slice(0, 5).filter((j) => j.procesado);
    const escala = 10000;
    main.innerHTML = marco(`<div class="bq-pag"><h1>Costos</h1>
      <div class="bq-aviso">${ic('costo')} <div>En el modelo <b>on-demand</b>, BigQuery cobra por los <b>bytes que procesa cada consulta</b> (USD ${M0.USD_POR_TIB} por TiB; el primer TiB de cada mes es gratis), no por el tiempo ni por las filas que devuelve. Solo cuentan las columnas que la consulta nombra y las particiones que el filtro deja pasar. El almacenamiento se paga aparte.</div></div>
      <div class="bq-kpis"><div><small>Bytes procesados (práctica)</small><b>${M0.fmtBytes(proc)}</b></div><div><small>Bytes facturados</small><b>${M0.fmtBytes(fact)}</b><small class="bq-dim">mínimo 10 MB por consulta</small></div><div><small>Costo on-demand</small><b>USD ${M0.costo(fact).toFixed(5)}</b></div><div><small>Consultas desde la caché</small><b>${enCache} de ${q.length}</b></div></div>
      <h2>Tus consultas más caras</h2>${caras.length ? `<table class="bq-tabla"><thead><tr><th>Query</th><th class="bq-der">Processed</th><th class="bq-der">Si las tablas fueran ${escala.toLocaleString('es')} veces más grandes</th></tr></thead><tbody>${caras.map((j) => `<tr><td class="bq-sqlcorto"><code>${esc(j.sql.replace(/\s+/g, ' ').slice(0, 90))}</code>${j.estrella ? ' <span class="bq-chip">SELECT *</span>' : ''}</td><td class="bq-der">${M0.fmtBytes(j.procesado)}</td><td class="bq-der">${M0.fmtBytes(j.procesado * escala)} · USD ${M0.costo(j.procesado * escala).toFixed(2)}</td></tr>`).join('')}</tbody></table><p class="bq-dim">Las tablas de práctica son chicas, así que el costo real es de centésimas de centavo. La última columna muestra cuánto costaría la misma consulta sobre una tabla de tamaño de empresa.</p>` : '<div class="bq-vacio">Ejecuta algunas consultas y vuelve.</div>'}
      <h2>Cómo gastar menos</h2><table class="bq-tabla"><thead><tr><th>Hábito</th><th>Por qué</th></tr></thead><tbody>
        <tr><td>Nombra solo las columnas que necesitas</td><td>Cada columna se guarda y se cobra por separado. <code>SELECT *</code> lee todas.</td></tr>
        <tr><td>Filtra por la columna de partición</td><td>Las particiones que no pasan el filtro no se leen. Envolver la columna en una función (<code>EXTRACT(YEAR FROM fecha)</code>) impide la poda.</td></tr>
        <tr><td>No confíes en <code>LIMIT</code></td><td><code>LIMIT 10</code> recorta el resultado, no lo que se procesa. Para mirar una tabla, usa la pestaña Preview (gratis).</td></tr>
        <tr><td>Mira la estimación antes de ejecutar</td><td>El validador del editor hace un <i>dry run</i>: dice los bytes sin gastar nada.</td></tr>
        <tr><td>Usa clustering en las columnas que más filtras</td><td>Ordena los datos dentro de cada partición para saltar bloques. No baja la estimación, sí lo que se cobra.</td></tr>
        <tr><td>Exige el filtro de partición en tablas grandes</td><td><code>OPTIONS(require_partition_filter = TRUE)</code> rechaza la consulta que olvidó el filtro.</td></tr></tbody></table></div>`, 'costos');
  }
  function hace(t) { const s = Math.round((Date.now() - t) / 1000); if (s < 60) return 'hace unos segundos'; if (s < 3600) return `hace ${Math.round(s / 60)} min`; if (s < 86400) return `hace ${Math.round(s / 3600)} h`; return new Date(t).toLocaleDateString('es'); }

  window.addEventListener('hashchange', () => { if (!/^#\/bigquery/.test(location.hash)) document.body.classList.remove('bq-abierto'); });
  window.BigQueryPractica = { vista };
})();
