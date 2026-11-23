// Guion de capturas de la consola de AWS de práctica (assets/img/guias/aws/)
// Historia: el equipo de Tienda Andina arma su lago en AWS: bucket con pedidos por mes, crawler de Glue y Athena.
export default async function (c) {
  const p = c.page;
  const w = (ms) => c.espera(ms);
  const ir = async (h, ms = 700) => { await p.evaluate((x) => { location.hash = x; }, h); await w(ms); };
  const B = 'tienda-andina-lago-dev';
  await c.ir('#/aws', '.awp'); await w(500);
  await ir('#/aws/s3/crear'); await p.fill('#awBN', B); await p.click('#awBCrear'); await w(900);
  await p.click('[data-subir]'); await w(300); await p.click('[data-ej="pedidos"]'); await w(900); await p.click('#awUpOk'); await w(900);
  await p.evaluate(() => { const f = document.querySelector('#awFlash'); if (f) f.innerHTML = ''; });
  await c.foto('a01-bucket', { marcas: [['.aw-tabla', '1'], ['[data-subir]', '2']] });
  await ir('#/aws/glue/databases'); await p.click('[data-nueva]'); await p.fill('#awDN', 'lago_bronze'); await p.click('#awDNok'); await w(400);
  await ir('#/aws/iam/roles/crear'); await p.check('[data-pol="AmazonS3ReadOnlyAccess"]'); await p.fill('#awRN', 'GlueCrawlerRole-pedidos'); await p.click('#awROk'); await w(500);
  await ir('#/aws/glue/crawlers/crear'); await p.fill('#awCrN', 'crawler-pedidos'); await p.fill('#awCrP', `s3://${B}/pedidos/`); await p.selectOption('#awCrR', 'GlueCrawlerRole-pedidos'); await p.click('#awCrOk'); await w(800);
  await p.check('[name=awSelC]'); await p.click('[data-run]'); await w(1500);
  await ir('#/aws/glue/tables/lago_bronze/pedidos', 900);
  await c.foto('a02-tabla', { marcas: [['.aw-dl', '1'], ['.aw-cont:nth-of-type(2) .aw-tabla', '2']] });
  await ir('#/aws/athena/settings'); await p.fill('#awAO', `s3://${B}/athena-resultados/`); await p.click('[data-guardar]'); await w(400);
  await ir('#/aws/athena', 800);
  await p.fill('#awASql', 'SELECT anio_mes, COUNT(*) AS pedidos\nFROM "lago_bronze"."pedidos"\nGROUP BY anio_mes\nORDER BY anio_mes;'); await p.click('#awARun');
  await p.waitForSelector('.aw-ath-meta', { timeout: 60000 }); await w(400);
  await c.foto('a03-athena', { marcas: [['#awADb', '1'], ['#awASql', '2'], ['.aw-ath-meta', '3']] });

  // ================================================================ aws/09: proyecto pipeline serverless
  const sh = (cmds) => p.evaluate(async (cs) => { if (!window.Shell.Machine.ready) window.Shell.Machine.load(); const o = []; for (const x of cs) { const r = await window.Shell.runLine(x, { autoLogin: true }); o.push(r.code); } return o; }, cmds);
  await ir('#/aws/glue/databases'); await p.click('[data-nueva]'); await p.fill('#awDN', 'lago_silver'); await p.click('#awDNok'); await w(400);
  await ir('#/aws/glue/jobs/crear'); await p.fill('#gjN', 'pedidos-silver'); await p.click('[data-ok]'); await w(800);
  await p.fill('#gFr', `s3://${B}/pedidos/`); await p.click('[data-prev]'); await w(800);
  // Change Schema: se queda con las columnas del proyecto y sus tipos
  await p.evaluate(() => { const filas = [...document.querySelectorAll('.aws2-map tbody tr')]; const tipos = { pedido_id: 'int', cliente_id: 'int', fecha_pedido: 'date' }; for (const tr of filas) { const src = tr.querySelector('[data-x="0"]').value; if (tipos[src]) tr.querySelector('[data-x="2"]').value = tipos[src]; } });
  await p.click('[data-guardar]'); await w(500);
  for (const col of ['metodo_pago', 'empleado_id']) { const i = await p.evaluate((c2) => [...document.querySelectorAll('.aws2-map tbody tr')].findIndex((tr) => tr.querySelector('[data-x="0"]').value === c2), col); if (i >= 0) { await p.click(`[data-qc="0:${i}"]`); await w(400); } }
  await p.click('[data-guardar]'); await w(500);
  await p.click('[data-add="filtro"]'); await w(400); await p.fill('[data-p="1"][data-k="col"]', 'estado'); await p.selectOption('[data-p="1"][data-k="op"]', '!='); await p.fill('[data-p="1"][data-k="val"]', 'cancelado');
  await p.click('[data-add="dedup"]'); await w(400); await p.fill('[data-p="2"][data-k="claves"]', 'pedido_id');
  await p.fill('#gDr', `s3://${B}/silver/pedidos/`); await p.fill('#gDp', 'anio_mes'); await p.selectOption('#gDc', '1'); await w(500);
  await p.selectOption('#gDd', 'lago_silver'); await p.fill('#gDt', 'pedidos'); await p.click('[data-guardar]'); await w(600);
  await p.evaluate(() => { const f = document.querySelector('#awFlash'); if (f) f.innerHTML = ''; });
  await c.foto('a04-glue-studio', { marcas: [['.aws2-src', '1'], ['.aws2-tr', '2'], ['.aws2-dst', '3']] });
  await p.click('[data-correr]'); await w(3500);
  // la Lambda que valida
  await ir('#/aws/lambda/crear'); await p.fill('#lN', 'validar-pedidos'); await p.click('[data-ok]'); await w(800);
  const codigo = await p.evaluate(async () => { const r = await fetch('content/aws/09-proyecto-pipeline-serverless.md'); return r.ok ? r.text() : ''; });
  const py = (/```python norun\n([\s\S]*?)```/.exec(codigo) || [])[1];
  if (py) { await p.fill('#lC', py); await p.click('[data-deploy]'); await w(500); }
  await ir('#/aws/lambda/f/validar-pedidos/config'); await p.click('[data-trig]'); await w(300); await p.selectOption('#tB', B); await p.fill('#tP', 'landing/pedidos/'); await p.fill('#tS', '.csv'); await p.click('#tOk'); await w(500);
  await sh([`printf 'pedido_id,cliente_id,empleado_id,fecha_pedido,estado,canal,metodo_pago\n90001,15,,2026-11-22,entregado,web,tarjeta_debito\n' > pedidos_2026-11-22.csv`, `aws s3 cp pedidos_2026-11-22.csv s3://${B}/landing/pedidos/`, "printf 'id;fecha;total\n1;2026-11-22;10\n' > roto.csv", `aws s3 cp roto.csv s3://${B}/landing/pedidos/`]);
  await w(9000);
  await ir('#/aws/lambda/f/validar-pedidos'); await p.click('[data-test]'); await w(5000);
  await c.foto('a05-lambda', { marcas: [['.aws2-fn', '1'], ['.aws2-ide', '2'], ['#lOut', '3']] });
  // Step Functions: plantilla + control con Athena, después una ejecución que falla
  await ir('#/aws/stepfunctions/crear'); await p.selectOption('#sJ', 'pedidos-silver'); await p.fill('#sN', 'pipeline-pedidos'); await p.click('[data-ok]'); await w(700);
  await p.evaluate(() => { const m = window.CloudSim.aws().sfn['pipeline-pedidos']; const D = JSON.parse(m.definicion); D.States['Ejecutar ETL'].Next = 'Contar filas'; D.States['Contar filas'] = { Type: 'Task', Resource: 'arn:aws:states:::athena:startQueryExecution.sync', Parameters: { QueryString: 'SELECT COUNT(*) AS filas FROM "lago_silver"."pedidos"', WorkGroup: 'primary' }, ResultPath: '$.control', Catch: [{ ErrorEquals: ['States.ALL'], ResultPath: '$.error', Next: 'Avisar fallo' }], Next: 'Avisar exito' }; m.definicion = JSON.stringify(D, null, 2); window.CloudSim.save(); });
  await sh([`aws stepfunctions start-execution --state-machine-arn arn:aws:states:us-east-1:123456789012:stateMachine:pipeline-pedidos --input '{"fecha": "2026-11-22"}' --name noche-ok`]); await w(4000);
  await p.evaluate((b) => { window.CloudSim.aws().glueJobs['pedidos-silver'].def.destino.ruta = 's3://bucket-que-no-existe/silver/pedidos/'; window.CloudSim.save(); void b; }, B);
  await sh([`aws stepfunctions start-execution --state-machine-arn arn:aws:states:us-east-1:123456789012:stateMachine:pipeline-pedidos --input '{"fecha": "2026-11-23"}' --name noche-falla`]); await w(4000);
  await ir('#/aws/stepfunctions/sm/pipeline-pedidos/ej/noche-falla', 900);
  await c.foto('a06-step-functions', { marcas: [['.aws2-grafo', '1'], ['.aw-alerta', '2']] });
  await p.evaluate((b) => { window.CloudSim.aws().glueJobs['pedidos-silver'].def.destino.ruta = `s3://${b}/silver/pedidos/`; window.CloudSim.save(); }, B);
  // alarma sobre ejecuciones fallidas
  await p.evaluate(() => { const s = window.CloudSim.aws(); s.alarmas = (s.alarmas || []).filter((a) => a.nombre !== 'pipeline-pedidos-fallido'); s.alarmas.push({ nombre: 'pipeline-pedidos-fallido', ns: 'AWS/States', metrica: 'ExecutionsFailed', dims: { StateMachineArn: 'pipeline-pedidos' }, estadistica: 'Sum', periodo: 60, comparacion: 'GreaterThanThreshold', umbral: 0, faltantes: 'notBreaching', sns: 'alertas-datos', estado: 'INSUFFICIENT_DATA', creada: new Date().toISOString() }); const t = s.sns['alertas-datos']; t.subs = t.subs || []; if (!t.subs.length) t.subs.push({ proto: 'email', ep: 'guardia@tiendaandina.example', protocolo: 'email', endpoint: 'guardia@tiendaandina.example' }); window.CloudSim.save(); });
  await ir('#/aws/cloudwatch/alarmas', 900);
  await c.foto('a07-cloudwatch', { marcas: [['.aw-cont:nth-of-type(1) .aw-tabla', '1'], ['.aw-cont:nth-of-type(2) .aw-tabla', '2']] });
}
