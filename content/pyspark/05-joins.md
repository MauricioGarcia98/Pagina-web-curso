---
titulo: Joins en PySpark
nivel: Intermedio
duracion: 30
resumen: inner, left, anti y semi joins, columnas ambiguas, alias y self joins.
---

```python norun
df_izq.join(df_der, on=..., how="inner")
```

- `on` puede ser un **nombre de columna** (o lista) que existe en ambos lados, o una **condición**.
- `how`: `"inner"` (por defecto), `"left"`, `"right"`, `"full"`, `"left_semi"`, `"left_anti"`, `"cross"`.

## Join por nombre de columna

```python
pedidos = spark.table("pedidos")
clientes = spark.table("clientes")
pedidos.join(clientes, "cliente_id").select("pedido_id", "nombre", "pais").show(5)
```

Cuando unes por nombre, la columna de unión aparece **una sola vez** en el resultado.

## Join por condición y el problema de las columnas ambiguas

```python
from pyspark.sql import functions as F

p = spark.table("productos")
c = spark.table("categorias")
# ambas tienen la columna "nombre": hay que decir de cuál hablamos
(p.join(c, p.categoria_id == c.categoria_id)
   .select(p.nombre.alias("producto"), c.nombre.alias("categoria"))
   .show(5))
```

Otra forma muy usada es con **alias** de DataFrame:

```python
from pyspark.sql import functions as F

(spark.table("productos").alias("p")
   .join(spark.table("categorias").alias("c"), F.col("p.categoria_id") == F.col("c.categoria_id"))
   .select(F.col("p.nombre").alias("producto"), F.col("c.nombre").alias("categoria"))
   .show(5))
```

:::tip Truco práctico
Renombra las columnas conflictivas **antes** del join (`withColumnRenamed("nombre", "categoria")`) y une por nombre de columna. Evita muchos dolores de cabeza.
:::

## left_anti y left_semi: los joins “filtro”

- `left_semi`: filas de la izquierda que **tienen** pareja (como `WHERE EXISTS`). No agrega columnas.
- `left_anti`: filas de la izquierda que **no tienen** pareja (como `WHERE NOT EXISTS`). Perfecto para “clientes sin pedidos”.

```python
clientes = spark.table("clientes")
pedidos = spark.table("pedidos")
sin_pedidos = clientes.join(pedidos, "cliente_id", "left_anti")
print(sin_pedidos.count())
```

## Self join

```python
from pyspark.sql import functions as F

e = spark.table("empleados")
(e.alias("e")
   .join(e.alias("j"), F.col("e.jefe_id") == F.col("j.empleado_id"), "left")
   .select(F.col("e.nombre").alias("empleado"), F.col("j.nombre").alias("jefe"))
   .show(5))
```

## Ejercicios

:::ejercicio pyspark
Une `pedidos` con `clientes` y cuenta los pedidos por `pais`. Columnas: `pais`, `pedidos`.
```python solucion
from pyspark.sql import functions as F

resultado = (spark.table("pedidos")
               .join(spark.table("clientes"), "cliente_id")
               .groupBy("pais")
               .agg(F.count("*").alias("pedidos")))
```
:::

:::ejercicio pyspark
Encuentra los clientes que **nunca** hicieron un pedido usando un **left_anti** join. Columnas: `cliente_id`, `nombre`, `fecha_registro`.
```python solucion
resultado = (spark.table("clientes")
               .join(spark.table("pedidos"), "cliente_id", "left_anti")
               .select("cliente_id", "nombre", "fecha_registro"))
```
:::

:::ejercicio pyspark
Muestra cada producto con el nombre de su categoría. Columnas: `producto_id`, `producto`, `categoria`. Ojo: ambas tablas tienen la columna `nombre`.
```python solucion
cat = spark.table("categorias").withColumnRenamed("nombre", "categoria")
resultado = (spark.table("productos")
               .withColumnRenamed("nombre", "producto")
               .join(cat, "categoria_id")
               .select("producto_id", "producto", "categoria"))
```
:::

:::ejercicio pyspark
Para **todos** los empleados, muestra `empleado` (nombre), `departamento` (nombre del departamento) y `jefe` (nombre del jefe, NULL para el CEO).
```python solucion
from pyspark.sql import functions as F

e = spark.table("empleados")
d = spark.table("departamentos").select("departamento_id", F.col("nombre").alias("departamento"))
resultado = (e.alias("e")
               .join(e.alias("j"), F.col("e.jefe_id") == F.col("j.empleado_id"), "left")
               .join(d, F.col("e.departamento_id") == d.departamento_id, "left")
               .select(F.col("e.nombre").alias("empleado"), F.col("departamento"), F.col("j.nombre").alias("jefe")))
```
```pista
Haz un self join con alias (`e` y `j`) y luego une `departamentos` renombrando su columna `nombre`.
```
:::

:::ejercicio pyspark
Calcula las **unidades vendidas por categoría padre** (`categoria`), es decir, sube un nivel en la jerarquía: une `detalle_pedidos` → `productos` → `categorias` (subcategoría) → `categorias` (padre). Columnas: `categoria`, `unidades`.
```python solucion
from pyspark.sql import functions as F

det = spark.table("detalle_pedidos")
prod = spark.table("productos").select("producto_id", "categoria_id")
sub = spark.table("categorias").select("categoria_id", F.col("categoria_padre_id").alias("padre_id"))
padre = spark.table("categorias").select(F.col("categoria_id").alias("padre_id"), F.col("nombre").alias("categoria"))
resultado = (det.join(prod, "producto_id")
               .join(sub, "categoria_id")
               .join(padre, "padre_id")
               .groupBy("categoria")
               .agg(F.sum("cantidad").alias("unidades")))
```
```pista
Las categorías hoja (las de los productos) tienen `categoria_padre_id`. Algunas subcategorías (Laptops) son hijas de otra subcategoría (Computadoras): en este ejercicio sube **un solo nivel**.
```
:::
