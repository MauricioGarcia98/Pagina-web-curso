---
titulo: Formatos, Delta Lake y arquitectura medallón
nivel: Intermedio
duracion: 45
resumen: CSV vs Parquet, particionado en disco, Delta Lake (ACID, time travel, MERGE) y bronze/silver/gold.
---

Spark no guarda datos: los **lee** de archivos en un data lake (S3, ADLS, Cloud Storage) y **escribe** archivos nuevos. El formato de esos archivos y cómo los organizas en carpetas deciden si una consulta tarda 5 segundos o 50 minutos, y si cuesta centavos o cientos de dólares. Esta lección cubre los formatos, el particionado, **Delta Lake** y la forma estándar de ordenar todo: la **arquitectura medallón**.

## Filas vs. columnas: la idea clave

Imagina la tabla de pedidos con 100 millones de filas y 30 columnas. La pregunta del negocio es: "¿cuánto vendimos por canal?". Solo necesitas **2 de las 30 columnas**: `canal` y `total`.

Hay dos formas de guardar esa tabla en disco:

```text
ORIENTADO A FILAS (CSV, JSON, Avro)        ORIENTADO A COLUMNAS (Parquet, Delta)
fila 1: 1001, Ana, web, 2024-03-15, 89.9   canal:  web, app, web, tienda, ...
fila 2: 1002, Luis, app, 2024-03-15, 15.0  total:  89.9, 15.0, 42.5, 120.0, ...
fila 3: 1003, Ana, web, 2024-03-16, 42.5   nombre: Ana, Luis, Ana, Marta, ...
...                                        fecha:  2024-03-15, 2024-03-15, ...
```

- En **filas**, para leer `canal` y `total` tienes que leer **cada fila completa** y descartar las otras 28 columnas. Lees el 100 % del archivo.
- En **columnas**, cada columna está guardada junta. Lees solo los bloques de `canal` y `total`: alrededor del **7 %** del archivo.

Además, los valores de una misma columna se parecen mucho entre sí (millones de "web", "app", "web"), así que se **comprimen** muchísimo mejor. Es común que un CSV de 10 GB quede en 1–2 GB como Parquet.

:::analogia La guía telefónica
Un formato por filas es como una guía telefónica impresa: cada línea tiene nombre, dirección y teléfono. Si solo quieres contar cuántas personas viven en cada ciudad, igual tienes que pasar por todas las líneas. Un formato columnar es como tener un cuaderno solo con las ciudades: lo recorres mucho más rápido.
:::

**Regla práctica:** formatos por filas para **escribir e intercambiar** registros de a uno (APIs, colas de eventos); formatos columnares para **analizar**, es decir, leer muchas filas y pocas columnas.

## Formatos de archivo en el lake

| Formato | Tipo | Esquema | Compresión | Lectura selectiva | Uso típico |
|---|---|---|---|---|---|
| CSV | Texto, filas | No (todo es texto) | Mala | No | Intercambio, ingestas simples |
| JSON | Texto, anidado | Inferido | Mala | No | APIs, eventos |
| Avro | Binario, filas | Sí | Buena | No | Streaming, Kafka |
| **Parquet** | Binario, **columnar** | Sí | Excelente | **Sí** (columnas y min/max) | Analítica |
| **Delta** | Parquet + log de transacciones | Sí (+ evolución) | Excelente | Sí, más *data skipping* | **Estándar en Databricks** |

Problemas típicos del CSV, que vas a sufrir en la capa bronze:

- **Sin tipos**: `"0012"` puede ser un código o el número 12. Spark tiene que adivinar (`inferSchema`) o recibir el esquema a mano.
- **Separadores dentro de los datos**: una dirección `"Av. Siempre Viva 123, Depto 4"` rompe las columnas si no está bien entrecomillada.
- **Lento**: no se puede leer solo una columna, ni saltarse partes del archivo.

### Por dentro de un Parquet

Un archivo Parquet se divide en **row groups** (bloques de, por ejemplo, 1 millón de filas), y dentro de cada uno, cada columna se guarda por separado. Al final del archivo hay un **pie** (*footer*) con estadísticas de cada bloque: el **mínimo y el máximo** de cada columna.

```text
ventas.parquet
├── row group 1  │ fecha: min 2024-01-01  max 2024-01-31 │ total: min 0.5 max 980 │
├── row group 2  │ fecha: min 2024-02-01  max 2024-02-29 │ ...
└── footer (esquema + estadísticas)
```

Si consultas `WHERE fecha = '2024-02-10'`, Spark lee el pie, ve que el row group 1 termina el 31 de enero y **se lo salta sin leerlo**. Esto es el *predicate pushdown* que viste en la lección anterior.

## Particionado en disco

Al escribir puedes **particionar por una columna**: Spark crea una carpeta por cada valor.

```python norun
(df.write
   .mode("overwrite")
   .partitionBy("anio", "mes")
   .parquet("/lake/silver/pedidos"))
```

```text
/lake/silver/pedidos/anio=2024/mes=1/part-0000.parquet
/lake/silver/pedidos/anio=2024/mes=2/part-0000.parquet
...
```

Un filtro `WHERE anio = 2024 AND mes = 2` lee **solo esa carpeta** y ni siquiera abre las demás (*partition pruning*). Con 5 años de datos, eso es leer 1 de 60 carpetas.

Fíjate que las columnas `anio` y `mes` **no están dentro de los archivos**: su valor sale del nombre de la carpeta. Esta convención `columna=valor` se llama **particionado estilo Hive**, y la entienden Spark, Athena, BigQuery, Trino y casi cualquier motor.

:::cuidado No particiones de más
Particionar por una columna con muchos valores (por ejemplo `cliente_id`) genera millones de archivos diminutos: el famoso **problema de los archivos pequeños**. Abrir un archivo tiene un costo fijo, así que leer un millón de archivos de 10 KB es muchísimo más lento que leer 80 de 128 MB. Regla: particiona por columnas de **baja cardinalidad** (fecha, país) y solo si cada partición va a tener al menos alrededor de 1 GB. En Delta moderno, prefiere **Liquid Clustering**, que organiza los datos sin crear carpetas.
:::

## Delta Lake

Un data lake de Parquet "pelado" tiene problemas serios:

1. **Escrituras a medias**: si un job falla en la mitad, quedan algunos archivos nuevos y otros no. Quien lea en ese momento ve datos incompletos.
2. **Sin UPDATE ni DELETE**: para corregir un solo cliente hay que reescribir todos los archivos donde aparece.
3. **Escrituras simultáneas**: dos procesos que escriben a la vez pueden pisarse.
4. **Esquemas que se rompen**: si un día llega un archivo con una columna de más o con otro tipo, se mezcla con los demás sin que nadie avise.

**Delta Lake** resuelve esto agregando un **registro de transacciones**, la carpeta `_delta_log/`, junto a los archivos Parquet:

```text
/lake/silver/clientes/
├── _delta_log/
│   ├── 00000000000000000000.json    ← versión 0: "se agregaron part-001 y part-002"
│   ├── 00000000000000000001.json    ← versión 1: "se agregó part-003"
│   └── 00000000000000000002.json    ← versión 2: "se quitó part-001 y se agregó part-004" (un UPDATE)
├── part-001.parquet                 ← ya no forma parte de la versión actual, pero sigue ahí
├── part-002.parquet
├── part-003.parquet
└── part-004.parquet
```

La tabla **no es "todos los Parquet de la carpeta"**: es **lo que dice el log**. Para leer, Spark recorre el log y sabe exactamente qué archivos forman la versión actual. Un commit solo existe cuando su archivo JSON quedó escrito completo. Si el job falla antes, los Parquet nuevos quedan huérfanos y **nadie los lee**. De ahí salen todas las ventajas:

- **ACID**: cada escritura es atómica y los lectores nunca ven datos a medias.
- **UPDATE, DELETE y MERGE** (*upserts*): Delta reescribe solo los archivos afectados y anota en el log cuáles reemplazó.
- **Time travel**: como los archivos viejos siguen ahí, puedes consultar cualquier versión anterior.
- **Schema enforcement y evolution**: rechaza datos con un esquema incorrecto, o lo evoluciona si lo permites (`mergeSchema`).
- **OPTIMIZE, Z-ORDER y Liquid Clustering**: compactan archivos chicos y ordenan los datos para acelerar los filtros.
- Lectura y escritura **batch y streaming** sobre la misma tabla.

```sql norun
-- Upsert de cambios en la tabla de clientes
MERGE INTO silver.clientes AS t
USING bronze.clientes_cambios AS s
ON t.cliente_id = s.cliente_id
WHEN MATCHED AND s.operacion = 'DELETE' THEN DELETE
WHEN MATCHED THEN UPDATE SET *
WHEN NOT MATCHED THEN INSERT *;

-- Historial y time travel
DESCRIBE HISTORY silver.clientes;
SELECT * FROM silver.clientes VERSION AS OF 3;
RESTORE TABLE silver.clientes TO VERSION AS OF 3;

-- Mantenimiento
OPTIMIZE silver.clientes ZORDER BY (pais);
VACUUM silver.clientes RETAIN 168 HOURS;
```

Qué hace cada bloque:

- **`MERGE`** compara cada fila de cambios (`s`) con la tabla (`t`) por `cliente_id`. Si el cliente existe y la operación es DELETE, lo borra. Si existe, lo actualiza. Si no existe, lo inserta. Todo en **una sola transacción**: o se aplican todos los cambios o ninguno.
- **`DESCRIBE HISTORY`** lista las versiones: quién escribió, cuándo y con qué operación.
- **`VERSION AS OF 3`** lee la tabla como estaba en la versión 3. Es ideal para auditar ("¿qué decía este dato el lunes?") o para comparar antes y después de un cambio.
- **`RESTORE`** vuelve la tabla a una versión anterior. Es el "deshacer" cuando un job escribió datos malos.
- **`OPTIMIZE`** junta muchos archivos chicos en pocos grandes. **`ZORDER BY (pais)`** además ordena los datos por país, para que los filtros por país se salten más archivos.
- **`VACUUM`** borra físicamente los archivos que ya no usa ninguna versión de más de 168 horas (7 días). Ahorra almacenamiento, pero **después de un VACUUM ya no puedes viajar** a esas versiones.

:::nota Delta, Iceberg y Hudi
Delta no es el único formato de tabla. **Apache Iceberg** (muy usado en AWS y Snowflake) y **Apache Hudi** resuelven el mismo problema con ideas parecidas: archivos Parquet más una capa de metadatos. Los conceptos de esta lección (ACID, time travel, MERGE) valen para los tres.
:::

## Arquitectura medallón (bronze, silver, gold)

La forma estándar de organizar un lakehouse es en capas de calidad creciente:

| Capa | Contenido | Ejemplo |
|---|---|---|
| 🥉 **Bronze** | Datos **crudos**, tal como llegan, más metadatos de ingesta (fecha de carga, archivo de origen). Solo se agregan datos, nunca se modifican | JSON de la API de pedidos |
| 🥈 **Silver** | Datos **limpios y conformados**: tipos correctos, sin duplicados, validados y unidos con referencias | `pedidos`, `clientes` limpios |
| 🥇 **Gold** | Datos **listos para el negocio**: agregados, métricas y esquema estrella para BI y ML | `ventas_diarias_por_pais`, `dim_cliente` |

Así viaja un pedido de Tienda Andina por las tres capas:

```text
BRONZE  {"id":"1001","cli":"  ANA@MAIL.COM ","total":"89,90","ts":"15/03/2024 10:22"}   ← texto tal cual llegó
           │  limpiar tipos, normalizar email, parsear fecha, quitar duplicados
SILVER  pedido_id=1001  email=ana@mail.com  total=89.90  fecha_pedido=2024-03-15 10:22
           │  unir con clientes y productos, agregar por día y país
GOLD    fecha=2024-03-15  pais=Chile  pedidos=1.284  ventas=98.410,50                      ← lo que ve el dashboard
```

:::tip Por qué conservar bronze
Si mañana descubres un error en la limpieza, puedes **reprocesar** silver y gold desde bronze sin volver a pedir los datos al origen (que quizá ya no existan).
:::

## Ejercicios

:::ejercicio quiz
¿Qué agrega Delta Lake sobre archivos Parquet?

- [ ] Una interfaz gráfica
- [x] Un registro de transacciones que permite ACID, MERGE, time travel y evolución de esquema
- [ ] Compresión de imágenes
- [ ] Convertir los archivos a CSV
:::

:::ejercicio quiz
¿En qué capa guardarías la tabla `ventas_mensuales_por_categoria` que consume el tablero de la gerencia?

- [ ] Bronze
- [ ] Silver
- [x] Gold
- [ ] En ninguna: se calcula a mano en Excel
:::

:::ejercicio quiz
Quieres particionar una tabla de 50 GB de eventos. ¿Qué columna es mejor candidata?

- [ ] `evento_id` (único por fila)
- [ ] `usuario_id` (2 millones de valores)
- [x] `fecha` (365 valores por año)
- [ ] `timestamp` con segundos
:::
