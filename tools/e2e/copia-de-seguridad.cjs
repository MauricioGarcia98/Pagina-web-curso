// Mis datos: la copia de seguridad lleva también las tablas grandes de Databricks y los archivos de la terminal
// (IndexedDB), se restaura en otro navegador limpio y "Borrar todo" vacía IndexedDB.
const fs = require('fs'); const os = require('os'); const path = require('path');
const { BASE, ir, afirmar, correr } = require('./comun.cjs');

correr(async ({ b, p }) => {
  await ir(p, '/', 2500);
  await p.evaluate(async () => {
    const S = window.__almacen(); if (window.__cargarGrupo) await window.__cargarGrupo('databricks'); await window.DBSQL.init({ Store: S });
    await window.DBSQL.ejecutar('CREATE CATALOG IF NOT EXISTS prueba; CREATE SCHEMA IF NOT EXISTS prueba.s; CREATE OR REPLACE TABLE prueba.s.grande AS SELECT id, id * 2 AS doble FROM range(5000)', { Store: S });
    await window.__discoListo(); for (let i = 0; i < 2000; i++) window.Shell.writeFile(window.Shell.norm(`~/copia/f${i}.txt`), 'linea ' + i + ' ' + 'x'.repeat(200));
    S.save(); window.Shell.Machine.save(); await new Promise((ok) => setTimeout(ok, 3000));
  });
  await ir(p, '/mis-datos', 3000);
  afirmar(/MB|KB/.test(await p.locator('#mdPesados').textContent()), 'el medidor muestra lo guardado en IndexedDB');
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 30000 }), p.click('#mdExp')]);
  const ruta = path.join(os.tmpdir(), `copia-academia-${process.pid}.json`); await dl.saveAs(ruta);
  const J = JSON.parse(fs.readFileSync(ruta, 'utf8'));
  afirmar(J.v === 2 && Object.keys(J.pesados || {}).length >= 2, `la copia (v${J.v}) incluye los datos pesados (${Object.keys(J.pesados || {}).length} entradas)`);
  const q = await (await b.newContext()).newPage(); q.on('dialog', (d) => d.accept());
  await q.goto(BASE + 'index.html#/mis-datos'); await q.waitForTimeout(3000);
  await q.setInputFiles('#mdImp', ruta); await q.waitForTimeout(4000);
  await q.goto(BASE + 'index.html#/'); await q.waitForTimeout(3000);
  const r = await q.evaluate(async () => {
    const S = window.__almacen(); if (window.__cargarGrupo) await window.__cargarGrupo('databricks'); await window.DBSQL.init({ Store: S });
    const x = await window.DBSQL.ejecutar('SELECT count(*), sum(doble) FROM prueba.s.grande', { Store: S });
    await window.__discoListo(); const y = await window.Shell.runLine('ls ~/copia | wc -l', { autoLogin: true });
    return { tabla: x[0].filas && x[0].filas[0], archivos: y.out.trim() };
  });
  afirmar(r.tabla && r.tabla[0] === 5000 && r.tabla[1] === 24995000, `en el navegador limpio vuelve la tabla de 5.000 filas (${JSON.stringify(r.tabla)})`);
  afirmar(r.archivos === '2000', `y los 2.000 archivos de la terminal (${r.archivos})`);
  await q.goto(BASE + 'index.html#/mis-datos'); await q.waitForTimeout(2500); await q.click('#mdTodo'); await q.waitForTimeout(3000);
  const n = await q.evaluate(() => new Promise((ok) => { const o = indexedDB.open('academia-datos-pesados', 1); o.onsuccess = () => { const t = o.result.transaction('kv').objectStore('kv').count(); t.onsuccess = () => ok(t.result); }; }));
  afirmar(n === 0, `"Borrar todo" vacía IndexedDB (${n} entradas)`);
  fs.rmSync(ruta, { force: true });
});
