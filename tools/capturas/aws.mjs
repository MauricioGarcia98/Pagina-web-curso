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
}
