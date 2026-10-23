---
titulo: Particiones, shuffle, joins y skew
nivel: Avanzado
duracion: 35
resumen: Cómo Spark mueve datos, estrategias de join, data skew y Adaptive Query Execution.
---

## repartition vs coalesce

| Método | Qué hace | Shuffle | Cuándo |
|---|---|---|---|
| `df.repartition(200)` | Redistribuye en N particiones parejas | Sí | Aumentar paralelismo o equilibrar |
| `df.repartition("pais")` | Agrupa por columna (filas del mismo país juntas) | Sí | Antes de escribir particionado o de joins repetidos |
| `df.coalesce(10)` | Junta particiones existentes sin redistribuir | No | **Reducir** particiones (por ejemplo, antes de escribir pocos archivos) |

`spark.sql.shuffle.partitions` (por defecto **200**) define cuántas particiones salen de cada shuffle. Para datos chicos es demasiado; para muy grandes, poco. Con AQE activado (por defecto en Spark 3.2+ y Databricks), Spark lo ajusta solo.

## Estrategias de join

Spark elige un algoritmo según el tamaño de las tablas:

**1. Broadcast hash join** — si una tabla es **chica** (por defecto < 10 MB, configurable con `spark.sql.autoBroadcastJoinThreshold`), Spark envía una copia completa a cada executor. La tabla grande **no se mueve**: ¡sin shuffle!

```python norun
from pyspark.sql import functions as F
ventas.join(F.broadcast(dim_paises), "pais_id")   # forzar el broadcast con un hint
```

**2. Sort-merge join** — el estándar para dos tablas grandes: ambas se **reparten por la clave** (shuffle), se **ordenan** y se recorren a la par.

**3. Shuffle hash join** — se reparten por clave y se construye una tabla hash en cada partición.

:::analogia Broadcast
Si cada obrero necesita consultar una lista de 20 códigos de país, es más rápido darle **una fotocopia a cada uno** que hacer que todos los obreros se reorganicen por país.
:::

## Data skew: el enemigo silencioso

**Skew** (sesgo) es cuando unas pocas claves concentran la mayoría de los datos. Ejemplo: en un join por `cliente_id`, un “cliente” `NULL` o `0` (anónimo) con el 40% de las filas. La partición de esa clave es gigante: **una tarea tarda 2 horas mientras las otras 199 terminan en 2 minutos**.

Síntomas en la Spark UI: un stage donde casi todas las tareas terminan rápido y unas pocas tardan muchísimo, o errores de memoria en una sola tarea.

Soluciones:

- **AQE skew join** (Spark 3+): `spark.sql.adaptive.skewJoin.enabled=true` divide automáticamente las particiones gigantes.
- **Filtrar o tratar aparte** las claves problemáticas (los NULL no hacen match en un inner join: fíltralos antes).
- **Broadcast** de la tabla chica, si es posible.
- **Salting**: agregar un sufijo aleatorio a la clave caliente para repartirla en N particiones (y replicar la otra tabla N veces).

## Adaptive Query Execution (AQE)

Con AQE, Spark **reoptimiza el plan durante la ejecución** usando estadísticas reales de cada stage terminado:

- **Une particiones chicas** después de un shuffle (adiós a las 200 particiones vacías).
- **Cambia a broadcast join** si descubre que una tabla resultó chica.
- **Divide particiones con skew** en los joins.

Está activado por defecto en Databricks y en Spark ≥ 3.2 (`spark.sql.adaptive.enabled=true`).

:::ejercicio quiz
Unes una tabla de 2 TB de ventas con una tabla de 300 filas de países. ¿Qué estrategia de join es la ideal?

- [ ] Sort-merge join
- [x] Broadcast hash join
- [ ] Cross join
- [ ] Hacer `collect()` de ventas
:::

:::ejercicio quiz
En la Spark UI ves que 199 tareas de un stage terminaron en 1 minuto y 1 tarea lleva 50 minutos. ¿Cuál es la causa más probable?

- [ ] Falta de memoria en el driver
- [x] Data skew: una clave concentra muchísimas filas
- [ ] Pocas particiones
- [ ] El archivo está en CSV
:::

:::ejercicio quiz
Quieres escribir un resultado pequeño en **un solo archivo** sin provocar un shuffle. ¿Qué usas antes de escribir?

- [ ] `repartition(1)`
- [x] `coalesce(1)`
- [ ] `distinct()`
- [ ] `cache()`
:::

:::ejercicio pyspark
Practica con el simulador: une `detalle_pedidos` con `productos` usando un **broadcast** de productos (la tabla chica) por `producto_id`, y calcula las unidades vendidas por `marca`. Guarda en `resultado` un DataFrame con columnas `marca` y `unidades`.
```python inicial
from pyspark.sql import functions as F

det = spark.table("detalle_pedidos")
prod = spark.table("productos")
# resultado = ...
```
```python solucion
from pyspark.sql import functions as F

det = spark.table("detalle_pedidos")
prod = spark.table("productos")
resultado = (det.join(F.broadcast(prod), "producto_id")
                .groupBy("marca")
                .agg(F.sum("cantidad").alias("unidades")))
```
:::
