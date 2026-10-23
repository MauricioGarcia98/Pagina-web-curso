---
titulo: Limpieza y calidad de datos
nivel: Avanzado
duracion: 35
resumen: Deduplicar, normalizar textos, manejar nulos, validar reglas y separar registros inválidos.
---

En la vida real, **la mitad del trabajo de un ingeniero de datos es limpiar**. Los datos llegan con espacios de más, mayúsculas mezcladas, duplicados porque un sistema reenvió un archivo, nulos donde no debería haberlos y valores imposibles (cantidades negativas, fechas del año 2099). Si esos problemas llegan a la capa gold, terminan en un reporte del directorio con números equivocados, y la confianza en el equipo de datos se pierde muy rápido.

La capa **silver** existe justamente para esto. Sus tareas típicas:

| Problema | Ejemplo | Solución en PySpark |
|---|---|---|
| Formato inconsistente | `" ANA "`, `"ana"`, `"Ana"` | `F.trim`, `F.lower`, `F.initcap` |
| Tipos incorrectos | `"120.50"` como texto | `.cast("double")` y contar los `null` resultantes |
| Duplicados | El mismo pedido cargado dos veces | `row_number()` por clave + `rn = 1` |
| Nulos | Email faltante | Contar, completar (`fillna`) o descartar según la regla de negocio |
| Valores imposibles | Cantidad −2, descuento 150 % | Reglas de validación + **cuarentena** |

La regla más importante: **nunca descartes datos en silencio**. Cada fila que quitas debe quedar contada y, mejor aún, guardada con el motivo.

## Normalizar textos

```python
from pyspark.sql import functions as F

limpios = (spark.table("clientes")
             .withColumn("nombre", F.initcap(F.trim("nombre")))
             .withColumn("email", F.lower(F.trim("email")))
             .withColumn("ciudad", F.initcap(F.trim("ciudad")))
             .withColumn("telefono", F.regexp_replace("telefono", r"[^0-9+]", "")))
limpios.select("nombre", "email", "telefono").show(5)
```

## Deduplicar

```python
from pyspark.sql import functions as F
from pyspark.sql.window import Window

df = spark.table("pedidos")
df.dropDuplicates().count()                     # filas 100% idénticas
df.dropDuplicates(["cliente_id"]).count()       # una fila cualquiera por cliente (¡no determinista!)

# Determinista: quedarse con la fila más reciente por clave
w = Window.partitionBy("cliente_id").orderBy(F.col("fecha_pedido").desc(), F.col("pedido_id").desc())
ultimo = df.withColumn("rn", F.row_number().over(w)).filter("rn = 1").drop("rn")
print(ultimo.count())
```

:::cuidado dropDuplicates(subset) elige una fila al azar
En Spark real, cuál fila sobrevive con `dropDuplicates(["clave"])` **no está garantizado**. Si importa cuál queda (casi siempre importa), usa `row_number()` con un orden explícito.
:::

## Nulos

```python
from pyspark.sql import functions as F

c = spark.table("clientes")
# cuántos nulos tiene cada columna
c.select([F.sum(F.col(x).isNull().cast("int")).alias(x) for x in c.columns]).show()
c.na.fill({"telefono": "sin dato", "email": "sin dato"}).show(3)
c.na.drop(subset=["email"]).count()
```

## Reglas de calidad y cuarentena

Patrón profesional: en lugar de descartar en silencio, **separa** las filas válidas de las inválidas y guarda las inválidas (con el motivo) en una tabla de **cuarentena**. Así:

- El pipeline **sigue funcionando** aunque lleguen algunas filas malas.
- Alguien puede **revisar** la cuarentena, corregir el origen y reprocesar.
- Puedes **alertar** si la cantidad de inválidas supera un umbral (por ejemplo, más del 1 %): eso suele indicar que el sistema de origen cambió algo.

La técnica es un `F.when` encadenado que asigna el **primer** motivo de rechazo (o `null` si la fila es válida), y después dos filtros:

```python
from pyspark.sql import functions as F

det = spark.table("detalle_pedidos")
reglas = (det.withColumn("motivo",
            F.when(F.col("cantidad") <= 0, "cantidad_no_positiva")
             .when(F.col("precio_unitario") <= 0, "precio_no_positivo")
             .when(~F.col("descuento").between(0, 0.5), "descuento_fuera_de_rango")))
validos = reglas.filter(F.col("motivo").isNull()).drop("motivo")
cuarentena = reglas.filter(F.col("motivo").isNotNull())
print(validos.count(), cuarentena.count())
```

:::nota Herramientas de calidad
En proyectos reales se usan frameworks: **expectations** de Lakeflow Declarative Pipelines (Databricks), **tests de dbt**, **Great Expectations**, **Soda** o **DQX**. La idea es la misma: reglas declaradas, métricas de calidad y alertas.
:::

## Ejercicios

:::ejercicio pyspark
Usa el DataFrame `crudo` del código inicial (una muestra de datos sucios como los de `clientes_crudo`). Normaliza `nombre` (trim + initcap) y `email` (trim + lower) y **deduplica** quedándote con la fila de `fecha_carga` más reciente por `cliente_id`. Columnas: `cliente_id`, `nombre`, `email`.
```python inicial
from pyspark.sql import functions as F
from pyspark.sql.window import Window

crudo = spark.createDataFrame([
    (1, "  ana ", "ANA@MAIL.COM ", "2024-01-01 10:00:00"),
    (1, "ANA", "ana@mail.com", "2024-03-01 09:00:00"),
    (2, "luis", None, "2024-02-10 12:00:00"),
    (3, "eva", " Eva@Mail.com", "2024-01-05 08:00:00"),
    (3, "Eva ", "eva@mail.com", "2024-01-04 08:00:00"),
], ["cliente_id", "nombre", "email", "fecha_carga"])
```
```python solucion
from pyspark.sql import functions as F
from pyspark.sql.window import Window

crudo = spark.createDataFrame([
    (1, "  ana ", "ANA@MAIL.COM ", "2024-01-01 10:00:00"),
    (1, "ANA", "ana@mail.com", "2024-03-01 09:00:00"),
    (2, "luis", None, "2024-02-10 12:00:00"),
    (3, "eva", " Eva@Mail.com", "2024-01-05 08:00:00"),
    (3, "Eva ", "eva@mail.com", "2024-01-04 08:00:00"),
], ["cliente_id", "nombre", "email", "fecha_carga"])
w = Window.partitionBy("cliente_id").orderBy(F.col("fecha_carga").desc())
resultado = (crudo
               .withColumn("nombre", F.initcap(F.trim("nombre")))
               .withColumn("email", F.lower(F.trim("email")))
               .withColumn("rn", F.row_number().over(w))
               .filter(F.col("rn") == 1)
               .select("cliente_id", "nombre", "email"))
```
:::

:::ejercicio pyspark
Calcula cuántos **nulos** hay en cada columna de la tabla `clientes` en una sola fila (una columna por cada columna de la tabla, con el mismo nombre). Pista: una lista por comprensión dentro de `select`.
```python solucion
from pyspark.sql import functions as F

c = spark.table("clientes")
resultado = c.select([F.sum(F.col(x).isNull().cast("int")).alias(x) for x in c.columns])
```
:::

:::ejercicio pyspark
Aplica reglas de calidad al DataFrame `lineas` del código inicial y guarda en `resultado` **solo las filas inválidas** con su `motivo`: `"cantidad_no_positiva"` si `cantidad <= 0`, si no `"precio_nulo"` si `precio` es NULL. Columnas: `id`, `motivo`.
```python inicial
from pyspark.sql import functions as F

lineas = spark.createDataFrame([
    (1, 2, 10.0), (2, 0, 5.0), (3, 1, None), (4, -1, None), (5, 3, 7.5),
], "id INT, cantidad INT, precio DOUBLE")
```
```python solucion
from pyspark.sql import functions as F

lineas = spark.createDataFrame([
    (1, 2, 10.0), (2, 0, 5.0), (3, 1, None), (4, -1, None), (5, 3, 7.5),
], "id INT, cantidad INT, precio DOUBLE")
resultado = (lineas
               .withColumn("motivo",
                   F.when(F.col("cantidad") <= 0, "cantidad_no_positiva")
                    .when(F.col("precio").isNull(), "precio_nulo"))
               .filter(F.col("motivo").isNotNull())
               .select("id", "motivo"))
```
:::
