/* Databricks de práctica: Analytics (learn.microsoft.com/azure/databricks):
 *  - AI/BI Dashboards: conjuntos de datos (consultas SQL), widgets (contador, barras, líneas, área, torta, tabla),
 *    filtros por campo que se aplican a todos los conjuntos que tengan esa columna, borrador y versión publicada.
 *  - Alerts: una consulta + una condición (columna, operador, umbral) + horario; "Evaluate" muestra OK o TRIGGERED.
 *  - Genie Agents: un espacio con tablas elegidas, instrucciones y preguntas de ejemplo; responde preguntas en
 *    lenguaje natural generando SQL (reglas simples: detecta medidas, agrupaciones, filtros, top N y orden).
 * Corre sobre el mismo motor SQL de la práctica (DBSQL), con Unity Catalog y los samples. */
(function () {
  'use strict';
  const D = (window.DBX = window.DBX || {});
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const ic = (n) => `<i class="codicon codicon-${n}"></i>`;
  const SQL = () => window.DBSQL;
  const id = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  const ahora = () => new Date().toISOString();
  const hora = (iso) => (iso ? new Date(iso).toLocaleString('es') : '—');
  const W = () => { const w = D.ws(); w.dashboards = w.dashboards || []; w.alertas = w.alertas || []; w.genie = w.genie || []; return w; };
  const sinTilde = (x) => String(x ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  async function correr(sql, origen) { const rs = await SQL().ejecutar(sql, { Store: D.Store, origen }); const r = rs[rs.length - 1] || {}; if (r.ok === false) throw new Error(r.error || 'Error en la consulta'); return r; }
  const tabla = (r, max = 50) => `<div class="dbx-res-tabla"><table class="dbx-tabla"><thead><tr>${r.cols.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${r.filas.slice(0, max).map((f) => `<tr>${f.map((x) => `<td class="${typeof x === 'number' ? 'num' : ''}">${esc(x == null ? 'null' : typeof x === 'number' ? Math.round(x * 100) / 100 : x)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  const tablasDisponibles = () => { const out = []; for (const c of SQL().arbol()) for (const s of c.schemas) for (const t of s.tablas) if (!s.sistema) out.push({ fq: `${c.nombre}.${s.nombre}.${t.nombre}`, cols: (t.cols || []).map((x) => (typeof x === 'string' ? x : x.n || x.nombre)), comment: t.comment }); return out; };

  // ================================================================ AI/BI Dashboards
  D.registrar('dashboards', (cont, p) => { if (p[0]) return dashboard(cont, p[0], p[1]); listaDashboards(cont); });
  function listaDashboards(cont) {
    const w = W();
    cont.innerHTML = `<div class="dbx-pag"><div class="dbx-pag-cab"><h1>Dashboards</h1><div class="dbx-acciones"><button class="dbx-btn primario" data-nuevo>${ic('add')} Create dashboard</button></div></div>
      <p class="dbx-dim">Un dashboard de AI/BI junta varias consultas (<b>datasets</b>) y gráficos (<b>widgets</b>) en una página, con filtros. Se edita como <b>borrador</b> y se <b>publica</b> para que lo vean otros.</p>
      ${w.dashboards.length ? `<table class="dbx-tabla"><thead><tr><th>Name</th><th>Datasets</th><th>Widgets</th><th>Status</th><th>Modified</th></tr></thead><tbody>${w.dashboards.map((d) => `<tr><td><a href="#/databricks/dashboards/${d.id}">${ic('dashboard')} ${esc(d.nombre)}</a></td><td>${d.datasets.length}</td><td>${d.widgets.length}</td><td>${d.publicado ? `<span class="dbx-ok">Published</span> ${hora(d.publicado)}` : 'Draft'}</td><td>${hora(d.modificado)}</td></tr>`).join('')}</tbody></table>` : `<div class="dbx-vacio">${ic('dashboard')}<p>No hay dashboards. Crea uno: empieza por un dataset (una consulta SQL) y después agrega gráficos.</p></div>`}</div>`;
    cont.querySelector('[data-nuevo]').onclick = () => D.dialogo({ titulo: 'Create dashboard', cuerpo: `<label class="dbx-campo"><span>Name</span><input id="dN" value="Ventas por categoría"></label><label class="dbx-campo"><span>Primer dataset (SQL)</span><textarea id="dS" rows="5" class="dbx-mono">SELECT ca.nombre AS categoria, c.pais, pe.canal, d.cantidad * d.precio_unitario AS monto\nFROM samples.tienda.detalle_pedidos d\nJOIN samples.tienda.productos p ON p.producto_id = d.producto_id\nJOIN samples.tienda.categorias ca ON ca.categoria_id = p.categoria_id\nJOIN samples.tienda.pedidos pe ON pe.pedido_id = d.pedido_id\nJOIN samples.tienda.clientes c ON c.cliente_id = pe.cliente_id</textarea></label><p class="dbx-dim">Si la consulta usa tablas que no existen, cámbiala por una tuya (Catalog te muestra las disponibles).</p>`, alOk: async (dlg, error) => {
      const nombre = dlg.querySelector('#dN').value.trim(), sql = dlg.querySelector('#dS').value.trim(); if (!nombre) return error('Escribe un nombre') || false;
      try { await correr(`SELECT * FROM (${sql}) LIMIT 1`, 'AI/BI Dashboard'); } catch (e) { error('El dataset falló: ' + e.message); return false; }
      const d = { id: id('d'), nombre, datasets: [{ id: id('ds'), nombre: 'Dataset 1', sql }], widgets: [], filtros: [], creado: ahora(), modificado: ahora(), publicado: null }; w.dashboards.push(d); D.guardar(); D.ir('dashboards/' + d.id);
    } });
  }
  async function datosDe(d, ds, filtros) {
    const r0 = await correr(`SELECT * FROM (${ds.sql}) LIMIT 1`, 'AI/BI Dashboard');
    const conds = (filtros || []).filter((f) => f.valor !== '' && f.valor != null && r0.cols.includes(f.campo)).map((f) => `\`${f.campo}\` = '${String(f.valor).replace(/'/g, "''")}'`);
    return correr(`SELECT * FROM (${ds.sql}) ${conds.length ? 'WHERE ' + conds.join(' AND ') : ''} LIMIT 5000`, 'AI/BI Dashboard');
  }
  async function dashboard(cont, did, modo) {
    const w = W(); const d = w.dashboards.find((x) => x.id === did); if (!d) return D.stub(cont, 'Dashboard no encontrado', 'Ese dashboard no existe.', [['Dashboards', '#/databricks/dashboards']]);
    const ver = modo === 'publicado'; const fuente = ver && d.version ? d.version : d;
    cont.innerHTML = `<div class="dbx-pag dbx-dash"><div class="dbx-pag-cab"><h1>${ic('dashboard')} ${esc(d.nombre)} ${ver ? '<span class="dbx-chip">Published</span>' : '<span class="dbx-chip gris">Draft</span>'}</h1><div class="dbx-acciones">${ver ? `<a class="dbx-btn" href="#/databricks/dashboards/${d.id}">${ic('edit')} Edit draft</a>` : `<button class="dbx-btn" data-dataset>${ic('database')} Add dataset</button><button class="dbx-btn" data-widget>${ic('graph')} Add visualization</button><button class="dbx-btn" data-filtro>${ic('filter')} Add filter</button><button class="dbx-btn primario" data-publicar>${ic('cloud-upload')} Publish</button>${d.publicado ? `<a class="dbx-btn" href="#/databricks/dashboards/${d.id}/publicado">View published</a>` : ''}`}</div></div>
      ${ver ? '' : `<div class="dbx-dash-ds">${d.datasets.map((ds) => `<details><summary>${ic('database')} <b>${esc(ds.nombre)}</b> <button class="dbx-ib" data-borrar-ds="${ds.id}" title="Delete">${ic('trash')}</button></summary><pre class="dbx-mono">${esc(ds.sql)}</pre></details>`).join('')}</div>`}
      <div class="dbx-dash-filtros">${fuente.filtros.map((f) => `<label class="dbx-campo dbx-dash-f"><span>${esc(f.campo)}</span><select data-fval="${f.id}"><option value="">All</option></select>${ver ? '' : `<button class="dbx-ib" data-borrar-f="${f.id}">${ic('close')}</button>`}</label>`).join('')}</div>
      <div class="dbx-dash-grid">${fuente.widgets.map((wg) => `<div class="dbx-dash-w ${wg.ancho === 2 ? 'ancho' : ''}" data-w="${wg.id}"><div class="dbx-dash-wt"><b>${esc(wg.titulo || wg.viz.nombre || 'Visualization')}</b>${ver ? '' : `<button class="dbx-ib" data-editar-w="${wg.id}" title="Edit">${ic('edit')}</button><button class="dbx-ib" data-ancho-w="${wg.id}" title="Ancho">${ic('arrow-both')}</button><button class="dbx-ib" data-borrar-w="${wg.id}" title="Delete">${ic('trash')}</button>`}</div><div class="dbx-dash-wc"><span class="dbx-dim">Cargando…</span></div></div>`).join('') || `<div class="dbx-vacio">${ic('graph')}<p>Agrega una visualización: elige un dataset, el tipo de gráfico y las columnas.</p></div>`}</div></div>`;
    // valores de los filtros
    for (const f of fuente.filtros) {
      const sel = cont.querySelector(`[data-fval="${f.id}"]`); const ds = fuente.datasets.find((x) => x.id === f.dataset) || fuente.datasets[0];
      try { const r = await correr(`SELECT DISTINCT \`${f.campo}\` FROM (${ds.sql}) ORDER BY 1 LIMIT 200`, 'AI/BI Dashboard'); sel.innerHTML = '<option value="">All</option>' + r.filas.map((x) => `<option ${String(f.valor) === String(x[0]) ? 'selected' : ''}>${esc(x[0])}</option>`).join(''); } catch (e) { /* sin valores */ }
      sel.onchange = () => { f.valor = sel.value; if (!ver) D.guardar(); pintarWidgets(); };
    }
    async function pintarWidgets() {
      for (const wg of fuente.widgets) {
        const el = cont.querySelector(`[data-w="${wg.id}"] .dbx-dash-wc`); const ds = fuente.datasets.find((x) => x.id === wg.dataset); if (!el) continue;
        if (!ds) { el.innerHTML = '<p class="dbx-mal">El dataset ya no existe.</p>'; continue; }
        try { const r = await datosDe(d, ds, fuente.filtros); el.innerHTML = wg.viz.tipo === 'table' ? tabla(r, 30) : D.Viz.svg(wg.viz, r); } catch (e) { el.innerHTML = `<p class="dbx-mal">${esc(e.message)}</p>`; }
      }
    }
    pintarWidgets();
    if (ver) return;
    const tocar = () => { d.modificado = ahora(); D.guardar(); dashboard(cont, did); };
    cont.querySelector('[data-dataset]').onclick = () => D.dialogo({ titulo: 'Add dataset', cuerpo: `<label class="dbx-campo"><span>Name</span><input id="dN" value="Dataset ${d.datasets.length + 1}"></label><label class="dbx-campo"><span>SQL</span><textarea id="dS" rows="6" class="dbx-mono" placeholder="SELECT …"></textarea></label>`, ok: 'Add', alOk: async (dlg, error) => { const sql = dlg.querySelector('#dS').value.trim(); try { await correr(`SELECT * FROM (${sql}) LIMIT 1`, 'AI/BI Dashboard'); } catch (e) { error(e.message); return false; } d.datasets.push({ id: id('ds'), nombre: dlg.querySelector('#dN').value.trim() || 'Dataset', sql }); tocar(); } });
    const editarWidget = async (wg) => {
      const dsSel = wg ? wg.dataset : d.datasets[0].id;
      const elegir = D.dialogo({ titulo: wg ? 'Edit visualization' : 'Add visualization', ok: 'Next', cuerpo: `<label class="dbx-campo"><span>Dataset</span><select id="wD">${d.datasets.map((x) => `<option value="${x.id}" ${x.id === dsSel ? 'selected' : ''}>${esc(x.nombre)}</option>`).join('')}</select></label><label class="dbx-campo"><span>Title</span><input id="wT" value="${esc(wg ? wg.titulo || '' : '')}" placeholder="Ventas por categoría"></label><label class="dbx-campo"><span><input type="checkbox" id="wTab" ${wg && wg.viz.tipo === 'table' ? 'checked' : ''}> Mostrar como tabla</span></label>`, alOk: async (dlg) => {
        const ds = d.datasets.find((x) => x.id === dlg.querySelector('#wD').value); const titulo = dlg.querySelector('#wT').value.trim(); const comoTabla = dlg.querySelector('#wTab').checked;
        const r = await correr(`SELECT * FROM (${ds.sql}) LIMIT 2000`, 'AI/BI Dashboard');
        if (comoTabla) { if (wg) Object.assign(wg, { dataset: ds.id, titulo, viz: { tipo: 'table' } }); else d.widgets.push({ id: id('w'), dataset: ds.id, titulo, viz: { tipo: 'table' }, ancho: 2 }); tocar(); return; }
        setTimeout(() => D.Viz.editor(r, wg && wg.viz.tipo !== 'table' ? wg.viz : null, (viz) => { if (wg) Object.assign(wg, { dataset: ds.id, titulo, viz }); else d.widgets.push({ id: id('w'), dataset: ds.id, titulo, viz, ancho: 1 }); tocar(); }), 50);
      } });
      void elegir;
    };
    cont.querySelector('[data-widget]').onclick = () => editarWidget(null);
    cont.querySelectorAll('[data-editar-w]').forEach((b) => (b.onclick = () => editarWidget(d.widgets.find((x) => x.id === b.dataset.editarW))));
    cont.querySelectorAll('[data-ancho-w]').forEach((b) => (b.onclick = () => { const x = d.widgets.find((y) => y.id === b.dataset.anchoW); x.ancho = x.ancho === 2 ? 1 : 2; tocar(); }));
    cont.querySelectorAll('[data-borrar-w]').forEach((b) => (b.onclick = () => { d.widgets = d.widgets.filter((x) => x.id !== b.dataset.borrarW); tocar(); }));
    cont.querySelectorAll('[data-borrar-ds]').forEach((b) => (b.onclick = (e) => { e.preventDefault(); if (d.widgets.some((x) => x.dataset === b.dataset.borrarDs)) { D.toast('Hay widgets que usan ese dataset: bórralos primero.'); return; } d.datasets = d.datasets.filter((x) => x.id !== b.dataset.borrarDs); tocar(); }));
    cont.querySelectorAll('[data-borrar-f]').forEach((b) => (b.onclick = () => { d.filtros = d.filtros.filter((x) => x.id !== b.dataset.borrarF); tocar(); }));
    cont.querySelector('[data-filtro]').onclick = async () => {
      const cols = new Map(); for (const ds of d.datasets) { try { const r = await correr(`SELECT * FROM (${ds.sql}) LIMIT 1`, 'AI/BI Dashboard'); r.cols.forEach((c) => { if (!cols.has(c)) cols.set(c, ds.id); }); } catch (e) { /* dataset roto */ } }
      D.dialogo({ titulo: 'Add filter', ok: 'Add', cuerpo: `<label class="dbx-campo"><span>Field</span><select id="fC">${[...cols.keys()].map((c) => `<option>${esc(c)}</option>`).join('')}</select></label><p class="dbx-dim">Filtro de selección única: se aplica a todos los datasets que tengan esa columna.</p>`, alOk: (dlg) => { const c = dlg.querySelector('#fC').value; d.filtros.push({ id: id('f'), campo: c, dataset: cols.get(c), valor: '' }); tocar(); } });
    };
    cont.querySelector('[data-publicar]').onclick = () => D.dialogo({ titulo: 'Publish dashboard', ok: 'Publish', cuerpo: '<p>Publicar crea una <b>copia</b> del borrador que ven los demás. Puedes seguir editando el borrador sin que cambie lo publicado, hasta que vuelvas a publicar.</p><label class="dbx-campo"><span>Credentials</span><select><option>Embed credentials (los visores usan tus permisos)</option><option>Don\'t embed credentials (cada visor usa sus permisos)</option></select></label>', alOk: () => { d.version = JSON.parse(JSON.stringify({ datasets: d.datasets, widgets: d.widgets, filtros: d.filtros })); d.publicado = ahora(); D.guardar(); D.toast('Dashboard publicado.'); D.ir(`dashboards/${d.id}/publicado`); } });
  }

  // ================================================================ Alerts
  D.registrar('alertas', (cont, p) => { if (p[0]) return alerta(cont, p[0]); listaAlertas(cont); });
  const OPS = { '>': (a, b) => a > b, '>=': (a, b) => a >= b, '<': (a, b) => a < b, '<=': (a, b) => a <= b, '==': (a, b) => a === b, '!=': (a, b) => a !== b };
  function listaAlertas(cont) {
    const w = W();
    cont.innerHTML = `<div class="dbx-pag"><div class="dbx-pag-cab"><h1>Alerts</h1><div class="dbx-acciones"><button class="dbx-btn primario" data-nueva>${ic('add')} Create alert</button></div></div>
      <p class="dbx-dim">Una alerta corre una consulta en un horario y avisa cuando el resultado cumple una condición, por ejemplo "pedidos fallidos de hoy &gt; 10". Estados: <b>OK</b> (no se cumple), <b>TRIGGERED</b> (se cumple, se avisa) y <b>UNKNOWN</b> (todavía no se evaluó o la consulta falló).</p>
      ${w.alertas.length ? `<table class="dbx-tabla"><thead><tr><th>Name</th><th>State</th><th>Condition</th><th>Schedule</th><th>Last evaluated</th></tr></thead><tbody>${w.alertas.map((a) => `<tr><td><a href="#/databricks/alertas/${a.id}">${ic('bell')} ${esc(a.nombre)}</a></td><td>${estadoAlerta(a.estado)}</td><td><code>${esc(a.columna)} ${esc(a.op)} ${esc(a.umbral)}</code></td><td>${esc(a.horario)}</td><td>${hora(a.ultima)}</td></tr>`).join('')}</tbody></table>` : `<div class="dbx-vacio">${ic('bell')}<p>No hay alertas.</p></div>`}</div>`;
    cont.querySelector('[data-nueva]').onclick = () => D.dialogo({ titulo: 'Create alert', ancho: 640, cuerpo: `<label class="dbx-campo"><span>Name</span><input id="aN" value="Pedidos cancelados altos"></label><label class="dbx-campo"><span>Query</span><textarea id="aS" rows="4" class="dbx-mono">SELECT COUNT(*) AS cancelados FROM samples.tienda.pedidos WHERE estado = 'cancelado'</textarea></label>
      <div class="dbx-fila"><label class="dbx-campo"><span>Value column</span><input id="aC" value="cancelados"></label><label class="dbx-campo"><span>Operator</span><select id="aO">${Object.keys(OPS).map((o) => `<option>${o}</option>`).join('')}</select></label><label class="dbx-campo"><span>Threshold</span><input id="aU" type="number" value="10"></label></div>
      <div class="dbx-fila"><label class="dbx-campo"><span>Schedule</span><select id="aH"><option>Every hour</option><option>Every day at 08:00</option><option>Every Monday at 09:00</option></select></label><label class="dbx-campo"><span>Notify</span><input id="aE" value="equipo-datos@empresa.com"></label></div>`, alOk: async (dlg, error) => {
      const a = { id: id('a'), nombre: dlg.querySelector('#aN').value.trim() || 'Alert', sql: dlg.querySelector('#aS').value.trim(), columna: dlg.querySelector('#aC').value.trim(), op: dlg.querySelector('#aO').value, umbral: Number(dlg.querySelector('#aU').value), horario: dlg.querySelector('#aH').value, destino: dlg.querySelector('#aE').value, estado: 'UNKNOWN', historial: [], creado: ahora() };
      try { const r = await correr(a.sql, 'Alert'); if (!r.cols.includes(a.columna)) { error(`La consulta no devuelve la columna "${a.columna}". Columnas: ${r.cols.join(', ')}`); return false; } } catch (e) { error(e.message); return false; }
      w.alertas.push(a); D.guardar(); D.ir('alertas/' + a.id);
    } });
  }
  const estadoAlerta = (e) => (e === 'TRIGGERED' ? `<span class="dbx-mal">${ic('bell-dot')} TRIGGERED</span>` : e === 'OK' ? `<span class="dbx-ok">${ic('pass-filled')} OK</span>` : `<span class="dbx-dim">${ic('question')} UNKNOWN</span>`);
  async function evaluar(a) {
    let valor = null, estado = 'UNKNOWN', error = '';
    try { const r = await correr(a.sql, 'Alert'); const i = r.cols.indexOf(a.columna); valor = r.filas[0] ? r.filas[0][i] : null; estado = valor == null ? 'UNKNOWN' : OPS[a.op](Number(valor), a.umbral) ? 'TRIGGERED' : 'OK'; } catch (e) { error = e.message; }
    a.estado = estado; a.ultima = ahora(); a.historial.unshift({ cuando: a.ultima, valor, estado, error, aviso: estado === 'TRIGGERED' ? `Notificación enviada a ${a.destino} (simulado)` : '' }); a.historial = a.historial.slice(0, 30); D.guardar();
    return a;
  }
  function alerta(cont, aid) {
    const w = W(); const a = w.alertas.find((x) => x.id === aid); if (!a) return D.stub(cont, 'Alerta no encontrada', 'Esa alerta no existe.', [['Alerts', '#/databricks/alertas']]);
    cont.innerHTML = `<div class="dbx-pag"><div class="dbx-pag-cab"><h1>${ic('bell')} ${esc(a.nombre)} ${estadoAlerta(a.estado)}</h1><div class="dbx-acciones"><button class="dbx-btn primario" data-eval>${ic('play')} Evaluate now</button><button class="dbx-btn" data-borrar>${ic('trash')} Delete</button></div></div>
      <table class="dbx-kv"><tr><th>Query</th><td><pre class="dbx-mono">${esc(a.sql)}</pre></td></tr><tr><th>Condition</th><td>Disparar cuando <code>${esc(a.columna)}</code> ${esc(a.op)} <b>${esc(a.umbral)}</b> (se mira la primera fila)</td></tr><tr><th>Schedule</th><td>${esc(a.horario)}</td></tr><tr><th>Notify</th><td>${esc(a.destino)}</td></tr></table>
      <h3>History</h3>${a.historial.length ? `<table class="dbx-tabla"><thead><tr><th>Evaluated</th><th>Value</th><th>State</th><th>Notification</th></tr></thead><tbody>${a.historial.map((h) => `<tr><td>${hora(h.cuando)}</td><td>${esc(h.valor ?? '')}</td><td>${estadoAlerta(h.estado)}${h.error ? ` <span class="dbx-mal">${esc(h.error)}</span>` : ''}</td><td>${esc(h.aviso)}</td></tr>`).join('')}</tbody></table>` : '<p class="dbx-dim">Todavía no se evaluó.</p>'}</div>`;
    cont.querySelector('[data-eval]').onclick = async () => { await evaluar(a); alerta(cont, aid); D.toast(a.estado === 'TRIGGERED' ? 'La condición se cumple: alerta disparada.' : a.estado === 'OK' ? 'La condición no se cumple: todo OK.' : 'No se pudo evaluar.'); };
    cont.querySelector('[data-borrar]').onclick = () => { if (!confirm('¿Borrar la alerta?')) return; w.alertas = w.alertas.filter((x) => x !== a); D.guardar(); D.ir('alertas'); };
  }

  // ================================================================ Genie Agents
  D.registrar('genie', (cont, p) => { if (p[0]) return espacio(cont, p[0]); listaGenie(cont); });
  function listaGenie(cont) {
    const w = W();
    cont.innerHTML = `<div class="dbx-pag"><div class="dbx-pag-cab"><h1>Genie Agents</h1><div class="dbx-acciones"><button class="dbx-btn primario" data-nuevo>${ic('add')} New</button></div></div>
      <p class="dbx-dim">Un Genie Agent responde preguntas en lenguaje natural sobre tablas que elige el equipo de datos. Lo que más mejora sus respuestas: <b>pocas tablas bien documentadas</b>, <b>instrucciones</b> con el vocabulario del negocio y <b>preguntas de ejemplo con su SQL</b>.</p>
      ${w.genie.length ? `<table class="dbx-tabla"><thead><tr><th>Name</th><th>Tables</th><th>Conversations</th><th>Modified</th></tr></thead><tbody>${w.genie.map((g) => `<tr><td><a href="#/databricks/genie/${g.id}">${ic('sparkle')} ${esc(g.nombre)}</a></td><td>${g.tablas.length}</td><td>${g.chat.filter((m) => m.rol === 'yo').length}</td><td>${hora(g.modificado)}</td></tr>`).join('')}</tbody></table>` : `<div class="dbx-vacio">${ic('sparkle')}<p>No hay Genie Agents. Crea uno con las tablas de ventas y pregúntale "¿cuánto vendimos por categoría?".</p></div>`}
      <p><a href="#/m/genie">Ir al módulo de Genie del curso</a> para aprender a armarlos y evaluarlos.</p></div>`;
    cont.querySelector('[data-nuevo]').onclick = () => {
      const ts = tablasDisponibles();
      D.dialogo({ titulo: 'New Genie Agent', ancho: 640, cuerpo: `<label class="dbx-campo"><span>Name</span><input id="gN" value="Ventas de la tienda"></label><label class="dbx-campo"><span>Tables (máximo 25; mejor pocas)</span><div class="dbx-checklist">${ts.map((t) => `<label><input type="checkbox" value="${esc(t.fq)}" ${/samples\.tienda\.(pedidos|clientes|productos|detalle_pedidos|categorias)$/.test(t.fq) ? 'checked' : ''}> ${esc(t.fq)}</label>`).join('')}</div></label>`, alOk: (dlg, error) => {
        const tablas = [...dlg.querySelectorAll('.dbx-checklist input:checked')].map((x) => x.value); if (!tablas.length) return error('Elige al menos una tabla') || false;
        const g = { id: id('g'), nombre: dlg.querySelector('#gN').value.trim() || 'Genie Agent', tablas, instrucciones: tablas.some((t) => /detalle_pedidos$/.test(t)) ? 'ventas = cantidad * precio_unitario\nmonto = cantidad * precio_unitario\nfacturación = cantidad * precio_unitario' : '', ejemplos: [], chat: [], modificado: ahora() }; w.genie.push(g); D.guardar(); D.ir('genie/' + g.id);
      } });
    };
  }
  // ---------- Genie: de la pregunta al SQL ----------
  // Imita lo que hace Genie de verdad: mira las tablas del espacio (columnas, tipos y valores frecuentes),
  // aplica las instrucciones del equipo, une tablas por sus claves y arma la consulta. Explica cada supuesto.
  const perfiles = {};
  async function perfil(fq) {
    if (perfiles[fq]) return perfiles[fq];
    const p = { fq, cols: [], tipos: {}, valores: {} };
    try {
      const r = await correr(`SELECT * FROM ${fq} LIMIT 200`, 'Genie');
      p.cols = r.cols; r.cols.forEach((c, i) => { const v = r.filas.map((f) => f[i]).filter((x) => x != null); p.tipos[c] = v.length && v.every((x) => typeof x === 'number') ? 'num' : /fecha|date|_at$/i.test(c) ? 'fecha' : 'texto'; });
      for (const c of p.cols) if (p.tipos[c] === 'texto' && !/_id$|^id$|email|telefono|nombre|apellido/i.test(c)) {
        const d = await correr(`SELECT DISTINCT ${c} FROM ${fq} LIMIT 41`, 'Genie'); if (d.filas.length && d.filas.length <= 40) p.valores[c] = d.filas.map((f) => f[0]).filter((x) => x != null).map(String);
      }
    } catch (e) { p.error = e.message; }
    return (perfiles[fq] = p);
  }
  const NUMERICA = /monto|total|precio|importe|cantidad|valor|ingreso|costo|venta|unidades|stock|salario|descuento|amount|price|qty|quantity/i;
  const raiz = (w) => sinTilde(w).replace(/(es|s)$/, '').replace(/[ao]$/, '');
  async function generarSql(g, pregunta) {
    let q = ' ' + sinTilde(pregunta).replace(/[¿?¡!.,;:()]/g, ' ').replace(/\s+/g, ' ') + ' ';
    const qOrig = q.trim();
    // vocabulario cotidiano → columnas: "vendimos" = ventas, "más baratos" = precio de menor a mayor
    q = q.replace(/ vend[a-z]* /g, ' ventas ').replace(/ factur[a-z]* /g, ' facturacion ').replace(/ (?:mas )?barat[oa]s? /g, ' precio menor ').replace(/ (?:mas )?car[oa]s /g, ' precio mayor ');
    const qn = qOrig;
    for (const e of g.ejemplos) if (sinTilde(e.pregunta).replace(/[¿?¡!.,;:()]/g, ' ').replace(/\s+/g, ' ').trim() === qn) return { sql: e.sql, nota: 'Usé una consulta de ejemplo que guardó el equipo (es la respuesta más confiable).', fuente: 'ejemplo' };
    const ts = []; for (const fq of g.tablas) { const p = await perfil(fq); if (!p.error) ts.push(p); }
    if (!ts.length) return { error: 'No puedo leer ninguna tabla del espacio. Revisa que existan en Catalog.' };
    const palabras = qn.split(' '); const raices = new Set(palabras.map(raiz));
    const nombreT = (t) => t.fq.split('.').pop();
    const mencionaT = (t) => { const n = sinTilde(nombreT(t)).split('_'); return raices.has(raiz(n[n.length - 1])) && (n.length === 1 || raices.has(raiz(n[0]))) ? 2 : raices.has(raiz(n[n.length - 1])) ? 1 : 0; };
    const etiqueta = (t) => t.cols.find((c) => /^nombre$|^name$|titulo|descripcion/i.test(c)) || t.cols.find((c) => t.tipos[c] === 'texto' && !/_id$|^id$/.test(c)) || t.cols[0];
    const supuestos = [];
    // 1) instrucciones del equipo: "ventas = cantidad * precio_unitario", "facturación significa monto"
    const sinon = [];
    for (const l of (g.instrucciones || '').split('\n')) { const m = l.match(/^\s*["']?([\wáéíóúñü ]+?)["']?\s*(?:=|significa|es)\s*(.+?)\s*$/i); if (m) sinon.push({ term: sinTilde(m[1]).trim(), expr: m[2].replace(/^["']|["']$/g, '') }); }
    // 2) medida: un sinónimo, o una columna numérica nombrada en la pregunta
    let medida = null;
    for (const s of sinon) if (q.includes(' ' + s.term + ' ') || raices.has(raiz(s.term))) { const ids = s.expr.match(/[a-z_][a-z0-9_]*/gi) || []; const t = ts.find((t) => ids.every((x) => t.cols.includes(x) || /^(sum|avg|count|min|max|distinct|case|when|then|else|end|and|or|null)$/i.test(x))); if (t) { medida = { t, expr: s.expr, nombre: s.term.replace(/ /g, '_') }; supuestos.push(`Usé tu instrucción "${s.term} = ${s.expr}".`); break; } }
    if (!medida) for (const t of ts.slice().sort((a, b) => mencionaT(b) - mencionaT(a))) { const c = t.cols.find((c) => t.tipos[c] === 'num' && NUMERICA.test(c) && !/_id$/.test(c) && sinTilde(c).split('_').some((w) => raices.has(raiz(w)) && w.length > 3)); if (c) { medida = { t, expr: c, nombre: c }; break; } }
    // 3) agregación
    const cuenta = /cuant[oa]s|numero de|cuenta |contar/.test(q);
    const agg = cuenta && !(medida && /cuant[oa] (es|fue|suma)/.test(q)) ? 'COUNT' : /promedio|media |ticket medio/.test(q) ? 'AVG' : /maxim|mas alto|mayor /.test(q) ? 'MAX' : /minim|mas bajo|menor /.test(q) ? 'MIN' : medida ? 'SUM' : 'COUNT';
    // 4) "por X": ¿agrupar o es la medida para ordenar? Puede ser una tabla (categoría → categorias.nombre), una columna o mes/año
    const mPor = q.match(/ por (?:el |la |los |las |cada )?([\wñ]+(?: de [\wñ]+)?)/);
    let grupo = null, porMedida = false;
    if (mPor) {
      const w = mPor[1].split(' ')[0]; const rw = raiz(w);
      const tiempo = { mes: 'yyyy-MM', meses: 'yyyy-MM', ano: 'yyyy', anio: 'yyyy', anos: 'yyyy', dia: 'yyyy-MM-dd', dias: 'yyyy-MM-dd' }[w];
      if (tiempo) { const base = medida ? medida.t : ts.find((t) => mencionaT(t)) || ts[0]; const tf = [base, ...ts].find((t) => t.cols.some((c) => t.tipos[c] === 'fecha')); if (tf) grupo = { t: tf, expr: `date_format(${tf.cols.find((c) => tf.tipos[c] === 'fecha')}, '${tiempo}')`, nombre: { mes: 'mes', meses: 'mes', dia: 'dia', dias: 'dia' }[w] || 'anio', fecha: true }; }
      if (!grupo) { const c0 = ts.map((t) => ({ t, c: t.cols.find((c) => !/_id$|^id$/.test(c) && (raiz(c) === rw || sinTilde(c).split('_').some((x) => raiz(x) === rw && x.length > 2))) })).filter((x) => x.c);
        const num = c0.find((x) => x.t.tipos[x.c] === 'num'); const txt = c0.find((x) => x.t.tipos[x.c] !== 'num');
        if (txt) grupo = { t: txt.t, expr: txt.c, nombre: txt.c };
        else if (num || sinon.some((s) => raiz(s.term) === rw)) porMedida = true; }
      if (!grupo && !porMedida) { const t = ts.find((t) => raiz(sinTilde(nombreT(t)).split('_').pop()) === rw); if (t) grupo = { t, expr: etiqueta(t), nombre: sinTilde(w).replace(/s$/, ''), porTabla: true, pk: t.cols[0] }; }
      if (porMedida && !medida) { const t = ts.find((t) => t.cols.some((c) => raiz(c) === rw)); if (t) medida = { t, expr: t.cols.find((c) => raiz(c) === rw), nombre: t.cols.find((c) => raiz(c) === rw) }; }
    }
    if (!medida && / precio (menor|mayor) /.test(q)) { const t = ts.find((t) => t.cols.includes('precio')); if (t) { medida = { t, expr: 'precio', nombre: 'precio' }; porMedida = true; } }
    const top = Number((q.match(/(?:top|mejores|primer[oa]s|principales|mayores|peores|ultim[oa]s|l[oa]s)\s+(\d+)/) || q.match(/ (\d+) (?:mejores|primeros|principales)/) || [])[1]) || null;
    const asc = /menos|menor|peor|mas bajo/.test(q);
    // 5) entidad: la tabla nombrada que no es la del grupo (para "top 3 productos por precio" o contar pedidos)
    const mejorT = Math.max(0, ...ts.map(mencionaT));
    const entidad = mejorT ? ts.filter((t) => mencionaT(t) === mejorT && !(grupo && grupo.porTabla && t === grupo.t))[0] || null : null;
    // 6) filtros: valores reales de columnas de texto ("cancelados" → estado = 'cancelado'), año y "más de N"
    const filtros = [];
    for (const t of ts) for (const [c, vals] of Object.entries(t.valores)) {
      if (grupo && grupo.t === t && grupo.expr === c) continue;
      const v = vals.find((v) => { const sv = sinTilde(v); return sv.length > 2 && (q.includes(' ' + sv + ' ') || (sv.split(' ').length === 1 && raices.has(raiz(sv)) && !(mencionaT(t) && raiz(nombreT(t)) === raiz(sv)))); });
      if (v) { filtros.push({ t, expr: `${c} = '${v.replace(/'/g, "''")}'` }); supuestos.push(`Entendí "${v}" como un valor de ${c}.`); }
    }
    const anio = (q.match(/ (?:en |del |de )?(20\d\d) /) || [])[1];
    if (anio) { const tf = [medida && medida.t, entidad, grupo && grupo.t, ...ts].filter(Boolean).find((t) => t.cols.some((c) => t.tipos[c] === 'fecha')); if (tf) { const cf = tf.cols.find((c) => tf.tipos[c] === 'fecha'); filtros.push({ t: tf, expr: `year(${cf}) = ${anio}` }); supuestos.push(`Filtré por el año ${anio} usando ${cf}.`); } }
    // 7) tabla base y uniones por claves *_id
    const necesarias = [...new Set([medida && medida.t, grupo && grupo.t, entidad, ...filtros.map((f) => f.t)].filter(Boolean))];
    const base = (medida && medida.t) || (agg === 'COUNT' && entidad) || necesarias[0] || ts[0];
    if (!necesarias.includes(base)) necesarias.unshift(base);
    const clave = (a, b) => a.cols.find((c) => /_id$/.test(c) && b.cols.includes(c));
    const usadas = [base], joins = [];
    for (const t of necesarias) {
      if (usadas.includes(t)) continue;
      // BFS desde las tablas ya usadas hasta t
      const prev = new Map(); const cola = [...usadas]; usadas.forEach((u) => prev.set(u, null)); let ok = false;
      while (cola.length && !ok) { const x = cola.shift(); for (const y of ts) if (!prev.has(y) && clave(x, y)) { prev.set(y, x); if (y === t) { ok = true; break; } cola.push(y); } }
      if (!ok) return { error: `No sé cómo unir ${nombreT(t)} con ${nombreT(base)}: no comparten ninguna columna *_id. Agrega una consulta de ejemplo con el JOIN correcto en Configure.` };
      const camino = []; for (let y = t; prev.get(y); y = prev.get(y)) camino.unshift([prev.get(y), y]);
      for (const [x, y] of camino) if (!usadas.includes(y)) { usadas.push(y); joins.push({ x, y, c: clave(x, y) }); }
    }
    const al = new Map(usadas.map((t, i) => [t, usadas.length > 1 ? 't' + (i + 1) : null]));
    const cal = (t, expr) => (al.get(t) ? expr.replace(/\b([a-z_][a-z0-9_]*)\b(?!\s*\()/gi, (m) => (t.cols.includes(m) ? `${al.get(t)}.${m}` : m)) : expr);
    if (joins.length) supuestos.push('Uní ' + joins.map((j) => `${nombreT(j.x)} con ${nombreT(j.y)} por ${j.c}`).join(', ') + '.');
    const from = `FROM ${base.fq}${al.get(base) ? ' ' + al.get(base) : ''}` + joins.map((j) => `\nJOIN ${j.y.fq} ${al.get(j.y)} ON ${al.get(j.y)}.${j.c} = ${al.get(j.x)}.${j.c}`).join('');
    const where = filtros.length ? `\nWHERE ${filtros.map((f) => cal(f.t, f.expr)).join(' AND ')}` : '';
    // 8) armar
    let sql;
    if (!grupo && entidad && (top || porMedida) && medida && medida.t !== entidad && agg !== 'COUNT') { grupo = { t: entidad, expr: etiqueta(entidad), nombre: sinTilde(nombreT(entidad)).split('_').pop().replace(/s$/, ''), porTabla: true, pk: entidad.cols[0] }; }
    if (!grupo && entidad && (top || porMedida) && medida && medida.t === entidad && agg !== 'COUNT' && !/total|suma|promedio/.test(q)) {
      // "top 3 productos por precio": lista filas, no agrega
      const et = etiqueta(entidad);
      sql = `SELECT ${cal(entidad, et)}, ${cal(medida.t, medida.expr)}${/\s/.test(medida.expr) ? ' AS ' + medida.nombre : ''}\n${from}${where}\nORDER BY ${/\s/.test(medida.expr) ? medida.nombre : cal(medida.t, medida.expr)} ${asc ? 'ASC' : 'DESC'}\nLIMIT ${top || 10}`;
    } else {
      const contado = entidad || base; const pk = contado.cols[0];
      const expr = agg === 'COUNT' ? (joins.length && /_id$/.test(pk) ? `COUNT(DISTINCT ${cal(contado, pk)})` : 'COUNT(*)') : `${agg}(${cal(medida.t, medida.expr)})`;
      const alias = agg === 'COUNT' ? (entidad ? 'cantidad_' + sinTilde(nombreT(entidad)).split('_').pop() : 'cantidad') : `${{ SUM: 'total', AVG: 'promedio', MAX: 'maximo', MIN: 'minimo' }[agg]}_${medida.nombre}`;
      if (agg !== 'COUNT' && !medida) supuestos.push('No encontré qué número usar: conté filas.');
      if (grupo) {
        const ge = cal(grupo.t, grupo.expr); const gn = grupo.fecha || grupo.expr.includes('.') || /\(/.test(grupo.expr) || grupo.expr !== grupo.nombre ? grupo.nombre : null;
        const gpk = grupo.pk && /_id$/.test(grupo.pk) && grupo.pk !== grupo.expr ? cal(grupo.t, grupo.pk) + ', ' : '';
        sql = `SELECT ${ge}${gn ? ' AS ' + gn : ''}, ${expr} AS ${alias}\n${from}${where}\nGROUP BY ${gpk}${ge}\nORDER BY ${grupo.fecha ? (gn || ge) + ' ASC' : alias + (asc ? ' ASC' : ' DESC')}${top ? `\nLIMIT ${top}` : grupo.fecha ? '' : '\nLIMIT 100'}`;
      } else sql = `SELECT ${expr} AS ${alias}\n${from}${where}`;
    }
    return { sql, nota: supuestos.join(' '), tabla: base.fq };
  }
  async function espacio(cont, gid) {
    const w = W(); const g = w.genie.find((x) => x.id === gid); if (!g) return D.stub(cont, 'Genie Agent no encontrado', 'Ese espacio no existe.', [['Genie Agents', '#/databricks/genie']]);
    const tab = (location.hash.split('?tab=')[1] || 'chat');
    const sug = g.ejemplos.slice(0, 3).map((e) => e.pregunta).concat(['¿Cuántos pedidos hay por estado?', 'Top 5 productos por precio', 'Promedio de monto por país']).slice(0, 4);
    cont.innerHTML = `<div class="dbx-pag dbx-genie"><div class="dbx-pag-cab"><h1>${ic('sparkle')} ${esc(g.nombre)}</h1><div class="dbx-acciones"><a class="dbx-btn ${tab === 'chat' ? 'primario' : ''}" href="#/databricks/genie/${g.id}">Chat</a><a class="dbx-btn ${tab === 'config' ? 'primario' : ''}" href="#/databricks/genie/${g.id}?tab=config">Configure</a></div></div>
      ${tab === 'config' ? `<div class="dbx-genie-cfg"><h3>Data</h3><p>${g.tablas.map((t) => `<code>${esc(t)}</code>`).join(' ')}</p>
        <h3>Instructions</h3><p class="dbx-dim">Escribe el vocabulario del negocio, una regla por línea. Ejemplo: <code>ventas = monto</code>, <code>facturación significa total</code>.</p><textarea id="gI" rows="5" class="dbx-mono">${esc(g.instrucciones)}</textarea>
        <h3>SQL queries (ejemplos)</h3><p class="dbx-dim">Preguntas frecuentes con su SQL correcto: Genie las usa tal cual cuando alguien pregunta lo mismo.</p>${g.ejemplos.map((e, i) => `<div class="dbx-genie-ej"><b>${esc(e.pregunta)}</b><pre class="dbx-mono">${esc(e.sql)}</pre><button class="dbx-btn" data-borrar-ej="${i}">${ic('trash')}</button></div>`).join('') || '<p class="dbx-dim">Sin ejemplos.</p>'}
        <div class="dbx-fila"><input id="gEP" placeholder="Pregunta"><textarea id="gES" rows="2" class="dbx-mono" placeholder="SELECT …"></textarea><button class="dbx-btn" data-agregar-ej>Add</button></div>
        <button class="dbx-btn primario" data-guardar-cfg>Save</button></div>`
      : `<div class="dbx-genie-chat" id="gChat">${g.chat.map((m, i) => m.rol === 'yo' ? `<div class="dbx-g-yo">${esc(m.texto)}</div>` : `<div class="dbx-g-bot" data-m="${i}">${m.error ? `<p class="dbx-mal">${esc(m.error)}</p>` : `<details ${i === g.chat.length - 1 ? 'open' : ''}><summary>${ic('code')} Show code</summary><pre class="dbx-mono">${esc(m.sql)}</pre></details>${m.nota ? `<p class="dbx-dim">${esc(m.nota)}</p>` : ''}<div class="dbx-g-res"></div><div class="dbx-g-fb"><span class="dbx-dim">¿Es correcta?</span><button class="dbx-ib ${m.fb === 'si' ? 'on' : ''}" data-fb="${i}|si" title="Sí">👍</button><button class="dbx-ib ${m.fb === 'no' ? 'on' : ''}" data-fb="${i}|no" title="No">👎</button><button class="dbx-btn" data-ej="${i}">Guardar como ejemplo</button></div>`}</div>`).join('') || `<div class="dbx-vacio">${ic('sparkle')}<p>Pregunta algo sobre ${esc(g.tablas.map((t) => t.split('.').pop()).join(', '))}.</p><div class="dbx-g-sug">${sug.map((x) => `<button class="dbx-btn" data-sug="${esc(x)}">${esc(x)}</button>`).join('')}</div></div>`}</div>
        <div class="dbx-genie-in"><input id="gQ" placeholder="Ask your question…"><button class="dbx-btn primario" data-preguntar>${ic('send')}</button><button class="dbx-btn" data-limpiar title="New chat">${ic('clear-all')}</button></div>`}</div>`;
    if (tab === 'config') {
      cont.querySelector('[data-guardar-cfg]').onclick = () => { g.instrucciones = cont.querySelector('#gI').value; g.modificado = ahora(); D.guardar(); D.toast('Configuración guardada'); };
      cont.querySelector('[data-agregar-ej]').onclick = async () => { const p = cont.querySelector('#gEP').value.trim(), s = cont.querySelector('#gES').value.trim(); if (!p || !s) return; try { await correr(s, 'Genie'); } catch (e) { D.toast('El SQL falló: ' + e.message); return; } g.ejemplos.push({ pregunta: p, sql: s }); D.guardar(); espacio(cont, gid); };
      cont.querySelectorAll('[data-borrar-ej]').forEach((b) => (b.onclick = () => { g.ejemplos.splice(Number(b.dataset.borrarEj), 1); D.guardar(); espacio(cont, gid); }));
      return;
    }
    const preguntar = async (texto) => {
      if (!texto) return; g.chat.push({ rol: 'yo', texto });
      const r = await generarSql(g, texto); const m = { rol: 'bot', sql: r.sql, nota: r.nota, error: r.error };
      if (!r.error) { try { await correr(r.sql, 'Genie'); } catch (e) { m.error = 'No pude responder: ' + e.message; } }
      g.chat.push(m); g.modificado = ahora(); D.guardar(); espacio(cont, gid);
    };
    const inp = cont.querySelector('#gQ'); inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') preguntar(inp.value.trim()); });
    cont.querySelector('[data-preguntar]').onclick = () => preguntar(inp.value.trim());
    cont.querySelector('[data-limpiar]').onclick = () => { g.chat = []; D.guardar(); espacio(cont, gid); };
    cont.querySelectorAll('[data-sug]').forEach((b) => (b.onclick = () => preguntar(b.dataset.sug)));
    cont.querySelectorAll('[data-fb]').forEach((b) => (b.onclick = () => { const [i, v] = b.dataset.fb.split('|'); g.chat[Number(i)].fb = v; D.guardar(); espacio(cont, gid); if (v === 'no') D.toast('Usa la respuesta incorrecta para mejorar el espacio: agrega una instrucción o una consulta de ejemplo en Configure.'); }));
    cont.querySelectorAll('[data-ej]').forEach((b) => (b.onclick = () => { const i = Number(b.dataset.ej); const pq = g.chat[i - 1]; g.ejemplos.push({ pregunta: pq ? pq.texto : 'Pregunta', sql: g.chat[i].sql }); D.guardar(); D.toast('Guardada como consulta de ejemplo.'); }));
    for (const el of cont.querySelectorAll('.dbx-g-bot[data-m]')) {
      const m = g.chat[Number(el.dataset.m)]; const box = el.querySelector('.dbx-g-res'); if (!box || !m.sql) continue;
      try { const r = await correr(m.sql, 'Genie'); const num = r.cols.length === 2 && r.filas.length > 1 && typeof (r.filas[0] || [])[1] === 'number'; box.innerHTML = (r.filas.length === 1 && r.cols.length === 1 ? `<div class="dbx-counter"><b>${esc(typeof r.filas[0][0] === 'number' ? r.filas[0][0].toLocaleString('es') : r.filas[0][0])}</b><span>${esc(r.cols[0])}</span></div>` : tabla(r, 20)) + (num ? D.Viz.svg({ tipo: 'bar', x: r.cols[0], ys: [r.cols[1]], agg: 'sum', orden: 'y' }, r) : ''); } catch (e) { box.innerHTML = `<p class="dbx-mal">${esc(e.message)}</p>`; }
    }
    const ch = cont.querySelector('#gChat'); if (ch) ch.scrollTop = ch.scrollHeight;
  }

  // ================================================================ Settings → Identity and access (grupos)
  // En Databricks los grupos se administran en la consola (o con SCIM / la CLI), no con SQL. Aquí puedes entrar y
  // salir de grupos para ver cómo cambian los filtros de fila y las máscaras que usan is_account_group_member().
  D.registrar('ajustes', (cont, p) => {
    const G = SQL().grupos(); const yo = SQL().USUARIO; const tab = p[0] || 'identidad';
    const filtros = []; for (const c of SQL().arbol()) for (const sc of c.schemas) for (const t of sc.tablas) { const M = (((SQL().uc().catalogs[c.nombre] || {}).schemas || {})[sc.nombre] || { tables: {} }).tables[t.nombre]; if (M && (M.filtroFila || (M.mascaras && Object.keys(M.mascaras).length))) filtros.push(`${c.nombre}.${sc.nombre}.${t.nombre}`); }
    cont.innerHTML = `<div class="dbx-pag"><div class="dbx-pag-cab"><h1>${ic('gear')} Settings</h1></div>
      <div class="dbx-pest"><a class="${tab === 'identidad' ? 'on' : ''}" href="#/databricks/ajustes/identidad">Identity and access</a><a class="${tab === 'dev' ? 'on' : ''}" href="#/databricks/ajustes/dev">Developer</a></div>
      ${tab === 'dev' ? `<h3>Access tokens</h3><p>Un <b>token de acceso personal</b> es como una contraseña larga para que un programa (la CLI, un script, Power BI) entre a Databricks en tu nombre. En la práctica no se generan tokens: la CLI simulada se conecta sola con <code>databricks auth login</code>.</p><div class="dbx-aviso">${ic('warning')} En tu trabajo real: nunca pegues un token en un notebook, en un repositorio de GitHub ni en un chat. Guárdalo en un secreto (<a href="#/databricks/secrets">Secrets</a>) o usa OAuth.</div>`
      : `<h3>Groups</h3><p class="dbx-dim">Los permisos se dan a <b>grupos</b>, no a personas: cuando alguien entra al equipo, lo agregas al grupo y hereda todo. Las funciones <code>is_account_group_member('grupo')</code> y <code>is_member('grupo')</code> devuelven <b>true</b> si <b>tú</b> (${esc(yo)}) estás en ese grupo; por eso, al entrar o salir de un grupo, cambia lo que ves en las tablas con filtro de fila o máscara.</p>
        <table class="dbx-tabla"><thead><tr><th>Group</th><th>Members</th><th>¿Estás tú?</th><th></th></tr></thead><tbody>${Object.entries(G).map(([g, m]) => `<tr><td>${ic('organization')} <b>${esc(g)}</b></td><td>${m.length ? m.map(esc).join(', ') : '<span class="dbx-dim">sin miembros</span>'}</td><td>${m.includes(yo) ? `<span class="dbx-ok">${ic('pass-filled')} Sí</span>` : '<span class="dbx-dim">No</span>'}</td><td>${g === 'users' ? '<span class="dbx-dim">todos están aquí</span>' : `<button class="dbx-btn" data-g="${esc(g)}">${m.includes(yo) ? 'Salir del grupo' : 'Unirme'}</button>`}</td></tr>`).join('')}</tbody></table>
        <div class="dbx-fila"><input id="gNuevo" placeholder="nombre-del-grupo"><button class="dbx-btn" data-crear>${ic('add')} Create group</button></div>
        <h3>Probar la seguridad por filas y columnas</h3>
        ${filtros.length ? `<p>Estas tablas tienen filtro de fila o máscara: ${filtros.map((t) => `<a href="#/databricks/catalogo/${t.split('.').map(encodeURIComponent).join('/')}"><code>${esc(t)}</code></a>`).join(' ')}. Entra o sal de un grupo y vuelve a consultarlas.</p>` : '<p class="dbx-dim">Todavía no tienes tablas con filtro de fila o máscara. Prueba esto en el <a href="#/databricks/sql">SQL Editor</a>:</p>'}
        <pre class="dbx-mono">-- 1) una función que decide qué filas ve cada uno
CREATE FUNCTION main.default.solo_mi_pais(pais STRING)
RETURNS BOOLEAN
RETURN is_account_group_member('admins') OR pais = 'Argentina';

-- 2) se la "pegas" a la tabla
ALTER TABLE main.default.clientes SET ROW FILTER main.default.solo_mi_pais ON (pais);

-- 3) una máscara: solo soporte ve el email completo
CREATE FUNCTION main.default.ocultar_email(email STRING)
RETURNS STRING
RETURN CASE WHEN is_account_group_member('soporte') THEN email ELSE '***' END;
ALTER TABLE main.default.clientes ALTER COLUMN email SET MASK main.default.ocultar_email;</pre>`}</div>`;
    cont.querySelectorAll('[data-g]').forEach((b) => (b.onclick = () => { const g = b.dataset.g; const m = G[g]; const i = m.indexOf(yo); if (i >= 0) m.splice(i, 1); else m.push(yo); D.guardar(); D.toast(i >= 0 ? `Saliste de ${g}` : `Ahora estás en ${g}`); D.ir('ajustes/identidad'); }));
    const cr = cont.querySelector('[data-crear]'); if (cr) cr.onclick = () => { const n = cont.querySelector('#gNuevo').value.trim().toLowerCase().replace(/[^\w-]/g, '-'); if (!n) return; if (G[n]) return D.toast('Ese grupo ya existe'); G[n] = []; D.guardar(); D.ir('ajustes/identidad'); };
  });

  D.analitica = { generarSql, evaluar };
})();
