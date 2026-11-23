// Ruta Sur: credenciales al Key Vault, el plan del TMS con Python, la telemetría de Event Hubs con una STREAMING
// TABLE (read_kafka), silver normalizada (dos firmwares, reintentos) y gold con el SLA de cada entrega.
const { leer, bloques, lineas, ir, chequeos, afirmar, afirmarChequeos, desbloquear, correr } = require('./comun.cjs');
const GRUPOS = ['Seguridad', 'Streaming', 'SLA'];

correr(async ({ p }) => {
  await ir(p, '/l/proyecto-ruta-sur-paso-a-paso', 4000);
  const md = leer('proyecto-ruta-sur/06-paso-a-paso.md');
  const bash1 = lineas(/```bash\n(ruta accesos[\s\S]*?)```/.exec(md)[1]);
  const py = bloques(md, 'python norun')[0]; const sql = bloques(md, 'sql norun');
  const r = await p.evaluate(async ({ bash1, py, sql }) => {
    const log = { bash: [], sql: [] }; const S = window.__almacen(); window.RutaSurHost.sincronizar(); const C = window.RutaSurMundo.claves(); const hoy = window.RutaSurMundo.diaLocal(window.RutaSurMundo.ahora());
    await window.__discoListo();
    const sh = async (l) => { const x = await window.Shell.runLine(l.replace("'Endpoint=sb://…'", JSON.stringify(C.eh.cs)).replace("--value '…'", `--value '${C.api}'`), { autoLogin: true }); if (x.code) log.bash.push(`${l.slice(0, 60)} → ${String(x.out).slice(-160)}`); };
    for (const l of bash1) await sh(l);
    window.Shell.writeFile(window.Shell.norm('~/plan.py'), py);
    await sh(`cd ~ && RS_KEY=${C.api} HOY=${hoy} python ~/plan.py`);
    await sh('az storage blob upload --account-name strutasur -c landing -n tms/plan.jsonl -f ~/plan.jsonl --overwrite');
    if (window.__cargarGrupo) await window.__cargarGrupo('databricks');
    await window.DBSQL.init({ Store: S }); await window.DBSQL.ejecutar("CREATE STORAGE CREDENTIAL IF NOT EXISTS credencial_lago WITH (AZURE_MANAGED_IDENTITY 'unity-catalog-access-connector')", { Store: S });
    for (const s of sql.slice(0, 4)) { const res = await window.DBSQL.ejecutar(s.replace('password="Endpoint=sb://…"', `password="${C.eh.cs}"`), { Store: S }); const e = res.find((x) => x && x.ok === false); if (e) log.sql.push(String(e.error).slice(0, 200)); }
    const n = await window.DBSQL.ejecutar('SELECT count(*) FROM ruta.silver.telemetria', { Store: S }); log.eventos = n[0].filas[0][0];
    S.save(); window.Shell.Machine.save(); await new Promise((ok) => setTimeout(ok, 2500));
    return log;
  }, { bash1, py, sql });
  afirmar(!r.bash.length, 'los comandos y el script de la guía corren sin error' + (r.bash.length ? ': ' + r.bash.join(' | ') : ''));
  afirmar(!r.sql.length, 'el SQL de la guía corre sin error' + (r.sql.length ? ': ' + r.sql.join(' | ') : ''));
  afirmar(r.eventos > 50000, `silver tiene la telemetría de la flota (${r.eventos} eventos)`);
  afirmarChequeos(await chequeos(p, 'RS'), GRUPOS, 'chequeo');
  const d = await desbloquear(p);
  afirmar(d.abiertas === d.total && d.total >= 3, `los candados de la guía se abren (${d.abiertas} de ${d.total})${d.cerradas.length ? ': quedan ' + d.cerradas.join(', ') : ''}`);
  await p.reload(); await p.waitForTimeout(4000);
  afirmarChequeos(await chequeos(p, 'RS'), GRUPOS, 'tras recargar');
});
