---
titulo: Diccionarios y conjuntos
nivel: Básico
duracion: 30
resumen: Pares clave-valor, contar y agrupar, JSON y conjuntos sin duplicados.
---

## Diccionarios

Un **diccionario** (`dict`) guarda pares **clave → valor**. Es como una ficha: buscas por la clave y obtienes el valor al instante.

```python
cliente = {
    "id": 7,
    "nombre": "Sofía",
    "pais": "Chile",
    "compras": 12,
}
print(cliente["nombre"])
cliente["email"] = "sofia@mail.com"   # agregar
cliente["compras"] += 1               # modificar
del cliente["pais"]                   # borrar
print(cliente)
```

:::tip get(): leer sin errores
`cliente["telefono"]` lanza `KeyError` si la clave no existe. `cliente.get("telefono")` devuelve `None`, y `cliente.get("telefono", "sin dato")` devuelve un valor por defecto.
:::

## Recorrer un diccionario

```python
stock = {"mouse": 40, "teclado": 0, "monitor": 7}
for producto, unidades in stock.items():
    estado = "AGOTADO" if unidades == 0 else unidades
    print(f"{producto:10} {estado}")
print(list(stock.keys()), list(stock.values()))
```

## El patrón más importante en datos: contar y agrupar

```python
pedidos = [("web", 120), ("app", 80), ("web", 200), ("tienda", 50), ("app", 30)]

conteo = {}
total_por_canal = {}
for canal, monto in pedidos:
    conteo[canal] = conteo.get(canal, 0) + 1
    total_por_canal[canal] = total_por_canal.get(canal, 0) + monto

print(conteo)            # {'web': 2, 'app': 2, 'tienda': 1}
print(total_por_canal)   # es un GROUP BY canal hecho a mano 😉
```

## Estructuras anidadas (como JSON)

Los datos de las APIs llegan como diccionarios y listas anidados:

```python
pedido = {
    "id": 1001,
    "cliente": {"nombre": "Mateo", "pais": "México"},
    "items": [
        {"sku": "A1", "cantidad": 2, "precio": 10.0},
        {"sku": "B7", "cantidad": 1, "precio": 35.5},
    ],
}
print(pedido["cliente"]["pais"])
total = sum(item["cantidad"] * item["precio"] for item in pedido["items"])
print(total)
```

## Conjuntos (set)

Un **conjunto** guarda valores **sin repetir** y sin orden. Ideal para quitar duplicados y comparar grupos:

```python
compraron_2023 = {1, 2, 3, 5, 8}
compraron_2024 = {2, 3, 4, 8, 9}
print(compraron_2023 & compraron_2024)   # intersección: compraron ambos años
print(compraron_2023 - compraron_2024)   # diferencia: se fueron (churn)
print(compraron_2023 | compraron_2024)   # unión
print(len(set(["a", "b", "a", "c"])))    # quitar duplicados: 3
```

¿Te suenan? Son `INTERSECT`, `EXCEPT` y `UNION` de SQL.

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
