---
titulo: RDDs y rendimiento en la práctica
nivel: Experto
duracion: 30
resumen: La API de bajo nivel, explain(), particiones, caché, broadcast y antipatrones en PySpark.
---

## RDDs: la base de todo

Un **RDD** (*Resilient Distributed Dataset*, "conjunto de datos distribuido y resiliente") es la abstracción original de Spark: una colección de objetos de Python repartida entre las máquinas del cluster, **sin esquema** (Spark no sabe qué hay adentro de cada objeto).

| | RDD | DataFrame |
|---|---|---|
| Qué guarda | Objetos cualesquiera (tuplas, diccionarios…) | Filas con columnas con nombre y tipo |
| Cómo se opera | Funciones de Python (`map`, `filter`, `reduceByKey`) | Expresiones de columnas (`select`, `groupBy`, `F.*`) |
| Optimización | Ninguna: Spark ejecuta tus funciones tal cual | El optimizador **Catalyst** reordena y mejora el plan |
| Velocidad en PySpark | Lenta (los datos van y vienen entre Java y Python) | Rápida (todo corre dentro del motor) |

Hoy casi no se usan directamente: los DataFrames son más rápidos y más claros. Pero conviene conocerlos porque aparecen en **entrevistas**, en código antiguo, y porque explican cómo funciona Spark por dentro (un DataFrame, al final, se ejecuta como RDDs).

Las tres operaciones clásicas:

- `map(f)`: aplica `f` a cada elemento (un elemento entra, uno sale).
- `flatMap(f)`: como `map`, pero si `f` devuelve una lista, la "aplana" (un elemento entra, varios salen). Es el `explode` de los RDD.
- `reduceByKey(f)`: para pares `(clave, valor)`, combina los valores de cada clave con `f`. Es el `groupBy + sum` de los RDD.

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

`explain()` muestra **cómo** va a ejecutar Spark tu código: el plan físico. Es la herramienta principal para entender por qué algo es lento. Se lee **de abajo hacia arriba** (primero se leen los datos, al final se produce el resultado).

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
