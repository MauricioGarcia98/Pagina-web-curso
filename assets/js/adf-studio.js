/* Azure Data Factory Studio de práctica (adf.azure.com), abierto desde un data factory del portal.
 *
 * Author: pipelines con actividades Copy data, Notebook (Azure Databricks) y Wait, conectadas por
 * dependencias (Succeeded / Failed / Completed / Skipped) y datasets DelimitedText o Json.
 * Manage: linked services (ADLS Gen2 / Blob con identidad administrada, Azure Databricks, Key Vault) y
 * triggers de programación. Monitor: ejecuciones de pipelines y de actividades con su entrada y salida.
 *
 * Todo corre sobre el mismo estado que el portal y la CLI: la actividad Copy lee y escribe blobs de las
 * cuentas de almacenamiento de la suscripción de práctica, y la actividad Notebook ejecuta notebooks del
 * Databricks de práctica. La conexión al storage con identidad administrada exige el rol "Storage Blob
 * Data …" asignado al factory (IAM del portal), como en Azure.
 *
 * Basado en la documentación pública de Azure Data Factory (Microsoft Learn): JSON de pipelines,
 * actividades, dependencias, salida de Copy activity y lógica de resultado de un pipeline.
 */
(function () {
  'use strict';
  let main = null, ctx = null, fabrica = null;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ic = (n) => `<i class="codicon codicon-${n}" aria-hidden="true"></i>`;
  const uid = (n) => Array.from({ length: n }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('');
  const guid = () => `${uid(8)}-${uid(4)}-4${uid(3)}-a${uid(3)}-${uid(12)}`;
  const ahora = () => new Date().toISOString();
  const hora = (t) => (t ? new Date(t).toLocaleString('es', { dateStyle: 'short', timeStyle: 'medium' }) : '—');
  const az = () => window.CloudSim.az();
  const F = () => az().adf[fabrica];
  const guardar = () => { try { ctx.guardarAz(); } catch (e) { /* sin almacenamiento */ } };
  function st() {
    const R = F(); if (!R) return null;
    R.studio = R.studio || { linked: {}, datasets: {}, pipelines: {}, triggers: {}, runs: [], publicado: null };
    return R.studio;
  }
  const espera = (ms) => new Promise((r) => setTimeout(r, ms));
  const TIPOS_ACT = {
    Copy: { nombre: 'Copy data', grupo: 'Move and transform', ico: 'files', color: '#0078d4' },
    DatabricksNotebook: { nombre: 'Notebook', grupo: 'Databricks', ico: 'notebook', color: '#ff3621' },
    Wait: { nombre: 'Wait', grupo: 'General', ico: 'watch', color: '#605e5c' },
  };
  const LS_TIPOS = { AzureBlobFS: 'Azure Data Lake Storage Gen2', AzureBlobStorage: 'Azure Blob Storage', AzureDatabricks: 'Azure Databricks', AzureKeyVault: 'Azure Key Vault' };

  // ------------------------------------------------------------------ JSON como el de ADF
  const ref = (n, t) => ({ referenceName: n, type: t });
  function actividadJson(a) {
    const base = { name: a.name, type: a.type, dependsOn: (a.dependsOn || []).map((d) => ({ activity: d.activity, dependencyConditions: d.conditions })), policy: { timeout: '0.12:00:00', retry: a.retry || 0, retryIntervalInSeconds: 30, secureOutput: false, secureInput: false }, userProperties: [] };
    if (a.type === 'Copy') {
      const ds = (n) => (st().datasets[n] || {});
      const fmt = (n) => (ds(n).type === 'Json' ? 'Json' : 'DelimitedText');
      return { ...base, typeProperties: { source: { type: fmt(a.source) + 'Source', storeSettings: { type: 'AzureBlobFSReadSettings', recursive: true, ...(a.wildcard ? { wildcardFileName: a.wildcard } : {}), enablePartitionDiscovery: false }, ...(fmt(a.source) === 'DelimitedText' ? { formatSettings: { type: 'DelimitedTextReadSettings' } } : {}) }, sink: { type: fmt(a.sink) + 'Sink', storeSettings: { type: 'AzureBlobFSWriteSettings', ...(a.merge ? { copyBehavior: 'MergeFiles' } : {}) }, ...(fmt(a.sink) === 'DelimitedText' ? { formatSettings: { type: 'DelimitedTextWriteSettings', quoteAllText: true, fileExtension: '.csv' } } : {}) }, enableStaging: false }, inputs: a.source ? [ref(a.source, 'DatasetReference')] : [], outputs: a.sink ? [ref(a.sink, 'DatasetReference')] : [] };
    }
    if (a.type === 'DatabricksNotebook') return { ...base, typeProperties: { notebookPath: a.notebookPath || '', ...(Object.keys(a.baseParameters || {}).length ? { baseParameters: a.baseParameters } : {}) }, linkedServiceName: a.linked ? ref(a.linked, 'LinkedServiceReference') : undefined };
    if (a.type === 'Wait') return { ...base, typeProperties: { waitTimeInSeconds: a.segundos ?? 1 } };
    return base;
  }
  const pipelineJson = (n, P) => ({ name: n, properties: { activities: P.activities.map(actividadJson), ...(Object.keys(P.parameters || {}).length ? { parameters: Object.fromEntries(Object.entries(P.parameters).map(([k, v]) => [k, { type: 'string', defaultValue: v }])) } : {}), annotations: [] } });
  function linkedJson(n, L) {
    const tp = L.type === 'AzureBlobFS' ? { url: `https://${L.account}.dfs.core.windows.net/` } : L.type === 'AzureBlobStorage' ? { serviceEndpoint: `https://${L.account}.blob.core.windows.net/`, accountKind: 'StorageV2' } : L.type === 'AzureDatabricks' ? { domain: `https://${(az().dbw[L.workspace] || {}).url || 'adb-0000.0.azuredatabricks.net'}`, authentication: 'MSI', workspaceResourceId: `/subscriptions/${az().sub}/resourceGroups/${(az().dbw[L.workspace] || {}).rg}/providers/Microsoft.Databricks/workspaces/${L.workspace}`, newClusterNodeType: undefined, existingClusterId: L.cluster || undefined } : { baseUrl: `https://${L.vault}.vault.azure.net/` };
    return { name: n, properties: { annotations: [], type: L.type, typeProperties: tp } };
  }
  function datasetJson(n, D) {
    const loc = { type: 'AzureBlobFSLocation', fileSystem: D.container, ...(D.folder ? { folderPath: D.folder } : {}), ...(D.file ? { fileName: D.file } : {}) };
    return { name: n, properties: { linkedServiceName: ref(D.linked, 'LinkedServiceReference'), annotations: [], type: D.type, typeProperties: D.type === 'Json' ? { location: loc } : { location: loc, columnDelimiter: D.sep || ',', escapeChar: '\\', firstRowAsHeader: D.header !== false, quoteChar: '"' }, schema: [] } };
  }
  const todoJson = () => { const S = st(); return JSON.stringify({ l: Object.entries(S.linked).map(([n, x]) => linkedJson(n, x)), d: Object.entries(S.datasets).map(([n, x]) => datasetJson(n, x)), p: Object.entries(S.pipelines).map(([n, x]) => pipelineJson(n, x)), t: S.triggers }); };
  function pendientes() {
    const S = st(); const pub = S.publicado ? JSON.parse(S.publicado) : { linked: {}, datasets: {}, pipelines: {}, triggers: {} };
    const out = [];
    for (const [k, nombre] of [['linked', 'Linked service'], ['datasets', 'Dataset'], ['pipelines', 'Pipeline'], ['triggers', 'Trigger']]) {
      for (const n of Object.keys(S[k])) if (!pub[k][n]) out.push([nombre, n, 'Agregado']); else if (JSON.stringify(pub[k][n]) !== JSON.stringify(S[k][n])) out.push([nombre, n, 'Editado']);
      for (const n of Object.keys(pub[k])) if (!S[k][n]) out.push([nombre, n, 'Borrado']);
    }
    return out;
  }

  // ------------------------------------------------------------------ validación
  function validar(nombre) {
    const S = st(), P = S.pipelines[nombre], err = [];
    if (!P.activities.length) err.push([nombre, 'Pipeline', 'El pipeline no tiene actividades.']);
    const nombres = new Set();
    for (const a of P.activities) {
      if (nombres.has(a.name)) err.push([a.name, a.type, 'Hay dos actividades con el mismo nombre.']); nombres.add(a.name);
      if (!/^[A-Za-z0-9_][A-Za-z0-9 _-]*$/.test(a.name)) err.push([a.name, a.type, 'El nombre solo puede tener letras, números, espacios, guiones y guion bajo.']);
      for (const d of a.dependsOn || []) if (!P.activities.some((x) => x.name === d.activity)) err.push([a.name, a.type, `Depende de "${d.activity}", que no existe.`]);
      if (a.type === 'Copy') {
        if (!a.source) err.push([a.name, 'Copy data', 'Source: elige un dataset de origen.']); else if (!S.datasets[a.source]) err.push([a.name, 'Copy data', `Source: el dataset "${a.source}" no existe.`]);
        if (!a.sink) err.push([a.name, 'Copy data', 'Sink: elige un dataset de destino.']); else if (!S.datasets[a.sink]) err.push([a.name, 'Copy data', `Sink: el dataset "${a.sink}" no existe.`]);
      }
      if (a.type === 'DatabricksNotebook') {
        if (!a.linked) err.push([a.name, 'Notebook', 'Azure Databricks: elige el linked service del workspace.']); else if (!S.linked[a.linked]) err.push([a.name, 'Notebook', `El linked service "${a.linked}" no existe.`]);
        if (!a.notebookPath) err.push([a.name, 'Notebook', 'Settings: Notebook path es obligatorio.']);
      }
    }
    // ciclos
    const vis = {}; const ciclo = (n) => { if (vis[n] === 1) return true; if (vis[n] === 2) return false; vis[n] = 1; const a = P.activities.find((x) => x.name === n); for (const d of (a && a.dependsOn) || []) if (ciclo(d.activity)) return true; vis[n] = 2; return false; };
    if (P.activities.some((a) => ciclo(a.name))) err.push([nombre, 'Pipeline', 'Las dependencias forman un ciclo.']);
    return err;
  }

  // ------------------------------------------------------------------ ejecución
  function cuenta(acc) { return az().storage[acc]; }
  function rolAlmacenamiento(acc) {
    const R = cuenta(acc); if (!R) return false;
    const id = `/subscriptions/${az().sub}/resourceGroups/${R.rg}/providers/Microsoft.Storage/storageAccounts/${acc}`;
    return (az().roles || []).some((a) => a.principalName === fabrica && /^Storage Blob Data (Contributor|Owner|Reader)$/.test(a.roleDefinitionName) && (a.scope === id || id.startsWith(a.scope + '/')));
  }
  function puedeEscribir(acc) {
    const R = cuenta(acc); if (!R) return false;
    const id = `/subscriptions/${az().sub}/resourceGroups/${R.rg}/providers/Microsoft.Storage/storageAccounts/${acc}`;
    return (az().roles || []).some((a) => a.principalName === fabrica && /^Storage Blob Data (Contributor|Owner)$/.test(a.roleDefinitionName) && (a.scope === id || id.startsWith(a.scope + '/')));
  }
  function probarLinked(L) {
    if (L.type === 'AzureBlobFS' || L.type === 'AzureBlobStorage') {
      if (!cuenta(L.account)) return `ErrorCode=AdlsGen2OperationFailed: The remote name could not be resolved: '${L.account}.dfs.core.windows.net'. La cuenta no existe en la suscripción.`;
      if (!rolAlmacenamiento(L.account)) return `ADLS Gen2 operation failed for: Operation returned an invalid status code 'Forbidden'. Account: '${L.account}'. ErrorCode: 'AuthorizationPermissionMismatch'. Message: 'This request is not authorized to perform this operation using this permission.'\n\nLa identidad administrada del factory (${fabrica}) necesita el rol "Storage Blob Data Contributor" (o Reader para solo leer) en la cuenta: portal → cuenta ${L.account} → Access control (IAM) → Add role assignment.`;
      return null;
    }
    if (L.type === 'AzureDatabricks') return az().dbw[L.workspace] ? null : `The workspace '${L.workspace}' was not found.`;
    if (L.type === 'AzureKeyVault') return az().kv[L.vault] ? null : `The vault '${L.vault}' was not found.`;
    return null;
  }
  function archivosDe(D) {
    const L = st().linked[D.linked]; if (!L) throw new Error(`Linked service "${D.linked}" not found.`);
    const e = probarLinked(L); if (e) throw new Error(e);
    const R = cuenta(L.account); const C = (R.containers || {})[D.container];
    if (!C) throw new Error(`ErrorCode=AdlsGen2OperationFailed: Operation returned an invalid status code 'NotFound'. ErrorCode: 'FilesystemNotFound'. Message: 'The specified filesystem does not exist.' (contenedor "${D.container}" en ${L.account})`);
    return { L, R, C };
  }
  const comodin = (p) => new RegExp('^' + p.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
  async function correrCopy(a) {
    const S = st(); const src = S.datasets[a.source], dst = S.datasets[a.sink];
    const o = archivosDe(src), d = archivosDe(dst);
    if (!puedeEscribir(d.L.account)) throw new Error(`ErrorCode=AdlsGen2OperationFailed: 'Forbidden'. AuthorizationPermissionMismatch al escribir en ${d.L.account}: el factory tiene permiso de lectura, no de escritura (necesita Storage Blob Data Contributor).`);
    const carpeta = (src.folder || '').replace(/^\/|\/$/g, '');
    const patron = a.wildcard || src.file || '*';
    const lista = Object.keys(o.C.blobs).filter((b) => !b.endsWith('/') && (carpeta ? b.startsWith(carpeta + '/') : true)).filter((b) => comodin(patron).test(carpeta ? b.slice(carpeta.length + 1) : b));
    if (!lista.length) throw new Error(`ErrorCode=UserErrorSourceBlobNotExist: The required Blob is missing. Folder path: ${src.container}/${carpeta}, file pattern: ${patron}.`);
    const destCarpeta = (dst.folder || '').replace(/^\/|\/$/g, '');
    let filas = 0, bytes = 0;
    const cuerpo = (txt) => (src.type === 'DelimitedText' && src.header !== false ? txt.split('\n').slice(1) : txt.split('\n')).filter((l) => l.trim());
    if (a.merge || dst.file) {
      const nombre = dst.file || 'merged.csv';
      const cab = src.type === 'DelimitedText' && src.header !== false ? (o.C.blobs[lista[0]].split('\n')[0] || '') : null;
      const lineas = lista.flatMap((b) => cuerpo(o.C.blobs[b]));
      const out = (cab != null && dst.header !== false ? cab + '\n' : '') + lineas.join('\n') + '\n';
      d.C.blobs[(destCarpeta ? destCarpeta + '/' : '') + nombre] = out; filas = lineas.length; bytes = out.length;
    } else {
      for (const b of lista) { const t = o.C.blobs[b]; d.C.blobs[(destCarpeta ? destCarpeta + '/' : '') + b.split('/').pop()] = t; filas += cuerpo(t).length; bytes += t.length; }
    }
    await espera(400);
    const dur = 3 + Math.round(lista.length * 1.5);
    return { dataRead: lista.reduce((s, b) => s + o.C.blobs[b].length, 0), dataWritten: bytes, filesRead: lista.length, filesWritten: a.merge || dst.file ? 1 : lista.length, sourcePeakConnections: 1, sinkPeakConnections: 1, rowsRead: filas, rowsCopied: filas, copyDuration: dur, throughput: +(bytes / 1024 / dur).toFixed(3), errors: [], effectiveIntegrationRuntime: 'AutoResolveIntegrationRuntime (East US)', usedDataIntegrationUnits: 4, billingReference: { activityType: 'DataMovement', billableDuration: [{ meterType: 'AzureIR', duration: 0.0667, unit: 'DIUHours' }] }, usedParallelCopies: 1, executionDetails: [{ source: { type: 'AzureBlobFS' }, sink: { type: 'AzureBlobFS' }, status: 'Succeeded', start: ahora(), duration: dur, usedDataIntegrationUnits: 4, usedParallelCopies: 1 }] };
  }
  async function correrNotebook(a, params) {
    const L = st().linked[a.linked]; const e = probarLinked(L); if (e) throw new Error(e);
    const D = window.DBX; if (!D || !D.correrTarea) throw new Error('El Databricks de práctica no está cargado.');
    if (D.asegurarStore) D.asegurarStore(ctx.Store);
    if (window.DBSQL) await window.DBSQL.init({ Store: ctx.Store });
    const ruta = a.notebookPath.startsWith('/Workspace') ? a.notebookPath : '/Workspace' + (a.notebookPath.startsWith('/') ? '' : '/') + a.notebookPath;
    const bp = {}; for (const [k, v] of Object.entries(a.baseParameters || {})) bp[k] = String(v).replace(/@pipeline\(\)\.parameters\.(\w+)/g, (m, p) => params[p] ?? '').replace(/@pipeline\(\)\.RunId/g, 'adf-run');
    const r = await D.correrTarea({ tipo: 'notebook', notebook_path: ruta, base_parameters: bp, task_key: a.name, compute: 'serverless' }, { params: {}, tv: {}, jobId: 'ADF ' + fabrica }, () => {});
    const runId = Math.floor(Math.random() * 9e14) + 1e14;
    if (r.estado !== 'SUCCESS') { const er = new Error(`Run failed with error message\n ${r.error}`); er.salida = { runPageUrl: `https://${(az().dbw[L.workspace] || {}).url}/?o=0#job/0/run/${runId}` }; throw er; }
    return { runPageUrl: `https://${(az().dbw[L.workspace] || {}).url}/?o=0#job/0/run/${runId}`, effectiveIntegrationRuntime: 'AutoResolveIntegrationRuntime (East US)', executionDuration: 25, ...(r.exit != null ? { runOutput: r.exit } : {}), billingReference: { activityType: 'ExternalActivity', billableDuration: [{ meterType: 'AzureIR', duration: 0.0167, unit: 'Hours' }] } };
  }
  async function correrPipeline(nombre, { tipo = 'Manual', definicion = null, alCambiar = () => {} } = {}) {
    const S = st(); const P = definicion || S.pipelines[nombre];
    const run = { runId: guid(), pipeline: nombre, inicio: ahora(), fin: null, estado: 'Queued', trigger: tipo, debug: tipo === 'Debug', acts: [], params: { ...(P.parameters || {}) } };
    S.runs.unshift(run); S.runs = S.runs.slice(0, 60); alCambiar();
    await espera(300); run.estado = 'InProgress'; alCambiar();
    const est = {};
    const pend = P.activities.slice();
    while (pend.length) {
      const i = pend.findIndex((a) => (a.dependsOn || []).every((d) => est[d.activity]));
      if (i < 0) break;
      const a = pend.splice(i, 1)[0];
      const deps = a.dependsOn || [];
      const ok = deps.every((d) => { const e = est[d.activity]; return d.conditions.some((c) => (c === 'Completed' ? e === 'Succeeded' || e === 'Failed' : c === e)); });
      const AR = { name: a.name, type: a.type, inicio: ahora(), fin: null, estado: 'InProgress', input: actividadJson(a).typeProperties || {}, output: null, error: null };
      if (!ok) { AR.estado = 'Skipped'; AR.fin = AR.inicio; est[a.name] = 'Skipped'; run.acts.push(AR); alCambiar(); continue; }
      run.acts.push(AR); alCambiar();
      let intento = 0;
      for (;;) {
        try {
          if (a.type === 'Copy') AR.output = await correrCopy(a);
          else if (a.type === 'DatabricksNotebook') AR.output = await correrNotebook(a, run.params);
          else if (a.type === 'Wait') { await espera(Math.min(2000, (a.segundos ?? 1) * 200)); AR.output = {}; }
          AR.estado = 'Succeeded'; break;
        } catch (e) {
          if (intento < (a.retry || 0)) { intento++; await espera(300); continue; }
          AR.estado = 'Failed'; AR.error = { errorCode: a.type === 'Copy' ? '2200' : a.type === 'DatabricksNotebook' ? '3204' : '2011', message: e.message, failureType: 'UserError', target: a.name }; AR.output = e.salida || null; break;
        }
      }
      AR.fin = ahora(); est[a.name] = AR.estado; alCambiar();
    }
    // resultado según ADF: falla si alguna actividad falló y ningún camino "Upon Failure"/"Upon Completion" la manejó
    const manejada = (n) => P.activities.some((b) => (b.dependsOn || []).some((d) => d.activity === n && (d.conditions.includes('Failed') || d.conditions.includes('Completed'))) && est[b.name] === 'Succeeded');
    const fallas = run.acts.filter((x) => x.estado === 'Failed');
    run.estado = fallas.some((x) => !manejada(x.name)) || fallas.some((x) => P.activities.every((b) => !(b.dependsOn || []).some((d) => d.activity === x.name))) ? 'Failed' : 'Succeeded';
    if (fallas.length) run.error = fallas[0].error;
    run.fin = ahora(); guardar(); alCambiar();
    if (!run.debug) ctx.actividad && ctx.actividad('Pipeline run ' + run.estado, `${fabrica}/${nombre}`, run.estado === 'Succeeded' ? 'Succeeded' : 'Failed');
    return run;
  }

  // ------------------------------------------------------------------ UI
  let vista = 'home', sel = { tipo: null, n: null }, actSel = null, pestAct = 'general', monitor = { run: null, modo: 'triggered' }, gestion = 'linked', salidaDebug = null, panelValid = null;
  function render(sub) {
    if (!F()) { main.innerHTML = `<div class="adf"><div class="adf-top"><span class="adf-marca">Azure Data Factory</span></div><div class="adf-vacio"><h2>No se encontró el data factory "${esc(fabrica)}"</h2><p><a href="#/azure/servicio/adf">Volver a Data factories</a></p></div></div>`; return; }
    if (sub && sub[0]) vista = sub[0];
    if (sub && sub[1] && vista === 'author') { const [t, n] = sub[1].split(':'); sel = { tipo: t, n: decodeURIComponent(n || '') }; }
    const pend = pendientes().length;
    main.innerHTML = `<div class="adf" id="adf">
      <div class="adf-top"><a class="adf-x" href="#/azure/recurso/adf/${encodeURIComponent(fabrica)}" title="Volver al portal">${ic('arrow-left')}</a><span class="adf-marca">Microsoft Azure</span><span class="adf-sep">|</span><span class="adf-prod">Data Factory</span><span class="adf-sep">›</span><b>${esc(fabrica)}</b><span class="spacer"></span><span class="adf-live">${ic('circle-filled')} Live mode</span></div>
      <div class="adf-barra"><button class="adf-pub" data-a="publicar" ${pend ? '' : 'disabled'}>${ic('cloud-upload')} Publish all${pend ? ` <span class="adf-cnt">${pend}</span>` : ''}</button><span class="spacer"></span><span class="adf-dim">${pend ? `${pend} cambio${pend === 1 ? '' : 's'} sin publicar` : 'Todo publicado'}</span></div>
      <div class="adf-cuerpo">
        <nav class="adf-rail">${[['home', 'home', 'Home'], ['author', 'edit', 'Author'], ['monitor', 'dashboard', 'Monitor'], ['manage', 'briefcase', 'Manage']].map(([k, i, t]) => `<a href="#/azure/studio/${encodeURIComponent(fabrica)}/${k}" class="${vista === k ? 'on' : ''}" title="${t}">${ic(i)}<span>${t}</span></a>`).join('')}</nav>
        <div class="adf-main" id="adfMain"></div>
      </div>
    </div>`;
    main.querySelector('[data-a=publicar]').onclick = publicar;
    const M = main.querySelector('#adfMain');
    if (vista === 'author') return author(M);
    if (vista === 'monitor') return vMonitor(M);
    if (vista === 'manage') return manage(M);
    return home(M);
  }
  const ir = (x) => { location.hash = `#/azure/studio/${encodeURIComponent(fabrica)}/${x}`; };
  function dialogo({ titulo, cuerpo, ok = 'OK', alOk, ancho = 520, alAbrir }) {
    const d = document.createElement('div'); d.className = 'adf-modal';
    d.innerHTML = `<div class="adf-dlg" style="max-width:${ancho}px"><div class="adf-dlg-cab"><b>${esc(titulo)}</b><button data-x>${ic('close')}</button></div><div class="adf-dlg-cuerpo">${cuerpo}</div><div class="adf-dlg-err" hidden></div><div class="adf-dlg-pie">${ok ? `<button class="adf-btn primario" data-ok>${esc(ok)}</button>` : ''}<button class="adf-btn" data-x>${ok ? 'Cancel' : 'Close'}</button></div></div>`;
    document.body.append(d);
    const cerrar = () => d.remove();
    d.querySelectorAll('[data-x]').forEach((b) => { b.onclick = cerrar; });
    if (alAbrir) alAbrir(d);
    const okb = d.querySelector('[data-ok]'); if (okb) okb.onclick = async () => { try { const r = await alOk(d); if (r !== false) cerrar(); } catch (e) { const er = d.querySelector('.adf-dlg-err'); er.hidden = false; er.textContent = e.message; } };
    return d;
  }
  function publicar() {
    const p = pendientes(); if (!p.length) return;
    const S = st();
    const errores = Object.keys(S.pipelines).flatMap((n) => validar(n));
    dialogo({ titulo: 'Publish all', ok: errores.length ? null : 'Publish', ancho: 620, cuerpo: `${errores.length ? `<div class="adf-aviso mal">${ic('error')} Hay ${errores.length} error${errores.length === 1 ? '' : 'es'} de validación: corrígelos antes de publicar (botón Validate de cada pipeline).</div>` : ''}<p>Pending changes (${p.length})</p><table class="adf-tabla"><thead><tr><th>Name</th><th>Type</th><th>Change</th></tr></thead><tbody>${p.map(([t, n, c]) => `<tr><td>${esc(n)}</td><td>${esc(t)}</td><td>${esc(c)}</td></tr>`).join('')}</tbody></table><p class="adf-dim">Publicar copia los cambios al servicio: los triggers solo disparan la versión publicada. Con Git configurado, además se generan las plantillas ARM en la rama <code>adf_publish</code>.</p>`, alOk: () => {
      S.publicado = JSON.stringify({ linked: S.linked, datasets: S.datasets, pipelines: S.pipelines, triggers: S.triggers });
      guardar(); ctx.actividad && ctx.actividad('Publish data factory resources', fabrica); ctx.toast && ctx.toast('Publishing completed'); render();
    } });
  }

  // ---- Home
  function home(M) {
    const S = st();
    M.innerHTML = `<div class="adf-home"><h1>${ic('azure')} Azure Data Factory</h1><p class="adf-dim">Integración de datos sin servidores: conecta orígenes, mueve y transforma datos, y orquesta todo con pipelines.</p>
      <div class="adf-tiles">
        <button data-h="ingest"><span>${ic('cloud-download')}</span><b>Ingest</b><small>Copia datos de un origen a un destino (Copy data).</small></button>
        <button data-h="orchestrate"><span>${ic('type-hierarchy-sub')}</span><b>Orchestrate</b><small>Pipeline nuevo para encadenar actividades.</small></button>
        <button data-h="manage"><span>${ic('plug')}</span><b>Linked services</b><small>Conexiones a storage, Databricks y Key Vault.</small></button>
        <button data-h="monitor"><span>${ic('pulse')}</span><b>Monitor</b><small>Ejecuciones, duración y errores.</small></button>
      </div>
      <h3>Por dónde empezar (paso a paso)</h3>
      <ol class="adf-pasos">
        <li class="${Object.keys(S.linked).length ? 'hecho' : ''}"><b>Linked service</b> a tu cuenta de almacenamiento (ADLS Gen2) con la <b>identidad administrada</b> del factory. Antes, en el portal, dale a <code>${esc(fabrica)}</code> el rol <i>Storage Blob Data Contributor</i> en la cuenta.</li>
        <li class="${Object.keys(S.datasets).length ? 'hecho' : ''}"><b>Datasets</b>: uno para el origen (por ejemplo <code>raw/ventas/*.csv</code>) y otro para el destino (<code>bronze/ventas</code>).</li>
        <li class="${Object.keys(S.pipelines).length ? 'hecho' : ''}"><b>Pipeline</b> con una actividad <b>Copy data</b>; después agrega un <b>Notebook</b> de Databricks que dependa de la copia.</li>
        <li class="${S.runs.some((r) => r.debug) ? 'hecho' : ''}"><b>Validate</b> y <b>Debug</b> para probar sin publicar.</li>
        <li class="${S.publicado ? 'hecho' : ''}"><b>Publish all</b> y agrega un <b>trigger</b> (Trigger now o programado).</li>
        <li class="${S.runs.some((r) => !r.debug) ? 'hecho' : ''}">Revisa la ejecución en <b>Monitor</b> y los archivos copiados en el storage del portal.</li>
      </ol></div>`;
    M.querySelector('[data-h=ingest]').onclick = () => nuevoPipeline(true);
    M.querySelector('[data-h=orchestrate]').onclick = () => nuevoPipeline(false);
    M.querySelector('[data-h=manage]').onclick = () => ir('manage');
    M.querySelector('[data-h=monitor]').onclick = () => ir('monitor');
  }
  function nombreLibre(obj, base) { let i = 1; while (obj[base + i]) i++; return base + i; }
  function nuevoPipeline(conCopy) {
    const S = st(); const n = nombreLibre(S.pipelines, 'pipeline');
    S.pipelines[n] = { activities: conCopy ? [{ name: 'Copy data1', type: 'Copy', dependsOn: [], source: '', sink: '' }] : [], parameters: {} };
    guardar(); actSel = conCopy ? 'Copy data1' : null; ir('author/pipeline:' + encodeURIComponent(n));
  }

  // ---- Author
  function author(M) {
    const S = st();
    if (sel.tipo === 'pipeline' && !S.pipelines[sel.n]) sel = { tipo: null, n: null };
    if (sel.tipo === 'dataset' && !S.datasets[sel.n]) sel = { tipo: null, n: null };
    M.innerHTML = `<div class="adf-author"><aside class="adf-recursos"><div class="adf-rc-cab"><b>Factory Resources</b><button class="adf-ib" data-a="mas" title="Add new resource">${ic('add')}</button></div>
      <details open><summary>${ic('type-hierarchy-sub')} Pipelines <span class="adf-dim">${Object.keys(S.pipelines).length}</span></summary>${Object.keys(S.pipelines).map((n) => `<a class="adf-rc ${sel.tipo === 'pipeline' && sel.n === n ? 'on' : ''}" href="#/azure/studio/${encodeURIComponent(fabrica)}/author/pipeline:${encodeURIComponent(n)}">${ic('symbol-event')} ${esc(n)}</a>`).join('') || '<div class="adf-dim adf-rc">—</div>'}</details>
      <details open><summary>${ic('database')} Datasets <span class="adf-dim">${Object.keys(S.datasets).length}</span></summary>${Object.keys(S.datasets).map((n) => `<a class="adf-rc ${sel.tipo === 'dataset' && sel.n === n ? 'on' : ''}" href="#/azure/studio/${encodeURIComponent(fabrica)}/author/dataset:${encodeURIComponent(n)}">${ic('table')} ${esc(n)}</a>`).join('') || '<div class="adf-dim adf-rc">—</div>'}</details>
    </aside><section class="adf-edit" id="adfEdit"></section></div>`;
    M.querySelector('[data-a=mas]').onclick = (e) => menu(e.currentTarget, [['Pipeline', () => nuevoPipeline(false)], ['Dataset', () => nuevoDataset()]]);
    const E = M.querySelector('#adfEdit');
    if (sel.tipo === 'pipeline') return editorPipeline(E, sel.n);
    if (sel.tipo === 'dataset') return editorDataset(E, sel.n);
    E.innerHTML = `<div class="adf-vacio">${ic('edit')}<h2>Author</h2><p>Crea un pipeline o un dataset con <b>+</b>, o elige uno de la lista.</p><button class="adf-btn primario" data-a="np">New pipeline</button></div>`;
    E.querySelector('[data-a=np]').onclick = () => nuevoPipeline(false);
  }
  function menu(ancla, items) {
    document.querySelectorAll('.adf-menu').forEach((x) => x.remove());
    const r = ancla.getBoundingClientRect(); const m = document.createElement('div'); m.className = 'adf-menu';
    m.style.left = Math.min(r.left, window.innerWidth - 200) + 'px'; m.style.top = r.bottom + 2 + 'px';
    m.innerHTML = items.map(([t], i) => `<button data-i="${i}">${esc(t)}</button>`).join('');
    document.body.append(m);
    m.onclick = (e) => { const b = e.target.closest('[data-i]'); if (!b) return; m.remove(); items[+b.dataset.i][1](); };
    setTimeout(() => document.addEventListener('click', function f(ev) { if (!m.contains(ev.target)) { m.remove(); document.removeEventListener('click', f); } }), 0);
  }
  function opcionesLs(tipos, v) { return Object.entries(st().linked).filter(([, L]) => tipos.includes(L.type)).map(([n]) => `<option ${n === v ? 'selected' : ''}>${esc(n)}</option>`).join(''); }
  function nuevoDataset(alCrear) {
    const S = st();
    if (!Object.values(S.linked).some((L) => L.type === 'AzureBlobFS' || L.type === 'AzureBlobStorage')) { dialogo({ titulo: 'New dataset', ok: null, cuerpo: '<p>Primero crea un <b>linked service</b> a una cuenta de almacenamiento (Manage → Linked services → New).</p>' }); return; }
    dialogo({ titulo: 'New dataset', ancho: 560, cuerpo: `<label class="adf-campo"><span>Data store</span><select id="dS"><option value="AzureBlobFS">Azure Data Lake Storage Gen2</option></select></label><label class="adf-campo"><span>Format</span><select id="dF"><option value="DelimitedText">DelimitedText (CSV)</option><option value="Json">JSON</option></select></label><label class="adf-campo"><span>Name</span><input id="dN" value="${esc(nombreLibre(S.datasets, 'DelimitedText'))}"></label><label class="adf-campo"><span>Linked service</span><select id="dL">${opcionesLs(['AzureBlobFS', 'AzureBlobStorage'])}</select></label><label class="adf-campo"><span>File path</span><span class="adf-ruta"><input id="dC" placeholder="contenedor"> / <input id="dD" placeholder="carpeta"> / <input id="dA" placeholder="archivo (vacío = todos)"></span></label><label class="adf-check"><input type="checkbox" id="dH" checked> First row as header</label>`,
      alAbrir: (d) => { d.querySelector('#dF').onchange = (e) => { d.querySelector('#dN').value = nombreLibre(S.datasets, e.target.value === 'Json' ? 'Json' : 'DelimitedText'); }; },
      alOk: (d) => {
        const n = d.querySelector('#dN').value.trim(); if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(n)) throw new Error('The name can contain only letters, numbers and underscores, and must start with a letter.');
        if (S.datasets[n]) throw new Error(`A dataset named "${n}" already exists.`);
        const c = d.querySelector('#dC').value.trim(); if (!c) throw new Error('File path: el contenedor (file system) es obligatorio.');
        S.datasets[n] = { type: d.querySelector('#dF').value, linked: d.querySelector('#dL').value, container: c, folder: d.querySelector('#dD').value.trim(), file: d.querySelector('#dA').value.trim(), header: d.querySelector('#dH').checked };
        guardar(); if (alCrear) alCrear(n); else ir('author/dataset:' + encodeURIComponent(n));
      } });
  }
  function editorDataset(E, n) {
    const S = st(), D = S.datasets[n];
    E.innerHTML = `<div class="adf-tabs"><span class="on">${ic('table')} ${esc(n)}</span></div><div class="adf-tb"><button data-a="json">${ic('json')} Code</button><button data-a="prev">${ic('eye')} Preview data</button><button data-a="del">${ic('trash')} Delete</button></div>
      <div class="adf-form"><label class="adf-campo"><span>Linked service</span><select data-k="linked">${opcionesLs(['AzureBlobFS', 'AzureBlobStorage'], D.linked)}</select></label>
      <label class="adf-campo"><span>File path</span><span class="adf-ruta"><input data-k="container" value="${esc(D.container)}"> / <input data-k="folder" value="${esc(D.folder)}"> / <input data-k="file" value="${esc(D.file)}" placeholder="(todos los archivos)"></span></label>
      ${D.type === 'DelimitedText' ? `<label class="adf-campo"><span>Column delimiter</span><select data-k="sep"><option value=",">Comma (,)</option><option value=";" ${D.sep === ';' ? 'selected' : ''}>Semicolon (;)</option><option value="\t" ${D.sep === '\t' ? 'selected' : ''}>Tab</option></select></label><label class="adf-check"><input type="checkbox" data-k="header" ${D.header !== false ? 'checked' : ''}> First row as header</label>` : ''}
      <div id="dsOut"></div></div>`;
    E.querySelectorAll('[data-k]').forEach((x) => { x.onchange = () => { D[x.dataset.k] = x.type === 'checkbox' ? x.checked : x.value.trim(); guardar(); render(); }; });
    E.querySelector('[data-a=json]').onclick = () => dialogo({ titulo: n, ok: null, ancho: 640, cuerpo: `<pre class="adf-json">${esc(JSON.stringify(datasetJson(n, D), null, 4))}</pre>` });
    E.querySelector('[data-a=del]').onclick = () => { const usos = Object.entries(S.pipelines).filter(([, P]) => P.activities.some((a) => a.source === n || a.sink === n)).map(([p]) => p); if (usos.length) return dialogo({ titulo: 'Delete', ok: null, cuerpo: `<p>No se puede borrar: lo usan los pipelines ${usos.map(esc).join(', ')}.</p>` }); delete S.datasets[n]; guardar(); ir('author'); };
    E.querySelector('[data-a=prev]').onclick = () => {
      const out = E.querySelector('#dsOut');
      try {
        const { C } = archivosDe(D); const carpeta = (D.folder || '').replace(/^\/|\/$/g, '');
        const lista = Object.keys(C.blobs).filter((b) => !b.endsWith('/') && (carpeta ? b.startsWith(carpeta + '/') : true) && comodin(D.file || '*').test(carpeta ? b.slice(carpeta.length + 1) : b));
        if (!lista.length) throw new Error('No hay archivos en esa ruta.');
        const txt = C.blobs[lista[0]];
        if (D.type === 'Json') { out.innerHTML = `<p class="adf-dim">${esc(lista[0])}</p><pre class="adf-json">${esc(txt.slice(0, 2000))}</pre>`; return; }
        const filas = txt.split('\n').filter((l) => l.trim()).slice(0, 11).map((l) => l.split(D.sep || ','));
        const cab = D.header !== false ? filas.shift() : filas[0].map((_, i) => 'Prop_' + i);
        out.innerHTML = `<p class="adf-dim">${esc(lista[0])}${lista.length > 1 ? ` (y ${lista.length - 1} archivo${lista.length > 2 ? 's' : ''} más)` : ''}</p><div class="adf-scroll"><table class="adf-tabla"><thead><tr>${cab.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${filas.map((f) => `<tr>${f.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
      } catch (e) { out.innerHTML = `<div class="adf-aviso mal">${esc(e.message)}</div>`; }
    };
  }
  function nivelDe(P, a, memo = {}) { if (memo[a.name] != null) return memo[a.name]; memo[a.name] = 0; const ds = (a.dependsOn || []).map((d) => P.activities.find((x) => x.name === d.activity)).filter(Boolean); return (memo[a.name] = ds.length ? 1 + Math.max(...ds.map((x) => nivelDe(P, x, memo))) : 0); }
  function editorPipeline(E, n) {
    const S = st(), P = S.pipelines[n];
    if (actSel && !P.activities.some((a) => a.name === actSel)) actSel = null;
    // posiciones: columna = nivel de dependencia, fila = orden dentro del nivel
    const memo = {}, porNivel = {}; const pos = {};
    for (const a of P.activities) { const lv = nivelDe(P, a, memo); porNivel[lv] = (porNivel[lv] || 0) + 1; pos[a.name] = { x: 40 + lv * 230, y: 40 + (porNivel[lv] - 1) * 110 }; }
    const alto = Math.max(260, ...Object.values(pos).map((p) => p.y + 120)), ancho = Math.max(600, ...Object.values(pos).map((p) => p.x + 220));
    const COL = { Succeeded: '#107c10', Failed: '#a4262c', Completed: '#0078d4', Skipped: '#8a8886' };
    const flechas = P.activities.flatMap((a) => (a.dependsOn || []).map((d) => { const o = pos[d.activity], t = pos[a.name]; if (!o) return ''; const x1 = o.x + 180, y1 = o.y + 34, x2 = t.x, y2 = t.y + 34, c = COL[d.conditions[0]] || '#107c10'; return `<path d="M${x1} ${y1} C ${x1 + 30} ${y1}, ${x2 - 30} ${y2}, ${x2} ${y2}" stroke="${c}" stroke-width="2" fill="none" marker-end="url(#fl-${d.conditions[0] || 'Succeeded'})"/>`; })).join('');
    const ultima = S.runs.find((r) => r.pipeline === n && r.debug && r === salidaDebug) || null;
    const estadoAct = (nm) => { const x = ultima && ultima.acts.find((y) => y.name === nm); return x ? x.estado : null; };
    E.innerHTML = `<div class="adf-tabs"><span class="on">${ic('symbol-event')} ${esc(n)}</span></div>
      <div class="adf-tb"><button data-a="validar">${ic('check')} Validate</button><button data-a="debug">${ic('debug-alt')} Debug</button><button data-a="trigger">${ic('zap')} Add trigger ${ic('chevron-down')}</button><span class="sep"></span><button data-a="json">${ic('json')} Code</button><button data-a="renombrar">${ic('edit')} Rename</button><button data-a="del">${ic('trash')} Delete</button></div>
      <div class="adf-pipe">
        <aside class="adf-acts"><input placeholder="Search activities" id="aQ">${Object.entries(Object.entries(TIPOS_ACT).reduce((g, [k, v]) => { (g[v.grupo] = g[v.grupo] || []).push([k, v]); return g; }, {})).map(([g, xs]) => `<details open><summary>${esc(g)}</summary>${xs.map(([k, v]) => `<button class="adf-act-item" data-add="${k}"><span style="color:${v.color}">${ic(v.ico)}</span> ${esc(v.nombre)}</button>`).join('')}</details>`).join('')}<p class="adf-dim adf-acts-tip">Clic en una actividad para agregarla al lienzo.</p></aside>
        <div class="adf-lienzo-col">
          <div class="adf-lienzo"><svg width="${ancho}" height="${alto}" class="adf-svg"><defs>${Object.entries(COL).map(([k, c]) => `<marker id="fl-${k}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10z" fill="${c}"/></marker>`).join('')}</defs>${flechas}</svg>
            ${P.activities.map((a) => { const T = TIPOS_ACT[a.type], e = estadoAct(a.name); return `<div class="adf-act ${actSel === a.name ? 'sel' : ''} ${e ? 'e-' + e : ''}" data-act="${esc(a.name)}" style="left:${pos[a.name].x}px;top:${pos[a.name].y}px"><div class="adf-act-t" style="border-left-color:${T.color}"><small>${esc(T.nombre)}</small></div><div class="adf-act-c"><span style="color:${T.color}">${ic(T.ico)}</span><b>${esc(a.name)}</b>${e ? `<span class="adf-act-e">${ic(e === 'Succeeded' ? 'pass-filled' : e === 'Failed' ? 'error' : e === 'Skipped' ? 'debug-step-over' : 'sync')}</span>` : ''}</div></div>`; }).join('')}
            ${P.activities.length ? '' : '<div class="adf-lienzo-vacio">Agrega una actividad desde la izquierda.</div>'}
          </div>
          <div class="adf-props" id="adfProps"></div>
        </div>
      </div>`;
    const tb = E.querySelector('.adf-tb');
    tb.onclick = (e) => {
      const b = e.target.closest('[data-a]'); if (!b) return;
      const a = b.dataset.a;
      if (a === 'validar') { const er = validar(n); panelValid = { n, er }; pintarProps(); if (!er.length) ctx.toast && ctx.toast('Your pipeline has been validated. No errors were found.'); }
      if (a === 'debug') { const er = validar(n); if (er.length) { panelValid = { n, er }; pintarProps(); return; } debug(); }
      if (a === 'trigger') menu(b, [['Trigger now', () => triggerNow(n)], ['New/Edit', () => nuevoTrigger(n)]]);
      if (a === 'json') dialogo({ titulo: n, ok: null, ancho: 720, cuerpo: `<pre class="adf-json">${esc(JSON.stringify(pipelineJson(n, P), null, 4))}</pre>` });
      if (a === 'renombrar') dialogo({ titulo: 'Rename pipeline', cuerpo: `<label class="adf-campo"><span>Name</span><input id="rn" value="${esc(n)}"></label>`, alOk: (d) => { const v = d.querySelector('#rn').value.trim(); if (!/^[A-Za-z0-9_][A-Za-z0-9_-]*$/.test(v)) throw new Error('Nombre inválido.'); if (v !== n && S.pipelines[v]) throw new Error('Ya existe.'); if (v === n) return; S.pipelines[v] = P; delete S.pipelines[n]; for (const T of Object.values(S.triggers)) T.pipelines = (T.pipelines || []).map((x) => (x === n ? v : x)); guardar(); ir('author/pipeline:' + encodeURIComponent(v)); } });
      if (a === 'del') dialogo({ titulo: 'Delete pipeline', ok: 'Delete', cuerpo: `<p>¿Borrar <b>${esc(n)}</b>?</p>`, alOk: () => { delete S.pipelines[n]; for (const T of Object.values(S.triggers)) T.pipelines = (T.pipelines || []).filter((x) => x !== n); guardar(); ir('author'); } });
    };
    E.querySelector('.adf-acts').onclick = (e) => {
      const b = e.target.closest('[data-add]'); if (!b) return;
      const t = b.dataset.add, base = TIPOS_ACT[t].nombre.replace(/\s+/g, ' ');
      let i = 1; while (P.activities.some((x) => x.name === base + i)) i++;
      const prev = actSel ? P.activities.find((x) => x.name === actSel) : null;
      const nueva = { name: base + i, type: t, dependsOn: prev ? [{ activity: prev.name, conditions: ['Succeeded'] }] : [], ...(t === 'Copy' ? { source: '', sink: '' } : t === 'DatabricksNotebook' ? { linked: Object.keys(S.linked).find((k) => S.linked[k].type === 'AzureDatabricks') || '', notebookPath: '', baseParameters: {} } : { segundos: 1 }) };
      P.activities.push(nueva); actSel = nueva.name; pestAct = 'general'; guardar(); render();
    };
    E.querySelector('#aQ').oninput = (e) => { const q = e.target.value.toLowerCase(); E.querySelectorAll('.adf-act-item').forEach((x) => { x.hidden = q && !x.textContent.toLowerCase().includes(q); }); };
    E.querySelector('.adf-lienzo').onclick = (e) => { const c = e.target.closest('[data-act]'); actSel = c ? c.dataset.act : null; pestAct = 'general'; panelValid = null; render(); };
    function pintarProps() {
      const box = E.querySelector('#adfProps');
      if (panelValid && panelValid.n === n) {
        box.innerHTML = `<div class="adf-props-cab"><b>Pipeline validation output</b><button class="adf-ib" data-x>${ic('close')}</button></div>${panelValid.er.length ? `<p class="adf-mal">${ic('error')} Found ${panelValid.er.length} error${panelValid.er.length === 1 ? '' : 's'}</p><table class="adf-tabla"><thead><tr><th>Source</th><th>Type</th><th>Error</th></tr></thead><tbody>${panelValid.er.map(([a, t, m]) => `<tr><td>${esc(a)}</td><td>${esc(t)}</td><td>${esc(m)}</td></tr>`).join('')}</tbody></table>` : `<p class="adf-ok">${ic('pass-filled')} Your pipeline has been validated. No errors were found.</p>`}`;
        box.querySelector('[data-x]').onclick = () => { panelValid = null; pintarProps(); };
        return;
      }
      if (salidaDebug && salidaDebug.pipeline === n && !actSel) {
        const r = salidaDebug;
        box.innerHTML = `<div class="adf-props-cab"><b>Output</b> <span class="adf-dim">Pipeline run ID ${esc(r.runId)}</span> <span class="adf-estado e-${r.estado}">${esc(r.estado)}</span><button class="adf-ib" data-x>${ic('close')}</button></div>${tablaActs(r)}`;
        box.querySelector('[data-x]').onclick = () => { salidaDebug = null; render(); };
        enlazarIO(box, r);
        return;
      }
      const a = actSel && P.activities.find((x) => x.name === actSel);
      if (!a) {
        box.innerHTML = `<div class="adf-props-cab"><b>Parameters</b> <span class="adf-dim">del pipeline (se usan como @pipeline().parameters.nombre)</span></div><div class="adf-params">${Object.entries(P.parameters || {}).map(([k, v]) => `<div class="adf-param"><input value="${esc(k)}" data-pk="${esc(k)}"><input value="${esc(v)}" data-pv="${esc(k)}"><button class="adf-ib" data-pdel="${esc(k)}">${ic('trash')}</button></div>`).join('')}<button class="adf-btn" data-padd>${ic('add')} New</button></div>`;
        box.querySelector('[data-padd]').onclick = () => { P.parameters = P.parameters || {}; let i = 1; while (P.parameters['param' + i] !== undefined) i++; P.parameters['param' + i] = ''; guardar(); pintarProps(); };
        box.querySelectorAll('[data-pdel]').forEach((b) => { b.onclick = () => { delete P.parameters[b.dataset.pdel]; guardar(); pintarProps(); }; });
        box.querySelectorAll('[data-pv]').forEach((x) => { x.onchange = () => { P.parameters[x.dataset.pv] = x.value; guardar(); }; });
        box.querySelectorAll('[data-pk]').forEach((x) => { x.onchange = () => { const v = P.parameters[x.dataset.pk]; delete P.parameters[x.dataset.pk]; P.parameters[x.value.trim()] = v; guardar(); pintarProps(); }; });
        return;
      }
      const pests = a.type === 'Copy' ? [['general', 'General'], ['source', 'Source'], ['sink', 'Sink']] : a.type === 'DatabricksNotebook' ? [['general', 'General'], ['dbw', 'Azure Databricks'], ['settings', 'Settings']] : [['general', 'General'], ['settings', 'Settings']];
      if (!pests.some((p) => p[0] === pestAct)) pestAct = 'general';
      const otras = P.activities.filter((x) => x.name !== a.name);
      const dep = (o) => (a.dependsOn || []).find((d) => d.activity === o);
      let cuerpo = '';
      if (pestAct === 'general') cuerpo = `<label class="adf-campo"><span>Name *</span><input data-f="name" value="${esc(a.name)}"></label><label class="adf-campo"><span>Retry</span><input type="number" min="0" max="5" data-f="retry" value="${a.retry || 0}"></label>
        <div class="adf-campo"><span>Depends on</span><div>${otras.length ? otras.map((o) => `<div class="adf-dep"><label><input type="checkbox" data-dep="${esc(o.name)}" ${dep(o.name) ? 'checked' : ''}> ${esc(o.name)}</label><select data-depc="${esc(o.name)}" ${dep(o.name) ? '' : 'disabled'}>${['Succeeded', 'Failed', 'Completed', 'Skipped'].map((c) => `<option value="${c}" ${dep(o.name) && dep(o.name).conditions[0] === c ? 'selected' : ''}>${{ Succeeded: 'Upon Success', Failed: 'Upon Failure', Completed: 'Upon Completion', Skipped: 'Upon Skip' }[c]}</option>`).join('')}</select></div>`).join('') : '<span class="adf-dim">Es la única actividad.</span>'}<p class="adf-dim">Upon Success (verde) corre si la anterior terminó bien; Upon Failure (rojo) solo si falló, para avisar o compensar; Upon Completion (azul) en ambos casos.</p></div></div>`;
      else if (pestAct === 'source' || pestAct === 'sink') { const k = pestAct; cuerpo = `<label class="adf-campo"><span>${k === 'source' ? 'Source' : 'Sink'} dataset *</span><select data-f="${k}"><option value="">Select…</option>${Object.keys(S.datasets).map((d) => `<option ${a[k] === d ? 'selected' : ''}>${esc(d)}</option>`).join('')}</select> <button class="adf-btn" data-nds>${ic('add')} New</button></label>${k === 'source' ? `<label class="adf-campo"><span>Wildcard file name</span><input data-f="wildcard" value="${esc(a.wildcard || '')}" placeholder="*.csv (vacío = lo que diga el dataset)"></label>` : `<label class="adf-check"><input type="checkbox" data-f="merge" ${a.merge ? 'checked' : ''}> Copy behavior: Merge files (un solo archivo de salida)</label>`}${a[k] && S.datasets[a[k]] ? `<p class="adf-dim">${esc(S.datasets[a[k]].type)} · ${esc(S.datasets[a[k]].linked)} · <code>${esc([S.datasets[a[k]].container, S.datasets[a[k]].folder, S.datasets[a[k]].file].filter(Boolean).join('/'))}</code></p>` : ''}`; }
      else if (pestAct === 'dbw') cuerpo = `<label class="adf-campo"><span>Databricks linked service *</span><select data-f="linked"><option value="">Select…</option>${opcionesLs(['AzureDatabricks'], a.linked)}</select></label>${Object.values(S.linked).some((L) => L.type === 'AzureDatabricks') ? '' : '<p class="adf-dim">Crea uno en Manage → Linked services → New → Azure Databricks.</p>'}`;
      else if (pestAct === 'settings' && a.type === 'DatabricksNotebook') { let nbs = []; try { if (window.DBX && window.DBX.asegurarStore) { window.DBX.asegurarStore(ctx.Store); nbs = Object.entries(window.DBX.ws().items).filter(([, it]) => it.tipo === 'notebook').map(([k]) => k.replace(/^\/Workspace/, '')); } } catch (e) { nbs = []; } cuerpo = `<label class="adf-campo"><span>Notebook path *</span><input data-f="notebookPath" list="nbList" value="${esc(a.notebookPath)}" placeholder="/Users/alumno@academia.dev/mi_notebook"><datalist id="nbList">${nbs.map((x) => `<option value="${esc(x)}">`).join('')}</datalist></label><div class="adf-campo"><span>Base parameters</span><div>${Object.entries(a.baseParameters || {}).map(([k, v]) => `<div class="adf-param"><input value="${esc(k)}" data-bk="${esc(k)}"><input value="${esc(v)}" data-bv="${esc(k)}"><button class="adf-ib" data-bdel="${esc(k)}">${ic('trash')}</button></div>`).join('')}<button class="adf-btn" data-badd>${ic('add')} New</button><p class="adf-dim">Llegan al notebook como widgets (dbutils.widgets.get). Puedes usar <code>@pipeline().parameters.x</code>.</p></div></div>`; }
      else if (pestAct === 'settings') cuerpo = `<label class="adf-campo"><span>Wait time in seconds *</span><input type="number" min="1" data-f="segundos" value="${a.segundos ?? 1}"></label>`;
      box.innerHTML = `<div class="adf-props-cab"><span class="adf-pest">${pests.map(([k, t]) => `<a data-p="${k}" class="${pestAct === k ? 'on' : ''}">${t}</a>`).join('')}</span><button class="adf-ib" data-borrar title="Delete activity">${ic('trash')}</button></div><div class="adf-form">${cuerpo}</div>`;
      box.querySelectorAll('[data-p]').forEach((x) => { x.onclick = () => { pestAct = x.dataset.p; pintarProps(); }; });
      box.querySelector('[data-borrar]').onclick = () => { P.activities = P.activities.filter((x) => x !== a); for (const x of P.activities) x.dependsOn = (x.dependsOn || []).filter((d) => d.activity !== a.name); actSel = null; guardar(); render(); };
      box.querySelectorAll('[data-f]').forEach((x) => { x.onchange = () => {
        const f = x.dataset.f; let v = x.type === 'checkbox' ? x.checked : x.type === 'number' ? Number(x.value) : x.value.trim();
        if (f === 'name') { if (!v || P.activities.some((y) => y !== a && y.name === v)) { x.value = a.name; return; } for (const y of P.activities) for (const d of y.dependsOn || []) if (d.activity === a.name) d.activity = v; actSel = v; }
        a[f] = v; guardar(); if (f === 'name' || f === 'source' || f === 'sink') render(); };
      });
      box.querySelectorAll('[data-dep]').forEach((x) => { x.onchange = () => { const o = x.dataset.dep; a.dependsOn = (a.dependsOn || []).filter((d) => d.activity !== o); if (x.checked) a.dependsOn.push({ activity: o, conditions: ['Succeeded'] }); guardar(); render(); }; });
      box.querySelectorAll('[data-depc]').forEach((x) => { x.onchange = () => { const d = (a.dependsOn || []).find((y) => y.activity === x.dataset.depc); if (d) d.conditions = [x.value]; guardar(); render(); }; });
      const nds = box.querySelector('[data-nds]'); if (nds) nds.onclick = () => nuevoDataset((nn) => { a[pestAct] = nn; guardar(); ir('author/pipeline:' + encodeURIComponent(n)); });
      const badd = box.querySelector('[data-badd]'); if (badd) badd.onclick = () => { a.baseParameters = a.baseParameters || {}; let i = 1; while (a.baseParameters['param' + i] !== undefined) i++; a.baseParameters['param' + i] = ''; guardar(); pintarProps(); };
      box.querySelectorAll('[data-bdel]').forEach((b) => { b.onclick = () => { delete a.baseParameters[b.dataset.bdel]; guardar(); pintarProps(); }; });
      box.querySelectorAll('[data-bv]').forEach((x) => { x.onchange = () => { a.baseParameters[x.dataset.bv] = x.value; guardar(); }; });
      box.querySelectorAll('[data-bk]').forEach((x) => { x.onchange = () => { const v = a.baseParameters[x.dataset.bk]; delete a.baseParameters[x.dataset.bk]; a.baseParameters[x.value.trim()] = v; guardar(); pintarProps(); }; });
    }
    async function debug() {
      actSel = null; panelValid = null;
      const r = correrPipeline(n, { tipo: 'Debug', definicion: JSON.parse(JSON.stringify(P)), alCambiar: () => { salidaDebug = S.runs.find((x) => x.pipeline === n && x.debug) || salidaDebug; if (sel.tipo === 'pipeline' && sel.n === n && document.getElementById('adfProps')) render(); } });
      salidaDebug = S.runs[0]; render();
      await r;
    }
    pintarProps();
  }
  function tablaActs(r) {
    return `<table class="adf-tabla"><thead><tr><th>Activity name</th><th>Activity type</th><th>Run start</th><th>Duration</th><th>Status</th><th>Input</th><th>Output</th><th>Error</th></tr></thead><tbody>${r.acts.map((a, i) => `<tr><td>${esc(a.name)}</td><td>${esc((TIPOS_ACT[a.type] || {}).nombre || a.type)}</td><td>${hora(a.inicio)}</td><td>${a.fin ? Math.max(1, Math.round((new Date(a.fin) - new Date(a.inicio)) / 1000)) + 's' : '…'}</td><td><span class="adf-estado e-${a.estado}">${esc(a.estado)}</span></td><td><button class="adf-ib" data-io="in:${i}" title="Input">${ic('sign-in')}</button></td><td>${a.output ? `<button class="adf-ib" data-io="out:${i}" title="Output">${ic('sign-out')}</button>` : ''}</td><td>${a.error ? `<button class="adf-ib adf-mal" data-io="err:${i}" title="${esc(a.error.message.slice(0, 200))}">${ic('error')}</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="8" class="adf-dim">Sin actividades todavía…</td></tr>'}</tbody></table>`;
  }
  function enlazarIO(box, r) {
    box.querySelectorAll('[data-io]').forEach((b) => { b.onclick = () => { const [k, i] = b.dataset.io.split(':'); const a = r.acts[+i]; const obj = k === 'in' ? a.input : k === 'out' ? a.output : a.error; dialogo({ titulo: `${k === 'in' ? 'Input' : k === 'out' ? 'Output' : 'Error details'} · ${a.name}`, ok: null, ancho: 680, cuerpo: k === 'err' ? `<p><b>Error code</b> ${esc(a.error.errorCode)} · <b>Failure type</b> ${esc(a.error.failureType)}</p><pre class="adf-json">${esc(a.error.message)}</pre>` : `<pre class="adf-json">${esc(JSON.stringify(obj, null, 4))}</pre>` }); }; });
  }
  async function triggerNow(n) {
    const S = st(); const pub = S.publicado ? JSON.parse(S.publicado) : null;
    if (!pub || !pub.pipelines[n]) return dialogo({ titulo: 'Trigger now', ok: null, cuerpo: '<p><b>Trigger now</b> ejecuta la versión <b>publicada</b> del pipeline, y este pipeline todavía no se publicó. Usa <b>Debug</b> para probar los cambios o <b>Publish all</b> primero.</p>' });
    const params = pub.pipelines[n].parameters || {};
    dialogo({ titulo: 'Pipeline run', ok: 'OK', cuerpo: `${Object.keys(params).length ? `<p>Parameters</p>${Object.entries(params).map(([k, v]) => `<label class="adf-campo"><span>${esc(k)}</span><input data-tp="${esc(k)}" value="${esc(v)}"></label>`).join('')}` : '<p>El pipeline no tiene parámetros.</p>'}${pendientes().some((p) => p[1] === n) ? '<div class="adf-aviso">⚠ Hay cambios sin publicar en este pipeline: se va a ejecutar la versión publicada.</div>' : ''}`, alOk: (d) => {
      const def = JSON.parse(JSON.stringify(pub.pipelines[n])); d.querySelectorAll('[data-tp]').forEach((x) => { def.parameters[x.dataset.tp] = x.value; });
      correrPipeline(n, { tipo: 'Manual', definicion: def, alCambiar: () => { if (vista === 'monitor' && document.getElementById('adfMain')) vMonitor(document.getElementById('adfMain')); } });
      ctx.toast && ctx.toast(`Running pipeline: ${n}. Míralo en Monitor.`);
    } });
  }
  function nuevoTrigger(pipe) {
    const S = st();
    dialogo({ titulo: 'Add triggers', ancho: 560, cuerpo: `<label class="adf-campo"><span>Choose trigger</span><select id="tE"><option value="">+ New</option>${Object.keys(S.triggers).map((t) => `<option>${esc(t)}</option>`).join('')}</select></label><div id="tNuevo"><label class="adf-campo"><span>Name</span><input id="tN" value="${esc(nombreLibre(S.triggers, 'trigger'))}"></label><label class="adf-campo"><span>Type</span><select id="tT"><option value="ScheduleTrigger">Schedule</option><option value="BlobEventsTrigger">Storage events</option></select></label><label class="adf-campo"><span>Recurrence</span><span class="adf-ruta">Every <input id="tI" type="number" min="1" value="1" style="width:70px"> <select id="tF"><option value="Minute">Minute(s)</option><option value="Hour">Hour(s)</option><option value="Day" selected>Day(s)</option><option value="Week">Week(s)</option></select></span></label><label class="adf-check"><input type="checkbox" id="tA" checked> Start trigger on creation (Activated)</label></div><p class="adf-dim">Un trigger solo dispara la versión publicada: después de crearlo, <b>Publish all</b>.</p>`,
      alAbrir: (d) => { d.querySelector('#tE').onchange = (e) => { d.querySelector('#tNuevo').hidden = !!e.target.value; }; },
      alOk: (d) => {
        const ex = d.querySelector('#tE').value;
        if (ex) { const T = S.triggers[ex]; T.pipelines = [...new Set([...(T.pipelines || []), pipe])]; guardar(); render(); return; }
        const n = d.querySelector('#tN').value.trim(); if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(n)) throw new Error('Nombre inválido.'); if (S.triggers[n]) throw new Error('Ya existe un trigger con ese nombre.');
        S.triggers[n] = { type: d.querySelector('#tT').value, frequency: d.querySelector('#tF').value, interval: Number(d.querySelector('#tI').value) || 1, startTime: ahora(), runtimeState: d.querySelector('#tA').checked ? 'Started' : 'Stopped', pipelines: [pipe] };
        guardar(); render();
      } });
  }

  // ---- Monitor
  function vMonitor(M) {
    const S = st();
    if (monitor.run) {
      const r = S.runs.find((x) => x.runId === monitor.run); if (!r) { monitor.run = null; return vMonitor(M); }
      M.innerHTML = `<div class="adf-mon"><div class="adf-migas"><a data-a="volver">All pipeline runs</a> › <b>${esc(r.pipeline)}</b></div><div class="adf-mon-cab"><h2>${esc(r.pipeline)}</h2><span class="adf-estado e-${r.estado}">${esc(r.estado)}</span></div><p class="adf-dim">Run ID <code>${esc(r.runId)}</code> · ${esc(r.debug ? 'Debug' : r.trigger === 'Manual' ? 'Manual trigger' : r.trigger)} · ${hora(r.inicio)}${r.fin ? ` · ${Math.max(1, Math.round((new Date(r.fin) - new Date(r.inicio)) / 1000))}s` : ''}</p>${r.error ? `<div class="adf-aviso mal">${esc(r.error.message.split('\n')[0])}</div>` : ''}<h3>Activity runs</h3>${tablaActs(r)}<button class="adf-btn" data-a="rerun">${ic('refresh')} Rerun</button></div>`;
      M.querySelector('[data-a=volver]').onclick = () => { monitor.run = null; vMonitor(M); };
      M.querySelector('[data-a=rerun]').onclick = () => { const pub = S.publicado ? JSON.parse(S.publicado) : null; const def = r.debug ? S.pipelines[r.pipeline] : pub && pub.pipelines[r.pipeline]; if (!def) return; correrPipeline(r.pipeline, { tipo: r.debug ? 'Debug' : 'Rerun', definicion: JSON.parse(JSON.stringify(def)), alCambiar: () => { if (document.getElementById('adfMain') && vista === 'monitor') vMonitor(document.getElementById('adfMain')); } }); monitor.run = null; setTimeout(() => vMonitor(M), 50); };
      enlazarIO(M, r);
      return;
    }
    const lista = S.runs.filter((r) => (monitor.modo === 'debug' ? r.debug : !r.debug));
    M.innerHTML = `<div class="adf-mon"><h2>Pipeline runs</h2><div class="adf-pest grande"><a data-m="triggered" class="${monitor.modo === 'triggered' ? 'on' : ''}">Triggered</a><a data-m="debug" class="${monitor.modo === 'debug' ? 'on' : ''}">Debug</a></div>
      <div class="adf-tb"><button data-a="refrescar">${ic('refresh')} Refresh</button><span class="adf-dim">Últimas ${lista.length} ejecuciones</span></div>
      <table class="adf-tabla adf-runs"><thead><tr><th>Pipeline name</th><th>Run start</th><th>Run end</th><th>Duration</th><th>Triggered by</th><th>Status</th><th>Run ID</th></tr></thead><tbody>${lista.map((r) => `<tr><td><a data-run="${r.runId}">${esc(r.pipeline)}</a></td><td>${hora(r.inicio)}</td><td>${hora(r.fin)}</td><td>${r.fin ? Math.max(1, Math.round((new Date(r.fin) - new Date(r.inicio)) / 1000)) + 's' : '…'}</td><td>${esc(r.debug ? 'Debug' : r.trigger === 'Manual' ? 'Manual trigger' : r.trigger)}</td><td><span class="adf-estado e-${r.estado}">${esc(r.estado)}</span></td><td><code>${esc(r.runId.slice(0, 8))}…</code></td></tr>`).join('') || '<tr><td colspan="7" class="adf-dim">No hay ejecuciones. Usa Trigger now (publicado) o Debug desde Author.</td></tr>'}</tbody></table>
      ${monitor.modo === 'triggered' ? `<h2 style="margin-top:22px">Triggers</h2><table class="adf-tabla"><thead><tr><th>Name</th><th>Type</th><th>Recurrence</th><th>Status</th><th>Pipelines</th><th></th></tr></thead><tbody>${Object.entries(S.triggers).map(([t, T]) => `<tr><td>${esc(t)}</td><td>${esc(T.type === 'ScheduleTrigger' ? 'Schedule' : 'Storage events')}</td><td>${T.type === 'ScheduleTrigger' ? `Every ${T.interval} ${esc(T.frequency)}(s)` : '—'}</td><td>${esc(T.runtimeState)}</td><td>${esc((T.pipelines || []).join(', '))}</td><td><button class="adf-btn" data-fire="${esc(t)}" title="Simula que llega la hora del trigger">${ic('play')} Simular disparo</button></td></tr>`).join('') || '<tr><td colspan="6" class="adf-dim">Sin triggers.</td></tr>'}</tbody></table>` : ''}</div>`;
    M.querySelectorAll('[data-m]').forEach((a) => { a.onclick = () => { monitor.modo = a.dataset.m; vMonitor(M); }; });
    M.querySelector('[data-a=refrescar]').onclick = () => vMonitor(M);
    M.querySelectorAll('[data-run]').forEach((a) => { a.onclick = () => { monitor.run = a.dataset.run; vMonitor(M); }; });
    M.querySelectorAll('[data-fire]').forEach((b) => { b.onclick = () => {
      const t = b.dataset.fire; const pub = S.publicado ? JSON.parse(S.publicado) : null; const T = pub && pub.triggers[t];
      if (!T) return dialogo({ titulo: 'Trigger', ok: null, cuerpo: '<p>Este trigger no está publicado: el servicio todavía no lo conoce. Haz <b>Publish all</b>.</p>' });
      if (T.runtimeState !== 'Started') return dialogo({ titulo: 'Trigger', ok: null, cuerpo: '<p>El trigger publicado está <b>Stopped</b>: no dispara. Actívalo en Manage → Triggers y publica.</p>' });
      for (const p of T.pipelines || []) if (pub.pipelines[p]) correrPipeline(p, { tipo: t, definicion: JSON.parse(JSON.stringify(pub.pipelines[p])), alCambiar: () => { if (document.getElementById('adfMain') && vista === 'monitor' && !monitor.run) vMonitor(document.getElementById('adfMain')); } });
    }; });
  }

  // ---- Manage
  function manage(M) {
    const S = st();
    M.innerHTML = `<div class="adf-manage"><nav class="adf-man-nav"><div class="adf-dim">Connections</div><a data-g="linked" class="${gestion === 'linked' ? 'on' : ''}">${ic('plug')} Linked services</a><a data-g="ir" class="${gestion === 'ir' ? 'on' : ''}">${ic('server-environment')} Integration runtimes</a><div class="adf-dim">Author</div><a data-g="triggers" class="${gestion === 'triggers' ? 'on' : ''}">${ic('zap')} Triggers</a><div class="adf-dim">Source control</div><a data-g="git" class="${gestion === 'git' ? 'on' : ''}">${ic('git-branch')} Git configuration</a></nav><section class="adf-man-c" id="manC"></section></div>`;
    M.querySelectorAll('[data-g]').forEach((a) => { a.onclick = () => { gestion = a.dataset.g; manage(M); }; });
    const C = M.querySelector('#manC');
    if (gestion === 'ir') { C.innerHTML = '<h2>Integration runtimes</h2><table class="adf-tabla"><thead><tr><th>Name</th><th>Type</th><th>Sub-type</th><th>Status</th><th>Region</th></tr></thead><tbody><tr><td>AutoResolveIntegrationRuntime</td><td>Azure</td><td>Public</td><td><span class="adf-estado e-Succeeded">Running</span></td><td>Auto Resolve</td></tr></tbody></table><p class="adf-dim">El integration runtime es el cómputo que mueve los datos. El de Azure lo administra Microsoft; para orígenes dentro de una red privada u on-premises se instala un <b>self-hosted IR</b>.</p>'; return; }
    if (gestion === 'git') { C.innerHTML = '<h2>Git configuration</h2><p>No hay un repositorio configurado (live mode): los cambios se guardan directamente en el servicio al publicar.</p><p class="adf-dim">En equipos se conecta Azure DevOps o GitHub: cada uno trabaja en su rama, se hace un pull request a la <i>collaboration branch</i> y al publicar se generan las plantillas ARM en <code>adf_publish</code> para desplegar a otros entornos con CI/CD.</p>'; return; }
    if (gestion === 'triggers') {
      C.innerHTML = `<h2>Triggers</h2><table class="adf-tabla"><thead><tr><th>Name</th><th>Type</th><th>Recurrence</th><th>Status</th><th>Related</th><th></th></tr></thead><tbody>${Object.entries(S.triggers).map(([t, T]) => `<tr><td>${esc(t)}</td><td>${T.type === 'ScheduleTrigger' ? 'Schedule' : 'Storage events'}</td><td>Every ${T.interval} ${esc(T.frequency)}(s)</td><td><button class="adf-btn" data-tog="${esc(t)}">${T.runtimeState === 'Started' ? `${ic('debug-pause')} Started` : `${ic('play')} Stopped`}</button></td><td>${esc((T.pipelines || []).join(', '))}</td><td><button class="adf-ib" data-tdel="${esc(t)}">${ic('trash')}</button></td></tr>`).join('') || '<tr><td colspan="6" class="adf-dim">Crea triggers desde un pipeline: Add trigger → New/Edit.</td></tr>'}</tbody></table>`;
      C.querySelectorAll('[data-tog]').forEach((b) => { b.onclick = () => { const T = S.triggers[b.dataset.tog]; T.runtimeState = T.runtimeState === 'Started' ? 'Stopped' : 'Started'; guardar(); render(); }; });
      C.querySelectorAll('[data-tdel]').forEach((b) => { b.onclick = () => { delete S.triggers[b.dataset.tdel]; guardar(); render(); }; });
      return;
    }
    C.innerHTML = `<h2>Linked services</h2><p class="adf-dim">Un linked service es la "cadena de conexión": a dónde conectarse y con qué credencial. Los datasets y las actividades lo usan.</p><div class="adf-tb"><button data-a="nuevo">${ic('add')} New</button></div><table class="adf-tabla"><thead><tr><th>Name</th><th>Type</th><th>Related</th><th></th></tr></thead><tbody>${Object.entries(S.linked).map(([n, L]) => `<tr><td><a data-ver="${esc(n)}">${esc(n)}</a></td><td>${esc(LS_TIPOS[L.type])}</td><td>${Object.values(S.datasets).filter((d) => d.linked === n).length + Object.values(S.pipelines).reduce((s, P) => s + P.activities.filter((a) => a.linked === n).length, 0)}</td><td><button class="adf-ib" data-ldel="${esc(n)}">${ic('trash')}</button></td></tr>`).join('') || '<tr><td colspan="4" class="adf-dim">No hay linked services.</td></tr>'}</tbody></table>`;
    C.querySelector('[data-a=nuevo]').onclick = () => nuevoLinked();
    C.querySelectorAll('[data-ver]').forEach((a) => { a.onclick = () => dialogo({ titulo: a.dataset.ver, ok: null, ancho: 640, cuerpo: `<pre class="adf-json">${esc(JSON.stringify(linkedJson(a.dataset.ver, S.linked[a.dataset.ver]), (k, v) => (v === undefined ? undefined : v), 4))}</pre>` }); });
    C.querySelectorAll('[data-ldel]').forEach((b) => { b.onclick = () => { const n = b.dataset.ldel; const usos = Object.entries(S.datasets).filter(([, d]) => d.linked === n).length + Object.values(S.pipelines).reduce((s, P) => s + P.activities.filter((a) => a.linked === n).length, 0); if (usos) return dialogo({ titulo: 'Delete', ok: null, cuerpo: '<p>No se puede borrar: lo usan datasets o actividades.</p>' }); delete S.linked[n]; guardar(); render(); }; });
  }
  function nuevoLinked() {
    const S = st(), A = az();
    dialogo({ titulo: 'New linked service', ancho: 600, ok: 'Create', cuerpo: `<label class="adf-campo"><span>Data store</span><select id="lT">${Object.entries(LS_TIPOS).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('')}</select></label><label class="adf-campo"><span>Name</span><input id="lN" value="ls_adls"></label><div id="lC"></div><div class="adf-tb"><button class="adf-btn" data-a="test">${ic('plug')} Test connection</button><span id="lR"></span></div>`,
      alAbrir: (d) => {
        const pinta = () => {
          const t = d.querySelector('#lT').value;
          d.querySelector('#lN').value = { AzureBlobFS: 'ls_adls', AzureBlobStorage: 'ls_blob', AzureDatabricks: 'ls_databricks', AzureKeyVault: 'ls_keyvault' }[t];
          d.querySelector('#lC').innerHTML = t === 'AzureBlobFS' || t === 'AzureBlobStorage'
            ? `<label class="adf-campo"><span>Authentication type</span><select id="lAu"><option value="msi">System-assigned managed identity</option><option value="key">Account key</option></select></label><label class="adf-campo"><span>Storage account name</span><select id="lA">${Object.keys(A.storage).map((n) => `<option>${esc(n)}</option>`).join('') || '<option value="">(no hay cuentas: créalas en el portal)</option>'}</select></label><p class="adf-dim">Managed identity name: <code>${esc(fabrica)}</code>. Asígnale <i>Storage Blob Data Contributor</i> en la cuenta (IAM) para que pueda leer y escribir.</p>`
            : t === 'AzureDatabricks' ? `<label class="adf-campo"><span>Databricks workspace</span><select id="lW">${Object.keys(A.dbw).map((n) => `<option>${esc(n)}</option>`).join('') || '<option value="">(no hay workspaces: créalo en el portal)</option>'}</select></label><label class="adf-campo"><span>Select cluster</span><select id="lCl"><option value="job">New job cluster</option><option value="existing">Existing interactive cluster</option></select></label><label class="adf-campo"><span>Authentication type</span><select><option>Managed service identity</option><option>Access token (desde Key Vault)</option></select></label>`
              : `<label class="adf-campo"><span>Azure key vault</span><select id="lV">${Object.keys(A.kv).map((n) => `<option>${esc(n)}</option>`).join('') || '<option value="">(no hay key vaults)</option>'}</select></label>`;
        };
        d.querySelector('#lT').onchange = pinta; pinta();
        d.querySelector('[data-a=test]').onclick = () => { const L = leer(d); const e = probarLinked(L); d.querySelector('#lR').innerHTML = e ? `<span class="adf-mal">${ic('error')} Connection failed</span><pre class="adf-json">${esc(e)}</pre>` : `<span class="adf-ok">${ic('pass-filled')} Connection successful</span>`; };
      },
      alOk: (d) => {
        const n = d.querySelector('#lN').value.trim(); if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(n)) throw new Error('Nombre inválido.'); if (S.linked[n]) throw new Error('Ya existe un linked service con ese nombre.');
        const L = leer(d); if ((L.type === 'AzureBlobFS' || L.type === 'AzureBlobStorage') && !L.account) throw new Error('Elige la cuenta de almacenamiento.'); if (L.type === 'AzureDatabricks' && !L.workspace) throw new Error('Elige el workspace.'); if (L.type === 'AzureKeyVault' && !L.vault) throw new Error('Elige el key vault.');
        S.linked[n] = L; guardar(); render();
      } });
    function leer(d) { const t = d.querySelector('#lT').value; return t === 'AzureDatabricks' ? { type: t, workspace: (d.querySelector('#lW') || {}).value } : t === 'AzureKeyVault' ? { type: t, vault: (d.querySelector('#lV') || {}).value } : { type: t, account: (d.querySelector('#lA') || {}).value, auth: (d.querySelector('#lAu') || {}).value }; }
  }

  function vistaPublica(m, c, sub) {
    main = m; ctx = c;
    if (window.Shell && window.Shell.Machine && !window.Shell.Machine.ready) window.Shell.Machine.load();
    const nueva = decodeURIComponent(sub[0] || '');
    if (nueva !== fabrica) { fabrica = nueva; vista = 'home'; sel = { tipo: null, n: null }; actSel = null; salidaDebug = null; monitor = { run: null, modo: 'triggered' }; }
    document.body.classList.add('adf-abierto');
    render(sub.slice(1));
  }
  window.addEventListener('hashchange', () => { if (!/^#\/azure\/studio\//.test(location.hash)) document.body.classList.remove('adf-abierto'); });
  window.ADFStudio = { vista: vistaPublica, _correr: (n, o) => correrPipeline(n, o), _validar: (n) => validar(n) };
})();
