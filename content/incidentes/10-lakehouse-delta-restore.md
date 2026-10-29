---
titulo: Lakehouse en problemas - el overwrite, el VACUUM y el RESTORE que falla
nivel: Experto
duracion: 55
resumen: Un incidente encadenado en una tabla Delta - un overwrite por error deja 1.412 filas donde había 1,2 millones, un VACUUM con retención 0 borra los archivos de las versiones anteriores y el RESTORE falla. Más los errores de concurrencia (ConcurrentAppendException) y de esquema (DELTA_SCHEMA_MISMATCH). Cómo leer el historial de una tabla, recuperar datos y qué permisos y configuraciones lo previenen.
objetivos: Leer el historial de una tabla Delta y encontrar la operación que dañó los datos | Explicar la relación entre time travel, VACUUM y la retención de archivos | Recuperar una tabla a una versión anterior y verificar la recuperación | Detectar en un historial una escritura que redujo drásticamente las filas | Prevenir conflictos de concurrencia y escrituras destructivas
prerrequisitos: incidentes-duplicados-e-idempotencia
autoevaluacion: ¿Sabes qué muestra DESCRIBE HISTORY? | ¿Sabes por qué un RESTORE puede fallar después de un VACUUM? | ¿Sabes cuál es la retención por defecto de VACUUM y por qué existe el chequeo? | ¿Sabes qué significa ConcurrentAppendException y cómo evitarla? | ¿Sabes qué permisos y prácticas evitan un overwrite accidental?
---

:::escenario
06:15. El tablero de clientes falla. A las 07:40, alguien del equipo de soporte intenta "volver atrás" la tabla `main.crm.dim_clientes` y obtiene `DELTA_FILE_NOT_FOUND_DETAILED`. Te pasan el caso con una pregunta: **¿se perdieron los datos de 1,2 millones de clientes?**
:::

## La idea en una frase

Delta Lake (e Iceberg, con otros nombres) guarda **versiones**: cada escritura crea una nueva versión en el log de transacciones, y los archivos de las versiones anteriores siguen en el almacenamiento hasta que un **VACUUM** los borra. El time travel y el RESTORE funcionan **solo mientras esos archivos existan**.

```diagrama
titulo: La cadena del incidente
nodo v40: v40 MERGE | icono=delta | col=0 | fila=0 | sub=1.204.880 filas | color=verde
nodo v41: v41 WRITE Overwrite | icono=alerta | col=1 | fila=0 | sub=1.412 filas | color=rojo
nodo v43: v42-43 VACUUM 0 h | icono=x | col=2 | fila=0 | sub=borra 3.120 archivos | color=rojo
nodo r: RESTORE a v40 | icono=x | col=3 | fila=0 | sub=DELTA_FILE_NOT_FOUND | color=rojo
nodo b: Reconstruir desde bronze | icono=capas | col=2 | fila=1 | color=verde | sub=o desde un clon/backup
flecha v40 -> v41: modo overwrite por error | paso=1 | explica=Un lote correctivo manual se lanzó con modo=overwrite: la tabla quedó con 1.412 filas. Las versiones anteriores siguen disponibles por time travel.
flecha v41 -> v43: paso=2 | explica=Alguien corrió VACUUM con retención 0 y el chequeo de seguridad desactivado: se borraron los archivos que ya no usa la versión actual, que eran justamente los de las versiones anteriores.
flecha v43 -> r: paso=3 | explica=El RESTORE a la versión 40 necesita esos archivos, que ya no existen.
flecha r -> b: estilo=punteada | paso=4 | explica=La salida es reconstruir la tabla desde la capa cruda (bronze) o desde un clon o backup, si existen.
```

## Las operaciones y lo que hacen con los archivos

| Operación | Qué hace |
|---|---|
| `DESCRIBE HISTORY tabla` | Lista las versiones: número, fecha, usuario, operación, parámetros y métricas (`numOutputRows`, `numTargetRowsDeleted`…) |
| `SELECT … FROM tabla VERSION AS OF 40` / `TIMESTAMP AS OF '…'` | Time travel: lee una versión anterior |
| `RESTORE TABLE tabla TO VERSION AS OF 40` | Crea una versión nueva igual a la 40 (no borra el historial) |
| `VACUUM tabla [RETAIN n HOURS]` | Borra los archivos que ya no usa ninguna versión dentro de la retención. Por defecto, **7 días** (168 h) |
| `spark.databricks.delta.retentionDurationCheck.enabled` | El chequeo que impide un VACUUM con retención menor a la configurada. Desactivarlo es la forma de llegar a este incidente |
| `delta.deletedFileRetentionDuration` / `delta.logRetentionDuration` | Propiedades de la tabla: cuánto se conservan los archivos borrados y el historial del log |
| `CREATE TABLE copia DEEP CLONE tabla` | Copia completa (datos y metadatos): un backup que no depende de la tabla original |

:::cuidado VACUUM con retención 0 también rompe lectores
Además de impedir el time travel, un VACUUM con retención menor a la duración de las consultas en curso puede borrar archivos que un job o un stream **está leyendo en ese momento**, y ese job falla con archivo no encontrado. Por eso existe el chequeo de 7 días.
:::

## Concurrencia y esquema

| Error | Qué significa | Corrección |
|---|---|---|
| `ConcurrentAppendException` | Otra escritura agregó archivos en la zona que tu operación leyó, entre que empezaste y que intentaste confirmar | Hacer las escrituras **disjuntas**: condición del MERGE con la columna de partición (`t.fecha = '…'`), o no correr dos jobs sobre la misma tabla a la vez; reintentar con espera |
| `ConcurrentDeleteReadException` / `ConcurrentDeleteDeleteException` | Otra operación borró archivos que tu operación leyó o quería borrar | Igual: disjuntas o serializadas |
| `DELTA_SCHEMA_MISMATCH` | Los datos que escribes tienen otro esquema que la tabla | Corregir el código o evolucionar el esquema a propósito (no activar `mergeSchema` por reflejo: ver la lección de esquemas) |

## Práctica

:::ejercicio cli dificultad=Básico titulo="Preparar el incidente"
Prepara los archivos del incidente `delta`.
```respuesta
incidente-preparar delta
```
:::

:::ejercicio cli dificultad=Intermedio titulo="Las operaciones del historial"
`~/incidentes/delta/historial_dim_clientes.json` es la salida de `DESCRIBE HISTORY` (de la versión más nueva a la más vieja). Muestra solo la **operación** de cada versión con `jq`.
```setup
incidente-preparar delta
```
```respuesta
jq( -r)? ['"]?\.\[\] ?\| ?\.operation['"]? \S*historial_dim_clientes\.json
jq( -r)? ['"]?\.\[\]\.operation['"]? \S*historial_dim_clientes\.json
```
```solucion
jq '.[] | .operation' ~/incidentes/delta/historial_dim_clientes.json
```
```pista
`.[]` recorre el arreglo y `.operation` toma ese campo de cada elemento.
```
:::

:::ejercicio cli dificultad=Intermedio titulo="La versión sospechosa"
La cuarta entrada del historial (índice 3) es la versión 41, el `WRITE`. Muéstrala completa con `jq`.
```setup
incidente-preparar delta
```
```respuesta
jq ['"]?\.\[3\]['"]? \S*historial_dim_clientes\.json
```
```solucion
jq '.[3]' ~/incidentes/delta/historial_dim_clientes.json
```
:::

:::ejercicio quiz dificultad=Avanzado
¿Qué hizo la versión 41?

- [ ] Agregó 1.412 clientes nuevos
- [x] Reemplazó la tabla completa (`mode: Overwrite`) con 1.412 filas: el resto de los clientes dejó de estar en la versión actual
- [ ] Borró 1.412 clientes duplicados
- [ ] Cambió el esquema de la tabla
:::

:::ejercicio cli dificultad=Intermedio titulo="Los parámetros del VACUUM"
Muestra los `operationParameters` de la entrada de índice 2 (`VACUUM START`).
```setup
incidente-preparar delta
```
```respuesta
jq ['"]?\.\[2\] ?\| ?\.operationParameters['"]? \S*historial_dim_clientes\.json
jq ['"]?\.\[2\]\.operationParameters['"]? \S*historial_dim_clientes\.json
```
```solucion
jq '.[2].operationParameters' ~/incidentes/delta/historial_dim_clientes.json
```
```explicacion
`retentionCheckEnabled: false` y `specifiedRetentionMillis: 0`: alguien desactivó el chequeo de seguridad y corrió `VACUUM … RETAIN 0 HOURS`, probablemente para "liberar espacio" sin saber que había un overwrite pendiente de revertir.
```
:::

:::ejercicio quiz dificultad=Experto
¿Por qué falla `RESTORE TABLE main.crm.dim_clientes TO VERSION AS OF 40`?

- [ ] Porque RESTORE solo funciona dentro de la misma hora
- [ ] Porque la versión 40 fue un MERGE y no se puede restaurar
- [x] Porque el VACUUM con retención 0 borró los archivos de datos que solo usaban las versiones anteriores a la 41; el log todavía nombra esos archivos, pero ya no existen
- [ ] Porque el usuario de soporte no tiene permisos de lectura
:::

:::ejercicio quiz dificultad=Experto
Los archivos ya no están en la tabla. ¿Cuáles son las opciones reales para recuperar los clientes?

- [ ] Ninguna: los datos se perdieron para siempre
- [ ] Correr `RESTORE` con `force=true`
- [x] Reconstruir la tabla reprocesando desde la capa cruda (bronze) o desde un clon o backup; si el almacenamiento tiene versionado de objetos o soft delete (S3 versioning, soft delete de ADLS), recuperar los archivos borrados
- [ ] Volver a correr el VACUUM con retención 168 horas
:::

:::ejercicio cli dificultad=Básico titulo="El conflicto de concurrencia"
Busca en `~/incidentes/delta/logs/clientes_merge.log` las líneas que contienen `CONCURRENT` (en cualquier combinación de mayúsculas y minúsculas) y la línea siguiente.
```setup
incidente-preparar delta
```
```respuesta
grep -i -A ?1 ['"]?concurrent['"]? \S*clientes_merge\.log
grep -A ?1 -i ['"]?concurrent['"]? \S*clientes_merge\.log
grep -iA ?1 ['"]?concurrent['"]? \S*clientes_merge\.log
grep -A ?1 ['"]?CONCURRENT['"]? \S*clientes_merge\.log
```
```solucion
grep -i -A1 concurrent ~/incidentes/delta/logs/clientes_merge.log
```
:::

:::ejercicio quiz dificultad=Avanzado
`clientes_merge` choca con `clientes_backfill`, que escribe en la misma tabla "sin filtro de partición". ¿Qué cambio evita el conflicto?

- [ ] Desactivar el log de transacciones de Delta
- [x] Que cada job escriba en particiones disjuntas y que la condición del MERGE incluya la columna de partición; o que los dos jobs no corran sobre la tabla al mismo tiempo
- [ ] Subir la cantidad de reintentos a 100
- [ ] Usar `mergeSchema = true`
:::

:::ejercicio sql ordenado dificultad=Intermedio titulo="Filas por versión"
`dim_clientes_versiones(version, cliente_id, segmento)` simula el time travel: tiene las filas de la versión 40 y de la 41. Devuelve `version` y `filas` de cada versión.
```sql setup
CREATE TABLE dim_clientes_versiones (version INTEGER, cliente_id INTEGER, segmento TEXT);
WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 2000)
INSERT INTO dim_clientes_versiones SELECT 40, i, CASE i % 3 WHEN 0 THEN 'Corporativo' WHEN 1 THEN 'Pyme' ELSE 'Consumo' END FROM n;
INSERT INTO dim_clientes_versiones SELECT 41, cliente_id, segmento FROM dim_clientes_versiones WHERE version = 40 AND cliente_id % 50 = 0;
```
```sql solucion
SELECT version, COUNT(*) AS filas
FROM dim_clientes_versiones
GROUP BY version
ORDER BY version;
```
```explicacion
En Delta sería `SELECT COUNT(*) FROM main.crm.dim_clientes VERSION AS OF 40` contra la versión actual. Cuando el time travel todavía funciona, es lo primero que se corre en un incidente así.
```
:::

:::ejercicio sql dificultad=Avanzado titulo="Restaurar y verificar"
Supón que los archivos de la versión 40 existen (por ejemplo, porque se reconstruyó desde bronze en `dim_clientes_versiones`). `dim_clientes(cliente_id, segmento)` es la tabla actual con los datos de la versión 41. Restáurala al contenido de la versión 40.
```sql setup
CREATE TABLE dim_clientes_versiones (version INTEGER, cliente_id INTEGER, segmento TEXT);
WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 2000)
INSERT INTO dim_clientes_versiones SELECT 40, i, CASE i % 3 WHEN 0 THEN 'Corporativo' WHEN 1 THEN 'Pyme' ELSE 'Consumo' END FROM n;
INSERT INTO dim_clientes_versiones SELECT 41, cliente_id, segmento FROM dim_clientes_versiones WHERE version = 40 AND cliente_id % 50 = 0;
CREATE TABLE dim_clientes (cliente_id INTEGER PRIMARY KEY, segmento TEXT);
INSERT INTO dim_clientes SELECT cliente_id, segmento FROM dim_clientes_versiones WHERE version = 41;
```
```sql solucion
DELETE FROM dim_clientes;
INSERT INTO dim_clientes SELECT cliente_id, segmento FROM dim_clientes_versiones WHERE version = 40;
```
```check
SELECT segmento, COUNT(*) AS filas FROM dim_clientes GROUP BY segmento ORDER BY segmento;
```
```pista
Vacía la tabla actual y vuelve a llenarla con las filas de la versión 40.
```
```explicacion
Verifica siempre después de restaurar: filas totales, filas por segmento y una muestra de claves contra la versión de referencia. En Delta, `RESTORE` hace este reemplazo en una sola operación atómica y deja una versión nueva en el historial.
```
:::

:::ejercicio sql dificultad=Avanzado titulo="Clientes perdidos en la versión 41"
¿Cuántos `cliente_id` de la versión 40 **no están** en la versión 41? Devuelve una columna `perdidos`.
```sql setup
CREATE TABLE dim_clientes_versiones (version INTEGER, cliente_id INTEGER, segmento TEXT);
WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 2000)
INSERT INTO dim_clientes_versiones SELECT 40, i, CASE i % 3 WHEN 0 THEN 'Corporativo' WHEN 1 THEN 'Pyme' ELSE 'Consumo' END FROM n;
INSERT INTO dim_clientes_versiones SELECT 41, cliente_id, segmento FROM dim_clientes_versiones WHERE version = 40 AND cliente_id % 50 = 0;
```
```sql solucion
SELECT COUNT(*) AS perdidos
FROM dim_clientes_versiones a
WHERE a.version = 40
  AND NOT EXISTS (SELECT 1 FROM dim_clientes_versiones b WHERE b.version = 41 AND b.cliente_id = a.cliente_id);
```
```pista
Un anti-join entre la misma tabla filtrada por versión: `NOT EXISTS (… WHERE b.version = 41 AND b.cliente_id = a.cliente_id)`.
```
:::

:::ejercicio sql ordenado dificultad=Experto titulo="Auditar el historial"
`historial(version, ts, usuario, operacion, filas_tabla)` resume el historial de la tabla, con la cantidad de filas después de cada versión. Encuentra las versiones en las que la tabla quedó con **menos del 10 %** de las filas de la versión anterior: `version`, `usuario`, `operacion`, `filas_antes` y `filas_despues`.
```sql setup
CREATE TABLE historial (version INTEGER PRIMARY KEY, ts TEXT, usuario TEXT, operacion TEXT, filas_tabla INTEGER);
INSERT INTO historial VALUES
(36, '2026-10-24 06:10', 'job:clientes_merge', 'MERGE', 1201344),
(37, '2026-10-25 06:09', 'job:clientes_merge', 'MERGE', 1202110),
(38, '2026-10-26 06:11', 'job:clientes_merge', 'MERGE', 1203206),
(39, '2026-10-27 06:10', 'job:clientes_merge', 'MERGE', 1204011),
(40, '2026-10-28 06:09', 'job:clientes_merge', 'MERGE', 1204880),
(41, '2026-10-28 23:58', 'job:clientes_merge', 'WRITE (Overwrite)', 1412),
(42, '2026-10-29 02:31', 'ana.perez@empresa.com', 'VACUUM START', 1412),
(43, '2026-10-29 02:31', 'ana.perez@empresa.com', 'VACUUM END', 1412),
(44, '2026-10-29 06:10', 'job:clientes_merge', 'MERGE', 1500);
```
```sql solucion
WITH h AS (
  SELECT version, usuario, operacion, filas_tabla AS filas_despues,
         LAG(filas_tabla) OVER (ORDER BY version) AS filas_antes
  FROM historial
)
SELECT version, usuario, operacion, filas_antes, filas_despues
FROM h
WHERE filas_despues < 0.1 * filas_antes
ORDER BY version;
```
```pista
`LAG(filas_tabla) OVER (ORDER BY version)` trae las filas de la versión anterior a cada fila.
```
```explicacion
Esta consulta, programada sobre `DESCRIBE HISTORY` (o sobre las métricas de la tabla) después de cada escritura, es un check de volumen a nivel de tabla: habría alertado a las 23:58, horas antes del VACUUM, cuando un simple `RESTORE` todavía resolvía todo.
```
:::

:::ejercicio quiz dificultad=Avanzado
¿Qué combinación de medidas evita que este incidente se repita?

- [ ] Prohibir los VACUUM
- [x] Solo la cuenta de servicio del pipeline tiene MODIFY sobre la tabla; los lotes correctivos usan `replaceWhere` o MERGE, nunca overwrite completo; la retención de 7 días no se desactiva; y hay un clon o backup periódico de las tablas críticas
- [ ] Agregar más reintentos a los jobs
- [ ] Activar `mergeSchema` en todas las escrituras
:::

:::errores
- **VACUUM con retención 0 "para ahorrar espacio"**: elimina el time travel y puede romper lecturas en curso.
- **Overwrite completo para corregir una parte**: un lote correctivo de 1.412 filas no debería poder reemplazar 1,2 millones. `replaceWhere` limita el reemplazo a un predicado.
- **Permisos de escritura amplios**: si cualquier persona puede escribir en producción desde un notebook, tarde o temprano alguien lo hace.
- **Intentar arreglos sobre arreglos**: cada acción durante un incidente con datos perdidos puede empeorarlo. Congela las operaciones sobre la tabla (pausa los jobs) antes de investigar.
- **No tener capa cruda**: sin bronze inmutable ni backup, un error así sí es pérdida definitiva.
:::

:::trabajo
- Unity Catalog: `MODIFY` solo para el principal de servicio del pipeline; las personas leen. Los cambios manuales pasan por un job revisado.
- Tablas críticas con `DEEP CLONE` programado a otro esquema o región, y versionado del almacenamiento (S3 versioning, soft delete de ADLS o GCS).
- *Predictive optimization* en Databricks (o un job de mantenimiento) corre `OPTIMIZE` y `VACUUM` con la retención por defecto, no a mano.
- En Iceberg, lo equivalente es `expire_snapshots` (borra snapshots viejos) y `remove_orphan_files`; los mismos riesgos con `older_than` demasiado reciente.
:::

:::entrevista
**"Alguien borró datos de una tabla Delta por error. ¿Cómo los recuperas?"** Primero, detener escrituras y cualquier VACUUM; después `DESCRIBE HISTORY` para encontrar la última versión buena; verificar con time travel (`VERSION AS OF`) y hacer `RESTORE`. Si los archivos ya no existen por un VACUUM, reconstruir desde la capa cruda o un clon. Cierra con la prevención: permisos, `replaceWhere`, retención, backups.
:::

## Resumen

| Herramienta | Para qué |
|---|---|
| `DESCRIBE HISTORY` | Encontrar quién hizo qué y cuándo |
| Time travel + `RESTORE` | Volver atrás, mientras existan los archivos |
| Retención de 7 días y su chequeo | Que el time travel siga siendo posible |
| Escrituras disjuntas | Evitar ConcurrentAppendException |
| Permisos + `replaceWhere` + clones | Que un error humano no destruya una tabla |
