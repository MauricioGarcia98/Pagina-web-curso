---
titulo: Ingesta - Auto Loader, COPY INTO, read_files y Lakeflow Connect
nivel: Avanzado
duracion: 55
resumen: Las formas de traer datos a Databricks y cuándo usar cada una, Auto Loader a fondo (detección de archivos, esquema, datos rescatados, checkpoints), COPY INTO, read_files, conectores gestionados de Lakeflow Connect, JSON y VARIANT, y evolución de esquema en Delta.
objetivos: Elegir entre Auto Loader, COPY INTO, read_files, Lakeflow Connect y Lakehouse Federation según el escenario | Configurar Auto Loader con ubicación de esquema, modo de evolución y checkpoint | Explicar cómo Auto Loader y COPY INTO evitan reprocesar archivos | Consultar JSON anidado con la sintaxis de dos puntos y con el tipo VARIANT | Distinguir schema enforcement de schema evolution en tablas Delta
prerrequisitos: cert-databricks-plataforma-computo | databricks-delta-sql | spark-streaming
autoevaluacion: ¿Sabes cuándo conviene Auto Loader y cuándo COPY INTO? | ¿Sabes qué pasa con una columna nueva en cada modo de evolución de esquema? | ¿Sabes para qué sirve la columna _rescued_data? | ¿Sabes qué hace trigger(availableNow=True)? | ¿Sabes cuándo usar un conector gestionado de Lakeflow Connect?
---

:::escenario
Rápido, la app de delivery, tiene tres fuentes: (1) el sistema de pedidos deja cada minuto archivos JSON en un bucket; (2) el CRM es Salesforce; (3) la facturación vive en una base SQL Server. El equipo quiere todo en tablas Delta bronze, **sin reprocesar** lo ya cargado, sin perder datos cuando cambie el formato, y con el menor código posible. Cada fuente pide una herramienta distinta, y saber elegir es exactamente lo que evalúa este dominio.
:::

## El mapa de la ingesta

| Fuente | Herramienta recomendada | Por qué |
|---|---|---|
| Archivos que llegan a un bucket o volumen (continuo o por lotes) | **Auto Loader** | Incremental, escala a millones de archivos, evoluciona el esquema |
| Archivos ocasionales, cargas puntuales desde SQL | **COPY INTO** | Idempotente, simple, todo en SQL |
| Leer archivos una vez para explorar o crear una tabla | **`read_files`** + CTAS | Sin estado: lee lo que hay en ese momento |
| Aplicaciones SaaS (Salesforce, Workday, ServiceNow, Google Analytics…) y bases de datos (SQL Server, entre otras) | **Lakeflow Connect, conectores gestionados** | Databricks administra la extracción, el incremental y el CDC |
| Mensajería (Kafka, Kinesis, Event Hubs, Pub/Sub) | Structured Streaming o Declarative Pipelines (conectores estándar) | Lectura continua de un *stream* |
| Una base que quieres **consultar sin copiar** | **Lakehouse Federation** | Consulta en el origen; no es ingesta |
| Un archivo chico subido a mano | Interfaz *Add data* / subir a un volumen | Cargas puntuales |

```diagrama
titulo: Rápido: cada fuente con su forma de ingesta hacia bronze
nodo json: Pedidos JSON | icono=archivos | col=0 | fila=0 | sub=cada minuto al bucket
nodo sf: Salesforce | icono=salesforce | col=0 | fila=1 | sub=CRM
nodo sql: SQL Server | icono=sqlserver | col=0 | fila=2 | forma=cilindro | sub=facturación
nodo al: Auto Loader | icono=engranaje | col=1 | fila=0 | color=verde
nodo lc: Lakeflow Connect | icono=lakeflow | col=1 | fila=1 | sub=conector gestionado | color=violeta
nodo cdc: Lakeflow Connect | icono=lakeflow | col=1 | fila=2 | sub=gateway + CDC | color=violeta
nodo br: Bronze (Delta) | icono=delta | col=2 | fila=1 | forma=cilindro | color=naranja
flecha json -> al
flecha sf -> lc
flecha sql -> cdc
flecha al -> br
flecha lc -> br
flecha cdc -> br
```

## Auto Loader a fondo

**Auto Loader** es una fuente de Structured Streaming (`format("cloudFiles")`) que detecta y procesa **solo los archivos nuevos** de una ruta. Recuerda qué archivos ya procesó en el **checkpoint** (un almacén clave-valor RocksDB dentro de la carpeta de checkpoint), por eso garantiza que cada archivo se procesa **exactamente una vez**, aunque el job se caiga y se reinicie.

```python norun
(spark.readStream
   .format("cloudFiles")
   .option("cloudFiles.format", "json")                                   # formato de los archivos
   .option("cloudFiles.schemaLocation", "/Volumes/prod/bronze/_chk/pedidos_esquema")  # dónde guarda el esquema inferido
   .option("cloudFiles.inferColumnTypes", "true")                         # infiere tipos (si no, todo es STRING)
   .option("cloudFiles.schemaEvolutionMode", "addNewColumns")             # qué hacer con columnas nuevas (por defecto)
   .option("cloudFiles.schemaHints", "total DECIMAL(12,2), creado_en TIMESTAMP")  # fija tipos que no quieres inferir
   .load("/Volumes/prod/bronze/aterrizaje/pedidos/")
 .withColumn("_archivo", F.col("_metadata.file_path"))                    # de qué archivo vino cada fila
 .withColumn("_cargado_en", F.current_timestamp())
 .writeStream
   .option("checkpointLocation", "/Volumes/prod/bronze/_chk/pedidos")     # estado: archivos procesados y offsets
   .trigger(availableNow=True)                                            # procesa lo pendiente y se detiene
   .toTable("prod.bronze.pedidos"))
```

Qué hace cada parte:

- **`cloudFiles.schemaLocation`**: la primera vez, Auto Loader muestrea archivos, **infiere el esquema** y lo guarda ahí. En las siguientes ejecuciones lo reutiliza y lo versiona si cambia.
- **`inferColumnTypes`**: para JSON y CSV, sin esta opción todas las columnas se infieren como `STRING` (más seguro, pero hay que convertir después).
- **`schemaHints`**: impone el tipo de algunas columnas, aunque el resto se infiera.
- **`_metadata.file_path`**: la columna oculta `_metadata` trae ruta, nombre, tamaño y fecha de modificación del archivo origen. Guardarla en bronze permite auditar y reprocesar.
- **`checkpointLocation`**: cada stream necesita **su propio** checkpoint. Si lo borras, Auto Loader "olvida" lo procesado y vuelve a cargar todo.
- **`trigger(availableNow=True)`**: procesa todo lo pendiente (en varios lotes si hace falta) y termina. Es la forma de usar Auto Loader como **batch incremental** dentro de un job programado. Sin trigger, el stream queda corriendo continuamente.

### Cómo detecta los archivos nuevos

| Modo | Cómo funciona | Cuándo |
|---|---|---|
| **Listado de directorio** (por defecto) | Lista la carpeta y compara con lo procesado | Simple, sin permisos extra; puede volverse lento con muchísimos archivos |
| **Eventos de archivo / notificaciones** | Usa las notificaciones del proveedor (colas de eventos de S3, ADLS, GCS) para enterarse de cada archivo nuevo | Millones de archivos o directorios enormes. Con Unity Catalog se habilitan los *file events* en la ubicación externa y Databricks administra las colas |

### Qué pasa cuando cambia el esquema

Llega un JSON con una columna nueva, `propina`. Según `cloudFiles.schemaEvolutionMode`:

| Modo | Qué hace con `propina` |
|---|---|
| `addNewColumns` (por defecto si no das esquema) | El stream **se detiene** con un error, actualiza el esquema guardado agregando la columna, y **al reiniciarlo** continúa con la columna nueva. En un job con reintentos, el reintento lo resuelve solo |
| `rescue` | No cambia el esquema: el valor va a la columna **`_rescued_data`** (un JSON con lo que no encajó) |
| `failOnNewColumns` | Falla y no cambia nada hasta que alguien actualice el esquema a mano |
| `none` | Ignora la columna nueva (salvo que esté activado el rescate de datos) |

La columna **`_rescued_data`** también guarda valores con **tipo incorrecto** (por ejemplo `"total": "N/A"` cuando se esperaba un número) y columnas que difieren solo en mayúsculas. Así no se pierde nada: lo raro queda guardado para revisarlo.

:::examen El clásico del dominio de ingesta
"El stream de Auto Loader falló porque apareció una columna nueva. ¿Qué hay que hacer?" → con el modo por defecto (`addNewColumns`), **reiniciar el stream**: el esquema ya se actualizó. Por eso Databricks recomienda ejecutarlo en Lakeflow Jobs con **reintentos**.
:::

### Auto Loader en SQL

En SQL se usa `read_files` dentro de una *streaming table* (lo verás a fondo en Declarative Pipelines):

```sql norun
CREATE OR REFRESH STREAMING TABLE prod.bronze.pedidos
AS SELECT *, _metadata.file_path AS _archivo
FROM STREAM read_files(
  '/Volumes/prod/bronze/aterrizaje/pedidos/',
  format => 'json',
  schemaHints => 'total DECIMAL(12,2)'
);
```

`STREAM read_files(...)` usa Auto Loader por debajo: incremental y con checkpoint administrado.

## COPY INTO

`COPY INTO` carga archivos a una tabla Delta **desde SQL** y es **idempotente**: guarda en los metadatos de la tabla qué archivos ya cargó y los saltea si vuelves a ejecutar el comando.

```sql norun
CREATE TABLE IF NOT EXISTS prod.bronze.tarifas;     -- tabla vacía, sin esquema: COPY INTO lo infiere

COPY INTO prod.bronze.tarifas
FROM '/Volumes/prod/bronze/aterrizaje/tarifas/'
FILEFORMAT = CSV
FORMAT_OPTIONS ('header' = 'true', 'inferSchema' = 'true')
COPY_OPTIONS ('mergeSchema' = 'true');               -- acepta columnas nuevas
```

| | Auto Loader | COPY INTO |
|---|---|---|
| Interfaz | Python (Structured Streaming) o SQL con `STREAM read_files` | SQL |
| Escala | Millones de archivos | Miles de archivos |
| Evolución de esquema | Completa, con rescate de datos | `mergeSchema` |
| Ejecución | Continua o `availableNow` | Cada vez que ejecutas el comando |
| Recomendación de Databricks | Opción por defecto para ingesta incremental de archivos | Cargas simples y ocasionales desde SQL |

:::cuidado COPY INTO no es "recargar todo"
Ejecutar dos veces `COPY INTO` sobre los mismos archivos **no duplica** filas: los saltea. Si de verdad quieres recargarlos (por ejemplo, porque corregiste los archivos), usa `COPY_OPTIONS ('force' = 'true')`.
:::

## read_files: leer sin estado

`read_files` es una función de tabla que lee archivos **una vez**, sin recordar nada. Sirve para explorar o para crear una tabla con CTAS:

```sql norun
SELECT * FROM read_files('/Volumes/prod/bronze/aterrizaje/pedidos/', format => 'json') LIMIT 10;

CREATE OR REPLACE TABLE prod.bronze.pedidos_snapshot AS
SELECT * FROM read_files('/Volumes/prod/bronze/aterrizaje/pedidos/2026-10-01/', format => 'json');
```

Sin `STREAM`, cada ejecución relee todo: no sirve para cargas incrementales.

## Lakeflow Connect: conectores gestionados

**Lakeflow Connect** agrupa los conectores de ingesta de Databricks:

- **Conectores gestionados**: para **aplicaciones SaaS** (Salesforce, Workday, ServiceNow, Google Analytics, SharePoint, entre otras) y **bases de datos** (SQL Server y otras). Se configuran desde la interfaz o con la API, y Databricks administra la autenticación, la extracción **incremental**, el **CDC** (captura de cambios) y la evolución de esquema. Escriben en *streaming tables* gobernadas por Unity Catalog.
- Para bases de datos, un **gateway de ingesta** corre cerca de la base, lee el log de cambios y deja los cambios en un volumen; una **pipeline de ingesta** los aplica a las tablas de destino.
- **Conectores estándar**: los que configuras tú en código, como Auto Loader para archivos o las fuentes de Kafka, Kinesis, Event Hubs y Pub/Sub.

Se pagan como cómputo serverless de pipelines. La ventaja frente a escribir un extractor propio es que no mantienes el código de la API del proveedor, los límites de cuota ni la lógica de CDC.

## Lakehouse Federation: consultar sin copiar

**Lakehouse Federation** registra una base externa (PostgreSQL, MySQL, SQL Server, Snowflake, BigQuery, Redshift, otras) como un **catálogo foráneo** de Unity Catalog. Las consultas se envían al origen (con *pushdown* de filtros) y los permisos se manejan con Unity Catalog.

```sql norun
CREATE CONNECTION pg_ventas TYPE postgresql
OPTIONS (host 'pg.interna', port '5432', user secret('pg', 'usuario'), password secret('pg', 'clave'));

CREATE FOREIGN CATALOG ventas_pg USING CONNECTION pg_ventas OPTIONS (database 'ventas');

SELECT * FROM ventas_pg.public.facturas WHERE fecha = current_date();
```

Úsala para consultas puntuales, pruebas de concepto o datos que no justifican un pipeline. Para cargas grandes y frecuentes, ingesta a Delta.

## Datos semiestructurados: JSON y VARIANT

Si una columna `raw` guarda el JSON como texto, Databricks SQL permite navegarlo con **dos puntos**:

```sql norun
SELECT
  raw:pedido_id::BIGINT              AS pedido_id,     -- :: convierte el tipo
  raw:cliente.ciudad::STRING         AS ciudad,        -- . entra a un objeto anidado
  raw:items[0].producto::STRING      AS primer_item    -- [n] entra a una lista
FROM prod.bronze.pedidos_texto;
```

Para estructuras fijas, `from_json(raw, 'pedido_id BIGINT, items ARRAY<STRUCT<producto STRING, cantidad INT>>')` convierte el texto en columnas tipadas, y `schema_of_json` ayuda a escribir ese esquema.

El tipo **`VARIANT`** guarda datos semiestructurados en un formato binario eficiente: más rápido que el texto JSON y flexible ante cambios de forma.

```sql norun
CREATE TABLE prod.bronze.eventos (evento VARIANT);
INSERT INTO prod.bronze.eventos SELECT parse_json(raw) FROM prod.bronze.eventos_texto;

SELECT evento:tipo::STRING AS tipo, evento:propiedades.monto::DECIMAL(12,2) AS monto
FROM prod.bronze.eventos;
```

## Schema enforcement y schema evolution en Delta

- **Schema enforcement** (siempre activo): una escritura con columnas que la tabla no tiene, o con tipos incompatibles, **falla**. Protege la tabla de basura.
- **Schema evolution** (opcional): agregas columnas nuevas de forma explícita:
  - en una escritura: `.option("mergeSchema", "true")`;
  - en un `MERGE`: `MERGE WITH SCHEMA EVOLUTION INTO ...`;
  - a mano: `ALTER TABLE t ADD COLUMNS (propina DECIMAL(10,2))`.

:::errores
- **Compartir el checkpoint entre dos streams.** Síntoma: datos que faltan o errores raros. Corrección: un checkpoint por stream, siempre.
- **Borrar el checkpoint "para arreglar algo".** Síntoma: todos los archivos se vuelven a cargar y aparecen duplicados. Corrección: no tocarlo; si hay que reprocesar, hacerlo de forma controlada en otra tabla.
- **Inferir esquema sin `schemaLocation`.** Síntoma: Auto Loader se queja al iniciar. Corrección: indicar siempre una ubicación de esquema (Declarative Pipelines la administra sola).
- **Usar `read_files` sin `STREAM` en un job "incremental".** Síntoma: cada ejecución carga todo otra vez. Corrección: `STREAM read_files` o Auto Loader.
- **Escribir un extractor propio para Salesforce.** Síntoma: semanas de código y errores de cuotas de API. Corrección: conector gestionado de Lakeflow Connect.
:::

:::trabajo Convenciones de una capa bronze sana
En bronze se guarda **todo tal cual llega**, agregando columnas técnicas (`_archivo`, `_cargado_en`) y sin filtrar filas. Los archivos de aterrizaje van a un **volumen** de Unity Catalog con permisos de solo escritura para el sistema origen, y los checkpoints a una carpeta que nadie más toca. Así siempre puedes reconstruir silver y gold desde bronze.
:::

:::entrevista
**"Te llegan 2 millones de archivos pequeños por día a un bucket. ¿Cómo los cargas?"** Con Auto Loader en modo de eventos de archivo (notificaciones), para no listar el directorio entero en cada ejecución; con `trigger(availableNow=True)` dentro de un job cada hora si alcanza con esa latencia, o continuo si se necesita casi tiempo real; checkpoint propio, `schemaLocation`, `_metadata.file_path` en bronze y, después, `OPTIMIZE` o Liquid Clustering para compactar los archivos chicos.
:::

## Resumen

| Situación | Elige |
|---|---|
| Archivos incrementales, muchos, esquema que cambia | Auto Loader |
| Carga ocasional de archivos desde SQL, idempotente | COPY INTO |
| Explorar o cargar una vez | `read_files` + CTAS |
| SaaS o bases con CDC, sin código | Lakeflow Connect (conector gestionado) |
| Consultar una base externa sin copiar | Lakehouse Federation |
| JSON con forma cambiante | `VARIANT` o sintaxis `:` |

## Ejercicios

:::ejercicio quiz
Un stream de Auto Loader con la configuración por defecto se detuvo con un error porque los archivos nuevos traen la columna `propina`. ¿Qué debe hacer el equipo para que siga cargando con la columna nueva?
- [ ] Borrar el checkpoint y volver a ejecutar el stream desde cero.
- [x] Reiniciar el stream: Auto Loader ya actualizó el esquema guardado y continúa con la columna nueva.
- [ ] Cambiar a `COPY INTO`, que no falla con columnas nuevas.
- [ ] Ejecutar `ALTER TABLE ... ADD COLUMNS` y desactivar `schemaLocation`.
```explicacion
En el modo `addNewColumns` el stream se detiene a propósito, actualiza el esquema en `schemaLocation` y, al reiniciarse, procesa con la columna nueva. Borrar el checkpoint provocaría recargar todos los archivos.
```
:::

:::ejercicio quiz
Necesitas que las columnas nuevas **no** cambien el esquema de la tabla bronze, pero que sus valores no se pierdan. ¿Qué modo de evolución usas?
- [ ] `addNewColumns`
- [x] `rescue`
- [ ] `failOnNewColumns`
- [ ] `none`
```explicacion
Con `rescue`, el esquema queda fijo y los datos que no encajan (columnas nuevas o tipos incorrectos) se guardan como JSON en `_rescued_data`.
```
:::

:::ejercicio quiz
Un analista ejecuta el mismo `COPY INTO` tres veces seguidas sobre una carpeta que no cambió. ¿Qué pasa con la tabla?
- [ ] Queda con las filas triplicadas.
- [x] Queda igual que después de la primera ejecución: los archivos ya cargados se saltean.
- [ ] La segunda ejecución falla porque la tabla ya tiene datos.
- [ ] Se reemplaza el contenido en cada ejecución.
```explicacion
`COPY INTO` es idempotente: registra los archivos cargados y no los vuelve a procesar, salvo que uses `'force' = 'true'`.
```
:::

:::ejercicio quiz
La empresa quiere traer a Databricks los datos de Salesforce y las tablas de una base SQL Server con todos sus cambios (incluidos los borrados), con el mínimo código propio. ¿Qué usa?
- [ ] Un notebook que llame a la API de Salesforce y un `spark.read.jdbc` programado cada hora.
- [x] Conectores gestionados de Lakeflow Connect (SaaS y base de datos con CDC).
- [ ] Lakehouse Federation para las dos fuentes.
- [ ] Auto Loader apuntando a la API de Salesforce.
```explicacion
Lakeflow Connect administra la extracción incremental y el CDC, incluidos los borrados. Un `spark.read.jdbc` periódico no ve los borrados y Federation consulta en el origen sin copiar.
```
:::

:::ejercicio quiz
¿Qué hace `trigger(availableNow=True)` en un stream de Auto Loader?
- [ ] Procesa solo el primer archivo disponible y termina.
- [ ] Mantiene el stream corriendo y revisa cada segundo si hay archivos nuevos.
- [x] Procesa todos los archivos pendientes en uno o más lotes y termina.
- [ ] Reprocesa todos los archivos de la carpeta, incluidos los ya cargados.
```explicacion
Es la forma de usar un stream como carga batch incremental: dentro de un job programado procesa lo pendiente y libera el cómputo.
```
:::

:::ejercicio quiz
Una tabla Delta tiene las columnas `id` y `monto`. Un job intenta escribir un DataFrame con `id`, `monto` y `moneda` con `mode("append")` y sin otras opciones. ¿Qué pasa?
- [ ] Se agrega la columna `moneda` automáticamente.
- [ ] Se escriben `id` y `monto`, y `moneda` se descarta.
- [x] La escritura falla por *schema enforcement*.
- [ ] La tabla se reemplaza con el nuevo esquema.
```explicacion
Delta rechaza escrituras que no coinciden con el esquema. Para agregar la columna hay que pedirlo explícitamente con `mergeSchema` o con `ALTER TABLE`.
```
:::

:::ejercicio abierto
Escribe en Python el stream de Auto Loader que cargue archivos CSV con encabezado desde `/Volumes/dev/bronze/aterrizaje/clientes/` a la tabla `dev.bronze.clientes`, guardando el archivo de origen, y que procese lo pendiente y termine.
```python solucion
(spark.readStream
   .format("cloudFiles")
   .option("cloudFiles.format", "csv")
   .option("header", "true")
   .option("cloudFiles.schemaLocation", "/Volumes/dev/bronze/_chk/clientes_esquema")
   .load("/Volumes/dev/bronze/aterrizaje/clientes/")
 .withColumn("_archivo", F.col("_metadata.file_path"))
 .writeStream
   .option("checkpointLocation", "/Volumes/dev/bronze/_chk/clientes")
   .trigger(availableNow=True)
   .toTable("dev.bronze.clientes"))
```
:::

:::ejercicio abierto
La columna `raw` (texto JSON) tiene la forma `{"pedido": {"id": 7, "items": [{"sku": "A1", "cant": 2}]}}`. Escribe el `SELECT` que devuelva el id del pedido como número y el sku del primer ítem como texto.
```sql solucion
SELECT
  raw:pedido.id::BIGINT          AS pedido_id,
  raw:pedido.items[0].sku::STRING AS primer_sku
FROM prod.bronze.pedidos_texto;
```
:::
