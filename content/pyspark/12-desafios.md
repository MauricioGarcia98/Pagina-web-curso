---
titulo: Desafíos de PySpark (nivel entrevista)
nivel: Experto
duracion: 60
resumen: Problemas tipo entrevista técnica para Data Engineer con PySpark.
---

Resuelve estos problemas **solo con la API de DataFrames** (sin `spark.sql`). Son los que suelen pedir en entrevistas técnicas para Data Engineer con Spark/Databricks.

:::ejercicio pyspark dificultad=Experto titulo="Sesionización"
Sesioniza `eventos_web` (solo eventos con `cliente_id`): una nueva sesión empieza si pasaron **más de 30 minutos** desde el evento anterior del mismo cliente. Devuelve, por cliente, la cantidad de sesiones. Columnas: `cliente_id`, `sesiones`.
```python solucion
from pyspark.sql import functions as F
from pyspark.sql.window import Window

w = Window.partitionBy("cliente_id").orderBy("fecha_hora")
ev = (spark.table("eventos_web")
        .filter(F.col("cliente_id").isNotNull())
        .withColumn("anterior", F.lag("fecha_hora").over(w))
        .withColumn("gap_min", (F.unix_timestamp("fecha_hora") - F.unix_timestamp("anterior")) / 60)
        .withColumn("nueva", F.when(F.col("anterior").isNull() | (F.col("gap_min") > 30), 1).otherwise(0)))
resultado = ev.groupBy("cliente_id").agg(F.sum("nueva").alias("sesiones"))
```
```pista
Con `F.lag` obtén el timestamp anterior, calcula la diferencia con `F.unix_timestamp` (segundos) y marca 1 cuando empieza una sesión nueva. La suma de esas marcas por cliente es la cantidad de sesiones.
```
:::

:::ejercicio pyspark dificultad=Experto titulo="Embudo de conversión"
Calcula el embudo por `dispositivo` sobre `eventos_web` con cliente: clientes distintos que vieron `producto` (`vieron`), llegaron a `checkout` (`checkout`) y a `confirmacion` (`compraron`). Columnas: `dispositivo`, `vieron`, `checkout`, `compraron`.
```python solucion
from pyspark.sql import functions as F

ev = spark.table("eventos_web").filter(F.col("cliente_id").isNotNull())
resultado = (ev.groupBy("dispositivo")
               .agg(F.countDistinct(F.when(F.col("pagina") == "producto", F.col("cliente_id"))).alias("vieron"),
                    F.countDistinct(F.when(F.col("pagina") == "checkout", F.col("cliente_id"))).alias("checkout"),
                    F.countDistinct(F.when(F.col("pagina") == "confirmacion", F.col("cliente_id"))).alias("compraron")))
```
:::

:::ejercicio pyspark dificultad=Experto titulo="Clientes recurrentes por año"
Para cada año, cuenta cuántos clientes compraron ese año (`clientes`) y cuántos de ellos **también habían comprado el año anterior** (`recurrentes`). Columnas: `anio`, `clientes`, `recurrentes`.
```python solucion
from pyspark.sql import functions as F

ca = spark.table("pedidos").select("cliente_id", F.year("fecha_pedido").alias("anio")).distinct()
prev = ca.select("cliente_id", (F.col("anio") + 1).alias("anio"), F.lit(1).alias("compro_antes"))
resultado = (ca.join(prev, ["cliente_id", "anio"], "left")
               .groupBy("anio")
               .agg(F.count("*").alias("clientes"),
                    F.sum(F.coalesce("compro_antes", F.lit(0))).alias("recurrentes")))
```
```pista
Arma un DataFrame (cliente, año) sin duplicados. Desplaza el año +1 en una copia y haz un left join: si hay match, el cliente compró el año anterior.
```
:::

:::ejercicio pyspark dificultad=Experto titulo="Top 3 productos por país"
Para cada **país** de cliente, los 3 productos con más unidades vendidas (desempata por `producto_id` ascendente). Columnas: `pais`, `producto_id`, `unidades`, `puesto`.
```python solucion
from pyspark.sql import functions as F
from pyspark.sql.window import Window

u = (spark.table("detalle_pedidos")
       .join(spark.table("pedidos").select("pedido_id", "cliente_id"), "pedido_id")
       .join(spark.table("clientes").select("cliente_id", "pais"), "cliente_id")
       .groupBy("pais", "producto_id")
       .agg(F.sum("cantidad").alias("unidades")))
w = Window.partitionBy("pais").orderBy(F.col("unidades").desc(), F.col("producto_id"))
resultado = (u.withColumn("puesto", F.row_number().over(w))
              .filter(F.col("puesto") <= 3)
              .select("pais", "producto_id", "unidades", "puesto"))
```
:::

:::ejercicio pyspark dificultad=Experto titulo="SCD tipo 2"
Tienes la dimensión `dim` (versión vigente con `es_actual = True`) y los `cambios` de hoy. Genera la **nueva versión de la dimensión**: cierra las filas que cambiaron (`es_actual = False`, `valido_hasta = "2024-06-01"`) y agrega las nuevas versiones (`valido_desde = "2024-06-01"`, `valido_hasta = None`, `es_actual = True`). Los clientes sin cambios quedan igual; los clientes nuevos se agregan. Columnas: `cliente_id`, `ciudad`, `valido_desde`, `valido_hasta`, `es_actual`.
```python inicial
from pyspark.sql import functions as F

dim = spark.createDataFrame([
    (1, "Lima", "2023-01-01", None, True),
    (2, "Quito", "2023-01-01", None, True),
    (3, "Cali", "2023-05-10", None, True),
], "cliente_id INT, ciudad STRING, valido_desde STRING, valido_hasta STRING, es_actual BOOLEAN")
cambios = spark.createDataFrame([(1, "Santiago"), (3, "Cali"), (4, "Bogotá")], "cliente_id INT, ciudad STRING")
HOY = "2024-06-01"
```
```python solucion
from pyspark.sql import functions as F

dim = spark.createDataFrame([
    (1, "Lima", "2023-01-01", None, True),
    (2, "Quito", "2023-01-01", None, True),
    (3, "Cali", "2023-05-10", None, True),
], "cliente_id INT, ciudad STRING, valido_desde STRING, valido_hasta STRING, es_actual BOOLEAN")
cambios = spark.createDataFrame([(1, "Santiago"), (3, "Cali"), (4, "Bogotá")], "cliente_id INT, ciudad STRING")
HOY = "2024-06-01"

c = cambios.withColumnRenamed("ciudad", "ciudad_nueva")
j = dim.join(c, "cliente_id", "left")
cambiaron = j.filter(F.col("ciudad_nueva").isNotNull() & (F.col("ciudad_nueva") != F.col("ciudad")))

cerradas = (cambiaron.select("cliente_id", "ciudad", "valido_desde")
              .withColumn("valido_hasta", F.lit(HOY))
              .withColumn("es_actual", F.lit(False)))
sin_cambio = (j.filter(F.col("ciudad_nueva").isNull() | (F.col("ciudad_nueva") == F.col("ciudad")))
                .select("cliente_id", "ciudad", "valido_desde", "valido_hasta", "es_actual"))
nuevas_versiones = (cambiaron.select("cliente_id", F.col("ciudad_nueva").alias("ciudad")))
nuevos_clientes = c.join(dim, "cliente_id", "left_anti").withColumnRenamed("ciudad_nueva", "ciudad")
altas = (nuevas_versiones.unionByName(nuevos_clientes)
           .withColumn("valido_desde", F.lit(HOY))
           .withColumn("valido_hasta", F.lit(None).cast("string"))
           .withColumn("es_actual", F.lit(True)))
resultado = sin_cambio.unionByName(cerradas).unionByName(altas)
```
```pista
Separa en cuatro grupos: (1) filas sin cambios, (2) filas que cambiaron → cerradas, (3) nuevas versiones de las que cambiaron y (4) clientes nuevos (left_anti). Une todo con `unionByName`.
```
:::
