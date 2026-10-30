---
titulo: Programación: schedule, start_date, catchup e intervalos
nivel: Intermedio
duracion: 50
resumen: Desde cero - start_date, schedule y catchup; expresiones cron y zona horaria; cómo calcula Airflow 3 la fecha lógica (y cómo lo hacía Airflow 2); procesar el día anterior; catchup, backfill y default_args.
---

## Desde cero: ¿qué significa "programar" un DAG?

Programar un DAG es decirle a Airflow **cuándo** crear una ejecución (un *DAG run*). Para eso hay tres parámetros que siempre van juntos:

- `start_date`: la fecha desde la que el DAG existe. Antes de esa fecha nunca corre.
- `schedule`: cada cuánto corre (todos los días a las 2:00, cada hora, nunca solo…).
- `catchup`: si al activar el DAG debe "ponerse al día" con las ejecuciones que se perdió desde el `start_date`.

Cada DAG run tiene además una **fecha lógica** (`logical_date`): la fecha que identifica esa ejecución y que tus tareas usan para saber **qué datos procesar**. Entender cómo se calcula esa fecha es lo más importante de esta lección, y es justamente lo que cambió entre Airflow 2 y Airflow 3.

## schedule

| Valor | Significado |
|---|---|
| `None` | Solo se ejecuta manualmente o disparado por otro DAG |
| `"@once"` | Una sola vez |
| `"@hourly"` | Cada hora (`0 * * * *`) |
| `"@daily"` | Todos los días a medianoche (`0 0 * * *`) |
| `"@weekly"` | Domingos a medianoche |
| `"@monthly"` | El día 1 de cada mes |
| `"30 6 * * 1-5"` | Cron: a las 6:30, de lunes a viernes |
| `timedelta(hours=6)` | Cada 6 horas |
| `[Asset("s3://lago/ventas")]` | Cuando otro DAG actualiza ese dato (*programación por assets*; en Airflow 2 se llamaba `Dataset`) |
| Un *timetable* (`CronTriggerTimetable(...)`) | Control fino: zona horaria, intervalo de datos, varios horarios |

### Expresiones cron

`cron` es el programador de tareas clásico de Linux, y su forma de escribir horarios se usa en casi todas las herramientas. Son cinco campos separados por espacios; un `*` significa "cualquiera":

```text
┌───────── minuto (0-59)
│ ┌─────── hora (0-23)
│ │ ┌───── día del mes (1-31)
│ │ │ ┌─── mes (1-12)
│ │ │ │ ┌─ día de la semana (0-6, 0 = domingo)
│ │ │ │ │
0 2 * * *      todos los días a las 2:00
*/15 * * * *   cada 15 minutos
0 8 1 * *      el día 1 de cada mes a las 8:00
0 9 * * 1      los lunes a las 9:00
30 6 * * 1-5   de lunes a viernes a las 6:30
```

Se lee de izquierda a derecha: `0 2 * * *` es "en el minuto 0, de la hora 2, de cualquier día, de cualquier mes, cualquier día de la semana". Una página como *crontab.guru* traduce cualquier expresión a palabras.

:::cuidado La zona horaria
Si no dices otra cosa, Airflow interpreta los horarios en **UTC** (la hora universal). `0 2 * * *` en UTC son las 23:00 del día anterior en Buenos Aires o Santiago. Para fijar una zona, usa un `start_date` con zona horaria (`pendulum.datetime(2024, 1, 1, tz="America/Lima")`) o un timetable con `timezone=`.
:::

## La fecha lógica en Airflow 3

En Airflow 3, cuando `schedule` es una expresión cron o un preset (`@daily`), el DAG usa por defecto el timetable `CronTriggerTimetable`. Según la documentación oficial, eso significa:

- La `logical_date` es **el momento en que se dispara** la ejecución.
- No hay intervalo de datos: `data_interval_start` y `data_interval_end` valen **lo mismo** (el momento del disparo).

```text
DAG con schedule="0 2 * * *" (Airflow 3, comportamiento por defecto)

Ejecución que se dispara el 2024-01-02 a las 02:00
  logical_date        = 2024-01-02 02:00   →  {{ ds }} = '2024-01-02'
  data_interval_start = 2024-01-02 02:00
  data_interval_end   = 2024-01-02 02:00
```

Es lo intuitivo: "la ejecución del 2 de enero corre el 2 de enero". Pero cuidado: si la tarea procesa **las ventas de ayer**, `{{ ds }}` es **hoy**, y hay que pedir el día anterior explícitamente.

### Procesar "el día de ayer" en Airflow 3: dos formas

**Forma 1: restar un día en la plantilla.** `macros.ds_add(ds, -1)` devuelve la fecha `ds` menos un día:

```python norun
BashOperator(
    task_id="extraer",
    bash_command="python extraer.py --fecha {{ macros.ds_add(ds, -1) }}",
)
```

**Forma 2: declarar el intervalo en el timetable.** Con `interval=`, la ejecución tiene un intervalo de datos que **termina** en el momento del disparo:

```python norun
from datetime import datetime, timedelta
from airflow.sdk import DAG
from airflow.timetables.trigger import CronTriggerTimetable

with DAG(
    dag_id="ventas_diarias",
    start_date=datetime(2024, 1, 1),
    schedule=CronTriggerTimetable("0 2 * * *", timezone="UTC", interval=timedelta(days=1)),
) as dag:
    ...
# Ejecución del 2024-01-02 02:00 → data_interval_start = 2024-01-01 02:00, data_interval_end = 2024-01-02 02:00
# En las tareas: {{ data_interval_start | ds }} = '2024-01-01'
```

La segunda forma es la más clara para pipelines por períodos: las tareas leen `data_interval_start` y `data_interval_end`, y el período queda escrito en la definición del DAG.

## La fecha lógica en Airflow 2 (la verás en muchos proyectos)

En Airflow 2, una expresión cron usaba `CronDataIntervalTimetable`: cada ejecución representa un **período completo** y se dispara **al terminar** ese período. La `logical_date` es el **comienzo** del período, no el momento en que corre:

```text
DAG @daily con start_date = 2024-01-01 (Airflow 2)

Ejecución que corre el 2024-01-02 a las 00:00
  data_interval_start = 2024-01-01 00:00   ← es la "logical date" ({{ ds }} = '2024-01-01')
  data_interval_end   = 2024-01-02 00:00
  → procesa los datos DEL 1 de enero
```

| DAG run (logical date / `{{ ds }}`) | Período que procesa | Cuándo corre |
|---|---|---|
| 2024-01-01 | 1 de enero 00:00 → 2 de enero 00:00 | 2 de enero 00:00 |
| 2024-01-02 | 2 de enero completo | 3 de enero 00:00 |
| 2024-01-03 | 3 de enero completo | 4 de enero 00:00 |

Esta regla ("el run del 1 de enero corre el 2") confundió a una generación entera de data engineers, y por eso Airflow 3 cambió el valor por defecto. Si migras un DAG de Airflow 2 que usa `{{ ds }}` para "ayer", en Airflow 3 va a procesar **hoy**: o restas un día, o agregas `interval=` al timetable, o se configura `[scheduler] create_cron_data_intervals = True` para mantener el comportamiento viejo. También desapareció la variable `execution_date`: se usa `logical_date`.

### Por qué la fecha lógica importa tanto

Tu tarea no debe preguntar "¿qué día es hoy?" (`datetime.now()`), sino **recibir** el período a procesar (`{{ ds }}`, `{{ data_interval_start }}`). Así, volver a ejecutar dentro de un mes la ejecución del 2 de enero procesa exactamente el 2 de enero: el pipeline es **determinista** y **reprocesable**. Es la base de los backfills.

## catchup y backfill

Si el DAG tiene `start_date=2024-01-01`, `schedule="@daily"` y lo activas el 2024-03-01:

- `catchup=False` (valor por defecto en Airflow 3): solo crea la ejecución más reciente y sigue desde ahí.
- `catchup=True` (era el valor por defecto en Airflow 2): crea **todas** las ejecuciones pendientes desde enero, ¡60 de golpe! (limitadas por `max_active_runs`). Lo mismo pasa si pausas el DAG una semana y lo reactivas.

Para reprocesar un rango a propósito se usa un **backfill**. En Airflow 3 se crea desde la interfaz (botón *Trigger* → *Backfill*) o con el comando:

```bash norun
airflow backfill create --dag-id etl_ventas \
    --from-date 2024-01-01 --to-date 2024-01-31 \
    --reprocess-behavior failed \
    --max-active-runs 3
```

- `--reprocess-behavior` decide qué hacer con los días que ya corrieron: `none` (no repetirlos), `failed` (solo los que fallaron) o `completed` (todos).
- `--max-active-runs` limita cuántos días corren a la vez, para no saturar la base de origen.
- En Airflow 2 el comando era `airflow dags backfill -s 2024-01-01 -e 2024-01-31 etl_ventas`.

:::cuidado start_date dinámico
Nunca uses `start_date=datetime.now()`: el valor cambia cada vez que se lee el archivo y el scheduler no puede calcular las ejecuciones. Usa una fecha fija.
:::

## default_args

Parámetros comunes a todas las tareas del DAG:

```python
from datetime import datetime, timedelta
from airflow.sdk import DAG
from airflow.providers.standard.operators.empty import EmptyOperator

default_args = {
    "owner": "equipo-datos",
    "retries": 2,
    "retry_delay": timedelta(minutes=5),
    "email_on_failure": True,
}

with DAG("con_defaults", start_date=datetime(2024, 1, 1), schedule="0 3 * * *",
         catchup=False, default_args=default_args, max_active_runs=1) as dag:
    t = EmptyOperator(task_id="tarea")

print(dag.get_task("tarea").retries)
```

:::errores
- **Migrar de Airflow 2 a 3 sin revisar `{{ ds }}`**: el DAG pasa a procesar el día de hoy en vez del de ayer. Es el error de migración más común.
- **Olvidar la zona horaria**: el DAG "de las 6:00" corre a las 3:00 hora local.
- **`catchup=True` con un `start_date` viejo**: cientos de ejecuciones de golpe al activar el DAG.
- **Tareas que usan `datetime.now()`**: reprocesar un día viejo vuelve a procesar hoy.
- **Cambiar el `start_date` de un DAG que ya corrió**: el scheduler puede saltarse o repetir ejecuciones; es más seguro crear un DAG nuevo con otro `dag_id`.
:::

:::trabajo
- La pregunta que se hace en cada revisión de un DAG: "si mañana tengo que reprocesar el 15 de marzo, ¿este DAG lo hace bien?". Si la respuesta depende de `now()`, se corrige.
- Los backfills grandes se hacen con `--max-active-runs` bajo y fuera del horario de carga, para no competir con las ejecuciones diarias.
- Muchos equipos fijan todos los horarios en UTC y documentan la hora local en la descripción del DAG.
:::

:::entrevista "¿Qué es la logical date de un DAG run?"
Es la fecha que identifica la ejecución y que las tareas usan para saber qué período procesar, por ejemplo con `{{ ds }}`. En Airflow 3, con un horario cron, es el momento en que se dispara la ejecución; en Airflow 2 era el comienzo del intervalo de datos, por eso la ejecución "del 1 de enero" corría el 2. Lo importante es que las tareas usen esa fecha y no la hora actual, para que se puedan reprocesar días pasados con un backfill y obtener siempre el mismo resultado.
:::

## Ejercicios

:::ejercicio airflow
Crea el DAG `ventas_diarias` que corra **todos los días a las 6:30** (cron), con `start_date=datetime(2024, 1, 1)`, **sin catchup**, y `default_args` con `retries=3`. Agrega una tarea `EmptyOperator` llamada `procesar`.
```python inicial
from datetime import datetime
from airflow.sdk import DAG
from airflow.providers.standard.operators.empty import EmptyOperator
```
```python solucion
from datetime import datetime
from airflow.sdk import DAG
from airflow.providers.standard.operators.empty import EmptyOperator

with DAG("ventas_diarias", start_date=datetime(2024, 1, 1), schedule="30 6 * * *",
         catchup=False, default_args={"retries": 3}) as dag:
    procesar = EmptyOperator(task_id="procesar")
```
```python test
d = dags.get("ventas_diarias")
assert d is not None, "No encontré el DAG 'ventas_diarias'"
assert str(d.schedule).split() == ["30", "6", "*", "*", "*"], f"schedule debería ser '30 6 * * *' y es {d.schedule!r}"
assert d.catchup is False, "catchup debe ser False"
assert d.get_task("procesar").retries == 3, "La tarea debe heredar retries=3 de default_args"
```
:::

:::ejercicio quiz
Un DAG `@daily` procesa “los pedidos del día”. ¿Qué fecha tiene `{{ ds }}` en la ejecución que corre el **2024-05-10 a las 00:00**?

- [ ] 2024-05-10
- [x] 2024-05-09
- [ ] 2024-05-11
- [ ] La fecha y hora actual
```explicacion
La ejecución que corre el 10 procesa el intervalo del 9 (de 00:00 a 00:00 del 10). `ds` es el inicio del intervalo: 2024-05-09.
```
:::

:::ejercicio quiz
¿Qué expresión cron significa “cada lunes a las 9:00”?

- [ ] `9 0 * * 1`
- [x] `0 9 * * 1`
- [ ] `0 9 1 * *`
- [ ] `* 9 * * 1`
:::

:::ejercicio cli
Reprocesa con un **backfill** el DAG `etl_ventas` para todo enero de 2024 (del 2024-01-01 al 2024-01-31).
```respuesta
airflow dags backfill (-s|--start-date) 2024-01-01 (-e|--end-date) 2024-01-31 etl_ventas
airflow dags backfill etl_ventas (-s|--start-date) 2024-01-01 (-e|--end-date) 2024-01-31
```
```solucion
airflow dags backfill -s 2024-01-01 -e 2024-01-31 etl_ventas
```
:::

:::ejercicio quiz dificultad=Intermedio
En Airflow 3, un DAG con `schedule="0 2 * * *"` se dispara el 2024-05-10 a las 02:00. ¿Cuánto vale `{{ ds }}`?

- [ ] '2024-05-09'
- [x] '2024-05-10': con el timetable por defecto de Airflow 3, la fecha lógica es el momento del disparo
- [ ] '2024-05-11'
- [ ] Depende del worker
:::

:::ejercicio quiz dificultad=Avanzado
Migraste a Airflow 3 un DAG diario que extraía "las ventas de `{{ ds }}`" pensando en el día anterior. ¿Qué cambio mantiene el comportamiento?

- [ ] Ninguno, funciona igual
- [x] Usar `{{ macros.ds_add(ds, -1) }}` o un `CronTriggerTimetable` con `interval=timedelta(days=1)` y leer `data_interval_start`
- [ ] Poner `catchup=True`
- [ ] Usar `datetime.now() - timedelta(days=1)`
:::

:::ejercicio quiz dificultad=Básico
¿Qué significa la expresión cron `30 6 * * 1-5`?

- [ ] Cada 30 minutos entre las 6 y las 15
- [x] A las 6:30, de lunes a viernes
- [ ] El día 30 de cada mes a las 6:00
- [ ] A las 6:30 los sábados y domingos
:::
