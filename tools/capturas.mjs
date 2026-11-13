// Capturas de los cursos de herramientas: abre cada réplica en Chromium, sigue un guion paso a paso y guarda las
// imágenes en assets/img/guias/<app>/. Así las lecciones muestran la misma app que el alumno va a usar, y si la
// interfaz cambia se regeneran todas con un comando.
//   node tools/capturas.mjs [app ...] [--base http://localhost:8000/]
// Cada guion vive en tools/capturas/<app>.mjs y exporta: default async (c) => { ... } usando la API de abajo.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const iBase = args.indexOf('--base');
const BASE = (iBase >= 0 ? args.splice(iBase, 2)[1] : 'http://localhost:8000/').replace(/\/?$/, '/');
const apps = args.length ? args : fs.readdirSync(path.join(ROOT, 'tools/capturas')).filter((f) => f.endsWith('.mjs')).map((f) => f.replace(/\.mjs$/, ''));

// la barra del curso y el botón de retos no son parte de la app real: se ocultan en las capturas
const CSS_LIMPIO = `#herrBar, #retosHerrBtn, #retosHerrPanel, .toast, #toast { display: none !important; }
body.herr-on .pbi, body.herr-on .dbx, body.herr-on .azp, body.herr-on .adf, body.herr-on .ghp, body.herr-on .fbp, body.herr-on .afp, body.herr-on .sfp, body.herr-on .bqp, body.herr-on .jlp, body.herr-on .xlp, body.vscode-abierto .vs { top: 0 !important; }
.cap-marca { position: fixed; z-index: 2147483647; border: 3px solid #e3342f; border-radius: 8px; box-shadow: 0 0 0 4px rgba(227, 52, 47, .25); pointer-events: none; }
.cap-num { position: fixed; z-index: 2147483647; min-width: 26px; height: 26px; padding: 0 7px; border-radius: 13px; background: #e3342f; color: #fff; font: 700 14px/26px system-ui, sans-serif; text-align: center; pointer-events: none; box-shadow: 0 2px 6px rgba(0,0,0,.3); }`;

for (const app of apps) {
  const mod = await import(pathToFileURL(path.join(ROOT, 'tools/capturas', app + '.mjs')).href);
  const dir = path.join(ROOT, 'assets/img/guias', app);
  fs.mkdirSync(dir, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 760 }, deviceScaleFactor: 1, serviceWorkers: 'block', locale: 'es-AR' });
  const page = await ctx.newPage();
  const errores = []; page.on('pageerror', (e) => errores.push(e.message));
  let n = 0;
  const c = {
    page, BASE,
    async ir(hash, esperar) { await page.goto(BASE + hash); if (esperar) await page.waitForSelector(esperar, { timeout: 90000 }); await page.addStyleTag({ content: CSS_LIMPIO }); await page.waitForTimeout(700); },
    async limpiarMarcas() { await page.evaluate(() => document.querySelectorAll('.cap-marca, .cap-num').forEach((e) => e.remove())); },
    // resalta uno o varios elementos con un recuadro rojo y un número (o texto corto)
    async marcar(sel, etiqueta) {
      await page.addStyleTag({ content: CSS_LIMPIO });
      await page.evaluate(({ sel, etiqueta }) => {
        const els = typeof sel === 'string' ? [...document.querySelectorAll(sel)].slice(0, 1) : [];
        for (const el of els) {
          const r = el.getBoundingClientRect(); if (!r.width) continue;
          const m = document.createElement('div'); m.className = 'cap-marca'; Object.assign(m.style, { left: r.left - 4 + 'px', top: r.top - 4 + 'px', width: r.width + 8 + 'px', height: r.height + 8 + 'px' }); document.body.append(m);
          if (etiqueta != null) { const b = document.createElement('div'); b.className = 'cap-num'; b.textContent = etiqueta; Object.assign(b.style, { left: Math.max(2, r.left - 14) + 'px', top: Math.max(2, r.top - 14) + 'px' }); document.body.append(b); }
        }
      }, { sel, etiqueta });
    },
    // guarda la captura: toda la ventana, o recortada a un elemento (con margen)
    async foto(nombre, { recorte, margen = 12, marcas = [] } = {}) {
      for (const [sel, et] of marcas) await this.marcar(sel, et);
      await page.waitForTimeout(150);
      const opts = { path: path.join(dir, nombre + '.png'), type: 'png' };
      if (recorte) {
        const r = await page.locator(recorte).first().boundingBox();
        if (r) opts.clip = { x: Math.max(0, r.x - margen), y: Math.max(0, r.y - margen), width: Math.min(1280, r.width + margen * 2), height: Math.min(760, r.height + margen * 2) };
      }
      await page.screenshot(opts); n++;
      await this.limpiarMarcas();
    },
    espera: (ms) => page.waitForTimeout(ms),
  };
  try { await mod.default(c); } catch (e) { console.error(`✗ ${app}: ${e.message}`); process.exitCode = 1; }
  console.log(`${app}: ${n} capturas${errores.length ? ' · errores de la página: ' + errores.slice(0, 3).join(' | ') : ''}`);
  await browser.close();
  // PNG -> WebP (la mitad de peso que JPEG con la misma nitidez en texto); se borran los PNG
  const py = `import sys, glob, os\nfrom PIL import Image\nfor f in glob.glob(os.path.join(sys.argv[1], '*.png')):\n    Image.open(f).convert('RGB').save(f[:-4] + '.webp', 'WEBP', quality=72, method=6)\n    os.remove(f)\n`;
  const r = spawnSync('python3', ['-c', py, dir], { stdio: 'inherit' });
  if (r.status !== 0) console.error('No se pudieron convertir a WebP (¿falta Pillow?). Quedan en PNG.');
}
