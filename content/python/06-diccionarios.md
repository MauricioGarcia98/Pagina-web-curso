---
titulo: Diccionarios y conjuntos
nivel: Básico
duracion: 35
resumen: Pares clave-valor, contar y agrupar, JSON y conjuntos sin duplicados.
objetivos: Guardar y buscar datos por clave con diccionarios | Leer claves que pueden no existir con `get` | Contar y agrupar valores con diccionarios (el patrón más usado en datos) | Recorrer estructuras anidadas como las que devuelven las APIs | Comparar grupos con conjuntos (intersección, diferencia)
prerrequisitos: python-listas
autoevaluacion: ¿Puedes contar cuántas veces aparece cada palabra de un texto? | ¿Puedes sumar ventas por país en un diccionario? | ¿Sabes por qué `d["clave"]` puede fallar y `d.get("clave")` no? | ¿Puedes sacar un dato de un JSON anidado de dos niveles? | ¿Puedes encontrar los clientes que compraron en enero y también en febrero con conjuntos?
---

<!-- estandar:escenario -->
:::escenario Las ventas por país desde la API
El equipo de desarrollo expuso una API interna de pedidos. Valentina pregunta:

> "¿Cuánto vendimos por país esta semana? La API devuelve los pedidos con el país del cliente adentro. Y quiero saber cuántos clientes de enero volvieron a comprar en febrero."

Contar y agrupar "por algo" es la operación más frecuente en datos, y en Python se hace con **diccionarios**. Los **conjuntos** responden preguntas de "quiénes están en los dos grupos".
:::
## Buscar por nombre, no por posición

Con una lista, para encontrar el stock del "monitor" tienes que recorrerla hasta dar con él. Si guardas datos con **nombres** (de productos, de columnas, de clientes), la estructura correcta es un **diccionario** (`dict`): guarda pares **clave → valor** y te da el valor de una clave **al instante**, sin recorrer nada, aunque tenga un millón de entradas.

:::analogia Un diccionario de verdad
En un diccionario de papel no lees todas las páginas para encontrar "dato": vas directo a la palabra (la **clave**) y lees su definición (el **valor**). Las claves no se repiten: cada palabra aparece una sola vez.
:::

```python
cliente = {
    "id": 7,
    "nombre": "Sofía",
    "pais": "Chile",
    "compras": 12,
}
print(cliente["nombre"])              # leer por clave → Sofía
cliente["email"] = "sofia@mail.com"   # agregar una clave nueva
cliente["compras"] += 1               # modificar un valor
del cliente["pais"]                   # borrar una clave
print(cliente)
```

- Se escribe con **llaves** `{ }`; cada par es `clave: valor`, separados por comas.
- Las claves suelen ser textos (también pueden ser números o tuplas: cualquier valor **inmutable**). Los valores pueden ser **cualquier cosa**: números, listas, otros diccionarios.
- Asignar a una clave que no existe la **crea**; asignar a una que existe la **reemplaza**.

Un diccionario es la forma natural de representar **un registro** (una fila con nombres de columna). Por eso, cuando leas un CSV con `csv.DictReader` o un JSON de una API, cada fila te llegará como un diccionario.

## Leer sin errores: get

```python
cliente = {"id": 7, "nombre": "Sofía"}
# print(cliente["telefono"])                 # KeyError: 'telefono'
print(cliente.get("telefono"))               # None
print(cliente.get("telefono", "sin dato"))   # valor por defecto
print("telefono" in cliente)                 # ¿existe la clave? → False
```

| Forma | Si la clave no existe |
|---|---|
| `d["clave"]` | Error `KeyError` (detiene el programa) |
| `d.get("clave")` | Devuelve `None` |
| `d.get("clave", valor)` | Devuelve `valor` |
| `"clave" in d` | Responde `True`/`False` |

En datos reales (JSON de APIs, eventos) es muy común que falten campos: `get` con valor por defecto es tu mejor amigo. Usa `d["clave"]` cuando la clave **tiene** que estar y prefieres que el programa falle si no está.

## Recorrer un diccionario

```python
stock = {"mouse": 40, "teclado": 0, "monitor": 7}
for producto, unidades in stock.items():          # pares (clave, valor)
    estado = "AGOTADO" if unidades == 0 else unidades
    print(f"{producto:10} {estado}")
print(list(stock.keys()), list(stock.values()))
```

| Método | Devuelve |
|---|---|
| `d.keys()` | Las claves |
| `d.values()` | Los valores |
| `d.items()` | Los pares `(clave, valor)`: lo más usado para recorrer |

`for k in d:` recorre las **claves**. Desde Python 3.7 los diccionarios **conservan el orden** en que se insertaron las claves.

## El patrón más importante: contar y agrupar

Este es el `GROUP BY` de Python. Recorres los registros y acumulas en un diccionario cuya **clave es el grupo**:

```python
pedidos = [("web", 120), ("app", 80), ("web", 200), ("tienda", 50), ("app", 30)]

conteo = {}
total_por_canal = {}
for canal, monto in pedidos:
    conteo[canal] = conteo.get(canal, 0) + 1
    total_por_canal[canal] = total_por_canal.get(canal, 0) + monto

print(conteo)            # {'web': 2, 'app': 2, 'tienda': 1}
print(total_por_canal)   # {'web': 320, 'app': 110, 'tienda': 50}
```

La línea clave es `conteo.get(canal, 0) + 1`: "lo que había para este canal (o 0 si es la primera vez), más uno". Así funciona por dentro un `GROUP BY` en cualquier motor: una tabla en memoria con una entrada por grupo.

| Vuelta | canal | conteo después |
|---|---|---|
| 1 | web | `{'web': 1}` |
| 2 | app | `{'web': 1, 'app': 1}` |
| 3 | web | `{'web': 2, 'app': 1}` |
| 4 | tienda | `{'web': 2, 'app': 1, 'tienda': 1}` |
| 5 | app | `{'web': 2, 'app': 2, 'tienda': 1}` |

:::tip Atajos de la librería estándar
`from collections import Counter` cuenta en una línea: `Counter(c for c, _ in pedidos)`. Y `defaultdict(list)` crea listas automáticamente para agrupar: `grupos[canal].append(pedido)`. Los verás en la lección de Python avanzado; primero entiende el patrón a mano.
:::

## Estructuras anidadas: así llegan los datos de las APIs

El formato **JSON**, que usan casi todas las APIs, es exactamente "diccionarios y listas anidados". Leerlo es encadenar claves e índices:

```python
pedido = {
    "id": 1001,
    "cliente": {"nombre": "Mateo", "pais": "México"},
    "items": [
        {"sku": "A1", "cantidad": 2, "precio": 10.0},
        {"sku": "B7", "cantidad": 1, "precio": 35.5},
    ],
}
print(pedido["cliente"]["pais"])            # entrar a un diccionario dentro de otro
print(pedido["items"][1]["sku"])            # la segunda línea, su sku
total = sum(item["cantidad"] * item["precio"] for item in pedido["items"])
print(total)                                # 55.5
```

Léelo de izquierda a derecha: `pedido["items"]` es una lista → `[1]` es su segundo elemento (un diccionario) → `["sku"]` es un valor de ese diccionario.

Un trabajo típico de data engineer es **aplanar** (*flatten*) estas estructuras: convertir cada `item` en una fila de una tabla con columnas `pedido_id`, `sku`, `cantidad`, `precio`. Es lo mismo que hace `explode` en PySpark o `UNNEST` en SQL.

## Conjuntos (set): valores únicos

Un **conjunto** guarda valores **sin repetir** y **sin orden**. Se escribe con llaves pero sin `:`:

```python
compraron_2023 = {1, 2, 3, 5, 8}
compraron_2024 = {2, 3, 4, 8, 9}
print(compraron_2023 & compraron_2024)   # intersección: compraron ambos años → {2, 3, 8}
print(compraron_2023 - compraron_2024)   # diferencia: compraron en 2023 y NO en 2024 (churn) → {1, 5}
print(compraron_2023 | compraron_2024)   # unión: todos
print(len(set(["a", "b", "a", "c"])))    # quitar duplicados: 3
```

| Operación | Símbolo | Equivalente SQL |
|---|---|---|
| Intersección | `a & b` | `INTERSECT` |
| Diferencia | `a - b` | `EXCEPT` |
| Unión | `a \| b` | `UNION` |

Usos típicos: quitar duplicados (`set(lista)`), comprobar pertenencia muy rápido (`if id in ids_vistos`), comparar dos fuentes (¿qué ids están en el sistema A y no en el B?). Para crear un conjunto vacío usa `set()`: `{}` crea un **diccionario** vacío.

:::experto Por qué buscar en un dict o set es tan rápido
Diccionarios y conjuntos usan una **tabla hash**: calculan una "dirección" a partir de la clave y van directo a ella. Buscar en una lista de un millón de elementos puede requerir un millón de comparaciones; en un set, prácticamente una. Es la misma idea del *hash join* de las bases de datos.
:::

<!-- estandar:errores -->
:::errores
- **`KeyError`**: pediste una clave que no existe. Usa `d.get(clave, valor_por_defecto)` o revisa con `if clave in d`.
- **Olvidar inicializar al contar**: `conteo[palabra] += 1` falla la primera vez. Usa `conteo[palabra] = conteo.get(palabra, 0) + 1`, o `collections.Counter`.
- **Listas como claves**: `{[1, 2]: "x"}` da error, porque las claves tienen que ser inmutables. Usa una tupla `(1, 2)`.
- **Asumir que el JSON siempre tiene la misma forma**: una API puede omitir un campo cuando está vacío. Lee los campos opcionales con `.get`.
:::

<!-- estandar:trabajo -->
:::trabajo
- El patrón "diccionario para agrupar" es exactamente lo que hace un `GROUP BY` por dentro. Cuando los datos no caben en memoria, la misma idea se reparte entre muchas máquinas: eso es Spark.
- Los conjuntos (`set`) son la forma más rápida de comparar listas grandes de ids: "qué clientes están en el CRM pero no en la base de pedidos". Es una tarea de conciliación muy común.
:::

## Resumen

- `dict`: pares clave → valor; acceso instantáneo por clave. `d[k]` falla si no existe; `d.get(k, defecto)` no.
- Recorre con `for k, v in d.items()`.
- Contar y agrupar: `d[k] = d.get(k, 0) + valor` es un `GROUP BY` hecho a mano.
- JSON = diccionarios y listas anidados; se navega encadenando `["clave"]` y `[índice]`.
- `set`: valores únicos; `&`, `-`, `|` son `INTERSECT`, `EXCEPT`, `UNION`.

## Ejercicios

:::ejercicio python
Cuenta cuántas veces aparece cada palabra en `texto` y guarda el resultado en el diccionario `frecuencias` (las palabras en minúsculas).
```python inicial
texto = "datos SQL datos Python Spark datos sql python"
```
```python solucion
texto = "datos SQL datos Python Spark datos sql python"
frecuencias = {}
for palabra in texto.lower().split():
    frecuencias[palabra] = frecuencias.get(palabra, 0) + 1
```
```python test
assert frecuencias == {"datos": 3, "sql": 2, "python": 2, "spark": 1}, f"frecuencias = {frecuencias}"
```
:::

:::ejercicio python
Agrupa las ventas por país: construye `ventas_por_pais`, un diccionario `{pais: suma de montos}`.
```python inicial
ventas = [
    {"pais": "Chile", "monto": 100},
    {"pais": "Perú", "monto": 250},
    {"pais": "Chile", "monto": 50},
    {"pais": "México", "monto": 300},
    {"pais": "Perú", "monto": 20},
]
```
```python solucion
ventas = [
    {"pais": "Chile", "monto": 100},
    {"pais": "Perú", "monto": 250},
    {"pais": "Chile", "monto": 50},
    {"pais": "México", "monto": 300},
    {"pais": "Perú", "monto": 20},
]
ventas_por_pais = {}
for v in ventas:
    ventas_por_pais[v["pais"]] = ventas_por_pais.get(v["pais"], 0) + v["monto"]
```
```python test
assert ventas_por_pais == {"Chile": 150, "Perú": 270, "México": 300}, f"ventas_por_pais = {ventas_por_pais}"
```
:::

:::ejercicio python
Con los conjuntos de clientes, calcula: `fieles` (compraron en ambos meses), `nuevos` (solo en febrero) y `perdidos` (solo en enero).
```python inicial
enero = {"ana", "luis", "eva", "tom", "sol"}
febrero = {"luis", "eva", "max", "sol", "ivy"}
```
```python solucion
enero = {"ana", "luis", "eva", "tom", "sol"}
febrero = {"luis", "eva", "max", "sol", "ivy"}
fieles = enero & febrero
nuevos = febrero - enero
perdidos = enero - febrero
```
```python test
assert fieles == {"luis", "eva", "sol"}, f"fieles = {fieles}"
assert nuevos == {"max", "ivy"}, f"nuevos = {nuevos}"
assert perdidos == {"ana", "tom"}, f"perdidos = {perdidos}"
```
:::

:::ejercicio python
Del `pedido` anidado, calcula en `total` el importe (cantidad × precio de cada ítem) y en `skus` la lista de SKUs **ordenada alfabéticamente**.
```python inicial
pedido = {
    "id": 1001,
    "items": [
        {"sku": "Z9", "cantidad": 1, "precio": 99.0},
        {"sku": "A1", "cantidad": 3, "precio": 10.0},
        {"sku": "M4", "cantidad": 2, "precio": 7.5},
    ],
}
```
```python solucion
pedido = {
    "id": 1001,
    "items": [
        {"sku": "Z9", "cantidad": 1, "precio": 99.0},
        {"sku": "A1", "cantidad": 3, "precio": 10.0},
        {"sku": "M4", "cantidad": 2, "precio": 7.5},
    ],
}
total = 0
skus = []
for item in pedido["items"]:
    total += item["cantidad"] * item["precio"]
    skus.append(item["sku"])
skus = sorted(skus)
```
```python test
assert total == 144.0, f"total debería ser 144.0 y es {total}"
assert skus == ["A1", "M4", "Z9"], f"skus = {skus}"
```
:::
