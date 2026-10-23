---
titulo: Funciones de ventana en PySpark
nivel: Avanzado
duracion: 35
resumen: Window.partitionBy().orderBy(), rankings, lag/lead, acumulados y marcos.
---

Todo lo que aprendiste de funciones de ventana en SQL funciona igual en PySpark, con la clase `Window`:

```python
from pyspark.sql import functions as F
from pyspark.sql.window import Window

w = Window.partitionBy("marca").orderBy(F.col("precio").desc())

(spark.table("productos")
   .withColumn("rn", F.row_number().over(w))
   .withColumn("rank", F.rank().over(w))
   .withColumn("promedio_marca", F.round(F.avg("precio").over(Window.partitionBy("marca")), 2))
   .filter(F.col("rn") <= 2)
   .select("marca", "nombre", "precio", "rn", "rank", "promedio_marca")
   .orderBy("marca", "rn")
   .show(10, truncate=False))
```

## Las piezas

| SQL | PySpark |
|---|---|
| `OVER (PARTITION BY a ORDER BY b DESC)` | `Window.partitionBy("a").orderBy(F.col("b").desc())` |
| `ROWS BETWEEN 2 PRECEDING AND CURRENT ROW` | `.rowsBetween(-2, Window.currentRow)` |
| `ROWS UNBOUNDED PRECEDING` | `.rowsBetween(Window.unboundedPreceding, Window.currentRow)` |
| `ROW_NUMBER()`, `RANK()`, `DENSE_RANK()` | `F.row_number()`, `F.rank()`, `F.dense_rank()` |
| `LAG(x, 1)`, `LEAD(x, 1)` | `F.lag("x", 1)`, `F.lead("x", 1)` |
| `NTILE(4)` | `F.ntile(4)` |

## Acumulados y promedio móvil

```python
from pyspark.sql import functions as F
from pyspark.sql.window import Window

diario = (spark.table("pedidos")
            .filter(F.col("fecha_pedido") >= "2024-12-01")
            .groupBy("fecha_pedido").agg(F.count("*").alias("pedidos")))

w_acum = Window.orderBy("fecha_pedido").rowsBetween(Window.unboundedPreceding, Window.currentRow)
w_movil = Window.orderBy("fecha_pedido").rowsBetween(-6, Window.currentRow)

(diario
   .withColumn("acumulado", F.sum("pedidos").over(w_acum))
   .withColumn("movil_7d", F.round(F.avg("pedidos").over(w_movil), 1))
   .orderBy("fecha_pedido")
   .show(10))
```

:::cuidado Ventanas sin partitionBy
`Window.orderBy(...)` **sin** `partitionBy` lleva **todas las filas a una sola partición**: con datos grandes, un solo core hace todo el trabajo (y Spark te avisa con un warning). Úsalo solo con datos ya agregados y pequeños, como en el ejemplo.
:::

## Ejercicios

:::ejercicio pyspark
Obtén el **último pedido de cada cliente** (fecha más reciente; si empatan, mayor `pedido_id`). Columnas: `cliente_id`, `pedido_id`, `fecha_pedido`.
```python solucion
from pyspark.sql import functions as F
from pyspark.sql.window import Window

w = Window.partitionBy("cliente_id").orderBy(F.col("fecha_pedido").desc(), F.col("pedido_id").desc())
resultado = (spark.table("pedidos")
               .withColumn("rn", F.row_number().over(w))
               .filter(F.col("rn") == 1)
               .select("cliente_id", "pedido_id", "fecha_pedido"))
```
:::

:::ejercicio pyspark
Para cada departamento, encuentra los empleados con el **salario más alto** (puede haber empates: usa `rank`). Columnas: `departamento_id`, `nombre`, `salario`.
```python solucion
from pyspark.sql import functions as F
from pyspark.sql.window import Window

w = Window.partitionBy("departamento_id").orderBy(F.col("salario").desc())
resultado = (spark.table("empleados")
               .withColumn("r", F.rank().over(w))
               .filter(F.col("r") == 1)
               .select("departamento_id", "nombre", "salario"))
```
:::

:::ejercicio pyspark
Para los pedidos del cliente `1367`, calcula los **días desde su pedido anterior** (`dias_desde_anterior`, NULL para el primero). Columnas: `pedido_id`, `fecha_pedido`, `dias_desde_anterior`. Ordena la ventana por fecha y `pedido_id`.
```python solucion
from pyspark.sql import functions as F
from pyspark.sql.window import Window

w = Window.partitionBy("cliente_id").orderBy("fecha_pedido", "pedido_id")
resultado = (spark.table("pedidos")
               .filter(F.col("cliente_id") == 1367)
               .withColumn("anterior", F.lag("fecha_pedido").over(w))
               .withColumn("dias_desde_anterior", F.datediff("fecha_pedido", "anterior"))
               .select("pedido_id", "fecha_pedido", "dias_desde_anterior"))
```
:::

:::ejercicio pyspark ordenado
Calcula los pedidos por **mes** de 2024 (`mes` como número) y el **acumulado anual** (`acumulado`). Ordena por mes.
```python solucion
from pyspark.sql import functions as F
from pyspark.sql.window import Window

mensual = (spark.table("pedidos")
             .filter(F.year("fecha_pedido") == 2024)
             .groupBy(F.month("fecha_pedido").alias("mes"))
             .agg(F.count("*").alias("pedidos")))
w = Window.orderBy("mes").rowsBetween(Window.unboundedPreceding, Window.currentRow)
resultado = mensual.withColumn("acumulado", F.sum("pedidos").over(w)).orderBy("mes")
```
:::

:::ejercicio pyspark
Calcula qué **porcentaje de las unidades de su marca** representa cada producto. Columnas: `marca`, `producto_id`, `unidades` y `pct_marca` (redondeado a 2).
```python solucion
from pyspark.sql import functions as F
from pyspark.sql.window import Window

u = (spark.table("detalle_pedidos")
       .join(spark.table("productos").select("producto_id", "marca"), "producto_id")
       .groupBy("marca", "producto_id")
       .agg(F.sum("cantidad").alias("unidades")))
w = Window.partitionBy("marca")
resultado = u.withColumn("pct_marca", F.round(F.col("unidades") / F.sum("unidades").over(w) * 100, 2))
```
:::
