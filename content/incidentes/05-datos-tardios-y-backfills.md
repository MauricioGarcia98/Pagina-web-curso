---
titulo: Datos tardíos y faltantes - sensores, marcas de agua y backfills
nivel: Avanzado
duracion: 60
resumen: Lo que pasa cuando los datos llegan tarde o no llegan - huecos en las particiones, archivos vacíos, sensores que se agotan ocupando un worker, cargas incrementales con una marca de agua mal elegida que pierden eventos para siempre, y cómo reprocesar (backfill) de forma segura con una ventana de relectura.
objetivos: Encontrar horas o días faltantes generando la serie esperada y comparándola | Medir cuántos datos llegan tarde y con cuánto retraso | Explicar por qué una marca de agua sobre la hora del evento pierde datos tardíos | Reprocesar una ventana de días sin duplicar | Configurar sensores que no bloqueen workers
prerrequisitos: incidentes-duplicados-e-idempotencia
autoevaluacion: ¿Sabes encontrar los huecos de una serie de horas con SQL? | ¿Sabes la diferencia entre la hora del evento y la hora de ingesta? | ¿Sabes por qué una marca de agua mal elegida pierde datos en silencio? | ¿Sabes qué es una ventana de relectura (lookback)? | ¿Sabes qué diferencia hay entre los modos poke y reschedule de un sensor?
---

:::escenario
Marketing pregunta por qué los clics del 28/10 entre las 14:00 y las 17:00 "se ven raros". Investigando, descubres tres cosas: la hora 14 nunca llegó, la hora 15 llegó como un archivo **vacío** y la hora 16 llegó con casi tres horas de atraso. Y cuando revisas la carga incremental de eventos, encuentras algo peor: hace semanas que pierde **todos** los eventos que llegan tarde.
:::

## La idea en una frase

Hay dos relojes: **cuándo pasó** algo (hora del evento) y **cuándo te enteraste** (hora de ingesta). Los datos tardíos aparecen cuando esos relojes se separan, y casi todos los bugs de este tema vienen de usar el reloj equivocado.

| Reloj | Ejemplo | Para qué sirve |
|---|---|---|
| **Hora del evento** (`evento_ts`) | El usuario hizo clic a las 14:05 | Reportes de negocio: "clics por hora" |
| **Hora de ingesta** (`ingerido_ts`) | El clic llegó al lago a las 19:41 | Saber qué cargaste y qué no: marcas de agua, reprocesos |

Un celular sin señal, un proveedor que manda los archivos en lote, un reintento: todos producen eventos con hora del evento vieja y hora de ingesta nueva.

## La marca de agua que pierde datos

Una **marca de agua** (watermark) es el punto hasta donde ya cargaste. Una carga incremental lee solo lo que está "después" de la marca. El bug clásico:

```sql norun
INSERT INTO dw.eventos
SELECT * FROM staging.eventos
WHERE evento_ts > (SELECT max(evento_ts) FROM dw.eventos);
```

```diagrama
titulo: Un evento tardío queda detrás de la marca de agua
nodo a: 14:05 clic | icono=movil | col=0 | fila=0 | sub=sin señal: llega 19:41
nodo b: 15:00 carga | icono=engranaje | col=1 | fila=0 | sub=max(evento_ts) = 14:58
nodo c: 20:00 carga | icono=engranaje | col=2 | fila=0 | sub=lee evento_ts > 19:57
nodo d: Evento perdido | icono=x | col=3 | fila=0 | color=rojo | sub=14:05 < 19:57: nunca se lee
flecha a -> b: todavía no llegó | estilo=punteada | paso=1 | explica=A las 15:00 el clic de las 14:05 todavía no está en staging.
flecha b -> c: paso=2 | explica=Cada carga mueve la marca de agua al evento más nuevo cargado.
flecha c -> d: paso=3 | explica=El clic llega a las 19:41 con evento_ts 14:05. La carga de las 20:00 solo lee eventos posteriores a 19:57, así que el clic queda afuera. Para siempre, y sin ningún error.
```

Las correcciones, de menor a mayor robustez:

1. **Marca de agua sobre la hora de ingesta** (`ingerido_ts`), que solo crece, en lugar de la del evento.
2. **Ventana de relectura** (lookback): releer siempre los últimos N días y hacer un **MERGE** o un `NOT EXISTS`, para que releer no duplique. N se elige midiendo cuánto tardan los datos tardíos (lo harás abajo).
3. **Avanzar la marca después del COMMIT**: si la carga falla, la marca no se mueve y la próxima ejecución repite el trabajo, lo cual es seguro porque la carga es idempotente.
4. Pasado cierto plazo (por ejemplo, 7 días), las particiones se **congelan**: lo que llegue después se registra aparte y se decide caso por caso.

## Sensores: esperar sin bloquear

Un **sensor** es una tarea de Airflow que espera a que algo exista (un archivo, una partición, otro DAG). Los parámetros que importan:

| Parámetro | Qué controla |
|---|---|
| `mode="poke"` | El sensor ocupa un **slot del worker** todo el tiempo que espera |
| `mode="reschedule"` | Libera el slot entre chequeos; vuelve en `poke_interval` |
| `deferrable=True` | La espera la hace el **triggerer** de forma asíncrona; no ocupa workers |
| `timeout` | Cuánto puede esperar el sensor en total. Al vencerse lanza `AirflowSensorTimeout` y **no** reintenta |
| `execution_timeout` | Cuánto puede durar **cada intento** de cualquier tarea. Al vencerse lanza `AirflowTaskTimeout` y **sí** reintenta |
| `soft_fail=True` | Si se vence, la tarea queda `skipped` en vez de `failed` |

:::cuidado Cien sensores en modo poke
Con 24 DAGs horarios y sensores en modo `poke` esperando 2 horas, puedes tener decenas de slots ocupados solo esperando. Las tareas de verdad quedan encoladas ("Pool default_pool has 0 open slots") y el atraso se contagia a pipelines que no tenían nada que ver.
:::

## Backfill sin miedo

Un **backfill** es volver a correr un pipeline para fechas pasadas: porque llegaron datos tardíos, porque se corrigió un bug o porque hay una tabla nueva. Es seguro solo si:

- Cada ejecución escribe **solo su partición** (usa la fecha lógica `{{ ds }}`, nunca `now()`).
- La escritura **reemplaza** (delete+insert, overwrite, MERGE). Ver la lección anterior.
- Limitas el **paralelismo** (`max_active_runs`) para no saturar el warehouse.
- Avisas a los consumidores: los números del pasado van a cambiar.

## Práctica

:::ejercicio cli dificultad=Básico titulo="Preparar el incidente"
Prepara los archivos del incidente `tardios`.
```respuesta
incidente-preparar tardios
```
:::

:::ejercicio cli dificultad=Básico titulo="¿Cuántos archivos llegaron?"
`~/incidentes/tardios/listado_clicks.txt` lista los archivos de clics del 28/10 (una línea por archivo). Debería haber 24, uno por hora. Cuenta las líneas.
```setup
incidente-preparar tardios
```
```respuesta
wc -l \S*listado_clicks\.txt
cat \S*listado_clicks\.txt \| wc -l
grep -c ['"]?hora=['"]? \S*listado_clicks\.txt
```
```solucion
wc -l ~/incidentes/tardios/listado_clicks.txt
```
```pista
`wc -l archivo` cuenta líneas.
```
```explicacion
23: falta un archivo. Con `grep hora=14 ~/incidentes/tardios/listado_clicks.txt` confirmas que es la hora 14 (no devuelve nada).
```
:::

:::ejercicio cli dificultad=Intermedio titulo="El archivo vacío"
Cada línea del listado tiene: fecha y hora de llegada (columnas 1 y 2), tamaño en bytes (columna 3) y ruta (columna 4). Muestra con `awk` las líneas cuyo tamaño es **0**.
```setup
incidente-preparar tardios
```
```respuesta
awk ['"]?\$3 ?== ?0 ?(\{ ?print( \$0)?;? ?\})?['"]? \S*listado_clicks\.txt
awk ['"]?\$3 ?< ?1 ?(\{ ?print( \$0)?;? ?\})?['"]? \S*listado_clicks\.txt
```
```solucion
awk '$3 == 0' ~/incidentes/tardios/listado_clicks.txt
```
```pista
Sin `-F`, awk separa por espacios. Un patrón sin acción imprime la línea: `awk '$3 == 0' archivo`.
```
```explicacion
La hora 15 llegó como un archivo de 0 bytes. Un sensor que solo verifica "el archivo existe" lo da por bueno. Por eso los proveedores serios escriben un marcador `_SUCCESS` (o un manifiesto con la cantidad de filas) **después** de terminar de escribir.
```
:::

:::ejercicio cli dificultad=Básico titulo="El final del log del sensor"
Muestra las **últimas 3 líneas** del log del sensor `~/incidentes/tardios/logs/esperar_hora_14.log`.
```setup
incidente-preparar tardios
```
```respuesta
tail -n ?3 \S*esperar_hora_14\.log
tail -3 \S*esperar_hora_14\.log
```
```solucion
tail -n 3 ~/incidentes/tardios/logs/esperar_hora_14.log
```
```pista
`tail -n 3 archivo`.
```
:::

:::ejercicio quiz dificultad=Avanzado
Según el log, el sensor esperó 2 horas en modo `poke` y terminó con `AirflowSensorTimeout`. ¿Qué cambio de configuración es el correcto?

- [ ] Subir `retries` a 10 para que el sensor reintente
- [ ] Cambiar `timeout` por `execution_timeout`
- [x] Usar `mode="reschedule"` o `deferrable=True` para no ocupar un worker mientras espera, y un `timeout` acorde al SLA con alerta al vencerse
- [ ] Bajar `poke_interval` a 1 segundo para detectar el archivo antes
:::

:::ejercicio sql ordenado dificultad=Intermedio titulo="¿Qué horas faltan?"
`clicks_por_hora(fecha, hora, archivos, filas)` tiene una fila por hora cargada del 28/10. Genera las 24 horas esperadas (0 a 23) y devuelve las que **faltan** o tienen **0 filas**, con una columna `estado` que diga `falta` o `vacía`. Ordena por hora.
```sql setup
CREATE TABLE clicks_por_hora (fecha TEXT, hora INTEGER, archivos INTEGER, filas INTEGER);
WITH RECURSIVE h(x) AS (SELECT 0 UNION ALL SELECT x + 1 FROM h WHERE x < 23)
INSERT INTO clicks_por_hora
SELECT '2026-10-28', x, 1, CASE WHEN x = 15 THEN 0 WHEN x < 7 THEN 9000 + x * 37 ELSE 31000 + x * 53 END
FROM h WHERE x <> 14;
```
```sql solucion
WITH RECURSIVE h(hora) AS (SELECT 0 UNION ALL SELECT hora + 1 FROM h WHERE hora < 23)
SELECT h.hora, CASE WHEN c.hora IS NULL THEN 'falta' ELSE 'vacía' END AS estado
FROM h
LEFT JOIN clicks_por_hora c ON c.hora = h.hora AND c.fecha = '2026-10-28'
WHERE c.hora IS NULL OR c.filas = 0
ORDER BY h.hora;
```
```pista
Una CTE recursiva genera la serie: `WITH RECURSIVE h(hora) AS (SELECT 0 UNION ALL SELECT hora + 1 FROM h WHERE hora < 23)`.
```
```pista
Después `LEFT JOIN` con la tabla: si no hay fila, la hora falta; si hay fila con `filas = 0`, está vacía.
```
```explicacion
No puedes encontrar con un `SELECT … FROM clicks_por_hora` algo que no está en la tabla. Para detectar huecos siempre hay que **generar lo esperado** y comparar. En BigQuery y Postgres se usa `GENERATE_SERIES` o `GENERATE_TIMESTAMP_ARRAY`.
```
:::

:::ejercicio sql ordenado dificultad=Intermedio titulo="¿Qué horas llegaron tarde?"
`llegadas(hora, llega_ts)` dice a qué hora llegó el archivo de cada hora del 28/10. El acuerdo es que cada archivo llega como máximo **60 minutos** después del fin de su hora (la hora 9 termina a las 10:00). Devuelve las horas con más de 60 minutos de atraso y el atraso en minutos (entero), ordenadas por hora.
```sql setup
CREATE TABLE llegadas (hora INTEGER, llega_ts TEXT);
WITH RECURSIVE h(x) AS (SELECT 0 UNION ALL SELECT x + 1 FROM h WHERE x < 23)
INSERT INTO llegadas
SELECT x, CASE WHEN x = 16 THEN '2026-10-28 19:41' WHEN x = 20 THEN '2026-10-28 22:19'
               ELSE datetime('2026-10-28 00:00', '+' || ((x + 1) * 60 + 3 + x % 9) || ' minutes') END
FROM h WHERE x <> 14;
```
```sql solucion
SELECT hora,
       CAST(ROUND((julianday(llega_ts) - julianday(datetime('2026-10-28 00:00', '+' || (hora + 1) || ' hours'))) * 1440) AS INTEGER) AS atraso_min
FROM llegadas
WHERE (julianday(llega_ts) - julianday(datetime('2026-10-28 00:00', '+' || (hora + 1) || ' hours'))) * 1440 > 60
ORDER BY hora;
```
```pista
El fin de la hora `h` es `datetime('2026-10-28 00:00', '+' || (h + 1) || ' hours')`.
```
```pista
La diferencia en minutos es `(julianday(a) - julianday(b)) * 1440`.
```
:::

:::ejercicio sql ordenado dificultad=Avanzado titulo="¿Cuánto tardan los tardíos?"
`stg_eventos(evento_id, evento_ts, ingerido_ts)` tiene 3 días de eventos. Clasifica el retraso (ingerido − evento) en tres rangos: `< 15 min`, `15-60 min` y `> 60 min`. Devuelve `rango`, `eventos` y `pct` (1 decimal), en ese orden de rangos.
```sql setup
CREATE TABLE stg_eventos (evento_id INTEGER PRIMARY KEY, evento_ts TEXT, ingerido_ts TEXT);
WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 719)
INSERT INTO stg_eventos
SELECT i, datetime('2026-10-26 00:00', '+' || (i * 6) || ' minutes'),
       datetime('2026-10-26 00:00', '+' || (i * 6 + CASE WHEN i % 10 = 0 THEN 300 WHEN i % 4 = 0 THEN 45 ELSE 3 END) || ' minutes')
FROM n;
```
```sql solucion
WITH r AS (
  SELECT CASE WHEN (julianday(ingerido_ts) - julianday(evento_ts)) * 1440 < 15 THEN '< 15 min'
              WHEN (julianday(ingerido_ts) - julianday(evento_ts)) * 1440 <= 60 THEN '15-60 min'
              ELSE '> 60 min' END AS rango,
         CASE WHEN (julianday(ingerido_ts) - julianday(evento_ts)) * 1440 < 15 THEN 1
              WHEN (julianday(ingerido_ts) - julianday(evento_ts)) * 1440 <= 60 THEN 2 ELSE 3 END AS orden
  FROM stg_eventos
)
SELECT rango, COUNT(*) AS eventos, ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM stg_eventos), 1) AS pct
FROM r
GROUP BY rango, orden
ORDER BY orden;
```
```pista
Calcula el retraso en minutos con `(julianday(ingerido_ts) - julianday(evento_ts)) * 1440` y clasifícalo con `CASE`.
```
```pista
Para ordenar los rangos en el orden pedido (y no alfabéticamente), agrega una columna numérica de orden en el mismo `CASE`.
```
```explicacion
Un 10 % de los eventos llega con más de una hora de atraso (en estos datos, 5 horas). Esta distribución es la que decide el tamaño de la ventana de relectura: si el 99,9 % llega antes de 6 horas, releer las últimas 24 horas sobra.
```
:::

:::ejercicio sql ordenado dificultad=Avanzado titulo="¿Cuántos eventos perdió la marca de agua?"
`dw_eventos` se cargó con la marca de agua sobre `evento_ts`. Cuenta por día (`date(evento_ts)`) cuántos eventos de `stg_eventos` **no están** en `dw_eventos`. Columnas `dia` y `perdidos`, ordenadas por día.
```sql setup
CREATE TABLE stg_eventos (evento_id INTEGER PRIMARY KEY, evento_ts TEXT, ingerido_ts TEXT);
WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 719)
INSERT INTO stg_eventos
SELECT i, datetime('2026-10-26 00:00', '+' || (i * 6) || ' minutes'),
       datetime('2026-10-26 00:00', '+' || (i * 6 + CASE WHEN i % 10 = 0 THEN 300 WHEN i % 4 = 0 THEN 45 ELSE 3 END) || ' minutes')
FROM n;
CREATE TABLE dw_eventos AS SELECT * FROM stg_eventos WHERE (julianday(ingerido_ts) - julianday(evento_ts)) * 24 < 1;
```
```sql solucion
SELECT date(s.evento_ts) AS dia, COUNT(*) AS perdidos
FROM stg_eventos s
WHERE NOT EXISTS (SELECT 1 FROM dw_eventos d WHERE d.evento_id = s.evento_id)
GROUP BY date(s.evento_ts)
ORDER BY dia;
```
```pista
Un anti-join: `WHERE NOT EXISTS (SELECT 1 FROM dw_eventos d WHERE d.evento_id = s.evento_id)`.
```
:::

:::ejercicio sql dificultad=Avanzado titulo="Reprocesar la ventana sin duplicar"
Recupera los eventos perdidos: inserta en `dw_eventos` los eventos de `stg_eventos` con `evento_ts >= '2026-10-26'` que **todavía no están** en `dw_eventos`. La sentencia debe poder correrse varias veces sin duplicar.
```sql setup
CREATE TABLE stg_eventos (evento_id INTEGER PRIMARY KEY, evento_ts TEXT, ingerido_ts TEXT);
WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 719)
INSERT INTO stg_eventos
SELECT i, datetime('2026-10-26 00:00', '+' || (i * 6) || ' minutes'),
       datetime('2026-10-26 00:00', '+' || (i * 6 + CASE WHEN i % 10 = 0 THEN 300 WHEN i % 4 = 0 THEN 45 ELSE 3 END) || ' minutes')
FROM n;
CREATE TABLE dw_eventos AS SELECT * FROM stg_eventos WHERE (julianday(ingerido_ts) - julianday(evento_ts)) * 24 < 1;
```
```sql solucion
INSERT INTO dw_eventos
SELECT s.* FROM stg_eventos s
WHERE s.evento_ts >= '2026-10-26'
  AND NOT EXISTS (SELECT 1 FROM dw_eventos d WHERE d.evento_id = s.evento_id);
```
```check
SELECT date(evento_ts) AS dia, COUNT(*) AS eventos, COUNT(DISTINCT evento_id) AS distintos FROM dw_eventos GROUP BY 1 ORDER BY 1;
```
```pista
`INSERT INTO dw_eventos SELECT s.* FROM stg_eventos s WHERE … AND NOT EXISTS (…)`.
```
```explicacion
Esta es la forma general de la ventana de relectura: cada ejecución relee los últimos N días y solo agrega lo que falta (o hace MERGE si las filas pueden cambiar). Si la corres dos veces, la segunda no inserta nada.
```
:::

:::ejercicio quiz dificultad=Avanzado
Corriges `incremental.sql` y ahora quieres guardar la marca de agua en una tabla de control. ¿En qué momento la actualizas?

- [ ] Antes de empezar la carga, para que otra ejecución no lea lo mismo
- [x] Después de que la carga hizo COMMIT, en la misma transacción si es posible; si la carga falla, la marca no se mueve
- [ ] Una vez por semana, a mano
- [ ] Nunca: se calcula siempre con max(evento_ts)
:::

:::ejercicio quiz dificultad=Intermedio
Hay que reprocesar 90 días de una tabla por un bug ya corregido. ¿Qué es lo más importante para que el backfill sea seguro?

- [ ] Correr los 90 días en paralelo para terminar rápido
- [ ] Usar `now()` en el filtro de cada ejecución
- [x] Que cada ejecución use su fecha lógica (`ds`), reemplace solo su partición y que el paralelismo esté limitado
- [ ] Borrar la tabla completa antes de empezar
:::

:::errores
- **Marca de agua sobre la hora del evento**: pierde los tardíos en silencio. Usa la hora de ingesta o una ventana de relectura.
- **Avanzar la marca antes de cargar**: si la carga falla, ese tramo no se vuelve a leer nunca.
- **Sensores en modo poke con timeouts largos**: bloquean workers y atrasan pipelines que no tienen nada que ver.
- **Confiar en que el archivo existe**: un archivo de 0 bytes o a medio escribir también "existe". Espera un `_SUCCESS` o un manifiesto.
- **Backfill con `now()`**: todas las ejecuciones escriben la partición de hoy.
:::

:::trabajo
- Spark Structured Streaming y Flink manejan los tardíos con `withWatermark("evento_ts", "2 hours")`: los eventos más tardíos que eso se descartan de las agregaciones por ventana. Hay que decidir ese umbral con datos.
- En Airflow, el comando `airflow dags backfill` (o "Clear" en la interfaz sobre un rango de fechas) vuelve a correr ejecuciones pasadas; `catchup=True` crea automáticamente las ejecuciones pendientes al activar un DAG.
- dbt incremental con `lookback` (o `is_incremental()` con `where updated_at > (select max(updated_at) from {{ this }}) - interval 3 day`) y `unique_key`.
- Se publica la **completitud** de cada partición (completa, parcial, reprocesada) para que el negocio sepa qué números pueden cambiar.
:::

:::entrevista
**"¿Cómo manejas los datos que llegan tarde?"** Distingue hora del evento y de ingesta; explica la ventana de relectura con MERGE o anti-join, la marca de agua que avanza después del commit, cómo mediste la distribución de atrasos para elegir la ventana y qué pasa con lo que llega fuera de ella. En streaming, menciona `withWatermark` y el costo de esperar más (más estado en memoria).
:::

## Resumen

| Problema | Detección | Solución |
|---|---|---|
| Partición faltante o vacía | Serie esperada + LEFT JOIN | Alerta de frescura; esperar `_SUCCESS`; reprocesar |
| Eventos tardíos perdidos | Anti-join staging vs destino | Marca de agua sobre ingesta + ventana de relectura |
| Sensores que bloquean | Pools sin slots, colas largas | `reschedule` o `deferrable`, `timeout` acorde al SLA |
| Backfill que duplica | Check de unicidad | Fecha lógica + reemplazo por partición |
