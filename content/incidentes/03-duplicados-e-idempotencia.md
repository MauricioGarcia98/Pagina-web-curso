---
titulo: Cargas duplicadas - reintentos, idempotencia y MERGE
nivel: Avanzado
duracion: 60
resumen: El incidente más común de un pipeline - un reintento que vuelve a insertar lo que ya estaba. Por qué pasa (timeouts después del COMMIT, entrega al menos una vez, joins que multiplican filas), cómo medir el impacto, cómo deduplicar sin perder datos y cómo hacer cargas idempotentes con borrar e insertar por partición, UPSERT y MERGE.
objetivos: Explicar por qué un reintento puede duplicar una carga aunque la tarea haya fallado | Detectar y cuantificar duplicados por carga y su impacto en los totales | Eliminar duplicados conservando una fila por clave | Escribir una recarga idempotente por partición y un UPSERT | Detectar la duplicación por un join que multiplica filas
prerrequisitos: incidentes-monitoreo-y-checks
autoevaluacion: ¿Sabes por qué un timeout puede terminar en datos duplicados? | ¿Sabes qué significa que una carga sea idempotente? | ¿Sabes deduplicar una tabla con ROW_NUMBER o rowid? | ¿Sabes cuándo usar borrar e insertar por partición y cuándo MERGE? | ¿Sabes reconocer un join que infla los totales?
---

:::escenario
Finanzas escribe a las 09:30: "las ventas del 28/10 dan el **doble** de lo que dice el sistema de facturación". La tarea `cargar_fct_pedidos` muestra un intento fallido por timeout y un segundo intento exitoso. Nadie tocó nada. ¿Cómo puede un intento **fallido** haber cargado datos?
:::

## La idea en una frase

Una carga es **idempotente** si correrla una vez o diez veces deja exactamente el mismo resultado. Los reintentos son inevitables (redes que se cortan, workers que se reinician, timeouts), así que **toda carga tiene que poder repetirse sin duplicar**.

## Cómo un intento fallido carga datos

```diagrama
titulo: El commit fantasma
nodo af: Airflow (intento 1) | icono=airflow | col=0 | fila=0
nodo db: Postgres | icono=postgres | col=2 | fila=0 | forma=cilindro
nodo t: Timeout a los 30 min | icono=reloj | col=0 | fila=1 | color=rojo | sub=marca UP_FOR_RETRY
nodo r: Intento 2 | icono=airflow | col=1 | fila=1 | sub=INSERT otra vez
nodo d: 36.864 filas | icono=tabla | col=2 | fila=1 | color=rojo | sub=el doble
flecha af -> db: INSERT + COMMIT | paso=1 | explica=El INSERT termina y el servidor aplica el COMMIT.
flecha db -> af: confirmación perdida | estilo=punteada | paso=2 | explica=La conexión se corta antes de que la confirmación llegue al worker. Airflow no sabe que el COMMIT se aplicó.
flecha af -> t: paso=3 | explica=El worker se queda esperando hasta el execution_timeout y la tarea se marca para reintentar.
flecha t -> r: paso=4 | explica=El reintento ejecuta el mismo INSERT, que es un append: no sabe que esas filas ya están.
flecha r -> d: paso=5 | explica=Resultado: cada pedido del día aparece dos veces.
```

El problema no es el reintento: es que la carga es un **append** (`INSERT INTO … SELECT …`). Un append solo es seguro si el mismo lote nunca puede llegar dos veces, y en sistemas distribuidos eso no se puede garantizar.

Otras fuentes de duplicados:

| Causa | Ejemplo |
|---|---|
| **Entrega al menos una vez** (at-least-once) | Kafka, SQS y Pub/Sub pueden entregar el mismo mensaje dos veces después de un rebalanceo o un reinicio |
| **Backfill encima de datos existentes** | Alguien reprocesa octubre con un `INSERT` y los días ya cargados quedan dobles |
| **El origen manda duplicados** | Una API con paginación por offset devuelve una fila en dos páginas si cambian los datos durante la lectura |
| **Un join que multiplica filas** (fan-out) | Unir pedidos con pagos cuando un pedido tiene tres cuotas: el monto del pedido aparece tres veces |

:::cuidado Las claves primarias de los warehouses no se validan
En Snowflake, BigQuery, Redshift y Databricks, `PRIMARY KEY` y `UNIQUE` son **informativos**: el motor no rechaza duplicados (Snowflake solo valida `NOT NULL`). En PostgreSQL, MySQL y SQLite sí se validan. Si tu warehouse no valida la clave, necesitas un check de unicidad.
:::

## Las tres formas de cargar sin duplicar

| Estrategia | Cómo | Cuándo |
|---|---|---|
| **Reemplazar la partición** | `DELETE` del día + `INSERT` del día, en una transacción (o `INSERT OVERWRITE` / `replaceWhere`) | Tablas de hechos particionadas por fecha; backfills |
| **UPSERT / MERGE por clave** | `INSERT … ON CONFLICT DO UPDATE` o `MERGE INTO … WHEN MATCHED … WHEN NOT MATCHED` | Dimensiones y tablas que reciben cambios de filas sueltas |
| **Clave de idempotencia** | Cada evento trae un id único; se ignoran los ya vistos | Eventos y streaming |

```motores
titulo: Recargar un día de forma idempotente
[sqlite norun]
BEGIN;
DELETE FROM fct_pedidos WHERE fecha = '2026-10-28';
INSERT INTO fct_pedidos SELECT * FROM staging_pedidos WHERE fecha = '2026-10-28';
COMMIT;
[databricks norun]
INSERT INTO fct_pedidos REPLACE WHERE fecha = '2026-10-28'
SELECT * FROM staging_pedidos WHERE fecha = '2026-10-28';
[bigquery norun]
MERGE fct_pedidos t
USING (SELECT * FROM staging_pedidos WHERE fecha = '2026-10-28') s
ON FALSE
WHEN NOT MATCHED BY SOURCE AND t.fecha = '2026-10-28' THEN DELETE
WHEN NOT MATCHED THEN INSERT ROW;
[snowflake norun]
BEGIN;
DELETE FROM fct_pedidos WHERE fecha = '2026-10-28';
INSERT INTO fct_pedidos SELECT * FROM staging_pedidos WHERE fecha = '2026-10-28';
COMMIT;
```

:::cuidado MERGE con duplicados en el origen
Si la tabla de origen de un `MERGE` tiene dos filas con la misma clave, el motor no sabe cuál aplicar y falla: SQL Server dice *"The MERGE statement attempted to UPDATE or DELETE the same row more than once"*, Databricks lanza `DELTA_MULTIPLE_SOURCE_ROW_MATCHING_TARGET_ROW_IN_MERGE` y BigQuery *"UPDATE/MERGE must match at most one source row for each target row"*. Deduplica el origen antes (por ejemplo, la última versión de cada clave con `ROW_NUMBER`).
:::

## Antes de borrar: medir el impacto

En un incidente de duplicados, antes de tocar nada responde:

1. **¿Qué cargas y qué fechas** están afectadas? (por `load_id` o por fecha)
2. **¿Cuánto se infló** cada métrica? (para avisar a Finanzas con números)
3. **¿Quién consumió los datos duplicados?** Tableros, exportaciones a otros sistemas, modelos. Si una exportación ya salió, el incidente no termina cuando arreglas la tabla.
4. **Respaldo**: guarda una copia de las filas que vas a borrar (o anota la versión de la tabla si es Delta o Iceberg).

## Práctica

:::ejercicio cli dificultad=Básico titulo="Preparar el incidente"
Prepara los archivos del incidente `duplicados`.
```respuesta
incidente-preparar duplicados
```
:::

:::ejercicio cli dificultad=Intermedio titulo="Seguir los intentos"
En `~/incidentes/duplicados/logs/cargar_fct_pedidos.log`, muestra solo las líneas que contienen `attempt` **o** `Rows affected` (usa `grep -E` con `|`).
```setup
incidente-preparar duplicados
```
```respuesta
grep( -i)? -E( -i)? ['"][^'"]*\|[^'"]*['"] \S*cargar_fct_pedidos\.log
grep( -i)? -iE ['"][^'"]*\|[^'"]*['"] \S*cargar_fct_pedidos\.log
```
```solucion
grep -E "attempt|Rows affected" ~/incidentes/duplicados/logs/cargar_fct_pedidos.log
```
```pista
`grep -E "uno|otro" archivo` muestra las líneas que tienen cualquiera de las dos palabras.
```
:::

:::ejercicio quiz dificultad=Intermedio
Lee también `~/incidentes/duplicados/logs/postgres.log`. ¿Qué pasó con el intento 1?

- [ ] El INSERT falló y no escribió nada
- [x] El INSERT y el COMMIT se aplicaron, pero la conexión se cortó antes de que el worker recibiera la confirmación; Airflow lo dio por fallido y reintentó
- [ ] Postgres hizo ROLLBACK automático por el timeout
- [ ] El intento 2 reemplazó las filas del intento 1
:::

:::ejercicio cli dificultad=Intermedio titulo="Contar pedidos repetidos en la muestra"
`~/incidentes/duplicados/muestra_fct_pedidos.csv` tiene `pedido_id,cliente_id,monto,load_id`. Cuenta cuántos `pedido_id` aparecen más de una vez.
```setup
incidente-preparar duplicados
```
```respuesta
cut -d ?['"]?,['"]? -f ?1 \S*muestra_fct_pedidos\.csv \| sort \| uniq -d \| wc -l
tail -n \+2 \S*muestra_fct_pedidos\.csv \| cut -d ?['"]?,['"]? -f ?1 \| sort \| uniq -d \| wc -l
awk -F ?['"]?,['"]? .+ \S*muestra_fct_pedidos\.csv.*
cut -d ?['"]?,['"]? -f ?1 \S*muestra_fct_pedidos\.csv \| sort \| uniq -c \| grep -v ['"]? *1 ['"]? \| wc -l
```
```solucion
cut -d, -f1 ~/incidentes/duplicados/muestra_fct_pedidos.csv | sort | uniq -d | wc -l
```
```pista
`uniq -d` muestra solo las líneas repetidas (después de `sort`). `wc -l` las cuenta.
```
```explicacion
40 de 60 pedidos de la muestra están dos veces: todos con `load_id` L-7731 y L-7732, los dos intentos.
```
:::

:::ejercicio sql ordenado dificultad=Intermedio titulo="¿Qué fechas están duplicadas?"
`fct_pedidos(pedido_id, cliente_id, fecha, monto, load_id)` debería tener un pedido por fila. Por cada `fecha`, devuelve `filas`, `pedidos` (distintos) y `sobrantes` (filas − pedidos). Ordena por fecha.
```sql setup
CREATE TABLE fct_pedidos (pedido_id INTEGER, cliente_id INTEGER, fecha TEXT, monto REAL, load_id TEXT);
WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 600)
INSERT INTO fct_pedidos
SELECT 880000 + i, 1000 + (i * 37) % 400, CASE WHEN i <= 300 THEN '2026-10-27' ELSE '2026-10-28' END,
       ROUND(20 + (i * 7.31) % 300, 2), CASE WHEN i <= 300 THEN 'L-7730' ELSE 'L-7731' END
FROM n;
INSERT INTO fct_pedidos SELECT pedido_id, cliente_id, fecha, monto, 'L-7732' FROM fct_pedidos WHERE load_id = 'L-7731';
```
```sql solucion
SELECT fecha, COUNT(*) AS filas, COUNT(DISTINCT pedido_id) AS pedidos,
       COUNT(*) - COUNT(DISTINCT pedido_id) AS sobrantes
FROM fct_pedidos
GROUP BY fecha
ORDER BY fecha;
```
```pista
`COUNT(*)` cuenta filas y `COUNT(DISTINCT pedido_id)` cuenta pedidos únicos. La resta son las filas que sobran.
```
:::

:::ejercicio sql dificultad=Avanzado titulo="Cuantificar el impacto para Finanzas"
Para el `2026-10-28`, devuelve `monto_reportado` (la suma de `monto` tal como está la tabla), `monto_real` (contando cada pedido una sola vez) y `inflado_pct` (cuánto más reporta, en %, 1 decimal). Redondea los montos a 2 decimales.
```sql setup
CREATE TABLE fct_pedidos (pedido_id INTEGER, cliente_id INTEGER, fecha TEXT, monto REAL, load_id TEXT);
WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 600)
INSERT INTO fct_pedidos
SELECT 880000 + i, 1000 + (i * 37) % 400, CASE WHEN i <= 300 THEN '2026-10-27' ELSE '2026-10-28' END,
       ROUND(20 + (i * 7.31) % 300, 2), CASE WHEN i <= 300 THEN 'L-7730' ELSE 'L-7731' END
FROM n;
INSERT INTO fct_pedidos SELECT pedido_id, cliente_id, fecha, monto, 'L-7732' FROM fct_pedidos WHERE load_id = 'L-7731';
```
```sql solucion
WITH unicos AS (
  SELECT pedido_id, MAX(monto) AS monto FROM fct_pedidos WHERE fecha = '2026-10-28' GROUP BY pedido_id
)
SELECT ROUND((SELECT SUM(monto) FROM fct_pedidos WHERE fecha = '2026-10-28'), 2) AS monto_reportado,
       ROUND((SELECT SUM(monto) FROM unicos), 2) AS monto_real,
       ROUND(100.0 * ((SELECT SUM(monto) FROM fct_pedidos WHERE fecha = '2026-10-28') / (SELECT SUM(monto) FROM unicos) - 1), 1) AS inflado_pct;
```
```pista
Para el monto real, primero quédate con una fila por pedido: `GROUP BY pedido_id` con `MAX(monto)` (las dos copias tienen el mismo monto).
```
```explicacion
100 %: cada pedido del día está exactamente dos veces. Con este número le respondes a Finanzas antes de arreglar nada, y explicas que el sistema de facturación tiene razón.
```
:::

:::ejercicio sql dificultad=Avanzado titulo="Deduplicar conservando una fila"
Borra los duplicados de `fct_pedidos` dejando **una fila por `pedido_id`** (la primera que se insertó). En SQLite cada fila tiene un `rowid` creciente que sirve para eso.
```sql setup
CREATE TABLE fct_pedidos (pedido_id INTEGER, cliente_id INTEGER, fecha TEXT, monto REAL, load_id TEXT);
WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 600)
INSERT INTO fct_pedidos
SELECT 880000 + i, 1000 + (i * 37) % 400, CASE WHEN i <= 300 THEN '2026-10-27' ELSE '2026-10-28' END,
       ROUND(20 + (i * 7.31) % 300, 2), CASE WHEN i <= 300 THEN 'L-7730' ELSE 'L-7731' END
FROM n;
INSERT INTO fct_pedidos SELECT pedido_id, cliente_id, fecha, monto, 'L-7732' FROM fct_pedidos WHERE load_id = 'L-7731';
```
```sql solucion
DELETE FROM fct_pedidos
WHERE rowid NOT IN (SELECT MIN(rowid) FROM fct_pedidos GROUP BY pedido_id);
```
```check
SELECT fecha, COUNT(*) AS filas, COUNT(DISTINCT pedido_id) AS pedidos, MIN(load_id) AS primer_load, MAX(load_id) AS ultimo_load
FROM fct_pedidos GROUP BY fecha ORDER BY fecha;
```
```pista
Para cada `pedido_id`, la fila a conservar es `MIN(rowid)`. Borra todas las demás.
```
```pista
`DELETE FROM fct_pedidos WHERE rowid NOT IN (SELECT MIN(rowid) FROM fct_pedidos GROUP BY pedido_id)`.
```
```explicacion
En warehouses sin `rowid` se usa `ROW_NUMBER() OVER (PARTITION BY pedido_id ORDER BY cargado_en) = 1` para elegir la fila y se reescribe la tabla (o la partición) con `CREATE OR REPLACE … AS SELECT` o `INSERT OVERWRITE`. En Delta e Iceberg puedes además volver a una versión anterior a la carga duplicada.
```
:::

:::ejercicio sql dificultad=Avanzado titulo="Recarga idempotente del día"
Corrige el día de raíz: reemplaza la partición `2026-10-28` de `fct_pedidos` con los datos de `staging_pedidos`, **borrando e insertando**. Si alguien vuelve a correr tu solución, el resultado debe ser el mismo.
```sql setup
CREATE TABLE fct_pedidos (pedido_id INTEGER, cliente_id INTEGER, fecha TEXT, monto REAL, load_id TEXT);
WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 600)
INSERT INTO fct_pedidos
SELECT 880000 + i, 1000 + (i * 37) % 400, CASE WHEN i <= 300 THEN '2026-10-27' ELSE '2026-10-28' END,
       ROUND(20 + (i * 7.31) % 300, 2), CASE WHEN i <= 300 THEN 'L-7730' ELSE 'L-7731' END
FROM n;
INSERT INTO fct_pedidos SELECT pedido_id, cliente_id, fecha, monto, 'L-7732' FROM fct_pedidos WHERE load_id = 'L-7731';
CREATE TABLE staging_pedidos AS SELECT DISTINCT pedido_id, cliente_id, fecha, monto, 'L-7733' AS load_id FROM fct_pedidos WHERE fecha = '2026-10-28';
```
```sql solucion
DELETE FROM fct_pedidos WHERE fecha = '2026-10-28';
INSERT INTO fct_pedidos SELECT pedido_id, cliente_id, fecha, monto, load_id FROM staging_pedidos WHERE fecha = '2026-10-28';
```
```check
SELECT fecha, COUNT(*) AS filas, COUNT(DISTINCT pedido_id) AS pedidos, ROUND(SUM(monto), 2) AS monto
FROM fct_pedidos GROUP BY fecha ORDER BY fecha;
```
```pista
Dos sentencias: primero `DELETE … WHERE fecha = '2026-10-28'`, después `INSERT … SELECT … FROM staging_pedidos WHERE fecha = '2026-10-28'`.
```
```explicacion
En producción van dentro de una transacción (`BEGIN … COMMIT`) para que nadie vea la partición vacía entre las dos sentencias. Con este patrón, el reintento que causó el incidente habría borrado lo del intento 1 antes de insertar: idempotente por diseño.
```
:::

:::ejercicio sql dificultad=Avanzado titulo="UPSERT de saldos"
`saldos(cliente_id PRIMARY KEY, saldo, actualizado_en)` recibe cambios de `cambios_saldo` (algunos clientes existen y otros son nuevos). Aplica los cambios con **un solo** `INSERT … ON CONFLICT … DO UPDATE` para que repetirlo no duplique nada.
```sql setup
CREATE TABLE saldos (cliente_id INTEGER PRIMARY KEY, saldo REAL, actualizado_en TEXT);
INSERT INTO saldos VALUES (1, 100, '2026-10-27'), (2, 250, '2026-10-27'), (3, 0, '2026-10-27');
CREATE TABLE cambios_saldo (cliente_id INTEGER, saldo REAL, actualizado_en TEXT);
INSERT INTO cambios_saldo VALUES (2, 300, '2026-10-28'), (3, 45.5, '2026-10-28'), (4, 80, '2026-10-28');
```
```sql solucion
INSERT INTO saldos (cliente_id, saldo, actualizado_en)
SELECT cliente_id, saldo, actualizado_en FROM cambios_saldo WHERE true
ON CONFLICT (cliente_id) DO UPDATE SET saldo = excluded.saldo, actualizado_en = excluded.actualizado_en;
```
```check
SELECT * FROM saldos ORDER BY cliente_id;
```
```pista
`INSERT INTO saldos (…) SELECT … FROM cambios_saldo WHERE true ON CONFLICT (cliente_id) DO UPDATE SET saldo = excluded.saldo, …`
```
```pista
En SQLite, cuando el UPSERT usa `INSERT … SELECT`, el `SELECT` necesita un `WHERE` (aunque sea `WHERE true`) para que el parser no confunda `ON CONFLICT` con un join.
```
:::

:::ejercicio sql ordenado dificultad=Experto titulo="Deduplicar el origen de un MERGE"
`cambios_pedidos(pedido_id, estado, actualizado_en)` va a ser el origen de un `MERGE`, pero tiene varias filas por pedido y el MERGE fallaría. Devuelve **solo la última versión** de cada pedido (`pedido_id`, `estado`, `actualizado_en`), ordenada por `pedido_id`.
```sql setup
CREATE TABLE cambios_pedidos (pedido_id INTEGER, estado TEXT, actualizado_en TEXT);
INSERT INTO cambios_pedidos VALUES
(10, 'CREADO', '2026-10-28 08:00'), (10, 'PAGADO', '2026-10-28 08:05'), (10, 'ENVIADO', '2026-10-28 15:40'),
(11, 'CREADO', '2026-10-28 09:12'),
(12, 'CREADO', '2026-10-28 10:00'), (12, 'CANCELADO', '2026-10-28 10:30'),
(13, 'PAGADO', '2026-10-28 11:00'), (13, 'PAGADO', '2026-10-28 11:00');
```
```sql solucion
WITH r AS (
  SELECT pedido_id, estado, actualizado_en,
         ROW_NUMBER() OVER (PARTITION BY pedido_id ORDER BY actualizado_en DESC) AS rn
  FROM cambios_pedidos
)
SELECT pedido_id, estado, actualizado_en FROM r WHERE rn = 1 ORDER BY pedido_id;
```
```pista
`ROW_NUMBER() OVER (PARTITION BY pedido_id ORDER BY actualizado_en DESC)` numera las versiones de cada pedido desde la más nueva.
```
```explicacion
El pedido 13 tiene dos filas idénticas: un duplicado exacto del origen. `ROW_NUMBER` elige una sola; `RANK` dejaría las dos (empatan) y el MERGE volvería a fallar. En Databricks y BigQuery este paso se escribe con `QUALIFY ROW_NUMBER() OVER (…) = 1`.
```
:::

:::ejercicio sql dificultad=Avanzado titulo="El join que duplica"
Un analista calculó las ventas uniendo `ped_cuotas` (pedidos) con `pagos_cuotas` (un pedido puede pagarse en cuotas) y sumando `ped_cuotas.monto`. Devuelve `monto_con_join` (lo que calculó el analista) y `monto_real` (la suma de `ped_cuotas.monto` sin join).
```sql setup
CREATE TABLE ped_cuotas (pedido_id INTEGER PRIMARY KEY, monto REAL);
INSERT INTO ped_cuotas VALUES (1, 300), (2, 120), (3, 90), (4, 600);
CREATE TABLE pagos_cuotas (pago_id INTEGER PRIMARY KEY, pedido_id INTEGER, monto_pago REAL);
INSERT INTO pagos_cuotas VALUES (1, 1, 100), (2, 1, 100), (3, 1, 100), (4, 2, 120), (5, 3, 90), (6, 4, 200), (7, 4, 200), (8, 4, 200);
```
```sql solucion
SELECT (SELECT SUM(p.monto) FROM ped_cuotas p JOIN pagos_cuotas g ON g.pedido_id = p.pedido_id) AS monto_con_join,
       (SELECT SUM(monto) FROM ped_cuotas) AS monto_real;
```
```pista
El cálculo del analista es `SUM(p.monto)` sobre el `JOIN`. El real no necesita el join.
```
```explicacion
2.910 contra 1.110: el join repite cada pedido una vez por cuota (fan-out). Si necesitas datos de las dos tablas, **agrega primero** la tabla hija (`SELECT pedido_id, SUM(monto_pago) FROM pagos_cuotas GROUP BY pedido_id`) y después une: así el grano queda en una fila por pedido.
```
:::

:::ejercicio quiz dificultad=Avanzado
Una tabla de eventos de clics se carga desde Kafka, que entrega al menos una vez. Los eventos no traen un id. ¿Qué haces para que la carga sea idempotente?

- [ ] Nada: Kafka garantiza exactamente una vez hacia cualquier base de datos
- [ ] Usar `INSERT` y confiar en que no habrá reintentos
- [x] Pedir al productor un id de evento único (o generar uno determinista, como un hash de los campos) y deduplicar o hacer MERGE por ese id
- [ ] Borrar la tabla y recargarla completa cada hora
:::

:::ejercicio quiz dificultad=Avanzado
En Snowflake creaste `fct_pedidos` con `PRIMARY KEY (pedido_id)`. Un reintento inserta el mismo lote dos veces. ¿Qué pasa?

- [ ] El segundo INSERT falla por violar la clave primaria
- [x] Se insertan los duplicados: la clave primaria es informativa y no se valida
- [ ] Snowflake reemplaza las filas existentes
- [ ] Snowflake hace un MERGE automático
:::

:::errores
- **Borrar sin respaldo**: antes de un `DELETE` masivo, copia las filas (`CREATE TABLE respaldo AS SELECT …`) o anota la versión de la tabla.
- **Deduplicar con `DISTINCT` sobre todas las columnas**: si las copias difieren en `cargado_en` o `load_id`, `DISTINCT` no las une. Deduplica por la **clave de negocio**.
- **Usar `RANK` para elegir la última versión**: con empates devuelve más de una fila por clave. Usa `ROW_NUMBER` con un desempate determinista.
- **Arreglar la tabla y olvidar a los consumidores**: si una exportación o un modelo ya leyó los duplicados, también hay que corregirlos o avisar.
- **"Solucionarlo" quitando los reintentos**: el próximo corte de red deja el día sin datos. La solución es que la carga sea idempotente.
:::

:::trabajo
- En Airflow, cada tarea recibe la fecha lógica (`{{ ds }}`) y escribe **solo esa partición**: así un reintento o un backfill reemplaza en lugar de agregar.
- En dbt, los modelos `incremental` usan `unique_key` (MERGE) o la estrategia `insert_overwrite` / `delete+insert` por partición.
- En Spark con Delta: `replaceWhere` o `MERGE`; en Spark Structured Streaming, `foreachBatch` con MERGE y el id del lote.
- Muchas empresas agregan una columna `_load_id` o `_cargado_en` a cada tabla: hace triviales los diagnósticos como el de este incidente.
:::

:::entrevista
**"¿Qué significa que un pipeline sea idempotente y cómo lo logras?"** Que correrlo varias veces con la misma entrada deja el mismo resultado. Se logra escribiendo por partición con reemplazo (delete+insert, `INSERT OVERWRITE`, `replaceWhere`), con MERGE por una clave de negocio, o con claves de idempotencia en eventos. Menciona el caso del timeout después del COMMIT: demuestra que entiendes por qué los reintentos duplican.
:::

## Resumen

| Situación | Solución |
|---|---|
| Hechos por fecha | Reemplazar la partición (delete+insert, overwrite, replaceWhere) |
| Cambios de filas sueltas | UPSERT / MERGE por clave, con el origen deduplicado |
| Eventos con entrega al menos una vez | Id único del evento + deduplicación |
| Join entre tablas de distinto grano | Agregar la tabla hija antes de unir |
