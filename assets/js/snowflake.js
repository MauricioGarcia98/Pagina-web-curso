/* Réplica de Snowsight, la interfaz web de Snowflake (práctica). Dibujada desde cero siguiendo la documentación
 * pública de Snowflake: no usa logos, íconos ni código de Snowflake. El SQL corre en el navegador con
 * SnowflakeMotor (assets/js/snowflake-motor.js) sobre DuckDB-WASM. */
(function () {
  'use strict';
  const M = () => window.SnowflakeMotor;
  let main = null, Store = null, toast = (m) => console.log(m);
  let ruta = [], cm = null, ultimo = null, ocupado = false, reloj = null;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const IC = {
    home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
    hoja: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h5"/>',
    datos: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
    historial: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    wh: '<rect x="3" y="4" width="18" height="6" rx="1"/><rect x="3" y="14" width="18" height="6" rx="1"/><path d="M7 7h.01M7 17h.01"/>',
    roles: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5M16 4.5a3.5 3.5 0 0 1 0 7M18.5 14.8c1.6.8 2.7 2.6 3 5.2"/>',
    play: '<path d="M7 4l13 8-13 8z" fill="currentColor"/>', mas: '<path d="M12 5v14M5 12h14"/>', flecha: '<path d="M9 6l6 6-6 6"/>', abajo: '<path d="M6 9l6 6 6-6"/>',
    tabla: '<rect x="3" y="4" width="18" height="16" rx="1"/><path d="M3 10h18M9 10v10"/>', vista: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    esquema: '<path d="M3 7h7l2 2h9v10H3z"/>', stage: '<path d="M4 4h16v6H4zM4 14h16v6H4z"/><path d="M12 10v4"/>', volver: '<path d="M15 6l-6 6 6 6"/>', subir: '<path d="M12 16V4M6 10l6-6 6 6M4 20h16"/>',
    basura: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>', copo: '<path d="M12 2v20M3.3 7l17.4 10M20.7 7L3.3 17"/><path d="M9.5 3.5L12 6l2.5-2.5M9.5 20.5L12 18l2.5 2.5M4.6 10l3.4-1 .9-3.4M19.4 14l-3.4 1-.9 3.4M19.4 10l-3.4-1-.9-3.4M4.6 14l3.4 1 .9 3.4"/>',
  };
  const ic = (n, t = 16) => `<svg class="sf-ic" width="${t}" height="${t}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[n] || ''}</svg>`;
  const NAV = [
    ['home', 'Home', 'home', ''], ['hojas', 'Worksheets', 'hoja', 'hojas'], ['datos', 'Databases', 'datos', 'datos'],
    ['historial', 'Query History', 'historial', 'historial'], ['warehouses', 'Warehouses', 'wh', 'warehouses'], ['roles', 'Users & Roles', 'roles', 'roles'],
  ];
  const href = (h) => '#/snowflake' + (h ? '/' + h : '');

  function vista(m, ctx, sub) {
    main = m; Store = ctx.Store; toast = ctx.toast || toast; ruta = (sub || []).map(decodeURIComponent);
    M().conectar(Store);
    document.body.classList.add('sf-abierto');
    if (!M().oyentes.has(alCambiar)) M().oyentes.add(alCambiar);
    clearInterval(reloj); reloj = setInterval(() => { M().tick(); if (ruta[0] === 'warehouses' && document.contains(main)) dibujar(); }, 5000);
    dibujar();
  }
  function alCambiar() { if (!document.contains(main) || !/^#\/snowflake/.test(location.hash)) return; if (ruta[0] === 'hojas' && ruta[1]) { pintarContexto(); return; } if (ruta[0] !== 'hojas') dibujar(); }

  function marco(contenido, seccion) {
    const s = M().st();
    return `<div class="sfp" id="sfp"><aside class="sf-nav">
      <div class="sf-cuenta">${ic('copo', 22)}<div><b>Snowflake</b><span class="sf-tag">práctica</span><small>${esc(M().USUARIO)} · ${esc(s.ctx.rol)}</small></div></div>
      <nav>${NAV.map(([id, t, i, h]) => `<a class="sf-nav-i${seccion === id ? ' on' : ''}" href="${href(h)}">${ic(i, 18)}<span>${t}</span></a>`).join('')}</nav>
      <a class="sf-nav-i sf-curso" href="#/herramientas">${ic('volver', 18)}<span>Curso</span></a>
    </aside><main class="sf-main">${contenido}</main></div>`;
  }

  function dibujar() {
    const r = ruta[0] || '';
    if (r === 'hojas' && ruta[1]) return hoja(ruta[1]);
    if (r === 'hojas') return hojas();
    if (r === 'datos') return datos();
    if (r === 'historial') return historial();
    if (r === 'warehouses') return warehouses();
    if (r === 'roles') return roles();
    return inicio();
  }

  // ------------------------------------------------------------------ Home
  function inicio() {
    const s = M().st();
    main.innerHTML = marco(`<div class="sf-pag"><h1>Welcome, ${esc(M().USUARIO.toLowerCase())}</h1>
      <div class="sf-aviso">${ic('copo')} <div>Snowflake es un <b>data warehouse en la nube</b>: guardas datos en bases y esquemas, y los consultas con SQL usando un <b>warehouse virtual</b> (el cómputo), que se paga por segundo mientras está encendido. Aquí todo corre en tu navegador con la base de la tienda del curso: no necesitas cuenta ni tarjeta.</div></div>
      <div class="sf-acciones"><button class="sf-btn sf-pri" id="sfNueva">${ic('mas')} SQL Worksheet</button><a class="sf-btn" href="${href('datos')}">${ic('datos')} Explorar datos</a><a class="sf-btn" href="${href('warehouses')}">${ic('wh')} Warehouses</a></div>
      <h2>Recent worksheets</h2>${listaHojas(s.hojas.slice(-5).reverse())}
      <h2>Para empezar</h2><ol class="sf-pasos"><li>Abre una hoja y ejecuta la consulta de ejemplo (Ctrl+Enter).</li><li>Crea tu propio warehouse: <code>CREATE WAREHOUSE mi_wh WAREHOUSE_SIZE = 'XSMALL' AUTO_SUSPEND = 60;</code></li><li>Crea una base, un stage, sube un archivo y cárgalo con <code>COPY INTO</code>.</li><li>Borra filas por error y recupéralas con Time Travel: <code>SELECT * FROM t BEFORE(STATEMENT => '&lt;query id&gt;')</code>.</li><li>Mira cuánto gastaste en <b>Warehouses</b> y qué corrió en <b>Query History</b>.</li></ol></div>`, 'home');
    main.querySelector('#sfNueva').onclick = nuevaHoja;
  }
  function listaHojas(lista) {
    if (!lista.length) return '<p class="sf-dim">Todavía no hay hojas.</p>';
    return `<table class="sf-tabla"><thead><tr><th>Title</th><th>Viewed</th><th></th></tr></thead><tbody>${lista.map((h) => `<tr><td><a href="${href('hojas/' + h.id)}">${ic('hoja')} ${esc(h.nombre)}</a></td><td class="sf-dim">${hace(h.vista || h.creada)}</td><td class="sf-der"><button class="sf-icono" data-borrar="${h.id}" title="Borrar">${ic('basura')}</button></td></tr>`).join('')}</tbody></table>`;
  }
  function nuevaHoja(sqlInicial) {
    const s = M().st(); const id = 'h' + Date.now().toString(36);
    s.hojas.push({ id, nombre: new Date().toISOString().slice(0, 16).replace('T', ' '), sql: typeof sqlInicial === 'string' ? sqlInicial : '', creada: Date.now() });
    Store.save(); location.hash = href('hojas/' + id);
  }
  function hojas() {
    const s = M().st();
    main.innerHTML = marco(`<div class="sf-pag"><div class="sf-cab"><h1>Worksheets</h1><span class="sf-sp"></span><button class="sf-btn sf-pri" id="sfNueva">${ic('mas')} SQL Worksheet</button></div>${listaHojas([...s.hojas].reverse())}</div>`, 'hojas');
    main.querySelector('#sfNueva').onclick = nuevaHoja;
    main.querySelectorAll('[data-borrar]').forEach((b) => b.onclick = () => { if (!confirm('¿Borrar la hoja?')) return; s.hojas = s.hojas.filter((h) => h.id !== b.dataset.borrar); Store.save(); hojas(); });
  }

  // ------------------------------------------------------------------ hoja de SQL
  function hoja(id) {
    const s = M().st(); const h = s.hojas.find((x) => x.id === id);
    if (!h) { location.hash = href('hojas'); return; }
    h.vista = Date.now();
    main.innerHTML = marco(`<div class="sf-hoja">
      <div class="sf-hoja-bar"><input class="sf-titulo" id="sfTit" value="${esc(h.nombre)}" aria-label="Nombre de la hoja"><span class="sf-sp"></span>
        <button class="sf-pill" id="sfCtxRol" title="Rol y warehouse"></button><button class="sf-pill" id="sfCtxDb" title="Base y esquema"></button>
        <button class="sf-btn sf-pri sf-run" id="sfRun" title="Ejecutar la sentencia del cursor (Ctrl+Enter)">${ic('play', 14)}</button><button class="sf-btn" id="sfRunAll" title="Ejecutar todo (Ctrl+Shift+Enter)">Run all</button></div>
      <div class="sf-hoja-cuerpo"><aside class="sf-arbol" id="sfArbol"><div class="sf-dim sf-pad">Cargando…</div></aside>
        <section class="sf-ed-zona"><div class="sf-editor" id="sfEd"></div><div class="sf-res" id="sfRes"><div class="sf-res-vacio">Ejecuta una sentencia para ver el resultado. <b>Ctrl+Enter</b> ejecuta la sentencia donde está el cursor; <b>Ctrl+Shift+Enter</b>, todas.</div></div></section></div>
      <div class="sf-menu" id="sfMenu" hidden></div></div>`, 'hojas');
    const ed = main.querySelector('#sfEd');
    if (window.CodeMirror) {
      cm = window.CodeMirror(ed, { value: h.sql, mode: 'text/x-sql', lineNumbers: true, indentUnit: 4, matchBrackets: true, autoCloseBrackets: true, lineWrapping: false, extraKeys: { 'Ctrl-Enter': () => correr(false), 'Cmd-Enter': () => correr(false), 'Shift-Ctrl-Enter': () => correr(true), 'Shift-Cmd-Enter': () => correr(true), 'Ctrl-/': 'toggleComment', 'Cmd-/': 'toggleComment' } });
      cm.on('change', () => { h.sql = cm.getValue(); Store.saveSoon ? Store.saveSoon() : Store.save(); });
      setTimeout(() => cm.refresh(), 0);
    } else {
      ed.innerHTML = `<textarea class="sf-ta" spellcheck="false">${esc(h.sql)}</textarea>`; const ta = ed.firstChild;
      cm = { getValue: () => ta.value, getSelection: () => ta.value.slice(ta.selectionStart, ta.selectionEnd), indexFromPos: () => ta.selectionStart, getCursor: () => 0, setValue: (v) => { ta.value = v; }, focus: () => ta.focus() };
      ta.addEventListener('input', () => { h.sql = ta.value; Store.save(); });
      ta.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); correr(e.shiftKey); } });
    }
    main.querySelector('#sfTit').addEventListener('change', (e) => { h.nombre = e.target.value.trim() || 'Sin título'; Store.save(); });
    main.querySelector('#sfRun').onclick = () => correr(false);
    main.querySelector('#sfRunAll').onclick = () => correr(true);
    main.querySelector('#sfCtxRol').onclick = (e) => menuContexto(e.currentTarget, 'rol');
    main.querySelector('#sfCtxDb').onclick = (e) => menuContexto(e.currentTarget, 'db');
    pintarContexto();
    M().init((t) => { const a = main.querySelector('#sfArbol'); if (a) a.innerHTML = `<div class="sf-dim sf-pad">${esc(t)}</div>`; }).then(() => arbol(main.querySelector('#sfArbol'), true)).catch((e) => { main.querySelector('#sfArbol').innerHTML = `<div class="sf-err sf-pad">${esc(e.message)}</div>`; });
    if (ultimo && ultimo.hoja === id) mostrar(ultimo.rs);
  }
  function pintarContexto() {
    const s = M().st(); const a = main.querySelector('#sfCtxRol'), b = main.querySelector('#sfCtxDb'); if (!a) return;
    const w = s.warehouses[s.ctx.wh];
    a.innerHTML = `<span class="sf-pill-k">${esc(s.ctx.rol)}</span> · <span class="sf-punto ${w && w.estado === 'STARTED' ? 'on' : ''}"></span>${esc(s.ctx.wh || 'No warehouse')} ${ic('abajo', 12)}`;
    b.innerHTML = `${ic('datos', 13)} ${esc(s.ctx.db)}.${esc(s.ctx.esquema)} ${ic('abajo', 12)}`;
  }
  async function menuContexto(btn, cual) {
    const s = M().st(); const menu = main.querySelector('#sfMenu'); const r = btn.getBoundingClientRect(), base = main.querySelector('#sfp').getBoundingClientRect();
    let html = '';
    if (cual === 'rol') html = `<div class="sf-menu-t">Role</div>${[...M().ROLES_SISTEMA, ...Object.keys(s.roles)].map((x) => `<button data-sql="USE ROLE ${x}" class="${x === s.ctx.rol ? 'on' : ''}">${esc(x)}</button>`).join('')}<div class="sf-menu-t">Warehouse</div>${Object.values(s.warehouses).map((w) => `<button data-sql="USE WAREHOUSE ${w.nombre}" class="${w.nombre === s.ctx.wh ? 'on' : ''}"><span class="sf-punto ${w.estado === 'STARTED' ? 'on' : ''}"></span>${esc(w.nombre)} <small>${w.tamano}</small></button>`).join('')}`;
    else { await M().init(); for (const d of await M().bases()) { html += `<div class="sf-menu-t">${esc(d)}</div>`; for (const e of await M().esquemas(d)) html += `<button data-sql="USE SCHEMA ${d}.${e}" class="${d === s.ctx.db && e === s.ctx.esquema ? 'on' : ''}">${esc(e)}</button>`; } }
    menu.innerHTML = html; menu.hidden = false;
    menu.style.top = (r.bottom - base.top + 4) + 'px'; menu.style.left = Math.max(8, r.right - base.left - 240) + 'px';
    menu.querySelectorAll('[data-sql]').forEach((x) => x.onclick = async () => { menu.hidden = true; const rs = await M().ejecutar(x.dataset.sql); if (rs[0].error) toast(rs[0].error.message); pintarContexto(); });
    setTimeout(() => document.addEventListener('click', function cerrar(e) { if (!menu.contains(e.target)) { menu.hidden = true; document.removeEventListener('click', cerrar); } }), 0);
  }
  // la sentencia donde está el cursor (o la selección)
  function sentenciaActual() {
    const sel = cm.getSelection && cm.getSelection(); if (sel && sel.trim()) return sel;
    const txt = cm.getValue(); const pos = cm.indexFromPos ? cm.indexFromPos(cm.getCursor()) : 0;
    let ini = 0, q = null, linea = false, bloque = false;
    for (let i = 0; i < txt.length; i++) {
      const ch = txt[i], nx = txt[i + 1];
      if (linea) { if (ch === '\n') linea = false; continue; } if (bloque) { if (ch === '*' && nx === '/') { bloque = false; i++; } continue; }
      if (q) { if (ch === q) q = null; continue; } if (ch === "'" || ch === '"') { q = ch; continue; }
      if (ch === '-' && nx === '-') { linea = true; continue; } if (ch === '/' && nx === '*') { bloque = true; continue; }
      if (ch === ';') { const trozo = txt.slice(ini, i + 1); if (pos <= i + 1 && M().partir(trozo).length) return trozo; if (pos <= i) return trozo; ini = i + 1; }
    }
    const resto = txt.slice(ini); if (M().partir(resto).length) return resto;
    // cursor después de la última: la última sentencia completa
    const todas = M().partir(txt); return todas.length ? todas[todas.length - 1] : '';
  }
  async function correr(todo) {
    if (ocupado) return; const sql = todo ? cm.getValue() : sentenciaActual();
    if (!M().partir(sql).length) { toast('No hay ninguna sentencia para ejecutar'); return; }
    ocupado = true; const res = main.querySelector('#sfRes'); res.innerHTML = `<div class="sf-res-vacio"><span class="sf-spin"></span> Running…</div>`;
    const btn = main.querySelector('#sfRun'); btn.disabled = true;
    try {
      const rs = await M().ejecutar(sql, { progreso: (t) => { res.innerHTML = `<div class="sf-res-vacio"><span class="sf-spin"></span> ${esc(t)}</div>`; } });
      ultimo = { hoja: ruta[1], rs }; mostrar(rs);
      if (rs.some((r) => !r.error && /^(CREATE|DROP|ALTER|UNDROP|USE)\b/i.test(r.sql.trim()))) arbol(main.querySelector('#sfArbol'), true);
    } catch (e) { res.innerHTML = `<div class="sf-err-caja">${esc(e.message)}</div>`; }
    ocupado = false; btn.disabled = false; pintarContexto();
  }
  function mostrar(rs) {
    const res = main.querySelector('#sfRes'); if (!res) return;
    const r = rs[rs.length - 1];
    const varias = rs.length > 1 ? `<div class="sf-res-varias">${rs.length} sentencias ejecutadas${rs.some((x) => x.error) ? ' · se detuvo en el error' : ''}</div>` : '';
    if (r.error) { res.innerHTML = `${varias}<div class="sf-err-caja"><b>${esc(r.error.codigo || '000904')} (42000): ${esc(r.qid)}</b><pre>${esc(r.error.message)}</pre></div>`; return; }
    const det = `<aside class="sf-det"><div class="sf-det-t">Query Details</div><dl><dt>Query ID</dt><dd><code>${esc(r.qid)}</code> <button class="sf-icono" id="sfCopiaId" title="Copiar">⧉</button></dd><dt>Duration</dt><dd>${r.ms} ms</dd><dt>Rows</dt><dd>${r.r.values ? r.r.values.length : 1}</dd></dl></aside>`;
    if (!r.r.values) { res.innerHTML = `${varias}<div class="sf-res-fila"><div class="sf-res-ok">${esc(r.r.estado)}</div>${det}</div>`; }
    else {
      const max = 1000, vals = r.r.values.slice(0, max);
      res.innerHTML = `${varias}<div class="sf-res-fila"><div class="sf-grid-caja"><table class="sf-grid"><thead><tr><th class="sf-n"></th>${r.r.columns.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${vals.map((f, i) => `<tr><td class="sf-n">${i + 1}</td>${f.map((v) => `<td class="${typeof v === 'number' ? 'sf-num' : ''}">${v === null ? '<span class="sf-null">NULL</span>' : esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table>${r.r.values.length > max ? `<div class="sf-dim sf-pad">Mostrando ${max} de ${r.r.values.length} filas</div>` : ''}</div>${det}</div>`;
    }
    const c = res.querySelector('#sfCopiaId'); if (c) c.onclick = () => { try { navigator.clipboard.writeText(r.qid); toast('Query ID copiado'); } catch (e) { /* sin portapapeles */ } };
  }

  // ------------------------------------------------------------------ explorador de objetos
  async function arbol(el, enHoja) {
    if (!el) return; await M().init();
    const s = M().st(); s.abiertos = s.abiertos || { TIENDA_ANDINA: true, 'TIENDA_ANDINA.PUBLIC': true };
    let html = `<div class="sf-arbol-t">Databases</div>`;
    for (const d of await M().bases()) {
      const ab = s.abiertos[d];
      html += `<div class="sf-nodo" data-k="${esc(d)}">${ic(ab ? 'abajo' : 'flecha', 12)}${ic('datos', 14)}<span>${esc(d)}</span></div>`;
      if (!ab) continue;
      for (const e of await M().esquemas(d)) {
        const k = `${d}.${e}`, ab2 = s.abiertos[k];
        html += `<div class="sf-nodo sf-n2" data-k="${esc(k)}">${ic(ab2 ? 'abajo' : 'flecha', 12)}${ic('esquema', 14)}<span>${esc(e)}</span></div>`;
        if (!ab2) continue;
        const ts = await M().tablas(d, e);
        for (const t of ts) html += `<div class="sf-nodo sf-n3" data-t="${esc(k + '.' + t.nombre)}" title="${enHoja ? 'Clic: insertar el nombre · Doble clic: ver datos' : ''}">${ic(t.vista ? 'vista' : 'tabla', 14)}<span>${esc(t.nombre)}</span></div>`;
        for (const st0 of Object.values(s.stages).filter((x) => x.db === d && x.esquema === e)) html += `<div class="sf-nodo sf-n3" data-stage="${esc(st0.nombre)}">${ic('stage', 14)}<span>@${esc(st0.nombre)}</span></div>`;
        if (!ts.length) html += '<div class="sf-nodo sf-n3 sf-dim">(vacío)</div>';
      }
    }
    el.innerHTML = html;
    el.querySelectorAll('[data-k]').forEach((n) => n.onclick = () => { s.abiertos[n.dataset.k] = !s.abiertos[n.dataset.k]; Store.save(); arbol(el, enHoja); });
    el.querySelectorAll('[data-t]').forEach((n) => {
      if (enHoja) { n.onclick = () => { if (cm.replaceSelection) { cm.replaceSelection(n.dataset.t); cm.focus(); } }; n.ondblclick = () => { location.hash = href('datos/' + n.dataset.t.split('.').map(encodeURIComponent).join('/')); }; }
      else n.onclick = () => { location.hash = href('datos/' + n.dataset.t.split('.').map(encodeURIComponent).join('/')); };
    });
    el.querySelectorAll('[data-stage]').forEach((n) => n.onclick = () => { location.hash = href('datos/stage/' + encodeURIComponent(n.dataset.stage)); });
  }
  async function datos() {
    main.innerHTML = marco(`<div class="sf-datos"><aside class="sf-arbol" id="sfArbol"><div class="sf-dim sf-pad">Cargando DuckDB…</div></aside><section class="sf-pag" id="sfDet"></section></div>`, 'datos');
    const det = main.querySelector('#sfDet');
    try { await M().init((t) => { det.innerHTML = `<p class="sf-dim">${esc(t)}</p>`; }); } catch (e) { det.innerHTML = `<div class="sf-err-caja">${esc(e.message)}</div>`; return; }
    arbol(main.querySelector('#sfArbol'), false);
    const [a, b, c] = ruta.slice(1);
    if (a === 'stage') return detalleStage(det, b);
    if (c) return detalleTabla(det, a, b, c);
    if (b) { const ts = await M().tablas(a, b); det.innerHTML = `<div class="sf-miga">${esc(a)} / <b>${esc(b)}</b></div><h1>${ic('esquema', 20)} ${esc(b)}</h1><table class="sf-tabla"><thead><tr><th>Name</th><th>Type</th><th class="sf-der">Rows</th></tr></thead><tbody>${ts.map((t) => `<tr><td><a href="${href(`datos/${a}/${b}/${t.nombre}`)}">${ic(t.vista ? 'vista' : 'tabla')} ${esc(t.nombre)}</a></td><td>${t.vista ? 'View' : 'Table'}</td><td class="sf-der">${t.vista ? '—' : t.filas.toLocaleString('en')}</td></tr>`).join('')}</tbody></table>`; return; }
    if (a) { const es = await M().esquemas(a); det.innerHTML = `<div class="sf-miga"><b>${esc(a)}</b></div><h1>${ic('datos', 20)} ${esc(a)}</h1><table class="sf-tabla"><thead><tr><th>Schema</th></tr></thead><tbody>${es.map((e) => `<tr><td><a href="${href(`datos/${a}/${e}`)}">${ic('esquema')} ${esc(e)}</a></td></tr>`).join('')}</tbody></table>`; return; }
    det.innerHTML = `<h1>Databases</h1><p class="sf-dim">Una <b>base</b> contiene <b>esquemas</b>, y cada esquema, tablas, vistas y stages. El nombre completo de una tabla es <code>BASE.ESQUEMA.TABLA</code>.</p><table class="sf-tabla"><thead><tr><th>Name</th><th>Source</th></tr></thead><tbody>${(await M().bases()).map((d) => `<tr><td><a href="${href('datos/' + d)}">${ic('datos')} ${esc(d)}</a></td><td class="sf-dim">${d === 'SNOWFLAKE_SAMPLE_DATA' ? 'Datos de muestra' : d === 'TIENDA_ANDINA' ? 'Base del curso' : 'Local'}</td></tr>`).join('')}</tbody></table>`;
  }
  async function detalleTabla(det, d, e, t) {
    const cols = await M().columnas(d, e, t);
    det.innerHTML = `<div class="sf-miga">${esc(d)} / ${esc(e)} / <b>${esc(t)}</b></div><div class="sf-cab"><h1>${ic('tabla', 20)} ${esc(t)}</h1><span class="sf-sp"></span><button class="sf-btn sf-pri" id="sfAbrir">Open in Worksheet</button></div>
      <div class="sf-tabs"><button class="on" data-tab="cols">Columns</button><button data-tab="prev">Data Preview</button></div><div id="sfTab"></div>`;
    const pinta = async (tab) => {
      main.querySelectorAll('.sf-tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
      const box = main.querySelector('#sfTab');
      if (tab === 'cols') { box.innerHTML = `<table class="sf-tabla"><thead><tr><th>#</th><th>Name</th><th>Type</th><th>Nullable</th></tr></thead><tbody>${cols.map((c, i) => `<tr><td class="sf-dim">${i + 1}</td><td><b>${esc(c.nombre)}</b></td><td><code>${esc(c.tipo)}</code></td><td>${c.nulo === true || c.nulo === 'YES' ? 'Y' : 'N'}</td></tr>`).join('')}</tbody></table>`; return; }
      box.innerHTML = '<p class="sf-dim"><span class="sf-spin"></span> Cargando…</p>';
      const rs = await M().ejecutar(`SELECT * FROM ${d}.${e}.${t} LIMIT 100`);
      const r = rs[0]; if (r.error) { box.innerHTML = `<div class="sf-err-caja"><pre>${esc(r.error.message)}</pre></div>`; return; }
      box.innerHTML = `<p class="sf-dim">Primeras ${r.r.values.length} filas · usa el warehouse ${esc(M().st().ctx.wh || '')}</p><div class="sf-grid-caja sf-grid-alta"><table class="sf-grid"><thead><tr>${r.r.columns.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${r.r.values.map((f) => `<tr>${f.map((v) => `<td class="${typeof v === 'number' ? 'sf-num' : ''}">${v === null ? '<span class="sf-null">NULL</span>' : esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    };
    main.querySelectorAll('.sf-tabs button').forEach((b) => b.onclick = () => pinta(b.dataset.tab));
    main.querySelector('#sfAbrir').onclick = () => nuevaHoja(`USE SCHEMA ${d}.${e};\n\nSELECT * FROM ${t} LIMIT 100;\n`);
    pinta('cols');
  }
  function detalleStage(det, nombre) {
    const s = M().st(); const x = s.stages[nombre];
    if (!x) { det.innerHTML = '<p>El stage no existe.</p>'; return; }
    const arch = Object.entries(x.archivos);
    det.innerHTML = `<div class="sf-miga">${esc(x.db)} / ${esc(x.esquema)} / <b>@${esc(nombre)}</b></div><div class="sf-cab"><h1>${ic('stage', 20)} @${esc(nombre)}</h1><span class="sf-sp"></span><label class="sf-btn sf-pri">${ic('subir')} + Files<input type="file" id="sfSubir" multiple accept=".csv,.json,.txt" hidden></label><button class="sf-btn" id="sfEj">Archivos de ejemplo</button></div>
      <p class="sf-dim">Un <b>stage</b> es una carpeta donde dejas archivos antes de cargarlos a una tabla con <code>COPY INTO</code>. Este es un stage interno (los archivos viven en Snowflake).</p>
      ${arch.length ? `<table class="sf-tabla"><thead><tr><th>Name</th><th class="sf-der">Size</th><th>Last modified</th><th></th></tr></thead><tbody>${arch.map(([n, a]) => `<tr><td>${esc(n)}</td><td class="sf-der">${a.texto.length.toLocaleString('en')} B</td><td class="sf-dim">${hace(a.cuando)}</td><td class="sf-der"><button class="sf-icono" data-quitar="${esc(n)}" title="Quitar">${ic('basura')}</button></td></tr>`).join('')}</tbody></table>` : '<div class="sf-vacio">Todavía no hay archivos. Súbelos con <b>+ Files</b> o agrega los de ejemplo.</div>'}
      <h2>Cargar a una tabla</h2><pre class="sf-codigo">CREATE TABLE IF NOT EXISTS clientes_nuevos (cliente_id INT, nombre VARCHAR, pais VARCHAR);

COPY INTO clientes_nuevos
FROM @${esc(nombre)}
PATTERN = '.*clientes.*[.]csv'
FILE_FORMAT = (TYPE = CSV SKIP_HEADER = 1);</pre><button class="sf-btn" id="sfCopiar">Abrir en una hoja</button>`;
    det.querySelector('#sfSubir').onchange = async (e) => { for (const f of e.target.files) M().subirArchivo(nombre, f.name, await f.text()); toast('Archivos subidos'); detalleStage(det, nombre); };
    det.querySelector('#sfEj').onclick = () => { ejemplos(nombre); toast('Se agregaron 2 archivos de ejemplo'); detalleStage(det, nombre); };
    det.querySelectorAll('[data-quitar]').forEach((b) => b.onclick = () => { delete x.archivos[b.dataset.quitar]; Store.save(); detalleStage(det, nombre); });
    det.querySelector('#sfCopiar').onclick = () => nuevaHoja(`USE SCHEMA ${x.db}.${x.esquema};\n\n` + det.querySelector('.sf-codigo').textContent + '\n\nSELECT * FROM clientes_nuevos;\n');
  }
  function ejemplos(stage) {
    const T = window.Engines && window.Engines.SQL && window.Engines.SQL.tables; const cl = T && T.clientes;
    const filas = cl ? cl.rows.slice(0, 25).map((r) => [r[0], r[1], r[6]]) : [[1, 'Ana', 'Chile'], [2, 'Luis', 'Perú']];
    M().subirArchivo(stage, 'clientes_2026_01.csv', 'cliente_id,nombre,pais\n' + filas.map((f) => f.map((v) => /[,"]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : v).join(',')).join('\n') + '\n');
    M().subirArchivo(stage, 'eventos_app.json', [{ usuario: 1, evento: 'login', ts: '2026-01-05 10:00:00' }, { usuario: 2, evento: 'compra', ts: '2026-01-05 10:03:00' }, { usuario: 1, evento: 'logout', ts: '2026-01-05 10:20:00' }].map((o) => JSON.stringify(o)).join('\n') + '\n');
  }

  // ------------------------------------------------------------------ Query History
  function historial() {
    const s = M().st(); const f = ruta[1] || 'todas';
    const lista = s.historial.filter((h) => f === 'todas' || (f === 'fallidas' ? h.estado === 'Failed' : h.estado === 'Succeeded'));
    main.innerHTML = marco(`<div class="sf-pag"><h1>Query History</h1><p class="sf-dim">Cada sentencia queda registrada con su Query ID, el rol, el warehouse, cuánto tardó y si falló. Es lo primero que se revisa cuando algo anda lento o caro.</p>
      <div class="sf-filtros">${[['todas', 'All'], ['ok', 'Succeeded'], ['fallidas', 'Failed']].map(([k, t]) => `<a class="sf-chip${f === k ? ' on' : ''}" href="${href('historial/' + k)}">${t}</a>`).join('')}</div>
      ${lista.length ? `<table class="sf-tabla sf-hist"><thead><tr><th>Status</th><th>SQL Text</th><th>Query ID</th><th>Warehouse</th><th>Role</th><th class="sf-der">Duration</th><th class="sf-der">Rows</th><th>Start Time</th></tr></thead><tbody>${lista.map((h, i) => `<tr data-i="${s.historial.indexOf(h)}"><td><span class="sf-estado ${h.estado === 'Failed' ? 'mal' : 'bien'}">${h.estado === 'Failed' ? '✕ Failed' : '✓ Succeeded'}</span></td><td class="sf-sqlcorto"><code>${esc(h.sql.replace(/\s+/g, ' ').slice(0, 90))}</code></td><td class="sf-dim"><code>${esc(h.id.slice(0, 13))}…</code></td><td>${esc(h.wh || '—')}${h.tamano && h.wh ? ` <small class="sf-dim">${h.tamano}</small>` : ''}</td><td>${esc(h.rol)}</td><td class="sf-der">${h.ms} ms</td><td class="sf-der">${h.filas}</td><td class="sf-dim">${hace(h.inicio)}</td></tr>`).join('')}</tbody></table>` : '<div class="sf-vacio">Todavía no ejecutaste nada.</div>'}
      <div class="sf-modal" id="sfModal" hidden></div></div>`, 'historial');
    main.querySelectorAll('tr[data-i]').forEach((tr) => tr.onclick = () => {
      const h = s.historial[tr.dataset.i]; const m = main.querySelector('#sfModal');
      m.innerHTML = `<div class="sf-modal-c"><div class="sf-cab"><h2>Query ${esc(h.id)}</h2><span class="sf-sp"></span><button class="sf-icono" data-cerrar>✕</button></div><dl class="sf-dl"><dt>Status</dt><dd>${esc(h.estado)}</dd><dt>Role</dt><dd>${esc(h.rol)}</dd><dt>Warehouse</dt><dd>${esc(h.wh || '— (no hizo falta o no había uno activo)')}</dd><dt>Context</dt><dd>${esc(h.db)}.${esc(h.esquema)}</dd><dt>Duration</dt><dd>${h.ms} ms</dd></dl><pre class="sf-codigo">${esc(h.sql)}</pre>${h.error ? `<div class="sf-err-caja"><pre>${esc(h.error)}</pre></div>` : ''}<div class="sf-acciones"><button class="sf-btn sf-pri" data-abrir>Open in Worksheet</button></div></div>`;
      m.hidden = false; m.querySelector('[data-cerrar]').onclick = () => { m.hidden = true; }; m.onclick = (e) => { if (e.target === m) m.hidden = true; };
      m.querySelector('[data-abrir]').onclick = () => nuevaHoja(`USE SCHEMA ${h.db}.${h.esquema};\n\n${h.sql};\n`);
    });
  }

  // ------------------------------------------------------------------ Warehouses
  function warehouses() {
    const s = M().st(); M().tick();
    const C = M().CREDITOS_HORA; const total = Object.values(s.warehouses).reduce((a, w) => a + w.creditos + (w.estado === 'STARTED' ? (C[w.tamano] || 1) * Math.max(60, (Date.now() - w.desde) / 1000) / 3600 : 0), 0);
    main.innerHTML = marco(`<div class="sf-pag"><div class="sf-cab"><h1>Warehouses</h1><span class="sf-sp"></span><button class="sf-btn sf-pri" id="sfNuevoWh">${ic('mas')} Warehouse</button></div>
      <div class="sf-aviso">${ic('wh')} <div>Un <b>warehouse virtual</b> es el cómputo que ejecuta tus consultas. Cobra <b>créditos por segundo</b> mientras está encendido (mínimo 60 s cada vez que arranca) y nada cuando está suspendido. Cada tamaño duplica la potencia y el costo del anterior. Con <b>AUTO_SUSPEND</b> se apaga solo si no hay consultas.</div></div>
      <div class="sf-kpis"><div><small>Créditos consumidos (práctica)</small><b>${total.toFixed(3)}</b></div><div><small>Equivale a</small><b>≈ USD ${(total * 3).toFixed(2)}</b><small class="sf-dim">a USD 3 por crédito (edición Enterprise, varía por región)</small></div></div>
      <table class="sf-tabla"><thead><tr><th>Name</th><th>Status</th><th>Size</th><th class="sf-der">Credits/hour</th><th class="sf-der">Auto suspend</th><th class="sf-der">Credits used</th><th>Owner</th><th></th></tr></thead><tbody>
      ${Object.values(s.warehouses).map((w) => { const usado = w.creditos + (w.estado === 'STARTED' ? (C[w.tamano] || 1) * Math.max(60, (Date.now() - w.desde) / 1000) / 3600 : 0); return `<tr><td><b>${esc(w.nombre)}</b>${w.nombre === s.ctx.wh ? ' <small class="sf-chip on">en uso</small>' : ''}</td><td><span class="sf-punto ${w.estado === 'STARTED' ? 'on' : ''}"></span>${w.estado === 'STARTED' ? 'Started' : 'Suspended'}</td><td>${tamanoLindo(w.tamano)}</td><td class="sf-der">${C[w.tamano]}</td><td class="sf-der">${w.autoSuspend ? (w.autoSuspend >= 60 ? w.autoSuspend / 60 + ' min' : w.autoSuspend + ' s') : 'Never'}</td><td class="sf-der">${usado.toFixed(3)}</td><td>${esc(w.dueno)}</td><td class="sf-der"><button class="sf-btn sf-chico" data-acc="${w.estado === 'STARTED' ? 'SUSPEND' : 'RESUME'}" data-wh="${esc(w.nombre)}">${w.estado === 'STARTED' ? 'Suspend' : 'Resume'}</button> <button class="sf-icono" data-drop="${esc(w.nombre)}" title="Drop">${ic('basura')}</button></td></tr>`; }).join('')}</tbody></table>
      <h2>Cuánto cuesta cada tamaño</h2><table class="sf-tabla sf-chica"><thead><tr><th>Size</th><th class="sf-der">Credits / hour</th><th class="sf-der">1 h al día, 30 días</th></tr></thead><tbody>${Object.entries(C).slice(0, 6).map(([t, c]) => `<tr><td>${tamanoLindo(t)}</td><td class="sf-der">${c}</td><td class="sf-der">${c * 30} créditos</td></tr>`).join('')}</tbody></table>
      <div class="sf-modal" id="sfModal" hidden></div></div>`, 'warehouses');
    main.querySelectorAll('[data-acc]').forEach((b) => b.onclick = async () => { const rs = await M().ejecutar(`ALTER WAREHOUSE ${b.dataset.wh} ${b.dataset.acc}`); if (rs[0].error) toast(rs[0].error.message); warehouses(); });
    main.querySelectorAll('[data-drop]').forEach((b) => b.onclick = async () => { if (!confirm(`¿Eliminar el warehouse ${b.dataset.drop}?`)) return; await M().ejecutar(`DROP WAREHOUSE ${b.dataset.drop}`); warehouses(); });
    main.querySelector('#sfNuevoWh').onclick = () => {
      const m = main.querySelector('#sfModal');
      m.innerHTML = `<div class="sf-modal-c sf-form"><div class="sf-cab"><h2>New Warehouse</h2><span class="sf-sp"></span><button class="sf-icono" data-cerrar>✕</button></div>
        <label>Name<input id="whN" value="ANALISIS_WH"></label><label>Size<select id="whT">${Object.keys(C).slice(0, 6).map((t) => `<option value="${t}">${tamanoLindo(t)} · ${C[t]} credit${C[t] > 1 ? 's' : ''}/hour</option>`).join('')}</select></label>
        <label>Auto suspend<select id="whS"><option value="60">1 minute</option><option value="300">5 minutes</option><option value="600" selected>10 minutes</option><option value="3600">1 hour</option><option value="0">Never</option></select></label>
        <p class="sf-dim">Equivale a: <code id="whSql"></code></p><div class="sf-acciones"><button class="sf-btn" data-cerrar>Cancel</button><button class="sf-btn sf-pri" id="whOk">Create Warehouse</button></div></div>`;
      m.hidden = false;
      const sqlDe = () => `CREATE WAREHOUSE ${m.querySelector('#whN').value.trim() || 'NUEVO_WH'} WAREHOUSE_SIZE = '${m.querySelector('#whT').value}' AUTO_SUSPEND = ${m.querySelector('#whS').value} AUTO_RESUME = TRUE INITIALLY_SUSPENDED = TRUE;`;
      const upd = () => { m.querySelector('#whSql').textContent = sqlDe(); }; m.querySelectorAll('input,select').forEach((x) => x.oninput = upd); upd();
      m.querySelectorAll('[data-cerrar]').forEach((x) => x.onclick = () => { m.hidden = true; });
      m.querySelector('#whOk').onclick = async () => { const rs = await M().ejecutar(sqlDe()); if (rs[0].error) { toast(rs[0].error.message); return; } m.hidden = true; toast('Warehouse creado'); warehouses(); };
    };
  }
  const tamanoLindo = (t) => ({ XSMALL: 'X-Small', SMALL: 'Small', MEDIUM: 'Medium', LARGE: 'Large', XLARGE: 'X-Large', XXLARGE: '2X-Large', XXXLARGE: '3X-Large', X4LARGE: '4X-Large' }[t] || t);

  // ------------------------------------------------------------------ Users & Roles
  function roles() {
    const s = M().st(); const todos = [...M().ROLES_SISTEMA, ...Object.keys(s.roles)];
    const DESC = { ACCOUNTADMIN: 'Todo en la cuenta, incluida la facturación. Úsalo lo menos posible.', SECURITYADMIN: 'Administra permisos (GRANT) y usuarios.', USERADMIN: 'Crea usuarios y roles.', SYSADMIN: 'Crea warehouses, bases y demás objetos. El rol de trabajo de ingeniería.', PUBLIC: 'Lo tienen todos los usuarios.' };
    main.innerHTML = marco(`<div class="sf-pag"><h1>Users &amp; Roles</h1><p class="sf-dim">En Snowflake los permisos se dan a <b>roles</b>, y los roles a usuarios (o a otros roles, formando una jerarquía). Lo recomendado: un rol por función (por ejemplo, <code>ANALISTA</code>) con solo lo que necesita.</p>
      <div class="sf-tabs"><span class="on">Roles</span></div>
      <table class="sf-tabla"><thead><tr><th>Role</th><th>Descripción</th><th class="sf-der">Grants</th></tr></thead><tbody>${todos.map((r) => `<tr><td><b>${esc(r)}</b>${r === s.ctx.rol ? ' <small class="sf-chip on">actual</small>' : ''}</td><td class="sf-dim">${esc(DESC[r] || 'Rol creado por ti')}</td><td class="sf-der">${s.grants.filter((g) => g.a === r).length}</td></tr>`).join('')}</tbody></table>
      <h2>Permisos otorgados</h2>${s.grants.length ? `<table class="sf-tabla"><thead><tr><th>Privilege</th><th>On</th><th>Object</th><th>To role</th><th>By</th></tr></thead><tbody>${s.grants.map((g) => `<tr><td><code>${esc(g.priv)}</code></td><td>${esc(g.tipo)}</td><td>${esc(g.obj)}</td><td><b>${esc(g.a)}</b></td><td class="sf-dim">${esc(g.por)}</td></tr>`).join('')}</tbody></table>` : `<div class="sf-vacio">Todavía no hay permisos propios. Prueba en una hoja:<pre class="sf-codigo">USE ROLE SECURITYADMIN;   -- SYSADMIN no puede crear roles
CREATE ROLE analista;
GRANT USAGE ON WAREHOUSE compute_wh TO ROLE analista;
GRANT USAGE ON DATABASE tienda_andina TO ROLE analista;
GRANT USAGE ON SCHEMA tienda_andina.public TO ROLE analista;
GRANT SELECT ON ALL TABLES IN SCHEMA tienda_andina.public TO ROLE analista;
GRANT ROLE analista TO USER alumno;
SHOW GRANTS TO ROLE analista;

USE ROLE analista;        -- ahora prueba: solo puede leer ese esquema
SELECT COUNT(*) FROM tienda_andina.public.pedidos;</pre></div>`}
      <h2>Users</h2><table class="sf-tabla"><thead><tr><th>User</th><th>Default role</th><th>Default warehouse</th></tr></thead><tbody><tr><td><b>${esc(M().USUARIO)}</b></td><td>SYSADMIN</td><td>COMPUTE_WH</td></tr></tbody></table></div>`, 'roles');
  }

  function hace(t) { const s = Math.round((Date.now() - t) / 1000); if (s < 60) return 'hace unos segundos'; if (s < 3600) return `hace ${Math.round(s / 60)} min`; if (s < 86400) return `hace ${Math.round(s / 3600)} h`; return new Date(t).toLocaleDateString('es'); }

  window.addEventListener('hashchange', () => { if (!/^#\/snowflake/.test(location.hash)) { document.body.classList.remove('sf-abierto'); clearInterval(reloj); reloj = null; } });
  window.SnowflakePractica = { vista };
})();
