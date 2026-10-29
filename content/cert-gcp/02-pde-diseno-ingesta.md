---
titulo: PDE - Diseñar sistemas de procesamiento e ingerir datos
nivel: Avanzado
duracion: 75
resumen: Las secciones 1 y 2 del Professional Data Engineer - diseñar pensando en seguridad, confiabilidad, flexibilidad y migración; Pub/Sub, Dataflow y Apache Beam (ventanas, marcas de agua, disparadores, datos tardíos), Datastream para CDC, Dataproc y Dataproc Serverless, Data Fusion, Storage Transfer y Transfer Appliance, Dataform y Cloud Composer.
objetivos: Elegir entre Dataflow, Dataproc, BigQuery y Data Fusion según el caso | Diseñar un pipeline de streaming con ventanas, marcas de agua y manejo de datos tardíos | Replicar bases con Datastream hacia BigQuery | Orquestar con Cloud Composer, Workflows o Dataform | Planificar migraciones de datos a Google Cloud
prerrequisitos: cert-gcp-mapa-certificaciones | gcp-pubsub-dataflow | gcp-composer-dataform
autoevaluacion: ¿Sabes qué hace una marca de agua en Dataflow? | ¿Sabes cuándo usar Pub/Sub con orden por clave? | ¿Sabes qué servicio replica MySQL a BigQuery con CDC? | ¿Sabes cuándo usar Composer y cuándo Workflows? | ¿Sabes cómo mover 500 TB sin red suficiente?
---

:::escenario
La cadena de Valentina tiene 900 sucursales que envían cada venta en tiempo real, una base MySQL de stock en Cloud SQL, un clúster Hadoop on-premises con 200 trabajos de Spark y 400 TB de históricos en su centro de datos. Hay que diseñar la plataforma en Google Cloud: es la primera mitad del PDE.
:::

## Sección 1: diseñar sistemas de procesamiento

El examen evalúa cuatro ejes:

- **Seguridad y cumplimiento**: IAM, cifrado (Google por defecto, **CMEK** con Cloud KMS), **VPC Service Controls**, residencia de datos (ubicación de datasets y buckets), **Sensitive Data Protection**.
- **Confiabilidad y fidelidad**: validación, limpieza, recuperación ante fallas, pipelines **idempotentes**, monitoreo.
- **Flexibilidad y portabilidad**: formatos abiertos (Parquet, Iceberg con **BigLake**), multinube (BigQuery Omni), herramientas portables (Beam, Spark).
- **Migración**: evaluar, planificar, migrar y validar (**BigQuery Migration Service** traduce SQL de Teradata, Redshift y otros; Database Migration Service para bases).

```diagrama
titulo: Plataforma de datos de la cadena en Google Cloud
nodo suc: Sucursales | icono=tienda | col=0 | fila=0 | sub=ventas en tiempo real
nodo sql: Cloud SQL (MySQL) | icono=cloudsql | col=0 | fila=1 | forma=cilindro | color=azul
nodo hdp: Hadoop on-premises | icono=hadoop | col=0 | fila=2 | sub=200 trabajos Spark
nodo ps: Pub/Sub | icono=pubsub | col=1 | fila=0 | color=azul
nodo ds: Datastream | icono=datastream | col=1 | fila=1 | sub=CDC | color=azul
nodo dp: Dataproc | icono=dataproc | col=1 | fila=2 | sub=Spark administrado | color=azul
nodo df: Dataflow | icono=dataflow | col=2 | fila=0 | sub=Beam: ventanas | color=azul
nodo gcs: Cloud Storage | icono=gcs | col=2 | fila=2 | forma=cilindro | color=verde
nodo bq: BigQuery | icono=bigquery | col=3 | fila=1 | forma=cilindro | color=verde
nodo dfm: Dataform | icono=dataform | col=4 | fila=1 | sub=SQL versionado | color=violeta
flecha suc -> ps
flecha ps -> df
flecha df -> bq
flecha sql -> ds
flecha ds -> bq
flecha hdp -> dp: migración
flecha dp -> gcs
flecha gcs -> bq: BigLake
flecha bq -> dfm
```

## Sección 2: ingerir y procesar datos

### Pub/Sub

- Mensajería serverless global: **temas** y **suscripciones** (pull, push, **exportación directa a BigQuery o Cloud Storage** sin código).
- Entrega **al menos una vez** por defecto; **exactly-once** opcional en suscripciones pull.
- **Orden por clave** (*ordering key*): orden garantizado dentro de cada clave.
- Retención de mensajes reconocidos y **seek** para reprocesar (a un snapshot o un instante).
- **Dead-letter topic** para mensajes que fallan repetidamente; **esquemas** (Avro, Protobuf) para validar.
- **Pub/Sub Lite** fue discontinuado: la alternativa es Pub/Sub o **Managed Service for Apache Kafka**.

### Dataflow y Apache Beam

Dataflow ejecuta pipelines de **Apache Beam** (lotes y streaming con el mismo código) de forma serverless con autoescalado.

| Concepto | Qué es |
|---|---|
| **PCollection / PTransform** | Datos y transformaciones (`ParDo`, `GroupByKey`, `CoGroupByKey`, `Combine`) |
| **Ventanas fijas** (*tumbling*) | Intervalos sin superposición (ventas por minuto) |
| **Ventanas deslizantes** (*hopping*) | Se superponen (promedio de 10 min cada 1 min) |
| **Ventanas de sesión** | Se cierran tras un período de inactividad por clave |
| **Marca de agua** (*watermark*) | Estimación de hasta qué tiempo de evento ya llegaron los datos |
| **Disparadores** (*triggers*) | Cuándo emitir resultados (al pasar la marca de agua, antes, por cantidad) |
| **Allowed lateness** | Cuánto tiempo se aceptan datos tardíos para actualizar una ventana |
| **Side input** | Datos chicos adicionales (por ejemplo, un catálogo) disponibles en cada worker |

- **Plantillas** (clásicas y **Flex**) para lanzar pipelines sin compilar; plantillas de Google (Pub/Sub a BigQuery, JDBC a BigQuery).
- **Streaming Engine** y **Dataflow Prime** (autoajuste vertical); **Runner v2**.
- Actualizar un pipeline en streaming: **update** (mismo nombre de job, conserva el estado) o **drain** (termina de procesar y se detiene) frente a **cancel** (descarta lo que está en vuelo).
- Mensajes con errores: **dead-letter** a un tema o tabla aparte, nunca frenar todo el pipeline.

```python norun
import apache_beam as beam
from apache_beam.transforms import window, trigger

with beam.Pipeline(options=opciones) as p:
    (p
     | "Leer" >> beam.io.ReadFromPubSub(subscription=SUB)
     | "Parsear" >> beam.Map(parsear_venta)
     | "Ventana" >> beam.WindowInto(
           window.FixedWindows(60),
           trigger=trigger.AfterWatermark(late=trigger.AfterCount(1)),
           allowed_lateness=600,
           accumulation_mode=trigger.AccumulationMode.ACCUMULATING)
     | "Clave" >> beam.Map(lambda v: (v["sucursal"], v["monto"]))
     | "Sumar" >> beam.CombinePerKey(sum)
     | "Formato" >> beam.Map(lambda kv: {"sucursal": kv[0], "total": kv[1]})
     | "Escribir" >> beam.io.WriteToBigQuery(
           "proyecto:ventas.por_minuto",
           write_disposition=beam.io.BigQueryDisposition.WRITE_APPEND))
```

### Otras formas de ingerir

| Caso | Servicio |
|---|---|
| CDC de MySQL, PostgreSQL, Oracle, SQL Server a BigQuery o Cloud Storage | **Datastream** (serverless, baja latencia) |
| Migrar una base a Cloud SQL o AlloyDB | **Database Migration Service** |
| Copiar desde S3, Azure o HTTP a Cloud Storage | **Storage Transfer Service** |
| Cientos de terabytes sin ancho de banda suficiente | **Transfer Appliance** |
| Cargar desde SaaS (Google Ads, YouTube) o S3 a BigQuery programado | **BigQuery Data Transfer Service** |
| ETL visual sin código, con muchos conectores | **Cloud Data Fusion** (basado en CDAP) |
| Escrituras de alto volumen en BigQuery desde aplicaciones | **Storage Write API** |

### Dataproc

- Spark, Hadoop, Hive, Presto y Flink administrados; clústeres que arrancan en unos 90 segundos.
- Buenas prácticas: **clústeres efímeros** por trabajo, datos en **Cloud Storage** (no HDFS), **VMs preemptibles/Spot** como workers secundarios, **autoescalado**, **Dataproc Metastore**.
- **Dataproc Serverless** (Serverless for Apache Spark): ejecuta lotes o sesiones de Spark sin clúster.
- Conectores a BigQuery, Bigtable y Cloud Storage.

### Transformación con SQL y orquestación

- **Dataform**: transformaciones SQL (SQLX) dentro de BigQuery con dependencias, **aserciones** (pruebas), tablas **incrementales**, Git y programación. Es el equivalente administrado a dbt en Google Cloud.
- **Cloud Composer** (Airflow administrado, versión 3): DAGs con dependencias complejas entre muchos servicios.
- **Workflows**: orquestación serverless liviana de llamadas a APIs y servicios (barata, sin entorno permanente).
- **Cloud Scheduler** y **Eventarc** para disparar por horario o evento.
- **BigQuery pipelines** y **consultas programadas** para casos simples.

:::examen Cuál elegir
- Streaming con ventanas, marcas de agua y datos tardíos → **Dataflow**.
- Spark/Hadoop existente → **Dataproc**; Spark sin clúster → **Dataproc Serverless**.
- Base operacional a BigQuery casi en tiempo real → **Datastream**.
- Equipo sin programadores que necesita ETL visual → **Data Fusion**.
- SQL modular con pruebas en BigQuery → **Dataform**.
- Orquestar decenas de servicios con reintentos y dependencias → **Composer**; unas pocas llamadas a APIs → **Workflows**.
:::

## Ejercicios

:::ejercicio quiz
Las ventas de las sucursales pueden llegar hasta 5 minutos tarde por cortes de red, y los totales por minuto deben corregirse cuando llegan. ¿Qué configuras en Dataflow?
- [ ] Ventanas globales sin disparadores.
- [x] Ventanas fijas con allowed lateness y un disparador para datos tardíos.
- [ ] Ventanas de sesión con un intervalo de 5 minutos.
- [ ] Procesamiento por lotes cada 5 minutos.
```explicacion
Allowed lateness acepta datos tardíos y el disparador tardío emite el resultado corregido de la ventana.
```
:::

:::ejercicio quiz
Hay que replicar una base MySQL de Cloud SQL a BigQuery casi en tiempo real, con cambios y borrados, sin administrar infraestructura. ¿Qué usas?
- [ ] Una exportación diaria a Cloud Storage y una carga a BigQuery.
- [x] Datastream hacia BigQuery.
- [ ] Una consulta federada desde BigQuery cada cinco minutos.
- [ ] Dataproc con un trabajo de Sqoop.
```explicacion
Datastream lee el binlog de MySQL y aplica los cambios en BigQuery de forma serverless.
```
:::

:::ejercicio quiz
Hay que actualizar el código de un pipeline de streaming en Dataflow sin perder los datos en vuelo ni el estado de las ventanas. ¿Qué haces?
- [ ] Cancelar el job y lanzar uno nuevo.
- [x] Lanzar el nuevo código con la opción update sobre el mismo job.
- [ ] Borrar la suscripción de Pub/Sub y crear otra.
- [ ] Detener los workers manualmente.
```explicacion
Update reemplaza el job conservando el estado; si el cambio no es compatible, se drena el job viejo antes de lanzar el nuevo.
```
:::

:::ejercicio quiz
Hay que mover 400 TB de un centro de datos con un enlace de 100 Mbps. ¿Qué usas?
- [ ] Storage Transfer Service por internet.
- [x] Transfer Appliance.
- [ ] `gcloud storage cp` en paralelo.
- [ ] Datastream.
```explicacion
Con ese enlace la transferencia tardaría meses; Transfer Appliance envía los datos en un dispositivo físico.
```
:::

:::ejercicio abierto
Diseña la migración de los 200 trabajos de Spark de Valentina: dónde corren al principio, dónde quedan los datos, cómo bajas el costo y qué harías a largo plazo.
```text solucion
Corto plazo (lift and shift): Dataproc con clústeres efímeros por trabajo, orquestados con Cloud Composer; los datos se mueven de HDFS a Cloud Storage (Transfer Appliance o Storage Transfer) y los trabajos leen gs:// en vez de hdfs://. Dataproc Metastore reemplaza al Hive Metastore.
Costo: workers secundarios Spot, autoescalado, clústeres que se borran al terminar; trabajos chicos a Dataproc Serverless.
Largo plazo: tablas en formato abierto (Iceberg con BigLake) consultables desde BigQuery; reescribir los trabajos SQL en Dataform y los de streaming en Dataflow cuando convenga.
```
:::
