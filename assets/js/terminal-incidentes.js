/*
 * Laboratorio de guardia (módulo "Incidentes"):
 *  - awk: un subconjunto real (-F, -v, BEGIN/END, patrones, $N, NR, NF, arreglos, printf, ~ y !~)
 *    para analizar logs y CSV como se hace de guardia.
 *  - incidente-preparar <id>: escribe en ~/incidentes/<id>/ los archivos de un incidente (alertas,
 *    logs de Airflow, Spark y Kafka, historial de Delta, listados del lago, CSV rotos). Los datos son
 *    deterministas: el mismo incidente produce siempre los mismos archivos, así las preguntas tienen
 *    una única respuesta correcta.
 */
(function () {
  'use strict';
  const Sh = window.Shell;
  if (!Sh) return;
  const { def, ok, fail, parseArgs, readFile, writeFile, norm, Machine, HOME } = Sh;

  // ================================================================== awk
  const NUM_RE = /^\s*[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?\s*$/;
  const KEYWORDS = new Set(['if', 'else', 'while', 'for', 'do', 'break', 'continue', 'next', 'exit', 'print', 'printf', 'in', 'delete', 'return']);
  const BUILTINS = new Set(['length', 'substr', 'index', 'split', 'tolower', 'toupper', 'int', 'sprintf', 'sqrt', 'log', 'exp', 'sub', 'gsub', 'match']);
  const SPECIALS = new Set(['NR', 'NF', 'FS', 'OFS', 'FILENAME', 'FNR', 'RSTART', 'RLENGTH']);

  function awkTokens(prog) {
    const t = [];
    const last = () => t[t.length - 1];
    const finOperando = (x) => x && (['str', 'num', 'id', 're'].includes(x.k) || x.v === ')' || x.v === ']');
    let i = 0;
    while (i < prog.length) {
      const c = prog[i];
      if (c === '\n') { t.push({ k: 'nl', v: '\n' }); i++; continue; }
      if (/\s/.test(c)) { i++; continue; }
      if (c === '#') { while (i < prog.length && prog[i] !== '\n') i++; continue; }
      if (c === '"') {
        let j = i + 1, s = '';
        while (j < prog.length && prog[j] !== '"') { if (prog[j] === '\\') { s += prog[j] + (prog[j + 1] || ''); j += 2; } else s += prog[j++]; }
        if (j >= prog.length) throw new Error('awk: cadena sin cerrar');
        t.push({ k: 'str', v: '"' + s.replace(/\n/g, '\\n') + '"' }); i = j + 1; continue;
      }
      if (c === '/' && !finOperando(last())) {
        let j = i + 1, s = '';
        while (j < prog.length && prog[j] !== '/') { if (prog[j] === '\\') { s += prog[j] + (prog[j + 1] || ''); j += 2; } else s += prog[j++]; }
        if (j >= prog.length) throw new Error('awk: expresión regular sin cerrar');
        t.push({ k: 're', v: '/' + s + '/' }); i = j + 1; continue;
      }
      if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(prog[i + 1] || ''))) {
        const m = prog.slice(i).match(/^(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?/);
        t.push({ k: 'num', v: m[0] }); i += m[0].length; continue;
      }
      if (/[A-Za-z_]/.test(c)) {
        const m = prog.slice(i).match(/^[A-Za-z_]\w*/);
        t.push({ k: 'id', v: m[0] }); i += m[0].length; continue;
      }
      const ops = ['==', '!=', '<=', '>=', '&&', '||', '++', '--', '+=', '-=', '*=', '/=', '%=', '^=', '!~'];
      const op = ops.find((o) => prog.startsWith(o, i));
      if (op) { t.push({ k: 'op', v: op }); i += 2; continue; }
      if ('+-*/%<>!=(){}[],;?:~$^'.includes(c)) { t.push({ k: 'op', v: c }); i++; continue; }
      throw new Error(`awk: carácter inesperado "${c}"`);
    }
    return t;
  }

  // traduce una lista de tokens de awk a una expresión/sentencias de JavaScript
  function awkJs(toks, arrays) {
    const out = [];       // trozos de salida
    const parens = [];    // por cada '(' abierto: ¿es la condición de un if/while/for?
    let prevFin = false;  // ¿el trozo anterior termina un operando? (para la concatenación por yuxtaposición)
    let prevFunc = false; // ¿el trozo anterior es el nombre de una función?
    const empieza = (x) => x && (['str', 'num', 're'].includes(x.k) || (x.k === 'id' && !KEYWORDS.has(x.v)) || x.v === '$' || x.v === '(' || (x.v === '!' && false));
    const primario = (x, sig) => {
      if (x.k === 'num') return x.v;
      if (x.k === 'str') return x.v;
      if (x.k === 're') return `M(F(0),${x.v})`;
      if (x.k === 'id') {
        if (SPECIALS.has(x.v)) return 'S.' + x.v;
        if (BUILTINS.has(x.v)) return (x.v === 'length' && !(sig && sig.v === '(')) ? 'B.length(F(0))' : 'B.' + x.v;
        if (arrays.has(x.v)) return `A(${JSON.stringify(x.v)})`;
        return 'V.' + x.v;
      }
      return null;
    };
    for (let i = 0; i < toks.length; i++) {
      const x = toks[i], sig = toks[i + 1];
      // print / printf: hasta el fin de la sentencia
      if (x.k === 'id' && (x.v === 'print' || x.v === 'printf')) {
        let j = i + 1, depth = 0; const args = [];
        let cur = [];
        while (j < toks.length) {
          const y = toks[j];
          if (depth === 0 && (y.v === ';' || y.k === 'nl' || y.v === '}')) break;
          if (y.v === '(' || y.v === '[') depth++;
          if (y.v === ')' || y.v === ']') depth--;
          if (depth === 0 && y.v === ',') { args.push(cur); cur = []; j++; continue; }
          if (y.v === '>' && depth === 0 && x.v === 'print' && toks[j + 1] && toks[j + 1].k === 'str') throw new Error('awk: la redirección > dentro de awk no está soportada; usa awk ... > archivo');
          cur.push(y); j++;
        }
        if (cur.length) args.push(cur);
        // print(a, b) con paréntesis envolventes
        if (args.length === 1 && args[0][0] && args[0][0].v === '(' && args[0][args[0].length - 1].v === ')') {
          let d = 0, envuelve = true;
          args[0].forEach((y, k) => { if (y.v === '(') d++; if (y.v === ')') d--; if (d === 0 && k < args[0].length - 1) envuelve = false; });
          if (envuelve) {
            const dentro = args[0].slice(1, -1); args.length = 0; let c2 = []; let d2 = 0;
            for (const y of dentro) { if (y.v === '(' || y.v === '[') d2++; if (y.v === ')' || y.v === ']') d2--; if (d2 === 0 && y.v === ',') { args.push(c2); c2 = []; } else c2.push(y); }
            if (c2.length) args.push(c2);
          }
        }
        const js = args.map((a) => awkJs(a, arrays));
        out.push(x.v === 'print' ? `P([${js.length ? js.join(',') : 'F(0)'}])` : `PF(${js.join(',')})`);
        prevFin = false; prevFunc = false; i = j - 1; continue;
      }
      if (x.k === 'id' && x.v === 'next') { out.push('return'); prevFin = false; continue; }
      if (x.k === 'id' && x.v === 'exit') { out.push('throw EXIT'); prevFin = false; continue; }
      if (x.k === 'id' && x.v === 'delete') {
        // delete arr[k] | delete arr
        const nombre = sig && sig.v; i++;
        if (toks[i + 1] && toks[i + 1].v === '[') out.push(`delete A(${JSON.stringify(nombre)})`);
        else out.push(`D(${JSON.stringify(nombre)})`);
        prevFin = false; continue;
      }
      if (x.k === 'id' && x.v === 'getline') throw new Error('awk: getline no está soportado en esta terminal');
      if (x.k === 'id' && x.v === 'function') throw new Error('awk: las funciones definidas por el usuario no están soportadas en esta terminal');
      // ~ y !~: el operando izquierdo es el último primario emitido
      if (x.v === '~' || x.v === '!~') {
        const izq = out.pop();
        const der = toks[i + 1];
        if (!der) throw new Error('awk: falta la expresión regular después de ~');
        let derJs;
        if (der.k === 're') derJs = der.v;
        else if (der.v === '$') { derJs = 'F(' + primario(toks[i + 2]) + ')'; i++; }
        else derJs = primario(der);
        out.push(`${x.v === '!~' ? '!' : ''}M(${izq},${derJs})`);
        i++; prevFin = true; continue;
      }
      // concatenación implícita
      if (prevFin && empieza(x) && !(prevFunc && x.v === '(')) out.push('+""+');
      if (x.v === '$') {
        if (sig && (sig.k === 'num' || sig.k === 'id')) { out.push(`F(${primario(sig)})`); i++; prevFin = true; prevFunc = false; continue; }
        out.push('F'); prevFin = false; prevFunc = true; continue;
      }
      if (x.k === 'id' && x.v === 'in') { out.push(' in '); prevFin = false; prevFunc = false; continue; }
      if (x.k === 'id' && KEYWORDS.has(x.v)) { out.push(' ' + x.v + ' '); prevFin = false; prevFunc = false; continue; }
      if (x.k === 'nl') { out.push('\n'); prevFin = false; continue; }
      const p = primario(x, sig);
      if (p !== null) {
        out.push(p);
        const esFunc = x.k === 'id' && BUILTINS.has(x.v) && sig && sig.v === '(';
        prevFunc = esFunc; prevFin = !esFunc; continue;
      }
      if (x.v === '^') { out.push('**'); prevFin = false; continue; }
      if (x.v === '^=') { out.push('**='); prevFin = false; continue; }
      out.push(x.v);
      if (x.v === '(') { const ant = toks[i - 1]; parens.push(!!(ant && ant.k === 'id' && ['if', 'while', 'for'].includes(ant.v))); }
      // el ')' que cierra la condición de un if/while/for no termina un operando: lo que sigue es una sentencia
      if (x.v === ')') { prevFin = !parens.pop(); prevFunc = false; continue; }
      prevFin = x.v === ']' || ((x.v === '++' || x.v === '--') && prevFin);
      prevFunc = false;
    }
    return out.join(' ');
  }

  function awkCompilar(prog) {
    const toks = awkTokens(prog);
    const arrays = new Set();
    toks.forEach((x, i) => {
      if (x.k === 'id' && toks[i + 1] && toks[i + 1].v === '[' && !BUILTINS.has(x.v) && !SPECIALS.has(x.v)) arrays.add(x.v);
      if (x.k === 'id' && x.v === 'in' && toks[i + 1] && toks[i + 1].k === 'id') arrays.add(toks[i + 1].v);
      if (x.k === 'id' && x.v === 'split' && toks[i + 1] && toks[i + 1].v === '(') {
        // split(s, arr, sep): el segundo argumento es un arreglo
        let d = 0;
        for (let j = i + 1; j < toks.length; j++) { if (toks[j].v === '(') d++; if (toks[j].v === ')') { d--; if (!d) break; } if (d === 1 && toks[j].v === ',' && toks[j + 1] && toks[j + 1].k === 'id') { arrays.add(toks[j + 1].v); break; } }
      }
    });
    const begin = [], main = [], end = [];
    let i = 0;
    const bloque = () => { // toks[i] es '{'
      let d = 0; const j0 = i;
      for (; i < toks.length; i++) { if (toks[i].v === '{') d++; if (toks[i].v === '}') { d--; if (!d) break; } }
      if (d) throw new Error('awk: falta una } de cierre');
      const cuerpo = toks.slice(j0 + 1, i); i++;
      return cuerpo;
    };
    while (i < toks.length) {
      const x = toks[i];
      if (x.k === 'nl' || x.v === ';') { i++; continue; }
      if (x.k === 'id' && (x.v === 'BEGIN' || x.v === 'END')) {
        i++; while (toks[i] && toks[i].k === 'nl') i++;
        if (!toks[i] || toks[i].v !== '{') throw new Error(`awk: se esperaba { después de ${x.v}`);
        (x.v === 'BEGIN' ? begin : end).push(awkJs(bloque(), arrays)); continue;
      }
      if (x.v === '{') { main.push({ pat: null, act: awkJs(bloque(), arrays) }); continue; }
      // patrón (hasta { o fin de línea)
      const pat = [];
      while (i < toks.length && toks[i].v !== '{' && toks[i].k !== 'nl' && toks[i].v !== ';') pat.push(toks[i++]);
      let act = null;
      if (toks[i] && toks[i].v === '{') act = awkJs(bloque(), arrays);
      main.push({ pat: awkJs(pat, arrays), act });
    }
    const code = `return {
      begin: function () { ${begin.join(';\n')} },
      rec: function () { ${main.map((r) => `if (${r.pat || 'true'}) { ${r.act === null ? 'P([F(0)])' : r.act} }`).join('\n')} },
      end: function () { ${end.join(';\n')} }
    };`;
    try { return { code, make: new Function('F', 'V', 'A', 'S', 'P', 'PF', 'M', 'B', 'D', 'EXIT', code) }; }
    catch (e) { throw new Error('awk: error de sintaxis en el programa (' + e.message + ')'); }
  }

  const awkNum = (v) => (typeof v === 'number' ? v : (NUM_RE.test(String(v)) ? Number(v) : (parseFloat(v) || 0)));
  const awkStr = (v) => (typeof v === 'number' ? (Number.isInteger(v) ? String(v) : String(+v.toPrecision(6))) : String(v));
  function awkFormato(fmt, args) {
    let k = 0;
    return String(fmt).replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/%([-0 +]*)(\d+)?(?:\.(\d+))?([sdifgec%x])/g, (m, flags, ancho, prec, tipo) => {
      if (tipo === '%') return '%';
      const v = args[k++];
      let s;
      if (tipo === 'd' || tipo === 'i') s = String(Math.trunc(awkNum(v)));
      else if (tipo === 'f') s = awkNum(v).toFixed(prec === undefined ? 6 : Number(prec));
      else if (tipo === 'e') s = awkNum(v).toExponential(prec === undefined ? 6 : Number(prec));
      else if (tipo === 'g') s = String(+awkNum(v).toPrecision(prec ? Number(prec) : 6));
      else if (tipo === 'x') s = Math.trunc(awkNum(v)).toString(16);
      else if (tipo === 'c') s = typeof v === 'number' ? String.fromCharCode(v) : String(v ?? '').charAt(0);
      else { s = v === undefined ? '' : awkStr(v); if (prec !== undefined) s = s.slice(0, Number(prec)); }
      if (ancho) s = flags.includes('-') ? s.padEnd(Number(ancho)) : s.padStart(Number(ancho), flags.includes('0') && tipo !== 's' ? '0' : ' ');
      return s;
    });
  }

  def('awk', "procesa texto por columnas: awk -F, '$3 > 100 {print $1, $3}' archivo", (a, ctx) => {
    const vars = {}; let fs = null; const resto = [];
    for (let i = 0; i < a.length; i++) {
      const x = a[i];
      if (x === '-F') { fs = a[++i]; continue; }
      if (x.startsWith('-F')) { fs = x.slice(2); continue; }
      if (x === '-v') { const [k, ...v] = String(a[++i] || '').split('='); vars[k] = v.join('='); continue; }
      resto.push(x);
    }
    const prog = resto.shift();
    if (prog === undefined) return fail("Uso: awk [-F SEP] [-v var=valor] 'programa' [archivo...]");
    let P;
    try { P = awkCompilar(prog); } catch (e) { return fail(e.message, 2); }
    const salida = [];
    const S = { NR: 0, NF: 0, FNR: 0, FS: fs === null ? ' ' : fs.replace(/^\\t$/, '\t'), OFS: ' ', FILENAME: '', RSTART: 0, RLENGTH: -1 };
    let linea = '', campos = [];
    const F = (n) => { n = awkNum(n); if (n === 0) return NUM_RE.test(linea) ? Number(linea) : linea; const v = campos[n - 1]; return v === undefined ? '' : (NUM_RE.test(v) ? Number(v) : v); };
    const V = new Proxy(Object.assign({}, Object.fromEntries(Object.entries(vars).map(([k, v]) => [k, NUM_RE.test(v) ? Number(v) : v]))), { get: (t, k) => (k in t ? t[k] : 0) });
    const tablas = {};
    const A = (n) => tablas[n] || (tablas[n] = new Proxy({}, { get: (t, k) => (k in t ? t[k] : 0) }));
    const D = (n) => { tablas[n] = null; A(n); };
    const PR = (vals) => salida.push(vals.map(awkStr).join(S.OFS));
    const PF = (fmt, ...args) => { const s = awkFormato(fmt, args); if (salida.pend !== undefined) salida.pend += s; else salida.pend = s; const partes = salida.pend.split('\n'); salida.pend = partes.pop(); salida.push(...partes); };
    const M = (s, re) => (re instanceof RegExp ? re : new RegExp(String(re))).test(awkStr(s));
    const B = {
      length: (s) => (s && typeof s === 'object' ? Object.keys(s).length : awkStr(s).length),
      substr: (s, i, n) => { s = awkStr(s); i = Math.max(1, Math.trunc(awkNum(i))); return n === undefined ? s.slice(i - 1) : s.substr(i - 1, Math.max(0, Math.trunc(awkNum(n)))); },
      index: (s, t) => awkStr(s).indexOf(awkStr(t)) + 1,
      split: (s, arr, sep) => { const partes = awkStr(s).split(sep === undefined ? (S.FS === ' ' ? /\s+/ : S.FS) : (sep instanceof RegExp ? sep : String(sep))); for (const k of Object.keys(arr)) delete arr[k]; partes.forEach((p, k) => { arr[k + 1] = NUM_RE.test(p) ? Number(p) : p; }); return partes.length; },
      tolower: (s) => awkStr(s).toLowerCase(), toupper: (s) => awkStr(s).toUpperCase(),
      int: (x) => Math.trunc(awkNum(x)), sqrt: (x) => Math.sqrt(awkNum(x)), log: (x) => Math.log(awkNum(x)), exp: (x) => Math.exp(awkNum(x)),
      sprintf: (fmt, ...args) => awkFormato(fmt, args),
      match: (s, re) => { const m = awkStr(s).match(re instanceof RegExp ? re : new RegExp(String(re))); S.RSTART = m ? m.index + 1 : 0; S.RLENGTH = m ? m[0].length : -1; return S.RSTART; },
      sub: () => { throw new Error('awk: sub/gsub no están soportados en esta terminal; usa sed'); },
      gsub: () => { throw new Error('awk: sub/gsub no están soportados en esta terminal; usa sed'); },
    };
    const EXIT = { exit: true };
    let prog2;
    try { prog2 = P.make(F, V, A, S, PR, PF, M, B, D, EXIT); } catch (e) { return fail('awk: ' + e.message, 2); }
    const archivos = resto.length ? resto : [null];
    try {
      try {
        prog2.begin();
        for (const f of archivos) {
          const texto = f === null ? (ctx.stdin || '') : readFile(norm(f));
          if (texto === null) return fail(`awk: no se puede abrir el archivo ${f} (No existe el archivo o el directorio)`, 2);
          S.FILENAME = f || ''; S.FNR = 0;
          const lineas = texto.replace(/\n$/, '').split('\n');
          if (texto === '') continue;
          for (const l of lineas) {
            linea = l; S.NR++; S.FNR++;
            campos = S.FS === ' ' ? l.trim().split(/\s+/).filter((x) => x !== '') : l.split(S.FS.length > 1 ? new RegExp(S.FS) : S.FS);
            if (S.FS === ' ' && !l.trim()) campos = [];
            S.NF = campos.length;
            prog2.rec();
          }
        }
      } catch (e) { if (e !== EXIT) throw e; }
      try { prog2.end(); } catch (e) { if (e !== EXIT) throw e; }
    } catch (e) { return fail('awk: ' + (e.message || e), 2); }
    if (salida.pend) salida.push(salida.pend);
    return ok(salida.join('\n'));
  });

  // file: como el de Linux, detecta BOM, fin de línea CRLF y texto con mojibake (UTF-8 leído como Latin-1)
  def('file', 'tipo de un archivo: codificación, BOM y fin de línea (file archivo.csv)', (a) => {
    const pos = a.filter((x) => !x.startsWith('-'));
    if (!pos.length) return fail('Uso: file ARCHIVO...');
    const out = [];
    for (const f of pos) {
      const p = norm(f);
      if (Sh.isDir(p)) { out.push(`${f}: directory`); continue; }
      const c = readFile(p);
      if (c === null) { out.push(`${f}: cannot open \`${f}' (No such file or directory)`); continue; }
      if (!c.length) { out.push(`${f}: empty`); continue; }
      const partes = [];
      const ext = (f.match(/\.(\w+)$/) || [])[1] || '';
      const tipo = ext === 'csv' ? 'CSV text' : ext === 'json' ? 'JSON text data' : ext === 'py' ? 'Python script text' : ext === 'gz' ? 'gzip compressed data' : null;
      const bom = c.charCodeAt(0) === 0xfeff;
      const ascii = /^[\x00-\x7f]*$/.test(c.replace(/^\ufeff/, ''));
      partes.push((tipo ? tipo + ', ' : '') + (ascii && !bom ? 'ASCII text' : bom ? 'Unicode text, UTF-8 (with BOM) text' : 'Unicode text, UTF-8 text'));
      if (/\r\n/.test(c)) partes.push('with CRLF line terminators');
      if (c.split('\n').some((l) => l.length > 300)) partes.push('with very long lines');
      let linea = out.length;
      out.push(`${f}: ${partes.join(', ')}`);
      if (/Ã[\u0080-\u00bf¡-¿]|Ã./.test(c)) out[linea] += Sh.col.dim('   (ojo: hay secuencias como "Ã¡" o "Ã©": texto UTF-8 que alguien leyó como Latin-1 y volvió a guardar)');
    }
    return ok(out.join('\n'));
  });

  // ================================================================== archivos de los incidentes
  function prng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const p2 = (n) => String(n).padStart(2, '0');
  const hora = (base, seg) => { const d = new Date(Date.parse(base) + seg * 1000); return `${d.getUTCFullYear()}-${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())} ${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}:${p2(d.getUTCSeconds())}`; };
  const af = (t, nivel, origen, msg) => `[${t},${String(Math.floor((t.charCodeAt(18) * 37) % 1000)).padStart(3, '0')}] {${origen}} ${nivel} - ${msg}`;

  const INCIDENTES = {};

  // ---------------------------------------------------------------- 01: primer día de guardia
  INCIDENTES['primer-dia'] = () => {
    const r = prng(101);
    const f = {};
    f['alerta.txt'] = [
      '[FIRING:1] SLA_FRESHNESS ventas.fct_ventas_diarias   severidad: SEV2',
      'Disparada:  2026-10-29 07:12 UTC      Equipo: data-platform      Guardia: tú',
      'Detalle:    la partición más reciente de fct_ventas_diarias es ds=2026-10-27.',
      '            Se esperaba ds=2026-10-28 antes de las 06:00 UTC (SLA del tablero de las 08:00).',
      'Último run: DAG ventas_diarias  run_id=scheduled__2026-10-28T03:00:00+00:00  estado: success',
      'Impacto:    tablero "Ventas diarias - Gerencia" (68 usuarios, se abre a las 08:00 UTC)',
      'Runbook:    ~/incidentes/primer-dia/runbook.md',
      '',
    ].join('\n');
    f['runbook.md'] = [
      '# Runbook: ventas_diarias',
      '',
      '## Qué hace',
      'erp_extract (03:00) copia erp/ventas/<ds>.csv al lago -> cargar_staging -> fct_ventas_diarias (MERGE por ds).',
      '',
      '## Si la alerta de frescura se dispara',
      '1. Reconoce la alerta (ack) y avisa en #data-incidentes: qué falla, impacto y próxima actualización.',
      '2. Mira el log de la última ejecución de cada tarea (logs/). Busca WARNING y ERROR, no solo el estado.',
      '3. Verifica el volumen: compara filas de la partición con el promedio de los últimos 7 días (cargas.csv).',
      '4. Si el archivo del ERP no llegó: NO reejecutes en bucle. Escala al equipo ERP (#erp-soporte).',
      '5. Cuando el archivo exista: limpia y reejecuta la tarea erp_extract del ds afectado (las tareas son idempotentes).',
      '6. Verifica: filas de la partición dentro de +-30 % del promedio y la alerta en verde.',
      '7. Cierra con una nota en el canal y abre el postmortem si el impacto fue visible para usuarios.',
      '',
      '## Contactos',
      'ERP: #erp-soporte (guardia ERP 24x7)   Dueño del tablero: ventas-analytics',
      '',
    ].join('\n');
    const L = [];
    let s = 0; const base = '2026-10-29T03:00:02Z';
    const add = (lvl, org, msg) => { L.push(af(hora(base, s), lvl, org, msg)); s += 1 + Math.floor(r() * 3); };
    add('INFO', 'taskinstance.py:1157', 'Dependencies all met for dep_context=non-requeueable deps ti=<TaskInstance: ventas_diarias.erp_extract scheduled__2026-10-28T03:00:00+00:00 [queued]>');
    add('INFO', 'taskinstance.py:1359', 'Starting attempt 1 of 3');
    add('INFO', 'taskinstance.py:1380', 'Executing <Task(PythonOperator): erp_extract> on 2026-10-28 03:00:00+00:00');
    add('INFO', 'erp.py:41', 'Conectando a sftp://erp.interno:22 como svc_datos');
    add('INFO', 'erp.py:58', 'Listando erp/ventas/ ... 412 archivos');
    for (let k = 0; k < 6; k++) add('INFO', 'erp.py:77', `Esperando erp/ventas/2026-10-28.csv (intento ${k + 1}/6, espera 60 s)`);
    add('WARNING', 'erp.py:83', 'Archivo erp/ventas/2026-10-28.csv no encontrado después de 6 intentos; allow_empty=True: se continúa con un lote vacío');
    add('INFO', 'erp.py:95', 'Escribiendo 0 filas en s3://lago/raw/erp/ventas/ds=2026-10-28/part-0000.parquet');
    add('INFO', 'taskinstance.py:1400', 'Marking task as SUCCESS. dag_id=ventas_diarias, task_id=erp_extract, logical_date=20261028T030000, start_date=20261029T030002, end_date=20261029T030614');
    s += 20;
    add('INFO', 'taskinstance.py:1359', 'Starting attempt 1 of 3');
    add('INFO', 'taskinstance.py:1380', 'Executing <Task(SQLExecuteQueryOperator): cargar_staging> on 2026-10-28 03:00:00+00:00');
    add('INFO', 'sql.py:418', 'Running statement: INSERT OVERWRITE staging.ventas PARTITION (ds=\'2026-10-28\') SELECT * FROM raw.erp_ventas WHERE ds = \'2026-10-28\'');
    add('INFO', 'sql.py:427', 'Rows affected: 0');
    add('INFO', 'taskinstance.py:1400', 'Marking task as SUCCESS. dag_id=ventas_diarias, task_id=cargar_staging, logical_date=20261028T030000');
    add('INFO', 'taskinstance.py:1359', 'Starting attempt 1 of 3');
    add('INFO', 'taskinstance.py:1380', 'Executing <Task(SQLExecuteQueryOperator): fct_ventas_diarias> on 2026-10-28 03:00:00+00:00');
    add('INFO', 'sql.py:418', 'Running statement: MERGE INTO ventas.fct_ventas_diarias t USING (SELECT ds, tienda_id, sum(monto) monto FROM staging.ventas WHERE ds=\'2026-10-28\' GROUP BY 1,2) s ON ...');
    add('WARNING', 'calidad.py:22', 'check_volumen deshabilitado para esta tarea (enabled: false en checks.yml)');
    add('INFO', 'sql.py:427', 'Rows affected: 0');
    add('INFO', 'taskinstance.py:1400', 'Marking task as SUCCESS. dag_id=ventas_diarias, task_id=fct_ventas_diarias, logical_date=20261028T030000, start_date=20261029T030655, end_date=20261029T030702');
    add('INFO', 'local_task_job.py:212', 'Task exited with return code 0');
    f['logs/ventas_diarias_2026-10-28.log'] = L.join('\n') + '\n';
    const cargas = ['ds,filas,monto_total'];
    for (let d = 0; d < 30; d++) {
      const fecha = new Date(Date.UTC(2026, 8, 29 + d));
      const ds = fecha.toISOString().slice(0, 10);
      const finde = [0, 6].includes(fecha.getUTCDay());
      const filas = ds === '2026-10-28' ? 0 : Math.round((finde ? 8200 : 12400) * (0.92 + r() * 0.16));
      cargas.push(`${ds},${filas},${(filas * (41 + r() * 3)).toFixed(2)}`);
    }
    f['cargas.csv'] = cargas.join('\n') + '\n';
    return f;
  };

  // ---------------------------------------------------------------- 02: monitoreo (checks)
  INCIDENTES.monitoreo = () => {
    const r = prng(202);
    const f = {};
    const filas = ['tabla,ds,filas,nulos_cliente,max_cargado_utc'];
    const tablas = { 'ventas.fct_pedidos': 52000, 'crm.dim_clientes': 1800, 'logistica.fct_envios': 30500 };
    for (const [t, baseN] of Object.entries(tablas)) {
      for (let d = 0; d < 14; d++) {
        const ds = new Date(Date.UTC(2026, 9, 15 + d)).toISOString().slice(0, 10);
        let n = Math.round(baseN * (0.95 + r() * 0.1));
        let nulos = Math.round(n * 0.002 * r());
        let max = `${ds} 0${3 + Math.floor(r() * 2)}:${p2(Math.floor(r() * 60))}`;
        if (t === 'logistica.fct_envios' && ds === '2026-10-28') n = Math.round(baseN * 0.41);
        if (t === 'crm.dim_clientes' && ds >= '2026-10-26') nulos = Math.round(n * 0.18 + r() * 20);
        if (t === 'ventas.fct_pedidos' && ds === '2026-10-28') max = '2026-10-28 23:58';
        filas.push(`${t},${ds},${n},${nulos},${max}`);
      }
    }
    f['metricas_tablas.csv'] = filas.join('\n') + '\n';
    f['checks.yml'] = [
      '# Contrato de calidad (formato inspirado en Soda/dbt). Cada check corre después de la carga.',
      'ventas.fct_pedidos:',
      '  frescura:   { columna: cargado_en, max_atraso: 6h }',
      '  volumen:    { min_vs_media_7d: 0.7, max_vs_media_7d: 1.5 }',
      '  unicidad:   [pedido_id]',
      '  no_nulos:   [pedido_id, cliente_id, monto]',
      'crm.dim_clientes:',
      '  no_nulos:   [cliente_id]',
      '  nulos_max:  { email: 0.01 }',
      '  # TODO: agregar check de nulos en segmento (pendiente desde marzo)',
      'logistica.fct_envios:',
      '  volumen:    { enabled: false }   # se apagó porque "daba falsos positivos los domingos"',
      '  unicidad:   [envio_id]',
      '',
    ].join('\n');
    const alertas = [];
    const nombres = ['volumen_fct_envios', 'frescura_fct_pedidos', 'nulos_dim_clientes', 'latencia_api_pagos', 'disco_airflow_worker'];
    for (let k = 0; k < 220; k++) {
      const n = nombres[Math.floor(r() * r() * nombres.length)];
      const t = hora('2026-10-01T00:00:00Z', Math.floor(r() * 27 * 86400));
      const accion = n === 'latencia_api_pagos' || r() < 0.85 ? 'auto-resuelta sin acción' : 'acción humana';
      alertas.push(`${t},${n},${accion}`);
    }
    alertas.sort();
    f['alertas_octubre.csv'] = 'disparada_utc,alerta,resultado\n' + alertas.join('\n') + '\n';
    return f;
  };

  // ---------------------------------------------------------------- 03: duplicados por reintentos
  INCIDENTES.duplicados = () => {
    const r = prng(303);
    const f = {};
    const L = [];
    let s = 0; const base = '2026-10-29T02:00:04Z';
    const add = (lvl, org, msg, salto = 1) => { L.push(af(hora(base, s), lvl, org, msg)); s += salto; };
    add('INFO', 'taskinstance.py:1359', 'Starting attempt 1 of 3');
    add('INFO', 'taskinstance.py:1380', 'Executing <Task(PostgresOperator): cargar_fct_pedidos> on 2026-10-28 02:00:00+00:00');
    add('INFO', 'sql.py:418', "Running statement: INSERT INTO dw.fct_pedidos SELECT *, 'L-7731' AS load_id FROM staging.pedidos WHERE fecha = '2026-10-28'", 4);
    add('INFO', 'sql.py:427', 'Rows affected: 18432', 1);
    add('INFO', 'sql.py:430', 'COMMIT enviado; esperando confirmación del servidor...', 1795);
    add('ERROR', 'taskinstance.py:2905', 'Task failed with exception');
    L.push('airflow.exceptions.AirflowTaskTimeout: Timeout, PID: 48812 (execution_timeout=0:30:00)');
    add('INFO', 'taskinstance.py:1206', 'Marking task as UP_FOR_RETRY. dag_id=pedidos, task_id=cargar_fct_pedidos, logical_date=20261028T020000', 300);
    add('INFO', 'taskinstance.py:1359', 'Starting attempt 2 of 3');
    add('INFO', 'sql.py:418', "Running statement: INSERT INTO dw.fct_pedidos SELECT *, 'L-7732' AS load_id FROM staging.pedidos WHERE fecha = '2026-10-28'", 3);
    add('INFO', 'sql.py:427', 'Rows affected: 18432');
    add('INFO', 'sql.py:430', 'COMMIT confirmado en 0.4 s');
    add('INFO', 'taskinstance.py:1400', 'Marking task as SUCCESS. dag_id=pedidos, task_id=cargar_fct_pedidos, logical_date=20261028T020000');
    f['logs/cargar_fct_pedidos.log'] = L.join('\n') + '\n';
    f['logs/postgres.log'] = [
      '2026-10-29 02:00:09 UTC [48813] LOG:  duration: 3.912 s  statement: INSERT INTO dw.fct_pedidos SELECT ... (L-7731)',
      '2026-10-29 02:00:10 UTC [48813] LOG:  could not send data to client: Connection reset by peer',
      '2026-10-29 02:00:10 UTC [48813] LOG:  transaction committed: xid 99120331',
      '2026-10-29 02:35:07 UTC [49002] LOG:  duration: 3.004 s  statement: INSERT INTO dw.fct_pedidos SELECT ... (L-7732)',
      '2026-10-29 02:35:08 UTC [49002] LOG:  transaction committed: xid 99124910',
      '',
    ].join('\n');
    const ped = ['pedido_id,cliente_id,monto,load_id'];
    for (let k = 1; k <= 60; k++) {
      const id = 880000 + k, cli = 1000 + Math.floor(r() * 400), monto = (20 + r() * 300).toFixed(2);
      ped.push(`${id},${cli},${monto},L-7731`);
      if (k % 3 !== 0) ped.push(`${id},${cli},${monto},L-7732`);
    }
    f['muestra_fct_pedidos.csv'] = ped.join('\n') + '\n';
    return f;
  };

  // ---------------------------------------------------------------- 04: schema drift
  INCIDENTES.schema = () => {
    const r = prng(404);
    const f = {};
    const v1 = [], v2 = [];
    for (let k = 0; k < 4; k++) v1.push({ payment_id: 'pay_' + (5000 + k), order_id: 7000 + k, amount: +(15 + r() * 200).toFixed(2), status: ['PAID', 'PAID', 'REFUNDED', 'PAID'][k], created_at: `2026-10-27T1${k}:2${k}:00Z` });
    for (let k = 0; k < 4; k++) v2.push({ payment_id: 'pay_' + (6000 + k), order_id: 7100 + k, amount_cents: Math.round((15 + r() * 200) * 100), currency: 'USD', status: ['PAID', 'PENDING_REVIEW', 'PAID', 'PAID'][k], created_at: `2026-10-28T1${k}:0${k}:00Z` });
    f['muestra_pagos_2026-10-27.json'] = JSON.stringify(v1, null, 2) + '\n';
    f['muestra_pagos_2026-10-28.json'] = JSON.stringify(v2, null, 2) + '\n';
    const L = [];
    let s = 0; const base = '2026-10-29T01:10:00Z';
    const add = (lvl, msg, salto = 1) => { L.push(`${hora(base, s)} ${lvl.padEnd(5)} ingesta_pagos  ${msg}`); s += salto; };
    add('INFO', 'Leyendo s3://lago/raw/pagos/ds=2026-10-28/ (14 archivos, 212.448 registros)');
    add('INFO', 'Esquema esperado (contrato v3): payment_id STRING, order_id BIGINT, amount DECIMAL(12,2), status STRING, created_at TIMESTAMP');
    for (let k = 0; k < 14; k++) {
      add('WARN', `archivo part-${String(k).padStart(4, '0')}.json: columna "amount" no existe; se completa con NULL (modo PERMISSIVE)`);
      add('WARN', `archivo part-${String(k).padStart(4, '0')}.json: columnas desconocidas ignoradas: amount_cents, currency`);
    }
    add('INFO', 'Valores de status fuera del dominio esperado: PENDING_REVIEW (18.204 registros) -> se cargan igual');
    add('INFO', 'Escribiendo staging.pagos ds=2026-10-28: 212448 filas');
    add('INFO', 'Fin OK en 41 s');
    f['logs/ingesta_pagos.log'] = L.join('\n') + '\n';
    f['changelog_api_pagos.md'] = [
      '# Changelog API de pagos (equipo Payments)',
      '',
      '## v4.0.0 - 2026-10-27 (deploy 2026-10-28 00:30 UTC)',
      '- BREAKING: `amount` (decimal, unidades) se reemplaza por `amount_cents` (entero, centavos).',
      '- Nuevo campo `currency` (ISO 4217). Hasta ahora todo era USD implícito.',
      '- Nuevo estado `PENDING_REVIEW` para pagos retenidos por antifraude (antes eran PAID y luego se revertían).',
      '- Aviso publicado en #payments-anuncios el 2026-10-20.',
      '',
    ].join('\n');
    return f;
  };

  // ---------------------------------------------------------------- 05: datos tardíos o faltantes
  INCIDENTES.tardios = () => {
    const r = prng(505);
    const f = {};
    const ls = [];
    for (let h = 0; h < 24; h++) {
      if (h === 14) continue;
      const tam = h === 15 ? 0 : Math.round((h < 7 ? 9 : 31) * 1024 * 1024 * (0.8 + r() * 0.4));
      const llegada = h === 15 ? '2026-10-28 16:02' : h === 16 ? '2026-10-28 19:41' : `2026-10-28 ${p2(h + 1)}:${p2(3 + Math.floor(r() * 9))}`;
      ls.push(`${llegada}  ${String(tam).padStart(10)}  s3://lago/raw/clicks/fecha=2026-10-28/hora=${p2(h)}/clicks.json.gz`);
    }
    f['listado_clicks.txt'] = ls.join('\n') + '\n';
    const L = [];
    let s = 0; const base = '2026-10-28T16:05:00Z';
    for (let k = 0; k < 24; k++) { L.push(af(hora(base, s), 'INFO', 's3_key_sensor.py:112', `Poking for key : s3://lago/raw/clicks/fecha=2026-10-28/hora=14/_SUCCESS (intento ${k + 1})`)); s += 300; }
    L.push(af(hora(base, s), 'ERROR', 'taskinstance.py:2905', 'Task failed with exception'));
    L.push('airflow.exceptions.AirflowSensorTimeout: Sensor has timed out; run duration of 7200.4 seconds exceeds the specified timeout of 7200.0.');
    L.push(af(hora(base, s + 1), 'INFO', 'taskinstance.py:1206', 'Immediate failure requested. Marking task as FAILED. dag_id=clicks_horario, task_id=esperar_hora_14 (sensor mode=poke, ocupó un slot del worker durante 2 h)'));
    f['logs/esperar_hora_14.log'] = L.join('\n') + '\n';
    f['incremental.sql'] = [
      '-- Carga incremental de eventos (corre cada hora)',
      'INSERT INTO dw.eventos',
      'SELECT * FROM staging.eventos',
      "WHERE evento_ts > (SELECT max(evento_ts) FROM dw.eventos);   -- marca de agua = último evento cargado",
      '',
    ].join('\n');
    return f;
  };

  // ---------------------------------------------------------------- 06: Airflow
  INCIDENTES.airflow = () => {
    const r = prng(606);
    const f = {};
    const L = [];
    let s = 0; const base = '2026-10-29T00:00:00Z';
    const dags = ['ventas_diarias', 'clientes_scd2', 'clicks_horario', 'finanzas_cierre', 'ml_features', 'reportes_gerencia'];
    for (let k = 0; k < 320; k++) {
      const d = dags[Math.floor(r() * dags.length)];
      const t = hora(base, s); s += 20 + Math.floor(r() * 90);
      const x = r();
      if (k === 40) { L.push(`[${t}] {dagbag.py:368} ERROR - Failed to import: /opt/airflow/dags/finanzas_cierre.py`); L.push('ModuleNotFoundError: No module named \'pandas_gbq\''); continue; }
      if (k > 200 && k % 17 === 0) { L.push(`[${t}] {scheduler_job_runner.py:1786} ERROR - Detected zombie job: {'full_filepath': '/opt/airflow/dags/ml_features.py', 'msg': "{'DAG Id': 'ml_features', 'Task Id': 'construir_features', 'Run Id': 'scheduled__2026-10-28T00:00:00+00:00', 'Hostname': 'airflow-worker-2'}", 'simple_task_instance': '<TaskInstance: ml_features.construir_features [running]>', 'is_failure_callback': True} (See https://airflow.apache.org/docs/apache-airflow/stable/core-concepts/tasks.html#zombie-undead-tasks)`); continue; }
      if (k > 120 && k < 180 && x < 0.35) { L.push(`[${t}] {base_executor.py:217} WARNING - Pool default_pool has 0 open slots; task ${d}.tarea_${Math.floor(r() * 9)} queued for ${Math.floor(300 + r() * 1500)} s`); continue; }
      if (x < 0.05) { L.push(`[${t}] {taskinstance.py:2905} ERROR - ${d}: Dependencies not met: Task's trigger rule 'all_success' requires all upstream tasks to have succeeded, but found 1 non-success(es). upstream_states=_UpstreamTIStates(success=2, failed=1)`); continue; }
      L.push(`[${t}] {scheduler_job_runner.py:${700 + Math.floor(r() * 200)}} INFO - DAG ${d} run scheduled__2026-10-28 -> ${x < 0.5 ? 'queued' : 'running'}`);
    }
    f['logs/scheduler.log'] = L.join('\n') + '\n';
    f['logs/worker-2.log'] = [
      '[2026-10-29 04:11:02,118] {taskinstance.py:1380} INFO - Executing <Task(PythonOperator): construir_features> on 2026-10-28',
      '[2026-10-29 04:11:03,004] {features.py:30} INFO - Leyendo eventos de 90 días con pandas.read_sql (sin chunksize)',
      '[2026-10-29 04:19:47,551] {features.py:31} INFO - 38.112.904 filas leídas; construyendo DataFrame',
      '[2026-10-29 04:22:10,900] {local_task_job.py:228} INFO - Task exited with return code Negsignal.SIGKILL',
      'kernel: [883201.112] Out of memory: Killed process 48120 (airflow task ru) total-vm:17012344kB, anon-rss:15980012kB',
      '[2026-10-29 04:22:11,002] {local_task_job.py:236} WARNING - Heartbeat time limit exceeded; the task process is gone',
      '',
    ].join('\n');
    f['dags/clicks_horario.py'] = [
      'from airflow.sdk import DAG',
      'from airflow.providers.amazon.aws.sensors.s3 import S3KeySensor',
      'import pendulum',
      '',
      'with DAG(',
      '    dag_id="clicks_horario",',
      '    schedule="@hourly",',
      '    start_date=pendulum.datetime(2025, 1, 1, tz="UTC"),',
      '    catchup=True,             # <- al reactivar el DAG crea una ejecución por cada hora pendiente',
      '    max_active_runs=64,',
      ') as dag:',
      '    esperar = S3KeySensor(',
      '        task_id="esperar_archivo",',
      '        bucket_key="s3://lago/raw/clicks/fecha={{ ds }}/hora={{ logical_date.hour }}/_SUCCESS",',
      '        mode="poke",          # ocupa un slot del worker mientras espera',
      '        poke_interval=30,',
      '        timeout=60 * 60 * 24, # 24 h',
      '    )',
      '',
    ].join('\n');
    return f;
  };

  // ---------------------------------------------------------------- 07: Spark
  INCIDENTES.spark = () => {
    const r = prng(707);
    const f = {};
    const tareas = ['task_id,particion,duracion_s,shuffle_read_mb,spill_disco_mb,executor'];
    for (let k = 0; k < 200; k++) {
      let dur = Math.round(38 + r() * 30), mb = Math.round(110 + r() * 60), spill = 0;
      if (k === 137) { dur = 2710; mb = 9416; spill = 21890; }
      if (k === 52) { dur = 412; mb = 1210; spill = 1530; }
      tareas.push(`${k},${k},${dur},${mb},${spill},${1 + (k % 20)}`);
    }
    f['stage_14_tareas.csv'] = tareas.join('\n') + '\n';
    f['logs/driver.log'] = [
      '26/10/29 05:02:11 INFO DAGScheduler: Submitting 200 missing tasks from ShuffleMapStage 14 (join pedidos-clientes)',
      '26/10/29 05:05:40 INFO TaskSetManager: Finished task 199.0 in stage 14.0 (TID 3211) in 41 s on 10.0.3.18 (executor 20) (199/200)',
      '26/10/29 05:44:02 WARN TaskSetManager: Lost task 137.0 in stage 14.0 (TID 3149) (10.0.3.11 executor 18): ExecutorLostFailure (executor 18 exited caused by one of the running tasks) Reason: Container killed by YARN for exceeding physical memory limits. 18.4 GB of 18 GB physical memory used. Consider boosting spark.executor.memoryOverhead.',
      '26/10/29 05:44:05 INFO TaskSetManager: Starting task 137.1 in stage 14.0 (TID 3212) (10.0.3.7, executor 21)',
      '26/10/29 06:20:40 WARN TaskSetManager: Lost task 137.1 in stage 14.0 (TID 3212): java.lang.OutOfMemoryError: Java heap space',
      '26/10/29 06:20:41 WARN TaskSetManager: Lost task 88.0 in stage 15.0: FetchFailed(BlockManagerId(18, 10.0.3.11, 7337), shuffleId=6, mapIndex=137) org.apache.spark.shuffle.FetchFailedException: Failed to connect to /10.0.3.11:7337',
      '26/10/29 06:20:41 INFO DAGScheduler: Resubmitting ShuffleMapStage 14 (join pedidos-clientes) due to fetch failure',
      '26/10/29 06:58:13 ERROR TaskSetManager: Task 137 in stage 14.0 failed 4 times; aborting job',
      '26/10/29 06:58:13 ERROR FileFormatWriter: Aborting job 7f1c2e.',
      'org.apache.spark.SparkException: Job aborted due to stage failure: Task 137 in stage 14.0 failed 4 times, most recent failure: java.lang.OutOfMemoryError: Java heap space',
      '',
    ].join('\n');
    f['config_job.txt'] = [
      'spark.executor.memory=16g',
      'spark.executor.memoryOverhead=2g',
      'spark.sql.shuffle.partitions=200',
      'spark.sql.adaptive.enabled=false',
      'spark.sql.autoBroadcastJoinThreshold=-1',
      'spark.dynamicAllocation.enabled=true',
      '# workers spot: sí',
      '',
    ].join('\n');
    const claves = ['cliente_id,filas'];
    claves.push('0,41208774');
    for (let k = 0; k < 40; k++) claves.push(`${100000 + Math.floor(r() * 899999)},${Math.round(40 + r() * 900)}`);
    f['top_claves_join.csv'] = claves.join('\n') + '\n';
    const arch = [];
    for (let k = 0; k < 900; k++) {
      const tam = k < 860 ? Math.round(20 + r() * 900) * 1024 : Math.round(90 + r() * 60) * 1024 * 1024;
      arch.push(`${String(tam).padStart(12)}  s3://lago/silver/eventos/fecha=2026-10-28/part-${String(k).padStart(5, '0')}.snappy.parquet`);
    }
    f['listado_eventos.txt'] = arch.join('\n') + '\n';
    return f;
  };

  // ---------------------------------------------------------------- 08: fechas, zonas horarias y codificación
  INCIDENTES.zonas = () => {
    const f = {};
    const filas = ['﻿venta_id,tienda,ts_local,monto'];
    const tiendas = ['Bogotá', 'Medellín', 'Ciudad de México', 'São Paulo'];
    const r = prng(808);
    for (let k = 1; k <= 40; k++) {
      let t = tiendas[k % 4];
      if (k > 30) t = t.replace('á', 'Ã¡').replace('í', 'Ã­').replace('é', 'Ã©').replace('ã', 'Ã£');
      const h = k <= 20 ? `2026-10-31 23:${p2(10 + k)}` : `2026-11-01 0${k % 3}:${p2(k)}`;
      filas.push(`${k},${t},${h},${(10 + r() * 90).toFixed(2)}`);
    }
    f['ventas_tienda.csv'] = filas.join('\n') + '\n';
    f['logs/carga_nyc.log'] = [
      '2026-11-01 07:05:01 INFO  carga_eventos_nyc  ventana local [2026-11-01 00:00, 2026-11-02 00:00) America/New_York',
      '2026-11-01 07:05:01 INFO  convierte a UTC: [2026-11-01 04:00, 2026-11-02 05:00)  -> 25 horas (fin del horario de verano)',
      '2026-11-01 07:05:09 WARN  ts_local "2026-11-01 01:30:00" es ambiguo (ocurre dos veces); política actual: primera ocurrencia (EDT)',
      '2026-11-01 07:05:09 WARN  1.882 eventos con hora local ambigua entre 01:00 y 02:00',
      '2026-11-01 07:05:12 INFO  clave primaria (sensor_id, ts_local): 1.882 conflictos -> ON CONFLICT DO NOTHING',
      '2026-11-01 07:05:13 INFO  Fin OK: 44.118 filas',
      '',
    ].join('\n');
    return f;
  };

  // ---------------------------------------------------------------- 09: Kafka y streaming
  INCIDENTES.kafka = () => {
    const r = prng(909);
    const f = {};
    const g = ['GROUP           TOPIC           PARTITION  CURRENT-OFFSET  LOG-END-OFFSET  LAG       CONSUMER-ID                                   HOST          CLIENT-ID'];
    for (let p = 0; p < 12; p++) {
      const fin = 4800000 + Math.floor(r() * 30000);
      let lag = Math.floor(r() * 120), cons = `consumer-pedidos-${p % 4}-${'abcd'[p % 4]}91f`, host = `/10.0.4.${11 + (p % 4)}`;
      if (p === 7) { lag = 1288412; }
      if (p === 10 || p === 11) { lag = 402000 + Math.floor(r() * 3000); cons = '-'; host = '-'; }
      g.push(`pedidos-sink    pedidos         ${String(p).padEnd(10)} ${String(fin - lag).padEnd(15)} ${String(fin).padEnd(15)} ${String(lag).padEnd(9)} ${cons.padEnd(45)} ${host.padEnd(13)} ${cons === '-' ? '-' : 'sink'}`);
    }
    f['consumer_group.txt'] = g.join('\n') + '\n';
    const L = [];
    let s = 0; const base = '2026-10-29T03:00:00Z';
    for (let k = 0; k < 260; k++) {
      const t = hora(base, s); s += 5 + Math.floor(r() * 40);
      const x = r();
      if (k % 9 === 4) { L.push(`${t} ERROR [consumer-pedidos-3] Error deserializando el registro en pedidos-7 offset 3511588: org.apache.kafka.common.errors.SerializationException: Unknown magic byte!`); L.push(`${t} WARN  [consumer-pedidos-3] Reintentando el lote desde offset 3511588 (no se confirma el offset)`); continue; }
      if (x < 0.06) { L.push(`${t} WARN  [consumer-pedidos-1] consumer poll timeout has expired. This means the time between subsequent calls to poll() was longer than the configured max.poll.interval.ms, which typically implies that the poll loop is spending too much time processing messages.`); continue; }
      if (x < 0.12) { L.push(`${t} INFO  [consumer-pedidos-1] Attempt to heartbeat failed since group is rebalancing`); continue; }
      L.push(`${t} INFO  [consumer-pedidos-${Math.floor(r() * 4)}] Lote procesado: ${Math.floor(200 + r() * 300)} registros en ${Math.floor(800 + r() * 4000)} ms`);
    }
    f['logs/consumer.log'] = L.join('\n') + '\n';
    f['consumer.properties'] = [
      'group.id=pedidos-sink',
      'enable.auto.commit=false',
      'max.poll.records=500',
      'max.poll.interval.ms=300000',
      'session.timeout.ms=45000',
      'partition.assignment.strategy=org.apache.kafka.clients.consumer.RangeAssignor',
      '# por cada registro: una llamada HTTP a la API de enriquecimiento (~700 ms) y un INSERT individual en Postgres',
      '',
    ].join('\n');
    return f;
  };

  // ---------------------------------------------------------------- 10: lakehouse (Delta)
  INCIDENTES.delta = () => {
    const f = {};
    const h = [
      { version: 44, timestamp: '2026-10-29T06:10:02Z', userName: 'job:clientes_merge', operation: 'MERGE', operationMetrics: { numTargetRowsUpdated: '1204', numTargetRowsInserted: '88', numTargetRowsDeleted: '0' } },
      { version: 43, timestamp: '2026-10-29T02:31:47Z', userName: 'ana.perez@empresa.com', operation: 'VACUUM END', operationMetrics: { numDeletedFiles: '3120' } },
      { version: 42, timestamp: '2026-10-29T02:31:10Z', userName: 'ana.perez@empresa.com', operation: 'VACUUM START', operationParameters: { retentionCheckEnabled: 'false', specifiedRetentionMillis: '0' } },
      { version: 41, timestamp: '2026-10-28T23:58:40Z', userName: 'job:clientes_merge', operation: 'WRITE', operationParameters: { mode: 'Overwrite' }, operationMetrics: { numOutputRows: '1412', numFiles: '1' } },
      { version: 40, timestamp: '2026-10-28T06:09:55Z', userName: 'job:clientes_merge', operation: 'MERGE', operationMetrics: { numTargetRowsUpdated: '1170', numTargetRowsInserted: '93', numTargetRowsDeleted: '0' } },
      { version: 39, timestamp: '2026-10-27T06:10:11Z', userName: 'job:clientes_merge', operation: 'MERGE', operationMetrics: { numTargetRowsUpdated: '1188', numTargetRowsInserted: '71', numTargetRowsDeleted: '0' } },
    ];
    f['historial_dim_clientes.json'] = JSON.stringify(h, null, 2) + '\n';
    f['logs/clientes_merge.log'] = [
      '2026-10-28 23:51:02 INFO  clientes_merge  lote correctivo manual (parámetro modo=overwrite pasado por error en la consola)',
      '2026-10-28 23:58:40 INFO  escrito main.crm.dim_clientes: 1412 filas (antes: 1.204.880)',
      '2026-10-29 06:09:40 ERROR clientes_merge  [DELTA_CONCURRENT_APPEND] ConcurrentAppendException: Files were added to the root of the table by a concurrent update. Please try the operation again.',
      '2026-10-29 06:09:40 INFO  conflicto con: job:clientes_backfill (escribe en la misma tabla sin filtro de partición)',
      '2026-10-29 06:10:02 INFO  reintento 1: OK',
      '2026-10-29 06:15:30 ERROR tablero_clientes  [DELTA_SCHEMA_MISMATCH] A schema mismatch detected when writing to the Delta table. Table schema: segmento STRING; Data schema: segmento_cliente STRING. To enable schema migration using DataFrameWriter or DataStreamWriter, please set: \'.option("mergeSchema", "true")\'',
      '2026-10-29 07:40:12 ERROR soporte  RESTORE TABLE main.crm.dim_clientes TO VERSION AS OF 40 -> [DELTA_FILE_NOT_FOUND_DETAILED] File part-00007-a1b2.snappy.parquet referenced in the transaction log cannot be found. This occurs when data has been manually deleted from the file system rather than using the table DELETE statement (o por un VACUUM con retención 0).',
      '',
    ].join('\n');
    return f;
  };

  // ---------------------------------------------------------------- 11: APIs, credenciales y costos
  INCIDENTES.api = () => {
    const r = prng(1111);
    const f = {};
    const L = [];
    let s = 0; const base = '2026-10-29T01:00:00Z';
    L.push(`${hora(base, s)} INFO  extractor_crm  GET /v2/contacts?updated_since=2026-10-28T00:00:00Z&limit=500  total_count=21480`);
    for (let p = 1; p <= 43; p++) {
      s += 2 + Math.floor(r() * 3);
      if (p >= 18 && p <= 23) { L.push(`${hora(base, s)} WARN  extractor_crm  página ${p}: HTTP 429 Too Many Requests  Retry-After: 30  (reintento inmediato)`); }
      if (p === 24) { L.push(`${hora(base, s)} ERROR extractor_crm  página ${p}: HTTP 429 Too Many Requests tras 5 reintentos; se omite la página y se sigue con next_cursor`); continue; }
      if (p === 31) { L.push(`${hora(base, s)} ERROR extractor_crm  página ${p}: HTTP 401 Unauthorized {"error":"invalid_token","error_description":"The access token expired"}`); L.push(`${hora(base, s)} WARN  extractor_crm  next_cursor=null tras el error: se asume fin de la paginación`); break; }
      L.push(`${hora(base, s)} INFO  extractor_crm  página ${p}: HTTP 200  500 registros  next_cursor=c${p + 1}`);
    }
    L.push(`${hora(base, s + 1)} INFO  extractor_crm  Fin OK: 14500 registros escritos en raw.crm_contacts ds=2026-10-28`);
    f['logs/extractor_crm.log'] = L.join('\n') + '\n';
    f['secretos.csv'] = ['nombre,tipo,dueño,vence_utc', 'crm-api-token,oauth_client_secret,juan.diaz (se fue de la empresa),2026-10-29 01:30', 'erp-sftp-key,ssh_key,svc_datos,2027-03-01 00:00', 'snowflake-svc,key_pair,svc_datos,2026-11-04 00:00', 'stripe-readonly,api_key,payments,2027-01-15 00:00', 'gcs-sa-key,service_account_key,svc_datos,2026-11-02 00:00'].join('\n') + '\n';
    const jobs = ['job_id,usuario,origen,bytes_facturados,duracion_s,consulta'];
    for (let k = 0; k < 60; k++) {
      let b = Math.round((50 + r() * 900) * 1024 * 1024), u = ['svc_dbt', 'svc_airflow', 'ana.perez', 'luis.gomez'][k % 4], o = u.startsWith('svc') ? 'pipeline' : 'consola', q = 'SELECT ... WHERE fecha = @ds';
      if (k % 6 === 5) { b = Math.round(4.2 * 1024 ** 4 + r() * 1e9); u = 'looker_svc'; o = 'tablero ventas (refresco cada 15 min)'; q = 'SELECT * FROM eventos_crudos'; }
      jobs.push(`bqjob_${1000 + k},${u},${o},${b},${Math.round(2 + r() * 60)},${q}`);
    }
    f['bq_jobs_ayer.csv'] = jobs.join('\n') + '\n';
    return f;
  };

  // ---------------------------------------------------------------- 12: simulacro (varios incidentes a la vez)
  INCIDENTES.simulacro = () => {
    const f = {};
    f['alertas.txt'] = [
      '07:02  [SEV3] disco_airflow_worker      /var/lib/airflow en worker-1 al 81 %',
      '07:05  [SEV2] frescura_fct_pedidos      última carga 2026-10-28 03:10, SLA 6 h vencido hace 22 min',
      '07:06  [SEV1] pagos_duplicados          fct_pagos: 3.3 % de payment_id repetidos; Finanzas cierra el mes HOY a las 12:00',
      '07:09  [SEV4] latencia_api_pagos        p95 = 1.9 s (umbral 1.5 s), se resolvió sola 4 veces esta semana',
      '07:11  [SEV2] lag_kafka_clicks          lag 2.1 M mensajes, creciendo 40 k/min',
      '',
    ].join('\n');
    f['logs/pagos.log'] = [
      '2026-10-29 05:00:03 INFO  cargar_fct_pagos  attempt 1: INSERT ... 41.220 filas',
      '2026-10-29 05:00:09 ERROR cargar_fct_pagos  psycopg2.OperationalError: server closed the connection unexpectedly',
      '2026-10-29 05:05:10 INFO  cargar_fct_pagos  attempt 2: INSERT ... 41.220 filas -> COMMIT OK',
      '2026-10-29 05:05:11 INFO  postgres: el COMMIT del attempt 1 se había aplicado antes de cortar la conexión',
      '',
    ].join('\n');
    f['logs/pedidos.log'] = [
      '2026-10-29 03:10:02 INFO  cargar_fct_pedidos  esperando staging.pedidos ds=2026-10-28',
      '2026-10-29 05:10:02 ERROR cargar_fct_pedidos  AirflowSensorTimeout: Sensor has timed out (7200 s)',
      '2026-10-29 05:10:03 INFO  upstream: el DAG erp_extract falló a las 02:58 con "SFTP authentication failed for user svc_datos"',
      '',
    ].join('\n');
    f['timeline_plantilla.md'] = [
      '# Postmortem: <título>',
      '',
      '| Hora (UTC) | Qué pasó | Quién |',
      '|---|---|---|',
      '| | Detección: | |',
      '| | Mitigación: | |',
      '| | Resolución: | |',
      '',
      '## Impacto (usuarios, datos, dinero, duración)',
      '## Causa raíz (5 porqués, sin culpables)',
      '## Qué funcionó / qué no',
      '## Acciones (dueño + fecha): prevenir, detectar antes, mitigar más rápido',
      '',
    ].join('\n');
    return f;
  };

  const DESCRIPCION = {
    'primer-dia': 'tablero sin datos con todas las tareas en verde',
    monitoreo: 'métricas de tablas, checks y alertas ruidosas',
    duplicados: 'reintento después de un timeout que duplicó la carga',
    schema: 'la API de pagos cambió su esquema sin aviso efectivo',
    tardios: 'una hora que no llegó y un sensor que se agotó',
    airflow: 'zombies, OOM, pools llenos e import errors',
    spark: 'una partición gigante que mata executors',
    zonas: 'cambio de horario, BOM y mojibake',
    kafka: 'lag, mensajes venenosos y rebalanceos',
    delta: 'overwrite por error, VACUUM y RESTORE que falla',
    api: 'rate limit, token vencido y una consulta que cuesta miles',
    simulacro: 'cinco alertas a la vez: prioriza y coordina',
  };

  def('incidente-preparar', 'Prepara los archivos de un incidente del módulo de guardia: incidente-preparar <id>', (a) => {
    const id = a[0];
    if (!id || !INCIDENTES[id]) return (id ? fail : ok)(`${id ? `No existe el incidente "${id}".\n` : ''}Uso: incidente-preparar <id>\n\n` + Object.keys(INCIDENTES).map((k) => `  ${k.padEnd(12)} ${DESCRIPCION[k]}`).join('\n'));
    const dir = `${HOME}/incidentes/${id}`;
    const archivos = INCIDENTES[id]();
    for (const [ruta, contenido] of Object.entries(archivos)) writeFile(`${dir}/${ruta}`, contenido);
    Machine.save();
    return ok(`Incidente "${id}" listo en ~/incidentes/${id}/:\n` + Object.keys(archivos).map((r) => '  ' + r).join('\n') + '\n\nEmpieza con: cd ~/incidentes/' + id + ' && ls');
  });

  Sh.Incidentes = { INCIDENTES, awkCompilar };
})();
