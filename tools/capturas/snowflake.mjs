// Guion de capturas del curso de Snowflake (assets/img/guias/snowflake/)
// Historia: el equipo de datos de Tienda Andina arma su warehouse en Snowflake: hojas SQL, warehouses, bases y
// esquemas, cargas desde stages, JSON, MERGE, Time Travel, clones, roles, permisos y costos.
export default async function (c) {
  const p = c.page;
  const w = (ms) => c.espera(ms);
  const log = (...a) => console.log('   [snowflake]', ...a);
  const HASTA = Number(process.env.SF_HASTA || 99);
  const ir = async (h, ms = 900) => { await p.evaluate((x) => { location.hash = x; }, h); await w(ms); };
  const listo = () => p.waitForFunction(() => !document.querySelector('#sfRes .sf-spin'), null, { timeout: 120000 });
  // abre una hoja nueva con un título y un SQL
  const hoja = async (titulo, sql) => {
    await ir('#/snowflake', 900);
    await p.click('#sfNueva'); await p.waitForSelector('.CodeMirror', { timeout: 60000 }); await w(1200);
    await p.fill('#sfTit', titulo); await p.dispatchEvent('#sfTit', 'change');
    await escribir(sql);
  };
  const escribir = async (sql) => { await p.evaluate((x) => { const cm = document.querySelector('.CodeMirror').CodeMirror; cm.setValue(x); cm.setCursor(cm.lineCount(), 0); }, sql); await w(300); };
  const todo = async (ms = 600) => { await p.click('#sfRunAll'); await w(300); await listo(); await w(ms); };
  const actual = async (ms = 600) => { await p.click('#sfRun'); await w(300); await listo(); await w(ms); };
  const sql = (q) => p.evaluate(async (x) => { const rs = await window.SnowflakeMotor.ejecutar(x); const r = rs[rs.length - 1]; return r.error ? 'ERR ' + r.error.message : r.qid; }, q);
  const qid = () => p.evaluate(() => { const e = document.querySelector('.sf-det code'); return e ? e.textContent.trim() : ''; });
  const abrirNodo = async (k) => { const ab = await p.evaluate((x) => !!((window.SnowflakeMotor.st().abiertos || {})[x]), k); if (!ab) { await p.click(`#sfArbol [data-k="${k}"]`).catch(() => log('sin nodo', k)); await w(500); } };
  const cerrarNodo = async (k) => { const ab = await p.evaluate((x) => !!((window.SnowflakeMotor.st().abiertos || {})[x]), k); if (ab) { await p.click(`#sfArbol [data-k="${k}"]`).catch(() => {}); await w(500); } };
  const archivo = (nombre, texto) => ({ name: nombre, mimeType: 'text/csv', buffer: Buffer.from(texto) });

  await c.ir('#/snowflake', '.sfp'); await w(1500);
  await p.evaluate(async () => { await window.SnowflakeMotor.init(); }); await w(500);

  // ================================================================ Nivel 1 · lección 1: qué es Snowflake y Snowsight
  await ir('#/snowflake', 900);
  await c.foto('s01-home', { marcas: [['.sf-nav', '1'], ['.sf-aviso', '2'], ['.sf-acciones', '3']] });
  await p.click('#sfCrear'); await w(300);
  await c.foto('s01-crear', { marcas: [['#sfPop', null]] });
  await p.evaluate(() => { document.getElementById('sfPop').hidden = true; });
  if (HASTA <= 1) return;

  // ================================================================ lección 2: hojas SQL y contexto
  await hoja('Pedidos por canal', `-- Pedidos de la tienda por canal de venta
SELECT canal, COUNT(*) AS pedidos
FROM pedidos
GROUP BY canal
ORDER BY pedidos DESC;`);
  await c.foto('s02-hoja', { marcas: [['#sfTit', '1'], ['#sfCtxRol', '2'], ['#sfCtxDb', '3'], ['#sfRun', '4'], ['#sfArbol', '5']] });
  await actual(800);
  await c.foto('s02-resultado', { marcas: [['.sf-grid-caja', '1'], ['.sf-det', '2']] });
  await p.click('#sfCtxRol'); await w(400);
  await c.foto('s02-contexto', { marcas: [['#sfMenu', null]] });
  await p.evaluate(() => { document.getElementById('sfMenu').hidden = true; });
  if (HASTA <= 2) return;

  // ================================================================ lección 3: explorar datos
  await ir('#/snowflake/datos', 1500);
  await c.foto('s03-databases', { marcas: [['#sfArbol', '1'], ['#sfDet', '2']] });
  await ir('#/snowflake/datos/TIENDA_ANDINA/PUBLIC/PEDIDOS', 1500);
  await c.foto('s03-columnas', { marcas: [['.sf-tabs', '1'], ['#sfTab', '2']] });
  await p.click('.sf-tabs [data-tab="prev"]'); await w(1500);
  await c.foto('s03-preview', { marcas: [['#sfTab', null]] });
  if (HASTA <= 3) return;

  // ================================================================ lección 4 (proyecto): ventas por país
  await hoja('Ventas por país', `SELECT c.pais,
       COUNT(DISTINCT p.pedido_id) AS pedidos,
       ROUND(SUM(d.cantidad * d.precio_unitario), 2) AS ventas
FROM pedidos p
JOIN clientes c ON c.cliente_id = p.cliente_id
JOIN detalle_pedidos d ON d.pedido_id = p.pedido_id
WHERE p.estado = 'entregado'
GROUP BY c.pais
ORDER BY ventas DESC;`);
  await actual(800);
  await c.foto('s04-ventas', { marcas: [['#sfEd', '1'], ['.sf-grid-caja', '2']] });
  await escribir('SELECT pais, COUNT(*) FROM pedido GROUP BY pais;');
  await actual(500);
  await c.foto('s04-error', { marcas: [['.sf-err-caja', null]] });
  if (HASTA <= 4) return;

  // ================================================================ Nivel 2 · lección 5: warehouses
  await ir('#/snowflake/warehouses', 900);
  await p.click('#sfNuevoWh'); await w(400);
  await p.fill('#whN', 'ANALISIS_WH'); await p.selectOption('#whS', '60'); await p.dispatchEvent('#whS', 'input'); await w(200);
  await c.foto('s05-nuevo', { marcas: [['#sfModal .sf-modal-c', null]] });
  await p.click('#whOk'); await w(800);
  await c.foto('s05-lista', { marcas: [['.sf-kpis', '1'], ['.sf-tabla', '2']] });
  await hoja('Warehouses', `USE WAREHOUSE analisis_wh;
ALTER WAREHOUSE analisis_wh SET WAREHOUSE_SIZE = 'SMALL';
SHOW WAREHOUSES;`);
  await todo(800);
  await c.foto('s05-alter', { marcas: [['#sfCtxRol', '1'], ['.sf-grid-caja', '2']] });
  await sql("ALTER WAREHOUSE analisis_wh SET WAREHOUSE_SIZE = 'XSMALL'");
  if (HASTA <= 5) return;

  // ================================================================ lección 6: bases, esquemas y tablas
  await hoja('Entorno de desarrollo', `CREATE DATABASE tienda_dev;
CREATE SCHEMA tienda_dev.raw;
CREATE SCHEMA tienda_dev.analitica;
USE SCHEMA tienda_dev.analitica;

CREATE TABLE ventas_por_canal AS
SELECT canal, COUNT(*) AS pedidos
FROM tienda_andina.public.pedidos
GROUP BY canal;

SELECT * FROM ventas_por_canal ORDER BY pedidos DESC;`);
  await todo(1200);
  await cerrarNodo('TIENDA_ANDINA');
  await abrirNodo('TIENDA_DEV'); await abrirNodo('TIENDA_DEV.ANALITICA'); await abrirNodo('TIENDA_DEV.RAW');
  await c.foto('s06-crear', { marcas: [['#sfArbol', '1'], ['#sfCtxDb', '2'], ['.sf-res-varias', '3']] });
  await ir('#/snowflake/datos/TIENDA_DEV/ANALITICA/VENTAS_POR_CANAL', 1500);
  await c.foto('s06-tabla', { marcas: [['.sf-miga', '1'], ['#sfTab', '2']] });
  if (HASTA <= 6) return;

  // ================================================================ lección 7: historial de consultas
  await ir('#/snowflake/historial', 900);
  await c.foto('s07-historial', { marcas: [['.sf-filtros', '1'], ['.sf-hist', '2']] });
  await ir('#/snowflake/historial/fallidas', 900);
  await c.foto('s07-fallidas', { marcas: [['.sf-hist', null]] });
  await p.click('.sf-hist tbody tr').catch(() => log('sin fila de historial')); await w(500);
  await c.foto('s07-detalle', { marcas: [['#sfModal .sf-modal-c', null]] });
  if (HASTA <= 7) return;

  // ================================================================ lección 8 (proyecto): un entorno propio
  await hoja('Mi entorno', `SHOW WAREHOUSES;
SHOW SCHEMAS IN DATABASE tienda_dev;`);
  await todo(800);
  await c.foto('s08-esquemas', { marcas: [['.sf-grid-caja', null]] });
  await escribir('SHOW WAREHOUSES;');
  await todo(800);
  await c.foto('s08-warehouses', { marcas: [['.sf-grid-caja', null]] });
  if (HASTA <= 8) return;

  // ================================================================ Nivel 3 · lección 9: stages y COPY INTO
  const CSV1 = ['pedido_id,cliente_id,fecha,canal,total', '90001,5,2026-11-14,web,120.50', '90002,8,2026-11-14,app,80.00', '90003,5,2026-11-14,tienda,45.90', '90004,12,2026-11-14,web,310.00', '90005,21,2026-11-14,app,59.99'].join('\n') + '\n';
  const CSV2 = ['pedido_id,cliente_id,fecha,canal,total', '90002,8,2026-11-14,app,95.00', '90006,33,2026-11-15,web,150.00', '90007,5,2026-11-15,tienda,22.40'].join('\n') + '\n';
  await hoja('Carga de pedidos', `USE SCHEMA tienda_dev.raw;
CREATE STAGE carga_pedidos;`);
  await todo(800);
  await ir('#/snowflake/datos/stage/CARGA_PEDIDOS', 1500);
  await p.setInputFiles('#sfSubir', archivo('pedidos_2026_11_14.csv', CSV1)); await w(1200);
  await c.foto('s09-stage', { marcas: [['.sf-cab', '1'], ['.sf-tabla', '2']] });
  await hoja('Carga de pedidos', `USE SCHEMA tienda_dev.raw;
LIST @carga_pedidos;`);
  await todo(800);
  await c.foto('s09-list', { marcas: [['.sf-grid-caja', null]] });
  await escribir(`USE SCHEMA tienda_dev.raw;
CREATE TABLE pedidos_staging (
  pedido_id INT, cliente_id INT, fecha DATE, canal VARCHAR, total NUMBER(10,2)
);
COPY INTO pedidos_staging FROM @carga_pedidos;`);
  await todo(800);
  await c.foto('s09-error', { marcas: [['.sf-err-caja', null]] });
  await escribir(`USE SCHEMA tienda_dev.raw;
COPY INTO pedidos_staging
FROM @carga_pedidos
FILE_FORMAT = (TYPE = CSV SKIP_HEADER = 1);`);
  await todo(800);
  await c.foto('s09-copy', { marcas: [['#sfEd', '1'], ['.sf-grid-caja', '2']] });
  if (HASTA <= 9) return;

  // ================================================================ lección 10: JSON y VARIANT
  await hoja('Eventos web (JSON)', `USE SCHEMA tienda_dev.raw;
CREATE TABLE eventos_web (datos VARIANT);
INSERT INTO eventos_web
SELECT PARSE_JSON('{"evento":"compra","cliente":{"id":5,"pais":"PE"},"items":[{"sku":"A1","cant":2},{"sku":"B7","cant":1}]}')
UNION ALL SELECT PARSE_JSON('{"evento":"compra","cliente":{"id":8,"pais":"CO"},"items":[{"sku":"C3","cant":4}]}')
UNION ALL SELECT PARSE_JSON('{"evento":"visita","cliente":{"id":12,"pais":"MX"},"items":[]}');

SELECT datos:evento::string       AS evento,
       datos:cliente.id::int       AS cliente_id,
       datos:cliente.pais::string  AS pais
FROM eventos_web;`);
  await todo(1000);
  await c.foto('s10-rutas', { marcas: [['#sfEd', '1'], ['.sf-grid-caja', '2']] });
  await escribir(`USE SCHEMA tienda_dev.raw;
SELECT e.datos:cliente.pais::string AS pais,
       f.value:sku::string          AS sku,
       f.value:cant::int            AS cantidad,
       f.index                      AS posicion
FROM eventos_web e,
     LATERAL FLATTEN(input => e.datos:items) f;`);
  await todo(1000);
  await c.foto('s10-flatten', { marcas: [['#sfEd', '1'], ['.sf-grid-caja', '2']] });
  if (HASTA <= 10) return;

  // ================================================================ lección 11: MERGE
  await hoja('Pedidos actuales (MERGE)', `USE SCHEMA tienda_dev.analitica;
CREATE TABLE pedidos_actuales AS
SELECT * FROM tienda_dev.raw.pedidos_staging;

-- llega una corrección del pedido 90002 y un pedido nuevo
MERGE INTO pedidos_actuales t
USING (SELECT 90002 AS pedido_id, 8 AS cliente_id, '2026-11-14'::date AS fecha, 'app' AS canal, 95.00 AS total
       UNION ALL
       SELECT 90006, 33, '2026-11-15'::date, 'web', 150.00) s
ON t.pedido_id = s.pedido_id
WHEN MATCHED THEN UPDATE SET total = s.total
WHEN NOT MATCHED THEN INSERT (pedido_id, cliente_id, fecha, canal, total)
                      VALUES (s.pedido_id, s.cliente_id, s.fecha, s.canal, s.total);`);
  await todo(1000);
  await c.foto('s11-merge', { marcas: [['#sfEd', '1'], ['.sf-grid-caja', '2']] });
  await escribir('USE SCHEMA tienda_dev.analitica;\nSELECT * FROM pedidos_actuales ORDER BY pedido_id;');
  await todo(800);
  await c.foto('s11-resultado', { marcas: [['.sf-grid-caja', null]] });
  if (HASTA <= 11) return;

  // ================================================================ lección 12 (proyecto): carga incremental
  await ir('#/snowflake/datos/stage/CARGA_PEDIDOS', 1500);
  await p.setInputFiles('#sfSubir', archivo('pedidos_2026_11_15.csv', CSV2)); await w(1200);
  await hoja('Carga incremental', `USE SCHEMA tienda_dev.raw;
-- COPY INTO recuerda qué archivos ya cargó: solo toma el nuevo
COPY INTO pedidos_staging
FROM @carga_pedidos
FILE_FORMAT = (TYPE = CSV SKIP_HEADER = 1);`);
  await todo(1000);
  await c.foto('s12-copy', { marcas: [['.sf-grid-caja', null]] });
  await escribir(`USE SCHEMA tienda_dev.analitica;
MERGE INTO pedidos_actuales t
USING (SELECT * FROM tienda_dev.raw.pedidos_staging
       QUALIFY ROW_NUMBER() OVER (PARTITION BY pedido_id ORDER BY total DESC) = 1) s
ON t.pedido_id = s.pedido_id
WHEN MATCHED AND t.total <> s.total THEN UPDATE SET total = s.total
WHEN NOT MATCHED THEN INSERT (pedido_id, cliente_id, fecha, canal, total)
                      VALUES (s.pedido_id, s.cliente_id, s.fecha, s.canal, s.total);`);
  await todo(1000);
  await c.foto('s12-merge', { marcas: [['#sfEd', '1'], ['.sf-grid-caja', '2']] });
  await escribir('USE SCHEMA tienda_dev.analitica;\nSELECT * FROM pedidos_actuales ORDER BY pedido_id;');
  await todo(800);
  await c.foto('s12-final', { marcas: [['.sf-grid-caja', null]] });
  if (HASTA <= 12) return;

  // ================================================================ Nivel 4 · lección 13: Time Travel
  await hoja('Recuperar un DELETE', `USE SCHEMA tienda_dev.analitica;
-- ¡sin WHERE! borra todos los pedidos
DELETE FROM pedidos_actuales;`);
  await todo(1000);
  const qDel = await qid(); log('qid delete', qDel);
  await c.foto('s13-delete', { marcas: [['#sfEd', '1'], ['.sf-det', '2']] });
  await escribir(`USE SCHEMA tienda_dev.analitica;
SELECT COUNT(*) AS ahora FROM pedidos_actuales;`);
  await todo(600);
  await escribir(`USE SCHEMA tienda_dev.analitica;
-- cómo estaba la tabla justo antes de ese DELETE
SELECT * FROM pedidos_actuales BEFORE(STATEMENT => '${qDel}') ORDER BY pedido_id;`);
  await todo(1000);
  await c.foto('s13-before', { marcas: [['#sfEd', '1'], ['.sf-grid-caja', '2']] });
  await escribir(`USE SCHEMA tienda_dev.analitica;
INSERT INTO pedidos_actuales
SELECT * FROM pedidos_actuales BEFORE(STATEMENT => '${qDel}');

SELECT COUNT(*) AS recuperados FROM pedidos_actuales;`);
  await todo(1000);
  await c.foto('s13-restaurado', { marcas: [['#sfEd', '1'], ['.sf-grid-caja', '2']] });
  if (HASTA <= 13) return;

  // ================================================================ lección 14: UNDROP y clones
  await hoja('UNDROP y clones', `USE SCHEMA tienda_dev.analitica;
DROP TABLE ventas_por_canal;
UNDROP TABLE ventas_por_canal;
SELECT * FROM ventas_por_canal;`);
  await todo(1000);
  await c.foto('s14-undrop', { marcas: [['#sfEd', '1'], ['.sf-grid-caja', '2']] });
  await escribir(`-- una copia completa del entorno para probar, sin duplicar el almacenamiento
CREATE DATABASE tienda_qa CLONE tienda_dev;
SHOW SCHEMAS IN DATABASE tienda_qa;`);
  await todo(1200);
  await abrirNodo('TIENDA_QA'); await abrirNodo('TIENDA_QA.ANALITICA');
  await c.foto('s14-clone', { marcas: [['#sfArbol', '1'], ['.sf-grid-caja', '2']] });
  if (HASTA <= 14) return;

  // ================================================================ lección 15: SQL analítico
  await hoja('SQL analítico', `USE SCHEMA tienda_andina.public;
-- el último pedido de cada cliente
SELECT cliente_id, pedido_id, fecha_pedido, canal
FROM pedidos
QUALIFY ROW_NUMBER() OVER (PARTITION BY cliente_id ORDER BY fecha_pedido DESC, pedido_id DESC) = 1
ORDER BY cliente_id
LIMIT 10;`);
  await todo(1000);
  await c.foto('s15-qualify', { marcas: [['#sfEd', '1'], ['.sf-grid-caja', '2']] });
  await escribir(`USE SCHEMA tienda_andina.public;
-- pedidos por mes y variación contra el mes anterior
WITH mensual AS (
  SELECT DATE_TRUNC('month', fecha_pedido) AS mes, COUNT(*) AS pedidos
  FROM pedidos
  GROUP BY 1
)
SELECT mes, pedidos,
       pedidos - LAG(pedidos) OVER (ORDER BY mes) AS variacion
FROM mensual
ORDER BY mes DESC
LIMIT 12;`);
  await todo(1000);
  await c.foto('s15-ventana', { marcas: [['#sfEd', '1'], ['.sf-grid-caja', '2']] });
  if (HASTA <= 15) return;

  // ================================================================ lección 16 (proyecto): el UPDATE equivocado
  await hoja('Incidente del UPDATE', `USE SCHEMA tienda_dev.analitica;
-- se quería corregir un pedido y se pusieron en 0 todos
UPDATE pedidos_actuales SET total = 0;`);
  await todo(1000);
  const qUpd = await qid(); log('qid update', qUpd);
  await c.foto('s16-error', { marcas: [['#sfEd', '1'], ['.sf-grid-caja', '2']] });
  await escribir(`USE SCHEMA tienda_dev.analitica;
CREATE OR REPLACE TABLE pedidos_actuales AS
SELECT * FROM pedidos_actuales BEFORE(STATEMENT => '${qUpd}');

SELECT pedido_id, total FROM pedidos_actuales ORDER BY pedido_id;`);
  await todo(1200);
  await c.foto('s16-recuperado', { marcas: [['#sfEd', '1'], ['.sf-grid-caja', '2']] });
  if (HASTA <= 16) return;

  // ================================================================ Nivel 5 · lección 17: roles
  await ir('#/snowflake/roles', 900);
  await c.foto('s17-roles', { marcas: [['.sf-tabla', null]] });
  await p.click('#sfUsuario'); await w(400);
  await c.foto('s17-cambiar', { marcas: [['#sfPop', null]] });
  await p.evaluate(() => { document.getElementById('sfPop').hidden = true; });
  await hoja('Probar como PUBLIC', `USE ROLE PUBLIC;
SELECT COUNT(*) FROM tienda_dev.analitica.pedidos_actuales;`);
  await todo(800);
  await c.foto('s17-sin-permiso', { marcas: [['#sfCtxRol', '1'], ['.sf-err-caja', '2']] });
  await sql('USE ROLE SYSADMIN');
  if (HASTA <= 17) return;

  // ================================================================ lección 18: GRANT
  await hoja('Rol de analistas', `USE ROLE SECURITYADMIN;
CREATE ROLE analista_ventas;
GRANT USAGE ON WAREHOUSE analisis_wh TO ROLE analista_ventas;
GRANT USAGE ON DATABASE tienda_dev TO ROLE analista_ventas;
GRANT USAGE ON SCHEMA tienda_dev.analitica TO ROLE analista_ventas;
GRANT SELECT ON ALL TABLES IN SCHEMA tienda_dev.analitica TO ROLE analista_ventas;
GRANT ROLE analista_ventas TO USER alumno;
SHOW GRANTS TO ROLE analista_ventas;`);
  await todo(1200);
  await c.foto('s18-grants', { marcas: [['#sfEd', '1'], ['.sf-grid-caja', '2']] });
  await escribir(`USE ROLE analista_ventas;
USE WAREHOUSE analisis_wh;
SELECT canal, COUNT(*) AS pedidos, SUM(total) AS ventas
FROM tienda_dev.analitica.pedidos_actuales
GROUP BY canal;`);
  await todo(1000);
  await c.foto('s18-analista', { marcas: [['#sfCtxRol', '1'], ['.sf-grid-caja', '2']] });
  await escribir(`USE ROLE analista_ventas;
DELETE FROM tienda_dev.analitica.pedidos_actuales;`);
  await todo(800);
  await c.foto('s18-no-puede', { marcas: [['.sf-err-caja', null]] });
  await sql('USE ROLE SYSADMIN');
  if (HASTA <= 18) return;

  // ================================================================ lección 19: costos
  await ir('#/snowflake/warehouses', 900);
  await c.foto('s19-creditos', { marcas: [['.sf-kpis', '1'], ['.sf-chica', '2']] });
  await hoja('Límite de créditos', `USE ROLE ACCOUNTADMIN;
CREATE RESOURCE MONITOR limite_mensual
  WITH CREDIT_QUOTA = 50
  FREQUENCY = MONTHLY
  START_TIMESTAMP = IMMEDIATELY
  TRIGGERS ON 80 PERCENT DO NOTIFY
           ON 100 PERCENT DO SUSPEND;
ALTER WAREHOUSE analisis_wh SET RESOURCE_MONITOR = limite_mensual;
SHOW RESOURCE MONITORS;`);
  await todo(1000);
  await c.foto('s19-monitor', { marcas: [['#sfEd', '1'], ['.sf-grid-caja', '2']] });
  await sql('USE ROLE SYSADMIN');
  await ir('#/snowflake/costos', 900);
  await c.foto('s19-cost-management', { marcas: [['.sf-aviso', null]] });
  if (HASTA <= 19) return;

  // ================================================================ lección 20 (proyecto): acceso seguro
  await ir('#/snowflake/roles', 900);
  await c.foto('s20-roles', { marcas: [['.sf-tabla', '1'], ['.sf-pag table:nth-of-type(2)', '2']] });
  await ir('#/snowflake/historial', 900);
  await c.foto('s20-historial', { marcas: [['.sf-hist', null]] });
  if (HASTA <= 20) return;

  // ================================================================ Nivel 6 · lección 21: buenas prácticas
  await hoja('Buenas prácticas', `USE SCHEMA tienda_dev.raw;
-- tablas transitorias: sin Fail-safe, más baratas para datos que se pueden volver a cargar
CREATE TRANSIENT TABLE pedidos_tmp AS SELECT * FROM pedidos_staging;
-- el warehouse se apaga al minuto sin consultas
ALTER WAREHOUSE analisis_wh SET AUTO_SUSPEND = 60;
SHOW WAREHOUSES;`);
  await todo(1000);
  await c.foto('s21-practicas', { marcas: [['#sfEd', '1'], ['.sf-grid-caja', '2']] });
  if (HASTA <= 21) return;

  // ================================================================ lección 22: tareas, streams y más
  await ir('#/snowflake/tareas', 900);
  await c.foto('s22-tareas', { marcas: [['.sf-aviso', null]] });
  await ir('#/snowflake/copy', 900);
  await c.foto('s22-copy', { marcas: [['.sf-aviso', null]] });
  if (HASTA <= 22) return;

  // ================================================================ lección 23: de la práctica a Snowflake real
  await ir('#/snowflake/marketplace', 900);
  await c.foto('s23-marketplace', { marcas: [['.sf-aviso', null]] });
  await ir('#/snowflake', 900);
  await p.click('#sfUsuario'); await w(400);
  await c.foto('s23-cuenta', { marcas: [['#sfPop', null]] });
  await p.evaluate(() => { document.getElementById('sfPop').hidden = true; });
  if (HASTA <= 23) return;

  // ================================================================ lección 24 (proyecto final)
  await ir('#/snowflake/datos', 1500);
  await cerrarNodo('TIENDA_ANDINA'); await cerrarNodo('TIENDA_QA');
  await abrirNodo('TIENDA_DEV'); await abrirNodo('TIENDA_DEV.RAW'); await abrirNodo('TIENDA_DEV.ANALITICA');
  await c.foto('s24-arbol', { marcas: [['#sfArbol', null]] });
  await ir('#/snowflake/warehouses', 900);
  await c.foto('s24-warehouses', { marcas: [['.sf-tabla', null]] });
}
