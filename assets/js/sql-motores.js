/*
 * Motores del laboratorio SQL: SQLite (sql.js), PostgreSQL real (PGlite, Postgres compilado a WebAssembly)
 * y modos compatibles de MySQL y SQL Server.
 *
 * Los modos MySQL y SQL Server traducen la sintaxis propia de cada motor a SQLite y la ejecutan sobre el
 * mismo dataset. Además rechazan, con el mensaje de error real del motor, lo que ese motor no acepta
 * (LIMIT en SQL Server, TOP en MySQL, columnas fuera del GROUP BY…), para practicar el dialecto correcto.
 */
(function () {
  'use strict';

  const PGLITE_URL = 'https://cdn.jsdelivr.net/npm/@electric-sql/pglite@0.4.6/dist/index.js';

  const MOTORES = {
    sqlite: { nombre: 'SQLite', icono: '🪶', version: 'SQLite 3.45', real: true, desc: 'SQLite real en tu navegador. Es el motor de los ejercicios del curso.' },
    postgres: { nombre: 'PostgreSQL', icono: '🐘', version: 'PostgreSQL 17 (PGlite)', real: true, desc: 'PostgreSQL 17 real compilado a WebAssembly (PGlite). La primera vez descarga unos 6 MB y carga el dataset completo con tipos DATE, TIMESTAMP y NUMERIC.' },
    mysql: { nombre: 'MySQL', icono: '🐬', version: 'MySQL 8.4 (modo compatible)', real: false, desc: 'Modo compatible con MySQL 8: escribes en sintaxis de MySQL (LIMIT, DATE_FORMAT, IFNULL, GROUP_CONCAT, backticks…), se traduce a SQLite y se ejecuta. Lo que MySQL rechaza devuelve su error real.' },
    sqlserver: { nombre: 'SQL Server', icono: '🗄️', version: 'SQL Server 2022 (modo compatible)', real: false, desc: 'Modo compatible con SQL Server (T-SQL): TOP, OFFSET … FETCH, GETDATE, DATEADD, DATEDIFF, FORMAT, ISNULL, corchetes, variables con DECLARE… Se traduce a SQLite y se ejecuta. Lo que SQL Server rechaza devuelve su error real.' },
  };

  // ============================================================== utilidades de texto

  class ErrorMotor extends Error {}

  // Reemplaza literales, identificadores entre comillas y comentarios por marcadores,
  // para poder aplicar expresiones regulares sin tocar el contenido de los textos.
  function enmascarar(sql, motor) {
    const lits = [], ids = [];
    let out = '', i = 0;
    const n = sql.length;
    while (i < n) {
      const c = sql[i], d = sql[i + 1];
      if (c === '-' && d === '-') { while (i < n && sql[i] !== '\n') i++; continue; }
      if (c === '#' && motor === 'mysql') { while (i < n && sql[i] !== '\n') i++; continue; }
      if (c === '/' && d === '*') { const f = sql.indexOf('*/', i + 2); i = f < 0 ? n : f + 2; out += ' '; continue; }
      const prefN = (c === 'N' || c === 'n') && d === "'" && !/[\w]/.test(sql[i - 1] || '');
      if (c === "'" || prefN || (c === '"' && motor === 'mysql')) {
        const q = prefN ? "'" : c; let j = i + (prefN ? 2 : 1), v = '';
        while (j < n) {
          if (motor === 'mysql' && sql[j] === '\\' && j + 1 < n) { const e = sql[j + 1]; v += { n: '\n', t: '\t', 0: '\0' }[e] ?? e; j += 2; continue; }
          if (sql[j] === q) { if (sql[j + 1] === q) { v += q; j += 2; continue; } break; }
          v += sql[j++];
        }
        if (j >= n) throw new ErrorMotor('__comilla__');
        lits.push(v); out += `§${lits.length - 1}§`; i = j + 1; continue;
      }
      if ((c === '"' && motor !== 'mysql') || (c === '`' && motor === 'mysql') || (c === '[' && motor === 'sqlserver')) {
        const cierre = c === '[' ? ']' : c; const j = sql.indexOf(cierre, i + 1);
        if (j < 0) throw new ErrorMotor('__comilla__');
        ids.push(sql.slice(i + 1, j)); out += `¤${ids.length - 1}¤`; i = j + 1; continue;
      }
      out += c; i++;
    }
    return { txt: out, lits, ids };
  }
  function desenmascarar(txt, m) {
    return txt.replace(/§(\d+)§/g, (_, k) => `'${m.lits[k].replace(/'/g, "''")}'`).replace(/¤(\d+)¤/g, (_, k) => `"${m.ids[k].replace(/"/g, '""')}"`);
  }

  // parte "a, f(b, c), d" en ["a", "f(b, c)", "d"] respetando paréntesis
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
  // reescribe llamadas a función, de adentro hacia afuera
  function reescribirLlamadas(txt, mapa) {
    const re = /\b([A-Za-z_][\w]*)\s*\(/g;
    let out = '', i = 0, m;
    re.lastIndex = 0;
    while ((m = re.exec(txt))) {
      const nombre = m[1].toUpperCase(), fn = mapa[nombre];
      if (!fn || /[.¤]$/.test(txt.slice(0, m.index))) continue;
      const abre = m.index + m[0].length - 1, cierra = cierreDe(txt, abre);
      if (cierra < 0) continue;
      const args = partirArgs(txt.slice(abre + 1, cierra)).map((a) => reescribirLlamadas(a, mapa));
      const nuevo = fn(args, m[1]);
      out += txt.slice(i, m.index) + (nuevo == null ? `${m[1]}(${args.join(', ')})` : nuevo);
      i = cierra + 1; re.lastIndex = i;
    }
    return out + txt.slice(i);
  }

  const MESES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const DIAS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const parte = (fmt, x) => `CAST(strftime('${fmt}', ${x}) AS INTEGER)`;
  const nombreMes = (x) => `CASE CAST(strftime('%m', ${x}) AS INTEGER) ${MESES.map((n, i) => `WHEN ${i + 1} THEN '${n}'`).join(' ')} END`;
  const nombreDia = (x) => `CASE strftime('%w', ${x}) ${DIAS.map((n, i) => `WHEN '${i}' THEN '${n}'`).join(' ')} END`;
  const UNIDADES = { YEAR: 'years', YY: 'years', YYYY: 'years', QUARTER: 'q', QQ: 'q', Q: 'q', MONTH: 'months', MM: 'months', M: 'months', WEEK: 'w', WK: 'w', WW: 'w', DAY: 'days', DD: 'days', D: 'days', DAYOFYEAR: 'days', DY: 'days', Y: 'days', HOUR: 'hours', HH: 'hours', MINUTE: 'minutes', MI: 'minutes', N: 'minutes', SECOND: 'seconds', SS: 'seconds', S: 'seconds' };
  function sumarFecha(fecha, cantidad, unidad, motor) {
    const u = UNIDADES[String(unidad).toUpperCase()];
    if (!u) throw new ErrorMotor(motor === 'sqlserver' ? `Msg 155, Level 15, State 1, Line 1\n'${unidad}' is not a recognized dateadd option.` : `ERROR 1064 (42000): You have an error in your SQL syntax near '${unidad}'`);
    const [mod, mult] = u === 'q' ? ['months', 3] : u === 'w' ? ['days', 7] : [u, 1];
    const n = mult === 1 ? `(${cantidad})` : `(${cantidad}) * ${mult}`;
    const conHora = ['hours', 'minutes', 'seconds'].includes(mod);
    if (conHora || mod === 'days') return `${conHora ? 'datetime' : 'date'}(${fecha}, printf('%+d ${mod}', ${n}))`;
    // meses y años como MySQL y SQL Server: el 31/03 menos un mes es el 29/02 (no se desborda al mes siguiente)
    const meses = mod === 'years' ? `(${n}) * 12` : n;
    const inicio = `date(${fecha}, 'start of month', printf('%+d months', ${meses}))`;
    return `date(${inicio}, printf('+%d days', min(CAST(strftime('%d', ${fecha}) AS INTEGER), CAST(strftime('%d', date(${inicio}, '+1 month', '-1 day')) AS INTEGER)) - 1))`;
  }
  function difFecha(unidad, desde, hasta, motor) {
    const u = UNIDADES[String(unidad).toUpperCase()];
    const meses = `((${parte('%Y', hasta)} * 12 + ${parte('%m', hasta)}) - (${parte('%Y', desde)} * 12 + ${parte('%m', desde)}))`;
    const dias = (f) => `CAST(julianday(${f === 'd' ? `date(${hasta})` : hasta}) - julianday(${f === 'd' ? `date(${desde})` : desde})`;
    switch (u) {
      case 'years': return motor === 'mysql' ? `CAST(${meses} / 12 AS INTEGER)` : `(${parte('%Y', hasta)} - ${parte('%Y', desde)})`;
      case 'q': return `CAST(${meses} / 3 AS INTEGER)`;
      case 'months': return meses;
      case 'w': return `CAST((julianday(date(${hasta})) - julianday(date(${desde}))) / 7 AS INTEGER)`;
      case 'days': return `${dias('d')} AS INTEGER)`;
      case 'hours': return `CAST((julianday(${hasta}) - julianday(${desde})) * 24 AS INTEGER)`;
      case 'minutes': return `CAST((julianday(${hasta}) - julianday(${desde})) * 1440 AS INTEGER)`;
      case 'seconds': return `CAST((julianday(${hasta}) - julianday(${desde})) * 86400 AS INTEGER)`;
      default: throw new ErrorMotor(`Msg 155, Level 15, State 1, Line 1\n'${unidad}' is not a recognized datediff option.`);
    }
  }
  // tipos de CAST / CONVERT
  function castA(expr, tipo) {
    const t = tipo.trim().toUpperCase();
    if (/^DATE$/.test(t)) return `date(${expr})`;
    if (/^(DATETIME2?|SMALLDATETIME|TIMESTAMP|DATETIMEOFFSET)(\(\d+\))?$/.test(t)) return `datetime(${expr})`;
    if (/^TIME(\(\d+\))?$/.test(t)) return `time(${expr})`;
    if (/^(N?VARCHAR|N?CHAR|N?TEXT|CHAR|CHARACTER)(\s*\((\d+|MAX)\))?$/.test(t)) return `CAST(${expr} AS TEXT)`;
    if (/^(SIGNED|UNSIGNED)(\s+INT(EGER)?)?$|^(INT|INTEGER|BIGINT|SMALLINT|TINYINT|BIT)$/.test(t)) return `CAST(${expr} AS INTEGER)`;
    const dec = t.match(/^(DECIMAL|NUMERIC)\s*\(\s*\d+\s*,\s*(\d+)\s*\)$/);
    if (dec) return `round(CAST(${expr} AS REAL), ${dec[2]})`;
    if (/^(DECIMAL|NUMERIC|FLOAT|REAL|DOUBLE|MONEY|SMALLMONEY)/.test(t)) return `CAST(${expr} AS REAL)`;
    return `CAST(${expr} AS ${tipo})`;
  }
  function castCall(args) {
    const m = (args[0] || '').match(/^([\s\S]*)\s+AS\s+([\s\S]+)$/i);
    return m ? castA(m[1], m[2]) : null;
  }
  // formatos de fecha
  const fmtMySQL = (f) => f.replace(/%([a-zA-Z%])/g, (m0, k) => ({ Y: '%Y', y: '%Y', m: '%m', c: '%m', d: '%d', e: '%d', H: '%H', k: '%H', i: '%M', s: '%S', S: '%S', T: '%H:%M:%S', j: '%j', '%': '%%' }[k] || m0));
  const fmtNet = (f) => f.replace(/yyyy|yy|MM|dd|HH|hh|mm|ss/g, (k) => ({ yyyy: '%Y', yy: '%Y', MM: '%m', dd: '%d', HH: '%H', hh: '%H', mm: '%M', ss: '%S' }[k]));

  // ============================================================== errores de cada motor

  const errMy = (near, consejo) => new ErrorMotor(`ERROR 1064 (42000): You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version for the right syntax to use near '${near}' at line 1` + (consejo ? `\n\n💡 ${consejo}` : ''));
  const errMyFn = (fn, consejo) => new ErrorMotor(`ERROR 1305 (42000): FUNCTION tienda.${fn} does not exist` + (consejo ? `\n\n💡 ${consejo}` : ''));
  const errMyArgs = (fn, consejo) => new ErrorMotor(`ERROR 1582 (42000): Incorrect parameter count in the call to native function '${fn}'` + (consejo ? `\n\n💡 ${consejo}` : ''));
  const errMs = (near, consejo) => new ErrorMotor(`Msg 102, Level 15, State 1, Line 1\nIncorrect syntax near '${near}'.` + (consejo ? `\n\n💡 ${consejo}` : ''));
  const errMsFn = (fn, consejo) => new ErrorMotor(`Msg 195, Level 15, State 10, Line 1\n'${fn}' is not a recognized built-in function name.` + (consejo ? `\n\n💡 ${consejo}` : ''));
  const errMsArgs = (fn, n, consejo) => new ErrorMotor(`Msg 174, Level 15, State 1, Line 1\nThe ${fn.toLowerCase()} function requires ${n} argument(s).` + (consejo ? `\n\n💡 ${consejo}` : ''));

  const NO_MYSQL = {
    GETDATE: 'En MySQL la fecha y hora actual es NOW() (o CURDATE() para solo la fecha).', SYSDATETIME: 'Usa NOW().', GETUTCDATE: 'Usa UTC_TIMESTAMP().',
    LEN: 'En MySQL el largo de un texto es CHAR_LENGTH() (LENGTH() cuenta bytes).', DATEADD: 'En MySQL: DATE_ADD(fecha, INTERVAL 7 DAY).', DATEPART: 'En MySQL: YEAR(fecha), MONTH(fecha), DAY(fecha) o EXTRACT(MONTH FROM fecha).',
    STRING_AGG: 'En MySQL se usa GROUP_CONCAT(columna SEPARATOR \', \').', IIF: 'En MySQL el condicional en una línea es IF(condición, si, no).', CHARINDEX: 'En MySQL: LOCATE(buscado, texto) o INSTR(texto, buscado).',
    DATE_TRUNC: 'MySQL no tiene DATE_TRUNC: usa DATE_FORMAT(fecha, \'%Y-%m-01\').', EOMONTH: 'En MySQL: LAST_DAY(fecha).', FORMAT_DATE: 'Usa DATE_FORMAT().', TO_CHAR: 'En MySQL: DATE_FORMAT(fecha, \'%Y-%m\').', NVL: 'En MySQL: IFNULL() o COALESCE().', DATENAME: 'En MySQL: MONTHNAME(fecha) o DAYNAME(fecha).',
  };
  const NO_MSSQL = {
    NOW: 'En SQL Server la fecha y hora actual es GETDATE() (o SYSDATETIME()).', CURDATE: 'Usa CAST(GETDATE() AS DATE).', CURRENT_DATE: 'Usa CAST(GETDATE() AS DATE).', IFNULL: 'En SQL Server: ISNULL(valor, reemplazo) o COALESCE().', NVL: 'Usa ISNULL() o COALESCE().',
    DATE_FORMAT: 'En SQL Server: FORMAT(fecha, \'yyyy-MM\') o CONVERT(VARCHAR(7), fecha, 120).', DATE_ADD: 'En SQL Server: DATEADD(day, 7, fecha).', DATE_SUB: 'En SQL Server: DATEADD(day, -7, fecha).', GROUP_CONCAT: 'En SQL Server: STRING_AGG(columna, \', \').',
    IF: 'En SQL Server el condicional en una línea es IIF(condición, si, no) o CASE WHEN.', LOCATE: 'En SQL Server: CHARINDEX(buscado, texto).', INSTR: 'En SQL Server: CHARINDEX(buscado, texto).', CHAR_LENGTH: 'En SQL Server: LEN(texto).', LENGTH: 'En SQL Server: LEN(texto) (DATALENGTH cuenta bytes).',
    DATE_TRUNC: 'En SQL Server 2022: DATETRUNC(month, fecha). En versiones anteriores: DATEFROMPARTS(YEAR(f), MONTH(f), 1).', TO_CHAR: 'Usa FORMAT(fecha, \'yyyy-MM\').', SUBSTR: 'En SQL Server: SUBSTRING(texto, inicio, largo).', RAND_: '', TIMESTAMPDIFF: 'En SQL Server: DATEDIFF(day, desde, hasta).', LAST_DAY: 'En SQL Server: EOMONTH(fecha).', TRUNCATE: 'En SQL Server: ROUND(x, 2, 1) trunca.',
  };

  // ============================================================== reglas de GROUP BY (MySQL only_full_group_by y SQL Server)

  const AGREGADOS = /\b(COUNT|SUM|AVG|MIN|MAX|GROUP_CONCAT|STRING_AGG|STDEV|STDDEV|VARIANCE|VAR|BIT_AND|BIT_OR|ANY_VALUE|JSON_ARRAYAGG|JSON_OBJECTAGG)\s*\(/i;
  function revisarGroupBy(txt, motor, columnasConocidas, pks) {
    if ((txt.match(/\bSELECT\b/gi) || []).length !== 1) return;
    const m = txt.match(/\bSELECT\s+(?:DISTINCT\s+)?(?:TOP\s+\(?\d+\)?\s+)?([\s\S]+?)\s+FROM\b[\s\S]*?\bGROUP\s+BY\s+([\s\S]+?)(?=\bHAVING\b|\bORDER\s+BY\b|\bLIMIT\b|\bOFFSET\b|;|$)/i);
    if (!m) return;
    const grupo = partirArgs(m[2]).map((g) => g.replace(/\s+/g, ' ').trim().toLowerCase());
    const grupoCols = grupo.map((g) => g.replace(/^\w+\./, ''));
    if (motor === 'mysql' && grupoCols.some((g) => pks.has(g))) return; // dependencia funcional con la clave primaria
    const items = partirArgs(m[1]);
    items.forEach((it, k) => {
      const expr = it.replace(/\s+(AS\s+)?(\w+|¤\d+¤)$/i, (m0, as, al) => (as || !/^\w+$/.test(it.trim()) ? '' : m0)).trim();
      const desnudo = expr.match(/^(?:(\w+)\.)?(\w+)$/);
      if (!desnudo || AGREGADOS.test(expr) || /\bOVER\s*\(/i.test(it) || /^\d/.test(desnudo[2])) return;
      const col = desnudo[2].toLowerCase();
      if (!columnasConocidas.has(col)) return;
      if (grupo.includes(expr.toLowerCase()) || grupoCols.includes(col)) return;
      if (motor === 'mysql') throw new ErrorMotor(`ERROR 1055 (42000): Expression #${k + 1} of SELECT list is not in GROUP BY clause and contains nonaggregated column '${expr}' which is not functionally dependent on columns in GROUP BY clause; this is incompatible with sql_mode=only_full_group_by\n\n💡 Agrega ${expr} al GROUP BY o envuélvela en una función de agregación (MIN, MAX, ANY_VALUE).`);
      throw new ErrorMotor(`Msg 8120, Level 16, State 1, Line 1\nColumn '${expr}' is invalid in the select list because it is not contained in either an aggregate function or the GROUP BY clause.\n\n💡 Agrega ${expr} al GROUP BY o envuélvela en una función de agregación.`);
    });
    if (motor === 'sqlserver') {
      const alias = new Set(items.map((it) => (it.match(/\bAS\s+(\w+)\s*$/i) || [])[1]).filter(Boolean).map((a) => a.toLowerCase()));
      for (const g of grupo) if (/^\w+$/.test(g) && alias.has(g) && !columnasConocidas.has(g)) throw new ErrorMotor(`Msg 207, Level 16, State 1, Line 1\nInvalid column name '${g}'.\n\n💡 En SQL Server el GROUP BY no acepta alias del SELECT: repite la expresión completa.`);
    }
  }

  // ============================================================== variables (DECLARE @x / SET @x)

  function sustituirVariables(sentencias, motor) {
    const vars = {};
    const salida = [];
    for (let s of sentencias) {
      const t = s.trim();
      let m;
      if (motor === 'sqlserver' && (m = t.match(/^DECLARE\s+([\s\S]+)$/i))) {
        for (const d of partirArgs(m[1])) {
          const dm = d.match(/^@(\w+)\s+[\w]+(?:\s*\([^)]*\))?(?:\s*=\s*([\s\S]+))?$/i);
          if (!dm) throw new ErrorMotor(`Msg 102, Level 15, State 1, Line 1\nIncorrect syntax near '${d.split(/\s+/)[0]}'.`);
          vars[dm[1].toLowerCase()] = dm[2] !== undefined ? `(${reemplazarVars(dm[2], vars, motor)})` : 'NULL';
        }
        continue;
      }
      if ((m = t.match(/^SET\s+@(\w+)\s*(?::=|=)\s*([\s\S]+)$/i))) { vars[m[1].toLowerCase()] = `(${reemplazarVars(m[2], vars, motor)})`; continue; }
      salida.push(reemplazarVars(s, vars, motor));
    }
    return salida;
  }
  function reemplazarVars(s, vars, motor) {
    return s.replace(/@@(\w+)|@(\w+)/g, (m0, sis, v) => {
      if (sis) {
        const k = sis.toUpperCase();
        if (k === 'VERSION') return motor === 'mysql' ? "'8.4.0 (modo compatible del curso)'" : "'Microsoft SQL Server 2022 (modo compatible del curso, ejecuta sobre SQLite)'";
        if (k === 'ROWCOUNT') return 'changes()';
        if (k === 'IDENTITY') return 'last_insert_rowid()';
        return 'NULL';
      }
      const k = v.toLowerCase();
      if (!(k in vars)) {
        if (motor === 'sqlserver') throw new ErrorMotor(`Msg 137, Level 15, State 2, Line 1\nMust declare the scalar variable "@${v}".`);
        return 'NULL';
      }
      return vars[k];
    });
  }

  // ============================================================== traducción MySQL → SQLite

  function traducirMySQL(sentencia, ctx) {
    let t = sentencia.trim();
    let m;
    if (/^SHOW\s+(FULL\s+)?TABLES$/i.test(t)) return "SELECT name AS Tables_in_tienda FROM sqlite_master WHERE type = 'table' ORDER BY name";
    if (/^SHOW\s+DATABASES$/i.test(t)) return "SELECT 'tienda' AS `Database` UNION ALL SELECT 'information_schema'".replace(/`/g, '"');
    if ((m = t.match(/^(?:DESCRIBE|DESC|SHOW\s+(?:FULL\s+)?COLUMNS\s+FROM)\s+(\w+|¤\d+¤)$/i))) return `SELECT name AS Field, type AS Type, CASE "notnull" WHEN 1 THEN 'NO' ELSE 'YES' END AS "Null", CASE pk WHEN 0 THEN '' ELSE 'PRI' END AS "Key", dflt_value AS "Default" FROM pragma_table_info('${m[1].replace(/¤(\d+)¤/, (_, k) => ctx.m.ids[k])}')`;
    if ((m = t.match(/^SHOW\s+CREATE\s+TABLE\s+(\w+)$/i))) return `SELECT name AS "Table", sql AS "Create Table" FROM sqlite_master WHERE name = '${m[1]}'`;
    if (/^USE\s+\w+$/i.test(t)) return "SELECT 'Database changed' AS mensaje";
    // lo que MySQL no acepta
    if ((m = t.match(/\bSELECT\s+(?:DISTINCT\s+)?(TOP\s+\(?\d+\)?)/i))) throw errMy(m[1], 'MySQL no tiene TOP: pon LIMIT n al final de la consulta.');
    if ((m = t.match(/\bILIKE\b/i))) throw errMy('ILIKE', 'MySQL no tiene ILIKE: LIKE ya ignora mayúsculas con la intercalación por defecto (utf8mb4_0900_ai_ci).');
    if (t.includes('::')) throw errMy(t.slice(t.indexOf('::'), t.indexOf('::') + 12), 'El operador :: es de PostgreSQL. En MySQL: CAST(valor AS tipo).');
    if ((m = t.match(/\b(FETCH\s+(?:FIRST|NEXT)\b|OFFSET\s+\d+\s+ROWS?\b)/i))) throw errMy(m[1], 'En MySQL se pagina con LIMIT filas OFFSET desde (o LIMIT desde, filas).');
    if (/\[/.test(t)) throw errMy(t.slice(t.indexOf('[')).slice(0, 12), 'En MySQL los identificadores se escriben entre backticks: `nombre`.');
    if (/\bFULL\s+(OUTER\s+)?JOIN\b/i.test(t)) throw errMy('FULL JOIN', 'MySQL no tiene FULL OUTER JOIN: se arma con LEFT JOIN UNION RIGHT JOIN.');
    revisarGroupBy(t, 'mysql', ctx.columnas, ctx.pks);
    if (/\|\|/.test(t)) ctx.avisos.push('En MySQL, || es el operador lógico OR (no concatena): el resultado es 0 o 1. Para concatenar usa CONCAT(a, b).');
    // paginación
    t = t.replace(/\bLIMIT\s+(\d+)\s*,\s*(\d+)/gi, 'LIMIT $2 OFFSET $1');
    // operadores
    // en MySQL 7 / 2 = 3.5000 (en SQLite, división entera); DIV es la división entera de MySQL
    t = t.replace(/\|\|/g, ' OR ').replace(/\//g, '* 1.0 /').replace(/\bDIV\b/gi, '/');
    t = t.replace(/\bINSERT\s+IGNORE\b/gi, 'INSERT OR IGNORE').replace(/\bAUTO_INCREMENT\b(\s*=\s*\d+)?/gi, '').replace(/\bUNSIGNED\b/gi, '').replace(/\)\s*(ENGINE|DEFAULT\s+CHARSET|CHARSET|COLLATE)\s*=?[\s\S]*$/i, ')');
    const L = ctx.lit;
    t = reescribirLlamadas(t, {
      ...Object.fromEntries(Object.entries(NO_MYSQL).map(([k, v]) => [k, () => { throw errMyFn(k, v); }])),
      ISNULL: (a) => { if (a.length !== 1) throw errMyArgs('ISNULL', 'En MySQL ISNULL(x) devuelve 1 o 0. Para reemplazar nulos usa IFNULL(x, valor) o COALESCE(x, valor).'); return `(${a[0]} IS NULL)`; },
      NOW: () => "datetime('now')", SYSDATE: () => "datetime('now')", CURRENT_TIMESTAMP: () => "datetime('now')", UTC_TIMESTAMP: () => "datetime('now')", CURDATE: () => "date('now')", CURRENT_DATE: () => "date('now')", CURTIME: () => "time('now')",
      YEAR: (a) => parte('%Y', a[0]), MONTH: (a) => parte('%m', a[0]), DAY: (a) => parte('%d', a[0]), DAYOFMONTH: (a) => parte('%d', a[0]), HOUR: (a) => parte('%H', a[0]), MINUTE: (a) => parte('%M', a[0]), SECOND: (a) => parte('%S', a[0]),
      QUARTER: (a) => `((${parte('%m', a[0])} + 2) / 3)`, DAYOFWEEK: (a) => `(${parte('%w', a[0])} + 1)`, WEEKDAY: (a) => `((${parte('%w', a[0])} + 6) % 7)`, DAYOFYEAR: (a) => parte('%j', a[0]), WEEK: (a) => parte('%W', a[0]),
      MONTHNAME: (a) => nombreMes(a[0]), DAYNAME: (a) => nombreDia(a[0]),
      DATE_FORMAT: (a) => { const f = L(a[1]); return f == null ? null : `strftime('${fmtMySQL(f)}', ${a[0]})`; },
      STR_TO_DATE: (a) => `date(${a[0]})`,
      DATEDIFF: (a) => { if (a.length !== 2) throw errMyArgs('DATEDIFF', 'En MySQL DATEDIFF(hasta, desde) recibe dos fechas y devuelve días. Para otras unidades: TIMESTAMPDIFF(MONTH, desde, hasta).'); return `CAST(julianday(date(${a[0]})) - julianday(date(${a[1]})) AS INTEGER)`; },
      TIMESTAMPDIFF: (a) => difFecha(a[0], a[1], a[2], 'mysql'),
      DATE_ADD: (a) => { const iv = a[1].match(/^INTERVAL\s+([\s\S]+?)\s+(\w+)$/i); if (!iv) throw errMy(a[1], 'DATE_ADD necesita INTERVAL: DATE_ADD(fecha, INTERVAL 7 DAY).'); return sumarFecha(a[0], iv[1], iv[2], 'mysql'); },
      ADDDATE: (a) => { const iv = a[1].match(/^INTERVAL\s+([\s\S]+?)\s+(\w+)$/i); return iv ? sumarFecha(a[0], iv[1], iv[2], 'mysql') : sumarFecha(a[0], a[1], 'DAY', 'mysql'); },
      DATE_SUB: (a) => { const iv = a[1].match(/^INTERVAL\s+([\s\S]+?)\s+(\w+)$/i); if (!iv) throw errMy(a[1], 'DATE_SUB necesita INTERVAL: DATE_SUB(fecha, INTERVAL 7 DAY).'); return sumarFecha(a[0], `-(${iv[1]})`, iv[2], 'mysql'); },
      LAST_DAY: (a) => `date(${a[0]}, 'start of month', '+1 month', '-1 day')`,
      IF: (a) => { if (a.length !== 3) throw errMyArgs('IF'); return `iif(${a.join(', ')})`; },
      CONCAT: (a) => `(${a.map((x) => `(${x})`).join(' || ')})`,
      CONCAT_WS: (a) => `concat_ws(${a.join(', ')})`,
      GROUP_CONCAT: (a) => {
        const s = a.join(', '); const sep = s.match(/\s+SEPARATOR\s+(§\d+§)\s*$/i); const cuerpo = s.replace(/\s+SEPARATOR\s+§\d+§\s*$/i, '');
        const ord = cuerpo.match(/^([\s\S]*?)\s+(ORDER\s+BY[\s\S]*)$/i); const expr = ord ? ord[1] : cuerpo; const orden = ord ? ' ' + ord[2] : '';
        // SQLite no admite DISTINCT con separador propio: se agrupa con coma y después se cambia el separador
        if (/^DISTINCT\b/i.test(expr)) return sep ? `replace(group_concat(${expr}${orden}), ',', ${sep[1]})` : `group_concat(${expr}${orden})`;
        return `group_concat(${expr}, ${sep ? sep[1] : "','"}${orden})`;
      },
      LEFT: (a) => `substr(${a[0]}, 1, ${a[1]})`, RIGHT: (a) => `substr(${a[0]}, -(${a[1]}))`, SUBSTRING: (a) => `substr(${a.join(', ')})`, MID: (a) => `substr(${a.join(', ')})`, SUBSTRING_INDEX: () => { throw errMyFn('SUBSTRING_INDEX', 'SUBSTRING_INDEX no está disponible en el modo compatible.'); },
      LOCATE: (a) => `instr(${a[1]}, ${a[0]})`, CHAR_LENGTH: (a) => `length(${a[0]})`, CHARACTER_LENGTH: (a) => `length(${a[0]})`, LCASE: (a) => `lower(${a[0]})`, UCASE: (a) => `upper(${a[0]})`,
      LPAD: (a) => `substr(replace(printf('%' || (${a[1]}) || 's', ''), ' ', ${a[2] || "' '"}) || ${a[0]}, -(${a[1]}))`,
      TRUNCATE: (a) => `(CAST((${a[0]}) * power(10, ${a[1]}) AS INTEGER) / power(10.0, ${a[1]}))`,
      RAND: () => '(abs(random()) / 9223372036854775807.0)',
      CAST: castCall, CONVERT: (a) => (a.length === 2 ? castA(a[0], a[1]) : null),
      VERSION: () => "'8.4.0 (modo compatible del curso)'", DATABASE: () => "'tienda'",
      FORMAT: (a) => `printf('%.' || (${a[1] || 0}) || 'f', ${a[0]})`,
      EXTRACT: (a) => { const x = (a[0] || '').match(/^(\w+)\s+FROM\s+([\s\S]+)$/i); if (!x) return null; const u = x[1].toUpperCase(); const f = { YEAR: '%Y', MONTH: '%m', DAY: '%d', HOUR: '%H', MINUTE: '%M', SECOND: '%S', WEEK: '%W' }[u]; if (u === 'QUARTER') return `((${parte('%m', x[2])} + 2) / 3)`; if (u === 'YEAR_MONTH') return `CAST(strftime('%Y%m', ${x[2]}) AS INTEGER)`; return f ? parte(f, x[2]) : null; },
    });
    return t;
  }

  // ============================================================== traducción SQL Server → SQLite

  function traducirTSQL(sentencia, ctx) {
    let t = sentencia.trim();
    let m;
    if ((m = t.match(/^PRINT\s+([\s\S]+)$/i))) return `SELECT ${m[1]} AS mensaje`;
    if (/^USE\s+\S+$/i.test(t)) return "SELECT 'Changed database context.' AS mensaje";
    if ((m = t.match(/^(?:EXEC(?:UTE)?\s+)?sp_(?:help|columns)\s+(§\d+§|\w+|¤\d+¤)$/i))) { const tb = m[1].replace(/§(\d+)§|¤(\d+)¤/, (_, a, b) => (a ? ctx.m.lits[a] : ctx.m.ids[b])); return `SELECT name AS Column_name, type AS Type, CASE "notnull" WHEN 1 THEN 'no' ELSE 'yes' END AS Nullable FROM pragma_table_info('${tb}')`; }
    if (/^(?:EXEC(?:UTE)?\s+)?sp_tables$/i.test(t)) return "SELECT 'tienda' AS TABLE_QUALIFIER, 'dbo' AS TABLE_OWNER, name AS TABLE_NAME, upper(type) AS TABLE_TYPE FROM sqlite_master WHERE type IN ('table', 'view') ORDER BY name";
    // lo que SQL Server no acepta
    if ((m = t.match(/\bLIMIT\b/i))) throw errMs('LIMIT', 'SQL Server no tiene LIMIT: usa SELECT TOP (n) … o ORDER BY … OFFSET 0 ROWS FETCH NEXT n ROWS ONLY.');
    if (/\bILIKE\b/i.test(t)) throw errMs('ILIKE', 'SQL Server no tiene ILIKE: LIKE ya ignora mayúsculas con la intercalación por defecto (SQL_Latin1_General_CP1_CI_AS).');
    if (t.includes('::')) throw errMs(':', 'El operador :: es de PostgreSQL. En SQL Server: CAST(valor AS tipo) o CONVERT(tipo, valor).');
    if (t.includes('`')) throw errMs('`', 'En SQL Server los identificadores van entre corchetes [nombre] o comillas dobles "nombre".');
    if (/\bNULLS\s+(FIRST|LAST)\b/i.test(t)) throw errMs('NULLS', 'SQL Server no tiene NULLS FIRST/LAST: ordena con CASE WHEN columna IS NULL THEN 1 ELSE 0 END.');
    if (/\b(CROSS|OUTER)\s+APPLY\b/i.test(t)) throw new ErrorMotor('APPLY no está disponible en el modo compatible de SQL Server. Pruébalo con una subconsulta correlacionada o una ventana con ROW_NUMBER().');
    if ((m = t.match(/\bTOP\s*\(?\s*\d+\s*\)?\s+PERCENT\b/i))) throw new ErrorMotor('TOP … PERCENT no está disponible en el modo compatible de SQL Server.');
    if (/\bWITH\s+TIES\b/i.test(t)) throw new ErrorMotor('TOP … WITH TIES no está disponible en el modo compatible de SQL Server. Equivale a filtrar con RANK() = 1..n.');
    revisarGroupBy(t, 'sqlserver', ctx.columnas, ctx.pks);
    // SELECT … INTO nueva FROM … → CREATE TABLE nueva AS SELECT … FROM …
    if ((m = t.match(/^SELECT\s+([\s\S]+?)\s+INTO\s+(#?\w+|¤\d+¤)\s+(FROM\b[\s\S]*)$/i))) t = `CREATE TABLE ${m[2]} AS SELECT ${m[1]} ${m[3]}`;
    // tablas temporales #t
    t = t.replace(/\bCREATE\s+TABLE\s+#(\w+)/gi, 'CREATE TEMP TABLE tmp_$1').replace(/#(\w+)/g, 'tmp_$1');
    t = t.replace(/\bWITH\s*\(\s*NOLOCK\s*\)/gi, '').replace(/\bIDENTITY\s*\(\s*\d+\s*,\s*\d+\s*\)/gi, '').replace(/\bdbo\./gi, '');
    // OFFSET … FETCH
    t = t.replace(/\bOFFSET\s+(\S+)\s+ROWS?\s+FETCH\s+(?:NEXT|FIRST)\s+(\S+)\s+ROWS?\s+ONLY\b/gi, 'LIMIT $2 OFFSET $1').replace(/\bOFFSET\s+(\S+)\s+ROWS?\b/gi, 'LIMIT -1 OFFSET $1');
    // TOP n → LIMIT n al cierre del mismo SELECT
    t = moverTop(t);
    // concatenación con +: si un lado es un texto literal, es concatenación
    t = t.replace(/(§\d+§)\s*\+/g, '$1 ||').replace(/\+\s*(§\d+§)/g, '|| $1');
    const L = ctx.lit;
    t = reescribirLlamadas(t, {
      ...Object.fromEntries(Object.entries(NO_MSSQL).filter(([, v]) => v).map(([k, v]) => [k, () => { throw errMsFn(k.replace(/_$/, ''), v); }])),
      GETDATE: () => "datetime('now')", SYSDATETIME: () => "datetime('now')", GETUTCDATE: () => "datetime('now')", SYSUTCDATETIME: () => "datetime('now')", CURRENT_TIMESTAMP: () => "datetime('now')",
      ISNULL: (a) => { if (a.length !== 2) throw errMsArgs('isnull', 2, 'ISNULL(valor, reemplazo).'); return `ifnull(${a[0]}, ${a[1]})`; },
      LEN: (a) => `length(rtrim(${a[0]}))`, DATALENGTH: (a) => `length(CAST(${a[0]} AS BLOB))`, CHARINDEX: (a) => `instr(${a[1]}, ${a[0]})`, SUBSTRING: (a) => `substr(${a.join(', ')})`,
      LEFT: (a) => `substr(${a[0]}, 1, ${a[1]})`, RIGHT: (a) => `substr(${a[0]}, -(${a[1]}))`, REPLICATE: (a) => `replace(printf('%' || (${a[1]}) || 's', ''), ' ', ${a[0]})`, SPACE: (a) => `printf('%' || (${a[0]}) || 's', '')`,
      YEAR: (a) => parte('%Y', a[0]), MONTH: (a) => parte('%m', a[0]), DAY: (a) => parte('%d', a[0]),
      DATEPART: (a) => { const u = String(a[0]).toLowerCase(); const map = { year: '%Y', yy: '%Y', yyyy: '%Y', month: '%m', mm: '%m', m: '%m', day: '%d', dd: '%d', d: '%d', hour: '%H', hh: '%H', minute: '%M', mi: '%M', n: '%M', second: '%S', ss: '%S', s: '%S', dayofyear: '%j', dy: '%j', y: '%j', week: '%W', wk: '%W', ww: '%W' }; if (['quarter', 'qq', 'q'].includes(u)) return `((${parte('%m', a[1])} + 2) / 3)`; if (['weekday', 'dw', 'w'].includes(u)) return `(${parte('%w', a[1])} + 1)`; if (!map[u]) throw new ErrorMotor(`Msg 155, Level 15, State 1, Line 1\n'${a[0]}' is not a recognized datepart option.`); return parte(map[u], a[1]); },
      DATENAME: (a) => { const u = String(a[0]).toLowerCase(); if (['month', 'mm', 'm'].includes(u)) return nombreMes(a[1]); if (['weekday', 'dw', 'w'].includes(u)) return nombreDia(a[1]); return `CAST(${parte({ year: '%Y', yy: '%Y', day: '%d', dd: '%d' }[u] || '%Y', a[1])} AS TEXT)`; },
      DATEADD: (a) => { if (a.length !== 3) throw errMsArgs('dateadd', 3); return sumarFecha(a[2], a[1], a[0], 'sqlserver'); },
      DATEDIFF: (a) => { if (a.length !== 3) throw errMsArgs('datediff', 3, 'DATEDIFF(day, desde, hasta): la unidad va primero.'); return difFecha(a[0], a[1], a[2], 'sqlserver'); },
      EOMONTH: (a) => `date(${a[0]}, 'start of month', '+1 month', '-1 day')`,
      DATEFROMPARTS: (a) => `printf('%04d-%02d-%02d', ${a.join(', ')})`,
      DATETRUNC: (a) => { const u = String(a[0]).toLowerCase(); if (['month', 'mm', 'm'].includes(u)) return `date(${a[1]}, 'start of month')`; if (['year', 'yy', 'yyyy'].includes(u)) return `date(${a[1]}, 'start of year')`; if (['day', 'dd', 'd'].includes(u)) return `date(${a[1]})`; return null; },
      FORMAT: (a) => { const f = L(a[1]); if (f == null) return null; const n = f.match(/^[NnFf](\d+)$/); if (n) return `printf('%.${n[1]}f', ${a[0]})`; if (/^[Pp]\d*$/.test(f)) return `printf('%.${f.slice(1) || 2}f %%', (${a[0]}) * 100)`; return `strftime('${fmtNet(f)}', ${a[0]})`; },
      CONVERT: (a) => { const tipo = a[0]; const estilo = a[2]; if (estilo && /CHAR/i.test(tipo)) { const st = Number(estilo); if ([23, 120, 126, 112].includes(st)) { const largo = (tipo.match(/\((\d+)\)/) || [])[1]; const base = st === 112 ? `strftime('%Y%m%d', ${a[1]})` : st === 23 ? `date(${a[1]})` : `strftime('%Y-%m-%d %H:%M:%S', ${a[1]})`; return largo ? `substr(${base}, 1, ${largo})` : base; } } return castA(a[1], tipo); },
      CAST: castCall, TRY_CAST: castCall, TRY_CONVERT: (a) => castA(a[1], a[0]),
      STRING_AGG: (a) => `group_concat(${a[0]}, ${a[1] || "','"})`,
      NEWID: () => 'lower(hex(randomblob(16)))', RAND: () => '(abs(random()) / 9223372036854775807.0)',
      CONCAT: (a) => `(${a.map((x) => `COALESCE(CAST(${x} AS TEXT), '')`).join(' || ')})`,
      SQUARE: (a) => `((${a[0]}) * (${a[0]}))`,
    });
    // STRING_AGG(...) WITHIN GROUP (ORDER BY …) → group_concat(… ORDER BY …)
    t = t.replace(/group_concat\(([\s\S]*?)\)\s*WITHIN\s+GROUP\s*\(\s*(ORDER\s+BY[^)]*)\)/gi, 'group_concat($1 $2)');
    return t;
  }
  // SELECT TOP (n) … → SELECT … LIMIT n, al final del mismo nivel de paréntesis
  function moverTop(t) {
    const re = /\bSELECT(\s+DISTINCT)?\s+TOP\s*(\(|\d+)/i;
    let m;
    while ((m = re.exec(t))) {
      const ini = m.index;
      let n, cuerpoIni;
      if (m[2] === '(') { const abre = ini + m[0].length - 1, cierra = cierreDe(t, abre); n = t.slice(abre + 1, cierra).trim(); cuerpoIni = cierra + 1; } else { n = m[2]; cuerpoIni = ini + m[0].length; }
      cuerpoIni += (t.slice(cuerpoIni).match(/^\s*/) || [''])[0].length;
      let p = 0, fin = t.length;
      for (let i = cuerpoIni; i < t.length; i++) {
        if (t[i] === '(') p++;
        else if (t[i] === ')') { if (p === 0) { fin = i; break; } p--; }
        else if (p === 0 && /\b(UNION|EXCEPT|INTERSECT)\b/i.test(t.slice(i, i + 10)) && /\W/.test(t[i - 1] || ' ')) { fin = i; break; }
      }
      const cuerpo = t.slice(cuerpoIni, fin).replace(/\s+$/, '');
      t = t.slice(0, ini) + `SELECT${m[1] || ''} ` + cuerpo + ` LIMIT ${n} ` + t.slice(fin);
    }
    return t;
  }

  // ============================================================== ejecución en modo compatible

  function partirSentencias(txt, motor) {
    const t = motor === 'sqlserver' ? txt.replace(/^\s*GO\s*$/gim, ';') : txt;
    const r = []; let p = 0, cur = '';
    for (const ch of t) { if (ch === '(') p++; else if (ch === ')') p--; if (ch === ';' && p === 0) { if (cur.trim()) r.push(cur); cur = ''; } else cur += ch; }
    if (cur.trim()) r.push(cur);
    if (motor !== 'sqlserver') return r;
    // T-SQL no exige ";": DECLARE, SET @, PRINT, USE y EXEC son sentencias completas en su línea,
    // así que lo que viene después de ellas empieza una sentencia nueva
    const sueltas = /^\s*(DECLARE|SET\s+@|PRINT|USE|EXEC(UTE)?)\b/i;
    const comienzo = /^\s*(DECLARE|SET\s+@|PRINT|USE|EXEC(UTE)?|SELECT|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|WITH|TRUNCATE|MERGE)\b/i;
    const out = [];
    for (const s of r) {
      let actual = '';
      for (const linea of s.split('\n')) {
        if (actual.trim() && comienzo.test(linea) && (sueltas.test(linea) || sueltas.test(actual))) { out.push(actual); actual = ''; }
        actual += (actual ? '\n' : '') + linea;
      }
      if (actual.trim()) out.push(actual);
    }
    return out;
  }

  let metaCache = null;
  function metadatos() {
    if (metaCache) return metaCache;
    const T = (window.Engines && window.Engines.SQL.tables) || {};
    const columnas = new Set(), pks = new Set();
    for (const t of Object.values(T)) { t.columns.forEach((c) => columnas.add(c.toLowerCase())); if (t.columns[0]) pks.add(t.columns[0].toLowerCase()); }
    metaCache = { columnas, pks };
    return metaCache;
  }

  function traducir(sql, motor) {
    let m;
    try { m = enmascarar(sql, motor); } catch (e) {
      if (e.message === '__comilla__') throw new ErrorMotor(motor === 'mysql' ? 'ERROR 1064 (42000): You have an error in your SQL syntax; falta cerrar una comilla.' : "Msg 105, Level 15, State 1, Line 1\nUnclosed quotation mark after the character string.");
      throw e;
    }
    const avisos = [];
    const ctx = { m, avisos, lit: (a) => { const x = String(a).trim().match(/^§(\d+)§$/); return x ? m.lits[x[1]] : null; }, ...metadatos() };
    let sentencias = partirSentencias(m.txt, motor);
    sentencias = sustituirVariables(sentencias, motor);
    const trad = sentencias.map((s) => (motor === 'mysql' ? traducirMySQL(s, ctx) : traducirTSQL(s, ctx)));
    return { sql: trad.map((s) => desenmascarar(s, m).trim()).filter(Boolean).join(';\n') + ';', avisos };
  }

  // INFORMATION_SCHEMA (y sys en SQL Server) como bases adjuntas, para que esas consultas funcionen
  function prepararCatalogo(db, sql, motor) {
    const usaIS = /information_schema\s*\./i.test(sql), usaSys = motor === 'sqlserver' && /\bsys\s*\.\s*(tables|columns|objects)\b/i.test(sql);
    if (!usaIS && !usaSys) return;
    const adjuntas = db.exec('PRAGMA database_list')[0].values.map((v) => v[1]);
    const cols = "SELECT 'tienda' AS table_catalog, 'dbo' AS table_schema, m.name AS table_name, p.name AS column_name, p.cid + 1 AS ordinal_position, p.dflt_value AS column_default, CASE p.\"notnull\" WHEN 1 THEN 'NO' ELSE 'YES' END AS is_nullable, lower(p.type) AS data_type FROM main.sqlite_master m, pragma_table_info(m.name) p WHERE m.type IN ('table', 'view')";
    if (usaIS) {
      if (!adjuntas.includes('information_schema')) db.run("ATTACH DATABASE ':memory:' AS information_schema");
      db.exec(`DROP TABLE IF EXISTS information_schema.tables; CREATE TABLE information_schema.tables AS SELECT 'tienda' AS table_catalog, '${motor === 'mysql' ? 'tienda' : 'dbo'}' AS table_schema, name AS table_name, CASE type WHEN 'view' THEN 'VIEW' ELSE 'BASE TABLE' END AS table_type FROM main.sqlite_master WHERE type IN ('table', 'view');
        DROP TABLE IF EXISTS information_schema.columns; CREATE TABLE information_schema.columns AS ${cols};`);
    }
    if (usaSys) {
      if (!adjuntas.includes('sys')) db.run("ATTACH DATABASE ':memory:' AS sys");
      db.exec(`DROP TABLE IF EXISTS sys.tables; CREATE TABLE sys.tables AS SELECT rowid AS object_id, name, 'U' AS type, 'USER_TABLE' AS type_desc FROM main.sqlite_master WHERE type = 'table';
        DROP TABLE IF EXISTS sys.objects; CREATE TABLE sys.objects AS SELECT rowid AS object_id, name, CASE type WHEN 'view' THEN 'V' ELSE 'U' END AS type FROM main.sqlite_master WHERE type IN ('table', 'view');
        DROP TABLE IF EXISTS sys.columns; CREATE TABLE sys.columns AS SELECT m.rowid AS object_id, p.name, p.cid + 1 AS column_id, p.type AS type_name FROM main.sqlite_master m, pragma_table_info(m.name) p WHERE m.type = 'table';`);
    }
  }

  // funciones matemáticas que el sql.js del curso no trae compiladas
  const conMath = new WeakSet();
  function registrarFunciones(db) {
    if (conMath.has(db)) return;
    const f = (n, fn) => { try { db.create_function(n, fn); } catch (e) { /* ya existe */ } };
    f('power', (a, b) => (a == null || b == null ? null : Math.pow(a, b))); f('pow', (a, b) => (a == null || b == null ? null : Math.pow(a, b)));
    f('sqrt', (a) => (a == null ? null : Math.sqrt(a))); f('ln', (a) => (a == null ? null : Math.log(a))); f('log10', (a) => (a == null ? null : Math.log10(a)));
    f('exp', (a) => (a == null ? null : Math.exp(a))); f('ceiling', (a) => (a == null ? null : Math.ceil(a))); f('ceil', (a) => (a == null ? null : Math.ceil(a))); f('floor', (a) => (a == null ? null : Math.floor(a)));
    f('sign', (a) => (a == null ? null : Math.sign(a))); f('pi', () => Math.PI); f('mod', (a, b) => (a == null || b == null ? null : a % b));
    conMath.add(db);
  }

  function ejecutarCompatible(sql, motor) {
    const SQL = window.Engines.SQL;
    const t0 = performance.now();
    let tr;
    try { tr = traducir(sql, motor); } catch (e) {
      if (!(e instanceof ErrorMotor)) throw e;
      return { ok: false, error: e.message, ms: performance.now() - t0 };
    }
    const db = SQL.playground();
    registrarFunciones(db);
    try { prepararCatalogo(db, tr.sql, motor); } catch (e) { /* si falla, la consulta mostrará el error */ }
    const r = SQL.exec(tr.sql, db);
    r.traducido = tr.sql; r.avisos = tr.avisos;
    if (!r.ok) r.error = adaptarError(r.error, motor);
    return r;
  }
  // los errores de SQLite se presentan con el formato del motor elegido
  function adaptarError(msg, motor) {
    const tabla = msg.match(/La tabla "(\w+)" no existe/), col = msg.match(/La columna "([\w.]+)" no existe/);
    if (motor === 'mysql') {
      if (tabla) return `ERROR 1146 (42S02): Table 'tienda.${tabla[1]}' doesn't exist\n\n💡 ${msg}`;
      if (col) return `ERROR 1054 (42S22): Unknown column '${col[1]}' in 'field list'\n\n💡 ${msg}`;
      return `ERROR 1064 (42000): ${msg}`;
    }
    if (tabla) return `Msg 208, Level 16, State 1, Line 1\nInvalid object name '${tabla[1]}'.\n\n💡 ${msg}`;
    if (col) return `Msg 207, Level 16, State 1, Line 1\nInvalid column name '${col[1].split('.').pop()}'.\n\n💡 ${msg}`;
    return `Msg 102, Level 15, State 1, Line 1\n${msg}`;
  }

  // ============================================================== PostgreSQL real con PGlite

  const PG = {
    _db: null, _cargando: null, _mod: null,
    estado: 'sin cargar',
    async init(progreso = () => {}) {
      if (this._db) return this._db;
      if (this._cargando) return this._cargando;
      this._cargando = (async () => {
        progreso('Descargando PostgreSQL 17 (PGlite, unos 6 MB comprimidos)…');
        this._mod = this._mod || await import(/* webpackIgnore: true */ PGLITE_URL);
        const { PGlite, types } = this._mod;
        const id = (v) => v;
        const db = new PGlite({ parsers: { [types.DATE]: id, [types.TIMESTAMP]: id, [types.TIMESTAMPTZ]: id, [types.TIME]: id, [types.NUMERIC]: (v) => Number(v), [types.INT8]: (v) => Number(v) } });
        await db.waitReady;
        progreso('Creando las tablas del dataset…');
        const SQL = window.Engines.SQL; if (!SQL._bytes) await SQL.init();
        const T = SQL.tables;
        const fecha = /^\d{4}-\d{2}-\d{2}$/, fechaHora = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/;
        let total = 0, hechas = 0;
        const nombres = Object.keys(T);
        for (const nombre of nombres) {
          const t = T[nombre];
          const tipos = t.columns.map((c, j) => {
            const vals = t.rows.map((r) => r[j]).filter((v) => v !== null && v !== undefined && v !== '');
            if (!vals.length) return 'TEXT';
            if (vals.every((v) => typeof v === 'number')) return vals.every((v) => Number.isInteger(v)) ? (vals.some((v) => Math.abs(v) > 2147483647) ? 'BIGINT' : 'INTEGER') : 'NUMERIC';
            if (vals.every((v) => typeof v === 'string' && fecha.test(v))) return 'DATE';
            if (vals.every((v) => typeof v === 'string' && (fechaHora.test(v) || fecha.test(v)))) return 'TIMESTAMP';
            return 'TEXT';
          });
          const pk = t.columns[0] && /_id$/.test(t.columns[0]) && new Set(t.rows.map((r) => r[0])).size === t.rows.length ? `, PRIMARY KEY ("${t.columns[0]}")` : '';
          await db.exec(`CREATE TABLE "${nombre}" (${t.columns.map((c, j) => `"${c}" ${tipos[j]}`).join(', ')}${pk})`);
          if (t.rows.length) {
            const q = (v) => (v === null || v === undefined ? '' : typeof v === 'number' ? String(v) : `"${String(v).replace(/"/g, '""')}"`);
            const csv = t.rows.map((r) => r.map(q).join(',')).join('\n') + '\n';
            await db.query(`COPY "${nombre}" FROM '/dev/blob' WITH (FORMAT csv)`, [], { blob: new Blob([csv]) });
          }
          total += t.rows.length; hechas++;
          if (hechas % 6 === 0) progreso(`Cargando datos: ${hechas} de ${nombres.length} tablas (${total.toLocaleString('es')} filas)…`);
        }
        for (const v of (window.DataGen.VIEWS || '').split(';').map((x) => x.trim()).filter(Boolean)) { try { await db.exec(v); } catch (e) { /* vista con sintaxis propia de SQLite */ } }
        await db.exec('ANALYZE');
        this._db = db; this.estado = 'listo';
        return db;
      })();
      this._cargando.catch(() => { this._cargando = null; });
      return this._cargando;
    },
    async exec(sql) {
      const t0 = performance.now();
      try {
        const res = await this._db.exec(sql, { rowMode: 'array' });
        const cel = (v) => (v === null || v === undefined ? null : typeof v === 'object' ? JSON.stringify(v) : typeof v === 'boolean' ? (v ? 'true' : 'false') : v);
        const results = res.filter((r) => r.fields && r.fields.length).map((r) => ({ columns: r.fields.map((f) => f.name), values: r.rows.map((fila) => fila.map(cel)) }));
        const changes = res.filter((r) => !(r.fields && r.fields.length)).reduce((s, r) => s + (r.affectedRows || 0), 0);
        return { ok: true, results, changes, ms: performance.now() - t0 };
      } catch (e) {
        return { ok: false, error: errorPg(e, sql), ms: performance.now() - t0 };
      }
    },
    async reiniciar(progreso) { if (this._db) { try { await this._db.close(); } catch (e) { /* ya cerrada */ } } this._db = null; this._cargando = null; return this.init(progreso); },
  };
  function errorPg(e, sql) {
    let msg = `ERROR:  ${e.message}`;
    if (e.position) {
      const pos = Number(e.position) - 1, ini = sql.lastIndexOf('\n', pos) + 1, fin = sql.indexOf('\n', pos);
      const linea = sql.slice(ini, fin < 0 ? undefined : fin);
      msg += `\nLINE ${sql.slice(0, ini).split('\n').length}: ${linea}\n${' '.repeat(String(sql.slice(0, ini).split('\n').length).length + 7 + (pos - ini))}^`;
    }
    if (e.hint) msg += `\nHINT:  ${e.hint}`;
    if (e.detail) msg += `\nDETAIL:  ${e.detail}`;
    const tips = [
      [/function round\(double precision, integer\)/, 'ROUND(x, 2) en PostgreSQL necesita NUMERIC: escribe ROUND(x::numeric, 2) o ROUND(CAST(x AS numeric), 2).'],
      [/must appear in the GROUP BY clause/, 'Toda columna del SELECT que no esté dentro de una agregación debe ir en el GROUP BY.'],
      [/operator does not exist: (date|timestamp without time zone|text) [-+] integer/, 'Para sumar días: fecha + INTERVAL \'7 days\' (o fecha + 7 si la columna es DATE).'],
      [/operator does not exist: text/, 'Hay una comparación o cálculo entre tipos distintos: convierte con ::tipo o CAST.'],
      [/column "(\w+)" does not exist/, 'Revisa el nombre. Ojo: en PostgreSQL las comillas dobles distinguen mayúsculas ("Nombre" ≠ nombre) y los textos van con comillas simples.'],
      [/relation "(\w+)" does not exist/, 'La tabla no existe. Mira el panel de tablas.'],
      [/syntax error at or near "TOP"/i, 'PostgreSQL no tiene TOP: usa LIMIT n al final.'],
      [/syntax error at or near "`"/, 'En PostgreSQL los identificadores van entre comillas dobles, no backticks.'],
      [/function (ifnull|isnull|nvl)\(/i, 'En PostgreSQL se usa COALESCE(valor, reemplazo).'],
      [/function (getdate|now_)\(\)/i, 'En PostgreSQL: NOW() o CURRENT_DATE.'],
      [/function date_format\(/i, 'En PostgreSQL: TO_CHAR(fecha, \'YYYY-MM\') o DATE_TRUNC(\'month\', fecha).'],
      [/function datediff\(/i, 'En PostgreSQL se restan las fechas: fecha_fin - fecha_inicio (días) o AGE(fin, inicio).'],
      [/function (group_concat|string_agg)\(/i, 'En PostgreSQL: STRING_AGG(columna, \', \' ORDER BY …). Si la columna no es texto, conviértela con ::text.'],
      [/division by zero/, 'Protege la división con NULLIF(divisor, 0).'],
    ];
    if (/syntax error/.test(e.message) && /\bSELECT\s+(DISTINCT\s+)?TOP\b/i.test(sql)) return msg + '\n\n💡 PostgreSQL no tiene TOP: usa LIMIT n al final de la consulta.';
    if (/syntax error at or near "\["/.test(e.message)) return msg + '\n\n💡 Los corchetes son de SQL Server. En PostgreSQL los identificadores van entre comillas dobles.';
    for (const [re, tip] of tips) if (re.test(e.message)) { msg += `\n\n💡 ${tip}`; break; }
    return msg;
  }

  // ============================================================== ejemplos por motor

  const EJEMPLOS = {
    postgres: [
      ['Ventas por mes con DATE_TRUNC', `-- Las fechas son DATE de verdad: DATE_TRUNC, EXTRACT e INTERVAL funcionan directo
SELECT DATE_TRUNC('month', p.fecha_pedido)::date AS mes,
       COUNT(DISTINCT p.pedido_id) AS pedidos,
       ROUND(SUM(d.cantidad * d.precio_unitario)::numeric, 2) AS ventas
FROM pedidos p
JOIN detalle_pedidos d ON d.pedido_id = p.pedido_id
WHERE p.estado <> 'cancelado'
GROUP BY 1
ORDER BY 1
LIMIT 12;`],
      ['FILTER: varios conteos en una pasada', `SELECT pais,
       COUNT(*) AS clientes,
       COUNT(*) FILTER (WHERE segmento = 'Corporativo') AS corporativos,
       ROUND(100.0 * COUNT(*) FILTER (WHERE segmento = 'Corporativo') / COUNT(*), 1) AS pct_corporativo
FROM clientes
GROUP BY pais
ORDER BY clientes DESC;`],
      ['DISTINCT ON: último pedido de cada cliente', `-- DISTINCT ON es exclusivo de PostgreSQL: se queda con la primera fila de cada grupo según el ORDER BY
SELECT DISTINCT ON (cliente_id)
       cliente_id, pedido_id, fecha_pedido, estado
FROM pedidos
ORDER BY cliente_id, fecha_pedido DESC
LIMIT 15;`],
      ['ILIKE, STRING_AGG y arreglos', `SELECT c.pais,
       STRING_AGG(DISTINCT c.ciudad, ', ' ORDER BY c.ciudad) AS ciudades,
       ARRAY_AGG(c.cliente_id ORDER BY c.cliente_id) FILTER (WHERE c.nombre ILIKE 'a%') AS ids_nombre_con_a
FROM clientes c
GROUP BY c.pais;`],
      ['Calendario con generate_series', `-- Días sin pedidos: se arma el calendario completo y se cruza con LEFT JOIN
WITH dias AS (
  SELECT generate_series(DATE '2024-12-01', DATE '2024-12-31', INTERVAL '1 day')::date AS dia
)
SELECT d.dia, COUNT(p.pedido_id) AS pedidos
FROM dias d
LEFT JOIN pedidos p ON p.fecha_pedido::date = d.dia
GROUP BY d.dia
ORDER BY d.dia;`],
      ['JSONB: construir documentos', `SELECT jsonb_build_object(
         'cliente', c.nombre || ' ' || c.apellido,
         'pais', c.pais,
         'pedidos', COUNT(p.pedido_id)
       ) AS documento
FROM clientes c
LEFT JOIN pedidos p ON p.cliente_id = c.cliente_id
GROUP BY c.cliente_id
ORDER BY COUNT(p.pedido_id) DESC
LIMIT 5;`],
      ['EXPLAIN ANALYZE e índices', `-- Mira el plan sin índice (Seq Scan)…
EXPLAIN ANALYZE SELECT * FROM pedidos WHERE cliente_id = 42;

-- …crea el índice y vuelve a mirar (Index Scan o Bitmap Index Scan)
CREATE INDEX IF NOT EXISTS ix_pedidos_cliente ON pedidos (cliente_id);
EXPLAIN ANALYZE SELECT * FROM pedidos WHERE cliente_id = 42;`],
      ['Errores típicos: ROUND con double', `-- En PostgreSQL ROUND(x, 2) solo existe para NUMERIC.
-- Ejecuta y lee el error; después agrega ::numeric
SELECT ROUND(AVG(salario)::float, 2) FROM empleados;`],
    ],
    mysql: [
      ['LIMIT con desplazamiento', `-- MySQL acepta LIMIT filas OFFSET desde y también LIMIT desde, filas
SELECT producto_id, nombre, precio
FROM productos
ORDER BY precio DESC
LIMIT 10, 5;  -- salta 10, trae 5`],
      ['DATE_FORMAT y DATEDIFF', `SELECT DATE_FORMAT(fecha_pedido, '%Y-%m') AS mes,
       COUNT(*) AS pedidos,
       MIN(DATEDIFF(CURDATE(), fecha_pedido)) AS dias_desde_el_ultimo
FROM pedidos
GROUP BY DATE_FORMAT(fecha_pedido, '%Y-%m')
ORDER BY mes DESC
LIMIT 6;`],
      ['IFNULL, IF y CONCAT', `SELECT CONCAT(nombre, ' ', apellido) AS empleado,
       IFNULL(fecha_salida, 'activo') AS salida,
       IF(salario > 3000, 'alto', 'normal') AS banda
FROM empleados
LIMIT 10;`],
      ['GROUP_CONCAT con SEPARATOR', `SELECT pais,
       GROUP_CONCAT(DISTINCT ciudad ORDER BY ciudad SEPARATOR ' | ') AS ciudades
FROM clientes
GROUP BY pais;`],
      ['DATE_ADD con INTERVAL', `SELECT pedido_id, fecha_pedido,
       DATE_ADD(fecha_pedido, INTERVAL 30 DAY) AS vence,
       LAST_DAY(fecha_pedido) AS fin_de_mes
FROM pedidos
LIMIT 5;`],
      ['SHOW TABLES y DESCRIBE', `SHOW TABLES;
DESCRIBE pedidos;`],
      ['Error típico: ONLY_FULL_GROUP_BY', `-- MySQL 8 rechaza columnas del SELECT que no estén en el GROUP BY ni agregadas.
-- Ejecuta, lee el error y arréglalo.
SELECT pais, ciudad, COUNT(*) AS clientes
FROM clientes
GROUP BY pais;`],
      ['Error típico: || no concatena', `-- En MySQL || es OR lógico. Compara con CONCAT().
SELECT nombre || ' ' || apellido AS con_barras,
       CONCAT(nombre, ' ', apellido) AS con_concat
FROM clientes
LIMIT 3;`],
    ],
    sqlserver: [
      ['TOP con ORDER BY', `SELECT TOP (10) producto_id, nombre, precio
FROM productos
ORDER BY precio DESC;`],
      ['Paginación con OFFSET … FETCH', `SELECT producto_id, nombre, precio
FROM productos
ORDER BY precio DESC
OFFSET 10 ROWS FETCH NEXT 5 ROWS ONLY;`],
      ['DATEADD, DATEDIFF y FORMAT', `SELECT TOP 5 pedido_id,
       fecha_pedido,
       DATEADD(day, 30, fecha_pedido) AS vence,
       DATEDIFF(day, fecha_pedido, GETDATE()) AS dias_transcurridos,
       FORMAT(fecha_pedido, 'yyyy-MM') AS mes
FROM pedidos
ORDER BY fecha_pedido DESC;`],
      ['ISNULL, IIF y concatenación con +', `SELECT TOP 10 [nombre] + ' ' + [apellido] AS empleado,
       ISNULL(fecha_salida, 'activo') AS salida,
       IIF(salario > 3000, 'alto', 'normal') AS banda
FROM dbo.empleados;`],
      ['Variables con DECLARE', `DECLARE @desde DATE = '2024-12-01';
DECLARE @minimo INT = 3;

SELECT cliente_id, COUNT(*) AS pedidos
FROM pedidos
WHERE fecha_pedido >= @desde
GROUP BY cliente_id
HAVING COUNT(*) >= @minimo
ORDER BY pedidos DESC;`],
      ['STRING_AGG y CONVERT', `SELECT pais,
       STRING_AGG(ciudad, ', ') WITHIN GROUP (ORDER BY ciudad) AS ciudades
FROM (SELECT DISTINCT pais, ciudad FROM clientes) AS c
GROUP BY pais;

SELECT TOP 5 cliente_id,
       CONVERT(VARCHAR(10), fecha_registro, 23) AS registro,
       CONVERT(VARCHAR(8), fecha_registro, 112) AS registro_compacto
FROM clientes
ORDER BY fecha_registro;`],
      ['Tabla temporal e INFORMATION_SCHEMA', `SELECT pais, COUNT(*) AS clientes
INTO #por_pais
FROM clientes
GROUP BY pais;

SELECT * FROM #por_pais ORDER BY clientes DESC;

SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'pedidos';`],
      ['Error típico: LIMIT no existe', `-- SQL Server no tiene LIMIT. Ejecuta, lee el error y reescríbelo con TOP.
SELECT nombre, precio
FROM productos
ORDER BY precio DESC
LIMIT 5;`],
      ['Error típico: alias en GROUP BY', `-- SQL Server no acepta alias del SELECT en el GROUP BY
SELECT YEAR(fecha_pedido) AS anio, COUNT(*) AS pedidos
FROM pedidos
GROUP BY anio;`],
    ],
  };

  // tabla comparativa de sintaxis
  const COMPARATIVA = [
    ['Primeras n filas', 'LIMIT 10', 'LIMIT 10', 'LIMIT 10', 'TOP (10)'],
    ['Paginar', 'LIMIT 10 OFFSET 20', 'LIMIT 10 OFFSET 20', 'LIMIT 20, 10', 'OFFSET 20 ROWS FETCH NEXT 10 ROWS ONLY'],
    ['Fecha y hora actual', "datetime('now')", 'NOW()', 'NOW()', 'GETDATE()'],
    ['Fecha de hoy', "date('now')", 'CURRENT_DATE', 'CURDATE()', 'CAST(GETDATE() AS DATE)'],
    ['Sumar 7 días', "date(f, '+7 days')", "f + INTERVAL '7 days'", 'DATE_ADD(f, INTERVAL 7 DAY)', 'DATEADD(day, 7, f)'],
    ['Días entre fechas', 'julianday(b) - julianday(a)', 'b - a', 'DATEDIFF(b, a)', 'DATEDIFF(day, a, b)'],
    ['Año-mes como texto', "strftime('%Y-%m', f)", "TO_CHAR(f, 'YYYY-MM')", "DATE_FORMAT(f, '%Y-%m')", "FORMAT(f, 'yyyy-MM')"],
    ['Primer día del mes', "date(f, 'start of month')", "DATE_TRUNC('month', f)", "DATE_FORMAT(f, '%Y-%m-01')", 'DATETRUNC(month, f)'],
    ['Reemplazar NULL', 'IFNULL / COALESCE', 'COALESCE', 'IFNULL / COALESCE', 'ISNULL / COALESCE'],
    ['Concatenar', "a || ' ' || b", "a || ' ' || b", "CONCAT(a, ' ', b)", "a + ' ' + b / CONCAT"],
    ['Largo de un texto', 'LENGTH(s)', 'LENGTH(s)', 'CHAR_LENGTH(s)', 'LEN(s)'],
    ['Lista separada por comas', "GROUP_CONCAT(x, ', ')", "STRING_AGG(x, ', ')", "GROUP_CONCAT(x SEPARATOR ', ')", "STRING_AGG(x, ', ')"],
    ['Condicional corto', 'IIF(c, a, b)', 'CASE WHEN c THEN a ELSE b END', 'IF(c, a, b)', 'IIF(c, a, b)'],
    ['Convertir tipo', 'CAST(x AS TEXT)', 'x::text o CAST', 'CAST(x AS CHAR)', 'CAST / CONVERT(VARCHAR, x)'],
    ['Identificador con espacios', '"mi columna"', '"mi columna"', '`mi columna`', '[mi columna]'],
    ['Búsqueda sin mayúsculas', 'LIKE (ASCII)', 'ILIKE', 'LIKE', 'LIKE'],
    ['Autoincremental', 'INTEGER PRIMARY KEY', 'GENERATED ALWAYS AS IDENTITY', 'AUTO_INCREMENT', 'IDENTITY(1,1)'],
    ['Insertar o actualizar', 'ON CONFLICT DO UPDATE', 'ON CONFLICT DO UPDATE / MERGE', 'ON DUPLICATE KEY UPDATE', 'MERGE'],
  ];

  async function ejecutar(motor, sql, progreso) {
    if (motor === 'postgres') { await PG.init(progreso); return PG.exec(sql); }
    if (motor === 'mysql' || motor === 'sqlserver') return ejecutarCompatible(sql, motor);
    return window.Engines.SQL.exec(sql, window.Engines.SQL.playground());
  }

  window.SqlMotores = { MOTORES, EJEMPLOS, COMPARATIVA, PG, ejecutar, traducir, PGLITE_URL };
})();
