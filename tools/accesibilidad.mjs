// Auditoría de accesibilidad con axe-core (reglas WCAG 2.x A y AA) en las páginas del curso, en tema claro y
// oscuro. Falla si encuentra cualquier problema. No revisa las réplicas de herramientas (Databricks, Azure,
// Power BI…): imitan los colores de los productos reales a propósito.
// Uso: node tools/accesibilidad.mjs [url-base]      (requiere: npm install --no-save axe-core)
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const AXE = require.resolve('axe-core/axe.min.js');
const BASE = (process.argv[2] || 'http://localhost:8000/').replace(/\/?$/, '/');

const PAGINAS = ['#/', '#/ruta', '#/glosario', '#/repaso', '#/certificaciones', '#/examenes', '#/progreso', '#/datos', '#/herramientas',
  '#/trabajo', '#/diagnostico', '#/generador', '#/modelado', '#/buscar?q=join', '#/l/cero-tu-computadora', '#/l/sql-introduccion',
  '#/l/python-introduccion', '#/l/spark-lazy', '#/l/calidad-perfilar-una-tabla', '#/l/entrevistas-sql-rachas-y-huecos', '#/l/aws-orquestacion-gobierno'];

const b = await chromium.launch();
const problemas = [];
for (const tema of ['light', 'dark']) {
  const p = await b.newPage({ viewport: { width: 1300, height: 900 }, colorScheme: tema });
  p.on('dialog', (d) => d.dismiss());
  for (const ruta of PAGINAS) {
    await p.goto(BASE + ruta); await p.waitForTimeout(1800);
    await p.addScriptTag({ path: AXE });
    const v = await p.evaluate(async () => (await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] }, resultTypes: ['violations'] })).violations
      .map((x) => ({ id: x.id, impacto: x.impact, nodos: x.nodes.slice(0, 3).map((n) => `${n.target.join(' ')} — ${(n.failureSummary || '').split('\n')[1] || ''}`.slice(0, 220)), total: x.nodes.length })));
    for (const x of v) problemas.push(`${tema === 'light' ? 'claro' : 'oscuro'} · ${ruta} · ${x.id} [${x.impacto}] ×${x.total}\n      ${x.nodos.join('\n      ')}`);
  }
  await p.close();
}
await b.close();
console.log(`${PAGINAS.length} páginas auditadas con axe-core en tema claro y oscuro`);
problemas.forEach((x) => console.log('  ✗ ' + x));
console.log(problemas.length ? `${problemas.length} problemas de accesibilidad` : 'Todo en orden');
process.exit(problemas.length ? 1 : 0);
