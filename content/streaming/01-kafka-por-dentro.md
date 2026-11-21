---
titulo: Kafka por dentro - tópicos, particiones, claves y grupos
nivel: Avanzado
duracion: 60
resumen: Kafka no es una cola donde cada mensaje se borra al leerse - es un registro de solo agregar, dividido en particiones, que muchos lectores recorren a su ritmo. Aprendes cómo la clave del mensaje decide su partición (y por qué el orden solo está garantizado dentro de una partición), cómo un grupo de consumidores se reparte las particiones, qué hacen la retención y la compactación, y simulas cada pieza en Python para verla funcionar.
objetivos: Explicar tópico, partición, offset y la diferencia con una cola tradicional | Elegir la clave de un mensaje para conservar el orden que importa | Repartir particiones entre los consumidores de un grupo | Distinguir retención por tiempo y compactación por clave | Relacionar Kafka con Azure Event Hubs, Amazon MSK y Google Pub/Sub
prerrequisitos: arquitectura-batch-streaming | spark-streaming
autoevaluacion: ¿Por qué dos mensajes del mismo pedido deben tener la misma clave? | ¿Qué pasa si un grupo tiene más consumidores que particiones? | ¿Qué queda en un tópico compactado? | ¿En qué se diferencia leer de Kafka de sacar un mensaje de una cola?
---

:::analogia En palabras simples
Kafka es como un libro de actas en varios tomos. Cada hecho se escribe al final de un tomo, con un número de renglón, y nunca se borra ni se corrige. Cada lector lleva su propio señalador: uno puede ir por el renglón 50 y otro por el 900, y leer no arranca la hoja. Los tomos son las particiones; el número de renglón es el offset.
:::

## Las piezas

| Pieza | Qué es | Ejemplo |
|---|---|---|
| **Tópico** | Un flujo de mensajes con nombre | `pedidos`, `telemetria` |
| **Partición** | Un tramo del tópico, ordenado y de solo agregar | `pedidos` tiene 6 particiones |
| **Offset** | La posición de un mensaje dentro de su partición | Partición 2, offset 1540 |
| **Clave** | Decide en qué partición cae el mensaje | `pedido_id` |
| **Grupo de consumidores** | Lectores que se reparten las particiones de un tópico | `grupo-silver` |
| **Offset confirmado** | Hasta dónde leyó un grupo, guardado en Kafka | El grupo va por el 1540 de la partición 2 |

## La clave decide la partición, y el orden

El productor calcula `hash(clave) % cantidad_de_particiones`. Todos los mensajes con la **misma clave** caen en la **misma partición**, y dentro de una partición el orden se respeta. Entre particiones distintas **no hay orden garantizado**.

Si los eventos de un pedido (`creado`, `pagado`, `enviado`) usan como clave el `pedido_id`, llegan en orden. Si no tienen clave (se reparten en turnos), `enviado` puede procesarse antes que `creado`.

:::nota El hash real
Kafka usa la función murmur2 sobre los bytes de la clave ([documentación del productor](https://kafka.apache.org/documentation/#producerconfigs)). En los ejercicios usamos `zlib.crc32`, que se comporta igual a los fines de la idea: determinista y repartido.
:::

:::cuidado Cambiar la cantidad de particiones
Si un tópico pasa de 6 a 12 particiones, `hash(clave) % 12` ya no da lo mismo que `% 6`: las claves cambian de partición y, por un rato, mensajes nuevos de un pedido pueden procesarse antes que los viejos que quedaron en la partición anterior. Elige la cantidad de particiones pensando en el crecimiento, y súbela con un plan.
:::

## Grupos de consumidores

Las particiones de un tópico se reparten entre los consumidores de un grupo: **cada partición la lee un solo consumidor del grupo**. Con 6 particiones y 3 consumidores, cada uno lee 2. Con 8 consumidores, 2 quedan sin trabajo: las particiones son el límite del paralelismo. Si un consumidor se cae, el grupo se **rebalancea** y sus particiones pasan a otro.

```diagrama
titulo: Un tópico de 6 particiones y dos grupos que lo leen por separado
nodo pr: Productor | icono=movil | col=0 | fila=1 | color=gris | sub=clave = pedido_id
nodo t: Tópico pedidos | icono=kafka | col=1 | fila=1 | color=azul | sub=6 particiones
nodo c1: Consumidor A | icono=servidor | col=2 | fila=0 | color=verde | sub=particiones 0 y 1
nodo c2: Consumidor B | icono=servidor | col=2 | fila=1 | color=verde | sub=particiones 2 y 3
nodo c3: Consumidor C | icono=servidor | col=2 | fila=2 | color=verde | sub=particiones 4 y 5
nodo f: Grupo alertas-fraude | icono=alerta | col=3 | fila=1 | color=rojo | sub=lee las 6 con sus propios offsets
grupo gs: Grupo silver | nodos=c1,c2,c3 | color=verde
flecha pr -> t
flecha t -> c1
flecha t -> c2
flecha t -> c3
flecha t -> f | estilo=punteada
```

Dos grupos distintos leen el mismo tópico de forma independiente, cada uno con sus offsets: el equipo de silver y el de alertas de fraude pueden consumir `pedidos` sin molestarse.

## Retención y compactación

| Política | Qué guarda | Para qué |
|---|---|---|
| Retención por tiempo o tamaño (`delete`) | Los mensajes de los últimos N días | Eventos: clics, telemetría, pedidos |
| Compactación (`compact`) | Al menos el **último** mensaje de cada clave | Estados: el precio actual de cada producto, la última dirección de cada cliente |

En un tópico compactado, un mensaje con valor nulo (una "lápida") borra la clave ([compactación](https://kafka.apache.org/documentation/#compaction)).

## Kafka en las nubes

Azure Event Hubs habla el protocolo de Kafka (es lo que usa el proyecto Ruta Sur del curso), AWS ofrece Amazon MSK (Kafka administrado) y Kinesis, y Google Cloud ofrece Pub/Sub y Managed Service for Apache Kafka. Los conceptos de esta lección valen para todos ([Event Hubs para Kafka](https://learn.microsoft.com/en-us/azure/event-hubs/azure-event-hubs-apache-kafka-overview)).

:::practica python Un tópico de juguete con particiones y orden
1. Ejecuta: los eventos de tres pedidos se escriben en un tópico de 3 particiones usando el `pedido_id` como clave.
2. Mira que cada pedido queda entero en una partición y en orden.
3. Cambia la clave por el tipo de evento (`creado`, `pagado`…) y mira cómo se mezclan los pedidos y se pierde el orden de cada uno.

```python
import zlib

N = 3
topico = {p: [] for p in range(N)}

def producir(clave, valor):
    p = zlib.crc32(str(clave).encode()) % N
    topico[p].append({"offset": len(topico[p]), "clave": clave, "valor": valor})

eventos = [(101, "creado"), (102, "creado"), (101, "pagado"), (103, "creado"), (102, "pagado"), (101, "enviado")]
for pedido, tipo in eventos:
    producir(pedido, f"{pedido}:{tipo}")

for p, msgs in topico.items():
    print(f"partición {p}:", [m["valor"] for m in msgs])
```

Reto: simula un consumidor que lee las tres particiones "en paralelo", tomando un mensaje de cada una por turno, y comprueba que el orden de cada pedido se mantiene aunque el orden global cambie.

Documentación oficial: [Introducción y diseño de Kafka](https://kafka.apache.org/documentation/) · [Posición del consumidor](https://kafka.apache.org/documentation/#design_consumerposition) · [Compactación](https://kafka.apache.org/documentation/#compaction) · [Event Hubs para Kafka](https://learn.microsoft.com/en-us/azure/event-hubs/azure-event-hubs-apache-kafka-overview)
:::

:::errores
- **Mensajes sin clave cuando el orden importa.** Usa como clave la entidad cuyo orden necesitas.
- **Más consumidores que particiones.** Los que sobran no leen nada.
- **Tratar Kafka como una cola.** Leer no borra: otro grupo puede leer lo mismo, y tú puedes volver atrás.
- **Compactación para eventos.** Compactar deja solo el último por clave: perderías la historia de clics.
:::

:::entrevista
**Pregunta:** "Los eventos de un pedido a veces se procesan desordenados. ¿Por qué y cómo lo arreglas?"

**Respuesta modelo:** "Seguramente el productor no usa el `pedido_id` como clave, entonces los eventos del mismo pedido caen en particiones distintas y Kafka solo ordena dentro de una partición. Usaría `pedido_id` como clave. Y, como defensa, en el consumidor aplicaría los cambios según una marca de tiempo o un número de versión del evento, descartando los más viejos que el estado actual."
:::

## Ejercicios

:::ejercicio quiz
Un tópico tiene 4 particiones y el grupo `silver` tiene 6 consumidores. ¿Qué pasa?
- [ ] Cada partición se lee entre varios consumidores para ir más rápido
- [x] 4 consumidores leen una partición cada uno y 2 quedan sin trabajo
- [ ] Kafka crea 2 particiones nuevas automáticamente
- [ ] El grupo no puede arrancar
:::

:::ejercicio python dificultad=Avanzado titulo="Producir con clave"
Escribe `producir(eventos, n)`. `eventos` es una lista de tuplas `(clave, valor)` en orden de llegada. Devuelve un diccionario `{particion: [valores en orden]}` con las `n` particiones (todas, aunque queden vacías), donde la partición de cada evento es `zlib.crc32(str(clave).encode()) % n`.
```python inicial
import zlib

def producir(eventos, n):
    pass
```
```python solucion
import zlib

def producir(eventos, n):
    topico = {p: [] for p in range(n)}
    for clave, valor in eventos:
        topico[zlib.crc32(str(clave).encode()) % n].append(valor)
    return topico
```
```pista
Crea primero las `n` listas vacías y después agrega cada valor al final de la lista de su partición: así se conserva el orden de llegada.
```
```python test
import zlib
ev = [(101, "101:creado"), (102, "102:creado"), (101, "101:pagado"), (101, "101:enviado"), (102, "102:pagado")]
t = producir(ev, 3)
assert sorted(t) == [0, 1, 2], "Deben estar las 3 particiones"
p101 = zlib.crc32(b"101") % 3
assert [v for v in t[p101] if v.startswith("101:")] == ["101:creado", "101:pagado", "101:enviado"], f"Los eventos del pedido 101 deben quedar juntos y en orden: {t}"
assert sum(len(v) for v in t.values()) == 5
assert producir([], 2) == {0: [], 1: []}
```
:::

:::ejercicio python dificultad=Avanzado titulo="Repartir particiones en un grupo"
Escribe `asignar(particiones, consumidores)` que reparta como el asignador por rangos de Kafka: ordena los consumidores por nombre, divide las particiones (0 a `particiones - 1`) en tramos seguidos, y los primeros consumidores reciben una partición más si la división no es exacta. Devuelve `{consumidor: [particiones]}` (los que no reciben nada quedan con lista vacía).
```python inicial
def asignar(particiones, consumidores):
    pass
```
```python solucion
def asignar(particiones, consumidores):
    cs = sorted(consumidores)
    res = {c: [] for c in cs}
    if not cs:
        return res
    base, extra = divmod(particiones, len(cs))
    inicio = 0
    for i, c in enumerate(cs):
        cuantas = base + (1 if i < extra else 0)
        res[c] = list(range(inicio, inicio + cuantas))
        inicio += cuantas
    return res
```
```pista
`divmod(particiones, len(consumidores))` da cuántas le tocan a cada uno y cuántos reciben una de más.
```
```python test
assert asignar(6, ["c2", "c1", "c3"]) == {"c1": [0, 1], "c2": [2, 3], "c3": [4, 5]}
assert asignar(7, ["a", "b", "c"]) == {"a": [0, 1, 2], "b": [3, 4], "c": [5, 6]}
assert asignar(2, ["a", "b", "c"]) == {"a": [0], "b": [1], "c": []}, "Con más consumidores que particiones, sobran consumidores"
assert asignar(3, []) == {}
```
:::

:::ejercicio python dificultad=Experto titulo="Compactar un tópico"
Escribe `compactar(registro)` que reciba los mensajes de una partición como lista de `(offset, clave, valor)` en orden de offset, y devuelva lo que queda después de compactar: el **último** mensaje de cada clave, en orden de offset. Un valor `None` es una lápida: borra la clave (no queda ningún mensaje de ella).
```python inicial
def compactar(registro):
    pass
```
```python solucion
def compactar(registro):
    ultimo = {}
    for offset, clave, valor in registro:
        ultimo[clave] = (offset, clave, valor)
    return sorted(m for m in ultimo.values() if m[2] is not None)
```
```pista
Recorre guardando en un diccionario el último mensaje de cada clave; al final, descarta las lápidas y ordena por offset.
```
```python test
reg = [(0, "p1", 100), (1, "p2", 50), (2, "p1", 110), (3, "p3", 70), (4, "p2", None), (5, "p1", 105)]
assert compactar(reg) == [(3, "p3", 70), (5, "p1", 105)], f"Obtuviste {compactar(reg)}"
assert compactar([]) == []
assert compactar([(0, "a", None)]) == []
```
:::
