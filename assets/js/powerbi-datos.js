/* Datos del Power BI de práctica: lectura de archivos y motor de Power Query.
 *
 * - Lee Excel (SheetJS), CSV/TXT (detecta el separador y la coma decimal), JSON, texto pegado.
 * - Aplica los "pasos aplicados" de Power Query y escribe la fórmula M de cada paso, con los nombres
 *   de función reales (Table.SelectRows, Table.Group, Table.NestedJoin, Table.UnpivotOtherColumns…),
 *   como se documenta en learn.microsoft.com/powerquery-m.
 * - Columna personalizada: evalúa un subconjunto de M ([col], if/then/else, and/or, Text.*, Number.*, Date.*).
 */
(function () {
  'use strict';
  // ------------------------------------------------------------------ lectura de archivos
  function parseCsv(texto) {
    texto = texto.replace(/^﻿/, '');
    const primera = texto.split(/\r?\n/)[0] || '';
    const sep = [',', ';', '\t', '|'].sort((a, b) => primera.split(b).length - primera.split(a).length)[0];
    const filas = []; let fila = [], campo = '', comillas = false;
    for (let i = 0; i < texto.length; i++) {
      const c = texto[i];
      if (comillas) { if (c === '"' && texto[i + 1] === '"') { campo += '"'; i++; } else if (c === '"') comillas = false; else campo += c; continue; }
      if (c === '"') comillas = true;
      else if (c === sep) { fila.push(campo); campo = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && texto[i + 1] === '\n') i++; fila.push(campo); filas.push(fila); fila = []; campo = ''; }
      else campo += c;
    }
    if (campo || fila.length) { fila.push(campo); filas.push(fila); }
    return filas.filter((f) => f.length > 1 || (f[0] || '').trim() !== '');
  }
  function deJson(obj) {
    const tablas = [];
    const aTabla = (nombre, arr) => { if (!Array.isArray(arr) || !arr.length) return; if (typeof arr[0] !== 'object' || arr[0] === null) { tablas.push({ nombre, filas: [['valor'], ...arr.map((x) => [x])] }); return; } const cols = [...new Set(arr.flatMap((o) => Object.keys(o || {})))]; tablas.push({ nombre, filas: [cols, ...arr.map((o) => cols.map((c) => (o[c] !== null && typeof o[c] === 'object' ? JSON.stringify(o[c]) : o[c] ?? '')))] }); };
    if (Array.isArray(obj)) aTabla('Tabla', obj); else if (obj && typeof obj === 'object') for (const [k, v] of Object.entries(obj)) { if (Array.isArray(v)) aTabla(k, v); else if (v && typeof v === 'object') for (const [k2, v2] of Object.entries(v)) if (Array.isArray(v2)) aTabla(k2, v2); }
    return tablas;
  }
  async function cargarSheetJS() {
    if (window.XLSX) return window.XLSX;
    await new Promise((ok, mal) => { const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'; s.onload = ok; s.onerror = () => mal(new Error('No se pudo cargar el lector de Excel (SheetJS). Revisa tu conexión.')); document.head.appendChild(s); });
    return window.XLSX;
  }
  async function leerArchivo(file) {
    const nombre = file.name.replace(/\.[^.]+$/, '');
    if (/\.(xlsx|xlsm|xls|ods)$/i.test(file.name)) {
      const X = await cargarSheetJS(); const wb = X.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
      return wb.SheetNames.map((h) => ({ nombre: h, filas: X.utils.sheet_to_json(wb.Sheets[h], { header: 1, raw: true, defval: '' }).map((f) => f.map((x) => (x instanceof Date ? x.toISOString().slice(0, 10) : x))) })).filter((t) => t.filas.length);
    }
    const texto = await file.text();
    if (/\.json$/i.test(file.name)) return deJson(JSON.parse(texto));
    return [{ nombre, filas: parseCsv(texto) }];
  }

  // ------------------------------------------------------------------ tipos
  const esFechaTxt = (v) => typeof v === 'string' && (/^\d{4}-\d{2}-\d{2}([ T]\d{2}:\d{2}(:\d{2})?)?/.test(v) || /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(v));
  const aNum = (v) => { if (typeof v === 'number') return v; if (v === '' || v == null) return null; const s = String(v).trim().replace(/\s/g, ''); const x = /^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s) ? s.replace(/\./g, '').replace(',', '.') : /^-?\d+,\d+$/.test(s) ? s.replace(',', '.') : s.replace(/^\$/, ''); const n = Number(x); return isNaN(n) ? null : n; };
  const aFecha = (v) => { if (v == null || v === '') return null; const s = String(v); let m = /^(\d{4}-\d{2}-\d{2})/.exec(s); if (m) return m[1]; m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s); if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`; return null; };
  function detectarTipo(vals) {
    const v = vals.filter((x) => x !== '' && x != null).slice(0, 300);
    if (!v.length) return 'texto';
    if (v.every((x) => typeof x === 'boolean' || /^(true|false|verdadero|falso)$/i.test(String(x)))) return 'bool';
    if (v.every((x) => typeof x === 'number' || (aNum(x) !== null && /^[-$\d.,\s]+$/.test(String(x))))) return v.every((x) => Number.isInteger(aNum(x))) ? 'int' : 'num';
    if (v.every(esFechaTxt)) return 'fecha';
    return 'texto';
  }
  const convertir = (v, t) => (t === 'num' ? aNum(v) : t === 'int' ? (aNum(v) === null ? null : Math.round(aNum(v))) : t === 'fecha' ? aFecha(v) : t === 'bool' ? (v === '' || v == null ? null : /^(true|verdadero|1)$/i.test(String(v)) ? 1 : 0) : v == null ? null : String(v));
  const TIPO_M = { num: 'type number', int: 'Int64.Type', texto: 'type text', fecha: 'type date', bool: 'type logical' };

  // ------------------------------------------------------------------ fórmulas M de columna personalizada
  function tokensM(src) {
    const out = []; let i = 0;
    while (i < src.length) {
      const c = src[i];
      if (/\s/.test(c)) { i++; continue; }
      if (c === '"') { let j = i + 1, s = ''; while (j < src.length) { if (src[j] === '"') { if (src[j + 1] === '"') { s += '"'; j += 2; continue; } break; } s += src[j++]; } out.push({ k: 's', v: s }); i = j + 1; continue; }
      if (c === '[') { const j = src.indexOf(']', i); if (j < 0) throw new Error('Falta cerrar el corchete ]'); out.push({ k: 'c', v: src.slice(i + 1, j) }); i = j + 1; continue; }
      if (/\d/.test(c)) { const m = /^\d+(\.\d+)?/.exec(src.slice(i)); out.push({ k: 'n', v: Number(m[0]) }); i += m[0].length; continue; }
      if (/[A-Za-z_#]/.test(c)) { const m = /^#?[A-Za-z_][\w.]*/.exec(src.slice(i)); out.push({ k: 'id', v: m[0] }); i += m[0].length; continue; }
      const dos = src.slice(i, i + 2); if (['<=', '>=', '<>'].includes(dos)) { out.push({ k: 'o', v: dos }); i += 2; continue; }
      if ('+-*/&=<>(),'.includes(c)) { out.push({ k: 'o', v: c }); i++; continue; }
      throw new Error(`Carácter no válido en la fórmula: ${c}`);
    }
    return out;
  }
  const FN_M = {
    'Text.Upper': (s) => (s == null ? null : String(s).toUpperCase()), 'Text.Lower': (s) => (s == null ? null : String(s).toLowerCase()), 'Text.Trim': (s) => (s == null ? null : String(s).trim()),
    'Text.Length': (s) => (s == null ? null : String(s).length), 'Text.Start': (s, n) => (s == null ? null : String(s).slice(0, n)), 'Text.End': (s, n) => (s == null ? null : String(s).slice(-n)),
    'Text.Middle': (s, a, n) => (s == null ? null : String(s).substr(a, n)), 'Text.Contains': (s, x) => (s == null ? null : String(s).includes(x)), 'Text.Replace': (s, a, b) => (s == null ? null : String(s).split(a).join(b)),
    'Text.From': (x) => (x == null ? null : String(x)), 'Text.Proper': (s) => (s == null ? null : String(s).toLowerCase().replace(/(^|\s)\S/g, (m) => m.toUpperCase())), 'Text.PadStart': (s, n, ch = ' ') => (s == null ? null : String(s).padStart(n, ch)),
    'Number.From': (x) => aNum(x), 'Number.Round': (x, d = 0) => (x == null ? null : Math.round(x * 10 ** d) / 10 ** d), 'Number.Abs': (x) => (x == null ? null : Math.abs(x)), 'Number.RoundDown': (x) => (x == null ? null : Math.floor(x)), 'Number.RoundUp': (x) => (x == null ? null : Math.ceil(x)), 'Number.Mod': (a, b) => a % b, 'Number.Power': (a, b) => a ** b,
    'Date.Year': (d) => (d ? Number(String(d).slice(0, 4)) : null), 'Date.Month': (d) => (d ? Number(String(d).slice(5, 7)) : null), 'Date.Day': (d) => (d ? Number(String(d).slice(8, 10)) : null), 'Date.QuarterOfYear': (d) => (d ? Math.ceil(Number(String(d).slice(5, 7)) / 3) : null),
    'Date.From': (d) => aFecha(d), 'Date.AddDays': (d, n) => { if (!d) return null; const x = new Date(String(d).slice(0, 10) + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); },
    'Date.DayOfWeekName': (d) => (d ? ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'][new Date(String(d).slice(0, 10) + 'T00:00:00Z').getUTCDay()] : null), 'Date.MonthName': (d) => (d ? ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'][Number(String(d).slice(5, 7)) - 1] : null),
    'Date.ToText': (d, f = 'yyyy-MM-dd') => (d ? f.replace('yyyy', String(d).slice(0, 4)).replace('MM', String(d).slice(5, 7)).replace('dd', String(d).slice(8, 10)) : null),
  };
  function compilarM(src) {
    const tk = tokensM(String(src).replace(/^\s*=?\s*(each\s+)?/i, '')); let p = 0;
    const es = (v) => tk[p] && (tk[p].k === 'o' || tk[p].k === 'id') && tk[p].v === v;
    const tomar = (v) => { if (v && !es(v)) throw new Error(`Se esperaba "${v}"`); return tk[p++]; };
    const expr = () => { if (es('if')) { p++; const c = expr(); tomar('then'); const a = expr(); tomar('else'); const b = expr(); return (r) => (truthy(c(r)) ? a(r) : b(r)); } return oor(); };
    const truthy = (x) => x === true || (x !== false && x != null && x !== 0);
    const oor = () => { let a = and(); while (es('or')) { p++; const x = a, y = and(); a = (r) => truthy(x(r)) || truthy(y(r)); } return a; };
    const and = () => { let a = no(); while (es('and')) { p++; const x = a, y = no(); a = (r) => truthy(x(r)) && truthy(y(r)); } return a; };
    const no = () => { if (es('not')) { p++; const x = no(); return (r) => !truthy(x(r)); } return cmp(); };
    const cmp = () => { const a = cat(); for (const op of ['<=', '>=', '<>', '=', '<', '>']) if (es(op)) { p++; const b = cat(); return (r) => { const x = a(r), y = b(r); if (x == null || y == null) return op === '<>' ? x !== y : op === '=' ? x === y : null; return op === '=' ? x == y : op === '<>' ? x != y : op === '<' ? x < y : op === '>' ? x > y : op === '<=' ? x <= y : x >= y; }; } return a; };
    const cat = () => { let a = add(); while (es('&')) { p++; const x = a, y = add(); a = (r) => (x(r) == null || y(r) == null ? null : String(x(r)) + String(y(r))); } return a; };
    const add = () => { let a = mul(); while (es('+') || es('-')) { const op = tomar().v, x = a, y = mul(); a = (r) => { const u = x(r), v = y(r); return u == null || v == null ? null : op === '+' ? u + v : u - v; }; } return a; };
    const mul = () => { let a = un(); while (es('*') || es('/')) { const op = tomar().v, x = a, y = un(); a = (r) => { const u = x(r), v = y(r); return u == null || v == null ? null : op === '*' ? u * v : v === 0 ? null : u / v; }; } return a; };
    const un = () => { if (es('-')) { p++; const x = un(); return (r) => (x(r) == null ? null : -x(r)); } return prim(); };
    const prim = () => {
      const t = tk[p++]; if (!t) throw new Error('La fórmula terminó antes de tiempo');
      if (t.k === 'n') return () => t.v; if (t.k === 's') return () => t.v;
      if (t.k === 'c') return (r) => { if (!(t.v in r)) throw new Error(`No existe la columna [${t.v}]`); return r[t.v]; };
      if (t.k === 'o' && t.v === '(') { const e = expr(); tomar(')'); return e; }
      if (t.k === 'id') {
        if (t.v === 'null') return () => null; if (t.v === 'true') return () => true; if (t.v === 'false') return () => false;
        const fn = FN_M[t.v]; if (!fn) throw new Error(`La función ${t.v} no está disponible en esta práctica (prueba Text.Upper, Text.Start, Number.Round, Date.Year…)`);
        tomar('('); const args = []; if (!es(')')) { args.push(expr()); while (es(',')) { p++; args.push(expr()); } } tomar(')');
        return (r) => fn(...args.map((a) => a(r)));
      }
      throw new Error(`No esperaba "${t.v}"`);
    };
    const f = expr(); if (p < tk.length) throw new Error(`Sobra "${tk[p].v}" en la fórmula`);
    return f;
  }

  // ------------------------------------------------------------------ pasos de Power Query
  const NOMBRE_PASO = { origen: 'Origen', navegacion: 'Navegación', encabezados: 'Encabezados promovidos', tipos: 'Tipo cambiado', quitar: 'Columnas quitadas', elegir: 'Otras columnas quitadas', renombrar: 'Columnas con nombre cambiado', filtrar: 'Filas filtradas', reemplazar: 'Valor reemplazado', duplicados: 'Duplicados quitados', ordenar: 'Filas ordenadas', mayus: 'Texto transformado', quitarArriba: 'Primeras filas quitadas', mantenerArriba: 'Primeras filas conservadas', dividir: 'Dividir columna por delimitador', agrupar: 'Filas agrupadas', combinar: 'Consultas combinadas', anexar: 'Consulta anexada', anular: 'Columnas con anulación de dinamización', anularOtras: 'Otras columnas con anulación de dinamización', rellenar: 'Rellenado hacia abajo', personalizada: 'Personalizado agregado', condicional: 'Columna condicional agregada', indice: 'Índice agregado', duplicar: 'Columna duplicada' };
  const nombrePaso = (p) => p.nombre || NOMBRE_PASO[p.tipo] || p.tipo;
  const OPS_FILTRO = { '=': 'es igual a', '<>': 'no es igual a', '>': 'es mayor que', '<': 'es menor que', '>=': 'es mayor o igual que', '<=': 'es menor o igual que', contiene: 'contiene', nocontiene: 'no contiene', empieza: 'comienza por', termina: 'termina con', novacio: 'no está en blanco' };
  const cumple = (v, op, val) => {
    if (op === 'novacio') return v !== null && v !== '';
    if (op === 'contiene' || op === 'nocontiene' || op === 'empieza' || op === 'termina') { const s = String(v ?? '').toLowerCase(), x = String(val ?? '').toLowerCase(); const r = op === 'empieza' ? s.startsWith(x) : op === 'termina' ? s.endsWith(x) : s.includes(x); return op === 'nocontiene' ? !r : r; }
    const num = typeof v === 'number' && !isNaN(Number(val)); const a = num ? v : String(v ?? ''), b = num ? Number(val) : String(val ?? '');
    return op === '=' ? a === b : op === '<>' ? a !== b : op === '>' ? a > b : op === '<' ? a < b : op === '>=' ? a >= b : a <= b;
  };
  const AGRUP = { suma: ['Suma', 'List.Sum'], promedio: ['Promedio', 'List.Average'], min: ['Mínimo', 'List.Min'], max: ['Máximo', 'List.Max'], contar: ['Recuento de filas', 'Table.RowCount'], distintos: ['Recuento de filas distintas', 'Table.RowCount(Table.Distinct(_))'], mediana: ['Mediana', 'List.Median'] };

  // aplica los pasos; resolver(nombre) devuelve otra consulta ya transformada (para combinar y anexar)
  function aplicar(crudo, pasos, resolver) {
    let cols = crudo.cols.map((n) => ({ n, t: 'texto' })), rows = crudo.rows;
    if (crudo.yaTipado) cols = crudo.cols.map((n, i) => ({ n, t: detectarTipo(rows.slice(0, 300).map((r) => r[i])) }));
    for (const p of pasos) {
      const i = (n) => cols.findIndex((x) => x.n === n);
      const k = p.col !== undefined ? i(p.col) : -1;
      switch (p.tipo) {
        case 'encabezados': if (rows.length) { cols = rows[0].map((n, j) => ({ n: String(n ?? '').trim() || `Column${j + 1}`, t: 'texto' })); rows = rows.slice(1); } break;
        case 'tipos': { const tipos = cols.map((x) => p.mapa[x.n] || x.t); rows = rows.map((r) => r.map((v, j) => convertir(v, tipos[j]))); cols = cols.map((x, j) => ({ n: x.n, t: tipos[j] })); break; }
        case 'quitar': case 'elegir': { const sel = p.cols.map(i).filter((j) => j >= 0); const quedan = p.tipo === 'quitar' ? cols.map((_, j) => j).filter((j) => !sel.includes(j)) : sel; cols = quedan.map((j) => cols[j]); rows = rows.map((r) => quedan.map((j) => r[j])); break; }
        case 'renombrar': if (k >= 0) cols = cols.map((x, j) => (j === k ? { ...x, n: p.a } : x)); break;
        case 'filtrar': if (k >= 0) rows = rows.filter((r) => cumple(r[k], p.op, p.val)); break;
        case 'reemplazar': if (k >= 0) rows = rows.map((r) => r.map((v, j) => (j === k && String(v ?? '') === String(p.de) ? (cols[k].t === 'texto' || isNaN(Number(p.a)) ? p.a : Number(p.a)) : v))); break;
        case 'duplicados': { const idx = (p.cols && p.cols.length ? p.cols : cols.map((x) => x.n)).map(i); const vistos = new Set(); rows = rows.filter((r) => { const key = JSON.stringify(idx.map((j) => r[j])); if (vistos.has(key)) return false; vistos.add(key); return true; }); break; }
        case 'ordenar': if (k >= 0) rows = rows.slice().sort((a, b) => (a[k] === b[k] ? 0 : a[k] == null ? 1 : b[k] == null ? -1 : a[k] < b[k] ? -1 : 1) * (p.desc ? -1 : 1)); break;
        case 'mayus': if (k >= 0) rows = rows.map((r) => r.map((v, j) => (j === k && typeof v === 'string' ? (p.modo === 'recortar' ? v.trim() : p.modo === 'min' ? v.toLowerCase() : p.modo === 'nombre' ? v.toLowerCase().replace(/(^|\s)\S/g, (m) => m.toUpperCase()) : v.toUpperCase()) : v))); break;
        case 'quitarArriba': rows = rows.slice(p.n); break;
        case 'mantenerArriba': rows = rows.slice(0, p.n); break;
        case 'dividir': if (k >= 0) {
          const partes = rows.map((r) => String(r[k] ?? '').split(p.delim));
          const n = Math.min(10, Math.max(1, ...partes.map((x) => x.length)));
          const nuevas = Array.from({ length: n }, (_, j) => ({ n: `${p.col}.${j + 1}`, t: 'texto' }));
          cols = [...cols.slice(0, k), ...nuevas, ...cols.slice(k + 1)];
          rows = rows.map((r, ri) => [...r.slice(0, k), ...nuevas.map((_, j) => (partes[ri][j] !== undefined ? partes[ri][j] : null)), ...r.slice(k + 1)]);
          break;
        }
        case 'agrupar': {
          const idx = p.por.map(i); const grupos = new Map();
          for (const r of rows) { const key = JSON.stringify(idx.map((j) => r[j])); if (!grupos.has(key)) grupos.set(key, []); grupos.get(key).push(r); }
          const res = [];
          for (const [key, rs] of grupos) {
            const fila = JSON.parse(key);
            for (const a of p.aggs) {
              const j = i(a.col), vals = j >= 0 ? rs.map((r) => r[j]).filter((x) => x != null && x !== '') : [];
              const nums = vals.map(Number).filter((x) => !isNaN(x));
              fila.push(a.op === 'contar' ? rs.length : a.op === 'distintos' ? new Set(rs.map((r) => JSON.stringify(r))).size : a.op === 'suma' ? nums.reduce((s, x) => s + x, 0) : a.op === 'promedio' ? (nums.length ? nums.reduce((s, x) => s + x, 0) / nums.length : null) : a.op === 'min' ? (nums.length ? Math.min(...nums) : null) : a.op === 'max' ? (nums.length ? Math.max(...nums) : null) : a.op === 'mediana' ? (() => { const s = nums.slice().sort((x, y) => x - y); return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : null; })() : null);
            }
            res.push(fila);
          }
          cols = [...idx.map((j) => cols[j]), ...p.aggs.map((a) => ({ n: a.nombre, t: a.op === 'contar' || a.op === 'distintos' ? 'int' : 'num' }))];
          rows = res; break;
        }
        case 'combinar': {
          const otra = resolver(p.con); if (!otra) throw new Error(`No existe la consulta "${p.con}"`);
          const ki = i(p.colIzq), kd = otra.cols.findIndex((x) => x.n === p.colDer);
          if (ki < 0 || kd < 0) throw new Error('Las columnas para combinar ya no existen');
          const idx = new Map(); for (const r of otra.rows) { const key = String(r[kd]); if (!idx.has(key)) idx.set(key, []); idx.get(key).push(r); }
          const exp = (p.expandir && p.expandir.length ? p.expandir : otra.cols.map((x) => x.n).filter((n) => n !== p.colDer)).map((n) => otra.cols.findIndex((x) => x.n === n)).filter((j) => j >= 0);
          const res = [];
          for (const r of rows) {
            const m = idx.get(String(r[ki]));
            if (p.tipo === 'anti') { if (!m) res.push(r); continue; }
            if (!m) { if (p.tipo !== 'interna') res.push([...r, ...exp.map(() => null)]); continue; }
            for (const o of m) res.push([...r, ...exp.map((j) => o[j])]);
          }
          if (p.tipo !== 'anti') cols = [...cols, ...exp.map((j) => ({ n: `${p.prefijo || p.con}.${otra.cols[j].n}`, t: otra.cols[j].t }))];
          rows = res; break;
        }
        case 'anexar': {
          const otra = resolver(p.con); if (!otra) throw new Error(`No existe la consulta "${p.con}"`);
          const extra = otra.cols.filter((c) => i(c.n) < 0);
          cols = [...cols, ...extra];
          rows = [...rows.map((r) => [...r, ...extra.map(() => null)]), ...otra.rows.map((r) => cols.map((c) => { const j = otra.cols.findIndex((x) => x.n === c.n); return j >= 0 ? r[j] : null; }))];
          break;
        }
        case 'anular': case 'anularOtras': {
          const sel = p.cols.map(i).filter((j) => j >= 0);
          const giran = p.tipo === 'anular' ? sel : cols.map((_, j) => j).filter((j) => !sel.includes(j));
          const fijas = cols.map((_, j) => j).filter((j) => !giran.includes(j));
          const res = []; for (const r of rows) for (const j of giran) if (r[j] !== null && r[j] !== '') res.push([...fijas.map((f) => r[f]), cols[j].n, r[j]]);
          const tv = giran.every((j) => ['num', 'int'].includes(cols[j].t)) ? 'num' : 'texto';
          cols = [...fijas.map((f) => cols[f]), { n: 'Atributo', t: 'texto' }, { n: 'Valor', t: tv }]; rows = res; break;
        }
        case 'rellenar': if (k >= 0) { let ult = null; const orden = p.dir === 'arriba' ? rows.slice().reverse() : rows; const r2 = orden.map((r) => { if (r[k] === null || r[k] === '') { const c = r.slice(); c[k] = ult; return c; } ult = r[k]; return r; }); rows = p.dir === 'arriba' ? r2.reverse() : r2; } break;
        case 'personalizada': {
          const f = compilarM(p.formula);
          const vals = rows.map((r) => { const o = {}; cols.forEach((c, j) => { o[c.n] = r[j]; }); try { const v = f(o); return v === true ? 'TRUE' : v === false ? 'FALSE' : v; } catch (e) { if (/No existe la columna/.test(e.message)) throw e; return null; } });
          cols = [...cols, { n: p.nombre, t: p.tipoCol || detectarTipo(vals) }]; rows = rows.map((r, j) => [...r, vals[j]]); break;
        }
        case 'condicional': {
          const vals = rows.map((r) => { for (const g of p.reglas) { const j = i(g.col); if (j >= 0 && cumple(r[j], g.op, g.val)) return g.res; } return p.otro ?? null; });
          cols = [...cols, { n: p.nombre, t: detectarTipo(vals) }]; rows = rows.map((r, j) => [...r, convertir(vals[j], detectarTipo(vals))]); break;
        }
        case 'indice': cols = [...cols, { n: p.nombre || 'Índice', t: 'int' }]; rows = rows.map((r, j) => [...r, (p.desde ?? 1) + j]); break;
        case 'duplicar': if (k >= 0) { cols = [...cols, { n: `${p.col} - Copia`, t: cols[k].t }]; rows = rows.map((r) => [...r, r[k]]); } break;
        default: break;
      }
    }
    return { cols, rows };
  }
  const lst = (a) => `{${a.map((c) => `"${c}"`).join(', ')}}`;
  const mVal = (v) => (v === null || v === undefined || v === '' ? 'null' : isNaN(Number(v)) ? `"${v}"` : v);
  function formulaM(p, anterior) {
    const a = `#"${anterior}"`;
    switch (p.tipo) {
      case 'origen': return p.m || '= Origen';
      case 'navegacion': return p.m || `= Origen{[Name="${p.ref}"]}[Data]`;
      case 'encabezados': return `= Table.PromoteHeaders(${a}, [PromoteAllScalars=true])`;
      case 'tipos': return `= Table.TransformColumnTypes(${a},{${Object.entries(p.mapa).map(([c, t]) => `{"${c}", ${TIPO_M[t]}}`).join(', ')}})`;
      case 'quitar': return `= Table.RemoveColumns(${a},${lst(p.cols)})`;
      case 'elegir': return `= Table.SelectColumns(${a},${lst(p.cols)})`;
      case 'renombrar': return `= Table.RenameColumns(${a},{{"${p.col}", "${p.a}"}})`;
      case 'filtrar': { const c = `[${p.col}]`; const e = { '=': `${c} = ${mVal(p.val)}`, '<>': `${c} <> ${mVal(p.val)}`, '>': `${c} > ${mVal(p.val)}`, '<': `${c} < ${mVal(p.val)}`, '>=': `${c} >= ${mVal(p.val)}`, '<=': `${c} <= ${mVal(p.val)}`, contiene: `Text.Contains(${c}, "${p.val}")`, nocontiene: `not Text.Contains(${c}, "${p.val}")`, empieza: `Text.StartsWith(${c}, "${p.val}")`, termina: `Text.EndsWith(${c}, "${p.val}")`, novacio: `${c} <> null and ${c} <> ""` }[p.op]; return `= Table.SelectRows(${a}, each ${e})`; }
      case 'reemplazar': return `= Table.ReplaceValue(${a},${mVal(p.de)},${mVal(p.a)},Replacer.ReplaceValue,{"${p.col}"})`;
      case 'duplicados': return `= Table.Distinct(${a}${p.cols && p.cols.length ? `, ${lst(p.cols)}` : ''})`;
      case 'ordenar': return `= Table.Sort(${a},{{"${p.col}", Order.${p.desc ? 'Descending' : 'Ascending'}}})`;
      case 'mayus': return `= Table.TransformColumns(${a},{{"${p.col}", ${{ recortar: 'Text.Trim', min: 'Text.Lower', nombre: 'Text.Proper' }[p.modo] || 'Text.Upper'}, type text}})`;
      case 'quitarArriba': return `= Table.Skip(${a},${p.n})`;
      case 'mantenerArriba': return `= Table.FirstN(${a},${p.n})`;
      case 'dividir': return `= Table.SplitColumn(${a}, "${p.col}", Splitter.SplitTextByDelimiter("${p.delim}", QuoteStyle.Csv))`;
      case 'agrupar': return `= Table.Group(${a}, ${lst(p.por)}, {${p.aggs.map((g) => `{"${g.nombre}", each ${g.op === 'contar' ? 'Table.RowCount(_)' : g.op === 'distintos' ? 'Table.RowCount(Table.Distinct(_))' : `${AGRUP[g.op][1]}([${g.col}])`}, ${g.op === 'contar' || g.op === 'distintos' ? 'Int64.Type' : 'type nullable number'}}`).join(', ')}})`;
      case 'combinar': return `= Table.ExpandTableColumn(Table.NestedJoin(${a}, {"${p.colIzq}"}, ${p.con}, {"${p.colDer}"}, "${p.con}", JoinKind.${{ izq: 'LeftOuter', interna: 'Inner', anti: 'LeftAnti' }[p.tipo] || 'LeftOuter'}), "${p.con}", ${lst(p.expandir || [])})`;
      case 'anexar': return `= Table.Combine({${a}, ${p.con}})`;
      case 'anular': return `= Table.Unpivot(${a}, ${lst(p.cols)}, "Atributo", "Valor")`;
      case 'anularOtras': return `= Table.UnpivotOtherColumns(${a}, ${lst(p.cols)}, "Atributo", "Valor")`;
      case 'rellenar': return `= Table.Fill${p.dir === 'arriba' ? 'Up' : 'Down'}(${a},{"${p.col}"})`;
      case 'personalizada': return `= Table.AddColumn(${a}, "${p.nombre}", each ${String(p.formula).replace(/^\s*=?\s*(each\s+)?/i, '')})`;
      case 'condicional': return `= Table.AddColumn(${a}, "${p.nombre}", each ${p.reglas.map((g, j) => `${j ? 'else ' : ''}if ${g.op === 'contiene' ? `Text.Contains([${g.col}], "${g.val}")` : `[${g.col}] ${g.op} ${mVal(g.val)}`} then ${mVal(g.res)}`).join(' ')} else ${mVal(p.otro)})`;
      case 'indice': return `= Table.AddIndexColumn(${a}, "${p.nombre || 'Índice'}", ${p.desde ?? 1}, 1, Int64.Type)`;
      case 'duplicar': return `= Table.DuplicateColumn(${a}, "${p.col}", "${p.col} - Copia")`;
      default: return '';
    }
  }
  // el script completo de la consulta, como el Editor avanzado
  function scriptM(pasos) {
    const nombres = []; const usados = {};
    const lineas = pasos.map((p, j) => {
      let n = nombrePaso(p); if (usados[n]) n = `${n}${++usados[n]}`; else usados[n] = 1; nombres.push(n);
      const f = formulaM(p, j ? nombres[j - 1] : 'Origen').replace(/^=\s*/, '');
      return `    ${/^[A-Za-z_]\w*$/.test(n) ? n : `#"${n}"`} = ${f}`;
    });
    const ult = nombres[nombres.length - 1] || 'Origen';
    return `let\n${lineas.join(',\n')}\nin\n    ${/^[A-Za-z_]\w*$/.test(ult) ? ult : `#"${ult}"`}`;
  }

  window.PBIDatos = { parseCsv, deJson, leerArchivo, cargarSheetJS, detectarTipo, convertir, aNum, aFecha, aplicar, formulaM, scriptM, nombrePaso, compilarM, OPS_FILTRO, AGRUP, TIPO_M, cumple };
})();
