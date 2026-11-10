"""mini-MLflow: simulador educativo de MLflow (seguimiento de experimentos y registro de modelos).
Guarda en memoria experimentos, corridas (parámetros, métricas, etiquetas, modelos) y el registro de modelos de
Unity Catalog (catalogo.esquema.modelo) con versiones y alias como @champion. El Databricks de práctica muestra
todo en Experiments y Models. No es MLflow: no hay servidor ni artefactos en disco."""
import time as _time
import uuid as _uuid
import json as _json

__version__ = "3.1.0 (mini-MLflow simulado)"
_EXPERIMENTOS = {}   # nombre -> {"id", "nombre", "creado"}
_RUNS = {}           # run_id -> dict
_MODELOS = {}        # nombre -> {"versiones": [..], "alias": {}}
_OBJETOS = {}        # "runs:/id/modelo" -> objeto del modelo (solo en esta sesión)
_ACTIVA = []
_ULTIMA = [None]
_ESTADO = {"experimento": "Default", "registry": "databricks-uc", "tracking": "databricks"}


class MlflowException(Exception):
    pass


def set_tracking_uri(uri):
    _ESTADO["tracking"] = uri


def set_registry_uri(uri):
    _ESTADO["registry"] = uri


def get_tracking_uri():
    return _ESTADO["tracking"]


class Experiment:
    def __init__(self, d):
        self.experiment_id = d["id"]
        self.name = d["nombre"]
        self.lifecycle_stage = "active"

    def __repr__(self):
        return "<Experiment: experiment_id='%s', name='%s'>" % (self.experiment_id, self.name)


def _exp(nombre):
    if nombre not in _EXPERIMENTOS:
        _EXPERIMENTOS[nombre] = {"id": str(1000 + len(_EXPERIMENTOS)), "nombre": nombre, "creado": _time.time()}
    return _EXPERIMENTOS[nombre]


def set_experiment(experiment_name=None, experiment_id=None):
    nombre = experiment_name or next((e["nombre"] for e in _EXPERIMENTOS.values() if e["id"] == str(experiment_id)), None) or "Default"
    _ESTADO["experimento"] = nombre
    return Experiment(_exp(nombre))


def get_experiment_by_name(name):
    return Experiment(_EXPERIMENTOS[name]) if name in _EXPERIMENTOS else None


class _Info:
    def __init__(self, r):
        self.run_id = r["id"]
        self.run_name = r["nombre"]
        self.experiment_id = _EXPERIMENTOS[r["experimento"]]["id"]
        self.status = r["estado"]
        self.artifact_uri = "dbfs:/databricks/mlflow-tracking/%s/%s/artifacts" % (self.experiment_id, r["id"])


class _Data:
    def __init__(self, r):
        self.params = dict(r["params"])
        self.metrics = {k: v[-1]["valor"] for k, v in r["metricas"].items()}
        self.tags = dict(r["tags"])


class Run:
    def __init__(self, r):
        self.info = _Info(r)
        self.data = _Data(r)

    def __enter__(self):
        return self

    def __exit__(self, tipo, valor, tb):
        end_run("FAILED" if tipo else "FINISHED")
        return False

    def __repr__(self):
        return "<ActiveRun: run_id=%s, name=%s>" % (self.info.run_id, self.info.run_name)


def start_run(run_id=None, run_name=None, nested=False, experiment_id=None, tags=None, description=None):
    if _ACTIVA and not nested:
        raise MlflowException("Run with UUID %s is already active. Para empezar otra, termina la actual con mlflow.end_run() o usa nested=True." % _ACTIVA[-1])
    if experiment_id:
        set_experiment(experiment_id=experiment_id)
    rid = run_id or _uuid.uuid4().hex
    if rid not in _RUNS:
        adj = ["brillante", "veloz", "sereno", "audaz", "curioso", "valiente"][len(_RUNS) % 6]
        sus = ["halcon", "zorro", "puma", "colibri", "lince", "condor"][(len(_RUNS) // 6) % 6]
        _RUNS[rid] = {"id": rid, "nombre": run_name or "%s-%s-%d" % (adj, sus, len(_RUNS) + 1), "experimento": _ESTADO["experimento"], "inicio": _time.time(), "fin": None,
                      "estado": "RUNNING", "params": {}, "metricas": {}, "tags": dict(tags or {}), "modelos": [], "padre": _ACTIVA[-1] if _ACTIVA else None, "descripcion": description}
        _exp(_ESTADO["experimento"])
    _ACTIVA.append(rid)
    return Run(_RUNS[rid])


def _actual():
    if not _ACTIVA:
        start_run()
    return _RUNS[_ACTIVA[-1]]


def active_run():
    return Run(_RUNS[_ACTIVA[-1]]) if _ACTIVA else None


def last_active_run():
    return Run(_RUNS[_ULTIMA[0]]) if _ULTIMA[0] else None


def end_run(status="FINISHED"):
    if _ACTIVA:
        rid = _ACTIVA.pop()
        _RUNS[rid]["estado"] = status
        _RUNS[rid]["fin"] = _time.time()
        _ULTIMA[0] = rid


def log_param(key, value):
    r = _actual()
    if key in r["params"] and str(r["params"][key]) != str(value):
        raise MlflowException("Changing param values is not allowed. Param with key='%s' was already logged with value='%s'. Un parámetro se registra una sola vez por corrida." % (key, r["params"][key]))
    r["params"][key] = str(value)
    return value


def log_params(params):
    for k, v in params.items():
        log_param(k, v)


def log_metric(key, value, step=None):
    r = _actual()
    serie = r["metricas"].setdefault(key, [])
    serie.append({"valor": float(value), "paso": step if step is not None else len(serie), "t": _time.time()})


def log_metrics(metrics, step=None):
    for k, v in metrics.items():
        log_metric(k, v, step)


def set_tag(key, value):
    _actual()["tags"][key] = str(value)


def set_tags(tags):
    for k, v in tags.items():
        set_tag(k, v)


def log_dict(d, artifact_file):
    _actual().setdefault("artefactos", []).append(artifact_file)


def log_text(text, artifact_file):
    _actual().setdefault("artefactos", []).append(artifact_file)


def log_artifact(local_path, artifact_path=None):
    _actual().setdefault("artefactos", []).append(local_path)


class ModelVersion:
    def __init__(self, nombre, v):
        self.name = nombre
        self.version = str(v["version"])
        self.run_id = v["run_id"]
        self.source = v["fuente"]
        self.aliases = [a for a, ver in _MODELOS[nombre]["alias"].items() if str(ver) == str(v["version"])]
        self.status = "READY"

    def __repr__(self):
        return "<ModelVersion: name='%s', version=%s, aliases=%s>" % (self.name, self.version, self.aliases)


def _nombre_uc(nombre):
    if _ESTADO["registry"] == "databricks-uc" and nombre.count(".") != 2:
        raise MlflowException("En Unity Catalog el nombre del modelo tiene tres partes: catalogo.esquema.modelo (por ejemplo, main.default.%s)." % nombre)
    return nombre


def register_model(model_uri, name, tags=None):
    nombre = _nombre_uc(name)
    if not model_uri.startswith("runs:/") or model_uri not in _OBJETOS:
        raise MlflowException("No encontré el modelo %s. Primero regístralo en una corrida con mlflow.sklearn.log_model(...)." % model_uri)
    m = _MODELOS.setdefault(nombre, {"versiones": [], "alias": {}, "creado": _time.time()})
    v = {"version": len(m["versiones"]) + 1, "run_id": model_uri.split("/")[1], "fuente": model_uri, "creado": _time.time(), "tags": dict(tags or {})}
    m["versiones"].append(v)
    print("Registered model '%s' version %d" % (nombre, v["version"]))
    return ModelVersion(nombre, v)


class _Flavor:
    def __init__(self, nombre):
        self._n = nombre

    def log_model(self, model=None, artifact_path=None, name=None, registered_model_name=None, input_example=None, signature=None, **kw):
        if model is None:
            model = kw.get("sk_model") or kw.get("python_model")
        r = _actual()
        art = name or artifact_path or "model"
        uri = "runs:/%s/%s" % (r["id"], art)
        _OBJETOS[uri] = model
        r["modelos"].append({"ruta": art, "flavor": self._n, "tipo": type(model).__name__, "firma": bool(signature) or input_example is not None})
        if registered_model_name:
            register_model(uri, registered_model_name)
        return type("ModelInfo", (), {"model_uri": uri, "artifact_path": art})()

    def autolog(self, **kw):
        _ESTADO["autolog"] = self._n
        print("mlflow.%s.autolog() activado: en Databricks registra solo parámetros, métricas y el modelo de cada fit(). En la práctica usa log_param/log_metric/log_model." % self._n)

    def load_model(self, model_uri):
        return pyfunc.load_model(model_uri)


sklearn = _Flavor("sklearn")
spark = _Flavor("spark")
xgboost = _Flavor("xgboost")


class _PyFunc(_Flavor):
    def load_model(self, model_uri):
        uri = model_uri
        if model_uri.startswith("models:/"):
            resto = model_uri[len("models:/"):]
            if "@" in resto:
                nombre, alias = resto.split("@", 1)
                m = _MODELOS.get(nombre)
                if not m or alias not in m["alias"]:
                    raise MlflowException("El modelo %s no tiene el alias @%s. Asígnalo con MlflowClient().set_registered_model_alias(...)." % (nombre, alias))
                ver = m["alias"][alias]
            else:
                nombre, ver = resto.rsplit("/", 1)
                m = _MODELOS.get(nombre)
                if not m:
                    raise MlflowException("RESOURCE_DOES_NOT_EXIST: Registered Model with name=%s not found" % nombre)
            v = next((x for x in m["versiones"] if str(x["version"]) == str(ver)), None)
            if not v:
                raise MlflowException("No existe la versión %s de %s" % (ver, nombre))
            uri = v["fuente"]
        if uri not in _OBJETOS:
            raise MlflowException("No encontré %s en esta sesión (el modelo vive en memoria mientras el notebook está abierto)." % model_uri)
        return _OBJETOS[uri]


pyfunc = _PyFunc("pyfunc")


class MlflowClient:
    def set_registered_model_alias(self, name, alias, version):
        if name not in _MODELOS:
            raise MlflowException("RESOURCE_DOES_NOT_EXIST: Registered Model with name=%s not found" % name)
        if not any(str(v["version"]) == str(version) for v in _MODELOS[name]["versiones"]):
            raise MlflowException("No existe la versión %s de %s" % (version, name))
        _MODELOS[name]["alias"][alias] = int(version)
        print("Alias @%s -> versión %s de %s" % (alias, version, name))

    def delete_registered_model_alias(self, name, alias):
        _MODELOS[name]["alias"].pop(alias, None)

    def get_model_version_by_alias(self, name, alias):
        v = _MODELOS[name]["alias"].get(alias)
        if v is None:
            raise MlflowException("El alias @%s no existe en %s" % (alias, name))
        return ModelVersion(name, next(x for x in _MODELOS[name]["versiones"] if x["version"] == v))

    def search_model_versions(self, filter_string=""):
        nombre = filter_string.split("=")[-1].strip().strip("'\"") if filter_string else None
        return [ModelVersion(n, v) for n, m in _MODELOS.items() if not nombre or n == nombre for v in m["versiones"]]

    def get_run(self, run_id):
        return Run(_RUNS[run_id])


tracking = type("tracking", (), {"MlflowClient": MlflowClient})


def search_runs(experiment_names=None, filter_string="", order_by=None, max_results=1000):
    nombres = experiment_names or [_ESTADO["experimento"]]
    filas = []
    for r in _RUNS.values():
        if r["experimento"] not in nombres:
            continue
        fila = {"run_id": r["id"], "run_name": r["nombre"], "status": r["estado"]}
        fila.update({"params." + k: v for k, v in r["params"].items()})
        fila.update({"metrics." + k: v[-1]["valor"] for k, v in r["metricas"].items()})
        filas.append(fila)
    if order_by:
        campo, *dir_ = order_by[0].split()
        filas.sort(key=lambda f: (f.get(campo) is None, f.get(campo)), reverse=bool(dir_) and dir_[0].upper() == "DESC")
    try:
        import pandas as pd
        return pd.DataFrame(filas[:max_results])
    except ImportError:
        return filas[:max_results]


def _exportar():
    """Para la interfaz de la práctica: todo lo registrado, como JSON."""
    return {"experimentos": list(_EXPERIMENTOS.values()), "runs": list(_RUNS.values()),
            "modelos": {n: {"versiones": m["versiones"], "alias": m["alias"], "creado": m.get("creado")} for n, m in _MODELOS.items()}}
