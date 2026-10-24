/*
 * Herramientas de "tu computadora" para la terminal de práctica:
 *  - docker y docker compose (imágenes, contenedores, puertos, variables, volúmenes, build, logs, exec)
 *  - psql contra los contenedores de PostgreSQL (SQL real sobre sql.js, con \dt, \d, \copy…)
 *  - duckdb: SQL real que lee CSV y JSON directo de los archivos (FROM 'datos/x.csv')
 *  - uv, entornos virtuales (source .venv/bin/activate), ssh-keygen, bash script.sh, java, spark-submit,
 *    brew / apt / winget (instalaciones simuladas)
 * El estado vive en Machine.cloud (docker) y Machine.cloud.dbs (bases de cada contenedor o archivo .duckdb).
 */
(function () {
  'use strict';
  const Sh = window.Shell;
  const { def, col, ok, Machine, norm, readFile, writeFile, isDir, exists, mkdirp, display, Commands, runLine } = Sh;
  const fail = (m, code = 1) => ({ out: col.err(m), code });
  const uid = (n = 12) => Array.from({ length: n }, () => 'abcdef0123456789'[Math.floor(Math.random() * 16)]).join('');
  const save = () => Machine.save();
  const ahora = () => new Date().toISOString().replace('T', ' ').slice(0, 19);
  const dk = () => (Machine.cloud.docker = Machine.cloud.docker || { images: {}, containers: {}, volumes: {}, networks: { bridge: 1, host: 1, none: 1 } });

  // ================================================================== bases de datos (sql.js)
  const abiertas = {};
  async function sqlLib() {
    const E = window.Engines.SQL;
    if (!E._SQL) await E.init();
    return E._SQL;
  }
  const b64 = (u8) => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
  const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  async function base(clave) {
    if (abiertas[clave]) return abiertas[clave];
    const SQL = await sqlLib();
    const guardada = (Machine.cloud.dbs || {})[clave];
    abiertas[clave] = guardada ? new SQL.Database(unb64(guardada)) : new SQL.Database();
    return abiertas[clave];
  }
  function guardarBase(clave) {
    const db = abiertas[clave]; if (!db) return;
    const bytes = db.export();
    Machine.cloud.dbs = Machine.cloud.dbs || {};
    if (bytes.length < 3e6) Machine.cloud.dbs[clave] = b64(bytes);
    save();
  }
  function borrarBase(clave) { if (abiertas[clave]) { abiertas[clave].close(); delete abiertas[clave]; } if (Machine.cloud.dbs) delete Machine.cloud.dbs[clave]; save(); }

  // CSV con comillas → filas
  function parseCsv(txt, sep = ',') {
    const filas = []; let fila = [], campo = '', q = false;
    for (let i = 0; i < txt.length; i++) {
      const c = txt[i];
      if (q) { if (c === '"' && txt[i + 1] === '"') { campo += '"'; i++; } else if (c === '"') q = false; else campo += c; continue; }
      if (c === '"') q = true; else if (c === sep) { fila.push(campo); campo = ''; } else if (c === '\n' || c === '\r') { if (c === '\r' && txt[i + 1] === '\n') i++; fila.push(campo); filas.push(fila); fila = []; campo = ''; } else campo += c;
    }
    if (campo !== '' || fila.length) { fila.push(campo); filas.push(fila); }
    return filas.filter((f) => f.length > 1 || f[0] !== '');
  }
  const tipoDe = (vals) => {
    const v = vals.filter((x) => x !== '' && x !== null && x !== undefined);
    if (!v.length) return 'VARCHAR';
    if (v.every((x) => /^-?\d+$/.test(x))) return 'BIGINT';
    if (v.every((x) => /^-?\d+(\.\d+)?$/.test(x))) return 'DOUBLE';
    if (v.every((x) => /^\d{4}-\d{2}-\d{2}$/.test(x))) return 'DATE';
    if (v.every((x) => /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?/.test(x))) return 'TIMESTAMP';
    if (v.every((x) => /^(true|false)$/i.test(x))) return 'BOOLEAN';
    return 'VARCHAR';
  };
  const valorDe = (x, t) => (x === '' ? null : t === 'BIGINT' ? parseInt(x, 10) : t === 'DOUBLE' ? Number(x) : t === 'BOOLEAN' ? (/^true$/i.test(x) ? 1 : 0) : x);
  // carga un archivo CSV/JSON del disco virtual como tabla; devuelve { cols, tipos, n }
  function cargarArchivo(db, tabla, ruta) {
    const txt = readFile(norm(ruta));
    if (txt === null) throw new Error(`IO Error: No files found that match the pattern "${ruta}"`);
    let cols, filas;
    if (/\.json$|\.ndjson$|\.jsonl$/i.test(ruta)) {
      let objs;
      try { objs = txt.trim().startsWith('[') ? JSON.parse(txt) : txt.trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)); } catch (e) { throw new Error(`Invalid Input Error: Malformed JSON in file "${ruta}"`); }
      cols = [...new Set(objs.flatMap((o) => Object.keys(o)))];
      filas = objs.map((o) => cols.map((c) => (o[c] === undefined || o[c] === null ? '' : typeof o[c] === 'object' ? JSON.stringify(o[c]) : String(o[c]))));
    } else if (/\.parquet$/i.test(ruta)) {
      if (!txt.startsWith('PAR1-SIM\n')) throw new Error(`Invalid Input Error: File "${ruta}" is not a valid Parquet file`);
      const r = parseCsv(txt.slice(9)); cols = r[0]; filas = r.slice(1);
    } else {
      const sep = /\.tsv$/i.test(ruta) ? '\t' : (txt.split('\n')[0].split(';').length > txt.split('\n')[0].split(',').length ? ';' : ',');
      const r = parseCsv(txt, sep); cols = r[0]; filas = r.slice(1);
    }
    const tipos = cols.map((_, i) => tipoDe(filas.slice(0, 500).map((f) => f[i])));
    const sqlt = { BIGINT: 'INTEGER', DOUBLE: 'REAL', BOOLEAN: 'INTEGER' };
    db.run(`DROP TABLE IF EXISTS "${tabla}"; CREATE TABLE "${tabla}" (${cols.map((c, i) => `"${c}" ${sqlt[tipos[i]] || 'TEXT'}`).join(', ')})`);
    const stmt = db.prepare(`INSERT INTO "${tabla}" VALUES (${cols.map(() => '?').join(',')})`);
    for (const f of filas) stmt.run(cols.map((_, i) => valorDe(f[i] ?? '', tipos[i])));
    stmt.free();
    return { cols, tipos, n: filas.length };
  }

  // ================================================================== tablas de resultado
  const fmtValor = (v) => (v === null ? 'NULL' : typeof v === 'number' && !Number.isInteger(v) ? String(Math.round(v * 1e6) / 1e6) : String(v));
  function tablaPsql(r) {
    // como PostgreSQL: una columna sin alias toma el nombre de la función (COUNT(*) → count)
    r = { columns: r.columns.map((c) => (/^\w+\(.*\)$/.test(c) ? c.match(/^(\w+)/)[1].toLowerCase() : c)), values: r.values };
    const filas = r.values.map((f) => f.map((v) => (v === null ? '' : fmtValor(v))));
    const w = r.columns.map((c, i) => Math.max(c.length, ...filas.map((f) => f[i].length)));
    const num = r.columns.map((_, i) => r.values.every((f) => f[i] === null || typeof f[i] === 'number'));
    const lin = (f) => ' ' + f.map((v, i) => (num[i] ? v.padStart(w[i]) : v.padEnd(w[i]))).join(' | ');
    return [' ' + r.columns.map((c, i) => c.padStart(Math.floor((w[i] + c.length) / 2)).padEnd(w[i])).join(' | '), w.map((x) => '-'.repeat(x + 2)).join('+').slice(0, -0 || undefined), ...filas.map(lin), `(${filas.length} ${filas.length === 1 ? 'row' : 'rows'})`].join('\n');
  }
  function tablaDuck(r, tipos) {
    const filas = r.values.slice(0, 40).map((f) => f.map((v) => fmtValor(v)));
    const tps = r.columns.map((c, i) => (tipos && tipos[i]) || (r.values.every((f) => f[i] === null || Number.isInteger(f[i])) ? 'int64' : r.values.every((f) => f[i] === null || typeof f[i] === 'number') ? 'double' : 'varchar'));
    const w = r.columns.map((c, i) => Math.max(c.length, tps[i].length, ...filas.map((f) => f[i].length)));
    const num = tps.map((t) => /int|double|decimal/.test(t));
    const cen = (s, n) => s.padStart(Math.floor((n + s.length) / 2)).padEnd(n);
    const L = (a, b, c) => a + w.map((x) => '─'.repeat(x + 2)).join(b) + c;
    const out = [L('┌', '┬', '┐'), '│' + r.columns.map((c, i) => ' ' + cen(c, w[i]) + ' ').join('│') + '│', '│' + tps.map((t, i) => ' ' + cen(t, w[i]) + ' ').join('│') + '│', L('├', '┼', '┤')];
    for (const f of filas) out.push('│' + f.map((v, i) => ' ' + (num[i] ? v.padStart(w[i]) : v.padEnd(w[i])) + ' ').join('│') + '│');
    if (r.values.length > 40) out.push('│' + w.map((x) => ' ' + cen('·', x) + ' ').join('│') + '│');
    out.push(L('└', '┴', '┘'));
    if (r.values.length > 40) out.push(col.dim(`  ${r.values.length} rows (40 shown)`));
    return out.join('\n');
  }

  // ================================================================== dialectos → SQLite
  function dePostgres(sql) {
    return sql
      .replace(/\bBIGSERIAL\b|\bSERIAL\b/gi, 'INTEGER')
      .replace(/::\s*[a-z_]+(\(\d+(,\s*\d+)?\))?/gi, '')
      .replace(/\bNOW\(\)/gi, "datetime('now')")
      .replace(/\bILIKE\b/gi, 'LIKE')
      .replace(/\bTRUE\b/g, '1').replace(/\bFALSE\b/g, '0')
      .replace(/\bCREATE\s+DATABASE\b[^;]*/gi, 'SELECT 1');
  }

  // ================================================================== psql
  function psqlMeta(db, linea, clave) {
    const [cmd, ...resto] = linea.trim().split(/\s+/);
    if (cmd === '\\q') return { out: '', exitMode: true };
    if (cmd === '\\?' || cmd === '\\h') return ok('\\dt          lista las tablas\n\\d TABLA     columnas de una tabla\n\\l           lista las bases\n\\copy TABLA FROM \'archivo.csv\' WITH (FORMAT csv, HEADER)\n\\timing      (no hace nada en el simulador)\n\\q           sale de psql');
    if (cmd === '\\l') return ok(' Name     | Owner    | Encoding\n----------+----------+----------\n ' + (clave.split('/').pop() || 'postgres').padEnd(8) + ' | postgres | UTF8\n postgres | postgres | UTF8\n(2 rows)');
    if (cmd === '\\timing' || cmd === '\\x' || cmd === '\\c' || cmd === '\\conninfo') return ok(cmd === '\\conninfo' ? `You are connected to database "${clave.split('/').pop()}" as user "postgres" on host "localhost" at port "5432".` : '');
    if (cmd === '\\dt') {
      const r = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name");
      if (!r.length) return ok('Did not find any relations.');
      return ok(tablaPsql({ columns: ['Schema', 'Name', 'Type', 'Owner'], values: r[0].values.map((v) => ['public', v[0], 'table', 'postgres']) }).replace(/^/, '          List of relations\n'));
    }
    if (cmd === '\\d') {
      if (!resto[0]) return psqlMeta(db, '\\dt', clave);
      const r = db.exec(`PRAGMA table_info("${resto[0]}")`);
      if (!r.length) return fail(`Did not find any relation named "${resto[0]}".`);
      const t = { INTEGER: 'integer', REAL: 'numeric', TEXT: 'text' };
      return ok(`               Table "public.${resto[0]}"\n` + tablaPsql({ columns: ['Column', 'Type', 'Nullable'], values: r[0].values.map((v) => [v[1], t[String(v[2]).toUpperCase()] || String(v[2]).toLowerCase() || 'text', v[3] ? 'not null' : '']) }).replace(/\n\(\d+ rows?\)$/, ''));
    }
    if (cmd === '\\copy') {
      const m = linea.match(/\\copy\s+(\w+)(?:\s*\(([^)]*)\))?\s+from\s+'([^']+)'/i);
      if (!m) return fail("\\copy: sintaxis: \\copy tabla FROM 'archivo.csv' WITH (FORMAT csv, HEADER)");
      const [, tabla, colsTxt, ruta] = m;
      const txt = readFile(norm(ruta));
      if (txt === null) return fail(`${ruta}: No such file or directory`);
      const header = /header/i.test(linea);
      const filas = parseCsv(txt, /delimiter\s+'(.)'/i.test(linea) ? linea.match(/delimiter\s+'(.)'/i)[1] : ',').slice(header ? 1 : 0);
      const info = db.exec(`PRAGMA table_info("${tabla}")`);
      if (!info.length) return fail(`ERROR:  relation "${tabla}" does not exist`);
      const cols = colsTxt ? colsTxt.split(',').map((x) => x.trim()) : info[0].values.map((v) => v[1]);
      try {
        db.run('BEGIN');
        const st = db.prepare(`INSERT INTO "${tabla}" (${cols.map((c) => `"${c}"`).join(',')}) VALUES (${cols.map(() => '?').join(',')})`);
        for (const f of filas) st.run(cols.map((_, i) => (f[i] === undefined || f[i] === '' ? null : f[i])));
        st.free(); db.run('COMMIT');
      } catch (e) { try { db.run('ROLLBACK'); } catch (x) { /* nada */ } return fail('ERROR:  ' + e.message); }
      guardarBase(clave);
      return ok(`COPY ${filas.length}`);
    }
    return fail(`invalid command ${cmd}\nTry \\? for help.`);
  }
  function psqlSql(db, sql, clave) {
    const trad = dePostgres(sql);
    try {
      const res = db.exec(trad);
      const cambios = db.getRowsModified();
      guardarBase(clave);
      if (res.length) return ok(res.map(tablaPsql).join('\n\n'));
      const v = sql.trim().split(/\s+/)[0].toUpperCase();
      if (v === 'CREATE') return ok(/DATABASE/i.test(sql) ? 'CREATE DATABASE' : /VIEW/i.test(sql) ? 'CREATE VIEW' : /INDEX/i.test(sql) ? 'CREATE INDEX' : 'CREATE TABLE');
      if (v === 'INSERT') return ok(`INSERT 0 ${cambios}`);
      if (v === 'UPDATE' || v === 'DELETE') return ok(`${v} ${cambios}`);
      if (v === 'DROP') return ok('DROP TABLE');
      return ok(v);
    } catch (e) {
      const m = e.message.replace(/^no such table: (\w+)/, 'relation "$1" does not exist').replace(/^no such column: (\w+)/, 'column "$1" does not exist');
      return fail(`ERROR:  ${m}`);
    }
  }
  // repl genérico (lo usa createTerminal a través de r.repl)
  function replPsql(db, clave, nombreDb) {
    return {
      prompt: `${nombreDb}=# `, cont: `${nombreDb}-# `, fin: /;\s*$/,
      esMeta: (l) => l.trim().startsWith('\\'),
      meta: (l) => psqlMeta(db, l, clave),
      ejecutar: async (sql) => psqlSql(db, sql, clave),
    };
  }
  // busca el contenedor de postgres que atiende en un puerto del host
  function postgresEnPuerto(puerto) {
    const s = dk();
    return Object.values(s.containers).find((c) => c.estado === 'running' && /postgres/.test(c.imagen) && (c.puertos || []).some((p) => String(p.host) === String(puerto)));
  }
  const claveDb = (c, nombre) => `pg:${c.volumenDatos || c.id}/${nombre}`;
  async function abrirPsql(c, a, interactivo) {
    const { flags } = Sh.parseArgs(a, { bool: ['-it', '-i', '-t'] });
    const usuario = flags['-U'] || 'postgres';
    const env = c.env || {};
    const nombre = flags['-d'] || (a.find((x, i) => i > 0 && !x.startsWith('-') && !/^-/.test(a[i - 1] || '')) || env.POSTGRES_DB || usuario);
    const validos = new Set([env.POSTGRES_USER || 'postgres']);
    if (!validos.has(usuario)) return fail(`psql: error: connection to server on socket "/var/run/postgresql/.s.PGSQL.5432" failed: FATAL:  role "${usuario}" does not exist`, 2);
    const bases = new Set(['postgres', env.POSTGRES_DB || env.POSTGRES_USER || 'postgres', ...(c.basesCreadas || [])]);
    if (!bases.has(nombre)) return fail(`psql: error: connection to server failed: FATAL:  database "${nombre}" does not exist`, 2);
    const clave = claveDb(c, nombre);
    const db = await base(clave);
    if (flags['-c']) {
      const sql = String(flags['-c']);
      if (/^\s*create\s+database\s+(\w+)/i.test(sql)) { (c.basesCreadas = c.basesCreadas || []).push(sql.match(/database\s+(\w+)/i)[1]); save(); return ok('CREATE DATABASE'); }
      return sql.trim().startsWith('\\') ? psqlMeta(db, sql, clave) : psqlSql(db, sql, clave);
    }
    if (flags['-f']) { const t = readFile(norm(flags['-f'])); if (t === null) return fail(`psql: error: ${flags['-f']}: No such file or directory`); return psqlSql(db, t, clave); }
    if (!interactivo) return fail('psql: usa -c "SQL" o abre la consola en una terminal interactiva');
    return { out: `psql (16.4)\nType "help" for help.`, code: 0, repl: replPsql(db, clave, nombre) };
  }
  def('psql', 'cliente de PostgreSQL: psql -h localhost -U postgres -d base [-c "SQL"]', async (a, ctx) => {
    if (a[0] === '--version' || a[0] === '-V') return ok('psql (PostgreSQL) 16.4');
    const { flags } = Sh.parseArgs(a);
    const puerto = flags['-p'] || 5432;
    const c = postgresEnPuerto(puerto);
    if (!c) return fail(`psql: error: connection to server at "localhost" (127.0.0.1), port ${puerto} failed: Connection refused\n\tIs the server running on that host and accepting TCP/IP connections?\n${col.dim('(levanta un contenedor: docker run -d --name pg -e POSTGRES_PASSWORD=secreto -p 5432:5432 postgres:16)')}`, 2);
    return abrirPsql(c, a, !(ctx && ctx.opts && ctx.opts.noInteractivo));
  });

  // ================================================================== duckdb
  async function duckSql(clave, sql) {
    const db = await base(clave);
    // archivos usados como tablas: FROM 'x.csv' | read_csv_auto('x.csv') | read_csv('x.csv', ...) | read_json_auto('x.json') | read_parquet('x.parquet')
    let n = 0; const tipos = {};
    const cargar = (ruta) => { const t = `__archivo_${n++}`; const info = cargarArchivo(db, t, ruta); tipos[t] = info; return `"${t}"`; };
    let q = sql;
    try {
      q = q.replace(/\b(read_csv_auto|read_csv|read_json_auto|read_json|read_parquet)\s*\(\s*'([^']+)'[^)]*\)/gi, (m, f, ruta) => cargar(ruta));
      q = q.replace(/\b(FROM|JOIN)\s+'([^']+\.(?:csv|tsv|json|ndjson|jsonl|parquet))'/gi, (m, kw, ruta) => `${kw} ${cargar(ruta)}`);
    } catch (e) { return fail(e.message); }
    // COPY (...) TO 'archivo' (FORMAT csv|parquet)
    const cp = q.match(/^\s*COPY\s+([\s\S]+?)\s+TO\s+'([^']+)'\s*(\(([^)]*)\))?\s*;?\s*$/i);
    if (cp) {
      const origen = cp[1].trim().replace(/^\(([\s\S]*)\)$/, '$1');
      const consulta = /^select|^with/i.test(origen) ? origen : `SELECT * FROM ${origen}`;
      let r;
      try { r = db.exec(dePostgres(consulta)); } catch (e) { return fail('Error: ' + e.message); }
      const res = r[r.length - 1] || { columns: [], values: [] };
      const csv = [res.columns.join(','), ...res.values.map((f) => f.map((v) => (v === null ? '' : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : v)).join(','))].join('\n') + '\n';
      const parquet = /parquet/i.test(cp[4] || '') || /\.parquet$/i.test(cp[2]);
      writeFile(norm(cp[2]), parquet ? 'PAR1-SIM\n' + csv : csv); save();
      return ok('');
    }
    // DESCRIBE tabla | DESCRIBE SELECT … : columnas y tipos inferidos
    const desc = q.match(/^\s*DESCRIBE\s+([\s\S]+?)\s*;?\s*$/i);
    if (desc) {
      try {
        const objetivo = /^(select|with)\b/i.test(desc[1]) ? desc[1] : `SELECT * FROM ${desc[1]}`;
        db.run(`DROP TABLE IF EXISTS __desc; CREATE TEMP TABLE __desc AS ${dePostgres(objetivo)}`);
        const info = db.exec('PRAGMA table_info(__desc)')[0];
        const datos = db.exec('SELECT * FROM __desc LIMIT 500')[0] || { values: [] };
        db.run('DROP TABLE __desc');
        const filas = info.values.map((v, i) => [v[1], tipoDe(datos.values.map((f) => (f[i] === null ? '' : String(f[i])))), 'YES', null, null, null]);
        return ok(tablaDuck({ columns: ['column_name', 'column_type', 'null', 'key', 'default', 'extra'], values: filas }, ['varchar', 'varchar', 'varchar', 'varchar', 'varchar', 'varchar']));
      } catch (e) { return fail('Error: ' + e.message); }
    }
    try {
      const res = db.exec(dePostgres(q)).map((r) => ({ columns: r.columns.map((c) => (/^count\(\*\)$/i.test(c) ? 'count_star()' : c)), values: r.values }));
      guardarBase(clave);
      if (!res.length) return ok('');
      return ok(res.map((r) => tablaDuck(r)).join('\n'));
    } catch (e) {
      const m = e.message.replace(/^no such table: (\w+)/, 'Catalog Error: Table with name $1 does not exist!').replace(/^no such column: (\w+)/, 'Binder Error: Referenced column "$1" not found');
      return fail(/Error/.test(m) ? m : 'Error: ' + m);
    } finally {
      for (const t of Object.keys(tipos)) try { db.run(`DROP TABLE IF EXISTS "${t}"`); } catch (e) { /* nada */ }
    }
  }
  function duckMeta(clave, linea) {
    const [cmd] = linea.trim().split(/\s+/);
    if (cmd === '.quit' || cmd === '.exit') return Promise.resolve({ out: '', exitMode: true });
    if (cmd === '.tables') return duckSql(clave, "SELECT name FROM sqlite_master WHERE type IN ('table','view') AND name NOT LIKE '__archivo%' ORDER BY name");
    if (cmd === '.help') return Promise.resolve(ok(".tables   lista tablas\n.mode     (sin efecto en el simulador)\n.quit     sale\nLeer archivos: SELECT * FROM 'datos/clientes.csv';  read_csv_auto('x.csv')  read_json_auto('x.json')\nExportar:      COPY (SELECT …) TO 'salida.parquet' (FORMAT parquet);"));
    return Promise.resolve(ok(''));
  }
  def('duckdb', 'DuckDB: SQL sobre archivos CSV/JSON. duckdb [archivo.duckdb] [-c "SQL"]', async (a, ctx) => {
    if (a[0] === '--version' || a[0] === '-version') return ok('v1.1.3 19864453f7');
    const { flags, pos } = Sh.parseArgs(a);
    const archivo = pos.find((x) => /\.(duckdb|db)$/.test(x));
    const clave = archivo ? `duck:${norm(archivo)}` : `duck:memoria:${uid(6)}`;
    if (archivo && !exists(norm(archivo))) { writeFile(norm(archivo), '(base DuckDB simulada)'); save(); }
    const sql = flags['-c'] || pos.find((x) => x !== archivo);
    if (sql) return String(sql).trim().startsWith('.') ? duckMeta(clave, String(sql)) : duckSql(clave, String(sql));
    if (ctx && ctx.opts && ctx.opts.noInteractivo) return fail('duckdb: usa -c "SQL"');
    return {
      out: `v1.1.3 19864453f7\nEnter ".help" for usage hints.${archivo ? '' : '\nConnected to a transient in-memory database.\nUse ".open FILENAME" to reopen on a persistent database.'}`, code: 0,
      repl: { prompt: 'D ', cont: '‣ ', fin: /;\s*$/, esMeta: (l) => l.trim().startsWith('.'), meta: (l) => duckMeta(clave, l), ejecutar: (s) => duckSql(clave, s) },
    };
  });

  // ================================================================== YAML mínimo (docker-compose.yml)
  function yaml(txt) {
    const lineas = txt.split('\n').map((l) => l.replace(/\s+#.*$/, '').replace(/^#.*$/, '')).filter((l) => l.trim());
    let i = 0;
    const escalar = (v) => {
      v = v.trim();
      if (/^".*"$|^'.*'$/.test(v)) return v.slice(1, -1);
      if (/^\[.*\]$/.test(v)) return v.slice(1, -1).split(',').map((x) => escalar(x)).filter((x) => x !== '');
      if (/^-?\d+$/.test(v)) return Number(v);
      if (v === 'true' || v === 'false') return v === 'true';
      return v;
    };
    const ind = (l) => l.match(/^ */)[0].length;
    function bloque(nivel) {
      if (i >= lineas.length) return null;
      if (lineas[i].trim().startsWith('- ')) {
        const arr = [];
        while (i < lineas.length && ind(lineas[i]) === nivel && lineas[i].trim().startsWith('- ')) {
          const resto = lineas[i].trim().slice(2);
          i++;
          const kv = resto.match(/^([\w.-]+):(?:\s+(.*))?$/);
          if (kv && !/^["']/.test(resto)) {
            const o = { [kv[1]]: kv[2] ? escalar(kv[2]) : bloque(nivel + 4) };
            if (i < lineas.length && ind(lineas[i]) === nivel + 2) Object.assign(o, bloque(nivel + 2));
            arr.push(o);
          } else arr.push(escalar(resto));
        }
        return arr;
      }
      const obj = {};
      while (i < lineas.length && ind(lineas[i]) === nivel) {
        const m = lineas[i].trim().match(/^("?[^":]+"?):\s*(.*)$/);
        if (!m) throw new Error(`yaml: línea ${i + 1} inválida: ${lineas[i].trim()}`);
        const k = m[1].replace(/"/g, ''); i++;
        if (m[2] && m[2] !== '|' && m[2] !== '>') obj[k] = escalar(m[2]);
        else if (i < lineas.length && ind(lineas[i]) > nivel) obj[k] = bloque(ind(lineas[i]));
        else obj[k] = null;
      }
      return obj;
    }
    return bloque(0) || {};
  }

  // ================================================================== docker
  const IMAGENES = {
    'hello-world': { tag: 'latest', mb: 0.02 },
    postgres: { tag: '16', mb: 432, puerto: 5432 },
    python: { tag: '3.12', mb: 1020 },
    'apache/airflow': { tag: '2.9.3', mb: 1340, puerto: 8080 },
    'jupyter/pyspark-notebook': { tag: 'latest', mb: 4840, puerto: 8888 },
    'bitnami/spark': { tag: '3.5', mb: 1580, puerto: 8080 },
    'minio/minio': { tag: 'latest', mb: 158, puerto: 9000 },
    redis: { tag: '7', mb: 117, puerto: 6379 },
    mysql: { tag: '8.4', mb: 586, puerto: 3306 },
    'dpage/pgadmin4': { tag: 'latest', mb: 498, puerto: 80 },
    ubuntu: { tag: '24.04', mb: 78 },
    'metabase/metabase': { tag: 'latest', mb: 790, puerto: 3000 },
  };
  function separarImagen(ref) {
    const [repo, tag] = ref.includes(':') && !/:\d+\//.test(ref) ? [ref.slice(0, ref.lastIndexOf(':')), ref.slice(ref.lastIndexOf(':') + 1)] : [ref, 'latest'];
    return { repo, tag };
  }
  function tenerImagen(ref, salida) {
    const s = dk(); const { repo, tag } = separarImagen(ref);
    const nombre = `${repo}:${tag}`;
    if (s.images[nombre]) return nombre;
    const base = IMAGENES[repo];
    if (!base) return null;
    if (salida) salida.push(`Unable to find image '${nombre}' locally`, `${tag}: Pulling from ${repo.includes('/') ? repo : 'library/' + repo}`, `${uid(12)}: Pull complete`, `${uid(12)}: Pull complete`, `Digest: sha256:${uid(64)}`, `Status: Downloaded newer image for ${nombre}`);
    s.images[nombre] = { id: uid(12), mb: base.mb, creada: ahora() };
    return nombre;
  }
  const nombresAleatorios = ['eager_turing', 'happy_lovelace', 'brave_hopper', 'quirky_curie', 'nifty_shannon', 'vibrant_knuth'];
  function contenedor(ref) {
    const s = dk();
    return s.containers[ref] || Object.values(s.containers).find((c) => c.nombre === ref || c.id.startsWith(ref));
  }
  function puertoOcupado(host, excepto) {
    return Object.values(dk().containers).find((c) => c !== excepto && c.estado === 'running' && (c.puertos || []).some((p) => String(p.host) === String(host)));
  }
  function logsIniciales(c) {
    const img = c.imagen;
    if (/^postgres/.test(img)) return ['The files belonging to this database system will be owned by user "postgres".', 'PostgreSQL init process complete; ready for start up.', `${ahora()}.123 UTC [1] LOG:  starting PostgreSQL 16.4 (Debian 16.4-1.pgdg120+1) on x86_64-pc-linux-gnu`, `${ahora()}.130 UTC [1] LOG:  listening on IPv4 address "0.0.0.0", port 5432`, `${ahora()}.142 UTC [1] LOG:  database system is ready to accept connections`];
    if (/^apache\/airflow/.test(img)) return ['standalone | Starting Airflow Standalone', 'webserver  | [INFO] Listening at: http://0.0.0.0:8080', 'standalone | Airflow is ready', `standalone | Login with username: admin  password: ${uid(16)}`];
    if (/jupyter/.test(img)) return ['[I ServerApp] Jupyter Server 2.14.2 is running at:', `[I ServerApp] http://127.0.0.1:8888/lab?token=${uid(48)}`];
    if (/minio/.test(img)) return ['MinIO Object Storage Server', 'API: http://172.17.0.2:9000  http://127.0.0.1:9000', 'WebUI: http://172.17.0.2:9001 http://127.0.0.1:9001'];
    if (/metabase/.test(img)) return ['Metabase Initialization COMPLETE in 32.4 s'];
    if (/redis/.test(img)) return ['* Ready to accept connections tcp'];
    if (/spark/.test(img)) return ['INFO Master: Starting Spark master at spark://0.0.0.0:7077', 'INFO MasterWebUI: Bound MasterWebUI to 0.0.0.0, and started at http://0.0.0.0:8080'];
    return [];
  }
  const HOLA = `\nHello from Docker!\nThis message shows that your installation appears to be working correctly.\n\nTo generate this message, Docker took the following steps:\n 1. The Docker client contacted the Docker daemon.\n 2. The Docker daemon pulled the "hello-world" image from the Docker Hub.\n 3. The Docker daemon created a new container from that image which runs the\n    executable that produces the output you are currently reading.\n 4. The Docker daemon streamed that output to the Docker client, which sent it\n    to your terminal.\n`;

  // ejecuta el comando de un contenedor "de una vez" (python, echo…) en el contexto indicado
  async function ejecutarEn(dir, cmd, ctx) {
    if (!cmd.length) return ok('');
    const prev = Machine.cwd;
    if (dir && isDir(dir)) Machine.cwd = dir;
    try { return await runLine(cmd.map((x) => (/\s/.test(x) ? `"${x.replace(/"/g, '\\"')}"` : x)).join(' '), ctx ? ctx.opts : {}); } finally { Machine.cwd = prev; }
  }

  async function dockerRun(a, ctx, opciones = {}) {
    const s = dk();
    const flags = { e: [], p: [], v: [] };
    let i = 0;
    for (; i < a.length; i++) {
      const x = a[i];
      if (!x.startsWith('-')) break;
      const sig = () => a[++i];
      if (x === '-d' || x === '--detach') flags.d = true;
      else if (x === '--rm') flags.rm = true;
      else if (x === '-it' || x === '-ti' || x === '-i' || x === '-t') flags.it = true;
      else if (x === '--name') flags.name = sig();
      else if (x.startsWith('--name=')) flags.name = x.slice(7);
      else if (x === '-e' || x === '--env') flags.e.push(sig());
      else if (x === '-p' || x === '--publish') flags.p.push(sig());
      else if (x === '-v' || x === '--volume') flags.v.push(sig());
      else if (x === '-w' || x === '--workdir') flags.w = sig();
      else if (x === '--network') flags.net = sig();
      else if (x === '--env-file') { const t = readFile(norm(sig())); if (t) t.split('\n').filter((l) => /^\w+=/.test(l)).forEach((l) => flags.e.push(l)); }
      else return fail(`unknown flag: ${x}\nSee 'docker run --help'.`, 125);
    }
    const ref = a[i]; const cmd = a.slice(i + 1);
    if (!ref) return fail('"docker run" requires at least 1 argument.\nSee \'docker run --help\'.', 1);
    const salida = [];
    const imagen = tenerImagen(ref, flags.d ? null : salida);
    if (!imagen) return fail(`Unable to find image '${ref.includes(':') ? ref : ref + ':latest'}' locally\ndocker: Error response from daemon: pull access denied for ${ref.split(':')[0]}, repository does not exist or may require 'docker login'.`, 125);
    if (flags.name && Object.values(s.containers).some((c) => c.nombre === flags.name)) return fail(`docker: Error response from daemon: Conflict. The container name "/${flags.name}" is already in use by container "${contenedor(flags.name).id}". You have to remove (or rename) that container to be able to reuse that name.`, 125);
    const puertos = flags.p.map((p) => { const [h, c] = String(p).split(':'); return { host: c ? h : h, cont: c || h }; });
    for (const p of puertos) if (puertoOcupado(p.host)) return fail(`docker: Error response from daemon: driver failed programming external connectivity: Bind for 0.0.0.0:${p.host} failed: port is already allocated.`, 125);
    const env = Object.fromEntries(flags.e.map((x) => [x.split('=')[0], x.split('=').slice(1).join('=')]));
    const c = { id: uid(12), nombre: flags.name || opciones.nombre || nombresAleatorios[Math.floor(Math.random() * nombresAleatorios.length)] + '_' + uid(2), imagen, cmd: cmd.join(' '), env, puertos, creado: ahora(), estado: 'running', logs: [], proyecto: opciones.proyecto, servicio: opciones.servicio };
    for (const v of flags.v) { const [origen, destino] = String(v).split(':'); if (/postgresql\/data/.test(destino || '')) { c.volumenDatos = origen; if (!/^[./~]/.test(origen)) s.volumes[origen] = s.volumes[origen] || { creado: ahora() }; } }
    // reglas reales de las imágenes
    if (/^postgres/.test(imagen) && !env.POSTGRES_PASSWORD && env.POSTGRES_HOST_AUTH_METHOD !== 'trust') {
      c.estado = 'exited'; c.codigo = 1;
      c.logs = ['Error: Database is uninitialized and superuser password is not specified.', '       You must specify POSTGRES_PASSWORD to a non-empty value for the', '       superuser. For example, "-e POSTGRES_PASSWORD=password" on "docker run".'];
    } else if (/^hello-world/.test(imagen)) { c.estado = 'exited'; c.codigo = 0; c.logs = HOLA.split('\n'); }
    else if (cmd.length || (s.images[imagen] && s.images[imagen].cmd && !IMAGENES[separarImagen(imagen).repo])) {
      const comando = cmd.length ? cmd : s.images[imagen].cmd;
      if (/^(python|python3|ubuntu)/.test(imagen.split('/').pop()) || s.images[imagen].contexto) {
        const dir = s.images[imagen].contexto || (flags.v.length ? norm(String(flags.v[0]).split(':')[0].replace(/^\$\(pwd\)|^\$PWD/, '.')) : Machine.cwd);
        const r = await ejecutarEn(dir, comando, ctx);
        c.estado = 'exited'; c.codigo = r.code; c.logs = String(r.out || '').split('\n');
      } else c.logs = logsIniciales(c);
    } else c.logs = logsIniciales(c);
    if (!(flags.rm && c.estado === 'exited')) s.containers[c.id] = c;
    save();
    if (opciones.silencioso) return { code: 0, out: '', c };
    if (flags.d) return { out: [...salida, c.id + uid(52)].join('\n'), code: 0, c };
    if (c.estado === 'exited') return { out: [...salida, ...c.logs].join('\n').replace(/\n+$/, ''), code: c.codigo || 0, c };
    return { out: [...salida, ...c.logs, col.dim('(el contenedor sigue corriendo en primer plano; en la vida real Ctrl+C lo detiene. Usa -d para dejarlo en segundo plano)')].join('\n'), code: 0, c };
  }

  function docker_ps(a) {
    const s = dk();
    const todos = a.includes('-a') || a.includes('--all');
    const soloId = a.includes('-q');
    const lista = Object.values(s.containers).filter((c) => todos || c.estado === 'running');
    if (soloId) return ok(lista.map((c) => c.id).join('\n'));
    const filas = lista.map((c) => [c.id, c.imagen, `"${(c.cmd || 'docker-entrypoint').slice(0, 20)}"`, 'hace unos minutos', c.estado === 'running' ? 'Up unos minutos' : `Exited (${c.codigo || 0}) hace unos segundos`, c.estado === 'running' ? (c.puertos || []).map((p) => `0.0.0.0:${p.host}->${p.cont}/tcp`).join(', ') : '', c.nombre]);
    return ok(Sh.fmtTable(['CONTAINER ID', 'IMAGE', 'COMMAND', 'CREATED', 'STATUS', 'PORTS', 'NAMES'], filas).replace(/^(.*)\n-+(\s+-+)*\n?/, '$1\n'));
  }

  // ---------- docker build (Dockerfile del directorio de contexto)
  function dockerBuild(a) {
    const s = dk();
    const { flags, pos } = Sh.parseArgs(a);
    const ctxDir = norm(pos[0] || '.');
    const archivo = flags['-f'] ? norm(flags['-f']) : ctxDir + '/Dockerfile';
    const df = readFile(archivo);
    if (df === null) return fail(`ERROR: failed to solve: failed to read dockerfile: open Dockerfile: no such file or directory`, 1);
    const tag = flags['-t'] || flags['--tag'];
    const pasos = df.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
    const desde = pasos.find((p) => /^FROM\s/i.test(p));
    if (!desde) return fail('ERROR: failed to solve: dockerfile parse error: no FROM instruction', 1);
    const baseImg = desde.split(/\s+/)[1];
    if (!tenerImagen(baseImg)) return fail(`ERROR: failed to solve: ${baseImg}: failed to resolve source metadata: pull access denied, repository does not exist`, 1);
    const out = [`[+] Building ${(Math.random() * 20 + 3).toFixed(1)}s (${pasos.length + 2}/${pasos.length + 2}) FINISHED`, ` => [internal] load build definition from Dockerfile`, ` => [internal] load metadata for docker.io/library/${baseImg}`];
    let cmd = null; let n = 1;
    for (const p of pasos) {
      const [instr, ...resto] = p.split(/\s+/);
      const I = instr.toUpperCase();
      if (!['FROM', 'RUN', 'COPY', 'ADD', 'WORKDIR', 'ENV', 'CMD', 'ENTRYPOINT', 'EXPOSE', 'ARG', 'LABEL', 'USER'].includes(I)) return fail(`ERROR: failed to solve: dockerfile parse error on line ${pasos.indexOf(p) + 1}: unknown instruction: ${instr}`, 1);
      if (I === 'COPY' || I === 'ADD') { const src = resto[0]; if (src !== '.' && !exists(ctxDir + '/' + src)) return fail(` => ERROR [${n}/${pasos.length}] ${p}\nERROR: failed to solve: failed to compute cache key: "/${src}": not found`, 1); }
      if (I === 'RUN' && /pip install -r (\S+)/.test(p) && !exists(ctxDir + '/' + p.match(/pip install -r (\S+)/)[1])) return fail(` => ERROR [${n}/${pasos.length}] ${p}\nERROR: Could not open requirements file: [Errno 2] No such file or directory: '${p.match(/pip install -r (\S+)/)[1]}'`, 1);
      if (I === 'CMD' || I === 'ENTRYPOINT') { const t = resto.join(' '); try { cmd = JSON.parse(t); } catch (e) { cmd = t.split(/\s+/); } }
      if (I !== 'CMD' && I !== 'EXPOSE' && I !== 'ENV' && I !== 'LABEL' && I !== 'ARG') out.push(` => [${n++}/${pasos.length}] ${p}`);
    }
    const nombre = tag ? (tag.includes(':') ? tag : tag + ':latest') : `<none>:<none>-${uid(4)}`;
    s.images[nombre] = { id: uid(12), mb: (IMAGENES[separarImagen(baseImg).repo] || { mb: 150 }).mb + 12, creada: ahora(), cmd, contexto: ctxDir };
    out.push(' => exporting to image', ` => => writing image sha256:${uid(64)}`, tag ? ` => => naming to docker.io/library/${nombre}` : '');
    save();
    return ok(out.filter(Boolean).join('\n'));
  }

  // ---------- docker compose
  function leerCompose(dir) {
    for (const f of ['compose.yaml', 'compose.yml', 'docker-compose.yml', 'docker-compose.yaml']) {
      const t = readFile(dir + '/' + f);
      if (t !== null) return { archivo: f, cfg: yaml(t) };
    }
    return null;
  }
  async function compose(a, ctx) {
    const s = dk();
    const dir = Machine.cwd;
    const proyecto = dir.split('/').pop().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    const sub = a[0];
    if (sub === 'version' || a[0] === '--version') return ok('Docker Compose version v2.29.2');
    const cf = leerCompose(dir);
    if (!cf) return fail('no configuration file provided: not found', 1);
    let cfg;
    try { cfg = cf.cfg; } catch (e) { return fail(e.message); }
    const servicios = cfg.services || {};
    if (!Object.keys(servicios).length) return fail(`validating ${dir}/${cf.archivo}: services must be a mapping`, 15);
    const nombreC = (svc) => (servicios[svc] && servicios[svc].container_name) || `${proyecto}-${svc}-1`;
    const mios = () => Object.values(s.containers).filter((c) => c.proyecto === proyecto);
    const orden = []; const visto = new Set();
    const visitar = (n) => { if (visto.has(n)) return; visto.add(n); const d = servicios[n].depends_on; (Array.isArray(d) ? d : d ? Object.keys(d) : []).forEach((x) => servicios[x] && visitar(x)); orden.push(n); };
    Object.keys(servicios).forEach(visitar);
    const resto = a.slice(1);
    if (sub === 'config') return ok(JSON.stringify(cfg, null, 2).replace(/[{}",]/g, '').replace(/\n\s*\n/g, '\n'));
    if (sub === 'up') {
      const out = [];
      const tirar = [];
      for (const n of orden) {
        const sv = servicios[n];
        if (contenedor(nombreC(n)) && contenedor(nombreC(n)).estado === 'running') { out.push(` ${col.ok('✔')} Container ${nombreC(n).padEnd(28)} Running`); continue; }
        if (contenedor(nombreC(n))) { delete s.containers[contenedor(nombreC(n)).id]; }
        let img = sv.image;
        if (sv.build) {
          const ctxDir = norm(typeof sv.build === 'string' ? sv.build : sv.build.context || '.');
          img = `${proyecto}-${n}`;
          const r = dockerBuild(['-t', img, ctxDir]);
          if (r.code) return { out: r.out, code: r.code };
          out.push(` ${col.ok('✔')} ${img.padEnd(38)} Built`);
        } else if (!tenerImagen(img)) return fail(`Error response from daemon: pull access denied for ${img}, repository does not exist`, 18);
        else if (!s.images[tenerImagen(img)].mostrada) { tirar.push(n); s.images[tenerImagen(img)].mostrada = true; }
        const env = Array.isArray(sv.environment) ? sv.environment : Object.entries(sv.environment || {}).map(([k, v]) => `${k}=${v}`);
        const args = ['-d', '--name', nombreC(n)];
        env.forEach((e) => args.push('-e', String(e)));
        (sv.ports || []).forEach((p) => args.push('-p', String(p)));
        (sv.volumes || []).forEach((v) => { const t = String(v); const [o] = t.split(':'); args.push('-v', /^[./~]/.test(o) ? t : `${proyecto}_${t}`); if (!/^[./~]/.test(o)) s.volumes[`${proyecto}_${o}`] = s.volumes[`${proyecto}_${o}`] || { creado: ahora() }; });
        args.push(img);
        if (sv.command) args.push(...(Array.isArray(sv.command) ? sv.command : String(sv.command).split(/\s+/)));
        const r = await dockerRun(args, ctx, { proyecto, servicio: n, silencioso: true });
        if (r.code) return r;
        out.push(` ${col.ok('✔')} Container ${nombreC(n).padEnd(28)} ${r.c && r.c.estado === 'running' ? 'Started' : 'Exited'}`);
      }
      const red = ` ${col.ok('✔')} Network ${(proyecto + '_default').padEnd(30)} Created`;
      s.networks[proyecto + '_default'] = 1;
      save();
      const cab = `[+] Running ${out.length + 1}/${out.length + 1}`;
      const pulls = tirar.map((n) => ` ${col.ok('✔')} ${n} Pulled`);
      if (!resto.includes('-d') && !resto.includes('--detach')) {
        const logs = mios().flatMap((c) => c.logs.slice(-3).map((l) => `${col.info((c.servicio || c.nombre).padEnd(10) + ' |')} ${l}`));
        return ok([...pulls, cab, red, ...out, '', ...logs, col.dim('(en la vida real quedaría mostrando los logs; usa -d para dejarlo en segundo plano)')].join('\n'));
      }
      return ok([...pulls, cab, red, ...out].join('\n'));
    }
    if (sub === 'ps') {
      const filas = mios().filter((c) => c.estado === 'running' || resto.includes('-a')).map((c) => [c.nombre, c.imagen, c.servicio, c.estado === 'running' ? 'Up unos minutos' : `Exited (${c.codigo || 0})`, (c.puertos || []).map((p) => `0.0.0.0:${p.host}->${p.cont}/tcp`).join(', ')]);
      return ok(Sh.fmtTable(['NAME', 'IMAGE', 'SERVICE', 'STATUS', 'PORTS'], filas).replace(/^(.*)\n-+(\s+-+)*\n?/, '$1\n'));
    }
    if (sub === 'logs') {
      const svc = resto.find((x) => !x.startsWith('-'));
      const cs = mios().filter((c) => !svc || c.servicio === svc);
      if (svc && !cs.length) return fail(`no such service: ${svc}`);
      return ok(cs.flatMap((c) => c.logs.map((l) => `${col.info((c.servicio + '-1').padEnd(10) + ' |')} ${l}`)).join('\n'));
    }
    if (sub === 'down') {
      const out = [];
      for (const c of mios().reverse()) { out.push(` ${col.ok('✔')} Container ${c.nombre.padEnd(28)} Removed`); if (!c.volumenDatos) Object.keys(Machine.cloud.dbs || {}).filter((k) => k.startsWith(`pg:${c.id}/`)).forEach(borrarBase); delete s.containers[c.id]; }
      if (resto.includes('-v') || resto.includes('--volumes')) for (const v of Object.keys(s.volumes).filter((x) => x.startsWith(proyecto + '_'))) { delete s.volumes[v]; Object.keys(Machine.cloud.dbs || {}).filter((k) => k.startsWith(`pg:${v}/`)).forEach(borrarBase); out.push(` ${col.ok('✔')} Volume ${v.padEnd(31)} Removed`); }
      delete s.networks[proyecto + '_default'];
      out.push(` ${col.ok('✔')} Network ${(proyecto + '_default').padEnd(30)} Removed`);
      save();
      return ok([`[+] Running ${out.length}/${out.length}`, ...out].join('\n'));
    }
    if (sub === 'exec' || sub === 'run') {
      const limpio = resto.filter((x) => x !== '-it' && x !== '-T' && x !== '--rm');
      const svc = limpio[0];
      if (!servicios[svc]) return fail(`service "${svc}" is not running`);
      const c = contenedor(nombreC(svc));
      if (!c || c.estado !== 'running') return fail(`service "${svc}" is not running`);
      return dockerExec([c.nombre, ...limpio.slice(1)], ctx, resto.includes('-it') || sub === 'exec');
    }
    if (sub === 'stop' || sub === 'start' || sub === 'restart') {
      for (const c of mios()) c.estado = sub === 'stop' ? 'exited' : 'running';
      save();
      return ok(mios().map((c) => ` ${col.ok('✔')} Container ${c.nombre.padEnd(28)} ${sub === 'stop' ? 'Stopped' : 'Started'}`).join('\n'));
    }
    return fail(`unknown docker command: "compose ${sub}"`);
  }

  async function dockerExec(a, ctx, interactivoForzado) {
    const limpio = []; let it = !!interactivoForzado;
    for (const x of a) { if (x === '-it' || x === '-ti' || x === '-i' || x === '-t') it = true; else limpio.push(x); }
    const c = contenedor(limpio[0]);
    if (!c) return fail(`Error response from daemon: No such container: ${limpio[0]}`);
    if (c.estado !== 'running') return fail(`Error response from daemon: container ${c.id} is not running`);
    const cmd = limpio.slice(1);
    if (!cmd.length) return fail('"docker exec" requires at least 2 arguments.');
    if (cmd[0] === 'psql') {
      if (!/postgres/.test(c.imagen)) return fail(`OCI runtime exec failed: exec failed: unable to start container process: exec: "psql": executable file not found in $PATH: unknown`, 126);
      return abrirPsql(c, cmd, it && !(ctx && ctx.opts && ctx.opts.noInteractivo));
    }
    if (cmd[0] === 'bash' || cmd[0] === 'sh') return ok(col.dim(`(simulado) estarías dentro del contenedor ${c.nombre}. Ejecuta comandos concretos: docker exec ${c.nombre} psql …, docker exec ${c.nombre} ls …`));
    if (cmd[0] === 'airflow' && /airflow/.test(c.imagen)) return Commands.airflow(cmd.slice(1), ctx);
    if (cmd[0] === 'env') return ok(Object.entries(c.env || {}).map(([k, v]) => `${k}=${v}`).join('\n'));
    return ejecutarEn(Machine.cwd, cmd, ctx);
  }

  def('docker', 'contenedores (simulado con estado): run, ps, images, logs, exec, stop, rm, build, compose…', async (a, ctx) => {
    const s = dk();
    const sub = a[0];
    if (!sub || sub === '--help') return ok('Usage:  docker [OPTIONS] COMMAND\n\nCommon Commands:\n  run         Create and run a new container from an image\n  exec        Execute a command in a running container\n  ps          List containers\n  build       Build an image from a Dockerfile\n  pull        Download an image from a registry\n  images      List images\n  logs        Fetch the logs of a container\n  stop/start  Stop or start containers\n  rm / rmi    Remove containers / images\n  compose     Docker Compose (up, down, ps, logs, exec)\n  volume      Manage volumes\n\n' + col.dim('(simulado: imágenes conocidas: ' + Object.keys(IMAGENES).join(', ') + ')'));
    if (sub === '--version' || sub === '-v') return ok('Docker version 27.3.1, build ce12230');
    if (sub === 'version') return ok('Client:\n Version:           27.3.1\n API version:       1.47\n\nServer: Docker Desktop 4.35.1\n Engine:\n  Version:          27.3.1');
    if (sub === 'info') return ok(` Containers: ${Object.keys(s.containers).length}\n  Running: ${Object.values(s.containers).filter((c) => c.estado === 'running').length}\n Images: ${Object.keys(s.images).length}\n Server Version: 27.3.1\n Operating System: Docker Desktop`);
    if (sub === 'run') return dockerRun(a.slice(1), ctx);
    if (sub === 'pull') {
      const ref = a[1]; if (!ref) return fail('"docker pull" requires exactly 1 argument.');
      const { repo, tag } = separarImagen(ref);
      if (!IMAGENES[repo]) return fail(`Error response from daemon: pull access denied for ${repo}, repository does not exist or may require 'docker login'`);
      const ya = s.images[`${repo}:${tag}`];
      tenerImagen(ref); save();
      return ok(ya ? `${tag}: Pulling from ${repo}\nDigest: sha256:${uid(64)}\nStatus: Image is up to date for ${repo}:${tag}` : `${tag}: Pulling from ${repo.includes('/') ? repo : 'library/' + repo}\n${uid(12)}: Pull complete\n${uid(12)}: Pull complete\nDigest: sha256:${uid(64)}\nStatus: Downloaded newer image for ${repo}:${tag}\ndocker.io/${repo.includes('/') ? repo : 'library/' + repo}:${tag}`);
    }
    if (sub === 'images' || (sub === 'image' && (a[1] === 'ls' || a[1] === 'list'))) {
      return ok(Sh.fmtTable(['REPOSITORY', 'TAG', 'IMAGE ID', 'CREATED', 'SIZE'], Object.entries(s.images).map(([n, im]) => { const { repo, tag } = separarImagen(n); return [repo, tag, im.id, 'hace unos minutos', im.mb >= 1000 ? (im.mb / 1000).toFixed(2) + 'GB' : im.mb + 'MB']; })).replace(/^(.*)\n-+(\s+-+)*\n?/, '$1\n'));
    }
    if (sub === 'ps' || (sub === 'container' && a[1] === 'ls')) return docker_ps(a.slice(sub === 'ps' ? 1 : 2));
    if (sub === 'logs') {
      const c = contenedor(a.filter((x) => !x.startsWith('-')).slice(1)[0]);
      if (!c) return fail(`Error response from daemon: No such container: ${a[a.length - 1]}`);
      return ok(c.logs.join('\n'));
    }
    if (sub === 'stop' || sub === 'start' || sub === 'restart' || sub === 'kill') {
      const out = [];
      for (const n of a.slice(1)) {
        const c = contenedor(n); if (!c) return fail(`Error response from daemon: No such container: ${n}`);
        if (sub !== 'stop' && sub !== 'kill' && (c.puertos || []).some((p) => puertoOcupado(p.host, c))) return fail(`Error response from daemon: driver failed programming external connectivity: Bind for 0.0.0.0:${c.puertos[0].host} failed: port is already allocated`);
        c.estado = sub === 'stop' || sub === 'kill' ? 'exited' : 'running'; c.codigo = sub === 'kill' ? 137 : 0; out.push(n);
      }
      save(); return ok(out.join('\n'));
    }
    if (sub === 'rm') {
      const forzar = a.includes('-f') || a.includes('--force');
      const out = [];
      for (const n of a.slice(1).filter((x) => !x.startsWith('-'))) {
        const c = contenedor(n); if (!c) return fail(`Error response from daemon: No such container: ${n}`);
        if (c.estado === 'running' && !forzar) return fail(`Error response from daemon: cannot remove container "/${c.nombre}": container is running: stop the container before removing or force remove`);
        if (!c.volumenDatos) Object.keys(Machine.cloud.dbs || {}).filter((k) => k.startsWith(`pg:${c.id}/`)).forEach(borrarBase);
        delete s.containers[c.id]; out.push(n);
      }
      save(); return ok(out.join('\n'));
    }
    if (sub === 'rmi') {
      const n = a[1]; const nombre = n && (n.includes(':') ? n : n + ':latest');
      if (!s.images[nombre]) return fail(`Error response from daemon: No such image: ${n}`);
      const usa = Object.values(s.containers).find((c) => c.imagen === nombre);
      if (usa) return fail(`Error response from daemon: conflict: unable to remove repository reference "${n}" (must force) - container ${usa.id} is using its referenced image`);
      delete s.images[nombre]; save(); return ok(`Untagged: ${nombre}\nDeleted: sha256:${uid(64)}`);
    }
    if (sub === 'exec') return dockerExec(a.slice(1), ctx);
    if (sub === 'build') return dockerBuild(a.slice(1));
    if (sub === 'compose') return compose(a.slice(1), ctx);
    if (sub === 'volume') {
      if (a[1] === 'ls') return ok(Sh.fmtTable(['DRIVER', 'VOLUME NAME'], Object.keys(s.volumes).map((v) => ['local', v])).replace(/^(.*)\n-+(\s+-+)*\n?/, '$1\n'));
      if (a[1] === 'create') { s.volumes[a[2]] = { creado: ahora() }; save(); return ok(a[2]); }
      if (a[1] === 'rm') { delete s.volumes[a[2]]; Object.keys(Machine.cloud.dbs || {}).filter((k) => k.startsWith(`pg:${a[2]}/`)).forEach(borrarBase); save(); return ok(a[2]); }
    }
    if (sub === 'network' && a[1] === 'ls') return ok(Sh.fmtTable(['NETWORK ID', 'NAME', 'DRIVER'], Object.keys(s.networks).map((n) => [uid(12), n, n === 'host' || n === 'none' ? n : 'bridge'])).replace(/^(.*)\n-+(\s+-+)*\n?/, '$1\n'));
    if (sub === 'system' && a[1] === 'prune') { for (const [k, c] of Object.entries(s.containers)) if (c.estado !== 'running') delete s.containers[k]; save(); return ok('Deleted Containers: …\nTotal reclaimed space: 1.2GB'); }
    if (sub === 'login') return ok('Login Succeeded');
    return fail(`docker: '${sub}' is not a docker command.\nSee 'docker --help'`);
  });

  // ================================================================== entornos de Python y herramientas
  def('source', 'carga un script en la sesión (source .venv/bin/activate)', (a) => {
    const p = norm(a[0] || '');
    if (!exists(p)) return fail(`bash: ${a[0]}: No existe el archivo o el directorio`);
    if (/bin\/activate$/.test(p)) { Machine.env.VIRTUAL_ENV = p.replace(/\/bin\/activate$/, ''); save(); return ok(''); }
    return Commands.bash([a[0]]);
  });
  Commands['.'] = Commands.source;
  def('deactivate', 'sale del entorno virtual de Python', () => { delete Machine.env.VIRTUAL_ENV; save(); return ok(''); });
  def('bash', 'ejecuta un script línea por línea: bash script.sh', async (a, ctx) => {
    if (!a.length) return ok(col.dim('(ya estás en bash)'));
    if (a[0] === '-c') return runLine(a[1] || '', ctx ? ctx.opts : {});
    const t = readFile(norm(a[0]));
    if (t === null) return fail(`bash: ${a[0]}: No existe el archivo o el directorio`, 127);
    const salidas = [];
    let code = 0;
    const estricto = /set -e/.test(t);
    for (const l of t.split('\n')) {
      if (!l.trim() || l.trim().startsWith('#') || /^set -/.test(l.trim())) continue;
      const r = await runLine(l, ctx ? ctx.opts : {});
      if (r.out) salidas.push(r.out);
      code = r.code;
      if (code && estricto) break;
    }
    return { out: salidas.join('\n'), code };
  });
  Commands.sh = Commands.bash;
  def('chmod', 'cambia permisos (chmod +x script.sh)', (a) => {
    const p = norm(a[a.length - 1] || '');
    if (!exists(p)) return fail(`chmod: no se puede acceder a '${a[a.length - 1]}': No existe el archivo o el directorio`);
    if (Machine.fs[p]) { Machine.fs[p].x = a.some((x) => /\+x|7\d\d|5\d\d/.test(x)) || Machine.fs[p].x; save(); }
    return ok('');
  });
  def('ssh-keygen', 'genera un par de claves SSH (ssh-keygen -t ed25519 -C "tu@email")', (a) => {
    const { flags } = Sh.parseArgs(a);
    const tipo = flags['-t'] || 'ed25519';
    const ruta = norm(flags['-f'] || `~/.ssh/id_${tipo}`);
    mkdirp(ruta.replace(/\/[^/]+$/, ''));
    if (exists(ruta)) return fail(`${display(ruta)} already exists.\nOverwrite (y/n)? n`);
    const clave = 'AAAAC3NzaC1lZDI1NTE5AAAAI' + Array.from({ length: 43 }, () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'[Math.floor(Math.random() * 64)]).join('');
    writeFile(ruta, `-----BEGIN OPENSSH PRIVATE KEY-----\n(clave privada simulada: nunca la compartas)\n-----END OPENSSH PRIVATE KEY-----\n`);
    writeFile(ruta + '.pub', `ssh-${tipo} ${clave} ${flags['-C'] || 'alumno@academia'}\n`);
    save();
    return ok(`Generating public/private ${tipo} key pair.\nEnter passphrase (empty for no passphrase): ${col.dim('(simulado: en tu compu, pon una frase)')}\nYour identification has been saved in ${display(ruta)}\nYour public key has been saved in ${display(ruta)}.pub\nThe key fingerprint is:\nSHA256:${uid(43)} ${flags['-C'] || 'alumno@academia'}`);
  });
  def('ssh', 'conexión SSH (prueba: ssh -T git@github.com)', (a) => {
    if (a.includes('git@github.com')) {
      const tiene = Object.keys(Machine.fs).some((k) => /\/\.ssh\/id_\w+\.pub$/.test(k));
      if (!tiene) return fail('git@github.com: Permission denied (publickey).\n' + col.dim('(primero crea una clave con ssh-keygen y súbela a GitHub > Settings > SSH keys)'), 255);
      if (!Machine.cloud.githubSsh) return fail('git@github.com: Permission denied (publickey).\n' + col.dim('(la clave existe, pero falta subir el .pub a GitHub; para simular que lo hiciste: gh ssh-key add ~/.ssh/id_ed25519.pub)'), 255);
      return { out: 'Hi alumno! You\'ve successfully authenticated, but GitHub does not provide shell access.', code: 1 };
    }
    return fail(`ssh: connect to host ${a[a.length - 1]} port 22: Connection timed out`, 255);
  });
  def('gh', 'GitHub CLI (simulado): gh auth login, gh repo create, gh ssh-key add', (a) => {
    if (a[0] === '--version') return ok('gh version 2.61.0 (2024-11-06)');
    if (a[0] === 'auth' && a[1] === 'login') { Machine.cloud.gh = true; save(); return ok('? Where do you use GitHub? GitHub.com\n? What is your preferred protocol for Git operations? SSH\n! First copy your one-time code: ' + uid(4).toUpperCase() + '-' + uid(4).toUpperCase() + '\n✓ Authentication complete.\n✓ Logged in as alumno'); }
    if (a[0] === 'auth' && a[1] === 'status') return Machine.cloud.gh ? ok('github.com\n  ✓ Logged in to github.com account alumno (keyring)') : fail('You are not logged into any GitHub hosts. To log in, run: gh auth login');
    if (!Machine.cloud.gh) return fail('To get started with GitHub CLI, please run:  gh auth login');
    if (a[0] === 'ssh-key' && a[1] === 'add') { if (!exists(norm(a[2] || ''))) return fail(`open ${a[2]}: no such file or directory`); Machine.cloud.githubSsh = true; save(); return ok('✓ Public key added to your account'); }
    if (a[0] === 'repo' && a[1] === 'create') { const n = a[2]; return ok(`✓ Created repository alumno/${n} on GitHub\n  https://github.com/alumno/${n}` + (a.includes('--source=.') || a.includes('--source') ? `\n✓ Added remote git@github.com:alumno/${n}.git` : '')); }
    return fail(`unknown command "${a[0]}" for "gh"`);
  });
  def('uv', 'gestor de proyectos y entornos de Python: uv init, uv venv, uv add, uv run', async (a, ctx) => {
    const sub = a[0];
    if (sub === '--version') return ok('uv 0.5.4');
    if (sub === 'init') {
      const n = a[1] || Machine.cwd.split('/').pop();
      const d = a[1] ? norm(a[1]) : Machine.cwd;
      mkdirp(d);
      writeFile(d + '/pyproject.toml', `[project]\nname = "${n}"\nversion = "0.1.0"\ndescription = "Add your description here"\nreadme = "README.md"\nrequires-python = ">=3.12"\ndependencies = []\n`);
      writeFile(d + '/main.py', `def main():\n    print("Hello from ${n}!")\n\n\nif __name__ == "__main__":\n    main()\n`);
      writeFile(d + '/.python-version', '3.12\n'); writeFile(d + '/README.md', ''); writeFile(d + '/.gitignore', '__pycache__/\n.venv/\n');
      save();
      return ok(`Initialized project \`${n}\``);
    }
    if (sub === 'venv') { mkdirp(norm('.venv/bin')); writeFile(norm('.venv/bin/activate'), '# entorno virtual (simulado)\n'); save(); return ok('Using CPython 3.12.7\nCreating virtual environment at: .venv\nActivate with: source .venv/bin/activate'); }
    if (sub === 'add' || (sub === 'pip' && a[1] === 'install')) {
      const pk = a.slice(sub === 'add' ? 1 : 2).filter((x) => !x.startsWith('-'));
      const pp = norm('pyproject.toml');
      if (sub === 'add') {
        const t = readFile(pp);
        if (t === null) return fail('error: No `pyproject.toml` found in current directory or any parent directory');
        const deps = t.match(/dependencies = \[([^\]]*)\]/);
        const prev = deps && deps[1].trim() ? deps[1].split(',').map((x) => x.trim()).filter(Boolean) : [];
        writeFile(pp, t.replace(/dependencies = \[[^\]]*\]/, `dependencies = [\n${[...prev, ...pk.map((x) => `"${x}>=1.0"`)].map((x) => '    ' + x).join(',\n')},\n]`));
        if (!exists(norm('.venv'))) { mkdirp(norm('.venv/bin')); writeFile(norm('.venv/bin/activate'), '# entorno virtual (simulado)\n'); }
        writeFile(norm('uv.lock'), `version = 1\nrequires-python = ">=3.12"\n# (lock simulado)\n` + pk.map((x) => `[[package]]\nname = "${x}"\n`).join(''));
        save();
      }
      return ok(`Resolved ${pk.length + 3} packages in 312ms\nPrepared ${pk.length} packages in 1.21s\nInstalled ${pk.length + 2} packages in 18ms\n` + pk.map((x) => ` + ${x}==latest`).join('\n'));
    }
    if (sub === 'sync') return ok('Resolved 12 packages in 4ms\nAudited 12 packages in 0.31ms');
    if (sub === 'run') return runLine(a.slice(1).map((x) => (/\s/.test(x) ? `"${x}"` : x)).join(' '), ctx ? ctx.opts : {});
    if (sub === 'python' && a[1] === 'install') return ok(`Installed Python ${a[2] || '3.12.7'} in 2.3s`);
    return fail(`error: unrecognized subcommand '${sub}'`);
  });
  def('java', 'Java (lo necesita Spark): java -version', (a) => (a[0] === '-version' || a[0] === '--version' ? ok('openjdk version "17.0.12" 2024-07-16\nOpenJDK Runtime Environment Temurin-17.0.12+7 (build 17.0.12+7)\nOpenJDK 64-Bit Server VM Temurin-17.0.12+7 (build 17.0.12+7, mixed mode, sharing)') : fail('Usage: java -version')));
  def('spark-submit', 'ejecuta un script de PySpark en modo local: spark-submit --master "local[*]" job.py', async (a, ctx) => {
    if (a[0] === '--version') return ok('Welcome to Spark version 3.5.3\nUsing Scala version 2.12.18, OpenJDK 64-Bit Server VM, 17.0.12');
    const script = a.find((x) => /\.py$/.test(x));
    if (!script) return fail('Error: Missing application resource.');
    const r = await Commands.python([script, ...a.slice(a.indexOf(script) + 1)], ctx);
    return { out: `${col.dim('24/10/24 10:00:01 INFO SparkContext: Running Spark version 3.5.3 (local[*])')}\n${r.out}\n${col.dim('24/10/24 10:00:09 INFO SparkContext: Successfully stopped SparkContext')}`, code: r.code };
  });
  const instalar = (gestor) => (a) => {
    const quitar = new Set(['install', 'update', 'upgrade', '-y', '--cask', '-e', '--id', '--silent', 'sudo']);
    if (a[0] === 'update' || a[0] === 'upgrade') return ok(gestor === 'brew' ? 'Already up-to-date.' : 'Reading package lists... Done\nAll packages are up to date.');
    if (a[0] === '--version') return ok(gestor === 'brew' ? 'Homebrew 4.4.6' : gestor === 'winget' ? 'v1.9.25200' : 'apt 2.7.14 (amd64)');
    if (a[0] !== 'install') return ok(`Uso: ${gestor} install PAQUETE`);
    const pk = a.filter((x) => !quitar.has(x));
    const lineas = gestor === 'brew' ? pk.flatMap((p) => [`==> Downloading https://ghcr.io/v2/homebrew/core/${p}/manifests/latest`, `==> Pouring ${p}--latest.arm64_sequoia.bottle.tar.gz`, `🍺  /opt/homebrew/Cellar/${p}/latest: 1,234 files, 48.2MB`])
      : gestor === 'winget' ? pk.flatMap((p) => [`Found ${p} [${p}] Version latest`, 'Downloading …', '██████████████████████████████  100%', 'Successfully verified installer hash', 'Successfully installed'])
        : ['Reading package lists... Done', 'Building dependency tree... Done', `The following NEW packages will be installed:\n  ${pk.join(' ')}`, ...pk.map((p) => `Setting up ${p} ...`)];
    return ok(lineas.join('\n') + col.dim('\n(simulado: en esta terminal las herramientas del curso ya están instaladas)'));
  };
  def('brew', 'Homebrew (macOS): brew install git python@3.12 …', instalar('brew'));
  def('apt', 'gestor de paquetes de Ubuntu/WSL: sudo apt install …', instalar('apt'));
  Commands['apt-get'] = Commands.apt;
  def('winget', 'gestor de paquetes de Windows: winget install …', instalar('winget'));
  def('sudo', 'ejecuta un comando como administrador', (a, ctx) => runLine(a.map((x) => (/\s/.test(x) ? `"${x}"` : x)).join(' '), ctx ? ctx.opts : {}));
  def('wsl', 'Windows Subsystem for Linux (se ejecuta en PowerShell)', (a) => (a[0] === '--install' ? ok('Instalando: Plataforma de máquina virtual\nInstalando: Subsistema de Windows para Linux\nInstalando: Ubuntu\nLa operación solicitada se realizó correctamente. Los cambios surtirán efecto cuando se reinicie el sistema.') : a[0] === '--version' || a[0] === '-v' ? ok('Versión de WSL: 2.3.26.0\nVersión de kernel: 5.15.167.4-1') : a[0] === '-l' || a[0] === '--list' ? ok('  NAME      STATE           VERSION\n* Ubuntu    Running         2') : ok('Uso: wsl --install | wsl -l -v | wsl --version')));
  def('make', 'ejecuta tareas de un Makefile (make objetivo)', async (a, ctx) => {
    const t = readFile(norm('Makefile'));
    if (t === null) return fail('make: *** No targets specified and no makefile found.  Stop.', 2);
    const objetivos = {}; let actual = null;
    for (const l of t.split('\n')) { const m = l.match(/^([\w-]+):/); if (m) { actual = m[1]; objetivos[actual] = []; } else if (/^\t/.test(l) && actual) objetivos[actual].push(l.trim()); }
    const obj = a[0] || Object.keys(objetivos)[0];
    if (!objetivos[obj]) return fail(`make: *** No rule to make target '${obj}'.  Stop.`, 2);
    const out = [];
    for (const l of objetivos[obj]) { out.push(l.replace(/^@/, '')); const r = await runLine(l.replace(/^@/, ''), ctx ? ctx.opts : {}); if (r.out) out.push(r.out); if (r.code) return { out: out.join('\n') + `\n${col.err(`make: *** [Makefile: ${obj}] Error ${r.code}`)}`, code: 2 }; }
    return ok(out.join('\n'));
  });

  window.LocalSim = { yaml, parseCsv, dk };
})();
