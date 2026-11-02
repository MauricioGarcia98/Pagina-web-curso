/* Réplica de Airflow 3: pestañas del Dag, corrida, instancia de tarea (logs, XCom, plantillas), Trigger y
 * Backfill, Assets, Browse (Dag Runs, Task Instances, Audit Log, XComs) y Admin (Variables, Connections,
 * Pools, Providers, Plugins, Config). Usa los ayudantes de assets/js/airflow.js. */
(function () {
  'use strict';
  const U = window.AirflowUI; const _ = U._;
  const { A, ic, esc, enc, href, fecha, duracion, segs, badge, punto, tipoRun, codigo, modal, cerrarModal, interruptor, tabs, tabla } = _;
  const P = U.paginas;
  const q = () => _.query();
  const toast = (m) => _.toast(m);
  const rutaDag = (d) => 'dags/' + enc(d.id);
  const rutaRun = (d, r) => rutaDag(d) + '/runs/' + enc(r.run_id);
  const rutaTI = (d, r, t) => rutaRun(d, r) + '/tasks/' + enc(t);
  const conQ = (base, extra) => { const o = Object.fromEntries(q()); delete o.tab; delete o.intento; Object.assign(o, extra); for (const k of Object.keys(o)) if (!o[k]) delete o[k]; return href(base, o); };
  const repr = (v) => A().pyRepr(v);
  const jsonBonito = (v) => { try { return JSON.stringify(v, null, 2); } catch (e) { return String(v); } };
  const fuente = (d) => (A().archivos().find((f) => f.ruta === d.file) || {}).codigo || '';
  const tareaDe = (d, id) => d.tasks.find((t) => t.id === id);

  // ------------------------------------------------------------------ pestañas del Dag
  P.dagTabs = (el, d) => {
    const tab = q().get('tab') || 'overview';
    const base = (t) => conQ(rutaDag(d), { tab: t === 'overview' ? '' : t });
    const rs = A().runs(d.id);
    let cuerpo = '';
    if (tab === 'overview') {
      const fallidas = rs.filter((r) => r.state === 'failed').length;
      const tiFall = rs.flatMap((r) => Object.values(r.tis)).filter((t) => t.state === 'failed').length;
      const ult = rs.slice(0, 14).reverse(); const mx = Math.max(1, ...ult.map((r) => segs(r.inicio, r.fin)));
      cuerpo = `<div class="af-ov">
        <div class="af-stats af-stats-s"><a class="af-stat ${fallidas ? 'af-stat-r' : ''}" href="${base('runs')}"><b>${fallidas}</b><span>Failed Runs</span></a><a class="af-stat ${tiFall ? 'af-stat-r' : ''}" href="${href('task_instances', { dag_id: d.id, state: 'failed' })}"><b>${tiFall}</b><span>Failed Tasks</span></a><span class="af-stat"><b>${rs.length}</b><span>Total Runs</span></span></div>
        <section class="af-card"><h3>Last ${ult.length} Dag Runs</h3>${ult.length ? `<div class="af-chart">${ult.map((r) => `<a href="${href(rutaRun(d, r))}" title="${esc(r.run_id)} · ${duracion(r.inicio, r.fin)}"><span class="af-s-${r.state}" style="height:${10 + 110 * segs(r.inicio, r.fin) / mx}px"></span></a>`).join('')}</div><div class="af-dim">Duración de cada corrida (más alta = más lenta)</div>` : '<div class="af-vacio">Todavía no hay corridas.</div>'}</section>
        ${d.doc ? `<section class="af-card af-doc"><h3>${ic('file-text', '', 16)} Dag Docs</h3>${mdMini(d.doc)}</section>` : ''}
      </div>`;
    } else if (tab === 'runs') {
      const fe = q().get('state') || ''; const ft = q().get('run_type') || '';
      const lista = rs.filter((r) => (!fe || r.state === fe) && (!ft || r.tipo === ft));
      cuerpo = `<div class="af-filtros"><select class="af-sel" id="afFE"><option value="">All States</option>${['queued', 'running', 'success', 'failed'].map((s) => `<option ${s === fe ? 'selected' : ''}>${s}</option>`).join('')}</select><select class="af-sel" id="afFT"><option value="">All Run Types</option>${['manual', 'scheduled', 'asset_triggered', 'backfill'].map((s) => `<option ${s === ft ? 'selected' : ''}>${s}</option>`).join('')}</select></div>`
        + tabla(['Run ID', 'State', 'Run Type', 'Logical Date', 'Start Date', 'End Date', 'Duration', 'Conf'], lista.map((r) => [`<a href="${href(rutaRun(d, r))}">${esc(r.run_id)}</a>`, badge(r.state), `${ic(tipoRun(r.tipo)[0], '', 12)} ${tipoRun(r.tipo)[1]}`, fecha(r.logical), fecha(r.inicio), fecha(r.fin), duracion(r.inicio, r.fin), `<code>${esc(JSON.stringify(r.conf))}</code>`]), 'No Dag Runs found');
    } else if (tab === 'tasks') {
      cuerpo = `<div class="af-tcards">${d.tasks.map((t) => { const ult = rs.slice(0, 10).reverse(); return `<a class="af-card af-tcard" href="${href(rutaDag(d) + '/tasks/' + enc(t.id))}"><b>${esc(t.id)}</b><span class="af-dim">${esc(t.op)}</span><span class="af-dim">Trigger Rule: ${esc(t.tr)}</span><span class="af-mini">${ult.map((r) => `<i class="af-s-${(r.tis[t.id] || {}).state || 'none'}"></i>`).join('')}</span></a>`; }).join('')}</div>`;
    } else if (tab === 'calendar') {
      const hoy = new Date(); const dias = []; for (let i = 83; i >= 0; i--) { const x = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate() - i)); dias.push(x); }
      const porDia = {}; rs.forEach((r) => { const k = r.logical.slice(0, 10); (porDia[k] = porDia[k] || []).push(r.state); });
      cuerpo = `<section class="af-card"><h3>${ic('calendar-days', '', 16)} Calendar</h3><div class="af-cal">${dias.map((x) => { const k = x.toISOString().slice(0, 10); const e = porDia[k] || []; const s = e.includes('failed') ? 'failed' : e.includes('running') ? 'running' : e.length ? 'success' : 'none'; return `<span class="af-s-${s}" title="${k}: ${e.length} runs"></span>`; }).join('')}</div><div class="af-hleg"><span>${punto('success')} success</span><span>${punto('failed')} failed</span><span>${punto('running')} running</span><span class="af-dim">últimas 12 semanas, por logical date</span></div></section>`;
    } else if (tab === 'backfills') {
      const bf = {}; rs.filter((r) => r.backfill).forEach((r) => { const b = bf[r.backfill] || (bf[r.backfill] = { id: r.backfill, runs: [], creado: r.creado }); b.runs.push(r); });
      cuerpo = `<div class="af-titulo"><span class="af-dim">Un backfill crea corridas para intervalos pasados del horario.</span><span class="af-sp"></span><button class="af-btn" id="afBfN">${ic('history', '', 14)} Backfill</button></div>` + tabla(['ID', 'From', 'To', 'Runs', 'Estado', 'Created At'], Object.values(bf).map((b) => { const ls = b.runs.map((r) => r.logical).sort(); return [b.id, fecha(ls[0]), fecha(ls[ls.length - 1]), b.runs.length, b.runs.map((r) => punto(r.state)).join(''), fecha(b.creado)]; }), 'No backfills found');
    } else if (tab === 'events') {
      cuerpo = eventos((e) => e.dag === d.id);
    } else if (tab === 'code') {
      cuerpo = `<div class="af-codebar"><span class="af-dim">${ic('file-code', '', 14)} ${esc(d.file)}</span><span class="af-sp"></span><span class="af-dim">Parsed at: ${fecha(d.parseado)}</span><button class="af-btn af-btn-s" id="afCopiar">${ic('copy', '', 14)} Copy</button></div>${codigo(fuente(d))}<p class="af-dim af-nota">El código es de solo lectura, como en Airflow. Para cambiarlo edita el archivo en la terminal: <code>nano ${esc(d.file)}</code>. El dag processor lo vuelve a analizar solo.</p>`;
    } else if (tab === 'details') {
      const s = A().st();
      const filas = [['Dag ID', d.id], ['Description', d.desc || 'None'], ['File Location', d.file], ['Bundle', 'dags-folder'], ['Schedule', A().textoHorario(d)], ['Timetable', d.sched.tt || (d.sched.t === 'cron' ? 'CronTriggerTimetable' : d.sched.t === 'assets' ? 'AssetTriggeredTimetable' : d.sched.t === 'delta' ? 'DeltaTriggerTimetable' : 'NullTimetable')], ['Start Date', fecha(d.start)], ['End Date', d.end ? fecha(d.end) : 'None'], ['Catchup', String(d.catchup)], ['Is Paused', String(!!s.pausados[d.id])], ['Max Active Runs', d.max_runs], ['Max Active Tasks', d.max_tasks], ['Owners', d.owners.join(', ')], ['Tags', d.tags.join(', ') || 'None'], ['Last Parsed', fecha(d.parseado)], ['Params', `<pre class="af-pre">${esc(jsonBonito(Object.fromEntries(Object.entries(d.params).map(([k, v]) => [k, v.default]))))}</pre>`]];
      cuerpo = `<table class="af-kv">${filas.map(([k, v]) => `<tr><th>${k}</th><td>${typeof v === 'string' && v.startsWith('<pre') ? v : esc(v)}</td></tr>`).join('')}</table>`;
    }
    el.innerHTML = tabs([['overview', 'Overview', 'info'], ['runs', 'Runs', 'list'], ['tasks', 'Tasks', 'list-checks'], ['calendar', 'Calendar', 'calendar-days'], ['backfills', 'Backfills', 'history'], ['events', 'Audit Log', 'activity'], ['code', 'Code', 'file-code'], ['details', 'Details', 'info']], tab, base) + `<div class="af-tab-b">${cuerpo}</div>`;
    const fe = el.querySelector('#afFE'); if (fe) { fe.addEventListener('change', () => { location.hash = conQ(rutaDag(d), { tab: 'runs', state: fe.value, run_type: el.querySelector('#afFT').value }); }); el.querySelector('#afFT').addEventListener('change', () => fe.dispatchEvent(new Event('change'))); }
    const bf = el.querySelector('#afBfN'); if (bf) bf.addEventListener('click', () => U.trigger(d.id, 'backfill'));
    const cp = el.querySelector('#afCopiar'); if (cp) cp.addEventListener('click', () => _.copiarTexto(fuente(d)));
  };
  function mdMini(t) {
    return String(t).trim().split(/\n\s*\n/).map((b) => {
      let x = esc(b.trim()).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`(.+?)`/g, '<code>$1</code>');
      const h = x.match(/^(#{1,4})\s+(.*)$/); if (h) return `<h${h[1].length + 2}>${h[2]}</h${h[1].length + 2}>`;
      return `<p>${x.replace(/\n/g, ' ')}</p>`;
    }).join('');
  }
  function eventos(filtro) {
    const ev = A().st().eventos.filter(filtro);
    return tabla(['When', 'Event', 'Dag ID', 'Run ID', 'Task ID', 'User', 'Extra'], ev.slice(0, 120).map((e) => [fecha(e.cuando), `<code>${esc(e.evento)}</code>`, e.dag ? `<a href="${href('dags/' + enc(e.dag))}">${esc(e.dag)}</a>` : '', esc(e.run || ''), esc(e.task || ''), esc(e.usuario), `<span class="af-dim">${esc(e.extra || '')}</span>`]), 'No events found');
  }

  // ------------------------------------------------------------------ corrida
  P.corrida = (el, d, r) => {
    const tab = q().get('tab') || 'tis';
    const base = (t) => conQ(rutaRun(d, r), { tab: t === 'tis' ? '' : t });
    let cuerpo = '';
    if (tab === 'tis') cuerpo = tabla(['Task ID', 'State', 'Start Date', 'End Date', 'Duration', 'Try Number', 'Operator'], d.tasks.map((t) => { const ti = r.tis[t.id] || {}; return [`<a href="${href(rutaTI(d, r, t.id))}">${esc(t.id)}</a>`, badge(ti.state), fecha(ti.inicio), fecha(ti.fin), duracion(ti.inicio, ti.fin), ti.try || 0, esc(t.op)]; }));
    else if (tab === 'assets') { const ev = A().st().assetEv.filter((e) => e.run === r.run_id && e.dag === d.id); cuerpo = (r.disparo ? `<p class="af-dim">Esta corrida la disparó la actualización de: ${r.disparo.map((u) => `<a href="${href('assets/' + enc(u))}">${esc(u)}</a>`).join(', ')}</p>` : '') + tabla(['Asset', 'Task', 'Timestamp'], ev.map((e) => [`<a href="${href('assets/' + enc(e.uri))}">${esc(e.uri)}</a>`, esc(e.task || ''), fecha(e.cuando)]), 'No asset events'); }
    else if (tab === 'events') cuerpo = eventos((e) => e.dag === d.id && e.run === r.run_id);
    else if (tab === 'code') cuerpo = codigo(fuente(d));
    else if (tab === 'details') cuerpo = `<table class="af-kv">${[['Run ID', r.run_id], ['State', r.state], ['Run Type', r.tipo], ['Logical Date', fecha(r.logical)], ['Queued At', fecha(r.creado)], ['Start Date', fecha(r.inicio)], ['End Date', fecha(r.fin)], ['Duration', duracion(r.inicio, r.fin)], ['Clear Number', (r.intento || 1) - 1], ['Backfill ID', r.backfill || 'None'], ['Note', r.nota || '']].map(([k, v]) => `<tr><th>${k}</th><td>${esc(v)}</td></tr>`).join('')}<tr><th>Conf</th><td><pre class="af-pre">${esc(jsonBonito(r.conf))}</pre></td></tr></table>${r.error ? `<pre class="af-tb">${esc(r.error)}</pre>` : ''}`;
    el.innerHTML = `<div class="af-rh"><div class="af-rh-t">${ic(tipoRun(r.tipo)[0], '', 18)}<h2>${esc(r.run_id)}</h2>${badge(r.state)}<span class="af-sp"></span>
        <button class="af-btn" id="afClearRun">${ic('rotate-ccw', '', 14)} Clear Run</button>
        <div class="af-dd"><button class="af-btn" id="afMarkRun">Mark Run as ${ic('chevron-down', '', 14)}</button><div class="af-dd-m" hidden><button data-m="success">${punto('success')} success</button><button data-m="failed">${punto('failed')} failed</button></div></div></div>
      <div class="af-dh-s"><div><span>Run Type</span><b>${tipoRun(r.tipo)[1]}</b></div><div><span>Start</span><b>${fecha(r.inicio) || '—'}</b></div><div><span>End</span><b>${fecha(r.fin) || '—'}</b></div><div><span>Duration</span><b>${duracion(r.inicio, r.fin) || '—'}</b></div><div><span>Logical Date</span><b>${fecha(r.logical)}</b></div></div>
      ${r.state === 'queued' && A().st().pausados[d.id] ? `<div class="af-aviso">${ic('pause', '', 14)} El Dag está pausado: esta corrida queda en <b>queued</b> hasta que lo despauses.</div>` : ''}
      ${r.nota ? `<div class="af-nota-run">${ic('pencil', '', 14)} ${esc(r.nota)}</div>` : ''}</div>`
      + tabs([['tis', 'Task Instances', 'list-checks'], ['assets', 'Asset Events', 'database'], ['events', 'Audit Log', 'activity'], ['code', 'Code', 'file-code'], ['details', 'Details', 'info']], tab, base) + `<div class="af-tab-b">${cuerpo}</div>`;
    el.querySelector('#afClearRun').addEventListener('click', () => modalClear(d, r, null));
    menuMarcar(el, '#afMarkRun', (est) => { A().marcar(d.id, r.run_id, est); toast(`Corrida marcada como ${est}`); });
  };
  function menuMarcar(el, sel, fn) {
    const b = el.querySelector(sel); const m = b.nextElementSibling;
    b.addEventListener('click', (e) => { e.stopPropagation(); m.hidden = !m.hidden; });
    m.querySelectorAll('[data-m]').forEach((x) => x.addEventListener('click', () => { m.hidden = true; fn(x.dataset.m); }));
    document.addEventListener('click', () => { m.hidden = true; }, { once: true });
  }
  function modalClear(d, r, tarea) {
    const fallidas = Object.entries(r.tis).filter(([, t]) => ['failed', 'upstream_failed'].includes(t.state)).map(([k]) => k);
    const afectadas = (o) => {
      if (!tarea) return o.solo ? fallidas : d.tasks.map((t) => t.id);
      const set = new Set([tarea]); const ir = (dir) => { const pend = [tarea]; while (pend.length) { const t = tareaDe(d, pend.pop()); if (t) for (const x of t[dir]) if (!set.has(x)) { set.add(x); pend.push(x); } } };
      if (o.abajo) ir('down'); if (o.arriba) ir('up'); return [...set];
    };
    const m = modal(tarea ? `Clear Task Instance: ${esc(tarea)}` : `Clear Dag Run: ${esc(r.run_id)}`,
      `${tarea ? `<div class="af-checks"><label><input type="checkbox" id="afCU"> Upstream</label><label><input type="checkbox" id="afCD" checked> Downstream</label><label class="af-dim"><input type="checkbox" disabled> Past</label><label class="af-dim"><input type="checkbox" disabled> Future</label></div>` : `<div class="af-checks"><label><input type="checkbox" id="afCF" ${fallidas.length ? '' : 'disabled'}> Only failed tasks</label></div>`}
      <p>Task instances que se van a limpiar y volver a ejecutar:</p><div id="afCList" class="af-clist"></div>
      <p class="af-dim">Limpiar (clear) borra el estado de esas instancias: el scheduler las vuelve a encolar y cuentan un intento nuevo. Así se reintenta una tarea después de arreglar el código o los datos.</p>`,
      `<button class="af-btn" data-c>Cancel</button><button class="af-btn af-btn-p" id="afCOk">${ic('rotate-ccw', '', 14)} Confirm</button>`);
    const opts = () => ({ solo: m.querySelector('#afCF') && m.querySelector('#afCF').checked, abajo: m.querySelector('#afCD') && m.querySelector('#afCD').checked, arriba: m.querySelector('#afCU') && m.querySelector('#afCU').checked });
    const pintar = () => { m.querySelector('#afCList').innerHTML = afectadas(opts()).map((t) => `<span>${punto((r.tis[t] || {}).state)} ${esc(t)}</span>`).join('') || '<span class="af-dim">ninguna</span>'; };
    m.querySelectorAll('input').forEach((i) => i.addEventListener('change', pintar)); pintar();
    m.querySelector('[data-c]').addEventListener('click', cerrarModal);
    m.querySelector('#afCOk').addEventListener('click', () => {
      const o = opts();
      A().parsear().then(() => {
        try { A().limpiarRun(d.id, r.run_id, tarea ? { tarea, abajo: o.abajo, arriba: o.arriba } : { soloFallidas: o.solo }); toast(A().st().pausados[d.id] ? 'Limpiadas: quedan en cola hasta que despauses el Dag' : 'Limpiadas: el scheduler las vuelve a ejecutar'); } catch (e) { toast(e.message); }
      });
      cerrarModal();
    });
  }

  // ------------------------------------------------------------------ instancia de tarea
  P.instancia = (el, d, r, tid) => {
    const t = tareaDe(d, tid);
    if (!t) { el.innerHTML = `<div class="af-vacio">La tarea ${esc(tid)} no existe en la versión actual del Dag.</div>`; return; }
    const ti = r.tis[tid] || {};
    const tab = q().get('tab') || 'logs';
    const base = (x) => conQ(rutaTI(d, r, tid), { tab: x === 'logs' ? '' : x });
    let cuerpo = '';
    if (tab === 'logs') cuerpo = logs(d, r, t, ti);
    else if (tab === 'rendered') { const rd = ti.rend || {}; cuerpo = Object.keys(t.campos).length || Object.keys(rd).length ? `<table class="af-kv">${Object.keys(Object.assign({}, t.campos, rd)).map((k) => `<tr><th>${esc(k)}</th><td><pre class="af-pre">${esc(rd[k] !== undefined ? (typeof rd[k] === 'string' ? rd[k] : repr(rd[k])) : (typeof t.campos[k] === 'string' ? t.campos[k] : repr(t.campos[k])))}</pre></td></tr>`).join('')}</table><p class="af-dim">Los <i>template fields</i> se renderizan con Jinja justo antes de ejecutar: <code>{{ ds }}</code> pasa a ser la fecha lógica de la corrida.</p>` : '<div class="af-vacio">Este operador no tiene template fields.</div>'; }
    else if (tab === 'xcom') { const x = ti.xcom || {}; cuerpo = tabla(['Key', 'Value', 'Map Index'], Object.entries(x).map(([k, v]) => [`<code>${esc(k)}</code>`, `<pre class="af-pre">${esc(repr(v))}</pre>`, -1]), 'No XComs found') + '<p class="af-dim">Lo que devuelve una tarea se guarda como XCom <code>return_value</code>, y la tarea siguiente lo recibe (TaskFlow) o lo lee con <code>ti.xcom_pull()</code>.</p>'; }
    else if (tab === 'assets') { const ev = A().st().assetEv.filter((e) => e.run === r.run_id && e.task === tid); cuerpo = tabla(['Asset', 'Timestamp'], ev.map((e) => [`<a href="${href('assets/' + enc(e.uri))}">${esc(e.uri)}</a>`, fecha(e.cuando)]), t.outlets.length ? 'Todavía no produjo eventos' : 'Esta tarea no declara outlets'); }
    else if (tab === 'events') cuerpo = eventos((e) => e.dag === d.id && e.run === r.run_id && (!e.task || e.task === tid));
    else if (tab === 'code') cuerpo = codigo(fuente(d), lineaDe(fuente(d), t));
    else if (tab === 'details') cuerpo = `<table class="af-kv">${[['Task ID', t.id], ['Dag ID', d.id], ['Run ID', r.run_id], ['State', ti.state || 'None'], ['Operator', t.op], ['Try Number', ti.try || 0], ['Max Tries', t.retries + 1], ['Retry Delay', t.retry_delay || 'None'], ['Execution Timeout', t.timeout || 'None'], ['Trigger Rule', t.tr], ['Pool', t.pool], ['Owner', t.owner], ['Hostname', ti.host || ''], ['PID', ti.pid || ''], ['Start Date', fecha(ti.inicio)], ['End Date', fecha(ti.fin)], ['Duration', duracion(ti.inicio, ti.fin)], ['Upstream', t.up.join(', ') || 'None'], ['Downstream', t.down.join(', ') || 'None'], ['Outlets', t.outlets.join(', ') || 'None']].map(([k, v]) => `<tr><th>${k}</th><td>${esc(v)}</td></tr>`).join('')}</table>`;
    el.innerHTML = `<div class="af-rh"><div class="af-rh-t">${ic('list-checks', '', 18)}<h2>${esc(tid)}</h2>${badge(ti.state)}<span class="af-dim">${esc(t.op)}</span><span class="af-sp"></span>
        <button class="af-btn" id="afClearTI">${ic('rotate-ccw', '', 14)} Clear</button>
        <div class="af-dd"><button class="af-btn" id="afMarkTI">Mark as ${ic('chevron-down', '', 14)}</button><div class="af-dd-m" hidden><button data-m="success">${punto('success')} success</button><button data-m="failed">${punto('failed')} failed</button><button data-m="skipped">${punto('skipped')} skipped</button></div></div></div>
      <div class="af-dh-s"><div><span>Run</span><b><a href="${href(rutaRun(d, r))}">${esc(r.run_id)}</a></b></div><div><span>Start</span><b>${fecha(ti.inicio) || '—'}</b></div><div><span>Duration</span><b>${duracion(ti.inicio, ti.fin) || '—'}</b></div><div><span>Try Number</span><b>${ti.try || 0}</b></div></div></div>`
      + tabs([['logs', 'Logs', 'file-text'], ['rendered', 'Rendered Templates', 'braces'], ['xcom', 'XCom', 'braces'], ['assets', 'Asset Events', 'database'], ['events', 'Audit Log', 'activity'], ['code', 'Code', 'file-code'], ['details', 'Details', 'info']], tab, base) + `<div class="af-tab-b">${cuerpo}</div>`;
    el.querySelector('#afClearTI').addEventListener('click', () => modalClear(d, r, tid));
    menuMarcar(el, '#afMarkTI', (est) => { A().marcar(d.id, r.run_id, est, tid); toast(`${tid} marcada como ${est}`); });
    accionesLog(el, d, r, t, ti);
  };
  function lineaDe(src, t) {
    const nombre = t.callable || t.id.split('.').pop();
    const ls = src.split('\n');
    let i = ls.findIndex((l) => new RegExp(`def\\s+${nombre}\\b`).test(l)); if (i < 0) i = ls.findIndex((l) => l.includes(`"${t.id.split('.').pop()}"`));
    return i >= 0 ? i + 1 : null;
  }
  function logs(d, r, t, ti) {
    const intentos = ti.logs || [];
    if (!intentos.length) return `<div class="af-vacio">${ti.state === 'running' || ti.state === 'queued' || ti.state === 'scheduled' ? `${ic('refresh-cw', 'af-gira', 16)} La tarea está en <b>${ti.state}</b>: el log aparece cuando arranca.` : ti.state === 'upstream_failed' ? 'La tarea no corrió porque falló una tarea anterior (<b>upstream_failed</b>): mira el log de esa tarea.' : ti.state === 'skipped' ? 'La tarea se salteó (<b>skipped</b>): no se ejecutó, así que no tiene log.' : 'Todavía no hay logs para esta instancia.'}</div>`;
    const n = Number(q().get('intento') || intentos[intentos.length - 1].intento);
    const L = (intentos.find((x) => x.intento === n) || intentos[intentos.length - 1]).lineas;
    const nivel = q().get('nivel') || '';
    const wrap = q().get('wrap') !== '0';
    const fuentes = [...new Set(L.map((l) => l.fuente))];
    const fmtTs = (ts) => fecha(ts).replace(' UTC', '');
    const filas = L.filter((l) => !nivel || l.nivel === nivel).map((l) => l.tb ? `<div class="af-ll af-ll-err"><pre>${esc(l.msg)}</pre></div>` : `<div class="af-ll af-ll-${l.nivel.toLowerCase()}"><span class="af-lts">[${fmtTs(l.ts)}]</span> <span class="af-llv">${l.nivel}</span> - ${esc(l.msg)} <span class="af-lsrc">source=${esc(l.fuente)}</span></div>`).join('');
    return `<div class="af-logbar">${intentos.length > 1 || ti.try > 1 ? `<span class="af-dim">Attempts</span><span class="af-seg">${intentos.map((x) => `<a class="${x.intento === n ? 'sel' : ''}" href="${conQ(rutaTI(d, r, t.id), { intento: String(x.intento), nivel, wrap: wrap ? '' : '0' })}">${punto(x.lineas.some((l) => l.nivel === 'ERROR') ? 'failed' : 'success')}${x.intento}</a>`).join('')}</span>` : ''}
        <select class="af-sel" id="afNivel" aria-label="Log level"><option value="">All Levels</option>${['INFO', 'WARNING', 'ERROR'].map((x) => `<option ${x === nivel ? 'selected' : ''}>${x}</option>`).join('')}</select>
        <span class="af-sp"></span><a class="af-btn af-btn-s ${wrap ? 'sel' : ''}" href="${conQ(rutaTI(d, r, t.id), { intento: q().get('intento') || '', nivel, wrap: wrap ? '0' : '' })}">${ic('wrap-text', '', 14)} Wrap</a><button class="af-btn af-btn-s" id="afLogDl">${ic('download', '', 14)} Download</button><button class="af-btn af-btn-s" id="afLogFs">${ic('maximize-2', '', 14)}</button></div>
      <div class="af-log ${wrap ? 'af-wrap' : ''}" id="afLog"><details class="af-lgrp"><summary>Log message source details</summary>${fuentes.map((f) => `<div class="af-dim">${esc(f)}</div>`).join('')}</details><div class="af-log-b">${filas}</div></div>`;
  }
  function accionesLog(el, d, r, t, ti) {
    const nv = el.querySelector('#afNivel'); if (nv) nv.addEventListener('change', () => { location.hash = conQ(rutaTI(d, r, t.id), { intento: q().get('intento') || '', nivel: nv.value, wrap: q().get('wrap') || '' }); });
    const dl = el.querySelector('#afLogDl'); if (dl) dl.addEventListener('click', () => {
      const n = Number(q().get('intento') || ti.logs[ti.logs.length - 1].intento); const L = (ti.logs.find((x) => x.intento === n) || ti.logs[ti.logs.length - 1]).lineas;
      const txt = L.map((l) => l.tb ? l.msg : `[${l.ts}] {${l.fuente}} ${l.nivel} - ${l.msg}`).join('\n');
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'text/plain' })); a.download = `dag_id=${d.id}_run_id=${r.run_id}_task_id=${t.id}_attempt=${n}.log`; a.click();
    });
    const fs = el.querySelector('#afLogFs'); if (fs) fs.addEventListener('click', () => { const lg = el.querySelector('#afLog'); lg.classList.toggle('af-log-fs'); });
  }

  // ------------------------------------------------------------------ todas las instancias de una tarea
  P.tarea = (el, d, tid) => {
    const t = tareaDe(d, tid);
    if (!t) { el.innerHTML = `<div class="af-vacio">La tarea ${esc(tid)} no existe.</div>`; return; }
    const rs = A().runs(d.id);
    el.innerHTML = `<div class="af-rh"><div class="af-rh-t">${ic('list-checks', '', 18)}<h2>${esc(t.id)}</h2><span class="af-dim">${esc(t.op)}</span></div>
      <div class="af-dh-s"><div><span>Trigger Rule</span><b>${esc(t.tr)}</b></div><div><span>Retries</span><b>${t.retries}</b></div><div><span>Upstream</span><b>${esc(t.up.join(', ') || '—')}</b></div><div><span>Downstream</span><b>${esc(t.down.join(', ') || '—')}</b></div></div></div>`
      + `<div class="af-tab-b">${tabla(['Run ID', 'State', 'Start Date', 'Duration', 'Try Number'], rs.map((r) => { const ti = r.tis[tid] || {}; return [`<a href="${href(rutaTI(d, r, tid))}">${esc(r.run_id)}</a>`, badge(ti.state), fecha(ti.inicio), duracion(ti.inicio, ti.fin), ti.try || 0]; }), 'Todavía no hay instancias de esta tarea')}
      ${t.doc ? `<section class="af-card af-doc"><h3>Task Docs</h3>${mdMini(t.doc)}</section>` : ''}<h3 class="af-h3">Código</h3>${codigo(fuente(d), lineaDe(fuente(d), t))}</div>`;
  };

  // ------------------------------------------------------------------ Trigger y Backfill
  U.trigger = (id, modo) => {
    const d = A().dag(id); if (!d) return;
    const s = A().st(); const temporal = d.sched.t === 'cron' || d.sched.t === 'delta';
    let m = modo === 'backfill' && temporal ? 'backfill' : 'single';
    const paramsForm = Object.entries(d.params).map(([k, p]) => {
      const v = p.default;
      const campo = p.enum ? `<select class="af-sel" data-p="${esc(k)}">${p.enum.map((o) => `<option ${o === v ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`
        : typeof v === 'boolean' || p.type === 'boolean' ? `<input type="checkbox" data-p="${esc(k)}" data-t="bool" ${v ? 'checked' : ''}>`
          : `<input class="af-in" data-p="${esc(k)}" data-t="${typeof v === 'number' || p.type === 'integer' || p.type === 'number' ? 'num' : typeof v === 'object' && v !== null ? 'json' : 'str'}" value="${esc(typeof v === 'object' && v !== null ? JSON.stringify(v) : v == null ? '' : v)}">`;
      return `<label class="af-campo"><span>${esc(p.title || k)}</span>${campo}${p.desc ? `<small class="af-dim">${esc(p.desc)}</small>` : ''}</label>`;
    }).join('');
    const ahora = new Date(); const local = (x) => x.toISOString().slice(0, 16);
    const ini = new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), ahora.getUTCDate() - 7));
    const mm = modal(`Trigger Dag - ${esc(id)}`, `
      <div class="af-seg af-seg-l"><button data-modo="single" class="${m === 'single' ? 'sel' : ''}">Single Run</button><button data-modo="backfill" class="${m === 'backfill' ? 'sel' : ''}" ${temporal ? '' : 'disabled title="Solo para Dags con un horario de tiempo"'}>Backfill</button></div>
      <div id="afTS" ${m === 'single' ? '' : 'hidden'}>
        ${paramsForm ? `<h4>Run Parameters</h4><div class="af-form">${paramsForm}</div>` : ''}
        <details class="af-adv" ${paramsForm ? '' : 'open'}><summary>Advanced Options</summary>
          <label class="af-campo"><span>Logical Date</span><input class="af-in" type="datetime-local" id="afTLd" value="${local(ahora)}"><small class="af-dim">UTC. Es la fecha "de los datos" que procesa la corrida: llega a las tareas como {{ ds }}.</small></label>
          <label class="af-campo"><span>Run ID</span><input class="af-in" id="afTRid" placeholder="Run Id, opcional: se genera si se deja vacío"></label>
          <label class="af-campo"><span>Configuration JSON</span><textarea class="af-in af-mono" id="afTConf" rows="5">${esc(JSON.stringify(Object.fromEntries(Object.entries(d.params).map(([k, p]) => [k, p.default])), null, 2))}</textarea><small class="af-dim">Se guarda en dag_run.conf y pisa los params con el mismo nombre.</small></label>
          <label class="af-campo"><span>Dag Run Notes</span><textarea class="af-in" id="afTNota" rows="2"></textarea></label>
        </details>
      </div>
      <div id="afTB" ${m === 'backfill' ? '' : 'hidden'}>
        <div class="af-form2"><label class="af-campo"><span>From</span><input class="af-in" type="datetime-local" id="afBD" value="${local(ini)}"></label><label class="af-campo"><span>To</span><input class="af-in" type="datetime-local" id="afBH" value="${local(ahora)}"></label></div>
        <div class="af-campo"><span>Reprocess Behaviour</span><div class="af-radios">${[['none', 'Missing Runs'], ['failed', 'Missing and Errored Runs'], ['completed', 'All Runs']].map(([v, t], i) => `<label><input type="radio" name="afRB" value="${v}" ${i === 0 ? 'checked' : ''}> ${t}</label>`).join('')}</div></div>
        <label class="af-check"><input type="checkbox" id="afBR"> Run Backwards</label>
        <div class="af-aviso" id="afBN"></div>
      </div>
      ${s.pausados[id] ? `<label class="af-check"><input type="checkbox" id="afUnp" checked> Unpause ${esc(id)} on trigger</label>` : ''}
      <div class="af-err" id="afTErr" hidden></div>`, `<button class="af-btn" data-c>Cancel</button><button class="af-btn af-btn-p" id="afTOk">${ic('play', '', 14)} ${m === 'single' ? 'Trigger' : 'Run Backfill'}</button>`, { ancho: true });
    const err = (t) => { const e = mm.querySelector('#afTErr'); e.hidden = !t; e.textContent = t || ''; };
    const contar = () => { try { const n = A().fechasEntre(d, new Date(mm.querySelector('#afBD').value + 'Z'), new Date(mm.querySelector('#afBH').value + 'Z')).length; mm.querySelector('#afBN').innerHTML = `${ic('info', '', 14)} ${n} run${n === 1 ? '' : 's'} will be triggered`; } catch (e) { /* fecha inválida */ } };
    mm.querySelectorAll('[data-modo]').forEach((b) => b.addEventListener('click', () => { m = b.dataset.modo; mm.querySelectorAll('[data-modo]').forEach((x) => x.classList.toggle('sel', x === b)); mm.querySelector('#afTS').hidden = m !== 'single'; mm.querySelector('#afTB').hidden = m !== 'backfill'; mm.querySelector('#afTOk').innerHTML = `${ic('play', '', 14)} ${m === 'single' ? 'Trigger' : 'Run Backfill'}`; if (m === 'backfill') contar(); }));
    if (temporal) { mm.querySelector('#afBD').addEventListener('change', contar); mm.querySelector('#afBH').addEventListener('change', contar); if (m === 'backfill') contar(); }
    // los campos de Run Parameters escriben en el JSON
    mm.querySelectorAll('[data-p]').forEach((i) => i.addEventListener('input', () => {
      try { const c = JSON.parse(mm.querySelector('#afTConf').value || '{}'); const k = i.dataset.p; c[k] = i.dataset.t === 'bool' ? i.checked : i.dataset.t === 'num' ? Number(i.value) : i.dataset.t === 'json' ? JSON.parse(i.value) : i.value; mm.querySelector('#afTConf').value = JSON.stringify(c, null, 2); err(''); } catch (e) { err('El valor no es JSON válido'); }
    }));
    mm.querySelector('[data-c]').addEventListener('click', cerrarModal);
    mm.querySelector('#afTOk').addEventListener('click', () => {
      const unp = mm.querySelector('#afUnp'); const despausar = unp ? unp.checked : false;
      try {
        if (m === 'single') {
          let conf; try { conf = JSON.parse(mm.querySelector('#afTConf').value || '{}'); } catch (e) { return err('Configuration JSON: ' + e.message); }
          if (typeof conf !== 'object' || Array.isArray(conf) || conf === null) return err('Configuration JSON debe ser un objeto { }');
          const ld = mm.querySelector('#afTLd').value;
          const r = A().disparar(id, { conf, logical: ld ? new Date(ld + 'Z').toISOString() : undefined, runId: mm.querySelector('#afTRid').value.trim() || undefined, nota: mm.querySelector('#afTNota').value.trim(), despausar });
          cerrarModal(); toast(despausar || !s.pausados[id] ? `Dag run ${r.run_id} creado` : `Dag run creado en queued: ${id} está pausado`);
          location.hash = href(rutaRun(d, r));
        } else {
          if (despausar) A().pausar(id, false, true);
          const rb = mm.querySelector('[name=afRB]:checked').value;
          const b = A().backfill(id, mm.querySelector('#afBD').value + 'Z', mm.querySelector('#afBH').value + 'Z', { reproceso: rb, reverso: mm.querySelector('#afBR').checked });
          cerrarModal(); toast(`Backfill ${b.id}: ${b.runs.length} corridas`);
          location.hash = conQ(rutaDag(d), { tab: 'backfills' });
        }
      } catch (e) { err(e.message); }
    });
  };

  // ------------------------------------------------------------------ Assets
  P.assets = (el, sub) => {
    const b = A().bolsa(); const s = A().st();
    const todos = {};
    const add = (u) => todos[u] || (todos[u] = { uri: u, prod: [], cons: [] });
    for (const d of b.dags) { for (const t of d.tasks) for (const u of t.outlets) add(u).prod.push([d.id, t.id]); if (d.sched.t === 'assets') for (const u of d.sched.assets) add(u).cons.push(d.id); }
    for (const e of s.assetEv) add(e.uri);
    if (sub[0]) {
      const uri = decodeURIComponent(sub.join('/')); const a = todos[uri] || add(uri);
      const ev = s.assetEv.filter((e) => e.uri === uri);
      el.innerHTML = `<nav class="af-migas"><a href="${href('assets')}">Assets</a><span class="af-dim">/</span><span>${esc(uri)}</span></nav>
        <div class="af-rh"><div class="af-rh-t">${ic('database', '', 20)}<h1 class="af-h1">${esc(uri)}</h1><span class="af-sp"></span><button class="af-btn" id="afAEv">${ic('plus', '', 14)} Create Asset Event</button></div></div>
        <div class="af-assetg"><div class="af-card"><h3>Producing Tasks</h3>${a.prod.map(([dd, t]) => `<div><a href="${href('dags/' + enc(dd))}">${esc(dd)}</a>.${esc(t)}</div>`).join('') || '<div class="af-dim">Ninguna</div>'}</div><div class="af-flecha">${ic('chevron-right', '', 24)}</div><div class="af-card af-card-a">${ic('database', '', 18)} <b>${esc(uri)}</b></div><div class="af-flecha">${ic('chevron-right', '', 24)}</div><div class="af-card"><h3>Scheduled Dags</h3>${a.cons.map((dd) => `<div><a href="${href('dags/' + enc(dd))}">${esc(dd)}</a>${s.pausados[dd] ? ' <span class="af-dim">(paused)</span>' : ''}</div>`).join('') || '<div class="af-dim">Ninguno</div>'}</div></div>
        <h3 class="af-h3">Asset Events</h3>${tabla(['Timestamp', 'Source', 'Triggered Dag Runs', 'Extra'], ev.map((e) => [fecha(e.cuando), e.dag ? `<a href="${href('dags/' + enc(e.dag) + '/runs/' + enc(e.run) + '/tasks/' + enc(e.task || ''))}">${esc(e.dag)}.${esc(e.task || '')}</a>` : esc(e.origen), triggered(e), `<code>${esc(JSON.stringify(e.extra))}</code>`]), 'No asset events')}`;
      el.querySelector('#afAEv').addEventListener('click', () => {
        const mm = modal(`Create Asset Event`, `<p>Registra a mano un evento de <b>${esc(uri)}</b>, como si un sistema externo avisara que el dato se actualizó (en Airflow: <i>Create Asset Event</i> o la API REST).</p><label class="af-campo"><span>Extra (JSON)</span><textarea class="af-in af-mono" id="afAEx" rows="3">{}</textarea></label><div class="af-err" id="afAEr" hidden></div>`, `<button class="af-btn" data-c>Cancel</button><button class="af-btn af-btn-p" id="afAOk">Create Event</button>`);
        mm.querySelector('[data-c]').addEventListener('click', cerrarModal);
        mm.querySelector('#afAOk').addEventListener('click', () => { let ex; try { ex = JSON.parse(mm.querySelector('#afAEx').value || '{}'); } catch (e) { const r = mm.querySelector('#afAEr'); r.hidden = false; r.textContent = e.message; return; } A().registrarAsset(uri, { extra: ex, origen: 'manual (UI)' }); A().revisarAssets(); cerrarModal(); toast('Evento creado: los Dags programados por este asset se disparan si están activos'); });
      });
      return;
    }
    const lista = Object.values(todos).sort((x, y) => x.uri.localeCompare(y.uri));
    el.innerHTML = `<div class="af-titulo"><h1 class="af-h1">${lista.length} Assets</h1></div><p class="af-dim">Un <b>asset</b> es un dato (tabla, archivo) que una tarea produce (<code>outlets=[...]</code>) y que otros Dags esperan (<code>schedule=[Asset(...)]</code>): así se programa "cuando el dato esté listo" en vez de "a las 6".</p>`
      + tabla(['Name', 'Last Asset Event', 'Group', 'Producing Tasks', 'Scheduled Dags'], lista.map((a) => { const e = s.assetEv.find((x) => x.uri === a.uri); return [`<a href="${href('assets/' + enc(a.uri))}">${ic('database', '', 12)} ${esc(a.uri)}</a>`, e ? fecha(e.cuando) : '', 'asset', a.prod.map(([d, t]) => `${esc(d)}.${esc(t)}`).join('<br>'), a.cons.map((d) => `<a href="${href('dags/' + enc(d))}">${esc(d)}</a>`).join(', ')]; }), 'No assets found');
  };
  function triggered(e) {
    const out = [];
    for (const [id, rs] of Object.entries(A().st().runs)) for (const r of rs) if (r.tipo === 'asset_triggered' && (r.disparo || []).includes(e.uri) && Math.abs(new Date(r.creado) - new Date(e.cuando)) < 60000) out.push(`<a href="${href('dags/' + enc(id) + '/runs/' + enc(r.run_id))}">${esc(id)}</a>`);
    return out.join(', ');
  }

  // ------------------------------------------------------------------ Browse
  P.dag_runs = (el) => {
    const rs = _.todasLasRuns(); const fe = q().get('state') || '';
    el.innerHTML = `<div class="af-titulo"><h1 class="af-h1">Dag Runs</h1></div><div class="af-filtros"><span class="af-seg">${[['', 'All'], ['running', 'Running'], ['success', 'Success'], ['failed', 'Failed'], ['queued', 'Queued']].map(([v, t]) => `<a class="${fe === v ? 'sel' : ''}" href="${href('dag_runs', v ? { state: v } : null)}">${t}</a>`).join('')}</span></div>`
      + tabla(['Dag ID', 'Run ID', 'State', 'Run Type', 'Logical Date', 'Start Date', 'Duration'], rs.filter((r) => !fe || r.state === fe).map((r) => [`<a href="${href('dags/' + enc(r.dag_id))}">${esc(r.dag_id)}</a>`, `<a href="${href('dags/' + enc(r.dag_id) + '/runs/' + enc(r.run_id))}">${esc(r.run_id)}</a>`, badge(r.state), tipoRun(r.tipo)[1], fecha(r.logical), fecha(r.inicio), duracion(r.inicio, r.fin)]), 'No Dag Runs found');
  };
  P.task_instances = (el) => {
    const fe = q().get('state') || ''; const fd = q().get('dag_id') || '';
    const filas = [];
    for (const r of _.todasLasRuns()) for (const [tid, ti] of Object.entries(r.tis)) if ((!fe || ti.state === fe) && (!fd || r.dag_id === fd) && ti.state) filas.push([`<a href="${href('dags/' + enc(r.dag_id))}">${esc(r.dag_id)}</a>`, `<a href="${href('dags/' + enc(r.dag_id) + '/runs/' + enc(r.run_id) + '/tasks/' + enc(tid))}">${esc(tid)}</a>`, esc(r.run_id), badge(ti.state), fecha(ti.inicio), duracion(ti.inicio, ti.fin), ti.try || 0]);
    el.innerHTML = `<div class="af-titulo"><h1 class="af-h1">Task Instances</h1>${fd ? `<span class="af-tag">dag_id: ${esc(fd)} <a href="${href('task_instances', fe ? { state: fe } : null)}">✕</a></span>` : ''}</div><div class="af-filtros"><span class="af-seg">${[['', 'All'], ['success', 'Success'], ['failed', 'Failed'], ['upstream_failed', 'Upstream Failed'], ['skipped', 'Skipped'], ['running', 'Running']].map(([v, t]) => `<a class="${fe === v ? 'sel' : ''}" href="${href('task_instances', Object.assign(fd ? { dag_id: fd } : {}, v ? { state: v } : {}))}">${t}</a>`).join('')}</span></div>`
      + tabla(['Dag ID', 'Task ID', 'Run ID', 'State', 'Start Date', 'Duration', 'Try Number'], filas.slice(0, 200), 'No Task Instances found');
  };
  P.events = (el) => { el.innerHTML = `<div class="af-titulo"><h1 class="af-h1">Audit Log</h1></div>` + eventos(() => true); };
  P.xcoms = (el) => {
    const filas = [];
    for (const r of _.todasLasRuns()) for (const [tid, ti] of Object.entries(r.tis)) for (const [k, v] of Object.entries(ti.xcom || {})) filas.push([esc(k), `<a href="${href('dags/' + enc(r.dag_id))}">${esc(r.dag_id)}</a>`, esc(r.run_id), `<a href="${href('dags/' + enc(r.dag_id) + '/runs/' + enc(r.run_id) + '/tasks/' + enc(tid))}?tab=xcom">${esc(tid)}</a>`, -1, `<code>${esc(repr(v)).slice(0, 160)}</code>`]);
    el.innerHTML = `<div class="af-titulo"><h1 class="af-h1">XComs</h1></div><p class="af-dim">XCom ("cross-communication") guarda valores chicos que una tarea pasa a otra. No es para datos grandes: para eso escribe una tabla o un archivo y pasa su ruta.</p>` + tabla(['Key', 'Dag ID', 'Run ID', 'Task ID', 'Map Index', 'Value'], filas.slice(0, 200), 'No XComs found');
  };

  // ------------------------------------------------------------------ Admin
  P.variables = (el) => {
    const s = A().st(); const desc = s.varsDesc || {};
    const qq = (q().get('q') || '').toLowerCase();
    el.innerHTML = `<div class="af-titulo"><h1 class="af-h1">Variables</h1><span class="af-sp"></span><button class="af-btn" id="afVImp">${ic('download', '', 14)} Import Variables</button><button class="af-btn af-btn-p" id="afVAdd">${ic('plus', '', 14)} Add Variable</button></div>
      <div class="af-buscar">${ic('search', '', 16)}<input id="afVQ" type="search" placeholder="Search Keys" value="${esc(q().get('q') || '')}"></div>`
      + tabla(['Key', 'Value', 'Description', 'Is Encrypted', ''], Object.entries(s.vars).filter(([k]) => !qq || k.toLowerCase().includes(qq)).map(([k, v]) => [`<code>${esc(k)}</code>`, /secret|password|token|key|api/i.test(k) ? '***' : `<code>${esc(v)}</code>`, esc(desc[k] || ''), 'true', `<span class="af-acc"><button class="af-ib" data-ed="${esc(k)}" title="Edit">${ic('pencil')}</button><button class="af-ib" data-bo="${esc(k)}" title="Delete">${ic('trash-2')}</button></span>`]), 'No variables found')
      + `<p class="af-dim">Las variables se leen en el DAG con <code>Variable.get("clave")</code> o en plantillas con <code>{{ var.value.clave }}</code>. Los valores de claves con <i>secret</i>, <i>password</i>, <i>token</i> o <i>api</i> se ocultan. También: <code>airflow variables set clave valor</code>.</p>`;
    const editar = (k) => {
      const mm = modal(k ? 'Edit Variable' : 'Add Variable', `<label class="af-campo"><span>Key *</span><input class="af-in" id="afVK" value="${esc(k || '')}" ${k ? 'disabled' : ''}></label><label class="af-campo"><span>Value *</span><textarea class="af-in af-mono" id="afVV" rows="4">${esc(k ? s.vars[k] : '')}</textarea></label><label class="af-campo"><span>Description</span><input class="af-in" id="afVD" value="${esc(k ? desc[k] || '' : '')}"></label><div class="af-err" id="afVE" hidden></div>`, `<button class="af-btn" data-c>Cancel</button><button class="af-btn af-btn-p" id="afVOk">Save</button>`);
      mm.querySelector('[data-c]').addEventListener('click', cerrarModal);
      mm.querySelector('#afVOk').addEventListener('click', () => { const kk = mm.querySelector('#afVK').value.trim(); if (!kk) { const e = mm.querySelector('#afVE'); e.hidden = false; e.textContent = 'La clave es obligatoria'; return; } A().setVar(kk, mm.querySelector('#afVV').value, mm.querySelector('#afVD').value); cerrarModal(); toast('Variable guardada'); });
    };
    el.querySelector('#afVAdd').addEventListener('click', () => editar(null));
    el.querySelectorAll('[data-ed]').forEach((b) => b.addEventListener('click', () => editar(b.dataset.ed)));
    el.querySelectorAll('[data-bo]').forEach((b) => b.addEventListener('click', () => { if (confirm(`¿Borrar la variable ${b.dataset.bo}?`)) A().delVar(b.dataset.bo); }));
    el.querySelector('#afVImp').addEventListener('click', () => {
      const mm = modal('Import Variables', `<p>Pega un JSON de la forma <code>{"clave": "valor"}</code> (lo que exporta <code>airflow variables export</code>).</p><textarea class="af-in af-mono" id="afVJ" rows="6">{\n  "entorno": "dev"\n}</textarea><div class="af-radios"><label><input type="radio" name="afVM" value="overwrite" checked> Overwrite if exists</label><label><input type="radio" name="afVM" value="skip"> Skip if exists</label></div><div class="af-err" id="afVJE" hidden></div>`, `<button class="af-btn" data-c>Cancel</button><button class="af-btn af-btn-p" id="afVJOk">Import</button>`);
      mm.querySelector('[data-c]').addEventListener('click', cerrarModal);
      mm.querySelector('#afVJOk').addEventListener('click', () => { try { const o = JSON.parse(mm.querySelector('#afVJ').value); const skip = mm.querySelector('[name=afVM]:checked').value === 'skip'; let n = 0; for (const [k, v] of Object.entries(o)) { if (skip && k in s.vars) continue; A().setVar(k, typeof v === 'string' ? v : JSON.stringify(v)); n++; } cerrarModal(); toast(`${n} variables importadas`); } catch (e) { const r = mm.querySelector('#afVJE'); r.hidden = false; r.textContent = e.message; } });
    });
    const vq = el.querySelector('#afVQ'); vq.addEventListener('change', () => { location.hash = href('variables', vq.value ? { q: vq.value } : null); });
  };
  const TIPOS_CONN = ['postgres', 'mysql', 'mssql', 'sqlite', 'http', 'aws', 'google_cloud_platform', 'wasb', 'databricks', 'snowflake', 'fs', 'ssh', 'generic'];
  P.connections = (el) => {
    const s = A().st();
    el.innerHTML = `<div class="af-titulo"><h1 class="af-h1">Connections</h1><span class="af-sp"></span><button class="af-btn" id="afCTest" disabled title="test_connection está deshabilitado por defecto en Airflow">${ic('plug', '', 14)} Test</button><button class="af-btn af-btn-p" id="afCAdd">${ic('plus', '', 14)} Add Connection</button></div>`
      + tabla(['Connection ID', 'Connection Type', 'Description', 'Host', 'Port', ''], Object.entries(s.conns).map(([k, c]) => [`<code>${esc(k)}</code>`, esc(c.conn_type), esc(c.description || ''), esc(c.host || ''), esc(c.port || ''), `<span class="af-acc"><button class="af-ib" data-ed="${esc(k)}" title="Edit">${ic('pencil')}</button><button class="af-ib" data-bo="${esc(k)}" title="Delete">${ic('trash-2')}</button></span>`]), 'No connections found')
      + `<p class="af-dim">Una conexión guarda dónde y cómo conectarse (host, usuario, contraseña) fuera del código. Los operadores la usan por su id, por ejemplo <code>conn_id="postgres_tienda"</code>. En la práctica no hay servidores: no guardes contraseñas reales.</p>`;
    const editar = (k) => {
      const c = k ? s.conns[k] : { conn_type: 'postgres', port: '' };
      const mm = modal(k ? 'Edit Connection' : 'Add Connection', `<div class="af-form2"><label class="af-campo"><span>Connection ID *</span><input class="af-in" id="afK" value="${esc(k || '')}" ${k ? 'disabled' : ''}></label><label class="af-campo"><span>Connection Type *</span><select class="af-sel" id="afT">${TIPOS_CONN.map((t) => `<option ${t === c.conn_type ? 'selected' : ''}>${t}</option>`).join('')}</select></label></div>
        <label class="af-campo"><span>Description</span><input class="af-in" id="afDs" value="${esc(c.description || '')}"></label>
        <div class="af-form2"><label class="af-campo"><span>Host</span><input class="af-in" id="afH" value="${esc(c.host || '')}"></label><label class="af-campo"><span>Port</span><input class="af-in" id="afPo" type="number" value="${esc(c.port || '')}"></label><label class="af-campo"><span>Login</span><input class="af-in" id="afL" value="${esc(c.login || '')}"></label><label class="af-campo"><span>Password</span><input class="af-in" id="afPw" type="password" placeholder="no uses una real"></label><label class="af-campo"><span>Schema</span><input class="af-in" id="afS" value="${esc(c.schema || '')}"></label></div>
        <label class="af-campo"><span>Extra Fields JSON</span><textarea class="af-in af-mono" id="afX" rows="3">${esc(c.extra || '{}')}</textarea></label><div class="af-err" id="afCE" hidden></div>`, `<button class="af-btn" data-c>Cancel</button><button class="af-btn af-btn-p" id="afCOk2">Save</button>`, { ancho: true });
      mm.querySelector('[data-c]').addEventListener('click', cerrarModal);
      mm.querySelector('#afCOk2').addEventListener('click', () => {
        const kk = mm.querySelector('#afK').value.trim(); const er = mm.querySelector('#afCE');
        if (!kk) { er.hidden = false; er.textContent = 'Connection ID es obligatorio'; return; }
        const x = mm.querySelector('#afX').value.trim(); if (x) { try { JSON.parse(x); } catch (e) { er.hidden = false; er.textContent = 'Extra: ' + e.message; return; } }
        A().setConn(kk, { conn_type: mm.querySelector('#afT').value, description: mm.querySelector('#afDs').value, host: mm.querySelector('#afH').value, port: mm.querySelector('#afPo').value ? Number(mm.querySelector('#afPo').value) : null, login: mm.querySelector('#afL').value, password: mm.querySelector('#afPw').value ? '***' : (c.password || ''), schema: mm.querySelector('#afS').value, extra: x });
        cerrarModal(); toast('Connection guardada');
      });
    };
    el.querySelector('#afCAdd').addEventListener('click', () => editar(null));
    el.querySelectorAll('[data-ed]').forEach((b) => b.addEventListener('click', () => editar(b.dataset.ed)));
    el.querySelectorAll('[data-bo]').forEach((b) => b.addEventListener('click', () => { if (confirm(`¿Borrar la conexión ${b.dataset.bo}?`)) A().delConn(b.dataset.bo); }));
  };
  P.pools = (el) => {
    const s = A().st(); const corriendo = _.todasLasRuns().flatMap((r) => Object.values(r.tis)).filter((t) => t.state === 'running').length;
    el.innerHTML = `<div class="af-titulo"><h1 class="af-h1">Pools</h1><span class="af-sp"></span><button class="af-btn af-btn-p" id="afPAdd">${ic('plus', '', 14)} Add Pool</button></div>
      <div class="af-tarjetas">${Object.entries(s.pools).map(([k, p]) => `<div class="af-card"><div class="af-card-h"><h3>${esc(k)}</h3><span class="af-dim">${p.slots} slots</span>${k !== 'default_pool' ? `<button class="af-ib" data-bo="${esc(k)}" title="Delete">${ic('trash-2')}</button>` : ''}</div><div class="af-hbar"><span class="af-s-running" style="width:${k === 'default_pool' ? Math.min(100, corriendo / p.slots * 100) : 0}%"></span><span class="af-s-none" style="width:100%"></span></div><div class="af-hleg"><span>${punto('running')} running ${k === 'default_pool' ? corriendo : 0}</span><span>${punto('none')} open ${p.slots - (k === 'default_pool' ? corriendo : 0)}</span></div><div class="af-dim">${esc(p.desc || '')}</div></div>`).join('')}</div>
      <p class="af-dim">Un pool limita cuántas tareas corren a la vez contra un recurso (por ejemplo, una base que aguanta 5 conexiones): <code>BashOperator(..., pool="base_tienda")</code>.</p>`;
    el.querySelector('#afPAdd').addEventListener('click', () => {
      const mm = modal('Add Pool', `<label class="af-campo"><span>Name *</span><input class="af-in" id="afPN"></label><label class="af-campo"><span>Slots *</span><input class="af-in" id="afPS" type="number" value="5" min="1"></label><label class="af-campo"><span>Description</span><input class="af-in" id="afPD"></label>`, `<button class="af-btn" data-c>Cancel</button><button class="af-btn af-btn-p" id="afPOk">Save</button>`);
      mm.querySelector('[data-c]').addEventListener('click', cerrarModal);
      mm.querySelector('#afPOk').addEventListener('click', () => { const n = mm.querySelector('#afPN').value.trim(); if (!n) return; s.pools[n] = { slots: Math.max(1, Number(mm.querySelector('#afPS').value) || 1), desc: mm.querySelector('#afPD').value }; A().evento({ evento: 'pool.create', extra: n }); A().guardar(); cerrarModal(); U.render(); });
    });
    el.querySelectorAll('[data-bo]').forEach((b) => b.addEventListener('click', () => { delete s.pools[b.dataset.bo]; A().guardar(); U.render(); }));
  };
  P.providers = (el) => {
    const prov = [['apache-airflow-providers-standard', '1.9.1', 'Operadores básicos: Bash, Python, Empty, sensores de archivo y de tiempo'], ['apache-airflow-providers-common-sql', '1.28.2', 'SQLExecuteQueryOperator y chequeos de calidad SQL'], ['apache-airflow-providers-amazon', '9.16.0', 'S3, Glue, Athena, EMR, Redshift, Lambda (simulados)'], ['apache-airflow-providers-google', '18.1.0', 'GCS, BigQuery, Dataproc, Dataflow, Dataform (simulados)'], ['apache-airflow-providers-databricks', '7.7.4', 'Jobs y SQL de Databricks (simulados)']];
    el.innerHTML = `<div class="af-titulo"><h1 class="af-h1">Providers</h1></div>` + tabla(['Package Name', 'Version', 'Description'], prov.map(([n, v, dd]) => [`<b>${n}</b>`, v, esc(dd)])) + `<p class="af-dim">Un provider es un paquete aparte (<code>pip install apache-airflow-providers-slack</code>) con operadores para un servicio. Si un DAG importa uno que no está instalado, falla con <code>ModuleNotFoundError</code> y aparece en <b>Dag Import Errors</b>.</p>`;
  };
  P.plugins = (el) => { el.innerHTML = `<div class="af-titulo"><h1 class="af-h1">Plugins</h1></div><div class="af-vacio">No plugins found</div><p class="af-dim">Los plugins agregan vistas, macros o listeners a Airflow desde la carpeta <code>$AIRFLOW_HOME/plugins</code>.</p>`; };
  P.config = (el) => {
    const cfg = (window.Shell.exists(A().AIRFLOW_HOME + '/airflow.cfg') ? window.Shell.readFile(A().AIRFLOW_HOME + '/airflow.cfg') : '') || '';
    el.innerHTML = `<div class="af-titulo"><h1 class="af-h1">Airflow Configuration</h1></div><div class="af-aviso">${ic('info', '', 14)} En Airflow real esta página está desactivada por defecto (<code>expose_config = False</code>) porque puede mostrar secretos. La práctica muestra <code>~/airflow/airflow.cfg</code>.</div><pre class="af-pre af-cfg">${esc(cfg)}</pre><p class="af-dim">Cualquier opción se puede pisar con una variable de entorno: <code>AIRFLOW__CORE__LOAD_EXAMPLES=False</code> (sección y clave en mayúsculas, separadas por doble guion bajo).</p>`;
  };
  P.import_errors = (el) => { el.innerHTML = '<div class="af-vacio">Abriendo los errores de importación…</div>'; setTimeout(() => _.erroresImportacion(), 0); };
})();
