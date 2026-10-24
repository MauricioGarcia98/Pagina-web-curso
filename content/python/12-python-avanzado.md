---
titulo: Iteradores, generadores, decoradores y context managers
nivel: Avanzado
duracion: 40
resumen: Procesar datos sin cargarlos en memoria, envolver funciones y manejar recursos.
objetivos: Escribir generadores con `yield` para procesar datos a demanda | Explicar el protocolo de iteración | Crear decoradores que agregan comportamiento a funciones (medir tiempo, contar llamadas, reintentar) | Usar y escribir context managers con `with`
prerrequisitos: python-comprensiones | python-clases
autoevaluacion: ¿Puedes escribir un generador que agrupe elementos en lotes de tamaño fijo? | ¿Sabes por qué un generador usa menos memoria que una lista? | ¿Puedes escribir un decorador que mida cuánto tarda una función? | ¿Sabes qué garantiza un bloque `with` aunque ocurra un error? | ¿Reconoces decoradores en el código de Airflow (`@task`, `@dag`)?
---

<!-- estandar:escenario -->
:::escenario El archivo que no entra en memoria
Sofía te pasa un archivo de 8 GB con todos los movimientos de inventario del año:

> "Mi Excel no lo abre y tu script anterior se quedó sin memoria. Necesito el total por depósito."

Cargar todo en una lista no sirve. Los **generadores** procesan los datos **de a uno** (o de a lotes), con muy poca memoria. Y los **decoradores** y **context managers** son las herramientas que hacen elegante el código profesional.
:::
Esta lección cubre cuatro ideas que aparecen en todo el código profesional de datos, aunque al principio no las veas:

| Concepto | Problema que resuelve | Dónde lo vas a ver |
|---|---|---|
| **Generadores** | Procesar datos más grandes que la memoria, de a poco | Leer archivos enormes, paginar APIs; la "evaluación perezosa" de Spark es la misma idea |
| **Iteradores** | Recorrer cualquier cosa con `for` de forma uniforme | Archivos, cursores de bases de datos, resultados de APIs |
| **Decoradores** | Agregar comportamiento a una función sin tocar su código | `@task` y `@dag` en Airflow, `@dataclass`, `@property` |
| **Context managers** | Abrir y cerrar recursos de forma segura | `with open(...)`, conexiones a bases, transacciones, sesiones de Spark |

No hace falta dominarlos para empezar, pero sí reconocerlos: cuando leas el código de un proyecto real, estarán por todos lados.

## Generadores: datos “a demanda”

Imagina un archivo de 20 GB y una computadora con 8 GB de memoria. Si lo lees completo en una lista, el programa se cae. La solución es procesarlo **de a pedazos**: leer un poco, procesarlo, descartarlo y leer el siguiente. Los **generadores** hacen eso de forma natural.

Una función con `yield` (en lugar de `return`) es un **generador**: no calcula todo de una vez, sino que **produce valores de a uno**, solo cuando se le piden, y "se pausa" entre valor y valor recordando dónde estaba.

| `return` | `yield` |
|---|---|
| Devuelve un valor y la función **termina** | Entrega un valor y la función queda **pausada** |
| Si devuelves una lista, toda la lista está en memoria | Solo existe en memoria el valor actual |
| Se ejecuta al llamarla | No se ejecuta nada hasta que alguien pide el primer valor (con `for` o `next`) |

Este ejemplo agrupa una secuencia en **lotes** de 4 (por ejemplo, para insertar en una base de a 1.000 filas, o enviar a una API de a 500 registros):

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

Expresión generadora: como una list comprehension pero con paréntesis: `(x * 2 for x in datos)`. Ya la usaste dentro de `sum(...)`.

:::experto La evaluación perezosa de Spark
Un generador no hace nada hasta que alguien pide un valor: es **perezoso** (*lazy*). Spark funciona igual a gran escala: `df.filter(...).select(...)` no procesa ningún dato, solo **anota** los pasos; recién cuando pides un resultado (`count()`, `show()`, `write`) ejecuta todo de una vez, optimizado. Si entiendes los generadores, entiendes la mitad de Spark.
:::

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

Supón que quieres medir cuánto tarda cada función de tu pipeline, o reintentar automáticamente las que llaman a una API. Podrías copiar el código de medir o reintentar dentro de cada función, pero repetirías lo mismo diez veces. Un **decorador** es una función que **recibe otra función** y devuelve una versión "envuelta" con comportamiento extra, sin modificar su código original. Se aplica escribiendo `@nombre_decorador` encima de la definición.

:::analogia El envoltorio de regalo
El regalo (tu función) no cambia. El decorador lo envuelve: antes de abrirlo pasa algo (empieza el cronómetro), después de abrirlo pasa algo más (lo detiene e imprime el tiempo). Quien lo recibe usa el regalo igual que siempre.
:::

`@medir_tiempo` encima de `def suma_lenta` es exactamente lo mismo que escribir `suma_lenta = medir_tiempo(suma_lenta)` después de definirla. La función `envoltura` recibe cualquier argumento (`*args, **kwargs`), hace algo antes, llama a la original, hace algo después y devuelve el resultado. `functools.wraps` conserva el nombre y la documentación de la función original.

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

Muchos recursos deben **abrirse y cerrarse**: archivos, conexiones a bases de datos, sesiones, transacciones. Si el programa falla en el medio y nadie cierra el recurso, quedan conexiones colgadas o archivos a medio escribir. `with` garantiza que el "cierre" ocurra **siempre**, haya error o no. Ya lo usaste con `open`.

Un objeto que funciona con `with` se llama **context manager**. Puedes crear los tuyos con `contextlib.contextmanager`: lo que va antes del `yield` se ejecuta al **entrar** al bloque `with`, y lo que va después, al **salir**. Este ejemplo simula una transacción: confirma si todo salió bien y "deshace" si hubo un error:

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

<!-- estandar:errores -->
:::errores
- **Consumir un generador dos veces**: la segunda vez está vacío. Si necesitas recorrerlo de nuevo, vuelve a crearlo.
- **Convertir el generador en lista "para ver qué tiene"**: `list(gen)` con 8 GB de datos vuelve a llenar la memoria.
- **Decoradores que pierden el nombre de la función**: sin `@functools.wraps`, la función decorada se llama `wrapper` en los logs y los tracebacks.
:::

<!-- estandar:trabajo -->
:::trabajo
- Leer archivos grandes por partes (`for linea in archivo:`), paginar APIs con un generador y enviar a la base en **lotes** de 1.000 filas son patrones de todos los días.
- Los decoradores están en todas las herramientas de datos: `@task` y `@dag` en Airflow, `@pytest.fixture` en tests, `@F.udf` en PySpark, `@retry` de tenacity.
:::

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
