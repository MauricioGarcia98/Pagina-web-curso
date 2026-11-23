// Conecta: la mesa de ayuda y el modelo de lenguaje con Python (clasificación en lotes, privacidad, SLA, asistente con
// RAG y su costo), las tablas en Databricks y los candados de la guía.
const { leer, bloques, lineas, ir, chequeos, afirmar, afirmarChequeos, desbloquear, correr } = require('./comun.cjs');
const GRUPOS = ['Seguridad', 'Privacidad', 'Clasificación', 'SLA', 'Asistente', 'Costo'];

correr(async ({ p }) => {
  await ir(p, '/l/proyecto-conecta-paso-a-paso', 4000);
  const md = leer('proyecto-conecta/05-paso-a-paso.md');
  const bash = bloques(md, 'bash').map(lineas); const py = bloques(md, 'python norun'); const sql = bloques(md, 'sql norun');
  const r = await p.evaluate(async ({ bash, py, sql }) => {
    const log = { bash: [], sql: [] }; const S = window.__almacen();
    if (window.ConectaHost && window.ConectaHost.sincronizar) window.ConectaHost.sincronizar();
    const M = window.ConectaMundo; const C = M.claves(); const hoy = M.diaLocal(M.ahora()); const desde = M.sumarDias(hoy, -2);
    await window.__discoListo();
    const rep = (l) => l.replace(/'mz_…'/g, `'${C.mesa}'`).replace(/'lum_…'/g, `'${C.llm}'`);
    const sh = async (l, avisar = true) => { const x = await window.Shell.runLine(rep(l), { autoLogin: true }); if (x.code && avisar) log.bash.push(`${l.slice(0, 60)} → ${String(x.out).slice(-200)}`); return x; };
    for (const l of bash[0]) await sh(l);
    window.Shell.writeFile(window.Shell.norm('~/conecta/cn.py'), py.join('\n'));
    await sh(`cd ~ && MESA=${C.mesa} LUMEN=${C.llm} DESDE=${desde} HOY=${hoy} python ~/conecta/cn.py`);
    for (const l of bash[2]) await sh(l);
    if (window.__cargarGrupo) await window.__cargarGrupo('databricks');
    await window.DBSQL.init({ Store: S }); await window.DBSQL.ejecutar("CREATE STORAGE CREDENTIAL IF NOT EXISTS credencial_lago WITH (AZURE_MANAGED_IDENTITY 'unity-catalog-access-connector')", { Store: S });
    { const res = await window.DBSQL.ejecutar(sql[0], { Store: S }); const e = res.find((x) => x && x.ok === false); if (e) log.sql.push(String(e.error).slice(0, 200)); }
    for (const l of bash[3]) await sh(l, false);
    S.save(); window.Shell.Machine.save(); await new Promise((ok) => setTimeout(ok, 2500));
    return log;
  }, { bash, py, sql });
  afirmar(!r.bash.length, 'los comandos y el script de la guía corren sin error' + (r.bash.length ? ': ' + r.bash.join(' | ') : ''));
  afirmar(!r.sql.length, 'el SQL de la guía corre sin error' + (r.sql.length ? ': ' + r.sql.join(' | ') : ''));
  afirmarChequeos(await chequeos(p, 'CN'), GRUPOS, 'chequeo');
  const d = await desbloquear(p);
  afirmar(d.abiertas === d.total && d.total >= 5, `los candados de la guía se abren (${d.abiertas} de ${d.total})${d.cerradas.length ? ': quedan ' + d.cerradas.join(', ') : ''}`);
  await p.reload(); await p.waitForTimeout(4000);
  afirmarChequeos(await chequeos(p, 'CN'), GRUPOS, 'tras recargar');
});
