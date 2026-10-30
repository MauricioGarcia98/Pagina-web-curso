# area: Spark

## Spark
alias: Apache Spark
nino: Imagina que tienes que **contar todas las hojas de un bosque**. Solo te llevaría años. Spark es como reunir a 100 amigos, darle a cada uno un pedazo del bosque y después sumar lo que contó cada uno. Termina muchísimo más rápido.
que: Un motor de procesamiento **distribuido**: reparte los datos y el trabajo entre muchas máquinas (un clúster) y los procesa en paralelo, en memoria cuando puede. Se programa con SQL, Python (PySpark), Scala o R, sobre **DataFrames**. Es la base de Databricks, EMR, Dataproc y Glue.
ejemplo: Calcular las ventas por día de 5 años de transacciones (miles de millones de filas) en minutos repartiendo el trabajo en 50 máquinas.
para: Datos que no entran en una sola máquina, transformaciones pesadas, joins enormes, streaming y machine learning a escala.
cuidado: Para datos chicos (hasta decenas de GB), Spark agrega complejidad y costo: DuckDB, Polars o el warehouse suelen bastar.
ver: PySpark, Cluster, Driver, Executor, DataFrame

## PySpark
alias: pyspark
nino: Spark habla varios idiomas. PySpark es **Spark hablando Python**: tú escribes en Python y Spark hace el trabajo pesado repartido entre muchas máquinas.
que: La API de Python de Spark. Con `SparkSession` se leen datos en **DataFrames**, se transforman con funciones (`select`, `filter`, `groupBy`, `join`, `withColumn`) del módulo `pyspark.sql.functions` y se escriben resultados. El código Python define el plan; el trabajo lo ejecuta el motor de Spark (en la JVM).
ejemplo:
```python
from pyspark.sql import SparkSession, functions as F
spark = SparkSession.builder.getOrCreate()
(spark.read.parquet("s3://lago/silver/pedidos")
      .filter(F.col("estado") == "entregado")
      .groupBy("ciudad").agg(F.sum("total").alias("ventas"))
      .write.mode("overwrite").parquet("s3://lago/gold/ventas_ciudad"))
```
para: Escribir pipelines de Spark con el lenguaje más usado en datos.
cuidado: Las UDF de Python y `collect()` sacan los datos de Spark hacia Python: son lentas y pueden agotar la memoria. Usa las funciones integradas.
ver: Spark, SparkSession, DataFrame, UDF

## SparkSession
alias: spark session, spark
nino: Es **la puerta de entrada a Spark**: antes de pedirle algo, "abres la sesión", como abrir la app antes de usarla.
que: El objeto de entrada a Spark (`spark`): lee datos (`spark.read`), crea DataFrames, ejecuta SQL (`spark.sql`) y guarda la configuración. Se crea con `SparkSession.builder…getOrCreate()`; en Databricks y notebooks ya viene creada.
ejemplo:
```python
spark = (SparkSession.builder
         .appName("mart-diario")
         .config("spark.sql.shuffle.partitions", "64")
         .getOrCreate())
df = spark.sql("SELECT ciudad, COUNT(*) FROM pedidos GROUP BY ciudad")
```
para: Arrancar cualquier programa de PySpark.
ver: PySpark, Modo local

## DataFrame
alias: dataframes, df
nino: Un DataFrame es una **tabla con filas y columnas, como una planilla**, pero que vive dentro de un programa. Puedes pedirle "filtra los de Lima", "suma por ciudad", y te devuelve otra tabla.
que: Una estructura de datos tabular con columnas con nombre y tipo. En **pandas**, vive en la memoria de una máquina y las operaciones se ejecutan al instante. En **Spark**, está **distribuido** en particiones entre muchas máquinas y es **perezoso**: las operaciones arman un plan que se ejecuta recién con una acción.
ejemplo:
```python
# pandas
df.groupby("ciudad")["total"].sum()
# PySpark
df.groupBy("ciudad").agg(F.sum("total"))
```
para: Es la forma principal de trabajar con datos tabulares en Python, en una máquina o en un clúster.
cuidado: Un DataFrame de Spark no "tiene" los datos como uno de pandas: `df.count()` vuelve a leer y calcular todo (salvo que esté en caché).
ver: pandas, PySpark, Lazy evaluation

## Cluster
alias: clúster, cluster
nino: Un clúster es un **equipo de computadoras que trabajan juntas** como si fueran una sola muy poderosa. Una es la jefa (reparte el trabajo) y las demás son las trabajadoras.
que: Un conjunto de máquinas conectadas que ejecutan un sistema distribuido. En Spark: un **driver** (coordina) y varios **executors** en nodos trabajadores (procesan). En la nube se crean bajo demanda (Databricks, EMR, Dataproc) y se apagan al terminar; pueden **autoescalar** (agregar o quitar máquinas según la carga).
ejemplo: Un clúster de Databricks con 1 driver y entre 2 y 8 workers `Standard_D4ds_v5` (4 núcleos y 16 GB cada uno), que se apaga solo tras 20 minutos sin uso.
para: Procesar volúmenes que una máquina no puede.
cuidado: Un clúster encendido sin hacer nada cuesta igual. Configura autoapagado.
ver: Driver, Executor, Escalabilidad

## Driver
alias: spark driver
nino: Es el **director de la orquesta**: no toca ningún instrumento, pero lee la partitura, le dice a cada músico qué tocar y junta todo al final.
que: El proceso de Spark que ejecuta tu programa: construye el plan, lo divide en etapas y tareas, se las asigna a los executors y recibe los resultados chicos (`count`, `collect`, `show`). Si le traes demasiados datos, se queda sin memoria.
ejemplo: `df.toPandas()` sobre 50 millones de filas trae todo al driver: `OutOfMemoryError`. Mejor agregar en Spark y traer el resultado chico.
para: Entender dónde corre cada parte del código y por qué algunas operaciones rompen la memoria.
ver: Executor, Cluster, collect()

## Executor
alias: executors, ejecutor
nino: Son los **músicos de la orquesta**: cada uno toca su parte (procesa su pedazo de datos) al mismo tiempo que los demás.
que: Procesos que corren en los nodos trabajadores, con una cantidad de núcleos y memoria; ejecutan las **tareas** sobre las particiones de datos y guardan datos en caché. La paralelización depende de cuántos núcleos tienen en total los executors.
ejemplo: 8 executors × 4 núcleos = 32 tareas a la vez: un DataFrame de 320 particiones se procesa en 10 "tandas".
para: Dimensionar clústeres y entender errores de memoria de las tareas.
ver: Driver, Task, Partición

## Partición
alias: particiones, partition, particionamiento
nino: Es **cortar una pizza enorme en porciones** para que varios puedan comer a la vez. Cada porción es una partición: un pedazo de los datos que una persona (una máquina) procesa sola.
que: La palabra tiene dos usos: (1) en **Spark**, un pedazo del DataFrame que procesa una tarea; la cantidad de particiones define el paralelismo; (2) en **tablas de un lago o warehouse**, dividir los archivos en carpetas por el valor de una columna (`fecha=2024-12-01/`) para que las consultas que filtran por esa columna lean solo lo necesario.
ejemplo:
```python
df.write.partitionBy("fecha").parquet("s3://lago/silver/pedidos")
# crea .../fecha=2024-12-01/part-0000.parquet, .../fecha=2024-12-02/…
```
para: Paralelizar el procesamiento y leer menos datos (partition pruning).
cuidado: Particionar por una columna con demasiados valores (por ejemplo `cliente_id`) crea millones de archivos chiquitos: muy lento. Particiona por columnas de baja cardinalidad y que se usan para filtrar (fecha).
ver: Partition pruning, Shuffle, Task

## Shuffle
alias: intercambio, exchange
nino: Imagina que cada amigo contó las hojas de su pedazo de bosque separando por color. Para sumar los colores, **todos tienen que mandarle sus hojas rojas al que cuenta rojas, las verdes al que cuenta verdes**… Ese gran intercambio es el shuffle, y es lo que más tarda.
que: El movimiento de datos **entre executors** (por la red y el disco) para reagruparlos por una clave. Lo provocan `groupBy`, `join` (salvo broadcast), `distinct`, `orderBy` y `repartition`. Marca el límite entre etapas (stages) y suele ser la parte más cara de un job.
ejemplo: `df.groupBy("ciudad").count()`: cada executor cuenta sus filas por ciudad y luego envía los conteos parciales de cada ciudad al executor responsable de esa ciudad.
para: Optimizar Spark es, en gran parte, reducir y equilibrar los shuffles.
cuidado: `spark.sql.shuffle.partitions` (200 por defecto) define en cuántas particiones queda el resultado; para datos chicos conviene menos.
ver: Narrow / wide, Stage, Skew, Broadcast join

## Narrow / wide
alias: transformación angosta, transformación ancha, narrow, wide
nino: Una tarea **angosta** la hace cada uno en su mesa sin pedirle nada a nadie (pintar sus propios dibujos). Una **ancha** necesita que todos se pasen cosas entre mesas (juntar todos los dibujos azules en una caja).
que: Transformaciones **narrow** (angostas): cada partición de salida depende de una sola de entrada (`filter`, `select`, `withColumn`): no hay shuffle. **Wide** (anchas): necesitan datos de varias particiones (`groupBy`, `join`, `distinct`): hay shuffle y nueva etapa.
ejemplo: `df.filter(...).withColumn(...)` → una sola etapa; agregar `.groupBy("ciudad").count()` → dos etapas separadas por un shuffle.
para: Leer planes de ejecución y saber qué operaciones son caras.
ver: Shuffle, Stage

## Transformación / acción
alias: transformación, acción, action
nino: Las transformaciones son **escribir la lista de pasos de una receta**; la acción es **decir "¡ahora cocina!"**. Hasta que no dices "cocina", nadie prende el horno.
que: En Spark, las **transformaciones** (`select`, `filter`, `join`, `groupBy`) devuelven un DataFrame nuevo y solo agregan pasos al plan. Las **acciones** (`count`, `show`, `collect`, `write`, `toPandas`) disparan la ejecución real del plan y devuelven un resultado o escriben datos.
ejemplo:
```python
filtrado = df.filter(F.col("pais") == "Perú")    # transformación: no ejecuta nada
filtrado.count()                                 # acción: ahora sí lee y cuenta
```
para: Entender cuándo se ejecuta el trabajo y por qué cada acción vuelve a calcular todo desde el origen (salvo caché).
ver: Lazy evaluation, Cache

## Lazy evaluation
alias: evaluación perezosa, perezoso
nino: Spark es como un **amigo muy inteligente pero perezoso**: no hace nada hasta que es estrictamente necesario, y cuando lo hace, piensa primero el camino más corto para hacer todo junto.
que: Spark no ejecuta las transformaciones cuando las escribes: arma un **plan lógico** y espera a una acción. Así el optimizador (Catalyst) ve el plan completo y lo mejora: mueve filtros antes, lee solo las columnas necesarias, combina pasos.
ejemplo: Escribes `leer → withColumn → filter(fecha = hoy) → select(2 columnas)`. Al ejecutar, Spark lee del Parquet solo esas 2 columnas y solo la partición de hoy.
para: Rendimiento automático sin que tengas que ordenar las operaciones a mano.
ver: Transformación / acción, Catalyst, Predicate pushdown

## Stage
alias: etapa, stages
nino: Un trabajo grande se divide en **rondas**: primero todos pintan sus dibujos (ronda 1), después se juntan por color (ronda 2). Cada ronda es una etapa, y una no empieza hasta que termina la anterior.
que: Un grupo de tareas que se pueden ejecutar sin shuffle. Un **job** (lo que dispara una acción) se divide en stages separadas por shuffles; cada stage tiene una tarea por partición. La Spark UI muestra el tiempo de cada stage y de sus tareas.
ejemplo: Un `groupBy` después de un `filter` genera 2 stages: (1) leer y filtrar, con agregación parcial; (2) después del shuffle, la agregación final.
para: Encontrar dónde se va el tiempo de un job.
ver: Task, Shuffle, Spark UI

## Task
alias: tarea de Spark, tasks
nino: Es **el pedacito de trabajo que hace un solo trabajador**: "cuenta las hojas de este cuadrado del bosque". Muchas tareas iguales se reparten entre todos.
que: La unidad mínima de trabajo de Spark: procesa **una partición** en una etapa, en un núcleo de un executor. Si una tarea tarda mucho más que las demás de su etapa, suele haber *skew* (datos desbalanceados).
ejemplo: Una etapa con 200 tareas en un clúster con 40 núcleos se ejecuta en 5 tandas.
para: Entender el paralelismo y detectar tareas lentas.
ver: Stage, Executor, Skew

## Catalyst
alias: optimizador de Spark
nino: Catalyst es el **GPS de Spark**: tú le dices adónde quieres llegar y él calcula el camino más corto, evitando calles cortadas y atajos lentos.
que: El optimizador de consultas de Spark SQL y los DataFrames: convierte tu código en un plan lógico, lo optimiza con reglas (empujar filtros, podar columnas, reordenar joins, elegir broadcast) y genera el plan físico. `df.explain()` lo muestra.
ejemplo: `df.explain()` muestra `PushedFilters: [IsNotNull(fecha), EqualTo(fecha,2024-12-01)]`: Catalyst empujó tu filtro hasta la lectura del Parquet.
para: Saber que el orden en que escribes las transformaciones casi no importa, pero las UDF de Python son "cajas negras" que Catalyst no puede optimizar.
ver: Lazy evaluation, Predicate pushdown, AQE, Plan de ejecución

## AQE
alias: adaptive query execution, ejecución adaptativa
nino: Es un **GPS que se recalcula en el camino**: si a mitad del viaje ve que hay tráfico, cambia la ruta.
que: *Adaptive Query Execution* (activada por defecto desde Spark 3.2): durante la ejecución, Spark mira el tamaño real de los datos después de cada shuffle y **ajusta el plan**: une particiones chicas, cambia un join a broadcast si una tabla resultó chica y divide particiones con skew.
ejemplo: Planeaste 200 particiones de shuffle, pero el resultado ocupa 300 MB: AQE las junta en unas pocas particiones de tamaño razonable.
para: Mejor rendimiento sin ajustar a mano cada job.
ver: Catalyst, Skew, Shuffle

## Broadcast join
alias: broadcast, map-side join
nino: Si una lista es **chiquita** (los 10 colores), en vez de mezclar todo, le das **una copia de la lista chiquita a cada trabajador**. Así cada uno resuelve en su mesa sin intercambiar nada.
que: Un join en el que la tabla pequeña se **copia completa a todos los executors**, así la grande no necesita shuffle. Spark lo hace solo si la tabla es menor que `spark.sql.autoBroadcastJoinThreshold` (10 MB por defecto) o si se lo pides con `F.broadcast(df)`.
ejemplo:
```python
ventas.join(F.broadcast(dim_ciudades), "ciudad_id")   # dim_ciudades tiene 500 filas
```
para: Unir una tabla de hechos enorme con una dimensión chica muy rápido.
cuidado: Hacer broadcast de una tabla grande llena la memoria del driver y los executors.
ver: JOIN, Shuffle

## Skew
alias: sesgo de datos, data skew, desbalance
nino: Repartes cartas para que cada amigo las ordene, pero a uno le tocan **casi todas las cartas** y a los demás, dos. Todos terminan rápido menos ese, y todos tienen que esperarlo.
que: Distribución **desbalanceada** de los datos entre particiones: una clave tiene muchísimas más filas que las demás (un cliente gigante, un valor `NULL` muy frecuente). En un join o groupBy, la tarea de esa clave tarda mucho más y frena toda la etapa.
ejemplo: El 40 % de los eventos tiene `usuario_id = NULL` (usuarios no logueados). En un join por `usuario_id`, una tarea recibe todos los nulos.
para: Reconocerlo en la Spark UI (una tarea que tarda 20 veces más que la mediana) y corregirlo: AQE, filtrar o tratar aparte la clave caliente, o *salting* (repartir la clave con un sufijo aleatorio).
ver: Shuffle, Task, AQE

## Predicate pushdown
alias: empujar filtros, filter pushdown
nino: En vez de **traer todas las cajas del depósito a tu casa y ahí buscar la roja**, le pides al depósito que te mande **solo la caja roja**. Viaja mucho menos.
que: Optimización que **empuja los filtros hasta la fuente de datos**: al leer Parquet, Spark usa las estadísticas (mín./máx.) de cada bloque para saltar los que no pueden cumplir el filtro; al leer de una base, manda el `WHERE` a la base. Va junto con *column pruning* (leer solo las columnas usadas).
ejemplo: `spark.read.parquet(...).filter("total > 1000")`: los bloques cuyo máximo de `total` es 800 ni se leen.
para: Leer muchísimo menos y gastar menos.
ver: Partition pruning, Catalyst, Parquet

## Partition pruning
alias: poda de particiones
nino: Si los papeles están guardados en **carpetas por mes** y buscas algo de marzo, **abres solo la carpeta de marzo** y no las otras once.
que: Cuando una tabla está particionada (por ejemplo por `fecha`) y la consulta filtra por esa columna, el motor **lee solo las carpetas (particiones) necesarias**. Lo hacen Spark, Athena, BigQuery (tablas particionadas), Delta e Iceberg.
ejemplo: `SELECT … FROM pedidos WHERE fecha = '2024-12-01'` sobre una tabla particionada por fecha lee 1 de 1.000 particiones. En BigQuery, eso se nota directo en la factura.
para: Consultas rápidas y baratas sobre tablas enormes.
cuidado: Si filtras aplicando una función a la columna (`WHERE YEAR(fecha) = 2024` en algunos motores) o por otra columna, la poda puede no funcionar.
ver: Partición, Predicate pushdown

## Cache
alias: cache(), persist, caché
nino: Es **dejar a mano algo que vas a usar muchas veces**: si vas a consultar el diccionario diez veces, lo dejas abierto sobre la mesa en vez de ir a buscarlo a la biblioteca cada vez.
que: Guardar un DataFrame calculado en la memoria (o disco) de los executors con `df.cache()` o `df.persist()`, para que las siguientes acciones no lo recalculen desde el origen. Se materializa en la primera acción.
ejemplo:
```python
base = pedidos.filter(...).join(...).cache()
base.groupBy("ciudad").count().show()
base.groupBy("canal").count().show()   # no vuelve a leer ni a unir
```
para: Reutilizar un resultado intermedio caro varias veces en el mismo job o notebook.
cuidado: Cachear todo por las dudas llena la memoria y hace todo más lento. Usa `unpersist()` cuando ya no lo necesites.
ver: Transformación / acción, Executor

## collect()
alias: collect, toPandas
nino: Es **traer todo el bosque a tu casa** para contarlo vos solo. Si el bosque es enorme, tu casa explota.
que: Acción que trae **todas las filas** del DataFrame distribuido al driver como lista de Python (`toPandas()` hace lo mismo como DataFrame de pandas). Solo es seguro con resultados chicos.
ejemplo:
```python
filas = df.groupBy("ciudad").count().collect()    # OK: pocas filas
todo = df.collect()                               # peligro con millones de filas
```
para: Traer resultados agregados chicos para usarlos en Python (reportes, decisiones).
cuidado: Con datos grandes: `OutOfMemoryError` en el driver. Para mirar, usa `show()` o `limit()`.
ver: Driver, Transformación / acción

## UDF
alias: user defined function, función definida por el usuario
nino: Es **inventar tu propia herramienta** cuando la caja de herramientas no tiene la que necesitas. Funciona, pero es más lenta que las herramientas de fábrica.
que: Una función propia (en Python) que se aplica a cada fila de un DataFrame de Spark. Las UDF de Python son lentas: cada fila sale de la JVM a Python y vuelve, y Catalyst no puede optimizarlas. Las **pandas UDF** (vectorizadas, con Arrow) son mucho más rápidas.
ejemplo:
```python
@F.udf("string")
def normalizar_telefono(t):
    return "".join(c for c in t if c.isdigit()) if t else None

df.withColumn("tel", normalizar_telefono("telefono"))
# mejor, si alcanza: F.regexp_replace("telefono", r"\D", "")
```
para: Lógica que no existe en las funciones integradas.
cuidado: Antes de escribir una UDF, busca en `pyspark.sql.functions`: casi siempre hay una función integrada.
ver: PySpark, Catalyst

## explode
alias: explotar, aplanar listas, UNNEST
nino: Tienes una **bolsa con 3 caramelos** anotada en un renglón. `explode` es abrir la bolsa y poner **un renglón por cada caramelo**.
que: Función que convierte una columna con una **lista** (array) en **una fila por elemento**, repitiendo las demás columnas. En SQL estándar y BigQuery se usa `UNNEST`. Es el paso clave para analizar JSON anidado.
ejemplo:
```python
# pedido 1042 con items [pizza, gaseosa] → dos filas: (1042, pizza) y (1042, gaseosa)
df.select("pedido_id", F.explode("items").alias("item"))
```
para: Aplanar estructuras anidadas de APIs y eventos.
cuidado: `explode` descarta las filas con lista vacía o nula; `explode_outer` las conserva.
ver: JSON, DataFrame

## Structured Streaming
alias: streaming en Spark, readStream
nino: Es Spark mirando un **río de datos** en vez de un lago: va procesando el agua a medida que pasa, de a pequeños baldes, sin parar.
que: El motor de streaming de Spark: se programa con la misma API de DataFrames (`spark.readStream`, `writeStream`) y Spark procesa los datos nuevos en micro-lotes continuos, con estado, ventanas de tiempo, marcas de agua y garantías de exactamente una vez usando *checkpoints*.
ejemplo:
```python
eventos = spark.readStream.format("kafka").option("subscribe", "pedidos").load()
(eventos.groupBy(F.window("ts", "5 minutes"), "ciudad").count()
        .writeStream.format("delta").option("checkpointLocation", "/chk/pedidos")
        .outputMode("append").start("/gold/pedidos_5min"))
```
para: Pipelines en tiempo casi real con el mismo código que en batch.
ver: Streaming, Watermark, Kafka

## Watermark
alias: marca de agua
nino: Es decir "**espero a los que llegan tarde a la foto hasta 10 minutos; después, la foto se saca igual**". Los que llegan más tarde quedan afuera.
que: En streaming, el límite de cuánto tiempo se esperan los **eventos que llegan tarde** (por demoras de red o de los dispositivos) antes de dar por cerrada una ventana de tiempo. Con `withWatermark("ts", "10 minutes")`, Spark mantiene el estado de las ventanas abiertas hasta 10 minutos detrás del evento más reciente y después las cierra y libera memoria.
ejemplo: Un pedido ocurrido a las 20:03 llega a las 20:09: entra en la ventana 20:00–20:05 porque la marca de agua está en 19:59. Uno de las 20:03 que llega a las 20:20, se descarta.
para: Equilibrar exactitud (esperar a los tardíos) y latencia y memoria (no esperar para siempre).
ver: Structured Streaming, Ventana de tiempo

## Spark UI
alias: interfaz de Spark, localhost:4040
nino: Es el **tablero del auto de Spark**: te muestra a qué velocidad va cada parte, cuál se recalienta y dónde se trabó.
que: La interfaz web de Spark (puerto 4040 en local; integrada en Databricks, EMR y Dataproc) con los jobs, stages, tareas, el plan SQL, la caché y los executors. Muestra tiempos, datos leídos, shuffles y errores.
ejemplo: En la pestaña Stages ves que la tarea más lenta tardó 12 minutos y la mediana 20 segundos: hay skew en ese join.
para: Diagnosticar jobs lentos o que fallan.
ver: Stage, Skew, Plan de ejecución

## Modo local
alias: local[*], master local
nino: Es **jugar al partido en el patio de tu casa** antes del partido de verdad: las mismas reglas, pero todo pasa en un solo lugar.
que: Ejecutar Spark en una sola máquina, con el driver y los "executors" como hilos del mismo proceso (`--master local[*]`: un hilo por núcleo). El código es el mismo que en un clúster.
ejemplo: `spark-submit --master "local[*]" jobs/mart_diario.py data/pedidos.csv salida/` en tu laptop, con una muestra de los datos.
para: Desarrollar y probar jobs rápido y gratis antes de llevarlos al clúster.
ver: Spark, Cluster

## RDD
alias: resilient distributed dataset
nino: Es la **forma antigua y más manual de usar Spark**: como armar un mueble sin instrucciones, pieza por pieza. Hoy casi todos usan las instrucciones (DataFrames).
que: *Resilient Distributed Dataset*: la abstracción original de Spark, una colección distribuida de objetos sin esquema que se transforma con funciones (`map`, `filter`, `reduceByKey`). Los DataFrames se construyen encima y son más rápidos porque Spark conoce el esquema y los optimiza.
ejemplo: `sc.textFile("log.txt").flatMap(lambda l: l.split()).map(lambda w: (w, 1)).reduceByKey(lambda a, b: a + b)`.
para: Entender la historia y algunas preguntas de entrevista; casi no se usa en código nuevo.
ver: DataFrame, Spark

## Worker
alias: workers, nodo worker, nodo de trabajo
nino: En un equipo de trabajo hay **un jefe que reparte las tareas (el driver) y varios trabajadores que las hacen (los workers)**. Cuantos más trabajadores, más rápido termina un trabajo grande.
que: Cada máquina de un clúster que hace el trabajo de cómputo. En Spark, cada worker corre uno o más **executors**, que procesan las particiones de datos que les asigna el driver. Al configurar un clúster se elige el tipo de máquina de los workers y cuántos hay (fijo o con autoescalado).
ejemplo: Un clúster con 1 driver y 4 workers de 16 GB procesa en paralelo las particiones de una tabla grande.
para: Repartir el procesamiento de muchos datos entre varias máquinas.
cuidado: Agregar workers no ayuda si el problema es skew (una partición enorme) o archivos chicos: primero mira la Spark UI. Y cada worker cuesta mientras está encendido.
ver: Cluster, Driver, Executor, Partición

## Spill
alias: spill a disco, derrame a disco
nino: Es como estudiar en un escritorio chico: cuando los papeles ya no entran, **tienes que dejar algunos en el piso** y agacharte a buscarlos cada vez. Todo funciona, pero mucho más lento.
que: Cuando un executor de Spark no tiene memoria suficiente para una operación (un shuffle, un join, una agregación), escribe datos intermedios **en disco** y los vuelve a leer después. La Spark UI lo muestra como *Spill (Memory)* y *Spill (Disk)* en las tareas de un stage.
ejemplo: Un join con una partición de 60 GB por skew muestra 48 GB de spill a disco en una sola tarea, que tarda 38 minutos mientras las demás tardan segundos.
para: Diagnosticar por qué un stage es lento aunque no falle.
cuidado: El spill suele ser un síntoma: la causa es skew, particiones muy grandes o pocas particiones de shuffle. Corregir eso es mejor que solo agregar memoria.
ver: Skew, Shuffle, Spark UI

## Checkpoint
alias: checkpointLocation, punto de control
nino: Es como **el señalador de un libro**: si cierras el libro y lo vuelves a abrir, sabes exactamente en qué página quedaste, sin releer todo ni saltearte nada.
que: En Structured Streaming, la carpeta donde Spark guarda su progreso: qué datos de la fuente ya procesó (offsets o archivos), el estado de las agregaciones y qué lotes confirmó. Al reiniciar un stream con el **mismo** `checkpointLocation`, continúa donde quedó; con Delta como destino, sin perder ni duplicar datos.
ejemplo: `df.writeStream.option("checkpointLocation", "/Volumes/main/chk/ventas").toTable("bronze.ventas")`
para: Que un stream se pueda detener, reiniciar o recuperar de una falla sin reprocesar todo.
cuidado: Cada stream necesita **su propio** checkpoint. Borrarlo o compartirlo entre streams hace que se reprocesen o se pierdan datos.
ver: Structured Streaming, Offset, Auto Loader

## Hive
alias: estilo hive, particiones hive, hive metastore
nino: Hive es un sistema viejo de Hadoop que dejó una **costumbre para ordenar carpetas** que hoy usa todo el mundo: una carpeta por cada valor, con el nombre `columna=valor`.
que: Apache Hive fue el primer motor SQL sobre Hadoop. De él quedan dos ideas muy usadas: las **particiones estilo Hive** (`/ventas/anio=2024/mes=12/`), que Spark, Athena, BigQuery y Glue entienden para leer solo las carpetas necesarias; y el **Hive metastore**, un catálogo de tablas que muchas plataformas reemplazaron por catálogos más nuevos (como Unity Catalog o Glue Data Catalog).
ejemplo: `df.write.partitionBy("anio", "mes").parquet("/lake/silver/ventas")` crea carpetas `anio=2024/mes=12/`.
para: Organizar archivos en el lago para que las consultas lean solo lo que necesitan.
cuidado: Particionar por una columna con muchísimos valores (por ejemplo, `cliente_id`) crea miles de carpetas con archivos chicos y empeora el rendimiento.
ver: Partition pruning, Partición, Catálogo de datos
