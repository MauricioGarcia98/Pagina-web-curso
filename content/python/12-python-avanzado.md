---
titulo: Iteradores, generadores, decoradores y context managers
nivel: Avanzado
duracion: 40
resumen: Procesar datos sin cargarlos en memoria, envolver funciones y manejar recursos.
---

Estos conceptos aparecen en todo el código profesional de datos (Airflow usa decoradores, Spark usa evaluación perezosa como los generadores…).

## Generadores: datos “a demanda”

Una función con `yield` es un **generador**: produce valores **de a uno**, solo cuando se le piden, sin construir toda la lista en memoria. Ideal para archivos de varios GB.

```python
def leer_en_lotes(datos, tamanio):
    lote = []
    for d in datos:
        lote.append(d)
        if len(lote) == tamanio:
            yield lote
            lote = []
    if lote:
        yield lote

for lote in leer_en_lotes(range(1, 11), 4):
    print("Procesando lote", lote)
```

:::analogia Lista vs generador
Una lista es una caja con todas las galletas horneadas de antemano. Un generador es un horno que te da una galleta recién hecha cada vez que pides una. Si son 10 millones de galletas, la diferencia es enorme.
:::

Expresión generadora: como una list comprehension pero con paréntesis: `(x * 2 for x in datos)`.

## Iteradores

Todo lo que puedes recorrer con `for` es **iterable**. `iter()` crea un iterador y `next()` pide el siguiente valor:

```python
it = iter(["a", "b"])
print(next(it), next(it))
# next(it) -> StopIteration: no quedan más
```

El módulo `itertools` tiene herramientas muy útiles:

```python
from itertools import islice, groupby, chain
print(list(islice(range(100), 5)))                       # los primeros 5
datos = [("web", 1), ("web", 2), ("app", 3)]
for canal, grupo in groupby(datos, key=lambda x: x[0]):   # agrupa consecutivos (¡ordena antes!)
    print(canal, [g[1] for g in grupo])
```

## Decoradores: envolver funciones

Un **decorador** es una función que recibe otra función y devuelve una versión “mejorada”. Se aplica con `@`:

```python
import time
import functools

def medir_tiempo(func):
    @functools.wraps(func)
    def envoltura(*args, **kwargs):
        inicio = time.perf_counter()
        resultado = func(*args, **kwargs)
        print(f"{func.__name__} tardó {time.perf_counter() - inicio:.4f} s")
        return resultado
    return envoltura

@medir_tiempo
def suma_lenta(n):
    return sum(range(n))

print(suma_lenta(1_000_000))
```

En Airflow escribirás `@task` y `@dag`; en Python verás `@property`, `@dataclass`, `@functools.lru_cache`…

```python
def reintentar(veces):
    """Decorador con parámetros: reintenta la función si falla."""
    def decorador(func):
        @functools.wraps(func)
        def envoltura(*args, **kwargs):
            for intento in range(1, veces + 1):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    print(f"Intento {intento} falló: {e}")
            raise RuntimeError(f"{func.__name__} falló {veces} veces")
        return envoltura
    return decorador
```

## Context managers: with

`with` garantiza que un recurso se “cierre” al terminar, pase lo que pase. Puedes crear los tuyos con `contextlib`:

```python
from contextlib import contextmanager

@contextmanager
def transaccion(nombre):
    print(f"BEGIN {nombre}")
    try:
        yield
        print("COMMIT")
    except Exception as e:
        print(f"ROLLBACK por {e}")
        raise

with transaccion("carga_diaria"):
    print("insertando filas...")
```

## Ejercicios

:::ejercicio python
Escribe el generador `pares_hasta(n)` que produzca (con `yield`) los números pares desde 0 hasta `n` incluido.
```python inicial
def pares_hasta(n):
    pass
```
```python solucion
def pares_hasta(n):
    for i in range(0, n + 1, 2):
        yield i
```
```python test
import types
assert isinstance(pares_hasta(4), types.GeneratorType), "Debe ser un generador (usa yield)"
assert list(pares_hasta(10)) == [0, 2, 4, 6, 8, 10], f"pares_hasta(10) = {list(pares_hasta(10))}"
```
:::

:::ejercicio python
Escribe el generador `lotes(iterable, tamanio)` que agrupe los elementos en listas de `tamanio` elementos (el último lote puede ser más chico).
```python inicial
def lotes(iterable, tamanio):
    pass
```
```python solucion
def lotes(iterable, tamanio):
    lote = []
    for x in iterable:
        lote.append(x)
        if len(lote) == tamanio:
            yield lote
            lote = []
    if lote:
        yield lote
```
```python test
assert list(lotes(range(7), 3)) == [[0, 1, 2], [3, 4, 5], [6]], f"lotes(range(7), 3) = {list(lotes(range(7), 3))}"
assert list(lotes([], 3)) == [], "Con una lista vacía no debe producir lotes"
```
:::

:::ejercicio python
Escribe el decorador `contar_llamadas` que agregue a la función un atributo `llamadas` con la cantidad de veces que fue llamada.
```python inicial
import functools

def contar_llamadas(func):
    pass

@contar_llamadas
def saludar(nombre):
    return f"Hola {nombre}"
```
```python solucion
import functools

def contar_llamadas(func):
    @functools.wraps(func)
    def envoltura(*args, **kwargs):
        envoltura.llamadas += 1
        return func(*args, **kwargs)
    envoltura.llamadas = 0
    return envoltura

@contar_llamadas
def saludar(nombre):
    return f"Hola {nombre}"
```
```python test
inicial = saludar.llamadas
assert saludar("Ana") == "Hola Ana", "La función decorada debe seguir devolviendo su resultado"
saludar("Luis")
assert saludar.llamadas - inicial == 2, f"llamadas debería aumentar en 2"
assert saludar.__name__ == "saludar", "Usa functools.wraps para conservar el nombre"
```
:::
