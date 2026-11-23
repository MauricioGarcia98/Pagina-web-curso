// Mercado Vecino: lago, Key Vault y webhook; snapshot de PostgreSQL + CDC con MERGE; PagoYa (API, webhooks firmados,
// liquidaciones) y la conciliación. El inicio se corre 3,6 días (cupones y rotación del secreto ya pasaron) y el
// webhook se da de alta 30 horas antes, para que haya entregas en el lago.
const { leer, bloques, lineas, ir, chequeos, afirmar, afirmarChequeos, desbloquear, correr } = require('./comun.cjs');
const GRUPOS = ['Seguridad', 'Webhook', 'CDC', 'Olvido', 'PagoYa', 'Conciliación'];

correr(async ({ p }) => {
  await ir(p, '/', 2500);
  await p.evaluate(() => { const D = window.MercadoVecinoHost.datos(); D.inicio = Date.now() - 3.6 * 86400000; window.MercadoVecinoHost.guardar(); window.MercadoVecinoHost.sincronizar(); });
  await ir(p, '/l/proyecto-mercado-vecino-paso-a-paso', 4000);
  const md = leer('proyecto-mercado-vecino/06-paso-a-paso.md');
  const bash = bloques(md, 'bash').map(lineas), sql = bloques(md, 'sql norun'), py = bloques(md, 'python norun');
  afirmar(bash.length === 5 && sql.length === 8 && py.length === 2, `la guía trae 5 bloques de bash, 8 de SQL y 2 de Python (${bash.length}, ${sql.length}, ${py.length})`);
  const r = await p.evaluate(async ({ bash, sql, py }) => {
    const log = { bash: [], sql: [] }; const S = window.__almacen(); const Host = window.MercadoVecinoHost; const MV = window.MercadoVecinoMundo; Host.sincronizar(); const C = MV.claves();
    await window.__discoListo();
    // los "…" de la guía son las credenciales del correo de accesos
    const sub = (l) => l.replace("pg-clave --value '…'", `pg-clave --value '${C.pg.clave}'`).replace("--value 'sk_…'", `--value '${C.pagoya}'`).replace("--value 'whsec_…'", `--value '${C.webhook}'`).replace("PGPASSWORD='…'", `PGPASSWORD='${C.pg.clave}'`).replace('sasl.password=Endpoint=sb://…', 'sasl.password=' + C.eh.cs).replace('PAGOYA_SK=sk_…', 'PAGOYA_SK=' + C.pagoya).replace('PAGOYA_WH=whsec_nuevo,whsec_viejo', `PAGOYA_WH=${C.webhook},${C.webhookAnterior || ''}`);
    for (const bl of bash) {
      if (bl.some((l) => /python ~\/mv\/pagoya\.py/.test(l))) window.Shell.writeFile(window.Shell.norm('~/mv/pagoya.py'), py[0]);
      for (const l of bl) {
        const x = await window.Shell.runLine(sub(l), { autoLogin: true }); if (x.code) log.bash.push(`${l.slice(0, 60)} → ${String(x.out).slice(-160)}`);
        if (/webhooks configurar/.test(l)) { const W = Host.datos().webhook; W.alta = Date.now() - 30 * 3600e3; W.hasta = null; Host.guardar(); log.webhooks = window.MercadoVecinoTerminal.sincronizarWebhooks(); }
      }
    }
    if (window.__cargarGrupo) await window.__cargarGrupo('databricks');
    await window.DBSQL.init({ Store: S }); await window.DBSQL.ejecutar("CREATE STORAGE CREDENTIAL IF NOT EXISTS credencial_lago WITH (AZURE_MANAGED_IDENTITY 'unity-catalog-access-connector')", { Store: S });
    for (const s of sql) { const res = await window.DBSQL.ejecutar(s.replace(/password="Endpoint=sb:\/\/…"/g, `password="${C.eh.cs}"`), { Store: S, limite: 1e7 }); const e = res.find((x) => x && x.ok === false); if (e) log.sql.push(String(e.error).slice(0, 200)); }
    const n = await window.DBSQL.ejecutar('SELECT count(*) FROM mercado.silver.pedidos', { Store: S }); log.pedidos = n[0].filas[0][0];
    S.save(); window.Shell.Machine.save(); await new Promise((ok) => setTimeout(ok, 3000));
    return log;
  }, { bash, sql, py });
  afirmar(!r.bash.length, 'los comandos de la guía corren sin error' + (r.bash.length ? ': ' + r.bash.join(' | ') : ''));
  afirmar(!r.sql.length, 'el SQL de la guía corre sin error' + (r.sql.length ? ': ' + r.sql.join(' | ') : ''));
  afirmar(r.webhooks > 300, `llegaron webhooks al lago (${r.webhooks})`);
  afirmar(r.pedidos > 14000, `silver tiene volumen de marketplace (${r.pedidos} pedidos)`);
  afirmarChequeos(await chequeos(p, 'MV'), GRUPOS, 'chequeo');
  const d = await desbloquear(p);
  afirmar(d.abiertas === d.total && d.total === 7, `los 7 candados de la guía se abren (${d.abiertas} de ${d.total})`);
  await p.reload(); await p.waitForTimeout(5000);
  afirmarChequeos(await chequeos(p, 'MV'), GRUPOS, 'tras recargar');
});
