# area: Orquestación

## Orquestación
alias: orquestador, orchestration
nino: En una orquesta, el director dice **cuándo entra cada instrumento**: primero los violines, después las trompetas, y si alguien se equivoca, se repite. Un orquestador hace eso con los pasos de datos: decide qué corre, en qué orden, a qué hora, y qué hacer si algo falla.
que: Coordinar la ejecución de muchas tareas de datos: dependencias (B después de A), horarios, reintentos, alertas, ejecuciones pasadas (backfill), paralelismo y visibilidad del estado. Herramientas: **Airflow** (y sus versiones gestionadas MWAA, Cloud Composer, Astronomer), Dagster, Prefect, Step Functions, Databricks Workflows, Azure Data Factory.
ejemplo: Todos los días a las 03:00: (1) esperar el archivo del banco, (2) cargarlo, (3) correr dbt, (4) actualizar el tablero, (5) avisar por Slack. Si el paso 2 falla, reintentar 3 veces y después alertar.
para: Que los pipelines corran solos, de forma confiable y observable.
cuidado: El orquestador debe coordinar, no hacer el trabajo pesado: el procesamiento corre en Spark, el warehouse o contenedores.
ver: Airflow, DAG, Pipeline

## Airflow
alias: apache airflow
nino: Airflow es un **despertador muy inteligente con una lista de tareas**: suena a la hora indicada, hace las tareas en orden, se fija si alguna salió mal, la vuelve a intentar y te avisa.
que: El orquestador de código abierto más usado. Los flujos se escriben en **Python** como DAGs. Componentes: **scheduler** (decide qué correr), **executor/workers** (corren las tareas), **API server** (interfaz web y API; en Airflow 2 se llamaba *webserver*), **metadatabase** (estado de todo) y el **Dag processor** (lee los archivos de DAGs). Desde Airflow 3 los DAGs se escriben importando de `airflow.sdk`.
ejemplo: Un archivo `dags/ventas_diarias.py` que define un DAG `@daily` con las tareas `extraer >> cargar >> transformar >> avisar`.
para: Programar y vigilar pipelines con dependencias complejas.
ver: DAG, Operador, Scheduler, Orquestación

## DAG
alias: directed acyclic graph, grafo acíclico dirigido
nino: Es un **dibujo de flechitas** que muestra qué va primero: "lavarse los dientes → ponerse el pijama → leer un cuento → dormir". Las flechas van en una dirección y **nunca vuelven en círculo** (no puedes volver a lavarte los dientes después de dormir y así para siempre).
que: *Directed Acyclic Graph*: un grafo de tareas con dependencias dirigidas y **sin ciclos**. En Airflow, un DAG es un flujo con su horario, fechas y parámetros; en dbt, el grafo de modelos que forman los `ref()`; en Spark, el plan de ejecución.
ejemplo:
```python
@dag(schedule="@daily", start_date=datetime(2024, 1, 1), catchup=False)
def ventas():
    e = extraer(); c = cargar(e); t = transformar(c)
ventas()
```
para: Que la herramienta sepa el orden correcto y qué puede correr en paralelo.
cuidado: En Airflow, el código de nivel superior del archivo se ejecuta cada pocos segundos al leer el DAG: no hagas consultas ni llamadas a APIs ahí.
ver: Airflow, Tarea, ref()

## Operador
alias: operator, operators
nino: Un operador es un **tipo de trabajador con una especialidad**: uno sabe correr comandos, otro sabe hablar con la base de datos, otro sabe copiar archivos a la nube.
que: Una clase de Airflow que define **qué hace una tarea**: `BashOperator`, `PythonOperator`, `SQLExecuteQueryOperator`, `S3ToRedshiftOperator`, `KubernetesPodOperator`, `DatabricksRunNowOperator`… Al usarlo dentro de un DAG con un `task_id`, se convierte en una tarea.
ejemplo:
```python
BashOperator(task_id="dbt_build", bash_command="cd /dbt && dbt build --target prod")
```
para: Reutilizar integraciones sin escribir el código de conexión.
ver: Tarea, Sensor, TaskFlow

## Tarea
alias: task, task instance
nino: Es **un paso** de la lista: "comprar el pan". Cada día que haces la lista, ese paso tiene su propio resultado: hecho, falló o esperando.
que: Un nodo del DAG (una instancia de operador o una función `@task`). Cada ejecución del DAG crea una **task instance** con estado: `scheduled`, `queued`, `running`, `success`, `failed`, `up_for_retry`, `skipped`, `upstream_failed`.
ejemplo: La tarea `cargar` del día 2024-12-01 quedó en `failed`; en la interfaz la limpias (*clear*) y vuelve a correr solo ella y las que siguen.
para: Ver y reintentar cada paso por separado.
cuidado: Cada tarea debe ser idempotente: re-ejecutarla no debe duplicar datos.
ver: DAG, Operador, Idempotencia, Reintentos

## Scheduler
alias: planificador, programador
nino: Es la persona que **mira el reloj y el calendario** todo el tiempo y dice "¡ya es hora, empiecen la tarea!".
que: El componente de Airflow que lee los DAGs, crea las ejecuciones (*DAG runs*) según el horario, revisa dependencias y envía las tareas listas a los workers. Si el scheduler se cae, nada nuevo arranca.
ejemplo: A las 00:00 del 2 de diciembre, el scheduler crea la ejecución de un DAG diario para el intervalo del 1 de diciembre.
para: Entender por qué y cuándo arranca cada cosa.
ver: Airflow, Cron, Logical date

## Cron
alias: expresión cron, crontab
nino: Es una **forma corta de decir cada cuánto suena la alarma**: cinco numeritos que significan minuto, hora, día, mes y día de la semana.
que: Formato de 5 campos para horarios: `minuto hora día-del-mes mes día-de-la-semana`. `*` = cualquiera, `*/15` = cada 15, `1-5` = rango. Airflow también acepta atajos (`@daily`, `@hourly`) y *timetables*.
ejemplo: `30 6 * * 1-5` = de lunes a viernes a las 06:30 · `0 */4 * * *` = cada 4 horas · `0 3 1 * *` = el día 1 de cada mes a las 03:00.
para: Programar pipelines, backups y trabajos repetitivos.
cuidado: ¿En qué zona horaria? Airflow usa UTC por defecto: 03:00 UTC son las 22:00 o 00:00 en Latinoamérica según el país.
ver: Scheduler, Batch

## Logical date
alias: fecha lógica, execution_date, ds, data_interval
nino: Si el lunes a la noche **ordenas los juguetes del lunes**, la tarea es "del lunes" aunque la hagas a la medianoche del martes. La fecha lógica es el día **del que son los datos**, no el día en que trabajas.
que: La fecha que identifica cada ejecución de un DAG y que las tareas usan para saber qué período procesar (`{{ ds }}` en formato `YYYY-MM-DD`). En **Airflow 3**, con un horario cron, es el momento del disparo (el DAG de las 02:00 del 2/12 tiene `ds = 2024-12-02`) y no hay intervalo, salvo que el timetable declare `interval=`. En **Airflow 2** era el inicio del intervalo de datos: el run `@daily` "del 1/12" corría el 2/12 a las 00:00. En Airflow 3 ya no existe `execution_date`.
ejemplo: Airflow 3, para las ventas de ayer: `WHERE fecha = '{{ macros.ds_add(ds, -1) }}'`, o `{{ data_interval_start | ds }}` con `CronTriggerTimetable("0 2 * * *", timezone="UTC", interval=timedelta(days=1))`. Re-ejecutar ese run dentro de un mes procesa el mismo día, no "hoy".
para: Pipelines reproducibles y backfills correctos.
cuidado: Nunca uses `datetime.now()` para decidir qué datos procesar: rompe los reintentos y backfills.
ver: Backfill, catchup, Idempotencia

## catchup
alias: catch up, ponerse al día
nino: Si te olvidas de regar las plantas una semana, *catchup* es decidir **si las riegas 7 veces seguidas para "ponerte al día"** o solo hoy.
que: Opción de un DAG de Airflow: con `catchup=True`, el scheduler crea ejecuciones para **todos los intervalos pendientes** entre `start_date` (o la última ejecución) y hoy. Con `catchup=False` (el valor por defecto desde Airflow 3; en Airflow 2 era `True`), solo la más reciente.
ejemplo: `start_date=2024-01-01`, `@daily`, `catchup=True` y lo activas el 1/12: Airflow encola ~335 ejecuciones.
para: Decidir si un pipeline nuevo o pausado debe recuperar el pasado automáticamente.
ver: Backfill, Logical date

## Backfill
alias: reproceso histórico, rellenar historia
nino: Es **completar las páginas del diario que dejaste en blanco**: vuelves atrás y escribes lo que pasó esos días.
que: Ejecutar un pipeline para **intervalos pasados**: cargar historia al crear un pipeline, o reprocesar después de corregir un error o cambiar una regla. En Airflow: `airflow dags backfill -s 2024-11-01 -e 2024-11-30 ventas` (o desde la interfaz en versiones nuevas). Requiere tareas idempotentes y parametrizadas por la fecha lógica.
ejemplo: Se descubrió que el cálculo de impuestos estaba mal desde el 1/11: se corrige y se hace backfill de noviembre; cada día se reescribe su partición.
para: Corregir la historia sin trabajo manual.
cuidado: Un backfill grande puede saturar la base de origen: limita la concurrencia (`max_active_runs`).
ver: Logical date, catchup, Idempotencia

## XCom
alias: cross-communication, xcoms
nino: Es un **papelito que una tarea le pasa a la siguiente**: "dejé el archivo en tal carpeta". Es para mensajes cortos, no para pasar la mochila entera.
que: El mecanismo de Airflow para pasar **valores pequeños** entre tareas (rutas, conteos, IDs). Con TaskFlow, el `return` de una tarea se guarda como XCom y se pasa como argumento a la siguiente. Se guarda en la base de metadatos.
ejemplo: `extraer()` devuelve `"s3://lago/raw/pedidos/2024-12-01/"` y `cargar(ruta)` la recibe.
para: Coordinar tareas pasándose referencias.
cuidado: No pases DataFrames ni archivos grandes por XCom: guarda los datos en el almacenamiento y pasa solo la ruta.
ver: TaskFlow, Tarea

## Sensor
alias: sensores
nino: Es alguien **mirando por la ventana esperando que llegue el cartero**: no hace nada más hasta que ve la carta, y entonces avisa.
que: Un operador que **espera una condición** antes de dejar continuar: que exista un archivo (`S3KeySensor`), que termine otro DAG (`ExternalTaskSensor`), que una consulta devuelva algo (`SqlSensor`). Parámetros: `poke_interval`, `timeout` y `mode="reschedule"` o *deferrable* para no ocupar un worker mientras espera.
ejemplo:
```python
S3KeySensor(task_id="espera_archivo", bucket_key="s3://banco/in/{{ ds_nodash }}.csv",
            mode="reschedule", poke_interval=300, timeout=6*3600)
```
para: Depender de cosas externas que no tienen horario fijo.
cuidado: Siempre pon un `timeout`: un sensor sin límite puede esperar para siempre.
ver: Operador, Trigger rule

## TaskFlow
alias: taskflow api, @task, @dag
nino: Es una **forma más fácil de escribir la lista de tareas**: escribes funciones normales de Python con una etiqueta, y Airflow entiende solo quién va antes y qué se pasan.
que: La API de Airflow basada en decoradores: `@dag` define el DAG y `@task` convierte funciones en tareas. Llamar a una tarea con el resultado de otra crea la dependencia y el XCom automáticamente. Incluye variantes como `@task.bash`, `@task.docker` y `@task.branch`.
ejemplo:
```python
@task
def contar(ruta: str) -> int: ...
@task
def avisar(n: int): print(f"cargué {n} filas")
avisar(contar(extraer()))
```
para: DAGs más cortos y legibles en Python.
ver: XCom, Decorador, Operador

## TaskGroup
alias: task group, grupo de tareas
nino: Es **meter varias tareas en una carpeta** para que el dibujo no quede lleno de cajitas: ves "Limpiar la casa" y si la abres, adentro están "barrer", "trapear", "ordenar".
que: Agrupación visual y lógica de tareas en Airflow (`with TaskGroup("carga"):` o `@task_group`). Sus IDs quedan con prefijo (`carga.pedidos`) y el grupo se puede usar como una sola dependencia.
ejemplo: Un grupo `ingesta` con una tarea por tabla (pedidos, clientes, productos) y luego `ingesta >> dbt_build`.
para: Ordenar DAGs grandes.
ver: DAG, Tarea

## Trigger rule
alias: regla de disparo, trigger_rule
nino: Es la regla de **cuándo puede empezar alguien**: "sales al recreo cuando **todos** terminen", o "sales cuando **alguno** termine", o "sales **pase lo que pase**".
que: Condición de Airflow que define cuándo corre una tarea según el estado de las anteriores. Por defecto `all_success`. Otras: `all_done` (corre aunque fallen, útil para limpieza), `one_failed` (para alertas), `none_failed` (tolera tareas saltadas), `one_success`.
ejemplo: `avisar_error = slack(..., trigger_rule="one_failed")` y `limpiar_temporales(..., trigger_rule="all_done")`.
para: Manejar ramas, limpieza y alertas.
ver: Tarea, Sensor

## Connection
alias: conexión de airflow, conn_id
nino: Es una **tarjeta de contacto guardada**: "la base de datos de ventas está en tal dirección y se entra con este usuario". Las tareas solo dicen el nombre de la tarjeta.
que: Credenciales y datos de conexión que Airflow guarda con un `conn_id` (en la metabase cifrada, en variables de entorno `AIRFLOW_CONN_...` o en un gestor de secretos como Secrets Manager o Key Vault). Los *hooks* y operadores las usan por nombre.
ejemplo: `SQLExecuteQueryOperator(conn_id="postgres_ventas", sql="...")`.
para: Mantener las contraseñas fuera del código de los DAGs.
ver: Secreto, Variable de entorno

## Reintentos
alias: retries, retry, compuerta de calidad
nino: Si se te cae la pelota, **la levantas y lo intentas de nuevo** unas veces antes de pedir ayuda. Y antes de entregar la tarea, la maestra la revisa: si está mal, no pasa.
que: Muchos errores son temporales (red, API saturada): se configuran **reintentos** con espera (`retries=3`, `retry_delay`, `retry_exponential_backoff=True`). Una **compuerta de calidad** es una tarea que valida los datos (conteos, nulos, duplicados) y falla a propósito para frenar el pipeline antes de publicar datos malos.
ejemplo: `default_args={"retries": 3, "retry_delay": timedelta(minutes=5)}` y una tarea `validar` entre `cargar` y `publicar`.
para: Pipelines que se recuperan solos de fallas pasajeras y no publican basura.
cuidado: Reintentar una tarea que no es idempotente puede duplicar datos.
ver: Idempotencia, Calidad de datos, Tarea
