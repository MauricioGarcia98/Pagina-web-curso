---
titulo: Operadores, plantillas Jinja y contexto
nivel: Intermedio
duracion: 45
resumen: PythonOperator con argumentos, plantillas {{ ds }}, macros, el contexto de ejecución y reintentos.
---

Un **operador** es una plantilla de tarea: "ejecuta esta función de Python", "corre este comando bash", "lanza este job de Databricks". Cuando creas un operador con un `task_id` dentro de un DAG, nace una **tarea**. En esta lección aprendes a pasarle argumentos, a usar **plantillas** para que cada ejecución sepa qué día le toca procesar, a leer el **contexto** de ejecución y a configurar **reintentos**.

:::analogia Operador = molde, tarea = galleta
`PythonOperator` es el molde. `PythonOperator(task_id="cargar_chile", ...)` es una galleta concreta hecha con ese molde. Un DAG puede tener muchas tareas hechas con el mismo operador.
:::

## Los operadores más usados

| Operador | Qué hace | Ejemplo |
|---|---|---|
| `PythonOperator` / `@task` | Ejecuta una función de Python | Llamar a una API, validar un archivo |
| `BashOperator` | Ejecuta un comando de terminal | `dbt build`, `python script.py` |
| `EmptyOperator` | No hace nada | Marcar un inicio o un fin, unir ramas |
| `SQLExecuteQueryOperator` | Ejecuta SQL en una base | `DELETE` + `INSERT` de un día |
| `DatabricksRunNowOperator` | Lanza un job de Databricks | Transformación con Spark |
| `TriggerDagRunOperator` | Dispara otro DAG | Encadenar pipelines |

Los de bases de datos y nubes vienen en paquetes aparte llamados **providers** (`apache-airflow-providers-databricks`, `-amazon`, `-google`, `-microsoft-azure`…).

## PythonOperator con argumentos

`python_callable` recibe la **función** (sin paréntesis: `cargar_pais`, no `cargar_pais()`). Los argumentos se pasan con `op_kwargs` (un diccionario de nombre → valor) o `op_args` (una lista, por posición).

```python
from datetime import datetime
from airflow.sdk import DAG
from airflow.providers.standard.operators.python import PythonOperator

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

Qué está pasando:

- El `for` corre **cuando Airflow lee el archivo** y crea tres tareas: `cargar_chile`, `cargar_peru` y `cargar_mexico`. Si mañana agregas `"Colombia"` a la lista, aparece una cuarta tarea sin tocar nada más.
- Cada `task_id` tiene que ser **único** dentro del DAG y usar solo letras, números, `_`, `-` y `.`. Por eso se quitan los acentos.
- Como no hay `>>` entre ellas, las tres son independientes y pueden correr **en paralelo**.

:::cuidado Error clásico: llamar a la función
`python_callable=cargar_pais("Chile")` **ejecuta la función al leer el archivo** y le pasa a Airflow su resultado (`None`). La tarea falla con "python_callable param must be callable". Pasa la función sin paréntesis y los argumentos en `op_kwargs`.
:::

## Plantillas (templating)

Un pipeline diario tiene que saber **qué día está procesando**. No es "hoy": si el DAG del 15 de marzo falla y lo relanzas el 20, tiene que seguir procesando el 15. Para eso Airflow ofrece **plantillas Jinja**: textos con `{{ ... }}` que se reemplazan por valores reales **justo antes de ejecutar** la tarea.

Las variables más usadas, para una ejecución cuya fecha lógica es el 15 de marzo de 2024:

| Plantilla | Valor | Uso típico |
|---|---|---|
| `{{ ds }}` | `2024-03-15` | Filtros SQL: `WHERE fecha = '{{ ds }}'` |
| `{{ ds_nodash }}` | `20240315` | Nombres de archivo: `ventas_20240315.csv` |
| `{{ data_interval_start }}` / `{{ data_interval_end }}` | Inicio y fin del intervalo (fecha y hora) | Cargas por hora |
| `{{ macros.ds_add(ds, -7) }}` | `2024-03-08` | "Los últimos 7 días" |
| `{{ params.x }}` | Un parámetro del DAG | Configuración por DAG |
| `{{ var.value.mi_variable }}` | Una Variable de Airflow | Bucket o entorno |
| `{{ dag_run.conf }}` | Lo que pasaste con `--conf` al disparar | Ejecuciones manuales con parámetros |

```python
from datetime import datetime
from airflow.sdk import DAG
from airflow.providers.standard.operators.bash import BashOperator

with DAG("plantillas", start_date=datetime(2024, 3, 15), schedule="@daily", catchup=False) as dag:
    BashOperator(
        task_id="descargar",
        bash_command="echo descargando ventas del {{ ds }} en /lake/bronze/ventas/{{ ds_nodash }}.json",
    )

dag.test()
```

En la salida vas a ver el comando **ya resuelto**, con la fecha real en lugar de `{{ ds }}`.

### ¿Qué parámetros aceptan plantillas?

No todos. Cada operador declara una lista llamada `template_fields`:

- `BashOperator`: `bash_command` y `env`.
- `PythonOperator`: `op_kwargs`, `op_args` y `templates_dict`.
- Operadores SQL: `sql`.

Si pones `{{ ds }}` en un parámetro que no está en esa lista, llega tal cual, como el texto literal `"{{ ds }}"`.

:::tip Esto hace a tus pipelines idempotentes
Usar `{{ ds }}` en lugar de "hoy" hace que cada ejecución procese **su** periodo. Reprocesar el 15 de marzo dentro de un mes da exactamente el mismo resultado.
:::

:::cuidado Las plantillas son texto
`{{ ds }}` siempre llega como **string** (`"2024-03-15"`), no como fecha. Si necesitas operar con ella en Python, conviértela: `date.fromisoformat(ds)`.
:::

## El contexto en funciones Python

Además de plantillas, una función de `PythonOperator` puede recibir el **contexto** de ejecución. Es un diccionario con todo lo que Airflow sabe de esa ejecución: las fechas, la tarea, el DAG run y la instancia de tarea `ti` (que se usa para XCom).

Airflow mira **los nombres de los parámetros** de tu función y le pasa los que coinciden. Si pones `**context`, recibe todo el resto.

```python
from datetime import datetime
from airflow.sdk import DAG
from airflow.providers.standard.operators.python import PythonOperator

def procesar(ds, **context):
    print("Procesando el día", ds)
    print("Tarea:", context["task"].task_id, "| run:", context["run_id"])

with DAG("contexto", start_date=datetime(2024, 1, 1), schedule=None) as dag:
    PythonOperator(task_id="procesar", python_callable=procesar)

dag.test(logical_date=datetime(2024, 6, 30))
```

Claves del contexto que vas a usar seguido:

| Clave | Qué es |
|---|---|
| `ds`, `ds_nodash` | La fecha lógica como texto |
| `logical_date` | La fecha lógica como `datetime` |
| `ti` | La instancia de tarea: `ti.xcom_push(...)`, `ti.xcom_pull(...)`, `ti.try_number` |
| `task`, `dag` | Los objetos de la tarea y del DAG |
| `run_id` | Identificador de la ejecución (`manual__...` o `scheduled__...`) |
| `params` | Los parámetros del DAG |
| `dag_run` | El DAG run; `dag_run.conf` trae lo enviado con `--conf` |

## Reintentos y timeouts

Una API que no responde o una red que se cae un segundo son cosas normales. En vez de fallar a la primera, configura **reintentos**:

```python norun
PythonOperator(
    task_id="llamar_api",
    python_callable=llamar_api,
    retries=3,                               # hasta 3 intentos extra (4 en total)
    retry_delay=timedelta(minutes=2),        # espera entre intentos
    retry_exponential_backoff=True,          # 2 min, 4 min, 8 min…
    execution_timeout=timedelta(minutes=30), # si tarda más, se corta y cuenta como fallo
)
```

- Mientras espera el siguiente intento, la tarea queda en estado `up_for_retry` (amarillo).
- Solo después de agotar todos los intentos queda en `failed`.
- **Los reintentos solo son seguros si la tarea es idempotente.** Si la tarea inserta filas sin borrar las anteriores, cada reintento las duplica.

Para no repetir lo mismo en cada tarea, se pone en `default_args` del DAG y todas lo heredan:

```python norun
default_args = {"retries": 2, "retry_delay": timedelta(minutes=5)}
with DAG("etl", default_args=default_args, ...) as dag:
    ...   # todas las tareas tienen 2 reintentos, salvo que una lo cambie
```

## Ejercicios

:::ejercicio airflow
Crea el DAG `export_diario` (`schedule="@daily"`, `start_date=datetime(2024, 1, 1)`, `catchup=False`) con un `BashOperator` `exportar` cuyo comando use la plantilla para escribir en la ruta `/lake/export/{{ ds_nodash }}.csv`. Por ejemplo: `echo exportando /lake/export/{{ ds_nodash }}.csv`.
```python inicial
from datetime import datetime
from airflow.sdk import DAG
from airflow.providers.standard.operators.bash import BashOperator
```
```python solucion
from datetime import datetime
from airflow.sdk import DAG
from airflow.providers.standard.operators.bash import BashOperator

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
from airflow.sdk import DAG
from airflow.providers.standard.operators.python import PythonOperator
from airflow.providers.standard.operators.empty import EmptyOperator

regiones = ["norte", "centro", "sur"]

def procesar(region):
    print("procesando", region)
```
```python solucion
from datetime import datetime
from airflow.sdk import DAG
from airflow.providers.standard.operators.python import PythonOperator
from airflow.providers.standard.operators.empty import EmptyOperator

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
