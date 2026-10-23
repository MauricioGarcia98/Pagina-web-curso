---
titulo: Airflow + Databricks + dbt: un pipeline real
nivel: Experto
duracion: 35
resumen: Orquestar jobs de Databricks y dbt desde Airflow, sensores, alertas y el diseño de un DAG de producción.
---

En la vida real, un DAG de Airflow rara vez procesa datos: **coordina** a otros sistemas. Este es un patrón muy común en empresas con Azure + Databricks + dbt.

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

:::tip Cosmos
El paquete **astronomer-cosmos** convierte un proyecto dbt en un TaskGroup de Airflow con **una tarea por modelo** (y sus tests), con reintentos y visibilidad individuales.
:::

## Alertas

```python norun
def avisar_falla(context):
    ti = context["task_instance"]
    enviar_a_teams(f"❌ Falló {ti.dag_id}.{ti.task_id} ({context['ds']}). Log: {ti.log_url}")

default_args = {"on_failure_callback": avisar_falla, "retries": 2}
```

## Diseño de un DAG de producción: checklist

- [ ] `start_date` fijo, `catchup` decidido a conciencia, `max_active_runs` si hay dependencia entre días.
- [ ] Reintentos con espera; timeouts (`execution_timeout`) para que nada quede colgado.
- [ ] Tareas idempotentes parametrizadas con `{{ ds }}` / data interval.
- [ ] El cómputo pesado en Databricks/dbt; Airflow solo coordina.
- [ ] Alertas al fallar; SLAs para lo crítico.
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
