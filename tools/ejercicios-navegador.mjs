// Corrige en el navegador la solución de cada ejercicio de SQL, Python y PySpark con los mismos motores que usa
// el estudiante (DuckDB-WASM / SQLite y Pyodide), y falla si alguna no pasa o si la página tira errores.
// El validador (tools/validate.mjs) prueba lo mismo fuera del navegador; esto confirma que el navegador da igual.
// Uso: node tools/ejercicios-navegador.mjs [url-base] [modulo,modulo,…]   (por defecto: todos los módulos)
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const BASE = (process.argv[2] || 'http://localhost:8000/').replace(/\/?$/, '/');
const SOLO = (process.argv[3] || '').split(',').filter(Boolean);

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
const errores = [];
p.on('pageerror', (e) => errores.push(e.message));
p.on('dialog', (d) => d.dismiss());
// las lecciones de nube se abren de a una: para corregirlas todas se marcan las tres como elegidas
await p.addInitScript(() => { try { const k = 'academia-datos-v1'; const d = JSON.parse(localStorage.getItem(k) || '{}'); d.nubes = { orden: ['azure', 'aws', 'gcp'] }; localStorage.setItem(k, JSON.stringify(d)); } catch (e) { /* sin almacenamiento */ } });

await p.goto(BASE + '#/'); await p.waitForFunction(() => window.COURSE && window.Engines, null, { timeout: 60000 });
const modulos = await p.evaluate(() => window.COURSE.modulos.map((m) => ({ id: m.id, lecciones: m.lecciones.map((l) => l.id) })));
let total = 0, fallas = 0;
const t0 = Date.now();
for (const m of modulos) {
  if (SOLO.length && !SOLO.includes(m.id)) continue;
  if (!m.lecciones.length) continue;
  // abrir una lección carga el contenido del módulo
  await p.goto(BASE + '#/l/' + m.lecciones[0]); await p.waitForTimeout(600);
  const res = await p.evaluate(async (M) => {
    const mod = window.COURSE.modulos.find((x) => x.id === M), out = [];
    for (const l of mod.lecciones) {
      for (const ex of l.ejercicios || []) {
        if (!['sql', 'python', 'pyspark'].includes(ex.type) || ex.solucion == null) continue;
        try {
          const r = ex.type === 'sql' ? await window.Engines.CursoSQL.grade(ex, ex.solucion) : await window.Engines.PY.grade(ex.type, ex, ex.solucion);
          out.push([ex.id, ex.type, !!(r.ok && r.pass), String(r.msg || r.error || '').slice(0, 200)]);
        } catch (e) { out.push([ex.id, ex.type, false, String(e && e.message || e).slice(0, 200)]); }
      }
    }
    return out;
  }, m.id);
  const malos = res.filter((r) => !r[2]);
  total += res.length; fallas += malos.length;
  if (res.length) console.log(`${malos.length ? '✗' : '✓'} ${m.id}: ${res.length - malos.length}/${res.length}`);
  for (const r of malos) console.log(`    ✗ ${r[0]} (${r[1]}): ${r[3]}`);
}
console.log(`\n${total} soluciones corregidas en el navegador, ${fallas} fallan · ${Math.round((Date.now() - t0) / 1000)} s`);
if (errores.length) { console.log('Errores de página:'); [...new Set(errores)].slice(0, 10).forEach((e) => console.log('  ' + e)); }
await b.close();
process.exit(fallas || errores.length ? 1 : 0);
