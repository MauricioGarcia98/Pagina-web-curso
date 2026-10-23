---
titulo: Pub/Sub y Dataflow, streaming en Google Cloud
nivel: Avanzado
duracion: 55
resumen: Temas y suscripciones de Pub/Sub, entrega al menos una vez y deduplicación; Apache Beam y Dataflow; tiempo de evento, ventanas, watermark y datos tardíos, programados en Python.
---

## Pub/Sub: el correo instantáneo de los eventos

**Pub/Sub** recibe mensajes de quienes **publican** y los entrega a quienes están **suscritos**. Desacopla a los sistemas: la app que vende no necesita saber quién usa sus eventos.

```text
 app de ventas ──publish──►  TEMA "ventas"  ──► suscripción "ventas-a-bigquery" ──► BigQuery (directo, sin código)
                                           ├──► suscripción "ventas-fraude"     ──► Dataflow (regla de fraude)
                                           └──► suscripción "ventas-auditoria"  ──► Cloud Storage (archivo)
```

| Concepto | Qué es |
|---|---|
| **Tema** (*topic*) | El canal donde se publica |
| **Suscripción** | Una "bandeja" independiente: cada suscripción recibe **todas** las copias de los mensajes |
| **Ack** | El consumidor confirma "ya lo procesé"; si no confirma a tiempo, Pub/Sub lo **reenvía** |
| **Pull / Push** | El consumidor pide mensajes (pull) o Pub/Sub los envía a una URL (push) |
| **Dead letter topic** | Donde terminan los mensajes que fallan una y otra vez |
| **Suscripción a BigQuery** | Escribe cada mensaje como fila en una tabla, sin código intermedio |

```bash
gcloud pubsub topics create ventas
gcloud pubsub subscriptions create ventas-fraude --topic ventas
gcloud pubsub topics publish ventas --message '{"pedido_id": 1, "cliente_id": 42, "total": 350.0}'
gcloud pubsub topics publish ventas --message '{"pedido_id": 2, "cliente_id": 42, "total": 12.5}'
gcloud pubsub subscriptions pull ventas-fraude --auto-ack --limit 10
```

:::cuidado "Al menos una vez" significa "a veces dos"
Pub/Sub garantiza entrega **al menos una vez**: un mensaje puede llegar duplicado (por ejemplo, si tu consumidor tardó en hacer *ack*). Tu pipeline debe **deduplicar** por un identificador del evento, o ser idempotente. También existe la opción *exactly-once delivery* en suscripciones pull, con más latencia.
:::

## Dataflow y Apache Beam

**Dataflow** ejecuta pipelines escritos con **Apache Beam** (Python o Java) sin servidores: escala los workers solo. Lo mismo sirve para **batch** y para **streaming**.

```python norun
import apache_beam as beam
from apache_beam.transforms.window import FixedWindows
import json

with beam.Pipeline(options=opciones) as p:
    (p
     | "Leer"       >> beam.io.ReadFromPubSub(subscription="projects/academia-datos-dev/subscriptions/ventas-fraude")
     | "Parsear"    >> beam.Map(lambda m: json.loads(m.decode("utf-8")))
     | "Ventanas"   >> beam.WindowInto(FixedWindows(60))                  # ventanas de 1 minuto
     | "Clave"      >> beam.Map(lambda v: (v["cliente_id"], v["total"]))
     | "Sumar"      >> beam.CombinePerKey(sum)
     | "A filas"    >> beam.Map(lambda kv: {"cliente_id": kv[0], "total_minuto": kv[1]})
     | "BigQuery"   >> beam.io.WriteToBigQuery("academia-datos-dev:tienda_rt.gasto_por_minuto"))
```

| Concepto de Beam | Qué es | Parecido en Spark |
|---|---|---|
| `PCollection` | Colección de datos (acotada o infinita) | DataFrame |
| `PTransform` (`Map`, `Filter`, `GroupByKey`, `CombinePerKey`) | Transformación | `select`, `filter`, `groupBy` |
| `|` y `>>` | Encadenar pasos con nombre | Encadenar métodos |
| Runner | Quién ejecuta: `DirectRunner` (tu PC) o `DataflowRunner` | Local vs. cluster |

```bash norun
python pipeline.py --runner DataflowRunner --project academia-datos-dev --region us-central1 \
  --temp_location gs://lake-tienda-dev/tmp --streaming
gcloud dataflow flex-template run ventas-rt --template-file-gcs-location gs://…/plantilla.json --region us-central1
gcloud dataflow jobs list --region us-central1
```

## El tiempo en streaming: lo más importante de esta lección

Un evento tiene **dos** horas:

- **Tiempo de evento**: cuándo ocurrió (la compra fue a las 10:00:30).
- **Tiempo de procesamiento**: cuándo llegó a tu pipeline (10:03:10, porque el celular estaba sin señal).

:::analogia Cartas que llegan tarde
Cuentas las cartas que te escribieron cada día. Una carta escrita el lunes puede llegar el miércoles. Si cuentas por **día de llegada**, el lunes queda mal contado. Si cuentas por **día en que se escribió** (tiempo de evento), necesitas decidir cuánto esperar antes de "cerrar" el lunes: esa espera es el **watermark** y la tolerancia extra es la **allowed lateness**.
:::

| Tipo de ventana | Cómo corta el tiempo | Ejemplo |
|---|---|---|
| **Fija** (*fixed / tumbling*) | Bloques iguales sin solaparse | Ventas por minuto |
| **Deslizante** (*sliding*) | Bloques que se solapan | Promedio de los últimos 10 min, cada 1 min |
| **Sesión** | Se cierra tras X minutos sin actividad | Sesiones de navegación de un usuario |

- **Watermark**: la estimación del sistema de "ya llegó todo lo anterior a tal hora". Cuando el watermark pasa el final de una ventana, la ventana emite su resultado.
- **Datos tardíos**: los que llegan después del watermark. Se aceptan si están dentro de la *allowed lateness* (y actualizan el resultado); si no, se descartan o van a una salida aparte.

## Ejercicios: programa la lógica de streaming

:::ejercicio python titulo="Deduplicar mensajes de Pub/Sub"
Pub/Sub puede entregar mensajes repetidos. Escribe `deduplicar(mensajes)` que reciba una lista de diccionarios con `message_id` y `data`, y devuelva la lista **sin repetidos** (conservando la **primera** aparición de cada `message_id`, en el orden original).
```python inicial
def deduplicar(mensajes):
    pass

msgs = [{"message_id": "a", "data": 1}, {"message_id": "b", "data": 2}, {"message_id": "a", "data": 1}, {"message_id": "c", "data": 3}, {"message_id": "b", "data": 2}]
print(deduplicar(msgs))
```
```python solucion
def deduplicar(mensajes):
    vistos, salida = set(), []
    for m in mensajes:
        if m["message_id"] not in vistos:
            vistos.add(m["message_id"])
            salida.append(m)
    return salida

msgs = [{"message_id": "a", "data": 1}, {"message_id": "b", "data": 2}, {"message_id": "a", "data": 1}, {"message_id": "c", "data": 3}, {"message_id": "b", "data": 2}]
print(deduplicar(msgs))
```
```python test
r = deduplicar(msgs)
assert [m["message_id"] for m in r] == ["a", "b", "c"], f"Obtuve {[m['message_id'] for m in r]}"
assert deduplicar([]) == [], "Lista vacía → lista vacía"
r2 = deduplicar([{"message_id": "x", "data": "primero"}, {"message_id": "x", "data": "segundo"}])
assert r2 == [{"message_id": "x", "data": "primero"}], "Hay que conservar la PRIMERA aparición"
```
:::

:::ejercicio python titulo="Ventanas fijas por tiempo de evento"
Escribe `ventanas_fijas(eventos, tamano)` que reciba eventos `(ts_evento, cliente_id, monto)` (ts en segundos) y devuelva un diccionario `{(inicio_ventana, cliente_id): suma_montos}` agrupando por ventanas fijas de `tamano` segundos según el **tiempo de evento** (`inicio_ventana = ts - ts % tamano`). Redondea cada suma a 2 decimales.
```python inicial
def ventanas_fijas(eventos, tamano):
    pass

eventos = [(5, 1, 10.0), (59, 1, 5.5), (60, 1, 1.0), (61, 2, 3.0), (130, 1, 2.25), (10, 2, 4.0)]
print(ventanas_fijas(eventos, 60))
```
```python solucion
def ventanas_fijas(eventos, tamano):
    res = {}
    for ts, cliente, monto in eventos:
        clave = (ts - ts % tamano, cliente)
        res[clave] = res.get(clave, 0) + monto
    return {k: round(v, 2) for k, v in res.items()}

eventos = [(5, 1, 10.0), (59, 1, 5.5), (60, 1, 1.0), (61, 2, 3.0), (130, 1, 2.25), (10, 2, 4.0)]
print(ventanas_fijas(eventos, 60))
```
```python test
r = ventanas_fijas(eventos, 60)
esperado = {(0, 1): 15.5, (60, 1): 1.0, (60, 2): 3.0, (120, 1): 2.25, (0, 2): 4.0}
assert r == esperado, f"Obtuve {r}"
assert ventanas_fijas([], 60) == {}, "Sin eventos, sin ventanas"
assert ventanas_fijas([(59, 7, 1.0), (60, 7, 1.0)], 60) == {(0, 7): 1.0, (60, 7): 1.0}, "El segundo 60 ya pertenece a la ventana que empieza en 60"
```
:::

:::ejercicio python titulo="Watermark y datos tardíos"
Ahora los eventos llegan **en orden de procesamiento** como `(ts_llegada, ts_evento, monto)`. El watermark en cada momento es `max(ts_evento visto hasta ahora) - 30` (toleramos 30 s de desorden). Una ventana fija de 60 s que empieza en `w` se **cierra** cuando el watermark llega a `w + 60` o más. Además se admite una *allowed lateness* de 60 s: un evento cuya ventana ya cerró se acepta igual si `watermark < inicio_ventana + 60 + 60`; si no, se **descarta**.

Escribe `procesar(eventos)` que devuelva `(totales, descartados)`: `totales` es `{inicio_ventana: suma}` (redondeada a 2) con los eventos aceptados y `descartados` la lista de `ts_evento` descartados, en orden de llegada. Calcula el watermark **antes** de incorporar cada evento (con lo visto hasta ese momento; al principio no hay watermark y todo se acepta).
```python inicial
def procesar(eventos):
    pass

llegadas = [(1, 10, 5.0), (2, 70, 1.0), (3, 15, 2.0), (4, 200, 3.0), (5, 50, 4.0), (6, 130, 1.5), (7, 260, 2.0), (8, 100, 9.0)]
print(procesar(llegadas))
```
```python solucion
def procesar(eventos):
    totales, descartados = {}, []
    max_evento = None
    for _, ts, monto in eventos:
        w = ts - ts % 60
        if max_evento is not None:
            watermark = max_evento - 30
            if watermark >= w + 60 + 60:
                descartados.append(ts)
                max_evento = max(max_evento, ts)
                continue
        totales[w] = round(totales.get(w, 0) + monto, 2)
        max_evento = ts if max_evento is None else max(max_evento, ts)
    return totales, descartados

llegadas = [(1, 10, 5.0), (2, 70, 1.0), (3, 15, 2.0), (4, 200, 3.0), (5, 50, 4.0), (6, 130, 1.5), (7, 260, 2.0), (8, 100, 9.0)]
print(procesar(llegadas))
```
```python test
tot, desc = procesar(llegadas)
assert desc == [50, 100], f"Descartados: {desc}. Al llegar ts=50 el watermark es 200-30=170 ≥ 0+120 → descartado; ts=100 llega con watermark 230 ≥ 60+120 → descartado"
assert tot == {0: 7.0, 60: 1.0, 180: 3.0, 120: 1.5, 240: 2.0}, f"Totales: {tot}"
assert procesar([]) == ({}, []), "Sin eventos"
t2, d2 = procesar([(1, 300, 1.0), (2, 190, 2.0)])
assert d2 == [] and t2 == {300: 1.0, 180: 2.0}, "Con watermark 270, la ventana 180 cerró (270 ≥ 240) pero está dentro de la allowed lateness (270 < 300): se acepta"
```
```pista
Para cada evento: calcula su ventana `w`; si ya hay watermark y `watermark >= w + 120`, es demasiado tarde. Actualiza el máximo de `ts_evento` **después** de decidir.
```
:::

## Ejercicios de terminal

:::ejercicio cli
Crea el tema de Pub/Sub `transacciones`.
```respuesta
gcloud pubsub topics create transacciones
```
:::

:::ejercicio cli
Crea la suscripción `transacciones-fraude` al tema `transacciones`.
```respuesta
todos: gcloud pubsub subscriptions create transacciones-fraude || --topic[= ]transacciones
```
```solucion
gcloud pubsub subscriptions create transacciones-fraude --topic transacciones
```
```setup
gcloud pubsub topics create transacciones
```
:::

:::ejercicio cli
Publica en `transacciones` el mensaje `{"cuenta_id": 7, "monto": 99.9}`.
```respuesta
todos: gcloud pubsub topics publish transacciones || --message[= ]'\{\s*"cuenta_id"\s*:\s*7\s*,\s*"monto"\s*:\s*99\.9\s*\}'
```
```solucion
gcloud pubsub topics publish transacciones --message '{"cuenta_id": 7, "monto": 99.9}'
```
```setup
gcloud pubsub topics create transacciones
gcloud pubsub subscriptions create transacciones-fraude --topic transacciones
```
:::

:::ejercicio cli
Lee (y confirma con *ack*) hasta 5 mensajes de la suscripción `transacciones-fraude`.
```respuesta
todos: gcloud pubsub subscriptions pull transacciones-fraude || --auto-ack || --limit[= ]5
```
```solucion
gcloud pubsub subscriptions pull transacciones-fraude --auto-ack --limit 5
```
```setup
gcloud pubsub topics create transacciones
gcloud pubsub subscriptions create transacciones-fraude --topic transacciones
gcloud pubsub topics publish transacciones --message '{"cuenta_id": 7, "monto": 99.9}'
```
:::

:::ejercicio quiz
Tienes un tema `ventas` con dos suscripciones: `a-bigquery` y `fraude`. Se publica un mensaje. ¿Quién lo recibe?

- [ ] Solo la primera suscripción que lo pida
- [x] Ambas: cada suscripción recibe su propia copia de cada mensaje
- [ ] Ninguna hasta que se haga ack
- [ ] Se reparte al azar
:::

:::ejercicio quiz
Quieres "ventas por minuto según la hora real de la compra", aunque algunos celulares envíen eventos con 2 minutos de atraso. ¿Qué configuras?

- [ ] Ventanas por tiempo de procesamiento
- [x] Ventanas por **tiempo de evento**, con un watermark y una *allowed lateness* que cubran ese atraso
- [ ] Un batch nocturno
- [ ] No se puede hacer en streaming
:::
