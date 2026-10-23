---
titulo: Arrays, structs, maps y JSON
nivel: Avanzado
duracion: 30
resumen: Tipos complejos, explode, collect_list, structs anidados, JSON y UDFs.
---

Los datos reales (APIs, eventos, logs) vienen **anidados**. Spark tiene tipos complejos para manejarlos sin aplanar todo de entrada.

| Tipo | Ejemplo | Acceso |
|---|---|---|
| `array<T>` | `["web", "app"]` | `F.col("a")[0]`, `F.size`, `F.explode` |
| `struct<...>` | `{"ciudad": "Lima", "cp": "15001"}` | `F.col("dir.ciudad")`, `"dir.*"` |
| `map<K,V>` | `{"color": "rojo"}` | `F.col("m")["color"]` |

## Arrays y explode

`explode` convierte **cada elemento** de un array en **una fila**:

```python
from pyspark.sql import functions as F

df = spark.createDataFrame(
    [(1, ["sql", "python"]), (2, ["spark"]), (3, [])],
    "alumno_id INT, cursos ARRAY<STRING>")
df.select("alumno_id", F.size("cursos").alias("n"), F.array_contains("cursos", "sql").alias("sabe_sql")).show()
df.select("alumno_id", F.explode("cursos").alias("curso")).show()          # el alumno 3 desaparece
df.select("alumno_id", F.explode_outer("cursos").alias("curso")).show()    # conserva al 3 con NULL
```

Lo contrario de `explode` es agrupar con `collect_list` / `collect_set`.

## split + explode: de texto a filas

```python
from pyspark.sql import functions as F

tags = spark.createDataFrame([(1, "oferta,verano,remeras"), (2, "invierno")], ["producto_id", "tags"])
tags.withColumn("tag", F.explode(F.split("tags", ","))).select("producto_id", "tag").show()
```

## Structs

```python
from pyspark.sql import functions as F

clientes = spark.table("clientes").select(
    "cliente_id",
    F.struct("ciudad", "pais").alias("ubicacion"),
)
clientes.printSchema()
clientes.select("cliente_id", "ubicacion.pais").show(3)
```

## JSON

```python
from pyspark.sql import functions as F

eventos = spark.createDataFrame([
    (1, '{"tipo": "compra", "monto": 120.5, "items": 3}'),
    (2, '{"tipo": "vista", "pagina": "inicio"}'),
], ["id", "payload"])

(eventos
   .select("id",
           F.get_json_object("payload", "$.tipo").alias("tipo"),
           F.get_json_object("payload", "$.monto").cast("double").alias("monto"))
   .show())
```

En Spark real, `F.from_json(col, esquema)` convierte el texto en un struct con tipos, y `F.to_json(struct)` hace lo inverso. Para leer archivos JSON anidados directamente: `spark.read.json(ruta)`.

## UDFs: cuando no hay función nativa

```python
from pyspark.sql import functions as F, types as T

@F.udf(returnType=T.StringType())
def categoria_talla(talla):
    if talla is None:
        return None
    return "chica" if talla <= 38 else "grande"

spark.createDataFrame([(36,), (42,), (None,)], ["talla"]).withColumn("cat", categoria_talla("talla")).show()
```

Recuerda: las UDFs de Python son lentas. Primero busca una función nativa (`F.when` resolvía este caso).

## Ejercicios

:::ejercicio pyspark
Para cada cliente con pedidos, junta en un array los **canales distintos** por los que compró (`canales`, con `collect_set`) y cuenta cuántos son (`n_canales`, con `F.size`). Devuelve solo `cliente_id` y `n_canales` de quienes usaron **4 canales**.
```python solucion
from pyspark.sql import functions as F

resultado = (spark.table("pedidos")
               .groupBy("cliente_id")
               .agg(F.collect_set("canal").alias("canales"))
               .withColumn("n_canales", F.size("canales"))
               .filter(F.col("n_canales") == 4)
               .select("cliente_id", "n_canales"))
```
:::

:::ejercicio pyspark
A partir del DataFrame `posts` (que ya está en el código inicial), separa los hashtags en filas y cuenta cuántas veces aparece cada uno. Columnas: `hashtag`, `n`.
```python inicial
from pyspark.sql import functions as F

posts = spark.createDataFrame([
    (1, "datos,sql,spark"),
    (2, "sql,python"),
    (3, "spark,databricks,sql"),
], ["post_id", "hashtags"])
```
```python solucion
from pyspark.sql import functions as F

posts = spark.createDataFrame([
    (1, "datos,sql,spark"),
    (2, "sql,python"),
    (3, "spark,databricks,sql"),
], ["post_id", "hashtags"])
resultado = (posts
               .select(F.explode(F.split("hashtags", ",")).alias("hashtag"))
               .groupBy("hashtag")
               .agg(F.count("*").alias("n")))
```
:::

:::ejercicio pyspark
Del DataFrame `eventos` con JSON en texto, extrae `tipo` y `monto` (como double) y suma el monto de los eventos de tipo `compra` por `usuario`. Columnas: `usuario`, `total`.
```python inicial
from pyspark.sql import functions as F

eventos = spark.createDataFrame([
    ("ana", '{"tipo": "compra", "monto": 100.0}'),
    ("ana", '{"tipo": "vista"}'),
    ("luis", '{"tipo": "compra", "monto": 40.5}'),
    ("ana", '{"tipo": "compra", "monto": 20.0}'),
], ["usuario", "payload"])
```
```python solucion
from pyspark.sql import functions as F

eventos = spark.createDataFrame([
    ("ana", '{"tipo": "compra", "monto": 100.0}'),
    ("ana", '{"tipo": "vista"}'),
    ("luis", '{"tipo": "compra", "monto": 40.5}'),
    ("ana", '{"tipo": "compra", "monto": 20.0}'),
], ["usuario", "payload"])
resultado = (eventos
               .withColumn("tipo", F.get_json_object("payload", "$.tipo"))
               .withColumn("monto", F.get_json_object("payload", "$.monto").cast("double"))
               .filter(F.col("tipo") == "compra")
               .groupBy("usuario")
               .agg(F.sum("monto").alias("total")))
```
:::
