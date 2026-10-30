---
titulo: Nivel Professional - streaming avanzado, CDC, modelado y código de producción
nivel: Experto
duracion: 70
resumen: Lo que el Professional agrega sobre el Associate - Structured Streaming con estado, watermarks y joins, foreachBatch con MERGE idempotente, Change Data Feed, modelado en el lakehouse (identity, constraints, columnas generadas, SCD con MERGE), VARIANT y funciones de IA en SQL, tipos de UDF, Iceberg y UniForm, y cómo probar y depurar código de producción.
objetivos: Escribir un stream con estado que tolere datos tardíos usando watermarks | Aplicar cambios con foreachBatch y MERGE de forma idempotente | Leer cambios incrementales de una tabla con Change Data Feed | Modelar tablas del lakehouse con identity, constraints y columnas generadas | Elegir el tipo de UDF correcto y probar transformaciones con pytest
prerrequisitos: cert-databricks-gobierno-seguridad | spark-streaming | modelado-scd
autoevaluacion: ¿Sabes qué pasa con el estado de una agregación por ventanas sin watermark? | ¿Sabes hacer un MERGE desde un stream sin duplicar en un reintento? | ¿Sabes qué columnas agrega Change Data Feed? | ¿Sabes cuándo una pandas UDF y cuándo una función SQL? | ¿Sabes probar una transformación sin un clúster?
---

:::escenario
El equipo de Rápido ya tiene pipelines en producción y el líder técnico prepara el **Data Engineer Professional**. Las preguntas de ese examen son de alguien que opera sistemas reales: un stream cuyo estado crece hasta reventar la memoria, un `MERGE` que duplica filas al reintentarse, una tabla gold que hay que actualizar solo con lo que cambió en silver, un modelo dimensional que debe soportar historia. Esta lección cubre ese nivel.
:::

## Structured Streaming con estado

Una consulta de streaming es **sin estado** si cada fila se procesa sola (filtrar, convertir tipos). Es **con estado** si necesita recordar algo entre micro-lotes: agregaciones, deduplicación, joins entre streams. Ese estado vive en el **state store** (en Databricks, RocksDB) dentro del checkpoint, y **crece** si no le dices cuándo puede olvidar.

```python norun
ventas_5m = (spark.readStream.table("prod.silver.pedidos")
  .withWatermark("creado", "15 minutes")                    # tolera hasta 15 min de atraso
  .groupBy(F.window("creado", "5 minutes"), "ciudad")
  .agg(F.sum("total").alias("ventas")))

(ventas_5m.writeStream
  .outputMode("append")                                       # emite cada ventana una vez, cuando se cierra
  .option("checkpointLocation", "/Volumes/prod/gold/_chk/ventas_5m")
  .trigger(processingTime="1 minute")
  .toTable("prod.gold.ventas_5m"))
```

- **Watermark**: "el evento más reciente que vi menos 15 minutos". Las ventanas que terminan antes de esa marca se **cierran**: se emiten y su estado se borra. Los eventos más atrasados que la marca se descartan.
- **Modos de salida**: `append` (solo filas finales; con agregaciones requiere watermark), `update` (filas que cambiaron en este lote), `complete` (toda la tabla resultado, solo para agregaciones chicas).
- **Deduplicación en streaming**: `dropDuplicatesWithinWatermark("pedido_id")` deduplica con un estado acotado por la watermark.
- **Join stream-stream**: ambos lados necesitan watermark y una condición de tiempo (`p.creado BETWEEN e.ts - INTERVAL 10 MINUTES AND e.ts`) para poder liberar estado.
- **Triggers**: `processingTime` (cada N), `availableNow` (lo pendiente y termina), continuo por defecto (lo antes posible). El modo *real-time* de Databricks apunta a latencias de milisegundos para casos operativos.

:::examen El estado que crece
"Un stream que agrega por `ciudad` y ventana de 1 hora consume cada vez más memoria hasta fallar" → falta **watermark**: sin ella, Spark guarda el estado de todas las ventanas para siempre por si llega un evento atrasado.
:::

## foreachBatch: MERGE desde un stream

Un stream no puede hacer `MERGE` directamente. Con **`foreachBatch`** recibes cada micro-lote como un DataFrame batch y haces lo que quieras con él, incluido un `MERGE`:

```python norun
from delta.tables import DeltaTable

def upsert_clientes(lote, batch_id):
    ultimos = (lote.withColumn("rn", F.row_number().over(
                    Window.partitionBy("cliente_id").orderBy(F.col("actualizado_en").desc())))
                 .filter("rn = 1").drop("rn"))                         # deduplicar el lote
    (DeltaTable.forName(lote.sparkSession, "prod.silver.clientes").alias("t")
       .merge(ultimos.alias("s"), "t.cliente_id = s.cliente_id")
       .whenMatchedUpdateAll(condition="s.actualizado_en > t.actualizado_en")
       .whenNotMatchedInsertAll()
       .execute())

(spark.readStream.table("prod.bronze.clientes_cambios")
   .writeStream
   .foreachBatch(upsert_clientes)
   .option("checkpointLocation", "/Volumes/prod/silver/_chk/clientes")
   .trigger(availableNow=True)
   .start())
```

**Idempotencia**: si el job falla después del `MERGE` pero antes de confirmar el checkpoint, el lote se vuelve a procesar. Este `MERGE` es idempotente por diseño (actualizar con los mismos valores no cambia nada). Para escrituras de tipo *append* dentro de `foreachBatch`, Delta ofrece las opciones `txnAppId` y `txnVersion` (normalmente el `batch_id`) para que una escritura repetida se ignore.

## Change Data Feed: leer solo lo que cambió

Con **Change Data Feed (CDF)** activado, Delta registra las filas que cambiaron en cada versión, con tres columnas extra:

| Columna | Valores |
|---|---|
| `_change_type` | `insert`, `update_preimage` (valor anterior), `update_postimage` (valor nuevo), `delete` |
| `_commit_version` | Versión de la tabla del cambio |
| `_commit_timestamp` | Cuándo se confirmó |

```sql norun
ALTER TABLE prod.silver.clientes SET TBLPROPERTIES (delta.enableChangeDataFeed = true);

-- Cambios entre dos versiones (batch)
SELECT * FROM table_changes('prod.silver.clientes', 120, 125) WHERE _change_type <> 'update_preimage';
```

```python norun
# Como stream: alimentar gold solo con lo que cambió en silver
cambios = (spark.readStream.option("readChangeFeed", "true").table("prod.silver.clientes"))
```

| | Change Data Feed | AUTO CDC |
|---|---|---|
| Qué hace | **Publica** los cambios de una tabla Delta | **Aplica** un flujo de cambios a una tabla destino |
| Dónde | Cualquier tabla Delta | Pipelines declarativos |
| Uso típico | Propagar cambios de silver a gold o a otro sistema | Construir silver (SCD 1 o 2) desde un CDC de origen |

```recorrido
titulo: Change Data Feed: tres versiones de una tabla y lo que devuelve table_changes
estacion v1: Versión 1 | icono=capas
estacion v2: Versión 2 | icono=transformar
estacion v3: Versión 3 | icono=x
estacion cdf: table_changes | icono=lupa
estacion uso: Aplicar en gold | icono=check
paso v1: Versión 1: se insertan dos clientes
La tabla tiene `delta.enableChangeDataFeed = true` (ejemplo).
>>> tabla
cliente_id,ciudad
7,Lima
8,Quito
paso v2: Versión 2: el cliente 7 se muda
Un `UPDATE` cambia Lima por Cusco.
>>> tabla
cliente_id,ciudad
7,Cusco
8,Quito
paso v3: Versión 3: se borra el cliente 8
Un `DELETE` lo elimina.
>>> tabla
cliente_id,ciudad
7,Cusco
paso cdf: Lo que devuelve table_changes(…, 1, 3)
Una fila por cambio, con columnas de control. Un update aparece **dos veces**: el valor anterior y el nuevo.
>>> tabla
cliente_id,ciudad,_change_type,_commit_version
7,Lima,insert,1
8,Quito,insert,1
7,Lima,update_preimage,2
7,Cusco,update_postimage,2
8,Quito,delete,3
paso uso: Aplicarlo en gold sin releer todo
Se descartan los `update_preimage`, se queda el último cambio por clave y se aplica un `MERGE` (en un stream, dentro de `foreachBatch`).
>>> sql
SELECT * FROM table_changes('prod.silver.clientes', 1, 3)
WHERE _change_type <> 'update_preimage';
```

## Modelado en el lakehouse

```sql norun
CREATE TABLE prod.gold.dim_cliente (
  cliente_sk      BIGINT GENERATED ALWAYS AS IDENTITY,           -- clave subrogada automática
  cliente_id      BIGINT NOT NULL,
  nombre          STRING,
  ciudad          STRING,
  vigente_desde   TIMESTAMP NOT NULL,
  vigente_hasta   TIMESTAMP,
  es_vigente      BOOLEAN GENERATED ALWAYS AS (vigente_hasta IS NULL),   -- columna generada
  CONSTRAINT pk_dim_cliente PRIMARY KEY (cliente_sk),                     -- informativa: no se fuerza
  CONSTRAINT ciudad_valida CHECK (ciudad IS NOT NULL)                     -- CHECK sí se fuerza
)
CLUSTER BY (cliente_id);
```

- **Identity**: genera números únicos (no necesariamente consecutivos). Ideal para claves subrogadas.
- **Columnas generadas**: se calculan a partir de otras al escribir.
- **Constraints**: `NOT NULL` y `CHECK` **se fuerzan** (una escritura que los viola falla). `PRIMARY KEY` y `FOREIGN KEY` son **informativas**: documentan el modelo y ayudan al optimizador y a las herramientas de BI, pero no evitan duplicados.
- **SCD tipo 2 con MERGE** (sin pipelines declarativos): el patrón clásico une el origen consigo mismo para, en un solo `MERGE`, cerrar la versión vigente e insertar la nueva. Con pipelines declarativos, AUTO CDC lo hace por ti.
- **Star schema en gold**: hechos con claves subrogadas hacia dimensiones; las dimensiones chicas se benefician del *broadcast join*. Las tablas anchas (OBT) son una alternativa cuando el consumo es siempre el mismo.

## VARIANT y funciones de IA en SQL

El Professional de octubre de 2026 incorpora el tipo **`VARIANT`** (lección de ingesta) y las **funciones de IA**, que llaman a modelos desde SQL:

```sql norun
SELECT
  resena_id,
  ai_analyze_sentiment(texto)                                  AS sentimiento,   -- positive, negative, neutral, mixed
  ai_classify(texto, ARRAY('demora', 'producto frío', 'repartidor', 'otro')) AS motivo,
  ai_query('databricks-meta-llama-3-3-70b-instruct',
           concat('Resume en 10 palabras: ', texto))           AS resumen
FROM prod.silver.resenas;
```

`ai_query` llama a cualquier endpoint de Model Serving (modelos fundacionales, externos o propios) y sirve para procesamiento **batch** sobre tablas grandes. Otras funciones: `ai_extract`, `ai_mask`, `ai_translate`, `ai_parse_document` (documentos a texto estructurado). Cuestan según el modelo usado, así que conviene probarlas sobre una muestra antes de correrlas sobre millones de filas.

## UDF: cuál usar

| Tipo | Rendimiento | Cuándo |
|---|---|---|
| **Funciones integradas** (`F.*`, funciones SQL) | El mejor: Photon y el optimizador las entienden | Siempre que existan |
| **Función SQL de Unity Catalog** (`CREATE FUNCTION … RETURN …`) | Muy bueno: se expande dentro del plan | Lógica reutilizable expresable en SQL; gobernada con permisos |
| **pandas UDF** (vectorizada, con Arrow) | Bueno | Lógica de Python que opera sobre columnas enteras (por ejemplo, con numpy) |
| **Python UDF** fila a fila | Lento: serializa cada fila entre la JVM y Python | Último recurso |
| **Python UDF de Unity Catalog** | Como una Python UDF, pero gobernada y reutilizable desde SQL | Compartir lógica de Python con permisos |

## Código de producción: módulos, pruebas y depuración

```python norun
# src/rapido/transform.py
def limpiar_pedidos(df):
    return (df.filter(F.col("pedido_id").isNotNull())
              .withColumn("ciudad", F.initcap(F.trim("ciudad"))))

# tests/test_transform.py
from pyspark.testing import assertDataFrameEqual

def test_limpiar_pedidos(spark):
    entrada = spark.createDataFrame([(1, " lima "), (None, "cusco")], "pedido_id INT, ciudad STRING")
    esperado = spark.createDataFrame([(1, "Lima")], "pedido_id INT, ciudad STRING")
    assertDataFrameEqual(limpiar_pedidos(entrada), esperado)
```

- La lógica vive en **funciones puras** (DataFrame → DataFrame) dentro de módulos; los notebooks solo las llaman.
- Las pruebas corren con `pytest` en CI, con una SparkSession local o con **Databricks Connect** contra cómputo serverless.
- Para **depurar** en producción: logs del driver y de los executors, la Spark UI (también de ejecuciones pasadas), el event log de los pipelines, y `StreamingQueryListener` o `query.lastProgress` para métricas de streaming (filas por segundo, tamaño del estado, retraso).

## Iceberg y UniForm

Unity Catalog administra también tablas **Apache Iceberg**, y **UniForm** permite que una tabla Delta se lea como Iceberg (genera los metadatos de Iceberg en paralelo). Sirve para que otros motores (Snowflake, Trino, BigQuery, Athena) lean las mismas tablas sin copias, a través del catálogo REST de Iceberg de Unity Catalog.

:::errores
- **Agregación por ventanas sin watermark.** Síntoma: el estado crece hasta agotar memoria. Corrección: `withWatermark`.
- **`MERGE` en `foreachBatch` sin deduplicar el lote.** Síntoma: error de múltiples filas que coinciden. Corrección: quedarse con la última versión por clave dentro del lote.
- **Confiar en `PRIMARY KEY` para evitar duplicados.** Síntoma: claves repetidas en la dimensión. Corrección: deduplicar en el pipeline o agregar pruebas de unicidad.
- **Python UDF fila a fila para algo que hace `regexp_replace`.** Síntoma: job 10 veces más lento. Corrección: funciones integradas.
:::

:::trabajo Cómo se ve el código en un equipo maduro
Paquete de Python con funciones de transformación probadas, pipelines declarativos o jobs que solo orquestan, CDF activado en silver para alimentar gold de forma incremental, watermarks en todo stream con estado, alertas sobre el retraso de los streams y revisión de código obligatoria con las pruebas en CI.
:::

:::entrevista
**"¿Cómo actualizas gold solo con lo que cambió en silver, si silver recibe updates y deletes?"** Activo Change Data Feed en silver y leo los cambios como stream (`readChangeFeed`), filtrando `update_preimage`. En `foreachBatch` aplico un `MERGE` sobre gold, deduplicando cada lote por clave y versión. Si gold es un agregado, en cambio, una materialized view se refresca de forma incremental sin escribir todo eso.
:::

## Ejercicios

:::ejercicio quiz
Un stream agrega pedidos por ciudad en ventanas de 10 minutos con `outputMode("append")`. Al iniciarlo, Spark da un error. ¿Qué falta?
- [ ] Un `trigger(availableNow=True)`.
- [x] Una watermark sobre la columna de tiempo del evento.
- [ ] Cambiar a `outputMode("complete")` siempre.
- [ ] Un checkpoint en otra carpeta.
```explicacion
En modo `append`, una agregación solo puede emitir una ventana cuando sabe que está cerrada, y eso lo determina la watermark. Sin ella, Spark no permite ese modo.
```
:::

:::ejercicio quiz
Necesitas aplicar un `MERGE` a una tabla Delta con los datos que llegan por un stream. ¿Cómo lo haces?
- [ ] `df.writeStream.format("delta").option("merge", "true")`.
- [x] Con `foreachBatch`, ejecutando el `MERGE` sobre cada micro-lote.
- [ ] Con `outputMode("update")`, que hace el MERGE automáticamente.
- [ ] No se puede hacer MERGE desde un stream.
```explicacion
`foreachBatch` entrega cada micro-lote como DataFrame batch, sobre el que se puede hacer `MERGE` o cualquier operación batch.
```
:::

:::ejercicio quiz
Activaste Change Data Feed en `silver.clientes` y lees los cambios. Para aplicar a gold solo el valor **nuevo** de cada actualización, ¿qué filas descartas?
- [ ] Las `insert`.
- [x] Las `update_preimage`.
- [ ] Las `update_postimage`.
- [ ] Las `delete`.
```explicacion
Cada actualización genera dos filas: la imagen anterior (`update_preimage`) y la nueva (`update_postimage`). Para aplicar el estado nuevo se descarta la anterior.
```
:::

:::ejercicio quiz
Una dimensión tiene `CONSTRAINT pk PRIMARY KEY (cliente_sk)`. Un job inserta por error dos filas con el mismo `cliente_sk`. ¿Qué pasa?
- [ ] La segunda inserción falla.
- [x] Se insertan las dos: en Databricks la primary key es informativa y no se fuerza.
- [ ] Delta reemplaza la primera fila por la segunda.
- [ ] La tabla queda bloqueada hasta corregir el duplicado.
```explicacion
Las claves primarias y foráneas son informativas. Las restricciones que sí se fuerzan son `NOT NULL` y `CHECK`.
```
:::

:::ejercicio quiz
Hay que normalizar números de teléfono con una lógica que ya existe en una librería de Python y que opera bien sobre arreglos de numpy. La tabla tiene 500 millones de filas. ¿Qué usas?
- [ ] Una Python UDF fila a fila.
- [x] Una pandas UDF (vectorizada).
- [ ] `collect()` y procesar en el driver.
- [ ] Un RDD con `map`.
```explicacion
La pandas UDF procesa columnas enteras con Arrow y es mucho más rápida que una UDF fila a fila. Si la lógica se pudiera escribir con funciones integradas, sería todavía mejor.
```
:::

:::ejercicio quiz
Un `foreachBatch` hace un *append* a una tabla. Si el job falla después de escribir pero antes de confirmar el checkpoint, el lote se reprocesa y se duplican filas. ¿Qué lo evita?
- [ ] Cambiar el trigger a `availableNow`.
- [x] Escribir con las opciones `txnAppId` y `txnVersion` (el `batch_id`), para que Delta ignore una escritura repetida.
- [ ] Borrar el checkpoint antes de cada ejecución.
- [ ] Usar `outputMode("complete")`.
```explicacion
Con `txnAppId` y `txnVersion`, Delta registra qué lote ya escribió esa aplicación y descarta la repetición, haciendo la escritura idempotente.
```
:::

:::ejercicio abierto
Escribe la consulta que devuelva los cambios de `prod.silver.productos` desde la versión 40 hasta la última, solo con los valores nuevos y los borrados.
```sql solucion
SELECT *
FROM table_changes('prod.silver.productos', 40)
WHERE _change_type IN ('insert', 'update_postimage', 'delete');
```
:::

:::ejercicio abierto
Escribe la definición de la tabla `prod.gold.dim_producto` con una clave subrogada automática `producto_sk`, `producto_id` no nulo, `nombre`, `precio` que no pueda ser negativo, y agrupada por `producto_id`.
```sql solucion
CREATE TABLE prod.gold.dim_producto (
  producto_sk BIGINT GENERATED ALWAYS AS IDENTITY,
  producto_id BIGINT NOT NULL,
  nombre      STRING,
  precio      DECIMAL(12,2),
  CONSTRAINT precio_no_negativo CHECK (precio >= 0)
)
CLUSTER BY (producto_id);
```
:::
