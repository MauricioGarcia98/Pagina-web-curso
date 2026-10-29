---
titulo: DEA-C01 - Ingesta y transformación de datos en AWS
nivel: Avanzado
duracion: 75
resumen: El dominio más pesado del DEA-C01 (34 %) - ingesta por lotes y en streaming (Kinesis Data Streams, Firehose, MSK, DMS, AppFlow, DataSync), transformación con Glue, EMR, Lambda y Redshift, procesamiento asistido por LLM, orquestación con Step Functions, MWAA, EventBridge y Glue Workflows, y los principios de programación que pide el examen.
objetivos: Elegir el servicio de ingesta según volumen, latencia y origen | Distinguir Kinesis Data Streams, Firehose y MSK | Diseñar transformaciones con Glue, EMR o Lambda según el caso | Configurar cargas incrementales con job bookmarks y CDC con DMS | Orquestar pipelines con Step Functions, MWAA o EventBridge
prerrequisitos: cert-aws-mapa-certificaciones | aws-glue | aws-streaming-serverless
autoevaluacion: ¿Sabes cuándo usar Firehose y cuándo Kinesis Data Streams? | ¿Sabes cómo evitar que un job de Glue reprocese archivos? | ¿Sabes qué servicio replica una base con CDC? | ¿Sabes resolver un shard caliente? | ¿Sabes cuándo usar Step Functions y cuándo MWAA?
---

:::escenario
La empresa de logística de Tomás recibe tres tipos de datos: posiciones GPS de 4.000 camiones cada 5 segundos, una base Oracle de pedidos en su centro de datos y reportes diarios de Salesforce. Todo debe llegar a un lago en S3, limpio y en Parquet, y los paneles de seguimiento deben actualizarse en menos de un minuto. Este es el dominio 1 del DEA-C01: un tercio del examen.
:::

## La arquitectura de referencia

```diagrama
titulo: Ingesta y transformación en AWS
nodo gps: Camiones (GPS) | icono=camion | col=0 | fila=0 | sub=cada 5 s
nodo ora: Oracle on-premises | icono=oracle | col=0 | fila=1 | forma=cilindro
nodo sf: Salesforce | icono=salesforce | col=0 | fila=2
nodo kds: Kinesis Data Streams | icono=kinesis | col=1 | fila=0 | sub=shards | color=naranja
nodo dms: AWS DMS | icono=dms | col=1 | fila=1 | sub=carga completa + CDC | color=azul
nodo af: Amazon AppFlow | icono=appflow | col=1 | fila=2 | sub=SaaS sin código | color=violeta
nodo fh: Data Firehose | icono=firehose | col=2 | fila=0 | sub=buffer y Parquet | color=naranja
nodo raw: S3 bronze | icono=s3 | col=3 | fila=1 | forma=cilindro | color=verde
nodo glue: AWS Glue | icono=glue | col=4 | fila=1 | sub=Spark serverless | color=violeta
nodo sil: S3 silver (Iceberg) | icono=s3 | col=5 | fila=1 | forma=cilindro | color=verde
flecha gps -> kds
flecha kds -> fh
flecha fh -> raw
flecha ora -> dms
flecha dms -> raw
flecha sf -> af
flecha af -> raw
flecha raw -> glue
flecha glue -> sil
```

## Ingesta en streaming

### Kinesis Data Streams (KDS)

- Un stream se divide en **shards**. En modo **aprovisionado**, cada shard admite **1 MB/s o 1.000 registros/s de escritura** y **2 MB/s de lectura** compartidos entre consumidores. En modo **on-demand**, escala solo (conveniente si el tráfico es impredecible).
- Cada registro tiene una **clave de partición**: los registros con la misma clave van al mismo shard y **mantienen el orden**.
- **Retención**: 24 horas por defecto, ampliable hasta 365 días. Se puede **releer** (*replay*) desde una posición.
- **Fan-out mejorado** (*enhanced fan-out*): cada consumidor obtiene sus propios 2 MB/s por shard por push (HTTP/2), útil con muchos consumidores o baja latencia.
- Productores: SDK, **KPL** (agrega registros), Kinesis Agent. Consumidores: **KCL**, Lambda, Managed Service for Apache Flink, Firehose.

:::cuidado Shard caliente
Si la clave de partición es poco variada (por ejemplo, el país), casi todo va a un shard y aparece `ProvisionedThroughputExceededException`. La solución es una **clave de alta cardinalidad** (id del camión), dividir shards (*resharding*) o pasar a on-demand. Los productores deben reintentar con espera exponencial.
:::

### Amazon Data Firehose

El servicio de **entrega** administrado: no hay shards ni consumidores que programar.

- Destinos: **S3**, **Redshift** (vía S3 y `COPY`), **OpenSearch**, **Splunk**, **Apache Iceberg en S3**, HTTP y otros.
- **Buffer** por tamaño (1–128 MB) o tiempo (0–900 s): es **casi en tiempo real**, no instantáneo.
- **Conversión de formato** a Parquet u ORC usando un esquema del **Glue Data Catalog**, compresión, **particionado dinámico** por campos del registro y transformación con **Lambda**.

### Amazon MSK y Managed Service for Apache Flink

- **MSK** es Kafka administrado (también **MSK Serverless**). Se elige cuando ya existen productores o consumidores Kafka, o se necesita el ecosistema Kafka (Connect, Schema Registry).
- **Managed Service for Apache Flink** procesa streams con estado: ventanas, joins, detección de patrones, con semántica *exactly-once*.

| Necesidad | Servicio |
|---|---|
| Llevar eventos a S3 o Redshift sin escribir consumidores | **Firehose** |
| Varios consumidores, orden por clave, releer datos | **Kinesis Data Streams** |
| Migrar un Kafka existente sin reescribir aplicaciones | **MSK** |
| Agregaciones por ventana, alertas complejas sobre el stream | **Managed Service for Apache Flink** |
| Latencia de milisegundos y ordenamiento por shard | **KDS** (Firehose agrega segundos de buffer) |

## Ingesta por lotes y desde bases de datos

| Origen | Servicio | Detalle para el examen |
|---|---|---|
| Base relacional (Oracle, SQL Server, MySQL, PostgreSQL) | **AWS DMS** | Carga completa + **CDC** continuo; **SCT** convierte esquemas entre motores distintos |
| SaaS (Salesforce, SAP, Zendesk, Google Analytics) | **Amazon AppFlow** | Sin código, programado o por evento, filtros y mapeos |
| Archivos de un NAS o file server | **AWS DataSync** | Transferencia programada, incremental y verificada |
| Muchos terabytes sin red suficiente | **AWS Snowball** | Dispositivo físico |
| SFTP de un socio | **AWS Transfer Family** | SFTP/FTPS administrado sobre S3 |
| Base con CDC hacia Redshift sin pipelines | **Zero-ETL** | Aurora, RDS, DynamoDB → Redshift o SageMaker Lakehouse |
| Llamar una API o leer un archivo pequeño | **Lambda** | Máximo 15 minutos, 10 GB de memoria |

:::examen Zero-ETL
Si la pregunta pide analizar datos de Aurora o DynamoDB en Redshift "casi en tiempo real" y "sin construir ni mantener pipelines", la respuesta es una **integración zero-ETL**. Si dice "transformar durante la carga", no lo es.
:::

## Transformación

### AWS Glue

- **Glue ETL** ejecuta Spark (o Python shell) **serverless**, medido en **DPU**. Tipos de worker G.1X, G.2X, G.4X… y **Flex** (más barato, para jobs no urgentes). **Auto scaling** ajusta los workers.
- **DynamicFrame**: como un DataFrame pero tolera esquemas inconsistentes; `resolveChoice` resuelve columnas con tipos mezclados. `ApplyMapping`, `Relationalize` (aplana JSON anidado) y `DropNullFields`.
- **Job bookmarks**: guardan qué datos ya se procesaron para que la siguiente ejecución lea **solo lo nuevo**. Requieren `transformation_ctx` en cada fuente y llamar a `job.commit()`.
- **Pushdown predicates**: filtran particiones al leer del catálogo, sin listar todo S3.
- **Glue Studio** (visual), **Glue DataBrew** (preparación visual sin código, con más de 250 transformaciones), **Glue Data Quality** (reglas DQDL).
- **Glue Streaming**: Spark Structured Streaming sobre Kinesis o Kafka.

```python norun
import sys
from awsglue.context import GlueContext
from awsglue.job import Job
from awsglue.utils import getResolvedOptions
from pyspark.context import SparkContext

args = getResolvedOptions(sys.argv, ["JOB_NAME"])
glue = GlueContext(SparkContext.getOrCreate())
job = Job(glue)
job.init(args["JOB_NAME"], args)

pedidos = glue.create_dynamic_frame.from_catalog(
    database="bronze",
    table_name="pedidos",
    push_down_predicate="anio = '2026' and mes = '10'",
    transformation_ctx="pedidos",          # necesario para el bookmark
)
pedidos = pedidos.resolveChoice(specs=[("monto", "cast:double")])

glue.write_dynamic_frame.from_options(
    frame=pedidos,
    connection_type="s3",
    connection_options={"path": "s3://lago/silver/pedidos/", "partitionKeys": ["anio", "mes"]},
    format="parquet",
    transformation_ctx="salida",
)
job.commit()                                 # guarda el bookmark
```

### Amazon EMR

Spark, Hive, Presto/Trino, HBase y Flink con control total. Tres formas:

- **EMR en EC2**: nodos primario, core (HDFS) y task (solo cómputo, ideales para **Spot**). Puede apagarse al terminar el paso.
- **EMR Serverless**: sin clúster, se paga por uso.
- **EMR en EKS**: en un clúster de Kubernetes existente.

Elige EMR cuando la pregunta exige un framework que Glue no tiene, configuraciones finas de Spark, o un clúster de larga duración más barato que Glue para uso continuo.

### Otras opciones

- **Lambda**: transformaciones livianas por evento (un archivo llega a S3). No sirve para archivos grandes ni procesos de más de 15 minutos.
- **Redshift**: ELT con SQL, procedimientos almacenados y vistas materializadas.
- **Athena**: CTAS e `INSERT INTO` para transformar con SQL sobre S3.

### Procesamiento asistido por LLM (nuevo en v1.1)

La guía 1.1 agrega usar modelos fundacionales para transformar datos: clasificar texto libre, extraer campos de documentos o normalizar direcciones llamando a **Amazon Bedrock** desde un job (en lote con **inferencia por lotes** de Bedrock, más barata), y generar código o SQL con **Amazon Q**. Los datos se validan después igual que cualquier otra transformación.

## Orquestación

| Servicio | Cuándo |
|---|---|
| **AWS Step Functions** | Máquinas de estado serverless que integran servicios de AWS directamente; reintentos, `Catch`, ramas paralelas, `Map` distribuido para millones de objetos |
| **Amazon MWAA** | Apache Airflow administrado: el equipo ya usa Airflow, DAGs en Python, muchos operadores |
| **Glue Workflows y triggers** | Encadenar crawlers y jobs de Glue sin otro servicio |
| **Amazon EventBridge** | Disparar por eventos (archivo nuevo en S3, cambio de estado) o por horario (EventBridge Scheduler) |
| **Redshift Data API + Scheduler** | Programar SQL en Redshift |

```json norun
{
  "StartAt": "Crawler",
  "States": {
    "Crawler": {
      "Type": "Task",
      "Resource": "arn:aws:states:::aws-sdk:glue:startCrawler",
      "Parameters": {"Name": "crawler-bronze"},
      "Next": "Transformar"
    },
    "Transformar": {
      "Type": "Task",
      "Resource": "arn:aws:states:::glue:startJobRun.sync",
      "Parameters": {"JobName": "pedidos-silver"},
      "Retry": [{"ErrorEquals": ["States.ALL"], "MaxAttempts": 2, "BackoffRate": 2}],
      "Catch": [{"ErrorEquals": ["States.ALL"], "Next": "Avisar"}],
      "End": true
    },
    "Avisar": {
      "Type": "Task",
      "Resource": "arn:aws:states:::sns:publish",
      "Parameters": {"TopicArn": "arn:aws:sns:us-east-1:123456789012:alertas", "Message": "Falló pedidos-silver"},
      "End": true
    }
  }
}
```

El sufijo `.sync` hace que Step Functions **espere** a que termine el job de Glue antes de seguir.

## Principios de programación que evalúa el examen

- **Idempotencia**: reejecutar no duplica (sobrescribir particiones, `MERGE`, claves únicas).
- **Infraestructura como código**: CloudFormation, AWS CDK, AWS SAM (para Lambda).
- **CI/CD**: CodePipeline, CodeBuild y Git.
- SQL eficiente: filtrar por particiones, evitar `SELECT *`, joins con tablas chicas primero.
- **Estructuras de datos**: grafos para dependencias, árboles para índices; complejidad de algoritmos.

:::errores Errores frecuentes
- Usar Lambda para procesar un archivo de 50 GB (límite de 15 minutos).
- Olvidar `job.commit()` y reprocesar todo en cada ejecución.
- Elegir Firehose cuando se necesita latencia de milisegundos o releer datos.
- Elegir EMR en EC2 cuando la pregunta pide "menor esfuerzo operativo".
:::

## Ejercicios

:::ejercicio quiz
Hay que llevar clics de una web a S3 en Parquet, particionados por fecha, sin escribir ni operar consumidores, y un retraso de un minuto es aceptable. ¿Qué usas?
- [ ] Kinesis Data Streams con una aplicación KCL en EC2.
- [x] Amazon Data Firehose con conversión de formato y particionado dinámico.
- [ ] Amazon MSK con Kafka Connect.
- [ ] Una función Lambda que escribe cada clic en S3.
```explicacion
Firehose entrega a S3 sin código, convierte a Parquet con el esquema del Glue Data Catalog y particiona. El buffer de segundos es aceptable.
```
:::

:::ejercicio quiz
Un stream aprovisionado devuelve `ProvisionedThroughputExceededException` y casi todo el tráfico va a un shard. La clave de partición es el país. ¿Qué haces primero?
- [ ] Aumentar la retención a 7 días para que no se pierdan los registros.
- [x] Usar una clave de partición de alta cardinalidad, como el id del dispositivo.
- [ ] Cambiar a Firehose con un buffer más grande.
- [ ] Reducir la cantidad de consumidores del stream.
```explicacion
Con pocas claves se forma un shard caliente. Una clave con muchos valores distribuye la carga entre shards.
```
:::

:::ejercicio quiz
Un job de Glue que corre cada hora vuelve a procesar todos los archivos de S3 cada vez. ¿Qué falta?
- [ ] Más workers G.2X.
- [x] Habilitar job bookmarks, con `transformation_ctx` y `job.commit()`.
- [ ] Un crawler que corra antes de cada ejecución.
- [ ] Cambiar el job a Python shell.
```explicacion
Los bookmarks registran lo procesado; sin ellos, cada ejecución lee todo de nuevo.
```
:::

:::ejercicio quiz
Una base Oracle on-premises debe replicarse a S3 de forma continua, incluyendo cambios y borrados, con mínimo impacto en el origen. ¿Qué usas?
- [ ] AWS DataSync programado cada hora.
- [x] AWS DMS con carga completa y CDC.
- [ ] Amazon AppFlow.
- [ ] Un export diario con `sqlplus` y Transfer Family.
```explicacion
DMS hace la carga inicial y luego lee los registros de transacciones (CDC), con lo que captura inserciones, actualizaciones y borrados.
```
:::

:::ejercicio quiz
Un pipeline debe ejecutar un crawler, luego un job de Glue y, si falla, notificar por SNS, sin servidores que administrar ni Airflow en el equipo. ¿Qué orquestador eliges?
- [ ] Amazon MWAA.
- [x] AWS Step Functions.
- [ ] Un cron en una instancia EC2.
- [ ] Amazon EMR con pasos encadenados.
```explicacion
Step Functions integra Glue y SNS directamente, con reintentos y manejo de errores, y es serverless.
```
:::

:::ejercicio abierto
Diseña la ingesta para el escenario de Tomás: GPS cada 5 segundos con paneles de menos de un minuto, Oracle on-premises y Salesforce diario. Para cada fuente indica el servicio, el destino y cómo garantizas que no se dupliquen datos al reejecutar.
```text solucion
GPS: Kinesis Data Streams (clave de partición = id del camión) → consumidor Flink o Lambda para el panel en tiempo real, y Firehose → S3 bronze en Parquet particionado por fecha. Duplicados: los eventos llevan id y timestamp; la capa silver deduplica con MERGE en Iceberg.
Oracle: DMS con carga completa + CDC hacia S3 bronze; un job de Glue aplica los cambios con MERGE en una tabla Iceberg silver usando la clave primaria (idempotente).
Salesforce: AppFlow diario a S3 bronze en una carpeta por fecha; el job de Glue sobrescribe la partición de ese día (reejecutar no duplica).
Orquestación: Step Functions disparado por EventBridge Scheduler, con reintentos y alerta SNS.
```
:::
