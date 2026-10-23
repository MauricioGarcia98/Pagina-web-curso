---
titulo: Operadores, plantillas Jinja y contexto
nivel: Intermedio
duracion: 30
resumen: PythonOperator con argumentos, plantillas {{ ds }}, macros, el contexto de ejecución y reintentos.
---

## PythonOperator con argumentos

```python
from datetime import datetime
from airflow import DAG
from airflow.operators.python import PythonOperator

def cargar_pais(pais, minimo=0):
    print(f"Cargando ventas de {pais} con mínimo {minimo}")

with DAG("cargas_por_pais", start_date=datetime(2024, 1, 1), schedule=None) as dag:
    for pais in ["Chile", "Perú", "México"]:                        # tareas generadas dinámicamente
        PythonOperator(
            task_id=f"cargar_{pais.lower().replace('ú', 'u').replace('é', 'e')}",
            python_callable=cargar_pais,
            op_kwargs={"pais": pais, "minimo": 100},
        )

dag.test()
```

## Plantillas (templating)

Muchos parámetros de los operadores aceptan **plantillas Jinja** que se resuelven al ejecutar. Las más usadas:

| Variable | Valor (run del 2024-03-15) |
|---|---|
| `{{ ds }}` | `2024-03-15` |
| `{{ ds_nodash }}` | `20240315` |
| `{{ data_interval_start }}` / `{{ data_interval_end }}` | Inicio y fin del intervalo |
| `{{ macros.ds_add(ds, -7) }}` | `2024-03-08` |
| `{{ params.x }}` | Parámetros del DAG |
| `{{ var.value.mi_variable }}` | Variable de Airflow |

```python
from datetime import datetime
from airflow import DAG
from airflow.operators.bash import BashOperator

with DAG("plantillas", start_date=datetime(2024, 3, 15), schedule="@daily", catchup=False) as dag:
    BashOperator(
        task_id="descargar",
        bash_command="echo descargando ventas del {{ ds }} en /lake/bronze/ventas/{{ ds_nodash }}.json",
    )

dag.test()
```

:::tip Esto hace a tus pipelines idempotentes
Usar `{{ ds }}` en lugar de “hoy” hace que cada ejecución procese **su** periodo. Reprocesar el 15 de marzo dentro de un mes da exactamente el mismo resultado.
:::

## El contexto en funciones Python

Una función de `PythonOperator` puede recibir el **contexto** de ejecución (fechas, la instancia de tarea `ti`, parámetros…):

```python
from datetime import datetime
from airflow import DAG
from airflow.operators.python import PythonOperator

def procesar(ds, **context):
    print("Procesando el día", ds)
    print("Tarea:", context["task"].task_id, "| run:", context["run_id"])

with DAG("contexto", start_date=datetime(2024, 1, 1), schedule=None) as dag:
    PythonOperator(task_id="procesar", python_callable=procesar)

dag.test(logical_date=datetime(2024, 6, 30))
```

## Reintentos y timeouts

```python norun
PythonOperator(
    task_id="llamar_api",
    python_callable=llamar_api,
    retries=3,
    retry_delay=timedelta(minutes=2),
    retry_exponential_backoff=True,
    execution_timeout=timedelta(minutes=30),
)
```

## Ejercicios

:::ejercicio airflow
Crea el DAG `export_diario` (`schedule="@daily"`, `start_date=datetime(2024, 1, 1)`, `catchup=False`) con un `BashOperator` `exportar` cuyo comando use la plantilla para escribir en la ruta `/lake/export/{{ ds_nodash }}.csv`. Por ejemplo: `echo exportando /lake/export/{{ ds_nodash }}.csv`.
```python inicial
from datetime import datetime
from airflow import DAG
from airflow.operators.bash import BashOperator
```
```python solucion
from datetime import datetime
from airflow import DAG
from airflow.operators.bash import BashOperator

with DAG("export_diario", start_date=datetime(2024, 1, 1), schedule="@daily", catchup=False) as dag:
    exportar = BashOperator(task_id="exportar", bash_command="echo exportando /lake/export/{{ ds_nodash }}.csv")
```
```python test
d = dags.get("export_diario")
assert d is not None, "No encontré el DAG 'export_diario'"
cmd = d.get_task("exportar").bash_command
assert "{{ ds_nodash }}" in cmd.replace("{{ds_nodash}}", "{{ ds_nodash }}"), "El comando debe usar la plantilla {{ ds_nodash }}"
from datetime import datetime as _dt
run = d.test(logical_date=_dt(2024, 7, 4))
assert "/lake/export/20240704.csv" in run.xcoms.get(("exportar", "return_value"), ""), "Al ejecutar el 2024-07-04 debería exportar a /lake/export/20240704.csv"
```
:::

:::ejercicio airflow
Crea el DAG `por_region` y genera con un **bucle** una tarea `PythonOperator` por cada región de la lista `regiones`, con `task_id` `procesar_<region>`, que llame a `procesar(region)` usando `op_kwargs`. Todas deben ir **después** de una tarea `EmptyOperator` llamada `inicio`.
```python inicial
from datetime import datetime
from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.operators.empty import EmptyOperator

regiones = ["norte", "centro", "sur"]

def procesar(region):
    print("procesando", region)
```
```python solucion
from datetime import datetime
from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.operators.empty import EmptyOperator

regiones = ["norte", "centro", "sur"]

def procesar(region):
    print("procesando", region)

with DAG("por_region", start_date=datetime(2024, 1, 1), schedule=None) as dag:
    inicio = EmptyOperator(task_id="inicio")
    for r in regiones:
        t = PythonOperator(task_id=f"procesar_{r}", python_callable=procesar, op_kwargs={"region": r})
        inicio >> t
```
```python test
d = dags.get("por_region")
assert d is not None, "No encontré el DAG 'por_region'"
esperadas = {"procesar_norte", "procesar_centro", "procesar_sur"}
assert d.get_task("inicio").downstream_task_ids == esperadas, f"inicio debe ir antes de {esperadas}"
assert d.get_task("procesar_sur").op_kwargs == {"region": "sur"}, "Pasa la región con op_kwargs={'region': r}"
```
:::
