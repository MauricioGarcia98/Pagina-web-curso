---
titulo: XCom y la TaskFlow API
nivel: Avanzado
duracion: 35
resumen: Pasar datos pequeños entre tareas, @dag y @task, dependencias implícitas y multiple_outputs.
---

## XCom: mensajes entre tareas

Las tareas pueden correr en máquinas distintas, así que no comparten variables. Para pasar **datos pequeños** (un nombre de archivo, un conteo, una fecha) se usa **XCom** (*cross-communication*), que los guarda en la base de metadatos.

```python
from datetime import datetime
from airflow import DAG
from airflow.operators.python import PythonOperator

def extraer(ti):
    ti.xcom_push(key="ruta", value="/lake/bronze/ventas/2024-03-15.json")
    return 1500                                      # lo que se devuelve va al XCom "return_value"

def transformar(ti):
    filas = ti.xcom_pull(task_ids="extraer")         # return_value
    ruta = ti.xcom_pull(task_ids="extraer", key="ruta")
    print(f"Transformando {filas} filas de {ruta}")

with DAG("xcom_clasico", start_date=datetime(2024, 1, 1), schedule=None) as dag:
    PythonOperator(task_id="extraer", python_callable=extraer) >> PythonOperator(task_id="transformar", python_callable=transformar)

dag.test()
```

:::cuidado XCom no es para datos grandes
XCom se guarda en la base de metadatos: úsalo para **metadatos** (rutas, conteos, IDs). Los datos en sí (millones de filas) van al data lake o a una tabla; por XCom pasas **dónde** están.
:::

## TaskFlow API: Airflow “pythónico”

Desde Airflow 2, los decoradores `@dag` y `@task` convierten funciones comunes en DAGs y tareas. Lo que una tarea **devuelve** pasa automáticamente por XCom a la siguiente, y las **dependencias se infieren** de cómo pasas los valores:

```python
from datetime import datetime
from airflow.decorators import dag, task

@dag(schedule="@daily", start_date=datetime(2024, 1, 1), catchup=False, tags=["taskflow"])
def etl_taskflow():

    @task
    def extraer():
        return [{"producto": "Mouse", "monto": 25.0}, {"producto": "Teclado", "monto": 49.9}]

    @task
    def transformar(filas):
        return round(sum(f["monto"] for f in filas), 2)

    @task
    def cargar(total):
        print(f"Total cargado: {total}")

    cargar(transformar(extraer()))      # extraer >> transformar >> cargar, automáticamente

dag_etl = etl_taskflow()                # ¡hay que llamar a la función para crear el DAG!
dag_etl.test()
```

### multiple_outputs

```python
from datetime import datetime
from airflow.decorators import dag, task

@dag(schedule=None, start_date=datetime(2024, 1, 1))
def resumen():
    @task(multiple_outputs=True)
    def calcular():
        return {"filas": 1200, "errores": 3}

    @task
    def reportar(filas, errores):
        print(f"{filas} filas, {errores} errores")

    r = calcular()
    reportar(r["filas"], r["errores"])

resumen().test()
```

## Ejercicios

:::ejercicio airflow
Con la **TaskFlow API**, crea el DAG `pipeline_numeros` (la función decorada debe llamarse `pipeline_numeros`) con tres tareas: `generar` (devuelve `[1, 2, 3, 4]`), `duplicar` (recibe la lista y devuelve cada número × 2) y `sumar` (recibe la lista y devuelve la suma). Encadénalas pasando los valores y crea el DAG llamando a la función.
```python inicial
from datetime import datetime
from airflow.decorators import dag, task

@dag(schedule=None, start_date=datetime(2024, 1, 1))
def pipeline_numeros():
    ...

pipeline_numeros()
```
```python solucion
from datetime import datetime
from airflow.decorators import dag, task

@dag(schedule=None, start_date=datetime(2024, 1, 1))
def pipeline_numeros():
    @task
    def generar():
        return [1, 2, 3, 4]

    @task
    def duplicar(numeros):
        return [n * 2 for n in numeros]

    @task
    def sumar(numeros):
        return sum(numeros)

    sumar(duplicar(generar()))

pipeline_numeros()
```
```python test
d = dags.get("pipeline_numeros")
assert d is not None, "No encontré el DAG 'pipeline_numeros' (¿llamaste a la función al final?)"
assert d.get_task("generar").downstream_task_ids == {"duplicar"}, "generar debe ir antes que duplicar"
assert d.get_task("duplicar").downstream_task_ids == {"sumar"}, "duplicar debe ir antes que sumar"
run = d.test()
assert run.xcoms.get(("sumar", "return_value")) == 20, "sumar debería devolver 20"
```
:::

:::ejercicio airflow
Con operadores clásicos y XCom: crea el DAG `conteo` con `contar` (un `PythonOperator` que **devuelve** `42`) y `validar` (un `PythonOperator` que hace `xcom_pull` del valor de `contar` y lanza `ValueError` si es menor a 10; si no, devuelve `"ok"`).
```python inicial
from datetime import datetime
from airflow import DAG
from airflow.operators.python import PythonOperator
```
```python solucion
from datetime import datetime
from airflow import DAG
from airflow.operators.python import PythonOperator

def contar():
    return 42

def validar(ti):
    n = ti.xcom_pull(task_ids="contar")
    if n < 10:
        raise ValueError("Muy pocas filas")
    return "ok"

with DAG("conteo", start_date=datetime(2024, 1, 1), schedule=None) as dag:
    PythonOperator(task_id="contar", python_callable=contar) >> PythonOperator(task_id="validar", python_callable=validar)
```
```python test
d = dags.get("conteo")
assert d is not None, "No encontré el DAG 'conteo'"
assert d.get_task("contar").downstream_task_ids == {"validar"}, "contar debe ir antes que validar"
run = d.test()
assert run.xcoms.get(("validar", "return_value")) == "ok", "validar debería devolver 'ok' cuando contar devuelve 42"
```
:::
