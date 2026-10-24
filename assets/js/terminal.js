/*
 * Terminal de práctica: una "máquina" Linux simulada en el navegador.
 *  - Sistema de archivos virtual persistente (localStorage) con datos del curso.
 *  - Bash: pipes, redirecciones, &&, ||, ;, variables, $(...), historial y autocompletado.
 *  - Comandos reales: python (Pyodide), sqlite3 (sql.js), dbt (Jinja + SQLite), airflow (mini-Airflow).
 *  - Simulación con estado de git, az, aws, gcloud/gsutil/bq y databricks (ver terminal-cloud.js).
 */
(function () {
  'use strict';

  const HOME = '/home/alumno';
  const KEY = 'academia-datos-maquina-v1';
  const S = (cls, txt) => `\u0001${cls}\u0002${txt}\u0003`; // marca de color
  const col = { dir: (t) => S('t-dir', t), ok: (t) => S('t-ok', t), err: (t) => S('t-err', t), warn: (t) => S('t-warn', t), dim: (t) => S('t-dim', t), b: (t) => S('t-b', t), info: (t) => S('t-info', t) };

  // ------------------------------------------------------------------ máquina
  const Machine = {
    fs: {}, cwd: HOME, env: {}, history: [], cloud: {}, git: {}, ready: false,
    load() {
      try {
        const d = JSON.parse(localStorage.getItem(KEY));
        if (d && d.v === 1) { Object.assign(this, d); this.ready = true; return; }
      } catch (e) { /* sin almacenamiento */ }
      this.reset();
    },
    save() {
      clearTimeout(this._t);
      this._t = setTimeout(() => {
        try { localStorage.setItem(KEY, JSON.stringify({ v: 1, fs: this.fs, cwd: this.cwd, env: this.env, history: this.history.slice(-300), cloud: this.cloud, git: this.git })); } catch (e) { /* lleno */ }
      }, 300);
    },
    reset() {
      this.fs = {}; this.cwd = HOME; this.history = []; this.cloud = {}; this.git = {};
      this.env = { HOME, USER: 'alumno', PATH: '/usr/local/bin:/usr/bin:/bin', SHELL: '/bin/bash', LANG: 'es_ES.UTF-8' };
      seedFiles();
      this.ready = true;
      this.save();
    },
  };

  // ------------------------------------------------------------- archivos semilla
  function seedFiles() {
    const w = (p, c) => writeFile(p, c);
    ['/', '/home', HOME, '/tmp', '/etc'].forEach((d) => { Machine.fs[d] = { t: 'd' }; });
    w(HOME + '/README.md', `# Bienvenido/a a tu máquina de práctica 🐧

Esta es una terminal Linux simulada. Todo lo que hagas queda guardado en tu navegador.

Prueba estos comandos:
  ls -la                         ver archivos
  cat datos/clientes.csv | head  ver las primeras líneas
  grep ERROR logs/pipeline.log   buscar errores en un log
  python scripts/resumen_ventas.py   ejecutar Python de verdad
  sqlite3                        abrir la base de datos del curso (escribe .tables)
  cd tienda_dbt && dbt run       construir modelos dbt de verdad
  airflow dags list              ver los DAGs de la carpeta dags/
  git init                       empezar un repositorio
  az login / aws configure / gcloud auth login / databricks auth login

Escribe "help" para ver todos los comandos.
`);
    const T = window.DataGen.build ? (window.Engines && window.Engines.SQL.tables) || window.DataGen.build() : {};
    const csv = (cols, rows) => [cols.join(','), ...rows.map((r) => r.map((v) => (v === null ? '' : /[",]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : v)).join(','))].join('\n') + '\n';
    if (T.clientes) {
      w(HOME + '/datos/clientes.csv', csv(['cliente_id', 'nombre', 'apellido', 'email', 'ciudad', 'pais', 'segmento'], T.clientes.rows.slice(0, 300).map((r) => [r[0], r[1], r[2], r[3], r[5], r[6], r[7]])));
      const totales = new Map();
      for (const d of T.detalle_pedidos.rows) totales.set(d[1], (totales.get(d[1]) || 0) + d[3] * d[4] * (1 - d[5]));
      const ped = T.pedidos.rows.filter((p) => p[3] >= '2024-12-01');
      w(HOME + '/datos/ventas_2024_12.csv', csv(['pedido_id', 'fecha', 'cliente_id', 'canal', 'estado', 'total'], ped.map((p) => [p[0], p[3], p[1], p[5], p[4], Math.round(totales.get(p[0]) * 100) / 100])));
    }
    const lines = [];
    let t = Date.UTC(2024, 11, 30, 2, 0, 0);
    const pasos = ['extraer_ventas', 'extraer_clientes', 'limpiar', 'cargar_silver', 'dbt_build', 'notificar'];
    for (let dia = 0; dia < 3; dia++) {
      for (const p of pasos) {
        const ts = new Date(t).toISOString().replace('T', ' ').slice(0, 19);
        lines.push(`${ts} INFO  [${p}] inicio`);
        if (p === 'extraer_ventas' && dia === 1) lines.push(`${ts} WARN  [${p}] la API respondió 429, reintentando en 30s`);
        if (p === 'cargar_silver' && dia === 2) lines.push(`${ts} ERROR [${p}] MERGE falló: duplicate key pedido_id=8812`);
        if (p === 'limpiar') lines.push(`${ts} INFO  [${p}] ${1200 + dia * 37} filas válidas, ${3 + dia} descartadas`);
        lines.push(`${ts} INFO  [${p}] fin (${(Math.abs(Math.sin(t)) * 50 + 3).toFixed(1)}s)`);
        t += 7 * 60000;
      }
      t += 86400000 - pasos.length * 7 * 60000;
    }
    lines.push('2025-01-01 02:41:10 ERROR [dbt_build] Compilation Error in model fct_ventas: ref("stg_pagos_v2") not found');
    w(HOME + '/logs/pipeline.log', lines.join('\n') + '\n');
    w(HOME + '/scripts/resumen_ventas.py', `"""Resume las ventas de diciembre por canal (lee datos/ventas_2024_12.csv)."""
import csv
from collections import defaultdict

totales = defaultdict(float)
pedidos = defaultdict(int)
with open("datos/ventas_2024_12.csv", encoding="utf-8") as f:
    for fila in csv.DictReader(f):
        if fila["estado"] == "cancelado":
            continue
        totales[fila["canal"]] += float(fila["total"])
        pedidos[fila["canal"]] += 1

print(f"{'canal':<10}{'pedidos':>10}{'ventas':>14}")
for canal in sorted(totales, key=totales.get, reverse=True):
    print(f"{canal:<10}{pedidos[canal]:>10}{totales[canal]:>14,.2f}")

with open("datos/resumen_canales.csv", "w", encoding="utf-8") as f:
    f.write("canal,pedidos,ventas\\n")
    for canal in totales:
        f.write(f"{canal},{pedidos[canal]},{totales[canal]:.2f}\\n")
print("\\n✔ Escribí datos/resumen_canales.csv")
`);
    w(HOME + '/dags/etl_ventas.py', `from datetime import datetime
from airflow import DAG
from airflow.operators.bash import BashOperator
from airflow.operators.python import PythonOperator


def validar(ti):
    filas = 1200
    print(f"validando {filas} filas")
    return filas


with DAG(
    dag_id="etl_ventas",
    start_date=datetime(2024, 1, 1),
    schedule="0 3 * * *",
    catchup=False,
    tags=["ventas"],
) as dag:
    extraer = BashOperator(task_id="extraer", bash_command="echo descargando ventas del {{ ds }}")
    validar_t = PythonOperator(task_id="validar", python_callable=validar)
    cargar = BashOperator(task_id="cargar", bash_command="echo cargando en silver")
    extraer >> validar_t >> cargar
`);
    w(HOME + '/tienda_dbt/dbt_project.yml', `name: tienda_dbt
version: "1.0.0"
profile: tienda

models:
  tienda_dbt:
    staging:
      +materialized: view
    marts:
      +materialized: table
`);
    w(HOME + '/tienda_dbt/models/staging/stg_ventas.sql', `-- Una fila por línea de pedido no cancelado, con el importe neto
select
    d.detalle_id,
    p.pedido_id,
    p.cliente_id,
    p.fecha_pedido,
    p.canal,
    d.producto_id,
    d.importe
from {{ ref('stg_detalle_pedidos') }} d
join {{ ref('stg_pedidos') }} p on p.pedido_id = d.pedido_id
where p.estado <> 'cancelado'
`);
    w(HOME + '/tienda_dbt/models/marts/ventas_por_canal.sql', `select
    canal,
    count(distinct pedido_id) as pedidos,
    round(sum(importe), 2)    as ventas
from {{ ref('stg_ventas') }}
group by canal
`);
    w(HOME + '/tienda_dbt/models/marts/top_clientes.sql', `{{ config(materialized='table') }}

select
    cliente_id,
    count(distinct pedido_id) as pedidos,
    round(sum(importe), 2)    as gasto
from {{ ref('stg_ventas') }}
group by cliente_id
order by gasto desc
limit 50
`);
    w(HOME + '/tienda_dbt/models/schema.yml', `version: 2
models:
  - name: ventas_por_canal
    columns:
      - name: canal
        data_tests: [unique, not_null]
  - name: top_clientes
    columns:
      - name: cliente_id
        data_tests: [unique, not_null]
`);
    w(HOME + '/.bashrc', '# configuración de la terminal\nexport EDITOR=code\n');
  }

  // --------------------------------------------------------------- utilidades FS
  function norm(path, base) {
    if (!path) return base || Machine.cwd;
    if (path === '~' || path.startsWith('~/')) path = HOME + path.slice(1);
    const parts = (path.startsWith('/') ? path : (base || Machine.cwd) + '/' + path).split('/');
    const out = [];
    for (const p of parts) {
      if (!p || p === '.') continue;
      if (p === '..') out.pop(); else out.push(p);
    }
    return '/' + out.join('/');
  }
  const exists = (p) => !!Machine.fs[p];
  const isDir = (p) => Machine.fs[p] && Machine.fs[p].t === 'd';
  const isFile = (p) => Machine.fs[p] && Machine.fs[p].t === 'f';
  const parent = (p) => p.replace(/\/[^/]+$/, '') || '/';
  const base = (p) => p.split('/').pop();
  function mkdirp(p) { const parts = p.split('/').filter(Boolean); let cur = ''; for (const x of parts) { cur += '/' + x; if (!Machine.fs[cur]) Machine.fs[cur] = { t: 'd' }; } }
  function writeFile(p, content, append = false) {
    mkdirp(parent(p));
    const prev = isFile(p) ? Machine.fs[p].c : '';
    Machine.fs[p] = { t: 'f', c: append ? prev + content : content, m: Date.now() };
  }
  const readFile = (p) => (isFile(p) ? Machine.fs[p].c : null);
  const children = (p) => {
    const pre = p === '/' ? '/' : p + '/';
    return Object.keys(Machine.fs).filter((k) => k !== p && k.startsWith(pre) && !k.slice(pre.length).includes('/')).map((k) => k.slice(pre.length)).sort();
  };
  const display = (p) => (p === HOME ? '~' : p.startsWith(HOME + '/') ? '~' + p.slice(HOME.length) : p);
  function glob(pattern) {
    if (!/[*?]/.test(pattern)) return [pattern];
    const abs = norm(pattern);
    const dir = parent(abs), pat = base(abs);
    const re = new RegExp('^' + pat.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
    const m = children(dir).filter((n) => re.test(n) && !n.startsWith('.'));
    if (!m.length) return [pattern];
    const rel = pattern.includes('/') ? pattern.slice(0, pattern.lastIndexOf('/') + 1) : '';
    return m.map((n) => rel + n);
  }

  // ------------------------------------------------------------------ parser
  function tokenize(src) {
    const toks = [];
    let cur = '', q = null, has = false;
    for (let i = 0; i < src.length; i++) {
      const ch = src[i];
      if (q) {
        if (ch === q) { q = null; continue; }
        if (ch === '\\' && q === '"' && i + 1 < src.length) { cur += '$`"\\\n'.includes(src[i + 1]) ? src[++i] : ch; continue; }
        cur += ch; continue;
      }
      if (ch === "'" || ch === '"') { q = ch; has = true; continue; }
      if (ch === '\\' && i + 1 < src.length) { cur += src[++i]; has = true; continue; }
      if (/\s/.test(ch)) { if (cur || has) toks.push(cur); cur = ''; has = false; continue; }
      if (ch === '>' ) { if (cur || has) toks.push(cur); cur = ''; has = false; if (src[i + 1] === '>') { toks.push({ op: '>>' }); i++; } else toks.push({ op: '>' }); continue; }
      if (ch === '<') { if (cur || has) toks.push(cur); cur = ''; has = false; toks.push({ op: '<' }); continue; }
      cur += ch;
    }
    if (q) throw new Error('comillas sin cerrar');
    if (cur || has) toks.push(cur);
    return toks;
  }
  // divide respetando comillas y $(...) en operadores de control
  function splitTop(src, seps) {
    const parts = [];
    let cur = '', q = null, depth = 0;
    for (let i = 0; i < src.length; i++) {
      const ch = src[i];
      if (q) { cur += ch; if (ch === q) q = null; continue; }
      if (ch === "'" || ch === '"') { q = ch; cur += ch; continue; }
      if (ch === '$' && src[i + 1] === '(') { depth++; cur += '$('; i++; continue; }
      if (ch === ')' && depth) { depth--; cur += ch; continue; }
      if (!depth) {
        const sep = seps.find((s) => src.startsWith(s, i));
        if (sep) { parts.push({ text: cur, sep }); cur = ''; i += sep.length - 1; continue; }
      }
      cur += ch;
    }
    parts.push({ text: cur, sep: null });
    return parts;
  }
  async function expand(src, env, opts = {}) {
    // $(comando)
    let out = '', i = 0;
    while (i < src.length) {
      if (src[i] === "'") { const j = src.indexOf("'", i + 1); const end = j < 0 ? src.length : j + 1; out += src.slice(i, end); i = end; continue; }
      if (src[i] === '\\' && src[i + 1] === '$') { out += '\\$'; i += 2; continue; }   // \$ = $ literal (lo resuelve tokenize)
      if (src[i] === '$' && src[i + 1] === '(') {
        let depth = 1, j = i + 2;
        while (j < src.length && depth) { if (src[j] === '(') depth++; else if (src[j] === ')') depth--; j++; }
        const inner = src.slice(i + 2, j - 1);
        const r = await runLine(inner, Object.assign({}, opts, { capture: true }));
        // como en bash: si falla, el error se muestra (stderr) y no se pega dentro del comando
        if (r.code) { (opts._err = opts._err || []).push(r.out); }
        else out += r.out.replace(/\u0001[^\u0002]*\u0002|\u0003/g, '').replace(/\n+$/, '');
        i = j; continue;
      }
      if (src[i] === '$' && /[A-Za-z_{?]/.test(src[i + 1] || '')) {
        let j = i + 1, name;
        if (src[j] === '{') { const k = src.indexOf('}', j); name = src.slice(j + 1, k); j = k + 1; }
        else if (src[j] === '?') { name = '?'; j++; }
        else { while (j < src.length && /\w/.test(src[j])) j++; name = src.slice(i + 1, j); }
        out += env[name] !== undefined ? env[name] : '';
        i = j; continue;
      }
      out += src[i++];
    }
    return out;
  }

  // ------------------------------------------------------------- ejecución
  const Commands = {};
  const Help = {};
  function def(name, help, fn) { Commands[name] = fn; if (help) Help[name] = help; }
  const ok = (out = '') => ({ out, code: 0 });
  const fail = (out, code = 1) => ({ out: col.err(out), code });

  async function runSimple(text, stdin, opts) {
    const toks = tokenize(await expand(text, Machine.env, opts));
    // asignaciones VAR=valor: solas quedan en la sesión; delante de un comando valen solo para ese comando
    const temporales = {};
    while (toks.length && typeof toks[0] === 'string' && /^[A-Za-z_]\w*=/.test(toks[0])) {
      const [k, ...v] = toks.shift().split('=');
      if (!toks.length) { Object.assign(Machine.env, temporales, { [k]: v.join('=') }); Machine.save(); return ok(''); }
      temporales[k] = v.join('=');
    }
    if (!Object.keys(temporales).length) return runTokens(toks, stdin, opts, text);
    const antes = Object.fromEntries(Object.keys(temporales).map((k) => [k, Machine.env[k]]));
    Object.assign(Machine.env, temporales);
    try { return await runTokens(toks, stdin, opts, text); } finally {
      for (const [k, v] of Object.entries(antes)) { if (v === undefined) delete Machine.env[k]; else Machine.env[k] = v; }
    }
  }

  async function runTokens(toks, stdin, opts, text) {
    // redirecciones
    let redir = null, input = null;
    const args = [];
    for (let i = 0; i < toks.length; i++) {
      const t = toks[i];
      if (typeof t === 'object') {
        if (t.op === '<') input = toks[++i];
        else redir = { op: t.op, file: toks[++i] };
      } else args.push(...glob(t));
    }
    if (!args.length) return ok('');
    if (input) {
      const c = readFile(norm(input));
      if (c === null) return fail(`bash: ${input}: No existe el archivo o el directorio`);
      stdin = c;
    }
    let name = args[0];
    let fn = Commands[name];
    // ./script.sh o ruta a un script: se ejecuta con bash (si tiene permiso de ejecución)
    if (!fn && /^\.{0,2}\//.test(name) && isFile(norm(name)) && Commands.bash) {
      if (!Machine.fs[norm(name)].x) return fail(`bash: ${name}: Permiso denegado` + col.dim('\n(dale permiso de ejecución: chmod +x ' + name + ')'), 126);
      fn = Commands.bash; args.splice(1, 0, name); name = 'bash';
    }
    let res;
    if (!fn) res = { out: col.err(`bash: ${name}: comando no encontrado`) + (suggest(name) ? `\n¿Quisiste decir ${col.b(suggest(name))}?` : ''), code: 127 };
    else {
      try { res = await fn(args.slice(1), { stdin, opts, raw: text }); }
      catch (e) { res = fail(`${name}: ${e.message}`); }
    }
    res = res || ok('');
    if (redir) {
      if (!redir.file) return fail('bash: error de sintaxis cerca de la redirección');
      const p = norm(redir.file);
      if (isDir(p)) return fail(`bash: ${redir.file}: Es un directorio`);
      const plain = res.out.replace(/\u0001[^\u0002]*\u0002|\u0003/g, '');
      writeFile(p, plain && !plain.endsWith('\n') ? plain + '\n' : plain, redir.op === '>>');
      Machine.save();
      return { out: '', code: res.code };
    }
    return res;
  }
  function suggest(name) {
    const names = Object.keys(Commands);
    let best = null, bd = 3;
    for (const n of names) { const d = lev(name, n); if (d < bd) { bd = d; best = n; } }
    return best;
  }
  function lev(a, b) {
    const m = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) m[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return m[a.length][b.length];
  }
  async function runPipeline(text, opts) {
    const stages = splitTop(text, ['|']).map((p) => p.text);
    let stdin = null, res = ok('');
    for (const st of stages) {
      if (!st.trim()) return fail('bash: error de sintaxis cerca de `|`', 2);
      res = await runSimple(st.trim(), stdin, opts);
      stdin = res.out.replace(/\u0001[^\u0002]*\u0002|\u0003/g, '');
      if (stdin && !stdin.endsWith('\n')) stdin += '\n';
    }
    return res;
  }
  async function runLine(line, opts = {}) {
    const parts = splitTop(line, ['&&', '||', ';']);
    let out = [], last = ok(''), skip = false;
    for (const p of parts) {
      if (!skip && p.text.trim()) {
        last = await runPipeline(p.text.trim(), opts);
        if (opts._err && opts._err.length) { out.push(...opts._err.map((x) => x.replace(/\n$/, ''))); opts._err = []; }
        Machine.env['?'] = String(last.code);
        if (last.out) out.push(last.out.replace(/\n$/, ''));
        if (last.clear) out = ['\u0000CLEAR'];
      }
      if (p.sep === '&&') skip = last.code !== 0;
      else if (p.sep === '||') skip = last.code === 0;
      else skip = false;
    }
    return { out: out.join('\n'), code: last.code };
  }

  // ------------------------------------------------------------- flags helper
  function parseArgs(args, spec = {}) {
    // spec: { bool: ['-l','--all'], alias: {'-n': '--lines'} }
    const flags = {}, pos = [];
    for (let i = 0; i < args.length; i++) {
      let a = args[i];
      if (a === '--') { pos.push(...args.slice(i + 1)); break; }
      if (spec.attach && /^-[A-Za-z]./.test(a) && spec.attach.includes(a[1])) { flags['-' + a[1]] = a.slice(2); continue; }
      if (/^--?[A-Za-z]/.test(a) && !/^-\d/.test(a)) {
        let v = true;
        if (a.includes('=')) { [a, v] = [a.slice(0, a.indexOf('=')), a.slice(a.indexOf('=') + 1)]; }
        a = (spec.alias && spec.alias[a]) || a;
        // banderas cortas juntas (-ic, -rn, -la): si todas son booleanas, no consumen el siguiente argumento
        if (v === true && /^-[A-Za-z]{2,}$/.test(a) && [...a.slice(1)].every((ch) => (spec.bool || []).includes('-' + ch))) { for (const ch of a.slice(1)) flags['-' + ch] = true; continue; }
        if (v === true && !(spec.bool || []).includes(a) && i + 1 < args.length && !/^--?[A-Za-z]/.test(args[i + 1])) v = args[++i];
        if (/^-[A-Za-z]{2,}$/.test(a) && v === true) { for (const ch of a.slice(1)) flags['-' + ch] = true; continue; }
        if (flags[a] !== undefined && spec.multi && spec.multi.includes(a)) flags[a] = [].concat(flags[a], v); else flags[a] = v;
      } else pos.push(a);
    }
    return { flags, pos };
  }

  // ------------------------------------------------------------- comandos bash
  def('help', 'muestra esta ayuda', () => {
    const groups = {
      'Archivos y carpetas': ['pwd', 'ls', 'cd', 'mkdir', 'touch', 'cat', 'head', 'tail', 'less', 'wc', 'cp', 'mv', 'rm', 'tree', 'find', 'code'],
      'Texto': ['echo', 'grep', 'sort', 'uniq', 'cut', 'tr', 'jq'],
      'Sistema': ['clear', 'history', 'whoami', 'date', 'export', 'env', 'which', 'reset-maquina'],
      'Datos y programación': ['python', 'pip', 'sqlite3', 'git', 'dbt', 'airflow', 'curl'],
      'Nube': ['az', 'aws', 'gcloud', 'gsutil', 'bq', 'databricks'],
    };
    return ok(Object.entries(groups).map(([g, cs]) => col.b(g) + '\n' + cs.map((c) => `  ${col.info(c.padEnd(14))}${Help[c] || ''}`).join('\n')).join('\n\n') + `\n\n${col.dim('Atajos: ↑/↓ historial · Tab autocompleta · Ctrl+L limpia · Ctrl+C cancela la línea')}`);
  });
  def('pwd', 'muestra la carpeta actual', () => ok(Machine.cwd));
  def('whoami', 'tu usuario', () => ok('alumno'));
  def('date', 'fecha y hora', () => ok(new Date().toString()));
  def('clear', 'limpia la pantalla', () => ({ out: '', code: 0, clear: true }));
  def('true', '', () => ok(''));
  def('false', '', () => ({ out: '', code: 1 }));
  def('sleep', '', () => ok(''));
  def('reset-maquina', 'vuelve la máquina a su estado inicial', () => { Machine.reset(); return { out: col.ok('✔ Máquina reiniciada'), code: 0, clear: true }; });
  def('history', 'historial de comandos', () => ok(Machine.history.map((h, i) => `${String(i + 1).padStart(5)}  ${h}`).join('\n')));
  def('which', 'dónde está un comando', (a) => ok(a.map((n) => (Commands[n] ? `/usr/bin/${n}` : '')).filter(Boolean).join('\n')));
  def('export', 'define una variable de entorno', (a) => {
    if (!a.length) return ok(Object.entries(Machine.env).filter(([k]) => k !== '?').map(([k, v]) => `declare -x ${k}="${v}"`).join('\n'));
    for (const x of a) { const i = x.indexOf('='); if (i > 0) Machine.env[x.slice(0, i)] = x.slice(i + 1); }
    Machine.save(); return ok('');
  });
  def('env', 'variables de entorno', () => ok(Object.entries(Machine.env).filter(([k]) => k !== '?').map(([k, v]) => `${k}=${v}`).join('\n')));
  def('echo', 'imprime texto', (a) => {
    let n = false;
    if (a[0] === '-n') { n = true; a = a.slice(1); }
    if (a[0] === '-e') a = a.slice(1);
    return ok(a.join(' ').replace(/\\n/g, '\n') + (n ? '' : ''));
  });
  def('printf', 'imprime con formato: printf "a,b\\n1,2\\n" > archivo.csv', (a) => {
    if (!a.length) return fail('printf: uso: printf FORMATO [ARGUMENTOS...]');
    const fmt = a[0], args = a.slice(1);
    const esc = (t) => t.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\\\/g, '\\');
    let i = 0, out = '';
    do {
      out += esc(fmt).replace(/%[sdf%]/g, (m) => (m === '%%' ? '%' : args[i++] ?? ''));
    } while (i > 0 && i < args.length);
    return ok(out.replace(/\n$/, ''));
  });
  def('cd', 'cambia de carpeta', (a) => {
    const p = norm(a[0] === '-' ? Machine.env.OLDPWD || HOME : a[0] || HOME);
    if (!exists(p)) return fail(`bash: cd: ${a[0]}: No existe el archivo o el directorio`);
    if (!isDir(p)) return fail(`bash: cd: ${a[0]}: No es un directorio`);
    Machine.env.OLDPWD = Machine.cwd; Machine.cwd = p; Machine.save(); return ok('');
  });
  def('ls', 'lista archivos (-l detalle, -a ocultos)', (a) => {
    const { flags, pos } = parseArgs(a, { bool: ['-l', '-a', '-la', '-al', '-h', '-R', '-1'] });
    const long = flags['-l'] || flags['-la'] || flags['-al'];
    const all = flags['-a'] || flags['-la'] || flags['-al'];
    const targets = pos.length ? pos : ['.'];
    const outs = [];
    for (const t of targets) {
      const p = norm(t);
      if (!exists(p)) { outs.push(col.err(`ls: no se puede acceder a '${t}': No existe el archivo o el directorio`)); continue; }
      const names = isDir(p) ? children(p).filter((n) => all || !n.startsWith('.')) : [base(p)];
      const full = (n) => (isDir(p) ? (p === '/' ? '' : p) + '/' + n : p);
      if (targets.length > 1) outs.push(`${t}:`);
      if (long) {
        const rows = names.map((n) => {
          const f = Machine.fs[full(n)];
          const size = f.t === 'f' ? f.c.length : 4096;
          const d = new Date(f.m || Date.now());
          const fecha = d.toLocaleString('es', { month: 'short' }).slice(0, 3) + ' ' + String(d.getDate()).padStart(2) + ' ' + d.toTimeString().slice(0, 5);
          return `${f.t === 'd' ? 'drwxr-xr-x' : '-rw-r--r--'} 1 alumno alumno ${String(size).padStart(7)} ${fecha} ${f.t === 'd' ? col.dir(n) : n}`;
        });
        outs.push(`total ${names.length}\n` + rows.join('\n'));
      } else outs.push(names.map((n) => (isDir(full(n)) ? col.dir(n + '/') : n)).join('  '));
    }
    return ok(outs.join('\n'));
  });
  def('mkdir', 'crea carpetas (-p crea las intermedias)', (a) => {
    const { flags, pos } = parseArgs(a, { bool: ['-p'] });
    if (!pos.length) return fail('mkdir: falta un operando');
    for (const d of pos) {
      const p = norm(d);
      if (exists(p)) { if (!flags['-p']) return fail(`mkdir: no se puede crear el directorio «${d}»: El archivo ya existe`); continue; }
      if (!flags['-p'] && !isDir(parent(p))) return fail(`mkdir: no se puede crear el directorio «${d}»: No existe el archivo o el directorio`);
      mkdirp(p);
    }
    Machine.save(); return ok('');
  });
  def('touch', 'crea un archivo vacío', (a) => { for (const f of a) { const p = norm(f); if (!exists(p)) writeFile(p, ''); else Machine.fs[p].m = Date.now(); } Machine.save(); return ok(''); });
  const readArgOrStdin = (pos, ctx, cmd) => {
    if (!pos.length) return { text: ctx.stdin || '' };
    const texts = [];
    for (const f of pos) {
      const p = norm(f);
      if (isDir(p)) return { err: `${cmd}: ${f}: Es un directorio` };
      const c = readFile(p);
      if (c === null) return { err: `${cmd}: ${f}: No existe el archivo o el directorio` };
      texts.push(c);
    }
    return { text: texts.join('') };
  };
  def('cat', 'muestra el contenido de archivos', (a, ctx) => { const r = readArgOrStdin(a.filter((x) => x !== '-n'), ctx, 'cat'); if (r.err) return fail(r.err); return ok(a.includes('-n') ? r.text.replace(/\n$/, '').split('\n').map((l, i) => `${String(i + 1).padStart(6)}  ${l}`).join('\n') : r.text.replace(/\n$/, '')); });
  def('less', 'ver un archivo largo', (a, ctx) => Commands.cat(a, ctx));
  def('more', '', (a, ctx) => Commands.cat(a, ctx));
  const nLines = (flags, def_) => { const v = flags['-n'] ?? flags['--lines']; return v === undefined || v === true ? def_ : parseInt(v, 10); };
  def('head', 'primeras líneas (-n N)', (a, ctx) => {
    a = a.map((x) => (/^-\d+$/.test(x) ? ['-n', x.slice(1)] : [x])).flat();
    const { flags, pos } = parseArgs(a, { attach: 'n' }); const r = readArgOrStdin(pos, ctx, 'head'); if (r.err) return fail(r.err);
    return ok(r.text.replace(/\n$/, '').split('\n').slice(0, nLines(flags, 10)).join('\n'));
  });
  def('tail', 'últimas líneas (-n N)', (a, ctx) => {
    a = a.map((x) => (/^-\d+$/.test(x) ? ['-n', x.slice(1)] : [x])).flat().filter((x) => x !== '-f');
    const { flags, pos } = parseArgs(a, { attach: 'n' }); const r = readArgOrStdin(pos, ctx, 'tail'); if (r.err) return fail(r.err);
    const ls = r.text.replace(/\n$/, '').split('\n');
    // tail -n +K: desde la línea K hasta el final (muy usado para saltar el encabezado de un CSV)
    if (/^\+\d+$/.test(String(flags['-n']))) return ok(ls.slice(Math.max(0, parseInt(String(flags['-n']).slice(1), 10) - 1)).join('\n'));
    return ok(ls.slice(-nLines(flags, 10)).join('\n'));
  });
  // ---- sed: s/a/b/[gip], d, p con direcciones (N, $, /re/, N,M); -n, -i, -e, -E
  function sedPrograma(texto) {
    const cmds = [];
    for (let src of texto.split(/;\s*|\n/).map((x) => x.trim()).filter(Boolean)) {
      let dir = null, m;
      const dirRe = /^(\d+|\$|\/(?:[^/\\]|\\.)*\/)(?:,(\d+|\$|\/(?:[^/\\]|\\.)*\/))?/;
      if ((m = src.match(dirRe)) && !src.startsWith('s/')) { dir = [m[1], m[2]]; src = src.slice(m[0].length).trim(); }
      if (src.startsWith('s')) {
        const sep = src[1];
        const partes = []; let cur = '', i = 2;
        while (i < src.length && partes.length < 2) { if (src[i] === '\\' && src[i + 1] === sep) { cur += sep; i += 2; continue; } if (src[i] === sep) { partes.push(cur); cur = ''; i++; continue; } cur += src[i++]; }
        if (partes.length < 2) throw new Error(`sed: -e expresión #1, carácter ${src.length}: comando "s" sin terminar`);
        const flags = src.slice(i);
        cmds.push({ dir, op: 's', re: new RegExp(partes[0].replace(/\\\(/g, '(').replace(/\\\)/g, ')'), (flags.includes('g') ? 'g' : '') + (flags.includes('i') || flags.includes('I') ? 'i' : '')), rep: partes[1].replace(/\\(\d)/g, '$$$1').replace(/&/g, '$$&').replace(/\\n/g, '\n'), p: flags.includes('p') });
      } else if (src === 'd' || src === 'p' || src === 'q') cmds.push({ dir, op: src });
      else throw new Error(`sed: -e expresión #1, carácter 1: comando desconocido: "${src[0]}"`);
    }
    return cmds;
  }
  function sedAplicar(texto, cmds, soloP) {
    const lineas = texto.replace(/\n$/, '').split('\n');
    const out = []; const enRango = cmds.map(() => false);
    const coincide = (d, l, n) => (d === '$' ? n === lineas.length : /^\d+$/.test(d) ? Number(d) === n : new RegExp(d.slice(1, -1)).test(l));
    for (let n = 1; n <= lineas.length; n++) {
      let l = lineas[n - 1], borrar = false, salir = false;
      cmds.forEach((c, k) => {
        if (borrar || salir) return;
        let aplica = true;
        if (c.dir) {
          if (!c.dir[1]) aplica = coincide(c.dir[0], l, n);
          else if (enRango[k]) { aplica = true; if (coincide(c.dir[1], l, n)) enRango[k] = false; }
          else if (coincide(c.dir[0], l, n)) { aplica = true; enRango[k] = !coincide(c.dir[1], l, n); } else aplica = false;
        }
        if (!aplica) return;
        if (c.op === 's') { const nueva = l.replace(c.re, c.rep); if (nueva !== l && c.p) out.push(nueva); l = nueva; }
        if (c.op === 'd') borrar = true;
        if (c.op === 'p') out.push(l);
        if (c.op === 'q') salir = true;
      });
      if (!borrar && !soloP) out.push(l);
      if (salir) break;
    }
    return out.join('\n');
  }
  def('sed', 'edita texto: sed "s/viejo/nuevo/g" archivo, sed -i (en el lugar), sed -n "5,10p"', (a, ctx) => {
    let soloP = false, enLugar = false; const exprs = []; const archivos = [];
    for (let i = 0; i < a.length; i++) {
      const x = a[i];
      if (x === '-n') soloP = true; else if (x === '-i' || x.startsWith('-i')) enLugar = true; else if (x === '-E' || x === '-r') continue;
      else if (x === '-e') exprs.push(a[++i]); else if (/^-[nirE]+$/.test(x)) { if (x.includes('n')) soloP = true; if (x.includes('i')) enLugar = true; }
      else if (!exprs.length) exprs.push(x); else archivos.push(x);
    }
    if (!exprs.length) return fail('Uso: sed [-n] [-i] "s/viejo/nuevo/g" [ARCHIVO...]');
    let cmds; try { cmds = sedPrograma(exprs.join(';')); } catch (e) { return fail(e.message); }
    if (enLugar) {
      if (!archivos.length) return fail('sed: no hay archivos de entrada para editar en el lugar (-i)');
      for (const f of archivos) { const p = norm(f); const c = readFile(p); if (c === null) return fail(`sed: no se puede leer ${f}: No existe el archivo o el directorio`); writeFile(p, sedAplicar(c, cmds, soloP) + (c.endsWith('\n') ? '\n' : '')); }
      Machine.save(); return ok('');
    }
    const r = readArgOrStdin(archivos, ctx, 'sed'); if (r.err) return fail(r.err);
    return ok(sedAplicar(r.text, cmds, soloP));
  });
  def('tree', 'muestra carpetas y archivos como árbol (-a: ocultos, -L N: niveles)', (a) => {
    const { flags, pos } = parseArgs(a, { bool: ['-a', '-d'], attach: 'L' });
    const raiz = norm(pos[0] || '.');
    if (!isDir(raiz)) return fail(`${pos[0] || '.'} [error opening dir]`);
    const max = flags['-L'] ? Number(flags['-L']) : Infinity;
    const lineas = [pos[0] || '.']; let nd = 0, nf = 0;
    const rec = (dir, pre, nivel) => {
      if (nivel > max) return;
      const hijos = children(dir).filter((n) => flags['-a'] || !n.startsWith('.')).filter((n) => !flags['-d'] || isDir(dir + '/' + n)).sort();
      hijos.forEach((n, i) => {
        const ult = i === hijos.length - 1; const p = dir + '/' + n; const d = isDir(p);
        lineas.push(pre + (ult ? '└── ' : '├── ') + (d ? col.b(n) : n));
        if (d) { nd++; rec(p, pre + (ult ? '    ' : '│   '), nivel + 1); } else nf++;
      });
    };
    rec(raiz, '', 1);
    lineas.push('', `${nd} directories${flags['-d'] ? '' : `, ${nf} files`}`);
    return ok(lineas.join('\n'));
  });
  def('diff', 'compara dos archivos línea por línea (-u: formato unificado)', (a) => {
    const { flags, pos } = parseArgs(a, { bool: ['-u', '-q'] });
    if (pos.length < 2) return fail('diff: falta un operando después de ' + (pos[0] || "'diff'"));
    const [x, y] = pos.map((f) => readFile(norm(f)));
    if (x === null || y === null) return fail(`diff: ${x === null ? pos[0] : pos[1]}: No existe el archivo o el directorio`, 2);
    if (x === y) return ok('');
    if (flags['-q']) return { out: `Los archivos ${pos[0]} y ${pos[1]} son distintos`, code: 1 };
    const A = x.replace(/\n$/, '').split('\n'), B = y.replace(/\n$/, '').split('\n');
    // LCS simple para alinear líneas
    const L = Array.from({ length: A.length + 1 }, () => new Array(B.length + 1).fill(0));
    for (let i = A.length - 1; i >= 0; i--) for (let j = B.length - 1; j >= 0; j--) L[i][j] = A[i] === B[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    const out = flags['-u'] ? [`--- ${pos[0]}`, `+++ ${pos[1]}`] : [];
    let i = 0, j = 0;
    while (i < A.length || j < B.length) {
      if (i < A.length && j < B.length && A[i] === B[j]) { if (flags['-u']) out.push(' ' + A[i]); i++; j++; }
      else if (j < B.length && (i >= A.length || L[i][j + 1] > L[i + 1][j])) { out.push(flags['-u'] ? col.ok('+' + B[j]) : col.ok(`> ${B[j]}`)); j++; }
      else { out.push(flags['-u'] ? col.err('-' + A[i]) : col.err(`< ${A[i]}`)); i++; }
    }
    return { out: out.join('\n'), code: 1 };
  });
  def('jq', 'filtra JSON: jq ".campo", jq ".[] | .nombre", jq -r', (a, ctx) => {
    const raw = a.includes('-r'); const resto = a.filter((x) => x !== '-r' && x !== '-c');
    const filtro = resto[0] || '.';
    const r = readArgOrStdin(resto.slice(1), ctx, 'jq'); if (r.err) return fail(r.err);
    let datos; try { datos = JSON.parse(r.text); } catch (e) { return fail('jq: error (at <stdin>:0): Cannot parse input as JSON'); }
    const paso = (vals, f) => {
      f = f.trim(); if (f === '.' || !f) return vals;
      const out = [];
      for (const v of vals) {
        let m = f.match(/^\.(\[\])(.*)$/) || f.match(/^\.([\w-]+)(.*)$/) || f.match(/^\.\[(\d+)\](.*)$/) || f.match(/^\.\["([^"]+)"\](.*)$/) || f.match(/^(\[\])(.*)$/);
        if (f === 'keys') { out.push(Object.keys(v).sort()); continue; }
        if (f === 'length') { out.push(Array.isArray(v) || typeof v === 'string' ? v.length : Object.keys(v || {}).length); continue; }
        if (!m) throw new Error(`jq: error: syntax error, unexpected "${f}"`);
        const nuevo = m[1] === '[]' ? (Array.isArray(v) ? v : Object.values(v || {})) : [v == null ? null : v[m[1]]];
        out.push(...paso(nuevo, m[2] ? (m[2].startsWith('.') || m[2].startsWith('[') ? (m[2].startsWith('[') ? '.' + m[2] : m[2]) : m[2]) : '.'));
      }
      return out;
    };
    try {
      let vals = [datos];
      for (const parte of filtro.split('|')) vals = paso(vals, parte);
      return ok(vals.map((v) => (raw && typeof v === 'string' ? v : JSON.stringify(v, null, a.includes('-c') ? 0 : 2))).join('\n'));
    } catch (e) { return fail(e.message, 3); }
  });
  def('wc', 'cuenta líneas (-l), palabras (-w) y caracteres (-c)', (a, ctx) => {
    const { flags, pos } = parseArgs(a, { bool: ['-l', '-w', '-c'] });
    const one = (text, name) => {
      const l = (text.match(/\n/g) || []).length, w = (text.match(/\S+/g) || []).length, c = text.length;
      const sel = [flags['-l'] && l, flags['-w'] && w, flags['-c'] && c].filter((x) => x !== false && x !== undefined);
      const vals = sel.length ? sel : [l, w, c];
      return vals.map((v) => String(v).padStart(pos.length ? 4 : 1)).join(' ') + (name ? ' ' + name : '');
    };
    if (!pos.length) return ok(one(ctx.stdin || ''));
    const out = [];
    for (const f of pos) { const c = readFile(norm(f)); if (c === null) return fail(`wc: ${f}: No existe el archivo o el directorio`); out.push(one(c, f)); }
    return ok(out.join('\n'));
  });
  def('grep', 'busca texto (-i, -v, -c, -n, -E)', (a, ctx) => {
    const { flags, pos } = parseArgs(a, { bool: ['-i', '-v', '-c', '-n', '-E', '-r', '-l', '-w', '-o'] });
    const pat = pos.shift();
    if (pat === undefined) return fail('Uso: grep [OPCIÓN]... PATRÓN [ARCHIVO]...');
    let re;
    try { re = new RegExp(flags['-w'] ? `\\b${pat}\\b` : pat, flags['-i'] ? 'i' : ''); } catch (e) { re = new RegExp(pat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags['-i'] ? 'i' : ''); }
    const files = pos.length ? pos : [null];
    const out = [];
    let total = 0;
    for (const f of files) {
      const text = f === null ? (ctx.stdin || '') : readFile(norm(f));
      if (text === null) { out.push(col.err(`grep: ${f}: No existe el archivo o el directorio`)); continue; }
      const lines = text.replace(/\n$/, '').split('\n');
      let n = 0;
      lines.forEach((l, i) => {
        const m = re.test(l) !== !!flags['-v'];
        if (!m) return;
        n++;
        if (flags['-c'] || flags['-l']) return;
        const shown = flags['-v'] ? l : l.replace(new RegExp(re.source, re.flags + 'g'), (x) => S('t-err', x));
        out.push((files.length > 1 ? col.info(f + ':') : '') + (flags['-n'] ? col.ok(i + 1 + ':') : '') + (flags['-o'] ? (l.match(re) || [''])[0] : shown));
      });
      if (flags['-c']) out.push((files.length > 1 ? f + ':' : '') + n);
      if (flags['-l'] && n) out.push(f);
      total += n;
    }
    return { out: out.join('\n'), code: total ? 0 : 1 };
  });
  def('sort', 'ordena líneas (-r, -n, -u, -t, -k)', (a, ctx) => {
    const { flags, pos } = parseArgs(a, { bool: ['-r', '-n', '-u', '-rn', '-nr'], attach: 'tk' });
    if (flags['-rn'] || flags['-nr']) { flags['-r'] = true; flags['-n'] = true; }
    const r = readArgOrStdin(pos, ctx, 'sort'); if (r.err) return fail(r.err);
    let ls = r.text.replace(/\n$/, '').split('\n');
    const sep = flags['-t'] && flags['-t'] !== true ? flags['-t'] : null;
    const k = flags['-k'] ? parseInt(flags['-k'], 10) - 1 : null;
    const key = (l) => (k === null ? l : (sep ? l.split(sep) : l.trim().split(/\s+/))[k] || '');
    ls.sort((x, y) => (flags['-n'] ? parseFloat(key(x)) - parseFloat(key(y)) : key(x).localeCompare(key(y), 'es')));
    if (flags['-r']) ls.reverse();
    if (flags['-u']) ls = [...new Set(ls)];
    return ok(ls.join('\n'));
  });
  def('uniq', 'quita duplicados consecutivos (-c cuenta)', (a, ctx) => {
    const { flags, pos } = parseArgs(a, { bool: ['-c'] });
    const r = readArgOrStdin(pos, ctx, 'uniq'); if (r.err) return fail(r.err);
    const out = [];
    for (const l of r.text.replace(/\n$/, '').split('\n')) { if (out.length && out[out.length - 1][1] === l) out[out.length - 1][0]++; else out.push([1, l]); }
    return ok(out.map(([c, l]) => (flags['-c'] ? `${String(c).padStart(7)} ${l}` : l)).join('\n'));
  });
  def('cut', 'corta columnas (-d SEP -f N)', (a, ctx) => {
    const { flags, pos } = parseArgs(a, { attach: 'dfc' });
    const r = readArgOrStdin(pos, ctx, 'cut'); if (r.err) return fail(r.err);
    const d = flags['-d'] && flags['-d'] !== true ? flags['-d'] : '\t';
    if (flags['-c']) { const [x, y] = String(flags['-c']).split('-').map(Number); return ok(r.text.replace(/\n$/, '').split('\n').map((l) => l.slice(x - 1, y || l.length)).join('\n')); }
    if (!flags['-f']) return fail('cut: debe especificar una lista de campos (-f)');
    const fields = String(flags['-f']).split(',').flatMap((x) => { if (x.includes('-')) { const [s, e] = x.split('-').map(Number); return Array.from({ length: (e || 50) - s + 1 }, (_, i) => s + i); } return [Number(x)]; });
    return ok(r.text.replace(/\n$/, '').split('\n').map((l) => { const p = l.split(d); return fields.map((f) => p[f - 1]).filter((x) => x !== undefined).join(d); }).join('\n'));
  });
  def('tr', 'reemplaza caracteres', (a, ctx) => {
    const [x, y] = a;
    const map = (s) => s.replace('a-z', 'abcdefghijklmnopqrstuvwxyz').replace('A-Z', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ');
    const X = map(x || ''), Y = map(y || '');
    return ok((ctx.stdin || '').split('').map((c) => { const i = X.indexOf(c); return i >= 0 ? (Y[i] ?? Y[Y.length - 1] ?? '') : c; }).join('').replace(/\n$/, ''));
  });
  def('rm', 'borra archivos (-r carpetas, -f sin preguntar)', (a) => {
    const { flags, pos } = parseArgs(a, { bool: ['-r', '-f', '-rf', '-fr', '-R'] });
    const rec = flags['-r'] || flags['-rf'] || flags['-fr'] || flags['-R'];
    for (const f of pos) {
      const p = norm(f);
      if (!exists(p)) { if (flags['-f'] || flags['-rf'] || flags['-fr']) continue; return fail(`rm: no se puede borrar '${f}': No existe el archivo o el directorio`); }
      if (p === HOME || p === '/') return fail(`rm: es peligroso operar recursivamente sobre '${f}' 😱 (protección activada)`);
      if (isDir(p) && !rec) return fail(`rm: no se puede borrar '${f}': Es un directorio (usa -r)`);
      for (const k of Object.keys(Machine.fs)) if (k === p || k.startsWith(p + '/')) delete Machine.fs[k];
    }
    Machine.save(); return ok('');
  });
  def('cp', 'copia (-r carpetas)', (a) => {
    const { flags, pos } = parseArgs(a, { bool: ['-r', '-R'] });
    if (pos.length < 2) return fail('cp: falta el archivo de destino');
    const dst = norm(pos.pop());
    for (const s of pos) {
      const p = norm(s);
      if (!exists(p)) return fail(`cp: no se puede efectuar stat de '${s}': No existe el archivo o el directorio`);
      const target = isDir(dst) ? dst + '/' + base(p) : dst;
      if (isDir(p)) {
        if (!flags['-r'] && !flags['-R']) return fail(`cp: se omite el directorio '${s}' (usa -r)`);
        for (const k of Object.keys(Machine.fs)) if (k === p || k.startsWith(p + '/')) Machine.fs[target + k.slice(p.length)] = { ...Machine.fs[k], m: Date.now() };
      } else writeFile(target, readFile(p));
    }
    Machine.save(); return ok('');
  });
  def('mv', 'mueve o renombra', (a) => {
    if (a.length < 2) return fail('mv: falta el archivo de destino');
    const dst = norm(a[a.length - 1]);
    for (const s of a.slice(0, -1)) {
      const p = norm(s);
      if (!exists(p)) return fail(`mv: no se puede efectuar stat de '${s}': No existe el archivo o el directorio`);
      const target = isDir(dst) ? dst + '/' + base(p) : dst;
      mkdirp(parent(target));
      for (const k of Object.keys(Machine.fs)) if (k === p || k.startsWith(p + '/')) { Machine.fs[target + k.slice(p.length)] = Machine.fs[k]; delete Machine.fs[k]; }
    }
    Machine.save(); return ok('');
  });
  def('find', 'busca archivos (-name PATRÓN)', (a) => {
    const root = norm(a[0] && !a[0].startsWith('-') ? a[0] : '.');
    const i = a.indexOf('-name');
    const re = i >= 0 ? new RegExp('^' + a[i + 1].replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$') : null;
    const ty = a.indexOf('-type') >= 0 ? a[a.indexOf('-type') + 1] : null;
    const rel = a[0] && !a[0].startsWith('-') ? a[0] : '.';
    return ok(Object.keys(Machine.fs).filter((k) => (k === root || k.startsWith(root + '/')) && (!re || re.test(base(k))) && (!ty || (ty === 'd') === isDir(k))).sort().map((k) => rel.replace(/\/$/, '') + k.slice(root.length)).join('\n'));
  });
  def('curl', 'peticiones HTTP (simuladas, sin red)', (a) => {
    const url = a.find((x) => /^https?:/.test(x)) || '';
    if (/api\.tienda/.test(url)) return ok(JSON.stringify({ pedidos: [{ id: 1, total: 120.5 }, { id: 2, total: 80 }], pagina: 1 }, null, 2));
    return ok(col.dim(`(simulado) GET ${url || '(sin URL)'} → 200 OK`) + '\n{"ok": true}');
  });
  def('code', 'abre un archivo en el editor', (a) => {
    if (!a[0]) return fail('Uso: code ARCHIVO');
    const p = norm(a[0]);
    if (isDir(p)) return fail(`code: ${a[0]} es un directorio`);
    if (!exists(p)) writeFile(p, '');
    if (window.Shell.openEditor) window.Shell.openEditor(p, readFile(p), (txt) => { writeFile(p, txt); Machine.save(); });
    return ok(col.dim(`Abriendo ${display(p)} en el editor…`));
  });
  ['nano', 'vim', 'vi'].forEach((e) => def(e, e === 'nano' ? 'editor de texto (abre el editor visual)' : '', (a) => Commands.code(a)));
  def('pip', 'instala paquetes de Python (simulado)', (a) => {
    if (a[0] === 'install') return ok(a.slice(1).filter((x) => !x.startsWith('-')).map((p) => `Collecting ${p}\n  Downloading ${p}-latest-py3-none-any.whl\n`).join('') + col.ok(`Successfully installed ${a.slice(1).filter((x) => !x.startsWith('-')).join(' ')}`));
    if (a[0] === 'list' || a[0] === 'freeze') return ok('pandas==2.2.2\npyspark==3.5.1\napache-airflow==2.9.3\ndbt-databricks==1.8.5\nrequests==2.32.3');
    return ok('Uso: pip install PAQUETE | pip list');
  });
  Commands.pip3 = Commands.pip;

  // ------------------------------------------------------------- python real
  function homeFiles() {
    const files = {};
    for (const [k, v] of Object.entries(Machine.fs)) if (v.t === 'f' && k.startsWith(HOME + '/') && v.c.length < 2e6) files[k] = v.c;
    return files;
  }
  async function runPython(code, argv, mode = 'python') {
    const r = await window.Engines.PY.shell({ code, argv, files: homeFiles(), cwd: Machine.cwd, mode });
    if (r.files) {
      for (const [k, c] of Object.entries(r.files)) if (!isFile(k) || Machine.fs[k].c !== c) writeFile(k, c);
      Machine.save();
    }
    return { out: (r.stdout || '').replace(/\n$/, '') + (r.error ? (r.stdout ? '\n' : '') + col.err(r.error) : ''), code: r.error || !r.ok ? 1 : 0 };
  }
  def('python', 'ejecuta Python de verdad: python archivo.py | python -c "código" | python (consola)', async (a) => {
    if (a[0] === '--version' || a[0] === '-V') return ok('Python 3.12.1 (Pyodide)');
    if (a[0] === '-c') return runPython(a[1] || '', ['-c', ...a.slice(2)]);
    if (a[0] === '-m' && a[1] === 'venv') { mkdirp(norm(a[2] || '.venv') + '/bin'); writeFile(norm(a[2] || '.venv') + '/bin/activate', '# entorno virtual (simulado)\n'); Machine.save(); return ok(''); }
    if (a[0] === '-m' && a[1] === 'pip') return Commands.pip(a.slice(2));
    if (a[0] === '-m' && a[1] === 'pytest') return Commands.pytest(a.slice(2));
    if (!a.length) return { out: col.dim('Python 3.12 (Pyodide) — escribe exit() para salir'), code: 0, mode: 'python' };
    const p = norm(a[0]);
    const c = readFile(p);
    if (c === null) return fail(`python: no se puede abrir el archivo '${a[0]}': No existe el archivo o el directorio`, 2);
    return runPython(c, a);
  });
  Commands.python3 = Commands.python;
  def('pytest', 'ejecuta tests (archivos test_*.py)', async (a) => {
    const root = norm(a[0] || '.');
    const files = Object.keys(Machine.fs).filter((k) => (k === root || k.startsWith(root + '/')) && /\/test_[^/]*\.py$/.test(k));
    if (!files.length) return { out: 'no tests ran in 0.01s', code: 5 };
    const code = `import traceback\n_ok = _fail = 0\n` + files.map((f) => `
_ns = {"__name__": "test"}
exec(compile(open(${JSON.stringify(f)}).read(), ${JSON.stringify(f)}, "exec"), _ns)
for _n, _fn in list(_ns.items()):
    if _n.startswith("test_") and callable(_fn):
        try:
            _fn(); _ok += 1; print("PASSED  ${display(f)}::" + _n)
        except AssertionError as e:
            _fail += 1; print("FAILED  ${display(f)}::" + _n + "  AssertionError: " + str(e))
`).join('') + `print(("=" * 20) + f" {_ok} passed, {_fail} failed " + ("=" * 20))\n`;
    return runPython(code, ['pytest']);
  });

  // ------------------------------------------------------------- sqlite3 real
  function asciiTable(res, max = 100) {
    const cols = res.columns, rows = res.values.slice(0, max).map((r) => r.map((v) => (v === null ? 'NULL' : typeof v === 'number' && !Number.isInteger(v) ? String(Math.round(v * 10000) / 10000) : String(v))));
    const w = cols.map((c, i) => Math.min(40, Math.max(c.length, ...rows.map((r) => r[i].length))));
    const cut = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
    const line = (l, m, r) => l + w.map((x) => '─'.repeat(x + 2)).join(m) + r;
    const fmt = (r) => '│' + r.map((v, i) => ' ' + cut(v, w[i]).padEnd(w[i]) + ' ').join('│') + '│';
    return [line('┌', '┬', '┐'), fmt(cols), line('├', '┼', '┤'), ...rows.map(fmt), line('└', '┴', '┘')].join('\n') + (res.values.length > max ? col.dim(`\n… (${res.values.length} filas, se muestran ${max})`) : col.dim(`\n${res.values.length} fila(s)`));
  }
  async function sqlExec(sql) {
    const E = window.Engines.SQL;
    if (!E._bytes) await E.init();
    const r = E.exec(sql, E.playground());
    if (!r.ok) return fail('Error: ' + r.error.split('\n')[0]);
    if (!r.results.length) return ok(r.changes ? col.dim(`(${r.changes} fila(s) modificada(s))`) : '');
    return ok(r.results.map((x) => asciiTable(x)).join('\n'));
  }
  async function sqliteDot(line) {
    const E = window.Engines.SQL;
    if (!E._bytes) await E.init();
    const [cmd, arg] = line.trim().split(/\s+/);
    if (cmd === '.tables') {
      const r = E.exec("SELECT name FROM sqlite_master WHERE type IN ('table','view') ORDER BY name", E.playground());
      const names = r.results[0].values.map((v) => v[0]);
      const w = Math.max(...names.map((n) => n.length)) + 2;
      const cols = 3, out = [];
      for (let i = 0; i < names.length; i += cols) out.push(names.slice(i, i + cols).map((n) => n.padEnd(w)).join(''));
      return ok(out.join('\n'));
    }
    if (cmd === '.schema') {
      const r = E.exec(`SELECT sql FROM sqlite_master WHERE sql IS NOT NULL ${arg ? `AND name = '${arg.replace(/'/g, '')}'` : ''}`, E.playground());
      return ok(r.results.length ? r.results[0].values.map((v) => v[0] + ';').join('\n') : '');
    }
    if (cmd === '.help') return ok('.tables            lista tablas y vistas\n.schema [TABLA]    muestra el CREATE\n.quit / .exit      sale de sqlite3');
    if (cmd === '.quit' || cmd === '.exit') return { out: '', code: 0, exitMode: true };
    if (cmd === '.mode' || cmd === '.headers') return ok('');
    return fail(`Error: comando desconocido: ${cmd}. Escribe .help`);
  }
  def('sqlite3', 'base de datos SQLite del curso: sqlite3 | sqlite3 tienda.db "SELECT …"', async (a) => {
    const q = a.find((x, i) => i > 0 && !x.startsWith('-')) || (a.length === 1 && !/\.db$/.test(a[0]) ? a[0] : null);
    if (q) return q.trim().startsWith('.') ? sqliteDot(q) : sqlExec(q);
    if (!window.Engines.SQL._bytes) await window.Engines.SQL.init();
    return { out: `SQLite version 3.45 (sql.js) — base del curso con ${Object.keys(window.Engines.SQL.tables).length} tablas\nEscribe ${col.b('.tables')} para listarlas, ${col.b('.help')} para ayuda y ${col.b('.quit')} para salir. Termina cada consulta con ;`, code: 0, mode: 'sqlite' };
  });

  // ------------------------------------------------------------- dbt real
  function dbtProjectRoot() {
    let p = Machine.cwd;
    while (p && p !== '/') { if (isFile(p + '/dbt_project.yml')) return p; p = parent(p); }
    return null;
  }
  // como dbt real: todas las macros de macros/*.sql quedan disponibles en todos los modelos
  function dbtMacros() {
    const root = dbtProjectRoot();
    if (!root) return '';
    return Object.keys(Machine.fs).filter((k) => k.startsWith(root + '/macros/') && k.endsWith('.sql')).sort().map(readFile).join('\n');
  }
  function dbtModels(root) {
    const out = [];
    for (const k of Object.keys(Machine.fs)) if (k.startsWith(root + '/models/') && k.endsWith('.sql')) {
      const sql = readFile(k);
      const name = base(k).replace(/\.sql$/, '');
      const refs = [...sql.matchAll(/ref\(\s*['"](\w+)['"]\s*\)/g)].map((m) => m[1]);
      const folder = k.slice((root + '/models/').length).split('/')[0];
      let mat = (sql.match(/materialized\s*=\s*['"](\w+)['"]/) || [])[1];
      if (!mat) {
        const proj = readFile(root + '/dbt_project.yml') || '';
        const m = proj.match(new RegExp(folder + ':\\s*\\n\\s*\\+materialized:\\s*(\\w+)'));
        mat = m ? m[1] : 'view';
      }
      out.push({ name, path: k, sql, refs, mat, folder });
    }
    return out;
  }
  function selectModels(models, sel) {
    if (!sel) return models;
    const by = new Map(models.map((m) => [m.name, m]));
    const res = new Set();
    for (const s of String(sel).split(/[ ,]+/)) {
      const up = s.startsWith('+'), down = s.endsWith('+');
      const n = s.replace(/^\+|\+$/g, '');
      const seeds = models.filter((m) => m.name === n || m.folder === n || m.path.includes('/' + n + '/'));
      for (const m of seeds) {
        res.add(m.name);
        if (up) { const st = [...m.refs]; while (st.length) { const r = st.pop(); if (by.has(r) && !res.has(r)) { res.add(r); st.push(...by.get(r).refs); } } }
        if (down) { let changed = true; while (changed) { changed = false; for (const x of models) if (!res.has(x.name) && x.refs.some((r) => res.has(r))) { res.add(x.name); changed = true; } } }
      }
    }
    return models.filter((m) => res.has(m.name));
  }
  function topo(models) {
    const names = new Set(models.map((m) => m.name));
    const done = new Set(), out = [];
    let guard = 0;
    while (out.length < models.length && guard++ < 100) {
      for (const m of models) if (!done.has(m.name) && m.refs.every((r) => !names.has(r) || done.has(r))) { done.add(m.name); out.push(m); }
    }
    return out;
  }
  const hhmmss = () => new Date().toTimeString().slice(0, 8);
  async function dbtRun(models, { full } = {}) {
    const E = window.Engines.SQL;
    if (!E._bytes) await E.init();
    const db = E.playground();
    const lines = [`${hhmmss()}  Running with dbt=1.8.7 (simulado sobre SQLite)`, `${hhmmss()}  Found ${models.length} models`, ''];
    let okN = 0, errN = 0;
    const ord = topo(models);
    for (let i = 0; i < ord.length; i++) {
      const m = ord[i];
      const t0 = performance.now();
      const c = await window.Engines.PY.dbt(m.sql, { macros: dbtMacros() });
      let status;
      if (!c.ok) { status = col.err('ERROR'); errN++; lines.push(`${hhmmss()}  ${i + 1} of ${ord.length} ERROR creating ${m.mat} model ${m.name}`); lines.push(col.err('  Compilation Error: ' + c.error)); continue; }
      const sql = c.sql.replace(/;\s*$/, '');
      try {
        // SQLite no permite DROP VIEW sobre una tabla (ni al revés): miramos qué existe antes de borrar
        const prev = db.exec(`SELECT type FROM sqlite_master WHERE name = '${m.name.replace(/'/g, "''")}'`);
        const tipo = prev.length && prev[0].values.length ? prev[0].values[0][0] : null;
        if (tipo === 'view') db.exec(`DROP VIEW "${m.name}"`);
        else if (tipo === 'table') db.exec(`DROP TABLE "${m.name}"`);
        db.exec(`CREATE ${m.mat === 'view' ? 'VIEW' : 'TABLE'} "${m.name}" AS ${sql}`);
        const n = m.mat === 'view' ? '' : ` [SELECT ${db.exec(`SELECT COUNT(*) FROM "${m.name}"`)[0].values[0][0]}]`;
        status = col.ok('OK') + ` created sql ${m.mat === 'view' ? 'view' : 'table'} model main.${m.name}${n}`;
        okN++;
      } catch (e) { status = col.err('ERROR') + ' ' + e.message; errN++; }
      lines.push(`${hhmmss()}  ${i + 1} of ${ord.length} ${status} ${col.dim(`in ${((performance.now() - t0) / 1000).toFixed(2)}s`)}`);
    }
    lines.push('', `${hhmmss()}  ${errN ? col.err('Completed with errors') : col.ok('Completed successfully')}`, `${hhmmss()}  Done. PASS=${okN} WARN=0 ERROR=${errN} SKIP=0 TOTAL=${ord.length}`);
    return { out: lines.join('\n'), code: errN ? 1 : 0 };
  }
  function dbtTests(root, sel) {
    const tests = [];
    for (const k of Object.keys(Machine.fs)) if (k.startsWith(root + '/models/') && /\.ya?ml$/.test(k)) {
      const y = readFile(k);
      let model = null, column = null;
      for (const line of y.split('\n')) {
        let m;
        if ((m = line.match(/^\s*-\s*name:\s*(\w+)/))) {
          const indent = line.search(/\S/);
          if (indent <= 4) { model = m[1]; column = null; } else column = m[1];
        }
        const tl = line.match(/(?:data_)?tests:\s*\[(.*)\]/);
        if (tl && model && column) for (const t of tl[1].split(',').map((x) => x.trim()).filter(Boolean)) tests.push({ model, column, test: t });
        const single = line.match(/^\s*-\s*(unique|not_null)\s*$/);
        if (single && model && column) tests.push({ model, column, test: single[1] });
      }
    }
    return sel ? tests.filter((t) => String(sel).replace(/\+/g, '').split(/[ ,]+/).includes(t.model)) : tests;
  }
  async function dbtTest(root, sel) {
    const E = window.Engines.SQL;
    if (!E._bytes) await E.init();
    const db = E.playground();
    const tests = dbtTests(root, sel);
    const lines = [`${hhmmss()}  Running with dbt=1.8.7`, `${hhmmss()}  Found ${tests.length} data tests`, ''];
    let pass = 0, failN = 0, err = 0;
    tests.forEach((t, i) => {
      const q = t.test === 'unique' ? `SELECT ${t.column} FROM "${t.model}" GROUP BY ${t.column} HAVING COUNT(*) > 1` : `SELECT * FROM "${t.model}" WHERE ${t.column} IS NULL`;
      const name = `${t.test}_${t.model}_${t.column}`;
      try {
        const r = db.exec(q);
        const n = r.length ? r[0].values.length : 0;
        if (n) { failN++; lines.push(`${hhmmss()}  ${i + 1} of ${tests.length} ${col.err('FAIL ' + n)} ${name}`); }
        else { pass++; lines.push(`${hhmmss()}  ${i + 1} of ${tests.length} ${col.ok('PASS')} ${name}`); }
      } catch (e) { err++; lines.push(`${hhmmss()}  ${i + 1} of ${tests.length} ${col.err('ERROR')} ${name}: ${e.message.includes('no such table') ? 'el modelo no existe: ejecuta dbt run primero' : e.message}`); }
    });
    lines.push('', `${hhmmss()}  Done. PASS=${pass} WARN=0 ERROR=${err} FAIL=${failN} TOTAL=${tests.length}`);
    return { out: lines.join('\n'), code: failN || err ? 1 : 0 };
  }
  // dbt seed: carga cada seeds/*.csv como tabla (tipos inferidos: entero, decimal o texto)
  async function dbtSeed(root) {
    const E = window.Engines.SQL;
    if (!E._bytes) await E.init();
    const db = E.playground();
    const files = Object.keys(Machine.fs).filter((k) => k.startsWith(root + '/seeds/') && k.endsWith('.csv')).sort();
    const lines = [`${hhmmss()}  Running with dbt=1.8.7`, `${hhmmss()}  Found ${files.length} seeds`, ''];
    if (!files.length) return ok(lines.concat(col.dim('  (la carpeta seeds/ no tiene archivos .csv)')).join('\n'));
    const parse = (line) => {
      const out = []; let cur = '', q = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (q) { if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch; }
        else if (ch === '"') q = true; else if (ch === ',') { out.push(cur); cur = ''; } else cur += ch;
      }
      out.push(cur); return out;
    };
    let errN = 0;
    files.forEach((f, i) => {
      const name = base(f).replace(/\.csv$/, '');
      try {
        const rows = readFile(f).split(/\r?\n/).filter((l) => l.trim()).map(parse);
        const cols = rows.shift().map((c) => c.trim());
        const tipo = (j) => rows.every((r) => /^-?\d+$/.test(r[j] || '')) ? 'INTEGER' : rows.every((r) => /^-?\d+(\.\d+)?$/.test(r[j] || '')) ? 'REAL' : 'TEXT';
        const tipos = cols.map((_, j) => tipo(j));
        const prev = db.exec(`SELECT type FROM sqlite_master WHERE name = '${name}'`);
        const t = prev.length && prev[0].values.length ? prev[0].values[0][0] : null;
        if (t) db.exec(`DROP ${t === 'view' ? 'VIEW' : 'TABLE'} "${name}"`);
        db.exec(`CREATE TABLE "${name}" (${cols.map((c, j) => `"${c}" ${tipos[j]}`).join(', ')})`);
        const st = db.prepare(`INSERT INTO "${name}" VALUES (${cols.map(() => '?').join(',')})`);
        for (const r of rows) st.run(cols.map((_, j) => (r[j] === undefined || r[j] === '' ? null : tipos[j] === 'TEXT' ? r[j] : Number(r[j]))));
        st.free();
        lines.push(`${hhmmss()}  ${i + 1} of ${files.length} ${col.ok('OK')} loaded seed file main.${name} [INSERT ${rows.length}]`);
      } catch (e) { errN++; lines.push(`${hhmmss()}  ${i + 1} of ${files.length} ${col.err('ERROR')} seed ${name}: ${e.message}`); }
    });
    lines.push('', `${hhmmss()}  Done. PASS=${files.length - errN} WARN=0 ERROR=${errN} SKIP=0 TOTAL=${files.length}`);
    return { out: lines.join('\n'), code: errN ? 1 : 0 };
  }
  def('dbt', 'dbt real sobre SQLite: init, debug, run, test, build, compile, ls, seed, docs', async (a) => {
    // como en dbt real, --select acepta varios nodos separados por espacios: -s a b c
    {
      const out = [];
      let modo = null;   // 'valor': el próximo argumento es el selector; 'mas': los siguientes se suman
      for (const x of a) {
        if (modo === 'valor') { out.push(x); modo = 'mas'; continue; }
        if (modo === 'mas' && !x.startsWith('-')) { out[out.length - 1] += ' ' + x; continue; }
        modo = ['-s', '--select', '-m'].includes(x) ? 'valor' : null;
        out.push(x);
      }
      a = out;
    }
    const { flags, pos } = parseArgs(a, { alias: { '-s': '--select', '-m': '--select' }, bool: ['--full-refresh', '--version'] });
    const sub = pos[0];
    if (flags['--version'] || sub === '--version') return ok('Core:\n  - installed: 1.8.7\nPlugins:\n  - databricks: 1.8.5 (simulado: ejecuta sobre SQLite)');
    if (sub === 'init') {
      const name = pos[1] || 'mi_proyecto';
      const r = norm(name);
      writeFile(r + '/dbt_project.yml', `name: ${name}\nversion: "1.0.0"\nprofile: ${name}\n\nmodels:\n  ${name}:\n    +materialized: view\n`);
      writeFile(r + '/models/example/mi_primer_modelo.sql', "select 1 as id, 'hola dbt' as mensaje\n");
      ['analyses', 'macros', 'seeds', 'snapshots', 'tests'].forEach((d) => mkdirp(r + '/' + d));
      Machine.save();
      return ok(`${hhmmss()}  Running with dbt=1.8.7\n${hhmmss()}  Creating dbt configuration folder at ~/.dbt\n${col.ok(`Your new dbt project "${name}" was created!`)}\n\nPara empezar: ${col.b(`cd ${name} && dbt run`)}`);
    }
    const root = dbtProjectRoot();
    if (!root) return fail('Runtime Error\n  No dbt_project.yml found at expected path. ¿Estás dentro de la carpeta del proyecto? (prueba: cd ~/tienda_dbt)', 2);
    const models = dbtModels(root);
    const sel = flags['--select'];
    switch (sub) {
      case 'debug': return ok(`${hhmmss()}  Running with dbt=1.8.7\n  dbt_project.yml file [${col.ok('OK found and valid')}]\n  profiles.yml file [${col.ok('OK found and valid')}]\nConnection:\n  host: sqlite (navegador)\n  schema: main\n  Connection test: [${col.ok('OK connection ok')}]\n\n${col.ok('All checks passed!')}`);
      case 'deps': return ok(`${hhmmss()}  Installing dbt-labs/dbt_utils\n${hhmmss()}  Installed from version 1.3.0`);
      case 'seed': return dbtSeed(root);
      case 'ls': case 'list': return ok(selectModels(models, sel).map((m) => `${base(root)}.${m.folder}.${m.name}`).join('\n'));
      case 'compile': {
        const ms = selectModels(models, sel);
        const out = [];
        for (const m of ms) { const c = await window.Engines.PY.dbt(m.sql, { macros: dbtMacros() }); out.push(col.b(`-- ${m.name}`), c.ok ? c.sql.replace(/^\s+/, '') : col.err(c.error)); }
        return ok(out.join('\n'));
      }
      case 'run': return dbtRun(selectModels(models, sel), { full: flags['--full-refresh'] });
      case 'test': return dbtTest(root, sel);
      case 'build': { const r = await dbtRun(selectModels(models, sel)); const t = await dbtTest(root, sel); return { out: r.out + '\n\n' + t.out, code: r.code || t.code }; }
      case 'docs': return ok(pos[1] === 'serve' ? col.dim('(simulado) Sirviendo documentación en http://localhost:8080') : `${hhmmss()}  Catalog written to target/catalog.json`);
      case 'snapshot': return ok(`${hhmmss()}  Found 0 snapshots`);
      case 'source': return ok(`${hhmmss()}  Pulling freshness from warehouse metadata tables\n${hhmmss()}  1 of 1 ${col.ok('PASS')} freshness of tienda.pedidos`);
      default: return ok('Uso: dbt [init|debug|run|test|build|compile|ls|seed|deps|snapshot|docs] [-s SELECTOR]');
    }
  });

  // ------------------------------------------------------------- airflow real
  function dagFiles() {
    const dir = HOME + '/dags';
    return Object.keys(Machine.fs).filter((k) => k.startsWith(dir + '/') && k.endsWith('.py'));
  }
  function dagIds() {
    const out = [];
    for (const f of dagFiles()) {
      const c = readFile(f);
      for (const m of c.matchAll(/(?:dag_id\s*=\s*|DAG\(\s*)["']([\w.-]+)["']/g)) out.push({ id: m[1], file: f, c });
      for (const m of c.matchAll(/@dag[^\n]*\n\s*def\s+(\w+)/g)) out.push({ id: m[1], file: f, c, taskflow: true });
    }
    return out;
  }
  def('airflow', 'Airflow (mini-Airflow real): dags list, dags test, tasks list, dags trigger…', async (a) => {
    const [g, s, ...rest] = a;
    if (g === 'version' || g === '--version') return ok('2.9.3 (mini-Airflow del curso)');
    if (g === 'dags' && s === 'list') {
      const ds = dagIds();
      if (!ds.length) return ok('No hay DAGs en ~/dags');
      const rows = ds.map((d) => [d.id, display(d.file), 'alumno', (Machine.cloud.airflowPaused || {})[d.id] ? 'True' : 'False']);
      return ok(fmtTable(['dag_id', 'fileloc', 'owners', 'is_paused'], rows));
    }
    if (g === 'dags' && s === 'list-import-errors') {
      const r = await runPython(dagFiles().map((f) => `try:\n    exec(compile(open(${JSON.stringify(f)}).read(), ${JSON.stringify(f)}, 'exec'), {'__name__': 'dag'})\nexcept Exception as e:\n    print(${JSON.stringify(display(f))} + ' | ' + type(e).__name__ + ': ' + str(e))`).join('\n') || 'pass', ['airflow'], 'airflow');
      return ok(r.out || 'No data found');
    }
    const id = rest.find((x) => !x.startsWith('-'));
    const findDag = () => dagIds().find((d) => d.id === (s === 'list' || s === 'test' || s === 'trigger' || s === 'pause' || s === 'unpause' ? id : id));
    if (g === 'dags' && (s === 'pause' || s === 'unpause')) {
      if (!dagIds().some((d) => d.id === id)) return fail(`Dag id ${id} not found`);
      (Machine.cloud.airflowPaused = Machine.cloud.airflowPaused || {})[id] = s === 'pause'; Machine.save();
      return ok(`Dag: ${id}, paused: ${s === 'pause'}`);
    }
    if (g === 'dags' && s === 'trigger') {
      if (!dagIds().some((d) => d.id === id)) return fail(`Dag id ${id} not found`);
      return ok(fmtTable(['conf', 'dag_id', 'dag_run_id', 'state'], [[(a[a.indexOf('--conf') + 1] && a.includes('--conf')) ? a[a.indexOf('--conf') + 1] : '{}', id, 'manual__' + new Date().toISOString().slice(0, 19), 'queued']]));
    }
    if ((g === 'dags' && s === 'test') || (g === 'tasks' && (s === 'list' || s === 'test'))) {
      const d = findDag();
      if (!d) return fail(`Dag id ${id} not found. Revisa: airflow dags list`);
      const fecha = rest.find((x, i) => i > 0 && /^\d{4}-\d{2}-\d{2}/.test(x));
      const reg = d.taskflow ? `${d.id}()\n` : '';
      let tail;
      if (g === 'tasks' && s === 'list') tail = `import airflow._core as _c\nfor _t in _c._DAG_REGISTRY[${JSON.stringify(id)}].task_ids: print(_t)`;
      else if (g === 'tasks' && s === 'test') {
        const tid = rest.filter((x) => !x.startsWith('-'))[1];
        tail = `import airflow._core as _c, datetime as _dt\n_d = _c._DAG_REGISTRY[${JSON.stringify(id)}]\n_t = _d.get_task(${JSON.stringify(tid || '')})\n_run = _c.DagRun(_d, _dt.datetime.fromisoformat(${JSON.stringify(fecha || '2024-01-01')}), {})\n_ti = _c.TaskInstance(_t, _run)\nprint("[" + _t.task_id + "] ejecutando (sin registrar estado)")\n_r = _t.execute(_ti.get_template_context())\nprint("Retorno:", _r)`;
      } else tail = `import airflow._core as _c, datetime as _dt\n_c._DAG_REGISTRY[${JSON.stringify(id)}].test(logical_date=_dt.datetime.fromisoformat(${JSON.stringify(fecha || '2024-01-01')}))`;
      return runPython(d.c + '\n' + reg + tail, ['airflow'], 'airflow');
    }
    if (g === 'variables' && s === 'set') { (Machine.cloud.airflowVars = Machine.cloud.airflowVars || {})[rest[0]] = rest[1]; Machine.save(); return ok(`Variable ${rest[0]} created`); }
    if (g === 'variables' && s === 'list') return ok(fmtTable(['key'], Object.keys(Machine.cloud.airflowVars || {}).map((k) => [k])));
    if (g === 'connections' && s === 'add') return ok(`Successfully added \`conn_id\`=${rest[0]}`);
    if (g === 'dags' && s === 'backfill') return ok(col.dim('(simulado) ') + `Backfill de ${rest[rest.length - 1]}: ${col.ok('completado')}`);
    if (g === 'tasks' && s === 'clear') return ok('Clearing task instances... ' + col.ok('done'));
    return ok('Uso: airflow dags list | dags test DAG_ID [FECHA] | tasks list DAG_ID | tasks test DAG_ID TASK_ID FECHA | dags trigger DAG_ID | dags pause DAG_ID | variables set K V');
  });

  // ------------------------------------------------------------- git
  function gitRoot() { let p = Machine.cwd; while (p) { if (Machine.git[p]) return p; if (p === '/') break; p = parent(p); } return null; }
  function snapshot(root) {
    const snap = {};
    for (const [k, v] of Object.entries(Machine.fs)) if (v.t === 'f' && k.startsWith(root + '/') && !k.includes('/.git/')) snap[k.slice(root.length + 1)] = v.c;
    return snap;
  }
  function ignored(root, rel) {
    const gi = readFile(root + '/.gitignore');
    if (!gi) return false;
    return gi.split('\n').map((x) => x.trim()).filter((x) => x && !x.startsWith('#')).some((pat) => {
      const p = pat.replace(/\/$/, '');
      const re = new RegExp('(^|/)' + p.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*') + '($|/)');
      return re.test(rel);
    });
  }
  const shortHash = () => Math.random().toString(16).slice(2, 9);
  def('git', 'control de versiones (simulado con estado): init, status, add, commit, log, branch, switch, diff, push…', (a) => {
    const sub = a[0];
    if (sub === 'init') {
      const r = Machine.cwd;
      if (Machine.git[r]) return ok(`Reinicializado el repositorio Git existente en ${r}/.git/`);
      const rama = (Machine.git.__config || {})['init.defaultBranch'] || 'main';
      Machine.git[r] = { branch: rama, branches: { [rama]: null }, commits: {}, staged: {}, remotes: {} };
      mkdirp(r + '/.git'); Machine.save();
      return ok((Machine.git.__config || {})['user.email'] ? `Inicializado repositorio Git vacío en ${r}/.git/` : `Inicializado repositorio Git vacío en ${r}/.git/\n${col.dim('(aún no configuraste tu identidad: git config --global user.name "Tu Nombre" y user.email)')}`);
    }
    if (sub === 'clone') {
      const url = a[1] || '';
      const name = (a[2] || url.split('/').pop() || 'repo').replace(/\.git$/, '');
      const r = norm(name);
      if (exists(r)) return fail(`fatal: la ruta de destino '${name}' ya existe y no es un directorio vacío.`, 128);
      writeFile(r + '/README.md', `# ${name}\n\nRepositorio clonado (simulado) desde ${url}\n`);
      writeFile(r + '/pipelines/etl.py', 'print("pipeline")\n');
      const g = Machine.git[r] = { branch: 'main', branches: {}, commits: {}, staged: {}, remotes: { origin: url } };
      const h = shortHash(); g.commits[h] = { msg: 'Commit inicial', parent: null, snap: snapshot(r), author: 'equipo', date: new Date().toISOString() }; g.branches.main = h;
      Machine.save();
      return ok(`Clonando en '${name}'...\nremote: Enumerating objects: 12, done.\nRecibiendo objetos: 100% (12/12), listo.`);
    }
    if (sub === 'config') {
      // configuración global (fuera de un repositorio) o local
      const glob = a.includes('--global');
      const resto = a.slice(1).filter((x) => x !== '--global' && x !== '--local');
      const cfg = glob || !gitRoot() ? (Machine.git.__config = Machine.git.__config || {}) : (Machine.git[gitRoot()].config = Machine.git[gitRoot()].config || {});
      if (!glob && !gitRoot() && resto.length >= 2) return fail('fatal: no es un repositorio git (usa --global para la configuración de tu usuario)', 128);
      if (resto[0] === '--list' || resto[0] === '-l') return ok(Object.entries(Object.assign({}, Machine.git.__config || {}, glob ? {} : cfg)).map(([k, v]) => `${k}=${v}`).join('\n'));
      if (resto.length === 1) { const v = cfg[resto[0]] ?? (Machine.git.__config || {})[resto[0]]; return v === undefined ? { out: '', code: 1 } : ok(v); }
      if (resto.length >= 2) { cfg[resto[0]] = resto.slice(1).join(' '); Machine.save(); return ok(''); }
      return ok('uso: git config [--global] clave [valor] | git config --list');
    }
    const root = gitRoot();
    if (!root) return fail('fatal: no es un repositorio git (ni ninguno de los directorios superiores): .git', 128);
    const g = Machine.git[root];
    const head = g.branches[g.branch];
    const headSnap = head ? g.commits[head].snap : {};
    const work = snapshot(root);
    const indexSnap = { ...headSnap, ...g.staged };
    for (const k of Object.keys(g.staged)) if (g.staged[k] === null) delete indexSnap[k];
    const relCwd = (p) => p.slice(root.length + 1);
    switch (sub) {
      case 'status': {
        const stagedL = [], modL = [], untr = [];
        for (const [k, v] of Object.entries(g.staged)) stagedL.push((v === null ? 'eliminado:      ' : headSnap[k] === undefined ? 'nuevo archivo:  ' : 'modificado:     ') + k);
        for (const [k, v] of Object.entries(work)) {
          if (ignored(root, k)) continue;
          if (indexSnap[k] === undefined) untr.push(k); else if (indexSnap[k] !== v) modL.push('modificado:     ' + k);
        }
        for (const k of Object.keys(indexSnap)) if (work[k] === undefined) modL.push('eliminado:      ' + k);
        const out = [`En la rama ${g.branch}`];
        if (!head) out.push('\nNo hay commits todavía');
        if (stagedL.length) out.push('\nCambios a ser confirmados:\n  (usa "git restore --staged <archivo>..." para sacar del área de stage)\n' + stagedL.map((x) => '\t' + col.ok(x)).join('\n'));
        if (modL.length) out.push('\nCambios no rastreados para el commit:\n  (usa "git add <archivo>..." para actualizar lo que será confirmado)\n' + modL.map((x) => '\t' + col.err(x)).join('\n'));
        if (untr.length) out.push('\nArchivos sin seguimiento:\n  (usa "git add <archivo>..." para incluirlo a lo que será confirmado)\n' + [...new Set(untr.map((x) => x.split('/')[0] + (x.includes('/') ? '/' : '')))].map((x) => '\t' + col.err(x)).join('\n'));
        if (!stagedL.length && !modL.length && !untr.length) out.push('nada para hacer commit, el árbol de trabajo está limpio');
        return ok(out.join('\n'));
      }
      case 'add': {
        const targets = a.slice(1).filter((x) => !x.startsWith('-'));
        const all = a.includes('-A') || a.includes('--all') || targets.includes('.');
        if (!targets.length && !all) return ok('No se especificó nada, no se agregó nada.\nquizás quisiste decir \'git add .\'?');
        const keys = new Set([...Object.keys(work), ...Object.keys(indexSnap)]);
        let n = 0;
        for (const k of keys) {
          if (ignored(root, k) && work[k] !== undefined) continue;
          const abs = root + '/' + k;
          const match = all ? (targets.includes('.') ? abs.startsWith(Machine.cwd + '/') || Machine.cwd === root : true) : targets.some((t) => { const p = norm(t); return abs === p || abs.startsWith(p + '/'); });
          if (!match) continue;
          if (work[k] === undefined) { if (headSnap[k] !== undefined) { g.staged[k] = null; n++; } else delete g.staged[k]; }
          else if (indexSnap[k] !== work[k] || g.staged[k] !== undefined) { if (headSnap[k] === work[k]) delete g.staged[k]; else { g.staged[k] = work[k]; n++; } }
        }
        if (!n && !all) { const t = targets[0]; if (!exists(norm(t))) return fail(`fatal: ruta especificada '${t}' no concordó con ningún archivo`, 128); }
        Machine.save(); return ok('');
      }
      case 'restore': {
        if (a[1] === '--staged') { for (const t of a.slice(2)) delete g.staged[relCwd(norm(t))]; Machine.save(); return ok(''); }
        for (const t of a.slice(1)) { const k = relCwd(norm(t)); if (indexSnap[k] !== undefined) writeFile(root + '/' + k, indexSnap[k]); }
        Machine.save(); return ok('');
      }
      case 'commit': {
        const mi = a.indexOf('-m'), am = a.indexOf('-am');
        const msg = mi >= 0 ? a[mi + 1] : am >= 0 ? a[am + 1] : null;
        if (am >= 0) for (const [k, v] of Object.entries(work)) if (headSnap[k] !== undefined && headSnap[k] !== v) g.staged[k] = v;
        if (!msg) return fail('Abortando commit debido a que el mensaje del commit está vacío. Usa: git commit -m "mensaje"');
        if (!Object.keys(g.staged).length) return { out: `En la rama ${g.branch}\nnada para hacer commit` + (Object.keys(work).some((k) => indexSnap[k] !== work[k] && !ignored(root, k)) ? ' (usa "git add" para preparar cambios)' : ', el árbol de trabajo está limpio'), code: 1 };
        const snap = { ...indexSnap };
        const h = shortHash();
        const n = Object.keys(g.staged).length;
        g.commits[h] = { msg, parent: head, snap, author: 'alumno', date: new Date().toISOString() };
        g.branches[g.branch] = h; g.staged = {};
        Machine.save();
        return ok(`[${g.branch}${head ? '' : ' (commit-raíz)'} ${h}] ${msg}\n ${n} archivo(s) cambiado(s)`);
      }
      case 'log': {
        const one = a.includes('--oneline');
        const out = [];
        let h = head;
        while (h) { const c = g.commits[h]; out.push(one ? `${col.warn(h)} ${c.msg}` : `${col.warn('commit ' + h)}${h === head ? col.info(` (HEAD -> ${g.branch})`) : ''}\nAuthor: ${c.author} <${c.author}@academia.dev>\nDate:   ${new Date(c.date).toString()}\n\n    ${c.msg}\n`); h = c.parent; }
        return out.length ? ok(out.join('\n')) : fail(`fatal: tu rama actual '${g.branch}' no tiene ningún commit todavía`, 128);
      }
      case 'branch': {
        const name = a.slice(1).find((x) => !x.startsWith('-'));
        if (a.includes('-d') || a.includes('-D')) { delete g.branches[name]; Machine.save(); return ok(`Eliminada la rama ${name}.`); }
        if (name) { if (!head) return fail(`fatal: no es un nombre de objeto válido: '${g.branch}'.`, 128); g.branches[name] = head; Machine.save(); return ok(''); }
        return ok(Object.keys(g.branches).map((b) => (b === g.branch ? '* ' + col.ok(b) : '  ' + b)).join('\n'));
      }
      case 'switch': case 'checkout': {
        const create = a.includes('-c') || a.includes('-b');
        const name = a.slice(1).find((x) => !x.startsWith('-'));
        if (!name) return fail('fatal: falta el nombre de la rama');
        if (create) { if (g.branches[name] !== undefined) return fail(`fatal: una rama llamada '${name}' ya existe`, 128); g.branches[name] = head; g.branch = name; Machine.save(); return ok(`Cambiado a nueva rama '${name}'`); }
        if (g.branches[name] === undefined) return fail(`fatal: referencia inválida: ${name}`, 128);
        const target = g.branches[name] ? g.commits[g.branches[name]].snap : {};
        for (const k of Object.keys(headSnap)) if (target[k] === undefined) delete Machine.fs[root + '/' + k];
        for (const [k, v] of Object.entries(target)) writeFile(root + '/' + k, v);
        g.branch = name; Machine.save();
        return ok(`Cambiado a rama '${name}'`);
      }
      case 'merge': {
        const name = a[1];
        if (!g.branches[name]) return fail(`merge: ${name} - no es algo que podamos fusionar`);
        const other = g.commits[g.branches[name]].snap;
        for (const [k, v] of Object.entries(other)) writeFile(root + '/' + k, v);
        const h = shortHash();
        g.commits[h] = { msg: `Merge branch '${name}'`, parent: head, snap: { ...headSnap, ...other }, author: 'alumno', date: new Date().toISOString() };
        g.branches[g.branch] = h; Machine.save();
        return ok(`Merge made by the 'ort' strategy.`);
      }
      case 'diff': {
        const staged = a.includes('--staged') || a.includes('--cached');
        const from = staged ? headSnap : indexSnap, to = staged ? indexSnap : work;
        const out = [];
        for (const k of new Set([...Object.keys(from), ...Object.keys(to)])) {
          if (from[k] === to[k] || (to[k] === undefined && !staged && from === indexSnap && !(k in indexSnap))) continue;
          if (!staged && from[k] === undefined) continue;
          out.push(col.b(`diff --git a/${k} b/${k}`));
          const A = (from[k] || '').split('\n'), B = (to[k] || '').split('\n');
          for (const l of A) if (!B.includes(l) && l) out.push(col.err('-' + l));
          for (const l of B) if (!A.includes(l) && l) out.push(col.ok('+' + l));
        }
        return ok(out.join('\n'));
      }
      case 'remote': {
        if (a[1] === 'add') { g.remotes[a[2]] = a[3]; Machine.save(); return ok(''); }
        return ok(Object.entries(g.remotes).map(([k, v]) => (a.includes('-v') ? `${k}\t${v} (fetch)\n${k}\t${v} (push)` : k)).join('\n'));
      }
      case 'push': {
        const remote = a.find((x, i) => i > 0 && !x.startsWith('-')) || 'origin';
        if (!g.remotes[remote]) return fail(`fatal: '${remote}' no parece ser un repositorio git\nfatal: No se pudo leer del repositorio remoto. (agrega uno con: git remote add origin URL)`, 128);
        if (!head) return fail('error: src refspec main no concuerda con ninguno', 1);
        return ok(`Enumerando objetos: 5, listo.\nEscribiendo objetos: 100% (5/5), listo.\nTo ${g.remotes[remote]}\n * [new branch]      ${g.branch} -> ${g.branch}` + (a.includes('-u') ? `\nrama '${g.branch}' configurada para rastrear '${remote}/${g.branch}'.` : ''));
      }
      case 'pull': case 'fetch': return ok('Ya está actualizado.');
      default: return ok('uso: git [init|clone|status|add|commit|log|branch|switch|checkout|merge|diff|restore|remote|push|pull]');
    }
  });

  // ------------------------------------------------------------- tablas de texto
  function fmtTable(cols, rows) {
    const w = cols.map((c, i) => Math.max(c.length, ...rows.map((r) => String(r[i] ?? '').length)));
    return [cols.map((c, i) => c.padEnd(w[i])).join('  '), w.map((x) => '-'.repeat(x)).join('  '), ...rows.map((r) => r.map((v, i) => String(v ?? '').padEnd(w[i])).join('  '))].join('\n');
  }

  // ------------------------------------------------------------- autocompletado
  function complete(line) {
    const m = line.match(/(\S*)$/);
    const word = m ? m[1] : '';
    const before = line.slice(0, line.length - word.length);
    if (!before.trim()) {
      const opts = Object.keys(Commands).filter((c) => c.startsWith(word)).sort();
      return { opts, base: before, word };
    }
    const dirPart = word.includes('/') ? word.slice(0, word.lastIndexOf('/') + 1) : '';
    const dir = norm(dirPart || '.');
    if (!isDir(dir)) return { opts: [], base: before, word };
    const pre = word.slice(dirPart.length);
    const opts = children(dir).filter((n) => n.startsWith(pre) && (pre.startsWith('.') || !n.startsWith('.'))).map((n) => dirPart + n + (isDir((dir === '/' ? '' : dir) + '/' + n) ? '/' : ''));
    return { opts, base: before, word };
  }

  // ------------------------------------------------------------- interfaz
  const escHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  function render(text) {
    return escHtml(text).replace(/\u0001([^\u0002]*)\u0002([\s\S]*?)\u0003/g, (_, c, t) => `<span class="${c}">${t}</span>`);
  }
  const promptHtml = () => `${Machine.env.VIRTUAL_ENV ? `(${escHtml(Machine.env.VIRTUAL_ENV.split('/').pop())}) ` : ''}<span class="t-user">alumno@academia</span>:<span class="t-dir">${escHtml(display(Machine.cwd))}</span>$ `;

  function createTerminal(container, opts = {}) {
    if (!Machine.ready) Machine.load();
    const el = document.createElement('div');
    el.className = 'term' + (opts.compact ? ' term-compact' : '');
    el.innerHTML = `<div class="term-bar"><span class="term-dots"><i></i><i></i><i></i></span><span class="term-title">${escHtml(opts.title || 'alumno@academia: ~')}</span><span class="term-actions"><button type="button" data-clear title="Limpiar (Ctrl+L)">limpiar</button></span></div><div class="term-body" tabindex="0"><div class="term-out"></div><div class="term-line"><span class="term-prompt"></span><span class="term-input-wrap"><input class="term-input" spellcheck="false" autocomplete="off" autocapitalize="off" aria-label="Línea de comandos"></span></div></div>`;
    container.appendChild(el);
    const out = el.querySelector('.term-out'), input = el.querySelector('.term-input'), promptEl = el.querySelector('.term-prompt'), body = el.querySelector('.term-body');
    let mode = null, buffer = '', hIdx = Machine.history.length, busy = false, draft = '', repl = null;
    const setPrompt = () => {
      if (mode === 'repl' || mode === 'repl-cont') { promptEl.innerHTML = `<span class="t-info">${escHtml(mode === 'repl' ? repl.prompt : repl.cont)}</span>`; el.querySelector('.term-title').textContent = 'alumno@academia: ' + display(Machine.cwd); return; }
      promptEl.innerHTML = mode === 'sqlite' ? '<span class="t-info">sqlite&gt;</span> ' : mode === 'sqlite-cont' ? '<span class="t-info">   ...&gt;</span> ' : mode === 'python' ? '<span class="t-warn">&gt;&gt;&gt;</span> ' : mode === 'python-cont' ? '<span class="t-warn">...</span> ' : promptHtml();
      el.querySelector('.term-title').textContent = 'alumno@academia: ' + display(Machine.cwd);
    };
    const print = (html) => { const d = document.createElement('div'); d.className = 'term-chunk'; d.innerHTML = html; out.appendChild(d); body.scrollTop = body.scrollHeight; };
    const echoLine = (line) => print(promptEl.innerHTML + escHtml(line));
    if (opts.welcome !== false) print(render(opts.welcome || `${col.b('Terminal de práctica')} ${col.dim('— Linux simulado con Python, SQLite, dbt y Airflow reales, y nubes simuladas.')}\nEscribe ${col.info('help')} para ver los comandos o ${col.info('cat README.md')} para empezar.`));
    setPrompt();
    async function submit(line) {
      echoLine(line);
      // consolas de otras herramientas (psql, duckdb): las define el comando con r.repl
      if (mode === 'repl' || mode === 'repl-cont') {
        if (mode === 'repl' && repl.esMeta(line)) {
          const r = await repl.meta(line);
          if (r.exitMode) { mode = null; repl = null; }
          if (r.out) print(render(r.out));
          setPrompt(); return;
        }
        if (mode === 'repl' && /^(exit|quit)\s*$/.test(line.trim())) { mode = null; repl = null; setPrompt(); return; }
        buffer += line + '\n';
        if (!repl.fin.test(line)) { mode = buffer.trim() ? 'repl-cont' : 'repl'; setPrompt(); return; }
        const sql = buffer; buffer = ''; mode = 'repl';
        const r = await repl.ejecutar(sql);
        if (r.out) print(render(r.out));
        setPrompt();
        opts.onCommand && opts.onCommand(sql.trim(), r, 'repl');
        return;
      }
      if (mode === 'sqlite' || mode === 'sqlite-cont') {
        if (mode === 'sqlite' && line.trim().startsWith('.')) { const r = await sqliteDot(line); if (r.exitMode) mode = null; if (r.out) print(render(r.out)); setPrompt(); return; }
        buffer += line + '\n';
        if (!/;\s*$/.test(line)) { mode = buffer.trim() ? 'sqlite-cont' : 'sqlite'; setPrompt(); return; }
        const sql = buffer; buffer = ''; mode = 'sqlite'; setPrompt();
        print('<span class="t-dim">ejecutando…</span>');
        const r = await sqlExec(sql);
        out.lastChild.remove();
        if (r.out) print(render(r.out));
        opts.onCommand && opts.onCommand(sql.trim(), r, 'sqlite');
        return;
      }
      if (mode === 'python' || mode === 'python-cont') {
        if (mode === 'python' && /^(exit|quit)\(\)\s*$/.test(line.trim())) { mode = null; setPrompt(); return; }
        buffer += line + '\n';
        if (mode === 'python' && /:\s*$/.test(line)) { mode = 'python-cont'; setPrompt(); return; }
        if (mode === 'python-cont' && line.trim()) { setPrompt(); return; }
        const code = buffer; buffer = ''; mode = 'python'; setPrompt();
        if (!code.trim()) return;
        const r = await window.Engines.PY.repl(code);
        if (r.stdout) print(render(r.stdout.replace(/\n$/, '')));
        if (r.error) print(render(col.err(r.error)));
        return;
      }
      if (!line.trim()) return;
      Machine.history.push(line); Machine.save();
      hIdx = Machine.history.length;
      busy = true; el.classList.add('busy');
      const slow = /^\s*(python|python3|pytest|dbt|airflow|sqlite3)\b/.test(line);
      if (slow) print('<span class="t-dim">' + (window.Engines.PY.status === 'ready' || /sqlite3/.test(line) ? 'ejecutando…' : 'cargando Python en tu navegador (solo la primera vez)…') + '</span>');
      let r;
      try { if (opts.beforeRun) await opts.beforeRun(); r = await runLine(line, { autoLogin: !!opts.autoLogin }); } catch (e) { r = { out: col.err(e.message), code: 1 }; }
      if (slow) out.lastChild && out.lastChild.remove();
      busy = false; el.classList.remove('busy');
      if (r.out.startsWith('\u0000CLEAR')) { out.innerHTML = ''; r.out = r.out.slice(6).replace(/^\n/, ''); }
      if (r.out) print(render(r.out));
      const last = await lastMode(line);
      if (last) mode = last;
      if (r.repl) { repl = r.repl; mode = 'repl'; }
      setPrompt();
      opts.onCommand && opts.onCommand(line, r, null);
    }
    async function lastMode(line) {
      const t = line.trim();
      if (/^sqlite3(\s+\S+\.db)?\s*$/.test(t)) return 'sqlite';
      if (/^python3?\s*$/.test(t)) return 'python';
      return null;
    }
    input.addEventListener('keydown', async (e) => {
      if (busy) { e.preventDefault(); return; }
      if (e.key === 'Enter') { const v = input.value; input.value = ''; await submit(v); input.focus(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); if (hIdx === Machine.history.length) draft = input.value; if (hIdx > 0) { hIdx--; input.value = Machine.history[hIdx]; } }
      else if (e.key === 'ArrowDown') { e.preventDefault(); if (hIdx < Machine.history.length) { hIdx++; input.value = hIdx === Machine.history.length ? draft : Machine.history[hIdx]; } }
      else if (e.key === 'Tab') {
        e.preventDefault();
        if (mode) return;
        const c = complete(input.value);
        if (c.opts.length === 1) input.value = c.base + c.opts[0] + (c.opts[0].endsWith('/') ? '' : ' ');
        else if (c.opts.length > 1) {
          let pre = c.opts[0];
          for (const o of c.opts) while (!o.startsWith(pre)) pre = pre.slice(0, -1);
          if (pre.length > c.word.length) input.value = c.base + pre;
          else { echoLine(input.value); print(escHtml(c.opts.join('  '))); }
        }
      } else if (e.key === 'l' && e.ctrlKey) { e.preventDefault(); out.innerHTML = ''; }
      else if (e.key === 'c' && e.ctrlKey && !window.getSelection().toString()) { e.preventDefault(); echoLine(input.value + '^C'); input.value = ''; buffer = ''; if (mode === 'sqlite-cont') mode = 'sqlite'; if (mode === 'python-cont') mode = 'python'; if (mode === 'repl-cont') mode = 'repl'; setPrompt(); }
    });
    body.addEventListener('click', () => { if (!window.getSelection().toString()) input.focus(); });
    el.querySelector('[data-clear]').addEventListener('click', () => { out.innerHTML = ''; input.focus(); });
    return {
      el, input,
      focus: () => input.focus(),
      run: (line) => submit(line),
      type: async (line) => { input.value = line; input.focus(); },
      print: (t) => print(render(t)),
      refreshPrompt: setPrompt,
    };
  }

  window.Shell = {
    Machine, createTerminal, runLine, Commands, Help, def, col, fmtTable, parseArgs, norm, readFile, writeFile, exists, isDir, mkdirp, display, HOME,
    fail, ok, sqlExec, openEditor: null,
  };
})();
