// Pruebas de punta a punta de los proyectos, de la persistencia y de la copia de seguridad (tools/e2e/*.cjs).
// Cada una corre en su propio proceso y navegador. Uso: node tools/proyectos.mjs [url-base] [nombre…]
//   node tools/proyectos.mjs http://localhost:8000/                 todas
//   node tools/proyectos.mjs http://localhost:8000/ red mercado      solo las que tienen esas palabras en el nombre
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'e2e');
const BASE = process.argv[2] || 'http://localhost:8000/';
const filtro = process.argv.slice(3);
const pruebas = fs.readdirSync(dir).filter((f) => f.endsWith('.cjs') && f !== 'comun.cjs').filter((f) => !filtro.length || filtro.some((x) => f.includes(x))).sort();
const mal = [];
for (const f of pruebas) {
  console.log(`\n▶ ${f.replace(/\.cjs$/, '')}`);
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [path.join(dir, f), BASE], { stdio: 'inherit', timeout: 15 * 60000 });
  console.log(`  (${Math.round((Date.now() - t0) / 1000)} s)`);
  if (r.status !== 0) mal.push(f.replace(/\.cjs$/, ''));
}
console.log(mal.length ? `\n${mal.length} de ${pruebas.length} pruebas fallaron: ${mal.join(', ')}` : `\nTodo en orden: ${pruebas.length} pruebas de punta a punta`);
process.exit(mal.length ? 1 : 0);
