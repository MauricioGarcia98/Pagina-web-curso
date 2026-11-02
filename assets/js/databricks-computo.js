/* Databricks de práctica — cómputo y orquestación: compute (clusters), SQL warehouses, Lakeflow Jobs
 * (tareas con dependencias, Run if, reintentos, parámetros, task values, horarios, repair run) y
 * Lakeflow Declarative Pipelines (tablas de streaming, vistas materializadas y expectativas).
 *
 * Los clusters, warehouses y jobs viven en el estado de la CLI simulada (`databricks clusters list`,
 * `databricks jobs list`), así que se ven en los dos lados. Los nombres de campos, estados y eventos son
 * los de la API de Databricks (state, result_state, life_cycle_state, data_security_mode…).
 */
(function () {
  'use strict';
  const D = (window.DBX = window.DBX || {});
  const { esc, ic } = D;
  const SQLX = () => window.DBSQL;
  const uid = (n) => Array.from({ length: n }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('');
  const ahora = () => new Date().toISOString();
  const espera = (ms) => new Promise((r) => setTimeout(r, ms));

  // ------------------------------------------------------------------ catálogo de opciones (documentación de compute)
  const RUNTIMES = [
    ['17.3.x-scala2.13', '17.3 LTS (includes Apache Spark 4.0.0, Scala 2.13)'],
    ['16.4.x-scala2.12', '16.4 LTS (includes Apache Spark 3.5.2, Scala 2.12)'],
    ['15.4.x-scala2.12', '15.4 LTS (includes Apache Spark 3.5.0, Scala 2.12)'],
    ['14.3.x-scala2.12', '14.3 LTS (includes Apache Spark 3.5.0, Scala 2.12)'],
    ['13.3.x-scala2.12', '13.3 LTS (includes Apache Spark 3.4.1, Scala 2.12)'],
  ];
  // DBU por hora estimados para la práctica (los reales dependen del tipo de VM, el plan y la región)
  const NODOS = {
    Standard_D4ds_v5: { cores: 4, mem: 16, dbu: 1.0, cat: 'General purpose' }, Standard_D8ds_v5: { cores: 8, mem: 32, dbu: 2.0, cat: 'General purpose' }, Standard_D16ds_v5: { cores: 16, mem: 64, dbu: 4.0, cat: 'General purpose' },
    Standard_E8ds_v5: { cores: 8, mem: 64, dbu: 2.5, cat: 'Memory optimized' }, Standard_E16ds_v5: { cores: 16, mem: 128, dbu: 5.0, cat: 'Memory optimized' },
    Standard_F8s_v2: { cores: 8, mem: 16, dbu: 1.5, cat: 'Compute optimized' }, Standard_L8s_v3: { cores: 8, mem: 64, dbu: 2.0, cat: 'Storage optimized' },
    Standard_NC4as_T4_v3: { cores: 4, mem: 28, dbu: 2.0, cat: 'GPU accelerated (1 x T4)' },
  };
  const POLITICAS = { unrestricted: 'Unrestricted', personal: 'Personal Compute', compartido: 'Shared Compute', poder: 'Power User Compute' };
  const TAM_WH = [['2X-Small', 4], ['X-Small', 6], ['Small', 12], ['Medium', 24], ['Large', 40], ['X-Large', 80], ['2X-Large', 144], ['3X-Large', 272], ['4X-Large', 528]];
  const nodo = (n) => NODOS[n] || { cores: 4, mem: 16, dbu: 1, cat: '' };
  const normCluster = (c) => Object.assign({ min: null, max: null, autoscale: false, autoterm: 120, modo: 'Auto', photon: false, spot: false, politica: 'unrestricted', eventos: [], librerias: [], tags: {}, unNodo: false, driver: null, sparkConf: '' }, c);

  // ------------------------------------------------------------------ motor de compute
  const Compute = D.Compute = {
    evento(id, tipo, det = {}) { const c = D.cli().clusters[id]; if (!c) return; c.eventos = c.eventos || []; c.eventos.unshift({ t: ahora(), tipo, det }); c.eventos = c.eventos.slice(0, 80); },
    uso(sku, dbu, extra = {}) { const C = D.cli(); C.uso = C.uso || []; C.uso.push({ id: uid(8), sku, dia: ahora().slice(0, 10), dbu: Math.round(dbu * 1e4) / 1e4, ...extra }); C.uso = C.uso.slice(-2000); },
    async iniciar(id) {
      const C = D.cli(); const c = C.clusters[id]; if (!c) throw new Error('Compute no encontrado');
      if (c.state === 'RUNNING') return;
      if (c.state === 'PENDING' || c.state === 'RESTARTING') return this.esperar(id);
      c.state = 'PENDING'; this.evento(id, 'STARTING', { user: D.USUARIO }); D.cliGuardar(); refrescar();
      await espera(3500);
      this.evento(id, 'DRIVER_HEALTHY'); c.state = 'RUNNING'; c.iniciado = Date.now(); c.ultimaActividad = Date.now(); this.evento(id, 'RUNNING', { current_num_workers: c.autoscale ? c.min : c.workers }); D.cliGuardar(); refrescar();
    },
    async esperar(id) { for (let i = 0; i < 40; i++) { const c = D.cli().clusters[id]; if (!c || c.state === 'RUNNING' || c.state === 'TERMINATED' || c.state === 'ERROR') return; await espera(500); } },
    terminar(id, motivo = 'USER_REQUEST') {
      const C = D.cli(); const c = C.clusters[id]; if (!c || c.state === 'TERMINATED') return;
      if (c.iniciado) { const horas = (Date.now() - c.iniciado) / 3600e3; const n = nodo(c.node); const nodos = 1 + (c.unNodo ? 0 : c.autoscale ? c.min || 1 : c.workers || 0); this.uso('PREMIUM_ALL_PURPOSE_COMPUTE' + (c.photon ? '_(PHOTON)' : ''), horas * n.dbu * nodos * (c.photon ? 2 : 1), { cluster: id }); }
      this.evento(id, 'TERMINATING', { reason: { code: motivo } }); c.state = 'TERMINATED'; c.iniciado = null; c.motivo = motivo; this.evento(id, 'TERMINATED', { reason: { code: motivo, type: motivo === 'INACTIVITY' ? 'SUCCESS' : 'SUCCESS' } }); D.cliGuardar();
    },
    actividad(id) { const c = D.cli().clusters[id]; if (c) { c.ultimaActividad = Date.now(); D.cliGuardar(); } },
    usoServerless(seg) { this.uso('PREMIUM_JOBS_SERVERLESS_COMPUTE_US_EAST', (seg / 3600) * 4, {}); D.cliGuardar(); },
    // autoterminación: si pasó el tiempo de inactividad configurado, el cluster se apaga solo
    revisar() { const C = D.cli(); let cambio = false; for (const [id, c0] of Object.entries(C.clusters || {})) { const c = normCluster(c0); if (c0.state === 'RUNNING' && c.autoterm > 0 && c0.ultimaActividad && Date.now() - c0.ultimaActividad > c.autoterm * 60e3) { this.terminar(id, 'INACTIVITY'); cambio = true; } } if (cambio) D.cliGuardar(); },
  };
  let refrescar = () => {};
  setInterval(() => { try { if (document.getElementById('dbx') && window.CloudSim) { Compute.revisar(); revisarHorarios(); } } catch (e) { /* nada */ } }, 30000);

  // ------------------------------------------------------------------ Compute: lista
  D.registrar('compute', (cont, p) => {
    if (p[0] === 'nuevo') return formCluster(cont, null);
    Compute.revisar();
    const C = D.cli(); const pest = p[0] || 'todos';
    const pintar = () => {
      const l = Object.entries(C.clusters || {}).map(([id, c]) => [id, normCluster(c)]);
      cont.innerHTML = `<div class="dbx-pag"><div class="dbx-pag-cab"><h1>Compute</h1><div class="dbx-acciones"><button class="dbx-btn primario" id="cNuevo">Create compute</button></div></div>
        <div class="dbx-pest"><a class="${pest === 'todos' ? 'on' : ''}" href="#/databricks/compute">All-purpose compute</a><a href="#/databricks/compute/jobs" class="${pest === 'jobs' ? 'on' : ''}">Job compute</a><a href="#/databricks/warehouses">SQL warehouses</a><a href="#/databricks/compute/pools" class="${pest === 'pools' ? 'on' : ''}">Pools</a><a href="#/databricks/compute/politicas" class="${pest === 'politicas' ? 'on' : ''}">Policies</a></div>
        ${pest === 'todos' ? (l.length ? `<table class="dbx-tabla"><thead><tr><th>State</th><th>Name</th><th>Policy</th><th>Runtime</th><th>Active memory</th><th>Active cores</th><th>Creator</th><th>Notebooks</th><th></th></tr></thead><tbody>${l.map(([id, c]) => { const n = nodo(c.node); const nodos = 1 + (c.unNodo ? 0 : c.autoscale ? c.min || 1 : c.workers || 0); const nbs = Object.values(D.ws().items).filter((it) => it.compute === id).length; return `<tr data-id="${id}"><td>${D.estadoPunto(c.state)}</td><td><a href="#/databricks/cluster/${id}">${esc(c.name)}</a></td><td>${esc(POLITICAS[c.politica] || 'Unrestricted')}</td><td>${esc((c.spark || '').split('.x')[0])}${c.photon ? ' · Photon' : ''}</td><td>${c.state === 'RUNNING' ? n.mem * nodos + ' GB' : '0 GB'}</td><td>${c.state === 'RUNNING' ? n.cores * nodos : 0}</td><td>Alumno Academia</td><td>${nbs}</td><td class="der">${c.state === 'RUNNING' ? `<button class="dbx-ib" data-a="parar" title="Terminate">${ic('debug-stop')}</button>` : c.state === 'TERMINATED' ? `<button class="dbx-ib" data-a="iniciar" title="Start">${ic('play')}</button>` : '<span class="dbx-gira"></span>'}<button class="dbx-ib" data-a="kebab">${ic('ellipsis')}</button></td></tr>`; }).join('')}</tbody></table>` : `<div class="dbx-vacio">${ic('cloud')}<p>No hay compute de uso general. Los notebooks pueden usar <b>Serverless</b> sin crear nada.</p></div>`)
        : pest === 'jobs' ? `<p class="dbx-dim">El <b>job compute</b> se crea al empezar una corrida de un job y se borra al terminar: es más barato que dejar encendido un cluster de uso general (la tarifa de DBU de Jobs es menor). Las corridas de esta práctica usan serverless o el cluster que elijas en la tarea.</p>${jobComputeHtml()}`
        : pest === 'pools' ? `<div class="dbx-vacio">${ic('server-process')}<p>Un <b>pool</b> mantiene VMs listas para que los clusters arranquen más rápido. Mientras están en el pool no se cobran DBU (sí la VM). No está simulado.</p></div>`
        : `<table class="dbx-tabla"><thead><tr><th>Policy</th><th>Qué controla</th></tr></thead><tbody><tr><td>Unrestricted</td><td>Sin límites (solo admins)</td></tr><tr><td>Personal Compute</td><td>Un solo nodo, modo de acceso Dedicated, para una persona</td></tr><tr><td>Shared Compute</td><td>Modo de acceso Standard (varios usuarios con aislamiento)</td></tr><tr><td>Power User Compute</td><td>Clusters con varios nodos y autoescalado</td></tr><tr><td>Job Compute</td><td>Clusters de jobs</td></tr></tbody></table><p class="dbx-dim">Las políticas limitan y fijan atributos del cluster (por ejemplo <code>autotermination_minutes</code> o los tipos de nodo permitidos) para controlar costos.</p>`}
      </div>`;
      const n0 = cont.querySelector('#cNuevo'); n0.onclick = () => D.ir('compute/nuevo');
      cont.querySelectorAll('tr[data-id]').forEach((tr) => tr.addEventListener('click', async (e) => {
        const b = e.target.closest('[data-a]'); if (!b) return; const id = tr.dataset.id;
        if (b.dataset.a === 'iniciar') { const pr = Compute.iniciar(id); pintar(); await pr; pintar(); }
        if (b.dataset.a === 'parar') { Compute.terminar(id); pintar(); }
        if (b.dataset.a === 'kebab') D.menu(b, [{ ic: 'edit', txt: 'Edit', fn: () => D.ir('cluster/' + id + '/editar') }, { ic: 'copy', txt: 'Clone', fn: () => { const c = JSON.parse(JSON.stringify(C.clusters[id])); const nid = `${uid(4)}-${uid(6)}-${uid(8)}`; C.clusters[nid] = { ...c, name: c.name + ' (clone)', state: 'TERMINATED', eventos: [], iniciado: null }; D.cliGuardar(); pintar(); } }, { ic: 'debug-restart', txt: 'Restart', fn: async () => { Compute.terminar(id, 'USER_REQUEST'); const pr = Compute.iniciar(id); pintar(); await pr; pintar(); } }, '-', { ic: 'trash', txt: 'Delete', peligro: true, fn: () => { if (!confirm(`¿Borrar ${C.clusters[id].name}? No se puede deshacer.`)) return; Compute.terminar(id); delete C.clusters[id]; D.cliGuardar(); pintar(); } }], 'der');
      }));
    };
    refrescar = () => { if (location.hash.startsWith('#/databricks/compute') && !location.hash.includes('nuevo')) pintar(); };
    D.alSalir(() => { refrescar = () => {}; });
    pintar();
  });
  function jobComputeHtml() {
    const C = D.cli(); const runs = Object.entries(C.jobs || {}).flatMap(([id, j]) => (j.runs || []).filter((r) => r.tareas).map((r) => ({ id, j, r }))).slice(0, 10);
    return runs.length ? `<table class="dbx-tabla"><thead><tr><th>Job</th><th>Run</th><th>Compute</th><th>Duración</th></tr></thead><tbody>${runs.map((x) => `<tr><td>${esc(x.j.name)}</td><td><a href="#/databricks/run/${x.id}/${x.r.run_id}">${x.r.run_id}</a></td><td>job-${x.id}-run-${x.r.run_id} (serverless)</td><td>${x.r.ms ? Math.round(x.r.ms / 100) / 10 + ' s' : ''}</td></tr>`).join('')}</tbody></table>` : '';
  }

  // ------------------------------------------------------------------ Compute: formulario (crear / editar)
  function formCluster(cont, id) {
    const C = D.cli(); const prev = id ? normCluster(C.clusters[id]) : null;
    const v = prev || normCluster({ name: `Alumno Academia's Cluster`, spark: RUNTIMES[1][0], node: 'Standard_D4ds_v5', workers: 2, min: 2, max: 8, autoscale: true, autoterm: 120, politica: 'unrestricted', modo: 'Auto', photon: true });
    cont.innerHTML = `<div class="dbx-pag cf"><div class="dbx-migas"><a href="#/databricks/compute">Compute</a></div><div class="dbx-pag-cab"><h1>${id ? 'Edit compute' : 'New compute'}</h1></div>
      <div class="cf-lay"><form class="cf-form" id="cf" autocomplete="off">
        <label class="dbx-campo"><span>Compute name</span><input name="name" value="${esc(v.name)}"></label>
        <label class="dbx-campo"><span>Policy</span><select name="politica">${Object.entries(POLITICAS).map(([k, n]) => `<option value="${k}" ${v.politica === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
        <h3>Performance</h3>
        <label class="dbx-check"><input type="checkbox" name="ml" ${/ml/.test(v.spark) ? 'checked' : ''}> Machine learning <small>(runtime con bibliotecas de ML)</small></label>
        <label class="dbx-campo"><span>Databricks runtime</span><select name="spark">${RUNTIMES.map(([k, n]) => `<option value="${k}" ${v.spark.replace('-cpu-ml', '') === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
        <label class="dbx-check"><input type="checkbox" name="photon" ${v.photon ? 'checked' : ''}> Photon acceleration <small>(motor vectorizado: más rápido, cobra más DBU por hora)</small></label>
        <label class="dbx-campo"><span>Worker type</span><select name="node">${Object.entries(NODOS).map(([k, n]) => `<option value="${k}" ${v.node === k ? 'selected' : ''}>${k} · ${n.mem} GB Memory, ${n.cores} Cores (${n.cat})</option>`).join('')}</select></label>
        <label class="dbx-check"><input type="checkbox" name="unNodo" ${v.unNodo ? 'checked' : ''}> Single node <small>(solo el driver, sin workers)</small></label>
        <div class="cf-fila" data-trab><label class="dbx-campo chico"><span>Min workers</span><input type="number" name="min" min="0" max="100" value="${v.min ?? 2}"></label><label class="dbx-campo chico"><span>Max workers</span><input type="number" name="max" min="1" max="100" value="${v.max ?? 8}"></label><label class="dbx-campo chico" data-fijo><span>Workers</span><input type="number" name="workers" min="0" max="100" value="${v.workers ?? 2}"></label></div>
        <label class="dbx-check" data-trab2><input type="checkbox" name="autoscale" ${v.autoscale ? 'checked' : ''}> Enable autoscaling</label>
        <label class="dbx-campo"><span>Driver type</span><select name="driver"><option value="">Same as worker</option>${Object.keys(NODOS).map((k) => `<option ${v.driver === k ? 'selected' : ''}>${k}</option>`).join('')}</select></label>
        <h3>Advanced performance</h3>
        <div class="cf-fila"><label class="dbx-check"><input type="checkbox" name="conAutoterm" ${v.autoterm > 0 ? 'checked' : ''}> Terminate after</label><input class="cf-num" type="number" name="autoterm" min="10" max="10000" value="${v.autoterm > 0 ? v.autoterm : 120}"><span>minutes of inactivity</span></div>
        <label class="dbx-check"><input type="checkbox" name="spot" ${v.spot ? 'checked' : ''}> Spot instances <small>(más baratas, Azure puede recuperarlas; el driver siempre es on-demand)</small></label>
        <h3>Tags</h3><div class="cf-fila"><input name="tagK" placeholder="Key" value="${esc(Object.keys(v.tags)[0] || '')}"><input name="tagV" placeholder="Value" value="${esc(Object.values(v.tags)[0] || '')}"></div>
        <details class="cf-adv"><summary>Advanced</summary>
          <label class="dbx-campo"><span>Access mode</span><select name="modo"><option ${v.modo === 'Auto' ? 'selected' : ''}>Auto</option><option ${v.modo === 'Standard' ? 'selected' : ''}>Standard</option><option ${v.modo === 'Dedicated' ? 'selected' : ''}>Dedicated</option></select><small class="dbx-dim">Auto elige Standard, salvo runtime de ML, GPU o runtime anterior a 14.3 (entonces Dedicated).</small></label>
          <label class="dbx-campo"><span>Spark config</span><textarea name="sparkConf" rows="3" placeholder="spark.sql.shuffle.partitions 64">${esc(v.sparkConf || '')}</textarea></label>
        </details>
        <div class="dbx-dlg-err" id="cfErr" hidden></div>
        <div class="cf-pie"><button type="button" class="dbx-btn" onclick="history.back()">Cancel</button><button type="submit" class="dbx-btn primario">${id ? 'Confirm' : 'Create compute'}</button></div>
      </form><aside class="cf-resumen" id="cfRes"></aside></div></div>`;
    const f = cont.querySelector('#cf');
    const leer = () => {
      const g = (n) => f.elements[n]; const ml = g('ml').checked;
      const x = { name: g('name').value.trim(), politica: g('politica').value, spark: ml ? g('spark').value.replace(/-scala/, '-cpu-ml-scala') : g('spark').value, photon: g('photon').checked && !ml, node: g('node').value, unNodo: g('unNodo').checked, autoscale: g('autoscale').checked, min: Number(g('min').value), max: Number(g('max').value), workers: Number(g('workers').value), driver: g('driver').value || null, autoterm: g('conAutoterm').checked ? Number(g('autoterm').value) : 0, spot: g('spot').checked, modo: g('modo').value, sparkConf: g('sparkConf').value, tags: g('tagK').value.trim() ? { [g('tagK').value.trim()]: g('tagV').value.trim() } : {} };
      if (x.politica === 'personal') { x.unNodo = true; x.modo = 'Dedicated'; }
      if (x.politica === 'compartido') x.modo = 'Standard';
      return x;
    };
    const modoReal = (x) => (x.modo !== 'Auto' ? x.modo : /ml/.test(x.spark) || /NC/.test(x.node) || Number(x.spark.split('.')[0]) < 14 || (Number(x.spark.split('.')[0]) === 14 && Number(x.spark.split('.')[1]) < 3) ? 'Dedicated' : 'Standard');
    const resumen = () => {
      const x = leer(); const n = nodo(x.node), dn = nodo(x.driver || x.node);
      const wMin = x.unNodo ? 0 : x.autoscale ? x.min : x.workers, wMax = x.unNodo ? 0 : x.autoscale ? x.max : x.workers;
      const k = x.photon ? 2 : 1; const dbu = (w) => (dn.dbu + n.dbu * w) * k;
      cont.querySelector('[data-trab]').style.display = x.unNodo ? 'none' : '';
      cont.querySelector('[data-trab2]').style.display = x.unNodo ? 'none' : '';
      cont.querySelectorAll('[name=min],[name=max]').forEach((i) => { i.closest('label').style.display = x.autoscale ? '' : 'none'; });
      cont.querySelector('[data-fijo]').style.display = x.autoscale ? 'none' : '';
      f.elements.autoterm.disabled = !f.elements.conAutoterm.checked;
      cont.querySelector('#cfRes').innerHTML = `<h3>Summary</h3>
        <div class="cf-r"><b>${x.unNodo ? '1 Driver (single node)' : x.autoscale ? `${wMin}-${wMax} Workers` : `${wMax} Workers`}</b><span>${x.unNodo ? '' : `${n.mem * wMin}${x.autoscale ? '-' + n.mem * wMax : ''} GB Memory, ${n.cores * wMin}${x.autoscale ? '-' + n.cores * wMax : ''} Cores`}</span></div>
        <div class="cf-r"><b>1 Driver</b><span>${dn.mem} GB Memory, ${dn.cores} Cores</span></div>
        <div class="cf-r"><b>Runtime</b><span>${esc(x.spark)}</span></div>
        <div class="cf-chips"><span class="dbx-chip">Unity Catalog</span>${x.photon ? '<span class="dbx-chip">Photon</span>' : ''}<span class="dbx-chip">${esc(x.node)}</span><span class="dbx-chip">${modoReal(x)}</span>${x.spot ? '<span class="dbx-chip">Spot</span>' : ''}</div>
        <div class="cf-dbu"><b>${dbu(wMin).toFixed(1)}${x.autoscale && !x.unNodo ? '–' + dbu(wMax).toFixed(1) : ''} DBU/h</b><span>estimado para la práctica · ${x.autoterm ? `se apaga tras ${x.autoterm} min sin uso` : '<b style="color:#c4320a">nunca se apaga solo</b>'}</span></div>
        <p class="dbx-dim">El costo real = DBU × tarifa del plan (Premium) + el precio de las VMs de Azure. Un cluster de uso general cobra mientras está encendido aunque no lo uses: por eso importa la autoterminación.</p>`;
    };
    f.addEventListener('input', resumen); f.addEventListener('change', resumen); resumen();
    f.onsubmit = async (e) => {
      e.preventDefault(); const x = leer(); const errEl = cont.querySelector('#cfErr');
      const mal = (m) => { errEl.hidden = false; errEl.textContent = m; };
      if (!x.name) return mal('El nombre del compute es obligatorio.');
      if (x.autoterm && (x.autoterm < 10 || x.autoterm > 10000)) return mal('INVALID_PARAMETER_VALUE: autotermination_minutes debe estar entre 10 y 10000 (o desactivar la autoterminación).');
      if (!x.unNodo && x.autoscale && (x.min > x.max || x.max < 1)) return mal('INVALID_PARAMETER_VALUE: min_workers no puede ser mayor que max_workers.');
      if (!x.unNodo && !x.autoscale && x.workers < 0) return mal('Cantidad de workers inválida.');
      if (/NC/.test(x.node) && !/ml/.test(x.spark)) return mal('Los nodos con GPU necesitan un runtime de Machine Learning (marca "Machine learning").');
      const cid = id || `${uid(4)}-${uid(6)}-${uid(8)}`;
      C.clusters[cid] = { ...(id ? C.clusters[id] : {}), ...x, state: id ? C.clusters[id].state : 'PENDING', creado: id ? C.clusters[id].creado : ahora() };
      if (id) { Compute.evento(cid, 'EDITED', { user: D.USUARIO }); D.cliGuardar(); D.toast('Compute actualizado' + (C.clusters[cid].state === 'RUNNING' ? ': reinícialo para aplicar los cambios' : '')); return D.ir('cluster/' + cid); }
      Compute.evento(cid, 'CREATING', { user: D.USUARIO }); C.clusters[cid].state = 'TERMINATED'; D.cliGuardar();
      D.ir('cluster/' + cid); Compute.iniciar(cid);
    };
  }

  // ------------------------------------------------------------------ Compute: detalle
  D.registrar('cluster', (cont, p) => {
    const C = D.cli(); const id = p[0]; if (!C.clusters[id]) return D.stub(cont, 'Compute no encontrado', 'Ese compute no existe (puede que lo hayas borrado).', [['Compute', '#/databricks/compute']]);
    if (p[1] === 'editar') return formCluster(cont, id);
    const pest = p[1] || 'config';
    const pintar = () => {
      const c = normCluster(C.clusters[id]); const n = nodo(c.node);
      const nbs = Object.entries(D.ws().items).filter(([, it]) => it.compute === id);
      cont.innerHTML = `<div class="dbx-pag"><div class="dbx-migas"><a href="#/databricks/compute">Compute</a></div>
        <div class="dbx-pag-cab"><h1>${D.estadoPunto(c.state)} ${esc(c.name)}</h1><div class="dbx-acciones">${c.state === 'RUNNING' ? `<button class="dbx-btn" data-a="restart">${ic('debug-restart')} Restart</button><button class="dbx-btn" data-a="parar">${ic('debug-stop')} Terminate</button>` : c.state === 'TERMINATED' || c.state === 'ERROR' ? `<button class="dbx-btn primario" data-a="iniciar">${ic('play')} Start</button>` : `<span class="dbx-chip">${ic('loading', 'codicon-modifier-spin')} ${esc(c.state)}</span>`}<button class="dbx-btn" data-a="editar">${ic('edit')} Edit</button><button class="dbx-ib" data-a="kebab">${ic('ellipsis')}</button></div></div>
        <div class="cx-meta"><span>${esc(c.state)}${c.motivo && c.state === 'TERMINATED' ? ` · ${c.motivo === 'INACTIVITY' ? 'Inactivity (auto termination)' : 'Terminated by user'}` : ''}</span><span>ID ${esc(id)}</span><span>${esc(c.spark)}</span></div>
        <div class="dbx-pest">${[['config', 'Configuration'], ['notebooks', `Notebooks (${nbs.length})`], ['librerias', 'Libraries'], ['eventos', 'Event log'], ['sparkui', 'Spark UI'], ['logs', 'Driver logs'], ['metricas', 'Metrics']].map(([k, t]) => `<a class="${pest === k ? 'on' : ''}" href="#/databricks/cluster/${id}/${k}">${t}</a>`).join('')}</div><div id="clP"></div></div>`;
      const box = cont.querySelector('#clP');
      if (pest === 'config') box.innerHTML = `<table class="dbx-tabla kv"><tbody>${[['Policy', POLITICAS[c.politica] || 'Unrestricted'], ['Databricks runtime', c.spark], ['Photon', c.photon ? 'Enabled' : 'Disabled'], ['Worker type', `${c.node} (${n.mem} GB, ${n.cores} cores)`], ['Workers', c.unNodo ? 'Single node' : c.autoscale ? `${c.min} - ${c.max} (autoscaling)` : c.workers], ['Driver type', c.driver || 'Same as worker'], ['Access mode', c.modo === 'Auto' ? 'Auto' : c.modo], ['data_security_mode', c.modo === 'Dedicated' || (c.modo === 'Auto' && /ml/.test(c.spark)) ? 'DATA_SECURITY_MODE_DEDICATED (SINGLE_USER)' : 'DATA_SECURITY_MODE_STANDARD (USER_ISOLATION)'], ['Auto termination', c.autoterm ? `${c.autoterm} minutes` : 'Disabled'], ['Spot instances', c.spot ? 'Yes (SPOT_WITH_FALLBACK_AZURE)' : 'No (ON_DEMAND_AZURE)'], ['Tags', Object.entries(c.tags).map(([k, x]) => `${k}=${x}`).join(', ') || '-'], ['Spark config', c.sparkConf || '-']].map(([k, x]) => `<tr><th>${esc(k)}</th><td>${esc(x)}</td></tr>`).join('')}</tbody></table><h3>JSON</h3><pre class="dbx-code">${esc(JSON.stringify({ cluster_name: c.name, spark_version: c.spark, node_type_id: c.node, driver_node_type_id: c.driver || c.node, ...(c.unNodo ? { num_workers: 0, spark_conf: { 'spark.master': 'local[*, 4]', 'spark.databricks.cluster.profile': 'singleNode' } } : c.autoscale ? { autoscale: { min_workers: c.min, max_workers: c.max } } : { num_workers: c.workers }), autotermination_minutes: c.autoterm, runtime_engine: c.photon ? 'PHOTON' : 'STANDARD', data_security_mode: c.modo === 'Dedicated' ? 'DATA_SECURITY_MODE_DEDICATED' : c.modo === 'Standard' ? 'DATA_SECURITY_MODE_STANDARD' : 'DATA_SECURITY_MODE_AUTO', azure_attributes: { availability: c.spot ? 'SPOT_WITH_FALLBACK_AZURE' : 'ON_DEMAND_AZURE', first_on_demand: 1 }, custom_tags: c.tags }, null, 2))}</pre>`;
      if (pest === 'notebooks') box.innerHTML = nbs.length ? `<table class="dbx-tabla"><tbody>${nbs.map(([pp]) => `<tr><td><a href="#/databricks/notebook/${D.ruta(pp)}">${ic('notebook')} ${esc(pp.split('/').pop())}</a></td><td>${esc(pp)}</td></tr>`).join('')}</tbody></table>` : '<p class="dbx-dim">Ningún notebook está conectado a este compute. En el notebook, elige el compute en el botón de la esquina superior derecha.</p>';
      if (pest === 'librerias') { box.innerHTML = `<div class="dbx-acciones" style="margin:8px 0"><button class="dbx-btn primario" id="libN">Install new</button></div><table class="dbx-tabla"><thead><tr><th>Name</th><th>Type</th><th>Status</th></tr></thead><tbody>${c.librerias.map((l) => `<tr><td>${esc(l.n)}</td><td>${esc(l.t)}</td><td>${c.state === 'RUNNING' ? 'Installed' : 'Pending (al encender)'}</td></tr>`).join('') || '<tr><td colspan="3" class="dbx-dim">Sin bibliotecas instaladas</td></tr>'}</tbody></table><p class="dbx-dim">Las bibliotecas del compute se instalan en todos los nodos al encender. Para un solo notebook, usa <code>%pip install</code>.</p>`; box.querySelector('#libN').onclick = () => D.dialogo({ titulo: 'Install library', ok: 'Install', cuerpo: '<label class="dbx-campo"><span>Library source</span><select id="lT"><option>PyPI</option><option>Maven</option><option>Volumes</option></select></label><label class="dbx-campo"><span>Package</span><input id="lN" placeholder="great-expectations==1.2.0"></label>', alOk: (dlg) => { const nm = dlg.querySelector('#lN').value.trim(); if (!nm) throw new Error('Escribe el paquete'); C.clusters[id].librerias = [...(C.clusters[id].librerias || []), { n: nm, t: dlg.querySelector('#lT').value }]; D.cliGuardar(); pintar(); } }); }
      if (pest === 'eventos') box.innerHTML = `<table class="dbx-tabla"><thead><tr><th>Time</th><th>Event type</th><th>Details</th></tr></thead><tbody>${c.eventos.map((e) => `<tr><td>${D.hora(e.t)}</td><td><code>${esc(e.tipo)}</code></td><td>${esc(Object.keys(e.det || {}).length ? JSON.stringify(e.det) : '')}</td></tr>`).join('') || '<tr><td colspan="3" class="dbx-dim">Sin eventos</td></tr>'}</tbody></table>`;
      if (pest === 'sparkui') box.innerHTML = `<div class="dbx-aviso">${ic('info')}<div>La <b>Spark UI</b> muestra jobs, stages y tasks de Spark: cuánto tardó cada etapa, cuántos datos se movieron en el <i>shuffle</i> y si hubo <i>spill</i> a disco. En esta práctica, ejecuta <code>EXPLAIN</code> en una celda SQL o <code>df.explain()</code> en Python para ver el plan físico.</div></div>`;
      if (pest === 'logs') box.innerHTML = `<pre class="dbx-code">${esc(c.eventos.slice().reverse().map((e) => `${e.t.replace('T', ' ').slice(0, 19)} INFO  ${e.tipo === 'RUNNING' ? 'DriverDaemon: Started Spark driver' : e.tipo === 'TERMINATING' ? 'DriverDaemon: Shutting down' : e.tipo === 'STARTING' ? 'Chauffeur: Launching driver' : 'Event ' + e.tipo}`).join('\n') || 'Sin logs: el compute nunca se encendió.')}</pre>`;
      if (pest === 'metricas') box.innerHTML = `<p class="dbx-dim">Métricas de hardware (CPU, memoria, red) por nodo. Estado actual: ${c.state === 'RUNNING' ? `${n.cores * (1 + (c.unNodo ? 0 : c.autoscale ? c.min : c.workers))} cores activos` : 'apagado, sin métricas'}.</p>`;
      cont.querySelector('.dbx-acciones').onclick = async (e) => {
        const b = e.target.closest('[data-a]'); if (!b) return;
        if (b.dataset.a === 'iniciar') { const pr = Compute.iniciar(id); pintar(); await pr; pintar(); }
        if (b.dataset.a === 'parar') { Compute.terminar(id); pintar(); }
        if (b.dataset.a === 'restart') { Compute.terminar(id); C.clusters[id].state = 'RESTARTING'; Compute.evento(id, 'RESTARTING'); pintar(); C.clusters[id].state = 'TERMINATED'; await Compute.iniciar(id); pintar(); }
        if (b.dataset.a === 'editar') D.ir('cluster/' + id + '/editar');
        if (b.dataset.a === 'kebab') D.menu(b, [{ ic: 'json', txt: 'View JSON', fn: () => D.ir('cluster/' + id + '/config') }, { ic: 'trash', txt: 'Delete', peligro: true, fn: () => { if (!confirm('¿Borrar el compute?')) return; Compute.terminar(id); delete C.clusters[id]; D.cliGuardar(); D.ir('compute'); } }], 'der');
      };
    };
    refrescar = () => { if (location.hash.startsWith('#/databricks/cluster/' + id)) pintar(); };
    D.alSalir(() => { refrescar = () => {}; });
    pintar();
  });

  // ------------------------------------------------------------------ SQL warehouses
  const whs = () => { const C = D.cli(); C.warehouses = C.warehouses || { '1a2b3c4d5e6f7a8b': { name: 'Serverless Starter Warehouse', size: '2X-Small', tipo: 'SERVERLESS', min: 1, max: 1, autostop: 10, state: 'RUNNING' } }; return C.warehouses; };
  D.registrar('warehouses', (cont, p) => {
    const W = whs();
    if (p[0] === 'nuevo' || p[0] === 'editar') {
      const id = p[1]; const v = id ? W[id] : { name: 'Mi warehouse', size: 'X-Small', tipo: 'SERVERLESS', min: 1, max: 1, autostop: 10 };
      cont.innerHTML = `<div class="dbx-pag cf"><div class="dbx-migas"><a href="#/databricks/warehouses">SQL Warehouses</a></div><div class="dbx-pag-cab"><h1>${id ? 'Edit' : 'New'} SQL warehouse</h1></div><form class="cf-form" id="whF">
        <label class="dbx-campo"><span>Name</span><input name="name" value="${esc(v.name)}"></label>
        <label class="dbx-campo"><span>Cluster size</span><select name="size">${TAM_WH.map(([t, d]) => `<option value="${t}" ${v.size === t ? 'selected' : ''}>${t} (${d} DBU/h por cluster)</option>`).join('')}</select></label>
        <div class="cf-fila"><label class="dbx-campo chico"><span>Auto stop (minutes)</span><input type="number" name="autostop" min="1" value="${v.autostop}"></label></div>
        <div class="cf-fila"><label class="dbx-campo chico"><span>Scaling: Min clusters</span><input type="number" name="min" min="1" max="40" value="${v.min}"></label><label class="dbx-campo chico"><span>Max clusters</span><input type="number" name="max" min="1" max="40" value="${v.max}"></label></div>
        <label class="dbx-campo"><span>Type</span><select name="tipo"><option value="SERVERLESS" ${v.tipo === 'SERVERLESS' ? 'selected' : ''}>Serverless</option><option value="PRO" ${v.tipo === 'PRO' ? 'selected' : ''}>Pro</option><option value="CLASSIC" ${v.tipo === 'CLASSIC' ? 'selected' : ''}>Classic</option></select></label>
        <p class="dbx-dim" id="whRes"></p><div class="dbx-dlg-err" id="whErr" hidden></div>
        <div class="cf-pie"><button type="button" class="dbx-btn" onclick="history.back()">Cancel</button><button class="dbx-btn primario">${id ? 'Save' : 'Create'}</button></div></form></div>`;
      const f = cont.querySelector('#whF');
      const res = () => { const d = TAM_WH.find((x) => x[0] === f.elements.size.value)[1]; cont.querySelector('#whRes').innerHTML = `Hasta <b>${d * Number(f.elements.max.value)} DBU/h</b> con ${f.elements.max.value} cluster(s). ${f.elements.tipo.value === 'SERVERLESS' ? 'Serverless arranca en segundos y Databricks administra las VMs.' : 'Pro y Classic arrancan VMs en tu suscripción (tardan minutos).'} Se detiene solo tras ${f.elements.autostop.value} min sin consultas.`; };
      f.addEventListener('input', res); res();
      f.onsubmit = (e) => { e.preventDefault(); const er = cont.querySelector('#whErr'); const x = { name: f.elements.name.value.trim(), size: f.elements.size.value, autostop: Number(f.elements.autostop.value), min: Number(f.elements.min.value), max: Number(f.elements.max.value), tipo: f.elements.tipo.value };
        if (!x.name) { er.hidden = false; er.textContent = 'Ponle un nombre.'; return; } if (x.min > x.max) { er.hidden = false; er.textContent = 'Min clusters no puede ser mayor que Max clusters.'; return; }
        if (x.tipo !== 'SERVERLESS' && x.autostop < 10) { er.hidden = false; er.textContent = 'Para Pro y Classic el auto stop mínimo es 10 minutos.'; return; }
        const nid = id || uid(16); W[nid] = { ...(W[nid] || {}), ...x, state: (W[nid] || {}).state || 'STARTING' }; D.cliGuardar(); D.ir('warehouses'); setTimeout(() => { W[nid].state = 'RUNNING'; D.cliGuardar(); if (location.hash.endsWith('/warehouses')) D.ir('warehouses'); }, x.tipo === 'SERVERLESS' ? 1500 : 4000); };
      return;
    }
    cont.innerHTML = `<div class="dbx-pag"><div class="dbx-pag-cab"><h1>SQL Warehouses</h1><div class="dbx-acciones"><button class="dbx-btn primario" onclick="location.hash='#/databricks/warehouses/nuevo'">Create SQL warehouse</button></div></div><p class="dbx-dim">Un SQL warehouse es el compute para Databricks SQL: el editor SQL, los dashboards y las herramientas de BI (Power BI se conecta a uno).</p><table class="dbx-tabla"><thead><tr><th>State</th><th>Name</th><th>Type</th><th>Size</th><th>Clusters</th><th>Auto stop</th><th></th></tr></thead><tbody>${Object.entries(W).map(([id, w]) => `<tr data-id="${id}"><td>${D.estadoPunto(w.state)}</td><td><b>${esc(w.name)}</b></td><td>${esc(w.tipo === 'SERVERLESS' ? 'Serverless' : w.tipo === 'PRO' ? 'Pro' : 'Classic')}</td><td>${esc(w.size)}</td><td>${w.min}${w.max > w.min ? ' - ' + w.max : ''}</td><td>${w.autostop} min</td><td class="der"><button class="dbx-ib" data-a="${w.state === 'RUNNING' ? 'parar' : 'iniciar'}" title="${w.state === 'RUNNING' ? 'Stop' : 'Start'}">${ic(w.state === 'RUNNING' ? 'debug-stop' : 'play')}</button><button class="dbx-ib" data-a="editar">${ic('edit')}</button>${Object.keys(W).length > 1 ? `<button class="dbx-ib" data-a="borrar">${ic('trash')}</button>` : ''}</td></tr>`).join('')}</tbody></table><h3>Connection details</h3><table class="dbx-tabla kv"><tbody><tr><th>Server hostname</th><td><code>adb-1234567890123456.7.azuredatabricks.net</code></td></tr><tr><th>Port</th><td>443</td></tr><tr><th>HTTP path</th><td><code>/sql/1.0/warehouses/${Object.keys(W)[0]}</code></td></tr><tr><th>JDBC URL</th><td><code>jdbc:databricks://adb-1234567890123456.7.azuredatabricks.net:443/default;transportMode=http;ssl=1;AuthMech=3;httpPath=/sql/1.0/warehouses/${Object.keys(W)[0]}</code></td></tr></tbody></table></div>`;
    cont.querySelectorAll('tr[data-id]').forEach((tr) => tr.onclick = (e) => { const b = e.target.closest('[data-a]'); if (!b) return; const id = tr.dataset.id; if (b.dataset.a === 'editar') return D.ir('warehouses/editar/' + id); if (b.dataset.a === 'borrar') { if (confirm('¿Borrar el warehouse?')) { delete W[id]; D.cliGuardar(); D.ir('warehouses'); } return; } W[id].state = b.dataset.a === 'parar' ? 'STOPPED' : 'RUNNING'; D.cliGuardar(); D.ir('warehouses'); });
  });

  // ------------------------------------------------------------------ Jobs: modelo y ejecución
  const jobs = () => { const C = D.cli(); C.jobs = C.jobs || {}; return C.jobs; };
  const normJob = (j) => { j.settings = j.settings || {}; const s = j.settings; s.tasks = (s.tasks || []).map((t) => ({ run_if: 'ALL_SUCCESS', max_retries: 0, depends_on: [], ...t, tipo: t.tipo || (t.notebook_task ? 'notebook' : t.sql_task ? 'sql' : t.condition_task ? 'condicion' : t.pipeline_task ? 'pipeline' : 'notebook'), notebook_path: t.notebook_path || (t.notebook_task && t.notebook_task.notebook_path) || '' })); s.parameters = s.parameters || []; s.max_concurrent_runs = s.max_concurrent_runs || 1; j.runs = j.runs || []; return j; };
  function ordenTopologico(tareas) {
    const keys = new Set(tareas.map((t) => t.task_key)); const orden = []; const hechas = new Set(); const pend = tareas.slice();
    for (const t of tareas) for (const d of t.depends_on || []) if (!keys.has(d.task_key)) throw new Error(`Invalid dependency: la tarea ${t.task_key} depende de ${d.task_key}, que no existe.`);
    while (pend.length) { const i = pend.findIndex((t) => (t.depends_on || []).every((d) => hechas.has(d.task_key))); if (i < 0) throw new Error('El job tiene un ciclo de dependencias: ' + pend.map((t) => t.task_key).join(' → ')); const [t] = pend.splice(i, 1); hechas.add(t.task_key); orden.push(t); }
    return orden;
  }
  // Run if (documentación "Configure task dependencies"): devuelve 'RUN', 'UPSTREAM_FAILED' o 'EXCLUDED'.
  // Una dependencia EXCLUDED cuenta como exitosa; si todas están excluidas, la tarea también se excluye.
  function correSegun(t, estados) {
    const deps = (t.depends_on || []).map((d) => estados[d.task_key]);
    if (!deps.length) return 'RUN';
    if (deps.every((s) => s === 'EXCLUDED')) return 'EXCLUDED';
    const ok = (s) => s === 'SUCCESS' || s === 'SUCCESS_WITH_FAILURES' || s === 'EXCLUDED', fallo = (s) => s === 'FAILED' || s === 'TIMEDOUT' || s === 'UPSTREAM_FAILED' || s === 'UPSTREAM_CANCELED';
    switch (t.run_if) {
      case 'AT_LEAST_ONE_SUCCESS': return deps.some(ok) ? 'RUN' : 'UPSTREAM_FAILED';
      case 'NONE_FAILED': return !deps.some(fallo) && deps.some((s) => s !== 'EXCLUDED') ? 'RUN' : 'UPSTREAM_FAILED';
      case 'ALL_DONE': return 'RUN';
      case 'AT_LEAST_ONE_FAILED': return deps.some(fallo) ? 'RUN' : 'EXCLUDED';
      case 'ALL_FAILED': return deps.every(fallo) ? 'RUN' : 'EXCLUDED';
      default: return deps.every(ok) ? 'RUN' : 'UPSTREAM_FAILED';
    }
  }
  const resolverDinamicos = (v, ctx) => String(v ?? '').replace(/\{\{\s*([\w.]+)\s*\}\}/g, (m, k) => { if (k === 'job.id') return ctx.jobId; if (k === 'job.run_id') return ctx.runId; if (k === 'job.start_time.iso_date') return ctx.inicio.slice(0, 10); if (k === 'job.start_time.iso_datetime') return ctx.inicio; if (k.startsWith('job.parameters.')) return ctx.params[k.slice(15)] ?? ''; const tv = /^tasks\.(\w+)\.values\.(\w+)$/.exec(k); if (tv) return (ctx.tv[tv[1]] || {})[tv[2]] ?? ''; return m; });
  async function correrTarea(t, ctx, aviso) {
    if (t.tipo === 'notebook') {
      const nb = D.ws().items[t.notebook_path];
      if (!nb || nb.tipo !== 'notebook') return { estado: 'FAILED', error: `Notebook not found: ${t.notebook_path}`, salidas: [] };
      const widgets = {}; for (const [k, v] of Object.entries(ctx.params)) widgets[k] = { default: v, valor: v };
      for (const [k, v] of Object.entries(t.base_parameters || {})) widgets[k] = { default: resolverDinamicos(v, ctx), valor: resolverDinamicos(v, ctx) };
      if (t.compute && t.compute !== 'serverless' && D.cli().clusters[t.compute]) { aviso('Iniciando el cluster…'); await Compute.iniciar(t.compute); }
      if (D.Py.listo) await D.Py.limpiarEstado();
      const salidas = []; let exit = null;
      for (const c of nb.celdas) {
        if (!c.src.trim() || D.lenguajeCelda(c.src, nb.lang) === 'md') continue;
        const r = await D.ejecutarCelda(c.src, { nb: { ...nb, _ruta: t.notebook_path, widgets }, origen: 'Job ' + ctx.jobId, aviso, job: { tvin: ctx.tv } });
        salidas.push({ src: c.src, out: r.salidas.map((s) => (s.tipo === 'tabla' ? { ...s, filas: s.filas.slice(0, 50) } : s)) });
        if (r.post && r.post.tv) ctx.tv[t.task_key] = { ...(ctx.tv[t.task_key] || {}), ...r.post.tv };
        if (!r.ok) return { estado: 'FAILED', error: (r.salidas.find((s) => s.tipo === 'error') || {}).v || 'La celda falló', salidas };
        if (r.exit != null) { exit = r.exit; break; }
      }
      if (t.compute && t.compute !== 'serverless') Compute.actividad(t.compute); else Compute.usoServerless(2);
      return { estado: 'SUCCESS', salidas, exit };
    }
    if (t.tipo === 'sql') {
      const res = await SQLX().ejecutar(D.sustituirParams(resolverDinamicos(t.sql || '', ctx), ctx.params), { origen: 'Job ' + ctx.jobId });
      const u = res[res.length - 1];
      return u.ok ? { estado: 'SUCCESS', salidas: [{ src: t.sql, out: [u.cols.length ? { tipo: 'tabla', cols: u.cols, filas: u.filas.slice(0, 50), total: u.filas.length } : { tipo: 'texto', v: u.msg || 'OK' }] }] } : { estado: 'FAILED', error: u.error, salidas: [] };
    }
    if (t.tipo === 'condicion') {
      const izq = resolverDinamicos(t.izq, ctx), der = resolverDinamicos(t.der, ctx); const op = t.op || '==';
      const n = (x) => (x !== '' && !isNaN(x) ? Number(x) : x);
      const r = { '==': n(izq) == n(der), '!=': n(izq) != n(der), '>': n(izq) > n(der), '>=': n(izq) >= n(der), '<': n(izq) < n(der), '<=': n(izq) <= n(der) }[op]; // eslint-disable-line eqeqeq
      return { estado: 'SUCCESS', condicion: !!r, salidas: [{ src: `${izq} ${op} ${der}`, out: [{ tipo: 'texto', v: `Resultado: ${r ? 'true' : 'false'}` }] }] };
    }
    if (t.tipo === 'pipeline') {
      const P = pipelines()[t.pipeline_id]; if (!P) return { estado: 'FAILED', error: 'Pipeline no encontrado', salidas: [] };
      const up = await correrPipeline(t.pipeline_id, { completo: !!t.full_refresh, origen: 'JOB_TASK' });
      return up.estado === 'COMPLETED' ? { estado: 'SUCCESS', salidas: [{ src: P.nombre, out: [{ tipo: 'texto', v: `Pipeline update ${up.id}: COMPLETED` }] }] } : { estado: 'FAILED', error: up.error || 'El pipeline falló', salidas: [] };
    }
    return { estado: 'FAILED', error: 'Tipo de tarea no soportado', salidas: [] };
  }
  D.correrJob = async (jobId, { trigger = 'ONE_TIME', params = {}, reparar = null, alCambiar = () => {} } = {}) => {
    const J = jobs(); const j = normJob(J[jobId]); const s = j.settings;
    const enCurso = j.runs.filter((r) => r.state === 'RUNNING').length;
    if (!reparar && enCurso >= s.max_concurrent_runs) { const r = { run_id: Math.floor(1e8 + Math.random() * 9e8), at: ahora(), state: 'SKIPPED', result: 'MAXIMUM_CONCURRENT_RUNS_REACHED', trigger, tareas: {} }; j.runs.unshift(r); D.cliGuardar(); return r; }
    const orden = ordenTopologico(s.tasks);
    const run = reparar || { run_id: Math.floor(1e8 + Math.random() * 9e8), at: ahora(), state: 'RUNNING', result: null, trigger, params: { ...Object.fromEntries(s.parameters.map((p) => [p.name, p.default])), ...params }, tareas: {} };
    if (!reparar) j.runs.unshift(run); else { run.state = 'RUNNING'; run.result = null; run.reparaciones = (run.reparaciones || 0) + 1; }
    j.runs = j.runs.slice(0, 50);
    const t0 = performance.now();
    const ctx = { jobId, runId: run.run_id, inicio: run.at, params: run.params, tv: run.tv || {} };
    const estados = {};
    // en una reparación, las tareas que ya terminaron bien conservan su resultado
    for (const t of orden) { const prev = run.tareas[t.task_key]; if (reparar && prev && prev.estado === 'SUCCESS') estados[t.task_key] = 'SUCCESS'; else run.tareas[t.task_key] = { estado: 'PENDING' }; }
    D.cliGuardar(); alCambiar(run);
    for (const t of orden) {
      if (estados[t.task_key] === 'SUCCESS') continue;
      const T = run.tareas[t.task_key];
      // condición if/else: la rama que no corresponde se excluye
      const padreCond = (t.depends_on || []).map((d) => s.tasks.find((x) => x.task_key === d.task_key)).find((x) => x && x.tipo === 'condicion');
      if (padreCond && run.tareas[padreCond.task_key] && run.tareas[padreCond.task_key].condicion !== undefined) {
        const rama = (t.depends_on.find((d) => d.task_key === padreCond.task_key) || {}).outcome;
        if (rama && String(run.tareas[padreCond.task_key].condicion) !== rama) { T.estado = 'EXCLUDED'; estados[t.task_key] = 'EXCLUDED'; alCambiar(run); continue; }
      }
      const decision = correSegun(t, estados);
      if (decision !== 'RUN') { T.estado = decision; estados[t.task_key] = decision; alCambiar(run); continue; }
      let intento = 0, r;
      do {
        T.estado = intento ? 'WAITING_FOR_RETRY' : 'RUNNING'; T.inicio = ahora(); T.intentos = intento + 1; alCambiar(run);
        if (intento) await espera(600);
        T.estado = 'RUNNING'; alCambiar(run);
        const ti = performance.now();
        try { r = await correrTarea(t, ctx, (m) => { T.aviso = m; alCambiar(run); }); } catch (e) { r = { estado: 'FAILED', error: e.message, salidas: [] }; }
        T.ms = Math.round(performance.now() - ti);
        intento++;
      } while (r.estado === 'FAILED' && intento <= (Number(t.max_retries) || 0));
      Object.assign(T, { estado: r.estado, fin: ahora(), salidas: r.salidas, error: r.error, exit: r.exit, condicion: r.condicion, aviso: null });
      estados[t.task_key] = r.estado; alCambiar(run);
    }
    run.state = 'TERMINATED'; run.fin = ahora(); run.ms = Math.round(performance.now() - t0) + (run.ms || 0); run.tv = ctx.tv;
    // el estado de la corrida lo deciden las tareas hoja (las que no tienen tareas aguas abajo)
    const malo = (x) => ['FAILED', 'TIMEDOUT', 'UPSTREAM_FAILED', 'UPSTREAM_CANCELED', 'CANCELED'].includes(x);
    const hojas = s.tasks.filter((t) => !s.tasks.some((o) => (o.depends_on || []).some((d) => d.task_key === t.task_key))).map((t) => run.tareas[t.task_key].estado);
    const todos = Object.values(run.tareas).map((x) => x.estado);
    run.result = hojas.some(malo) ? 'FAILED' : todos.some(malo) ? 'SUCCESS_WITH_FAILURES' : 'SUCCESS';
    if (run.result === 'FAILED' && (s.email_notifications || {}).on_failure && s.email_notifications.on_failure.length) D.toast(`📧 (simulado) Se envió un correo de falla a ${s.email_notifications.on_failure.join(', ')}`);
    D.cliGuardar(); alCambiar(run);
    return run;
  };
  // horarios: si la pestaña sigue abierta, el job corre a su hora
  function proximo(sch) { if (!sch || sch.pausa) return null; const n = new Date(); const [h, m] = (sch.hora || '06:00').split(':').map(Number); const t = new Date(n); t.setSeconds(0, 0); if (sch.cada === 'hora') { t.setMinutes(m); if (t <= n) t.setHours(t.getHours() + 1); return t; } t.setHours(h, m); if (t <= n) t.setDate(t.getDate() + 1); if (sch.cada === 'semana') { while (t.getDay() !== Number(sch.dia || 1)) t.setDate(t.getDate() + 1); } return t; }
  function revisarHorarios() { for (const [id, j] of Object.entries(jobs())) { const s = (j.settings || {}).schedule; if (!s || s.pausa) continue; s.siguiente = s.siguiente || (proximo(s) || {}).toISOString?.(); if (s.siguiente && new Date(s.siguiente) <= new Date()) { s.siguiente = proximo(s).toISOString(); D.correrJob(id, { trigger: 'PERIODIC' }); } } }
  const cron = (s) => (s.cada === 'hora' ? `0 ${Number((s.hora || '0:00').split(':')[1])} * * * ?` : s.cada === 'semana' ? `0 ${Number(s.hora.split(':')[1])} ${Number(s.hora.split(':')[0])} ? * ${['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][Number(s.dia || 1)]}` : `0 ${Number((s.hora || '06:00').split(':')[1])} ${Number((s.hora || '06:00').split(':')[0])} * * ?`);

  // ------------------------------------------------------------------ Jobs: lista
  const colorRes = (r) => (r === 'SUCCESS' ? 'ok' : r === 'FAILED' || r === 'UPSTREAM_FAILED' || r === 'TIMEDOUT' ? 'mal' : r === 'SUCCESS_WITH_FAILURES' ? 'medio' : r === 'RUNNING' || r === 'PENDING' || r === 'WAITING_FOR_RETRY' ? 'corre' : 'gris');
  D.registrar('jobs', (cont, p) => {
    if (p[0] === 'nuevo') return nuevoJob();
    const J = jobs(); const P = pipelines(); const pest = p[0] === 'pipelines' ? 'pipelines' : 'jobs';
    cont.innerHTML = `<div class="dbx-pag"><div class="dbx-pag-cab"><h1>Jobs &amp; Pipelines</h1><div class="dbx-acciones"><button class="dbx-btn primario" id="jCrear">Create ${ic('chevron-down')}</button></div></div>
      <div class="dbx-pest"><a class="${pest === 'jobs' ? 'on' : ''}" href="#/databricks/jobs">Jobs</a><a class="${pest === 'pipelines' ? 'on' : ''}" href="#/databricks/jobs/pipelines">Pipelines</a><a href="#/databricks/runs">Runs</a></div>
      ${pest === 'jobs' ? (Object.keys(J).length ? `<table class="dbx-tabla"><thead><tr><th>Name</th><th>Trigger</th><th>Recent runs</th><th>Tasks</th><th></th></tr></thead><tbody>${Object.entries(J).map(([id, j0]) => { const j = normJob(j0); const sc = j.settings.schedule; return `<tr data-id="${id}"><td><a href="#/databricks/job/${id}">${ic('type-hierarchy')} ${esc(j.name)}</a></td><td>${sc ? (sc.pausa ? 'Paused' : `Scheduled · ${esc(cron(sc))}`) : j.settings.trigger ? 'File arrival' : 'None'}</td><td><span class="jr-mini">${j.runs.slice(0, 10).reverse().map((r) => `<a class="jr-b ${colorRes(r.result || r.state)}" href="#/databricks/run/${id}/${r.run_id}" title="${esc(r.result || r.state)} · ${esc(r.at)}"></a>`).join('')}</span></td><td>${j.settings.tasks.length}</td><td class="der"><button class="dbx-ib" data-a="run" title="Run now">${ic('play')}</button></td></tr>`; }).join('')}</tbody></table>` : `<div class="dbx-vacio">${ic('type-hierarchy')}<p>No hay jobs. Un job ejecuta notebooks, consultas SQL o pipelines en orden, con horario y avisos.</p><button class="dbx-btn primario" onclick="location.hash='#/databricks/jobs/nuevo'">Create job</button></div>`)
      : (Object.keys(P).length ? `<table class="dbx-tabla"><thead><tr><th>Name</th><th>Target</th><th>Last update</th><th>Mode</th></tr></thead><tbody>${Object.entries(P).map(([id, x]) => `<tr><td><a href="#/databricks/pipeline/${id}">${ic('combine')} ${esc(x.nombre)}</a></td><td>${esc(x.catalogo)}.${esc(x.esquema)}</td><td>${x.updates && x.updates[0] ? `<span class="jr-b ${x.updates[0].estado === 'COMPLETED' ? 'ok' : x.updates[0].estado === 'FAILED' ? 'mal' : 'corre'}"></span> ${esc(x.updates[0].estado)} · ${D.hora(x.updates[0].inicio)}` : 'Never run'}</td><td>${x.modo === 'continuous' ? 'Continuous' : 'Triggered'}</td></tr>`).join('')}</tbody></table>` : `<div class="dbx-vacio">${ic('combine')}<p>No hay pipelines. Un pipeline declarativo define tablas de streaming y vistas materializadas con SQL y Databricks las mantiene actualizadas en orden.</p><button class="dbx-btn primario" onclick="location.hash='#/databricks/pipelines/nuevo'">Create ETL pipeline</button></div>`)}
      </div>`;
    cont.querySelector('#jCrear').onclick = (e) => D.menu(e.currentTarget, [{ ic: 'type-hierarchy', txt: 'Job', fn: () => D.ir('jobs/nuevo') }, { ic: 'combine', txt: 'ETL pipeline', fn: () => D.ir('pipelines/nuevo') }], 'der');
    cont.querySelectorAll('tr[data-id] [data-a=run]').forEach((b) => b.onclick = async () => { const id = b.closest('tr').dataset.id; D.toast('Run started'); const pr = D.correrJob(id, { alCambiar: () => {} }); setTimeout(() => D.ir('jobs'), 200); await pr; if (location.hash === '#/databricks/jobs') D.ir('jobs'); });
  });
  function nuevoJob(nb) {
    const J = jobs(); const id = String(Math.floor(100000000000 + Math.random() * 900000000000));
    const nombre = `New Job ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`;
    J[id] = { name: nombre, creado: ahora(), runs: [], settings: { tasks: [{ task_key: nb ? nb.split('/').pop().replace(/\W+/g, '_').slice(0, 40) || 'tarea' : 'tarea_1', tipo: 'notebook', notebook_path: nb || '', compute: 'serverless', depends_on: [], run_if: 'ALL_SUCCESS', max_retries: 0 }], parameters: [], max_concurrent_runs: 1 } };
    D.cliGuardar(); D.ir('job/' + id + '/tareas');
  }
  D.programarNotebook = (ruta) => {
    D.dialogo({ titulo: 'Schedule notebook', ok: 'Create', cuerpo: `<p>Se crea un job con una tarea que ejecuta <b>${esc(ruta.split('/').pop())}</b>.</p><label class="dbx-campo"><span>Every</span><select id="sC"><option value="dia">Day</option><option value="hora">Hour</option><option value="semana">Week</option></select></label><label class="dbx-campo"><span>At</span><input id="sH" type="time" value="06:00"></label>`, alOk: (dlg) => {
      const J = jobs(); const id = String(Math.floor(100000000000 + Math.random() * 900000000000));
      J[id] = { name: ruta.split('/').pop(), creado: ahora(), runs: [], settings: { tasks: [{ task_key: ruta.split('/').pop().replace(/\W+/g, '_').slice(0, 40) || 'tarea', tipo: 'notebook', notebook_path: ruta, compute: 'serverless', depends_on: [], run_if: 'ALL_SUCCESS', max_retries: 0 }], parameters: [], schedule: { cada: dlg.querySelector('#sC').value, hora: dlg.querySelector('#sH').value, dia: 1, pausa: false }, max_concurrent_runs: 1 } };
      D.cliGuardar(); D.toast('Job programado'); D.ir('job/' + id);
    } });
  };

  // ------------------------------------------------------------------ Job: detalle (Runs / Tasks)
  function dagSvg(tareas, estados = {}, sel = null) {
    let orden; try { orden = ordenTopologico(tareas); } catch (e) { return `<div class="dbx-err">${esc(e.message)}</div>`; }
    const nivel = {}; for (const t of orden) nivel[t.task_key] = Math.max(0, ...(t.depends_on || []).map((d) => (nivel[d.task_key] ?? -1) + 1));
    const cols = {}; for (const t of orden) (cols[nivel[t.task_key]] = cols[nivel[t.task_key]] || []).push(t);
    const W = 200, H = 54, GX = 70, GY = 26, pos = {};
    Object.entries(cols).forEach(([n, ts]) => ts.forEach((t, i) => { pos[t.task_key] = { x: 20 + Number(n) * (W + GX), y: 20 + i * (H + GY) }; }));
    const ancho = 40 + (Object.keys(cols).length) * (W + GX), alto = 40 + Math.max(...Object.values(cols).map((x) => x.length)) * (H + GY);
    const flechas = orden.flatMap((t) => (t.depends_on || []).map((d) => { const a = pos[d.task_key], b = pos[t.task_key]; if (!a || !b) return ''; const x1 = a.x + W, y1 = a.y + H / 2, x2 = b.x, y2 = b.y + H / 2; return `<path d="M${x1},${y1} C${x1 + GX / 2},${y1} ${x2 - GX / 2},${y2} ${x2},${y2}" class="dag-l"/>${d.outcome ? `<text x="${(x1 + x2) / 2}" y="${(y1 + y2) / 2 - 4}" class="dag-o">${esc(d.outcome)}</text>` : ''}`; })).join('');
    const ICO = { notebook: 'notebook', sql: 'code', condicion: 'git-compare', pipeline: 'combine' };
    const nodos = orden.map((t) => { const p0 = pos[t.task_key]; const st = estados[t.task_key]; return `<foreignObject x="${p0.x}" y="${p0.y}" width="${W}" height="${H}"><div xmlns="http://www.w3.org/1999/xhtml" class="dag-n ${sel === t.task_key ? 'sel' : ''} ${st ? colorRes(st) : ''}" data-t="${esc(t.task_key)}">${ic(ICO[t.tipo] || 'notebook')}<span><b>${esc(t.task_key)}</b><small>${st ? esc(st) : esc({ notebook: 'Notebook', sql: 'SQL', condicion: 'If/else condition', pipeline: 'Pipeline' }[t.tipo] || t.tipo)}</small></span></div></foreignObject>`; }).join('');
    return `<svg class="dag" width="${ancho}" height="${alto}" viewBox="0 0 ${ancho} ${alto}"><defs><marker id="fl" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#8a9ba8"/></marker></defs>${flechas}${nodos}</svg>`;
  }
  D.registrar('job', (cont, p) => {
    const J = jobs(); const id = p[0]; if (!J[id]) return D.stub(cont, 'Job no encontrado', 'Ese job no existe.', [['Jobs', '#/databricks/jobs']]);
    const j = normJob(J[id]); const s = j.settings;
    const pest = p[1] || 'runs';
    let sel = p[2] || (s.tasks[0] && s.tasks[0].task_key);
    D.reciente('job', j.name, 'job/' + id);
    const notebooks = Object.entries(D.ws().items).filter(([, it]) => it.tipo === 'notebook').map(([k]) => k);
    const pintar = () => {
      cont.innerHTML = `<div class="dbx-pag jb"><div class="dbx-migas"><a href="#/databricks/jobs">Jobs &amp; Pipelines</a></div>
        <div class="dbx-pag-cab"><h1><input class="nb-titulo" id="jNom" value="${esc(j.name)}"></h1><div class="dbx-acciones"><button class="dbx-btn" id="jJson">${ic('json')} View as code</button><button class="dbx-btn" id="jRunP">Run now with different parameters</button><button class="dbx-btn primario" id="jRun">${ic('play')} Run now</button><button class="dbx-ib" id="jMas">${ic('ellipsis')}</button></div></div>
        <div class="dbx-pest"><a class="${pest === 'runs' ? 'on' : ''}" href="#/databricks/job/${id}/runs">Runs</a><a class="${pest === 'tareas' ? 'on' : ''}" href="#/databricks/job/${id}/tareas">Tasks</a></div>
        <div class="jb-lay"><div class="jb-centro" id="jbC"></div><aside class="jb-det" id="jbD"></aside></div></div>`;
      const C0 = cont.querySelector('#jbC');
      if (pest === 'runs') {
        const runs = j.runs.slice(0, 20);
        C0.innerHTML = runs.length ? `<h3>Run matrix</h3><div class="jr-matriz"><table><thead><tr><th></th>${runs.slice().reverse().map((r) => `<th><a href="#/databricks/run/${id}/${r.run_id}" class="jr-b grande ${colorRes(r.result || r.state)}" title="${esc(r.at)} · ${esc(r.result || r.state)}${r.reparaciones ? ' · reparado' : ''}"></a></th>`).join('')}</tr></thead><tbody>${s.tasks.map((t) => `<tr><th>${esc(t.task_key)}</th>${runs.slice().reverse().map((r) => { const x = (r.tareas || {})[t.task_key]; return `<td><span class="jr-b ${x ? colorRes(x.estado) : 'gris'}" title="${x ? esc(x.estado) : 'no ejecutada'}"></span></td>`; }).join('')}</tr>`).join('')}</tbody></table></div>
          <h3>Job runs</h3><table class="dbx-tabla"><thead><tr><th>Start time</th><th>Run ID</th><th>Launched</th><th>Duration</th><th>Status</th></tr></thead><tbody>${runs.map((r) => `<tr><td><a href="#/databricks/run/${id}/${r.run_id}">${D.hora(r.at)}</a></td><td>${r.run_id}</td><td>${r.trigger === 'PERIODIC' ? 'By scheduler' : r.trigger === 'FILE_ARRIVAL' ? 'File arrival' : 'Manually'}</td><td>${r.ms ? (r.ms / 1000).toFixed(1) + ' s' : r.state === 'RUNNING' ? '…' : '-'}</td><td><span class="jr-est ${colorRes(r.result || r.state)}">${esc(r.result || r.state)}</span>${r.reparaciones ? ` <small>(repaired ×${r.reparaciones})</small>` : ''}</td></tr>`).join('')}</tbody></table>` : `<div class="dbx-vacio">${ic('checklist')}<p>Este job todavía no corrió. Pulsa <b>Run now</b>.</p></div>`;
      } else {
        C0.innerHTML = `<div class="jb-dag">${dagSvg(s.tasks, {}, sel)}</div><button class="dbx-btn" id="tAdd">${ic('add')} Add task ${ic('chevron-down')}</button><div id="tForm"></div>`;
        C0.querySelectorAll('.dag-n').forEach((n) => n.onclick = () => { sel = n.dataset.t; pintar(); });
        C0.querySelector('#tAdd').onclick = (e) => D.menu(e.currentTarget, [['notebook', 'notebook', 'Notebook'], ['sql', 'code', 'SQL'], ['condicion', 'git-compare', 'If/else condition'], ['pipeline', 'combine', 'Pipeline']].map(([k, icn, n]) => ({ ic: icn, txt: n, fn: () => { let key = k + '_' + (s.tasks.length + 1); while (s.tasks.some((t) => t.task_key === key)) key += '_x'; s.tasks.push({ task_key: key, tipo: k, notebook_path: '', compute: 'serverless', depends_on: sel ? [{ task_key: sel }] : [], run_if: 'ALL_SUCCESS', max_retries: 0, ...(k === 'condicion' ? { izq: '{{job.parameters.entorno}}', op: '==', der: 'prod' } : {}), ...(k === 'sql' ? { sql: 'SELECT COUNT(*) FROM samples.tienda.pedidos' } : {}) }); sel = key; D.cliGuardar(); pintar(); } })));
        const t = s.tasks.find((x) => x.task_key === sel);
        if (t) {
          const otras = s.tasks.filter((x) => x.task_key !== t.task_key);
          const P = pipelines();
          cont.querySelector('#tForm').innerHTML = `<form class="cf-form jb-tarea" id="tf"><h3>Task</h3>
            <label class="dbx-campo"><span>Task name</span><input name="key" value="${esc(t.task_key)}"></label>
            <label class="dbx-campo"><span>Type</span><select name="tipo">${[['notebook', 'Notebook'], ['sql', 'SQL'], ['condicion', 'If/else condition'], ['pipeline', 'Pipeline']].map(([k, n]) => `<option value="${k}" ${t.tipo === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
            ${t.tipo === 'notebook' ? `<label class="dbx-campo"><span>Source</span><select disabled><option>Workspace</option></select></label><label class="dbx-campo"><span>Path</span><select name="notebook_path"><option value="">Selecciona un notebook…</option>${notebooks.map((n) => `<option value="${esc(n)}" ${t.notebook_path === n ? 'selected' : ''}>${esc(n.replace(D.HOME, '~'))}</option>`).join('')}</select></label><label class="dbx-campo"><span>Parameters (key=value, uno por línea)</span><textarea name="base" rows="2">${esc(Object.entries(t.base_parameters || {}).map(([k, v]) => `${k}=${v}`).join('\n'))}</textarea></label>` : ''}
            ${t.tipo === 'sql' ? `<label class="dbx-campo"><span>SQL query</span><textarea name="sql" rows="4" class="mono">${esc(t.sql || '')}</textarea></label><label class="dbx-campo"><span>SQL warehouse</span><select disabled><option>Serverless Starter Warehouse</option></select></label>` : ''}
            ${t.tipo === 'condicion' ? `<div class="cf-fila"><input name="izq" value="${esc(t.izq || '')}" placeholder="{{job.parameters.x}}"><select name="op">${['==', '!=', '>', '>=', '<', '<='].map((o) => `<option ${t.op === o ? 'selected' : ''}>${o}</option>`).join('')}</select><input name="der" value="${esc(t.der || '')}"></div><p class="dbx-dim">Las tareas que dependen de esta eligen la rama <b>true</b> o <b>false</b>. Valores dinámicos: <code>{{job.parameters.nombre}}</code>, <code>{{tasks.tarea.values.clave}}</code>, <code>{{job.start_time.iso_date}}</code>.</p>` : ''}
            ${t.tipo === 'pipeline' ? `<label class="dbx-campo"><span>Pipeline</span><select name="pipeline_id"><option value="">Selecciona…</option>${Object.entries(P).map(([pid, x]) => `<option value="${pid}" ${t.pipeline_id === pid ? 'selected' : ''}>${esc(x.nombre)}</option>`).join('')}</select></label><label class="dbx-check"><input type="checkbox" name="full_refresh" ${t.full_refresh ? 'checked' : ''}> Full refresh</label>` : ''}
            ${t.tipo === 'notebook' ? `<label class="dbx-campo"><span>Compute</span><select name="compute"><option value="serverless">Serverless</option>${Object.entries(D.cli().clusters || {}).map(([cid, c]) => `<option value="${cid}" ${t.compute === cid ? 'selected' : ''}>${esc(c.name)} (all-purpose)</option>`).join('')}</select></label>` : ''}
            <div class="dbx-campo"><span>Depends on</span><div class="dbx-checks">${otras.map((o) => { const d = (t.depends_on || []).find((x) => x.task_key === o.task_key); return `<label><input type="checkbox" name="dep" value="${esc(o.task_key)}" ${d ? 'checked' : ''}> ${esc(o.task_key)}${o.tipo === 'condicion' ? ` <select name="out_${esc(o.task_key)}"><option value="true" ${d && d.outcome === 'true' ? 'selected' : ''}>(true)</option><option value="false" ${d && d.outcome === 'false' ? 'selected' : ''}>(false)</option></select>` : ''}</label>`; }).join('') || '<span class="dbx-dim">Es la única tarea</span>'}</div></div>
            <label class="dbx-campo"><span>Run if dependencies</span><select name="run_if">${[['ALL_SUCCESS', 'All succeeded'], ['AT_LEAST_ONE_SUCCESS', 'At least one succeeded'], ['NONE_FAILED', 'None failed'], ['ALL_DONE', 'All done'], ['AT_LEAST_ONE_FAILED', 'At least one failed'], ['ALL_FAILED', 'All failed']].map(([k, n]) => `<option value="${k}" ${t.run_if === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
            <div class="cf-fila"><label class="dbx-campo chico"><span>Retries</span><input type="number" name="max_retries" min="0" max="10" value="${t.max_retries || 0}"></label><label class="dbx-campo chico"><span>Timeout (s)</span><input type="number" name="timeout" min="0" value="${t.timeout_seconds || 0}"></label></div>
            <div class="dbx-dlg-err" id="tErr" hidden></div>
            <div class="cf-pie"><button type="button" class="dbx-btn peligro" id="tBorrar">${ic('trash')} Delete task</button><button class="dbx-btn primario">Save task</button></div></form>`;
          const f = cont.querySelector('#tf');
          f.elements.tipo.onchange = () => { t.tipo = f.elements.tipo.value; D.cliGuardar(); pintar(); };
          cont.querySelector('#tBorrar').onclick = () => { if (s.tasks.length === 1) return D.toast('Un job necesita al menos una tarea'); s.tasks = s.tasks.filter((x) => x !== t); for (const x of s.tasks) x.depends_on = (x.depends_on || []).filter((d) => d.task_key !== t.task_key); sel = s.tasks[0].task_key; D.cliGuardar(); pintar(); };
          f.onsubmit = (e) => {
            e.preventDefault(); const er = cont.querySelector('#tErr'); const mal = (m) => { er.hidden = false; er.textContent = m; };
            const key = f.elements.key.value.trim();
            if (!/^[\w-]{1,100}$/.test(key)) return mal('El nombre de la tarea solo puede tener letras, números, - y _ (task_key).');
            if (key !== t.task_key && s.tasks.some((x) => x.task_key === key)) return mal('Ya hay una tarea con ese nombre.');
            const viejo = t.task_key;
            const deps = [...f.querySelectorAll('[name=dep]:checked')].map((x) => { const o = f.elements['out_' + x.value]; return o ? { task_key: x.value, outcome: o.value } : { task_key: x.value }; });
            const copia = s.tasks.map((x) => (x === t ? { ...t, task_key: key, depends_on: deps } : { ...x, depends_on: (x.depends_on || []).map((d) => (d.task_key === viejo ? { ...d, task_key: key } : d)) }));
            try { ordenTopologico(copia); } catch (er2) { return mal(er2.message); }
            if (t.tipo === 'notebook' && !f.elements.notebook_path.value) return mal('Elige el notebook que ejecuta la tarea.');
            if (t.tipo === 'pipeline' && !f.elements.pipeline_id.value) return mal('Elige un pipeline.');
            s.tasks = copia; const t2 = s.tasks.find((x) => x.task_key === key);
            t2.run_if = f.elements.run_if.value; t2.max_retries = Number(f.elements.max_retries.value); t2.timeout_seconds = Number(f.elements.timeout.value);
            if (t2.tipo === 'notebook') { t2.notebook_path = f.elements.notebook_path.value; t2.compute = f.elements.compute.value; t2.base_parameters = Object.fromEntries(f.elements.base.value.split('\n').map((l) => l.split('=')).filter((x) => x[0] && x[0].trim()).map(([k, ...v]) => [k.trim(), v.join('=').trim()])); }
            if (t2.tipo === 'sql') t2.sql = f.elements.sql.value;
            if (t2.tipo === 'condicion') { t2.izq = f.elements.izq.value; t2.op = f.elements.op.value; t2.der = f.elements.der.value; }
            if (t2.tipo === 'pipeline') { t2.pipeline_id = f.elements.pipeline_id.value; t2.full_refresh = f.elements.full_refresh.checked; }
            sel = key; D.cliGuardar(); D.toast('Tarea guardada'); pintar();
          };
        }
      }
      // panel derecho: detalles del job
      const sc = s.schedule;
      cont.querySelector('#jbD').innerHTML = `<h3>Job details</h3><table class="dbx-tabla kv"><tbody><tr><th>Job ID</th><td>${id}</td></tr><tr><th>Creator</th><td>Alumno Academia</td></tr><tr><th>Run as</th><td>${D.USUARIO}</td></tr></tbody></table>
        <h3>Schedules &amp; Triggers <button class="dbx-btn chico" id="jSch">${sc ? 'Edit' : 'Add trigger'}</button></h3><p>${sc ? `${sc.pausa ? '⏸ Paused · ' : ''}Every ${{ dia: 'day', hora: 'hour', semana: 'week' }[sc.cada]} at ${esc(sc.hora)} <br><code>${esc(cron(sc))}</code><br><small>Próxima: ${sc.pausa ? '-' : D.hora((proximo(sc) || new Date()).toISOString())}</small>` : 'None'}</p>
        <h3>Job parameters <button class="dbx-btn chico" id="jPar">Edit</button></h3>${s.parameters.length ? `<ul class="jb-par">${s.parameters.map((x) => `<li><code>${esc(x.name)}</code> = ${esc(x.default)}</li>`).join('')}</ul>` : '<p class="dbx-dim">Sin parámetros. Los notebooks los leen con <code>dbutils.widgets.get("nombre")</code>.</p>'}
        <h3>Notifications <button class="dbx-btn chico" id="jNot">Edit</button></h3><p>${((s.email_notifications || {}).on_failure || []).length ? 'On failure: ' + esc(s.email_notifications.on_failure.join(', ')) : 'None'}</p>
        <h3>Max concurrent runs</h3><p>${s.max_concurrent_runs}</p>`;
      const $ = (q) => cont.querySelector(q);
      $('#jNom').onchange = (e) => { j.name = e.target.value.trim() || j.name; D.cliGuardar(); };
      $('#jRun').onclick = () => lanzar({});
      $('#jRunP').onclick = () => D.dialogo({ titulo: 'Run now with different parameters', ok: 'Run', cuerpo: s.parameters.length ? s.parameters.map((x) => `<label class="dbx-campo"><span>${esc(x.name)}</span><input data-p="${esc(x.name)}" value="${esc(x.default)}"></label>`).join('') : '<p class="dbx-dim">El job no tiene parámetros. Agrégalos en <b>Job parameters</b>.</p>', alOk: (dlg) => { const pr = {}; dlg.querySelectorAll('[data-p]').forEach((i) => { pr[i.dataset.p] = i.value; }); lanzar(pr); } });
      $('#jJson').onclick = () => D.dialogo({ titulo: 'Job as code', ok: null, cancelar: 'Close', ancho: 760, cuerpo: `<div class="dbx-pest chico"><a class="on" data-v="yaml">YAML (Asset Bundle)</a><a data-v="json">JSON (API)</a></div><pre class="dbx-code" id="jCode"></pre>`, alAbrir: (dlg) => { const pint = (v) => { dlg.querySelector('#jCode').textContent = v === 'json' ? JSON.stringify(jobJson(j), null, 2) : jobYaml(j); dlg.querySelectorAll('[data-v]').forEach((a) => a.classList.toggle('on', a.dataset.v === v)); }; dlg.querySelectorAll('[data-v]').forEach((a) => { a.onclick = () => pint(a.dataset.v); }); pint('yaml'); } });
      $('#jMas').onclick = (e) => D.menu(e.currentTarget, [{ ic: 'copy', txt: 'Clone job', fn: () => { const nid = String(Math.floor(1e11 + Math.random() * 9e11)); J[nid] = JSON.parse(JSON.stringify({ ...j, name: j.name + ' (clone)', runs: [] })); D.cliGuardar(); D.ir('job/' + nid); } }, { ic: 'trash', txt: 'Delete job', peligro: true, fn: () => { if (!confirm('¿Borrar el job y su historial de corridas?')) return; delete J[id]; D.cliGuardar(); D.ir('jobs'); } }], 'der');
      $('#jSch').onclick = () => D.dialogo({ titulo: 'Schedule', ok: 'Save', cuerpo: `<label class="dbx-campo"><span>Trigger type</span><select disabled><option>Scheduled</option></select></label><label class="dbx-campo"><span>Every</span><select id="sC">${[['dia', 'Day'], ['hora', 'Hour'], ['semana', 'Week']].map(([k, n]) => `<option value="${k}" ${sc && sc.cada === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label><label class="dbx-campo"><span>At</span><input id="sH" type="time" value="${esc(sc ? sc.hora : '06:00')}"></label><label class="dbx-campo"><span>Day (weekly)</span><select id="sD">${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((d, i) => `<option value="${i}" ${sc && Number(sc.dia) === i ? 'selected' : ''}>${d}</option>`).join('')}</select></label><label class="dbx-check"><input type="checkbox" id="sP" ${sc && sc.pausa ? 'checked' : ''}> Paused</label><p class="dbx-dim">En la práctica el job corre a su hora si dejas el workspace abierto en el navegador.</p>${sc ? '<button class="dbx-btn peligro" id="sQ" type="button">Delete trigger</button>' : ''}`, alAbrir: (dlg) => { const q0 = dlg.querySelector('#sQ'); if (q0) q0.onclick = () => { delete s.schedule; D.cliGuardar(); document.getElementById('dbxCapa').hidden = true; pintar(); }; }, alOk: (dlg) => { s.schedule = { cada: dlg.querySelector('#sC').value, hora: dlg.querySelector('#sH').value, dia: Number(dlg.querySelector('#sD').value), pausa: dlg.querySelector('#sP').checked }; s.schedule.siguiente = (proximo(s.schedule) || {}).toISOString?.(); D.cliGuardar(); pintar(); } });
      $('#jPar').onclick = () => D.dialogo({ titulo: 'Job parameters', ok: 'Save', cuerpo: `<p class="dbx-dim">Uno por línea: <code>nombre=valor por defecto</code>. Se pasan a todas las tareas (en los notebooks llegan como widgets).</p><textarea id="pT" rows="6" class="mono">${esc(s.parameters.map((x) => `${x.name}=${x.default}`).join('\n'))}</textarea>`, alOk: (dlg) => { s.parameters = dlg.querySelector('#pT').value.split('\n').map((l) => l.split('=')).filter((x) => x[0] && x[0].trim()).map(([k, ...v]) => ({ name: k.trim(), default: v.join('=').trim() })); D.cliGuardar(); pintar(); } });
      $('#jNot').onclick = () => D.dialogo({ titulo: 'Notifications', ok: 'Save', cuerpo: `<label class="dbx-campo"><span>Email on failure (separados por coma)</span><input id="nE" value="${esc(((s.email_notifications || {}).on_failure || []).join(', '))}" placeholder="equipo-datos@empresa.com"></label>`, alOk: (dlg) => { s.email_notifications = { on_failure: dlg.querySelector('#nE').value.split(',').map((x) => x.trim()).filter(Boolean) }; D.cliGuardar(); pintar(); } });
    };
    const lanzar = async (params) => {
      if (s.tasks.some((t) => t.tipo === 'notebook' && !t.notebook_path)) { D.toast('Hay una tarea de notebook sin notebook elegido'); return D.ir('job/' + id + '/tareas'); }
      let rid = null;
      const pr = D.correrJob(id, { params, alCambiar: (run) => { if (!rid) { rid = run.run_id; D.ir('run/' + id + '/' + rid); } else if (location.hash.includes('/run/' + id + '/' + rid)) window.dispatchEvent(new CustomEvent('dbx-run')); } });
      await pr;
    };
    pintar();
  });
  function jobJson(j) { const s = j.settings; return { name: j.name, max_concurrent_runs: s.max_concurrent_runs, ...(s.schedule ? { schedule: { quartz_cron_expression: cron(s.schedule), timezone_id: 'America/Argentina/Buenos_Aires', pause_status: s.schedule.pausa ? 'PAUSED' : 'UNPAUSED' } } : {}), ...(s.parameters.length ? { parameters: s.parameters } : {}), ...((s.email_notifications || {}).on_failure ? { email_notifications: s.email_notifications } : {}), tasks: s.tasks.map((t) => ({ task_key: t.task_key, ...(t.depends_on.length ? { depends_on: t.depends_on } : {}), ...(t.run_if !== 'ALL_SUCCESS' ? { run_if: t.run_if } : {}), ...(t.tipo === 'notebook' ? { notebook_task: { notebook_path: t.notebook_path, ...(Object.keys(t.base_parameters || {}).length ? { base_parameters: t.base_parameters } : {}) }, ...(t.compute && t.compute !== 'serverless' ? { existing_cluster_id: t.compute } : {}) } : t.tipo === 'sql' ? { sql_task: { query: { query_text: t.sql }, warehouse_id: Object.keys(whs())[0] } } : t.tipo === 'condicion' ? { condition_task: { left: t.izq, op: { '==': 'EQUAL_TO', '!=': 'NOT_EQUAL', '>': 'GREATER_THAN', '>=': 'GREATER_THAN_OR_EQUAL', '<': 'LESS_THAN', '<=': 'LESS_THAN_OR_EQUAL' }[t.op], right: t.der } } : { pipeline_task: { pipeline_id: t.pipeline_id, full_refresh: !!t.full_refresh } }), ...(t.max_retries ? { max_retries: t.max_retries } : {}), ...(t.timeout_seconds ? { timeout_seconds: t.timeout_seconds } : {}) })) }; }
  function jobYaml(j) {
    const js = jobJson(j); const key = j.name.toLowerCase().replace(/\W+/g, '_');
    const y = (o, n) => Object.entries(o).map(([k, v]) => (Array.isArray(v) ? `${' '.repeat(n)}${k}:\n${v.map((x) => (typeof x === 'object' ? `${' '.repeat(n + 2)}- ${y(x, n + 4).trimStart()}` : `${' '.repeat(n + 2)}- ${x}`)).join('\n')}` : typeof v === 'object' && v !== null ? `${' '.repeat(n)}${k}:\n${y(v, n + 2)}` : `${' '.repeat(n)}${k}: ${typeof v === 'string' && /[:{}#]/.test(v) ? JSON.stringify(v) : v}`)).join('\n');
    return `# resources/${key}.job.yml (Declarative Automation Bundles)\nresources:\n  jobs:\n    ${key}:\n${y(js, 6)}\n`;
  }

  // ------------------------------------------------------------------ corrida de un job
  D.registrar('run', (cont, p) => {
    const J = jobs(); const id = p[0]; const j = J[id] && normJob(J[id]); const run = j && j.runs.find((r) => String(r.run_id) === String(p[1]));
    if (!run) return D.stub(cont, 'Corrida no encontrada', 'Esa corrida no existe.', [['Jobs', '#/databricks/jobs']]);
    let sel = p[2] || null;
    const pintar = () => {
      const est = Object.fromEntries(Object.entries(run.tareas || {}).map(([k, x]) => [k, x.estado]));
      const T = sel && run.tareas[sel];
      cont.innerHTML = `<div class="dbx-pag jb"><div class="dbx-migas"><a href="#/databricks/jobs">Jobs</a><span>/</span><a href="#/databricks/job/${id}">${esc(j.name)}</a></div>
        <div class="dbx-pag-cab"><h1>Run ${run.run_id} <span class="jr-est ${colorRes(run.result || run.state)}">${esc(run.result || run.state)}</span></h1><div class="dbx-acciones">${run.state === 'TERMINATED' && run.result !== 'SUCCESS' ? `<button class="dbx-btn primario" id="rRep">${ic('debug-restart')} Repair run</button>` : ''}<button class="dbx-btn" id="rOtra">${ic('play')} Run now</button></div></div>
        <div class="cx-meta"><span>Started ${D.hora(run.at)}</span><span>${run.ms ? 'Duration ' + (run.ms / 1000).toFixed(1) + ' s' : 'Running…'}</span><span>Launched: ${run.trigger === 'PERIODIC' ? 'By scheduler' : 'Manually'}</span>${Object.keys(run.params || {}).length ? `<span>Parameters: ${esc(JSON.stringify(run.params))}</span>` : ''}</div>
        <div class="jb-lay"><div class="jb-centro"><div class="jb-dag">${dagSvg(j.settings.tasks, est, sel)}</div>
        ${T ? `<h3>${esc(sel)} · <span class="jr-est ${colorRes(T.estado)}">${esc(T.estado)}</span>${T.intentos > 1 ? ` <small>(${T.intentos} intentos)</small>` : ''}</h3>${T.aviso ? `<p class="dbx-dim"><span class="dbx-gira"></span> ${esc(T.aviso)}</p>` : ''}${T.error ? `<div class="nb-error"><pre>${esc(T.error)}</pre></div>` : ''}${T.exit != null ? `<p>Notebook exited: <code>${esc(T.exit)}</code></p>` : ''}${(T.salidas || []).map((s, i) => `<div class="jr-celda"><pre class="dbx-code chico">${esc(String(s.src).slice(0, 600))}</pre><div data-o="${i}"></div></div>`).join('')}` : '<p class="dbx-dim">Haz clic en una tarea del gráfico para ver su salida.</p>'}
        </div><aside class="jb-det"><h3>Tasks</h3><table class="dbx-tabla"><tbody>${j.settings.tasks.map((t) => { const x = run.tareas[t.task_key] || {}; return `<tr><td><a href="#/databricks/run/${id}/${run.run_id}/${encodeURIComponent(t.task_key)}">${esc(t.task_key)}</a></td><td><span class="jr-est ${colorRes(x.estado)}">${esc(x.estado || '-')}</span></td><td>${x.ms ? (x.ms / 1000).toFixed(1) + ' s' : ''}</td></tr>`; }).join('')}</tbody></table>${run.tv && Object.keys(run.tv).length ? `<h3>Task values</h3><pre class="dbx-code chico">${esc(JSON.stringify(run.tv, null, 2))}</pre>` : ''}</aside></div></div>`;
      cont.querySelectorAll('.dag-n').forEach((n) => n.onclick = () => { sel = n.dataset.t; pintar(); });
      if (T) cont.querySelectorAll('[data-o]').forEach((el) => { const s = T.salidas[Number(el.dataset.o)]; el.innerHTML = (s.out || []).map((o, k) => (o.tipo === 'tabla' ? `<div class="nb-tabla" data-k="${k}"></div>` : o.tipo === 'error' ? `<div class="nb-error"><pre>${esc(o.v)}</pre></div>` : o.tipo === 'texto' ? `<pre class="nb-texto">${esc(o.v)}</pre>` : '')).join(''); el.querySelectorAll('.nb-tabla').forEach((t) => D.resultado(t, s.out[Number(t.dataset.k)])); });
      const rep = cont.querySelector('#rRep'); if (rep) rep.onclick = async () => { D.toast('Reparando: se vuelven a correr solo las tareas que fallaron y las que dependen de ellas'); await D.correrJob(id, { reparar: run, alCambiar: pintar }); pintar(); };
      cont.querySelector('#rOtra').onclick = async () => { let rid = null; await D.correrJob(id, { alCambiar: (r) => { if (!rid) { rid = r.run_id; D.ir('run/' + id + '/' + rid); } } }); };
    };
    const al = () => pintar(); window.addEventListener('dbx-run', al); D.alSalir(() => window.removeEventListener('dbx-run', al));
    // mientras corre, se refresca
    const iv = setInterval(() => { if (run.state === 'RUNNING') pintar(); else { clearInterval(iv); pintar(); } }, 900); D.alSalir(() => clearInterval(iv));
    pintar();
  });
  D.registrar('runs', (cont) => {
    const J = jobs(); const l = Object.entries(J).flatMap(([id, j]) => (j.runs || []).map((r) => ({ id, j, r }))).sort((a, b) => String(b.r.at).localeCompare(String(a.r.at))).slice(0, 100);
    cont.innerHTML = `<div class="dbx-pag"><div class="dbx-pag-cab"><h1>Job Runs</h1></div>${l.length ? `<table class="dbx-tabla"><thead><tr><th>Start time</th><th>Job</th><th>Run ID</th><th>Launched</th><th>Duration</th><th>Status</th></tr></thead><tbody>${l.map(({ id, j, r }) => `<tr><td><a href="#/databricks/run/${id}/${r.run_id}">${D.hora(r.at)}</a></td><td><a href="#/databricks/job/${id}">${esc(j.name)}</a></td><td>${r.run_id}</td><td>${r.trigger === 'PERIODIC' ? 'By scheduler' : 'Manually'}</td><td>${r.ms ? (r.ms / 1000).toFixed(1) + ' s' : '-'}</td><td><span class="jr-est ${colorRes(r.result || r.state)}">${esc(r.result || r.state)}</span></td></tr>`).join('')}</tbody></table>` : `<div class="dbx-vacio">${ic('checklist')}<p>Todavía no corrió ningún job.</p></div>`}</div>`;
  });

  // ------------------------------------------------------------------ Lakeflow Declarative Pipelines
  const pipelines = () => { const W = D.ws(); W.pipelines = W.pipelines || {}; return W.pipelines; };
  D.pipelines = pipelines;
  const EJEMPLO_PIPE = `-- Lakeflow Declarative Pipeline: cada sentencia define un dataset.
-- Databricks arma el gráfico con las dependencias y los actualiza en orden.

-- Bronze: tabla de streaming (incremental: en cada actualización procesa solo lo nuevo)
CREATE OR REFRESH STREAMING TABLE pedidos_bronze
COMMENT 'Pedidos tal como llegan'
AS SELECT * FROM STREAM(samples.tienda.pedidos);

-- Silver: vista materializada con expectativas de calidad
CREATE OR REFRESH MATERIALIZED VIEW pedidos_silver (
  CONSTRAINT canal_valido EXPECT (canal IN ('web', 'app', 'tienda', 'telefono')) ON VIOLATION DROP ROW,
  CONSTRAINT con_cliente EXPECT (cliente_id IS NOT NULL),
  CONSTRAINT estado_conocido EXPECT (estado <> 'desconocido')
)
COMMENT 'Pedidos limpios'
AS SELECT pedido_id, cliente_id, canal, estado, CAST(fecha_pedido AS DATE) AS fecha
FROM pedidos_bronze;

-- Gold: agregado para el tablero
CREATE OR REFRESH MATERIALIZED VIEW pedidos_por_dia
AS SELECT fecha, canal, COUNT(*) AS pedidos
FROM pedidos_silver
GROUP BY fecha, canal;
`;
  // AUTO CDC … INTO (y el nombre anterior, APPLY CHANGES INTO), según la referencia de Lakeflow pipelines:
  // CREATE FLOW f AS AUTO CDC [ONCE] INTO destino FROM fuente KEYS (…) [IGNORE NULL UPDATES]
  // [APPLY AS DELETE WHEN …] [APPLY AS TRUNCATE WHEN …] SEQUENCE BY … [COLUMNS …] [STORED AS SCD TYPE 1|2] [TRACK HISTORY ON …]
  function parsearCdc(t) {
    const m = /^(?:CREATE FLOW\s+(\w+)\s+AS\s+)?(?:AUTO CDC(\s+ONCE)?|APPLY CHANGES)\s+INTO\s+(?:LIVE\.)?([\w.`]+)\s+FROM\s+([\s\S]+?)\s+KEYS\s*\(([^)]*)\)\s*([\s\S]*)$/i.exec(t);
    if (!m) return null;
    const lista = (x) => x.split(',').map((y) => y.trim().replace(/`/g, '').toLowerCase()).filter(Boolean);
    const sel = (x) => { x = (x || '').trim(); if (!x || x === '*') return { todas: true, menos: [] }; const ex = /^\*\s*EXCEPT\s*\(([^)]*)\)$/i.exec(x); if (ex) return { todas: true, menos: lista(ex[1]) }; return { todas: false, cols: lista(x.replace(/^\(|\)$/g, '')) }; };
    const C = { flujo: m[1] || null, once: !!m[2], destino: m[3].replace(/`/g, '').split('.').pop().toLowerCase(), fuente: m[4].trim(), keys: lista(m[5]), ignorarNulos: false, del: null, trunc: null, seq: null, columnas: sel('*'), scd: 1, historia: sel('*') };
    const KW = /\b(IGNORE NULL UPDATES(?:\s+ON\s+(?:\*\s*EXCEPT\s*\([^)]*\)|\([^)]*\)|\*))?|APPLY AS DELETE WHEN|APPLY AS TRUNCATE WHEN|SEQUENCE BY|COLUMNS(?!\s+TO\b)|STORED AS|TRACK HISTORY ON)\b/gi;
    const marcas = [...m[6].matchAll(KW)];
    if (m[6].trim() && (!marcas.length || marcas[0].index > 0 && m[6].slice(0, marcas[0].index).trim())) throw new Error(`AUTO CDC: no entiendo "${m[6].slice(0, marcas.length ? marcas[0].index : 60).trim()}". Después de KEYS (…) van IGNORE NULL UPDATES, APPLY AS DELETE WHEN, APPLY AS TRUNCATE WHEN, SEQUENCE BY, COLUMNS, STORED AS y TRACK HISTORY ON.`);
    marcas.forEach((mk, i) => {
      const v = m[6].slice(mk.index + mk[0].length, i + 1 < marcas.length ? marcas[i + 1].index : undefined).trim();
      const k = mk[0].toUpperCase().replace(/\s+/g, ' ');
      if (k.startsWith('IGNORE NULL UPDATES')) C.ignorarNulos = true;
      else if (k === 'APPLY AS DELETE WHEN') C.del = v;
      else if (k === 'APPLY AS TRUNCATE WHEN') C.trunc = v;
      else if (k === 'SEQUENCE BY') C.seq = v;
      else if (k === 'COLUMNS') C.columnas = sel(v);
      else if (k === 'STORED AS') { const x = /^SCD\s+TYPE\s+([12])$/i.exec(v); if (!x) throw new Error(`STORED AS ${v}: en esta práctica se simulan SCD TYPE 1 y SCD TYPE 2.`); C.scd = Number(x[1]); }
      else if (k === 'TRACK HISTORY ON') C.historia = sel(v);
    });
    if (!C.keys.length) throw new Error('AUTO CDC: KEYS es obligatorio (las columnas que identifican cada fila).');
    if (!C.seq) throw new Error('AUTO CDC: SEQUENCE BY es obligatorio (la columna que ordena los cambios, para resolver los que llegan desordenados).');
    if (C.trunc && C.scd === 2) throw new Error('APPLY AS TRUNCATE WHEN solo se admite con SCD TYPE 1 (SCD TYPE 2 no admite TRUNCATE).');
    if (!/^STREAM\s*\(|^STREAM\s+/i.test(C.fuente)) throw new Error(`AUTO CDC lee de una fuente de streaming: escribe FROM STREAM(${C.fuente.replace(/^LIVE\./i, '')}).`);
    if (/WHEN/i.test(C.fuente)) throw new Error('AUTO CDC: falta KEYS (…) después de FROM.');
    return C;
  }
  function parsearPipeline(src) {
    const sts = SQLX().sentencias(src);
    const ds = []; const cdcs = [];
    for (const st of sts) {
      const t = st.texto.replace(/\s+/g, ' ').trim();
      const cdc = /^(CREATE FLOW|AUTO CDC|APPLY CHANGES)\b/i.test(t) ? parsearCdc(t) : null;
      if (cdc) { cdcs.push(cdc); continue; }
      // destino de un flujo: CREATE OR REFRESH STREAMING TABLE nombre [(esquema)] [COMMENT …] (sin AS)
      const dec = /\bAS\s+(SELECT|WITH|FROM|TABLE)\b/i.test(t) ? null : /^CREATE (?:OR REFRESH )?STREAMING (?:LIVE )?TABLE\s+(?:IF NOT EXISTS\s+)?([\w.`]+)\s*(\(.*\))?\s*(COMMENT '((?:[^'\\]|\\.)*)')?\s*$/i.exec(t);
      if (dec) { ds.push({ nombre: dec[1].replace(/`/g, '').split('.').pop().toLowerCase(), tipo: 'STREAMING_TABLE', cons: [], comment: dec[4] || null, cuerpo: '', declarada: true }); continue; }
      const m = /^CREATE (?:OR REFRESH |OR REPLACE )?(STREAMING TABLE|STREAMING LIVE TABLE|MATERIALIZED VIEW|LIVE TABLE|TEMPORARY VIEW|TEMPORARY LIVE VIEW|VIEW)\s+(?:IF NOT EXISTS\s+)?([\w.`]+)\s*(\(.*?\))?\s*((?:COMMENT '(?:[^'\\]|\\.)*'\s*|PARTITIONED BY \([^)]*\)\s*|CLUSTER BY \([^)]*\)\s*|TBLPROPERTIES \([^)]*\)\s*)*)AS\s+([\s\S]+)$/i.exec(t);
      if (!m) { if (/^(APPLY CHANGES|AUTO CDC|CREATE FLOW)/i.test(t)) throw new Error(`No entiendo este flujo:\n${t.slice(0, 160)}\nLa forma es: CREATE FLOW nombre AS AUTO CDC INTO destino FROM STREAM(fuente) KEYS (id) SEQUENCE BY columna [STORED AS SCD TYPE 2]`); throw new Error(`No reconozco esta sentencia del pipeline:\n${t.slice(0, 160)}\nUsa CREATE OR REFRESH STREAMING TABLE … AS SELECT …, CREATE OR REFRESH MATERIALIZED VIEW … AS SELECT … o un flujo AUTO CDC.`); }
      const tipo = /STREAMING/i.test(m[1]) ? 'STREAMING_TABLE' : /TEMPORARY|^VIEW$/i.test(m[1]) ? 'VIEW' : 'MATERIALIZED_VIEW';
      const nombre = m[2].replace(/`/g, '').split('.').pop().toLowerCase();
      const cons = []; const dentro = (m[3] || '').slice(1, -1);
      for (const c of dentro.split(/,\s*(?=CONSTRAINT\b)/i)) { const x = /CONSTRAINT\s+(\w+)\s+EXPECT\s*\((.*)\)\s*(ON VIOLATION\s+(DROP ROW|FAIL UPDATE))?\s*$/i.exec(c.trim()); if (x) cons.push({ nombre: x[1], expr: x[2], accion: x[4] ? (/DROP/i.test(x[4]) ? 'drop' : 'fail') : 'warn' }); }
      const comment = (/COMMENT '((?:[^'\\]|\\.)*)'/i.exec(m[4] || '') || [])[1] || null;
      ds.push({ nombre, tipo, cons, comment, cuerpo: m[5] });
    }
    for (const c of cdcs) {
      const d = ds.find((x) => x.nombre === c.destino);
      if (!d || !d.declarada) throw new Error(`El flujo AUTO CDC escribe en ${c.destino}, pero esa tabla no está declarada (o tiene su propio AS SELECT). Declárala antes: CREATE OR REFRESH STREAMING TABLE ${c.destino};`);
      if (d.cdc) throw new Error(`En esta práctica cada tabla destino recibe un solo flujo AUTO CDC (${c.destino} tiene dos).`);
      d.cdc = c; d.cuerpo = `SELECT * FROM ${c.fuente}`;
    }
    for (const d of ds) if (d.declarada && !d.cdc) throw new Error(`La tabla de streaming ${d.nombre} está declarada pero ningún flujo escribe en ella. Agrega CREATE FLOW … AS AUTO CDC INTO ${d.nombre} … o defínela con AS SELECT.`);
    if (!ds.length) throw new Error('El pipeline no define ningún dataset.');
    const nombres = new Set(ds.map((d) => d.nombre));
    for (const d of ds) {
      d.deps = [...new Set([...d.cuerpo.matchAll(/\b(?:FROM|JOIN)\s+(?:STREAM\s*\(\s*)?(?:LIVE\.)?`?(\w+)`?(?!\s*\.)/gi)].map((x) => x[1].toLowerCase()).filter((n) => nombres.has(n) && n !== d.nombre))];
      d.streamDe = /\bSTREAM\s*\(/i.test(d.cuerpo) || /\bSTREAM\s+read_files/i.test(d.cuerpo);
      if (d.tipo === 'STREAMING_TABLE' && !d.streamDe && !d.cdc) throw new Error(`La tabla de streaming ${d.nombre} tiene que leer de una fuente de streaming: usa FROM STREAM(tabla) o FROM STREAM read_files(…).`);
    }
    // orden topológico
    const orden = []; const hecho = new Set(); const pend = ds.slice();
    while (pend.length) { const i = pend.findIndex((d) => d.deps.every((x) => hecho.has(x))); if (i < 0) throw new Error('El pipeline tiene un ciclo de dependencias: ' + pend.map((d) => d.nombre).join(', ')); const [d] = pend.splice(i, 1); hecho.add(d.nombre); orden.push(d); }
    return orden;
  }

  // aplica los cambios de una fuente CDC al destino (SCD tipo 1: el último valor; tipo 2: historial con
  // __START_AT / __END_AT). Los eventos se ordenan por SEQUENCE BY, así los que llegan desordenados se
  // resuelven igual que en Databricks. En la práctica se recalcula desde todos los eventos de la fuente,
  // que da el mismo resultado que procesar solo los nuevos.
  async function aplicarCdc(d, F, traducir, full, validar, pid, P, ev) {
    const C = d.cdc;
    const base = traducir(`SELECT * FROM ${C.fuente}`);
    const sql = `SELECT src.*, (${C.seq}) AS __cdc_seq, ${C.del ? `CASE WHEN ${C.del} THEN 1 ELSE 0 END` : '0'} AS __cdc_del, ${C.trunc ? `CASE WHEN ${C.trunc} THEN 1 ELSE 0 END` : '0'} AS __cdc_trunc FROM (${base}) AS src`;
    const r = (await SQLX().ejecutar(sql, { origen: 'Pipeline', limite: 1e7 }))[0];
    if (!r.ok) throw new Error(`Flujo AUTO CDC hacia ${d.nombre}: ${r.error}`);
    const n = r.cols.length - 3, colsFuente = r.cols.slice(0, n).map((c) => c.toLowerCase());
    for (const k of C.keys) if (!colsFuente.includes(k)) throw new Error(`[UNRESOLVED_COLUMN] KEYS (${k}): la fuente no tiene esa columna. Columnas: ${colsFuente.join(', ')}.`);
    const salida = C.columnas.todas ? colsFuente.filter((c) => !C.columnas.menos.includes(c)) : C.columnas.cols;
    for (const c of salida) if (!colsFuente.includes(c)) throw new Error(`[UNRESOLVED_COLUMN] COLUMNS (${c}): la fuente no tiene esa columna.`);
    const idx = salida.map((c) => colsFuente.indexOf(c)), idxK = C.keys.map((k) => colsFuente.indexOf(k));
    const seguidas = C.historia.todas ? salida.filter((c) => !C.historia.menos.includes(c) && !C.keys.includes(c)) : C.historia.cols;
    const idxH = seguidas.map((c) => salida.indexOf(c)).filter((i) => i >= 0);
    const evs = r.filas.map((f, i) => ({ f, i, seq: f[n], del: f[n + 1] === 1, trunc: f[n + 2] === 1 }));
    if (evs.some((e) => e.seq == null)) throw new Error('[AUTO_CDC_NULL_SEQUENCE] SEQUENCE BY no admite valores NULL: cada cambio tiene que tener su orden.');
    const cmp = (a, b) => (a.seq < b.seq ? -1 : a.seq > b.seq ? 1 : a.i - b.i);
    evs.sort(cmp);
    const clave = (f) => JSON.stringify(idxK.map((i) => f[i]));
    const mezclar = (nuevo, previo) => (C.ignorarNulos && previo ? nuevo.map((v, i) => (v == null ? previo[i] : v)) : nuevo);
    const M = { ins: 0, upd: 0, del: 0, trunc: 0 };
    let cols, filas;
    if (C.scd === 1) {
      let estado = new Map();
      for (const e of evs) {
        if (e.trunc) { estado = new Map(); M.trunc++; continue; }
        const k = clave(e.f); const previo = estado.get(k);
        if (e.del) { if (previo) { estado.delete(k); M.del++; } continue; }
        estado.set(k, mezclar(idx.map((i) => e.f[i]), previo)); previo ? M.upd++ : M.ins++;
      }
      cols = salida; filas = [...estado.values()];
    } else {
      const hist = new Map();
      for (const e of evs) {
        const k = clave(e.f); const vs = hist.get(k) || []; hist.set(k, vs);
        const cur = vs.find((v) => v.fin == null);
        if (e.del) { if (cur) { cur.fin = e.seq; M.del++; } continue; }
        const vals = mezclar(idx.map((i) => e.f[i]), cur && cur.vals);
        if (!cur) { vs.push({ vals, ini: e.seq, fin: null }); M.ins++; continue; }
        const cambio = idxH.some((i) => cur.vals[i] !== vals[i]);
        if (cambio) { cur.fin = e.seq; vs.push({ vals, ini: e.seq, fin: null }); M.upd++; } else if (vals.some((v, i) => v !== cur.vals[i])) { cur.vals = vals; M.upd++; }
      }
      cols = [...salida, '__START_AT', '__END_AT'];
      filas = [...hist.values()].flatMap((vs) => vs.map((v) => [...v.vals, v.ini, v.fin]));
    }
    const ik = C.keys.map((k) => salida.indexOf(k));
    filas.sort((a, b) => { for (const i of ik) { if (a[i] < b[i]) return -1; if (a[i] > b[i]) return 1; } return C.scd === 2 ? (a[a.length - 2] < b[b.length - 2] ? -1 : 1) : 0; });
    F.cdc = { ...M, eventos: evs.length, scd: C.scd };
    if (validar) { F.estado = 'COMPLETED'; ev('INFO', `Flow '${C.flujo || d.nombre}' validated (AUTO CDC, SCD TYPE ${C.scd}).`, d.nombre); return; }
    const destino = full(d.nombre);
    await SQLX().comoPipeline(() => SQLX().registrarDesdeDatos(destino, cols, filas, 'overwrite', 'MERGE'));
    SQLX().marcarPipeline(destino, 'STREAMING_TABLE', pid, P.nombre);
    P.estado[d.nombre] = { tipo: d.tipo, filas: filas.length, actualizado: ahora() };
    F.escritas = M.ins + M.upd; F.estado = 'COMPLETED';
    ev('INFO', `Flow '${C.flujo || d.nombre}' (AUTO CDC → ${d.nombre}, SCD TYPE ${C.scd}) has COMPLETED: ${evs.length} cambios leídos · ${M.ins} insertados · ${M.upd} actualizados · ${M.del} borrados${M.trunc ? ` · ${M.trunc} TRUNCATE` : ''}. La tabla quedó con ${filas.length} filas${C.scd === 2 ? ' (versiones)' : ''}.`, d.nombre);
  }
  async function correrPipeline(pid, { completo = false, validar = false, origen = 'USER_ACTION', alCambiar = () => {} } = {}) {
    const P = pipelines()[pid];
    const up = { id: uid(8) + '-' + uid(4), inicio: ahora(), estado: 'INITIALIZING', completo, validar, origen, eventos: [], flujos: {} };
    const ev = (nivel, msg, ds = null) => { up.eventos.push({ t: ahora(), nivel, msg, ds }); alCambiar(up); };
    P.updates = [up, ...(P.updates || [])].slice(0, 20); P.estado = P.estado || {}; P.procesado = P.procesado || {};
    ev('INFO', `Update ${up.id} started by ${origen}.${completo ? ' Full refresh: se recalculan todas las tablas desde cero.' : ''}`);
    let orden;
    try { orden = parsearPipeline(P.fuente); } catch (e) { up.estado = 'FAILED'; up.error = e.message; ev('ERROR', e.message); D.guardar(); return up; }
    up.estado = 'SETTING_UP_TABLES'; ev('INFO', `Grafo del pipeline: ${orden.map((d) => d.nombre).join(' → ')}`);
    const full = (n) => `${P.catalogo}.${P.esquema}.${n}`;
    // los nombres de datasets del pipeline (con o sin LIVE.) apuntan al catálogo y esquema destino
    const traducir = (sql) => sql.replace(/\bSTREAM\s*\(\s*([\w.`]+)\s*\)/gi, '$1').replace(/\bSTREAM\s+(read_files)/gi, '$1').replace(/\bLIVE\.(\w+)/gi, (m, n) => full(n.toLowerCase())).replace(/\b(FROM|JOIN)\s+`?(\w+)`?(?!\s*[.(])/gi, (m, kw, n) => (orden.some((d) => d.nombre === n.toLowerCase()) ? `${kw} ${full(n.toLowerCase())}` : m));
    try {
      const U = SQLX().uc();
      if (!U.catalogs[P.catalogo]) throw new Error(`[NO_SUCH_CATALOG_EXCEPTION] El catálogo destino ${P.catalogo} no existe.`);
      if (!U.catalogs[P.catalogo].schemas[P.esquema]) { await SQLX().ejecutar(`CREATE SCHEMA IF NOT EXISTS ${P.catalogo}.${P.esquema}`, { origen: 'Pipeline' }); ev('INFO', `Se creó el esquema destino ${P.catalogo}.${P.esquema}.`); }
      up.estado = 'RUNNING'; alCambiar(up);
      for (const d of orden) {
        const F = up.flujos[d.nombre] = { estado: 'RUNNING', escritas: 0, quitadas: 0, exp: [] }; ev('INFO', `Flow '${d.nombre}' is RUNNING.`, d.nombre); alCambiar(up);
        await espera(250);
        if (d.cdc) { await aplicarCdc(d, F, traducir, full, validar, pid, P, ev); continue; }
        let cuerpo = traducir(d.cuerpo);
        // tabla de streaming: solo lo nuevo desde la última actualización (offset o archivos ya leídos)
        const previo = P.procesado[d.nombre] || { filas: 0, archivos: [] };
        const nuevaTabla = completo || !P.estado[d.nombre];
        if (d.tipo === 'STREAMING_TABLE' && !nuevaTabla) {
          const rf = /read_files\s*\(\s*'([^']+)'([^)]*)\)/i.exec(cuerpo);
          if (rf) {
            const F0 = SQLX().archivos(); const todos = Object.keys(F0).filter((k) => k === rf[1] || k.startsWith(rf[1].replace(/\/$/, '') + '/'));
            const nuevos = todos.filter((k) => !previo.archivos.includes(k));
            cuerpo = nuevos.length ? cuerpo.replace(rf[0], '(' + nuevos.map((k) => `SELECT * FROM read_files('${k}'${rf[2]})`).join(' UNION ALL ') + ')') : `SELECT * FROM (${cuerpo}) WHERE 1 = 0`;
            previo.nuevosArchivos = nuevos;
          } else cuerpo = `SELECT * FROM (${cuerpo}) LIMIT -1 OFFSET ${previo.filas}`;
        } else if (d.tipo === 'STREAMING_TABLE') { const rf = /read_files\s*\(\s*'([^']+)'/i.exec(cuerpo); if (rf) { const F0 = SQLX().archivos(); previo.nuevosArchivos = Object.keys(F0).filter((k) => k === rf[1] || k.startsWith(rf[1].replace(/\/$/, '') + '/')); } previo.filas = 0; }
        // expectativas: cuántas filas no cumplen cada una (NULL cuenta como que no cumple)
        if (d.cons.length) {
          const cnt = await SQLX().ejecutar(`SELECT COUNT(*) AS total, ${d.cons.map((c, i) => `SUM(CASE WHEN COALESCE((${c.expr}), FALSE) THEN 0 ELSE 1 END) AS f${i}`).join(', ')} FROM (${cuerpo}) AS src`, { origen: 'Pipeline', limite: 1 });
          if (!cnt[0].ok) throw new Error(`Dataset ${d.nombre}: ${cnt[0].error}`);
          const fila = cnt[0].filas[0]; const total = fila[0] || 0;
          d.cons.forEach((c, i) => F.exp.push({ nombre: c.nombre, accion: c.accion, expr: c.expr, fallidas: fila[i + 1] || 0, pasaron: total - (fila[i + 1] || 0) }));
          const malFail = F.exp.find((x) => x.accion === 'fail' && x.fallidas > 0);
          if (malFail) throw new Error(`[EXPECTATION_VIOLATION.VERBOSE] Flow '${d.nombre}' failed to write: expectation '${malFail.nombre}' (${malFail.expr}) was violated by ${malFail.fallidas} record(s). Con ON VIOLATION FAIL UPDATE la actualización se detiene y no se escribe nada.`);
        }
        const drops = d.cons.filter((c) => c.accion === 'drop');
        const filtro = drops.length ? ` WHERE ${drops.map((c) => `COALESCE((${c.expr}), FALSE)`).join(' AND ')}` : '';
        if (validar) { F.estado = 'COMPLETED'; ev('INFO', `Flow '${d.nombre}' validated.`, d.nombre); continue; }
        const destino = full(d.nombre);
        if (d.tipo === 'VIEW') { await SQLX().ejecutar(`CREATE OR REPLACE TEMP VIEW ${d.nombre} AS SELECT * FROM (${cuerpo}) AS src${filtro}`, { origen: 'Pipeline' }); F.estado = 'COMPLETED'; continue; }
        const r = await SQLX().comoPipeline(async () => {
          if (d.tipo === 'MATERIALIZED_VIEW' || nuevaTabla) return SQLX().ejecutar(`CREATE OR REPLACE TABLE ${destino}${d.comment ? ` COMMENT '${d.comment.replace(/'/g, "\\'")}'` : ''} AS SELECT * FROM (${cuerpo}) AS src${filtro}`, { origen: 'Pipeline', limite: 1 });
          return SQLX().ejecutar(`INSERT INTO ${destino} SELECT * FROM (${cuerpo}) AS src${filtro}`, { origen: 'Pipeline', limite: 1 });
        });
        const u = r[r.length - 1]; if (!u.ok) throw new Error(`Dataset ${d.nombre}: ${u.error}`);
        F.escritas = u.filas[0] ? u.filas[0][1] ?? u.filas[0][0] : 0;
        F.quitadas = drops.length ? F.exp.filter((x) => x.accion === 'drop').reduce((a, x) => Math.max(a, x.fallidas), 0) : 0;
        SQLX().marcarPipeline(destino, d.tipo, pid, P.nombre);
        if (d.tipo === 'STREAMING_TABLE') { const totalLeidas = (await SQLX().ejecutar(`SELECT COUNT(*) FROM (${traducir(d.cuerpo)})`, { origen: 'Pipeline', limite: 1 }))[0]; P.procesado[d.nombre] = { filas: totalLeidas.ok ? totalLeidas.filas[0][0] : 0, archivos: [...new Set([...(nuevaTabla ? [] : previo.archivos), ...(previo.nuevosArchivos || [])])] }; }
        P.estado[d.nombre] = { tipo: d.tipo, filas: SQLX().filasDe(destino), actualizado: ahora() };
        F.estado = 'COMPLETED';
        ev('INFO', `Flow '${d.nombre}' has COMPLETED: ${F.escritas} filas escritas${F.quitadas ? `, ${F.quitadas} descartadas por expectativas` : ''}${d.tipo === 'STREAMING_TABLE' && !nuevaTabla ? ' (solo datos nuevos)' : ''}.`, d.nombre);
      }
      up.estado = 'COMPLETED'; up.fin = ahora(); ev('INFO', `Update ${up.id} is COMPLETED.`);
    } catch (e) {
      up.estado = 'FAILED'; up.fin = ahora(); up.error = e.message;
      for (const f of Object.values(up.flujos)) if (f.estado === 'RUNNING') f.estado = 'FAILED';
      ev('ERROR', e.message);
    }
    D.guardar(); alCambiar(up);
    return up;
  }
  D.correrPipeline = correrPipeline;
  D.registrar('pipelines', (cont, p) => {
    if (p[0] !== 'nuevo') return D.ir('jobs/pipelines');
    cont.innerHTML = '';
    D.dialogo({ titulo: 'Create ETL pipeline', ok: 'Create', cuerpo: `<label class="dbx-campo"><span>Pipeline name</span><input id="pN" value="Pipeline pedidos"></label><label class="dbx-campo"><span>Default catalog</span><select id="pC">${SQLX().arbol().filter((c) => !c.soloLectura).map((c) => `<option>${esc(c.nombre)}</option>`).join('')}</select></label><label class="dbx-campo"><span>Default schema</span><input id="pS" value="ventas_pipeline"></label><label class="dbx-campo"><span>Start with</span><select id="pE"><option value="ej">Sample code (medallion: bronze → silver → gold)</option><option value="vacio">Empty file</option></select></label><p class="dbx-dim">Las tablas que defina el pipeline se crean en el catálogo y esquema destino.</p>`, alOk: (dlg) => {
      const nombre = dlg.querySelector('#pN').value.trim(); const esq = dlg.querySelector('#pS').value.trim().toLowerCase();
      if (!nombre) throw new Error('Ponle un nombre.'); if (!/^[a-z_]\w*$/.test(esq)) throw new Error('Esquema inválido.');
      const id = uid(8) + '-' + uid(4) + '-' + uid(4);
      pipelines()[id] = { nombre, catalogo: dlg.querySelector('#pC').value, esquema: esq, modo: 'triggered', fuente: dlg.querySelector('#pE').value === 'ej' ? EJEMPLO_PIPE : '-- CREATE OR REFRESH STREAMING TABLE …\n', updates: [], creado: ahora() };
      D.guardar(); D.ir('pipeline/' + id);
    } });
    const capa = document.getElementById('dbxCapa'); const obs = new MutationObserver(() => { if (capa.hidden && location.hash === '#/databricks/pipelines/nuevo') { obs.disconnect(); D.ir('jobs/pipelines'); } }); obs.observe(capa, { attributes: true });
  });
  D.registrar('pipeline', (cont, p) => {
    const P = pipelines()[p[0]]; const id = p[0];
    if (!P) return D.stub(cont, 'Pipeline no encontrado', 'Ese pipeline no existe.', [['Pipelines', '#/databricks/jobs/pipelines']]);
    D.reciente('pipeline', P.nombre, 'pipeline/' + id);
    let sel = null, ed = null, corriendo = false;
    const pintar = () => {
      const up = (P.updates || [])[0];
      let orden = []; let errParse = null; try { orden = parsearPipeline(P.fuente); } catch (e) { errParse = e.message; }
      cont.innerHTML = `<div class="dbx-pag pl"><div class="dbx-migas"><a href="#/databricks/jobs/pipelines">Pipelines</a></div>
        <div class="dbx-pag-cab"><h1>${ic('combine')} ${esc(P.nombre)} ${up ? `<span class="jr-est ${up.estado === 'COMPLETED' ? 'ok' : up.estado === 'FAILED' ? 'mal' : 'corre'}">${esc(up.estado)}</span>` : ''}</h1><div class="dbx-acciones"><button class="dbx-btn" data-a="validar">${ic('check')} Dry run</button><button class="dbx-btn" data-a="full">${ic('debug-restart')} Full refresh all</button><button class="dbx-btn primario" data-a="start">${ic('play')} Run pipeline</button><button class="dbx-ib" data-a="mas">${ic('ellipsis')}</button></div></div>
        <div class="cx-meta"><span>Target: ${esc(P.catalogo)}.${esc(P.esquema)}</span><span>Mode: ${P.modo === 'continuous' ? 'Continuous' : 'Triggered'}</span><span>Compute: Serverless</span>${up ? `<span>Last update: ${D.hora(up.inicio)}</span>` : ''}</div>
        <div class="pl-lay"><section class="pl-ed"><div class="pl-ed-cab">${ic('file-code')} transformations/pipeline.sql <button class="dbx-btn chico" data-a="guardar">Save</button></div><textarea id="plSrc">${esc(P.fuente)}</textarea>${errParse ? `<div class="nb-error"><pre>${esc(errParse)}</pre></div>` : ''}</section>
        <section class="pl-graf"><h3>Pipeline graph</h3><div class="pl-nodos">${orden.map((d) => { const f = up && up.flujos[d.nombre]; const e = P.estado && P.estado[d.nombre]; return `<div class="pl-n ${sel === d.nombre ? 'sel' : ''} ${f ? (f.estado === 'COMPLETED' ? 'ok' : f.estado === 'FAILED' ? 'mal' : 'corre') : ''}" data-ds="${esc(d.nombre)}"><div class="pl-n-t">${ic(d.tipo === 'STREAMING_TABLE' ? 'pulse' : d.tipo === 'VIEW' ? 'eye' : 'table')} <b>${esc(d.nombre)}</b></div><small>${{ STREAMING_TABLE: 'Streaming table', MATERIALIZED_VIEW: 'Materialized view', VIEW: 'View' }[d.tipo]}${d.cdc ? ` · AUTO CDC (SCD ${d.cdc.scd})` : ''}${d.deps.length ? ' · ← ' + esc(d.deps.join(', ')) : ''}</small>${f ? `<div class="pl-n-m">${f.estado === 'RUNNING' ? '<span class="dbx-gira"></span> Running' : `${(f.escritas || 0).toLocaleString('es')} escritas${f.quitadas ? ` · <span class="dbx-mal">${f.quitadas} descartadas</span>` : ''}`}${f.exp.length ? ` · ${ic('shield')} ${f.exp.length} exp.` : ''}</div>` : e ? `<div class="pl-n-m">${(e.filas || 0).toLocaleString('es')} filas</div>` : ''}</div>`; }).join('<div class="pl-fl">↓</div>')}</div>
        <div id="plDet"></div></section></div>
        <h3>Event log</h3><div class="pl-log">${up ? up.eventos.slice().reverse().map((e) => `<div class="${e.nivel === 'ERROR' ? 'mal' : ''}"><span>${esc(e.t.slice(11, 19))}</span><b>${esc(e.nivel)}</b><span>${esc(e.msg)}</span></div>`).join('') : '<p class="dbx-dim">Todavía no se ejecutó. Pulsa <b>Run pipeline</b>.</p>'}</div>
        <h3>Update history</h3><table class="dbx-tabla"><tbody>${(P.updates || []).map((u) => `<tr><td><span class="jr-b ${u.estado === 'COMPLETED' ? 'ok' : u.estado === 'FAILED' ? 'mal' : 'corre'}"></span> ${esc(u.estado)}</td><td>${D.hora(u.inicio)}</td><td>${u.completo ? 'Full refresh' : u.validar ? 'Dry run' : 'Incremental'}</td><td>${esc(u.origen)}</td></tr>`).join('') || '<tr><td class="dbx-dim">Sin actualizaciones</td></tr>'}</tbody></table></div>`;
      if (window.CodeMirror) { ed = window.CodeMirror.fromTextArea(cont.querySelector('#plSrc'), { mode: 'text/x-sparksql', lineNumbers: true, matchBrackets: true }); ed.on('change', () => { P.fuente = ed.getValue(); clearTimeout(ed._t); ed._t = setTimeout(() => D.guardar(), 400); }); D.alSalir(() => { if (ed) ed.toTextArea(); ed = null; }); }
      cont.querySelectorAll('.pl-n').forEach((n) => n.onclick = () => { sel = n.dataset.ds; detalle(); cont.querySelectorAll('.pl-n').forEach((x) => x.classList.toggle('sel', x === n)); });
      detalle();
      cont.querySelector('.dbx-acciones').onclick = (e) => accion(e.target.closest('[data-a]'));
      cont.querySelector('[data-a=guardar]').onclick = () => { if (ed) P.fuente = ed.getValue(); D.guardar(); pintar(); D.toast('Guardado'); };
    };
    const detalle = () => {
      const box = cont.querySelector('#plDet'); if (!box || !sel) { if (box) box.innerHTML = '<p class="dbx-dim">Elige un dataset del gráfico para ver sus métricas y la calidad de datos.</p>'; return; }
      const up = (P.updates || [])[0]; const f = up && up.flujos[sel]; const full = `${P.catalogo}.${P.esquema}.${sel}`;
      box.innerHTML = `<h3>${esc(sel)}</h3><p><a href="#/databricks/catalogo/${D.ruta(P.catalogo, P.esquema, sel)}">Ver ${esc(full)} en Catalog Explorer</a></p>${f && f.exp.length ? `<h4>Data quality</h4><table class="dbx-tabla"><thead><tr><th>Expectation</th><th>Action</th><th>Passed</th><th>Failed</th><th>%</th></tr></thead><tbody>${f.exp.map((x) => { const tot = x.pasaron + x.fallidas || 1; return `<tr><td><code>${esc(x.nombre)}</code><br><small>${esc(x.expr)}</small></td><td>${{ warn: 'Warn (keep)', drop: 'Drop row', fail: 'Fail update' }[x.accion]}</td><td>${x.pasaron}</td><td class="${x.fallidas ? 'dbx-mal' : ''}">${x.fallidas}</td><td>${Math.round((x.pasaron / tot) * 1000) / 10}%</td></tr>`; }).join('')}</tbody></table>` : '<p class="dbx-dim">Sin expectativas en este dataset (o todavía no se ejecutó).</p>'}`;
    };
    const accion = async (b) => {
      if (!b) return; const a = b.dataset.a;
      if (a === 'mas') return D.menu(b, [{ ic: 'gear', txt: 'Settings', fn: () => D.dialogo({ titulo: 'Pipeline settings', ok: 'Save', cuerpo: `<label class="dbx-campo"><span>Name</span><input id="sN" value="${esc(P.nombre)}"></label><label class="dbx-campo"><span>Default catalog</span><input id="sC" value="${esc(P.catalogo)}"></label><label class="dbx-campo"><span>Default schema</span><input id="sS" value="${esc(P.esquema)}"></label><label class="dbx-campo"><span>Pipeline mode</span><select id="sM"><option value="triggered">Triggered</option><option value="continuous" ${P.modo === 'continuous' ? 'selected' : ''}>Continuous</option></select></label><p class="dbx-dim">Triggered procesa lo pendiente y se detiene (lo normal). Continuous queda encendido procesando datos apenas llegan (más caro).</p>`, alOk: (dlg) => { P.nombre = dlg.querySelector('#sN').value.trim() || P.nombre; P.catalogo = dlg.querySelector('#sC').value.trim(); P.esquema = dlg.querySelector('#sS').value.trim(); P.modo = dlg.querySelector('#sM').value; D.guardar(); pintar(); } }) }, { ic: 'type-hierarchy', txt: 'Schedule (create job)', fn: () => { const J = jobs(); const jid = String(Math.floor(1e11 + Math.random() * 9e11)); J[jid] = { name: P.nombre + ' (job)', creado: ahora(), runs: [], settings: { tasks: [{ task_key: 'pipeline', tipo: 'pipeline', pipeline_id: id, depends_on: [], run_if: 'ALL_SUCCESS', max_retries: 0 }], parameters: [], max_concurrent_runs: 1 } }; D.cliGuardar(); D.ir('job/' + jid + '/tareas'); } }, '-', { ic: 'trash', txt: 'Delete pipeline', peligro: true, fn: () => { if (!confirm('¿Borrar el pipeline? Las tablas que creó quedan, pero ya nadie las actualiza.')) return; const U = SQLX().uc(); for (const n of Object.keys(P.estado || {})) { const T = U.catalogs[P.catalogo] && U.catalogs[P.catalogo].schemas[P.esquema] && U.catalogs[P.catalogo].schemas[P.esquema].tables[n]; if (T) { delete T.pipeline; T.tipo = 'MANAGED'; } } delete pipelines()[id]; D.guardar(); D.ir('jobs/pipelines'); } }], 'der');
      if (corriendo) return D.toast('Ya hay una actualización en curso');
      if (ed) P.fuente = ed.getValue();
      corriendo = true;
      await correrPipeline(id, { completo: a === 'full', validar: a === 'validar', alCambiar: () => { if (location.hash.includes('/pipeline/' + id)) pintar(); } });
      corriendo = false; pintar();
    };
    pintar();
  });
})();
