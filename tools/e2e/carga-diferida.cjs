// Carga diferida: la portada no descarga los proyectos, las misiones, Modelado ni Trabajo; cada cosa llega cuando una
// página, la terminal, Python o una consulta la necesita, y funciona igual que si hubiera estado desde el principio.
const { BASE, afirmar, correr } = require('./comun.cjs');
const DIFERIDOS = ['mercado-vecino.js', 'pedalia.js', 'conecta.js', 'soluciones.js', 'misiones-datos.js', 'modelado.js', 'trabajo.js', 'terminal-iac.js', 'terminal-incidentes.js'];
const pedidos = (p) => p.evaluate(() => performance.getEntriesByType('resource').map((e) => e.name.split('/').pop().split('?')[0]));

correr(async ({ ctx, p }) => {
  await p.goto(BASE + 'index.html#/'); await p.waitForTimeout(3000);
  const portada = await pedidos(p);
  const cargados = DIFERIDOS.filter((f) => portada.includes(f));
  afirmar(!cargados.length, `la portada no descarga lo diferido${cargados.length ? ' (descargó ' + cargados.join(', ') + ')' : ''}`);
  const peso = await p.evaluate(() => performance.getEntriesByType('resource').filter((e) => /\/assets\/js\//.test(e.name)).reduce((a, e) => a + (e.decodedBodySize || 0), 0));
  console.log(`  (la portada descargó ${Math.round(peso / 1024)} KB de JavaScript)`);

  // la terminal desde la portada: el primer comando trae los proyectos (sus comandos y sus APIs)
  const t = await p.evaluate(async () => { await window.__discoListo(); const a = await window.Shell.runLine('mercado accesos', { autoLogin: true }); const b = await window.Shell.runLine('curl -s https://api.pedalia.example/v1/estaciones | head -c 40', { autoLogin: true }); return { a: a.code, txt: String(a.out).slice(0, 80), b: String(b.out) }; });
  afirmar(t.a === 0 && /accesos|PagoYa|réplica|Mercado/i.test(t.txt), 'un comando de proyecto funciona desde la portada (mercado accesos)');
  afirmar(/"(error|datos|ok|estaciones)"|\{/.test(t.b) && !/no se pudo resolver|Could not resolve|comando no encontrado/i.test(t.b), 'curl a la API de Pedalia responde desde la portada (' + t.b.replace(/\s+/g, ' ').slice(0, 60) + ')');

  const ex = await p.evaluate(async () => { const a = await window.Shell.runLine("printf 'a,1\\nb,2\\n' | awk -F, '{print $2}'", { autoLogin: true }); const b = await window.Shell.runLine('terraform version', { autoLogin: true }); return { awk: String(a.out).trim(), tf: b.code + ' ' + String(b.out).slice(0, 30) }; });
  afirmar(ex.awk.replace(/\s+/g, ' ') === '1 2', `awk funciona desde la portada (${ex.awk.replace(/\s+/g, ' ')})`);
  afirmar(/^0 Terraform/.test(ex.tf), `terraform funciona desde la portada (${ex.tf})`);
  // read_kafka en Databricks trae los clústeres de práctica si hace falta
  const k = await p.evaluate(async () => { if (window.__cargarGrupo) await window.__cargarGrupo('databricks'); const S = window.__almacen(); await window.DBSQL.init({ Store: S }); const r = await window.DBSQL.ejecutar("SELECT count(*) FROM read_kafka(bootstrapServers => 'nadie.example:9093', subscribe => 'x')", { Store: S }); return String((r.find((x) => x.ok === false) || {}).error || 'ok'); });
  afirmar(!/No hay ningún clúster Kafka/.test(k), 'read_kafka encuentra el Kafka de práctica (responde el clúster, no "no hay Kafka")');

  // una lección de proyecto: monta sus paneles y sus candados
  await p.goto(BASE + 'index.html#/l/proyecto-red-analitica-paso-a-paso'); await p.waitForTimeout(4000);
  afirmar((await p.locator('[data-solucion]').count()) === 7, 'la lección de un proyecto carga sus candados');
  // Jira con los tableros de los proyectos
  const q = await (await ctx.newPage());
  await q.goto(BASE + 'index.html#/jira/projects/RA/board'); await q.waitForTimeout(5000);
  afirmar(await q.evaluate(() => (window.__tableros || []).some((x) => x.clave === 'RA')), 'Jira en una pestaña nueva tiene los proyectos (RA)');
  // laboratorio con misiones, Modelado y Trabajo
  await q.goto(BASE + 'index.html#/lab/sql'); await q.waitForTimeout(3000);
  afirmar(await q.evaluate(() => !!window.Misiones && !!window.MISIONES), 'el laboratorio de SQL carga las misiones');
  for (const [ruta, glob] of [['modelado', 'Modelado'], ['trabajo', 'Trabajo']]) {
    await q.goto(BASE + 'index.html#/' + ruta); await q.waitForTimeout(2500);
    afirmar(await q.evaluate((g) => !!window[g] && !!document.querySelector('main h1, main h2'), glob), `#/${ruta} se abre con su código`);
  }
  // Python en una lección cualquiera, contra la API de Pedalia
  const py = await q.evaluate(async () => { const x = await window.Engines.PY.run('python', 'import requests\nr = requests.get("https://api.pedalia.example/v1/estaciones")\nprint(r.status_code)'); return String(x.stdout || x.error || '').trim(); });
  afirmar(/^\d{3}$/.test(py.split('\n').pop()), `Python llega a la API de Pedalia sin abrir el proyecto (respuesta ${py.slice(-60)})`);
});
