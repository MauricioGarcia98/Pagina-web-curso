/*
 * Microsoft Fabric de práctica (2/2): los editores de cada ítem.
 * Lakehouse (explorador Tables/Files, Load to Tables, atajos de OneLake, SQL analytics endpoint),
 * Warehouse (T-SQL con escritura), Notebook (PySpark con el mini-Spark del curso y Spark SQL),
 * Pipeline (Copy data y Notebook, con salida por actividad) y Semantic model.
 */
(function () {
  'use strict';
  const E = {};
  const grilla = (esc, cols, filas, max = 1000, tipos) => `<div class="fb-grid-w"><table class="fb-grid"><thead><tr><th class="fb-gn"></th>${cols.map((c, i) => `<th>${tipos && tipos[i] ? `<span class="fb-tipo">${esc(tipos[i])}</span>` : ''}${esc(c)}</th>`).join('')}</tr></thead><tbody>${filas.slice(0, max).map((f, k) => `<tr><td class="fb-gn">${k + 1}</td>${f.map((v) => `<td${typeof v === 'number' ? ' class="fb-num"' : ''}>${v === null || v === undefined ? '<span class="fb-null">NULL</span>' : esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>${filas.length > max ? `<div class="fb-dim fb-sm">Showing ${max} of ${filas.length} rows</div>` : ''}`;
  const SQL_EJ = (n) => `SELECT TOP 100 *\nFROM dbo.${n || 'mi_tabla'};`;

  // editor SQL compartido por el endpoint del lakehouse y el warehouse
  function editorSql(c, modo, cont) {
    const { esc, ci, it } = c;
    it.consultas = it.consultas || [];
    if (!it.consultas.length) it.consultas.push({ id: c.uid(), nombre: 'SQL query 1', sql: SQL_EJ(Object.keys(it.tablas)[0]) });
    let act = it._consulta && it.consultas.find((q) => q.id === it._consulta) || it.consultas[0];
    const pintar = () => {
      cont.innerHTML = `<div class="fb-sqltabs">${it.consultas.map((q) => `<a data-q="${q.id}" class="${q === act ? 'sel' : ''}">${ci('file-code')} ${esc(q.nombre)}</a>`).join('')}<button class="fb-tb" id="sqNueva" title="New SQL query">${ci('add')}</button></div>
        <div class="fb-sqlbar"><button class="fb-btn fb-btn-p" id="sqRun">${ci('play')} Run</button><button class="fb-btn" id="sqGuardarVista">${ci('eye')} Save as view</button><span class="fb-sp"></span><span class="fb-dim fb-sm">${modo === 'endpoint' ? 'SQL analytics endpoint · solo lectura' : 'Warehouse · lectura y escritura'}</span></div>
        <textarea class="fb-sqled" id="sqTxt" spellcheck="false">${esc(act.sql)}</textarea>
        <div class="fb-res"><nav class="fb-tabs fb-tabs-sm"><a class="sel">Results</a><a class="fb-dim">Messages</a></nav><div id="sqRes" class="fb-res-b"><p class="fb-dim">Run a query to see results (Ctrl+Enter).</p></div></div>`;
      const ta = cont.querySelector('#sqTxt');
      ta.addEventListener('input', () => { act.sql = ta.value; });
      ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); correr(); } if (e.key === 'Tab') { e.preventDefault(); const s = ta.selectionStart; ta.value = ta.value.slice(0, s) + '    ' + ta.value.slice(ta.selectionEnd); ta.selectionStart = ta.selectionEnd = s + 4; } });
      cont.querySelector('#sqRun').addEventListener('click', correr);
      cont.querySelector('#sqNueva').addEventListener('click', () => { act = { id: c.uid(), nombre: `SQL query ${it.consultas.length + 1}`, sql: '' }; it.consultas.push(act); c.guardar(); pintar(); });
      cont.querySelectorAll('[data-q]').forEach((a) => a.addEventListener('click', () => { act = it.consultas.find((q) => q.id === a.dataset.q); it._consulta = act.id; pintar(); }));
      cont.querySelector('#sqGuardarVista').addEventListener('click', () => c.toast('(práctica) las vistas se crean con CREATE VIEW en el editor'));
    };
    const correr = () => {
      const ta = cont.querySelector('#sqTxt');
      const sel = ta.value.slice(ta.selectionStart, ta.selectionEnd).trim();
      const sql = sel || ta.value;
      act.sql = ta.value; c.guardar();
      const out = cont.querySelector('#sqRes');
      if (!sql.trim()) return;
      const r = c.correrTsql(c.W, it, sql, modo);
      if (!r.ok) { out.innerHTML = `<pre class="fb-err">${esc(r.error)}</pre>`; return; }
      const ult = r.resultados[r.resultados.length - 1];
      out.innerHTML = ult ? `${grilla(esc, ult.columns, ult.values)}<div class="fb-dim fb-sm">(${ult.values.length} rows affected) · ${Math.max(1, Math.round(r.ms))} ms</div>` : `<p class="fb-ok">${ci('pass-filled')} Commands completed successfully. ${r.cambios ? `(${r.cambios} rows affected)` : ''}</p>`;
      if (modo === 'warehouse') c.pintarExplorador && c.pintarExplorador();
    };
    pintar();
  }

  // ------------------------------------------------------------------ lakehouse
  E.lakehouse = (c) => {
    const { esc, ci, it, W } = c;
    const modo = c.query().get('modo') === 'sql' ? 'sql' : 'lake';
    let sel = it._sel || null;   // {tipo:'tabla'|'archivo'|'carpeta', n}
    const carpetas = () => [...new Set(Object.keys(it.files).map((k) => k.split('/').slice(0, -1).join('/')).filter(Boolean))];
    const explorador = () => {
      const tablas = Object.keys(it.tablas).sort(), atajos = it.atajos || [];
      const archivos = Object.keys(it.files).sort();
      if (modo === 'sql') return `<div class="fb-exp-t"><b>Explorer</b></div><div class="fb-arbol"><div class="fb-nodo">${ci('chevron-down')} ${ci('database')} <b>${esc(it.nombre)}</b></div><div class="fb-nodo fb-n1">${ci('chevron-down')} ${ci('folder')} Schemas</div><div class="fb-nodo fb-n2">${ci('chevron-down')} ${ci('symbol-namespace')} dbo</div><div class="fb-nodo fb-n3">${ci('chevron-down')} ${ci('folder')} Tables</div>
        ${[...tablas, ...atajos.map((a) => a.nombre)].map((t) => `<a class="fb-nodo fb-n4" data-sqlt="${esc(t)}">${ci('table')} ${esc(t)}</a>`).join('') || '<div class="fb-nodo fb-n4 fb-dim">Sin tablas</div>'}<div class="fb-nodo fb-n3">${ci('folder')} Views</div></div>`;
      return `<div class="fb-exp-t"><b>Explorer</b><span class="fb-sp"></span><button class="fb-tb" id="lhAddLh" title="Add lakehouse">${ci('add')}</button></div><div class="fb-arbol">
        <div class="fb-nodo">${ci('chevron-down')} ${ci('database')} <b>${esc(it.nombre)}</b></div>
        <div class="fb-nodo fb-n1">${ci('chevron-down')} ${ci('folder')} Tables</div><div class="fb-nodo fb-n2">${ci('chevron-down')} ${ci('symbol-namespace')} dbo</div>
        ${tablas.map((t) => `<a class="fb-nodo fb-n3${sel && sel.tipo === 'tabla' && sel.n === t ? ' sel' : ''}" data-tabla="${esc(t)}">${ci('table')} ${esc(t)}<span class="fb-sp"></span><button class="fb-mas" data-menu-t="${esc(t)}">…</button></a>`).join('')}
        ${atajos.map((a) => `<a class="fb-nodo fb-n3${sel && sel.tipo === 'atajo' && sel.n === a.nombre ? ' sel' : ''}" data-atajo="${esc(a.nombre)}">${ci('link')} ${esc(a.nombre)}</a>`).join('')}
        ${!tablas.length && !atajos.length ? '<div class="fb-nodo fb-n3 fb-dim">No tables</div>' : ''}
        <a class="fb-nodo fb-n1${sel && sel.tipo === 'carpeta' && !sel.n ? ' sel' : ''}" data-carpeta="">${ci('chevron-down')} ${ci('folder')} Files<span class="fb-sp"></span><button class="fb-mas" data-menu-f="">…</button></a>
        ${carpetas().map((d) => `<a class="fb-nodo fb-n2${sel && sel.tipo === 'carpeta' && sel.n === d ? ' sel' : ''}" data-carpeta="${esc(d)}">${ci('folder')} ${esc(d.split('/').pop())}</a>`).join('')}
        ${!archivos.length ? '<div class="fb-nodo fb-n2 fb-dim">Empty</div>' : ''}</div>`;
    };
    const principal = () => {
      if (modo === 'sql') return '<div id="lhSql" class="fb-sqlwrap"></div>';
      if (!sel) return `<div class="fb-lh-inicio"><h2 class="fb-h2">Get data in your lakehouse</h2><div class="fb-crear">
        <button class="fb-tile" id="lhUp">${ci('cloud-upload')}<b>Upload files</b><span class="fb-dim">Sube CSV desde tu computadora a Files</span></button>
        <button class="fb-tile" id="lhMuestra">${ci('beaker')}<b>Start with sample data</b><span class="fb-dim">Tablas de Tienda Andina (clientes, productos, pedidos…)</span></button>
        <button class="fb-tile" id="lhNb">${ci('notebook')}<b>New notebook</b><span class="fb-dim">Carga y transforma con Spark</span></button>
        <button class="fb-tile" id="lhAtajo">${ci('link')}<b>New shortcut</b><span class="fb-dim">Referencia tablas de otro lakehouse sin copiarlas</span></button></div>
        <div class="fb-practica">${ci('lightbulb')} <span><b>Files</b> es la zona sin administrar: archivos crudos como llegan (CSV, JSON). <b>Tables</b> es la zona administrada: tablas Delta que leen Spark, el endpoint SQL y Power BI. El paso típico es subir a Files y luego <b>Load to Tables</b>.</span></div></div>`;
      if (sel.tipo === 'tabla' || sel.tipo === 'atajo') {
        let t = it.tablas[sel.n], origen = '';
        if (sel.tipo === 'atajo') { const a = it.atajos.find((x) => x.nombre === sel.n); const o = a && c.itemDe(a.ws, a.item); t = o && o.tablas[a.tabla]; origen = o ? `Shortcut → ${esc(c.wsDe(a.ws).nombre)} / ${esc(o.nombre)} / ${esc(a.tabla)}` : 'Shortcut roto: el destino ya no existe'; }
        if (!t) return '<div class="fb-dim">La tabla no existe.</div>';
        const d = c.datosTabla(t);
        return `<div class="fb-tabla-h">${ci('table')} <b>${esc(sel.n)}</b>${origen ? ` <span class="fb-dim fb-sm">${origen}</span>` : ''}<span class="fb-sp"></span><span class="fb-dim fb-sm">${d.filas.length} rows · Delta</span></div>${grilla(esc, d.cols.map((x) => x.n), d.filas, 1000, d.cols.map((x) => x.t))}`;
      }
      if (sel.tipo === 'archivo') {
        const txt = it.files[sel.n] || '';
        let tab = null; try { if (/\.csv$/i.test(sel.n)) tab = c.tablaDesdeCsv(txt); } catch (e) { tab = null; }
        return `<div class="fb-tabla-h">${ci('file')} <b>${esc(sel.n)}</b><span class="fb-sp"></span><button class="fb-btn" data-cargar="${esc(sel.n)}">${ci('table')} Load to Tables</button></div>${tab ? grilla(esc, tab.cols.map((x) => x.n), tab.filas, 500) : `<pre class="fb-pre">${esc(txt.slice(0, 20000))}</pre>`}`;
      }
      const pre = sel.n ? sel.n + '/' : '';
      const fs = Object.keys(it.files).filter((k) => k.startsWith(pre) && !k.slice(pre.length).includes('/'));
      return `<div class="fb-tabla-h">${ci('folder')} <b>Files${sel.n ? '/' + esc(sel.n) : ''}</b><span class="fb-sp"></span><button class="fb-btn" id="lhUp2">${ci('cloud-upload')} Upload files</button></div>
        <table class="fb-tabla"><thead><tr><th>Name</th><th>Date modified</th><th>Type</th><th>Size</th><th></th></tr></thead><tbody>${fs.map((k) => `<tr><td><a data-archivo="${esc(k)}">${ci('file')} ${esc(k.slice(pre.length))}</a></td><td class="fb-dim">${new Date().toLocaleDateString('en-US')}</td><td>${esc((/\.(\w+)$/.exec(k) || [])[1] || 'file')}</td><td class="fb-dim">${(it.files[k].length / 1024).toFixed(1)} KB</td><td><button class="fb-mas" data-menu-a="${esc(k)}">…</button></td></tr>`).join('') || '<tr><td colspan="5" class="fb-dim">This folder is empty</td></tr>'}</tbody></table>`;
    };
    const cuerpo = `<div class="fb-item-v"><div class="fb-ribbon"><nav class="fb-rtabs"><a class="sel">Home</a></nav><div class="fb-rcmds">
        ${modo === 'sql' ? `<button class="fb-rb" id="lhNuevaQ">${ci('file-code')}<span>New SQL query</span></button><button class="fb-rb" id="lhRef">${ci('refresh')}<span>Refresh</span></button><button class="fb-rb" id="lhSm">${ci('type-hierarchy')}<span>New semantic model</span></button>`
        : `<button class="fb-rb" data-rmenu="get">${ci('cloud-download')}<span>Get data ▾</span></button><button class="fb-rb" id="lhSm">${ci('type-hierarchy')}<span>New semantic model</span></button><button class="fb-rb" id="lhNb2">${ci('notebook')}<span>Open notebook ▾</span></button><button class="fb-rb" id="lhRef">${ci('refresh')}<span>Refresh</span></button>`}
        <span class="fb-sp"></span><select class="fb-modo" id="lhModo"><option value="lake"${modo === 'lake' ? ' selected' : ''}>Lakehouse</option><option value="sql"${modo === 'sql' ? ' selected' : ''}>SQL analytics endpoint</option></select></div>
        <div class="fb-rmenu" data-rmenu-de="get" hidden><a id="mUp">${ci('cloud-upload')} Upload files</a><a id="mMuestra">${ci('beaker')} Sample data</a><a id="mAtajo">${ci('link')} New shortcut</a><a id="mPl">${ci('git-merge')} New pipeline</a><a class="fb-dim" id="mDf">${ci('symbol-structure')} New Dataflow Gen2</a></div></div>
      <div class="fb-split"><aside class="fb-exp" id="lhExp">${explorador()}</aside><section class="fb-princ" id="lhMain">${principal()}</section></div>
      <input type="file" id="lhFile" accept=".csv,.txt,.json" multiple hidden></div>`;
    c.marco(cuerpo);
    const m = document.getElementById('fbp');
    const re = () => { it._sel = sel; E.lakehouse(c); };
    const sube = () => m.querySelector('#lhFile').click();
    m.querySelector('#lhFile').addEventListener('change', async (e) => {
      const dir = sel && sel.tipo === 'carpeta' && sel.n ? sel.n + '/' : '';
      for (const f of e.target.files) { if (f.size > 3e6) { c.toast(`${f.name}: más de 3 MB, no entra en la práctica`); continue; } it.files[dir + f.name] = await f.text(); }
      it.mod = c.ahora(); c.guardar(); sel = { tipo: 'carpeta', n: dir.replace(/\/$/, '') }; c.toast('Upload completed'); re();
    });
    const on = (id, f) => { const el = m.querySelector(id); if (el) el.addEventListener('click', f); };
    on('#lhUp', sube); on('#lhUp2', sube); on('#mUp', sube);
    on('#lhMuestra', () => muestras(c, it, re)); on('#mMuestra', () => muestras(c, it, re));
    on('#lhAtajo', () => atajo(c, it, re)); on('#mAtajo', () => atajo(c, it, re)); on('#lhAddLh', () => c.toast('(práctica) usa New shortcut para traer tablas de otro lakehouse'));
    const nb = () => { const n = c.F().ws[c.wid]; const x = window.FabricPractica._.nuevoItem(c.wid, 'notebook', nombreLibre(n, 'Notebook')); x.lh = it.id; x.celdas = [{ id: c.uid(), tipo: 'code', lang: 'pyspark', src: `df = spark.sql("SELECT * FROM ${it.nombre}.${Object.keys(it.tablas)[0] || 'mi_tabla'} LIMIT 1000")\ndisplay(df)` }]; c.guardar(); location.hash = `#/fabric/ws/${c.wid}/${x.id}`; };
    on('#lhNb', nb); on('#lhNb2', nb);
    on('#mPl', () => { const x = window.FabricPractica._.nuevoItem(c.wid, 'pipeline', nombreLibre(c.W, 'Pipeline')); location.hash = `#/fabric/ws/${c.wid}/${x.id}`; });
    on('#mDf', () => c.toast('(práctica) Dataflow Gen2 no está en la réplica: usa Power Query en el Power BI de práctica o un notebook'));
    on('#lhSm', () => modeloDesde(c, it));
    on('#lhRef', () => { c.toast('Refreshed'); re(); });
    on('#lhNuevaQ', () => { it.consultas = it.consultas || []; const q = { id: c.uid(), nombre: `SQL query ${it.consultas.length + 1}`, sql: '' }; it.consultas.push(q); it._consulta = q.id; c.guardar(); re(); });
    m.querySelector('#lhModo').addEventListener('change', (e) => { location.hash = `#/fabric/ws/${c.wid}/${it.id}${e.target.value === 'sql' ? '?modo=sql' : ''}`; });
    const rb = m.querySelector('[data-rmenu="get"]'); if (rb) rb.addEventListener('click', (e) => { e.stopPropagation(); const mm = m.querySelector('[data-rmenu-de="get"]'); mm.hidden = !mm.hidden; });
    m.querySelectorAll('[data-tabla]').forEach((a) => a.addEventListener('click', (e) => { if (e.target.closest('.fb-mas')) return; sel = { tipo: 'tabla', n: a.dataset.tabla }; re(); }));
    m.querySelectorAll('[data-atajo]').forEach((a) => a.addEventListener('click', () => { sel = { tipo: 'atajo', n: a.dataset.atajo }; re(); }));
    m.querySelectorAll('[data-carpeta]').forEach((a) => a.addEventListener('click', (e) => { if (e.target.closest('.fb-mas')) return; sel = { tipo: 'carpeta', n: a.dataset.carpeta }; re(); }));
    m.querySelectorAll('[data-archivo]').forEach((a) => a.addEventListener('click', () => { sel = { tipo: 'archivo', n: a.dataset.archivo }; re(); }));
    m.querySelectorAll('[data-cargar]').forEach((b) => b.addEventListener('click', () => cargarATabla(c, it, b.dataset.cargar, re)));
    m.querySelectorAll('[data-menu-a]').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); menuCtx(e, [['Load to Tables', () => cargarATabla(c, it, b.dataset.menuA, re)], ['Copy ABFS path', () => copiar(c, `abfss://${c.W.nombre.replace(/\s/g, '')}@onelake.dfs.fabric.microsoft.com/${it.nombre}.Lakehouse/Files/${b.dataset.menuA}`)], ['Copy relative path for Spark', () => copiar(c, `Files/${b.dataset.menuA}`)], ['Delete', () => { delete it.files[b.dataset.menuA]; c.guardar(); re(); }]]); }));
    m.querySelectorAll('[data-menu-t]').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); const t = b.dataset.menuT; menuCtx(e, [['Properties', () => propiedades(c, it, t)], ['Maintenance', () => c.modal(`<div class="fb-modal-h"><b>Run maintenance commands</b><button class="fb-tb" data-cerrar>✕</button></div><div class="fb-modal-b"><label class="fb-check"><input type="checkbox" checked> Optimize (combina archivos chicos en archivos grandes)</label><label class="fb-check"><input type="checkbox" checked> V-Order</label><label class="fb-check"><input type="checkbox"> Run VACUUM command using retention threshold 7 days</label></div><div class="fb-modal-p"><button class="fb-btn fb-btn-p" data-cerrar>Run now</button></div>`)], ['Copy ABFS path', () => copiar(c, `abfss://${c.W.nombre.replace(/\s/g, '')}@onelake.dfs.fabric.microsoft.com/${it.nombre}.Lakehouse/Tables/dbo/${t}`)], ['Delete', () => { if (confirm(`Delete table ${t}?`)) { delete it.tablas[t]; sel = null; c.guardar(); re(); } }]]); }));
    m.querySelectorAll('[data-menu-f]').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); menuCtx(e, [['Upload files', sube], ['New subfolder', () => { const n = prompt('Folder name'); if (n) { it.files[`${n}/.keep`] = ''; c.guardar(); re(); } }]]); }));
    m.querySelectorAll('[data-sqlt]').forEach((a) => a.addEventListener('click', () => { const ta = m.querySelector('#sqTxt'); if (ta) { ta.value = SQL_EJ(a.dataset.sqlt); ta.dispatchEvent(new Event('input')); } }));
    if (modo === 'sql') editorSql(c, 'endpoint', m.querySelector('#lhSql'));
  };
  const nombreLibre = (W, base) => { const ns = new Set(Object.values(W.items).map((i) => i.nombre)); let n = 1; while (ns.has(`${base}${n}`)) n++; return `${base}${n}`; };
  function copiar(c, t) { try { navigator.clipboard.writeText(t); } catch (e) { /* sin portapapeles */ } c.toast('Copied: ' + t); }
  function menuCtx(e, ops) {
    document.querySelectorAll('.fb-ctx').forEach((x) => x.remove());
    const d = document.createElement('div'); d.className = 'fb-ctx';
    d.style.left = Math.min(e.clientX, innerWidth - 230) + 'px'; d.style.top = Math.min(e.clientY, innerHeight - 40 * ops.length - 20) + 'px';
    ops.forEach(([t, f]) => { const a = document.createElement('a'); a.textContent = t; a.onclick = () => { d.remove(); f(); }; d.append(a); });
    document.body.append(d);
    setTimeout(() => document.addEventListener('click', function x() { d.remove(); document.removeEventListener('click', x); }), 0);
  }
  function cargarATabla(c, it, ruta, re) {
    const { esc, ci } = c;
    const base = ruta.split('/').pop().replace(/\.\w+$/, '').toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/^(\d)/, 't_$1');
    c.modal(`<div class="fb-modal-h"><b>Load file to new table</b><button class="fb-tb" data-cerrar>${ci('close')}</button></div><div class="fb-modal-b">
      <label class="fb-radio"><input type="radio" name="ltM" value="new" checked> New table</label><label class="fb-radio"><input type="radio" name="ltM" value="existing"${Object.keys(it.tablas).length ? '' : ' disabled'}> Existing table (append)</label>
      <label class="fb-lbl">Table name</label><input class="fb-input" id="ltN" value="${esc(base)}"><div class="fb-nota" id="ltNota"></div>
      <label class="fb-lbl">File type</label><select class="fb-input" disabled><option>CSV</option></select>
      <label class="fb-check"><input type="checkbox" id="ltH" checked> Use header for column names</label><label class="fb-lbl">Separator</label><input class="fb-input" id="ltS" value=","></div>
      <div class="fb-modal-p"><button class="fb-btn fb-btn-p" id="ltOk">Load</button><button class="fb-btn" data-cerrar>Cancel</button></div>`, (m, cerrar) => {
      m.querySelector('#ltOk').addEventListener('click', () => {
        const n = m.querySelector('#ltN').value.trim(), modo = m.querySelector('[name=ltM]:checked').value;
        if (!/^[a-z_][a-z0-9_]*$/i.test(n)) { m.querySelector('#ltNota').textContent = 'Invalid table name: use letters, numbers and underscores.'; return; }
        if (modo === 'new' && it.tablas[n]) { m.querySelector('#ltNota').textContent = `Table '${n}' already exists. Choose "Existing table" to append.`; return; }
        const run = c.registrarRun({ nombre: `Load to table ${n}`, tipo: 'Lakehouse', wsn: c.W.nombre });
        try {
          const t = c.tablaDesdeCsv(it.files[ruta], m.querySelector('#ltH').checked, m.querySelector('#ltS').value || ',');
          if (modo === 'existing' && it.tablas[n]) {
            const ex = c.datosTabla(it.tablas[n]);
            if (ex.cols.map((x) => x.n).join() !== t.cols.map((x) => x.n).join()) throw new Error(`Schema mismatch: the file has columns (${t.cols.map((x) => x.n).join(', ')}) and the table has (${ex.cols.map((x) => x.n).join(', ')}).`);
            it.tablas[n] = { cols: ex.cols, filas: ex.filas.concat(t.filas), creado: it.tablas[n].creado, mod: c.ahora() };
          } else it.tablas[n] = { ...t, creado: c.ahora(), mod: c.ahora() };
          c.terminarRun(run, true); cerrar(); c.toast(`Table "${n}" loaded: ${t.filas.length} rows`); it._sel = { tipo: 'tabla', n }; re();
        } catch (e) { c.terminarRun(run, false, e.message); m.querySelector('#ltNota').textContent = e.message; }
      });
    });
  }
  function muestras(c, it, re) {
    const { ci } = c;
    c.modal(`<div class="fb-modal-h"><b>Sample data</b><button class="fb-tb" data-cerrar>${ci('close')}</button></div><div class="fb-modal-b"><p class="fb-dim">Tablas de Tienda Andina (las del curso). Se agregan a <b>Tables/dbo</b>${it.tipo === 'lakehouse' ? ' y un CSV de ejemplo a <b>Files/raw</b>' : ''}.</p>
      ${c.MUESTRAS.map((n) => `<label class="fb-check"><input type="checkbox" value="${n}"${['clientes', 'productos', 'pedidos'].includes(n) ? ' checked' : ''}> ${n}</label>`).join('')}</div>
      <div class="fb-modal-p"><button class="fb-btn fb-btn-p" id="smOk">Load</button><button class="fb-btn" data-cerrar>Cancel</button></div>`, (m, cerrar) => {
      m.querySelector('#smOk').addEventListener('click', () => {
        const ns = [...m.querySelectorAll('input:checked')].map((x) => x.value);
        for (const n of ns) { const d = c.filasMuestra(n); it.tablas[n] = { origen: 'muestra:' + n, cols: d.cols, creado: c.ahora(), mod: c.ahora() }; }
        if (it.tipo === 'lakehouse') {
          const d = c.filasMuestra('pedidos');
          const csv = [d.cols.map((x) => x.n).join(','), ...d.filas.slice(0, 300).map((f) => f.map((v) => (v === null ? '' : /[,"\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : v)).join(','))].join('\n') + '\n';
          it.files['raw/pedidos_2024.csv'] = csv;
        }
        c.registrarRun({ nombre: `Sample data (${ns.length} tables)`, tipo: it.tipo === 'lakehouse' ? 'Lakehouse' : 'Warehouse', wsn: c.W.nombre, estado: 'Succeeded', fin: c.ahora() });
        it.mod = c.ahora(); c.guardar(); cerrar(); c.toast(`${ns.length} tables loaded`); re();
      });
    });
  }
  function atajo(c, it, re) {
    const { esc, ci } = c;
    const fuentes = [];
    for (const [wid, w] of Object.entries(c.F().ws)) for (const o of Object.values(w.items)) if ((o.tipo === 'lakehouse' || o.tipo === 'warehouse') && o.id !== it.id) for (const t of Object.keys(o.tablas)) fuentes.push({ wid, w, o, t });
    c.modal(`<div class="fb-modal-h"><b>New shortcut</b><button class="fb-tb" data-cerrar>${ci('close')}</button></div><div class="fb-modal-b"><p class="fb-dim">Internal sources: <b>Microsoft OneLake</b>. Un atajo apunta a los datos sin copiarlos: si cambian en el origen, cambian aquí.</p>
      ${fuentes.length ? `<label class="fb-lbl">Table</label><select class="fb-input" id="atF">${fuentes.map((f, i) => `<option value="${i}">${esc(f.w.nombre)} / ${esc(f.o.nombre)} / ${esc(f.t)}</option>`).join('')}</select><label class="fb-lbl">Shortcut name</label><input class="fb-input" id="atN" value="${esc(fuentes[0].t)}">` : '<p>No hay otros lakehouses o warehouses con tablas. Crea otro y carga datos.</p>'}</div>
      <div class="fb-modal-p">${fuentes.length ? '<button class="fb-btn fb-btn-p" id="atOk">Create</button>' : ''}<button class="fb-btn" data-cerrar>Cancel</button></div>`, (m, cerrar) => {
      const s = m.querySelector('#atF'); if (s) s.addEventListener('change', () => { m.querySelector('#atN').value = fuentes[s.value].t; });
      const ok = m.querySelector('#atOk');
      if (ok) ok.addEventListener('click', () => {
        const f = fuentes[s.value], n = m.querySelector('#atN').value.trim();
        if (it.tablas[n] || (it.atajos || []).some((a) => a.nombre === n)) { c.toast('Ya existe una tabla con ese nombre'); return; }
        (it.atajos = it.atajos || []).push({ nombre: n, ws: f.wid, item: f.o.id, tabla: f.t }); c.guardar(); cerrar(); re();
      });
    });
  }
  function propiedades(c, it, t) {
    const d = c.datosTabla(it.tablas[t]);
    c.modal(`<div class="fb-modal-h"><b>Properties</b><button class="fb-tb" data-cerrar>✕</button></div><div class="fb-modal-b"><p><b>Name</b><br>${c.esc(t)}</p><p><b>Type</b><br>Managed · Delta</p><p><b>URL</b><br><code>https://onelake.dfs.fabric.microsoft.com/${c.esc(c.W.nombre.replace(/\s/g, ''))}/${c.esc(it.nombre)}.Lakehouse/Tables/dbo/${c.esc(t)}</code></p><p><b>ABFS path</b><br><code>abfss://${c.esc(c.W.nombre.replace(/\s/g, ''))}@onelake.dfs.fabric.microsoft.com/${c.esc(it.nombre)}.Lakehouse/Tables/dbo/${c.esc(t)}</code></p><p><b>Columns</b><br>${d.cols.map((x) => `${c.esc(x.n)} <span class="fb-dim">${x.t}</span>`).join(' · ')}</p></div>`);
  }
  function modeloDesde(c, it) {
    const x = window.FabricPractica._.nuevoItem(c.wid, 'semanticmodel', nombreLibre(c.W, `${it.nombre}_model`));
    x.origen = it.id; x.tablas = Object.keys(it.tablas); c.guardar(); location.hash = `#/fabric/ws/${c.wid}/${x.id}`;
  }

  // ------------------------------------------------------------------ warehouse
  E.warehouse = (c) => {
    const { esc, ci, it } = c;
    const exp = () => `<div class="fb-exp-t"><b>Explorer</b></div><div class="fb-arbol"><div class="fb-nodo">${ci('chevron-down')} ${ci('server')} <b>${esc(it.nombre)}</b></div><div class="fb-nodo fb-n1">${ci('chevron-down')} ${ci('folder')} Schemas</div><div class="fb-nodo fb-n2">${ci('chevron-down')} ${ci('symbol-namespace')} dbo</div><div class="fb-nodo fb-n3">${ci('chevron-down')} ${ci('folder')} Tables</div>
      ${Object.keys(it.tablas).sort().map((t) => `<a class="fb-nodo fb-n4" data-sqlt="${esc(t)}">${ci('table')} ${esc(t)} <span class="fb-dim fb-sm">${c.datosTabla(it.tablas[t]).filas.length}</span></a>`).join('') || '<div class="fb-nodo fb-n4 fb-dim">No tables</div>'}<div class="fb-nodo fb-n3">${ci('folder')} Views</div><div class="fb-nodo fb-n3">${ci('folder')} Stored Procedures</div></div>`;
    const cuerpo = `<div class="fb-item-v"><div class="fb-ribbon"><nav class="fb-rtabs"><a class="sel">Home</a></nav><div class="fb-rcmds"><button class="fb-rb" id="whQ">${ci('file-code')}<span>New SQL query</span></button><button class="fb-rb" id="whM">${ci('beaker')}<span>Sample data</span></button><button class="fb-rb" id="whPl">${ci('git-merge')}<span>Get data ▾</span></button><button class="fb-rb" id="whSm">${ci('type-hierarchy')}<span>New semantic model</span></button></div></div>
      <div class="fb-split"><aside class="fb-exp" id="whExp">${exp()}</aside><section class="fb-princ"><div id="whSql" class="fb-sqlwrap"></div>
      <div class="fb-practica">${ci('lightbulb')} <span>El <b>Warehouse</b> es T-SQL completo con escritura (CREATE TABLE, INSERT, UPDATE, DELETE, transacciones). Puedes consultar las tablas de un lakehouse del mismo workspace con tres partes: <code>SELECT * FROM MiLakehouse.dbo.pedidos</code>.</span></div></section></div></div>`;
    c.marco(cuerpo);
    const m = document.getElementById('fbp');
    c.pintarExplorador = () => { const e = m.querySelector('#whExp'); if (e) { e.innerHTML = exp(); enlazar(); } };
    const enlazar = () => m.querySelectorAll('[data-sqlt]').forEach((a) => a.addEventListener('click', () => { const ta = m.querySelector('#sqTxt'); if (ta) { ta.value = SQL_EJ(a.dataset.sqlt); ta.dispatchEvent(new Event('input')); } }));
    enlazar();
    editorSql(c, 'warehouse', m.querySelector('#whSql'));
    m.querySelector('#whQ').addEventListener('click', () => { it.consultas.push({ id: c.uid(), nombre: `SQL query ${it.consultas.length + 1}`, sql: '' }); it._consulta = it.consultas[it.consultas.length - 1].id; c.guardar(); E.warehouse(c); });
    m.querySelector('#whM').addEventListener('click', () => muestras(c, it, () => E.warehouse(c)));
    m.querySelector('#whPl').addEventListener('click', () => { const x = window.FabricPractica._.nuevoItem(c.wid, 'pipeline', nombreLibre(c.W, 'Pipeline')); location.hash = `#/fabric/ws/${c.wid}/${x.id}`; });
    m.querySelector('#whSm').addEventListener('click', () => modeloDesde(c, it));
  };

  // ------------------------------------------------------------------ notebook
  // PySpark: el mini-Spark del curso (el mismo de Databricks). Las tablas de los lakehouses del workspace
  // se cargan como fabric.<lakehouse>.<tabla>; las que escribe saveAsTable vuelven al lakehouse.
  async function correrPython(c, nb, src, aviso) {
    const D = window.Databricks && window.Databricks.Py;
    if (!D) return { salidas: [{ tipo: 'error', v: 'El motor de Spark no está disponible.' }], ok: false };
    const lh = nb.lh && c.itemDe(c.wid, nb.lh);
    await D.preparar(aviso);
    const lagos = Object.values(c.W.items).filter((o) => o.tipo === 'lakehouse');
    const tablas = [];
    for (const o of lagos) {
      for (const [n, t] of Object.entries(o.tablas)) { const d = c.datosTabla(t); tablas.push({ nombre: `fabric.${o.nombre}.${n}`.toLowerCase(), cols: d.cols.map((x) => x.n), filas: d.filas }); }
      for (const a of o.atajos || []) { const x = c.itemDe(a.ws, a.item); const t = x && x.tablas[a.tabla]; if (t) { const d = c.datosTabla(t); tablas.push({ nombre: `fabric.${o.nombre}.${a.nombre}`.toLowerCase(), cols: d.cols.map((y) => y.n), filas: d.filas }); } }
    }
    // rutas de archivos: relativas (Files/…), del lakehouse por defecto (/lakehouse/default/Files/…) y ABFS
    const archivos = {};
    if (lh) for (const [k, v] of Object.entries(lh.files)) { archivos[`Files/${k}`] = v; archivos[`/lakehouse/default/Files/${k}`] = v; archivos[`abfss://${c.W.nombre.replace(/\s/g, '')}@onelake.dfs.fabric.microsoft.com/${lh.nombre}.Lakehouse/Files/${k}`] = v; }
    await window.Engines.PY.repl(`import pyspark.sql as _ps2, json as _j2\n_ps2._FILES.update(_j2.loads(${JSON.stringify(JSON.stringify(archivos))}))`, 'pyspark');
    // nombres de Fabric: Lakehouse.dbo.tabla, Lakehouse.tabla y dbo.tabla → fabric.lakehouse.tabla
    let code = src;
    for (const o of lagos) code = code.replace(new RegExp(`\\b${o.nombre}\\.(?:dbo\\.)?([A-Za-z_]\\w*)\\b`, 'g'), (m, t) => `fabric.${o.nombre.toLowerCase()}.${t}`);
    code = code.replace(/\bdbo\.([A-Za-z_]\w*)\b/g, '$1');
    const payload = { code, cur: ['fabric', lh ? lh.nombre.toLowerCase() : 'default'], files: {}, secrets: {}, widgets: {}, tablas, enjob: false, tvin: {} };
    const r = await window.Engines.PY.repl(`_dbx_run(${JSON.stringify(JSON.stringify(payload))})`, 'pyspark');
    D.firma = '';   // el Databricks de práctica vuelve a mandar sus tablas la próxima vez
    const salidas = []; let post = null;
    const out = String(r.stdout || '');
    const rx = /\x01(DISPLAY|HTML|POST)([\s\S]*?)\x02/g; let m, ult = 0;
    const texto = (t) => { if (t) salidas.push({ tipo: 'texto', v: t }); };
    while ((m = rx.exec(out))) { texto(out.slice(ult, m.index)); ult = rx.lastIndex; let j; try { j = JSON.parse(m[2]); } catch (e) { continue; } if (m[1] === 'DISPLAY') salidas.push({ tipo: 'tabla', cols: j.cols, filas: j.filas, tipos: j.tipos, total: j.total }); else if (m[1] === 'POST') post = j; }
    texto(out.slice(ult));
    if (!r.ok && r.error) salidas.push({ tipo: 'error', v: r.error });
    let ok = r.ok !== false;
    if (post) {
      if (post.error) { ok = false; salidas.push({ tipo: 'error', v: `${post.error.tipo}: ${post.error.msg}${post.error.linea ? `\n  línea ${post.error.linea}: ${post.error.codigo || ''}` : ''}` }); }
      for (const t of post.escritas || []) {
        const [cat, lago, tabla] = t.nombre.split('.');
        const o = cat === 'fabric' && lagos.find((x) => x.nombre.toLowerCase() === lago);
        if (!o) { salidas.push({ tipo: 'error', v: `No se puede escribir en ${t.nombre}: escribe en un lakehouse del workspace (saveAsTable("tabla") va al lakehouse por defecto).` }); continue; }
        const cols = t.cols.map((n, i) => ({ n, t: tipoDe2(t.filas.map((f) => f[i])) }));
        o.tablas[tabla] = { cols, filas: t.filas, creado: (o.tablas[tabla] || {}).creado || c.ahora(), mod: c.ahora() };
        o.mod = c.ahora();
      }
      if ((post.escritas || []).length) c.guardar();
    }
    return { salidas, ok };
  }
  const tipoDe2 = (vals) => { const v = vals.filter((x) => x !== null && x !== undefined); if (!v.length) return 'string'; if (v.every((x) => Number.isInteger(x))) return 'int'; if (v.every((x) => typeof x === 'number')) return 'double'; if (v.every((x) => typeof x === 'boolean')) return 'boolean'; return 'string'; };
  function correrSparkSql(c, nb, src) {
    const lh = nb.lh && c.itemDe(c.wid, nb.lh);
    if (!lh) return { salidas: [{ tipo: 'error', v: 'AnalysisException: No default lakehouse is attached. Add a lakehouse in the Explorer (Add data items → Lakehouse).' }], ok: false };
    const S = window.Engines.SQL, db = c.baseDe(c.W, lh);
    try {
      let sql = src.replace(/\bUSING\s+DELTA\b/gi, '').replace(/\bCREATE\s+OR\s+REPLACE\s+TABLE\s+([\w.]+)/gi, (m, t) => `DROP TABLE IF EXISTS ${t};\nCREATE TABLE ${t}`);
      for (const o of Object.values(c.W.items)) if (o.tipo === 'lakehouse' || o.tipo === 'warehouse') sql = sql.replace(new RegExp(`\\b${o.nombre}\\.(?:dbo\\.)?([A-Za-z_]\\w*)\\b`, 'gi'), (m, t) => (o === lh ? t : `"${o.nombre.toLowerCase()}__${t.toLowerCase()}"`));
      sql = sql.replace(/\bdbo\.([A-Za-z_]\w*)\b/gi, '$1');
      const r = S.exec(sql, db);
      if (!r.ok) return { salidas: [{ tipo: 'error', v: `[PARSE_SYNTAX_ERROR] ${r.error}` }], ok: false };
      c.sincronizar(db, lh);
      const ult = r.results[r.results.length - 1];
      return { salidas: ult ? [{ tipo: 'tabla', cols: ult.columns, filas: ult.values, total: ult.values.length }] : [{ tipo: 'texto', v: r.changes ? `${r.changes} rows affected` : 'OK' }], ok: true };
    } finally { db.close(); }
  }
  async function correrCelda(c, nb, cel, aviso) {
    if (cel.tipo === 'md') return { salidas: [], ok: true };
    const src = cel.src || '';
    const sql = cel.lang === 'sql' || /^%%sql\b/.test(src);
    const cuerpo = src.replace(/^%%(sql|pyspark|python)[ \t]*\n?/, '');
    if (!cuerpo.trim()) return { salidas: [], ok: true };
    return sql ? correrSparkSql(c, nb, cuerpo) : correrPython(c, nb, cuerpo, aviso);
  }
  window.FabricCorrerNotebook = async (c, nb) => { const res = []; for (const cel of nb.celdas) { const r = await correrCelda(c, nb, cel); res.push(r); if (!r.ok) return { ok: false, error: (r.salidas.find((s) => s.tipo === 'error') || {}).v }; } return { ok: true }; };
  const mdHtml = (esc, s) => esc(s).replace(/^### (.*)$/gm, '<h4>$1</h4>').replace(/^## (.*)$/gm, '<h3>$1</h3>').replace(/^# (.*)$/gm, '<h2>$1</h2>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\n/g, '<br>');
  E.notebook = (c) => {
    const { esc, ci, it } = c;
    const lagos = Object.values(c.W.items).filter((o) => o.tipo === 'lakehouse');
    const lh = it.lh && c.itemDe(c.wid, it.lh);
    const salidaHtml = (s) => s.map((o) => (o.tipo === 'tabla' ? `<div class="fb-out-t">${grilla(esc, o.cols, o.filas, 200, o.tipos)}${o.total > 200 ? `<div class="fb-dim fb-sm">${o.total} rows</div>` : ''}</div>` : o.tipo === 'error' ? `<pre class="fb-err">${esc(o.v)}</pre>` : `<pre class="fb-out">${esc(o.v)}</pre>`)).join('');
    const celda = (cel, i) => cel.tipo === 'md'
      ? `<div class="fb-cel fb-cel-md" data-cel="${cel.id}"><div class="fb-cel-bar"><span class="fb-dim fb-sm">Markdown</span><span class="fb-sp"></span><button class="fb-tb" data-borrar="${cel.id}" title="Delete">${ci('trash')}</button></div>${cel.editando ? `<textarea class="fb-cel-ed" data-src="${cel.id}" spellcheck="false">${esc(cel.src)}</textarea>` : `<div class="fb-md" data-editar="${cel.id}">${mdHtml(esc, cel.src) || '<span class="fb-dim">Doble clic para editar</span>'}</div>`}</div>`
      : `<div class="fb-cel" data-cel="${cel.id}"><div class="fb-cel-izq"><button class="fb-run" data-run="${cel.id}" title="Run cell (Shift+Enter)">${cel._corriendo ? ci('loading') : ci('play')}</button><span class="fb-dim fb-sm">[${cel.n || ' '}]</span></div><div class="fb-cel-c"><div class="fb-cel-bar"><select class="fb-lang" data-lang="${cel.id}"><option value="pyspark"${cel.lang !== 'sql' ? ' selected' : ''}>PySpark (Python)</option><option value="sql"${cel.lang === 'sql' ? ' selected' : ''}>Spark SQL</option></select><span class="fb-sp"></span><button class="fb-tb" data-borrar="${cel.id}" title="Delete">${ci('trash')}</button></div>
        <textarea class="fb-cel-ed" data-src="${cel.id}" spellcheck="false" rows="${Math.max(3, cel.src.split('\n').length + 1)}">${esc(cel.src)}</textarea>${cel.salidas ? `<div class="fb-cel-out">${cel.ok === false ? `<div class="fb-dim fb-sm">${ci('error')} Failed</div>` : `<div class="fb-dim fb-sm">${ci('pass-filled')} ${cel.ms ? (cel.ms / 1000).toFixed(1) + ' sec' : ''} - Command executed</div>`}${salidaHtml(cel.salidas)}</div>` : ''}</div></div>`;
    const cuerpo = `<div class="fb-item-v"><div class="fb-ribbon"><nav class="fb-rtabs"><a class="sel">Home</a><a class="fb-dim">Edit</a><a class="fb-dim">Run</a><a class="fb-dim">View</a></nav><div class="fb-rcmds">
        <button class="fb-rb" id="nbAll">${ci('run-all')}<span>Run all</span></button><button class="fb-rb" id="nbStop">${ci('debug-stop')}<span>Stop session</span></button><span class="fb-rsep"></span><button class="fb-rb" id="nbAddC">${ci('add')}<span>+ Code</span></button><button class="fb-rb" id="nbAddM">${ci('markdown')}<span>+ Markdown</span></button><span class="fb-sp"></span><span class="fb-dim fb-sm">${ci('circle-filled')} Spark session · Language: PySpark (Python)</span></div></div>
      <div class="fb-split"><aside class="fb-exp"><div class="fb-exp-t"><b>Explorer</b></div><div class="fb-exp-s">Data items</div>
        ${lh ? `<div class="fb-arbol"><div class="fb-nodo">${ci('database')} <b>${esc(lh.nombre)}</b> <span class="fb-pin" title="Default lakehouse">★</span></div><div class="fb-nodo fb-n1">${ci('folder')} Tables</div>${Object.keys(lh.tablas).concat((lh.atajos || []).map((a) => a.nombre)).map((t) => `<a class="fb-nodo fb-n2" data-ins="${esc(t)}" title="Insertar código para leer la tabla">${ci('table')} ${esc(t)}</a>`).join('')}<div class="fb-nodo fb-n1">${ci('folder')} Files</div>${Object.keys(lh.files).filter((k) => !/\.keep$/.test(k)).map((k) => `<a class="fb-nodo fb-n2" data-insf="${esc(k)}" title="Insertar código para leer el archivo">${ci('file')} ${esc(k)}</a>`).join('')}</div>` : ''}
        <div class="fb-exp-p"><label class="fb-lbl fb-sm">${lh ? 'Change default lakehouse' : 'Add data items: Lakehouse'}</label><select class="fb-input" id="nbLh"><option value="">—</option>${lagos.map((o) => `<option value="${o.id}"${o === lh ? ' selected' : ''}>${esc(o.nombre)}</option>`).join('')}</select>${lagos.length ? '' : '<div class="fb-dim fb-sm">No hay lakehouses en este workspace.</div>'}</div></aside>
      <section class="fb-princ fb-nb" id="nbCeldas">${it.celdas.map(celda).join('')}<div class="fb-nb-add"><button class="fb-btn" data-add="code">${ci('add')} Code</button><button class="fb-btn" data-add="md">${ci('add')} Markdown</button></div>
        <div class="fb-practica">${ci('lightbulb')} <span>Con un lakehouse por defecto, <code>spark.read.csv("Files/raw/pedidos_2024.csv", header=True)</code> lee un archivo, <code>spark.table("pedidos")</code> o <code>spark.sql("SELECT …")</code> leen tablas, y <code>df.write.mode("overwrite").saveAsTable("pedidos_limpios")</code> escribe una tabla Delta que aparece en Tables. Cambia el lenguaje a Spark SQL o empieza la celda con <code>%%sql</code>.</span></div></section></div></div>`;
    c.marco(cuerpo);
    const m = document.getElementById('fbp');
    const re = () => E.notebook(c);
    const cel = (id) => it.celdas.find((x) => x.id === id);
    m.querySelectorAll('[data-src]').forEach((ta) => {
      ta.addEventListener('input', () => { cel(ta.dataset.src).src = ta.value; ta.rows = Math.max(3, ta.value.split('\n').length + 1); clearTimeout(ta._t); ta._t = setTimeout(c.guardar, 400); });
      ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.shiftKey) { e.preventDefault(); const x = cel(ta.dataset.src); if (x.tipo === 'md') { x.editando = false; c.guardar(); re(); } else correr(x.id); } if (e.key === 'Tab') { e.preventDefault(); const s = ta.selectionStart; ta.value = ta.value.slice(0, s) + '    ' + ta.value.slice(ta.selectionEnd); ta.selectionStart = ta.selectionEnd = s + 4; cel(ta.dataset.src).src = ta.value; } });
    });
    m.querySelectorAll('[data-editar]').forEach((d) => d.addEventListener('dblclick', () => { cel(d.dataset.editar).editando = true; re(); }));
    m.querySelectorAll('[data-lang]').forEach((s) => s.addEventListener('change', () => { cel(s.dataset.lang).lang = s.value; c.guardar(); }));
    m.querySelectorAll('[data-borrar]').forEach((b) => b.addEventListener('click', () => { it.celdas = it.celdas.filter((x) => x.id !== b.dataset.borrar); if (!it.celdas.length) it.celdas.push({ id: c.uid(), tipo: 'code', lang: 'pyspark', src: '' }); c.guardar(); re(); }));
    const add = (tipo) => { it.celdas.push({ id: c.uid(), tipo, lang: 'pyspark', src: '', editando: tipo === 'md' }); c.guardar(); re(); };
    m.querySelectorAll('[data-add]').forEach((b) => b.addEventListener('click', () => add(b.dataset.add)));
    m.querySelector('#nbAddC').addEventListener('click', () => add('code')); m.querySelector('#nbAddM').addEventListener('click', () => add('md'));
    m.querySelector('#nbLh').addEventListener('change', (e) => { it.lh = e.target.value || null; c.guardar(); re(); });
    m.querySelector('#nbStop').addEventListener('click', () => { if (window.Databricks && window.Databricks.Py) window.Databricks.Py.limpiarEstado(); c.toast('Session stopped: las variables de Python se borraron'); });
    const insertar = (txt) => { const ult = it.celdas.filter((x) => x.tipo === 'code').pop(); if (ult && !ult.src.trim()) ult.src = txt; else it.celdas.push({ id: c.uid(), tipo: 'code', lang: 'pyspark', src: txt }); c.guardar(); re(); };
    m.querySelectorAll('[data-ins]').forEach((a) => a.addEventListener('click', () => insertar(`df = spark.sql("SELECT * FROM ${lh.nombre}.dbo.${a.dataset.ins} LIMIT 1000")\ndisplay(df)`)));
    m.querySelectorAll('[data-insf]').forEach((a) => a.addEventListener('click', () => insertar(`df = spark.read.format("csv").option("header", "true").load("Files/${a.dataset.insf}")\n# df now is a Spark DataFrame containing CSV data from "Files/${a.dataset.insf}".\ndisplay(df)`)));
    let contador = it._n || 0;
    const correr = async (id) => {
      const x = cel(id); x._corriendo = true; re();
      const run = c.registrarRun({ nombre: `${it.nombre} (cell)`, tipo: 'Notebook', wsn: c.W.nombre });
      const t0 = Date.now();
      let r;
      try { r = await correrCelda(c, it, x, (msg) => c.toast(msg)); } catch (e) { r = { salidas: [{ tipo: 'error', v: e.message }], ok: false }; }
      x._corriendo = false; x.salidas = r.salidas; x.ok = r.ok; x.ms = Date.now() - t0; x.n = ++contador; it._n = contador;
      c.terminarRun(run, r.ok, r.ok ? null : (r.salidas.find((s) => s.tipo === 'error') || {}).v);
      c.guardar(); re();
      return r.ok;
    };
    m.querySelectorAll('[data-run]').forEach((b) => b.addEventListener('click', () => correr(b.dataset.run)));
    m.querySelector('#nbAll').addEventListener('click', async () => { for (const x of it.celdas.filter((y) => y.tipo === 'code')) if (!(await correr(x.id))) break; });
  };

  // ------------------------------------------------------------------ pipeline
  E.pipeline = (c) => {
    const { esc, ci, it } = c;
    it.acts = it.acts || []; it.runs = it.runs || [];
    let sel = it._selAct || null;
    const destinos = Object.values(c.W.items).filter((o) => o.tipo === 'lakehouse' || o.tipo === 'warehouse');
    const notebooks = Object.values(c.W.items).filter((o) => o.tipo === 'notebook');
    const a = it.acts.find((x) => x.id === sel);
    const props = () => {
      if (!a) return `<nav class="fb-tabs fb-tabs-sm"><a class="sel">Output</a><a class="fb-dim">Parameters</a><a class="fb-dim">Variables</a></nav>${it.runs.length ? `<table class="fb-tabla"><thead><tr><th>Activity name</th><th>Status</th><th>Run start</th><th>Duration</th><th>Output</th></tr></thead><tbody>${it.runs[0].acts.map((r) => `<tr><td>${esc(r.nombre)}</td><td><span class="fb-estado fb-estado-${r.estado === 'Succeeded' ? 'ok' : r.estado === 'Failed' ? 'mal' : r.estado === 'Skipped' ? 'skip' : 'run'}">${r.estado}</span></td><td class="fb-dim">${new Date(it.runs[0].inicio).toLocaleTimeString('en-US')}</td><td class="fb-dim">${r.ms != null ? Math.max(1, Math.round(r.ms / 1000)) + 's' : '—'}</td><td class="fb-sm">${esc(r.salida || '')}</td></tr>`).join('')}</tbody></table>` : '<p class="fb-dim">Run the pipeline to see the output of each activity.</p>'}`;
      if (a.tipo === 'copy') return `<nav class="fb-tabs fb-tabs-sm"><a class="sel">General · Source · Destination</a></nav><div class="fb-props">
        <label class="fb-lbl">Name</label><input class="fb-input" data-p="nombre" value="${esc(a.nombre)}">
        <h4>Source</h4><label class="fb-lbl">Connection</label><select class="fb-input" data-p="srcTipo"><option value="muestra"${a.srcTipo !== 'archivo' ? ' selected' : ''}>Sample data (Tienda Andina)</option><option value="archivo"${a.srcTipo === 'archivo' ? ' selected' : ''}>Lakehouse file (CSV)</option></select>
        ${a.srcTipo === 'archivo' ? `<label class="fb-lbl">File</label><select class="fb-input" data-p="src">${Object.values(c.W.items).filter((o) => o.tipo === 'lakehouse').flatMap((o) => Object.keys(o.files).filter((k) => /\.csv$/i.test(k)).map((k) => `<option value="${o.id}|${esc(k)}"${a.src === `${o.id}|${k}` ? ' selected' : ''}>${esc(o.nombre)}/Files/${esc(k)}</option>`)).join('') || '<option value="">No hay CSV en los lakehouses</option>'}</select>` : `<label class="fb-lbl">Table</label><select class="fb-input" data-p="src">${c.MUESTRAS.map((n) => `<option${a.src === n ? ' selected' : ''}>${n}</option>`).join('')}</select>`}
        <h4>Destination</h4><label class="fb-lbl">Lakehouse / Warehouse</label><select class="fb-input" data-p="destItem">${destinos.map((o) => `<option value="${o.id}"${(a.dest || {}).item === o.id ? ' selected' : ''}>${esc(o.nombre)} (${c.TIPOS[o.tipo].n})</option>`).join('') || '<option value="">Crea un lakehouse primero</option>'}</select>
        <label class="fb-lbl">Table</label><input class="fb-input" data-p="destTabla" value="${esc((a.dest || {}).tabla || '')}"><label class="fb-lbl">Table action</label><select class="fb-input" data-p="destModo"><option value="append"${(a.dest || {}).modo !== 'overwrite' ? ' selected' : ''}>Append</option><option value="overwrite"${(a.dest || {}).modo === 'overwrite' ? ' selected' : ''}>Overwrite</option></select></div>`;
      return `<nav class="fb-tabs fb-tabs-sm"><a class="sel">General · Settings</a></nav><div class="fb-props"><label class="fb-lbl">Name</label><input class="fb-input" data-p="nombre" value="${esc(a.nombre)}"><label class="fb-lbl">Notebook</label><select class="fb-input" data-p="nb"><option value="">—</option>${notebooks.map((o) => `<option value="${o.id}"${a.nb === o.id ? ' selected' : ''}>${esc(o.nombre)}</option>`).join('')}</select><label class="fb-lbl">Retry</label><input class="fb-input" value="0" disabled></div>`;
    };
    const lienzo = it.acts.map((x, i) => { const ult = it.runs[0] && it.runs[0].acts.find((r) => r.id === x.id); return `${i ? `<span class="fb-flecha" title="On success">${ci('arrow-right')}</span>` : ''}<div class="fb-act${x.id === sel ? ' sel' : ''}" data-act="${x.id}"><div class="fb-act-t">${x.tipo === 'copy' ? 'Copy data' : 'Notebook'}</div><div class="fb-act-b">${ci(x.tipo === 'copy' ? 'copy' : 'notebook')} ${esc(x.nombre)}</div>${ult ? `<span class="fb-act-e fb-estado-${ult.estado === 'Succeeded' ? 'ok' : ult.estado === 'Failed' ? 'mal' : 'skip'}">${ult.estado === 'Succeeded' ? ci('pass-filled') : ult.estado === 'Failed' ? ci('error') : ci('circle-slash')}</span>` : ''}<button class="fb-act-x" data-quitar="${x.id}" title="Delete">${ci('trash')}</button></div>`; }).join('');
    const cuerpo = `<div class="fb-item-v"><div class="fb-ribbon"><nav class="fb-rtabs"><a class="sel">Home</a><a class="fb-dim">Activities</a><a class="fb-dim">Run</a></nav><div class="fb-rcmds">
        <button class="fb-rb" id="plSave">${ci('save')}<span>Save</span></button><button class="fb-rb" id="plRun">${ci('play')}<span>Run</span></button><button class="fb-rb" id="plSched">${ci('calendar')}<span>Schedule</span></button><span class="fb-rsep"></span>
        <button class="fb-rb" id="plCopy">${ci('copy')}<span>Copy data</span></button><button class="fb-rb" id="plNb">${ci('notebook')}<span>Notebook</span></button><button class="fb-rb fb-dim" id="plMas">${ci('ellipsis')}<span>More activities</span></button></div></div>
      <div class="fb-lienzo">${lienzo || `<div class="fb-vacio">${ci('git-merge')}<h3>Start building your pipeline</h3><p class="fb-dim">Agrega una actividad <b>Copy data</b> para traer datos a un lakehouse y luego un <b>Notebook</b> para transformarlos. Se ejecutan en orden: cada una espera el éxito de la anterior.</p></div>`}</div>
      <div class="fb-pl-props">${props()}</div></div>`;
    c.marco(cuerpo);
    const m = document.getElementById('fbp');
    const re = () => { it._selAct = sel; E.pipeline(c); };
    const agregar = (tipo) => { const x = { id: c.uid(), tipo, nombre: tipo === 'copy' ? `Copy data${it.acts.filter((y) => y.tipo === 'copy').length + 1}` : `Notebook${it.acts.filter((y) => y.tipo === 'nb').length + 1}`, srcTipo: 'muestra', src: 'pedidos', dest: { item: (destinos[0] || {}).id, tabla: 'pedidos', modo: 'overwrite' }, nb: (notebooks[0] || {}).id }; it.acts.push(x); sel = x.id; c.guardar(); re(); };
    m.querySelector('#plCopy').addEventListener('click', () => agregar('copy'));
    m.querySelector('#plNb').addEventListener('click', () => agregar('nb'));
    m.querySelector('#plMas').addEventListener('click', () => c.toast('(práctica) más actividades (ForEach, If, Lookup…) están en el Data Factory del portal de Azure'));
    m.querySelector('#plSave').addEventListener('click', () => { c.guardar(); c.toast('Saved'); });
    m.querySelector('#plSched').addEventListener('click', () => c.toast('(práctica) la programación no dispara sola: usa Run'));
    m.querySelectorAll('[data-act]').forEach((d) => d.addEventListener('click', (e) => { if (e.target.closest('[data-quitar]')) return; sel = d.dataset.act === sel ? null : d.dataset.act; re(); }));
    m.querySelectorAll('[data-quitar]').forEach((b) => b.addEventListener('click', () => { it.acts = it.acts.filter((x) => x.id !== b.dataset.quitar); sel = null; c.guardar(); re(); }));
    m.querySelectorAll('[data-p]').forEach((inp) => inp.addEventListener('change', () => {
      const k = inp.dataset.p, v = inp.value;
      if (k === 'destItem') a.dest.item = v; else if (k === 'destTabla') a.dest.tabla = v.trim(); else if (k === 'destModo') a.dest.modo = v; else a[k] = v;
      if (k === 'srcTipo') a.src = '';
      c.guardar(); if (k === 'srcTipo' || k === 'nombre') re();
    }));
    m.querySelector('#plRun').addEventListener('click', async () => {
      if (!it.acts.length) { c.toast('Agrega al menos una actividad'); return; }
      const run = { inicio: c.ahora(), acts: it.acts.map((x) => ({ id: x.id, nombre: x.nombre, estado: 'Queued' })) };
      it.runs.unshift(run); it.runs.length = Math.min(it.runs.length, 10);
      const mon = c.registrarRun({ nombre: it.nombre, tipo: 'Pipeline', wsn: c.W.nombre });
      sel = null; re();
      let fallo = false;
      for (const x of it.acts) {
        const r = run.acts.find((y) => y.id === x.id);
        if (fallo) { r.estado = 'Skipped'; continue; }
        r.estado = 'In progress'; re();
        const t0 = Date.now();
        try {
          if (x.tipo === 'copy') {
            const dest = c.itemDe(c.wid, x.dest && x.dest.item);
            if (!dest) throw new Error('ErrorCode=UserErrorInvalidDestination: elige un lakehouse o warehouse de destino');
            if (!x.dest.tabla || !/^[A-Za-z_]\w*$/.test(x.dest.tabla)) throw new Error('ErrorCode=UserErrorInvalidTableName: el nombre de la tabla de destino no es válido');
            let datos;
            if (x.srcTipo === 'archivo') { const [oid, ruta] = String(x.src || '').split('|'); const o = c.itemDe(c.wid, oid); if (!o || o.files[ruta] === undefined) throw new Error('ErrorCode=UserErrorFileNotFound: el archivo de origen no existe'); datos = c.tablaDesdeCsv(o.files[ruta]); }
            else datos = c.filasMuestra(x.src || 'pedidos');
            const prev = dest.tablas[x.dest.tabla];
            if (prev && x.dest.modo === 'append') { const p = c.datosTabla(prev); if (p.cols.map((y) => y.n).join() !== datos.cols.map((y) => y.n).join()) throw new Error('ErrorCode=DeltaSchemaMismatch: las columnas del origen no coinciden con la tabla de destino'); dest.tablas[x.dest.tabla] = { cols: p.cols, filas: p.filas.concat(datos.filas), creado: prev.creado, mod: c.ahora() }; }
            else dest.tablas[x.dest.tabla] = x.srcTipo !== 'archivo' ? { origen: 'muestra:' + (x.src || 'pedidos'), cols: datos.cols, creado: c.ahora(), mod: c.ahora() } : { ...datos, creado: c.ahora(), mod: c.ahora() };
            dest.mod = c.ahora();
            r.salida = `rowsRead: ${datos.filas.length}, rowsCopied: ${datos.filas.length}`;
            await new Promise((ok) => setTimeout(ok, 500));
          } else {
            const nb = c.itemDe(c.wid, x.nb);
            if (!nb) throw new Error('ErrorCode=NotebookNotFound: elige un notebook');
            const rr = await window.FabricCorrerNotebook(c, nb);
            if (!rr.ok) throw new Error(`Notebook execution failed: ${rr.error}`);
            r.salida = 'exitValue: (none)';
          }
          r.estado = 'Succeeded';
        } catch (e) { r.estado = 'Failed'; r.salida = e.message; fallo = true; }
        r.ms = Date.now() - t0; c.guardar(); re();
      }
      c.terminarRun(mon, !fallo, fallo ? run.acts.find((y) => y.estado === 'Failed').salida : null);
      c.toast(fallo ? 'Pipeline failed' : 'Pipeline succeeded'); re();
    });
  };

  // ------------------------------------------------------------------ modelo semántico
  E.semanticmodel = (c) => {
    const { esc, ci, it } = c;
    const fuentes = Object.values(c.W.items).filter((o) => o.tipo === 'lakehouse' || o.tipo === 'warehouse');
    const src = it.origen && c.itemDe(c.wid, it.origen);
    it.tablas = (it.tablas || []).filter((t) => src && src.tablas[t]);
    const tarjeta = (t) => { const d = c.datosTabla(src.tablas[t]); return `<div class="fb-mtab"><div class="fb-mtab-h">${ci('table')} ${esc(t)}</div>${d.cols.map((x) => `<div class="fb-mtab-c">${x.t === 'int' || x.t === 'double' ? 'Σ' : ''} ${esc(x.n)}</div>`).join('')}</div>`; };
    const cuerpo = `<div class="fb-item-v"><div class="fb-ribbon"><nav class="fb-rtabs"><a class="sel">Home</a></nav><div class="fb-rcmds"><button class="fb-rb" id="smTablas">${ci('table')}<span>Edit tables</span></button><button class="fb-rb" id="smMedida">${ci('symbol-operator')}<span>New measure</span></button><button class="fb-rb" id="smRep">${ci('graph')}<span>New report</span></button><button class="fb-rb" id="smCsv">${ci('cloud-download')}<span>Exportar CSV</span></button><span class="fb-sp"></span><span class="fb-dim fb-sm">Storage mode: Direct Lake</span></div></div>
      <div class="fb-pag">${!src ? `<label class="fb-lbl">Source</label><select class="fb-input fb-input-auto" id="smSrc"><option value="">Elige un lakehouse o warehouse</option>${fuentes.map((o) => `<option value="${o.id}">${esc(o.nombre)}</option>`).join('')}</select>`
        : `<p class="fb-dim">Source: <b>${esc(src.nombre)}</b> (${c.TIPOS[src.tipo].n}) · ${it.tablas.length} tables</p><div class="fb-modelo">${it.tablas.map(tarjeta).join('') || '<p class="fb-dim">Elige tablas con Edit tables.</p>'}</div>`}
        <h3 class="fb-h3">Measures</h3>${(it.medidas || []).length ? `<table class="fb-tabla">${it.medidas.map((x) => `<tr><td><b>${esc(x.n)}</b></td><td><code>${esc(x.expr)}</code></td></tr>`).join('')}</table>` : '<p class="fb-dim">Sin medidas todavía.</p>'}
        <div class="fb-practica">${ci('lightbulb')} <span>Con <b>Direct Lake</b>, Power BI lee las tablas Delta de OneLake directamente, sin importar una copia ni consultar en vivo con SQL. Para practicar el informe, usa <b>Exportar CSV</b> y cárgalos en el <a href="#/powerbi">Power BI de práctica</a> (Obtener datos → Texto/CSV).</span></div></div></div>`;
    c.marco(cuerpo);
    const m = document.getElementById('fbp'), re = () => E.semanticmodel(c);
    const s = m.querySelector('#smSrc'); if (s) s.addEventListener('change', () => { it.origen = s.value; it.tablas = Object.keys((c.itemDe(c.wid, s.value) || { tablas: {} }).tablas); c.guardar(); re(); });
    m.querySelector('#smTablas').addEventListener('click', () => {
      if (!src) { c.toast('Elige primero el origen'); return; }
      c.modal(`<div class="fb-modal-h"><b>Edit semantic model</b><button class="fb-tb" data-cerrar>✕</button></div><div class="fb-modal-b">${Object.keys(src.tablas).map((t) => `<label class="fb-check"><input type="checkbox" value="${esc(t)}"${it.tablas.includes(t) ? ' checked' : ''}> ${esc(t)}</label>`).join('')}</div><div class="fb-modal-p"><button class="fb-btn fb-btn-p" id="etOk">Confirm</button></div>`, (mm, cerrar) => mm.querySelector('#etOk').addEventListener('click', () => { it.tablas = [...mm.querySelectorAll('input:checked')].map((x) => x.value); c.guardar(); cerrar(); re(); }));
    });
    m.querySelector('#smMedida').addEventListener('click', () => {
      c.modal(`<div class="fb-modal-h"><b>New measure</b><button class="fb-tb" data-cerrar>✕</button></div><div class="fb-modal-b"><label class="fb-lbl">Name</label><input class="fb-input" id="mdN" value="Total ventas"><label class="fb-lbl">DAX</label><textarea class="fb-input fb-mono" id="mdE" rows="3">SUM(pedidos[total])</textarea></div><div class="fb-modal-p"><button class="fb-btn fb-btn-p" id="mdOk">Save</button></div>`, (mm, cerrar) => mm.querySelector('#mdOk').addEventListener('click', () => { (it.medidas = it.medidas || []).push({ n: mm.querySelector('#mdN').value.trim(), expr: mm.querySelector('#mdE').value.trim() }); c.guardar(); cerrar(); re(); }));
    });
    m.querySelector('#smRep').addEventListener('click', () => c.toast('(práctica) arma el informe en el Power BI de práctica con los CSV exportados'));
    m.querySelector('#smCsv').addEventListener('click', () => {
      if (!src || !it.tablas.length || !window.Generador) { c.toast('Elige tablas primero'); return; }
      const archivos = it.tablas.map((t) => { const d = c.datosTabla(src.tablas[t]); return [`${t}.csv`, [d.cols.map((x) => x.n).join(','), ...d.filas.map((f) => f.map((v) => (v === null ? '' : /[,"\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : v)).join(','))].join('\n') + '\n']; });
      const a = document.createElement('a'); a.href = URL.createObjectURL(window.Generador.zip(archivos)); a.download = `${it.nombre}.zip`; a.click();
    });
  };

  window.FabricEditores = E;
})();
