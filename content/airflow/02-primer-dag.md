---
titulo: Tu primer DAG
nivel: Básico
duracion: 45
resumen: Desde cero - el Python mínimo que necesitas, un DAG completo explicado línea por línea (sintaxis de Airflow 3), cómo lee Airflow tu archivo, operadores, task_id, dependencias con >> y cómo probarlo con dags test.
objetivos: Leer y escribir un DAG con with DAG(...) | Crear tareas con BashOperator, PythonOperator y EmptyOperator | Definir dependencias en cadena y en paralelo | Explicar por qué el código fuera de las tareas se ejecuta en cada lectura | Probar un DAG con airflow dags test
autoevaluacion: ¿Sabes qué hace cada línea de un DAG mínimo? | ¿Sabes la diferencia entre la variable Python y el task_id? | ¿Sabes qué código no debe ir fuera de las tareas?
---

:::escenario
Todas las noches alguien del equipo entra a las 2:00 a correr tres scripts a mano: descargar ventas, limpiarlas y cargarlas. Si se olvida, el tablero de la mañana está vacío. Vamos a convertir esos tres pasos en un DAG de Airflow: un archivo de Python que describe **qué** pasos hay y **en qué orden**, para que Airflow los ejecute solo.
:::

## Antes de empezar: el Python mínimo para leer un DAG

Un DAG se escribe en Python, pero no necesitas saber mucho. Estas son las cinco piezas que aparecen:

| Pieza | Ejemplo | Qué significa |
|---|---|---|
| **import** | `from datetime import datetime` | "Trae la herramienta `datetime` del paquete `datetime`." Python no carga nada que no pidas. |
| **función** | `def transformar(): ...` | Un bloque de código con nombre que se ejecuta **cuando alguien lo llama**, no cuando se escribe. |
| **objeto** | `BashOperator(task_id="extraer", ...)` | Crear "una cosa" de un tipo (aquí, una tarea) con sus datos entre paréntesis: `nombre=valor`. |
| **variable** | `extraer = BashOperator(...)` | Un nombre para referirte a ese objeto después. |
| **bloque with** | `with DAG(...) as dag:` | "Todo lo que esté **indentado** (con sangría) debajo pertenece a este DAG." |

En Python la **sangría** (los espacios al comienzo de la línea) no es decoración: indica qué está dentro de qué. Si una tarea queda sin sangría, queda **fuera** del DAG.

## El DAG completo

```python
from datetime import datetime
from airflow.sdk import DAG
from airflow.providers.standard.operators.bash import BashOperator
from airflow.providers.standard.operators.python import PythonOperator

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

Presiona ▶ para ejecutarlo. Ahora, línea por línea:

1. `from datetime import datetime`: trae `datetime`, que sirve para escribir fechas como `datetime(2024, 1, 1)`.
2. `from airflow.sdk import DAG`: trae la clase `DAG`. En Airflow 3, todo lo que usas para **escribir** DAGs se importa de `airflow.sdk`.
3. y 4. Traen dos **operadores** del *provider* estándar (el paquete `apache-airflow-providers-standard`, que viene con Airflow): uno para comandos de terminal y otro para funciones de Python.
5. `def transformar():` define la función que hará el trabajo de limpieza. Todavía **no se ejecuta**: solo se define.
6. `with DAG(...) as dag:` crea el DAG con sus datos:
   - `dag_id="etl_ventas"`: el nombre único con el que lo verás en la interfaz.
   - `start_date=datetime(2024, 1, 1)`: desde qué fecha el DAG es válido.
   - `schedule="@daily"`: corre una vez por día, a medianoche (la próxima lección explica los horarios en detalle).
   - `catchup=False`: no recupera días pasados al activarlo (es el valor por defecto en Airflow 3; se escribe igual para que quede claro).
   - `tags=["ventas"]`: etiquetas para filtrar en la interfaz.
7. Las tres líneas siguientes crean las **tareas**. Cada una es un operador con un `task_id` único. `python_callable=transformar` le pasa la función **sin paréntesis**: le dices "esta es la función que tienes que llamar", no la llamas tú.
8. `extraer >> limpiar >> cargar`: el operador `>>` significa "antes que". Primero extraer, después limpiar, después cargar.
9. `dag.test()`: está **fuera** del `with` (sin sangría). Ejecuta el DAG completo una vez, en orden, sin necesidad de un scheduler. Es lo que usarás para probar.

:::nota Si ves la sintaxis de Airflow 2
En proyectos y tutoriales anteriores a 2025 vas a ver `from airflow import DAG` y `from airflow.operators.bash import BashOperator`. Hacen lo mismo: son las rutas de Airflow 2, que en Airflow 3 todavía funcionan con un aviso de obsoleto. El simulador del curso acepta las dos.
:::

## Cómo lee Airflow tu archivo

Esto confunde a todos al principio: el archivo del DAG **no se ejecuta como un script** de principio a fin para procesar datos. Lo que pasa es:

1. El **Dag processor** lee (*parsea*) los archivos `.py` de la carpeta de DAGs cada cierto tiempo (por defecto, cada 30 segundos se revisa si hay cambios).
2. Al leerlo, Python ejecuta el código "de nivel superior": crea el objeto `DAG` y las tareas, y anota las dependencias. **No** ejecuta las funciones de las tareas.
3. Cuando llega la hora (según el `schedule`), el **scheduler** crea un **DAG run** y va enviando cada tarea a un *worker*, que recién ahí ejecuta `transformar()` o el comando de Bash.

Consecuencia práctica, y la primera regla de la página de buenas prácticas de la documentación oficial: el código que está **fuera** de las funciones de las tareas (el *top-level code*) se ejecuta cada vez que se parsea el archivo, ¡miles de veces por día! Nunca pongas ahí consultas a bases de datos, llamadas a APIs o lecturas de archivos grandes: van **dentro** de las tareas.

```python norun
# MAL: se ejecuta en cada lectura del archivo, aunque el DAG no corra
clientes = requests.get("https://api.tienda.com/clientes").json()

# BIEN: se ejecuta solo cuando corre la tarea
def descargar_clientes():
    import requests
    return requests.get("https://api.tienda.com/clientes").json()
```

## Las piezas

- `with DAG(...) as dag:` todo lo que crees adentro pertenece a ese DAG.
- `dag_id`: nombre único del DAG en toda la instalación de Airflow.
- `start_date`: desde cuándo es válido el DAG. `schedule`: cada cuánto corre.
- **Operadores**: plantillas de tareas. Al instanciarlos con un `task_id` único se convierten en **tareas**.

| Operador | Qué hace | De dónde se importa (Airflow 3) |
|---|---|---|
| `BashOperator` | Ejecuta un comando de terminal | `airflow.providers.standard.operators.bash` |
| `PythonOperator` | Ejecuta una función de Python | `airflow.providers.standard.operators.python` |
| `EmptyOperator` | No hace nada (útil para agrupar o marcar inicio/fin) | `airflow.providers.standard.operators.empty` |
| `TriggerDagRunOperator` | Dispara otro DAG | `airflow.providers.standard.operators.trigger_dagrun` |
| Operadores de otros *providers* | Databricks, Azure, AWS, Google, SQL, dbt… (cientos) | `airflow.providers.<proveedor>...` |

Un **provider** es un paquete aparte que agrega operadores para un sistema: `pip install apache-airflow-providers-databricks` agrega los de Databricks.

## Dependencias

```python norun
a >> b            # a antes que b      (equivale a b << a)
a >> [b, c]       # b y c después de a (en paralelo)
[b, c] >> d       # d después de b y c
a >> b >> c       # en cadena

from airflow.sdk import chain
chain(a, [b, c], d)
```

Dos palabras que verás en todos lados: las tareas que van **antes** de una tarea son sus *upstream*; las que van **después**, sus *downstream*. En `a >> b`, `a` es upstream de `b`.

:::cuidado task_id únicos
Dentro de un DAG, cada `task_id` debe ser único. Y el nombre de la **variable** Python (`limpiar`) no importa para Airflow: lo que vale es el `task_id` (`"transformar"`). En la interfaz y en los logs solo verás el `task_id`.
:::

## Pruébalo en la terminal

La terminal tiene un DAG de ejemplo en `~/dags/etl_ventas.py`, y el comando `airflow` usa el mismo simulador que los ejercicios:

```bash
cat dags/etl_ventas.py
airflow dags list
airflow tasks list etl_ventas
airflow dags test etl_ventas 2024-12-31
```

`airflow dags test` ejecuta el DAG completo **una vez**, en orden, sin el scheduler: es la forma de probar un DAG en tu computadora antes de subirlo. Puedes editar el archivo con `code dags/etl_ventas.py` y volver a probarlo.

:::errores
- **Tareas sin sangría**: quedan fuera del `with DAG` y Airflow dice que la tarea no tiene DAG.
- **`python_callable=transformar()`** (con paréntesis): ejecuta la función al leer el archivo y le pasa el resultado al operador. Va sin paréntesis.
- **Dos tareas con el mismo `task_id`**: error al cargar el DAG.
- **Código pesado al nivel superior**: el Dag processor se pone lento y los DAGs tardan en aparecer o desaparecen por *timeout*.
- **Un `dag_id` repetido en dos archivos**: Airflow solo carga uno y no sabes cuál.
:::

:::trabajo
- Los DAGs viven en un repositorio Git; cada cambio pasa por un *pull request* y un CI que, como mínimo, importa todos los archivos para detectar errores (la documentación oficial recomienda un test que cargue los DAGs y falle si hay *import errors*).
- La convención de los equipos: un DAG por archivo, el `dag_id` igual al nombre del archivo, `owner` y `tags` siempre completos para saber a quién avisar.
- Las tareas suelen ser "delgadas": el trabajo pesado lo hace Spark, dbt o la base; la tarea de Airflow solo lo dispara y espera.
:::

:::entrevista "¿Qué pasa si pongo una consulta a la base de datos fuera de las tareas de un DAG?"
Se ejecuta cada vez que Airflow parsea el archivo, que es cada pocos segundos o minutos, aunque el DAG no esté corriendo. Eso carga la base, hace lento al Dag processor y puede hacer que el DAG no se cargue por exceder el tiempo de parseo. Todo trabajo con sistemas externos debe ir dentro de la función de una tarea; para valores de configuración se usan Variables o plantillas de Jinja, que se resuelven al ejecutar.
:::

## Ejercicios

:::ejercicio airflow
Crea un DAG con `dag_id="hola_airflow"`, `start_date=datetime(2024, 1, 1)`, `schedule=None` y dos tareas `BashOperator`: `saludar` (`echo hola`) y `despedir` (`echo chau`), donde `saludar` va **antes** que `despedir`.
```python inicial
from datetime import datetime
from airflow.sdk import DAG
from airflow.providers.standard.operators.bash import BashOperator

# with DAG(...) as dag:
```
```python solucion
from datetime import datetime
from airflow.sdk import DAG
from airflow.providers.standard.operators.bash import BashOperator

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
from airflow.sdk import DAG
from airflow.providers.standard.operators.empty import EmptyOperator
```
```python solucion
from datetime import datetime
from airflow.sdk import DAG
from airflow.providers.standard.operators.empty import EmptyOperator

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
from airflow.sdk import DAG
from airflow.providers.standard.operators.python import PythonOperator

def calcular_total():
    return sum([10, 20, 30])
```
```python solucion
from datetime import datetime
from airflow.sdk import DAG
from airflow.providers.standard.operators.python import PythonOperator

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
