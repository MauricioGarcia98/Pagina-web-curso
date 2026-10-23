---
titulo: SparkSession y tu primer DataFrame
nivel: Básico
duracion: 25
resumen: Crear la sesión, crear DataFrames, ver esquema y datos, y cómo funciona el simulador.
---

**PySpark** es la API de Python para Spark. Es lo que usarás el 90% del tiempo en Databricks.

:::nota Sobre el simulador de este sitio
Spark real necesita Java y un cluster. Para que practiques sin instalar nada, los ejercicios usan **mini-Spark**, un simulador en Python que implementa gran parte de la API de `pyspark.sql` con **la misma sintaxis**. Los resultados son los mismos que en Spark para estos datos (salvo detalles como el orden de filas sin `orderBy`, que en Spark real no está garantizado). Cuando pases a Databricks, tu código funcionará igual.

En los ejercicios la variable `spark` ya existe y están disponibles las tablas `clientes`, `productos`, `categorias`, `pedidos`, `detalle_pedidos`, `pagos`, `empleados`, `departamentos` y `eventos_web`.
:::

## La SparkSession

Todo programa PySpark empieza creando (u obteniendo) una **SparkSession**, la puerta de entrada a Spark:

```python
from pyspark.sql import SparkSession

spark = (SparkSession.builder
           .appName("mi-primer-job")
           .getOrCreate())
print(spark.version)
```

En Databricks y en este sitio, `spark` ya viene creada.

## Crear un DataFrame a mano

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

También puedes definir el esquema con tipos, como un texto DDL o con `StructType`:

```python
from pyspark.sql.types import StructType, StructField, StringType, IntegerType

esquema = StructType([
    StructField("nombre", StringType(), nullable=False),
    StructField("edad", IntegerType(), nullable=True),
])
df = spark.createDataFrame([("Ana", 34), ("Luis", None)], esquema)
df.printSchema()

df2 = spark.createDataFrame([("Sol", 25)], "nombre STRING, edad INT")
df2.show()
```

## Leer una tabla y explorarla

```python
pedidos = spark.table("pedidos")
pedidos.printSchema()            # columnas y tipos
pedidos.show(5)                  # primeras 5 filas
print(pedidos.count())           # cantidad de filas (¡acción!)
print(pedidos.columns)           # lista de columnas
pedidos.describe("pedido_id").show()
```

| Método | Qué hace | ¿Acción? |
|---|---|---|
| `show(n, truncate=False)` | Muestra n filas en formato tabla | Sí |
| `printSchema()` | Muestra el esquema | No |
| `count()` | Cuenta filas | Sí |
| `collect()` | Trae todas las filas al driver como lista de `Row` | Sí (¡cuidado!) |
| `take(n)` / `first()` | Trae n filas / la primera | Sí |
| `columns`, `dtypes`, `schema` | Metadatos | No |
| `display(df)` | Tabla interactiva (Databricks) | Sí |

## Row: las filas

```python
fila = spark.table("clientes").first()
print(fila)
print(fila["nombre"], fila.pais)          # acceso por nombre o atributo
print(fila.asDict())
```

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
