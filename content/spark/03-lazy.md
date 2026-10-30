---
titulo: RDD, DataFrame y evaluación perezosa
nivel: Intermedio
duracion: 40
resumen: Las APIs de Spark, transformaciones vs acciones, narrow vs wide y el optimizador Catalyst.
---

Ya sabes que Spark reparte el trabajo en particiones, stages y tasks. Esta lección responde dos preguntas: **con qué API** le das instrucciones a Spark, y **cuándo** las ejecuta. La segunda respuesta sorprende a todos al principio: Spark no hace nada hasta que no le queda más remedio.

## Tres APIs, una evolución

| API | Desde | Qué es | ¿Usarla hoy? |
|---|---|---|---|
| **RDD** | 2011 | Colección distribuida de objetos. Control total, sin optimizador | Solo en casos muy especiales |
| **DataFrame** | 2015 | Tabla distribuida con columnas y tipos (como una tabla SQL), optimizada por Catalyst | **Sí, siempre** |
| **Dataset** | 2016 | DataFrame con tipos de Scala/Java verificados al compilar | Solo en Scala/Java |

¿Por qué ganó el DataFrame? Con un RDD le dices a Spark **cómo** hacer cada paso, con funciones de Python que Spark no puede "leer por dentro":

```python norun
# RDD: Spark solo ve "una función de Python". No sabe qué hace, así que no puede optimizarla.
rdd.filter(lambda p: p["estado"] == "entregado").map(lambda p: (p["canal"], 1)).reduceByKey(lambda a, b: a + b)
```

Con un DataFrame le dices **qué** quieres, con expresiones que Spark entiende:

```python norun
# DataFrame: Spark sabe que es un filtro sobre la columna estado y un conteo por canal.
df.filter(df.estado == "entregado").groupBy("canal").count()
```

Como entiende cada expresión, Spark puede reordenarlas, leer menos datos y generar código rápido. El resultado es el mismo, pero el DataFrame suele ser varias veces más rápido, sobre todo en Python.

En PySpark trabajarás con **DataFrames** y **Spark SQL**, que son dos caras de lo mismo: ambos generan **el mismo plan optimizado**. Estas dos líneas son equivalentes:

```python norun
df.filter(df.estado == "entregado").groupBy("canal").count()
spark.sql("SELECT canal, count(*) FROM pedidos WHERE estado = 'entregado' GROUP BY canal")
```

## Evaluación perezosa (lazy evaluation)

Las operaciones de Spark se dividen en dos tipos:

- **Transformaciones**: describen un DataFrame nuevo a partir de otro (`select`, `filter`, `withColumn`, `join`, `groupBy`…). **No ejecutan nada**: solo agregan un paso al plan, y por eso responden al instante aunque la tabla tenga mil millones de filas.
- **Acciones**: piden un resultado (`show`, `count`, `collect`, `write`, `take`…). **Recién ahí** Spark ejecuta todo el plan.

```python norun
df = spark.read.parquet("/datos/pedidos")          # nada se lee todavía (solo mira el esquema)
df2 = df.filter(df.estado == "entregado")          # nada
df3 = df2.groupBy("canal").count()                 # nada
df3.show()                                         # ¡ACCIÓN! Ahora sí se ejecuta todo
```

:::analogia La lista del supermercado
Las transformaciones son anotar cosas en la lista. La acción es ir al supermercado. Como tienes la lista completa antes de salir, puedes planear la ruta óptima por los pasillos (eso hace el optimizador **Catalyst**). Si fueras al supermercado cada vez que anotas algo, harías diez viajes.
:::

### Cómo distinguirlas

Una regla que casi nunca falla: **si devuelve un DataFrame, es una transformación**. Si devuelve otra cosa (un número, una lista de filas, nada pero escribe archivos), es una acción.

| Transformaciones (devuelven DataFrame) | Acciones (devuelven otra cosa o escriben) |
|---|---|
| `select`, `selectExpr`, `withColumn`, `drop` | `show()` → imprime |
| `filter` / `where` | `count()` → un número |
| `groupBy(...).agg(...)` | `collect()` → lista de filas en el driver |
| `join`, `union` | `take(n)`, `first()`, `head()` |
| `orderBy`, `distinct`, `limit` | `toPandas()` → DataFrame de pandas en el driver |
| `repartition`, `coalesce` | `write...save()` / `saveAsTable()` → escribe |

### Consecuencia práctica: los errores aparecen tarde

Como nada se ejecuta hasta la acción, un error en un paso del medio (por ejemplo, dividir por una columna que tiene textos) **no aparece en esa línea**, sino en el `show()` o el `write` del final. Si el error es raro, ejecuta acciones chicas (`df2.limit(5).show()`) después de cada paso para encontrar el culpable.

:::cuidado Cada acción vuelve a ejecutar todo el plan
Si haces `df3.count()` y después `df3.show()`, Spark **lee y calcula todo dos veces**. Si vas a usar el mismo resultado varias veces, guárdalo en memoria con `df3.cache()` (se ve en la lección de optimización) o escríbelo a una tabla.
:::

```recorrido
titulo: La receta y el plato: Spark no hace nada hasta que pides un resultado
estacion read: read | icono=archivo
estacion filter: filter | icono=lupa
estacion group: groupBy | icono=cubo
estacion action: show() | icono=chispa
estacion exec: Ejecución | icono=servidor
paso read: Leer: todavía nada
`spark.read` no lee los datos todavía: anota **de dónde** se van a leer. La celda termina al instante aunque el archivo pese 100 GB.
>>> python
df = spark.read.parquet("/lago/silver/pedidos")
# plan: leer pedidos
paso filter: Filtrar: se agrega a la receta
Cada transformación agrega un paso al **plan**. Sigue sin procesar ni una fila.
>>> python
entregados = df.filter(F.col("estado") == "entregado")
# plan: leer pedidos → filtrar estado
paso group: Agrupar: otro paso más
También es una transformación: el plan crece, el trabajo no empieza.
>>> python
por_canal = entregados.groupBy("canal").count()
# plan: leer → filtrar → agrupar y contar
paso action: show(): la acción dispara todo
Una **acción** (`show`, `count`, `collect`, `write`) pide un resultado. Recién ahí Spark optimiza el plan completo y lo ejecuta.
>>> python
por_canal.show()
paso exec: Optimizar y repartir
Catalyst reordena el plan (por ejemplo, lee solo las columnas `estado` y `canal` del Parquet y aplica el filtro al leer) y reparte el trabajo entre los executors. Ejemplo ilustrativo de un plan.
>>> log
== Physical Plan ==
HashAggregate(keys=[canal], functions=[count(1)])
+- Exchange hashpartitioning(canal, 200)
   +- Filter (estado = entregado)
      +- FileScan parquet [estado,canal] PushedFilters: [EqualTo(estado,entregado)]
```

## Por qué la pereza es buena: Catalyst

Como Spark ve el plan completo antes de ejecutar, su optimizador **Catalyst** puede reescribirlo para que sea más eficiente. El plan pasa por cuatro etapas:

```text
Tu código ──► Plan lógico ──► Plan lógico optimizado ──► Planes físicos ──► El más barato se ejecuta
              (qué pediste)   (reglas de Catalyst)       (cómo hacerlo:      (Tungsten genera
                                                          qué tipo de join…)  código para la CPU)
```

Las optimizaciones más importantes:

- **Predicate pushdown**: aplicar los filtros lo antes posible, incluso al leer el archivo. Si filtras `fecha = '2024-03-15'` sobre Parquet, Spark usa las estadísticas de cada archivo para **saltarse** los que no tienen esa fecha.
- **Column pruning**: leer solo las columnas que se usan. Si la tabla tiene 80 columnas y usas 3, en Parquet las otras 77 ni se tocan.
- **Reordenar joins** y elegir el mejor algoritmo (por ejemplo, *broadcast* si una tabla es chica).
- **Constant folding** y simplificación de expresiones: `precio * (1 + 0.19)` se convierte en `precio * 1.19` una sola vez, no una vez por fila.

Después, el motor **Tungsten** genera código optimizado para la CPU. Por eso un DataFrame casi siempre le gana a un RDD escrito a mano.

### Ver el plan: explain()

`df.explain()` muestra el plan físico sin ejecutar nada. En Spark real, para un filtro + conteo por canal verías algo así:

```text
== Physical Plan ==
AdaptiveSparkPlan
+- HashAggregate(keys=[canal], functions=[count(1)])                       ← reduce: suma los parciales
   +- Exchange hashpartitioning(canal, 200)                                ← ¡SHUFFLE!
      +- HashAggregate(keys=[canal], functions=[partial_count(1)])         ← map: cuenta parcial
         +- Project [canal]                                                ← column pruning: solo lee canal
            +- Filter (estado = entregado)
               +- FileScan parquet [canal,estado] PushedFilters: [EqualTo(estado,entregado)]   ← pushdown
```

Se lee **de abajo hacia arriba**. Las palabras que más vas a buscar son:

- **`Exchange`**: un shuffle. Cada `Exchange` es un límite entre stages.
- **`PushedFilters`**: los filtros que se aplicaron al leer el archivo (bien).
- **`BroadcastHashJoin`** o **`SortMergeJoin`**: qué estrategia de join eligió.

Pruébalo con los datos del curso. El mini-Spark del curso ejecuta al instante y su `explain()` es simplificado, pero el resultado es el mismo que obtendrías en un clúster:

```python
from pyspark.sql import functions as F

pedidos = spark.table("pedidos")
por_canal = (pedidos
    .filter(F.col("estado") == "entregado")        # transformación
    .groupBy("canal")                               # transformación (wide)
    .agg(F.count("*").alias("pedidos"))
    .orderBy(F.desc("pedidos")))                    # transformación (wide)

por_canal.explain()     # muestra el plan
por_canal.show()        # ACCIÓN: ejecuta
```

## Transformaciones narrow y wide

No todas las transformaciones cuestan lo mismo. La pregunta clave es: **¿para calcular una partición de salida, necesito datos de otras particiones?**

| Tipo | Qué significa | Ejemplos | Costo |
|---|---|---|---|
| **Narrow** (angostas) | Cada partición de salida depende de **una** partición de entrada | `select`, `filter`, `withColumn`, `union` | Barato: sin mover datos |
| **Wide** (anchas) | Una partición de salida necesita datos de **muchas** particiones | `groupBy`, `join`, `distinct`, `orderBy`, `repartition` | Caro: requiere **shuffle** |

```text
NARROW (filter)                         WIDE (groupBy canal)
 P1 ──► P1'                              P1 ─┬─► web
 P2 ──► P2'                              P2 ─┼─► app        cada salida recibe datos
 P3 ──► P3'                              P3 ─┴─► tienda     de TODAS las entradas
 cada una sigue sola                     = shuffle por la red
```

Un `filter` puede aplicarse a cada partición por separado: la máquina 1 filtra sus filas sin preguntarle nada a la máquina 2. Pero para contar todos los pedidos "web", hay que **juntar** las filas web de todas las máquinas.

El **shuffle** escribe datos a disco, los envía por la red y los vuelve a leer. Es casi siempre la parte más lenta de un job. Optimizar Spark es, en gran medida, **minimizar los shuffles** y su tamaño. Dos trucos que salen de esta idea:

1. **Filtra y selecciona antes de agrupar o unir.** Menos filas y columnas = menos datos por la red.
2. **Agrupa una sola vez.** Si necesitas varias métricas por canal, calcúlalas todas en un mismo `agg(...)` en vez de hacer tres `groupBy` distintos.

Spark encadena todas las transformaciones narrow seguidas en **un mismo stage** (*pipelining*): lee una fila, la filtra, le calcula la columna nueva y sigue, sin guardar resultados intermedios. Por eso diez `withColumn` seguidos no son diez pasadas sobre los datos.

:::cuidado collect() puede tumbar el driver
`collect()` trae **todas** las filas al driver. Con millones de filas, el driver se queda sin memoria. Usa `show()`, `take(n)`, `limit(n)` o escribe el resultado a una tabla.
:::

## Ejercicios

:::ejercicio quiz
¿Cuál de estas operaciones es una **acción**?

- [ ] `df.filter(...)`
- [ ] `df.withColumn(...)`
- [x] `df.count()`
- [ ] `df.groupBy(...)`
:::

:::ejercicio quiz
¿Cuál de estas transformaciones es **wide** (provoca shuffle)?

- [ ] `select`
- [ ] `filter`
- [x] `groupBy(...).agg(...)`
- [ ] `withColumn`
:::

:::ejercicio quiz
Escribes `df.select("a").filter("a > 5")` y nunca llamas a ninguna acción. ¿Cuántos datos lee Spark?

- [x] Ninguno: sin acción no se ejecuta nada
- [ ] Toda la tabla
- [ ] Solo la columna `a`
- [ ] Las primeras 20 filas
:::
