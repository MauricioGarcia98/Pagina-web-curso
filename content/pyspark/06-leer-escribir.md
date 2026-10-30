---
titulo: Leer y escribir datos
nivel: Intermedio
duracion: 40
resumen: spark.read y df.write: formatos, opciones, esquemas explícitos, modos de escritura y particionado.
---

## De dónde vienen y adónde van los datos

Un pipeline siempre empieza **leyendo** (archivos que llegaron al lago, una tabla bronze, una base de datos) y termina **escribiendo** (una tabla silver o gold, archivos para otro equipo). En Spark ambas cosas tienen una API simétrica:

```text
spark.read  .format(…).option(…).schema(…).load(ruta)     → DataFrame
df.write    .format(…).mode(…).partitionBy(…).save(ruta)  → archivos / tabla
```

## Formatos de archivo: cuál usar y por qué

| Formato | Tipo | Esquema | Ventajas | Desventajas | Uso típico |
|---|---|---|---|---|---|
| **CSV** | Texto, por filas | No (todo es texto) | Universal, legible | Lento, sin tipos, problemas con comas y saltos de línea | Lo que llega de otros sistemas (bronze) |
| **JSON** | Texto, por filas | Implícito | Datos anidados, APIs | Lento y pesado | Eventos, respuestas de APIs |
| **Parquet** | Binario, **columnar** | Sí | Rápido, comprimido, lee solo las columnas necesarias | No se lee a simple vista | Silver y gold |
| **Delta Lake** | Parquet + registro de transacciones | Sí | Todo lo de Parquet + ACID, `MERGE`, time travel | Necesita el lector de Delta | El estándar en Databricks |
| **Iceberg** | Parquet + metadatos | Sí | Como Delta; muy usado en AWS y Snowflake | Ídem | Lakehouse abierto |

:::analogia Fila por fila vs. columna por columna
Un CSV es como una planilla impresa fila por fila: para sumar la columna "monto" tienes que leer **todas** las filas enteras. Parquet guarda cada columna por separado, como si cada columna fuera un archivo: para sumar "monto" lee solo esa columna. Con 50 columnas, eso es leer ~2 % de los datos. Además comprime muy bien, porque los valores de una misma columna se parecen entre sí.
:::

## Leer

```python norun
# CSV con encabezado e infiriendo tipos (cómodo para explorar, lento y arriesgado en producción)
df = spark.read.option("header", True).option("inferSchema", True).csv("/datos/ventas.csv")

# CSV con esquema explícito (recomendado)
df = (spark.read
        .format("csv")
        .option("header", True)                 # la primera fila tiene los nombres
        .option("sep", ";")                     # separador
        .schema("pedido_id INT, fecha DATE, monto DOUBLE")
        .load("/datos/ventas/*.csv"))           # comodines: todos los CSV de la carpeta

# Parquet, JSON, Delta y tablas del catálogo
df = spark.read.parquet("/lake/silver/pedidos")
df = spark.read.json("/lake/bronze/eventos/2024/*/*.json")
df = spark.read.format("delta").load("/lake/silver/clientes")
df = spark.read.table("main.silver.clientes")     # o spark.table(...)
```

Opciones útiles de CSV:

| Opción | Para qué |
|---|---|
| `header` | La primera línea son los nombres de columna |
| `sep` | Separador (`,` `;` `\t` `\|`) |
| `inferSchema` | Adivinar tipos (lee los datos una vez extra) |
| `dateFormat`, `timestampFormat` | Formato de las fechas (patrones Java: `dd/MM/yyyy`) |
| `nullValue` | Qué texto significa nulo (`"NA"`, `"-"`) |
| `mode` | Qué hacer con filas mal formadas: `PERMISSIVE` (nulos, por defecto), `DROPMALFORMED` (descartarlas), `FAILFAST` (fallar) |
| `multiLine` | Textos con saltos de línea adentro (entre comillas) |
| `encoding` | `UTF-8`, `ISO-8859-1`… |

:::tip Esquemas explícitos en producción
`inferSchema` lee los datos dos veces (una para adivinar, otra para cargar) y puede adivinar mal: un código postal `"01234"` se vuelve el número `1234`, un id con un valor raro convierte toda la columna en texto. En pipelines productivos **declara el esquema**: es más rápido, documenta qué esperas y, combinado con `mode="FAILFAST"`, detecta enseguida si el origen cambió su formato.
:::

### Leer en el simulador

En el simulador hay un sistema de archivos "de juguete": cada tabla de ejemplo también se puede leer como `"/datos/<tabla>.csv"` o `.parquet`. Fíjate en la diferencia de tipos:

```python
df = spark.read.option("header", True).csv("/datos/productos.csv")
df.printSchema()      # sin inferSchema: TODO es string, igual que en Spark real
df2 = spark.read.option("header", True).option("inferSchema", True).csv("/datos/productos.csv")
df2.printSchema()     # ahora precio es double, stock es int…
```

Sin `inferSchema` ni esquema, **cada columna de un CSV es texto**: `precio` es `"484.99"`. Si sumaras esa columna sin convertirla, Spark intentaría convertir implícitamente o daría resultados inesperados. Por eso la capa bronze → silver casi siempre empieza con `cast`.

## Escribir

```python norun
(df.write
   .format("delta")                 # o .parquet(...), .csv(...), .json(...)
   .mode("overwrite")               # qué hacer si ya existe
   .partitionBy("anio", "mes")      # una carpeta por cada combinación anio/mes
   .save("/lake/silver/pedidos"))

df.write.mode("append").saveAsTable("main.silver.pedidos")   # escribir y registrar como tabla del catálogo
```

### Modos de escritura

| Modo | Si el destino ya existe… | Cuándo usarlo |
|---|---|---|
| `error` / `errorifexists` | Falla (por defecto) | Protegerte de pisar algo por error |
| `overwrite` | Reemplaza **todo** | Tablas que se recalculan completas cada vez |
| `append` | Agrega las filas | Logs, eventos (¡cuidado: reprocesar duplica!) |
| `ignore` | No hace nada | Raro |

### Particionar al escribir

`partitionBy("anio", "mes")` crea una carpeta por cada valor, en el estilo Hive que viste en S3 y Cloud Storage:

```text
/lake/silver/pedidos/
├── anio=2023/mes=12/part-00000.parquet
└── anio=2024/
    ├── mes=01/part-00000.parquet
    └── mes=02/part-00000.parquet
```

Después, una lectura con `filter(F.col("anio") == 2024)` lee **solo** esa carpeta (*partition pruning*). Elige columnas de partición con **pocos valores distintos** y que se usen siempre para filtrar (fecha, país). Particionar por `cliente_id` crearía millones de carpetas con archivos diminutos: un desastre de rendimiento.

### ¿Cuántos archivos se escriben?

Spark escribe **un archivo por partición del DataFrame** (por cada carpeta). Si tu DataFrame tiene 200 particiones en memoria, puedes terminar con 200 archivos chiquitos por carpeta. Para controlarlo:

```python norun
df.coalesce(4).write.mode("overwrite").parquet("/lake/gold/resumen")        # juntar en 4 archivos
df.repartition("anio", "mes").write.partitionBy("anio", "mes").parquet(…)   # un archivo por carpeta
```

:::experto Sobrescribir solo algunas particiones (idempotencia)
`overwrite` con `partitionBy` puede borrar **todas** las particiones, no solo las del lote que estás cargando. Para reemplazar solo las del día que procesaste:
- En Delta: `.option("replaceWhere", "fecha = '2024-12-31'")`.
- En Parquet: `spark.conf.set("spark.sql.sources.partitionOverwriteMode", "dynamic")`.

Así un pipeline diario es **idempotente**: si reprocesas el 31 de diciembre, se reemplaza ese día y nada más, sin duplicar ni borrar el resto.
:::

```recorrido
titulo: Qué pasa con la tabla destino en cada modo de escritura
estacion df: El DataFrame | icono=tabla
estacion error: error | icono=alerta
estacion append: append | icono=capas
estacion over: overwrite | icono=transformar
estacion res: Conclusión | icono=check
paso df: Tres filas para escribir
Tenemos un DataFrame de 3 filas y la tabla `ventas_demo` **ya existe** con esas mismas 3 filas (la escribimos ayer).
>>> tabla
dia,ventas
2025-01-01,100
2025-01-02,120
2025-01-03,90
paso error: Modo error (por defecto)
Sin `.mode(...)`, Spark **se niega** a escribir sobre algo que existe. Es una protección.
>>> log
df.write.saveAsTable("ventas_demo")
AnalysisException: [TABLE_OR_VIEW_ALREADY_EXISTS] Cannot create table or view `ventas_demo` because it already exists.
paso append: append: se agregan, aunque se repitan
`mode("append")` suma las filas a las que ya estaban. Si reprocesas el mismo día, **quedan duplicadas**: ahora hay 6 filas.
>>> tabla
dia,ventas
2025-01-01,100
2025-01-02,120
2025-01-03,90
2025-01-01,100
2025-01-02,120
2025-01-03,90
paso over: overwrite: se reemplaza todo
`mode("overwrite")` borra el contenido anterior y deja solo el DataFrame nuevo. Ejecutarlo dos veces da lo mismo: es **idempotente**.
>>> tabla
dia,ventas
2025-01-01,100
2025-01-02,120
2025-01-03,90
paso res: Cuál elegir
Tablas recalculadas completas → `overwrite`. Eventos que solo llegan una vez → `append`, con cuidado al reprocesar. Cargas incrementales con correcciones → `MERGE` de Delta (lo verás en Databricks).
>>> texto
error     → protege
append    → suma (riesgo: duplicar)
overwrite → reemplaza (idempotente)
ignore    → no hace nada si existe
```

## Resumen

- `spark.read.format(…).option(…).schema(…).load(…)`; atajos `.csv`, `.json`, `.parquet`, `.table`.
- CSV sin esquema = todo texto; en producción declara el esquema (y considera `FAILFAST`).
- Parquet/Delta: columnar, comprimido, tipado; el formato de silver y gold.
- `df.write.mode(…).partitionBy(…).save(…)` o `.saveAsTable(…)`; modos `error`, `overwrite`, `append`, `ignore`.
- Particiona por columnas de baja cardinalidad; controla la cantidad de archivos; sobrescribe solo las particiones del lote para ser idempotente.

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
