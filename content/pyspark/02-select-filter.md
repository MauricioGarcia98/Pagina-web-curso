---
titulo: select, filter, withColumn y columnas
nivel: Básico
duracion: 35
resumen: Elegir y renombrar columnas, filtrar filas, crear columnas calculadas y castear tipos.
---

## Tres formas de referirse a una columna

```python
from pyspark.sql import functions as F

df = spark.table("productos")
df.select("nombre", "precio").show(3)                 # por nombre (texto)
df.select(F.col("nombre"), F.col("precio")).show(3)   # con F.col (la más usada)
df.select(df.nombre, df["precio"]).show(3)            # como atributo del DataFrame
```

:::tip Convención
Casi todo el mundo importa las funciones así: `from pyspark.sql import functions as F`. Usa `F.col("x")` cuando necesites operar con la columna (`F.col("precio") * 2`).
:::

## select y alias

```python
from pyspark.sql import functions as F

(spark.table("productos")
   .select(
       "nombre",
       F.col("precio"),
       (F.col("precio") - F.col("costo")).alias("ganancia"),
       F.round((F.col("precio") - F.col("costo")) / F.col("precio") * 100, 1).alias("margen_pct"),
   )
   .show(5))
```

## filter / where

`filter` y `where` son lo mismo. Puedes usar expresiones con columnas o un texto SQL:

```python
from pyspark.sql import functions as F

p = spark.table("productos")
p.filter(F.col("precio") > 1000).show(3)
p.where("marca = 'Apple' AND precio > 1000").show(3)                     # estilo SQL
p.filter((F.col("marca") == "Sony") & (F.col("stock") < 50)).show(3)     # & = AND
p.filter((F.col("marca") == "Sony") | (F.col("marca") == "Bose")).show(3) # | = OR
p.filter(~F.col("activo").cast("boolean")).show(3)                        # ~ = NOT
p.filter(F.col("marca").isin("Nike", "Adidas")).show(3)
p.filter(F.col("nombre").contains("Pro")).show(3)
p.filter(F.col("nombre").like("Laptop%")).show(3)
p.filter(F.col("precio").between(100, 200)).show(3)
```

:::cuidado Los paréntesis son obligatorios
En Python `&` y `|` tienen más prioridad que `==` y `>`. Escribe **siempre** cada condición entre paréntesis: `(F.col("a") > 1) & (F.col("b") < 5)`. Y no uses `and`/`or`: con columnas da error.
:::

## withColumn: agregar o reemplazar columnas

```python
from pyspark.sql import functions as F

df = (spark.table("detalle_pedidos")
        .withColumn("importe", F.col("cantidad") * F.col("precio_unitario") * (1 - F.col("descuento")))
        .withColumn("importe", F.round("importe", 2))                 # mismo nombre = reemplaza
        .withColumn("tiene_descuento", F.col("descuento") > 0)
        .withColumn("moneda", F.lit("USD")))                           # F.lit = valor constante
df.show(5)
```

## Renombrar, borrar y castear

```python
from pyspark.sql import functions as F

df = (spark.table("clientes")
        .withColumnRenamed("pais", "country")
        .drop("telefono", "fecha_nacimiento")
        .withColumn("cliente_id", F.col("cliente_id").cast("string")))
df.printSchema()
```

## distinct, orderBy y limit

```python
from pyspark.sql import functions as F

spark.table("clientes").select("pais").distinct().orderBy("pais").show()
spark.table("productos").orderBy(F.col("precio").desc(), "nombre").limit(5).show()
spark.table("pedidos").dropDuplicates(["cliente_id"]).count()
```

## Ejercicios

:::ejercicio pyspark
De `productos`, selecciona `nombre`, `marca` y `precio` de los productos de la marca `Apple`. Guarda en `resultado`.
```python inicial
from pyspark.sql import functions as F

productos = spark.table("productos")
```
```python solucion
from pyspark.sql import functions as F

productos = spark.table("productos")
resultado = productos.filter(F.col("marca") == "Apple").select("nombre", "marca", "precio")
```
:::

:::ejercicio pyspark
De `detalle_pedidos`, agrega la columna `importe` = `cantidad * precio_unitario * (1 - descuento)` redondeada a 2, y quédate con `detalle_id`, `pedido_id` e `importe` solo de las líneas con **descuento mayor a 0**.
```python solucion
from pyspark.sql import functions as F

resultado = (spark.table("detalle_pedidos")
               .filter(F.col("descuento") > 0)
               .withColumn("importe", F.round(F.col("cantidad") * F.col("precio_unitario") * (1 - F.col("descuento")), 2))
               .select("detalle_id", "pedido_id", "importe"))
```
:::

:::ejercicio pyspark
De `pedidos`, quédate con los pedidos del canal `web` **o** `app` cuyo estado sea `cancelado`. Columnas: `pedido_id`, `canal`, `estado`.
```python solucion
from pyspark.sql import functions as F

resultado = (spark.table("pedidos")
               .filter(F.col("canal").isin("web", "app") & (F.col("estado") == "cancelado"))
               .select("pedido_id", "canal", "estado"))
```
:::

:::ejercicio pyspark ordenado
Muestra los **5 productos más caros**: columnas `nombre` y `precio`, ordenados por precio descendente (si empatan, por nombre).
```python solucion
from pyspark.sql import functions as F

resultado = (spark.table("productos")
               .orderBy(F.col("precio").desc(), F.col("nombre"))
               .select("nombre", "precio")
               .limit(5))
```
:::

:::ejercicio pyspark
De `empleados`, crea las columnas `nombre_completo` (nombre y apellido separados por un espacio, usa `F.concat_ws`) y `salario_anual` (salario × 12). Quédate con `empleado_id`, `nombre_completo` y `salario_anual`.
```python solucion
from pyspark.sql import functions as F

resultado = (spark.table("empleados")
               .withColumn("nombre_completo", F.concat_ws(" ", "nombre", "apellido"))
               .withColumn("salario_anual", F.col("salario") * 12)
               .select("empleado_id", "nombre_completo", "salario_anual"))
```
:::
