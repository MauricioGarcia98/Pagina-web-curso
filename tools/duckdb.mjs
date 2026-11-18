// Comprueba que la solución de cada ejercicio SQL corre en DuckDB, el motor del curso, con la traducción
// automática desde SQLite (assets/js/sqlite-a-duckdb.js). Lo que depende de SQLite (PRAGMA, su plan de
// consulta, triggers…) se corrige en SQLite y aquí se salta.
// Uso: node tools/duckdb.mjs   (necesita: npm install --no-save @duckdb/node-api@1.1.3-alpha.7)
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { build } = await import('./build.mjs');
const DataGen = require(path.join(ROOT, 'assets/js/data.js'));
const TR = require(path.join(ROOT, 'assets/js/sqlite-a-duckdb.js'));
const duck = require('@duckdb/node-api');

const course = build();
const T = DataGen.build();
const inst = await duck.DuckDBInstance.create(':memory:');
const con = await inst.connect();
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'duck-'));
for (const tb of TR.tablasDuckdb(DataGen.SCHEMA, T)) {
  const f = path.join(tmp, tb.nombre + '.csv');
  fs.writeFileSync(f, tb.csv());
  await con.run(tb.crear);
  await con.run(`INSERT INTO "${tb.nombre}" SELECT * FROM read_csv('${f}', header=false, columns=${tb.columnas}, nullstr='', quote='"', escape='"', auto_detect=false)`);
}
for (const a of TR.AJUSTES) await con.run(a);
const vistas = [];
for (const v of DataGen.VIEWS.split(';').map((x) => x.trim()).filter(Boolean)) {
  try { await con.run(TR.traducir(v)); } catch (e) { vistas.push(`${v.slice(0, 60)}… → ${e.message.split('\n')[0]}`); }
}
fs.rmSync(tmp, { recursive: true, force: true });

async function correr(sql) {
  let ultimo = null;
  for (const s of TR.partir(TR.traducir(sql))) { const r = await con.runAndReadAll(s); if (r.columnCount) ultimo = r; }
  return ultimo;
}

let ok = 0, saltados = 0;
const fallos = [];
for (const m of course.modulos) {
  for (const l of m.lecciones) {
    for (const ex of l.ejercicios) {
      if (ex.type !== 'sql') continue;
      const sql = (ex.setup ? ex.setup + ';\n' : '') + ex.solucion;
      if (TR.soloSqlite(sql) || TR.soloSqlite(ex.check || '')) { saltados++; continue; }
      await con.run('BEGIN TRANSACTION');
      try {
        await correr(sql);
        if (ex.check) await correr(ex.check);
        ok++;
      } catch (e) {
        fallos.push(`${ex.id} (${l.id}): ${e.message.split('\n')[0]}`);
      } finally {
        try { await con.run('ROLLBACK'); } catch (e) { /* ya cerrada */ }
      }
    }
  }
}

for (const v of vistas) console.log(`✗ vista: ${v}`);
for (const f of fallos) console.log(`✗ ${f}`);
console.log(`${fallos.length || vistas.length ? '✗' : '✔'} DuckDB: ${ok} soluciones corren, ${saltados} se corrigen en SQLite, ${fallos.length} fallan${vistas.length ? `, ${vistas.length} vistas fallan` : ''}`);
process.exit(fallos.length || vistas.length ? 1 : 0);
