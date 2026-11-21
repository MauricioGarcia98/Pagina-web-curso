---
titulo: Python de entrevista 1 - diccionarios, conjuntos, pilas y ventanas
nivel: Avanzado
duracion: 70
resumen: Los problemas de programación que más se preguntan en entrevistas de datos no piden algoritmos raros - piden elegir la estructura correcta. Con un diccionario cuentas y agrupas en una pasada, con un conjunto preguntas "¿ya lo vi?" al instante, con una pila validas lo que se abre y se cierra, y con dos punteros recorres una ventana sin repetir trabajo. Aprendes a decir la complejidad de cada solución.
objetivos: Elegir entre lista, diccionario, conjunto y pila según la operación que más se repite | Resolver en una sola pasada (O(n)) problemas que a primera vista piden dos bucles anidados | Explicar la complejidad en tiempo y memoria con notación O grande | Escribir casos de prueba con casos borde antes de dar la solución por terminada
prerrequisitos: entrevistas-como-es-una-entrevista | python-diccionarios | logica-patrones
autoevaluacion: ¿Cuánto tarda buscar un elemento en una lista y en un conjunto? | ¿Cuándo una pila es la estructura natural? | ¿Qué es una ventana deslizante y qué problema evita? | ¿Puedes decir la complejidad de tu solución sin dudar?
---

:::analogia En palabras simples
Buscar un nombre en una lista es como buscar a alguien en una fila caminando de punta a punta: cuanto más larga la fila, más tardas. Un diccionario o un conjunto es como una guía con el índice alfabético: vas directo a la página. Casi todos los problemas de entrevista se resuelven cambiando "recorrer la fila" por "ir al índice".
:::

## La tabla que tienes que saber de memoria

| Operación | Lista | Conjunto (`set`) | Diccionario (`dict`) |
|---|---|---|---|
| ¿Está `x`? | O(n): recorre todo | O(1) en promedio | O(1) por clave |
| Agregar al final | O(1) | O(1) | O(1) |
| Contar apariciones | O(n) cada vez | — | O(1) por elemento con un contador |
| Mantener orden de llegada | Sí | No | Sí (desde Python 3.7) |

**O(n)** quiere decir "el tiempo crece en proporción a la cantidad de datos". **O(n²)** quiere decir que si duplicas los datos, el tiempo se multiplica por cuatro: con un millón de filas, eso es la diferencia entre un segundo y una semana.

:::nota De la documentación oficial
La [guía de complejidad de Python](https://wiki.python.org/moin/TimeComplexity) lista el costo de cada operación de las estructuras incorporadas. `collections.Counter` y `collections.defaultdict` ([documentación](https://docs.python.org/3/library/collections.html)) ahorran código al contar y agrupar.
:::

## Cuatro patrones que resuelven casi todo

| Patrón | Estructura | Pregunta típica |
|---|---|---|
| **Contar** | `dict` o `Counter` | "El primer carácter que no se repite", "las k palabras más frecuentes" |
| **¿Ya lo vi?** | `set` | "¿Hay duplicados?", "dos números que suman k" |
| **Agrupar por una firma** | `dict` de listas | "Agrupar anagramas", "índice invertido" |
| **Abrir y cerrar** | lista usada como pila | "¿Están balanceados los paréntesis?", "deshacer acciones" |
| **Ventana deslizante** | dos índices + `dict` o `set` | "La subcadena más larga sin repetir", "promedio móvil" |

## Un ejemplo narrado: la mejor ganancia

**Pregunta:** "Te doy los precios de una acción día por día. Comprando una vez y vendiendo después, ¿cuál es la mayor ganancia posible?"

- **Fuerza bruta:** probar todos los pares (compra, venta). Dos bucles: O(n²).
- **Idea:** al recorrer los días, recuerda el **precio más bajo visto hasta ahora**. La mejor venta de hoy es `precio_hoy - minimo`. Una pasada: O(n) en tiempo y O(1) en memoria.

```python
def mejor_ganancia(precios):
    minimo = float("inf")
    mejor = 0
    for p in precios:
        minimo = min(minimo, p)
        mejor = max(mejor, p - minimo)
    return mejor

print(mejor_ganancia([7, 1, 5, 3, 6, 4]))  # 5: compra a 1, vende a 6
print(mejor_ganancia([7, 6, 4, 3, 1]))     # 0: siempre baja, no conviene operar
```

:::cuidado Olvidar el caso vacío o de un elemento
Con `[]` o `[5]` no hay operación posible: la respuesta debe ser `0`, no un error. Antes de decir "listo", prueba siempre: lista vacía, un elemento, todos iguales y el orden inverso.
:::

:::practica python De O(n²) a O(n) midiendo el tiempo
1. Ejecuta: las dos funciones responden lo mismo ("¿hay algún duplicado?"), una con dos bucles y otra con un conjunto.
2. Mira los tiempos impresos: con 2.000 elementos la diferencia ya se nota.
3. Duplica `n` y vuelve a ejecutar: la versión con bucles tarda unas cuatro veces más; la del conjunto, unas dos.

```python
import time

def hay_duplicados_lento(xs):
    for i in range(len(xs)):
        for j in range(i + 1, len(xs)):
            if xs[i] == xs[j]:
                return True
    return False

def hay_duplicados_rapido(xs):
    vistos = set()
    for x in xs:
        if x in vistos:
            return True
        vistos.add(x)
    return False

n = 2000
datos = list(range(n))  # sin duplicados: el peor caso, hay que mirar todo
for f in (hay_duplicados_lento, hay_duplicados_rapido):
    t = time.perf_counter()
    r = f(datos)
    print(f"{f.__name__:24} -> {r}  {time.perf_counter() - t:.4f} s")
```

Reto: escribe una tercera versión de una línea con `len(set(xs)) != len(xs)` y explica por qué es O(n) pero siempre recorre toda la lista, aunque el duplicado esté al principio.

Documentación oficial: [set](https://docs.python.org/3/library/stdtypes.html#set-types-set-frozenset) · [dict](https://docs.python.org/3/library/stdtypes.html#mapping-types-dict) · [collections](https://docs.python.org/3/library/collections.html)
:::

:::errores
- **Buscar con `in` dentro de una lista dentro de un bucle.** Es O(n²) disfrazado: convierte la lista a `set` antes.
- **Modificar una lista mientras la recorres.** Recorre una copia o construye una lista nueva.
- **Usar un `dict` cuando el orden de salida importa y no lo dices.** Si la respuesta debe estar ordenada, ordénala explícitamente con `sorted`.
- **No decir la complejidad.** Siempre cierra con "esto es O(n) en tiempo y O(k) en memoria porque…".
:::

:::entrevista
**Pregunta:** "Tu solución usa un diccionario con todas las palabras. ¿Y si el archivo tiene 200 GB y no entra en memoria?"

**Respuesta modelo:** "Leería el archivo por partes, en streaming, y contaría por bloques. Si ni siquiera el diccionario de conteos entra, particionaría por el hash de la palabra en varios archivos y contaría cada uno por separado: todas las apariciones de una palabra caen en el mismo archivo. Es exactamente lo que hace Spark con `groupBy`: un shuffle por hash de la clave."
:::

## Ejercicios

:::ejercicio python dificultad=Avanzado titulo="El primer carácter que no se repite"
Escribe `primer_unico(texto)` que devuelva el **primer carácter** que aparece una sola vez en `texto`. Si no hay ninguno, devuelve `None`. Distingue mayúsculas de minúsculas. Debe ser O(n).
```python inicial
def primer_unico(texto):
    pass
```
```python solucion
def primer_unico(texto):
    conteo = {}
    for c in texto:
        conteo[c] = conteo.get(c, 0) + 1
    for c in texto:
        if conteo[c] == 1:
            return c
    return None
```
```pista
Dos pasadas: la primera cuenta cada carácter en un diccionario; la segunda recorre el texto **en orden** y devuelve el primero con conteo 1.
```
```python test
assert primer_unico("datadog") == "t", f"Obtuviste {primer_unico('datadog')!r}"
assert primer_unico("aabb") is None
assert primer_unico("") is None
assert primer_unico("aA") == "a"
assert primer_unico("xyzx") == "y"
```
:::

:::ejercicio python dificultad=Avanzado titulo="Agrupar anagramas"
Escribe `agrupar_anagramas(palabras)` que agrupe las palabras que son anagramas entre sí (mismas letras en otro orden). Devuelve una lista de grupos; cada grupo ordenado alfabéticamente y la lista de grupos ordenada por su primera palabra.
```python inicial
def agrupar_anagramas(palabras):
    pass
```
```python solucion
def agrupar_anagramas(palabras):
    grupos = {}
    for p in palabras:
        firma = "".join(sorted(p))
        grupos.setdefault(firma, []).append(p)
    return sorted(sorted(g) for g in grupos.values())
```
```pista
Dos anagramas tienen la misma **firma** si ordenas sus letras: `"".join(sorted("roma")) == "amor"`.
```
```pista
Usa un diccionario `firma -> lista de palabras`. Al final ordena cada grupo y la lista de grupos.
```
```python test
r = agrupar_anagramas(["roma", "amor", "mora", "sol", "los", "dato"])
assert r == [["amor", "mora", "roma"], ["dato"], ["los", "sol"]], f"Obtuviste {r}"
assert agrupar_anagramas([]) == []
assert agrupar_anagramas(["a", "a"]) == [["a", "a"]]
```
:::

:::ejercicio python dificultad=Avanzado titulo="Paréntesis balanceados"
Escribe `balanceado(s)` que devuelva `True` si los símbolos `()`, `[]` y `{}` de `s` están bien abiertos y cerrados (en el orden correcto), ignorando cualquier otro carácter. Por ejemplo, una expresión SQL o un JSON.
```python inicial
def balanceado(s):
    pass
```
```python solucion
def balanceado(s):
    pares = {")": "(", "]": "[", "}": "{"}
    pila = []
    for c in s:
        if c in "([{":
            pila.append(c)
        elif c in pares:
            if not pila or pila.pop() != pares[c]:
                return False
    return not pila
```
```pista
Usa una lista como pila: cuando aparece un símbolo que abre, lo apilas; cuando aparece uno que cierra, el tope de la pila debe ser su pareja.
```
```pista
Al final la pila debe quedar vacía: `([]` tiene un `(` sin cerrar.
```
```python test
assert balanceado("SUM(CASE WHEN x IN (1, 2) THEN 1 END)") is True
assert balanceado('{"a": [1, 2, {"b": 3}]}') is True
assert balanceado("([)]") is False
assert balanceado("((") is False
assert balanceado(")(") is False
assert balanceado("") is True
```
:::

:::ejercicio python dificultad=Experto titulo="La subcadena más larga sin repetir"
Escribe `mas_larga_sin_repetir(s)` que devuelva la **longitud** de la subcadena (caracteres seguidos) más larga de `s` sin caracteres repetidos. Debe ser O(n): nada de probar todas las subcadenas.
```python inicial
def mas_larga_sin_repetir(s):
    pass
```
```python solucion
def mas_larga_sin_repetir(s):
    ultimo = {}
    inicio = 0
    mejor = 0
    for i, c in enumerate(s):
        if c in ultimo and ultimo[c] >= inicio:
            inicio = ultimo[c] + 1
        ultimo[c] = i
        mejor = max(mejor, i - inicio + 1)
    return mejor
```
```pista
Ventana deslizante: `inicio` marca el comienzo de la ventana actual. Guarda en un diccionario la última posición donde viste cada carácter.
```
```pista
Si el carácter actual ya está **dentro** de la ventana (`ultimo[c] >= inicio`), mueve `inicio` a `ultimo[c] + 1`. El largo de la ventana es `i - inicio + 1`.
```
```python test
assert mas_larga_sin_repetir("abcabcbb") == 3, f"Obtuviste {mas_larga_sin_repetir('abcabcbb')}"
assert mas_larga_sin_repetir("bbbb") == 1
assert mas_larga_sin_repetir("") == 0
assert mas_larga_sin_repetir("abba") == 2
assert mas_larga_sin_repetir("pwwkew") == 3
```
:::

:::ejercicio python dificultad=Avanzado titulo="La mejor ganancia con una compra y una venta"
Escribe `mejor_ganancia(precios)` que devuelva la mayor ganancia posible comprando **un día** y vendiendo **un día posterior**. Si no hay ganancia posible (o hay menos de dos precios), devuelve `0`. Debe ser O(n).
```python inicial
def mejor_ganancia(precios):
    pass
```
```python solucion
def mejor_ganancia(precios):
    minimo = float("inf")
    mejor = 0
    for p in precios:
        minimo = min(minimo, p)
        mejor = max(mejor, p - minimo)
    return mejor
```
```pista
Recorre los precios recordando el más bajo visto **hasta ahora**. La mejor venta de cada día es su precio menos ese mínimo.
```
```python test
assert mejor_ganancia([7, 1, 5, 3, 6, 4]) == 5, f"Obtuviste {mejor_ganancia([7, 1, 5, 3, 6, 4])}"
assert mejor_ganancia([7, 6, 4, 3, 1]) == 0
assert mejor_ganancia([]) == 0
assert mejor_ganancia([3]) == 0
assert mejor_ganancia([2, 4, 1, 3]) == 2
```
:::

:::ejercicio python dificultad=Experto titulo="Índice invertido"
Escribe `indice_invertido(docs)` donde `docs` es un diccionario `{id: texto}`. Devuelve un diccionario `{palabra: [ids]}` con cada palabra (en minúsculas) y la lista **ordenada y sin repetidos** de los documentos donde aparece. Las palabras se separan por espacios. Es la estructura que usan los buscadores.
```python inicial
def indice_invertido(docs):
    pass
```
```python solucion
def indice_invertido(docs):
    indice = {}
    for doc_id, texto in docs.items():
        for palabra in texto.lower().split():
            indice.setdefault(palabra, set()).add(doc_id)
    return {p: sorted(ids) for p, ids in indice.items()}
```
```pista
Usa un diccionario de **conjuntos** mientras construyes (así no repites ids) y conviértelo a listas ordenadas al final.
```
```python test
r = indice_invertido({1: "Spark lee datos", 2: "SQL lee tablas", 3: "datos y datos"})
assert r["lee"] == [1, 2], f"Obtuviste {r.get('lee')}"
assert r["datos"] == [1, 3]
assert r["spark"] == [1]
assert "Spark" not in r
assert indice_invertido({}) == {}
```
:::
