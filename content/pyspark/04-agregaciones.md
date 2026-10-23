---
titulo: groupBy, agg, pivot y rollup
nivel: Intermedio
duracion: 30
resumen: Agregar datos por grupos con varias métricas, pivotear y subtotales.
---

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

Atajos: `df.groupBy("x").count()`, `df.groupBy("x").sum("y")`, `df.agg(F.max("y"))` (sin agrupar).

:::tip “HAVING” en PySpark
Simplemente filtra **después** del `agg`: `.groupBy(...).agg(F.count("*").alias("n")).filter(F.col("n") > 10)`.
:::

## Agregaciones condicionales

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

## collect_list y collect_set

Juntan los valores de un grupo en un **array**:

```python
from pyspark.sql import functions as F

(spark.table("pedidos")
   .filter(F.col("cliente_id") <= 3)
   .groupBy("cliente_id")
   .agg(F.collect_set("canal").alias("canales"), F.count("*").alias("pedidos"))
   .show(truncate=False))
```

## pivot

Convierte los valores de una columna en columnas:

```python
(spark.table("pedidos")
   .groupBy("canal")
   .pivot("estado", ["entregado", "enviado", "pendiente", "cancelado", "devuelto"])
   .count()
   .show())
```

:::tip Pasa los valores a pivot
Si indicas la lista de valores (`pivot("estado", [...])`), Spark no tiene que calcularlos antes: es más rápido y el orden de las columnas queda fijo.
:::

## rollup y cube: subtotales

```python
from pyspark.sql import functions as F

(spark.table("clientes")
   .rollup("pais", "segmento")
   .agg(F.count("*").alias("clientes"))
   .orderBy("pais", "segmento")
   .show(12))
```

`rollup("pais", "segmento")` da totales por (país, segmento), por país (segmento NULL) y el total general (ambos NULL).

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
