---
titulo: Python de entrevista 2 - procesar datos reales sin pandas
nivel: Experto
duracion: 75
resumen: En las entrevistas de ingeniería de datos el problema de Python casi nunca es abstracto - es un log que hay que resumir, eventos que se superponen, dos fotos de una tabla que hay que comparar, fechas que faltan o registros que hay que validar. Resuelves cada uno con Python puro (sin pandas), como piden muchas entrevistas, y aprendes a manejar líneas mal formadas en lugar de romperte con ellas.
objetivos: Parsear líneas de log tolerando las mal formadas | Calcular superposiciones de intervalos con un barrido de eventos | Comparar dos snapshots y clasificar insertados, borrados y modificados (la base del CDC) | Detectar fechas faltantes con datetime | Validar registros separando los buenos de los rechazados con su motivo | Procesar datos en lotes con generadores sin cargar todo en memoria
prerrequisitos: entrevistas-python-estructuras-de-datos | python-archivos-modulos | python-python-avanzado
autoevaluacion: ¿Qué haces con una línea de log que no tiene el formato esperado? | ¿Cómo calculas cuántos intervalos se superponen como máximo sin compararlos todos contra todos? | ¿Cómo detectas que un registro cambió entre dos fotos de una tabla? | ¿Por qué un generador permite procesar archivos más grandes que la memoria?
---

:::analogia En palabras simples
Los datos reales llegan como la correspondencia de una oficina: la mayoría de las cartas están bien, algunas tienen la dirección incompleta y otras llegan repetidas. Un buen proceso no se detiene en la primera carta rara: la **aparta con una nota** ("falta el código postal") y sigue con las demás.
:::

## Regla número uno: no romperse con un dato malo

En una entrevista, cuando el enunciado dice "procesa este archivo", pregunta qué hacer con las líneas mal formadas. La respuesta habitual en producción: **contarlas o apartarlas** (cuarentena) y seguir. Un `try/except` alrededor de cada línea, no alrededor de todo el archivo.

```python
lineas = [
    "2024-05-01T10:00:01 GET /api/pedidos 200 35",
    "2024-05-01T10:00:02 GET /api/pedidos 503 1200",
    "línea cortada",
    "2024-05-01T10:00:03 POST /api/pagos 201 80",
    "2024-05-01T10:00:04 GET /api/pedidos abc 10",
]

resumen, malas = {}, 0
for linea in lineas:
    partes = linea.split()
    try:
        _, metodo, ruta, estado, ms = partes
        estado = int(estado)
    except ValueError:
        malas += 1
        continue
    total, errores = resumen.get(ruta, (0, 0))
    resumen[ruta] = (total + 1, errores + (1 if estado >= 500 else 0))

print(resumen)                  # {'/api/pedidos': (2, 1), '/api/pagos': (1, 0)}
print("líneas descartadas:", malas)  # 2
```

`_, metodo, ruta, estado, ms = partes` lanza `ValueError` si la línea no tiene exactamente 5 partes, e `int("abc")` también: un solo `except` cubre los dos casos.

## Intervalos: el barrido de eventos

"¿Cuál es la mayor cantidad de usuarios conectados al mismo tiempo?" Comparar cada sesión con todas las demás es O(n²). El truco: convertir cada intervalo en **dos eventos** (entra +1, sale −1), ordenarlos por tiempo y llevar la cuenta. O(n log n) por el ordenamiento.

| tiempo | evento | conectados |
|---|---|---|
| 1 | entra | 1 |
| 2 | entra | 2 |
| 4 | sale | 1 |
| 4 | entra | 2 |
| 5 | sale | 1 |

:::cuidado ¿Qué pasa en el mismo instante?
Si una sesión termina a las 4 y otra empieza a las 4, ¿se superponen? Depende de si el fin es **inclusivo o exclusivo**. Acláralo en la entrevista. Con fin exclusivo, ordena las salidas antes que las entradas en el mismo instante: en Python, ordenar las tuplas `(tiempo, -1)` y `(tiempo, +1)` ya pone `-1` primero.
:::

## Comparar dos fotos: la base del CDC

Cuando un sistema de origen no avisa qué cambió, se compara la foto de hoy con la de ayer por una **clave**. Pasar cada foto a un diccionario `clave -> fila` hace que todo sea O(n):

| Caso | Condición |
|---|---|
| Insertado | La clave está hoy y no ayer |
| Borrado | La clave estaba ayer y no hoy |
| Modificado | Está en las dos y la fila es distinta |

Es lo mismo que hace un `MERGE` o el Change Data Feed de Delta Lake, pero a mano.

## Fechas y generadores

- `datetime.date.fromisoformat("2024-05-01")` convierte un texto ISO en fecha, y `fecha + timedelta(days=1)` avanza un día ([documentación de datetime](https://docs.python.org/3/library/datetime.html)).
- Un **generador** (`yield`) entrega los elementos de a uno: puedes procesar un archivo de 50 GB línea por línea sin cargarlo entero ([documentación de generadores](https://docs.python.org/3/howto/functional.html#generators)).

:::practica python Un resumen de log que no se rompe
1. Ejecuta: el código resume un log con líneas buenas y malas, y cuenta las descartadas.
2. Agrega una línea nueva con 6 partes y comprueba que se descarta sin romper el programa.
3. Calcula, para cada ruta, la **tasa de error** en porcentaje con un decimal.

```python
lineas = [
    "2024-05-01T10:00:01 GET /api/pedidos 200 35",
    "2024-05-01T10:00:02 GET /api/pedidos 503 1200",
    "línea cortada",
    "2024-05-01T10:00:03 POST /api/pagos 201 80",
    "2024-05-01T10:00:04 GET /api/pedidos abc 10",
    "2024-05-01T10:00:05 GET /api/clientes 500 900",
]

resumen, malas = {}, []
for n, linea in enumerate(lineas, start=1):
    try:
        _, metodo, ruta, estado, ms = linea.split()
        estado, ms = int(estado), int(ms)
    except ValueError as e:
        malas.append((n, str(e)))
        continue
    total, errores = resumen.get(ruta, (0, 0))
    resumen[ruta] = (total + 1, errores + (estado >= 500))

for ruta, (total, errores) in sorted(resumen.items()):
    print(f"{ruta:15} total={total} errores={errores}")
print("descartadas:", malas)
```

Reto: guarda también el tiempo de respuesta y calcula el percentil 95 de `ms` por ruta (pista: ordena la lista y toma la posición `int(0.95 * (len - 1))`).

Documentación oficial: [str.split](https://docs.python.org/3/library/stdtypes.html#str.split) · [Errores y excepciones](https://docs.python.org/3/tutorial/errors.html) · [datetime](https://docs.python.org/3/library/datetime.html)
:::

:::errores
- **Un `try` alrededor de todo el archivo.** La primera línea mala detiene el proceso entero.
- **Silenciar errores sin contarlos.** Descartar está bien; descartar sin saber cuántos, no.
- **Comparar fotos con dos bucles anidados.** Pasa cada foto a un diccionario por clave.
- **Cargar todo en una lista "por las dudas".** Si solo recorres una vez, un generador alcanza.
:::

:::entrevista
**Pregunta:** "Tu comparación de snapshots funciona con 10.000 filas. ¿Y con 300 millones?"

**Respuesta modelo:** "No entran en memoria de una máquina. Lo haría con Spark: un `full outer join` de las dos fotos por la clave, y una columna que clasifique: clave solo a la izquierda es borrado, solo a la derecha insertado, en ambas con un hash de las columnas distinto es modificado. Comparar un hash (por ejemplo `sha2` de las columnas concatenadas) es más barato que comparar columna por columna."
:::

## Ejercicios

:::ejercicio python dificultad=Avanzado titulo="Errores por ruta en un log"
Escribe `errores_por_ruta(lineas)`. Cada línea válida tiene 5 partes separadas por espacios: `timestamp metodo ruta estado ms`, con `estado` y `ms` enteros. Devuelve un diccionario `{ruta: (total, errores)}` donde `errores` cuenta las respuestas con estado **500 o más**. Las líneas mal formadas (otra cantidad de partes, o `estado`/`ms` que no son enteros) se ignoran.
```python inicial
def errores_por_ruta(lineas):
    pass
```
```python solucion
def errores_por_ruta(lineas):
    res = {}
    for linea in lineas:
        try:
            _, metodo, ruta, estado, ms = linea.split()
            estado, ms = int(estado), int(ms)
        except ValueError:
            continue
        total, errores = res.get(ruta, (0, 0))
        res[ruta] = (total + 1, errores + (1 if estado >= 500 else 0))
    return res
```
```pista
`_, metodo, ruta, estado, ms = linea.split()` falla con `ValueError` si no hay exactamente 5 partes, igual que `int("abc")`. Atrapa ese error y sigue con la próxima línea.
```
```python test
log = [
    "t1 GET /a 200 10", "t2 GET /a 500 30", "t3 GET /b 404 5",
    "roto", "t4 GET /a x 1", "t5 GET /b 503 9 extra", "t6 POST /b 502 7",
]
r = errores_por_ruta(log)
assert r == {"/a": (2, 1), "/b": (2, 1)}, f"Obtuviste {r}"
assert errores_por_ruta([]) == {}
```
:::

:::ejercicio python dificultad=Experto titulo="Máximo de sesiones simultáneas"
Escribe `max_simultaneas(sesiones)` donde cada sesión es una tupla `(inicio, fin)` de enteros, con el **fin exclusivo** (una sesión `(1, 4)` y otra `(4, 6)` **no** se superponen). Devuelve la mayor cantidad de sesiones activas al mismo tiempo. Debe ser O(n log n).
```python inicial
def max_simultaneas(sesiones):
    pass
```
```python solucion
def max_simultaneas(sesiones):
    eventos = []
    for ini, fin in sesiones:
        eventos.append((ini, 1))
        eventos.append((fin, -1))
    eventos.sort()
    activas = mejor = 0
    for _, delta in eventos:
        activas += delta
        mejor = max(mejor, activas)
    return mejor
```
```pista
Convierte cada sesión en dos eventos: `(inicio, +1)` y `(fin, -1)`. Ordénalos y recórrelos sumando.
```
```pista
Con fin exclusivo, en el mismo instante la salida debe procesarse antes que la entrada. Al ordenar tuplas, `(4, -1)` va antes que `(4, 1)`: ya sale bien.
```
```python test
assert max_simultaneas([(1, 4), (2, 5), (4, 6)]) == 2, f"Obtuviste {max_simultaneas([(1, 4), (2, 5), (4, 6)])}"
assert max_simultaneas([(1, 4), (4, 6)]) == 1
assert max_simultaneas([(1, 10), (2, 3), (2, 4), (3, 5)]) == 3
assert max_simultaneas([(1, 10), (2, 6), (3, 7), (4, 5)]) == 4
assert max_simultaneas([]) == 0
```
:::

:::ejercicio python dificultad=Experto titulo="Diferencias entre dos fotos de una tabla"
Escribe `diferencias(antes, despues, clave)`. `antes` y `despues` son listas de diccionarios (filas) y `clave` es el nombre de la columna que identifica cada fila. Devuelve un diccionario con tres listas **ordenadas** de claves: `"insertados"`, `"borrados"` y `"modificados"` (presentes en las dos fotos con algún valor distinto).
```python inicial
def diferencias(antes, despues, clave):
    pass
```
```python solucion
def diferencias(antes, despues, clave):
    a = {f[clave]: f for f in antes}
    d = {f[clave]: f for f in despues}
    return {
        "insertados": sorted(k for k in d if k not in a),
        "borrados": sorted(k for k in a if k not in d),
        "modificados": sorted(k for k in d if k in a and d[k] != a[k]),
    }
```
```pista
Pasa cada foto a un diccionario `{clave: fila}`. Así preguntar "¿estaba ayer?" es O(1).
```
```pista
Dos diccionarios de Python se comparan valor por valor con `!=`: si alguna columna cambió, son distintos.
```
```python test
antes = [{"id": 1, "ciudad": "Lima"}, {"id": 2, "ciudad": "Quito"}, {"id": 3, "ciudad": "Cali"}]
despues = [{"id": 1, "ciudad": "Lima"}, {"id": 3, "ciudad": "Bogotá"}, {"id": 4, "ciudad": "La Paz"}]
r = diferencias(antes, despues, "id")
assert r == {"insertados": [4], "borrados": [2], "modificados": [3]}, f"Obtuviste {r}"
assert diferencias([], [], "id") == {"insertados": [], "borrados": [], "modificados": []}
```
:::

:::ejercicio python dificultad=Avanzado titulo="Fechas que faltan en una serie"
Escribe `fechas_faltantes(fechas)` que reciba textos `AAAA-MM-DD` (desordenados y quizá repetidos) y devuelva, ordenadas y como texto, las fechas que faltan entre la menor y la mayor. Con una lista vacía devuelve `[]`.
```python inicial
from datetime import date, timedelta

def fechas_faltantes(fechas):
    pass
```
```python solucion
from datetime import date, timedelta

def fechas_faltantes(fechas):
    if not fechas:
        return []
    presentes = {date.fromisoformat(f) for f in fechas}
    d, fin = min(presentes), max(presentes)
    faltan = []
    while d <= fin:
        if d not in presentes:
            faltan.append(d.isoformat())
        d += timedelta(days=1)
    return faltan
```
```pista
Convierte a un **conjunto** de fechas con `date.fromisoformat`: así quitas repetidos y preguntar "¿está?" es O(1).
```
```pista
Recorre día por día desde el mínimo hasta el máximo con `timedelta(days=1)` y guarda los que no están.
```
```python test
r = fechas_faltantes(["2024-03-03", "2024-02-28", "2024-03-01", "2024-03-01"])
assert r == ["2024-02-29"] + ["2024-03-02"], f"Obtuviste {r}"
assert fechas_faltantes([]) == []
assert fechas_faltantes(["2024-01-01"]) == []
```
:::

:::ejercicio python dificultad=Avanzado titulo="Validar registros con motivo de rechazo"
Escribe `validar(registros)` que reciba una lista de diccionarios y devuelva una tupla `(validos, rechazados)`. Un registro es válido si: tiene `id` entero, `email` con un `@`, y `monto` numérico (`int` o `float`) mayor o igual a 0. `rechazados` es una lista de tuplas `(registro, motivo)` con el **primer** motivo que falla, en este orden: `"id"`, `"email"`, `"monto"`.
```python inicial
def validar(registros):
    pass
```
```python solucion
def validar(registros):
    validos, rechazados = [], []
    for r in registros:
        if not isinstance(r.get("id"), int):
            rechazados.append((r, "id"))
        elif "@" not in str(r.get("email") or ""):
            rechazados.append((r, "email"))
        elif not isinstance(r.get("monto"), (int, float)) or r["monto"] < 0:
            rechazados.append((r, "monto"))
        else:
            validos.append(r)
    return validos, rechazados
```
```pista
Revisa las reglas **en orden** con `if / elif / else`: el primer `if` que falla define el motivo.
```
```pista
`r.get("campo")` devuelve `None` si falta, sin error. `isinstance(x, (int, float))` acepta los dos tipos.
```
```python test
regs = [
    {"id": 1, "email": "a@x.com", "monto": 10},
    {"id": "2", "email": "b@x.com", "monto": 5},
    {"id": 3, "email": "sin-arroba", "monto": 5},
    {"id": 4, "email": "d@x.com", "monto": -1},
    {"id": 5, "email": "e@x.com"},
    {"id": 6, "email": "f@x.com", "monto": 0.5},
]
v, r = validar(regs)
assert [x["id"] for x in v] == [1, 6], f"Válidos: {[x['id'] for x in v]}"
assert [m for _, m in r] == ["id", "email", "monto", "monto"], f"Motivos: {[m for _, m in r]}"
```
:::

:::ejercicio python dificultad=Avanzado titulo="Procesar en lotes con un generador"
Escribe el generador `en_lotes(iterable, n)` que entregue listas de `n` elementos (la última puede ser más corta). Debe funcionar con **cualquier iterable**, incluso un generador infinito o uno que no tiene `len()`: no conviertas todo a lista.
```python inicial
def en_lotes(iterable, n):
    pass
```
```python solucion
def en_lotes(iterable, n):
    lote = []
    for x in iterable:
        lote.append(x)
        if len(lote) == n:
            yield lote
            lote = []
    if lote:
        yield lote
```
```pista
Ve juntando elementos en una lista; cuando llega a `n`, haz `yield` y empieza una lista nueva.
```
```pista
Al terminar el recorrido, si quedó algo en la lista, entrégalo también.
```
```python test
assert list(en_lotes(range(5), 2)) == [[0, 1], [2, 3], [4]], f"Obtuviste {list(en_lotes(range(5), 2))}"
assert list(en_lotes([], 3)) == []
import itertools
infinito = itertools.count()
g = en_lotes(infinito, 3)
assert next(g) == [0, 1, 2] and next(g) == [3, 4, 5]
assert list(en_lotes((x for x in "abc"), 5)) == [["a", "b", "c"]]
```
:::
