---
titulo: Limpieza y calidad de datos
nivel: Avanzado
duracion: 50
resumen: Deduplicar, normalizar textos, manejar nulos, convertir tipos con el modo ANSI de Spark 4 (cast y try_cast), validar reglas y separar registros inválidos en cuarentena.
---

En la vida real, **la mitad del trabajo de un ingeniero de datos es limpiar**. Los datos llegan con espacios de más, mayúsculas mezcladas, duplicados porque un sistema reenvió un archivo, nulos donde no debería haberlos y valores imposibles (cantidades negativas, fechas del año 2099). Si esos problemas llegan a la capa gold, terminan en un reporte del directorio con números equivocados, y la confianza en el equipo de datos se pierde muy rápido.

La capa **silver** existe justamente para esto. Sus tareas típicas:

| Problema | Ejemplo | Solución en PySpark |
|---|---|---|
| Formato inconsistente | `" ANA "`, `"ana"`, `"Ana"` | `F.trim`, `F.lower`, `F.initcap` |
| Tipos incorrectos | `"120.50"` como texto, `"N/A"` en una cantidad | `.try_cast("double")` y contar los `null` resultantes |
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

## Convertir tipos sin perder datos (Spark 4)

Los datos de bronze suelen llegar como **texto**: un CSV no sabe que `"120.50"` es un número. Convertirlos al tipo correcto es tarea de silver. Desde Spark 4, el **modo ANSI** está activado por defecto: si un valor no se puede convertir, `cast` **lanza un error** y el job se detiene. Es a propósito: antes, Spark ponía `NULL` en silencio y el dato se perdía sin que nadie lo notara.

```python
from pyspark.sql import functions as F

crudos = spark.createDataFrame(
    [("P1", "2", "120.50"), ("P2", "N/A", "99.90"), ("P3", "1", "precio a confirmar"), ("P4", "3", "45")],
    ["pedido", "cantidad_txt", "precio_txt"],
)

try:
    crudos.select(F.col("cantidad_txt").cast("int")).show()
except Exception as e:
    print("Error ANSI:", str(e)[:90], "...")
```

La salida muestra el error `CAST_INVALID_INPUT`, con el valor que lo causó (`'N/A'`). Cuando **sabes** que la columna trae valores inválidos y decides tratarlos, usas `try_cast`: devuelve `NULL` solo en esas filas. Y como no queremos perder datos en silencio, **contamos** cuántos fallaron:

```python
from pyspark.sql import functions as F

crudos = spark.createDataFrame(
    [("P1", "2", "120.50"), ("P2", "N/A", "99.90"), ("P3", "1", "precio a confirmar"), ("P4", "3", "45")],
    ["pedido", "cantidad_txt", "precio_txt"],
)

tipados = (crudos
    .withColumn("cantidad", F.col("cantidad_txt").try_cast("int"))
    .withColumn("precio", F.col("precio_txt").try_cast("double")))

# cuántos valores había y no se pudieron convertir (no confundir con los que ya venían vacíos)
tipados.select(
    F.sum((F.col("cantidad_txt").isNotNull() & F.col("cantidad").isNull()).cast("int")).alias("cantidades_invalidas"),
    F.sum((F.col("precio_txt").isNotNull() & F.col("precio").isNull()).cast("int")).alias("precios_invalidos"),
).show()
tipados.show()
```

Paso a paso:

1. `try_cast("int")` intenta convertir; si no puede, devuelve `NULL` en esa fila y sigue.
2. Para contar las conversiones fallidas, la condición es "el texto **no** era nulo pero el resultado **sí**". Si solo contaras los `NULL` del resultado, mezclarías los inválidos con los que ya venían vacíos.
3. `.cast("int")` sobre una condición convierte `true`/`false` en `1`/`0`, y `F.sum` los suma.

Lo mismo para divisiones: `F.col("a") / F.col("b")` falla si `b` es 0; `F.try_divide("a", "b")` devuelve `NULL`.

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

:::errores
- **Usar `cast` en datos sucios y "arreglarlo" desactivando ANSI**: el job vuelve a andar, pero los valores inválidos se convierten en `NULL` sin que nadie lo vea. Usa `try_cast` y cuenta.
- **Contar solo los `NULL` del resultado**: mezcla los valores inválidos con los que ya venían vacíos.
- **`dropDuplicates(["clave"])` cuando importa cuál fila queda**: el resultado cambia entre ejecuciones.
- **Descartar filas sin guardarlas**: si mañana alguien pregunta por qué faltan 300 pedidos, no hay cómo responder. Van a cuarentena con su motivo.
- **Normalizar con `F.upper` en un lado y `F.lower` en otro**: los joins por texto dejan de coincidir. Define una sola regla por columna.
:::

:::trabajo
- Un pipeline de silver típico tiene tres salidas: la tabla limpia, la tabla de cuarentena y una tabla de **métricas de calidad** por ejecución (filas leídas, válidas, en cuarentena, por motivo). Las alertas se disparan sobre esas métricas.
- En Databricks, las *expectations* de Lakeflow Declarative Pipelines hacen esto declarando reglas: `@dp.expect_or_drop("cantidad_positiva", "cantidad > 0")`, y registran cuántas filas rompió cada regla.
- Cuando el porcentaje de inválidos salta de golpe (de 0,1 % a 15 %), casi nunca es "datos malos": es un cambio en el sistema de origen (un campo renombrado, un formato de fecha nuevo). Se avisa al equipo dueño del origen.
:::

:::entrevista "¿Cómo manejas registros inválidos en un pipeline de Spark?"
No los descarto en silencio. En silver aplico reglas de validación con `when` encadenados que asignan un motivo de rechazo, separo las filas válidas de las inválidas y guardo las inválidas en una tabla de cuarentena con el motivo y la fecha de carga. Para tipos uso `try_cast`, porque en Spark 4 `cast` falla con datos inválidos, y cuento cuántos valores no se pudieron convertir. Registro las métricas de cada ejecución y alerto si el porcentaje de inválidos supera un umbral, porque suele indicar un cambio en el origen.
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

:::ejercicio pyspark dificultad=Intermedio titulo="Tipar sin perder datos"
El DataFrame `lecturas` (ya creado en el código inicial) tiene la columna de texto `kwh_txt`. Crea `tipadas` agregando la columna `kwh` (double) con **`try_cast`**, y crea `invalidas`: el número de filas donde `kwh_txt` no es nulo pero `kwh` sí.
```python inicial
from pyspark.sql import functions as F
lecturas = spark.createDataFrame(
    [(1, "10.5"), (2, "sin lectura"), (3, None), (4, "7"), (5, "N/A")],
    ["medidor_id", "kwh_txt"],
)
# tipadas = ...
# invalidas = ...
```
```python solucion
from pyspark.sql import functions as F
lecturas = spark.createDataFrame(
    [(1, "10.5"), (2, "sin lectura"), (3, None), (4, "7"), (5, "N/A")],
    ["medidor_id", "kwh_txt"],
)
tipadas = lecturas.withColumn("kwh", F.col("kwh_txt").try_cast("double"))
invalidas = tipadas.filter(F.col("kwh_txt").isNotNull() & F.col("kwh").isNull()).count()
```
```pista
`F.col("kwh_txt").try_cast("double")` no falla con "N/A". Para contar: filtra las filas con texto pero sin número y usa `.count()`.
```
```python test
assert "kwh" in tipadas.columns, "tipadas debe tener la columna kwh"
vals = {r["medidor_id"]: r["kwh"] for r in tipadas.collect()}
assert vals[1] == 10.5 and vals[4] == 7.0, "Los valores válidos deben convertirse a número"
assert vals[2] is None and vals[5] is None, "Los textos inválidos deben quedar en NULL (usa try_cast)"
assert invalidas == 2, f"Hay 2 valores inválidos (la fila 3 ya venía vacía); obtuviste {invalidas}"
```
:::
