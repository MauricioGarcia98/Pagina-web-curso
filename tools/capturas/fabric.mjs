// Guion de capturas del curso de Microsoft Fabric (assets/img/guias/fabric/)
// Historia: el equipo de datos de Tienda Andina arma su analítica en Fabric: workspace, lakehouse, notebooks, pipelines,
// warehouse, modelo semántico, Git y operación.
export default async function (c) {
  const p = c.page;
  const w = (ms) => c.espera(ms);
  const log = (...a) => console.log('   [fabric]', ...a);
  const HASTA = Number(process.env.FB_HASTA || 99);
  const ir = async (h, ms = 800) => { await p.evaluate((x) => { location.hash = x; }, h); await w(ms); };
  const wsId = () => p.evaluate(() => { const m = /#\/fabric\/ws\/([^/?]+)/.exec(location.hash); return m ? m[1] : null; });
  const itemId = () => p.evaluate(() => { const m = /#\/fabric\/ws\/[^/?]+\/([^/?]+)/.exec(location.hash); return m ? m[1] : null; });
  const modalOk = async (sel, ms = 700) => { await p.click(sel); await w(ms); };
  const cerrar = async () => { await p.evaluate(() => { const m = document.getElementById('fbModal'); if (m) m.innerHTML = ''; document.querySelectorAll('.fb-ctx').forEach((x) => x.remove()); }); await w(150); };
  const archivo = (nombre, texto) => ({ name: nombre, mimeType: 'text/csv', buffer: Buffer.from(texto) });
  const nuevoItem = async (wid, tipo, nombre) => { await ir(`#/fabric/ws/${wid}`); await p.click('#fbNuevo'); await w(400); await p.click(`[data-tipo="${tipo}"]`); await w(400); await p.fill('#niN', nombre); await modalOk('#niOk', 1200); return itemId(); };
  const ventas = ['venta_id,fecha,tienda,producto_id,cantidad,precio_unitario',
    ...Array.from({ length: 12 }, (_, i) => `${2001 + i},2026-11-${String(10 + (i % 6)).padStart(2, '0')},${['Lima Centro', 'Bogotá Norte', 'CDMX Roma', 'Santiago Providencia'][i % 4]},${101 + (i * 7) % 30},${1 + (i % 4)},${(9.9 + (i * 13) % 60).toFixed(2)}`)].join('\n') + '\n';

  await c.ir('#/fabric', '.fbp'); await w(1200);

  // ================================================================ Nivel 1 · lección 1: qué es Fabric y la pantalla
  await c.foto('b01-home', { marcas: [['.fb-top', '1'], ['.fb-nav', '2'], ['.fb-crear', '3']] });
  await ir('#/fabric/create');
  await c.foto('b01-create', { marcas: [['.fb-pag', null]] });
  await p.click('[data-ws-flyout]'); await w(400);
  await c.foto('b01-workspaces', { marcas: [['#fbFly', null]] });
  if (HASTA <= 1) return;

  // ================================================================ lección 2: workspaces
  await p.click('#fbNuevoWs'); await w(500);
  await p.fill('#wsN', 'Tienda Andina - Datos'); await p.fill('#wsD', 'Analítica de ventas de Tienda Andina (entorno de desarrollo)');
  await c.foto('b02-nuevo-ws', { marcas: [['#wsN', '1'], ['#wsD', '2'], ['.fb-det', '3']] });
  await modalOk('#wsOk', 1200);
  const WS = await wsId(); log('ws', WS);
  await c.foto('b02-ws-vacio', { marcas: [['.fb-ws-h', '1'], ['#fbNuevo', '2'], ['#fbWsSet', '3']] });
  await p.click('#fbWsSet'); await w(500);
  await c.foto('b02-ajustes', { marcas: [['#fbModal .fb-panel', null]] });
  await cerrar();
  if (HASTA <= 2) return;

  // ================================================================ lección 3: el primer lakehouse
  await p.click('#fbNuevo'); await w(500);
  await c.foto('b03-nuevo-item', { marcas: [['#fbModal .fb-panel', null]] });
  await p.click('[data-tipo="lakehouse"]'); await w(400);
  await p.fill('#niN', 'lh bronze');
  await p.click('#niOk'); await w(400);
  await c.foto('b03-nombre-error', { marcas: [['#niN', '1'], ['#niNota', '2']] });
  await cerrar(); await p.click('#fbNuevo'); await w(400); await p.click('[data-tipo="lakehouse"]'); await w(400);
  await p.fill('#niN', 'lh_ventas');
  await c.foto('b03-nuevo-lakehouse', { marcas: [['#niN', '1'], ['#niW', '2']] });
  await modalOk('#niOk', 1500);
  const LH = await itemId(); log('lh', LH);
  await c.foto('b03-lakehouse', { marcas: [['#lhExp', '1'], ['.fb-lh-inicio .fb-crear', '2'], ['#lhModo', '3']] });
  if (HASTA <= 3) return;

  // ================================================================ lección 4 (proyecto): subir un CSV y cargarlo a una tabla
  await p.setInputFiles('#lhFile', [archivo('ventas_tiendas.csv', ventas)]); await w(800);
  await c.foto('b04-files', { marcas: [['#lhExp', '1'], ['#lhMain .fb-tabla', '2']] });
  await p.click('[data-archivo="ventas_tiendas.csv"]'); await w(600);
  await c.foto('b04-preview', { marcas: [['[data-cargar]', '1'], ['#lhMain', '2']] });
  await p.click('[data-cargar]'); await w(500);
  await c.foto('b04-cargar', { marcas: [['#ltN', '1'], ['#ltH', '2'], ['#ltS', '3']] });
  await modalOk('#ltOk', 1200);
  await c.foto('b04-tabla', { marcas: [['#lhExp [data-tabla="ventas_tiendas"]', '1'], ['#lhMain', '2']] });
  if (HASTA <= 4) return;

  // ================================================================ Nivel 2 · lección 5: datos de ejemplo y tablas Delta
  await p.click('[data-rmenu="get"]'); await w(300);
  await c.foto('b05-get-data', { marcas: [['[data-rmenu-de="get"]', null]] });
  await p.click('#mMuestra'); await w(500);
  await p.evaluate(() => { document.querySelectorAll('#fbModal input[type=checkbox]').forEach((x) => { x.checked = ['clientes', 'productos', 'pedidos', 'detalle_pedidos'].includes(x.value); }); });
  await c.foto('b05-muestras', { marcas: [['#fbModal .fb-modal', null]] });
  await modalOk('#smOk', 1200);
  await p.click('#lhExp [data-tabla="pedidos"]'); await w(800);
  await c.foto('b05-tabla', { marcas: [['#lhExp', '1'], ['.fb-tabla-h', '2']] });
  await p.click('#lhExp [data-menu-t="pedidos"]'); await w(300);
  await c.foto('b05-menu-tabla', { marcas: [['.fb-ctx', null]] });
  await p.evaluate(() => { const a = [...document.querySelectorAll('.fb-ctx a')].find((x) => x.textContent === 'Properties'); if (a) a.click(); }); await w(500);
  await c.foto('b05-propiedades', { marcas: [['#fbModal .fb-modal', null]] });
  await cerrar();
  await p.click('#lhExp [data-menu-t="pedidos"]'); await w(300);
  await p.evaluate(() => { const a = [...document.querySelectorAll('.fb-ctx a')].find((x) => x.textContent === 'Maintenance'); if (a) a.click(); }); await w(500);
  await c.foto('b05-mantenimiento', { marcas: [['#fbModal .fb-modal', null]] });
  await cerrar();
  if (HASTA <= 5) return;

  // ================================================================ lección 6: el SQL analytics endpoint
  await p.selectOption('#lhModo', 'sql'); await w(1200);
  await c.foto('b06-endpoint', { marcas: [['#lhModo', '1'], ['#lhExp', '2'], ['#sqTxt', '3']] });
  await p.fill('#sqTxt', 'SELECT canal, COUNT(*) AS pedidos\nFROM dbo.pedidos\nGROUP BY canal\nORDER BY pedidos DESC;'); await p.dispatchEvent('#sqTxt', 'input');
  await p.click('#sqRun'); await w(1500);
  await c.foto('b06-consulta', { marcas: [['#sqTxt', '1'], ['#sqRes', '2']] });
  await p.fill('#sqTxt', "DELETE FROM dbo.pedidos WHERE estado = 'cancelado';"); await p.dispatchEvent('#sqTxt', 'input');
  await p.click('#sqRun'); await w(1200);
  await c.foto('b06-solo-lectura', { marcas: [['#sqRes', null]] });
  await p.selectOption('#lhModo', 'lake'); await w(1000);
  if (HASTA <= 6) return;

  // ================================================================ lección 7: accesos directos (shortcuts)
  const LH2 = await nuevoItem(WS, 'lakehouse', 'lh_reportes'); log('lh2', LH2);
  await p.click('#lhAtajo'); await w(500);
  await p.evaluate(() => { const s = document.querySelector('#atF'); const i = [...s.options].findIndex((o) => /lh_ventas \/ pedidos$/.test(o.textContent)); if (i >= 0) { s.selectedIndex = i; s.dispatchEvent(new Event('change')); } });
  await c.foto('b07-atajo', { marcas: [['#atF', '1'], ['#atN', '2']] });
  await modalOk('#atOk', 1000);
  await p.click('#lhExp [data-atajo="pedidos"]'); await w(800);
  await c.foto('b07-atajo-tabla', { marcas: [['#lhExp [data-atajo]', '1'], ['.fb-tabla-h', '2']] });
  if (HASTA <= 7) return;

  // ================================================================ lección 8 (proyecto): el lakehouse de ventas, ordenado
  await ir(`#/fabric/ws/${WS}/${LH}`, 1200);
  await p.click('#lhExp [data-carpeta="raw"]').catch(() => log('sin carpeta raw')); await w(700);
  await c.foto('b08-files-raw', { marcas: [['#lhExp', '1'], ['#lhMain .fb-tabla', '2']] });
  await ir(`#/fabric/ws/${WS}`, 900);
  await c.foto('b08-ws-items', { marcas: [['.fb-pag .fb-tabla', null]] });
  if (HASTA <= 8) return;

  // ================================================================ Nivel 3 · lección 9: notebooks
  await ir(`#/fabric/ws/${WS}/${LH}`, 1200);
  await p.click('#lhNb2').catch(() => p.click('#lhNb')); await w(1800);
  const NB = await itemId(); log('nb', NB);
  await c.foto('b09-notebook', { marcas: [['#nbLh', '1'], ['#nbCeldas', '2'], ['#nbAll', '3']] });
  await p.click('#nbAll'); await w(25000);
  await c.foto('b09-celda', { marcas: [['#nbCeldas', null]] });
  if (HASTA <= 9) return;

  // ================================================================ lección 10: transformar con Spark SQL y PySpark
  const celda = async (src) => { await p.click('#nbAddC'); await w(500); const loc = p.locator('#nbCeldas textarea[data-src]').last(); await loc.fill(src); await loc.dispatchEvent('input'); await loc.dispatchEvent('change'); await loc.dispatchEvent('blur'); await w(300); };
  await celda('%%sql\nCREATE OR REPLACE TABLE ventas_por_canal AS\nSELECT canal, COUNT(*) AS pedidos\nFROM pedidos\nGROUP BY canal');
  await celda('df = spark.table("ventas_tiendas")\nresumen = df.groupBy("tienda").sum("cantidad")\nresumen.write.mode("overwrite").saveAsTable("unidades_por_tienda")\ndisplay(resumen)');
  await p.click('#nbAll'); await w(25000);
  await p.evaluate(() => { const cs = document.querySelectorAll('#nbCeldas [data-cel]'); if (cs.length > 1) cs[1].scrollIntoView({ block: 'start' }); }); await w(400);
  await c.foto('b10-celdas', { marcas: [['#nbCeldas [data-cel]:nth-of-type(2)', '1'], ['#nbCeldas [data-cel]:nth-of-type(3)', '2']] });
  await ir(`#/fabric/ws/${WS}/${LH}`, 1200);
  await p.click('#lhExp [data-tabla="unidades_por_tienda"]').catch(() => log('sin unidades_por_tienda')); await w(800);
  await c.foto('b10-tablas-nuevas', { marcas: [['#lhExp', '1'], ['#lhMain', '2']] });
  if (HASTA <= 10) return;

  // ================================================================ lección 11: pipelines en Fabric
  const PL = await nuevoItem(WS, 'pipeline', 'pl_cargar_pedidos'); log('pl', PL);
  await c.foto('b11-pipeline-vacio', { marcas: [['.fb-rcmds', '1'], ['.fb-lienzo', '2']] });
  const elegir = async (i) => { if (!(await p.$('.fb-pl-props [data-p="nombre"]'))) { const xs = await p.$$('.fb-act'); if (xs[i]) { await xs[i].click(); await w(500); } } };
  await p.click('#plCopy'); await w(600); await elegir(0);
  const props = async (k, v) => { const el = p.locator(`.fb-pl-props [data-p="${k}"]`).first(); const tag = await el.evaluate((e) => e.tagName); if (tag === 'SELECT') { await el.selectOption(v); } else { await el.fill(v); } await el.dispatchEvent('change'); await w(500); };
  await props('nombre', 'Copiar pedidos');
  const opsSrc = await p.$$eval('.fb-pl-props [data-p="src"] option', (o) => o.map((x) => x.value)).catch(() => []); log('src', opsSrc.join(','));
  await props('src', 'pedidos').catch((e) => log('src', e.message.slice(0, 60)));
  await props('destItem', LH); await props('destTabla', 'pedidos_copia');
  await c.foto('b11-copy', { marcas: [['.fb-pl-props', null]] });
  await p.click('#plNb'); await w(600);
  await elegir(1);
  await props('nombre', 'Transformar');
  await props('nb', NB).catch((e) => log('nb', e.message.slice(0, 60)));
  await c.foto('b11-notebook', { marcas: [['.fb-lienzo', '1'], ['.fb-pl-props', '2']] });
  await p.click('#plRun'); await w(40000);
  await c.foto('b11-run', { marcas: [['.fb-lienzo', '1'], ['.fb-pl-props', '2']] });
  if (HASTA <= 11) return;

  // ================================================================ lección 12 (proyecto): pipeline y monitoreo
  await ir('#/fabric/monitor', 900);
  await c.foto('b12-monitor', { marcas: [['.fb-pag .fb-tabla', null]] });
  await ir(`#/fabric/ws/${WS}?vista=lineage`, 900);
  await c.foto('b12-linaje', { marcas: [['.fb-linaje', null]] });
  if (HASTA <= 12) return;

  // ================================================================ Nivel 4 · lección 13: warehouse
  const WH = await nuevoItem(WS, 'warehouse', 'wh_ventas'); log('wh', WH);
  await c.foto('b13-warehouse', { marcas: [['.fb-rcmds', '1'], ['#whExp', '2'], ['#whSql', '3']] });
  const sql = async (q, ms = 1500) => { await p.fill('#sqTxt', q); await p.dispatchEvent('#sqTxt', 'input'); await p.click('#sqRun'); await w(ms); };
  await sql("CREATE TABLE dbo.metas_tienda (\n  tienda VARCHAR(50),\n  mes DATE,\n  meta_unidades INT\n);\nINSERT INTO dbo.metas_tienda VALUES\n  ('Lima Centro', '2026-11-01', 40),\n  ('Bogotá Norte', '2026-11-01', 35),\n  ('CDMX Roma', '2026-11-01', 30),\n  ('Santiago Providencia', '2026-11-01', 25);");
  await c.foto('b13-create-insert', { marcas: [['#sqTxt', '1'], ['#sqRes', '2']] });
  await sql("SELECT m.tienda, m.meta_unidades, u.unidades\nFROM dbo.metas_tienda AS m\nJOIN (SELECT tienda, SUM(cantidad) AS unidades\n      FROM lh_ventas.dbo.ventas_tiendas GROUP BY tienda) AS u\n  ON u.tienda = m.tienda;");
  await c.foto('b13-cruzada', { marcas: [['#sqTxt', '1'], ['#sqRes', '2']] });
  if (HASTA <= 13) return;

  // ================================================================ lección 14: vistas y la capa para el negocio
  await sql("CREATE VIEW dbo.v_avance_metas AS\nSELECT m.tienda, m.meta_unidades, u.unidades,\n       ROUND(100.0 * u.unidades / m.meta_unidades, 1) AS pct_avance\nFROM dbo.metas_tienda AS m\nJOIN (SELECT tienda, SUM(cantidad) AS unidades\n      FROM lh_ventas.dbo.ventas_tiendas GROUP BY tienda) AS u\n  ON u.tienda = m.tienda;");
  await c.foto('b14-create-view', { marcas: [['#sqTxt', '1'], ['#sqRes', '2']] });
  await sql('SELECT * FROM dbo.v_avance_metas ORDER BY pct_avance DESC;');
  await c.foto('b14-vista', { marcas: [['#whExp', '1'], ['#sqRes', '2']] });
  if (HASTA <= 14) return;

  // ================================================================ lección 15: el modelo semántico
  await ir(`#/fabric/ws/${WS}/${LH}`, 1200);
  await p.click('#lhSm'); await w(1500);
  const SM = await itemId(); log('sm', SM);
  await c.foto('b15-modelo', { marcas: [['#smTablas', '1'], ['.fb-rcmds', '2']] });
  await p.click('#smMedida').catch(() => log('sin smMedida')); await w(500);
  const camposMd = await p.$$eval('#fbModal input, #fbModal textarea, #fbModal select', (x) => x.map((e) => e.id || e.tagName)).catch(() => []); log('medida', camposMd.join(','));
  if (await p.$('#mdN')) { await p.fill('#mdN', 'Pedidos'); await p.fill('#mdE', 'COUNTROWS(pedidos)'); await c.foto('b15-medida', { marcas: [['#mdN', '1'], ['#mdE', '2']] }); await modalOk('#mdOk', 800); }
  await p.evaluate(() => { const h = [...document.querySelectorAll('h3, h4, b, div')].find((x) => x.textContent.trim() === 'Measures'); if (h) h.scrollIntoView({ block: 'start' }); }); await w(400);
  await c.foto('b15-modelo-medida');
  if (HASTA <= 15) return;

  // ================================================================ lección 16 (proyecto): el modelo de ventas para Power BI
  await p.evaluate(() => { const b = document.querySelector('#smRep'); if (b) b.scrollIntoView({ block: 'center' }); }); await w(300);
  await c.foto('b16-informe', { marcas: [['#smRep', '1'], ['#smCsv', '2']] });
  await ir(`#/fabric/ws/${WS}?vista=lineage`, 900);
  await c.foto('b16-linaje', { marcas: [['.fb-linaje', null]] });
  if (HASTA <= 16) return;

  // ================================================================ Nivel 5 · lección 17: Monitor
  await ir('#/fabric/monitor', 900);
  await c.foto('b17-monitor', { marcas: [['.fb-pag .fb-tabla', null]] });
  if (HASTA <= 17) return;

  // ================================================================ lección 18: OneLake catalog
  await ir('#/fabric/onelake', 900);
  await c.foto('b18-onelake', { marcas: [['.fb-filtros', '1'], ['.fb-pag .fb-tabla', '2']] });
  await ir('#/fabric/onelake?tipo=lakehouse', 900);
  await c.foto('b18-filtro', { marcas: [['.fb-filtros', null]] });
  await ir(`#/fabric/ws/${WS}/${LH}`, 1200);
  await p.click('#lhExp [data-carpeta="raw"]').catch(() => {}); await w(500);
  await p.click('#lhMain [data-menu-a]').catch(() => log('sin menu archivo')); await w(300);
  await c.foto('b18-abfs', { marcas: [['.fb-ctx', null]] });
  await cerrar();
  if (HASTA <= 18) return;

  // ================================================================ lección 19: Git
  await c.ir('#/github/new', '#nrNombre'); await w(800);
  await p.fill('#nrNombre', 'fabric-tienda-andina'); await w(400);
  await p.click('#nrCrear'); await w(1500);
  await c.ir(`#/fabric/ws/${WS}`, '.fbp'); await w(900);
  await p.click('#fbWsSet'); await w(500);
  await c.foto('b19-git-conectar', { marcas: [['#saRepo', '1'], ['#saRama', '2'], ['#saCarp', '3']] });
  await p.click('#saGit').catch(() => log('sin saGit')); await w(1000);
  await ir(`#/fabric/ws/${WS}`, 900);
  await c.foto('b19-source-control', { marcas: [['#fbSrc', null]] });
  await p.click('#fbSrc').catch(() => log('sin fbSrc')); await w(500);
  await c.foto('b19-cambios', { marcas: [['#fbModal .fb-panel', null]] });
  if (HASTA <= 19) return;

  // ================================================================ lección 20 (proyecto): el workspace versionado
  await p.fill('#gcM', 'Primera versión: lakehouse, notebook, pipeline, warehouse y modelo').catch(() => {});
  await p.click('#gcOk').catch(() => log('sin gcOk')); await w(1200);
  await c.ir('#/github', '.ghp').catch(() => {}); await w(800);
  await ir('#/github/alumno/fabric-tienda-andina', 1200);
  await c.foto('b20-repo');
  if (HASTA <= 20) return;

  // ================================================================ Nivel 6 · lección 21: licencias y seguridad
  await c.ir('#/fabric', '.fbp'); await w(800);
  await p.click('[data-ws-flyout]'); await w(300); await p.click('#fbNuevoWs'); await w(400);
  await p.fill('#wsN', 'Informes Pro'); await p.check('[name=wsL] >> nth=2'); await modalOk('#wsOk', 1200);
  await c.foto('b21-pro', { marcas: [['.fb-aviso', null]] });
  if (HASTA <= 21) return;

  // ================================================================ lección 22: capacidad y costos
  await ir(`#/fabric/ws/${WS}`, 900);
  await p.click('#fbWsSet'); await w(500);
  await c.foto('b22-licencia', { marcas: [['#fbModal .fb-panel', null]] });
  await cerrar();
  await c.foto('b22-trial', { recorte: '.fb-top', marcas: [['.fb-trial', null]] });
  await cerrar();
  if (HASTA <= 22) return;

  // ================================================================ lección 23: tiempo real (Eventstream, Eventhouse, KQL)
  const EH = await nuevoItem(WS, 'eventhouse', 'Deposito');
  const ES = await nuevoItem(WS, 'eventstream', 'StreamFrio');
  await p.click('#esSrc'); await w(400); await p.check('[name=esF][value=frio]'); await modalOk('#esOk', 600);
  await p.click('#esDst'); await w(400); await p.selectOption('#esD', EH); await p.fill('#esT', 'Lecturas'); await modalOk('#esOk', 600);
  await p.click('#esPub'); await w(800); // al publicar, el stream trae los eventos de los últimos minutos
  await ir(`#/fabric/ws/${WS}/${ES}`, 1500);
  await c.foto('b23-eventstream', { marcas: [['.fb-es-canvas', '1'], ['.fb-kpis', '2'], ['.fb-pag .fb-tabla', '3']] });
  await ir(`#/fabric/ws/${WS}/${EH}`, 1200);
  await p.fill('#ehQ', 'Lecturas\n| summarize promedio = avg(temperatura) by camara, bin(ts, 5m)\n| render timechart');
  await p.click('#ehRun'); await w(1500);
  await c.foto('b23-kql', { marcas: [['#ehQ', '1'], ['.fb-graf', '2'], ['#ehR .fb-tabla', '3']] });
  log('eh', EH, 'es', ES);

  // ================================================================ lección 25: de la práctica a Fabric real
  await ir('#/fabric/create', 800);
  await c.foto('b23-create', { marcas: [['.fb-pag', null]] });
  if (HASTA <= 25) return;

  // ================================================================ lección 26 (proyecto final)
  await ir(`#/fabric/ws/${WS}`, 900);
  await c.foto('b24-ws', { marcas: [['.fb-pag .fb-tabla', null]] });
  await ir(`#/fabric/ws/${WS}?vista=lineage`, 900);
  await c.foto('b24-linaje', { marcas: [['.fb-linaje', null]] });
}
