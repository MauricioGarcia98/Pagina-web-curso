# examen: pyspark

## withColumn
leccion: pyspark-select-filter
¿Qué hace `df.withColumn("total", F.col("precio") * F.col("cantidad"))`?
- [ ] Modifica `df` en el lugar, agregando la columna `total` a sus datos.
- [x] Devuelve un DataFrame nuevo con la columna `total`.
- [ ] Calcula la columna en ese momento y muestra las primeras 20 filas.
- [ ] Da error porque hay que llamar a `.show()` para que se cree la columna.
porque: Los DataFrames de Spark son **inmutables**: cada transformación devuelve uno nuevo. Hay que asignarlo: `df = df.withColumn(...)`. Y es perezoso: no calcula nada hasta una acción.

## Filtros con varias condiciones
leccion: pyspark-select-filter
¿Cuál es la forma correcta de filtrar pedidos de Lima con total mayor a 100?
- [ ] `df.filter(F.col("ciudad") == "Lima" and F.col("total") > 100)`
- [x] `df.filter((F.col("ciudad") == "Lima") & (F.col("total") > 100))`
- [ ] `df.filter(F.col("ciudad") == "Lima" & F.col("total") > 100)`
- [ ] `df.filter((F.col("ciudad") == "Lima") and (F.col("total") > 100))`
porque: En PySpark se combinan condiciones con `&`, `|` y `~` (no con `and`, `or`, `not`), y cada condición va **entre paréntesis** porque `&` tiene más prioridad que `==` y `>`.

## Nulos
leccion: pyspark-funciones
Quieres reemplazar los descuentos nulos por 0 en una columna. ¿Qué usas?
- [ ] `F.when(F.col("descuento") == None, 0).otherwise(F.col("descuento"))`
- [x] `F.coalesce(F.col("descuento"), F.lit(0))`
- [ ] `F.col("descuento").replace(None, 0).cast("int")`
- [ ] `F.isnull(F.col("descuento"), F.lit(0))`
porque: `coalesce` devuelve el primer valor no nulo. Comparar con `== None` no funciona (da NULL, igual que en SQL): para eso existen `isNull()` e `isNotNull()`. También sirve `df.fillna({"descuento": 0})`.

## Agregaciones
leccion: pyspark-agregaciones
¿Qué devuelve `df.groupBy("ciudad").agg(F.countDistinct("cliente_id").alias("clientes"))`?
- [ ] La cantidad de pedidos de cada ciudad, contando una vez cada fila.
- [x] La cantidad de clientes distintos por ciudad.
- [ ] La lista de identificadores de clientes de cada ciudad, sin repetir.
- [ ] La cantidad total de ciudades distintas que tienen al menos un cliente.
porque: `countDistinct` cuenta valores únicos dentro de cada grupo. Para la lista se usaría `F.collect_set`.

## Joins
leccion: pyspark-joins
¿Qué tipo de join devuelve solo los clientes **sin** pedidos, con las columnas de `clientes`?
- [ ] `clientes.join(pedidos, "cliente_id", "inner")`
- [ ] `clientes.join(pedidos, "cliente_id", "left_semi")`
- [x] `clientes.join(pedidos, "cliente_id", "left_anti")`
- [ ] `clientes.join(pedidos, "cliente_id", "left_outer")`
porque: `left_anti` deja las filas de la izquierda que **no** tienen coincidencia, sin traer columnas de la derecha. `left_semi` hace lo contrario: las que sí tienen coincidencia.

## Columnas ambiguas
leccion: pyspark-joins
Haces `pedidos.join(clientes, pedidos.cliente_id == clientes.cliente_id)` y después `select("cliente_id")` falla por ambigüedad. ¿Cómo lo evitas más simplemente?
- [ ] Renombrando todas las columnas de las dos tablas con un prefijo antes del join.
- [x] Uniendo por nombre: `pedidos.join(clientes, "cliente_id")`.
- [ ] Usando `crossJoin` y filtrando después las filas con el mismo `cliente_id`.
- [ ] Haciendo `collect()` de ambas tablas y uniéndolas con un diccionario.
porque: Con una expresión, el resultado tiene dos columnas `cliente_id`. Pasando el **nombre** (o una lista de nombres), Spark las une y deja una.

## Escritura
leccion: pyspark-leer-escribir
¿Qué hace `df.write.mode("overwrite").partitionBy("fecha").parquet(ruta)` con la configuración por defecto?
- [ ] Reemplaza solo las fechas que están en `df` y deja intactas las demás.
- [x] Reemplaza todo el contenido de la ruta, también las fechas que no están en `df`.
- [ ] Agrega las filas al final de cada partición sin borrar nada.
- [ ] Falla si la ruta ya existe, para evitar perder datos.
porque: Por defecto, `overwrite` es **estático**: borra todo. Para reemplazar solo las particiones presentes se configura `spark.sql.sources.partitionOverwriteMode=dynamic` (o se usa Delta con `replaceWhere` o MERGE). Confundirlo puede borrar años de historia.

## Ventanas
leccion: pyspark-ventanas
¿Qué calcula este código?
```python norun
w = Window.partitionBy("cliente_id").orderBy("fecha")
df.withColumn("n", F.row_number().over(w)).filter("n = 1")
```
- [ ] El último pedido de cada cliente.
- [x] El primer pedido de cada cliente.
- [ ] El pedido más caro de cada cliente.
- [ ] El primer pedido de toda la tabla.
porque: Dentro de cada cliente, las filas se ordenan por fecha ascendente y `row_number` = 1 es la más antigua. Para el último, `orderBy(F.col("fecha").desc())`.

## Datos anidados
leccion: pyspark-complejos
Cada fila tiene `pedido_id` y una columna `items` que es un array de structs. ¿Cómo obtienes una fila por ítem?
- [ ] `df.select("pedido_id", "items.*")`
- [x] `df.select("pedido_id", F.explode("items").alias("item"))`
- [ ] `df.groupBy("pedido_id").agg(F.collect_list("items"))`
- [ ] `df.select("pedido_id", F.flatten("items"))`
porque: `explode` genera una fila por elemento del array, y `item.*` expande los campos del struct a columnas. Si hay pedidos con array vacío o nulo que quieres conservar, usa `explode_outer`.

## Calidad
leccion: pyspark-calidad
En un pipeline, encuentras filas con `total` negativo. ¿Qué práctica es la más recomendable?
- [ ] Borrarlas en silencio, porque no aportan nada a los reportes.
- [ ] Detener el pipeline hasta que alguien corrija el sistema de origen.
- [x] Separarlas en cuarentena con el motivo y seguir con las válidas.
- [ ] Convertirlas a positivas con `abs()`, porque seguramente el signo está mal.
porque: Las filas malas se **aíslan y se registran**: no contaminan los datos buenos, quedan disponibles para investigar y se puede alertar si la proporción es anormal. Borrar o "arreglar" sin avisar esconde el problema.

## UDF
leccion: pyspark-rdd-rendimiento
¿Por qué conviene evitar las UDF de Python cuando existe una función integrada?
- [ ] Porque las UDF no pueden recibir columnas, solo valores literales.
- [x] Porque son mucho más lentas y Catalyst no puede optimizarlas.
- [ ] Porque las UDF solo funcionan en modo local y fallan en un clúster.
- [ ] Porque las funciones integradas aceptan tipos de datos que las UDF no aceptan.
porque: Las funciones de `pyspark.sql.functions` corren dentro del motor y se optimizan. Si necesitas lógica propia, una pandas UDF (vectorizada) es mucho más rápida que una UDF fila a fila.
