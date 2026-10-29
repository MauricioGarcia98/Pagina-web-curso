---
titulo: Funciones de ventana en PySpark
nivel: Avanzado
duracion: 45
resumen: Window.partitionBy().orderBy(), rankings, lag/lead, acumulados y marcos.
---

## Ventanas: SQL avanzado, ahora en PySpark

Las funciones de ventana te permitieron, en SQL, numerar filas dentro de un grupo, calcular acumulados y comparar con la fila anterior **sin colapsar** las filas. Todo eso funciona igual en PySpark. La diferencia es que la "ventana" (`OVER (PARTITION BY … ORDER BY …)`) se define como un **objeto** de la clase `Window`, que se guarda en una variable y se reutiliza:

```python norun
from pyspark.sql.window import Window

w = Window.partitionBy("marca").orderBy(F.col("precio").desc())   # la definición de la ventana
F.row_number().over(w)                                           # una función aplicada SOBRE esa ventana
```

Se lee: "numera las filas **sobre** la ventana `w`: dentro de cada marca, del precio más alto al más bajo".

| SQL | PySpark |
|---|---|
| `OVER (PARTITION BY a ORDER BY b DESC)` | `Window.partitionBy("a").orderBy(F.col("b").desc())` |
| `OVER ()` | `Window.partitionBy()` (sin argumentos: toda la tabla) |
| `ROWS BETWEEN 2 PRECEDING AND CURRENT ROW` | `.rowsBetween(-2, Window.currentRow)` |
| `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` | `.rowsBetween(Window.unboundedPreceding, Window.currentRow)` |
| `ROW_NUMBER()`, `RANK()`, `DENSE_RANK()` | `F.row_number()`, `F.rank()`, `F.dense_rank()` |
| `LAG(x, 1)`, `LEAD(x, 1)` | `F.lag("x", 1)`, `F.lead("x", 1)` |
| `NTILE(4)` | `F.ntile(4)` |
| `SUM(x) OVER (…)` | `F.sum("x").over(w)` |

## Rankings y top-N por grupo

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

Paso a paso:

1. `withColumn("rn", F.row_number().over(w))` agrega a **cada** producto su puesto dentro de su marca (1 = el más caro).
2. `F.avg("precio").over(Window.partitionBy("marca"))` agrega el promedio de su marca, sin agrupar: cada fila sigue siendo un producto.
3. `filter(F.col("rn") <= 2)` se queda con los dos más caros de cada marca.

Fíjate en una diferencia con SQL: como en PySpark cada paso es un método, **sí** puedes filtrar por la ventana directamente después del `withColumn`. No hace falta la CTE intermedia (ni `QUALIFY`): el DataFrame de la línea anterior ya tiene la columna `rn` calculada.

### Deduplicar: el uso número uno en ingeniería de datos

"Quedarse con la versión más reciente de cada registro" es probablemente la ventana que más vas a escribir en la capa silver:

```python
from pyspark.sql import functions as F
from pyspark.sql.window import Window

w = Window.partitionBy("cliente_id").orderBy(F.col("fecha_pedido").desc(), F.col("pedido_id").desc())
ultimo_pedido = (spark.table("pedidos")
                   .withColumn("rn", F.row_number().over(w))
                   .filter("rn = 1")
                   .drop("rn"))
print(ultimo_pedido.count())   # una fila por cliente con pedidos: 1453
```

El `pedido_id` en el `orderBy` **desempata**: si un cliente tiene dos pedidos el mismo día, siempre elige el mismo. Sin desempate, `row_number` puede elegir distinto en cada ejecución (el pipeline deja de ser determinista).

## lag y lead: comparar con la fila vecina

```python
from pyspark.sql import functions as F
from pyspark.sql.window import Window

w = Window.partitionBy("cliente_id").orderBy("fecha_pedido")
(spark.table("pedidos")
   .filter(F.col("cliente_id") == 3)
   .withColumn("pedido_anterior", F.lag("fecha_pedido", 1).over(w))
   .withColumn("dias_entre_compras", F.datediff("fecha_pedido", "pedido_anterior"))
   .select("cliente_id", "pedido_id", "fecha_pedido", "pedido_anterior", "dias_entre_compras")
   .show())
```

`F.lag("fecha_pedido", 1)` trae la fecha de la fila anterior **del mismo cliente** (por el `partitionBy`). La primera compra no tiene anterior: `null`. Es la base de la frecuencia de compra, las sesiones web y las reglas de fraude.

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

- `rowsBetween(inicio, fin)` define el marco con números relativos a la fila actual: `-6` son "6 filas antes", `0` (o `Window.currentRow`) es la actual, `Window.unboundedPreceding` es "desde el principio".
- `w_movil` = la fila actual y las 6 anteriores → promedio de 7 días.
- Primero se agrega por día (`groupBy`) y **después** se aplica la ventana: el mismo patrón "agregar, luego ventana" que en SQL.

:::cuidado Ventanas sin partitionBy
`Window.orderBy(...)` **sin** `partitionBy` obliga a Spark a llevar **todas las filas a una sola partición** (una sola máquina, un solo núcleo) para poder ordenarlas y recorrerlas en secuencia. Con millones de filas, se pierde todo el paralelismo y el job puede quedarse sin memoria (Spark avisa con el warning *No Partition Defined for Window operation*). Úsalo solo con datos ya agregados y chicos, como la serie diaria de arriba (31 filas).
:::

:::experto El costo de las ventanas
Una ventana con `partitionBy` necesita que todas las filas de cada grupo estén juntas: Spark hace un **shuffle** por la clave de partición y ordena dentro de cada grupo. Si un grupo es gigantesco (un "cliente" que en realidad es el usuario anónimo con 50 millones de eventos), esa partición tarda muchísimo más que las demás: es el problema de **skew**. Revisa siempre la distribución de tus claves.
:::

## Resumen

- Define la ventana con `Window.partitionBy(…).orderBy(…)` y aplícala con `F.funcion(…).over(w)`.
- `row_number`/`rank`/`dense_rank` para rankings; filtra directamente después del `withColumn`.
- Deduplicar: `row_number` ordenado por fecha descendente (con desempate) y `rn = 1`.
- `lag`/`lead` para comparar con filas vecinas; `rowsBetween` para acumulados y promedios móviles.
- Evita ventanas sin `partitionBy` sobre datos grandes.

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
