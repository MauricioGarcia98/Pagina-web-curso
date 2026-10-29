# area: AWS

## S3
alias: amazon s3, simple storage service
nino: Es el **depósito gigante de cajas de Amazon**: guardas cualquier archivo en un "bucket" con un nombre y lo puedes sacar cuando quieras, desde cualquier lugar, sin que se pierda nunca.
que: El almacenamiento de objetos de AWS: buckets con objetos identificados por una clave (`bronze/pedidos/…`). Durabilidad 99,999999999 %, clases de almacenamiento por costo (Standard, Infrequent Access, Glacier), reglas de ciclo de vida, versionado, cifrado y control de acceso con IAM y políticas del bucket. Es la base de los lagos de datos en AWS.
ejemplo:
```bash
aws s3 cp pedidos.csv s3://empresa-lago/bronze/pedidos/fecha=2024-12-01/
aws s3 ls s3://empresa-lago/bronze/pedidos/ --recursive --human-readable
```
para: Guardar el data lake, archivos de entrada, resultados y backups.
cuidado: Bloquea el acceso público (*Block Public Access*), activa cifrado y nunca abras un bucket a internet "para probar".
ver: Object storage, Data lake, Athena, Glue

## Glue
alias: aws glue, glue data catalog, glue job, crawler
nino: Glue es dos cosas: un **bibliotecario** que anota qué hay en cada caja del depósito (catálogo) y un **equipo de ayudantes** que transforma los datos cuando le pides (jobs de Spark).
que: Servicio de AWS con: el **Data Catalog** (metadatos de tablas: esquema, ubicación en S3, particiones; lo usan Athena, EMR, Redshift Spectrum), los **crawlers** (descubren esquemas automáticamente) y los **Glue jobs** (Spark o Python serverless; se paga por DPU-hora).
ejemplo: Un crawler recorre `s3://lago/silver/pedidos/` y crea la tabla `silver.pedidos` particionada por fecha; un Glue job en PySpark transforma bronze → silver todas las noches.
para: Catalogar el lago y correr ETL en Spark sin administrar clústeres.
cuidado: Los crawlers pueden adivinar tipos mal o crear tablas por cada carpeta: para producción, define las tablas con IaC o el formato de tabla.
ver: S3, Athena, Catálogo de datos, Spark

## Athena
alias: amazon athena
nino: Athena es una **lupa mágica**: la apuntas a las cajas del depósito S3 y le haces preguntas en SQL, sin tener que mover los datos a ninguna base.
que: Motor SQL serverless (basado en Trino/Presto) que consulta archivos en S3 usando las tablas del Glue Data Catalog. Cobra por **datos escaneados** (~US$5/TB). Soporta Parquet, CSV, JSON, Iceberg, particiones y CTAS.
ejemplo:
```sql
SELECT ciudad, SUM(total) AS ventas
FROM silver.pedidos
WHERE fecha BETWEEN DATE '2024-12-01' AND DATE '2024-12-07'
GROUP BY ciudad;
```
para: Análisis ad hoc y consultas sobre el lago sin servidores.
cuidado: Con CSV sin particionar, cada consulta lee todo y paga todo. Convierte a Parquet y particiona por fecha.
ver: S3, Glue, Serverless, Partition pruning

## Redshift
alias: amazon redshift, redshift serverless
nino: Es el **gran almacén ordenado de AWS**: los datos ya limpios se guardan ahí, en columnas, para responder preguntas grandes muy rápido.
que: El data warehouse de AWS: columnar, MPP (procesamiento paralelo masivo), con SQL compatible con PostgreSQL. Opciones de clúster provisionado o serverless; *Spectrum* consulta S3 directamente; `COPY` carga masivamente desde S3; claves de distribución y ordenamiento para el rendimiento.
ejemplo: `COPY gold.ventas FROM 's3://lago/gold/ventas/' IAM_ROLE 'arn:aws:iam::…:role/redshift-carga' FORMAT AS PARQUET;`
para: BI y analítica sobre datos modelados con alta concurrencia.
ver: Data warehouse, S3, OLAP

## EMR
alias: amazon emr, elastic mapreduce
nino: EMR es **alquilar un equipo de computadoras ya armado** con Spark instalado, usarlo para un trabajo grande y devolverlo.
que: Servicio de clústeres de AWS para Spark, Hive, Trino, Flink y más (en EC2, EKS o serverless). Lee y escribe en S3 y usa el Glue Catalog. Más control y menor costo por hora que Glue, a cambio de más configuración.
ejemplo: `aws emr create-cluster` con 1 nodo maestro y 10 nodos *spot* para reprocesar un año de logs, que se apaga solo al terminar el *step*.
para: Spark grande o con configuración especial en AWS.
ver: Spark, Cluster, Glue

## Kinesis
alias: amazon kinesis, kinesis data streams, firehose
nino: Kinesis es una **cinta transportadora** por la que pasan mensajes sin parar (clics, pedidos), y del otro lado varios trabajadores los toman a medida que llegan.
que: Servicios de streaming de AWS: **Data Streams** (registro de eventos con *shards*, retención de días; los consumidores leen a su ritmo) y **Data Firehose** (entrega gestionada a S3, Redshift u OpenSearch en mini-lotes, con conversión a Parquet). Alternativa a Kafka (también existe MSK, Kafka gestionado).
ejemplo: La app publica cada evento de pedido en un stream; Firehose los agrupa cada 60 segundos y los escribe en `s3://lago/bronze/eventos/`.
para: Ingesta de eventos en tiempo real.
ver: Streaming, Kafka, Ingesta

## Lambda
alias: aws lambda, función serverless
nino: Una Lambda es un **ayudante que duerme hasta que suena el timbre**: cuando llega algo (un archivo, un mensaje), se despierta, hace su tarea en segundos y vuelve a dormir. Solo pagas los segundos que trabajó.
que: Funciones serverless de AWS que corren código (Python, Node…) en respuesta a eventos: archivo en S3, mensaje en una cola, llamada HTTP, horario. Máximo 15 minutos por ejecución y memoria hasta 10 GB; se paga por invocación y duración.
ejemplo: Cuando llega `ventas_2024-12-01.csv` a S3, una Lambda valida el encabezado y lo mueve a `bronze/` o a `cuarentena/`.
para: Tareas cortas y orientadas a eventos sin servidores.
cuidado: No sirve para procesamientos largos o pesados: para eso, Glue, EMR o contenedores.
ver: Serverless, S3, Step Functions

## Step Functions
alias: aws step functions, máquina de estados
nino: Es un **juego de mesa con casilleros y flechas**: "ve al casillero 2; si sale bien, al 3; si sale mal, vuelve a intentar o ve al casillero de ayuda".
que: Orquestador serverless de AWS: define flujos como **máquinas de estados** (JSON/ASL) con pasos que llaman servicios (Lambda, Glue, EMR, Athena), con ramas, paralelismo, esperas, reintentos y manejo de errores. Se paga por transición de estado.
ejemplo: `Validar (Lambda) → Glue job bronze→silver → Athena: consultas de calidad → ¿OK? → Notificar`.
para: Orquestar pipelines dentro de AWS sin mantener Airflow.
ver: Orquestación, Lambda, Airflow

## MWAA
alias: managed workflows for apache airflow, airflow gestionado
nino: Es **Airflow que te arma y cuida Amazon**: tú solo traes tus listas de tareas y ellos mantienen el despertador funcionando.
que: Amazon Managed Workflows for Apache Airflow: Airflow gestionado; los DAGs se suben a un bucket S3 y AWS administra scheduler, workers, base de metadatos, escalado y actualizaciones. Equivalentes: Cloud Composer (GCP), Azure Data Factory Workflow Orchestration Manager, Astronomer.
ejemplo: `aws s3 sync dags/ s3://mwaa-datos/dags/` y en minutos el DAG aparece en la interfaz.
para: Usar Airflow sin operarlo.
cuidado: Tiene un costo fijo por hora aunque no corran DAGs.
ver: Airflow, Orquestación

## Lake Formation
alias: aws lake formation
nino: Es el **guardia de la biblioteca del lago**: decide quién puede leer qué libro, qué páginas y hasta qué renglones.
que: Servicio de AWS para **gobernar el acceso** a las tablas del Glue Catalog con permisos a nivel de base, tabla, columna y fila (y por etiquetas, LF-Tags), aplicados en Athena, Redshift Spectrum, EMR y Glue. Centraliza permisos que de otro modo se harían con políticas de S3.
ejemplo: El equipo de marketing puede leer `gold.clientes` pero no las columnas `email` y `telefono`.
para: Gobierno y seguridad fina del data lake.
ver: Gobierno de datos, Glue, PII, Unity Catalog

## Firehose
alias: amazon data firehose, kinesis data firehose, kinesis firehose
nino: Es una **cinta transportadora con balanza**: junta los eventos que llegan, los empaqueta cuando hay suficientes (o pasó un rato) y los deja en el depósito ya ordenados.
que: Servicio de **entrega** administrado de AWS: recibe streams y los escribe en S3, Redshift, OpenSearch, Splunk, tablas Iceberg o endpoints HTTP, con **buffer** por tamaño o tiempo, conversión a Parquet u ORC usando el Glue Data Catalog, compresión, particionado dinámico y transformación con Lambda. No hay shards ni consumidores que programar.
ejemplo: Una app envía clics a Firehose, que cada 60 segundos escribe Parquet en `s3://lago/bronze/clics/fecha=…/`.
para: Llevar eventos al lago o al warehouse con el menor esfuerzo operativo.
cuidado: Es casi en tiempo real (segundos de buffer) y no permite releer datos: si necesitas orden por clave, varios consumidores o replay, usa Kinesis Data Streams.
ver: Kinesis, S3, Streaming

## DMS
alias: aws dms, database migration service
nino: Es una **mudanza que no cierra el negocio**: copia todos los muebles de una base a otra y, mientras tanto, va trasladando también lo que se compra y se vende en el camino.
que: AWS Database Migration Service: migra y replica bases de datos con **carga completa** y **CDC** continuo entre motores (Oracle, SQL Server, MySQL, PostgreSQL, Aurora) o hacia S3, Redshift y Kinesis. **Schema Conversion** convierte esquemas entre motores distintos.
ejemplo: Una base Oracle on-premises se replica a S3 en Parquet con todas sus inserciones, actualizaciones y borrados.
para: Migrar bases y alimentar el lago con cambios de sistemas transaccionales.
ver: CDC, S3, Ingesta

## DynamoDB
alias: amazon dynamodb
nino: Es un **fichero gigante con etiquetas**: si sabes la etiqueta, encuentras la ficha en un instante, aunque haya miles de millones.
que: Base NoSQL clave-valor y de documentos de AWS, serverless, con latencia de milisegundos a cualquier escala. Las consultas eficientes usan la **clave de partición** (y la de ordenamiento); los **GSI** permiten otros patrones de acceso. Tiene TTL, Streams (CDC), PITR, DAX (caché) y exportación a S3.
ejemplo: Tabla `envios` con clave `envio_id` y ordenamiento `EVT#<fecha>` para leer el historial de un envío.
para: Aplicaciones con acceso por clave y muchísimas lecturas y escrituras.
cuidado: No es para analítica: un `Scan` lee toda la tabla y es caro. Para analizar, exporta a S3 o usa zero-ETL a Redshift.
ver: S3, Latencia

## S3 Tables
alias: amazon s3 tables, table buckets
nino: Es un **estante del depósito que se ordena solo**: guardas tablas Iceberg y AWS las compacta y limpia sin que se lo pidas.
que: Buckets especiales (*table buckets*) para **tablas Apache Iceberg administradas**: AWS ejecuta automáticamente la compactación, la expiración de snapshots y el borrado de archivos huérfanos. Se consultan desde Athena, Redshift, EMR, Glue y Spark, y se integran con el catálogo y Lake Formation.
ejemplo: Firehose escribe eventos en una tabla de S3 Tables y Athena los consulta con `MERGE` y viaje en el tiempo.
para: Tener un lago con tablas Iceberg sin programar el mantenimiento.
ver: Iceberg, S3, Athena

## Amazon Bedrock
alias: bedrock, aws bedrock
nino: Es una **agencia de expertos de alquiler**: eliges qué experto (modelo) contratar, le das tus documentos y reglas, y lo usas por una sola ventanilla.
que: Servicio de AWS para usar **modelos fundacionales** (Anthropic, Amazon Nova, Meta, Mistral, Cohere y otros) por API, con **Knowledge Bases** (RAG administrado), **Agents** y **AgentCore** (agentes), **Guardrails** (filtros de seguridad y PII), evaluación, personalización (fine-tuning, destilación) e inferencia por lotes. Los prompts no se usan para entrenar los modelos.
ejemplo: Un asistente que responde sobre políticas internas con una Knowledge Base sobre S3 y un guardrail que oculta datos personales.
para: Construir aplicaciones de IA generativa en AWS sin administrar modelos.
ver: RAG, LLM, Guardrails

## SageMaker AI
alias: amazon sagemaker, sagemaker
nino: Es un **laboratorio completo de ML**: mesas para preparar datos, hornos para entrenar modelos, vitrinas para servirlos y alarmas que avisan si se echan a perder.
que: Servicio de AWS para construir, entrenar, desplegar y operar modelos de ML: Data Wrangler, Feature Store, training jobs (con Spot), ajuste automático, Model Registry, endpoints (tiempo real, serverless, asíncronos, por lotes), Pipelines, Model Monitor y Clarify. **SageMaker Unified Studio** reúne datos, analítica e IA en un solo entorno.
ejemplo: Un pipeline semanal entrena un XGBoost, lo registra si supera el AUC del actual y lo despliega con canary.
para: Hacer MLOps completo en AWS.
ver: Pipeline, CI/CD
