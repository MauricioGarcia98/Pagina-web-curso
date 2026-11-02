/*
 * GitHub Actions de práctica: lee los workflows de .github/workflows/*.yml del repositorio remoto
 * de la terminal y los ejecuta de verdad.
 *
 * - YAML: un analizador del subconjunto que usan los workflows (mapas, listas, | y >, comillas, [a, b]).
 *   Como YAML real, 3.10 sin comillas es el número 3.1 (el error clásico de python-version).
 * - Expresiones ${{ }}: github, env, vars, secrets, matrix, steps, runner; ==, !=, &&, ||, !,
 *   success(), failure(), always(), cancelled(), contains(), startsWith(), endsWith(), format(), toJSON().
 * - Runner: cada job copia el commit a /home/runner/work/<repo>/<repo> en el disco de la terminal y
 *   corre cada `run:` con la misma bash del curso (set -e como en Actions), con python y pytest reales.
 *   Los secretos se enmascaran con *** en el log.
 * - Acciones conocidas: checkout, setup-python, setup-node, cache, upload-artifact, download-artifact,
 *   configure-pages, upload-pages-artifact y deploy-pages. Las demás se marcan como no disponibles.
 */
(function () {
  'use strict';

  // ------------------------------------------------------------------ YAML
  function errorYaml(n, msg) { const e = new Error(msg); e.linea = n + 1; return e; }
  function quitarComentario(s) {
    let q = null;
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (q) { if (c === q) q = null; continue; }
      if (c === '"' || c === "'") { if (i === 0 || /[\s:[{,-]/.test(s[i - 1])) q = c; continue; }
      if (c === '#' && (i === 0 || /\s/.test(s[i - 1]))) return s.slice(0, i).replace(/\s+$/, '');
    }
    return s.replace(/\s+$/, '');
  }
  function partirFlujo(s) {
    const out = []; let cur = '', depth = 0, q = null;
    for (const c of s) {
      if (q) { cur += c; if (c === q) q = null; continue; }
      if (c === '"' || c === "'") { q = c; cur += c; continue; }
      if (c === '[' || c === '{') depth++;
      if (c === ']' || c === '}') depth--;
      if (c === ',' && !depth) { out.push(cur.trim()); cur = ''; continue; }
      cur += c;
    }
    if (cur.trim()) out.push(cur.trim());
    return out;
  }
  function escalar(v) {
    v = v.trim();
    if (v === '') return null;
    if (v[0] === '"') { if (!/"$/.test(v) || v.length < 2) throw new Error('comillas sin cerrar'); return v.slice(1, -1).replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\"/g, '"').replace(/\\\\/g, '\\'); }
    if (v[0] === "'") { if (!/'$/.test(v) || v.length < 2) throw new Error('comillas sin cerrar'); return v.slice(1, -1).replace(/''/g, "'"); }
    if (v[0] === '[') { if (!/\]$/.test(v)) throw new Error('falta cerrar ]'); return partirFlujo(v.slice(1, -1)).map(escalar); }
    if (v[0] === '{') {
      if (!/\}$/.test(v)) throw new Error('falta cerrar }');
      const o = {};
      for (const par of partirFlujo(v.slice(1, -1))) { const i = par.indexOf(':'); if (i < 0) throw new Error('se esperaba clave: valor'); o[escalar(par.slice(0, i))] = escalar(par.slice(i + 1)); }
      return o;
    }
    if (/^(true|True|TRUE)$/.test(v)) return true;
    if (/^(false|False|FALSE)$/.test(v)) return false;
    if (/^(null|Null|NULL|~)$/.test(v)) return null;
    if (/^-?\d+$/.test(v)) return Number(v);
    if (/^-?\d*\.\d+$/.test(v)) return Number(v);
    if (/^[&*]/.test(v)) throw new Error('las anclas y alias de YAML (& y *) no están en la práctica');
    return v;
  }
  function parseYaml(src) {
    const L = [];
    String(src).replace(/\r/g, '').replace(/\t/g, '  ').split('\n').forEach((raw, n) => {
      if (/^---\s*$/.test(raw) && !L.length) return;
      const t = quitarComentario(raw);
      if (!t.trim()) L.push({ blank: true, raw, n });
      else L.push({ ind: t.match(/^ */)[0].length, t: t.trim(), raw, n });
    });
    let i = 0;
    const sig = () => { while (i < L.length && L[i].blank) i++; return L[i]; };
    const esItem = (l) => l.t === '-' || l.t.startsWith('- ');
    const RE_CLAVE = /^("(?:[^"\\]|\\.)*"|'[^']*'|[^\s"'#][^:]*?)\s*:(?:\s+(.*))?$/;
    function bloque(ind) { const l = sig(); if (!l || l.ind < ind) return null; return esItem(l) ? secuencia(l.ind) : mapa(l.ind); }
    function mapa(ind) {
      const o = {};
      for (;;) {
        const l = sig();
        if (!l || l.ind < ind) break;
        if (l.ind > ind) throw errorYaml(l.n, 'sangría inesperada: esta línea tiene más espacios que las de su nivel');
        if (esItem(l)) break;
        const m = RE_CLAVE.exec(l.t);
        if (!m) throw errorYaml(l.n, `se esperaba "clave: valor" y hay "${l.t}"`);
        const k = m[1][0] === '"' || m[1][0] === "'" ? escalar(m[1]) : m[1];
        if (Object.prototype.hasOwnProperty.call(o, k)) throw errorYaml(l.n, `la clave "${k}" está repetida`);
        i++;
        try { o[k] = valor(m[2], ind, l); } catch (e) { if (e.linea) throw e; throw errorYaml(l.n, e.message); }
      }
      return o;
    }
    function valor(v, ind, l) {
      if (v === undefined || v === '') {
        const n = sig();
        if (!n) return null;
        if (n.ind > ind) return bloque(n.ind);
        if (n.ind === ind && esItem(n)) return secuencia(ind);
        return null;
      }
      if (/^[|>][-+]?$/.test(v)) return bloqueTexto(v, ind);
      return escalar(v);
    }
    function bloqueTexto(v, ind) {
      const lin = []; let base = null;
      while (i < L.length) {
        const l = L[i];
        const sang = l.raw.match(/^ */)[0].length;
        if (!l.raw.trim()) { lin.push(''); i++; continue; }
        if (sang <= ind) break;
        if (base === null) base = sang;
        lin.push(l.raw.slice(Math.min(base, sang)));
        i++;
      }
      while (lin.length && lin[lin.length - 1] === '') lin.pop();
      const fin = v.includes('-') ? '' : '\n';
      if (v[0] === '>') return lin.join('\n').replace(/([^\n])\n(?=[^\n ])/g, '$1 ') + fin;
      return lin.join('\n') + fin;
    }
    function secuencia(ind) {
      const a = [];
      for (;;) {
        const l = sig();
        if (!l || l.ind !== ind || !esItem(l)) break;
        const resto = l.t === '-' ? '' : l.t.slice(1).replace(/^\s+/, '');
        i++;
        if (!resto) { const n = sig(); a.push(n && n.ind > ind ? bloque(n.ind) : null); continue; }
        if (RE_CLAVE.test(resto) && !/^["'[{]/.test(resto.replace(/^("(?:[^"\\]|\\.)*"|'[^']*')\s*:.*/, 'k'))) {
          const off = l.ind + l.t.indexOf(resto);
          L.splice(i, 0, { ind: off, t: resto, raw: ' '.repeat(off) + resto, n: l.n });
          a.push(mapa(off));
          continue;
        }
        try { a.push(/^[|>][-+]?$/.test(resto) ? bloqueTexto(resto, ind) : escalar(resto)); } catch (e) { throw errorYaml(l.n, e.message); }
      }
      return a;
    }
    const l0 = sig();
    if (!l0) return null;
    const r = bloque(l0.ind);
    const resto = sig();
    if (resto) throw errorYaml(resto.n, 'sangría inesperada (¿una línea con menos espacios que la primera?)');
    return r;
  }

  // ------------------------------------------------------------------ expresiones ${{ }}
  function tokens(src) {
    const t = []; let i = 0;
    while (i < src.length) {
      const c = src[i];
      if (/\s/.test(c)) { i++; continue; }
      if (c === "'") { let j = i + 1, s = ''; while (j < src.length) { if (src[j] === "'" && src[j + 1] === "'") { s += "'"; j += 2; continue; } if (src[j] === "'") break; s += src[j++]; } t.push({ k: 'str', v: s }); i = j + 1; continue; }
      const op = /^(==|!=|<=|>=|&&|\|\||[!<>(),[\]])/.exec(src.slice(i));
      if (op) { t.push({ k: 'op', v: op[1] }); i += op[1].length; continue; }
      const num = /^-?\d+(\.\d+)?/.exec(src.slice(i));
      if (num) { t.push({ k: 'num', v: Number(num[0]) }); i += num[0].length; continue; }
      const id = /^[A-Za-z_][\w-]*(\.[\w-]+|\.\*|\[\d+\])*/.exec(src.slice(i));
      if (id) { t.push({ k: 'id', v: id[0] }); i += id[0].length; continue; }
      throw new Error(`carácter inesperado "${c}" en la expresión`);
    }
    return t;
  }
  function evaluar(src, ctx) {
    const t = tokens(src); let p = 0;
    const ver = (v) => t[p] && t[p].k === 'op' && t[p].v === v;
    const tomar = (v) => { if (!ver(v)) throw new Error(`se esperaba "${v}"`); p++; };
    const igual = (a, b) => { if (typeof a === 'string' && typeof b === 'string') return a.toLowerCase() === b.toLowerCase(); return a == b; }; // eslint-disable-line eqeqeq
    const verdad = (x) => !(x === false || x === 0 || x === '' || x === null || x === undefined);
    function o() { let a = y(); while (ver('||')) { p++; const b = y(); a = verdad(a) ? a : b; } return a; }
    function y() { let a = cmp(); while (ver('&&')) { p++; const b = cmp(); a = verdad(a) ? b : a; } return a; }
    function cmp() {
      let a = un();
      while (t[p] && t[p].k === 'op' && ['==', '!=', '<', '>', '<=', '>='].includes(t[p].v)) {
        const op = t[p++].v, b = un();
        a = op === '==' ? igual(a, b) : op === '!=' ? !igual(a, b) : op === '<' ? a < b : op === '>' ? a > b : op === '<=' ? a <= b : a >= b;
      }
      return a;
    }
    function un() { if (ver('!')) { p++; return !verdad(un()); } return prim(); }
    function prim() {
      const k = t[p++];
      if (!k) throw new Error('la expresión está incompleta');
      if (k.k === 'op' && k.v === '(') { const v = o(); tomar(')'); return v; }
      if (k.k === 'str' || k.k === 'num') return k.v;
      if (k.k === 'id') {
        if (k.v === 'true') return true;
        if (k.v === 'false') return false;
        if (k.v === 'null') return null;
        if (ver('(')) {
          p++; const args = [];
          while (!ver(')')) { args.push(o()); if (ver(',')) p++; else break; }
          tomar(')');
          return funcion(k.v, args, ctx);
        }
        return leer(ctx, k.v);
      }
      throw new Error(`no se esperaba "${k.v}"`);
    }
    const v = o();
    if (p < t.length) throw new Error(`sobra "${t[p].v}" en la expresión`);
    return v;
  }
  function leer(ctx, ruta) {
    const partes = ruta.replace(/\[(\d+)\]/g, '.$1').split('.');
    let v = ctx;
    for (const k of partes) {
      if (v === null || v === undefined) return '';
      if (k === '*') return v;
      v = v[k];
    }
    return v === undefined ? '' : v;
  }
  function funcion(n, a, ctx) {
    const f = n.toLowerCase();
    const s = (x) => (x === null || x === undefined ? '' : typeof x === 'object' ? JSON.stringify(x) : String(x));
    if (f === 'success') return ctx.__estado === 'success';
    if (f === 'failure') return ctx.__estado === 'failure';
    if (f === 'always') return true;
    if (f === 'cancelled') return false;
    if (f === 'contains') return Array.isArray(a[0]) ? a[0].some((x) => s(x).toLowerCase() === s(a[1]).toLowerCase()) : s(a[0]).toLowerCase().includes(s(a[1]).toLowerCase());
    if (f === 'startswith') return s(a[0]).toLowerCase().startsWith(s(a[1]).toLowerCase());
    if (f === 'endswith') return s(a[0]).toLowerCase().endsWith(s(a[1]).toLowerCase());
    if (f === 'format') return s(a[0]).replace(/\{(\d+)\}/g, (m, i) => s(a[Number(i) + 1]));
    if (f === 'join') return Array.isArray(a[0]) ? a[0].map(s).join(a[1] === undefined ? ',' : s(a[1])) : s(a[0]);
    if (f === 'tojson') return JSON.stringify(a[0], null, 2);
    if (f === 'fromjson') { try { return JSON.parse(s(a[0])); } catch (e) { throw new Error('fromJSON: el texto no es JSON válido'); } }
    if (f === 'hashfiles') return 'a1b2c3d4e5f6' + s(a[0]).length;
    throw new Error(`Unrecognized function: '${n}'`);
  }
  // reemplaza cada ${{ … }} de un texto
  function interpolar(texto, ctx) {
    return String(texto).replace(/\$\{\{([\s\S]*?)\}\}/g, (m, e) => {
      const v = evaluar(e.trim(), ctx);
      return v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
    });
  }
  // un if: puede venir con o sin ${{ }}
  function condicion(src, ctx) {
    if (src === undefined || src === null || src === '') return ctx.__estado === 'success';
    if (typeof src === 'boolean') return src;
    let e = String(src).trim();
    const m = /^\$\{\{([\s\S]*)\}\}$/.exec(e); if (m) e = m[1].trim();
    // como en Actions: si la condición no usa ninguna función de estado, se agrega success() &&
    const v = evaluar(e, ctx);
    const usaEstado = /\b(success|failure|always|cancelled)\s*\(/i.test(e);
    const ok = !(v === false || v === 0 || v === '' || v === null || v === undefined);
    return usaEstado ? ok : ok && ctx.__estado === 'success';
  }

  // ------------------------------------------------------------------ workflows
  // normaliza "on:" (texto, lista o mapa) → { push: {branches}, pull_request: {...}, workflow_dispatch: {...} }
  function eventos(on) {
    if (on === undefined || on === null) return {};
    if (typeof on === 'string') return { [on]: {} };
    if (Array.isArray(on)) return Object.fromEntries(on.map((e) => [e, {}]));
    if (typeof on === 'object') return Object.fromEntries(Object.entries(on).map(([k, v]) => [k, v || {}]));
    return {};
  }
  const patronRama = (p) => new RegExp('^' + String(p).replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*\*/g, '\u0000').replace(/\*/g, '[^/]*').replace(/\u0000/g, '.*') + '$');
  function coincideRama(filtro, rama) {
    if (!filtro || !filtro.length) return true;
    const lista = Array.isArray(filtro) ? filtro : [filtro];
    let ok = false;
    for (const f of lista) { const neg = String(f).startsWith('!'); if (patronRama(neg ? String(f).slice(1) : f).test(rama)) ok = !neg; }
    return ok;
  }
  function coincideRutas(filtro, cambiados) {
    if (!filtro || !cambiados) return true;
    const lista = Array.isArray(filtro) ? filtro : [filtro];
    return cambiados.some((ruta) => { let ok = false; for (const f of lista) { const neg = String(f).startsWith('!'); if (patronRama(neg ? String(f).slice(1) : f).test(ruta)) ok = !neg; } return ok; });
  }
  // los workflows de un snapshot: [{ archivo, nombre, def, error }]
  function workflows(snap) {
    return Object.keys(snap || {}).filter((k) => /^\.github\/workflows\/[^/]+\.ya?ml$/.test(k)).sort().map((archivo) => {
      try {
        const def = parseYaml(snap[archivo]);
        if (!def || typeof def !== 'object' || Array.isArray(def)) throw errorYaml(0, 'el archivo tiene que ser un mapa con on: y jobs:');
        const on = def.on !== undefined ? def.on : def.true;   // YAML 1.1 lee "on" como true
        if (on === undefined) throw errorYaml(0, "No event triggers defined in `on`");
        if (!def.jobs || typeof def.jobs !== 'object') throw errorYaml(0, "Required property is missing: jobs");
        for (const [id, j] of Object.entries(def.jobs)) {
          if (!j || typeof j !== 'object') throw errorYaml(0, `El job "${id}" está vacío`);
          if (!j['runs-on'] && !j.uses) throw errorYaml(0, `Required property is missing: runs-on (job "${id}")`);
          if (!j.uses && (!Array.isArray(j.steps) || !j.steps.length)) throw errorYaml(0, `Required property is missing: steps (job "${id}")`);
          for (const [k, st] of (j.steps || []).entries()) if (!st || (!st.run && !st.uses)) throw errorYaml(0, `El paso ${k + 1} del job "${id}" necesita run: o uses:`);
          const needs = [].concat(j.needs || []);
          for (const n of needs) if (!def.jobs[n]) throw errorYaml(0, `Job '${id}' depends on unknown job '${n}'`);
        }
        return { archivo, nombre: def.name || archivo.replace(/^\.github\/workflows\//, ''), def, on: eventos(on) };
      } catch (e) {
        return { archivo, nombre: archivo.replace(/^\.github\/workflows\//, ''), error: `${archivo}${e.linea ? '#L' + e.linea : ''}: ${e.message}`, on: {} };
      }
    });
  }
  // ¿qué workflows dispara este evento? evento: { tipo: 'push'|'pull_request'|'workflow_dispatch', rama, base, cambiados }
  function disparados(lista, ev) {
    return lista.filter((w) => {
      if (w.error) return ev.tipo === 'push' || ev.tipo === 'pull_request';   // un YAML roto también aparece como ejecución fallida
      const c = w.on[ev.tipo];
      if (c === undefined) return false;
      if (ev.tipo === 'push') { if (c['branches-ignore'] && coincideRama(c['branches-ignore'], ev.rama)) return false; return coincideRama(c.branches, ev.rama) && coincideRutas(c.paths, ev.cambiados); }
      if (ev.tipo === 'pull_request') return coincideRama(c.branches, ev.base) && coincideRutas(c.paths, ev.cambiados);
      return true;
    });
  }
  // expande strategy.matrix: [{ id, nombre, matrix }]
  function expandirMatriz(id, job, ctxBase) {
    const m = job.strategy && job.strategy.matrix;
    const nombreBase = job.name ? interpolarSeguro(job.name, ctxBase) : id;
    if (!m || typeof m !== 'object') return [{ id, nombre: nombreBase, matrix: {} }];
    const claves = Object.keys(m).filter((k) => k !== 'include' && k !== 'exclude');
    let combos = [{}];
    for (const k of claves) { const vals = Array.isArray(m[k]) ? m[k] : [m[k]]; combos = combos.flatMap((c) => vals.map((v) => ({ ...c, [k]: v }))); }
    if (Array.isArray(m.exclude)) combos = combos.filter((c) => !m.exclude.some((ex) => Object.entries(ex).every(([k, v]) => c[k] === v)));
    if (Array.isArray(m.include)) for (const inc of m.include) combos.push(inc);
    return combos.map((c) => ({ id, matrix: c, nombre: job.name ? interpolarSeguro(job.name, { ...ctxBase, matrix: c }) : `${id} (${Object.values(c).join(', ')})` }));
  }
  function interpolarSeguro(t, ctx) { try { return interpolar(t, ctx); } catch (e) { return String(t); } }

  // ------------------------------------------------------------------ runner
  let cola = Promise.resolve();
  const espera = (ms) => new Promise((r) => setTimeout(r, ms));
  const limpiar = (t) => String(t || '').replace(/\u0001[^\u0002]*\u0002|\u0003/g, '').replace(/\u0000CLEAR\n?/g, '');
  const ACCIONES = {
    'actions/checkout': (p) => [`Syncing repository: ${p.repoCompleto}`, 'Getting Git version info', `Initializing the repository`, `Fetching the repository`, `Determining the checkout info`, `/usr/bin/git checkout --progress --force ${p.sha}`, `HEAD is now at ${p.sha.slice(0, 7)} ${p.msg}`],
    'actions/setup-python': (p, w) => {
      const v = String(w['python-version'] === undefined ? '3.x' : w['python-version']);
      if (v === '3.1') return { error: `Version 3.1 with arch x64 not found\nThe list of all available versions can be found here: https://raw.githubusercontent.com/actions/python-versions/main/versions-manifest.json\n(práctica) ¿Escribiste python-version: 3.10 sin comillas? YAML lo lee como el número 3.1. Usa '3.10'.` };
      if (!/^3(\.\d+)?(\.x)?$|^3\.\d+\.\d+$/.test(v)) return { error: `Version ${v} with arch x64 not found` };
      return [`Installed versions`, `Successfully set up CPython (${/^3\.\d+$/.test(v) ? v + '.9' : '3.12.9'})`, col('(práctica) el runner usa Python 3.12 de Pyodide para cualquier versión 3.x')];
    },
    'actions/setup-node': (p, w) => [`Attempting to download ${w['node-version'] || '20'}...`, `Acquiring ${w['node-version'] || '20'}.18.0 - x64 from https://nodejs.org/dist`, 'Adding to the cache ...', `Done`],
    'actions/cache': (p, w) => [`Cache not found for input keys: ${w.key || 'default'}`],
    'actions/upload-artifact': 'artefacto',
    'actions/download-artifact': (p, w) => [`Downloading single artifact ${w.name || ''}`, 'Artifact download completed successfully.'],
    'actions/configure-pages': () => ['Configuring GitHub Pages'],
    'actions/upload-pages-artifact': 'pages',
    'actions/deploy-pages': 'deploy',
  };
  function col(t) { return '\u0001t-dim\u0002' + t + '\u0003'; }

  // ejecuta un workflow para un commit. Devuelve el objeto run (se va llenando mientras corre).
  // ctx: { Sh, repo:{owner,repo}, url, R, sha, rama, evento, actor, alCambiar(run), alTerminar(run) }
  function ejecutar(wf, ctx) {
    const R = ctx.R;
    R.runs = R.runs || [];
    const run = {
      id: Date.now() + Math.floor(Math.random() * 1000), n: R.runs.filter((x) => x.archivo === wf.archivo).length + 1,
      workflow: wf.nombre, archivo: wf.archivo, evento: ctx.evento, rama: ctx.rama, sha: ctx.sha, msg: ctx.msg || '', actor: ctx.actor || 'alumno', pr: ctx.pr || null,
      estado: 'queued', conclusion: null, creado: new Date().toISOString(), inicio: null, fin: null, jobs: [], artefactos: [], anotaciones: [],
    };
    R.runs.unshift(run);
    if (R.runs.length > 60) R.runs.length = 60;
    const aviso = () => { try { ctx.alCambiar && ctx.alCambiar(run); } catch (e) { /* la vista pudo cambiar */ } };
    aviso();
    cola = cola.then(() => correr(wf, run, ctx, aviso)).catch((e) => { run.estado = 'completed'; run.conclusion = 'failure'; run.anotaciones.push({ nivel: 'error', texto: String(e.message || e) }); aviso(); });
    return run;
  }

  async function correr(wf, run, ctx, aviso) {
    const { Sh, R } = ctx;
    const Machine = Sh.Machine;
    await espera(400);
    run.estado = 'in_progress'; run.inicio = new Date().toISOString(); aviso();
    if (wf.error) {
      run.estado = 'completed'; run.conclusion = 'failure'; run.fin = new Date().toISOString();
      run.anotaciones.push({ nivel: 'error', texto: `Invalid workflow file: ${wf.error}` });
      aviso(); finalizar(run, ctx); return;
    }
    const snap = (R.commits[ctx.sha] || {}).snap || {};
    const secretos = Object.fromEntries(Object.entries((R.config && R.config.secretos) || {}).map(([k, v]) => [k, v.valor]));
    const vars = Object.fromEntries(Object.entries((R.config && R.config.variables) || {}).map(([k, v]) => [k, v.valor]));
    const github = {
      repository: `${ctx.repo.owner}/${ctx.repo.repo}`, repository_owner: ctx.repo.owner, actor: run.actor, sha: ctx.sha,
      ref: `refs/heads/${ctx.rama}`, ref_name: ctx.rama, head_ref: run.evento === 'pull_request' ? ctx.rama : '', base_ref: run.evento === 'pull_request' ? ctx.base || '' : '',
      event_name: run.evento, run_id: String(run.id), run_number: String(run.n), workflow: wf.nombre, workspace: `/home/runner/work/${ctx.repo.repo}/${ctx.repo.repo}`, server_url: 'https://github.com',
      event: { head_commit: { message: run.msg }, pull_request: run.pr ? { number: run.pr, title: ctx.prTitulo || '' } : undefined },
    };
    const def = wf.def;
    const envWf = def.env || {};
    // jobs en orden según needs
    const ids = Object.keys(def.jobs);
    const resultado = {};
    for (const id of ids) for (const x of expandirMatriz(id, def.jobs[id], { github, env: envWf, vars, secrets: secretos })) run.jobs.push({ id, nombre: x.nombre, matrix: x.matrix, estado: 'queued', conclusion: null, pasos: [], inicio: null, fin: null });
    aviso();
    const hechos = new Set();
    let vueltas = 0;
    while (hechos.size < ids.length && vueltas++ < 50) {
      for (const id of ids) {
        if (hechos.has(id)) continue;
        const job = def.jobs[id];
        const needs = [].concat(job.needs || []);
        if (!needs.every((n) => hechos.has(n))) continue;
        const estadoNeeds = needs.every((n) => resultado[n] === 'success') ? 'success' : 'failure';
        const instancias = run.jobs.filter((j) => j.id === id);
        for (const inst of instancias) {
          const ctxJob = { github, env: { ...envWf, ...(job.env || {}) }, vars, secrets: secretos, matrix: inst.matrix, needs: Object.fromEntries(needs.map((n) => [n, { result: resultado[n] }])), runner: { os: 'Linux', arch: 'X64', temp: '/home/runner/work/_temp' }, __estado: estadoNeeds };
          let corre = true;
          try { corre = condicion(job.if, ctxJob); } catch (e) { inst.estado = 'completed'; inst.conclusion = 'failure'; inst.pasos.push({ nombre: 'Evaluate job condition', log: [`Error: ${e.message}`], conclusion: 'failure', ms: 0 }); continue; }
          if (!corre) { inst.estado = 'completed'; inst.conclusion = 'skipped'; aviso(); continue; }
          await correrJob(wf, run, inst, job, ctxJob, ctx, secretos, snap, aviso, Machine);
        }
        const concl = instancias.map((j) => j.conclusion);
        resultado[id] = concl.includes('failure') ? 'failure' : concl.every((c) => c === 'skipped') ? 'skipped' : 'success';
        hechos.add(id);
      }
    }
    const cs = run.jobs.map((j) => j.conclusion);
    run.conclusion = cs.includes('failure') ? 'failure' : cs.length && cs.every((c) => c === 'skipped') ? 'skipped' : 'success';
    run.estado = 'completed'; run.fin = new Date().toISOString();
    aviso(); finalizar(run, ctx);
  }
  function finalizar(run, ctx) { try { ctx.Sh.Machine.save(); } catch (e) { /* sin espacio */ } try { ctx.alTerminar && ctx.alTerminar(run); } catch (e) { /* la vista pudo cambiar */ } }

  async function correrJob(wf, run, inst, job, ctxJob, ctx, secretos, snap, aviso, Machine) {
    const Sh = ctx.Sh;
    inst.estado = 'in_progress'; inst.inicio = new Date().toISOString(); aviso();
    const repo = ctx.repo.repo;
    const raiz = `/home/runner/work/${repo}/${repo}`;
    const enmascarar = (t) => { let s = String(t); for (const v of Object.values(secretos)) if (v && String(v).length >= 3) s = s.split(String(v)).join('***'); return s; };
    const paso = (nombre) => { const p = { nombre, log: [], conclusion: null, ms: 0, estado: 'in_progress' }; inst.pasos.push(p); aviso(); return p; };
    const cerrar = (p, concl, t0) => { p.conclusion = concl; p.estado = 'completed'; p.ms = Date.now() - t0; aviso(); };
    // Set up job
    let t0 = Date.now();
    const pSet = paso('Set up job');
    pSet.log.push('Current runner version: \'2.322.0\'', 'Operating System', '  Ubuntu', '  24.04.1', '  LTS', 'Runner Image', `  Image: ${String(job['runs-on'] || 'ubuntu-latest')}`, '  Version: 20250105.1.0', 'GITHUB_TOKEN Permissions', '  Contents: read', '  Metadata: read', `Secret source: Actions`, `Prepare workflow directory`, `Prepare all required actions`, `Complete job name: ${inst.nombre}`);
    const rotulo = String(job['runs-on'] || '');
    if (!/ubuntu|linux|self-hosted/i.test(rotulo)) pSet.log.push(col(`(práctica) ${rotulo}: el runner de práctica siempre es Linux`));
    await espera(250); cerrar(pSet, 'success', t0);
    // espacio de trabajo con el commit
    const viejos = Object.keys(Machine.fs).filter((k) => k === `/home/runner/work/${repo}` || k.startsWith(`/home/runner/work/${repo}/`));
    for (const k of viejos) delete Machine.fs[k];
    Sh.mkdirp(raiz);
    let estado = 'success';
    const salidas = {};
    const steps = job.steps || [];
    let hizoCheckout = false;
    for (let k = 0; k < steps.length; k++) {
      const st = steps[k];
      const ctxPaso = { ...ctxJob, env: { ...ctxJob.env, ...(st.env || {}) }, steps: salidas, __estado: estado, job: { status: estado } };
      const nombre = interpolarSeguro(st.name || (st.uses ? `Run ${st.uses}` : `Run ${String(st.run).split('\n')[0]}`), ctxPaso);
      t0 = Date.now();
      const p = paso(nombre);
      let corre;
      try { corre = condicion(st.if, ctxPaso); } catch (e) { p.log.push(`Error: ${e.message}`); cerrar(p, 'failure', t0); estado = 'failure'; continue; }
      if (!corre) { p.log.push(col('Este paso se saltó: la condición if no se cumplió (o un paso anterior falló).')); cerrar(p, 'skipped', t0); continue; }
      let ok = true;
      try {
        if (st.uses) ok = await usarAccion(st, p, ctxPaso, { ctx, run, snap, raiz, Sh, Machine, alCheckout: () => { hizoCheckout = true; } });
        else ok = await correrScript(st, p, ctxPaso, { raiz, Sh, Machine, hizoCheckout, enmascarar, salidas, id: st.id });
      } catch (e) { p.log.push(`Error: ${e.message}`); ok = false; }
      p.log = p.log.map(enmascarar);
      if (!ok && st['continue-on-error']) { p.log.push(col('continue-on-error: true → el job sigue')); cerrar(p, 'failure', t0); continue; }
      cerrar(p, ok ? 'success' : 'failure', t0);
      if (!ok) { estado = 'failure'; run.anotaciones.push({ nivel: 'error', job: inst.nombre, texto: p.log.filter((l) => /^Error/.test(limpiar(l))).slice(-1)[0] || `Process completed with exit code 1.` }); }
    }
    const pFin = paso('Complete job');
    pFin.log.push('Cleaning up orphan processes');
    cerrar(pFin, 'success', Date.now());
    const borrar = Object.keys(Machine.fs).filter((k) => k === `/home/runner/work/${repo}` || k.startsWith(`/home/runner/work/${repo}/`));
    for (const k of borrar) delete Machine.fs[k];
    inst.estado = 'completed'; inst.conclusion = estado; inst.fin = new Date().toISOString(); aviso();
  }

  async function usarAccion(st, p, ctxPaso, o) {
    const uses = String(st.uses);
    const [nombre, ver] = uses.split('@');
    const w = {};
    for (const [k, v] of Object.entries(st.with || {})) w[k] = typeof v === 'string' ? interpolar(v, ctxPaso) : v;
    p.log.push(`Run ${uses}`);
    if (Object.keys(w).length) { p.log.push('  with:'); for (const [k, v] of Object.entries(w)) p.log.push(`    ${k}: ${v}`); }
    if (!ver && !/^\.\//.test(uses)) { p.log.push(`Error: ${uses}: falta la versión (por ejemplo ${uses}@v4)`); return false; }
    const A = ACCIONES[nombre];
    if (nombre === 'actions/checkout') {
      const snap = o.snap;
      for (const [ruta, txt] of Object.entries(snap)) { const dest = `${o.raiz}/${ruta}`; o.Sh.mkdirp(dest.slice(0, dest.lastIndexOf('/'))); o.Sh.writeFile(dest, txt); }
      o.alCheckout();
      p.log.push(...A({ repoCompleto: `${o.ctx.repo.owner}/${o.ctx.repo.repo}`, sha: o.ctx.sha, msg: String((o.ctx.R.commits[o.ctx.sha] || {}).msg || o.run.msg).split('\n')[0] }));
      await espera(200); return true;
    }
    if (A === 'artefacto') {
      const nombreArt = w.name || 'artifact', rutas = String(w.path || '').split('\n').map((x) => x.trim()).filter(Boolean);
      const archivos = {};
      for (const r of rutas) {
        const abs = r.startsWith('/') ? r : `${o.raiz}/${r.replace(/^\.\//, '')}`;
        for (const [k, v] of Object.entries(o.Machine.fs)) if (v.t === 'f' && (k === abs || k.startsWith(abs.replace(/\/$/, '') + '/'))) archivos[k.slice(o.raiz.length + 1)] = v.c;
      }
      if (!Object.keys(archivos).length) { if (w['if-no-files-found'] === 'error') { p.log.push(`Error: No files were found with the provided path: ${rutas.join(', ')}. No artifacts will be uploaded.`); return false; } p.log.push(`Warning: No files were found with the provided path: ${rutas.join(', ')}. No artifacts will be uploaded.`); return true; }
      o.run.artefactos.push({ nombre: nombreArt, archivos });
      p.log.push(`With the provided path, there will be ${Object.keys(archivos).length} file(s) uploaded`, `Artifact ${nombreArt} has been successfully uploaded! Final size is ${Object.values(archivos).join('').length} bytes.`);
      return true;
    }
    if (A === 'pages') {
      const dir = String(w.path || '_site').replace(/^\.\//, '').replace(/\/$/, '');
      const base = dir === '.' ? o.raiz : `${o.raiz}/${dir}`;
      const archivos = {};
      for (const [k, v] of Object.entries(o.Machine.fs)) if (v.t === 'f' && k.startsWith(base + '/') && !k.includes('/.git/')) archivos[k.slice(base.length + 1)] = v.c;
      if (!Object.keys(archivos).length) { p.log.push(`Error: tar: ${dir}: Cannot open: No such file or directory`); return false; }
      o.run.artefactos.push({ nombre: 'github-pages', archivos, pages: true });
      p.log.push(`Archive artifact`, `Upload artifact`, `Artifact github-pages has been successfully uploaded!`);
      return true;
    }
    if (A === 'deploy') {
      const art = o.run.artefactos.find((x) => x.pages);
      if (!art) { p.log.push('Error: No artifacts named "github-pages" were found for this workflow run. Ensure artifacts are uploaded with actions/upload-pages-artifact.'); return false; }
      const R = o.ctx.R; R.config = R.config || {};
      if (!R.config.pages || (R.config.pages.fuente !== 'actions' && !String(o.run.archivo).startsWith('dynamic/'))) { p.log.push('Error: Get Pages site failed. Please verify that the repository has Pages enabled and configured to build using GitHub Actions'); return false; }
      R.config.pages.sitio = art.archivos; R.config.pages.desplegado = new Date().toISOString();
      p.log.push('Fetching artifact metadata for "github-pages" in this workflow run', 'Creating Pages deployment with payload', `Reported success!`, `Your site is live at https://${o.ctx.repo.owner}.github.io/${o.ctx.repo.repo}/`);
      return true;
    }
    if (typeof A === 'function') {
      const r = A({}, w);
      if (r && r.error) { p.log.push(...String(r.error).split('\n').map((l, i) => (i === 0 ? 'Error: ' + l : l))); return false; }
      p.log.push(...r); await espera(150); return true;
    }
    p.log.push(col(`(práctica) la acción ${uses} no se ejecuta en el runner de práctica: el paso se da por bueno.`), `Warning: ${nombre} no está disponible en la práctica.`);
    return true;
  }

  async function correrScript(st, p, ctxPaso, o) {
    const { Sh, Machine } = o;
    let script;
    try { script = interpolar(String(st.run), ctxPaso); } catch (e) { p.log.push(`Error: The template is not valid. ${e.message}`); return false; }
    const lineas = script.replace(/\n$/, '').split('\n');
    p.log.push(`Run ${lineas[0]}${lineas.length > 1 ? ' …' : ''}`);
    for (const l of lineas) p.log.push(col('  ' + l));
    const shell = st.shell || 'bash';
    p.log.push(col(`  shell: /usr/bin/${shell} -e {0}`));
    const env = {};
    for (const [k, v] of Object.entries(ctxPaso.env || {})) env[k] = typeof v === 'string' ? interpolar(v, ctxPaso) : String(v);
    if (Object.keys(env).length) { p.log.push(col('  env:')); for (const [k, v] of Object.entries(env)) p.log.push(col(`    ${k}: ${v}`)); }
    if (shell !== 'bash' && shell !== 'sh') { p.log.push(`Error: el runner de práctica solo tiene bash (shell: ${shell})`); return false; }
    const dir = st['working-directory'] ? `${o.raiz}/${String(st['working-directory']).replace(/^\.\//, '')}` : o.raiz;
    if (!Object.keys(Machine.fs).some((k) => k === dir || k.startsWith(dir + '/')) && dir !== o.raiz) { p.log.push(`Error: An error occurred trying to start process '/usr/bin/bash' with working directory '${dir}'. No such file or directory`); return false; }
    // la misma bash de la terminal, en la carpeta del runner y con set -e (así corre Actions)
    const antes = { cwd: Machine.cwd, env: { ...Machine.env }, e: Sh.Shopt.e };
    const salidaFile = `${o.raiz}/../_github_output_${Date.now()}`;
    Object.assign(Machine.env, env, { CI: 'true', GITHUB_ACTIONS: 'true', GITHUB_WORKSPACE: o.raiz, GITHUB_REF_NAME: ctxPaso.github.ref_name, GITHUB_SHA: ctxPaso.github.sha, GITHUB_REPOSITORY: ctxPaso.github.repository, GITHUB_OUTPUT: salidaFile, RUNNER_OS: 'Linux' });
    Machine.cwd = dir; Sh.Shopt.e = true;
    let r;
    try { r = await Sh.runLine(script.replace(/\n$/, ''), { ci: true }); }
    finally {
      Machine.cwd = antes.cwd; Sh.Shopt.e = antes.e;
      for (const k of Object.keys(Machine.env)) if (!(k in antes.env)) delete Machine.env[k];
      Object.assign(Machine.env, antes.env);
    }
    const salida = limpiar(r.out);
    if (salida) p.log.push(...salida.split('\n'));
    // GITHUB_OUTPUT: echo "clave=valor" >> $GITHUB_OUTPUT
    const so = Sh.readFile(Sh.norm(salidaFile));
    if (so !== null) { if (o.id) { const outs = {}; for (const l of so.split('\n')) { const i = l.indexOf('='); if (i > 0) outs[l.slice(0, i)] = l.slice(i + 1); } o.salidas[o.id] = { outputs: outs, outcome: r.code ? 'failure' : 'success', conclusion: r.code ? 'failure' : 'success' }; } delete Machine.fs[Sh.norm(salidaFile)]; }
    else if (o.id) o.salidas[o.id] = { outputs: {}, outcome: r.code ? 'failure' : 'success', conclusion: r.code ? 'failure' : 'success' };
    if (!o.hizoCheckout && /\b(pytest|python3? [\w./-]+\.py|cat |ls )/.test(script)) p.log.push(col('(práctica) ojo: este job no hizo actions/checkout, así que la carpeta está vacía.'));
    if (r.code) { p.log.push(`Error: Process completed with exit code ${r.code}.`); return false; }
    return true;
  }

  window.GHActions = { parseYaml, evaluar, interpolar, condicion, workflows, disparados, ejecutar, eventos, coincideRama };
})();
