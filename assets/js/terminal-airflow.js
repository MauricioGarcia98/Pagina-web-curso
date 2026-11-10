/* Comando `airflow` de la terminal del curso (CLI de Airflow 3, simulada). Comparte el estado con la réplica
 * de la interfaz (#/airflow) a través de AirflowMotor: lo que disparas acá aparece en la Grid, y las variables
 * que creas en Admin se ven con `airflow variables list`. */
(function () {
  'use strict';
  const Sh = window.Shell;
  if (!Sh || !Sh.def) return;
  const { ok, fail, col, fmtTable } = Sh;
  const A = () => window.AirflowMotor;
  const flag = (a, ...ns) => { for (let i = 0; i < a.length; i++) { for (const n of ns) { if (a[i] === n) return a[i + 1]; if (a[i].startsWith(n + '=')) return a[i].slice(n.length + 1); } } return undefined; };
  const posicionales = (a) => { const out = []; for (let i = 0; i < a.length; i++) { if (a[i].startsWith('-')) { if (!a[i].includes('=') && a[i + 1] && !a[i + 1].startsWith('-') && !['--yes', '-y', '--verbose', '-v', '--mark-success', '--local'].includes(a[i])) i++; continue; } out.push(a[i]); } return out; };
  const salida = (a) => flag(a, '--output', '-o') || 'table';
  function formato(a, cols, filas) {
    const o = salida(a);
    if (o === 'json') return JSON.stringify(filas.map((f) => Object.fromEntries(cols.map((c, i) => [c, f[i]]))), null, 2);
    if (o === 'yaml') return filas.map((f) => cols.map((c, i) => `${i ? '  ' : '- '}${c}: ${f[i]}`).join('\n')).join('\n');
    if (o === 'plain') return filas.map((f) => f.join('  ')).join('\n');
    return fmtTable(cols, filas);
  }
  const AYUDA = `Usage: airflow [-h] GROUP_OR_COMMAND ...

Groups:
  dags         Manage Dags
  tasks        Manage tasks
  variables    Manage variables
  connections  Manage connections
  pools        Manage pools
  config       View configuration
  db           Database operations

Commands:
  api-server   Start an Airflow API server instance
  scheduler    Start a scheduler instance
  standalone   Run an all-in-one copy of Airflow
  info         Show information about current Airflow and environment
  version      Show the version

${col.dim('(simulado: los DAGs se leen de ~/airflow/dags y la interfaz está en #/airflow)')}`;
  const esperarFin = (r) => new Promise((res) => { const iv = setInterval(() => { if (['success', 'failed'].includes(r.state)) { clearInterval(iv); res(); } }, 120); });
  const icono = (s) => s === 'success' ? col.ok('success') : s === 'failed' || s === 'upstream_failed' ? col.err(s) : s === 'skipped' ? col.warn(s) : s;

  Sh.def('airflow', 'Apache Airflow CLI (simulada): airflow dags list · dags test · dags trigger · tasks test · variables · connections', async (a) => {
    if (!A()) return fail('Airflow no está disponible en esta página');
    const [g, c] = a; const p = posicionales(a.slice(2));
    if (!g || g === '-h' || g === '--help') return ok(AYUDA);
    if (g === 'version') return ok(A().VERSION);
    if (g === 'info') return ok(`Apache Airflow\nversion                | ${A().VERSION}\nexecutor               | LocalExecutor\ntask_logging_handler   | airflow.utils.log.file_task_handler.FileTaskHandler\nsql_alchemy_conn       | sqlite:///${A().AIRFLOW_HOME}/airflow.db\ndags_folder            | ${A().DAGS}\nplugins_folder         | ${A().AIRFLOW_HOME}/plugins\nbase_log_folder        | ${A().AIRFLOW_HOME}/logs\n\n${col.dim('(simulado)')}`);
    if (g === 'standalone' || g === 'api-server' || g === 'webserver' || g === 'scheduler' || g === 'dag-processor' || g === 'triggerer') {
      if (g === 'webserver') return fail('airflow command error: argument GROUP_OR_COMMAND: invalid choice: \'webserver\' — en Airflow 3 la interfaz la sirve `airflow api-server`');
      A().sembrar();
      return ok(`${g === 'standalone' ? 'standalone | Starting Airflow Standalone\nstandalone | Database ready\nscheduler | [INFO] Starting the scheduler\ndag-processor | [INFO] Processing files in ' + A().DAGS + '\n' : ''}api-server | INFO:     Uvicorn running on http://0.0.0.0:8080 (Press CTRL+C to quit)\n${g === 'standalone' ? 'standalone | Airflow is ready\nstandalone | Login with username: admin  (Simple auth manager)\n' : ''}\n${col.info('→ Abre la interfaz de práctica: #/airflow')} ${col.dim('(en la práctica los procesos corren en tu navegador; no queda nada escuchando en un puerto)')}`);
    }
    if (g === 'db') {
      if (['migrate', 'init', 'reset', 'check'].includes(c)) { if (c === 'reset') { A().reiniciar(); return ok('Database reset: corridas, variables y conexiones borradas (los DAGs siguen en la carpeta).'); } if (c === 'init') return ok(col.warn('`airflow db init` ya no existe en Airflow 3: usa `airflow db migrate`.')); return ok(c === 'check' ? 'Connection successful.' : `DB: sqlite:///${A().AIRFLOW_HOME}/airflow.db\nPerforming upgrade to the metadata database sqlite:///…/airflow.db\nDatabase migrating done!`); }
      return fail('Usage: airflow db {migrate,check,reset}');
    }
    if (g === 'config') {
      const cfg = Sh.exists(A().AIRFLOW_HOME + '/airflow.cfg') ? Sh.readFile(A().AIRFLOW_HOME + '/airflow.cfg') : '';
      if (c === 'get-value') { const [sec, key] = p; let s = null; for (const l of cfg.split('\n')) { const m = l.match(/^\[(.+)\]$/); if (m) { s = m[1]; continue; } const kv = l.match(/^(\w+)\s*=\s*(.*)$/); if (kv && s === sec && kv[1] === key) return ok(kv[2]); } return fail(`The option [${sec}/${key}] is not found in config.`); }
      if (c === 'list') return ok(cfg);
      return fail('Usage: airflow config {get-value,list}');
    }

    await A().parsear().catch((e) => { throw new Error('No se pudo analizar la carpeta de DAGs: ' + e.message); });
    const B = A().bolsa(); const s = A().st();

    if (g === 'dags') {
      if (c === 'list') return ok(formato(a, ['dag_id', 'fileloc', 'owners', 'is_paused'], B.dags.map((d) => [d.id, d.file, d.owners.join(','), String(!!s.pausados[d.id])])) + (Object.keys(B.errores).length ? `\n${col.warn(`Failed to load all files. For details, run \`airflow dags list-import-errors\``)}` : ''));
      if (c === 'list-import-errors') { const e = Object.entries(B.errores); return e.length ? ok(formato(a, ['filepath', 'error'], e.map(([k, v]) => [k, v.trim()]))) : ok('No data found'); }
      if (c === 'reserialize') { await A().parsear(true); return ok(`Reserialized ${A().bolsa().dags.length} Dags.`); }
      const id = p[0];
      if (['pause', 'unpause', 'trigger', 'test', 'list-runs', 'show', 'state', 'next-execution', 'details', 'delete', 'backfill'].includes(c)) {
        if (!id) return fail(`airflow dags ${c}: error: the following arguments are required: dag_id`);
        const d = A().dag(id);
        if (!d) return fail(`Dag id ${id} not found in DagModel${B.errores && Object.keys(B.errores).length ? ' (hay archivos con errores: airflow dags list-import-errors)' : ''}`);
        if (c === 'pause' || c === 'unpause') { A().pausar(id, c === 'pause'); return ok(formato(a, ['dag_id', 'is_paused'], [[id, String(c === 'pause')]])); }
        if (c === 'details') return ok(formato(a, ['property_name', 'property_value'], [['dag_id', id], ['fileloc', d.file], ['schedule', A().textoHorario(d)], ['is_paused', String(!!s.pausados[id])], ['owners', d.owners.join(',')], ['tags', d.tags.join(',')], ['max_active_runs', d.max_runs], ['catchup', String(d.catchup)]]));
        if (c === 'next-execution') { const n = A().siguiente(d); return ok(n ? n.toISOString().replace('.000Z', '+00:00') : 'None'); }
        if (c === 'show') { const L = [`digraph ${id} {`, '  rankdir=LR;']; for (const t of d.tasks) for (const u of t.up) L.push(`  "${u}" -> "${t.id}";`); L.push('}'); return ok(L.join('\n')); }
        if (c === 'list-runs') return ok(formato(a, ['dag_id', 'run_id', 'state', 'run_type', 'logical_date', 'start_date', 'end_date'], A().runs(id).map((r) => [id, r.run_id, r.state, r.tipo, r.logical, r.inicio || '', r.fin || ''])) || 'No data found');
        if (c === 'state') { const ld = p[1]; const r = A().runs(id).find((x) => !ld || x.logical.startsWith(ld) || x.run_id === ld); return r ? ok(r.state) : ok('None'); }
        if (c === 'delete') { if (!a.includes('-y') && !a.includes('--yes')) return fail('This will drop all existing records related to the specified Dag! Usa --yes para confirmar.'); A().borrarDag(id); return ok(`Removed all records of Dag ${id} (el archivo sigue en la carpeta)`); }
        if (c === 'trigger') {
          let conf = {}; const cs = flag(a, '--conf', '-c');
          if (cs) { try { conf = JSON.parse(cs); } catch (e) { return fail(`--conf debe ser JSON válido: ${e.message}. Ejemplo: -c '{"tienda": "lima"}'`); } }
          const ld = flag(a, '--logical-date', '-l');
          const r = A().disparar(id, { conf, logical: ld ? new Date(ld.length <= 10 ? ld + 'T00:00:00Z' : ld).toISOString() : undefined, runId: flag(a, '--run-id', '-r') });
          return ok(formato(a, ['dag_id', 'dag_run_id', 'state', 'run_after', 'logical_date', 'conf'], [[id, r.run_id, r.state, r.creado, r.logical, JSON.stringify(r.conf)]]) + (s.pausados[id] ? `\n${col.warn(`El Dag está pausado: la corrida queda en queued hasta que lo despauses (airflow dags unpause ${id}).`)}` : `\n${col.dim('Míralo correr en #/airflow/dags/' + id)}`));
        }
        if (c === 'backfill') return fail('En Airflow 3 el backfill se crea con `airflow backfill create --dag-id ID --from-date … --to-date …` o desde el botón Trigger → Backfill de la interfaz');
        if (c === 'test') {
          let conf = {}; const cs = flag(a, '--conf', '-c'); if (cs) { try { conf = JSON.parse(cs); } catch (e) { return fail('--conf debe ser JSON válido'); } }
          const datos = await A().probarDag(id, p[1], conf);
          const L = [`[${new Date().toISOString()}] {dagbag.py:588} INFO - Filling up the DagBag from ${d.file}`, `[${new Date().toISOString()}] {dag.py:2340} INFO - dagrun id: ${id}`, `[${new Date().toISOString()}] {dag.py:2359} INFO - created dagrun <DagRun ${id} @ ${p[1] || 'now'}: manual__…, state:running>`];
          for (const t of datos.dag.tasks) {
            const rec = datos.tis[t.id]; const st = datos.states[t.id];
            if (rec && rec.tries.length) rec.tries.forEach((tr, k) => {
              L.push(col.dim(`[${new Date().toISOString()}] {dag.py:3985} INFO - Running task ${t.id}${k ? ` (intento ${k + 1})` : ''}`));
              if (tr.out) L.push(...tr.out.replace(/\n$/, '').split('\n').map((x) => '  ' + x.trim()));
              if (tr.err) L.push(col.err(tr.err.trimEnd()));
              if (tr.ok && tr.ret !== undefined && tr.ret !== null) L.push(`  Done. Returned value was: ${typeof tr.ret === 'string' ? tr.ret : A().pyRepr(tr.ret)}`);
            });
            L.push(`[${new Date().toISOString()}] {dag.py:4010} INFO - ${t.id} ran successfully!`.replace('ran successfully!', st === 'success' ? 'ran successfully!' : `finished with state ${icono(st)}`));
          }
          L.push(`[${new Date().toISOString()}] {dagrun.py:854} INFO - Marking run <DagRun ${id}> ${icono(datos.state)}`);
          L.push(col.dim('(dags test ejecuta todo en este proceso, sin scheduler, y no queda en la historia de la interfaz)'));
          return { out: L.join('\n'), code: datos.state === 'success' ? 0 : 1 };
        }
      }
      return fail('Usage: airflow dags {list,list-import-errors,list-runs,pause,unpause,trigger,test,state,next-execution,details,show,delete,reserialize}');
    }
    if (g === 'backfill' && c === 'create') {
      const id = flag(a, '--dag-id'); const desde = flag(a, '--from-date'); const hasta = flag(a, '--to-date');
      if (!id || !desde || !hasta) return fail('airflow backfill create: error: the following arguments are required: --dag-id, --from-date, --to-date');
      try { const b = A().backfill(id, new Date(desde.length <= 10 ? desde + 'T00:00:00Z' : desde), new Date(hasta.length <= 10 ? hasta + 'T23:59:59Z' : hasta), { reproceso: flag(a, '--reprocess-behavior') || 'none', reverso: a.includes('--run-backwards') }); return ok(`Backfill ${b.id} created for ${id}: ${b.runs.length} Dag runs`); } catch (e) { return fail(e.message); }
    }
    if (g === 'tasks') {
      const [id, tid, fecha] = p;
      if (c === 'list') { const d = A().dag(id); if (!d) return fail(`Dag ${id} not found`); return ok(d.tasks.map((t) => t.id).join('\n')); }
      if (c === 'test') {
        if (!id || !tid) return fail('airflow tasks test: error: the following arguments are required: dag_id, task_id');
        try {
          const r = await A().probarTarea(id, tid, fecha);
          const L = [`[${new Date().toISOString()}] {taskinstance.py:1956} INFO - Dependencies all met for dep_context=non-requeueable deps ti=<TaskInstance: ${id}.${tid} __airflow_temporary_run [None]>`];
          for (const tr of (r.rec && r.rec.tries) || []) { if (tr.rend && tr.rend.bash_command) L.push(`[…] {subprocess.py:75} INFO - Running command: ['/usr/bin/bash', '-c', '${tr.rend.bash_command}']`); if (tr.out) L.push(...tr.out.replace(/\n$/, '').split('\n').map((x) => x.trim())); if (tr.err) L.push(col.err(tr.err.trimEnd())); if (tr.ok && tr.ret !== undefined && tr.ret !== null) L.push(`[…] {python.py:240} INFO - Done. Returned value was: ${typeof tr.ret === 'string' ? tr.ret : A().pyRepr(tr.ret)}`); }
          L.push(`[…] {taskinstance.py:1400} INFO - Marking task as ${String(r.estado || 'none').toUpperCase()}. dag_id=${id}, task_id=${tid}`);
          L.push(col.dim('(tasks test corre una sola tarea, sin dependencias ni XComs de las anteriores, y no guarda nada)'));
          return { out: L.join('\n'), code: r.estado === 'failed' ? 1 : 0 };
        } catch (e) { return fail(e.message); }
      }
      if (c === 'state') { const r = A().runs(id).find((x) => !fecha || x.logical.startsWith(fecha) || x.run_id === fecha) || A().runs(id)[0]; return ok(r && r.tis[tid] ? String(r.tis[tid].state) : 'None'); }
      if (c === 'clear') { const r = A().runs(id)[0]; if (!r) return fail('No hay corridas'); const t = flag(a, '--task-regex', '-t'); const d = A().dag(id); const sel = t ? d.tasks.filter((x) => new RegExp(t).test(x.id)).map((x) => x.id) : null; if (!a.includes('-y') && !a.includes('--yes')) return ok(`You are about to delete these ${sel ? sel.length : d.tasks.length} task instances:\n${(sel || d.tasks.map((x) => x.id)).map((x) => `<TaskInstance: ${id}.${x} ${r.run_id}>`).join('\n')}\n\n${col.dim('Agrega --yes para confirmar.')}`); if (sel && sel.length === 1) A().limpiarRun(id, r.run_id, { tarea: sel[0] }); else A().limpiarRun(id, r.run_id); return ok('Cleared.'); }
      return fail('Usage: airflow tasks {list,test,state,clear}');
    }
    if (g === 'variables') {
      if (c === 'list') return ok(formato(a, ['key'], Object.keys(s.vars).map((k) => [k])));
      if (c === 'get') { if (!(p[0] in s.vars)) { if (flag(a, '--default', '-d') !== undefined) return ok(flag(a, '--default', '-d')); return fail(`Variable ${p[0]} does not exist`); } return ok(s.vars[p[0]]); }
      if (c === 'set') { if (p.length < 2) return fail('airflow variables set: error: the following arguments are required: key, VALUE'); A().setVar(p[0], p[1], flag(a, '--description')); return ok(`Variable ${p[0]} created`); }
      if (c === 'delete') { if (!(p[0] in s.vars)) return fail(`Variable ${p[0]} does not exist`); A().delVar(p[0]); return ok(`Variable ${p[0]} deleted`); }
      if (c === 'export') { const f = p[0]; const txt = JSON.stringify(s.vars, null, 4); if (f) { Sh.writeFile(Sh.norm(f), txt); return ok(`${Object.keys(s.vars).length} variables successfully exported to ${f}`); } return ok(txt); }
      if (c === 'import') { const f = p[0]; if (!f || !Sh.exists(Sh.norm(f))) return fail(`Missing variables file: ${f}`); try { const o = JSON.parse(Sh.readFile(Sh.norm(f))); for (const [k, v] of Object.entries(o)) A().setVar(k, typeof v === 'string' ? v : JSON.stringify(v)); return ok(`${Object.keys(o).length} of ${Object.keys(o).length} variables successfully updated.`); } catch (e) { return fail('Invalid variables file: ' + e.message); } }
      return fail('Usage: airflow variables {list,get,set,delete,import,export}');
    }
    if (g === 'connections') {
      if (c === 'list') return ok(formato(a, ['conn_id', 'conn_type', 'description', 'host', 'schema', 'login', 'port'], Object.entries(s.conns).map(([k, v]) => [k, v.conn_type, v.description || '', v.host || '', v.schema || '', v.login || '', v.port || ''])));
      if (c === 'get') { const v = s.conns[p[0]]; if (!v) return fail(`Connection not found.`); return ok(formato(a, ['id', 'conn_id', 'conn_type', 'host', 'schema', 'login', 'password', 'port', 'extra'], [[1, p[0], v.conn_type, v.host || '', v.schema || '', v.login || '', v.password ? '***' : '', v.port || '', v.extra || '']])); }
      if (c === 'delete') { if (!s.conns[p[0]]) return fail(`Did not find a connection with \`conn_id\`=${p[0]}`); A().delConn(p[0]); return ok(`Successfully deleted connection with \`conn_id\`=${p[0]}`); }
      if (c === 'add') {
        const id = p[0]; if (!id) return fail('airflow connections add: error: the following arguments are required: conn_id');
        if (s.conns[id]) return fail(`A connection with \`conn_id\`=${id} already exists.`);
        const uri = flag(a, '--conn-uri');
        let cfg = { conn_type: flag(a, '--conn-type'), host: flag(a, '--conn-host'), login: flag(a, '--conn-login'), password: flag(a, '--conn-password') ? '***' : '', schema: flag(a, '--conn-schema'), port: flag(a, '--conn-port') ? Number(flag(a, '--conn-port')) : null, extra: flag(a, '--conn-extra') || '', description: flag(a, '--conn-description') || '' };
        if (uri) { const m = uri.match(/^([\w-]+):\/\/(?:([^:@]*)(?::([^@]*))?@)?([^:/?]*)(?::(\d+))?(?:\/([^?]*))?/); if (!m) return fail('--conn-uri inválida. Ejemplo: postgresql://usuario:clave@host:5432/base'); cfg = Object.assign(cfg, { conn_type: m[1].replace('postgresql', 'postgres'), login: m[2] || '', password: m[3] ? '***' : '', host: m[4], port: m[5] ? Number(m[5]) : null, schema: m[6] || '' }); }
        if (!cfg.conn_type) return fail('Must supply either conn-uri or conn-type');
        A().setConn(id, cfg);
        return ok(`Successfully added \`conn_id\`=${id} : ${cfg.conn_type}://${cfg.login ? cfg.login + ':******@' : ''}${cfg.host || ''}${cfg.port ? ':' + cfg.port : ''}${cfg.schema ? '/' + cfg.schema : ''}${col.dim('\n(la contraseña no se guarda en la práctica: no uses credenciales reales)')}`);
      }
      return fail('Usage: airflow connections {list,get,add,delete}');
    }
    if (g === 'pools') {
      if (c === 'list') return ok(formato(a, ['pool', 'slots', 'description'], Object.entries(s.pools).map(([k, v]) => [k, v.slots, v.desc || ''])));
      if (c === 'set') { if (p.length < 3) return fail('airflow pools set: error: the following arguments are required: NAME, slots, description'); s.pools[p[0]] = { slots: Number(p[1]) || 1, desc: p[2] }; A().guardar(); return ok(`Pool ${p[0]} created`); }
      if (c === 'delete') { if (p[0] === 'default_pool') return fail('default_pool cannot be deleted'); delete s.pools[p[0]]; A().guardar(); return ok(`Pool ${p[0]} deleted`); }
      return fail('Usage: airflow pools {list,set,delete}');
    }
    return fail(`airflow command error: argument GROUP_OR_COMMAND: invalid choice: '${g}'. Prueba airflow --help`);
  });
})();
