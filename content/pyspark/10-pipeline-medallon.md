---
titulo: Proyecto: pipeline bronze → silver → gold
nivel: Avanzado
duracion: 45
resumen: Un pipeline completo en PySpark con funciones reutilizables, idempotente y probado.
---

Vamos a construir, paso a paso, un pipeline como los que se hacen en Databricks. Ejecuta cada bloque con **▶ Probar**.

## La arquitectura medallón

Es la forma estándar de organizar un lakehouse: los datos pasan por tres capas, cada una más limpia y más cercana al negocio que la anterior.

| Capa | Contenido | Reglas | Quién la usa |
|---|---|---|---|
| **Bronze** | Datos **crudos**, tal como llegaron, más metadatos de ingesta (origen, fecha de carga) | Inmutable: nunca se corrige, solo se agrega | Data engineers (para reprocesar) |
| **Silver** | Datos **limpios**: tipos correctos, formatos normalizados, sin duplicados, validados | Una fila por entidad o evento; registros inválidos en cuarentena | Data engineers, data scientists |
| **Gold** | **Métricas de negocio** y tablas listas para BI: agregados, esquemas estrella | Nombres de negocio, reglas acordadas con el área | Analistas, dashboards, directorio |

¿Por qué no ir directo de crudo a gold? Porque si mañana cambia una regla de negocio (por ejemplo, cómo se calcula una venta neta), puedes **recalcular** gold desde silver sin volver a pedir los datos al origen. Y si un día se descubre un error en la limpieza, bronze guarda la versión original para reprocesar.

## La estructura: funciones puras de DataFrame a DataFrame

En código profesional, cada transformación es una **función que recibe un DataFrame y devuelve otro**, sin leer ni escribir nada por su cuenta. Así se pueden **probar** por separado (con un DataFrame chiquito hecho a mano) y **componer** con `.transform()`:

```text
df.transform(limpiar).transform(enriquecer)   ≡   enriquecer(limpiar(df))
```

`.transform(f)` simplemente llama a `f(df)`, pero permite escribir la cadena en el orden en que ocurren los pasos. El código de abajo separa claramente **qué** hace cada capa; la lectura (`spark.table`) y la escritura (`saveAsTable`) quedan al final, fuera de las funciones.

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

```recorrido
titulo: El pipeline medallón, capa por capa
estacion src: Origen | icono=base
estacion bronze: Bronze | icono=archivo
estacion silver: Silver | icono=escudo
estacion gold: Gold | icono=dashboard
estacion write: Escritura | icono=check
paso src: Los datos del sistema de origen
El ERP tiene la tabla `pedidos` tal cual la usa la aplicación.
>>> tabla
pedido_id,cliente_id,fecha_pedido,estado,canal
101,73,2022-01-14,entregado,web
102,361,2022-01-15,entregado,web
103,1229,2022-01-15,enviado,web
104,751,2022-01-15,entregado,web
paso bronze: Bronze: igual que el origen + metadatos
`a_bronze` **no cambia** los datos: solo agrega de dónde vinieron y cuándo se cargaron. Si algo sale mal después, siempre puedes reprocesar desde aquí.
>>> tabla
pedido_id,estado,canal,_origen,_fecha_ingesta
101,entregado,web,erp,2025-01-01 03:00:00
102,entregado,web,erp,2025-01-01 03:00:00
103,enviado,web,erp,2025-01-01 03:00:00
104,entregado,web,erp,2025-01-01 03:00:00
paso silver: Silver: limpio y sin duplicados
`limpiar_pedidos` normaliza textos, descarta filas sin clave y deja una fila por `pedido_id`. `lineas_con_importe` calcula el importe de cada línea.
>>> tabla
pedido_id,producto_id,cantidad,precio_unitario,descuento,importe
101,119,2,882.89,0.15,1500.91
101,146,1,1532.69,0,1532.69
102,282,1,112.49,0,112.49
102,84,1,9.89,0.05,9.4
paso gold: Gold: la métrica de negocio
`ventas_diarias` une silver, excluye los cancelados y resume por día y canal. Es la tabla que lee el tablero.
>>> python
gold = ventas_diarias(silver_pedidos, silver_lineas)
paso write: Se escribe al final
Solo la última línea escribe (`saveAsTable`). Estos son los 5 días y canales con más ventas, calculados sobre los datos reales:
>>> tabla
fecha_pedido,canal,ventas,pedidos,clientes
2024-07-15,web,32072.1,12,12
2024-09-13,web,27415.1,5,5
2024-07-11,web,26682.4,13,13
2024-12-21,web,24399.4,10,9
2024-12-22,web,21524.8,8,8
```

## Principios que hacen un pipeline “de producción”

- **Idempotencia**: correrlo dos veces con los mismos datos deja el mismo resultado (sobrescribe por partición o usa `MERGE`; nunca `append` a ciegas).
- **Incrementalidad**: procesar solo lo nuevo (por fecha de ingesta, Auto Loader, Change Data Feed o `MERGE`).
- **Funciones puras + tests**: cada transformación se prueba con un DataFrame chiquito hecho a mano (`spark.createDataFrame`) y `pytest`.
- **Parámetros, no constantes**: fechas, rutas y entornos llegan como parámetros del job (widgets en Databricks, variables en Declarative Automation Bundles).
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
