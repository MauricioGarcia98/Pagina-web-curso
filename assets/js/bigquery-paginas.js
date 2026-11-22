/* Consola de BigQuery de práctica: Overview, Search, Scheduled queries, Data transfers, Dataform, Sharing
 * (Analytics Hub) y Capacity management. Siguen la documentación pública de Google Cloud (horarios de BigQuery
 * Data Transfer Service en UTC, parámetros @run_time y @run_date, Dataform con SQLX, linked datasets y
 * reservas de slots por edición). El SQL corre en BigQueryMotor; los archivos de las transferencias salen de
 * los buckets de S3 y Cloud Storage de la práctica (la terminal). No usa código, logos ni íconos de Google. */
(function () {
  'use strict';
  const P = {};
  const SA = 'scheduled-query@tienda-andina-dev.iam.gserviceaccount.com';
  const DTS = 'bigquery-data-transfer@tienda-andina-dev.iam.gserviceaccount.com';
  const fh = (t) => (t ? new Date(t).toISOString().replace('T', ' ').slice(0, 19) + ' UTC' : '—');
  const id = () => Math.random().toString(36).slice(2, 9);
  const guardar = (C) => { try { C.Store.saveSoon ? C.Store.saveSoon() : C.Store.save(); } catch (e) { /* sin almacenamiento */ } };
  async function correr(C, sql, op = {}) { const rs = await C.M().ejecutar(sql, { seguir: false, ...op }); const u = rs[rs.length - 1]; return u ? { error: u.error, r: u.r, job: u.job } : {}; }
  const tablaRes = (C, r, max = 100) => (!r || !r.columns ? `<p class="bq-dim">${C.esc((r && r.estado) || '')}</p>` : `<div class="bq-res-w"><table class="bq-tabla"><thead><tr>${r.columns.map((c) => `<th>${C.esc(c)}</th>`).join('')}</tr></thead><tbody>${r.values.slice(0, max).map((f) => `<tr>${f.map((v) => `<td>${v == null ? '<i class="bq-dim">null</i>' : C.esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);

  // ------------------------------------------------------------------ horarios (sintaxis de BigQuery, en UTC)
  //   every 15 minutes · every 3 hours · every day 06:00 · every monday 09:00 · every mon,wed,fri 07:30
  const DIAS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  function parseHorario(t) {
    const x = String(t || '').trim().toLowerCase();
    let m = /^every\s+(\d+)\s+(minutes?|hours?)$/.exec(x);
    if (m) { const ms = Number(m[1]) * (m[2][0] === 'h' ? 36e5 : 6e4); if (ms < 15 * 6e4) throw new Error('Invalid schedule: el intervalo mínimo es de 15 minutos.'); return { tipo: 'intervalo', ms }; }
    m = /^every\s+(day|[a-z,]+)\s+(\d{1,2}):(\d{2})$/.exec(x);
    if (m) { const h = Number(m[2]), mi = Number(m[3]); if (h > 23 || mi > 59) throw new Error('Invalid schedule: hora inválida.'); if (m[1] === 'day') return { tipo: 'diario', h, mi }; const ds = m[1].split(',').map((d) => DIAS.findIndex((D) => D.startsWith(d.slice(0, 3)))); if (ds.some((d) => d < 0)) throw new Error(`Invalid schedule: día desconocido en "${m[1]}".`); return { tipo: 'semanal', dias: ds, h, mi }; }
    throw new Error('Invalid schedule. Ejemplos válidos: "every 24 hours", "every day 06:00", "every monday 09:00", "every mon,wed,fri 07:30" (en UTC).');
  }
  function vencimientos(cfg, desde, hasta) {
    let H; try { H = parseHorario(cfg.horario); } catch (e) { return []; }
    const out = [];
    if (H.tipo === 'intervalo') { const base = cfg.inicio || desde; for (let x = base + Math.floor((desde - base) / H.ms + 1) * H.ms; x <= hasta && out.length < 60; x += H.ms) out.push(x); return out.slice(-3); }
    const d = new Date(desde); d.setUTCHours(0, 0, 0, 0);
    for (let t = d.getTime(); t <= hasta && out.length < 60; t += 864e5) { const x = t + H.h * 36e5 + H.mi * 6e4; const dia = new Date(t).getUTCDay(); if (x > desde && x <= hasta && (H.tipo === 'diario' || H.dias.includes(dia))) out.push(x); }
    return out.slice(-3);
  }
  function proxima(cfg) { const hasta = Date.now() + 8 * 864e5; const v = []; let H; try { H = parseHorario(cfg.horario); } catch (e) { return null; } const desde = Date.now(); if (H.tipo === 'intervalo') { const base = cfg.inicio || desde; return base + Math.floor((desde - base) / H.ms + 1) * H.ms; } const d = new Date(desde); d.setUTCHours(0, 0, 0, 0); for (let t = d.getTime(); t <= hasta; t += 864e5) { const x = t + H.h * 36e5 + H.mi * 6e4; if (x > desde && (H.tipo === 'diario' || H.dias.includes(new Date(t).getUTCDay()))) { v.push(x); break; } } return v[0] || null; }

  // ------------------------------------------------------------------ Scheduled queries
  const conParametros = (sql, t) => sql.replace(/@run_time\b/gi, `TIMESTAMP '${new Date(t).toISOString().replace('T', ' ').slice(0, 19)}'`).replace(/@run_date\b/gi, `DATE '${new Date(t).toISOString().slice(0, 10)}'`);
  async function correrProgramada(C, q, programada, motivo) {
    const M = C.M(); const inicio = Date.now(); let estado = 'SUCCEEDED', error = null, job = null, filas = null;
    try {
      let sql = conParametros(q.sql.trim().replace(/;\s*$/, ''), programada);
      if (q.destino && q.destino.ds && q.destino.tabla) {
        const existe = (await M.tablas(q.destino.ds)).some((t) => t.nombre === q.destino.tabla);
        sql = q.modo === 'WRITE_APPEND' && existe ? `INSERT INTO ${q.destino.ds}.${q.destino.tabla}\n${sql}` : `CREATE OR REPLACE TABLE ${q.destino.ds}.${q.destino.tabla} AS\n${sql}`;
      }
      const r = await correr(C, sql, { usuario: SA, sinCache: true });
      job = r.job && r.job.id; if (r.error) { estado = 'FAILED'; error = String(r.error.message).split('\n')[0]; }
      if (q.destino && !r.error) { try { const c = await correr(C, `SELECT COUNT(*) AS n FROM ${q.destino.ds}.${q.destino.tabla}`, { usuario: SA }); filas = c.r && c.r.values ? c.r.values[0][0] : null; } catch (e) { /* nada */ } }
    } catch (e) { estado = 'FAILED'; error = String(e.message || e); }
    q.runs.unshift({ id: id(), programada, inicio, fin: Date.now(), estado, error, job, filas, motivo }); if (q.runs.length > 60) q.runs.length = 60;
    return estado;
  }
  async function correrTransfer(C, x, programada, motivo) {
    const inicio = Date.now(); let estado = 'SUCCEEDED', error = null, nota = '', filas = null;
    try {
      const CS = window.CloudSim; if (!CS) throw new Error('No se pudo leer el almacenamiento de la práctica.');
      const B = x.fuente === 's3' ? (CS.aws().buckets || {})[x.bucket] : ((CS.gcp && CS.gcp().buckets) || {})[x.bucket];
      if (!B) throw new Error(x.fuente === 's3' ? `Failed to access S3 bucket "${x.bucket}": NoSuchBucket. Créalo en la consola de AWS o con aws s3 mb s3://${x.bucket}` : `Failed to access Cloud Storage bucket "${x.bucket}": the bucket does not exist. Créalo con gcloud storage buckets create gs://${x.bucket}`);
      const re = new RegExp('^' + x.patron.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$');
      const objs = Object.entries(B.objects || {}).filter(([k]) => re.test(k) && /\.csv$/i.test(k)).map(([k, o]) => [k, typeof o === 'string' ? o : o.c || '']);
      x.cargados = x.cargados || [];
      const nuevos = objs.filter(([k]) => !x.cargados.includes(k));
      if (!objs.length) { nota = `No files found matching "${x.fuente === 's3' ? 's3' : 'gs'}://${x.bucket}/${x.patron}".`; }
      else if (x.modo === 'WRITE_APPEND' && !nuevos.length) { nota = 'No new files to transfer.'; }
      else {
        const usar = x.modo === 'WRITE_APPEND' ? objs.filter(([k]) => x.cargados.includes(k) || nuevos.some(([n]) => n === k)) : objs;
        const cab = usar[0][1].split('\n')[0];
        for (const [k, t] of usar) if (t.split('\n')[0].trim() !== cab.trim()) throw new Error(`Error while reading data, error message: CSV table references column position that does not exist. El archivo ${k} tiene otro encabezado.`);
        const texto = [cab, ...usar.map(([, t]) => t.split('\n').slice(1).filter((l) => l.trim()).join('\n'))].join('\n') + '\n';
        await C.M().cargarArchivo(x.ds, x.tabla, `${x.bucket}/${x.patron}.csv`, texto, { reemplazar: true });
        filas = texto.split('\n').filter(Boolean).length - 1;
        nota = `${nuevos.length} file(s) transferred${x.modo === 'WRITE_APPEND' ? ' (append)' : ''}.`;
        x.cargados = [...new Set([...x.cargados, ...nuevos.map(([k]) => k)])];
      }
    } catch (e) { estado = 'FAILED'; error = String(e.message || e).split('\n')[0]; }
    x.runs.unshift({ id: id(), programada, inicio, fin: Date.now(), estado, error, nota, filas, motivo }); if (x.runs.length > 60) x.runs.length = 60;
    return estado;
  }
  let corriendo = false;
  // al abrir la consola corren los horarios que vencieron (hasta 3 por configuración), como si hubieran corrido a su hora
  P.pendientes = async (C) => {
    if (corriendo) return; corriendo = true; let n = 0;
    try {
      const s = C.M().st(); const ahora = Date.now();
      for (const q of s.programadas) if (q.activa) for (const v of vencimientos(q, q.ultima || q.inicio, ahora)) { q.ultima = v; await correrProgramada(C, q, v, 'SCHEDULED'); n++; }
      for (const x of s.transferencias) if (x.activa) for (const v of vencimientos(x, x.ultima || x.inicio, ahora)) { x.ultima = v; await correrTransfer(C, x, v, 'SCHEDULED'); n++; }
      if (n) { guardar(C); C.toast && C.toast(`Corrieron ${n} ejecución(es) programada(s) mientras no estabas: mira Scheduled queries y Data transfers`); }
    } finally { corriendo = false; }
  };
  const estadoChip = (e) => `<span class="${e === 'FAILED' ? 'bq-rojo' : e === 'SUCCEEDED' ? 'bq-verde' : 'bq-dim'}">● ${e}</span>`;
  P.programadas = (C) => {
    const { esc, marco, main, href, ruta, M } = C; const s = M().st();
    const q = ruta[1] && s.programadas.find((x) => x.id === ruta[1]);
    if (q) {
      main.innerHTML = marco(`<div class="bq-pag"><a class="bq-btn" href="${href('programadas')}">${C.ic('volver')} Scheduled queries</a>
        <div class="bq-cab" style="margin-top:12px"><h1>${esc(q.nombre)}</h1><span class="bq-sp"></span><button class="bq-btn" id="bqToggle">${q.activa ? 'Disable' : 'Enable'}</button><button class="bq-btn" id="bqBackfill">Schedule backfill</button><button class="bq-btn bq-pri" id="bqAhora">Run now</button></div>
        <dl class="bq-dl"><dt>Schedule (UTC)</dt><dd>${esc(q.horario)}${q.activa ? ` · próxima: ${fh(proxima(q))}` : ' · <b>disabled</b>'}</dd><dt>Destination</dt><dd>${q.destino ? `${esc(q.destino.ds)}.${esc(q.destino.tabla)} · ${q.modo}` : 'ninguna (la consulta escribe por su cuenta: DML o DDL)'}</dd><dt>Service account</dt><dd><code>${SA}</code></dd></dl>
        <h2>Query</h2><pre class="bq-codigo">${esc(q.sql)}</pre>
        <h2>Run history</h2>${q.runs.length ? `<table class="bq-tabla"><thead><tr><th>Status</th><th>Run time (@run_time)</th><th>Started</th><th>Trigger</th><th class="bq-der">Rows in destination</th><th>Error</th><th>Job</th></tr></thead><tbody>${q.runs.map((r) => `<tr><td>${estadoChip(r.estado)}</td><td>${fh(r.programada)}</td><td>${fh(r.inicio)}</td><td>${esc(r.motivo)}</td><td class="bq-der">${r.filas == null ? '—' : r.filas}</td><td class="bq-chico">${esc(r.error || '')}</td><td><code class="bq-chico">${esc(r.job || '')}</code></td></tr>`).join('')}</tbody></table>` : '<p class="bq-dim">Todavía no corrió. Usa Run now o espera al horario.</p>'}
        <div class="bq-modal" id="bqModal" hidden></div></div>`, 'programadas');
      main.querySelector('#bqToggle').onclick = () => { q.activa = !q.activa; if (q.activa) q.ultima = Date.now(); guardar(C); C.dibujar(); };
      main.querySelector('#bqAhora').onclick = async (e) => { e.target.disabled = true; await correrProgramada(C, q, Date.now(), 'MANUAL'); guardar(C); C.dibujar(); };
      main.querySelector('#bqBackfill').onclick = () => {
        const m = main.querySelector('#bqModal'); const hoy = new Date().toISOString().slice(0, 10), hace3 = new Date(Date.now() - 3 * 864e5).toISOString().slice(0, 10);
        m.innerHTML = `<div class="bq-modal-c bq-form"><div class="bq-cab"><h2>Schedule backfill</h2><span class="bq-sp"></span><button class="bq-icono" data-cerrar>✕</button></div><p class="bq-dim">Corre la consulta una vez por cada día del rango, con <code>@run_date</code> igual a ese día. Sirve para reprocesar días que faltan o que salieron mal.</p><label>Start date<input type="date" id="bfA" value="${hace3}"></label><label>End date<input type="date" id="bfB" value="${hoy}"></label><div class="bq-acciones"><button class="bq-btn" data-cerrar>Cancel</button><button class="bq-btn bq-pri" id="bfOk">Ok</button></div></div>`;
        m.hidden = false; m.querySelectorAll('[data-cerrar]').forEach((x) => { x.onclick = () => { m.hidden = true; }; });
        m.querySelector('#bfOk').onclick = async (ev) => { const a = new Date(m.querySelector('#bfA').value + 'T00:00:00Z').getTime(), b = new Date(m.querySelector('#bfB').value + 'T00:00:00Z').getTime(); if (!(b >= a)) return C.toast('El rango es inválido'); if ((b - a) / 864e5 > 30) return C.toast('Máximo 31 días por backfill'); ev.target.disabled = true; for (let t = a; t <= b; t += 864e5) await correrProgramada(C, q, t, 'BACKFILL'); guardar(C); m.hidden = true; C.dibujar(); };
      };
      return;
    }
    main.innerHTML = marco(`<div class="bq-pag"><div class="bq-cab"><h1>Scheduled queries</h1><span class="bq-sp"></span><button class="bq-btn bq-pri" id="bqNuevaP">${C.ic('mas')} Create scheduled query</button></div>
      <p class="bq-dim">Una <b>consulta programada</b> corre sola con un horario (en <b>UTC</b>) y puede escribir su resultado en una tabla, reemplazándola (WRITE_TRUNCATE) o agregando filas (WRITE_APPEND). Dentro de la consulta, <code>@run_date</code> y <code>@run_time</code> valen la fecha y hora de cada corrida: así un mismo SQL procesa "el día de ayer" todos los días, o cualquier día en un backfill. Es la forma más simple de automatizar un SQL en BigQuery, sin Airflow.</p>
      ${s.programadas.length ? `<table class="bq-tabla"><thead><tr><th>Display name</th><th>Schedule (UTC)</th><th>Destination</th><th>State</th><th>Last run</th><th>Next run</th></tr></thead><tbody>${s.programadas.map((x) => `<tr><td><a href="${href('programadas/' + x.id)}"><b>${esc(x.nombre)}</b></a></td><td>${esc(x.horario)}</td><td>${x.destino ? `${esc(x.destino.ds)}.${esc(x.destino.tabla)}` : '—'}</td><td>${x.activa ? 'Enabled' : 'Disabled'}</td><td>${x.runs[0] ? estadoChip(x.runs[0].estado) + ' ' + fh(x.runs[0].inicio) : '—'}</td><td>${x.activa ? fh(proxima(x)) : '—'}</td></tr>`).join('')}</tbody></table>` : '<div class="bq-vacio"><p>No hay consultas programadas.</p></div>'}
      <div class="bq-modal" id="bqModal" hidden></div></div>`, 'programadas');
    main.querySelector('#bqNuevaP').onclick = async () => {
      const m = main.querySelector('#bqModal'); const dss = await M().datasets();
      m.innerHTML = `<div class="bq-modal-c bq-form" style="width:min(720px,100%)"><div class="bq-cab"><h2>New scheduled query</h2><span class="bq-sp"></span><button class="bq-icono" data-cerrar>✕</button></div>
        <label>Name for the scheduled query<input id="pN" value="ventas_del_dia"></label>
        <label>Query<textarea id="pQ" rows="7" spellcheck="false">-- foto diaria de los pedidos por canal: cada corrida agrega 4 filas con su fecha
SELECT @run_date AS fecha_corrida, canal, COUNT(*) AS pedidos
FROM tienda.pedidos
GROUP BY canal</textarea></label>
        <label>Repeat frequency (UTC)<select id="pH"><option>every day 09:00</option><option>every 24 hours</option><option>every 3 hours</option><option>every 15 minutes</option><option>every monday 12:00</option><option value="custom">Custom…</option></select></label><label id="pHC" hidden>Custom schedule<input id="pHT" value="every mon,wed,fri 07:30"></label>
        <label>Destination dataset<select id="pD"><option value="">(none: the query writes on its own)</option>${dss.map((d) => `<option ${d === 'tienda' ? 'selected' : ''}>${esc(d)}</option>`).join('')}</select></label><label>Destination table<input id="pT" value="ventas_diarias_programada"></label>
        <label>Destination table write preference<select id="pW"><option value="WRITE_APPEND">Append to table (WRITE_APPEND)</option><option value="WRITE_TRUNCATE">Overwrite table (WRITE_TRUNCATE)</option></select></label>
        <p class="bq-dim bq-chico">Corre con la cuenta de servicio <code>${SA}</code>, que necesita permisos sobre el dataset de destino.</p><div id="pE"></div>
        <div class="bq-acciones"><button class="bq-btn" data-cerrar>Cancel</button><button class="bq-btn bq-pri" id="pOk">Save</button></div></div>`;
      m.hidden = false; m.querySelectorAll('[data-cerrar]').forEach((x) => { x.onclick = () => { m.hidden = true; }; });
      m.querySelector('#pH').onchange = (e) => { m.querySelector('#pHC').hidden = e.target.value !== 'custom'; };
      m.querySelector('#pOk').onclick = () => {
        const horario = m.querySelector('#pH').value === 'custom' ? m.querySelector('#pHT').value : m.querySelector('#pH').value;
        try { parseHorario(horario); } catch (e) { m.querySelector('#pE').innerHTML = `<div class="bq-err-caja">${esc(e.message)}</div>`; return; }
        const ds = m.querySelector('#pD').value, t = m.querySelector('#pT').value.trim();
        if (ds && !/^\w+$/.test(t)) { m.querySelector('#pE').innerHTML = '<div class="bq-err-caja">Invalid table name.</div>'; return; }
        s.programadas.push({ id: id(), nombre: m.querySelector('#pN').value.trim() || 'consulta_programada', sql: m.querySelector('#pQ').value, horario, destino: ds ? { ds, tabla: t } : null, modo: m.querySelector('#pW').value, activa: true, inicio: Date.now(), ultima: Date.now(), runs: [], creada: Date.now() });
        guardar(C); m.hidden = true; C.toast('Consulta programada creada: corre en su próximo horario (o usa Run now)'); C.dibujar();
      };
    };
  };

  // ------------------------------------------------------------------ Data transfers
  P.transferencias = (C) => {
    const { esc, marco, main, href, ruta, M } = C; const s = M().st();
    const x = ruta[1] && s.transferencias.find((t) => t.id === ruta[1]);
    if (x) {
      main.innerHTML = marco(`<div class="bq-pag"><a class="bq-btn" href="${href('transferencias')}">${C.ic('volver')} Data transfers</a>
        <div class="bq-cab" style="margin-top:12px"><h1>${esc(x.nombre)}</h1><span class="bq-sp"></span><button class="bq-btn" id="bqTg">${x.activa ? 'Disable' : 'Enable'}</button><button class="bq-btn bq-pri" id="bqRun">Run transfer now</button></div>
        <dl class="bq-dl"><dt>Source</dt><dd>${x.fuente === 's3' ? 'Amazon S3' : 'Google Cloud Storage'}: <code>${x.fuente === 's3' ? 's3' : 'gs'}://${esc(x.bucket)}/${esc(x.patron)}</code></dd><dt>Destination</dt><dd>${esc(x.ds)}.${esc(x.tabla)} · ${x.modo}</dd><dt>Schedule (UTC)</dt><dd>${esc(x.horario)}${x.activa ? ` · próxima: ${fh(proxima(x))}` : ' · disabled'}</dd><dt>Files transferred</dt><dd>${(x.cargados || []).length}</dd><dt>Service account</dt><dd><code>${DTS}</code></dd></dl>
        <h2>Run history</h2>${x.runs.length ? `<table class="bq-tabla"><thead><tr><th>Status</th><th>Run time</th><th>Trigger</th><th>Message</th><th class="bq-der">Rows</th></tr></thead><tbody>${x.runs.map((r) => `<tr><td>${estadoChip(r.estado)}</td><td>${fh(r.inicio)}</td><td>${esc(r.motivo)}</td><td class="bq-chico">${esc(r.error || r.nota || '')}</td><td class="bq-der">${r.filas == null ? '—' : r.filas}</td></tr>`).join('')}</tbody></table>` : '<p class="bq-dim">Todavía no corrió.</p>'}</div>`, 'transferencias');
      main.querySelector('#bqTg').onclick = () => { x.activa = !x.activa; if (x.activa) x.ultima = Date.now(); guardar(C); C.dibujar(); };
      main.querySelector('#bqRun').onclick = async (e) => { e.target.disabled = true; await correrTransfer(C, x, Date.now(), 'MANUAL'); guardar(C); C.dibujar(); };
      return;
    }
    const FUENTES = [['s3', 'Amazon S3', true], ['gcs', 'Google Cloud Storage', true], ['ads', 'Google Ads', false], ['youtube', 'YouTube Channel', false], ['teradata', 'Migration: Teradata', false], ['redshift', 'Migration: Amazon Redshift', false], ['salesforce', 'Salesforce', false]];
    main.innerHTML = marco(`<div class="bq-pag"><div class="bq-cab"><h1>Data transfers</h1><span class="bq-sp"></span><button class="bq-btn bq-pri" id="bqNuevaT">${C.ic('mas')} Create transfer</button></div>
      <p class="bq-dim"><b>BigQuery Data Transfer Service</b> trae datos a una tabla con un horario, sin escribir código: archivos de Cloud Storage o de Amazon S3, aplicaciones de Google (Ads, YouTube) o una migración desde otro warehouse. En la práctica funcionan las dos fuentes de archivos: leen los <b>buckets que creaste en la terminal</b> (<code>aws s3 cp</code>, <code>gcloud storage cp</code>) o en la consola de AWS.</p>
      ${s.transferencias.length ? `<table class="bq-tabla"><thead><tr><th>Display name</th><th>Source</th><th>Destination</th><th>Schedule (UTC)</th><th>State</th><th>Last run</th></tr></thead><tbody>${s.transferencias.map((t) => `<tr><td><a href="${href('transferencias/' + t.id)}"><b>${esc(t.nombre)}</b></a></td><td>${t.fuente === 's3' ? 'Amazon S3' : 'Cloud Storage'}</td><td>${esc(t.ds)}.${esc(t.tabla)}</td><td>${esc(t.horario)}</td><td>${t.activa ? 'Enabled' : 'Disabled'}</td><td>${t.runs[0] ? estadoChip(t.runs[0].estado) : '—'}</td></tr>`).join('')}</tbody></table>` : '<div class="bq-vacio"><p>No hay transferencias.</p></div>'}
      <h2>Fuentes</h2><div class="bq-fuentes">${FUENTES.map(([k, n, ok]) => `<span class="bq-chip${ok ? ' on' : ''}" title="${ok ? 'Disponible en la práctica' : 'Requiere una cuenta real de ese servicio'}">${esc(n)}</span>`).join(' ')}</div>
      <div class="bq-modal" id="bqModal" hidden></div></div>`, 'transferencias');
    main.querySelector('#bqNuevaT').onclick = async () => {
      const m = main.querySelector('#bqModal'); const dss = await M().datasets(); const CS = window.CloudSim;
      const bS3 = CS ? Object.keys(CS.aws().buckets || {}) : []; const bG = CS && CS.gcp ? Object.keys(CS.gcp().buckets || {}) : [];
      m.innerHTML = `<div class="bq-modal-c bq-form" style="width:min(720px,100%)"><div class="bq-cab"><h2>Create transfer</h2><span class="bq-sp"></span><button class="bq-icono" data-cerrar>✕</button></div>
        <label>Source<select id="tF"><option value="s3">Amazon S3</option><option value="gcs">Google Cloud Storage</option></select></label>
        <label>Transfer config name<input id="tN" value="pedidos_desde_s3"></label>
        <label>Bucket<input id="tB" list="tBl" value="${esc(bS3[0] || 'tienda-andina-lago-equipo')}"><datalist id="tBl">${[...bS3, ...bG].map((b) => `<option>${esc(b)}</option>`).join('')}</datalist></label>
        <label>File path (admite *)<input id="tP" value="raw/pedidos/*"></label>
        <label>Destination dataset<select id="tD">${dss.map((d) => `<option>${esc(d)}</option>`).join('')}</select></label><label>Destination table<input id="tT" value="pedidos_lago"></label>
        <label>Write preference<select id="tW"><option value="WRITE_APPEND">APPEND (solo los archivos nuevos en cada corrida)</option><option value="WRITE_TRUNCATE">MIRROR (la tabla refleja todos los archivos)</option></select></label>
        <label>Repeat frequency (UTC)<select id="tH"><option>every 24 hours</option><option>every day 06:00</option><option>every 1 hours</option><option>every 15 minutes</option></select></label>
        <p class="bq-dim bq-chico">${bS3.length || bG.length ? `Tus buckets: S3: ${bS3.map(esc).join(', ') || '—'} · Cloud Storage: ${bG.map(esc).join(', ') || '—'}.` : 'Todavía no tienes buckets: créalos en la terminal (aws s3 mb s3://mi-bucket o gcloud storage buckets create gs://mi-bucket) y sube CSV.'} En una transferencia real desde S3 también se cargan un access key ID y su secreto de AWS: nunca en el código, y con permisos de solo lectura sobre el bucket.</p><div id="tE"></div>
        <div class="bq-acciones"><button class="bq-btn" data-cerrar>Cancel</button><button class="bq-btn bq-pri" id="tOk">Save</button></div></div>`;
      m.hidden = false; m.querySelectorAll('[data-cerrar]').forEach((y) => { y.onclick = () => { m.hidden = true; }; });
      m.querySelector('#tOk').onclick = async () => {
        const t = { id: id(), fuente: m.querySelector('#tF').value, nombre: m.querySelector('#tN').value.trim() || 'transferencia', bucket: m.querySelector('#tB').value.trim(), patron: m.querySelector('#tP').value.trim().replace(/^\/+/, ''), ds: m.querySelector('#tD').value, tabla: m.querySelector('#tT').value.trim(), modo: m.querySelector('#tW').value, horario: m.querySelector('#tH').value, activa: true, inicio: Date.now(), ultima: Date.now(), runs: [], cargados: [] };
        if (!/^\w+$/.test(t.tabla)) { m.querySelector('#tE').innerHTML = '<div class="bq-err-caja">Invalid table name.</div>'; return; }
        s.transferencias.push(t); await correrTransfer(C, t, Date.now(), 'INITIAL RUN'); guardar(C); m.hidden = true; location.hash = href('transferencias/' + t.id);
      };
    };
  };

  // ------------------------------------------------------------------ Dataform
  const DF_INICIAL = {
    'workflow_settings.yaml': 'defaultProject: tienda-andina-dev\ndefaultLocation: US\ndefaultDataset: dataform\ndefaultAssertionDataset: dataform_assertions\ndataformCoreVersion: 3.0.0\n',
    'definitions/sources/pedidos.sqlx': 'config {\n  type: "declaration",\n  schema: "tienda",\n  name: "pedidos"\n}\n',
    'definitions/sources/detalle_pedidos.sqlx': 'config {\n  type: "declaration",\n  schema: "tienda",\n  name: "detalle_pedidos"\n}\n',
    'definitions/staging/stg_pedidos.sqlx': 'config {\n  type: "view",\n  description: "Pedidos entregados, con la fecha como DATE"\n}\n\nSELECT\n  pedido_id,\n  cliente_id,\n  canal,\n  CAST(fecha_pedido AS DATE) AS fecha\nFROM ${ref("pedidos")}\nWHERE estado = \'entregado\'\n',
    'definitions/marts/ventas_diarias.sqlx': 'config {\n  type: "table",\n  description: "Ventas por día y canal",\n  assertions: {\n    nonNull: ["fecha", "canal"],\n    uniqueKey: ["fecha", "canal"]\n  }\n}\n\nSELECT\n  p.fecha,\n  p.canal,\n  COUNT(DISTINCT p.pedido_id) AS pedidos,\n  ROUND(SUM(d.cantidad * d.precio_unitario), 2) AS ventas\nFROM ${ref("stg_pedidos")} p\nJOIN ${ref("detalle_pedidos")} d USING (pedido_id)\nGROUP BY 1, 2\n',
    'definitions/marts/pedidos_historico.sqlx': 'config {\n  type: "incremental",\n  description: "Una fila por pedido; cada corrida agrega solo los días nuevos"\n}\n\nSELECT pedido_id, cliente_id, canal, fecha\nFROM ${ref("stg_pedidos")}\n${when(incremental(), `WHERE fecha > (SELECT MAX(fecha) FROM ${self()})`)}\n',
    'definitions/assertions/ventas_positivas.sqlx': 'config {\n  type: "assertion",\n  description: "Ningún día puede tener ventas negativas"\n}\n\nSELECT *\nFROM ${ref("ventas_diarias")}\nWHERE ventas < 0\n',
  };
  function yaml(t) { const o = {}; for (const l of String(t).split('\n')) { const m = /^\s*(\w+)\s*:\s*(.*?)\s*$/.exec(l); if (m) o[m[1]] = m[2].replace(/^["']|["']$/g, ''); } return o; }
  function parseConfig(txt, archivo) {
    const i = txt.search(/\bconfig\s*\{/); if (i < 0) return [{}, txt];
    let p = 0, k = txt.indexOf('{', i); const ini = k;
    for (; k < txt.length; k++) { if (txt[k] === '{') p++; else if (txt[k] === '}') { p--; if (!p) break; } }
    if (p) throw new Error(`${archivo}: config block is not closed ("}" missing).`);
    const obj = txt.slice(ini, k + 1).replace(/\/\/[^\n]*/g, '').replace(/'([^']*)'/g, '"$1"').replace(/([{,]\s*)([A-Za-z_]\w*)\s*:/g, '$1"$2":').replace(/,(\s*[}\]])/g, '$1');
    let cfg; try { cfg = JSON.parse(obj); } catch (e) { throw new Error(`${archivo}: invalid config block (${e.message.split(' in JSON')[0]}).`); }
    return [cfg, txt.slice(0, i) + txt.slice(k + 1)];
  }
  function compilar(files) {
    const W = yaml(files['workflow_settings.yaml'] || ''); const dsDef = W.defaultDataset || 'dataform', dsAs = W.defaultAssertionDataset || 'dataform_assertions';
    const acciones = []; const errores = [];
    for (const [f, txt] of Object.entries(files)) {
      if (!/^definitions\/.*\.sqlx$/.test(f)) continue;
      try {
        const [cfg, cuerpo] = parseConfig(txt, f);
        const tipo = cfg.type || 'table'; if (!['table', 'view', 'incremental', 'assertion', 'declaration', 'operations'].includes(tipo)) throw new Error(`${f}: unknown action type "${tipo}".`);
        const nombre = cfg.name || f.split('/').pop().replace(/\.sqlx$/, '');
        acciones.push({ archivo: f, tipo, nombre, schema: cfg.schema || (tipo === 'assertion' ? dsAs : dsDef), cfg, cuerpo: cuerpo.trim() });
        // assertions declaradas en el config de una tabla
        const A = cfg.assertions || {};
        (A.nonNull || []).length && acciones.push({ archivo: f, tipo: 'assertion', nombre: `${nombre}_assertions_rowConditions_nonNull`, schema: dsAs, auto: true, cuerpo: `SELECT * FROM \${ref("${nombre}")} WHERE ${A.nonNull.map((c) => `${c} IS NULL`).join(' OR ')}` });
        (A.uniqueKey || []).length && acciones.push({ archivo: f, tipo: 'assertion', nombre: `${nombre}_assertions_uniqueKey_0`, schema: dsAs, auto: true, cuerpo: `SELECT ${A.uniqueKey.join(', ')}, COUNT(*) AS filas FROM \${ref("${nombre}")} GROUP BY ${A.uniqueKey.join(', ')} HAVING COUNT(*) > 1` });
        (A.rowConditions || []).length && acciones.push({ archivo: f, tipo: 'assertion', nombre: `${nombre}_assertions_rowConditions`, schema: dsAs, auto: true, cuerpo: `SELECT * FROM \${ref("${nombre}")} WHERE NOT (${A.rowConditions.join(') OR NOT (')})` });
      } catch (e) { errores.push(e.message); }
    }
    const porNombre = new Map(acciones.map((a) => [a.nombre, a]));
    for (const a of acciones) {
      a.deps = [];
      const resolver = (incremental) => a.cuerpo
        .replace(/\$\{\s*when\(\s*incremental\(\)\s*,\s*(`[\s\S]*?`|"[^"]*"|'[^']*')\s*(?:,\s*(`[\s\S]*?`|"[^"]*"|'[^']*'))?\s*\)\s*\}/g, (mm, si, no) => (incremental ? si : no || '""').slice(1, -1))
        .replace(/\$\{\s*incremental\(\)\s*\}/g, incremental ? 'true' : 'false')
        .replace(/\$\{\s*self\(\)\s*\}/g, `\`${a.schema}.${a.nombre}\``)
        .replace(/\$\{\s*ref\(\s*["']([\w-]+)["']\s*(?:,\s*["']([\w-]+)["']\s*)?\)\s*\}/g, (mm, x, y) => { const n = y || x; const d = porNombre.get(n); if (!d) { errores.push(`${a.archivo}: Could not resolve "${n}". ¿Falta declarar la fuente (type: "declaration")?`); return n; } if (!a.deps.includes(n)) a.deps.push(n); return `\`${d.schema}.${d.nombre}\``; })
        .replace(/\$\{\s*self\(\)\s*\}/g, `\`${a.schema}.${a.nombre}\``);
      a.sql = resolver(false); a.sqlInc = a.tipo === 'incremental' ? resolver(true) : null;
    }
    // orden topológico y ciclos
    const orden = [], visit = new Map();
    const ver = (n, pila) => { const a = porNombre.get(n); if (!a) return; if (visit.get(n) === 2) return; if (visit.get(n) === 1) { errores.push(`Circular dependency: ${[...pila, n].join(' → ')}`); return; } visit.set(n, 1); for (const d of a.deps) ver(d, [...pila, n]); visit.set(n, 2); orden.push(a); };
    for (const a of acciones) ver(a.nombre, []);
    return { acciones: orden, errores: [...new Set(errores)], W };
  }
  async function ejecutarDataform(C, comp, seleccion) {
    const M = C.M(); const s = M.st(); const df = s.dataform; const ej = { id: id(), inicio: Date.now(), acciones: [] };
    const fallidas = new Set();
    const elegir = new Set(seleccion || comp.acciones.map((a) => a.nombre));
    for (const a of comp.acciones) {
      if (a.tipo === 'declaration' || !elegir.has(a.nombre)) continue;
      const t0 = Date.now(); let estado = 'SUCCEEDED', error = null, sql = '';
      if (a.deps.some((d) => fallidas.has(d))) { ej.acciones.push({ nombre: a.nombre, tipo: a.tipo, estado: 'SKIPPED', error: 'Una dependencia falló', ms: 0, sql: '' }); fallidas.add(a.nombre); continue; }
      try {
        await correr(C, `CREATE SCHEMA IF NOT EXISTS ${a.schema}`, { usuario: 'dataform' });
        const existe = (await M.tablas(a.schema)).some((t) => t.nombre === a.nombre);
        if (a.tipo === 'view') sql = `CREATE OR REPLACE VIEW ${a.schema}.${a.nombre} AS\n${a.sql}`;
        else if (a.tipo === 'table') sql = `CREATE OR REPLACE TABLE ${a.schema}.${a.nombre} AS\n${a.sql}`;
        else if (a.tipo === 'incremental') sql = existe ? `INSERT INTO ${a.schema}.${a.nombre}\n${a.sqlInc}` : `CREATE TABLE ${a.schema}.${a.nombre} AS\n${a.sql}`;
        else if (a.tipo === 'operations') sql = a.sql;
        else if (a.tipo === 'assertion') sql = `CREATE OR REPLACE VIEW ${a.schema}.${a.nombre} AS\n${a.sql}`;
        const r = await correr(C, sql, { usuario: 'dataform', sinCache: true });
        if (r.error) throw r.error;
        if (a.tipo === 'assertion') { const c = await correr(C, `SELECT COUNT(*) AS n FROM ${a.schema}.${a.nombre}`, { usuario: 'dataform', sinCache: true }); const n = c.r && c.r.values ? Number(c.r.values[0][0]) : 0; if (n > 0) { estado = 'FAILED'; error = `Assertion failed: query returned ${n} row(s).`; } }
        if (a.tipo === 'incremental' && existe) { const c = await correr(C, `SELECT COUNT(*) FROM ${a.schema}.${a.nombre}`, { usuario: 'dataform' }); if (c.r && c.r.values) error = null; }
      } catch (e) { estado = 'FAILED'; error = String(e.message || e).split('\n')[0]; }
      if (estado === 'FAILED') fallidas.add(a.nombre);
      ej.acciones.push({ nombre: `${a.schema}.${a.nombre}`, tipo: a.tipo, estado, error, ms: Date.now() - t0, sql });
    }
    ej.fin = Date.now(); ej.estado = ej.acciones.some((x) => x.estado === 'FAILED') ? 'FAILED' : 'SUCCEEDED';
    df.ejecuciones.unshift(ej); if (df.ejecuciones.length > 30) df.ejecuciones.length = 30; guardar(C);
    return ej;
  }
  P.dataform = (C) => {
    const { esc, marco, main, ruta, M } = C; const s = M().st();
    if (!s.dataform) s.dataform = { files: { ...DF_INICIAL }, ejecuciones: [], abierto: 'definitions/marts/ventas_diarias.sqlx', repo: 'tienda-analitica', workspace: 'alumno-dev' };
    const df = s.dataform; let comp = compilar(df.files);
    const lista = Object.keys(df.files).sort();
    const vista2 = ruta[1] === 'ejecuciones' ? 'ejecuciones' : 'codigo';
    const grafo = () => { const capas = {}; const nivel = (a) => (a._n != null ? a._n : (a._n = a.deps.length ? 1 + Math.max(...a.deps.map((d) => { const x = comp.acciones.find((y) => y.nombre === d); return x ? nivel(x) : 0; })) : 0)); for (const a of comp.acciones) (capas[nivel(a)] = capas[nivel(a)] || []).push(a); return `<div class="bq-grafo">${Object.keys(capas).sort().map((k) => `<div class="bq-capa">${capas[k].map((a) => `<div class="bq-nodo-df bq-df-${a.tipo}" title="${esc(a.deps.length ? 'depende de: ' + a.deps.join(', ') : 'sin dependencias')}"><small>${a.tipo}</small><b>${esc(a.nombre)}</b><span class="bq-dim">${esc(a.schema)}</span></div>`).join('')}</div>`).join('<div class="bq-flechita">→</div>')}</div>`; };
    const ab = df.abierto in df.files ? df.abierto : lista[0];
    const accion = comp.acciones.find((a) => a.archivo === ab && !a.auto);
    main.innerHTML = marco(`<div class="bq-pag bq-df"><div class="bq-cab"><h1>Dataform</h1><span class="bq-dim">Repository <b>${esc(df.repo)}</b> · Workspace <b>${esc(df.workspace)}</b></span><span class="bq-sp"></span><a class="bq-chip${vista2 === 'codigo' ? ' on' : ''}" href="#/bigquery/dataform">Code</a><a class="bq-chip${vista2 === 'ejecuciones' ? ' on' : ''}" href="#/bigquery/dataform/ejecuciones">Executions</a></div>
      <p class="bq-dim">Dataform organiza las transformaciones en archivos <b>SQLX</b>: un bloque <code>config { type: "table" | "view" | "incremental" | "assertion" }</code> y el SQL. <code>\${ref("x")}</code> crea la dependencia (y el orden de ejecución), <code>\${self()}</code> es la propia tabla y <code>\${when(incremental(), "…")}</code> agrega un filtro solo en las corridas incrementales. Es la idea de dbt, dentro de BigQuery.</p>
      ${vista2 === 'ejecuciones' ? (df.ejecuciones.length ? df.ejecuciones.map((e) => `<details class="bq-ej" ${e === df.ejecuciones[0] ? 'open' : ''}><summary>${estadoChip(e.estado)} ${fh(e.inicio)} · ${e.acciones.length} actions · ${((e.fin - e.inicio) / 1000).toFixed(1)} s</summary><table class="bq-tabla"><thead><tr><th>Status</th><th>Action</th><th>Type</th><th class="bq-der">Duration</th><th>Details</th></tr></thead><tbody>${e.acciones.map((a) => `<tr><td>${estadoChip(a.estado)}</td><td><b>${esc(a.nombre)}</b></td><td>${a.tipo}</td><td class="bq-der">${a.ms} ms</td><td class="bq-chico">${esc(a.error || '')}${a.sql ? `<details><summary>SQL</summary><pre class="bq-codigo">${esc(a.sql)}</pre></details>` : ''}</td></tr>`).join('')}</tbody></table></details>`).join('') : '<p class="bq-dim">Todavía no hay ejecuciones.</p>') : `
      <div class="bq-df-g"><aside class="bq-df-arbol"><div class="bq-df-acc"><button class="bq-btn" id="dfNuevo">+ File</button></div>${lista.map((f) => `<a href="#" class="bq-df-f${f === ab ? ' on' : ''}" data-f="${esc(f)}">${esc(f)}</a>`).join('')}</aside>
        <section class="bq-df-ed"><div class="bq-cab"><code>${esc(ab)}</code><span class="bq-sp"></span>${/^definitions\//.test(ab) ? '<button class="bq-icono" id="dfBorrar" title="Delete file">✕</button>' : ''}</div><textarea id="dfTxt" spellcheck="false" aria-label="File content">${esc(df.files[ab] || '')}</textarea>
          <div class="bq-df-estado">${comp.errores.length ? `<div class="bq-err-caja">${comp.errores.map(esc).join('<br>')}</div>` : `<span class="bq-verde">✓ Compiled: ${comp.acciones.filter((a) => a.tipo !== 'declaration').length} actions</span>`}</div>
          ${accion && accion.tipo !== 'declaration' ? `<details open><summary>Compiled query</summary><pre class="bq-codigo">${esc(accion.sql)}</pre>${accion.sqlInc ? `<p class="bq-dim bq-chico">En una corrida incremental:</p><pre class="bq-codigo">${esc(accion.sqlInc)}</pre>` : ''}</details>` : ''}</section></div>
      <h2>Compiled graph</h2>${grafo()}
      <div class="bq-acciones"><button class="bq-btn bq-pri" id="dfEjec" ${comp.errores.length ? 'disabled' : ''}>▶ Start execution · All actions</button>${accion && accion.tipo !== 'declaration' ? `<button class="bq-btn" id="dfEjecUna">▶ Execute ${esc(accion.nombre)} (with dependencies)</button>` : ''}</div><div id="dfRes"></div>`}</div>`, 'dataform');
    if (vista2 === 'ejecuciones') return;
    const txt = main.querySelector('#dfTxt');
    txt.oninput = () => { df.files[ab] = txt.value; guardar(C); clearTimeout(txt._t); txt._t = setTimeout(() => { comp = compilar(df.files); const est = main.querySelector('.bq-df-estado'); est.innerHTML = comp.errores.length ? `<div class="bq-err-caja">${comp.errores.map(esc).join('<br>')}</div>` : `<span class="bq-verde">✓ Compiled: ${comp.acciones.filter((a) => a.tipo !== 'declaration').length} actions</span>`; main.querySelector('#dfEjec').disabled = !!comp.errores.length; }, 400); };
    main.querySelectorAll('[data-f]').forEach((a) => { a.onclick = (e) => { e.preventDefault(); df.abierto = a.dataset.f; guardar(C); C.dibujar(); }; });
    main.querySelector('#dfNuevo').onclick = () => { const n = prompt('Nombre del archivo (por ejemplo definitions/marts/clientes.sqlx)', 'definitions/marts/nuevo.sqlx'); if (!n || !/^definitions\/[\w/-]+\.sqlx$/.test(n)) return; df.files[n] = 'config {\n  type: "table"\n}\n\nSELECT 1 AS x\n'; df.abierto = n; guardar(C); C.dibujar(); };
    const bb = main.querySelector('#dfBorrar'); if (bb) bb.onclick = () => { if (!confirm(`¿Borrar ${ab}?`)) return; delete df.files[ab]; df.abierto = null; guardar(C); C.dibujar(); };
    const mostrarEj = (ej) => { main.querySelector('#dfRes').innerHTML = `<h2>Execution ${estadoChip(ej.estado)}</h2><table class="bq-tabla"><thead><tr><th>Status</th><th>Action</th><th>Type</th><th class="bq-der">Duration</th><th>Details</th></tr></thead><tbody>${ej.acciones.map((a) => `<tr><td>${estadoChip(a.estado)}</td><td><b>${esc(a.nombre)}</b></td><td>${a.tipo}</td><td class="bq-der">${a.ms} ms</td><td class="bq-chico">${esc(a.error || '')}</td></tr>`).join('')}</tbody></table>`; };
    main.querySelector('#dfEjec').onclick = async (e) => { e.target.disabled = true; e.target.textContent = 'Ejecutando…'; mostrarEj(await ejecutarDataform(C, compilar(df.files))); e.target.disabled = false; e.target.textContent = '▶ Start execution · All actions'; };
    const eu = main.querySelector('#dfEjecUna'); if (eu) eu.onclick = async () => { const c2 = compilar(df.files); const sel = new Set(); const agregar = (n) => { if (sel.has(n)) return; sel.add(n); const a = c2.acciones.find((x) => x.nombre === n); if (a) a.deps.forEach(agregar); }; agregar(accion.nombre); mostrarEj(await ejecutarDataform(C, c2, [...sel])); };
  };

  // ------------------------------------------------------------------ Overview y Search
  P.resumen = async (C) => {
    const { esc, marco, main, href, M } = C; const s = M().st();
    main.innerHTML = marco(`<div class="bq-pag"><h1>Welcome to BigQuery</h1><p class="bq-dim">Proyecto <b>${esc(M().PROYECTO)}</b> · ubicación US. BigQuery es un warehouse <b>serverless</b>: no hay servidores ni clústeres que encender; pagas por los datos que procesa cada consulta (on-demand) o por capacidad reservada (slots).</p>
      <div class="bq-acciones"><a class="bq-btn bq-pri" href="${href('')}">${C.ic('mas')} SQL query</a><a class="bq-btn" href="${href('programadas')}">Schedule a query</a><a class="bq-btn" href="${href('transferencias')}">Create a transfer</a><a class="bq-btn" href="${href('dataform')}">Open Dataform</a></div>
      <div class="bq-kpis" id="bqKpis"><div><small>Datasets</small><b>…</b></div></div>
      <h2>Recent queries</h2>${s.jobs.filter((j) => j.tipo === 'QUERY').slice(0, 6).map((j) => `<div class="bq-rec">${j.estado === 'FAILED' ? '<span class="bq-rojo">●</span>' : '<span class="bq-verde">●</span>'} <code>${esc(j.sql.slice(0, 110))}</code> <span class="bq-dim bq-chico">${fh(j.inicio)} · ${M().fmtBytes(j.procesado || 0)}</span></div>`).join('') || '<p class="bq-dim">Todavía no ejecutaste consultas.</p>'}
      <h2>Qué hay en la práctica</h2><table class="bq-tabla"><tbody>
        <tr><td><a href="${href('')}">Studio</a></td><td>Editor con validación (dry run), resultados, explorador, tablas particionadas y clustering</td></tr>
        <tr><td><a href="${href('programadas')}">Scheduled queries</a></td><td>SQL con horario UTC, @run_date, destino con WRITE_APPEND/TRUNCATE y backfill</td></tr>
        <tr><td><a href="${href('transferencias')}">Data transfers</a></td><td>Archivos de tus buckets de S3 o Cloud Storage a una tabla, con horario</td></tr>
        <tr><td><a href="${href('dataform')}">Dataform</a></td><td>SQLX con ref(), incrementales y assertions, grafo y ejecuciones</td></tr>
        <tr><td><a href="${href('sharing')}">Analytics Hub</a></td><td>Publicar un dataset y suscribirse: linked dataset de solo lectura</td></tr>
        <tr><td><a href="${href('capacidad')}">Capacity management</a></td><td>Reservas de slots por edición y comparación de costos con on-demand</td></tr></tbody></table></div>`, 'resumen');
    try { const dss = await M().datasets(); let n = 0; for (const d of dss) n += (await M().tablas(d)).length; const k = main.querySelector('#bqKpis'); if (k) k.innerHTML = `<div><small>Datasets</small><b>${dss.length}</b></div><div><small>Tables and views</small><b>${n}</b></div><div><small>Jobs (práctica)</small><b>${s.jobs.length}</b></div><div><small>Scheduled</small><b>${s.programadas.filter((x) => x.activa).length + s.transferencias.filter((x) => x.activa).length}</b><small>consultas y transferencias activas</small></div>`; } catch (e) { /* motor sin cargar */ }
  };
  P.buscar = (C) => {
    const { esc, marco, main, href, M } = C; const q0 = new URLSearchParams(location.hash.split('?')[1] || '').get('q') || '';
    main.innerHTML = marco(`<div class="bq-pag"><h1>Search</h1><p class="bq-dim">Busca datasets, tablas, vistas y columnas en todo el proyecto (en Google Cloud la búsqueda usa el catálogo universal de Dataplex, con las descripciones y etiquetas de cada recurso).</p>
      <form id="bqSF" class="bq-sform"><input id="bqSQ" value="${esc(q0)}" placeholder="Por ejemplo: canal, pedidos, fecha" aria-label="Search"><button class="bq-btn bq-pri">Search</button></form><div id="bqSR"></div></div>`, 'buscar');
    const buscar = async (q) => {
      const R = main.querySelector('#bqSR'); if (!q) { R.innerHTML = ''; return; } R.innerHTML = '<p class="bq-dim">Buscando…</p>'; const t = q.toLowerCase(); const res = [];
      for (const ds of await M().datasets()) { if (ds.toLowerCase().includes(t)) res.push(['Dataset', ds, '', href('d/' + ds)]); for (const tb of await M().tablas(ds)) { if (tb.nombre.toLowerCase().includes(t)) res.push([tb.vista ? 'View' : 'Table', `${ds}.${tb.nombre}`, '', href(`t/${ds}/${tb.nombre}`)]); for (const c of await M().columnas(ds, tb.nombre)) if (c.nombre.toLowerCase().includes(t)) res.push(['Column', `${ds}.${tb.nombre}.${c.nombre}`, c.tipo, href(`t/${ds}/${tb.nombre}`)]); } }
      R.innerHTML = res.length ? `<p class="bq-dim">${res.length} resultados</p><table class="bq-tabla"><thead><tr><th>Type</th><th>Name</th><th>Data type</th></tr></thead><tbody>${res.slice(0, 200).map(([k, n, ty, h]) => `<tr><td>${k}</td><td><a href="${h}">${esc(n)}</a></td><td>${esc(ty)}</td></tr>`).join('')}</tbody></table>` : '<p class="bq-dim">Sin resultados.</p>';
    };
    main.querySelector('#bqSF').onsubmit = (e) => { e.preventDefault(); buscar(main.querySelector('#bqSQ').value.trim()); };
    if (q0) buscar(q0);
  };

  // ------------------------------------------------------------------ Sharing (Analytics Hub)
  P.sharing = async (C) => {
    const { esc, marco, main, M } = C; const s = M().st();
    if (!s.exchanges.length) s.exchanges.push({ id: 'publico', nombre: 'Datos de la tienda (público de la práctica)', propio: false, listados: [{ id: id(), nombre: 'Ventas de la tienda', ds: 'tienda', desc: 'Pedidos, clientes y productos de Tienda Andina.' }] });
    const dss = await M().datasets();
    main.innerHTML = marco(`<div class="bq-pag"><div class="bq-cab"><h1>Sharing (Analytics Hub)</h1><span class="bq-sp"></span><button class="bq-btn bq-pri" id="bqNuevoX">${C.ic('mas')} Create exchange</button></div>
      <p class="bq-dim"><b>Analytics Hub</b> comparte datasets entre proyectos u organizaciones <b>sin copiar los datos</b>. Quien publica arma un <b>exchange</b> con <b>listings</b> (cada uno, un dataset); quien se suscribe recibe un <b>linked dataset</b>: lo consulta como propio, siempre actualizado y de <b>solo lectura</b>. Quien consulta paga sus consultas; quien publica, el almacenamiento.</p>
      ${s.exchanges.map((x) => `<section class="bq-x"><h2>${esc(x.nombre)} ${x.propio ? '<span class="bq-chip">tu exchange</span>' : ''}</h2>${x.listados.map((l) => { const sub = Object.entries(s.vinculados).find(([, v]) => v.listado === l.id); return `<div class="bq-listado"><div><b>${esc(l.nombre)}</b><div class="bq-dim bq-chico">dataset de origen: ${esc(l.ds)} · ${esc(l.desc || '')}</div></div><span class="bq-sp"></span>${sub ? `<span class="bq-verde">✓ Suscripto: <a href="#/bigquery/d/${esc(sub[0])}">${esc(sub[0])}</a></span>` : `<button class="bq-btn" data-sub="${esc(l.id)}" data-ds="${esc(l.ds)}">Subscribe</button>`}</div>`; }).join('') || '<p class="bq-dim">Sin listings.</p>'}${x.propio ? `<div class="bq-acciones"><select data-lds="${esc(x.id)}" aria-label="Dataset to publish">${dss.filter((d) => !s.vinculados[d]).map((d) => `<option>${esc(d)}</option>`).join('')}</select><button class="bq-btn" data-publicar="${esc(x.id)}">+ Create listing</button></div>` : ''}</section>`).join('')}
      ${Object.keys(s.vinculados).length ? `<h2>Tus linked datasets</h2><table class="bq-tabla"><thead><tr><th>Linked dataset</th><th>Source dataset</th><th>Subscribed</th></tr></thead><tbody>${Object.entries(s.vinculados).map(([d, v]) => `<tr><td><a href="#/bigquery/d/${esc(d)}">${esc(d)}</a></td><td>${esc(v.origen)}</td><td>${fh(v.cuando)}</td></tr>`).join('')}</tbody></table><p class="bq-dim bq-chico">Prueba un INSERT o un CREATE TABLE en un linked dataset: BigQuery lo rechaza con Access Denied.</p>` : ''}</div>`, 'sharing');
    main.querySelector('#bqNuevoX').onclick = () => { const n = prompt('Nombre del exchange', 'Datos del equipo de analítica'); if (!n) return; s.exchanges.push({ id: id(), nombre: n, propio: true, listados: [] }); guardar(C); C.dibujar(); };
    main.querySelectorAll('[data-publicar]').forEach((b) => { b.onclick = () => { const x = s.exchanges.find((y) => y.id === b.dataset.publicar); const ds = main.querySelector(`[data-lds="${b.dataset.publicar}"]`).value; if (!ds) return; x.listados.push({ id: id(), nombre: `Dataset ${ds}`, ds, desc: 'Publicado por ti' }); guardar(C); C.dibujar(); }; });
    main.querySelectorAll('[data-sub]').forEach((b) => { b.onclick = async () => { const n = prompt('Nombre del linked dataset en tu proyecto', `${b.dataset.ds}_compartido`); if (!n) return; try { await M().crearVinculado(n, b.dataset.ds, b.dataset.sub); C.toast(`Listo: ${n} aparece en el explorador de Studio`); C.dibujar(); } catch (e) { C.toast(e.message); } }; });
  };

  // ------------------------------------------------------------------ Capacity management
  const PRECIO_SLOT = { STANDARD: 0.04, ENTERPRISE: 0.06, ENTERPRISE_PLUS: 0.10 };
  P.capacidad = (C) => {
    const { esc, marco, main, M } = C; const s = M().st(); const cap = s.capacidad;
    const mes = Date.now() - 30 * 864e5; const jobsMes = s.jobs.filter((j) => j.tipo === 'QUERY' && j.estado === 'DONE' && j.inicio >= mes);
    const onDemand = jobsMes.reduce((a, j) => a + (j.facturado || 0), 0) / 1024 ** 4 * M().USD_POR_TIB;
    // slot-ms aproximados: el tiempo de la consulta por los slots que usó (más slots cuantos más datos leyó)
    const slotMs = jobsMes.reduce((a, j) => a + Math.max(j.ms, 10) * Math.min(2000, 1 + Math.round((j.procesado || 0) / (64 * 1024 * 1024))), 0);
    const R = cap.reservas;
    const costoR = (r) => { const p = PRECIO_SLOT[r.edicion]; const base = r.base * p * 730; const auto = r.max > r.base ? (slotMs / 36e5) * p : 0; return { base, auto, total: base + auto }; };
    main.innerHTML = marco(`<div class="bq-pag"><div class="bq-cab"><h1>Capacity management</h1><span class="bq-sp"></span><button class="bq-btn bq-pri" id="bqNuevaR">${C.ic('mas')} Create reservation</button></div>
      <p class="bq-dim">BigQuery tiene dos formas de pagar el cómputo: <b>on-demand</b> (USD ${M().USD_POR_TIB} por TiB procesado, sin compromiso) y <b>capacidad</b>: reservas de <b>slots</b> (unidades de CPU virtual) por edición (Standard, Enterprise, Enterprise Plus), con un mínimo fijo (<i>baseline</i>, que se cobra las 24 horas aunque no corra nada) y un máximo que se usa con <b>autoscaling</b> (se cobra solo lo usado). Un proyecto <i>asignado</i> a una reserva deja de pagar por bytes.</p>
      <div class="bq-kpis"><div><small>On-demand (últimos 30 días, práctica)</small><b>USD ${onDemand.toFixed(4)}</b><small>por los bytes facturados de tus consultas</small></div><div><small>Slot-hours usadas (aprox.)</small><b>${(slotMs / 36e5).toFixed(4)}</b><small>tiempo de cada consulta × slots que usó</small></div></div>
      ${R.length ? `<h2>Reservations</h2><table class="bq-tabla"><thead><tr><th>Name</th><th>Edition</th><th class="bq-der">Baseline slots</th><th class="bq-der">Max slots</th><th>Assignment</th><th class="bq-der">Cost / month (baseline)</th><th class="bq-der">Autoscaled (30 d)</th><th></th></tr></thead><tbody>${R.map((r, i) => { const c = costoR(r); return `<tr><td><b>${esc(r.nombre)}</b></td><td>${r.edicion.replace('_', ' ')}</td><td class="bq-der">${r.base}</td><td class="bq-der">${r.max}</td><td>${r.asignado ? `project ${esc(M().PROYECTO)} (QUERY)` : '—'}</td><td class="bq-der">USD ${c.base.toFixed(2)}</td><td class="bq-der">USD ${c.auto.toFixed(4)}</td><td><button class="bq-btn" data-asig="${i}">${r.asignado ? 'Remove assignment' : 'Assign project'}</button> <button class="bq-icono" data-borrar="${i}" title="Delete">✕</button></td></tr>`; }).join('')}</tbody></table>` : '<div class="bq-vacio"><p>No hay reservas: el proyecto usa on-demand.</p></div>'}
      <h2>¿Cuándo conviene una reserva?</h2><table class="bq-tabla"><thead><tr><th>Edición</th><th class="bq-der">USD por slot-hora</th><th class="bq-der">100 slots de baseline, 1 mes</th><th>Para qué</th></tr></thead><tbody>${Object.entries(PRECIO_SLOT).map(([k, p]) => `<tr><td>${k.replace('_', ' ')}</td><td class="bq-der">${p.toFixed(2)}</td><td class="bq-der">USD ${(p * 100 * 730).toFixed(0)}</td><td class="bq-chico">${k === 'STANDARD' ? 'Cargas simples, sin compromisos de largo plazo' : k === 'ENTERPRISE' ? 'Lo habitual en empresas: seguridad avanzada, BigQuery ML, compromisos de 1 o 3 años con descuento' : 'Cumplimiento regulatorio y recuperación ante desastres entre regiones'}</td></tr>`).join('')}</tbody></table>
      <p class="bq-dim">Regla práctica: si la factura on-demand de un mes supera lo que costaría el baseline de una reserva chica, o si necesitas un costo fijo y predecible, conviene capacidad. Con baseline 0 y autoscaling se paga solo lo usado, por slot-hora. Los precios son de lista en EE. UU. y cambian por región y por compromisos.</p>
      <div class="bq-modal" id="bqModal" hidden></div></div>`, 'capacidad');
    main.querySelector('#bqNuevaR').onclick = () => {
      const m = main.querySelector('#bqModal');
      m.innerHTML = `<div class="bq-modal-c bq-form"><div class="bq-cab"><h2>Create reservation</h2><span class="bq-sp"></span><button class="bq-icono" data-cerrar>✕</button></div>
        <label>Reservation name<input id="rN" value="analitica-prod"></label><label>Edition<select id="rE"><option value="STANDARD">Standard</option><option value="ENTERPRISE" selected>Enterprise</option><option value="ENTERPRISE_PLUS">Enterprise Plus</option></select></label>
        <label>Baseline slots<input id="rB" type="number" min="0" step="50" value="0"></label><label>Max reservation size (slots, múltiplo de 50)<input id="rM" type="number" min="50" step="50" value="100"></label>
        <p class="bq-dim bq-chico" id="rC"></p><div id="rErr"></div><div class="bq-acciones"><button class="bq-btn" data-cerrar>Cancel</button><button class="bq-btn bq-pri" id="rOk">Save</button></div></div>`;
      m.hidden = false; m.querySelectorAll('[data-cerrar]').forEach((x) => { x.onclick = () => { m.hidden = true; }; });
      const upd = () => { const p = PRECIO_SLOT[m.querySelector('#rE').value]; const b = Number(m.querySelector('#rB').value) || 0; m.querySelector('#rC').textContent = `Baseline: USD ${(b * p * 730).toFixed(2)} por mes (se cobra siempre). Lo que use el autoscaling hasta ${m.querySelector('#rM').value} slots se cobra a USD ${p} por slot-hora.`; };
      m.querySelectorAll('input,select').forEach((x) => { x.oninput = upd; }); upd();
      m.querySelector('#rOk').onclick = () => { const b = Number(m.querySelector('#rB').value), mx = Number(m.querySelector('#rM').value); if (mx % 50 || b % 50 || b > mx || mx < 50) { m.querySelector('#rErr').innerHTML = '<div class="bq-err-caja">Los slots van de a 50: el baseline (puede ser 0) no puede superar al máximo.</div>'; return; } cap.reservas.push({ nombre: m.querySelector('#rN').value.trim() || 'reserva', edicion: m.querySelector('#rE').value, base: b, max: mx, asignado: false, creada: Date.now() }); guardar(C); m.hidden = true; C.dibujar(); };
    };
    main.querySelectorAll('[data-asig]').forEach((b) => { b.onclick = () => { const r = R[Number(b.dataset.asig)]; R.forEach((x) => { if (x !== r) x.asignado = false; }); r.asignado = !r.asignado; guardar(C); C.toast(r.asignado ? 'Proyecto asignado: sus consultas usan la reserva (sin costo por bytes)' : 'Asignación quitada: vuelve a on-demand'); C.dibujar(); }; });
    main.querySelectorAll('[data-borrar]').forEach((b) => { b.onclick = () => { if (!confirm('¿Eliminar la reserva?')) return; R.splice(Number(b.dataset.borrar), 1); guardar(C); C.dibujar(); }; });
  };

  P._interno = { parseHorario, vencimientos, compilar };
  window.BigQueryPaginas = P;
})();
