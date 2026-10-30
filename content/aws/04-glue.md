---
titulo: Glue, catálogo, crawlers y jobs de Spark
nivel: Intermedio
duracion: 40
resumen: El Glue Data Catalog como "índice" del lago, crawlers que descubren esquemas y particiones, jobs de Spark sin servidor, job bookmarks y cuándo usar Glue o EMR.
---

## El problema que resuelve Glue

En S3 solo hay **archivos**. Para que alguien pueda escribir `SELECT * FROM ventas`, algún sistema tiene que saber:

- que la tabla `ventas` vive en `s3://lake-tienda-dev/bronze/ventas/`,
- que sus columnas son `pedido_id`, `fecha`, `canal`, `monto`…, con sus tipos,
- que está particionada por `anio` y `mes`, y qué particiones existen,
- que el formato es CSV con encabezado (o Parquet, o Iceberg).

Esa información es **metadato**, y en AWS vive en el **Glue Data Catalog**.

:::analogia El catálogo de la biblioteca
Los libros (archivos) están en los estantes de S3. El **catálogo** es el fichero que dice qué libro hay, de qué trata y en qué estante está. Athena, Redshift Spectrum, EMR y los jobs de Glue consultan el mismo catálogo, así que **defines la tabla una vez y todos la ven**.
:::

```text
Glue Data Catalog
├── base de datos: lake_bronze
│   ├── tabla: ventas     → s3://lake-tienda-dev/bronze/ventas/    (csv, particiones: anio, mes)
│   └── tabla: clientes   → s3://lake-tienda-dev/bronze/clientes/  (csv)
└── base de datos: lake_silver
    └── tabla: ventas     → s3://lake-tienda-dev/silver/ventas/    (parquet, particiones: anio, mes)
```

## Crawlers: descubrir el esquema solo

Un **crawler** recorre una ruta de S3, mira los archivos, deduce columnas, tipos y particiones, y crea o actualiza las tablas del catálogo.

```bash norun
aws glue create-database --database-input '{"Name": "lake_bronze"}'

aws glue create-crawler \
  --name crawler-bronze-ventas \
  --role GlueServiceRole-datos \
  --database-name lake_bronze \
  --targets '{"S3Targets": [{"Path": "s3://lake-tienda-dev/bronze/ventas/"}]}'

aws glue start-crawler --name crawler-bronze-ventas
aws glue get-crawler --name crawler-bronze-ventas --query Crawler.State     # RUNNING → READY
aws glue get-tables --database-name lake_bronze --query "TableList[].Name"
```

### Laboratorio: catalogar lo que subiste

Si hiciste el laboratorio de S3, el archivo de ventas ya está en `s3://lake-tienda-dev/bronze/ventas/anio=2024/mes=12/`. Ahora cataloguémoslo:

```bash
aws glue create-database --database-input '{"Name": "lake_bronze"}'
aws glue create-crawler --name crawler-ventas --role GlueServiceRole-datos --database-name lake_bronze --targets '{"S3Targets": [{"Path": "s3://lake-tienda-dev/bronze/ventas/"}]}'
aws glue start-crawler --name crawler-ventas
aws glue get-tables --database-name lake_bronze --query "TableList[].{Tabla:Name, Ubicacion:StorageDescriptor.Location}" --output table
```

:::cuidado Crawlers: útiles, pero no mágicos
- Si en una carpeta mezclas archivos con **esquemas distintos**, el crawler puede crear varias tablas raras o columnas `col0, col1`.
- Correr un crawler cada 5 minutos sobre millones de archivos cuesta. En silver/gold, donde tú controlas el esquema, es mejor **definir la tabla con DDL** (`CREATE EXTERNAL TABLE`) o que el propio job la registre (Iceberg lo hace), y usar crawlers para bronze, donde llegan datos de terceros.
:::

## Jobs de Glue: Spark sin administrar servidores

Un **Glue job** es un script de PySpark (o Python puro, o Ray) que AWS ejecuta en un cluster que levanta y apaga por ti. Pagas por **DPU-hora** (1 DPU ≈ 4 vCPU y 16 GB) solo mientras el job corre.

| Parámetro | Qué significa |
|---|---|
| `--glue-version` | Qué versión de Spark y Python usa el job. Según las notas de versión de AWS: Glue 4.0 = Spark 3.3, Glue 5.0 = Spark 3.5.4, **Glue 5.1 = Spark 3.5.6 (la que se usa si no indicas versión)** y Glue 6.0 = Spark 4.1 (con el modo ANSI de Spark 4) |
| `--worker-type` | `G.1X`, `G.2X`… tamaño de cada worker |
| `--number-of-workers` | Cuántos workers (más = más rápido y más caro) |
| `--job-bookmark-option` | `job-bookmark-enable` para procesar solo archivos nuevos |

Este es el esqueleto de un job real. Fíjate que el corazón es **PySpark normal**:

```python norun
import sys
from awsglue.utils import getResolvedOptions
from awsglue.context import GlueContext
from awsglue.job import Job
from pyspark.context import SparkContext
from pyspark.sql import functions as F

args = getResolvedOptions(sys.argv, ["JOB_NAME", "fecha"])   # parámetros del job
glue = GlueContext(SparkContext.getOrCreate())
spark = glue.spark_session
job = Job(glue); job.init(args["JOB_NAME"], args)

# 1) leer bronze desde el catálogo (o spark.read.csv("s3://..."))
bronze = spark.table("lake_bronze.ventas")

# 2) transformar: lo mismo que aprendiste en el módulo de PySpark
silver = (bronze
          .filter(F.col("estado") != "cancelado")
          .withColumn("fecha", F.to_date("fecha"))
          .dropDuplicates(["pedido_id"]))

# 3) escribir silver particionado en Parquet
(silver.write.mode("overwrite")
       .partitionBy("anio", "mes")
       .parquet("s3://lake-tienda-dev/silver/ventas/"))

job.commit()   # guarda el "bookmark": la próxima vez solo procesa lo nuevo
```

```bash norun
aws glue create-job --name etl-ventas-silver --role GlueServiceRole-datos \
  --command '{"Name": "glueetl", "ScriptLocation": "s3://lake-tienda-dev/scripts/ventas_silver.py", "PythonVersion": "3"}' \
  --glue-version 5.1 --worker-type G.1X --number-of-workers 5 \
  --default-arguments '{"--job-bookmark-option": "job-bookmark-enable"}'

aws glue start-job-run --job-name etl-ventas-silver --arguments '{"--fecha": "2024-12-31"}'
aws glue get-job-runs --job-name etl-ventas-silver --query "JobRuns[].{Id:Id, Estado:JobRunState, Segundos:ExecutionTime}" --output table
```

:::nota DynamicFrame vs DataFrame
Glue trae su propio tipo, `DynamicFrame`, que tolera esquemas inconsistentes (una columna que a veces es número y a veces texto). En la práctica la mayoría de los equipos convierten enseguida a `DataFrame` (`dyf.toDF()`) y trabajan con PySpark estándar, que es lo que ya sabes.
:::

```recorrido
titulo: Del archivo en S3 a una tabla que se puede consultar
estacion s3: Archivos en S3 | icono=archivo
estacion crawler: Crawler | icono=lupa
estacion catalogo: Data Catalog | icono=libro
estacion job: Job de Glue | icono=chispa
estacion consulta: Consultar | icono=check
paso s3: Solo hay archivos
En S3 hay un CSV, pero ningún servicio sabe todavía qué columnas tiene ni de qué tipo. Sin esa información, nadie puede hacer `SELECT`.
>>> csv
venta_id,fecha,producto,monto
1,2024-12-30,Notebook,1044.99
2,2024-12-31,Mouse,25.5
3,2024-12-31,Teclado,49.9
paso crawler: El crawler lee y adivina el esquema
El crawler recorre la ruta, lee una muestra de los archivos y deduce columnas, tipos y particiones. Mientras trabaja está en `RUNNING`; al terminar vuelve a `READY`.
>>> bash
aws glue start-crawler --name crawler-ventas
aws glue get-crawler --name crawler-ventas --query Crawler.State   # RUNNING … READY
paso catalogo: Queda registrada una tabla
El resultado no son datos nuevos: es **metadata** en el Data Catalog (nombre, columnas, tipos y dónde están los archivos). Los datos siguen en S3.
>>> log
$ aws glue get-tables --database-name lake_bronze \
    --query "TableList[].{Tabla:Name, Ubicacion:StorageDescriptor.Location}" --output table
Tabla   Ubicacion
------  -----------------------------------
ventas  s3://lake-tienda-dev/bronze/ventas/
paso job: Un job de Glue transforma
El job (Spark sin servidores que administrar) lee la tabla bronze, limpia y escribe Parquet en silver. Se le pasa la fecha como argumento para que sea idempotente.
>>> bash
aws glue start-job-run --job-name etl-ventas-silver --arguments '{"--fecha": "2024-12-31"}'
paso consulta: Cualquier servicio puede leerla
Athena, EMR, Redshift Spectrum y los jobs de Glue usan el **mismo** catálogo: la tabla se define una vez y se consulta desde todos.
>>> sql
SELECT fecha, SUM(monto) AS ventas
FROM lake_bronze.ventas
GROUP BY fecha;
```

## ¿Glue, EMR, EMR Serverless o Lambda?

| Situación | Elección típica | Por qué |
|---|---|---|
| ETL batch diario de GB a pocos TB, equipo chico | **Glue** | Sin servidores, se integra con el catálogo, pagas por minuto |
| Jobs enormes, librerías especiales, control fino de Spark, costo a gran escala | **EMR** (en EC2 o EKS) | Eliges instancias, usas *spot* (hasta 90 % más barato) |
| Spark sin cluster pero con más control que Glue | **EMR Serverless** | Lo mejor de los dos para muchos casos |
| Archivo chico que llega y hay que validar o mover | **Lambda** | Arranca en milisegundos, máximo 15 min |
| SQL sobre datos ya catalogados | **Athena** (CTAS / INSERT INTO) | Ni siquiera necesitas Spark |

## Practica la lógica del job en PySpark

Los jobs de Glue son PySpark. Este ejercicio corre en el simulador de Spark del curso, con los datos del **banco** (caso 🏦).

:::ejercicio pyspark titulo="Job bronze → silver del banco"
Escribe la transformación de un job que prepara `banco_transacciones` para silver: conserva solo las **compras** (`tipo == 'compra'`), agrega la columna `fecha` (la parte de fecha de `fecha_hora`, como texto `YYYY-MM-DD`) y `mes` (`YYYY-MM`), y deja las columnas `tx_id`, `cuenta_id`, `fecha`, `mes`, `monto`, `canal`, `comercio`. Guarda el DataFrame en `resultado`.
```python solucion
from pyspark.sql import functions as F

resultado = (spark.table("banco_transacciones")
               .filter(F.col("tipo") == "compra")
               .withColumn("fecha", F.substring("fecha_hora", 1, 10))
               .withColumn("mes", F.substring("fecha_hora", 1, 7))
               .select("tx_id", "cuenta_id", "fecha", "mes", "monto", "canal", "comercio"))
```
```pista
`F.substring("fecha_hora", 1, 10)` toma los primeros 10 caracteres (la fecha). Para el mes, los primeros 7.
```
:::

:::ejercicio pyspark titulo="Tabla gold: gasto mensual por canal"
A partir de las compras de `banco_transacciones`, construye la tabla gold con el gasto por `mes` (`YYYY-MM`) y `canal`: `compras` (cantidad), `monto_total` y `ticket_promedio`, ambos **en positivo** (en la tabla, los egresos tienen `monto` negativo) y redondeados a 2. Guarda en `resultado`.
```python solucion
from pyspark.sql import functions as F

resultado = (spark.table("banco_transacciones")
               .filter(F.col("tipo") == "compra")
               .withColumn("mes", F.substring("fecha_hora", 1, 7))
               .groupBy("mes", "canal")
               .agg(F.count("*").alias("compras"),
                    F.round(F.sum(-F.col("monto")), 2).alias("monto_total"),
                    F.round(F.avg(-F.col("monto")), 2).alias("ticket_promedio")))
```
:::

## Ejercicios de terminal

:::ejercicio cli
Crea en el Glue Data Catalog la base de datos `lake_silver`.
```respuesta
todos: aws glue create-database || --database-input ['"]\{\s*"?Name"?\s*:\s*"lake_silver"\s*\}['"]
```
```solucion
aws glue create-database --database-input '{"Name": "lake_silver"}'
```
:::

:::ejercicio cli
Crea el crawler `crawler-banco` que use el rol `GlueServiceRole-datos`, registre las tablas en la base `lake_bronze` y recorra `s3://lake-banco-dev/bronze/`.
```respuesta
todos: aws glue create-crawler || --name crawler-banco || --role GlueServiceRole-datos || --database-name lake_bronze || --targets ['"].*S3Targets.*s3://lake-banco-dev/bronze/?.*['"]
```
```solucion
aws glue create-crawler --name crawler-banco --role GlueServiceRole-datos --database-name lake_bronze --targets '{"S3Targets": [{"Path": "s3://lake-banco-dev/bronze/"}]}'
```
:::

:::ejercicio cli
Ejecuta el crawler `crawler-banco`.
```respuesta
aws glue start-crawler --name crawler-banco
```
```setup
aws s3 mb s3://lake-banco-dev
aws s3 cp datos/clientes.csv s3://lake-banco-dev/bronze/clientes/
aws glue create-crawler --name crawler-banco --role GlueServiceRole-datos --database-name lake_bronze --targets '{"S3Targets": [{"Path": "s3://lake-banco-dev/bronze/clientes/"}]}'
```
:::

:::ejercicio cli
Lista **solo los nombres** de las tablas de la base `lake_bronze`.
```respuesta
todos: aws glue get-tables || --database-name lake_bronze || --query ['"]?TableList\[\]\.Name['"]?
```
```solucion
aws glue get-tables --database-name lake_bronze --query "TableList[].Name"
```
```setup
aws s3 mb s3://lake-banco-dev
aws s3 cp datos/clientes.csv s3://lake-banco-dev/bronze/clientes/
aws glue create-crawler --name crawler-banco --role GlueServiceRole-datos --database-name lake_bronze --targets '{"S3Targets": [{"Path": "s3://lake-banco-dev/bronze/clientes/"}]}'
aws glue start-crawler --name crawler-banco
```
:::

:::ejercicio cli
Ejecuta el job de Glue `etl-ventas-silver` pasándole el argumento `--fecha` con el valor `2024-12-31`.
```respuesta
todos: aws glue start-job-run || --job-name etl-ventas-silver || --arguments ['"]\{\s*"--fecha"\s*:\s*"2024-12-31"\s*\}['"]
```
```solucion
aws glue start-job-run --job-name etl-ventas-silver --arguments '{"--fecha": "2024-12-31"}'
```
:::

:::ejercicio quiz
Llegan cada hora miles de archivos nuevos a `bronze/eventos/`. ¿Qué evita que el job de Glue reprocese todo el histórico cada vez?

- [ ] Aumentar el número de workers
- [x] Activar **job bookmarks** (`job-bookmark-enable`) o filtrar por la partición de la fecha
- [ ] Correr un crawler antes
- [ ] Usar CSV en lugar de Parquet
:::

:::ejercicio quiz
Un analista crea una tabla en el Glue Data Catalog. ¿Desde dónde podrá consultarla sin redefinirla?

- [ ] Solo desde Glue
- [ ] Solo desde Athena
- [x] Desde Athena, Redshift Spectrum, EMR y los jobs de Glue: todos comparten el catálogo
- [ ] Desde ningún lado: hay que copiar los datos
:::

:::ejercicio quiz
Tu job procesa 40 TB por noche, usa librerías nativas especiales y el costo es lo más importante. ¿Qué eliges?

- [ ] Lambda
- [ ] Glue con 2 workers
- [x] EMR con instancias *spot* (o EMR on EKS), donde controlas las máquinas y Spark
- [ ] Athena
:::
