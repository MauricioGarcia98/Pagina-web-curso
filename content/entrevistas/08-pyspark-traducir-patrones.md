---
titulo: PySpark de entrevista - traducir cada patrón de SQL a DataFrames
nivel: Experto
duracion: 70
resumen: En las entrevistas de ingeniería de datos es común que te den la consulta SQL y te pidan "ahora en PySpark", o al revés. Traduces los mismos patrones del módulo (top-N con empates, acumulados, crecimiento, deduplicar, pivotear, anti-join) con la API de DataFrames, y aprendes a responder las preguntas de rendimiento que vienen después - shuffle, broadcast, particiones y por qué una ventana sin partición es peligrosa.
objetivos: Traducir funciones de ventana de SQL a Window.partitionBy().orderBy() con el marco correcto | Deduplicar con row_number y filtrar en el mismo DataFrame | Pivotear con groupBy().pivot() pasando la lista de valores | Usar joins left_anti y left_semi en lugar de subconsultas | Explicar qué operaciones causan shuffle y cuándo conviene un broadcast
prerrequisitos: entrevistas-sql-deduplicar-pivotear-comparar | pyspark-ventanas | spark-lazy
autoevaluacion: ¿Cómo se escribe ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW en PySpark? | ¿Por qué conviene pasar la lista de valores a pivot()? | ¿Qué hace un join left_anti? | ¿Qué pasa con una ventana que no tiene partitionBy sobre 1.000 millones de filas?
---

:::analogia En palabras simples
SQL y PySpark son dos idiomas para decir lo mismo, como "buenos días" y "good morning". El motor de Spark (Catalyst) traduce los dos al **mismo plan**: por eso en una entrevista lo que importa es que sepas el patrón; la sintaxis es vocabulario.
:::

## El diccionario SQL → PySpark

| SQL | PySpark |
|---|---|
| `WHERE estado <> 'cancelado'` | `.filter(F.col("estado") != "cancelado")` |
| `GROUP BY canal` + `COUNT(*)` | `.groupBy("canal").agg(F.count("*").alias("pedidos"))` |
| `DENSE_RANK() OVER (PARTITION BY c ORDER BY x DESC)` | `F.dense_rank().over(Window.partitionBy("c").orderBy(F.desc("x")))` |
| `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` | `.rowsBetween(Window.unboundedPreceding, Window.currentRow)` |
| `LAG(x) OVER (ORDER BY mes)` | `F.lag("x").over(Window.orderBy("mes"))` |
| `SUM(CASE WHEN canal='web' THEN 1 ELSE 0 END)` | `.groupBy("anio").pivot("canal", ["web", ...]).count()` |
| `WHERE NOT EXISTS (...)` | `.join(otro, "clave", "left_anti")` |
| `WHERE EXISTS (...)` | `.join(otro, "clave", "left_semi")` |
| `substr(fecha, 1, 7)` | `F.substring("fecha", 1, 7)` o `F.date_format("fecha", "yyyy-MM")` |

## Top-N por grupo y deduplicación

En PySpark no hace falta una "capa externa": agregas la columna con `withColumn` y filtras en el paso siguiente.

```python
from pyspark.sql import functions as F
from pyspark.sql.window import Window

# el último evento de cada cliente: el mismo patrón que "la última versión de cada registro"
w = Window.partitionBy("cliente_id").orderBy(F.desc("fecha_hora"), F.desc("evento_id"))
ultimos = (spark.table("eventos_web")
           .filter(F.col("cliente_id").isNotNull())
           .withColumn("rn", F.row_number().over(w))
           .filter(F.col("rn") == 1)
           .drop("rn"))
print(ultimos.count(), "clientes con eventos")
```

:::nota dropDuplicates no elige
`df.dropDuplicates(["pedido_id"])` deja **una fila cualquiera** por pedido: no sabes cuál. Úsalo solo cuando las filas repetidas son idénticas. Si la regla es "la más reciente gana", usa `row_number` con orden explícito.
:::

## Pivot: siempre con la lista de valores

`groupBy("anio").pivot("canal")` funciona, pero Spark tiene que hacer **una pasada extra** para descubrir los valores distintos de `canal`. Pasar la lista (`pivot("canal", ["web", "app", "tienda", "telefono"])`) evita esa pasada y fija el orden de las columnas. Así lo recomienda la [documentación de pivot](https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.GroupedData.pivot.html).

## Las preguntas de rendimiento que vienen después

| Pregunta | Respuesta corta |
|---|---|
| "¿Qué operaciones hacen shuffle?" | `groupBy`, `join` (salvo broadcast), `distinct`, ventanas con `partitionBy`, `orderBy`, `repartition` |
| "Tu join es lento y una tabla es chica" | `F.broadcast(chica)`: se copia a cada ejecutor y se evita el shuffle de la grande |
| "¿Qué pasa con `Window.orderBy("mes")` sin `partitionBy`?" | Spark mueve **todas** las filas a una sola partición: funciona con 12 meses agregados, explota con mil millones de filas |
| "¿Cómo ves el plan?" | `df.explain()`: busca `Exchange` (shuffle) y `BroadcastHashJoin` |
| "Una tarea tarda mucho más que las otras" | Datos sesgados (skew): una clave con muchas filas. AQE lo parte (`spark.sql.adaptive.skewJoin.enabled`) o se agrega una sal a la clave |

:::cuidado La ventana global
Una ventana sin `partitionBy` es correcta sobre un DataFrame **ya agregado** (12 filas de meses). Sobre datos de detalle, Spark avisa `No Partition Defined for Window operation! Moving all data to a single partition`. En la entrevista, di explícitamente: "primero agrego a una fila por mes, por eso la ventana global es segura".
:::

:::practica pyspark Ver el shuffle en el plan
1. Ejecuta: se calcula el top 2 de productos por precio en cada categoría y se imprime el plan físico.
2. Busca en el plan la línea `Exchange hashpartitioning(categoria_id...)`: es el shuffle que agrupa cada categoría en una partición para la ventana.
3. Cambia `dense_rank` por `row_number` y compara cuántas filas devuelve.

```python
from pyspark.sql import functions as F
from pyspark.sql.window import Window

w = Window.partitionBy("categoria_id").orderBy(F.desc("precio"))
top = (spark.table("productos")
       .withColumn("pos", F.dense_rank().over(w))
       .filter(F.col("pos") <= 2)
       .select("categoria_id", "nombre", "precio", "pos"))
top.show(10)
top.explain()
```

Reto: une `top` con `categorias` usando `F.broadcast(spark.table("categorias"))` y busca `BroadcastHashJoin` en el nuevo plan.

Documentación oficial: [Window](https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/window.html) · [DataFrame.join](https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.join.html) · [Ajuste de rendimiento](https://spark.apache.org/docs/latest/sql-performance-tuning.html)
:::

:::errores
- **`dropDuplicates` cuando importa cuál fila queda.** Usa `row_number` con orden.
- **Olvidar `F.desc`.** `orderBy("precio")` es ascendente: el top quedaría al revés.
- **Ventana global sobre datos de detalle.** Agrega primero.
- **`collect()` para "ver" los datos.** Trae todo al driver: usa `show()` o `limit()`.
:::

:::entrevista
**Pregunta:** "¿Es más rápido escribir esto en SQL o en PySpark?"

**Respuesta modelo:** "Es igual: Spark SQL y la API de DataFrames pasan por el mismo optimizador Catalyst y generan el mismo plan físico; se puede comprobar con `explain()`. Elijo según el equipo y la legibilidad. Lo que sí es más lento son las UDF de Python fila por fila, porque salen de la JVM: siempre que exista una función nativa en `pyspark.sql.functions`, la prefiero."
:::

## Ejercicios

:::ejercicio pyspark dificultad=Avanzado titulo="Los dos precios más altos de cada categoría"
Con la tabla `productos`, devuelve los productos cuyos precios están entre los **dos valores más altos** de su categoría (con empates). Columnas: `categoria_id`, `nombre`, `precio`.
```python solucion
from pyspark.sql import functions as F
from pyspark.sql.window import Window

w = Window.partitionBy("categoria_id").orderBy(F.desc("precio"))
resultado = (spark.table("productos")
             .withColumn("pos", F.dense_rank().over(w))
             .filter(F.col("pos") <= 2)
             .select("categoria_id", "nombre", "precio"))
```
```pista
`F.dense_rank().over(Window.partitionBy("categoria_id").orderBy(F.desc("precio")))`, después filtra `pos <= 2` y selecciona las tres columnas.
```
:::

:::ejercicio pyspark dificultad=Experto titulo="Ventas mensuales de 2024 con acumulado"
Calcula las ventas por mes de 2024 (pedidos no cancelados, `cantidad * precio_unitario * (1 - descuento)`) y el acumulado del año. Redondea ambas columnas a 2 decimales **al final**. Columnas: `mes` (texto `AAAA-MM`), `ventas`, `acumulado`.
```python solucion
from pyspark.sql import functions as F
from pyspark.sql.window import Window

p = spark.table("pedidos").filter((F.col("estado") != "cancelado") & (F.col("fecha_pedido") >= "2024-01-01") & (F.col("fecha_pedido") < "2025-01-01"))
d = spark.table("detalle_pedidos")
mensual = (p.join(d, "pedido_id")
           .withColumn("mes", F.substring("fecha_pedido", 1, 7))
           .groupBy("mes")
           .agg(F.sum(F.col("cantidad") * F.col("precio_unitario") * (1 - F.col("descuento"))).alias("ventas")))
w = Window.orderBy("mes").rowsBetween(Window.unboundedPreceding, Window.currentRow)
resultado = (mensual.withColumn("acumulado", F.round(F.sum("ventas").over(w), 2))
             .withColumn("ventas", F.round("ventas", 2))
             .select("mes", "ventas", "acumulado"))
```
```pista
Filtra pedidos, únelos con el detalle por `pedido_id`, crea `mes` con `F.substring("fecha_pedido", 1, 7)` y agrupa.
```
```pista
La ventana del acumulado: `Window.orderBy("mes").rowsBetween(Window.unboundedPreceding, Window.currentRow)`. Es global, pero segura: el DataFrame ya tiene solo 12 filas.
```
:::

:::ejercicio pyspark dificultad=Experto titulo="El último evento de cada cliente"
Con `eventos_web` (solo eventos con `cliente_id`), quédate con el **evento más reciente** de cada cliente; si dos eventos tienen la misma `fecha_hora`, gana el de `evento_id` mayor. Es el mismo patrón que deduplicar una tabla bronze quedándote con la última versión. Columnas: `cliente_id`, `fecha_hora`, `pagina`, `dispositivo`.
```python solucion
from pyspark.sql import functions as F
from pyspark.sql.window import Window

w = Window.partitionBy("cliente_id").orderBy(F.desc("fecha_hora"), F.desc("evento_id"))
resultado = (spark.table("eventos_web")
             .filter(F.col("cliente_id").isNotNull())
             .withColumn("rn", F.row_number().over(w))
             .filter(F.col("rn") == 1)
             .select("cliente_id", "fecha_hora", "pagina", "dispositivo"))
```
```pista
`F.row_number()` con `Window.partitionBy("cliente_id").orderBy(F.desc("fecha_hora"), F.desc("evento_id"))` y te quedas con `rn == 1`. No uses `dropDuplicates`: no garantiza cuál fila queda.
```
:::

:::ejercicio pyspark dificultad=Avanzado titulo="Pedidos por año y canal, en columnas"
Devuelve una fila por año con la cantidad de pedidos de cada canal en columnas (`web`, `app`, `tienda`, `telefono`), usando `pivot` con la lista de valores. Columnas: `anio`, `web`, `app`, `tienda`, `telefono`.
```python solucion
from pyspark.sql import functions as F

resultado = (spark.table("pedidos")
             .withColumn("anio", F.substring("fecha_pedido", 1, 4))
             .groupBy("anio")
             .pivot("canal", ["web", "app", "tienda", "telefono"])
             .count())
```
```pista
`groupBy("anio").pivot("canal", ["web", "app", "tienda", "telefono"]).count()`.
```
:::

:::ejercicio pyspark dificultad=Avanzado titulo="Clientes sin pedidos, con left_anti"
Cuenta, por país, los clientes que no tienen ningún pedido, usando un join `left_anti`. Columnas: `pais`, `clientes_sin_pedidos`.
```python solucion
from pyspark.sql import functions as F

pedidos = spark.table("pedidos").select("cliente_id")
resultado = (spark.table("clientes")
             .join(pedidos, "cliente_id", "left_anti")
             .groupBy("pais")
             .agg(F.count("*").alias("clientes_sin_pedidos")))
```
```pista
`clientes.join(pedidos, "cliente_id", "left_anti")` deja solo las filas de `clientes` sin pareja en `pedidos`.
```
:::

:::ejercicio pyspark dificultad=Experto titulo="Crecimiento mensual de pedidos por canal"
Para cada canal y mes de 2024, cuenta los pedidos (cualquier estado) y calcula el crecimiento porcentual respecto del mes anterior **del mismo canal**, redondeado a 1 decimal (el primer mes de cada canal queda nulo). Columnas: `canal`, `mes`, `pedidos`, `crecimiento_pct`.
```python solucion
from pyspark.sql import functions as F
from pyspark.sql.window import Window

m = (spark.table("pedidos")
     .filter((F.col("fecha_pedido") >= "2024-01-01") & (F.col("fecha_pedido") < "2025-01-01"))
     .withColumn("mes", F.substring("fecha_pedido", 1, 7))
     .groupBy("canal", "mes").agg(F.count("*").alias("pedidos")))
w = Window.partitionBy("canal").orderBy("mes")
ant = F.lag("pedidos").over(w)
resultado = m.withColumn("crecimiento_pct", F.round((F.col("pedidos") - ant) * 100.0 / ant, 1)).select("canal", "mes", "pedidos", "crecimiento_pct")
```
```pista
Primero agrega a una fila por (canal, mes). Después `F.lag("pedidos")` sobre `Window.partitionBy("canal").orderBy("mes")`.
```
```pista
El crecimiento es `(pedidos - anterior) * 100.0 / anterior`; si `anterior` es nulo, el resultado también.
```
:::
