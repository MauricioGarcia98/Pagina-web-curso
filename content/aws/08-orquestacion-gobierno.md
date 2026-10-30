---
titulo: Orquestación, gobierno y arquitectura de referencia
nivel: Experto
duracion: 55
resumen: Step Functions, MWAA (Airflow administrado) y EventBridge; Lake Formation para permisos finos; infraestructura como código; y una arquitectura completa de punta a punta para el caso del banco.
---

## Orquestar: quién decide qué corre y cuándo

Un pipeline real tiene varios pasos que dependen unos de otros: esperar el archivo → catalogarlo → transformarlo → validarlo → publicar la tabla gold → avisar. En AWS hay tres herramientas para coordinarlos:

| Herramienta | Qué es | Ideal para |
|---|---|---|
| **EventBridge** | Reglas que reaccionan a eventos o a horarios (cron) | "Cada día a las 3:00" o "cuando llegue un archivo", disparar algo |
| **Step Functions** | Máquinas de estado en JSON, sin servidor, integradas con casi todos los servicios de AWS | Flujos 100 % AWS (Glue, Athena, Lambda, EMR), con reintentos y ramas |
| **MWAA** | Apache Airflow administrado | Equipos que ya usan Airflow, muchos DAGs, dependencias fuera de AWS (dbt, Databricks, APIs) |

:::analogia El despertador, el guion y el director
**EventBridge** es el despertador: suena a una hora o cuando pasa algo. **Step Functions** es un guion detallado que AWS sigue paso a paso. **Airflow** es un director de orquesta con muchos músicos (de AWS y de afuera) y una partitura en Python.
:::

## Step Functions: el flujo como una máquina de estados

Se define en **ASL** (*Amazon States Language*), un JSON con estados. Cada estado `Task` llama a un servicio; `.sync` significa "espera a que termine".

```json
{
  "Comment": "Pipeline diario del banco",
  "StartAt": "SilverTransacciones",
  "States": {
    "SilverTransacciones": {
      "Type": "Task",
      "Resource": "arn:aws:states:::glue:startJobRun.sync",
      "Parameters": { "JobName": "banco-silver", "Arguments": { "--fecha.$": "$.fecha" } },
      "Retry": [ { "ErrorEquals": ["States.ALL"], "IntervalSeconds": 60, "MaxAttempts": 2, "BackoffRate": 2 } ],
      "Catch": [ { "ErrorEquals": ["States.ALL"], "Next": "AvisarFalla" } ],
      "Next": "GoldFraude"
    },
    "GoldFraude": {
      "Type": "Task",
      "Resource": "arn:aws:states:::athena:startQueryExecution.sync",
      "Parameters": { "QueryString": "INSERT INTO gold.alertas SELECT ...", "WorkGroup": "primary" },
      "Catch": [ { "ErrorEquals": ["States.ALL"], "Next": "AvisarFalla" } ],
      "End": true
    },
    "AvisarFalla": {
      "Type": "Task",
      "Resource": "arn:aws:states:::sns:publish",
      "Parameters": { "TopicArn": "arn:aws:sns:us-east-1:123456789012:alertas-datos", "Message": "Falló el pipeline del banco" },
      "Next": "Fallo"
    },
    "Fallo": { "Type": "Fail" }
  }
}
```

- **Retry**: reintenta ante errores transitorios, con espera creciente (*backoff*).
- **Catch**: si se agotan los reintentos, va a otro estado (avisar) en lugar de morir en silencio.
- Otros estados útiles: `Choice` (if), `Parallel` (ramas simultáneas), `Map` (un paso por cada elemento de una lista), `Wait`.

```bash norun
aws stepfunctions create-state-machine --name pipeline-banco \
  --definition file://pipeline-banco.json \
  --role-arn arn:aws:iam::123456789012:role/StepFunctionsDatos
aws stepfunctions start-execution \
  --state-machine-arn arn:aws:states:us-east-1:123456789012:stateMachine:pipeline-banco \
  --input '{"fecha": "2024-12-31"}'
```

```recorrido
titulo: Una ejecución de la máquina de estados, con un error en el camino
estacion inicio: start-execution | icono=terminal
estacion silver: SilverTransacciones | icono=chispa
estacion retry: Retry | icono=reloj
estacion gold: GoldFraude | icono=dashboard
estacion catch: Catch | icono=alerta
paso inicio: Arranca con un input
La ejecución recibe `{"fecha": "2024-12-31"}`. Ese JSON viaja de estado en estado: así el job sabe qué día procesar.
>>> json
{
  "executionArn": "arn:aws:states:us-east-1:123456789012:execution:pipeline-banco:58c4a024",
  "startDate": "2026-10-30T21:02:35Z"
}
paso silver: Primer estado: el job de Glue
`glue:startJobRun.sync` lanza el job y **espera** a que termine. `"--fecha.$": "$.fecha"` toma la fecha del input.
>>> log
SilverTransacciones  TaskStateEntered
SilverTransacciones  TaskFailed   (Glue: ConcurrentRunsExceededException)
paso retry: Un error transitorio: Retry
Falló porque había otra ejecución del mismo job. Es un error **pasajero**: `Retry` espera 60 s y lo vuelve a intentar (hasta 2 veces, con espera creciente).
>>> log
esperando 60 s (intento 1 de 2)…
SilverTransacciones  TaskSucceeded
paso gold: Siguiente estado: la consulta en Athena
Con silver listo, `GoldFraude` ejecuta el `INSERT` en Athena. Si sale bien, la ejecución termina en `SUCCEEDED`.
>>> log
GoldFraude  TaskSucceeded
Ejecución: SUCCEEDED
paso catch: Si los reintentos se agotan: Catch
Si el error persiste, `Catch` desvía a `AvisarFalla` (publica en SNS: correo o Slack) y termina en `Fail`. Nada falla en silencio.
>>> log
SilverTransacciones  TaskFailed (intento 3 de 3)
AvisarFalla         → SNS: "Falló el pipeline del banco"
Fallo               Ejecución: FAILED
```

### EventBridge: disparar con horario

```bash norun
aws events put-rule --name diario-banco --schedule-expression "cron(0 3 * * ? *)"     # 03:00 UTC todos los días
aws events put-targets --rule diario-banco \
  --targets 'Id=1,Arn=arn:aws:states:us-east-1:123456789012:stateMachine:pipeline-banco,RoleArn=arn:aws:iam::123456789012:role/EventBridgeDatos'
aws events list-rules --query "Rules[].{Nombre:Name, Horario:ScheduleExpression}" --output table
```

:::cuidado El cron de EventBridge tiene 6 campos
`cron(minutos horas día-del-mes mes día-de-la-semana año)`, y uno de los dos "día" debe ser `?`. Además, el horario es **UTC**: las 3:00 UTC son las 0:00 en Buenos Aires o São Paulo.
:::

## MWAA: Airflow en AWS

MWAA te da Airflow sin administrar servidores: subes tus DAGs a un bucket de S3 (`s3://…/dags/`) y aparecen en la interfaz. Al crear el entorno eliges la versión de Airflow; MWAA ya ofrece la línea 3 (3.0, 3.2 y 3.3), así que los DAGs se escriben con la sintaxis de Airflow 3 (`from airflow.sdk import ...`) que viste en el módulo de Airflow. Las dependencias de Python se declaran en un `requirements.txt` que debe incluir una línea `--constraint` con el archivo de restricciones de esa versión. El proveedor `apache-airflow-providers-amazon` trae operadores para cada servicio:

| Operador / sensor | Hace |
|---|---|
| `S3KeySensor` | Espera a que exista un archivo en S3 |
| `GlueCrawlerOperator` / `GlueJobOperator` | Ejecuta un crawler o un job de Glue y espera |
| `AthenaOperator` | Lanza una consulta de Athena |
| `EmrServerlessStartJobOperator` | Ejecuta Spark en EMR Serverless |
| `RedshiftDataOperator` | SQL en Redshift vía Data API |
| `LambdaInvokeFunctionOperator` | Invoca una Lambda |

```bash norun
aws s3 cp dags/pipeline_banco.py s3://mwaa-datos-dev/dags/
aws mwaa list-environments
```

:::ejercicio airflow titulo="DAG del banco en MWAA"
Crea el DAG `pipeline_banco` (diario, `schedule="@daily"`, `start_date` 2024-01-01, `catchup=False`) con este flujo:

1. `esperar_archivo`: `S3KeySensor` sobre `bucket_key="s3://lake-banco-dev/landing/transacciones/{{ ds }}.csv"`.
2. `catalogar`: `GlueCrawlerOperator` con `config={"Name": "crawler-banco"}`.
3. `silver`: `GlueJobOperator` con `job_name="banco-silver"`.
4. En paralelo después de `silver`: `gold_fraude` y `gold_mora`, dos `AthenaOperator` (con `query`, `database="lake_silver"` y `output_location="s3://lake-banco-dev/athena-results/"`).
5. `avisar`: un `EmptyOperator` que corre cuando **ambas** tareas gold terminan.
```python inicial
from datetime import datetime
from airflow.sdk import DAG
from airflow.providers.standard.operators.empty import EmptyOperator
from airflow.providers.amazon.aws.sensors.s3 import S3KeySensor
from airflow.providers.amazon.aws.operators.glue_crawler import GlueCrawlerOperator
from airflow.providers.amazon.aws.operators.glue import GlueJobOperator
from airflow.providers.amazon.aws.operators.athena import AthenaOperator
```
```python solucion
from datetime import datetime
from airflow.sdk import DAG
from airflow.providers.standard.operators.empty import EmptyOperator
from airflow.providers.amazon.aws.sensors.s3 import S3KeySensor
from airflow.providers.amazon.aws.operators.glue_crawler import GlueCrawlerOperator
from airflow.providers.amazon.aws.operators.glue import GlueJobOperator
from airflow.providers.amazon.aws.operators.athena import AthenaOperator

RESULTADOS = "s3://lake-banco-dev/athena-results/"

with DAG("pipeline_banco", schedule="@daily", start_date=datetime(2024, 1, 1), catchup=False) as dag:
    esperar = S3KeySensor(task_id="esperar_archivo",
                          bucket_key="s3://lake-banco-dev/landing/transacciones/{{ ds }}.csv",
                          poke_interval=300, timeout=6 * 3600, mode="reschedule")
    catalogar = GlueCrawlerOperator(task_id="catalogar", config={"Name": "crawler-banco"})
    silver = GlueJobOperator(task_id="silver", job_name="banco-silver",
                             script_args={"--fecha": "{{ ds }}"})
    fraude = AthenaOperator(task_id="gold_fraude", database="lake_silver", output_location=RESULTADOS,
                            query="INSERT INTO gold.alertas_fraude SELECT * FROM lake_silver.alertas WHERE fecha = '{{ ds }}'")
    mora = AthenaOperator(task_id="gold_mora", database="lake_silver", output_location=RESULTADOS,
                          query="INSERT INTO gold.mora_diaria SELECT * FROM lake_silver.cuotas_vencidas WHERE fecha = '{{ ds }}'")
    avisar = EmptyOperator(task_id="avisar")

    esperar >> catalogar >> silver >> [fraude, mora] >> avisar
```
```python test
d = dags.get("pipeline_banco")
assert d is not None, "No encontré el DAG 'pipeline_banco'"
assert d.catchup is False, "Usa catchup=False"
t = {x.task_id: x for x in d.tasks}
for n in ["esperar_archivo", "catalogar", "silver", "gold_fraude", "gold_mora", "avisar"]:
    assert n in t, f"Falta la tarea {n}"
assert type(t["esperar_archivo"]).__name__ == "S3KeySensor", "esperar_archivo debe ser un S3KeySensor"
assert "{{ ds }}" in t["esperar_archivo"].bucket_key, "El archivo a esperar debe depender de la fecha: usa {{ ds }} en bucket_key"
assert type(t["catalogar"]).__name__ == "GlueCrawlerOperator" and t["catalogar"].config.get("config", {}).get("Name") == "crawler-banco", "catalogar: GlueCrawlerOperator con config={'Name': 'crawler-banco'}"
assert type(t["silver"]).__name__ == "GlueJobOperator" and t["silver"].job_name == "banco-silver", "silver: GlueJobOperator con job_name='banco-silver'"
for n in ["gold_fraude", "gold_mora"]:
    assert type(t[n]).__name__ == "AthenaOperator", f"{n} debe ser un AthenaOperator"
    assert getattr(t[n], "output_location", "").startswith("s3://"), f"{n}: falta output_location"
assert t["esperar_archivo"].downstream_task_ids == {"catalogar"}, "esperar_archivo → catalogar"
assert t["catalogar"].downstream_task_ids == {"silver"}, "catalogar → silver"
assert t["silver"].downstream_task_ids == {"gold_fraude", "gold_mora"}, "silver debe abrir dos ramas: gold_fraude y gold_mora"
assert t["avisar"].upstream_task_ids == {"gold_fraude", "gold_mora"}, "avisar espera a las dos tareas gold"
run = d.test()
assert all(s == "success" for s in run.states.values()), f"Estados: {run.states}"
```
```pista
Las ramas paralelas se escriben con una lista: `silver >> [fraude, mora] >> avisar`.
```
:::

## Gobierno: Lake Formation y permisos finos

Con IAM das permisos sobre **rutas de S3**. Pero los analistas piensan en **tablas y columnas**: "Marketing puede ver `clientes` pero no la columna `email`". Para eso está **AWS Lake Formation**: permisos tipo base de datos (`SELECT`, `DESCRIBE`, `ALTER`) sobre bases, tablas, **columnas** y **filas** del Glue Data Catalog, que respetan Athena, Redshift Spectrum, Glue y EMR.

```bash norun
aws lakeformation grant-permissions \
  --principal DataLakePrincipalIdentifier=arn:aws:iam::123456789012:role/Analistas \
  --resource '{"TableWithColumns": {"DatabaseName": "lake_silver", "Name": "clientes", "ColumnNames": ["cliente_id", "pais", "segmento"]}}' \
  --permissions SELECT
aws lakeformation list-permissions
```

| Práctica de gobierno | Cómo en AWS |
|---|---|
| Permisos por tabla/columna/fila | Lake Formation (y *LF-Tags* para gobernar por etiquetas: `sensibilidad=alta`) |
| Datos personales (PII) | Detectarlos con Macie; enmascarar o separar columnas sensibles |
| Auditoría: quién hizo qué | CloudTrail |
| Linaje y catálogo de negocio | DataZone / SageMaker Catalog, OpenLineage desde Airflow o dbt |
| Calidad de datos | Glue Data Quality, tests de dbt, Great Expectations |
| Costos | Tags por equipo, AWS Budgets, workgroups de Athena |

## Infraestructura como código

Nada de crear recursos a mano en producción: todo va en código versionado en Git y se despliega con CI/CD.

| Herramienta | Lenguaje | Comentario |
|---|---|---|
| **Terraform** | HCL | La más usada y multi-nube (AWS, Azure, GCP, Databricks) |
| **CloudFormation** | YAML/JSON | La nativa de AWS |
| **CDK** | Python, TypeScript… | Genera CloudFormation desde código |

```hcl
# main.tf (Terraform)
resource "aws_s3_bucket" "lake" {
  bucket = "lake-banco-${var.entorno}"
  tags   = { proyecto = "banco", entorno = var.entorno }
}

resource "aws_glue_catalog_database" "silver" {
  name = "lake_silver"
}
```

```bash norun
terraform init && terraform plan -var entorno=dev && terraform apply -var entorno=dev
aws cloudformation deploy --template-file lake.yaml --stack-name lake-banco-dev --parameter-overrides Entorno=dev
```

## Arquitectura de referencia: el banco en AWS

```text
         ┌─────────────── tiempo real ───────────────┐
 app ──► Kinesis ──► Lambda (regla de ráfaga) ──► SNS alerta al analista de fraude
             └────► Firehose ──► s3://lake-banco/bronze/transacciones/fecha=…/ (Parquet)
 core bancario (Postgres) ──► DMS (CDC) ──► s3://lake-banco/bronze/cuentas, prestamos, cuotas
                                   │
               EventBridge 03:00 ─► Step Functions / MWAA
                                   ├─ Glue job: bronze → silver (Iceberg, dedup, tipos)
                                   ├─ Glue Data Quality: saldos no negativos, montos > 0
                                   ├─ dbt (dbt-athena): marts de mora, fraude y clientes
                                   └─ Redshift Serverless: tablas gold para los dashboards
 gobierno: Lake Formation (columnas PII ocultas), CloudTrail, Budgets · IaC: Terraform + GitHub Actions
```

:::experto Cómo contar esto en una entrevista
Recorre la arquitectura **de izquierda a derecha** y justifica cada decisión con un requisito: "Kinesis porque la alerta de fraude debe salir en segundos; Iceberg en silver porque las cuentas cambian y necesito `MERGE`; Redshift solo para la capa gold porque los dashboards consultan cientos de veces por día; Lake Formation porque riesgo puede ver montos pero no datos personales". Después menciona **fallas**: reintentos, idempotencia, alertas y cómo reprocesar un día.
:::

## Ejercicios

:::ejercicio python titulo="Máquina de estados como código"
Escribe `definicion(jobs)` que reciba una lista de nombres de jobs de Glue y devuelva un diccionario ASL donde:

- `StartAt` sea el primer job y cada job sea un estado `Task` con `Resource` `"arn:aws:states:::glue:startJobRun.sync"` y `Parameters` `{"JobName": <nombre>}`.
- Cada estado tenga `Next` apuntando al siguiente job, y el último tenga `"End": True`.
- Cada estado tenga un `Catch` con `[{"ErrorEquals": ["States.ALL"], "Next": "AvisarFalla"}]`.
- Exista además el estado `"AvisarFalla"` de tipo `"Fail"`.
```python inicial
def definicion(jobs):
    pass

import json
print(json.dumps(definicion(["banco-silver", "banco-gold"]), indent=2))
```
```python solucion
def definicion(jobs):
    estados = {}
    for i, job in enumerate(jobs):
        e = {
            "Type": "Task",
            "Resource": "arn:aws:states:::glue:startJobRun.sync",
            "Parameters": {"JobName": job},
            "Catch": [{"ErrorEquals": ["States.ALL"], "Next": "AvisarFalla"}],
        }
        if i + 1 < len(jobs):
            e["Next"] = jobs[i + 1]
        else:
            e["End"] = True
        estados[job] = e
    estados["AvisarFalla"] = {"Type": "Fail"}
    return {"StartAt": jobs[0], "States": estados}

import json
print(json.dumps(definicion(["banco-silver", "banco-gold"]), indent=2))
```
```python test
d = definicion(["a", "b", "c"])
assert d["StartAt"] == "a", "StartAt debe ser el primer job"
S = d["States"]
assert set(S) == {"a", "b", "c", "AvisarFalla"}, f"Estados: {set(S)}"
assert S["a"]["Next"] == "b" and S["b"]["Next"] == "c", "Cada job apunta al siguiente con Next"
assert S["c"].get("End") is True and "Next" not in S["c"], "El último estado termina con End: True (y sin Next)"
assert all(S[j]["Type"] == "Task" and S[j]["Resource"] == "arn:aws:states:::glue:startJobRun.sync" for j in "abc"), "Cada job es un Task de Glue (.sync)"
assert S["b"]["Parameters"] == {"JobName": "b"}, "Parameters debe ser {'JobName': nombre}"
assert all(S[j]["Catch"] == [{"ErrorEquals": ["States.ALL"], "Next": "AvisarFalla"}] for j in "abc"), "Falta el Catch hacia AvisarFalla"
assert S["AvisarFalla"] == {"Type": "Fail"}, "AvisarFalla debe ser un estado Fail"
uno = definicion(["solo"])
assert uno["States"]["solo"].get("End") is True, "Con un solo job, ese job termina el flujo"
```
:::

:::ejercicio cli
Crea una regla de EventBridge llamada `diario-banco` que se dispare todos los días a las **03:00 UTC**.
```respuesta
todos: aws events put-rule || --name diario-banco || --schedule-expression ['"]cron\(0 3 \* \* \? \*\)['"]
```
```solucion
aws events put-rule --name diario-banco --schedule-expression "cron(0 3 * * ? *)"
```
:::

:::ejercicio cli
Inicia una ejecución de la máquina de estados `pipeline-diario` (ARN `arn:aws:states:us-east-1:123456789012:stateMachine:pipeline-diario`) con la entrada `{"fecha": "2024-12-31"}`.
```respuesta
todos: aws stepfunctions start-execution || --state-machine-arn arn:aws:states:us-east-1:123456789012:stateMachine:pipeline-diario || --input '\{\s*"fecha"\s*:\s*"2024-12-31"\s*\}'
```
```solucion
aws stepfunctions start-execution --state-machine-arn arn:aws:states:us-east-1:123456789012:stateMachine:pipeline-diario --input '{"fecha": "2024-12-31"}'
```
:::

:::ejercicio cli
Con Lake Formation, da permiso `SELECT` sobre la tabla `clientes` de la base `lake_silver` al rol `arn:aws:iam::123456789012:role/Analistas`.
```respuesta
todos: aws lakeformation grant-permissions || --principal ['"]?DataLakePrincipalIdentifier=arn:aws:iam::123456789012:role/Analistas['"]? || --resource '.*"DatabaseName"\s*:\s*"lake_silver".*"Name"\s*:\s*"clientes".*' || --permissions SELECT
```
```solucion
aws lakeformation grant-permissions --principal DataLakePrincipalIdentifier=arn:aws:iam::123456789012:role/Analistas --resource '{"Table": {"DatabaseName": "lake_silver", "Name": "clientes"}}' --permissions SELECT
```
:::

:::ejercicio quiz
Tu pipeline usa Glue, Athena, dbt Cloud, una API de un proveedor y un job de Databricks. El equipo ya escribe DAGs en Python. ¿Qué orquestador eliges?

- [ ] EventBridge solo
- [ ] Step Functions, porque es más barato
- [x] MWAA (Airflow): tiene operadores para AWS **y** para herramientas de afuera, y el equipo ya lo conoce
- [ ] Ninguno, cron en una EC2
:::

:::ejercicio quiz
Marketing debe consultar la tabla `clientes` en Athena **sin ver** `email` ni `telefono`. ¿Cuál es la forma correcta?

- [ ] Copiar la tabla sin esas columnas a otro bucket cada noche
- [x] Lake Formation: permiso `SELECT` solo sobre las columnas permitidas (o con LF-Tags de sensibilidad)
- [ ] Pedirles que no las miren
- [ ] Una política de IAM sobre el prefijo de S3
:::

:::ejercicio abierto titulo="Diseña la arquitectura de Cóndor Air"
La aerolínea ✈️ del caso de negocio quiere: (1) un tablero de puntualidad que se actualice **cada 5 minutos** durante el día, (2) el reporte diario de ocupación e ingresos por ruta, y (3) que el equipo comercial **no** vea los datos personales de los pasajeros. Describe qué servicios de AWS usarías para ingesta, almacenamiento, proceso, consumo, orquestación y gobierno, y **por qué** cada uno.
```solucion
Ingesta: los eventos de despegue/aterrizaje llegan a Kinesis Data Streams (latencia de segundos); Firehose los escribe cada minuto en S3 bronze en Parquet. Las reservas salen de la base transaccional con DMS (CDC).
Almacenamiento: S3 con capas bronze/silver/gold; silver en Iceberg (las reservas cambian de estado y necesito MERGE), particionado por fecha.
Proceso: Glue (o EMR Serverless) para bronze → silver cada noche; dbt sobre Athena para los marts de ocupación e ingresos; para el tablero de 5 minutos, una vista materializada en Redshift Serverless que se refresca desde el stream (streaming ingestion) o una Lambda que actualiza la tabla de vuelos del día.
Consumo: QuickSight (o la herramienta de BI de la empresa) sobre Redshift para el tablero en vivo; Athena para análisis ad hoc.
Orquestación: EventBridge dispara a las 02:00 UTC un flujo de MWAA (Glue → dbt build → tests → refresco de gold → aviso en Slack/SNS); reintentos y alertas en cada paso.
Gobierno: Lake Formation con LF-Tags (pii=si) para ocultar nombre, documento y email al rol Comercial; CloudTrail para auditoría; Budgets y workgroups de Athena para costos; todo creado con Terraform desde GitHub Actions.
```
:::
