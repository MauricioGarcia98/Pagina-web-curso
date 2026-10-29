# Tarjetas: Databricks Data Engineer Associate

## Ingesta incremental de archivos nuevos en una carpeta, sin reprocesar
dominio: 2
**Auto Loader** (`cloudFiles`) con checkpoint. Para pocas cargas por lotes con SQL: `COPY INTO` (idempotente).

## Un campo nuevo aparece en los JSON que lee Auto Loader
dominio: 2
`schemaEvolutionMode = addNewColumns` (por defecto): el stream se detiene, agrega la columna y sigue al reiniciar. Lo que no encaja va a `_rescued_data`.

## Traer Salesforce, Workday o SQL Server sin código de extracción
dominio: 2
**Lakeflow Connect**: conectores administrados (SaaS y bases con CDC) hacia tablas de Unity Catalog.

## Leer un campo dentro de un string JSON en SQL
dominio: 2
Sintaxis de dos puntos: `payload:cliente.ciudad`. El punto (`a.b`) es para structs tipados.

## `DROP TABLE` en una tabla administrada vs. externa
dominio: 7
Administrada: se borran metadatos **y datos** (recuperable con `UNDROP` un tiempo). Externa: solo metadatos.

## Quedarse con la versión más reciente de cada clave
dominio: 3
`QUALIFY ROW_NUMBER() OVER (PARTITION BY id ORDER BY actualizado DESC) = 1`.

## Streaming table vs. vista materializada
dominio: 3
**Streaming table**: fuentes append-only, cada fila se procesa una vez. **Vista materializada**: resultado de una consulta mantenido actualizado (agregaciones, joins).

## Expectations: warn, drop, fail
dominio: 3
`expect` registra; `expect_or_drop` descarta las filas inválidas; `expect_or_fail` detiene la actualización. Las métricas quedan en el **event log**.

## Aplicar un feed de cambios con orden y SCD 2 en un pipeline declarativo
dominio: 3
**AUTO CDC** (`create_auto_cdc_flow`) con `sequence_by` y `stored_as_scd_type = 2`.

## Join de una tabla enorme con una dimensión chica
dominio: 3
**Broadcast join** de la dimensión (AQE suele elegirlo solo).

## Una tarea que debe correr aunque otras fallen
dominio: 4
Condición **Run if = All done** en la tarea.

## Pasar un valor de una tarea a la siguiente en un job
dominio: 4
**Task values**: `dbutils.jobs.taskValues.set` / `get`.

## Terminar un job fallido sin repetir lo exitoso
dominio: 4
**Repair run**: reejecuta las tareas fallidas y sus dependientes.

## Ejecutar la misma tarea para una lista de valores en paralelo
dominio: 4
Tarea **For each** con concurrencia configurable.

## Disparar un job cuando llegan archivos
dominio: 4
Disparador de **llegada de archivos** (file arrival) sobre una ubicación externa o volume.

## Desplegar jobs y pipelines igual en dev y prod desde Git
dominio: 5
**Declarative Automation Bundles** (antes Asset Bundles): `databricks.yml` con targets; `bundle validate`, `deploy -t prod`, `run`.

## `mode: development` en un bundle
dominio: 5
Prefija los recursos con el usuario y pausa los horarios, para no pisar producción.

## Ver por qué una consulta SQL es lenta
dominio: 6
**Query Profile** (operadores, tiempos, filas). Para Spark: **Spark UI** (stages, skew, spill).

## Muchos archivos chicos en una tabla Delta
dominio: 6
`OPTIMIZE` (o **Predictive Optimization**). `VACUUM` solo borra archivos sin referencia.

## Organizar una tabla nueva para filtros por varias columnas
dominio: 6
**Liquid Clustering** (`CLUSTER BY`), en lugar de particionado + Z-ORDER.

## Consumo de DBU por job o warehouse
dominio: 6
Tabla de sistema `system.billing.usage`.

## Privilegios mínimos para leer una tabla
dominio: 7
`USE CATALOG` + `USE SCHEMA` + `SELECT`.

## Ocultar una columna según quién consulta
dominio: 7
**Column mask** con una función (por ejemplo, `is_account_group_member`). Para filas: **row filter**.

## Compartir datos en vivo con alguien que no usa Databricks
dominio: 7
**Delta Sharing** con el protocolo abierto (recipient con token).

## Saber qué depende de una tabla antes de cambiarla
dominio: 7
**Linaje** de Unity Catalog (tablas y columnas).

## Cómputo que arranca en segundos y no se administra
dominio: 1
**Serverless** (jobs, notebooks, SQL warehouses). El clásico corre en la cuenta de nube del cliente.
