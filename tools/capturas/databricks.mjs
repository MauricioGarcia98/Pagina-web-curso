// Guion de capturas del curso de Databricks (assets/img/guias/databricks/)
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

export default async function (c) {
  const p = c.page;
  const HOME = '/Workspace/Users/alumno@academia.dev';
  const ir = async (h, sel = '#dbxMain .dbx-pag, #dbxMain .dbx-nb, #dbxMain .cx-lay, #dbxMain .sqx-lay') => { await c.ir('#/databricks' + h, sel); await c.espera(600); };
  const menu = async (txt) => { await p.click(`#dbxMenu button:has-text("${txt}")`); await c.espera(500); };
  const cerrarMenu = async () => { await p.mouse.click(640, 740); await c.espera(200); };
  const dlgOk = async (ms = 900) => { await p.click('#dbxCapa [data-ok]'); await c.espera(ms); };
  const dlgCancelar = async () => { await p.click('#dbxCapa [data-cancelar]'); await c.espera(300); };
  const setCM = (sel, texto) => p.evaluate(([s, t]) => { const el = document.querySelector(s + ' .CodeMirror'); el.CodeMirror.setValue(t); }, [sel, texto]);
  const libre = () => p.waitForFunction(() => !document.querySelector('.nb-corriendo') && !document.querySelector('#sqxRes .nb-corriendo'), null, { timeout: 300000 });
  const celdas = (ruta, srcs) => p.evaluate(([r, ss]) => { const D = window.DBX; const it = D.ws().items[r]; it.celdas = ss.map((src) => ({ id: D.nid(), src })); D.guardar(); }, [ruta, srcs]);
  const correr = async (i, ms = 400) => { await p.locator('.nb-celda').nth(i).locator('.nb-run').click(); await c.espera(300); await libre(); await c.espera(ms); };
  const verCelda = async (i) => { await p.evaluate((k) => { const el = document.querySelectorAll('.nb-celda')[k]; if (el) el.scrollIntoView({ block: 'start' }); window.scrollBy(0, -70); }, i); await c.espera(300); };
  const celdaSel = (k) => `#nbCeldas > div:nth-child(${k * 2})`; // las celdas van intercaladas con los botones "+ Code / + Text"
  const sql = async (texto, espera = 500) => { await setCM('#dbxMain .sqx-ed', texto); await p.click('#sqxRun'); await c.espera(400); await libre(); await c.espera(espera); };
  const csv = path.join(os.tmpdir(), 'devoluciones.csv');
  fs.writeFileSync(csv, 'pedido_id,fecha,categoria,canal,motivo,monto\n1001,2024-11-02,Electrónica,web,defectuoso,129.90\n1002,2024-11-02,Hogar,app,no le gustó,45.00\n1003,2024-11-03,Electrónica,tienda,defectuoso,89.50\n1004,2024-11-03,Ropa,web,talle incorrecto,32.00\n1005,2024-11-04,Ropa,app,talle incorrecto,54.90\n1006,2024-11-04,Hogar,web,llegó roto,210.00\n1007,2024-11-05,Electrónica,web,no era lo pedido,399.00\n1008,2024-11-05,Juguetes,tienda,defectuoso,25.50\n1009,2024-11-06,Ropa,web,no le gustó,61.00\n1010,2024-11-06,Electrónica,app,defectuoso,149.00\n1011,2024-11-07,Hogar,tienda,llegó roto,78.00\n1012,2024-11-07,Juguetes,web,no era lo pedido,19.90\n');

  // ---------------------------------------------------------------- nivel 1: la pantalla, el workspace, el catálogo
  await ir('', '.dbx-home');
  await c.foto('d01-pantalla');
  await c.foto('d01-zonas', { marcas: [['.dbx-top', '1'], ['#dbxNav', '2'], ['#dbxMain', '3'], ['.dbx-nuevo', '4']] });
  await p.click('.dbx-nuevo'); await c.espera(300);
  await c.foto('d01-nuevo', { marcas: [['#dbxMenu', null]] });
  await cerrarMenu();
  await ir('/workspace', '.dbx-ws-lay');
  await c.foto('d02-workspace', { marcas: [['.dbx-ws-lado', '1'], ['.dbx-migas', '2'], ['[data-a="crear"]', '3']] });
  await p.click('a:has-text("Introducción a Databricks")'); await p.waitForSelector('.dbx-nb'); await c.espera(800);
  await c.foto('d02-notebook', { marcas: [['#nbTit', '1'], ['#nbLang', '2'], ['#nbCompute', '3'], ['#nbRunAll', '4'], [celdaSel(2), '5']] });
  await correr(1); await verCelda(1);
  await c.foto('d02-celda-sql', { marcas: [[celdaSel(2) + ' .nb-run', '1'], [celdaSel(2) + ' .nb-c-out', '2']] });
  await correr(2); await verCelda(2);
  await c.foto('d02-celda-python', { marcas: [[celdaSel(3) + ' .nb-c-out', null]] });
  await ir('/workspace', '.dbx-ws-lay');
  await p.click('[data-a="crear"]'); await c.espera(300);
  await c.foto('d02-crear', { marcas: [['#dbxMenu', null]] });
  await menu('Notebook'); await p.waitForSelector('.dbx-nb'); await c.espera(600);
  await c.foto('d02-notebook-nuevo', { marcas: [['#nbTit', '1'], [celdaSel(1), '2']] });
  await p.fill('#nbTit', 'Ventas por canal'); await p.press('#nbTit', 'Enter'); await c.espera(600);
  const NB1 = HOME + '/Ventas por canal';
  // catálogo
  await ir('/catalogo', '.cx-lay');
  await c.foto('d03-catalogo', { marcas: [['.cx-lado', '1'], ['#cxF', '2'], ['#cxNuevoCat', '3']] });
  await ir('/catalogo/samples/tienda', '.cx-lay');
  await c.foto('d03-esquema');
  await ir('/catalogo/samples/tienda/pedidos', '.cx-lay');
  await c.foto('d03-tabla', { marcas: [['.cx-meta', '1'], ['.dbx-pest', '2'], ['#cxConsultar', '3']] });
  await ir('/catalogo/samples/tienda/pedidos/muestra', '.cx-lay');
  await c.foto('d03-muestra');
  // proyecto 1: el notebook "Ventas por canal"
  await celdas(NB1, [
    '%md\n# Ventas por canal\nPrimer análisis sobre `samples.tienda.pedidos`: cuántos pedidos hay por canal y por estado, y una tabla guardada en `main.default`.',
    '%sql\nSELECT canal, COUNT(*) AS pedidos\nFROM samples.tienda.pedidos\nGROUP BY canal\nORDER BY pedidos DESC',
    'df = spark.table("samples.tienda.pedidos")\ndisplay(df.groupBy("estado").count().orderBy("count", ascending=False))',
    '(df.groupBy("canal").count()\n   .write.mode("overwrite")\n   .saveAsTable("main.default.ventas_por_canal"))',
    '%sql\nSELECT * FROM main.default.ventas_por_canal ORDER BY count DESC',
  ]);
  await ir('/notebook/' + encodeURIComponent(NB1), '.dbx-nb');
  await correr(1); await correr(2); await correr(3); await correr(4);
  await verCelda(3);
  await c.foto('d04-guardar-tabla', { marcas: [[celdaSel(4), '1'], [celdaSel(5) + ' .nb-c-out', '2']] });
  await ir('/catalogo/main/default/ventas_por_canal', '.cx-lay');
  await c.foto('d04-tabla-main', { marcas: [['.dbx-migas', '1'], ['.cx-meta', '2']] });
  await ir('/catalogo/main/default/ventas_por_canal/historial', '.cx-lay');
  await c.foto('d04-historial');

  // ---------------------------------------------------------------- nivel 2: editor SQL, notebooks a fondo, subir datos
  await ir('/sql', '.sqx-ed');
  await setCM('#dbxMain .sqx-ed', 'SELECT canal, estado, COUNT(*) AS pedidos\nFROM samples.tienda.pedidos\nGROUP BY canal, estado\nORDER BY pedidos DESC');
  await c.foto('d05-editor', { marcas: [['#sqxPest', '1'], ['#sqxRun', '2'], ['#sqxWh', '3'], ['.sqx-ed', '4'], ['#sqxRes', '5']] });
  await p.click('#sqxRun'); await c.espera(400); await libre(); await c.espera(500);
  await c.foto('d05-resultado', { marcas: [['#sqxRes .dbx-res-pest', null]] });
  await p.click('#sqxRes [data-p="nueva"]'); await c.espera(500);
  await p.selectOption('#vTipo', 'bar').catch(() => {}); await p.selectOption('#vX', 'canal').catch(() => {}); await p.selectOption('#vY', 'pedidos').catch(() => {}); await c.espera(400);
  await c.foto('d05-visualizacion', { marcas: [['#vTipo', '1'], ['#vX', '2'], ['#vY', '3'], ['#vPrev', '4']] });
  await dlgOk();
  await c.foto('d05-grafico', { marcas: [['#sqxRes', null]] });
  await sql("SELECT estado, COUNT(*) AS pedidos\nFROM samples.tienda.pedidos\nWHERE canal = :canal\nGROUP BY estado\nORDER BY pedidos DESC");
  await p.fill('#sqxPar input', 'app').catch(() => {}); await c.espera(200); await p.click('#sqxRun'); await c.espera(300); await libre(); await c.espera(400);
  await c.foto('d05-parametros', { marcas: [['#sqxPar', '1'], ['#sqxRes', '2']] });
  await p.click('#sqxGuardar'); await c.espera(400); await p.fill('#qN', 'Pedidos por canal'); await c.espera(200);
  await c.foto('d05-guardar', { marcas: [['#qN', '1'], ['#qD', '2']] });
  await dlgOk(800);
  await ir('/consultas', '.dbx-pag');
  await c.foto('d05-consultas');
  await ir('/historial', '.dbx-pag');
  await c.foto('d05-historial');
  // notebooks a fondo: widgets, magics y menú File
  await celdas(NB1, [
    '%md\n# Ventas por canal\nPrimer análisis sobre `samples.tienda.pedidos`.',
    'dbutils.widgets.dropdown("canal", "web", ["web", "app", "tienda", "telefono"], "Canal")\ndbutils.widgets.text("minimo", "10", "Mínimo de pedidos")',
    'canal = dbutils.widgets.get("canal")\nminimo = int(dbutils.widgets.get("minimo"))\ndf = spark.table("samples.tienda.pedidos").filter(f"canal = \'{canal}\'")\nresumen = df.groupBy("estado").count().filter(f"count >= {minimo}")\ndisplay(resumen)',
    '%fs ls /Volumes/main/default/',
    '%sh\necho "Corriendo en el driver"; date',
    '%sql\nSELECT canal, COUNT(*) AS pedidos\nFROM samples.tienda.pedidos\nGROUP BY canal\nORDER BY pedidos DESC',
  ]);
  await ir('/notebook/' + encodeURIComponent(NB1), '.dbx-nb');
  await correr(1); await correr(2);
  await c.foto('d06-widgets', { marcas: [['#nbW', '1'], [celdaSel(3) + ' .nb-c-out', '2']] });
  await correr(3); await correr(4); await verCelda(3);
  await c.foto('d06-magics', { marcas: [[celdaSel(4), '1'], [celdaSel(5), '2']] });
  await p.evaluate(() => window.scrollTo(0, 0)); await c.espera(200);
  await p.click('[data-m="file"]'); await c.espera(300);
  await c.foto('d06-menu-file', { marcas: [['#dbxMenu', null]] });
  await cerrarMenu();
  await correr(5); await verCelda(5);
  await p.click(celdaSel(6) + ' [data-p="nueva"]'); await c.espera(500);
  await p.selectOption('#vTipo', 'pie').catch(() => {}); await p.selectOption('#vX', 'canal').catch(() => {}); await p.selectOption('#vY', 'pedidos').catch(() => {}); await c.espera(300);
  await dlgOk();
  await verCelda(5);
  await c.foto('d06-grafico-celda', { marcas: [[celdaSel(6) + ' .dbx-res-pest', '1'], [celdaSel(6) + ' .dbx-res-cuerpo', '2']] });
  // subir datos
  await ir('/ingesta', '.dbx-tarjetas');
  await c.foto('d07-add-data', { marcas: [['.dbx-tarj:nth-child(1)', '1'], ['.dbx-tarj:nth-child(2)', '2'], ['.dbx-tarj:nth-child(3)', '3']] });
  await p.setInputFiles('#ingF', csv); await c.espera(900);
  await c.foto('d07-preview', { marcas: [['#iC', '1'], ['#iS', '2'], ['#iT', '3'], ['#iCrear', '4']] });
  await p.click('#iCrear'); await p.waitForSelector('.cx-lay'); await c.espera(700);
  await c.foto('d07-tabla-creada');
  await ir('/catalogo/main/default', '.cx-lay');
  await p.click('#cxVol'); await c.espera(400); await p.fill('#oNom', 'raw'); await c.espera(200);
  await c.foto('d07-volumen-nuevo', { marcas: [['#oNom', '1'], ['#oSql', '2']] });
  await dlgOk(900);
  await ir('/volumen/main/default/raw', '.cx-lay');
  await p.setInputFiles('#vSubir', csv); await c.espera(900);
  await c.foto('d07-volumen', { marcas: [['label.dbx-btn.primario', '1'], ['[data-v="sql"]', '2']] });
  await p.click('[data-v="sql"]'); await p.waitForSelector('.sqx-ed'); await c.espera(600);
  await p.click('#sqxRun'); await c.espera(400); await libre(); await c.espera(500);
  await c.foto('d07-read-files', { marcas: [['.sqx-ed', '1'], ['#sqxRes', '2']] });

  // ---------------------------------------------------------------- nivel 3: Delta, MERGE, compute
  await ir('/sql', '.sqx-ed');
  await sql('CREATE OR REPLACE TABLE main.default.clientes_demo AS\nSELECT cliente_id, nombre, email, pais, segmento FROM samples.tienda.clientes LIMIT 50;');
  await sql("UPDATE main.default.clientes_demo SET segmento = 'vip' WHERE pais = 'Argentina';");
  await sql('DELETE FROM main.default.clientes_demo WHERE email IS NULL;');
  await sql('DESCRIBE HISTORY main.default.clientes_demo;');
  await c.foto('d09-describe-history', { marcas: [['#sqxRes', null]] });
  await sql("SELECT 'ahora' AS version, COUNT(*) AS vip FROM main.default.clientes_demo WHERE segmento = 'vip'\nUNION ALL\nSELECT 'version 0', COUNT(*) FROM main.default.clientes_demo VERSION AS OF 0 WHERE segmento = 'vip';");
  await c.foto('d09-time-travel', { marcas: [['.sqx-ed', '1'], ['#sqxRes', '2']] });
  await ir('/catalogo/main/default/clientes_demo/historial', '.cx-lay');
  await c.foto('d09-historial-tab');
  await ir('/catalogo/main/default/clientes_demo/detalles', '.cx-lay');
  await c.foto('d09-detalles');
  await ir('/sql', '.sqx-ed');
  await sql("CREATE OR REPLACE TABLE main.default.productos_precio AS\nSELECT producto_id, nombre, precio FROM samples.tienda.productos LIMIT 20;");
  await sql("MERGE INTO main.default.productos_precio AS destino\nUSING (\n  SELECT producto_id, nombre, precio * 1.10 AS precio FROM samples.tienda.productos LIMIT 5\n) AS origen\nON destino.producto_id = origen.producto_id\nWHEN MATCHED THEN UPDATE SET precio = origen.precio\nWHEN NOT MATCHED THEN INSERT *;");
  await c.foto('d10-merge', { marcas: [['.sqx-ed', '1'], ['#sqxRes', '2']] });
  await sql("COPY INTO main.default.devoluciones_raw\nFROM '/Volumes/main/default/raw/devoluciones.csv'\nFILEFORMAT = CSV\nFORMAT_OPTIONS ('header' = 'true', 'inferSchema' = 'true');").catch(() => {});
  await c.foto('d10-copy-into', { marcas: [['#sqxRes', null]] });
  // compute
  await ir('/compute', '.dbx-pag');
  await c.foto('d11-compute', { marcas: [['.dbx-pest', '1'], ['#cNuevo', '2']] });
  await ir('/compute/nuevo', '#cf');
  await p.fill('[name="name"]', 'cluster-equipo-datos'); await p.fill('[name="autoterm"]', '30'); await c.espera(300);
  await c.foto('d11-nuevo', { marcas: [['[name="name"]', '1'], ['[name="spark"]', '2'], ['[name="node"]', '3'], ['[data-trab]', '4'], ['[name="autoterm"]', '5'], ['#cfRes', '6']] });
  await p.click('#cf button[type="submit"]'); await p.waitForSelector('.dbx-pest'); await c.espera(600);
  await c.foto('d11-iniciando', { marcas: [['.dbx-pag-cab h1', null]] });
  await c.espera(5000);
  const clusterUrl = await p.evaluate(() => location.hash);
  await c.foto('d11-cluster', { marcas: [['.dbx-acciones', '1'], ['.dbx-pest', '2']] });
  await c.ir(clusterUrl + '/eventos', '#clP'); await c.espera(500);
  await c.foto('d11-eventos');
  await ir('/warehouses', '.dbx-pag');
  await c.foto('d11-warehouses');
  await ir('/warehouses/nuevo', '#whF');
  await c.foto('d11-warehouse-nuevo', { marcas: [['[name="size"]', '1'], ['[name="autostop"]', '2'], ['[name="tipo"]', '3'], ['#whRes', '4']] });
  await ir('/notebook/' + encodeURIComponent(NB1), '.dbx-nb');
  await p.click('#nbCompute'); await c.espera(300);
  await c.foto('d11-nb-compute', { marcas: [['#dbxMenu', null]] });
  await cerrarMenu();

  // ---------------------------------------------------------------- nivel 4: jobs, pipelines, Unity Catalog
  await ir('/jobs', '.dbx-pag');
  await c.foto('d13-jobs', { marcas: [['.dbx-pest', '1'], ['#jCrear', '2'], ['#jBundle', '3']] });
  await ir('/jobs/nuevo', '#tForm');
  await p.fill('#jNom', 'ventas_diarias'); await p.press('#jNom', 'Enter'); await c.espera(300);
  await p.fill('#tf [name="key"]', 'cargar_ventas');
  await p.selectOption('#tf [name="notebook_path"]', NB1); await c.espera(200);
  await c.foto('d13-tarea', { marcas: [['#jNom', '1'], ['.jb-dag', '2'], ['#tf', '3'], ['#jbD', '4']] });
  await p.click('#tf button.primario'); await c.espera(600);
  await p.click('#tAdd'); await c.espera(300); await menu('SQL'); await c.espera(500);
  await p.fill('#tf [name="key"]', 'control_calidad');
  await p.fill('#tf [name="sql"]', 'SELECT COUNT(*) AS filas FROM main.default.ventas_por_canal');
  await p.check('#tf [name="dep"][value="cargar_ventas"]').catch(() => {}); await c.espera(200);
  await p.click('#tf button.primario'); await c.espera(700);
  await c.foto('d13-dag', { marcas: [['.jb-dag', '1'], ['#tf [name="dep"]', '2'], ['#tf [name="run_if"]', '3'], ['#tf [name="max_retries"]', '4']] });
  await p.click('#jSch'); await c.espera(400);
  await c.foto('d13-schedule', { marcas: [['#dbxCapa .dbx-dlg', null]] });
  await dlgCancelar();
  const jobUrl = await p.evaluate(() => location.hash.replace(/\/tareas.*$/, ''));
  await p.click('#jRun'); await p.waitForSelector('.jr-est', { timeout: 60000 }); await c.espera(800);
  await c.foto('d13-corriendo', { marcas: [['.jb-dag', null]] });
  await p.waitForFunction(() => { const e = document.querySelector('.dbx-pag-cab .jr-est'); return e && !/RUNNING|PENDING/.test(e.textContent); }, null, { timeout: 240000 }); await c.espera(800);
  await p.click('.dag-n[data-t="control_calidad"]').catch(() => {}); await c.espera(600);
  await c.foto('d13-run', { marcas: [['.dbx-pag-cab h1', '1'], ['.jb-dag', '2'], ['.jb-det', '3']] });
  await c.ir(jobUrl + '/runs', '.jr-matriz'); await c.espera(500);
  await c.foto('d13-runs', { marcas: [['.jr-matriz', '1'], ['#jRun', '2'], ['#jRunP', '3']] });
  await p.click('#jJson'); await c.espera(500);
  await c.foto('d22-view-as-code', { marcas: [['#dbxCapa .dbx-dlg', null]] });
  await dlgCancelar();
  // pipelines
  await ir('/pipelines/nuevo', '#pN');
  await c.foto('d14-nuevo', { marcas: [['#pN', '1'], ['#pC', '2'], ['#pS', '3'], ['#pE', '4']] });
  await dlgOk(900); await p.waitForSelector('.pl-lay'); await c.espera(600);
  await c.foto('d14-pipeline', { marcas: [['.pl-ed', '1'], ['.pl-graf', '2'], ['[data-a="start"]', '3'], ['[data-a="validar"]', '4']] });
  await p.click('[data-a="start"]'); await c.espera(1500);
  await c.foto('d14-corriendo', { marcas: [['.pl-nodos', null]] });
  await p.waitForFunction(() => { const e = document.querySelector('.dbx-pag-cab .jr-est'); return e && /COMPLETED|FAILED/.test(e.textContent); }, null, { timeout: 240000 }); await c.espera(800);
  await c.foto('d14-completado', { marcas: [['.dbx-pag-cab h1', '1'], ['.pl-nodos', '2']] });
  await p.click('.pl-n[data-ds="pedidos_silver"]'); await c.espera(500);
  await p.evaluate(() => { const e = document.querySelector('#plDet'); if (e) e.scrollIntoView({ block: 'center' }); }); await c.espera(300);
  await c.foto('d14-calidad', { marcas: [['#plDet', null]] });
  await p.evaluate(() => { const e = document.querySelector('.pl-log'); if (e) e.scrollIntoView({ block: 'center' }); }); await c.espera(300);
  await c.foto('d14-event-log', { marcas: [['.pl-log', null]] });
  // Unity Catalog
  await ir('/catalogo', '.cx-lay');
  await p.click('#cxNuevoCat'); await c.espera(400); await p.fill('#oNom', 'ventas_dev'); await p.fill('#oCom', 'Catálogo de desarrollo del equipo de ventas').catch(() => {}); await c.espera(200);
  await c.foto('d15-nuevo-catalogo', { marcas: [['#oNom', '1'], ['#oSql', '2']] });
  await dlgOk(900);
  await ir('/catalogo/ventas_dev', '.cx-lay');
  await p.click('#cxNuevoEsq'); await c.espera(400); await p.fill('#oNom', 'silver'); await dlgOk(900);
  await ir('/catalogo/ventas_dev', '.cx-lay');
  await c.foto('d15-catalogo-nuevo', { marcas: [['#cxNuevoEsq', '1'], ['#cxPerm', '2']] });
  await ir('/catalogo/main/default/ventas_por_canal/permisos', '.cx-lay');
  await p.click('#cxGrant'); await c.espera(400);
  await p.fill('#gP', 'analistas'); await p.check('#dbxCapa .dbx-checks input[value="SELECT"]').catch(() => {}); await c.espera(200);
  await c.foto('d15-grant', { marcas: [['#gP', '1'], ['#dbxCapa .dbx-checks', '2']] });
  await dlgOk(900); await p.waitForSelector('.cx-lay'); await c.espera(500);
  await c.foto('d15-permisos');
  await ir('/catalogo/main/default/ventas_por_canal/linaje', '.cx-lay');
  await c.foto('d15-linaje', { marcas: [['#cxPest', null]] });
  await ir('/ajustes', '.dbx-pag');
  await c.foto('d19-grupos', { marcas: [['.dbx-pest', '1'], ['#gNuevo', '2']] });

  // ---------------------------------------------------------------- nivel 5: dashboards, alertas, Genie, seguridad
  await ir('/dashboards', '.dbx-pag');
  await p.click('[data-nuevo]'); await c.espera(400);
  await c.foto('d17-nuevo', { marcas: [['#dN', '1'], ['#dS', '2']] });
  await dlgOk(1200); await p.waitForSelector('.dbx-dash'); await c.espera(600);
  await p.click('[data-widget]'); await c.espera(400); await p.fill('#wT', 'Ventas por categoría'); await dlgOk(900);
  await p.waitForSelector('#vTipo'); await p.selectOption('#vTipo', 'bar').catch(() => {}); await c.espera(400);
  await c.foto('d17-viz', { marcas: [['#vTipo', '1'], ['#vX', '2'], ['#vY', '3'], ['#vPrev', '4']] });
  await dlgOk(1200);
  await p.click('[data-filtro]'); await c.espera(600); await dlgOk(1200);
  await c.foto('d17-dashboard', { marcas: [['.dbx-dash-ds', '1'], ['.dbx-dash-filtros', '2'], ['.dbx-dash-grid', '3'], ['[data-publicar]', '4']] });
  await p.click('[data-publicar]'); await c.espera(400); await dlgOk(1200); await c.espera(800);
  await c.foto('d17-publicado');
  await ir('/alertas', '.dbx-pag');
  await p.click('[data-nueva]'); await c.espera(500);
  await c.foto('d17-alerta-nueva', { marcas: [['#aS', '1'], ['#aC', '2'], ['#aO', '3'], ['#aU', '4'], ['#aH', '5']] });
  await dlgOk(1200); await p.waitForSelector('[data-eval]'); await p.click('[data-eval]'); await c.espera(1200);
  await c.foto('d17-alerta', { marcas: [['.dbx-pag-cab h1', '1'], ['[data-eval]', '2']] });
  // genie
  await ir('/genie', '.dbx-pag');
  await p.click('[data-nuevo]'); await c.espera(500);
  for (const t of ['samples.tienda.pedidos', 'samples.tienda.detalle_pedidos', 'samples.tienda.productos']) await p.check(`#dbxCapa .dbx-checklist input[value="${t}"]`).catch(() => {});
  await c.foto('d18-nuevo', { marcas: [['#gN', '1'], ['#dbxCapa .dbx-checklist', '2']] });
  await dlgOk(1200); await p.waitForSelector('#gQ'); await c.espera(400);
  await c.foto('d18-espacio', { marcas: [['#gQ', '1'], ['.dbx-acciones', '2']] });
  await p.fill('#gQ', '¿Cuántos pedidos hay por canal?'); await p.press('#gQ', 'Enter'); await c.espera(2500);
  await p.fill('#gQ', '¿Cuánto vendimos por categoría?'); await p.press('#gQ', 'Enter'); await c.espera(3000);
  await c.foto('d18-chat', { marcas: [['.dbx-g-bot:last-of-type', null]] });
  const genieUrl = await p.evaluate(() => location.hash.split('?')[0]);
  await c.ir(genieUrl + '?tab=config', '#gI'); await c.espera(500);
  await c.foto('d18-config', { marcas: [['#gI', '1'], ['#gEP', '2'], ['#gES', '3']] });
  // seguridad: filtro de fila y máscara
  await ir('/sql', '.sqx-ed');
  await sql("CREATE OR REPLACE FUNCTION main.default.solo_mi_pais(pais STRING)\nRETURNS BOOLEAN\nRETURN is_account_group_member('admins') OR pais = 'Argentina';");
  await sql('ALTER TABLE main.default.clientes_demo SET ROW FILTER main.default.solo_mi_pais ON (pais);');
  await sql("CREATE OR REPLACE FUNCTION main.default.ocultar_email(email STRING)\nRETURNS STRING\nRETURN CASE WHEN is_account_group_member('soporte') THEN email ELSE '***' END;");
  await sql('ALTER TABLE main.default.clientes_demo ALTER COLUMN email SET MASK main.default.ocultar_email;');
  await sql('SELECT cliente_id, nombre, email, pais FROM main.default.clientes_demo LIMIT 10;');
  await c.foto('d19-mascara-sql', { marcas: [['#sqxRes', null]] });
  await ir('/catalogo/main/default/clientes_demo', '.cx-lay');
  await c.foto('d19-mascara', { marcas: [['.cx-seg', null]] });
  await ir('/secrets', '.dbx-pag');
  await c.foto('d19-secretos');
  await ir('/ajustes/dev', '.dbx-pag');
  await c.foto('d19-tokens');

  // ---------------------------------------------------------------- nivel 6: MLflow, código
  await ir('/experimentos', '.dbx-pag');
  await c.foto('d21-experimentos', { marcas: [['[data-ej]', null]] });
  await p.click('[data-ej]'); await p.waitForSelector('.dbx-nb'); await c.espera(800);
  await correr(1, 800); await correr(2, 800);
  await verCelda(1);
  await c.foto('d21-notebook', { marcas: [[celdaSel(2) + ' .nb-c-out', null]] });
  await ir('/experimentos', '.dbx-pag');
  await p.click('.dbx-tabla a'); await c.espera(700);
  await c.foto('d21-runs', { marcas: [['.dbx-tabla', '1'], ['[data-comparar]', '2']] });
  const sels = await p.$$('[data-sel]'); for (const s of sels.slice(0, 3)) await s.check().catch(() => {});
  await p.click('[data-comparar]'); await c.espera(500);
  await p.evaluate(() => { const e = document.querySelector('#mlComp'); if (e) e.scrollIntoView({ block: 'center' }); }); await c.espera(300);
  await c.foto('d21-comparar', { marcas: [['#mlComp', null]] });
  await ir('/modelos', '.dbx-pag');
  await c.foto('d21-modelos');
  await p.click('.dbx-tabla a'); await c.espera(600);
  await c.foto('d21-modelo', { marcas: [['.dbx-tabla', '1'], ['[data-alias]', '2']] });
  await ir('/recientes', '.dbx-pag');
  await c.foto('d23-recientes');
  await ir('/ajustes/prefs', '.dbx-pag');
  await c.foto('d23-apariencia');
}
