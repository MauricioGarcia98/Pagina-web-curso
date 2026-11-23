// Almacenes del Sol: credenciales, las fotos del ERP y el punto de venta, silver con SCD tipo 2 y gold de ventas.
// El chequeo "Ventas" necesita una foto del ERP de un día anterior (el costo de cada día): en una sola sesión no se
// puede producir, así que esa solución tiene que quedar cerrada y el resto abrirse.
const { leer, bloques, lineas, ir, chequeos, afirmar, afirmarChequeos, desbloquear, correr } = require('./comun.cjs');

correr(async ({ p }) => {
  await ir(p, '/l/proyecto-almacenes-sol-paso-a-paso', 4000);
  const md = leer('proyecto-almacenes-sol/05-paso-a-paso.md');
  const bash = bloques(md, 'bash').map(lineas); const py = /```python norun\n(import requests[\s\S]*?)```/.exec(md)[1]; const sql = bloques(md, 'sql norun');
  const r = await p.evaluate(async ({ bash, py, sql }) => {
    const log = { bash: [], sql: [] }; const S = window.__almacen();
    if (window.AlmacenesSolHost && window.AlmacenesSolHost.sincronizar) window.AlmacenesSolHost.sincronizar();
    const M = window.AlmacenesSolMundo; const C = M.claves(); const hoy = M.diaLocal(M.ahora()); const desde = M.lunesDe(M.sumarDias(hoy, -7));
    await window.__discoListo();
    const rep = (l) => l.replace(/CLAVE/g, C.erp && C.erp.clave ? C.erp.clave : (C.erp || '')).replace("'Sol…'", `'${C.erp.clave || C.erp.password || ''}'`).replace("'pos_…'", `'${C.pos}'`);
    const sh = async (l, avisar = true) => { const x = await window.Shell.runLine(rep(l), { autoLogin: true }); if (x.code && avisar) log.bash.push(`${l.slice(0, 60)} → ${String(x.out).slice(-160)}`); };
    for (const bl of [bash[0], bash[1]]) for (const l of bl) await sh(l);
    window.Shell.writeFile(window.Shell.norm('~/sol.py'), py);
    await sh(`cd ~ && POS=${C.pos} DESDE=${desde} HOY=${hoy} python ~/sol.py`);
    for (const bl of [bash[3], bash[4]]) for (const l of bl) await sh(l);
    if (window.__cargarGrupo) await window.__cargarGrupo('databricks');
    await window.DBSQL.init({ Store: S }); await window.DBSQL.ejecutar("CREATE STORAGE CREDENTIAL IF NOT EXISTS credencial_lago WITH (AZURE_MANAGED_IDENTITY 'unity-catalog-access-connector')", { Store: S });
    await sh(`mv ~/sol/erp/productos_${hoy}.csv ~/sol/erp/productos_${desde}.csv`); await sh('az storage blob upload-batch --account-name stsol -d landing/sol -s ~/sol --overwrite');
    for (const s of sql.slice(0, 4)) { const res = await window.DBSQL.ejecutar(s.replace("'2026-11-16'", `'${desde}'`), { Store: S }); const e = res.find((x) => x && x.ok === false); if (e) log.sql.push(String(e.error).slice(0, 200)); }
    for (const l of bash[5]) await sh(l, false);
    S.save(); window.Shell.Machine.save(); await new Promise((ok) => setTimeout(ok, 2500));
    return log;
  }, { bash, py, sql });
  afirmar(!r.bash.length, 'los comandos y el script de la guía corren sin error' + (r.bash.length ? ': ' + r.bash.join(' | ') : ''));
  afirmar(!r.sql.length, 'el SQL de la guía corre sin error' + (r.sql.length ? ': ' + r.sql.join(' | ') : ''));
  const res = await chequeos(p, 'AS');
  afirmarChequeos(res, ['Seguridad', 'SCD2'], 'chequeo');
  afirmar(res.some((x) => x[0] === 'Ventas' && /foto del ERP/.test(String(x[2]))), 'Ventas pide una foto del ERP de un día anterior (lo esperado en una sola sesión)');
  const d = await desbloquear(p);
  const mal = d.detalle.filter(([k, ok]) => !/Ventas/.test(k) && !ok).map(([k]) => k);
  afirmar(!mal.length, `se abren todas las soluciones salvo las de Ventas${mal.length ? ' (quedaron cerradas: ' + mal.join(', ') + ')' : ''}`);
  await p.reload(); await p.waitForTimeout(4000);
  afirmarChequeos(await chequeos(p, 'AS'), ['Seguridad', 'SCD2'], 'tras recargar');
});
