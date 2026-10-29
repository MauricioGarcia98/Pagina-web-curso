# Tarjetas: Databricks Data Engineer Professional

## El estado de un stream con agregaciones crece sin fin
dominio: 1
Falta **watermark** (`withWatermark`); en joins de streams, además una condición de tiempo.

## Escribir un micro-lote en Delta sin duplicar al reintentar
dominio: 1
`MERGE` por clave dentro de `foreachBatch`, o `txnAppId` + `txnVersion` (con el `batchId`).

## Lógica propia con estado por clave y timers
dominio: 1
`transformWithState` (o `applyInPandasWithState`).

## UDF eficiente en Python sobre millones de filas
dominio: 1
**Pandas UDF** (vectorizada con Arrow). Mejor aún: funciones nativas de Spark.

## Un stream sobre Delta falla porque hubo UPDATE en la fuente
dominio: 1
`skipChangeCommits` para ignorarlos, o leer el **Change Data Feed**.

## Primer lote enorme al arrancar un stream
dominio: 1
`maxFilesPerTrigger` / `maxBytesPerTrigger`.

## Auto Loader lento listando millones de archivos
dominio: 2
Modo de **eventos de archivos (notificaciones)** en lugar del listado.

## Leer Kafka con Avro y Schema Registry
dominio: 2
`readStream.format("kafka")` + `from_avro` con el registro.

## Separar filas inválidas para revisarlas
dominio: 3
Patrón de **cuarentena**: una tabla con la regla y otra con la regla negada.

## JSON muy variable con buen rendimiento de consulta
dominio: 3
Tipo **VARIANT** (`parse_json`, consultas con `:`).

## LLM sobre millones de filas desde SQL
dominio: 3
`ai_query` / funciones de IA (`ai_classify`, `ai_extract`).

## Consultar una base PostgreSQL sin copiarla, con permisos de UC
dominio: 4
**Lakehouse Federation**: conexión + catálogo foráneo.

## Análisis conjunto con un socio sin ver sus filas
dominio: 4
**Clean Rooms**.

## Avisar si una métrica de negocio supera un umbral
dominio: 5
**Alerta de Databricks SQL** sobre una consulta programada.

## Tablas que dejaron de actualizarse, sin reglas manuales
dominio: 5
**Monitoreo de calidad de datos** (detección de anomalías de frescura y completitud).

## Un stream no da abasto
dominio: 5
`inputRowsPerSecond` > `processedRowsPerSecond` sostenido en `StreamingQueryProgress`.

## Una task tarda 40 min y las demás 30 s
dominio: 6
**Skew**: AQE skew join o *salting* de la clave caliente.

## Spill parejo en todas las tasks
dominio: 6
Particiones demasiado grandes: más particiones de shuffle (o AQE) o más memoria.

## Qué acelera Photon
dominio: 6
SQL y DataFrames nativos (scans, joins, agregaciones). **No** acelera UDFs de Python.

## Jobs de producción con la identidad de una persona
dominio: 7
Usar un **service principal** con permisos mínimos (`run_as` en el bundle).

## Borrado definitivo de datos personales
dominio: 7
`DELETE` → `REORG TABLE … APPLY (PURGE)` si hay deletion vectors → `VACUUM` tras la retención.

## Quién leyó una tabla
dominio: 8
`system.access.audit`.

## De qué columnas sale una columna de gold
dominio: 8
`system.access.column_lineage` / linaje de columnas.

## Dueño de los objetos de producción
dominio: 8
Un **grupo**, no una persona.

## Probar código de Spark desde el IDE
dominio: 9
**Databricks Connect** + pytest.

## Catálogo distinto por entorno en un bundle
dominio: 9
**Variables** del bundle con valor por target (`${var.catalogo}`).

## Clave subrogada automática en Delta
dominio: 10
`GENERATED ALWAYS AS IDENTITY`.

## ¿Se fuerzan las PRIMARY KEY en Unity Catalog?
dominio: 10
No: son **informativas**. Se fuerzan `NOT NULL` y `CHECK`.
