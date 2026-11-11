// Prueba de humo en navegador: abre las páginas principales y falla si hay errores de JavaScript
// o si algo clave no se dibuja. Uso: node tools/humo.mjs [url-base]  (por defecto http://localhost:8000/)
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const BASE = (process.argv[2] || 'http://localhost:8000/').replace(/\/?$/, '/');

const PAGINAS = [
  ['portada', '#/', '.card, .modulo, main h1'],
  ['primera lección', '#/l/cero-tu-computadora', 'article, .leccion'],
  ['laboratorio SQL', '#/lab/sql', '#out, textarea, .cm-editor'],
  ['exámenes', '#/examenes', 'main'],
  ['buscar', '#/buscar?q=join', 'main'],
  ['Microsoft Fabric', '#/fabric', '.fbp'],
  ['Airflow', '#/airflow', '#afp'],
  ['GitHub', '#/github', '.ghp'],
];

let fallas = 0;
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
const errores = [];
p.on('pageerror', (e) => errores.push(e.message));
p.on('dialog', (d) => d.dismiss());
for (const [nombre, ruta, selector] of PAGINAS) {
  errores.length = 0;
  try {
    await p.goto(BASE + 'index.html' + ruta, { waitUntil: 'load' });
    await p.waitForSelector(selector, { timeout: 20000 });
    await p.waitForTimeout(800);
    if (errores.length) throw new Error('errores JS: ' + errores.join(' | '));
    console.log(`✓ ${nombre}`);
  } catch (e) {
    fallas++;
    console.log(`✗ ${nombre}: ${e.message.split('\n')[0]}`);
  }
}
await b.close();
console.log(fallas ? `\n${fallas} páginas con problemas` : '\nTodo en orden');
process.exit(fallas ? 1 : 0);
