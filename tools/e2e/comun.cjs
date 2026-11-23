// Piezas comunes de las pruebas de punta a punta de los proyectos (tools/e2e/*.cjs, las corre tools/proyectos.mjs).
// Cada prueba hace lo que haría un estudiante con el código de las soluciones de referencia, corre los mismos chequeos
// que usa el revisor de Jira, desbloquea los candados de la guía y recarga la página para comprobar que todo se guardó.
const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..', '..');
const BASE = (process.argv[2] || 'http://localhost:8000/').replace(/\/?$/, '/');
const fallas = [];

const afirmar = (ok, msg) => { if (ok) console.log('  ✓ ' + msg); else { console.log('  ✗ ' + msg); fallas.push(msg); } };
const leer = (rel) => fs.readFileSync(path.join(RAIZ, 'content', rel), 'utf8');
// los bloques de código de una guía, en orden (tipo: 'bash', 'sql norun', 'python norun'…)
const bloques = (texto, tipo) => [...texto.matchAll(new RegExp('```' + tipo + '\\n([\\s\\S]*?)\\n```\\n', 'g'))].map((m) => m[1]);
// un bloque de bash como líneas de comando (sin comentarios, con las continuaciones \ unidas)
const lineas = (t) => t.replace(/\\\n\s*/g, '').split('\n').filter((l) => l.trim() && !l.trim().startsWith('#'));

async function navegador() {
  const { chromium } = require('playwright');
  const b = await chromium.launch();
  const ctx = await b.newContext({ acceptDownloads: true });
  const p = await ctx.newPage();
  const errores = [];
  p.on('pageerror', (e) => errores.push(e.message));
  p.on('dialog', (d) => d.accept());
  return { b, ctx, p, errores };
}
const ir = async (p, ruta, espera = 3500) => { await p.goto(BASE + 'index.html#' + ruta); await p.waitForTimeout(espera); };

// corre los chequeos del proyecto (los mismos del panel "Revisar mi entrega" y de Jira): [[grupo, texto, true | motivo]]
const chequeos = (p, clave) => p.evaluate(async (k) => {
  if (window.__discoListo) await window.__discoListo();
  const g = (window.__tableros || []).find((x) => x.clave === k); if (!g) return [];
  const out = [];
  for (const [grupo, txt, f] of g.chequeos()) { let v; try { v = await f(); } catch (e) { v = e.message; } out.push([grupo, txt, v === true ? true : String(v).slice(0, 300)]); }
  return out;
}, clave);
function afirmarChequeos(res, esperados, etiqueta) {
  for (const grupo of esperados) {
    const del = res.filter((r) => r[0] === grupo);
    const mal = del.filter((r) => r[2] !== true);
    afirmar(del.length > 0 && !mal.length, `${etiqueta} · ${grupo}${!del.length ? ' (no existe ese chequeo)' : mal.map((r) => ` → ${r[2]}`).join('')}`);
  }
}

// aprieta "Revisar mi entrega y desbloquear" en cada candado cerrado de la página y espera a que se abra o lo rechace
const desbloquear = (p) => p.evaluate(async () => {
  const espera = (ms) => new Promise((ok) => setTimeout(ok, ms));
  const detalle = [];
  for (const el of [...document.querySelectorAll('[data-solucion]')]) {
    if (!el.classList.contains('solucion-cerrada')) continue;
    const b = el.querySelector('.solucion-candado button'); if (!b) continue;
    b.click();
    for (let i = 0; i < 480 && el.classList.contains('solucion-cerrada') && !(!b.disabled && /otra vez/.test(b.textContent)); i++) await espera(250);
    detalle.push([el.dataset.solucion, !el.classList.contains('solucion-cerrada'), (el.querySelector('.solucion-notas') || {}).innerText || '']);
  }
  return { total: document.querySelectorAll('[data-solucion]').length, abiertas: document.querySelectorAll('.solucion-abierta').length, cerradas: [...document.querySelectorAll('.solucion-cerrada')].map((e) => e.dataset.solucion), detalle };
});

async function fin(nav) {
  if (nav) {
    const propios = nav.errores.filter((e) => !/ResizeObserver|Failed to fetch dynamically imported module/.test(e));
    afirmar(!propios.length, 'sin errores de JavaScript' + (propios.length ? ': ' + propios.slice(0, 3).join(' | ') : ''));
    await nav.b.close();
  }
  console.log(fallas.length ? `  ${fallas.length} problema(s)` : '  todo bien');
  process.exit(fallas.length ? 1 : 0);
}
async function correr(f) { let nav = null; try { nav = await navegador(); await f(nav); } catch (e) { afirmar(false, 'la prueba se cortó: ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e)); } await fin(nav); }

module.exports = { RAIZ, BASE, afirmar, leer, bloques, lineas, navegador, ir, chequeos, afirmarChequeos, desbloquear, fin, correr };
