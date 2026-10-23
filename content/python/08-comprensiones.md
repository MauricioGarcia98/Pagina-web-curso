---
titulo: Comprensiones y funciones de orden superior
nivel: Intermedio
duracion: 25
resumen: List/dict/set comprehensions, any/all, map/filter y el estilo "pythónico".
---

Las **comprensiones** crean colecciones en una sola línea legible. Son uno de los rasgos más queridos de Python.

## List comprehension

```python
precios = [100, 250, 80, 40]
con_iva = [round(p * 1.21, 2) for p in precios]
caros = [p for p in precios if p > 90]
etiquetas = ["caro" if p > 90 else "barato" for p in precios]
print(con_iva, caros, etiquetas)
```

Se lee: “**[expresión] para cada elemento en la colección [si se cumple la condición]**”. Equivale a un `for` con `append`, pero más corto y (un poco) más rápido.

## Dict y set comprehension

```python
productos = ["mouse", "teclado", "monitor"]
largos = {p: len(p) for p in productos}
iniciales = {p[0] for p in productos}
stock = {"mouse": 40, "teclado": 0, "monitor": 7}
agotados = [k for k, v in stock.items() if v == 0]
print(largos, iniciales, agotados)
```

## Generadores en funciones de agregación

Si solo vas a sumar o contar, no hace falta crear la lista: usa una expresión generadora (sin corchetes):

```python
ventas = [{"monto": 100, "pais": "Chile"}, {"monto": 50, "pais": "Perú"}, {"monto": 70, "pais": "Chile"}]
total_chile = sum(v["monto"] for v in ventas if v["pais"] == "Chile")
print(total_chile)
print(any(v["monto"] > 90 for v in ventas))   # ¿alguno cumple?
print(all(v["monto"] > 10 for v in ventas))   # ¿todos cumplen?
```

## map, filter y funciones como valores

En Python las funciones son valores: se pueden pasar como argumento. `map` y `filter` existen, aunque las comprensiones suelen ser más legibles:

```python
def a_mayusculas(s):
    return s.upper()
nombres = ["ana", "luis"]
print(list(map(a_mayusculas, nombres)))
print(list(filter(lambda n: n.startswith("a"), nombres)))
```

:::tip ¿Cuándo NO usar comprensiones?
Si la lógica no entra cómodamente en una línea, o tiene varios `if`/`else` anidados, usa un `for` normal. La legibilidad manda.
:::

## Ejercicios

:::ejercicio python
Con una comprensión, crea `cuadrados_pares`: los cuadrados de los números **pares** del 1 al 20.
```python solucion
cuadrados_pares = [n * n for n in range(1, 21) if n % 2 == 0]
```
```python test
assert cuadrados_pares == [4, 16, 36, 64, 100, 144, 196, 256, 324, 400], f"cuadrados_pares = {cuadrados_pares}"
```
:::

:::ejercicio python
De la lista `filas` (textos CSV `"nombre,edad"`), crea con una comprensión la lista de diccionarios `personas` con claves `nombre` y `edad` (entero), **solo para mayores de edad** (18 o más).
```python inicial
filas = ["Ana,34", "Luis,17", "Eva,22", "Tom,15", "Sol,18"]
```
```python solucion
filas = ["Ana,34", "Luis,17", "Eva,22", "Tom,15", "Sol,18"]
personas = [{"nombre": f.split(",")[0], "edad": int(f.split(",")[1])} for f in filas if int(f.split(",")[1]) >= 18]
```
```python test
assert personas == [{"nombre": "Ana", "edad": 34}, {"nombre": "Eva", "edad": 22}, {"nombre": "Sol", "edad": 18}], f"personas = {personas}"
```
:::

:::ejercicio python
Crea `precio_por_sku`, un diccionario `{sku: precio}` solo con los productos **activos**, usando una dict comprehension.
```python inicial
catalogo = [
    {"sku": "A1", "precio": 10.0, "activo": True},
    {"sku": "B2", "precio": 25.5, "activo": False},
    {"sku": "C3", "precio": 7.25, "activo": True},
]
```
```python solucion
catalogo = [
    {"sku": "A1", "precio": 10.0, "activo": True},
    {"sku": "B2", "precio": 25.5, "activo": False},
    {"sku": "C3", "precio": 7.25, "activo": True},
]
precio_por_sku = {p["sku"]: p["precio"] for p in catalogo if p["activo"]}
```
```python test
assert precio_por_sku == {"A1": 10.0, "C3": 7.25}, f"precio_por_sku = {precio_por_sku}"
```
:::
