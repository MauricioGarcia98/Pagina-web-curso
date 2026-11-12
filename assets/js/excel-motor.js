/* Motor de fórmulas de la réplica de Excel (práctica). Escrito desde cero a partir de la documentación pública
 * de las funciones de Excel: referencias A1 (relativas y con $), rangos, otras hojas ('Hoja 2'!B3), operadores,
 * las funciones más usadas en análisis de datos y los errores de Excel (#DIV/0!, #N/A, #NAME?, #VALUE!, #REF!).
 * Las fórmulas se escriben con nombres en inglés y coma como separador, como en Excel en inglés. */
(function (raiz) {
  'use strict';
  const ERR = (c) => ({ err: c });
  const esErr = (v) => v && typeof v === 'object' && 'err' in v;
  const E = { DIV0: ERR('#DIV/0!'), NA: ERR('#N/A'), NAME: ERR('#NAME?'), VALUE: ERR('#VALUE!'), REF: ERR('#REF!'), NUM: ERR('#NUM!'), CIRC: ERR('#CIRC!') };

  // ---------------------------------------------------------------- direcciones
  const colNum = (s) => { let n = 0; for (const ch of s.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64); return n - 1; };
  const colTxt = (n) => { let s = ''; n += 1; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; };
  const dir = (c, f) => colTxt(c) + (f + 1);
  function parseDir(t) { const m = /^\$?([A-Za-z]{1,3})\$?(\d+)$/.exec(t); if (!m) return null; return { c: colNum(m[1]), f: Number(m[2]) - 1 }; }

  // ---------------------------------------------------------------- lexer
  function tokens(src) {
    const out = []; let i = 0;
    const ref = /^(?:('(?:[^']|'')+'|[A-Za-z_][\w.]*)!)?(\$?[A-Za-z]{1,3}\$?\d+)(?::(\$?[A-Za-z]{1,3}\$?\d+))?/;
    const colRango = /^(?:('(?:[^']|'')+'|[A-Za-z_][\w.]*)!)?(\$?[A-Za-z]{1,3}):(\$?[A-Za-z]{1,3})(?![\w(])/;
    while (i < src.length) {
      const ch = src[i];
      if (/\s/.test(ch)) { i++; continue; }
      const resto = src.slice(i);
      let m;
      if (ch === '"') { let j = i + 1, s = ''; while (j < src.length) { if (src[j] === '"') { if (src[j + 1] === '"') { s += '"'; j += 2; continue; } break; } s += src[j++]; } if (j >= src.length) throw E.VALUE; out.push({ t: 'str', v: s }); i = j + 1; continue; }
      if ((m = /^\d+(\.\d+)?([eE][+-]?\d+)?/.exec(resto)) || (m = /^\.\d+/.exec(resto))) { out.push({ t: 'num', v: parseFloat(m[0]) }); i += m[0].length; continue; }
      if ((m = colRango.exec(resto))) { out.push({ t: 'ref', hoja: m[1] ? m[1].replace(/^'|'$/g, '').replace(/''/g, "'") : null, a: m[2] + '1', b: m[3] + '1048576', cols: true }); i += m[0].length; continue; }
      if ((m = ref.exec(resto)) && !/^[A-Za-z_][\w.]*\(/.test(resto.slice(m[1] ? m[1].length + 1 : 0)) && !/[A-Za-z_(]/.test(resto[m[0].length] || '')) {
        out.push({ t: 'ref', hoja: m[1] ? m[1].replace(/^'|'$/g, '').replace(/''/g, "'") : null, a: m[2], b: m[3] || null }); i += m[0].length; continue;
      }
      if ((m = /^(TRUE|FALSE)(?![\w(])/i.exec(resto))) { out.push({ t: 'bool', v: m[1].toUpperCase() === 'TRUE' }); i += m[0].length; continue; }
      if ((m = /^[A-Za-z_][\w.]*(?=\s*\()/.exec(resto))) { out.push({ t: 'fn', v: m[0].toUpperCase() }); i += m[0].length; continue; }
      if ((m = /^#(DIV\/0!|N\/A|NAME\?|VALUE!|REF!|NUM!)/.exec(resto))) { out.push({ t: 'errlit', v: m[0] }); i += m[0].length; continue; }
      if ((m = /^[A-Za-z_][\w.]*/.exec(resto))) { out.push({ t: 'name', v: m[0] }); i += m[0].length; continue; }
      if ((m = /^(<>|<=|>=|[-+*/^&=<>(),:;%])/.exec(resto))) { out.push({ t: 'op', v: m[0] === ';' ? ',' : m[0] }); i += m[0].length; continue; }
      throw E.VALUE;
    }
    return out;
  }

  // ---------------------------------------------------------------- parser (precedencia de Excel)
  function parse(src) {
    const tk = tokens(src); let p = 0;
    const ver = () => tk[p]; const tomar = () => tk[p++];
    const es = (v) => tk[p] && tk[p].t === 'op' && tk[p].v === v;
    function comparacion() { let a = concat(); while (tk[p] && tk[p].t === 'op' && ['=', '<>', '<', '>', '<=', '>='].includes(tk[p].v)) { const op = tomar().v; a = { k: 'bin', op, a, b: concat() }; } return a; }
    function concat() { let a = suma(); while (es('&')) { tomar(); a = { k: 'bin', op: '&', a, b: suma() }; } return a; }
    function suma() { let a = prod(); while (es('+') || es('-')) { const op = tomar().v; a = { k: 'bin', op, a, b: prod() }; } return a; }
    function prod() { let a = pot(); while (es('*') || es('/')) { const op = tomar().v; a = { k: 'bin', op, a, b: pot() }; } return a; }
    function pot() { let a = unario(); while (es('^')) { tomar(); a = { k: 'bin', op: '^', a, b: unario() }; } return a; }
    function unario() { if (es('-')) { tomar(); return { k: 'neg', a: unario() }; } if (es('+')) { tomar(); return unario(); } return postfijo(); }
    function postfijo() { let a = primario(); while (es('%')) { tomar(); a = { k: 'bin', op: '/', a, b: { k: 'num', v: 100 } }; } return a; }
    function primario() {
      const t = tomar(); if (!t) throw E.VALUE;
      if (t.t === 'num') return { k: 'num', v: t.v };
      if (t.t === 'str') return { k: 'str', v: t.v };
      if (t.t === 'bool') return { k: 'bool', v: t.v };
      if (t.t === 'errlit') return { k: 'errlit', v: t.v };
      if (t.t === 'ref') return { k: 'ref', hoja: t.hoja, a: t.a, b: t.b, cols: t.cols };
      if (t.t === 'name') return { k: 'name', v: t.v };
      if (t.t === 'fn') { tomar(); const args = []; if (!es(')')) { do { if (es(',') || es(')')) args.push({ k: 'vacio' }); else args.push(comparacion()); } while (es(',') && tomar()); } if (!es(')')) throw E.VALUE; tomar(); return { k: 'fn', v: t.v, args }; }
      if (t.t === 'op' && t.v === '(') { const e = comparacion(); if (!es(')')) throw E.VALUE; tomar(); return e; }
      throw E.VALUE;
    }
    const arbol = comparacion(); if (p < tk.length) throw E.VALUE; return arbol;
  }

  // ---------------------------------------------------------------- ayudas de valores
  const vacio = (v) => v === null || v === undefined || v === '';
  function num(v) {
    if (esErr(v)) throw v;
    if (typeof v === 'number') return v; if (typeof v === 'boolean') return v ? 1 : 0; if (vacio(v)) return 0;
    const s = String(v).trim(); if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(s)) return parseFloat(s);
    if (/^-?\d+(\.\d+)?%$/.test(s)) return parseFloat(s) / 100;
    const d = fechaDeTexto(s); if (d != null) return d;
    throw E.VALUE;
  }
  const txt = (v) => { if (esErr(v)) throw v; if (vacio(v)) return ''; if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE'; if (typeof v === 'number') return fmtGeneral(v); return String(v); };
  const bool = (v) => { if (esErr(v)) throw v; if (typeof v === 'boolean') return v; if (typeof v === 'number') return v !== 0; if (vacio(v)) return false; const s = String(v).toUpperCase(); if (s === 'TRUE') return true; if (s === 'FALSE') return false; throw E.VALUE; };
  function fmtGeneral(n) { if (!isFinite(n)) return '#NUM!'; if (Number.isInteger(n)) return String(n); const r = Math.round(n * 1e10) / 1e10; return String(r); }
  // fechas como número de serie (1 = 1900-01-01, como Excel con su desfase del 29/02/1900)
  const BASE = Date.UTC(1899, 11, 30);
  const serieDe = (y, m, d) => Math.round((Date.UTC(y, m - 1, d) - BASE) / 86400000);
  const fechaDe = (s) => new Date(BASE + Math.round(s) * 86400000);
  function fechaDeTexto(s) { const m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(s); if (!m) return null; let v = serieDe(+m[1], +m[2], +m[3]); if (m[4]) v += (+m[4] * 3600 + +m[5] * 60 + +(m[6] || 0)) / 86400; return v; }
  const plano = (x) => (Array.isArray(x) ? x.flat(Infinity) : [x]);
  function cmp(a, b) {
    // orden de Excel al comparar: números < textos < booleanos; textos sin distinguir mayúsculas
    const tipo = (v) => (typeof v === 'number' ? 0 : typeof v === 'string' ? 1 : typeof v === 'boolean' ? 2 : 0);
    if (vacio(a)) a = typeof b === 'string' ? '' : 0; if (vacio(b)) b = typeof a === 'string' ? '' : 0;
    const ta = tipo(a), tb = tipo(b); if (ta !== tb) return ta - tb;
    if (ta === 1) { const x = a.toLowerCase(), y = b.toLowerCase(); return x < y ? -1 : x > y ? 1 : 0; }
    return a < b ? -1 : a > b ? 1 : 0;
  }
  // criterios de COUNTIF/SUMIF: ">10", "<>x", "Chile", "a*" (comodines * y ?)
  function criterio(c) {
    if (typeof c === 'number' || typeof c === 'boolean') return (v) => cmp(v, c) === 0 && !vacio(v);
    const s = String(c ?? ''); const m = /^(<=|>=|<>|<|>|=)?(.*)$/.exec(s); const op = m[1] || '='; const r = m[2];
    const n = r !== '' && !isNaN(Number(r)) ? Number(r) : null;
    if (n !== null) return (v) => { if (vacio(v) && op !== '<>') return false; let x = v; if (typeof x === 'string' && x.trim() !== '' && !isNaN(Number(x))) x = Number(x); if (typeof x !== 'number') return op === '<>'; return { '=': x === n, '<>': x !== n, '<': x < n, '>': x > n, '<=': x <= n, '>=': x >= n }[op]; };
    if (op === '=' || op === '<>') {
      const re = new RegExp('^' + r.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/~\*/g, '\u0001').replace(/~\?/g, '\u0002').replace(/\*/g, '.*').replace(/\?/g, '.').replace(/\u0001/g, '\\*').replace(/\u0002/g, '\\?') + '$', 'i');
      return op === '=' ? (v) => (r === '' ? vacio(v) : re.test(txt(v))) : (v) => (r === '' ? !vacio(v) : !re.test(txt(v)));
    }
    return (v) => { if (vacio(v) || typeof v === 'number') return false; const k = cmp(String(v), r); return { '<': k < 0, '>': k > 0, '<=': k <= 0, '>=': k >= 0 }[op]; };
  }

  // ---------------------------------------------------------------- funciones
  const nums = (args) => plano(args).filter((v) => typeof v === 'number');
  const F = {
    SUM: (a) => nums(a).reduce((x, y) => x + y, 0),
    AVERAGE: (a) => { const n = nums(a); if (!n.length) throw E.DIV0; return n.reduce((x, y) => x + y, 0) / n.length; },
    COUNT: (a) => nums(a).length,
    COUNTA: (a) => plano(a).filter((v) => !vacio(v)).length,
    COUNTBLANK: (a) => plano(a).filter((v) => vacio(v)).length,
    MAX: (a) => { const n = nums(a); return n.length ? Math.max(...n) : 0; },
    MIN: (a) => { const n = nums(a); return n.length ? Math.min(...n) : 0; },
    MEDIAN: (a) => { const n = nums(a).sort((x, y) => x - y); if (!n.length) throw E.NUM; const k = n.length >> 1; return n.length % 2 ? n[k] : (n[k - 1] + n[k]) / 2; },
    PRODUCT: (a) => nums(a).reduce((x, y) => x * y, 1),
    ROUND: ([x, d]) => { const k = Math.pow(10, num(d ?? 0)); const v = num(x) * k; return (Math.sign(v) * Math.round(Math.abs(v) + 1e-9)) / k; },
    ROUNDUP: ([x, d]) => { const k = Math.pow(10, num(d ?? 0)); const v = num(x) * k; return (Math.sign(v) * Math.ceil(Math.abs(v) - 1e-9)) / k; },
    ROUNDDOWN: ([x, d]) => { const k = Math.pow(10, num(d ?? 0)); return Math.trunc(num(x) * k) / k; },
    INT: ([x]) => Math.floor(num(x)), ABS: ([x]) => Math.abs(num(x)), SQRT: ([x]) => { const v = num(x); if (v < 0) throw E.NUM; return Math.sqrt(v); },
    MOD: ([a, b]) => { const d = num(b); if (d === 0) throw E.DIV0; const r = num(a) % d; return r && Math.sign(r) !== Math.sign(d) ? r + d : r; },
    POWER: ([a, b]) => Math.pow(num(a), num(b)),
    IF: ([c, s, n]) => (bool(c) ? (s === undefined ? true : s) : (n === undefined ? false : n)),
    IFS: (a) => { for (let i = 0; i + 1 < a.length; i += 2) if (bool(a[i])) return a[i + 1]; throw E.NA; },
    IFERROR: ([v, alt]) => (esErr(v) ? alt : v),
    IFNA: ([v, alt]) => (esErr(v) && v.err === '#N/A' ? alt : v),
    AND: (a) => plano(a).filter((v) => !vacio(v)).every(bool), OR: (a) => plano(a).filter((v) => !vacio(v)).some(bool), NOT: ([v]) => !bool(v),
    ISBLANK: ([v]) => vacio(v), ISNUMBER: ([v]) => typeof v === 'number', ISTEXT: ([v]) => typeof v === 'string' && v !== '', ISERROR: ([v]) => esErr(v), ISNA: ([v]) => esErr(v) && v.err === '#N/A',
    CONCAT: (a) => plano(a).map(txt).join(''), CONCATENATE: (a) => plano(a).map(txt).join(''),
    TEXTJOIN: ([sep, ign, ...r]) => plano(r).filter((v) => !(bool(ign) && vacio(v))).map(txt).join(txt(sep)),
    LEFT: ([s, n]) => txt(s).slice(0, n === undefined ? 1 : num(n)), RIGHT: ([s, n]) => { const t = txt(s); const k = n === undefined ? 1 : num(n); return k ? t.slice(-k) : ''; },
    MID: ([s, i, n]) => txt(s).substr(num(i) - 1, num(n)), LEN: ([s]) => txt(s).length,
    UPPER: ([s]) => txt(s).toUpperCase(), LOWER: ([s]) => txt(s).toLowerCase(), PROPER: ([s]) => txt(s).toLowerCase().replace(/(^|[^\p{L}])(\p{L})/gu, (m, a, b) => a + b.toUpperCase()),
    TRIM: ([s]) => txt(s).replace(/ +/g, ' ').trim(),
    SUBSTITUTE: ([s, a, b]) => txt(s).split(txt(a)).join(txt(b)),
    FIND: ([a, s, i]) => { const k = txt(s).indexOf(txt(a), (i ? num(i) : 1) - 1); if (k < 0) throw E.VALUE; return k + 1; },
    SEARCH: ([a, s, i]) => { const k = txt(s).toLowerCase().indexOf(txt(a).toLowerCase(), (i ? num(i) : 1) - 1); if (k < 0) throw E.VALUE; return k + 1; },
    VALUE: ([s]) => num(s), TEXT: ([v, f]) => formatear(num(v), txt(f)),
    EXACT: ([a, b]) => txt(a) === txt(b),
    DATE: ([y, m, d]) => serieDe(num(y), num(m), num(d)),
    YEAR: ([s]) => fechaDe(num(s)).getUTCFullYear(), MONTH: ([s]) => fechaDe(num(s)).getUTCMonth() + 1, DAY: ([s]) => fechaDe(num(s)).getUTCDate(),
    WEEKDAY: ([s, t]) => { const d = fechaDe(num(s)).getUTCDay(); const tipo = t ? num(t) : 1; return tipo === 2 ? (d === 0 ? 7 : d) : tipo === 3 ? (d + 6) % 7 : d + 1; },
    TODAY: () => { const h = new Date(); return serieDe(h.getFullYear(), h.getMonth() + 1, h.getDate()); },
    EOMONTH: ([s, m]) => { const d = fechaDe(num(s)); return serieDe(d.getUTCFullYear(), d.getUTCMonth() + 1 + num(m) + 1, 1) - 1; },
    DATEDIF: ([a, b, u]) => { const x = num(a), y = num(b); if (x > y) throw E.NUM; const da = fechaDe(x), db = fechaDe(y); const U = txt(u).toUpperCase(); if (U === 'D') return y - x; let meses = (db.getUTCFullYear() - da.getUTCFullYear()) * 12 + db.getUTCMonth() - da.getUTCMonth(); if (db.getUTCDate() < da.getUTCDate()) meses--; if (U === 'M') return meses; if (U === 'Y') return Math.floor(meses / 12); throw E.NUM; },
  };
  // funciones que reciben rangos sin aplanar
  const FR = {
    COUNTIF: (ctx, [r, c]) => { const f = criterio(c); return plano(r).filter(f).length; },
    SUMIF: (ctx, [r, c, s]) => { const f = criterio(c); const a = plano(r), b = s ? plano(s) : a; let t = 0; a.forEach((v, i) => { if (f(v) && typeof b[i] === 'number') t += b[i]; }); return t; },
    AVERAGEIF: (ctx, [r, c, s]) => { const f = criterio(c); const a = plano(r), b = s ? plano(s) : a; const v = []; a.forEach((x, i) => { if (f(x) && typeof b[i] === 'number') v.push(b[i]); }); if (!v.length) throw E.DIV0; return v.reduce((x, y) => x + y, 0) / v.length; },
    COUNTIFS: (ctx, a) => { const pares = []; for (let i = 0; i < a.length; i += 2) pares.push([plano(a[i]), criterio(a[i + 1])]); const n = pares[0][0].length; let k = 0; for (let i = 0; i < n; i++) if (pares.every(([r, f]) => f(r[i]))) k++; return k; },
    SUMIFS: (ctx, [s, ...a]) => { const S = plano(s); const pares = []; for (let i = 0; i < a.length; i += 2) pares.push([plano(a[i]), criterio(a[i + 1])]); let t = 0; S.forEach((v, i) => { if (pares.every(([r, f]) => f(r[i])) && typeof v === 'number') t += v; }); return t; },
    AVERAGEIFS: (ctx, [s, ...a]) => { const S = plano(s); const pares = []; for (let i = 0; i < a.length; i += 2) pares.push([plano(a[i]), criterio(a[i + 1])]); const v = []; S.forEach((x, i) => { if (pares.every(([r, f]) => f(r[i])) && typeof x === 'number') v.push(x); }); if (!v.length) throw E.DIV0; return v.reduce((x, y) => x + y, 0) / v.length; },
    MAXIFS: (ctx, [s, ...a]) => { const S = plano(s); const pares = []; for (let i = 0; i < a.length; i += 2) pares.push([plano(a[i]), criterio(a[i + 1])]); const v = S.filter((x, i) => pares.every(([r, f]) => f(r[i])) && typeof x === 'number'); return v.length ? Math.max(...v) : 0; },
    MINIFS: (ctx, [s, ...a]) => { const S = plano(s); const pares = []; for (let i = 0; i < a.length; i += 2) pares.push([plano(a[i]), criterio(a[i + 1])]); const v = S.filter((x, i) => pares.every(([r, f]) => f(r[i])) && typeof x === 'number'); return v.length ? Math.min(...v) : 0; },
    SUMPRODUCT: (ctx, a) => { const ls = a.map(plano); const n = ls[0].length; if (ls.some((l) => l.length !== n)) throw E.VALUE; let t = 0; for (let i = 0; i < n; i++) t += ls.reduce((p, l) => p * (typeof l[i] === 'number' ? l[i] : 0), 1); return t; },
    VLOOKUP: (ctx, [v, tabla, col, aprox]) => {
      if (!Array.isArray(tabla)) throw E.VALUE; const k = num(col); if (k < 1 || k > (tabla[0] || []).length) throw E.REF;
      const exacta = aprox !== undefined && !bool(aprox);
      if (exacta) { for (const fila of tabla) if (cmp(fila[0], v) === 0 && !vacio(fila[0])) return fila[k - 1] ?? ''; throw E.NA; }
      let mejor = null; for (const fila of tabla) { if (vacio(fila[0])) continue; if (cmp(fila[0], v) <= 0) mejor = fila; else break; } if (!mejor) throw E.NA; return mejor[k - 1] ?? '';
    },
    HLOOKUP: (ctx, [v, tabla, fila, aprox]) => { if (!Array.isArray(tabla)) throw E.VALUE; const t = tabla[0].map((_, c) => tabla.map((r) => r[c])); return FR.VLOOKUP(ctx, [v, t, fila, aprox]); },
    XLOOKUP: (ctx, [v, busca, devuelve, siNo]) => { const b = plano(busca); const i = b.findIndex((x) => !vacio(x) && cmp(x, v) === 0); if (i < 0) { if (siNo !== undefined) return siNo; throw E.NA; } const d = Array.isArray(devuelve) ? devuelve : [[devuelve]]; return d.length === 1 ? d[0][i] ?? '' : (d[i] || [])[0] ?? ''; },
    MATCH: (ctx, [v, r, tipo]) => { const b = plano(r); const t = tipo === undefined ? 1 : num(tipo); if (t === 0) { const f = typeof v === 'string' ? criterio(v) : (x) => cmp(x, v) === 0; const i = b.findIndex((x) => !vacio(x) && f(x)); if (i < 0) throw E.NA; return i + 1; } let k = -1; for (let i = 0; i < b.length; i++) { if (vacio(b[i])) continue; if (t > 0 ? cmp(b[i], v) <= 0 : cmp(b[i], v) >= 0) k = i; else break; } if (k < 0) throw E.NA; return k + 1; },
    INDEX: (ctx, [r, f, c]) => { if (!Array.isArray(r)) return r; const fi = num(f ?? 1), co = c === undefined ? 1 : num(c); const filas = r.length === 1 && c === undefined ? [r[0].map((x) => x)] : r; if (r.length === 1 && c === undefined) { const v = r[0][fi - 1]; if (v === undefined) throw E.REF; return v; } const fila = filas[fi - 1]; if (!fila || fila[co - 1] === undefined) throw E.REF; return fila[co - 1]; },
    ROWS: (ctx, [r]) => (Array.isArray(r) ? r.length : 1), COLUMNS: (ctx, [r]) => (Array.isArray(r) ? (r[0] || []).length : 1),
    UNIQUE: (ctx, [r]) => { const vistos = new Set(); const out = []; for (const v of plano(r)) { const k = typeof v === 'string' ? v.toLowerCase() : v; if (vacio(v) || vistos.has(k)) continue; vistos.add(k); out.push([v]); } return out; },
  };
  const LISTA = [...Object.keys(F), ...Object.keys(FR)].sort();

  function formatear(n, f) {
    const F2 = f.replace(/"/g, '');
    if (/^0(\.0+)?%$/.test(F2)) { const d = (F2.split('.')[1] || '').length - 1; return (n * 100).toFixed(Math.max(d, 0)) + '%'; }
    if (/^[#,0]+(\.0+)?$/.test(F2)) { const d = (F2.split('.')[1] || '').length; const s = n.toFixed(d); return F2.includes(',') ? Number(s).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }) : s; }
    if (/^(yyyy|dd|mm|yy|d|m)/i.test(F2)) { const d = fechaDe(n); const p = (x) => String(x).padStart(2, '0'); return F2.replace(/yyyy/gi, d.getUTCFullYear()).replace(/yy/gi, String(d.getUTCFullYear()).slice(2)).replace(/mm/gi, p(d.getUTCMonth() + 1)).replace(/dd/gi, p(d.getUTCDate())); }
    return fmtGeneral(n);
  }

  // ---------------------------------------------------------------- libro y evaluación
  // libro: { hojas: [{ nombre, celdas: { 'A1': { v: '=SUM(B1:B3)' } } }] }. leer(hoja, c, f) devuelve el contenido crudo
  function crearEvaluador(leer, nombresHojas) {
    const cache = new Map(); const pila = new Set();
    function hojaDe(h, actual) { if (!h) return actual; const i = nombresHojas().findIndex((n) => n.toLowerCase() === h.toLowerCase()); if (i < 0) throw E.REF; return i; }
    function crudo(h, c, f) { const v = leer(h, c, f); return v === undefined ? null : v; }
    function literal(s) {
      if (s === null || s === undefined || s === '') return null;
      if (typeof s !== 'string') return s;
      if (s.startsWith("'")) return s.slice(1);
      const t = s.trim();
      if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(t)) return parseFloat(t);
      if (/^-?\d+(\.\d+)?%$/.test(t)) return parseFloat(t) / 100;
      if (/^(TRUE|FALSE)$/i.test(t)) return t.toUpperCase() === 'TRUE';
      return s;
    }
    function valor(h, c, f) {
      const k = h + ':' + c + ':' + f;
      if (cache.has(k)) return cache.get(k);
      const s = crudo(h, c, f);
      if (typeof s !== 'string' || s[0] !== '=' || s.length < 2) { const v = literal(s); cache.set(k, v); return v; }
      if (pila.has(k)) return E.CIRC;
      pila.add(k);
      let v;
      try { v = evalNodo(arbolDe(s), h); if (Array.isArray(v)) v = v[0] ? v[0][0] : null; if (typeof v === 'number' && !isFinite(v)) v = E.NUM; }
      catch (e) { v = esErr(e) ? e : E.VALUE; }
      pila.delete(k); cache.set(k, v); return v;
    }
    const arboles = new Map();
    function arbolDe(s) { if (!arboles.has(s)) { try { arboles.set(s, parse(s.slice(1))); } catch (e) { arboles.set(s, { k: 'err', e: esErr(e) ? e : E.VALUE }); } } return arboles.get(s); }
    function rango(n, actual) {
      const h = hojaDe(n.hoja, actual); const a = parseDir(n.a), b = n.b ? parseDir(n.b) : a; if (!a || !b) throw E.REF;
      let c0 = Math.min(a.c, b.c), c1 = Math.max(a.c, b.c), f0 = Math.min(a.f, b.f), f1 = Math.max(a.f, b.f);
      if (n.cols || f1 - f0 > 200000) { f0 = 0; f1 = Math.min(f1, ultimaFila(h)); }
      const out = []; for (let f = f0; f <= f1; f++) { const fila = []; for (let c = c0; c <= c1; c++) fila.push(valor(h, c, f)); out.push(fila); }
      return out;
    }
    let ultimaFila = () => 0;
    function evalArgs(args, actual) { return args.map((a) => (a.k === 'vacio' ? undefined : a.k === 'ref' ? (a.b || a.cols ? rango(a, actual) : evalNodo(a, actual)) : evalNodo(a, actual))); }
    function evalNodo(n, actual) {
      switch (n.k) {
        case 'err': throw n.e;
        case 'num': case 'str': case 'bool': return n.v;
        case 'errlit': return ERR(n.v);
        case 'vacio': return null;
        case 'name': throw E.NAME;
        case 'neg': return -num(evalNodo(n.a, actual));
        case 'ref': { if (n.b || n.cols) return rango(n, actual); const h = hojaDe(n.hoja, actual); const d = parseDir(n.a); if (!d) throw E.REF; const v = valor(h, d.c, d.f); return v === null ? 0 : v; }
        case 'bin': {
          let a = evalNodo(n.a, actual), b = evalNodo(n.b, actual);
          if (Array.isArray(a)) a = a[0] && a[0][0]; if (Array.isArray(b)) b = b[0] && b[0][0];
          if (esErr(a)) throw a; if (esErr(b)) throw b;
          switch (n.op) {
            case '+': return num(a) + num(b); case '-': return num(a) - num(b); case '*': return num(a) * num(b);
            case '/': { const d = num(b); if (d === 0) throw E.DIV0; return num(a) / d; }
            case '^': return Math.pow(num(a), num(b)); case '&': return txt(a) + txt(b);
            case '=': return cmp(a, b) === 0; case '<>': return cmp(a, b) !== 0; case '<': return cmp(a, b) < 0; case '>': return cmp(a, b) > 0; case '<=': return cmp(a, b) <= 0; case '>=': return cmp(a, b) >= 0;
          }
          throw E.VALUE;
        }
        case 'fn': {
          if (n.v === 'IFERROR' || n.v === 'IFNA') { let v; try { v = evalNodo(n.args[0], actual); if (Array.isArray(v)) v = v[0][0]; } catch (e) { v = esErr(e) ? e : E.VALUE; } return F[n.v]([v, n.args[1] ? evalNodo(n.args[1], actual) : '']); }
          if (n.v === 'IF') { const c = evalNodo(n.args[0], actual); const r = bool(Array.isArray(c) ? c[0][0] : c) ? n.args[1] : n.args[2]; return r === undefined ? bool(c) : r.k === 'vacio' ? 0 : evalNodo(r, actual); }
          if (n.v === 'ISERROR' || n.v === 'ISNA') { let v; try { v = evalNodo(n.args[0], actual); } catch (e) { v = esErr(e) ? e : E.VALUE; } return F[n.v]([v]); }
          if (FR[n.v]) return FR[n.v](null, evalArgs(n.args, actual));
          if (F[n.v]) { const args = evalArgs(n.args, actual); for (const a of plano(args)) if (esErr(a) && !['COUNT', 'COUNTA'].includes(n.v)) throw a; return F[n.v](args); }
          throw E.NAME;
        }
      }
      throw E.VALUE;
    }
    return {
      valor, limpiar() { cache.clear(); }, set ultimaFila(f) { ultimaFila = f; },
      // valor de una fórmula suelta (para pruebas)
      evaluar(formula, hoja = 0) { try { const v = evalNodo(parse(formula.replace(/^=/, '')), hoja); return Array.isArray(v) ? v[0][0] : v; } catch (e) { return esErr(e) ? e : E.VALUE; } },
    };
  }

  // al copiar una fórmula de (c0,f0) a (c1,f1) las referencias relativas se desplazan; las que tienen $ no
  function moverFormula(s, dc, df) {
    if (typeof s !== 'string' || s[0] !== '=') return s;
    // solo fuera de los textos entre comillas
    return s.split('"').map((p, i) => (i % 2 ? p : p.replace(/(^|[^A-Za-z0-9_.'!$])((?:'(?:[^']|'')+'|[A-Za-z_][\w.]*)!)?(\$?)([A-Za-z]{1,3})(\$?)(\d+)(?![\w(])/g, (m, pre, hoja, dc0, col, df0, fila) => {
      let c = colNum(col), f = Number(fila) - 1;
      if (!dc0) c += dc; if (!df0) f += df;
      if (c < 0 || f < 0) return pre + '#REF!';
      return pre + (hoja || '') + dc0 + colTxt(c) + df0 + (f + 1);
    }))).join('"');
  }

  function mostrar(v, formato) {
    if (v === null || v === undefined) return '';
    if (esErr(v)) return v.err;
    if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
    if (typeof v === 'number') {
      switch (formato) {
        case 'numero': return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        case 'moneda': return (v < 0 ? '-$' : '$') + Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        case 'porcentaje': return (v * 100).toFixed(1).replace(/\.0$/, '') + '%';
        case 'fecha': return formatear(v, 'yyyy-mm-dd');
        case 'entero': return Math.round(v).toLocaleString('en-US');
        default: { if (Math.abs(v) >= 1e11 || (Math.abs(v) < 1e-9 && v !== 0)) return v.toExponential(4).replace('e+', 'E+'); const s = fmtGeneral(v); return s.length > 11 && s.includes('.') ? String(Number(v.toPrecision(10))) : s; }
      }
    }
    return String(v);
  }

  raiz.ExcelMotor = { parse, tokens, crearEvaluador, moverFormula, mostrar, colNum, colTxt, dir, parseDir, esErr, E, LISTA, serieDe, fechaDe, cmp, formatear };
})(typeof window !== 'undefined' ? window : globalThis);
