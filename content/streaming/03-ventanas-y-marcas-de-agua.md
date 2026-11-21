---
titulo: Ventanas, tiempo del evento y marcas de agua
nivel: Experto
duracion: 65
resumen: Contar "pedidos por minuto" en un stream parece trivial hasta que los eventos llegan tarde y desordenados. Implementas a mano ventanas fijas, deslizantes y de sesión, y una marca de agua que decide hasta cuándo esperar a los rezagados. Así entiendes qué hace Spark por dentro con window y withWatermark, y el compromiso de fondo - esperar más da resultados más exactos pero más tarde.
objetivos: Asignar un evento a su ventana fija y a sus ventanas deslizantes | Agrupar eventos en sesiones por inactividad | Calcular una marca de agua y decidir qué eventos llegan demasiado tarde | Explicar el compromiso entre latencia y exactitud al elegir el retraso tolerado | Traducir estas ideas a window y withWatermark de Spark
prerrequisitos: streaming-offsets-entrega-y-lag | entrevistas-sql-acumulados-y-retencion
autoevaluacion: ¿A qué ventana de 5 minutos pertenece un evento de las 10:07? | ¿Cuántas ventanas deslizantes de 10 minutos cada 5 contienen un evento? | ¿Cómo se calcula la marca de agua? | ¿Qué pasa con un evento que llega después de que su ventana se cerró?
---

:::analogia En palabras simples
Un profesor recibe exámenes por correo. Puede publicar las notas apenas llega el primero (rápido, pero incompleto) o esperar a que lleguen todos (exacto, pero nunca termina, porque siempre puede faltar alguno). La marca de agua es la regla intermedia: "espero 10 minutos más allá del examen más tardío que vi; lo que llegue después, no entra".
:::

## Tiempo del evento y tiempo de llegada

Un evento tiene la hora en que **ocurrió** (el teléfono registró la compra a las 10:07) y la hora en que **llegó** al sistema (10:09, porque el teléfono estaba sin señal). Las métricas de negocio se calculan con el tiempo del **evento**; si usaras el de llegada, una caída de la red movería ventas de un minuto a otro.

## Tres tipos de ventana

| Ventana | Cómo es | Un evento cae en… | Ejemplo |
|---|---|---|---|
| **Fija** (tumbling) | Bloques de igual tamaño, sin superponerse | Exactamente una | Pedidos por cada 5 minutos |
| **Deslizante** (sliding) | Tamaño fijo, avanzan en pasos más chicos | Varias (tamaño / paso) | Promedio de los últimos 10 minutos, actualizado cada 5 |
| **Sesión** | Se cierra tras un tiempo sin eventos | Una, que crece mientras sigan llegando eventos | Sesiones de navegación con 30 minutos de inactividad |

Con los tiempos en segundos, la ventana fija de un evento empieza en `ts - ts % tamaño`: con ventanas de 300 segundos, un evento en el segundo 1270 cae en la ventana `[1200, 1500)`.

## La marca de agua

La **marca de agua** es "el tiempo del evento más tardío que vi, menos el retraso que tolero". Una ventana se puede cerrar (y publicar su resultado definitivo) cuando la marca de agua pasa su final; un evento cuyo tiempo es anterior a la marca de agua llega **demasiado tarde** y se descarta ([marcas de agua en Spark](https://spark.apache.org/docs/latest/streaming/apis-on-dataframes-and-datasets.html), [en Databricks](https://docs.databricks.com/aws/en/structured-streaming/watermarks)).

```diagrama
titulo: La marca de agua decide qué evento llega tarde
nodo mx: Evento más tardío visto | icono=reloj | col=0 | fila=0 | color=azul | sub=10:07:30
nodo r: Retraso tolerado | icono=calendario | col=0 | fila=1 | color=gris | sub=2 minutos
nodo m: Marca de agua | icono=engranaje | col=1 | fila=0 | color=violeta | sub=10:07:30 − 2 min = 10:05:30
nodo e1: Evento de las 10:06 | icono=check | col=2 | fila=0 | color=verde | sub=posterior a la marca: entra
nodo e2: Evento de las 10:04 | icono=x | col=2 | fila=1 | color=rojo | sub=anterior a la marca: tardío, se descarta
flecha mx -> m
flecha r -> m
flecha m -> e1
flecha m -> e2
```

| Retraso tolerado | Ventaja | Costo |
|---|---|---|
| Corto (1 minuto) | Resultados casi en tiempo real; poco estado en memoria | Se descartan más eventos tardíos |
| Largo (2 horas) | Casi nada se descarta | Resultados finales tarde; mucho estado en memoria |

```python norun
from pyspark.sql import functions as F

por_ventana = (eventos
    .withWatermark("ts_evento", "10 minutes")
    .groupBy(F.window("ts_evento", "5 minutes"), "canal")
    .count())
```

:::cuidado Los descartados no desaparecen del negocio
Un evento tardío descartado por el stream sigue siendo una venta real. El patrón habitual: el stream da la cifra rápida (para un tablero en vivo) y un proceso batch al día siguiente recalcula la cifra **oficial** con todos los eventos, incluidos los tardíos. Es la idea detrás de Lambda, que viste en Arquitectura.
:::

:::practica python Una marca de agua en acción
1. Ejecuta: los eventos llegan desordenados; la marca de agua avanza con el evento más tardío visto y descarta los que quedan por detrás.
2. Mira qué eventos se descartan con un retraso de 60 segundos.
3. Cambia el retraso a 300 segundos: ¿se descarta menos? ¿Qué te cuesta?

```python
def procesar(llegadas, tamano, retraso):
    conteos, descartados, max_visto = {}, [], None
    for ts in llegadas:                                  # en orden de llegada
        marca = None if max_visto is None else max_visto - retraso
        if marca is not None and ts < marca:
            descartados.append(ts)
            continue
        inicio = ts - ts % tamano
        conteos[inicio] = conteos.get(inicio, 0) + 1
        max_visto = ts if max_visto is None else max(max_visto, ts)
    return conteos, descartados

llegadas = [10, 70, 65, 130, 20, 190, 250, 140, 30]    # segundos del evento, en orden de llegada
conteos, tarde = procesar(llegadas, tamano=60, retraso=60)
print("por ventana:", dict(sorted(conteos.items())))
print("descartados por tardíos:", tarde)
```

Reto: agrega la regla de "cerrar" una ventana: cuando la marca de agua pasa el final de una ventana, imprime su resultado definitivo una sola vez.

Documentación oficial: [Ventanas y marcas de agua en Structured Streaming](https://spark.apache.org/docs/latest/streaming/apis-on-dataframes-and-datasets.html) · [Marcas de agua en Databricks](https://docs.databricks.com/aws/en/structured-streaming/watermarks)
:::

:::errores
- **Agrupar por tiempo de llegada.** Las métricas se mueven cuando la red falla.
- **Agregaciones sin marca de agua.** El estado crece sin límite hasta quedarse sin memoria.
- **Un retraso elegido al azar.** Mide cuánto tardan en llegar los eventos (por ejemplo, el percentil 99) y elige a partir de eso.
- **Creer que lo descartado no importa.** Recalcula la cifra oficial en batch.
:::

:::entrevista
**Pregunta:** "¿Cómo elegirías el retraso de la marca de agua para el tablero de ventas en vivo?"

**Respuesta modelo:** "Mediría la diferencia entre tiempo de llegada y tiempo del evento en los datos históricos: si el 99,5 % llega en menos de 3 minutos, uso 5 minutos de retraso. Así el tablero se actualiza casi en vivo y descarta muy poco. Monitoreo cuántos eventos se descartan y, para la cifra oficial, el batch nocturno recalcula con todos. Si el negocio necesita exactitud total en tiempo real, el retraso tiene que crecer, y eso se discute con ellos porque cuesta latencia y memoria."
:::

## Ejercicios

:::ejercicio quiz
Con ventanas fijas de 5 minutos que empiezan en minutos múltiplos de 5, ¿en qué ventana cae un evento ocurrido a las 10:07:30?
- [ ] 10:05 a 10:15
- [x] 10:05 a 10:10
- [ ] 10:07 a 10:12
- [ ] 10:00 a 10:05
:::

:::ejercicio python dificultad=Avanzado titulo="Ventanas deslizantes de un evento"
Escribe `ventanas(ts, tamano, paso)` que devuelva, ordenados, los inicios de todas las ventanas deslizantes que contienen el instante `ts`. Las ventanas empiezan en múltiplos de `paso` (0, paso, 2·paso…) y una ventana que empieza en `i` contiene los instantes `i <= ts < i + tamano`. Solo inicios mayores o iguales a 0.
```python inicial
def ventanas(ts, tamano, paso):
    pass
```
```python solucion
def ventanas(ts, tamano, paso):
    ultimo = ts - ts % paso
    res = []
    i = ultimo
    while i >= 0 and i + tamano > ts:
        res.append(i)
        i -= paso
    return sorted(res)
```
```pista
La última ventana que contiene `ts` empieza en `ts - ts % paso`. Desde ahí, ve restando `paso` mientras la ventana todavía llegue a cubrir `ts`.
```
```python test
assert ventanas(370, 600, 300) == [0, 300], f"Obtuviste {ventanas(370, 600, 300)}"
assert ventanas(600, 600, 300) == [300, 600]
assert ventanas(1270, 300, 300) == [1200], "Si tamaño = paso, es una ventana fija"
assert ventanas(50, 600, 300) == [0]
assert ventanas(900, 900, 300) == [300, 600, 900]
```
:::

:::ejercicio python dificultad=Experto titulo="Contar con marca de agua"
Escribe `procesar(llegadas, tamano, retraso)`. `llegadas` son los tiempos de evento (enteros, en segundos) **en el orden en que llegan**. Para cada evento: la marca de agua es el máximo tiempo de evento visto **antes** de él menos `retraso` (no hay marca antes del primer evento); si el evento es anterior a la marca, se descarta; si no, se cuenta en su ventana fija (`ts - ts % tamano`). Devuelve `(conteos, descartados)`: un diccionario `{inicio_ventana: cantidad}` y la lista de tiempos descartados en orden de llegada.
```python inicial
def procesar(llegadas, tamano, retraso):
    pass
```
```python solucion
def procesar(llegadas, tamano, retraso):
    conteos, descartados, max_visto = {}, [], None
    for ts in llegadas:
        if max_visto is not None and ts < max_visto - retraso:
            descartados.append(ts)
            continue
        inicio = ts - ts % tamano
        conteos[inicio] = conteos.get(inicio, 0) + 1
        max_visto = ts if max_visto is None else max(max_visto, ts)
    return conteos, descartados
```
```pista
Guarda el máximo tiempo visto. Antes de contar cada evento, compáralo con `max_visto - retraso`.
```
```pista
Un evento descartado no actualiza el máximo visto (y tampoco podría subirlo, porque es más viejo).
```
```python test
c, d = procesar([10, 70, 65, 130, 20, 190, 250, 140, 30], 60, 60)
assert d == [20, 140, 30], f"Descartados: {d}"
assert c == {0: 1, 60: 2, 120: 1, 180: 1, 240: 1}, f"Conteos: {c}"
c, d = procesar([10, 70, 65, 130, 20, 190, 250, 140, 30], 60, 300)
assert d == [] and sum(c.values()) == 9, "Con un retraso largo no se descarta nada"
assert procesar([], 60, 10) == ({}, [])
```
:::

:::ejercicio python dificultad=Avanzado titulo="Sesiones por inactividad"
Escribe `sesiones(tiempos, gap)` que reciba los tiempos de evento de un usuario (desordenados) y devuelva la lista de sesiones como tuplas `(inicio, fin, eventos)`, en orden. Una sesión nueva empieza cuando pasaron **más de** `gap` segundos desde el evento anterior.
```python inicial
def sesiones(tiempos, gap):
    pass
```
```python solucion
def sesiones(tiempos, gap):
    res = []
    for t in sorted(tiempos):
        if res and t - res[-1][1] <= gap:
            inicio, _, n = res[-1]
            res[-1] = (inicio, t, n + 1)
        else:
            res.append((t, t, 1))
    return res
```
```pista
Ordena los tiempos. Si el evento está a `gap` o menos del final de la sesión actual, la extiende; si no, abre una nueva.
```
```python test
assert sesiones([100, 400, 150, 3000, 3100, 5000], 1800) == [(100, 400, 3), (3000, 3100, 2), (5000, 5000, 1)], f"Obtuviste {sesiones([100, 400, 150, 3000, 3100, 5000], 1800)}"
assert sesiones([0, 1800, 3601], 1800) == [(0, 1800, 2), (3601, 3601, 1)], "Exactamente gap sigue en la misma sesión"
assert sesiones([], 60) == []
```
:::
