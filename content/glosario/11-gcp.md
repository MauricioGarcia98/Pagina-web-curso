# area: GCP

## Proyecto GCP
alias: project, proyecto de google cloud
nino: Es como **tu propio cuarto dentro de la casa de Google**: todo lo que armes (cajas, bases de datos, programas) queda adentro de tu cuarto, con su propia cuenta de gastos y su propia lista de quién puede entrar.
que: La unidad básica de organización en Google Cloud: agrupa recursos, APIs habilitadas, permisos IAM, cuotas y facturación. Tiene un ID único global (`datos-ventas-dev`). Encima están las carpetas y la organización.
ejemplo: `gcloud projects create datos-curso-ana` y `gcloud config set project datos-curso-ana`.
para: Aislar entornos y equipos, y controlar costos por proyecto.
cuidado: Si borras el proyecto, se borra todo lo que contiene (con 30 días para recuperarlo).
ver: IAM, Resource group

## Cloud Storage
alias: gcs, google cloud storage, gs://
nino: Es el **depósito gigante de cajas de Google**: como S3, guardas archivos en buckets y los sacas cuando quieras.
que: El almacenamiento de objetos de GCP: buckets con nombre global, clases (Standard, Nearline, Coldline, Archive), ubicaciones regionales o multirregionales, ciclo de vida, versionado y acceso con IAM (recomendado: *uniform bucket-level access*). BigQuery, Dataproc y Dataflow leen de `gs://`.
ejemplo: `gcloud storage cp pedidos.csv gs://empresa-lago/bronze/pedidos/` · `gcloud storage ls -l gs://empresa-lago/bronze/`.
para: El data lake en GCP.
ver: Object storage, BigQuery, S3

## BigQuery
alias: bq, google bigquery
nino: BigQuery es una **calculadora gigante en la nube**: le escribes una pregunta en SQL sobre miles de millones de filas y te contesta en segundos, sin que tengas que prender ni cuidar ninguna máquina.
que: El data warehouse serverless de GCP: columnar, separa almacenamiento y cómputo; organiza datos en **proyectos → datasets → tablas**. Cobra por **bytes escaneados** (on-demand) o por capacidad (slots). Tablas particionadas y agrupadas (*clustered*), tablas externas sobre GCS, ML en SQL (BigQuery ML) y streaming.
ejemplo:
```sql
SELECT ciudad, SUM(total) AS ventas
FROM `datos-prod.gold.pedidos`
WHERE fecha >= '2024-12-01'
GROUP BY ciudad
```
para: Analítica a gran escala sin administración.
cuidado: `SELECT *` en una tabla de 5 TB cobra los 5 TB aunque pongas `LIMIT 10`. Selecciona solo las columnas necesarias, filtra por la partición y revisa el estimado de bytes antes de correr.
ver: Data warehouse, Serverless, Partition pruning, Dataform

## Pub/Sub
alias: google pub/sub, publish/subscribe
nino: Es un **cartero que reparte copias**: alguien deja un mensaje en un buzón (tema) y el cartero le lleva una copia a cada persona que se haya suscrito a ese buzón.
que: El servicio de mensajería asíncrona de GCP: los **publicadores** envían mensajes a un **tema** (*topic*) y cada **suscripción** recibe una copia, por *pull* o *push*. Retención configurable, entrega al menos una vez (o exactamente una vez en *pull*). Suscripciones directas a BigQuery o GCS.
ejemplo: `gcloud pubsub topics publish pedidos --message='{"pedido_id":1042,"total":35.5}'`; una suscripción alimenta Dataflow y otra escribe directo en BigQuery.
para: Ingesta de eventos y desacoplar sistemas.
ver: Streaming, Kafka, Dataflow

## Dataflow
alias: google dataflow, apache beam
nino: Es una **línea de producción automática** que procesa datos tanto si llegan de a montones (batch) como si llegan de a uno sin parar (streaming), con el mismo diseño.
que: El servicio gestionado de GCP para ejecutar pipelines de **Apache Beam** (Python o Java), en batch o streaming, con autoescalado, ventanas de tiempo, marcas de agua y garantías de exactamente una vez. Tiene plantillas listas (Pub/Sub → BigQuery, GCS → BigQuery…).
ejemplo: Un pipeline de Beam que lee de Pub/Sub, agrupa en ventanas de 1 minuto por ciudad y escribe en BigQuery.
para: Streaming y ETL serverless en GCP.
ver: Pub/Sub, Structured Streaming, Watermark

## Dataproc
alias: google dataproc, dataproc serverless
nino: Es el **equipo de computadoras con Spark que te presta Google**: lo usas para un trabajo grande y lo devuelves.
que: Spark, Hadoop, Trino y Flink gestionados en GCP: clústeres que se crean en ~90 segundos y se borran al terminar, o **Dataproc Serverless** para jobs de Spark sin clúster. Lee de GCS y BigQuery.
ejemplo: `gcloud dataproc batches submit pyspark job.py --region=us-central1 -- gs://lago/bronze/ gs://lago/silver/`
para: Llevar Spark existente a GCP.
ver: Spark, EMR, Cluster

## Composer
alias: cloud composer, airflow en gcp
nino: Es **Airflow que te arma y cuida Google**: tú subes tus listas de tareas y ellos mantienen todo funcionando.
que: Airflow gestionado en GCP: los DAGs se suben a un bucket de GCS del entorno; incluye operadores para BigQuery, Dataflow, Dataproc y GCS.
ejemplo: `gcloud composer environments storage dags import --environment datos --location us-central1 --source dags/ventas.py`
para: Orquestar pipelines en GCP con Airflow.
cuidado: Un entorno de Composer tiene costo fijo considerable aunque no corra nada.
ver: Airflow, MWAA

## Dataform
alias: google dataform
nino: Es el **recetario ordenado de Google** para BigQuery: muy parecido a dbt.
que: Servicio de GCP para transformar datos en BigQuery con archivos SQLX: dependencias con `${ref("tabla")}`, materializaciones (view, table, incremental), aserciones (pruebas), documentación, Git y programación de ejecuciones.
ejemplo:
```sql
config { type: "table", assertions: { uniqueKey: ["pedido_id"] } }
SELECT * FROM ${ref("stg_pedidos")} WHERE estado = 'entregado'
```
para: El "dbt" nativo de BigQuery, sin costo adicional.
ver: dbt, BigQuery, ref()

## ADC
alias: application default credentials, credenciales predeterminadas
nino: Es una **regla para encontrar la llave**: el programa busca primero en el bolsillo, después en el cajón y después en la mesa, y usa la primera llave que encuentra. Así el mismo programa funciona en tu compu y en la nube.
que: El mecanismo de las librerías de Google para encontrar credenciales automáticamente: (1) la variable `GOOGLE_APPLICATION_CREDENTIALS`, (2) las credenciales de `gcloud auth application-default login`, (3) la cuenta de servicio del recurso donde corre (VM, Cloud Run, Composer). El código no menciona credenciales.
ejemplo:
```bash
gcloud auth application-default login
python -c "from google.cloud import bigquery; print(list(bigquery.Client().query('SELECT 1').result()))"
```
para: Código sin credenciales embebidas que funciona igual en local y en producción.
ver: Cuenta de servicio, Credenciales temporales

## Bigtable
alias: cloud bigtable
nino: Es una **planilla gigantesca ordenada por una sola columna**: si sabes dónde empieza tu fila, la encuentras en milisegundos aunque haya billones.
que: Base NoSQL de columnas anchas de Google Cloud para cargas de altísimo volumen y latencia de un dígito de milisegundos (IoT, series de tiempo, personalización). Se accede por **clave de fila** o rangos de claves; escala agregando nodos y replica entre clústeres.
ejemplo: Clave `sensor_id#timestamp_invertido` para leer las últimas lecturas de un sensor.
para: Millones de lecturas y escrituras por segundo con baja latencia.
cuidado: Una clave que empieza con la fecha o un id creciente concentra las escrituras en un nodo (*hotspot*).
ver: BigQuery, Latencia

## Spanner
alias: cloud spanner
nino: Es una **base de datos que vive en varios continentes a la vez** y nunca se contradice: lo que se escribe en Tokio se ve igual en Buenos Aires.
que: Base relacional de Google Cloud con SQL, **transacciones con consistencia fuerte** y **escala horizontal global**; disponibilidad de hasta 99,999 % en configuración multirregional.
ejemplo: El inventario global de una cadena de tiendas, actualizado con transacciones desde cualquier región.
para: Sistemas transaccionales que superan lo que soporta una base tradicional.
ver: ACID, OLTP

## Datastream
alias: google datastream
nino: Es un **espía amable** que mira el diario de cambios de una base y copia cada cambio al lago o a BigQuery apenas ocurre.
que: Servicio serverless de **CDC** de Google Cloud: replica cambios de MySQL, PostgreSQL, Oracle y SQL Server hacia BigQuery o Cloud Storage con baja latencia.
ejemplo: La base de stock en Cloud SQL se refleja en BigQuery con segundos de retraso.
para: Analítica casi en tiempo real sobre bases operacionales.
ver: CDC, BigQuery

## Gemini Enterprise Agent Platform
alias: vertex ai, vertex, agent platform
nino: Es la **fábrica de IA de Google Cloud**: ahí se entrenan, prueban, sirven y vigilan modelos y agentes.
que: La plataforma de IA de Google Cloud (antes **Vertex AI**, renombrada en 2026): Model Garden y Gemini, entrenamiento personalizado y AutoML, Feature Store, Pipelines, Model Registry, endpoints, Model Monitoring, evaluación de IA generativa, y desarrollo y despliegue de agentes (ADK, Agent Engine). Es el centro del examen PMLE.
ejemplo: Un pipeline semanal entrena un modelo, lo registra y lo despliega a un endpoint con el 10 % del tráfico.
para: Hacer ML y agentes en Google Cloud de punta a punta.
ver: BigQuery, RAG, LLM

## Sensitive Data Protection
alias: cloud dlp, dlp, data loss prevention
nino: Es un **detector de metales para datos personales**: revisa tablas y archivos, encuentra tarjetas, documentos y correos, y los tapa.
que: Servicio de Google Cloud (antes Cloud DLP) que **descubre**, **clasifica** y **desidentifica** datos sensibles en BigQuery, Cloud Storage y otros: enmascarado, tokenización con cifrado que preserva el formato, generalización y *date shifting*.
ejemplo: Un perfil de descubrimiento marca las columnas de BigQuery con números de tarjeta y una plantilla las tokeniza al copiar a desarrollo.
para: Cumplir normas de privacidad y reducir el riesgo de exponer PII.
ver: PII, Gobierno de datos

## VPC Service Controls
alias: vpc-sc, perímetro de servicio
nino: Es un **cerco alrededor de tus datos**: aunque alguien tenga la llave, no puede sacar nada por encima del cerco.
que: Perímetros de seguridad de Google Cloud alrededor de proyectos y servicios (BigQuery, Cloud Storage y otros) que impiden la **exfiltración** de datos fuera del perímetro, incluso con credenciales válidas.
ejemplo: Nadie puede copiar tablas del proyecto de datos de clientes a un proyecto personal.
para: Proteger datos sensibles contra fugas por credenciales robadas o errores.
ver: IAM, Gobierno de datos
