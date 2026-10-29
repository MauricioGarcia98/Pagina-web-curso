---
titulo: "Procesamiento: batch, micro-batch y streaming (Lambda y Kappa)"
nivel: Avanzado
duracion: 55
resumen: Cuándo procesar por lotes y cuándo en flujo, las arquitecturas Lambda y Kappa, el tiempo del evento, las ventanas, las marcas de agua y las garantías de entrega.
objetivos: Elegir entre batch, micro-batch y streaming según la latencia y el costo | Comparar las arquitecturas Lambda y Kappa y explicar por qué Kappa ganó terreno | Distinguir tiempo del evento y tiempo de procesamiento, y manejar eventos tardíos con marcas de agua | Calcular agregaciones por ventanas y deduplicar eventos repetidos
prerrequisitos: arquitectura-ingesta | spark-streaming
autoevaluacion: ¿Puedes explicar con un ejemplo la diferencia entre tiempo del evento y tiempo de procesamiento? | ¿Puedes dibujar una arquitectura Lambda y una Kappa? | ¿Sabes qué hace una marca de agua en streaming y qué pasa con un evento que llega después? | ¿Puedes contar eventos por ventanas de 5 minutos? | ¿Sabes por qué "exactamente una vez" suele lograrse con "al menos una vez" + idempotencia?
---

:::escenario La tarifa dinámica de Ruta
La gerente de producto de Ruta (la app de viajes) llega con un pedido distinto a todos:

> "Queremos que la tarifa suba cuando en una zona hay muchas solicitudes y pocos conductores. Pero tiene que reaccionar en el momento: si recalculamos una vez por hora, ya es tarde. Y finanzas igual quiere su reporte diario exacto, como siempre."

Dos necesidades con latencias muy distintas sobre los mismos datos: segundos para la tarifa y un día para finanzas. Esta lección explica cómo se diseñan.
:::

## El espectro de la latencia

```diagrama
titulo: Cuanto menor la latencia, mayor la complejidad y el costo
nodo b: Batch | icono=reloj | col=0 | fila=0 | color=azul | sub=horas o días\nreportes, cierres
nodo mb: Micro-batch | icono=capas | col=1 | fila=0 | color=verde | sub=1 a 15 minutos\ntableros operativos
nodo st: Streaming | icono=stream | col=2 | fila=0 | color=naranja | sub=segundos\nalertas, precios
nodo rt: Tiempo real | icono=energia | col=3 | fila=0 | color=rojo | sub=milisegundos\nfraude en la transacción
flecha b -> mb
flecha mb -> st
flecha st -> rt
```

| Modo | Cómo funciona | Herramientas | Ejemplo |
|---|---|---|---|
| **Batch** | Se procesa un bloque de datos (el día de ayer) de una vez | Spark, dbt, SQL programado | Ventas diarias, cierre contable |
| **Micro-batch** | Se procesan lotes chicos cada pocos minutos | Spark Structured Streaming, dbt cada 15 min | Tablero de pedidos del día |
| **Streaming** | Cada evento se procesa apenas llega, con estado | Flink, Spark Streaming, Dataflow, Kafka Streams | Tarifa dinámica, alertas |
| **Tiempo real en línea** | La decisión se toma dentro de la transacción | Servicios con un modelo y una base rápida (Redis) | Aprobar o bloquear un pago |

:::tip Regla práctica
Empieza por batch. Pasa a micro-batch cuando alguien **toma decisiones** dentro del mismo día. Pasa a streaming solo cuando la decisión **pierde valor en minutos**. Cada paso multiplica la complejidad de operar, depurar y reprocesar.
:::

## Lambda y Kappa

Cuando hacen falta las dos latencias, hay dos formas clásicas de organizarlo.

### Arquitectura Lambda: dos caminos

```diagrama
titulo: Lambda: un camino rápido y aproximado + un camino batch exacto
nodo ev: Eventos | icono=movil | col=0 | fila=1 | sub=solicitudes de viaje
nodo q: Cola | icono=kafka | col=1 | fila=1 | color=gris | sub=Kafka · Kinesis · Pub/Sub
nodo sp: Speed layer | icono=stream | col=2 | fila=0 | color=naranja | sub=streaming: últimos minutos
nodo bl: Batch layer | icono=spark | col=2 | fila=2 | color=azul | sub=batch: todo el historial
nodo sv: Serving | icono=dashboard | col=3 | fila=1 | color=verde | sub=combina ambas vistas
flecha ev -> q
flecha q -> sp
flecha q -> bl: se guarda en el lake
flecha sp -> sv: aproximado, ya
flecha bl -> sv: exacto, mañana
```

El mismo dato se procesa **dos veces**, con dos códigos distintos. Funciona, pero tiene un problema grave: mantener dos implementaciones de la misma lógica (una en streaming y otra en batch) que **deben dar el mismo resultado**, y nunca lo dan del todo.

### Arquitectura Kappa: un solo camino

```diagrama
titulo: Kappa: todo es un stream; el historial se reprocesa reproduciendo el log
nodo ev: Eventos | icono=movil | col=0 | fila=0
nodo log: Log durable | icono=kafka | col=1 | fila=0 | color=gris | sub=retiene días o meses
nodo proc: Procesamiento en stream | icono=stream | col=2 | fila=0 | color=naranja | sub=un solo código
nodo out: Tablas / servicio | icono=tabla | col=3 | fila=0 | color=verde | sub=siempre al día
nodo rep: Reproceso | icono=reloj | col=2 | fila=1 | color=violeta | sub=se relee el log desde el inicio
flecha ev -> log
flecha log -> proc
flecha proc -> out
flecha log -> rep: si cambia la lógica | estilo=punteada
flecha rep -> out | estilo=punteada
```

Un solo código. Si la lógica cambia, se **reproduce** el log desde el principio con la versión nueva. Hoy, con formatos de tabla que aceptan escrituras en streaming y en batch (Delta, Iceberg) y motores que hacen las dos cosas con el mismo código (Spark Structured Streaming, Flink, Beam/Dataflow), la mayoría de los diseños nuevos se parecen más a Kappa.

| | Lambda | Kappa |
|---|---|---|
| Caminos | Dos (speed + batch) | Uno |
| Código | Duplicado | Único |
| Reproceso | Con el batch | Releyendo el log |
| Complejidad de operar | Alta | Media |
| Cuándo sigue teniendo sentido | Lógica batch muy pesada que no conviene correr en streaming | La mayoría de los casos nuevos |

## Tiempo del evento y tiempo de procesamiento

Es **el** concepto clave del streaming. Cada evento tiene dos horas:

- **Tiempo del evento**: cuándo ocurrió de verdad (el pasajero tocó "pedir viaje" a las 10:01:05).
- **Tiempo de procesamiento**: cuándo llegó al sistema (a las 10:03:40, porque el celular estaba sin señal en un túnel).

Si agrupas por tiempo de procesamiento, el viaje cae en la ventana equivocada. Los cálculos de negocio se hacen **por tiempo del evento**.

### Ventanas

Un stream no termina nunca, así que para agregar hay que cortarlo en **ventanas**:

| Ventana | Cómo corta | Ejemplo |
|---|---|---|
| **Fija** (*tumbling*) | Bloques consecutivos sin superposición | Solicitudes cada 5 minutos: 10:00–10:05, 10:05–10:10 |
| **Deslizante** (*sliding / hopping*) | Bloques que se superponen | Últimos 10 minutos, recalculado cada minuto |
| **De sesión** | Se abre con actividad y se cierra tras un silencio | Una visita a la app, que termina tras 30 minutos sin clics |

### Marcas de agua: cuánto esperar a los rezagados

Si la ventana de 10:00–10:05 se cierra a las 10:05 en punto, los eventos que llegan tarde quedan afuera. Si esperas para siempre, nunca publicas nada. La **marca de agua** (*watermark*) es la regla de compromiso: "doy por cerrada una ventana cuando ya vi eventos **N minutos** posteriores a su fin". Lo que llegue después se descarta (o se manda a una tabla de tardíos).

```text
Marca de agua de 2 minutos:
evento 10:04:50 llega 10:05:30  → entra en 10:00–10:05 (la ventana sigue abierta)
evento 10:04:10 llega 10:07:30  → la marca ya pasó 10:07 → la ventana 10:00–10:05 está cerrada → tardío
```

Más espera = más exactitud pero más demora. Es una decisión de negocio, no técnica.

## Garantías de entrega

| Garantía | Qué significa | Riesgo |
|---|---|---|
| **Como máximo una vez** (*at most once*) | Ningún evento se repite, pero alguno puede perderse | Perder datos |
| **Al menos una vez** (*at least once*) | Ninguno se pierde, pero alguno puede repetirse | Contar dos veces |
| **Exactamente una vez** (*exactly once*) | Cada evento afecta al resultado una sola vez | Es la más cara de lograr |

En la práctica, "exactamente una vez" casi siempre se logra así: **al menos una vez + un destino idempotente**. Cada evento trae un id único; el destino ignora los ids que ya vio (o hace `MERGE` por id). Es la misma idea de la lección de ingesta.

<!-- estandar:errores -->
:::errores
- **Agrupar por tiempo de procesamiento**: los picos aparecen corridos y los reportes no coinciden con el batch.
- **Sin marca de agua**: el estado de las ventanas crece para siempre y el job se queda sin memoria.
- **No deduplicar**: con "al menos una vez", un reintento cuenta dos veces el mismo pago.
- **Streaming para todo**: un tablero que se mira una vez por día no necesita un job de streaming encendido 24/7 (que se paga 24/7).
- **No poder reprocesar**: si no guardas los eventos crudos (en el log o en bronze), un error en la lógica no tiene arreglo.
:::

<!-- estandar:trabajo -->
:::trabajo
- Los equipos que operan streaming tienen guardias (*on-call*): un job de streaming caído a las 3 de la mañana es un incidente, no algo que se mira al día siguiente. Esa carga operativa es parte del costo.
- Se monitorea el **retraso** (*lag*): cuántos eventos hay en la cola sin procesar. Si crece, el job no da abasto.
- Spark Structured Streaming con `trigger(availableNow=True)` permite correr la misma lógica de streaming **como un batch** que procesa lo pendiente y se apaga. Es la forma más barata de empezar con código "de streaming".
:::

<!-- estandar:entrevista -->
:::entrevista "¿Qué es una marca de agua en streaming?"
Es el umbral de tiempo del evento hasta el que el sistema considera que ya llegaron (casi) todos los datos. Permite cerrar ventanas y liberar estado aunque el stream no termine. Un evento con tiempo anterior a la marca se considera tardío y se descarta o se envía aparte. Explica el compromiso: una marca más permisiva da resultados más exactos pero con más demora y más memoria.
:::

## Ejercicios

:::ejercicio quiz
Un pasajero pidió un viaje a las 10:01:05, pero el evento llegó a las 10:03:40 porque no tenía señal. ¿En qué ventana de 5 minutos debe contarse para la tarifa dinámica?

- [x] 10:00–10:05, por tiempo del evento
- [ ] 10:00–10:05 o 10:05–10:10, da igual
- [ ] En la de 10:03:40, por tiempo de procesamiento
- [ ] No se cuenta: llegó tarde
:::

:::ejercicio quiz
¿Cuál es la principal desventaja de la arquitectura Lambda?

- [ ] No puede reprocesar
- [x] La misma lógica se implementa dos veces (streaming y batch) y hay que mantener ambas coherentes
- [ ] No funciona con Kafka
- [ ] Es solo para batch
:::

:::ejercicio python titulo="Ventanas fijas de 5 minutos"
Escribe `contar_por_ventana(eventos, minutos=5)`. Cada evento es un diccionario con `id` y `ts` (texto `"HH:MM:SS"`, tiempo del evento). Devuelve un diccionario `{inicio_ventana: cantidad}` donde `inicio_ventana` es el texto `"HH:MM"` del comienzo de su ventana (por ejemplo, `10:07:30` cae en `"10:05"`). Los eventos con el mismo `id` repetido deben contarse **una sola vez** (llegaron duplicados).
```python inicial
def contar_por_ventana(eventos, minutos=5):
    ...
```
```python solucion
def contar_por_ventana(eventos, minutos=5):
    vistos, conteo = set(), {}
    for e in eventos:
        if e["id"] in vistos:
            continue
        vistos.add(e["id"])
        h, m, _ = map(int, e["ts"].split(":"))
        total = h * 60 + m
        inicio = total - total % minutos
        clave = f"{inicio // 60:02d}:{inicio % 60:02d}"
        conteo[clave] = conteo.get(clave, 0) + 1
    return conteo
```
```python test
ev = [
    {"id": "a", "ts": "10:01:05"}, {"id": "b", "ts": "10:04:59"},
    {"id": "c", "ts": "10:05:00"}, {"id": "a", "ts": "10:01:05"},
    {"id": "d", "ts": "10:07:30"}, {"id": "e", "ts": "09:58:00"},
]
r = contar_por_ventana(ev)
assert r == {"10:00": 2, "10:05": 2, "09:55": 1}, f"Resultado: {r}"
assert contar_por_ventana([]) == {}
assert contar_por_ventana([{"id": 1, "ts": "00:14:00"}], minutos=15) == {"00:00": 1}
```
:::

:::ejercicio python titulo="Marca de agua y eventos tardíos"
Escribe `separar_tardios(eventos, retraso_max)`. Los eventos llegan **en orden de llegada**; cada uno tiene `ts` (tiempo del evento, en segundos desde un inicio). La marca de agua es el **máximo `ts` visto hasta ese momento menos `retraso_max`**. Un evento es tardío si su `ts` es **menor** que la marca de agua vigente **antes** de procesarlo. Devuelve `(a_tiempo, tardios)`, dos listas con los `ts` en el orden de llegada.
```python inicial
def separar_tardios(eventos, retraso_max):
    ...
```
```python solucion
def separar_tardios(eventos, retraso_max):
    a_tiempo, tardios = [], []
    max_visto = None
    for e in eventos:
        marca = None if max_visto is None else max_visto - retraso_max
        if marca is not None and e["ts"] < marca:
            tardios.append(e["ts"])
        else:
            a_tiempo.append(e["ts"])
        max_visto = e["ts"] if max_visto is None else max(max_visto, e["ts"])
    return a_tiempo, tardios
```
```python test
ev = [{"ts": t} for t in [100, 130, 125, 200, 150, 185, 90]]
ok, tarde = separar_tardios(ev, 30)
assert ok == [100, 130, 125, 200, 185], f"A tiempo: {ok}"
assert tarde == [150, 90], f"Tardíos: {tarde}"
assert separar_tardios([], 10) == ([], [])
```
:::

:::ejercicio abierto titulo="Diseña la tarifa dinámica y el reporte de finanzas de Ruta"
Con el pedido del inicio de la lección: la tarifa dinámica debe reaccionar en menos de un minuto por zona, y finanzas necesita su reporte diario exacto. Propón la arquitectura (fuentes, cola, procesamiento, almacenamiento, servicio), di si es Lambda o Kappa, cómo manejarías tiempo del evento, duplicados y eventos tardíos, y cómo te aseguras de que finanzas y la tarifa usen los mismos datos.
```solucion
Fuentes: la app publica eventos de solicitud, aceptación y posición de conductores (con id único y tiempo del evento) en una cola (Kafka / Kinesis / Pub/Sub).
Procesamiento (Kappa): un job de streaming (Spark Structured Streaming, Flink o Dataflow) lee la cola, deduplica por id de evento, agrupa por zona en ventanas deslizantes de 5 minutos que avanzan cada 30 segundos, usando tiempo del evento con una marca de agua de 1-2 minutos. Calcula solicitudes / conductores disponibles y publica el multiplicador por zona en una base rápida (Redis o una tabla de baja latencia) que consulta el servicio de precios.
Almacenamiento: el mismo job (u otro consumidor) escribe todos los eventos crudos en bronze (Delta/Iceberg, particionado por fecha). Silver deduplica; gold calcula los viajes y la facturación diaria con dbt o Spark batch, cerrando el día con un margen (por ejemplo, a las 03:00 del día siguiente) para incluir tardíos.
Coherencia: ambos caminos parten de los mismos eventos crudos y del mismo id de evento; el reporte diario se puede comparar con la suma de lo que vio el stream. Los eventos tardíos descartados por el stream sí entran en el batch de finanzas, que es la cifra oficial.
Operación: monitoreo del lag de la cola, alertas si el multiplicador no se actualiza en 2 minutos, un valor por defecto (multiplicador 1.0) si el stream falla, y la posibilidad de reprocesar releyendo el log.
```
:::
