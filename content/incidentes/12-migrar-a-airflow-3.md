---
titulo: "Migración: tu DAG de Airflow 2 a Airflow 3"
nivel: Avanzado
duracion: 60
resumen: Un DAG real de Airflow 2 que deja de funcionar al actualizar - schedule_interval, days_ago, execution_date, sla y rutas de importación viejas. Los pasos oficiales de migración (ruff con las reglas AIR, provider estándar, config update), el cambio de la fecha lógica que no da error pero procesa el día equivocado, y Datasets que pasan a ser Assets.
objetivos: Seguir los pasos oficiales para migrar a Airflow 3 | Reconocer los errores que aparecen al cargar un DAG de Airflow 2 | Corregir el cambio silencioso de la fecha lógica | Migrar Datasets a Assets | Armar un plan de migración sin cortar la operación
prerrequisitos: airflow-programacion | incidentes-airflow-en-produccion
autoevaluacion: ¿Sabes qué errores da un DAG de Airflow 2 al cargarlo en Airflow 3? | ¿Sabes por qué un DAG migrado puede correr sin errores y procesar el día equivocado? | ¿Sabes qué hace ruff check --select AIR301?
---

:::escenario
El equipo de plataforma actualizó Airflow de 2.10 a 3.3 un domingo. El lunes, la mitad de los DAGs no aparecen en la interfaz (errores de importación) y la otra mitad corrió "bien"… pero el tablero de ventas muestra los datos de **hoy** en la fila de **ayer**. El primer problema hace ruido y se arregla rápido. El segundo es silencioso y es el peligroso. Esta lección te entrena en los dos.
:::

## Los pasos oficiales

La guía de actualización de la documentación de Airflow propone este orden:

1. **Estar en Airflow 2.7 o más nuevo** (mejor, en la última 2.x) y que los DAGs no muestren avisos de obsoleto.
2. **Limpiar y respaldar** la base de metadatos (`airflow db clean` para recortar historia vieja, y un respaldo antes de tocar nada).
3. **Revisar los DAGs** con `ruff`, un analizador de código de Python que tiene reglas específicas de Airflow:

```bash norun
pip install "ruff>=0.13.1"
ruff check dags/ --select AIR301              # cambios que ROMPEN en Airflow 3
ruff check dags/ --select AIR301 --show-fixes # qué corregiría
ruff check dags/ --select AIR301 --fix        # corrige lo seguro
ruff check dags/ --select AIR311,AIR312       # cambios recomendados (rutas de importación nuevas)
```

   Las reglas AIR301 y AIR302 marcan lo que se rompe; AIR311 y AIR312, lo que todavía funciona pero conviene cambiar.
4. **Instalar el provider estándar** (`apache-airflow-providers-standard`), donde ahora viven `BashOperator`, `PythonOperator`, `FileSensor` y compañía.
5. **Revisar las tareas que acceden directo a la base de metadatos**: en Airflow 3 las tareas ya no pueden abrir sesiones contra esa base; se usa la API REST o el cliente de Python de Airflow.
6. **Actualizar la instalación**: `airflow config update --fix` para renombrar configuraciones (todo lo que era `[webserver]` pasa a `[api]` o `[fab]`) y `airflow db migrate` para la base.
7. **Cambiar los scripts de arranque**: ahora hay que levantar `airflow api-server` (no `webserver`) y `airflow dag-processor` como proceso aparte.

Los pasos 1 a 5 son del equipo que escribe DAGs; el 6 y el 7, de quien administra la instalación.

## Lo que rompe en voz alta

Estos cambios hacen que el DAG **no cargue**: aparece un error de importación y el DAG desaparece de la interfaz. Son molestos, pero se ven enseguida.

| Airflow 2 | Error en Airflow 3 | Corrección |
|---|---|---|
| `DAG(..., schedule_interval="0 2 * * *")` | `unexpected keyword argument 'schedule_interval'` | `schedule="0 2 * * *"` |
| `from airflow.utils.dates import days_ago` / `start_date=days_ago(1)` | `days_ago` no existe | Una fecha fija: `start_date=datetime(2024, 1, 1)` |
| `BashOperator(..., sla=timedelta(hours=2))` | `Invalid arguments were passed … 'sla'` | Quitar `sla`; usar *Deadline Alerts* |
| `{{ execution_date }}` en una plantilla | `'execution_date' is undefined` al ejecutar la tarea | `{{ logical_date }}` o `{{ ds }}` |
| `{{ prev_ds }}`, `{{ yesterday_ds }}`, `{{ next_ds }}` | `undefined` | `{{ macros.ds_add(ds, -1) }}` o el intervalo del timetable |
| `SubDagOperator` | No existe | `TaskGroup` |

Y hay cambios que **todavía funcionan** con un aviso de obsoleto, pero que se van a eliminar: las rutas `airflow.operators.*` y `airflow.decorators`, que pasan a `airflow.providers.standard.*` y `airflow.sdk`. El simulador del curso se comporta igual: con una ruta vieja, el DAG corre y muestra un `AirflowDeprecationWarning`.

## Lo que rompe en silencio: la fecha lógica

Este es el error del escenario, y ningún analizador lo detecta porque **no es un error de código**. En Airflow 2, un DAG con `schedule="0 2 * * *"` tenía como fecha lógica el **comienzo** del intervalo: la ejecución que corría el 15 de marzo a las 2:00 tenía `ds = 2024-03-14`. Muchos DAGs usaban `{{ ds }}` para decir "ayer" sin saberlo.

En Airflow 3, con un horario cron, la fecha lógica es el **momento del disparo**: la misma ejecución tiene `ds = 2024-03-15`. El DAG corre sin errores, pero ahora extrae **hoy** (un día incompleto) en lugar de ayer.

| Ejecución del 15/03 a las 02:00 | Airflow 2 | Airflow 3 |
|---|---|---|
| `{{ ds }}` | 2024-03-14 | 2024-03-15 |
| `{{ macros.ds_add(ds, -1) }}` | 2024-03-13 | 2024-03-14 |
| `{{ data_interval_start \| ds }}` | 2024-03-14 | 2024-03-15 (sin intervalo) |

Cómo se arregla, de más simple a más explícito:

- Restar un día en la plantilla: `{{ macros.ds_add(ds, -1) }}`.
- Declarar el intervalo en el timetable: `CronTriggerTimetable("0 2 * * *", timezone="UTC", interval=timedelta(days=1))`, y usar `{{ data_interval_start | ds }}`.
- Mantener el comportamiento viejo para toda la instalación con `[scheduler] create_cron_data_intervals = True`. Sirve para migrar sin tocar cada DAG, pero hay que configurarlo **antes** de que corra la primera ejecución en Airflow 3: cambiarlo después hace que se salte una ejecución.

:::cuidado Cómo detectar el error silencioso
Antes de migrar, guarda para cada DAG qué fecha procesa una ejecución conocida (por ejemplo, con `airflow dags test mi_dag 2024-03-15` en Airflow 2). Después de migrar, repite la misma prueba y compara. Si el día procesado cambió, el DAG necesita corrección aunque no haya fallado.
:::

## Practica: la migración completa

El DAG del ejercicio es el `ventas_diarias` del equipo, tal como estaba en Airflow 2. Al cargarlo en el simulador (que se comporta como Airflow 3) verás los errores en el orden en que aparecen. Corrígelos uno por uno, como en el trabajo real: lee el error, corrige, vuelve a ejecutar.

:::ejercicio airflow dificultad=Avanzado titulo="ventas_diarias a Airflow 3"
Migra el DAG a Airflow 3 manteniendo lo que hacía: corre todos los días a las 02:00, empieza el 2024-01-01, no recupera días pasados, reintenta 2 veces y la tarea `extraer` procesa **el día anterior** al de la ejecución. Usa las rutas de importación de Airflow 3, quita lo que se eliminó y deja `extraer >> cargar`.

El corrector ejecuta el DAG con la fecha lógica 2024-03-15 y espera que `extraer` imprima `extrayendo ventas del 2024-03-14`.
```python inicial
from datetime import timedelta
from airflow import DAG
from airflow.operators.bash import BashOperator
from airflow.utils.dates import days_ago

with DAG(
    dag_id="ventas_diarias",
    schedule_interval="0 2 * * *",
    start_date=days_ago(1),
    catchup=False,
    default_args={"retries": 2},
) as dag:
    extraer = BashOperator(
        task_id="extraer",
        bash_command="echo extrayendo ventas del {{ ds }}",
        sla=timedelta(hours=2),
    )
    cargar = BashOperator(task_id="cargar", bash_command="echo cargado para {{ execution_date }}")
    extraer >> cargar
```
```python solucion
from datetime import datetime
from airflow.sdk import DAG
from airflow.providers.standard.operators.bash import BashOperator

with DAG(
    dag_id="ventas_diarias",
    schedule="0 2 * * *",
    start_date=datetime(2024, 1, 1),
    catchup=False,
    default_args={"retries": 2},
) as dag:
    extraer = BashOperator(
        task_id="extraer",
        bash_command="echo extrayendo ventas del {{ macros.ds_add(ds, -1) }}",
    )
    cargar = BashOperator(task_id="cargar", bash_command="echo cargado para {{ logical_date }}")
    extraer >> cargar
```
```pista
Vas a ver los errores en orden: primero `days_ago`, después `schedule_interval`, después `sla` y, al ejecutar, `execution_date`. Cuando ya no haya errores, falta lo silencioso: en Airflow 3 `{{ ds }}` es el día de la ejecución, no el anterior.
```
```python test
from datetime import datetime
import re
d = dags.get("ventas_diarias")
assert d is not None, "No encontré el DAG 'ventas_diarias'"
assert not re.search(r"^\s*from airflow\.(operators|decorators|utils\.dates)\b|^\s*from airflow import DAG", _codigo, re.M), "Quedan rutas de importación de Airflow 2: usa airflow.sdk y airflow.providers.standard"
assert d.schedule == "0 2 * * *", "El DAG debe seguir corriendo a las 02:00 todos los días"
assert d.start_date == datetime(2024, 1, 1), "start_date debe ser una fecha fija: datetime(2024, 1, 1)"
assert d.catchup is False and d.get_task("extraer").retries == 2, "Mantén catchup=False y 2 reintentos"
assert d.get_task("extraer").downstream_task_ids == {"cargar"}, "Mantén extraer >> cargar"
run = d.test(logical_date=datetime(2024, 3, 15, 2))
assert run.state == "success", "El DAG debe terminar bien (¿queda algún execution_date?)"
assert run.xcoms.get(("extraer", "return_value")) == "extrayendo ventas del 2024-03-14", f"extraer debe procesar el día anterior; imprimió {run.xcoms.get(('extraer', 'return_value'))!r}"
```
:::

:::ejercicio airflow dificultad=Intermedio titulo="De Dataset a Asset"
Este par de DAGs usa `Dataset` de Airflow 2.4–2.11. Migralos a **`Asset`** de `airflow.sdk` (con las rutas de importación nuevas), sin cambiar el comportamiento: `cargar_pagos` actualiza el dato `s3://lago/silver/pagos` y `conciliar` corre cuando se actualiza.
```python inicial
from datetime import datetime
from airflow import DAG
from airflow.datasets import Dataset
from airflow.operators.empty import EmptyOperator

pagos = Dataset("s3://lago/silver/pagos")

with DAG("cargar_pagos", start_date=datetime(2024, 1, 1), schedule="@daily"):
    EmptyOperator(task_id="cargar", outlets=[pagos])

with DAG("conciliar", start_date=datetime(2024, 1, 1), schedule=[pagos]):
    EmptyOperator(task_id="conciliar")
```
```python solucion
from datetime import datetime
from airflow.sdk import DAG, Asset
from airflow.providers.standard.operators.empty import EmptyOperator

pagos = Asset("s3://lago/silver/pagos")

with DAG("cargar_pagos", start_date=datetime(2024, 1, 1), schedule="@daily"):
    EmptyOperator(task_id="cargar", outlets=[pagos])

with DAG("conciliar", start_date=datetime(2024, 1, 1), schedule=[pagos]):
    EmptyOperator(task_id="conciliar")
```
```pista
`from airflow.sdk import DAG, Asset` y `Asset("s3://lago/silver/pagos")`. El operador vacío se importa de `airflow.providers.standard.operators.empty`.
```
```python test
import re
p, c = dags.get("cargar_pagos"), dags.get("conciliar")
assert p is not None and c is not None, "Deben existir los DAGs cargar_pagos y conciliar"
assert "Dataset" not in _codigo, "Reemplaza Dataset por Asset"
assert not re.search(r"^\s*from airflow\.(operators|datasets)\b|^\s*from airflow import DAG", _codigo, re.M), "Usa las rutas de Airflow 3"
o = p.get_task("cargar").outlets
assert len(o) == 1 and type(o[0]).__name__ == "Asset" and o[0].uri == "s3://lago/silver/pagos", "cargar debe tener outlets=[pagos] con un Asset"
sch = c.schedule if isinstance(c.schedule, (list, tuple)) else [c.schedule]
assert any(getattr(a, "uri", None) == "s3://lago/silver/pagos" for a in sch), "conciliar debe programarse con el asset pagos"
```
:::

## Un plan de migración que no corta la operación

1. **Inventario**: lista de DAGs con su dueño, si usan `ds` para "ayer", si usan Datasets, operadores propios o acceso directo a la base.
2. **Correr ruff** sobre todo el repositorio y corregir en una rama, con *pull requests* chicos.
3. **Pruebas de "qué día procesa"**: para cada DAG, la misma ejecución en Airflow 2 y en un entorno de prueba con Airflow 3, comparando la fecha y los conteos.
4. **Entorno paralelo**: Airflow 3 levantado aparte, con los DAGs pausados; se activan de a grupos mientras se pausan en Airflow 2.
5. **Plan de vuelta atrás**: el respaldo de la base y la instalación vieja disponibles hasta que pase al menos un cierre de mes.

:::errores
- **Migrar solo lo que da error**: los DAGs que usan `{{ ds }}` como "ayer" corren sin fallar y procesan el día equivocado.
- **Cambiar `create_cron_data_intervals` después de la primera ejecución**: se salta una ejecución.
- **Actualizar directo desde una 2.x vieja** (anterior a 2.7): la guía exige pasar antes por 2.7 o más nuevo.
- **No instalar el provider estándar**: los operadores básicos no aparecen.
- **Dejar los avisos de obsoleto para "después"**: en la próxima versión mayor, esas rutas desaparecen.
- **Operadores propios que leen la base de metadatos** con una sesión de SQLAlchemy: en Airflow 3 ya no tienen acceso.
:::

:::trabajo
- En las empresas la migración a Airflow 3 suele ser un proyecto de semanas o meses, con un responsable por equipo de DAGs y un tablero de avance (DAGs migrados, probados, activados).
- Los servicios administrados (MWAA, Composer 3, Astronomer) ofrecen Airflow 3, pero la migración del código y las pruebas siguen siendo tuyas.
- `ruff` con las reglas AIR se deja en el CI después de migrar, para que nadie vuelva a escribir sintaxis vieja.
:::

:::entrevista "¿Cómo encararías la migración de 300 DAGs de Airflow 2 a Airflow 3?"
Seguiría la guía oficial: primero llevar la instalación a la última 2.x sin avisos de obsoleto, respaldar la base y correr ruff con las reglas AIR301 y AIR311 sobre todo el repositorio, corrigiendo en pull requests chicos. Pondría especial atención en el cambio de la fecha lógica, que no da error: para cada DAG compararía qué día procesa la misma ejecución antes y después, y corregiría con `ds_add` o un timetable con intervalo, o decidiría usar `create_cron_data_intervals` antes de arrancar. Levantaría Airflow 3 en paralelo y movería los DAGs por grupos, con un plan de vuelta atrás.
:::

:::ejercicio quiz dificultad=Avanzado
Después de migrar, un DAG diario de las 03:00 corre sin errores pero el tablero muestra datos incompletos del día actual. ¿Qué pasó?

- [ ] El scheduler está atrasado
- [x] El DAG usaba `{{ ds }}` como "ayer"; en Airflow 3 la fecha lógica de un horario cron es el momento del disparo, así que ahora procesa el día en curso
- [ ] Falta instalar el provider estándar
- [ ] Hay que borrar la base de metadatos
:::

:::ejercicio quiz dificultad=Intermedio
¿Qué hace `ruff check dags/ --select AIR301`?

- [ ] Ejecuta todos los DAGs
- [x] Busca en los DAGs los usos que se rompen en Airflow 3 (y con `--fix` corrige los que puede)
- [ ] Actualiza la base de metadatos
- [ ] Instala Airflow 3
:::

:::ejercicio quiz dificultad=Intermedio
Un DAG usa `from airflow.operators.bash import BashOperator`. ¿Qué pasa en Airflow 3?

- [ ] Error de importación: el DAG no carga
- [x] Funciona, pero con un aviso de obsoleto: la ruta nueva es `airflow.providers.standard.operators.bash` y la vieja se va a eliminar
- [ ] BashOperator ya no existe
- [ ] Hay que usar `@task.bash` obligatoriamente
:::
