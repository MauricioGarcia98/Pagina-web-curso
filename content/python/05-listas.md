---
titulo: Listas y tuplas
nivel: Básico
duracion: 35
resumen: Guardar colecciones ordenadas, agregar, quitar, ordenar y recortar.
objetivos: Crear listas, leer elementos por posición y modificar su contenido | Usar `len`, `sum`, `min`, `max`, `sorted` y slices para analizar una lista | Evitar la trampa de las referencias al copiar listas | Representar registros con tuplas y tablas con listas de tuplas
prerrequisitos: python-bucles
autoevaluacion: ¿Puedes calcular el promedio y el máximo de una lista de ventas? | ¿Sabes qué diferencia hay entre `append` y `extend`? | ¿Sabes por qué `b = a` no copia la lista y cómo copiarla de verdad? | ¿Puedes ordenar una lista de tuplas por su segundo elemento? | ¿Sabes cuándo conviene una tupla en lugar de una lista?
---

<!-- estandar:escenario -->
:::escenario La cola de pedidos
Sofía, de operaciones, administra la cola de pedidos a despachar:

> "Los pedidos entran al final y salen por el principio. A veces hay que sacar uno del medio porque se canceló. ¿Me ayudas a modelarlo? Y quiero saber el promedio y el máximo de unidades por pedido."

Una **lista** guarda muchos valores en orden bajo un solo nombre. Es la estructura más usada de Python, y la base para entender cómo se representan tablas en memoria.
:::
## Muchos valores bajo un mismo nombre

Una variable guarda **un** valor. Pero los datos casi siempre vienen en grupos: las ventas del mes, los emails de los clientes, las líneas de un archivo. Una **lista** guarda varios valores **en orden** bajo un solo nombre. Es la estructura de datos más usada de Python.

```python
ventas = [120, 340, 90, 560]
nombres = ["Ana", "Luis", "Eva"]
mezcla = [1, "dos", 3.0, True, None]   # puede mezclar tipos (casi nunca conviene)
vacia = []
print(len(ventas), ventas[0], ventas[-1], ventas[1:3])
```

- Se escribe con **corchetes** `[ ]` y los elementos separados por comas.
- `len(lista)` da la cantidad de elementos.
- Los índices funcionan **igual que en los strings**: empiezan en 0, `-1` es el último, y `lista[1:3]` es un *slice* con las posiciones 1 y 2.

:::analogia Una fila de casilleros numerados
Una lista es una fila de casilleros con números grabados desde el 0. Cada casillero guarda un valor. Puedes abrir el casillero 2 (`ventas[2]`), cambiar su contenido, agregar casilleros al final o sacar alguno (y los de la derecha se corren).
:::

Si pides un índice que no existe, Python avisa: `ventas[10]` → `IndexError: list index out of range`.

## Modificar listas

A diferencia de los strings, las listas son **mutables**: se pueden cambiar sin crear una nueva.

```python
carrito = ["mouse", "teclado"]
carrito.append("monitor")          # agrega AL FINAL               → ['mouse', 'teclado', 'monitor']
carrito.insert(0, "webcam")        # agrega en una posición       → ['webcam', 'mouse', 'teclado', 'monitor']
carrito.remove("teclado")          # quita la primera aparición de ese VALOR
ultimo = carrito.pop()             # quita y DEVUELVE el último   → 'monitor'
carrito[0] = "webcam HD"           # reemplaza por posición
carrito.extend(["cable", "hub"])   # agrega varios elementos
print(carrito, ultimo)
```

| Operación | Qué hace | Ojo |
|---|---|---|
| `lista.append(x)` | Agrega `x` al final | La más usada: construir una lista en un bucle |
| `lista.insert(i, x)` | Agrega en la posición `i` | Lento en listas enormes |
| `lista.extend(otra)` | Agrega todos los elementos de `otra` | `append(otra)` agregaría la lista entera como UN elemento |
| `lista.remove(x)` | Quita la primera aparición de `x` | `ValueError` si no está |
| `lista.pop()` / `pop(i)` | Quita y devuelve el último / el de la posición `i` | |
| `lista[i] = x` | Reemplaza | |
| `del lista[i]` | Borra por posición | |

## Funciones y métodos útiles

```python
numeros = [5, 3, 9, 1, 7]
print(sum(numeros), min(numeros), max(numeros))   # 25 1 9
print(sorted(numeros))                 # NUEVA lista ordenada: [1, 3, 5, 7, 9]
print(sorted(numeros, reverse=True))   # de mayor a menor
numeros.sort()                         # ordena LA MISMA lista (no devuelve nada)
print(numeros, 9 in numeros, numeros.index(9), numeros.count(3))
```

Con esto ya puedes calcular un promedio: `sum(numeros) / len(numeros)` (¡cuidado con la lista vacía: división por cero!).

:::cuidado sort() vs sorted()
`lista.sort()` **modifica** la lista y devuelve `None`. `sorted(lista)` **devuelve una lista nueva** y deja la original intacta. El error típico es `lista = lista.sort()`: guardas `None` y pierdes la lista. Regla: si quieres conservar el original o encadenar, usa `sorted`.
:::

### Ordenar por un criterio: key

`sorted` acepta `key=`, una función que dice **por qué** ordenar:

```python
nombres = ["valentina", "Ana", "luis", "Bruno"]
print(sorted(nombres))                    # mayúsculas primero: ['Ana', 'Bruno', 'luis', 'valentina']
print(sorted(nombres, key=str.lower))     # ignorando mayúsculas
print(sorted(nombres, key=len))           # por largo
```

Lo usarás muchísimo con listas de diccionarios o tuplas: "ordena los clientes por total gastado" (`key=lambda c: c["total"]`, lo verás en funciones).

## Copiar listas: la trampa de las referencias

Esto sorprende a todos la primera vez:

```python
a = [1, 2, 3]
b = a          # ¡b NO es una copia: es otro nombre para LA MISMA lista!
b.append(4)
print(a)       # [1, 2, 3, 4]  😱 a también cambió
c = a.copy()   # copia de verdad (también list(a) o a[:])
c.append(5)
print(a, c)    # a no cambia
```

Recuerda la analogía de las etiquetas: `b = a` pega una **segunda etiqueta** sobre la misma lista, no fabrica una lista nueva. Con números o textos no lo notas porque son inmutables (no se pueden modificar "en el lugar"), pero con listas y diccionarios sí. Por eso, si una función recibe una lista y la modifica, **modifica la del que la llamó**: un error difícil de encontrar.

```recorrido
titulo: Dos nombres, una sola lista: la trampa de las referencias
estacion crear: Crear | icono=cubo
estacion asignar: b = a | icono=flujo
estacion cambiar: Cambiar b | icono=transformar
estacion sorpresa: La sorpresa | icono=alerta
estacion copia: .copy() | icono=check
paso crear: Se crea una lista
`a` es un **nombre** que apunta a una lista guardada en memoria.
>>> texto
a ──▶ ["sql", "python"]
paso asignar: b = a no copia
Asignar no crea otra lista: `b` es **otro nombre para la misma lista**.
>>> texto
a ──┐
    ├──▶ ["sql", "python"]
b ──┘
paso cambiar: Se modifica "b"
`b.append("spark")` modifica la lista a la que apunta `b`… que es la misma de `a`.
>>> python
a = ["sql", "python"]
b = a
b.append("spark")
print(a)
print(b)
print(a is b)
paso sorpresa: "a" también cambió
`a is b` confirma que son el mismo objeto. En un pipeline, esto hace que una función "modifique sin querer" los datos de quien la llamó.
>>> log
['sql', 'python', 'spark']
['sql', 'python', 'spark']
True
paso copia: .copy() crea una lista nueva
Con una copia, cada nombre tiene su propia lista y cambiar una no toca la otra.
>>> log
['sql', 'python']
['sql', 'python', 'spark']
False
```

## Listas de listas: tablas en memoria

Una lista puede contener otras listas. Así se representa una tabla: una lista de filas.

```python
tabla = [
    ["Ana", "Chile", 3],
    ["Luis", "Perú", 5],
]
print(tabla[1][0])                      # fila 1, columna 0 → 'Luis'
for nombre, pais, compras in tabla:     # desempaquetado de cada fila
    print(nombre, "de", pais, "hizo", compras, "compras")
```

El **desempaquetado** (`for nombre, pais, compras in tabla`) asigna cada elemento de la fila a una variable. Es mucho más legible que `fila[0]`, `fila[1]`, `fila[2]`. (Para tablas con nombres de columnas, en la próxima lección verás que es mejor una lista de **diccionarios**.)

## Tuplas: registros que no cambian

Una **tupla** es como una lista pero **inmutable**: una vez creada no se puede modificar. Se escribe con paréntesis:

```python
punto = (-34.6, -58.4)           # latitud, longitud
lat, lon = punto                 # desempaquetado
registro = ("2024-03-15", "web", 120.5)
print(lat, lon, registro[1])
```

| | Lista `[ ]` | Tupla `( )` |
|---|---|---|
| ¿Se puede modificar? | Sí | No |
| Uso típico | Colecciones que crecen o cambian: las ventas del día | Registros fijos: una coordenada, una fila (fecha, canal, monto) |
| Se puede usar como clave de diccionario | No | Sí |

¿Por qué querrías algo que no se puede cambiar? Porque **comunica intención** ("esto es un registro, no se toca") y evita modificaciones accidentales. Además, muchas funciones devuelven tuplas: `divmod(17, 5)` → `(3, 2)`, y un `return a, b` en una función devuelve una tupla.

<!-- estandar:errores -->
:::errores
- **El primer elemento es el 0**: `lista[1]` es el **segundo**. El último es `lista[-1]`.
- **`lista.sort()` devuelve `None`**: ordena la lista en el lugar. Si escribes `ordenada = lista.sort()`, `ordenada` queda en `None`. Usa `sorted(lista)` si quieres una lista nueva.
- **Copias que no son copias**: `b = a` hace que las dos variables apunten a la misma lista; cambiar `b` cambia `a`. Usa `b = a.copy()` o `b = list(a)`.
- **`sum` de textos**: `sum(["1", "2"])` da error. Convierte primero: `sum(int(x) for x in lista)`.
:::

<!-- estandar:trabajo -->
:::trabajo
- Una lista de tuplas `[(producto, unidades, precio), ...]` es la forma más simple de una tabla en memoria. Es lo que devuelven muchas librerías de bases de datos (`cursor.fetchall()`).
- Sacar elementos del principio de una lista grande (`pop(0)`) es lento, porque mueve todos los demás. Para colas de verdad se usa `collections.deque`.
:::

## Resumen

- Lista: colección ordenada y mutable `[a, b, c]`; índices desde 0, slices `[i:j]`, `len()`.
- `append` (al final), `extend`, `insert`, `remove`, `pop`; `sum`, `min`, `max`, `in`.
- `sorted()` devuelve una lista nueva (acepta `key=` y `reverse=`); `.sort()` modifica y devuelve `None`.
- `b = a` no copia: usa `a.copy()`.
- Tupla: como una lista inmutable; ideal para registros fijos y desempaquetado.

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

### Más práctica

:::ejercicio python titulo="Primero, último y cuántos"
De `pedidos = [5001, 5002, 5003, 5004, 5005]` guarda en `primero` el primero, en `ultimo` el último (con índice negativo) y en `cuantos` la cantidad.
```python inicial
pedidos = [5001, 5002, 5003, 5004, 5005]
primero = ultimo = cuantos = None
```
```python solucion
pedidos = [5001, 5002, 5003, 5004, 5005]
primero = pedidos[0]
ultimo = pedidos[-1]
cuantos = len(pedidos)
```
```python test
assert (primero, ultimo, cuantos) == (5001, 5005, 5), f"Obtuviste {primero}, {ultimo}, {cuantos}"
assert "[-1]" in _codigo, "Usa el índice -1 para el último"
```
:::

:::ejercicio python titulo="Rebanadas (slicing)"
De `meses = ["ene", "feb", "mar", "abr", "may", "jun"]` guarda en `trimestre` los tres primeros y en `ultimos_dos` los dos últimos, usando rebanadas `[a:b]`.
```python inicial
meses = ["ene", "feb", "mar", "abr", "may", "jun"]
trimestre = ultimos_dos = None
```
```python solucion
meses = ["ene", "feb", "mar", "abr", "may", "jun"]
trimestre = meses[:3]
ultimos_dos = meses[-2:]
```
```python test
assert trimestre == ["ene", "feb", "mar"] and ultimos_dos == ["may", "jun"], f"{trimestre} {ultimos_dos}"
```
:::

:::ejercicio python titulo="Agregar, quitar, insertar"
Partiendo de `cola = ["ana", "luis"]`: agrega `"eva"` al final, inserta `"tomás"` al principio y quita `"luis"`. `cola` debe terminar como `["tomás", "ana", "eva"]`.
```python inicial
cola = ["ana", "luis"]
```
```python solucion
cola = ["ana", "luis"]
cola.append("eva")
cola.insert(0, "tomás")
cola.remove("luis")
```
```python test
assert cola == ["tomás", "ana", "eva"], f"cola es {cola}"
```
:::

:::ejercicio python titulo="Ordenar sin romper el original"
Con `precios = [300, 120, 990, 45]`, guarda en `ordenados` los precios de menor a mayor **sin modificar** `precios`, y en `top2` los dos más caros.
```python inicial
precios = [300, 120, 990, 45]
ordenados = top2 = None
```
```python solucion
precios = [300, 120, 990, 45]
ordenados = sorted(precios)
top2 = sorted(precios, reverse=True)[:2]
```
```python test
assert precios == [300, 120, 990, 45], "Modificaste la lista original: usa sorted(), no .sort()"
assert ordenados == [45, 120, 300, 990] and top2 == [990, 300], f"{ordenados} {top2}"
```
:::

:::ejercicio python titulo="La trampa de la copia"
`base = [1, 2, 3]`. Crea `copia` como una **copia independiente** de `base` y agrégale un 4: `base` debe seguir siendo `[1, 2, 3]`.
```python inicial
base = [1, 2, 3]
copia = base
copia.append(4)
```
```python solucion
base = [1, 2, 3]
copia = base.copy()
copia.append(4)
```
```python test
assert base == [1, 2, 3], f"base cambió: {base}. 'copia = base' no copia, solo pone otro nombre a la misma lista"
assert copia == [1, 2, 3, 4], f"copia es {copia}"
```
:::

:::ejercicio python titulo="Tabla en memoria"
`filas` es una tabla: cada fila es `[producto, cantidad, precio]`. Calcula en `total` la suma de cantidad × precio de todas las filas.
```python inicial
filas = [["mouse", 2, 12990], ["teclado", 1, 54990], ["cable", 3, 6990]]
total = 0
```
```python solucion
filas = [["mouse", 2, 12990], ["teclado", 1, 54990], ["cable", 3, 6990]]
total = 0
for producto, cantidad, precio in filas:
    total += cantidad * precio
```
```python test
assert total == 2 * 12990 + 54990 + 3 * 6990, f"total es {total}"
```
```pista
Puedes "desarmar" cada fila en el for: `for producto, cantidad, precio in filas:`.
```
:::

:::ejercicio python titulo="Tuplas como registros"
`registro = ("CL", "Santiago", 7112000)` es (código de país, ciudad, habitantes). Desármalo en `pais`, `ciudad` y `habitantes` en una sola línea.
```python inicial
registro = ("CL", "Santiago", 7112000)
```
```python solucion
registro = ("CL", "Santiago", 7112000)
pais, ciudad, habitantes = registro
```
```python test
assert (pais, ciudad, habitantes) == ("CL", "Santiago", 7112000)
```
:::
