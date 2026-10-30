---
titulo: Joins en PySpark
nivel: Intermedio
duracion: 40
resumen: inner, left, anti y semi joins, columnas ambiguas, alias y self joins.
---

## Los mismos joins de SQL, con otra sintaxis

Todo lo que aprendiste de `JOIN` en SQL vale aquí: claves que conectan tablas, `INNER` que descarta lo que no tiene pareja, `LEFT` que conserva todo lo de la izquierda, el anti-join para encontrar lo que falta y la multiplicación de filas en relaciones uno a muchos. En PySpark un join es un **método** del DataFrame de la izquierda:

```python norun
df_izq.join(df_der, on=..., how="inner")
```

| Parámetro | Qué es | Valores |
|---|---|---|
| `df_der` | La tabla de la derecha | otro DataFrame |
| `on` | Cómo emparejar | un **nombre** de columna, una **lista** de nombres, o una **condición** |
| `how` | El tipo de join | `"inner"` (por defecto), `"left"`, `"right"`, `"full"`, `"left_semi"`, `"left_anti"`, `"cross"` |

| SQL | PySpark |
|---|---|
| `FROM pedidos JOIN clientes USING (cliente_id)` | `pedidos.join(clientes, "cliente_id")` |
| `LEFT JOIN … ON a.x = b.y` | `a.join(b, a.x == b.y, "left")` |
| `WHERE EXISTS (…)` | `.join(…, how="left_semi")` |
| `WHERE NOT EXISTS (…)` / anti-join | `.join(…, how="left_anti")` |

## Join por nombre de columna

Si la columna de unión **se llama igual** en las dos tablas, pasa su nombre:

```python
pedidos = spark.table("pedidos")
clientes = spark.table("clientes")
pedidos.join(clientes, "cliente_id").select("pedido_id", "nombre", "pais").show(5)
```

```text
+---------+--------+----------+
|pedido_id|  nombre|      pais|
+---------+--------+----------+
|        1|   Paula| Argentina|
|        2|Santiago|Costa Rica|
|        3| Gabriel| Argentina|
```

Es el `USING` de SQL: la columna `cliente_id` aparece **una sola vez** en el resultado (no hay ambigüedad). Para unir por varias columnas, pasa una lista: `ventas.join(metas, ["anio", "mes", "tienda"])`.

## Join por condición y el problema de las columnas ambiguas

Si los nombres son distintos, o necesitas una condición más compleja, escribe la condición con columnas de cada DataFrame:

```python
from pyspark.sql import functions as F

p = spark.table("productos")
c = spark.table("categorias")
# ambas tablas tienen una columna "nombre": hay que decir de cuál hablamos
(p.join(c, p.categoria_id == c.categoria_id)
   .select(p.nombre.alias("producto"), c.nombre.alias("categoria"))
   .show(5))
```

Con una condición, **ambas** columnas de unión quedan en el resultado, y cualquier columna que exista en las dos tablas (aquí `nombre` y `categoria_id`) queda **duplicada**. Si después escribes `F.col("nombre")`, Spark responde `AMBIGUOUS_REFERENCE`: no sabe de cuál hablas. Tres soluciones:

1. Referirte a la columna a través de su DataFrame (`p.nombre`, `c.nombre`), como arriba.
2. Ponerle **alias** a cada DataFrame y usar `F.col("alias.columna")`:

```python
from pyspark.sql import functions as F

(spark.table("productos").alias("p")
   .join(spark.table("categorias").alias("c"), F.col("p.categoria_id") == F.col("c.categoria_id"))
   .select(F.col("p.nombre").alias("producto"), F.col("c.nombre").alias("categoria"))
   .show(5))
```

3. La más práctica: **renombrar** las columnas conflictivas antes del join y unir por nombre.

```python
from pyspark.sql import functions as F

categorias = spark.table("categorias").select("categoria_id", F.col("nombre").alias("categoria"))
spark.table("productos").join(categorias, "categoria_id").select("nombre", "categoria").show(3)
```

:::tip Un hábito que evita la mayoría de los problemas
Antes de un join, deja en cada lado **solo** las columnas que vas a usar (`select`) y con nombres que no choquen. El código queda más claro, no hay ambigüedades y Spark mueve menos datos por la red.
:::

## Los tipos de join, con números reales

Con 2.000 clientes, 1.453 de ellos con pedidos y 12.000 pedidos en total:

```python
clientes = spark.table("clientes")
pedidos = spark.table("pedidos")
print("inner:", clientes.join(pedidos, "cliente_id").count())               # 12000: solo clientes con pedidos, una fila por pedido
print("left:", clientes.join(pedidos, "cliente_id", "left").count())        # 12547: + 547 clientes sin pedidos, con nulos
print("left_semi:", clientes.join(pedidos, "cliente_id", "left_semi").count())  # 1453: clientes que tienen pedidos, UNA vez
print("left_anti:", clientes.join(pedidos, "cliente_id", "left_anti").count())  # 547: clientes SIN pedidos
```

| Tipo | Filas | Columnas | Equivale en SQL |
|---|---|---|---|
| `inner` | Solo con pareja; se repite por cada pareja | De ambas tablas | `INNER JOIN` |
| `left` | Todas las de la izquierda | De ambas (nulos si no hay pareja) | `LEFT JOIN` |
| `left_semi` | Las de la izquierda que **tienen** pareja, sin repetir | **Solo** de la izquierda | `WHERE EXISTS` / `IN` |
| `left_anti` | Las de la izquierda que **no** tienen pareja | **Solo** de la izquierda | `WHERE NOT EXISTS` |

`left_semi` y `left_anti` son "joins filtro": usan la otra tabla solo para decidir qué filas quedan. Son más claros y más eficientes que un `left` + `filter(isNull)`, y en Spark se usan muchísimo: "clientes activos" (`semi`), "productos nunca vendidos" (`anti`), "registros nuevos que todavía no están en la tabla destino" (`anti`, clave en las cargas incrementales).

:::cuidado La explosión de filas
Igual que en SQL, si la clave **no es única** en ninguno de los dos lados, el join multiplica filas (si una fecha aparece 1.000 veces a cada lado, salen 1.000.000 de filas). En un cluster eso no solo da un resultado equivocado: puede dejar el job corriendo horas. Antes de unir, pregúntate si la clave es única en al menos un lado, y verifica con `count()` antes y después.
:::

```recorrido
titulo: inner, left, left_semi y left_anti con los mismos 10 clientes
estacion izq: clientes | icono=usuario
estacion der: pedidos | icono=tabla
estacion inner: inner | icono=capas
estacion semi: left_semi | icono=check
estacion anti: left_anti | icono=x
paso izq: Los 10 primeros clientes
Tomamos los clientes 1 a 10 y contamos cuántos pedidos tiene cada uno (columna solo para que veas el dato: no es parte del join).
>>> tabla
cliente_id,nombre,sus_pedidos
1,Lucía,0
2,Juan,0
3,Andrés,4
4,Gabriel,5
5,Emiliano,4
6,Nicolás,4
7,Antonella,8
8,Carlos,4
9,María,18
10,Miguel,0
paso der: La otra tabla
`pedidos` tiene una fila por pedido; un cliente puede aparecer muchas veces o ninguna.
>>> tabla
pedido_id,cliente_id,canal
10386,3,telefono
10727,3,tienda
11506,3,app
11915,3,web
1905,4,web
4805,4,telefono
paso inner: inner: una fila por cada pareja
`clientes.join(pedidos, "cliente_id")` repite al cliente **una vez por pedido** y descarta a los que no tienen pedidos. Por cliente queda:
>>> tabla
cliente_id,nombre,filas_en_inner
3,Andrés,4
4,Gabriel,5
5,Emiliano,4
6,Nicolás,4
7,Antonella,8
8,Carlos,4
9,María,18
paso semi: left_semi: los que tienen pareja, una vez
`how="left_semi"` deja a cada cliente que tiene **al menos un** pedido, **sin repetirlo** y solo con las columnas de `clientes`.
>>> tabla
cliente_id,nombre
3,Andrés
4,Gabriel
5,Emiliano
6,Nicolás
7,Antonella
8,Carlos
9,María
paso anti: left_anti: los que NO tienen pareja
`how="left_anti"` es lo contrario: los clientes **sin** pedidos. Es la forma más clara de responder "¿quiénes nunca…?".
>>> tabla
cliente_id,nombre
1,Lucía
2,Juan
10,Miguel
```

## Self join

Unir una tabla consigo misma requiere **alias**, porque las dos "copias" tienen exactamente las mismas columnas:

```python
from pyspark.sql import functions as F

e = spark.table("empleados")
(e.alias("e")
   .join(e.alias("j"), F.col("e.jefe_id") == F.col("j.empleado_id"), "left")
   .select(F.col("e.nombre").alias("empleado"), F.col("j.nombre").alias("jefe"))
   .show(5))
```

## Cómo ejecuta Spark un join

En un cluster, unir no es trivial: las filas con la misma clave tienen que estar **en la misma máquina** para poder emparejarse. Spark elige una estrategia:

| Estrategia | Cuándo | Costo |
|---|---|---|
| **Broadcast hash join** | Una tabla es chica (por defecto < 10 MB): se **copia entera** a cada máquina | Barato: la tabla grande no se mueve |
| **Sort-merge join** | Ambas son grandes: se reparten por la clave (shuffle) y se ordenan | Caro: mueve las dos tablas por la red |

Puedes sugerir el broadcast cuando sabes que una tabla es chica (una dimensión de países, de categorías):

```python
from pyspark.sql import functions as F

spark.table("productos").join(F.broadcast(spark.table("categorias")), "categoria_id").count()
```

Lo verás en detalle en la lección de rendimiento; por ahora quédate con la idea: **unir una tabla grande con una chica es barato; unir dos grandes, caro**.

## Resumen

- `izq.join(der, on, how)`: `on` es un nombre, una lista de nombres o una condición.
- Por nombre, la columna de unión aparece una vez; por condición, cuidado con las columnas duplicadas (usa alias o renombra antes).
- `inner`, `left`, `full` como en SQL; `left_semi` = `EXISTS`, `left_anti` = `NOT EXISTS`.
- Claves no únicas multiplican filas: verifica conteos.
- Tabla chica + tabla grande → `F.broadcast(chica)`.

## Ejercicios

:::ejercicio pyspark
Une `pedidos` con `clientes` y cuenta los pedidos por `pais`. Columnas: `pais`, `pedidos`.
```python solucion
from pyspark.sql import functions as F

resultado = (spark.table("pedidos")
               .join(spark.table("clientes"), "cliente_id")
               .groupBy("pais")
               .agg(F.count("*").alias("pedidos")))
```
:::

:::ejercicio pyspark
Encuentra los clientes que **nunca** hicieron un pedido usando un **left_anti** join. Columnas: `cliente_id`, `nombre`, `fecha_registro`.
```python solucion
resultado = (spark.table("clientes")
               .join(spark.table("pedidos"), "cliente_id", "left_anti")
               .select("cliente_id", "nombre", "fecha_registro"))
```
:::

:::ejercicio pyspark
Muestra cada producto con el nombre de su categoría. Columnas: `producto_id`, `producto`, `categoria`. Ojo: ambas tablas tienen la columna `nombre`.
```python solucion
cat = spark.table("categorias").withColumnRenamed("nombre", "categoria")
resultado = (spark.table("productos")
               .withColumnRenamed("nombre", "producto")
               .join(cat, "categoria_id")
               .select("producto_id", "producto", "categoria"))
```
:::

:::ejercicio pyspark
Para **todos** los empleados, muestra `empleado` (nombre), `departamento` (nombre del departamento) y `jefe` (nombre del jefe, NULL para el CEO).
```python solucion
from pyspark.sql import functions as F

e = spark.table("empleados")
d = spark.table("departamentos").select("departamento_id", F.col("nombre").alias("departamento"))
resultado = (e.alias("e")
               .join(e.alias("j"), F.col("e.jefe_id") == F.col("j.empleado_id"), "left")
               .join(d, F.col("e.departamento_id") == d.departamento_id, "left")
               .select(F.col("e.nombre").alias("empleado"), F.col("departamento"), F.col("j.nombre").alias("jefe")))
```
```pista
Haz un self join con alias (`e` y `j`) y luego une `departamentos` renombrando su columna `nombre`.
```
:::

:::ejercicio pyspark
Calcula las **unidades vendidas por categoría padre** (`categoria`), es decir, sube un nivel en la jerarquía: une `detalle_pedidos` → `productos` → `categorias` (subcategoría) → `categorias` (padre). Columnas: `categoria`, `unidades`.
```python solucion
from pyspark.sql import functions as F

det = spark.table("detalle_pedidos")
prod = spark.table("productos").select("producto_id", "categoria_id")
sub = spark.table("categorias").select("categoria_id", F.col("categoria_padre_id").alias("padre_id"))
padre = spark.table("categorias").select(F.col("categoria_id").alias("padre_id"), F.col("nombre").alias("categoria"))
resultado = (det.join(prod, "producto_id")
               .join(sub, "categoria_id")
               .join(padre, "padre_id")
               .groupBy("categoria")
               .agg(F.sum("cantidad").alias("unidades")))
```
```pista
Las categorías hoja (las de los productos) tienen `categoria_padre_id`. Algunas subcategorías (Laptops) son hijas de otra subcategoría (Computadoras): en este ejercicio sube **un solo nivel**.
```
:::
