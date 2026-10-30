---
titulo: XCom y la TaskFlow API
nivel: Avanzado
duracion: 55
resumen: Pasar datos pequeños entre tareas con XCom, la TaskFlow API (@dag y @task), dependencias implícitas, multiple_outputs, el contexto de la ejecución, mezclar operadores clásicos y TaskFlow, y mapeo dinámico con expand().
---

## XCom: mensajes entre tareas

Las tareas pueden correr en máquinas distintas, así que no comparten variables. Para pasar **datos pequeños** (un nombre de archivo, un conteo, una fecha) se usa **XCom** (*cross-communication*), que los guarda en la base de metadatos.

```python
from datetime import datetime
from airflow.sdk import DAG
from airflow.providers.standard.operators.python import PythonOperator

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

### Cómo funciona por dentro

1. La función `extraer` **devuelve** `1500`. Airflow guarda automáticamente ese valor en la base de metadatos, asociado a esta tarea y a esta ejecución, con la clave `return_value`.
2. `ti.xcom_push(key="ruta", value=…)` guarda un valor adicional con otra clave.
3. En `transformar`, `ti.xcom_pull(task_ids="extraer")` busca en la base el valor que dejó `extraer` **en la misma ejecución del DAG** (no el de ayer).

`ti` es la *task instance* (la ejecución concreta de la tarea), que Airflow pasa automáticamente a la función si declaras un parámetro con ese nombre.

:::analogia El casillero de la oficina
Las tareas son empleados que trabajan en turnos distintos y quizás en edificios distintos: no pueden pasarse papeles en mano. XCom es un casillero compartido, rotulado con el nombre de la tarea y la fecha de la ejecución: una deja una nota ("el archivo quedó en /lake/bronze/…"), la siguiente la retira. Para notas, perfecto; para mudanzas (millones de filas), no entra.
:::

## TaskFlow API: Airflow “pythónico”

Desde Airflow 2, los decoradores `@dag` y `@task` convierten funciones comunes en DAGs y tareas. Lo que una tarea **devuelve** pasa automáticamente por XCom a la siguiente, y las **dependencias se infieren** de cómo pasas los valores:

```python
from datetime import datetime
from airflow.sdk import dag, task

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

Compara con la versión clásica de arriba:

| Clásico (`PythonOperator` + XCom) | TaskFlow (`@task`) |
|---|---|
| `ti.xcom_push` / `ti.xcom_pull` explícitos | El `return` de una tarea es el argumento de la siguiente |
| Dependencias con `>>` | Dependencias **inferidas** de cómo pasas los valores |
| Más código repetitivo | Se lee como Python normal |

Por dentro es **exactamente lo mismo**: TaskFlow usa XCom. Por eso las mismas reglas aplican: lo que devuelves debe ser **chico** y **serializable a JSON** (números, textos, listas, diccionarios; no un DataFrame de pandas ni una conexión a una base).

### multiple_outputs

```python
from datetime import datetime
from airflow.sdk import dag, task

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

## Leer la fecha y otros datos de la ejecución en TaskFlow

En un `PythonOperator` recibías `ti` declarando un parámetro con ese nombre. En TaskFlow hay dos formas de acceder al **contexto** (la fecha lógica, los parámetros, la task instance):

```python
from datetime import datetime
from airflow.sdk import dag, task, get_current_context

@dag(schedule=None, start_date=datetime(2024, 1, 1))
def contexto():

    @task
    def con_parametros(ds=None, logical_date=None):
        # Airflow completa los parámetros cuyo nombre coincide con una variable del contexto
        print(f"Procesando {ds} (logical_date={logical_date})")

    @task
    def con_funcion():
        ctx = get_current_context()          # el diccionario completo
        print("Run:", ctx["run_id"], "· día:", ctx["ds"])

    con_parametros() >> con_funcion()

contexto().test()
```

- La primera forma es la más legible: pides solo lo que necesitas, con valor por defecto `None`.
- `get_current_context()` sirve cuando lo necesitas dentro de una función auxiliar. Solo funciona **mientras corre** una tarea; fuera de ella da error.

## Mezclar operadores clásicos y TaskFlow

En un DAG real conviven los dos estilos: un operador de un *provider* (Databricks, SQL) y funciones `@task`. Para pasar el resultado de un operador clásico a una tarea `@task` se usa `.output`, que representa su XCom `return_value`:

```python
from datetime import datetime
from airflow.sdk import dag, task
from airflow.providers.standard.operators.bash import BashOperator

@dag(schedule=None, start_date=datetime(2024, 1, 1))
def mixto():
    contar = BashOperator(task_id="contar", bash_command="echo 1200")   # su salida va al XCom

    @task
    def validar(filas):
        print(f"El origen tiene {filas} filas")

    validar(contar.output)            # además crea la dependencia contar >> validar

mixto().test()
```

## Mapeo dinámico: una tarea por cada elemento

A veces no sabes **cuántas** tareas vas a necesitar hasta que el DAG corre: hoy llegaron 3 archivos, mañana 12. Escribir un `for` al nivel superior del archivo no sirve (se evalúa al **leer** el archivo, no al ejecutar). Para eso existe el **mapeo dinámico de tareas** (*dynamic task mapping*): `.expand()` crea, en tiempo de ejecución, una copia de la tarea por cada elemento de una lista.

```python
from datetime import datetime
from airflow.sdk import dag, task

@dag(schedule=None, start_date=datetime(2024, 1, 1))
def cargar_archivos():

    @task
    def listar():
        # en la vida real: listar los archivos nuevos de una carpeta del lago
        return ["ventas_norte.csv", "ventas_sur.csv", "ventas_oeste.csv"]

    @task
    def cargar(archivo, destino):
        print(f"Cargando {archivo} en {destino}")
        return 100                      # filas cargadas

    @task
    def resumir(filas):
        print(f"Total: {sum(filas)} filas en {len(filas)} archivos")

    cargadas = cargar.partial(destino="bronze.ventas").expand(archivo=listar())
    resumir(cargadas)

cargar_archivos().test()
```

Paso a paso:

1. `listar()` devuelve una lista. Su tamaño solo se conoce cuando corre.
2. `cargar.partial(destino="bronze.ventas")` fija los argumentos que son **iguales** para todas las copias.
3. `.expand(archivo=listar())` dice: "una copia de `cargar` por cada elemento de la lista, con ese elemento como `archivo`". En la interfaz verás una sola tarea con un número de instancias mapeadas (`[0]`, `[1]`, `[2]`), cada una con su log y sus reintentos.
4. `resumir(cargadas)` recibe la **lista de resultados** de todas las copias.

Si pasas dos listas a `expand` (por ejemplo `expand(archivo=[...], region=[...])`), Airflow crea una copia por **cada combinación** (el producto cartesiano).

:::cuidado Límites del mapeo
Cada copia es una tarea más para el scheduler. Mapear 50 archivos está bien; mapear 100.000 filas es un error de diseño (se procesan en Spark o en la base, y Airflow solo dispara el trabajo). Airflow limita la cantidad de copias con la configuración `max_map_length` (1024 por defecto).
:::

:::errores
- **Devolver un DataFrame o una conexión desde una tarea**: no se puede guardar en XCom (debe ser serializable a JSON). Guarda los datos en el lago y devuelve la ruta.
- **Olvidar llamar a la función `@dag`**: si no escribes `etl_taskflow()` al final, el DAG no existe.
- **Llamar a la función `@task` fuera del DAG**: las tareas se crean dentro de la función decorada con `@dag` o del `with DAG`.
- **`xcom_pull` sin `task_ids`**: busca el XCom de la propia tarea y devuelve `None`.
- **Un `for` al nivel superior para crear tareas según datos externos**: se evalúa al leer el archivo. Usa `.expand()`.
:::

:::trabajo
- En los equipos que empezaron con Airflow 2.x moderno o 3, TaskFlow es el estilo por defecto para la lógica en Python, y los operadores de *providers* se usan para los sistemas externos. Los dos conviven con `.output`.
- El mapeo dinámico se usa mucho para "una tarea por cliente", "una por tabla a replicar" o "una por archivo que llegó", porque cada elemento se reintenta por separado.
- Para valores grandes existe un *backend* de XCom en almacenamiento de objetos (S3, GCS, Azure Blob): Airflow guarda el valor en el bucket y en la base solo la referencia. Aun así, la buena práctica sigue siendo devolver rutas.
:::

:::entrevista "¿Cómo procesarías en Airflow una cantidad variable de archivos que llegan cada día?"
Con mapeo dinámico de tareas: una tarea lista los archivos nuevos y devuelve sus rutas, y la tarea de carga se mapea con `.expand(archivo=...)`, de modo que se crea una instancia por archivo en tiempo de ejecución, cada una con su log y sus reintentos. Los argumentos fijos van en `.partial()`. Luego una tarea final recibe la lista de resultados para validar los totales. Por XCom solo viajan rutas y conteos; los datos quedan en el lago.
:::

## Ejercicios

:::ejercicio airflow
Con la **TaskFlow API**, crea el DAG `pipeline_numeros` (la función decorada debe llamarse `pipeline_numeros`) con tres tareas: `generar` (devuelve `[1, 2, 3, 4]`), `duplicar` (recibe la lista y devuelve cada número × 2) y `sumar` (recibe la lista y devuelve la suma). Encadénalas pasando los valores y crea el DAG llamando a la función.
```python inicial
from datetime import datetime
from airflow.sdk import dag, task

@dag(schedule=None, start_date=datetime(2024, 1, 1))
def pipeline_numeros():
    ...

pipeline_numeros()
```
```python solucion
from datetime import datetime
from airflow.sdk import dag, task

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
from airflow.sdk import DAG
from airflow.providers.standard.operators.python import PythonOperator
```
```python solucion
from datetime import datetime
from airflow.sdk import DAG
from airflow.providers.standard.operators.python import PythonOperator

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

:::ejercicio airflow dificultad=Avanzado titulo="Una tarea por región con expand()"
Crea el DAG `ventas_por_region` (con `@dag`, `schedule=None`, `start_date=datetime(2024, 1, 1)`) con:

1. Una tarea `regiones` que devuelva `["norte", "sur", "oeste"]`.
2. Una tarea `calcular(region, factor)` que devuelva `len(region) * factor`, **mapeada** sobre las regiones con `factor=10` fijo (usa `partial` y `expand`).
3. Una tarea `total(valores)` que devuelva la suma de la lista.

Crea el DAG llamando a la función. El corrector ejecutará el DAG y espera que `total` devuelva `130`.
```python inicial
from datetime import datetime
from airflow.sdk import dag, task
```
```python solucion
from datetime import datetime
from airflow.sdk import dag, task

@dag(schedule=None, start_date=datetime(2024, 1, 1))
def ventas_por_region():
    @task
    def regiones():
        return ["norte", "sur", "oeste"]

    @task
    def calcular(region, factor):
        return len(region) * factor

    @task
    def total(valores):
        return sum(valores)

    total(calcular.partial(factor=10).expand(region=regiones()))

ventas_por_region()
```
```pista
`calcular.partial(factor=10).expand(region=regiones())` crea una copia por región; su resultado es la lista de valores.
```
```python test
d = dags.get("ventas_por_region")
assert d is not None, "No encontré el DAG 'ventas_por_region' (¿llamaste a la función decorada con @dag?)"
assert set(d.task_ids) == {"regiones", "calcular", "total"}, f"Las tareas deben ser regiones, calcular y total; hay {d.task_ids}"
run = d.test()
assert run.xcoms.get(("calcular", "return_value")) == [50, 30, 50], "calcular debe mapearse sobre las 3 regiones con factor=10"
assert run.xcoms.get(("total", "return_value")) == 130, "total debe devolver 130"
```
:::

:::ejercicio quiz dificultad=Intermedio
¿Por qué no conviene crear tareas con un `for` sobre los archivos de una carpeta al nivel superior del archivo del DAG?

- [ ] Porque Python no permite `for` en un DAG
- [x] Porque ese código se ejecuta cada vez que Airflow lee el archivo, no cuando corre el DAG; para una cantidad variable se usa `.expand()`
- [ ] Porque los `for` son lentos
- [ ] Porque Airflow solo acepta 10 tareas
:::
