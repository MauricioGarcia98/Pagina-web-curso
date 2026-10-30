---
titulo: Athena, SQL sobre el lago sin servidores
nivel: Intermedio
duracion: 45
resumen: Cómo funciona Athena, tablas externas, particiones y partition projection, CTAS a Parquet, Iceberg, costos por TB escaneado, workgroups y la API desde la CLI.
---

## Qué es Athena

**Athena** es un motor de SQL **sin servidor** (por dentro es Trino/Presto) que consulta directamente los archivos de S3 usando las tablas del **Glue Data Catalog**. No hay nada que encender ni apagar: escribes SQL, Athena lee los archivos, y pagas **por TB escaneado** (~USD 5).

```text
  tu SQL ──► Athena ──► ¿qué es lake_silver.ventas? ──► Glue Data Catalog
                │                                         (ubicación, columnas, particiones)
                └──► lee solo los archivos necesarios de S3 ──► resultados en s3://…/athena-results/
```

:::analogia Un buscador que cobra por página leída
Imagina un bibliotecario que cobra por cada página que tiene que hojear. Si le pides "todo lo de 2024", hojea todo. Si los libros están **ordenados por mes** (particiones) y **por tema** (Parquet: columnas separadas), hojea solo lo justo y te cobra centavos.
:::

## Crear tablas: DDL sobre S3

Además de los crawlers, puedes declarar la tabla tú mismo. Fíjate en `EXTERNAL` (los datos no se mueven: la tabla solo **apunta** a S3) y en `LOCATION`:

```sql norun
CREATE EXTERNAL TABLE lake_bronze.ventas (
  pedido_id   BIGINT,
  fecha       DATE,
  cliente_id  BIGINT,
  canal       STRING,
  estado      STRING,
  total       DOUBLE
)
PARTITIONED BY (anio INT, mes INT)
ROW FORMAT DELIMITED FIELDS TERMINATED BY ','
LOCATION 's3://lake-tienda-dev/bronze/ventas/'
TBLPROPERTIES ('skip.header.line.count' = '1');

-- registrar las particiones que ya existen en S3
MSCK REPAIR TABLE lake_bronze.ventas;
```

:::tip Partition projection: sin MSCK ni crawlers
Con muchas particiones (una por día durante años), registrarlas cuesta. **Partition projection** le dice a Athena la regla ("`fecha` va de 2020-01-01 a hoy, una carpeta por día") y Athena calcula las rutas sin consultar el catálogo:

```sql norun
TBLPROPERTIES (
  'projection.enabled' = 'true',
  'projection.fecha.type' = 'date',
  'projection.fecha.range' = '2020-01-01,NOW',
  'projection.fecha.format' = 'yyyy-MM-dd',
  'storage.location.template' = 's3://lake-tienda-dev/silver/eventos/fecha=${fecha}/'
)
```
:::

```recorrido
titulo: La vida de una consulta de Athena
estacion start: Enviar | icono=terminal
estacion cat: Catálogo | icono=libro
estacion scan: Leer S3 | icono=base
estacion estado: Estado | icono=reloj
estacion res: Resultado | icono=check
paso start: Envías la consulta
`start-query-execution` **no espera** el resultado: devuelve enseguida un identificador. La consulta corre en segundo plano.
>>> json
{
  "QueryExecutionId": "f7657850-a4cf-42e7-4c44-aa498f1a9fd5"
}
paso cat: Athena busca la tabla en el catálogo
`lake_bronze.ventas` es una entrada del Glue Data Catalog: ahí Athena encuentra las columnas y la ubicación en S3.
>>> texto
lake_bronze.ventas → s3://lake-tienda-dev/bronze/ventas/
columnas: venta_id, fecha, producto, monto
paso scan: Lee los archivos y cobra por lo leído
Athena lee los archivos de esa ruta. **Cobra por bytes escaneados**: por eso convienen Parquet (lee solo las columnas pedidas) y particiones (lee solo las fechas pedidas).
>>> texto
CSV, sin particiones   → lee el archivo entero
Parquet + fecha=…     → lee 1 columna de 1 partición
paso estado: Preguntar si terminó
Se consulta el estado con el identificador: `QUEUED` → `RUNNING` → `SUCCEEDED` (o `FAILED`).
>>> log
$ aws athena get-query-execution --query-execution-id $QID \
    --query "QueryExecution.Status.State"
"SUCCEEDED"
paso res: Leer el resultado
El resultado queda guardado como CSV en la `OutputLocation` y se lee con `get-query-results` (salida resumida).
>>> tabla
n
3
```

## CTAS: convertir CSV a Parquet con una consulta

`CREATE TABLE AS SELECT` (CTAS) escribe el resultado como archivos nuevos en S3. Es la forma más simple de pasar de bronze (CSV) a silver (Parquet particionado) **sin Spark**:

```sql norun
CREATE TABLE lake_silver.ventas
WITH (
  format = 'PARQUET',
  write_compression = 'SNAPPY',
  external_location = 's3://lake-tienda-dev/silver/ventas/',
  partitioned_by = ARRAY['anio', 'mes']
) AS
SELECT pedido_id, fecha, cliente_id, canal, estado, total, anio, mes   -- las particiones van al final
FROM lake_bronze.ventas
WHERE estado <> 'cancelado';
```

## Iceberg en Athena: UPDATE, DELETE y MERGE sobre S3

Las tablas Hive clásicas solo permiten agregar archivos. Con **Apache Iceberg**, Athena soporta transacciones:

```sql norun
CREATE TABLE lake_silver.clientes (cliente_id BIGINT, email STRING, segmento STRING, actualizado TIMESTAMP)
LOCATION 's3://lake-tienda-dev/silver/clientes/'
TBLPROPERTIES ('table_type' = 'ICEBERG');

MERGE INTO lake_silver.clientes t
USING lake_bronze.clientes_cambios c ON t.cliente_id = c.cliente_id
WHEN MATCHED THEN UPDATE SET email = c.email, segmento = c.segmento, actualizado = current_timestamp
WHEN NOT MATCHED THEN INSERT VALUES (c.cliente_id, c.email, c.segmento, current_timestamp);

SELECT * FROM lake_silver.clientes FOR TIMESTAMP AS OF (current_timestamp - interval '1' day);  -- time travel
```

## El dialecto: Trino vs. lo que practicas aquí

Los ejercicios del curso corren en SQLite dentro de tu navegador. El 95 % del SQL es idéntico; estas son las diferencias que más vas a notar:

| Quiero… | Athena (Trino) | SQLite (este curso) |
|---|---|---|
| Truncar a mes | `date_trunc('month', fecha)` | `strftime('%Y-%m', fecha)` |
| Diferencia de días | `date_diff('day', a, b)` | `julianday(b) - julianday(a)` |
| Hora de un timestamp | `hour(ts)` | `CAST(strftime('%H', ts) AS INTEGER)` |
| Convertir tipo | `CAST(x AS DOUBLE)` o `TRY_CAST` | `CAST(x AS REAL)` |
| Concatenar | `concat(a, b)` o `a \|\| b` | `a \|\| b` |
| Conteo aproximado (rápido) | `approx_distinct(col)` | `COUNT(DISTINCT col)` |
| Percentil | `approx_percentile(col, 0.5)` | (ventana con `ROW_NUMBER`) |
| Explotar un array | `CROSS JOIN UNNEST(arr) AS t(x)` | `json_each` |

## Costo: las 5 reglas de oro

1. **Formato columnar** (Parquet/ORC): Athena lee solo las columnas que pides. Convertir CSV → Parquet suele bajar el costo **entre 10 y 100 veces**.
2. **Particiona** por las columnas de filtro habituales (fecha) y **filtra siempre** por ellas.
3. **Nunca** `SELECT *` en exploración: usa columnas concretas y `LIMIT` (ojo: `LIMIT` no reduce lo escaneado en CSV).
4. **Compacta** archivos chicos (128 MB–1 GB).
5. Usa **workgroups** con límite de datos escaneados por consulta, y separa la facturación por equipo.

:::experto Pregunta típica de entrevista
"Una consulta de Athena tarda 3 minutos y cuesta USD 12. ¿Qué haces?" Respuesta ordenada: mirar `DataScannedInBytes` en `get-query-execution` → ¿es CSV/JSON? pasar a Parquet con CTAS → ¿filtra por partición? agregar el filtro o reparticionar → ¿muchos archivos chicos? compactar → si es un dashboard que se repite, materializar una tabla gold (o llevarlo a Redshift).
:::

## Athena desde la CLI

Athena es **asíncrono**: lanzas la consulta, recibes un ID, consultas el estado y luego pides los resultados.

```bash norun
QID=$(aws athena start-query-execution \
  --query-string "SELECT canal, COUNT(*) AS pedidos FROM lake_bronze.ventas GROUP BY canal" \
  --query-execution-context Database=lake_bronze \
  --result-configuration OutputLocation=s3://lake-tienda-dev/athena-results/ \
  --query QueryExecutionId --output text)

aws athena get-query-execution --query-execution-id $QID --query "QueryExecution.Status.State"
aws athena get-query-results --query-execution-id $QID --output table
```

### Laboratorio: consulta lo que catalogaste

Si hiciste los laboratorios de S3 y Glue, la tabla `lake_bronze.ventas` apunta al CSV que subiste. En esta terminal Athena **lee ese archivo de verdad** (incluida la partición `mes=12` de la ruta):

```bash
QID=$(aws athena start-query-execution --query-string "SELECT canal, COUNT(*) AS pedidos, ROUND(SUM(total), 2) AS total FROM lake_bronze.ventas WHERE mes = 12 GROUP BY canal ORDER BY total DESC" --result-configuration OutputLocation=s3://lake-tienda-dev/athena-results/ --query QueryExecutionId --output text)
echo $QID
aws athena get-query-execution --query-execution-id $QID --query "QueryExecution.Status.State"
aws athena get-query-results --query-execution-id $QID --output table
```

## Ejercicios de SQL sobre el lago

Imagina que estas tablas son tablas de `lake_silver` en Athena. Resuélvelas en el dialecto de este curso (SQLite).

:::ejercicio sql ordenado titulo="Embudo web por dispositivo"
Con `eventos_web`, arma el embudo por `dispositivo`: `vistas` (eventos `vista`), `carritos` (`agregar_carrito`), `compras` (`compra`) y `conversion_pct` = compras / vistas × 100 (redondeado a 2). Ordena por `conversion_pct` descendente.
```sql solucion
SELECT dispositivo,
       SUM(CASE WHEN tipo_evento = 'vista' THEN 1 ELSE 0 END) AS vistas,
       SUM(CASE WHEN tipo_evento = 'agregar_carrito' THEN 1 ELSE 0 END) AS carritos,
       SUM(CASE WHEN tipo_evento = 'compra' THEN 1 ELSE 0 END) AS compras,
       ROUND(100.0 * SUM(CASE WHEN tipo_evento = 'compra' THEN 1 ELSE 0 END)
             / SUM(CASE WHEN tipo_evento = 'vista' THEN 1 ELSE 0 END), 2) AS conversion_pct
FROM eventos_web
GROUP BY dispositivo
ORDER BY conversion_pct DESC;
```
```pista
Una sola pasada por la tabla con `SUM(CASE WHEN … THEN 1 ELSE 0 END)` por cada paso. En Athena escribirías lo mismo, o `COUNT_IF(tipo_evento = 'vista')`.
```
:::

:::ejercicio sql ordenado titulo="Movilidad: demanda por hora del día"
Para el caso 🚕 de viajes (`viajes_viajes`), calcula por `hora` del día de la solicitud (entero de 0 a 23): `solicitudes` y `pct_sin_conductor` (porcentaje con estado `sin_conductor`, redondeado a 2). Ordena por hora.
```sql solucion
SELECT CAST(strftime('%H', fecha_hora_solicitud) AS INTEGER) AS hora,
       COUNT(*) AS solicitudes,
       ROUND(100.0 * SUM(CASE WHEN estado = 'sin_conductor' THEN 1 ELSE 0 END) / COUNT(*), 2) AS pct_sin_conductor
FROM viajes_viajes
GROUP BY hora
ORDER BY hora;
```
```pista
En Athena sería `hour(fecha_hora_solicitud)`. Aquí: `CAST(strftime('%H', …) AS INTEGER)`.
```
```explicacion
Mira los resultados: en las horas pico (7 a 9 y 17 a 20) se duplican las solicitudes **y** sube el porcentaje sin conductor. La oferta no acompaña a la demanda: por eso existen la tarifa dinámica y los incentivos a conductores en esas franjas. Una consulta, una decisión de negocio.
```
:::

:::ejercicio sql ordenado titulo="Logística: ranking de transportistas"
Para el caso 📦 (`logistica_envios`), evalúa a cada `transportista` con sus envíos **entregados**: `entregados`, `pct_a_tiempo` (entregados con `fecha_entrega` ≤ `fecha_prometida`, redondeado a 2) y `dias_promedio` (días entre despacho y entrega, redondeado a 1). Ordena por `pct_a_tiempo` descendente.
```sql solucion
SELECT transportista,
       COUNT(*) AS entregados,
       ROUND(100.0 * SUM(CASE WHEN fecha_entrega <= fecha_prometida THEN 1 ELSE 0 END) / COUNT(*), 2) AS pct_a_tiempo,
       ROUND(AVG(julianday(fecha_entrega) - julianday(fecha_despacho)), 1) AS dias_promedio
FROM logistica_envios
WHERE estado = 'entregado'
GROUP BY transportista
ORDER BY pct_a_tiempo DESC;
```
:::

:::ejercicio sql ordenado titulo="Streaming: DAU promedio por mes"
Para el caso 🎧 (`streaming_reproducciones`), calcula para cada `mes` (`YYYY-MM`) el **promedio de usuarios activos diarios** (`dau_promedio`, redondeado a 1): primero cuenta usuarios distintos por día y luego promedia esos días dentro del mes. Ordena por mes.
```sql solucion
WITH diario AS (
  SELECT date(fecha_hora) AS dia, COUNT(DISTINCT usuario_id) AS usuarios
  FROM streaming_reproducciones
  GROUP BY dia
)
SELECT strftime('%Y-%m', dia) AS mes, ROUND(AVG(usuarios), 1) AS dau_promedio
FROM diario
GROUP BY mes
ORDER BY mes;
```
```pista
Son dos agregaciones: una por día (`COUNT(DISTINCT usuario_id)`) y otra por mes (`AVG` de lo anterior). No es lo mismo que contar usuarios distintos del mes y dividir por 30.
```
:::

## Ejercicios de terminal

:::ejercicio cli
Lanza en Athena la consulta `SELECT COUNT(*) FROM lake_bronze.ventas`, guardando los resultados en `s3://lake-tienda-dev/athena-results/`.
```respuesta
todos: aws athena start-query-execution || --query-string ['"]SELECT COUNT\(\*\) FROM lake_bronze\.ventas;?['"] || --result-configuration ['"]?OutputLocation=s3://lake-tienda-dev/athena-results/?['"]?
```
```solucion
aws athena start-query-execution --query-string "SELECT COUNT(*) FROM lake_bronze.ventas" --result-configuration OutputLocation=s3://lake-tienda-dev/athena-results/
```
```setup
aws s3 mb s3://lake-tienda-dev
aws s3 cp datos/ventas_2024_12.csv s3://lake-tienda-dev/bronze/ventas/anio=2024/mes=12/
aws glue create-crawler --name crawler-ventas --role GlueServiceRole-datos --database-name lake_bronze --targets '{"S3Targets": [{"Path": "s3://lake-tienda-dev/bronze/ventas/"}]}'
aws glue start-crawler --name crawler-ventas
```
:::

:::ejercicio cli
Lanza la misma consulta, pero usando el **workgroup** `primary` (que ya tiene configurada la ubicación de resultados) y guardando el ID en la variable `QID`.
```respuesta
todos: QID=\$\(aws athena start-query-execution || --query-string ['"]SELECT COUNT\(\*\) FROM lake_bronze\.ventas;?['"] || --work-group primary || --query ['"]?QueryExecutionId['"]? || --output text\)
```
```solucion
QID=$(aws athena start-query-execution --query-string "SELECT COUNT(*) FROM lake_bronze.ventas" --work-group primary --query QueryExecutionId --output text)
```
```setup
aws s3 mb s3://lake-tienda-dev
aws s3 cp datos/ventas_2024_12.csv s3://lake-tienda-dev/bronze/ventas/anio=2024/mes=12/
aws glue create-crawler --name crawler-ventas --role GlueServiceRole-datos --database-name lake_bronze --targets '{"S3Targets": [{"Path": "s3://lake-tienda-dev/bronze/ventas/"}]}'
aws glue start-crawler --name crawler-ventas
```
:::

:::ejercicio cli
La variable `QID` ya tiene el ID de una consulta. Muestra sus resultados en formato tabla.
```respuesta
todos: aws athena get-query-results || --query-execution-id (\$QID|"\$QID"|\$\{QID\}) || --output table
```
```solucion
aws athena get-query-results --query-execution-id $QID --output table
```
```setup
aws s3 mb s3://lake-tienda-dev
aws s3 cp datos/ventas_2024_12.csv s3://lake-tienda-dev/bronze/ventas/anio=2024/mes=12/
aws glue create-crawler --name crawler-ventas --role GlueServiceRole-datos --database-name lake_bronze --targets '{"S3Targets": [{"Path": "s3://lake-tienda-dev/bronze/ventas/"}]}'
aws glue start-crawler --name crawler-ventas
QID=$(aws athena start-query-execution --query-string "SELECT canal, COUNT(*) AS pedidos FROM lake_bronze.ventas GROUP BY canal" --work-group primary --query QueryExecutionId --output text)
```
:::

:::ejercicio quiz
Tienes `s3://lake/silver/eventos/fecha=YYYY-MM-DD/` en Parquet, 2 TB en total, 2 años. ¿Cuál consulta es más barata?

- [ ] `SELECT * FROM eventos LIMIT 100`
- [ ] `SELECT usuario_id FROM eventos WHERE date(ts) = DATE '2024-12-01'`
- [x] `SELECT usuario_id FROM eventos WHERE fecha = '2024-12-01'`
- [ ] Las tres cuestan igual
```explicacion
La tercera filtra por la **columna de partición** (`fecha`), así que Athena lee una sola carpeta y una sola columna. La segunda filtra por `ts`, que no es la partición: tiene que abrir todas las carpetas. La primera, con `SELECT *`, lee todas las columnas de muchos archivos.
```
:::

:::ejercicio quiz
¿Qué hace `CREATE TABLE … WITH (format = 'PARQUET', external_location = 's3://…') AS SELECT …` en Athena?

- [ ] Crea una vista sin datos
- [x] Ejecuta la consulta y **escribe** el resultado como archivos Parquet en S3, registrando la tabla en el catálogo
- [ ] Copia el CSV original sin cambios
- [ ] Solo funciona en Redshift
:::

:::ejercicio quiz
Necesitas aplicar cada noche las altas, bajas y cambios de clientes sobre una tabla del lago (un *upsert*). ¿Qué formato de tabla eliges en Athena?

- [ ] CSV con particiones
- [ ] JSON
- [x] Apache Iceberg, que soporta `MERGE INTO`, `UPDATE` y `DELETE`
- [ ] Ninguno: Athena solo lee
:::
