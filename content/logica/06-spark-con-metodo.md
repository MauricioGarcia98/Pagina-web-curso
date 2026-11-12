---
titulo: PySpark con el mismo método - el plan no cambia, cambia la sintaxis
nivel: Intermedio
duracion: 40
resumen: El mismo plan de filtrar, transformar, agrupar, agregar y ordenar escrito con DataFrames de PySpark. Cómo traducir línea por línea desde Python o SQL, por qué en Spark no se recorren filas con un for, y cómo resolver comparar con el anterior y top N por grupo con ventanas.
objetivos: Traducir un plan en pasos a una cadena de transformaciones de DataFrame | Reemplazar un bucle fila por fila por operaciones sobre columnas | Usar Window para comparar con la fila anterior y para top N por grupo | Verificar cada paso con show() y count()
prerrequisitos: logica-sql-con-metodo | pyspark-agregaciones
autoevaluacion: ¿Sabes qué método de DataFrame corresponde a cada operación? | ¿Sabes por qué no se usa un for sobre las filas en Spark? | ¿Sabes armar un top N por grupo con row_number? | ¿Cómo verificas un paso intermedio?
---

:::analogia En palabras simples
Escribir una receta en castellano o en inglés no cambia la receta. Python, SQL y PySpark son tres idiomas para el mismo plan. Si escribiste los pasos en castellano primero, traducir es lo fácil.
:::

## El diccionario de traducción

| Operación | Python puro | SQL | PySpark |
|---|---|---|---|
| Filtrar | `if p["estado"] == "entregado"` | `WHERE estado = 'entregado'` | `.filter(F.col("estado") == "entregado")` |
| Transformar | `p["monto"] * 1.21` | `monto * 1.21 AS con_iva` | `.withColumn("con_iva", F.col("monto") * 1.21)` |
| Agrupar + agregar | diccionario acumulador | `GROUP BY canal` + `SUM(...)` | `.groupBy("canal").agg(F.sum(...))` |
| Ordenar y cortar | `sorted(...)[:5]` | `ORDER BY ... LIMIT 5` | `.orderBy(F.desc("x")).limit(5)` |
| Cruzar | diccionario índice | `JOIN` | `.join(otro, "clave", "left")` |
| Comparar con el anterior | variable `anterior` | `LAG() OVER (...)` | `F.lag(...).over(w)` |

## En Spark no se recorre con un for

En Python puro escribes el bucle. En Spark los datos están repartidos entre muchas máquinas: **describes qué hacer con cada columna** y Spark decide cómo repartir el trabajo. Si te encuentras escribiendo `for fila in df.collect()`, casi siempre hay una forma con `filter`, `withColumn` o `groupBy`.

```python
from pyspark.sql import functions as F

pedidos = spark.table("pedidos")

# Plan: pedidos entregados → por canal → cuántos → de mayor a menor
resultado = (pedidos
    .filter(F.col("estado") == "entregado")   # filtrar
    .groupBy("canal")                          # agrupar
    .agg(F.count("*").alias("pedidos"))        # agregar
    .orderBy(F.desc("pedidos")))               # ordenar

resultado.show()
```

Cada línea es un paso del plan. Si el resultado está mal, comenta las últimas líneas y mira con `.show()` el paso anterior, igual que probabas cada CTE.

## Comparar con el anterior y top N: ventanas

Una `Window` define "el grupo y el orden" en el que miras a los vecinos de cada fila.

```python
from pyspark.sql import functions as F
from pyspark.sql.window import Window

por_anio = (spark.table("pedidos")
    .groupBy(F.year("fecha_pedido").alias("anio"))
    .count())

w = Window.orderBy("anio")
por_anio.withColumn("anterior", F.lag("count").over(w)).show()
```

Para "los 2 productos más caros de cada categoría", numeras dentro de cada grupo y te quedas con los primeros:

```python
from pyspark.sql import functions as F
from pyspark.sql.window import Window

w = Window.partitionBy("categoria_id").orderBy(F.desc("precio"), "nombre")
(spark.table("productos")
    .withColumn("puesto", F.row_number().over(w))
    .filter(F.col("puesto") <= 2)
    .select("categoria_id", "nombre", "precio")
    .show())
```

## Verificar en Spark

| Pregunta | Cómo la respondes |
|---|---|
| ¿Cuántas filas quedaron? | `df.count()` |
| ¿Hay duplicados de la clave? | `df.groupBy("id").count().filter("count > 1").count()` |
| ¿Cómo se ven los datos? | `df.show(5)` |
| ¿Qué columnas y tipos tengo? | `df.printSchema()` |

:::ejercicio quiz
¿Qué método de DataFrame equivale a `HAVING` en SQL?
- [ ] `groupBy` sin `agg`
- [x] Un `filter` aplicado después del `agg`
- [ ] Un `filter` aplicado antes del `groupBy`
- [ ] `orderBy`
:::

:::ejercicio quiz
Un compañero escribe `for fila in df.collect(): ...` para sumar montos de 50 millones de filas. ¿Cuál es el problema?
- [ ] Ninguno, es la forma recomendada
- [x] Trae todos los datos a una sola máquina y pierde el procesamiento distribuido; conviene `groupBy().agg(F.sum(...))`
- [ ] `collect()` no existe en PySpark
- [ ] Solo funciona con números enteros
:::

:::ejercicio pyspark dificultad=Básico
Traduce el plan "pedidos **cancelados** → por `metodo_pago` → cuántos". Guarda en `resultado` con columnas `metodo_pago`, `pedidos`.
```python solucion
from pyspark.sql import functions as F

resultado = (spark.table("pedidos")
    .filter(F.col("estado") == "cancelado")
    .groupBy("metodo_pago")
    .agg(F.count("*").alias("pedidos")))
```
```pista
`.filter(F.col("estado") == "cancelado")` → `.groupBy("metodo_pago")` → `.agg(F.count("*").alias("pedidos"))`.
```
:::

:::ejercicio pyspark dificultad=Intermedio
Para cada `marca`, calcula el **margen promedio** de sus productos activos (`activo == 1`), donde margen = `precio - costo`, redondeado a 2. Deja solo las marcas con margen promedio mayor a 100. Columnas: `marca`, `margen_promedio`.
```python solucion
from pyspark.sql import functions as F

resultado = (spark.table("productos")
    .filter(F.col("activo") == 1)
    .withColumn("margen", F.col("precio") - F.col("costo"))
    .groupBy("marca")
    .agg(F.round(F.avg("margen"), 2).alias("margen_promedio"))
    .filter(F.col("margen_promedio") > 100))
```
```pista
Filtrar activos → `withColumn` para el margen → agrupar por marca y promediar → filtrar el grupo (el "HAVING" es un `filter` después del `agg`).
```
:::

:::ejercicio pyspark dificultad=Avanzado
Comparar con el anterior. Cuenta los pedidos por año (`anio`, `pedidos`) y agrega `diferencia` = pedidos del año menos pedidos del año anterior (nula el primer año).
```python solucion
from pyspark.sql import functions as F
from pyspark.sql.window import Window

por_anio = (spark.table("pedidos")
    .groupBy(F.year("fecha_pedido").alias("anio"))
    .agg(F.count("*").alias("pedidos")))
w = Window.orderBy("anio")
resultado = por_anio.withColumn("diferencia", F.col("pedidos") - F.lag("pedidos").over(w))
```
```pista
Primero una fila por año con `groupBy(F.year(...))`. Después una ventana ordenada por año y `F.lag("pedidos").over(w)` para traer el valor anterior.
```
:::

:::ejercicio pyspark dificultad=Avanzado
Top N por grupo. Para cada `categoria_id`, quédate con los **2 productos más caros** (si empatan en precio, desempata por `nombre` alfabético). Columnas: `categoria_id`, `nombre`, `precio`.
```python solucion
from pyspark.sql import functions as F
from pyspark.sql.window import Window

w = Window.partitionBy("categoria_id").orderBy(F.desc("precio"), "nombre")
resultado = (spark.table("productos")
    .withColumn("puesto", F.row_number().over(w))
    .filter(F.col("puesto") <= 2)
    .select("categoria_id", "nombre", "precio"))
```
```pista
Ventana particionada por categoría y ordenada por precio descendente y nombre. Numera con `F.row_number()`, filtra los puestos 1 y 2 y elige las columnas.
```
:::
