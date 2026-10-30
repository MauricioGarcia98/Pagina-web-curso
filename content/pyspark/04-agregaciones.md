---
titulo: groupBy, agg, pivot y rollup
nivel: Intermedio
duracion: 40
resumen: Agregar datos por grupos con varias métricas, pivotear y subtotales.
---

## Resumir datos por grupos

Agrupar y resumir es el corazón del análisis: ventas por mes, clientes por país, ticket promedio por canal. En SQL lo hiciste con `GROUP BY` y funciones de agregación; en PySpark es la pareja **`groupBy` + `agg`**. Las ideas son idénticas, incluida la regla de oro: el resultado tiene **una fila por grupo**.

| SQL | PySpark |
|---|---|
| `GROUP BY marca` | `.groupBy("marca")` |
| `COUNT(*) AS productos` | `F.count("*").alias("productos")` |
| `AVG(precio)` | `F.avg("precio")` |
| `COUNT(DISTINCT x)` | `F.countDistinct("x")` |
| `HAVING COUNT(*) > 10` | `.filter(F.col("n") > 10)` **después** del `agg` |
| `SUM(CASE WHEN … THEN 1 ELSE 0 END)` | `F.sum(F.when(…, 1).otherwise(0))` |

## groupBy + agg

```python
from pyspark.sql import functions as F

(spark.table("productos")
   .groupBy("marca")
   .agg(
       F.count("*").alias("productos"),
       F.round(F.avg("precio"), 2).alias("precio_promedio"),
       F.min("precio").alias("minimo"),
       F.max("precio").alias("maximo"),
       F.sum("stock").alias("stock_total"),
       F.countDistinct("categoria_id").alias("categorias"),
   )
   .orderBy(F.desc("productos"))
   .show(10))
```

Cómo leerlo:

1. `groupBy("marca")` reparte las filas en grupos, uno por marca. Por sí solo **no** produce un DataFrame que puedas mostrar: es un objeto intermedio que espera saber **qué calcular**.
2. `agg(...)` recibe una o más agregaciones; cada una con su `.alias`, porque si no el nombre sería `avg(precio)`.
3. El resultado tiene la columna de agrupación (`marca`) más una columna por agregación.

Puedes agrupar por varias columnas (`groupBy("pais", "segmento")`) o por expresiones (`groupBy(F.year("fecha_pedido").alias("anio"))`).

### Atajos

```python
from pyspark.sql import functions as F

spark.table("pedidos").groupBy("canal").count().show()                      # una columna "count"
spark.table("productos").groupBy("marca").max("precio").show(3)             # max(precio)
spark.table("productos").agg(F.max("precio"), F.min("precio")).show()       # sin agrupar: una sola fila
```

`groupBy(...).count()` es el atajo más usado; para todo lo demás, `agg` con alias es más claro.

### HAVING en PySpark

No hay un método especial: simplemente **filtras después** del `agg`, porque a esa altura cada fila ya es un grupo:

```python
from pyspark.sql import functions as F

(spark.table("pedidos")
   .groupBy("cliente_id")
   .agg(F.count("*").alias("n"))
   .filter(F.col("n") > 20)          # = HAVING COUNT(*) > 20
   .orderBy(F.desc("n"))
   .show(5))
```

```recorrido
titulo: groupBy + agg paso a paso: pedidos por canal
estacion tabla: Las filas | icono=tabla
estacion grupos: groupBy | icono=capas
estacion agg: agg | icono=engranaje
estacion res: Resultado | icono=check
paso tabla: Muchas filas sueltas
`pedidos` tiene 12.000 filas, una por pedido. Estas son 8 de ellas.
>>> tabla
pedido_id,cliente_id,canal
101,73,web
102,361,web
103,1229,web
104,751,web
105,303,web
106,637,web
107,837,app
108,904,web
paso grupos: groupBy("canal") arma los grupos
Spark reparte las filas en **un grupo por cada canal distinto**. En un cluster, esto mueve las filas entre máquinas para que cada canal quede junto (un *shuffle*).
>>> texto
grupo "web"      → 5400 filas
grupo "app"      → 2973 filas
grupo "tienda"   → 2645 filas
grupo "telefono" →  982 filas
paso agg: agg resume cada grupo en una fila
Cada agregación se calcula **dentro de cada grupo**. Ponle `.alias` a cada una para que la columna tenga un nombre claro.
>>> python
from pyspark.sql import functions as F

resultado = (spark.table("pedidos")
    .groupBy("canal")
    .agg(F.count("*").alias("pedidos"),
         F.countDistinct("cliente_id").alias("clientes"))
    .orderBy(F.desc("pedidos")))
paso res: Una fila por canal
De 12.000 filas a 4: una por grupo, con la columna de agrupación más una columna por agregación.
>>> tabla
canal,pedidos,clientes
web,5400,1229
app,2973,1032
tienda,2645,961
telefono,982,596
```

## Agregaciones condicionales

Igual que en SQL, puedes contar o sumar **solo** lo que cumple una condición, combinando `F.when` dentro de la agregación:

```python
from pyspark.sql import functions as F

(spark.table("pedidos")
   .groupBy("canal")
   .agg(
       F.count("*").alias("total"),
       F.sum(F.when(F.col("estado") == "cancelado", 1).otherwise(0)).alias("cancelados"),
       F.round(F.avg(F.when(F.col("estado") == "devuelto", 1).otherwise(0)) * 100, 2).alias("pct_devueltos"),
   )
   .show())
```

```text
+--------+-----+----------+-------------+
|   canal|total|cancelados|pct_devueltos|
+--------+-----+----------+-------------+
|     app| 2973|       266|         4.27|
|telefono|  982|        73|         4.07|
|  tienda| 2645|       207|         4.73|
|     web| 5400|       421|         3.96|
```

Fíjate en el truco de `pct_devueltos`: el **promedio** de una columna de unos y ceros es directamente la **proporción** de unos. `avg(1, 0, 0, 1)` = 0,5 = 50 %. Es una forma elegante de calcular tasas.

## collect_list y collect_set: juntar valores en un array

A veces no quieres un número por grupo, sino **la lista** de valores:

```python
from pyspark.sql import functions as F

(spark.table("pedidos")
   .filter(F.col("cliente_id") <= 3)
   .groupBy("cliente_id")
   .agg(F.collect_set("canal").alias("canales"), F.count("*").alias("pedidos"))
   .show(truncate=False))
```

- `collect_list` junta **todos** los valores (con repetidos).
- `collect_set` junta los valores **distintos**.

Usos: "¿por qué canales compró cada cliente?", "los productos de cada pedido en una sola fila". El orden dentro del array no está garantizado. Cuidado con grupos enormes: todo el array de un grupo tiene que entrar en la memoria de una máquina.

## pivot: valores convertidos en columnas

`pivot` hace en un paso lo que en SQL requiere un `SUM(CASE WHEN …)` por cada valor: convierte los valores de una columna en **columnas**.

```python
(spark.table("pedidos")
   .groupBy("canal")
   .pivot("estado", ["entregado", "enviado", "pendiente", "cancelado", "devuelto"])
   .count()
   .show())
```

```text
+--------+---------+-------+---------+---------+--------+
|   canal|entregado|enviado|pendiente|cancelado|devuelto|
+--------+---------+-------+---------+---------+--------+
|     app|     2261|    …  |    …    |      266|     127|
```

La estructura es siempre: `groupBy(filas)` → `pivot(columna_que_se_vuelve_columnas)` → la agregación de cada celda (`count()`, `sum("monto")`, `agg(...)`).

:::tip Pasa los valores a pivot
Si indicas la lista de valores (`pivot("estado", [...])`), Spark no tiene que hacer una pasada extra por los datos para descubrirlos: es más rápido y el orden de las columnas queda fijo. Sin la lista, también funciona.
:::

## rollup y cube: subtotales

Los reportes suelen mostrar subtotales: por país y segmento, el total de cada país, y el total general. `rollup` los calcula en una sola operación:

```python
from pyspark.sql import functions as F

(spark.table("clientes")
   .rollup("pais", "segmento")
   .agg(F.count("*").alias("clientes"))
   .orderBy("pais", "segmento")
   .show(12))
```

`rollup("pais", "segmento")` produce:

| Nivel | `pais` | `segmento` | Significa |
|---|---|---|---|
| Detalle | Chile | Pyme | Clientes Pyme de Chile |
| Subtotal | Chile | `NULL` | Todos los clientes de Chile |
| Total general | `NULL` | `NULL` | Los 2.000 clientes |

Los `NULL` marcan "todos". (Si tus datos ya tenían nulos en esas columnas, `F.grouping("pais")` distingue un nulo "real" de uno de subtotal.) `cube` es parecido pero calcula **todas** las combinaciones, incluidos los totales por segmento sin país.

:::experto groupBy y el shuffle
Agrupar en un cluster obliga a **mover** datos: todas las filas de "Chile" tienen que terminar en la misma máquina para sumarlas. Ese movimiento se llama **shuffle** y es la operación más cara de Spark (lo viste en el módulo de Spark). Spark lo hace en dos fases: primero agrega parcialmente en cada máquina y recién después mueve esos resultados parciales, mucho más chicos. Por eso agrupar suele ser eficiente, salvo con `collect_list` sobre grupos enormes o claves muy desbalanceadas (*skew*).
:::

## Resumen

- `groupBy(cols).agg(F.func(...).alias(...), …)`: una fila por grupo, una columna por métrica.
- `HAVING` = `filter` después del `agg`.
- Agregación condicional: `F.sum(F.when(cond, 1).otherwise(0))`; el `avg` de unos y ceros es una proporción.
- `collect_list`/`collect_set` juntan valores en arrays.
- `pivot` convierte valores en columnas (pasa la lista de valores); `rollup`/`cube` agregan subtotales.

## Ejercicios

:::ejercicio pyspark
Por `pais` de cliente, calcula: cantidad de clientes (`clientes`) y cuántos son del segmento `Corporativo` (`corporativos`).
```python solucion
from pyspark.sql import functions as F

resultado = (spark.table("clientes")
               .groupBy("pais")
               .agg(F.count("*").alias("clientes"),
                    F.sum(F.when(F.col("segmento") == "Corporativo", 1).otherwise(0)).alias("corporativos")))
```
:::

:::ejercicio pyspark
Calcula las **ventas netas por año** (columna `anio`) de pedidos no cancelados, con el total redondeado a 2 (`ventas`) y la cantidad de pedidos distintos (`pedidos`). Une `detalle_pedidos` con `pedidos`.
```python solucion
from pyspark.sql import functions as F

det = spark.table("detalle_pedidos")
ped = spark.table("pedidos").filter(F.col("estado") != "cancelado")
resultado = (det.join(ped, "pedido_id")
               .withColumn("importe", F.col("cantidad") * F.col("precio_unitario") * (1 - F.col("descuento")))
               .groupBy(F.year("fecha_pedido").alias("anio"))
               .agg(F.round(F.sum("importe"), 2).alias("ventas"),
                    F.countDistinct("pedido_id").alias("pedidos")))
```
:::

:::ejercicio pyspark
Encuentra los clientes con **más de 25 pedidos**. Columnas: `cliente_id`, `pedidos`.
```python solucion
from pyspark.sql import functions as F

resultado = (spark.table("pedidos")
               .groupBy("cliente_id")
               .agg(F.count("*").alias("pedidos"))
               .filter(F.col("pedidos") > 25))
```
:::

:::ejercicio pyspark
Haz un **pivot** de la cantidad de pedidos por `metodo_pago` (filas) y `canal` (columnas `app`, `telefono`, `tienda`, `web`, en ese orden).
```python solucion
resultado = (spark.table("pedidos")
               .groupBy("metodo_pago")
               .pivot("canal", ["app", "telefono", "tienda", "web"])
               .count())
```
:::
