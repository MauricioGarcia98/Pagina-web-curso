---
titulo: select, filter, withColumn y columnas
nivel: Básico
duracion: 45
resumen: Elegir y renombrar columnas, filtrar filas, crear columnas calculadas y castear tipos.
---

## Las operaciones del día a día

Esta lección cubre lo que harás en el 80 % de tu código PySpark: **elegir columnas**, **filtrar filas** y **calcular columnas nuevas**. Si piensas en SQL, son el `SELECT`, el `WHERE` y las expresiones con `AS`. La diferencia es que en PySpark se escriben como **métodos encadenados** sobre el DataFrame:

| SQL | PySpark |
|---|---|
| `SELECT nombre, precio` | `.select("nombre", "precio")` |
| `precio - costo AS ganancia` | `(F.col("precio") - F.col("costo")).alias("ganancia")` |
| `WHERE precio > 1000` | `.filter(F.col("precio") > 1000)` |
| (agregar una columna calculada a todas las existentes) | `.withColumn("ganancia", …)` |
| `SELECT DISTINCT pais` | `.select("pais").distinct()` |
| `ORDER BY precio DESC LIMIT 5` | `.orderBy(F.col("precio").desc()).limit(5)` |

## F: el módulo de funciones

Casi todo el código PySpark empieza con esta línea:

```python norun
from pyspark.sql import functions as F
```

`pyspark.sql.functions` tiene cientos de funciones (`F.col`, `F.round`, `F.upper`, `F.sum`, `F.when`…). Importarlo como `F` es una convención universal: cuando veas `F.algo` en cualquier proyecto, sabrás de dónde viene.

## Tres formas de referirse a una columna

```python
from pyspark.sql import functions as F

df = spark.table("productos")
df.select("nombre", "precio").show(3)                 # 1) por nombre, como texto
df.select(F.col("nombre"), F.col("precio")).show(3)   # 2) con F.col (la más usada)
df.select(df.nombre, df["precio"]).show(3)            # 3) como atributo del DataFrame
```

- Un **texto** (`"precio"`) alcanza para elegir columnas tal cual.
- `F.col("precio")` crea un objeto **Column**, con el que puedes **operar**: `F.col("precio") * 2`, `F.col("precio") > 100`, `F.col("nombre").alias("producto")`. No puedes hacer `"precio" * 2` (eso repetiría el texto).
- `df.precio` / `df["precio"]` también es una Column, pero ata el código a una variable concreta; útil para desambiguar en joins.

:::tip Regla práctica
Usa texto para seleccionar columnas sin cambios y `F.col("x")` en cuanto necesites calcular, comparar o renombrar.
:::

## select: elegir y calcular columnas

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

```text
+--------------------+-------+------------------+----------+
|              nombre| precio|          ganancia|margen_pct|
+--------------------+-------+------------------+----------+
|Smartphone Apple ...| 484.99|174.57999999999998|      36.0|
|Parlante Xiaomi S...| 425.99|            183.78|      43.1|
|    Notebook Apple X|1044.99|326.71000000000004|      31.3|
+--------------------+-------+------------------+----------+
```

- El resultado tiene **solo** las columnas que pediste, en ese orden (igual que `SELECT`).
- `.alias("ganancia")` es el `AS` de SQL. Sin alias, la columna se llamaría `(precio - costo)`.
- Fíjate en `174.57999999999998`: es el mismo "ruido" de decimales que viste en SQL. `F.round(…, 2)` lo resuelve.
- Los **paréntesis exteriores** `( … )` alrededor de toda la cadena permiten escribir un método por línea. Es el estilo estándar: cada paso de la transformación se lee en su propia línea.

## filter / where: elegir filas

`filter` y `where` son **sinónimos**. La condición puede ser una expresión de columnas o un texto con sintaxis SQL:

```python
from pyspark.sql import functions as F

p = spark.table("productos")
p.filter(F.col("precio") > 1000).show(3)
p.where("marca = 'Apple' AND precio > 1000").show(3)                       # estilo SQL (texto)
p.filter((F.col("marca") == "Sony") & (F.col("stock") < 50)).show(3)       # & = AND
p.filter((F.col("marca") == "Sony") | (F.col("marca") == "Bose")).show(3)  # | = OR
p.filter(~F.col("activo").cast("boolean")).show(3)                          # ~ = NOT
p.filter(F.col("marca").isin("Nike", "Adidas")).show(3)                    # IN
p.filter(F.col("nombre").contains("Pro")).show(3)                          # contiene
p.filter(F.col("nombre").like("Laptop%")).show(3)                          # LIKE
p.filter(F.col("precio").between(100, 200)).show(3)                        # BETWEEN (incluye extremos)
p.filter(F.col("precio").isNotNull()).show(3)                              # IS NOT NULL
```

| SQL | PySpark |
|---|---|
| `=` | `==` |
| `<>` | `!=` |
| `AND` / `OR` / `NOT` | `&` / `\|` / `~` |
| `IN (…)` | `.isin(…)` |
| `LIKE 'x%'` | `.like("x%")` o `.startswith("x")` |
| `IS NULL` / `IS NOT NULL` | `.isNull()` / `.isNotNull()` |
| `BETWEEN a AND b` | `.between(a, b)` |

:::cuidado Los paréntesis son obligatorios
En Python, `&` y `|` tienen **más** prioridad que `==` y `>`. Sin paréntesis, `F.col("a") > 1 & F.col("b") < 5` se interpreta como `F.col("a") > (1 & F.col("b")) < 5` y da un error difícil de entender. Escribe **siempre** cada condición entre paréntesis: `(F.col("a") > 1) & (F.col("b") < 5)`.

Y no uses las palabras `and`, `or`, `not` de Python con columnas: dan `ValueError: Cannot convert column into bool`. Con columnas se usan los símbolos `&`, `|`, `~`.
:::

Los `NULL` se comportan igual que en SQL: `F.col("email") == "x"` es nulo (no verdadero) cuando `email` es nulo, y la fila se descarta. Para incluirlos, pídelo: `(F.col("email") != "x") | F.col("email").isNull()`.

## withColumn: agregar o reemplazar una columna

`select` devuelve **solo** las columnas que nombras. `withColumn` en cambio **conserva todas** y agrega (o reemplaza) **una**:

```python
from pyspark.sql import functions as F

df = (spark.table("detalle_pedidos")
        .withColumn("importe", F.col("cantidad") * F.col("precio_unitario") * (1 - F.col("descuento")))
        .withColumn("importe", F.round("importe", 2))                 # mismo nombre = reemplaza
        .withColumn("tiene_descuento", F.col("descuento") > 0)        # una columna booleana
        .withColumn("moneda", F.lit("USD")))                           # F.lit = un valor constante
df.show(5)
```

- `withColumn("nombre", expresión)`: si `nombre` no existe, la agrega al final; si existe, la **reemplaza**.
- `F.lit(valor)` convierte un valor fijo de Python en una columna (el mismo valor en todas las filas). Hace falta porque `withColumn` espera una Column, no un texto suelto.
- Cada `withColumn` devuelve un DataFrame **nuevo** (los DataFrames son inmutables): por eso se encadenan o se reasigna `df = df.withColumn(...)`.

:::experto Muchos withColumn seguidos
Encadenar 5 o 10 `withColumn` está bien. Con **decenas** (por ejemplo, en un bucle que agrega 200 columnas), el plan de Spark crece mucho y se vuelve lento de analizar. En esos casos, construye todas las columnas en **un solo** `select` o usa `withColumns({…})` (Spark 3.3+).
:::

## Renombrar, borrar y convertir tipos

```python
from pyspark.sql import functions as F

df = (spark.table("clientes")
        .withColumnRenamed("pais", "country")                  # renombrar
        .drop("telefono", "fecha_nacimiento")                  # borrar columnas
        .withColumn("cliente_id", F.col("cliente_id").cast("string")))   # cambiar el tipo
df.printSchema()
```

`.cast("tipo")` convierte una columna: `"int"`, `"double"`, `"string"`, `"date"`, `"timestamp"`, `"decimal(10,2)"`. A diferencia de Python puro, si un valor no se puede convertir (por ejemplo `"abc"` a `int`), Spark devuelve **`null`** en lugar de fallar: después de un `cast` sobre datos crudos, **cuenta los nulos** para detectar problemas.

## distinct, orderBy y limit

```python
from pyspark.sql import functions as F

spark.table("clientes").select("pais").distinct().orderBy("pais").show()      # valores únicos
spark.table("productos").orderBy(F.col("precio").desc(), "nombre").limit(5).show()
print(spark.table("pedidos").dropDuplicates(["cliente_id"]).count())         # una fila por cliente
```

- `distinct()` quita filas idénticas (en todas las columnas).
- `dropDuplicates(["col"])` deja una fila por cada valor de esas columnas (¡cuál de las repetidas queda no está garantizado! Para elegir la más reciente, usarás ventanas).
- `orderBy` acepta textos o columnas con `.desc()` / `.asc()`. En un cluster, ordenar es caro (mueve datos entre máquinas): ordena solo el resultado final o lo que de verdad lo necesite.
- `limit(n)` corta el resultado (es una transformación; `show(n)` es una acción).

## Resumen

- `from pyspark.sql import functions as F`; usa `F.col("x")` para operar con columnas.
- `select` elige y calcula (con `.alias`); `withColumn` agrega o reemplaza una columna conservando las demás.
- `filter`/`where` con `&`, `|`, `~` y **paréntesis en cada condición**; también acepta texto SQL.
- `.isin`, `.like`, `.contains`, `.between`, `.isNull()` cubren los operadores de SQL.
- `withColumnRenamed`, `drop`, `.cast(tipo)` (devuelve `null` si no puede convertir), `distinct`, `orderBy`, `limit`.

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
