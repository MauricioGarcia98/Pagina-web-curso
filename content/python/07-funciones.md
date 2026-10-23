---
titulo: Funciones
nivel: Intermedio
duracion: 30
resumen: def, parámetros, valores por defecto, return, alcance, *args/**kwargs, lambda y docstrings.
---

Una **función** es un bloque de código con nombre que puedes reutilizar. Recibe datos (**parámetros**), hace algo y puede **devolver** un resultado.

```python
def precio_final(precio, descuento=0.0, iva=0.21):
    """Devuelve el precio con descuento e IVA, redondeado a 2 decimales."""
    con_descuento = precio * (1 - descuento)
    return round(con_descuento * (1 + iva), 2)

print(precio_final(100))                   # usa los valores por defecto
print(precio_final(100, 0.1))              # argumentos posicionales
print(precio_final(100, iva=0.0))          # argumentos por nombre
```

- `def` define la función; el bloque va indentado.
- `return` devuelve el resultado y **termina** la función. Sin `return`, la función devuelve `None`.
- El texto entre `"""` es un **docstring**: documentación que aparece con `help(precio_final)`.

:::cuidado print no es return
`print` muestra algo en pantalla; `return` entrega un valor para que lo use quien llamó a la función. En los ejercicios y en código real, casi siempre quieres `return`.
:::

## Varias salidas

Una función puede devolver varios valores (en realidad, una tupla):

```python
def estadisticas(numeros):
    return min(numeros), max(numeros), sum(numeros) / len(numeros)

minimo, maximo, promedio = estadisticas([4, 8, 15, 16, 23, 42])
print(minimo, maximo, promedio)
```

## Alcance (scope)

Las variables creadas **dentro** de una función son locales: no existen fuera.

```python
def f():
    x = 10
    return x * 2
print(f())
# print(x)  -> NameError: x no existe aquí afuera
```

## Parámetros flexibles: *args y **kwargs

```python
def total(*montos):                  # recibe cualquier cantidad de argumentos en una tupla
    return sum(montos)

def ficha(**datos):                  # recibe argumentos por nombre en un diccionario
    return ", ".join(f"{k}={v}" for k, v in datos.items())

print(total(10, 20, 30))
print(ficha(nombre="Eva", pais="Perú"))
```

:::cuidado Valores por defecto mutables
Nunca uses una lista como valor por defecto: `def agregar(x, lista=[])`. La lista se crea **una sola vez** y se comparte entre llamadas. Usa `lista=None` y adentro `if lista is None: lista = []`.
:::

## lambda: funciones de una línea

Útiles como argumento de otras funciones (por ejemplo, para ordenar):

```python
productos = [("Mouse", 25), ("Monitor", 210), ("Cable", 4.5)]
print(sorted(productos, key=lambda p: p[1]))              # por precio
print(sorted(productos, key=lambda p: p[1], reverse=True))
```

## Type hints (anotaciones de tipo)

Python no obliga a declarar tipos, pero puedes **anotarlos** para documentar y para que herramientas como `mypy` o tu editor detecten errores:

```python
def iva(precio: float, tasa: float = 0.21) -> float:
    return precio * tasa
print(iva(100))
```

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
