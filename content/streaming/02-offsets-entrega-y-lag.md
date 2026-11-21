---
titulo: Offsets, garantías de entrega y lag
nivel: Experto
duracion: 60
resumen: Que un pipeline de streaming pierda o duplique mensajes depende casi siempre de un detalle - en qué momento confirma el offset. Simulas un consumidor que se cae a mitad de camino y ves cómo "confirmar antes" pierde mensajes y "confirmar después" los repite. Aprendes por qué en la práctica se elige "al menos una vez" con un destino idempotente para lograr el efecto de "exactamente una vez", y a medir el lag, el indicador número uno de la salud de un stream.
objetivos: Explicar qué guarda un offset confirmado y para qué sirve al reiniciar | Predecir pérdidas y duplicados según cuándo se confirma el offset | Lograr el efecto de "exactamente una vez" con entrega al menos una vez y un destino idempotente | Calcular el lag por partición y total de un grupo | Decidir qué hacer cuando el lag crece
prerrequisitos: streaming-kafka-por-dentro
autoevaluacion: ¿Qué pasa si el consumidor confirma el offset antes de procesar y se cae? | ¿Y si lo confirma después? | ¿Qué es un destino idempotente? | ¿Qué te dice un lag que crece sin parar?
---

:::analogia En palabras simples
Leer un libro con señalador: si mueves el señalador **antes** de leer la página y te quedas dormido, al despertar te salteas esa página (la perdiste). Si lo mueves **después** de leerla y te dormiste justo antes de moverlo, al despertar la vuelves a leer (la duplicaste). No hay forma de mover el señalador y leer en el mismo instante: por eso lo que se hace es que releer una página no cause daño.
:::

## El offset confirmado

Cada grupo de consumidores guarda en Kafka, por partición, el offset del **próximo** mensaje que tiene que leer. Si el consumidor se reinicia (o se cae y otro toma su partición), sigue desde ahí. Todo depende de cuándo se guarda:

| Estrategia | Orden | Si se cae en el medio… | Garantía |
|---|---|---|---|
| Confirmar antes | Confirmar → procesar | El mensaje confirmado y no procesado **se pierde** | Como máximo una vez |
| Confirmar después | Procesar → confirmar | El mensaje procesado y no confirmado **se repite** | Al menos una vez |
| Transacciones | Procesar y confirmar juntos | Ni pérdida ni duplicado (si todo es Kafka o un destino transaccional) | Exactamente una vez |

Kafka tiene transacciones que dan "exactamente una vez" cuando se lee de Kafka y se escribe en Kafka ([semántica de entrega](https://kafka.apache.org/documentation/#semantics)). Cuando el destino es otro sistema (una tabla Delta, una base), lo habitual es **al menos una vez + destino idempotente**: los duplicados llegan, pero escribirlos dos veces no cambia el resultado.

## Destinos idempotentes

| Destino | Cómo se vuelve idempotente |
|---|---|
| Tabla Delta / base relacional | `MERGE` por el id del evento: si ya existe, no se inserta de nuevo |
| Archivos | Nombre de archivo determinista por lote (reescribir el mismo lote lo reemplaza) |
| API externa | Clave de idempotencia por evento (lo viste en el módulo APIs) |
| Structured Streaming | El checkpoint registra qué lotes se escribieron; con `foreachBatch`, usa el `batch_id` o un `MERGE` |

:::cuidado "Exactamente una vez" no es gratis
Que una herramienta prometa "exactly-once" suele querer decir "exactamente una vez **dentro de este sistema**". En cuanto un efecto sale afuera (un correo, un cobro, una fila en otra base), vuelve a ser tu responsabilidad que repetirlo no cause daño. Diseña cada paso para tolerar duplicados.
:::

## El lag

El **lag** de una partición es la diferencia entre el último offset escrito (el final del registro) y el offset confirmado del grupo: cuántos mensajes están esperando. Es la primera métrica que se monitorea en un stream.

| Lo que ves | Qué significa | Qué haces |
|---|---|---|
| Lag estable y bajo | El consumidor da abasto | Nada |
| Lag que sube en picos y baja | Ráfagas que se absorben | Nada, o alertar solo si dura |
| Lag que crece sin parar | Llegan más mensajes de los que se procesan | Más consumidores (hasta la cantidad de particiones), procesar más rápido, o más particiones |
| Lag alto en **una** partición | Una clave caliente o un consumidor trabado | Revisar la clave y ese consumidor |

:::practica python Confirmar antes o después: ver la pérdida y el duplicado
1. Ejecuta: un consumidor procesa 5 mensajes y "se cae" en el tercero, con cada una de las dos estrategias; después se reinicia desde el offset confirmado.
2. Compara las salidas: una pierde un mensaje y la otra repite uno.
3. Agrega un destino idempotente (un conjunto de ids ya escritos) a la estrategia "después" y comprueba que el resultado final no tiene duplicados.

```python
def correr(mensajes, caida_en, estrategia):
    procesados, confirmado = [], 0
    for i in range(confirmado, len(mensajes)):
        if estrategia == "antes":
            confirmado = i + 1
            if i == caida_en:
                break                      # se cayó después de confirmar y antes de procesar
            procesados.append(mensajes[i])
        else:
            procesados.append(mensajes[i])
            if i == caida_en:
                break                      # se cayó después de procesar y antes de confirmar
            confirmado = i + 1
    for i in range(confirmado, len(mensajes)):   # el reinicio sigue desde el offset confirmado
        procesados.append(mensajes[i])
    return procesados

msgs = ["e1", "e2", "e3", "e4", "e5"]
print("confirmar antes:  ", correr(msgs, 2, "antes"))
print("confirmar después:", correr(msgs, 2, "despues"))
```

Reto: haz que la caída ocurra varias veces (en los índices 1 y 3) y cuenta cuántos duplicados quedan con cada estrategia.

Documentación oficial: [Semántica de entrega (Kafka)](https://kafka.apache.org/documentation/#semantics) · [Posición del consumidor (Kafka)](https://kafka.apache.org/documentation/#design_consumerposition) · [Guía de Structured Streaming](https://spark.apache.org/docs/latest/structured-streaming-programming-guide.html)
:::

:::errores
- **Confirmar el offset al recibir y no al terminar.** Si el proceso se cae, esos mensajes se pierden.
- **Asumir que no habrá duplicados.** Con "al menos una vez", siempre puede haber.
- **Destinos que no toleran repetidos.** Un `INSERT` simple duplica; un `MERGE` por id no.
- **No monitorear el lag.** Un stream puede estar "funcionando" con horas de atraso.
:::

:::entrevista
**Pregunta:** "¿Cómo garantizas que cada evento se cuente exactamente una vez en la tabla de silver?"

**Respuesta modelo:** "Acepto que la entrega es al menos una vez, porque es lo que puedo garantizar ante caídas, y hago idempotente la escritura: cada evento trae un id único, y en `foreachBatch` deduplico el lote por ese id y hago `MERGE` contra silver insertando solo los que no existen. El checkpoint de Structured Streaming evita reprocesar lotes ya confirmados, y el `MERGE` cubre los reintentos y los duplicados que vengan del productor."
:::

## Ejercicios

:::ejercicio quiz
Un consumidor confirma el offset apenas recibe el mensaje y después lo procesa. Se cae mientras procesa. ¿Qué pasa con ese mensaje al reiniciar?
- [ ] Se vuelve a procesar
- [x] Se pierde: el offset ya dice que fue leído
- [ ] Kafka lo detecta y lo reenvía solo
- [ ] Queda en una cola de errores
:::

:::ejercicio python dificultad=Avanzado titulo="Calcular el lag de un grupo"
Escribe `lag(fin, confirmados)`. `fin` es `{particion: último offset + 1}` (el offset del próximo mensaje que se va a escribir) y `confirmados` es `{particion: offset confirmado del grupo}`; si una partición no tiene offset confirmado, el grupo todavía no leyó nada (lag igual a `fin`). Devuelve `{"por_particion": {p: lag}, "total": suma}`.
```python inicial
def lag(fin, confirmados):
    pass
```
```python solucion
def lag(fin, confirmados):
    por = {p: f - confirmados.get(p, 0) for p, f in fin.items()}
    return {"por_particion": por, "total": sum(por.values())}
```
```pista
Para cada partición de `fin`, el lag es `fin[p] - confirmados.get(p, 0)`.
```
```python test
r = lag({0: 1000, 1: 980, 2: 1500}, {0: 990, 1: 980, 2: 700})
assert r == {"por_particion": {0: 10, 1: 0, 2: 800}, "total": 810}, f"Obtuviste {r}"
assert lag({0: 50}, {}) == {"por_particion": {0: 50}, "total": 50}
assert lag({}, {}) == {"por_particion": {}, "total": 0}
```
:::

:::ejercicio python dificultad=Experto titulo="Simular una caída"
Escribe `correr(mensajes, caida_en, estrategia)` que simule un consumidor: recorre los mensajes en orden y se cae una sola vez al llegar al índice `caida_en`. Con `"antes"`, confirma el offset y después procesa (si se cae, fue entre confirmar y procesar). Con `"despues"`, procesa y después confirma (si se cae, fue entre procesar y confirmar). Al reiniciar, sigue desde el offset confirmado hasta el final. Devuelve la lista de mensajes procesados en orden, contando las dos corridas. Si `caida_en` es `None`, no hay caída.
```python inicial
def correr(mensajes, caida_en, estrategia):
    pass
```
```python solucion
def correr(mensajes, caida_en, estrategia):
    procesados, confirmado = [], 0
    for i in range(len(mensajes)):
        if estrategia == "antes":
            confirmado = i + 1
            if i == caida_en:
                break
            procesados.append(mensajes[i])
        else:
            procesados.append(mensajes[i])
            if i == caida_en:
                break
            confirmado = i + 1
    else:
        return procesados
    return procesados + list(mensajes[confirmado:])
```
```pista
Lleva dos cosas: la lista de procesados y el offset confirmado. Cuando "se cae", corta el bucle; el reinicio procesa `mensajes[confirmado:]`.
```
```pista
Con `"antes"`, la caída deja confirmado `i + 1` sin haber procesado `i`: se pierde. Con `"despues"`, deja procesado `i` con el confirmado todavía en `i`: se repite.
```
```python test
m = ["e1", "e2", "e3", "e4"]
assert correr(m, 1, "antes") == ["e1", "e3", "e4"], f"Obtuviste {correr(m, 1, 'antes')}"
assert correr(m, 1, "despues") == ["e1", "e2", "e2", "e3", "e4"], f"Obtuviste {correr(m, 1, 'despues')}"
assert correr(m, None, "antes") == m and correr(m, None, "despues") == m
assert correr(m, 3, "antes") == ["e1", "e2", "e3"]
```
:::

:::ejercicio python dificultad=Avanzado titulo="Un destino idempotente"
Escribe la clase `Destino` con el método `escribir(lote)`, donde `lote` es una lista de eventos `{"id", ...}`. Guarda cada evento una sola vez por `id` (si un `id` ya fue escrito, en este lote o en uno anterior, se ignora) y devuelve cuántos eventos nuevos escribió. El atributo `filas` es la lista de eventos guardados, en orden de llegada.
```python inicial
class Destino:
    def __init__(self):
        self.filas = []
```
```python solucion
class Destino:
    def __init__(self):
        self.filas = []
        self._vistos = set()

    def escribir(self, lote):
        nuevos = 0
        for e in lote:
            if e["id"] in self._vistos:
                continue
            self._vistos.add(e["id"])
            self.filas.append(e)
            nuevos += 1
        return nuevos
```
```pista
Un conjunto con los ids ya escritos hace que preguntar "¿ya lo guardé?" sea O(1). Es lo que un `MERGE` hace contra la tabla destino.
```
```python test
d = Destino()
assert d.escribir([{"id": 1}, {"id": 2}, {"id": 1}]) == 2
assert d.escribir([{"id": 2}, {"id": 3}]) == 1, "El id 2 ya estaba de un lote anterior"
assert [e["id"] for e in d.filas] == [1, 2, 3]
assert d.escribir([]) == 0
```
:::
