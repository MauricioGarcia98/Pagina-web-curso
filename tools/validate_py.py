"""Ejecuta las soluciones de ejercicios Python/PySpark/Airflow/dbt con el mismo arnés del navegador."""
import json
import os
import sys
import time

tmp, pyroot = sys.argv[1], sys.argv[2]
# los simuladores viven en assets/py/<paquete>/<modulo>; el navegador los pone todos bajo /mini
for d in os.listdir(pyroot):
    sys.path.insert(0, os.path.join(pyroot, d))
ns = {}
src = open(os.path.join(tmp, "harness.py"), encoding="utf8").read()
exec(compile(src, "harness", "exec"), ns)
ns["_TABLES_JSON"] = open(os.path.join(tmp, "tables.json"), encoding="utf8").read()
jobs = json.load(open(os.path.join(tmp, "jobs.json"), encoding="utf8"))
res = {}
real_stdout = sys.stdout
for ex in jobs:
    t = time.time()
    try:
        if ex["type"] == "dbt":
            sql = ns["_dbt_render"](ex["solucion"], ex.get("setup") or "", bool(ex.get("incremental")), "{}")
            res[ex["id"]] = {"ok": True, "sql": sql}
            continue
        var = ex.get("variable") or ("" if ex.get("test") else ("resultado" if ex["type"] == "pyspark" else ""))
        if not var and not ex.get("test"):
            r = {"ok": False, "error": "ejercicio sin test ni variable a comparar"}
        else:
            r = ns["_grade"](ex["type"], ex["solucion"], ex["solucion"], ex.get("test") or "", var, bool(ex.get("ordenado")))
        r["pass"] = r.pop("pass_", None)
        r["t"] = round(time.time() - t, 2)
        res[ex["id"]] = r
    except Exception as e:  # noqa: BLE001
        res[ex["id"]] = {"ok": False, "error": repr(e)}
    finally:
        sys.stdout = real_stdout
print(json.dumps(res, default=str))
