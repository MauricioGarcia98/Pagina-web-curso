---
titulo: Transformar y modelar - Spark SQL, PySpark y Lakeflow Spark Declarative Pipelines
nivel: Avanzado
duracion: 60
resumen: Las transformaciones que más evalúa el examen (joins, deduplicación, agregaciones, ventanas, arrays), los objetos de la capa gold, y Lakeflow Spark Declarative Pipelines a fondo - streaming tables, materialized views, flows, expectativas, AUTO CDC con SCD 1 y 2, modos y event log.
objetivos: Deduplicar, unir y agregar datos con Spark SQL y PySpark eligiendo la técnica correcta | Elegir entre tabla, vista, materialized view y streaming table para un caso | Escribir un pipeline declarativo bronze → silver → gold en SQL y en Python | Aplicar expectativas de calidad con la acción correcta (advertir, descartar o fallar) | Implementar CDC con AUTO CDC como SCD tipo 1 y tipo 2
prerrequisitos: cert-databricks-ingesta | pyspark-ventanas | modelado-scd
autoevaluacion: ¿Sabes deduplicar quedándote con la versión más reciente de cada clave? | ¿Sabes cuándo una streaming table y cuándo una materialized view? | ¿Sabes qué hace cada acción de una expectativa? | ¿Sabes qué columnas agrega AUTO CDC en SCD tipo 2? | ¿Sabes la diferencia entre el modo desarrollo y producción de un pipeline?
---

:::escenario
En Rápido, el equipo tiene la capa bronze cargada (lección anterior). Ahora necesita: pedidos limpios y sin duplicados en silver, la tabla de clientes con **historia** de sus cambios de ciudad (SCD tipo 2) a partir del CDC de la base, y métricas diarias por ciudad en gold que se actualicen solas. Quieren declararlo una vez y que la plataforma se ocupe del orden, los reintentos, el incremental y la calidad. Eso es **Lakeflow Spark Declarative Pipelines**.
:::

## Primero, las transformaciones que más aparecen

El examen da por sabido Spark SQL y PySpark (los ves en los módulos de Spark y PySpark). Estas son las piezas que más se preguntan, con su versión en SQL de Databricks:

| Necesidad | SQL de Databricks | PySpark |
|---|---|---|
| Quedarte con la última versión de cada clave | `QUALIFY ROW_NUMBER() OVER (PARTITION BY id ORDER BY ts DESC) = 1` | `Window` + `row_number()` + `filter` |
| Quitar filas idénticas | `SELECT DISTINCT *` | `dropDuplicates()` o `dropDuplicates(["id"])` |
| Una fila por elemento de una lista | `explode(items)` / `LATERAL VIEW explode` | `F.explode("items")` |
| Transformar cada elemento de una lista sin explotar | `transform(items, x -> x.precio * x.cant)` | `F.transform("items", lambda x: ...)` |
| Filtrar elementos de una lista | `filter(items, x -> x.cant > 0)` | `F.filter(...)` |
| ¿Algún elemento cumple? | `exists(items, x -> x.sku = 'A1')` | `F.exists(...)` |
| Pasar filas a columnas | `PIVOT` | `groupBy().pivot()` |
| Agrupar por todas las columnas no agregadas | `GROUP BY ALL` | — |
| Reutilizar lógica en SQL | `CREATE FUNCTION f(x DOUBLE) RETURNS DOUBLE RETURN x * 1.18` (función SQL en Unity Catalog) | — |

:::cuidado dropDuplicates no elige "la más reciente"
`dropDuplicates(["cliente_id"])` deja **una fila cualquiera** de cada cliente. Si necesitas la versión más reciente, ordena con una ventana (`ROW_NUMBER` por fecha descendente) y quédate con la primera.
:::

## Los objetos de la capa gold (y de todas las capas)

| Objeto | Qué guarda | Cuándo |
|---|---|---|
| **Tabla administrada (managed)** | Datos en Delta, administrados por Unity Catalog | El caso por defecto |
| **Vista** | Solo la consulta; se calcula al leerla | Lógica liviana, seguridad (exponer columnas elegidas) |
| **Materialized view (MV)** | El **resultado** precalculado de una consulta, que se refresca (de forma incremental cuando se puede) | Agregaciones y joins que leen muchos datos y se consultan seguido |
| **Streaming table (ST)** | Una tabla Delta que recibe datos de forma **incremental**: cada fila de origen se procesa una vez | Ingesta y transformaciones de solo agregado (*append*) |
| **Vista temporal** | Una consulta con nombre que solo existe en la sesión o en el pipeline | Pasos intermedios que no se publican |

La regla práctica: **streaming table para lo que llega** (append, eventos, archivos) y **materialized view para lo que se recalcula** (agregados, joins con dimensiones que cambian).

## Lakeflow Spark Declarative Pipelines

Un **pipeline declarativo** es un conjunto de definiciones de tablas: escribes **qué** debe contener cada tabla y la plataforma resuelve **cómo**: el orden (a partir de las dependencias), el cómputo, los reintentos, los checkpoints, el procesamiento incremental y las métricas de calidad. Antes se llamaba Delta Live Tables (DLT).

```diagrama
titulo: El pipeline de Rápido: archivos y CDC hacia silver y gold
nodo f: Archivos de pedidos | icono=archivos | col=0 | fila=0
nodo c: Cambios de clientes (CDC) | icono=base | col=0 | fila=1 | forma=cilindro
nodo bp: bronze_pedidos | icono=tabla | col=1 | fila=0 | sub=streaming table | color=naranja
nodo bc: bronze_clientes_cdc | icono=tabla | col=1 | fila=1 | sub=streaming table | color=naranja
nodo sp: silver_pedidos | icono=tabla | col=2 | fila=0 | sub=ST + expectativas | color=gris
nodo sc: silver_clientes | icono=tabla | col=2 | fila=1 | sub=AUTO CDC · SCD 2 | color=gris
nodo g: gold_ventas_diarias | icono=grafico | col=3 | fila=0 | sub=materialized view | color=amarillo
flecha f -> bp
flecha c -> bc
flecha bp -> sp
flecha bc -> sc
flecha sp -> g
flecha sc -> g
```

### En SQL

```sql norun
-- BRONZE: ingesta incremental de archivos (Auto Loader por debajo)
CREATE OR REFRESH STREAMING TABLE bronze_pedidos
COMMENT 'Pedidos tal como llegan'
AS SELECT *, _metadata.file_path AS _archivo
FROM STREAM read_files('/Volumes/prod/rapido/aterrizaje/pedidos/', format => 'json');

-- SILVER: limpieza con expectativas de calidad
CREATE OR REFRESH STREAMING TABLE silver_pedidos (
  CONSTRAINT id_valido     EXPECT (pedido_id IS NOT NULL)        ON VIOLATION FAIL UPDATE,
  CONSTRAINT total_positivo EXPECT (total > 0)                   ON VIOLATION DROP ROW,
  CONSTRAINT ciudad_conocida EXPECT (ciudad IN ('Lima', 'Cusco', 'Arequipa'))   -- sin acción: solo advierte
)
AS SELECT
  CAST(pedido_id AS BIGINT) AS pedido_id,
  cliente_id,
  initcap(trim(ciudad))     AS ciudad,
  CAST(total AS DECIMAL(12,2)) AS total,
  CAST(creado AS TIMESTAMP)  AS creado
FROM STREAM(bronze_pedidos);

-- GOLD: agregado que se refresca solo
CREATE OR REFRESH MATERIALIZED VIEW gold_ventas_diarias
AS SELECT date(creado) AS dia, ciudad, COUNT(*) AS pedidos, SUM(total) AS ventas
FROM silver_pedidos
GROUP BY ALL;
```

Qué observar:

- `STREAM(bronze_pedidos)` lee la tabla de origen **de forma incremental** (solo lo nuevo). Sin `STREAM`, la lectura es completa (lo que hace la materialized view).
- Las referencias entre tablas (`silver_pedidos` lee `bronze_pedidos`) le dicen al pipeline el **orden**. No escribes un DAG a mano.
- Las tablas se publican en el **catálogo y esquema** configurados en el pipeline (Unity Catalog).

### En Python

```python norun
from pyspark import pipelines as dp
from pyspark.sql import functions as F

@dp.table(comment="Pedidos tal como llegan")             # @dp.table crea una STREAMING TABLE
def bronze_pedidos():
    return (spark.readStream.format("cloudFiles")
              .option("cloudFiles.format", "json")
              .load("/Volumes/prod/rapido/aterrizaje/pedidos/")
              .withColumn("_archivo", F.col("_metadata.file_path")))

@dp.table
@dp.expect_or_fail("id_valido", "pedido_id IS NOT NULL")
@dp.expect_or_drop("total_positivo", "total > 0")
@dp.expect("ciudad_conocida", "ciudad IN ('Lima', 'Cusco', 'Arequipa')")
def silver_pedidos():
    return (spark.readStream.table("bronze_pedidos")      # lectura incremental
              .select(F.col("pedido_id").cast("bigint"), "cliente_id",
                      F.initcap(F.trim("ciudad")).alias("ciudad"),
                      F.col("total").cast("decimal(12,2)"), F.col("creado").cast("timestamp")))

@dp.materialized_view                                     # MATERIALIZED VIEW
def gold_ventas_diarias():
    return (spark.read.table("silver_pedidos")            # lectura completa
              .groupBy(F.to_date("creado").alias("dia"), "ciudad")
              .agg(F.count("*").alias("pedidos"), F.sum("total").alias("ventas")))
```

| Decorador | Crea |
|---|---|
| `@dp.table` | Streaming table (si la función devuelve un DataFrame de streaming) |
| `@dp.materialized_view` | Materialized view |
| `@dp.temporary_view` (antes `@dlt.view`) | Vista temporal, solo dentro del pipeline |

La lectura define el tipo de procesamiento: `spark.readStream` → incremental; `spark.read` → completo.

### Expectativas: las tres acciones

| Acción | SQL | Python | Qué pasa con la fila mala | ¿Se detiene el pipeline? |
|---|---|---|---|---|
| Advertir (por defecto) | `EXPECT (...)` | `@dp.expect` | Se escribe igual | No |
| Descartar | `ON VIOLATION DROP ROW` | `@dp.expect_or_drop` | No se escribe | No |
| Fallar | `ON VIOLATION FAIL UPDATE` | `@dp.expect_or_fail` | — | Sí, la actualización falla |

En los tres casos las cuentas (filas que pasaron y que no) quedan en el **event log** del pipeline y se ven en la interfaz. Para aplicar varias reglas juntas existen `@dp.expect_all`, `@dp.expect_all_or_drop` y `@dp.expect_all_or_fail`, que reciben un diccionario `{"nombre": "condición"}`.

:::examen La pregunta de las expectativas
"Las filas sin `pedido_id` deben **descartarse** pero el pipeline debe **seguir** y quedar registro de cuántas fueron" → `EXPECT ... ON VIOLATION DROP ROW` (o `@dp.expect_or_drop`). "Si aparece una sola fila sin id, nadie debe usar los datos" → `FAIL UPDATE`. Para **guardar** las filas malas (cuarentena), el patrón es escribir una segunda tabla con la condición invertida.
:::

## AUTO CDC: aplicar cambios con historia

Una base de datos te envía un flujo de cambios con la operación (`INSERT`, `UPDATE`, `DELETE`), la clave y un número de secuencia. Aplicarlos a mano con `MERGE` es delicado: hay que ordenar, deduplicar, manejar cambios que llegan desordenados y borrados. **AUTO CDC** (antes `APPLY CHANGES INTO`, que sigue funcionando) lo resuelve de forma declarativa:

```sql norun
CREATE OR REFRESH STREAMING TABLE silver_clientes;

CREATE FLOW clientes_cdc AS AUTO CDC INTO silver_clientes
FROM STREAM(bronze_clientes_cdc)
KEYS (cliente_id)                       -- clave de negocio
APPLY AS DELETE WHEN operacion = 'DELETE'
SEQUENCE BY secuencia                   -- define el orden real de los cambios
COLUMNS * EXCEPT (operacion, secuencia)
STORED AS SCD TYPE 2;                   -- guarda historia
```

```python norun
dp.create_streaming_table("silver_clientes")

dp.create_auto_cdc_flow(
    target="silver_clientes",
    source="bronze_clientes_cdc",
    keys=["cliente_id"],
    sequence_by=F.col("secuencia"),
    apply_as_deletes=F.expr("operacion = 'DELETE'"),
    except_column_list=["operacion", "secuencia"],
    stored_as_scd_type=2,
)
```

- **SCD tipo 1** (`STORED AS SCD TYPE 1`, por defecto): la tabla tiene la versión **actual** de cada cliente; los cambios sobrescriben y los borrados borran.
- **SCD tipo 2**: cada cambio cierra la versión anterior y abre una nueva. AUTO CDC agrega las columnas **`__START_AT`** y **`__END_AT`** (la vigente tiene `__END_AT` nulo). Con `TRACK HISTORY ON ciudad, segmento` limitas qué columnas generan una versión nueva.
- **`SEQUENCE BY`** resuelve los cambios desordenados: si llega tarde un cambio con secuencia menor, no pisa uno más nuevo.

## Cómo se ejecuta un pipeline

| Concepto | Opciones |
|---|---|
| **Modo de ejecución** | *Triggered*: procesa lo pendiente y se detiene (lo habitual, programado desde un job). *Continuous*: queda corriendo para baja latencia |
| **Modo desarrollo / producción** | En desarrollo reutiliza el cómputo y no reintenta, para iterar rápido; en producción reintenta ante fallas y libera el cómputo al terminar |
| **Cómputo** | Serverless (recomendado: además refresca las materialized views de forma incremental cuando puede) o clásico |
| **Actualización** | Normal: incremental. *Full refresh*: borra y recalcula todo (cuidado: en streaming tables con origen que ya no tiene los datos, perderías historia) |
| **Event log** | Tabla con cada evento del pipeline: progreso, métricas de expectativas, linaje, errores. Se consulta con SQL |

:::errores
- **Leer una tabla del pipeline sin `STREAM` en una streaming table.** Síntoma: error o reprocesamiento completo. Corrección: `STREAM(tabla)` o `spark.readStream`.
- **Usar una streaming table para un agregado que cambia.** Síntoma: los totales no se corrigen cuando llegan datos tardíos o se actualiza una dimensión. Corrección: materialized view.
- **`MERGE` a mano para CDC sin ordenar por secuencia.** Síntoma: versiones viejas pisan a las nuevas. Corrección: AUTO CDC con `SEQUENCE BY`.
- **Full refresh de bronze cuando el origen borra archivos viejos.** Síntoma: pierdes historia irrecuperable. Corrección: proteger tablas con `pipelines.reset.allowed = false`.
:::

:::trabajo Cómo se organiza en producción
Un pipeline por dominio (pedidos, clientes), con el código en archivos `.sql` o `.py` versionados en Git y desplegados con un bundle. Las expectativas críticas usan `FAIL` en silver y las de negocio usan advertencia, con un dashboard sobre el event log que muestra el porcentaje de filas que fallan cada regla. Gold se arma con materialized views que consultan los tableros.
:::

:::entrevista
**"¿Cuándo usarías una materialized view y cuándo una streaming table?"** La streaming table procesa cada fila de origen una vez: ideal para ingesta y transformaciones de solo agregado, de baja latencia y bajo costo. La materialized view guarda el resultado de una consulta y se refresca: ideal cuando el resultado puede cambiar por datos tardíos, actualizaciones o borrados en las tablas que lee, como agregados y joins con dimensiones.
:::

## Resumen

| Quiero… | Uso |
|---|---|
| Cargar archivos de forma incremental | Streaming table con `STREAM read_files` |
| Limpiar con reglas de calidad | Expectativas (`EXPECT`, `DROP ROW`, `FAIL UPDATE`) |
| Aplicar CDC con o sin historia | AUTO CDC, `STORED AS SCD TYPE 1` o `2` |
| Agregados que se mantienen correctos | Materialized view |
| Pasos intermedios sin publicar | Vista temporal |

## Ejercicios

:::ejercicio sql titulo="La versión más reciente de cada cliente"
La tabla `clientes_crudo` tiene varias cargas de cada cliente (columna `fecha_carga`). Devuelve **una fila por cliente**, la de `fecha_carga` más reciente, con `cliente_id`, `nombre`, `ciudad` y `fecha_carga`, ordenadas por `cliente_id`. (En Databricks usarías `QUALIFY`; acá, una CTE con `ROW_NUMBER`.)
```sql inicial
WITH ordenado AS (
  SELECT cliente_id, nombre, ciudad, fecha_carga,
         ROW_NUMBER() OVER (PARTITION BY cliente_id ORDER BY /* completa */) AS rn
  FROM clientes_crudo
)
SELECT cliente_id, nombre, ciudad, fecha_carga FROM ordenado WHERE rn = 1 ORDER BY cliente_id;
```
```sql solucion
WITH ordenado AS (
  SELECT cliente_id, nombre, ciudad, fecha_carga,
         ROW_NUMBER() OVER (PARTITION BY cliente_id ORDER BY fecha_carga DESC, registro_id DESC) AS rn
  FROM clientes_crudo
)
SELECT cliente_id, nombre, ciudad, fecha_carga FROM ordenado WHERE rn = 1 ORDER BY cliente_id;
```
```pista
Ordena por `fecha_carga` de forma descendente para que la más reciente quede con `rn = 1`. Si dos cargas tienen la misma fecha, desempata por `registro_id`.
```
:::

:::ejercicio quiz
En un pipeline declarativo, las filas con `total` negativo deben quedar fuera de silver, el pipeline debe seguir corriendo y debe quedar registro de cuántas se descartaron. ¿Qué escribes?
- [ ] `CONSTRAINT total_ok EXPECT (total > 0)`
- [x] `CONSTRAINT total_ok EXPECT (total > 0) ON VIOLATION DROP ROW`
- [ ] `CONSTRAINT total_ok EXPECT (total > 0) ON VIOLATION FAIL UPDATE`
- [ ] Un `WHERE total > 0` en la consulta, que deja registro en el event log.
```explicacion
`DROP ROW` descarta y registra las métricas. Sin acción solo advierte (la fila se escribe) y `FAIL UPDATE` detiene la actualización. Un `WHERE` también filtra, pero no deja métricas de calidad en el event log.
```
:::

:::ejercicio quiz
Una tabla gold suma ventas por día leyendo `silver_pedidos`, y a veces llegan pedidos con varios días de atraso o se corrigen montos. ¿Qué objeto usas para gold?
- [ ] Una streaming table, porque procesa solo los datos nuevos.
- [x] Una materialized view, que recalcula el resultado (incrementalmente cuando puede) y refleja correcciones.
- [ ] Una vista temporal del pipeline.
- [ ] Una tabla creada con CTAS una sola vez.
```explicacion
La streaming table no vuelve a procesar filas ya vistas, así que un agregado no se corregiría. La materialized view mantiene el resultado correcto ante cambios en sus fuentes.
```
:::

:::ejercicio quiz
En Python, ¿qué decorador crea una materialized view en Lakeflow Spark Declarative Pipelines?
- [ ] `@dp.table`
- [x] `@dp.materialized_view`
- [ ] `@dp.temporary_view`
- [ ] `@dp.view`
```explicacion
Con la API nueva, `@dp.table` crea streaming tables, `@dp.materialized_view` materialized views y `@dp.temporary_view` vistas temporales.
```
:::

:::ejercicio quiz
Aplicas un flujo CDC de clientes con AUTO CDC `STORED AS SCD TYPE 2`. ¿Cómo identificas la versión vigente de cada cliente?
- [ ] Es la fila con `__START_AT` más antiguo.
- [x] Es la fila con `__END_AT` nulo.
- [ ] AUTO CDC borra las versiones viejas, así que hay una sola fila por cliente.
- [ ] Con la columna `is_current = true` que agrega AUTO CDC.
```explicacion
En SCD tipo 2, AUTO CDC agrega `__START_AT` y `__END_AT`. La versión vigente es la que no tiene fecha de fin.
```
:::

:::ejercicio quiz
Llegan dos cambios del mismo cliente fuera de orden: primero el de secuencia 8 y después el de secuencia 5. ¿Qué cláusula hace que AUTO CDC deje como vigente el de secuencia 8?
- [ ] `KEYS (cliente_id)`
- [x] `SEQUENCE BY secuencia`
- [ ] `APPLY AS DELETE WHEN ...`
- [ ] `TRACK HISTORY ON *`
```explicacion
`SEQUENCE BY` define el orden lógico de los cambios. Un cambio con secuencia menor que llega tarde no pisa al más nuevo.
```
:::

:::ejercicio abierto
Escribe en SQL la streaming table `silver_clientes` y el flujo AUTO CDC que la llene desde `STREAM(bronze_clientes_cdc)`, con clave `cliente_id`, orden por `ts_cambio`, borrados cuando `op = 'D'`, sin las columnas `op` y `ts_cambio`, guardando **solo la versión actual**.
```sql solucion
CREATE OR REFRESH STREAMING TABLE silver_clientes;

CREATE FLOW clientes_cdc AS AUTO CDC INTO silver_clientes
FROM STREAM(bronze_clientes_cdc)
KEYS (cliente_id)
APPLY AS DELETE WHEN op = 'D'
SEQUENCE BY ts_cambio
COLUMNS * EXCEPT (op, ts_cambio)
STORED AS SCD TYPE 1;
```
:::
