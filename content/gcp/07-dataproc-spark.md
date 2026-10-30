---
titulo: Dataproc, Spark en Google Cloud
nivel: Avanzado
duracion: 50
resumen: Clusters de Dataproc, jobs de PySpark, Dataproc Serverless, el conector de BigQuery, buenas prácticas de costo y ejercicios de PySpark con los casos de negocio.
---

Ya sabes escribir PySpark. La pregunta ahora es **dónde corre** cuando los datos están en Google Cloud. La respuesta es **Dataproc**: Spark administrado por Google. En esta lección vas a ver las tres formas de usarlo, cómo se ve un job real de punta a punta, cómo leer y escribir BigQuery desde Spark y, sobre todo, cómo no pagar de más.

## Qué es Dataproc

**Dataproc** es Spark (y Hadoop, Hive, Presto y Flink) administrado en Google Cloud. Crea un clúster en unos 90 segundos, ejecuta tu job y se apaga. Es el equivalente de **EMR** en AWS y de los clústeres de **Databricks**.

"Administrado" significa que no instalas Java, ni Spark, ni configuras la red entre máquinas: eliges cuántas máquinas y de qué tipo, y Google entrega un clúster listo, con el conector de Cloud Storage ya instalado (tu código lee `gs://...` como si fuera un disco).

| Modalidad | Para qué |
|---|---|
| **Cluster** (en Compute Engine) | Control total: tipo de máquina, workers *preemptible/spot*, librerías, inicialización |
| **Dataproc Serverless** (*batches*) | Envías el script de PySpark y Google pone y saca los recursos |
| **Dataproc on GKE** | Spark sobre Kubernetes, para empresas que ya administran todo en Kubernetes |

### Las piezas de un clúster

```text
                ┌─────────────────────────┐
                │  MASTER (1 máquina)     │  ← corre el driver de Spark y YARN
                └───────────┬─────────────┘
       ┌────────────────────┼────────────────────┐
┌──────▼──────┐      ┌──────▼──────┐      ┌──────▼──────────────────┐
│ WORKER 1    │      │ WORKER 2    │      │ SECONDARY WORKERS (spot)│ ← baratos, pueden
│ (primario)  │      │ (primario)  │      │ ×4, solo cómputo        │   desaparecer
└─────────────┘      └─────────────┘      └─────────────────────────┘
```

- **Master**: coordina. Ahí corre el driver de Spark (lo que viste en "Arquitectura de Spark").
- **Workers primarios**: máquinas normales. Corren executors y además guardan datos intermedios (shuffle) en su disco.
- **Workers secundarios**: solo cómputo. Normalmente son **spot**: máquinas que Google te presta con un 60–90 % de descuento, a cambio de poder **quitártelas** en cualquier momento. Si Google se lleva una, Spark recalcula sus tareas en otra (gracias al linaje). Son ideales para sumar potencia barata en jobs batch.

## Los comandos

```bash norun
gcloud dataproc clusters create spark-etl --region us-central1 \
  --num-workers 2 --worker-machine-type n2-standard-4 \
  --secondary-worker-type spot --num-secondary-workers 4 \
  --max-idle 30m                                         # se borra solo tras 30 minutos sin jobs

gcloud dataproc jobs submit pyspark gs://lake-tienda-dev/scripts/silver.py \
  --cluster spark-etl --region us-central1 -- --fecha 2024-12-31

gcloud dataproc batches submit pyspark gs://lake-tienda-dev/scripts/silver.py \
  --region us-central1 --deps-bucket gs://lake-tienda-dev/deps -- --fecha 2024-12-31

gcloud dataproc clusters delete spark-etl --region us-central1
```

Qué hace cada parámetro de `clusters create`:

| Parámetro | Significado |
|---|---|
| `--region us-central1` | Dónde se crea. Que sea **la misma región que tus buckets y BigQuery** |
| `--num-workers 2` | Workers primarios (el mínimo para un clúster estándar es 2) |
| `--worker-machine-type n2-standard-4` | Cada worker con 4 vCPU y 16 GB de RAM |
| `--secondary-worker-type spot` y `--num-secondary-workers 4` | 4 workers extra, baratos e interrumpibles |
| `--max-idle 30m` | Si pasan 30 minutos sin jobs, el clúster **se borra solo** |
| `--single-node` | Todo en una máquina: ideal para desarrollo y pruebas chicas |
| `--initialization-actions gs://.../instalar.sh` | Script que corre en cada máquina al crearse (instalar librerías) |

En `jobs submit pyspark`, todo lo que va **después de `--`** se le pasa a **tu script** como argumentos (`--fecha 2024-12-31`), no a gcloud.

### Laboratorio en la terminal

```bash
gcloud auth login
gcloud config set project academia-datos-dev
gcloud dataproc clusters create spark-etl --region us-central1 --num-workers 2
gcloud dataproc clusters list --region us-central1
gcloud dataproc jobs submit pyspark gs://lake-tienda-dev/scripts/silver.py --cluster spark-etl --region us-central1
gcloud dataproc clusters delete spark-etl --region us-central1
```

Fíjate en el orden: **crear → ejecutar → borrar**. Ese es el patrón de **clúster efímero**, el más recomendado: el clúster existe solo mientras hay trabajo. Si intentas enviar el job después de borrar el clúster, el simulador responde `NOT_FOUND`, igual que Google Cloud.

## Cómo se ve un job real

El script vive en un bucket. Recibe la fecha como argumento, lee de bronze en GCS y escribe silver. Es PySpark normal, el mismo que aprendiste en el módulo de PySpark:

```python norun
# gs://lake-tienda-dev/scripts/silver.py
import argparse
from pyspark.sql import SparkSession, functions as F

parser = argparse.ArgumentParser()
parser.add_argument("--fecha", required=True)          # llega desde: -- --fecha 2024-12-31
args = parser.parse_args()

spark = SparkSession.builder.appName(f"silver_ventas_{args.fecha}").getOrCreate()

crudo = (spark.read.option("header", True)
         .csv(f"gs://lake-tienda-dev/bronze/ventas/fecha={args.fecha}/"))

limpio = (crudo
    .withColumn("total", F.col("total").cast("double"))
    .withColumn("fecha_pedido", F.to_date("fecha_pedido"))
    .filter(F.col("total") > 0)
    .dropDuplicates(["pedido_id"]))

(limpio.write.mode("overwrite")
   .parquet(f"gs://lake-tienda-dev/silver/ventas/fecha={args.fecha}/"))   # idempotente: sobrescribe el día
```

Tres detalles de producción en este script:

1. **La fecha es un parámetro**: así Composer (Airflow) puede relanzar cualquier día sin tocar el código.
2. **Escribe en la carpeta del día con `overwrite`**: correrlo dos veces da el mismo resultado (idempotencia).
3. **No hay rutas locales**: todo es `gs://`. El disco de las máquinas del clúster desaparece al borrarlo.

## Dataproc Serverless: sin clústeres

Con `gcloud dataproc batches submit` no creas ni borras nada. Envías el script y Google:

1. Levanta los recursos necesarios (tarda unos 60 segundos en arrancar).
2. **Escala solo** según la carga del job.
3. Los libera al terminar. Pagas por lo que usó el job, medido en *DCU-hora* (unidades de cómputo) y almacenamiento de shuffle.

| | Clúster | Serverless |
|---|---|---|
| Arranque | ~90 s (o 0 si ya está encendido) | ~60 s cada vez |
| Configuración | Tú eliges máquinas, spot, librerías | Casi nada que configurar |
| Riesgo de pagar sin usar | Sí, si te olvidas de apagarlo | No |
| Ideal para | Muchos jobs seguidos, notebooks interactivos, configuraciones especiales | Jobs batch programados |

Para jobs nocturnos programados, **Serverless suele ser la opción por defecto** hoy.

```recorrido
titulo: Cluster o Serverless: qué pasa con las máquinas en cada caso
estacion crear: Crear cluster | icono=servidor
estacion job: Enviar el job | icono=chispa
estacion borrar: Borrar | icono=x
estacion batch: Batch serverless | icono=flujo
estacion res: Cuál elegir | icono=check
paso crear: Con un cluster: primero lo creas
Eliges cantidad y tipo de máquinas. Desde que el cluster existe, **se cobra**, aunque no esté procesando nada.
>>> bash
gcloud dataproc clusters create spark-etl --region us-central1 \
    --num-workers 2 --worker-machine-type n2-standard-4
paso job: Envías el script
El script de PySpark está en Cloud Storage; Dataproc lo ejecuta en el cluster.
>>> bash
gcloud dataproc jobs submit pyspark gs://lake-tienda-dev/scripts/silver.py \
    --cluster spark-etl --region us-central1
paso borrar: Y te acuerdas de borrarlo
Si te olvidas, el cluster sigue cobrando toda la noche. (Existe la opción de borrado automático por inactividad, `--max-idle`, justamente por eso.)
>>> bash
gcloud dataproc clusters delete spark-etl --region us-central1
paso batch: Serverless: un solo comando
Con un *batch*, Google pone las máquinas, ejecuta el script y las saca. Pagas por los recursos que usó el job, nada más.
>>> log
$ gcloud dataproc batches submit pyspark gs://lake-tienda-dev/scripts/silver.py --region us-central1
Batch [fa32ff7fc78d1d89] submitted.
…
state: SUCCEEDED
paso res: Cuál elegir
Jobs programados que corren y terminan → Serverless. Muchos jobs seguidos, notebooks interactivos o configuraciones especiales → un cluster (efímero si se puede).
>>> texto
job que corre y termina      → batches (Serverless)
uso continuo / interactivo    → cluster
cluster olvidado encendido    → la factura sorpresa
```

## Spark + BigQuery

El **conector de BigQuery** permite leer y escribir tablas de BigQuery desde Spark como si fueran archivos:

```python norun
df = (spark.read.format("bigquery")
      .option("table", "academia-datos-dev.tienda_silver.pedidos")
      .option("filter", "fecha_pedido >= '2024-12-01'")     # se empuja a BigQuery: lee menos
      .load())

resultado = df.groupBy("canal").count()

(resultado.write.format("bigquery")
   .option("table", "academia-datos-dev.tienda_gold.pedidos_por_canal")
   .option("temporaryGcsBucket", "lake-tienda-dev-tmp")
   .mode("overwrite")
   .save())
```

Cómo funciona por dentro:

- **Leer**: el conector usa la *BigQuery Storage Read API*, que manda los datos en paralelo, directo a los executors, y solo de las columnas que usas. El `filter` se aplica **dentro de BigQuery**, así que viaja menos información (y BigQuery cobra por bytes leídos).
- **Escribir**: Spark escribe archivos temporales en `temporaryGcsBucket` y después le pide a BigQuery que los cargue en la tabla, en una sola operación. Por eso ese bucket es obligatorio (o usas el método `direct`, que escribe sin pasar por GCS).

:::tip ¿Dataproc o BigQuery?
Si la transformación se puede escribir en SQL y los datos ya están en BigQuery, **hazla en BigQuery** (o con Dataform/dbt): menos piezas, nada que apagar. Usa Dataproc cuando necesitas Spark de verdad: librerías de Python/ML, lógica compleja que no cabe en SQL, procesar archivos enormes en GCS, o migrar jobs de Spark/Hadoop existentes sin reescribirlos.
:::

## Costos: cuánto cuesta y cómo pagar menos

Un clúster de 1 master y 2 workers `n2-standard-4` cuesta, como referencia, alrededor de **0,70 USD por hora** (máquinas + recargo de Dataproc). Parece poco:

- Encendido solo durante un job nocturno de 1 hora: unos **21 USD al mes**.
- Encendido 24/7 "por las dudas": unos **510 USD al mes**, por el mismo trabajo.

Las palancas para pagar menos:

1. **Clústeres efímeros** creados y borrados por el orquestador, o **Serverless**.
2. **`--max-idle`** como red de seguridad en todo clúster manual.
3. **Workers spot** para la potencia extra.
4. **Autoscaling** (`--autoscaling-policy`): el clúster crece cuando hay mucho trabajo y se achica cuando no.
5. Lo mismo que en cualquier Spark: **leer menos** (Parquet, particiones, filtros), porque menos datos = menos máquinas por menos tiempo.

:::cuidado El cluster olvidado
Igual que con EMR: un cluster encendido sin trabajo cuesta igual. Usa `--max-idle`, clusters efímeros creados por Composer, o Serverless.
:::

### El patrón con Composer (Airflow)

En producción, nadie escribe estos comandos a mano: los ejecuta un DAG de Composer.

```python norun
from airflow.providers.google.cloud.operators.dataproc import (
    DataprocCreateClusterOperator, DataprocSubmitJobOperator, DataprocDeleteClusterOperator)

crear = DataprocCreateClusterOperator(task_id="crear_cluster", cluster_name="etl-{{ ds_nodash }}", ...)
correr = DataprocSubmitJobOperator(task_id="silver", job={"pyspark_job": {
    "main_python_file_uri": "gs://lake-tienda-dev/scripts/silver.py", "args": ["--fecha", "{{ ds }}"]}}, ...)
borrar = DataprocDeleteClusterOperator(task_id="borrar_cluster", trigger_rule="all_done", ...)
crear >> correr >> borrar
```

Fíjate en `trigger_rule="all_done"` en `borrar_cluster`: el clúster **se borra aunque el job falle**. Es exactamente lo que viste en la lección de control de flujo de Airflow.

## Ejercicios de PySpark con los casos

Estos ejercicios corren en el simulador de Spark del curso, con las tablas de los casos de negocio.

:::ejercicio pyspark titulo="Streaming 🎧: minutos escuchados por género"
Con `streaming_reproducciones` y `streaming_contenidos`, calcula por `genero`: `reproducciones` (cantidad) y `minutos` (suma de `segundos_escuchados` / 60, redondeado a 1). Guarda en `resultado`.
```python solucion
from pyspark.sql import functions as F

r = spark.table("streaming_reproducciones")
c = spark.table("streaming_contenidos").select("contenido_id", "genero")
resultado = (r.join(c, "contenido_id")
               .groupBy("genero")
               .agg(F.count("*").alias("reproducciones"),
                    F.round(F.sum("segundos_escuchados") / 60, 1).alias("minutos")))
```
:::

:::ejercicio pyspark titulo="Vuelos ✈️: demora promedio por ruta"
Con `vuelos_vuelos` (sin los `cancelado`), calcula por `origen` y `destino`: `vuelos` y `demora_prom_min`, el promedio de minutos entre `salida_programada` y `salida_real` (redondeado a 1). Pista: `F.unix_timestamp(col)` da segundos. Guarda en `resultado`.
```python solucion
from pyspark.sql import functions as F

v = spark.table("vuelos_vuelos").filter(F.col("estado") != "cancelado")
resultado = (v.withColumn("demora", (F.unix_timestamp("salida_real") - F.unix_timestamp("salida_programada")) / 60)
               .groupBy("origen", "destino")
               .agg(F.count("*").alias("vuelos"),
                    F.round(F.avg("demora"), 1).alias("demora_prom_min")))
```
:::

:::ejercicio pyspark titulo="Movilidad 🚕: ranking de conductores por ciudad"
Con los viajes `completado` de `viajes_viajes`, calcula por `ciudad` y `conductor_id` los `viajes` y la `facturacion` (suma de `tarifa`, redondeada a 2), y quédate con los **3 conductores con más facturación** de cada ciudad, agregando `puesto` (1 a 3, con `row_number` ordenando por facturación descendente y luego `conductor_id`). Columnas: `ciudad`, `conductor_id`, `viajes`, `facturacion`, `puesto`. Guarda en `resultado`.
```python solucion
from pyspark.sql import functions as F
from pyspark.sql.window import Window

base = (spark.table("viajes_viajes")
          .filter(F.col("estado") == "completado")
          .groupBy("ciudad", "conductor_id")
          .agg(F.count("*").alias("viajes"), F.round(F.sum("tarifa"), 2).alias("facturacion")))
w = Window.partitionBy("ciudad").orderBy(F.col("facturacion").desc(), F.col("conductor_id"))
resultado = (base.withColumn("puesto", F.row_number().over(w))
                 .filter(F.col("puesto") <= 3)
                 .select("ciudad", "conductor_id", "viajes", "facturacion", "puesto"))
```
:::

## Ejercicios de terminal

:::ejercicio cli
Crea el cluster de Dataproc `spark-etl` en la región `us-central1` con 2 workers.
```respuesta
todos: gcloud dataproc clusters create spark-etl || --region[= ]us-central1 || --num-workers[= ]2
```
```solucion
gcloud dataproc clusters create spark-etl --region us-central1 --num-workers 2
```
:::

:::ejercicio cli
Envía al cluster `spark-etl` (región `us-central1`) el job de PySpark `gs://lake-tienda-dev/scripts/silver.py`.
```respuesta
todos: gcloud dataproc jobs submit pyspark gs://lake-tienda-dev/scripts/silver\.py || --cluster[= ]spark-etl || --region[= ]us-central1
```
```solucion
gcloud dataproc jobs submit pyspark gs://lake-tienda-dev/scripts/silver.py --cluster spark-etl --region us-central1
```
```setup
gcloud dataproc clusters create spark-etl --region us-central1 --num-workers 2
```
:::

:::ejercicio cli
Ejecuta el mismo script con **Dataproc Serverless** (sin cluster) en `us-central1`.
```respuesta
todos: gcloud dataproc batches submit pyspark gs://lake-tienda-dev/scripts/silver\.py || --region[= ]us-central1
```
```solucion
gcloud dataproc batches submit pyspark gs://lake-tienda-dev/scripts/silver.py --region us-central1
```
:::

:::ejercicio cli
Borra el cluster `spark-etl` de la región `us-central1`.
```respuesta
todos: gcloud dataproc clusters delete spark-etl || --region[= ]us-central1( (--quiet|-q))?
```
```solucion
gcloud dataproc clusters delete spark-etl --region us-central1
```
```setup
gcloud dataproc clusters create spark-etl --region us-central1 --num-workers 2
```
:::

:::ejercicio quiz
Los datos ya están en BigQuery y la transformación es un `JOIN` con `GROUP BY`. ¿Qué es lo más simple?

- [ ] Un cluster de Dataproc siempre encendido
- [x] Hacerla en BigQuery con SQL (programada con Dataform, dbt o Composer)
- [ ] Exportar a CSV y procesar en tu laptop
- [ ] Dataflow en streaming
:::
