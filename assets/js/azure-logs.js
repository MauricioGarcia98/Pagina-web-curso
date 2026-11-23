/* Portal de Azure de práctica — Log Analytics (según la documentación pública de Azure Monitor):
 *   - Log Analytics workspace: crear, Logs (KQL), Tables, Usage and estimated costs, Data retention.
 *   - Diagnostic settings por recurso (Data Factory, Storage, Key Vault) y para el Activity log de la suscripción:
 *     categorías, destino (workspace, storage, event hub) y, en Data Factory, tabla "Resource specific" o "Azure diagnostics".
 *   - Las tablas se arman con lo que pasó de verdad en la práctica: corridas de pipelines del Studio (ADFPipelineRun,
 *     ADFActivityRun), operaciones de blobs y de secretos hechas con la CLI (StorageBlobLogs, AzureDiagnostics) y el
 *     Activity log (AzureActivity). Solo entra lo que ocurrió después de crear el Diagnostic setting, como en Azure.
 *   - Alertas de búsqueda de logs (log search alerts): consulta, ventana, frecuencia, umbral y grupo de acciones.
 * Las consultas usan el KQL de práctica (kql.js).
 */
(function () {
  'use strict';
  const P = window.AzurePortal; if (!P || !P._i || !P.ext) return;
  const { az, guardarAz, esc, ic, uid, ahora, hora, panel, migas, svg, actividad, notificar, ir, recursos, idRecurso, TIPOS, REGIONES, regionNombre, toast, sub } = P._i;
  const guardar = () => guardarAz();
  const iso = (t) => (t ? new Date(t).toISOString().slice(0, 19) : null);
  const guid = () => `${uid(8)}-${uid(4)}-4${uid(3)}-a${uid(3)}-${uid(12)}`;
  const campo = (etiqueta, html, ayuda = '') => `<label class="az-campo"><span>${esc(etiqueta)}</span>${html}${ayuda ? `<small class="az-dim">${ayuda}</small>` : ''}</label>`;
  const tabla = (cab, filas, vacio) => (filas.length ? `<table class="az-tabla"><thead><tr>${cab.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${filas.join('')}</tbody></table>` : `<div class="az-vacio">${esc(vacio)}</div>`);
  const law = () => (az().law = az().law || {});
  const diags = () => (az().diag = az().diag || []);
  const monitor = () => { const s = az(); return (s.monitor = s.monitor || { reglas: [], grupos: [], disparadas: [] }); };

  // ------------------------------------------------------------------ categorías de cada tipo de recurso
  const CATEGORIAS = {
    adf: [['PipelineRuns', 'Pipeline runs log'], ['ActivityRuns', 'Activity runs log'], ['TriggerRuns', 'Trigger runs log']],
    storage: [['StorageRead', 'StorageRead'], ['StorageWrite', 'StorageWrite'], ['StorageDelete', 'StorageDelete']],
    kv: [['AuditEvent', 'Audit Logs']],
    sub: [['Administrative', 'Administrative'], ['Security', 'Security'], ['ServiceHealth', 'Service Health'], ['Alert', 'Alert'], ['Policy', 'Policy']],
  };
  const PROVEEDOR = { adf: 'MICROSOFT.DATAFACTORY', storage: 'MICROSOFT.STORAGE', kv: 'MICROSOFT.KEYVAULT' };
  const idDe = (k, n) => { if (k === 'sub') return `/subscriptions/${sub().id}`; const R = az()[k] && az()[k][n]; return R ? idRecurso(k, n, R) : ''; };

  // ------------------------------------------------------------------ las tablas de un workspace
  // Cada fila respeta: el Diagnostic setting tiene que existir y apuntar a este workspace, la categoría tiene que estar
  // marcada, el evento tiene que ser posterior a la creación del setting y estar dentro de la retención.
  const COLS = {
    AzureActivity: [['TimeGenerated', 'datetime'], ['OperationNameValue', 'string'], ['ActivityStatusValue', 'string'], ['Caller', 'string'], ['ResourceGroup', 'string'], ['Resource', 'string'], ['CategoryValue', 'string'], ['Level', 'string'], ['_ResourceId', 'string']],
    ADFPipelineRun: [['TimeGenerated', 'datetime'], ['Resource', 'string'], ['PipelineName', 'string'], ['RunId', 'string'], ['Status', 'string'], ['Start', 'datetime'], ['End', 'datetime'], ['FailureType', 'string'], ['Parameters', 'string'], ['Category', 'string'], ['_ResourceId', 'string']],
    ADFActivityRun: [['TimeGenerated', 'datetime'], ['Resource', 'string'], ['PipelineName', 'string'], ['PipelineRunId', 'string'], ['ActivityName', 'string'], ['ActivityType', 'string'], ['Status', 'string'], ['Start', 'datetime'], ['End', 'datetime'], ['ErrorCode', 'string'], ['ErrorMessage', 'string'], ['FailureType', 'string'], ['Category', 'string'], ['_ResourceId', 'string']],
    ADFTriggerRun: [['TimeGenerated', 'datetime'], ['Resource', 'string'], ['TriggerName', 'string'], ['TriggerType', 'string'], ['Status', 'string'], ['Start', 'datetime'], ['PipelineName', 'string'], ['Category', 'string'], ['_ResourceId', 'string']],
    StorageBlobLogs: [['TimeGenerated', 'datetime'], ['AccountName', 'string'], ['OperationName', 'string'], ['StatusCode', 'string'], ['StatusText', 'string'], ['AuthenticationType', 'string'], ['RequesterUpn', 'string'], ['CallerIpAddress', 'string'], ['Uri', 'string'], ['Category', 'string'], ['_ResourceId', 'string']],
    AzureDiagnostics: [['TimeGenerated', 'datetime'], ['ResourceProvider', 'string'], ['Resource', 'string'], ['Category', 'string'], ['OperationName', 'string'], ['ResultSignature', 'string'], ['httpStatusCode_d', 'real'], ['requestUri_s', 'string'], ['CallerIPAddress', 'string'], ['identity_claim_upn_s', 'string'], ['status_s', 'string'], ['pipelineName_s', 'string'], ['runId_g', 'string'], ['activityName_s', 'string'], ['start_t', 'datetime'], ['end_t', 'datetime'], ['_ResourceId', 'string']],
  };
  const TEXTO_HTTP = { 200: 'Success', 201: 'Success', 400: 'ClientOtherError', 403: 'AuthorizationFailure', 404: 'ResourceNotFound', 409: 'BlobAlreadyExists' };
  const fila = (tabla, o) => COLS[tabla].map(([c]) => (o[c] === undefined ? null : o[c]));
  function tablasDe(nombreLaw, { recursoId = null, desde = null } = {}) {
    const W = law()[nombreLaw]; const out = {}; for (const t of Object.keys(COLS)) out[t] = { cols: COLS[t].map(([n, ty]) => ({ n, t: ty })), filas: [] };
    if (!W) return out;
    const limite = Math.max(Date.now() - (W.retencion || 30) * 864e5, desde || 0);
    const vale = (t, d) => { const ms = new Date(t + (t && t.length === 19 ? 'Z' : '')).getTime(); return ms >= limite && ms >= new Date(d.creado).getTime(); };
    for (const d of diags().filter((x) => x.law === nombreLaw)) {
      const [k, n] = d.recurso.split('/'); const rid = idDe(k, n); if (k !== 'sub' && !rid) continue; // el recurso ya no existe
      if (recursoId && rid !== recursoId) continue;
      const cat = (c) => d.categorias.includes(c); const ad = d.tablaDestino === 'AzureDiagnostics';
      if (k === 'sub' && cat('Administrative')) {
        for (const a of az().actividad || []) { const t = iso(a.t); if (!vale(t, d)) continue; const r = recursos().find((x) => x.n === a.recurso); out.AzureActivity.filas.push(fila('AzureActivity', { TimeGenerated: t, OperationNameValue: a.op, ActivityStatusValue: a.estado === 'Succeeded' ? 'Success' : a.estado, Caller: a.quien && a.quien.upn ? a.quien.upn : typeof a.quien === 'string' ? a.quien : 'alumno@academia.dev', ResourceGroup: (a.rg || (r && r.r.rg) || (az().groups[a.recurso] || /Resource Group/.test(a.op) ? a.recurso : '')).toUpperCase(), Resource: a.recurso, CategoryValue: 'Administrative', Level: a.estado === 'Failed' ? 'Error' : 'Informational', _ResourceId: r ? idRecurso(r.k, r.n, r.r).toLowerCase() : '' })); }
      }
      if (k === 'adf') {
        const S = (az().adf[n] || {}).studio || { runs: [] };
        for (const r of S.runs || []) {
          if (r.debug) continue; // las ejecuciones de Debug no se envían a Azure Monitor
          const base = { Resource: n.toUpperCase(), PipelineName: r.pipeline, _ResourceId: rid.toLowerCase() };
          // como en Azure: una fila cuando arranca (InProgress) y otra cuando termina
          const estados = [['InProgress', r.inicio], ...(r.fin ? [[r.estado, r.fin]] : [])];
          if (cat('PipelineRuns')) for (const [est, t] of estados) { const tt = iso(t); if (!vale(tt, d)) continue; if (ad) out.AzureDiagnostics.filas.push(fila('AzureDiagnostics', { TimeGenerated: tt, ResourceProvider: PROVEEDOR.adf, Resource: base.Resource, Category: 'PipelineRuns', OperationName: `${r.pipeline} - ${est}`, status_s: est, pipelineName_s: r.pipeline, runId_g: r.runId, start_t: iso(r.inicio), end_t: est === 'InProgress' ? null : iso(r.fin), _ResourceId: base._ResourceId })); else out.ADFPipelineRun.filas.push(fila('ADFPipelineRun', { ...base, TimeGenerated: tt, RunId: r.runId, Status: est, Start: iso(r.inicio), End: est === 'InProgress' ? null : iso(r.fin), FailureType: est === 'Failed' ? ((r.error && r.error.failureType) || 'UserError') : null, Parameters: JSON.stringify(r.params || {}), Category: 'PipelineRuns' })); }
          if (cat('ActivityRuns')) for (const a of r.acts || []) for (const [est, t] of [['InProgress', a.inicio], ...(a.fin ? [[a.estado, a.fin]] : [])]) { const tt = iso(t); if (!vale(tt, d)) continue; const er = est === 'Failed' && a.error ? a.error : null; if (ad) out.AzureDiagnostics.filas.push(fila('AzureDiagnostics', { TimeGenerated: tt, ResourceProvider: PROVEEDOR.adf, Resource: base.Resource, Category: 'ActivityRuns', OperationName: `${a.name} - ${est}`, status_s: est, pipelineName_s: r.pipeline, runId_g: r.runId, activityName_s: a.name, start_t: iso(a.inicio), end_t: est === 'InProgress' ? null : iso(a.fin), _ResourceId: base._ResourceId })); else out.ADFActivityRun.filas.push(fila('ADFActivityRun', { ...base, TimeGenerated: tt, PipelineRunId: r.runId, ActivityName: a.name, ActivityType: a.type, Status: est, Start: iso(a.inicio), End: est === 'InProgress' ? null : iso(a.fin), ErrorCode: er ? String(er.errorCode) : null, ErrorMessage: er ? String(er.message).split('\n')[0].slice(0, 300) : null, FailureType: er ? er.failureType : null, Category: 'ActivityRuns' })); }
          if (cat('TriggerRuns') && r.trigger && !['Manual', 'Debug'].includes(r.trigger)) { const tt = iso(r.inicio); if (vale(tt, d)) out.ADFTriggerRun.filas.push(fila('ADFTriggerRun', { Resource: base.Resource, _ResourceId: base._ResourceId, TimeGenerated: tt, TriggerName: r.trigger, TriggerType: 'ScheduleTrigger', Status: 'Succeeded', Start: tt, PipelineName: r.pipeline, Category: 'TriggerRuns' })); }
        }
      }
      if (k === 'storage' || k === 'kv') {
        for (const e of az().auditoria || []) {
          if (e.recurso !== n || e.tipo !== k || !vale(e.t, d)) continue;
          if (k === 'storage') { const c = /^Put/.test(e.op) ? 'StorageWrite' : /^Delete/.test(e.op) ? 'StorageDelete' : 'StorageRead'; if (!cat(c)) continue; out.StorageBlobLogs.filas.push(fila('StorageBlobLogs', { TimeGenerated: e.t, AccountName: n, OperationName: e.op, StatusCode: String(e.status), StatusText: TEXTO_HTTP[e.status] || 'ClientOtherError', AuthenticationType: e.auth, RequesterUpn: e.auth === 'OAuth' ? e.quien : null, CallerIpAddress: `${e.ip}:${40000 + (e.t.charCodeAt(18) || 0) * 37}`, Uri: e.uri, Category: c, _ResourceId: `${rid}/blobServices/default`.toLowerCase() })); }
          else if (cat('AuditEvent')) out.AzureDiagnostics.filas.push(fila('AzureDiagnostics', { TimeGenerated: e.t, ResourceProvider: PROVEEDOR.kv, Resource: n.toUpperCase(), Category: 'AuditEvent', OperationName: e.op, ResultSignature: e.status < 300 ? 'OK' : e.status === 404 ? 'Not Found' : e.status === 403 ? 'Forbidden' : 'Bad Request', httpStatusCode_d: e.status, requestUri_s: `${e.uri}?api-version=7.5`, CallerIPAddress: e.ip, identity_claim_upn_s: e.quien, _ResourceId: rid.toLowerCase() }));
        }
      }
    }
    for (const t of Object.values(out)) t.filas.sort((a, b) => String(b[0]).localeCompare(String(a[0])));
    return out;
  }

  // ------------------------------------------------------------------ consultas de ejemplo (panel "Queries")
  const EJEMPLOS = [
    ['Data Factory', 'Pipelines fallidos (últimas 24 h)', 'ADFPipelineRun\n| where TimeGenerated > ago(24h)\n| where Status == "Failed"\n| project TimeGenerated, Resource, PipelineName, RunId, FailureType\n| order by TimeGenerated desc'],
    ['Data Factory', 'Último estado de cada pipeline', 'ADFPipelineRun\n| where Status in ("Succeeded", "Failed", "Cancelled")\n| summarize arg_max(TimeGenerated, *) by PipelineName\n| project PipelineName, Status, TimeGenerated, RunId'],
    ['Data Factory', 'Duración de cada corrida (segundos)', 'ADFPipelineRun\n| where Status in ("Succeeded", "Failed")\n| extend DuracionSeg = datetime_diff("second", End, Start)\n| project PipelineName, Status, Start, DuracionSeg\n| order by Start desc'],
    ['Data Factory', 'Actividades con error y su mensaje', 'ADFActivityRun\n| where Status == "Failed"\n| project TimeGenerated, PipelineName, ActivityName, ActivityType, ErrorCode, ErrorMessage\n| order by TimeGenerated desc'],
    ['Data Factory', 'Corridas por día y estado (gráfico)', 'ADFPipelineRun\n| where Status in ("Succeeded", "Failed")\n| summarize corridas = count() by Status, bin(TimeGenerated, 1d)\n| render timechart'],
    ['Storage', '¿Quién usa la clave de la cuenta?', 'StorageBlobLogs\n| where AuthenticationType == "AccountKey"\n| summarize operaciones = count() by AccountName, OperationName, CallerIpAddress'],
    ['Storage', 'Operaciones con error', 'StorageBlobLogs\n| where StatusCode != "200" and StatusCode != "201"\n| project TimeGenerated, AccountName, OperationName, StatusCode, StatusText, Uri'],
    ['Key Vault', 'Lecturas de secretos', 'AzureDiagnostics\n| where ResourceProvider == "MICROSOFT.KEYVAULT" and OperationName == "SecretGet"\n| project TimeGenerated, Resource, requestUri_s, ResultSignature, identity_claim_upn_s'],
    ['Activity log', 'Quién borró recursos', 'AzureActivity\n| where OperationNameValue startswith "Delete"\n| project TimeGenerated, Caller, OperationNameValue, Resource, ActivityStatusValue'],
  ];
  const RANGOS = [['30m', 'Last 30 minutes', 30], ['1h', 'Last hour', 60], ['4h', 'Last 4 hours', 240], ['24h', 'Last 24 hours', 1440], ['7d', 'Last 7 days', 10080], ['30d', 'Last 30 days', 43200]];

  // ------------------------------------------------------------------ la pantalla Logs (de un workspace o de un recurso)
  const tablaRes = (res, max = 200) => `<div class="az-logs-res"><table class="az-tabla"><thead><tr>${res.columns.map((c) => `<th>${esc(c)}${c === 'TimeGenerated' ? ' [UTC]' : ''}</th>`).join('')}</tr></thead><tbody>${res.values.slice(0, max).map((f) => `<tr>${f.map((v) => `<td>${v == null ? '' : esc(typeof v === 'number' && !Number.isInteger(v) ? Math.round(v * 1000) / 1000 : v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  function pantallaLogs(box, { nombreLaw, recursoId = null, titulo = '' }) {
    const W = law()[nombreLaw]; W.guardadas = W.guardadas || [];
    const T = tablasDe(nombreLaw, { recursoId });
    const conDatos = Object.entries(T).filter(([, t]) => t.filas.length);
    const pref = recursoId ? (recursoId.includes('DataFactory') ? 'ADFPipelineRun' : recursoId.includes('Storage') ? 'StorageBlobLogs' : 'AzureDiagnostics') : (conDatos[0] || ['AzureActivity'])[0];
    W.consulta = W.consulta || `${pref}\n| take 50`;
    const q0 = recursoId ? (box.dataset.q || `${pref}\n| take 50`) : W.consulta;
    box.innerHTML = `<div class="az-logs">
      <div class="az-cmd"><button id="lgRun" class="az-btn primario">${ic('play')} Run</button><label class="az-logs-rango">Time range <select id="lgR">${RANGOS.map(([k, t]) => `<option value="${k}" ${k === (W.rango || '24h') ? 'selected' : ''}>${t}</option>`).join('')}<option value="query">Set in query</option></select></label><button id="lgSave">${ic('save')} Save</button><button id="lgAlerta">${ic('bell')} New alert rule</button><button id="lgEj">${ic('book')} Queries</button></div>
      <div class="az-logs-cuerpo"><aside class="az-logs-esq"><b>${esc(recursoId ? titulo : nombreLaw)}</b><div class="az-dim" style="margin:4px 0 8px">${recursoId ? 'Scope: este recurso' : 'Scope: workspace'}</div>${Object.entries(T).map(([n, t]) => `<details ${t.filas.length ? '' : 'class="az-dim"'}><summary data-t="${n}">${ic('table')} ${esc(n)} <span class="az-dim">${t.filas.length}</span></summary><ul>${t.cols.map((c) => `<li>${esc(c.n)} <span class="az-dim">(${esc(c.t)})</span></li>`).join('')}</ul></details>`).join('')}
        ${W.guardadas.length ? `<div class="az-rmenu-sec" style="margin-top:10px">Saved queries</div>${W.guardadas.map((g, i) => `<a class="az-link" data-g="${i}">${ic('star-full')} ${esc(g.nombre)}</a>`).join('<br>')}` : ''}</aside>
      <section class="az-logs-main"><textarea id="lgQ" class="az-logs-q" spellcheck="false" aria-label="Consulta KQL">${esc(q0)}</textarea><div id="lgOut"></div></section></div></div>`;
    const Q = box.querySelector('#lgQ'); const out = box.querySelector('#lgOut');
    const rangoActual = () => { const v = box.querySelector('#lgR').value; return v === 'query' ? null : RANGOS.find((r) => r[0] === v); };
    const ajustarRango = () => { if (/where\s+TimeGenerated/i.test(Q.value)) box.querySelector('#lgR').value = 'query'; else if (box.querySelector('#lgR').value === 'query') box.querySelector('#lgR').value = W.rango || '24h'; };
    const correr = async () => {
      ajustarRango(); const q = Q.value; if (recursoId) box.dataset.q = q; else W.consulta = q; guardar();
      const r = rangoActual(); const datos = tablasDe(nombreLaw, { recursoId, desde: r ? Date.now() - r[2] * 6e4 : null });
      out.innerHTML = `<p class="az-dim">Running…</p>`;
      try {
        const res = await window.KQL.ejecutar(datos, q);
        out.innerHTML = `<div class="az-pest"><a class="on">Results</a><a class="az-dim">${res.values.length} records · ${res.ms} ms${r ? ` · ${esc(r[1])}` : ' · Set in query'}</a></div>${res.render && res.columns.length >= 2 ? window.KQL.grafico(res, res.render, esc, 'az-logs-graf') : ''}${res.values.length ? tablaRes(res) : '<div class="az-vacio">No results found from the specified time range. Prueba con un rango más amplio, o revisa que el recurso tenga un Diagnostic setting hacia este workspace.</div>'}<details><summary class="az-dim">SQL equivalente (cómo lo ejecuta la práctica)</summary><pre class="az-code">${esc(res.sql)}</pre></details>`;
      } catch (e) { out.innerHTML = `<div class="az-banner error">${ic('error')} <span>${esc(String(e.message || e))}</span></div>`; }
    };
    box.querySelector('#lgRun').onclick = correr;
    Q.onkeydown = (e) => { if (e.shiftKey && e.key === 'Enter') { e.preventDefault(); correr(); } };
    box.querySelector('#lgR').onchange = (e) => { if (e.target.value !== 'query') { W.rango = e.target.value; guardar(); } correr(); };
    box.querySelectorAll('[data-t]').forEach((s) => s.addEventListener('dblclick', () => { Q.value = `${s.dataset.t}\n| take 50`; correr(); }));
    box.querySelectorAll('[data-g]').forEach((a) => (a.onclick = () => { Q.value = W.guardadas[Number(a.dataset.g)].q; correr(); }));
    box.querySelector('#lgEj').onclick = () => panel({ titulo: 'Queries', ok: null, cancelar: 'Close', ancho: 620, cuerpo: `<p class="az-dim">Consultas de ejemplo para operar una plataforma de datos. Haz clic en una para cargarla.</p>${[...new Set(EJEMPLOS.map((x) => x[0]))].map((g) => `<h3>${esc(g)}</h3>${EJEMPLOS.filter((x) => x[0] === g).map((x) => `<a class="az-link az-logs-ej" data-ej="${EJEMPLOS.indexOf(x)}">${ic('symbol-misc')} ${esc(x[1])}</a>`).join('<br>')}`).join('')}`, alAbrir: (p) => p.querySelectorAll('[data-ej]').forEach((a) => (a.onclick = () => { Q.value = EJEMPLOS[Number(a.dataset.ej)][2]; p.querySelector('[data-x]').click(); correr(); })) });
    box.querySelector('#lgSave').onclick = () => panel({ titulo: 'Save as query', ok: 'Save', cuerpo: campo('Query name *', '<input id="sN" placeholder="Pipelines fallidos">') + '<p class="az-dim">Las consultas guardadas quedan en el workspace para todo el equipo (en Azure se guardan en un query pack).</p>', alOk: (p) => { const nom = p.querySelector('#sN').value.trim(); if (!nom) throw new Error('Query name is required.'); W.guardadas.push({ nombre: nom, q: Q.value }); guardar(); pantallaLogs(box, { nombreLaw, recursoId, titulo }); } });
    box.querySelector('#lgAlerta').onclick = () => nuevaAlertaLog(nombreLaw, Q.value);
    if (conDatos.length || /\n/.test(q0)) correr();
  }

  // ------------------------------------------------------------------ alertas de búsqueda de logs
  const OPS = { GreaterThan: ['Greater than', (a, b) => a > b], GreaterThanOrEqual: ['Greater than or equal to', (a, b) => a >= b], LessThan: ['Less than', (a, b) => a < b], Equal: ['Equal to', (a, b) => a === b] };
  function nuevaAlertaLog(nombreLaw, q, despues) {
    const M = monitor(); const laws = Object.keys(law());
    if (!laws.length) { toast('Primero crea un Log Analytics workspace.'); return; }
    panel({ titulo: 'Create an alert rule · Custom log search', ok: 'Create', ancho: 620, cuerpo: `${campo('Scope (Log Analytics workspace) *', `<select id="aW">${laws.map((w) => `<option ${w === nombreLaw ? 'selected' : ''}>${esc(w)}</option>`).join('')}</select>`)}
      ${campo('Search query *', `<textarea id="aQ" class="az-logs-q" style="min-height:110px">${esc(q || 'ADFPipelineRun\n| where Status == "Failed"')}</textarea>`, 'La regla cuenta las filas que devuelve la consulta en la ventana de tiempo.')}
      <div class="az-fila-sel"><label>Measure<select id="aMe"><option>Table rows</option></select></label><label>Operator<select id="aO">${Object.entries(OPS).map(([k, v]) => `<option value="${k}">${v[0]}</option>`).join('')}</select></label><label>Threshold<input id="aU" value="0" style="width:70px"></label></div>
      <div class="az-fila-sel"><label>Lookback period<select id="aV"><option value="5">5 minutes</option><option value="15" selected>15 minutes</option><option value="60">1 hour</option><option value="1440">1 day</option></select></label><label>Frequency of evaluation<select id="aF"><option value="5" selected>5 minutes</option><option value="15">15 minutes</option><option value="60">1 hour</option></select></label></div>
      ${campo('Alert rule name *', '<input id="aN" placeholder="alerta-pipeline-fallido">')}
      <div class="az-fila-sel"><label>Severity<select id="aS">${[0, 1, 2, 3, 4].map((s) => `<option value="${s}" ${s === 1 ? 'selected' : ''}>${s} - ${['Critical', 'Error', 'Warning', 'Informational', 'Verbose'][s]}</option>`).join('')}</select></label><label>Action group<select id="aG"><option value="">(none)</option>${M.grupos.map((g) => `<option>${esc(g.nombre)}</option>`).join('')}</select></label></div>
      <p class="az-dim">Los datos de logs llegan al workspace con unos minutos de demora; por eso la ventana (lookback) suele ser mayor que la frecuencia. Una alerta de logs cobra por regla evaluada (aprox. US$1,50 al mes con frecuencia de 5 minutos).</p>`,
    alOk: (p) => {
      const nom = p.querySelector('#aN').value.trim(); if (!nom) throw new Error('Alert rule name is required.');
      if (M.reglas.some((g) => g.nombre.toLowerCase() === nom.toLowerCase())) throw new Error('An alert rule with this name already exists.');
      const query = p.querySelector('#aQ').value.trim(); try { window.KQL.aSql(query, Object.keys(COLS)); } catch (e) { throw new Error(`The query is not valid: ${e.message}`); }
      const u = Number(p.querySelector('#aU').value); if (Number.isNaN(u)) throw new Error('Threshold must be a number.');
      M.reglas.push({ nombre: nom, tipo: 'log', law: p.querySelector('#aW').value, query, op: p.querySelector('#aO').value, umbral: u, ventana: Number(p.querySelector('#aV').value), frecuencia: Number(p.querySelector('#aF').value), sev: Number(p.querySelector('#aS').value), grupo: p.querySelector('#aG').value, activa: true, estado: '', creada: ahora(), ultima: null });
      actividad('Create or Update Scheduled Query Rule', nom); guardar(); toast(`Alert rule ${nom} created`);
      if (despues) despues(); else ir('monitor/alertas');
    } });
  }
  let evaluando = false;
  async function evaluarLogs(forzar = false) {
    if (evaluando || !window.KQL) return false; evaluando = true; let cambio = false;
    try {
      const M = monitor();
      for (const g of M.reglas.filter((x) => x.tipo === 'log')) {
        if (!g.activa) { g.estado = 'Disabled'; continue; }
        if (!law()[g.law]) { g.estado = 'Workspace not found'; continue; }
        if (!forzar && g.ultima && Date.now() - new Date(g.ultima).getTime() < g.frecuencia * 6e4) continue;
        try {
          const res = await window.KQL.ejecutar(tablasDe(g.law, { desde: Date.now() - g.ventana * 6e4 }), g.query);
          const n = res.values.length; g.valor = n; g.ultima = ahora(); const dispara = OPS[g.op][1](n, g.umbral); const antes = g.estado; g.estado = dispara ? 'Fired' : 'OK'; cambio = true;
          if (dispara && antes !== 'Fired') {
            M.disparadas.unshift({ t: ahora(), regla: g.nombre, sev: g.sev, recurso: g.law, valor: n, grupo: g.grupo }); M.disparadas = M.disparadas.slice(0, 50);
            const ag = M.grupos.find((x) => x.nombre === g.grupo);
            notificar(`Alert fired: ${g.nombre}`, `Sev ${g.sev} · ${g.law}: la consulta devolvió ${n} fila(s) en los últimos ${g.ventana} minutos.${ag ? ` Se avisaría a ${ag.correo} (simulado).` : ' La regla no tiene grupo de acciones: nadie recibe el aviso.'}`, 'error', ['Monitor · Alerts', 'monitor/alertas']);
          }
        } catch (e) { g.estado = 'Query error'; g.error = e.message; cambio = true; }
      }
      if (cambio) guardar();
    } finally { evaluando = false; }
    return cambio;
  }

  // ------------------------------------------------------------------ Diagnostic settings de un recurso (o del Activity log)
  function bladeDiagnosticos(box, k, n, again) {
    const lista = diags().filter((d) => d.recurso === `${k}/${n}`); const cats = CATEGORIAS[k];
    box.innerHTML = `<div class="az-cmd"><button id="dAdd">${ic('add')} Add diagnostic setting</button><button id="dRef">${ic('refresh')} Refresh</button></div>
      <p class="az-dim">Un <b>Diagnostic setting</b> decide qué logs de ${k === 'sub' ? 'la suscripción (Activity log)' : 'este recurso'} se guardan y dónde. Sin él, Azure no guarda los <i>resource logs</i>: ${k === 'adf' ? 'el Monitor del Studio solo conserva 45 días de corridas y no permite alertas con consultas' : k === 'storage' ? 'no queda registro de quién leyó o escribió cada blob' : k === 'kv' ? 'no queda registro de quién leyó cada secreto' : 'el Activity log se conserva 90 días y no se puede cruzar con otros logs'}. Solo se registra lo que pasa <b>después</b> de crearlo. Se admiten hasta 5 por recurso.</p>
      ${k === 'storage' ? `<div class="az-banner info">${ic('info')} <span>En una cuenta real, los logs de blobs se configuran en el sub-recurso <b>blob</b> (blobServices/default). En la práctica se registran las operaciones que hagas con <code>az storage blob</code> en la terminal.</span></div>` : k === 'kv' ? `<div class="az-banner info">${ic('info')} <span>En la práctica se registran las operaciones con <code>az keyvault secret show | set | delete | list</code> en la terminal.</span></div>` : ''}
      ${tabla(['Diagnostic setting', 'Categories', 'Destination', 'Created', ''], lista.map((d) => `<tr><td><b>${esc(d.nombre)}</b></td><td>${d.categorias.map(esc).join(', ')}</td><td>${d.law ? `Log Analytics: <a href="#/azure/recurso/law/${encodeURIComponent(d.law)}/logs">${esc(d.law)}</a>${k === 'adf' ? ` <span class="az-dim">(${d.tablaDestino === 'AzureDiagnostics' ? 'Azure diagnostics' : 'Resource specific'})</span>` : ''}` : ''}${d.storage ? ` · Storage: ${esc(d.storage)}` : ''}${d.eventhub ? ' · Event hub' : ''}</td><td>${hora(d.creado)}</td><td><button class="az-tb2" data-del="${esc(d.nombre)}" title="Delete">${ic('trash')}</button></td></tr>`), 'No diagnostic settings defined. Click "Add diagnostic setting" to configure the collection of the following data: ' + cats.map((c) => c[1]).join(', ') + '.')}</div>`;
    box.querySelector('#dRef').onclick = again;
    box.querySelectorAll('[data-del]').forEach((b) => (b.onclick = () => { if (!confirm(`¿Borrar el diagnostic setting ${b.dataset.del}? Desde ahora no se guardarán esos logs.`)) return; az().diag = diags().filter((d) => !(d.recurso === `${k}/${n}` && d.nombre === b.dataset.del)); actividad('Delete diagnostic setting', n); guardar(); again(); }));
    box.querySelector('#dAdd').onclick = () => {
      if (lista.length >= 5) return toast('Ya hay 5 diagnostic settings: es el máximo por recurso.');
      const laws = Object.keys(law()); const sts = Object.keys(az().storage || {});
      panel({ titulo: 'Diagnostic setting', ok: 'Save', ancho: 620, cuerpo: `${campo('Diagnostic setting name *', `<input id="dN" value="${esc(`diag-${n}`.slice(0, 60))}">`)}
        <div class="az-diag-cols"><div><h3>Logs</h3><p class="az-dim">Categories</p>${cats.map(([c, t]) => `<label class="az-check"><input type="checkbox" data-cat="${c}" ${['PipelineRuns', 'ActivityRuns', 'StorageWrite', 'StorageDelete', 'AuditEvent', 'Administrative'].includes(c) ? 'checked' : ''}> ${esc(t)}</label>`).join('')}${k !== 'sub' ? '<h3>Metrics</h3><label class="az-check"><input type="checkbox" id="dMet"> AllMetrics</label>' : ''}</div>
        <div><h3>Destination details</h3><label class="az-check"><input type="checkbox" id="dL" ${laws.length ? 'checked' : 'disabled'}> Send to Log Analytics workspace</label>${laws.length ? `<select id="dW">${laws.map((w) => `<option>${esc(w)}</option>`).join('')}</select>` : `<p class="az-dim">No hay workspaces. <a href="#/azure/crear/law">Crea uno</a> y vuelve.</p>`}
        ${k === 'adf' ? `<p class="az-dim" style="margin:8px 0 4px">Destination table</p><label class="az-radio"><input type="radio" name="dT" value="Dedicated" checked> Resource specific</label><label class="az-radio"><input type="radio" name="dT" value="AzureDiagnostics"> Azure diagnostics</label><small class="az-dim">Resource specific crea una tabla por categoría (ADFPipelineRun, ADFActivityRun…), con columnas propias. Es lo recomendado: Azure diagnostics mezcla todo en una sola tabla con columnas terminadas en _s, _d o _t.</small>` : ''}
        <label class="az-check" style="margin-top:10px"><input type="checkbox" id="dS" ${sts.length ? '' : 'disabled'}> Archive to a storage account</label>${sts.length ? `<select id="dSt">${sts.map((x) => `<option>${esc(x)}</option>`).join('')}</select>` : ''}
        <label class="az-check"><input type="checkbox" id="dE"> Stream to an event hub</label></div></div>`,
      alOk: (p) => {
        const nom = p.querySelector('#dN').value.trim(); if (!/^[\w.-]{1,260}$/.test(nom)) throw new Error('The name is required and can only contain letters, numbers, periods, underscores and hyphens.');
        if (lista.some((d) => d.nombre === nom)) throw new Error(`A diagnostic setting named '${nom}' already exists.`);
        const categorias = [...p.querySelectorAll('[data-cat]:checked')].map((x) => x.dataset.cat); if (!categorias.length && !(p.querySelector('#dMet') || {}).checked) throw new Error('Select at least one log category or metric.');
        const aLaw = (p.querySelector('#dL') || {}).checked && p.querySelector('#dW') ? p.querySelector('#dW').value : null; const aSt = (p.querySelector('#dS') || {}).checked && p.querySelector('#dSt') ? p.querySelector('#dSt').value : null; const aEh = p.querySelector('#dE').checked;
        if (!aLaw && !aSt && !aEh) throw new Error('Select at least one destination.');
        if (aEh && !Object.keys(az().eh || {}).length) throw new Error('No hay ningún Event Hubs namespace en la suscripción.');
        const tt = p.querySelector('[name=dT]:checked');
        diags().push({ nombre: nom, recurso: `${k}/${n}`, categorias, metricas: !!(p.querySelector('#dMet') || {}).checked, law: aLaw, storage: aSt, eventhub: aEh, tablaDestino: tt ? tt.value : 'Dedicated', creado: ahora() });
        actividad('Create or update resource diagnostic setting', n); guardar(); toast(`Diagnostic setting ${nom} saved`); again();
      } });
    };
  }

  // ------------------------------------------------------------------ crear un workspace
  function crearLaw(cont) {
    const G = Object.keys(az().groups || {}).filter((g) => !az().groups[g].administradoPor);
    cont.innerHTML = `<div class="az-pag">${migas([['Home', ''], ['Log Analytics workspaces', 'servicio/law'], ['Create', null]])}<div class="az-cab">${svg('law', 28)}<h1>Create Log Analytics workspace</h1></div>
      <p class="az-dim">Un workspace de Log Analytics es la base de datos donde Azure Monitor guarda los logs. Lo normal en una empresa es tener pocos (por ejemplo, uno por entorno: dev y prod) y que todos los recursos le manden sus logs, para poder cruzarlos en una misma consulta.</p>
      <h3>Project details</h3>${campo('Subscription *', `<select disabled><option>${esc(sub().name)}</option></select>`)}${campo('Resource group *', G.length ? `<select id="lwG">${G.map((g) => `<option>${esc(g)}</option>`).join('')}</select>` : '<p class="az-mal">Primero crea un grupo de recursos.</p>')}
      <h3>Instance details</h3>${campo('Name *', '<input id="lwN" placeholder="log-datos-dev">', 'Entre 4 y 63 caracteres: letras, números y guiones; empieza y termina con letra o número.')}${campo('Region *', `<select id="lwR">${REGIONES.map(([a, b]) => `<option value="${a}">${esc(b)}</option>`).join('')}</select>`)}
      <h3>Pricing tier</h3><p>Pay-as-you-go (Per GB 2018) <span class="az-dim">· se paga por GB ingerido (aprox. US$2,30 por GB en East US) y la retención de 30 días está incluida.</span></p>
      <div class="az-cmd"><button id="lwOk" class="az-btn primario" ${G.length ? '' : 'disabled'}>Review + Create</button><button onclick="history.back()">Cancel</button></div><div id="lwErr"></div></div>`;
    const ok = cont.querySelector('#lwOk'); if (!ok) return;
    ok.onclick = () => {
      const n = cont.querySelector('#lwN').value.trim(); const err = cont.querySelector('#lwErr');
      if (!/^[A-Za-z0-9][A-Za-z0-9-]{2,61}[A-Za-z0-9]$/.test(n)) { err.innerHTML = `<div class="az-banner error">${ic('error')} <span>The workspace name must be 4-63 characters and only contain letters, numbers and hyphens. It must start and end with a letter or number.</span></div>`; return; }
      if (law()[n]) { err.innerHTML = `<div class="az-banner error">${ic('error')} <span>A workspace named '${esc(n)}' already exists in this subscription.</span></div>`; return; }
      law()[n] = { rg: cont.querySelector('#lwG').value, location: cont.querySelector('#lwR').value, retencion: 30, sku: 'PerGB2018', customerId: guid(), creado: ahora(), tags: {}, guardadas: [] };
      actividad('Create Workspace', n, 'Succeeded', { rg: cont.querySelector('#lwG').value }); guardar();
      notificar('Deployment succeeded', `El workspace ${n} está listo. Ahora agrega Diagnostic settings en los recursos que quieras monitorear.`, 'info', [n, `recurso/law/${encodeURIComponent(n)}`]);
      ir(`recurso/law/${encodeURIComponent(n)}`);
    };
  }

  // ------------------------------------------------------------------ hojas del workspace y de "Logs" en cada recurso
  function monitoreo(box, { k, R, n, blade, comun, cmdBorrar, enlazarCmd, again }) {
    if (k !== 'law') {
      if (blade === 'diagnosticos') { bladeDiagnosticos(box, k, n, again); return true; }
      if (blade === 'logs') {
        const ds = diags().filter((d) => d.recurso === `${k}/${n}` && d.law && law()[d.law]);
        if (!ds.length) { box.innerHTML = `<div class="az-vacio">${ic('search')}<p>Este recurso todavía no manda logs a ningún workspace de Log Analytics.</p><p class="az-dim">Para consultarlos con KQL, crea un <b>Diagnostic setting</b> que los envíe a un workspace.</p><a class="az-btn" href="#/azure/recurso/${k}/${encodeURIComponent(n)}/diagnosticos">Diagnostic settings</a></div>`; return true; }
        pantallaLogs(box, { nombreLaw: ds[0].law, recursoId: idDe(k, n), titulo: n }); return true;
      }
      return false;
    }
    const W = R; const T = () => tablasDe(n);
    if (blade === 'overview') {
      const t = T(); const filas = Object.values(t).reduce((a, x) => a + x.filas.length, 0); const fuentes = diags().filter((d) => d.law === n);
      box.innerHTML = `<div class="az-cmd">${cmdBorrar}</div>${[['Resource group', `<a href="#/azure/grupo/${encodeURIComponent(W.rg)}">${esc(W.rg)}</a>`], ['Location', esc(regionNombre(W.location))], ['Workspace Name', esc(n)], ['Workspace ID', `<code>${esc(W.customerId)}</code>`], ['Pricing tier', 'Pay-as-you-go (Per GB 2018)'], ['Retention', `${W.retencion} days`]].map(([a, b]) => `<div class="az-kv-fila"><span class="az-dim">${esc(a)}</span> ${b}</div>`).join('')}
        <div class="az-ess-nums"><div><b>${fuentes.length}</b><span>Diagnostic settings que envían aquí</span></div><div><b>${filas}</b><span>Filas guardadas</span></div><div><b>${Object.values(t).filter((x) => x.filas.length).length}</b><span>Tablas con datos</span></div></div>
        <h3>Get started</h3><ol><li>En cada recurso (Data Factory, Storage, Key Vault) abre <b>Diagnostic settings</b> y envía sus logs a este workspace. Para el Activity log, usa <a href="#/azure/monitor/diagnosticos">Monitor → Diagnostic settings</a>.</li><li>Haz que pasen cosas: corre un pipeline desde el Studio, sube un blob o lee un secreto con la CLI.</li><li>Abre <a href="#/azure/recurso/law/${encodeURIComponent(n)}/logs">Logs</a> y consulta con KQL; con <b>New alert rule</b> conviertes una consulta en una alerta.</li></ol>
        ${fuentes.length ? `<h3>Sources</h3>${tabla(['Resource', 'Diagnostic setting', 'Categories'], fuentes.map((d) => `<tr><td>${esc(d.recurso.split('/')[1] || 'Activity log')}</td><td>${esc(d.nombre)}</td><td>${d.categorias.map(esc).join(', ')}</td></tr>`), '')}` : ''}`;
      enlazarCmd(); return true;
    }
    if (blade === 'logs') { pantallaLogs(box, { nombreLaw: n }); return true; }
    if (blade === 'tablas') {
      const t = T();
      box.innerHTML = `<p class="az-dim">Cada categoría de log va a su propia tabla. El plan <b>Analytics</b> permite consultas completas y alertas; en Azure también existen los planes <b>Basic</b> y <b>Auxiliary</b>, más baratos para logs que casi no se consultan.</p>${tabla(['Table name', 'Type', 'Plan', 'Rows', 'Interactive retention', 'Total retention'], Object.entries(t).map(([nom, x]) => `<tr><td>${ic('table')} <a class="az-link" href="#/azure/recurso/law/${encodeURIComponent(n)}/logs">${esc(nom)}</a></td><td>Azure table</td><td>Analytics</td><td>${x.filas.length}</td><td>${W.retencion} days (workspace default)</td><td>${W.retencion} days</td></tr>`), '')}`;
      return true;
    }
    if (blade === 'uso') {
      const t = T(); const bytes = Object.values(t).reduce((a, x) => a + x.filas.reduce((b, f) => b + JSON.stringify(f).length + 400, 0), 0); const gb = bytes / 1024 ** 3;
      box.innerHTML = `<p>En Log Analytics se paga sobre todo por los <b>GB que ingieres</b>. Por eso en una empresa se eligen con cuidado las categorías de cada Diagnostic setting: activar todo "por las dudas" puede costar más que el recurso.</p>
        <div class="az-ess-nums"><div><b>${(bytes / 1024).toFixed(1)} KB</b><span>Ingeridos (aprox.)</span></div><div><b>US$${(gb * 2.3).toFixed(6)}</b><span>Costo estimado (US$2,30/GB)</span></div><div><b>${W.retencion} d</b><span>Retención (30 incluidos)</span></div></div>
        ${tabla(['Table', 'Rows', 'Approx. size'], Object.entries(t).filter(([, x]) => x.filas.length).map(([nom, x]) => `<tr><td>${esc(nom)}</td><td>${x.filas.length}</td><td>${(x.filas.reduce((b, f) => b + JSON.stringify(f).length + 400, 0) / 1024).toFixed(1)} KB</td></tr>`), 'Todavía no hay datos ingeridos.')}
        <p class="az-dim">Para ahorrar: un <b>daily cap</b> (tope diario) corta la ingesta al llegar a un límite; los <b>commitment tiers</b> bajan el precio por GB si ingieres 100 GB por día o más; y las tablas de logs muy voluminosos y poco consultados pueden pasar al plan Basic.</p>`;
      return true;
    }
    if (blade === 'retencion') {
      box.innerHTML = `<p>La retención es cuánto tiempo se guardan los datos. Los primeros 30 días están incluidos en el precio; más tiempo se cobra por GB al mes.</p>${campo('Data retention (days)', `<select id="rtD">${[30, 31, 60, 90, 120, 180, 270, 365, 550, 730].map((d) => `<option ${d === W.retencion ? 'selected' : ''}>${d}</option>`).join('')}</select>`)}<div class="az-cmd"><button id="rtOk" class="az-btn primario">Save</button></div><p class="az-dim">Si bajas la retención, los datos más viejos que el nuevo valor dejan de verse en las consultas.</p>`;
      box.querySelector('#rtOk').onclick = () => { W.retencion = Number(box.querySelector('#rtD').value); actividad('Create Workspace', n); guardar(); toast(`Retention set to ${W.retencion} days`); again(); };
      return true;
    }
    return false;
  }

  // ------------------------------------------------------------------ pestañas Logs y Diagnostic settings del Monitor
  const logsMonitor = (cont, cab) => {
    const laws = Object.keys(law());
    if (!laws.length) { cont.innerHTML = `${cab}<div class="az-vacio">${svg('law', 48)}<p>Para consultar logs necesitas un <b>Log Analytics workspace</b>.</p><a class="az-btn" href="#/azure/crear/law">Create Log Analytics workspace</a></div></div>`; return; }
    const M = monitor(); const sel = laws.includes(M.verLaw) ? M.verLaw : laws[0];
    cont.innerHTML = `${cab}<div class="az-fila-sel"><label>Scope<select id="mLw">${laws.map((w) => `<option ${w === sel ? 'selected' : ''}>${esc(w)}</option>`).join('')}</select></label></div><div id="mLogs"></div></div>`;
    cont.querySelector('#mLw').onchange = (e) => { M.verLaw = e.target.value; guardar(); logsMonitor(cont, cab); };
    pantallaLogs(cont.querySelector('#mLogs'), { nombreLaw: sel });
  };
  const diagMonitor = (cont, cab) => {
    const rs = [['sub', sub().name, 'Activity log (Subscription)'], ...recursos().filter((x) => CATEGORIAS[x.k]).map((x) => [x.k, x.n, TIPOS[x.k].nombre])];
    const M = monitor(); const sel = rs.find((x) => `${x[0]}/${x[1]}` === M.verDiag) || rs[0];
    cont.innerHTML = `${cab}<p class="az-dim">Desde aquí ves y configuras los Diagnostic settings de todos tus recursos, y el del <b>Activity log</b> de la suscripción (que no tiene una hoja propia).</p>${tabla(['Name', 'Type', 'Diagnostic settings', ''], rs.map((x) => `<tr class="${x === sel ? 'az-sel' : ''}"><td>${svg(x[0] === 'sub' ? 'actividad' : x[0])} ${esc(x[1])}</td><td>${esc(x[2])}</td><td>${diags().filter((d) => d.recurso === `${x[0]}/${x[1]}`).length ? `<span class="az-ok">Enabled</span> (${diags().filter((d) => d.recurso === `${x[0]}/${x[1]}`).length})` : '<span class="az-dim">Disabled</span>'}</td><td><button class="az-btn" data-ver="${x[0]}/${esc(x[1])}">Edit</button></td></tr>`), '')}<h3>${esc(sel[1])}</h3><div id="mDiag"></div></div>`;
    cont.querySelectorAll('[data-ver]').forEach((b) => (b.onclick = () => { M.verDiag = b.dataset.ver; guardar(); diagMonitor(cont, cab); }));
    bladeDiagnosticos(cont.querySelector('#mDiag'), sel[0], sel[1], () => diagMonitor(cont, cab));
  };

  // estilos mínimos (el resto viene de azure.css)
  if (!document.getElementById('azLogsCss')) { const st = document.createElement('style'); st.id = 'azLogsCss'; st.textContent = `.az-logs-cuerpo{display:grid;grid-template-columns:230px 1fr;gap:12px}.az-logs-esq{border-right:1px solid var(--a-borde);padding-right:10px;font-size:13px;max-height:70vh;overflow:auto}.az-logs-esq summary{cursor:pointer;padding:3px 0}.az-logs-esq ul{margin:2px 0 6px 18px;padding:0;list-style:none;font-size:12px}.az-logs-q{width:100%;min-height:140px;font:13px/1.5 Consolas,Menlo,monospace;border:1px solid var(--a-borde);padding:8px;box-sizing:border-box;background:var(--a-fondo,#fff);color:inherit}.az-logs-res{max-height:420px;overflow:auto}.az-logs-graf{width:100%;max-width:760px;height:auto;margin:8px 0;color:var(--a-txt)}.az-logs-rango{display:inline-flex;gap:6px;align-items:center;margin:0 8px}.az-diag-cols{display:grid;grid-template-columns:1fr 1fr;gap:16px}.az-kv-fila{padding:3px 0}.az-logs-ej{display:inline-block;padding:3px 0}@media (max-width:720px){.az-logs-cuerpo,.az-diag-cols{grid-template-columns:1fr}.az-logs-esq{border-right:0;max-height:200px}}`; document.head.append(st); }

  Object.assign(P.ext, { monitoreo, crearLaw, logs: { logs: logsMonitor, diagnosticos: diagMonitor }, evaluarLogs, tablasLog: tablasDe, nuevaAlertaLog });
})();
