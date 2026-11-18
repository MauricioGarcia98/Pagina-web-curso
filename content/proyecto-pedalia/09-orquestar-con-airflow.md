---
titulo: Orquestar con Airflow - un DAG que mueve cuatro herramientas
nivel: Intermedio
duracion: 55
resumen: Escribes el DAG pedalia_diario que todas las mañanas dispara la ingesta en Data Factory, el job de Databricks y las cargas de Snowflake y BigQuery, en ese orden. Creas las conexiones, lo despliegas con un pull request (el CI lo copia a Airflow), lo ejecutas para un día concreto y aprendes a leer qué pasó cuando algo falla.
objetivos: Crear conexiones de Airflow para servicios externos sin escribir secretos en el código | Encadenar operadores de proveedores (Data Factory, Databricks, SQL, BigQuery) | Usar la fecha lógica ({{ ds }}) para que cada corrida procese su día | Desplegar el DAG con CI y diagnosticar una falla siguiendo los logs
prerrequisitos: proyecto-pedalia-snowflake-y-bigquery | interfaces-airflow-por-dentro
autoevaluacion: ¿Sabes qué conexión necesita cada tarea? | ¿Sabes qué valor tiene {{ ds }} en la corrida de las 7:00 del 10 de noviembre? | ¿Sabes qué estado quedan las tareas posteriores a una que falla? | ¿Sabes dónde está el detalle del error cuando falla la tarea de Databricks?
---

:::escenario Jueves, 9:00
Hasta ahora corriste cada paso a mano, en orden. Funciona, pero depende de que tú te acuerdes, a la hora correcta y sin saltearte nada. El objetivo de hoy: que a las 7:00 todo corra solo y que, si algo falla, quede claro qué y dónde.
:::

:::analogia El director de orquesta
El director no toca ningún instrumento. Marca cuándo entra cada uno, escucha que todo suene y, si un músico se pierde, detiene la pieza antes de que el error se contagie. Airflow es eso: no copia archivos ni calcula ingresos; dice "ahora Data Factory, después Databricks" y no deja seguir si algo salió mal.
:::

## 1. Las conexiones

Cada tarea habla con un servicio distinto. Las credenciales viven en **conexiones** de Airflow (en producción, en un gestor de secretos como Key Vault), nunca en el DAG. En la terminal:

```bash
airflow connections add azure_data_factory_default --conn-type azure_data_factory \
  --conn-extra '{"resource_group_name": "rg-pedalia-dev", "factory_name": "adf-pedalia-dev"}'
airflow connections add databricks_default --conn-type databricks \
  --conn-host https://adb-1234567890123456.7.azuredatabricks.net
airflow connections add snowflake_default --conn-type snowflake \
  --conn-extra '{"account": "practica01", "warehouse": "COMPUTE_WH", "database": "PEDALIA", "schema": "FINANZAS", "role": "SYSADMIN"}'
airflow connections add google_cloud_default --conn-type google_cloud_platform \
  --conn-extra '{"project": "tienda-andina-dev"}'
airflow connections list
```

También puedes crearlas en [Airflow](#/airflow) → **Admin → Connections**.

:::nota En una cuenta real
Cada conexión llevaría además su secreto: el *client secret* de una entidad de servicio de Azure para Data Factory, un token personal de Databricks, la clave privada de un usuario de servicio de Snowflake y el JSON de una cuenta de servicio de Google. Acá no hacen falta porque las herramientas son de práctica, pero el lugar donde irían es el mismo: la conexión, no el código.
:::

## 2. El DAG

```bash
cd ~/pedalia-datos
git checkout main && git pull
git checkout -b dag/pedalia-diario
cat > dags/pedalia_diario.py << 'EOF'
from datetime import datetime, timedelta

from airflow.sdk import DAG
from airflow.providers.microsoft.azure.operators.data_factory import AzureDataFactoryRunPipelineOperator
from airflow.providers.databricks.operators.databricks import DatabricksRunNowOperator
from airflow.providers.common.sql.operators.sql import SQLExecuteQueryOperator
from airflow.providers.google.cloud.operators.bigquery import BigQueryInsertJobOperator

default_args = {"retries": 1, "retry_delay": timedelta(minutes=5)}

with DAG(
    "pedalia_diario",
    start_date=datetime(2026, 11, 9),
    schedule="0 7 * * *",
    catchup=False,
    default_args=default_args,
    tags=["pedalia"],
    doc_md="Ingesta de la app de Pedalia → Databricks → Snowflake (finanzas) y BigQuery (marketing).",
):
    ingesta = AzureDataFactoryRunPipelineOperator(
        task_id="ingesta_adf",
        pipeline_name="pl_ingesta_pedalia",
        parameters={"fecha": "{{ ds }}"},
    )

    transformar = DatabricksRunNowOperator(
        task_id="transformar_databricks",
        job_name="pedalia_transformar",
    )

    finanzas = SQLExecuteQueryOperator(
        task_id="cargar_snowflake",
        conn_id="snowflake_default",
        sql=[
            "TRUNCATE TABLE INGRESOS_DIARIOS",
            "COPY INTO INGRESOS_DIARIOS FROM @LAGO_GOLD/ingresos_diarios/ "
            "FILE_FORMAT = (TYPE = CSV SKIP_HEADER = 1) FORCE = TRUE",
        ],
    )

    marketing = BigQueryInsertJobOperator(
        task_id="cargar_bigquery",
        configuration={
            "query": {
                "query": "LOAD DATA OVERWRITE pedalia_mkt.uso_por_barrio FROM FILES ("
                         "format = 'CSV', skip_leading_rows = 1, "
                         "uris = ['azure://stpedaliadev.blob.core.windows.net/gold/uso_por_barrio/*.csv']) "
                         "WITH CONNECTION `azure-eastus2.lago_pedalia`",
                "useLegacySql": False,
            }
        },
    )

    ingesta >> transformar >> [finanzas, marketing]
EOF
```

Fíjate en tres decisiones:

- **`{{ ds }}`** es la **fecha lógica** de la corrida, no la fecha de hoy. Con `schedule="0 7 * * *"`, la corrida que arranca el 10/11 a las 7:00 tiene `ds = 2026-11-09`: procesa el día que **terminó**. Si mañana re-ejecutas la corrida del 9, vuelve a procesar el 9, no "hoy".
- **`retries: 1`**: un fallo pasajero (la red, un servicio lento) se reintenta solo una vez antes de marcar la tarea en rojo.
- **`[finanzas, marketing]`** corren en paralelo, las dos después de la transformación. Si una falla, la otra igual termina.

## 3. Desplegar con un pull request

```bash
git add dags/pedalia_diario.py
git commit -m "DAG diario de Pedalia: ADF → Databricks → Snowflake y BigQuery"
git push -u origin dag/pedalia-diario
```

Abre el PR. El job `validar` revisa que el DAG compile. Al fusionarlo, `desplegar` lo copia a Airflow: en unos segundos el DAG actualizado aparece en [Airflow](#/airflow) con sus cuatro tareas en el **Graph**.

## 4. Ejecutarlo para un día concreto

Primero pruébalo completo para el 9 de noviembre, sin esperar al horario:

```bash
airflow dags test pedalia_diario 2026-11-09
```

O en la interfaz: el DAG → **Trigger** con fecha lógica `2026-11-09`. Mira cada tarea:

- `ingesta_adf`: el log muestra el **run ID** del pipeline. Búscalo en Data Factory → **Monitor**: es la misma corrida.
- `transformar_databricks`: el log tiene el enlace a la corrida del job en Databricks.
- `cargar_snowflake`: cada sentencia con su **query id**. En Snowflake → **Query History** aparecen ejecutadas.
- `cargar_bigquery`: el **id del job de carga**, que puedes buscar en el historial de BigQuery.

## 5. Cuando algo falla

Provoca una falla a propósito: en Data Factory, cambia el comodín del pipeline a `@concat(pipeline().parameters.fecha, '/viajes_X*.csv')`, **publica** y vuelve a ejecutar el DAG.

- `ingesta_adf` queda en rojo (**failed**). El log dice *UserErrorSourceBlobNotExist* y te manda a **Monitor**.
- `transformar_databricks`, `cargar_snowflake` y `cargar_bigquery` quedan **upstream_failed**: ni siquiera arrancan. Eso es lo que quieres: es mejor no publicar nada que publicar números de ayer como si fueran de hoy.

Arréglalo (vuelve al comodín correcto, publica) y usa **Clear** sobre la tarea fallida: Airflow la vuelve a ejecutar junto con las que dependían de ella.

:::errores
- **Usar `datetime.now()` en vez de `{{ ds }}`**: al re-ejecutar un día viejo, procesa el de hoy. La fecha lógica hace que cada corrida sea repetible.
- **Credenciales en el DAG**: el archivo está en el repositorio y en el servidor; cualquiera que lo lea tiene acceso. Van en las conexiones.
- **Buscar el error solo en Airflow**: el log de Airflow dice **qué** tarea falló y te da el identificador; el **por qué** está en la herramienta que hizo el trabajo (Monitor de Data Factory, la corrida del job en Databricks, Query History en Snowflake).
- **Re-ejecutar todo el DAG desde cero** después de un arreglo: con **Clear** sobre la tarea que falló se retoma desde ahí, sin repetir lo que ya salió bien.
:::

## Ejercicios

:::ejercicio quiz
El DAG tiene `schedule="0 7 * * *"`. ¿Qué valor tiene `{{ ds }}` en la corrida que empieza el 10 de noviembre a las 7:00?
- [ ] 2026-11-10, el día en que corre
- [x] 2026-11-09, el día que terminó (el intervalo que procesa la corrida)
- [ ] La fecha y hora exacta de inicio
- [ ] La fecha del último commit del DAG
:::

:::ejercicio quiz
`ingesta_adf` falla. ¿En qué estado quedan las tres tareas siguientes?
- [ ] success, porque no tienen errores propios
- [ ] failed, con el mismo error
- [x] upstream_failed: no se ejecutan porque falló algo de lo que dependen
- [ ] skipped, y se ejecutan mañana
:::

:::ejercicio quiz
`transformar_databricks` está en rojo. El log de Airflow dice `result_state: FAILED`. ¿Dónde está el detalle?
- [ ] En Admin → Variables de Airflow
- [ ] En el workflow de GitHub Actions
- [x] En Databricks: la corrida del job que disparó Airflow, en la tarea que falló
- [ ] En el Monitor de Data Factory
:::

## Resumen

- Airflow **ordena y vigila**; cada herramienta hace su trabajo y deja su propio registro.
- Las credenciales van en **conexiones**, no en el DAG.
- `{{ ds }}` hace que cada corrida procese **su** día y se pueda repetir.
- Si una tarea falla, las siguientes quedan **upstream_failed**; el detalle del error está en la herramienta que hizo el trabajo.
