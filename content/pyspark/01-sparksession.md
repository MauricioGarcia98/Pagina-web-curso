---
titulo: SparkSession y tu primer DataFrame
nivel: Básico
duracion: 35
resumen: Crear la sesión, crear DataFrames, ver esquema y datos, y cómo funciona el simulador.
---

## Qué es PySpark y por qué existe

En el módulo de Spark viste la idea: cuando los datos no entran en una sola computadora (cientos de GB, terabytes), se reparten entre **muchas** computadoras que trabajan en paralelo. **Apache Spark** es el motor que coordina ese trabajo. Está escrito en Scala (un lenguaje que corre sobre Java), pero se puede usar desde varios lenguajes; **PySpark** es su API para **Python**.

Es la herramienta que usarás el 90 % del tiempo en **Databricks**, en **AWS Glue**, en **EMR** y en **Dataproc**. La buena noticia: si ya sabes SQL y Python, PySpark es combinar ambos. Casi todo lo que haces con `SELECT`, `WHERE`, `GROUP BY` y `JOIN` tiene un equivalente directo.

:::nota Sobre el simulador de este sitio
Spark real necesita Java y un cluster. Para que practiques sin instalar nada, los ejercicios usan **mini-Spark**, un simulador en Python que implementa gran parte de la API de `pyspark.sql` con **la misma sintaxis**. Los resultados son los mismos que en Spark para estos datos (salvo detalles como el orden de filas sin `orderBy`, que en Spark real no está garantizado). Cuando pases a Databricks, tu código funcionará igual.

En los ejercicios la variable `spark` ya existe y están disponibles las tablas de Tienda Andina (`clientes`, `productos`, `categorias`, `pedidos`, `detalle_pedidos`, `pagos`, `empleados`, `departamentos`, `eventos_web`) y las de los casos de negocio (`banco_transacciones`, `streaming_reproducciones`, `viajes_viajes`, `vuelos_vuelos`…).
:::

## La SparkSession: la puerta de entrada

Todo programa PySpark empieza obteniendo una **SparkSession**: el objeto que se conecta con el motor de Spark y desde el cual lees datos, creas tablas y ejecutas SQL.

```python
from pyspark.sql import SparkSession

spark = (SparkSession.builder
           .appName("mi-primer-job")     # un nombre para reconocer el trabajo en la interfaz de Spark
           .getOrCreate())               # crea la sesión, o reutiliza la que ya existe
print(spark.version)
```

- `SparkSession.builder` usa el patrón "constructor": vas encadenando configuraciones (`.appName(…)`, `.config("spark.sql.shuffle.partitions", 200)`) y terminas con `.getOrCreate()`.
- En **Databricks** y en este sitio, `spark` **ya viene creada**: no hace falta escribir esto. En tu computadora o en un script que corre en un cluster, sí.

## Qué es un DataFrame

Un **DataFrame** es una tabla: filas y columnas con nombre y tipo, como una tabla de SQL o una hoja de Excel. La diferencia está en lo que no ves:

| | Tabla de SQLite / hoja de Excel | DataFrame de Spark |
|---|---|---|
| Dónde están los datos | En una computadora | **Repartidos** en particiones entre muchas máquinas |
| Cuándo se calcula | Al ejecutar la consulta | Solo cuando pides un resultado (**evaluación perezosa**) |
| ¿Se puede modificar? | Sí (`UPDATE`) | No: cada transformación crea un DataFrame **nuevo** (es inmutable) |
| Tamaño máximo | Lo que entre en el disco/memoria de una máquina | Petabytes |

:::analogia La receta y el plato
Un DataFrame no es el plato servido: es la **receta**. Cada vez que escribes `.filter(...)` o `.select(...)` agregas un paso a la receta, pero nadie cocina todavía. Recién cuando pides el plato (`show()`, `count()`, `write`), Spark lee la receta completa, la optimiza (por ejemplo, filtra antes de unir) y cocina todo de una vez, repartiendo el trabajo entre muchos cocineros.
:::

## Crear un DataFrame a mano

Para pruebas y ejemplos puedes crear un DataFrame desde una lista de Python:

```python
datos = [
    ("Ana", "Chile", 34),
    ("Luis", "Perú", 28),
    ("Eva", "México", 41),
]
df = spark.createDataFrame(datos, ["nombre", "pais", "edad"])
df.show()
df.printSchema()
```

```text
+------+------+----+
|nombre|  pais|edad|
+------+------+----+
|   Ana| Chile|  34|
|  Luis|  Perú|  28|
|   Eva|México|  41|
+------+------+----+
root
 |-- nombre: string (nullable = true)
 |-- pais: string (nullable = true)
 |-- edad: bigint (nullable = true)
```

- Cada **tupla** es una fila; la lista de nombres define las columnas.
- `show()` dibuja las filas como tabla (por defecto, las primeras 20, y corta los textos largos a 20 caracteres; `show(5, truncate=False)` muestra 5 sin cortar).
- `printSchema()` muestra el **esquema**: cada columna con su **tipo** y si admite nulos. Spark **infirió** los tipos: `string` para textos, `bigint` (entero grande) para números enteros de Python.

### Definir el esquema explícitamente

Inferir tipos es cómodo para probar, pero en un pipeline real conviene **declarar** el esquema: es más rápido (Spark no tiene que adivinar), y si los datos llegan con otro formato, el error aparece enseguida en lugar de colarse.

```python
from pyspark.sql.types import StructType, StructField, StringType, IntegerType

esquema = StructType([
    StructField("nombre", StringType(), nullable=False),
    StructField("edad", IntegerType(), nullable=True),
])
df = spark.createDataFrame([("Ana", 34), ("Luis", None)], esquema)
df.printSchema()

df2 = spark.createDataFrame([("Sol", 25)], "nombre STRING, edad INT")   # forma corta: texto DDL
df2.show()
```

| Tipo de Spark | Equivale a | Ejemplo |
|---|---|---|
| `StringType()` / `STRING` | texto | `"Chile"` |
| `IntegerType()` / `INT`, `LongType()` / `BIGINT` | entero | `42` |
| `DoubleType()` / `DOUBLE`, `DecimalType(10,2)` | decimal | `19.99` |
| `BooleanType()` / `BOOLEAN` | verdadero/falso | `True` |
| `DateType()` / `DATE`, `TimestampType()` / `TIMESTAMP` | fecha / fecha-hora | `2024-03-15` |
| `ArrayType`, `StructType`, `MapType` | listas, registros, diccionarios anidados | (lección de tipos complejos) |

## Leer una tabla y explorarla

En la práctica casi nunca creas DataFrames a mano: los **lees** de tablas o archivos. `spark.table("nombre")` devuelve una tabla registrada en el catálogo como DataFrame:

```python
pedidos = spark.table("pedidos")
pedidos.printSchema()            # columnas y tipos
pedidos.show(5)                  # primeras 5 filas
print(pedidos.count())           # cantidad de filas
print(pedidos.columns)           # lista de nombres de columnas
pedidos.describe("pedido_id").show()   # estadísticas básicas: count, mean, stddev, min, max
```

Esta es la rutina que harás siempre al recibir una tabla nueva: **esquema → algunas filas → cantidad**. Te dice qué hay, de qué tipo y cuánto.

## Transformaciones y acciones: la idea más importante de Spark

Las operaciones sobre un DataFrame son de dos tipos:

| Tipo | Qué hace | Ejemplos | ¿Ejecuta algo? |
|---|---|---|---|
| **Transformación** | Describe un DataFrame nuevo a partir de otro | `select`, `filter`, `withColumn`, `groupBy`, `join`, `orderBy` | **No**: solo agrega un paso al plan |
| **Acción** | Pide un resultado concreto | `show`, `count`, `collect`, `take`, `first`, `write` | **Sí**: dispara todo el cálculo |

Por eso `spark.table("pedidos").filter(...)` responde al instante aunque la tabla tenga mil millones de filas: no hizo nada todavía. Todo ocurre al llamar una acción. Es la **evaluación perezosa** (*lazy evaluation*), y permite a Spark optimizar el plan completo antes de mover un solo byte.

| Método | Qué hace | ¿Acción? |
|---|---|---|
| `show(n, truncate=False)` | Muestra n filas en formato tabla | Sí |
| `printSchema()` | Muestra el esquema | No (solo metadatos) |
| `count()` | Cuenta filas | Sí |
| `collect()` | Trae **todas** las filas a tu programa como lista de `Row` | Sí (¡cuidado!) |
| `take(n)` / `first()` | Trae n filas / la primera | Sí |
| `columns`, `dtypes`, `schema` | Metadatos | No |
| `display(df)` | Tabla interactiva con gráficos (solo Databricks) | Sí |

:::cuidado collect() puede tumbar el programa
`collect()` trae **todas** las filas desde las máquinas del cluster a **una sola** (el *driver*, la que ejecuta tu código Python). Con una tabla de 500 millones de filas, el driver se queda sin memoria y el job falla. Usa `show()`, `take(n)` o `limit(n)` para mirar, y deja que los resultados grandes se **escriban** a tablas o archivos.
:::

## Row: las filas de Spark

Cuando traes filas a Python (`first()`, `take`, `collect`), cada una es un objeto `Row`, parecido a una tupla con nombres:

```python
fila = spark.table("clientes").first()
print(fila)
print(fila["nombre"], fila.pais)          # acceso por nombre o como atributo
print(fila.asDict())                      # convertir a diccionario
```

```text
Row(cliente_id=1, nombre='Lucía', apellido='Aguilar', email='lucia.aguilar@correo.com', …)
Lucía España
```

## Resumen

- PySpark es la API de Python para Spark; `spark` (la SparkSession) es la puerta de entrada.
- Un DataFrame es una tabla distribuida, inmutable y perezosa: una "receta" que se ejecuta al pedir un resultado.
- `createDataFrame` para datos de prueba; declara el esquema en pipelines reales. `spark.table(...)` para leer tablas.
- Rutina de exploración: `printSchema()`, `show(n)`, `count()`.
- Transformaciones (`select`, `filter`…) no ejecutan nada; acciones (`show`, `count`, `write`) sí. Evita `collect()` con datos grandes.

## Ejercicios

En los ejercicios de PySpark guarda tu resultado en la variable **`resultado`** (un DataFrame). El corrector compara tus filas con las de la solución (sin importar el orden, salvo que se pida).

:::ejercicio pyspark
Crea un DataFrame con estas tres filas y columnas `producto` y `precio`: `("Mouse", 25.0)`, `("Teclado", 49.9)`, `("Monitor", 210.0)`. Guárdalo en `resultado`.
```python inicial
datos = [("Mouse", 25.0), ("Teclado", 49.9), ("Monitor", 210.0)]
# resultado = spark.createDataFrame(...)
```
```python solucion
datos = [("Mouse", 25.0), ("Teclado", 49.9), ("Monitor", 210.0)]
resultado = spark.createDataFrame(datos, ["producto", "precio"])
```
:::

:::ejercicio pyspark
Guarda en `resultado` la tabla `departamentos` completa.
```python solucion
resultado = spark.table("departamentos")
```
:::

:::ejercicio pyspark variable=n_pagos
Usa PySpark para contar cuántas filas tiene la tabla `pagos` y guarda ese número (un entero) en la variable `n_pagos`.
```python solucion
n_pagos = spark.table("pagos").count()
```
:::
