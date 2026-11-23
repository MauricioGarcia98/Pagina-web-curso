/*
 * Motores de ejecución en el navegador:
 *  - SQL: SQLite compilado a WebAssembly (sql.js) con el dataset "Tienda Andina". Las lecciones usan
 *    CursoSQL (más abajo), que corre sobre DuckDB y vuelve a SQLite si hace falta.
 *  - Python / PySpark / Airflow: Pyodide (CPython en WebAssembly) dentro de un Web Worker,
 *    con los simuladores mini-Spark y mini-Airflow.
 *  - dbt: plantillas Jinja renderizadas con jinja2 (Pyodide) y ejecutadas en SQLite.
 */
(function () {
  'use strict';

  const SQLJS_BASE = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/';
  const PYODIDE_URL = 'https://cdn.jsdelivr.net/pyodide/v314.0.7/full/pyodide.mjs';

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src; s.async = true; s.crossOrigin = 'anonymous';
      // el cargador AMD de Monaco define window.define. Una librería UMD (como sql.js) que ve define.amd se
      // registra como módulo AMD en vez de crear su variable global: ocultamos solo la marca .amd, no define
      // entero, porque mientras tanto Monaco puede seguir cargando sus propios módulos con define()
      const d = typeof window.define === 'function' ? window.define : null;
      const amd = d ? d.amd : undefined;
      if (d) d.amd = undefined;
      const restore = () => { if (d) d.amd = amd; };
      s.onload = () => { restore(); resolve(); };
      s.onerror = () => { restore(); reject(new Error('No se pudo cargar ' + src + '. ¿Tienes conexión a internet?')); };
      document.head.appendChild(s);
    });
  }

  // ------------------------------------------------------------------ SQL
  const SQL = {
    _ready: null, _bytes: null, _SQL: null, _play: null, _expected: new Map(),
    init() {
      if (this._ready) return this._ready;
      this._ready = (async () => {
        await loadScript(SQLJS_BASE + 'sql-wasm.js');
        this._SQL = await window.initSqlJs({ locateFile: (f) => SQLJS_BASE + f });
        const db = new this._SQL.Database();
        db.run('PRAGMA foreign_keys = OFF;');
        db.run(window.DataGen.SCHEMA);
        const T = window.DataGen.build();
        db.run('BEGIN');
        for (const [name, t] of Object.entries(T)) {
          const stmt = db.prepare(`INSERT INTO ${name} (${t.columns.join(',')}) VALUES (${t.columns.map(() => '?').join(',')})`);
          for (const r of t.rows) stmt.run(r);
          stmt.free();
        }
        db.run('COMMIT');
        db.run(window.DataGen.VIEWS);
        this._bytes = db.export();
        db.close();
        this.tables = T;
        return true;
      })();
      this._ready.catch(() => { this._ready = null; });
      return this._ready;
    },
    fresh() { return new this._SQL.Database(this._bytes); },
    playground() { if (!this._play) this._play = this.fresh(); return this._play; },
    resetPlayground() { if (this._play) this._play.close(); this._play = null; },

    /** Ejecuta SQL y devuelve todas las sentencias con resultado + tiempo. */
    exec(sql, db) {
      const own = !db;
      db = db || this.fresh();
      const t0 = performance.now();
      try {
        const res = db.exec(sql);
        const changes = db.getRowsModified();
        return { ok: true, results: res, changes, ms: performance.now() - t0 };
      } catch (e) {
        return { ok: false, error: traducirErrorSQL(e.message), ms: performance.now() - t0 };
      } finally { if (own) db.close(); }
    },

    /** Resultado de la sentencia final (o de la consulta de verificación). */
    runForGrade(sql, check) {
      const db = this.fresh();
      try {
        const res = db.exec(sql);
        if (check) {
          const c = db.exec(check);
          return { ok: true, result: c[c.length - 1] || { columns: [], values: [] }, all: res };
        }
        return { ok: true, result: res[res.length - 1] || { columns: [], values: [] }, all: res };
      } catch (e) {
        return { ok: false, error: traducirErrorSQL(e.message) };
      } finally { db.close(); }
    },

    expected(ex) {
      if (!this._expected.has(ex.id)) {
        const r = this.runForGrade((ex.setup ? ex.setup + ';\n' : '') + ex.solucion, ex.check);
        if (!r.ok) throw new Error('La solución de referencia falló: ' + r.error);
        this._expected.set(ex.id, r.result);
      }
      return this._expected.get(ex.id);
    },

    grade(ex, userSql) {
      const r = this.runForGrade((ex.setup ? ex.setup + ';\n' : '') + userSql, ex.check);
      if (!r.ok) return { ok: false, error: r.error };
      return { ok: true, ...compareResults(r.result, this.expected(ex), !!ex.ordenado), result: r.result };
    }
  };

  function norm(v) {
    if (v === null || v === undefined) return null;
    if (typeof v === 'number') return Math.round(v * 100) / 100;
    if (typeof v === 'boolean') return v ? 1 : 0;
    if (typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v) && v.length < 16) return Math.round(Number(v) * 100) / 100;
    return String(v);
  }
  const rowKey = (r) => JSON.stringify(r.map(norm));

  function compareResults(got, exp, ordered) {
    const gc = got.columns.length, ec = exp.columns.length;
    if (gc !== ec) {
      return { pass: false, msg: `Tu resultado tiene ${gc} columna${gc === 1 ? '' : 's'} (${got.columns.join(', ') || '—'}) y se esperaban ${ec} (${exp.columns.join(', ')}).` };
    }
    const gr = got.values.length, er = exp.values.length;
    if (gr !== er) {
      return { pass: false, msg: `Tu consulta devolvió ${gr} fila${gr === 1 ? '' : 's'} y se esperaban ${er}. Revisa los filtros (WHERE/HAVING), los JOIN o el LIMIT.` };
    }
    const same = (gv) => {
      let g = gv.map(rowKey), e = exp.values.map(rowKey);
      if (!ordered) { g = g.slice().sort(); e = e.slice().sort(); }
      for (let i = 0; i < g.length; i++) if (g[i] !== e[i]) return i;
      return -1;
    };
    let bad = same(got.values);
    let note = '';
    if (bad >= 0 && gc > 1) {
      // ¿mismas columnas en otro orden? Buscamos una permutación con los mismos valores por columna
      const colSig = (vals, j) => JSON.stringify(vals.map((r) => norm(r[j])).map(String).sort());
      const gs = got.columns.map((_, j) => colSig(got.values, j)), es = exp.columns.map((_, j) => colSig(exp.values, j));
      const used = new Set(), map = [];
      for (let j = 0; j < ec; j++) {
        const i = gs.findIndex((sg, k) => sg === es[j] && !used.has(k));
        if (i < 0) break;
        used.add(i); map.push(i);
      }
      if (map.length === ec && map.some((i, j) => i !== j)) {
        const re = got.values.map((r) => map.map((i) => r[i]));
        if (same(re) < 0) { bad = -1; note = ` (Ojo: tus columnas estaban en otro orden; el enunciado pedía ${exp.columns.join(', ')}.)`; }
      }
    }
    if (bad >= 0) {
      if (ordered) {
        const gs = got.values.map(rowKey).sort(), es = exp.values.map(rowKey).sort();
        if (gs.every((x, k) => x === es[k])) return { pass: false, msg: 'Las filas son correctas pero el ORDEN no. Revisa tu ORDER BY (y los desempates).' };
      }
      // qué columna difiere: con orden, la primera celda distinta; sin orden, la primera columna cuyos valores no coinciden
      let detalle = '';
      if (ordered) {
        const j = got.values[bad].findIndex((v, k) => JSON.stringify(norm(v)) !== JSON.stringify(norm(exp.values[bad][k])));
        if (j >= 0) detalle = ` En la fila ${bad + 1}, la columna <${exp.columns[j]}> vale ${JSON.stringify(norm(got.values[bad][j]))} y se esperaba ${JSON.stringify(norm(exp.values[bad][j]))}.`;
      } else {
        const sig = (vals, j) => JSON.stringify(vals.map((r) => norm(r[j])).map(String).sort());
        const j = exp.columns.findIndex((_, k) => sig(got.values, k) !== sig(exp.values, k));
        if (j >= 0) detalle = ` La columna <${exp.columns[j]}> no tiene los valores esperados.`;
      }
      return { pass: false, msg: `Los datos no coinciden${ordered ? ` a partir de la fila ${bad + 1}` : ''}.${detalle} Revisa cálculos, redondeos, filtros y JOIN.` };
    }
    if (note) return { pass: true, msg: '¡Correcto!' + note };
    const names = got.columns.map((c) => c.toLowerCase()), en = exp.columns.map((c) => c.toLowerCase());
    const extra = names.join() !== en.join() ? ` (Detalle: la solución usa los nombres de columna ${exp.columns.join(', ')}.)` : '';
    return { pass: true, msg: '¡Correcto! Tu resultado coincide con el esperado.' + extra };
  }

  function traducirErrorSQL(m) {
    const tips = [
      [/no such table: (\w+)/, (x) => `La tabla "${x[1]}" no existe. Revisa el nombre (mira el panel "Tablas").`],
      [/no such column: ([\w.]+)/, (x) => `La columna "${x[1]}" no existe. Revisa la ortografía o de qué tabla viene.`],
      [/near "(.+?)": syntax error/, (x) => `Error de sintaxis cerca de "${x[1]}". Revisa comas, paréntesis y palabras clave.`],
      [/incomplete input/, () => 'La consulta está incompleta (¿falta cerrar un paréntesis o una comilla?).'],
      [/ambiguous column name: (\w+)/, (x) => `La columna "${x[1]}" es ambigua: existe en varias tablas. Escribe tabla.${x[1]} o alias.${x[1]}.`],
      [/misuse of aggregate/, () => 'Uso incorrecto de una función de agregación (¿pusiste SUM/COUNT en el WHERE? Usa HAVING).'],
      [/a GROUP BY clause is required/, () => 'Falta GROUP BY.'],
      [/UNIQUE constraint failed: ([\w.]+)/, (x) => `Violación de UNIQUE en ${x[1]}: ese valor ya existe.`],
      [/NOT NULL constraint failed: ([\w.]+)/, (x) => `La columna ${x[1]} no admite NULL.`],
      [/SELECTs to the left and right of (\w+) do not have the same number of result columns/, (x) => `Las consultas a ambos lados de ${x[1]} deben tener el mismo número de columnas.`]
    ];
    for (const [re, f] of tips) { const x = m.match(re); if (x) return f(x) + `\n(SQLite: ${m})`; }
    return m;
  }

  // ---------------------------------------------------------------- Python
  function workerMain() {
    /* Pyodide se importa dentro de ensure() */
    let py = null;
    const loaded = new Set();
    const HARNESS = `
import sys, io, json, traceback, linecache, datetime as _dt
sys.path.insert(0, "/mini")
_SAMPLE = None

def _fmt_exc(e, fname="<tu código>"):
    tb = traceback.extract_tb(e.__traceback__)
    user = [f for f in tb if f.filename == fname]
    msg = "%s: %s" % (type(e).__name__, e)
    if isinstance(e, SyntaxError) and e.filename == fname:
        return "Error de sintaxis en la línea %s:\\n    %s\\n%s" % (e.lineno, (e.text or "").rstrip(), msg)
    if user:
        f = user[-1]
        return "Error en la línea %d:  %s\\n%s" % (f.lineno, (f.line or "").strip(), msg)
    return msg

def _exec(code, ns, fname="<tu código>"):
    linecache.cache[fname] = (len(code), None, [l + "\\n" for l in code.splitlines()], fname)
    buf = io.StringIO()
    old = sys.stdout, sys.stderr
    sys.stdout = sys.stderr = buf
    err = None
    try:
        exec(compile(code, fname, "exec"), ns)
    except SystemExit:
        pass
    except BaseException as e:
        err = _fmt_exc(e, fname)
    finally:
        sys.stdout, sys.stderr = old
    return buf.getvalue(), err

def _display(df, n=20):
    if hasattr(df, "show"):
        df.show(n, truncate=False)
    else:
        print(df)

def _env(mode):
    ns = {"__name__": "__main__"}
    # cada ejecución empieza con la API de práctica "limpia": límite de pedidos, tokens y fallas reiniciados
    try:
        from js import ApiTienda
        ApiTienda.reiniciar()
    except Exception:
        pass
    if mode == "pyspark":
        import pyspark.sql as ps
        global _SAMPLE
        if _SAMPLE is None:
            _SAMPLE = json.loads(_TABLES_JSON)
            ps._RAW.update(_SAMPLE)
        ps._CATALOG.clear(); ps._TEMP_VIEWS.clear(); ps._FILES.clear()
        # cada ejecución empieza sin streams ni checkpoints de la anterior (como un clúster nuevo)
        getattr(ps, "_CHECKPOINTS", {}).clear(); getattr(ps, "_STREAMS", []).clear()
        ps.SparkSession._active = None
        spark = ps.SparkSession.builder.appName("academia-datos").getOrCreate()
        ns.update(spark=spark, sc=spark.sparkContext, display=_display)
    if mode == "airflow":
        import airflow._core as c
        c.reset()
    return ns

def _norm(v):
    if isinstance(v, bool): return v
    if isinstance(v, float): return round(v, 2)
    if isinstance(v, (_dt.date, _dt.datetime)): return v.isoformat()
    if isinstance(v, (list, tuple)): return tuple(_norm(x) for x in v)
    if isinstance(v, dict): return tuple(sorted((k, _norm(x)) for k, x in v.items()))
    return v

def _as_rows(x):
    # DataFrame o Series de pandas: el índice con nombre (por ejemplo, el de un pivot) cuenta como columna
    if type(x).__module__.split(".")[0] == "pandas" and hasattr(x, "reset_index"):
        d = x.to_frame() if not hasattr(x, "columns") else x
        if not (d.index.name is None and list(d.index) == list(range(len(d)))):
            d = d.reset_index()
        cols = [str(c) for c in d.columns]
        return cols, [tuple(None if (isinstance(v, float) and v != v) else _norm(v.item() if hasattr(v, "item") else v) for v in r) for r in d.itertuples(index=False)]
    if hasattr(x, "_rows") and hasattr(x, "columns"):
        return list(x.columns), [tuple(_norm(v) for v in r) for r in x._rows]
    if isinstance(x, list) and x and hasattr(x[0], "__fields__"):
        return list(x[0].__fields__ or []), [tuple(_norm(v) for v in r) for r in x]
    return None, _norm(x)

def _compare(user, exp, ordered):
    uc, ur = _as_rows(user)
    ec, er = _as_rows(exp)
    if ec is None:
        if ur == er: return True, "¡Correcto!"
        return False, "El valor obtenido (%r) no es el esperado." % (user,)
    if uc is None:
        return False, "Se esperaba un DataFrame y obtuviste %s." % type(user).__name__
    if len(uc) != len(ec):
        return False, "Tu DataFrame tiene %d columnas %s y se esperaban %d %s." % (len(uc), uc, len(ec), ec)
    if len(ur) != len(er):
        return False, "Tu DataFrame tiene %d filas y se esperaban %d." % (len(ur), len(er))
    if not ordered:
        ur = sorted(ur, key=repr); er = sorted(er, key=repr)
    if ur != er:
        if ordered and sorted(ur, key=repr) == sorted(er, key=repr):
            return False, "Las filas son correctas pero el orden no. Revisa tu orderBy."
        for i, (a, b) in enumerate(zip(ur, er)):
            if a != b:
                return False, "Los datos no coinciden. Primera diferencia: obtuviste %r y se esperaba %r." % (a, b)
    extra = "" if [c.lower() for c in uc] == [c.lower() for c in ec] else " (La solución usa las columnas %s.)" % ec
    return True, "¡Correcto! Tu resultado coincide con el esperado." + extra

def _grade(mode, code, solution, tests, var, ordered):
    out = {"ok": True}
    exp = None
    if var and solution:
        ns_s = _env(mode)
        _, err_s = _exec(solution, ns_s, "<solución>")
        if err_s:
            return {"ok": False, "stdout": "", "error": "La solución de referencia falló: " + err_s}
        exp = ns_s.get(var)
    ns = _env(mode)
    stdout, err = _exec(code, ns)
    out["stdout"] = stdout
    if err:
        out.update(ok=False, error=err)
        return out
    if var:
        if var not in ns:
            out.update(ok=True, pass_=False, msg="No encontré la variable '%s'. Guarda tu resultado en ella: %s = ..." % (var, var))
            return out
        p, m = _compare(ns[var], exp, ordered)
        if not p or not tests:
            out.update(ok=True, pass_=p, msg=m)
            return out
    if tests:
        ns["salida"] = stdout
        ns["_codigo"] = code
        if mode == "airflow":
            import airflow._core as c
            ns["dags"] = dict(c._DAG_REGISTRY)
        buf = io.StringIO(); old = sys.stdout; sys.stdout = buf
        try:
            exec(compile(tests, "<tests>", "exec"), ns)
            out.update(ok=True, pass_=True, msg="¡Correcto! Todas las pruebas pasaron.")
        except AssertionError as e:
            out.update(ok=True, pass_=False, msg=str(e) or "Una de las pruebas no pasó. Revisa el enunciado.")
        except Exception as e:
            out.update(ok=True, pass_=False, msg="Las pruebas fallaron con %s: %s" % (type(e).__name__, e))
        finally:
            sys.stdout = old
    return out

_REPL_NS = {"__name__": "__main__"}

_ENV_PUESTAS = set()


def _shell(mode, code, argv_json, files_json, cwd, env_json="{}"):
    import os, shutil
    # las variables de entorno de la terminal (export, env: de un paso de Actions) llegan a os.environ
    for _k in list(_ENV_PUESTAS):
        os.environ.pop(_k, None)
    _ENV_PUESTAS.clear()
    for _k, _v in json.loads(env_json or "{}").items():
        if isinstance(_v, str) and _k:
            os.environ[_k] = _v
            _ENV_PUESTAS.add(_k)
    home = "/home/alumno"
    runner = "/home/runner"
    for d in (home, runner):
        if os.path.isdir(d):
            shutil.rmtree(d)
    os.makedirs(home, exist_ok=True)
    # los módulos del alumno se vuelven a importar en cada ejecución (si no, Python usa la versión vieja)
    for _m in list(sys.modules):
        _f = getattr(sys.modules[_m], "__file__", None) or ""
        if _f.startswith("/home/"):
            del sys.modules[_m]
    import importlib
    importlib.invalidate_caches()
    sys.path[:] = [x for x in sys.path if not str(x).startswith("/home/")]
    for path, content in json.loads(files_json).items():
        if content is None:  # carpeta (vacía o no) creada con mkdir en la terminal
            os.makedirs(path, exist_ok=True)
            continue
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
    os.makedirs(cwd, exist_ok=True)
    os.chdir(cwd)
    argv = json.loads(argv_json)
    sys.argv = argv or [""]
    # como python archivo.py: la carpeta del script (y la actual) están en sys.path
    if argv and argv[0].endswith(".py"):
        sys.path.insert(0, os.path.dirname(os.path.abspath(argv[0])))
    sys.path.insert(0, cwd)
    ns = _env(mode)
    fname = argv[0] if argv and argv[0].endswith(".py") else "<stdin>"
    stdout, err = _exec(code, ns, fname)
    os.chdir("/")
    out_files = {}
    for root, dirs, fs in [w for d in (home, runner) for w in os.walk(d)]:
        for name in fs:
            full = os.path.join(root, name)
            try:
                if os.path.getsize(full) < 16000000:
                    out_files[full] = open(full, encoding="utf-8").read()
                else:
                    stdout += f"\\n[terminal del curso] {full} pesa {os.path.getsize(full) / 1e6:.1f} MB y no se guardó: los archivos de la terminal del navegador pueden pesar hasta 16 MB. Divídelo en varios (por ejemplo, uno por día).\\n"
                    os.remove(full)
            except (UnicodeDecodeError, OSError):
                pass
    return {"ok": err is None, "stdout": stdout, "error": err, "files": out_files}

def _repl(code):
    buf = io.StringIO()
    old = sys.stdout, sys.stderr
    sys.stdout = sys.stderr = buf
    err = None
    try:
        try:
            comp = compile(code, "<stdin>", "single")
        except SyntaxError:
            comp = compile(code, "<stdin>", "exec")
        exec(comp, _REPL_NS)
    except SystemExit:
        pass
    except BaseException as e:
        err = _fmt_exc(e, "<stdin>")
    finally:
        sys.stdout, sys.stderr = old
    return {"ok": err is None, "stdout": buf.getvalue(), "error": err}

def _dbt_render(template, macros, is_inc, vars_json, this_name="this"):
    import jinja2
    vs = json.loads(vars_json or "{}")
    refs = []
    def ref(*a, **k):
        name = a[-1]
        refs.append(name)
        return "main." + name
    def source(src, table):
        return "main." + table
    def var(k, default=None):
        return vs.get(k, default)
    env = jinja2.Environment(extensions=["jinja2.ext.do"])
    ctx = dict(ref=ref, source=source, config=lambda *a, **k: "", var=var, is_incremental=lambda: bool(is_inc),
               this=this_name, target={"name": "dev", "schema": "analytics"}, env_var=lambda k, d=None: d,
               log=lambda *a, **k: "", run_started_at=_dt.datetime(2024, 12, 31))
    tpl = env.from_string((macros or "") + "\\n" + template)
    return tpl.render(**ctx).strip()
`;
    async function ensure(mode, msg) {
      if (!py) {
        // Pyodide 314+ solo funciona en workers de tipo módulo: se carga con import() dinámico
        const { loadPyodide } = await import(msg.pyodideUrl);
        py = await loadPyodide();
        for (const [p, src] of Object.entries(msg.sources)) {
          const dir = '/mini/' + p.split('/').slice(0, -1).join('/');
          py.FS.mkdirTree(dir);
          py.FS.writeFile('/mini/' + p, src);
        }
        await py.runPythonAsync(HARNESS);
      }
      // la API de práctica (api-practica.js) también vive en el worker, para que requests la use
      if (msg.apiSrc && !self.ApiTienda) { try { new Function('g', 'return (' + msg.apiSrc + ')(g)')(self); } catch (e) { /* sin API */ } }
      // la API de Pedalia (api-pedalia.js) también: con la configuración del alumno (apps, cuota, incidentes)
      if (msg.apiPedaliaSrc && !self.ApiPedalia) { try { new Function('g', 'return (' + msg.apiPedaliaSrc + ')(g)')(self); } catch (e) { /* sin API */ } }
      if (msg.apiPedaliaCfg && self.ApiPedalia) self.ApiPedalia.configurar(msg.apiPedaliaCfg);
      // PagoYa (la pasarela de Mercado Vecino, mercado-vecino.js): la misma semilla y el mismo reloj que en la página
      if (msg.mercadoSrc && !self.PagoYa) { try { new Function('g', 'return (' + msg.mercadoSrc + ')(g)')(self); } catch (e) { /* sin PagoYa */ } }
      if (msg.mercadoCfg && self.PagoYa) self.PagoYa.configurar(msg.mercadoCfg);
      if (msg.rutaSrc && !self.RutaSurApi) { try { new Function('g', 'return (' + msg.rutaSrc + ')(g)')(self); } catch (e) { /* sin TMS */ } }
      if (msg.rutaCfg && self.RutaSurApi) self.RutaSurApi.configurar(msg.rutaCfg);
      if (msg.ccSrc && !self.CuentasClarasApi) { try { new Function('g', 'return (' + msg.ccSrc + ')(g)')(self); } catch (e) { /* sin Cuentas Claras */ } }
      if (msg.ccCfg && self.CuentasClarasApi) self.CuentasClarasApi.configurar(msg.ccCfg);
      if (msg.solSrc && !self.AlmacenesSolApi) { try { new Function('g', 'return (' + msg.solSrc + ')(g)')(self); } catch (e) { /* sin Almacenes del Sol */ } }
      if (msg.solCfg && self.AlmacenesSolApi) self.AlmacenesSolApi.configurar(msg.solCfg);
      if (msg.cnSrc && !self.ConectaApi) { try { new Function('g', 'return (' + msg.cnSrc + ')(g)')(self); } catch (e) { /* sin Conecta */ } }
      if (msg.cnCfg && self.ConectaApi) self.ConectaApi.configurar(msg.cnCfg);
      const need = [];
      // desde Pyodide 314, sqlite3 viene incluido en la biblioteca estándar (no se instala aparte)
      if ((mode === 'dbt' || mode === 'airflow') && !loaded.has('jinja2')) need.push('jinja2');
      if (need.length) { await py.loadPackage(need); need.forEach((n) => loaded.add(n)); }
      if (mode === 'pyspark' && msg.tables && !loaded.has('tables')) {
        py.globals.set('_TABLES_JSON', msg.tables);
        loaded.add('tables');
      }
    }
    const enviar = (o) => { const x = self.ApiPedalia ? { ...o, apiPedalia: { log: self.ApiPedalia.tomarLog(), cuota: self.ApiPedalia.config().cuota } } : { ...o }; if (self.CuentasClarasApi) x.ccCambios = self.CuentasClarasApi.tomarCambios(); if (self.ConectaApi) x.cnCambios = self.ConectaApi.tomarCambios(); self.postMessage(x); };
    self.onmessage = async (e) => {
      const msg = e.data;
      try {
        await ensure(msg.mode, msg);
        if (msg.kind === 'warmup') { enviar({ id: msg.id, ok: true }); return; }
        // pandas, numpy y otras librerías de Pyodide se cargan solas si el código las importa
        const codigo = [msg.code, msg.solution, msg.tests].filter(Boolean).join('\n');
        if (/^\s*(import|from)\s+(pandas|numpy)\b/m.test(codigo) && !loaded.has('pandas')) { await py.loadPackage(['pandas']); loaded.add('pandas'); }
        // quien arma el código (por ejemplo, JupyterLab de práctica) puede pedir librerías explícitamente
        const pedidas = (msg.libs || []).filter((n) => ['pandas', 'matplotlib'].includes(n) && !loaded.has(n));
        if (pedidas.length) { await py.loadPackage(pedidas); pedidas.forEach((n) => loaded.add(n)); }
        if (msg.kind === 'dbt') {
          const f = py.globals.get('_dbt_render');
          const sql = f(msg.template, msg.macros || '', !!msg.incremental, JSON.stringify(msg.vars || {}), msg.thisName || 'this');
          f.destroy();
          enviar({ id: msg.id, ok: true, sql });
          return;
        }
        if (msg.kind === 'shell') {
          const f = py.globals.get('_shell');
          const r = f(msg.mode, msg.code, JSON.stringify(msg.argv || []), JSON.stringify(msg.files || {}), msg.cwd || '/home/alumno', JSON.stringify(msg.env || {}));
          const out = r.toJs({ dict_converter: Object.fromEntries });
          r.destroy(); f.destroy();
          enviar({ id: msg.id, ...out });
          return;
        }
        // sqlglot (assets/vendor, MIT): formatea SQL y lo traduce entre dialectos. Se carga la primera vez que se usa.
        if (msg.kind === 'sqlglot') {
          if (!loaded.has('sqlglot')) {
            await py.loadPackage(msg.wheel);
            await py.runPythonAsync(`
import json as _json, logging as _logging
import sqlglot as _sg
from sqlglot.errors import ParseError as _ParseError, ErrorLevel as _ErrorLevel
class _Avisos(_logging.Handler):
    def __init__(self):
        super().__init__(); self.lista = []
    def emit(self, r):
        self.lista.append(r.getMessage())
_avisos = _Avisos()
_logging.getLogger('sqlglot').addHandler(_avisos)
_logging.getLogger('sqlglot').setLevel(_logging.WARNING)
def _sqlglot(accion, sql, desde, hacia):
    _avisos.lista = []
    try:
        destino = desde if accion == 'formatear' else hacia
        partes = _sg.transpile(sql, read=desde, write=destino, pretty=True, unsupported_level=_ErrorLevel.WARN)
        texto = ';\\n\\n'.join(p for p in partes if p.strip())
        return _json.dumps({'ok': True, 'sql': texto + (';' if texto else ''), 'avisos': list(dict.fromkeys(_avisos.lista)), 'version': _sg.__version__})
    except _ParseError as e:
        errs = [{'linea': x.get('line'), 'col': x.get('col'), 'desc': x.get('description'), 'cerca': (x.get('start_context') or '') + (x.get('highlight') or '')} for x in e.errors]
        return _json.dumps({'ok': False, 'errores': errs, 'error': str(e).split('\\n')[0]})
    except Exception as e:
        return _json.dumps({'ok': False, 'error': str(e).split('\\n')[0]})
`);
            loaded.add('sqlglot');
          }
          const f = py.globals.get('_sqlglot');
          const r = JSON.parse(f(msg.accion, msg.code, msg.desde || 'sqlite', msg.hacia || 'duckdb'));
          f.destroy();
          enviar({ id: msg.id, ...r });
          return;
        }
        if (msg.kind === 'repl') {
          const f = py.globals.get('_repl');
          const r = f(msg.code);
          const out = r.toJs({ dict_converter: Object.fromEntries });
          r.destroy(); f.destroy();
          enviar({ id: msg.id, ...out });
          return;
        }
        const g = py.globals.get('_grade');
        const res = g(msg.mode, msg.code, msg.solution || '', msg.tests || '', msg.compareVar || '', !!msg.ordered);
        const out = res.toJs({ dict_converter: Object.fromEntries });
        res.destroy(); g.destroy();
        out.pass = out.pass_;
        enviar({ id: msg.id, ...out });
      } catch (err) {
        enviar({ id: msg.id, ok: false, error: String(err && err.message || err) });
      }
    };
  }

  const PY = {
    worker: null, seq: 0, pending: new Map(), status: 'idle', listeners: new Set(), _tablesJson: null, _sentTables: false,
    _spawn() {
      const blob = new Blob([`(${workerMain.toString()})();`], { type: 'application/javascript' });
      this.worker = new Worker(URL.createObjectURL(blob), { type: 'module' });
      this._sentTables = false;
      this.worker.onmessage = (e) => {
        if (e.data && e.data.apiPedalia && window.ApiPedaliaHost) window.ApiPedaliaHost.incorporar(e.data.apiPedalia.log, e.data.apiPedalia.cuota);
        if (e.data && e.data.ccCambios && e.data.ccCambios.length && window.CuentasClarasHost) window.CuentasClarasHost.incorporar(e.data.ccCambios);
        if (e.data && e.data.cnCambios && e.data.cnCambios.length && window.ConectaHost) window.ConectaHost.incorporar(e.data.cnCambios);
        const p = this.pending.get(e.data.id);
        if (p) { clearTimeout(p.timer); this.pending.delete(e.data.id); this._setStatus('ready'); p.resolve(e.data); }
      };
      this.worker.onerror = (e) => {
        for (const p of this.pending.values()) { clearTimeout(p.timer); p.resolve({ ok: false, error: 'Error del intérprete: ' + (e.message || 'desconocido') }); }
        this.pending.clear();
        this.worker = null; this._setStatus('idle');
      };
    },
    _setStatus(s) { this.status = s; this.listeners.forEach((f) => f(s)); },
    _tables() {
      if (!this._tablesJson) {
        const T = SQL.tables || window.DataGen.build();
        const pick = Object.keys(T).filter((k) => !['logins', 'tipos_cambio', 'clientes_crudo'].includes(k));
        this._tablesJson = JSON.stringify(Object.fromEntries(pick.map((k) => [k, T[k]])));
      }
      return this._tablesJson;
    },
    // Las fuentes de mini-Spark y mini-Airflow (assets/js/pysrc.js, ~200 KB) se descargan recién la primera vez
    // que se ejecuta Python: quien solo lee lecciones o usa SQL no las necesita.
    _fuentes() {
      if (window.PY_SOURCES) return Promise.resolve();
      if (!this._cargaSrc) this._cargaSrc = new Promise((ok, mal) => { const s = document.createElement('script'); s.src = 'assets/js/pysrc.js?v=' + ((window.COURSE || {}).vJs || ''); s.onload = ok; s.onerror = () => { s.remove(); this._cargaSrc = null; mal(new Error('pysrc')); }; document.head.append(s); });
      return this._cargaSrc;
    },
    _send(msg, timeoutMs = 45000) {
      if (!window.PY_SOURCES) return this._fuentes().then(() => this._send(msg, timeoutMs), () => ({ ok: false, error: 'No se pudo descargar el intérprete de práctica. Revisa tu conexión a internet y vuelve a intentar.' }));
      if (!this.worker) this._spawn();
      const id = ++this.seq;
      const first = this.status !== 'ready';
      if (first) this._setStatus('loading');
      const full = { ...msg, id, pyodideUrl: PYODIDE_URL, sources: window.PY_SOURCES, apiSrc: window.API_TIENDA_SRC, apiPedaliaSrc: window.API_PEDALIA_SRC, apiPedaliaCfg: window.ApiPedaliaHost ? window.ApiPedaliaHost.configParaWorker() : null, mercadoSrc: window.MERCADO_VECINO_SRC, mercadoCfg: window.MercadoVecinoHost ? window.MercadoVecinoHost.configParaWorker() : null, rutaSrc: window.RUTA_SUR_SRC, rutaCfg: window.RutaSurHost ? window.RutaSurHost.configParaWorker() : null, ccSrc: window.CUENTAS_CLARAS_SRC, ccCfg: window.CuentasClarasHost ? window.CuentasClarasHost.configParaWorker() : null, solSrc: window.ALMACENES_SOL_SRC, solCfg: window.AlmacenesSolHost ? window.AlmacenesSolHost.configParaWorker() : null, cnSrc: window.CONECTA_SRC, cnCfg: window.ConectaHost ? window.ConectaHost.configParaWorker() : null };
      if (msg.mode === 'pyspark' && !this._sentTables) { full.tables = this._tables(); this._sentTables = true; }
      return new Promise((resolve) => {
        const ms = first ? Math.max(timeoutMs, 180000) : timeoutMs;
        const timer = setTimeout(() => {
          this.pending.delete(id);
          if (this.worker) this.worker.terminate();
          this.worker = null; this._setStatus('idle');
          resolve({ ok: false, error: `Tiempo agotado (${Math.round(ms / 1000)} s). ¿Hay un bucle infinito? El intérprete se reinició.` });
        }, ms);
        this.pending.set(id, { resolve, timer });
        this.worker.postMessage(full);
      });
    },
    run(mode, code) { return this._send({ kind: 'run', mode, code }); },
    grade(mode, ex, code) {
      return this._send({ kind: 'grade', mode, code, solution: ex.solucion, tests: ex.test || '', compareVar: ex.variable || (ex.test ? '' : (mode === 'pyspark' ? 'resultado' : '')), ordered: !!ex.ordenado });
    },
    dbt(template, opts = {}) { return this._send({ kind: 'dbt', mode: 'dbt', template, ...opts }); },
    warmup(mode) { return this._send({ kind: 'warmup', mode }); },
    shell({ code, argv, files, cwd, mode = 'python', env }) { return this._send({ kind: 'shell', mode, code, argv, files, cwd, env }); },
    // formatear o traducir SQL con sqlglot (accion: 'formatear' | 'traducir')
    sqlglot(accion, code, desde, hacia) { return this._send({ kind: 'sqlglot', mode: 'python', accion, code, desde, hacia, wheel: new URL('assets/vendor/sqlglot-26.17.1-py3-none-any.whl', location.href).href }, 60000); },
    repl(code, mode = 'python', opts = {}) { return this._send({ kind: 'repl', mode, code, libs: opts.libs }, opts.timeoutMs || 45000); }
  };

  // --------------------------------------------------------------- dbt
  const DBT = {
    async compile(ex, code) {
      const r = await PY.dbt(code, { macros: ex.setup || '', incremental: !!ex.incremental, thisName: ex.this || 'this' });
      return r;
    },
    async run(ex, code) {
      const c = await this.compile(ex, code);
      if (!c.ok) return { ok: false, error: c.error };
      let r;
      if (ex.previo) { const db = SQL.fresh(); db.exec(ex.previo); r = SQL.exec(c.sql, db); db.close(); }
      else r = SQL.exec(c.sql);
      return { ...r, compiled: c.sql };
    },
    async grade(ex, code) {
      const c = await this.compile(ex, code);
      if (!c.ok) return { ok: false, error: c.error };
      if (!this._exp) this._exp = new Map();
      if (!this._exp.has(ex.id)) {
        const s = await this.compile(ex, ex.solucion);
        if (!s.ok) return { ok: false, error: 'La solución de referencia falló: ' + s.error };
        const r = SQL.runForGrade((ex.previo ? ex.previo + ';\n' : '') + s.sql);
        if (!r.ok) return { ok: false, error: 'La solución de referencia falló: ' + r.error };
        this._exp.set(ex.id, r.result);
      }
      const r = SQL.runForGrade((ex.previo ? ex.previo + ';\n' : '') + c.sql);
      if (!r.ok) return { ok: false, error: r.error, compiled: c.sql };
      return { ok: true, ...compareResults(r.result, this._exp.get(ex.id), !!ex.ordenado), result: r.result, compiled: c.sql };
    }
  };

  // --------------------------------------------------------------- CLI
  const CLI = {
    normalize(s) { return s.trim().replace(/^\$\s*/, '').replace(/\s+/g, ' ').replace(/[“”]/g, '"').replace(/[‘’]/g, "'"); },
    grade(ex, input) {
      const cmd = this.normalize(input);
      if (!cmd) return { pass: false, msg: 'Escribe un comando.' };
      for (const pat of ex.respuesta) {
        let re;
        try { re = new RegExp('^' + pat + '$', 'i'); } catch (e) { continue; }
        if (re.test(cmd)) return { pass: true, msg: '¡Correcto!' };
      }
      const tool = (ex.respuesta[0].match(/^[\w-]+/) || [''])[0];
      if (tool && !cmd.toLowerCase().startsWith(tool.toLowerCase())) return { pass: false, msg: `El comando debería empezar con "${tool}".` };
      return { pass: false, msg: 'Casi. Revisa el subcomando y los parámetros (--flags) que pide el enunciado.' };
    }
  };

  // ------------------------------------------------------------------ SQL del curso
  // Ejemplos, ejercicios y misiones corren en DuckDB (WebAssembly), con el SQL de las lecciones traducido desde
  // SQLite (sqlite-a-duckdb.js). Si DuckDB no carga, o la consulta usa algo propio de SQLite (PRAGMA, su plan de
  // consulta, triggers, transacciones explícitas), corre en SQLite. Tu consulta y la solución siempre se
  // comparan en el mismo motor.
  const CursoSQL = {
    preferencia: 'duckdb', _sinDuck: false, _esperado: new Map(), _ejSqlite: new Set(), _preparando: null,
    duck() { return this.preferencia !== 'sqlite' && !this._sinDuck && window.SqlMotores && window.SqliteADuckdb ? window.SqlMotores.DUCK : null; },
    nombre() { return this.duck() ? 'DuckDB' : 'SQLite'; },
    listo() { const D = this.duck(); return D ? D.estado === 'listo' : !!SQL._bytes; },
    preparar(progreso = () => {}) {
      if (this.listo()) return Promise.resolve(this.duck() ? 'duckdb' : 'sqlite');
      if (!this._preparando) {
        this._preparando = (async () => {
          const D = this.duck();
          if (D) {
            try { await D.init(progreso); return 'duckdb'; } catch (e) { this._sinDuck = true; console.warn('DuckDB no se pudo cargar; el curso sigue con SQLite.', e); }
          }
          if (!SQL._bytes) { progreso('Cargando la base de datos SQLite…'); await SQL.init(); }
          return 'sqlite';
        })().finally(() => { this._preparando = null; });
      }
      return this._preparando;
    },
    _usa(sqls) {
      const D = this.duck();
      return D && D.estado === 'listo' && !sqls.some((s) => s && window.SqliteADuckdb.soloSqlite(s)) ? D : null;
    },
    /** Ejecuta y devuelve todas las sentencias. sesion: true = los cambios se mantienen entre ejecuciones (ejemplos). */
    async exec(sql, { previo, sesion } = {}) {
      const D = this._usa([sql, previo]);
      if (D) return { ...(await D.execSqlite(sql, { previo, sesion: sesion ? 'juego' : null })), motor: 'DuckDB' };
      if (!SQL._bytes) await SQL.init();
      if (sesion) return { ...SQL.exec(sql, SQL.playground()), motor: 'SQLite' };
      const db = SQL.fresh();
      try {
        if (previo) { const p = SQL.exec(previo, db); if (!p.ok) return { ...p, motor: 'SQLite' }; }
        return { ...SQL.exec(sql, db), motor: 'SQLite' };
      } finally { db.close(); }
    },
    async runForGrade(sql, check) {
      const D = this._usa([sql, check]);
      if (D) {
        const r = await D.execSqlite(sql, { check });
        if (!r.ok) return { ok: false, error: r.error, motor: 'DuckDB' };
        const sets = check ? r.check : r.results;
        return { ok: true, result: sets[sets.length - 1] || { columns: [], values: [] }, all: r.results, motor: 'DuckDB' };
      }
      if (!SQL._bytes) await SQL.init();
      return { ...SQL.runForGrade(sql, check), motor: 'SQLite' };
    },
    async grade(ex, userSql) {
      const pre = ex.setup ? ex.setup + ';\n' : '';
      let D = this._ejSqlite.has(ex.id) ? null : this._usa([pre + ex.solucion, pre + userSql, ex.check]);
      if (D && !this._esperado.has(ex.id)) {
        const e = await this.runForGrade(pre + ex.solucion, ex.check);
        if (e.ok && e.motor === 'DuckDB') this._esperado.set(ex.id, e.result);
        else { this._ejSqlite.add(ex.id); D = null; if (!e.ok) console.warn(`La solución de ${ex.id} no corre en DuckDB; este ejercicio se corrige en SQLite.`, e.error); }
      }
      if (!D) {
        if (!SQL._bytes) await SQL.init();
        try { return { ...SQL.grade(ex, userSql), motor: 'SQLite' }; } catch (e) { return { ok: false, error: e.message }; }
      }
      const r = await this.runForGrade(pre + userSql, ex.check);
      if (!r.ok) return { ok: false, error: r.error };
      return { ok: true, ...compareResults(r.result, this._esperado.get(ex.id), !!ex.ordenado), result: r.result, motor: 'DuckDB' };
    },
    async reiniciarSesion() { SQL.resetPlayground(); const D = this.duck(); if (D) await D.limpiar('juego'); },
  };

  window.Engines = { SQL, CursoSQL, PY, DBT, CLI, compareResults };
})();
