---
titulo: Funciones: texto, fechas, condiciones y nulos
nivel: Intermedio
duracion: 35
resumen: El módulo pyspark.sql.functions: strings, fechas, when/otherwise, coalesce y manejo de NULL.
---

`pyspark.sql.functions` tiene más de 300 funciones. Estas son las que usarás a diario.

## Texto

```python
from pyspark.sql import functions as F

(spark.table("clientes")
   .select(
       F.upper("nombre").alias("mayus"),
       F.lower("email").alias("email"),
       F.trim(F.col("nombre")).alias("sin_espacios"),
       F.length("apellido").alias("largo"),
       F.concat_ws(" ", "nombre", "apellido").alias("completo"),
       F.substring("fecha_registro", 1, 4).alias("anio_txt"),
       F.split("email", "@").getItem(1).alias("dominio"),
       F.regexp_replace("telefono", r"[^0-9]", "").alias("solo_digitos"),
       F.initcap(F.lower("ciudad")).alias("ciudad"),
   )
   .show(5, truncate=False))
```

## Fechas

En el simulador (y normalmente en Spark) las columnas `fecha_*` de nuestras tablas son de tipo `date` o `timestamp`.

```python
from pyspark.sql import functions as F

(spark.table("pedidos")
   .select(
       "fecha_pedido",
       F.year("fecha_pedido").alias("anio"),
       F.month("fecha_pedido").alias("mes"),
       F.dayofweek("fecha_pedido").alias("dia_semana"),        # 1 = domingo ... 7 = sábado
       F.date_format("fecha_pedido", "yyyy-MM").alias("anio_mes"),
       F.trunc("fecha_pedido", "month").alias("inicio_mes"),
       F.date_add("fecha_pedido", 30).alias("vence"),
       F.datediff(F.lit("2024-12-31"), "fecha_pedido").alias("dias_hasta_fin_2024"),
   )
   .show(5))
```

| Función | Ejemplo |
|---|---|
| `F.to_date(col, "dd/MM/yyyy")` | Texto → fecha con formato |
| `F.to_timestamp(col)` | Texto → timestamp |
| `F.current_date()` | Hoy |
| `F.months_between(a, b)` | Meses entre fechas |
| `F.add_months(col, n)` | Sumar meses |
| `F.last_day(col)` | Último día del mes |

## Condiciones: when / otherwise

El `CASE WHEN` de PySpark:

```python
from pyspark.sql import functions as F

(spark.table("productos")
   .withColumn("gama",
       F.when(F.col("precio") < 50, "económico")
        .when(F.col("precio") < 300, "medio")
        .when(F.col("precio") < 1000, "premium")
        .otherwise("lujo"))
   .groupBy("gama").count()
   .show())
```

## Nulos

```python
from pyspark.sql import functions as F

c = spark.table("clientes")
c.filter(F.col("email").isNull()).count()
c.filter(F.col("telefono").isNotNull()).count()
c.select(F.coalesce("email", "telefono", F.lit("sin contacto")).alias("contacto")).show(5)
c.fillna({"telefono": "desconocido"}).select("telefono").show(5)
c.na.drop(subset=["email"]).count()
```

:::cuidado NULL en comparaciones
Igual que en SQL: `F.col("email") == None` **no funciona**. Usa `.isNull()` / `.isNotNull()`. Y `F.col("x") != "a"` excluye las filas donde `x` es NULL.
:::

## Ejercicios

:::ejercicio pyspark
A partir de `clientes`, crea `email_limpio` (email en minúsculas) y `dominio` (lo que sigue a la `@`). Devuelve `cliente_id`, `email_limpio`, `dominio` solo de los clientes **con** email.
```python solucion
from pyspark.sql import functions as F

resultado = (spark.table("clientes")
               .filter(F.col("email").isNotNull())
               .withColumn("email_limpio", F.lower("email"))
               .withColumn("dominio", F.split("email_limpio", "@").getItem(1))
               .select("cliente_id", "email_limpio", "dominio"))
```
:::

:::ejercicio pyspark
Cuenta los pedidos por **año** y **mes** (columnas `anio`, `mes`, `pedidos`) solo del año **2024**.
```python solucion
from pyspark.sql import functions as F

resultado = (spark.table("pedidos")
               .filter(F.year("fecha_pedido") == 2024)
               .groupBy(F.year("fecha_pedido").alias("anio"), F.month("fecha_pedido").alias("mes"))
               .agg(F.count("*").alias("pedidos")))
```
:::

:::ejercicio pyspark
Clasifica los clientes por `fecha_nacimiento`: `"joven"` si nacieron en 1995 o después, `"adulto"` si nacieron entre 1970 y 1994, y `"senior"` antes de 1970. Cuenta cuántos hay en cada grupo. Columnas: `grupo_edad`, `clientes`.
```python solucion
from pyspark.sql import functions as F

anio = F.year("fecha_nacimiento")
resultado = (spark.table("clientes")
               .withColumn("grupo_edad",
                   F.when(anio >= 1995, "joven")
                    .when(anio >= 1970, "adulto")
                    .otherwise("senior"))
               .groupBy("grupo_edad")
               .agg(F.count("*").alias("clientes")))
```
:::

:::ejercicio pyspark
De `clientes`, devuelve `cliente_id` y una columna `contacto` que tenga el email; si no hay email, el teléfono; y si tampoco hay, el texto `"sin contacto"`. Solo para clientes de **Paraguay**.
```python solucion
from pyspark.sql import functions as F

resultado = (spark.table("clientes")
               .filter(F.col("pais") == "Paraguay")
               .select("cliente_id", F.coalesce("email", "telefono", F.lit("sin contacto")).alias("contacto")))
```
:::

:::ejercicio pyspark
Para cada pago **aprobado**, calcula los días entre el pedido y el pago. Une `pagos` con `pedidos` por `pedido_id` y devuelve `pago_id`, `pedido_id` y `dias` (usa `F.datediff`).
```python solucion
from pyspark.sql import functions as F

resultado = (spark.table("pagos")
               .filter(F.col("estado") == "aprobado")
               .join(spark.table("pedidos").select("pedido_id", "fecha_pedido"), "pedido_id")
               .select("pago_id", "pedido_id", F.datediff("fecha_pago", "fecha_pedido").alias("dias")))
```
:::
