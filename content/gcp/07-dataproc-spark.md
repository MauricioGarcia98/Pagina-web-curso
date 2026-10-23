---
titulo: Dataproc, Spark en Google Cloud
nivel: Avanzado
duracion: 40
resumen: Clusters de Dataproc, jobs de PySpark, Dataproc Serverless, el conector de BigQuery, buenas prácticas de costo y ejercicios de PySpark con los casos de negocio.
---

## Qué es Dataproc

**Dataproc** es Spark (y Hadoop, Hive, Presto, Flink) administrado en Google Cloud. Crea un cluster en ~90 segundos, ejecuta tu job y se apaga. Es el equivalente de **EMR** en AWS.

| Modalidad | Para qué |
|---|---|
| **Cluster** (en Compute Engine) | Control total: tipo de máquina, workers *preemptible/spot*, librerías, inicialización |
| **Dataproc Serverless** (*batches*) | Envías el script de PySpark y Google pone y saca los recursos |
| **Dataproc on GKE** | Spark sobre Kubernetes |

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

```bash
gcloud dataproc clusters create spark-etl --region us-central1 --num-workers 2
gcloud dataproc clusters list --region us-central1
gcloud dataproc jobs submit pyspark gs://lake-tienda-dev/scripts/silver.py --cluster spark-etl --region us-central1
gcloud dataproc clusters delete spark-etl --region us-central1
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

:::tip ¿Dataproc o BigQuery?
Si la transformación se puede escribir en SQL y los datos ya están en BigQuery, **hazla en BigQuery** (o con Dataform/dbt): menos piezas, nada que apagar. Usa Dataproc cuando necesitas Spark de verdad: librerías de Python/ML, lógica compleja que no cabe en SQL, procesar archivos enormes en GCS, o migrar jobs de Spark/Hadoop existentes sin reescribirlos.
:::

:::cuidado El cluster olvidado
Igual que con EMR: un cluster encendido sin trabajo cuesta igual. Usa `--max-idle`, clusters efímeros creados por Composer, o Serverless.
:::

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
