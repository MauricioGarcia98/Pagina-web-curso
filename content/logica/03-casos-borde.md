---
titulo: Casos borde - romper tu propia solución antes que nadie
nivel: Básico
duracion: 35
resumen: Una solución que funciona con el ejemplo del enunciado todavía no está terminada. Aprende la lista corta de casos que rompen casi todo (vacío, uno solo, empates, nulos, duplicados, negativos) y a escribir tus propias pruebas con assert.
objetivos: Enumerar los casos borde típicos de un problema de datos | Escribir pruebas con assert antes de dar algo por terminado | Decidir qué devolver cuando la entrada está vacía o tiene nulos | Manejar empates sin perder resultados
prerrequisitos: logica-descomponer
autoevaluacion: ¿Qué devuelve tu función si la lista está vacía? | ¿Qué pasa si hay dos ganadores empatados? | ¿Sabes escribir un assert con mensaje? | ¿Sabes cuándo un nulo debe ignorarse y cuándo debe contarse?
---

:::analogia En palabras simples
Un ascensor que funciona con 3 personas no está probado. Hay que probarlo vacío, con una persona, con el peso máximo y con alguien que aprieta todos los botones. Los casos borde son esas pruebas incómodas: los extremos donde el código que "andaba" se rompe.
:::

## La lista que rompe casi todo

Antes de decir "listo", pasa tu solución por esta lista. No hace falta memorizarla: con el tiempo te sale sola.

| Caso | Pregunta que te haces | Ejemplo de falla típica |
|---|---|---|
| **Vacío** | ¿Y si no viene nada? | `sum(x) / len(x)` → `ZeroDivisionError` |
| **Uno solo** | ¿Y si hay un único elemento? | Comparar con "el anterior" que no existe |
| **Empates** | ¿Y si dos valen lo mismo? | Devuelves un ganador y había dos |
| **Nulos** | ¿Y si falta un dato? | `None + 5` → `TypeError` |
| **Duplicados** | ¿Y si el mismo registro viene dos veces? | Sumas dos veces la misma venta |
| **Negativos / cero** | ¿Y si el número es 0 o negativo? | "El máximo empieza en 0" y todos son negativos |
| **Mayúsculas y espacios** | ¿"Chile", "chile " y "CHILE" son lo mismo? | Tres grupos donde había uno |
| **Muy grande** | ¿Y si son 10 millones? | Un bucle dentro de otro bucle tarda horas |

:::tip El error más clásico de todos
Empezar el máximo en `0`. Si todos los números son negativos, tu función devuelve `0`, que ni siquiera está en la lista. Empieza con **el primer elemento** (o usa `max()`), nunca con un número inventado.
:::

## Escribe tus propias pruebas

`assert condición, "mensaje"` no hace nada si la condición es verdadera, y corta el programa con tu mensaje si es falsa. Es la forma más barata de probar.

```python
def promedio(numeros):
    if not numeros:
        return None
    return sum(numeros) / len(numeros)

assert promedio([2, 4]) == 3, "caso normal"
assert promedio([5]) == 5, "uno solo"
assert promedio([]) is None, "vacío: no hay promedio"
assert promedio([-2, 2]) == 0, "negativos"
print("todas las pruebas pasaron")
```

Fíjate en el orden de trabajo: **primero** escribes qué esperas en cada caso borde, **después** ajustas el código hasta que pase. Así te obligas a decidir qué significa "promedio de nada" antes de que el programa explote.

## Decidir qué devolver en el caso raro

No hay una respuesta única. Lo importante es **decidirlo a propósito** y dejarlo escrito:

| Situación | Opciones razonables |
|---|---|
| Promedio de una lista vacía | `None`, `0`, o lanzar un error claro |
| "El mejor vendedor" con empate | Todos los empatados, o el primero alfabético (y avisar) |
| Un monto `None` en una suma | Ignorarlo (y contar cuántos faltaron) |
| Un monto `None` en un conteo de filas | Contar la fila igual: la venta existió |

En SQL la decisión ya está tomada por el motor: `SUM` y `AVG` **ignoran** los nulos, `COUNT(*)` cuenta filas y `COUNT(columna)` cuenta solo los no nulos. Saberlo te evita sorpresas.

## Empates: devuelve todos

Cuando el enunciado dice "el que más", pregúntate si puede haber más de uno. La forma segura es en dos pasadas: primero encuentra el valor máximo, después quédate con **todos** los que lo tienen.

```python
ventas = {"Ana": 300, "Luis": 300, "Eva": 120}
maximo = max(ventas.values())
ganadores = [nombre for nombre, v in ventas.items() if v == maximo]
print(ganadores)  # ['Ana', 'Luis']
```

:::ejercicio quiz
Esta función busca el número más grande. ¿Con qué entrada da un resultado **incorrecto**?
```python norun
def mayor(numeros):
    m = 0
    for n in numeros:
        if n > m:
            m = n
    return m
```
- [ ] `[3, 9, 2]`
- [x] `[-5, -2, -8]`
- [ ] `[7]`
- [ ] `[1, 1, 1]`
:::

:::ejercicio quiz
En SQL, la tabla tiene 5 filas y la columna `monto` tiene 2 nulos. ¿Qué devuelve `COUNT(monto)`?
- [ ] 5
- [x] 3
- [ ] 2
- [ ] NULL
:::

:::ejercicio quiz
"Muestra el producto más vendido." Dos productos empatan con 40 unidades. ¿Qué es lo más profesional?
- [ ] Devolver cualquiera de los dos; el enunciado dice "el" producto
- [x] Devolver los dos, o aclarar el criterio de desempate y dejarlo escrito
- [ ] Devolver un error porque el enunciado está mal
- [ ] Devolver el que tenga menor id sin decir nada
:::

:::ejercicio python
Escribe `promedio_seguro(numeros)` que devuelva el promedio de la lista **ignorando los `None`**. Si no queda ningún número, devuelve `None`.
```python inicial
def promedio_seguro(numeros):
    return sum(numeros) / len(numeros)
```
```python solucion
def promedio_seguro(numeros):
    validos = [n for n in numeros if n is not None]
    if not validos:
        return None
    return sum(validos) / len(validos)
```
```pista
Dos pasos: primero filtra los que no son `None`; después, si la lista filtrada está vacía, devuelve `None` antes de dividir.
```
```python test
assert promedio_seguro([2, 4, None]) == 3, f"Obtuviste {promedio_seguro([2, 4, None])}: el None no cuenta"
assert promedio_seguro([]) is None, "Lista vacía: None"
assert promedio_seguro([None, None]) is None, "Solo nulos: None"
assert promedio_seguro([0, 0]) == 0, "Ceros: el promedio es 0, no None"
assert promedio_seguro([-3, 3]) == 0
```
:::

:::ejercicio python
Escribe `ganadores(ventas)` que reciba un diccionario `vendedor → total` y devuelva la lista de **todos** los vendedores con el total máximo, ordenada alfabéticamente. Si el diccionario está vacío, devuelve `[]`.
```python inicial
def ganadores(ventas):
    pass
```
```python solucion
def ganadores(ventas):
    if not ventas:
        return []
    maximo = max(ventas.values())
    return sorted(v for v, total in ventas.items() if total == maximo)
```
```pista
Primero `max(ventas.values())`; después recorre y quédate con los que tienen ese valor. Cuidado con el diccionario vacío: `max` de nada da error.
```
```python test
assert ganadores({"Luis": 300, "Ana": 300, "Eva": 120}) == ["Ana", "Luis"], f"Obtuviste {ganadores({'Luis': 300, 'Ana': 300, 'Eva': 120})}"
assert ganadores({"Eva": 5}) == ["Eva"]
assert ganadores({}) == []
assert ganadores({"A": -10, "B": -3}) == ["B"], "Con negativos el máximo es -3"
```
:::

:::ejercicio python
Los países llegan escritos de cualquier forma. Escribe `contar_paises(paises)` que cuente cuántas veces aparece cada país **normalizando**: sin espacios al principio o al final y con la primera letra en mayúscula (`" chile"` → `"Chile"`). Ignora los `None` y los textos vacíos.
```python inicial
def contar_paises(paises):
    cuentas = {}
    for p in paises:
        cuentas[p] = cuentas.get(p, 0) + 1
    return cuentas
```
```python solucion
def contar_paises(paises):
    cuentas = {}
    for p in paises:
        if p is None:
            continue
        limpio = p.strip().capitalize()
        if not limpio:
            continue
        cuentas[limpio] = cuentas.get(limpio, 0) + 1
    return cuentas
```
```pista
`p.strip()` saca los espacios y `.capitalize()` deja la primera en mayúscula y el resto en minúscula. Salta los `None` antes de llamar a `.strip()` (un `None` no tiene ese método) y salta también los que quedan vacíos.
```
```python test
r = contar_paises(["Chile", " chile", "CHILE ", "Perú", None, "  "])
assert r == {"Chile": 3, "Perú": 1}, f"Obtuviste {r}"
assert contar_paises([]) == {}
```
:::

:::ejercicio python
Llegan ventas repetidas por un reintento del sistema. Escribe `total_sin_duplicados(ventas)` que sume el `"monto"` de una lista de diccionarios contando **una sola vez** cada `"id"` (si un id aparece repetido, vale la primera aparición).
```python inicial
def total_sin_duplicados(ventas):
    return sum(v["monto"] for v in ventas)
```
```python solucion
def total_sin_duplicados(ventas):
    vistos = set()
    total = 0
    for v in ventas:
        if v["id"] in vistos:
            continue
        vistos.add(v["id"])
        total += v["monto"]
    return total
```
```pista
Guarda en un `set` los ids que ya sumaste. Antes de sumar, pregunta si el id ya está en el set; si está, sáltalo.
```
```python test
vs = [{"id": 1, "monto": 100}, {"id": 2, "monto": 50}, {"id": 1, "monto": 100}]
assert total_sin_duplicados(vs) == 150, f"Obtuviste {total_sin_duplicados(vs)}"
assert total_sin_duplicados([]) == 0
assert total_sin_duplicados([{"id": 7, "monto": 10}, {"id": 7, "monto": 99}]) == 10, "Vale la primera aparición"
```
:::
