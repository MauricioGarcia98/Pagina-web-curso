// Revisa en el navegador todos los diagramas del curso, en un teléfono (Pixel 7) y en escritorio, y falla si:
//  - la página tira un error o un diagrama no se dibuja,
//  - el texto de un nodo se sale de su caja,
//  - una etiqueta de flecha tapa un nodo u otra etiqueta (más que un roce de esquina).
// Uso: node tools/diagramas.mjs [url-base] [leccion,leccion,…]   (por defecto: todas las lecciones con diagramas)
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');
const BASE = (process.argv[2] || 'http://localhost:8000/').replace(/\/?$/, '/');
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const ROCE = 600;   // px² de superposición tolerados (una esquina que apenas toca)

// lecciones con diagramas: content/<modulo>/<NN-slug>.md → <modulo>-<slug>
let ids = (process.argv[3] || '').split(',').filter(Boolean);
if (!ids.length) {
  for (const mod of fs.readdirSync(path.join(ROOT, 'content'))) {
    const dir = path.join(ROOT, 'content', mod);
    if (!fs.statSync(dir).isDirectory()) continue;
    for (const f of fs.readdirSync(dir)) if (f.endsWith('.md') && fs.readFileSync(path.join(dir, f), 'utf8').includes('```diagrama')) ids.push(`${mod}-${f.replace(/^\d+-/, '').replace(/\.md$/, '')}`);
  }
}

const b = await chromium.launch();
const problemas = [];
let figuras = 0;
for (const modo of ['teléfono', 'escritorio']) {
  const ctx = modo === 'teléfono' ? await b.newContext({ ...devices['Pixel 7'] }) : await b.newContext({ viewport: { width: 1300, height: 900 } });
  await ctx.addInitScript(() => { try { const k = 'academia-datos-v1'; const d = JSON.parse(localStorage.getItem(k) || '{}'); d.nubes = { orden: ['azure', 'aws', 'gcp'] }; localStorage.setItem(k, JSON.stringify(d)); } catch (e) { /* sin almacenamiento */ } });
  const p = await ctx.newPage();
  let errores = [];
  p.on('pageerror', (e) => errores.push(e.message));
  p.on('dialog', (d) => d.dismiss());
  for (const id of ids) {
    errores = [];
    await p.goto(BASE + '#/l/' + id); await p.waitForTimeout(350);
    const n = await p.locator('figure.diagrama').count();
    for (let i = 0; i < n; i++) await p.locator('figure.diagrama').nth(i).scrollIntoViewIfNeeded().catch(() => {});
    await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(250);
    const r = await p.evaluate((ROCE) => {
      const out = [];
      const inter = (a, b) => Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
      const figs = [...document.querySelectorAll('figure.diagrama')];
      for (const f of figs) {
        const titulo = (f.querySelector('figcaption')?.textContent || '').slice(0, 50);
        const svg = f.querySelector('svg.dg-svg');
        if (!svg) { out.push(`"${titulo}": no se dibujó`); continue; }
        const nodos = [...svg.querySelectorAll('.dg-n')].map((g) => ({ g, b: g.querySelector('g')?.getBBox() })).filter((x) => x.b);
        for (const { g, b } of nodos) for (const t of g.querySelectorAll(':scope > text')) if (t.getBBox().width > b.width - 6) out.push(`"${titulo}": el texto "${t.textContent.slice(0, 30)}" se sale de su caja`);
        const et = [...svg.querySelectorAll('.dg-fondo-etiqueta')].map((x) => ({ b: x.getBBox(), t: x.parentNode.textContent.slice(0, 30) }));
        et.forEach((e, i) => {
          const conNodo = nodos.reduce((s, x) => s + inter(e.b, x.b), 0), conEt = et.reduce((s, o, j) => s + (j > i ? inter(e.b, o.b) : 0), 0);
          if (conNodo > ROCE || conEt > ROCE) out.push(`"${titulo}": la etiqueta "${e.t}" tapa ${conNodo > ROCE ? 'un nodo' : 'otra etiqueta'}`);
        });
      }
      return { n: figs.length, out };
    }, ROCE);
    figuras += r.n;
    for (const o of r.out) problemas.push(`${modo} · ${id}: ${o}`);
    for (const e of new Set(errores)) problemas.push(`${modo} · ${id}: error de página: ${e}`);
  }
  await ctx.close();
}
await b.close();
console.log(`${ids.length} lecciones, ${figuras} diagramas revisados en teléfono y escritorio`);
problemas.forEach((x) => console.log('  ✗ ' + x));
console.log(problemas.length ? `${problemas.length} problemas` : 'Todo en orden');
process.exit(problemas.length ? 1 : 0);
