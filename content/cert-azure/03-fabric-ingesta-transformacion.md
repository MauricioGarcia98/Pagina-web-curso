---
titulo: Ingerir y transformar datos en Fabric - lotes, tiempo real, PySpark, T-SQL y KQL
nivel: Avanzado
duracion: 65
resumen: El segundo dominio de DP-700 - patrones de carga completa e incremental (marca de agua), carga de modelos dimensionales con SCD, elegir el almacén y la herramienta de ingesta, copy activity, Copy job, Dataflow Gen2, notebooks, COPY INTO y consultas entre bases, limpieza (duplicados, nulos, datos tardíos) y tiempo real con Eventstream, Spark Structured Streaming y KQL con ventanas.
objetivos: Diseñar una carga incremental con marca de agua en un pipeline | Cargar una dimensión SCD tipo 2 con T-SQL y con PySpark | Elegir el almacén (lakehouse, warehouse, eventhouse) y la herramienta de ingesta adecuados | Transformar datos con PySpark, T-SQL y KQL resolviendo duplicados, nulos y datos tardíos | Construir un flujo en tiempo real con Eventstream y consultas KQL con ventanas de tiempo
prerrequisitos: cert-azure-fabric-plataforma | modelado-scd
autoevaluacion: ¿Sabes armar una carga incremental con Lookup, Copy y la actualización de la marca de agua? | ¿Sabes escribir el MERGE de una SCD tipo 2? | ¿Sabes cuándo elegir Dataflow Gen2 y cuándo un notebook? | ¿Sabes qué destinos tiene un eventstream? | ¿Sabes agrupar eventos en ventanas de 5 minutos con KQL?
---

:::escenario
Martín ya tiene los workspaces armados. Ahora llega el trabajo de todos los días: las ventas de la base Azure SQL (40 millones de filas, cambian 200.000 por día) deben cargarse cada hora sin releer todo; la dimensión de productos debe guardar la historia de precios; los archivos de proveedores llegan con duplicados y fechas vacías; y los sensores de temperatura de las cámaras de frío envían un evento por segundo que hay que vigilar en tiempo real. Este dominio es otro tercio del DP-700.
:::

## Elegir el almacén y la herramienta

| Situación | Almacén | Herramienta |
|---|---|---|
| Copiar tablas de una base u otra fuente sin transformar | Lakehouse o warehouse | **Copy activity** en un pipeline, o **Copy job** (con modo incremental) |
| Réplica continua de Azure SQL, Cosmos DB, Snowflake… | OneLake (base espejada) | **Mirroring** |
| Datos que ya están en ADLS, S3 u otro OneLake | Lakehouse | **Shortcut** |
| Transformaciones visuales, equipo de analistas | Lakehouse o warehouse como destino | **Dataflow Gen2** (Power Query) |
| Transformaciones complejas, volúmenes grandes, código | Lakehouse | **Notebook** (PySpark / Spark SQL) |
| Equipo SQL, modelo dimensional | Warehouse | **T-SQL** (`COPY INTO`, `CTAS`, `MERGE`, procedimientos) |
| Eventos continuos | Eventhouse (y/o lakehouse) | **Eventstream**, Spark Structured Streaming, KQL |
| Fuentes en la red de la empresa (on-premises) | — | **Puerta de enlace de datos local** (*on-premises data gateway*) para pipelines y dataflows |

## Cargas completas e incrementales

- **Carga completa**: se reemplaza la tabla entera en cada ejecución. Simple y siempre correcta; inviable cuando la tabla es grande.
- **Carga incremental**: solo lo nuevo o modificado desde la última carga, usando una columna de control (fecha de modificación o un id creciente): la **marca de agua** (*watermark*).

```diagrama
titulo: Carga incremental con marca de agua en un pipeline
nodo lk1: Lookup: marca anterior | icono=lupa | col=0 | fila=0 | sub=tabla de control | color=azul
nodo lk2: Lookup: marca nueva | icono=lupa | col=1 | fila=0 | sub=MAX(modificado) en origen | color=azul
nodo cp: Copy | icono=sigla:Copy:verde | col=2 | fila=0 | sub=WHERE modificado > anterior\nAND <= nueva | color=verde
nodo up: Actualizar marca | icono=base | col=3 | fila=0 | sub=procedimiento almacenado | color=naranja
flecha lk1 -> lk2 | paso=1 | explica=Lee la última fecha cargada desde la tabla de control.
flecha lk2 -> cp | paso=2 | explica=Calcula hasta dónde copiar en esta ejecución, para no perder filas que llegan mientras corre.
flecha cp -> up | paso=3 | explica=Copia solo el intervalo y, si terminó bien, guarda la nueva marca de agua.
```

La consulta de la copy activity usa **expresiones** con las salidas de las actividades anteriores:

```text
SELECT * FROM dbo.ventas
WHERE modificado >  '@{activity('MarcaAnterior').output.firstRow.marca}'
  AND modificado <= '@{activity('MarcaNueva').output.firstRow.marca}'
```

La marca de agua nueva se guarda **solo si la copia terminó bien**: así, si falla, el siguiente intento vuelve a copiar el mismo intervalo. Y el destino se escribe con `MERGE` (o borrando e insertando el intervalo) para que reintentar no duplique.

:::cuidado La marca de agua no ve los borrados
Una carga incremental por fecha de modificación no se entera de las filas **borradas** en el origen (ya no están para consultarlas). Si los borrados importan: **mirroring**, CDC del origen, o una conciliación completa periódica.
:::

## Cargar un modelo dimensional

### SCD tipo 2 en el warehouse (T-SQL)

```sql norun
-- 1) Cerrar la versión vigente de los productos que cambiaron de precio
UPDATE d
SET    d.vigente_hasta = s.fecha_carga, d.es_vigente = 0
FROM   dbo.dim_producto d
JOIN   stg.productos s ON s.producto_id = d.producto_id
WHERE  d.es_vigente = 1 AND d.precio <> s.precio;

-- 2) Insertar la versión nueva (de los que cambiaron y de los productos nuevos)
INSERT INTO dbo.dim_producto (producto_sk, producto_id, nombre, precio, vigente_desde, vigente_hasta, es_vigente)
SELECT NEXT VALUE FOR dbo.seq_producto, s.producto_id, s.nombre, s.precio, s.fecha_carga, NULL, 1
FROM   stg.productos s
LEFT JOIN dbo.dim_producto d ON d.producto_id = s.producto_id AND d.es_vigente = 1
WHERE  d.producto_id IS NULL;           -- no tiene versión vigente: es nuevo o se acaba de cerrar
```

- La **clave subrogada** (`producto_sk`) identifica cada versión; los hechos guardan esa clave.
- **SCD tipo 1** (sobrescribir) es un `UPDATE` o un `MERGE` simple.
- **Miembro inferido** (*late-arriving dimension*): si llega una venta de un producto que todavía no está en la dimensión, se inserta una fila provisoria ("desconocido") para no perder el hecho, y se completa cuando llega el producto.

### SCD y upserts en el lakehouse (PySpark)

```python norun
from delta.tables import DeltaTable
from pyspark.sql import functions as F, Window

nuevos = (spark.read.table("bronze_ventas")
            .withColumn("rn", F.row_number().over(Window.partitionBy("venta_id").orderBy(F.col("modificado").desc())))
            .filter("rn = 1").drop("rn"))                                  # duplicados: queda la versión más nueva

(DeltaTable.forName(spark, "silver_ventas").alias("t")
   .merge(nuevos.alias("s"), "t.venta_id = s.venta_id")
   .whenMatchedUpdateAll(condition="s.modificado > t.modificado")
   .whenNotMatchedInsertAll()
   .execute())
```

## Ingesta por lotes con cada herramienta

- **Copy activity / Copy job**: cientos de conectores; el Copy job ofrece modo **incremental** sin armar la lógica de marca de agua.
- **Dataflow Gen2**: Power Query con destino a lakehouse, warehouse u otros; con **staging** activado usa el motor del lakehouse/warehouse para transformar volúmenes grandes; **fast copy** acelera las copias simples.
- **Notebook**: `spark.read` de archivos (`Files/`) o fuentes externas y `saveAsTable` a `Tables/`.
- **T-SQL en el warehouse**:

```sql norun
COPY INTO dbo.stock_proveedores
FROM 'https://cuentadatos.blob.core.windows.net/proveedores/stock/*.parquet'
WITH (FILE_TYPE = 'PARQUET');

-- Consultas entre bases: el warehouse lee el lakehouse con nombres de tres partes
CREATE TABLE dbo.ventas_gold AS
SELECT v.fecha, p.categoria, SUM(v.importe) AS ventas
FROM   Lakehouse_Ventas.dbo.silver_ventas v
JOIN   dbo.dim_producto p ON p.producto_id = v.producto_id AND p.es_vigente = 1
GROUP BY v.fecha, p.categoria;
```

## Transformar: duplicados, nulos y datos tardíos

| Problema | PySpark | T-SQL | KQL |
|---|---|---|---|
| Duplicados exactos | `dropDuplicates()` | `SELECT DISTINCT` | `distinct` |
| Quedarse con la versión más reciente | `row_number()` sobre ventana | `ROW_NUMBER() OVER (...)` | `summarize arg_max(modificado, *) by id` |
| Nulos | `fillna`, `coalesce` | `COALESCE`, `ISNULL` | `coalesce()`, `isnull()` |
| Datos que llegan tarde | Reprocesar una ventana de días con `MERGE` | Recargar el intervalo afectado | Ventanas con retraso tolerado |
| Desnormalizar | `join` | `JOIN` + `CTAS` | `join`, `lookup` |
| Agregar | `groupBy().agg()` | `GROUP BY` | `summarize` |

## Tiempo real: Eventstream, eventhouse y KQL

```diagrama
titulo: Las cámaras de frío en tiempo real
nodo s: Sensores | icono=thermometer | col=0 | fila=0 | sub=1 evento/seg por cámara
nodo eh: Event Hubs | icono=eventhubs | col=1 | fila=0
nodo es: Eventstream | icono=stream | col=2 | fila=0 | sub=filtrar, agregar | color=violeta
nodo kql: Eventhouse | icono=base | col=3 | fila=0 | forma=cilindro | sub=base KQL | color=azul
nodo lh: Lakehouse | icono=delta | col=3 | fila=1 | sub=histórico en Delta | color=verde
nodo act: Activator | icono=alerta | col=2 | fila=1 | sub=si temp > 8 °C | color=rojo
flecha s -> eh
flecha eh -> es
flecha es -> kql
flecha es -> lh | estilo=punteada
flecha es -> act
```

- **Eventstream**: captura eventos de **fuentes** (Azure Event Hubs, IoT Hub, Kafka, CDC de bases como Azure SQL o PostgreSQL, eventos de Fabric y de Azure Storage, datos de ejemplo), aplica **transformaciones** sin código (filtrar, elegir campos, agregar por ventanas de tiempo, agrupar, unir) y los envía a **destinos**: eventhouse, lakehouse, Activator, otro stream derivado o un endpoint propio.
- **Spark Structured Streaming** en notebooks de Fabric: igual que en cualquier Spark (lecturas `readStream`, checkpoint, watermarks), escribiendo tablas Delta del lakehouse.
- **Eventhouse y KQL**: las bases KQL ingieren millones de eventos por segundo y consultan con KQL. Las **políticas de actualización** (*update policies*) transforman los datos al ingerirlos hacia otra tabla; las **vistas materializadas** mantienen agregados actualizados.

```text
// Temperatura promedio por cámara cada 5 minutos, en la última hora
Lecturas
| where timestamp > ago(1h)
| summarize temp_prom = avg(temperatura), temp_max = max(temperatura)
    by camara_id, bin(timestamp, 5m)
| where temp_max > 8
| order by timestamp desc
```

| Ventana | Qué es | KQL / Eventstream |
|---|---|---|
| **Tumbling** (fija) | Intervalos consecutivos sin superponerse (10:00-10:05, 10:05-10:10) | `bin(timestamp, 5m)` |
| **Hopping** (saltos) | Ventanas de largo fijo que se superponen (10 min que avanzan cada 5) | Ventana *hopping* en Eventstream |
| **Sliding** | Se recalcula con cada evento, mirando hacia atrás un intervalo | Ventana *sliding* |
| **Session** | Se cierra tras un período sin eventos | Ventana *session* |
| **Snapshot** | Agrupa los eventos con la misma marca de tiempo | Ventana *snapshot* |

:::examen Las combinaciones que más se preguntan
- "Copiar cada hora solo lo modificado de una tabla de 40 millones de filas" → **marca de agua** (o Copy job incremental, o mirroring si se necesita casi en tiempo real).
- "Analistas sin código deben limpiar y combinar datos" → **Dataflow Gen2**.
- "Alertar cuando un valor en tiempo real supera un umbral" → **Eventstream** hacia **Activator**.
- "Agregar eventos en intervalos fijos de 5 minutos" → ventana **tumbling** (`bin(..., 5m)`).
- "El warehouse necesita leer una tabla del lakehouse sin copiarla" → **consulta entre bases** con nombres de tres partes.
:::

:::errores
- **Guardar la marca de agua antes de copiar.** Síntoma: si la copia falla, el intervalo se pierde. Corrección: actualizarla solo al terminar bien.
- **`INSERT` en cada reintento de una carga incremental.** Síntoma: duplicados. Corrección: `MERGE` o borrar e insertar el intervalo.
- **Leer la marca nueva al final.** Síntoma: se pierden filas modificadas durante la copia. Corrección: calcular la marca nueva antes de copiar y copiar hasta ella.
- **Usar un pipeline cada minuto para datos de sensores.** Síntoma: latencia y costo altos. Corrección: Eventstream y eventhouse.
:::

:::trabajo Cómo se combina en un proyecto real
Mirroring para las bases operativas, shortcuts para lo que ya está en un lago, pipelines con marca de agua para las fuentes sin mirroring, notebooks para bronze → silver, warehouse con T-SQL para el modelo dimensional de gold, y Eventstream con eventhouse para la telemetría; todo orquestado por un pipeline maestro con reintentos y notificaciones.
:::

## Ejercicios

:::ejercicio quiz
En una carga incremental con marca de agua, ¿cuándo se actualiza la tabla de control con la nueva marca?
- [ ] Al inicio de la ejecución, antes de copiar los datos.
- [x] Después de que la copia terminó bien.
- [ ] Una vez por día, sin importar el resultado de las cargas.
- [ ] Nunca: la copy activity la actualiza sola.
```explicacion
Si la marca se actualiza antes y la copia falla, el intervalo no se vuelve a copiar. Por eso se actualiza solo tras el éxito.
```
:::

:::ejercicio quiz
Un grupo de analistas de negocio, sin conocimientos de programación, debe limpiar columnas, combinar dos archivos de Excel y cargar el resultado en el warehouse. ¿Qué herramienta usan?
- [ ] Un notebook con PySpark.
- [x] Dataflow Gen2.
- [ ] Un eventstream.
- [ ] Una política de actualización de KQL.
```explicacion
Dataflow Gen2 ofrece transformación visual con Power Query y destinos como el warehouse, sin escribir código.
```
:::

:::ejercicio quiz
Llega una venta de un producto que todavía no existe en la dimensión de productos. ¿Qué técnica evita perder el hecho?
- [ ] Descartar la venta hasta que llegue el producto.
- [x] Insertar un miembro inferido en la dimensión y completarlo cuando llegue el producto.
- [ ] Guardar la venta sin clave de producto y no volver a revisarla.
- [ ] Reprocesar toda la tabla de hechos cada vez que llega un producto nuevo.
```explicacion
El miembro inferido permite cargar el hecho con una clave válida; cuando llega la información completa del producto, se actualiza esa fila.
```
:::

:::ejercicio quiz
Las lecturas de temperatura deben disparar una notificación cuando una cámara supera los 8 °C, en segundos. ¿Qué componente agregas al eventstream?
- [ ] Un destino lakehouse con un pipeline que revisa la tabla cada hora.
- [x] Un destino Activator con una regla sobre la temperatura.
- [ ] Un Dataflow Gen2 programado cada minuto.
- [ ] Una canalización de despliegue.
```explicacion
Activator evalúa reglas sobre datos en tiempo real y dispara acciones (correo, Teams, un pipeline) cuando se cumplen.
```
:::

:::ejercicio quiz
En KQL, ¿cómo agrupas eventos en intervalos fijos de 15 minutos?
- [ ] `| summarize count() by window(timestamp, 15m)`
- [x] `| summarize count() by bin(timestamp, 15m)`
- [ ] `| group by timestamp every 15m`
- [ ] `| summarize count() by ago(15m)`
```explicacion
`bin` redondea la marca de tiempo al intervalo indicado, lo que forma ventanas fijas (tumbling). `ago(15m)` es un instante, no una ventana.
```
:::

:::ejercicio quiz
La tabla de ventas se carga por fecha de modificación, pero en el origen a veces se borran ventas anuladas y siguen apareciendo en Fabric. ¿Qué lo resuelve mejor?
- [ ] Bajar la frecuencia de la carga incremental a cada 5 minutos.
- [x] Mirroring de la base, o CDC, que también replica los borrados.
- [ ] Agregar un `DISTINCT` en las consultas de los informes.
- [ ] Cambiar la marca de agua a un id creciente.
```explicacion
Una marca de agua solo ve filas que existen. Mirroring y CDC capturan también las eliminaciones.
```
:::

:::ejercicio abierto
Escribe una consulta KQL sobre la tabla `Lecturas` (`camara_id`, `temperatura`, `timestamp`) que devuelva, para las últimas 24 horas, la temperatura máxima por cámara y por hora, solo de las horas en que superó 8 °C.
```text solucion
Lecturas
| where timestamp > ago(24h)
| summarize temp_max = max(temperatura) by camara_id, bin(timestamp, 1h)
| where temp_max > 8
| order by camara_id asc, timestamp asc
```
:::

:::ejercicio abierto
En PySpark, deduplica `bronze_stock` quedándote con la fila más reciente (`fecha_archivo`) de cada `sku` y `proveedor_id`, reemplaza los `stock` nulos por 0 y guarda el resultado como la tabla Delta `silver_stock`.
```python solucion
from pyspark.sql import functions as F, Window

w = Window.partitionBy("sku", "proveedor_id").orderBy(F.col("fecha_archivo").desc())
(spark.read.table("bronze_stock")
   .withColumn("rn", F.row_number().over(w))
   .filter("rn = 1").drop("rn")
   .fillna({"stock": 0})
   .write.mode("overwrite").saveAsTable("silver_stock"))
```
:::
