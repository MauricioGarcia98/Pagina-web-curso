---
titulo: Listas y tuplas
nivel: Básico
duracion: 25
resumen: Guardar colecciones ordenadas, agregar, quitar, ordenar y recortar.
---

Una **lista** guarda varios valores **en orden**. Se escribe con corchetes:

```python
ventas = [120, 340, 90, 560]
nombres = ["Ana", "Luis", "Eva"]
mezcla = [1, "dos", 3.0, True, None]   # puede mezclar tipos (no es buena idea)
vacia = []
print(len(ventas), ventas[0], ventas[-1], ventas[1:3])
```

## Modificar listas

Las listas son **mutables** (se pueden cambiar):

```python
carrito = ["mouse", "teclado"]
carrito.append("monitor")          # agrega al final
carrito.insert(0, "webcam")        # agrega en una posición
carrito.remove("teclado")          # quita por valor
ultimo = carrito.pop()             # quita y devuelve el último
carrito[0] = "webcam HD"           # reemplaza
carrito.extend(["cable", "hub"])   # agrega varios
print(carrito, ultimo)
```

## Funciones útiles

```python
numeros = [5, 3, 9, 1, 7]
print(sum(numeros), min(numeros), max(numeros))
print(sorted(numeros))                 # nueva lista ordenada
print(sorted(numeros, reverse=True))   # de mayor a menor
numeros.sort()                         # ordena la misma lista (no devuelve nada)
print(numeros, 9 in numeros, numeros.index(9), numeros.count(3))
```

:::cuidado sort() vs sorted()
`lista.sort()` modifica la lista y devuelve `None`. Un error típico: `lista = lista.sort()` → ¡pierdes la lista! Usa `sorted(lista)` si quieres una copia ordenada.
:::

## Copiar listas: la trampa de las referencias

```python
a = [1, 2, 3]
b = a          # ¡b es la MISMA lista, no una copia!
b.append(4)
print(a)       # [1, 2, 3, 4]  😱
c = a.copy()   # o list(a), o a[:]
c.append(5)
print(a, c)
```

## Listas de listas

```python
tabla = [
    ["Ana", "Chile", 3],
    ["Luis", "Perú", 5],
]
for nombre, pais, compras in tabla:     # desempaquetado
    print(nombre, "de", pais, "hizo", compras, "compras")
```

## Tuplas

Una **tupla** es como una lista pero **inmutable** (no se puede modificar). Se usa para registros fijos:

```python
punto = (-34.6, -58.4)           # latitud, longitud
lat, lon = punto                 # desempaquetado
registro = ("2024-03-15", "web", 120.5)
print(lat, lon, registro[1])
```

## Ejercicios

:::ejercicio python
Dada `ventas = [120, 340, 90, 560, 210]`, calcula en `promedio` el promedio (usa `sum` y `len`) y en `top3` una lista con los **3 valores más altos** de mayor a menor.
```python inicial
ventas = [120, 340, 90, 560, 210]
```
```python solucion
ventas = [120, 340, 90, 560, 210]
promedio = sum(ventas) / len(ventas)
top3 = sorted(ventas, reverse=True)[:3]
```
```python test
assert promedio == 264, f"promedio debería ser 264 y es {promedio}"
assert top3 == [560, 340, 210], f"top3 debería ser [560, 340, 210] y es {top3}"
```
:::

:::ejercicio python
Partiendo de `cola = ["pedido1", "pedido2"]`: agrega `"pedido3"` al final, saca el **primero** de la cola guardándolo en `procesado` (usa `pop(0)`) y agrega `"urgente"` al **inicio**.
```python inicial
cola = ["pedido1", "pedido2"]
```
```python solucion
cola = ["pedido1", "pedido2"]
cola.append("pedido3")
procesado = cola.pop(0)
cola.insert(0, "urgente")
```
```python test
assert procesado == "pedido1", f"procesado debería ser 'pedido1' y es {procesado!r}"
assert cola == ["urgente", "pedido2", "pedido3"], f"cola quedó {cola}"
```
:::

:::ejercicio python
Tienes una lista de registros `(producto, unidades, precio)`. Calcula en `facturacion` el total (unidades × precio de cada uno) y en `mas_vendido` el nombre del producto con **más unidades**.
```python inicial
registros = [("Mouse", 12, 25.0), ("Teclado", 5, 49.9), ("Monitor", 3, 210.0), ("Cable", 30, 4.5)]
```
```python solucion
registros = [("Mouse", 12, 25.0), ("Teclado", 5, 49.9), ("Monitor", 3, 210.0), ("Cable", 30, 4.5)]
facturacion = 0
mas_vendido = None
max_unidades = -1
for producto, unidades, precio in registros:
    facturacion += unidades * precio
    if unidades > max_unidades:
        max_unidades = unidades
        mas_vendido = producto
```
```python test
assert abs(facturacion - 1314.5) < 1e-6, f"facturacion debería ser 1314.5 y es {facturacion}"
assert mas_vendido == "Cable", f"mas_vendido debería ser 'Cable' y es {mas_vendido!r}"
```
:::
