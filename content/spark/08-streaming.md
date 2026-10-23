---
titulo: Structured Streaming
nivel: Experto
duracion: 25
resumen: Procesar datos que llegan sin parar: fuentes, sinks, triggers, checkpoints, watermarks y Auto Loader.
---

Hasta ahora procesamos datos “en lote” (*batch*): un conjunto fijo, de principio a fin. Pero muchos datos **no paran de llegar**: clics, pagos, sensores, logs. **Structured Streaming** permite tratarlos como una **tabla que crece infinitamente**, con casi la misma API que los DataFrames.

```python norun
eventos = (spark.readStream
             .format("json")
             .schema("evento_id LONG, cliente_id LONG, tipo STRING, ts TIMESTAMP")
             .load("/lake/bronze/eventos/"))

conteo = (eventos
            .withWatermark("ts", "10 minutes")                       # tolera datos tardíos
            .groupBy(F.window("ts", "5 minutes"), "tipo")             # ventanas de 5 min
            .count())

(conteo.writeStream
   .format("delta")
   .outputMode("append")
   .option("checkpointLocation", "/lake/_checkpoints/conteo_eventos")
   .trigger(processingTime="1 minute")                               # o availableNow=True
   .toTable("silver.conteo_eventos"))
```

### Cómo pensar un stream

La idea genial de Structured Streaming es que **no tienes que aprender una API nueva**. Imagina la fuente como una tabla a la que **se le agregan filas sin parar**. Escribes la consulta como si fuera batch (`filter`, `groupBy`, `join`), y Spark la ejecuta **incrementalmente**: cada cierto tiempo toma solo las filas nuevas, actualiza el resultado y lo escribe.

```text
tiempo →     t1               t2                 t3
fuente:      [e1 e2 e3]   +   [e4 e5]        +   [e6 e7 e8]
Spark:       procesa e1-e3    procesa e4-e5      procesa e6-e8   (cada "micro-lote")
resultado:   conteo = 3       conteo = 5         conteo = 8
checkpoint:  "leí hasta e3"   "leí hasta e5"     "leí hasta e8"
```

Si el job se cae después de `t2`, al reiniciar lee el **checkpoint**, ve "leí hasta e5" y continúa desde `e6`: no pierde ni duplica eventos.

### ¿Realmente necesitas streaming?

| Latencia que pide el negocio | Solución típica |
|---|---|
| Segundos (fraude, precios dinámicos, alertas) | Streaming continuo (`processingTime`) |
| Minutos a horas (tablero "casi en vivo") | Streaming con `availableNow` programado cada 15–60 minutos |
| Un día (reporte diario) | Batch normal |

Muchísimas veces, "tiempo real" en una reunión significa "actualizado cada hora". Un stream encendido 24/7 cuesta un cluster encendido 24/7; un job `availableNow` cada hora usa el **mismo código** y cuesta una fracción.

## Conceptos clave

| Concepto | Qué es |
|---|---|
| **Source** | De dónde llegan los datos: archivos en el lake, Kafka, Event Hubs, Delta |
| **Sink** | Dónde se escriben: Delta, Kafka, consola, `foreachBatch` |
| **Trigger** | Cada cuánto se procesa: `processingTime="1 minute"`, `availableNow=True` (procesa lo pendiente y termina, ideal para jobs programados) |
| **Checkpoint** | Carpeta donde Spark guarda su progreso. Permite reiniciar sin perder ni duplicar datos (**exactly-once** con Delta) |
| **Output mode** | `append` (solo filas nuevas), `update` (filas cambiadas), `complete` (toda la tabla) |
| **Watermark** | Cuánto tiempo esperar datos tardíos antes de cerrar una ventana de tiempo |

## Auto Loader (Databricks)

**Auto Loader** (`format("cloudFiles")`) es la forma recomendada de ingerir archivos que van llegando a un data lake: detecta archivos nuevos de manera eficiente, infiere y evoluciona el esquema y guarda los registros malformados aparte.

```python norun
(spark.readStream.format("cloudFiles")
   .option("cloudFiles.format", "json")
   .option("cloudFiles.schemaLocation", "/lake/_schemas/pedidos")
   .load("/Volumes/main/crudo/pedidos/")
   .writeStream
   .option("checkpointLocation", "/lake/_checkpoints/bronze_pedidos")
   .trigger(availableNow=True)
   .toTable("main.bronze.pedidos"))
```

:::nota Lakeflow Declarative Pipelines (antes Delta Live Tables)
Databricks ofrece una forma **declarativa** de construir pipelines batch y streaming: declaras las tablas y sus reglas de calidad (*expectations*) y la plataforma se encarga del orden, los reintentos y la infraestructura.
:::

:::ejercicio quiz
¿Para qué sirve el `checkpointLocation` en un stream?

- [ ] Para guardar una copia de seguridad de la tabla
- [x] Para que Spark recuerde qué datos ya procesó y pueda reanudar sin perder ni duplicar
- [ ] Para definir el esquema
- [ ] Para limitar la velocidad
:::

:::ejercicio quiz
Quieres un job que cada hora procese **todos los archivos nuevos y luego se apague** (para no pagar un cluster encendido 24/7). ¿Qué trigger usas?

- [ ] `processingTime="1 second"`
- [x] `availableNow=True`
- [ ] `continuous="1 second"`
- [ ] Ninguno, no se puede
:::

:::ejercicio quiz
¿Qué controla un **watermark**?

- [ ] La marca de agua en los gráficos
- [x] Cuánto tiempo se esperan eventos que llegan tarde antes de cerrar una ventana
- [ ] El tamaño de los archivos
- [ ] La cantidad de executors
:::
