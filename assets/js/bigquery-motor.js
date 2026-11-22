/* Motor de la réplica de BigQuery (práctica). No es BigQuery: es una simulación educativa que corre en el navegador
 * sobre DuckDB-WASM (assets/js/sql-motores.js).
 *
 * Lo que agrega encima de DuckDB:
 * - Proyecto → datasets → tablas, con el SQL de BigQuery (GoogleSQL) traducido: backticks, INT64/STRING/FLOAT64,
 *   SAFE_DIVIDE, COUNTIF, DATE_TRUNC(fecha, MONTH), DATE_DIFF, DATE_ADD, FORMAT_DATE, SELECT * EXCEPT(...)…
 * - La estimación de bytes antes de ejecutar (dry run): solo cuentan las columnas que la consulta toca y, en tablas
 *   particionadas, solo las particiones que deja pasar el filtro. Es lo que BigQuery cobra en el modelo on-demand.
 * - MERGE, STRUCT, UNNEST, ARRAY_AGG(… LIMIT n), INFORMATION_SCHEMA (TABLES, COLUMNS, JOBS) y FOR SYSTEM_TIME AS OF.
 * - Tablas particionadas y con clustering (PARTITION BY, CLUSTER BY, require_partition_filter), caché de resultados
 *   (la misma consulta sin cambios en las tablas cuesta 0 B), historial de jobs y cargas desde archivo.
 * Lo que el alumno crea se vuelve a construir al recargar, repitiendo las sentencias que cambiaron datos.
 */
(function () {
  'use strict';
  const PROYECTO = 'tienda-andina-dev';
  const USUARIO = 'alumno@tienda-andina.example';
  const USD_POR_TIB = 6.25, TIB = 1024 ** 4, MIN_FACTURADO = 10 * 1024 * 1024;
  const TABLAS_INICIALES = ['clientes', 'productos', 'categorias', 'empleados', 'pedidos', 'detalle_pedidos', 'pagos'];
  let Store = null, con = null, cargando = null, version = 1;
  const oyentes = new Set(); const cacheTam = {}; const cacheRes = new Map();

  const EJEMPLO_INICIAL = `-- Bienvenido a BigQuery de práctica. Arriba a la derecha ves cuántos datos va a
-- procesar la consulta ANTES de ejecutarla: eso es lo que BigQuery cobra.
-- Prueba cambiar las columnas por * y mira cómo sube.
SELECT canal, COUNT(*) AS pedidos
FROM \`tienda-andina-dev.tienda.pedidos\`
WHERE fecha_pedido >= '2024-01-01'
GROUP BY canal
ORDER BY pedidos DESC;
`;

  function st() {
    const d = (Store.data.bigquery = Store.data.bigquery || {});
    d.consultas = d.consultas || [{ id: 'q1', nombre: 'Mi primera consulta', sql: EJEMPLO_INICIAL, creada: Date.now() }];
    d.jobs = d.jobs || []; d.replay = d.replay || []; d.meta = d.meta || {}; d.seq = d.seq || 1;
    d.abiertos = d.abiertos || { tienda: true };
    d.vinculados = d.vinculados || {}; d.programadas = d.programadas || []; d.transferencias = d.transferencias || []; d.dataform = d.dataform || null; d.capacidad = d.capacidad || { reservas: [], compromisos: [] }; d.exchanges = d.exchanges || [];
    return d;
  }
  const guardar = () => { try { Store.saveSoon ? Store.saveSoon() : Store.save(); } catch (e) { /* sin almacenamiento */ } };
  const avisar = () => oyentes.forEach((f) => { try { f(); } catch (e) { /* oyente roto */ } });
  const q = (x) => `"${String(x).replace(/"/g, '""')}"`;
  function err(msg) { const e = new Error(msg); e.bq = true; return e; }

  // ------------------------------------------------------------------ arranque
  async function init(progreso = () => {}) {
    if (con) return con;
    if (cargando) return cargando;
    cargando = (async () => {
      const D = window.SqlMotores && window.SqlMotores.DUCK;
      if (!D) throw new Error('El motor DuckDB no está disponible');
      await D.init(progreso);
      progreso('Preparando el proyecto de BigQuery de práctica…');
      const c = await D._db.connect();
      const hay = (await c.query(`SELECT count(*) AS n FROM duckdb_databases() WHERE database_name = 'bq'`)).toArray()[0].n > 0;
      if (!hay) {
        await c.query(`ATTACH ':memory:' AS bq`);
        await c.query('CREATE SCHEMA bq.tienda');
        for (const t of TABLAS_INICIALES) { try { await c.query(`CREATE TABLE bq.tienda.${q(t)} AS SELECT * FROM memory.main.${q(t)}`); } catch (e) { /* la tabla no está en el dataset del curso */ } }
      }
      await c.query('USE bq');
      for (const [n, cuerpo] of [['safe_divide(a, b)', 'a / NULLIF(b, 0)'], ['generate_uuid()', 'CAST(uuid() AS VARCHAR)']]) { try { await c.query(`CREATE OR REPLACE MACRO ${n} AS ${cuerpo}`); } catch (e) { /* ya existe */ } }
      con = c;
      const s = st(); s.tt = {};
      // la tabla de pedidos viene particionada por día y con clustering por canal, para practicar
      if (!s.meta['tienda.pedidos']) s.meta['tienda.pedidos'] = { particion: { col: 'fecha_pedido', tipo: 'DAY' }, cluster: ['canal'], inicial: true };
      if (s.replay.length) {
        progreso(`Restaurando tus tablas (${s.replay.length} sentencias)…`);
        for (const r of s.replay) { try { await correr(r, { replay: true }); } catch (e) { /* ya no se puede recrear */ } }
      }
      for (const [ds, v] of Object.entries(s.vinculados)) { try { await armarVinculado(ds, v.origen); } catch (e) { /* el origen ya no existe */ } }
      return con;
    })();
    cargando.catch(() => { cargando = null; });
    return cargando;
  }

  // ------------------------------------------------------------------ texto de la consulta
  function partir(sql) {
    const out = []; let cur = '', qq = null, linea = false, bloque = false, par = 0;
    for (let i = 0; i < sql.length; i++) {
      const ch = sql[i], nx = sql[i + 1];
      if (linea) { cur += ch; if (ch === '\n') linea = false; continue; }
      if (bloque) { cur += ch; if (ch === '*' && nx === '/') { cur += nx; i++; bloque = false; } continue; }
      if (qq) { cur += ch; if (ch === qq) qq = null; continue; }
      if (ch === "'" || ch === '"' || ch === '`') { qq = ch; cur += ch; continue; }
      if ((ch === '-' && nx === '-') || ch === '#') { linea = true; cur += ch; continue; }
      if (ch === '/' && nx === '*') { bloque = true; cur += ch; continue; }
      if (ch === '(') par++; else if (ch === ')') par--;
      if (ch === ';' && par <= 0) { if (limpio(cur)) out.push(cur.trim()); cur = ''; continue; }
      cur += ch;
    }
    if (limpio(cur)) out.push(cur.trim());
    return out;
  }
  const limpio = (s) => s.replace(/(--|#)[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();
  const sinTextos = (s) => s.replace(/'(?:[^'\\]|\\.)*'/g, "''");

  // reescribe NOMBRE(arg1, arg2…) respetando paréntesis y comillas
  function reescribir(sql, nombre, f) {
    const re = new RegExp('\\b' + nombre + '\\s*\\(', 'gi'); let out = '', i = 0, m;
    while ((m = re.exec(sql))) {
      let p = 1, j = re.lastIndex, qq = null, cur = ''; const args = [];
      for (; j < sql.length; j++) {
        const ch = sql[j];
        if (qq) { cur += ch; if (ch === qq) qq = null; continue; }
        if (ch === "'" || ch === '"') { qq = ch; cur += ch; continue; }
        if (ch === '(') p++; else if (ch === ')') { p--; if (!p) break; }
        if (ch === ',' && p === 1) { args.push(cur.trim()); cur = ''; continue; }
        cur += ch;
      }
      args.push(cur.trim());
      const r = f(args.map((a) => reescribir(a, nombre, f)));
      out += sql.slice(i, m.index) + (r === null ? sql.slice(m.index, j + 1) : r); i = j + 1; re.lastIndex = i;
    }
    return out + sql.slice(i);
  }
  const PARTE = /^(MICROSECOND|MILLISECOND|SECOND|MINUTE|HOUR|DAY|WEEK|MONTH|QUARTER|YEAR)$/i;
  // GoogleSQL: "texto" es un literal de texto (los identificadores van entre backticks)
  function comillasDobles(sql) {
    let out = '', qq = null;
    for (let i = 0; i < sql.length; i++) {
      const ch = sql[i];
      if (qq === "'" || qq === '`') { out += ch; if (ch === '\\' && qq === "'") { out += sql[++i] || ''; continue; } if (ch === qq) qq = null; continue; }
      if (qq === '"') { if (ch === '\\') { out += sql[i + 1] === '"' ? '"' : ch + (sql[i + 1] || ''); i++; continue; } if (ch === '"') { out += "'"; qq = null; continue; } out += ch === "'" ? "''" : ch; continue; }
      if (ch === "'" || ch === '`') { qq = ch; out += ch; continue; }
      if (ch === '"') { qq = '"'; out += "'"; continue; }
      out += ch;
    }
    return out;
  }
  // UNNEST(arr) AS x  →  UNNEST(arr) AS __u(x)  (en DuckDB el alias sin lista de columnas nombra la tabla, no el valor)
  function unnestAlias(sql) {
    let out = '', i = 0; const re = /\bUNNEST\s*\(/gi; let m;
    while ((m = re.exec(sql))) {
      let p = 1, j = re.lastIndex;
      for (; j < sql.length && p; j++) { if (sql[j] === '(') p++; else if (sql[j] === ')') p--; }
      const resto = sql.slice(j); const a = /^\s+(?:AS\s+)?(?!(?:WITH|WHERE|JOIN|LEFT|RIGHT|INNER|CROSS|FULL|ON|GROUP|ORDER|LIMIT|UNION|QUALIFY|HAVING|AS)\b)([A-Za-z_]\w*)(?!\s*\()/i.exec(resto);
      if (a) { out += sql.slice(i, j) + ` AS __u${m.index}(${a[1]})`; i = j + a[0].length; }
      else { out += sql.slice(i, j); i = j; }
      re.lastIndex = j;
    }
    return out + sql.slice(i);
  }
  function traducir(sql) {
    let s = comillasDobles(sql);
    // `proyecto.dataset.tabla` → "dataset"."tabla"
    s = s.replace(/`([^`]+)`/g, (m, ref) => { const p = ref.split('.'); if (p.length === 3 || p[0] === PROYECTO) p.shift(); return p.map(q).join('.'); });
    s = s.replace(new RegExp('\\b' + PROYECTO.replace(/-/g, '\\-') + '\\.', 'g'), '');
    s = s.replace(/\*\s+EXCEPT\s*\(/gi, '* EXCLUDE (');
    s = s.replace(/\bCOUNTIF\s*\(/gi, 'count_if(').replace(/\bSAFE_CAST\s*\(/gi, 'TRY_CAST(').replace(/\bCURRENT_DATE\s*\(\s*\)/gi, 'CURRENT_DATE').replace(/\bCURRENT_TIMESTAMP\s*\(\s*\)/gi, 'CAST(now() AS TIMESTAMP)').replace(/\bCURRENT_DATETIME\s*\(\s*\)/gi, 'CAST(now() AS TIMESTAMP)');
    for (const f of ['DATE_TRUNC', 'TIMESTAMP_TRUNC', 'DATETIME_TRUNC']) s = reescribir(s, f, (a) => (a.length === 2 && PARTE.test(a[1]) ? (f === 'DATE_TRUNC' ? `CAST(date_trunc('${a[1].toLowerCase()}', ${a[0]}) AS DATE)` : `date_trunc('${a[1].toLowerCase()}', ${a[0]})`) : null));
    for (const f of ['DATE_DIFF', 'TIMESTAMP_DIFF', 'DATETIME_DIFF']) s = reescribir(s, f, (a) => (a.length === 3 && PARTE.test(a[2]) ? `date_diff('${a[2].toLowerCase()}', ${a[1]}, ${a[0]})` : null));
    const intervalo = (a, signo, comoFecha) => { const m = /^INTERVAL\s+(.+?)\s+(\w+)$/i.exec(a[1] || ''); if (a.length !== 2 || !m) return null; const e = `((${a[0]}) ${signo} INTERVAL (${m[1]}) ${m[2].toUpperCase()})`; return comoFecha ? `CAST(${e} AS DATE)` : e; };
    s = reescribir(s, 'DATE_ADD', (a) => intervalo(a, '+', true)); s = reescribir(s, 'DATE_SUB', (a) => intervalo(a, '-', true));
    s = reescribir(s, 'TIMESTAMP_ADD', (a) => intervalo(a, '+')); s = reescribir(s, 'TIMESTAMP_SUB', (a) => intervalo(a, '-'));
    for (const f of ['FORMAT_DATE', 'FORMAT_TIMESTAMP', 'FORMAT_DATETIME']) s = reescribir(s, f, (a) => (a.length >= 2 ? `strftime(${a[1]}, ${a[0]})` : null));
    s = reescribir(s, 'PARSE_DATE', (a) => (a.length === 2 ? `CAST(strptime(${a[1]}, ${a[0]}) AS DATE)` : null));
    s = reescribir(s, 'PARSE_TIMESTAMP', (a) => (a.length === 2 ? `strptime(${a[1]}, ${a[0]})` : null));
    // STRUCT(expr AS campo, …), arr[OFFSET(n)], arr[ORDINAL(n)], ARRAY_LENGTH, ARRAY_AGG(… LIMIT n), UNNEST con alias
    s = reescribir(s, 'STRUCT', (a) => (a.length && a.every((x) => /\s+AS\s+\w+$/i.test(x)) ? `struct_pack(${a.map((x) => { const mm = /^([\s\S]+?)\s+AS\s+(\w+)$/i.exec(x); return `${mm[2]} := ${mm[1]}`; }).join(', ')})` : null));
    s = s.replace(/\[\s*(?:SAFE_)?OFFSET\s*\(\s*([^()\]]+?)\s*\)\s*\]/gi, '[($1) + 1]').replace(/\[\s*(?:SAFE_)?ORDINAL\s*\(\s*([^()\]]+?)\s*\)\s*\]/gi, '[$1]');
    s = s.replace(/\bARRAY_LENGTH\s*\(/gi, 'len(');
    s = reescribir(s, 'ARRAY_AGG', (a) => { if (a.length !== 1) return null; let x = a[0], ign = false; const lim = /\s+LIMIT\s+(\d+)\s*$/i.exec(x); if (lim) x = x.slice(0, lim.index); if (/\s+IGNORE\s+NULLS\b/i.test(x)) { ign = true; x = x.replace(/\s+IGNORE\s+NULLS\b/i, ''); } if (!lim && !ign) return null; const base = ign ? `list_filter(array_agg(${x}), lambda __v: __v IS NOT NULL)` : `array_agg(${x})`; return lim ? `list_slice(${base}, 1, ${lim[1]})` : base; });
    s = unnestAlias(s);
    // tipos de GoogleSQL
    s = s.replace(/\bINT64\b/gi, 'BIGINT').replace(/\bFLOAT64\b/gi, 'DOUBLE').replace(/\bBIGNUMERIC\b/gi, 'DECIMAL(38,9)').replace(/\bNUMERIC\b(?!\s*\()/gi, 'DECIMAL(38,9)').replace(/\bSTRING\b(?!\s*\()/gi, 'VARCHAR').replace(/\bDATETIME\b(?!\s*\()/gi, 'TIMESTAMP').replace(/(\bAS\s+)BYTES(?=\s*\))/gi, '$1BLOB').replace(/((?:\(|,)\s*\w+\s+)BYTES\b(?=\s*(?:,|\)|NOT\b|OPTIONS\b))/gi, '$1BLOB').replace(/\bBOOL\b/gi, 'BOOLEAN');
    return s;
  }

  // ------------------------------------------------------------------ catálogo
  async function datasets() { await init(); return (await con.query(`SELECT schema_name FROM duckdb_schemas() WHERE database_name = 'bq' AND schema_name NOT IN ('main', 'information_schema', 'pg_catalog')`)).toArray().map((r) => r.schema_name).sort(); }
  async function tablas(ds) {
    const t = (await con.query(`SELECT table_name, estimated_size FROM duckdb_tables() WHERE database_name = 'bq' AND schema_name = '${ds}'`)).toArray().map((r) => ({ nombre: r.table_name, filas: Number(r.estimated_size), vista: false }));
    const v = (await con.query(`SELECT view_name FROM duckdb_views() WHERE database_name = 'bq' AND schema_name = '${ds}' AND NOT internal`)).toArray().map((r) => ({ nombre: r.view_name, vista: true }));
    return [...t, ...v].sort((a, b) => a.nombre.localeCompare(b.nombre));
  }
  function tipoBq(t) { t = String(t).toUpperCase(); if (/^(INTEGER|BIGINT|SMALLINT|TINYINT|HUGEINT|UBIGINT)$/.test(t)) return 'INTEGER'; if (/^DECIMAL/.test(t)) return 'NUMERIC'; if (/DOUBLE|FLOAT|REAL/.test(t)) return 'FLOAT'; if (t === 'VARCHAR') return 'STRING'; if (/TIMESTAMP/.test(t)) return 'TIMESTAMP'; if (t === 'BOOLEAN') return 'BOOLEAN'; if (/\[\]$/.test(t)) return 'REPEATED'; return t; }
  async function columnas(ds, t) { return (await con.query(`SELECT column_name, data_type, is_nullable FROM duckdb_columns() WHERE database_name = 'bq' AND schema_name = '${ds}' AND table_name = '${t}' ORDER BY column_index`)).toArray().map((r) => ({ nombre: r.column_name, tipo: tipoBq(r.data_type), duck: String(r.data_type).toUpperCase(), nulo: !!r.is_nullable })); }
  // bytes lógicos de cada columna, como los cuenta BigQuery: 8 por número o fecha, 2 + largo por texto, 1 por booleano
  async function tamanos(ds, t) {
    const k = `${ds}.${t}`; if (cacheTam[k] && cacheTam[k].v === version) return cacheTam[k];
    const cols = await columnas(ds, t);
    if (!cols.length) return { v: version, cols: [], bytes: {}, filas: 0, total: 0 };
    const expr = cols.map((c, i) => { const n = q(c.nombre); return (c.tipo === 'STRING' ? `coalesce(sum(2 + strlen(${n})), 0)` : c.tipo === 'BOOLEAN' ? `count(${n})` : c.tipo === 'NUMERIC' ? `count(${n}) * 16` : /REPEATED|JSON|STRUCT/.test(c.tipo) ? `coalesce(sum(2 + strlen(CAST(${n} AS VARCHAR))), 0)` : `count(${n}) * 8`) + ` AS c${i}`; });
    const r = (await con.query(`SELECT count(*) AS n, ${expr.join(', ')} FROM ${q(ds)}.${q(t)}`)).toArray()[0];
    const bytes = {}; let total = 0; cols.forEach((c, i) => { bytes[c.nombre] = Number(r['c' + i]); total += bytes[c.nombre]; });
    return (cacheTam[k] = { v: version, cols, bytes, filas: Number(r.n), total });
  }

  // ------------------------------------------------------------------ estimación (dry run)
  function referencias(sql) {
    const ctes = new Set([...sql.matchAll(/(?:WITH|,)\s+(\w+)\s+AS\s*\(/gi)].map((m) => m[1].toLowerCase()));
    const refs = [];
    for (const m of sql.matchAll(/\b(?:FROM|JOIN|INTO|UPDATE|TABLE|USING|MERGE)\s+(?!SET\b|INTO\b)(`[^`]+`|[\w-]+(?:\.[\w-]+){1,2}|\w+)(?:\s+(?:AS\s+)?(\w+))?/gi)) {
      const p = m[1].replace(/`/g, '').split('.'); if (p.length === 3 || p[0] === PROYECTO) p.shift();
      if (p.length !== 2) { if (!ctes.has(p[0].toLowerCase()) && !/^(SELECT|UNNEST|IF|EXISTS)$/i.test(p[0])) refs.push({ sinDataset: p[0] }); continue; }
      const alias = m[2] && !/^(WHERE|JOIN|ON|GROUP|ORDER|LEFT|RIGHT|INNER|FULL|CROSS|LIMIT|USING|SET|VALUES|AS|PARTITION|CLUSTER|OPTIONS|HAVING|QUALIFY|WINDOW|UNION|T|S)$/i.test(m[2]) ? m[2] : (m[2] && /^[ts]$/i.test(m[2]) ? m[2] : null);
      refs.push({ ds: p[0], t: p[1], alias, escribe: /^(INTO|UPDATE|TABLE|MERGE)$/i.test(m[0].split(/\s+/)[0]) });
    }
    return refs;
  }
  async function estimar(sqlOriginal) {
    await init();
    const sql = quitarSystemTime(limpio(sqlOriginal).replace(/;\s*$/, '')); const s = st();
    if (!sql) return { bytes: 0, vacia: true };
    // EXTRACT(YEAR FROM col), TRIM(x FROM y)…: ese FROM no nombra una tabla
    const plano = sinTextos(sql).replace(/\b(EXTRACT|SUBSTRING|TRIM|POSITION)\s*\(([^()]*?)\bFROM\b/gi, '$1($2 , ');
    if (/^(CREATE\s+SCHEMA|DROP|ALTER|TRUNCATE)\b/i.test(sql)) return { bytes: 0, tablas: [], ddl: true };
    if (/^LOAD\s+DATA\b/i.test(sql)) return { bytes: 0, real: 0, tablas: [], ddl: true }; // un job de carga no cobra bytes procesados
    if (/\bINFORMATION_SCHEMA\b/i.test(sql)) return { bytes: 0, real: 0, tablas: [], meta: true };
    if (/^(UPDATE|DELETE)\b/i.test(sql) && !/\bWHERE\b/i.test(plano)) throw err(`${sql.split(/\s+/)[0].toUpperCase()} must have a WHERE clause`);
    const refs = referencias(plano); const detalle = []; let bytes = 0, real = 0;
    const sinDs = refs.find((r) => r.sinDataset);
    if (sinDs) throw err(`Table "${sinDs.sinDataset}" must be qualified with a dataset (e.g. dataset.table).`);
    const vistos = new Set();
    const estrella = /(?:SELECT|,)\s*(?:DISTINCT\s+)?(?:(\w+)\.)?\*(?!\s*\))/i.exec(plano);
    for (const r of refs) {
      const k = `${r.ds}.${r.t}`; if (vistos.has(k)) continue; vistos.add(k);
      if (r.escribe && !/^(UPDATE|DELETE|MERGE)/i.test(sql) && !refs.some((x) => x !== r && !x.escribe && x.ds === r.ds && x.t === r.t)) continue; // destino de INSERT/CREATE: no se lee
      const T = await tamanos(r.ds, r.t);
      if (!T.cols.length) { if (/^CREATE/i.test(sql) && r.escribe) continue; throw err(`Not found: Table ${PROYECTO}:${r.ds}.${r.t} was not found in location US`); }
      const todas = estrella && (!estrella[1] || estrella[1].toLowerCase() === (r.alias || r.t).toLowerCase());
      const excl = todas ? ((/\*\s+EXCEPT\s*\(([^)]*)\)/i.exec(plano) || [, ''])[1].split(',').map((x) => x.trim().toLowerCase())) : [];
      const usadas = T.cols.filter((c) => (todas ? !excl.includes(c.nombre.toLowerCase()) : new RegExp('\\b' + c.nombre + '\\b', 'i').test(plano)));
      let b = usadas.reduce((a, c) => a + T.bytes[c.nombre], 0);
      // particiones: solo se leen las que deja pasar un filtro directo sobre la columna de partición
      const meta = s.meta[k] || {}; let fr = 1, frReal = 1, filtro = null;
      if (meta.particion) {
        const col = meta.particion.col; const conds = [];
        for (const m of sql.matchAll(new RegExp(`(?:\\b\\w+\\.)?\\b${col}\\b\\s*(>=|<=|<>|!=|=|>|<)\\s*(?:DATE\\s*|TIMESTAMP\\s*)?('[^']*')`, 'gi'))) if (!/<>|!=/.test(m[1])) conds.push(`${q(col)} ${m[1]} ${m[2]}`);
        for (const m of sql.matchAll(new RegExp(`(?:\\b\\w+\\.)?\\b${col}\\b\\s+BETWEEN\\s+(?:DATE\\s*)?('[^']*')\\s+AND\\s+(?:DATE\\s*)?('[^']*')`, 'gi'))) conds.push(`${q(col)} BETWEEN ${m[1]} AND ${m[2]}`);
        if (conds.length) {
          filtro = conds.join(' AND ');
          try { const x = (await con.query(`SELECT count(*) FILTER (WHERE ${filtro}) AS a, count(*) AS n FROM ${q(r.ds)}.${q(r.t)}`)).toArray()[0]; fr = Number(x.n) ? Number(x.a) / Number(x.n) : 0; } catch (e) { fr = 1; filtro = null; }
        } else if (meta.requiereFiltro && !/^(INSERT|CREATE)/i.test(sql)) throw err(`Cannot query over table '${k}' without a filter over column(s) '${col}' that can be used for partition elimination`);
      }
      frReal = fr;
      // clustering: no baja la estimación, pero sí lo que finalmente se procesa cuando se filtra por la primera columna
      if (meta.cluster && meta.cluster.length && /^(SELECT|WITH)\b/i.test(sql)) {
        const c0 = meta.cluster[0]; const m = new RegExp(`(?:\\b\\w+\\.)?\\b${c0}\\b\\s*=\\s*('[^']*'|\\d+(?:\\.\\d+)?)`, 'i').exec(sql);
        if (m) { try { const x = (await con.query(`SELECT count(*) FILTER (WHERE ${q(c0)} = ${m[1]}${filtro ? ' AND ' + filtro : ''}) AS a, count(*) AS n FROM ${q(r.ds)}.${q(r.t)}`)).toArray()[0]; frReal = Number(x.n) ? Number(x.a) / Number(x.n) : 0; } catch (e) { /* tipos distintos: sin poda */ } }
      }
      detalle.push({ tabla: k, columnas: usadas.map((c) => c.nombre), todas: !!todas, bytesTabla: b, fraccion: fr, fraccionReal: frReal, particion: meta.particion ? meta.particion.col : null, filtro });
      bytes += b * fr; real += b * frReal;
    }
    return { bytes: Math.round(bytes), real: Math.round(real), tablas: detalle, estrella: !!estrella };
  }

  // ------------------------------------------------------------------ ejecución
  function sacarClausula(sql, re) { // quita "PARTITION BY x", "CLUSTER BY a, b" u "OPTIONS(...)" y devuelve su contenido
    const m = re.exec(sql); if (!m) return [sql, null];
    let fin = m.index + m[0].length, texto = m[1] !== undefined ? m[1] : '';
    if (/OPTIONS\s*\($/i.test(m[0])) { let p = 1, j = fin; for (; j < sql.length && p; j++) { if (sql[j] === '(') p++; else if (sql[j] === ')') p--; } texto = sql.slice(fin, j - 1); fin = j; }
    return [sql.slice(0, m.index) + ' ' + sql.slice(fin), texto.trim()];
  }
  // ---- time travel: FOR SYSTEM_TIME AS OF <expr>. Antes de cada cambio de datos se guarda una copia oculta (las últimas 5).
  const REF = /(`[^`]+`|[\w-]+(?:\.[\w-]+){1,2})\s+FOR\s+SYSTEM_TIME\s+AS\s+OF\s+/i;
  function finExpr(t, i) { let p = 0, qq = null; for (let k = i; k < t.length; k++) { const ch = t[k]; if (qq) { if (ch === qq) qq = null; continue; } if (ch === "'" || ch === '"') { qq = ch; continue; } if (ch === '(') p++; else if (ch === ')') { if (!p) return k; p--; } else if (!p && /\s/.test(ch) && /^\s+(WHERE|GROUP|ORDER|LIMIT|JOIN|LEFT|RIGHT|INNER|CROSS|FULL|UNION|QUALIFY|HAVING|WINDOW|AS|ON|,)\b/i.test(t.slice(k))) return k; else if (!p && ch === ',') return k; } return t.length; }
  function quitarSystemTime(sql) { let out = sql, m, g = 0; while ((m = REF.exec(out)) && g++ < 10) { const ini = m.index + m[0].length; out = out.slice(0, m.index) + m[1] + out.slice(finExpr(out, ini)); } return out; }
  const refTabla = (r) => { const p = r.replace(/`/g, '').split('.'); if (p.length === 3 || p[0] === PROYECTO) p.shift(); return p; };
  async function resolverSystemTime(sql) {
    const s = st(); let out = sql, m, g = 0;
    while ((m = REF.exec(out)) && g++ < 10) {
      const ini = m.index + m[0].length, fin = finExpr(out, ini); const expr = out.slice(ini, fin).trim(); const p = refTabla(m[1]); const k = p.join('.');
      let cuando;
      try { cuando = Math.round(Number((await con.query(`SELECT epoch(CAST((${traducir(expr)}) AS TIMESTAMP)) * 1000 AS t`)).toArray()[0].t)); } catch (e) { throw err(`Invalid value for FOR SYSTEM_TIME AS OF: ${expr}`); }
      if (cuando > Date.now() + 1000) throw err('Cannot read from a table snapshot in the future.');
      if (cuando < Date.now() - 7 * 86400e3) throw err(`Invalid snapshot time ${new Date(cuando).toISOString()} for table ${PROYECTO}:${k}. Cannot read before ${new Date(Date.now() - 7 * 86400e3).toISOString()} (la ventana de time travel es de 7 días)`);
      const lista = (s.tt || {})[k] || []; const elegido = lista.find((x) => x.cuando > cuando);
      const destino = elegido ? `main.${elegido.oculto}` : p.join('.'); // sin comillas: traducir() convierte "…" en texto
      out = out.slice(0, m.index) + destino + out.slice(fin);
    }
    return out;
  }
  async function copiaTT(k) {
    const s = st(); s.tt = s.tt || {}; const lista = (s.tt[k] = s.tt[k] || []);
    const oculto = `__tt_${k.replace(/\W/g, '_')}_${Date.now().toString(36)}${lista.length}`;
    try { await con.query(`CREATE TABLE main.${q(oculto)} AS SELECT * FROM ${k.split('.').map(q).join('.')}`); } catch (e) { return; }
    lista.push({ oculto, cuando: Date.now() });
    while (lista.length > 5) { const v = lista.shift(); try { await con.query(`DROP TABLE IF EXISTS main.${q(v.oculto)}`); } catch (e) { /* ya no está */ } }
  }
  // ---- INFORMATION_SCHEMA: TABLES y COLUMNS de un dataset, y JOBS (el historial de jobs de la práctica)
  async function infoSchema(sql) {
    const s = st(); let out = sql;
    out = out.replace(/`?(?:[\w-]+\.)?(\w+)\.INFORMATION_SCHEMA\.(TABLES|COLUMNS)`?/gi, (mm, ds, cual) => {
      if (/^region-/i.test(ds)) return mm;
      if (cual.toUpperCase() === 'TABLES') return `(SELECT '${PROYECTO}' AS table_catalog, schema_name AS table_schema, table_name, 'BASE TABLE' AS table_type, estimated_size AS row_count FROM duckdb_tables() WHERE database_name = 'bq' AND schema_name = '${ds}' UNION ALL SELECT '${PROYECTO}', schema_name, view_name, 'VIEW', NULL FROM duckdb_views() WHERE database_name = 'bq' AND schema_name = '${ds}' AND NOT internal)`;
      return `(SELECT '${PROYECTO}' AS table_catalog, schema_name AS table_schema, table_name, column_name, column_index AS ordinal_position, data_type, is_nullable FROM duckdb_columns() WHERE database_name = 'bq' AND schema_name = '${ds}')`;
    });
    if (/INFORMATION_SCHEMA\.JOBS/i.test(out)) {
      const t = (x) => (x == null ? 'NULL' : `'${String(x).replace(/'/g, "''")}'`);
      const filas = s.jobs.map((j) => `(${t(j.id)}, epoch_ms(${Math.round(j.inicio)}::BIGINT), ${t(j.usuario)}, ${t(j.tipo)}, ${t(j.estado === 'FAILED' ? 'DONE' : j.estado)}, ${t(j.sql)}, ${Math.round(j.procesado || 0)}, ${Math.round(j.facturado || 0)}, ${j.cache ? 'TRUE' : 'FALSE'}, ${t(j.error)}, ${Math.round(j.ms || 0)})`);
      await con.query(`CREATE OR REPLACE TABLE main.__jobs (job_id VARCHAR, creation_time TIMESTAMP, user_email VARCHAR, job_type VARCHAR, state VARCHAR, query VARCHAR, total_bytes_processed BIGINT, total_bytes_billed BIGINT, cache_hit BOOLEAN, error_result VARCHAR, total_slot_ms BIGINT)`);
      if (filas.length) await con.query(`INSERT INTO main.__jobs VALUES ${filas.join(', ')}`);
      out = out.replace(/`?(?:[\w-]+\.)?region-[\w-]+`?\.INFORMATION_SCHEMA\.JOBS(?:_BY_USER|_BY_PROJECT)?`?|`region-[\w-]+\.INFORMATION_SCHEMA\.JOBS(?:_BY_USER|_BY_PROJECT)?`/gi, 'main.__jobs');
    }
    return out;
  }
  // ---- MERGE (DuckDB-WASM no lo tiene): UPDATE/DELETE … FROM + INSERT … de las filas sin pareja, con la semántica de BigQuery
  function cierre(t, i) { let p = 0, qq = null; for (let k = i; k < t.length; k++) { const ch = t[k]; if (qq) { if (ch === qq) qq = null; continue; } if (ch === "'" || ch === '"') { qq = ch; continue; } if (ch === '(') p++; else if (ch === ')') { p--; if (!p) return k; } } return -1; }
  async function mergeDuck(tr) {
    const m = /^MERGE\s+(?:INTO\s+)?("?[\w$]+"?(?:\."?[\w$]+"?)*)(?:\s+(?:AS\s+)?(?!USING\b)("?\w+"?))?\s+USING\s+/i.exec(tr);
    if (!m) throw err('Syntax error: MERGE INTO destino USING fuente ON condición WHEN …');
    const destino = m[1]; const t = (m[2] || destino.split('.').pop()).replace(/"/g, '');
    let i = m[0].length, fuente;
    if (tr[i] === '(') { const f = cierre(tr, i); fuente = tr.slice(i, f + 1); i = f + 1; } else { const mm = /^("?[\w$]+"?(?:\."?[\w$]+"?)*)/.exec(tr.slice(i)); fuente = mm[1]; i += mm[0].length; }
    const resto = tr.slice(i); const ma = /^\s+(?:AS\s+)?(?!ON\b)("?\w+"?)/i.exec(resto); const sA = ma ? ma[1].replace(/"/g, '') : 'S';
    const mo = /^\s*ON\s+([\s\S]+?)\s+(WHEN\s[\s\S]*)$/i.exec(ma ? resto.slice(ma[0].length) : resto);
    if (!mo) throw err('Syntax error: falta ON … WHEN … en el MERGE');
    const cond = mo[1];
    const partes = mo[2].split(/\bWHEN\s+(?=(?:NOT\s+)?MATCHED\b)/i).map((x) => x.trim()).filter(Boolean).map((c) => {
      const k = /^(NOT\s+)?MATCHED(?:\s+BY\s+(TARGET|SOURCE))?(?:\s+AND\s+([\s\S]+?))?\s+THEN\s+([\s\S]+?);?$/i.exec(c);
      if (!k) throw err(`Syntax error near: WHEN ${c.slice(0, 40)}`);
      const grupo = !k[1] ? 'm' : (k[2] || 'TARGET').toUpperCase() === 'SOURCE' ? 'ns' : 'nt';
      return { grupo, extra: k[3], accion: k[4].trim() };
    });
    const correrN = async (sq) => { const r = await con.query(sq); const f = r.toArray()[0]; return Number((f && (f.Count ?? f.count)) || 0); };
    const nm = `__merge_nm_${Date.now().toString(36)}`; let n = 0;
    await con.query(`CREATE TEMP TABLE ${nm} AS SELECT * FROM ${fuente} AS ${sA} WHERE NOT EXISTS (SELECT 1 FROM ${destino} AS ${t} WHERE ${cond})`);
    const huerf = `__merge_ns_${Date.now().toString(36)}`;
    if (partes.some((x) => x.grupo === 'ns')) await con.query(`CREATE TEMP TABLE ${huerf} AS SELECT rowid AS __rid FROM ${destino} AS ${t} WHERE NOT EXISTS (SELECT 1 FROM ${fuente} AS ${sA} WHERE ${cond})`);
    try {
      const previas = { m: [], nt: [], ns: [] }, cerrado = { m: false, nt: false, ns: false };
      for (const c of partes) {
        if (cerrado[c.grupo]) continue;
        const ex = (c.extra ? ` AND (${c.extra})` : '') + previas[c.grupo].map((x) => ` AND NOT (${x})`).join('');
        if (c.extra) previas[c.grupo].push(c.extra); else cerrado[c.grupo] = true;
        const set = /^UPDATE\s+SET\s+([\s\S]+)$/i.exec(c.accion); const asign = set ? set[1].replace(new RegExp(`(^|,)\\s*${t}\\.`, 'gi'), '$1 ') : null;
        if (c.grupo === 'm') {
          if (/^DELETE$/i.test(c.accion)) n += await correrN(`DELETE FROM ${destino} AS ${t} USING ${fuente} AS ${sA} WHERE (${cond})${ex}`);
          else if (set) n += await correrN(`UPDATE ${destino} AS ${t} SET ${asign} FROM ${fuente} AS ${sA} WHERE (${cond})${ex}`);
          else throw err('WHEN MATCHED admite UPDATE SET … o DELETE');
        } else if (c.grupo === 'nt') {
          if (/^INSERT\s+ROW$/i.test(c.accion)) n += await correrN(`INSERT INTO ${destino} SELECT * FROM ${nm} AS ${sA} WHERE TRUE${ex}`);
          else { const ins = /^INSERT\s*(\([^)]*\))?\s*VALUES\s*\(([\s\S]+)\)$/i.exec(c.accion); if (!ins) throw err('WHEN NOT MATCHED admite INSERT (…) VALUES (…) o INSERT ROW'); n += await correrN(`INSERT INTO ${destino} ${ins[1] || ''} SELECT ${ins[2]} FROM ${nm} AS ${sA} WHERE TRUE${ex}`); }
        } else {
          const conRid = `rowid IN (SELECT __rid FROM ${huerf})`;
          if (/^DELETE$/i.test(c.accion)) n += await correrN(`DELETE FROM ${destino} AS ${t} WHERE ${conRid}${ex}`);
          else if (set) n += await correrN(`UPDATE ${destino} AS ${t} SET ${asign} WHERE ${conRid}${ex}`);
          else throw err('WHEN NOT MATCHED BY SOURCE admite UPDATE SET … o DELETE');
        }
      }
    } finally { for (const x of [nm, huerf]) { try { await con.query(`DROP TABLE IF EXISTS ${x}`); } catch (e) { /* ya no está */ } } }
    return n;
  }
  async function correr(sqlOriginal, op = {}) {
    const s = st(); let sql = limpio(sqlOriginal).replace(/;\s*$/, ''); let m;
    const fila = (cols, vals) => ({ columns: cols, values: vals });
    if ((m = /^CREATE\s+SCHEMA\s+(IF\s+NOT\s+EXISTS\s+)?(`[^`]+`|[\w.-]+)/i.exec(sql))) {
      const ds = m[2].replace(/`/g, '').split('.').pop();
      if ((await datasets()).includes(ds)) { if (m[1]) return { estado: `Dataset ${ds} already exists.` }; throw err(`Already Exists: Dataset ${PROYECTO}:${ds}`); }
      await con.query(`CREATE SCHEMA ${q(ds)}`); version++;
      return { estado: `Created ${PROYECTO}.${ds}`, persistir: true };
    }
    if ((m = /^DROP\s+SCHEMA\s+(IF\s+EXISTS\s+)?(`[^`]+`|[\w.-]+)(\s+CASCADE)?/i.exec(sql))) {
      const ds = m[2].replace(/`/g, '').split('.').pop();
      if (!(await datasets()).includes(ds)) { if (m[1]) return { estado: 'This statement did nothing.' }; throw err(`Not found: Dataset ${PROYECTO}:${ds}`); }
      if (!m[3] && (await tablas(ds)).length) throw err(`Dataset ${PROYECTO}:${ds} is still in use. Usa DROP SCHEMA ${ds} CASCADE para borrar también sus tablas.`);
      await con.query(`DROP SCHEMA ${q(ds)} CASCADE`); for (const k of Object.keys(s.meta)) if (k.startsWith(ds + '.')) delete s.meta[k]; version++;
      return { estado: `Dropped ${PROYECTO}.${ds}`, persistir: true };
    }
    // LOAD DATA {INTO|OVERWRITE} ds.tabla FROM FILES (format = 'CSV', skip_leading_rows = 1, uris = ['azure://…'])
    //   WITH CONNECTION `azure-eastus2.mi_conexion`: carga archivos del lago de Azure (carga entre nubes)
    if ((m = /^LOAD\s+DATA\s+(INTO|OVERWRITE)\s+(`[^`]+`|[\w.-]+)\s*(?:\([^)]*\)\s*)?FROM\s+FILES\s*\(([\s\S]*?)\)\s*(?:WITH\s+CONNECTION\s+`?([\w.-]+)`?)?$/i.exec(sql))) {
      const p = refTabla(m[2]); if (p.length !== 2) throw err(`Table "${p.join('.')}" must be qualified with a dataset (e.g. dataset.table).`);
      const [ds, tabla] = p; const opc = m[3];
      if (!(await datasets()).includes(ds)) throw err(`Not found: Dataset ${PROYECTO}:${ds}`);
      const uris = [...(/uris\s*=\s*\[([^\]]*)\]/i.exec(opc) || [, ''])[1].matchAll(/'([^']+)'|"([^"]+)"/g)].map((x) => x[1] || x[2]);
      if (!uris.length) throw err("LOAD DATA necesita uris = ['azure://<cuenta>.blob.core.windows.net/<contenedor>/<ruta>/*.csv']");
      const formato = ((/format\s*=\s*'(\w+)'/i.exec(opc) || [, 'CSV'])[1]).toUpperCase();
      const salto = Number((/skip_leading_rows\s*=\s*(\d+)/i.exec(opc) || [, 0])[1]);
      const L = window.LagoAzure; const archivos = [];
      for (const u of uris) {
        if (/^gs:\/\//i.test(u)) throw err('En esta práctica no hay buckets de Cloud Storage: carga desde el lago de Azure (azure://…) o sube el archivo con "Add data → Local file".');
        if (!L || !L.esDelLago(u) || L.parsear(u).esquema !== 'azure') throw err(`Invalid uri '${u}'. Para Azure Blob Storage el formato es azure://<cuenta>.blob.core.windows.net/<contenedor>/<ruta>.`);
        if (!m[4]) throw err('Loading from Azure requires a connection. Agrega WITH CONNECTION `azure-eastus2.<nombre>`: es la conexión de BigQuery a Azure (en la consola: Add data → Connections to external data sources → BigLake on Azure).');
        if (!/^azure-[\w-]+\.\w+$/i.test(m[4])) throw err(`Connection '${m[4]}' no tiene el formato <región de Azure>.<nombre>, por ejemplo azure-eastus2.lago_operaciones.`);
        let l; try { l = L.listar(u); } catch (e) { throw err(`Error while reading data, error message: ${e.message}`); }
        if (!l.length) throw err(`Not found: Uris ${u}`);
        archivos.push(...l);
      }
      const D = window.SqlMotores.DUCK; const esJson = formato === 'JSON' || formato === 'NEWLINE_DELIMITED_JSON';
      const texto = esJson ? archivos.map((a) => a.texto.trim()).join('\n') : archivos.map((a, i) => { const lineas = a.texto.split('\n'); return (i === 0 ? lineas : lineas.slice(salto)).join('\n').replace(/\n+$/, ''); }).join('\n') + '\n';
      const tmp = `__bqload_${Date.now()}.${esJson ? 'json' : 'csv'}`; await D._db.registerFileText(tmp, texto);
      const lector = esJson ? `read_json_auto('${tmp}')` : `read_csv('${tmp}', header = ${salto > 0}, auto_detect = true)`;
      const existe = (await tablas(ds)).some((x) => x.nombre === tabla);
      try {
        if (m[1].toUpperCase() === 'OVERWRITE' || !existe) await con.query(`CREATE OR REPLACE TABLE ${q(ds)}.${q(tabla)} AS SELECT * FROM ${lector}`);
        else await con.query(`INSERT INTO ${q(ds)}.${q(tabla)} SELECT * FROM ${lector}`);
      } catch (e) { throw err(`Error while reading data, error message: ${mensaje(String(e.message))}`); } finally { await D._db.dropFile(tmp); }
      const n = Number((await con.query(`SELECT count(*) AS n FROM ${q(ds)}.${q(tabla)}`)).toArray()[0].n);
      version++; cacheRes.clear(); s.cruces = s.cruces || {}; s.cruces.cargaAzure = Date.now();
      return { estado: `Se cargaron ${archivos.length} archivo(s) en ${PROYECTO}.${ds}.${tabla} (${n} filas en total). Un job de carga no cobra bytes procesados.`, persistir: true };
    }
    if (/^(UPDATE|DELETE)\b/i.test(sql) && !/\bWHERE\b/i.test(sinTextos(sql))) throw err(`${sql.split(/\s+/)[0].toUpperCase()} must have a WHERE clause`);
    let tr = sql, metaNueva = null, destino = null;
    if ((m = /^CREATE\s+(OR\s+REPLACE\s+)?(?:TEMP(?:ORARY)?\s+)?TABLE\s+(IF\s+NOT\s+EXISTS\s+)?(`[^`]+`|[\w.-]+)/i.exec(sql))) {
      const p = m[3].replace(/`/g, '').split('.'); if (p.length === 3 || p[0] === PROYECTO) p.shift();
      if (p.length !== 2) throw err(`Table "${p.join('.')}" must be qualified with a dataset (e.g. dataset.table).`);
      destino = p.join('.'); metaNueva = {};
      let part, clus, opts;
      [tr, part] = sacarClausula(tr, /\bPARTITION\s+BY\s+(.+?)(?=\s+CLUSTER\s+BY|\s+OPTIONS\s*\(|\s+AS\s+(?:SELECT|WITH|\()|$)/is);
      [tr, clus] = sacarClausula(tr, /\bCLUSTER\s+BY\s+(.+?)(?=\s+OPTIONS\s*\(|\s+AS\s+(?:SELECT|WITH|\()|$)/is);
      [tr, opts] = sacarClausula(tr, /\bOPTIONS\s*\(/i);
      if (part) { const c = /(?:DATE|DATE_TRUNC|TIMESTAMP_TRUNC|DATETIME_TRUNC)\s*\(\s*([\w.]+)\s*(?:,\s*(\w+))?\s*\)/i.exec(part); metaNueva.particion = c ? { col: c[1].split('.').pop(), tipo: (c[2] || 'DAY').toUpperCase() } : { col: part.replace(/`/g, '').trim(), tipo: 'DAY' }; }
      if (clus) { metaNueva.cluster = clus.split(',').map((x) => x.replace(/`/g, '').trim()).filter(Boolean); if (metaNueva.cluster.length > 4) throw err('Clustering supports a maximum of 4 columns.'); }
      if (opts) { if (/require_partition_filter\s*=\s*true/i.test(opts)) metaNueva.requiereFiltro = true; const e = /partition_expiration_days\s*=\s*(\d+)/i.exec(opts); if (e) metaNueva.expiraDias = Number(e[1]); const d = /description\s*=\s*["']([^"']*)["']/i.exec(opts); if (d) metaNueva.descripcion = d[1]; }
      if (metaNueva.requiereFiltro && !metaNueva.particion) throw err('require_partition_filter can only be set on a partitioned table.');
    }
    [tr] = sacarClausula(tr, /\bOPTIONS\s*\(/i);
    if (REF.test(tr)) tr = await resolverSystemTime(tr);
    if (/\bINFORMATION_SCHEMA\b/i.test(tr)) tr = await infoSchema(tr);
    // antes de cambiar datos: copia para FOR SYSTEM_TIME AS OF
    if (!op.replay && (m = /^(?:INSERT\s+(?:INTO\s+)?|UPDATE\s+|DELETE\s+(?:FROM\s+)?|MERGE\s+(?:INTO\s+)?|TRUNCATE\s+TABLE\s+)(`[^`]+`|[\w-]+(?:\.[\w-]+){1,2})/i.exec(sql))) { const p = refTabla(m[1]); if (p.length === 2 && (await tablas(p[0])).some((x) => x.nombre === p[1] && !x.vista)) await copiaTT(p.join('.')); }
    tr = traducir(tr).replace(/^TRUNCATE\s+TABLE\s+/i, 'DELETE FROM ');
    if (/^MERGE\b/i.test(tr)) {
      let n; try { n = await mergeDuck(tr); } catch (e) { if (e.bq) throw e; throw err(mensaje(String(e.message || e))); }
      version++; cacheRes.clear();
      const p = refTabla(/^MERGE\s+(?:INTO\s+)?(`[^`]+`|[\w-]+(?:\.[\w-]+){1,2})/i.exec(sql)[1]);
      return { estado: `This statement modified ${n} row${n === 1 ? '' : 's'} in ${PROYECTO}.${p.join('.')}.`, filasAfectadas: n, persistir: true };
    }
    let r;
    try { r = await con.query(tr); } catch (e) { throw err(mensaje(String(e.message || e))); }
    const campos = r.schema.fields; const D = window.SqlMotores.DUCK;
    const cambia = /^(INSERT|UPDATE|DELETE|MERGE|TRUNCATE|CREATE|DROP|ALTER)\b/i.test(sql);
    if (cambia) { version++; cacheRes.clear(); }
    if (destino) { if (metaNueva.particion) { const cols = (await columnas(...destino.split('.'))).map((c) => c.nombre.toLowerCase()); if (!cols.includes(metaNueva.particion.col.toLowerCase())) { await con.query(`DROP TABLE ${destino.split('.').map(q).join('.')}`); throw err(`Unrecognized name: ${metaNueva.particion.col} (la columna de partición no existe en la tabla)`); } } s.meta[destino] = metaNueva; }
    if ((m = /^DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?(`[^`]+`|[\w.-]+)/i.exec(sql))) { const p = m[1].replace(/`/g, '').split('.'); if (p.length === 3) p.shift(); delete s.meta[p.join('.')]; }
    if (campos.length === 1 && campos[0].name === 'Count' && cambia) {
      const n = Number((r.toArray()[0] || {}).Count || 0);
      if (/^CREATE/i.test(sql)) { const v = /^CREATE\s+(?:OR\s+REPLACE\s+)?VIEW\s+(?:IF\s+NOT\s+EXISTS\s+)?(`[^`]+`|[\w.-]+)/i.exec(sql); return { estado: v ? `This statement created a new view named ${PROYECTO}.${refTabla(v[1]).join('.')}.` : `This statement created a new table named ${PROYECTO}.${destino || ''}.`, filasAfectadas: n, persistir: true }; }
      const verbo = /^INSERT/i.test(sql) ? 'added' : /^UPDATE/i.test(sql) ? 'modified' : /^(DELETE|TRUNCATE)/i.test(sql) ? 'removed' : 'affected';
      return { estado: `This statement ${verbo} ${n} row${n === 1 ? '' : 's'}.`, filasAfectadas: n, persistir: true };
    }
    if (cambia && !campos.length) return { estado: /^CREATE/i.test(sql) ? (() => { const v = /^CREATE\s+(?:OR\s+REPLACE\s+)?VIEW\s+(?:IF\s+NOT\s+EXISTS\s+)?(`[^`]+`|[\w.-]+)/i.exec(sql); return v ? `This statement created a new view named ${PROYECTO}.${refTabla(v[1]).join('.')}.` : `This statement created a new table${destino ? ' named ' + PROYECTO + '.' + destino : ''}.`; })() : /^DROP/i.test(sql) ? 'This statement dropped the object.' : 'This statement completed.', persistir: true };
    if (!campos.length) return { estado: 'This statement completed.', persistir: cambia };
    return { ...fila(campos.map((f) => (/^count_star\(\)$/i.test(f.name) ? 'f0_' : f.name)), r.toArray().map((x) => campos.map((f) => D._celda(x[f.name], f.type)))), persistir: cambia };
  }
  function mensaje(msg) {
    let m;
    if ((m = /Table with name (\w+) does not exist/i.exec(msg))) return `Not found: Table ${PROYECTO}:${m[1]} was not found in location US`;
    if ((m = /Referenced column "?(\w+)"? not found/i.exec(msg))) return `Unrecognized name: ${m[1]}`;
    if ((m = /Schema with name (\w+) does not exist/i.exec(msg))) return `Not found: Dataset ${PROYECTO}:${m[1]} was not found in location US`;
    if ((m = /column "?(\w+)"? must appear in the GROUP BY clause/i.exec(msg))) return `SELECT list expression references column ${m[1]} which is neither grouped nor aggregated`;
    if ((m = /Parser Error: (.*)/i.exec(msg))) return `Syntax error: ${m[1].split('\n')[0].replace(/syntax error at or near/i, 'Unexpected')}`;
    return msg.replace(/^(\w+ Error): /, '').split('\n')[0];
  }
  const fmtBytes = (b) => { if (!b) return '0 B'; const u = ['B', 'KB', 'MB', 'GB', 'TB']; let i = 0, v = b; while (v >= 1024 && i < 4) { v /= 1024; i++; } return `${v >= 100 || i === 0 ? Math.round(v) : v.toFixed(2)} ${u[i]}`; };
  const costo = (b) => (b / TIB) * USD_POR_TIB;

  async function ejecutar(sqlTexto, op = {}) {
    await init(op.progreso);
    const s = st(); const out = [];
    for (const sentencia of partir(sqlTexto)) {
      const id = `bquxjob_${(Date.now() + s.seq).toString(16).slice(-8)}_${(1e11 + s.seq++ * 7919).toString(16)}`; const t0 = performance.now(); const inicio = Date.now();
      let r = null, error = null, est = { bytes: 0, real: 0, tablas: [] }, cache = false;
      const clave = limpio(sentencia).replace(/\s+/g, ' ').trim();
      const visible = sentencia.replace(/^(\s*(--|#)[^\n]*\n)+/, '').trim();
      try {
        soloLectura(clave);
        est = await estimar(sentencia);
        const esSelect = /^(SELECT|WITH)\b/i.test(clave);
        const determinista = !/\b(CURRENT_DATE|CURRENT_TIMESTAMP|CURRENT_DATETIME|RAND|GENERATE_UUID|SESSION_USER)\b/i.test(clave);
        const previa = cacheRes.get(clave);
        if (esSelect && determinista && previa && previa.v === version && !op.sinCache) { r = previa.r; cache = true; }
        else { r = await correr(sentencia); if (esSelect && determinista && r.values) cacheRes.set(clave, { v: version, r }); }
      } catch (e) { error = e; }
      const procesado = cache || error ? 0 : (est.real !== undefined ? est.real : est.bytes);
      const facturado = procesado ? Math.max(MIN_FACTURADO, Math.ceil(procesado / 1048576) * 1048576) : 0;
      const job = { id, sql: visible, tipo: op.tipo || 'QUERY', estado: error ? 'FAILED' : 'DONE', error: error ? error.message : null, usuario: op.usuario || USUARIO, inicio, ms: Math.max(1, Math.round(performance.now() - t0)), estimado: est.bytes || 0, procesado, facturado, cache, filas: r && r.values ? r.values.length : (r && r.filasAfectadas) || 0, tablas: (est.tablas || []).map((t) => ({ tabla: t.tabla, columnas: t.columnas.length, todas: t.todas, fraccion: t.fraccion, fraccionReal: t.fraccionReal, particion: t.particion })), estrella: !!est.estrella };
      s.jobs.unshift(job); if (s.jobs.length > 200) s.jobs.length = 200;
      if (!error && r && r.persistir) { s.replay.push(sentencia); if (s.replay.length > 300) s.replay.splice(0, s.replay.length - 300); }
      out.push({ sql: sentencia, job, r, error, est });
      if (error && !op.seguir) break;
    }
    guardar(); avisar();
    return out;
  }

  // ------------------------------------------------------------------ Analytics Hub: datasets vinculados (solo lectura)
  async function armarVinculado(ds, origen) {
    await con.query(`CREATE SCHEMA IF NOT EXISTS ${q(ds)}`);
    for (const t of await tablas(origen)) await con.query(`CREATE OR REPLACE VIEW ${q(ds)}.${q(t.nombre)} AS SELECT * FROM ${q(origen)}.${q(t.nombre)}`);
    version++;
  }
  async function crearVinculado(ds, origen, listado) {
    await init(); const s = st();
    if (!/^\w+$/.test(ds)) throw err('Invalid dataset ID. Usa letras, números y guiones bajos.');
    if ((await datasets()).includes(ds)) throw err(`Already Exists: Dataset ${PROYECTO}:${ds}`);
    await armarVinculado(ds, origen); s.vinculados[ds] = { origen, listado, cuando: Date.now() }; guardar(); avisar();
  }
  function soloLectura(sql) {
    const s = st(); if (!Object.keys(s.vinculados).length) return;
    const m = /^(?:INSERT\s+(?:INTO\s+)?|UPDATE\s+|DELETE\s+(?:FROM\s+)?|MERGE\s+(?:INTO\s+)?|TRUNCATE\s+TABLE\s+|DROP\s+(?:TABLE|VIEW)\s+(?:IF\s+EXISTS\s+)?|CREATE\s+(?:OR\s+REPLACE\s+)?(?:TABLE|VIEW|MATERIALIZED\s+VIEW)\s+(?:IF\s+NOT\s+EXISTS\s+)?)(`[^`]+`|[\w.-]+)/i.exec(sql);
    if (!m) return; const partes = m[1].replace(/`/g, '').split('.'); const ds = partes.length >= 2 ? partes[partes.length - 2] : null;
    if (ds && s.vinculados[ds]) throw err(`Access Denied: Dataset ${PROYECTO}:${ds}: ${ds} es un dataset vinculado (linked dataset) de Analytics Hub y es de solo lectura. Copia lo que necesites a un dataset tuyo: CREATE TABLE mi_dataset.x AS SELECT … FROM ${ds}.…`);
  }
  // carga un archivo (CSV o JSON por líneas) a una tabla nueva: un job de tipo LOAD, que en BigQuery no se cobra
  async function cargarArchivo(ds, tabla, nombreArchivo, texto, op = {}) {
    await init(); const s = st(); const D = window.SqlMotores.DUCK;
    if (!/^\w+$/.test(tabla)) throw err('Invalid table ID. Usa letras, números y guiones bajos.');
    const esJson = /\.json(l)?$/i.test(nombreArchivo) || /^\s*[{[]/.test(texto);
    const tmp = `__bq_${Date.now()}.${esJson ? 'json' : 'csv'}`; await D._db.registerFileText(tmp, texto);
    const t0 = performance.now(); let error = null, n = 0;
    try {
      await con.query(`CREATE ${op.reemplazar ? 'OR REPLACE ' : ''}TABLE ${q(ds)}.${q(tabla)} AS SELECT * FROM ${esJson ? `read_json_auto('${tmp}')` : `read_csv('${tmp}', header = true, auto_detect = true)`}`);
      n = Number((await con.query(`SELECT count(*) AS n FROM ${q(ds)}.${q(tabla)}`)).toArray()[0].n);
      version++; cacheRes.clear();
      if (op.particion) { const cols = (await columnas(ds, tabla)).map((c) => c.nombre); if (cols.includes(op.particion)) s.meta[`${ds}.${tabla}`] = { particion: { col: op.particion, tipo: 'DAY' } }; }
      s.cargas = s.cargas || []; s.cargas.push({ ds, tabla, nombreArchivo, texto, particion: op.particion || null }); if (s.cargas.length > 20) s.cargas.shift();
    } catch (e) { error = err(/already exists/i.test(e.message) ? `Already Exists: Table ${PROYECTO}:${ds}.${tabla}` : mensaje(String(e.message))); }
    await D._db.dropFile(tmp);
    const job = { id: `bquxjob_${Date.now().toString(16).slice(-8)}_load${s.seq++}`, sql: `LOAD DATA INTO ${ds}.${tabla} FROM FILES (format = '${esJson ? 'JSON' : 'CSV'}', uris = ['${nombreArchivo}'])`, tipo: 'LOAD', estado: error ? 'FAILED' : 'DONE', error: error ? error.message : null, usuario: USUARIO, inicio: Date.now(), ms: Math.round(performance.now() - t0), estimado: 0, procesado: 0, facturado: 0, cache: false, filas: n, tablas: [] };
    s.jobs.unshift(job); guardar(); avisar();
    if (error) throw error;
    return job;
  }
  async function vistaPrevia(ds, t, n = 50) { await init(); const r = await con.query(`SELECT * FROM ${q(ds)}.${q(t)} LIMIT ${n}`); const D = window.SqlMotores.DUCK; const campos = r.schema.fields; return { columns: campos.map((f) => f.name), values: r.toArray().map((x) => campos.map((f) => D._celda(x[f.name], f.type))) }; }
  async function reiniciar() {
    try { await con.query('USE memory'); await con.query('DETACH bq'); } catch (e) { /* nada */ }
    delete Store.data.bigquery; con = null; cargando = null; version++; cacheRes.clear(); for (const k of Object.keys(cacheTam)) delete cacheTam[k];
    st(); guardar(); await init(); avisar();
  }
  // al recargar, las tablas subidas desde archivo se vuelven a crear antes de repetir las sentencias
  const initOriginal = init;
  async function initConCargas(progreso) {
    const primera = !con; await initOriginal(progreso);
    if (primera) { const s = st(); const D = window.SqlMotores.DUCK; for (const c of s.cargas || []) { try { const esJson = /\.json(l)?$/i.test(c.nombreArchivo) || /^\s*[{[]/.test(c.texto); const tmp = `__bqr_${Date.now()}_${c.tabla}.${esJson ? 'json' : 'csv'}`; await D._db.registerFileText(tmp, c.texto); await con.query(`CREATE TABLE IF NOT EXISTS ${q(c.ds)}.${q(c.tabla)} AS SELECT * FROM ${esJson ? `read_json_auto('${tmp}')` : `read_csv('${tmp}', header = true, auto_detect = true)`}`); await D._db.dropFile(tmp); } catch (e) { /* el dataset ya no existe */ } } version++; }
    return con;
  }

  window.BigQueryMotor = {
    init: initConCargas, ejecutar, crearVinculado, estimar: async (sql) => { await initConCargas(); return estimar(sql); }, partir, traducir, st, reiniciar, cargarArchivo, vistaPrevia,
    datasets: async () => { await initConCargas(); return datasets(); }, tablas, columnas, tamanos, fmtBytes, costo, oyentes,
    PROYECTO, USUARIO, USD_POR_TIB, MIN_FACTURADO,
    conectar: (store) => { Store = store; st(); },
  };
})();
