/* Microsoft Fabric de práctica: los ítems de Real-Time Intelligence (Eventstream, Eventhouse con KQL y
 * Activator), Data Factory (Dataflow Gen2 y Copy job), Databases (SQL database), Data Engineering (Spark Job
 * Definition y Environment), Power BI (Report) y Data Science (Experiment). Siguen la documentación pública de
 * Microsoft Learn; los datos viven en las mismas tablas de los lakehouses del workspace. No usa código, logos
 * ni íconos de Microsoft. */
(function () {
  'use strict';
  const E = window.FabricEditores; if (!E) return;
  const hora = (t) => (t ? new Date(t).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit' }) : '—');
  const lakehouses = (c) => Object.values(c.W.items).filter((i) => i.tipo === 'lakehouse');
  const tablaHtml = (c, cols, filas, max = 50) => `<div class="fb-res-w"><table class="fb-tabla"><thead><tr>${cols.map((x) => `<th>${c.esc(x)}</th>`).join('')}</tr></thead><tbody>${filas.slice(0, max).map((f) => `<tr>${f.map((v) => `<td>${v == null ? '<i class="fb-dim">null</i>' : c.esc(typeof v === 'number' && !Number.isInteger(v) ? Math.round(v * 10000) / 10000 : v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div><p class="fb-dim fb-sm">${filas.length} rows${filas.length > max ? ` (se muestran ${max})` : ''}</p>`;
  const rnd = (seed) => { let x = seed >>> 0 || 1; return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 10000) / 10000; }; };
  const iso = (t) => new Date(t).toISOString().slice(0, 19);

  // ------------------------------------------------------------------ fuentes de eventos (datos de ejemplo)
  const FUENTES = {
    pedidos: { n: 'Pedidos en vivo (Tienda Andina)', cada: 4000, cols: [['ts', 'datetime'], ['pedido_id', 'long'], ['canal', 'string'], ['ciudad', 'string'], ['monto', 'real']], gen: (r, i, t) => [iso(t), 900000 + i, ['web', 'app', 'tienda', 'telefono'][Math.floor(r() * 4)], ['Lima', 'Bogotá', 'Santiago', 'Buenos Aires', 'Quito'][Math.floor(r() * 5)], Math.round((20 + r() * 480) * 100) / 100] },
    frio: { n: 'Cámaras de frío (sensores IoT)', cada: 5000, cols: [['ts', 'datetime'], ['camara', 'string'], ['temperatura', 'real'], ['puerta_abierta', 'bool']], gen: (r, i, t) => { const cam = ['CAM-01', 'CAM-02', 'CAM-03', 'CAM-04'][i % 4]; const abierta = r() < 0.08; return [iso(t), cam, Math.round(((cam === 'CAM-03' ? 5.5 : 3) + r() * 2.5 + (abierta ? 4 + r() * 3 : 0)) * 10) / 10, abierta]; } },
    bicis: { n: 'Bicicletas compartidas (estaciones)', cada: 6000, cols: [['ts', 'datetime'], ['estacion', 'string'], ['bicis_libres', 'long'], ['anclajes_libres', 'long']], gen: (r, i, t) => { const e = ['Centro', 'Parque', 'Estación', 'Universidad', 'Puerto'][i % 5]; const b = Math.floor(r() * 21); return [iso(t), e, b, 20 - b]; } },
  };
  // un eventstream activo genera los eventos que "llegaron" desde la última vez (hasta 400 por apertura)
  function avanzar(c, es) {
    if (es.estado !== 'Active') return 0;
    const F = FUENTES[es.fuente]; const ahora = Date.now(); const desde = Math.max(es.ultimo || es.creadoMs || ahora, ahora - 400 * F.cada);
    const n = Math.floor((ahora - desde) / F.cada); if (n <= 0) return 0;
    const r = rnd(es.seq * 7919 + 17); const nuevos = [];
    for (let k = 1; k <= n; k++) { const ev = F.gen(r, es.seq++, desde + k * F.cada); nuevos.push(ev); }
    es.ultimo = desde + n * F.cada;
    const cols = F.cols.map(([nm]) => nm);
    const pasa = (ev) => !es.filtro || es.filtro.col == null || (() => { const v = ev[cols.indexOf(es.filtro.col)]; const x = isNaN(Number(es.filtro.val)) ? es.filtro.val : Number(es.filtro.val); return es.filtro.op === '>' ? v > x : es.filtro.op === '<' ? v < x : es.filtro.op === '!=' ? String(v) !== String(x) : String(v) === String(x); })();
    const filtrados = nuevos.filter(pasa);
    es.vistos = [...filtrados.slice(-20), ...(es.vistos || [])].slice(0, 20);
    for (const d of es.destinos || []) {
      const it = c.itemDe(c.wid, d.item); if (!it) continue; it.tablas = it.tablas || {};
      const t = it.tablas[d.tabla] || (it.tablas[d.tabla] = { cols: F.cols.map(([nm, ty]) => ({ n: nm, t: ty === 'long' ? 'int' : ty === 'real' ? 'double' : ty === 'bool' ? 'boolean' : 'string' })), filas: [], creado: c.ahora() });
      t.filas.push(...filtrados); if (t.filas.length > 20000) t.filas.splice(0, t.filas.length - 20000); t.mod = c.ahora();
    }
    es.total = (es.total || 0) + filtrados.length;
    return filtrados.length;
  }
  function avanzarTodo(c) { let n = 0; for (const it of Object.values(c.W.items)) if (it.tipo === 'eventstream') n += avanzar(c, it); if (n) c.guardar(); return n; }

  // ------------------------------------------------------------------ Eventstream
  E.eventstream = (c) => {
    const { esc, ci, it } = c;
    if (!it.fuente) Object.assign(it, { fuente: null, destinos: [], estado: 'Paused', seq: 1, creadoMs: Date.now(), filtro: null, vistos: [], total: 0 });
    avanzarTodo(c);
    const F = it.fuente && FUENTES[it.fuente];
    const destinosHtml = (it.destinos || []).map((d) => { const o = c.itemDe(c.wid, d.item); return `<div class="fb-es-nodo fb-es-dst">${ci(o && o.tipo === 'eventhouse' ? 'flame' : 'database')}<div><b>${esc(o ? o.nombre : '¿?')}</b><div class="fb-dim fb-sm">${o && o.tipo === 'eventhouse' ? 'Eventhouse' : 'Lakehouse'} · tabla ${esc(d.tabla)}</div></div></div>`; }).join('') || '<div class="fb-es-nodo fb-es-vacio">+ Add destination</div>';
    c.marco(`<div class="fb-item-v"><div class="fb-ribbon"><nav class="fb-rtabs"><a class="sel">Home</a></nav><div class="fb-rcmds"><button class="fb-rb" id="esSrc">${ci('plug')}<span>Add source</span></button><button class="fb-rb" id="esDst">${ci('database')}<span>Add destination</span></button><button class="fb-rb" id="esFil">${ci('filter')}<span>Transform events</span></button><button class="fb-rb" id="esPub">${ci(it.estado === 'Active' ? 'debug-pause' : 'play')}<span>${it.estado === 'Active' ? 'Deactivate' : 'Publish'}</span></button></div></div>
      <div class="fb-pag"><h1 class="fb-h1">${esc(it.nombre)} <span class="fb-chip ${it.estado === 'Active' ? 'fb-chip-ok' : ''}">${it.estado}</span></h1>
      <div class="fb-es-canvas"><div class="fb-es-nodo fb-es-src">${ci('pulse')}<div><b>${F ? esc(F.n) : 'Sin origen'}</b><div class="fb-dim fb-sm">${F ? `un evento cada ${F.cada / 1000} s` : 'Add source'}</div></div></div><div class="fb-es-flecha">→</div>
        <div class="fb-es-nodo fb-es-str">${ci('git-merge')}<div><b>${esc(it.nombre)}-stream</b><div class="fb-dim fb-sm">${it.filtro ? `Filter: ${esc(it.filtro.col)} ${esc(it.filtro.op)} ${esc(it.filtro.val)}` : 'sin transformaciones'}</div></div></div><div class="fb-es-flecha">→</div><div class="fb-es-dsts">${destinosHtml}</div></div>
      <div class="fb-kpis"><div><small>Eventos procesados</small><b>${(it.total || 0).toLocaleString('en-US')}</b></div><div><small>Último evento</small><b class="fb-sm">${hora(it.ultimo)}</b></div></div>
      <h2>Data preview</h2>${F && it.vistos.length ? tablaHtml(c, F.cols.map(([n]) => n), it.vistos) : '<p class="fb-dim">Todavía no hay eventos: agrega un origen y presiona Publish. Los eventos se generan con el tiempo (vuelve en unos segundos y refresca).</p>'}
      <div class="fb-practica">${ci('lightbulb')} <span>Un <b>Eventstream</b> captura eventos en tiempo real (de Event Hubs, IoT Hub, Kafka, CDC de una base o datos de ejemplo), los transforma sin código y los manda a uno o varios destinos: un <b>Eventhouse</b> para consultarlos con KQL en segundos, un <b>Lakehouse</b> para el histórico en Delta, o <b>Activator</b> para disparar alertas. En la práctica los eventos se generan solos mientras el stream está activo.</span></div></div></div>`);
    const m = document.getElementById('fbp');
    m.querySelector('#esSrc').onclick = () => c.modal(`<div class="fb-modal-h"><b>Add source · Sample data</b><button class="fb-tb" data-cerrar>${ci('close')}</button></div><div class="fb-modal-b">${Object.entries(FUENTES).map(([k, f]) => `<label class="fb-radio"><input type="radio" name="esF" value="${k}" ${it.fuente === k ? 'checked' : ''}> <b>${esc(f.n)}</b> <span class="fb-dim fb-sm">${f.cols.map(([n, t]) => `${n}:${t}`).join(', ')}</span></label>`).join('')}<p class="fb-dim fb-sm">En una cuenta real también hay Azure Event Hubs, IoT Hub, Kafka y CDC de Azure SQL, PostgreSQL o Cosmos DB.</p></div><div class="fb-modal-p"><button class="fb-btn fb-btn-p" id="esOk">Add</button><button class="fb-btn" data-cerrar>Cancel</button></div>`, (mm, cerrar) => { mm.querySelector('#esOk').onclick = () => { const v = mm.querySelector('[name=esF]:checked'); if (!v) return; it.fuente = v.value; it.vistos = []; c.guardar(); cerrar(); c.render(); }; });
    m.querySelector('#esDst').onclick = () => { const ops = Object.values(c.W.items).filter((i) => i.tipo === 'eventhouse' || i.tipo === 'lakehouse'); if (!ops.length) return c.toast('Primero crea un Eventhouse o un Lakehouse en este workspace'); c.modal(`<div class="fb-modal-h"><b>Add destination</b><button class="fb-tb" data-cerrar>${ci('close')}</button></div><div class="fb-modal-b"><label class="fb-lbl">Destination</label><select class="fb-input" id="esD">${ops.map((o) => `<option value="${o.id}">${esc(o.nombre)} (${o.tipo === 'eventhouse' ? 'Eventhouse' : 'Lakehouse'})</option>`).join('')}</select><label class="fb-lbl">Table</label><input class="fb-input" id="esT" value="${it.fuente || 'eventos'}_en_vivo"></div><div class="fb-modal-p"><button class="fb-btn fb-btn-p" id="esOk">Save</button><button class="fb-btn" data-cerrar>Cancel</button></div>`, (mm, cerrar) => { mm.querySelector('#esOk').onclick = () => { const t = mm.querySelector('#esT').value.trim(); if (!/^[A-Za-z_]\w*$/.test(t)) return c.toast('Nombre de tabla inválido'); it.destinos.push({ item: mm.querySelector('#esD').value, tabla: t }); c.guardar(); cerrar(); c.render(); }; }); };
    m.querySelector('#esFil').onclick = () => { if (!F) return c.toast('Primero agrega un origen'); c.modal(`<div class="fb-modal-h"><b>Filter</b><button class="fb-tb" data-cerrar>${ci('close')}</button></div><div class="fb-modal-b"><p class="fb-dim fb-sm">Solo pasan los eventos que cumplen la condición.</p><select class="fb-input" id="fC"><option value="">(sin filtro)</option>${F.cols.map(([n]) => `<option ${it.filtro && it.filtro.col === n ? 'selected' : ''}>${n}</option>`).join('')}</select><select class="fb-input" id="fO">${['==', '!=', '>', '<'].map((o) => `<option ${it.filtro && it.filtro.op === o ? 'selected' : ''}>${o}</option>`).join('')}</select><input class="fb-input" id="fV" value="${esc(it.filtro ? it.filtro.val : '')}"></div><div class="fb-modal-p"><button class="fb-btn fb-btn-p" id="fOk">Save</button><button class="fb-btn" data-cerrar>Cancel</button></div>`, (mm, cerrar) => { mm.querySelector('#fOk').onclick = () => { const col = mm.querySelector('#fC').value; it.filtro = col ? { col, op: mm.querySelector('#fO').value, val: mm.querySelector('#fV').value } : null; c.guardar(); cerrar(); c.render(); }; }); };
    m.querySelector('#esPub').onclick = () => { if (it.estado === 'Active') { it.estado = 'Paused'; } else { if (!F) return c.toast('Agrega un origen antes de publicar'); if (!it.destinos.length) return c.toast('Agrega al menos un destino'); it.estado = 'Active'; it.ultimo = Date.now() - 30 * 60000; /* al publicar trae la última media hora de la fuente */ } c.guardar(); c.render(); };
  };

  // KQL: el motor compartido está en kql.js (window.KQL)
  const kqlASql = (q, tablas) => window.KQL.aSql(q, tablas);

  // ------------------------------------------------------------------ Eventhouse (KQL database + queryset)
  E.eventhouse = (c) => {
    const { esc, ci, it } = c;
    it.tablas = it.tablas || {}; it.consulta = it.consulta || '';
    avanzarTodo(c);
    const nombres = Object.keys(it.tablas);
    if (!it.consulta || (/^\s*\/\//.test(it.consulta) && nombres.length)) it.consulta = nombres[0] ? `${nombres[0]}\n| where ts > ago(1h)\n| summarize eventos = count() by bin(ts, 5m)\n| order by ts asc\n| render timechart` : '// Crea un Eventstream con destino a este Eventhouse para tener una tabla';
    c.marco(`<div class="fb-item-v"><div class="fb-ribbon"><nav class="fb-rtabs"><a class="sel">Home</a></nav><div class="fb-rcmds"><button class="fb-rb" id="ehRun">${ci('play')}<span>Run</span></button><button class="fb-rb" id="ehMuestra">${ci('table')}<span>Sample data</span></button></div></div>
      <div class="fb-split"><aside class="fb-exp"><div class="fb-exp-t"><b>KQL database</b></div><div class="fb-arbol"><div class="fb-nodo">${ci('flame')} <b>${esc(it.nombre)}</b></div><div class="fb-nodo fb-n1">${ci('folder')} Tables</div>${nombres.map((t) => `<a class="fb-nodo fb-n2" data-t="${esc(t)}">${ci('table')} ${esc(t)} <span class="fb-dim fb-sm">${it.tablas[t].filas.length}</span></a>`).join('') || '<div class="fb-nodo fb-n2 fb-dim">No tables</div>'}</div></aside>
      <section class="fb-princ"><div class="fb-pag"><h1 class="fb-h1">KQL queryset</h1><textarea class="fb-kql" id="ehQ" spellcheck="false" aria-label="KQL query">${esc(it.consulta)}</textarea><div id="ehR"></div>
      <details class="fb-ayuda"><summary>KQL en 1 minuto</summary><pre class="fb-pre">Tabla
| where ts > ago(1h) and canal == "web"        // filtrar
| extend monto_usd = monto * 1.0                  // columnas nuevas
| summarize pedidos = count(), ventas = sum(monto) by canal, bin(ts, 5m)
| order by ventas desc                            // ordenar
| top 10 by ventas                                // los primeros
| render timechart                                // gráfico (timechart, columnchart, piechart)</pre><p class="fb-dim fb-sm">Se lee de arriba abajo: cada <code>|</code> pasa el resultado al operador siguiente. Lo que no está en la práctica (joins, let, funciones de series de tiempo) da un error que lo dice.</p></details>
      <div class="fb-practica">${ci('lightbulb')} <span>Un <b>Eventhouse</b> guarda eventos y series de tiempo y los consulta en segundos con <b>KQL</b> (Kusto Query Language), el mismo lenguaje de Azure Data Explorer. Es la base del análisis en tiempo real de Fabric: los datos llegan por un Eventstream y quedan disponibles al instante, y también en OneLake.</span></div></div></section></div></div>`);
    const m = document.getElementById('fbp');
    const correr = async () => {
      const q = m.querySelector('#ehQ').value; it.consulta = q; c.guardar(); const R = m.querySelector('#ehR');
      try {
        const tablas = {}; for (const [n, t] of Object.entries(it.tablas)) tablas[n] = c.datosTabla(t);
        const res = await window.KQL.ejecutar(tablas, q);
        R.innerHTML = `<p class="fb-dim fb-sm">${res.values.length} records · ${res.ms} ms</p>${res.render && res.columns.length >= 2 ? grafico(c, res, res.render) : ''}${tablaHtml(c, res.columns, res.values, 100)}<details><summary class="fb-dim fb-sm">SQL equivalente (cómo lo ejecuta la práctica)</summary><pre class="fb-pre">${esc(res.sql)}</pre></details>`;
      } catch (e) { R.innerHTML = `<div class="fb-error">${esc(String(e.message || e))}</div>`; }
    };
    m.querySelector('#ehRun').onclick = correr;
    m.querySelector('#ehQ').onkeydown = (e) => { if ((e.shiftKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); correr(); } };
    m.querySelectorAll('[data-t]').forEach((a) => { a.onclick = () => { m.querySelector('#ehQ').value = `${a.dataset.t}\n| take 100`; correr(); }; });
    m.querySelector('#ehMuestra').onclick = () => { const F = FUENTES.pedidos; const r = rnd(42); const t0 = Date.now() - 3 * 36e5; it.tablas.PedidosMuestra = { cols: F.cols.map(([n, t]) => ({ n, t: t === 'long' ? 'int' : t === 'real' ? 'double' : 'string' })), filas: Array.from({ length: 2700 }, (_, i) => F.gen(r, i, t0 + i * 4000)), creado: c.ahora() }; c.guardar(); c.render(); };
    if (nombres.length) correr();
  };
  const grafico = (c, res, tipo) => window.KQL.grafico(res, tipo, c.esc, 'fb-graf');

  // ------------------------------------------------------------------ Activator (reglas sobre eventos)
  E.activator = (c) => {
    const { esc, ci, it } = c;
    it.reglas = it.reglas || []; it.alertas = it.alertas || [];
    avanzarTodo(c);
    // evalúa las reglas activas sobre los eventos nuevos de su eventstream
    for (const r of it.reglas) {
      if (!r.activa) continue; const es = c.itemDe(c.wid, r.es); if (!es || !es.fuente) continue;
      const F = FUENTES[es.fuente]; const cols = F.cols.map(([n]) => n); const ic = cols.indexOf(r.col), io = cols.indexOf(r.objeto);
      const dest = (es.destinos || [])[0]; const it2 = dest && c.itemDe(c.wid, dest.item); const t = it2 && it2.tablas && it2.tablas[dest.tabla];
      const filas = t ? t.filas.filter((f) => f[0] > (r.ultimo || '')) : [];
      for (const f of filas) { const v = Number(f[ic]); const x = Number(r.val); const ok = r.op === '>' ? v > x : r.op === '<' ? v < x : String(f[ic]) === String(r.val); if (ok) { const k = `${r.id}:${f[io]}`; const ultimo = (it.estado2 = it.estado2 || {})[k]; if (!ultimo || f[0] > ultimo) { it.alertas.unshift({ regla: r.nombre, objeto: f[io], valor: f[ic], ts: f[0], accion: r.accion, msg: r.msg.replace('{objeto}', f[io]).replace('{valor}', f[ic]) }); it.estado2[k] = new Date(new Date(f[0] + 'Z').getTime() + (r.enfriar || 10) * 6e4).toISOString().slice(0, 19); } } }
      if (filas.length) r.ultimo = filas[filas.length - 1][0];
    }
    if (it.alertas.length > 200) it.alertas.length = 200; c.guardar();
    const ess = Object.values(c.W.items).filter((i) => i.tipo === 'eventstream' && i.fuente);
    c.marco(`<div class="fb-item-v"><div class="fb-ribbon"><nav class="fb-rtabs"><a class="sel">Home</a></nav><div class="fb-rcmds"><button class="fb-rb" id="acNueva">${ci('add')}<span>New rule</span></button></div></div><div class="fb-pag"><h1 class="fb-h1">${esc(it.nombre)}</h1>
      <div class="fb-practica">${ci('lightbulb')} <span><b>Activator</b> vigila eventos y dispara una acción cuando se cumple una condición, por objeto (cada cámara, cada estación): un correo, un mensaje de Teams o un pipeline. Para no inundar de avisos, una vez que avisa por un objeto espera unos minutos antes de volver a avisar por el mismo.</span></div>
      <h2>Rules</h2>${it.reglas.length ? `<table class="fb-tabla"><thead><tr><th>Rule</th><th>Source</th><th>Condition</th><th>Per object</th><th>Action</th><th>State</th><th></th></tr></thead><tbody>${it.reglas.map((r, i) => `<tr><td><b>${esc(r.nombre)}</b></td><td>${esc((c.itemDe(c.wid, r.es) || {}).nombre || '¿?')}</td><td><code>${esc(r.col)} ${esc(r.op)} ${esc(r.val)}</code></td><td>${esc(r.objeto)}</td><td>${esc(r.accion)}</td><td>${r.activa ? 'Started' : 'Stopped'}</td><td><button class="fb-btn" data-tg="${i}">${r.activa ? 'Stop' : 'Start'}</button></td></tr>`).join('')}</tbody></table>` : '<p class="fb-dim">Sin reglas.</p>'}
      <h2>Activations</h2>${it.alertas.length ? `<table class="fb-tabla"><thead><tr><th>Time</th><th>Rule</th><th>Object</th><th>Value</th><th>Action</th><th>Message</th></tr></thead><tbody>${it.alertas.slice(0, 60).map((a) => `<tr><td>${esc(a.ts.replace('T', ' '))}</td><td>${esc(a.regla)}</td><td>${esc(a.objeto)}</td><td>${esc(a.valor)}</td><td>${esc(a.accion)}</td><td>${esc(a.msg)}</td></tr>`).join('')}</tbody></table>` : '<p class="fb-dim">Todavía no se disparó ninguna regla.</p>'}</div></div>`);
    const m = document.getElementById('fbp');
    m.querySelectorAll('[data-tg]').forEach((b) => { b.onclick = () => { const r = it.reglas[Number(b.dataset.tg)]; r.activa = !r.activa; if (r.activa) r.ultimo = new Date().toISOString().slice(0, 19); c.guardar(); c.render(); }; });
    m.querySelector('#acNueva').onclick = () => { if (!ess.length) return c.toast('Primero crea un Eventstream con origen y destino'); c.modal(`<div class="fb-modal-h"><b>New rule</b><button class="fb-tb" data-cerrar>${ci('close')}</button></div><div class="fb-modal-b"><label class="fb-lbl">Name</label><input class="fb-input" id="rN" value="Temperatura alta"><label class="fb-lbl">Monitor (eventstream)</label><select class="fb-input" id="rE">${ess.map((e) => `<option value="${e.id}">${esc(e.nombre)} · ${esc(FUENTES[e.fuente].n)}</option>`).join('')}</select><label class="fb-lbl">Condition</label><div class="fb-fila"><input class="fb-input" id="rC" value="temperatura"><select class="fb-input" id="rO"><option>&gt;</option><option>&lt;</option><option>==</option></select><input class="fb-input" id="rV" value="8"></div><label class="fb-lbl">Per object (columna que identifica cada cosa)</label><input class="fb-input" id="rB" value="camara"><label class="fb-lbl">Action</label><select class="fb-input" id="rA"><option>Teams message</option><option>Email</option><option>Run pipeline</option></select><label class="fb-lbl">Message</label><input class="fb-input" id="rM" value="La cámara {objeto} está a {valor} °C: revisar la puerta"></div><div class="fb-modal-p"><button class="fb-btn fb-btn-p" id="rOk">Create</button><button class="fb-btn" data-cerrar>Cancel</button></div>`, (mm, cerrar) => { mm.querySelector('#rOk').onclick = () => { const es = c.itemDe(c.wid, mm.querySelector('#rE').value); const cols = FUENTES[es.fuente].cols.map(([n]) => n); const col = mm.querySelector('#rC').value.trim(), obj = mm.querySelector('#rB').value.trim(); if (!cols.includes(col) || !cols.includes(obj)) return c.toast(`Columnas disponibles: ${cols.join(', ')}`); it.reglas.push({ id: c.uid(), nombre: mm.querySelector('#rN').value.trim(), es: es.id, col, op: mm.querySelector('#rO').value, val: mm.querySelector('#rV').value, objeto: obj, accion: mm.querySelector('#rA').value, msg: mm.querySelector('#rM').value, activa: true, ultimo: new Date(Date.now() - 36e5).toISOString().slice(0, 19), enfriar: 10 }); c.guardar(); cerrar(); c.render(); }; }); };
  };

  // ------------------------------------------------------------------ Dataflow Gen2 (Power Query)
  const PASOS = {
    filtro: { n: 'Filtered rows', m: (p) => `Table.SelectRows(#"{prev}", each [${p.col}] ${p.op === '==' ? '=' : p.op} ${isNaN(Number(p.val)) ? `"${p.val}"` : p.val})`, f: (d, p) => ({ ...d, filas: d.filas.filter((f) => { const v = f[d.cols.findIndex((c) => c.n === p.col)]; const x = isNaN(Number(p.val)) ? p.val : Number(p.val); return p.op === '>' ? v > x : p.op === '<' ? v < x : p.op === '!=' ? v != x : v == x; }) }) }, // eslint-disable-line eqeqeq
    columnas: { n: 'Removed other columns', m: (p) => `Table.SelectColumns(#"{prev}", {${p.cols.map((x) => `"${x}"`).join(', ')}})`, f: (d, p) => { const ix = p.cols.map((x) => d.cols.findIndex((c) => c.n === x)); return { cols: ix.map((i) => d.cols[i]), filas: d.filas.map((f) => ix.map((i) => f[i])) }; } },
    agrupar: { n: 'Grouped rows', m: (p) => `Table.Group(#"{prev}", {"${p.por}"}, {{"${p.nombre}", each List.${p.fn === 'count' ? 'Count' : p.fn === 'sum' ? 'Sum' : 'Average'}(${p.fn === 'count' ? `[${p.por}]` : `[${p.col}]`}), type number}})`, f: (d, p) => { const ig = d.cols.findIndex((c) => c.n === p.por), iv = d.cols.findIndex((c) => c.n === p.col); const g = new Map(); for (const f of d.filas) { const k = f[ig]; const a = g.get(k) || []; a.push(Number(f[iv]) || 0); g.set(k, a); } return { cols: [d.cols[ig], { n: p.nombre, t: 'double' }], filas: [...g].map(([k, a]) => [k, p.fn === 'count' ? a.length : p.fn === 'sum' ? Math.round(a.reduce((x, y) => x + y, 0) * 100) / 100 : Math.round((a.reduce((x, y) => x + y, 0) / a.length) * 100) / 100]) }; } },
    ordenar: { n: 'Sorted rows', m: (p) => `Table.Sort(#"{prev}", {{"${p.col}", Order.${p.desc ? 'Descending' : 'Ascending'}}})`, f: (d, p) => { const i = d.cols.findIndex((c) => c.n === p.col); return { ...d, filas: [...d.filas].sort((a, b) => (a[i] > b[i] ? 1 : a[i] < b[i] ? -1 : 0) * (p.desc ? -1 : 1)) }; } },
    duplicados: { n: 'Removed duplicates', m: () => 'Table.Distinct(#"{prev}")', f: (d) => { const v = new Set(); return { ...d, filas: d.filas.filter((f) => { const k = JSON.stringify(f); if (v.has(k)) return false; v.add(k); return true; }) }; } },
  };
  E.dataflow = (c) => {
    const { esc, ci, it } = c;
    it.pasos = it.pasos || []; it.origen = it.origen || null; it.destino = it.destino || null; it.runs = it.runs || [];
    const lhs = lakehouses(c);
    const fuente = () => { if (!it.origen) return null; if (it.origen.tipo === 'muestra') { const m = c.filasMuestra(it.origen.tabla); return { cols: m.cols, filas: m.filas }; } const o = c.itemDe(c.wid, it.origen.item); const t = o && o.tablas[it.origen.tabla]; return t ? c.datosTabla(t) : null; };
    const aplicar = (hasta = it.pasos.length) => { let d = fuente(); if (!d) return null; for (const p of it.pasos.slice(0, hasta)) d = PASOS[p.tipo].f(d, p); return d; };
    const mCode = () => { if (!it.origen) return 'let\n    Source = ...\nin\n    Source'; const lineas = [it.origen.tipo === 'muestra' ? `    Source = Sql.Database("tiendaandina.database.windows.net", "tienda"){[Item = "${it.origen.tabla}"]}[Data]` : `    Source = Lakehouse.Contents(null){[workspaceId = "${c.wid}"]}[Data]{[lakehouseId = "${it.origen.item}"]}[Data]{[Id = "${it.origen.tabla}", ItemKind = "Table"]}[Data]`]; let prev = 'Source'; it.pasos.forEach((p) => { const nombre = PASOS[p.tipo].n + (it.pasos.filter((q) => q.tipo === p.tipo).indexOf(p) ? ` ${it.pasos.filter((q) => q.tipo === p.tipo).indexOf(p)}` : ''); lineas.push(`    #"${nombre}" = ${PASOS[p.tipo].m(p).replace('{prev}', prev)}`); prev = nombre; }); return `let\n${lineas.join(',\n')}\nin\n    #"${prev}"`; };
    const d = aplicar();
    c.marco(`<div class="fb-item-v"><div class="fb-ribbon"><nav class="fb-rtabs"><a class="sel">Home</a></nav><div class="fb-rcmds"><button class="fb-rb" id="dfGet">${ci('plug')}<span>Get data</span></button>${['filtro', 'columnas', 'agrupar', 'ordenar', 'duplicados'].map((k) => `<button class="fb-rb" data-paso="${k}">${ci({ filtro: 'filter', columnas: 'list-selection', agrupar: 'group-by-ref-type', ordenar: 'arrow-down', duplicados: 'copy' }[k])}<span>${{ filtro: 'Filter rows', columnas: 'Choose columns', agrupar: 'Group by', ordenar: 'Sort', duplicados: 'Remove duplicates' }[k]}</span></button>`).join('')}<button class="fb-rb" id="dfDest">${ci('database')}<span>Data destination</span></button><button class="fb-rb" id="dfPub">${ci('cloud-upload')}<span>Publish</span></button></div></div>
      <div class="fb-split"><aside class="fb-exp"><div class="fb-exp-t"><b>Queries</b></div><div class="fb-arbol"><div class="fb-nodo">${ci('table')} <b>${esc(it.origen ? it.origen.tabla : 'Query')}</b></div></div><div class="fb-exp-t" style="margin-top:12px"><b>Applied steps</b></div><div class="fb-arbol"><div class="fb-nodo">${ci('symbol-field')} Source</div>${it.pasos.map((p, i) => `<div class="fb-nodo">${ci('symbol-field')} ${esc(PASOS[p.tipo].n)} <button class="fb-tb" data-quitar="${i}" title="Delete step">${ci('close')}</button></div>`).join('')}</div></aside>
      <section class="fb-princ"><div class="fb-pag"><h1 class="fb-h1">${esc(it.nombre)}</h1>${d ? tablaHtml(c, d.cols.map((x) => x.n), d.filas, 30) : '<p class="fb-dim">Usa <b>Get data</b> para elegir una tabla.</p>'}
      <details><summary>Advanced editor (M)</summary><pre class="fb-pre">${esc(mCode())}</pre></details>
      <p><b>Data destination:</b> ${it.destino ? `${esc((c.itemDe(c.wid, it.destino.item) || {}).nombre || '¿?')}.${esc(it.destino.tabla)} · ${it.destino.modo === 'append' ? 'Append' : 'Replace'}` : '<span class="fb-dim">sin destino</span>'}</p>
      ${it.runs.length ? `<h2>Refresh history</h2><table class="fb-tabla"><thead><tr><th>Status</th><th>Start</th><th class="fb-der">Rows written</th><th>Details</th></tr></thead><tbody>${it.runs.map((r) => `<tr><td>${r.ok ? '<span class="fb-ok">Succeeded</span>' : '<span class="fb-rojo">Failed</span>'}</td><td>${hora(r.t)}</td><td class="fb-der">${r.filas}</td><td class="fb-sm">${esc(r.det || '')}</td></tr>`).join('')}</tbody></table>` : ''}
      <div class="fb-practica">${ci('lightbulb')} <span><b>Dataflow Gen2</b> es Power Query en la nube: transformaciones sin código, paso a paso (cada paso queda en <i>Applied steps</i> y en el código M), con un <b>destino</b> (un lakehouse o un warehouse) que se actualiza al publicar y en cada refresh. Conviene para preparaciones simples de muchos orígenes; para lógica compleja o grandes volúmenes, un notebook.</span></div></div></section></div></div>`);
    const m = document.getElementById('fbp');
    const cols = d ? d.cols.map((x) => x.n) : [];
    const sel = (id, def) => `<select class="fb-input" id="${id}">${cols.map((x) => `<option ${x === def ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select>`;
    m.querySelector('#dfGet').onclick = () => c.modal(`<div class="fb-modal-h"><b>Get data</b><button class="fb-tb" data-cerrar>${ci('close')}</button></div><div class="fb-modal-b"><label class="fb-lbl">Source</label><select class="fb-input" id="gS"><optgroup label="Azure SQL Database (tienda, de ejemplo)">${c.MUESTRAS.map((t) => `<option value="m:${t}">${t}</option>`).join('')}</optgroup>${lhs.map((l) => `<optgroup label="Lakehouse ${esc(l.nombre)}">${Object.keys(l.tablas || {}).map((t) => `<option value="l:${l.id}:${esc(t)}">${esc(t)}</option>`).join('')}</optgroup>`).join('')}</select></div><div class="fb-modal-p"><button class="fb-btn fb-btn-p" id="gOk">Create</button><button class="fb-btn" data-cerrar>Cancel</button></div>`, (mm, cerrar) => { mm.querySelector('#gOk').onclick = () => { const v = mm.querySelector('#gS').value.split(':'); it.origen = v[0] === 'm' ? { tipo: 'muestra', tabla: v[1] } : { tipo: 'lakehouse', item: v[1], tabla: v[2] }; it.pasos = []; c.guardar(); cerrar(); c.render(); }; });
    m.querySelectorAll('[data-paso]').forEach((b) => { b.onclick = () => {
      if (!d) return c.toast('Primero Get data'); const k = b.dataset.paso;
      if (k === 'duplicados') { it.pasos.push({ tipo: k }); c.guardar(); return c.render(); }
      const form = k === 'filtro' ? `${sel('pC', cols[0])}<select class="fb-input" id="pO"><option>==</option><option>!=</option><option>&gt;</option><option>&lt;</option></select><input class="fb-input" id="pV" placeholder="valor">` : k === 'columnas' ? cols.map((x) => `<label class="fb-check"><input type="checkbox" value="${esc(x)}" checked> ${esc(x)}</label>`).join('') : k === 'agrupar' ? `<label class="fb-lbl">Group by</label>${sel('pP', cols[0])}<label class="fb-lbl">Operation</label><select class="fb-input" id="pF"><option value="sum">Sum</option><option value="count">Count rows</option><option value="avg">Average</option></select><label class="fb-lbl">Column</label>${sel('pC', cols[cols.length - 1])}<label class="fb-lbl">New column name</label><input class="fb-input" id="pN" value="total">` : `${sel('pC', cols[0])}<label class="fb-check"><input type="checkbox" id="pD"> Descending</label>`;
      c.modal(`<div class="fb-modal-h"><b>${esc(PASOS[k].n)}</b><button class="fb-tb" data-cerrar>${ci('close')}</button></div><div class="fb-modal-b">${form}</div><div class="fb-modal-p"><button class="fb-btn fb-btn-p" id="pOk">OK</button><button class="fb-btn" data-cerrar>Cancel</button></div>`, (mm, cerrar) => { mm.querySelector('#pOk').onclick = () => {
        const p = { tipo: k };
        if (k === 'filtro') Object.assign(p, { col: mm.querySelector('#pC').value, op: mm.querySelector('#pO').value, val: mm.querySelector('#pV').value });
        if (k === 'columnas') p.cols = [...mm.querySelectorAll('input[type=checkbox]:checked')].map((x) => x.value);
        if (k === 'agrupar') Object.assign(p, { por: mm.querySelector('#pP').value, fn: mm.querySelector('#pF').value, col: mm.querySelector('#pC').value, nombre: mm.querySelector('#pN').value.trim() || 'total' });
        if (k === 'ordenar') Object.assign(p, { col: mm.querySelector('#pC').value, desc: mm.querySelector('#pD').checked });
        it.pasos.push(p); c.guardar(); cerrar(); c.render(); }; });
    }; });
    m.querySelectorAll('[data-quitar]').forEach((b) => { b.onclick = () => { it.pasos.splice(Number(b.dataset.quitar), 1); c.guardar(); c.render(); }; });
    m.querySelector('#dfDest').onclick = () => { if (!lhs.length) return c.toast('Crea un Lakehouse para usarlo como destino'); c.modal(`<div class="fb-modal-h"><b>Data destination · Lakehouse</b><button class="fb-tb" data-cerrar>${ci('close')}</button></div><div class="fb-modal-b"><label class="fb-lbl">Lakehouse</label><select class="fb-input" id="dL">${lhs.map((l) => `<option value="${l.id}">${esc(l.nombre)}</option>`).join('')}</select><label class="fb-lbl">Table name</label><input class="fb-input" id="dT" value="${esc(it.origen ? it.origen.tabla + '_limpia' : 'tabla')}"><label class="fb-lbl">Update method</label><select class="fb-input" id="dM"><option value="replace">Replace</option><option value="append">Append</option></select></div><div class="fb-modal-p"><button class="fb-btn fb-btn-p" id="dOk">Save settings</button><button class="fb-btn" data-cerrar>Cancel</button></div>`, (mm, cerrar) => { mm.querySelector('#dOk').onclick = () => { const t = mm.querySelector('#dT').value.trim(); if (!/^[A-Za-z_]\w*$/.test(t)) return c.toast('Nombre inválido'); it.destino = { item: mm.querySelector('#dL').value, tabla: t, modo: mm.querySelector('#dM').value }; c.guardar(); cerrar(); c.render(); }; }); };
    m.querySelector('#dfPub').onclick = () => {
      if (!it.destino) return c.toast('Configura un Data destination antes de publicar');
      const run = c.registrarRun({ nombre: it.nombre, tipo: 'Dataflow Gen2', wsn: c.W.nombre });
      try { const r = aplicar(); const L = c.itemDe(c.wid, it.destino.item); const prev = L.tablas[it.destino.tabla]; const filas = it.destino.modo === 'append' && prev ? [...c.datosTabla(prev).filas, ...r.filas] : r.filas; L.tablas[it.destino.tabla] = { cols: r.cols, filas, creado: (prev && prev.creado) || c.ahora(), mod: c.ahora() }; it.runs.unshift({ ok: true, t: Date.now(), filas: r.filas.length, det: `${it.destino.modo === 'append' ? 'Appended to' : 'Replaced'} ${L.nombre}.${it.destino.tabla}` }); c.terminarRun(run, true); c.toast(`Publicado: ${r.filas.length} filas en ${L.nombre}.${it.destino.tabla}`); }
      catch (e) { it.runs.unshift({ ok: false, t: Date.now(), filas: 0, det: e.message }); c.terminarRun(run, false, e.message); }
      it.runs.length = Math.min(it.runs.length, 30); c.guardar(); c.render();
    };
  };

  // ------------------------------------------------------------------ Copy job (completa o incremental con marca de agua)
  E.copyjob = (c) => {
    const { esc, ci, it } = c;
    it.cfg = it.cfg || null; it.runs = it.runs || [];
    const lhs = lakehouses(c);
    c.marco(`<div class="fb-item-v"><div class="fb-ribbon"><nav class="fb-rtabs"><a class="sel">Home</a></nav><div class="fb-rcmds"><button class="fb-rb" id="cjCfg">${ci('settings-gear')}<span>Edit</span></button><button class="fb-rb" id="cjRun">${ci('play')}<span>Run</span></button></div></div><div class="fb-pag"><h1 class="fb-h1">${esc(it.nombre)}</h1>
      ${it.cfg ? `<dl class="fb-dl"><dt>Source</dt><dd>Azure SQL Database · tienda · tabla <b>${esc(it.cfg.tabla)}</b></dd><dt>Destination</dt><dd>${esc((c.itemDe(c.wid, it.cfg.dest) || {}).nombre || '¿?')} · Tables/${esc(it.cfg.destTabla)}</dd><dt>Copy mode</dt><dd>${it.cfg.modo === 'incremental' ? `Incremental copy · columna de marca de agua <code>${esc(it.cfg.marca)}</code> · último valor copiado <code>${esc(it.cfg.ultimo == null ? '(ninguno: la primera corrida copia todo)' : it.cfg.ultimo)}</code>` : 'Full copy (reemplaza todo en cada corrida)'}</dd></dl>` : '<p class="fb-dim">Configura el origen, el destino y el modo de copia con <b>Edit</b>.</p>'}
      ${it.runs.length ? `<h2>Run history</h2><table class="fb-tabla"><thead><tr><th>Status</th><th>Start</th><th class="fb-der">Rows read</th><th class="fb-der">Rows written</th><th>Details</th></tr></thead><tbody>${it.runs.map((r) => `<tr><td>${r.ok ? '<span class="fb-ok">Succeeded</span>' : '<span class="fb-rojo">Failed</span>'}</td><td>${hora(r.t)}</td><td class="fb-der">${r.leidas}</td><td class="fb-der">${r.escritas}</td><td class="fb-sm">${esc(r.det)}</td></tr>`).join('')}</tbody></table>` : ''}
      <div class="fb-practica">${ci('lightbulb')} <span>Un <b>Copy job</b> mueve datos de un origen a un destino sin armar un pipeline. En modo <b>incremental</b> recuerda el valor más alto de una columna (la <i>marca de agua</i>, por ejemplo una fecha o un id que solo crece) y en cada corrida copia solo las filas posteriores: así no se vuelve a copiar todo cada día.</span></div></div></div>`);
    const m = document.getElementById('fbp');
    m.querySelector('#cjCfg').onclick = () => { if (!lhs.length) return c.toast('Crea un Lakehouse para usarlo como destino'); c.modal(`<div class="fb-modal-h"><b>Copy job</b><button class="fb-tb" data-cerrar>${ci('close')}</button></div><div class="fb-modal-b"><label class="fb-lbl">Source table (Azure SQL Database · tienda)</label><select class="fb-input" id="cT">${c.MUESTRAS.map((t) => `<option ${it.cfg && it.cfg.tabla === t ? 'selected' : ''}>${t}</option>`).join('')}</select><label class="fb-lbl">Destination lakehouse</label><select class="fb-input" id="cD">${lhs.map((l) => `<option value="${l.id}">${esc(l.nombre)}</option>`).join('')}</select><label class="fb-lbl">Destination table</label><input class="fb-input" id="cDT" value="${esc(it.cfg ? it.cfg.destTabla : 'pedidos_copia')}"><label class="fb-lbl">Copy mode</label><select class="fb-input" id="cM"><option value="full">Full copy</option><option value="incremental" selected>Incremental copy</option></select><label class="fb-lbl">Incremental column (watermark)</label><input class="fb-input" id="cW" value="${esc(it.cfg ? it.cfg.marca || '' : 'pedido_id')}"></div><div class="fb-modal-p"><button class="fb-btn fb-btn-p" id="cOk">Save</button><button class="fb-btn" data-cerrar>Cancel</button></div>`, (mm, cerrar) => { mm.querySelector('#cOk').onclick = () => { const tabla = mm.querySelector('#cT').value; const cols = c.filasMuestra(tabla).cols.map((x) => x.n); const marca = mm.querySelector('#cW').value.trim(); const modo = mm.querySelector('#cM').value; if (modo === 'incremental' && !cols.includes(marca)) return c.toast(`La columna de marca de agua tiene que existir: ${cols.join(', ')}`); it.cfg = { tabla, dest: mm.querySelector('#cD').value, destTabla: mm.querySelector('#cDT').value.trim(), modo, marca, ultimo: null }; c.guardar(); cerrar(); c.render(); }; }); };
    m.querySelector('#cjRun').onclick = () => {
      if (!it.cfg) return c.toast('Configura el copy job primero'); const run = c.registrarRun({ nombre: it.nombre, tipo: 'Copy job', wsn: c.W.nombre });
      try {
        const src = c.filasMuestra(it.cfg.tabla); const L = c.itemDe(c.wid, it.cfg.dest); const prev = L.tablas[it.cfg.destTabla];
        let nuevas = src.filas;
        if (it.cfg.modo === 'incremental') { const i = src.cols.findIndex((x) => x.n === it.cfg.marca); if (it.cfg.ultimo != null) nuevas = src.filas.filter((f) => f[i] > it.cfg.ultimo); if (nuevas.length) it.cfg.ultimo = nuevas.reduce((mx, f) => (f[i] > mx ? f[i] : mx), nuevas[0][i]); }
        const filas = it.cfg.modo === 'incremental' && prev ? [...c.datosTabla(prev).filas, ...nuevas] : nuevas;
        L.tablas[it.cfg.destTabla] = { cols: src.cols, filas, creado: (prev && prev.creado) || c.ahora(), mod: c.ahora() };
        it.runs.unshift({ ok: true, t: Date.now(), leidas: nuevas.length, escritas: nuevas.length, det: it.cfg.modo === 'incremental' ? (nuevas.length ? `Nueva marca de agua: ${it.cfg.ultimo}` : 'Sin filas nuevas desde la última corrida') : 'Full copy' });
        c.terminarRun(run, true);
      } catch (e) { it.runs.unshift({ ok: false, t: Date.now(), leidas: 0, escritas: 0, det: e.message }); c.terminarRun(run, false, e.message); }
      it.runs.length = Math.min(it.runs.length, 30); c.guardar(); c.render();
    };
  };

  // ------------------------------------------------------------------ SQL database (OLTP en Fabric, T-SQL con escritura y espejo en OneLake)
  E.sqldb = (c) => { c.it.tablas = c.it.tablas || {}; c.it.consultas = c.it.consultas || []; E.warehouse(c); const p = document.querySelector('#fbp .fb-practica span'); if (p) p.innerHTML = 'Una <b>SQL database</b> en Fabric es una base operacional (como Azure SQL Database) para aplicaciones: T-SQL completo con escritura y transacciones. Sus datos se replican solos, casi en tiempo real, a OneLake en formato Delta (mirroring), así que se pueden analizar desde un lakehouse o un notebook sin copiarlos a mano.'; };

  // ------------------------------------------------------------------ Spark Job Definition
  E.sjd = (c) => {
    const { esc, ci, it } = c;
    it.codigo = it.codigo || `from pyspark.sql import SparkSession, functions as F\nimport sys\n\nspark = SparkSession.builder.getOrCreate()\nanio = sys.argv[1] if len(sys.argv) > 1 else "2024"\n\ndf = spark.createDataFrame([("web", 120.0), ("app", 80.5), ("web", 40.0), ("tienda", 15.0)], ["canal", "monto"])\nres = df.groupBy("canal").agg(F.sum("monto").alias("ventas")).orderBy(F.desc("ventas"))\nprint(f"Ventas por canal ({anio}):")\nres.show()\n`;
    it.args = it.args || '2024'; it.runs = it.runs || []; it.lh = it.lh || null;
    const lhs = lakehouses(c);
    c.marco(`<div class="fb-item-v"><div class="fb-ribbon"><nav class="fb-rtabs"><a class="sel">Home</a></nav><div class="fb-rcmds"><button class="fb-rb" id="sjRun">${ci('play')}<span>Run</span></button></div></div><div class="fb-pag"><h1 class="fb-h1">${esc(it.nombre)}</h1>
      <label class="fb-lbl">Main definition file (main.py)</label><textarea class="fb-kql" id="sjC" spellcheck="false" style="min-height:260px">${esc(it.codigo)}</textarea>
      <div class="fb-fila"><div><label class="fb-lbl">Command line arguments</label><input class="fb-input" id="sjA" value="${esc(it.args)}"></div><div><label class="fb-lbl">Lakehouse reference</label><select class="fb-input" id="sjL"><option value="">(none)</option>${lhs.map((l) => `<option value="${l.id}" ${it.lh === l.id ? 'selected' : ''}>${esc(l.nombre)}</option>`).join('')}</select></div></div>
      <div id="sjOut"></div>${it.runs.length ? `<h2>Runs</h2><table class="fb-tabla"><thead><tr><th>Status</th><th>Submitted</th><th class="fb-der">Duration</th><th>Arguments</th></tr></thead><tbody>${it.runs.map((r) => `<tr><td>${r.ok ? '<span class="fb-ok">Succeeded</span>' : '<span class="fb-rojo">Failed</span>'}</td><td>${hora(r.t)}</td><td class="fb-der">${(r.ms / 1000).toFixed(1)} s</td><td><code>${esc(r.args)}</code></td></tr>`).join('')}</tbody></table>` : ''}
      <div class="fb-practica">${ci('lightbulb')} <span>Una <b>Spark Job Definition</b> ejecuta un archivo de PySpark (o un JAR) como un trabajo batch, con argumentos y un lakehouse de referencia, sin la parte interactiva de un notebook. Es lo que se programa en un pipeline cuando el código ya está probado. En la práctica corre con el Spark simulado del curso.</span></div></div></div>`);
    const m = document.getElementById('fbp');
    m.querySelector('#sjC').oninput = (e) => { it.codigo = e.target.value; c.guardar(); };
    m.querySelector('#sjA').oninput = (e) => { it.args = e.target.value; c.guardar(); };
    m.querySelector('#sjL').onchange = (e) => { it.lh = e.target.value || null; c.guardar(); };
    m.querySelector('#sjRun').onclick = async (e) => {
      const out = m.querySelector('#sjOut'); e.currentTarget.disabled = true; out.innerHTML = '<p class="fb-dim">Submitting… (la primera vez carga el Spark simulado)</p>'; const t0 = Date.now(); const run = c.registrarRun({ nombre: it.nombre, tipo: 'Spark job definition', wsn: c.W.nombre });
      const prog = `import sys\nsys.argv = ["main.py"] + ${JSON.stringify(it.args.split(/\s+/).filter(Boolean))}\n${it.codigo}`;
      const r = await window.Engines.PY.run('pyspark', prog); const txt = String(r.stdout || r.out || '') + (r.error ? '\n' + r.error : '');
      const ok = !r.error && r.ok !== false; it.runs.unshift({ ok, t: t0, ms: Date.now() - t0, args: it.args }); it.runs.length = Math.min(it.runs.length, 20); c.terminarRun(run, ok, ok ? '' : String(r.error).slice(0, 200)); c.guardar();
      out.innerHTML = `<h2>Driver log (stdout)</h2><pre class="fb-pre">${esc(txt || '(sin salida)')}</pre>`; e.target.disabled = false;
    };
  };

  // ------------------------------------------------------------------ Environment
  E.environment = (c) => {
    const { esc, ci, it } = c;
    it.libs = it.libs || ['great-expectations==0.18.19', 'pyarrow==16.1.0']; it.nodo = it.nodo || 'Medium'; it.auto = it.auto !== false; it.max = it.max || 4; it.props = it.props || 'spark.sql.shuffle.partitions 64'; it.publicado = it.publicado || null;
    c.marco(`<div class="fb-item-v"><div class="fb-ribbon"><nav class="fb-rtabs"><a class="sel">Home</a></nav><div class="fb-rcmds"><button class="fb-rb" id="enSave">${ci('save')}<span>Save</span></button><button class="fb-rb" id="enPub">${ci('cloud-upload')}<span>Publish</span></button></div></div><div class="fb-pag"><h1 class="fb-h1">${esc(it.nombre)} ${it.publicado ? `<span class="fb-chip fb-chip-ok">Published ${hora(it.publicado)}</span>` : '<span class="fb-chip">Not published</span>'}</h1>
      <h2>Public libraries (PyPI)</h2><textarea class="fb-kql" id="enL" spellcheck="false" style="min-height:100px">${esc(it.libs.join('\n'))}</textarea><p class="fb-dim fb-sm">Una librería por línea, con su versión fija (<code>paquete==versión</code>): así todos los notebooks del equipo corren con lo mismo.</p>
      <h2>Spark compute</h2><div class="fb-fila"><div><label class="fb-lbl">Node size</label><select class="fb-input" id="enN">${['Small', 'Medium', 'Large', 'X-Large'].map((x) => `<option ${it.nodo === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div><div><label class="fb-lbl">Max nodes (autoscale)</label><input class="fb-input" id="enM" type="number" min="1" max="20" value="${it.max}"></div></div>
      <h2>Spark properties</h2><textarea class="fb-kql" id="enP" spellcheck="false" style="min-height:70px">${esc(it.props)}</textarea>
      <div class="fb-practica">${ci('lightbulb')} <span>Un <b>Environment</b> fija las librerías, el tamaño del cómputo de Spark y sus propiedades para los notebooks y Spark Job Definitions que lo usan. Los cambios se aplican recién al <b>publicar</b> (puede tardar unos minutos en una cuenta real). Se puede poner como environment por defecto del workspace.</span></div></div></div>`);
    const m = document.getElementById('fbp');
    const leer = () => { it.libs = m.querySelector('#enL').value.split('\n').map((x) => x.trim()).filter(Boolean); it.nodo = m.querySelector('#enN').value; it.max = Number(m.querySelector('#enM').value) || 4; it.props = m.querySelector('#enP').value; };
    m.querySelector('#enSave').onclick = () => { leer(); c.guardar(); c.toast('Guardado (todavía sin publicar)'); };
    m.querySelector('#enPub').onclick = () => { leer(); const malas = it.libs.filter((l) => !/^[A-Za-z0-9_.-]+==\d[\w.]*$/.test(l)); if (malas.length) return c.toast(`Fija la versión: ${malas.join(', ')} (paquete==versión)`); it.publicado = Date.now(); const run = c.registrarRun({ nombre: it.nombre, tipo: 'Environment publish', wsn: c.W.nombre }); c.terminarRun(run, true); c.guardar(); c.render(); };
  };

  // ------------------------------------------------------------------ Report (los informes de Fabric son informes de Power BI)
  E.report = (c) => {
    const { esc, ci, it } = c;
    const modelos = Object.values(c.W.items).filter((i) => i.tipo === 'semanticmodel');
    c.marco(`<div class="fb-pag"><h1 class="fb-h1">${esc(it.nombre)}</h1><p>Un informe de Fabric es un <b>informe de Power BI</b>: se arma con el mismo editor, sobre un <b>semantic model</b> del workspace (por ejemplo, el modelo por defecto de un lakehouse o uno creado a mano con Direct Lake).</p>
      <label class="fb-lbl">Semantic model</label><select class="fb-input" id="rpM">${modelos.map((x) => `<option value="${x.id}" ${it.modelo === x.id ? 'selected' : ''}>${esc(x.nombre)}</option>`).join('') || '<option value="">(no hay semantic models en este workspace)</option>'}</select>
      <div class="fb-acciones"><a class="fb-btn fb-btn-p" href="#/powerbi" id="rpAbrir">${ci('graph')} Edit in Power BI (práctica)</a><a class="fb-btn" href="#/powerbi/servicio">Power BI service (práctica)</a></div>
      <div class="fb-practica">${ci('lightbulb')} <span>Con <b>Direct Lake</b>, el informe lee las tablas Delta de OneLake directamente, sin importar una copia ni consultar en vivo un warehouse: rápido como Import y actualizado como DirectQuery. En la práctica, el editor de informes es el Power BI Desktop del curso.</span></div></div>`);
    const s = document.querySelector('#rpM'); if (s) s.onchange = () => { it.modelo = s.value; c.guardar(); };
  };

  // ------------------------------------------------------------------ Experiment (MLflow)
  E.experiment = (c) => {
    const { esc, ci, it } = c;
    it.runs = it.runs || [];
    // entrena una regresión lineal real (mínimos cuadrados) de monto del pedido según cantidad de ítems y canal
    const entrenar = (alpha, test) => {
      const R = window.Engines.SQL.exec("SELECT COUNT(*) AS items, SUM(d.cantidad * d.precio_unitario) AS monto, p.canal FROM pedidos p JOIN detalle_pedidos d ON d.pedido_id = p.pedido_id GROUP BY p.pedido_id LIMIT 4000", window.Engines.SQL.playground());
      const filas = (R.results && R.results[0] ? R.results[0].values : []); const corte = Math.floor(filas.length * (1 - test));
      const X = (f) => [1, f[0], f[2] === 'web' ? 1 : 0, f[2] === 'app' ? 1 : 0]; const tr = filas.slice(0, corte), te = filas.slice(corte);
      const k = 4; const A = Array.from({ length: k }, () => Array(k).fill(0)); const b = Array(k).fill(0);
      for (const f of tr) { const x = X(f); for (let i = 0; i < k; i++) { b[i] += x[i] * f[1]; for (let j = 0; j < k; j++) A[i][j] += x[i] * x[j]; } }
      for (let i = 1; i < k; i++) A[i][i] += alpha * tr.length;
      for (let i = 0; i < k; i++) { let p = i; for (let r = i + 1; r < k; r++) if (Math.abs(A[r][i]) > Math.abs(A[p][i])) p = r; [A[i], A[p]] = [A[p], A[i]]; [b[i], b[p]] = [b[p], b[i]]; for (let r = 0; r < k; r++) { if (r === i || !A[i][i]) continue; const f = A[r][i] / A[i][i]; for (let cc = i; cc < k; cc++) A[r][cc] -= f * A[i][cc]; b[r] -= f * b[i]; } }
      const w = b.map((v, i) => v / (A[i][i] || 1)); const pred = (f) => X(f).reduce((s, x, i) => s + x * w[i], 0);
      const media = te.reduce((s, f) => s + f[1], 0) / (te.length || 1); const sse = te.reduce((s, f) => s + (f[1] - pred(f)) ** 2, 0), sst = te.reduce((s, f) => s + (f[1] - media) ** 2, 0);
      return { r2: Math.round((1 - sse / (sst || 1)) * 1000) / 1000, rmse: Math.round(Math.sqrt(sse / (te.length || 1)) * 100) / 100, n: tr.length };
    };
    c.marco(`<div class="fb-item-v"><div class="fb-ribbon"><nav class="fb-rtabs"><a class="sel">Home</a></nav><div class="fb-rcmds"><button class="fb-rb" id="exRun">${ci('play')}<span>New run</span></button><button class="fb-rb" id="exSave">${ci('save')}<span>Save as ML model</span></button></div></div><div class="fb-pag"><h1 class="fb-h1">${esc(it.nombre)}</h1>
      <div class="fb-fila"><div><label class="fb-lbl">alpha (regularización)</label><input class="fb-input" id="exA" type="number" step="0.01" min="0" value="0.1"></div><div><label class="fb-lbl">test_size</label><input class="fb-input" id="exT" type="number" step="0.05" min="0.1" max="0.5" value="0.2"></div></div>
      ${it.runs.length ? `<h2>Runs</h2><table class="fb-tabla"><thead><tr><th>Run</th><th>Start</th><th class="fb-der">alpha</th><th class="fb-der">test_size</th><th class="fb-der">r2</th><th class="fb-der">rmse</th><th class="fb-der">train rows</th></tr></thead><tbody>${it.runs.map((r) => `<tr${r.mejor ? ' class="fb-mejor"' : ''}><td><b>${esc(r.nombre)}</b>${r.modelo ? ' <span class="fb-chip fb-chip-ok">model v' + r.modelo + '</span>' : ''}</td><td>${hora(r.t)}</td><td class="fb-der">${r.alpha}</td><td class="fb-der">${r.test}</td><td class="fb-der">${r.r2}</td><td class="fb-der">${r.rmse}</td><td class="fb-der">${r.n}</td></tr>`).join('')}</tbody></table>` : '<p class="fb-dim">Todavía no hay runs.</p>'}
      <div class="fb-practica">${ci('lightbulb')} <span>Un <b>Experiment</b> guarda cada entrenamiento (run) con sus <b>parámetros</b> y <b>métricas</b> (MLflow), para comparar y elegir el mejor; el elegido se guarda como <b>ML model</b> con versión. En un notebook se hace con <code>mlflow.log_param</code>, <code>mlflow.log_metric</code> o <code>mlflow.autolog()</code>. En la práctica cada run entrena de verdad una regresión lineal del monto del pedido.</span></div></div></div>`);
    const m = document.getElementById('fbp');
    m.querySelector('#exRun').onclick = () => { const alpha = Number(m.querySelector('#exA').value) || 0, test = Number(m.querySelector('#exT').value) || 0.2; try { const r = entrenar(alpha, test); it.runs.unshift({ nombre: `run_${it.runs.length + 1}`, t: Date.now(), alpha, test, ...r }); const mejor = it.runs.reduce((a, b) => (b.r2 > a.r2 ? b : a)); it.runs.forEach((x) => { x.mejor = x === mejor; }); c.guardar(); c.render(); } catch (e) { c.toast(e.message); } };
    m.querySelector('#exSave').onclick = () => { const mejor = it.runs.find((x) => x.mejor); if (!mejor) return c.toast('Primero haz al menos un run'); it.version = (it.version || 0) + 1; mejor.modelo = it.version; c.guardar(); c.toast(`Guardado como ML model versión ${it.version} (el run con mejor r2)`); c.render(); };
  };

  E._kql = kqlASql;
})();
