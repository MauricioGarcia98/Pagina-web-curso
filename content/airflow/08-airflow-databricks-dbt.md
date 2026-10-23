---
titulo: Airflow + Databricks + dbt: un pipeline real
nivel: Experto
duracion: 50
resumen: Orquestar jobs de Databricks y dbt desde Airflow, sensores, alertas y el diseño de un DAG de producción.
---

En la vida real, un DAG de Airflow casi nunca procesa datos. Lo que hace es **coordinar** a otros sistemas: le dice a Databricks que corra un job, espera a que termine, le dice a dbt que construya los modelos y avisa si algo sale mal. Esta lección arma ese pipeline completo, el que vas a encontrar en muchas empresas que usan Azure, Databricks y dbt.

## El escenario

Tienda Andina recibe cada noche los pedidos del día. A las 7 de la mañana el equipo comercial abre su dashboard y espera ver las ventas de ayer. Entre medio pasa esto:

| Hora | Paso | Quién lo hace | Capa |
|---|---|---|---|
| 03:00 | Copiar los pedidos crudos al lake | Job de Databricks | Bronze |
| 03:20 | Limpiar, tipar y deduplicar | Notebook de Databricks (Spark) | Silver |
| 03:50 | Construir hechos, dimensiones y métricas, y correr tests | dbt sobre Databricks SQL | Gold |
| 04:10 | Avisar que terminó (o que falló) | Airflow | — |

Airflow es quien dispara cada paso **en orden**, reintenta si algo falla por un problema pasajero y deja un registro de qué corrió y cuándo.

## El DAG completo

```python
from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.empty import EmptyOperator
from airflow.operators.bash import BashOperator
from airflow.providers.databricks.operators.databricks import DatabricksRunNowOperator, DatabricksSubmitRunOperator

default_args = {"owner": "datos", "retries": 2, "retry_delay": timedelta(minutes=10)}

with DAG(
    dag_id="lakehouse_diario",
    start_date=datetime(2024, 1, 1),
    schedule="0 3 * * *",
    catchup=False,
    max_active_runs=1,
    default_args=default_args,
    tags=["produccion", "lakehouse"],
) as dag:

    inicio = EmptyOperator(task_id="inicio")

    # 1) Ingesta a bronze: un job de Databricks ya existente (creado con Asset Bundles)
    ingesta = DatabricksRunNowOperator(
        task_id="ingesta_bronze",
        databricks_conn_id="databricks_default",
        job_id=123456,
        job_parameters={"fecha": "{{ ds }}"},
    )

    # 2) Silver con un notebook (cluster efímero solo para esta ejecución)
    silver = DatabricksSubmitRunOperator(
        task_id="silver_pedidos",
        databricks_conn_id="databricks_default",
        new_cluster={"spark_version": "15.4.x-scala2.12", "node_type_id": "Standard_D4ds_v5", "num_workers": 2},
        notebook_task={"notebook_path": "/Repos/datos/pipelines/silver_pedidos", "base_parameters": {"fecha": "{{ ds }}"}},
    )

    # 3) Gold con dbt (en un contenedor o venv con dbt-databricks)
    dbt_build = BashOperator(
        task_id="dbt_build",
        bash_command="cd /opt/dbt/tienda && dbt build --target prod --vars '{fecha: {{ ds }}}'",
    )

    fin = EmptyOperator(task_id="fin")

    inicio >> ingesta >> silver >> dbt_build >> fin

dag.test()
```

Ejecútalo: el mini-Airflow del curso simula las llamadas a Databricks y muestra qué parámetros enviaría, con las plantillas ya resueltas.

## La configuración del DAG, línea por línea

- **`schedule="0 3 * * *"`**: una expresión cron que significa "a las 03:00 todos los días". Los cinco campos son minuto, hora, día del mes, mes y día de la semana.
- **`catchup=False`**: al activar el DAG no se ejecutan los días pasados desde `start_date`.
- **`max_active_runs=1`**: nunca hay dos ejecuciones del DAG al mismo tiempo. Si la del lunes se atrasa, la del martes espera. Importa porque silver y gold dependen del estado que dejó el día anterior: dos ejecuciones en paralelo escribiendo las mismas tablas se pisan.
- **`default_args`**: lo que heredan todas las tareas. `owner` dice qué equipo responde por el DAG. `retries=2` con `retry_delay` de 10 minutos le da tiempo a un clúster que tardó en arrancar.
- **`tags`**: etiquetas para filtrar en la interfaz ("muéstrame todo lo de producción").

## Las tres formas de lanzar trabajo en Databricks

### `DatabricksRunNowOperator`: correr un job que ya existe

El job (sus tareas, el clúster, las librerías) **ya está definido en Databricks**, normalmente con Asset Bundles y versionado en Git. Airflow solo dice "córrelo ahora con estos parámetros" y espera a que termine.

- **Ventaja**: la definición del job vive en un solo lugar y se puede correr a mano desde Databricks para depurar.
- **`job_parameters={"fecha": "{{ ds }}"}`**: el job recibe la fecha lógica. Así reprocesar el 15 de marzo es relanzar esa ejecución, sin tocar código.

### `DatabricksSubmitRunOperator`: definir el trabajo desde Airflow

Aquí la definición completa (qué notebook y en qué clúster) va **en el DAG**. Databricks crea un **clúster efímero** (`new_cluster`), corre el notebook y lo apaga.

- **Ventaja**: el clúster existe solo mientras corre la tarea y se paga solo ese tiempo.
- **Desventaja**: la configuración queda repartida entre Airflow y Databricks.

### `DatabricksWorkflowTaskGroup`: un job con varias tareas

Si tienes muchas tareas de Databricks seguidas, este TaskGroup las agrupa en **un solo job** que comparte el clúster. Así no pagas un arranque de clúster por cada tarea.

:::nota La Connection `databricks_default`
`databricks_conn_id` apunta a una Connection de Airflow que guarda la URL del workspace y un token o service principal. Las credenciales nunca aparecen en el DAG.
:::

## dbt desde Airflow: tres opciones

| Opción | Cómo | Cuándo |
|---|---|---|
| `BashOperator` con `dbt build` | Un solo comando construye y testea todo | Proyectos chicos; lo más simple |
| **Cosmos** | Una tarea de Airflow **por modelo** y por test | Proyectos medianos o grandes; reintentar solo el modelo que falló |
| Job de Databricks con tarea dbt | Databricks corre dbt; Airflow lanza el job con `RunNow` | Cuando todo lo demás ya vive en Databricks |

En el ejemplo, `dbt build --target prod` construye todos los modelos y corre sus tests en orden. Si un test falla, `dbt` termina con código de salida distinto de 0, el `BashOperator` falla y Airflow lo reintenta y avisa. Así un dato malo **no llega al dashboard sin que nadie se entere**.

:::tip Cosmos
El paquete **astronomer-cosmos** convierte un proyecto dbt en un TaskGroup de Airflow con **una tarea por modelo** (y sus tests). Si de 40 modelos falla uno, ves exactamente cuál en la interfaz y reintentas solo ese y los que dependen de él.
:::

## Alertas

```python norun
def avisar_falla(context):
    ti = context["task_instance"]
    enviar_a_teams(f"❌ Falló {ti.dag_id}.{ti.task_id} ({context['ds']}). Log: {ti.log_url}")

default_args = {"on_failure_callback": avisar_falla, "retries": 2}
```

- `on_failure_callback` corre **solo cuando la tarea falla definitivamente**, después de agotar los reintentos. No recibes un mensaje por cada intento.
- El mensaje incluye el DAG, la tarea, la fecha y un **link al log**, para que quien esté de guardia vaya directo al problema.
- Para procesos con hora límite (el dashboard de las 7:00), Airflow 3 trae **deadline alerts** y Airflow 2 tiene `sla`. Las dos te avisan si a cierta hora todavía no terminó, aunque no haya fallado nada.

## ¿Qué pasa cuando algo falla a las 3:25?

Supón que el notebook de silver falla porque llegó una columna nueva:

1. `silver_pedidos` falla. Espera 10 minutos y reintenta dos veces, y las dos vuelven a fallar.
2. Queda en `failed` y `on_failure_callback` manda el mensaje a Teams.
3. `dbt_build` y `fin` quedan en `upstream_failed`: **gold no se reconstruye con datos a medias**, y el dashboard sigue mostrando los datos de anteayer en vez de datos incorrectos.
4. Quien está de guardia corrige el notebook y hace **clear** de `silver_pedidos` en la interfaz. Airflow vuelve a correr silver, dbt y fin para esa misma fecha. Como todo es idempotente y usa `{{ ds }}`, el resultado es el mismo que si nunca hubiera fallado.

## Diseño de un DAG de producción: checklist

- [ ] `start_date` fijo, `catchup` decidido a propósito y `max_active_runs` si hay dependencia entre días.
- [ ] Reintentos con espera y timeouts (`execution_timeout`) para que nada quede colgado.
- [ ] Tareas idempotentes, parametrizadas con `{{ ds }}` o el data interval.
- [ ] El cómputo pesado en Databricks o dbt; Airflow solo coordina.
- [ ] Alertas al fallar y SLAs o deadlines para lo crítico.
- [ ] Credenciales en Connections (respaldadas por Key Vault).
- [ ] Tests de importación en CI y despliegue automático de la carpeta `dags/`.

## Ejercicio integrador

:::ejercicio airflow dificultad=Experto titulo="DAG de producción"
Crea el DAG `pipeline_prod` con: `schedule="0 4 * * *"`, `start_date=datetime(2024, 1, 1)`, `catchup=False`, `max_active_runs=1` y `default_args` con `retries=2`. Tareas: `esperar_archivo` (un `FileSensor` con `filepath="/datos/ventas_{{ ds_nodash }}.csv"`), `ingesta` (un `DatabricksRunNowOperator` con `job_id=111` y `job_parameters={"fecha": "{{ ds }}"}`), `dbt_build` (`BashOperator` con un comando que contenga `dbt build`) y `notificar` (`EmptyOperator` con `trigger_rule="all_done"`). Orden: `esperar_archivo >> ingesta >> dbt_build >> notificar`.
```python inicial
from datetime import datetime
from airflow import DAG
from airflow.operators.empty import EmptyOperator
from airflow.operators.bash import BashOperator
from airflow.sensors.filesystem import FileSensor
from airflow.providers.databricks.operators.databricks import DatabricksRunNowOperator
```
```python solucion
from datetime import datetime
from airflow import DAG
from airflow.operators.empty import EmptyOperator
from airflow.operators.bash import BashOperator
from airflow.sensors.filesystem import FileSensor
from airflow.providers.databricks.operators.databricks import DatabricksRunNowOperator

with DAG("pipeline_prod", start_date=datetime(2024, 1, 1), schedule="0 4 * * *", catchup=False,
         max_active_runs=1, default_args={"retries": 2}) as dag:
    esperar = FileSensor(task_id="esperar_archivo", filepath="/datos/ventas_{{ ds_nodash }}.csv")
    ingesta = DatabricksRunNowOperator(task_id="ingesta", job_id=111, job_parameters={"fecha": "{{ ds }}"})
    dbt_build = BashOperator(task_id="dbt_build", bash_command="cd /opt/dbt && dbt build --target prod")
    notificar = EmptyOperator(task_id="notificar", trigger_rule="all_done")
    esperar >> ingesta >> dbt_build >> notificar
```
```python test
d = dags.get("pipeline_prod")
assert d is not None, "No encontré el DAG 'pipeline_prod'"
assert d.catchup is False and d.max_active_runs == 1, "Revisa catchup=False y max_active_runs=1"
assert str(d.schedule) == "0 4 * * *", "schedule debe ser '0 4 * * *'"
orden = ["esperar_archivo", "ingesta", "dbt_build", "notificar"]
for a, b in zip(orden, orden[1:]):
    assert d.get_task(a).downstream_task_ids == {b}, f"{a} debe ir justo antes que {b}"
assert all(t.retries == 2 for t in d.tasks), "Todas las tareas deben tener retries=2 (default_args)"
assert type(d.get_task("ingesta")).__name__ == "DatabricksRunNowOperator" and d.get_task("ingesta").job_id == 111
assert "dbt build" in d.get_task("dbt_build").bash_command
assert d.get_task("notificar").trigger_rule == "all_done"
assert "{{ ds_nodash }}" in d.get_task("esperar_archivo").filepath
```
:::
