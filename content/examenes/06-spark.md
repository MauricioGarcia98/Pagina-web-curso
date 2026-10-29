# examen: spark

## Cuándo usar Spark
leccion: spark-big-data
Tienes un CSV de 2 GB que procesas una vez por día. ¿Qué es lo más razonable?
- [ ] Un clúster de Spark de 20 máquinas, para que el proceso diario termine en segundos.
- [x] Una sola máquina con pandas, Polars o DuckDB.
- [ ] Spark Structured Streaming, para ir procesando el archivo a medida que se lee.
- [ ] Hadoop MapReduce, porque está pensado justamente para archivos de texto grandes.
porque: Spark brilla cuando los datos no entran en una máquina. Para unos pocos GB, una herramienta local es más simple, más rápida para arrancar y más barata. Elegir la herramienta según el volumen es parte del criterio de un data engineer.

## Driver y executors
leccion: spark-arquitectura
¿Qué componente de Spark ejecuta las tareas sobre las particiones de datos?
- [ ] El driver, que reparte las particiones y también las procesa en paralelo.
- [x] Los executors.
- [ ] El catálogo, que guarda y procesa las tablas registradas.
- [ ] La Spark UI, que lanza cada tarea y muestra su avance.
porque: El **driver** planifica y coordina; los **executors**, en los nodos trabajadores, ejecutan las tareas sobre las particiones y guardan la caché.

## Evaluación perezosa
leccion: spark-lazy
¿Cuántas veces lee Spark el archivo de origen en este código (sin caché)?
```python norun
df = spark.read.parquet("ventas").filter("total > 100")
print(df.count())
df.write.parquet("ventas_grandes")
```
- [ ] Ninguna vez: los datos quedan en memoria desde `spark.read`.
- [ ] Una vez: Spark recuerda el resultado del `count()` y lo reutiliza en el `write`.
- [x] Dos veces: una por cada acción.
- [ ] Tres veces: una por `read`, otra por `count()` y otra por `write`.
porque: `read` y `filter` solo arman el plan. Cada **acción** lo ejecuta completo. Si vas a reutilizar el resultado varias veces y es caro, `cache()` evita releer.

## Transformaciones anchas
leccion: spark-particiones-joins
¿Cuál de estas operaciones provoca un shuffle?
- [ ] `filter`
- [ ] `withColumn`
- [x] `groupBy(...).agg(...)`
- [ ] `select`
porque: `groupBy` necesita juntar en la misma partición todas las filas de cada clave, así que mueve datos entre executors (transformación **ancha**). `filter`, `withColumn` y `select` trabajan partición por partición (angostas).

## Broadcast join
leccion: spark-particiones-joins
Unes `ventas` (2 mil millones de filas) con `paises` (200 filas). ¿Qué optimización corresponde?
- [ ] Reparticionar ambas tablas por país en 2.000 particiones antes del join.
- [x] Un broadcast join de `paises`.
- [ ] Convertir `ventas` en un RDD, que hace los joins sin shuffle.
- [ ] Hacer `collect()` de `ventas` y unir en el driver con Python.
porque: Con una tabla chica, enviarla completa a cada executor es barato y evita mover la grande. Spark lo hace solo por debajo de un umbral, o puedes forzarlo con `F.broadcast(paises)`.

## Skew
leccion: spark-particiones-joins
En la Spark UI, una etapa tiene 200 tareas: 199 tardan 10 segundos y una tarda 25 minutos. ¿Qué es lo más probable?
- [ ] Falta memoria en el driver, que tarda en recibir el resultado de esa tarea.
- [x] Skew: una clave concentra muchas más filas que las demás.
- [ ] El archivo de origen está en CSV y esa tarea leyó la parte más grande.
- [ ] Hay demasiados executors y esa tarea quedó esperando un núcleo libre.
porque: Una tarea mucho más lenta que la mediana en la misma etapa es la firma del **skew**. Soluciones: AQE (divide particiones sesgadas), tratar aparte la clave caliente, filtrar nulos antes del join o *salting*.

## Partition pruning
leccion: spark-formatos-delta
Una tabla está particionada por `fecha`. ¿Qué consulta aprovecha mejor la partición?
- [x] `WHERE fecha = '2024-12-01'`
- [ ] `WHERE cliente_id = 42`
- [ ] `WHERE total > 1000 ORDER BY fecha`
- [ ] `WHERE YEAR(fecha_creacion) = 2024`
porque: Solo los filtros sobre la columna de partición permiten saltar carpetas enteras (*partition pruning*). Los demás filtros pueden aprovechar las estadísticas de Parquet, pero no evitan abrir todas las particiones.

## Delta Lake
leccion: spark-formatos-delta
¿Qué agrega Delta Lake a un conjunto de archivos Parquet?
- [ ] Un formato de compresión más eficiente que Snappy para los archivos Parquet.
- [x] Un registro de transacciones: ACID, MERGE, control de esquema y time travel.
- [ ] Un servidor de base de datos que reemplaza al almacenamiento de objetos.
- [ ] Un conversor que permite guardar las tablas como CSV y JSON a la vez.
porque: Delta guarda los datos en Parquet y agrega `_delta_log/`, que registra cada cambio. Eso convierte un montón de archivos en una tabla confiable y editable.

## AQE
leccion: spark-optimizacion
¿Qué hace Adaptive Query Execution (AQE)?
- [ ] Genera el código de PySpark a partir de una consulta en lenguaje natural.
- [x] Ajusta el plan durante la ejecución según el tamaño real de los datos.
- [ ] Agrega máquinas al clúster cuando detecta que una consulta es lenta.
- [ ] Convierte los DataFrames en RDDs cuando las consultas son muy complejas.
porque: El plan inicial se arma con estimaciones. AQE mira las estadísticas reales después de cada shuffle y corrige el plan.

## Watermark
leccion: spark-streaming
En Structured Streaming, ¿para qué sirve `withWatermark("ts", "10 minutes")`?
- [ ] Hace que el stream procese los datos en lotes de exactamente 10 minutos.
- [x] Indica cuánto esperar eventos tardíos antes de cerrar una ventana.
- [ ] Borra de la tabla de destino los datos con más de 10 minutos de antigüedad.
- [ ] Agrega a cada fila una columna con la hora en que llegó al stream.
porque: Sin watermark, Spark debería mantener para siempre el estado de todas las ventanas por si llega un evento atrasado. La marca de agua limita esa espera: los eventos más tardíos se descartan.

## Checkpoint
leccion: spark-streaming
¿Qué pasa si reinicias un stream que escribe en una tabla Delta pero borraste su `checkpointLocation`?
- [ ] Nada: Spark lee la tabla de destino y deduce por dónde iba.
- [x] Pierde el registro de lo procesado: puede reprocesar todo y duplicar datos.
- [ ] El stream no vuelve a arrancar nunca y hay que crear otra tabla de destino.
- [ ] Se borra la tabla de destino para evitar inconsistencias con el origen.
porque: El checkpoint guarda los offsets procesados y el estado. Es lo que permite reanudar exactamente donde quedó, con garantía de exactamente una vez.
