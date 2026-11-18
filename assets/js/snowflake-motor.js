/* Motor de la réplica de Snowflake (práctica). No es Snowflake: es una simulación educativa que corre en el
 * navegador sobre DuckDB-WASM (assets/js/sql-motores.js), el motor libre más parecido al SQL de Snowflake
 * (QUALIFY, ILIKE, ::, nombres de tres partes con bases adjuntas).
 *
 * Lo que agrega encima de DuckDB:
 * - Warehouses virtuales: hace falta uno activo para consultar; se reanudan solos, se suspenden por inactividad
 *   y se calculan los créditos consumidos (créditos por hora según el tamaño, mínimo 60 s por reanudación).
 * - Roles y GRANT/REVOKE (se registran y se muestran; el rol actual se guarda en cada consulta).
 * - Bases y esquemas (CREATE DATABASE = una base de DuckDB adjunta), stages internos con archivos y COPY INTO.
 * - Time Travel (AT(OFFSET => -s), BEFORE(STATEMENT => 'id')) y UNDROP TABLE con copias ocultas.
 * - Funciones de Snowflake traducidas: IFF, NVL, DATEADD, DATEDIFF, PARSE_JSON, columna:campo::tipo, CLONE, FLATTEN y MERGE.
 * Lo que el alumno crea se vuelve a construir al recargar, repitiendo las sentencias que cambiaron datos.
 */
(function () {
  'use strict';
  const CREDITOS_HORA = { XSMALL: 1, SMALL: 2, MEDIUM: 4, LARGE: 8, XLARGE: 16, XXLARGE: 32, XXXLARGE: 64, X4LARGE: 128 };
  const TAMANO = (t) => String(t || 'XSMALL').toUpperCase().replace(/[-_\s']/g, '').replace(/^X(\d)LARGE$/, (m, n) => (n === '2' ? 'XXLARGE' : n === '3' ? 'XXXLARGE' : 'X4LARGE'));
  const ROLES_SISTEMA = ['ACCOUNTADMIN', 'SECURITYADMIN', 'USERADMIN', 'SYSADMIN', 'PUBLIC'];
  const USUARIO = 'ALUMNO';
  let Store = null;
  let con = null, cargando = null;
  const oyentes = new Set();

  // ------------------------------------------------------------------ estado guardado
  function st() {
    const d = (Store.data.snowflake = Store.data.snowflake || {});
    d.ctx = d.ctx || { rol: 'SYSADMIN', wh: 'COMPUTE_WH', db: 'TIENDA_ANDINA', esquema: 'PUBLIC' };
    d.warehouses = d.warehouses || { COMPUTE_WH: { nombre: 'COMPUTE_WH', tamano: 'XSMALL', autoSuspend: 600, autoResume: true, estado: 'SUSPENDED', creditos: 0, desde: 0, ultima: 0, dueno: 'SYSADMIN', creado: Date.now() } };
    d.roles = d.roles || {};
    d.grants = d.grants || [];
    d.historial = d.historial || [];
    d.replay = d.replay || [];
    d.stages = d.stages || {};
    d.hojas = d.hojas || [{ id: 'h1', nombre: 'Mi primera hoja', sql: EJEMPLO_INICIAL, creada: Date.now() }];
    d.seq = d.seq || 1;
    return d;
  }
  const guardar = () => { try { Store.saveSoon ? Store.saveSoon() : Store.save(); } catch (e) { /* sin almacenamiento */ } };
  const avisar = () => oyentes.forEach((f) => { try { f(); } catch (e) { /* oyente roto */ } });

  const EJEMPLO_INICIAL = `-- Bienvenido a Snowflake de práctica. Ejecuta una sentencia con Ctrl+Enter
-- (o el botón ▶). Todo corre en tu navegador sobre la base de la tienda del curso.
USE ROLE SYSADMIN;
USE WAREHOUSE COMPUTE_WH;
USE SCHEMA TIENDA_ANDINA.PUBLIC;

SELECT c.pais, COUNT(DISTINCT p.pedido_id) AS pedidos,
       ROUND(SUM(d.cantidad * d.precio_unitario), 2) AS ventas
FROM pedidos p
JOIN clientes c ON c.cliente_id = p.cliente_id
JOIN detalle_pedidos d ON d.pedido_id = p.pedido_id
GROUP BY c.pais
ORDER BY ventas DESC;
`;

  // ------------------------------------------------------------------ arranque
  async function init(progreso = () => {}) {
    if (con) return con;
    if (cargando) return cargando;
    cargando = (async () => {
      const D = window.SqlMotores && window.SqlMotores.DUCK;
      if (!D) throw new Error('El motor DuckDB no está disponible');
      await D.init(progreso);
      progreso('Preparando la cuenta de Snowflake de práctica…');
      const c = await D._db.connect();
      const q = async (s) => c.query(s);
      const existe = async (db) => (await q(`SELECT count(*) AS n FROM duckdb_databases() WHERE database_name = '${db.toLowerCase()}'`)).toArray()[0].n > 0;
      if (!(await existe('tienda_andina'))) {
        await q(`ATTACH ':memory:' AS tienda_andina`);
        await q('CREATE SCHEMA IF NOT EXISTS tienda_andina.public');
        const tablas = (await q(`SELECT table_name FROM duckdb_tables() WHERE database_name = 'memory' AND schema_name = 'main' AND NOT internal`)).toArray().map((r) => r.table_name);
        for (const t of tablas) await q(`CREATE TABLE tienda_andina.public."${t}" AS SELECT * FROM memory.main."${t}"`);
        await q(`ATTACH ':memory:' AS snowflake_sample_data`);
        await q('CREATE SCHEMA IF NOT EXISTS snowflake_sample_data.tpch_sf1');
        await q(`CREATE TABLE snowflake_sample_data.tpch_sf1.region AS SELECT * FROM (VALUES (0,'AFRICA'),(1,'AMERICA'),(2,'ASIA'),(3,'EUROPE'),(4,'MIDDLE EAST')) t(r_regionkey, r_name)`);
      }
      con = c;
      // volver a construir lo que el alumno creó en sesiones anteriores
      const s = st();
      // las copias ocultas (time travel, UNDROP) no sobreviven a la recarga: se vuelven a generar al repetir
      s.tt = {}; s.borradas = {}; for (const x of Object.values(s.stages)) x.cargados = {};
      if (s.replay.length) {
        progreso(`Restaurando tus objetos (${s.replay.length} sentencias)…`);
        const ctx0 = { ...s.ctx };
        for (const r of s.replay) { try { s.ctx = { ...s.ctx, db: r.db, esquema: r.esquema }; await usarContexto(); await ejecutarUna(r.sql, { replay: true }); } catch (e) { /* objeto que ya no se puede recrear */ } }
        s.ctx = ctx0;
      }
      await usarContexto();
      return con;
    })();
    cargando.catch(() => { cargando = null; });
    return cargando;
  }
  async function usarContexto() {
    const s = st();
    try { await con.query(`USE ${ident(s.ctx.db)}.${ident(s.ctx.esquema)}`); } catch (e) { try { await con.query(`USE ${ident(s.ctx.db)}`); } catch (e2) { /* la base ya no existe */ } }
  }
  const ident = (x) => /^[A-Za-z_][\w$]*$/.test(x) ? x.toLowerCase() : `"${String(x).replace(/"/g, '""')}"`;
  const nombreSf = (x) => String(x || '').replace(/^"(.*)"$/, '$1').toUpperCase();

  // ------------------------------------------------------------------ sentencias
  function partir(sql) {
    const out = []; let cur = '', q = null, i = 0, linea = false, bloque = false, par = 0;
    for (; i < sql.length; i++) {
      const ch = sql[i], nx = sql[i + 1];
      if (linea) { cur += ch; if (ch === '\n') linea = false; continue; }
      if (bloque) { cur += ch; if (ch === '*' && nx === '/') { cur += nx; i++; bloque = false; } continue; }
      if (q) { cur += ch; if (ch === q) q = null; continue; }
      if (ch === "'" || ch === '"') { q = ch; cur += ch; continue; }
      if (ch === '-' && nx === '-') { linea = true; cur += ch; continue; }
      if (ch === '/' && nx === '*') { bloque = true; cur += ch; continue; }
      if (ch === '(') par++; else if (ch === ')') par--;
      if (ch === ';' && par <= 0) { if (limpio(cur)) out.push(cur.trim()); cur = ''; continue; }
      cur += ch;
    }
    if (limpio(cur)) out.push(cur.trim());
    return out;
  }
  const limpio = (s) => s.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();
  const sinComentarios = limpio;

  function nuevoId() { const s = st(); const n = s.seq++; return `01b${Date.now().toString(16).slice(-7)}-0000-${String(n).padStart(4, '0')}`; }

  // warehouses: reanudar, suspender y créditos
  function tick() {
    const s = st(), ahora = Date.now();
    for (const w of Object.values(s.warehouses)) {
      if (w.estado === 'STARTED' && w.autoSuspend && ahora - w.ultima > w.autoSuspend * 1000) suspender(w, w.ultima + w.autoSuspend * 1000);
    }
  }
  function suspender(w, cuando = Date.now()) {
    if (w.estado !== 'STARTED') return;
    const seg = Math.max(60, (cuando - w.desde) / 1000);
    w.creditos += (CREDITOS_HORA[w.tamano] || 1) * seg / 3600;
    w.estado = 'SUSPENDED'; guardar();
  }
  function reanudar(w) { if (w.estado === 'STARTED') return; w.estado = 'STARTED'; w.desde = Date.now(); w.ultima = Date.now(); guardar(); }

  function err(msg, codigo = '002003') { const e = new Error(msg); e.codigo = codigo; return e; }
  const filas = (cols, vals) => ({ columns: cols, values: vals });
  const fecha = (t) => new Date(t).toISOString().replace('T', ' ').slice(0, 19) + ' -0800';

  // traduce las funciones y sintaxis de Snowflake a DuckDB
  function traducir(sql) {
    let s = sql;
    s = s.replace(/\bIFF\s*\(/gi, 'IF(').replace(/\bNVL\s*\(/gi, 'COALESCE(').replace(/\bZEROIFNULL\s*\(([^()]+)\)/gi, 'COALESCE($1, 0)');
    s = s.replace(/\bDATEADD\s*\(\s*'?(year|quarter|month|week|day|hour|minute|second)s?'?\s*,\s*(-?\d+)\s*,/gi, (m, p, n) => `__DATEADD('${p.toLowerCase()}', ${n},`);
    s = s.replace(/__DATEADD\('(\w+)', (-?\d+),\s*([^()]+?|[\w.]+\([^()]*\))\s*\)/g, (m, p, n, x) => `(${x} + INTERVAL (${n}) ${p.toUpperCase()})`);
    s = s.replace(/\bDATEDIFF\s*\(\s*'?(year|quarter|month|week|day|hour|minute|second)s?'?\s*,/gi, (m, p) => `date_diff('${p.toLowerCase()}',`);
    s = s.replace(/\bPARSE_JSON\s*\(/gi, 'json(').replace(/\bVARIANT\b/gi, 'JSON').replace(/\bNUMBER\s*\(/gi, 'DECIMAL(').replace(/\bNUMBER\b/gi, 'DECIMAL(38,0)');
    s = s.replace(/\bTO_VARCHAR\s*\(/gi, 'CAST_VARCHAR(').replace(/CAST_VARCHAR\(([^()]+)\)/g, 'CAST($1 AS VARCHAR)');
    s = s.replace(/\bCURRENT_TIMESTAMP\(\)/gi, 'CURRENT_TIMESTAMP').replace(/\bSYSDATE\(\)/gi, 'CURRENT_TIMESTAMP');
    // expr:campo.sub  →  json_extract_string(expr, '$.campo.sub')  (expr: columna, a.b o una llamada f(...))
    s = rutasJson(s);
    s = flatten(s);
    const s2 = st();
    s = s.replace(/\bCURRENT_ROLE\(\)/gi, `'${s2.ctx.rol}'`).replace(/\bCURRENT_WAREHOUSE\(\)/gi, s2.ctx.wh ? `'${s2.ctx.wh}'` : 'NULL')
      .replace(/\bCURRENT_DATABASE\(\)/gi, `'${s2.ctx.db}'`).replace(/\bCURRENT_SCHEMA\(\)/gi, `'${s2.ctx.esquema}'`).replace(/\bCURRENT_USER\(\)/gi, `'${USUARIO}'`)
      .replace(/\bCURRENT_ACCOUNT\(\)/gi, "'PRACTICA01'").replace(/\bCURRENT_REGION\(\)/gi, "'AWS_US_EAST_1'");
    return s;
  }

  // paréntesis que cierra el que abre en la posición i (respeta comillas)
  function cierre(t, i) {
    let p = 0, q = null;
    for (let k = i; k < t.length; k++) {
      const ch = t[k];
      if (q) { if (ch === q) q = null; continue; }
      if (ch === "'" || ch === '"') { q = ch; continue; }
      if (ch === '(') p++; else if (ch === ')') { p--; if (!p) return k; }
    }
    return -1;
  }
  // [LATERAL] FLATTEN(INPUT => expr) / TABLE(FLATTEN(...))  →  LATERAL (SELECT value, index de cada elemento del arreglo)
  function flatten(sql) {
    let out = sql, guard = 0;
    for (;;) {
      const m = /(?:\bLATERAL\s+|\bTABLE\s*\(\s*)?\bFLATTEN\s*\(/i.exec(out); if (!m || guard++ > 10) return out;
      const abre = m.index + m[0].length - 1; const fin = cierre(out, abre); if (fin < 0) return out;
      let dentro = out.slice(abre + 1, fin).trim();
      dentro = dentro.replace(/^INPUT\s*=>\s*/i, '').replace(/,\s*(PATH|OUTER|RECURSIVE|MODE)\s*=>[\s\S]*$/i, '').trim();
      dentro = dentro.replace(/^json_extract_string\(/i, 'json_extract(');
      let hasta = fin + 1;
      if (/^\s*TABLE\s*\(/i.test(m[0])) { const c = out.indexOf(')', hasta); if (c >= 0) hasta = c + 1; }
      const sub = `LATERAL (SELECT unnest(__arr) AS value, unnest(range(len(__arr))) AS index FROM (SELECT CAST(${dentro} AS JSON[]) AS __arr))`;
      out = out.slice(0, m.index) + sub + out.slice(hasta);
    }
  }
  // MERGE INTO destino [AS] t USING (consulta|tabla) [AS] s ON cond WHEN MATCHED [AND c] THEN UPDATE SET …|DELETE
  //   WHEN NOT MATCHED [AND c] THEN INSERT [(cols)] VALUES (…)   →  UPDATE/DELETE … FROM  +  INSERT … WHERE NOT EXISTS
  async function mergeDuck(tr) {
    const m = /^MERGE\s+INTO\s+("?[\w$."]+"?)(?:\s+(?:AS\s+)?(?!USING\b)("?\w+"?))?\s+USING\s+/i.exec(tr);
    if (!m) throw err('SQL compilation error:\nsyntax error in MERGE', '001003');
    const destino = m[1]; const t = (m[2] || destino.split('.').pop()).replace(/"/g, '');
    let i = m[0].length, fuente;
    if (tr[i] === '(') { const f = cierre(tr, i); fuente = tr.slice(i, f + 1); i = f + 1; }
    else { const mm = /^("?[\w$."]+"?)/.exec(tr.slice(i)); fuente = mm[1]; i += mm[0].length; }
    const resto = tr.slice(i);
    const ma = /^\s+(?:AS\s+)?(?!ON\b)("?\w+"?)/i.exec(resto); const s = ma ? ma[1].replace(/"/g, '') : 'src';
    const r2 = ma ? resto.slice(ma[0].length) : resto;
    const mo = /^\s*ON\s+([\s\S]+?)\s+(WHEN\s[\s\S]*)$/i.exec(r2);
    if (!mo) throw err('SQL compilation error:\nsyntax error in MERGE: falta ON … WHEN …', '001003');
    const cond = mo[1];
    const clausulas = mo[2].split(/\bWHEN\s+(?=(?:NOT\s+)?MATCHED\b)/i).map((x) => x.trim()).filter(Boolean);
    const cnt = { ins: 0, upd: 0, del: 0 };
    const correr = async (q) => { const r = await con.query(q); const f = r.toArray()[0]; return Number((f && (f.Count ?? f.count)) || 0); };
    const partes = clausulas.map((c) => {
      const k = /^(NOT\s+)?MATCHED(?:\s+AND\s+([\s\S]+?))?\s+THEN\s+([\s\S]+?);?$/i.exec(c);
      if (!k) throw err(`SQL compilation error:\nsyntax error in MERGE near: WHEN ${c.slice(0, 40)}`, '001003');
      return { no: !!k[1], extra: k[2], accion: k[3].trim() };
    });
    // como en Snowflake: qué filas de la fuente no tienen pareja se decide una vez, contra el destino original
    const nm = `__merge_nm_${Date.now().toString(36)}`;
    await con.query(`CREATE TEMP TABLE ${nm} AS SELECT * FROM ${fuente} AS ${s} WHERE NOT EXISTS (SELECT 1 FROM ${destino} AS ${t} WHERE ${cond})`);
    try {
      // en cada grupo (MATCHED / NOT MATCHED) gana la primera cláusula cuya condición se cumple
      const previas = { true: [], false: [] }; const cerrado = { true: false, false: false };
      for (const c of partes) {
        if (cerrado[c.no]) continue;
        const ex = (c.extra ? ` AND (${c.extra})` : '') + previas[c.no].map((x) => ` AND NOT (${x})`).join('');
        if (c.extra) previas[c.no].push(c.extra); else cerrado[c.no] = true;
        if (!c.no) {
          if (/^DELETE$/i.test(c.accion)) cnt.del += await correr(`DELETE FROM ${destino} AS ${t} USING ${fuente} AS ${s} WHERE (${cond})${ex}`);
          else {
            const set = /^UPDATE\s+SET\s+([\s\S]+)$/i.exec(c.accion); if (!set) throw err('SQL compilation error:\nWHEN MATCHED admite UPDATE SET … o DELETE', '001003');
            const asign = set[1].replace(new RegExp(`(^|,)\\s*${t}\\.`, 'gi'), '$1 ');
            cnt.upd += await correr(`UPDATE ${destino} AS ${t} SET ${asign} FROM ${fuente} AS ${s} WHERE (${cond})${ex}`);
          }
        } else {
          const ins = /^INSERT\s*(\([^)]*\))?\s*VALUES\s*\(([\s\S]+)\)$/i.exec(c.accion); if (!ins) throw err('SQL compilation error:\nWHEN NOT MATCHED admite INSERT (…) VALUES (…)', '001003');
          cnt.ins += await correr(`INSERT INTO ${destino} ${ins[1] || ''} SELECT ${ins[2]} FROM ${nm} AS ${s} WHERE TRUE${ex}`);
        }
      }
    } finally { try { await con.query(`DROP TABLE IF EXISTS ${nm}`); } catch (e) { /* ya no está */ } }
    return cnt;
  }

  function rutasJson(sql) {
    let out = '', i = 0, q = null;
    while (i < sql.length) {
      const ch = sql[i];
      if (q) { out += ch; if (ch === q) q = null; i++; continue; }
      if (ch === "'" || ch === '"') { q = ch; out += ch; i++; continue; }
      const m = ch === ':' && sql[i - 1] !== ':' && sql[i + 1] !== ':' && /^:([A-Za-z_]\w*(?:\.[A-Za-z_]\w*|\[\d+\])*)/.exec(sql.slice(i));
      if (m) {
        // el operando a la izquierda: identificador (con puntos) o llamada con paréntesis
        let j = out.length - 1; while (j >= 0 && out[j] === ' ') j--;
        let k = j;
        if (out[j] === ')') { let p = 0; for (; k >= 0; k--) { if (out[k] === ')') p++; else if (out[k] === '(') { p--; if (!p) break; } } k--; while (k >= 0 && /[\w.]/.test(out[k])) k--; }
        else { while (k >= 0 && /[\w.]/.test(out[k])) k--; }
        const operando = out.slice(k + 1, j + 1);
        if (operando && /[\w)]$/.test(operando) && !/^\d+$/.test(operando)) {
          out = out.slice(0, k + 1) + `json_extract_string(${operando}, '$.${m[1]}')`; i += m[0].length; continue;
        }
      }
      out += ch; i++;
    }
    return out;
  }

  // ---------------------------------------------------------------- time travel
  // Antes de cada cambio de datos se guarda una copia oculta de la tabla (las últimas 5 por tabla).
  function nombreCompleto(t) {
    const s = st(); const p = t.replace(/"/g, '').split('.');
    if (p.length === 3) return { db: p[0].toUpperCase(), esquema: p[1].toUpperCase(), tabla: p[2].toUpperCase() };
    if (p.length === 2) return { db: s.ctx.db, esquema: p[0].toUpperCase(), tabla: p[1].toUpperCase() };
    return { db: s.ctx.db, esquema: s.ctx.esquema, tabla: p[0].toUpperCase() };
  }
  const ref = (n, tabla = n.tabla) => `${ident(n.db)}.${ident(n.esquema)}.${ident(tabla)}`;
  async function copiaOculta(n, motivo, qid) {
    const s = st(); const k = `${n.db}.${n.esquema}.${n.tabla}`;
    s.tt = s.tt || {}; const lista = (s.tt[k] = s.tt[k] || []);
    const oculto = `__tt_${n.tabla.toLowerCase()}_${Date.now().toString(36)}`;
    try { await con.query(`CREATE TABLE ${ref(n, oculto)} AS SELECT * FROM ${ref(n)}`); } catch (e) { return; }
    lista.push({ oculto, cuando: Date.now(), qid, motivo });
    while (lista.length > 5) { const v = lista.shift(); try { await con.query(`DROP TABLE IF EXISTS ${ref(n, v.oculto)}`); } catch (e) { /* ya no está */ } }
  }
  function resolverTimeTravel(sql) {
    const s = st();
    return sql.replace(/([\w."]+)\s+(AT|BEFORE)\s*\(\s*(OFFSET|TIMESTAMP|STATEMENT)\s*=>\s*([^)]+)\)/gi, (m, t, cual, tipo, valor) => {
      const n = nombreCompleto(t); const lista = ((s.tt || {})[`${n.db}.${n.esquema}.${n.tabla}`]) || [];
      let elegido = null;
      if (/STATEMENT/i.test(tipo)) { const id = valor.trim().replace(/^'|'$/g, ''); elegido = lista.find((x) => x.qid === id); if (!elegido) throw err(`Statement ${id} cannot be used to specify time for time travel query.`, '000707'); }
      else {
        const lim = /OFFSET/i.test(tipo) ? Date.now() + Number(valor.trim()) * 1000 : Date.parse(valor.replace(/'|::\w+/g, '').trim());
        // la versión vigente en ese momento: la copia hecha justo después de ese instante (es el estado anterior al cambio siguiente)
        elegido = lista.find((x) => x.cuando > lim);
        if (!elegido && lista.length && lim < lista[0].cuando) elegido = lista[0];
        if (!elegido) return ref(n);
      }
      return ref(n, elegido.oculto);
    });
  }

  // ---------------------------------------------------------------- permisos
  // Los privilegios se dan a roles. ACCOUNTADMIN y SYSADMIN pueden todo sobre los datos; SECURITYADMIN y USERADMIN
  // administran roles y permisos pero no leen datos; los demás roles (PUBLIC y los creados) solo lo que se les otorgó,
  // lo que crearon ellos mismos, y lo de los roles que heredan con GRANT ROLE x TO ROLE y.
  const HEREDA = { ACCOUNTADMIN: ['SYSADMIN', 'SECURITYADMIN'], SECURITYADMIN: ['USERADMIN'] };
  function rolesEfectivos(rol) {
    const s = st(); const vistos = new Set(['PUBLIC']); const cola = [rol];
    while (cola.length) { const r = cola.pop(); if (vistos.has(r)) continue; vistos.add(r); cola.push(...(HEREDA[r] || [])); for (const g of s.grants) if (g.tipo === 'ROLE' && g.aTipo === 'ROLE' && g.a === r) cola.push(g.obj); }
    return vistos;
  }
  const esAdminDatos = (ef) => ef.has('ACCOUNTADMIN') || ef.has('SYSADMIN');
  function coincide(g, tipo, p) {
    const o = g.obj.split('.'); const fin = (a, b) => a.length <= b.length && a.every((x, i) => x === b[b.length - a.length + i]);
    if (g.tipo === tipo || (tipo === 'TABLE' && g.tipo === 'VIEW')) return fin(o, p);
    if (tipo === 'TABLE' && /^(ALL|FUTURE) (TABLES|VIEWS) IN SCHEMA$/.test(g.tipo)) return fin(o, p.slice(0, 2));
    if (tipo === 'TABLE' && /^(ALL|FUTURE) (TABLES|VIEWS) IN DATABASE$/.test(g.tipo)) return o[0] === p[0];
    if (tipo === 'SCHEMA' && /^(ALL|FUTURE) SCHEMAS IN DATABASE$/.test(g.tipo)) return o[0] === p[0];
    return false;
  }
  function tiene(priv, tipo, obj) {
    const s = st(); const ef = rolesEfectivos(s.ctx.rol);
    if (esAdminDatos(ef)) return true;
    const dueno = (s.duenos || {})[`${tipo}:${obj}`]; if (dueno && ef.has(dueno)) return true;
    const p = obj.split('.');
    return s.grants.some((g) => g.aTipo !== 'USER' && ef.has(g.a) && (g.priv === priv || g.priv === 'ALL' || g.priv === 'ALL PRIVILEGES' || g.priv === 'OWNERSHIP') && coincide(g, tipo, p));
  }
  const sinPermiso = (queEs) => err(`SQL access control error:\nInsufficient privileges to operate on ${queEs}.\nEl rol actual es ${st().ctx.rol}: cambia de rol (USE ROLE …) o pide el permiso con GRANT.`, '003001');
  function noAutorizado(n) { return err(`SQL compilation error:\nObject '${n.db}.${n.esquema}.${n.tabla}' does not exist or not authorized.\nEl rol ${st().ctx.rol} no tiene los permisos: necesita USAGE en la base y en el esquema, y el privilegio sobre la tabla. Revisa SHOW GRANTS TO ROLE ${st().ctx.rol};`, '002003'); }
  // comprueba la cadena completa para leer o escribir una tabla: base → esquema → tabla
  function exigirTabla(n, priv) {
    const k = `${n.db}.${n.esquema}.${n.tabla}`;
    if (!tiene('USAGE', 'DATABASE', n.db) || !tiene('USAGE', 'SCHEMA', `${n.db}.${n.esquema}`)) throw noAutorizado(n);
    if (tiene(priv, 'TABLE', k)) return;
    // ve la tabla (tiene otro privilegio sobre ella) pero no el que pide la sentencia: como en Snowflake, "Insufficient privileges"
    if (priv !== 'SELECT' && tiene('SELECT', 'TABLE', k)) throw sinPermiso(`table '${n.tabla}' (falta GRANT ${priv} ON TABLE ${k} TO ROLE ${st().ctx.rol})`);
    throw noAutorizado(n);
  }
  function exigirPermisos(sql) {
    const s = st(); const ef = rolesEfectivos(s.ctx.rol); if (esAdminDatos(ef)) return;
    const plano = sql.replace(/'(?:[^']|'')*'/g, "''").replace(/\b(EXTRACT|SUBSTRING|TRIM|POSITION)\s*\(([^()]*?)\bFROM\b/gi, '$1($2 , ');
    const ctes = new Set([...plano.matchAll(/(?:WITH|,)\s+(\w+)\s+AS\s*\(/gi)].map((m) => m[1].toUpperCase()));
    for (const m of plano.matchAll(/\b(?:FROM|JOIN)\s+("?[\w$]+"?(?:\."?[\w$]+"?){0,2})/gi)) { const n = nombreCompleto(m[1]); if (m[1].includes('.') || !ctes.has(n.tabla)) exigirTabla(n, 'SELECT'); }
    let m;
    if ((m = /^INSERT\s+(?:OVERWRITE\s+)?INTO\s+("?[\w$."]+"?)/i.exec(plano))) exigirTabla(nombreCompleto(m[1]), 'INSERT');
    else if ((m = /^UPDATE\s+("?[\w$."]+"?)/i.exec(plano))) exigirTabla(nombreCompleto(m[1]), 'UPDATE');
    else if ((m = /^(?:DELETE\s+FROM|TRUNCATE\s+(?:TABLE\s+)?(?:IF\s+EXISTS\s+)?)\s*("?[\w$."]+"?)/i.exec(plano))) exigirTabla(nombreCompleto(m[1]), 'DELETE');
    else if ((m = /^MERGE\s+INTO\s+("?[\w$."]+"?)/i.exec(plano))) exigirTabla(nombreCompleto(m[1]), 'UPDATE');
    else if ((m = /^COPY\s+INTO\s+("?[\w$."]+"?)/i.exec(plano))) exigirTabla(nombreCompleto(m[1]), 'INSERT');
    else if ((m = /^CREATE\s+(?:OR\s+REPLACE\s+)?(?:TRANSIENT\s+|TEMPORARY\s+)?(TABLE|VIEW)\s+(?:IF\s+NOT\s+EXISTS\s+)?("?[\w$."]+"?)/i.exec(plano))) {
      const n = nombreCompleto(m[2]);
      if (!tiene('USAGE', 'DATABASE', n.db) || !tiene('USAGE', 'SCHEMA', `${n.db}.${n.esquema}`) || !tiene(`CREATE ${m[1].toUpperCase()}`, 'SCHEMA', `${n.db}.${n.esquema}`)) throw sinPermiso(`schema '${n.esquema}'`);
    } else if ((m = /^(?:DROP|ALTER|UNDROP)\s+(?:TABLE|VIEW)\s+(?:IF\s+EXISTS\s+)?("?[\w$."]+"?)/i.exec(plano))) {
      const n = nombreCompleto(m[1]); const d = (s.duenos || {})[`TABLE:${n.db}.${n.esquema}.${n.tabla}`];
      if (!(d && ef.has(d))) throw sinPermiso(`table '${n.tabla}'`);
    }
  }
  function anotarDueno(sql) {
    const m = /^CREATE\s+(?:OR\s+REPLACE\s+)?(?:TRANSIENT\s+|TEMPORARY\s+)?(?:TABLE|VIEW)\s+(?:IF\s+NOT\s+EXISTS\s+)?("?[\w$."]+"?)/i.exec(sql); if (!m) return;
    const s = st(); const n = nombreCompleto(m[1]); s.duenos = s.duenos || {}; s.duenos[`TABLE:${n.db}.${n.esquema}.${n.tabla}`] = s.ctx.rol;
  }

  // ---------------------------------------------------------------- ejecutar una sentencia
  async function ejecutarUna(sqlOriginal, op = {}) {
    const s = st(); tick();
    const sql = sinComentarios(sqlOriginal).replace(/;\s*$/, '');
    const U = sql.toUpperCase().replace(/\s+/g, ' ');
    let m;
    // --- contexto
    if ((m = /^USE\s+ROLE\s+("?[\w$]+"?)$/i.exec(sql))) {
      const r = nombreSf(m[1]); if (!ROLES_SISTEMA.includes(r) && !s.roles[r]) throw err(`Role '${r}' specified in the connect string does not exist or not authorized.`, '390189');
      if (!ROLES_SISTEMA.includes(r) && !op.replay) {
        // el usuario de práctica tiene todos los roles del sistema; un rol creado hay que asignárselo (o a uno de esos roles)
        const asignado = s.grants.some((g) => g.tipo === 'ROLE' && g.obj === r && (g.aTipo === 'USER' ? g.a === USUARIO : ROLES_SISTEMA.includes(g.a) || rolesEfectivos('ACCOUNTADMIN').has(g.a)));
        if (!asignado) throw err(`Requested role '${r}' is not assigned to the executing user. Specify another role to activate.\nAsígnalo primero: GRANT ROLE ${r} TO USER ${USUARIO};`, '390189');
      }
      s.ctx.rol = r; return { estado: 'Statement executed successfully.' };
    }
    if ((m = /^USE\s+WAREHOUSE\s+("?[\w$]+"?)$/i.exec(sql))) {
      const w = nombreSf(m[1]); if (!s.warehouses[w]) throw err(`Object does not exist, or operation cannot be performed.`, '000606');
      s.ctx.wh = w; return { estado: 'Statement executed successfully.' };
    }
    if ((m = /^USE\s+(?:DATABASE\s+)?("?[\w$]+"?)$/i.exec(sql)) && !/^USE\s+(SCHEMA|ROLE|WAREHOUSE|SECONDARY)\b/i.test(sql)) {
      const d = nombreSf(m[1]); if (!(await dbExiste(d))) throw err(`Object does not exist, or operation cannot be performed.`, '002043');
      s.ctx.db = d; s.ctx.esquema = 'PUBLIC'; await usarContexto(); return { estado: 'Statement executed successfully.' };
    }
    if ((m = /^USE\s+SCHEMA\s+(?:("?[\w$]+"?)\.)?("?[\w$]+"?)$/i.exec(sql))) {
      const d = m[1] ? nombreSf(m[1]) : s.ctx.db, e = nombreSf(m[2]);
      if (!(await esquemaExiste(d, e))) throw err(`Object does not exist, or operation cannot be performed.`, '002043');
      s.ctx.db = d; s.ctx.esquema = e; await usarContexto(); return { estado: 'Statement executed successfully.' };
    }
    // --- warehouses
    if ((m = /^CREATE\s+(OR\s+REPLACE\s+)?WAREHOUSE\s+(IF\s+NOT\s+EXISTS\s+)?("?[\w$]+"?)(.*)$/is.exec(sql))) {
      const w = nombreSf(m[3]);
      if (!op.replay && !esAdminDatos(rolesEfectivos(s.ctx.rol))) throw sinPermiso("account 'PRACTICA01' (CREATE WAREHOUSE lo tienen SYSADMIN y ACCOUNTADMIN)");
      if (s.warehouses[w] && !m[1]) { if (m[2]) return { estado: `${w} already exists, statement succeeded.` }; throw err(`Object '${w}' already exists.`, '002002'); }
      const o = opciones(m[4]);
      s.warehouses[w] = { nombre: w, tamano: TAMANO(o.WAREHOUSE_SIZE || 'XSMALL'), autoSuspend: o.AUTO_SUSPEND !== undefined ? Number(o.AUTO_SUSPEND) : 600, autoResume: o.AUTO_RESUME === undefined ? true : /TRUE/i.test(o.AUTO_RESUME), estado: /TRUE/i.test(o.INITIALLY_SUSPENDED || '') ? 'SUSPENDED' : 'STARTED', creditos: 0, desde: Date.now(), ultima: Date.now(), dueno: s.ctx.rol, creado: Date.now() };
      if (!CREDITOS_HORA[s.warehouses[w].tamano]) { delete s.warehouses[w]; throw err(`invalid value '${o.WAREHOUSE_SIZE}' for property 'warehouse_size'`, '001008'); }
      s.ctx.wh = w; guardar();
      return { estado: `Warehouse ${w} successfully created.` };
    }
    // --- resource monitors (solo ACCOUNTADMIN)
    if ((m = /^CREATE\s+(OR\s+REPLACE\s+)?RESOURCE\s+MONITOR\s+(IF\s+NOT\s+EXISTS\s+)?("?[\w$]+"?)\s*([\s\S]*)$/i.exec(sql))) {
      if (!rolesEfectivos(s.ctx.rol).has('ACCOUNTADMIN')) throw sinPermiso('account (solo ACCOUNTADMIN puede crear resource monitors)');
      const nom = nombreSf(m[3]); s.monitores = s.monitores || {};
      if (s.monitores[nom] && !m[1]) { if (m[2]) return { estado: 'Statement executed successfully.' }; throw err(`SQL compilation error:\nObject '${nom}' already exists.`, '002002'); }
      const cuerpo = m[4] || ''; const q = /CREDIT_QUOTA\s*=\s*(\d+(?:\.\d+)?)/i.exec(cuerpo); const fr = /FREQUENCY\s*=\s*(\w+)/i.exec(cuerpo);
      const triggers = [...cuerpo.matchAll(/ON\s+(\d+)\s+PERCENT\s+DO\s+(NOTIFY|SUSPEND_IMMEDIATE|SUSPEND)/gi)].map((x) => ({ pct: Number(x[1]), accion: x[2].toUpperCase() }));
      s.monitores[nom] = { nombre: nom, cuota: q ? Number(q[1]) : null, frecuencia: fr ? fr[1].toUpperCase() : 'MONTHLY', triggers, creado: Date.now() };
      guardar(); return { estado: `Resource monitor ${nom} successfully created.` };
    }
    if (/^SHOW\s+RESOURCE\s+MONITORS/i.test(sql)) {
      const ms = Object.values(s.monitores || {});
      const usados = (nom) => Object.values(s.warehouses).filter((w) => w.monitor === nom).reduce((a, w) => a + (w.creditos || 0), 0);
      return filas(['name', 'credit_quota', 'used_credits', 'remaining_credits', 'level', 'frequency', 'notify_at', 'suspend_at', 'suspend_immediately_at'],
        ms.map((x) => { const u = usados(x.nombre); const t = (a) => (x.triggers.find((y) => y.accion === a) || {}).pct; return [x.nombre, x.cuota, Number(u.toFixed(3)), x.cuota == null ? null : Number((x.cuota - u).toFixed(3)), Object.values(s.warehouses).some((w) => w.monitor === x.nombre) ? 'WAREHOUSE' : null, x.frecuencia, t('NOTIFY') ? t('NOTIFY') + '%' : null, t('SUSPEND') ? t('SUSPEND') + '%' : null, t('SUSPEND_IMMEDIATE') ? t('SUSPEND_IMMEDIATE') + '%' : null]; }));
    }
    if ((m = /^ALTER\s+WAREHOUSE\s+(IF\s+EXISTS\s+)?("?[\w$]+"?)\s+SET\s+RESOURCE_MONITOR\s*=\s*("?[\w$]+"?)\s*$/i.exec(sql))) {
      const w = s.warehouses[nombreSf(m[2])]; if (!w) throw err('Object does not exist, or operation cannot be performed.', '000606');
      if (!rolesEfectivos(s.ctx.rol).has('ACCOUNTADMIN')) throw sinPermiso(`warehouse '${w.nombre}' (solo ACCOUNTADMIN asigna resource monitors)`);
      const mon = nombreSf(m[3]); if (!(s.monitores || {})[mon]) throw err(`SQL compilation error:\nResource monitor '${mon}' does not exist or not authorized.`, '002003');
      w.monitor = mon; guardar(); return { estado: 'Statement executed successfully.' };
    }
    if ((m = /^ALTER\s+WAREHOUSE\s+(IF\s+EXISTS\s+)?("?[\w$]+"?)\s+(SUSPEND|RESUME(?:\s+IF\s+SUSPENDED)?|SET\s+(.*))$/is.exec(sql))) {
      const w = s.warehouses[nombreSf(m[2])]; if (!w) throw err(`Object does not exist, or operation cannot be performed.`, '000606');
      { const ef = rolesEfectivos(s.ctx.rol); if (!esAdminDatos(ef) && !ef.has(w.dueno) && !tiene('OPERATE', 'WAREHOUSE', w.nombre) && !tiene('MODIFY', 'WAREHOUSE', w.nombre)) throw sinPermiso(`warehouse '${w.nombre}'`); }
      if (/^SUSPEND/i.test(m[3])) { if (w.estado !== 'STARTED') throw err('Invalid state. Warehouse cannot be suspended.', '000620'); suspender(w); }
      else if (/^RESUME/i.test(m[3])) { if (w.estado === 'STARTED' && !/IF/i.test(m[3])) throw err('Invalid state. Warehouse cannot be resumed.', '000621'); reanudar(w); }
      else { const o = opciones(m[4]); if (o.WAREHOUSE_SIZE) { const t = TAMANO(o.WAREHOUSE_SIZE); if (!CREDITOS_HORA[t]) throw err(`invalid value '${o.WAREHOUSE_SIZE}' for property 'warehouse_size'`, '001008'); if (w.estado === 'STARTED') { suspender(w); reanudar(w); } w.tamano = t; } if (o.AUTO_SUSPEND !== undefined) w.autoSuspend = Number(o.AUTO_SUSPEND); if (o.AUTO_RESUME !== undefined) w.autoResume = /TRUE/i.test(o.AUTO_RESUME); }
      guardar(); return { estado: 'Statement executed successfully.' };
    }
    if ((m = /^DROP\s+WAREHOUSE\s+(IF\s+EXISTS\s+)?("?[\w$]+"?)$/i.exec(sql))) {
      const w = nombreSf(m[2]); if (!s.warehouses[w]) { if (m[1]) return { estado: 'Statement executed successfully.' }; throw err('Object does not exist, or operation cannot be performed.', '000606'); }
      { const ef = rolesEfectivos(s.ctx.rol); if (!esAdminDatos(ef) && !ef.has(s.warehouses[w].dueno)) throw sinPermiso(`warehouse '${w}'`); }
      suspender(s.warehouses[w]); delete s.warehouses[w]; if (s.ctx.wh === w) s.ctx.wh = null; guardar();
      return { estado: `${w} successfully dropped.` };
    }
    // --- roles y permisos
    if ((m = /^CREATE\s+(OR\s+REPLACE\s+)?ROLE\s+(IF\s+NOT\s+EXISTS\s+)?("?[\w$]+"?)/i.exec(sql))) {
      const r = nombreSf(m[3]);
      { const ef = rolesEfectivos(s.ctx.rol); if (!ef.has('USERADMIN')) throw sinPermiso("account 'PRACTICA01' (CREATE ROLE lo tienen USERADMIN, SECURITYADMIN y ACCOUNTADMIN: ejecuta USE ROLE SECURITYADMIN;)"); }
      if ((s.roles[r] || ROLES_SISTEMA.includes(r)) && !m[1]) { if (m[2]) return { estado: `${r} already exists, statement succeeded.` }; throw err(`Object '${r}' already exists.`, '002002'); }
      s.roles[r] = { nombre: r, dueno: s.ctx.rol, creado: Date.now() }; guardar(); return { estado: `Role ${r} successfully created.` };
    }
    if ((m = /^DROP\s+ROLE\s+(IF\s+EXISTS\s+)?("?[\w$]+"?)$/i.exec(sql))) {
      const r = nombreSf(m[2]); if (!s.roles[r]) { if (m[1]) return { estado: 'Statement executed successfully.' }; throw err(`Role '${r}' does not exist or not authorized.`, '002003'); }
      delete s.roles[r]; s.grants = s.grants.filter((g) => g.a !== r && g.priv !== r); guardar(); return { estado: `${r} successfully dropped.` };
    }
    if ((m = /^GRANT\s+ROLE\s+("?[\w$]+"?)\s+TO\s+(ROLE|USER)\s+("?[\w$]+"?)$/i.exec(sql))) {
      const r = nombreSf(m[1]); if (!s.roles[r] && !ROLES_SISTEMA.includes(r)) throw err(`Role '${r}' does not exist or not authorized.`);
      { const ef = rolesEfectivos(s.ctx.rol); if (!ef.has('SECURITYADMIN') && !(s.roles[r] && ef.has(s.roles[r].dueno))) throw sinPermiso(`role '${r}' (GRANT ROLE lo puede hacer el dueño del rol, SECURITYADMIN o ACCOUNTADMIN)`); }
      s.grants.push({ priv: 'USAGE', tipo: 'ROLE', obj: r, a: nombreSf(m[3]), aTipo: m[2].toUpperCase(), por: s.ctx.rol, cuando: Date.now() }); guardar();
      return { estado: 'Statement executed successfully.' };
    }
    if ((m = /^(GRANT|REVOKE)\s+(.+?)\s+ON\s+(?:(ALL|FUTURE)\s+(TABLES|VIEWS|SCHEMAS)\s+IN\s+(SCHEMA|DATABASE)|(WAREHOUSE|DATABASE|SCHEMA|TABLE|VIEW|STAGE|INTEGRATION))\s+("?[\w$."]+"?)\s+(TO|FROM)\s+(?:ROLE\s+)?("?[\w$]+"?)$/i.exec(sql))) {
      const a = nombreSf(m[9]); if (!s.roles[a] && !ROLES_SISTEMA.includes(a)) throw err(`Role '${a}' does not exist or not authorized.`);
      const tipo = (m[3] ? `${m[3]} ${m[4]} IN ${m[5]}` : m[6]).toUpperCase(); let obj = m[7].replace(/"/g, '').toUpperCase();
      // el objeto se guarda con su nombre completo, para que el permiso no dependa del contexto en que se otorgó
      if (/SCHEMA$/.test(tipo) && !obj.includes('.')) obj = `${s.ctx.db}.${obj}`; else if (/^(TABLE|VIEW)$/.test(tipo)) { const n = nombreCompleto(obj); obj = `${n.db}.${n.esquema}.${n.tabla}`; }
      { const ef = rolesEfectivos(s.ctx.rol); if (!esAdminDatos(ef) && !ef.has('SECURITYADMIN')) throw sinPermiso(`${tipo.toLowerCase()} '${obj}' (para otorgar permisos hace falta ser dueño del objeto, SECURITYADMIN o ACCOUNTADMIN)`); }
      const privs = m[2].toUpperCase().split(',').map((x) => x.trim());
      if (m[1].toUpperCase() === 'GRANT') for (const p of privs) s.grants.push({ priv: p, tipo, obj, a, aTipo: 'ROLE', por: s.ctx.rol, cuando: Date.now() });
      else s.grants = s.grants.filter((g) => !(g.a === a && g.obj === obj && g.tipo === tipo && (privs.includes(g.priv) || privs.includes('ALL') || privs.includes('ALL PRIVILEGES'))));
      guardar(); return { estado: 'Statement executed successfully.' };
    }
    // --- SHOW
    if (/^SHOW\s+WAREHOUSES/i.test(sql)) {
      const ws = Object.values(s.warehouses).filter((w) => likeOk(sql, w.nombre));
      return filas(['name', 'state', 'type', 'size', 'auto_suspend', 'auto_resume', 'owner', 'created_on'], ws.map((w) => [w.nombre, w.estado, 'STANDARD', w.tamano.replace('XSMALL', 'X-Small').replace('SMALL', 'Small').replace('MEDIUM', 'Medium').replace('XLARGE', 'X-Large').replace('LARGE', 'Large'), w.autoSuspend, String(w.autoResume), w.dueno, fecha(w.creado)]));
    }
    if (/^SHOW\s+ROLES/i.test(sql)) return filas(['name', 'is_default', 'is_current', 'owner', 'comment'], [...ROLES_SISTEMA, ...Object.keys(s.roles)].filter((r) => likeOk(sql, r)).map((r) => [r, r === 'SYSADMIN' ? 'Y' : 'N', r === s.ctx.rol ? 'Y' : 'N', s.roles[r] ? s.roles[r].dueno : '', ROLES_SISTEMA.includes(r) ? 'rol del sistema' : '']));
    if ((m = /^SHOW\s+GRANTS\s+(?:TO|ON)\s+(ROLE|USER|WAREHOUSE|DATABASE|SCHEMA|TABLE)?\s*("?[\w$."]+"?)$/i.exec(sql))) {
      const x = m[2].replace(/"/g, '').toUpperCase(); const to = /\bTO\b/i.test(sql);
      const lista = s.grants.filter((g) => (to ? g.a === x : g.obj === x));
      return filas(['created_on', 'privilege', 'granted_on', 'name', 'granted_to', 'grantee_name', 'granted_by'], lista.map((g) => [fecha(g.cuando), g.priv, g.tipo, g.obj, g.aTipo, g.a, g.por]));
    }
    if (/^SHOW\s+DATABASES/i.test(sql)) return filas(['created_on', 'name', 'is_current', 'origin', 'owner', 'kind'], (await bases()).filter((d) => likeOk(sql, d)).map((d) => [fecha(Date.now() - 86400000), d, d === s.ctx.db ? 'Y' : 'N', '', d === 'SNOWFLAKE_SAMPLE_DATA' ? '' : 'SYSADMIN', 'STANDARD']));
    if ((m = /^SHOW\s+SCHEMAS(?:\s+LIKE\s+'[^']*')?(?:\s+IN\s+(?:DATABASE\s+)?("?[\w$]+"?))?$/i.exec(sql))) {
      const d = m[1] ? nombreSf(m[1]) : s.ctx.db; return filas(['created_on', 'name', 'is_current', 'database_name', 'owner'], (await esquemas(d)).filter((e) => likeOk(sql, e)).map((e) => [fecha(Date.now() - 86400000), e, d === s.ctx.db && e === s.ctx.esquema ? 'Y' : 'N', d, 'SYSADMIN']));
    }
    if ((m = /^SHOW\s+(TABLES|VIEWS)(?:\s+LIKE\s+'[^']*')?(?:\s+IN\s+(?:SCHEMA\s+|DATABASE\s+)?("?[\w$."]+"?))?$/i.exec(sql))) {
      let d = s.ctx.db, e = s.ctx.esquema; if (m[2]) { const p = m[2].replace(/"/g, '').toUpperCase().split('.'); if (p.length === 2) { d = p[0]; e = p[1]; } else e = p[0]; }
      const ts = (await tablas(d, e)).filter((t) => (m[1].toUpperCase() === 'VIEWS') === t.vista && likeOk(sql, t.nombre));
      return filas(['created_on', 'name', 'database_name', 'schema_name', 'kind', 'rows', 'owner'], ts.map((t) => [fecha(Date.now() - 3600000), t.nombre, d, e, t.vista ? 'VIEW' : 'TABLE', t.vista ? null : t.filas, 'SYSADMIN']));
    }
    if (/^SHOW\s+STAGES/i.test(sql)) return filas(['created_on', 'name', 'database_name', 'schema_name', 'url', 'type', 'owner'], Object.values(s.stages).map((x) => [fecha(x.creado), x.nombre, x.db, x.esquema, x.url || '', x.url ? 'EXTERNAL' : 'INTERNAL', x.dueno]));
    if (/^SHOW\s+USERS/i.test(sql)) return filas(['name', 'login_name', 'default_role', 'default_warehouse', 'has_password'], [[USUARIO, USUARIO, 'SYSADMIN', 'COMPUTE_WH', 'true']]);
    // --- bases y esquemas
    if ((m = /^CREATE\s+(OR\s+REPLACE\s+)?(?:TRANSIENT\s+)?DATABASE\s+(IF\s+NOT\s+EXISTS\s+)?("?[\w$]+"?)(?:\s+CLONE\s+("?[\w$]+"?))?/i.exec(sql))) {
      const d = nombreSf(m[3]);
      if (!op.replay && !esAdminDatos(rolesEfectivos(s.ctx.rol))) throw sinPermiso("account 'PRACTICA01' (CREATE DATABASE lo tienen SYSADMIN y ACCOUNTADMIN)");
      if (await dbExiste(d)) { if (m[2]) return { estado: `${d} already exists, statement succeeded.` }; if (!m[1]) throw err(`Object '${d}' already exists.`, '002002'); await con.query(`DETACH ${ident(d)}`); }
      await con.query(`ATTACH ':memory:' AS ${ident(d)}`); await con.query(`CREATE SCHEMA IF NOT EXISTS ${ident(d)}.public`);
      if (m[4]) { const src = nombreSf(m[4]); for (const e of await esquemas(src)) { await con.query(`CREATE SCHEMA IF NOT EXISTS ${ident(d)}.${ident(e)}`); for (const t of await tablas(src, e)) if (!t.vista) await con.query(`CREATE TABLE ${ident(d)}.${ident(e)}.${ident(t.nombre)} AS SELECT * FROM ${ident(src)}.${ident(e)}.${ident(t.nombre)}`); } }
      if (!op.replay) { s.ctx.db = d; s.ctx.esquema = 'PUBLIC'; await usarContexto(); }
      return { estado: `Database ${d} successfully created.`, persistir: true };
    }
    if ((m = /^DROP\s+DATABASE\s+(IF\s+EXISTS\s+)?("?[\w$]+"?)$/i.exec(sql))) {
      const d = nombreSf(m[2]); if (!(await dbExiste(d))) { if (m[1]) return { estado: 'Statement executed successfully.' }; throw err(`Database '${d}' does not exist or not authorized.`, '002003'); }
      if (s.ctx.db === d) { s.ctx.db = 'TIENDA_ANDINA'; s.ctx.esquema = 'PUBLIC'; await usarContexto(); }
      await con.query(`DETACH ${ident(d)}`); return { estado: `${d} successfully dropped.`, persistir: true };
    }
    if ((m = /^CREATE\s+(OR\s+REPLACE\s+)?(?:TRANSIENT\s+)?SCHEMA\s+(IF\s+NOT\s+EXISTS\s+)?(?:("?[\w$]+"?)\.)?("?[\w$]+"?)/i.exec(sql))) {
      const d = m[3] ? nombreSf(m[3]) : s.ctx.db, e = nombreSf(m[4]);
      if (!op.replay && !tiene('CREATE SCHEMA', 'DATABASE', d)) throw sinPermiso(`database '${d}'`);
      if (await esquemaExiste(d, e)) { if (m[2]) return { estado: `${e} already exists, statement succeeded.` }; if (!m[1]) throw err(`Object '${e}' already exists.`, '002002'); await con.query(`DROP SCHEMA ${ident(d)}.${ident(e)} CASCADE`); }
      await con.query(`CREATE SCHEMA ${ident(d)}.${ident(e)}`);
      if (!op.replay) { s.ctx.db = d; s.ctx.esquema = e; await usarContexto(); }
      return { estado: `Schema ${e} successfully created.`, persistir: true };
    }
    // --- stages y COPY INTO
    if ((m = /^CREATE\s+(OR\s+REPLACE\s+)?(?:TEMPORARY\s+)?STAGE\s+(IF\s+NOT\s+EXISTS\s+)?("?[\w$]+"?)/i.exec(sql))) {
      const x = nombreSf(m[3]); if (s.stages[x] && !m[1]) { if (m[2]) return { estado: `${x} already exists, statement succeeded.` }; throw err(`Object '${x}' already exists.`, '002002'); }
      // stage externo: URL = 'azure://<cuenta>.blob.core.windows.net/<contenedor>/<ruta>' CREDENTIALS = (AZURE_SAS_TOKEN = '…')
      const url = (/\bURL\s*=\s*'([^']+)'/i.exec(sql) || [])[1] || null;
      const sas = (/AZURE_SAS_TOKEN\s*=\s*'([^']*)'/i.exec(sql) || [])[1] || null;
      if (url) {
        const L = window.LagoAzure; const p = L && L.parsear(url);
        if (!p || p.esquema !== 'azure') throw err(`Invalid URL '${url}'. Un stage externo en Azure usa azure://<cuenta>.blob.core.windows.net/<contenedor>/<ruta>.`, '001003');
        if (/STORAGE_INTEGRATION/i.test(sql)) throw err('En esta práctica el stage externo se autentica con CREDENTIALS = (AZURE_SAS_TOKEN = \'…\'). Una STORAGE INTEGRATION es lo recomendado en producción (sin tokens que vencen), pero pide permisos en el tenant de Azure.', '000002');
        if (!sas) throw err('Falta CREDENTIALS = (AZURE_SAS_TOKEN = \'?sv=…\'). Genera el token en el portal de Azure: cuenta de almacenamiento → Shared access signature (permisos Read y List).', '091003');
        try { L.listar(url); } catch (e) { throw err(`Failure using stage area. Cause: [${e.message}]`, '091003'); }
      }
      s.stages[x] = { nombre: x, db: s.ctx.db, esquema: s.ctx.esquema, dueno: s.ctx.rol, creado: Date.now(), archivos: (s.stages[x] && s.stages[x].archivos) || {}, ...(url ? { url, sas } : {}) };
      guardar(); return { estado: `Stage area ${x} successfully created.` };
    }
    if ((m = /^(?:LIST|LS)\s+@("?[\w$]+"?)(\/\S*)?(?:\s+PATTERN\s*=\s*'([^']*)')?$/i.exec(sql))) {
      const x = s.stages[nombreSf(m[1])]; if (!x) throw err(`Stage '${s.ctx.db}.${s.ctx.esquema}.${nombreSf(m[1])}' does not exist or not authorized.`, '002003');
      const re = m[3] ? new RegExp(m[3], 'i') : null;
      if (x.url) return filas(['name', 'size', 'md5', 'last_modified'], Object.entries(archivosStage(x)).filter(([n]) => (!m[2] || n.startsWith(m[2].slice(1))) && (!re || re.test(n))).map(([n, a]) => [`${x.url.replace(/\/$/, '')}/${n}`, a.texto.length, md5ish(a.texto), new Date(a.cuando).toUTCString()]));
      return filas(['name', 'size', 'md5', 'last_modified'], Object.entries(x.archivos).filter(([n]) => (!m[2] || n.startsWith(m[2].slice(1))) && (!re || re.test(n))).map(([n, a]) => [`${x.nombre.toLowerCase()}/${n}`, a.texto.length, md5ish(a.texto), new Date(a.cuando).toUTCString()]));
    }
    if ((m = /^REMOVE\s+@("?[\w$]+"?)\/?(\S*)$/i.exec(sql))) {
      const x = s.stages[nombreSf(m[1])]; if (!x) throw err('Stage does not exist or not authorized.', '002003');
      if (x.url) throw err('REMOVE en un stage externo borraría archivos del lago: en esta práctica bórralos desde el portal de Azure.', '091003');
      const borrados = Object.keys(x.archivos).filter((n) => !m[2] || n.startsWith(m[2])); borrados.forEach((n) => delete x.archivos[n]); guardar();
      return filas(['name', 'result'], borrados.map((n) => [`${x.nombre.toLowerCase()}/${n}`, 'removed']));
    }
    if ((m = /^COPY\s+INTO\s+("?[\w$."]+"?)\s+FROM\s+@("?[\w$]+"?)(\/\S*)?(.*)$/is.exec(sql))) {
      await requiereWarehouse(); if (!op.replay) exigirPermisos(sql);
      const x = s.stages[nombreSf(m[2])]; if (!x) throw err('Stage does not exist or not authorized.', '002003');
      const n = nombreCompleto(m[1]); const resto = m[4] || '';
      const skip = /SKIP_HEADER\s*=\s*(\d+)/i.exec(resto); const delim = /FIELD_DELIMITER\s*=\s*'([^']*)'/i.exec(resto); const pat = /PATTERN\s*=\s*'([^']*)'/i.exec(resto);
      const tipo = (/TYPE\s*=\s*'?(\w+)/i.exec(resto) || [, 'CSV'])[1].toUpperCase();
      const onErr = /ON_ERROR\s*=\s*'?(\w+)/i.exec(resto); const force = /FORCE\s*=\s*TRUE/i.test(resto);
      const cargados = (x.cargados = x.cargados || {});
      const res = [];
      for (const [nom, a] of Object.entries(archivosStage(x))) {
        if (m[3] && !nom.startsWith(m[3].slice(1))) continue; if (pat && !new RegExp(pat[1], 'i').test(nom)) continue;
        const clave = `${n.db}.${n.esquema}.${n.tabla}`;
        if (!force && (cargados[clave] || []).includes(nom)) { res.push([`${x.nombre.toLowerCase()}/${nom}`, 'LOAD_SKIPPED', 0, 0, null]); continue; }
        await copiaOculta(n, 'COPY INTO', op.qid);
        const D = window.SqlMotores.DUCK; const tmp = `__stage_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${tipo === 'JSON' ? 'json' : 'csv'}`;
        await D._db.registerFileText(tmp, a.texto);
        try {
          const antes = Number((await con.query(`SELECT count(*) AS n FROM ${ref(n)}`)).toArray()[0].n);
          const lector = tipo === 'JSON' ? `read_json_auto('${tmp}')` : `read_csv('${tmp}', header = false, skip = ${skip ? Number(skip[1]) : 0}, delim = '${delim ? delim[1] : ','}', auto_detect = true${onErr && /CONTINUE/i.test(onErr[1]) ? ', ignore_errors = true' : ''})`;
          await con.query(`INSERT INTO ${ref(n)} SELECT * FROM ${lector}`);
          const despues = Number((await con.query(`SELECT count(*) AS n FROM ${ref(n)}`)).toArray()[0].n);
          res.push([`${x.nombre.toLowerCase()}/${nom}`, 'LOADED', a.texto.split('\n').filter(Boolean).length - (skip ? Number(skip[1]) : 0), despues - antes, null]);
          (cargados[clave] = cargados[clave] || []).push(nom);
        } catch (e) {
          res.push([`${x.nombre.toLowerCase()}/${nom}`, 'LOAD_FAILED', 0, 0, String(e.message).split('\n')[0].slice(0, 200)]);
          if (!onErr || /ABORT/i.test(onErr[1])) { await D._db.dropFile(tmp); throw err(`${String(e.message).split('\n')[0]}\n  File '${nom}'\n  Si el archivo tiene encabezado, agrega FILE_FORMAT = (TYPE = CSV SKIP_HEADER = 1).`, '100038'); }
        }
        await D._db.dropFile(tmp);
      }
      guardar();
      if (!res.length) return { estado: 'Copy executed with 0 files processed.' };
      return { ...filas(['file', 'status', 'rows_parsed', 'rows_loaded', 'first_error'], res), persistir: true };
    }
    // --- UNDROP
    if ((m = /^UNDROP\s+TABLE\s+("?[\w$."]+"?)$/i.exec(sql))) {
      if (!op.replay) exigirPermisos(sql);
      const n = nombreCompleto(m[1]); const k = `${n.db}.${n.esquema}.${n.tabla}`; const b = (s.borradas || {})[k];
      if (!b || !b.length) throw err(`Table ${n.tabla} did not exist or was purged.`, '002003');
      const ult = b.pop(); await con.query(`ALTER TABLE ${ref(n, ult.oculto)} RENAME TO ${ident(n.tabla)}`); guardar();
      return { estado: `Table ${n.tabla} successfully restored.`, persistir: true };
    }
    // --- todo lo demás va a DuckDB (con traducción)
    const esDml = /^(INSERT|UPDATE|DELETE|MERGE|TRUNCATE)\b/i.test(sql);
    const esDdl = /^(CREATE|ALTER|DROP|COMMENT)\b/i.test(sql);
    const soloMeta = /^(DESCRIBE|DESC|EXPLAIN)\b/i.test(sql);
    if (!op.replay) exigirPermisos(sql);
    if (!soloMeta && !/^SELECT\s+(CURRENT_\w+\(\)\s*(,\s*CURRENT_\w+\(\)\s*)*|\d+|'[^']*')\s*;?$/i.test(sql)) await requiereWarehouse();
    let tr = traducir(sql);
    tr = resolverTimeTravel(tr);
    // CREATE TABLE x CLONE y  →  copia (en Snowflake no copia datos: comparte los micro-particiones)
    tr = tr.replace(/^CREATE\s+(OR\s+REPLACE\s+)?(TRANSIENT\s+)?TABLE\s+([\w."]+)\s+CLONE\s+([\w."]+)\s*$/i, (mm, rep, tr2, a, b) => `CREATE ${rep || ''}TABLE ${a} AS SELECT * FROM ${b}`);
    tr = tr.replace(/^CREATE\s+(OR\s+REPLACE\s+)?TRANSIENT\s+TABLE/i, (mm, rep) => `CREATE ${rep || ''}TABLE`);
    tr = tr.replace(/^TRUNCATE\s+TABLE\s+(IF\s+EXISTS\s+)?/i, 'DELETE FROM ');
    if (esDml) { const t = /^(?:INSERT\s+(?:OVERWRITE\s+)?INTO|UPDATE|DELETE\s+FROM|MERGE\s+INTO|TRUNCATE\s+(?:TABLE\s+)?(?:IF\s+EXISTS\s+)?)\s+("?[\w$."]+"?)/i.exec(sql); if (t && !op.replay) await copiaOculta(nombreCompleto(t[1]), sql.split(/\s+/)[0].toUpperCase(), op.qid); }
    if ((m = /^DROP\s+TABLE\s+(IF\s+EXISTS\s+)?("?[\w$."]+"?)$/i.exec(sql))) {
      const n = nombreCompleto(m[2]);
      if (!(await tablas(n.db, n.esquema)).some((t) => t.nombre === n.tabla && !t.vista)) { if (m[1]) return { estado: 'Statement executed successfully.' }; throw err(`Table '${n.db}.${n.esquema}.${n.tabla}' does not exist or not authorized.`, '002003'); }
      const oculto = `__drop_${n.tabla.toLowerCase()}_${Date.now().toString(36)}`;
      await con.query(`ALTER TABLE ${ref(n)} RENAME TO ${ident(oculto)}`);
      s.borradas = s.borradas || {}; const k = `${n.db}.${n.esquema}.${n.tabla}`; (s.borradas[k] = s.borradas[k] || []).push({ oculto, cuando: Date.now() });
      guardar(); return { estado: `${n.tabla} successfully dropped.`, persistir: true };
    }
    if (/^INSERT\s+OVERWRITE\s+INTO\s+/i.test(tr)) { const t = /^INSERT\s+OVERWRITE\s+INTO\s+([\w."]+)/i.exec(tr)[1]; await con.query(`DELETE FROM ${t}`); tr = tr.replace(/^INSERT\s+OVERWRITE\s+INTO/i, 'INSERT INTO'); }
    if (/^MERGE\s+INTO\b/i.test(tr)) {
      let c;
      try { c = await mergeDuck(tr); } catch (e) { if (e.codigo) throw e; throw err(mensajeError(String(e.message || e), sql), '000904'); }
      anotarDueno(sql);
      return { ...filas(['number of rows inserted', 'number of rows updated', 'number of rows deleted'], [[c.ins, c.upd, c.del]]), persistir: true };
    }
    let r;
    try { r = await con.query(tr); }
    catch (e) { throw err(mensajeError(String(e.message || e), sql), '000904'); }
    anotarDueno(sql);
    const campos = r.schema.fields; const D = window.SqlMotores.DUCK;
    if (campos.length === 1 && campos[0].name === 'Count' && (esDml || esDdl)) {
      const n = Number((r.toArray()[0] || {}).Count || 0);
      if (/^INSERT/i.test(sql)) return { ...filas(['number of rows inserted'], [[n]]), persistir: true };
      if (/^UPDATE/i.test(sql)) return { ...filas(['number of rows updated', 'number of multi-joined rows updated'], [[n, 0]]), persistir: true };
      if (/^(DELETE|TRUNCATE)/i.test(sql)) return { ...filas(['number of rows deleted'], [[n]]), persistir: true };
      if (/^MERGE/i.test(sql)) return { ...filas(['number of rows affected'], [[n]]), persistir: true };
      const tc = /^CREATE\s+(?:OR\s+REPLACE\s+)?(?:TRANSIENT\s+|TEMPORARY\s+)?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?("?[\w$."]+"?)/i.exec(sql);
      return { estado: tc ? `Table ${nombreCompleto(tc[1]).tabla} successfully created.` : 'Statement executed successfully.', persistir: true };
    }
    if (esDdl) {
      const t = /^CREATE\s+(?:OR\s+REPLACE\s+)?(?:TRANSIENT\s+|TEMPORARY\s+)?(TABLE|VIEW|SEQUENCE|FUNCTION)\s+(?:IF\s+NOT\s+EXISTS\s+)?("?[\w$."]+"?)/i.exec(sql);
      return { estado: t ? `${t[1][0].toUpperCase() + t[1].slice(1).toLowerCase()} ${nombreCompleto(t[2]).tabla} successfully created.` : 'Statement executed successfully.', persistir: true };
    }
    if (!campos.length) return { estado: 'Statement executed successfully.', persistir: esDml };
    const funcs = [...sql.matchAll(/\bCURRENT_(ROLE|WAREHOUSE|DATABASE|SCHEMA|USER|ACCOUNT|REGION)\(\)/gi)].map((x) => x[0].toUpperCase()); let fi = 0;
    const encabezado = (n) => { if (/^count_star\(\)$/i.test(n)) return 'COUNT(*)'; if (/^'.*'$/.test(n) && funcs[fi]) return funcs[fi++]; return n.toUpperCase(); };
    return { columns: campos.map((f) => encabezado(f.name)), values: r.toArray().map((fila) => campos.map((f) => D._celda(fila[f.name], f.type))) };
  }

  async function requiereWarehouse() {
    const s = st();
    if (!s.ctx.wh) throw err("No active warehouse selected in the current session.  Select an active warehouse with the 'use warehouse' command.", '000606');
    const w = s.warehouses[s.ctx.wh];
    if (!w) throw err(`Object does not exist, or operation cannot be performed.`, '000606');
    if (w.estado !== 'STARTED') { if (!w.autoResume) throw err(`Warehouse '${w.nombre}' cannot be resumed because resource monitor or AUTO_RESUME = FALSE. Ejecuta ALTER WAREHOUSE ${w.nombre} RESUME.`, '000630'); reanudar(w); }
    if (!tiene('USAGE', 'WAREHOUSE', w.nombre) && !rolesEfectivos(s.ctx.rol).has(w.dueno)) throw sinPermiso(`warehouse '${w.nombre}' (falta GRANT USAGE ON WAREHOUSE ${w.nombre} TO ROLE ${s.ctx.rol})`);
    w.ultima = Date.now();
  }
  function mensajeError(msg, sql) {
    let m;
    if ((m = /Table with name (\w+) does not exist/i.exec(msg))) return `SQL compilation error:\nObject '${m[1].toUpperCase()}' does not exist or not authorized.`;
    if ((m = /Referenced column "?(\w+)"? not found/i.exec(msg))) return `SQL compilation error: error line 1 at position 0\ninvalid identifier '${m[1].toUpperCase()}'`;
    if ((m = /Parser Error: (.*)/i.exec(msg))) return `SQL compilation error:\nsyntax error ${m[1].replace(/syntax error at or near/i, 'unexpected')}`;
    if ((m = /column "?(\w+)"? must appear in the GROUP BY clause/i.exec(msg))) return `SQL compilation error: error line 1 at position 0\n'${m[1].toUpperCase()}' in select clause is neither an aggregate nor in the group by clause.\nAgrega la columna al GROUP BY, agrégala con una función (SUM, MAX…) o usa GROUP BY ALL.`;
    if (/must appear in the GROUP BY clause|must be part of an aggregate/i.test(msg)) return `SQL compilation error:\n${msg.split('\n')[0].replace(/^Binder Error: /, '')}\nToda columna del SELECT que no esté en una agregación debe ir en el GROUP BY (o usa GROUP BY ALL).`;
    if (/Catalog Error: Schema with name (\w+)/i.test(msg)) return `SQL compilation error:\nSchema '${/Schema with name (\w+)/i.exec(msg)[1].toUpperCase()}' does not exist or not authorized.`;
    return msg.replace(/^(\w+ Error): /, 'SQL compilation error:\n');
  }
  function opciones(txt) {
    const o = {}; for (const mm of String(txt || '').matchAll(/(\w+)\s*=\s*('[^']*'|[\w-]+)/g)) o[mm[1].toUpperCase()] = mm[2].replace(/^'|'$/g, '');
    return o;
  }
  function likeOk(sql, nombre) { const m = /LIKE\s+'([^']*)'/i.exec(sql); if (!m) return true; const re = new RegExp('^' + m[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*').replace(/_/g, '.') + '$', 'i'); return re.test(nombre); }
  function md5ish(t) { let h = 0; for (let i = 0; i < t.length; i++) h = (Math.imul(31, h) + t.charCodeAt(i)) | 0; return (h >>> 0).toString(16).padStart(8, '0') + 'b2c4e1f0a9d8c7b6'; }

  // ------------------------------------------------------------------ catálogo (para el explorador)
  async function bases() { await init(); return (await con.query(`SELECT database_name FROM duckdb_databases() WHERE NOT internal AND database_name NOT IN ('memory', 'system', 'temp')`)).toArray().map((r) => r.database_name.toUpperCase()).sort(); }
  async function dbExiste(d) { return (await bases()).includes(d); }
  async function esquemas(d) { return (await con.query(`SELECT schema_name FROM duckdb_schemas() WHERE database_name = '${d.toLowerCase()}' AND NOT internal AND schema_name <> 'information_schema'`)).toArray().map((r) => r.schema_name.toUpperCase()).filter((x) => x !== 'MAIN').sort(); }
  async function esquemaExiste(d, e) { return (await esquemas(d)).includes(e); }
  async function tablas(d, e) {
    const t = (await con.query(`SELECT table_name, estimated_size FROM duckdb_tables() WHERE database_name = '${d.toLowerCase()}' AND schema_name = '${e.toLowerCase()}'`)).toArray().map((r) => ({ nombre: r.table_name.toUpperCase(), filas: Number(r.estimated_size), vista: false }));
    const v = (await con.query(`SELECT view_name FROM duckdb_views() WHERE database_name = '${d.toLowerCase()}' AND schema_name = '${e.toLowerCase()}' AND NOT internal`)).toArray().map((r) => ({ nombre: r.view_name.toUpperCase(), vista: true }));
    return [...t, ...v].filter((x) => !/^__(TT|DROP|STAGE)_/.test(x.nombre)).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }
  async function columnas(d, e, t) { return (await con.query(`SELECT column_name, data_type, is_nullable FROM duckdb_columns() WHERE database_name = '${d.toLowerCase()}' AND schema_name = '${e.toLowerCase()}' AND table_name = '${t.toLowerCase()}' ORDER BY column_index`)).toArray().map((r) => ({ nombre: r.column_name.toUpperCase(), tipo: tipoSf(r.data_type), nulo: r.is_nullable })); }
  function tipoSf(t) { t = String(t).toUpperCase(); if (/^(INTEGER|BIGINT|SMALLINT|TINYINT|HUGEINT)$/.test(t)) return 'NUMBER(38,0)'; if (/^DECIMAL/.test(t)) return t.replace('DECIMAL', 'NUMBER'); if (/DOUBLE|FLOAT|REAL/.test(t)) return 'FLOAT'; if (t === 'VARCHAR') return 'VARCHAR(16777216)'; if (/TIMESTAMP/.test(t)) return 'TIMESTAMP_NTZ(9)'; if (t === 'JSON') return 'VARIANT'; return t; }

  // ------------------------------------------------------------------ API: ejecutar un bloque
  async function ejecutar(sqlTexto, op = {}) {
    await init(op.progreso);
    const s = st(); const resultados = [];
    for (const sentencia of partir(sqlTexto)) {
      const qid = nuevoId(); const t0 = performance.now(); const inicio = Date.now();
      const ctxAntes = { ...s.ctx };
      let r, error = null;
      try { r = await ejecutarUna(sentencia, { qid }); } catch (e) { error = e; }
      const ms = Math.max(1, Math.round(performance.now() - t0));
      const w = s.warehouses[ctxAntes.wh];
      const h = { id: qid, sql: sentencia, estado: error ? 'Failed' : 'Succeeded', error: error ? error.message : null, codigo: error ? error.codigo : null, rol: ctxAntes.rol, wh: w && w.estado === 'STARTED' ? ctxAntes.wh : null, tamano: w ? w.tamano : null, db: ctxAntes.db, esquema: ctxAntes.esquema, inicio, ms, filas: r && r.values ? r.values.length : 0 };
      s.historial.unshift(h); if (s.historial.length > 200) s.historial.length = 200;
      if (!error && r && r.persistir) { s.replay.push({ sql: sentencia, db: ctxAntes.db, esquema: ctxAntes.esquema }); if (s.replay.length > 300) s.replay.splice(0, s.replay.length - 300); }
      resultados.push({ sql: sentencia, qid, ms, error, r });
      if (error && !op.seguir) break;
    }
    guardar(); avisar();
    return resultados;
  }
  // lectura directa sin dejar registro en el historial (vistas previas de otras herramientas)
  async function leer(sql) { await init(); const r = await con.query(sql); const D = window.SqlMotores.DUCK; const campos = r.schema.fields; return { columns: campos.map((f) => f.name.toUpperCase()), values: r.toArray().map((fila) => campos.map((f) => D._celda(fila[f.name], f.type))) }; }
  async function reiniciar() {
    const s = st();
    for (const d of await bases()) if (d !== 'TIENDA_ANDINA' && d !== 'SNOWFLAKE_SAMPLE_DATA') { try { await con.query(`DETACH ${ident(d)}`); } catch (e) { /* ya no está */ } }
    try { await con.query('USE memory'); await con.query('DETACH tienda_andina'); await con.query('DETACH snowflake_sample_data'); } catch (e) { /* nada */ }
    delete Store.data.snowflake; con = null; cargando = null; st(); guardar(); await init(); avisar();
  }
  // archivos de un stage: los subidos (interno) o los del lago de Azure (externo), validando el token SAS
  function archivosStage(x) {
    if (!x.url) return x.archivos;
    const q2 = new URLSearchParams(String(x.sas || '').replace(/^\?/, ''));
    const se = q2.get('se'), sp = q2.get('sp') || '', srt = q2.get('srt'), ss = q2.get('ss');
    if (!q2.get('sig') || !q2.get('sv')) throw err('Failure using stage area. Cause: [Server failed to authenticate the request. Make sure the value of Authorization header is formed correctly including the signature. (AuthenticationFailed)]', '091003');
    if (se && new Date(se) < new Date()) throw err(`Failure using stage area. Cause: [Signed expiry time [${se}] must be after signed start time. El token SAS venció: genera uno nuevo en el portal y recrea el stage con CREATE OR REPLACE STAGE.]`, '091003');
    if ((ss && !ss.includes('b')) || (srt && !(srt.includes('c') && srt.includes('o'))) || !sp.includes('r') || !sp.includes('l')) throw err(`Failure using stage area. Cause: [This request is not authorized to perform this operation using this permission. (AuthorizationPermissionMismatch)] El token necesita el servicio Blob, los tipos de recurso Container y Object, y los permisos Read y List (tiene sp=${sp}).`, '091003');
    const p = window.LagoAzure.parsear(x.url); const base = p.ruta.replace(/\/$/, '');
    let lista; try { lista = window.LagoAzure.listar(x.url); } catch (e) { throw err(`Failure using stage area. Cause: [${e.message}]`, '091003'); }
    return Object.fromEntries(lista.map((a) => [base ? a.nombre.slice(base.length + 1) : a.nombre, { texto: a.texto, cuando: Date.now() }]));
  }
  // archivos que el alumno sube a un stage (o los de ejemplo del curso)
  function subirArchivo(stage, nombre, texto) {
    const s = st(); const x = s.stages[stage]; if (!x) throw new Error('El stage no existe');
    if (x.url) throw new Error('Es un stage externo: sus archivos viven en el lago de Azure. Súbelos desde el portal (cuenta de almacenamiento → Containers → Upload).');
    x.archivos[nombre] = { texto, cuando: Date.now() }; guardar(); avisar();
  }

  window.SnowflakeMotor = {
    init, ejecutar, leer, partir, traducir, st, reiniciar, subirArchivo, tick, suspender: (n) => { const w = st().warehouses[n]; if (w) { suspender(w); avisar(); } }, reanudar: (n) => { const w = st().warehouses[n]; if (w) { reanudar(w); avisar(); } },
    bases, esquemas, tablas, columnas, CREDITOS_HORA, ROLES_SISTEMA, USUARIO, oyentes,
    conectar: (store) => { Store = store; st(); },
  };
})();
