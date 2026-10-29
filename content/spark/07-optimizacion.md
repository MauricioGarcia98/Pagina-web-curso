---
titulo: Optimización y tuning de Spark
nivel: Avanzado
duracion: 50
resumen: Diagnóstico con la Spark UI, caché, archivos pequeños, configuración de memoria y checklist de rendimiento.
---

Tu job de Spark funciona, pero tarda 90 minutos y la factura del clúster no para de crecer. Esta lección te da un **método** para encontrar por qué y una lista de soluciones para los problemas más comunes. La idea central es que casi todos los problemas de rendimiento son uno de estos cinco: **leer de más, mover de más (shuffle), skew, archivos chicos o traer datos al driver.**

## Primero: medir

Nunca optimices a ciegas. Cambiar configuraciones al azar ("¿y si pongo 1.000 particiones?") rara vez funciona y a veces empeora las cosas. El método es siempre el mismo:

1. **Mide** cuánto tarda hoy, y anótalo.
2. **Encuentra el stage más lento** en la Spark UI. En un job lento, casi siempre uno o dos stages explican el 80 % del tiempo.
3. **Clasifica el síntoma** con la tabla de abajo.
4. **Cambia una sola cosa** y vuelve a medir. Si cambias tres a la vez, no sabes cuál ayudó.

La **Spark UI** muestra:

- **Jobs / Stages**: cuánto tarda cada etapa, cuántas tareas tiene, cuánto se leyó y cuánto se movió en **shuffle**.
- **Tareas de un stage**: si hay *skew* (unas pocas tareas mucho más lentas), *spill* (datos que no entraron en memoria y se escribieron a disco) o GC excesivo (Java pasa mucho tiempo liberando memoria).
- **SQL / DataFrame**: el plan físico con métricas por operador (filas, tiempo).

`df.explain("formatted")` te muestra el plan antes de ejecutar. Busca `Exchange` (shuffle), `BroadcastHashJoin` vs. `SortMergeJoin`, y `PushedFilters` en la lectura.

### Leer los síntomas

| Lo que ves en la Spark UI | Qué significa | Dónde buscar la solución |
|---|---|---|
| **Input** enorme en el primer stage | Lees más datos de los que necesitas | Filtros tempranos, columnas, formato, particionado |
| **Shuffle read/write** de muchos GB | Estás moviendo mucho por la red | Broadcast, filtrar antes del join, menos `groupBy` |
| Tarea **Max** mucho mayor que la **Median** | Skew | AQE skew join, NULLs, salting (lección anterior) |
| **Spill (memory/disk)** alto | Particiones demasiado grandes para la memoria | Más particiones o máquinas con más memoria |
| Miles de tareas que tardan milisegundos | Archivos o particiones demasiado chicos | `OPTIMIZE`, menos particiones |
| El driver se cae con `OutOfMemoryError` | Estás trayendo datos al driver | Quitar `collect()`/`toPandas()`, revisar broadcasts |

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
| `count()` innecesarios para "ver si funciona" | Cada acción vuelve a ejecutar el plan: evítalas en producción |

## Un caso real, paso a paso

El job nocturno `ventas_por_cliente` tarda **90 minutos**:

```python norun
pedidos  = spark.read.json("/lake/bronze/pedidos/")             # 800 GB de JSON
clientes = spark.read.parquet("/lake/silver/clientes/")         # 40 MB
r = (pedidos.join(clientes, "cliente_id")
            .filter(F.col("fecha") >= "2024-01-01")
            .groupBy("cliente_id", "pais").agg(F.sum("total").alias("ventas")))
print(r.count())                                                 # "para ver que funciona"
r.write.mode("overwrite").parquet("/lake/gold/ventas_por_cliente/")
```

**Diagnóstico** en la Spark UI:

1. El job aparece **dos veces**: una por el `count()` y otra por el `write`. Todo se calcula dos veces. → **Quitar el `count()`**: 90 → 45 min.
2. El primer stage lee **800 GB de JSON**, aunque solo se usan 4 columnas y el último año. JSON no permite leer columnas sueltas ni saltarse archivos. → Leer desde la tabla **silver en Delta, particionada por fecha**, y filtrar **antes** del join. Ahora lee 35 GB: 45 → 12 min.
3. El plan muestra `SortMergeJoin` con un shuffle de 30 GB, porque Spark no sabía que `clientes` era chica. → **`F.broadcast(clientes)`**: desaparece el shuffle de pedidos, 12 → 6 min.
4. En el stage del `groupBy`, una tarea tarda 4 minutos y las demás 10 segundos: `cliente_id = NULL` (compras sin cuenta) tiene el 30 % de las filas. → **Filtrar los NULL** antes (no sirven en un inner join): 6 → 2 min.

```python norun
pedidos  = (spark.table("silver.pedidos")
              .filter(F.col("fecha") >= "2024-01-01")           # pruning + pushdown
              .filter(F.col("cliente_id").isNotNull())          # adiós skew
              .select("cliente_id", "total"))                   # solo lo necesario
clientes = spark.table("silver.clientes").select("cliente_id", "pais")
r = (pedidos.join(F.broadcast(clientes), "cliente_id")          # sin shuffle de pedidos
            .groupBy("cliente_id", "pais").agg(F.sum("total").alias("ventas")))
r.write.mode("overwrite").saveAsTable("gold.ventas_por_cliente")
```

De 90 a 2 minutos **sin agregar una sola máquina**. Es lo habitual: el código y los datos importan mucho más que el tamaño del clúster.

## Caché: cuándo sí y cuándo no

`cache()` guarda un DataFrame en la memoria de los executors la primera vez que se calcula, y las acciones siguientes lo reutilizan en vez de recalcularlo desde el principio.

```python norun
clientes_activos = (spark.table("silver.clientes")
                      .filter("activo = true")
                      .cache())                  # perezoso: se materializa con la primera acción
clientes_activos.count()                         # ahora sí queda en memoria
reporte_a = clientes_activos.groupBy("pais").count()
reporte_b = clientes_activos.join(pedidos, "cliente_id")
clientes_activos.unpersist()
```

Úsala solo si el DataFrame **se reutiliza varias veces** y es costoso de calcular. Cachear algo que se usa una vez solo gasta memoria, y esa memoria se la quitas a los joins y las agregaciones, que pueden empezar a hacer spill.

- `cache()` es un atajo de `persist()` con el nivel por defecto (memoria y, si no entra, disco).
- `persist(StorageLevel.DISK_ONLY)` y otros niveles te dejan elegir dónde guardar.
- En Databricks, el **disk cache** acelera automáticamente las lecturas repetidas de Parquet/Delta, sin que escribas nada.

## UDFs: el último recurso

Una **UDF** (*user-defined function*) es una función de Python que aplicas a una columna. Parece cómodo, pero es lento: Spark corre en la JVM (Java), así que cada fila tiene que **convertirse, viajar a un proceso de Python, procesarse y volver**. Además, Catalyst no puede ver qué hace la función, así que no puede optimizarla.

```python norun
from pyspark.sql import functions as F, types as T

# ❌ UDF de Python: cada fila viaja a un proceso Python y vuelve (lento)
@F.udf(T.StringType())
def dominio(email):
    return email.split("@")[1] if email else None

# ✅ Función nativa: se ejecuta en la JVM, optimizada
df.withColumn("dominio", F.split("email", "@").getItem(1))
```

Antes de escribir una UDF, busca en `pyspark.sql.functions`: tiene más de 300 funciones (textos, fechas, arreglos, JSON, expresiones regulares). Casi todo se puede hacer con ellas.

Si de verdad necesitas Python (por ejemplo, una librería de geolocalización), usa una **pandas UDF**. Procesa **lotes** de miles de filas a la vez como una `pd.Series`, usando Apache Arrow, y suele ser de 10 a 100 veces más rápida que una UDF común:

```python norun
import pandas as pd

@F.pandas_udf("string")
def dominio_vec(emails: pd.Series) -> pd.Series:
    return emails.str.split("@").str[1]

df.withColumn("dominio", dominio_vec("email"))
```

## Memoria (lo básico)

Cada executor divide su memoria entre **ejecución** (joins, agregaciones, ordenamientos) y **almacenamiento** (caché). Las dos comparten un mismo espacio y se lo prestan según la necesidad. Si no alcanza, Spark hace *spill* a disco (lento) o falla con `OutOfMemoryError`.

Antes de agrandar las máquinas, revisa estos sospechosos:

1. **Skew**: una partición gigante no entra en memoria aunque todas las demás sí.
2. **Particiones demasiado grandes**: con 200 particiones para 1 TB, cada una tiene 5 GB. Sube `spark.sql.shuffle.partitions` o deja que AQE lo ajuste.
3. **`collect()` o `toPandas()`**, que llenan la memoria del **driver**.
4. **Broadcast de tablas que no son chicas**, que llenan driver y executors.

:::experto Photon
En Databricks, **Photon** es un motor de ejecución vectorizado escrito en C++ que reemplaza partes de Spark y acelera mucho SQL y DataFrames, sin cambiar tu código. Las UDF de Python no se benefician: otra razón para usar funciones nativas.
:::

## Ejercicios

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
