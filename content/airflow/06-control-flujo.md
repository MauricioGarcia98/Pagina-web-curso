---
titulo: Ramas, trigger rules, sensores y TaskGroups
nivel: Avanzado
duracion: 50
resumen: Decidir caminos, controlar cuándo corre una tarea según sus padres, esperar eventos y organizar DAGs grandes.
---

Hasta ahora tus DAGs eran una línea recta: A, después B, después C. En la vida real hacen falta decisiones como estas:

- "Si hoy es día 1 del mes, recalculo todo; si no, solo cargo lo nuevo."
- "Si la validación encontró errores, mando una alerta en vez de publicar."
- "Pase lo que pase, al final cierro la conexión al servidor."
- "No arranques hasta que el proveedor haya dejado el archivo."

Esta lección cubre las cuatro herramientas que resuelven eso: **ramas**, **trigger rules**, **sensores** y **TaskGroups**.

## Primero: los estados de una tarea

Cada vez que corre el DAG, cada tarea termina en un **estado**. Para entender esta lección te bastan cuatro:

| Estado | Qué significa | Color en la interfaz de Airflow |
|---|---|---|
| `success` | Terminó bien | Verde |
| `failed` | Lanzó un error (después de agotar sus reintentos) | Rojo |
| `skipped` | Airflow decidió **no ejecutarla** (no es un error) | Rosa |
| `upstream_failed` | No corrió porque un padre falló | Naranja |

La idea clave: **`skipped` no es un fallo**. Es "esta tarea no tocaba hoy". Las ramas producen tareas skipped a propósito.

## Ramas: elegir un camino

Una **tarea de rama** es una función de Python que **devuelve el `task_id` del camino a seguir** (o una lista de `task_id` si quieres seguir varios). Airflow ejecuta ese camino y marca como `skipped` las otras tareas que salen directamente de la rama.

Ejemplo: la carga completa solo el día 1 del mes, el resto de los días la carga incremental.

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

Ejecútalo y mira los estados: el 1 de marzo `carga_completa` queda en success y `carga_incremental` en skipped. Cambia la fecha a `datetime(2024, 3, 2)` y se invierte.

Paso a paso:

1. La función `elegir` recibe `ds`, la fecha lógica como texto (`"2024-03-01"`). Airflow le pasa el argumento solo porque se llama así.
2. Devuelve un **texto**: el `task_id` de la tarea elegida. Tiene que coincidir exactamente con un `task_id` que salga de la rama. Si devuelves uno que no existe, la tarea falla.
3. `decidir >> [completa, incremental]` crea las dos salidas posibles.
4. `fin` une los dos caminos. Su `trigger_rule` se explica en la siguiente sección; sin ella, `fin` nunca correría.

La versión moderna con TaskFlow hace lo mismo con un decorador:

```python norun
from airflow.decorators import task

@task.branch
def decidir(ds=None):
    from datetime import date
    return "carga_completa" if date.fromisoformat(ds).day == 1 else "carga_incremental"
```

:::tip ¿Rama o if dentro de la tarea?
Si las dos opciones son "hacer X" o "hacer Y" dentro del mismo script, un `if` en Python basta. Usa una rama cuando los caminos son **tareas distintas** que quieres ver por separado en la interfaz, reintentar por separado o que tienen más tareas detrás.
:::

## Trigger rules: cuándo corre una tarea según sus padres

Por defecto, una tarea corre solo si **todos sus padres terminaron en `success`**. Esa regla se llama `all_success`. El parámetro `trigger_rule` la cambia:

| Trigger rule | La tarea corre si… | Uso típico |
|---|---|---|
| `all_success` (defecto) | todos los padres terminaron OK | Lo normal |
| `all_done` | todos los padres terminaron, en cualquier estado | Limpieza: borrar temporales, cerrar recursos |
| `one_failed` | al menos un padre falló | Mandar una alerta |
| `one_success` | al menos un padre terminó OK | Seguir apenas llega el primer resultado |
| `none_failed` | ningún padre falló (skipped vale) | Unir ramas cuando todas pueden saltarse |
| `none_failed_min_one_success` | ningún padre falló **y** al menos uno terminó OK | **Unir ramas** (la más usada) |
| `all_failed` | todos los padres fallaron | Plan B cuando todo falló |

### Por qué falla la unión de ramas con la regla por defecto

Vuelve al DAG de arriba. El 1 de marzo:

- `carga_completa` → success
- `carga_incremental` → skipped

Con `all_success`, `fin` exige que **ambos** padres estén en success. Uno está skipped, así que Airflow marca `fin` como skipped también. El skipped "contagia" hacia abajo y tu DAG termina sin llegar al final.

Con `none_failed_min_one_success` la condición es "nadie falló y al menos uno salió bien". Eso se cumple, así que `fin` corre.

:::cuidado La trampa de las ramas
La tarea que une los caminos de una rama siempre tiene al menos un padre skipped. Con la regla por defecto también quedaría skipped. Ponle `trigger_rule="none_failed_min_one_success"`.
:::

### Limpieza que corre siempre

Imagina que `procesar` crea un clúster caro y `apagar_cluster` lo apaga. Si `procesar` falla, con la regla por defecto `apagar_cluster` queda en `upstream_failed` y el clúster sigue encendido (y cobrando) toda la noche. Con `trigger_rule="all_done"` el apagado corre pase lo que pase.

Un detalle importante: con `all_done` la tarea de limpieza termina en success, pero **el DAG run igual queda marcado como fallido**, porque `procesar` falló. Así no escondes el error: limpias **y** te enteras.

### Alertas

```python norun
alerta = PythonOperator(task_id="avisar_slack", python_callable=avisar, trigger_rule="one_failed")
[extraer, transformar, cargar] >> alerta
```

`avisar_slack` solo corre si alguna de las tres falló. Si todo sale bien, queda skipped. Para alertas también existen los **callbacks** (`on_failure_callback`), que se ven en la lección de buenas prácticas.

## Sensores: esperar a que algo pase

Un **sensor** es una tarea que no procesa nada: **espera** a que se cumpla una condición. Por ejemplo, que llegue un archivo, que termine otro DAG o que una tabla tenga los datos del día. Cada cierto tiempo pregunta "¿ya está?". A cada pregunta se le llama *poke*.

```python norun
from airflow.sensors.filesystem import FileSensor

esperar = FileSensor(
    task_id="esperar_archivo",
    filepath="/datos/ventas_{{ ds_nodash }}.csv",   # p. ej. /datos/ventas_20240301.csv
    poke_interval=300,          # pregunta cada 5 minutos
    timeout=6 * 3600,           # si a las 6 horas no llegó, falla
    mode="reschedule",          # entre preguntas, libera el worker
)
esperar >> procesar
```

Los tres parámetros que siempre tienes que pensar:

- **`poke_interval`**: cada cuántos segundos pregunta. Muy bajo satura el sistema que consultas; muy alto agrega demora.
- **`timeout`**: cuánto esperar como máximo. **Ponlo siempre.** Sin él, el sensor puede quedarse esperando días por un archivo que nunca va a llegar.
- **`mode`**:
  - `"poke"` (defecto): el sensor ocupa un *worker slot* todo el tiempo, aunque esté dormido. Sirve para esperas de pocos minutos.
  - `"reschedule"`: entre pregunta y pregunta libera el slot. Úsalo para esperas largas. Si tienes 50 sensores en modo poke esperando 6 horas, bloqueas 50 slots y nada más puede correr.

Hay sensores para casi todo: `S3KeySensor` (AWS), `GCSObjectExistenceSensor` (Google Cloud), `WasbBlobSensor` (Azure), `ExternalTaskSensor` (esperar una tarea de otro DAG), `SqlSensor` (esperar a que una consulta devuelva filas).

:::nota Alternativas modernas
- **Deferrable operators** (`deferrable=True`): la espera la hace un proceso liviano llamado *triggerer*, sin ocupar ningún worker.
- **Datasets** (Airflow 2.4+): en vez de que el DAG B pregunte si A terminó, A **avisa** que actualizó una tabla y B arranca solo (`schedule=[Dataset("s3://lake/ventas")]`).
:::

## TaskGroups: ordenar DAGs grandes

Un DAG real puede tener 80 tareas. En la interfaz se vuelve un plato de fideos. Un **TaskGroup** agrupa tareas bajo un nombre (bronze, silver, gold) y en la interfaz se ve como una caja que puedes abrir o cerrar.

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

Tres cosas para notar:

1. **El `task_id` real lleva el prefijo del grupo**: `bronze.ventas` y `silver.ventas` son tareas distintas, aunque las dos se llamen `ventas` dentro de su grupo. Cuando busques una tarea con `get_task`, usa el nombre completo.
2. **`inicio >> bronze`** conecta `inicio` con **todas las tareas de entrada** del grupo. **`bronze >> silver`** hace que todas las tareas de salida de bronze vayan antes que las de entrada de silver. No hace falta conectar una por una.
3. Las tareas dentro de un grupo sin dependencias entre sí corren **en paralelo**.

:::nota ¿Y los SubDAGs?
En tutoriales viejos vas a ver `SubDagOperator`. Está obsoleto y se eliminó en Airflow 3. Usa TaskGroups.
:::

## Resumen

| Necesito… | Herramienta |
|---|---|
| Elegir entre caminos según una condición | `BranchPythonOperator` / `@task.branch` |
| Unir los caminos de una rama | `trigger_rule="none_failed_min_one_success"` |
| Limpiar pase lo que pase | `trigger_rule="all_done"` |
| Alertar solo si algo falla | `trigger_rule="one_failed"` o `on_failure_callback` |
| Esperar un archivo o evento | Sensor con `timeout` y `mode="reschedule"` |
| Ordenar un DAG grande | `TaskGroup` |

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
