/* Motor DAX del Power BI de práctica.
 *
 * Analiza DAX de verdad (no busca patrones): tokens → árbol → SQL que corre en el SQLite del informe.
 * Reproduce la idea central del motor de Power BI, el CONTEXTO DE FILTRO:
 * - cada celda de un objeto visual se evalúa con los filtros de la página, las segmentaciones, el filtrado
 *   cruzado y los valores de su fila/columna;
 * - los filtros viajan por las relaciones activas (del lado 1 al lado *, o en las dos direcciones si así
 *   está configurada la relación);
 * - CALCULATE cambia ese contexto: reemplaza filtros de una columna, los quita (ALL, REMOVEFILTERS,
 *   ALLEXCEPT, ALLSELECTED), los agrega sin pisar (KEEPFILTERS), activa otra relación (USERELATIONSHIP)
 *   o mueve fechas (inteligencia de tiempo: DATESYTD, SAMEPERIODLASTYEAR, DATEADD, PREVIOUSMONTH…).
 * También hay columnas calculadas (contexto de fila, RELATED), tablas calculadas (CALENDAR, SUMMARIZE…)
 * y consultas DAX (DEFINE / EVALUATE / ORDER BY) como la vista de consultas DAX de Power BI Desktop.
 * Referencia: learn.microsoft.com/dax (sintaxis, funciones y comportamiento documentado).
 */
(function () {
  'use strict';
  const q = (n) => '"' + String(n).replace(/"/g, '""') + '"';
  const lit = (x) => (x === null || x === undefined ? 'NULL' : typeof x === 'number' ? String(x) : `'${String(x).replace(/'/g, "''")}'`);
  class ErrorDax extends Error {}
  const err = (m) => { throw new ErrorDax(m); };

  // ------------------------------------------------------------------ tokens
  function tokens(src) {
    const out = []; let i = 0;
    while (i < src.length) {
      const c = src[i];
      if (/\s/.test(c)) { i++; continue; }
      if (src.startsWith('//', i) || src.startsWith('--', i)) { while (i < src.length && src[i] !== '\n') i++; continue; }
      if (src.startsWith('/*', i)) { const j = src.indexOf('*/', i + 2); i = j < 0 ? src.length : j + 2; continue; }
      if (c === '"') { let j = i + 1, s = ''; for (;;) { if (j >= src.length) err('Falta cerrar las comillas dobles "'); if (src[j] === '"') { if (src[j + 1] === '"') { s += '"'; j += 2; continue; } break; } s += src[j++]; } out.push({ k: 'str', v: s }); i = j + 1; continue; }
      if (c === '[') { const j = src.indexOf(']', i); if (j < 0) err('Falta cerrar el corchete ]'); out.push({ k: 'ref', v: src.slice(i + 1, j) }); i = j + 1; continue; }
      if (/\d/.test(c) || (c === '.' && /\d/.test(src[i + 1] || ''))) { const m = /^\d*\.?\d+(e[+-]?\d+)?/i.exec(src.slice(i)); out.push({ k: 'num', v: Number(m[0]) }); i += m[0].length; continue; }
      if (c === "'") { const j = src.indexOf("'", i + 1); if (j < 0) err('Falta cerrar la comilla simple del nombre de la tabla'); const n = src.slice(i + 1, j); i = j + 1; if (src[i] === '[') { const k = src.indexOf(']', i); out.push({ k: 'col', t: n, c: src.slice(i + 1, k) }); i = k + 1; } else out.push({ k: 'id', v: n, q: true }); continue; }
      if (/[A-Za-z_À-ÿ]/.test(c)) {
        const m = /^[A-Za-z_À-ÿ][\wÀ-ÿ.]*/.exec(src.slice(i)); i += m[0].length;
        if (src[i] === '[') { const k = src.indexOf(']', i); out.push({ k: 'col', t: m[0], c: src.slice(i + 1, k) }); i = k + 1; } else out.push({ k: 'id', v: m[0] });
        continue;
      }
      const dos = src.slice(i, i + 2);
      if (['<=', '>=', '<>', '&&', '||', '=='].includes(dos)) { out.push({ k: 'op', v: dos }); i += 2; continue; }
      if ('+-*/^&(),=<>{}'.includes(c)) { out.push({ k: 'op', v: c }); i++; continue; }
      err(`No entiendo el carácter "${c}"`);
    }
    return out;
  }

  // ------------------------------------------------------------------ árbol (parser con precedencia de DAX)
  function parsear(src) {
    const tk = tokens(src); let p = 0;
    const ver = (o = 0) => tk[p + o];
    const es = (v, o = 0) => { const t = tk[p + o]; return t && (t.k === 'op' || (t.k === 'id' && !t.q)) && String(t.v).toUpperCase() === v; };
    const tomar = (v) => { const t = tk[p]; if (v && !es(v)) err(`Se esperaba "${v}"${t ? ` y apareció "${t.v ?? t.c}"` : ' y la fórmula terminó'}`); p++; return t; };
    function expr() { return oor(); }
    function oor() { let a = and(); while (es('||')) { p++; a = { k: 'bin', op: '||', a, b: and() }; } return a; }
    function and() { let a = no(); while (es('&&')) { p++; a = { k: 'bin', op: '&&', a, b: no() }; } return a; }
    function no() { if (es('NOT') && !es('(', 1)) { p++; return { k: 'un', op: 'NOT', a: no() }; } return cmp(); }
    function cmp() {
      const a = cat();
      for (const op of ['==', '<=', '>=', '<>', '=', '<', '>']) if (es(op)) { p++; return { k: 'bin', op: op === '==' ? '=' : op, a, b: cat() }; }
      if (es('IN')) { p++; return { k: 'in', a, b: prim() }; }
      if (es('NOT') && es('IN', 1)) { p += 2; return { k: 'un', op: 'NOT', a: { k: 'in', a, b: prim() } }; }
      return a;
    }
    function cat() { let a = add(); while (es('&')) { p++; a = { k: 'bin', op: '&', a, b: add() }; } return a; }
    function add() { let a = mul(); while (es('+') || es('-')) { const op = tomar().v; a = { k: 'bin', op, a, b: mul() }; } return a; }
    function mul() { let a = pot(); while (es('*') || es('/')) { const op = tomar().v; a = { k: 'bin', op, a, b: pot() }; } return a; }
    function pot() { let a = un(); while (es('^')) { p++; a = { k: 'bin', op: '^', a, b: un() }; } return a; }
    function un() { if (es('-')) { p++; return { k: 'un', op: '-', a: un() }; } if (es('+')) { p++; return un(); } return prim(); }
    function prim() {
      const t = ver();
      if (!t) err('La fórmula terminó antes de tiempo');
      if (t.k === 'num') { p++; return { k: 'num', v: t.v }; }
      if (t.k === 'str') { p++; return { k: 'str', v: t.v }; }
      if (t.k === 'col') { p++; return { k: 'col', t: t.t, c: t.c }; }
      if (t.k === 'ref') { p++; return { k: 'ref', n: t.v }; }
      if (es('(')) { p++; const e = expr(); tomar(')'); return e; }
      if (es('{')) {
        p++; const filas = [];
        while (!es('}')) {
          if (es('(')) { p++; const f = [expr()]; while (es(',')) { p++; f.push(expr()); } tomar(')'); filas.push(f); } else filas.push([expr()]);
          if (es(',')) p++; else break;
        }
        tomar('}'); return { k: 'tablelit', filas };
      }
      if (t.k === 'id') {
        const up = String(t.v).toUpperCase();
        if (!t.q && up === 'VAR') {
          const vars = [];
          while (es('VAR')) { p++; const n = tomar(); if (!n || n.k !== 'id') err('Después de VAR va el nombre de la variable'); tomar('='); vars.push([n.v, expr()]); }
          tomar('RETURN'); return { k: 'let', vars, body: expr() };
        }
        p++;
        if (!t.q && es('(')) { p++; const args = []; if (!es(')')) { args.push(expr()); while (es(',')) { p++; args.push(expr()); } } tomar(')'); return { k: 'fn', f: up, args }; }
        if (!t.q && (up === 'TRUE' || up === 'FALSE')) return { k: 'bool', v: up === 'TRUE' };
        return { k: 'id', v: t.v, q: !!t.q };
      }
      err(`No esperaba "${t.v}"`);
    }
    const arbol = expr();
    if (p < tk.length) { const t = tk[p]; err(`Sobra "${t.v ?? t.c}" al final de la fórmula (¿falta un operador o una coma?)`); }
    return arbol;
  }

  // recorre el árbol
  const hijos = (n) => (n.k === 'bin' || n.k === 'in' ? [n.a, n.b] : n.k === 'un' ? [n.a] : n.k === 'fn' ? n.args : n.k === 'let' ? [...n.vars.map((v) => v[1]), n.body] : n.k === 'tablelit' ? n.filas.flat() : []);
  const recorrer = (n, fn) => { fn(n); hijos(n).forEach((h) => recorrer(h, fn)); };

  const AGG = { SUM: 'SUM', AVERAGE: 'AVG', MIN: 'MIN', MAX: 'MAX', COUNT: 'COUNT', COUNTA: 'COUNT', DISTINCTCOUNT: 'COUNT', COUNTBLANK: 'COUNTBLANK' };
  const AGGX = { SUMX: 'SUM', AVERAGEX: 'AVG', MINX: 'MIN', MAXX: 'MAX', COUNTX: 'COUNT', COUNTAX: 'COUNT', PRODUCTX: 'PRODUCT', CONCATENATEX: 'GROUP_CONCAT' };
  const QUITAN = ['ALL', 'REMOVEFILTERS', 'ALLEXCEPT', 'ALLSELECTED', 'ALLNOBLANKROW'];
  const TIEMPO = ['DATESYTD', 'DATESMTD', 'DATESQTD', 'SAMEPERIODLASTYEAR', 'DATEADD', 'PREVIOUSMONTH', 'PREVIOUSYEAR', 'PREVIOUSQUARTER', 'PREVIOUSDAY', 'NEXTMONTH', 'NEXTYEAR', 'NEXTQUARTER', 'PARALLELPERIOD', 'DATESBETWEEN', 'DATESINPERIOD'];
  // funciones que solo se pueden calcular celda por celda (necesitan conocer y cambiar el contexto)
  const DE_CONTEXTO = new Set([...QUITAN, ...TIEMPO, 'TOTALYTD', 'TOTALMTD', 'TOTALQTD', 'SELECTEDVALUE', 'HASONEVALUE', 'ISFILTERED', 'ISCROSSFILTERED', 'RANKX', 'USERELATIONSHIP', 'VALUES', 'DISTINCT', 'ISINSCOPE', 'CROSSFILTER']);
  const FUNCIONES = 'SUM AVERAGE MIN MAX COUNT COUNTA COUNTBLANK COUNTROWS DISTINCTCOUNT SUMX AVERAGEX MINX MAXX COUNTX CONCATENATEX CALCULATE CALCULATETABLE FILTER ALL ALLEXCEPT ALLSELECTED REMOVEFILTERS KEEPFILTERS USERELATIONSHIP VALUES DISTINCT RELATED SELECTEDVALUE HASONEVALUE ISFILTERED RANKX TOPN TOTALYTD TOTALMTD TOTALQTD DATESYTD DATESMTD DATESQTD SAMEPERIODLASTYEAR DATEADD PREVIOUSMONTH PREVIOUSYEAR PREVIOUSQUARTER NEXTMONTH NEXTYEAR PARALLELPERIOD DATESBETWEEN DATESINPERIOD DIVIDE IF IF.EAGER SWITCH AND OR NOT ISBLANK COALESCE BLANK ROUND ROUNDUP ROUNDDOWN INT ABS MOD POWER SQRT YEAR MONTH DAY QUARTER WEEKDAY WEEKNUM DATE TODAY NOW EOMONTH EDATE DATEDIFF FORMAT LEFT RIGHT MID LEN UPPER LOWER TRIM CONCATENATE SUBSTITUTE SEARCH FIND VALUE CONTAINSSTRING SUMMARIZECOLUMNS SUMMARIZE SELECTCOLUMNS ADDCOLUMNS ROW CALENDAR CALENDARAUTO GENERATESERIES UNION TRUE FALSE'.split(' ');

  // ------------------------------------------------------------------ el motor sobre un modelo
  function crear(api) {
    // api: tablas() → nombres · meta(t) → [{n,t}] · rels() → [{de,cde,a,ca,activa,direccion}] · medidas() → [{nombre,expr,tabla}]
    //      exec(sql) → filas · run(sql)
    let alias = 0, cacheEval = new Map();
    const nuevoAlias = (p) => `${p}${++alias}`;
    const limpiar = () => { alias = 0; cacheEval = new Map(); };
    // ¿el contexto se puede evaluar solo (sin referencias a filas de afuera)? entonces se calcula ya, con constantes
    const autonomo = (ctx) => !ctx.some((p) => p.origen === 'fila');
    const valorYa = (sql) => { const r = api.exec(`SELECT ${sql}`); return r.length ? r[0][0] : null; };
    const valoresSql = (vals) => (vals.length ? `(VALUES ${vals.map((v) => `(${lit(v)})`).join(', ')})` : '(SELECT NULL AS column1 WHERE 0)');
    const tablaReal = (n) => { const x = api.tablas().find((t) => t.toLowerCase() === String(n).toLowerCase()); return x || null; };
    const colReal = (t, c) => (api.meta(t).find((x) => x.n.toLowerCase() === String(c).toLowerCase()) || {}).n;
    const tipo = (t, c) => (api.meta(t).find((x) => x.n === c) || {}).t;
    const medida = (n) => api.medidas().find((m) => m.nombre.toLowerCase() === String(n).toLowerCase());
    const cacheArbol = new Map();
    const arbolDe = (expr) => { if (!cacheArbol.has(expr)) cacheArbol.set(expr, parsear(expr)); return cacheArbol.get(expr); };
    function resolverCol(n, env) {
      const t = tablaReal(n.t); if (!t) err(`No existe la tabla '${n.t}'`);
      const c = colReal(t, n.c); if (!c) err(`La tabla '${t}' no tiene la columna [${n.c}]`);
      return { t, c };
    }
    // [x] sin tabla: medida, columna de la fila actual o columna de una tabla derivada
    function resolverRef(n, env) {
      if (env.columnasLibres && env.columnasLibres.includes(n.n)) return { libre: n.n };
      const m = medida(n.n); if (m) return { medida: m };
      if (env.fila) { const c = colReal(env.fila.t, n.n); if (c) return { col: { t: env.fila.t, c } }; }
      const t = api.tablas().find((tt) => colReal(tt, n.n)); if (t && env.fila) err(`La columna [${n.n}] no está en la tabla que recorres (${env.fila.t}). Usa RELATED('${t}'[${n.n}]) si viene de otra tabla relacionada.`);
      if (t) return { col: { t, c: colReal(t, n.n) } };
      err(`No existe la medida ni la columna [${n.n}]`);
    }

    // --------------------------------------------- relaciones y propagación de filtros
    function aristas(usar) {
      const rs = api.rels().filter((r) => r.activa !== false);
      for (const u of usar || []) { for (const r of api.rels()) { const mismo = (r.de === u.de && r.a === u.a) || (r.de === u.a && r.a === u.de); if (mismo) { const i = rs.indexOf(r); if (i >= 0) rs.splice(i, 1); } } rs.push(u); }
      return rs;
    }
    // camino desde la tabla base hasta la tabla del filtro: cada salto dice cómo se conectan las columnas
    function camino(desde, hasta, usar) {
      if (desde === hasta) return [];
      const prev = { [desde]: null }, cola = [desde];
      const rs = aristas(usar);
      while (cola.length) {
        const t = cola.shift();
        for (const r of rs) {
          // el filtro viaja del lado 1 (a) al lado * (de): desde la base (lado *) se "mira" al lado 1
          if (r.de === t && !(r.a in prev)) { prev[r.a] = { de: t, colDe: r.cde, a: r.a, colA: r.ca }; cola.push(r.a); }
          if (r.direccion === 'ambas' && r.a === t && !(r.de in prev)) { prev[r.de] = { de: t, colDe: r.ca, a: r.de, colA: r.cde }; cola.push(r.de); }
        }
      }
      if (!(hasta in prev)) return null;
      const pasos = []; for (let x = hasta; prev[x]; x = prev[x].de) pasos.unshift(prev[x]);
      return pasos;
    }
    // expande una tabla como DAX: la tabla y todas las del lado 1 que alcanza (para ALL(Tabla))
    function expandida(t, usar) { const v = new Set([t]), cola = [t]; while (cola.length) { const x = cola.shift(); for (const r of aristas(usar)) if (r.de === x && !v.has(r.a)) { v.add(r.a); cola.push(r.a); } } return v; }
    // condición SQL que aplica un filtro (escrito sobre su tabla) a la tabla base, por IN encadenados
    function aplicar(base, pred, usar) {
      if (pred.t === base || !pred.t) return pred.sql;
      const pasos = camino(base, pred.t, usar);
      if (!pasos) return null; // el filtro no llega a esta tabla: no la afecta (como en Power BI)
      let dentro = pred.sql;
      for (let i = pasos.length - 1; i >= 0; i--) { const s = pasos[i]; dentro = `${q(s.de)}.${q(s.colDe)} IN (SELECT ${q(s.a)}.${q(s.colA)} FROM ${q(s.a)} WHERE ${dentro})`; }
      return dentro;
    }
    const donde = (base, ctx, usar) => { const c = ctx.map((p) => aplicar(base, p, usar)).filter(Boolean); return c.length ? ' WHERE ' + c.join(' AND ') : ''; };
    // columna con parte de fecha (Año, Trimestre, Mes), como la jerarquía automática de fechas
    const colSql = (f) => (f.parte === 'anio' ? `CAST(substr(${q(f.t)}.${q(f.c)}, 1, 4) AS INTEGER)` : f.parte === 'trim' ? `('T' || ((CAST(substr(${q(f.t)}.${q(f.c)}, 6, 2) AS INTEGER) + 2) / 3))` : f.parte === 'mes' ? `substr(${q(f.t)}.${q(f.c)}, 1, 7)` : `${q(f.t)}.${q(f.c)}`);
    const quitarCol = (ctx, t, c) => ctx.filter((p) => !(p.t === t && p.c === c));
    const quitarTablas = (ctx, set, salvo = []) => ctx.filter((p) => !(set.has(p.t) && !salvo.some((s) => s.t === p.t && s.c === p.c)));

    // --------------------------------------------- compilar expresiones escalares
    // env: { ctx: filtros (modo celda) | null (modo grupo), cond: condición CASE (modo grupo), fila: {t} contexto de fila,
    //        vars, pila (medidas en curso), usar (USERELATIONSHIP), bases: Set (tablas agregadas, modo grupo) }
    function escalar(n, env) {
      switch (n.k) {
        case 'num': return String(n.v);
        case 'str': return lit(n.v);
        case 'bool': return n.v ? '1' : '0';
        case 'id': {
          if (env.vars && Object.prototype.hasOwnProperty.call(env.vars, n.v)) return env.vars[n.v];
          const up = n.v.toUpperCase();
          if (up === 'BLANK') return 'NULL';
          if (tablaReal(n.v)) err(`'${n.v}' es una tabla: aquí hace falta un valor. Envuélvela en COUNTROWS(${n.v}) o elige una columna: ${n.v}[columna].`);
          err(`No existe la variable o tabla "${n.v}"`);
        }
        case 'col': {
          const { t, c } = resolverCol(n, env);
          if (env.fila && env.fila.t === t) return `${env.fila.alias ? env.fila.alias : q(t)}.${q(c)}`;
          if (env.libres && env.libres.includes(c)) return `${env.libres.alias}.${q(c)}`;
          if (env.fila) err(`La columna '${t}'[${c}] es de otra tabla. Usa RELATED('${t}'[${c}]) para traerla por la relación.`);
          err(`No se puede determinar un único valor para la columna '${t}'[${c}]: envuélvela en una agregación (SUM, MAX…), usa SELECTEDVALUE('${t}'[${c}]) o recorre la tabla con SUMX.`);
        }
        case 'ref': {
          const r = resolverRef(n, env);
          if (r.libre) return `${env.libres.alias}.${q(r.libre)}`;
          if (r.col) return escalar({ k: 'col', t: r.col.t, c: r.col.c }, env);
          const m = r.medida;
          if ((env.pila || []).includes(m.nombre)) err(`La medida [${m.nombre}] depende de sí misma (referencia circular)`);
          if (env.fila && !env.ctx && env.grupo) throw Object.assign(new ErrorDax('celda'), { complejo: true });
          if (env.fila && !env.ctx) err(`[${m.nombre}] es una medida y aquí estás recorriendo fila por fila: en esta práctica usa columnas (o RELATED) dentro de SUMX y de las columnas calculadas.`);
          if (env.fila && env.ctx) {
            // transición de contexto: la fila actual se convierte en filtro (como CALCULATE implícito)
            const cols = api.meta(env.fila.t).map((x) => x.n);
            const ctx2 = [...env.ctx, ...cols.map((c) => ({ t: env.fila.t, c, sql: `${q(env.fila.t)}.${q(c)} IS ${env.fila.alias || q(env.fila.t)}.${q(c)}`, origen: 'fila' }))];
            return `(${escalar(arbolDe(m.expr), { ...env, fila: null, ctx: ctx2, pila: [...(env.pila || []), m.nombre], vars: {} })})`;
          }
          return `(${escalar(arbolDe(m.expr), { ...env, pila: [...(env.pila || []), m.nombre], vars: {} })})`;
        }
        case 'let': {
          const vars = { ...(env.vars || {}) };
          for (const [nom, e] of n.vars) vars[nom] = `(${escalar(e, { ...env, vars })})`;
          return escalar(n.body, { ...env, vars });
        }
        case 'un': return n.op === '-' ? `(-${escalar(n.a, env)})` : `(NOT COALESCE(${escalar(n.a, env)}, 0))`;
        case 'in': {
          const vals = n.b.k === 'tablelit' ? n.b.filas.map((f) => escalar(f[0], env)) : err('IN se usa con una lista entre llaves: Tabla[col] IN {"a", "b"}');
          return `(${escalar(n.a, env)} IN (${vals.join(', ')}))`;
        }
        case 'bin': {
          const a = escalar(n.a, env), b = escalar(n.b, env);
          if (n.op === '/') return `(CASE WHEN COALESCE(${b}, 0) = 0 THEN NULL ELSE 1.0 * ${a} / ${b} END)`;
          if (n.op === '&') return `(COALESCE(${a}, '') || COALESCE(${b}, ''))`;
          if (n.op === '^') return `power(${a}, ${b})`;
          if (n.op === '&&') return `(COALESCE(${a}, 0) AND COALESCE(${b}, 0))`;
          if (n.op === '||') return `(COALESCE(${a}, 0) OR COALESCE(${b}, 0))`;
          if (['+', '-'].includes(n.op)) return `(COALESCE(${a}, 0) ${n.op} COALESCE(${b}, 0))`;
          if (n.op === '*') return `(${a} * ${b})`;
          return `(${a} ${n.op} ${b})`;
        }
        case 'tablelit': if (n.filas.length === 1 && n.filas[0].length === 1) return escalar(n.filas[0][0], env); err('Una tabla entre llaves {…} no es un valor');
        case 'fn': return funcion(n, env);
      }
      err('Expresión no válida');
    }

    // --- agregaciones: en modo grupo se escriben como AGG(CASE WHEN cond …) sobre la consulta agrupada;
    //     en modo celda, como subconsulta con los filtros del contexto aplicados a su tabla
    function agregar(fn, base, expr, env, distinto = false, ali = null) {
      const a = fn === 'COUNTBLANK' ? 'SUM' : fn;
      const x = fn === 'COUNTBLANK' ? `(CASE WHEN ${expr} IS NULL OR ${expr} = '' THEN 1 END)` : expr;
      if (env.fila && !env.ctx) {
        // en una columna calculada, SUM(T[c]) es el total de toda la tabla
        return `(SELECT ${a}(${distinto ? 'DISTINCT ' : ''}${x}) FROM ${q(base)})`;
      }
      if (!env.ctx) { // modo grupo
        if (env.base && env.base !== base) throw Object.assign(new ErrorDax('otra base'), { complejo: true });
        env.bases.add(base);
        const cc = (env.condPreds || []).map((p) => aplicar(base, p, env.usar)).filter(Boolean).join(' AND ');
        return `${a}(${distinto ? 'DISTINCT ' : ''}${cc ? `CASE WHEN ${cc} THEN ${x} END` : x})`;
      }
      let w = env.ctx.map((p) => aplicar(base, p, env.usar)).filter(Boolean);
      if (ali) w = w.map((s) => s.split(`${q(base)}.`).join(`${ali}.`));
      return `(SELECT ${a}(${distinto ? 'DISTINCT ' : ''}${x}) FROM ${q(base)}${ali ? ` AS ${ali}` : ''}${w.length ? ' WHERE ' + w.join(' AND ') : ''})`;
    }
    // una tabla que se recorre (SUMX, FILTER…): base + condiciones de fila + filtros que quita
    function tablaIter(n, env, ali = null) {
      if (n.k === 'id') { const t = tablaReal(n.v); if (!t) err(`No existe la tabla '${n.v}'`); return { t, conds: [], quita: null }; }
      if (n.k === 'fn' && n.f === 'FILTER') {
        const b = tablaIter(n.args[0], env, ali); const f = { ...env, fila: { t: b.t, alias: ali } };
        return { ...b, conds: [...b.conds, escalar(n.args[1], f)] };
      }
      if (n.k === 'fn' && (n.f === 'ALL' || n.f === 'REMOVEFILTERS') && n.args[0] && n.args[0].k === 'id') { const t = tablaReal(n.args[0].v); return { t, conds: [], quita: 'todo' }; }
      if (n.k === 'fn' && n.f === 'RELATEDTABLE') { const t = tablaReal(n.args[0].v); return { t, conds: [], quita: null }; }
      if (n.k === 'fn' && (n.f === 'VALUES' || n.f === 'DISTINCT' || n.f === 'ALL') && n.args[0] && n.args[0].k === 'col') { const c = resolverCol(n.args[0], env); return { valores: c, quita: n.f === 'ALL' ? 'col' : null, conds: [] }; }
      err('Aquí va una tabla: el nombre de una tabla, FILTER(Tabla, condición), ALL(Tabla) o VALUES(Tabla[columna])');
    }

    function funcion(n, env) {
      const A = n.args, f = n.f;
      const e = (i, en = env) => escalar(A[i], en);
      if (!FUNCIONES.includes(f) && !['IFERROR', 'MEDIAN', 'PRODUCTX', 'COUNTAX', 'SQRT', 'EXP', 'LN', 'LOG', 'FLOOR', 'CEILING', 'MAX', 'ISERROR', 'ISNUMBER', 'ISTEXT', 'UNICHAR', 'REPT', 'EXACT', 'PATHCONTAINS', 'RELATEDTABLE', 'NEXTDAY', 'PREVIOUSDAY', 'FIRSTDATE', 'LASTDATE', 'STARTOFMONTH', 'ENDOFMONTH', 'STARTOFYEAR', 'ENDOFYEAR', 'DATEVALUE', 'TIME', 'HOUR', 'MINUTE', 'SECOND', 'YEARFRAC', 'NETWORKDAYS'].includes(f)) err(`La función ${f} no está disponible en esta práctica.`);
      // agregaciones simples
      if (AGG[f] && A.length === 1 && A[0].k === 'col') {
        const { t, c } = resolverCol(A[0], env);
        return agregar(AGG[f], t, `${q(t)}.${q(c)}`, env, f === 'DISTINCTCOUNT');
      }
      if (AGG[f] && A.length === 1 && A[0].k === 'ref') { const r = resolverRef(A[0], env); if (r.col) return agregar(AGG[f], r.col.t, `${q(r.col.t)}.${q(r.col.c)}`, env, f === 'DISTINCTCOUNT'); }
      if ((f === 'MIN' || f === 'MAX') && A.length === 2) return `${f}(${e(0)}, ${e(1)})`;
      if (AGG[f]) err(`${f} recibe una columna, por ejemplo ${f}('Tabla'[columna])`);
      if (f === 'COUNTROWS') {
        if (!A.length) err('COUNTROWS recibe una tabla: COUNTROWS(Ventas)');
        const it = tablaIter(A[0], env);
        if (it.valores) return agregar('COUNT', it.valores.t, `${q(it.valores.t)}.${q(it.valores.c)}`, it.quita ? { ...env, ctx: env.ctx && quitarCol(env.ctx, it.valores.t, it.valores.c) } : env, true);
        const en = it.quita && env.ctx ? { ...env, ctx: quitarTablas(env.ctx, expandida(it.t, env.usar)) } : env;
        return agregar('SUM', it.t, it.conds.length ? `(CASE WHEN ${it.conds.join(' AND ')} THEN 1 END)` : '1', en);
      }
      if (AGGX[f]) {
        if (A.length < 2) err(`${f} recibe una tabla y una expresión: ${f}(Ventas, Ventas[Cantidad] * Ventas[Precio])`);
        const it = tablaIter(A[0], env);
        if (it.valores) {
          // SUMX(VALUES(T[c]), [Medida]): recorre los valores distintos y evalúa la expresión con cada uno como filtro
          if (!env.ctx) throw Object.assign(new ErrorDax('celda'), { complejo: true });
          const v = nuevoAlias('v'), { t, c } = it.valores;
          const ctxV = it.quita ? quitarCol(env.ctx, t, c) : env.ctx;
          if (autonomo(env.ctx)) {
            const distintos = api.exec(`SELECT DISTINCT ${q(t)}.${q(c)} FROM ${q(t)}${donde(t, ctxV, env.usar)} LIMIT 3001`).map((f) => f[0]);
            if (distintos.length <= 3000) {
              const base = quitarCol(env.ctx, t, c);
              const res = distintos.map((x) => valorYa(escalar(A[1], { ...env, ctx: [...base, { t, c, sql: `${q(t)}.${q(c)} IS ${lit(x)}`, origen: 'calc' }] }))).filter((x) => x !== null && x !== undefined);
              const fn = AGGX[f];
              return `(SELECT ${fn === 'GROUP_CONCAT' ? 'GROUP_CONCAT(column1)' : `${fn}(column1)`} FROM ${valoresSql(res)})`;
            }
          }
          const ctxIn = [...quitarCol(env.ctx, t, c), { t, c, sql: `${q(t)}.${q(c)} IS ${v}.x`, origen: 'fila' }];
          const cuerpo = escalar(A[1], { ...env, ctx: ctxIn });
          return `(SELECT ${AGGX[f]}(${cuerpo}) FROM (SELECT DISTINCT ${q(t)}.${q(c)} AS x FROM ${q(t)}${donde(t, ctxV, env.usar)}) ${v})`;
        }
        const ali = env.ctx ? nuevoAlias('x') : null;
        const it2 = ali ? tablaIter(A[0], env, ali) : it;
        const fila = { ...env, fila: { t: it.t, alias: ali } };
        const x = escalar(A[1], fila);
        it.conds = it2.conds;
        const cuerpo = it.conds.length ? `(CASE WHEN ${it.conds.join(' AND ')} THEN ${x} END)` : x;
        const en = it.quita && env.ctx ? { ...env, ctx: quitarTablas(env.ctx, expandida(it.t, env.usar)) } : env;
        if (f === 'CONCATENATEX') return agregar('GROUP_CONCAT', it.t, cuerpo, en, false, ali);
        return agregar(AGGX[f] === 'PRODUCT' ? 'SUM' : AGGX[f], it.t, cuerpo, en, false, ali);
      }
      if (f === 'RELATED') {
        if (!env.fila) err('RELATED se usa recorriendo fila por fila: dentro de SUMX, FILTER o en una columna calculada.');
        const { t, c } = resolverCol(A[0], env);
        const pasos = camino(env.fila.t, t, env.usar);
        if (!pasos || !pasos.length) err(`No hay una relación de '${env.fila.t}' (lado *) a '${t}' (lado 1): créala en la vista Modelo.`);
        let sql = `${env.fila.alias || q(env.fila.t)}.${q(pasos[0].colDe)}`;
        for (let i = 0; i < pasos.length; i++) { const s = pasos[i], last = i === pasos.length - 1; sql = `(SELECT ${q(s.a)}.${q(last ? c : pasos[i + 1].colDe)} FROM ${q(s.a)} WHERE ${q(s.a)}.${q(s.colA)} = ${sql} LIMIT 1)`; }
        return sql;
      }
      // lógicas y condicionales
      if (f === 'IF' || f === 'IF.EAGER') return `(CASE WHEN COALESCE(${e(0)}, 0) THEN ${e(1)} ELSE ${A[2] ? e(2) : 'NULL'} END)`;
      if (f === 'SWITCH') {
        if (A.length < 3) err('SWITCH(expresión, valor1, resultado1, …, [si no])');
        const verdad = A[0].k === 'fn' && A[0].f === 'TRUE' || A[0].k === 'bool' && A[0].v;
        let s = 'CASE' + (verdad ? '' : ` ${e(0)}`);
        for (let i = 1; i + 1 < A.length; i += 2) s += ` WHEN ${e(i)} THEN ${e(i + 1)}`;
        if (A.length % 2 === 0) s += ` ELSE ${e(A.length - 1)}`;
        return `(${s} END)`;
      }
      if (f === 'TRUE' || f === 'FALSE') return f === 'TRUE' ? '1' : '0';
      if (f === 'AND') return `(COALESCE(${e(0)}, 0) AND COALESCE(${e(1)}, 0))`;
      if (f === 'OR') return `(COALESCE(${e(0)}, 0) OR COALESCE(${e(1)}, 0))`;
      if (f === 'NOT') return `(NOT COALESCE(${e(0)}, 0))`;
      if (f === 'BLANK') return 'NULL';
      if (f === 'ISBLANK') return `(${e(0)} IS NULL)`;
      if (f === 'COALESCE') return `COALESCE(${A.map((_, i) => e(i)).join(', ')})`;
      if (f === 'IFERROR') return `COALESCE(${e(0)}, ${e(1)})`;
      if (f === 'DIVIDE') { const a = e(0), b = e(1); return `(CASE WHEN COALESCE(${b}, 0) = 0 THEN ${A[2] ? e(2) : 'NULL'} ELSE 1.0 * ${a} / ${b} END)`; }
      // matemáticas
      if (f === 'ROUND') return `ROUND(${e(0)}, ${A[1] ? e(1) : 0})`;
      if (f === 'ROUNDUP') { const d = A[1] ? e(1) : '0'; return `(ceil(${e(0)} * power(10, ${d})) / power(10, ${d}))`; }
      if (f === 'ROUNDDOWN') { const d = A[1] ? e(1) : '0'; return `(floor(${e(0)} * power(10, ${d})) / power(10, ${d}))`; }
      if (f === 'INT') return `CAST(floor(${e(0)}) AS INTEGER)`;
      if (f === 'ABS') return `ABS(${e(0)})`;
      if (f === 'MOD') return `(${e(0)} % ${e(1)})`;
      if (f === 'POWER') return `power(${e(0)}, ${e(1)})`;
      if (f === 'SQRT') return `sqrt(${e(0)})`;
      if (f === 'FLOOR') return `(floor(${e(0)} / ${e(1)}) * ${e(1)})`;
      if (f === 'CEILING') return `(ceil(${e(0)} / ${e(1)}) * ${e(1)})`;
      // fechas (las fechas se guardan como texto AAAA-MM-DD)
      if (f === 'YEAR') return `CAST(strftime('%Y', ${e(0)}) AS INTEGER)`;
      if (f === 'MONTH') return `CAST(strftime('%m', ${e(0)}) AS INTEGER)`;
      if (f === 'DAY') return `CAST(strftime('%d', ${e(0)}) AS INTEGER)`;
      if (f === 'QUARTER') return `((CAST(strftime('%m', ${e(0)}) AS INTEGER) + 2) / 3)`;
      if (f === 'WEEKDAY') return `(CAST(strftime('%w', ${e(0)}) AS INTEGER) + 1)`;
      if (f === 'WEEKNUM') return `(CAST(strftime('%W', ${e(0)}) AS INTEGER) + 1)`;
      if (f === 'DATE') return `printf('%04d-%02d-%02d', ${e(0)}, ${e(1)}, ${e(2)})`;
      if (f === 'TODAY') return `date('now')`;
      if (f === 'NOW') return `datetime('now')`;
      if (f === 'DATEVALUE') return `date(${e(0)})`;
      if (f === 'EOMONTH') return `date(${e(0)}, 'start of month', printf('%+d months', ${e(1)} + 1), '-1 day')`;
      if (f === 'EDATE') return `date(${e(0)}, printf('%+d months', ${e(1)}))`;
      if (f === 'DATEDIFF') {
        const u = A[2] && A[2].k === 'id' ? A[2].v.toUpperCase() : 'DAY', a = e(0), b = e(1);
        if (u === 'DAY') return `CAST(julianday(${b}) - julianday(${a}) AS INTEGER)`;
        if (u === 'MONTH') return `((CAST(strftime('%Y', ${b}) AS INTEGER) * 12 + CAST(strftime('%m', ${b}) AS INTEGER)) - (CAST(strftime('%Y', ${a}) AS INTEGER) * 12 + CAST(strftime('%m', ${a}) AS INTEGER)))`;
        if (u === 'YEAR') return `(CAST(strftime('%Y', ${b}) AS INTEGER) - CAST(strftime('%Y', ${a}) AS INTEGER))`;
        if (u === 'QUARTER') return `(((CAST(strftime('%Y', ${b}) AS INTEGER) * 12 + CAST(strftime('%m', ${b}) AS INTEGER)) - (CAST(strftime('%Y', ${a}) AS INTEGER) * 12 + CAST(strftime('%m', ${a}) AS INTEGER))) / 3)`;
        if (u === 'WEEK') return `(CAST(julianday(${b}) - julianday(${a}) AS INTEGER) / 7)`;
        if (u === 'HOUR') return `CAST((julianday(${b}) - julianday(${a})) * 24 AS INTEGER)`;
        err('DATEDIFF(inicio, fin, DAY | WEEK | MONTH | QUARTER | YEAR | HOUR)');
      }
      if (f === 'FORMAT') {
        const x = e(0), fm = A[1] && A[1].k === 'str' ? A[1].v : '';
        const MES = "CASE CAST(strftime('%m', X) AS INTEGER) WHEN 1 THEN 'enero' WHEN 2 THEN 'febrero' WHEN 3 THEN 'marzo' WHEN 4 THEN 'abril' WHEN 5 THEN 'mayo' WHEN 6 THEN 'junio' WHEN 7 THEN 'julio' WHEN 8 THEN 'agosto' WHEN 9 THEN 'septiembre' WHEN 10 THEN 'octubre' WHEN 11 THEN 'noviembre' WHEN 12 THEN 'diciembre' END".split('X').join(x);
        if (/^m{4}$/i.test(fm)) return `(${MES})`;
        if (/^m{3}$/i.test(fm)) return `substr(${MES}, 1, 3)`;
        if (/^(y{4}|y{2})$/i.test(fm)) return fm.length === 4 ? `strftime('%Y', ${x})` : `strftime('%y', ${x})`;
        if (/[ymd]/i.test(fm)) return `strftime('${fm.replace(/yyyy/i, '%Y').replace(/yy/i, '%y').replace(/MM/, '%m').replace(/dd/i, '%d')}', ${x})`;
        if (/^0(\.0+)?$/.test(fm)) return `printf('%.${(fm.split('.')[1] || '').length}f', ${x})`;
        if (/^#,0(\.0+)?$/.test(fm)) return `printf('%,.${(fm.split('.')[1] || '').length}f', ${x})`;
        if (/%/.test(fm)) return `printf('%.${((fm.split('.')[1] || '').match(/0/g) || []).length}f%%', 100.0 * ${x})`;
        return `CAST(${x} AS TEXT)`;
      }
      // texto
      if (f === 'LEFT') return `substr(${e(0)}, 1, ${A[1] ? e(1) : 1})`;
      if (f === 'RIGHT') return `substr(${e(0)}, -${A[1] ? e(1) : 1})`;
      if (f === 'MID') return `substr(${e(0)}, ${e(1)}, ${e(2)})`;
      if (f === 'LEN') return `length(${e(0)})`;
      if (f === 'UPPER') return `upper(${e(0)})`;
      if (f === 'LOWER') return `lower(${e(0)})`;
      if (f === 'TRIM') return `trim(${e(0)})`;
      if (f === 'CONCATENATE') return `(COALESCE(${e(0)}, '') || COALESCE(${e(1)}, ''))`;
      if (f === 'SUBSTITUTE') return `replace(${e(0)}, ${e(1)}, ${e(2)})`;
      if (f === 'SEARCH' || f === 'FIND') { const x = f === 'SEARCH' ? `instr(lower(${e(1)}), lower(${e(0)}))` : `instr(${e(1)}, ${e(0)})`; return `NULLIF(${x}, 0)`; }
      if (f === 'CONTAINSSTRING') return `(instr(lower(${e(0)}), lower(${e(1)})) > 0)`;
      if (f === 'VALUE') return `CAST(${e(0)} AS REAL)`;
      if (f === 'REPT') return `replace(printf('%.' || ${e(1)} || 'c', '/'), '/', ${e(0)})`;
      if (f === 'EXACT') return `(${e(0)} = ${e(1)})`;
      // ---- funciones de contexto (modo celda)
      if (DE_CONTEXTO.has(f) || f === 'CALCULATE' || f === 'MEDIAN') {
        if (!env.ctx && !(f === 'CALCULATE' && calcSimple(n, env))) throw Object.assign(new ErrorDax('celda'), { complejo: true });
      }
      if (f === 'CALCULATE') return calcular(n, env);
      if (f === 'TOTALYTD' || f === 'TOTALMTD' || f === 'TOTALQTD') return calcular({ k: 'fn', f: 'CALCULATE', args: [A[0], { k: 'fn', f: { TOTALYTD: 'DATESYTD', TOTALMTD: 'DATESMTD', TOTALQTD: 'DATESQTD' }[f], args: [A[1]] }, ...A.slice(2)] }, env);
      if (f === 'SELECTEDVALUE' || f === 'HASONEVALUE' || (f === 'VALUES' && A[0] && A[0].k === 'col')) {
        const { t, c } = resolverCol(A[0], env); const w = donde(t, env.ctx, env.usar);
        const uno = `(SELECT COUNT(DISTINCT ${q(t)}.${q(c)}) FROM ${q(t)}${w}) = 1`;
        if (f === 'HASONEVALUE') return `(${uno})`;
        return `(CASE WHEN ${uno} THEN (SELECT MIN(${q(t)}.${q(c)}) FROM ${q(t)}${w}) ELSE ${A[1] ? e(1) : 'NULL'} END)`;
      }
      if (f === 'ISFILTERED' || f === 'ISCROSSFILTERED' || f === 'ISINSCOPE') {
        if (A[0].k === 'col') { const { t, c } = resolverCol(A[0], env); return env.ctx.some((p) => p.t === t && p.c === c && (f !== 'ISINSCOPE' || p.origen === 'visual')) ? '1' : '0'; }
        const t = tablaReal(A[0].v); return env.ctx.some((p) => p.t === t) ? '1' : '0';
      }
      if (f === 'RANKX') {
        const it = tablaIter(A[0], env);
        if (!it.valores) err('En esta práctica, RANKX recorre los valores de una columna: RANKX(ALL(Tabla[columna]), [Medida])');
        const { t, c } = it.valores, r = nuevoAlias('r');
        const desc = !(A[3] && A[3].k === 'id' && A[3].v.toUpperCase() === 'ASC');
        const actual = escalar(A[1], env);
        if (autonomo(env.ctx)) {
          const universo0 = it.quita ? quitarCol(env.ctx, t, c).filter((p) => p.origen !== 'visual') : env.ctx;
          const base = quitarCol(env.ctx, t, c);
          const clave = JSON.stringify([A[1], base.map((p) => p.sql), universo0.map((p) => p.sql)]);
          if (!cacheEval.has(clave)) {
            const distintos = api.exec(`SELECT DISTINCT ${q(t)}.${q(c)} FROM ${q(t)}${donde(t, universo0, env.usar)} LIMIT 5000`).map((f) => f[0]);
            cacheEval.set(clave, distintos.map((x) => valorYa(escalar(A[1], { ...env, ctx: [...base, { t, c, sql: `${q(t)}.${q(c)} IS ${lit(x)}`, origen: 'calc' }] }))).filter((x) => x !== null && x !== undefined));
          }
          return `(CASE WHEN ${actual} IS NULL THEN NULL ELSE 1 + (SELECT COUNT(*) FROM ${valoresSql(cacheEval.get(clave))} WHERE column1 ${desc ? '>' : '<'} ${actual}) END)`;
        }
        const ctxR = [...quitarCol(env.ctx, t, c), { t, c, sql: `${q(t)}.${q(c)} IS ${r}.x`, origen: 'fila' }];
        const otro = escalar(A[1], { ...env, ctx: ctxR });
        const universo = it.quita ? quitarCol(env.ctx, t, c).filter((p) => p.origen !== 'visual') : env.ctx;
        return `(CASE WHEN ${actual} IS NULL THEN NULL ELSE 1 + (SELECT COUNT(*) FROM (SELECT DISTINCT ${q(t)}.${q(c)} AS x FROM ${q(t)}${donde(t, universo, env.usar)}) ${r} WHERE ${otro} ${desc ? '>' : '<'} ${actual}) END)`;
      }
      if (f === 'MEDIAN') {
        const { t, c } = resolverCol(A[0], env); const w = donde(t, env.ctx, env.usar), col = `${q(t)}.${q(c)}`;
        return `(SELECT AVG(x) FROM (SELECT ${col} AS x FROM ${q(t)}${w}${w ? ' AND' : ' WHERE'} ${col} IS NOT NULL ORDER BY ${col} LIMIT 2 - (SELECT COUNT(${col}) FROM ${q(t)}${w}) % 2 OFFSET ((SELECT COUNT(${col}) FROM ${q(t)}${w}) - 1) / 2))`;
      }
      if (f === 'FIRSTDATE' || f === 'LASTDATE' || f === 'STARTOFMONTH' || f === 'ENDOFMONTH' || f === 'STARTOFYEAR' || f === 'ENDOFYEAR') {
        const { t, c } = resolverCol(A[0], env); const w = donde(t, env.ctx || [], env.usar);
        const mn = `(SELECT MIN(${q(t)}.${q(c)}) FROM ${q(t)}${w})`, mx = `(SELECT MAX(${q(t)}.${q(c)}) FROM ${q(t)}${w})`;
        return { FIRSTDATE: mn, LASTDATE: mx, STARTOFMONTH: `date(${mn}, 'start of month')`, ENDOFMONTH: `date(${mx}, 'start of month', '+1 month', '-1 day')`, STARTOFYEAR: `date(${mn}, 'start of year')`, ENDOFYEAR: `date(${mx}, 'start of year', '+1 year', '-1 day')` }[f];
      }
      if (QUITAN.includes(f) || TIEMPO.includes(f) || f === 'USERELATIONSHIP' || f === 'KEEPFILTERS' || f === 'FILTER') err(`${f} cambia los filtros: se usa como argumento de CALCULATE (o como tabla en SUMX/COUNTROWS).`);
      if (['SUMMARIZECOLUMNS', 'SUMMARIZE', 'SELECTCOLUMNS', 'ADDCOLUMNS', 'TOPN', 'CALENDAR', 'CALENDARAUTO', 'ROW', 'UNION', 'GENERATESERIES', 'CALCULATETABLE'].includes(f)) err(`${f} devuelve una tabla: úsala en una tabla calculada, en la vista de consultas DAX (EVALUATE) o dentro de COUNTROWS/SUMX.`);
      err(`La función ${f} no está disponible en esta práctica.`);
    }

    // CALCULATE sencillo (solo filtros booleanos sobre columnas que no se agrupan en el visual) → modo grupo
    function calcSimple(n, env) {
      return n.args.slice(1).every((a) => {
        let r = true;
        recorrer(a, (x) => { if (x.k === 'fn' && !['KEEPFILTERS', 'AND', 'OR', 'NOT', 'DATE', 'YEAR', 'MONTH', 'TODAY', 'FILTER'].includes(x.f)) r = false; if (x.k === 'ref' && medida(x.n)) r = false; });
        if (a.k === 'fn' && a.f === 'FILTER' && !(a.args[0] && a.args[0].k === 'id')) r = false;
        const cols = colsDe(a); if (cols.some((c) => (env.cats || []).some((k) => k.t === c.t && k.c === c.c))) r = false;
        return r;
      });
    }
    function colsDe(a) { const out = []; recorrer(a, (x) => { if (x.k === 'col') { const t = tablaReal(x.t); const c = t && colReal(t, x.c); if (c) out.push({ t, c }); } }); return out; }

    function calcular(n, env) {
      const A = n.args;
      if (!A.length) err('CALCULATE(expresión, filtro1, filtro2, …)');
      if (!env.ctx) {
        // modo grupo: los filtros se convierten en una condición CASE WHEN
        const preds = [];
        for (const a of A.slice(1)) {
          const b = a.k === 'fn' && a.f === 'KEEPFILTERS' ? a.args[0] : a;
          if (b.k === 'fn' && b.f === 'FILTER') { const it = tablaIter(b, env); preds.push({ t: it.t, sql: it.conds.join(' AND ') || '1' }); continue; }
          const cols = colsDe(b); if (!cols.length) err('Cada filtro de CALCULATE es una condición sobre una columna, por ejemplo Ventas[Canal] = "Web"');
          const t = cols[0].t; if (cols.some((c) => c.t !== t)) err('Un filtro booleano de CALCULATE solo puede usar columnas de una tabla. Para combinar tablas usa FILTER.');
          preds.push({ t, sql: escalar(b, { ...env, fila: { t } }) });
          if (a === b) (env.pisadas || []).push(...cols.map((c) => `${c.t}|${c.c}`));
        }
        return escalar(A[0], { ...env, condPreds: [...(env.condPreds || []), ...preds] });
      }
      let ctx = env.ctx.slice(); const usar = [...(env.usar || [])]; const nuevos = [];
      for (const a of A.slice(1)) {
        if (a.k === 'fn' && a.f === 'USERELATIONSHIP') {
          const x = resolverCol(a.args[0], env), y = resolverCol(a.args[1], env);
          const r = api.rels().find((rr) => (rr.de === x.t && rr.cde === x.c && rr.a === y.t && rr.ca === y.c) || (rr.de === y.t && rr.cde === y.c && rr.a === x.t && rr.ca === x.c));
          if (!r) err(`USERELATIONSHIP: no hay una relación entre '${x.t}'[${x.c}] y '${y.t}'[${y.c}]. Créala (aunque quede inactiva) en Administrar relaciones.`);
          usar.push({ ...r, activa: true }); continue;
        }
        if (a.k === 'fn' && QUITAN.includes(a.f)) {
          if (a.f === 'ALLSELECTED') { ctx = a.args.length ? ctx.filter((p) => !(p.origen === 'visual' && a.args.some((x) => x.k === 'col' ? (() => { const c = resolverCol(x, env); return c.t === p.t && c.c === p.c; })() : tablaReal(x.v) === p.t))) : ctx.filter((p) => p.origen !== 'visual'); continue; }
          if (!a.args.length) { ctx = []; continue; }
          if (a.f === 'ALLEXCEPT') { const t = tablaReal(a.args[0].v); const salvo = a.args.slice(1).map((x) => resolverCol(x, env)); ctx = quitarTablas(ctx, expandida(t, usar), salvo); continue; }
          for (const x of a.args) { if (x.k === 'col') { const c = resolverCol(x, env); ctx = quitarCol(ctx, c.t, c.c); } else { const t = tablaReal(x.v); if (!t) err(`${a.f}: no existe la tabla '${x.v}'`); ctx = quitarTablas(ctx, expandida(t, usar)); } }
          continue;
        }
        if (a.k === 'fn' && TIEMPO.includes(a.f)) { const r = tiempo(a, { ...env, ctx, usar }); ctx = r.ctx; continue; }
        const guardar = a.k === 'fn' && a.f === 'KEEPFILTERS';
        const b = guardar ? a.args[0] : a;
        if (b.k === 'fn' && b.f === 'FILTER') {
          const base = b.args[0];
          if (base.k === 'fn' && (base.f === 'ALL' || base.f === 'REMOVEFILTERS')) {
            // la condición se evalúa fila por fila, pero MAX(), [Medida]… usan el contexto de afuera (como en DAX)
            if (base.args[0].k === 'col') { const c = resolverCol(base.args[0], env); const cond = escalar(b.args[1], { ...env, ctx: env.ctx, fila: { t: c.t }, libres: null }); ctx = quitarCol(ctx, c.t, c.c); nuevos.push({ t: c.t, c: c.c, sql: cond, origen: 'calc' }); continue; }
            const t = tablaReal(base.args[0].v); const cond = escalar(b.args[1], { ...env, ctx: env.ctx, fila: { t } }); ctx = quitarTablas(ctx, expandida(t, usar));
            nuevos.push({ t, c: null, sql: cond, origen: 'calc' }); continue;
          }
          if (base.k === 'fn' && (base.f === 'VALUES' || base.f === 'DISTINCT' || base.f === 'ALLSELECTED') && base.args[0] && base.args[0].k === 'col') { const c = resolverCol(base.args[0], env); const cond = escalar(b.args[1], { ...env, ctx: env.ctx, fila: { t: c.t } }); if (base.f === 'ALLSELECTED') ctx = ctx.filter((p) => !(p.origen === 'visual' && p.t === c.t && p.c === c.c)); nuevos.push({ t: c.t, c: c.c, sql: cond, origen: 'calc', guardar: base.f !== 'ALLSELECTED' }); continue; }
          const it = tablaIter(b, env);
          nuevos.push({ t: it.t, c: null, sql: it.conds.join(' AND ') || '1', origen: 'calc', guardar: true });
          continue;
        }
        const cols = colsDe(b);
        if (!cols.length) err('Cada filtro de CALCULATE es una condición sobre una columna (Ventas[Canal] = "Web"), FILTER(…), ALL(…) o una función de fechas.');
        const t = cols[0].t;
        if (cols.some((c) => c.t !== t)) err('Un filtro booleano de CALCULATE solo puede usar columnas de una tabla. Para combinar tablas usa FILTER.');
        const sql = escalar(b, { ...env, ctx: null, fila: { t } });
        nuevos.push({ t, c: cols.length === 1 || cols.every((c) => c.c === cols[0].c) ? cols[0].c : null, sql, origen: 'calc', guardar, cols });
      }
      for (const p of nuevos) { if (!p.guardar) { if (p.c) ctx = quitarCol(ctx, p.t, p.c); else if (p.cols) for (const c of p.cols) ctx = quitarCol(ctx, c.t, c.c); } ctx.push(p); }
      return escalar(A[0], { ...env, ctx, usar });
    }

    // inteligencia de tiempo: calcula el rango de fechas visible y lo desplaza
    function tiempo(a, env) {
      const A = a.args;
      if (!A[0] || A[0].k !== 'col') err(`${a.f} recibe la columna de fecha: ${a.f}('Calendario'[Fecha])`);
      const { t, c } = resolverCol(A[0], env);
      if (tipo(t, c) && tipo(t, c) !== 'fecha') err(`${a.f}: la columna '${t}'[${c}] no es de tipo fecha. Cámbiale el tipo en Power Query.`);
      const col = `${q(t)}.${q(c)}`, w = donde(t, env.ctx, env.usar);
      const mn = `(SELECT MIN(${col}) FROM ${q(t)}${w})`, mx = `(SELECT MAX(${col}) FROM ${q(t)}${w})`;
      // una tabla de fechas aparte se libera entera (como marcar tabla de fechas); si la fecha está en la tabla de hechos, solo esa columna
      // una tabla de fechas (su columna es la clave del lado 1 de una relación) se libera entera, como al marcarla
      // como tabla de fechas; si la fecha es una columna de la tabla de hechos, solo se reemplaza el filtro de esa columna
      const esDim = api.rels().some((r) => r.a === t && r.ca === c);
      let ctx = esDim ? env.ctx.filter((p) => p.t !== t) : quitarCol(env.ctx, t, c);
      const rango = (d, h) => ({ t, c, sql: `${col} BETWEEN ${d} AND ${h}`, origen: 'calc' });
      const unidad = (x) => (x && x.k === 'id' ? x.v.toUpperCase() : 'DAY');
      const mover = (x, n, u) => (u === 'YEAR' ? `date(${x}, '${n >= 0 ? '+' : ''}${n} years')` : u === 'QUARTER' ? `date(${x}, '${n * 3 >= 0 ? '+' : ''}${n * 3} months')` : u === 'MONTH' ? `date(${x}, '${n >= 0 ? '+' : ''}${n} months')` : `date(${x}, '${n >= 0 ? '+' : ''}${n} days')`);
      const num = (x) => { if (x.k === 'num') return x.v; if (x.k === 'un' && x.op === '-' && x.a.k === 'num') return -x.a.v; err(`${a.f}: el desplazamiento es un número, por ejemplo -1`); };
      let p;
      switch (a.f) {
        case 'DATESYTD': p = rango(`date(${mx}, 'start of year')`, mx); break;
        case 'DATESQTD': p = rango(`date(${mx}, 'start of month', printf('-%d months', (CAST(strftime('%m', ${mx}) AS INTEGER) - 1) % 3))`, mx); break;
        case 'DATESMTD': p = rango(`date(${mx}, 'start of month')`, mx); break;
        case 'SAMEPERIODLASTYEAR': p = rango(`date(${mn}, '-1 years')`, `date(${mx}, '-1 years')`); break;
        case 'DATEADD': { const n = num(A[1]), u = unidad(A[2]); p = rango(mover(mn, n, u), u === 'MONTH' || u === 'QUARTER' || u === 'YEAR' ? `date(${mover(`date(${mx}, 'start of month')`, n, u)}, '+1 month', '-1 day') ` : mover(mx, n, u)); if (u !== 'DAY') p.sql = `${col} BETWEEN ${mover(mn, n, u)} AND MIN(${mover(mx, n, u)}, date(${mover(`date(${mx}, 'start of month')`, n, u)}, '+1 month', '-1 day'))`; break; }
        case 'PARALLELPERIOD': { const n = num(A[1]), u = unidad(A[2]); const ini = u === 'YEAR' ? `date(${mn}, 'start of year')` : `date(${mn}, 'start of month')`; const fin = u === 'YEAR' ? `date(${mx}, 'start of year', '+1 year', '-1 day')` : `date(${mx}, 'start of month', '+1 month', '-1 day')`; p = rango(mover(ini, n, u), u === 'YEAR' ? `date(${mover(`date(${mx}, 'start of year')`, n, u)}, '+1 year', '-1 day')` : `date(${mover(`date(${mx}, 'start of month')`, n, u)}, '+1 month', '-1 day')`); void fin; break; }
        case 'PREVIOUSMONTH': p = rango(`date(${mn}, 'start of month', '-1 month')`, `date(${mn}, 'start of month', '-1 day')`); break;
        case 'PREVIOUSQUARTER': { const ini = `date(${mn}, 'start of month', printf('-%d months', (CAST(strftime('%m', ${mn}) AS INTEGER) - 1) % 3))`; p = rango(`date(${ini}, '-3 months')`, `date(${ini}, '-1 day')`); break; }
        case 'PREVIOUSYEAR': p = rango(`date(${mn}, 'start of year', '-1 year')`, `date(${mn}, 'start of year', '-1 day')`); break;
        case 'PREVIOUSDAY': p = rango(`date(${mn}, '-1 day')`, `date(${mn}, '-1 day')`); break;
        case 'NEXTMONTH': p = rango(`date(${mx}, 'start of month', '+1 month')`, `date(${mx}, 'start of month', '+2 months', '-1 day')`); break;
        case 'NEXTQUARTER': { const ini = `date(${mx}, 'start of month', printf('-%d months', (CAST(strftime('%m', ${mx}) AS INTEGER) - 1) % 3))`; p = rango(`date(${ini}, '+3 months')`, `date(${ini}, '+6 months', '-1 day')`); break; }
        case 'NEXTYEAR': p = rango(`date(${mx}, 'start of year', '+1 year')`, `date(${mx}, 'start of year', '+2 years', '-1 day')`); break;
        case 'DATESBETWEEN': p = rango(escalar(A[1], { ...env, ctx: env.ctx }), escalar(A[2], { ...env, ctx: env.ctx })); break;
        case 'DATESINPERIOD': { const fin = escalar(A[1], env), n = num(A[2]), u = unidad(A[3]); p = n < 0 ? rango(`date(${mover(fin, n, u)}, '+1 day')`, fin) : rango(fin, `date(${mover(fin, n, u)}, '-1 day')`); break; }
        default: err(`${a.f} no está disponible`);
      }
      ctx = [...ctx, p];
      return { ctx };
    }

    // --------------------------------------------- consultas de los objetos visuales
    // cats: [{t,c,parte}] · valores: [{medida}|{t,c,agg}] · filtros: [{campo:{t,c,parte}, valores:[]}]
    const aggImplicito = { sum: 'SUM', avg: 'AVERAGE', min: 'MIN', max: 'MAX', count: 'COUNT', distinct: 'DISTINCTCOUNT', median: 'MEDIAN' };
    function arbolValor(v) {
      if (v.medida) { const m = medida(v.medida); if (!m) err(`La medida [${v.medida}] ya no existe`); return { k: 'ref', n: m.nombre }; }
      return { k: 'fn', f: aggImplicito[v.agg || 'count'] || 'COUNT', args: [{ k: 'col', t: v.t, c: v.c }] };
    }
    const predFiltro = (f, origen) => {
      if (f.cond) {
        const c = colSql(f.campo), v = f.cond.val, num = v !== '' && v != null && !isNaN(Number(v)) && ['num', 'int'].includes(tipo(f.campo.t, f.campo.c)), L = num ? Number(v) : lit(v);
        const sql = { '=': `${c} = ${L}`, '<>': `${c} <> ${L}`, '>': `${c} > ${L}`, '<': `${c} < ${L}`, '>=': `${c} >= ${L}`, '<=': `${c} <= ${L}`, contiene: `instr(lower(${c}), lower(${lit(v)})) > 0`, nocontiene: `COALESCE(instr(lower(${c}), lower(${lit(v)})), 0) = 0`, empieza: `lower(${c}) LIKE lower(${lit(v)}) || '%'`, termina: `lower(${c}) LIKE '%' || lower(${lit(v)})`, blanco: `(${c} IS NULL OR ${c} = '')`, noblanco: `(${c} IS NOT NULL AND ${c} <> '')` }[f.cond.op] || '1';
        return { t: f.campo.t, c: f.campo.c, parte: f.campo.parte, sql: `(${sql})`, origen };
      }
      const vals = f.valores || [];
      const nulos = vals.includes(null), resto = vals.filter((x) => x !== null);
      const sql = [resto.length ? `${colSql(f.campo)} IN (${resto.map(lit).join(', ')})` : null, nulos ? `${colSql(f.campo)} IS NULL` : null].filter(Boolean).join(' OR ') || '0';
      return { t: f.campo.t, c: f.campo.c, parte: f.campo.parte, sql: `(${sql})`, origen };
    };
    function consultar(cats, valores, filtros, opciones = {}) {
      limpiar();
      const ctx0 = filtros.map((f) => predFiltro(f, f.origen || 'pagina'));
      const arboles = valores.map(arbolValor);
      // ¿se puede resolver con un GROUP BY? (una sola tabla base y sin funciones de contexto)
      let rapido = null;
      try { rapido = consultaGrupo(cats, arboles, ctx0); } catch (e) { if (!e.complejo) throw e; }
      if (rapido) return rapido;
      return consultaCelda(cats, arboles, ctx0, opciones);
    }
    function consultaGrupo(cats, arboles, ctx0) {
      if (arboles.length !== 1) throw Object.assign(new ErrorDax('varias'), { complejo: true });
      const env = { ctx: null, condPreds: [], bases: new Set(), cats, pisadas: [], vars: {}, pila: [], grupo: true };
      const expr = escalar(arboles[0], env);
      const bases = [...env.bases];
      if (bases.length > 1) throw Object.assign(new ErrorDax('bases'), { complejo: true });
      const base = bases[0] || (cats[0] && cats[0].t) || api.tablas()[0];
      const joins = [], vistos = new Set([base]);
      for (const c of cats) {
        if (vistos.has(c.t)) continue;
        const pasos = camino(base, c.t);
        if (!pasos || pasos.some((s) => api.rels().some((r) => r.direccion === 'ambas' && r.a === s.de && r.de === s.a))) throw Object.assign(new ErrorDax('cat'), { complejo: true });
        for (const s of pasos) if (!vistos.has(s.a)) { vistos.add(s.a); joins.push(`LEFT JOIN ${q(s.a)} ON ${q(s.a)}.${q(s.colA)} = ${q(s.de)}.${q(s.colDe)}`); }
      }
      const ctx = ctx0.filter((p) => !env.pisadas.includes(`${p.t}|${p.c}`) || p.parte);
      const w = ctx.map((p) => aplicar(base, p)).filter(Boolean);
      const sql = `SELECT ${[...cats.map((c, i) => `${colSql(c)} AS c${i}`), `${expr} AS v0`].join(', ')}\nFROM ${q(base)}${joins.length ? '\n' + joins.join('\n') : ''}${w.length ? '\nWHERE ' + w.join('\n  AND ') : ''}${cats.length ? `\nGROUP BY ${cats.map((_, i) => `c${i}`).join(', ')}` : ''}`;
      return { filas: api.exec(sql).filter((f) => !cats.length || f[f.length - 1] !== null), sql, modo: 'grupo' };
    }
    function consultaCelda(cats, arboles, ctx0, opciones) {
      // grupos: los valores distintos de las columnas del visual que respetan los filtros de la página
      let gsql = '';
      if (cats.length) {
        const t0 = cats[0].t, joins = [], vistos = new Set([t0]);
        for (const c of cats.slice(1)) {
          if (vistos.has(c.t)) continue;
          const pasos = camino(t0, c.t) || []; if (!pasos.length) err(`No hay relación entre '${t0}' y '${c.t}' para cruzarlos en un mismo objeto visual.`);
          for (const s of pasos) if (!vistos.has(s.a)) { vistos.add(s.a); joins.push(`LEFT JOIN ${q(s.a)} ON ${q(s.a)}.${q(s.colA)} = ${q(s.de)}.${q(s.colDe)}`); }
        }
        gsql = `SELECT DISTINCT ${cats.map((c, i) => `${colSql(c)} AS c${i}`).join(', ')} FROM ${q(t0)}${joins.length ? ' ' + joins.join(' ') : ''}${donde(t0, ctx0)}`;
        gsql += ` LIMIT ${opciones.limite || 1000}`;
      }
      // cada celda se evalúa con su propio contexto (los valores del grupo van como constantes, así SQLite
      // calcula una sola vez las subconsultas del contexto: rangos de fechas, ALL, etc.)
      const grupos = cats.length ? api.exec(gsql) : [[]];
      const tope = Math.min(grupos.length, opciones.limiteCeldas || 500);
      const filas = []; let sql = '';
      for (let k = 0; k < tope; k++) {
        const gr = grupos[k];
        const ctxG = [...ctx0, ...cats.map((c, i) => ({ t: c.t, c: c.c, parte: c.parte, sql: `${colSql(c)} IS ${lit(gr[i])}`, origen: 'visual' }))];
        alias = 0;
        const exprs = arboles.map((a) => escalar(a, { ctx: ctxG, vars: {}, pila: [], usar: [] }));
        const s1 = `SELECT ${exprs.map((x, i) => `${x} AS v${i}`).join(',\n  ')}`;
        if (!k) sql = (cats.length ? `-- una consulta por celda (${grupos.length} grupos). La primera:\n` : '') + s1;
        const v = api.exec(s1)[0] || exprs.map(() => null);
        if (!cats.length || v.some((x) => x !== null)) filas.push([...gr, ...v]);
      }
      return { filas, sql, modo: 'celda' };
    }

    // --------------------------------------------- columnas y tablas calculadas
    function columnaCalculada(t, expr) {
      limpiar();
      try { return escalar(parsear(expr), { ctx: null, fila: { t }, vars: {}, pila: [], usar: [] }); } catch (e) { if (e.complejo) err('En una columna calculada de esta práctica no se puede usar CALCULATE ni funciones que cambian filtros (ALL, fechas, SELECTEDVALUE…). Usa una medida para eso.'); throw e; }
    }
    function validarMedida(expr, extra) {
      const arbol = parsear(expr);
      const prev = api.medidas;
      if (extra) api.medidas = () => [...prev().filter((m) => m.nombre.toLowerCase() !== extra.nombre.toLowerCase()), extra];
      try {
        limpiar();
        const sql = escalar(arbol, { ctx: [], vars: {}, pila: extra ? [] : [], usar: [] });
        return api.exec(`SELECT ${sql}`)[0][0];
      } finally { api.medidas = prev; }
    }

    // tablas: cada expresión de tabla se convierte en un SELECT con nombres de columna
    let tmp = 0;
    function materializar(cols, filas) {
      const n = `__pbi_tmp${++tmp}`;
      api.run(`DROP TABLE IF EXISTS ${q(n)}`);
      api.run(`CREATE TEMP TABLE ${q(n)} (${cols.map((c) => q(c)).join(', ')})`);
      if (filas.length) { const ph = `(${cols.map(() => '?').join(',')})`; for (let i = 0; i < filas.length; i += 400) { const lote = filas.slice(i, i + 400); api.run(`INSERT INTO ${q(n)} VALUES ${lote.map(() => ph).join(',')}`, lote.flat()); } }
      return { sql: `SELECT * FROM ${q(n)}`, cols, nombre: n };
    }
    const nombreCol = (n, i) => (n.k === 'col' ? `${n.t}[${n.c}]` : `Value${i ? i + 1 : ''}`);
    function tabla(n, env) {
      if (n.k === 'id') {
        if (env.tvars && env.tvars[n.v]) return env.tvars[n.v];
        const t = tablaReal(n.v); if (!t) err(`No existe la tabla '${n.v}'`);
        return { sql: `SELECT * FROM ${q(t)}`, cols: api.meta(t).map((c) => c.n), base: t };
      }
      if (n.k === 'tablelit') {
        const filas = n.filas.map((f) => f.map((x) => api.exec(`SELECT ${escalar(x, { ...env, ctx: [] })}`)[0][0]));
        const cols = (n.filas[0] || [0]).map((_, i) => (i ? `Value${i + 1}` : 'Value'));
        return materializar(cols, filas);
      }
      if (n.k !== 'fn') err('Aquí va una expresión de tabla (una tabla, FILTER, SUMMARIZECOLUMNS, TOPN, CALENDAR…)');
      const A = n.args, f = n.f;
      if (f === 'FILTER' || f === 'CALCULATETABLE') {
        const b = tabla(A[0], env), ali = nuevoAlias('f');
        const libres = Object.assign([...b.cols], { alias: ali });
        const conds = A.slice(1).map((x) => escalar(x, { ...env, ctx: null, fila: b.base ? { t: b.base, alias: ali } : null, libres, columnasLibres: b.cols }));
        return { sql: `SELECT * FROM (${b.sql}) ${ali} WHERE ${conds.join(' AND ')}`, cols: b.cols, base: b.base };
      }
      if (f === 'TOPN') {
        const nn = api.exec(`SELECT ${escalar(A[0], { ...env, ctx: [] })}`)[0][0];
        const b = tabla(A[1], env), ali = nuevoAlias('t');
        const libres = Object.assign([...b.cols], { alias: ali });
        const orden = [];
        for (let i = 2; i < A.length; i++) {
          const ex = escalar(A[i], { ...env, ctx: null, fila: b.base ? { t: b.base, alias: ali } : null, libres, columnasLibres: b.cols });
          let dir = 'DESC'; if (A[i + 1] && A[i + 1].k === 'id' && /^(ASC|DESC|0|1)$/i.test(A[i + 1].v)) { dir = A[i + 1].v.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'; i++; } else if (A[i + 1] && A[i + 1].k === 'num') { dir = A[i + 1].v === 1 ? 'ASC' : 'DESC'; i++; }
          orden.push(`${ex} ${dir}`);
        }
        return { sql: `SELECT * FROM (${b.sql}) ${ali}${orden.length ? ' ORDER BY ' + orden.join(', ') : ''} LIMIT ${Number(nn) || 0}`, cols: b.cols, base: b.base };
      }
      if (f === 'VALUES' || f === 'DISTINCT' || (f === 'ALL' && A[0] && A[0].k === 'col')) {
        if (A[0].k === 'col') { const { t, c } = resolverCol(A[0], env); return { sql: `SELECT DISTINCT ${q(c)} FROM ${q(t)}${env.ctx ? donde(t, env.ctx) : ''}`, cols: [c] }; }
        return tabla(A[0], env);
      }
      if (f === 'ALL' || f === 'REMOVEFILTERS') return tabla(A[0], env);
      if (f === 'SELECTCOLUMNS' || f === 'ADDCOLUMNS') {
        const b = tabla(A[0], env), ali = nuevoAlias('s'), libres = Object.assign([...b.cols], { alias: ali });
        const pares = [];
        for (let i = 1; i < A.length; i++) {
          if (f === 'SELECTCOLUMNS' && A[i].k === 'col' && !(A[i + 1])) { pares.push([A[i].c, A[i]]); continue; }
          if (A[i].k !== 'str') err(`${f}: cada columna nueva lleva un nombre entre comillas y una expresión: "Nombre", expresión`);
          pares.push([A[i].v, A[i + 1]]); i++;
        }
        const exprs = pares.map(([nom, x]) => `${escalar(x, { ...env, ctx: null, fila: b.base ? { t: b.base, alias: ali } : null, libres, columnasLibres: b.cols })} AS ${q(nom)}`);
        return { sql: `SELECT ${f === 'ADDCOLUMNS' ? `${ali}.*, ` : ''}${exprs.join(', ')} FROM (${b.sql}) ${ali}`, cols: [...(f === 'ADDCOLUMNS' ? b.cols : []), ...pares.map((x) => x[0])], base: f === 'ADDCOLUMNS' ? b.base : null };
      }
      if (f === 'ROW') {
        const pares = []; for (let i = 0; i < A.length; i += 2) { if (A[i].k !== 'str') err('ROW("Nombre", expresión, …)'); pares.push([A[i].v, A[i + 1]]); }
        const vals = api.exec(`SELECT ${pares.map(([, x]) => escalar(x, { ...env, ctx: env.ctx || [] })).join(', ')}`)[0];
        return materializar(pares.map((x) => x[0]), [vals]);
      }
      if (f === 'SUMMARIZECOLUMNS' || f === 'SUMMARIZE') {
        let i = 0; const cats = [];
        if (f === 'SUMMARIZE') i = 1;
        while (i < A.length && A[i].k === 'col') { const c = resolverCol(A[i], env); cats.push({ t: c.t, c: c.c }); i++; }
        const filtros = [];
        while (i < A.length && A[i].k !== 'str') { // tablas de filtro: TREATAS / FILTER / VALUES
          const x = A[i];
          if (x.k === 'fn' && x.f === 'FILTER' && x.args[0].k === 'fn' && (x.args[0].f === 'VALUES' || x.args[0].f === 'ALL')) { const c = resolverCol(x.args[0].args[0], env); filtros.push({ t: c.t, c: c.c, sql: escalar(x.args[1], { ...env, ctx: null, fila: { t: c.t } }), origen: 'pagina' }); }
          else if (x.k === 'fn' && x.f === 'TREATAS') { const c = resolverCol(x.args[1], env); const vals = x.args[0].filas.map((r) => escalar(r[0], env)); filtros.push({ t: c.t, c: c.c, sql: `${q(c.t)}.${q(c.c)} IN (${vals.join(', ')})`, origen: 'pagina' }); }
          else err('SUMMARIZECOLUMNS: después de las columnas van filtros (TREATAS, FILTER(VALUES(…))) y luego pares "Nombre", expresión');
          i++;
        }
        const pares = []; for (; i < A.length; i += 2) { if (A[i].k !== 'str') err(`${f}: cada valor lleva un nombre entre comillas y una expresión`); pares.push([A[i].v, A[i + 1]]); }
        const cols = [...cats.map((c) => c.c), ...pares.map((x) => x[0])];
        if (!pares.length) {
          const t0 = cats[0].t; return { sql: `SELECT DISTINCT ${cats.map((c) => `${q(c.t)}.${q(c.c)} AS ${q(c.c)}`).join(', ')} FROM ${q(t0)}${joinsDe(t0, cats)}${donde(t0, [...(env.ctx || []), ...filtros])} ORDER BY 1`, cols };
        }
        const ctx0 = [...(env.ctx || []), ...filtros];
        const r = consultaCelda(cats, pares.map(([, x]) => x), ctx0, { limite: 100000 });
        return materializar(cols, r.filas);
      }
      if (f === 'CALENDAR' || f === 'CALENDARAUTO') {
        let ini, fin;
        if (f === 'CALENDAR') { ini = escalar(A[0], { ...env, ctx: [] }); fin = escalar(A[1], { ...env, ctx: [] }); }
        else {
          const fechas = []; for (const t of api.tablas()) for (const c of api.meta(t)) if (c.t === 'fecha') fechas.push(`SELECT MIN(${q(c.n)}) AS a, MAX(${q(c.n)}) AS b FROM ${q(t)}`);
          if (!fechas.length) err('CALENDARAUTO no encontró columnas de fecha en el modelo: usa CALENDAR(DATE(2024,1,1), DATE(2024,12,31)).');
          ini = `(SELECT date(MIN(a), 'start of year') FROM (${fechas.join(' UNION ALL ')}))`; fin = `(SELECT date(MAX(b), 'start of year', '+1 year', '-1 day') FROM (${fechas.join(' UNION ALL ')}))`;
        }
        const filas = api.exec(`WITH RECURSIVE d(x) AS (SELECT date(${ini}) UNION ALL SELECT date(x, '+1 day') FROM d WHERE x < date(${fin}) LIMIT 40000) SELECT x FROM d`);
        return materializar(['Date'], filas);
      }
      if (f === 'GENERATESERIES') {
        const [a, b, s] = [0, 1, 2].map((k) => (A[k] ? api.exec(`SELECT ${escalar(A[k], { ...env, ctx: [] })}`)[0][0] : 1));
        const filas = []; for (let x = a; x <= b && filas.length < 100000; x += s || 1) filas.push([x]);
        return materializar(['Value'], filas);
      }
      if (f === 'UNION') { const ts = A.map((x) => tabla(x, env)); return { sql: ts.map((x) => x.sql).join(' UNION ALL '), cols: ts[0].cols }; }
      if (f === 'TREATAS') err('TREATAS se usa como filtro dentro de SUMMARIZECOLUMNS o CALCULATE.');
      err(`${f} no devuelve una tabla en esta práctica (o no está disponible).`);
    }
    function joinsDe(t0, cats) { const joins = [], vistos = new Set([t0]); for (const c of cats) { if (vistos.has(c.t)) continue; for (const s of camino(t0, c.t) || []) if (!vistos.has(s.a)) { vistos.add(s.a); joins.push(` LEFT JOIN ${q(s.a)} ON ${q(s.a)}.${q(s.colA)} = ${q(s.de)}.${q(s.colDe)}`); } } return joins.join(''); }
    function tablaCalculada(expr) {
      limpiar(); const r = tabla(parsear(expr), { ctx: [], vars: {}, pila: [], usar: [] });
      const filas = api.exec(r.sql); return { cols: r.cols, filas };
    }

    // --------------------------------------------- consultas DAX (DEFINE / EVALUATE / ORDER BY)
    function consulta(texto) {
      limpiar();
      const partes = []; const re = /\b(DEFINE|EVALUATE)\b/gi; let m, ult = 0, ultK = null;
      const limpio = texto.replace(/\/\/[^\n]*|--[^\n]*/g, (x) => ' '.repeat(x.length));
      while ((m = re.exec(limpio))) { if (ultK) partes.push([ultK, texto.slice(ult, m.index)]); ultK = m[1].toUpperCase(); ult = re.lastIndex; }
      if (ultK) partes.push([ultK, texto.slice(ult)]);
      if (!partes.some((x) => x[0] === 'EVALUATE')) err('Una consulta DAX necesita al menos un EVALUATE: EVALUATE Ventas');
      const locales = [], vars = {}, tvars = {}; const res = [];
      const prev = api.medidas; api.medidas = () => [...prev().filter((x) => !locales.some((l) => l.nombre.toLowerCase() === x.nombre.toLowerCase())), ...locales];
      try {
        for (const [k, cuerpo] of partes) {
          if (k === 'DEFINE') {
            const defs = cuerpo.split(/\b(?=(?:MEASURE|VAR|TABLE|COLUMN)\b)/i).map((x) => x.trim()).filter(Boolean);
            for (const d of defs) {
              let mm = /^MEASURE\s+('[^']+'|[\wÀ-ÿ]+)\s*\[([^\]]+)\]\s*=\s*([\s\S]+)$/i.exec(d);
              if (mm) { locales.push({ nombre: mm[2], expr: mm[3].trim(), tabla: mm[1].replace(/'/g, '') }); continue; }
              mm = /^VAR\s+([\wÀ-ÿ]+)\s*=\s*([\s\S]+)$/i.exec(d);
              if (mm) { const ar = parsear(mm[2].trim()); try { vars[mm[1]] = `(${escalar(ar, { ctx: [], vars, pila: [], usar: [] })})`; } catch (e) { tvars[mm[1]] = tabla(ar, { ctx: [], vars, tvars, pila: [], usar: [] }); } continue; }
              err(`No entiendo esta definición: ${d.slice(0, 60)}… (usa MEASURE Tabla[Nombre] = … o VAR nombre = …)`);
            }
            continue;
          }
          const om = /\bORDER\s+BY\b([\s\S]*)$/i.exec(cuerpo);
          const exprT = om ? cuerpo.slice(0, om.index) : cuerpo;
          const t = tabla(parsear(exprT.trim()), { ctx: [], vars, tvars, pila: [], usar: [] });
          let sql = t.sql;
          if (om) {
            const ali = nuevoAlias('o'), libres = Object.assign([...t.cols], { alias: ali });
            const ords = om[1].split(',').map((x) => x.trim()).filter(Boolean).map((x) => { const d = /\s+(ASC|DESC)$/i.exec(x); const e = d ? x.slice(0, d.index) : x; return `${escalar(parsear(e), { ctx: null, vars, fila: t.base ? { t: t.base, alias: ali } : null, libres, columnasLibres: t.cols })} ${d ? d[1].toUpperCase() : 'ASC'}`; });
            sql = `SELECT * FROM (${t.sql}) ${ali} ORDER BY ${ords.join(', ')}`;
          }
          const filas = api.exec(sql + (/\bLIMIT\b/i.test(sql) ? '' : ' LIMIT 5000'));
          res.push({ cols: t.cols, filas, sql });
        }
      } finally { api.medidas = prev; }
      return res;
    }

    return { parsear, consultar, columnaCalculada, tablaCalculada, validarMedida, consulta, colSql, camino, expandida, FUNCIONES };
  }

  const exportar = { crear, parsear, tokens, ErrorDax, FUNCIONES };
  if (typeof window !== 'undefined') window.PBIDax = exportar;
  if (typeof module !== 'undefined') module.exports = exportar;
})();
