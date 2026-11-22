// Guion de capturas del curso de BigQuery (assets/img/guias/bigquery/)
// Historia: el equipo de datos de Tienda Andina analiza sus ventas en BigQuery: consultas con estimación de bytes,
// datasets, costos, particiones, cargas, STRUCT/ARRAY, MERGE, time travel, INFORMATION_SCHEMA y automatización.
export default async function (c) {
  const p = c.page;
  const w = (ms) => c.espera(ms);
  const log = (...a) => console.log('   [bigquery]', ...a);
  const HASTA = Number(process.env.BQ_HASTA || 99);
  const ir = async (h, ms = 900) => { await p.evaluate((x) => { location.hash = x; }, h); await w(ms); };
  const listo = () => p.waitForFunction(() => !document.querySelector('#bqRes .bq-spin'), null, { timeout: 120000 });
  // una consulta nueva (pestaña) con nombre y SQL; espera la validación (dry run)
  const consulta = async (nombre, sql) => {
    await ir('#/bigquery', 900);
    await p.waitForSelector('#bqNueva', { timeout: 60000 }); await p.click('#bqNueva'); await w(900);
    await p.waitForSelector('.CodeMirror', { timeout: 60000 });
    p.once('dialog', (d) => d.accept(nombre).catch(() => {}));
    await p.click('#bqRen'); await w(700);
    await escribir(sql);
  };
  const escribir = async (sql) => { await p.evaluate((x) => { const cm = document.querySelector('.CodeMirror').CodeMirror; cm.setValue(x); cm.setCursor(cm.lineCount(), 0); }, sql); await w(1400); };
  const correr = async (ms = 700) => { await p.click('#bqRun'); await w(300); await listo(); await w(ms); };
  const sql = (q) => p.evaluate(async (x) => { const rs = await window.BigQueryMotor.ejecutar(x); const r = rs[rs.length - 1]; return r.error ? 'ERR ' + r.error.message : 'ok'; }, q);
  const abrirDs = async (ds) => { const ab = await p.evaluate((x) => !!(window.BigQueryMotor.st().abiertos || {})[x], ds); if (!ab) { await p.click(`#bqArbol [data-ds="${ds}"]`).catch(() => log('sin dataset', ds)); await w(600); } };

  await c.ir('#/bigquery', '.bqp'); await w(1500);
  await p.evaluate(async () => { await window.BigQueryMotor.init(); }); await w(600);

  // ================================================================ Nivel 1 · lección 1: qué es BigQuery y la consola
  await ir('#/bigquery', 1500);
  await c.foto('q01-studio', { marcas: [['.bq-nav', '1'], ['#bqArbol', '2'], ['#bqEd', '3'], ['#bqVal', '4']] });
  await ir('#/bigquery/resumen', 2500);
  await c.foto('q01-no-simulado', { marcas: [['#bqKpis', '1'], ['.bq-acciones', '2']] });
  if (HASTA <= 1) return;

  // ================================================================ lección 2: la primera consulta y la estimación
  await consulta('Pedidos por canal', `SELECT canal, COUNT(*) AS pedidos
FROM \`tienda-andina-dev.tienda.pedidos\`
WHERE fecha_pedido >= '2024-01-01'
GROUP BY canal
ORDER BY pedidos DESC;`);
  await c.foto('q02-editor', { marcas: [['.bq-pestanas', '1'], ['#bqRun', '2'], ['#bqVal', '3']] });
  await correr(800);
  await c.foto('q02-resultado', { marcas: [['.bq-grid-caja', '1'], ['.bq-det', '2']] });
  await escribir('SELECT *\nFROM `tienda-andina-dev.tienda.pedidos`\nWHERE fecha_pedido >= \'2024-01-01\';');
  await c.foto('q02-estrella', { marcas: [['#bqEd', '1'], ['#bqVal', '2']] });
  if (HASTA <= 2) return;

  // ================================================================ lección 3: explorar tablas
  await ir('#/bigquery/t/tienda/pedidos', 1500);
  await c.foto('q03-schema', { marcas: [['.bq-tabs', '1'], ['#bqTab', '2']] });
  await p.click('.bq-tabs [data-tab="details"]'); await w(800);
  await c.foto('q03-details', { marcas: [['#bqTab', null]] });
  await p.click('.bq-tabs [data-tab="preview"]'); await w(1500);
  await c.foto('q03-preview', { marcas: [['#bqTab', null]] });
  if (HASTA <= 3) return;

  // ================================================================ lección 4 (proyecto): ventas por canal y mes
  await consulta('Pedidos por mes y canal', `SELECT DATE_TRUNC(fecha_pedido, MONTH) AS mes,
       COUNTIF(canal = 'web') AS web,
       COUNTIF(canal = 'app') AS app,
       COUNTIF(canal = 'tienda') AS tienda,
       COUNT(*) AS total
FROM \`tienda-andina-dev.tienda.pedidos\`
WHERE fecha_pedido >= '2024-07-01'
GROUP BY mes
ORDER BY mes;`);
  await correr(800);
  await c.foto('q04-resultado', { marcas: [['#bqEd', '1'], ['.bq-grid-caja', '2']] });
  await escribir('SELECT canal, COUNT(*)\nFROM pedidos\nGROUP BY canal;');
  await c.foto('q04-error', { marcas: [['#bqVal', null]] });
  if (HASTA <= 4) return;

  // ================================================================ Nivel 2 · lección 5: datasets y tablas
  await consulta('Dataset de analítica', `CREATE SCHEMA analitica
OPTIONS (description = 'Tablas limpias para el negocio');

CREATE TABLE analitica.ventas_por_canal AS
SELECT canal, COUNT(*) AS pedidos
FROM tienda.pedidos
WHERE fecha_pedido >= '2024-01-01'
GROUP BY canal;`);
  await correr(1200);
  await abrirDs('analitica');
  await c.foto('q05-crear', { marcas: [['#bqArbol', '1'], ['.bq-res-varias', '2'], ['.bq-res-ok', '3']] });
  await ir('#/bigquery/d/analitica', 1500);
  await c.foto('q05-dataset', { marcas: [['.bq-miga', '1'], ['.bq-tabla', '2']] });
  if (HASTA <= 5) return;

  // ================================================================ lección 6: bytes, LIMIT y caché
  await consulta('Cuánto cuesta', `-- LIMIT recorta el resultado, no lo que se lee
SELECT *
FROM tienda.pedidos
WHERE fecha_pedido >= '2024-01-01'
LIMIT 10;`);
  await c.foto('q06-limit', { marcas: [['#bqEd', '1'], ['#bqVal', '2']] });
  await escribir(`SELECT canal, COUNT(*) AS pedidos
FROM tienda.pedidos
WHERE fecha_pedido >= '2024-01-01'
GROUP BY canal;`);
  await correr(600);
  await correr(800);
  await c.foto('q06-cache', { marcas: [['.bq-det', null]] });
  await ir('#/bigquery/costos', 900);
  await c.foto('q06-costos', { marcas: [['.bq-kpis', '1'], ['.bq-pag table', '2']] });
  if (HASTA <= 6) return;

  // ================================================================ lección 7: Job history
  await ir('#/bigquery/jobs', 900);
  await c.foto('q07-jobs', { marcas: [['.bq-hist', null]] });
  await p.click('.bq-hist tbody tr').catch(() => log('sin jobs')); await w(500);
  await c.foto('q07-detalle', { marcas: [['#bqModal .bq-modal-c', null]] });
  await p.evaluate(() => { const m = document.getElementById('bqModal'); if (m) m.hidden = true; });
  if (HASTA <= 7) return;

  // ================================================================ lección 8 (proyecto): el dataset de analítica
  await consulta('Inventario del dataset', `CREATE OR REPLACE TABLE analitica.clientes_por_pais AS
SELECT pais, COUNT(*) AS clientes
FROM tienda.clientes
GROUP BY pais;

SELECT table_name, table_type, row_count
FROM analitica.INFORMATION_SCHEMA.TABLES
ORDER BY table_name;`);
  await correr(1000);
  await c.foto('q08-inventario', { marcas: [['#bqEd', '1'], ['.bq-grid-caja', '2']] });
  if (HASTA <= 8) return;

  // ================================================================ Nivel 3 · lección 9: particiones y clustering
  await consulta('Tabla particionada', `CREATE TABLE analitica.pedidos_part
PARTITION BY fecha_pedido
CLUSTER BY canal
OPTIONS (require_partition_filter = TRUE)
AS SELECT * FROM tienda.pedidos;`);
  await correr(1000);
  await c.foto('q09-crear', { marcas: [['#bqEd', '1'], ['.bq-res-ok', '2']] });
  await escribir(`SELECT canal, COUNT(*) AS pedidos
FROM analitica.pedidos_part
WHERE fecha_pedido BETWEEN '2024-11-01' AND '2024-11-30'
GROUP BY canal;`);
  await c.foto('q09-poda', { marcas: [['#bqEd', '1'], ['#bqVal', '2']] });
  await escribir('SELECT canal, COUNT(*) AS pedidos\nFROM analitica.pedidos_part\nGROUP BY canal;');
  await c.foto('q09-sin-filtro', { marcas: [['#bqVal', null]] });
  await ir('#/bigquery/t/analitica/pedidos_part', 1500);
  await p.click('.bq-tabs [data-tab="details"]'); await w(800);
  await c.foto('q09-details', { marcas: [['#bqTab', null]] });
  if (HASTA <= 9) return;

  // ================================================================ lección 10: cargar un archivo
  await ir('#/bigquery/d/analitica', 1500);
  await p.click('#bqCrear'); await w(500);
  await p.selectOption('#ctOrigen', 'ejemplo'); await p.dispatchEvent('#ctOrigen', 'change'); await w(300);
  await p.fill('#ctTabla', 'eventos_app'); await p.fill('#ctPart', 'fecha'); await w(200);
  await c.foto('q10-crear', { marcas: [['#bqModal .bq-modal-c', null]] });
  await p.click('#ctOk'); await w(2500);
  await c.foto('q10-tabla', { marcas: [['.bq-cab', '1'], ['#bqTab', '2']] });
  if (HASTA <= 10) return;

  // ================================================================ lección 11: vistas, STRUCT, ARRAY y UNNEST
  await consulta('Vistas y arreglos', `CREATE OR REPLACE VIEW analitica.v_ultimos_pedidos AS
SELECT cliente_id,
       ARRAY_AGG(pedido_id ORDER BY fecha_pedido DESC LIMIT 3) AS ultimos
FROM tienda.pedidos
GROUP BY cliente_id;

SELECT * FROM analitica.v_ultimos_pedidos ORDER BY cliente_id LIMIT 5;`);
  await correr(1000);
  await c.foto('q11-array', { marcas: [['#bqEd', '1'], ['.bq-grid-caja', '2']] });
  await escribir(`SELECT v.cliente_id, pedido
FROM analitica.v_ultimos_pedidos AS v,
     UNNEST(v.ultimos) AS pedido
WHERE v.cliente_id <= 3
ORDER BY v.cliente_id;`);
  await correr(1000);
  await c.foto('q11-unnest', { marcas: [['#bqEd', '1'], ['.bq-grid-caja', '2']] });
  await escribir(`SELECT STRUCT('Lima Centro' AS tienda, 'PE' AS pais) AS sucursal,
       ['web', 'app', 'tienda'] AS canales;`);
  await correr(800);
  await c.foto('q11-struct', { marcas: [['#bqEd', '1'], ['.bq-grid-caja', '2']] });
  if (HASTA <= 11) return;

  // ================================================================ lección 12 (proyecto): la tabla de hechos
  await consulta('Hechos de ventas', `CREATE OR REPLACE TABLE analitica.hechos_ventas
PARTITION BY fecha
CLUSTER BY canal, pais
AS
SELECT p.fecha_pedido AS fecha, p.canal, c.pais,
       d.producto_id, d.cantidad,
       ROUND(d.cantidad * d.precio_unitario, 2) AS importe
FROM tienda.pedidos AS p
JOIN tienda.clientes AS c ON c.cliente_id = p.cliente_id
JOIN tienda.detalle_pedidos AS d ON d.pedido_id = p.pedido_id
WHERE p.estado = 'entregado';`);
  await correr(1500);
  await escribir(`SELECT pais, ROUND(SUM(importe), 2) AS ventas
FROM analitica.hechos_ventas
WHERE fecha BETWEEN '2024-10-01' AND '2024-12-31'
  AND canal = 'web'
GROUP BY pais
ORDER BY ventas DESC
LIMIT 5;`);
  await correr(1000);
  await c.foto('q12-consulta', { marcas: [['#bqVal', '1'], ['.bq-grid-caja', '2'], ['.bq-det', '3']] });
  if (HASTA <= 12) return;

  // ================================================================ Nivel 4 · lección 13: MERGE
  await consulta('Stock con MERGE', `CREATE OR REPLACE TABLE analitica.stock_tiendas AS
SELECT producto_id, stock FROM tienda.productos WHERE producto_id <= 5;

MERGE analitica.stock_tiendas AS t
USING (SELECT 1 AS producto_id, 0 AS stock
       UNION ALL SELECT 2, 99
       UNION ALL SELECT 500, 12) AS s
ON t.producto_id = s.producto_id
WHEN MATCHED AND s.stock = 0 THEN DELETE
WHEN MATCHED THEN UPDATE SET stock = s.stock
WHEN NOT MATCHED THEN INSERT (producto_id, stock) VALUES (s.producto_id, s.stock);`);
  await correr(1200);
  await c.foto('q13-merge', { marcas: [['#bqEd', '1'], ['.bq-res-ok', '2']] });
  await escribir('SELECT * FROM analitica.stock_tiendas ORDER BY producto_id;');
  await correr(800);
  await c.foto('q13-resultado', { marcas: [['.bq-grid-caja', null]] });
  if (HASTA <= 13) return;

  // ================================================================ lección 14: time travel
  await w(2500);
  await consulta('Recuperar con time travel', `-- un DELETE equivocado: en BigQuery el WHERE es obligatorio, pero WHERE TRUE borra todo
DELETE FROM analitica.ventas_por_canal WHERE TRUE;`);
  await correr(1000);
  await c.foto('q14-delete', { marcas: [['#bqEd', '1'], ['.bq-res-ok', '2']] });
  await escribir(`SELECT *
FROM analitica.ventas_por_canal
  FOR SYSTEM_TIME AS OF TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 MINUTE);`);
  await correr(1000);
  await c.foto('q14-system-time', { marcas: [['#bqEd', '1'], ['.bq-grid-caja', '2']] });
  await escribir(`INSERT INTO analitica.ventas_por_canal
SELECT *
FROM analitica.ventas_por_canal
  FOR SYSTEM_TIME AS OF TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 MINUTE);

SELECT * FROM analitica.ventas_por_canal ORDER BY pedidos DESC;`);
  await correr(1000);
  await c.foto('q14-restaurado', { marcas: [['#bqEd', '1'], ['.bq-grid-caja', '2']] });
  if (HASTA <= 14) return;

  // ================================================================ lección 15: SQL analítico
  await consulta('SQL analítico', `-- el último pedido de cada cliente
SELECT cliente_id, pedido_id, fecha_pedido, canal
FROM tienda.pedidos
WHERE fecha_pedido >= '2024-01-01'
QUALIFY ROW_NUMBER() OVER (PARTITION BY cliente_id ORDER BY fecha_pedido DESC, pedido_id DESC) = 1
ORDER BY cliente_id
LIMIT 10;`);
  await correr(1000);
  await c.foto('q15-qualify', { marcas: [['#bqEd', '1'], ['.bq-grid-caja', '2']] });
  await escribir(`WITH mensual AS (
  SELECT DATE_TRUNC(fecha_pedido, MONTH) AS mes,
         COUNT(*) AS pedidos,
         COUNTIF(canal = 'web') AS web
  FROM tienda.pedidos
  WHERE fecha_pedido >= '2024-01-01'
  GROUP BY mes
)
SELECT mes, pedidos,
       pedidos - LAG(pedidos) OVER (ORDER BY mes) AS variacion,
       ROUND(SAFE_DIVIDE(web, pedidos) * 100, 1) AS pct_web
FROM mensual
ORDER BY mes;`);
  await correr(1000);
  await c.foto('q15-ventana', { marcas: [['#bqEd', '1'], ['.bq-grid-caja', '2']] });
  if (HASTA <= 15) return;

  // ================================================================ lección 16 (proyecto): stock al día
  await consulta('Proyecto: stock al día', `MERGE analitica.stock_tiendas AS t
USING (SELECT 2 AS producto_id, 99 AS stock
       UNION ALL SELECT 3, 7
       UNION ALL SELECT 500, 12) AS s
ON t.producto_id = s.producto_id
WHEN MATCHED AND t.stock <> s.stock THEN UPDATE SET stock = s.stock
WHEN NOT MATCHED BY TARGET THEN INSERT ROW;

SELECT * FROM analitica.stock_tiendas ORDER BY producto_id;`);
  await correr(1200);
  await c.foto('q16-stock', { marcas: [['#bqEd', '1'], ['.bq-grid-caja', '2']] });
  if (HASTA <= 16) return;

  // ================================================================ Nivel 5 · lección 17: INFORMATION_SCHEMA
  await consulta('Quién gasta', `SELECT job_type,
       COUNT(*) AS jobs,
       SUM(total_bytes_processed) AS bytes_procesados,
       SUM(total_bytes_billed) AS bytes_facturados,
       COUNTIF(cache_hit) AS desde_cache
FROM \`region-us\`.INFORMATION_SCHEMA.JOBS
GROUP BY job_type;`);
  await correr(1000);
  await c.foto('q17-jobs', { marcas: [['#bqEd', '1'], ['.bq-grid-caja', '2']] });
  await escribir(`SELECT query, total_bytes_billed
FROM \`region-us\`.INFORMATION_SCHEMA.JOBS
WHERE job_type = 'QUERY'
ORDER BY total_bytes_billed DESC
LIMIT 5;`);
  await correr(1000);
  await c.foto('q17-caras', { marcas: [['.bq-grid-caja', null]] });
  await escribir(`SELECT column_name, data_type, is_nullable
FROM tienda.INFORMATION_SCHEMA.COLUMNS
WHERE table_name = 'pedidos';`);
  await correr(1000);
  await c.foto('q17-columnas', { marcas: [['.bq-grid-caja', null]] });
  if (HASTA <= 17) return;

  // ================================================================ lección 18: automatizar
  await p.evaluate(() => { const s = window.BigQueryMotor.st(); if (!s.programadas.some((x) => x.id === 'cap1')) s.programadas.push({ id: 'cap1', nombre: 'pedidos_por_canal_diario', sql: 'SELECT @run_date AS fecha_corrida, canal, COUNT(*) AS pedidos\nFROM tienda.pedidos\nGROUP BY canal', horario: 'every day 09:00', destino: { ds: 'tienda', tabla: 'pedidos_por_canal_diario' }, modo: 'WRITE_APPEND', activa: true, inicio: Date.now(), ultima: Date.now(), runs: [], creada: Date.now() }); });
  await ir('#/bigquery/programadas/cap1', 800);
  await p.click('#bqAhora'); await w(2500);
  await c.foto('q18-programadas', { marcas: [['.bq-dl', '1'], ['.bq-tabla', '2']] });
  await ir('#/bigquery/dataform', 1200);
  await c.foto('q18-dataform', { marcas: [['.bq-df-arbol', '1'], ['.bq-df-ed', '2'], ['.bq-grafo', '3']] });
  if (HASTA <= 18) return;

  // ================================================================ lección 19: acceso y gobierno
  await consulta('Vista para comercial', `CREATE SCHEMA IF NOT EXISTS reportes;

-- una vista que solo expone lo que comercial necesita (sin email ni teléfono)
CREATE OR REPLACE VIEW reportes.v_clientes_por_pais AS
SELECT pais, segmento, COUNT(*) AS clientes
FROM tienda.clientes
GROUP BY pais, segmento;

SELECT * FROM reportes.v_clientes_por_pais ORDER BY clientes DESC LIMIT 8;`);
  await correr(1200);
  await abrirDs('reportes');
  await c.foto('q19-vista', { marcas: [['#bqArbol', '1'], ['#bqEd', '2'], ['.bq-grid-caja', '3']] });
  await ir('#/bigquery/sharing', 800);
  await c.foto('q19-sharing', { marcas: [['.bq-aviso', null]] });
  if (HASTA <= 19) return;

  // ================================================================ lección 20 (proyecto): costo bajo control
  await ir('#/bigquery/costos', 900);
  await c.foto('q20-costos', { marcas: [['.bq-kpis', '1'], ['.bq-pag h2 + table', '2']] });
  await ir('#/bigquery/jobs', 900);
  await c.foto('q20-jobs', { marcas: [['.bq-hist', null]] });
  if (HASTA <= 20) return;

  // ================================================================ Nivel 6 · lección 21: buenas prácticas
  await consulta('Buenas prácticas', `-- columnas justas + filtro de partición + clustering
SELECT canal, COUNT(*) AS pedidos
FROM analitica.pedidos_part
WHERE fecha_pedido BETWEEN '2024-12-01' AND '2024-12-31'
  AND canal = 'web'
GROUP BY canal;`);
  await correr(1000);
  await c.foto('q21-optimizada', { marcas: [['#bqVal', '1'], ['.bq-det', '2']] });
  if (HASTA <= 21) return;

  // ================================================================ lección 22: capacidad y ediciones
  await ir('#/bigquery/capacidad', 800);
  await c.foto('q22-capacidad', { marcas: [['.bq-aviso', null]] });
  await ir('#/bigquery/transferencias', 800);
  await c.foto('q22-transferencias', { marcas: [['.bq-aviso', null]] });
  if (HASTA <= 22) return;

  // ================================================================ lección 23: de la práctica a BigQuery real
  await c.ir('#/lab/terminal', '.term-input'); await w(1500);
  const term = async (cmd, ms = 1500) => { await p.click('.term-input'); await p.keyboard.type(cmd); await p.keyboard.press('Enter'); await w(ms); };
  await term('clear', 300);
  await term('gcloud auth login', 1200);
  await term('gcloud config set project tienda-andina-dev', 900);
  await term('clear', 300);
  await term('bq ls', 1200);
  await term("bq query --use_legacy_sql=false 'SELECT canal, COUNT(*) AS pedidos FROM tienda.pedidos GROUP BY canal'", 3500);
  await c.foto('q23-bq-cli', { recorte: '.term', marcas: [] });
  if (HASTA <= 23) return;

  // ================================================================ lección 24 (proyecto final)
  await ir('#/bigquery', 1500);
  await abrirDs('analitica'); await abrirDs('reportes');
  await c.foto('q24-explorer', { marcas: [['#bqArbol', null]] });
  await ir('#/bigquery/d/analitica', 1500);
  await c.foto('q24-dataset', { marcas: [['.bq-tabla', null]] });
}
