---
titulo: "Caso práctico II: el pipeline en PySpark"
nivel: Experto
duracion: 60
resumen: Construye las capas silver y gold del proyecto con PySpark.
---

Ahora construimos las tablas que alimentan el tablero. Cada ejercicio es una pieza del pipeline; en Databricks, cada una sería una tarea de un job.

## El diseño antes del código

Un pipeline profesional se diseña antes de escribirlo. Para este proyecto, el diseño es:

```text
bronze (crudo)            silver (limpio, grano fino)            gold (negocio)
pedidos ─────────┐
detalle_pedidos ─┼──▶  silver.fct_ventas  ──┬──▶ gold.ventas_mensuales_pais   → tablero de ventas
productos ───────┘     (una fila por línea)  └──▶ gold.dim_clientes             → CRM / marketing
clientes ─────────────────────────────────────────┘
```

| Tabla | Grano | Para qué | Decisiones clave |
|---|---|---|---|
| `silver.fct_ventas` | Una fila por **línea de pedido** | La base de todos los cálculos de ventas | Excluir cancelados aquí, **una sola vez**; calcular `importe` neto con la regla oficial |
| `gold.ventas_mensuales_pais` | Una fila por **mes y país** | El tablero de ventas | Variación contra el mes anterior **del mismo país** (ventana particionada por país) |
| `gold.dim_clientes` | Una fila por **cliente** | Segmentación, CRM | Incluir clientes **sin** compras (left join), con métricas en 0 o nulas |

Fíjate en el principio de la arquitectura medallón: las reglas de negocio (qué es una venta, cómo se calcula el importe) se aplican **en silver**, y las tablas gold **reutilizan** silver. Si mañana cambia la regla del importe, se corrige en un solo lugar y todo lo de gold se recalcula coherente.

:::tip Cómo resolver cada ejercicio
1. Escribe el grano en un comentario (`# grano: mes x país`).
2. Construye el resultado en variables con nombre (`ped`, `lineas`, `mensual`), revisando cada una con `show(5)`.
3. Compara contra la consulta SQL equivalente del caso práctico I: los totales deben coincidir.
:::

:::ejercicio pyspark titulo="silver.fct_ventas"
Construye la tabla de hechos con grano “línea de pedido”, solo pedidos no cancelados: `detalle_id`, `pedido_id`, `fecha_pedido`, `anio` (año), `cliente_id`, `producto_id`, `canal`, `cantidad`, `importe` (neto, redondeado a 2).
```python solucion
from pyspark.sql import functions as F

ped = spark.table("pedidos").filter(F.col("estado") != "cancelado").select("pedido_id", "fecha_pedido", "cliente_id", "canal")
resultado = (spark.table("detalle_pedidos")
               .join(ped, "pedido_id")
               .withColumn("anio", F.year("fecha_pedido"))
               .withColumn("importe", F.round(F.col("cantidad") * F.col("precio_unitario") * (1 - F.col("descuento")), 2))
               .select("detalle_id", "pedido_id", "fecha_pedido", "anio", "cliente_id", "producto_id", "canal", "cantidad", "importe"))
```
:::

:::ejercicio pyspark titulo="gold.ventas_mensuales_pais"
Ventas por **mes** (`mes` como texto `yyyy-MM`) y `pais` del cliente, con `ventas` (redondeado a 2), `pedidos` (distintos) y la **variación** contra el mes anterior del mismo país (`var_pct`, redondeado a 2, NULL en el primer mes). Solo pedidos no cancelados.
```python solucion
from pyspark.sql import functions as F
from pyspark.sql.window import Window

ped = (spark.table("pedidos").filter(F.col("estado") != "cancelado")
         .join(spark.table("clientes").select("cliente_id", "pais"), "cliente_id"))
lin = spark.table("detalle_pedidos").withColumn("imp", F.col("cantidad") * F.col("precio_unitario") * (1 - F.col("descuento")))
m = (lin.join(ped, "pedido_id")
        .groupBy(F.date_format("fecha_pedido", "yyyy-MM").alias("mes"), "pais")
        .agg(F.sum("imp").alias("v"), F.countDistinct("pedido_id").alias("pedidos")))
w = Window.partitionBy("pais").orderBy("mes")
resultado = (m.withColumn("ant", F.lag("v").over(w))
              .select("mes", "pais", F.round("v", 2).alias("ventas"), "pedidos",
                      F.round((F.col("v") - F.col("ant")) / F.col("ant") * 100, 2).alias("var_pct")))
```
:::

:::ejercicio pyspark titulo="gold.dim_clientes"
Dimensión de clientes enriquecida: `cliente_id`, `nombre_completo`, `pais`, `segmento`, `primera_compra`, `ultima_compra`, `pedidos` (no cancelados) y `es_activo` (`True` si su última compra fue en 2024). Incluye a **todos** los clientes (los que nunca compraron con `pedidos = 0` y `es_activo = False`).
```python solucion
from pyspark.sql import functions as F

agg = (spark.table("pedidos").filter(F.col("estado") != "cancelado")
         .groupBy("cliente_id")
         .agg(F.min("fecha_pedido").alias("primera_compra"), F.max("fecha_pedido").alias("ultima_compra"), F.count("*").alias("pedidos")))
resultado = (spark.table("clientes")
               .join(agg, "cliente_id", "left")
               .select("cliente_id",
                       F.concat_ws(" ", "nombre", "apellido").alias("nombre_completo"),
                       "pais", "segmento", "primera_compra", "ultima_compra",
                       F.coalesce("pedidos", F.lit(0)).alias("pedidos"),
                       F.coalesce(F.year("ultima_compra") == 2024, F.lit(False)).alias("es_activo")))
```
```pista
LEFT JOIN desde `clientes` hacia el agregado; `F.coalesce` para reemplazar los NULL por 0 / False.
```
:::
