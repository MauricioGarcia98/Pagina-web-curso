---
titulo: RDDs y rendimiento en la práctica
nivel: Experto
duracion: 30
resumen: La API de bajo nivel, explain(), particiones, caché, broadcast y antipatrones en PySpark.
---

## RDDs: la base de todo

Un **RDD** (*Resilient Distributed Dataset*) es la abstracción original de Spark: una colección distribuida de objetos de Python, sin esquema. Hoy casi no se usa directamente, pero aparece en entrevistas y en código antiguo.

```python
sc = spark.sparkContext
numeros = sc.parallelize(range(1, 11), 4)
print(numeros.getNumPartitions())
print(numeros.map(lambda x: x * x).filter(lambda x: x % 2 == 0).collect())
print(numeros.reduce(lambda a, b: a + b))

# El clásico "word count"
lineas = sc.parallelize(["spark es rápido", "spark es distribuido", "python y spark"])
conteo = (lineas.flatMap(lambda l: l.split())
                .map(lambda p: (p, 1))
                .reduceByKey(lambda a, b: a + b)
                .sortBy(lambda kv: -kv[1]))
print(conteo.collect())
```

:::entrevista reduceByKey vs groupByKey
`reduceByKey` combina valores **dentro de cada partición antes** del shuffle (como un “pre-agregado”), así que mueve muchos menos datos que `groupByKey`, que envía todos los valores por la red. Con DataFrames, `groupBy().agg()` ya hace esta optimización automáticamente.
:::

## Leer el plan con explain()

```python
from pyspark.sql import functions as F

q = (spark.table("detalle_pedidos")
       .join(F.broadcast(spark.table("productos")), "producto_id")
       .groupBy("marca").agg(F.sum("cantidad").alias("u")))
q.explain()
```

En Spark real, en el plan físico busca:

- `Exchange hashpartitioning(...)` → un **shuffle**.
- `BroadcastHashJoin` vs `SortMergeJoin` → qué estrategia de join se eligió.
- `PushedFilters: [...]` en el `Scan` → filtros empujados a la lectura.
- `PartitionFilters: [...]` → partition pruning.

## Antipatrones de PySpark

```python norun
# ❌ Iterar filas en el driver
for fila in df.collect():
    procesar(fila)

# ❌ Llamar a count() o show() en cada paso "para ver"
# ❌ Bucles de Python que hacen withColumn 200 veces (planes enormes): usa select con una lista de columnas
# ❌ UDFs de Python para cosas que hace F.*
# ❌ toPandas() de una tabla grande
# ❌ Joins sin pensar en la cardinalidad (explosión de filas)
# ❌ Escribir miles de archivos pequeños (particionar por una columna de alta cardinalidad)
```

:::ejercicio pyspark variable=conteo
Con RDDs, haz un **word count** de `lineas` (palabras separadas por espacio) y guarda en `conteo` una **lista de tuplas** `(palabra, cantidad)` ordenada por cantidad descendente y, si empatan, por palabra. Usa `flatMap`, `map`, `reduceByKey` y `collect`.
```python inicial
sc = spark.sparkContext
lineas = sc.parallelize(["el dato es el rey", "el rey dato", "datos y mas datos"])
```
```python solucion
sc = spark.sparkContext
lineas = sc.parallelize(["el dato es el rey", "el rey dato", "datos y mas datos"])
conteo = (lineas.flatMap(lambda l: l.split())
                .map(lambda p: (p, 1))
                .reduceByKey(lambda a, b: a + b)
                .sortBy(lambda kv: (-kv[1], kv[0]))
                .collect())
```
:::

:::ejercicio quiz
Necesitas aplicar la misma transformación a 150 columnas. ¿Qué es mejor?

- [ ] Un bucle `for` con 150 `withColumn`
- [x] Un solo `select` con una lista de 150 expresiones
- [ ] 150 DataFrames distintos unidos con join
- [ ] Una UDF de Python
```explicacion
Cada `withColumn` agrega una capa al plan lógico; con cientos, el análisis del plan se vuelve muy lento. Un `select([...])` con todas las expresiones genera un plan plano.
```
:::

:::ejercicio quiz
¿Cuál es la diferencia clave entre `reduceByKey` y `groupByKey`?

- [ ] Ninguna
- [x] `reduceByKey` combina parcialmente en cada partición antes del shuffle, moviendo menos datos
- [ ] `groupByKey` es más rápido siempre
- [ ] `reduceByKey` no hace shuffle
:::
