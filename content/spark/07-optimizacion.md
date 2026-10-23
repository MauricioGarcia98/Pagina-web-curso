---
titulo: Optimización y tuning de Spark
nivel: Avanzado
duracion: 35
resumen: Diagnóstico con la Spark UI, caché, archivos pequeños, configuración de memoria y checklist de rendimiento.
---

## Primero: medir

Nunca optimices a ciegas. La **Spark UI** muestra:

- **Jobs / Stages**: cuánto tarda cada etapa, cuántas tareas, cuánto se leyó y cuánto se movió en **shuffle**.
- **Tareas de un stage**: si hay *skew* (unas pocas tareas mucho más lentas), *spill* (datos que no entraron en memoria y se escribieron a disco) o GC excesivo.
- **SQL / DataFrame**: el plan físico con métricas por operador (filas, tiempo).

`df.explain("formatted")` te muestra el plan antes de ejecutar: busca `Exchange` (shuffle), `BroadcastHashJoin` vs `SortMergeJoin`, y `PushedFilters` en la lectura.

## Checklist de rendimiento

| Problema | Solución |
|---|---|
| Leer columnas o filas de más | Selecciona solo lo necesario y **filtra temprano** (aprovecha pushdown y partition pruning) |
| Formato CSV/JSON en tablas grandes | Convierte a **Parquet/Delta** |
| Muchos archivos pequeños | `OPTIMIZE` (Delta), *auto compaction*, `coalesce` antes de escribir |
| Join con una tabla chica | `broadcast()` |
| Skew en joins o agregaciones | AQE skew join, filtrar NULL, *salting* |
| Particiones de shuffle inadecuadas | AQE (`spark.sql.adaptive.enabled`) o ajustar `spark.sql.shuffle.partitions` |
| Reusar un DataFrame costoso varias veces | `cache()` / `persist()` (¡y `unpersist()` al terminar!) |
| UDFs de Python lentas | Usa funciones nativas de `pyspark.sql.functions`; si no queda otra, **pandas UDF** (vectorizadas con Arrow) |
| `collect()` o `toPandas()` de datos grandes | Agrega o escribe en Spark; trae al driver solo resultados chicos |
| `count()` innecesarios para “ver si funciona” | Cada acción re-ejecuta el plan: evítalas en producción |

## Caché: cuándo sí y cuándo no

```python norun
clientes_activos = (spark.table("silver.clientes")
                      .filter("activo = true")
                      .cache())                  # perezoso: se materializa con la primera acción
clientes_activos.count()                         # ahora sí queda en memoria
reporte_a = clientes_activos.groupBy("pais").count()
reporte_b = clientes_activos.join(pedidos, "cliente_id")
clientes_activos.unpersist()
```

Úsala solo si el DataFrame se **reusa varias veces** y es costoso de calcular. Cachear algo que se usa una vez solo gasta memoria. En Databricks, el **disk cache** acelera automáticamente las lecturas repetidas de Parquet/Delta.

## UDFs: el último recurso

```python norun
from pyspark.sql import functions as F, types as T

# ❌ UDF de Python: cada fila viaja a un proceso Python y vuelve (lento)
@F.udf(T.StringType())
def dominio(email):
    return email.split("@")[1] if email else None

# ✅ Función nativa: se ejecuta en la JVM, optimizada
df.withColumn("dominio", F.split("email", "@").getItem(1))
```

## Memoria (lo básico)

Cada executor tiene memoria para **ejecución** (joins, agregaciones, ordenamientos) y **almacenamiento** (caché). Si no alcanza, Spark hace *spill* a disco (lento) o falla con `OutOfMemoryError`. Antes de agrandar las máquinas, revisa: skew, particiones demasiado grandes, `collect()`, broadcast de tablas que no son chicas.

:::experto Photon
En Databricks, **Photon** es un motor de ejecución vectorizado escrito en C++ que reemplaza partes de Spark y acelera mucho SQL y DataFrames, sin cambiar tu código.
:::

:::ejercicio quiz
Un DataFrame se usa una sola vez para escribir una tabla. ¿Conviene `cache()`?

- [ ] Sí, siempre conviene
- [x] No: cachear algo que se usa una vez solo consume memoria
- [ ] Sí, pero solo con `persist()`
- [ ] Depende del formato
:::

:::ejercicio quiz
¿Por qué una UDF de Python suele ser más lenta que una función nativa de Spark?

- [ ] Porque Python no sabe sumar
- [x] Porque los datos deben serializarse y viajar fila por fila entre la JVM y un proceso de Python, y Catalyst no puede optimizarla
- [ ] Porque se ejecuta en el driver
- [ ] No es más lenta
:::

:::ejercicio pyspark variable=resultado
Reescribe este código **sin UDF**, usando funciones nativas: a partir de `clientes`, crea la columna `dominio` (lo que va después de la `@` del email, en minúsculas) y cuenta los clientes por dominio. Guarda en `resultado` las columnas `dominio` y `n`, **excluyendo** los emails nulos.
```python inicial
from pyspark.sql import functions as F, types as T

@F.udf(T.StringType())
def dominio(email):
    return email.split("@")[1].lower() if email else None

resultado = (spark.table("clientes")
               .withColumn("dominio", dominio("email"))
               .filter(F.col("dominio").isNotNull())
               .groupBy("dominio").agg(F.count("*").alias("n")))
```
```python solucion
from pyspark.sql import functions as F

resultado = (spark.table("clientes")
               .filter(F.col("email").isNotNull())
               .withColumn("dominio", F.lower(F.split("email", "@").getItem(1)))
               .groupBy("dominio").agg(F.count("*").alias("n")))
```
```python test
assert "udf" not in _codigo.lower(), "¡Todavía usas una UDF! Reemplázala por F.split / F.lower"
```
:::
