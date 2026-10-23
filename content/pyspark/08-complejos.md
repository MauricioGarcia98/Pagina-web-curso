---
titulo: Arrays, structs, maps y JSON
nivel: Avanzado
duracion: 40
resumen: Tipos complejos, explode, collect_list, structs anidados, JSON y UDFs.
---

## Datos que no son "planos"

Hasta ahora cada celda tenía **un** valor: un número, un texto, una fecha. Pero los datos reales muchas veces vienen **anidados**:

- Un pedido de una API trae **una lista** de productos.
- Un evento de una app trae un objeto `dispositivo` con `modelo`, `sistema` y `version`.
- Un producto tiene **etiquetas** (`["oferta", "verano"]`) o atributos variables (`{"color": "rojo", "talla": "M"}`).

En una base relacional clásica habría que repartir eso en varias tablas antes de cargarlo. Spark (igual que BigQuery, Snowflake y Databricks) tiene **tipos complejos** que guardan estructuras anidadas dentro de una columna, y funciones para trabajar con ellas.

| Tipo | Qué guarda | Ejemplo | Cómo se accede |
|---|---|---|---|
| `array<T>` | Una **lista** de valores del mismo tipo | `["web", "app"]` | `F.col("a")[0]`, `F.size`, `F.explode` |
| `struct<…>` | Un **registro** con campos con nombre (como un diccionario fijo) | `{"ciudad": "Lima", "cp": "15001"}` | `F.col("dir.ciudad")`, `"dir.*"` |
| `map<K,V>` | Pares clave → valor **variables** | `{"color": "rojo"}` | `F.col("m")["color"]` |

:::analogia La caja con compartimentos
Una celda normal es un casillero con un objeto. Un **array** es un casillero con una fila de cajitas numeradas adentro. Un **struct** es un casillero con cajitas etiquetadas ("ciudad", "país"). Spark te deja guardar esas cajas tal cual y abrirlas cuando las necesites.
:::

## Arrays

```python
from pyspark.sql import functions as F

df = spark.createDataFrame(
    [(1, ["sql", "python"]), (2, ["spark"]), (3, [])],
    "alumno_id INT, cursos ARRAY<STRING>")
df.select("alumno_id",
          F.size("cursos").alias("n"),                                # cuántos elementos
          F.array_contains("cursos", "sql").alias("sabe_sql"),        # ¿contiene…?
          F.col("cursos")[0].alias("primero")).show()                 # el primero (índice 0)
```

Otras funciones útiles de arrays: `F.array_distinct` (sin repetidos), `F.array_sort`, `F.array_join(c, ", ")` (unir en un texto), `F.array_union` / `F.array_intersect`, y `F.filter` / `F.transform` para filtrar o transformar cada elemento sin desarmar el array.

### explode: un elemento, una fila

`explode` convierte **cada elemento** de un array en **una fila** (las demás columnas se repiten):

```python
from pyspark.sql import functions as F

df = spark.createDataFrame(
    [(1, ["sql", "python"]), (2, ["spark"]), (3, [])],
    "alumno_id INT, cursos ARRAY<STRING>")
df.select("alumno_id", F.explode("cursos").alias("curso")).show()          # el alumno 3 desaparece
df.select("alumno_id", F.explode_outer("cursos").alias("curso")).show()    # conserva al 3 con NULL
```

```text
explode                     explode_outer
+---------+------+          +---------+------+
|alumno_id| curso|          |alumno_id| curso|
+---------+------+          +---------+------+
|        1|   sql|          |        1|   sql|
|        1|python|          |        1|python|
|        2| spark|          |        2| spark|
+---------+------+          |        3|  NULL|
                            +---------+------+
```

Es exactamente lo que en SQL estándar hace `UNNEST` (BigQuery, Trino) o `LATERAL VIEW explode` (Hive). `explode` se comporta como un `INNER JOIN` (los arrays vacíos o nulos desaparecen) y `explode_outer` como un `LEFT JOIN`. `F.posexplode` además devuelve la posición de cada elemento.

Lo contrario de `explode` es agrupar con `collect_list` / `collect_set`, que viste en agregaciones.

### split + explode: de un texto con separadores a filas

Es muy común recibir listas metidas en un texto (`"oferta,verano,remeras"`). `split` lo convierte en array y `explode` en filas:

```python
from pyspark.sql import functions as F

tags = spark.createDataFrame([(1, "oferta,verano,remeras"), (2, "invierno")], ["producto_id", "tags"])
tags.withColumn("tag", F.explode(F.split("tags", ","))).select("producto_id", "tag").show()
```

## Structs: registros dentro de una columna

```python
from pyspark.sql import functions as F

clientes = spark.table("clientes").select(
    "cliente_id",
    F.struct("ciudad", "pais").alias("ubicacion"),     # agrupar dos columnas en un struct
)
clientes.printSchema()
clientes.select("cliente_id", "ubicacion.pais").show(3)   # acceder a un campo con punto
```

```text
root
 |-- cliente_id: integer
 |-- ubicacion: struct
 |    |-- ciudad: string
 |    |-- pais: string
```

- Se accede a un campo con **punto**: `"ubicacion.pais"` o `F.col("ubicacion.pais")` o `F.col("ubicacion")["pais"]`.
- `select("ubicacion.*")` **aplana** el struct: una columna por campo. Es la forma más rápida de "desarmar" un JSON anidado.

## JSON

Cuando el JSON llega como **texto** dentro de una columna (algo muy común en tablas de eventos o en mensajes de Kafka / Pub/Sub / Kinesis), tienes dos opciones:

```python
from pyspark.sql import functions as F

eventos = spark.createDataFrame([
    (1, '{"tipo": "compra", "monto": 120.5, "items": 3}'),
    (2, '{"tipo": "vista", "pagina": "inicio"}'),
], ["id", "payload"])

(eventos
   .select("id",
           F.get_json_object("payload", "$.tipo").alias("tipo"),                 # extrae un campo (como texto)
           F.get_json_object("payload", "$.monto").cast("double").alias("monto"))
   .show())
```

| Opción | Cómo | Cuándo |
|---|---|---|
| `F.get_json_object(col, "$.campo")` | Extrae un campo con una ruta JSONPath; devuelve texto | Necesitas uno o dos campos |
| `F.from_json(col, esquema)` | Convierte todo el texto en un **struct** con tipos | Necesitas muchos campos: parsea una sola vez |
| `F.to_json(struct)` | Lo inverso: struct → texto JSON | Enviar datos a una API o a un mensaje |
| `spark.read.json(ruta)` | Lee archivos JSON e infiere la estructura anidada | Archivos completos |

Si un campo no existe (como `monto` en el evento 2), el resultado es `null`, no un error: los eventos de tipos distintos conviven en la misma tabla.

## UDFs: cuando no existe una función nativa

Una **UDF** (*user-defined function*) es una función de Python que Spark aplica a cada fila. Sirve para lógica que no existe en `F`:

```python
from pyspark.sql import functions as F, types as T

@F.udf(returnType=T.StringType())
def categoria_talla(talla):
    if talla is None:
        return None
    return "chica" if talla <= 38 else "grande"

spark.createDataFrame([(36,), (42,), (None,)], ["talla"]).withColumn("cat", categoria_talla("talla")).show()
```

- El decorador `@F.udf` convierte una función normal en una que se puede usar con columnas.
- Hay que declarar el **tipo de retorno** (`returnType`).
- Maneja los `None` explícitamente: Spark le pasará nulos.

:::cuidado Las UDFs de Python son lentas
Para ejecutar una UDF, Spark tiene que **sacar** cada valor del motor (en la JVM, Java), mandarlo a un proceso de Python, ejecutar tu función y traer el resultado de vuelta. Con millones de filas eso puede ser **10 a 100 veces** más lento que una función nativa, y además el optimizador no puede "ver" adentro de la UDF. Antes de escribir una, busca en `F` (este ejemplo se resolvía con `F.when`). Si de verdad la necesitas, las **pandas UDF** (`@F.pandas_udf`) procesan lotes enteros con Arrow y son mucho más rápidas.
:::

## Resumen

- Tipos complejos: `array` (listas), `struct` (registros), `map` (clave → valor).
- `explode` convierte elementos en filas (`explode_outer` conserva vacíos); `split` + `explode` para textos con separadores.
- Structs: acceso con punto (`"dir.ciudad"`), aplanar con `"dir.*"`.
- JSON en texto: `get_json_object` para un campo, `from_json` con esquema para muchos.
- UDFs solo cuando no hay función nativa: son lentas; prefiere `F` o pandas UDF.

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
