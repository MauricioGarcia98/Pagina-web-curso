---
titulo: Streaming en problemas - lag, mensajes venenosos y rebalanceos
nivel: Experto
duracion: 60
resumen: Los incidentes de un consumidor de Kafka - lag que crece, una partición atascada por un mensaje que no se puede leer (poison pill), particiones sin consumidor, rebalanceos en cadena por superar max.poll.interval.ms, duplicados después de un rebalanceo y eventos fuera de orden. Cómo leer kafka-consumer-groups, usar una dead letter queue y calcular cuánto falta para ponerse al día.
objetivos: Leer la salida de kafka-consumer-groups y ubicar las particiones con problemas | Reconocer un mensaje venenoso por el log y saber cómo destrabar la partición | Explicar por qué un procesamiento lento provoca rebalanceos en cadena | Deduplicar los eventos repetidos por un rebalanceo | Calcular el tiempo para recuperar el lag con las tasas de producción y consumo
prerrequisitos: incidentes-duplicados-e-idempotencia
autoevaluacion: ¿Sabes qué es el lag de un grupo de consumidores? | ¿Sabes qué significa CONSUMER-ID "-" en una partición? | ¿Sabes qué es una dead letter queue? | ¿Sabes por qué max.poll.interval.ms causa rebalanceos? | ¿Sabes por qué Kafka entrega "al menos una vez" a una base de datos?
---

:::escenario
A las 07:11 suena la alerta `lag_kafka_clicks`: 2,1 millones de mensajes de atraso, creciendo 40 mil por minuto. El tablero de pedidos en tiempo real lleva 3 horas congelado. Los consumidores están "arriba" según el monitoreo de infraestructura. Algo los tiene ocupados sin avanzar.
:::

## Lo mínimo de Kafka para depurarlo

- Un **topic** se divide en **particiones**; cada mensaje tiene un **offset** (su posición) dentro de su partición.
- Un **grupo de consumidores** reparte las particiones entre sus miembros: cada partición la lee **un solo** consumidor del grupo.
- Cada consumidor **confirma** (commit) el offset hasta donde procesó. Si se reinicia, sigue desde el último offset confirmado.
- **Lag** = último offset de la partición (`LOG-END-OFFSET`) − offset confirmado (`CURRENT-OFFSET`): cuántos mensajes faltan procesar.

```text
GROUP         TOPIC    PARTITION  CURRENT-OFFSET  LOG-END-OFFSET  LAG      CONSUMER-ID                HOST        CLIENT-ID
pedidos-sink  pedidos  7          3511588         4800000         1288412  consumer-pedidos-3-d91f    /10.0.4.14  sink
pedidos-sink  pedidos  10         4402911         4805000         402089   -                          -           -
```

La partición 7 tiene consumidor y **no avanza**. La 10 **no tiene** consumidor (`-`). Son dos problemas distintos.

## Los incidentes típicos

| Síntoma | Causa | Qué hacer |
|---|---|---|
| Una partición con lag que no baja y el mismo offset en el log una y otra vez | **Mensaje venenoso** (poison pill): un registro que el consumidor no puede deserializar o procesar; como no confirma el offset, lo reintenta para siempre | Mandarlo a una **DLQ** (dead letter queue: un topic de mensajes fallidos) después de N intentos y confirmar el offset |
| Particiones sin consumidor (`CONSUMER-ID -`) | Consumidores caídos, o menos consumidores vivos que particiones durante un rebalanceo | Revisar por qué murieron; escalar consumidores |
| "Attempt to heartbeat failed since group is rebalancing" y "poll timeout has expired… max.poll.interval.ms" | Procesar un lote tarda más que `max.poll.interval.ms`: el consumidor es expulsado del grupo, hay un rebalanceo, reprocesa el lote… y se repite (tormenta de rebalanceos) | Lotes más chicos (`max.poll.records`), procesar más rápido (en lote, asíncrono), o subir el intervalo |
| Lag que crece parejo en todas las particiones | Se produce más rápido de lo que se consume | Más consumidores (hasta la cantidad de particiones), procesamiento más eficiente |
| Duplicados en el destino | Un rebalanceo o reinicio después de escribir pero antes de confirmar el offset | Escritura idempotente en el destino (MERGE por id de evento) |

:::cuidado Exactamente una vez… solo dentro de Kafka
Kafka ofrece semántica *exactly-once* con transacciones **entre topics de Kafka** (Kafka Streams, productores transaccionales). En cuanto escribes en una base de datos externa, la entrega es **al menos una vez**: si el consumidor escribe y muere antes de confirmar el offset, al reiniciar vuelve a escribir. La garantía final la da un destino **idempotente**.
:::

## La DLQ bien hecha

```diagrama
titulo: Un mensaje venenoso con y sin dead letter queue
nodo t: Topic pedidos | icono=kafka | col=0 | fila=0
nodo c: Consumidor | icono=engranaje | col=1 | fila=0
nodo db: Base de datos | icono=postgres | col=2 | fila=0 | forma=cilindro
nodo d: Topic pedidos.dlq | icono=cola | col=1 | fila=1 | color=naranja | sub=payload + error + offset
nodo r: Reproceso controlado | icono=lupa | col=2 | fila=1 | sub=después de corregir
flecha t -> c: paso=1 | explica=El consumidor lee un lote de mensajes.
flecha c -> db: los buenos | paso=2 | explica=Los mensajes que se procesan bien se escriben en el destino.
flecha c -> d: tras N fallos | paso=3 | explica=Un mensaje que falla N veces se publica en la DLQ con el error, el topic, la partición y el offset original, y se confirma el offset: la partición sigue avanzando.
flecha d -> r: estilo=punteada | paso=4 | explica=Cuando se corrige la causa (un productor que mandaba otro formato, un esquema nuevo), los mensajes de la DLQ se reprocesan de forma controlada.
```

Una DLQ sin alerta ni dueño es un basurero: hay que medir cuántos mensajes llegan, por qué tipo de error, y tener un proceso para reprocesarlos.

## Práctica

:::ejercicio cli dificultad=Básico titulo="Preparar el incidente"
Prepara los archivos del incidente `kafka`.
```respuesta
incidente-preparar kafka
```
:::

:::ejercicio cli dificultad=Intermedio titulo="Las particiones con lag"
`~/incidentes/kafka/consumer_group.txt` es la salida de `kafka-consumer-groups --describe`. Con `awk`, muestra la partición (columna 3), el lag (columna 6) y el consumidor (columna 7) de las filas con lag **mayor a 10000**, saltando el encabezado.
```setup
incidente-preparar kafka
```
```respuesta
awk ['"]?NR ?> ?1 ?&& ?\$6 ?> ?10000 ?\{ ?print \$3, ?\$6, ?\$7;? ?\}['"]? \S*consumer_group\.txt
awk ['"]?\$6 ?> ?10000 ?&& ?NR ?> ?1 ?\{ ?print \$3, ?\$6, ?\$7;? ?\}['"]? \S*consumer_group\.txt
```
```solucion
awk 'NR>1 && $6 > 10000 {print $3, $6, $7}' ~/incidentes/kafka/consumer_group.txt
```
```pista
Sin `-F`, awk separa por espacios (cualquier cantidad). La condición es `NR>1 && $6 > 10000`.
```
:::

:::ejercicio quiz dificultad=Avanzado
Según la salida, ¿qué pasa en el grupo?

- [ ] Todas las particiones tienen el mismo problema: falta capacidad
- [x] La partición 7 tiene consumidor pero está trabada (lag de 1,28 M), y las particiones 10 y 11 no tienen ningún consumidor asignado
- [ ] El topic tiene pocas particiones
- [ ] Kafka está caído
:::

:::ejercicio cli dificultad=Avanzado titulo="El offset que se repite"
En `~/incidentes/kafka/logs/consumer.log`, extrae todas las apariciones de `offset <número>` (con `grep -o`) y cuéntalas con `sort | uniq -c`.
```setup
incidente-preparar kafka
```
```respuesta
grep -o ['"]offset \[0-9\]\*['"] \S*consumer\.log \| sort \| uniq -c.*
grep -oE ['"]offset \[0-9\]\+['"] \S*consumer\.log \| sort \| uniq -c.*
grep -Eo ['"]offset \[0-9\]\+['"] \S*consumer\.log \| sort \| uniq -c.*
grep -o ['"]offset \[0-9\]\+['"] \S*consumer\.log \| sort \| uniq -c.*
```
```solucion
grep -o "offset [0-9]*" ~/incidentes/kafka/logs/consumer.log | sort | uniq -c
```
```pista
`grep -o` imprime solo la parte que coincide con el patrón, no la línea entera.
```
```explicacion
El mismo offset (3511588 de la partición 7) aparece 58 veces: el consumidor falla al deserializarlo, no confirma, lo vuelve a leer y falla otra vez. Es un mensaje venenoso, y todo lo que viene después en esa partición está esperando.
```
:::

:::ejercicio quiz dificultad=Experto
El error es `SerializationException: Unknown magic byte!`. Los consumidores leen Avro con Schema Registry. ¿Qué indica y cómo destrabas la partición ahora?

- [ ] El broker está corrupto: hay que borrar el topic
- [x] El mensaje no tiene el formato de Schema Registry (por ejemplo, un productor nuevo mandó JSON plano). Se destraba mandando ese mensaje a la DLQ (o, como último recurso y documentado, moviendo el offset del grupo un mensaje adelante) y se corrige el productor
- [ ] Hay que subir `max.poll.records`
- [ ] Hay que reiniciar los consumidores hasta que lo lean
:::

:::ejercicio cli dificultad=Básico titulo="Los rebalanceos"
Cuenta las líneas del log del consumidor que mencionan `max.poll.interval.ms`.
```setup
incidente-preparar kafka
```
```respuesta
grep -c ['"]?max\\?\.poll\\?\.interval\\?\.ms['"]? \S*consumer\.log
grep ['"]?max\\?\.poll\\?\.interval\\?\.ms['"]? \S*consumer\.log \| wc -l
grep -c ['"]?max.poll['"]? \S*consumer\.log
```
```solucion
grep -c "max.poll.interval.ms" ~/incidentes/kafka/logs/consumer.log
```
:::

:::ejercicio quiz dificultad=Experto
Mira `~/incidentes/kafka/consumer.properties`: `max.poll.records=500`, `max.poll.interval.ms=300000` y cada registro llama a una API que tarda unos 700 ms. ¿Por qué hay rebalanceos en cadena?

- [ ] Porque `session.timeout.ms` es muy alto
- [x] Porque un lote de 500 registros tarda unos 350 s, más que los 300 s permitidos entre dos `poll()`: el consumidor es expulsado, hay un rebalanceo, otro consumidor recibe la partición y le pasa lo mismo
- [ ] Porque `enable.auto.commit=false`
- [ ] Porque Kafka no permite más de 4 consumidores
:::

:::ejercicio cli dificultad=Intermedio titulo="El lag total"
Con `awk`, suma el lag (columna 6) de todas las particiones, saltando el encabezado.
```setup
incidente-preparar kafka
```
```respuesta
awk ['"]?NR ?> ?1 ?\{ ?(s|t|total|lag|x) ?\+= ?\$6;? ?\} ?END ?\{ ?print (s|t|total|lag|x);? ?\}['"]? \S*consumer_group\.txt
```
```solucion
awk 'NR>1 {s+=$6} END {print s}' ~/incidentes/kafka/consumer_group.txt
```
:::

:::ejercicio sql ordenado dificultad=Intermedio titulo="Lag por partición"
`offsets(particion, consumidor, offset_confirmado, offset_final)` es una foto del grupo. Devuelve `particion`, `lag` y `consumidor` de las particiones con lag mayor a 100.000, de mayor a menor lag.
```sql setup
CREATE TABLE offsets (particion INTEGER, consumidor TEXT, offset_confirmado INTEGER, offset_final INTEGER);
WITH RECURSIVE p(i) AS (SELECT 0 UNION ALL SELECT i + 1 FROM p WHERE i < 11)
INSERT INTO offsets
SELECT i, CASE WHEN i IN (10, 11) THEN NULL ELSE 'consumer-pedidos-' || (i % 4) END,
       4800000 + i * 2131 - CASE WHEN i = 7 THEN 1288412 WHEN i = 10 THEN 402089 WHEN i = 11 THEN 403370 ELSE (i * 37) % 120 END,
       4800000 + i * 2131
FROM p;
```
```sql solucion
SELECT particion, offset_final - offset_confirmado AS lag, consumidor
FROM offsets
WHERE offset_final - offset_confirmado > 100000
ORDER BY lag DESC;
```
:::

:::ejercicio sql dificultad=Avanzado titulo="Duplicados después del rebalanceo"
`sink_pedidos(evento_id, pedido_id, estado, particion, offset_kafka)` recibió eventos repetidos durante la tormenta de rebalanceos. Devuelve `filas`, `eventos_unicos` y `duplicados` (filas − únicos).
```sql setup
CREATE TABLE sink_pedidos (evento_id TEXT, pedido_id INTEGER, estado TEXT, particion INTEGER, offset_kafka INTEGER);
WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 800)
INSERT INTO sink_pedidos SELECT 'ev-' || i, 70000 + i / 3, CASE i % 3 WHEN 0 THEN 'CREADO' WHEN 1 THEN 'PAGADO' ELSE 'ENVIADO' END, i % 12, 3500000 + i FROM n;
INSERT INTO sink_pedidos SELECT * FROM sink_pedidos WHERE offset_kafka BETWEEN 3500300 AND 3500420;
```
```sql solucion
SELECT COUNT(*) AS filas, COUNT(DISTINCT evento_id) AS eventos_unicos,
       COUNT(*) - COUNT(DISTINCT evento_id) AS duplicados
FROM sink_pedidos;
```
```explicacion
121 eventos repetidos: el rango de offsets que se procesó dos veces entre que el consumidor escribió y que confirmó el offset. Con un `MERGE` por `evento_id` (o una clave única + `ON CONFLICT DO NOTHING`) el destino sería idempotente y el rebalanceo no dejaría rastro.
```
:::

:::ejercicio sql ordenado dificultad=Intermedio titulo="¿Qué hay en la DLQ?"
`dlq(mensaje_id, error_tipo, particion, offset_kafka, recibido_ts)` tiene los mensajes que fallaron. Devuelve `error_tipo`, `mensajes` y `primera_vez` (el `recibido_ts` mínimo), de más a menos mensajes.
```sql setup
CREATE TABLE dlq (mensaje_id INTEGER PRIMARY KEY, error_tipo TEXT, particion INTEGER, offset_kafka INTEGER, recibido_ts TEXT);
WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 140)
INSERT INTO dlq SELECT i,
  CASE WHEN i % 7 = 0 THEN 'TimeoutException (API enriquecimiento)' WHEN i % 5 = 0 THEN 'ConstraintViolation (pedido_id nulo)' ELSE 'SerializationException (Unknown magic byte)' END,
  7, 3511588 + i * 3, datetime('2026-10-29 03:12', '+' || i || ' minutes')
FROM n;
```
```sql solucion
SELECT error_tipo, COUNT(*) AS mensajes, MIN(recibido_ts) AS primera_vez
FROM dlq
GROUP BY error_tipo
ORDER BY mensajes DESC;
```
```explicacion
Cada tipo de error tiene una solución distinta: los de serialización se corrigen en el productor y se reprocesan; los timeouts se pueden reintentar tal cual; los nulos necesitan una decisión del negocio. Por eso la DLQ guarda el error junto con el mensaje.
```
:::

:::ejercicio sql ordenado dificultad=Experto titulo="Eventos fuera de orden"
`eventos_estado(pedido_id, estado, evento_ts, llegada_orden)` tiene los cambios de estado en el **orden en que llegaron** (`llegada_orden`). El consumidor guardaba como estado actual el **último en llegar**, pero lo correcto es el de `evento_ts` más reciente. Devuelve los pedidos donde esas dos respuestas difieren: `pedido_id`, `estado_guardado` y `estado_correcto`, ordenados por pedido.
```sql setup
CREATE TABLE eventos_estado (pedido_id INTEGER, estado TEXT, evento_ts TEXT, llegada_orden INTEGER);
INSERT INTO eventos_estado VALUES
(1, 'CREADO', '2026-10-29 03:00:00', 1), (1, 'PAGADO', '2026-10-29 03:02:00', 2), (1, 'ENVIADO', '2026-10-29 05:10:00', 3),
(2, 'CREADO', '2026-10-29 03:05:00', 4), (2, 'CANCELADO', '2026-10-29 03:20:00', 5), (2, 'PAGADO', '2026-10-29 03:06:00', 6),
(3, 'CREADO', '2026-10-29 04:00:00', 7), (3, 'ENVIADO', '2026-10-29 06:00:00', 8), (3, 'PAGADO', '2026-10-29 04:01:00', 9),
(4, 'CREADO', '2026-10-29 04:30:00', 10);
```
```sql solucion
WITH g AS (
  SELECT pedido_id, estado FROM (
    SELECT pedido_id, estado, ROW_NUMBER() OVER (PARTITION BY pedido_id ORDER BY llegada_orden DESC) AS rn FROM eventos_estado
  ) WHERE rn = 1
),
c AS (
  SELECT pedido_id, estado FROM (
    SELECT pedido_id, estado, ROW_NUMBER() OVER (PARTITION BY pedido_id ORDER BY evento_ts DESC) AS rn FROM eventos_estado
  ) WHERE rn = 1
)
SELECT g.pedido_id, g.estado AS estado_guardado, c.estado AS estado_correcto
FROM g JOIN c ON c.pedido_id = g.pedido_id
WHERE g.estado <> c.estado
ORDER BY g.pedido_id;
```
```pista
Dos `ROW_NUMBER`: uno ordenado por `llegada_orden DESC` (lo que guardó el consumidor) y otro por `evento_ts DESC` (lo correcto). Únelos por pedido y compara.
```
```explicacion
Kafka garantiza el orden **dentro de una partición**, no entre particiones ni entre reintentos. Si los eventos de un pedido pueden llegar desordenados (por la clave de partición, por reintentos del productor o porque vienen de varios sistemas), el destino tiene que aplicar el cambio solo si es más nuevo: `MERGE … WHEN MATCHED AND s.evento_ts > t.evento_ts THEN UPDATE`.
```
:::

:::ejercicio sql ordenado dificultad=Avanzado titulo="¿Cuándo nos ponemos al día?"
`tasas(particion, lag, consumo_msg_s, produccion_msg_s)` tiene, para cada partición, el lag y las tasas medidas después de mandar el mensaje venenoso a la DLQ. El tiempo para ponerse al día es lag ÷ (consumo − producción). Devuelve `particion` y `horas` (1 decimal), o `NULL` si el consumo no supera a la producción (nunca se pone al día). Ordena por partición.
```sql setup
CREATE TABLE tasas (particion INTEGER, lag INTEGER, consumo_msg_s REAL, produccion_msg_s REAL);
INSERT INTO tasas VALUES (3, 95, 140, 52), (7, 1288412, 160, 52), (10, 402089, 0, 51), (11, 403370, 45, 50);
```
```sql solucion
SELECT particion,
       CASE WHEN consumo_msg_s > produccion_msg_s
            THEN ROUND(lag / (consumo_msg_s - produccion_msg_s) / 3600.0, 1) END AS horas
FROM tasas
ORDER BY particion;
```
```pista
`CASE WHEN consumo > produccion THEN lag / (consumo - produccion) / 3600.0 END` devuelve NULL cuando no se cumple.
```
```explicacion
Destrabar la partición 7 no alcanza para avisar "se normaliza en una hora": con 160 mensajes por segundo de consumo contra 52 de producción, 1,29 millones de mensajes tardan unas 3,3 horas. La 10 sigue sin consumidor y la 11 consume más lento de lo que se produce: esas dos **nunca** se ponen al día sin hacer algo más. Este cálculo es el que va en el mensaje de estado.
```
:::

:::errores
- **Reiniciar los consumidores como única acción**: un mensaje venenoso vuelve a trabarlos en segundos.
- **Saltear offsets sin registro**: mover el offset del grupo "a mano" pierde mensajes. Si hay que hacerlo, se anota el rango y se reprocesa después desde una copia.
- **Subir `max.poll.interval.ms` a una hora**: un consumidor colgado tarda una hora en ser detectado. Mejor lotes más chicos y procesamiento más rápido.
- **Escribir en la base sin idempotencia**: cada rebalanceo deja duplicados.
- **Aplicar el último evento que llega**: con eventos fuera de orden, el estado final queda viejo.
:::

:::trabajo
- Se monitorea el lag **por partición** y el tiempo de atraso (consumer lag en segundos), no solo en mensajes: Burrow, el exportador de Kafka para Prometheus, o las métricas de Confluent Cloud, MSK y Event Hubs.
- Los consumidores usan `partition.assignment.strategy=CooperativeStickyAssignor` para que un rebalanceo no detenga a todo el grupo.
- Spark Structured Streaming y Flink guardan los offsets en el *checkpoint*: borrar el checkpoint por error relee el topic desde el principio (o desde el final, perdiendo datos) según `startingOffsets`.
- Los esquemas viven en Schema Registry con compatibilidad `BACKWARD`; un productor que manda otro formato debería fallar en su CI, no en tu consumidor.
:::

:::entrevista
**"El lag de un consumidor de Kafka no para de crecer. ¿Qué miras?"** Si es en todas las particiones (falta capacidad: escalar hasta la cantidad de particiones, procesar en lote) o en una sola (mensaje venenoso o clave caliente); si hay particiones sin consumidor; si hay rebalanceos por `max.poll.interval.ms`. Luego la recuperación: DLQ para los mensajes malos, destino idempotente para los duplicados y el cálculo de cuánto falta para ponerse al día.
:::

## Resumen

| Síntoma | Causa | Acción |
|---|---|---|
| Lag en una partición + mismo offset en el log | Mensaje venenoso | DLQ y confirmar el offset |
| `CONSUMER-ID -` | Consumidores caídos o rebalanceo | Revisar caídas, escalar |
| Rebalanceos en cadena | Lote más lento que `max.poll.interval.ms` | Lotes más chicos, procesamiento más rápido |
| Duplicados en el destino | Al menos una vez | MERGE / clave única por id de evento |
| Estado final incorrecto | Eventos fuera de orden | Aplicar solo si `evento_ts` es más nuevo |
