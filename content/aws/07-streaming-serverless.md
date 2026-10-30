---
titulo: Streaming y eventos, Kinesis, Firehose y Lambda
nivel: Avanzado
duracion: 50
resumen: Datos en tiempo real con Kinesis Data Streams y Firehose, funciones Lambda disparadas por eventos de S3 y de Kinesis, y cómo programar la lógica de negocio de un handler en Python.
---

## Batch vs. streaming

Hasta ahora procesamos **lotes** (*batch*): "cada noche, todas las ventas del día". Pero hay preguntas que no pueden esperar: ¿esta compra con tarjeta es fraude?, ¿qué conductor está más cerca?, ¿se cayó el sitio?

| | Batch | Streaming |
|---|---|---|
| Latencia | Minutos a horas | Milisegundos a segundos |
| Unidad | Un archivo, una partición | Un evento |
| Ejemplos | Reporte diario, tabla gold | Alerta de fraude, precios dinámicos, monitoreo |
| En AWS | Glue, EMR, Athena | Kinesis, MSK (Kafka), Lambda, Managed Flink |

:::analogia La cinta transportadora
Un **stream** es una cinta transportadora que nunca se detiene: los productores ponen paquetes (eventos) en un extremo y los consumidores los toman en el otro, cada uno a su ritmo. La cinta **guarda** los paquetes un tiempo (24 horas a 365 días), así que si un consumidor se cae, al volver retoma donde quedó.
:::

## Kinesis Data Streams

- Un **stream** se divide en **shards**. Cada shard admite ~1 MB/s o 1.000 registros/s de escritura.
- Cada registro lleva una **partition key**: los registros con la misma clave van al mismo shard y **mantienen el orden** (por ejemplo, todos los eventos de una misma `cuenta_id`).
- Los datos viajan en **base64** y se conservan 24 h por defecto.

```bash norun
aws kinesis create-stream --stream-name transacciones --shard-count 2
aws kinesis describe-stream-summary --stream-name transacciones
aws kinesis put-record --stream-name transacciones \
  --partition-key cuenta-1042 \
  --data '{"cuenta_id": 1042, "monto": 350.0, "comercio": "Electro"}' \
  --cli-binary-format raw-in-base64-out
aws kinesis list-streams
```

```bash
aws kinesis create-stream --stream-name transacciones --shard-count 2
aws kinesis put-record --stream-name transacciones --partition-key cuenta-1042 --data '{"cuenta_id": 1042, "monto": 350.0}' --cli-binary-format raw-in-base64-out
aws kinesis describe-stream-summary --stream-name transacciones
```

:::cuidado La partition key importa
Si todos los eventos usan la misma clave (por ejemplo `"evento"`), todos caen en **un solo shard** y el stream no escala: es el mismo problema del *skew* en Spark. Elige una clave con muchos valores distintos y repartidos.
:::

## Firehose: del stream al lago sin código

**Amazon Data Firehose** junta eventos en lotes (por tamaño o por tiempo, por ejemplo cada 60 segundos o 64 MB), opcionalmente los convierte a Parquet, y los **escribe en S3**, Redshift u OpenSearch. Es la forma más simple de tener una capa bronze alimentada en casi tiempo real.

```text
app ──► Kinesis Data Stream ──► Firehose (lotes de 60 s, a Parquet) ──► s3://lake/bronze/transacciones/fecha=…/
                    └─────────► Lambda (regla de fraude en tiempo real) ──► alerta
```

```bash norun
aws firehose create-delivery-stream --delivery-stream-name tx-a-s3 \
  --delivery-stream-type KinesisStreamAsSource \
  --kinesis-stream-source-configuration KinesisStreamARN=arn:aws:kinesis:us-east-1:123456789012:stream/transacciones,RoleARN=arn:aws:iam::123456789012:role/FirehoseRole \
  --extended-s3-destination-configuration file://destino-s3.json
```

```recorrido
titulo: El viaje de un evento: de la app al lago en minutos
estacion app: App | icono=usuario
estacion put: put-record | icono=api
estacion shard: Shard | icono=capas
estacion fh: Firehose | icono=flujo
estacion s3: S3 | icono=base
paso app: Ocurre una transacción
El sistema del banco produce un evento por cada movimiento: un JSON chico.
>>> json
{"cuenta_id": 1042, "monto": 350.0}
paso put: Se escribe en el stream
`put-record` lo manda a Kinesis con una **clave de partición** (`cuenta-1042`). Kinesis responde en milisegundos con el shard y un número de secuencia.
>>> json
{
  "ShardId": "shardId-000000000000",
  "SequenceNumber": "179339415525150127"
}
paso shard: Misma clave, mismo shard, en orden
Kinesis aplica un hash a la clave para elegir el shard. Todos los eventos de la cuenta 1042 caen en el **mismo** shard y se leen **en el orden** en que llegaron: clave para detectar fraude por secuencia.
>>> texto
cuenta-1042 → shardId-000000000000  secuencia …150127  monto 350.0
cuenta-1042 → shardId-000000000000  secuencia …1708509 monto 12.5
(los eventos se guardan 24 h por defecto)
paso fh: Firehose junta y entrega
Firehose lee el stream y **acumula** eventos hasta un tamaño o un tiempo (por ejemplo, 5 MB o 60 segundos). Escribir un archivo por evento sería lento y caro.
>>> texto
buffer: 5 MB o 60 s (lo que pase primero)
→ un archivo con muchos eventos
paso s3: El lago recibe archivos cada minuto
Los archivos quedan en S3 con un prefijo por fecha y hora. Desde ahí, Athena o Glue los consultan como cualquier otra tabla.
>>> log
s3://lake-banco-dev/bronze/transacciones/2024/12/31/10/tx-a-s3-1-2024-12-31-10-01-00-…
```

## Lambda: código que reacciona a eventos

Una **función Lambda** es un pedazo de código (Python, por ejemplo) que AWS ejecuta **cuando pasa algo**: llega un archivo a S3, entra un lote de registros a Kinesis, se cumple un horario de EventBridge, alguien llama a una API. Escala sola, cobra por milisegundo y tiene un límite de **15 minutos** por ejecución.

Toda Lambda en Python tiene la misma forma: una función `handler(event, context)`. El `event` es un diccionario con la información de lo que pasó.

```python norun
import json, urllib.parse
import boto3

s3 = boto3.client("s3")

def handler(event, context):
    for registro in event["Records"]:
        bucket = registro["s3"]["bucket"]["name"]
        clave = urllib.parse.unquote_plus(registro["s3"]["object"]["key"])   # los espacios llegan como "+"
        obj = s3.get_object(Bucket=bucket, Key=clave)
        filas = obj["Body"].read().decode("utf-8").splitlines()
        print(f"{clave}: {len(filas) - 1} filas")
    return {"statusCode": 200}
```

Así se ve el `event` que manda S3 cuando llega un archivo (recortado):

```json
{
  "Records": [
    {
      "eventName": "ObjectCreated:Put",
      "s3": {
        "bucket": { "name": "lake-tienda-dev" },
        "object": { "key": "landing/ventas/ventas+diciembre.csv", "size": 25951 }
      }
    }
  ]
}
```

```bash norun
aws lambda list-functions --query "Functions[].FunctionName"
aws lambda invoke --function-name procesar-archivo --payload file://evento.json --cli-binary-format raw-in-base64-out respuesta.json
aws logs tail /aws/lambda/procesar-archivo --follow
```

:::experto Idempotencia: el evento puede llegar dos veces
S3, Kinesis y SQS garantizan entrega **al menos una vez** (*at-least-once*). Tu Lambda puede recibir el mismo evento dos veces, así que debe ser **idempotente**: procesar dos veces el mismo archivo no debe duplicar datos (por ejemplo, escribir con una clave determinística o hacer `MERGE` en lugar de `INSERT`). Es una pregunta segura en entrevistas.
:::

## Ejercicios: programa la lógica de los handlers

Estos ejercicios corren Python de verdad en tu navegador. No hay `boto3` (no estamos en AWS), así que programamos **la lógica**: lo que el handler hace con el evento. Es exactamente la parte que más se prueba con tests unitarios en un proyecto real.

:::ejercicio python titulo="Handler de S3: qué archivos procesar"
Escribe `handler(event, context)` que devuelva un diccionario `{"procesar": [...], "ignorados": N}`:

- `procesar`: lista de claves (**decodificadas** con `urllib.parse.unquote_plus`) de los objetos que estén bajo el prefijo `landing/` y terminen en `.csv`, en el orden en que llegan.
- `ignorados`: cuántos registros no cumplen.
```python inicial
import urllib.parse

def handler(event, context):
    pass

evento = {"Records": [
    {"s3": {"bucket": {"name": "lake-tienda-dev"}, "object": {"key": "landing/ventas+diciembre.csv"}}},
    {"s3": {"bucket": {"name": "lake-tienda-dev"}, "object": {"key": "landing/notas.txt"}}},
    {"s3": {"bucket": {"name": "lake-tienda-dev"}, "object": {"key": "bronze/clientes.csv"}}},
    {"s3": {"bucket": {"name": "lake-tienda-dev"}, "object": {"key": "landing/clientes%C3%B1.csv"}}},
]}
print(handler(evento, None))
```
```python solucion
import urllib.parse

def handler(event, context):
    procesar, ignorados = [], 0
    for r in event["Records"]:
        clave = urllib.parse.unquote_plus(r["s3"]["object"]["key"])
        if clave.startswith("landing/") and clave.endswith(".csv"):
            procesar.append(clave)
        else:
            ignorados += 1
    return {"procesar": procesar, "ignorados": ignorados}

evento = {"Records": [
    {"s3": {"bucket": {"name": "lake-tienda-dev"}, "object": {"key": "landing/ventas+diciembre.csv"}}},
    {"s3": {"bucket": {"name": "lake-tienda-dev"}, "object": {"key": "landing/notas.txt"}}},
    {"s3": {"bucket": {"name": "lake-tienda-dev"}, "object": {"key": "bronze/clientes.csv"}}},
    {"s3": {"bucket": {"name": "lake-tienda-dev"}, "object": {"key": "landing/clientes%C3%B1.csv"}}},
]}
print(handler(evento, None))
```
```python test
r = handler(evento, None)
assert r["procesar"] == ["landing/ventas diciembre.csv", "landing/clientesñ.csv"], f"procesar = {r['procesar']} (¿decodificaste con unquote_plus?)"
assert r["ignorados"] == 2, f"ignorados = {r['ignorados']}"
r2 = handler({"Records": []}, None)
assert r2 == {"procesar": [], "ignorados": 0}, "Con un evento vacío debe devolver listas vacías"
```
:::

:::ejercicio python titulo="Handler de Kinesis: regla de fraude en tiempo real"
Caso 🏦 banco. Kinesis entrega lotes de registros con los datos en **base64**. Cada registro decodificado es un JSON como `{"cuenta_id": 7, "ts": 1000, "monto": 50.0}` (`ts` en segundos).

Escribe `handler(event, context)` que decodifique los registros y devuelva la lista **ordenada** de `cuenta_id` que hicieron **3 o más compras dentro de una ventana de 120 segundos** (desde la primera hasta la tercera de ellas, inclusive). Los registros pueden llegar desordenados.
```python inicial
import base64, json

def handler(event, context):
    pass

def registro(d):
    return {"kinesis": {"data": base64.b64encode(json.dumps(d).encode()).decode()}}

evento = {"Records": [registro(x) for x in [
    {"cuenta_id": 7, "ts": 1000, "monto": 50.0},
    {"cuenta_id": 9, "ts": 1005, "monto": 10.0},
    {"cuenta_id": 7, "ts": 1100, "monto": 70.0},
    {"cuenta_id": 7, "ts": 1060, "monto": 20.0},
    {"cuenta_id": 9, "ts": 1300, "monto": 15.0},
    {"cuenta_id": 9, "ts": 1500, "monto": 12.0},
]]}
print(handler(evento, None))
```
```python solucion
import base64, json
from collections import defaultdict

def handler(event, context):
    por_cuenta = defaultdict(list)
    for r in event["Records"]:
        d = json.loads(base64.b64decode(r["kinesis"]["data"]))
        por_cuenta[d["cuenta_id"]].append(d["ts"])
    sospechosas = []
    for cuenta, tss in por_cuenta.items():
        tss.sort()
        if any(tss[i + 2] - tss[i] <= 120 for i in range(len(tss) - 2)):
            sospechosas.append(cuenta)
    return sorted(sospechosas)

def registro(d):
    return {"kinesis": {"data": base64.b64encode(json.dumps(d).encode()).decode()}}

evento = {"Records": [registro(x) for x in [
    {"cuenta_id": 7, "ts": 1000, "monto": 50.0},
    {"cuenta_id": 9, "ts": 1005, "monto": 10.0},
    {"cuenta_id": 7, "ts": 1100, "monto": 70.0},
    {"cuenta_id": 7, "ts": 1060, "monto": 20.0},
    {"cuenta_id": 9, "ts": 1300, "monto": 15.0},
    {"cuenta_id": 9, "ts": 1500, "monto": 12.0},
]]}
print(handler(evento, None))
```
```python test
assert handler(evento, None) == [7], f"Resultado: {handler(evento, None)}"
borde = {"Records": [registro({"cuenta_id": 3, "ts": t, "monto": 1.0}) for t in (0, 60, 120)]}
assert handler(borde, None) == [3], "120 segundos exactos entre la 1.ª y la 3.ª compra cuentan como ráfaga"
fuera = {"Records": [registro({"cuenta_id": 4, "ts": t, "monto": 1.0}) for t in (0, 60, 121, 400)]}
assert handler(fuera, None) == [], "121 segundos ya no es ráfaga"
mucho = {"Records": [registro({"cuenta_id": c, "ts": t, "monto": 1.0}) for c, t in [(2, 0), (1, 5), (2, 10), (1, 6), (2, 20), (1, 7)]]}
assert handler(mucho, None) == [1, 2], "Debe devolver la lista ordenada"
```
```pista
Agrupa los `ts` por cuenta, **ordénalos** y mira ventanas de 3 consecutivos: `ts[i+2] - ts[i] <= 120`. Es la misma idea que `LAG(fecha_hora, 2)` en el caso del banco en SQL.
```
:::

:::ejercicio python titulo="Lotes para Firehose"
Firehose (y `put_record_batch`) aceptan como máximo **500 registros** por llamada y **4 MB** por lote. Escribe `armar_lotes(registros, max_registros=500, max_bytes=4_000_000)` que reciba una lista de textos y devuelva una lista de lotes (listas), respetando el orden, de modo que ningún lote supere ninguno de los dos límites (el tamaño de cada registro es `len(texto.encode("utf-8"))`).
```python inicial
def armar_lotes(registros, max_registros=500, max_bytes=4_000_000):
    pass
```
```python solucion
def armar_lotes(registros, max_registros=500, max_bytes=4_000_000):
    lotes, actual, bytes_actual = [], [], 0
    for r in registros:
        tam = len(r.encode("utf-8"))
        if actual and (len(actual) == max_registros or bytes_actual + tam > max_bytes):
            lotes.append(actual)
            actual, bytes_actual = [], 0
        actual.append(r)
        bytes_actual += tam
    if actual:
        lotes.append(actual)
    return lotes
```
```python test
l = armar_lotes(["x"] * 1201)
assert [len(x) for x in l] == [500, 500, 201], f"Tamaños: {[len(x) for x in l]}"
l = armar_lotes(["abcd"] * 10, max_registros=500, max_bytes=10)
assert [len(x) for x in l] == [2, 2, 2, 2, 2], f"Con 10 bytes máximo y registros de 4 bytes: {[len(x) for x in l]}"
assert armar_lotes([]) == [], "Sin registros, sin lotes"
l = armar_lotes(["ñ" * 3, "a"], max_bytes=6)
assert l == [["ñññ"], ["a"]], f"La ñ ocupa 2 bytes en UTF-8: 'ñññ' ya son 6 bytes y llena el lote. Obtuve {l}"
assert sum(len(x) for x in armar_lotes([str(i) for i in range(2000)], max_bytes=1000)) == 2000, "No se deben perder registros"
```
:::

## Ejercicios de terminal

:::ejercicio cli
Crea el stream de Kinesis `transacciones` con **2 shards**.
```respuesta
todos: aws kinesis create-stream || --stream-name transacciones || --shard-count 2
```
```solucion
aws kinesis create-stream --stream-name transacciones --shard-count 2
```
:::

:::ejercicio cli
Envía al stream `transacciones` el registro `{"cuenta_id": 1042, "monto": 350}` con la partition key `cuenta-1042` (agrega `--cli-binary-format raw-in-base64-out` para mandar el texto tal cual).
```respuesta
todos: aws kinesis put-record || --stream-name transacciones || --partition-key cuenta-1042 || --data '\{\s*"cuenta_id"\s*:\s*1042\s*,\s*"monto"\s*:\s*350(\.0)?\s*\}' || --cli-binary-format raw-in-base64-out
```
```solucion
aws kinesis put-record --stream-name transacciones --partition-key cuenta-1042 --data '{"cuenta_id": 1042, "monto": 350}' --cli-binary-format raw-in-base64-out
```
```setup
aws kinesis create-stream --stream-name transacciones --shard-count 2
```
:::

:::ejercicio cli
Invoca la función Lambda `procesar-archivo` con el evento del archivo `evento.json` y guarda la respuesta en `respuesta.json`.
```respuesta
todos: aws lambda invoke || --function-name procesar-archivo || --payload (file|fileb)://(\./)?evento\.json || respuesta\.json$
```
```solucion
aws lambda invoke --function-name procesar-archivo --payload file://evento.json --cli-binary-format raw-in-base64-out respuesta.json
```
```setup
echo '{"Records": [{"s3": {"bucket": {"name": "lake-tienda-dev"}, "object": {"key": "landing/ventas.csv"}}}]}' > evento.json
```
:::

:::ejercicio quiz
Cada evento de una app trae `usuario_id`. Quieres que los eventos de **un mismo usuario** se procesen en orden. ¿Qué partition key usas en Kinesis?

- [ ] Una constante, `"app"`, para que vayan todos juntos
- [x] `usuario_id`: los eventos del mismo usuario caen en el mismo shard y conservan su orden
- [ ] Un número aleatorio
- [ ] La fecha del día
:::

:::ejercicio quiz
Tu Lambda que procesa archivos de S3 a veces recibe el **mismo evento dos veces**. ¿Cuál es la solución correcta?

- [ ] Desactivar los reintentos y rezar
- [ ] Agregar un `sleep` al inicio
- [x] Hacerla idempotente: por ejemplo, escribir el resultado con una clave derivada del archivo de origen, o hacer `MERGE` por la clave del registro
- [ ] Usar Python 2
:::

:::ejercicio quiz
Un proceso tarda 40 minutos en transformar un archivo grande. ¿Sirve Lambda?

- [ ] Sí, Lambda no tiene límites
- [x] No: Lambda tiene un máximo de 15 minutos por ejecución. Mejor un job de Glue, EMR Serverless o un contenedor en ECS/Fargate (que la Lambda puede disparar)
- [ ] Sí, si le das más memoria
- [ ] Solo en la región us-east-1
:::
