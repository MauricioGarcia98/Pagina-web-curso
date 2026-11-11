/* Motor de la réplica de Airflow: el "scheduler", el "dag processor" y la base de metadatos de práctica.
 * Lee los DAGs de ~/airflow/dags (la misma máquina de la terminal del curso), los analiza con el mini-Airflow
 * de Python (Pyodide) y guarda corridas, instancias de tareas, XComs, variables, conexiones y eventos en
 * Machine.cloud.airflow. Lo usan la interfaz (#/airflow) y el comando `airflow` de la terminal.
 * No es Apache Airflow: es una simulación educativa. */
(function () {
  'use strict';
  const Sh = () => window.Shell;
  const HOME = '/home/alumno';
  const AIRFLOW_HOME = HOME + '/airflow';
  const DAGS = AIRFLOW_HOME + '/dags';
  const VERSION = '3.3.2'; // la misma que el resto del curso (imagen apache/airflow y mini-Airflow)
  const oyentes = new Set();
  const avisar = (q) => oyentes.forEach((f) => { try { f(q); } catch (e) { /* vista cerrada */ } });

  function M() { const m = Sh().Machine; if (!m.ready) m.load(); return m; }
  function inicial() {
    return {
      v: 1, sembrado: false, pausados: {}, vistos: {}, runs: {}, eventos: [], favoritos: [], assetEv: [], colaAssets: {},
      vars: { umbral_alerta: '150', entorno: 'dev' },
      conns: { postgres_tienda: { conn_type: 'postgres', host: 'db.tienda.local', schema: 'tienda', login: 'etl', port: 5432, password: '', extra: '', description: 'Base transaccional (ficticia)' } },
      pools: { default_pool: { slots: 128, desc: 'Default pool', diferidas: false } },
      cache: null, ajustes: { tema: 'auto', zona: 'UTC' },
    };
  }
  function st() {
    const m = M();
    if (!m.cloud.airflow || m.cloud.airflow.v !== 1) m.cloud.airflow = inicial();
    return m.cloud.airflow;
  }
  function guardar() { try { M().save(); } catch (e) { /* almacenamiento lleno */ } }

  // ------------------------------------------------------------------ DAGs de ejemplo
  const EJEMPLOS = {
    'ventas_diarias.py': `"""
### Ventas diarias

Extrae los pedidos del día de la Tienda Andina, descarta los que no tienen total y publica
la tabla **gold/ventas_diarias**. Al terminar actualiza el asset, y eso dispara \`reporte_ventas\`.
"""
from datetime import datetime, timedelta

from airflow.sdk import Asset, dag, task

VENTAS = Asset("tienda://gold/ventas_diarias")


@dag(
    schedule="@daily",
    start_date=datetime(2026, 1, 1),
    catchup=False,
    tags=["tienda", "ventas"],
    default_args={"owner": "equipo-datos", "retries": 1, "retry_delay": timedelta(minutes=5)},
    params={"tienda": "todas", "minimo": 0},
    doc_md=__doc__,
)
def ventas_diarias():
    @task
    def extraer(ds=None, params=None):
        print(f"Leyendo pedidos del {ds} (tienda: {params['tienda']})")
        return [
            {"id": 1, "total": 120.5},
            {"id": 2, "total": 80.0},
            {"id": 3, "total": None},
            {"id": 4, "total": 45.9},
        ]

    @task
    def limpiar(pedidos, params=None):
        limpios = [p for p in pedidos if p["total"] is not None and p["total"] >= params["minimo"]]
        print(f"Descarté {len(pedidos) - len(limpios)} pedidos")
        return limpios

    @task(outlets=[VENTAS])
    def publicar(pedidos):
        total = round(sum(p["total"] for p in pedidos), 2)
        print(f"Publiqué {len(pedidos)} pedidos. Total del día: {total}")
        return {"pedidos": len(pedidos), "total": total}

    publicar(limpiar(extraer()))


ventas_diarias()
`,
    'reporte_ventas.py': `"""Se ejecuta cuando ventas_diarias actualiza el asset (programación por datos)."""
from datetime import datetime

from airflow.sdk import Asset, Variable, dag, task


@dag(
    schedule=[Asset("tienda://gold/ventas_diarias")],
    start_date=datetime(2026, 1, 1),
    catchup=False,
    tags=["tienda", "reportes"],
    default_args={"owner": "equipo-bi"},
)
def reporte_ventas():
    @task
    def leer_umbral():
        umbral = float(Variable.get("umbral_alerta", default_var="100"))
        print(f"Umbral de alerta: {umbral}")
        return umbral

    @task.branch
    def decidir(umbral):
        # el total de hoy (en un caso real lo leerías de la tabla gold)
        total_hoy = 246.4
        print(f"Total de hoy: {total_hoy}")
        return "enviar_alerta" if total_hoy < umbral else "sin_alerta"

    @task
    def enviar_alerta():
        print("Ventas por debajo del umbral: aviso al canal de ventas")

    @task
    def sin_alerta():
        print("Ventas dentro de lo esperado")

    decidir(leer_umbral()) >> [enviar_alerta(), sin_alerta()]


reporte_ventas()
`,
    'ingesta_api.py': `"""Descarga clientes y productos de la API de la tienda (operadores clásicos y TaskGroup)."""
from datetime import datetime

from airflow.providers.standard.operators.bash import BashOperator
from airflow.providers.standard.operators.empty import EmptyOperator
from airflow.providers.standard.operators.python import PythonOperator
from airflow.sdk import DAG, TaskGroup


def validar_descarga(**context):
    filas = 1500
    print(f"Validando {filas} filas descargadas el {context['ds']}")
    if filas == 0:
        raise ValueError("La descarga vino vacía")
    return filas


with DAG(
    dag_id="ingesta_api",
    schedule="0 6 * * *",
    start_date=datetime(2026, 1, 1),
    catchup=False,
    tags=["tienda", "ingesta"],
    default_args={"owner": "equipo-datos"},
    description="Descarga diaria desde la API",
):
    inicio = EmptyOperator(task_id="inicio")

    with TaskGroup("descargas") as descargas:
        BashOperator(task_id="clientes", bash_command="echo descargando clientes del {{ ds }}")
        BashOperator(task_id="productos", bash_command="echo descargando productos del {{ ds }}")

    validar = PythonOperator(task_id="validar", python_callable=validar_descarga)
    fin = EmptyOperator(task_id="fin", trigger_rule="none_failed_min_one_success")

    inicio >> descargas >> validar >> fin
`,
    'conciliacion_pagos.py': `"""
Concilia los pagos con los pedidos.

Tiene un error a propósito: ejecútalo, abre el log de la tarea que falla y corrígelo
en la terminal (nano ~/airflow/dags/conciliacion_pagos.py).
"""
from datetime import datetime, timedelta

from airflow.sdk import DAG, task

with DAG(
    dag_id="conciliacion_pagos",
    schedule="@hourly",
    start_date=datetime(2026, 1, 1),
    catchup=False,
    tags=["tienda", "finanzas"],
    default_args={"owner": "equipo-finanzas", "retries": 2, "retry_delay": timedelta(minutes=1)},
):

    @task
    def traer_pagos():
        return [{"pedido": 1, "monto": 120.5}, {"pedido": 2, "monto": 80.0}]

    @task
    def conciliar(pagos):
        total = sum(p["importe"] for p in pagos)
        print(f"Total conciliado: {total}")
        return total

    @task
    def avisar(total):
        print(f"Conciliación lista: {total}")

    avisar(conciliar(traer_pagos()))
`,
    'avisos_slack.py': `"""Avisa en Slack cuando termina la carga. No carga: falta instalar el provider de Slack."""
from datetime import datetime

from airflow.providers.slack.operators.slack import SlackAPIPostOperator
from airflow.sdk import DAG

with DAG(dag_id="avisos_slack", schedule=None, start_date=datetime(2026, 1, 1), tags=["avisos"]):
    SlackAPIPostOperator(task_id="avisar", channel="#datos", text="Carga terminada")
`,
  };

  function sembrar() {
    const s = st(); const sh = Sh();
    if (s.sembrado) return;
    sh.mkdirp(DAGS);
    for (const [n, c] of Object.entries(EJEMPLOS)) if (!sh.exists(DAGS + '/' + n)) sh.writeFile(DAGS + '/' + n, c);
    if (!sh.exists(AIRFLOW_HOME + '/airflow.cfg')) sh.writeFile(AIRFLOW_HOME + '/airflow.cfg', `[core]\ndags_folder = ${DAGS}\ndags_are_paused_at_creation = True\nload_examples = False\nexecutor = LocalExecutor\n\n[api]\nbase_url = http://localhost:8080\n\n[dag_processor]\nrefresh_interval = 300\n`);
    s.sembrado = true; guardar();
  }
  function restaurarEjemplos() {
    const sh = Sh(); sh.mkdirp(DAGS);
    for (const [n, c] of Object.entries(EJEMPLOS)) sh.writeFile(DAGS + '/' + n, c);
    guardar();
  }

  // Archivos que el dag processor mira: .py dentro de dags/ (recursivo). En "safe mode" (por defecto)
  // solo se analizan los que contienen las palabras "airflow" y "dag".
  function archivos() {
    sembrar();
    const fs = M().fs; const out = [];
    for (const p of Object.keys(fs).sort()) {
      if (!p.startsWith(DAGS + '/') || fs[p].t !== 'f' || !p.endsWith('.py') || /\/(__pycache__|\.)/.test(p.slice(DAGS.length))) continue;
      const c = fs[p].c || '';
      out.push({ ruta: p, rel: p.slice(DAGS.length + 1), codigo: c, seguro: /airflow/i.test(c) && /dag/i.test(c) });
    }
    return out;
  }
  function huella(fs) { let h = 0; const s = fs.map((f) => f.ruta + '\u0000' + f.codigo).join('\u0001') + JSON.stringify(st().vars); for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return String(h); }

  // ------------------------------------------------------------------ Python
  const PRELUDIO = String.raw`
import json as _json, sys as _sys, io as _io, traceback as _tb, linecache as _lc, datetime as _dt
import airflow._core as _c
from airflow.models import param as _pm
if not getattr(_pm.Param, "_af_ui", False):
    _po = _pm.Param.__init__
    def _pinit(self, default=None, type=None, **kw):
        _po(self, default, type, **kw)
        self.extra_kw = kw
    _pm.Param.__init__ = _pinit
    _pm.Param._af_ui = True
_IN = _json.loads(__ENTRADA__)
_c._VARIABLES.update(_IN.get("vars", {}))
for _k, _v in _IN.get("conns", {}).items():
    try:
        _c.Connection(_k, **{a: _v.get(a) for a in ("conn_type", "host", "login", "password", "schema", "port", "extra")})
    except Exception:
        pass
_ERR, _ORIGEN = {}, {}

def _js(v):
    try:
        _json.dumps(v)
        return v
    except Exception:
        return repr(v)

def _cargar(ruta, src):
    _lc.cache[ruta] = (len(src), None, [l + "\n" for l in src.splitlines()], ruta)
    antes = dict(_c._DAG_REGISTRY)
    ns = {"__name__": "unusual_prefix_" + ruta.rsplit("/", 1)[-1][:-3], "__file__": ruta}
    viejo = _sys.stdout
    _sys.stdout = _io.StringIO()
    try:
        exec(compile(src, ruta, "exec"), ns)
        for d, obj in list(_c._DAG_REGISTRY.items()):
            if d in antes and antes[d] is not obj:
                _c._DAG_REGISTRY[d] = antes[d]
                raise _c.AirflowException("AirflowDagDuplicatedIdException: Ignoring DAG %s from %s - also found in %s" % (d, ruta, _ORIGEN.get(d, "?")))
    except BaseException as e:
        if isinstance(e, SyntaxError):
            txt = "Traceback (most recent call last):\n" + "".join(_tb.format_exception_only(type(e), e))
        else:
            pila = [f for f in _tb.extract_tb(e.__traceback__) if f.filename == ruta]
            txt = "Traceback (most recent call last):\n" + "".join(_tb.format_list(pila)) + "".join(_tb.format_exception_only(type(e), e))
        _ERR[ruta] = txt
        for d in list(_c._DAG_REGISTRY):
            if d not in antes:
                del _c._DAG_REGISTRY[d]
    finally:
        _sys.stdout = viejo
    for d in _c._DAG_REGISTRY:
        if d not in antes:
            _ORIGEN[d] = ruta

for _r, _src in _IN["files"].items():
    _cargar(_r, _src)

def _sched(s):
    if s is None:
        return {"t": "none", "txt": "None"}
    if isinstance(s, str):
        return {"t": "cron", "txt": s}
    if isinstance(s, _dt.timedelta):
        return {"t": "delta", "txt": str(s), "seg": s.total_seconds()}
    if isinstance(s, _c.Asset):
        return {"t": "assets", "assets": [s.uri], "op": "and"}
    if isinstance(s, (list, tuple)):
        return {"t": "assets", "assets": [a.uri for a in _c._flatten(list(s)) if isinstance(a, _c.Asset)], "op": "or" if isinstance(s, _c.AssetAny) else "and"}
    if getattr(s, "cron", None):
        return {"t": "cron", "txt": s.cron, "tt": type(s).__name__}
    if getattr(s, "crons", None):
        return {"t": "cron", "txt": ", ".join(s.crons), "tt": type(s).__name__}
    if getattr(s, "delta", None) is not None:
        return {"t": "delta", "txt": str(s.delta), "seg": s.delta.total_seconds(), "tt": type(s).__name__}
    return {"t": "otro", "txt": repr(s)}

def _op(t):
    n = type(t).__name__
    if n == "_DecoratedOperator":
        return "@task.branch" if getattr(t, "_is_branch", False) else "@task"
    if n == "_MappedDecoratedOperator":
        return "@task"
    return n

def _tarea(t):
    campos = {}
    for f in getattr(t, "template_fields", ()) or ():
        v = getattr(t, f, None)
        if v is not None:
            campos[f] = _js(v)
    fn = getattr(t, "python_callable", None)
    return {
        "id": t.task_id, "op": _op(t), "up": sorted(t.upstream_task_ids), "down": sorted(t.downstream_task_ids),
        "tr": str(t.trigger_rule), "retries": int(t.retries or 0), "owner": t.owner, "pool": t.pool or "default_pool",
        "mapeada": type(t).__name__ == "_MappedDecoratedOperator", "grupo": t.task_id.rsplit(".", 1)[0] if "." in t.task_id else None,
        "outlets": [a.uri for a in t.outlets if isinstance(a, _c.Asset)], "inlets": [a.uri for a in t.inlets if isinstance(a, _c.Asset)],
        "doc": t.doc_md, "campos": campos, "sensor": isinstance(t, _c.BaseSensorOperator), "callable": getattr(fn, "__name__", None),
        "retry_delay": str(t.retry_delay) if t.retry_delay else None, "timeout": str(t.execution_timeout) if t.execution_timeout else None,
    }

def _param(v):
    if isinstance(v, _pm.Param):
        kw = getattr(v, "extra_kw", {})
        return {"default": _js(v.default), "type": v.type, "desc": kw.get("description"), "title": kw.get("title"), "enum": _js(kw.get("enum"))}
    return {"default": _js(v), "type": None}

def _dag(d):
    tareas = [_tarea(t) for t in d.topological_sort()]
    return {
        "id": d.dag_id, "file": _ORIGEN.get(d.dag_id), "desc": d.description, "sched": _sched(d.schedule),
        "start": d.start_date.isoformat() if d.start_date else None, "end": d.end_date.isoformat() if getattr(d, "end_date", None) else None,
        "catchup": bool(d.catchup), "tags": sorted(d.tags or []), "owners": sorted({t["owner"] for t in tareas}),
        "max_runs": d.max_active_runs, "max_tasks": d.max_active_tasks, "params": {k: _param(v) for k, v in (d.params or {}).items()},
        "doc": d.doc_md, "tasks": tareas,
    }
`;

  const PARSEAR = PRELUDIO + String.raw`
_salida = {"dags": [], "errores": _ERR}
for _d in _c._DAG_REGISTRY.values():
    try:
        _salida["dags"].append(_dag(_d))
    except Exception as e:
        _salida["errores"][_ORIGEN.get(_d.dag_id, "?")] = "Error al serializar el DAG %s: %s" % (_d.dag_id, e)
print("\u0000AFJSON" + _json.dumps(_salida, default=repr))
`;

  const CORRER = PRELUDIO + String.raw`
import time as _time
_dag_id = _IN["dag_id"]
if _dag_id not in _c._DAG_REGISTRY:
    raise _c.AirflowException("El DAG %s no está en el DagBag (¿el archivo tiene un error?)" % _dag_id)
_D = _c._DAG_REGISTRY[_dag_id]
_PREV = _IN.get("prev") or {}
_SOLO = set(_IN.get("solo") or [])
_R = {}

def _envolver(t):
    orig = t.execute
    def ex(ctx):
        rec = _R.setdefault(t.task_id, {"tries": []})
        if _SOLO and t.task_id not in _SOLO and t.task_id in _PREV:
            p = _PREV[t.task_id]
            rec["reusada"] = True
            if p.get("state") == "skipped":
                raise _c.AirflowSkipException("estado anterior")
            if p.get("state") in ("failed", "upstream_failed"):
                raise _c.AirflowFailException("estado anterior: %s" % p.get("state"))
            for k, v in (p.get("xcom") or {}).items():
                ctx["dag_run"].xcoms[(t.task_id, k)] = v
            return (p.get("xcom") or {}).get("return_value")
        rend = {}
        for f in getattr(t, "template_fields", ()) or ():
            try:
                rend[f] = _js(t.render(getattr(t, f, None), ctx))
            except Exception as e:
                rend[f] = "(error al renderizar: %s)" % e
        buf = _io.StringIO()
        viejo = _sys.stdout
        _sys.stdout = buf
        try:
            res = orig(ctx)
            rec["tries"].append({"out": buf.getvalue(), "ok": True, "ret": _js(res), "rend": rend})
            return res
        except _c.AirflowSkipException as e:
            rec["tries"].append({"out": buf.getvalue(), "ok": True, "skip": str(e), "rend": rend})
            raise
        except BaseException as e:
            pila = [f for f in _tb.extract_tb(e.__traceback__) if f.filename == _D_FILE or f.filename.startswith("/home/")]
            txt = "Traceback (most recent call last):\n" + "".join(_tb.format_list(pila)) + "".join(_tb.format_exception_only(type(e), e))
            rec["tries"].append({"out": buf.getvalue(), "ok": False, "err": txt, "tipo": type(e).__name__, "msg": str(e), "rend": rend})
            raise
        finally:
            _sys.stdout = viejo
    t.execute = ex

if not hasattr(_c.TaskInstance, "_af_orig"):
    _c.TaskInstance._af_orig = _c.TaskInstance.get_template_context
def _ctx_conf(self):
    ctx = _c.TaskInstance._af_orig(self)
    p = {k: (v.value if isinstance(v, _pm.Param) else v) for k, v in ctx["params"].items()}
    p.update(self.dag_run.conf or {})   # dag_run_conf_overrides_params = True (como en Airflow)
    ctx["params"] = p
    return ctx
_c.TaskInstance.get_template_context = _ctx_conf
_D_FILE = _ORIGEN.get(_dag_id, "")
for _t in _D.tasks:
    _envolver(_t)
_run = _c.DagRun(_D, _dt.datetime.fromisoformat(_IN["logical_date"]), _IN.get("conf") or {})
_run.run_id = _IN.get("run_id") or _run.run_id
_buf = _io.StringIO()
_v = _sys.stdout
_sys.stdout = _buf
try:
    _run.run()
finally:
    _sys.stdout = _v
_xc = {}
for (_tid, _key), _val in _run.xcoms.items():
    _xc.setdefault(_tid, {})[_key] = _js(_val)
print("\u0000AFJSON" + _json.dumps({"state": _run.state, "states": _run.states, "tis": _R, "xcoms": _xc,
    "assets": [a.uri for a in _run.asset_events], "resumen": _buf.getvalue(), "dag": _dag(_D)}, default=repr))
`;

  function programa(base, entrada) { return base.replace('__ENTRADA__', JSON.stringify(JSON.stringify(entrada))); }
  async function py(base, entrada) {
    if (!window.Engines || !window.Engines.PY) throw new Error('El intérprete de Python no está disponible');
    const r = await window.Engines.PY.run('airflow', programa(base, entrada));
    const out = r.stdout || '';
    const i = out.lastIndexOf('\u0000AFJSON');
    if (i < 0) throw new Error((r.error || out || 'El análisis no devolvió resultados').trim());
    return { datos: JSON.parse(out.slice(i + 7)), extra: out.slice(0, i) };
  }
  const conns = () => Object.fromEntries(Object.entries(st().conns).map(([k, v]) => [k, v]));

  // ------------------------------------------------------------------ DagBag
  let analizando = null;
  function bolsa() { return st().cache || { dags: [], errores: {}, en: null, h: null }; }
  async function parsear(forzar) {
    const fs = archivos(); const h = huella(fs); const s = st();
    if (!forzar && s.cache && s.cache.h === h) return s.cache;
    if (analizando && analizando.h === h) return analizando.p;
    const p = (async () => {
      const seguros = fs.filter((f) => f.seguro);
      const { datos } = await py(PARSEAR, { files: Object.fromEntries(seguros.map((f) => [f.ruta, f.codigo])), vars: s.vars, conns: conns() });
      const ahora = new Date().toISOString();
      datos.dags.sort((a, b) => a.id.localeCompare(b.id));
      for (const d of datos.dags) {
        if (!(d.id in s.vistos)) { s.vistos[d.id] = ahora; if (!(d.id in s.pausados)) s.pausados[d.id] = true; }
        d.parseado = ahora;
      }
      s.cache = { h, dags: datos.dags, errores: datos.errores, en: ahora, omitidos: fs.filter((f) => !f.seguro).map((f) => f.ruta) };
      guardar(); avisar('parse');
      return s.cache;
    })();
    analizando = { h, p };
    try { return await p; } finally { if (analizando && analizando.p === p) analizando = null; }
  }
  const dag = (id) => bolsa().dags.find((d) => d.id === id);

  // ------------------------------------------------------------------ fechas y horarios
  const PRESETS = { '@once': null, '@hourly': '0 * * * *', '@daily': '0 0 * * *', '@midnight': '0 0 * * *', '@weekly': '0 0 * * 0', '@monthly': '0 0 1 * *', '@yearly': '0 0 1 1 *', '@annually': '0 0 1 1 *' };
  function campo(v, min, max) {
    if (v === '*') return null;
    const out = new Set();
    for (const parte of v.split(',')) {
      const [rango, paso] = parte.split('/'); const p = +paso || 1;
      let [a, b] = rango === '*' ? [min, max] : rango.split('-').map(Number); if (b === undefined) b = paso ? max : a;
      for (let x = a; x <= b; x += p) out.add(x);
    }
    return out;
  }
  function cronSiguiente(expr, desde, dir = 1) {
    const e = PRESETS[expr] !== undefined ? PRESETS[expr] : expr; if (!e) return null;
    const p = e.trim().split(/\s+/); if (p.length !== 5) return null;
    const [mi, ho, di, me, ds] = [campo(p[0], 0, 59), campo(p[1], 0, 23), campo(p[2], 1, 31), campo(p[3], 1, 12), campo(p[4], 0, 6)];
    const t = new Date(desde.getTime()); t.setUTCSeconds(0, 0); t.setUTCMinutes(t.getUTCMinutes() + dir);
    for (let i = 0; i < 600000; i++) {
      const ok = (!mi || mi.has(t.getUTCMinutes())) && (!ho || ho.has(t.getUTCHours())) && (!di || di.has(t.getUTCDate())) && (!me || me.has(t.getUTCMonth() + 1)) && (!ds || ds.has(t.getUTCDay()));
      if (ok) return t;
      t.setUTCMinutes(t.getUTCMinutes() + dir);
    }
    return null;
  }
  function siguiente(d, desde = new Date()) {
    if (!d || !d.sched) return null;
    if (d.sched.t === 'cron') return cronSiguiente(d.sched.txt.split(',')[0].trim(), desde, 1);
    if (d.sched.t === 'delta') return new Date(desde.getTime() + d.sched.seg * 1000);
    return null;
  }
  function anterior(d, desde = new Date()) {
    if (!d || !d.sched) return null;
    if (d.sched.t === 'cron') return cronSiguiente(d.sched.txt.split(',')[0].trim(), new Date(desde.getTime() + 60000), -1);
    if (d.sched.t === 'delta') return new Date(Math.floor(desde.getTime() / (d.sched.seg * 1000)) * d.sched.seg * 1000);
    return null;
  }
  function fechasEntre(d, desde, hasta) {
    const out = []; let t = new Date(desde.getTime() - 60000);
    for (let i = 0; i < 400; i++) {
      t = d.sched.t === 'delta' ? (i === 0 ? new Date(desde) : new Date(t.getTime() + d.sched.seg * 1000)) : cronSiguiente(d.sched.txt.split(',')[0].trim(), t, 1);
      if (!t || t > hasta) break; out.push(t);
    }
    return out;
  }
  function textoHorario(d) {
    if (!d || !d.sched) return '';
    const s = d.sched;
    if (s.t === 'none') return 'None';
    if (s.t === 'assets') return s.assets.length === 1 ? 'Asset' : `${s.assets.length} assets (${s.op === 'or' ? 'cualquiera' : 'todos'})`;
    return s.txt;
  }

  // ------------------------------------------------------------------ corridas
  const runs = (id) => st().runs[id] || (st().runs[id] = []);
  const buscarRun = (id, runId) => runs(id).find((r) => r.run_id === runId);
  function evento(e) { const s = st(); s.eventos.unshift(Object.assign({ cuando: new Date().toISOString(), usuario: 'admin' }, e)); s.eventos.length = Math.min(s.eventos.length, 400); }
  const sem = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; };
  const fmtFecha = (d) => d.toISOString().replace(/\.\d+Z$/, '+00:00');
  let cola = Promise.resolve();
  const enCurso = new Set();
  const aceleracion = { ms: 140 };   // 1 segundo simulado = 140 ms reales en la animación

  function crearRun(id, o = {}) {
    const d = dag(id); if (!d) throw new Error(`Dag id ${id} not found in DagModel`);
    const tipo = o.tipo || 'manual';
    const ld = o.logical ? new Date(o.logical) : (tipo === 'scheduled' ? (anterior(d) || new Date()) : new Date());
    const runId = o.runId || `${tipo}__${fmtFecha(ld)}`;
    if (buscarRun(id, runId)) throw new Error(`A Dag Run already exists for Dag ${id} with run id ${runId}`);
    const r = { run_id: runId, tipo, logical: ld.toISOString(), creado: new Date().toISOString(), inicio: null, fin: null, state: 'queued', conf: o.conf || {}, nota: o.nota || '', tis: {}, intento: 1, backfill: o.backfill || null, disparo: o.disparo || null };
    for (const t of d.tasks) r.tis[t.id] = { state: null, try: 0, inicio: null, fin: null, logs: [] };
    runs(id).unshift(r);
    if (runs(id).length > 30) runs(id).length = 30;
    evento({ dag: id, run: runId, evento: tipo === 'manual' ? 'trigger' : tipo === 'backfill' ? 'backfill' : 'dag_run_create', extra: o.conf && Object.keys(o.conf).length ? JSON.stringify(o.conf) : '' });
    guardar(); avisar('run');
    return r;
  }
  function disparar(id, o = {}) {
    const r = crearRun(id, o);
    if (o.despausar) pausar(id, false, true);
    if (!st().pausados[id] || o.forzar) programar(id, r, o);
    return r;
  }
  function programar(id, r, o = {}) {
    if (enCurso.has(id + '|' + r.run_id)) return cola;
    enCurso.add(id + '|' + r.run_id);
    cola = cola.then(() => ejecutar(id, r, o)).catch((e) => {
      r.state = 'failed'; r.fin = new Date().toISOString(); r.error = String(e.message || e); guardar(); avisar('run');
    }).finally(() => enCurso.delete(id + '|' + r.run_id));
    return cola;
  }

  function pyRepr(v) {
    if (v === null || v === undefined) return 'None';
    if (v === true) return 'True'; if (v === false) return 'False';
    if (typeof v === 'string') return "'" + v.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
    if (Array.isArray(v)) return '[' + v.map(pyRepr).join(', ') + ']';
    if (typeof v === 'object') return '{' + Object.entries(v).map(([k, x]) => pyRepr(k) + ': ' + pyRepr(x)).join(', ') + '}';
    return String(v);
  }
  function lineaLog(ts, nivel, msg, fuente) { return { ts, nivel, msg, fuente }; }
  function armarLogs(d, t, r, intento, rec, inicio, fin, estado) {
    const L = []; const f = (ms) => new Date(inicio.getTime() + ms).toISOString();
    const archivo = d.file || DAGS + '/' + d.id + '.py';
    L.push(lineaLog(f(0), 'INFO', `DAG bundles loaded: dags-folder`, 'airflow.dag_processing.bundles.manager.DagBundlesManager'));
    L.push(lineaLog(f(4), 'INFO', `Filling up the DagBag from ${archivo}`, 'airflow.models.dagbag.DagBag'));
    L.push(lineaLog(f(30), 'INFO', `Task instance is in running state`, 'task'));
    L.push(lineaLog(f(31), 'INFO', ` Previous state of the Task instance: queued`, 'task'));
    L.push(lineaLog(f(32), 'INFO', `Current task name:${t.id}`, 'task'));
    L.push(lineaLog(f(33), 'INFO', `Dag name:${d.id}`, 'task'));
    if (rec && rec.rend && rec.rend.bash_command) L.push(lineaLog(f(40), 'INFO', `Running command: ['/usr/bin/bash', '-c', ${JSON.stringify(rec.rend.bash_command)}]`, 'airflow.task.hooks.airflow.providers.standard.hooks.subprocess.SubprocessHook'));
    const durMs = Math.max(60, fin.getTime() - inicio.getTime() - 120);
    if (rec && rec.out) {
      const lineas = rec.out.replace(/\n$/, '').split('\n');
      lineas.forEach((l, i) => L.push(lineaLog(f(60 + Math.round(durMs * (i + 1) / (lineas.length + 2))), 'INFO', l.replace(/^\s{5}/, ''), rec.rend && rec.rend.bash_command ? 'airflow.task.hooks.airflow.providers.standard.hooks.subprocess.SubprocessHook' : 'task.stdout')));
    }
    const tf = fin.getTime() - inicio.getTime();
    if (estado === 'success') {
      if (rec && rec.ret !== undefined && rec.ret !== null) L.push(lineaLog(f(tf - 20), 'INFO', `Done. Returned value was: ${typeof rec.ret === 'string' ? rec.ret : pyRepr(rec.ret)}`, `airflow.task.operators.${t.op.startsWith('@') ? 'airflow.providers.standard.decorators.python._PythonDecoratedOperator' : t.op}`));
      if (t.op === '@task.branch' && rec && rec.ret !== undefined) L.push(lineaLog(f(tf - 15), 'INFO', `Branch into ${pyRepr(rec.ret)}`, 'airflow.task.operators.airflow.providers.standard.decorators.python._BranchPythonDecoratedOperator'));
      for (const a of t.outlets) L.push(lineaLog(f(tf - 10), 'INFO', `Asset event: ${a}`, 'task'));
    } else if (estado === 'skipped') {
      L.push(lineaLog(f(tf - 10), 'INFO', `Skipping task: ${(rec && rec.skip) || ''}`.trim(), 'task'));
    } else if (rec && rec.err) {
      L.push(lineaLog(f(tf - 15), 'ERROR', `Task failed with exception`, 'task', true));
      L.push({ ts: f(tf - 15), nivel: 'ERROR', msg: rec.err.trimEnd(), fuente: 'task', tb: true });
    }
    L.push(lineaLog(f(tf), 'INFO', estado === 'up_for_retry' ? `Marking task as UP_FOR_RETRY. dag_id=${d.id}, task_id=${t.id}, run_id=${r.run_id}, try_number=${intento}` : `Task instance in ${estado} state`, 'task'));
    return L;
  }

  async function ejecutar(id, r, o = {}) {
    await parsear();
    const d = dag(id);
    if (!d) { r.state = 'failed'; r.error = 'El DAG ya no está en el DagBag (¿el archivo tiene un error de importación?)'; r.fin = new Date().toISOString(); guardar(); avisar('run'); return; }
    r.state = 'running'; r.inicio = new Date().toISOString(); guardar(); avisar('run');
    const prev = {}; const solo = o.solo || null;
    if (solo) for (const [tid, ti] of Object.entries(r.tis)) if (!solo.includes(tid)) prev[tid] = { state: ti.state, xcom: ti.xcom || {} };
    const { datos } = await py(CORRER, { files: { [d.file]: archivos().find((f) => f.ruta === d.file).codigo }, vars: st().vars, conns: conns(), dag_id: id, logical_date: r.logical.replace('Z', ''), conf: r.conf, run_id: r.run_id, prev, solo });
    // tiempos simulados: cada tarea empieza cuando terminan sus dependencias (en paralelo si se puede)
    const t0 = Date.now(); const fin = {}; const plan = [];
    for (const t of datos.dag.tasks) {
      if (solo && !solo.includes(t.id)) continue;
      const rec = datos.tis[t.id]; const estado = datos.states[t.id] || 'removed';
      const inicioSim = Math.max(0, ...t.up.map((u) => fin[u] || 0)) + 400 + Math.round(sem(r.run_id + t.id) * 700);
      const intentos = rec ? rec.tries : [];
      const corre = intentos.length > 0;
      const dur = corre ? 900 + Math.round(sem(t.id + r.logical) * 3500) + (t.sensor ? 2500 : 0) : 0;
      const n = Math.max(1, intentos.length);
      fin[t.id] = inicioSim + (corre ? dur * n + (n - 1) * 1500 : 50);
      plan.push({ t, rec, estado, inicioSim, dur, intentos, corre });
    }
    const animar = o.animar !== false;
    const esperar = (ms) => new Promise((res) => setTimeout(res, ms));
    // estado inicial: todo en cola (scheduled → queued)
    for (const p of plan) { r.tis[p.t.id] = r.tis[p.t.id] || { state: null, try: 0, logs: [] }; Object.assign(r.tis[p.t.id], { state: p.corre ? 'scheduled' : null, inicio: null, fin: null }); r.tis[p.t.id].logs = r.tis[p.t.id].logs || []; }
    avisar('ti');
    const eventosT = [];
    for (const p of plan) {
      const ti = r.tis[p.t.id];
      if (!p.corre) { eventosT.push({ at: p.inicioSim, f: () => { ti.state = p.estado; ti.fin = new Date(t0 + p.inicioSim).toISOString(); } }); continue; }
      eventosT.push({ at: p.inicioSim - 300, f: () => { ti.state = 'queued'; } });
      p.intentos.forEach((rec, k) => {
        const ini = p.inicioSim + k * (p.dur + 1500); const fi = ini + p.dur;
        const ultimo = k === p.intentos.length - 1;
        const est = ultimo ? (rec.skip ? 'skipped' : p.estado) : 'up_for_retry';
        eventosT.push({ at: ini, f: () => { ti.state = 'running'; ti.try = (ti.try || 0) + 1; ti.inicio = new Date(t0 + ini).toISOString(); ti.fin = null; ti.pid = 4000 + Math.round(sem(p.t.id + k) * 5000); ti.host = 'airflow-worker-1'; } });
        eventosT.push({ at: fi, f: () => {
          ti.state = est; ti.fin = new Date(t0 + fi).toISOString();
          ti.logs.push({ intento: ti.try, lineas: armarLogs(datos.dag, p.t, r, ti.try, rec, new Date(t0 + ini), new Date(t0 + fi), est) });
          if (ti.logs.length > 4) ti.logs.splice(0, ti.logs.length - 4);
          ti.rend = rec.rend || {};
          if (ultimo) { ti.xcom = datos.xcoms[p.t.id] || {}; ti.duracion = (fi - ini) / 1000; }
        } });
      });
    }
    eventosT.sort((a, b) => a.at - b.at);
    let reloj = 0;
    for (const ev of eventosT) {
      if (animar && ev.at > reloj) { await esperar(Math.min(1500, (ev.at - reloj) * aceleracion.ms / 1000)); reloj = ev.at; }
      ev.f(); if (animar) avisar('ti');
    }
    if (solo) for (const [tid, est] of Object.entries(datos.states)) if (!solo.includes(tid) && r.tis[tid] && !r.tis[tid].state) r.tis[tid].state = est;
    const estados = Object.values(r.tis).map((x) => x.state);
    r.state = estados.some((x) => x === 'failed' || x === 'upstream_failed') ? 'failed' : 'success';
    const total = Math.max(0, ...Object.values(fin));
    r.fin = new Date(t0 + total).toISOString(); r.inicio = r.inicio || new Date(t0).toISOString();
    r.resumen = datos.resumen;
    if (r.state === 'success' && datos.assets.length) {
      for (const uri of [...new Set(datos.assets)]) registrarAsset(uri, { dag: id, run: r.run_id, task: (datos.dag.tasks.find((t) => t.outlets.includes(uri)) || {}).id });
    }
    evento({ dag: id, run: r.run_id, evento: r.state === 'success' ? 'dag_run_success' : 'dag_run_failed', extra: '' });
    guardar(); avisar('run');
    revisarAssets();
  }

  // ------------------------------------------------------------------ assets
  function registrarAsset(uri, o) {
    const s = st();
    s.assetEv.unshift({ uri, cuando: new Date().toISOString(), dag: o.dag || null, run: o.run || null, task: o.task || null, extra: o.extra || {}, origen: o.origen || 'task' });
    s.assetEv.length = Math.min(s.assetEv.length, 200);
    for (const d of bolsa().dags) if (d.sched.t === 'assets' && d.sched.assets.includes(uri)) { const q = s.colaAssets[d.id] || (s.colaAssets[d.id] = []); if (!q.includes(uri)) q.push(uri); }
    guardar(); avisar('asset');
  }
  function revisarAssets() {
    const s = st();
    for (const d of bolsa().dags) {
      if (d.sched.t !== 'assets' || s.pausados[d.id]) continue;
      const q = s.colaAssets[d.id] || [];
      const listo = d.sched.op === 'or' ? q.length > 0 : d.sched.assets.every((a) => q.includes(a));
      if (listo) { s.colaAssets[d.id] = []; try { disparar(d.id, { tipo: 'asset_triggered', disparo: q.slice() }); } catch (e) { /* ya existe */ } }
    }
  }

  // ------------------------------------------------------------------ acciones
  function pausar(id, valor, silencioso) {
    const s = st(); const antes = !!s.pausados[id]; s.pausados[id] = !!valor;
    evento({ dag: id, evento: valor ? 'paused' : 'unpaused', extra: `is_paused: ${!!valor}` });
    guardar(); avisar('pausa');
    if (!valor && antes && !silencioso) {
      const d = dag(id);
      // al despausar, el scheduler crea la corrida del último intervalo (catchup=False) si no existe
      if (d && (d.sched.t === 'cron' || d.sched.t === 'delta')) {
        const ld = anterior(d); const ya = ld && runs(id).some((r) => r.tipo === 'scheduled' && Math.abs(new Date(r.logical) - ld) < 1000);
        if (ld && !ya) { try { disparar(id, { tipo: 'scheduled', logical: ld.toISOString() }); } catch (e) { /* existe */ } }
      }
      revisarAssets();
    }
    if (!valor) for (const r of runs(id).slice().reverse()) if (r.state === 'queued') programar(id, r);
  }
  function limpiarRun(id, runId, o = {}) {
    const r = buscarRun(id, runId); if (!r) throw new Error('No existe la corrida');
    const d = dag(id); if (!d) throw new Error('El DAG no está cargado');
    let solo = null;
    if (o.soloFallidas) solo = Object.entries(r.tis).filter(([, ti]) => ['failed', 'upstream_failed'].includes(ti.state)).map(([k]) => k);
    if (o.tarea) {
      solo = new Set([o.tarea]);
      if (o.abajo !== false) { const pend = [o.tarea]; while (pend.length) { const t = d.tasks.find((x) => x.id === pend.pop()); if (t) for (const x of t.down) if (!solo.has(x)) { solo.add(x); pend.push(x); } } }
      if (o.arriba) { const pend = [o.tarea]; while (pend.length) { const t = d.tasks.find((x) => x.id === pend.pop()); if (t) for (const x of t.up) if (!solo.has(x)) { solo.add(x); pend.push(x); } } }
      solo = [...solo];
    }
    if (solo && !solo.length) return r;
    for (const [tid, ti] of Object.entries(r.tis)) if (!solo || solo.includes(tid)) Object.assign(ti, { state: null, inicio: null, fin: null });
    r.state = 'queued'; r.fin = null; r.intento = (r.intento || 1) + 1;
    evento({ dag: id, run: runId, task: o.tarea || '', evento: 'clear', extra: solo ? solo.join(', ') : 'todas las tareas' });
    guardar(); avisar('run');
    if (!st().pausados[id]) programar(id, r, { solo });
    return r;
  }
  function marcar(id, runId, estado, tarea) {
    const r = buscarRun(id, runId); if (!r) throw new Error('No existe la corrida');
    if (tarea) { const ti = r.tis[tarea]; if (ti) { ti.state = estado; ti.fin = ti.fin || new Date().toISOString(); } const est = Object.values(r.tis).map((x) => x.state); if (r.state !== 'running') r.state = est.some((x) => x === 'failed' || x === 'upstream_failed') ? 'failed' : est.every((x) => ['success', 'skipped'].includes(x)) ? 'success' : r.state; }
    else { r.state = estado; for (const ti of Object.values(r.tis)) if (!['success', 'skipped'].includes(ti.state) || estado === 'failed') { if (estado === 'success' || !ti.state || ti.state === 'running' || ti.state === 'queued') ti.state = estado; } r.fin = r.fin || new Date().toISOString(); }
    evento({ dag: id, run: runId, task: tarea || '', evento: estado === 'success' ? 'mark_success' : 'mark_failed', extra: '' });
    guardar(); avisar('run');
  }
  function borrarDag(id) {
    const s = st(); delete s.runs[id]; delete s.vistos[id]; delete s.pausados[id]; delete s.colaAssets[id];
    evento({ dag: id, evento: 'delete', extra: 'metadatos borrados (el archivo sigue en la carpeta de DAGs)' });
    if (s.cache) s.cache.h = null;
    guardar(); avisar('run');
  }
  function backfill(id, desde, hasta, o = {}) {
    const d = dag(id); if (!d) throw new Error('No existe el DAG');
    if (!(d.sched.t === 'cron' || d.sched.t === 'delta')) throw new Error(`${id} no tiene un horario basado en tiempo: no se puede hacer backfill`);
    let fechas = fechasEntre(d, new Date(desde), new Date(hasta));
    if (!fechas.length) throw new Error('No hay intervalos del horario entre esas fechas');
    if (fechas.length > 40) throw new Error(`Son ${fechas.length} corridas: la práctica permite hasta 40 por backfill`);
    if (o.reverso) fechas = fechas.reverse();
    const bid = Math.round(sem(id + desde + hasta + Date.now()) * 900) + 1;
    const creadas = [];
    for (const f of fechas) {
      const existente = runs(id).find((r) => Math.abs(new Date(r.logical) - f) < 1000);
      const modo = o.reproceso || 'none';
      if (existente) {
        if (modo === 'completed' || (modo === 'failed' && existente.state === 'failed')) { limpiarRun(id, existente.run_id); creadas.push(existente); }
        continue;
      }
      const r = crearRun(id, { tipo: 'backfill', logical: f.toISOString(), runId: `backfill__${fmtFecha(f)}`, conf: o.conf, backfill: bid });
      creadas.push(r);
      if (!st().pausados[id] || o.forzar !== false) programar(id, r);
    }
    return { id: bid, runs: creadas };
  }

  // ------------------------------------------------------------------ variables, conexiones, pools
  function setVar(k, v, desc) { st().vars[k] = String(v); if (desc !== undefined) (st().varsDesc || (st().varsDesc = {}))[k] = desc; evento({ evento: 'variable.create', extra: k }); guardar(); avisar('var'); }
  function delVar(k) { delete st().vars[k]; evento({ evento: 'variable.delete', extra: k }); guardar(); avisar('var'); }
  function setConn(id, c) { st().conns[id] = Object.assign({ conn_type: '', host: '', schema: '', login: '', password: '', port: null, extra: '', description: '' }, c); evento({ evento: 'connection.create', extra: id }); guardar(); avisar('conn'); }
  function delConn(id) { delete st().conns[id]; evento({ evento: 'connection.delete', extra: id }); guardar(); avisar('conn'); }

  // ------------------------------------------------------------------ prueba de una sola tarea (airflow tasks test)
  async function probarTarea(id, tarea, fecha) {
    await parsear();
    const d = dag(id); if (!d) throw new Error(`Dag '${id}' could not be found`);
    if (!d.tasks.some((t) => t.id === tarea)) throw new Error(`Task ${tarea} not found in Dag ${id}`);
    const prev = {}; for (const t of d.tasks) if (t.id !== tarea) prev[t.id] = { state: 'success', xcom: {} };
    const { datos } = await py(CORRER, { files: { [d.file]: archivos().find((f) => f.ruta === d.file).codigo }, vars: st().vars, conns: conns(), dag_id: id, logical_date: (fecha || new Date().toISOString().slice(0, 10)) + 'T00:00:00', conf: {}, run_id: '__airflow_temporary_run_' + new Date().toISOString(), prev, solo: [tarea] });
    return { estado: datos.states[tarea], rec: datos.tis[tarea], dag: datos.dag };
  }
  async function probarDag(id, fecha, conf) {
    await parsear();
    const d = dag(id); if (!d) throw new Error(`Dag '${id}' could not be found`);
    const { datos } = await py(CORRER, { files: { [d.file]: archivos().find((f) => f.ruta === d.file).codigo }, vars: st().vars, conns: conns(), dag_id: id, logical_date: (fecha || new Date().toISOString().slice(0, 10)) + 'T00:00:00', conf: conf || {}, run_id: 'manual__' + new Date().toISOString(), prev: {}, solo: null });
    return datos;
  }

  window.AirflowMotor = {
    VERSION, DAGS, AIRFLOW_HOME, EJEMPLOS, oyentes, st, guardar, sembrar, restaurarEjemplos, archivos, parsear, bolsa, dag,
    runs, buscarRun, disparar, pausar, limpiarRun, marcar, borrarDag, backfill, registrarAsset, revisarAssets,
    setVar, delVar, setConn, delConn, probarTarea, probarDag, pyRepr, siguiente, anterior, textoHorario, fechasEntre, evento, aceleracion,
    reiniciar() { const m = M(); m.cloud.airflow = inicial(); guardar(); avisar('reset'); },
  };
})();
