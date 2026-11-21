---
titulo: "Caso práctico II: el pipeline en PySpark"
nivel: Experto
duracion: 60
resumen: Construye las capas silver y gold del proyecto con PySpark.
objetivos: Diseñar las capas silver y gold antes de programar | Construir el pipeline en PySpark | Validar la salida de cada capa
autoevaluacion: ¿Qué decides en el diseño antes de escribir código? | ¿Qué pruebas harías sobre la capa gold?
---

Ahora construimos las tablas que alimentan el tablero. Cada ejercicio es una pieza del pipeline; en Databricks, cada una sería una tarea de un job.

## El diseño antes del código

Un pipeline profesional se diseña antes de escribirlo. Para este proyecto, el diseño es:

```diagrama
titulo: El diseño del pipeline: de bronze a gold
nodo p: pedidos | icono=tabla | col=0 | fila=0 | color=naranja
nodo d: detalle_pedidos | icono=tabla | col=0 | fila=1 | color=naranja
nodo pr: productos | icono=tabla | col=0 | fila=2 | color=naranja
nodo c: clientes | icono=tabla | col=0 | fila=3 | color=naranja
nodo f: silver.fct_ventas | icono=spark | col=1 | fila=1 | color=gris | sub=una fila por línea de pedido
nodo vm: gold.ventas_mensuales_pais | icono=tabla | col=2 | fila=0 | color=amarillo
nodo dc: gold.dim_clientes | icono=tabla | col=2 | fila=2 | color=amarillo
nodo tb: Tablero de ventas | icono=dashboard | col=3 | fila=0 | color=verde
nodo crm: CRM / marketing | icono=correo | col=3 | fila=2 | color=verde
grupo gb: bronze (crudo) | nodos=p,d,pr,c | color=naranja
flecha p -> f
flecha d -> f
flecha pr -> f
flecha f -> vm
flecha f -> dc
flecha c -> dc
flecha vm -> tb
flecha dc -> crm
```

| Tabla | Grano | Para qué | Decisiones clave |
|---|---|---|---|
| `silver.fct_ventas` | Una fila por **línea de pedido** | La base de todos los cálculos de ventas | Excluir cancelados aquí, **una sola vez**; calcular `importe` neto con la regla oficial |
| `gold.ventas_mensuales_pais` | Una fila por **mes y país** | El tablero de ventas | Variación contra el mes anterior **del mismo país** (ventana particionada por país) |
| `gold.dim_clientes` | Una fila por **cliente** | Segmentación, CRM | Incluir clientes **sin** compras (left join), con métricas en 0 o nulas |

Fíjate en el principio de la arquitectura medallón: las reglas de negocio (qué es una venta, cómo se calcula el importe) se aplican **en silver**, y las tablas gold **reutilizan** silver. Si mañana cambia la regla del importe, se corrige en un solo lugar y todo lo de gold se recalcula coherente.

```recorrido
titulo: Un pedido, de bronze a las dos tablas gold
estacion bronze: Bronze | icono=archivo
estacion silver: silver.fct_ventas | icono=escudo
estacion mensual: ventas_mensuales_pais | icono=dashboard
estacion dim: dim_clientes | icono=usuario
estacion regla: La regla | icono=check
paso bronze: Las tablas de origen
El pedido 101 en `pedidos`, con su cliente.
>>> tabla
pedido_id,cliente_id,pais,fecha_pedido,estado
101,73,México,2022-01-14,entregado
paso silver: silver.fct_ventas: una fila por línea
Se excluyen los cancelados y se calcula el `importe` neto **aquí, una sola vez**.
>>> tabla
pedido_id,producto_id,pais,mes,importe
101,119,México,2022-01,1500.91
101,146,México,2022-01,1532.69
paso mensual: gold.ventas_mensuales_pais: mes × país
Ese pedido suma en la fila de su mes y su país, junto con todos los demás.
>>> tabla
mes,pais,ventas
2022-01,México,53082.63
paso dim: gold.dim_clientes: una fila por cliente
El mismo pedido también suma en la fila de su cliente. Los clientes **sin** compras aparecen igual (left join), con 0.
>>> tabla
cliente_id,nombre,pedidos
1,Lucía,0
73,Emilio,23
paso regla: Por qué gold lee de silver
Si mañana cambia la regla del importe, se corrige en `fct_ventas` y las dos tablas gold se recalculan coherentes.
>>> texto
bronze ──▶ silver.fct_ventas ──┬──▶ gold.ventas_mensuales_pais
                                └──▶ gold.dim_clientes
```

:::tip Cómo resolver cada ejercicio
1. Escribe el grano en un comentario (`# grano: mes x país`).
2. Construye el resultado en variables con nombre (`ped`, `lineas`, `mensual`), revisando cada una con `show(5)`.
3. Compara contra la consulta SQL equivalente del caso práctico I: los totales deben coincidir.
:::

:::practica pyspark El pipeline del caso, en funciones que se pueden probar
1. Ejecuta: cada paso del pipeline es una función (leer, limpiar, agregar) que se puede probar sola.
2. El resultado es la tabla gold de ventas por canal y mes.
3. Agrega un `assert` que verifique que no hay meses repetidos por canal (el grano de la tabla).

```python norun
from pyspark.sql import DataFrame, functions as F

def leer() -> DataFrame:
    return spark.table("pedidos").join(spark.table("detalle_pedidos"), "pedido_id")

def limpiar(df: DataFrame) -> DataFrame:
    return (df.filter(F.col("estado") == "entregado")
              .withColumn("importe", F.col("cantidad") * F.col("precio_unitario") * (1 - F.col("descuento"))))

def agregar(df: DataFrame) -> DataFrame:
    return (df.withColumn("mes", F.substring(F.col("fecha_pedido").cast("string"), 1, 7))
              .groupBy("canal", "mes").agg(F.round(F.sum("importe"), 2).alias("ventas")))

gold = agregar(limpiar(leer()))
gold.orderBy("mes", "canal").show(8)
assert gold.count() == gold.select("canal", "mes").distinct().count()
```

Reto: escribe un test con un DataFrame de 3 filas armado a mano que pruebe `limpiar` (que excluye un pedido cancelado).

Documentación oficial: [probar PySpark](https://spark.apache.org/docs/latest/api/python/getting_started/testing_pyspark.html) · [API de DataFrame](https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/dataframe.html)
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

:::errores
- **Deduplicar con `dropDuplicates(["clave"])`** cuando importa cuál fila queda: el resultado cambia entre ejecuciones. Usa `row_number()` con un orden explícito.
- **`cast` sobre datos sucios sin `try_cast`**: en Spark 4 el job falla con `CAST_INVALID_INPUT`; con `try_cast` decides y cuentas los inválidos.
- **Escribir silver con `mode("overwrite")` completo todos los días**: reprocesa todo y, si falla a mitad, deja la tabla vacía. Usa MERGE o reemplaza solo la partición del día.
- **Gold que se calcula desde bronze** saltándose silver: la limpieza se repite en cada tabla y con diferencias.
- **`collect()` o `toPandas()` sobre tablas grandes**: trae todo al driver y lo tumba.
:::

:::trabajo
- En Databricks, este código vive en archivos `.py` con funciones que se prueban con datos chicos en CI, y un notebook o un job las llama con la fecha a procesar como parámetro.
- Cada tabla de silver y gold tiene dueño, descripción y tests en Unity Catalog o en dbt; las métricas de cada ejecución (filas leídas, escritas, en cuarentena) se guardan.
:::

:::entrevista "¿Cómo construirías la capa silver de pedidos con PySpark?"
Leería de bronze solo lo nuevo, con Auto Loader o un filtro por fecha de ingesta. Normalizaría tipos con `try_cast`, textos y fechas, aplicaría reglas de validación y enviaría las filas inválidas a una tabla de cuarentena con el motivo. Deduplicaría el lote con `row_number()` por `pedido_id` ordenando por la fecha de ingesta, y haría MERGE en la tabla Delta de silver para insertar los nuevos y actualizar los que cambiaron de estado. Agregaría columnas de auditoría y registraría las métricas de cada ejecución.
:::
