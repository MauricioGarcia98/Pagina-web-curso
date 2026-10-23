---
titulo: Proyecto: pipeline bronze → silver → gold
nivel: Avanzado
duracion: 45
resumen: Un pipeline completo en PySpark con funciones reutilizables, idempotente y probado.
---

Vamos a construir, paso a paso, un pipeline como los que se hacen en Databricks. Ejecuta cada bloque con **▶ Probar**.

## La estructura: funciones puras de DataFrame a DataFrame

En código profesional, cada transformación es una **función que recibe un DataFrame y devuelve otro**. Así se pueden **probar** por separado y **componer** con `.transform()`.

```python
from pyspark.sql import DataFrame, functions as F
from pyspark.sql.window import Window

# ---------- BRONZE: datos crudos + metadatos de ingesta ----------
def a_bronze(df: DataFrame, origen: str) -> DataFrame:
    return (df.withColumn("_origen", F.lit(origen))
              .withColumn("_fecha_ingesta", F.lit("2025-01-01 03:00:00").cast("timestamp")))

# ---------- SILVER: limpio, tipado, deduplicado ----------
def limpiar_pedidos(df: DataFrame) -> DataFrame:
    w = Window.partitionBy("pedido_id").orderBy(F.col("_fecha_ingesta").desc())
    return (df.withColumn("estado", F.lower(F.trim("estado")))
              .withColumn("canal", F.lower(F.trim("canal")))
              .filter(F.col("pedido_id").isNotNull())
              .withColumn("_rn", F.row_number().over(w))
              .filter("_rn = 1").drop("_rn"))

def lineas_con_importe(det: DataFrame) -> DataFrame:
    return det.withColumn("importe", F.round(F.col("cantidad") * F.col("precio_unitario") * (1 - F.col("descuento")), 2))

# ---------- GOLD: métricas de negocio ----------
def ventas_diarias(pedidos: DataFrame, lineas: DataFrame) -> DataFrame:
    return (lineas.join(pedidos.filter(F.col("estado") != "cancelado"), "pedido_id")
                  .groupBy("fecha_pedido", "canal")
                  .agg(F.round(F.sum("importe"), 2).alias("ventas"),
                       F.countDistinct("pedido_id").alias("pedidos"),
                       F.countDistinct("cliente_id").alias("clientes")))

bronze_pedidos = a_bronze(spark.table("pedidos"), "erp")
silver_pedidos = bronze_pedidos.transform(limpiar_pedidos)
silver_lineas = spark.table("detalle_pedidos").transform(lineas_con_importe)
gold = ventas_diarias(silver_pedidos, silver_lineas)

gold.write.mode("overwrite").saveAsTable("gold_ventas_diarias")
spark.table("gold_ventas_diarias").orderBy(F.desc("ventas")).show(5)
```

## Principios que hacen un pipeline “de producción”

- **Idempotencia**: correrlo dos veces con los mismos datos deja el mismo resultado (sobrescribe por partición o usa `MERGE`; nunca `append` a ciegas).
- **Incrementalidad**: procesar solo lo nuevo (por fecha de ingesta, Auto Loader, Change Data Feed o `MERGE`).
- **Funciones puras + tests**: cada transformación se prueba con un DataFrame chiquito hecho a mano (`spark.createDataFrame`) y `pytest`.
- **Parámetros, no constantes**: fechas, rutas y entornos llegan como parámetros del job (widgets en Databricks, variables en Asset Bundles).
- **Observabilidad**: registra cuántas filas entran, salen y se descartan en cada paso.

## Un test de la transformación (estilo pytest)

```python
from pyspark.sql import functions as F

def lineas_con_importe(det):
    return det.withColumn("importe", F.round(F.col("cantidad") * F.col("precio_unitario") * (1 - F.col("descuento")), 2))

def test_lineas_con_importe():
    entrada = spark.createDataFrame([(1, 2, 10.0, 0.1), (2, 1, 5.0, 0.0)], ["detalle_id", "cantidad", "precio_unitario", "descuento"])
    salida = {r["detalle_id"]: r["importe"] for r in lineas_con_importe(entrada).collect()}
    assert salida == {1: 18.0, 2: 5.0}, salida

test_lineas_con_importe()
print("✔ test OK")
```

## Ejercicios

:::ejercicio pyspark
Escribe la función `clientes_silver(df)` que: normalice `email` (trim + lower), deje `pais` con `initcap(trim(...))`, y **descarte** los clientes sin email. Luego aplícala con `.transform()` a `spark.table("clientes")` y guarda en `resultado` las columnas `cliente_id`, `email`, `pais`.
```python inicial
from pyspark.sql import DataFrame, functions as F

def clientes_silver(df: DataFrame) -> DataFrame:
    ...

# resultado = spark.table("clientes").transform(clientes_silver).select(...)
```
```python solucion
from pyspark.sql import DataFrame, functions as F

def clientes_silver(df: DataFrame) -> DataFrame:
    return (df.withColumn("email", F.lower(F.trim("email")))
              .withColumn("pais", F.initcap(F.trim("pais")))
              .filter(F.col("email").isNotNull()))

resultado = spark.table("clientes").transform(clientes_silver).select("cliente_id", "email", "pais")
```
:::

:::ejercicio pyspark
Construye una tabla **gold** de **clientes RFM**: para cada cliente con pedidos no cancelados, calcula `recencia` (días entre su último pedido y `2024-12-31`), `frecuencia` (cantidad de pedidos) y `monto` (ventas netas redondeadas a 2). Columnas: `cliente_id`, `recencia`, `frecuencia`, `monto`.
```python solucion
from pyspark.sql import functions as F

ped = spark.table("pedidos").filter(F.col("estado") != "cancelado")
det = (spark.table("detalle_pedidos")
         .withColumn("importe", F.col("cantidad") * F.col("precio_unitario") * (1 - F.col("descuento")))
         .groupBy("pedido_id").agg(F.sum("importe").alias("importe")))
resultado = (ped.join(det, "pedido_id")
               .groupBy("cliente_id")
               .agg(F.datediff(F.lit("2024-12-31"), F.max("fecha_pedido")).alias("recencia"),
                    F.count("*").alias("frecuencia"),
                    F.round(F.sum("importe"), 2).alias("monto")))
```
```pista
Primero suma el importe por pedido, únelo a los pedidos no cancelados y agrega por cliente: `F.max("fecha_pedido")` para la recencia, `F.count("*")` para la frecuencia y `F.sum` para el monto.
```
:::
