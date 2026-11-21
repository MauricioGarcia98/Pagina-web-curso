/*
 * Traductor de SQL de SQLite a DuckDB.
 *
 * El curso enseña SQL con el dialecto de SQLite (fechas como texto, date(), strftime('%Y', x), julianday…)
 * y ahora corre sobre DuckDB. Este módulo reescribe lo que DuckDB no entiende igual, para que cada ejercicio,
 * ejemplo y consulta de quien estudia funcione sin cambios. Lo demás lo resuelven tres ajustes de DuckDB que
 * aplica el motor al abrir la base (ver AJUSTES): división entera entre enteros, conversión implícita a texto
 * (substr sobre una fecha, fecha || 'x'). DuckDB ya trae su propia sqlite_master.
 *
 * Se usa en el navegador (window.SqliteADuckdb) y en Node para validar los ejercicios.
 */
(function (raiz) {
  'use strict';

  // Ajustes que acercan DuckDB al comportamiento de SQLite. Se ejecutan una vez por conexión.
  const AJUSTES = [
    'SET integer_division = true',
    // SQLite compara y concatena cualquier tipo con texto (fecha >= '2024-01-01', substr(fecha, 1, 7)).
    // Este ajuste es global: en DuckDB solo agrega conversiones que antes daban error, no cambia consultas válidas
    'SET old_implicit_casting = true',
    "CREATE OR REPLACE MACRO julianday(x) AS epoch(CAST(x AS TIMESTAMP)) / 86400.0 + 2440587.5",
    // aplica un modificador de fecha de SQLite que se arma al ejecutar, como '-' || n || ' days'
    "CREATE OR REPLACE MACRO sqlite_mod(ts, m) AS CASE " +
      "WHEN regexp_matches(lower(trim(m)), '^[+-]?[0-9]+(\\.[0-9]+)? days?$') THEN CAST(ts AS TIMESTAMP) + to_days(CAST(CAST(regexp_extract(trim(m), '^[+-]?[0-9]+(\\.[0-9]+)?') AS DOUBLE) AS INTEGER)) " +
      "WHEN regexp_matches(lower(trim(m)), '^[+-]?[0-9]+ months?$') THEN CAST(ts AS TIMESTAMP) + to_months(CAST(regexp_extract(trim(m), '^[+-]?[0-9]+') AS INTEGER)) " +
      "WHEN regexp_matches(lower(trim(m)), '^[+-]?[0-9]+ years?$') THEN CAST(ts AS TIMESTAMP) + to_years(CAST(regexp_extract(trim(m), '^[+-]?[0-9]+') AS INTEGER)) " +
      "WHEN regexp_matches(lower(trim(m)), '^[+-]?[0-9]+ hours?$') THEN CAST(ts AS TIMESTAMP) + to_hours(CAST(regexp_extract(trim(m), '^[+-]?[0-9]+') AS INTEGER)) " +
      "WHEN regexp_matches(lower(trim(m)), '^[+-]?[0-9]+ minutes?$') THEN CAST(ts AS TIMESTAMP) + to_minutes(CAST(regexp_extract(trim(m), '^[+-]?[0-9]+') AS INTEGER)) " +
      "WHEN regexp_matches(lower(trim(m)), '^[+-]?[0-9]+ seconds?$') THEN CAST(ts AS TIMESTAMP) + to_seconds(CAST(regexp_extract(trim(m), '^[+-]?[0-9]+') AS INTEGER)) " +
      "WHEN lower(trim(m)) = 'start of month' THEN date_trunc('month', CAST(ts AS TIMESTAMP)) " +
      "WHEN lower(trim(m)) = 'start of year' THEN date_trunc('year', CAST(ts AS TIMESTAMP)) " +
      "WHEN lower(trim(m)) = 'start of day' THEN date_trunc('day', CAST(ts AS TIMESTAMP)) " +
      "ELSE CAST(ts AS TIMESTAMP) END",
  ];

  // ---------------------------------------------------------------- utilidades
  // Reemplaza literales de texto y comentarios por marcadores para poder reescribir sin tocar su contenido.
  function enmascarar(sql) {
    const lits = [], coms = [];
    let out = '', i = 0;
    const n = sql.length;
    while (i < n) {
      const c = sql[i], d = sql[i + 1];
      if (c === '-' && d === '-') { const f = sql.indexOf('\n', i); const fin = f < 0 ? n : f; coms.push(sql.slice(i, fin)); out += `§c${coms.length - 1}§`; i = fin; continue; }
      if (c === '/' && d === '*') { const f = sql.indexOf('*/', i + 2); const fin = f < 0 ? n : f + 2; coms.push(sql.slice(i, fin)); out += `§c${coms.length - 1}§`; i = fin; continue; }
      if (c === "'") {
        let j = i + 1, v = '';
        while (j < n) { if (sql[j] === "'") { if (sql[j + 1] === "'") { v += "'"; j += 2; continue; } break; } v += sql[j++]; }
        lits.push(v); out += `§${lits.length - 1}§`; i = j + 1; continue;
      }
      out += c; i++;
    }
    lits.coms = coms;
    return { txt: out, lits };
  }
  const desenmascarar = (txt, lits) => txt.replace(/§(\d+)§/g, (_, k) => `'${lits[k].replace(/'/g, "''")}'`).replace(/§c(\d+)§/g, (_, k) => lits.coms[k]);
  const literal = (s, lits) => { const m = /^\s*§(\d+)§\s*$/.exec(s); return m ? lits[m[1]] : null; };

  function partirArgs(s) {
    const r = []; let p = 0, cur = '';
    for (const ch of s) {
      if (ch === '(') p++; else if (ch === ')') p--;
      if (ch === ',' && p === 0) { r.push(cur.trim()); cur = ''; } else cur += ch;
    }
    if (cur.trim() || r.length) r.push(cur.trim());
    return r;
  }
  function cierreDe(s, abre) {
    let p = 0;
    for (let i = abre; i < s.length; i++) { if (s[i] === '(') p++; else if (s[i] === ')') { p--; if (!p) return i; } }
    return -1;
  }
  // Reescribe llamadas a funciones, de adentro hacia afuera. mapa: nombre en minúsculas -> (args, original) => texto
  function reescribirLlamadas(txt, mapa) {
    const re = /\b([A-Za-z_][\w]*)\s*\(/g;
    let out = '', i = 0, m;
    re.lastIndex = 0;
    while ((m = re.exec(txt))) {
      const nombre = m[1].toLowerCase();
      if (!mapa[nombre]) continue;
      // no tocar nombres precedidos por un punto (tabla.date) ni definiciones de columna
      if (txt[m.index - 1] === '.') continue;
      const abre = m.index + m[0].length - 1, cierra = cierreDe(txt, abre);
      if (cierra < 0) break;
      const interior = reescribirLlamadas(txt.slice(abre + 1, cierra), mapa);
      const nuevo = mapa[nombre](partirArgs(interior), m[1]);
      out += txt.slice(i, m.index) + (nuevo === null ? `${m[1]}(${interior})` : nuevo);
      i = cierra + 1; re.lastIndex = i;
    }
    return out + txt.slice(i);
  }

  // ---------------------------------------------------------------- fechas
  const UNIDADES = { day: 'DAY', days: 'DAY', month: 'MONTH', months: 'MONTH', year: 'YEAR', years: 'YEAR', hour: 'HOUR', hours: 'HOUR', minute: 'MINUTE', minutes: 'MINUTE', second: 'SECOND', seconds: 'SECOND' };
  // aplica los modificadores de SQLite ('+7 days', 'start of month', 'weekday 0'…) sobre una expresión TIMESTAMP
  function conModificadores(base, mods, lits) {
    let e = base;
    for (const m of mods) {
      const v = literal(m, lits);
      if (v === null) { e = `sqlite_mod(${e}, ${m})`; continue; } // modificador que se arma al ejecutar
      const t = v.trim().toLowerCase();
      let r;
      if ((r = /^([+-]?\d+(?:\.\d+)?)\s+(days?|months?|years?|hours?|minutes?|seconds?)$/.exec(t))) e = `(${e} + INTERVAL (${r[1]}) ${UNIDADES[r[2]]})`;
      else if (t === 'start of month') e = `date_trunc('month', ${e})`;
      else if (t === 'start of year') e = `date_trunc('year', ${e})`;
      else if (t === 'start of day') e = `date_trunc('day', ${e})`;
      else if ((r = /^weekday\s+([0-6])$/.exec(t))) e = `(${e} + INTERVAL ((${r[1]} - dayofweek(${e}) + 7) % 7) DAY)`;
      else if (t === 'localtime' || t === 'utc' || t === 'auto') { /* la práctica corre en UTC */ }
      else if (t === 'unixepoch') e = `to_timestamp(${base.replace(/^CAST\((.*) AS TIMESTAMP\)$/s, '$1')})::TIMESTAMP`;
      else return null;
    }
    return e;
  }
  function comoTimestamp(args, lits) {
    if (!args.length || args[0] === '') return 'CAST(current_timestamp AS TIMESTAMP)';
    const v = literal(args[0], lits);
    const base = v !== null && v.trim().toLowerCase() === 'now' ? 'CAST(current_timestamp AS TIMESTAMP)' : `CAST(${args[0]} AS TIMESTAMP)`;
    return conModificadores(base, args.slice(1), lits);
  }

  function traducirEnmascarado(t, lits) {
    const mapa = {
      date: (a) => { const e = comoTimestamp(a, lits); return e === null ? null : `CAST(${e} AS DATE)`; },
      datetime: (a) => { const e = comoTimestamp(a, lits); return e === null ? null : `strftime(${e}, '%Y-%m-%d %H:%M:%S')`; },
      time: (a) => { const e = comoTimestamp(a, lits); return e === null ? null : `strftime(${e}, '%H:%M:%S')`; },
      julianday: (a) => { const e = comoTimestamp(a, lits); return e === null ? null : `(epoch(${e}) / 86400.0 + 2440587.5)`; },
      unixepoch: (a) => { const e = comoTimestamp(a, lits); return e === null ? null : `CAST(epoch(${e}) AS BIGINT)`; },
      strftime: (a) => {
        const fmt = literal(a[0] || '', lits);
        if (fmt === null || a.length < 2) return null; // ya está en el orden de DuckDB (fecha, formato)
        const e = comoTimestamp(a.slice(1), lits);
        if (e === null) return null;
        if (fmt === '%s') return `CAST(epoch(${e}) AS BIGINT)`;
        return `strftime(${e}, ${a[0]})`;
      },
      // SUM/AVG/TOTAL de una condición: en SQLite una comparación vale 0 o 1
      sum: (a) => (a.length === 1 && esCondicion(a[0]) ? `SUM(CAST((${a[0]}) AS INTEGER))` : null),
      avg: (a) => (a.length === 1 && esCondicion(a[0]) ? `AVG(CAST((${a[0]}) AS INTEGER))` : null),
      total: (a) => (a.length === 1 ? `COALESCE(SUM(${esCondicion(a[0]) ? `CAST((${a[0]}) AS INTEGER)` : a[0]}), 0.0)` : null),
      // MAX(a, b) con varios argumentos es escalar en SQLite; con una condición, vale 0 o 1
      max: (a) => (a.length >= 2 ? `GREATEST(${a.join(', ')})` : esCondicion(a[0] || '') ? `MAX(CAST((${a[0]}) AS INTEGER))` : null),
      min: (a) => (a.length >= 2 ? `LEAST(${a.join(', ')})` : esCondicion(a[0] || '') ? `MIN(CAST((${a[0]}) AS INTEGER))` : null),
      // CAST a entero en SQLite trunca (19.99 → 19); DuckDB redondea. REAL en SQLite es de 64 bits
      cast: (a) => {
        if (a.length !== 1) return null;
        const r = /^([\s\S]+)\s+AS\s+([A-Za-z ]+?)\s*$/i.exec(a[0]);
        if (!r) return null;
        const tipo = r[2].toUpperCase().replace(/\s+/g, ' ');
        if (/^(INT|INTEGER|BIGINT|SMALLINT|TINYINT)$/.test(tipo)) return `CAST(trunc(TRY_CAST(${r[1]} AS DOUBLE)) AS BIGINT)`;
        if (/^(REAL|FLOAT|DOUBLE|DOUBLE PRECISION)$/.test(tipo)) return `CAST(${r[1]} AS DOUBLE)`;
        return null;
      },
      // json_extract de SQLite devuelve el valor sin comillas
      json_extract: (a) => (a.length === 2 ? `json_extract_string(${a[0]}, ${a[1]})` : null),
      ifnull: () => null,
    };
    t = reescribirLlamadas(t, mapa);
    t = moduloEntero(t);
    t = nulosPrimero(t);
    // LIKE en SQLite no distingue mayúsculas (en letras sin acento): ILIKE da el mismo resultado
    t = t.replace(/\b(NOT\s+)?LIKE\b/gi, (m, no) => `${no || ''}ILIKE`);
    // EXPLAIN QUERY PLAN es de SQLite: DuckDB muestra su plan con EXPLAIN
    t = t.replace(/\bEXPLAIN\s+QUERY\s+PLAN\b/gi, 'EXPLAIN');
    // en SQLite INTEGER guarda hasta 64 bits: en las tablas que crea quien estudia se usa BIGINT
    // y una columna INTEGER PRIMARY KEY se numera sola cuando no se le da valor (se emula con una secuencia)
    t = t.replace(/\bCREATE\s+(TEMP(?:ORARY)?\s+)?TABLE\b[^;]*/gi, (ddl) => {
      if (/\bAS\s+SELECT\b/i.test(ddl)) return ddl;
      const nom = (/\bTABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?"?([\w.]+)"?/i.exec(ddl) || [])[1] || 't';
      let previa = '';
      ddl = ddl.replace(/(\b\w+|"[^"]+")\s+INT(?:EGER)?\s+PRIMARY\s+KEY(?:\s+AUTOINCREMENT)?\b/i, (m, col) => {
        const sq = `sq_${nom}_${col.replace(/"/g, '')}`.replace(/\W/g, '_');
        previa = `CREATE SEQUENCE IF NOT EXISTS ${sq}; `;
        return `${col} BIGINT PRIMARY KEY DEFAULT nextval('${sq}')`;
      });
      return previa + ddl.replace(/\bINTEGER\b|\bINT\b/gi, 'BIGINT').replace(/\bREAL\b|\bFLOAT\b/gi, 'DOUBLE');
    });
    return t;
  }

  // En SQLite a % b convierte los dos lados a entero ((i * 7.31) % 300); en DuckDB el resto es decimal.
  // Se envuelven los operandos simples (paréntesis, nombre o número) cuando el de la izquierda no es parte de un * o /
  function moduloEntero(t) {
    let out = '', i = 0;
    while (true) {
      const k = t.indexOf('%', i);
      if (k < 0) return out + t.slice(i);
      // operando izquierdo
      let a = k - 1;
      while (a >= 0 && /\s/.test(t[a])) a--;
      let ini;
      if (t[a] === ')') { let p = 0; ini = a; for (; ini >= 0; ini--) { if (t[ini] === ')') p++; else if (t[ini] === '(') { p--; if (!p) break; } } if (ini > 0 && /[\w]/.test(t[ini - 1])) { while (ini > 0 && /[\w.]/.test(t[ini - 1])) ini--; } }
      else { ini = a + 1; while (ini > 0 && /[\w.§]/.test(t[ini - 1])) ini--; }
      let antes = ini - 1;
      while (antes >= 0 && /\s/.test(t[antes])) antes--;
      // operando derecho
      let b = k + 1;
      while (b < t.length && /\s/.test(t[b])) b++;
      let fin;
      if (t[b] === '(') fin = cierreDe(t, b) + 1;
      else { fin = b; if (t[fin] === '-') fin++; while (fin < t.length && /[\w.§]/.test(t[fin])) fin++; if (t[fin] === '(') fin = cierreDe(t, fin) + 1; }
      const izq = t.slice(ini, a + 1), der = t.slice(b, fin);
      if (!izq.trim() || !der.trim() || fin <= b || /[*/%]/.test(t[antes] || '') || /^§/.test(izq) || /^§/.test(der)) { out += t.slice(i, k + 1); i = k + 1; continue; }
      out += t.slice(i, ini) + `(CAST(trunc(${izq}) AS BIGINT) % CAST(trunc(${der}) AS BIGINT))`;
      i = fin;
    }
  }

  // En SQLite NULL es el valor más chico: sale primero en un orden ascendente. DuckDB lo pone al final,
  // así que a cada criterio ascendente sin NULLS explícito se le agrega NULLS FIRST (en DESC ya coinciden)
  const FIN_ORDEN = /^(LIMIT|OFFSET|FETCH|ROWS|RANGE|GROUPS|UNION|EXCEPT|INTERSECT|WINDOW)\b/i;
  function nulosPrimero(t) {
    const re = /\bORDER\s+BY\b/gi;
    let out = '', i = 0, m;
    while ((m = re.exec(t))) {
      let j = m.index + m[0].length, p = 0, ini = j;
      const items = [];
      for (; j <= t.length; j++) {
        const ch = t[j];
        if (j === t.length || ch === ';' || (ch === ')' && p === 0) || (p === 0 && /\s/.test(t[j - 1] || '') && FIN_ORDEN.test(t.slice(j)))) { items.push([ini, j]); break; }
        if (ch === '(') p++; else if (ch === ')') p--;
        else if (ch === ',' && p === 0) { items.push([ini, j]); ini = j + 1; }
      }
      out += t.slice(i, m.index + m[0].length);
      let k = m.index + m[0].length;
      for (const [a, b] of items) {
        const it = t.slice(a, b), core = it.replace(/\s+$/, ''), cola = it.slice(core.length);
        out += t.slice(k, a) + (core.trim() && !/\bNULLS\s+(FIRST|LAST)$/i.test(core) && !/\bDESC$/i.test(core) ? core + ' NULLS FIRST' + cola : it);
        k = b;
      }
      i = k; re.lastIndex = k;
    }
    return out + t.slice(i);
  }

  // ¿la expresión es una condición (comparación, IN, LIKE, IS, BETWEEN) en su nivel superior?
  function esCondicion(e) {
    let p = 0, plano = '';
    for (const ch of e) { if (ch === '(') p++; else if (ch === ')') p--; else if (p === 0) plano += ch; }
    return /(<>|!=|<=|>=|=|<|>)|\b(IN|LIKE|ILIKE|IS|BETWEEN|AND|OR|NOT|EXISTS)\b/i.test(plano) && !/\bCASE\b/i.test(plano);
  }

  // Sentencias de SQLite que en DuckDB no hacen falta (o no existen) y se omiten
  const OMITIR = /^\s*(PRAGMA\s+(foreign_keys|journal_mode|synchronous|cache_size|temp_store)\b[^;]*|VACUUM|ANALYZE(\s+\w+)?)\s*$/i;

  function traducir(sql) {
    if (!sql) return sql;
    const M = enmascarar(sql);
    const limpio = M.txt.split(/(;)/).reduce((acc, parte) => acc + (parte === ';' ? ';' : OMITIR.test(parte) ? '' : parte), '');
    return desenmascarar(traducirEnmascarado(limpio, M.lits), M.lits);
  }

  // Lo que depende del interior de SQLite (su plan de consulta, su catálogo, sus tipos) se sigue ejecutando en SQLite
  // (y también transacciones explícitas, triggers, ATTACH y tablas virtuales, que DuckDB no tiene o maneja distinto)
  const SOLO_SQLITE = /\bEXPLAIN\s+QUERY\s+PLAN\b|\bPRAGMA\b|\bpragma_\w+\s*\(|\bsqlite_(master|schema|version|sequence)\b|\btypeof\s*\(|(^|;)\s*(BEGIN|COMMIT|END|ROLLBACK|SAVEPOINT|RELEASE)\b|\bCREATE\s+(TEMP(ORARY)?\s+)?TRIGGER\b|\bATTACH\b|\bVIRTUAL\s+TABLE\b|\bREPLACE\s+INTO\b|\bWITHOUT\s+ROWID\b|\blast_insert_rowid\s*\(|\bchanges\s*\(\s*\)|\bjson_(each|tree)\s*\(/i;
  function soloSqlite(sql) { return !!sql && SOLO_SQLITE.test(enmascarar(sql).txt.replace(/§c\d+§/g, ' ')); }

  // Parte un script en sentencias (respeta textos y comentarios) y descarta las que solo tienen comentarios
  function partir(sql) {
    const M = enmascarar(sql || '');
    return M.txt.split(';').map((s) => s.trim()).filter((s) => s.replace(/§c\d+§/g, '').trim()).map((s) => desenmascarar(s, M.lits));
  }

  // Tablas del dataset para DuckDB a partir del esquema de SQLite: mismos tipos declarados (INTEGER y REAL),
  // misma clave primaria, y las fechas guardadas como texto pasan a DATE o TIMESTAMP para usar sus funciones.
  const FECHA = /^\d{4}-\d{2}-\d{2}$/, FECHA_HORA = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/;
  function tablasDuckdb(schema, tablas) {
    const decl = {};
    for (const m of schema.matchAll(/CREATE\s+TABLE\s+"?(\w+)"?\s*\(([\s\S]*?)\);/gi)) {
      const cols = {}, partes = partirArgs(m[2]);
      let pk = [];
      for (const p of partes) {
        const tk = /^PRIMARY\s+KEY\s*\(([^)]+)\)/i.exec(p);
        if (tk) { pk = tk[1].split(',').map((s) => s.trim().replace(/"/g, '')); continue; }
        if (/^(FOREIGN|UNIQUE|CHECK|CONSTRAINT)\b/i.test(p)) continue;
        const c = /^"?(\w+)"?\s*([A-Za-z]*)/.exec(p);
        if (!c) continue;
        cols[c[1]] = c[2].toUpperCase();
        if (/\bPRIMARY\s+KEY\b/i.test(p)) pk = [c[1]];
      }
      decl[m[1]] = { cols, pk };
    }
    return Object.entries(tablas).map(([nombre, t]) => {
      const d = decl[nombre] || { cols: {}, pk: [] };
      const tipos = t.columns.map((c, j) => {
        const v = t.rows.map((r) => r[j]).filter((x) => x !== null && x !== undefined && x !== '');
        const td = d.cols[c] || '';
        if (/INT/.test(td)) return 'BIGINT';
        if (/REAL|FLOA|DOUB|NUM|DEC/.test(td)) return 'DOUBLE';
        if (!v.length) return 'VARCHAR';
        if (v.every((x) => typeof x === 'string' && FECHA.test(x))) return 'DATE';
        if (v.every((x) => typeof x === 'string' && (FECHA_HORA.test(x) || FECHA.test(x)))) return 'TIMESTAMP';
        if (!td && v.every((x) => typeof x === 'number')) return v.every(Number.isInteger) ? 'BIGINT' : 'DOUBLE';
        return 'VARCHAR';
      });
      const pk = d.pk.filter((c) => t.columns.includes(c));
      const crear = `CREATE OR REPLACE TABLE "${nombre}" (${t.columns.map((c, j) => `"${c}" ${tipos[j]}`).join(', ')}${pk.length ? `, PRIMARY KEY (${pk.map((c) => `"${c}"`).join(', ')})` : ''})`;
      const columnas = '{' + t.columns.map((c, j) => `'${c}': '${tipos[j]}'`).join(', ') + '}';
      const q = (v) => (v === null || v === undefined ? '' : typeof v === 'number' ? String(v) : `"${String(v).replace(/"/g, '""')}"`);
      const csv = () => t.rows.map((r) => r.map(q).join(',')).join('\n') + '\n';
      return { nombre, crear, columnas, csv, tipos };
    });
  }

  const api = { traducir, partir, AJUSTES, soloSqlite, tablasDuckdb };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else raiz.SqliteADuckdb = api;
})(typeof window !== 'undefined' ? window : globalThis);
