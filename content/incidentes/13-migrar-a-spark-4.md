---
titulo: "Migración: tu job de Spark 3.5 a Spark 4"
nivel: Avanzado
duracion: 55
resumen: Un job de Spark 3.5 que falla al pasar a Spark 4 (o a Databricks Runtime 17.3 LTS en adelante) - conversiones inválidas y divisiones por cero que antes daban NULL en silencio y ahora son errores del modo ANSI, código con RDDs que no corre en Spark Connect ni en serverless, y un plan para migrar sin perder datos.
objetivos: Leer un error CAST_INVALID_INPUT o DIVIDE_BY_ZERO y encontrar la fila que lo causa | Corregir con try_cast y try_divide contando los valores inválidos | Reescribir código con RDDs usando DataFrames | Planificar una migración de runtime con un entorno de prueba
prerrequisitos: spark-spark-4 | pyspark-calidad
autoevaluacion: ¿Sabes por qué un job que funcionaba en Spark 3.5 falla en Spark 4 sin cambiar el código? | ¿Sabes por qué desactivar ANSI no es la solución? | ¿Sabes qué código no corre en Spark Connect?
---

:::escenario
El clúster de producción pasa de Databricks Runtime 16.4 LTS (Spark 3.5) a 17.3 LTS (Spark 4.0). En el entorno de prueba, el job `silver_lecturas` falla con `[CAST_INVALID_INPUT] The value 'sin lectura' of the type "STRING" cannot be cast to "DOUBLE"`. Un compañero propone poner `spark.sql.ansi.enabled = false` y seguir. Antes de aceptarlo, hay una pregunta: ¿cuántas filas venía perdiendo el job en Spark 3.5 sin que nadie lo supiera?
:::

## Qué cambia al pasar a Spark 4

Según la guía de migración oficial de Spark, el cambio más importante es que `spark.sql.ansi.enabled` vale `true` por defecto. Los efectos que vas a ver en un job real:

| Operación | Spark 3.5 | Spark 4 | Corrección |
|---|---|---|---|
| `cast("double")` de `"sin lectura"` | `NULL` | Error `CAST_INVALID_INPUT` | `try_cast("double")` y contar los inválidos |
| `a / b` con `b = 0` | `NULL` | Error `DIVIDE_BY_ZERO` | `F.try_divide(a, b)` |
| Un entero que se desborda | Un número sin sentido | Error de desbordamiento | Un tipo más grande (`bigint`, `decimal`) o `try_add` |
| `df.rdd`, `sc.parallelize` en Spark Connect o serverless | Funciona en un clúster clásico | No existe | Reescribir con DataFrames |

El error te dice **el valor** que lo causó (`'sin lectura'`). Ese es el punto de partida para investigar: buscar en bronze cuántas filas traen valores así y desde cuándo.

## Encontrar y medir antes de corregir

Antes de cambiar el código, se mide el tamaño del problema con `try_cast`, que nunca falla:

```python
from pyspark.sql import functions as F

bronze = spark.createDataFrame(
    [("M1", "12.5", "2"), ("M2", "sin lectura", "1"), ("M3", "8", "0"), ("M4", "N/A", "4"), ("M5", "3.25", "1")],
    ["medidor", "kwh_txt", "dias_txt"],
)

(bronze
   .withColumn("kwh", F.col("kwh_txt").try_cast("double"))
   .filter(F.col("kwh_txt").isNotNull() & F.col("kwh").isNull())
   .groupBy("kwh_txt").count()
   .show())
```

El resultado lista cada valor inválido y cuántas veces aparece. En Spark 3.5 esas filas se convertían en `NULL` y desaparecían de los promedios. Ahora sabes que no es una fila rara: es un patrón ("sin lectura", "N/A") que hay que tratar con una regla.

## Practica

:::ejercicio pyspark dificultad=Avanzado titulo="silver_lecturas en Spark 4"
El job de abajo funcionaba en Spark 3.5. En el simulador (que se comporta como Spark 4) falla. Corrígelo **sin desactivar ANSI** para que:

1. `silver` tenga `kwh` (double) y `dias` (int) convertidos con `try_cast`, y `kwh_por_dia` calculado con `F.try_divide` (NULL si `dias` es 0 o falta un dato).
2. `invalidos` sea la cantidad de filas donde `kwh_txt` traía texto pero `kwh` quedó en NULL.
3. `promedio` sea el promedio de `kwh_por_dia` redondeado a 2 decimales (los NULL no cuentan).
```python inicial
from pyspark.sql import functions as F

bronze = spark.createDataFrame(
    [("M1", "12.5", "2"), ("M2", "sin lectura", "1"), ("M3", "8", "0"), ("M4", "N/A", "4"), ("M5", "3.25", "1")],
    ["medidor", "kwh_txt", "dias_txt"],
)

silver = (bronze
    .withColumn("kwh", F.col("kwh_txt").cast("double"))
    .withColumn("dias", F.col("dias_txt").cast("int"))
    .withColumn("kwh_por_dia", F.col("kwh") / F.col("dias")))

promedio = round(silver.agg(F.avg("kwh_por_dia")).first()[0], 2)
print(promedio)
```
```python solucion
from pyspark.sql import functions as F

bronze = spark.createDataFrame(
    [("M1", "12.5", "2"), ("M2", "sin lectura", "1"), ("M3", "8", "0"), ("M4", "N/A", "4"), ("M5", "3.25", "1")],
    ["medidor", "kwh_txt", "dias_txt"],
)

silver = (bronze
    .withColumn("kwh", F.col("kwh_txt").try_cast("double"))
    .withColumn("dias", F.col("dias_txt").try_cast("int"))
    .withColumn("kwh_por_dia", F.try_divide(F.col("kwh"), F.col("dias"))))

invalidos = silver.filter(F.col("kwh_txt").isNotNull() & F.col("kwh").isNull()).count()
promedio = round(silver.agg(F.avg("kwh_por_dia")).first()[0], 2)
print(invalidos, promedio)
```
```pista
Ejecuta primero el código tal como está para ver el error y el valor que lo causa. `try_cast` en las dos conversiones y `F.try_divide(F.col("kwh"), F.col("dias"))` para la división.
```
```python test
assert "ansi.enabled" not in _codigo, "No desactives el modo ANSI: corrige las conversiones"
cols = set(silver.columns)
assert {"kwh", "dias", "kwh_por_dia"} <= cols, "silver debe tener kwh, dias y kwh_por_dia"
v = {r["medidor"]: r["kwh_por_dia"] for r in silver.collect()}
assert v["M1"] == 6.25 and v["M5"] == 3.25, "kwh_por_dia de M1 debe ser 6.25 y de M5 3.25"
assert v["M3"] is None, "M3 tiene 0 días: kwh_por_dia debe ser NULL (try_divide)"
assert v["M2"] is None and v["M4"] is None, "Las lecturas inválidas deben quedar en NULL (try_cast)"
assert invalidos == 2, f"Hay 2 lecturas inválidas ('sin lectura' y 'N/A'); obtuviste {invalidos}"
assert promedio == 4.75, f"El promedio de kwh_por_dia debe ser 4.75; obtuviste {promedio}"
```
:::

:::ejercicio pyspark dificultad=Intermedio titulo="La misma corrección en Spark SQL"
Muchos jobs tienen la lógica en `spark.sql(...)`. La vista `lecturas` ya está registrada en el código inicial. Escribe la consulta que devuelva `medidor` y `kwh` (convertido a `DOUBLE` sin fallar con los textos inválidos) y guarda el resultado en `df`.
```python inicial
bronze = spark.createDataFrame(
    [("M1", "12.5"), ("M2", "sin lectura"), ("M3", "8")],
    ["medidor", "kwh_txt"],
)
bronze.createOrReplaceTempView("lecturas")

df = spark.sql("SELECT medidor, CAST(kwh_txt AS DOUBLE) AS kwh FROM lecturas")
df.show()
```
```python solucion
bronze = spark.createDataFrame(
    [("M1", "12.5"), ("M2", "sin lectura"), ("M3", "8")],
    ["medidor", "kwh_txt"],
)
bronze.createOrReplaceTempView("lecturas")

df = spark.sql("SELECT medidor, TRY_CAST(kwh_txt AS DOUBLE) AS kwh FROM lecturas")
df.show()
```
```pista
En SQL la función se llama igual: `TRY_CAST(columna AS TIPO)`.
```
```python test
v = {r["medidor"]: r["kwh"] for r in df.collect()}
assert v == {"M1": 12.5, "M2": None, "M3": 8.0}, f"Esperaba M1=12.5, M2=NULL y M3=8.0; obtuve {v}"
```
:::

## Código con RDDs: no corre en Spark Connect

Los RDDs son la API más antigua de Spark. Spark Connect (lo que usan Databricks Connect y el cómputo *serverless*) solo entiende DataFrames y SQL, así que `sc.parallelize`, `df.rdd` y `spark.sparkContext` fallan ahí. Además, el código con DataFrames lo optimiza Catalyst y el de RDDs no. La migración es reescribir cada `map`/`reduceByKey` como una transformación de columnas:

| RDD | DataFrame |
|---|---|
| `rdd.map(lambda r: (r.canal, r.total))` | `df.select("canal", "total")` |
| `.reduceByKey(lambda a, b: a + b)` | `.groupBy("canal").agg(F.sum("total"))` |
| `.filter(lambda r: r.total > 0)` | `.filter(F.col("total") > 0)` |
| `.collect()` | `.collect()` (igual, y con el mismo cuidado: trae todo al driver) |

:::ejercicio pyspark dificultad=Intermedio titulo="De RDD a DataFrame"
Reescribe el cálculo **sin RDDs** (ni `.rdd`, ni `sparkContext`, ni `parallelize`), usando solo DataFrames. `ventas_por_canal` debe ser un DataFrame con `canal` y `total` (la suma de `total` de los pedidos con `total > 0`), ordenado por `canal`.
```python inicial
from pyspark.sql import functions as F

pedidos = spark.createDataFrame(
    [("web", 120.0), ("app", 80.0), ("web", 30.0), ("tienda", -10.0), ("app", 20.0)],
    ["canal", "total"],
)

pares = (pedidos.rdd
    .filter(lambda r: r.total > 0)
    .map(lambda r: (r.canal, r.total))
    .reduceByKey(lambda a, b: a + b))
ventas_por_canal = spark.createDataFrame(pares, ["canal", "total"]).orderBy("canal")
ventas_por_canal.show()
```
```python solucion
from pyspark.sql import functions as F

pedidos = spark.createDataFrame(
    [("web", 120.0), ("app", 80.0), ("web", 30.0), ("tienda", -10.0), ("app", 20.0)],
    ["canal", "total"],
)

ventas_por_canal = (pedidos
    .filter(F.col("total") > 0)
    .groupBy("canal")
    .agg(F.sum("total").alias("total"))
    .orderBy("canal"))
ventas_por_canal.show()
```
```pista
`filter` con una condición de columna, `groupBy("canal")` y `agg(F.sum("total").alias("total"))`.
```
```python test
import re
assert not re.search(r"\.rdd\b|sparkContext|parallelize|reduceByKey", _codigo), "Quedan usos de RDD: reescríbelo con DataFrames"
filas = [(r["canal"], r["total"]) for r in ventas_por_canal.collect()]
assert filas == [("app", 100.0), ("web", 150.0)], f"Esperaba [('app', 100.0), ('web', 150.0)]; obtuve {filas}"
```
:::

## Un plan de migración de runtime

1. **Inventario** de jobs con su dueño, su versión de runtime y si usan RDDs, UDFs de Python o librerías que tocan la JVM.
2. **Entorno de prueba** con el runtime nuevo y datos reales (una copia o una muestra grande de producción).
3. **Correr cada job** y juntar los errores: `CAST_INVALID_INPUT`, `DIVIDE_BY_ZERO`, desbordamientos, APIs que no existen.
4. **Medir antes de corregir**: con `try_cast`, cuántas filas inválidas hay por columna. Si son muchas, el problema está en el origen y hay que hablar con su dueño.
5. **Corregir de forma explícita**: `try_cast` y `try_divide` donde la regla de negocio acepta un NULL, una tabla de cuarentena donde no, y una métrica de inválidos con alerta.
6. **Comparar resultados**: mismas tablas de salida en los dos runtimes, comparando conteos y sumas. Las diferencias son, justamente, las filas que antes se perdían.

:::errores
- **`spark.sql.ansi.enabled = false` como solución definitiva**: vuelve a perder datos en silencio. Como mucho, es un parche temporal mientras se corrige.
- **`try_cast` sin contar**: el job no falla, pero el problema sigue escondido. Siempre va con una métrica de inválidos.
- **Migrar el runtime directo en producción**: los errores de ANSI aparecen a las 3 de la mañana.
- **Mantener código con RDDs** cuando el equipo se pasa a serverless o a Databricks Connect.
- **Comparar solo que el job "termina"**: hay que comparar los resultados con el runtime anterior.
:::

:::trabajo
- Las migraciones de runtime (por ejemplo, de una LTS a la siguiente) se planifican con meses de anticipación porque las versiones LTS tienen fecha de fin de soporte; el equipo de plataforma publica la fecha y cada equipo migra sus jobs.
- Muchas veces la migración destapa problemas de calidad viejos en el origen: es una oportunidad para documentarlos y agregar reglas de cuarentena.
:::

:::entrevista "Al actualizar a Spark 4, un job falla con CAST_INVALID_INPUT. ¿Qué haces?"
No desactivo ANSI. Primero mido: con `try_cast` cuento qué valores no se pueden convertir y cuántas filas son, para saber si es un caso aislado o un patrón del origen. Después corrijo de forma explícita: `try_cast` donde un NULL es aceptable según la regla de negocio, cuarentena donde no, y una métrica de inválidos con alerta. Comparo los resultados con el runtime anterior; la diferencia son las filas que antes se perdían en silencio, y lo informo al dueño del dato.
:::

:::ejercicio quiz dificultad=Intermedio
Un compañero propone `spark.conf.set("spark.sql.ansi.enabled", "false")` para que el job vuelva a andar en Spark 4. ¿Qué respondes?

- [ ] Es la solución recomendada
- [x] Es solo un parche: vuelve a convertir en NULL los valores inválidos sin avisar. Hay que medir los inválidos y usar `try_cast` o cuarentena de forma explícita
- [ ] Hace que Spark 4 sea más rápido
- [ ] Desactiva Spark Connect
:::
