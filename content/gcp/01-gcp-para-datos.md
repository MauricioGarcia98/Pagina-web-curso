---
titulo: Google Cloud para data engineers en 25 minutos
nivel: Básico
duracion: 25
resumen: Qué es Google Cloud, proyectos, regiones y la jerarquía de recursos, el mapa de servicios de datos con BigQuery al centro, costos y equivalencias con AWS y Azure.
objetivos: Describir la jerarquía de recursos de Google Cloud | Ubicar los servicios de datos con BigQuery al centro | Comparar Google Cloud con AWS y Azure y estimar costos
autoevaluacion: ¿Qué es un proyecto en Google Cloud? | ¿Qué servicio cumple el papel del warehouse?
---

## La idea en una frase

**Google Cloud (GCP)** es la nube de Google. Para datos tiene una estrella indiscutida: **BigQuery**, un data warehouse sin servidores donde guardas terabytes y los consultas con SQL en segundos, sin administrar nada. Muchas empresas eligen GCP justamente por BigQuery.

:::analogia La planta eléctrica
Con BigQuery no compras ni enciendes servidores: es como la electricidad. Enchufas tu consulta, Google pone cientos o miles de computadoras a trabajar durante unos segundos, y te cobra lo que consumiste (los datos que leyó). Cuando no consultas, no hay nada encendido.
:::

## Cómo está organizado Google Cloud

```diagrama
titulo: Cómo se organiza Google Cloud, de la empresa a cada recurso
nodo org: Organización | icono=building-2 | col=0 | fila=0 | color=gris | sub=tuempresa.com: ligada al dominio
nodo car: Carpetas (opcional) | icono=carpeta | col=1 | fila=0 | color=azul | sub=datos/, finanzas/: agrupan por área
nodo pro: Proyecto | icono=gcp | col=2 | fila=0 | color=verde | sub=academia-datos-dev · recursos, permisos, APIs y facturación
nodo rec: Recursos | icono=cubo | col=3 | fila=0 | color=naranja | sub=buckets, datasets, temas de Pub/Sub, clusters
flecha org -> car: contiene | explica=La organización está ligada al dominio de la empresa. Opcionalmente, se divide en carpetas por área.
flecha car -> pro: contiene | explica=El proyecto es la unidad central de Google Cloud: tiene sus recursos, sus permisos, sus APIs activadas y su facturación.
flecha pro -> rec: contiene | explica=Los recursos (buckets, datasets, temas de Pub/Sub, clústeres) viven dentro de un proyecto.
```

El **proyecto** es la pieza clave: casi todo (permisos, facturación, APIs activadas) se configura a ese nivel.

- **Proyecto**: todo vive dentro de un proyecto. Tiene un **ID** único en el mundo (`academia-datos-dev`) que usarás en cada comando. Es el equivalente a la *cuenta* de AWS o a la *suscripción + grupo de recursos* de Azure.
- **Cuenta de facturación**: se vincula a uno o varios proyectos; ahí llega la factura.
- **APIs**: cada servicio se **habilita** por proyecto (`gcloud services enable bigquery.googleapis.com`). Si olvidas habilitarla, el error dice "API has not been used in project…".
- **Región y zona**: `us-central1` (Iowa), `southamerica-east1` (São Paulo), `southamerica-west1` (Santiago), `northamerica-south1` (México)… BigQuery y Cloud Storage también ofrecen **multirregiones** como `US` y `EU`.

## El mapa de servicios de datos

```diagrama
titulo: El mapa de servicios de datos de Google Cloud
nodo f: Fuentes | icono=base | col=0 | fila=1 | sub=apps, APIs, bases, SaaS
nodo ps: Pub/Sub | icono=pubsub | col=1 | fila=0 | color=azul | sub=eventos
nodo ds: Datastream | icono=datastream | col=1 | fila=1 | color=azul | sub=CDC de bases
nodo dts: Data Transfer Service | icono=transformar | col=1 | fila=2 | color=azul | sub=SaaS y otras nubes
nodo gcs: Cloud Storage | icono=gcs | col=2 | fila=0 | color=naranja | sub=el lago
nodo bq: BigQuery | icono=bigquery | col=2 | fila=1 | color=naranja | sub=warehouse · BigLake para tablas abiertas
nodo df: Dataflow · Dataproc · Dataform | icono=dataflow | col=3 | fila=0 | color=rojo | sub=Beam, Spark, SQL
nodo con: Looker / Agent Platform | icono=dashboard | col=4 | fila=1 | color=verde | sub=tableros y ML
nodo orq: Composer · Workflows · Scheduler | icono=composer | col=3 | fila=2 | color=violeta | sub=orquestación
nodo gob: IAM · Dataplex · policy tags · Audit Logs | icono=candado | col=4 | fila=2 | color=amarillo | sub=gobierno
flecha f -> ps | explica=Los eventos se publican en Pub/Sub.
flecha f -> ds | explica=Los cambios de las bases se replican con Datastream (CDC).
flecha f -> dts | explica=Las aplicaciones SaaS y otras nubes se traen con Data Transfer Service.
flecha ps -> gcs | explica=Los eventos se pueden guardar crudos en Cloud Storage, el lago.
flecha ds -> bq | explica=Datastream escribe directo en BigQuery.
flecha dts -> bq | explica=Data Transfer Service también carga en BigQuery.
flecha gcs -> df | explica=Dataflow (Beam), Dataproc (Spark) o Dataform (SQL) transforman lo que está en el lago…
flecha df -> bq | explica=…y escriben el resultado en BigQuery.
flecha bq -> con | explica=Looker y la plataforma de agentes y ML consumen BigQuery.
flecha orq -> df: dispara | estilo=punteada | color=violeta | explica=Composer (Airflow), Workflows o Scheduler disparan los pasos. IAM, Dataplex y las policy tags gobiernan el acceso.
```

| Servicio | Para qué | Analogía |
|---|---|---|
| **Cloud Storage (GCS)** | Archivos del lago: CSV, Parquet, Avro, Iceberg | El depósito |
| **BigQuery** | Warehouse sin servidor: SQL sobre TB, ML con SQL, tablas externas | El cerebro analítico |
| **Pub/Sub** | Mensajería de eventos en tiempo real | El correo instantáneo |
| **Dataflow** | Procesamiento batch y streaming con Apache Beam, sin servidores | La fábrica que escala sola |
| **Dataproc** | Spark y Hadoop administrados (clusters o *serverless*) | El taller de Spark |
| **Cloud Composer** | Apache Airflow administrado | El director de orquesta |
| **Dataform** | Transformaciones SQL versionadas dentro de BigQuery (como dbt) | La receta del SQL |
| **Datastream** | Replicar bases (MySQL, Postgres, Oracle) con CDC hacia BigQuery | La mudanza en vivo |
| **Dataplex** | Catálogo, calidad y gobierno del lago y del warehouse | El bibliotecario |
| **Cloud Run / Functions** | Código que reacciona a eventos | El timbre |

<!-- dg:gcp01-mapa -->
```diagrama
titulo: Plataforma de datos de referencia en Google Cloud
nodo src: Bases y APIs | icono=base | col=0 | fila=0 | forma=cilindro
nodo app: Eventos | icono=movil | col=0 | fila=1
nodo ps: Pub/Sub | icono=stream | col=1 | fila=1 | color=azul | sub=mensajería
nodo df: Dataflow | icono=transformar | col=2 | fila=1 | color=azul | sub=Beam, streaming
nodo gcs: Cloud Storage | icono=bucket | col=1 | fila=0 | color=verde | sub=bronze
nodo bq: BigQuery | icono=almacen | col=2 | fila=0 | color=azul | sub=warehouse + SQL
nodo cmp: Composer | icono=orquestador | col=3 | fila=1 | color=violeta | sub=Airflow
nodo lk: Looker | icono=dashboard | col=3 | fila=0 | color=amarillo
flecha src -> gcs: carga | explica=Las exportaciones de bases y APIs se cargan en Cloud Storage, la capa bronze.
flecha app -> ps | explica=Los eventos de la app entran a Pub/Sub.
flecha ps -> df | explica=Dataflow los procesa en streaming…
flecha df -> bq | explica=…y los escribe en BigQuery.
flecha gcs -> bq: load / BigLake | explica=Lo que está en Cloud Storage se carga en BigQuery o se consulta en su lugar con BigLake.
flecha bq -> lk | explica=Looker arma los tableros desde BigQuery.
flecha cmp -> bq: orquesta | estilo=punteada | explica=Composer orquesta las cargas y transformaciones.
```

## Las tres nubes lado a lado

| Concepto | Google Cloud | AWS | Azure |
|---|---|---|---|
| Contenedor de recursos | Proyecto | Cuenta | Suscripción + grupo de recursos |
| Lago de objetos | Cloud Storage | S3 | ADLS Gen2 |
| Warehouse sin servidor | **BigQuery** | Redshift Serverless / Athena | Synapse / Fabric |
| Spark administrado | Dataproc | EMR / Glue | Databricks / Synapse Spark |
| Streaming | Pub/Sub + Dataflow | Kinesis + Flink | Event Hubs + Stream Analytics |
| Airflow administrado | Composer | MWAA | Apache Airflow job (Microsoft Fabric) |
| SQL versionado | Dataform (o dbt) | dbt | dbt |
| CLI | `gcloud`, `bq`, `gsutil` | `aws` | `az` |

## Cuánto cuesta

| Servicio | Precio orientativo | Qué lo dispara |
|---|---|---|
| Cloud Storage Standard | ~USD 0,020 por GB/mes | Guardar todo para siempre sin ciclo de vida |
| BigQuery almacenamiento | ~USD 0,02 por GB/mes (la mitad si la tabla no cambia en 90 días) | Copias innecesarias de tablas |
| BigQuery consultas (*on-demand*) | ~USD 6,25 por **TB leído** (el primer TB de cada mes es gratis) | `SELECT *`, tablas sin particionar |
| BigQuery por capacidad (*editions*) | por *slot*-hora | Reservas sobredimensionadas |
| Dataflow / Dataproc | por vCPU y memoria por hora | Jobs de streaming que nunca se detienen |

:::cuidado El SELECT * más caro de tu vida
En BigQuery cobran por las **columnas** que lees, no por las filas que devuelves. `SELECT * FROM eventos LIMIT 10` sobre una tabla de 20 TB **lee 20 TB** (USD 125) para mostrarte 10 filas. Usa la vista previa de la tabla (es gratis), elige columnas y filtra por partición. Y configura un límite: `--maximum_bytes_billed`.
:::

:::tip Para practicar gratis
GCP ofrece crédito inicial y una capa gratuita permanente (BigQuery: 10 GB de almacenamiento y 1 TB de consultas por mes; además el **BigQuery Sandbox** no pide tarjeta). En este curso practicas en la terminal simulada: no gastas nada.
:::

:::errores
- **Confundir proyecto con cuenta.** En Google Cloud todo vive en un proyecto, que tiene su facturación y sus permisos.
- **Elegir regiones distintas para datos que se cruzan.** BigQuery no une tablas de regiones distintas en una consulta.
- **Sin presupuesto ni alertas.** Configúralos el primer día.
:::

:::practica terminal Tu primera sesión con gcloud
1. Inicia sesión y elige el proyecto: en Google Cloud todo vive dentro de un proyecto.
2. Mira la configuración activa (cuenta, proyecto, región).
3. Lista tus proyectos: es lo primero que haces en una empresa nueva.

```bash norun
gcloud auth login
gcloud config set project academia-datos-dev
gcloud config list
gcloud projects list
```

Reto: explica la diferencia entre `gcloud auth login` (tú, en la terminal) y `gcloud auth application-default login` (tus programas: Python, dbt, Terraform).

Documentación oficial: [gcloud CLI](https://cloud.google.com/sdk/gcloud) · [jerarquía de recursos](https://cloud.google.com/resource-manager/docs/cloud-platform-resource-hierarchy)
:::

## Ejercicios

:::ejercicio quiz
En Google Cloud, ¿cuál es el contenedor donde viven los recursos, los permisos, las APIs habilitadas y la facturación?

- [ ] La región
- [x] El proyecto
- [ ] El dataset
- [ ] La organización
:::

:::ejercicio quiz
Intentas crear un dataset y recibes "BigQuery API has not been used in project academia-datos-dev before or it is disabled". ¿Qué falta?

- [ ] Pagar la factura
- [x] Habilitar la API en el proyecto (`gcloud services enable bigquery.googleapis.com`)
- [ ] Crear una organización
- [ ] Usar otra región
:::

:::ejercicio quiz
Una tabla de BigQuery tiene 50 columnas y 4 TB. Ejecutas `SELECT * FROM t LIMIT 10`. ¿Cuánto se factura (on-demand, USD 6,25/TB)?

- [ ] Casi nada: solo devuelve 10 filas
- [x] Unos USD 25: lee las 50 columnas completas (4 TB); `LIMIT` no reduce lo leído
- [ ] USD 6,25 fijo por consulta
- [ ] Nada, las consultas son gratis
:::

:::ejercicio quiz
¿Qué servicio de Google Cloud es el equivalente de **Amazon Kinesis** o **Azure Event Hubs**?

- [ ] Dataproc
- [ ] Cloud Storage
- [x] Pub/Sub
- [ ] Dataform
:::

:::ejercicio quiz
Tu equipo ya usa dbt en Snowflake y migra a BigQuery. ¿Qué herramienta de Google cumple el mismo papel que dbt?

- [ ] Dataflow
- [x] Dataform (aunque dbt también funciona con BigQuery a través de `dbt-bigquery`)
- [ ] Pub/Sub
- [ ] Composer
:::
