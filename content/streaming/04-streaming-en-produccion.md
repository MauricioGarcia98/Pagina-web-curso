---
titulo: Streaming en producción - checkpoint, escritura idempotente y operación
nivel: Experto
duracion: 70
resumen: Llevas lo aprendido a Spark Structured Streaming como se usa en un equipo - una tabla de entrada que recibe datos nuevos, un stream con checkpoint que procesa solo lo nuevo en cada corrida, una escritura con foreachBatch que no duplica aunque el mismo evento llegue en dos lotes, y la decisión de correrlo continuo o por lotes con availableNow. Cierras con lo que se monitorea y cómo se reprocesa cuando algo sale mal.
objetivos: Leer una tabla como stream y escribir con checkpoint | Correr un stream incremental con trigger availableNow | Escribir de forma idempotente con foreachBatch, deduplicando dentro del lote y contra el destino | Elegir entre ejecución continua y por lotes según la frescura y el costo | Planificar el monitoreo y el reprocesamiento de un stream
prerrequisitos: streaming-ventanas-y-marcas-de-agua | spark-streaming
autoevaluacion: ¿Qué guarda el checkpoint y qué pasa si lo borras? | ¿Por qué deduplicar solo dentro del lote no alcanza? | ¿Cuándo conviene availableNow en lugar de un stream continuo? | ¿Cómo reprocesas un día con un error?
---

:::analogia En palabras simples
El checkpoint es el cuaderno del cajero que anota "conté hasta el billete 1.540". Si el cajero se va a almorzar (o el proceso se cae), el siguiente retoma desde ahí sin volver a contar. Escribir de forma idempotente es tener una regla para no anotar dos veces el mismo billete aunque alguien te lo pase de nuevo.
:::

## Las tres piezas de un stream en producción

```python norun
def escribir_lote(df, batch_id):
    nuevos = df.dropDuplicates(["evento_id"])
    nuevos = nuevos.join(spark.table("silver.eventos").select("evento_id"), "evento_id", "left_anti")
    nuevos.write.mode("append").saveAsTable("silver.eventos")

(spark.readStream.table("bronze.eventos")
      .writeStream
      .foreachBatch(escribir_lote)
      .option("checkpointLocation", "/checkpoints/silver_eventos")
      .trigger(availableNow=True)
      .start())
```

| Pieza | Qué hace |
|---|---|
| `readStream.table(...)` | Lee la tabla de entrada como un flujo: cada corrida ve solo lo que llegó desde la anterior |
| `checkpointLocation` | Dónde se guarda el progreso (qué ya se leyó, qué lotes se escribieron) |
| `foreachBatch` | Una función que recibe cada micro-lote como un DataFrame normal: puedes deduplicar, hacer joins y `MERGE` |
| `trigger(availableNow=True)` | Procesa todo lo disponible en lotes y termina: ideal para correrlo programado cada 15 minutos |

En Databricks, en lugar del `left_anti` + `append` se usa un `MERGE INTO` sobre la tabla Delta, que además permite actualizar ([foreachBatch en Databricks](https://docs.databricks.com/aws/en/structured-streaming/foreach)).

:::cuidado Deduplicar solo dentro del lote
`dropDuplicates` dentro de `foreachBatch` elimina repetidos **de ese lote**. Si el mismo evento llega hoy en un lote y mañana en otro (un reenvío del productor), se escribe dos veces. Hay que comparar también contra lo que ya está en el destino: un `left_anti` contra silver o un `MERGE`. Spark también ofrece `dropDuplicatesWithinWatermark`, que recuerda los ids durante el tiempo de la marca de agua.
:::

## Continuo o por lotes

| Modo | Cuándo | Costo |
|---|---|---|
| Continuo (`processingTime="1 minute"`) | El negocio necesita segundos o un minuto de frescura (fraude, tarifa dinámica) | El clúster está prendido siempre |
| Por lotes (`availableNow=True`, programado) | Alcanza con 15 minutos o una hora de frescura | Solo pagas mientras corre |

La mayoría de los pipelines "en tiempo real" de una empresa en realidad necesitan frescura de minutos, no de segundos: correrlos con `availableNow` cada 15 minutos da el mismo resultado con una fracción del costo, y el mismo código sirve si mañana hace falta pasar a continuo.

## Monitorear y reprocesar

| Qué mirar | Por qué |
|---|---|
| Lag (o tiempo desde el último dato procesado) | ¿El stream va al día? |
| Filas por lote y duración de cada lote | ¿Un lote tarda más que el intervalo? Se acumula atraso |
| Eventos descartados por tardíos | ¿La marca de agua está bien elegida? |
| Errores de esquema | Un cambio en el productor puede frenar el stream |

**Reprocesar**: como el destino es idempotente, reprocesar un período es seguro. Se borra (o se marca) lo calculado de esos días en el destino y se corre un batch sobre bronze para esas fechas; o, si hay que rehacer todo, se crea un checkpoint nuevo y se procesa desde el principio a una tabla nueva, que reemplaza a la vieja cuando está lista.

:::practica pyspark Un stream incremental e idempotente
1. Ejecuta: se crea una tabla de entrada con un evento repetido, el stream la procesa una vez, llega una segunda carga (con un evento que ya había llegado) y el stream vuelve a correr.
2. Comprueba que el destino tiene cada evento una sola vez, aunque el evento 2 llegó en las dos cargas.
3. Quita el `left_anti` de la función y vuelve a ejecutar: el evento 2 queda duplicado.

```python
from pyspark.sql import functions as F

esquema = "evento_id INT, cliente STRING, monto DOUBLE"
spark.createDataFrame([(1, "ana", 10.0), (2, "luis", 5.0), (1, "ana", 10.0)], esquema).write.saveAsTable("bronze_eventos")
spark.createDataFrame([], esquema).write.saveAsTable("silver_eventos")

def escribir_lote(df, batch_id):
    nuevos = (df.dropDuplicates(["evento_id"])
                .join(spark.table("silver_eventos").select("evento_id"), "evento_id", "left_anti"))
    nuevos.write.mode("append").saveAsTable("silver_eventos")

def correr():
    q = (spark.readStream.table("bronze_eventos").writeStream.foreachBatch(escribir_lote)
              .option("checkpointLocation", "/checkpoints/silver_eventos")
              .trigger(availableNow=True).start())
    q.awaitTermination()

correr()
spark.createDataFrame([(2, "luis", 5.0), (3, "sofia", 7.5)], esquema).write.mode("append").saveAsTable("bronze_eventos")
correr()
spark.table("silver_eventos").orderBy("evento_id").show()
```

Reto: agrega una columna `procesado_en_lote` con el `batch_id` de cada escritura, para poder auditar qué lote escribió cada evento.

Documentación oficial: [Guía de Structured Streaming](https://spark.apache.org/docs/latest/structured-streaming-programming-guide.html) · [foreachBatch (Databricks)](https://docs.databricks.com/aws/en/structured-streaming/foreach) · [Marcas de agua (Databricks)](https://docs.databricks.com/aws/en/structured-streaming/watermarks)
:::

:::errores
- **Compartir un checkpoint entre dos streams.** Cada stream necesita su propia carpeta de checkpoint.
- **Borrar el checkpoint "para arreglar".** El stream vuelve a leer todo desde el principio: si el destino no es idempotente, duplica.
- **Deduplicar solo dentro del lote.** Compara también contra el destino.
- **Stream continuo para frescura de una hora.** `availableNow` programado cuesta mucho menos.
:::

:::entrevista
**Pregunta:** "El stream de silver estuvo caído 6 horas. ¿Qué pasa cuando lo vuelves a levantar?"

**Respuesta modelo:** "Retoma desde su checkpoint: lee las 6 horas pendientes de bronze en lotes y se pone al día. Si limité el tamaño de cada lote (por ejemplo con `maxFilesPerTrigger` o `maxBytesPerTrigger`), recupera de forma controlada sin quedarse sin memoria. Como la escritura es idempotente por `evento_id`, si algún lote se reprocesa no duplica. Mientras tanto, el tablero muestra la hora del último dato procesado para que nadie confunda el atraso con una caída de ventas."
:::

## Ejercicios

:::ejercicio quiz
Borras la carpeta de checkpoint de un stream que escribe con `append` simple (sin deduplicar contra el destino) y lo vuelves a correr. ¿Qué pasa?
- [ ] Sigue desde donde estaba, porque el progreso está en la tabla destino
- [x] Vuelve a leer toda la entrada desde el principio y duplica lo que ya había escrito
- [ ] Falla y no arranca hasta recuperar el checkpoint
- [ ] Lee solo los datos nuevos
:::

:::ejercicio pyspark dificultad=Experto titulo="Escritura idempotente entre lotes"
Completa `escribir_lote` para que el destino `silver_eventos` tenga cada `evento_id` **una sola vez**, aunque un evento se repita dentro de un lote o llegue de nuevo en un lote posterior. El código inicial crea las tablas, corre el stream dos veces con una segunda carga en el medio, y deja en `resultado` la tabla destino.
```python inicial
esquema = "evento_id INT, cliente STRING, monto DOUBLE"
spark.createDataFrame([(1, "ana", 10.0), (2, "luis", 5.0), (1, "ana", 10.0)], esquema).write.saveAsTable("bronze_eventos")
spark.createDataFrame([], esquema).write.saveAsTable("silver_eventos")

def escribir_lote(df, batch_id):
    df.write.mode("append").saveAsTable("silver_eventos")

def correr():
    q = (spark.readStream.table("bronze_eventos").writeStream.foreachBatch(escribir_lote)
              .option("checkpointLocation", "/checkpoints/silver_eventos")
              .trigger(availableNow=True).start())
    q.awaitTermination()

correr()
spark.createDataFrame([(2, "luis", 5.0), (3, "sofia", 7.5)], esquema).write.mode("append").saveAsTable("bronze_eventos")
correr()
resultado = spark.table("silver_eventos")
```
```python solucion
esquema = "evento_id INT, cliente STRING, monto DOUBLE"
spark.createDataFrame([(1, "ana", 10.0), (2, "luis", 5.0), (1, "ana", 10.0)], esquema).write.saveAsTable("bronze_eventos")
spark.createDataFrame([], esquema).write.saveAsTable("silver_eventos")

def escribir_lote(df, batch_id):
    nuevos = (df.dropDuplicates(["evento_id"])
                .join(spark.table("silver_eventos").select("evento_id"), "evento_id", "left_anti"))
    nuevos.write.mode("append").saveAsTable("silver_eventos")

def correr():
    q = (spark.readStream.table("bronze_eventos").writeStream.foreachBatch(escribir_lote)
              .option("checkpointLocation", "/checkpoints/silver_eventos")
              .trigger(availableNow=True).start())
    q.awaitTermination()

correr()
spark.createDataFrame([(2, "luis", 5.0), (3, "sofia", 7.5)], esquema).write.mode("append").saveAsTable("bronze_eventos")
correr()
resultado = spark.table("silver_eventos")
```
```pista
Dos defensas: `dropDuplicates(["evento_id"])` quita los repetidos del lote, y un join `left_anti` contra `silver_eventos` quita los que ya estaban escritos de lotes anteriores.
```
```pista
`df.join(spark.table("silver_eventos").select("evento_id"), "evento_id", "left_anti")` deja solo las filas cuyo id no está en el destino.
```
:::

:::ejercicio python dificultad=Avanzado titulo="¿Continuo o por lotes?"
Escribe `elegir_modo(frescura_min, horas_al_dia_con_datos)` que recomiende `"continuo"` o `"availableNow"` con estas reglas: si la frescura requerida es de **menos de 5 minutos**, `"continuo"`; si no, `"availableNow"`, salvo que lleguen datos más de 20 horas al día **y** la frescura requerida sea de menos de 15 minutos, en cuyo caso también `"continuo"` (correr cada pocos minutos todo el día cuesta casi lo mismo que tenerlo prendido).
```python inicial
def elegir_modo(frescura_min, horas_al_dia_con_datos):
    pass
```
```python solucion
def elegir_modo(frescura_min, horas_al_dia_con_datos):
    if frescura_min < 5:
        return "continuo"
    if horas_al_dia_con_datos > 20 and frescura_min < 15:
        return "continuo"
    return "availableNow"
```
```pista
Dos condiciones para "continuo", en orden; todo lo demás es "availableNow".
```
```python test
assert elegir_modo(1, 8) == "continuo"
assert elegir_modo(60, 24) == "availableNow"
assert elegir_modo(10, 22) == "continuo"
assert elegir_modo(10, 12) == "availableNow"
assert elegir_modo(15, 24) == "availableNow"
```
:::
