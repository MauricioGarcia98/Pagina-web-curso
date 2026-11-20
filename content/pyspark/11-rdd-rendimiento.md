---
titulo: RDDs y rendimiento en la práctica
nivel: Experto
duracion: 30
resumen: La API de bajo nivel, explain(), particiones, caché, broadcast y antipatrones en PySpark.
objetivos: Reconocer cuándo aparece la API de RDD | Leer un plan de ejecución con explain() | Evitar los antipatrones más comunes de PySpark
autoevaluacion: ¿Qué buscas en un explain() para saber si hay shuffle? | ¿Por qué collect() sobre una tabla grande es un antipatrón?
---

:::analogia En palabras simples
Los DataFrames son como manejar un auto automático: tú dices a dónde ir y el auto elige los cambios. Los **RDD** son el auto manual: más control, pero más trabajo y más fácil equivocarse. En esta lección ves cómo funciona el motor por dentro (particiones, caché, `explain`) para entender por qué algo es lento.
:::

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

```recorrido
titulo: Leer un plan físico de abajo hacia arriba
estacion scan: Scan | icono=base
estacion bcast: Broadcast | icono=red
estacion join: Join | icono=capas
estacion exch: Exchange | icono=alerta
estacion agg: Agregación | icono=check
paso scan: Abajo de todo: leer
El plan de la consulta de arriba, **simplificado** (el real tiene más detalle y números de identificación). La última línea es lo primero que ocurre: leer `detalle_pedidos`.
>>> texto
HashAggregate(keys=[marca], functions=[sum(cantidad)])
+- Exchange hashpartitioning(marca, 200)
   +- HashAggregate(keys=[marca], functions=[partial_sum(cantidad)])
      +- BroadcastHashJoin [producto_id], [producto_id]
         :- Scan detalle_pedidos [producto_id, cantidad]   ◀ empieza aquí
         +- BroadcastExchange
            +- Scan productos [producto_id, marca]
paso bcast: BroadcastExchange: copiar la tabla chica
`F.broadcast(productos)` pidió mandar **una copia entera** de `productos` (es chica) a cada máquina. Así nadie tiene que mover las 25.524 líneas de detalle.
>>> texto
BroadcastExchange
+- Scan productos [producto_id, marca]
paso join: BroadcastHashJoin
Cada máquina une sus líneas de detalle con su copia local de productos. **No hay shuffle** para el join: es la estrategia más rápida cuando un lado es chico.
>>> texto
BroadcastHashJoin [producto_id], [producto_id]
paso exch: Exchange: aquí hay un shuffle
Primero cada máquina suma su parte (`partial_sum`). Después, `Exchange hashpartitioning(marca)` **mueve filas por la red** para que cada marca quede en una sola máquina. Es la parte cara.
>>> texto
+- Exchange hashpartitioning(marca, 200)
   +- HashAggregate(... partial_sum(cantidad))
paso agg: Arriba: el resultado
El `HashAggregate` final suma los parciales de cada marca. Regla práctica: cuenta los `Exchange`; cada uno es un shuffle.
>>> tabla
marca,u
Apple,2867
Adidas,2741
Shimano,2324
Puma,2259
Ikea,2244
```

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

:::errores
- **Leer el plan de arriba hacia abajo.** Se lee desde abajo: primero la lectura, al final el resultado.
- **RDDs para operaciones que un DataFrame hace mejor.** Pierdes el optimizador.
- **`cache()` en todo.** Ocupa memoria; úsalo solo en lo que se reutiliza.
:::

:::practica pyspark Leer el plan: broadcast, shuffle y sort-merge
1. Ejecuta y lee el plan de abajo hacia arriba: `FileScan` (lee solo las columnas que usas), `BroadcastExchange` y `BroadcastHashJoin`. Spark eligió broadcast solo, porque `productos` pesa menos que `spark.sql.autoBroadcastJoinThreshold` (10 MB).
2. Descomenta la línea del `conf.set(... -1)` y vuelve a ejecutar: ahora el plan es `SortMergeJoin`, con un `Exchange hashpartitioning` (shuffle) y un `Sort` en cada lado. Ese shuffle es lo que cuesta caro con datos grandes.
3. Con el broadcast automático desactivado, envuelve `prod` en `F.broadcast(prod)`: el hint vuelve a dar `BroadcastHashJoin`.
4. Agrega un `groupBy("marca").count()` al final y busca el par `HashAggregate` parcial → `Exchange` → `HashAggregate` final.

```python norun
from pyspark.sql import functions as F

det = spark.table("detalle_pedidos")
prod = spark.table("productos")
# spark.conf.set("spark.sql.autoBroadcastJoinThreshold", -1)   # desactiva el broadcast automático

j = det.join(prod, "producto_id").select("pedido_id", "marca", "cantidad")
j.explain()

# un RDD: contar palabras de los nombres de producto
palabras = (prod.select("nombre").rdd
    .flatMap(lambda r: r[0].lower().split())
    .map(lambda w: (w, 1))
    .reduceByKey(lambda a, b: a + b))
print(sorted(palabras.collect(), key=lambda x: -x[1])[:5])
```

Reto: ejecuta `j.explain(True)` y compara el plan lógico analizado con el optimizado: ¿qué columnas dejó de leer Catalyst?

Documentación oficial: [ajuste de rendimiento (estrategias de join)](https://spark.apache.org/docs/latest/sql-performance-tuning.html) · [DataFrame.explain](https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.explain.html)
:::

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
