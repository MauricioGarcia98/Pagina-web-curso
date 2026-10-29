---
titulo: Optimizar, monitorear y resolver problemas
nivel: Avanzado
duracion: 60
resumen: Diagnosticar con la Spark UI, el Query Profile y el historial de consultas; organizar los datos con Liquid Clustering, OPTIMIZE, estadísticas y deletion vectors; Predictive Optimization; Photon, AQE, skew y spill; monitorear con tablas de sistema, alertas y monitoreo de calidad de datos; y resolver los errores más comunes.
objetivos: Diagnosticar una consulta o un job lento con la Spark UI y el Query Profile | Elegir entre Liquid Clustering, particionado y Z-order para una tabla | Explicar qué hace Predictive Optimization y cuándo se aplica | Reconocer skew, spill y archivos pequeños y aplicar la corrección adecuada | Construir alertas y análisis de costo y rendimiento sobre las tablas de sistema
prerrequisitos: cert-databricks-lakeflow-jobs | spark-optimizacion | databricks-delta-sql
autoevaluacion: ¿Sabes dónde mirar primero cuando una consulta SQL tarda? | ¿Sabes cuándo usar Liquid Clustering en vez de particionar? | ¿Sabes qué tablas optimiza solo Predictive Optimization? | ¿Puedes reconocer skew y spill en la Spark UI? | ¿Sabes consultar las consultas más caras en system.query.history?
---

:::escenario
El dashboard de ventas de Rápido tarda 90 segundos en abrir, el job nocturno pasó de 20 a 70 minutos en un mes y nadie sabe por qué. El examen pregunta exactamente esto: **dónde mirar**, **qué síntoma corresponde a qué problema** y **qué palanca mover**. En el trabajo, esta habilidad es la que separa a un ingeniero que "agranda el clúster" de uno que encuentra la causa.
:::

## Dónde mirar

| Herramienta | Qué muestra | Cuándo |
|---|---|---|
| **Query Profile** (SQL warehouses, serverless y notebooks) | El plan ejecutado como árbol: tiempo, filas y bytes de cada operador, archivos leídos y podados, spill | Una consulta SQL lenta |
| **Historial de consultas** (y `system.query.history`) | Todas las consultas con duración, bytes leídos, usuario, warehouse y tiempo en cola | Encontrar las consultas más lentas o caras |
| **Spark UI** (cómputo clásico) | Jobs, stages y tasks de Spark: duración, shuffle, spill, distribución de tiempos | Un job de Spark lento |
| **Event log del pipeline** | Progreso, métricas de calidad y tiempos de cada flujo | Un pipeline declarativo |
| **Vista de ejecuciones del job** y `system.lakeflow.*` | Duración y resultado de cada tarea a lo largo del tiempo | Un job que se fue volviendo lento |

### Leer el Query Profile

En el Query Profile buscas:

- **El operador que más tiempo consume**: casi siempre un *scan* (lectura), un *join* o un *aggregate*.
- **Archivos leídos vs. podados** en el scan: si la consulta filtra por `fecha` pero lee el 100 % de los archivos, el *data skipping* no está funcionando (la tabla no está organizada por esa columna).
- **Spill**: datos que no entraron en memoria y se escribieron en disco. Indica memoria insuficiente o una partición demasiado grande.
- **Tiempo en cola** antes de empezar: problema de concurrencia del warehouse, no de la consulta.

## Organizar los datos: el factor más importante

Delta guarda, por cada archivo, estadísticas de mínimo y máximo de las primeras **32 columnas**. Con un filtro como `WHERE fecha = '2026-10-28'`, el motor saltea los archivos cuyo rango no incluye esa fecha: eso es **data skipping**. Funciona bien si los datos de una misma fecha están **juntos** en pocos archivos. Las herramientas para lograrlo:

| Técnica | Cómo | Cuándo |
|---|---|---|
| **Liquid Clustering** | `CLUSTER BY (col1, col2)` o `CLUSTER BY AUTO` | **Recomendada para tablas nuevas**. Las claves se pueden cambiar sin reescribir todo; se aplica de forma incremental con `OPTIMIZE` |
| Particionado | `PARTITIONED BY (fecha)` | Tablas muy grandes con una columna de baja cardinalidad que siempre se filtra; incompatible con Liquid Clustering en la misma tabla |
| Z-order | `OPTIMIZE t ZORDER BY (col)` | Técnica anterior; en tablas nuevas, Liquid Clustering la reemplaza |

```sql norun
CREATE TABLE prod.silver.pedidos (…) CLUSTER BY (ciudad, dia);   -- al crear
ALTER TABLE prod.silver.pedidos CLUSTER BY (cliente_id);         -- cambiar las claves (sin reescribir todo)
ALTER TABLE prod.silver.pedidos CLUSTER BY AUTO;                 -- que Databricks elija según las consultas
OPTIMIZE prod.silver.pedidos;                                    -- compacta y agrupa lo pendiente
OPTIMIZE prod.silver.pedidos FULL;                               -- reagrupa todo (tras cambiar las claves)
ANALYZE TABLE prod.silver.pedidos COMPUTE STATISTICS FOR ALL COLUMNS;   -- estadísticas para el optimizador
```

### Otras piezas de Delta que afectan el rendimiento

- **Archivos pequeños**: muchas escrituras chicas (streaming, cargas frecuentes) generan miles de archivos de pocos KB y cada uno tiene costo de apertura. `OPTIMIZE` los compacta; la **auto compactación** y las **escrituras optimizadas** lo previenen.
- **Deletion vectors**: en vez de reescribir un archivo entero para borrar o actualizar unas pocas filas, Delta marca las filas como borradas en un archivo aparte. Acelera `DELETE`, `UPDATE` y `MERGE`; la limpieza física ocurre después (`OPTIMIZE`/`REORG TABLE … APPLY (PURGE)`).
- **`VACUUM`**: borra archivos que ya no pertenecen a la tabla (por defecto, de más de 7 días). Ahorra almacenamiento pero limita el *time travel*.

### Predictive Optimization

**Predictive Optimization** ejecuta automáticamente `OPTIMIZE`, `VACUUM` y `ANALYZE` en las **tablas administradas de Unity Catalog**, cuando el análisis de uso indica que conviene. Se activa por cuenta, catálogo o esquema, corre en cómputo serverless y sus operaciones quedan en `system.storage.predictive_optimization_operations_history`. No aplica a tablas externas.

:::examen Qué palanca mover
- "Las consultas filtran por `cliente_id`, que tiene millones de valores, y por `fecha`" → **Liquid Clustering** por esas columnas (particionar por `cliente_id` crearía millones de carpetas).
- "Una tabla de streaming tiene 200.000 archivos de 50 KB" → `OPTIMIZE` (y auto compactación).
- "No queremos programar OPTIMIZE y VACUUM a mano en cientos de tablas administradas" → **Predictive Optimization**.
- "Cambiaron los patrones de consulta y hay que cambiar las columnas de agrupamiento" → `ALTER TABLE … CLUSTER BY (nuevas)`; con particiones habría que reescribir la tabla.
:::

## El motor: Photon, AQE, skew y spill

- **Photon** acelera SQL y operaciones de DataFrame. Está activado en SQL warehouses y serverless; en clásico se elige al crear el clúster. No acelera UDF de Python ni RDD.
- **Adaptive Query Execution (AQE)**: ajusta el plan durante la ejecución (une particiones chicas tras un shuffle, convierte joins a *broadcast* si una tabla resultó chica, divide particiones con skew). Viene activado.
- **Skew**: una clave concentra muchos más datos que las otras. En la Spark UI: en un stage, casi todas las tasks tardan segundos y una o dos tardan minutos. Corrección: AQE (`spark.sql.adaptive.skewJoin.enabled`), tratar aparte la clave caliente (a menudo `NULL`), o *salting*.
- **Spill**: los datos de una task no entran en memoria y se escriben en disco. En la Spark UI: columnas *Spill (Memory)* y *Spill (Disk)* mayores a cero. Corrección: más particiones (tasks más chicas), máquinas con más memoria por núcleo, o resolver el skew que lo causa.
- **Broadcast join**: si una tabla es chica, enviarla entera a cada executor evita el shuffle de la grande. Hint: `SELECT /*+ BROADCAST(dim) */ …`.
- **Caché de disco**: en cómputo con discos locales rápidos, Databricks guarda copias de los archivos Parquet leídos y acelera lecturas repetidas, sin cambiar el código.

| Síntoma | Causa probable | Corrección |
|---|---|---|
| Una task de un stage tarda 20 veces más que la mediana | Skew | AQE skew join, aislar la clave caliente, salting |
| Spill a disco grande | Particiones muy grandes o skew | Más particiones, más memoria, corregir el skew |
| `OutOfMemoryError` en el **driver** | `collect()`, `toPandas()` o broadcast de una tabla grande | Agregar en Spark y traer poco; no forzar broadcast |
| La consulta lee todos los archivos aunque filtra por fecha | Datos no organizados por esa columna | Liquid Clustering por esa columna |
| Miles de archivos chicos y lecturas lentas | Escrituras frecuentes y pequeñas | `OPTIMIZE`, auto compactación, Predictive Optimization |
| Consultas que esperan antes de empezar | Concurrencia del warehouse | Más clústeres máximos en el escalado |

## Monitorear con tablas de sistema

| Tabla | Para |
|---|---|
| `system.billing.usage`, `system.billing.list_prices` | Costo por producto, job, warehouse, etiqueta |
| `system.query.history` | Consultas de SQL warehouses y serverless: duración, bytes, usuario |
| `system.lakeflow.jobs`, `job_run_timeline`, `job_task_run_timeline` | Ejecuciones, duraciones y fallas de jobs |
| `system.compute.clusters`, `system.compute.node_timeline` | Configuración y uso de CPU y memoria del cómputo |
| `system.access.audit` | Quién hizo qué (auditoría) |
| `system.access.table_lineage`, `column_lineage` | Linaje |
| `system.storage.predictive_optimization_operations_history` | Qué optimizó Predictive Optimization |

```sql norun
-- Las 10 consultas que más datos leyeron en la última semana
SELECT executed_by, statement_text, total_duration_ms / 1000 AS segundos,
       read_bytes / power(1024, 3) AS gb_leidos
FROM system.query.history
WHERE start_time >= current_timestamp() - INTERVAL 7 DAYS
ORDER BY read_bytes DESC
LIMIT 10;
```

**Alertas de SQL**: una consulta programada con una condición (por ejemplo, "si las fallas de hoy son más de 0" o "si la tabla no se actualizó en 6 horas") que envía una notificación. Con las tablas de sistema se arman alertas de costo, de fallas y de frescura.

**Monitoreo de calidad de datos** (antes *Lakehouse Monitoring*): sobre tablas de Unity Catalog calcula perfiles (nulos, distribuciones, deriva entre períodos) y detecta anomalías de **frescura** y **completitud** a nivel de esquema, con un dashboard y tablas de métricas sobre las que se pueden poner alertas.

## Errores comunes y qué significan

| Error | Qué pasó | Qué hacer |
|---|---|---|
| `DELTA_CONCURRENT_APPEND` / `ConcurrentAppendException` | Dos escrituras simultáneas tocaron los mismos archivos | Evitar escrituras concurrentes sobre la misma partición; la concurrencia a nivel de fila (con deletion vectors y Liquid Clustering) reduce los conflictos; reintentar |
| `DELTA_SCHEMA_MISMATCH` / esquema incompatible | La escritura trae columnas o tipos distintos | `mergeSchema` si el cambio es esperado; si no, corregir el origen |
| `PERMISSION_DENIED` / `INSUFFICIENT_PERMISSIONS` | Falta un permiso de Unity Catalog (a menudo `USE CATALOG` o `USE SCHEMA`) | Revisar la cadena de permisos completa |
| `FileNotFoundException` al leer una tabla | `VACUUM` borró archivos que una lectura antigua necesitaba | No bajar la retención por debajo de lo que duran las lecturas largas |

:::trabajo Cómo se trabaja el rendimiento en serio
Antes de tocar nada, se mide: duración y bytes leídos de las 20 consultas más frecuentes (`system.query.history`) y costo por job (`system.billing.usage`). Después se aplican, en orden: organizar los datos (Liquid Clustering, Predictive Optimization), corregir el código (filtros tempranos, sin `collect`, sin UDF de Python innecesarias) y recién al final cambiar el tamaño del cómputo. Cada cambio se compara con la medición anterior.
:::

:::entrevista
**"Un job que antes tardaba 20 minutos ahora tarda 70. ¿Qué haces?"** Comparo en `system.lakeflow.job_task_run_timeline` qué tarea creció. En esa tarea miro la Spark UI o el Query Profile: si un stage tiene una task mucho más lenta, es skew; si hay spill, falta memoria o el volumen creció; si se leen muchos más archivos, revisaría archivos pequeños y el agrupamiento de la tabla. También reviso si creció el volumen de datos de entrada, porque a veces el problema no es el código.
:::

## Ejercicios

:::ejercicio quiz
En el Query Profile de una consulta que filtra `WHERE fecha = '2026-10-28'`, el scan lee 4.000 de 4.000 archivos. ¿Qué es lo más probable y qué haces?
- [ ] El warehouse es chico; subes su tamaño.
- [x] La tabla no está organizada por `fecha`, así que el data skipping no saltea archivos; aplicas Liquid Clustering por `fecha` y ejecutas `OPTIMIZE`.
- [ ] Falta un índice; creas un índice B-tree sobre `fecha`.
- [ ] Photon está desactivado; lo activas.
```explicacion
Si los datos de cada fecha están repartidos en todos los archivos, los rangos mínimo-máximo de cada archivo incluyen la fecha y no se puede saltear ninguno. Agrupar los datos por esa columna lo resuelve. Delta no usa índices B-tree.
```
:::

:::ejercicio quiz
Las consultas sobre una tabla de 5 TB filtran por `cliente_id` (2 millones de valores distintos) y por `fecha`. ¿Qué técnica aplicas?
- [ ] `PARTITIONED BY (cliente_id)`.
- [x] `CLUSTER BY (cliente_id, fecha)` con Liquid Clustering.
- [ ] `PARTITIONED BY (cliente_id, fecha)`.
- [ ] Ninguna: Delta optimiza solo cualquier filtro.
```explicacion
Particionar por una columna de alta cardinalidad crea millones de carpetas y archivos pequeños. Liquid Clustering agrupa los datos por varias columnas sin ese problema.
```
:::

:::ejercicio quiz
¿Qué hace Predictive Optimization?
- [ ] Reescribe automáticamente las consultas lentas.
- [x] Ejecuta OPTIMIZE, VACUUM y ANALYZE en tablas administradas de Unity Catalog cuando conviene.
- [ ] Agranda el cómputo cuando detecta consultas lentas.
- [ ] Crea índices en las tablas externas más consultadas.
```explicacion
Predictive Optimization automatiza el mantenimiento de las tablas administradas de Unity Catalog, en cómputo serverless. No actúa sobre tablas externas ni cambia el código de las consultas.
```
:::

:::ejercicio quiz
En la Spark UI, un stage tiene 400 tasks: 398 tardan 5 segundos y 2 tardan 12 minutos. ¿Qué problema es?
- [ ] Spill por falta de memoria en todas las tasks.
- [x] Skew: unas pocas claves concentran la mayoría de los datos.
- [ ] Muy pocas particiones.
- [ ] El driver se quedó sin memoria.
```explicacion
Una distribución así de despareja dentro de un mismo stage es el síntoma típico de skew.
```
:::

:::ejercicio quiz
Un notebook falla con `OutOfMemoryError` en el **driver** al ejecutar `df.toPandas()` sobre 80 millones de filas. ¿Qué corrección es correcta?
- [ ] Agregar más workers al clúster.
- [x] Agregar o filtrar en Spark y traer al driver solo el resultado chico.
- [ ] Activar Photon.
- [ ] Aumentar `spark.sql.shuffle.partitions`.
```explicacion
`toPandas()` y `collect()` traen todos los datos al driver. Más workers no ayudan, porque el problema es la memoria de una sola máquina.
```
:::

:::ejercicio quiz
¿Qué tabla de sistema usas para encontrar las consultas que más datos leyeron en un SQL warehouse?
- [ ] `system.billing.usage`
- [x] `system.query.history`
- [ ] `system.access.audit`
- [ ] `system.lakeflow.job_run_timeline`
```explicacion
`system.query.history` registra cada consulta con su duración, bytes leídos, usuario y warehouse.
```
:::

:::ejercicio abierto
Escribe las sentencias para (1) cambiar las claves de agrupamiento de `prod.gold.ventas` a `ciudad` y `dia`, y (2) reagrupar todos los datos existentes con las claves nuevas.
```sql solucion
ALTER TABLE prod.gold.ventas CLUSTER BY (ciudad, dia);
OPTIMIZE prod.gold.ventas FULL;
```
:::

:::ejercicio abierto
Escribe una consulta sobre las tablas de sistema que muestre, por día de los últimos 14 días, cuántas ejecuciones de jobs fallaron.
```sql solucion
SELECT date(period_start_time) AS dia, COUNT(*) AS fallas
FROM system.lakeflow.job_run_timeline
WHERE period_start_time >= current_timestamp() - INTERVAL 14 DAYS
  AND result_state = 'FAILED'
GROUP BY ALL
ORDER BY dia;
```
:::
