// Valida que todas las soluciones de los ejercicios funcionen y pasen su propia corrección.
//   npm run validate            (todo)
//   npm run validate -- sql     (solo un módulo)
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { build } from './build.mjs';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const initSqlJs = require('sql.js');
const DataGen = require(path.join(ROOT, 'assets/js/data.js'));

const only = process.argv[2];
const course = build();
const SQL = await initSqlJs();
const T = DataGen.build();
const base = new SQL.Database();
base.run(DataGen.SCHEMA);
base.run('BEGIN');
for (const [name, t] of Object.entries(T)) {
  const st = base.prepare(`INSERT INTO ${name} (${t.columns.join(',')}) VALUES (${t.columns.map(() => '?').join(',')})`);
  for (const r of t.rows) st.run(r);
  st.free();
}
base.run('COMMIT');
base.run(DataGen.VIEWS);
const bytes = base.export();

let fails = 0, okCount = 0;
const fail = (ex, msg) => { fails++; console.log(`✗ ${ex.id} [${ex.type}] ${msg}`); };
function runSql(sql, check) {
  const db = new SQL.Database(bytes);
  try {
    const r = db.exec(sql);
    if (check) { const c = db.exec(check); return c[c.length - 1]; }
    return r[r.length - 1];
  } finally { db.close(); }
}

const pyJobs = [];
for (const m of course.modulos) {
  if (only && m.id !== only) continue;
  for (const l of m.lecciones) {
    if (!l.titulo) console.log(`✗ ${l.id} sin título`);
    for (const ex of l.ejercicios) {
      try {
        if (ex.type === 'sql') {
          const r = runSql((ex.setup ? ex.setup + ';\n' : '') + ex.solucion, ex.check);
          const n = r ? r.values.length : 0;
          if (!n && !ex.vacio) fail(ex, 'la solución no devuelve filas');
          else { okCount++; if (process.env.VERBOSE) console.log(`✓ ${ex.id} → ${n} filas`, r.columns.join(','), JSON.stringify(r.values.slice(0, 2))); }
          if (ex.inicial && !ex.check) {
            try {
              const s = runSql((ex.setup ? ex.setup + ';\n' : '') + ex.inicial);
              if (s && r && JSON.stringify(s.values) === JSON.stringify(r.values)) fail(ex, 'el código inicial ya da el resultado correcto');
            } catch (e) { /* código inicial incompleto: está bien */ }
          }
        } else if (['python', 'pyspark', 'airflow', 'dbt'].includes(ex.type)) {
          pyJobs.push(ex);
        } else if (ex.type === 'cli') {
          const sol = (ex.solucion || '').trim();
          const pats = ex.respuesta.map((p) => new RegExp('^' + p + '$', 'i'));
          const norm = (s) => s.trim().replace(/^\$\s*/, '').replace(/\s+/g, ' ');
          if (sol && !pats.some((re) => re.test(norm(sol)))) fail(ex, `la solución "${sol}" no coincide con ningún patrón`);
          else okCount++;
        } else okCount++;
      } catch (e) { fail(ex, e.message); }
    }
  }
}

if (pyJobs.length) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'academia-'));
  const pick = ['clientes', 'productos', 'categorias', 'pedidos', 'detalle_pedidos', 'pagos', 'empleados', 'departamentos', 'eventos_web'];
  fs.writeFileSync(path.join(tmp, 'tables.json'), JSON.stringify(Object.fromEntries(pick.map((k) => [k, T[k]]))));
  fs.writeFileSync(path.join(tmp, 'jobs.json'), JSON.stringify(pyJobs));
  const eng = fs.readFileSync(path.join(ROOT, 'assets/js/engines.js'), 'utf8');
  const harness = eng.split('const HARNESS = `')[1].split('`;')[0].replace(/\\\\/g, '\\');
  fs.writeFileSync(path.join(tmp, 'harness.py'), harness);
  const out = execFileSync('python3', [path.join(ROOT, 'tools/validate_py.py'), tmp, path.join(ROOT, 'assets/py')], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const res = JSON.parse(out.split('\n').filter(Boolean).pop());
  for (const ex of pyJobs) {
    const r = res[ex.id];
    if (ex.type === 'dbt') {
      if (!r.ok) { fail(ex, 'jinja: ' + r.error); continue; }
      try {
        const q = runSql(r.sql);
        if (!q || !q.values.length) fail(ex, 'el modelo dbt no devuelve filas');
        else { okCount++; if (process.env.VERBOSE) console.log(`✓ ${ex.id} → ${q.values.length} filas`); }
      } catch (e) { fail(ex, 'SQL compilado falló: ' + e.message + '\n' + r.sql); }
      continue;
    }
    if (!r.ok) fail(ex, 'error: ' + r.error + (r.stdout ? '\n' + r.stdout.slice(-800) : ''));
    else if (!r.pass) fail(ex, 'no pasa su propia corrección: ' + r.msg);
    else { okCount++; if (process.env.VERBOSE) console.log(`✓ ${ex.id} (${r.t}s)`); }
  }
}
console.log(`\n${okCount} ejercicios OK, ${fails} con problemas`);
process.exit(fails ? 1 : 0);
