---
titulo: Tu primer DAG
nivel: Básico
duracion: 30
resumen: with DAG(...), operadores, task_id, dependencias con >> y << y cómo probarlo.
---

```python
from datetime import datetime
from airflow import DAG
from airflow.operators.bash import BashOperator
from airflow.operators.python import PythonOperator

def transformar():
    print("Limpiando y transformando datos...")

with DAG(
    dag_id="etl_ventas",
    start_date=datetime(2024, 1, 1),
    schedule="@daily",
    catchup=False,
    tags=["ventas"],
) as dag:

    extraer = BashOperator(task_id="extraer", bash_command="echo descargando ventas")
    limpiar = PythonOperator(task_id="transformar", python_callable=transformar)
    cargar = BashOperator(task_id="cargar", bash_command="echo cargando en el lakehouse")

    extraer >> limpiar >> cargar          # dependencias

dag.test()                                 # ejecuta el DAG completo una vez (como `airflow dags test`)
```

## Las piezas

- `with DAG(...) as dag:` todo lo que crees adentro pertenece a ese DAG.
- `dag_id`: nombre único del DAG.
- `start_date`: desde cuándo es válido el DAG. `schedule`: cada cuánto corre (lo vemos en la próxima lección).
- **Operadores**: plantillas de tareas. Al instanciarlos con un `task_id` único se convierten en **tareas**.

| Operador | Qué hace |
|---|---|
| `BashOperator` | Ejecuta un comando de terminal |
| `PythonOperator` | Ejecuta una función de Python |
| `EmptyOperator` | No hace nada (útil para agrupar o marcar inicio/fin) |
| `TriggerDagRunOperator` | Dispara otro DAG |
| Operadores de proveedores | Databricks, Azure, SQL, Spark, dbt… (miles) |

## Dependencias

```python norun
a >> b            # a antes que b      (equivale a b << a)
a >> [b, c]       # b y c después de a (en paralelo)
[b, c] >> d       # d después de b y c
a >> b >> c       # en cadena

from airflow.models.baseoperator import chain
chain(a, [b, c], d)
```

:::cuidado task_id únicos
Dentro de un DAG, cada `task_id` debe ser único. Y el nombre de la **variable** Python (`limpiar`) no importa para Airflow: lo que vale es el `task_id` (`"transformar"`).
:::

## Ejercicios

:::ejercicio airflow
Crea un DAG con `dag_id="hola_airflow"`, `start_date=datetime(2024, 1, 1)`, `schedule=None` y dos tareas `BashOperator`: `saludar` (`echo hola`) y `despedir` (`echo chau`), donde `saludar` va **antes** que `despedir`.
```python inicial
from datetime import datetime
from airflow import DAG
from airflow.operators.bash import BashOperator

# with DAG(...) as dag:
```
```python solucion
from datetime import datetime
from airflow import DAG
from airflow.operators.bash import BashOperator

with DAG(dag_id="hola_airflow", start_date=datetime(2024, 1, 1), schedule=None) as dag:
    saludar = BashOperator(task_id="saludar", bash_command="echo hola")
    despedir = BashOperator(task_id="despedir", bash_command="echo chau")
    saludar >> despedir
```
```python test
assert "hola_airflow" in dags, "No encontré un DAG con dag_id='hola_airflow'"
d = dags["hola_airflow"]
assert set(d.task_ids) == {"saludar", "despedir"}, f"Las tareas deben ser saludar y despedir; hay {d.task_ids}"
assert d.get_task("saludar").downstream_task_ids == {"despedir"}, "saludar debe ir antes que despedir (saludar >> despedir)"
assert d.schedule is None, "schedule debe ser None"
```
:::

:::ejercicio airflow
Crea el DAG `etl_paralelo` con 4 tareas `EmptyOperator`: `inicio`, `extraer_ventas`, `extraer_clientes` y `unir`. Las dos extracciones van **en paralelo** después de `inicio`, y `unir` espera a **ambas**.
```python inicial
from datetime import datetime
from airflow import DAG
from airflow.operators.empty import EmptyOperator
```
```python solucion
from datetime import datetime
from airflow import DAG
from airflow.operators.empty import EmptyOperator

with DAG("etl_paralelo", start_date=datetime(2024, 1, 1), schedule=None) as dag:
    inicio = EmptyOperator(task_id="inicio")
    ventas = EmptyOperator(task_id="extraer_ventas")
    clientes = EmptyOperator(task_id="extraer_clientes")
    unir = EmptyOperator(task_id="unir")
    inicio >> [ventas, clientes] >> unir
```
```python test
d = dags.get("etl_paralelo")
assert d is not None, "No encontré el DAG 'etl_paralelo'"
assert d.get_task("inicio").downstream_task_ids == {"extraer_ventas", "extraer_clientes"}, "inicio debe ir antes de ambas extracciones"
assert d.get_task("unir").upstream_task_ids == {"extraer_ventas", "extraer_clientes"}, "unir debe esperar a ambas extracciones"
assert len(d.tasks) == 4, "Debe haber exactamente 4 tareas"
```
:::

:::ejercicio airflow
Crea el DAG `reporte` con un `PythonOperator` llamado `calcular` que ejecute la función `calcular_total()` (que **devuelve** `sum([10, 20, 30])`). Ejecuta el DAG con `dag.test()`. El corrector revisará que la tarea devolvió `60`.
```python inicial
from datetime import datetime
from airflow import DAG
from airflow.operators.python import PythonOperator

def calcular_total():
    return sum([10, 20, 30])
```
```python solucion
from datetime import datetime
from airflow import DAG
from airflow.operators.python import PythonOperator

def calcular_total():
    return sum([10, 20, 30])

with DAG("reporte", start_date=datetime(2024, 1, 1), schedule=None) as dag:
    calcular = PythonOperator(task_id="calcular", python_callable=calcular_total)

dag.test()
```
```python test
d = dags.get("reporte")
assert d is not None, "No encontré el DAG 'reporte'"
run = d.test()
assert run.state == "success", "El DAG debería terminar bien"
assert run.xcoms.get(("calcular", "return_value")) == 60, "La tarea 'calcular' debería devolver 60"
```
:::
