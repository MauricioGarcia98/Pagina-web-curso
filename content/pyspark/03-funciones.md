---
titulo: Funciones: texto, fechas, condiciones y nulos
nivel: Intermedio
duracion: 45
resumen: El módulo pyspark.sql.functions: strings, fechas, when/otherwise, coalesce y manejo de NULL.
---

## Las funciones de Spark

En Python puro limpiarías un texto con `.strip().lower()`. En PySpark no trabajas con un texto, sino con **una columna entera** (millones de valores repartidos en muchas máquinas), así que se usan las funciones del módulo `pyspark.sql.functions` (importado como `F`). Hay más de 300; esta lección cubre las que usarás a diario, agrupadas por tema.

| Tema | Funciones clave | Equivalente SQL |
|---|---|---|
| Texto | `upper`, `lower`, `trim`, `length`, `concat_ws`, `substring`, `split`, `regexp_replace`, `initcap` | `UPPER`, `TRIM`, `SUBSTR`… |
| Fechas | `year`, `month`, `date_format`, `trunc`, `date_add`, `datediff`, `to_date` | `strftime`, `date(…)`, `julianday` |
| Condiciones | `when(…).otherwise(…)` | `CASE WHEN` |
| Nulos | `isNull`, `coalesce`, `fillna`, `na.drop` | `IS NULL`, `COALESCE` |

:::tip ¿Por qué no usar Python normal?
Podrías escribir una función de Python y aplicarla a cada fila (una UDF, que verás más adelante), pero sería **mucho más lenta**: cada valor tendría que viajar del motor de Spark (en Java) a Python y volver. Las funciones de `F` se ejecutan **dentro** del motor, optimizadas. Regla de oro: **si existe en `F`, úsala**.
:::

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
       F.split("email", "@").getItem(1).alias("dominio"),
       F.regexp_replace("telefono", r"[^0-9]", "").alias("solo_digitos"),
       F.initcap(F.lower("ciudad")).alias("ciudad"),
   )
   .show(5, truncate=False))
```

| Función | Qué hace | Detalle |
|---|---|---|
| `F.upper(c)` / `F.lower(c)` | Mayúsculas / minúsculas | |
| `F.trim(c)` | Quita espacios a los lados | también `ltrim`, `rtrim` |
| `F.length(c)` | Cantidad de caracteres | |
| `F.concat_ws(sep, c1, c2…)` | Une columnas con un separador | **ignora los nulos** (a diferencia de `F.concat`, que devuelve nulo si alguno lo es) |
| `F.substring(c, inicio, largo)` | Recorta | la primera posición es **1**, como en SQL |
| `F.split(c, patrón)` | Corta en un **array** | `.getItem(i)` toma un elemento (desde 0) |
| `F.regexp_replace(c, patrón, reemplazo)` | Reemplaza con expresiones regulares | `[^0-9]` = "todo lo que no sea dígito" |
| `F.regexp_extract(c, patrón, grupo)` | Extrae lo que coincide con un patrón | ej. el código de área de un teléfono |
| `F.initcap(c)` | Primera letra de cada palabra en mayúscula | ideal para nombres y ciudades |

:::analogia Las expresiones regulares
Una expresión regular es un "molde" para buscar texto: `[^0-9]` significa "cualquier carácter que no sea un dígito", `^\+` "un + al principio", `\d{4}` "cuatro dígitos seguidos". Son un mini-lenguaje propio; para limpieza de datos con 5 o 6 patrones resuelves el 90 % de los casos. Cuando no recuerdes uno, búscalo o pruébalo en sitios como regex101.
:::

Un paso típico de limpieza en la capa *silver* aplica varias de estas funciones juntas:

```python
from pyspark.sql import functions as F

limpio = (spark.table("clientes")
            .withColumn("email", F.lower(F.trim("email")))
            .withColumn("nombre", F.initcap(F.trim("nombre")))
            .withColumn("telefono", F.regexp_replace("telefono", r"[^0-9+]", "")))
limpio.select("nombre", "email", "telefono").show(3, truncate=False)
```

## Fechas

En nuestras tablas, las columnas `fecha_*` son de tipo `date` o `timestamp`. Spark tiene funciones para extraer partes, mover fechas y calcular diferencias:

```python
from pyspark.sql import functions as F

(spark.table("pedidos")
   .select(
       "fecha_pedido",
       F.year("fecha_pedido").alias("anio"),
       F.month("fecha_pedido").alias("mes"),
       F.dayofweek("fecha_pedido").alias("dia_semana"),        # 1 = domingo … 7 = sábado
       F.date_format("fecha_pedido", "yyyy-MM").alias("anio_mes"),
       F.trunc("fecha_pedido", "month").alias("inicio_mes"),
       F.date_add("fecha_pedido", 30).alias("vence"),
       F.datediff(F.lit("2024-12-31"), "fecha_pedido").alias("dias_hasta_fin_2024"),
   )
   .show(5))
```

```text
+------------+----+---+----------+--------+----------+----------+-------------------+
|fecha_pedido|anio|mes|dia_semana|anio_mes|inicio_mes|     vence|dias_hasta_fin_2024|
+------------+----+---+----------+--------+----------+----------+-------------------+
|  2022-01-01|2022|  1|         7| 2022-01|2022-01-01|2022-01-31|               1095|
```

| Necesitas | Función |
|---|---|
| Año, mes, día, hora | `F.year`, `F.month`, `F.dayofmonth`, `F.hour` |
| Día de la semana | `F.dayofweek` (1 = domingo) |
| Fecha → texto con formato | `F.date_format(c, "yyyy-MM")` |
| Inicio del mes / año | `F.trunc(c, "month")`, `F.date_trunc("month", c)` |
| Sumar días / meses | `F.date_add(c, n)`, `F.add_months(c, n)` |
| Diferencia en días / meses | `F.datediff(fin, inicio)`, `F.months_between(fin, inicio)` |
| Texto → fecha | `F.to_date(c, "dd/MM/yyyy")`, `F.to_timestamp(c)` |
| Último día del mes | `F.last_day(c)` |
| Hoy | `F.current_date()` (¡cuidado en pipelines: mejor un parámetro!) |

:::cuidado Los formatos de fecha de Spark
Spark usa los patrones de Java, que **no** son los de Python ni los de SQLite: `yyyy` (año), `MM` (mes, **mayúscula**), `dd` (día), `HH` (hora), `mm` (minutos, **minúscula**). Confundir `MM` con `mm` es un error clásico: `"yyyy-mm-dd"` pone los **minutos** donde iba el mes. Si `to_date` no puede interpretar un texto, devuelve `null`: después de convertir, cuenta los nulos.
:::

## Condiciones: when / otherwise

`F.when` es el `CASE WHEN` de PySpark. Se encadenan varios `.when` y se cierra con `.otherwise`:

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

```text
+---------+-----+
|     gama|count|
+---------+-----+
|  premium|   84|
|     lujo|   32|
|económico|   56|
|    medio|  128|
+---------+-----+
```

Funciona igual que en SQL: **gana la primera condición verdadera**, y sin `.otherwise` lo que no coincide queda `null`. Las condiciones se combinan con `&` y `|`, con paréntesis: `F.when((F.col("pais") == "Chile") & (F.col("total") > 1000), "VIP Chile")`.

## Nulos

```python
from pyspark.sql import functions as F

c = spark.table("clientes")
print(c.filter(F.col("email").isNull()).count())          # cuántos sin email
print(c.filter(F.col("telefono").isNotNull()).count())    # cuántos con teléfono
c.select(F.coalesce("email", "telefono", F.lit("sin contacto")).alias("contacto")).show(5)
c.fillna({"telefono": "desconocido"}).select("telefono").show(5)   # reemplazar nulos por columna
print(c.na.drop(subset=["email"]).count())                # descartar filas sin email
```

| Necesitas | PySpark |
|---|---|
| ¿Es nulo? | `F.col("x").isNull()` / `.isNotNull()` |
| Primer valor no nulo | `F.coalesce("a", "b", F.lit("defecto"))` |
| Reemplazar nulos | `df.fillna({"col": valor})` o `df.na.fill(…)` |
| Descartar filas con nulos | `df.na.drop(subset=["col"])` (`how="all"` para descartar solo si todas son nulas) |
| Contar nulos de cada columna | `df.select([F.sum(F.col(c).isNull().cast("int")).alias(c) for c in df.columns])` |

:::cuidado NULL en comparaciones
Igual que en SQL: `F.col("email") == None` **no funciona** (siempre da nulo). Usa `.isNull()` / `.isNotNull()`. Y `F.col("x") != "a"` **excluye** las filas donde `x` es nulo. Si necesitas una igualdad que trate los nulos como iguales, existe `F.col("a").eqNullSafe(F.col("b"))` (el operador `<=>` de Spark SQL).
:::

La última fila de la tabla (contar nulos de todas las columnas en una pasada) es un clásico de **perfilado de datos**: la primera cosa que haces con una tabla nueva para saber qué tan completa está.

## Resumen

- Usa las funciones de `F` (se ejecutan dentro del motor); evita Python fila por fila.
- Texto: `trim`, `lower`/`upper`, `initcap`, `concat_ws`, `split`, `regexp_replace`.
- Fechas: `year`, `month`, `date_format` (patrones Java: `yyyy-MM-dd`), `trunc`, `date_add`, `datediff`, `to_date`.
- `F.when(…).when(…).otherwise(…)` = `CASE WHEN`.
- Nulos: `isNull`, `coalesce`, `fillna`, `na.drop`; nunca `== None`.

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
