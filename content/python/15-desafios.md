---
titulo: Desafíos de Python para entrevistas de datos
nivel: Experto
duracion: 60
resumen: Problemas típicos de entrevistas técnicas resueltos con estructuras de datos.
objetivos: Seguir un método para resolver desafíos: entender, casos borde, solución simple, mejora | Estimar la complejidad de una solución con notación O | Bajar una solución de O(n²) a O(n) usando diccionarios y conjuntos | Explicar en voz alta tu razonamiento como en una entrevista real
prerrequisitos: python-diccionarios | python-python-avanzado
autoevaluacion: ¿Puedes explicar qué significa O(n²) con un ejemplo? | ¿Puedes resolver "dos que suman" en una sola pasada? | ¿Puedes fusionar intervalos superpuestos? | ¿Puedes aplanar un diccionario anidado? | ¿Sabes qué casos borde revisar antes de decir "listo"?
---

<!-- estandar:escenario -->
:::escenario La prueba técnica de Python
En la entrevista para data engineer semi senior, después de SQL viene la parte de Python:

> "Tienes 45 minutos para tres problemas. Puedes elegir el orden. Lo importante es que nos cuentes cómo piensas."

Estos desafíos no buscan algoritmos rebuscados: buscan que manejes bien diccionarios, conjuntos, ordenamiento y casos borde, y que expliques tu razonamiento.
:::
Estos problemas aparecen en entrevistas de **Data Engineer**. No buscan algoritmos rebuscados sino que demuestres que manejas bien diccionarios, conjuntos, ordenamiento, generadores y casos borde.

:::tip En una entrevista, piensa en voz alta
1. Repite el problema y pregunta por los casos borde (¿lista vacía?, ¿empates?, ¿nulos?).
2. Propón una solución simple primero; luego mejora su complejidad.
3. Prueba tu código con un ejemplo pequeño, a mano.
4. Menciona la complejidad: O(n), O(n log n)…
:::

## Complejidad: qué significa O(n)

En las entrevistas te van a preguntar "¿qué complejidad tiene tu solución?". La **notación O grande** describe cómo **crece** el tiempo (o la memoria) cuando crece la cantidad de datos `n`. No mide segundos: mide la **forma** del crecimiento.

| Notación | Nombre | Si los datos se multiplican por 10, el tiempo… | Ejemplo |
|---|---|---|---|
| O(1) | constante | no cambia | Buscar una clave en un `dict` o `set` |
| O(log n) | logarítmica | crece muy poco | Búsqueda binaria en una lista ordenada |
| O(n) | lineal | se multiplica por 10 | Recorrer una lista una vez |
| O(n log n) | "n log n" | algo más de 10 veces | Ordenar con `sorted` |
| O(n²) | cuadrática | se multiplica por **100** | Dos `for` anidados sobre la misma lista |

Con 1.000 elementos, O(n²) son un millón de pasos; con un millón de elementos, un billón: imposible. El truco más frecuente para bajar de O(n²) a O(n) es usar un **diccionario o conjunto** para recordar lo que ya viste, en vez de volver a recorrer la lista. Es exactamente lo que hacen los ejercicios "Dos que suman" y "Join en Python" (y lo que hace un *hash join* en una base de datos).

## Cómo encarar cada desafío

1. **Entender**: lee el enunciado dos veces y escribe un ejemplo chico a mano, con su resultado esperado.
2. **Casos borde**: ¿qué pasa con una lista vacía, un solo elemento, empates, repetidos, `None`? Los tests de cada ejercicio prueban justamente eso.
3. **Primero que funcione**: una solución simple y correcta, aunque no sea la más rápida.
4. **Después, mejorar**: ¿estoy recorriendo dos veces lo mismo? ¿Puedo usar un `dict` o un `set`?

## Ejemplo resuelto: el primer pedido duplicado, de O(n²) a O(n)

**Enunciado**: un sistema reenvía pedidos por error. Dada la lista de `pedido_id` en el orden en que llegaron, devuelve el **primer id que aparece por segunda vez** (o `None` si no hay repetidos).

**Paso 1, entender y preguntar.** "¿'Primero' es el primero en repetirse, o el primero de la lista que tiene un repetido?" Son distintos: en `[7, 3, 5, 3, 7]`, el primero en repetirse es el `3` (su segunda aparición está en la posición 3), aunque el `7` aparezca antes en la lista. Supongamos que piden el primero en repetirse.

**Paso 2, la solución simple.** Para cada elemento, mirar si ya apareció antes:

```python
def primer_repetido_lento(ids):
    for j in range(len(ids)):
        for i in range(j):              # todo lo anterior
            if ids[i] == ids[j]:
                return ids[j]
    return None

print(primer_repetido_lento([7, 3, 5, 3, 7]))   # 3
```

Funciona, pero con dos `for` anidados es **O(n²)**: con un millón de pedidos son medio billón de comparaciones.

**Paso 3, mejorar con un conjunto.** La pregunta "¿ya lo vi?" la responde un `set` en O(1):

```python
def primer_repetido(ids):
    vistos = set()
    for x in ids:
        if x in vistos:                 # búsqueda O(1)
            return x
        vistos.add(x)
    return None

print(primer_repetido([7, 3, 5, 3, 7]))  # 3
print(primer_repetido([1, 2, 3]))        # None
print(primer_repetido([]))               # None: caso borde, lista vacía
```

Una sola pasada: **O(n)** en tiempo y O(n) en memoria. Con un millón de pedidos, un millón de pasos.

**Paso 4, decirlo en voz alta.** "Cambié tiempo por memoria: guardo lo que vi en un conjunto. Es la misma idea que usa una base de datos en un *hash join* o en un `DISTINCT`." Conectar el algoritmo con el trabajo de datos suele sumar puntos. Ahora aplica la misma idea en el primer desafío.

<!-- estandar:trabajo -->
:::trabajo
- Más allá de la entrevista, estas técnicas aparecen en el trabajo: deduplicar con un `set`, unir datos con un `dict` (un join en memoria), fusionar intervalos para calcular sesiones o tiempos de conexión.
- En una entrevista real, preguntar por los casos borde antes de escribir es tan importante como la solución. "¿La lista puede estar vacía? ¿Puede haber empates?" muestra criterio profesional.
:::

```recorrido
titulo: O(n²) contra O(n): contar los pasos
estacion lento: Dos for | icono=reloj
estacion set: Un set | icono=check
estacion escala: Con más datos | icono=capas
estacion idea: La idea | icono=reglas
paso lento: La versión lenta compara contra todo lo anterior
Con `[7, 3, 5, 3, 7]`, para encontrar el 3 repetido hace **5 comparaciones**. En el peor caso (sin repetidos) compara cada par: n × (n − 1) / 2.
>>> texto
j=1 (3): ¿=7?
j=2 (5): ¿=7? ¿=3?
j=3 (3): ¿=7? ¿=3? ✓ → devolver 3
paso set: La versión con set mira una sola vez cada elemento
Para cada elemento, una pregunta: "¿ya está en `vistos`?". Un `set` responde eso de inmediato, sin recorrerlo.
>>> tabla
x,vistos antes,¿está?
7,[],no → agregar
3,[7],no → agregar
5,[3 7],no → agregar
3,[3 5 7],sí → devolver 3
paso escala: La diferencia crece con los datos
Cantidad de pasos en el peor caso, sin repetidos:
>>> tabla
pedidos,dos for (n²/2),con set (n)
10,45,10
1.000,499.500,1.000
1.000.000,499.999.500.000,1.000.000
paso idea: Cambiar tiempo por memoria
El set ocupa memoria (guarda lo visto) a cambio de no repetir búsquedas. Es la misma idea que un *hash join* o un `DISTINCT` en una base de datos.
>>> python
def primer_repetido(ids):
    vistos = set()
    for x in ids:
        if x in vistos:
            return x
        vistos.add(x)
    return None
```

## Ejercicios

:::ejercicio python dificultad=Experto titulo="Dos que suman"
Escribe `dos_suman(numeros, objetivo)` que devuelva una tupla con los **índices** `(i, j)`, con `i < j`, de los dos números que suman `objetivo`, o `None` si no existen. Debe ser O(n) (usa un diccionario).
```python inicial
def dos_suman(numeros, objetivo):
    pass
```
```python solucion
def dos_suman(numeros, objetivo):
    vistos = {}
    for j, x in enumerate(numeros):
        if objetivo - x in vistos:
            return (vistos[objetivo - x], j)
        vistos[x] = j
    return None
```
```python test
assert dos_suman([2, 7, 11, 15], 9) == (0, 1)
assert dos_suman([3, 2, 4], 6) == (1, 2)
assert dos_suman([1, 2], 10) is None
```
:::

:::ejercicio python dificultad=Experto titulo="Fusionar intervalos"
Escribe `fusionar(intervalos)` que reciba una lista de intervalos `[inicio, fin]` (por ejemplo, sesiones de un usuario) y devuelva la lista de intervalos **fusionados** (los que se solapan o se tocan se unen), ordenada.
```python inicial
def fusionar(intervalos):
    pass
```
```python solucion
def fusionar(intervalos):
    resultado = []
    for inicio, fin in sorted(intervalos):
        if resultado and inicio <= resultado[-1][1]:
            resultado[-1][1] = max(resultado[-1][1], fin)
        else:
            resultado.append([inicio, fin])
    return resultado
```
```python test
assert fusionar([[1, 3], [8, 10], [2, 6], [15, 18]]) == [[1, 6], [8, 10], [15, 18]]
assert fusionar([[1, 4], [4, 5]]) == [[1, 5]]
assert fusionar([]) == []
```
:::

:::ejercicio python dificultad=Experto titulo="Top-K palabras"
Escribe `top_k(texto, k)` que devuelva las `k` palabras más frecuentes (en minúsculas, ignorando los signos `.,;:!?`) como lista de tuplas `(palabra, cantidad)`, ordenadas por cantidad descendente y, si empatan, alfabéticamente.
```python inicial
def top_k(texto, k):
    pass
```
```python solucion
from collections import Counter

def top_k(texto, k):
    limpio = texto.lower()
    for s in ".,;:!?":
        limpio = limpio.replace(s, " ")
    conteo = Counter(limpio.split())
    return sorted(conteo.items(), key=lambda kv: (-kv[1], kv[0]))[:k]
```
```python test
t = "El dato manda. Sin datos no hay dato; el dato es rey, el rey es el dato!"
assert top_k(t, 3) == [("dato", 4), ("el", 4), ("es", 2)], f"top_k = {top_k(t, 3)}"
```
:::

:::ejercicio python dificultad=Experto titulo="Aplanar JSON"
Escribe `aplanar(d)` que convierta un diccionario anidado en uno plano con claves unidas por punto. Las listas se dejan tal cual. Es lo que hace `pd.json_normalize` o un `select("cliente.*")` en Spark.
```python inicial
def aplanar(d, prefijo=""):
    pass
```
```python solucion
def aplanar(d, prefijo=""):
    plano = {}
    for k, v in d.items():
        clave = f"{prefijo}{k}"
        if isinstance(v, dict):
            plano.update(aplanar(v, clave + "."))
        else:
            plano[clave] = v
    return plano
```
```python test
entrada = {"id": 1, "cliente": {"nombre": "Eva", "direccion": {"ciudad": "Lima", "cp": "15001"}}, "tags": ["a", "b"]}
esperado = {"id": 1, "cliente.nombre": "Eva", "cliente.direccion.ciudad": "Lima", "cliente.direccion.cp": "15001", "tags": ["a", "b"]}
assert aplanar(entrada) == esperado, f"aplanar = {aplanar(entrada)}"
```
:::

:::ejercicio python dificultad=Experto titulo="Racha más larga"
Escribe `racha_mas_larga(fechas)` que reciba una lista de fechas en texto `"YYYY-MM-DD"` (desordenadas y quizá repetidas) y devuelva la cantidad de **días consecutivos** de la racha más larga. Es el problema de gaps & islands, en Python.
```python inicial
from datetime import date

def racha_mas_larga(fechas):
    pass
```
```python solucion
from datetime import date

def racha_mas_larga(fechas):
    dias = sorted({date.fromisoformat(f) for f in fechas})
    mejor = actual = 0
    anterior = None
    for d in dias:
        if anterior is not None and (d - anterior).days == 1:
            actual += 1
        else:
            actual = 1
        mejor = max(mejor, actual)
        anterior = d
    return mejor
```
```python test
assert racha_mas_larga(["2024-01-03", "2024-01-01", "2024-01-02", "2024-01-05", "2024-01-02"]) == 3
assert racha_mas_larga(["2024-02-28", "2024-02-29", "2024-03-01"]) == 3, "Ojo con los años bisiestos"
assert racha_mas_larga([]) == 0
```
:::

:::ejercicio python dificultad=Experto titulo="Join en Python"
Implementa `left_join(izq, der, clave)` para listas de diccionarios: por cada fila de `izq`, combínala con **todas** las filas de `der` con la misma `clave`; si no hay ninguna, devuelve la fila de `izq` sola. Debe ser O(n + m) (indexa `der` en un diccionario).
```python inicial
def left_join(izq, der, clave):
    pass
```
```python solucion
def left_join(izq, der, clave):
    indice = {}
    for d in der:
        indice.setdefault(d[clave], []).append(d)
    resultado = []
    for i in izq:
        coincidencias = indice.get(i[clave])
        if not coincidencias:
            resultado.append(dict(i))
        for d in coincidencias or []:
            resultado.append({**i, **d})
    return resultado
```
```python test
clientes = [{"id": 1, "nombre": "Ana"}, {"id": 2, "nombre": "Luis"}]
pedidos = [{"id": 1, "pedido": 10}, {"id": 1, "pedido": 11}]
assert left_join(clientes, pedidos, "id") == [
    {"id": 1, "nombre": "Ana", "pedido": 10},
    {"id": 1, "nombre": "Ana", "pedido": 11},
    {"id": 2, "nombre": "Luis"},
], f"left_join = {left_join(clientes, pedidos, 'id')}"
```
:::
