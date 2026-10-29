---
titulo: Particiones, shuffle, joins y skew
nivel: Avanzado
duracion: 45
resumen: Cómo Spark mueve datos, estrategias de join, data skew y Adaptive Query Execution.
---

Ya sabes que el **shuffle** (mover datos entre máquinas) es lo más caro de un job. Esta lección es sobre cómo controlarlo: cuántas particiones tener, cómo hace Spark un join entre dos tablas repartidas en cien máquinas y qué hacer cuando unos pocos valores concentran casi todos los datos (**skew**). Es el tema más preguntado en entrevistas de Spark.

## repartition vs coalesce

A veces el número de particiones que eligió Spark no te sirve: son muy pocas para tu clúster, o vas a escribir el resultado y no quieres 200 archivos de 1 MB. Para cambiarlo hay dos herramientas:

| Método | Qué hace | Shuffle | Cuándo |
|---|---|---|---|
| `df.repartition(200)` | Redistribuye en N particiones parejas | Sí | Aumentar el paralelismo o equilibrar |
| `df.repartition("pais")` | Agrupa por columna (las filas del mismo país quedan juntas) | Sí | Antes de escribir particionado, o de joins repetidos por esa clave |
| `df.coalesce(10)` | Junta particiones existentes sin redistribuir | No | **Reducir** particiones (por ejemplo, para escribir pocos archivos) |

La diferencia se entiende con un dibujo:

```text
repartition(3): TODAS las filas se reparten de nuevo         coalesce(2): se juntan particiones vecinas
 P1 ─┬─► A                                                     P1 ─┐
 P2 ─┼─► B      (shuffle completo: cada fila puede              P2 ─┴─► A     (sin shuffle: P1 y P2
 P3 ─┼─► C       ir a cualquier destino)                        P3 ─┐          se juntan donde están)
 P4 ─┘                                                          P4 ─┴─► B
```

- `repartition` cuesta un shuffle, pero deja particiones **parejas**.
- `coalesce` es casi gratis, pero **solo puede reducir** y puede dejar particiones desparejas.

```python
pedidos = spark.table("pedidos")
print("Particiones originales:", pedidos.rdd.getNumPartitions())
print("Con repartition(4):    ", pedidos.repartition(4).rdd.getNumPartitions())
print("Con coalesce(2):       ", pedidos.coalesce(2).rdd.getNumPartitions())
```

:::cuidado coalesce(1) en datos grandes
`coalesce(1)` hace que **toda la etapa anterior** corra en una sola tarea, porque Spark lo "empuja" hacia atrás en el plan. Con 500 GB, un solo core procesa todo. Si de verdad necesitas un único archivo de algo grande, usa `repartition(1)`: el cálculo pesado se hace en paralelo y solo la escritura final va en una tarea.
:::

`spark.sql.shuffle.partitions` (por defecto **200**) define cuántas particiones salen de cada shuffle. Para datos chicos es demasiado (200 tareas de 50 KB) y para datos muy grandes es poco (200 particiones de 5 GB que no entran en memoria). Con AQE activado (por defecto en Spark 3.2+ y en Databricks), Spark lo ajusta solo.

## Estrategias de join

Unir dos tablas distribuidas tiene una dificultad: las filas que tienen que unirse (el pedido y su cliente) pueden estar **en máquinas distintas**. Spark tiene que juntarlas de alguna forma, y elige el algoritmo según el tamaño de las tablas.

### 1. Broadcast hash join: copiar la tabla chica

Si una tabla es **chica** (por defecto, menos de 10 MB, configurable con `spark.sql.autoBroadcastJoinThreshold`), Spark manda **una copia completa a cada executor**. Cada executor une sus particiones de la tabla grande con su copia local. La tabla grande **no se mueve**: ¡no hay shuffle!

```text
        clientes (2.000 filas) ── copia ──► executor 1, executor 2, executor 3
pedidos (12.000 filas, se quedan donde están)
 executor 1: sus pedidos ⋈ copia de clientes
 executor 2: sus pedidos ⋈ copia de clientes      ← nadie mueve pedidos por la red
 executor 3: sus pedidos ⋈ copia de clientes
```

```python
from pyspark.sql import functions as F

pedidos = spark.table("pedidos")
clientes = spark.table("clientes").select("cliente_id", "pais")

por_pais = (pedidos
    .join(F.broadcast(clientes), "cliente_id")   # forzar el broadcast con un hint
    .groupBy("pais")
    .agg(F.count("*").alias("pedidos"))
    .orderBy(F.desc("pedidos")))
por_pais.show(5)
```

Spark suele elegir broadcast solo, si sabe que la tabla es chica. `F.broadcast(...)` lo **fuerza**, algo útil cuando Spark no tiene estadísticas o cuando la tabla chica sale de un filtro.

:::cuidado La tabla "chica" tiene que ser chica de verdad
La copia vive en la memoria del driver y de **cada** executor. Forzar el broadcast de una tabla de 5 GB tumba el job por falta de memoria. Hasta unos cientos de MB suele andar bien.
:::

### 2. Sort-merge join: el estándar para dos tablas grandes

Cuando las dos tablas son grandes, ninguna se puede copiar. Spark entonces:

1. **Reparte ambas por la clave** (shuffle): todas las filas con `cliente_id = 42`, de las dos tablas, van a la misma partición.
2. **Ordena** cada partición por la clave.
3. Recorre las dos listas ordenadas **a la par**, como quien junta dos mazos de cartas ordenados.

Es robusto y funciona con cualquier tamaño, porque si no entra en memoria usa el disco. Su costo es el **doble shuffle**.

### 3. Shuffle hash join

Se reparten las dos tablas por clave (como en sort-merge), pero en vez de ordenar, en cada partición se construye una **tabla hash** con el lado más chico. Evita el ordenamiento, pero necesita que ese lado entre en memoria.

| Estrategia | ¿Shuffle? | Cuándo la elige Spark |
|---|---|---|
| Broadcast hash join | No (solo copia la chica) | Una tabla menor que el umbral, o con hint `broadcast` |
| Sort-merge join | Sí, de las dos tablas | Dos tablas grandes (el defecto) |
| Shuffle hash join | Sí, de las dos tablas | Un lado bastante más chico que el otro, pero no lo suficiente para broadcast |

:::analogia Broadcast
Si cada obrero necesita consultar una lista de 20 códigos de país, es más rápido darle **una fotocopia a cada uno** que hacer que todos los obreros se reorganicen por país.
:::

## Data skew: el enemigo silencioso

**Skew** (sesgo) es cuando unas pocas claves concentran la mayoría de los datos. Como un shuffle manda **todas** las filas de una misma clave a **una misma partición**, una clave gigante produce una partición gigante.

Ejemplo: en un join por `cliente_id`, el "cliente" `NULL` o `0` (compras sin cuenta) tiene el 40 % de las filas.

```text
200 particiones después del shuffle por cliente_id:
 partición 1   (cliente_id = 0):  40.000.000 filas   ████████████████████████████  2 horas
 partición 2   (cliente_id = 17):       3.100 filas  ▏                             2 segundos
 partición 3   (cliente_id = 29):       2.800 filas  ▏                             2 segundos
 ...
```

**Una tarea tarda 2 horas mientras las otras 199 terminan en 2 minutos.** El job tarda lo que tarda la tarea más lenta, y agregar máquinas no ayuda, porque esa partición sigue en un solo core.

Síntomas en la Spark UI:
- Un stage donde casi todas las tareas terminan rápido y unas pocas tardan muchísimo (mira la columna **Max** frente a la **Median** en "Summary Metrics").
- Errores de memoria o mucho **spill** a disco en una sola tarea.

Para detectarlo antes de que pase, cuenta cuántas filas tiene cada clave. Mira qué tan repartidos están los pedidos por canal:

```python
from pyspark.sql import functions as F

pedidos = spark.table("pedidos")
total = pedidos.count()
(pedidos.groupBy("canal").count()
    .withColumn("pct", F.round(F.col("count") / F.lit(total) * 100, 1))
    .orderBy(F.desc("count"))
    .show())
```

`web` tiene el 45 % de los pedidos. Si agruparas o unieras **solo** por canal, una de las cuatro particiones haría casi la mitad del trabajo. Con 4 valores no importa mucho; con mil millones de filas, sí.

### Soluciones

- **AQE skew join** (Spark 3+): `spark.sql.adaptive.skewJoin.enabled=true` detecta las particiones gigantes y las **divide automáticamente** en varias. Es lo primero que tienes que tener activado.
- **Filtrar o tratar aparte** las claves problemáticas. Los `NULL` nunca hacen match en un inner join: filtrarlos antes (`where cliente_id is not null`) elimina el problema de raíz.
- **Broadcast** de la tabla chica, si se puede: sin shuffle no hay partición gigante.
- **Salting**: agregar un número al azar a la clave caliente para repartirla en N particiones, y replicar la otra tabla N veces:

```python norun
N = 10
# Lado grande: a cada fila le agrega un número al azar de 0 a 9
ventas_s = ventas.withColumn("sal", (F.rand() * N).cast("int"))
# Lado chico: se replica 10 veces, una por cada valor de sal
sales = spark.range(N).withColumnRenamed("id", "sal")
clientes_s = clientes.crossJoin(sales)
# Join por la clave + la sal: el cliente 0 ahora se reparte en 10 particiones
unido = ventas_s.join(clientes_s, ["cliente_id", "sal"]).drop("sal")
```

## Adaptive Query Execution (AQE)

Sin AQE, Spark decide **todo el plan antes de empezar**, con estimaciones que pueden estar muy equivocadas. Con AQE, Spark **reoptimiza el plan durante la ejecución**, usando estadísticas reales de cada stage que termina:

- **Une particiones chicas** después de un shuffle: adiós a las 200 particiones casi vacías.
- **Cambia a broadcast join** si descubre que una tabla, después de filtrarla, resultó chica.
- **Divide las particiones con skew** en los joins.

Está activado por defecto en Databricks y en Spark ≥ 3.2 (`spark.sql.adaptive.enabled=true`). En el `explain()` lo reconoces porque el plan empieza con `AdaptiveSparkPlan`.

## Resumen

| Situación | Qué hacer |
|---|---|
| Pocas particiones para el clúster | `repartition(n)` |
| Muchos archivos chicos al escribir | `coalesce(n)` (o `repartition(n)` si los datos son grandes) |
| Join de una tabla grande con una chica | Broadcast |
| Join de dos tablas grandes | Sort-merge (el defecto); filtra y selecciona columnas antes |
| Una tarea tarda mucho más que el resto | Skew: AQE, filtrar NULLs, broadcast o salting |

## Ejercicios

:::ejercicio quiz
Unes una tabla de 2 TB de ventas con una tabla de 300 filas de países. ¿Qué estrategia de join es la ideal?

- [ ] Sort-merge join
- [x] Broadcast hash join
- [ ] Cross join
- [ ] Hacer `collect()` de ventas
:::

:::ejercicio quiz
En la Spark UI ves que 199 tareas de un stage terminaron en 1 minuto y 1 tarea lleva 50 minutos. ¿Cuál es la causa más probable?

- [ ] Falta de memoria en el driver
- [x] Data skew: una clave concentra muchísimas filas
- [ ] Pocas particiones
- [ ] El archivo está en CSV
:::

:::ejercicio quiz
Quieres escribir un resultado pequeño en **un solo archivo** sin provocar un shuffle. ¿Qué usas antes de escribir?

- [ ] `repartition(1)`
- [x] `coalesce(1)`
- [ ] `distinct()`
- [ ] `cache()`
:::

:::ejercicio pyspark
Practica con el simulador: une `detalle_pedidos` con `productos` usando un **broadcast** de productos (la tabla chica) por `producto_id`, y calcula las unidades vendidas por `marca`. Guarda en `resultado` un DataFrame con columnas `marca` y `unidades`.
```python inicial
from pyspark.sql import functions as F

det = spark.table("detalle_pedidos")
prod = spark.table("productos")
# resultado = ...
```
```python solucion
from pyspark.sql import functions as F

det = spark.table("detalle_pedidos")
prod = spark.table("productos")
resultado = (det.join(F.broadcast(prod), "producto_id")
                .groupBy("marca")
                .agg(F.sum("cantidad").alias("unidades")))
```
:::
