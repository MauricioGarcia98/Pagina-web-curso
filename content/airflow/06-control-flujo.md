---
titulo: Ramas, trigger rules, sensores y TaskGroups
nivel: Avanzado
duracion: 35
resumen: Decidir caminos, controlar cuándo corre una tarea según sus padres, esperar eventos y organizar DAGs grandes.
---

## Ramas con BranchPythonOperator / @task.branch

Una tarea de rama **devuelve el `task_id`** (o una lista) del camino a seguir. Las demás tareas inmediatamente posteriores se marcan como **skipped**.

```python
from datetime import datetime
from airflow import DAG
from airflow.operators.python import BranchPythonOperator
from airflow.operators.empty import EmptyOperator

def elegir(ds):
    from datetime import date
    return "carga_completa" if date.fromisoformat(ds).day == 1 else "carga_incremental"

with DAG("ramas", start_date=datetime(2024, 1, 1), schedule="@daily", catchup=False) as dag:
    decidir = BranchPythonOperator(task_id="decidir", python_callable=elegir)
    completa = EmptyOperator(task_id="carga_completa")
    incremental = EmptyOperator(task_id="carga_incremental")
    fin = EmptyOperator(task_id="fin", trigger_rule="none_failed_min_one_success")
    decidir >> [completa, incremental] >> fin

dag.test(logical_date=datetime(2024, 3, 1))
```

## Trigger rules

Por defecto una tarea corre si **todos** sus padres terminaron bien (`all_success`). Puedes cambiarlo:

| Trigger rule | Corre si… | Uso típico |
|---|---|---|
| `all_success` (defecto) | todos los padres OK | Lo normal |
| `all_done` | todos terminaron (bien, mal o skipped) | Limpieza, cerrar recursos |
| `one_failed` | al menos uno falló | Alertas |
| `one_success` | al menos uno OK | |
| `none_failed` | ninguno falló (pueden ser skipped) | |
| `none_failed_min_one_success` | ninguno falló y al menos uno OK | **Unir ramas** |
| `all_failed` | todos fallaron | |

:::cuidado La trampa de las ramas
Después de una rama, la tarea que une los caminos tiene un padre *skipped*. Con `all_success` se marcaría skipped también. Usa `none_failed_min_one_success`.
:::

## Sensores: esperar a que algo pase

Un **sensor** es una tarea que espera una condición: que llegue un archivo, que termine otro DAG, que una tabla tenga datos del día…

```python norun
from airflow.sensors.filesystem import FileSensor
from airflow.providers.microsoft.azure.sensors.wasb import WasbBlobSensor

esperar = FileSensor(task_id="esperar_archivo", filepath="/datos/ventas_{{ ds_nodash }}.csv",
                     poke_interval=300, timeout=6 * 3600, mode="reschedule")
```

`mode="reschedule"` libera el worker entre chequeos (en vez de ocuparlo esperando). Alternativas modernas: **deferrable operators** y **datasets**.

## TaskGroups: ordenar DAGs grandes

```python
from datetime import datetime
from airflow import DAG
from airflow.operators.empty import EmptyOperator
from airflow.utils.task_group import TaskGroup

with DAG("con_grupos", start_date=datetime(2024, 1, 1), schedule=None) as dag:
    inicio = EmptyOperator(task_id="inicio")
    with TaskGroup("bronze") as bronze:
        a = EmptyOperator(task_id="ventas")
        b = EmptyOperator(task_id="clientes")
    with TaskGroup("silver") as silver:
        c = EmptyOperator(task_id="ventas")
    inicio >> bronze >> silver

print(dag.task_ids)          # los task_id llevan el prefijo del grupo: bronze.ventas, ...
dag.tree()
```

## Ejercicios

:::ejercicio airflow
Crea el DAG `calidad` con: `validar` (un `BranchPythonOperator` cuya función devuelve `"publicar"` si `filas_invalidas` es 0, o `"alertar"` si no), dos `EmptyOperator` `publicar` y `alertar`, y una tarea `fin` que **una ambas ramas** con la trigger rule correcta. Usa la variable `filas_invalidas = 5`.
```python inicial
from datetime import datetime
from airflow import DAG
from airflow.operators.python import BranchPythonOperator
from airflow.operators.empty import EmptyOperator

filas_invalidas = 5
```
```python solucion
from datetime import datetime
from airflow import DAG
from airflow.operators.python import BranchPythonOperator
from airflow.operators.empty import EmptyOperator

filas_invalidas = 5

def decidir():
    return "publicar" if filas_invalidas == 0 else "alertar"

with DAG("calidad", start_date=datetime(2024, 1, 1), schedule=None) as dag:
    validar = BranchPythonOperator(task_id="validar", python_callable=decidir)
    publicar = EmptyOperator(task_id="publicar")
    alertar = EmptyOperator(task_id="alertar")
    fin = EmptyOperator(task_id="fin", trigger_rule="none_failed_min_one_success")
    validar >> [publicar, alertar] >> fin
```
```python test
d = dags.get("calidad")
assert d is not None, "No encontré el DAG 'calidad'"
assert d.get_task("validar").downstream_task_ids == {"publicar", "alertar"}
assert d.get_task("fin").upstream_task_ids == {"publicar", "alertar"}
run = d.test()
assert run.states["alertar"] == "success" and run.states["publicar"] == "skipped", "Con 5 filas inválidas debe ir por 'alertar'"
assert run.states["fin"] == "success", "La tarea 'fin' debe ejecutarse aunque una rama esté skipped (revisa su trigger_rule)"
```
:::

:::ejercicio airflow
Crea el DAG `limpieza` con: `procesar` (un `PythonOperator` que **falla** lanzando `RuntimeError("boom")`) y `cerrar_conexiones` (un `EmptyOperator` que debe ejecutarse **siempre**, haya fallado o no `procesar`).
```python inicial
from datetime import datetime
from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.operators.empty import EmptyOperator

def falla():
    raise RuntimeError("boom")
```
```python solucion
from datetime import datetime
from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.operators.empty import EmptyOperator

def falla():
    raise RuntimeError("boom")

with DAG("limpieza", start_date=datetime(2024, 1, 1), schedule=None) as dag:
    procesar = PythonOperator(task_id="procesar", python_callable=falla)
    cerrar = EmptyOperator(task_id="cerrar_conexiones", trigger_rule="all_done")
    procesar >> cerrar
```
```python test
d = dags.get("limpieza")
assert d is not None, "No encontré el DAG 'limpieza'"
run = d.test()
assert run.states["procesar"] == "failed", "procesar debería fallar"
assert run.states["cerrar_conexiones"] == "success", "cerrar_conexiones debe correr aunque procesar falle (trigger_rule='all_done')"
```
:::

:::ejercicio airflow
Crea el DAG `medallon` con dos `TaskGroup`: `bronze` (tareas `ingestar_ventas` e `ingestar_clientes`, en paralelo) y `gold` (tarea `ventas_diarias`). Todo `bronze` debe ir antes que `gold`.
```python inicial
from datetime import datetime
from airflow import DAG
from airflow.operators.empty import EmptyOperator
from airflow.utils.task_group import TaskGroup
```
```python solucion
from datetime import datetime
from airflow import DAG
from airflow.operators.empty import EmptyOperator
from airflow.utils.task_group import TaskGroup

with DAG("medallon", start_date=datetime(2024, 1, 1), schedule=None) as dag:
    with TaskGroup("bronze") as bronze:
        EmptyOperator(task_id="ingestar_ventas")
        EmptyOperator(task_id="ingestar_clientes")
    with TaskGroup("gold") as gold:
        EmptyOperator(task_id="ventas_diarias")
    bronze >> gold
```
```python test
d = dags.get("medallon")
assert d is not None, "No encontré el DAG 'medallon'"
assert set(d.task_ids) == {"bronze.ingestar_ventas", "bronze.ingestar_clientes", "gold.ventas_diarias"}, f"Tareas: {d.task_ids}"
assert d.get_task("gold.ventas_diarias").upstream_task_ids == {"bronze.ingestar_ventas", "bronze.ingestar_clientes"}, "gold debe depender de todo bronze"
```
:::
