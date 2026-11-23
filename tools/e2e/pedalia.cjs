// Pedalia: exportar dos días, el lago en Azure, bronze/silver/gold en Databricks, la exportación, Snowflake y BigQuery,
// con el código de las soluciones de las lecciones 04, 06, 07 y 08. Después, la revisión del modelo de Power BI de la
// lección 10 (con un modelo armado como lo armaría el estudiante) y los candados de las lecciones 06 y 10.
// La copia de Data Factory (landing → bronze) se hace con la CLI: el pipeline del Studio se prueba en la prueba de humo.
const { leer, bloques, lineas, ir, chequeos, afirmar, afirmarChequeos, desbloquear, correr } = require('./comun.cjs');
const GRUPOS = ['Los datos', 'Azure', 'Lago en Databricks', 'Silver', 'Gold', 'Snowflake', 'BigQuery'];

correr(async ({ p }) => {
  await ir(p, '/l/proyecto-pedalia-bronze-y-silver-en-databricks', 4000);
  const az = bloques(leer('proyecto-pedalia/04-el-lago-en-azure.md'), 'bash'); // cada bloque entero, como al pegarlo en la terminal (tiene un for … done)
  const sql6 = bloques(leer('proyecto-pedalia/06-bronze-y-silver-en-databricks.md'), 'sql norun');
  const sql7 = bloques(leer('proyecto-pedalia/07-gold-y-exportacion.md'), 'sql norun');
  const l08 = leer('proyecto-pedalia/08-snowflake-y-bigquery.md'); const sas = lineas(bloques(l08, 'bash')[0]).join(' '); const sql8 = bloques(l08, 'sql norun');
  const r = await p.evaluate(async ({ az, sql6, sql7, sas, sql8 }) => {
    const log = { bash: [], sql: [] }; const S = window.__almacen(); await window.__discoListo();
    const sh = async (l) => { const x = await window.Shell.runLine(l, { autoLogin: true }); if (x.code) log.bash.push(`${l.slice(0, 60)} → ${String(x.out).slice(-160)}`); return String(x.out); };
    await sh('pedalia exportar --dia 1'); await sh('pedalia exportar --dia 2');
    log.filas = Number((await sh('wc -l ~/pedalia/entrega/2026-11-09/viajes_2026-11-09.csv')).trim().split(/\s+/)[0]);
    for (const bl of az) await sh(bl);
    await sh('az storage blob upload-batch --account-name stpedaliadev -d landing/pedalia/2026-11-10 -s ~/pedalia/entrega/2026-11-10');
    for (const f of ['2026-11-09', '2026-11-10']) await sh(`az storage blob upload --account-name stpedaliadev -c bronze -n pedalia/viajes/${f}/viajes_${f}.csv -f ~/pedalia/entrega/${f}/viajes_${f}.csv`);
    if (window.__cargarGrupo) await window.__cargarGrupo('databricks');
    await window.DBSQL.init({ Store: S }); await window.DBSQL.ejecutar("CREATE STORAGE CREDENTIAL IF NOT EXISTS credencial_lago WITH (AZURE_MANAGED_IDENTITY 'unity-catalog-access-connector')", { Store: S });
    for (const s of [...sql6, ...sql7]) { const res = await window.DBSQL.ejecutar(s, { Store: S, limite: 1e7 }); const e = res.find((x) => x && x.ok === false); if (e) log.sql.push(String(e.error).slice(0, 200)); }
    const tok = (await sh(sas)).trim().split('\n').pop().replace(/^\?/, '');
    if (window.__cargarGrupo) await window.__cargarGrupo('snowflake');
    const M = window.SnowflakeMotor; M.conectar(S);
    for (const q of sql8.slice(0, 2)) { const rr = await M.ejecutar(q.replace('<TOKEN>', tok)); const e = (rr || []).find((x) => x && (x.error || x.estado === 'Failed')); if (e) log.sql.push('Snowflake: ' + String(e.error || e.mensaje).slice(0, 200)); }
    if (window.__cargarGrupo) await window.__cargarGrupo('bigquery');
    const B = window.BigQueryMotor; B.conectar(S);
    { const rr = await B.ejecutar(sql8.find((q) => /pedalia_mkt/.test(q))); const e = (rr || []).find((x) => x && x.error); if (e) log.sql.push('BigQuery: ' + String(e.error).slice(0, 200)); }
    S.save(); window.Shell.Machine.save(); await new Promise((ok) => setTimeout(ok, 3000));
    return log;
  }, { az, sql6, sql7, sas, sql8 });
  afirmar(!r.bash.length, 'los comandos de las soluciones corren sin error' + (r.bash.length ? ': ' + r.bash.join(' | ') : ''));
  afirmar(!r.sql.length, 'el SQL de las soluciones corre sin error' + (r.sql.length ? ': ' + r.sql.join(' | ') : ''));
  afirmar(r.filas > 4000, `la exportación de un día tiene volumen de empresa (${r.filas} líneas)`);
  afirmarChequeos(await chequeos(p, 'PD'), GRUPOS, 'chequeo');
  let d = await desbloquear(p);
  afirmar(d.abiertas === d.total && d.total === 6, `los 6 candados de la lección 06 se abren (${d.abiertas} de ${d.total})`);

  // lección 10: la revisión del modelo de Power BI, primero con errores típicos y después bien armado
  const pbi = await p.evaluate(async (medidas) => {
    const S = window.__almacen(); const f = window.__tableros.find((x) => x.clave === 'PD').chequeos().find((c) => c[0] === 'Modelo de Power BI')[2];
    const t = (n) => ({ fuente: { tipo: 'snowflake', tabla: n }, pasos: [], calc: [], resumen: {} });
    const base = () => ({ version: 2, tablas: { INGRESOS_DIARIOS: t('INGRESOS_DIARIOS'), uso_por_barrio: t('uso_por_barrio'), viajes_por_estacion: t('viajes_por_estacion'), Calendario: { fuente: { tipo: 'dax', expr: 'CALENDAR(DATE(2026, 11, 1), DATE(2026, 11, 30))' }, pasos: [], calc: [], resumen: {} } }, tablaFechas: { t: 'Calendario', c: 'Date' }, rels: [{ de: 'INGRESOS_DIARIOS', cde: 'FECHA', a: 'Calendario', ca: 'Date', activa: true, direccion: 'unica' }, { de: 'uso_por_barrio', cde: 'fecha', a: 'Calendario', ca: 'Date', activa: true, direccion: 'unica' }, { de: 'viajes_por_estacion', cde: 'fecha', a: 'Calendario', ca: 'Date', activa: true, direccion: 'unica' }], medidas });
    const caso = async (mod) => { const m = base(); mod(m); S.data.powerbi = m; const v = await f(); return v === true ? true : String(v); };
    const out = {};
    out.sinCalendario = await caso((m) => { delete m.tablas.Calendario; });
    out.sinMarcar = await caso((m) => { delete m.tablaFechas; });
    out.directa = await caso((m) => { m.rels.push({ de: 'uso_por_barrio', cde: 'fecha', a: 'INGRESOS_DIARIOS', ca: 'FECHA', activa: true, direccion: 'unica' }); });
    out.sinDivide = await caso((m) => { m.medidas = m.medidas.map((x) => ({ ...x, expr: x.expr.replace(/DIVIDE\(([^,]+), ([^)]+\))\)/, '$1 / $2') })); });
    out.bien = await caso(() => {});
    S.save(); return out;
  }, bloques(leer('proyecto-pedalia/10-el-tablero-en-power-bi.md'), 'text').find((b) => /^Ingresos =/.test(b)).split('\n').map((l) => { const i = l.indexOf(' = '); return { nombre: l.slice(0, i), expr: l.slice(i + 3), tabla: '' }; }));
  afirmar(/tabla de fechas/.test(pbi.sinCalendario), 'Power BI: detecta que falta el calendario');
  afirmar(/Marca/.test(pbi.sinMarcar), 'Power BI: detecta el calendario sin marcar como tabla de fechas');
  afirmar(/relación directa/.test(pbi.directa), 'Power BI: detecta una relación directa entre dos fuentes');
  afirmar(/DIVIDE/.test(pbi.sinDivide), 'Power BI: detecta el porcentaje sin DIVIDE');
  afirmar(pbi.bien === true, 'Power BI: aprueba el modelo de la solución' + (pbi.bien === true ? '' : ' → ' + pbi.bien));
  await ir(p, '/l/proyecto-pedalia-el-tablero-en-power-bi', 3500);
  d = await desbloquear(p);
  afirmar(d.abiertas === d.total && d.total === 2, `los 2 candados de la lección 10 se abren (${d.abiertas} de ${d.total})`);

  await p.reload(); await p.waitForTimeout(4000);
  afirmarChequeos(await chequeos(p, 'PD'), ['Azure', 'Silver', 'Gold', 'Modelo de Power BI'], 'tras recargar, sin abrir la terminal');
});
