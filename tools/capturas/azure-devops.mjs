// Guion de capturas de Azure DevOps de práctica (assets/img/guias/azure-devops/)
export default async function (c) {
  const p = c.page;
  const w = (ms) => c.espera(ms);
  const ir = async (h, ms = 700) => { await p.evaluate((x) => { location.hash = x; }, h); await w(ms); };
  await c.ir('#/azure-devops/tienda-andina/boards', '.ado-kanban'); await w(500);
  await p.selectOption('[data-estado="3"]', 'Active').catch(() => {}); await w(400);
  await c.foto('d01-tablero', { marcas: [['[data-col="New"]', '1'], ['[data-col="Active"]', '2']] });
  await ir('#/azure-devops/tienda-andina/pipelines/nuevo?p=4&repo=pipelines&t=python'); await p.click('#adoYOk'); await w(2600);
  await c.foto('d02-run', { marcas: [['.ado-pasos-run', '1'], ['.ado-log', '2']] });
}
