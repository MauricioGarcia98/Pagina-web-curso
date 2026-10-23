---
titulo: Leer y escribir datos
nivel: Intermedio
duracion: 30
resumen: spark.read y df.write: formatos, opciones, esquemas explícitos, modos de escritura y particionado.
---

## Leer

```python norun
# CSV: con encabezado e infiriendo tipos (cómodo, pero lento y arriesgado en producción)
df = spark.read.option("header", True).option("inferSchema", True).csv("/datos/ventas.csv")

# CSV con esquema explícito (recomendado)
df = (spark.read
        .format("csv")
        .option("header", True)
        .option("sep", ";")
        .schema("pedido_id INT, fecha DATE, monto DOUBLE")
        .load("/datos/ventas/*.csv"))

# Parquet, JSON, Delta y tablas
df = spark.read.parquet("/lake/silver/pedidos")
df = spark.read.json("/lake/bronze/eventos/2024/*/*.json")
df = spark.read.format("delta").load("/lake/silver/clientes")
df = spark.read.table("main.silver.clientes")     # o spark.table(...)
```

:::tip Esquemas explícitos en producción
`inferSchema` lee los datos dos veces y puede adivinar mal (un código postal “01234” se vuelve el número 1234). En pipelines productivos define el esquema: es más rápido y detecta cambios en el origen.
:::

En el simulador hay un sistema de archivos “de juguete”: cada tabla de ejemplo también se puede leer como `"/datos/<tabla>.csv"` o `.parquet`.

```python
df = spark.read.option("header", True).csv("/datos/productos.csv")
df.printSchema()      # sin inferSchema: todo es string, igual que en Spark
df2 = spark.read.option("header", True).option("inferSchema", True).csv("/datos/productos.csv")
df2.printSchema()
```

## Escribir

```python norun
(df.write
   .format("delta")                 # o .parquet(...), .csv(...), .json(...)
   .mode("overwrite")               # "append", "overwrite", "error" (por defecto), "ignore"
   .partitionBy("anio", "mes")
   .save("/lake/silver/pedidos"))

df.write.mode("append").saveAsTable("main.silver.pedidos")
```

| Modo | Si el destino ya existe… |
|---|---|
| `error` / `errorifexists` | Falla (por defecto) |
| `overwrite` | Reemplaza todo |
| `append` | Agrega las filas |
| `ignore` | No hace nada |

:::experto Sobrescribir solo algunas particiones
`overwrite` con `partitionBy` puede borrar **todas** las particiones. Para reemplazar solo las del lote actual: en Delta usa `.option("replaceWhere", "fecha = '2024-12-31'")`; en Parquet, `spark.conf.set("spark.sql.sources.partitionOverwriteMode", "dynamic")`. Así un pipeline diario es **idempotente**: reprocesar un día no duplica datos.
:::

## Ejercicios

:::ejercicio pyspark
Lee `"/datos/productos.csv"` **con encabezado y sin inferir tipos**, y castea `precio` a `double`. Devuelve `producto_id`, `nombre` y `precio` de los productos con precio mayor a `2000`.
```python solucion
from pyspark.sql import functions as F

df = spark.read.option("header", True).csv("/datos/productos.csv")
resultado = (df.withColumn("precio", F.col("precio").cast("double"))
               .filter(F.col("precio") > 2000)
               .select("producto_id", "nombre", "precio"))
```
```pista
Sin `inferSchema` todas las columnas son texto: compara después de `.cast("double")`.
```
:::

:::ejercicio pyspark
Escribe la tabla `pedidos` filtrada al canal `telefono` en la ruta `"/lake/silver/pedidos_telefono"` en formato parquet, modo `overwrite`, particionada por `estado`. Luego **léela de nuevo** desde esa ruta y guarda en `resultado` el conteo por `estado` (columnas `estado`, `count`).
```python solucion
from pyspark.sql import functions as F

(spark.table("pedidos")
   .filter(F.col("canal") == "telefono")
   .write.mode("overwrite").partitionBy("estado")
   .parquet("/lake/silver/pedidos_telefono"))

resultado = spark.read.parquet("/lake/silver/pedidos_telefono").groupBy("estado").count()
```
:::

:::ejercicio quiz
Un job diario escribe con `mode("append")` y ayer se ejecutó dos veces por error. ¿Qué pasó?

- [ ] Nada, Spark detecta duplicados
- [x] Los datos de ese día quedaron duplicados
- [ ] La segunda ejecución falló
- [ ] Se sobrescribió la tabla
```explicacion
`append` agrega siempre. Para que un pipeline sea **idempotente**, usa sobrescritura por partición (`replaceWhere`) o `MERGE`.
```
:::
