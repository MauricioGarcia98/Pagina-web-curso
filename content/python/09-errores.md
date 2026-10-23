---
titulo: Errores y excepciones
nivel: Intermedio
duracion: 35
resumen: Leer un traceback, try/except/else/finally, lanzar tus propios errores y validar datos.
---

## Los errores son información

Cuando algo sale mal, Python no "se rompe" sin más: **lanza una excepción**, un objeto que describe qué pasó, y si nadie la maneja, detiene el programa y muestra un mensaje. Al principio esos mensajes en rojo asustan; con práctica se vuelven tu mejor herramienta, porque dicen **exactamente** qué falló y dónde.

En ingeniería de datos los errores son parte del día a día: un archivo que llega con una columna de menos, un precio escrito "N/A", una API que no responde, una fecha imposible. Esta lección te enseña a **leer** errores, **manejarlos** cuando corresponde y **lanzarlos** tú misma cuando los datos no tienen sentido.

## Leer un error (traceback)

```python error
precios = {"mouse": 25}
print(precios["teclado"])
```

El mensaje se llama **traceback** ("rastro") y tiene tres partes:

```text
Traceback (most recent call last):
  File "main.py", line 2, in <module>      ← DÓNDE: archivo y número de línea
    print(precios["teclado"])               ← la línea que falló
KeyError: 'teclado'                         ← QUÉ: tipo de error + detalle
```

:::tip Lee el traceback de abajo hacia arriba
La **última línea** es la más importante: el tipo de error y el detalle. Después sube para ver en qué línea ocurrió. Si el error pasó dentro de una función que llamaste desde otra, verás varias líneas `File …`: la de más abajo es donde explotó, las de arriba son el camino de llamadas que llevó hasta ahí.
:::

### Los errores más frecuentes

| Error | Qué significa | Ejemplo típico | Cómo se arregla |
|---|---|---|---|
| `SyntaxError` | El código está mal escrito | Falta `:` o un paréntesis | Revisa la línea indicada (o la anterior) |
| `IndentationError` | Sangría incorrecta | Un bloque sin indentar | 4 espacios consistentes |
| `NameError` | Variable o función inexistente | `totl` en vez de `total` | Revisa el nombre y que esté definida antes |
| `TypeError` | Operación con tipos incompatibles | `"3" + 1`, llamar `len(5)` | Convierte tipos |
| `ValueError` | Tipo correcto, valor inválido | `int("hola")`, `int("")` | Valida o maneja el valor |
| `KeyError` | Clave inexistente en un diccionario | `d["telefono"]` | `d.get("telefono")` |
| `IndexError` | Índice fuera de rango | `lista[10]` con 3 elementos | Revisa el largo |
| `ZeroDivisionError` | División por cero | `total / 0` | Guarda: `if divisor:` |
| `AttributeError` | El objeto no tiene ese atributo o método | `None.upper()` | Casi siempre: una variable es `None` cuando no debía |
| `FileNotFoundError` | No existe el archivo | Ruta mal escrita | Revisa la ruta y la carpeta actual |

## try / except: manejar los errores esperables

A veces **sabes** que algo puede fallar y tienes un plan para ese caso. Por ejemplo, al convertir textos de un archivo a números: algunos vendrán vacíos o mal escritos. En vez de que el programa entero se detenga en la fila 5.000, quieres convertir lo que se pueda y marcar lo demás.

```python
def a_numero(texto):
    try:
        return float(texto)            # intenta esto…
    except ValueError:                 # …si falla con ValueError, haz esto otro
        print(f"No se pudo convertir {texto!r}")
        return None

valores = ["10.5", "abc", "7", ""]
print([a_numero(v) for v in valores])  # [10.5, None, 7.0, None]
```

1. Python ejecuta el bloque `try`.
2. Si **no** hay error, se saltea el `except` y sigue.
3. Si ocurre un `ValueError`, abandona el `try` en ese punto y ejecuta el bloque `except`.
4. Si ocurre un error de **otro** tipo (por ejemplo `TypeError`), el `except ValueError` no lo atrapa y el programa se detiene igual. Eso es bueno: no esperabas ese error.

### La estructura completa

```python
try:
    resultado = 10 / 0
except ZeroDivisionError as e:      # captura un tipo específico; e es el objeto error
    print("Error:", e)
    resultado = None
else:                                # solo si NO hubo error
    print("Todo bien")
finally:                             # SIEMPRE se ejecuta, haya error o no
    print("Fin")
```

| Bloque | Cuándo se ejecuta | Uso típico |
|---|---|---|
| `try` | Siempre (hasta que algo falle) | La operación riesgosa |
| `except Tipo as e` | Si ocurre ese tipo de error | El plan B |
| `else` | Si no hubo ningún error | Lo que depende de que el `try` haya salido bien |
| `finally` | Siempre, al final | Liberar recursos: cerrar conexiones, archivos |

Puedes tener varios `except` para distintos errores: `except (ValueError, TypeError):` o uno debajo del otro.

:::cuidado No atrapes todo a ciegas
`except:` o `except Exception:` sin más atrapa **cualquier** error, incluidos los tuyos de programación (`NameError` por un nombre mal escrito). El programa "funciona" pero hace cualquier cosa, y nadie se entera. Captura **solo** los errores que esperas y sabes manejar. En un pipeline de datos, es mucho mejor que el proceso **falle ruidosamente** (y Airflow te avise) a que cargue datos corruptos en silencio en el reporte del directorio.
:::

## Reintentos: un uso real de try

Las conexiones de red fallan a veces por motivos pasajeros. Un patrón común es reintentar unas pocas veces antes de rendirse:

```python
import random

def llamar_api():
    if random.random() < 0.6:                       # simulamos una API inestable
        raise ConnectionError("timeout")
    return {"pedidos": 42}

def con_reintentos(funcion, intentos=5):
    for n in range(1, intentos + 1):
        try:
            return funcion()
        except ConnectionError as e:
            print(f"Intento {n} falló: {e}")
    raise RuntimeError(f"Falló después de {intentos} intentos")

random.seed(3)
print(con_reintentos(llamar_api))
```

Airflow tiene esto incorporado (`retries=3` en cada tarea), pero la lógica es la misma.

## Lanzar tus propios errores: raise

A veces el código no falla, pero los **datos no tienen sentido**: una cantidad negativa, un estado desconocido, una fecha de entrega anterior a la de compra. Python no lo sabe; tú sí. Con `raise` detienes la ejecución con un mensaje claro. Es la base de la **validación de datos**:

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

Un buen mensaje de error dice **qué** está mal, **dónde** (el id del registro) y **qué valor** tenía. Quien lo lea a las 3 de la mañana te lo agradecerá.

### Tus propias clases de error

Puedes definir errores con nombre propio, para distinguirlos de los de Python:

```python
class DatosInvalidos(Exception):
    """Los datos de entrada no cumplen el contrato esperado."""

def leer_monto(texto):
    try:
        return float(texto)
    except ValueError:
        raise DatosInvalidos(f"Monto no numérico: {texto!r}")

try:
    leer_monto("doce")
except DatosInvalidos as e:
    print("Validación:", e)
```

## ¿Fallar o seguir? La decisión de diseño

Cuando un registro está mal, hay dos estrategias, y elegir bien es parte del trabajo:

| Estrategia | Cuándo | Ejemplo |
|---|---|---|
| **Fallar todo** (*fail fast*) | Si el error indica que algo grave cambió | Falta una columna entera, el archivo está vacío, el esquema cambió |
| **Apartar el registro** (cuarentena) y seguir | Si son errores puntuales y aceptables | 3 filas con monto "N/A" en 1 millón |

Lo profesional es combinar ambas: apartar las filas malas con su motivo, y **fallar** si superan un umbral ("más del 1 % inválidas"). Lo practicarás en el módulo de casos de punta a punta.

## Resumen

- Un traceback dice qué error, en qué línea y por qué: léelo de abajo hacia arriba.
- `try`/`except Tipo` maneja errores esperables; `else` si salió bien; `finally` siempre.
- Captura solo los errores que sabes manejar; nunca `except:` a ciegas.
- `raise ValueError("mensaje claro")` para datos que no tienen sentido; puedes crear tus propias excepciones.
- En pipelines: apartar registros inválidos con su motivo, y fallar si son demasiados.

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
