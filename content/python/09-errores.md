---
titulo: Errores y excepciones
nivel: Intermedio
duracion: 25
resumen: Leer un traceback, try/except/else/finally, lanzar tus propios errores y validar datos.
---

Los errores no son fracasos: son **mensajes** que te dicen qué pasó. Aprender a leerlos es una habilidad clave.

## Leer un error (traceback)

```python error
precios = {"mouse": 25}
print(precios["teclado"])
```

Python dice **qué tipo de error** (`KeyError`), **dónde** (la línea) y **un detalle** (`'teclado'`). Lee siempre la **última línea** primero.

| Error | Causa típica |
|---|---|
| `SyntaxError` | Código mal escrito: faltan `:` o paréntesis |
| `NameError` | Usas una variable que no existe (¿la escribiste mal?) |
| `TypeError` | Operación con tipos incompatibles: `"3" + 1` |
| `ValueError` | Tipo correcto, valor inválido: `int("hola")` |
| `KeyError` | Clave inexistente en un diccionario |
| `IndexError` | Índice fuera de rango en una lista |
| `ZeroDivisionError` | División por cero |
| `AttributeError` | El objeto no tiene ese método: `None.upper()` |

## try / except: manejar errores

```python
def a_numero(texto):
    try:
        return float(texto)
    except ValueError:
        print(f"No se pudo convertir {texto!r}")
        return None

valores = ["10.5", "abc", "7", ""]
print([a_numero(v) for v in valores])
```

La estructura completa:

```python
try:
    resultado = 10 / 0
except ZeroDivisionError as e:      # captura un tipo específico
    print("Error:", e)
    resultado = None
else:                                # solo si NO hubo error
    print("Todo bien")
finally:                             # SIEMPRE se ejecuta (cerrar conexiones, archivos...)
    print("Fin")
```

:::cuidado No atrapes todo a ciegas
`except:` o `except Exception:` sin más esconde errores de programación (como un `NameError`). Captura **solo** los errores que esperas y sabes manejar. En un pipeline, es mejor que falle ruidosamente a que cargue datos corruptos en silencio.
:::

## Lanzar tus propios errores

Con `raise` detienes la ejecución cuando algo no tiene sentido. Es la base de la **validación de datos**:

```python
def validar_pedido(p):
    if p["cantidad"] <= 0:
        raise ValueError(f"Cantidad inválida en el pedido {p['id']}: {p['cantidad']}")
    if p["estado"] not in {"pendiente", "enviado", "entregado"}:
        raise ValueError(f"Estado desconocido: {p['estado']}")
    return True

try:
    validar_pedido({"id": 9, "cantidad": -2, "estado": "enviado"})
except ValueError as e:
    print("Pedido rechazado →", e)
```

También puedes crear tus propias clases de error: `class DatosInvalidos(Exception): pass`.

## Ejercicios

:::ejercicio python
Escribe `division_segura(a, b)` que devuelva `a / b`, o `None` si `b` es cero (usando `try/except ZeroDivisionError`).
```python inicial
def division_segura(a, b):
    pass
```
```python solucion
def division_segura(a, b):
    try:
        return a / b
    except ZeroDivisionError:
        return None
```
```python test
assert division_segura(10, 4) == 2.5, "10/4 debería ser 2.5"
assert division_segura(1, 0) is None, "Dividir por 0 debe devolver None"
```
:::

:::ejercicio python
Procesa la lista `crudos` convirtiendo cada valor a `int`. Los que fallen deben ir a la lista `errores` (el valor original) y los válidos a `validos`.
```python inicial
crudos = ["10", "20", "x", "", "35", "4.5", "-3"]
```
```python solucion
crudos = ["10", "20", "x", "", "35", "4.5", "-3"]
validos = []
errores = []
for c in crudos:
    try:
        validos.append(int(c))
    except ValueError:
        errores.append(c)
```
```python test
assert validos == [10, 20, 35, -3], f"validos = {validos}"
assert errores == ["x", "", "4.5"], f"errores = {errores}"
```
:::

:::ejercicio python
Escribe `validar_edad(edad)` que lance `TypeError` si `edad` no es un `int`, `ValueError` si es negativa o mayor a 120, y devuelva `edad` si está todo bien.
```python inicial
def validar_edad(edad):
    pass
```
```python solucion
def validar_edad(edad):
    if not isinstance(edad, int):
        raise TypeError("La edad debe ser un entero")
    if edad < 0 or edad > 120:
        raise ValueError("Edad fuera de rango")
    return edad
```
```python test
assert validar_edad(30) == 30, "Con 30 debe devolver 30"
for malo, err in [("30", TypeError), (3.5, TypeError), (-1, ValueError), (130, ValueError)]:
    try:
        validar_edad(malo)
        raise AssertionError(f"validar_edad({malo!r}) debería lanzar {err.__name__}")
    except err:
        pass
```
:::
