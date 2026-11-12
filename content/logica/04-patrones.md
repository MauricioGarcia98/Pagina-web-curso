---
titulo: Patrones - los mismos 7 trucos resuelven casi todo
nivel: Intermedio
duracion: 45
resumen: La mayoría de los problemas de programación son variaciones de unos pocos patrones - acumulador, contador, mejor hasta ahora, bandera, diccionario como índice, comparar con el anterior y ventana. Reconocerlos es lo que hace que un problema nuevo se sienta conocido.
objetivos: Reconocer qué patrón pide un enunciado a partir de sus palabras | Usar un diccionario como índice para no recorrer la lista dos veces | Comparar cada elemento con el anterior para encontrar rachas y cambios | Calcular una ventana móvil sin errores de borde
prerrequisitos: logica-casos-borde
autoevaluacion: ¿Qué patrón usarías para "cuántos de cada"? | ¿Cómo encuentras dos números que suman un objetivo sin dos bucles? | ¿Cómo calculas la racha más larga? | ¿Cómo se ve el mismo patrón en SQL y en Spark?
---

:::analogia En palabras simples
Un cocinero no inventa cada plato desde cero: sabe hervir, saltear, hornear y hacer una salsa base, y combina esas técnicas. En programación pasa lo mismo. Si conoces siete técnicas y sabes cuál pide cada enunciado, un problema "nuevo" casi siempre es una combinación de cosas que ya hiciste.
:::

## La tabla de patrones

| Patrón | Palabras del enunciado | Esqueleto en Python | En SQL / Spark |
|---|---|---|---|
| **Acumulador** | total, suma, promedio | `total += x` | `SUM`, `AVG` |
| **Contador** | cuántos, cuántos de cada | `c[k] = c.get(k, 0) + 1` | `COUNT(*) ... GROUP BY` |
| **Mejor hasta ahora** | el mayor, el más, el primero | `if x > mejor: mejor = x` | `MAX`, `ORDER BY ... LIMIT 1` |
| **Bandera** | ¿existe alguno?, ¿todos? | `encontrado = True; break` | `EXISTS`, `MIN(cond)` |
| **Diccionario índice** | buscar, cruzar, emparejar | `por_id = {x["id"]: x for x in lista}` | `JOIN` |
| **Comparar con el anterior** | racha, cambio, creció, seguidos | `anterior = x` al final del bucle | `LAG()` |
| **Ventana** | móvil, últimos N, acumulado | `sum(lista[i-n+1:i+1])` | `AVG() OVER (ROWS ...)` |

La última columna es la clave de este módulo: **el patrón es el mismo, cambia la sintaxis**. Si sabes pensarlo en Python, lo sabes pensar en SQL y en Spark.

## Bandera: cortar apenas lo encuentras

```python
def hay_negativo(numeros):
    for n in numeros:
        if n < 0:
            return True   # encontré uno: no hace falta seguir
    return False          # recorrí todo y no hubo ninguno
```

Ojo con el error típico: poner `return False` **dentro** del bucle, en un `else`. Así la función decide mirando solo el primer elemento.

## Diccionario índice: de dos bucles a uno

"¿Hay dos números en la lista que sumen 10?" La primera idea es probar todos los pares: un bucle dentro de otro. Con 100.000 números son 5.000 millones de pares.

La idea mejor: mientras recorres, guarda lo que ya viste. Para cada número `n`, el que necesitas es `10 - n`. Si ya lo viste, terminaste.

```python
def dos_suman(numeros, objetivo):
    vistos = set()
    for n in numeros:
        if objetivo - n in vistos:
            return True
        vistos.add(n)
    return False

print(dos_suman([3, 8, 1, 7], 10))   # True: 3 + 7
```

Buscar en un `set` o en un `dict` es casi instantáneo, sin importar el tamaño. Este truco aparece en entrevistas una y otra vez, y es la misma idea que hace rápido a un `JOIN`.

## Comparar con el anterior: rachas y cambios

Para saber si algo "creció", "se repitió" o "cuántos días seguidos", necesitas recordar el elemento anterior.

```python
ventas = [100, 120, 90, 95, 130]
anterior = None
for v in ventas:
    if anterior is not None and v > anterior:
        print(v, "creció")
    anterior = v      # siempre al final de la vuelta
```

La racha más larga es el mismo patrón con un contador que **se reinicia** cuando la condición se corta.

| Vuelta | valor | ¿sigue la racha? | racha actual | mejor |
|---|---|---|---|---|
| 1 | 100 | primero | 1 | 1 |
| 2 | 120 | 120 > 100 sí | 2 | 2 |
| 3 | 90 | 90 > 120 no | 1 | 2 |
| 4 | 95 | 95 > 90 sí | 2 | 2 |
| 5 | 130 | 130 > 95 sí | 3 | **3** |

## Ventana: los últimos N

El promedio móvil de 3 días en la posición `i` usa los elementos `i-2`, `i-1` e `i`. El borde: en las dos primeras posiciones todavía no hay 3 días.

```python
def movil(valores, n):
    salida = []
    for i in range(len(valores)):
        if i + 1 < n:
            salida.append(None)          # todavía no hay n valores
        else:
            ventana = valores[i - n + 1 : i + 1]
            salida.append(sum(ventana) / n)
    return salida

print(movil([10, 20, 30, 40], 3))   # [None, None, 20.0, 30.0]
```

En SQL lo mismo es `AVG(x) OVER (ORDER BY fecha ROWS BETWEEN 2 PRECEDING AND CURRENT ROW)`. SQL no pone `None` en los bordes: promedia los que haya. Es una diferencia que conviene saber, no un error.

:::ejercicio quiz
"¿Algún cliente compró más de 10 veces?" ¿Qué patrón es?
- [ ] Ventana
- [x] Bandera (después de contar por cliente)
- [ ] Comparar con el anterior
- [ ] Acumulador
:::

:::ejercicio quiz
"Días seguidos en que la temperatura subió." ¿Qué patrón principal necesitas?
- [ ] Diccionario índice
- [ ] Contador por clave
- [x] Comparar con el anterior, con un contador que se reinicia
- [ ] Mejor hasta ahora sin memoria
:::

:::ejercicio quiz
¿Cuál es el equivalente en SQL de "comparar cada fila con la anterior"?
- [ ] `GROUP BY`
- [ ] `HAVING`
- [x] `LAG()` sobre una ventana ordenada
- [ ] `DISTINCT`
:::

:::ejercicio python
Escribe `dos_suman(numeros, objetivo)` que devuelva `True` si hay **dos posiciones distintas** de la lista cuyos valores suman `objetivo`. Hazlo con un solo bucle y un `set`.
```python inicial
def dos_suman(numeros, objetivo):
    pass
```
```python solucion
def dos_suman(numeros, objetivo):
    vistos = set()
    for n in numeros:
        if objetivo - n in vistos:
            return True
        vistos.add(n)
    return False
```
```pista
Para cada `n`, el compañero que necesitas es `objetivo - n`. Pregunta si ya lo viste **antes** de agregar `n` al set: así un 5 solo no "suma 10 consigo mismo".
```
```python test
assert dos_suman([3, 8, 1, 7], 10) is True
assert dos_suman([5], 10) is False, "Un solo 5 no suma 10 consigo mismo"
assert dos_suman([5, 5], 10) is True, "Dos cincos en posiciones distintas sí"
assert dos_suman([], 0) is False
assert dos_suman([-2, 12], 10) is True
```
:::

:::ejercicio python
Escribe `racha_creciente(valores)` que devuelva el largo de la **racha más larga** de valores estrictamente crecientes y seguidos. Lista vacía → `0`.
```python inicial
def racha_creciente(valores):
    pass
```
```python solucion
def racha_creciente(valores):
    if not valores:
        return 0
    mejor = actual = 1
    for i in range(1, len(valores)):
        if valores[i] > valores[i - 1]:
            actual += 1
        else:
            actual = 1
        mejor = max(mejor, actual)
    return mejor
```
```pista
Lleva dos números: `actual` (la racha que vas armando) y `mejor`. Si el valor supera al anterior, `actual` crece; si no, vuelve a 1. Después de cada vuelta actualiza `mejor`.
```
```python test
assert racha_creciente([100, 120, 90, 95, 130]) == 3, f"Obtuviste {racha_creciente([100, 120, 90, 95, 130])}"
assert racha_creciente([]) == 0
assert racha_creciente([5]) == 1
assert racha_creciente([3, 3, 3]) == 1, "Iguales no es crecer"
assert racha_creciente([1, 2, 3, 4]) == 4
```
:::

:::ejercicio python
Escribe `unir(pedidos, clientes)` que agregue a cada pedido el `"pais"` de su cliente. `clientes` es una lista de diccionarios con `"id"` y `"pais"`; cada pedido tiene `"cliente_id"`. Si el cliente no existe, el país queda `None`. Devuelve una lista **nueva** de diccionarios (no modifiques los originales).
```python inicial
def unir(pedidos, clientes):
    pass
```
```python solucion
def unir(pedidos, clientes):
    pais_por_id = {c["id"]: c["pais"] for c in clientes}
    return [{**p, "pais": pais_por_id.get(p["cliente_id"])} for p in pedidos]
```
```pista
Arma primero un diccionario `id → pais` (el índice). Después, para cada pedido, crea una copia con `{**p, "pais": ...}` y busca el país con `.get()`, que devuelve `None` si no existe. Es un LEFT JOIN escrito a mano.
```
```python test
cs = [{"id": 1, "pais": "Chile"}, {"id": 2, "pais": "Perú"}]
ps = [{"pedido": 10, "cliente_id": 2}, {"pedido": 11, "cliente_id": 9}]
r = unir(ps, cs)
assert r == [{"pedido": 10, "cliente_id": 2, "pais": "Perú"}, {"pedido": 11, "cliente_id": 9, "pais": None}], f"Obtuviste {r}"
assert "pais" not in ps[0], "No modifiques los pedidos originales"
```
:::

:::ejercicio python
Escribe `promedio_movil(valores, n)` que devuelva una lista del mismo largo: en cada posición, el promedio de los últimos `n` valores (incluido el actual), redondeado a 2 decimales. Donde todavía no hay `n` valores, pon `None`.
```python inicial
def promedio_movil(valores, n):
    pass
```
```python solucion
def promedio_movil(valores, n):
    salida = []
    for i in range(len(valores)):
        if i + 1 < n:
            salida.append(None)
        else:
            ventana = valores[i - n + 1 : i + 1]
            salida.append(round(sum(ventana) / n, 2))
    return salida
```
```pista
En la posición `i` la ventana es `valores[i - n + 1 : i + 1]`. Si `i + 1 < n`, todavía no hay suficientes valores.
```
```python test
assert promedio_movil([10, 20, 30, 40], 3) == [None, None, 20.0, 30.0], f"Obtuviste {promedio_movil([10, 20, 30, 40], 3)}"
assert promedio_movil([1, 2], 1) == [1.0, 2.0]
assert promedio_movil([], 3) == []
assert promedio_movil([1, 2], 5) == [None, None]
```
:::

:::ejercicio python
Escribe `primera_repetida(palabras)` que devuelva la **primera palabra que aparece por segunda vez** al recorrer la lista (sin distinguir mayúsculas). Si ninguna se repite, devuelve `None`.
```python inicial
def primera_repetida(palabras):
    pass
```
```python solucion
def primera_repetida(palabras):
    vistas = set()
    for p in palabras:
        clave = p.lower()
        if clave in vistas:
            return p
        vistas.add(clave)
    return None
```
```pista
Bandera + set: recorre, y apenas encuentres una palabra que ya estaba en el set, devuélvela. Compara en minúsculas.
```
```python test
assert primera_repetida(["sol", "luna", "mar", "Luna", "sol"]) == "Luna", f"Obtuviste {primera_repetida(['sol', 'luna', 'mar', 'Luna', 'sol'])}"
assert primera_repetida(["a", "b"]) is None
assert primera_repetida([]) is None
```
:::
