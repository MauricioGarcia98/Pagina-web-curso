---
titulo: Funciones
nivel: Intermedio
duracion: 40
resumen: def, parámetros, valores por defecto, return, alcance, *args/**kwargs, lambda y docstrings.
---

## Por qué existen las funciones

Imagina que calculas el precio final (con descuento e IVA) en diez lugares de tu programa. Un día cambia el IVA: tienes que encontrar y corregir los diez, y seguro se te escapa uno. Una **función** resuelve eso: escribes la lógica **una vez**, le pones un nombre, y la usas (la "llamas") donde la necesites. Si la regla cambia, la corriges en un solo lugar.

Las funciones son también la forma de **organizar** un programa: en vez de 500 líneas seguidas, tienes piezas con nombres que explican qué hacen (`leer_archivo`, `limpiar_emails`, `calcular_mora`) y que se pueden **probar** por separado.

:::analogia Una máquina con entradas y salida
Una función es como una máquina de jugos: por arriba entran ingredientes (los **parámetros**), adentro pasa algo, y por abajo sale el jugo (el valor que **devuelve**). No necesitas saber cómo funciona por dentro para usarla: solo qué le das y qué te devuelve.
:::

## Definir y llamar una función

```python
def precio_final(precio, descuento=0.0, iva=0.21):
    """Devuelve el precio con descuento e IVA, redondeado a 2 decimales."""
    con_descuento = precio * (1 - descuento)
    return round(con_descuento * (1 + iva), 2)

print(precio_final(100))                   # usa los valores por defecto → 121.0
print(precio_final(100, 0.1))              # argumentos posicionales     → 108.9
print(precio_final(100, iva=0.0))          # argumentos por nombre       → 100.0
```

| Parte | Qué es |
|---|---|
| `def` | Palabra clave para **definir** una función |
| `precio_final` | El nombre (en `snake_case`, idealmente un verbo o lo que calcula) |
| `(precio, descuento=0.0, iva=0.21)` | Los **parámetros**: las entradas. `descuento` e `iva` tienen **valores por defecto** |
| `"""…"""` | El **docstring**: documentación de la función (aparece con `help(precio_final)`) |
| `return …` | Lo que la función **devuelve** a quien la llamó |

**Definir** una función no la ejecuta: solo la "guarda". Se ejecuta cuando la **llamas** escribiendo su nombre con paréntesis: `precio_final(100)`. Los valores que pasas en la llamada se llaman **argumentos**.

### Tres formas de pasar argumentos

- **Posicional**: por orden. `precio_final(100, 0.1)` → `precio=100`, `descuento=0.1`.
- **Por nombre** (*keyword*): `precio_final(100, iva=0.0)`. Más claro cuando hay varios parámetros, y permite saltear los del medio.
- **Omitir** los que tienen valor por defecto.

Los parámetros con valor por defecto van **después** de los que no lo tienen.

## return: devolver un resultado

`return` hace dos cosas: **entrega** el valor y **termina** la función (lo que esté debajo no se ejecuta). Una función sin `return` devuelve `None`.

:::cuidado print no es return
`print` **muestra** algo en pantalla, pero el valor se pierde: no lo puedes guardar ni usar en otra cuenta. `return` **entrega** el valor a quien llamó, que puede guardarlo (`total = precio_final(100)`), sumarlo o pasarlo a otra función. En los ejercicios y en el código real, una función que calcula algo casi siempre usa `return`. Si después quieres verlo, imprimes el resultado afuera.
:::

### Salir temprano: cláusulas de guarda

Un `return` dentro de un `if` permite resolver los casos especiales al principio y dejar el caso normal sin anidar:

```python
def tasa_conversion(compras, visitas):
    if not visitas:              # guarda: evita dividir por cero
        return None
    return round(100 * compras / visitas, 2)

print(tasa_conversion(5, 200), tasa_conversion(5, 0))
```

## Devolver varios valores

```python
def estadisticas(numeros):
    return min(numeros), max(numeros), sum(numeros) / len(numeros)

minimo, maximo, promedio = estadisticas([4, 8, 15, 16, 23, 42])
print(minimo, maximo, promedio)
```

En realidad devuelve **una tupla** `(4, 42, 18.0)`, que se desempaqueta en tres variables.

## Alcance (scope): qué variables ve cada parte

Las variables creadas **dentro** de una función son **locales**: nacen cuando la función se ejecuta y desaparecen cuando termina. No existen afuera.

```python
def f():
    x = 10           # x es local de f
    return x * 2

print(f())
# print(x)  -> NameError: name 'x' is not defined
```

Esto es una ventaja: cada función es una caja cerrada, y dos funciones pueden usar una variable `total` sin pisarse. Una función **puede leer** variables definidas afuera (globales), pero depender de ellas hace el código frágil. La regla de oro: **todo lo que una función necesita, que entre por parámetros; todo lo que produce, que salga por `return`**. Esas funciones se llaman **puras**, y son las más fáciles de probar y reutilizar (en el módulo de casos de punta a punta verás por qué importan tanto).

## Parámetros flexibles: *args y **kwargs

```python
def total(*montos):                  # cualquier cantidad de argumentos → llegan en una tupla
    return sum(montos)

def ficha(**datos):                  # cualquier argumento por nombre → llega en un diccionario
    return ", ".join(f"{k}={v}" for k, v in datos.items())

print(total(10, 20, 30))
print(ficha(nombre="Eva", pais="Perú"))
```

Los verás mucho en librerías (por ejemplo, los operadores de Airflow aceptan `**kwargs`). Los nombres `args` y `kwargs` son convención; lo que importa son los asteriscos.

:::cuidado Valores por defecto mutables
Nunca uses una lista o diccionario como valor por defecto: `def agregar(x, lista=[])`. La lista se crea **una sola vez**, cuando se define la función, y se **comparte** entre todas las llamadas: los datos de una llamada aparecen en la siguiente. Usa `lista=None` y adentro `if lista is None: lista = []`.
:::

## lambda: funciones de una línea

Una `lambda` es una función pequeña, sin nombre, que se escribe en una línea. Se usa sobre todo como **argumento** de otra función, por ejemplo para indicar por qué ordenar:

```python
productos = [("Mouse", 25), ("Monitor", 210), ("Cable", 4.5)]
print(sorted(productos, key=lambda p: p[1]))              # por precio
print(sorted(productos, key=lambda p: p[1], reverse=True))
```

`lambda p: p[1]` equivale a `def f(p): return p[1]`. Si la lógica no entra cómoda en una línea, usa un `def` normal.

## Type hints: documentar los tipos

Python no obliga a declarar tipos, pero puedes **anotarlos**. No cambian cómo se ejecuta el código; documentan y permiten que tu editor y herramientas como `mypy` detecten errores antes de ejecutar:

```python
def iva(precio: float, tasa: float = 0.21) -> float:
    return precio * tasa

print(iva(100))
```

Se lee: "`precio` es un `float`, `tasa` es un `float` con valor por defecto 0.21, y la función devuelve un `float`". En proyectos profesionales de datos son casi obligatorios.

## Cómo escribir buenas funciones

| Práctica | Por qué |
|---|---|
| Una función, **una** tarea | `limpiar_email` y `validar_email`, no `limpiar_y_validar_y_guardar` |
| Nombres que dicen qué hacen | `calcular_dias_atraso(…)` se entiende sin leer el código |
| Pocos parámetros (≤ 4–5) | Muchos parámetros suelen indicar que hace demasiado |
| Docstring en las funciones importantes | Qué recibe, qué devuelve, qué supuestos tiene |
| Sin efectos escondidos | No modificar variables globales ni las listas que recibe |

## Resumen

- `def nombre(parámetros):` define; `nombre(argumentos)` ejecuta.
- `return` entrega el valor y termina la función; `print` solo muestra.
- Argumentos posicionales, por nombre y valores por defecto (nunca listas como defecto).
- Variables locales: lo que entra por parámetros, lo que sale por `return`.
- `lambda` para funciones cortas como argumento; type hints para documentar tipos.

## Ejercicios

:::ejercicio python
Escribe una función `es_par(n)` que **devuelva** `True` si `n` es par y `False` si no.
```python inicial
def es_par(n):
    pass  # reemplaza esta línea
```
```python solucion
def es_par(n):
    return n % 2 == 0
```
```python test
assert es_par(4) is True and es_par(7) is False and es_par(0) is True, "es_par no devuelve lo correcto"
```
:::

:::ejercicio python
Escribe `normalizar_email(email)` que quite espacios, pase a minúsculas y devuelva `None` si el email está vacío, es `None` o no contiene `@`.
```python inicial
def normalizar_email(email):
    pass
```
```python solucion
def normalizar_email(email):
    if not email:
        return None
    email = email.strip().lower()
    if "@" not in email:
        return None
    return email
```
```python test
assert normalizar_email("  Ana@Mail.COM ") == "ana@mail.com", "No normaliza bien"
assert normalizar_email(None) is None, "Con None debe devolver None"
assert normalizar_email("") is None, "Con '' debe devolver None"
assert normalizar_email("sin-arroba") is None, "Sin @ debe devolver None"
```
:::

:::ejercicio python
Escribe `resumen(numeros)` que devuelva un **diccionario** con las claves `"n"`, `"suma"`, `"promedio"` (redondeado a 2) y `"maximo"`. Si la lista está vacía, devuelve `{"n": 0, "suma": 0, "promedio": None, "maximo": None}`.
```python inicial
def resumen(numeros):
    pass
```
```python solucion
def resumen(numeros):
    if not numeros:
        return {"n": 0, "suma": 0, "promedio": None, "maximo": None}
    return {
        "n": len(numeros),
        "suma": sum(numeros),
        "promedio": round(sum(numeros) / len(numeros), 2),
        "maximo": max(numeros),
    }
```
```python test
assert resumen([3, 4, 8]) == {"n": 3, "suma": 15, "promedio": 5.0, "maximo": 8}, f"resumen([3,4,8]) = {resumen([3,4,8])}"
assert resumen([]) == {"n": 0, "suma": 0, "promedio": None, "maximo": None}, "Caso lista vacía incorrecto"
```
:::

:::ejercicio python
Ordena la lista `empleados` (tuplas `(nombre, area, salario)`) por **área** alfabéticamente y, dentro de cada área, por **salario de mayor a menor**. Guarda el resultado en `ordenados`. Pista: `key` puede devolver una tupla.
```python inicial
empleados = [("Ana", "Datos", 4100), ("Luis", "Ventas", 2800), ("Eva", "Datos", 4500), ("Leo", "Ventas", 3200), ("Sol", "Admin", 3000)]
```
```python solucion
empleados = [("Ana", "Datos", 4100), ("Luis", "Ventas", 2800), ("Eva", "Datos", 4500), ("Leo", "Ventas", 3200), ("Sol", "Admin", 3000)]
ordenados = sorted(empleados, key=lambda e: (e[1], -e[2]))
```
```python test
assert [e[0] for e in ordenados] == ["Sol", "Eva", "Ana", "Leo", "Luis"], f"Orden obtenido: {[e[0] for e in ordenados]}"
```
```pista
`key=lambda e: (e[1], -e[2])` ordena por área y luego por salario negativo (o sea, de mayor a menor).
```
:::
