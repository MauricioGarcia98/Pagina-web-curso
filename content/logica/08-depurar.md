---
titulo: Depurar - encontrar el error con método, no con suerte
nivel: Intermedio
duracion: 40
resumen: Cuando el código falla, hay un método - leer el mensaje de error de abajo hacia arriba, reproducir con el caso más chico posible, formular una hipótesis y comprobarla. Incluye los errores más comunes de Python, SQL y Spark y qué significan en castellano.
objetivos: Leer un traceback de Python y encontrar la línea que importa | Reducir un error al caso más chico que lo reproduce | Distinguir un error que corta el programa de un resultado incorrecto silencioso | Reconocer los mensajes típicos de SQL y Spark
prerrequisitos: logica-casos-borde
autoevaluacion: ¿Sabes en qué parte del traceback está la causa? | ¿Qué significan KeyError, TypeError e IndexError? | ¿Cómo depuras un resultado que no da error pero está mal? | ¿Qué significa "cannot resolve column" en Spark?
---

:::analogia En palabras simples
Un mecánico no cambia piezas al azar hasta que el auto arranque. Escucha el ruido, piensa qué lo puede causar, prueba una cosa y mira qué cambia. Depurar es lo mismo: una hipótesis por vez, comprobada con una prueba chica.
:::

## El método en 4 pasos

1. **Lee el mensaje completo.** La última línea dice *qué* pasó; la línea de código justo arriba dice *dónde*.
2. **Reprodúcelo con el caso más chico.** Si falla con 10.000 filas, busca la fila que lo causa y prueba solo con esa.
3. **Formula una hipótesis.** "Creo que falla porque `monto` viene como texto."
4. **Compruébala con un print o un assert**, cambia una sola cosa y vuelve a probar.

## Leer un traceback

```text
Traceback (most recent call last):
  File "ventas.py", line 12, in <module>
    print(total_por_pais(ventas))
  File "ventas.py", line 6, in total_por_pais
    totales[v["pais"]] += v["monto"]
KeyError: 'Chile'
```

Se lee **de abajo hacia arriba**: `KeyError: 'Chile'` (qué pasó) en la línea 6 (dónde). La causa: se intentó sumar a `totales["Chile"]` antes de que esa clave existiera. La solución es `totales.get(v["pais"], 0) + v["monto"]`.

## Los errores de siempre, en castellano

| Error | Qué significa | Causa típica |
|---|---|---|
| `KeyError: 'x'` | Esa clave no está en el diccionario | Sumar sin inicializar, nombre de columna mal escrito |
| `IndexError: list index out of range` | Pediste una posición que no existe | `lista[i+1]` en la última vuelta, lista vacía |
| `TypeError: unsupported operand` | Operación entre tipos que no se mezclan | Sumar `None` o un texto `"100"` a un número |
| `ZeroDivisionError` | Dividiste por cero | Promedio de una lista vacía |
| `NameError: name 'x' is not defined` | Esa variable no existe (todavía) | Error de tipeo, usar antes de asignar |
| `AttributeError: 'NoneType' ...` | Llamaste a un método sobre `None` | Una función que no tiene `return` |

| En SQL / Spark | Qué significa |
|---|---|
| `no such column` / `cannot resolve column` | La columna no existe con ese nombre en ese paso (nombre mal escrito, tabla equivocada, alias del SELECT usado en el WHERE en PostgreSQL o SQL Server) |
| `must appear in the GROUP BY clause` | Seleccionas una columna que no agrupaste ni agregaste (PostgreSQL; SQLite no avisa y elige un valor cualquiera, que es peor) |
| `ambiguous column` | La columna existe en las dos tablas del JOIN: ponle el prefijo `p.` o `c.` |

## El error más peligroso: el que no da error

Un `KeyError` te avisa. Un resultado **incorrecto pero sin error** no avisa nada. Para esos:

- Compara con un caso que puedas calcular a mano (3 filas, resultado conocido).
- Cuenta filas antes y después de cada paso.
- Revisa la lista de casos borde: duplicados, nulos, empates.

```python norun
def total(ventas):
    t = 0
    for v in ventas:
        t = v["monto"]      # error silencioso: debería ser t += v["monto"]
    return t

assert total([{"monto": 1}, {"monto": 2}]) == 3, f"esperaba 3, dio {total([{'monto': 1}, {'monto': 2}])}"
```

El `assert` con un caso chico convierte un error silencioso en uno que grita.

:::ejercicio quiz
En un traceback de Python, ¿dónde está normalmente la información más útil?
- [ ] En la primera línea, "Traceback (most recent call last)"
- [x] En la última línea (qué error) y la línea de código justo arriba (dónde)
- [ ] En el nombre del archivo
- [ ] En ningún lado; hay que adivinar
:::

:::ejercicio quiz
`TypeError: unsupported operand type(s) for +: 'int' and 'str'`. ¿Qué pasó?
- [ ] Dividiste por cero
- [x] Intentaste sumar un número con un texto, por ejemplo `100 + "50"`
- [ ] La lista está vacía
- [ ] Falta un import
:::

:::ejercicio quiz
Una consulta corre sin error pero el total de ventas es el triple de lo esperado. ¿Qué revisas primero?
- [ ] La versión del motor
- [ ] Si las columnas están en mayúsculas
- [x] Si un JOIN multiplicó filas (cuenta filas antes y después del JOIN)
- [ ] Si falta un punto y coma
:::

:::ejercicio python
Este código lanza `KeyError`. Corrígelo para que `total_por_pais(ventas)` devuelva el total de `"monto"` por `"pais"`.
```python inicial
def total_por_pais(ventas):
    totales = {}
    for v in ventas:
        totales[v["pais"]] += v["monto"]
    return totales
```
```python solucion
def total_por_pais(ventas):
    totales = {}
    for v in ventas:
        totales[v["pais"]] = totales.get(v["pais"], 0) + v["monto"]
    return totales
```
```pista
La primera vez que aparece un país, la clave todavía no existe. Usa `totales.get(pais, 0)` para empezar en 0.
```
```python test
vs = [{"pais": "Chile", "monto": 10}, {"pais": "Perú", "monto": 5}, {"pais": "Chile", "monto": 1}]
assert total_por_pais(vs) == {"Chile": 11, "Perú": 5}, f"Obtuviste {total_por_pais(vs)}"
assert total_por_pais([]) == {}
```
:::

:::ejercicio python
Este código lanza `IndexError` en la última vuelta. Corrígelo: `cambios(valores)` debe devolver la lista de diferencias entre cada valor y el **siguiente** (`[10, 15, 12]` → `[5, -3]`).
```python inicial
def cambios(valores):
    salida = []
    for i in range(len(valores)):
        salida.append(valores[i + 1] - valores[i])
    return salida
```
```python solucion
def cambios(valores):
    salida = []
    for i in range(len(valores) - 1):
        salida.append(valores[i + 1] - valores[i])
    return salida
```
```pista
En la última vuelta, `i + 1` se sale de la lista. El bucle tiene que terminar una posición antes: `range(len(valores) - 1)`.
```
```python test
assert cambios([10, 15, 12]) == [5, -3], f"Obtuviste {cambios([10, 15, 12])}"
assert cambios([7]) == [], "Con un solo valor no hay cambios"
assert cambios([]) == []
```
:::

:::ejercicio python
Este código no da error pero el resultado está mal: los montos vienen como **texto** y algunos son `None` o vacíos. Corrige `total(montos)` para que sume solo los que se pueden convertir a número (`"10.5"` cuenta como 10.5) y devuelva el resultado redondeado a 2.
```python inicial
def total(montos):
    t = 0
    for m in montos:
        if m:
            t = float(m)
    return t
```
```python solucion
def total(montos):
    t = 0
    for m in montos:
        if m is None:
            continue
        try:
            t += float(m)
        except ValueError:
            continue
    return round(t, 2)
```
```pista
Hay dos errores: `t = ...` pisa el total en vez de acumular (`t += ...`), y un texto como `"abc"` hace fallar a `float()`. Usa `try/except ValueError` para saltar los que no son números.
```
```python test
assert total(["10.5", "2", None, "", "abc"]) == 12.5, f"Obtuviste {total(['10.5', '2', None, '', 'abc'])}"
assert total([]) == 0
assert total(["1.111", "1.111"]) == 2.22
```
:::

:::ejercicio sql dificultad=Intermedio
Esta consulta no da error, pero miente: los clientes **sin pedidos** aparecen con 1 pedido. Corrígela para que muestre cuántos pedidos tiene cada cliente, con `0` para los que nunca compraron. Columnas: `cliente_id`, `pedidos`.
```sql inicial
SELECT c.cliente_id, COUNT(*) AS pedidos
FROM clientes c
LEFT JOIN pedidos p ON p.cliente_id = c.cliente_id
GROUP BY c.cliente_id;
```
```sql solucion
SELECT c.cliente_id, COUNT(p.pedido_id) AS pedidos
FROM clientes c
LEFT JOIN pedidos p ON p.cliente_id = c.cliente_id
GROUP BY c.cliente_id;
```
```pista
Con LEFT JOIN, un cliente sin pedidos igual deja una fila (con las columnas de `pedidos` en NULL). `COUNT(*)` cuenta esa fila; `COUNT(p.pedido_id)` cuenta solo los valores no nulos. Compruébalo a mano con un cliente que sepas que no compró.
```
:::
