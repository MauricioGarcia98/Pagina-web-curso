---
titulo: Comprensiones y funciones de orden superior
nivel: Intermedio
duracion: 30
resumen: List/dict/set comprehensions, any/all, map/filter y el estilo "pythónico".
---

## Transformar colecciones en una línea

Muchísimo código de datos tiene esta forma: "crea una lista vacía, recorre otra lista, transforma o filtra cada elemento y agrégalo". Python tiene una sintaxis compacta para eso: las **comprensiones** (*comprehensions*). Son uno de los rasgos más queridos del lenguaje porque se leen casi como una frase.

Compara las dos versiones, que hacen exactamente lo mismo:

```python
precios = [100, 250, 80, 40]

# Con un for clásico
con_iva = []
for p in precios:
    con_iva.append(round(p * 1.21, 2))

# Con una comprensión
con_iva_2 = [round(p * 1.21, 2) for p in precios]

print(con_iva, con_iva_2)
```

## La anatomía de una list comprehension

```text
[ expresión        for elemento in colección     if condición ]
  qué guardo       de dónde saco cada valor      (opcional) cuáles
```

Se lee: "**la lista de** `expresión` **para cada** `elemento` **en** `colección` **si** `condición`".

```python
precios = [100, 250, 80, 40]
con_iva   = [round(p * 1.21, 2) for p in precios]                 # transformar (como SELECT con un cálculo)
caros     = [p for p in precios if p > 90]                         # filtrar (como WHERE)
etiquetas = ["caro" if p > 90 else "barato" for p in precios]     # clasificar (como CASE WHEN)
print(con_iva, caros, etiquetas)
```

:::cuidado Dónde va cada if
- `[p for p in precios if p > 90]` → el `if` va **al final** y **filtra**: la lista resultante es más corta.
- `["caro" if p > 90 else "barato" for p in precios]` → el `if … else` va **al principio**, es parte de la expresión y **transforma**: la lista tiene el mismo largo.
Mezclarlos es el error más común con comprensiones.
:::

Fíjate en el paralelo con SQL: una comprensión hace en una línea lo que `SELECT expresión FROM colección WHERE condición` hace en una consulta. Es la misma idea, en Python.

## Dict y set comprehensions

La misma sintaxis, con llaves:

```python
productos = ["mouse", "teclado", "monitor"]
largos = {p: len(p) for p in productos}            # dict: clave: valor
iniciales = {p[0] for p in productos}              # set: valores únicos
stock = {"mouse": 40, "teclado": 0, "monitor": 7}
agotados = [k for k, v in stock.items() if v == 0]
precios_ars = {k: v * 1000 for k, v in {"mouse": 25, "monitor": 210}.items()}
print(largos, iniciales, agotados, precios_ars)
```

Un uso muy práctico: **invertir** o **reindexar** datos. Si tienes una lista de clientes (diccionarios) y quieres buscarlos por id al instante: `por_id = {c["id"]: c for c in clientes}`.

## Expresiones generadoras: sin crear la lista

Si solo vas a **sumar**, **contar** o preguntar "¿alguno?/¿todos?", no hace falta construir la lista completa en memoria. Quita los corchetes y pasa la expresión directamente a la función:

```python
ventas = [{"monto": 100, "pais": "Chile"}, {"monto": 50, "pais": "Perú"}, {"monto": 70, "pais": "Chile"}]
total_chile = sum(v["monto"] for v in ventas if v["pais"] == "Chile")   # 170
cantidad_chile = sum(1 for v in ventas if v["pais"] == "Chile")         # contar: 2
print(total_chile, cantidad_chile)
print(any(v["monto"] > 90 for v in ventas))   # ¿alguno cumple?   → True
print(all(v["monto"] > 10 for v in ventas))   # ¿todos cumplen?   → True
print(max(v["monto"] for v in ventas))        # el mayor          → 100
```

Esto se llama **expresión generadora**: produce los valores de a uno, a medida que la función los pide. Con millones de elementos ahorra mucha memoria (lo verás en detalle con generadores en Python avanzado).

| Función | Pregunta | Equivalente SQL |
|---|---|---|
| `sum(… for …)` | Suma | `SUM` |
| `sum(1 for … if …)` | Cuántos cumplen | `COUNT(*) … WHERE` |
| `any(…)` | ¿Al menos uno? | `EXISTS` |
| `all(…)` | ¿Todos? | `NOT EXISTS (… que no cumpla)` |
| `max`, `min` | Extremos | `MAX`, `MIN` |

## Las funciones también son valores

En Python una función es un valor más: puedes guardarla en una variable, ponerla en una lista o **pasarla como argumento** a otra función. Las funciones que reciben funciones se llaman **de orden superior**. Ya usaste una: `sorted(…, key=función)`.

```python
def a_mayusculas(s):
    return s.upper()

nombres = ["ana", "luis", "andrea"]
print(list(map(a_mayusculas, nombres)))                        # aplica la función a cada elemento
print(list(filter(lambda n: n.startswith("a"), nombres)))      # deja los que cumplen
reglas = [str.strip, str.lower]                                # una lista de funciones
texto = "  Hola MUNDO "
for regla in reglas:
    texto = regla(texto)
print(repr(texto))
```

`map` y `filter` vienen de la programación funcional y existen en muchos lenguajes (en PySpark los verás con RDD). En Python, las comprensiones suelen ser más legibles: `[a_mayusculas(n) for n in nombres]` en vez de `list(map(…))`.

El último ejemplo (una lista de funciones aplicadas en orden) es la idea de un **pipeline de limpieza configurable**: cada regla es una función, y agregar una regla es agregar un elemento a la lista.

## Comprensiones anidadas

Puedes tener más de un `for`. Se leen en el mismo orden que los `for` anidados:

```python
pedidos = [{"id": 1, "items": ["A", "B"]}, {"id": 2, "items": ["C"]}]
lineas = [(p["id"], item) for p in pedidos for item in p["items"]]   # aplanar
print(lineas)   # [(1, 'A'), (1, 'B'), (2, 'C')]
```

Eso es **aplanar** datos anidados (como `explode` en Spark): una fila por cada item de cada pedido.

:::tip ¿Cuándo NO usar comprensiones?
Si no entra cómodamente en una línea, tiene varios `if`/`else` anidados, o necesitas manejar errores (`try`), usa un `for` normal. Una comprensión ilegible es peor que cinco líneas claras. La regla de Python: **la legibilidad cuenta**.
:::

## Resumen

- `[expr for x in col if cond]`: transformar y filtrar en una línea (es un `SELECT … WHERE`).
- `if` al final filtra; `a if cond else b` al principio transforma.
- `{k: v for …}` crea diccionarios; `{x for …}` crea conjuntos.
- Sin corchetes, dentro de `sum`/`any`/`all`/`max`, es una expresión generadora: no crea la lista.
- Las funciones son valores: se pasan como argumento (`sorted(key=…)`, `map`, `filter`).

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
