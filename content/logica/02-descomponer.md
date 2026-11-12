---
titulo: Descomponer - del enunciado a pasos chicos
nivel: Básico
duracion: 35
resumen: Cómo partir un problema grande en problemas chicos que ya sabes resolver - encontrar los verbos del enunciado, escribir funciones pequeñas, seguir el programa con una tabla de traza y reconocer cuándo un problema es dos problemas pegados.
objetivos: Partir un enunciado en subproblemas independientes | Seguir la ejecución de un programa con una tabla de traza | Escribir funciones chicas que hacen una sola cosa y combinarlas | Reconocer cuándo un problema es "filtrar y después agregar" o "agrupar y después elegir"
prerrequisitos: logica-metodo
autoevaluacion: ¿Puedes encontrar los subproblemas escondidos en un enunciado? | ¿Sabes armar una tabla de traza para seguir un bucle? | ¿Sabes por qué conviene una función por paso? | ¿Puedes decir en qué orden van "filtrar", "agrupar" y "ordenar" en un problema dado?
---

:::analogia En palabras simples
"Organizar un cumpleaños" asusta. "Hacer la lista de invitados", "comprar la torta" y "avisar la hora" no asustan a nadie. Es el mismo trabajo, partido en tareas que sabes hacer. Con el código pasa lo mismo: ningún problema grande se resuelve entero; se resuelve por partes.
:::

## Busca los verbos

Un enunciado esconde varias tareas. Los **verbos** las delatan.

> "De los pedidos **entregados**, **calcula** el total por cliente y **muestra** los tres clientes que más gastaron."

| Verbo | Subproblema | Lo que ya sabes |
|---|---|---|
| entregados | Filtrar por estado | un `if` dentro del bucle |
| calcula el total por cliente | Agrupar y sumar | diccionario acumulador |
| los tres que más | Ordenar y cortar | `sorted(...)[:3]` |

Tres problemas chicos, en fila. Ninguno es difícil por separado.

## Casi todo es una de estas cinco cosas

| Operación | En palabras | Pregunta típica |
|---|---|---|
| **Filtrar** | Quedarme con algunos | "los que…", "solo…", "sin…" |
| **Transformar** | Cambiar cada elemento | "en mayúsculas", "con IVA", "el año de…" |
| **Agrupar** | Juntar por una clave | "por cliente", "por mes", "cada…" |
| **Agregar** | Resumir muchos en uno | "total", "promedio", "cuántos", "el mayor" |
| **Ordenar** | Poner en orden y cortar | "los 5 más…", "del más nuevo al más viejo" |

Resolver un problema es, casi siempre, decidir **cuáles** de estas necesitas y **en qué orden**.

## Una función por paso

```python
def solo_entregados(pedidos):
    return [p for p in pedidos if p["estado"] == "entregado"]

def total_por_cliente(pedidos):
    totales = {}
    for p in pedidos:
        totales[p["cliente"]] = totales.get(p["cliente"], 0) + p["monto"]
    return totales

def top(totales, n):
    ordenados = sorted(totales.items(), key=lambda par: par[1], reverse=True)
    return [cliente for cliente, total in ordenados[:n]]

pedidos = [
    {"cliente": "Ana", "monto": 100, "estado": "entregado"},
    {"cliente": "Luis", "monto": 900, "estado": "cancelado"},
    {"cliente": "Ana", "monto": 50, "estado": "entregado"},
    {"cliente": "Eva", "monto": 120, "estado": "entregado"},
]
print(top(total_por_cliente(solo_entregados(pedidos)), 3))
```

Cada función se puede **probar sola**. Si el resultado final está mal, pruebas las tres por separado y encuentras cuál falla en un minuto.

## La tabla de traza: seguir el programa a mano

Cuando un bucle no hace lo que esperas, deja de mirar el código y **síguelo paso a paso** anotando el valor de cada variable.

```python
numeros = [3, 8, 5]
mayor = numeros[0]
for n in numeros:
    if n > mayor:
        mayor = n
print(mayor)
```

| Vuelta | `n` | ¿`n > mayor`? | `mayor` después |
|---|---|---|---|
| antes | – | – | 3 |
| 1 | 3 | 3 > 3 → no | 3 |
| 2 | 8 | 8 > 3 → sí | 8 |
| 3 | 5 | 5 > 8 → no | 8 |

La traza muestra exactamente dónde el programa hace algo distinto de lo que imaginabas. Es la herramienta más simple y más útil para aprender a programar.

## El orden importa

"El promedio de los pedidos entregados por país" **no es lo mismo** si filtras antes o después.

- **Filtrar y después agrupar:** promedio solo de los entregados. Es lo pedido.
- **Agrupar y después filtrar:** primero calculas el promedio de todos, y ya es tarde para sacar los cancelados.

Regla práctica: **filtra lo antes posible**, agrupa después, ordena al final.

:::ejercicio quiz
"Muestra los 5 productos **activos** con más unidades vendidas." ¿En qué orden van las operaciones?
- [ ] Ordenar → agrupar → filtrar
- [x] Filtrar los activos → sumar unidades por producto → ordenar y tomar 5
- [ ] Tomar 5 productos → filtrar → sumar
- [ ] Agrupar → tomar 5 → filtrar los activos
:::

:::ejercicio quiz
Sigue este código a mano. ¿Qué imprime?
```python norun
total = 0
for n in [2, 5, 1]:
    if n > 1:
        total = total + n
print(total)
```
- [ ] 8
- [x] 7
- [ ] 1
- [ ] 0
:::

:::ejercicio quiz
¿Cuál es la ventaja principal de escribir una función por cada paso?
- [ ] El programa ocupa menos líneas
- [ ] El programa corre más rápido
- [x] Cada paso se puede probar por separado, y así se encuentra enseguida cuál falla
- [ ] No hace falta ponerles nombre a las variables
:::

:::ejercicio python
Primer subproblema. Escribe `solo_del_pais(clientes, pais)` que reciba una lista de diccionarios con las claves `"nombre"` y `"pais"`, y devuelva la lista de **nombres** de los clientes de ese país, en el mismo orden.
```python inicial
def solo_del_pais(clientes, pais):
    pass
```
```python solucion
def solo_del_pais(clientes, pais):
    return [c["nombre"] for c in clientes if c["pais"] == pais]
```
```pista
Es filtrar y transformar a la vez: recorre los clientes y, si el país coincide, agrega su nombre a la lista.
```
```python test
cs = [{"nombre": "Ana", "pais": "Chile"}, {"nombre": "Luis", "pais": "Perú"}, {"nombre": "Eva", "pais": "Chile"}]
assert solo_del_pais(cs, "Chile") == ["Ana", "Eva"], f"Obtuviste {solo_del_pais(cs, 'Chile')}"
assert solo_del_pais(cs, "Bolivia") == [], "Si no hay ninguno, lista vacía"
assert solo_del_pais([], "Chile") == []
```
:::

:::ejercicio python
Segundo subproblema. Escribe `contar_por(lista, clave)` que reciba una lista de diccionarios y el nombre de una clave, y devuelva un diccionario con **cuántos** hay de cada valor. Ejemplo: contar clientes por país.
```python inicial
def contar_por(lista, clave):
    pass
```
```python solucion
def contar_por(lista, clave):
    cuentas = {}
    for elemento in lista:
        valor = elemento[clave]
        cuentas[valor] = cuentas.get(valor, 0) + 1
    return cuentas
```
```pista
Igual que sumar por vendedor, pero sumando 1 en vez del monto.
```
```python test
cs = [{"pais": "Chile"}, {"pais": "Perú"}, {"pais": "Chile"}]
assert contar_por(cs, "pais") == {"Chile": 2, "Perú": 1}, f"Obtuviste {contar_por(cs, 'pais')}"
assert contar_por([], "pais") == {}
```
:::

:::ejercicio python
Tercer subproblema. Escribe `los_n_mayores(totales, n)` que reciba un diccionario `nombre → número` y devuelva la lista de los `n` **nombres** con mayor número, de mayor a menor.
```python inicial
def los_n_mayores(totales, n):
    pass
```
```python solucion
def los_n_mayores(totales, n):
    ordenados = sorted(totales.items(), key=lambda par: par[1], reverse=True)
    return [nombre for nombre, valor in ordenados[:n]]
```
```pista
`sorted(totales.items(), key=lambda par: par[1], reverse=True)` ordena los pares por el número. Después corta con `[:n]` y quédate con los nombres.
```
```python test
t = {"Ana": 300, "Luis": 250, "Eva": 900, "Tom": 10}
assert los_n_mayores(t, 2) == ["Eva", "Ana"], f"Obtuviste {los_n_mayores(t, 2)}"
assert los_n_mayores(t, 10) == ["Eva", "Ana", "Luis", "Tom"], "Si n es mayor que la cantidad, devuelve todos"
assert los_n_mayores({}, 3) == []
```
:::

:::ejercicio python
Ahora todo junto. Escribe `top_paises(clientes, n)` que devuelva los `n` países con **más clientes activos** (clave `"activo"` en `True`), de mayor a menor. Descomponlo: filtrar → contar por país → ordenar y cortar.
```python inicial
def top_paises(clientes, n):
    pass
```
```python solucion
def top_paises(clientes, n):
    cuentas = {}
    for c in clientes:
        if c["activo"]:
            cuentas[c["pais"]] = cuentas.get(c["pais"], 0) + 1
    ordenados = sorted(cuentas.items(), key=lambda par: par[1], reverse=True)
    return [pais for pais, cantidad in ordenados[:n]]
```
```pista
Tres pasos en fila: (1) quédate con los activos, (2) cuenta por país en un diccionario, (3) ordena por cantidad de mayor a menor y toma los primeros `n`.
```
```python test
cs = [{"pais": "Chile", "activo": True}, {"pais": "Perú", "activo": True}, {"pais": "Chile", "activo": True}, {"pais": "Perú", "activo": False}, {"pais": "Bolivia", "activo": False}]
assert top_paises(cs, 1) == ["Chile"], f"Obtuviste {top_paises(cs, 1)}"
assert top_paises(cs, 5) == ["Chile", "Perú"], "Bolivia no tiene clientes activos: no aparece"
assert top_paises([], 3) == []
```
:::
