---
titulo: Composer, Dataform, gobierno y arquitectura de referencia
nivel: Experto
duracion: 55
resumen: Cloud Composer (Airflow administrado) con operadores de Google, Dataform para SQL versionado en BigQuery, Workflows y Scheduler, gobierno con Dataplex y policy tags, y una arquitectura completa para el caso de streaming.
---

## Cloud Composer: Airflow en Google Cloud

**Composer** es Apache Airflow administrado. Tus DAGs viven en un bucket de GCS (`gs://<bucket-del-entorno>/dags/`) y el entorno los carga solo. El proveedor `apache-airflow-providers-google` trae operadores para todo GCP:

| Operador / sensor | Hace |
|---|---|
| `GCSObjectExistenceSensor` | Espera un archivo en GCS |
| `GCSToBigQueryOperator` | Carga archivos de GCS a una tabla |
| `BigQueryInsertJobOperator` | Ejecuta SQL en BigQuery (CTAS, MERGE, DML) |
| `BigQueryCheckOperator` | Falla si una consulta devuelve 0 o falso: un test de calidad |
| `DataprocSubmitJobOperator` / `DataprocCreateBatchOperator` | Spark en Dataproc |
| `DataflowStartFlexTemplateOperator` | Lanza un pipeline de Dataflow |
| `DataformCreateWorkflowInvocationOperator` | Ejecuta un proyecto de Dataform |

```bash norun
gcloud composer environments list --locations us-central1
gcloud composer environments storage dags import --environment airflow-datos --location us-central1 --source dags/pipeline_streaming.py
gcloud composer environments run airflow-datos --location us-central1 dags list
```

:::ejercicio airflow titulo="DAG de Composer para el caso streaming"
Crea el DAG `streaming_diario` (`schedule="@daily"`, `start_date` 2024-01-01, `catchup=False`) con:

1. `esperar_archivo`: `GCSObjectExistenceSensor` con `bucket="lake-streaming-dev"` y `object="landing/reproducciones/{{ ds }}.csv"`.
2. `cargar`: `GCSToBigQueryOperator` con `bucket="lake-streaming-dev"`, `source_objects=["landing/reproducciones/{{ ds }}.csv"]`, `destination_project_dataset_table="academia-datos-dev.streaming_bronze.reproducciones${{ ds_nodash }}"`, `skip_leading_rows=1` y `write_disposition="WRITE_TRUNCATE"`.
3. `silver`: `BigQueryInsertJobOperator` con `configuration={"query": {"query": "...", "useLegacySql": False}}`.
4. `validar`: `BigQueryCheckOperator` con `sql` (cualquier `SELECT COUNT(*) > 0 …`) y `use_legacy_sql=False`.

Encadénalas en ese orden.
```python inicial
from datetime import datetime
from airflow import DAG
from airflow.providers.google.cloud.sensors.gcs import GCSObjectExistenceSensor
from airflow.providers.google.cloud.transfers.gcs_to_bigquery import GCSToBigQueryOperator
from airflow.providers.google.cloud.operators.bigquery import BigQueryInsertJobOperator, BigQueryCheckOperator
```
```python solucion
from datetime import datetime
from airflow import DAG
from airflow.providers.google.cloud.sensors.gcs import GCSObjectExistenceSensor
from airflow.providers.google.cloud.transfers.gcs_to_bigquery import GCSToBigQueryOperator
from airflow.providers.google.cloud.operators.bigquery import BigQueryInsertJobOperator, BigQueryCheckOperator

ARCHIVO = "landing/reproducciones/{{ ds }}.csv"

with DAG("streaming_diario", schedule="@daily", start_date=datetime(2024, 1, 1), catchup=False) as dag:
    esperar = GCSObjectExistenceSensor(task_id="esperar_archivo", bucket="lake-streaming-dev", object=ARCHIVO,
                                       mode="reschedule", poke_interval=300)
    cargar = GCSToBigQueryOperator(
        task_id="cargar", bucket="lake-streaming-dev", source_objects=[ARCHIVO],
        destination_project_dataset_table="academia-datos-dev.streaming_bronze.reproducciones${{ ds_nodash }}",
        skip_leading_rows=1, write_disposition="WRITE_TRUNCATE")
    silver = BigQueryInsertJobOperator(task_id="silver", configuration={"query": {
        "query": "MERGE streaming_silver.reproducciones t USING streaming_bronze.reproducciones s "
                 "ON t.repro_id = s.repro_id WHEN NOT MATCHED THEN INSERT ROW",
        "useLegacySql": False}})
    validar = BigQueryCheckOperator(task_id="validar", use_legacy_sql=False,
                                    sql="SELECT COUNT(*) > 0 FROM streaming_silver.reproducciones WHERE DATE(fecha_hora) = '{{ ds }}'")

    esperar >> cargar >> silver >> validar
```
```python test
d = dags.get("streaming_diario")
assert d is not None, "No encontré el DAG 'streaming_diario'"
assert d.catchup is False, "Usa catchup=False"
t = {x.task_id: x for x in d.tasks}
tipos = {"esperar_archivo": "GCSObjectExistenceSensor", "cargar": "GCSToBigQueryOperator", "silver": "BigQueryInsertJobOperator", "validar": "BigQueryCheckOperator"}
for n, tipo in tipos.items():
    assert n in t, f"Falta la tarea {n}"
    assert type(t[n]).__name__ == tipo, f"{n} debe ser {tipo}"
assert "{{ ds }}" in t["esperar_archivo"].object, "El objeto a esperar debe depender de la fecha ({{ ds }})"
assert t["cargar"].skip_leading_rows == 1 and t["cargar"].write_disposition == "WRITE_TRUNCATE", "cargar: skip_leading_rows=1 y WRITE_TRUNCATE (idempotente)"
assert "$" in t["cargar"].destination_project_dataset_table, "Carga en la partición del día con el decorador $YYYYMMDD ({{ ds_nodash }})"
assert t["silver"].configuration["query"]["useLegacySql"] is False, "silver: useLegacySql False"
assert t["esperar_archivo"].downstream_task_ids == {"cargar"} and t["cargar"].downstream_task_ids == {"silver"} and t["silver"].downstream_task_ids == {"validar"}, "El orden es esperar_archivo → cargar → silver → validar"
run = d.test()
assert all(s == "success" for s in run.states.values()), f"Estados: {run.states}"
```
```pista
`tabla$20241231` apunta a una **partición** concreta: con `WRITE_TRUNCATE` reemplazas solo ese día. Así, si el DAG se re-ejecuta, no duplica datos (idempotencia).
```
:::

## Dataform: SQL versionado dentro de BigQuery

**Dataform** es la herramienta de Google para lo mismo que hace dbt: modelos SQL con dependencias, tests (*assertions*), documentación y Git. Los archivos son `.sqlx`:

```sql norun
-- definitions/gold/ingresos_mensuales.sqlx
config {
  type: "incremental",
  schema: "streaming_gold",
  uniqueKey: ["mes"],
  bigquery: { partitionBy: "mes" },
  assertions: { nonNull: ["mes", "mrr"], uniqueKey: ["mes"] }
}

SELECT DATE_TRUNC(fecha, MONTH) AS mes, SUM(precio_mensual) AS mrr
FROM ${ref("stg_suscripciones")}
${when(incremental(), `WHERE fecha > (SELECT MAX(mes) FROM ${self()})`)}
GROUP BY 1
```

| dbt | Dataform |
|---|---|
| `{{ ref('modelo') }}` | `${ref("modelo")}` |
| `{{ config(materialized='incremental') }}` | `config { type: "incremental" }` |
| `is_incremental()` | `incremental()` |
| `{{ this }}` | `${self()}` |
| tests en `schema.yml` | `assertions` en el `config` |
| Jinja + macros | JavaScript (`includes/*.js`) |

:::tip dbt también funciona perfecto en BigQuery
Si ya sabes dbt (lo viste en su módulo), `dbt-bigquery` es igual de válido. Dataform tiene la ventaja de estar integrado en la consola de BigQuery sin infraestructura extra; dbt tiene un ecosistema y una comunidad más grandes.
:::

## Workflows y Scheduler

Para flujos chicos sin Airflow: **Cloud Scheduler** (cron administrado) dispara **Workflows** (pasos en YAML que llaman APIs de Google: ejecutar una consulta, lanzar un batch de Dataproc, esperar). Es el equivalente a EventBridge + Step Functions.

## Gobierno de datos

| Necesidad | En Google Cloud |
|---|---|
| Ocultar columnas sensibles (email, DNI) | **Policy tags** de BigQuery (*column-level security*) y *data masking* |
| Que cada país vea solo sus filas | **Row-level access policies** |
| Catálogo, linaje y calidad | **Dataplex** (catálogo universal, *data quality scans*, linaje automático de BigQuery) |
| Auditoría | Cloud Audit Logs + `INFORMATION_SCHEMA.JOBS` |
| Perímetro contra fugas | VPC Service Controls |
| Costos | Cuotas por usuario, `maximum_bytes_billed`, *editions* con reservas, presupuestos |

```sql norun
CREATE ROW ACCESS POLICY solo_chile ON streaming_silver.usuarios
GRANT TO ("group:analistas-cl@empresa.com")
FILTER USING (pais = 'Chile');
```

## Arquitectura de referencia: el caso streaming en GCP

```text
 app/players ──► Pub/Sub "reproducciones" ──► suscripción BigQuery ──► streaming_bronze.reproducciones (particionada por día)
                          └──────────────► Dataflow (ventanas de 1 min: top canciones en vivo) ──► Bigtable/BigQuery ──► pantalla en vivo
 base de suscripciones (Cloud SQL) ──► Datastream (CDC) ──► streaming_bronze.suscripciones
 Composer 03:00 ──► Dataform: silver (dedup, tipos) ──► gold (MAU, churn, MRR, skip rate) ──► assertions ──► Looker
 gobierno: policy tags en email/edad, row-level por país, Dataplex (calidad + linaje) · IaC: Terraform + Cloud Build
```

## Ejercicios

:::ejercicio dbt titulo="Modelo para BigQuery con dbt: MRR por plan"
Escribe el modelo dbt `mrr_por_plan` (como lo correrías con `dbt-bigquery`): a partir de `ref('streaming_suscripciones')`, para las suscripciones **activas** al `2024-12-31` (iniciadas en esa fecha o antes, y sin `fecha_fin` o con `fecha_fin` posterior), devuelve por `plan`: `suscriptores` y `mrr` (suma de `precio_mensual`, redondeada a 2).
```sql inicial
select
    plan
    -- ...
from {{ ref('streaming_suscripciones') }}
```
```sql solucion
select
    plan,
    count(*) as suscriptores,
    round(sum(precio_mensual), 2) as mrr
from {{ ref('streaming_suscripciones') }}
where fecha_inicio <= '2024-12-31'
  and (fecha_fin is null or fecha_fin > '2024-12-31')
group by plan
```
:::

:::ejercicio cli
Importa el DAG `dags/etl_ventas.py` al entorno de Composer `airflow-datos` de la región `us-central1`.
```respuesta
todos: gcloud composer environments storage dags import || --environment[= ]airflow-datos || --location[= ]us-central1 || --source[= ](\./)?dags/etl_ventas\.py
```
```solucion
gcloud composer environments storage dags import --environment airflow-datos --location us-central1 --source dags/etl_ventas.py
```
:::

:::ejercicio quiz
En Dataform, ¿qué equivale a `{{ ref('stg_pedidos') }}` de dbt?

- [ ] `@ref(stg_pedidos)`
- [x] `${ref("stg_pedidos")}`
- [ ] `{% ref stg_pedidos %}`
- [ ] `ref:stg_pedidos`
:::

:::ejercicio quiz
Marketing debe ver la tabla `usuarios` pero **no** la columna `email`, y el equipo de Chile solo filas de Chile. ¿Qué usas en BigQuery?

- [ ] Copias de la tabla para cada equipo
- [x] Policy tags (seguridad por columna) para `email` y una row access policy filtrando por `pais`
- [ ] Un bucket distinto por país
- [ ] Vistas con `SELECT *`
:::

:::ejercicio abierto titulo="Diseña la plataforma de datos de la clínica en GCP"
La clínica 🏥 quiere: (1) un tablero diario de ocupación de agenda y ausentismo por especialidad, (2) alertas en el día cuando un médico supera el 30 % de ausentismo, y (3) cumplir con la privacidad de datos de salud. Propón la arquitectura en Google Cloud (ingesta, almacenamiento, transformación, orquestación, consumo y gobierno) y justifica cada elección.
```solucion
Ingesta: la agenda vive en una base transaccional (Cloud SQL Postgres) → Datastream la replica con CDC a BigQuery (clinica_bronze) en minutos. Las facturas llegan como archivos a GCS → GCSToBigQueryOperator.
Almacenamiento: BigQuery en la región del país (por ley de datos de salud), datasets bronze/silver/gold; tablas particionadas por fecha del turno y clusterizadas por medico_id.
Transformación: Dataform (o dbt-bigquery) para silver (dedup del CDC, tipos, estados normalizados) y gold (ocupación, ausentismo por especialidad y médico), con assertions de calidad.
Alertas: una consulta programada cada hora (o un paso de Composer) que calcula ausentismo del día por médico y, si supera 30 %, publica en Pub/Sub → Cloud Run envía el aviso por email/Chat.
Orquestación: Composer diario 03:00 (CDC ya cargado → Dataform → checks → refresco del tablero); reintentos y alertas de falla.
Consumo: Looker / Looker Studio sobre las tablas gold.
Gobierno: policy tags y data masking en nombre, DNI, diagnóstico y fecha de nacimiento; row-level security por sede; IAM con grupos y cuentas de servicio por proceso; CMEK y VPC Service Controls; Dataplex para catálogo, linaje y calidad; Audit Logs; todo en Terraform.
```
:::
