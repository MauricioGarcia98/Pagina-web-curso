---
titulo: AWS para data engineers en 25 minutos
nivel: Básico
duracion: 25
resumen: Qué es AWS, cuentas, regiones y zonas, el mapa de servicios de datos, cuánto cuesta y cómo se compara con Azure y Google Cloud.
---

## Primero, la idea en una frase

**AWS (Amazon Web Services)** es la nube de Amazon: en lugar de comprar servidores y discos, **alquilas** almacenamiento y capacidad de cómputo por minuto, y **pagas solo lo que usas**. Es la nube con más participación de mercado, así que es la que más vas a ver en ofertas de trabajo.

:::analogia La nube como un edificio de oficinas con servicios
Montar tu propio centro de datos es como construir un edificio: caro, lento y tienes que mantenerlo. La nube es alquilar una oficina amueblada: llegas, prendes la luz (creas un recurso), trabajas y pagas la factura del mes. Si mañana necesitas diez oficinas más, las tienes en minutos; si ya no las usas, las devuelves.
:::

## Cómo está organizado AWS

```text
Organización (AWS Organizations)          ← la empresa: agrupa cuentas y aplica reglas
 └── Cuentas (account)  123456789012      ← unidad de facturación y de aislamiento: datos-dev, datos-prod
      └── Regiones  us-east-1, sa-east-1   ← lugares del mundo
           └── Zonas de disponibilidad      ← centros de datos separados dentro de la región (us-east-1a, 1b…)
                └── Recursos                ← un bucket S3, un job de Glue, un cluster EMR…
```

- **Cuenta**: es el equivalente a la *suscripción* de Azure o al *proyecto* de Google Cloud. Las empresas separan **dev**, **staging** y **prod** en cuentas distintas para que un error en desarrollo nunca toque producción.
- **Región**: un lugar físico (`us-east-1` Virginia, `sa-east-1` São Paulo, `mx-central-1` México, `eu-west-1` Irlanda). Los datos **no salen** de la región salvo que tú los copies, algo clave para leyes de privacidad.
- **Zona de disponibilidad (AZ)**: cada región tiene 3 o más centros de datos independientes. Los servicios administrados (S3, Glue, Athena) ya replican entre zonas por ti.
- **ARN** (*Amazon Resource Name*): el "DNI" de cada recurso, por ejemplo `arn:aws:s3:::lake-tienda-prod` o `arn:aws:glue:us-east-1:123456789012:database/lake_silver`.

## El mapa de servicios de datos

Lo que hace un data engineer en AWS casi siempre sigue este recorrido:

```text
 FUENTES             INGESTA                 ALMACENAMIENTO          PROCESO                  CONSUMO
 apps, APIs,  ──►  Kinesis / Firehose  ──►   S3 (data lake)   ──►   Glue (Spark)       ──►  Athena (SQL)
 bases, logs       DMS (bases de datos)      bronze/silver/gold      EMR (Spark/Hadoop)       Redshift (warehouse)
                   Lambda, AppFlow           Glue Data Catalog       Lambda (eventos)         QuickSight (BI)
                                             Lake Formation          dbt / Redshift           SageMaker (ML)
                         ORQUESTACIÓN: Step Functions · MWAA (Airflow) · EventBridge
```

| Servicio | Para qué lo usa un data engineer | Analogía |
|---|---|---|
| **S3** | Guardar archivos (CSV, JSON, Parquet, Delta, Iceberg): es el data lake | Un disco infinito y barato |
| **Glue Data Catalog** | El "índice" de qué tablas hay en S3, sus columnas y particiones | El catálogo de una biblioteca |
| **Glue (jobs y crawlers)** | Correr Spark sin administrar servidores; descubrir el esquema de archivos | Spark "de alquiler por minuto" |
| **Athena** | Consultar con SQL los archivos de S3, sin servidor, pagando por TB leído | Un buscador SQL sobre el lago |
| **Redshift** | Data warehouse columnar para BI con muchas consultas concurrentes | Una biblioteca ordenada para leer rápido |
| **EMR** | Clusters de Spark/Hive/Presto que controlas tú (o EMR Serverless) | Tu propio taller de Spark |
| **Kinesis / Firehose / MSK** | Ingesta de eventos en tiempo real (MSK = Kafka administrado) | Una cinta transportadora |
| **Lambda** | Funciones cortas que reaccionan a eventos (llegó un archivo → procesarlo) | Un timbre que dispara una acción |
| **Step Functions / MWAA** | Orquestar pasos; MWAA es Airflow administrado | El director de orquesta |
| **IAM / Lake Formation** | Quién puede hacer qué; permisos finos sobre tablas y columnas | Las llaves del edificio |
| **DMS** | Copiar bases de datos (incluido CDC: los cambios en vivo) | Una mudanza sin cerrar la tienda |

## Las tres nubes lado a lado

En este curso vas a ver Azure, AWS y Google Cloud. Los conceptos son **los mismos**; cambian los nombres:

| Concepto | AWS | Azure | Google Cloud |
|---|---|---|---|
| Contenedor de recursos y factura | Cuenta | Suscripción + grupo de recursos | Proyecto |
| Almacenamiento de objetos (lago) | S3 | ADLS Gen2 / Blob | Cloud Storage (GCS) |
| Catálogo de tablas | Glue Data Catalog | Unity Catalog / Purview | Dataplex / BigQuery |
| SQL sin servidor sobre el lago | Athena | Synapse serverless / Fabric | BigQuery (tablas externas) |
| Data warehouse | Redshift | Synapse / Fabric Warehouse | BigQuery |
| Spark administrado | Glue, EMR | Databricks, Synapse Spark | Dataproc |
| Streaming | Kinesis, MSK | Event Hubs | Pub/Sub |
| Funciones por evento | Lambda | Functions | Cloud Functions / Run |
| Airflow administrado | MWAA | Data Factory (Airflow) | Composer |
| Identidad | IAM | Entra ID + RBAC | IAM |
| CLI | `aws` | `az` | `gcloud`, `bq`, `gsutil` |

:::experto Lo que piden en las entrevistas
No te van a preguntar "qué botón aprietas". Te van a preguntar **por qué** elegiste un servicio: "¿Athena o Redshift para este caso?", "¿Glue o EMR?", "¿cómo particionas en S3 para que Athena cueste menos?". Este módulo está armado alrededor de esas decisiones.
:::

## Cuánto cuesta (y cómo no llevarte un susto)

AWS cobra por tres cosas: **almacenamiento** (GB por mes), **cómputo** (segundos o minutos encendidos) y **transferencia** (datos que salen de AWS o cruzan regiones). Precios orientativos en `us-east-1`:

| Servicio | Precio aproximado | Qué lo hace subir |
|---|---|---|
| S3 Standard | ~USD 0,023 por GB/mes | Muchos archivos chiquitos (cobran por petición), no borrar lo viejo |
| Athena | ~USD 5 por **TB escaneado** | Consultar CSV sin particionar con `SELECT *` |
| Glue | ~USD 0,44 por DPU-hora | Jobs con demasiados workers |
| Redshift Serverless | por RPU-hora mientras consulta | Dashboards que consultan cada minuto |
| Transferencia saliente | ~USD 0,09 por GB | Copiar el lago a otra nube o región |

:::cuidado Las tres sorpresas clásicas en la factura
1. Un **cluster EMR** o un **endpoint** que quedó encendido el fin de semana.
2. Una consulta de Athena con `SELECT *` sobre años de CSV: lee **todo** y cobra todo.
3. Un **NAT Gateway** que mueve terabytes. Configura **AWS Budgets** con una alerta por email el primer día.
:::

:::tip Capa gratuita
AWS tiene una capa gratuita (*Free Tier*) para aprender. Aun así, crea una alerta de presupuesto de USD 5 y borra lo que crees al terminar cada laboratorio. En este curso practicas en una **terminal simulada**, así que acá no gastas nada.
:::

## Ejercicios

:::ejercicio quiz
En AWS, ¿qué cumple el papel de la "suscripción" de Azure o el "proyecto" de Google Cloud?

- [ ] La región
- [x] La cuenta
- [ ] El bucket de S3
- [ ] La zona de disponibilidad
:::

:::ejercicio quiz
Tu empresa debe guardar los datos de clientes brasileños **dentro de Brasil**. ¿Qué decides?

- [ ] Usar cualquier región: AWS mueve los datos donde convenga
- [x] Crear los recursos en la región `sa-east-1` (São Paulo); los datos no salen de la región salvo que tú los copies
- [ ] Usar una zona de disponibilidad brasileña dentro de `us-east-1`
- [ ] No se puede cumplir en la nube
:::

:::ejercicio quiz
Necesitas consultar con SQL, de vez en cuando, archivos Parquet que ya están en S3, sin administrar servidores. ¿Qué servicio es el indicado?

- [x] Athena
- [ ] EMR
- [ ] Kinesis
- [ ] DMS
:::

:::ejercicio quiz
Relaciona: quieres que **cada vez que llega un archivo** a S3 se ejecute un pequeño script en Python que lo valida. ¿Qué usas?

- [ ] Redshift
- [ ] Un cluster EMR siempre encendido
- [x] Lambda, disparada por el evento de S3
- [ ] Glue Data Catalog
:::

:::ejercicio quiz
Athena cobra ~USD 5 por TB escaneado. Una consulta lee 200 GB de CSV. Si conviertes los datos a Parquet (lee solo 3 columnas de 30) y particionas por mes (filtras 1 mes de 12), ¿aproximadamente cuánto cuesta ahora?

- [ ] USD 1,00 (lo mismo)
- [ ] USD 0,50
- [x] Unos pocos centavos: 200 GB × 3/30 × 1/12 ≈ 1,7 GB → ≈ USD 0,008 (y Parquet además comprime)
- [ ] Athena no cobra por datos leídos
```explicacion
200 GB = 0,2 TB → USD 1,00 sin optimizar. Leer 1 de cada 10 columnas y 1 de cada 12 meses deja ~1,7 GB, menos de un centavo. Esta cuenta es una de las preguntas favoritas en entrevistas.
```
:::

:::ejercicio quiz
¿Cuál es el equivalente en AWS de **Azure Event Hubs** o **Google Pub/Sub**?

- [ ] S3
- [ ] Glue
- [x] Kinesis Data Streams (o MSK si quieres Kafka)
- [ ] Athena
:::
