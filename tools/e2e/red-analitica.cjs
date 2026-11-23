// Red Analítica: SFTP con clave, lago y Key Vault, vistas por laboratorio, silver seudonimizada, gold y derecho al olvido.
// El inicio del proyecto se corre 3,6 días hacia atrás para que ya hayan pasado todos los hitos (migración de Centro,
// reenvío del Sur, el día que Cerro no entregó y el pedido de borrado).
const { leer, bloques, lineas, ir, chequeos, afirmar, afirmarChequeos, desbloquear, correr } = require('./comun.cjs');
const GRUPOS = ['Seguridad', 'Acceso', 'SFTP', 'Datos', 'Privacidad', 'Gold'];

correr(async ({ p }) => {
  await ir(p, '/', 2500);
  await p.evaluate(async () => { await window.__cargarGrupo('proyectos'); const D = window.RedAnaliticaHost.datos(); D.inicio = Date.now() - 3.6 * 86400000; window.RedAnaliticaHost.guardar(); window.RedAnaliticaHost.sincronizar(); });
  await ir(p, '/l/proyecto-red-analitica-paso-a-paso', 4000);
  const md = leer('proyecto-red-analitica/06-paso-a-paso.md');
  const bash = bloques(md, 'bash').map(lineas), sql = bloques(md, 'sql norun');
  afirmar(bash.length === 3 && sql.length === 6, `la guía trae 3 bloques de bash y 6 de SQL (${bash.length} y ${sql.length})`);
  const r = await p.evaluate(async ({ bash, sql }) => {
    const log = { bash: [], sql: [] }; const S = window.__almacen(); const Host = window.RedAnaliticaHost; const RA = window.RedAnalitica; Host.sincronizar();
    await window.__discoListo();
    for (const bl of bash) for (const l of bl) {
      const x = await window.Shell.runLine(l, { autoLogin: true }); if (x.code) log.bash.push(`${l.slice(0, 60)} → ${String(x.out).slice(-160)}`);
      if (/alta-clave/.test(l)) { (Host.datos().claves || []).forEach((k) => { k.alta = 0; }); Host.guardar(); } // IT ya autorizó la clave
    }
    if (window.__cargarGrupo) await window.__cargarGrupo('databricks');
    await window.DBSQL.init({ Store: S }); await window.DBSQL.ejecutar("CREATE STORAGE CREDENTIAL IF NOT EXISTS credencial_lago WITH (AZURE_MANAGED_IDENTITY 'unity-catalog-access-connector')", { Store: S });
    const corre = async (s) => { const res = await window.DBSQL.ejecutar(s, { Store: S, limite: 1e7 }); const e = res.find((x) => x && x.ok === false); if (e) log.sql.push(String(e.error).slice(0, 200)); };
    for (let i = 0; i < 5; i++) await corre(sql[i]);
    log.antesOlvido = await (async () => { const f = window.__tableros.find((x) => x.clave === 'RA').chequeos().find((c) => c[0] === 'Datos'); const v = await f[2](); return v === true ? true : String(v); })();
    await corre(sql[5].replace("'30111222'", `'${RA.mundo().olvidado.doc}'`)); await corre(sql[4].split('\n\n--')[0]);
    const n = await window.DBSQL.ejecutar('SELECT count(*) FROM red.silver.resultados', { Store: S }); log.filas = n[0].filas[0][0];
    S.save(); window.Shell.Machine.save(); await new Promise((ok) => setTimeout(ok, 2500));
    return log;
  }, { bash, sql });
  afirmar(!r.bash.length, 'los comandos de la guía corren sin error' + (r.bash.length ? ': ' + r.bash.join(' | ') : ''));
  afirmar(!r.sql.length, 'el SQL de la guía corre sin error' + (r.sql.length ? ': ' + r.sql.join(' | ') : ''));
  afirmar(r.filas > 20000, `silver tiene volumen de empresa (${r.filas} resultados)`);
  afirmar(r.antesOlvido !== true && /borrado/.test(r.antesOlvido), 'antes del borrado, el chequeo detecta los datos de la persona que pidió el olvido');
  afirmarChequeos(await chequeos(p, 'RA'), GRUPOS, 'chequeo');
  const d = await desbloquear(p);
  afirmar(d.abiertas === d.total && d.total === 7, `los 7 candados de la guía se abren (${d.abiertas} de ${d.total})`);
  await p.reload(); await p.waitForTimeout(4000);
  afirmarChequeos(await chequeos(p, 'RA'), GRUPOS, 'tras recargar');
  afirmar((await p.locator('.solucion-abierta').count()) === 7, 'tras recargar, las soluciones siguen abiertas');
});
