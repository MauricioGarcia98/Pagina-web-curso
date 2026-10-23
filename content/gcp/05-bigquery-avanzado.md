---
titulo: BigQuery avanzado, particiones, clustering, anidados y MERGE
nivel: Avanzado
duracion: 50
resumen: Tablas particionadas y clusterizadas, cómo leen menos datos; STRUCT, ARRAY y UNNEST; vistas materializadas; MERGE para upserts; control de costos y buenas prácticas.
---

## Particionar: cortar la tabla en trozos por fecha

Una tabla **particionada** se divide internamente, por ejemplo una partición por día. Si filtras por la columna de partición, BigQuery **solo lee esas particiones** (y solo te cobra esas).

```sql norun
CREATE OR REPLACE TABLE tienda_silver.pedidos
PARTITION BY fecha_pedido                 -- una partición por día (DATE)
CLUSTER BY canal, cliente_id              -- dentro de cada partición, ordenado por estas columnas
OPTIONS (partition_expiration_days = 730, require_partition_filter = TRUE)
AS
SELECT pedido_id, cliente_id, DATE(fecha_pedido) AS fecha_pedido, canal, estado
FROM tienda_bronze.pedidos;
```

| Tipo de partición | Ejemplo | Cuándo |
|---|---|---|
| Por columna de fecha/tiempo | `PARTITION BY fecha` o `PARTITION BY DATE(ts)` | Lo habitual: eventos, ventas, logs |
| Por mes/año | `PARTITION BY DATE_TRUNC(fecha, MONTH)` | Pocos datos por día (BigQuery admite hasta 10.000 particiones) |
| Por tiempo de ingesta | `_PARTITIONTIME` | Cuando no hay una fecha confiable en los datos |
| Por rango de enteros | `PARTITION BY RANGE_BUCKET(cliente_id, GENERATE_ARRAY(0, 100000, 1000))` | Raro; filtros por un id |

**Clustering** ordena los datos dentro de cada partición por hasta 4 columnas. Filtrar o agrupar por ellas lee menos bloques. Elige columnas con muchos valores que uses en `WHERE` (cliente, país, canal).

:::tip `require_partition_filter`
Con esta opción, BigQuery **rechaza** cualquier consulta que no filtre por la partición. Es el mejor seguro contra el analista que corre `SELECT *` sobre 5 años.
:::

### Laboratorio: mide cuánto ahorras

En esta terminal, `--dry_run` estima los bytes y tiene en cuenta la poda de particiones:

```bash
bq mk --dataset tienda_silver
bq query --use_legacy_sql=false 'CREATE OR REPLACE TABLE tienda_silver.pedidos PARTITION BY fecha_pedido CLUSTER BY canal AS SELECT pedido_id, cliente_id, date(fecha_pedido) AS fecha_pedido, canal, estado FROM tienda.pedidos'
bq show tienda_silver.pedidos
bq query --use_legacy_sql=false --dry_run 'SELECT canal, COUNT(*) FROM tienda_silver.pedidos GROUP BY canal'
bq query --use_legacy_sql=false --dry_run "SELECT canal, COUNT(*) FROM tienda_silver.pedidos WHERE fecha_pedido = '2024-12-24' GROUP BY canal"
```

## Datos anidados: STRUCT y ARRAY

BigQuery permite columnas que son **registros** (`STRUCT`) y **listas** (`ARRAY`). Así se evitan joins costosos: un pedido puede llevar adentro sus líneas.

```sql norun
CREATE TABLE tienda_gold.pedidos_anidados AS
SELECT p.pedido_id, p.cliente_id, p.fecha_pedido,
       ARRAY_AGG(STRUCT(d.producto_id, d.cantidad, d.precio_unitario)) AS lineas
FROM tienda_silver.pedidos p JOIN tienda_silver.detalle_pedidos d USING (pedido_id)
GROUP BY 1, 2, 3;

-- "desarmar" el array con UNNEST
SELECT pedido_id, l.producto_id, l.cantidad * l.precio_unitario AS importe
FROM tienda_gold.pedidos_anidados, UNNEST(lineas) AS l
WHERE l.cantidad >= 3;
```

:::analogia La caja con compartimentos
Una fila con un `ARRAY` de `STRUCT` es como una caja de un pedido que adentro trae cada producto en su compartimento. Para mirar producto por producto "abres la caja" con `UNNEST`, que es un join de la fila con su propio array.
:::

## MERGE: altas, cambios y bajas en un solo paso

```sql norun
MERGE tienda_silver.clientes AS t
USING tienda_bronze.clientes_cambios AS c
ON t.cliente_id = c.cliente_id
WHEN MATCHED AND c.operacion = 'BAJA' THEN DELETE
WHEN MATCHED THEN UPDATE SET email = c.email, segmento = c.segmento, actualizado = CURRENT_TIMESTAMP()
WHEN NOT MATCHED AND c.operacion <> 'BAJA' THEN
  INSERT (cliente_id, email, segmento, actualizado) VALUES (c.cliente_id, c.email, c.segmento, CURRENT_TIMESTAMP());
```

## Vistas materializadas y otras herramientas

| Herramienta | Para qué |
|---|---|
| **Vista materializada** | Agregados que se consultan mucho (BigQuery los mantiene y reescribe consultas para usarlos) |
| **BI Engine** | Caché en memoria para dashboards |
| **Time travel** | `FOR SYSTEM_TIME AS OF TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 HOUR)`: ver la tabla como era hace hasta 7 días |
| **Search / vector indexes** | Búsqueda de texto y embeddings |
| **BigQuery ML** | `CREATE MODEL … OPTIONS(model_type='logistic_reg')`: modelos con SQL |
| **INFORMATION_SCHEMA.JOBS** | Quién consultó qué y cuántos bytes: auditoría de costos |

```sql norun
-- las 10 consultas más caras de la última semana
SELECT user_email, total_bytes_billed / POW(1024, 4) AS tb, LEFT(query, 80) AS consulta
FROM `region-us`.INFORMATION_SCHEMA.JOBS
WHERE creation_time > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
ORDER BY total_bytes_billed DESC LIMIT 10;
```

## Ejercicios de SQL

:::ejercicio sql ordenado titulo="Banco: saldo de fin de mes por cuenta"
Caso 🏦. Para la cuenta `cuenta_id = 1`, calcula el saldo acumulado al cierre de cada `mes` (`YYYY-MM`): los `deposito` suman y el resto de los tipos restan (usa `monto` en positivo). Columnas: `mes`, `movimiento_neto` (redondeado a 2) y `saldo_cierre` (acumulado, redondeado a 2). Ordena por mes.
```sql solucion
WITH m AS (
  SELECT strftime('%Y-%m', fecha_hora) AS mes,
         SUM(CASE WHEN tipo = 'deposito' THEN monto ELSE -monto END) AS neto
  FROM banco_transacciones
  WHERE cuenta_id = 1
  GROUP BY mes
)
SELECT mes, ROUND(neto, 2) AS movimiento_neto,
       ROUND(SUM(neto) OVER (ORDER BY mes ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW), 2) AS saldo_cierre
FROM m
ORDER BY mes;
```
```pista
Primero agrega por mes; después usa `SUM(…) OVER (ORDER BY mes)` para acumular. Agregar y acumular en el mismo paso es un error común.
```
:::

:::ejercicio sql titulo="Simular UNNEST: productos por pedido"
En BigQuery, `detalle_pedidos` podría ser un `ARRAY` dentro de `pedidos`. Aquí está en otra tabla. Para cada pedido **con 4 o más líneas**, muestra `pedido_id`, `lineas` (cantidad de líneas) y `unidades` (suma de `cantidad`).
```sql solucion
SELECT pedido_id, COUNT(*) AS lineas, SUM(cantidad) AS unidades
FROM detalle_pedidos
GROUP BY pedido_id
HAVING COUNT(*) >= 4;
```
:::

:::ejercicio sql ordenado titulo="SaaS: upsert con lógica de MERGE"
Caso 💳 SaaS. Queremos la "foto actual" del plan de cada empresa: el plan de su **última** factura (por `mes`). Columnas: `empresa_id`, `plan` (nombre del plan), `ultimo_mes`. Solo empresas cuyo último plan **no** sea el más barato (`plan_id` con menor `precio_mensual`). Ordena por `empresa_id`.
```sql solucion
WITH ult AS (
  SELECT empresa_id, plan_id, mes,
         ROW_NUMBER() OVER (PARTITION BY empresa_id ORDER BY mes DESC) AS rn
  FROM saas_facturas
), barato AS (
  SELECT plan_id FROM saas_planes ORDER BY precio_mensual LIMIT 1
)
SELECT u.empresa_id, p.nombre AS plan, u.mes AS ultimo_mes
FROM ult u JOIN saas_planes p ON p.plan_id = u.plan_id
WHERE u.rn = 1 AND u.plan_id NOT IN (SELECT plan_id FROM barato)
ORDER BY u.empresa_id;
```
:::

## Ejercicios de terminal

:::ejercicio cli
Crea con `bq mk` la tabla `tienda_silver.eventos` particionada por el campo `fecha` y clusterizada por `tipo_evento`, con el esquema `evento_id:INTEGER,fecha:DATE,tipo_evento:STRING,cliente_id:INTEGER`.
```respuesta
todos: bq mk || (--table|-t) || --time_partitioning_field[= ]fecha || --clustering_fields[= ]tipo_evento || tienda_silver\.eventos evento_id:INTEGER,fecha:DATE,tipo_evento:STRING,cliente_id:INTEGER
```
```solucion
bq mk --table --time_partitioning_field fecha --clustering_fields tipo_evento tienda_silver.eventos evento_id:INTEGER,fecha:DATE,tipo_evento:STRING,cliente_id:INTEGER
```
```setup
bq mk --dataset tienda_silver
```
:::

:::ejercicio cli
Con `bq query`, crea (o reemplaza) la tabla `tienda_silver.pedidos` **particionada** por `fecha_pedido` a partir de `SELECT pedido_id, cliente_id, date(fecha_pedido) AS fecha_pedido, canal FROM tienda.pedidos`.
```respuesta
todos: bq query || (--use_legacy_sql=false|--nouse_legacy_sql) || ['"]CREATE (OR REPLACE )?TABLE `?(academia-datos-dev\.)?tienda_silver\.pedidos`? PARTITION BY fecha_pedido( CLUSTER BY [\w, ]+)? AS SELECT .*FROM `?(academia-datos-dev\.)?tienda\.pedidos`?;?['"]
```
```solucion
bq query --use_legacy_sql=false 'CREATE OR REPLACE TABLE tienda_silver.pedidos PARTITION BY fecha_pedido AS SELECT pedido_id, cliente_id, date(fecha_pedido) AS fecha_pedido, canal FROM tienda.pedidos'
```
```setup
bq mk --dataset tienda_silver
```
:::

:::ejercicio cli
Guarda el resultado de `SELECT canal, COUNT(*) AS pedidos FROM tienda.pedidos GROUP BY canal` en la tabla `tienda_gold.pedidos_por_canal`, **reemplazándola** si ya existe.
```respuesta
todos: bq query || (--use_legacy_sql=false|--nouse_legacy_sql) || --destination_table[= ](academia-datos-dev:)?tienda_gold\.pedidos_por_canal || --replace || ['"]SELECT canal, COUNT\(\*\) (AS )?pedidos FROM `?(academia-datos-dev\.)?tienda\.pedidos`? GROUP BY canal;?['"]
```
```solucion
bq query --use_legacy_sql=false --destination_table tienda_gold.pedidos_por_canal --replace 'SELECT canal, COUNT(*) AS pedidos FROM tienda.pedidos GROUP BY canal'
```
```setup
bq mk --dataset tienda_gold
```
:::

:::ejercicio quiz
La tabla `eventos` (8 TB, 2 años) está particionada por `fecha` y clusterizada por `cliente_id`. ¿Qué consulta lee menos?

- [ ] `SELECT * FROM eventos WHERE cliente_id = 42`
- [x] `SELECT tipo FROM eventos WHERE fecha = '2024-12-01' AND cliente_id = 42`
- [ ] `SELECT tipo FROM eventos WHERE EXTRACT(YEAR FROM ts) = 2024`
- [ ] Todas leen 8 TB
```explicacion
La segunda filtra la partición (un día) y la columna de clustering (pocos bloques dentro de ese día), y lee una sola columna. La primera lee todas las columnas de todas las particiones (el clustering ayuda, pero no tanto). La tercera filtra por `ts`, que no es la columna de partición.
```
:::

:::ejercicio quiz
¿Qué hace `SELECT pedido_id, l.cantidad FROM pedidos_anidados, UNNEST(lineas) AS l`?

- [ ] Borra el array
- [x] Genera una fila por cada elemento del array `lineas` de cada pedido (un join de la fila con su propio array)
- [ ] Devuelve solo la primera línea
- [ ] Da error: no se puede usar coma en FROM
:::

:::ejercicio quiz
Un analista borró por error filas de una tabla hace 2 horas. ¿Cómo recuperas los datos más rápido?

- [ ] No se puede
- [ ] Restaurando un backup de cinta
- [x] Con *time travel*: `SELECT * FROM t FOR SYSTEM_TIME AS OF TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 3 HOUR)` y reinsertarlas
- [ ] Con `bq rm`
:::
