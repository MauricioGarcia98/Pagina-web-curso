/*
 * Terraform simulado para la terminal del curso.
 * Lee de verdad los archivos .tf de la carpeta actual (HCL: bloques, expresiones, interpolación,
 * variables, locals, outputs, count, for_each, módulos locales), calcula el plan comparando con el
 * estado (terraform.tfstate o un backend remoto en un bucket simulado) y, al aplicar, crea los recursos
 * en los simuladores de AWS, Google Cloud, Azure y Databricks: lo que creas con Terraform aparece en
 * `aws s3 ls`, `gcloud storage ls`, `az group list`, etc.
 */
(function () {
  'use strict';
  const Sh = window.Shell;
  const { def, col, ok, Machine } = Sh;
  const fail = (m, code = 1) => ({ out: m, code });
  const now = () => new Date().toISOString().replace(/\.\d+Z$/, 'Z');
  const uid = (n = 8) => Array.from({ length: n }, () => 'abcdef0123456789'[Math.floor(Math.random() * 16)]).join('');

  // ======================================================================= HCL: lexer
  class ErrorHCL extends Error { constructor(msg, file, line) { super(msg); this.file = file; this.line = line; } }

  function lex(src, file) {
    const toks = [];
    let i = 0, line = 1;
    const push = (t, v, extra) => toks.push(Object.assign({ t, v, line, file }, extra || {}));
    while (i < src.length) {
      const c = src[i];
      if (c === '\n') { push('nl'); line++; i++; continue; }
      if (c === ' ' || c === '\t' || c === '\r') { i++; continue; }
      if (c === '#' || (c === '/' && src[i + 1] === '/')) { while (i < src.length && src[i] !== '\n') i++; continue; }
      if (c === '/' && src[i + 1] === '*') { const j = src.indexOf('*/', i + 2); const chunk = src.slice(i, j < 0 ? src.length : j + 2); line += (chunk.match(/\n/g) || []).length; i = j < 0 ? src.length : j + 2; continue; }
      if (c === '<' && src[i + 1] === '<') {
        const m = src.slice(i).match(/^<<(-?)([A-Za-z_]\w*)[ \t]*\n/);
        if (m) {
          const marca = m[2];
          let j = i + m[0].length; const lineas = [];
          while (j < src.length) {
            const fin = src.indexOf('\n', j); const l = src.slice(j, fin < 0 ? src.length : fin);
            j = fin < 0 ? src.length : fin + 1;
            if (l.trim() === marca) break;
            lineas.push(l);
          }
          let texto = lineas.join('\n') + '\n';
          if (m[1]) { const ind = Math.min(...lineas.filter((l) => l.trim()).map((l) => l.match(/^\s*/)[0].length)); texto = lineas.map((l) => l.slice(ind)).join('\n') + '\n'; }
          push('str', plantilla(texto, file, line));
          line += lineas.length + 1; i = j; continue;
        }
      }
      if (c === '"') {
        let j = i + 1, raw = '', prof = 0;
        while (j < src.length) {
          const d = src[j];
          if (prof === 0 && d === '"') break;
          if (d === '\\' && prof === 0) { const e = src[j + 1]; raw += e === 'n' ? '\n' : e === 't' ? '\t' : e === '"' ? '"' : e === '\\' ? '\\' : '\\' + e; j += 2; continue; }
          if (d === '$' && src[j + 1] === '{') { prof++; raw += '${'; j += 2; continue; }
          if (prof && d === '{') prof++;
          if (prof && d === '}') prof--;
          if (d === '\n') throw new ErrorHCL('Unterminated template string', file, line);
          raw += d; j++;
        }
        if (j >= src.length) throw new ErrorHCL('Unterminated template string', file, line);
        push('str', plantilla(raw, file, line)); i = j + 1; continue;
      }
      const dos = src.slice(i, i + 2);
      if (['==', '!=', '<=', '>=', '&&', '||', '=>'].includes(dos)) { push('op', dos); i += 2; continue; }
      if (src.slice(i, i + 3) === '...') { push('op', '...'); i += 3; continue; }
      if ('{}[]()=,.:?!<>+-*/%'.includes(c)) { push('op', c); i++; continue; }
      if (/[0-9]/.test(c)) { const m = src.slice(i).match(/^\d+(\.\d+)?([eE][+-]?\d+)?/); push('num', Number(m[0])); i += m[0].length; continue; }
      if (/[A-Za-z_]/.test(c)) { const m = src.slice(i).match(/^[A-Za-z_][\w-]*/); push('id', m[0]); i += m[0].length; continue; }
      throw new ErrorHCL(`Invalid character "${c}"`, file, line);
    }
    push('eof');
    return toks;
  }

  // "texto ${expr} texto" -> { partes: [texto | ast] }
  function plantilla(raw, file, line) {
    const partes = [];
    let i = 0, buf = '';
    while (i < raw.length) {
      if (raw[i] === '$' && raw[i + 1] === '$' && raw[i + 2] === '{') { buf += '${'; i += 3; continue; }
      if (raw[i] === '$' && raw[i + 1] === '{') {
        let j = i + 2, prof = 1;
        while (j < raw.length && prof) { if (raw[j] === '{') prof++; else if (raw[j] === '}') prof--; j++; }
        if (buf) { partes.push(buf); buf = ''; }
        const toks = lex(raw.slice(i + 2, j - 1), file).map((t) => Object.assign(t, { line }));
        const p = new Parser(toks);
        partes.push(p.expr());
        i = j; continue;
      }
      buf += raw[i++];
    }
    if (buf || !partes.length) partes.push(buf);
    return { partes };
  }

  // ======================================================================= HCL: parser
  class Parser {
    constructor(toks) { this.toks = toks; this.i = 0; }
    get cur() { return this.toks[this.i]; }
    sk() { while (this.cur.t === 'nl') this.i++; }
    es(t, v) { const c = this.cur; return c.t === t && (v === undefined || c.v === v); }
    come(t, v) {
      const c = this.cur;
      if (!this.es(t, v)) throw new ErrorHCL(`Unexpected ${c.t === 'eof' ? 'end of file' : `"${c.v ?? c.t}"`}${v ? `, expected "${v}"` : ''}`, c.file, c.line);
      this.i++; return c;
    }
    cuerpo(hastaLlave) {
      const items = [];
      for (;;) {
        this.sk();
        if (hastaLlave && this.es('op', '}')) return items;
        if (this.es('eof')) { if (hastaLlave) throw new ErrorHCL('Unclosed configuration block: falta una "}"', this.cur.file, this.cur.line); return items; }
        const nom = this.come('id');
        if (this.es('op', '=')) {
          this.i++;
          const e = this.expr();
          items.push({ k: 'attr', nombre: nom.v, expr: e, line: nom.line, file: nom.file });
          if (!this.es('nl') && !this.es('eof') && !this.es('op', '}')) throw new ErrorHCL('Missing newline after argument', this.cur.file, this.cur.line);
          continue;
        }
        const etiquetas = [];
        while (this.es('str') || this.es('id')) {
          const t = this.cur; this.i++;
          etiquetas.push(t.t === 'str' ? t.v.partes.join('') : t.v);
        }
        if (!this.es('op', '{')) throw new ErrorHCL(`Unsupported argument or block: falta "=" o "{" después de "${nom.v}"`, nom.file, nom.line);
        this.i++;
        const body = this.cuerpo(true);
        this.come('op', '}');
        items.push({ k: 'block', tipo: nom.v, etiquetas, body, line: nom.line, file: nom.file });
      }
    }
    // ---- expresiones (por precedencia)
    expr() {
      const c = this.or();
      if (this.es('op', '?')) { this.i++; this.skn(); const a = this.expr(); this.skn(); this.come('op', ':'); this.skn(); const b = this.expr(); return { e: 'cond', c, a, b }; }
      return c;
    }
    skn() { if (this.dentro) this.sk(); }
    bin(sig, ops) {
      let l = sig();
      while (this.es('op') && ops.includes(this.cur.v)) { const op = this.cur.v; this.i++; this.skn(); l = { e: 'bin', op, l, r: sig() }; }
      return l;
    }
    or() { return this.bin(() => this.and(), ['||']); }
    and() { return this.bin(() => this.igual(), ['&&']); }
    igual() { return this.bin(() => this.comp(), ['==', '!=']); }
    comp() { return this.bin(() => this.suma(), ['<', '>', '<=', '>=']); }
    suma() { return this.bin(() => this.mult(), ['+', '-']); }
    mult() { return this.bin(() => this.unario(), ['*', '/', '%']); }
    unario() {
      if (this.es('op', '!')) { this.i++; return { e: 'not', x: this.unario() }; }
      if (this.es('op', '-')) { this.i++; return { e: 'neg', x: this.unario() }; }
      return this.postfijo();
    }
    postfijo() {
      let x = this.primario();
      for (;;) {
        if (this.es('op', '.')) {
          this.i++;
          if (this.es('op', '*')) { this.i++; x = { e: 'splat', x }; continue; }
          if (this.es('num')) { x = { e: 'idx', x, i: { e: 'lit', v: this.cur.v } }; this.i++; continue; }
          x = { e: 'attr', x, n: this.come('id').v }; continue;
        }
        if (this.es('op', '[')) {
          this.i++;
          if (this.es('op', '*')) { this.i++; this.come('op', ']'); x = { e: 'splat', x }; continue; }
          const i = this.expr(); this.come('op', ']'); x = { e: 'idx', x, i }; continue;
        }
        return x;
      }
    }
    primario() {
      const c = this.cur;
      if (c.t === 'num') { this.i++; return { e: 'lit', v: c.v }; }
      if (c.t === 'str') { this.i++; return { e: 'tpl', partes: c.v.partes }; }
      if (c.t === 'op' && c.v === '(') { this.i++; const prev = this.dentro; this.dentro = true; this.sk(); const x = this.expr(); this.sk(); this.dentro = prev; this.come('op', ')'); return x; }
      if (c.t === 'op' && c.v === '[') return this.lista();
      if (c.t === 'op' && c.v === '{') return this.objeto();
      if (c.t === 'id') {
        this.i++;
        if (c.v === 'true' || c.v === 'false') return { e: 'lit', v: c.v === 'true' };
        if (c.v === 'null') return { e: 'lit', v: null };
        if (this.es('op', '(')) {
          this.i++; const args = []; const prev = this.dentro; this.dentro = true; this.sk();
          let expandir = false;
          while (!this.es('op', ')')) { args.push(this.expr()); this.sk(); if (this.es('op', '...')) { this.i++; expandir = true; this.sk(); } if (this.es('op', ',')) { this.i++; this.sk(); } }
          this.dentro = prev; this.i++;
          return { e: 'call', f: c.v, args, expandir };
        }
        return { e: 'ref', n: c.v, line: c.line };
      }
      throw new ErrorHCL(`Invalid expression: no se esperaba ${c.t === 'eof' ? 'el fin del archivo' : `"${c.v ?? 'salto de línea'}"`}`, c.file, c.line);
    }
    lista() {
      this.come('op', '['); const prev = this.dentro; this.dentro = true; this.sk();
      if (this.es('id', 'for')) { const f = this.para(']'); this.dentro = prev; return f; }
      const items = [];
      while (!this.es('op', ']')) { items.push(this.expr()); this.sk(); if (this.es('op', ',')) { this.i++; this.sk(); } }
      this.i++; this.dentro = prev;
      return { e: 'list', items };
    }
    objeto() {
      this.come('op', '{'); const prev = this.dentro; this.dentro = true; this.sk();
      if (this.es('id', 'for')) { const f = this.para('}'); this.dentro = prev; return f; }
      const pares = [];
      while (!this.es('op', '}')) {
        let k;
        if (this.es('id')) { k = { e: 'lit', v: this.cur.v }; this.i++; } else if (this.es('op', '(')) k = this.primario(); else k = this.primario();
        this.sk();
        if (!this.es('op', '=') && !this.es('op', ':')) throw new ErrorHCL('Missing key/value separator: falta "=" en el objeto', this.cur.file, this.cur.line);
        this.i++; this.sk();
        pares.push([k, this.expr()]); this.sk();
        if (this.es('op', ',')) { this.i++; this.sk(); }
      }
      this.i++; this.dentro = prev;
      return { e: 'obj', pares };
    }
    para(cierre) {
      this.come('id', 'for');
      const v1 = this.come('id').v; let v2 = null;
      if (this.es('op', ',')) { this.i++; v2 = this.come('id').v; }
      this.come('id', 'in'); const col = this.expr(); this.come('op', ':'); this.sk();
      const a = this.expr(); let b = null; let agrupar = false;
      if (cierre === '}') { this.sk(); this.come('op', '=>'); this.sk(); b = this.expr(); if (this.es('op', '...')) { this.i++; agrupar = true; } }
      this.sk(); let cond = null;
      if (this.es('id', 'if')) { this.i++; cond = this.expr(); }
      this.sk(); this.come('op', cierre);
      return { e: 'for', v1, v2, col, a, b, cond, obj: cierre === '}', agrupar };
    }
  }

  function parsearArchivo(src, file) {
    const p = new Parser(lex(src, file));
    return p.cuerpo(false).map((x) => Object.assign(x, { file: x.file || file }));
  }

  // ======================================================================= evaluación
  class Desconocido { toString() { return '(known after apply)'; } }
  const DESC = new Desconocido();
  const esDesc = (v) => v instanceof Desconocido || (Array.isArray(v) && v.some(esDesc)) || (v && typeof v === 'object' && !(v instanceof Desconocido) && Object.values(v).some(esDesc));
  const tipoDe = (v) => (v === null ? 'null' : Array.isArray(v) ? 'tuple' : typeof v === 'object' ? 'object' : typeof v);
  const aTexto = (v) => (v === null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v));

  const FUNCIONES = {
    lower: (s) => String(s).toLowerCase(), upper: (s) => String(s).toUpperCase(), title: (s) => String(s).replace(/\b\w/g, (c) => c.toUpperCase()),
    trimspace: (s) => String(s).trim(), trim: (s, c) => String(s).replace(new RegExp(`^[${c}]+|[${c}]+$`, 'g'), ''),
    replace: (s, a, b) => (String(a).startsWith('/') && String(a).endsWith('/') ? String(s).replace(new RegExp(String(a).slice(1, -1), 'g'), b) : String(s).split(a).join(b)),
    substr: (s, o, l) => String(s).substr(o, l < 0 ? undefined : l), join: (sep, l) => l.join(sep), split: (sep, s) => String(s).split(sep),
    format: (f, ...a) => {
      let i = 0;
      return String(f).replace(/%([-0]?)(\d*)(?:\.(\d+))?([sdfqv%])/g, (m, fl, w, p, t) => {
        if (t === '%') return '%';
        const x = a[i++];
        let r = t === 'd' ? String(Math.trunc(x)) : t === 'f' ? Number(x).toFixed(p === undefined ? 6 : Number(p)) : t === 'q' ? JSON.stringify(x) : aTexto(x);
        if (w) r = fl === '-' ? r.padEnd(Number(w)) : r.padStart(Number(w), fl === '0' ? '0' : ' ');
        return r;
      });
    },
    length: (x) => (typeof x === 'string' ? x.length : Array.isArray(x) ? x.length : Object.keys(x || {}).length),
    concat: (...ls) => [].concat(...ls), merge: (...os) => Object.assign({}, ...os), keys: (o) => Object.keys(o).sort(), values: (o) => Object.keys(o).sort().map((k) => o[k]),
    lookup: (o, k, d) => (o && k in o ? o[k] : d), element: (l, i) => l[i % l.length], contains: (l, v) => l.includes(v), index: (l, v) => l.indexOf(v),
    toset: (l) => [...new Set(l)].sort(), tolist: (l) => [...l], tomap: (o) => ({ ...o }), tostring: (x) => aTexto(x), tonumber: (x) => Number(x), tobool: (x) => x === true || x === 'true',
    distinct: (l) => [...new Set(l)], flatten: (l) => l.flat(Infinity), reverse: (l) => [...l].reverse(), sort: (l) => [...l].sort(),
    coalesce: (...a) => a.find((x) => x !== null && x !== ''), max: (...a) => Math.max(...a), min: (...a) => Math.min(...a), abs: Math.abs, ceil: Math.ceil, floor: Math.floor,
    jsonencode: (x) => JSON.stringify(x), jsondecode: (s) => JSON.parse(s), zipmap: (k, v) => Object.fromEntries(k.map((x, i) => [x, v[i]])),
    range: (a, b, s = 1) => { if (b === undefined) { b = a; a = 0; } const r = []; for (let i = a; s > 0 ? i < b : i > b; i += s) r.push(i); return r; },
    startswith: (s, p) => String(s).startsWith(p), endswith: (s, p) => String(s).endsWith(p), md5: (s) => hashHex(s, 32), sha256: (s) => hashHex(s, 64),
    timestamp: () => now(), uuid: () => `${uid(8)}-${uid(4)}-4${uid(3)}-a${uid(3)}-${uid(12)}`, base64encode: (s) => btoa(unescape(encodeURIComponent(s))),
    regexall: (re, s) => [...String(s).matchAll(new RegExp(re, 'g'))].map((m) => (m.length > 1 ? m.slice(1) : m[0])),
    regex: (re, s) => { const m = String(s).match(new RegExp(re)); if (!m) throw new Error('Invalid function argument: pattern did not match any part of the given string.'); return m.length > 1 ? m.slice(1) : m[0]; },
    one: (l) => { if (l.length > 1) throw new Error('Invalid function argument: must be a list, set, or tuple value with either zero or one elements.'); return l.length ? l[0] : null; },
    alltrue: (l) => l.every((x) => x === true || x === 'true'), anytrue: (l) => l.some((x) => x === true || x === 'true'),
    compact: (l) => l.filter((x) => x !== null && x !== ''), sum: (l) => l.reduce((a, b) => a + Number(b), 0), slice: (l, a, b) => l.slice(a, b),
    can: (x) => !(x instanceof Error), try: (...a) => a.find((x) => !(x instanceof Error)),
    cidrsubnet: (cidr, nb, n) => { const [ip, m] = cidr.split('/'); const p = ip.split('.').map(Number); const nm = Number(m) + nb; const v = ((p[0] << 24) | (p[1] << 16) | (p[2] << 8) | p[3]) + n * 2 ** (32 - nm); return [(v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255].join('.') + '/' + nm; },
  };
  function hashHex(s, n) { let h = 2166136261, out = ''; for (let k = 0; out.length < n; k++) { for (const ch of String(s) + k) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } out += h.toString(16).padStart(8, '0'); } return out.slice(0, n); }

  function evaluar(x, ctx) {
    switch (x.e) {
      case 'lit': return x.v;
      case 'tpl': {
        if (x.partes.length === 1 && typeof x.partes[0] !== 'string') return evaluar(x.partes[0], ctx);
        const vals = x.partes.map((p) => (typeof p === 'string' ? p : evaluar(p, ctx)));
        if (vals.some(esDesc)) return DESC;
        return vals.map(aTexto).join('');
      }
      case 'list': return x.items.map((i) => evaluar(i, ctx));
      case 'obj': { const o = {}; for (const [k, v] of x.pares) o[aTexto(evaluar(k, ctx))] = evaluar(v, ctx); return o; }
      case 'cond': { const c = evaluar(x.c, ctx); if (esDesc(c)) return DESC; return c ? evaluar(x.a, ctx) : evaluar(x.b, ctx); }
      case 'not': { const v = evaluar(x.x, ctx); return esDesc(v) ? DESC : !v; }
      case 'neg': { const v = evaluar(x.x, ctx); return esDesc(v) ? DESC : -v; }
      case 'bin': {
        const l = evaluar(x.l, ctx), r = evaluar(x.r, ctx);
        if (esDesc(l) || esDesc(r)) return DESC;
        switch (x.op) {
          case '+': return Number(l) + Number(r); case '-': return l - r; case '*': return l * r; case '/': return l / r; case '%': return l % r;
          case '==': return JSON.stringify(l) === JSON.stringify(r); case '!=': return JSON.stringify(l) !== JSON.stringify(r);
          case '<': return l < r; case '>': return l > r; case '<=': return l <= r; case '>=': return l >= r;
          case '&&': return l && r; case '||': return l || r;
        }
        break;
      }
      case 'call': {
        const f = FUNCIONES[x.f];
        if (x.f === 'file') { const p = evaluar(x.args[0], ctx); const c = Sh.readFile(Sh.norm(p, ctx.dir)); if (c === null) throw new ErrorHCL(`Invalid function argument: no existe el archivo "${p}"`, ctx.file, x.args[0].line); return c; }
        if (x.f === 'templatefile') { const p = evaluar(x.args[0], ctx); const c = Sh.readFile(Sh.norm(p, ctx.dir)); if (c === null) throw new ErrorHCL(`Invalid function argument: no existe el archivo "${p}"`, ctx.file); const vars = evaluar(x.args[1], ctx); return c.replace(/\$\{\s*(\w+)\s*\}/g, (m, k) => aTexto(vars[k])); }
        if (!f) throw new ErrorHCL(`Call to unknown function: There is no function named "${x.f}".`, ctx.file);
        if (x.f === 'can' || x.f === 'try') { const vals = x.args.map((a) => { try { return evaluar(a, ctx); } catch (e) { return e; } }); return f(...vals); }
        let args = x.args.map((a) => evaluar(a, ctx));
        if (x.expandir) args = args.slice(0, -1).concat(args[args.length - 1]);
        if (args.some(esDesc)) return DESC;
        return f(...args);
      }
      case 'for': {
        const coleccion = evaluar(x.col, ctx);
        // solo es desconocido si la colección entera lo es: sus elementos conocidos se pueden usar ya en el plan
        if (coleccion instanceof Desconocido) return DESC;
        const pares = Array.isArray(coleccion) ? coleccion.map((v, i) => [i, v]) : Object.entries(coleccion || {}).sort(([x], [y]) => (x < y ? -1 : x > y ? 1 : 0));
        const res = x.obj ? {} : [];
        for (const [k, v] of pares) {
          const sub = Object.assign(Object.create(ctx), { locales: Object.assign({}, ctx.locales, x.v2 ? { [x.v1]: k, [x.v2]: v } : { [x.v1]: v }) });
          if (x.cond && !evaluar(x.cond, sub)) continue;
          if (x.obj) { const kk = aTexto(evaluar(x.a, sub)); const vv = evaluar(x.b, sub); if (x.agrupar) (res[kk] = res[kk] || []).push(vv); else res[kk] = vv; } else res.push(evaluar(x.a, sub));
        }
        return res;
      }
      case 'splat': { const v = evaluar(x.x, ctx); return v === null ? [] : Array.isArray(v) ? v : [v]; }
      case 'attr': case 'idx': case 'ref': return referencia(x, ctx);
    }
    throw new ErrorHCL('Expresión no soportada en este simulador', ctx.file);
  }

  // Resuelve var.x, local.x, tipo.nombre.attr, module.m.out, data.t.n.attr, count.index, each.key…
  function referencia(x, ctx) {
    const cadena = [];
    let n = x;
    while (n.e === 'attr' || n.e === 'idx') { cadena.unshift(n); n = n.x; }
    if (n.e !== 'ref') { let v = evaluar(n, ctx); for (const s of cadena) v = acceder(v, s, ctx); return v; }
    const raiz = n.n;
    let v;
    let resto = cadena;
    if (ctx.locales && raiz in ctx.locales) v = ctx.locales[raiz];
    else if (raiz === 'var') { const k = resto[0].n; if (!(k in ctx.vars)) throw new ErrorHCL(`Reference to undeclared input variable: An input variable with the name "${k}" has not been declared.`, ctx.file, n.line); v = ctx.vars[k]; resto = resto.slice(1); }
    else if (raiz === 'local') { const k = resto[0].n; if (!(k in ctx.locals)) throw new ErrorHCL(`Reference to undeclared local value: A local value with the name "${k}" has not been declared.`, ctx.file, n.line); v = ctx.locals[k]; resto = resto.slice(1); }
    else if (raiz === 'count') { if (!ctx.count) throw new ErrorHCL('Reference to "count" in non-counted context', ctx.file, n.line); v = ctx.count; }
    else if (raiz === 'each') { if (!ctx.each) throw new ErrorHCL('Reference to "each" in context without for_each', ctx.file, n.line); v = ctx.each; }
    else if (raiz === 'path') { v = { module: Sh.display(ctx.dir), root: Sh.display(ctx.raiz || ctx.dir), cwd: Sh.display(Machine.cwd) }; }
    else if (raiz === 'terraform') { v = { workspace: ctx.workspace || 'default' }; }
    else if (raiz === 'module') { const m = resto[0].n; if (!ctx.modulos || !(m in ctx.modulos)) throw new ErrorHCL(`Reference to undeclared module: No module call named "${m}" is declared.`, ctx.file, n.line); v = ctx.modulos[m]; resto = resto.slice(1); }
    else if (raiz === 'data') { const t = resto[0].n, nom = resto[1].n; const r = ctx.recursos[`data.${t}.${nom}`]; if (!r) throw new ErrorHCL(`Reference to undeclared resource: A data resource "${t}" "${nom}" has not been declared.`, ctx.file, n.line); v = r(); resto = resto.slice(2); }
    else {
      if (!resto.length || resto[0].e !== 'attr') throw new ErrorHCL(`Invalid reference: "${raiz}" no es una referencia válida`, ctx.file, n.line);
      const clave = `${raiz}.${resto[0].n}`;
      const r = ctx.recursos[clave];
      if (!r) throw new ErrorHCL(`Reference to undeclared resource: A managed resource "${raiz}" "${resto[0].n}" has not been declared in the root module.`, ctx.file, n.line);
      v = r(); resto = resto.slice(1);
    }
    for (const s of resto) v = acceder(v, s, ctx);
    return v;
  }
  function acceder(v, s, ctx) {
    if (esDesc(v) && !(v && typeof v === 'object' && !(v instanceof Desconocido))) return DESC;
    if (s.e === 'attr') {
      if (Array.isArray(v)) return v.map((x) => (x && typeof x === 'object' ? x[s.n] : undefined));
      if (v === null || typeof v !== 'object') throw new ErrorHCL(`Unsupported attribute: no se puede leer ".${s.n}" de un valor ${tipoDe(v)}`, ctx.file);
      if (!(s.n in v)) throw new ErrorHCL(`Unsupported attribute: This object does not have an attribute named "${s.n}".`, ctx.file);
      return v[s.n];
    }
    const i = evaluar(s.i, ctx);
    if (esDesc(i)) return DESC;
    if (v === null || v === undefined || !(i in Object(v))) throw new ErrorHCL(`Invalid index: The given key ${JSON.stringify(i)} does not identify an element in this collection value.`, ctx.file);
    return v[i];
  }

  // ======================================================================= catálogo de recursos
  // req: argumentos obligatorios; nuevo: cambiarlos obliga a recrear; calc: atributos que se conocen al aplicar
  const awsArn = (svc, r, reg = true) => `arn:aws:${svc}:${reg ? 'us-east-1' : ''}:${reg ? '123456789012' : ''}:${r}`;
  const AZ_SUB = '1111aaaa-1111-4111-8111-111111111111';
  const CATALOGO = {
    // ---------- AWS
    aws_s3_bucket: { req: [], nuevo: ['bucket'], calc: (a) => ({ id: a.bucket, arn: `arn:aws:s3:::${a.bucket}`, bucket_domain_name: `${a.bucket}.s3.amazonaws.com`, region: a._region }), defecto: (a) => ({ bucket: a.bucket || `terraform-${uid(20)}`, force_destroy: a.force_destroy ?? false }),
      validar: (a) => (!/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(a.bucket || 'ok-ok') ? `invalid bucket name "${a.bucket}": solo minúsculas, números, puntos y guiones (3 a 63)` : null),
      crear: (a) => { const s = window.CloudSim.aws(); if (s.buckets[a.bucket]) return `creating S3 Bucket (${a.bucket}): BucketAlreadyOwnedByYou`; s.buckets[a.bucket] = { region: a._region || 'us-east-1', objects: {}, created: now() }; },
      borrar: (a) => { const s = window.CloudSim.aws(); const b = s.buckets[a.bucket]; if (b && Object.keys(b.objects).length && !a.force_destroy) return `deleting S3 Bucket (${a.bucket}): BucketNotEmpty: The bucket you tried to delete is not empty (usa force_destroy = true)`; delete s.buckets[a.bucket]; } },
    aws_s3_bucket_versioning: { req: ['bucket', 'versioning_configuration'], calc: (a) => ({ id: a.bucket }) },
    aws_s3_bucket_lifecycle_configuration: { req: ['bucket', 'rule'], calc: (a) => ({ id: a.bucket }) },
    aws_s3_bucket_public_access_block: { req: ['bucket'], calc: (a) => ({ id: a.bucket }) },
    aws_s3_bucket_server_side_encryption_configuration: { req: ['bucket', 'rule'], calc: (a) => ({ id: a.bucket }) },
    aws_s3_object: { req: ['bucket', 'key'], nuevo: ['bucket', 'key'], calc: (a) => ({ id: a.key, etag: hashHex(a.content || a.source || '', 32) }),
      crear: (a, d) => { const b = window.CloudSim.aws().buckets[a.bucket]; if (!b) return `uploading S3 Object: NoSuchBucket: ${a.bucket}`; b.objects[a.key] = { c: a.content ?? (a.source ? Sh.readFile(Sh.norm(a.source, d)) || '' : ''), m: now() }; },
      borrar: (a) => { const b = window.CloudSim.aws().buckets[a.bucket]; if (b) delete b.objects[a.key]; } },
    aws_glue_catalog_database: { req: ['name'], nuevo: ['name'], calc: (a) => ({ id: `123456789012:${a.name}`, arn: awsArn('glue', `database/${a.name}`) }), crear: (a) => { window.CloudSim.aws().glueDbs[a.name] = { tables: {} }; }, borrar: (a) => { delete window.CloudSim.aws().glueDbs[a.name]; } },
    aws_glue_crawler: { req: ['name', 'database_name', 'role'], calc: (a) => ({ id: a.name, arn: awsArn('glue', `crawler/${a.name}`) }),
      crear: (a) => { const t = (a.s3_target || [])[0] || {}; window.CloudSim.aws().crawlers[a.name] = { db: a.database_name, path: t.path || '', state: 'READY' }; }, borrar: (a) => { delete window.CloudSim.aws().crawlers[a.name]; } },
    aws_glue_job: { req: ['name', 'role_arn', 'command'], calc: (a) => ({ id: a.name, arn: awsArn('glue', `job/${a.name}`) }), crear: (a) => { const c = (a.command || [])[0] || {}; window.CloudSim.aws().glueJobs[a.name] = { runs: [], role: a.role_arn, glue: a.glue_version, worker: a.worker_type, workers: a.number_of_workers, script: c.script_location }; }, borrar: (a) => { delete window.CloudSim.aws().glueJobs[a.name]; } },
    aws_iam_role: { req: ['assume_role_policy'], nuevo: ['name'], calc: (a) => ({ id: a.name, arn: `arn:aws:iam::123456789012:role/${a.name}`, unique_id: 'AROA' + uid(16).toUpperCase() }), defecto: (a) => ({ name: a.name || `terraform-${uid(12)}` }), crear: (a) => { window.CloudSim.aws().roles[a.name] = {}; }, borrar: (a) => { delete window.CloudSim.aws().roles[a.name]; } },
    aws_iam_policy: { req: ['policy'], calc: (a) => ({ id: `arn:aws:iam::123456789012:policy/${a.name}`, arn: `arn:aws:iam::123456789012:policy/${a.name}` }) },
    aws_iam_role_policy_attachment: { req: ['role', 'policy_arn'], calc: (a) => ({ id: `${a.role}-${uid(8)}` }) },
    aws_kinesis_stream: { req: ['name'], nuevo: ['name'], calc: (a) => ({ id: awsArn('kinesis', `stream/${a.name}`), arn: awsArn('kinesis', `stream/${a.name}`) }), crear: (a) => { window.CloudSim.aws().streams[a.name] = { shards: Number(a.shard_count || 1), records: [] }; }, borrar: (a) => { delete window.CloudSim.aws().streams[a.name]; } },
    aws_lambda_function: { req: ['function_name', 'role'], calc: (a) => ({ id: a.function_name, arn: awsArn('lambda', `function:${a.function_name}`) }), crear: (a) => { window.CloudSim.aws().lambdas[a.function_name] = { runtime: a.runtime || 'python3.12', handler: a.handler || 'app.handler' }; }, borrar: (a) => { delete window.CloudSim.aws().lambdas[a.function_name]; } },
    aws_athena_workgroup: { req: ['name'], calc: (a) => ({ id: a.name, arn: awsArn('athena', `workgroup/${a.name}`) }) },
    aws_sfn_state_machine: { req: ['name', 'role_arn', 'definition'], calc: (a) => ({ id: awsArn('states', `stateMachine:${a.name}`), arn: awsArn('states', `stateMachine:${a.name}`) }), crear: (a) => { window.CloudSim.aws().sfn[a.name] = {}; }, borrar: (a) => { delete window.CloudSim.aws().sfn[a.name]; } },
    aws_redshiftserverless_namespace: { req: ['namespace_name'], calc: (a) => ({ id: a.namespace_name, arn: awsArn('redshift-serverless', `namespace/${uid(8)}`) }) },
    aws_redshiftserverless_workgroup: { req: ['namespace_name', 'workgroup_name'], calc: (a) => ({ id: a.workgroup_name, endpoint: [{ address: `${a.workgroup_name}.123456789012.us-east-1.redshift-serverless.amazonaws.com`, port: 5439 }] }) },
    aws_mwaa_environment: { req: ['name', 'dag_s3_path', 'execution_role_arn', 'source_bucket_arn', 'network_configuration'], calc: (a) => ({ id: a.name, arn: awsArn('airflow', `environment/${a.name}`), webserver_url: `${uid(8)}.c2.airflow.us-east-1.on.aws` }) },
    aws_cloudwatch_log_group: { req: [], calc: (a) => ({ id: a.name, arn: awsArn('logs', `log-group:${a.name}`) }) },
    // ---------- Google Cloud
    google_storage_bucket: { req: ['name', 'location'], nuevo: ['name', 'location'], calc: (a) => ({ id: a.name, url: `gs://${a.name}`, self_link: `https://www.googleapis.com/storage/v1/b/${a.name}` }),
      validar: (a) => (!/^[a-z0-9][a-z0-9._-]{1,61}[a-z0-9]$/.test(a.name || '') ? `invalid bucket name "${a.name}"` : null),
      crear: (a) => { const s = window.CloudSim.gcp(); if (s.buckets[a.name]) return `googleapi: Error 409: Your previous request to create the named bucket succeeded and you already own it., conflict`; s.buckets[a.name] = { location: String(a.location).toUpperCase(), objects: {}, created: now(), project: a._project }; },
      borrar: (a) => { const s = window.CloudSim.gcp(); const b = s.buckets[a.name]; if (b && Object.keys(b.objects).length && !a.force_destroy) return `Error trying to delete bucket ${a.name} containing objects without \`force_destroy\` set to true`; delete s.buckets[a.name]; } },
    google_bigquery_dataset: { req: ['dataset_id'], nuevo: ['dataset_id', 'location'], calc: (a) => ({ id: `projects/${a._project}/datasets/${a.dataset_id}`, self_link: `https://bigquery.googleapis.com/bigquery/v2/projects/${a._project}/datasets/${a.dataset_id}` }),
      crear: (a) => { window.CloudSim.gcp().datasets[a.dataset_id] = { location: a.location || 'US', tables: {} }; }, borrar: (a) => { delete window.CloudSim.gcp().datasets[a.dataset_id]; } },
    google_bigquery_table: { req: ['dataset_id', 'table_id'], nuevo: ['dataset_id', 'table_id'], calc: (a) => ({ id: `projects/${a._project}/datasets/${a.dataset_id}/tables/${a.table_id}` }),
      crear: (a) => { const d = window.CloudSim.gcp().datasets[a.dataset_id]; if (!d) return `googleapi: Error 404: Not found: Dataset ${a._project}:${a.dataset_id}`; 
        // el esquema JSON de Terraform pasa al formato de bq (col:TIPO,…) y se crea la tabla consultable
        let cols = []; try { cols = JSON.parse(a.schema || '[]').map((c) => [c.name, c.type]); } catch (e) { cols = []; }
        const tp = (a.time_partitioning || [])[0];
        const E = window.Engines && window.Engines.SQL;
        if (cols.length && E && E._bytes) E.exec(`DROP TABLE IF EXISTS ${a.dataset_id}__${a.table_id}; CREATE TABLE ${a.dataset_id}__${a.table_id} (${cols.map(([c]) => '"' + c + '"').join(', ')});`, E.playground());
        d.tables[a.table_id] = d.tables[a.table_id] || { rows: 0, schema: cols.length ? cols.map((c) => c.join(':')).join(',') : 'autodetect', local: cols.length ? `${a.dataset_id}__${a.table_id}` : undefined, partition: tp ? tp.field || '_PARTITIONTIME' : null, cluster: (a.clustering || []).join(',') || null }; }, borrar: (a) => { const d = window.CloudSim.gcp().datasets[a.dataset_id]; if (d) delete d.tables[a.table_id]; } },
    google_pubsub_topic: { req: ['name'], nuevo: ['name'], calc: (a) => ({ id: `projects/${a._project}/topics/${a.name}` }), crear: (a) => { window.CloudSim.gcp().topics[a.name] = { msgs: [] }; }, borrar: (a) => { delete window.CloudSim.gcp().topics[a.name]; } },
    google_pubsub_subscription: { req: ['name', 'topic'], nuevo: ['name', 'topic'], calc: (a) => ({ id: `projects/${a._project}/subscriptions/${a.name}` }),
      crear: (a) => { const t = String(a.topic).split('/').pop(); if (!window.CloudSim.gcp().topics[t]) return `googleapi: Error 404: Resource not found (resource=${t}).`; window.CloudSim.gcp().subs[a.name] = { topic: t, queue: [] }; }, borrar: (a) => { delete window.CloudSim.gcp().subs[a.name]; } },
    google_service_account: { req: ['account_id'], nuevo: ['account_id'], calc: (a) => ({ id: `projects/${a._project}/serviceAccounts/${a.account_id}@${a._project}.iam.gserviceaccount.com`, email: `${a.account_id}@${a._project}.iam.gserviceaccount.com`, member: `serviceAccount:${a.account_id}@${a._project}.iam.gserviceaccount.com` }) },
    google_project_iam_member: { req: ['project', 'role', 'member'], calc: (a) => ({ id: `${a.project}/${a.role}/${a.member}`, etag: 'BwY' + uid(8) }) },
    google_storage_bucket_iam_member: { req: ['bucket', 'role', 'member'], calc: (a) => ({ id: `b/${a.bucket}/${a.role}/${a.member}` }) },
    google_bigquery_dataset_iam_member: { req: ['dataset_id', 'role', 'member'], calc: (a) => ({ id: `${a.dataset_id}/${a.role}/${a.member}` }) },
    google_composer_environment: { req: ['name'], calc: (a) => ({ id: `projects/${a._project}/locations/${a.region}/environments/${a.name}`, config: [{ airflow_uri: `https://${uid(10)}-dot-${a.region || 'us-central1'}.composer.googleusercontent.com`, dag_gcs_prefix: `gs://${a.region || 'us-central1'}-${a.name}-${uid(8)}-bucket/dags` }] }),
      crear: (a) => { window.CloudSim.gcp().composer[a.name] = { state: 'RUNNING' }; }, borrar: (a) => { delete window.CloudSim.gcp().composer[a.name]; } },
    google_dataproc_cluster: { req: ['name'], calc: (a) => ({ id: `projects/${a._project}/regions/${a.region}/clusters/${a.name}` }),
      crear: (a) => { window.CloudSim.gcp().dataproc[a.name] = { region: a.region || 'us-central1', workers: 2, state: 'RUNNING' }; }, borrar: (a) => { delete window.CloudSim.gcp().dataproc[a.name]; } },
    // ---------- Azure
    azurerm_resource_group: { req: ['name', 'location'], nuevo: ['name', 'location'], calc: (a) => ({ id: `/subscriptions/${AZ_SUB}/resourceGroups/${a.name}` }),
      crear: (a) => { window.CloudSim.az().groups[a.name] = { location: String(a.location).toLowerCase().replace(/\s/g, ''), tags: a.tags || {} }; },
      borrar: (a) => { const s = window.CloudSim.az(); delete s.groups[a.name]; } },
    azurerm_storage_account: { req: ['name', 'resource_group_name', 'location', 'account_tier', 'account_replication_type'], nuevo: ['name', 'resource_group_name', 'location', 'is_hns_enabled'],
      calc: (a) => ({ id: `/subscriptions/${AZ_SUB}/resourceGroups/${a.resource_group_name}/providers/Microsoft.Storage/storageAccounts/${a.name}`, primary_blob_endpoint: `https://${a.name}.blob.core.windows.net/`, primary_dfs_endpoint: `https://${a.name}.dfs.core.windows.net/`, primary_access_key: '(sensitive value)' }),
      validar: (a) => (!/^[a-z0-9]{3,24}$/.test(a.name || '') ? `name ("${a.name}") can only consist of lowercase letters and numbers, and must be between 3 and 24 characters long` : null),
      crear: (a) => { const s = window.CloudSim.az(); if (!s.groups[a.resource_group_name]) return `creating Storage Account (Resource Group "${a.resource_group_name}"): ResourceGroupNotFound`; s.storage[a.name] = { rg: a.resource_group_name, location: a.location, sku: `${a.account_tier}_${a.account_replication_type}`, kind: a.account_kind || 'StorageV2', hns: !!a.is_hns_enabled, containers: {} }; },
      borrar: (a) => { delete window.CloudSim.az().storage[a.name]; } },
    azurerm_storage_container: { req: ['name'], nuevo: ['name'], calc: (a) => ({ id: `https://${a.storage_account_name || 'cuenta'}.blob.core.windows.net/${a.name}` }),
      crear: (a) => { const n = a.storage_account_name || String(a.storage_account_id || '').split('/').pop(); const c = window.CloudSim.az().storage[n]; if (!c) return `retrieving Storage Account "${n}": not found`; c.containers[a.name] = c.containers[a.name] || { blobs: {} }; },
      borrar: (a) => { const n = a.storage_account_name || String(a.storage_account_id || '').split('/').pop(); const c = window.CloudSim.az().storage[n]; if (c) delete c.containers[a.name]; } },
    azurerm_storage_data_lake_gen2_filesystem: { req: ['name', 'storage_account_id'], nuevo: ['name', 'storage_account_id'], calc: (a) => ({ id: `https://${String(a.storage_account_id).split('/').pop()}.dfs.core.windows.net/${a.name}` }),
      crear: (a) => { const n = String(a.storage_account_id).split('/').pop(); const c = window.CloudSim.az().storage[n]; if (!c) return `retrieving Storage Account "${n}": not found`; c.containers[a.name] = c.containers[a.name] || { blobs: {} }; },
      borrar: (a) => { const c = window.CloudSim.az().storage[String(a.storage_account_id).split('/').pop()]; if (c) delete c.containers[a.name]; } },
    azurerm_key_vault: { req: ['name', 'location', 'resource_group_name', 'tenant_id', 'sku_name'], calc: (a) => ({ id: `/subscriptions/${AZ_SUB}/resourceGroups/${a.resource_group_name}/providers/Microsoft.KeyVault/vaults/${a.name}`, vault_uri: `https://${a.name}.vault.azure.net/` }),
      crear: (a) => { window.CloudSim.az().kv[a.name] = { rg: a.resource_group_name, location: a.location, secrets: {} }; }, borrar: (a) => { delete window.CloudSim.az().kv[a.name]; } },
    azurerm_key_vault_secret: { req: ['name', 'value', 'key_vault_id'], calc: (a) => ({ id: `https://${String(a.key_vault_id).split('/').pop()}.vault.azure.net/secrets/${a.name}/${uid(32)}` }),
      crear: (a) => { const kv = window.CloudSim.az().kv[String(a.key_vault_id).split('/').pop()]; if (kv) kv.secrets[a.name] = { value: a.value }; } },
    azurerm_databricks_workspace: { req: ['name', 'resource_group_name', 'location', 'sku'], calc: (a) => ({ id: `/subscriptions/${AZ_SUB}/resourceGroups/${a.resource_group_name}/providers/Microsoft.Databricks/workspaces/${a.name}`, workspace_url: `adb-${Math.floor(1e15 + Math.random() * 9e15)}.7.azuredatabricks.net` }),
      crear: (a, d, calc) => { window.CloudSim.az().dbw[a.name] = { rg: a.resource_group_name, location: a.location, sku: a.sku, url: calc.workspace_url }; }, borrar: (a) => { delete window.CloudSim.az().dbw[a.name]; } },
    azurerm_data_factory: { req: ['name', 'location', 'resource_group_name'], calc: (a) => ({ id: `/subscriptions/${AZ_SUB}/resourceGroups/${a.resource_group_name}/providers/Microsoft.DataFactory/factories/${a.name}` }),
      crear: (a) => { window.CloudSim.az().adf[a.name] = { rg: a.resource_group_name, location: a.location }; }, borrar: (a) => { delete window.CloudSim.az().adf[a.name]; } },
    azurerm_eventhub_namespace: { req: ['name', 'location', 'resource_group_name', 'sku'], calc: (a) => ({ id: `/subscriptions/${AZ_SUB}/resourceGroups/${a.resource_group_name}/providers/Microsoft.EventHub/namespaces/${a.name}` }),
      crear: (a) => { window.CloudSim.az().eh[a.name] = { rg: a.resource_group_name, location: a.location, hubs: {} }; }, borrar: (a) => { delete window.CloudSim.az().eh[a.name]; } },
    azurerm_role_assignment: { req: ['scope', 'principal_id'], calc: (a) => ({ id: `${a.scope}/providers/Microsoft.Authorization/roleAssignments/${uid(8)}-${uid(4)}` }) },
    azurerm_user_assigned_identity: { req: ['name', 'location', 'resource_group_name'], calc: (a) => ({ id: `/subscriptions/${AZ_SUB}/resourceGroups/${a.resource_group_name}/providers/Microsoft.ManagedIdentity/userAssignedIdentities/${a.name}`, principal_id: `${uid(8)}-${uid(4)}-${uid(4)}-${uid(4)}-${uid(12)}`, client_id: `${uid(8)}-${uid(4)}-${uid(4)}-${uid(4)}-${uid(12)}` }) },
    azurerm_databricks_access_connector: { req: ['name', 'resource_group_name', 'location'], calc: (a) => ({ id: `/subscriptions/${AZ_SUB}/resourceGroups/${a.resource_group_name}/providers/Microsoft.Databricks/accessConnectors/${a.name}`, identity: [{ type: 'SystemAssigned', principal_id: `${uid(8)}-${uid(4)}-${uid(4)}-${uid(4)}-${uid(12)}`, tenant_id: '9999ffff-0000-4000-8000-000000000000' }] }) },
    azurerm_eventhub: { req: ['name', 'partition_count', 'message_retention'], nuevo: ['name', 'partition_count'], calc: (a) => ({ id: `${a.namespace_id || ''}/eventhubs/${a.name}` }),
      crear: (a) => { const ns = window.CloudSim.az().eh[String(a.namespace_id || '').split('/').pop()]; if (ns) ns.hubs[a.name] = { partitions: Number(a.partition_count) }; } },
    // ---------- Databricks
    databricks_storage_credential: { req: ['name'], nuevo: ['name'], calc: (a) => ({ id: a.name }) },
    databricks_external_location: { req: ['name', 'url', 'credential_name'], calc: (a) => ({ id: a.name }) },
    databricks_sql_endpoint: { req: ['name', 'cluster_size'], calc: (a) => ({ id: uid(16), jdbc_url: `jdbc:spark://adb-1234567890123456.7.azuredatabricks.net:443/default;transportMode=http;ssl=1;httpPath=/sql/1.0/warehouses/${uid(16)}` }), defecto: () => ({ auto_stop_mins: 120 }) },
    databricks_notebook: { req: ['path'], nuevo: ['path'], calc: (a) => ({ id: a.path, url: `https://adb-1234567890123456.7.azuredatabricks.net/#workspace${a.path}` }),
      crear: (a, d) => { window.CloudSim.dbx().workspace[a.path] = 'NOTEBOOK'; }, borrar: (a) => { delete window.CloudSim.dbx().workspace[a.path]; } },
    databricks_cluster: { req: ['spark_version'], calc: (a) => ({ id: `0${uid(3)}-${uid(6)}-${uid(8)}`, url: `https://adb-1234567890123456.7.azuredatabricks.net/#setting/clusters/${uid(8)}/configuration`, state: 'RUNNING' }),
      crear: (a, d, calc) => { window.CloudSim.dbx().clusters[calc.id] = { name: a.cluster_name || 'terraform-cluster', state: 'RUNNING', spark: a.spark_version, node: a.node_type_id || 'Standard_D4ds_v5', workers: Number(a.num_workers || 1) }; },
      borrar: (a, calc) => { delete window.CloudSim.dbx().clusters[calc.id]; } },
    databricks_job: { req: [], calc: () => ({ id: String(Math.floor(100000 + Math.random() * 900000)) }),
      crear: (a, d, calc) => { window.CloudSim.dbx().jobs[calc.id] = { name: a.name || 'Untitled', runs: [], settings: { name: a.name, tasks: (a.task || []).map((t) => ({ task_key: t.task_key, depends_on: t.depends_on })) } }; },
      borrar: (a, calc) => { delete window.CloudSim.dbx().jobs[calc.id]; } },
    databricks_catalog: { req: ['name'], nuevo: ['name'], calc: (a) => ({ id: a.name }), crear: (a) => { const c = window.CloudSim.dbx().catalogs; c[a.name] = c[a.name] || {}; }, borrar: (a) => { delete window.CloudSim.dbx().catalogs[a.name]; } },
    databricks_schema: { req: ['catalog_name', 'name'], nuevo: ['catalog_name', 'name'], calc: (a) => ({ id: `${a.catalog_name}.${a.name}` }),
      crear: (a) => { const c = window.CloudSim.dbx().catalogs[a.catalog_name]; if (!c) return `Catalog '${a.catalog_name}' does not exist.`; c[a.name] = c[a.name] || []; }, borrar: (a) => { const c = window.CloudSim.dbx().catalogs[a.catalog_name]; if (c) delete c[a.name]; } },
    databricks_grants: { req: [], calc: (a) => ({ id: `catalog/${a.catalog || a.schema || a.table || 'x'}` }) },
    databricks_secret_scope: { req: ['name'], calc: (a) => ({ id: a.name }), crear: (a) => { window.CloudSim.dbx().scopes[a.name] = window.CloudSim.dbx().scopes[a.name] || {}; }, borrar: (a) => { delete window.CloudSim.dbx().scopes[a.name]; } },
    // ---------- utilitarios
    random_id: { req: ['byte_length'], calc: (a) => { const h = uid(Number(a.byte_length) * 2); return { id: h, hex: h, dec: String(parseInt(h.slice(0, 12), 16)), b64_url: btoa(h).replace(/=+$/, '') }; } },
    random_string: { req: ['length'], calc: (a) => { const ch = (a.upper === false ? '' : 'ABCDEFGHJKLMNPQRSTUVWXYZ') + 'abcdefghijkmnopqrstuvwxyz0123456789'; const r = Array.from({ length: Number(a.length) }, () => ch[Math.floor(Math.random() * ch.length)]).join(''); return { id: r, result: (a.special === false || true) ? r : r }; } },
    random_password: { req: ['length'], calc: (a) => { const r = Array.from({ length: Number(a.length) }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!#%'[Math.floor(Math.random() * 59)]).join(''); return { id: 'none', result: r }; }, sensible: ['result'] },
    null_resource: { req: [], calc: () => ({ id: String(Math.floor(Math.random() * 9e18)) }) },
    terraform_data: { req: [], calc: () => ({ id: `${uid(8)}-${uid(4)}-${uid(4)}-${uid(4)}-${uid(12)}` }) },
    local_file: { req: ['filename'], nuevo: ['filename', 'content'], calc: (a) => ({ id: hashHex(a.content || '', 40) }),
      crear: (a, d) => { Sh.writeFile(Sh.norm(a.filename, d), a.content || ''); }, borrar: (a, calc, d) => { const p = Sh.norm(a.filename, d); delete Machine.fs[p]; } },
  };
  const DATOS = {
    aws_caller_identity: () => ({ id: '123456789012', account_id: '123456789012', arn: 'arn:aws:iam::123456789012:user/alumno', user_id: 'AIDA' + 'X'.repeat(16) }),
    aws_region: (a, p) => ({ id: p.region || 'us-east-1', name: p.region || 'us-east-1' }),
    azurerm_client_config: () => ({ id: 'cfg', tenant_id: '9999ffff-0000-4000-8000-000000000000', subscription_id: AZ_SUB, object_id: 'aaaa1111-2222-4333-8444-555566667777', client_id: '04b07795-8ddb-461a-bbee-02f9e1bf7b46' }),
    azurerm_resource_group: (a) => { const g = window.CloudSim.az().groups[a.name]; if (!g) throw new Error(`Resource Group "${a.name}" was not found`); return { id: `/subscriptions/${AZ_SUB}/resourceGroups/${a.name}`, name: a.name, location: g.location }; },
    google_project: (a, p) => ({ id: `projects/${p.project}`, project_id: p.project, number: '123456789012' }),
    google_client_config: (a, p) => ({ id: 'cfg', project: p.project, region: p.region || 'us-central1', access_token: '(sensitive value)' }),
    aws_s3_bucket: (a) => { const b = window.CloudSim.aws().buckets[a.bucket]; if (!b) throw new Error(`reading S3 Bucket (${a.bucket}): couldn't find resource`); return { id: a.bucket, bucket: a.bucket, arn: `arn:aws:s3:::${a.bucket}`, region: b.region }; },
    terraform_remote_state: (a, p, dir) => {
      const b = { type: a.backend, config: a.config || {} };
      const txt = b.type === 'local' ? Sh.readFile(Sh.norm(b.config.path || 'terraform.tfstate', dir)) : leerTextoEstado(b, a.workspace || 'default');
      if (!txt) throw new Error('Unable to find remote state: No stored state was found for the given workspace in the given backend.');
      const j = JSON.parse(txt);
      return { id: '2016-07-19 00:00:00 +0000 UTC', backend: a.backend, outputs: Object.fromEntries(Object.entries(j.outputs || {}).map(([k, v]) => [k, v.value])) };
    },
    databricks_spark_version: () => ({ id: '15.4.x-scala2.12' }),
    databricks_node_type: () => ({ id: 'Standard_D4ds_v5' }),
  };
  const PROVEEDORES = {
    aws: { fuente: 'hashicorp/aws', version: '5.82.2' }, google: { fuente: 'hashicorp/google', version: '6.14.1' }, azurerm: { fuente: 'hashicorp/azurerm', version: '4.14.0' },
    databricks: { fuente: 'databricks/databricks', version: '1.62.0' }, random: { fuente: 'hashicorp/random', version: '3.6.3' }, local: { fuente: 'hashicorp/local', version: '2.5.2' },
    null: { fuente: 'hashicorp/null', version: '3.2.3' }, terraform: { fuente: 'terraform.io/builtin/terraform', version: '' },
  };
  const proveedorDe = (tipo) => (tipo === 'terraform_data' ? 'terraform' : tipo.split('_')[0]);

  // ======================================================================= carga de la configuración
  function archivosTf(dir) {
    return Object.keys(Machine.fs).filter((k) => Machine.fs[k].t === 'f' && k.startsWith(dir + '/') && !k.slice(dir.length + 1).includes('/') && k.endsWith('.tf')).sort();
  }
  // aws_s3_bucket.a["x"] escrito como expresión → texto de dirección
  function direccionDe(x) {
    if (x.e === 'ref') return x.n;
    if (x.e === 'attr') return `${direccionDe(x.x)}.${x.n}`;
    if (x.e === 'idx') { const i = x.i.e === 'lit' ? x.i.v : x.i.e === 'tpl' ? x.i.partes.join('') : '?'; return `${direccionDe(x.x)}[${typeof i === 'number' ? i : JSON.stringify(i)}]`; }
    throw new ErrorHCL('Invalid address: se esperaba una dirección como aws_s3_bucket.nombre', '', x.line);
  }
  function cargarModulo(dir) {
    const items = [];
    for (const f of archivosTf(dir)) items.push(...parsearArchivo(Sh.readFile(f), Sh.display(f).split('/').pop()));
    const cfg = { dir, variables: {}, locals: [], outputs: {}, recursos: [], datos: [], modulos: [], proveedores: {}, requeridos: {}, backend: null, movidos: [], archivos: archivosTf(dir) };
    for (const b of items) {
      if (b.k !== 'block') throw new ErrorHCL(`Unsupported argument: An argument named "${b.nombre}" is not expected here.`, b.file, b.line);
      const attrs = Object.fromEntries(b.body.filter((x) => x.k === 'attr').map((x) => [x.nombre, x]));
      if (b.tipo === 'variable') cfg.variables[b.etiquetas[0]] = { attrs, bloques: b.body.filter((x) => x.k === 'block'), file: b.file, line: b.line };
      else if (b.tipo === 'locals') cfg.locals.push(...b.body);
      else if (b.tipo === 'output') cfg.outputs[b.etiquetas[0]] = { attrs, file: b.file };
      else if (b.tipo === 'resource') { if (b.etiquetas.length !== 2) throw new ErrorHCL('Missing name for resource: All resource blocks must have 2 labels (type, name).', b.file, b.line); cfg.recursos.push(b); }
      else if (b.tipo === 'data') cfg.datos.push(b);
      else if (b.tipo === 'module') cfg.modulos.push(b);
      else if (b.tipo === 'provider') cfg.proveedores[b.etiquetas[0]] = b;
      else if (b.tipo === 'moved') { if (!attrs.from || !attrs.to) throw new ErrorHCL('Missing required argument: A moved block requires "from" and "to".', b.file, b.line); cfg.movidos.push({ from: direccionDe(attrs.from.expr), to: direccionDe(attrs.to.expr), file: b.file, line: b.line }); }
      else if (b.tipo === 'terraform') {
        for (const x of b.body) {
          if (x.k === 'block' && x.tipo === 'required_providers') for (const a of x.body) cfg.requeridos[a.nombre] = a;
          if (x.k === 'block' && x.tipo === 'backend') cfg.backend = { tipo: x.etiquetas[0], body: x.body };
        }
      } else throw new ErrorHCL(`Unsupported block type: Blocks of type "${b.tipo}" are not expected here.`, b.file, b.line);
    }
    return cfg;
  }

  // variables de entrada: defaults < terraform.tfvars < *.auto.tfvars < -var-file < -var
  function valoresVariables(cfg, opciones) {
    const vals = {};
    const desdeArchivo = (path) => {
      const c = Sh.readFile(path); if (c === null) throw new ErrorHCL(`Failed to read variables file: Given variables file ${Sh.display(path)} does not exist.`, '');
      for (const a of parsearArchivo(c, Sh.display(path).split('/').pop())) if (a.k === 'attr') vals[a.nombre] = evaluar(a.expr, { vars: {}, locals: {}, recursos: {}, dir: cfg.dir });
    };
    // orden de precedencia del Terraform real: TF_VAR_ < terraform.tfvars < *.auto.tfvars < -var-file / -var
    for (const [k, v] of Object.entries(Machine.env || {})) if (k.startsWith('TF_VAR_')) vals[k.slice(7)] = v;
    const tfvars = cfg.dir + '/terraform.tfvars';
    if (Sh.exists(tfvars)) desdeArchivo(tfvars);
    Object.keys(Machine.fs).filter((k) => k.startsWith(cfg.dir + '/') && k.endsWith('.auto.tfvars') && !k.slice(cfg.dir.length + 1).includes('/')).sort().forEach(desdeArchivo);
    for (const f of opciones.varFiles || []) desdeArchivo(Sh.norm(f));
    Object.assign(vals, opciones.vars || {}, opciones.varsTipadas || {});
    const out = {};
    for (const [n, v] of Object.entries(cfg.variables)) {
      let val;
      if (n in vals) val = vals[n];
      else if (v.attrs.default) val = evaluar(v.attrs.default.expr, { vars: {}, locals: {}, recursos: {}, dir: cfg.dir, file: v.file });
      else if (opciones.soloValidar) { out[n] = DESC; continue; }
      else throw new ErrorHCL(`No value for required variable: The root module input variable "${n}" is not set, and has no default value. Use a -var or -var-file command line argument to provide a value for this variable.`, v.file, v.line);
      const tipo = v.attrs.type ? textoTipo(v.attrs.type.expr) : null;
      if (tipo === 'number' && typeof val === 'string' && /^-?\d+(\.\d+)?$/.test(val)) val = Number(val);
      if (tipo === 'bool' && typeof val === 'string') val = val === 'true';
      if (['list', 'set', 'map', 'object', 'tuple'].includes(tipo) && typeof val === 'string' && /^\s*[[{]/.test(val)) val = evaluar(parsearArchivo(`v = ${val}`, '-var')[0].expr, { vars: {}, locals: {}, recursos: {}, dir: cfg.dir });
      if (tipo === 'number' && typeof val !== 'number') throw new ErrorHCL(`Invalid value for input variable: The given value is not suitable for var.${n}: a number is required.`, v.file, v.line);
      out[n] = val;
    }
    for (const n of Object.keys(vals)) if (!(n in cfg.variables) && opciones.vars && n in opciones.vars) throw new ErrorHCL(`Value for undeclared variable: A variable named "${n}" was assigned on the command line, but the root module does not declare a variable of that name.`, '');
    // bloques validation { condition, error_message }
    for (const [n, v] of Object.entries(cfg.variables)) for (const b of v.bloques.filter((x) => x.tipo === 'validation')) {
      const a = Object.fromEntries(b.body.filter((x) => x.k === 'attr').map((x) => [x.nombre, x]));
      const ctx = { vars: out, locals: {}, recursos: {}, dir: cfg.dir, file: v.file };
      if (a.condition && !esDesc(out[n]) && !evaluar(a.condition.expr, ctx)) throw new ErrorHCL(`Invalid value for variable: ${a.error_message ? evaluar(a.error_message.expr, ctx) : 'la validación falló'}\n\nThis was checked by the validation rule at ${v.file}:${b.line}.`, v.file, b.line);
    }
    return out;
  }
  const textoTipo = (x) => (x.e === 'ref' ? x.n : x.e === 'call' ? x.f : 'any');

  // atributos de un bloque (incluye sub-bloques repetidos como listas de objetos)
  function evaluarCuerpo(body, ctx, omitir = []) {
    const o = {};
    for (const x of body) {
      if (x.k === 'attr') { if (!omitir.includes(x.nombre)) o[x.nombre] = evaluar(x.expr, Object.assign(Object.create(ctx), { file: x.file || ctx.file })); }
      else if (x.tipo === 'dynamic') {
        const a = Object.fromEntries(x.body.filter((y) => y.k === 'attr').map((y) => [y.nombre, y]));
        const contenido = x.body.find((y) => y.k === 'block' && y.tipo === 'content');
        const it = a.iterator ? a.iterator.expr.n : x.etiquetas[0];
        const colec = evaluar(a.for_each.expr, ctx);
        const pares = Array.isArray(colec) ? colec.map((v, i) => [i, v]) : Object.entries(colec || {});
        o[x.etiquetas[0]] = pares.map(([k, v]) => evaluarCuerpo(contenido.body, Object.assign(Object.create(ctx), { locales: Object.assign({}, ctx.locales, { [it]: { key: k, value: v } }) })));
      } else if (!['lifecycle', 'provisioner', 'connection'].includes(x.tipo)) (o[x.tipo] = o[x.tipo] || []).push(evaluarCuerpo(x.body, ctx));
    }
    return o;
  }

  // Referencias a otros recursos dentro de una expresión (para el orden de creación)
  function dependencias(nodo, acc = new Set()) {
    if (!nodo || typeof nodo !== 'object') return acc;
    if (Array.isArray(nodo)) { nodo.forEach((n) => dependencias(n, acc)); return acc; }
    if (nodo.e === 'attr' || nodo.e === 'idx') {
      let n = nodo; const cadena = [];
      while (n.e === 'attr' || n.e === 'idx') { cadena.unshift(n); n = n.x; }
      if (n.e === 'ref') {
        if (n.n === 'module' && cadena[0] && cadena[0].n) acc.add(`module.${cadena[0].n}`);
        else if (n.n === 'data' && cadena[1]) acc.add(`data.${cadena[0].n}.${cadena[1].n}`);
        else if (!['var', 'local', 'count', 'each', 'path', 'terraform', 'self'].includes(n.n) && cadena[0] && cadena[0].n) acc.add(`${n.n}.${cadena[0].n}`);
      }
    }
    for (const v of Object.values(nodo)) if (v && typeof v === 'object') dependencias(v, acc);
    return acc;
  }

  // ======================================================================= planificación
  // Evalúa la configuración (con sus módulos) y devuelve las instancias deseadas, en orden de dependencias
  function planificar(dir, opciones, estado, prefijo = '', varsModulo = null, raiz = null, depsExtra = []) {
    const cfg = cargarModulo(dir);
    const vars = varsModulo || valoresVariables(cfg, opciones);
    const ctx = { vars, locals: {}, recursos: {}, modulos: {}, dir, raiz: raiz || dir, workspace: opciones.workspace };
    // la configuración de un proveedor puede usar locals o data sources: se evalúa la primera vez que se necesita
    const provs = {};
    for (const [n, b] of Object.entries(cfg.proveedores)) {
      let memo = null;
      Object.defineProperty(provs, n, { enumerable: true, get: () => (memo = memo || evaluarCuerpo(b.body, Object.assign(Object.create(ctx), { file: b.file }))) });
    }
    // locals pueden depender entre sí: se resuelven en varias pasadas
    const pendientes = [...cfg.locals];
    let vueltas = 0;
    while (pendientes.length && vueltas++ < 50) {
      for (let i = 0; i < pendientes.length; i++) {
        const l = pendientes[i];
        try { ctx.locals[l.nombre] = evaluar(l.expr, Object.assign(Object.create(ctx), { file: l.file })); pendientes.splice(i--, 1); } catch (e) { if (!/undeclared local|undeclared resource|undeclared module/.test(e.message)) throw e; }
      }
      if (pendientes.every((l) => !(l.nombre in ctx.locals))) break;
    }
    // los que dependen de recursos, data sources o módulos se calculan cuando alguien los usa (ya en orden de dependencias)
    for (const l of pendientes) {
      let memo; let listo = false;
      Object.defineProperty(ctx.locals, l.nombre, { enumerable: true, configurable: true, get: () => { if (!listo) { memo = evaluar(l.expr, Object.assign(Object.create(ctx), { file: l.file })); listo = true; } return memo; } });
    }
    const nodos = {};
    for (const r of cfg.recursos) nodos[`${r.etiquetas[0]}.${r.etiquetas[1]}`] = { tipo: 'resource', b: r };
    for (const d of cfg.datos) nodos[`data.${d.etiquetas[0]}.${d.etiquetas[1]}`] = { tipo: 'data', b: d };
    for (const m of cfg.modulos) nodos[`module.${m.etiquetas[0]}`] = { tipo: 'module', b: m };
    // dependencias de cada nodo (también las que entran por locals)
    const depsLocal = {};
    const localesUsados = (x) => (JSON.stringify(x).match(/"n":"local","line":\d+\},"n":"(\w+)"/g) || []).map((m) => m.match(/"n":"(\w+)"$/)[1]);
    for (const l of cfg.locals) depsLocal[l.nombre] = dependencias(l.expr);
    // transitivo: un local que usa otro local hereda sus dependencias
    for (let vuelta = 0; vuelta < 10; vuelta++) for (const l of cfg.locals) for (const otro of localesUsados(l.expr)) (depsLocal[otro] || []).forEach((d) => depsLocal[l.nombre].add(d));
    const depsProv = {};
    for (const [pn, b] of Object.entries(cfg.proveedores)) { const ds = dependencias(b.body); localesUsados(b.body).forEach((nom) => (depsLocal[nom] || []).forEach((d) => ds.add(d))); depsProv[pn] = ds; }
    const deps = {};
    for (const [k, n] of Object.entries(nodos)) {
      const s = dependencias(n.b.body);
      const usaLocals = JSON.stringify(n.b.body).match(/"n":"local","line":\d+\},"n":"(\w+)"/g) || [];
      usaLocals.forEach((m) => { const nom = m.match(/"n":"(\w+)"$/)[1]; (depsLocal[nom] || []).forEach((d) => s.add(d)); });
      const provNodo = n.tipo === 'module' ? null : proveedorDe(n.b.etiquetas[0]);
      for (const [pn, ds] of Object.entries(depsProv)) if (n.tipo === 'module' || pn === provNodo) ds.forEach((d) => d !== k && s.add(d));
      const dep = n.b.body.find((x) => x.k === 'attr' && x.nombre === 'depends_on');
      if (dep) for (const it of dep.expr.items || []) { const t = dependencias([{ e: 'attr', x: it, n: '_' }]); t.forEach((d) => s.add(d)); if (it.e === 'attr' && it.x.e === 'ref') s.add(`${it.x.n}.${it.n}`); }
      deps[k] = [...s].filter((d) => d !== k && nodos[d]);
      for (const d of s) if (!nodos[d] && !d.startsWith('module.') && !d.startsWith('data.') && CATALOGO[d.split('.')[0]] === undefined && d.split('.')[0].includes('_')) throw new ErrorHCL(`Reference to undeclared resource: A managed resource "${d.split('.')[0]}" "${d.split('.')[1]}" has not been declared in the root module.`, n.b.file, n.b.line);
    }
    // orden topológico
    const orden = []; const visto = {};
    const visitar = (k, pila = []) => {
      if (visto[k] === 2) return; if (visto[k] === 1) throw new ErrorHCL(`Cycle: ${[...pila, k].join(', ')}`, nodos[k].b.file, nodos[k].b.line);
      visto[k] = 1; deps[k].forEach((d) => visitar(d, [...pila, k])); visto[k] = 2; orden.push(k);
    };
    Object.keys(nodos).forEach((k) => visitar(k));
    const instancias = []; const salidas = {};
    for (const k of orden) {
      const n = nodos[k];
      if (n.tipo === 'module') {
        const a = Object.fromEntries(n.b.body.filter((x) => x.k === 'attr').map((x) => [x.nombre, x]));
        if (!a.source) throw new ErrorHCL('Missing required argument: The argument "source" is required.', n.b.file, n.b.line);
        const src = evaluar(a.source.expr, ctx);
        if (!/^\.\.?\//.test(src)) throw new ErrorHCL(`Module not installed: este simulador solo admite módulos locales (source = "./modules/…"), no "${src}"`, n.b.file, n.b.line);
        const mdir = Sh.norm(src, dir);
        if (!Sh.isDir(mdir)) throw new ErrorHCL(`Unreadable module directory: Unable to evaluate directory symlink: lstat ${src}: no such file or directory`, n.b.file, n.b.line);
        const mcfg = cargarModulo(mdir);
        // count / for_each también en módulos: una copia del módulo por clave
        let claves = [null];
        if (a.count && a.for_each) throw new ErrorHCL('Invalid combination of "count" and "for_each": The "count" and "for_each" meta-arguments are mutually-exclusive.', n.b.file, n.b.line);
        if (a.count) { const c = evaluar(a.count.expr, ctx); if (esDesc(c)) throw new ErrorHCL('Invalid count argument: The "count" value depends on resource attributes that cannot be determined until apply.', n.b.file, n.b.line); claves = Array.from({ length: Number(c) }, (_, i) => i); }
        if (a.for_each) {
          const fe = evaluar(a.for_each.expr, ctx);
          if (fe instanceof Desconocido || (Array.isArray(fe) && fe.some(esDesc))) throw new ErrorHCL('Invalid for_each argument: The "for_each" value depends on resource attributes that cannot be determined until apply.', n.b.file, n.b.line);
          claves = Array.isArray(fe) ? fe.map((x) => ({ key: x, value: x })) : Object.entries(fe).sort(([x], [y]) => (x < y ? -1 : x > y ? 1 : 0)).map(([kk, v]) => ({ key: kk, value: v }));
        }
        const salidasMod = [];
        for (const clave of claves) {
          const subc = Object.assign(Object.create(ctx), {});
          let pref = `${prefijo}module.${n.b.etiquetas[0]}`;
          if (a.count) { subc.count = { index: clave }; pref += `[${clave}]`; }
          if (a.for_each) { subc.each = clave; pref += `["${clave.key}"]`; }
          const entradas = {};
          for (const [nom, x] of Object.entries(a)) if (!['source', 'version', 'depends_on', 'providers', 'count', 'for_each'].includes(nom)) {
            if (!(nom in mcfg.variables)) throw new ErrorHCL(`Unsupported argument: An argument named "${nom}" is not expected here (el módulo no declara esa variable).`, n.b.file, x.line);
            entradas[nom] = evaluar(x.expr, subc);
          }
          for (const [nom, v] of Object.entries(mcfg.variables)) if (!(nom in entradas)) {
            if (v.attrs.default) entradas[nom] = evaluar(v.attrs.default.expr, { vars: {}, locals: {}, recursos: {}, dir: mdir });
            else throw new ErrorHCL(`Missing required argument: The argument "${nom}" is required, but no definition was found.`, n.b.file, n.b.line);
          }
          const sub = planificar(mdir, Object.assign({}, opciones, { proveedoresPadre: Object.assign({}, opciones.proveedoresPadre, provs) }), estado, `${pref}.`, entradas, raiz || dir, deps[k].map((d) => prefijo + d).concat(depsExtra));
          instancias.push(...sub.instancias);
          salidasMod.push([clave, sub.salidas]);
        }
        ctx.modulos[n.b.etiquetas[0]] = a.count ? salidasMod.map((x) => x[1]) : a.for_each ? Object.fromEntries(salidasMod.map(([c, v]) => [c.key, v])) : salidasMod[0][1];
        continue;
      }
      const [tipoR, nombreR] = n.tipo === 'data' ? n.b.etiquetas : n.b.etiquetas;
      const prov = proveedorDe(tipoR);
      const pcfg = provs[prov] || (opciones.proveedoresPadre || {})[prov] || {};
      if (n.tipo === 'data') {
        const f = DATOS[tipoR];
        if (!f) throw new ErrorHCL(`Invalid data source: The provider hashicorp/${prov} does not support data source "${tipoR}" (o este simulador no lo incluye).`, n.b.file, n.b.line);
        const args = evaluarCuerpo(n.b.body, ctx);
        let val; try { val = f(args, pcfg, dir); } catch (e) { throw new ErrorHCL(e.message, n.b.file, n.b.line); }
        ctx.recursos[k] = () => Object.assign({}, args, val);
        continue;
      }
      const cat = CATALOGO[tipoR];
      if (!PROVEEDORES[prov]) throw new ErrorHCL(`Missing required provider: This configuration requires provider "${prov}", but that provider isn't available.`, n.b.file, n.b.line);
      if (!cat) throw new ErrorHCL(`Invalid resource type: The provider ${PROVEEDORES[prov].fuente} does not support resource type "${tipoR}" (o este simulador no lo incluye).`, n.b.file, n.b.line);
      const a = Object.fromEntries(n.b.body.filter((x) => x.k === 'attr').map((x) => [x.nombre, x]));
      if (a.count && a.for_each) throw new ErrorHCL('Invalid combination of "count" and "for_each": The "count" and "for_each" meta-arguments are mutually-exclusive.', n.b.file, n.b.line);
      let claves = [null];
      if (a.count) { const c = evaluar(a.count.expr, ctx); if (esDesc(c) && opciones.soloValidar) claves = [0]; else if (esDesc(c)) throw new ErrorHCL('Invalid count argument: The "count" value depends on resource attributes that cannot be determined until apply.', n.b.file, n.b.line); if (!esDesc(c)) claves = Array.from({ length: Number(c) }, (_, i) => i); }
      if (a.for_each) {
        const fe = evaluar(a.for_each.expr, ctx);
        // en un mapa basta con conocer las claves: los valores pueden ser "known after apply"
        const feDesc = fe instanceof Desconocido || (Array.isArray(fe) ? fe.some(esDesc) : false);
        if (feDesc && opciones.soloValidar) { claves = [{ key: 'x', value: DESC }]; } else if (feDesc) throw new ErrorHCL('Invalid for_each argument: The "for_each" value depends on resource attributes that cannot be determined until apply.', n.b.file, n.b.line);
        if (Array.isArray(fe) && fe.some((x) => typeof x !== 'string')) throw new ErrorHCL('Invalid for_each argument: The given "for_each" argument value is unsuitable: "for_each" supports maps and sets of strings.', n.b.file, n.b.line);
        if (!feDesc) claves = Array.isArray(fe) ? fe.map((x) => ({ key: x, value: x })) : Object.entries(fe).sort(([x], [y]) => (x < y ? -1 : x > y ? 1 : 0)).map(([kk, v]) => ({ key: kk, value: v }));
      }
      const lc = n.b.body.find((x) => x.k === 'block' && x.tipo === 'lifecycle');
      const lcA = lc ? Object.fromEntries(lc.body.filter((x) => x.k === 'attr').map((x) => [x.nombre, x.expr])) : {};
      const ignorar = !lcA.ignore_changes ? [] : lcA.ignore_changes.e === 'ref' && lcA.ignore_changes.n === 'all' ? ['*'] : (lcA.ignore_changes.items || []).map((it) => (it.e === 'ref' ? it.n : it.e === 'tpl' ? it.partes.join('') : ''));
      const prevenir = lcA.prevent_destroy ? evaluar(lcA.prevent_destroy, ctx) === true : false;
      const antesDeBorrar = lcA.create_before_destroy ? evaluar(lcA.create_before_destroy, ctx) === true : false;
      const valores = [];
      for (const clave of claves) {
        const sub = Object.assign(Object.create(ctx), {});
        let dir2 = `${prefijo}${k}`;
        if (a.count) { sub.count = { index: clave }; dir2 += `[${clave}]`; }
        if (a.for_each) { sub.each = clave; dir2 += `["${clave.key}"]`; }
        const args = evaluarCuerpo(n.b.body, sub, ['count', 'for_each', 'depends_on', 'provider']);
        for (const r of cat.req) if (!(r in args)) throw new ErrorHCL(`Missing required argument: The argument "${r}" is required, but no definition was found.`, n.b.file, n.b.line);
        // refresh: si el objeto ya no existe en la nube (lo borraron a mano), Terraform lo vuelve a crear
        const borradoFuera = !!(estado.recursos[dir2] && !opciones.soloValidar && existente(tipoR, estado.recursos[dir2].calc.id) === false);
        const previoE = borradoFuera ? null : estado.recursos[dir2];
        if (cat.defecto) for (const [kk, vv] of Object.entries(cat.defecto(args))) if (!(kk in args)) args[kk] = previoE && kk in previoE.args ? previoE.args[kk] : vv;
        if (prov === 'aws') args._region = pcfg.region || 'us-east-1';
        if (prov === 'google') args._project = args.project || pcfg.project || 'academia-datos-dev';
        if (cat.validar && !esDesc(args)) { const err = cat.validar(args); if (err) throw new ErrorHCL(`invalid value: ${err}`, n.b.file, n.b.line); }
        const previo = previoE;
        // lifecycle.ignore_changes: para esos argumentos manda lo que ya existe, no el código
        if (previo && ignorar.length) for (const kk of Object.keys(Object.assign({}, args, previo.args))) if (!kk.startsWith('_') && (ignorar.includes('*') || ignorar.includes(kk))) { if (kk in previo.args) args[kk] = previo.args[kk]; else delete args[kk]; }
        let cambio = calcularCambio(cat, previo, args);
        if (previo && (opciones.replace || []).includes(dir2)) cambio = 'reemplazar';
        const calc = previo && cambio !== 'reemplazar' ? previo.calc : null;
        const inst = { direccion: dir2, tipo: tipoR, nombre: nombreR, args, previo, accion: cambio, calc, cat, dir, deps: deps[k].map((d) => prefijo + d).concat(depsExtra), sensibles: cat.sensible || [], prevenir, antesDeBorrar, file: n.b.file, line: n.b.line, borradoFuera, previoEstado: estado.recursos[dir2] };
        instancias.push(inst);
        const visible = Object.assign({}, args, calc || (opciones.simularApply ? cat.calc(Object.assign({}, args)) : conDesconocidos(cat, args)));
        delete visible._region; delete visible._project;
        valores.push([clave, visible]);
      }
      ctx.recursos[k] = () => {
        if (a.count) return valores.map((v) => v[1]);
        if (a.for_each) return Object.fromEntries(valores.map(([c, v]) => [c.key, v]));
        return valores[0][1];
      };
    }
    for (const [n, o] of Object.entries(cfg.outputs)) {
      if (!o.attrs.value) throw new ErrorHCL('Missing required argument: The argument "value" is required, but no definition was found.', o.file);
      salidas[n] = evaluar(o.attrs.value.expr, Object.assign(Object.create(ctx), { file: o.file }));
      if (!prefijo && o.attrs.sensitive && evaluar(o.attrs.sensitive.expr, ctx)) salidas['__sensible_' + n] = true;
    }
    return { instancias, salidas, cfg, provs, ctx };
  }
  function conDesconocidos(cat, args) {
    const muestra = cat.calc(Object.assign({}, args));
    return Object.fromEntries(Object.keys(muestra).map((k) => [k, DESC]));
  }
  function calcularCambio(cat, previo, args) {
    if (!previo) return 'crear';
    const limpio = (o) => JSON.stringify(Object.fromEntries(Object.entries(o).filter(([k]) => !k.startsWith('_')).sort()));
    if (limpio(previo.args) === limpio(args)) return 'nada';
    if ((cat.nuevo || []).some((k) => JSON.stringify(previo.args[k]) !== JSON.stringify(args[k]))) return 'reemplazar';
    return 'actualizar';
  }

  // ======================================================================= estado y backends
  function rutaEstado(dir, ws) { return ws && ws !== 'default' ? `${dir}/terraform.tfstate.d/${ws}/terraform.tfstate` : `${dir}/terraform.tfstate`; }
  function backendDe(dir) {
    const f = dir + '/.terraform/terraform.tfstate';
    const c = Sh.readFile(f); return c ? JSON.parse(c).backend : null;
  }
  function leerTextoEstado(b, ws) {
    if (b.type === 's3') { const bk = window.CloudSim.aws().buckets[b.config.bucket]; const o = bk && bk.objects[clave(b, ws)]; return o ? (typeof o === 'string' ? o : o.c) : null; }
    if (b.type === 'gcs') { const bk = window.CloudSim.gcp().buckets[b.config.bucket]; return bk ? bk.objects[clave(b, ws)] || null : null; }
    if (b.type === 'azurerm') { const sa = window.CloudSim.az().storage[b.config.storage_account_name]; const c = sa && sa.containers[b.config.container_name]; return c ? c.blobs[clave(b, ws)] || null : null; }
    return null;
  }
  function leerEstado(dir, ws) {
    const b = backendDe(dir);
    const txt = b ? leerTextoEstado(b, ws) : Sh.readFile(rutaEstado(dir, ws));
    if (!txt) return { version: 4, serial: 0, lineage: `${uid(8)}-${uid(4)}-${uid(4)}-${uid(4)}-${uid(12)}`, recursos: {}, salidas: {} };
    const j = JSON.parse(txt);
    const recursos = {};
    for (const r of j.resources || []) for (const i of r.instances) {
      const dir2 = (r.module ? r.module + '.' : '') + `${r.type}.${r.name}` + (i.index_key === undefined ? '' : typeof i.index_key === 'number' ? `[${i.index_key}]` : `["${i.index_key}"]`);
      recursos[dir2] = { tipo: r.type, args: i.attributes_args || {}, calc: i.attributes_calc || {}, deps: i.dependencies || [] };
    }
    return { version: 4, serial: j.serial, lineage: j.lineage, recursos, salidas: Object.fromEntries(Object.entries(j.outputs || {}).map(([k, v]) => [k, v])) };
  }
  const clave = (b, ws) => {
    // como los backends reales: s3 usa env:/<ws>/<key>, gcs <prefix>/<ws>.tfstate y azurerm <key>env:<ws>
    if (b.type === 'gcs') return `${b.config.prefix ? b.config.prefix + '/' : ''}${ws || 'default'}.tfstate`;
    const base = b.config.key || 'terraform.tfstate';
    if (!ws || ws === 'default') return base;
    return b.type === 'azurerm' ? `${base}env:${ws}` : `env:/${ws}/${base}`;
  };
  function guardarEstado(dir, ws, est) {
    const recursos = {};
    for (const [d, r] of Object.entries(est.recursos)) {
      const m = d.match(/^((?:module\.[\w-]+(?:\[[^\]]+\])?\.)*)([\w-]+)\.([\w-]+)(?:\[(.+)\])?$/);
      const mod = m[1].replace(/\.$/, '');
      const k = `${mod}|${m[2]}|${m[3]}`;
      recursos[k] = recursos[k] || { module: mod || undefined, mode: 'managed', type: m[2], name: m[3], provider: `provider["registry.terraform.io/${PROVEEDORES[proveedorDe(m[2])].fuente}"]`, instances: [] };
      const idx = m[4] === undefined ? undefined : /^\d+$/.test(m[4]) ? Number(m[4]) : JSON.parse(m[4]);
      const attrs = Object.assign({}, r.args, r.calc); delete attrs._region; delete attrs._project;
      recursos[k].instances.push(Object.assign(idx === undefined ? {} : { index_key: idx }, { schema_version: 0, attributes: attrs, attributes_args: r.args, attributes_calc: r.calc, dependencies: r.deps }));
    }
    const j = { version: 4, terraform_version: '1.10.3', serial: (est.serial || 0) + 1, lineage: est.lineage, outputs: est.salidas, resources: Object.values(recursos), check_results: null };
    const txt = JSON.stringify(j, null, 2);
    const b = backendDe(dir);
    if (b && b.type === 's3') window.CloudSim.aws().buckets[b.config.bucket].objects[clave(b, ws)] = { c: txt, m: now() };
    else if (b && b.type === 'gcs') window.CloudSim.gcp().buckets[b.config.bucket].objects[clave(b, ws)] = txt;
    else if (b && b.type === 'azurerm') window.CloudSim.az().storage[b.config.storage_account_name].containers[b.config.container_name].blobs[clave(b, ws)] = txt;
    else Sh.writeFile(rutaEstado(dir, ws), txt);
    Machine.save();
  }
  const workspaceActual = (dir) => (Sh.readFile(dir + '/.terraform/environment') || 'default').trim();

  // ======================================================================= salida del plan
  const C = { mas: (s) => col.ok(s), menos: (s) => col.err(s), tilde: (s) => col.warn(s), b: (s) => col.b(s), dim: (s) => col.dim(s) };
  function mostrarValor(v, sangria, sensible, signo) {
    if (sensible) return '(sensitive value)';
    if (v instanceof Desconocido) return '(known after apply)';
    if (v === null) return 'null';
    if (typeof v === 'string') return v.includes('\n') ? `<<-EOT\n${v.replace(/\n$/, '').split('\n').map((l) => ' '.repeat(sangria + 4) + l).join('\n')}\n${' '.repeat(sangria + 2)}EOT` : JSON.stringify(v);
    if (Array.isArray(v)) { if (!v.length) return '[]'; return '[\n' + v.map((x) => ' '.repeat(sangria + 4) + (signo ? signo + ' ' : '') + mostrarValor(x, sangria + 2, false, signo) + ',').join('\n') + '\n' + ' '.repeat(sangria + 2) + ']'; }
    if (typeof v === 'object') { const ks = Object.keys(v).sort(); if (!ks.length) return '{}'; const w = Math.max(...ks.map((k) => JSON.stringify(k).length)); return '{\n' + ks.map((k) => ' '.repeat(sangria + 4) + (signo ? signo + ' ' : '') + JSON.stringify(k).padEnd(w) + ' = ' + mostrarValor(v[k], sangria + 2, false, signo)).join('\n') + '\n' + ' '.repeat(sangria + 2) + '}'; }
    return String(v);
  }
  function bloquePlan(inst, accion) {
    const sim = { crear: C.mas('+'), destruir: C.menos('-'), actualizar: C.tilde('~'), reemplazar: inst.antesDeBorrar ? C.mas('+') + '/' + C.menos('-') : C.menos('-') + '/' + C.mas('+') }[accion];
    const textos = { crear: 'will be created', destruir: 'will be destroyed', actualizar: 'will be updated in-place', reemplazar: 'must be ' + C.menos('replaced') };
    const lineas = [`  ${C.b(`# ${inst.direccion} ${textos[accion]}`)}`, `  ${sim} resource "${inst.tipo}" "${inst.nombre}" {`];
    let attrs;
    if (accion === 'destruir') attrs = Object.assign({}, inst.previo.args, inst.previo.calc);
    else attrs = Object.assign({}, inst.args, accion === 'actualizar' ? inst.previo.calc : conDesconocidos(inst.cat, inst.args));
    delete attrs._region; delete attrs._project;
    const ks = Object.keys(attrs).sort();
    const w = Math.max(...ks.map((k) => k.length));
    for (const k of ks) {
      const sens = inst.sensibles.includes(k);
      if (accion === 'actualizar' || accion === 'reemplazar') {
        const antes = Object.assign({}, inst.previo.args, inst.previo.calc)[k];
        const despues = attrs[k];
        if (JSON.stringify(antes) === JSON.stringify(despues) && !(despues instanceof Desconocido)) continue;
        if (antes === undefined) { lineas.push(`      ${C.mas('+')} ${k.padEnd(w)} = ${mostrarValor(despues, 6, sens)}`); continue; }
        const fuerza = accion === 'reemplazar' && (inst.cat.nuevo || []).includes(k) ? C.menos(' # forces replacement') : '';
        const esMapa = (x) => x && typeof x === 'object' && !Array.isArray(x) && !(x instanceof Desconocido);
        if (esMapa(antes) && esMapa(despues) && !sens) {
          // como el Terraform real: un mapa cambiado se muestra clave por clave
          const cs = [...new Set([...Object.keys(antes), ...Object.keys(despues)])].sort();
          const wk = Math.max(...cs.map((c) => JSON.stringify(c).length));
          lineas.push(`      ${C.tilde('~')} ${k.padEnd(w)} = {`);
          for (const c of cs) {
            const q = JSON.stringify(c).padEnd(wk);
            if (!(c in antes)) lineas.push(`          ${C.mas('+')} ${q} = ${mostrarValor(despues[c], 10)}`);
            else if (!(c in despues)) lineas.push(`          ${C.menos('-')} ${q} = ${mostrarValor(antes[c], 10)} ${C.dim('-> null')}`);
            else if (JSON.stringify(antes[c]) !== JSON.stringify(despues[c])) lineas.push(`          ${C.tilde('~')} ${q} = ${mostrarValor(antes[c], 10)} -> ${mostrarValor(despues[c], 10)}`);
          }
          const iguales = cs.filter((c) => c in antes && c in despues && JSON.stringify(antes[c]) === JSON.stringify(despues[c])).length;
          if (iguales) lineas.push(C.dim(`            # (${iguales} unchanged element${iguales > 1 ? 's' : ''} hidden)`));
          lineas.push(`        }${fuerza}`);
          continue;
        }
        lineas.push(`      ${C.tilde('~')} ${k.padEnd(w)} = ${mostrarValor(antes, 6, sens)} -> ${mostrarValor(despues, 6, sens)}${fuerza}`);
        continue;
      }
      const s = accion === 'destruir' ? C.menos('-') : C.mas('+');
      lineas.push(`      ${s} ${k.padEnd(w)} = ${mostrarValor(attrs[k], 6, sens, s)}${accion === 'destruir' ? C.dim(' -> null') : ''}`);
    }
    if (accion === 'actualizar') lineas.push(C.dim('        # (los atributos sin cambios no se muestran)'));
    lineas.push('    }');
    return lineas.join('\n');
  }
  function textoPlan(plan, destruirTodo) {
    const acciones = plan.acciones;
    const n = { crear: 0, actualizar: 0, destruir: 0 };
    for (const a of acciones) { if (a.accion === 'crear') n.crear++; else if (a.accion === 'actualizar') n.actualizar++; else if (a.accion === 'destruir') n.destruir++; else if (a.accion === 'reemplazar') { n.crear++; n.destruir++; } }
    const out = [];
    const salidasCambian = Object.entries(plan.salidas).filter(([k, v]) => !k.startsWith('__') && JSON.stringify(plan.estado.salidas[k] && plan.estado.salidas[k].value) !== JSON.stringify(v));
    const borrados = (plan.instancias || []).filter((i) => i.borradoFuera);
    if (borrados.length) out.push('', C.b('Note: Objects have changed outside of Terraform'), '', 'Terraform detected the following changes made outside of Terraform since the last "terraform apply" which may have affected this plan:', '',
      ...borrados.map((i) => `  ${C.b(`# ${i.direccion} has been deleted`)}\n  ${C.menos('-')} resource "${i.tipo}" "${i.nombre}" {\n      ${C.menos('-')} id = ${JSON.stringify(i.previoEstado.calc.id)} ${C.dim('-> null')}\n        ${C.dim('# (los demás atributos no se muestran)')}\n    }\n`),
      plan.refrescar ? 'This is a refresh-only plan, so Terraform will not take any actions to undo these. If you were expecting these changes then you can apply this plan to record the updated values in the Terraform state without changing any remote objects.' : 'Unless you have made equivalent changes to your configuration, or ignored the relevant attributes using ignore_changes, the following plan may include actions to undo or respond to these changes.', '', col.dim('─'.repeat(70)));
    const textoMovidos = (plan.movidos || []).map(([a, b]) => `  ${C.b(`# ${a} has moved to ${b}`)}\n    resource "${b.split('.').slice(-2, -1)[0]}" "${b.split('.').pop().replace(/\[.*$/, '')}" {\n        ${C.dim('# (los atributos no cambian)')}\n    }\n`);
    if (!acciones.length && textoMovidos.length) {
      out.push('', 'Terraform will perform the following actions:', '', ...textoMovidos, C.b('Plan: 0 to add, 0 to change, 0 to destroy.'));
      return { texto: out.join('\n'), n };
    }
    if (!acciones.length) {
      out.push('', col.ok(C.b('No changes.')) + C.b(' Your infrastructure matches the configuration.'), '', 'Terraform has compared your real infrastructure against your configuration and found no differences, so no changes are needed.');
      if (salidasCambian.length) out.push('', 'Changes to Outputs:', ...salidasCambian.map(([k, v]) => `  ${C.mas('+')} ${k} = ${mostrarValor(v, 2, plan.salidas['__sensible_' + k])}`));
      return { texto: out.join('\n'), n };
    }
    const simbolos = [...new Set(acciones.map((a) => a.accion))];
    out.push('', 'Terraform used the selected providers to generate the following execution plan. Resource actions are indicated with the following symbols:');
    if (simbolos.includes('crear')) out.push(`  ${C.mas('+')} create`);
    if (simbolos.includes('actualizar')) out.push(`  ${C.tilde('~')} update in-place`);
    if (simbolos.includes('destruir')) out.push(`  ${C.menos('-')} destroy`);
    if (acciones.some((a) => a.accion === 'reemplazar' && !a.antesDeBorrar)) out.push(`${C.menos('-')}/${C.mas('+')} destroy and then create replacement`);
    if (acciones.some((a) => a.accion === 'reemplazar' && a.antesDeBorrar)) out.push(`${C.mas('+')}/${C.menos('-')} create replacement and then destroy`);
    out.push('', 'Terraform will perform the following actions:', '', ...textoMovidos);
    for (const a of acciones) out.push(bloquePlan(a, a.accion), '');
    out.push(C.b(`Plan: ${n.crear} to add, ${n.actualizar} to change, ${n.destruir} to destroy.`));
    if (salidasCambian.length && !destruirTodo) out.push('', 'Changes to Outputs:', ...salidasCambian.map(([k, v]) => `  ${C.mas('+')} ${k} = ${mostrarValor(v, 2, plan.salidas['__sensible_' + k])}`));
    return { texto: out.join('\n'), n };
  }

  // Calcula el plan completo: deseado vs. estado
  function calcularPlan(dir, opciones, destruir) {
    const ws = workspaceActual(dir);
    opciones.workspace = ws;
    const estado = leerEstado(dir, ws);
    // bloques moved: se renombra en el estado antes de comparar, así no se destruye y se vuelve a crear
    const movidos = [];
    for (const m of cargarModulo(dir).movidos) {
      for (const d of Object.keys(estado.recursos)) {
        if (d !== m.from && !d.startsWith(m.from + '[') && !d.startsWith(m.from + '.')) continue;
        const nueva = m.to + d.slice(m.from.length);
        if (estado.recursos[nueva]) continue;
        estado.recursos[nueva] = estado.recursos[d]; delete estado.recursos[d]; movidos.push([d, nueva]);
      }
    }
    let instancias = [], salidas = {};
    if (!destruir) ({ instancias, salidas } = planificar(dir, opciones, estado));
    else { try { instancias = planificar(dir, opciones, estado).instancias; } catch (e) { instancias = []; } }
    const protegidas = {};
    for (const i of instancias) if (i.prevenir) protegidas[i.direccion] = i;
    const frenar = (i) => { throw new ErrorHCL(`Instance cannot be destroyed: Resource ${i.direccion} has lifecycle.prevent_destroy set, but the plan calls for this resource to be destroyed. To avoid this error and continue with the plan, either disable lifecycle.prevent_destroy or reduce the scope of the plan using the -target flag.`, i.file, i.line); };
    if (destruir) {
      for (const d of Object.keys(estado.recursos)) if (protegidas[d] && (!opciones.target || !opciones.target.length || opciones.target.some((t) => d === t || d.startsWith(t + '[') || d.startsWith(t + '.')))) frenar(protegidas[d]);
      instancias = [];
    }
    const deseadas = new Set(instancias.map((i) => i.direccion));
    let acciones = instancias.filter((i) => i.accion !== 'nada');
    if (opciones.target && opciones.target.length) {
      const pasa = (d) => opciones.target.some((t) => d === t || d.startsWith(t + '[') || d.startsWith(t + '.'));
      acciones = acciones.filter((i) => pasa(i.direccion));
    }
    // a destruir: lo que está en el estado y ya no en la configuración (o todo, en destroy); orden inverso de creación
    const aDestruir = Object.entries(estado.recursos).filter(([d]) => !deseadas.has(d) && (!opciones.target || !opciones.target.length || opciones.target.some((t) => d === t || d.startsWith(t + '[') || d.startsWith(t + '.'))))
      .map(([d, r]) => ({ direccion: d, tipo: r.tipo, nombre: d.split('.').slice(-1)[0].replace(/\[.*$/, ''), previo: r, accion: 'destruir', cat: CATALOGO[r.tipo] || { calc: () => ({}) }, dir, sensibles: (CATALOGO[r.tipo] || {}).sensible || [] }))
;
    const ordenD = ordenDestruccion(aDestruir);
    acciones = acciones.concat(ordenD);
    for (const a of acciones) if (a.accion === 'reemplazar' && a.prevenir) frenar(a);
    return { acciones, salidas, estado, ws, instancias, movidos };
  }

  // se destruye primero lo que depende de otros (un contenedor antes que su cuenta, la cuenta antes que el grupo)
  function ordenDestruccion(lista) {
    const base = (d) => d.replace(/\[[^\]]*\]$/, '');
    const dependeDe = (y, x) => (y.previo.deps || []).some((d) => base(x.direccion) === d || base(x.direccion).startsWith(d + '.'));
    const quedan = [...lista]; const orden = [];
    while (quedan.length) {
      const i = quedan.findIndex((x) => !quedan.some((y) => y !== x && dependeDe(y, x)));
      orden.push(...quedan.splice(i < 0 ? 0 : i, 1));
    }
    return orden;
  }

  // Aplica el plan: crea/actualiza/borra en los simuladores y guarda el estado
  function aplicar(dir, plan) {
    const est = { serial: plan.estado.serial, lineage: plan.estado.lineage, recursos: Object.assign({}, plan.estado.recursos), salidas: {} };
    const lineas = [];
    const t0 = Date.now();
    const calculados = {};
    const resolverDesc = (args) => {
      // reemplaza valores desconocidos por los atributos ya calculados en esta misma ejecución
      const txt = JSON.stringify(args, (k, v) => (v instanceof Desconocido ? '__DESC__' : v));
      return txt.includes('__DESC__') ? null : args;
    };
    let errores = null;
    // Los argumentos con (known after apply) se reevalúan con un replan tras cada recurso creado
    for (const accion of ordenDestruccion(plan.acciones.filter((a) => a.accion === 'destruir' || a.accion === 'reemplazar'))) {
      const r = accion.previo; const cat = CATALOGO[r.tipo];
      lineas.push(`${accion.direccion}: Destroying... [id=${r.calc.id}]`);
      const err = cat && cat.borrar ? cat.borrar(r.args, r.calc, dir) : null;
      if (err) { errores = `${C.menos('Error:')} ${err}\n\n  with ${accion.direccion}`; break; }
      lineas.push(`${accion.direccion}: Destruction complete after ${(Math.random() * 2 + 0.3).toFixed(0)}s`);
      delete est.recursos[accion.direccion];
    }
    if (!errores) {
      let pendientes = plan.acciones.filter((a) => a.accion === 'crear' || a.accion === 'reemplazar' || a.accion === 'actualizar').map((a) => a.direccion);
      let vueltas = 0;
      while (pendientes.length && vueltas++ < 60) {
        const estadoParcial = { recursos: est.recursos, salidas: {} };
        const replan = planificar(dir, plan.opciones, estadoParcial).instancias;
        const sig = replan.find((i) => pendientes.includes(i.direccion) && (i.deps || []).every((d) => !pendientes.some((p) => p === d || p.startsWith(d + '[') || p.startsWith(d + '.'))));
        if (!sig) break;
        const args = resolverDesc(sig.args);
        if (!args) { pendientes = pendientes.filter((p) => p !== sig.direccion); continue; }
        const cat = sig.cat;
        const actualizar = sig.previo && !plan.acciones.find((a) => a.direccion === sig.direccion && a.accion === 'reemplazar');
        lineas.push(`${sig.direccion}: ${actualizar ? 'Modifying...' : 'Creating...'}${actualizar ? ` [id=${sig.previo.calc.id}]` : ''}`);
        const calc = actualizar ? Object.assign({}, sig.previo.calc) : cat.calc(Object.assign({}, args));
        const err = !actualizar && cat.crear ? cat.crear(args, dir, calc) : null;
        if (err) { errores = `${C.menos('Error:')} ${err}\n\n  with ${sig.direccion}`; break; }
        est.recursos[sig.direccion] = { tipo: sig.tipo, args, calc, deps: sig.deps || [] };
        calculados[sig.direccion] = calc;
        lineas.push(`${sig.direccion}: ${actualizar ? 'Modifications complete' : 'Creation complete'} after ${Math.max(1, Math.round(Math.random() * 3))}s [id=${calc.id}]`);
        pendientes = pendientes.filter((p) => p !== sig.direccion);
      }
    }
    // salidas con los valores finales
    let salidas = {};
    try { salidas = planificar(dir, plan.opciones, { recursos: est.recursos, salidas: {} }).salidas; } catch (e) { salidas = {}; }
    for (const [k, v] of Object.entries(salidas)) if (!k.startsWith('__')) est.salidas[k] = { value: v, type: tipoDe(v), sensitive: !!salidas['__sensible_' + k] };
    guardarEstado(dir, plan.ws, est);
    return { lineas, errores, est, segundos: Math.max(1, Math.round((Date.now() - t0) / 1000)) };
  }

  // ======================================================================= terraform test
  // Corre los bloques run de *.tftest.hcl (en la carpeta o en tests/). command = plan evalúa el plan;
  // command = apply (por defecto) simula el apply sin tocar la nube ni el estado real.
  function cmdTest(dir, o) {
    const archivos = Object.keys(Machine.fs).filter((k) => Machine.fs[k].t === 'f' && k.endsWith('.tftest.hcl') && (k.slice(dir.length + 1) === k.split('/').pop() || k.startsWith(dir + '/tests/'))).filter((k) => k.startsWith(dir + '/')).sort();
    if (!archivos.length) return ok(`${col.warn('Success!')} 0 passed, 0 failed.\n${col.dim('(no hay archivos .tftest.hcl en esta carpeta ni en tests/)')}`);
    const out = []; let pasan = 0; let fallan = 0;
    const ctx0 = { vars: {}, locals: {}, recursos: {}, dir };
    const atributos = (b) => Object.fromEntries(b.body.filter((x) => x.k === 'attr').map((x) => [x.nombre, x]));
    for (const f of archivos) {
      const nombre = f.slice(dir.length + 1);
      let bloques;
      try { bloques = parsearArchivo(Sh.readFile(f), nombre); } catch (err) { return fail(errorTexto(err)); }
      const globales = {};
      for (const b of bloques.filter((x) => x.k === 'block' && x.tipo === 'variables')) for (const a of b.body) if (a.k === 'attr') globales[a.nombre] = evaluar(a.expr, ctx0);
      out.push(`${nombre}... in progress`);
      let archivoFalla = false;
      for (const run of bloques.filter((x) => x.k === 'block' && x.tipo === 'run')) {
        const a = atributos(run);
        const vars = Object.assign({}, globales);
        for (const b of run.body.filter((x) => x.k === 'block' && x.tipo === 'variables')) for (const v of b.body) if (v.k === 'attr') vars[v.nombre] = evaluar(v.expr, ctx0);
        const comando = a.command ? (a.command.expr.n || evaluar(a.command.expr, ctx0)) : 'apply';
        const esperados = a.expect_failures ? (a.expect_failures.expr.items || []).map((it) => direccionDe(it)) : [];
        const errores = [];
        try {
          const r = planificar(dir, Object.assign({}, o, { varsTipadas: vars, simularApply: comando === 'apply', workspace: workspaceActual(dir) }), { recursos: {}, salidas: {} });
          const tctx = Object.assign(Object.create(r.ctx), { locales: { output: Object.fromEntries(Object.entries(r.salidas).filter(([k]) => !k.startsWith('__'))) }, file: nombre });
          for (const as of run.body.filter((x) => x.k === 'block' && x.tipo === 'assert')) {
            const aa = atributos(as);
            const c = evaluar(aa.condition.expr, tctx);
            if (esDesc(c)) errores.push(`Unknown condition value: The condition depends on values that are not known until apply (usa command = apply).\n\n  on ${nombre} line ${aa.condition.line}, in run "${run.etiquetas[0]}"`);
            else if (c !== true) errores.push(`Test assertion failed: ${aa.error_message ? evaluar(aa.error_message.expr, tctx) : 'la condición dio false'}\n\n  on ${nombre} line ${aa.condition.line}, in run "${run.etiquetas[0]}"`);
          }
          if (esperados.length) errores.push(`Missing expected failure: The checkable object, ${esperados[0]}, was expected to report an error but did not.`);
        } catch (err) {
          const esValidacion = /^Invalid value for variable/.test(err.message);
          if (!(esValidacion && esperados.some((x) => x.startsWith('var.')))) errores.push(String(err.message).split('\n\nThis was checked')[0]);
        }
        if (errores.length) { fallan++; archivoFalla = true; out.push(`  run "${run.etiquetas[0]}"... ${col.err('fail')}`); for (const er of errores) out.push(errorTexto(new ErrorHCL(er))); } else { pasan++; out.push(`  run "${run.etiquetas[0]}"... ${col.ok('pass')}`); }
      }
      out.push(`${nombre}... tearing down`, `${nombre}... ${archivoFalla ? col.err('fail') : col.ok('pass')}`);
    }
    out.push('', fallan ? `${col.err(C.b('Failure!'))} ${pasan} passed, ${fallan} failed.` : `${col.ok(C.b('Success!'))} ${pasan} passed, ${fallan} failed.`);
    return { out: out.join('\n'), code: fallan ? 1 : 0 };
  }

  // para import: lee el objeto real de la nube simulada (false si no existe, null si este tipo no se puede comprobar)
  function existente(tipo, id) {
    const nombre = String(id).split('/').pop();
    if (tipo === 'aws_s3_bucket') { const b = window.CloudSim.aws().buckets[id]; return b ? { bucket: id, tags: b.tags || {} } : false; }
    if (tipo === 'google_storage_bucket') { const b = window.CloudSim.gcp().buckets[nombre]; return b ? { name: nombre } : false; }
    if (tipo === 'azurerm_resource_group') { const g = window.CloudSim.az().groups[nombre]; return g ? { name: nombre, location: g.location, tags: g.tags || {} } : false; }
    if (tipo === 'azurerm_storage_account') { const sa = window.CloudSim.az().storage[nombre]; return sa ? { name: nombre } : false; }
    return null;
  }

  // ======================================================================= fmt
  function formatear(src) {
    const lineas = src.split('\n');
    let prof = 0; const out = [];
    for (let raw of lineas) {
      const l = raw.trim();
      if (!l) { out.push(''); continue; }
      const cierra = /^[}\]]/.test(l) ? 1 : 0;
      const nivel = Math.max(0, prof - cierra);
      out.push('  '.repeat(nivel) + l.replace(/\s*=\s*(?!=)/, (m) => (l.match(/^[\w"-]+\s*=/) ? ' = ' : m)));
      const sinStr = l.replace(/"(?:[^"\\]|\\.)*"/g, '""').replace(/#.*$|\/\/.*$/, '');
      prof += (sinStr.match(/[{[(]/g) || []).length - (sinStr.match(/[}\])]/g) || []).length;
      if (prof < 0) prof = 0;
    }
    // alinear los "=" de atributos consecutivos al mismo nivel
    const res = [...out];
    let i = 0;
    while (i < res.length) {
      const m = res[i].match(/^(\s*)([\w-]+|"[^"]+") = /);
      if (!m) { i++; continue; }
      let j = i; const grupo = [];
      while (j < res.length) { const mm = res[j].match(/^(\s*)([\w-]+|"[^"]+") = /); if (!mm || mm[1] !== m[1]) break; grupo.push(j); j++; }
      const w = Math.max(...grupo.map((g) => res[g].match(/^(\s*)([\w-]+|"[^"]+") = /)[2].length));
      for (const g of grupo) res[g] = res[g].replace(/^(\s*)([\w-]+|"[^"]+") = /, (x, sp, k) => `${sp}${k.padEnd(w)} = `);
      i = j;
    }
    return res.join('\n').replace(/\n{3,}/g, '\n\n').replace(/\s*$/, '\n');
  }

  // ======================================================================= comando terraform
  function errorTexto(e) {
    const [titulo, ...resto] = String(e.message).split(': ');
    const cuerpo = [C.b(titulo)];
    if (e.file) cuerpo.push('', `  on ${e.file}${e.line ? ` line ${e.line}` : ''}:`);
    if (resto.length) cuerpo.push('', ...resto.join(': ').split('\n'));
    return `\n${C.menos('╷')}\n${C.menos('│')} ${C.menos('Error:')} ` + cuerpo.join('\n').split('\n').map((l, i) => (i ? `${C.menos('│')} ${l}` : l)).join('\n') + `\n${C.menos('╵')}`;
  }
  function opcionesDe(a) {
    const o = { vars: {}, varFiles: [], target: [], autoApprove: false };
    const pos = [];
    for (let i = 0; i < a.length; i++) {
      const x = a[i];
      let m;
      if ((m = x.match(/^-var=(.*)$/)) || (x === '-var' && (m = [null, a[++i]]))) { const [k, ...v] = String(m[1]).split('='); o.vars[k] = v.join('='); }
      else if ((m = x.match(/^-var-file=(.*)$/)) || (x === '-var-file' && (m = [null, a[++i]]))) o.varFiles.push(m[1]);
      else if ((m = x.match(/^-target=(.*)$/)) || (x === '-target' && (m = [null, a[++i]]))) o.target.push(m[1]);
      else if ((m = x.match(/^-out=(.*)$/))) o.out = m[1];
      else if ((m = x.match(/^-backend-config=(.*)$/)) || (x === '-backend-config' && (m = [null, a[++i]]))) (o.backendConfig = o.backendConfig || []).push(m[1]);
      else if (x === '-refresh-only' || x === '-detailed-exitcode' || x === '-force') o[x.slice(1)] = true;
      else if ((m = x.match(/^-replace=(.*)$/)) || (x === '-replace' && (m = [null, a[++i]]))) (o.replace = o.replace || []).push(m[1]);
      else if (x === '-auto-approve') o.autoApprove = true;
      else if (x === '-destroy') o.destruir = true;
      else if (x === '-json') o.json = true;
      else if (x === '-raw') o.raw = true;
      else if (x === '-check') o.check = true;
      else if (x === '-recursive') o.recursivo = true;
      else if (x === '-upgrade' || x === '-reconfigure' || x === '-migrate-state' || x === '-input=false' || x === '-no-color' || x === '-diff') o[x.slice(1)] = true;
      else if (/^-(lock|parallelism|lock-timeout)=/.test(x)) continue;
      else if (x.startsWith('-')) o.desconocida = x;
      else pos.push(x);
    }
    return { o, pos };
  }
  const necesitaInit = (dir) => !Sh.isDir(dir + '/.terraform') ? fail(`\n${C.menos('╷')}\n${C.menos('│')} ${C.menos('Error:')} ${C.b('Inconsistent dependency lock file')}\n${C.menos('│')}\n${C.menos('│')} The following dependency selections recorded in the lock file are inconsistent with the current configuration: no se ejecutó "terraform init" en esta carpeta.\n${C.menos('│')}\n${C.menos('│')} To make the initial dependency selections that will initialize the dependency lock file, run:\n${C.menos('│')}   terraform init\n${C.menos('╵')}`) : null;

  const AYUDA = `Usage: terraform [global options] <subcommand> [args]

Main commands:
  init          Prepare your working directory for other commands
  validate      Check whether the configuration is valid
  plan          Show changes required by the current configuration
  apply         Create or update infrastructure
  destroy       Destroy previously-created infrastructure

All other commands:
  fmt           Reformat your configuration in the standard style
  output        Show output values from your root module
  providers     Show the providers required for this configuration
  show          Show the current state or a saved plan
  force-unlock  Release a stuck lock on the current workspace
  import        Associate existing infrastructure with a Terraform resource
  test          Execute integration tests for Terraform modules
  state         Advanced state management (list, show, mv, rm, pull)
  version       Show the current Terraform version
  workspace     Workspace management (list, new, select, show)

${col.dim('(simulado en el navegador: lee tus archivos .tf y crea los recursos en las nubes simuladas)')}`;

  // Terraform usa las mismas credenciales que las CLIs: sin login, el proveedor falla como en la vida real
  function credenciales(plan, ctx) {
    const auto = ctx && ctx.opts && ctx.opts.autoLogin;
    const usados = new Set(plan.acciones.map((x) => proveedorDe(x.tipo)));
    const faltan = [];
    if (usados.has('aws')) { const s = window.CloudSim.aws(); if (!s.configured) { if (auto) s.configured = true; else faltan.push(['hashicorp/aws', 'No valid credential sources found', 'Please see https://registry.terraform.io/providers/hashicorp/aws for more information about providing credentials. (en la terminal: aws configure)']); } }
    if (usados.has('google')) { const s = window.CloudSim.gcp(); if (!s.account) { if (auto) { s.account = 'alumno@academia.dev'; s.project = s.project || 'academia-datos-dev'; } else faltan.push(['hashicorp/google', 'storage.NewClient() failed: dialing: google: could not find default credentials', 'See https://cloud.google.com/docs/authentication/external/set-up-adc for more information (en la terminal: gcloud auth application-default login)']); } }
    if (usados.has('azurerm')) { const s = window.CloudSim.az(); if (!s.logged) { if (auto) s.logged = true; else faltan.push(['hashicorp/azurerm', 'building account: unable to configure ResourceManagerAccount: subscription ID could not be determined and was not specified', 'Please run \'az login\' to setup account.']); } }
    if (!faltan.length) return null;
    const [p, t, d] = faltan[0];
    return fail(`\n${C.menos('╷')}\n${C.menos('│')} ${C.menos('Error:')} ${C.b(t)}\n${C.menos('│')}\n${C.menos('│')}   with provider["registry.terraform.io/${p}"]\n${C.menos('│')}\n${C.menos('│')} ${d}\n${C.menos('╵')}`);
  }

  def('terraform', 'infraestructura como código: init, fmt, validate, plan, apply, destroy, output, state', (a, ctx) => {
    const dir = Machine.cwd;
    const sub = a[0];
    const { o, pos } = opcionesDe(a.slice(1));
    if (!sub || sub === '-help' || sub === '--help' || sub === 'help') return ok(AYUDA);
    if (sub === 'version' || sub === '-version' || sub === '--version') return ok('Terraform v1.10.3\non linux_amd64' + Object.keys(leerLock(dir)).map((p) => `\n+ provider registry.terraform.io/${PROVEEDORES[p].fuente} v${PROVEEDORES[p].version}`).join(''));
    if (o.desconocida) return fail(`${C.menos('Error:')} flag provided but not defined: ${o.desconocida}`);
    try {
      switch (sub) {
        case 'init': return cmdInit(dir, o);
        case 'validate': {
          const e = necesitaInit(dir); if (e) return e;
          planificar(dir, Object.assign({}, o, { soloValidar: true }), { recursos: {} });
          return ok(`${col.ok(C.b('Success!'))} The configuration is valid.`);
        }
        case 'fmt': {
          const archivos = Object.keys(Machine.fs).filter((k) => Machine.fs[k].t === 'f' && k.startsWith(dir + '/') && /\.(tf|tfvars)$/.test(k) && (o.recursivo || !k.slice(dir.length + 1).includes('/'))).sort();
          const cambiados = [];
          for (const f of archivos) { const c = Sh.readFile(f); parsearArchivo(c, Sh.display(f)); const n = formatear(c); if (n !== c) { cambiados.push(f.slice(dir.length + 1)); if (!o.check) Sh.writeFile(f, n); } }
          Machine.save();
          return { out: cambiados.join('\n'), code: o.check && cambiados.length ? 3 : 0 };
        }
        case 'test': {
          const e = necesitaInit(dir); if (e) return e;
          return cmdTest(dir, o, pos);
        }
        case 'force-unlock': {
          if (!pos[0]) return fail('Usage: terraform [global options] force-unlock LOCK_ID');
          return ok(`${o.force ? '' : `${C.b('Do you really want to force-unlock?')}\n  Terraform will remove the lock on the remote state.\n  This will allow local Terraform commands to modify this state, even though it\n  may still be in use. Only 'yes' will be accepted to confirm.\n\n  ${C.b('Enter a value:')} yes\n\n`}${col.ok(C.b('Terraform state has been successfully unlocked!'))}\n\n${col.ok('The state has been unlocked, and Terraform commands should now be able to\nobtain a new lock on the remote state.')}`);
        }
        case 'plan': {
          const e = necesitaInit(dir); if (e) return e;
          const plan = calcularPlan(dir, o, o.destruir);
          if (o['refresh-only'] && plan.instancias.some((i) => i.borradoFuera)) { plan.refrescar = true; plan.acciones = []; const t = textoPlan(plan).texto.split(col.dim('─'.repeat(70)))[0]; return { out: lecturaEstado(plan) + t, code: o['detailed-exitcode'] ? 2 : 0 }; }
          if (o['refresh-only']) return ok(lecturaEstado(plan) + `\n${col.ok(C.b('No changes.'))}${C.b(' Your infrastructure still matches the configuration.')}\n\nTerraform has checked that the real remote objects still match the result of\nyour most recent changes, and found no differences.`);
          const sinCred = credenciales(plan, ctx); if (sinCred) return sinCred;
          const { texto } = textoPlan(plan, o.destruir);
          let extra = '';
          if (o.out) { Sh.writeFile(Sh.norm(o.out), JSON.stringify({ opciones: o, destruir: !!o.destruir, firma: firmaEstado(plan.estado) })); Machine.save(); extra = `\n\n${col.dim('─'.repeat(70))}\n\nSaved the plan to: ${o.out}\n\nTo perform exactly these actions, run the following command to apply:\n    terraform apply "${o.out}"`; }
          else if (plan.acciones.length) extra = `\n\n${col.dim('─'.repeat(70))}\n\nNote: You didn't use the -out option to save this plan, so Terraform can't guarantee to take exactly these actions if you run "terraform apply" now.`;
          return { out: lecturaEstado(plan) + texto + extra, code: o['detailed-exitcode'] && plan.acciones.length ? 2 : 0 };
        }
        case 'apply': case 'destroy': {
          const e = necesitaInit(dir); if (e) return e;
          let opciones = o, destruir = sub === 'destroy' || o.destruir, desdeArchivo = false;
          if (sub === 'apply' && pos[0]) {
            const c = Sh.readFile(Sh.norm(pos[0]));
            if (c === null) return fail(`${C.menos('Error:')} Failed to load "${pos[0]}" as a plan file`);
            const g = JSON.parse(c); opciones = g.opciones; destruir = g.destruir; desdeArchivo = true;
            if (g.firma !== firmaEstado(leerEstado(dir, workspaceActual(dir)))) return fail(`\n${C.menos('╷')}\n${C.menos('│')} ${C.menos('Error:')} ${C.b('Saved plan is stale')}\n${C.menos('│')}\n${C.menos('│')} The given plan file can no longer be applied because the state was changed by another operation after the plan was created.\n${C.menos('╵')}`);
          }
          const plan = calcularPlan(dir, opciones, destruir);
          plan.opciones = opciones;
          const sinCred = credenciales(plan, ctx); if (sinCred) return sinCred;
          const { texto, n } = textoPlan(plan, destruir);
          if (!plan.acciones.length && plan.movidos.length && !destruir) guardarEstado(dir, plan.ws, { serial: plan.estado.serial, lineage: plan.estado.lineage, recursos: plan.estado.recursos, salidas: plan.estado.salidas });
          if (!plan.acciones.length) return ok(lecturaEstado(plan) + texto + `\n\n${col.ok(C.b(`${destruir ? 'Destroy' : 'Apply'} complete! Resources: 0 ${destruir ? 'destroyed' : 'added, 0 changed, 0 destroyed'}.`))}`);
          const confirmacion = desdeArchivo || o.autoApprove ? '' : `\n\n${C.b(destruir ? 'Do you really want to destroy all resources?' : 'Do you want to perform these actions?')}\n  Terraform will perform the actions described above.\n  Only 'yes' will be accepted to approve.\n\n  ${C.b('Enter a value:')} yes ${col.dim('(el simulador confirma solo; en tu computadora tendrías que escribir yes)')}`;
          const r = aplicar(dir, plan);
          const fin = r.errores ? `\n\n${r.errores}` : `\n\n${col.ok(C.b(destruir ? `Destroy complete! Resources: ${n.destruir} destroyed.` : `Apply complete! Resources: ${n.crear} added, ${n.actualizar} changed, ${n.destruir} destroyed.`))}`;
          const salidas = !destruir && !r.errores && Object.keys(r.est.salidas).length ? `\n\n${col.ok(C.b('Outputs:'))}\n\n` + Object.entries(r.est.salidas).map(([k, v]) => `${k} = ${v.sensitive ? '<sensitive>' : mostrarValor(v.value, -2)}`).join('\n') : '';
          return { out: (desdeArchivo ? '' : lecturaEstado(plan) + texto + confirmacion + '\n\n') + r.lineas.join('\n') + fin + salidas, code: r.errores ? 1 : 0 };
        }
        case 'output': {
          const est = leerEstado(dir, workspaceActual(dir));
          const sal = est.salidas;
          if (!Object.keys(sal).length) return ok(`${col.warn('╷\n│ Warning: No outputs found')}\n│\n│ The state file either has no outputs defined, or all the defined outputs are empty. Please define an output in your configuration with the \`output\` keyword and run \`terraform refresh\` for it to become available.\n╵`);
          if (pos[0]) { const v = sal[pos[0]]; if (!v) return fail(`${C.menos('Error:')} Output "${pos[0]}" not found`); return ok(o.raw && typeof v.value !== 'object' ? String(v.value) : o.json ? JSON.stringify(v.value, null, 2) : mostrarValor(v.value, -2, v.sensitive && !o.raw)); }
          if (o.json) return ok(JSON.stringify(sal, null, 2));
          return ok(Object.entries(sal).map(([k, v]) => `${k} = ${v.sensitive ? '<sensitive>' : mostrarValor(v.value, -2)}`).join('\n'));
        }
        case 'state': {
          const ws = workspaceActual(dir); const est = leerEstado(dir, ws);
          if (pos[0] === 'list') { const ds = Object.keys(est.recursos).filter((d) => !pos[1] || d.startsWith(pos[1])); return ok(ds.join('\n')); }
          if (pos[0] === 'show') { const r = est.recursos[pos[1]]; if (!r) return fail(`${C.menos('Error:')} No instance found for the given address!\n\nThis command requires that the address references one specific instance.`); const at = Object.assign({}, r.args, r.calc); delete at._region; delete at._project; return ok(`# ${pos[1]}:\nresource "${r.tipo}" "${pos[1].split('.').pop().replace(/\[.*$/, '')}" {\n${Object.keys(at).sort().map((k) => `    ${k.padEnd(Math.max(...Object.keys(at).map((x) => x.length)))} = ${mostrarValor(at[k], 2, (CATALOGO[r.tipo] || {}).sensible && CATALOGO[r.tipo].sensible.includes(k))}`).join('\n')}\n}`); }
          if (pos[0] === 'rm') { if (!est.recursos[pos[1]]) return fail(`${C.menos('Error:')} Invalid target address: ${pos[1]}`); delete est.recursos[pos[1]]; guardarEstado(dir, ws, { serial: est.serial, lineage: est.lineage, recursos: est.recursos, salidas: est.salidas }); return ok(`Removed ${pos[1]}\nSuccessfully removed 1 resource instance(s).`); }
          if (pos[0] === 'pull') { const b = backendDe(dir); return ok((b ? leerTextoEstado(b, ws) : Sh.readFile(rutaEstado(dir, ws))) || ''); }
          if (pos[0] === 'mv') {
            const [, de, a2] = pos;
            if (!de || !a2) return fail('Usage: terraform state mv [options] SOURCE DESTINATION');
            const mover = Object.keys(est.recursos).filter((d) => d === de || d.startsWith(de + '[') || d.startsWith(de + '.'));
            if (!mover.length) return fail(`${C.menos('Error:')} Invalid source address\n\nCannot move ${de}: does not match anything in the current state.`);
            for (const d of mover) { const nueva = a2 + d.slice(de.length); if (est.recursos[nueva]) return fail(`${C.menos('Error:')} Invalid target address\n\nCannot move to ${nueva}: there is already a resource instance at that address in the current state.`); est.recursos[nueva] = est.recursos[d]; delete est.recursos[d]; }
            guardarEstado(dir, ws, { serial: est.serial, lineage: est.lineage, recursos: est.recursos, salidas: est.salidas });
            return ok(`Move "${de}" to "${a2}"\nSuccessfully moved ${mover.length} object(s).`);
          }
          return ok('Usage: terraform state <list|show|mv|rm|pull> [ADDRESS]');
        }
        case 'show': {
          const est = leerEstado(dir, workspaceActual(dir));
          if (!Object.keys(est.recursos).length) return ok('The state file is empty. No resources are represented.');
          return ok(Object.entries(est.recursos).map(([d, r]) => { const at = Object.assign({}, r.args, r.calc); delete at._region; delete at._project; const w = Math.max(...Object.keys(at).map((x) => x.length)); return `# ${d}:\nresource "${r.tipo}" "${d.split('.').pop().replace(/\[.*$/, '')}" {\n${Object.keys(at).sort().map((k) => `    ${k.padEnd(w)} = ${mostrarValor(at[k], 2)}`).join('\n')}\n}`; }).join('\n\n') + (Object.keys(est.salidas).length ? `\n\n\nOutputs:\n\n${Object.entries(est.salidas).map(([k, v]) => `${k} = ${v.sensitive ? '(sensitive value)' : mostrarValor(v.value, -2)}`).join('\n')}` : ''));
        }
        case 'providers': {
          const cfg = cargarModulo(dir);
          const usados = new Set(cfg.recursos.map((r) => proveedorDe(r.etiquetas[0])).concat(cfg.datos.map((r) => proveedorDe(r.etiquetas[0]))).concat(Object.keys(cfg.requeridos)));
          return ok(`\nProviders required by configuration:\n.\n${[...usados].map((p) => `├── provider[registry.terraform.io/${(PROVEEDORES[p] || { fuente: 'hashicorp/' + p }).fuente}]`).join('\n')}`);
        }
        case 'workspace': {
          const actual = workspaceActual(dir);
          const lista = ['default', ...Object.keys(Machine.fs).filter((k) => k.startsWith(dir + '/terraform.tfstate.d/') && Machine.fs[k].t === 'd' && k.split('/').length === dir.split('/').length + 2).map((k) => k.split('/').pop())];
          const extra = ((Machine.cloud.tfws || {})[dir] || []);
          const todos = [...new Set(lista.concat(extra))];
          if (!pos[0] || pos[0] === 'list') return ok(todos.map((w) => (w === actual ? '* ' : '  ') + w).join('\n'));
          if (pos[0] === 'show') return ok(actual);
          if (pos[0] === 'new') { if (todos.includes(pos[1])) return fail(`${C.menos('Error:')} Workspace "${pos[1]}" already exists`); if (!backendDe(dir)) Sh.mkdirp(`${dir}/terraform.tfstate.d/${pos[1]}`); Machine.cloud.tfws = Machine.cloud.tfws || {}; (Machine.cloud.tfws[dir] = Machine.cloud.tfws[dir] || []).push(pos[1]); Sh.writeFile(dir + '/.terraform/environment', pos[1]); Machine.save(); return ok(`${col.ok(`Created and switched to workspace "${pos[1]}"!`)}\n\nYou're now on a new, empty workspace. Workspaces isolate their state,\nso if you run "terraform plan" Terraform will not see any existing state\nfor this configuration.`); }
          if (pos[0] === 'select') { if (!todos.includes(pos[1])) return fail(`\nWorkspace "${pos[1]}" doesn't exist.\n\nYou can create this workspace with the "new" subcommand\nor include the "-or-create" flag with the "select" subcommand.`); Sh.writeFile(dir + '/.terraform/environment', pos[1]); Machine.save(); return ok(`Switched to workspace "${pos[1]}".`); }
          return ok('Usage: terraform workspace <list|show|new|select> [NAME]');
        }
        case 'console': return ok(col.dim('(terraform console no está disponible en el simulador: prueba tus expresiones en un output y ejecuta terraform plan)'));
        case 'import': {
          const e = necesitaInit(dir); if (e) return e;
          const [addr, id] = pos;
          if (!addr || !id) return fail('Usage: terraform [global options] import [options] ADDR ID');
          const ws = workspaceActual(dir); const est = leerEstado(dir, ws);
          if (est.recursos[addr]) return fail(errorTexto(new ErrorHCL(`Resource already managed by Terraform: Terraform is already managing a remote object for ${addr}. To import to this address you must first remove the existing object from the state.`)));
          const plan = planificar(dir, o, est);
          const inst = plan.instancias.find((i) => i.direccion === addr);
          if (!inst) return fail(errorTexto(new ErrorHCL(`resource address "${addr}" does not exist in the configuration.: Before importing this resource, please create its configuration in the root module. For example:\n\nresource "${addr.split('.')[0]}" "${(addr.split('.')[1] || '').replace(/\[.*$/, '')}" {\n  # (resource arguments)\n}`)));
          const sinCred = credenciales({ acciones: [inst] }, ctx); if (sinCred) return sinCred;
          const real = existente(inst.tipo, id);
          if (real === false) return fail(errorTexto(new ErrorHCL(`Cannot import non-existent remote object: While attempting to import an existing object to "${addr}", the provider detected that no object exists with the given id. Only pre-existing objects can be imported; check that the id is correct and that it is associated with the provider's configured region or endpoint, or use "terraform apply" to create a new remote object for this resource.`)));
          const args = Object.assign({}, inst.args);
          for (const [kk, vv] of Object.entries(real || {})) if (kk in inst.args || (vv && (typeof vv !== 'object' || Object.keys(vv).length))) args[kk] = vv;
          for (const [kk, vv] of Object.entries(args)) if (vv instanceof Desconocido) delete args[kk];
          const calc = Object.assign(inst.cat.calc(Object.assign({}, args)), { id });
          est.recursos[addr] = { tipo: inst.tipo, args, calc, deps: inst.deps || [] };
          guardarEstado(dir, ws, { serial: est.serial, lineage: est.lineage, recursos: est.recursos, salidas: est.salidas });
          return ok(`${addr}: Importing from ID "${id}"...\n${addr}: Import prepared!\n  Prepared ${inst.tipo} for import\n${addr}: Refreshing state... [id=${id}]\n\n${col.ok(C.b('Import successful!'))}\n\n${col.ok('The resources that were imported are shown above. These resources are now in\nyour Terraform state and will henceforth be managed by Terraform.')}`);
        }
        default: return fail(`Terraform has no command named "${sub}".\n\nTo see all of Terraform's top-level commands, run:\n  terraform -help`);
      }
    } catch (e) {
      if (e instanceof ErrorHCL) return fail(errorTexto(e));
      return fail(`${C.menos('Error:')} ${e.message}`);
    }
  });

  function firmaEstado(est) { return hashHex(JSON.stringify(est.recursos), 16); }
  function lecturaEstado(plan) {
    const ls = Object.keys(plan.estado.recursos).filter((d) => !plan.acciones.some((a) => a.direccion === d && a.accion === 'crear' && !a.borradoFuera));
    return ls.map((d) => `${d}: Refreshing state... [id=${plan.estado.recursos[d].calc.id}]`).join('\n') + (ls.length ? '\n' : '');
  }
  function leerLock(dir) {
    const c = Sh.readFile(dir + '/.terraform.lock.hcl'); if (!c) return {};
    return Object.fromEntries([...c.matchAll(/provider "registry\.terraform\.io\/[\w-]+\/([\w-]+)"/g)].map((m) => [m[1], true]).filter(([p]) => PROVEEDORES[p]));
  }

  function cmdInit(dir, o) {
    if (!archivosTf(dir).length) return ok(`Terraform initialized in an empty directory!\n\nThe directory has no Terraform configuration files. You may begin working\nwith Terraform immediately by creating Terraform configuration files.`);
    const cfg = cargarModulo(dir);
    const out = [C.b('Initializing the backend...')];
    // módulos locales
    const mods = [];
    const recorrer = (c, pref) => { for (const m of c.modulos) { const a = Object.fromEntries(m.body.filter((x) => x.k === 'attr').map((x) => [x.nombre, x])); const src = a.source ? evaluar(a.source.expr, { vars: {}, locals: {}, recursos: {}, dir: c.dir }) : ''; mods.push([pref + m.etiquetas[0], src]); const md = Sh.norm(src, c.dir); if (/^\.\.?\//.test(src) && Sh.isDir(md)) recorrer(cargarModulo(md), pref + m.etiquetas[0] + '.'); } };
    recorrer(cfg, '');
    let backend = null;
    if (cfg.backend) {
      const b = evaluarCuerpo(cfg.backend.body, { vars: {}, locals: {}, recursos: {}, dir });
      // -backend-config=clave=valor o -backend-config=archivo.tfbackend (configuración parcial)
      for (const bc of o.backendConfig || []) {
        if (/^[\w-]+=/.test(bc)) { const [k, ...v] = bc.split('='); b[k] = v.join('='); continue; }
        const c = Sh.readFile(Sh.norm(bc, dir));
        if (c === null) return fail(errorTexto(new ErrorHCL(`Failed to read file: The file "${bc}" could not be read.`)));
        for (const l of c.split('\n')) { const m = l.match(/^\s*([\w-]+)\s*=\s*"?([^"]*)"?\s*$/); if (m) b[m[1]] = /^(true|false)$/.test(m[2]) ? m[2] === 'true' : m[2]; }
      }
      if (cfg.backend.tipo === 's3') { if (!b.bucket || !b.key) throw new ErrorHCL('Missing required argument: The backend "s3" requires "bucket" and "key".', 'backend'); if (!window.CloudSim.aws().buckets[b.bucket]) return fail(`\n${C.menos('╷')}\n${C.menos('│')} ${C.menos('Error:')} ${C.b('Failed to get existing workspaces: S3 bucket "' + b.bucket + '" does not exist.')}\n${C.menos('│')}\n${C.menos('│')} The referenced S3 bucket must have been previously created. If the S3 bucket\n${C.menos('│')} was created within the last minute, please wait for a minute or two and try again.\n${C.menos('│')} ${col.dim('(créalo antes con: aws s3 mb s3://' + b.bucket + ')')}\n${C.menos('╵')}`); }
      if (cfg.backend.tipo === 'gcs') { if (!b.bucket) throw new ErrorHCL('Missing required argument: The backend "gcs" requires "bucket".', 'backend'); if (!window.CloudSim.gcp().buckets[b.bucket]) return fail(`\n${C.menos('╷')}\n${C.menos('│')} ${C.menos('Error:')} ${C.b('Failed to get existing workspaces: querying Cloud Storage failed: storage: bucket doesn\'t exist')}\n${C.menos('│')} ${col.dim('(créalo antes con: gcloud storage buckets create gs://' + b.bucket + ')')}\n${C.menos('╵')}`); }
      if (cfg.backend.tipo === 'azurerm') { const sa = window.CloudSim.az().storage[b.storage_account_name]; if (!sa || !sa.containers[b.container_name]) return fail(`\n${C.menos('╷')}\n${C.menos('│')} ${C.menos('Error:')} ${C.b('Failed to get existing workspaces: containers.Client#ListBlobs: Failure responding to request: StatusCode=404 -- Original Error: The specified container does not exist.')}\n${C.menos('│')} ${col.dim('(crea la cuenta de almacenamiento y el contenedor antes, con az storage account create y az storage container create)')}\n${C.menos('╵')}`); }
      if (!['s3', 'gcs', 'azurerm', 'local'].includes(cfg.backend.tipo)) throw new ErrorHCL(`Unsupported backend type: There is no backend type named "${cfg.backend.tipo}" en este simulador (usa s3, gcs, azurerm o local).`, 'backend');
      backend = { type: cfg.backend.tipo, config: b };
      const previo = backendDe(dir);
      if (previo && JSON.stringify(previo) !== JSON.stringify(backend) && !o.reconfigure && !o['migrate-state']) return fail(`\n${C.menos('╷')}\n${C.menos('│')} ${C.menos('Error:')} ${C.b('Backend configuration changed')}\n${C.menos('│')}\n${C.menos('│')} A change in the backend configuration has been detected, which may require migrating existing state.\n${C.menos('│')}\n${C.menos('│')} If you wish to attempt automatic migration of the state, use "terraform init -migrate-state".\n${C.menos('│')} If you wish to store the current configuration with no changes to the state, use "terraform init -reconfigure".\n${C.menos('╵')}`);
      if (cfg.backend.tipo !== 'local') out.push(`\nSuccessfully configured the backend "${cfg.backend.tipo}"! Terraform will automatically\nuse this backend unless the backend configuration changes.`);
      if (backend.type === 'local') backend = null;
    }
    if (mods.length) out.push(`${C.b('Initializing modules...')}`, ...mods.map(([n, s]) => `- ${n} in ${s.replace(/^\.\//, '')}`));
    out.push(C.b('Initializing provider plugins...'));
    const usados = new Set();
    const juntar = (c) => { c.recursos.forEach((r) => usados.add(proveedorDe(r.etiquetas[0]))); c.datos.forEach((r) => usados.add(proveedorDe(r.etiquetas[0]))); Object.keys(c.requeridos).forEach((p) => usados.add(p)); Object.keys(c.proveedores).forEach((p) => usados.add(p)); c.modulos.forEach((m) => { const a = Object.fromEntries(m.body.filter((x) => x.k === 'attr').map((x) => [x.nombre, x])); const md = Sh.norm(evaluar(a.source.expr, { vars: {}, locals: {}, recursos: {}, dir: c.dir }), c.dir); if (Sh.isDir(md)) juntar(cargarModulo(md)); }); };
    juntar(cfg);
    usados.delete('terraform');
    const desconocidos = [...usados].filter((p) => !PROVEEDORES[p]);
    if (desconocidos.length) return fail(out.join('\n') + `\n\n${C.menos('╷')}\n${C.menos('│')} ${C.menos('Error:')} ${C.b('Failed to query available provider packages')}\n${C.menos('│')}\n${C.menos('│')} Could not retrieve the list of available versions for provider hashicorp/${desconocidos[0]}: provider registry registry.terraform.io does not have a provider named registry.terraform.io/hashicorp/${desconocidos[0]}\n${C.menos('│')} ${col.dim('(proveedores disponibles en el simulador: ' + Object.keys(PROVEEDORES).filter((p) => p !== 'terraform').join(', ') + ')')}\n${C.menos('╵')}`);
    for (const p of usados) {
      const v = PROVEEDORES[p];
      const req = cfg.requeridos[p] ? evaluar(cfg.requeridos[p].expr, { vars: {}, locals: {}, recursos: {}, dir }) : null;
      const rango = req && typeof req === 'object' && req.version ? req.version : null;
      out.push(`- Finding ${v.fuente} versions matching "${rango || 'latest'}"...`);
    }
    for (const p of usados) out.push(`- Installing ${PROVEEDORES[p].fuente} v${PROVEEDORES[p].version}...`, `- Installed ${PROVEEDORES[p].fuente} v${PROVEEDORES[p].version} (signed by ${p === 'databricks' ? 'a HashiCorp partner' : 'HashiCorp'})`);
    Sh.mkdirp(dir + '/.terraform/providers');
    Sh.writeFile(dir + '/.terraform/terraform.tfstate', JSON.stringify({ version: 3, backend }));
    const lock = [...usados].sort().map((p) => `provider "registry.terraform.io/${PROVEEDORES[p].fuente}" {\n  version     = "${PROVEEDORES[p].version}"\n  constraints = "~> ${PROVEEDORES[p].version.split('.').slice(0, 2).join('.')}"\n  hashes = [\n    "h1:${btoa(hashHex(p, 32)).slice(0, 43)}=",\n  ]\n}\n`).join('\n');
    const lockNuevo = !Sh.exists(dir + '/.terraform.lock.hcl');
    Sh.writeFile(dir + '/.terraform.lock.hcl', `# This file is maintained automatically by "terraform init".\n# Manual edits may be lost in future updates.\n\n${lock}`);
    Machine.save();
    if (lockNuevo) out.push('Terraform has created a lock file .terraform.lock.hcl to record the provider\nselections it made above. Include this file in your version control repository\nso that Terraform can guarantee to make the same selections by default when\nyou run "terraform init" in the future.');
    out.push('', col.ok(C.b('Terraform has been successfully initialized!')), '', col.ok('You may now begin working with Terraform. Try running "terraform plan" to see\nany changes that are required for your infrastructure. All Terraform commands\nshould now work.'));
    return ok(out.join('\n'));
  }

  window.TerraformSim = { parsearArchivo, formatear, CATALOGO };
})();
