---
titulo: Spark que no termina - skew, falta de memoria y archivos chicos
nivel: Experto
duracion: 65
resumen: Los problemas de rendimiento y estabilidad de Spark que llegan a la guardia - una partición gigante (skew) que deja 199 tareas terminadas y una corriendo una hora, executors que mueren por memoria (heap o memoryOverhead), FetchFailed al perder un executor, spill a disco y miles de archivos chicos. Cómo leer las métricas de un stage, encontrar la clave caliente y corregir con AQE, broadcast, salting y compactación.
objetivos: Detectar skew comparando la mediana y el máximo de las tareas de un stage | Encontrar la clave caliente de un join y cuantificar su peso | Distinguir un OOM de heap, uno de memoryOverhead y uno del driver por su mensaje | Explicar salting, AQE skew join y broadcast join y cuándo usar cada uno | Calcular la cantidad de archivos objetivo de una compactación
prerrequisitos: incidentes-airflow-en-produccion
autoevaluacion: ¿Sabes reconocer skew en la pestaña Stages de la Spark UI? | ¿Sabes qué significa "Container killed by YARN for exceeding memory limits"? | ¿Sabes por qué un FetchFailed reinicia un stage anterior? | ¿Sabes qué hace el salting? | ¿Sabes por qué los archivos chicos vuelven lentas las lecturas?
---

:::escenario
El job nocturno que une pedidos con clientes tardaba 25 minutos. Desde hace una semana tarda dos horas y esta noche falló después de cuatro intentos con `java.lang.OutOfMemoryError: Java heap space`. Alguien ya propuso "duplicar la memoria de los executors". Antes de gastar el doble, vas a encontrar la causa.
:::

## La idea en una frase

Un stage de Spark termina cuando termina su **tarea más lenta**. Si una partición tiene 80 veces más datos que las demás, agregar memoria o executors no ayuda: esa única tarea sigue sola. Casi todos los "Spark está lento" se diagnostican mirando **la distribución** de las tareas, no el promedio.

## Cómo se ve el skew

En la Spark UI, pestaña **Stages**, cada stage muestra un resumen de sus tareas (mínimo, percentil 25, mediana, percentil 75, máximo) para la duración, el shuffle leído y el spill:

| Métrica | Mín | Mediana | P75 | **Máx** |
|---|---|---|---|---|
| Duración | 38 s | 52 s | 60 s | **45 min** |
| Shuffle read | 110 MB | 140 MB | 155 MB | **9,2 GB** |
| Spill (disco) | 0 | 0 | 0 | **21 GB** |

Cuando el máximo es decenas de veces la mediana, hay **skew** (sesgo): una clave concentra muchas filas y todas van a la misma partición, porque en un join o un `groupBy` las filas con la misma clave siempre van juntas.

:::analogia
Es una fila de supermercado con 20 cajas abiertas en la que todos los clientes con carro lleno van a la caja 7. Abrir 20 cajas más no cambia nada: hay que repartir los carros llenos.
:::

## Los mensajes de memoria y lo que significan

| Mensaje | Qué se quedó sin memoria | Corrección típica |
|---|---|---|
| `java.lang.OutOfMemoryError: Java heap space` en un executor | El heap de la JVM del executor (`spark.executor.memory`) | Repartir mejor los datos (skew), más particiones, evitar estructuras enormes por fila |
| `Container killed by YARN for exceeding physical memory limits … Consider boosting spark.executor.memoryOverhead` / `OOMKilled` en Kubernetes | La memoria **fuera** del heap: buffers de red, Python (PySpark, UDFs de pandas), Arrow | Subir `spark.executor.memoryOverhead`, revisar UDFs de Python |
| `OutOfMemoryError` en el **driver** | El proceso coordinador | No traer datos al driver: evitar `collect()`, `toPandas()` sobre tablas grandes, broadcasts gigantes |
| `ExecutorLostFailure` | Un executor murió (memoria, nodo spot reclamado, disco lleno) | Ver la razón que sigue al mensaje |
| `FetchFailedException` | Un executor no pudo leer el shuffle que había escrito otro executor que ya no existe | Spark rehace el stage anterior; arreglar la causa de la pérdida de executors |

:::cuidado Un executor perdido cuesta dos stages
Cuando un executor muere, se pierden los archivos de shuffle que había escrito. El stage siguiente no los encuentra (`FetchFailed`) y Spark vuelve a correr las tareas del stage anterior que los generaron. Por eso un OOM en una tarea puede convertir un job de 25 minutos en uno de dos horas antes de fallar.
:::

## Las correcciones del skew

| Técnica | Cómo funciona | Cuándo |
|---|---|---|
| **Filtrar o separar la clave caliente** | La clave `0` o `NULL` ("cliente invitado") se procesa aparte o se descarta si no se usa | Casi siempre: la clave caliente suele ser un valor "basura" |
| **AQE skew join** | Con `spark.sql.adaptive.enabled` y `spark.sql.adaptive.skewJoin.enabled` (activos por defecto desde Spark 3.2), Spark detecta particiones mucho más grandes que la mediana y las divide | Joins entre tablas grandes |
| **Broadcast join** | Si una tabla es chica, se copia entera a cada executor y no hay shuffle | Una dimensión de pocos cientos de MB o menos; controla `spark.sql.autoBroadcastJoinThreshold` |
| **Salting** | Se agrega a la clave caliente un sufijo aleatorio (0 a N−1) y se replica N veces la fila del otro lado, para que la clave se reparta en N particiones | Cuando AQE no alcanza o en agregaciones |

## Spill y particiones de shuffle

Cuando los datos de una tarea no entran en memoria, Spark los escribe temporalmente a disco: es el **spill**, y vuelve todo mucho más lento. Con `spark.sql.shuffle.partitions = 200` (el valor por defecto) y un shuffle de 2 TB, cada partición tiene unos 10 GB: demasiado. La regla práctica es apuntar a particiones de **100–200 MB**, o dejar que AQE ajuste la cantidad (`spark.sql.adaptive.coalescePartitions.enabled`).

## Archivos chicos

Escribir con muchas particiones, o en streaming cada pocos segundos, deja miles de archivos de pocos KB. Cada archivo cuesta una petición al almacenamiento y metadatos en el catálogo: leer 10.000 archivos de 50 KB es mucho más lento que leer 4 de 128 MB. Las soluciones:

- **Compactar**: `OPTIMIZE tabla` en Delta (con `ZORDER BY` o liquid clustering), `rewrite_data_files` en Iceberg, o reescribir con `coalesce` / `repartition`.
- **Escribir mejor**: `optimizeWrite` y `autoCompact` en Delta, `maxRecordsPerFile`, menos particiones de salida.
- **Leer mejor**: `spark.sql.files.maxPartitionBytes` (128 MB por defecto) controla cuántos bytes lee cada tarea.

## Práctica

:::ejercicio cli dificultad=Básico titulo="Preparar el incidente"
Prepara los archivos del incidente `spark`.
```respuesta
incidente-preparar spark
```
:::

:::ejercicio cli dificultad=Intermedio titulo="Las tareas más lentas"
`~/incidentes/spark/stage_14_tareas.csv` tiene una fila por tarea del stage 14: `task_id,particion,duracion_s,shuffle_read_mb,spill_disco_mb,executor`. Ordena numéricamente por la **columna 3** (duración) y muestra las **3 últimas** líneas.
```setup
incidente-preparar spark
```
```respuesta
sort -t ?['"]?,['"]? -k ?3( -n|n)? \S*stage_14_tareas\.csv \| tail -n ?3
sort -n -t ?['"]?,['"]? -k ?3 \S*stage_14_tareas\.csv \| tail -n ?3
sort -t ?['"]?,['"]? -n -k ?3 \S*stage_14_tareas\.csv \| tail -n ?3
sort -t ?['"]?,['"]? -k ?3 -n \S*stage_14_tareas\.csv \| tail -3
```
```solucion
sort -t, -k3 -n ~/incidentes/spark/stage_14_tareas.csv | tail -n 3
```
```pista
`sort -t, -k3 -n` ordena por la tercera columna separada por comas, como número.
```
:::

:::ejercicio cli dificultad=Avanzado titulo="Promedio contra máximo"
Con `awk`, calcula la duración **promedio** y la **máxima** de las tareas (columna 3, saltando el encabezado) y muéstralas en una línea.
```setup
incidente-preparar spark
```
```respuesta
awk -F ?['"]?,['"]? .*\$3.* \S*stage_14_tareas\.csv
```
```solucion
awk -F, 'NR>1 {s+=$3; if ($3>m) m=$3} END {print s/(NR-1), m}' ~/incidentes/spark/stage_14_tareas.csv
```
```pista
Acumula la suma con `s+=$3` y el máximo con `if ($3>m) m=$3`. En el bloque `END` divide la suma por la cantidad de tareas (`NR-1`, por el encabezado).
```
```explicacion
El promedio (unos 68 s) esconde el problema: la tarea 137 tarda 2.710 s. Por eso la Spark UI muestra mediana y máximo, no el promedio.
```
:::

:::ejercicio quiz dificultad=Avanzado
La tarea 137 leyó 9,4 GB de shuffle y derramó 21 GB a disco; la mediana leyó unos 140 MB. ¿Qué es?

- [ ] Un executor lento por hardware defectuoso
- [x] Skew: una clave del join concentra muchas filas y todas caen en la partición 137
- [ ] Falta de particiones: hay que subir `spark.sql.shuffle.partitions` a 2.000
- [ ] Un problema de red del clúster
:::

:::ejercicio cli dificultad=Básico titulo="La clave caliente"
`~/incidentes/spark/top_claves_join.csv` tiene las claves del join con más filas. Muestra las **3 primeras líneas** (encabezado incluido).
```setup
incidente-preparar spark
```
```respuesta
head -n ?3 \S*top_claves_join\.csv
head -3 \S*top_claves_join\.csv
```
```solucion
head -n 3 ~/incidentes/spark/top_claves_join.csv
```
:::

:::ejercicio quiz dificultad=Avanzado
La clave `cliente_id = 0` tiene 41 millones de filas: es el "cliente invitado" que la app usa cuando el usuario no inició sesión. ¿Cuál es la mejor primera corrección?

- [ ] Duplicar `spark.executor.memory`
- [x] Tratar el 0 aparte: no tiene datos de cliente que unir, así que se separa antes del join (o se le asigna NULL y se une solo lo que tiene cliente real) y se vuelve a unir el resultado
- [ ] Hacer broadcast de la tabla de pedidos
- [ ] Ordenar la tabla por cliente_id antes del join
:::

:::ejercicio cli dificultad=Intermedio titulo="Los errores del driver"
Muestra las líneas de `~/incidentes/spark/logs/driver.log` que contienen `OutOfMemoryError`, `ExecutorLostFailure` o `FetchFailed` (usa `grep -E`).
```setup
incidente-preparar spark
```
```respuesta
grep -E ['"][^'"]*\|[^'"]*\|[^'"]*['"] \S*driver\.log
grep -E ['"][^'"]*\|[^'"]*['"] \S*driver\.log
```
```solucion
grep -E "OutOfMemoryError|ExecutorLostFailure|FetchFailed" ~/incidentes/spark/logs/driver.log
```
```pista
`grep -E "uno|dos|tres" archivo`.
```
:::

:::ejercicio quiz dificultad=Experto
En el log, el primer intento de la tarea 137 murió con *"Container killed by YARN for exceeding physical memory limits. 18.4 GB of 18 GB physical memory used. Consider boosting spark.executor.memoryOverhead"*, y el segundo con *"Java heap space"*. ¿Qué indica cada uno?

- [ ] Los dos son el mismo error con distinto texto
- [x] El primero: el contenedor superó la memoria total (heap + overhead) y el sistema lo mató; el segundo: se llenó el heap de la JVM. Los dos son síntomas de la misma partición gigante
- [ ] El primero es un error de disco y el segundo de red
- [ ] El primero se arregla bajando `spark.executor.memory`
:::

:::ejercicio cli dificultad=Avanzado titulo="Archivos chicos"
`~/incidentes/spark/listado_eventos.txt` lista los archivos de una partición: columna 1 = tamaño en bytes, columna 2 = ruta. Con `awk`, cuenta cuántos archivos pesan **menos de 1 MB** (1048576 bytes).
```setup
incidente-preparar spark
```
```respuesta
awk ['"]?\$1 ?< ?1048576 ?\{ ?(n|c|x|cant|total)\+\+;? ?\} ?END ?\{ ?print (n|c|x|cant|total);? ?\}['"]? \S*listado_eventos\.txt
awk ['"]?\$1 ?< ?1048576['"]? \S*listado_eventos\.txt \| wc -l
```
```solucion
awk '$1 < 1048576 {n++} END {print n}' ~/incidentes/spark/listado_eventos.txt
```
```pista
`awk 'condición {n++} END {print n}' archivo` cuenta las líneas que cumplen la condición.
```
```explicacion
860 de 900 archivos pesan menos de 1 MB. La partición entera pesa unos 5 GB: con archivos de 128 MB serían unos 40.
```
:::

:::ejercicio quiz dificultad=Avanzado
La partición del ejercicio anterior pesa unos 5.000 MB en 900 archivos. Si compactas a archivos de unos 128 MB, ¿cuántos archivos quedan aproximadamente?

- [ ] 900
- [ ] 200
- [x] 40
- [ ] 5
:::

:::ejercicio sql dificultad=Avanzado titulo="Mediana, máximo y ratio"
`spark_tareas(task_id, duracion_s, shuffle_read_mb, spill_mb)` tiene las 200 tareas del stage. Calcula la **mediana** de `duracion_s` (el promedio de los dos valores centrales), el **máximo** y el **ratio** máximo ÷ mediana (1 decimal).
```sql setup
CREATE TABLE spark_tareas (task_id INTEGER, duracion_s INTEGER, shuffle_read_mb INTEGER, spill_mb INTEGER);
WITH RECURSIVE n(i) AS (SELECT 0 UNION ALL SELECT i + 1 FROM n WHERE i < 199)
INSERT INTO spark_tareas
SELECT i, CASE WHEN i = 137 THEN 2710 WHEN i = 52 THEN 412 ELSE 38 + (i * 17) % 30 END,
       CASE WHEN i = 137 THEN 9416 WHEN i = 52 THEN 1210 ELSE 110 + (i * 29) % 60 END,
       CASE WHEN i = 137 THEN 21890 WHEN i = 52 THEN 1530 ELSE 0 END
FROM n;
```
```sql solucion
WITH o AS (
  SELECT duracion_s, ROW_NUMBER() OVER (ORDER BY duracion_s) AS rn, COUNT(*) OVER () AS c
  FROM spark_tareas
),
med AS (SELECT AVG(duracion_s) AS mediana FROM o WHERE rn IN ((c + 1) / 2, (c + 2) / 2))
SELECT mediana, (SELECT MAX(duracion_s) FROM spark_tareas) AS maximo,
       ROUND((SELECT MAX(duracion_s) FROM spark_tareas) / mediana, 1) AS ratio
FROM med;
```
```pista
Numera las tareas por duración con `ROW_NUMBER() OVER (ORDER BY duracion_s)` y cuenta el total con `COUNT(*) OVER ()`.
```
```pista
Con 200 filas, los valores centrales son el 100 y el 101: en general, `rn IN ((c + 1) / 2, (c + 2) / 2)` (división entera) sirve para cantidades pares e impares.
```
:::

:::ejercicio sql ordenado dificultad=Intermedio titulo="¿Qué clave concentra las filas?"
`pedidos_join(pedido_id, cliente_id)` es el lado grande del join. Devuelve las **2 claves con más filas**: `cliente_id`, `filas` y `pct` del total (1 decimal), de mayor a menor.
```sql setup
CREATE TABLE pedidos_join (pedido_id INTEGER PRIMARY KEY, cliente_id INTEGER);
WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 5000)
INSERT INTO pedidos_join
SELECT i, CASE WHEN i % 5 < 3 THEN 0 WHEN i % 97 = 0 THEN 4242 ELSE 100000 + (i * 7919) % 1500 END
FROM n;
```
```sql solucion
SELECT cliente_id, COUNT(*) AS filas,
       ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM pedidos_join), 1) AS pct
FROM pedidos_join
GROUP BY cliente_id
ORDER BY filas DESC
LIMIT 2;
```
```pista
`GROUP BY cliente_id`, `ORDER BY COUNT(*) DESC`, `LIMIT 2`.
```
```explicacion
El 60 % de las filas tiene `cliente_id = 0`. Esta consulta (o `df.groupBy("cliente_id").count().orderBy(desc("count"))` en PySpark) es lo primero que se corre cuando la Spark UI muestra skew.
```
:::

:::ejercicio sql dificultad=Experto titulo="El efecto del salting"
Simula el salting: la clave `0` se reparte en 8 "sub-claves" usando `pedido_id % 8` como sal; las demás claves quedan igual (sal 0). Devuelve `antes` (la mayor cantidad de filas de una partición agrupando por `cliente_id`) y `despues` (la mayor cantidad agrupando por `cliente_id` y la sal).
```sql setup
CREATE TABLE pedidos_join (pedido_id INTEGER PRIMARY KEY, cliente_id INTEGER);
WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 5000)
INSERT INTO pedidos_join
SELECT i, CASE WHEN i % 5 < 3 THEN 0 WHEN i % 97 = 0 THEN 4242 ELSE 100000 + (i * 7919) % 1500 END
FROM n;
```
```sql solucion
SELECT (SELECT MAX(c) FROM (SELECT COUNT(*) AS c FROM pedidos_join GROUP BY cliente_id)) AS antes,
       (SELECT MAX(c) FROM (SELECT COUNT(*) AS c FROM pedidos_join
                            GROUP BY cliente_id, CASE WHEN cliente_id = 0 THEN pedido_id % 8 ELSE 0 END)) AS despues;
```
```pista
La sal es `CASE WHEN cliente_id = 0 THEN pedido_id % 8 ELSE 0 END`. Agrupa por `cliente_id` y la sal, y quédate con el máximo de los conteos.
```
```explicacion
De 3.000 a 375 filas en la partición más grande: la tarea más lenta pasa a tener 8 veces menos trabajo. En un join real, la tabla del otro lado tiene que tener la fila del cliente 0 **replicada** con las 8 sales (0 a 7), si no, las sub-claves no encuentran pareja.
```
:::

:::ejercicio quiz dificultad=Avanzado
Mira `~/incidentes/spark/config_job.txt`. ¿Qué dos líneas explican que Spark no haya corregido el skew por su cuenta?

- [ ] `spark.executor.memory=16g` y `spark.dynamicAllocation.enabled=true`
- [x] `spark.sql.adaptive.enabled=false` (AQE apagado: no hay skew join automático) y `spark.sql.autoBroadcastJoinThreshold=-1` (broadcast desactivado)
- [ ] `spark.sql.shuffle.partitions=200` y `# workers spot: sí`
- [ ] `spark.executor.memoryOverhead=2g` y `spark.executor.memory=16g`
:::

:::ejercicio quiz dificultad=Intermedio
Un notebook falla con `OutOfMemoryError` en el **driver** justo después de `df.toPandas()` sobre una tabla de 50 GB. ¿Qué haces?

- [ ] Subir la memoria de los executors
- [x] No traer la tabla al driver: agregar o filtrar en Spark y convertir solo el resultado chico, o escribir el resultado a una tabla
- [ ] Subir `spark.sql.shuffle.partitions`
- [ ] Activar AQE
:::

:::errores
- **"Más memoria" como primera respuesta**: con skew, duplica el costo y la tarea gigante sigue sola (o falla un poco más tarde).
- **Mirar el promedio**: la mediana y el máximo de las tareas cuentan la historia; el promedio la esconde.
- **`collect()` y `toPandas()` sobre tablas grandes**: el driver es un solo proceso.
- **Particiones de salida al azar**: `repartition(2000)` antes de escribir deja 2.000 archivos por partición de la tabla.
- **Ignorar los nodos spot**: si los workers son spot, perder executors es normal; el job tiene que tolerarlo (y conviene que el driver no esté en un nodo spot).
:::

:::trabajo
- Antes de tocar configuración se mira la **Spark UI** (o el *Spark History Server* para jobs terminados): pestaña Stages, métricas de resumen de tareas, *Event Timeline* y el plan físico en la pestaña SQL.
- En Databricks, los *Query Profile* y las alertas de skew y spill del motor ayudan; `OPTIMIZE` y *predictive optimization* compactan las tablas administradas.
- Las configuraciones del job viven en el código (o en el bundle o la definición del job), versionadas: nunca solo en la consola.
- Se guarda un histórico de duración y costo por job: una regresión de 25 minutos a 2 horas se detecta el primer día, no el séptimo.
:::

:::entrevista
**"Un job de Spark tiene una tarea que tarda mucho más que el resto. ¿Qué haces?"** Confirmar skew con las métricas de la Spark UI (mediana contra máximo del shuffle read), encontrar la clave caliente con un `groupBy().count()`, y elegir: separar o filtrar la clave si es un valor basura (0, NULL, "desconocido"), AQE skew join, broadcast si un lado es chico, o salting. Explica por qué agregar memoria o executors no resuelve una partición gigante.
:::

## Resumen

| Síntoma | Causa | Corrección |
|---|---|---|
| 199 tareas rápidas y 1 eterna | Skew por clave caliente | Separar la clave, AQE, broadcast, salting |
| `exceeding memory limits` / `OOMKilled` | Memoria fuera del heap | `memoryOverhead`, revisar UDFs de Python |
| `Java heap space` | Heap del executor | Repartir datos, más particiones |
| OOM en el driver | `collect`, `toPandas`, broadcast enorme | Agregar en Spark, escribir a tabla |
| `FetchFailed` + stage repetido | Executor perdido | La causa de la pérdida (memoria, spot, disco) |
| Lecturas lentas con miles de archivos | Archivos chicos | Compactar, `optimizeWrite`, menos particiones de salida |
