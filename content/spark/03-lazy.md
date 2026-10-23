---
titulo: RDD, DataFrame y evaluación perezosa
nivel: Intermedio
duracion: 25
resumen: Las APIs de Spark, transformaciones vs acciones, narrow vs wide y el optimizador Catalyst.
---

## Tres APIs, una evolución

| API | Desde | Qué es | ¿Usarla hoy? |
|---|---|---|---|
| **RDD** | 2011 | Colección distribuida de objetos. Control total, sin optimizador. | Solo casos muy especiales |
| **DataFrame** | 2015 | Tabla distribuida con columnas y tipos (como una tabla SQL). Optimizada por Catalyst. | **Sí, siempre** |
| **Dataset** | 2016 | DataFrame con tipos de Scala/Java en compilación | Solo en Scala/Java |

En PySpark trabajarás con **DataFrames** y **Spark SQL**, que son dos caras de lo mismo: ambos generan el mismo plan optimizado.

## Evaluación perezosa (lazy evaluation)

Las operaciones de Spark se dividen en dos tipos:

- **Transformaciones**: describen un nuevo DataFrame a partir de otro (`select`, `filter`, `withColumn`, `join`, `groupBy`…). **No ejecutan nada**: solo agregan un paso al plan.
- **Acciones**: piden un resultado (`show`, `count`, `collect`, `write`, `take`…). **Recién ahí** Spark ejecuta todo el plan.

```python norun
df = spark.read.parquet("/datos/pedidos")          # nada se lee todavía
df2 = df.filter(df.estado == "entregado")          # nada
df3 = df2.groupBy("canal").count()                 # nada
df3.show()                                         # ¡ACCIÓN! Ahora sí se ejecuta todo
```

:::analogia La lista del supermercado
Las transformaciones son anotar cosas en la lista. La acción es ir al supermercado. Como tienes la lista completa antes de salir, puedes planear la ruta óptima por los pasillos (eso hace el optimizador **Catalyst**).
:::

## Por qué la pereza es buena: Catalyst

Como Spark ve el plan completo antes de ejecutar, su optimizador **Catalyst** puede:

- **Predicate pushdown**: aplicar los filtros lo antes posible, incluso al leer el archivo (lee menos datos).
- **Column pruning**: leer solo las columnas que se usan (en Parquet, el resto ni se toca).
- **Reordenar joins** y elegir el mejor algoritmo.
- **Constant folding**, simplificación de expresiones, etc.

Y luego el motor **Tungsten** genera código optimizado para la CPU. Por eso un DataFrame casi siempre gana a un RDD escrito a mano.

Ves el plan con `df.explain()` o `df.explain("formatted")`.

## Transformaciones narrow y wide

| Tipo | Qué significa | Ejemplos | Costo |
|---|---|---|---|
| **Narrow** (angostas) | Cada partición de salida depende de **una** partición de entrada | `select`, `filter`, `withColumn`, `union` | Barato: sin mover datos |
| **Wide** (anchas) | Una partición de salida necesita datos de **muchas** particiones | `groupBy`, `join`, `distinct`, `orderBy`, `repartition` | Caro: requiere **shuffle** |

El **shuffle** escribe datos a disco, los envía por la red y los vuelve a leer. Es casi siempre la parte más lenta de un job. Optimizar Spark es, en gran medida, **minimizar shuffles** y su tamaño.

:::cuidado collect() puede tumbar el driver
`collect()` trae **todas** las filas al driver. Con millones de filas, el driver se queda sin memoria. Usa `show()`, `take(n)`, `limit(n)` o escribe el resultado a una tabla.
:::

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
