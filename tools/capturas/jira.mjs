// Guion de capturas de Jira de práctica (assets/img/guias/jira/)
export default async function (c) {
  const p = c.page;
  const w = (ms) => c.espera(ms);
  const ir = async (h, ms = 600) => { await p.evaluate((x) => { location.hash = x; }, h); await w(ms); };
  await c.ir('#/jira/backlog', '.jr-sprint'); await w(500);
  await c.foto('j01-backlog', { marcas: [['.jr-sprint[data-sprint="1"]', '1'], ['.jr-sprint[data-sprint="0"]', '2']] });
  await ir('#/jira/board'); await p.waitForSelector('.jr-board');
  await c.foto('j02-tablero', { marcas: [['.jr-col[data-col="In Progress"]', '1'], ['.jr-filtros', '2']] });
  await ir('#/jira/backlog'); await p.click('[data-completar="1"]'); await w(300); await p.click('#jrCOk'); await w(800);
  await c.foto('j03-velocidad', { marcas: [['.jr-graf', null]] });
}
