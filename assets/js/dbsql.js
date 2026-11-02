/* Databricks SQL de práctica: el dialecto de Databricks (Spark SQL) traducido a SQLite (sql.js),
 * con Unity Catalog (catálogo.esquema.tabla), tablas Delta con historial de versiones (DESCRIBE HISTORY,
 * VERSION AS OF, RESTORE), MERGE INTO, COPY INTO, read_files sobre volúmenes, GRANT/REVOKE,
 * restricciones CHECK y los mensajes de error con las clases de error reales de Databricks.
 *
 * Todo corre en el navegador: los datos de ejemplo son las bases del curso (catálogo `samples`) y lo que
 * crea el alumno se guarda en su navegador (Store.data.dbxUC). Los archivos de los volúmenes son los
 * mismos de la CLI simulada (`databricks fs cp`), así que lo que subes desde la terminal se lee aquí.
 *
 * Basado en la documentación pública de Databricks SQL (Language Manual) y de Delta Lake.
 */
(function () {
  'use strict';

  class ErrorDbx extends Error {}
  let pendiente = null;   // error lanzado dentro de una función de SQLite (sql.js no conserva el mensaje)
  const err = (clase, msg) => { const e = new ErrorDbx(clase ? `[${clase}] ${msg}` : msg); pendiente = e; throw e; };
  const USUARIO = 'alumno@academia.dev';
  const ahora = () => new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, '');

  // ------------------------------------------------------------------ estado (Unity Catalog)
  let Store = null, db = null, listo = null;
  const sesion = { temp: {}, n: 0 };            // vistas temporales de la sesión
  const NUEVO_UC = () => ({
    v: 1, cur: { catalog: 'main', schema: 'default' },
    catalogs: {
      main: { comment: 'Catálogo principal del metastore', owner: USUARIO, created: ahora(), schemas: { default: { comment: 'Esquema por defecto', owner: USUARIO, tables: {}, volumes: {}, functions: {} }, information_schema: { system: true, tables: {}, volumes: {} } } },
    },
    grants: [], papelera: {}, historial: [], audit: [],
  });
  const uc = () => (Store.data.dbxUC = Store.data.dbxUC && Store.data.dbxUC.v === 1 ? Store.data.dbxUC : NUEVO_UC());
  const guardar = () => { try { Store.saveSoon ? Store.saveSoon() : Store.save(); } catch (e) { /* sin almacenamiento */ } };

  // catálogo samples: las bases del curso, de solo lectura
  function samples() {
    const B = window.Bases, T = window.Engines && window.Engines.SQL.tables;
    const out = {};
    if (!B || !T) return out;
    for (const b of B.BASES) out[b.id] = Object.keys(b.tablas || {}).filter((t) => T[t]);
    return out;
  }
  const esSistema = (c) => c === 'system' || c === 'samples';
  const SISTEMA = { billing: ['usage', 'list_prices'], access: ['audit', 'table_lineage'], query: ['history'], compute: ['clusters', 'warehouses'], lakeflow: ['jobs', 'job_run_timeline'], information_schema: ['catalogs', 'schemata', 'tables', 'columns'] };

  // nombre SQLite de un objeto de Unity Catalog
  const sqlNombre = (c, s, t) => `${c}__${s}__${t}`.replace(/[^\w]/g, '_');
  const q = (x) => `"${String(x).replace(/"/g, '""')}"`;
  const lit = (v) => (v == null ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`);
  const fq = (c, s, t) => [c, s, t].filter(Boolean).map((x) => '`' + x + '`').join('.');

  // ------------------------------------------------------------------ arranque
  let enAislado = false;
  async function init(ctx) {
    if (!enAislado) Store = ctx.Store;
    if (listo) return listo;
    listo = (async () => {
      await window.Engines.SQL.init();
      db = window.Engines.SQL.fresh();
      funciones(db);
      // recrea las tablas del alumno (y sus versiones guardadas)
      const U = uc();
      for (const [cn, C] of Object.entries(U.catalogs)) for (const [sn, S] of Object.entries(C.schemas || {})) for (const [tn, T] of Object.entries(S.tables || {})) {
        try { materializar(cn, sn, tn, T); } catch (e) { console.warn('dbsql: no se pudo recrear', cn, sn, tn, e); }
      }
      return true;
    })();
    listo.catch(() => { listo = null; });
    return listo;
  }
  function materializar(cn, sn, tn, T) {
    const nom = sqlNombre(cn, sn, tn);
    if (T.tipo === 'VIEW') { db.run(`DROP VIEW IF EXISTS ${q(nom)}`); db.run(`CREATE VIEW ${q(nom)} AS ${T.sqlite}`); return; }
    crearFisica(nom, T.cols, T.filas || []);
    for (const ver of T.versiones || []) if (ver.filas) crearFisica(`${nom}__v${ver.version}`, ver.cols || T.cols, ver.filas);
  }
  function crearFisica(nom, cols, filas) {
    db.run(`DROP TABLE IF EXISTS ${q(nom)}`);
    db.run(`CREATE TABLE ${q(nom)} (${cols.length ? cols.map((c) => `${q(c.n)} ${tipoSqlite(c.t)}`).join(', ') : '"__vacia" TEXT'})`);
    if (filas.length && cols.length) {
      const st = db.prepare(`INSERT INTO ${q(nom)} VALUES (${cols.map(() => '?').join(',')})`);
      db.run('SAVEPOINT carga');
      for (const f of filas) st.run(f);
      db.run('RELEASE carga');
      st.free();
    }
  }

  // ------------------------------------------------------------------ tipos
  const TIPOS = { STRING: 'string', VARCHAR: 'string', CHAR: 'string', TEXT: 'string', INT: 'int', INTEGER: 'int', BIGINT: 'bigint', LONG: 'bigint', SMALLINT: 'smallint', TINYINT: 'tinyint', DOUBLE: 'double', FLOAT: 'float', REAL: 'double', DECIMAL: 'decimal', NUMERIC: 'decimal', DEC: 'decimal', BOOLEAN: 'boolean', BOOL: 'boolean', DATE: 'date', TIMESTAMP: 'timestamp', TIMESTAMP_NTZ: 'timestamp_ntz', BINARY: 'binary', VARIANT: 'variant' };
  function normTipo(t) {
    const m = /^\s*(\w+)\s*(\(\s*\d+\s*(?:,\s*\d+\s*)?\))?/i.exec(t || 'string');
    if (!m) return 'string';
    const b = TIPOS[m[1].toUpperCase()];
    if (!b) err('UNSUPPORTED_DATATYPE', `Unsupported data type "${t}".`);
    return b === 'decimal' ? 'decimal' + (m[2] ? m[2].replace(/\s/g, '') : '(10,0)') : b;
  }
  const esEntero = (t) => /^(int|bigint|smallint|tinyint)$/.test(t);
  const esNum = (t) => esEntero(t) || /^(double|float|decimal)/.test(t);
  const tipoSqlite = (t) => (esEntero(t) || t === 'boolean' ? 'INTEGER' : esNum(t) ? 'REAL' : 'TEXT');
  function inferirTipo(vals) {
    const v = vals.filter((x) => x !== null && x !== undefined && x !== '');
    if (!v.length) return 'string';
    if (v.every((x) => typeof x === 'number' && Number.isInteger(x))) return 'bigint';
    if (v.every((x) => typeof x === 'number')) return 'double';
    if (v.every((x) => /^\d{4}-\d{2}-\d{2}$/.test(x))) return 'date';
    if (v.every((x) => /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?Z?$/.test(x))) return 'timestamp';
    return 'string';
  }
  function tiposDe(cols, filas) { return cols.map((c, i) => inferirTipo(filas.slice(0, 500).map((f) => f[i]))); }

  // ------------------------------------------------------------------ funciones de Spark SQL en SQLite
  function funciones(d) {
    const f = (n, fn, det = true) => { try { d.create_function(n, fn); } catch (e) { /* ya existe */ } void det; };
    const fecha = (x) => { if (x == null) return null; const s = String(x); const m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/.exec(s); if (!m) return null; return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0))); };
    const iso = (d0) => d0.toISOString().slice(0, 10);
    const isoTs = (d0) => d0.toISOString().replace('T', ' ').slice(0, 19);
    f('year', (x) => { const d0 = fecha(x); return d0 ? d0.getUTCFullYear() : null; });
    f('month', (x) => { const d0 = fecha(x); return d0 ? d0.getUTCMonth() + 1 : null; });
    f('day', (x) => { const d0 = fecha(x); return d0 ? d0.getUTCDate() : null; });
    f('dayofmonth', (x) => { const d0 = fecha(x); return d0 ? d0.getUTCDate() : null; });
    f('dayofweek', (x) => { const d0 = fecha(x); return d0 ? d0.getUTCDay() + 1 : null; });
    f('dayofyear', (x) => { const d0 = fecha(x); return d0 ? Math.floor((d0 - Date.UTC(d0.getUTCFullYear(), 0, 1)) / 864e5) + 1 : null; });
    f('weekofyear', (x) => { const d0 = fecha(x); if (!d0) return null; const t = new Date(d0); t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7)); return Math.ceil(((t - Date.UTC(t.getUTCFullYear(), 0, 1)) / 864e5 + 1) / 7); });
    f('quarter', (x) => { const d0 = fecha(x); return d0 ? Math.floor(d0.getUTCMonth() / 3) + 1 : null; });
    f('hour', (x) => { const d0 = fecha(x); return d0 ? d0.getUTCHours() : null; });
    f('minute', (x) => { const d0 = fecha(x); return d0 ? d0.getUTCMinutes() : null; });
    f('current_date', () => iso(new Date()));
    f('current_timestamp', () => isoTs(new Date()));
    f('now', () => isoTs(new Date()));
    f('current_user', () => USUARIO);
    f('current_catalog', () => uc().cur.catalog);
    f('current_schema', () => uc().cur.schema);
    f('current_database', () => uc().cur.schema);
    f('current_version', () => '{"dbsql_version":"2025.35","dbr_version":"16.4"}');
    f('to_date', (x, fm) => { if (x == null) return null; if (fm) { const s = String(x); const map = { yyyy: 'Y', MM: 'M', dd: 'D' }; void map; const re = String(fm).replace(/yyyy|MM|dd/g, (k) => ({ yyyy: '(\\d{4})', MM: '(\\d{2})', dd: '(\\d{2})' }[k])); const o = String(fm).match(/yyyy|MM|dd/g) || []; const m = new RegExp('^' + re).exec(s); if (!m) return null; const p = {}; o.forEach((k, i) => { p[k] = m[i + 1]; }); return `${p.yyyy}-${p.MM}-${p.dd}`; } const d0 = fecha(x); return d0 ? iso(d0) : null; });
    f('to_timestamp', (x) => { const d0 = fecha(x); return d0 ? isoTs(d0) : null; });
    f('date_add', (x, n) => { const d0 = fecha(x); if (!d0 || n == null) return null; d0.setUTCDate(d0.getUTCDate() + Number(n)); return iso(d0); });
    f('dateadd', (u, n, x) => { const d0 = fecha(x); if (!d0) return null; const U = String(u).toUpperCase(); if (/DAY/.test(U)) d0.setUTCDate(d0.getUTCDate() + n); else if (/MONTH/.test(U)) d0.setUTCMonth(d0.getUTCMonth() + n); else if (/YEAR/.test(U)) d0.setUTCFullYear(d0.getUTCFullYear() + n); return iso(d0); });
    f('date_sub', (x, n) => { const d0 = fecha(x); if (!d0 || n == null) return null; d0.setUTCDate(d0.getUTCDate() - Number(n)); return iso(d0); });
    f('add_months', (x, n) => { const d0 = fecha(x); if (!d0) return null; d0.setUTCMonth(d0.getUTCMonth() + Number(n)); return iso(d0); });
    f('datediff', (a, b) => { const x = fecha(a), y = fecha(b); return x && y ? Math.round((x - y) / 864e5) : null; });
    f('months_between', (a, b) => { const x = fecha(a), y = fecha(b); return x && y ? Math.round(((x - y) / (864e5 * 31)) * 1e8) / 1e8 : null; });
    f('last_day', (x) => { const d0 = fecha(x); return d0 ? iso(new Date(Date.UTC(d0.getUTCFullYear(), d0.getUTCMonth() + 1, 0))) : null; });
    f('date_trunc', (u, x) => { const d0 = fecha(x); if (!d0) return null; const U = String(u).toUpperCase(); const Y = d0.getUTCFullYear(), M = d0.getUTCMonth(); let r; if (U === 'YEAR' || U === 'YYYY') r = Date.UTC(Y, 0, 1); else if (U === 'QUARTER') r = Date.UTC(Y, Math.floor(M / 3) * 3, 1); else if (U === 'MONTH' || U === 'MM' || U === 'MON') r = Date.UTC(Y, M, 1); else if (U === 'WEEK') { const t = new Date(Date.UTC(Y, M, d0.getUTCDate())); t.setUTCDate(t.getUTCDate() - ((t.getUTCDay() + 6) % 7)); r = t.getTime(); } else if (U === 'DAY' || U === 'DD') r = Date.UTC(Y, M, d0.getUTCDate()); else if (U === 'HOUR') r = Date.UTC(Y, M, d0.getUTCDate(), d0.getUTCHours()); else err('INVALID_PARAMETER_VALUE', `The value of parameter(s) \`unit\` in \`date_trunc\` is invalid: ${u}`); return isoTs(new Date(r)); });
    f('trunc', (x, u) => { const d0 = fecha(x); if (!d0) return null; const U = String(u || '').toUpperCase(); const Y = d0.getUTCFullYear(), M = d0.getUTCMonth(); return iso(new Date(U.startsWith('Y') ? Date.UTC(Y, 0, 1) : U.startsWith('Q') ? Date.UTC(Y, Math.floor(M / 3) * 3, 1) : Date.UTC(Y, M, 1))); });
    f('date_format', (x, fm) => {
      const d0 = fecha(x); if (!d0 || fm == null) return null;
      const MESES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const DIAS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const p2 = (n) => String(n).padStart(2, '0');
      return String(fm).replace(/yyyy|yy|MMMM|MMM|MM|M|dd|d|EEEE|EEE|E|HH|H|mm|ss|'[^']*'/g, (k) => {
        if (k[0] === "'") return k.slice(1, -1);
        return { yyyy: d0.getUTCFullYear(), yy: String(d0.getUTCFullYear()).slice(2), MMMM: MESES[d0.getUTCMonth()], MMM: MESES[d0.getUTCMonth()].slice(0, 3), MM: p2(d0.getUTCMonth() + 1), M: d0.getUTCMonth() + 1, dd: p2(d0.getUTCDate()), d: d0.getUTCDate(), EEEE: DIAS[d0.getUTCDay()], EEE: DIAS[d0.getUTCDay()].slice(0, 3), E: DIAS[d0.getUTCDay()].slice(0, 3), HH: p2(d0.getUTCHours()), H: d0.getUTCHours(), mm: p2(d0.getUTCMinutes()), ss: p2(d0.getUTCSeconds()) }[k];
      });
    });
    f('make_date', (y, m, dd) => (y == null || m == null || dd == null ? null : `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(dd).padStart(2, '0')}`));
    f('unix_timestamp', (x) => { const d0 = x == null ? new Date() : fecha(x); return d0 ? Math.floor(d0.getTime() / 1000) : null; });
    f('from_unixtime', (n) => (n == null ? null : isoTs(new Date(Number(n) * 1000))));
    // texto
    f('concat_ws', (sep, ...xs) => xs.filter((x) => x != null).join(sep == null ? '' : sep));
    f('initcap', (x) => (x == null ? null : String(x).toLowerCase().replace(/(^|\s)(\p{L})/gu, (m, a, b) => a + b.toUpperCase())));
    f('lpad', (x, n, p = ' ') => (x == null ? null : String(x).padStart(n, p).slice(0, n)));
    f('rpad', (x, n, p = ' ') => (x == null ? null : String(x).padEnd(n, p).slice(0, n)));
    f('left', (x, n) => (x == null ? null : String(x).slice(0, n)));
    f('right', (x, n) => (x == null ? null : String(x).slice(-n)));
    f('reverse', (x) => (x == null ? null : [...String(x)].reverse().join('')));
    f('repeat', (x, n) => (x == null ? null : String(x).repeat(Math.max(0, n))));
    f('split_part', (x, d0, n) => (x == null ? null : String(x).split(d0)[n - 1] ?? ''));
    f('regexp_replace', (x, p, r) => (x == null ? null : String(x).replace(new RegExp(p, 'g'), String(r).replace(/\$(\d)/g, '$$$1'))));
    f('regexp_extract', (x, p, i = 1) => { if (x == null) return null; const m = new RegExp(p).exec(String(x)); return m ? m[i] ?? '' : ''; });
    f('regexp', (p, x) => (x == null || p == null ? null : new RegExp(p).test(String(x)) ? 1 : 0));
    f('regexp_like', (x, p) => (x == null || p == null ? null : new RegExp(p).test(String(x)) ? 1 : 0));
    f('startswith', (x, p) => (x == null || p == null ? null : String(x).startsWith(p) ? 1 : 0));
    f('endswith', (x, p) => (x == null || p == null ? null : String(x).endsWith(p) ? 1 : 0));
    f('contains', (x, p) => (x == null || p == null ? null : String(x).includes(p) ? 1 : 0));
    f('locate', (s, x) => (x == null ? null : String(x).indexOf(s) + 1));
    f('char_length', (x) => (x == null ? null : [...String(x)].length));
    f('nvl', (a, b) => (a == null ? b : a));
    f('nvl2', (a, b, c) => (a == null ? c : b));
    f('nullif', (a, b) => (a === b ? null : a));
    f('greatest', (...xs) => { const v = xs.filter((x) => x != null); return v.length ? v.reduce((a, b) => (a > b ? a : b)) : null; });
    f('least', (...xs) => { const v = xs.filter((x) => x != null); return v.length ? v.reduce((a, b) => (a < b ? a : b)) : null; });
    f('uuid', () => crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, () => (Math.random() * 16 | 0).toString(16)));
    f('rand', () => Math.random());
    f('md5', (x) => (x == null ? null : hashHex(String(x), 32)));
    f('sha2', (x, n) => (x == null ? null : hashHex(String(x), (n || 256) / 4)));
    f('hash', (x) => (x == null ? null : hash32(String(x))));
    f('try_divide', (a, b) => (a == null || b == null || Number(b) === 0 ? null : a / b));
    f('div0', (a, b) => (a == null || b == null || Number(b) === 0 ? 0 : a / b));
    f('ln', (a) => (a == null ? null : Math.log(a)));
    f('log', (b, x) => (x === undefined ? (b == null ? null : Math.log(b)) : b == null || x == null ? null : Math.log(x) / Math.log(b)));
    f('bround', (x, n = 0) => (x == null ? null : Math.round(x * 10 ** n) / 10 ** n));
    f('format_number', (x, n) => (x == null ? null : Number(x).toLocaleString('en-US', { minimumFractionDigits: n, maximumFractionDigits: n })));
    f('__spark_typeof', (x) => (x == null ? 'void' : typeof x === 'number' ? (Number.isInteger(x) ? 'bigint' : 'double') : 'string'));
    f('array', (...xs) => JSON.stringify(xs));
    f('size', (x) => { if (x == null) return -1; try { const v = JSON.parse(x); return Array.isArray(v) ? v.length : Object.keys(v).length; } catch (e) { return -1; } });
    f('split', (x, p) => (x == null ? null : JSON.stringify(String(x).split(new RegExp(p)))));
    f('array_contains', (a, v) => { try { return JSON.parse(a).includes(v) ? 1 : 0; } catch (e) { return null; } });
    f('get_json_object', (j, p) => { try { let v = JSON.parse(j); for (const k of String(p).replace(/^\$\.?/, '').split('.').filter(Boolean)) v = v == null ? null : v[k]; return v == null ? null : typeof v === 'object' ? JSON.stringify(v) : v; } catch (e) { return null; } });
    f('from_json', (j) => j);
    f('to_json', (j) => j);
    f('assert_true', (c) => { if (!c) err('USER_RAISED_EXCEPTION', "'assert_true' is not true!"); return null; });
    f('raise_error', (m) => err('USER_RAISED_EXCEPTION', m));
    f('__cast', (x, t) => castear(x, t, false));
    f('__try_cast', (x, t) => castear(x, t, true));
    // agregaciones
    const ag = (n, init, step, fin) => { try { d.create_aggregate(n, { init, step, finalize: fin }); } catch (e) { /* sin agregaciones */ } };
    ag('collect_list', () => [], (st, x) => { if (x != null) st.push(x); return st; }, (st) => JSON.stringify(st || []));
    ag('collect_set', () => [], (st, x) => { if (x != null && !st.includes(x)) st.push(x); return st; }, (st) => JSON.stringify(st || []));
    ag('median', () => [], (st, x) => { if (x != null) st.push(Number(x)); return st; }, (st) => { if (!st || !st.length) return null; const a = st.sort((x, y) => x - y), m = a.length >> 1; return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; });
    ag('percentile_approx', () => ({ v: [], p: 0.5 }), (st, x, p) => { if (x != null) st.v.push(Number(x)); if (p != null) st.p = p; return st; }, (st) => { if (!st || !st.v.length) return null; const a = st.v.sort((x, y) => x - y); return a[Math.min(a.length - 1, Math.max(0, Math.ceil(st.p * a.length) - 1))]; });
    ag('count_if', () => 0, (st, c) => st + (c ? 1 : 0), (st) => st || 0);
    ag('any_value', () => null, (st, x) => (st == null ? x : st), (st) => st);
    ag('first', () => ({ s: false, v: null }), (st, x) => (st.s ? st : { s: true, v: x }), (st) => (st ? st.v : null));
    ag('last', () => null, (st, x) => x, (st) => st);
    ag('bool_and', () => null, (st, x) => (x == null ? st : (st == null ? 1 : st) && (x ? 1 : 0)), (st) => st);
    ag('bool_or', () => null, (st, x) => (x == null ? st : (st || 0) || (x ? 1 : 0)), (st) => st);
    const varianza = (muestral) => (st) => { if (!st || st.length < (muestral ? 2 : 1)) return null; const m = st.reduce((a, b) => a + b, 0) / st.length; return st.reduce((a, b) => a + (b - m) ** 2, 0) / (st.length - (muestral ? 1 : 0)); };
    ag('variance', () => [], (st, x) => { if (x != null) st.push(Number(x)); return st; }, varianza(true));
    ag('var_samp', () => [], (st, x) => { if (x != null) st.push(Number(x)); return st; }, varianza(true));
    ag('var_pop', () => [], (st, x) => { if (x != null) st.push(Number(x)); return st; }, varianza(false));
    ag('stddev', () => [], (st, x) => { if (x != null) st.push(Number(x)); return st; }, (st) => { const v = varianza(true)(st); return v == null ? null : Math.sqrt(v); });
    ag('stddev_samp', () => [], (st, x) => { if (x != null) st.push(Number(x)); return st; }, (st) => { const v = varianza(true)(st); return v == null ? null : Math.sqrt(v); });
    ag('stddev_pop', () => [], (st, x) => { if (x != null) st.push(Number(x)); return st; }, (st) => { const v = varianza(false)(st); return v == null ? null : Math.sqrt(v); });
    ag('approx_count_distinct', () => new Set(), (st, x) => { if (x != null) st.add(x); return st; }, (st) => (st ? st.size : 0));
  }
  function hash32(s) { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return h | 0; }
  function hashHex(s, n) { let out = ''; let k = 0; while (out.length < n) { out += (hash32(s + ':' + k++) >>> 0).toString(16).padStart(8, '0'); } return out.slice(0, n); }
  function castear(x, t, suave) {
    if (x == null) return null;
    const T = String(t).toLowerCase();
    const malo = () => { if (suave) return null; err('CAST_INVALID_INPUT', `The value '${x}' of the type "${typeof x === 'number' ? 'DOUBLE' : 'STRING'}" cannot be cast to "${T.toUpperCase()}" because it is malformed. Correct the value as per the syntax, or change its target type. Use \`try_cast\` to tolerate malformed input and return NULL instead.`); return null; };
    if (esEntero(T)) { const s = String(x).trim(); if (!/^[-+]?\d+(\.\d+)?$/.test(s)) return malo(); return Math.trunc(Number(s)); }
    if (/^(double|float|real)/.test(T)) { const n = Number(String(x).trim()); return String(x).trim() === '' || Number.isNaN(n) ? malo() : n; }
    if (T.startsWith('decimal')) { const n = Number(String(x).trim()); if (String(x).trim() === '' || Number.isNaN(n)) return malo(); const m = /\(\s*\d+\s*,\s*(\d+)\s*\)/.exec(T); const e = m ? Number(m[1]) : 0; return Math.round(n * 10 ** e) / 10 ** e; }
    if (T === 'date') { const m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(String(x)); return m ? `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}` : malo(); }
    if (T.startsWith('timestamp')) { const m = /^(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}:\d{2}(?::\d{2})?))?/.exec(String(x)); return m ? `${m[1]} ${(m[2] || '00:00:00').padEnd(8, ':00')}` : malo(); }
    if (T === 'boolean') { const s = String(x).toLowerCase(); if (['true', '1', 't', 'yes', 'y'].includes(s)) return 1; if (['false', '0', 'f', 'no', 'n'].includes(s)) return 0; return malo(); }
    if (T === 'string') return typeof x === 'number' ? String(x) : x;
    return x;
  }

  // ------------------------------------------------------------------ tokenizador (Spark SQL)
  // tokens: w (palabra), b (`identificador`), s (texto), n (número), p (símbolo), ws (espacio/comentario)
  function tokenizar(sql) {
    const out = []; let i = 0; const n = sql.length;
    while (i < n) {
      const c = sql[i], d = sql[i + 1];
      if (/\s/.test(c)) { let j = i; while (j < n && /\s/.test(sql[j])) j++; out.push({ t: 'ws', v: sql.slice(i, j) }); i = j; continue; }
      if (c === '-' && d === '-') { let j = i; while (j < n && sql[j] !== '\n') j++; out.push({ t: 'ws', v: ' ' }); i = j; continue; }
      if (c === '/' && d === '*') { const f = sql.indexOf('*/', i + 2); i = f < 0 ? n : f + 2; out.push({ t: 'ws', v: ' ' }); continue; }
      if (c === "'" || c === '"') {
        let j = i + 1, v = '';
        while (j < n) {
          if (sql[j] === '\\' && j + 1 < n) { const e = sql[j + 1]; v += { n: '\n', t: '\t', r: '\r', 0: '\0' }[e] ?? e; j += 2; continue; }
          if (sql[j] === c) { if (sql[j + 1] === c) { v += c; j += 2; continue; } break; }
          v += sql[j++];
        }
        if (j >= n) err('PARSE_SYNTAX_ERROR', `Syntax error at or near end of input: falta cerrar el texto que empieza con ${c}.`);
        out.push({ t: 's', v }); i = j + 1; continue;
      }
      if (c === '`') { const f = sql.indexOf('`', i + 1); if (f < 0) err('PARSE_SYNTAX_ERROR', 'Syntax error: falta cerrar un identificador con `.'); out.push({ t: 'b', v: sql.slice(i + 1, f) }); i = f + 1; continue; }
      if (/\d/.test(c) || (c === '.' && /\d/.test(d || ''))) { const m = /^\d*\.?\d+(?:[eE][-+]?\d+)?[LDSYBF]?|^\d+\.(?!\.)/.exec(sql.slice(i)); out.push({ t: 'n', v: m[0].replace(/[LDSYBF]$/i, '') }); i += m[0].length; continue; }
      if (/[A-Za-z_À-￿]/.test(c)) { const m = /^[A-Za-z_À-￿][\wÀ-￿]*/.exec(sql.slice(i)); out.push({ t: 'w', v: m[0] }); i += m[0].length; continue; }
      if (c === ':' && d === ':') { out.push({ t: 'p', v: '::' }); i += 2; continue; }
      const dos = sql.slice(i, i + 3) === '<=>' ? '<=>' : ['<=', '>=', '<>', '!=', '==', '||'].includes(c + d) ? c + d : null;
      if (dos) { out.push({ t: 'p', v: dos }); i += dos.length; continue; }
      out.push({ t: 'p', v: c }); i++;
    }
    return out;
  }
  const W = (tk, ...ws) => tk && tk.t === 'w' && ws.includes(tk.v.toUpperCase());
  const esId = (tk) => tk && (tk.t === 'w' || tk.t === 'b');
  function sig(T, i) { let j = i; while (j < T.length && T[j].t === 'ws') j++; return j; }
  function unir(T) {
    return T.map((tk) => (tk.t === 's' ? lit(tk.v) : tk.t === 'b' ? q(tk.v) : tk.v)).join('');
  }
  // divide un script en sentencias (por ; fuera de textos)
  function sentencias(sql) {
    const T = tokenizar(sql), out = []; let cur = [];
    for (const tk of T) { if (tk.t === 'p' && tk.v === ';') { out.push(cur); cur = []; } else cur.push(tk); }
    out.push(cur);
    // sin los espacios y comentarios de los bordes: así cada sentencia empieza en su primera palabra
    const recortar = (x) => { let a = 0, b = x.length; while (a < b && x[a].t === 'ws') a++; while (b > a && x[b - 1].t === 'ws') b--; return x.slice(a, b); };
    return out.map(recortar).filter((x) => x.length).map((x) => ({ T: x, texto: unirOriginal(x).trim() }));
  }
  function unirOriginal(T) { return T.map((tk) => (tk.t === 's' ? `'${tk.v.replace(/'/g, "\\'")}'` : tk.t === 'b' ? '`' + tk.v + '`' : tk.v)).join(''); }

  // ------------------------------------------------------------------ resolver nombres de Unity Catalog
  function partes(nombre) { return nombre.split('.').map((x) => x.replace(/^`|`$/g, '')); }
  function resolver(nombre, { crear = false, permitirVista = true } = {}) {
    const U = uc();
    let p = Array.isArray(nombre) ? nombre : partes(nombre);
    if (p.length === 1 && sesion.temp[p[0].toLowerCase()] && permitirVista) return { temp: true, sql: sesion.temp[p[0].toLowerCase()], nombre: p[0] };
    if (p.length === 1) p = [U.cur.catalog, U.cur.schema, p[0]];
    else if (p.length === 2) p = [U.cur.catalog, p[0], p[1]];
    else if (p.length > 3) err('REQUIRES_SINGLE_PART_NAMESPACE', `${p.join('.')}: un nombre de Unity Catalog tiene como máximo tres partes (catálogo.esquema.tabla).`);
    const [c, s, t] = p.map((x) => x.toLowerCase());
    const noExiste = () => err('TABLE_OR_VIEW_NOT_FOUND', `The table or view ${fq(c, s, t)} cannot be found. Verify the spelling and correctness of the schema and catalog.\nIf you did not qualify the name with a schema, verify the current_schema() output, or qualify the name with the correct schema and catalog.\nTo tolerate the error on drop use DROP VIEW IF EXISTS or DROP TABLE IF EXISTS.`);
    if (c === 'samples') {
      const S = samples();
      if (!S[s]) { if (crear) err('PERMISSION_DENIED', `User does not have CREATE TABLE on Schema 'samples.${s}': el catálogo samples es de solo lectura.`); err('SCHEMA_NOT_FOUND', `The schema \`samples\`.\`${s}\` cannot be found. Esquemas disponibles: ${Object.keys(S).join(', ')}.`); }
      if (crear) err('PERMISSION_DENIED', `User does not have MODIFY on Table '${c}.${s}.${t}': el catálogo samples es de solo lectura. Crea tus tablas en main.`);
      if (!S[s].includes(t)) noExiste();
      return { c, s, t, sql: t, samples: true, solo: true };
    }
    if (c === 'system') {
      if (crear) err('PERMISSION_DENIED', 'El catálogo system es de solo lectura.');
      if (!SISTEMA[s] || !SISTEMA[s].includes(t)) noExiste();
      return { c, s, t, sql: tablaSistema(s, t), sistema: true, solo: true };
    }
    const C = U.catalogs[c];
    if (!C) err('NO_SUCH_CATALOG_EXCEPTION', `Catalog '${c}' was not found. Please verify the catalog name and then retry the query or command again.`);
    const S = C.schemas[s];
    if (!S) err('SCHEMA_NOT_FOUND', `The schema ${fq(c, s)} cannot be found. Verify the spelling and correctness of the schema and catalog.`);
    if (s === 'information_schema') return { c, s, t, sql: tablaInfoSchema(c, t), sistema: true, solo: true };
    const T = S.tables[t];
    if (!T && !crear) noExiste();
    return { c, s, t, sql: sqlNombre(c, s, t), meta: T, schema: S, catalogo: C };
  }

  // tablas de system y de information_schema: se generan con el estado actual
  function tablaTemporal(nombre, cols, filas) {
    const nom = `__sys_${nombre}`;
    db.run(`DROP TABLE IF EXISTS ${q(nom)}`);
    db.run(`CREATE TEMP TABLE ${q(nom)} (${cols.map((c) => q(c)).join(', ')})`);
    if (filas.length) { const st = db.prepare(`INSERT INTO ${q(nom)} VALUES (${cols.map(() => '?').join(',')})`); for (const f of filas) st.run(f.map((x) => (x === undefined ? null : x))); st.free(); }
    return nom;
  }
  function objetosUC() {
    const U = uc(), out = [];
    for (const [cn, C] of Object.entries(U.catalogs)) for (const [sn, S] of Object.entries(C.schemas || {})) for (const [tn, T] of Object.entries(S.tables || {})) out.push({ c: cn, s: sn, t: tn, T });
    return out;
  }
  function tablaSistema(s, t) {
    const U = uc(), D = window.CloudSim ? window.CloudSim.dbx() : { clusters: {}, jobs: {} };
    if (s === 'query' && t === 'history') return tablaTemporal('qh', ['statement_id', 'executed_by', 'statement_text', 'execution_status', 'start_time', 'total_duration_ms', 'produced_rows', 'compute_type', 'client_application'], U.historial.slice(-500).map((h) => [h.id, USUARIO, h.texto, h.estado, h.inicio, h.ms, h.filas, h.compute || 'WAREHOUSE', h.origen || 'Databricks SQL Editor']));
    if (s === 'access' && t === 'audit') return tablaTemporal('audit', ['event_time', 'user_identity', 'service_name', 'action_name', 'request_params', 'response_status_code'], U.audit.slice(-500).map((a) => [a.t, USUARIO, a.servicio, a.accion, JSON.stringify(a.params || {}), 200]));
    if (s === 'access' && t === 'table_lineage') return tablaTemporal('lineage', ['source_table_full_name', 'target_table_full_name', 'entity_type', 'event_time', 'created_by'], (U.linaje || []).map((l) => [l.de, l.a, l.tipo || 'NOTEBOOK', l.t, USUARIO]));
    if (s === 'billing' && t === 'list_prices') return tablaTemporal('precios', ['sku_name', 'currency_code', 'usage_unit', 'pricing_default'], [['PREMIUM_ALL_PURPOSE_COMPUTE', 'USD', 'DBU', 0.55], ['PREMIUM_JOBS_COMPUTE', 'USD', 'DBU', 0.30], ['PREMIUM_SERVERLESS_SQL_COMPUTE', 'USD', 'DBU', 0.70], ['PREMIUM_SQL_PRO_COMPUTE', 'USD', 'DBU', 0.55], ['PREMIUM_JOBS_SERVERLESS_COMPUTE', 'USD', 'DBU', 0.35]]);
    if (s === 'billing' && t === 'usage') {
      const filas = [];
      for (const u of D.uso || []) filas.push([u.id, u.sku, u.dia, u.dbu, 'DBU', JSON.stringify({ cluster_id: u.cluster || null, job_id: u.job || null, warehouse_id: u.warehouse || null }), u.etiqueta || null]);
      return tablaTemporal('usage', ['record_id', 'sku_name', 'usage_date', 'usage_quantity', 'usage_unit', 'usage_metadata', 'custom_tags'], filas);
    }
    if (s === 'compute' && t === 'clusters') return tablaTemporal('clusters', ['cluster_id', 'cluster_name', 'owned_by', 'driver_node_type', 'worker_node_type', 'worker_count', 'min_autoscale_workers', 'max_autoscale_workers', 'auto_termination_minutes', 'dbr_version', 'data_security_mode', 'state'], Object.entries(D.clusters || {}).map(([k, x]) => [k, x.name, USUARIO, x.node, x.node, x.workers, x.min || null, x.max || null, x.autoterm ?? 120, x.spark, x.modo || 'USER_ISOLATION', x.state]));
    if (s === 'compute' && t === 'warehouses') return tablaTemporal('wh', ['warehouse_id', 'warehouse_name', 'warehouse_type', 'warehouse_size', 'min_clusters', 'max_clusters', 'auto_stop_minutes'], Object.entries(D.warehouses || { '1a2b3c4d5e6f7a8b': { name: 'Serverless Starter Warehouse', size: 'Small' } }).map(([k, x]) => [k, x.name, 'SERVERLESS', x.size, 1, x.max || 1, x.autostop || 10]));
    if (s === 'lakeflow' && t === 'jobs') return tablaTemporal('jobs', ['job_id', 'name', 'creator_id', 'change_time'], Object.entries(D.jobs || {}).map(([k, j]) => [k, j.name, USUARIO, j.creado || ahora()]));
    if (s === 'lakeflow' && t === 'job_run_timeline') return tablaTemporal('runs', ['job_id', 'run_id', 'period_start_time', 'period_end_time', 'result_state', 'trigger_type'], Object.entries(D.jobs || {}).flatMap(([k, j]) => (j.runs || []).map((r) => [k, r.run_id, r.at, r.fin || r.at, r.result || 'SUCCEEDED', r.trigger || 'ONE_TIME'])));
    if (s === 'information_schema') return tablaInfoSchema(null, t);
    return tablaTemporal('vacia', ['x'], []);
  }
  function tablaInfoSchema(cat, t) {
    const objs = objetosUC().filter((o) => !cat || o.c === cat);
    const S = samples();
    const samp = cat && cat !== 'samples' ? [] : Object.entries(S).flatMap(([s, ts]) => ts.map((x) => ({ c: 'samples', s, t: x, T: { tipo: 'MANAGED', cols: colsSqlite(x), comment: null } })));
    const todos = [...objs, ...samp];
    if (t === 'catalogs') return tablaTemporal('is_cat', ['catalog_name', 'catalog_owner', 'comment'], [...Object.entries(uc().catalogs).map(([k, C]) => [k, C.owner || USUARIO, C.comment || null]), ['samples', 'System user', 'Datos de ejemplo del curso'], ['system', 'System user', 'Tablas del sistema']]);
    if (t === 'schemata') return tablaTemporal('is_sch', ['catalog_name', 'schema_name', 'schema_owner', 'comment'], [...Object.entries(uc().catalogs).flatMap(([k, C]) => Object.entries(C.schemas).map(([s, x]) => [k, s, x.owner || USUARIO, x.comment || null])), ...Object.keys(S).map((s) => ['samples', s, 'System user', null])]);
    if (t === 'tables') return tablaTemporal('is_tab', ['table_catalog', 'table_schema', 'table_name', 'table_type', 'table_owner', 'comment', 'created'], todos.map((o) => [o.c, o.s, o.t, o.T.tipo || 'MANAGED', USUARIO, o.T.comment || null, o.T.creado || null]));
    if (t === 'columns') return tablaTemporal('is_col', ['table_catalog', 'table_schema', 'table_name', 'column_name', 'ordinal_position', 'data_type', 'is_nullable', 'comment'], todos.flatMap((o) => (o.T.cols || []).map((c, i) => [o.c, o.s, o.t, c.n, i, String(c.t).toUpperCase(), c.notNull ? 'NO' : 'YES', c.comment || null])));
    return tablaTemporal('vacia', ['x'], []);
  }
  function colsSqlite(t) {
    const info = db.exec(`PRAGMA table_info(${q(t)})`)[0];
    if (!info) return [];
    const T = window.Engines.SQL.tables[t];
    return info.values.map((r, i) => ({ n: r[1], t: T ? inferirTipo(T.rows.slice(0, 200).map((f) => f[i])) : (r[2] || 'string').toLowerCase() }));
  }
  function columnas(ref) {
    if (ref.samples) return colsSqlite(ref.sql);
    if (ref.meta) return ref.meta.cols || [];
    const info = db.exec(`PRAGMA table_info(${q(ref.sql)})`)[0];
    return info ? info.values.map((r) => ({ n: r[1], t: 'string' })) : [];
  }

  // ------------------------------------------------------------------ reescritura de una consulta
  const FIN_FROM = new Set(['WHERE', 'GROUP', 'ORDER', 'HAVING', 'LIMIT', 'UNION', 'EXCEPT', 'INTERSECT', 'WINDOW', 'QUALIFY', 'ON', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'FULL', 'CROSS', 'NATURAL', 'SELECT', 'SET', 'VALUES', 'WHEN', 'USING', 'PIVOT', 'LATERAL', 'TABLESAMPLE', 'VERSION', 'TIMESTAMP', 'OFFSET', 'MINUS']);
  const RESERVADAS = new Set([...FIN_FROM, 'AS', 'FROM', 'AND', 'OR', 'NOT', 'IN', 'IS', 'NULL', 'BY', 'DESC', 'ASC', 'CASE', 'THEN', 'ELSE', 'END', 'WITH', 'DISTINCT', 'ALL', 'INTO', 'TABLE', 'MATCHED']);
  function reescribir(T, ctx = {}) {
    const lecturas = ctx.lecturas || [];
    // nombres de CTE: no son tablas de Unity Catalog
    const ctes = new Set();
    for (let i = 0; i < T.length; i++) if (esId(T[i])) { const j = sig(T, i + 1); if (W(T[j], 'AS') && T[sig(T, j + 1)] && T[sig(T, j + 1)].v === '(') { const k = i > 0 ? (() => { let x = i - 1; while (x >= 0 && T[x].t === 'ws') x--; return x; })() : -1; if (k >= 0 && (W(T[k], 'WITH', 'RECURSIVE') || (T[k].t === 'p' && T[k].v === ','))) ctes.add(T[i].v.toLowerCase()); } }
    const out = [];
    let espera = false; const lista = []; let prof = 0;
    for (let i = 0; i < T.length; i++) {
      const tk = T[i];
      if (tk.t === 'p' && tk.v === '(') { prof++; out.push(tk); continue; }
      if (tk.t === 'p' && tk.v === ')') { lista[prof] = false; prof--; out.push(tk); continue; }
      if (tk.t === 'p' && tk.v === ',' && lista[prof]) { espera = true; out.push(tk); continue; }
      if (W(tk, 'FROM', 'JOIN')) { espera = true; lista[prof] = W(tk, 'FROM'); out.push(tk); continue; }
      if (tk.t === 'w' && FIN_FROM.has(tk.v.toUpperCase()) && !(W(tk, 'VERSION', 'TIMESTAMP') && espera)) { lista[prof] = W(tk, 'JOIN') ? false : lista[prof] && false; }
      if (espera && tk.t !== 'ws') {
        espera = false;
        // función de tabla: read_files('ruta', …), o formato.`ruta` (csv.`/Volumes/...`)
        if (esId(tk) && T[sig(T, i + 1)] && T[sig(T, i + 1)].v === '(') {
          const nombreF = tk.v.toLowerCase();
          if (nombreF === 'read_files') { const { fin, args } = argsFuncion(T, sig(T, i + 1)); out.push({ t: 'w', v: q(leerArchivos(args)) }); i = fin; continue; }
          if (nombreF === 'range') { const { fin, args } = argsFuncion(T, sig(T, i + 1)); const nums = args.map((a) => Number(unir(a).trim())); const [a0, b0, p0] = nums.length === 1 ? [0, nums[0], 1] : [nums[0], nums[1], nums[2] || 1]; const filas = []; for (let x = a0; x < b0 && filas.length < 100000; x += p0) filas.push([x]); out.push({ t: 'w', v: q(tablaTemporal('range' + (sesion.n++), ['id'], filas)) }); i = fin; continue; }
          out.push(tk); continue;
        }
        if (esId(tk) && /^(csv|json|parquet|delta|text)$/i.test(tk.v) && T[i + 1] && T[i + 1].v === '.' && T[i + 2] && T[i + 2].t === 'b') {
          out.push({ t: 'w', v: q(leerArchivos([[{ t: 's', v: T[i + 2].v }], [{ t: 'w', v: 'format' }, { t: 'p', v: '=' }, { t: 'p', v: '>' }, { t: 's', v: tk.v.toLowerCase() }]])) }); i += 2; continue;
        }
        if (esId(tk)) {
          // cadena de identificadores a.b.c
          const ids = [tk.v]; let j = i;
          while (T[j + 1] && T[j + 1].v === '.' && esId(T[j + 2])) { ids.push(T[j + 2].v); j += 2; }
          if (ids.length === 1 && ctes.has(ids[0].toLowerCase())) { out.push(tk); continue; }
          if (ids.length === 1 && RESERVADAS.has(ids[0].toUpperCase())) { out.push(tk); continue; }
          let ref = resolver(ids);
          let nom = ref.sql;
          // viaje en el tiempo: t VERSION AS OF n | TIMESTAMP AS OF 'x' | t@v3
          let k = sig(T, j + 1);
          if (T[j + 1] && T[j + 1].v === '@' && T[j + 2] && /^v\d+$/i.test(T[j + 2].v)) { nom = versionTabla(ref, Number(T[j + 2].v.slice(1))); j += 2; k = sig(T, j + 1); }
          else if (W(T[k], 'VERSION', 'TIMESTAMP') && W(T[sig(T, k + 1)], 'AS') && W(T[sig(T, sig(T, k + 1) + 1)], 'OF')) {
            const vk = sig(T, sig(T, sig(T, k + 1) + 1) + 1);
            nom = W(T[k], 'VERSION') ? versionTabla(ref, Number(T[vk].v)) : versionPorFecha(ref, T[vk].v);
            j = vk;
          }
          lecturas.push(ref);
          out.push({ t: 'w', v: q(nom) });
          i = j;
          continue;
        }
      }
      out.push(tk);
    }
    return traducirExpr(out);
  }
  function argsFuncion(T, abre) {
    const args = []; let cur = []; let d = 0, i = abre;
    for (; i < T.length; i++) {
      const tk = T[i];
      if (tk.v === '(' && tk.t === 'p') { d++; if (d === 1) continue; }
      if (tk.v === ')' && tk.t === 'p') { d--; if (d === 0) break; }
      if (tk.v === ',' && tk.t === 'p' && d === 1) { args.push(cur); cur = []; continue; }
      cur.push(tk);
    }
    if (cur.some((x) => x.t !== 'ws')) args.push(cur);
    return { fin: i, args };
  }
  // funciones y sintaxis de expresiones de Spark → SQLite
  function traducirExpr(T) {
    const out = [];
    for (let i = 0; i < T.length; i++) {
      const tk = T[i];
      // CAST(x AS tipo) y try_cast(x AS tipo)
      if (W(tk, 'CAST', 'TRY_CAST') && T[sig(T, i + 1)] && T[sig(T, i + 1)].v === '(') {
        const { fin, args } = argsFuncion(T, sig(T, i + 1));
        const cuerpo = args.length === 1 ? args[0] : args.flatMap((a, x) => (x ? [{ t: 'p', v: ',' }, ...a] : a));
        let as = -1, d = 0;
        for (let x = 0; x < cuerpo.length; x++) { if (cuerpo[x].v === '(') d++; else if (cuerpo[x].v === ')') d--; else if (d === 0 && W(cuerpo[x], 'AS')) as = x; }
        if (as < 0) err('PARSE_SYNTAX_ERROR', 'Syntax error: CAST necesita la forma CAST(expresión AS tipo).');
        const tipo = normTipo(unirOriginal(cuerpo.slice(as + 1)).trim());
        out.push({ t: 'w', v: `${W(tk, 'TRY_CAST') ? '__try_cast' : '__cast'}(${unir(traducirExpr(cuerpo.slice(0, as)))}, '${tipo}')` });
        i = fin; continue;
      }
      // x::tipo
      if (tk.t === 'p' && tk.v === '::') {
        const j = sig(T, i + 1); let tipoTxt = T[j].v; let fin = j;
        if (T[sig(T, j + 1)] && T[sig(T, j + 1)].v === '(') { const a = argsFuncion(T, sig(T, j + 1)); tipoTxt += '(' + a.args.map((x) => unirOriginal(x)).join(',') + ')'; fin = a.fin; }
        // la expresión anterior: un término (identificador, número, texto, o paréntesis)
        let k = out.length - 1; while (k >= 0 && out[k].t === 'ws') k--;
        let ini = k;
        if (out[k] && out[k].v === ')') { let d = 0; for (ini = k; ini >= 0; ini--) { if (out[ini].v === ')') d++; else if (out[ini].v === '(') { d--; if (d === 0) break; } } if (ini > 0 && out[ini - 1].t === 'w') ini--; }
        else while (ini > 1 && out[ini - 1].v === '.' && (out[ini - 2].t === 'w' || out[ini - 2].t === 'b')) ini -= 2;
        const expr = out.splice(ini, k - ini + 1);
        out.push({ t: 'w', v: `__cast(${unir(expr)}, '${normTipo(tipoTxt)}')` });
        i = fin; continue;
      }
      if (W(tk, 'IF') && T[sig(T, i + 1)] && T[sig(T, i + 1)].v === '(') { out.push({ t: 'w', v: 'iif' }); continue; }
      if (W(tk, 'TYPEOF') && T[sig(T, i + 1)] && T[sig(T, i + 1)].v === '(') { out.push({ t: 'w', v: '__spark_typeof' }); continue; }
      if (W(tk, 'ILIKE')) { out.push({ t: 'w', v: 'LIKE' }); continue; }
      if (W(tk, 'RLIKE', 'REGEXP')) { out.push({ t: 'w', v: 'REGEXP' }); continue; }
      if (W(tk, 'DIV')) { out.push({ t: 'p', v: '/' }); continue; }
      if (tk.t === 'p' && tk.v === '<=>') { out.push({ t: 'w', v: 'IS' }); continue; }
      if (tk.t === 'p' && tk.v === '==') { out.push({ t: 'p', v: '=' }); continue; }
      if (W(tk, 'TRUE')) { out.push({ t: 'n', v: '1' }); continue; }
      if (W(tk, 'FALSE')) { out.push({ t: 'n', v: '0' }); continue; }
      // x + INTERVAL n DAY(S)/MONTH(S)/YEAR(S)
      if (W(tk, 'INTERVAL')) {
        const j = sig(T, i + 1), u = sig(T, j + 1);
        const n = T[j].t === 's' ? T[j].v : T[j].v;
        const unidad = (T[u] && T[u].v || 'DAY').toUpperCase().replace(/S$/, '');
        let k = out.length - 1; while (k >= 0 && out[k].t === 'ws') k--;
        const op = out[k];
        if (op && (op.v === '+' || op.v === '-')) {
          out.splice(k, 1);
          let k2 = out.length - 1; while (k2 >= 0 && out[k2].t === 'ws') k2--;
          let ini = k2; if (out[k2] && out[k2].v === ')') { let d = 0; for (ini = k2; ini >= 0; ini--) { if (out[ini].v === ')') d++; else if (out[ini].v === '(') { d--; if (d === 0) break; } } if (ini > 0 && out[ini - 1].t === 'w') ini--; } else while (ini > 1 && out[ini - 1].v === '.') ini -= 2;
          const base = out.splice(ini, k2 - ini + 1);
          const sign = op.v === '-' ? '-' : '+';
          const fn = unidad === 'HOUR' || unidad === 'MINUTE' ? 'datetime' : 'date';
          out.push({ t: 'w', v: `${fn}(${unir(base)}, '${sign}${n} ${unidad.toLowerCase()}s')` });
          i = u; continue;
        }
      }
      out.push(tk);
    }
    return out;
  }

  // versiones de una tabla Delta
  function versionTabla(ref, v) {
    if (!ref.meta) err('UNSUPPORTED_FEATURE', 'El viaje en el tiempo funciona sobre tablas Delta de tus catálogos (no sobre samples).');
    const vs = ref.meta.versiones || [];
    const ult = vs.length ? vs[vs.length - 1].version : 0;
    if (v === ult) return ref.sql;
    const ver = vs.find((x) => x.version === v);
    if (!ver) err('DELTA_VERSIONS_NOT_CONTIGUOUS', `Cannot time travel Delta table to version ${v}. Available versions: [${vs.length ? vs[0].version : 0}, ${ult}].`);
    if (!ver.filas && !existeFisica(`${ref.sql}__v${v}`)) err('DELTA_FILE_NOT_FOUND_DETAILED', `Los archivos de la versión ${v} ya no existen (los borró un VACUUM o la versión es muy vieja para esta práctica).`);
    return `${ref.sql}__v${v}`;
  }
  function versionPorFecha(ref, ts) {
    const vs = (ref.meta && ref.meta.versiones) || [];
    const elegida = [...vs].reverse().find((x) => x.timestamp <= String(ts).replace('T', ' '));
    if (!elegida) err('DELTA_TIMESTAMP_EARLIER_THAN_COMMIT_RETENTION', `The provided timestamp (${ts}) is before the earliest version available to this table (${vs[0] ? vs[0].timestamp : '-'}).`);
    return versionTabla(ref, elegida.version);
  }
  const existeFisica = (nom) => !!db.exec(`SELECT 1 FROM sqlite_master WHERE name = ${lit(nom)}`).length;

  // ------------------------------------------------------------------ archivos en volúmenes (read_files)
  let archivosAislados = null; // los ejercicios corren con sus propios archivos
  function archivos() { return archivosAislados || (window.CloudSim ? window.CloudSim.dbx().files : {}); }
  function leerArchivos(args) {
    const ruta = args[0] && args[0].find((x) => x.t === 's');
    if (!ruta) err('INVALID_PARAMETER_VALUE', "read_files necesita la ruta entre comillas: read_files('/Volumes/main/default/raw/archivo.csv', format => 'csv', header => true)");
    const op = {};
    for (const a of args.slice(1)) { const s = unirOriginal(a); const m = /^\s*(\w+)\s*=>\s*(.+?)\s*$/s.exec(s); if (m) op[m[1].toLowerCase()] = m[2].replace(/^['"]|['"]$/g, ''); }
    const r = ruta.v.replace(/^dbfs:/, '').replace(/\/$/, '');
    if (!/^\/Volumes\/\w+\/\w+\/\w+/.test(r) && !r.startsWith('/FileStore') && !r.startsWith('/tmp')) err('INVALID_PARAMETER_VALUE', `La ruta '${r}' no está en un volumen. En Unity Catalog los archivos van en /Volumes/<catálogo>/<esquema>/<volumen>/.`);
    const F = archivos();
    const lista = Object.keys(F).filter((k) => k === r || k.startsWith(r + '/')).filter((k) => !k.split('/').pop().startsWith('_') && !k.split('/').pop().startsWith('.'));
    if (!lista.length) err('PATH_NOT_FOUND', `Path does not exist: dbfs:${r}. SQLSTATE: 42K03`);
    const formato = (op.format || lista[0].split('.').pop() || 'csv').toLowerCase();
    let cols = null; const filas = [];
    for (const k of lista) {
      const txt = F[k];
      if (formato === 'json') {
        const objs = txt.trim().startsWith('[') ? JSON.parse(txt) : txt.split('\n').filter((l) => l.trim()).map((l) => { try { return JSON.parse(l); } catch (e) { return { _corrupt_record: l }; } });
        cols = cols || [...new Set(objs.flatMap((o) => Object.keys(o)))];
        for (const o of objs) filas.push(cols.map((c) => (o[c] === undefined ? null : typeof o[c] === 'object' && o[c] !== null ? JSON.stringify(o[c]) : typeof o[c] === 'boolean' ? (o[c] ? 1 : 0) : o[c])));
      } else if (formato === 'csv' || formato === 'text' || formato === 'txt') {
        const sep = op.sep || op.delimiter || ',';
        const lineas = formato === 'csv' ? parseCsv(txt, sep) : txt.split('\n').filter((l) => l !== '').map((l) => [l]);
        if (!lineas.length) continue;
        const header = formato === 'csv' && String(op.header || 'false').toLowerCase() === 'true';
        const enc = header ? lineas.shift() : lineas[0].map((_, i) => (formato === 'text' ? 'value' : `_c${i}`));
        cols = cols || enc;
        for (const l of lineas) filas.push(cols.map((_, i) => (l[i] === undefined || l[i] === '' ? null : l[i])));
      } else err('UNSUPPORTED_FILE_FORMAT', `En esta práctica read_files lee csv, json y text (pediste ${formato}).`);
    }
    // inferencia de tipos (como inferSchema), salvo que se pida todo como texto
    const conTipos = String(op.inferschema || op.inferColumnTypes || 'true').toLowerCase() !== 'false';
    if (conTipos && formato === 'csv') for (let c = 0; c < cols.length; c++) { const vs = filas.map((f) => f[c]).filter((x) => x != null); if (vs.length && vs.every((x) => /^-?\d+(\.\d+)?$/.test(x))) for (const f of filas) if (f[c] != null) f[c] = Number(f[c]); }
    const c2 = formato === 'text' ? cols : [...cols, '_rescued_data'];
    const nom = tablaTemporal('rf' + (sesion.n++), c2, filas.map((f) => (formato === 'text' ? f : [...f, null])));
    return nom;
  }
  function parseCsv(txt, sep = ',') {
    const filas = []; let f = [], v = '', enQ = false;
    for (let i = 0; i < txt.length; i++) {
      const c = txt[i];
      if (enQ) { if (c === '"') { if (txt[i + 1] === '"') { v += '"'; i++; } else enQ = false; } else v += c; continue; }
      if (c === '"') enQ = true; else if (c === sep) { f.push(v); v = ''; } else if (c === '\n') { f.push(v); filas.push(f); f = []; v = ''; } else if (c !== '\r') v += c;
    }
    if (v !== '' || f.length) { f.push(v); filas.push(f); }
    return filas.filter((x) => x.some((y) => y !== ''));
  }

  // ------------------------------------------------------------------ escribir: versiones Delta
  function registrarVersion(ref, op, params = {}, metricas = {}) {
    const U = uc();
    const T = U.catalogs[ref.c].schemas[ref.s].tables[ref.t];
    const filas = db.exec(`SELECT * FROM ${q(ref.sql)}`);
    const datos = filas.length ? filas[0].values : [];
    T.filas = datos;
    T.versiones = T.versiones || [];
    const v = T.versiones.length ? T.versiones[T.versiones.length - 1].version + 1 : 0;
    const ver = { version: v, timestamp: ahora(), userName: USUARIO, operation: op, operationParameters: params, operationMetrics: metricas, cols: T.cols.slice(), filas: datos.length <= 3000 ? datos : null, isBlindAppend: op === 'WRITE' && params.mode === 'Append' };
    T.versiones.push(ver);
    // copia física de esta versión, para VERSION AS OF
    if (T.cols.length) { try { crearFisica(`${ref.sql}__v${v}`, T.cols, datos); } catch (e) { /* sin copia */ } }
    // límite de la práctica: se guardan los datos de las últimas 10 versiones
    for (const x of T.versiones.slice(0, -10)) x.filas = null;
    T.modificado = ahora();
    U.audit.push({ t: ahora(), servicio: 'unityCatalog', accion: op === 'CREATE TABLE' || op === 'CREATE TABLE AS SELECT' || op === 'CREATE OR REPLACE TABLE AS SELECT' ? 'createTable' : 'updateTable', params: { full_name_arg: `${ref.c}.${ref.s}.${ref.t}`, operation: op } });
    guardar();
    return v;
  }
  function validarEscritura(ref) {
    const T = ref.meta || (uc().catalogs[ref.c] && uc().catalogs[ref.c].schemas[ref.s].tables[ref.t]);
    if (!T) return;
    // tipos (como el modo ANSI de Databricks: no se guarda texto en una columna numérica)
    for (const c of T.cols) {
      if (esNum(c.t)) {
        const r = db.exec(`SELECT ${q(c.n)} FROM ${q(ref.sql)} WHERE ${q(c.n)} IS NOT NULL AND typeof(${q(c.n)}) NOT IN ('integer','real') LIMIT 1`);
        if (r.length) err('CAST_INVALID_INPUT', `The value '${r[0].values[0][0]}' of the type "STRING" cannot be cast to "${c.t.toUpperCase()}" because it is malformed. Correct the value as per the syntax, or change its target type. Use \`try_cast\` to tolerate malformed input and return NULL instead.`);
      }
      if (c.notNull) {
        const r = db.exec(`SELECT COUNT(*) FROM ${q(ref.sql)} WHERE ${q(c.n)} IS NULL`);
        if (r[0].values[0][0]) err('DELTA_NOT_NULL_CONSTRAINT_VIOLATED', `NOT NULL constraint violated for column: ${c.n}.`);
      }
    }
    for (const [nom, expr] of Object.entries(T.checks || {})) {
      const r = db.exec(`SELECT * FROM ${q(ref.sql)} WHERE NOT COALESCE((${unir(traducirExpr(tokenizar(expr)))}), 1) LIMIT 1`);
      if (r.length) err('DELTA_VIOLATE_CONSTRAINT_WITH_VALUES', `CHECK constraint ${nom} (${expr}) violated by row with values:\n${r[0].columns.map((c, i) => ` - ${c} : ${r[0].values[0][i]}`).join('\n')}`);
    }
  }
  // ejecuta una escritura dentro de un SAVEPOINT: si falla una validación, nada cambia
  function transaccion(fn) {
    db.run('SAVEPOINT dbx');
    try { const r = fn(); db.run('RELEASE dbx'); return r; } catch (e) { db.run('ROLLBACK TO dbx'); db.run('RELEASE dbx'); throw e; }
  }
  const cambios = () => db.getRowsModified();

  // ------------------------------------------------------------------ DDL de objetos
  function crearMetaTabla(ref, cols, extra = {}) {
    const U = uc(); const S = U.catalogs[ref.c].schemas[ref.s];
    S.tables[ref.t] = { tipo: 'MANAGED', formato: 'DELTA', cols, creado: ahora(), owner: USUARIO, versiones: [], filas: [], comment: null, props: { 'delta.minReaderVersion': '1', 'delta.minWriterVersion': '2' }, checks: {}, ...extra };
    return S.tables[ref.t];
  }
  function parsearColumnas(T) {
    // (a INT NOT NULL COMMENT 'x', b STRING, CONSTRAINT c CHECK (...))
    const { args } = argsFuncion(T, sig(T, 0));
    const cols = [], checks = {};
    for (const a of args) {
      const s = unirOriginal(a).trim();
      const ck = /^CONSTRAINT\s+(\w+)\s+CHECK\s*\((.*)\)$/is.exec(s);
      if (ck) { checks[ck[1]] = ck[2].trim(); continue; }
      if (/^(PRIMARY|FOREIGN|CONSTRAINT)\b/i.test(s)) continue;
      const m = /^(`[^`]+`|[\wÀ-￿]+)\s+([\w]+(?:\s*\(\s*\d+\s*(?:,\s*\d+\s*)?\))?)(.*)$/is.exec(s);
      if (!m) err('PARSE_SYNTAX_ERROR', `Syntax error at or near '${s.split(/\s+/)[0]}': cada columna es "nombre TIPO", por ejemplo id BIGINT.`);
      const resto = m[3] || '';
      const com = /COMMENT\s+'((?:[^'\\]|\\.)*)'/i.exec(resto);
      cols.push({ n: m[1].replace(/`/g, ''), t: normTipo(m[2]), notNull: /NOT\s+NULL/i.test(resto), comment: com ? com[1] : null, identity: /GENERATED\s+(ALWAYS|BY\s+DEFAULT)\s+AS\s+IDENTITY/i.test(resto), generado: (/GENERATED\s+ALWAYS\s+AS\s*\((.*)\)/i.exec(resto) || [])[1] || null });
    }
    return { cols, checks };
  }
  // a partir de un resultado (CTAS): columnas con tipos inferidos
  function colsDeResultado(nomTemp) {
    const info = db.exec(`SELECT * FROM ${q(nomTemp)} LIMIT 500`);
    const pr = db.exec(`PRAGMA table_info(${q(nomTemp)})`)[0];
    const nombres = pr ? pr.values.map((r) => r[1]) : [];
    const filas = info.length ? info[0].values : [];
    const tipos = tiposDe(nombres, filas);
    return nombres.map((n, i) => ({ n, t: tipos[i] }));
  }

  // ------------------------------------------------------------------ ejecutar una sentencia
  function ejecutarUna(st, opts) {
    const T = st.T, txt = st.texto;
    const U = uc();
    const R = (cols, filas, extra = {}) => ({ cols, filas, ...extra });
    const OK = (msg = 'OK') => ({ cols: [], filas: [], msg });
    const up = txt.replace(/\s+/g, ' ').toUpperCase();
    const audit = (accion, params) => U.audit.push({ t: ahora(), servicio: 'unityCatalog', accion, params });
    const m = (re) => re.exec(txt.replace(/\s+/g, ' ').trim());
    let x;

    // ---- USE / SET
    if ((x = m(/^USE\s+CATALOG\s+(`?[\w]+`?)$/i))) { const c = x[1].replace(/`/g, '').toLowerCase(); if (c !== 'samples' && c !== 'system' && !U.catalogs[c]) err('NO_SUCH_CATALOG_EXCEPTION', `Catalog '${c}' was not found.`); U.cur.catalog = c; U.cur.schema = c === 'samples' ? Object.keys(samples())[0] : c === 'system' ? 'information_schema' : (U.catalogs[c].schemas.default ? 'default' : Object.keys(U.catalogs[c].schemas)[0]); guardar(); return OK(); }
    if ((x = m(/^USE\s+(?:SCHEMA\s+|DATABASE\s+)?(`?[\w]+`?(?:\.`?[\w]+`?)?)$/i))) {
      const p = partes(x[1]).map((y) => y.toLowerCase()); const c = p.length === 2 ? p[0] : U.cur.catalog, s = p[p.length - 1];
      if (c === 'samples') { if (!samples()[s]) err('SCHEMA_NOT_FOUND', `The schema \`samples\`.\`${s}\` cannot be found.`); }
      else if (c !== 'system') { if (!U.catalogs[c]) err('NO_SUCH_CATALOG_EXCEPTION', `Catalog '${c}' was not found.`); if (!U.catalogs[c].schemas[s]) err('SCHEMA_NOT_FOUND', `The schema ${fq(c, s)} cannot be found. Verify the spelling and correctness of the schema and catalog.`); }
      U.cur.catalog = c; U.cur.schema = s; guardar(); return OK();
    }
    if (/^SET\s/i.test(txt) || /^RESET\b/i.test(txt)) return R(['key', 'value'], [[(txt.split(/\s+/)[1] || '').split('=')[0], (txt.split('=')[1] || '').trim()]]);
    // ---- SHOW
    if (/^SHOW\s+CATALOGS/i.test(txt)) { const like = (/LIKE\s+'([^']*)'/i.exec(txt) || [])[1]; const l = [...Object.keys(U.catalogs), 'samples', 'system'].sort(); return R(['catalog'], l.filter((c) => !like || patron(like).test(c)).map((c) => [c])); }
    if ((x = m(/^SHOW\s+(?:SCHEMAS|DATABASES)(?:\s+(?:IN|FROM)\s+(`?\w+`?))?(?:\s+LIKE\s+'([^']*)')?$/i))) {
      const c = (x[1] || U.cur.catalog).replace(/`/g, '').toLowerCase();
      const l = c === 'samples' ? Object.keys(samples()) : c === 'system' ? Object.keys(SISTEMA) : U.catalogs[c] ? Object.keys(U.catalogs[c].schemas) : err('NO_SUCH_CATALOG_EXCEPTION', `Catalog '${c}' was not found.`);
      return R(['databaseName'], l.filter((s) => !x[2] || patron(x[2]).test(s)).sort().map((s) => [s]));
    }
    if ((x = m(/^SHOW\s+TABLES(?:\s+(?:IN|FROM)\s+(`?\w+`?(?:\.`?\w+`?)?))?(?:\s+LIKE\s+'([^']*)')?$/i))) {
      const p = x[1] ? partes(x[1]).map((y) => y.toLowerCase()) : [];
      const c = p.length === 2 ? p[0] : U.cur.catalog, s = p.length ? p[p.length - 1] : U.cur.schema;
      let l;
      if (c === 'samples') l = samples()[s] || err('SCHEMA_NOT_FOUND', `The schema \`samples\`.\`${s}\` cannot be found.`);
      else if (c === 'system') l = SISTEMA[s] || [];
      else { const S = U.catalogs[c] && U.catalogs[c].schemas[s]; if (!S) err('SCHEMA_NOT_FOUND', `The schema ${fq(c, s)} cannot be found.`); l = Object.keys(S.tables); }
      const temps = p.length ? [] : Object.keys(sesion.temp);
      return R(['database', 'tableName', 'isTemporary'], [...l.filter((t) => !x[2] || patron(x[2]).test(t)).sort().map((t) => [s, t, 0]), ...temps.map((t) => ['', t, 1])]);
    }
    if ((x = m(/^SHOW\s+VOLUMES(?:\s+(?:IN|FROM)\s+(`?\w+`?(?:\.`?\w+`?)?))?$/i))) {
      const p = x[1] ? partes(x[1]).map((y) => y.toLowerCase()) : []; const c = p.length === 2 ? p[0] : U.cur.catalog, s = p.length ? p[p.length - 1] : U.cur.schema;
      const S = U.catalogs[c] && U.catalogs[c].schemas[s]; if (!S) err('SCHEMA_NOT_FOUND', `The schema ${fq(c, s)} cannot be found.`);
      return R(['database', 'volume_name'], Object.keys(S.volumes || {}).map((v) => [s, v]));
    }
    if ((x = m(/^SHOW\s+COLUMNS\s+(?:IN|FROM)\s+(\S+)$/i))) { const ref = resolver(x[1]); return R(['col_name'], columnas(ref).map((c) => [c.n])); }
    if ((x = m(/^SHOW\s+TBLPROPERTIES\s+(\S+)$/i))) { const ref = resolver(x[1]); return R(['key', 'value'], Object.entries((ref.meta && ref.meta.props) || {})); }
    if ((x = m(/^SHOW\s+CREATE\s+TABLE\s+(\S+)$/i))) { const ref = resolver(x[1]); return R(['createtab_stmt'], [[ddlDe(ref)]]); }
    if ((x = m(/^SHOW\s+GRANTS?(?:\s+(`[^`]+`|\S+))?\s+ON\s+(CATALOG|SCHEMA|TABLE|VOLUME)\s+(\S+)$/i))) {
      const obj = `${x[2].toUpperCase()} ${nombreObj(x[2], x[3])}`;
      const quien = x[1] && x[1].replace(/`/g, '');
      return R(['Principal', 'ActionType', 'ObjectType', 'ObjectKey'], [[USUARIO, 'OWN', x[2].toUpperCase(), obj.split(' ')[1]], ...U.grants.filter((g) => g.obj === obj && (!quien || g.principal === quien)).map((g) => [g.principal, g.priv, x[2].toUpperCase(), obj.split(' ')[1]])]);
    }
    if (/^SHOW\s+(FUNCTIONS|USER\s+FUNCTIONS)/i.test(txt)) return R(['function'], ['abs', 'avg', 'collect_list', 'concat_ws', 'count', 'current_date', 'date_add', 'date_format', 'date_trunc', 'datediff', 'max', 'median', 'min', 'read_files', 'regexp_replace', 'sum', 'try_cast', 'try_divide'].map((f) => [f]));
    // ---- CATALOG / SCHEMA / VOLUME
    if ((x = m(/^CREATE\s+CATALOG\s+(IF\s+NOT\s+EXISTS\s+)?(`?\w+`?)(?:\s+MANAGED\s+LOCATION\s+'[^']*')?(?:\s+COMMENT\s+'([^']*)')?$/i))) {
      const c = x[2].replace(/`/g, '').toLowerCase();
      if (U.catalogs[c] || c === 'samples' || c === 'system') { if (x[1]) return OK(); err('CATALOG_ALREADY_EXISTS', `Cannot create catalog \`${c}\` because it already exists. Choose a different name, drop or replace the existing catalog, or add the IF NOT EXISTS clause to tolerate pre-existing catalog.`); }
      U.catalogs[c] = { comment: x[3] || null, owner: USUARIO, created: ahora(), schemas: { default: { comment: 'Default schema (auto-created)', owner: USUARIO, tables: {}, volumes: {} }, information_schema: { system: true, tables: {}, volumes: {} } } };
      audit('createCatalog', { name: c }); guardar(); return OK();
    }
    if ((x = m(/^CREATE\s+(?:SCHEMA|DATABASE)\s+(IF\s+NOT\s+EXISTS\s+)?(`?\w+`?(?:\.`?\w+`?)?)(?:\s+MANAGED\s+LOCATION\s+'[^']*')?(?:\s+COMMENT\s+'([^']*)')?$/i))) {
      const p = partes(x[2]).map((y) => y.toLowerCase()); const c = p.length === 2 ? p[0] : U.cur.catalog, s = p[p.length - 1];
      if (c === 'samples' || c === 'system') err('PERMISSION_DENIED', `User does not have CREATE SCHEMA on Catalog '${c}'.`);
      if (!U.catalogs[c]) err('NO_SUCH_CATALOG_EXCEPTION', `Catalog '${c}' was not found.`);
      if (U.catalogs[c].schemas[s]) { if (x[1]) return OK(); err('SCHEMA_ALREADY_EXISTS', `Cannot create schema ${fq(c, s)} because it already exists. Choose a different name, drop the existing schema, or add the IF NOT EXISTS clause to tolerate pre-existing schema.`); }
      U.catalogs[c].schemas[s] = { comment: x[3] || null, owner: USUARIO, created: ahora(), tables: {}, volumes: {} };
      audit('createSchema', { full_name_arg: `${c}.${s}` }); guardar(); return OK();
    }
    if ((x = m(/^CREATE\s+(?:EXTERNAL\s+)?VOLUME\s+(IF\s+NOT\s+EXISTS\s+)?(\S+?)(?:\s+LOCATION\s+'[^']*')?(?:\s+COMMENT\s+'([^']*)')?$/i))) {
      const p = partes(x[2]).map((y) => y.toLowerCase()); const full = p.length === 3 ? p : p.length === 2 ? [U.cur.catalog, ...p] : [U.cur.catalog, U.cur.schema, p[0]];
      const [c, s, v] = full; const S = U.catalogs[c] && U.catalogs[c].schemas[s];
      if (!S) err('SCHEMA_NOT_FOUND', `The schema ${fq(c, s)} cannot be found.`);
      S.volumes = S.volumes || {};
      if (S.volumes[v]) { if (x[1]) return OK(); err('VOLUME_ALREADY_EXISTS', `Cannot create volume ${fq(c, s, v)} because it already exists.`); }
      S.volumes[v] = { tipo: /EXTERNAL/i.test(txt) ? 'EXTERNAL' : 'MANAGED', comment: x[3] || null, owner: USUARIO, creado: ahora() };
      audit('createVolume', { full_name_arg: `${c}.${s}.${v}` }); guardar(); return OK();
    }
    if ((x = m(/^DROP\s+(CATALOG|SCHEMA|DATABASE|VOLUME)\s+(IF\s+EXISTS\s+)?(\S+?)(\s+CASCADE)?$/i))) {
      const tipo = x[1].toUpperCase(); const p = partes(x[3]).map((y) => y.toLowerCase());
      if (tipo === 'CATALOG') {
        const c = p[0]; if (!U.catalogs[c]) { if (x[2]) return OK(); err('NO_SUCH_CATALOG_EXCEPTION', `Catalog '${c}' was not found.`); }
        if (c === 'main') err('PERMISSION_DENIED', 'En esta práctica el catálogo main no se puede borrar.');
        const conTablas = Object.values(U.catalogs[c].schemas).some((S) => Object.keys(S.tables || {}).length);
        if (conTablas && !x[4]) err('SCHEMA_NOT_EMPTY', `Cannot drop a catalog ${'`' + c + '`'} because it contains objects. Use DROP CATALOG ... CASCADE to drop the catalog and all its objects.`);
        for (const [s, S] of Object.entries(U.catalogs[c].schemas)) for (const t of Object.keys(S.tables || {})) borrarFisica(sqlNombre(c, s, t));
        delete U.catalogs[c]; if (U.cur.catalog === c) U.cur = { catalog: 'main', schema: 'default' };
        audit('deleteCatalog', { name: c }); guardar(); return OK();
      }
      if (tipo === 'VOLUME') { const full = p.length === 3 ? p : p.length === 2 ? [U.cur.catalog, ...p] : [U.cur.catalog, U.cur.schema, p[0]]; const S = U.catalogs[full[0]] && U.catalogs[full[0]].schemas[full[1]]; if (!S || !S.volumes || !S.volumes[full[2]]) { if (x[2]) return OK(); err('VOLUME_NOT_FOUND', `Volume ${fq(...full)} does not exist.`); } delete S.volumes[full[2]]; const F = archivos(); for (const k of Object.keys(F)) if (k.startsWith(`/Volumes/${full.join('/')}/`)) delete F[k]; guardar(); return OK(); }
      const c = p.length === 2 ? p[0] : U.cur.catalog, s = p[p.length - 1];
      const S = U.catalogs[c] && U.catalogs[c].schemas[s];
      if (!S) { if (x[2]) return OK(); err('SCHEMA_NOT_FOUND', `The schema ${fq(c, s)} cannot be found.`); }
      if (Object.keys(S.tables).length && !x[4]) err('SCHEMA_NOT_EMPTY', `Cannot drop a schema ${fq(c, s)} because it contains objects. Use DROP SCHEMA ... CASCADE to drop the schema and all its objects.`);
      for (const t of Object.keys(S.tables)) borrarFisica(sqlNombre(c, s, t));
      delete U.catalogs[c].schemas[s]; if (U.cur.catalog === c && U.cur.schema === s) U.cur.schema = 'default';
      audit('deleteSchema', { full_name_arg: `${c}.${s}` }); guardar(); return OK();
    }
    // ---- DESCRIBE
    if ((x = m(/^DESCRIBE\s+HISTORY\s+(\S+)(?:\s+LIMIT\s+(\d+))?$/i))) {
      const ref = resolver(x[1]); if (!ref.meta) err('DELTA_TABLE_ONLY_OPERATION', `${x[1]} is not a Delta table. DESCRIBE HISTORY is only supported for Delta tables.`);
      const vs = [...(ref.meta.versiones || [])].reverse().slice(0, x[2] ? Number(x[2]) : 1e9);
      return R(['version', 'timestamp', 'userName', 'operation', 'operationParameters', 'readVersion', 'isolationLevel', 'isBlindAppend', 'operationMetrics'], vs.map((v) => [v.version, v.timestamp, v.userName, v.operation, JSON.stringify(v.operationParameters || {}), v.version ? v.version - 1 : null, 'WriteSerializable', v.isBlindAppend ? 1 : 0, JSON.stringify(v.operationMetrics || {})]));
    }
    if ((x = m(/^DESCRIBE\s+DETAIL\s+(\S+)$/i))) {
      const ref = resolver(x[1]); const M = ref.meta || {};
      const n = db.exec(`SELECT COUNT(*) FROM ${q(ref.sql)}`)[0].values[0][0];
      return R(['format', 'id', 'name', 'description', 'location', 'createdAt', 'lastModified', 'partitionColumns', 'clusteringColumns', 'numFiles', 'sizeInBytes', 'properties', 'minReaderVersion', 'minWriterVersion'], [['delta', hashHex(ref.sql, 32).replace(/^(.{8})(.{4})(.{4})(.{4})/, '$1-$2-$3-$4-'), `${ref.c}.${ref.s}.${ref.t}`, M.comment || null, `abfss://metastore@stacademia.dfs.core.windows.net/${hashHex(ref.c, 8)}/tables/${hashHex(ref.sql, 32)}`, M.creado || null, M.modificado || M.creado || null, JSON.stringify(M.particion || []), JSON.stringify(M.cluster || []), M.archivos ?? Math.max(1, Math.ceil(n / 5000)), n * 48 + 1024, JSON.stringify(M.props || {}), 1, 2]]);
    }
    if ((x = m(/^DESCRIBE\s+(CATALOG|SCHEMA|DATABASE)(?:\s+EXTENDED)?\s+(\S+)$/i))) {
      const p = partes(x[2]).map((y) => y.toLowerCase());
      if (x[1].toUpperCase() === 'CATALOG') { const C = U.catalogs[p[0]]; if (!C && p[0] !== 'samples' && p[0] !== 'system') err('NO_SUCH_CATALOG_EXCEPTION', `Catalog '${p[0]}' was not found.`); return R(['info_name', 'info_value'], [['Catalog Name', p[0]], ['Comment', (C && C.comment) || ''], ['Owner', (C && C.owner) || 'System user'], ['Catalog Type', C ? 'Regular' : 'System']]); }
      const c = p.length === 2 ? p[0] : U.cur.catalog, s = p[p.length - 1]; const S = U.catalogs[c] && U.catalogs[c].schemas[s];
      return R(['database_description_item', 'database_description_value'], [['Catalog Name', c], ['Namespace Name', s], ['Comment', (S && S.comment) || ''], ['Owner', (S && S.owner) || USUARIO]]);
    }
    if ((x = m(/^(?:DESCRIBE|DESC)(?:\s+TABLE)?(\s+EXTENDED)?\s+(\S+)$/i)) && !/^(DESCRIBE|DESC)\s+(HISTORY|DETAIL|QUERY|FUNCTION|VOLUME)\b/i.test(txt)) {
      const ref = resolver(x[2]); const cols = columnas(ref);
      const filas = cols.map((c) => [c.n, c.t, c.comment || null]);
      if (x[1]) { const M = ref.meta || {}; filas.push(['', '', ''], ['# Detailed Table Information', '', ''], ['Catalog', ref.c || '', ''], ['Database', ref.s || '', ''], ['Table', ref.t || '', ''], ['Owner', M.owner || 'System user', ''], ['Created Time', M.creado || '', ''], ['Type', M.tipo || 'MANAGED', ''], ['Provider', 'delta', ''], ['Comment', M.comment || '', ''], ['Table Properties', JSON.stringify(M.props || {}), '']); }
      return R(['col_name', 'data_type', 'comment'], filas);
    }
    if ((x = m(/^DESCRIBE\s+VOLUME\s+(\S+)$/i))) { const p = partes(x[1]); const full = p.length === 3 ? p : [U.cur.catalog, U.cur.schema, p[p.length - 1]]; return R(['name', 'catalog', 'database', 'storage_location', 'volume_type'], [[full[2], full[0], full[1], `/Volumes/${full.join('/')}`, 'MANAGED']]); }
    // ---- LIST (archivos de un volumen)
    if ((x = m(/^LIST\s+'([^']+)'(?:\s+LIMIT\s+(\d+))?$/i))) {
      const r = x[1].replace(/\/$/, ''); const F = archivos();
      const hijos = new Map();
      for (const k of Object.keys(F)) if (k.startsWith(r + '/')) { const resto = k.slice(r.length + 1); const n0 = resto.split('/')[0]; hijos.set(n0, resto.includes('/') ? null : F[k].length); }
      if (!hijos.size && !Object.prototype.hasOwnProperty.call(F, r)) { if (/^\/Volumes\/\w+\/\w+\/\w+$/.test(r)) return R(['path', 'name', 'size', 'modification_time'], []); err('PATH_NOT_FOUND', `Path does not exist: ${r}`); }
      return R(['path', 'name', 'size', 'modification_time'], [...hijos].map(([n0, sz]) => [`dbfs:${r}/${n0}${sz == null ? '/' : ''}`, n0 + (sz == null ? '/' : ''), sz || 0, Date.now()]));
    }
    // ---- GRANT / REVOKE
    if ((x = m(/^GRANT\s+(.+?)\s+ON\s+(CATALOG|SCHEMA|DATABASE|TABLE|VOLUME|VIEW)\s+(\S+)\s+TO\s+(`[^`]+`|\S+)$/i))) {
      const tipo = x[2].toUpperCase() === 'DATABASE' ? 'SCHEMA' : x[2].toUpperCase() === 'VIEW' ? 'TABLE' : x[2].toUpperCase();
      const obj = `${tipo} ${nombreObj(tipo, x[3])}`;
      const privs = x[1].split(',').map((y) => y.trim().toUpperCase().replace(/\s+/g, ' '));
      const VALIDOS = { CATALOG: ['USE CATALOG', 'USE SCHEMA', 'CREATE SCHEMA', 'CREATE TABLE', 'SELECT', 'MODIFY', 'ALL PRIVILEGES', 'BROWSE', 'READ VOLUME', 'WRITE VOLUME', 'CREATE VOLUME', 'CREATE FUNCTION', 'EXECUTE', 'APPLY TAG', 'MANAGE'], SCHEMA: ['USE SCHEMA', 'CREATE TABLE', 'CREATE VOLUME', 'CREATE FUNCTION', 'CREATE MATERIALIZED VIEW', 'SELECT', 'MODIFY', 'ALL PRIVILEGES', 'READ VOLUME', 'WRITE VOLUME', 'EXECUTE', 'APPLY TAG', 'MANAGE'], TABLE: ['SELECT', 'MODIFY', 'ALL PRIVILEGES', 'APPLY TAG', 'MANAGE'], VOLUME: ['READ VOLUME', 'WRITE VOLUME', 'ALL PRIVILEGES', 'APPLY TAG', 'MANAGE'] };
      for (const p of privs) if (!VALIDOS[tipo].includes(p)) err('INVALID_PRIVILEGE', `Privilege ${p} is not valid for ${tipo.toLowerCase()}. Privilegios válidos: ${VALIDOS[tipo].join(', ')}.`);
      const quien = x[4].replace(/`/g, '');
      for (const p of privs) if (!U.grants.some((g) => g.obj === obj && g.priv === p && g.principal === quien)) U.grants.push({ obj, priv: p, principal: quien });
      audit('updatePermissions', { securable: obj, changes: privs.map((p) => ({ principal: quien, add: p })) }); guardar(); return OK();
    }
    if ((x = m(/^REVOKE\s+(.+?)\s+ON\s+(CATALOG|SCHEMA|DATABASE|TABLE|VOLUME|VIEW)\s+(\S+)\s+FROM\s+(`[^`]+`|\S+)$/i))) {
      const tipo = x[2].toUpperCase() === 'DATABASE' ? 'SCHEMA' : x[2].toUpperCase() === 'VIEW' ? 'TABLE' : x[2].toUpperCase();
      const obj = `${tipo} ${nombreObj(tipo, x[3])}`; const quien = x[4].replace(/`/g, ''); const privs = x[1].split(',').map((y) => y.trim().toUpperCase());
      U.grants = U.grants.filter((g) => !(g.obj === obj && g.principal === quien && (privs.includes(g.priv) || privs.includes('ALL PRIVILEGES'))));
      audit('updatePermissions', { securable: obj, changes: privs.map((p) => ({ principal: quien, remove: p })) }); guardar(); return OK();
    }
    // ---- COMMENT ON
    if ((x = m(/^COMMENT\s+ON\s+(TABLE|CATALOG|SCHEMA|COLUMN)\s+(\S+)\s+IS\s+(?:'((?:[^'\\]|\\.)*)'|NULL)$/i))) {
      const tipo = x[1].toUpperCase();
      if (tipo === 'TABLE') { const ref = resolver(x[2]); if (ref.solo) err('PERMISSION_DENIED', 'Solo lectura.'); ref.meta.comment = x[3] || null; }
      else if (tipo === 'CATALOG') { const C = U.catalogs[x[2].toLowerCase()]; if (!C) err('NO_SUCH_CATALOG_EXCEPTION', `Catalog '${x[2]}' was not found.`); C.comment = x[3] || null; }
      else if (tipo === 'SCHEMA') { const p = partes(x[2]).map((y) => y.toLowerCase()); const S = U.catalogs[p.length === 2 ? p[0] : U.cur.catalog].schemas[p[p.length - 1]]; S.comment = x[3] || null; }
      else { const p = partes(x[2]); const col = p.pop(); const ref = resolver(p); const c = ref.meta.cols.find((y) => y.n.toLowerCase() === col.toLowerCase()); if (!c) err('UNRESOLVED_COLUMN.WITHOUT_SUGGESTION', `A column with name \`${col}\` cannot be resolved.`); c.comment = x[3] || null; }
      guardar(); return OK();
    }
    // ---- CREATE TABLE / CTAS / CLONE / VIEW
    if (/^CREATE\s+(OR\s+REPLACE\s+)?(TEMP(ORARY)?\s+|GLOBAL\s+TEMP(ORARY)?\s+)?(MATERIALIZED\s+)?VIEW\b/i.test(txt)) return crearVista(st);
    if (/^(CREATE\s+(OR\s+REPLACE\s+)?|REPLACE\s+)(EXTERNAL\s+)?TABLE\b/i.test(txt)) return crearTabla(st);
    // ---- ALTER TABLE
    if (/^ALTER\s+TABLE\b/i.test(txt)) return alterarTabla(st);
    // ---- DROP / UNDROP / TRUNCATE
    if ((x = m(/^DROP\s+(TABLE|VIEW)\s+(IF\s+EXISTS\s+)?(\S+)$/i))) {
      const p = partes(x[3]);
      if (x[1].toUpperCase() === 'VIEW' && p.length === 1 && sesion.temp[p[0].toLowerCase()]) { db.run(`DROP VIEW IF EXISTS ${q(sesion.temp[p[0].toLowerCase()])}`); delete sesion.temp[p[0].toLowerCase()]; return OK(); }
      let ref; try { ref = resolver(p, { permitirVista: false }); } catch (e) { if (x[2] && /TABLE_OR_VIEW_NOT_FOUND/.test(e.message)) return OK(); throw e; }
      if (ref.solo) err('PERMISSION_DENIED', `User does not have MANAGE on Table '${ref.c}.${ref.s}.${ref.t}'.`);
      const M = ref.meta; const S = uc().catalogs[ref.c].schemas[ref.s];
      if (M.tipo !== 'VIEW') uc().papelera[`${ref.c}.${ref.s}.${ref.t}`] = { ...M, borrado: ahora() };
      delete S.tables[ref.t]; borrarFisica(ref.sql, M.tipo === 'VIEW');
      audit('deleteTable', { full_name_arg: `${ref.c}.${ref.s}.${ref.t}` }); guardar(); return OK();
    }
    if ((x = m(/^UNDROP\s+TABLE\s+(\S+)$/i))) {
      const p = partes(x[1]).map((y) => y.toLowerCase()); const full = p.length === 3 ? p : p.length === 2 ? [U.cur.catalog, ...p] : [U.cur.catalog, U.cur.schema, p[0]];
      const k = full.join('.'); const M = U.papelera[k];
      if (!M) err('ROUTINE_NOT_FOUND', `No hay una tabla borrada ${k} para recuperar (UNDROP recupera tablas administradas borradas en los últimos 7 días).`);
      const S = U.catalogs[full[0]].schemas[full[1]]; if (S.tables[full[2]]) err('TABLE_OR_VIEW_ALREADY_EXISTS', `Cannot create table ${fq(...full)} because it already exists.`);
      delete M.borrado; S.tables[full[2]] = M; delete U.papelera[k]; materializar(full[0], full[1], full[2], M); audit('undropTable', { full_name_arg: k }); guardar(); return OK();
    }
    if ((x = m(/^TRUNCATE\s+TABLE\s+(\S+)$/i))) { const ref = resolver(x[1]); escribible(ref); const n = db.exec(`SELECT COUNT(*) FROM ${q(ref.sql)}`)[0].values[0][0]; db.run(`DELETE FROM ${q(ref.sql)}`); registrarVersion(ref, 'TRUNCATE', {}, { numRemovedFiles: String(Math.max(1, Math.ceil(n / 5000))) }); return OK(); }
    // ---- OPTIMIZE / VACUUM / RESTORE / ANALYZE
    if ((x = m(/^OPTIMIZE\s+(\S+)(?:\s+WHERE\s+.+?)?(?:\s+ZORDER\s+BY\s*\(([^)]*)\))?$/i))) {
      const ref = resolver(x[1]); escribible(ref);
      const archivosAntes = ref.meta.archivos ?? (ref.meta.versiones || []).length;
      const z = x[2] ? x[2].split(',').map((y) => y.trim().replace(/`/g, '')) : [];
      for (const c of z) if (!ref.meta.cols.some((y) => y.n.toLowerCase() === c.toLowerCase())) err('DELTA_ZORDERING_COLUMN_DOES_NOT_EXIST', `Z-Ordering column ${c} does not exist in data schema.`);
      ref.meta.archivos = 1;
      const v = registrarVersion(ref, 'OPTIMIZE', { predicate: '[]', zOrderBy: JSON.stringify(z), auto: false }, { numRemovedFiles: String(archivosAntes), numAddedFiles: '1' });
      void v;
      return R(['path', 'metrics'], [[`abfss://…/tables/${hashHex(ref.sql, 32)}`, JSON.stringify({ numFilesAdded: archivosAntes > 1 ? 1 : 0, numFilesRemoved: archivosAntes > 1 ? archivosAntes : 0, filesAdded: { min: 1024, max: 1024 }, partitionsOptimized: 0, zOrderStats: z.length ? { strategyName: 'minCubeSize(107374182400)' } : null, totalConsideredFiles: archivosAntes })]]);
    }
    if ((x = m(/^VACUUM\s+(\S+)(?:\s+RETAIN\s+(\d+(?:\.\d+)?)\s+HOURS)?(\s+DRY\s+RUN)?$/i))) {
      const ref = resolver(x[1]); escribible(ref);
      const horas = x[2] ? Number(x[2]) : 168;
      if (horas < 168 && !opts.sinChequeoRetencion) err('DELTA_VACUUM_RETENTION_PERIOD_TOO_SHORT', `requirement failed: Are you sure you would like to vacuum files with such a low retention period? If you have writers that are currently writing to this table, there is a risk that you may corrupt the state of your Delta table.\nIf you are certain that there are no operations being performed on this table, such as insert/upsert/delete/optimize, then you may turn off this check by setting:\nspark.databricks.delta.retentionDurationCheck.enabled = false\nIf you are not sure, please use a value not less than "168 hours".`);
      const vs = ref.meta.versiones || [];
      const limite = Date.now() - horas * 3600e3;
      const viejas = vs.slice(0, -1).filter((v) => new Date(v.timestamp.replace(' ', 'T') + 'Z').getTime() < limite || horas === 0);
      if (x[3]) return R(['path'], viejas.map((v) => [`…/part-0000${v.version}-${hashHex(ref.sql + v.version, 8)}.snappy.parquet`]));
      for (const v of viejas) { v.filas = null; borrarFisica(`${ref.sql}__v${v.version}`); }
      guardar();
      return R(['path'], [[`abfss://…/tables/${hashHex(ref.sql, 32)}`]], { msg: `Se borraron los archivos de ${viejas.length} versiones viejas (el historial queda, pero ya no se puede viajar a esas versiones).` });
    }
    if ((x = m(/^RESTORE\s+(?:TABLE\s+)?(\S+)\s+TO\s+(VERSION|TIMESTAMP)\s+AS\s+OF\s+(\S+)$/i))) {
      const ref = resolver(x[1]); escribible(ref);
      const nomV = x[2].toUpperCase() === 'VERSION' ? versionTabla(ref, Number(x[3])) : versionPorFecha(ref, x[3].replace(/'/g, ''));
      if (nomV === ref.sql) return R(['table_size_after_restore', 'num_of_files_after_restore', 'num_removed_files', 'num_restored_files', 'removed_files_size', 'restored_files_size'], [[0, 1, 0, 0, 0, 0]]);
      const nv = Number(nomV.split('__v').pop());
      const ver = ref.meta.versiones.find((v) => v.version === nv);
      const antes = db.exec(`SELECT COUNT(*) FROM ${q(ref.sql)}`)[0].values[0][0];
      crearFisica(ref.sql, ver.cols || ref.meta.cols, db.exec(`SELECT * FROM ${q(nomV)}`)[0] ? db.exec(`SELECT * FROM ${q(nomV)}`)[0].values : []);
      ref.meta.cols = (ver.cols || ref.meta.cols).slice();
      const n = db.exec(`SELECT COUNT(*) FROM ${q(ref.sql)}`)[0].values[0][0];
      registrarVersion(ref, 'RESTORE', { version: nv, timestamp: null }, { numRestoredFiles: '1', numRemovedFiles: '1', tableSizeAfterRestore: String(n * 48) });
      return R(['table_size_after_restore', 'num_of_files_after_restore', 'num_removed_files', 'num_restored_files', 'removed_files_size', 'restored_files_size'], [[n * 48, 1, 1, 1, antes * 48, n * 48]]);
    }
    if (/^ANALYZE\s+TABLE\b/i.test(txt)) return OK();
    if (/^(CACHE|UNCACHE|REFRESH|MSCK)\b/i.test(txt)) return OK();
    // ---- COPY INTO
    if (/^COPY\s+INTO\b/i.test(txt)) return copyInto(st);
    // ---- MERGE INTO
    if (/^MERGE\s+INTO\b/i.test(txt)) return merge(st);
    // ---- INSERT / UPDATE / DELETE
    if (/^INSERT\s+(INTO|OVERWRITE)\b/i.test(txt)) return insertar(st);
    if (/^UPDATE\b/i.test(txt)) return actualizar(st);
    if (/^DELETE\s+FROM\b/i.test(txt)) return borrar(st);
    // ---- EXPLAIN
    if (/^EXPLAIN\b/i.test(txt)) {
      let i0 = sig(T, sig(T, 0) + 1); if (W(T[i0], 'EXTENDED', 'FORMATTED', 'CODEGEN', 'COST')) i0 = sig(T, i0 + 1);
      const sql = unir(reescribir(T.slice(i0)));
      const plan = db.exec(`EXPLAIN QUERY PLAN ${sql}`)[0];
      const lineas = ['== Physical Plan ==', 'AdaptiveSparkPlan isFinalPlan=false', ...(plan ? plan.values.map((r) => '+- ' + String(r[3]).replace(/SCAN (\w+)/, 'FileScan delta $1').replace(/SEARCH/, 'Filter (BroadcastHashJoin)').replace(/USE TEMP B-TREE FOR (GROUP|ORDER) BY/, (_, g) => g === 'GROUP' ? 'HashAggregate(keys=[…])' : 'Sort [… ASC NULLS FIRST]')) : [])];
      return R(['plan'], [[lineas.join('\n')]]);
    }
    // ---- consultas
    if (/^(SELECT|WITH|VALUES|TABLE|FROM|\()/i.test(txt)) {
      let T2 = T;
      // TABLE x → SELECT * FROM x ; FROM x SELECT … no soportado
      if (/^TABLE\s/i.test(txt)) T2 = tokenizar('SELECT * FROM ' + txt.replace(/^TABLE\s+/i, ''));
      const lecturas = [];
      const sql = expandirExcept(unir(reescribir(T2, { lecturas })));
      const q2 = /\bQUALIFY\b/i.test(sql) ? conQualify(sql) : null;
      const r = db.exec(q2 ? q2.sql : sql);
      const ult = r[r.length - 1];
      let cols = ult ? ult.columns : [], filas = ult ? ult.values : [];
      if (q2) { const vis = cols.map((c, i) => (/^__q\d+$/.test(c) ? -1 : i)).filter((i) => i >= 0); cols = vis.map((i) => cols[i]); filas = filas.map((f) => vis.map((i) => f[i])); }
      return R(cols, filas, { tipos: tiposDe(cols, filas), lecturas: lecturas.filter((l) => !l.sistema).map((l) => `${l.c}.${l.s}.${l.t}`) });
    }
    err('PARSE_SYNTAX_ERROR', `Syntax error at or near '${txt.split(/\s+/)[0]}'. SQLSTATE: 42601`);
  }

  // QUALIFY (filtra por el resultado de una función de ventana, como WHERE filtra filas): SQLite no lo
  // tiene, así que la consulta se envuelve: adentro se calculan las ventanas del QUALIFY como columnas
  // ocultas (__q0, __q1…) y afuera se filtra con la condición y se aplica el LIMIT.
  function conQualify(sql) {
    const nivel0 = (re) => { const out = []; let d = 0, comilla = null; for (let i = 0; i < sql.length; i++) { const ch = sql[i]; if (comilla) { if (ch === comilla) comilla = null; continue; } if (ch === "'" || ch === '"' || ch === '`') { comilla = ch; continue; } if (ch === '(') d++; else if (ch === ')') d--; else if (d === 0) { re.lastIndex = i; const m = re.exec(sql); if (m && m.index === i && (i === 0 || /\W/.test(sql[i - 1]))) out.push({ i, n: m[0].length, k: m[0].toUpperCase().replace(/\s+/g, ' ') }); } } return out; };
    const marcas = nivel0(/QUALIFY\b|ORDER\s+BY\b|LIMIT\b/iy);
    const qm = marcas.find((m) => m.k === 'QUALIFY');
    if (!qm) return null; // la palabra estaba dentro de un texto o de una subconsulta
    const despues = marcas.filter((m) => m.i > qm.i);
    const fin = despues.length ? despues[0].i : sql.length;
    let cond = sql.slice(qm.i + qm.n, fin).trim();
    const lim = despues.find((m) => m.k === 'LIMIT');
    const orden = despues.find((m) => m.k === 'ORDER BY');
    const cabeza = sql.slice(0, qm.i).trimEnd();
    const ordenTxt = orden ? sql.slice(orden.i, lim ? lim.i : sql.length).trim() : '';
    const limTxt = lim ? sql.slice(lim.i).trim() : '';
    // ventanas dentro de la condición: f(...) OVER (...) | f(...) OVER nombre
    const ventanas = []; let salida = '', k = 0;
    const re = /\b([A-Za-z_]\w*)\s*\(/g; let m;
    while ((m = re.exec(cond))) {
      let d = 1, j = m.index + m[0].length; while (j < cond.length && d) { if (cond[j] === '(') d++; else if (cond[j] === ')') d--; j++; }
      const ov = /^\s*OVER\s*(\(|[A-Za-z_]\w*)/i.exec(cond.slice(j)); if (!ov) continue;
      let e = j + ov[0].length;
      if (ov[1] === '(') { let d2 = 1; while (e < cond.length && d2) { if (cond[e] === '(') d2++; else if (cond[e] === ')') d2--; e++; } }
      salida += cond.slice(k, m.index) + `__q${ventanas.length}`; ventanas.push(cond.slice(m.index, e)); k = e; re.lastIndex = e;
    }
    cond = salida + cond.slice(k);
    if (!ventanas.length && !/\w/.test(cond)) err('PARSE_SYNTAX_ERROR', "Syntax error at or near 'QUALIFY': falta la condición. SQLSTATE: 42601");
    // las columnas ocultas se agregan a la lista del SELECT principal (antes de su FROM de nivel 0)
    const fromM = nivel0(/FROM\b/iy).filter((x) => x.i < qm.i).pop();
    const sel = nivel0(/SELECT\b/iy).filter((x) => !fromM || x.i < fromM.i).pop();
    if (!fromM || !sel) err('UNSUPPORTED_FEATURE', 'QUALIFY necesita un SELECT … FROM … en la consulta principal.');
    const extra = ventanas.map((w, i) => `, ${w} AS __q${i}`).join('');
    const interna = cabeza.slice(0, fromM.i).trimEnd() + extra + ' ' + cabeza.slice(fromM.i) + (ordenTxt ? ' ' + ordenTxt : '');
    return { sql: `SELECT * FROM (${interna}) AS __qualify WHERE ${cond}${limTxt ? ' ' + limTxt : ''}` };
  }
  const patron = (like) => new RegExp('^' + like.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/%/g, '.*').replace(/_/g, '.') + '$', 'i');
  function nombreObj(tipo, nombre) {
    const U = uc(); const p = partes(nombre).map((y) => y.toLowerCase()); const T = String(tipo).toUpperCase();
    if (T === 'CATALOG') { if (!U.catalogs[p[0]]) err('NO_SUCH_CATALOG_EXCEPTION', `Catalog '${p[0]}' was not found.`); return p[0]; }
    if (T === 'SCHEMA' || T === 'DATABASE') { const c = p.length === 2 ? p[0] : U.cur.catalog, s = p[p.length - 1]; if (!U.catalogs[c] || !U.catalogs[c].schemas[s]) err('SCHEMA_NOT_FOUND', `The schema ${fq(c, s)} cannot be found.`); return `${c}.${s}`; }
    if (T === 'VOLUME') { const full = p.length === 3 ? p : p.length === 2 ? [U.cur.catalog, ...p] : [U.cur.catalog, U.cur.schema, p[0]]; return full.join('.'); }
    const ref = resolver(p); return `${ref.c}.${ref.s}.${ref.t}`;
  }
  function borrarFisica(nom, vista = false) {
    const r = db.exec(`SELECT name, type FROM sqlite_master WHERE name = ${lit(nom)} OR name LIKE ${lit(nom + '__v%')}`);
    for (const [n, t] of r.length ? r[0].values : []) db.run(`DROP ${t === 'view' || vista ? 'VIEW' : 'TABLE'} IF EXISTS ${q(n)}`);
  }
  let enPipeline = false;
  function escribible(ref) {
    // las vistas materializadas solo cambian al actualizar el pipeline; las tablas de streaming admiten
    // INSERT / UPDATE / DELETE / MERGE (por ejemplo, para borrar datos personales), como en Unity Catalog
    if (ref.meta && ref.meta.pipeline && !enPipeline && ref.meta.tipo === 'MATERIALIZED_VIEW') err('MATERIALIZED_VIEW_OPERATION_NOT_ALLOWED', `${ref.c}.${ref.s}.${ref.t} es una vista materializada que administra el pipeline "${ref.meta.pipelineNombre || ref.meta.pipeline}". Su contenido sale de su consulta: se actualiza ejecutando el pipeline (Start o Full refresh), no con DML.`);
    if (ref.solo) err('PERMISSION_DENIED', `User does not have MODIFY on Table '${ref.c}.${ref.s}.${ref.t}'. El catálogo ${ref.c} es de solo lectura: crea tus tablas en main (o en tu propio catálogo).`);
    if (ref.temp) err('UNSUPPORTED_FEATURE', 'No se puede escribir en una vista temporal.');
    if (ref.meta && ref.meta.tipo === 'VIEW') err('EXPECT_TABLE_NOT_VIEW.NO_ALTERNATIVE', `'${ref.c}.${ref.s}.${ref.t}' is a view. Las vistas no se modifican: escribe en la tabla de origen.`);
  }
  function ddlDe(ref) {
    const cols = columnas(ref); const M = ref.meta || {};
    return `CREATE TABLE ${ref.c}.${ref.s}.${ref.t} (\n${cols.map((c) => `  ${c.n} ${c.t.toUpperCase()}${c.notNull ? ' NOT NULL' : ''}${c.comment ? ` COMMENT '${c.comment}'` : ''}`).join(',\n')}${Object.entries(M.checks || {}).map(([n, e]) => `,\n  CONSTRAINT ${n} CHECK (${e})`).join('')})\nUSING delta${(M.particion || []).length ? `\nPARTITIONED BY (${M.particion.join(', ')})` : ''}${(M.cluster || []).length ? `\nCLUSTER BY (${M.cluster.join(', ')})` : ''}${M.comment ? `\nCOMMENT '${M.comment}'` : ''}\nTBLPROPERTIES (\n${Object.entries(M.props || {}).map(([k, v]) => `  '${k}' = '${v}'`).join(',\n')})\n`;
  }

  function crearTabla(st) {
    const txt = st.texto;
    const reemplazar = /^(CREATE\s+OR\s+REPLACE|REPLACE)\b/i.test(txt);
    const siNo = /\bIF\s+NOT\s+EXISTS\b/i.test(txt);
    const T = st.T;
    // posición del nombre: después de TABLE [IF NOT EXISTS]
    let i = T.findIndex((tk) => W(tk, 'TABLE'));
    i = sig(T, i + 1);
    if (W(T[i], 'IF')) i = sig(T, sig(T, sig(T, i + 1) + 1) + 1);
    const ids = [T[i].v]; let j = i; while (T[j + 1] && T[j + 1].v === '.' && esId(T[j + 2])) { ids.push(T[j + 2].v); j += 2; }
    const ref = resolver(ids, { crear: true, permitirVista: false });
    const existe = !!ref.meta;
    if (existe && !reemplazar) { if (siNo) return { cols: [], filas: [], msg: 'OK' }; err('TABLE_OR_VIEW_ALREADY_EXISTS', `Cannot create table or view ${fq(ref.c, ref.s, ref.t)} because it already exists.\nChoose a different name, drop or replace the existing object, add the IF NOT EXISTS clause to tolerate pre-existing objects, or add the OR REFRESH clause to refresh the existing streaming table.`); }
    const resto = T.slice(j + 1);
    const restoTxt = unirOriginal(resto);
    const U = uc();
    const prevVersiones = existe ? (ref.meta.versiones || []) : [];
    const opciones = (txt2) => ({
      comment: (/\bCOMMENT\s+'((?:[^'\\]|\\.)*)'/i.exec(txt2) || [])[1] || null,
      particion: ((/\bPARTITIONED\s+BY\s*\(([^)]*)\)/i.exec(txt2) || [])[1] || '').split(',').map((y) => y.trim()).filter(Boolean),
      cluster: ((/\bCLUSTER\s+BY\s*\(([^)]*)\)/i.exec(txt2) || [])[1] || '').split(',').map((y) => y.trim()).filter(Boolean),
      props: { 'delta.minReaderVersion': '1', 'delta.minWriterVersion': '2', ...Object.fromEntries([...((/\bTBLPROPERTIES\s*\(([^)]*)\)/i.exec(txt2) || [])[1] || '').matchAll(/'([^']+)'\s*=\s*'([^']*)'/g)].map((mm) => [mm[1], mm[2]])) },
    });
    // CLONE
    const cl = /^\s*(SHALLOW|DEEP)?\s*CLONE\s+(\S+)(?:\s+VERSION\s+AS\s+OF\s+(\d+))?/i.exec(restoTxt);
    if (cl) {
      const src = resolver(cl[2]); const nomSrc = cl[3] ? versionTabla(src, Number(cl[3])) : src.sql;
      return transaccion(() => {
        const cols = columnas(src).map((c) => ({ ...c }));
        borrarFisica(ref.sql);
        crearFisica(ref.sql, cols, (db.exec(`SELECT * FROM ${q(nomSrc)}`)[0] || { values: [] }).values);
        crearMetaTabla(ref, cols, { ...(src.meta ? { comment: src.meta.comment, checks: { ...(src.meta.checks || {}) } } : {}), versiones: [] });
        ref.meta = U.catalogs[ref.c].schemas[ref.s].tables[ref.t];
        const n = db.exec(`SELECT COUNT(*) FROM ${q(ref.sql)}`)[0].values[0][0];
        registrarVersion(ref, 'CLONE', { source: `${src.c}.${src.s}.${src.t}`, sourceVersion: cl[3] || 'latest', isShallow: (cl[1] || 'DEEP').toUpperCase() === 'SHALLOW' }, { numCopiedFiles: String(Math.max(1, Math.ceil(n / 5000))), sourceNumOfFiles: '1', copiedFilesSize: String(n * 48) });
        linaje(`${src.c}.${src.s}.${src.t}`, `${ref.c}.${ref.s}.${ref.t}`);
        return { cols: ['source_table_size', 'source_num_of_files', 'num_removed_files', 'num_copied_files', 'removed_files_size', 'copied_files_size'], filas: [[n * 48, 1, 0, 1, 0, n * 48]] };
      });
    }
    // CTAS: … AS SELECT …
    const asIdx = (() => { let d = 0; for (let k = 0; k < resto.length; k++) { const tk = resto[k]; if (tk.v === '(') d++; else if (tk.v === ')') d--; else if (d === 0 && W(tk, 'AS')) { const n2 = resto[sig(resto, k + 1)]; if (W(n2, 'SELECT', 'WITH', 'VALUES', 'FROM', 'TABLE') || (n2 && n2.v === '(')) return k; } } return -1; })();
    let colsDef = null, checks = {};
    const parent = resto[sig(resto, 0)];
    if (parent && parent.v === '(' && asIdx !== sig(resto, 0)) { const p = parsearColumnas(resto); colsDef = p.cols; checks = p.checks; }
    const op = opciones(asIdx >= 0 ? unirOriginal(resto.slice(0, asIdx)) : restoTxt);
    if (/\bUSING\s+(?!DELTA\b)(\w+)/i.test(asIdx >= 0 ? unirOriginal(resto.slice(0, asIdx)) : restoTxt)) {
      const fmt = /\bUSING\s+(\w+)/i.exec(restoTxt)[1].toLowerCase();
      if (!['delta', 'csv', 'json', 'parquet'].includes(fmt)) err('UNSUPPORTED_DATASOURCE', `Formato ${fmt} no soportado.`);
    }
    return transaccion(() => {
      if (asIdx >= 0) {
        const cuerpo = resto.slice(asIdx + 1);
        const lecturas = [];
        const sql = expandirExcept(unir(reescribir(cuerpo, { lecturas })));
        const tmp = `__ctas_${sesion.n++}`;
        db.run(`CREATE TEMP TABLE ${q(tmp)} AS ${sql}`);
        let cols = colsDeResultado(tmp);
        if (colsDef) { if (colsDef.length !== cols.length) err('DELTA_SCHEMA_MISMATCH', `Las columnas declaradas (${colsDef.length}) no coinciden con las de la consulta (${cols.length}).`); cols = colsDef; }
        for (const c of cols) if (/^[^\w]|[ ,;{}()\n\t=]/.test(c.n)) err('DELTA_INVALID_CHARACTERS_IN_COLUMN_NAMES', `Found invalid character(s) among ' ,;{}()\\n\\t=' in the column names of your schema. Invalid column names: ${c.n}. Ponle un alias a la expresión: … AS nombre.`);
        borrarFisica(ref.sql);
        crearFisica(ref.sql, cols, (db.exec(`SELECT * FROM ${q(tmp)}`)[0] || { values: [] }).values);
        db.run(`DROP TABLE ${q(tmp)}`);
        crearMetaTabla(ref, cols, { ...op, checks, versiones: prevVersiones });
        ref.meta = U.catalogs[ref.c].schemas[ref.s].tables[ref.t];
        validarEscritura(ref);
        const n = db.exec(`SELECT COUNT(*) FROM ${q(ref.sql)}`)[0].values[0][0];
        registrarVersion(ref, existe ? 'CREATE OR REPLACE TABLE AS SELECT' : 'CREATE TABLE AS SELECT', { partitionBy: JSON.stringify(op.particion), clusterBy: JSON.stringify(op.cluster), description: op.comment, isManaged: 'true' }, { numFiles: '1', numOutputRows: String(n), numOutputBytes: String(n * 48) });
        for (const l of lecturas) if (!l.sistema) linaje(`${l.c}.${l.s}.${l.t}`, `${ref.c}.${ref.s}.${ref.t}`);
        return { cols: ['num_affected_rows', 'num_inserted_rows'], filas: [[n, n]] };
      }
      const cols = colsDef || [];
      borrarFisica(ref.sql);
      crearFisica(ref.sql, cols, []);
      crearMetaTabla(ref, cols, { ...op, checks, versiones: prevVersiones });
      ref.meta = U.catalogs[ref.c].schemas[ref.s].tables[ref.t];
      registrarVersion(ref, existe ? 'CREATE OR REPLACE TABLE' : 'CREATE TABLE', { partitionBy: JSON.stringify(op.particion), clusterBy: JSON.stringify(op.cluster), description: op.comment, isManaged: 'true', properties: JSON.stringify(op.props) }, {});
      return { cols: [], filas: [], msg: 'OK' };
    });
  }
  function linaje(de, a) { const U = uc(); U.linaje = U.linaje || []; if (!U.linaje.some((l) => l.de === de && l.a === a)) U.linaje.push({ de, a, t: ahora() }); }

  function crearVista(st) {
    const txt = st.texto; const T = st.T;
    const temp = /\bTEMP(ORARY)?\s+VIEW\b/i.test(txt);
    const reemplazar = /\bOR\s+REPLACE\b/i.test(txt);
    let i = T.findIndex((tk) => W(tk, 'VIEW')); i = sig(T, i + 1);
    if (W(T[i], 'IF')) i = sig(T, sig(T, sig(T, i + 1) + 1) + 1);
    const ids = [T[i].v]; let j = i; while (T[j + 1] && T[j + 1].v === '.' && esId(T[j + 2])) { ids.push(T[j + 2].v); j += 2; }
    let k = j + 1; let d = 0; for (; k < T.length; k++) { if (T[k].v === '(') d++; else if (T[k].v === ')') d--; else if (d === 0 && W(T[k], 'AS')) break; }
    if (k >= T.length) err('PARSE_SYNTAX_ERROR', 'Syntax error: CREATE VIEW nombre AS SELECT …');
    const lecturas = [];
    const sql = expandirExcept(unir(reescribir(T.slice(k + 1), { lecturas })));
    if (temp) {
      const nombre = ids[ids.length - 1].toLowerCase();
      if (sesion.temp[nombre] && !reemplazar) err('TEMP_TABLE_OR_VIEW_ALREADY_EXISTS', `Cannot create the temporary view \`${nombre}\` because it already exists.`);
      const nom = `__tmp_${nombre}`;
      db.run(`DROP VIEW IF EXISTS ${q(nom)}`); db.run(`CREATE TEMP VIEW ${q(nom)} AS ${sql}`); sesion.temp[nombre] = nom;
      return { cols: [], filas: [], msg: 'OK' };
    }
    const ref = resolver(ids, { crear: true, permitirVista: false });
    if (ref.meta && !reemplazar) { if (/\bIF\s+NOT\s+EXISTS\b/i.test(txt)) return { cols: [], filas: [], msg: 'OK' }; err('TABLE_OR_VIEW_ALREADY_EXISTS', `Cannot create table or view ${fq(ref.c, ref.s, ref.t)} because it already exists.`); }
    if (ref.meta && ref.meta.tipo !== 'VIEW') err('EXPECT_VIEW_NOT_TABLE.NO_ALTERNATIVE', `${fq(ref.c, ref.s, ref.t)} is a table. Bórrala antes de crear una vista con ese nombre.`);
    db.run(`DROP VIEW IF EXISTS ${q(ref.sql)}`); db.run(`CREATE VIEW ${q(ref.sql)} AS ${sql}`);
    const r = db.exec(`SELECT * FROM ${q(ref.sql)} LIMIT 200`);
    const cn = r.length ? r[0].columns : (db.exec(`PRAGMA table_info(${q(ref.sql)})`)[0] || { values: [] }).values.map((y) => y[1]);
    const tipos = tiposDe(cn, r.length ? r[0].values : []);
    const S = uc().catalogs[ref.c].schemas[ref.s];
    S.tables[ref.t] = { tipo: /\bMATERIALIZED\b/i.test(txt) ? 'MATERIALIZED_VIEW' : 'VIEW', cols: cn.map((n, x) => ({ n, t: tipos[x] })), sqlite: sql, definicion: unirOriginal(T.slice(k + 1)).trim(), creado: ahora(), owner: USUARIO, comment: (/\bCOMMENT\s+'([^']*)'/i.exec(unirOriginal(T.slice(0, k))) || [])[1] || null };
    if (S.tables[ref.t].tipo === 'MATERIALIZED_VIEW') S.tables[ref.t].tipo = 'VIEW';
    for (const l of lecturas) if (!l.sistema) linaje(`${l.c}.${l.s}.${l.t}`, `${ref.c}.${ref.s}.${ref.t}`);
    uc().audit.push({ t: ahora(), servicio: 'unityCatalog', accion: 'createTable', params: { full_name_arg: `${ref.c}.${ref.s}.${ref.t}`, table_type: 'VIEW' } });
    guardar();
    return { cols: [], filas: [], msg: 'OK' };
  }

  function alterarTabla(st) {
    const txt = st.texto.replace(/\s+/g, ' ').trim(); let x;
    const nombre = /^ALTER TABLE (\S+)/i.exec(txt)[1];
    const ref = resolver(nombre); escribible(ref);
    const M = ref.meta; const U = uc();
    if ((x = /^ALTER TABLE \S+ RENAME TO (\S+)$/i.exec(txt))) {
      const destino = resolver(x[1], { crear: true, permitirVista: false });
      if (destino.meta) err('TABLE_OR_VIEW_ALREADY_EXISTS', `Cannot rename ${fq(ref.c, ref.s, ref.t)} to ${fq(destino.c, destino.s, destino.t)}: ya existe.`);
      if (destino.c !== ref.c) err('UNSUPPORTED_FEATURE', 'RENAME TO no puede mover una tabla a otro catálogo.');
      const S0 = U.catalogs[ref.c].schemas[ref.s];
      delete S0.tables[ref.t]; U.catalogs[destino.c].schemas[destino.s].tables[destino.t] = M;
      borrarFisica(ref.sql); materializar(destino.c, destino.s, destino.t, M); guardar();
      return { cols: [], filas: [], msg: 'OK' };
    }
    if ((x = /^ALTER TABLE \S+ ADD COLUMNS? \(?(.+?)\)?$/i.exec(txt))) {
      const nuevas = parsearColumnas(tokenizar('(' + x[1] + ')')).cols;
      return transaccion(() => {
        for (const c of nuevas) { if (M.cols.some((y) => y.n.toLowerCase() === c.n.toLowerCase())) err('FIELDS_ALREADY_EXISTS', `Cannot add column, because \`${c.n}\` already exists.`); db.run(`ALTER TABLE ${q(ref.sql)} ADD COLUMN ${q(c.n)} ${tipoSqlite(c.t)}`); M.cols.push(c); }
        registrarVersion(ref, 'ADD COLUMNS', { columns: JSON.stringify(nuevas.map((c) => ({ column: { name: c.n, type: c.t, nullable: !c.notNull } }))) }, {});
        return { cols: [], filas: [], msg: 'OK' };
      });
    }
    if ((x = /^ALTER TABLE \S+ (?:ALTER|CHANGE) (?:COLUMN )?(\S+) COMMENT '([^']*)'$/i.exec(txt))) { const c = M.cols.find((y) => y.n.toLowerCase() === x[1].replace(/`/g, '').toLowerCase()); if (!c) err('UNRESOLVED_COLUMN.WITHOUT_SUGGESTION', `A column with name \`${x[1]}\` cannot be resolved.`); c.comment = x[2]; registrarVersion(ref, 'CHANGE COLUMN', { column: c.n }, {}); return { cols: [], filas: [], msg: 'OK' }; }
    if ((x = /^ALTER TABLE \S+ ALTER COLUMN (\S+) (SET|DROP) NOT NULL$/i.exec(txt))) {
      const c = M.cols.find((y) => y.n.toLowerCase() === x[1].replace(/`/g, '').toLowerCase()); if (!c) err('UNRESOLVED_COLUMN.WITHOUT_SUGGESTION', `A column with name \`${x[1]}\` cannot be resolved.`);
      if (x[2].toUpperCase() === 'SET') { const n = db.exec(`SELECT COUNT(*) FROM ${q(ref.sql)} WHERE ${q(c.n)} IS NULL`)[0].values[0][0]; if (n) err('DELTA_NOT_NULL_CONSTRAINT_VIOLATED', `Cannot add NOT NULL constraint to column ${c.n}: ${n} filas tienen NULL.`); c.notNull = true; } else c.notNull = false;
      registrarVersion(ref, 'CHANGE COLUMN', { column: c.n }, {}); return { cols: [], filas: [], msg: 'OK' };
    }
    if ((x = /^ALTER TABLE \S+ ADD CONSTRAINT (\w+) CHECK \((.+)\)$/i.exec(txt))) {
      M.checks = M.checks || {};
      if (M.checks[x[1]]) err('DELTA_CONSTRAINT_ALREADY_EXISTS', `Constraint '${x[1]}' already exists. Please delete the old constraint first.`);
      const malas = db.exec(`SELECT COUNT(*) FROM ${q(ref.sql)} WHERE NOT COALESCE((${unir(traducirExpr(tokenizar(x[2])))}), 1)`)[0].values[0][0];
      if (malas) err('DELTA_NEW_CHECK_CONSTRAINT_VIOLATION', `${malas} rows in ${ref.c}.${ref.s}.${ref.t} violate the new CHECK constraint (${x[2]})`);
      M.checks[x[1]] = x[2]; M.props[`delta.constraints.${x[1].toLowerCase()}`] = x[2];
      registrarVersion(ref, 'ADD CONSTRAINT', { name: x[1], expr: x[2] }, {}); return { cols: [], filas: [], msg: 'OK' };
    }
    if ((x = /^ALTER TABLE \S+ DROP CONSTRAINT (IF EXISTS )?(\w+)$/i.exec(txt))) { if (!M.checks || !M.checks[x[2]]) { if (x[1]) return { cols: [], filas: [], msg: 'OK' }; err('DELTA_CONSTRAINT_DOES_NOT_EXIST', `Cannot drop nonexistent constraint ${x[2]} from table ${ref.c}.${ref.s}.${ref.t}.`); } delete M.checks[x[2]]; delete M.props[`delta.constraints.${x[2].toLowerCase()}`]; registrarVersion(ref, 'DROP CONSTRAINT', { name: x[2] }, {}); return { cols: [], filas: [], msg: 'OK' }; }
    if ((x = /^ALTER TABLE \S+ SET TBLPROPERTIES \((.+)\)$/i.exec(txt))) { for (const mm of x[1].matchAll(/'([^']+)'\s*=\s*'([^']*)'/g)) M.props[mm[1]] = mm[2]; registrarVersion(ref, 'SET TBLPROPERTIES', { properties: x[1] }, {}); return { cols: [], filas: [], msg: 'OK' }; }
    if ((x = /^ALTER TABLE \S+ CLUSTER BY \(([^)]*)\)$/i.exec(txt))) { M.cluster = x[1].split(',').map((y) => y.trim()).filter(Boolean); registrarVersion(ref, 'CLUSTER BY', { newClusteringColumns: x[1] }, {}); return { cols: [], filas: [], msg: 'OK' }; }
    if ((x = /^ALTER TABLE \S+ (?:SET )?OWNER TO (\S+)$/i.exec(txt))) { M.owner = x[1].replace(/`/g, ''); guardar(); return { cols: [], filas: [], msg: 'OK' }; }
    if ((x = /^ALTER TABLE \S+ RENAME COLUMN (\S+) TO (\S+)$/i.exec(txt))) {
      if (M.props['delta.columnMapping.mode'] !== 'name') err('DELTA_UNSUPPORTED_RENAME_COLUMN', "Column rename is not supported for your Delta table. Please enable Column Mapping for your Delta table using:\nALTER TABLE <tabla> SET TBLPROPERTIES ('delta.columnMapping.mode' = 'name', 'delta.minReaderVersion' = '2', 'delta.minWriterVersion' = '5')");
      const c = M.cols.find((y) => y.n.toLowerCase() === x[1].replace(/`/g, '').toLowerCase()); if (!c) err('UNRESOLVED_COLUMN.WITHOUT_SUGGESTION', `A column with name \`${x[1]}\` cannot be resolved.`);
      db.run(`ALTER TABLE ${q(ref.sql)} RENAME COLUMN ${q(c.n)} TO ${q(x[2].replace(/`/g, ''))}`); c.n = x[2].replace(/`/g, ''); registrarVersion(ref, 'RENAME COLUMN', { oldColumnPath: x[1], newColumnPath: x[2] }, {}); return { cols: [], filas: [], msg: 'OK' };
    }
    if ((x = /^ALTER TABLE \S+ DROP COLUMNS? \(?([^)]+)\)?$/i.exec(txt))) {
      if (M.props['delta.columnMapping.mode'] !== 'name') err('DELTA_UNSUPPORTED_DROP_COLUMN', "DROP COLUMN is not supported for your Delta table. Please enable Column Mapping for your Delta table using:\nALTER TABLE <tabla> SET TBLPROPERTIES ('delta.columnMapping.mode' = 'name', 'delta.minReaderVersion' = '2', 'delta.minWriterVersion' = '5')");
      for (const n of x[1].split(',').map((y) => y.trim().replace(/`/g, ''))) { const i = M.cols.findIndex((y) => y.n.toLowerCase() === n.toLowerCase()); if (i < 0) err('UNRESOLVED_COLUMN.WITHOUT_SUGGESTION', `A column with name \`${n}\` cannot be resolved.`); db.run(`ALTER TABLE ${q(ref.sql)} DROP COLUMN ${q(M.cols[i].n)}`); M.cols.splice(i, 1); }
      registrarVersion(ref, 'DROP COLUMNS', { columns: x[1] }, {}); return { cols: [], filas: [], msg: 'OK' };
    }
    err('PARSE_SYNTAX_ERROR', 'ALTER TABLE soportado en esta práctica: RENAME TO, ADD COLUMNS, ALTER COLUMN … COMMENT / SET NOT NULL, ADD/DROP CONSTRAINT … CHECK, SET TBLPROPERTIES, CLUSTER BY, RENAME COLUMN, DROP COLUMN, OWNER TO.');
  }

  // INSERT INTO|OVERWRITE [TABLE] t [(cols)] VALUES … | SELECT …
  function insertar(st) {
    const T = st.T; const txt = st.texto;
    const sobre = /^INSERT\s+OVERWRITE/i.test(txt);
    let i = sig(T, sig(T, sig(T, 0) + 1) + 1); if (W(T[i], 'TABLE')) i = sig(T, i + 1);
    const ids = [T[i].v]; let j = i; while (T[j + 1] && T[j + 1].v === '.' && esId(T[j + 2])) { ids.push(T[j + 2].v); j += 2; }
    const ref = resolver(ids); escribible(ref);
    let k = sig(T, j + 1); let cols = null;
    if (T[k] && T[k].v === '(' && !W(T[sig(T, k + 1)], 'SELECT', 'WITH')) { const a = argsFuncion(T, k); cols = a.args.map((x) => unirOriginal(x).trim().replace(/`/g, '')); k = sig(T, a.fin + 1); }
    if (W(T[k], 'BY') && W(T[sig(T, k + 1)], 'NAME')) k = sig(T, sig(T, k + 1) + 1);
    const M = ref.meta;
    const destino = cols || M.cols.map((c) => c.n);
    for (const c of destino) if (!M.cols.some((y) => y.n.toLowerCase() === c.toLowerCase())) err('UNRESOLVED_COLUMN.WITH_SUGGESTION', `A column with name \`${c}\` cannot be resolved. Did you mean one of the following? [${M.cols.map((y) => '`' + y.n + '`').join(', ')}].`);
    const lecturas = [];
    const cuerpo = expandirExcept(unir(reescribir(T.slice(k), { lecturas })));
    return transaccion(() => {
      const tmp = `__ins_${sesion.n++}`;
      db.run(`CREATE TEMP TABLE ${q(tmp)} AS ${/^\s*VALUES/i.test(cuerpo) ? 'SELECT * FROM (' + cuerpo + ')' : cuerpo}`);
      const nCols = (db.exec(`PRAGMA table_info(${q(tmp)})`)[0] || { values: [] }).values.length;
      if (nCols !== destino.length) err('INSERT_COLUMN_ARITY_MISMATCH.' + (nCols > destino.length ? 'TOO_MANY_DATA_COLUMNS' : 'NOT_ENOUGH_DATA_COLUMNS'), `Cannot write to ${fq(ref.c, ref.s, ref.t)}, the reason is ${nCols > destino.length ? 'too many' : 'not enough'} data columns:\nTable columns: ${destino.map((c) => '`' + c + '`').join(', ')}.\nData columns: ${nCols} columna(s).`);
      const antes = db.exec(`SELECT COUNT(*) FROM ${q(ref.sql)}`)[0].values[0][0];
      if (sobre) db.run(`DELETE FROM ${q(ref.sql)}`);
      db.run(`INSERT INTO ${q(ref.sql)} (${destino.map(q).join(', ')}) SELECT * FROM ${q(tmp)}`);
      const n = cambios();
      db.run(`DROP TABLE ${q(tmp)}`);
      validarEscritura(ref);
      M.archivos = sobre ? 1 : (M.archivos ?? (M.versiones || []).length) + 1;
      registrarVersion(ref, 'WRITE', { mode: sobre ? 'Overwrite' : 'Append', statsOnLoad: false, partitionBy: '[]' }, { numFiles: '1', numOutputRows: String(n), numOutputBytes: String(n * 48), ...(sobre ? { numRemovedFiles: String(antes ? 1 : 0) } : {}) });
      for (const l of lecturas) if (!l.sistema) linaje(`${l.c}.${l.s}.${l.t}`, `${ref.c}.${ref.s}.${ref.t}`);
      return { cols: ['num_affected_rows', 'num_inserted_rows'], filas: [[n, n]] };
    });
  }
  function actualizar(st) {
    const T = st.T;
    let i = sig(T, 1);
    const ids = [T[i].v]; let j = i; while (T[j + 1] && T[j + 1].v === '.' && esId(T[j + 2])) { ids.push(T[j + 2].v); j += 2; }
    const ref = resolver(ids); escribible(ref);
    let k = sig(T, j + 1); let alias = null;
    if (W(T[k], 'AS')) { alias = T[sig(T, k + 1)].v; k = sig(T, sig(T, k + 1) + 1); } else if (esId(T[k]) && !W(T[k], 'SET')) { alias = T[k].v; k = sig(T, k + 1); }
    const resto = unir(reescribir(T.slice(k)));
    return transaccion(() => {
      db.run(`UPDATE ${q(ref.sql)}${alias ? ' AS ' + q(alias) : ''} ${resto}`);
      const n = cambios();
      validarEscritura(ref);
      registrarVersion(ref, 'UPDATE', { predicate: JSON.stringify([(/\bWHERE\b([\s\S]*)$/i.exec(st.texto) || [])[1] || 'true'].map((y) => y.trim())) }, { numUpdatedRows: String(n), numAddedFiles: '1', numRemovedFiles: '1', numCopiedRows: '0' });
      return { cols: ['num_affected_rows'], filas: [[n]] };
    });
  }
  function borrar(st) {
    const T = st.T;
    let i = sig(T, sig(T, 1) + 1);
    const ids = [T[i].v]; let j = i; while (T[j + 1] && T[j + 1].v === '.' && esId(T[j + 2])) { ids.push(T[j + 2].v); j += 2; }
    const ref = resolver(ids); escribible(ref);
    let k = sig(T, j + 1); let alias = null;
    if (W(T[k], 'AS')) { alias = T[sig(T, k + 1)].v; k = sig(T, sig(T, k + 1) + 1); } else if (esId(T[k]) && !W(T[k], 'WHERE')) { alias = T[k].v; k = sig(T, k + 1); }
    const resto = unir(reescribir(T.slice(k)));
    return transaccion(() => {
      db.run(`DELETE FROM ${q(ref.sql)}${alias ? ' AS ' + q(alias) : ''} ${resto}`);
      const n = cambios();
      registrarVersion(ref, 'DELETE', { predicate: JSON.stringify([(/\bWHERE\b([\s\S]*)$/i.exec(st.texto) || [])[1] || 'true'].map((y) => y.trim())) }, { numDeletedRows: String(n), numAddedFiles: '1', numRemovedFiles: '1', numCopiedRows: '0' });
      return { cols: ['num_affected_rows'], filas: [[n]] };
    });
  }

  // MERGE INTO destino [AS t] USING origen [AS s] ON cond WHEN MATCHED … WHEN NOT MATCHED [BY TARGET] … WHEN NOT MATCHED BY SOURCE …
  function merge(st) {
    const T = st.T;
    let i = sig(T, sig(T, 1) + 1);
    const ids = [T[i].v]; let j = i; while (T[j + 1] && T[j + 1].v === '.' && esId(T[j + 2])) { ids.push(T[j + 2].v); j += 2; }
    const ref = resolver(ids); escribible(ref);
    let k = sig(T, j + 1); let at = 't__dst';
    if (W(T[k], 'AS')) { at = T[sig(T, k + 1)].v; k = sig(T, sig(T, k + 1) + 1); } else if (esId(T[k]) && !W(T[k], 'USING')) { at = T[k].v; k = sig(T, k + 1); }
    if (!W(T[k], 'USING')) err('PARSE_SYNTAX_ERROR', "Syntax error at or near 'USING': MERGE INTO destino USING origen ON condición WHEN …");
    k = sig(T, k + 1);
    // origen: tabla o (subconsulta)
    let origenSql, fin;
    const lecturas = [];
    if (T[k].v === '(') { const a = argsFuncion(T, k); fin = a.fin; origenSql = '(' + unir(reescribir(a.args.flatMap((x, n2) => (n2 ? [{ t: 'p', v: ',' }, ...x] : x)), { lecturas })) + ')'; }
    else { const ids2 = [T[k].v]; let j2 = k; while (T[j2 + 1] && T[j2 + 1].v === '.' && esId(T[j2 + 2])) { ids2.push(T[j2 + 2].v); j2 += 2; } const r2 = resolver(ids2); lecturas.push(r2); origenSql = q(r2.sql); fin = j2; }
    k = sig(T, fin + 1); let as = 's__src';
    if (W(T[k], 'AS')) { as = T[sig(T, k + 1)].v; k = sig(T, sig(T, k + 1) + 1); } else if (esId(T[k]) && !W(T[k], 'ON')) { as = T[k].v; k = sig(T, k + 1); }
    if (!W(T[k], 'ON')) err('PARSE_SYNTAX_ERROR', "Syntax error at or near 'ON'.");
    // ON … hasta el primer WHEN
    const resto = T.slice(k + 1);
    const cortes = []; for (let x = 0; x < resto.length; x++) if (W(resto[x], 'WHEN')) cortes.push(x);
    if (!cortes.length) err('PARSE_SYNTAX_ERROR', 'MERGE necesita al menos una cláusula WHEN MATCHED o WHEN NOT MATCHED.');
    const cond = unir(traducirExpr(resto.slice(0, cortes[0])));
    const clausulas = cortes.map((c0, n2) => unirOriginal(resto.slice(c0, cortes[n2 + 1] ?? resto.length)).replace(/\s+/g, ' ').trim());
    const M = ref.meta; const cols = M.cols.map((c) => c.n);
    const colsOrigen = (() => { const r = db.exec(`SELECT * FROM ${origenSql} AS ${q(as)} LIMIT 0`); if (r.length) return r[0].columns; const p = db.exec(`SELECT * FROM (SELECT * FROM ${origenSql} AS ${q(as)}) LIMIT 1`); return p.length ? p[0].columns : (db.exec(`PRAGMA table_info(${origenSql.replace(/^"|"$/g, '')})`)[0] || { values: [] }).values.map((y) => y[1]); })();
    const dst = q(ref.sql), tA = q(at), sA = q(as);
    const tr = (s) => unir(traducirExpr(tokenizar(s)));
    return transaccion(() => {
      // la coincidencia se calcula una sola vez, con los datos de antes (como en Delta)
      const tmpS = `__msrc_${sesion.n++}`;
      db.run(`CREATE TEMP TABLE ${q(tmpS)} AS SELECT * FROM ${origenSql} AS ${sA}`);
      const S2 = q(tmpS);
      // varias filas del origen para la misma fila del destino → error de Delta
      const dup = db.exec(`SELECT COUNT(*) FROM ${dst} AS ${tA} JOIN ${S2} AS ${sA} ON ${cond} GROUP BY ${tA}.rowid HAVING COUNT(*) > 1 LIMIT 1`);
      if (dup.length && dup[0].values.length && clausulas.some((c) => /^WHEN MATCHED/i.test(c))) err('DELTA_MULTIPLE_SOURCE_ROW_MATCHING_TARGET_ROW_IN_MERGE', 'Cannot perform Merge as multiple source rows matched and attempted to modify the same target row in the Delta table in possibly conflicting ways. By SQL semantics of Merge, when multiple source rows match on the same target row, the result may be ambiguous as it is unclear which source row should be used to update or delete the matching target row. You can preprocess the source table to eliminate the possibility of multiple matches.');
      const tmpNo = `__mnom_${sesion.n++}`;
      db.run(`CREATE TEMP TABLE ${q(tmpNo)} AS SELECT ${sA}.* FROM ${S2} AS ${sA} WHERE NOT EXISTS (SELECT 1 FROM ${dst} AS ${tA} WHERE ${cond})`);
      const tmpMatch = `__mm_${sesion.n++}`;
      db.run(`CREATE TEMP TABLE ${q(tmpMatch)} AS SELECT ${tA}.rowid AS __rid FROM ${dst} AS ${tA} WHERE EXISTS (SELECT 1 FROM ${S2} AS ${sA} WHERE ${cond})`);
      const tmpNoSrc = `__mns_${sesion.n++}`;
      db.run(`CREATE TEMP TABLE ${q(tmpNoSrc)} AS SELECT ${tA}.rowid AS __rid FROM ${dst} AS ${tA} WHERE NOT EXISTS (SELECT 1 FROM ${S2} AS ${sA} WHERE ${cond})`);
      const hechas = new Set();
      let upd = 0, del = 0, ins = 0;
      for (const c of clausulas) {
        let x;
        if ((x = /^WHEN MATCHED(?: AND (.+?))? THEN (UPDATE SET \*|UPDATE SET (.+)|DELETE)$/i.exec(c))) {
          const extra = x[1] ? ` AND (${tr(x[1])})` : '';
          const pend = `${tA}.rowid IN (SELECT __rid FROM ${q(tmpMatch)})${hechas.size ? ` AND ${tA}.rowid NOT IN (${[...hechas].join(',') || 0})` : ''}`;
          const afectadas = db.exec(`SELECT ${tA}.rowid FROM ${dst} AS ${tA} WHERE ${pend} AND EXISTS (SELECT 1 FROM ${S2} AS ${sA} WHERE ${cond}${extra})`);
          const ids3 = afectadas.length ? afectadas[0].values.map((v) => v[0]) : [];
          if (!ids3.length) continue;
          ids3.forEach((v) => hechas.add(v));
          const enIds = `${tA}.rowid IN (${ids3.join(',')})`;
          if (/DELETE$/i.test(x[2])) { db.run(`DELETE FROM ${dst} AS ${tA} WHERE ${enIds}`); del += cambios(); continue; }
          let sets;
          if (/\*$/.test(x[2])) { for (const cc of cols) if (!colsOrigen.some((y) => y.toLowerCase() === cc.toLowerCase())) err('DELTA_MERGE_UNRESOLVED_EXPRESSION', `Cannot resolve ${as}.${cc} in UPDATE clause given columns ${colsOrigen.map((y) => as + '.' + y).join(', ')}.`); sets = cols.map((cc) => `${q(cc)} = ${sA}.${q(cc)}`).join(', '); }
          else sets = splitComas(x[3]).map((a) => { const p = /^\s*(?:\w+\.)?(`[^`]+`|\w+)\s*=\s*([\s\S]+)$/.exec(a); if (!p) err('PARSE_SYNTAX_ERROR', `UPDATE SET: ${a}`); return `${q(p[1].replace(/`/g, ''))} = ${tr(p[2])}`; }).join(', ');
          db.run(`UPDATE ${dst} AS ${tA} SET ${sets} FROM ${S2} AS ${sA} WHERE ${enIds} AND ${cond}`);
          upd += cambios();
          continue;
        }
        if ((x = /^WHEN NOT MATCHED(?: BY TARGET)?(?: AND (.+?))? THEN INSERT (\*|\((.+?)\) VALUES \((.+)\))$/i.exec(c))) {
          const extra = x[1] ? ` WHERE ${tr(x[1])}` : '';
          if (x[2] === '*') {
            for (const cc of cols) if (!colsOrigen.some((y) => y.toLowerCase() === cc.toLowerCase())) err('DELTA_MERGE_UNRESOLVED_EXPRESSION', `Cannot resolve ${as}.${cc} in INSERT clause given columns ${colsOrigen.map((y) => as + '.' + y).join(', ')}.`);
            db.run(`INSERT INTO ${dst} (${cols.map(q).join(', ')}) SELECT ${cols.map((cc) => `${sA}.${q(cc)}`).join(', ')} FROM ${q(tmpNo)} AS ${sA}${extra}`);
          } else {
            const cs = splitComas(x[3]).map((y) => y.trim().replace(/^\w+\./, '').replace(/`/g, ''));
            const vs = splitComas(x[4]).map((y) => tr(y));
            db.run(`INSERT INTO ${dst} (${cs.map(q).join(', ')}) SELECT ${vs.join(', ')} FROM ${q(tmpNo)} AS ${sA}${extra}`);
          }
          ins += cambios();
          db.run(`DELETE FROM ${q(tmpNo)}${extra ? ' AS ' + sA + extra : ''}`);
          continue;
        }
        if ((x = /^WHEN NOT MATCHED BY SOURCE(?: AND (.+?))? THEN (DELETE|UPDATE SET (.+))$/i.exec(c))) {
          const extra = x[1] ? ` AND (${tr(x[1])})` : '';
          if (/^DELETE$/i.test(x[2])) { db.run(`DELETE FROM ${dst} AS ${tA} WHERE ${tA}.rowid IN (SELECT __rid FROM ${q(tmpNoSrc)})${extra}`); del += cambios(); }
          else { const sets = splitComas(x[3]).map((a) => { const p = /^\s*(?:\w+\.)?(`[^`]+`|\w+)\s*=\s*([\s\S]+)$/.exec(a); return `${q(p[1].replace(/`/g, ''))} = ${tr(p[2])}`; }).join(', '); db.run(`UPDATE ${dst} AS ${tA} SET ${sets} WHERE ${tA}.rowid IN (SELECT __rid FROM ${q(tmpNoSrc)})${extra}`); upd += cambios(); }
          continue;
        }
        err('PARSE_SYNTAX_ERROR', `Cláusula de MERGE no reconocida: ${c}`);
      }
      for (const t0 of [tmpS, tmpNo, tmpMatch, tmpNoSrc]) db.run(`DROP TABLE IF EXISTS ${q(t0)}`);
      validarEscritura(ref);
      registrarVersion(ref, 'MERGE', { predicate: JSON.stringify([unirOriginal(resto.slice(0, cortes[0])).trim()]), matchedPredicates: JSON.stringify(clausulas.filter((c) => /^WHEN MATCHED/i.test(c)).map((c) => ({ actionType: /DELETE/i.test(c) ? 'delete' : 'update' }))), notMatchedPredicates: JSON.stringify(clausulas.filter((c) => /^WHEN NOT MATCHED(?! BY SOURCE)/i.test(c)).map(() => ({ actionType: 'insert' }))) }, { numTargetRowsUpdated: String(upd), numTargetRowsDeleted: String(del), numTargetRowsInserted: String(ins), numSourceRows: String(db.exec(`SELECT COUNT(*) FROM ${origenSql} AS ${sA}`)[0].values[0][0]), numOutputRows: String(upd + ins) });
      for (const l of lecturas) if (!l.sistema) linaje(`${l.c}.${l.s}.${l.t}`, `${ref.c}.${ref.s}.${ref.t}`);
      return { cols: ['num_affected_rows', 'num_updated_rows', 'num_deleted_rows', 'num_inserted_rows'], filas: [[upd + del + ins, upd, del, ins]] };
    });
  }
  function splitComas(s) { const out = []; let d = 0, cur = '', enQ = false; for (const c of s) { if (c === "'") enQ = !enQ; if (!enQ && c === '(') d++; if (!enQ && c === ')') d--; if (!enQ && c === ',' && d === 0) { out.push(cur); cur = ''; } else cur += c; } if (cur.trim()) out.push(cur); return out; }

  // COPY INTO t FROM 'ruta' FILEFORMAT = CSV [FORMAT_OPTIONS (...)] [COPY_OPTIONS (...)]
  function copyInto(st) {
    const txt = st.texto.replace(/\s+/g, ' ').trim();
    const x = /^COPY INTO (\S+) FROM '([^']+)' FILEFORMAT = (\w+)(?: FORMAT_OPTIONS \(([^)]*)\))?(?: COPY_OPTIONS \(([^)]*)\))?$/i.exec(txt);
    if (!x) err('PARSE_SYNTAX_ERROR', "COPY INTO tabla FROM '/Volumes/…' FILEFORMAT = CSV FORMAT_OPTIONS ('header' = 'true') COPY_OPTIONS ('mergeSchema' = 'true')");
    const ref = resolver(x[1]); escribible(ref);
    const fo = Object.fromEntries([...(x[4] || '').matchAll(/'([^']+)'\s*=\s*'([^']*)'/g)].map((m2) => [m2[1].toLowerCase(), m2[2]]));
    const co = Object.fromEntries([...(x[5] || '').matchAll(/'([^']+)'\s*=\s*'([^']*)'/g)].map((m2) => [m2[1].toLowerCase(), m2[2]]));
    const M = ref.meta; M.cargados = M.cargados || [];
    const r0 = x[2].replace(/\/$/, ''); const F = archivos();
    const todos = Object.keys(F).filter((k) => k === r0 || k.startsWith(r0 + '/'));
    if (!todos.length) err('PATH_NOT_FOUND', `Path does not exist: dbfs:${r0}`);
    const nuevos = todos.filter((k) => co.force === 'true' || !M.cargados.includes(k));
    if (!nuevos.length) return { cols: ['num_affected_rows', 'num_inserted_rows', 'num_skipped_corrupt_files'], filas: [[0, 0, 0]], msg: 'Todos los archivos ya se habían cargado (COPY INTO es idempotente: carga cada archivo una sola vez).' };
    return transaccion(() => {
      let n = 0;
      for (const k of nuevos) {
        const nom = leerArchivos([[{ t: 's', v: k }], ...Object.entries({ format: x[3].toLowerCase(), header: fo.header || 'false', sep: fo.sep || fo.delimiter || ',', inferschema: fo.inferschema || 'true' }).map(([a, b]) => tokenizar(`${a} => '${b}'`))]);
        const cs = (db.exec(`PRAGMA table_info(${q(nom)})`)[0] || { values: [] }).values.map((y) => y[1]).filter((c) => c !== '_rescued_data');
        if (!M.cols.length || co.mergeschema === 'true') {
          const filas = (db.exec(`SELECT ${cs.map(q).join(', ')} FROM ${q(nom)}`)[0] || { values: [] }).values;
          const tipos = tiposDe(cs, filas);
          for (let i = 0; i < cs.length; i++) if (!M.cols.some((c) => c.n.toLowerCase() === cs[i].toLowerCase())) { if (!M.cols.length) { db.run(`DROP TABLE IF EXISTS ${q(ref.sql)}`); db.run(`CREATE TABLE ${q(ref.sql)} (${q(cs[i])} ${tipoSqlite(tipos[i])})`); } else db.run(`ALTER TABLE ${q(ref.sql)} ADD COLUMN ${q(cs[i])} ${tipoSqlite(tipos[i])}`); M.cols.push({ n: cs[i], t: tipos[i] }); }
          const pr = (db.exec(`PRAGMA table_info(${q(ref.sql)})`)[0] || { values: [] }).values.map((y) => y[1]);
          if (pr.includes('__vacia')) { db.run(`CREATE TABLE ${q(ref.sql + '_n')} AS SELECT ${M.cols.map((c) => q(c.n)).join(', ')} FROM ${q(ref.sql)}`); db.run(`DROP TABLE ${q(ref.sql)}`); db.run(`ALTER TABLE ${q(ref.sql + '_n')} RENAME TO ${q(ref.sql)}`); }
        }
        const faltan = cs.filter((c) => !M.cols.some((y) => y.n.toLowerCase() === c.toLowerCase()));
        if (faltan.length) err('DELTA_FAILED_TO_MERGE_FIELDS', `A schema mismatch detected when writing to the Delta table. To enable schema migration, please set: COPY_OPTIONS ('mergeSchema' = 'true'). Columnas nuevas en el archivo: ${faltan.join(', ')}.`);
        db.run(`INSERT INTO ${q(ref.sql)} (${cs.map(q).join(', ')}) SELECT ${cs.map(q).join(', ')} FROM ${q(nom)}`);
        n += cambios();
        if (!M.cargados.includes(k)) M.cargados.push(k);
      }
      validarEscritura(ref);
      registrarVersion(ref, 'COPY INTO', { fileFormat: x[3].toUpperCase(), source: r0 }, { numFiles: String(nuevos.length), numOutputRows: String(n) });
      return { cols: ['num_affected_rows', 'num_inserted_rows', 'num_skipped_corrupt_files'], filas: [[n, n, 0]] };
    });
  }

  // SELECT * EXCEPT (a, b) FROM …  → la lista de columnas sin a y b (también t.* EXCEPT)
  function expandirExcept(sql) {
    let guard = 0;
    while (/\*\s+EXCEPT\s*\(/i.test(sql) && guard++ < 10) {
      const m = /SELECT\s+(DISTINCT\s+)?((?:"[^"]+"|\w+)\.)?\*\s+EXCEPT\s*\(([^)]*)\)/i.exec(sql);
      if (!m) break;
      const quitar = m[3].split(',').map((x) => x.trim().replace(/^"|"$/g, '').replace(/`/g, '').toLowerCase()).filter(Boolean);
      const resto = sql.slice(m.index + m[0].length);
      const prueba = `SELECT ${m[2] || ''}* ${resto}`.replace(/;\s*$/, '');
      let cols;
      try { const r = db.exec(`SELECT * FROM (${prueba}) LIMIT 0`); cols = r.length ? r[0].columns : null; } catch (e) { cols = null; }
      if (!cols) { const st = db.prepare(`SELECT * FROM (${prueba}) LIMIT 0`); cols = st.getColumnNames(); st.free(); }
      for (const qx of quitar) if (!cols.some((c) => c.toLowerCase() === qx)) err('UNRESOLVED_COLUMN.WITH_SUGGESTION', `A column with name \`${qx}\` cannot be resolved in EXCEPT. Columnas disponibles: ${cols.join(', ')}.`);
      const lista = cols.filter((c) => !quitar.includes(c.toLowerCase())).map((c) => (m[2] || '') + q(c)).join(', ');
      sql = sql.slice(0, m.index) + `SELECT ${m[1] || ''}${lista}` + resto;
    }
    return sql;
  }

  // ------------------------------------------------------------------ errores de SQLite → errores de Databricks
  function traducirError(e, texto) {
    if (pendiente && !(e instanceof ErrorDbx)) e = pendiente;
    pendiente = null;
    const m = String(e && e.message || e);
    if (e instanceof ErrorDbx || /^\[[A-Z_.]+\]/.test(m)) return m;
    let x;
    if ((x = /no such column: (.+)$/.exec(m))) return `[UNRESOLVED_COLUMN.WITHOUT_SUGGESTION] A column, variable, or function parameter with name \`${x[1].replace(/^"|"$/g, '')}\` cannot be resolved. SQLSTATE: 42703`;
    if ((x = /no such function: (\w+)/.exec(m))) return `[UNRESOLVED_ROUTINE] Cannot resolve routine \`${x[1]}\` on search path [\`system\`.\`builtin\`, \`system\`.\`session\`, \`${uc().cur.catalog}\`.\`${uc().cur.schema}\`]. Verify the spelling of \`${x[1]}\`, check that the routine exists, and confirm you have \`USE\` privilege on the catalog and schema, and EXECUTE on the routine. SQLSTATE: 42883`;
    if ((x = /no such table: (.+)$/.exec(m))) { const t = x[1].replace(/^(main|temp)\./, '').replace(/__/g, '.'); return `[TABLE_OR_VIEW_NOT_FOUND] The table or view \`${t}\` cannot be found. Verify the spelling and correctness of the schema and catalog. SQLSTATE: 42P01`; }
    if ((x = /near "([^"]*)": syntax error/.exec(m))) return `[PARSE_SYNTAX_ERROR] Syntax error at or near '${x[1]}'. SQLSTATE: 42601`;
    if (/incomplete input/.test(m)) return "[PARSE_SYNTAX_ERROR] Syntax error at or near end of input. SQLSTATE: 42601";
    if ((x = /ambiguous column name: (.+)$/.exec(m))) return `[AMBIGUOUS_REFERENCE] Reference \`${x[1]}\` is ambiguous, could be: [${x[1]}]. Calíficala con el alias de la tabla (t.${x[1]}). SQLSTATE: 42702`;
    if (/misuse of aggregate/.test(m)) return `[GROUP_BY_AGGREGATE] Aggregate functions are not allowed in GROUP BY or WHERE. Usa HAVING para filtrar por un agregado. SQLSTATE: 42903`;
    if (/misuse of window function/.test(m)) return '[UNSUPPORTED_EXPR_FOR_WINDOW] Las funciones de ventana no se usan en WHERE: calcúlala en una subconsulta y filtra afuera. SQLSTATE: 42P20';
    if ((x = /(\d+) values for (\d+) columns/.exec(m))) return `[INSERT_COLUMN_ARITY_MISMATCH] Cannot write: ${x[1]} valores para ${x[2]} columnas. SQLSTATE: 21S01`;
    if (/UNIQUE constraint failed/.test(m)) return `[DELTA_DUPLICATE_KEY] ${m}`;
    if (/NOT NULL constraint failed: \S+\.(\S+)/.test(m)) return `[DELTA_NOT_NULL_CONSTRAINT_VIOLATED] NOT NULL constraint violated for column: ${/NOT NULL constraint failed: \S+\.(\S+)/.exec(m)[1]}.`;
    if (/SELECTs to the left and right of (UNION|EXCEPT|INTERSECT) do not have the same number of result columns/.test(m)) return '[NUM_COLUMNS_MISMATCH] UNION can only be performed on inputs with the same number of columns. SQLSTATE: 42826';
    void texto;
    return m;
  }

  // ------------------------------------------------------------------ API pública
  // ejecuta un script: devuelve una lista de resultados, uno por sentencia
  async function ejecutar(script, opts = {}) {
    await init({ Store: opts.Store || Store });
    const res = [];
    const U = uc();
    let lista;
    try { lista = sentencias(script); } catch (e) { return [{ ok: false, error: traducirError(e), texto: script }]; }
    for (const st of lista) {
      const t0 = performance.now();
      const reg = { id: hashHex(st.texto + Date.now() + Math.random(), 8) + '-' + hashHex(String(Math.random()), 4), texto: st.texto.slice(0, 2000), inicio: ahora(), origen: opts.origen || 'Databricks SQL Editor', compute: opts.compute || 'WAREHOUSE' };
      try {
        pendiente = null;
        const r = ejecutarUna(st, opts);
        r.ok = true; r.ms = Math.round(performance.now() - t0); r.texto = st.texto;
        if (!r.tipos && r.cols && r.cols.length) r.tipos = tiposDe(r.cols, r.filas || []);
        if (r.filas && r.filas.length > (opts.limite || 10000)) { r.truncado = r.filas.length; r.filas = r.filas.slice(0, opts.limite || 10000); }
        res.push(r);
        Object.assign(reg, { estado: 'FINISHED', ms: r.ms, filas: r.filas ? r.filas.length : 0 });
      } catch (e) {
        const msg = traducirError(e, st.texto);
        res.push({ ok: false, error: msg, texto: st.texto, ms: Math.round(performance.now() - t0) });
        Object.assign(reg, { estado: 'FAILED', ms: Math.round(performance.now() - t0), filas: 0, error: msg });
        U.historial.push(reg); if (U.historial.length > 500) U.historial.splice(0, U.historial.length - 500);
        guardar();
        break; // como en Databricks: se detiene en la primera sentencia que falla
      }
      U.historial.push(reg); if (U.historial.length > 500) U.historial.splice(0, U.historial.length - 500);
    }
    guardar();
    return res;
  }

  // árbol del catálogo para el explorador
  function arbol() {
    const U = uc(); const S = samples();
    const cats = Object.entries(U.catalogs).map(([c, C]) => ({ nombre: c, tipo: 'catalog', comment: C.comment, owner: C.owner, schemas: Object.entries(C.schemas).map(([s, X]) => ({ nombre: s, comment: X.comment, sistema: !!X.system, tablas: Object.entries(X.tables || {}).map(([t, M]) => ({ nombre: t, tipo: M.tipo, cols: M.cols, comment: M.comment, owner: M.owner, creado: M.creado, modificado: M.modificado })), volumenes: Object.entries(X.volumes || {}).map(([v, M]) => ({ nombre: v, ...M })) })) }));
    cats.push({ nombre: 'samples', tipo: 'catalog', comment: 'Datos de ejemplo del curso (solo lectura)', owner: 'System user', soloLectura: true, schemas: Object.entries(S).map(([s, ts]) => ({ nombre: s, tablas: ts.map((t) => ({ nombre: t, tipo: 'MANAGED', cols: null })), volumenes: [] })) });
    cats.push({ nombre: 'system', tipo: 'catalog', comment: 'Tablas del sistema: facturación, auditoría, historial de consultas, cómputo y jobs', owner: 'System user', soloLectura: true, schemas: Object.entries(SISTEMA).map(([s, ts]) => ({ nombre: s, tablas: ts.map((t) => ({ nombre: t, tipo: 'MANAGED', cols: null })), volumenes: [] })) });
    return cats;
  }
  async function infoTabla(nombre) {
    await init({ Store });
    const ref = resolver(nombre);
    const cols = columnas(ref);
    const n = db.exec(`SELECT COUNT(*) FROM ${q(ref.sql)}`)[0].values[0][0];
    const muestra = db.exec(`SELECT * FROM ${q(ref.sql)} LIMIT 100`)[0];
    return { ref: { c: ref.c, s: ref.s, t: ref.t }, cols, filas: n, muestra: muestra ? { cols: muestra.columns, filas: muestra.values } : { cols: cols.map((c) => c.n), filas: [] }, meta: ref.meta || null, solo: !!ref.solo, ddl: ddlDe(ref), linaje: (uc().linaje || []).filter((l) => l.a === `${ref.c}.${ref.s}.${ref.t}` || l.de === `${ref.c}.${ref.s}.${ref.t}`), grants: uc().grants.filter((g) => g.obj === `TABLE ${ref.c}.${ref.s}.${ref.t}`) };
  }
  // tablas creadas o modificadas desde fuera (notebook con Python): se registran en Unity Catalog
  async function registrarDesdeDatos(nombre, cols, filas, modo = 'overwrite', op = 'WRITE') {
    await init({ Store });
    const ref = resolver(nombre, { crear: true, permitirVista: false });
    if (ref.solo) err('PERMISSION_DENIED', `No se puede escribir en ${ref.c}.`);
    const tipos = tiposDe(cols, filas);
    const existe = !!ref.meta;
    if (existe && modo === 'error') err('TABLE_OR_VIEW_ALREADY_EXISTS', `[TABLE_OR_VIEW_ALREADY_EXISTS] Cannot create table or view ${fq(ref.c, ref.s, ref.t)} because it already exists.`);
    if (!existe || modo === 'overwrite') {
      crearFisica(ref.sql, cols.map((n, i) => ({ n, t: tipos[i] })), filas);
      if (!existe) crearMetaTabla(ref, cols.map((n, i) => ({ n, t: tipos[i] })));
      else uc().catalogs[ref.c].schemas[ref.s].tables[ref.t].cols = cols.map((n, i) => ({ n, t: tipos[i] }));
    } else {
      const st = db.prepare(`INSERT INTO ${q(ref.sql)} (${cols.map(q).join(',')}) VALUES (${cols.map(() => '?').join(',')})`);
      for (const f of filas) st.run(f); st.free();
    }
    ref.meta = uc().catalogs[ref.c].schemas[ref.s].tables[ref.t];
    registrarVersion(ref, existe ? 'WRITE' : 'CREATE TABLE AS SELECT', { mode: modo === 'append' ? 'Append' : 'Overwrite', partitionBy: '[]' }, { numFiles: '1', numOutputRows: String(filas.length) });
    return `${ref.c}.${ref.s}.${ref.t}`;
  }
  // datos de las tablas del alumno, para pasarlas a Spark (notebooks en Python)
  async function tablasAlumno() {
    await init({ Store });
    return objetosUC().filter((o) => o.T.tipo !== 'VIEW').map((o) => { const r = db.exec(`SELECT * FROM ${q(sqlNombre(o.c, o.s, o.t))}`)[0]; return { nombre: `${o.c}.${o.s}.${o.t}`, cols: o.T.cols.map((c) => c.n), filas: r ? r.values : [], version: (o.T.versiones || []).length }; });
  }
  // el pipeline marca sus tablas (tipo STREAMING_TABLE / MATERIALIZED_VIEW) y puede escribirlas
  async function comoPipeline(fn) { enPipeline = true; try { return await fn(); } finally { enPipeline = false; } }
  function marcarPipeline(full, tipo, id, nombre) {
    const p = full.split('.'); const T = uc().catalogs[p[0]] && uc().catalogs[p[0]].schemas[p[1]] && uc().catalogs[p[0]].schemas[p[1]].tables[p[2]];
    if (!T) return; T.tipo = tipo; T.pipeline = id; T.pipelineNombre = nombre; guardar();
  }
  function filasDe(full) { const ref = resolver(full); const r = db.exec(`SELECT COUNT(*) FROM ${q(ref.sql)}`)[0]; return r ? r.values[0][0] : 0; }
  // corre fn en un metastore propio y vacío (los ejercicios autocorregidos): no toca el catálogo del alumno
  let colaAislada = Promise.resolve();
  function aislado(fn, archivosIniciales) {
    const tarea = colaAislada.then(async () => {
      await window.Engines.SQL.init();
      if (listo) { try { await listo; } catch (e) { /* sin estado previo */ } }
      const prev = { Store, db, listo, temp: sesion.temp, arch: archivosAislados };
      Store = { data: {}, save() {} }; db = window.Engines.SQL.fresh(); funciones(db); listo = Promise.resolve(true); sesion.temp = {};
      archivosAislados = JSON.parse(JSON.stringify(archivosIniciales || {})); enAislado = true;
      try { return await fn(); } finally { enAislado = false; try { db.close(); } catch (e) { /* ya cerrada */ } Store = prev.Store; db = prev.db; listo = prev.listo; sesion.temp = prev.temp; archivosAislados = prev.arch; }
    });
    colaAislada = tarea.catch(() => {});
    return tarea;
  }
  function reiniciar() { Store.data.dbxUC = NUEVO_UC(); sesion.temp = {}; listo = null; db = null; guardar(); }

  window.DBSQL = { aislado, comoPipeline, marcarPipeline, filasDe, init, ejecutar, arbol, infoTabla, registrarDesdeDatos, tablasAlumno, uc: () => uc(), samples, sentencias, tokenizar, reiniciar, parseCsv, archivos, ErrorDbx, _db: () => db };
})();
