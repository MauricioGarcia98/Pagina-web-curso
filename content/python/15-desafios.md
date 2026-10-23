---
titulo: Desafíos de Python para entrevistas de datos
nivel: Experto
duracion: 60
resumen: Problemas típicos de entrevistas técnicas resueltos con estructuras de datos.
---

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
