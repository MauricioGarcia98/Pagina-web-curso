---
titulo: Documentos - qué embeber, qué referenciar y cómo consultarlos con SQL
nivel: Avanzado
duracion: 65
resumen: En una base de documentos no se diseñan tablas normalizadas sino documentos que responden de una sola lectura a las consultas de la app. Aprendes las reglas para decidir qué va dentro del documento (embebido) y qué se guarda aparte (referencia), qué es "esquema al leer", cómo conviven dos versiones del mismo documento, y cómo consultar JSON con SQL - extraer campos, unificar versiones y explotar listas en filas.
objetivos: Decidir entre embeber y referenciar según cómo se lee y cuánto crece cada relación | Convertir un modelo relacional en documentos y documentos en tablas | Extraer campos de JSON con SQL protegiéndose de los registros rotos | Unificar dos versiones de un mismo documento con COALESCE | Explotar una lista dentro de un documento en filas con json_each
prerrequisitos: nosql-tipos-y-cuando-usarlas | calidad-perfilar-una-tabla
autoevaluacion: ¿Cuándo embebes los pedidos dentro del cliente y cuándo no? | ¿Qué significa "esquema al leer"? | ¿Cómo lees un campo que cambió de lugar entre la versión 1 y la 2? | ¿Cómo conviertes la lista de líneas de un pedido en filas?
---

:::analogia En palabras simples
En una oficina normalizada, la factura de un cliente está en un archivador, sus datos en otro y sus productos en un tercero: para ver todo hay que ir a tres lugares. En una base de documentos, cada cliente tiene **una carpeta** con todo lo que se consulta junto. Es rapidísimo de leer, pero si un dato se repite en mil carpetas, cambiarlo es trabajoso.
:::

## Embeber o referenciar

```json
{"_id": 101, "cliente": {"id": 7, "nombre": "Lucía"},
 "lineas": [{"producto_id": 3, "cantidad": 2, "precio": 120.0},
            {"producto_id": 9, "cantidad": 1, "precio": 45.0}],
 "estado": "entregado"}
```

```diagrama
titulo: Un pedido como documento: las líneas adentro, el cliente por referencia
nodo ped: Documento pedido 101 | icono=documento | col=0 | fila=1 | color=azul | sub=estado, fecha
nodo l1: Línea 1 (embebida) | icono=tabla | col=1 | fila=0 | color=verde | sub=producto 3 · cantidad 2 · precio al comprar
nodo l2: Línea 2 (embebida) | icono=tabla | col=1 | fila=1 | color=verde | sub=producto 9 · cantidad 1
nodo cli: Cliente 7 (referencia) | icono=usuario | col=1 | fila=2 | color=naranja | sub=vive en su colección; el pedido guarda solo su id
flecha ped -> l1: dentro | explica=Las líneas del pedido van dentro del documento: se leen y se escriben siempre juntas.
flecha ped -> l2: dentro | explica=Cada línea guarda el precio al momento de la compra, que no debe cambiar aunque cambie el catálogo.
flecha ped -> cli: apunta por id | estilo=punteada | explica=El cliente no se copia adentro: el pedido guarda solo su id, porque el cliente cambia y se usa en muchos pedidos.
```

Las líneas están **embebidas** en el pedido (se leen siempre juntas). El cliente aparece embebido con solo dos campos; el resto del cliente vive en su propia colección y se **referencia** por `id`.

| Embebe cuando… | Referencia cuando… |
|---|---|
| Se lee siempre junto con el documento | Se lee por separado o desde muchos lugares |
| La lista es chica y acotada (las líneas de un pedido) | La lista crece sin límite (todos los pedidos de un cliente en 10 años) |
| El dato casi no cambia, o está bien que quede la foto del momento (el precio al comprar) | El dato cambia y debe verse actualizado en todos lados (el email del cliente) |

Así lo resume la guía de modelado de datos de MongoDB ([documentación](https://www.mongodb.com/docs/manual/data-modeling/)). Un límite práctico: un documento de MongoDB no puede pasar de 16 MB, por eso las listas que crecen sin fin van aparte.

:::cuidado La lista que crece para siempre
Embeber "todos los eventos del usuario" en el documento del usuario funciona el primer mes. Al año, cada lectura del perfil arrastra miles de eventos y el documento se acerca al límite de tamaño. Una alternativa común es el patrón de **lista acotada**: embebes solo los últimos N (los 5 pedidos recientes, para mostrar en el perfil) y el resto vive en su colección.
:::

## Esquema al leer

En una base relacional el esquema se valida **al escribir**: una fila sin la columna obligatoria no entra. En una base de documentos, cada documento puede tener otra forma, y la forma se interpreta **al leer**. La tabla `bronze_eventos_app` del curso lo muestra: hasta agosto los eventos son de versión 1 y desde septiembre de versión 2, con los campos en otros lugares.

| Dato | Versión 1 | Versión 2 |
|---|---|---|
| Tipo de evento | `$.tipo` | `$.evento.tipo` |
| Cliente | `$.cliente` | `$.usuario.id` |
| Producto | `$.producto` (un número) | `$.producto.id` (dentro de un objeto) |

Quien lee tiene que conocer las dos formas. Con SQL se unifican con `COALESCE`, que devuelve el primer valor no nulo:

```sql
WITH validos AS (SELECT evento_id, payload FROM bronze_eventos_app WHERE json_valid(payload))
SELECT evento_id,
       json_extract(payload, '$.v') AS v,
       COALESCE(json_extract(payload, '$.tipo'), json_extract(payload, '$.evento.tipo')) AS tipo,
       COALESCE(json_extract(payload, '$.cliente'), json_extract(payload, '$.usuario.id')) AS cliente_id
FROM validos
LIMIT 10;
```

:::nota En cada motor
SQLite y DuckDB usan `json_extract(col, '$.a.b')`; PostgreSQL usa `col -> 'a' ->> 'b'`; Databricks SQL usa `col:a.b` o `get_json_object`; BigQuery `JSON_VALUE(col, '$.a.b')`. La idea es la misma: un camino dentro del documento.
:::

## Explotar listas en filas

Para analizar las líneas de un pedido, cada elemento de la lista tiene que ser una fila. En SQLite, `json_each` convierte una lista JSON en filas (en Spark es `explode`, en BigQuery `UNNEST`):

```sql
SELECT json_each.value FROM json_each('[{"p": 1}, {"p": 2}]');
```

Con una tabla, se combina en el `FROM`: `FROM pedidos_doc d, json_each(d.doc, '$.lineas') l`, y cada `l.value` es una línea.

:::practica sql Unificar las dos versiones de los eventos de la app
1. Ejecuta: la consulta lee las dos versiones y devuelve los mismos campos para todas.
2. Comprueba la cuenta por versión: los JSON cortados quedan fuera por el filtro `json_valid`.
3. Agrega la columna `producto_id`: ojo, en la versión 2 `$.producto` es un objeto, así que hay que buscar primero `$.producto.id`.

```sql
WITH validos AS (SELECT evento_id, payload FROM bronze_eventos_app WHERE json_valid(payload)),
unificado AS (
  SELECT evento_id,
         json_extract(payload, '$.v') AS v,
         COALESCE(json_extract(payload, '$.tipo'), json_extract(payload, '$.evento.tipo')) AS tipo,
         COALESCE(json_extract(payload, '$.cliente'), json_extract(payload, '$.usuario.id')) AS cliente_id
  FROM validos
)
SELECT v, tipo, COUNT(*) AS eventos, COUNT(DISTINCT cliente_id) AS clientes
FROM unificado
GROUP BY v, tipo
ORDER BY v, tipo;
```

Reto: ¿qué tipo devuelve `json_type(payload, '$.producto')` en cada versión? Úsalo para escribir una sola expresión de `producto_id` que funcione en las dos.

Documentación oficial: [Funciones JSON (SQLite)](https://www.sqlite.org/json1.html) · [JSON (DuckDB)](https://duckdb.org/docs/current/data/json/overview) · [Modelado de datos (MongoDB)](https://www.mongodb.com/docs/manual/data-modeling/)
:::

:::errores
- **Embeber listas sin límite.** El documento crece hasta volverse lento o romper el tamaño máximo.
- **Duplicar datos que cambian.** Si embebes el email del cliente en cada pedido, cambiarlo exige actualizar todos.
- **Leer solo la versión nueva.** Los documentos viejos siguen ahí: unifica con `COALESCE`.
- **`json_extract` sobre registros rotos.** Filtra con `json_valid` antes, o la consulta entera falla.
:::

:::entrevista
**Pregunta:** "La app guarda pedidos como documentos con las líneas embebidas. ¿Cómo los modelas en el lakehouse?"

**Respuesta modelo:** "En bronze guardo el documento tal cual, como texto o como columna `VARIANT`, para no perder nada. En silver separo en dos tablas: `pedidos`, una fila por pedido con los campos de cabecera, y `lineas_pedido`, una fila por línea, que obtengo explotando la lista con `explode`. Así vuelvo al grano de una fila por línea, que es lo que necesita una tabla de hechos. Si conviven versiones del documento, las unifico en silver con `coalesce` y lo dejo probado."
:::

## Ejercicios

:::ejercicio sql dificultad=Avanzado titulo="Eventos de las dos versiones, con los mismos campos"
De los eventos de `bronze_eventos_app` con JSON válido, devuelve `evento_id`, `v`, `tipo` (en la v1 está en `$.tipo`, en la v2 en `$.evento.tipo`) y `cliente_id` (v1: `$.cliente`; v2: `$.usuario.id`). Columnas: `evento_id`, `v`, `tipo`, `cliente_id`.
```sql solucion
WITH validos AS (SELECT evento_id, payload FROM bronze_eventos_app WHERE json_valid(payload))
SELECT evento_id,
       json_extract(payload, '$.v') AS v,
       COALESCE(json_extract(payload, '$.tipo'), json_extract(payload, '$.evento.tipo')) AS tipo,
       COALESCE(json_extract(payload, '$.cliente'), json_extract(payload, '$.usuario.id')) AS cliente_id
FROM validos;
```
```pista
Filtra primero los JSON válidos en una CTE: `json_extract` sobre un registro roto hace fallar la consulta entera.
```
```pista
`COALESCE(json_extract(payload, '$.tipo'), json_extract(payload, '$.evento.tipo'))`: en cada versión, uno de los dos caminos es nulo.
```
:::

:::ejercicio sql dificultad=Avanzado titulo="El producto, que cambió de forma"
En la v1, `$.producto` es el id (un número); en la v2 es un objeto y el id está en `$.producto.id`. Para los eventos válidos, cuenta los eventos por `producto_id` unificado y devuelve los **5** productos con más eventos (desempata por `producto_id` menor). Columnas: `producto_id`, `eventos`.
```sql solucion
WITH validos AS (SELECT payload FROM bronze_eventos_app WHERE json_valid(payload)),
p AS (
  SELECT CASE WHEN json_type(payload, '$.producto') = 'object' THEN json_extract(payload, '$.producto.id')
              ELSE json_extract(payload, '$.producto') END AS producto_id
  FROM validos
)
SELECT producto_id, COUNT(*) AS eventos
FROM p
GROUP BY producto_id
ORDER BY eventos DESC, producto_id
LIMIT 5;
```
```pista
`json_type(payload, '$.producto')` devuelve `'integer'` en la v1 y `'object'` en la v2. Úsalo en un `CASE` para elegir el camino.
```
```pista
`COALESCE(json_extract(payload, '$.producto.id'), json_extract(payload, '$.producto'))` también funciona, porque `$.producto.id` es nulo cuando `$.producto` es un número.
```
:::

:::ejercicio sql dificultad=Experto titulo="Explotar las líneas de los pedidos"
La tabla `pedidos_doc` (creada por el ejercicio) guarda cada pedido como un documento JSON con una lista `lineas`. Devuelve una fila por línea. Columnas: `pedido_id` (el campo `_id` del documento), `producto_id`, `cantidad`.
```sql setup
DROP TABLE IF EXISTS pedidos_doc;
CREATE TABLE pedidos_doc (doc TEXT);
INSERT INTO pedidos_doc VALUES
 ('{"_id": 101, "estado": "entregado", "lineas": [{"producto_id": 3, "cantidad": 2}, {"producto_id": 9, "cantidad": 1}]}'),
 ('{"_id": 102, "estado": "enviado", "lineas": [{"producto_id": 3, "cantidad": 5}]}'),
 ('{"_id": 103, "estado": "cancelado", "lineas": []}'),
 ('{"_id": 104, "estado": "entregado", "lineas": [{"producto_id": 7, "cantidad": 1}, {"producto_id": 9, "cantidad": 4}, {"producto_id": 3, "cantidad": 1}]}')
```
```sql solucion
SELECT json_extract(d.doc, '$._id') AS pedido_id,
       json_extract(l.value, '$.producto_id') AS producto_id,
       json_extract(l.value, '$.cantidad') AS cantidad
FROM pedidos_doc d, json_each(d.doc, '$.lineas') l;
```
```pista
`json_each(d.doc, '$.lineas')` en el `FROM`, al lado de la tabla, produce una fila por elemento de la lista; cada elemento queda en `l.value`.
```
```pista
El pedido 103 tiene la lista vacía: no aparece. Si lo necesitaras, sería un `LEFT JOIN json_each(...) ON true`.
```
:::

:::ejercicio python dificultad=Avanzado titulo="De documentos a tablas"
Escribe `normalizar(documentos)` que reciba pedidos como documentos (`{"_id", "estado", "lineas": [{"producto_id", "cantidad"}]}`) y devuelva una tupla `(pedidos, lineas)`: `pedidos` es una lista de `{"pedido_id", "estado"}` y `lineas` una lista de `{"pedido_id", "linea", "producto_id", "cantidad"}`, donde `linea` es la posición empezando en 1. Si un documento no trae `lineas`, se toma como lista vacía.
```python inicial
def normalizar(documentos):
    pass
```
```python solucion
def normalizar(documentos):
    pedidos, lineas = [], []
    for d in documentos:
        pedidos.append({"pedido_id": d["_id"], "estado": d["estado"]})
        for i, l in enumerate(d.get("lineas") or [], start=1):
            lineas.append({"pedido_id": d["_id"], "linea": i, "producto_id": l["producto_id"], "cantidad": l["cantidad"]})
    return pedidos, lineas
```
```pista
Un bucle por documento para la cabecera, y adentro otro por cada línea con `enumerate(..., start=1)`.
```
```python test
docs = [{"_id": 1, "estado": "entregado", "lineas": [{"producto_id": 3, "cantidad": 2}, {"producto_id": 9, "cantidad": 1}]},
        {"_id": 2, "estado": "cancelado"}]
p, l = normalizar(docs)
assert p == [{"pedido_id": 1, "estado": "entregado"}, {"pedido_id": 2, "estado": "cancelado"}], f"Pedidos: {p}"
assert l == [{"pedido_id": 1, "linea": 1, "producto_id": 3, "cantidad": 2}, {"pedido_id": 1, "linea": 2, "producto_id": 9, "cantidad": 1}], f"Líneas: {l}"
assert normalizar([]) == ([], [])
```
:::

:::ejercicio python dificultad=Experto titulo="El perfil con los últimos pedidos embebidos"
Escribe `perfiles(clientes, pedidos, n)` que arme un documento por cliente para la pantalla "Mi cuenta": `{"_id": cliente_id, "nombre": ..., "ultimos_pedidos": [...], "total_pedidos": k}`. `ultimos_pedidos` lleva los `n` pedidos más recientes (por `fecha`, desempate por `pedido_id` mayor), de más nuevo a más viejo, con solo `pedido_id` y `fecha` (patrón de lista acotada). Devuelve los perfiles en el orden de `clientes`.
```python inicial
def perfiles(clientes, pedidos, n):
    pass
```
```python solucion
def perfiles(clientes, pedidos, n):
    por_cliente = {}
    for p in pedidos:
        por_cliente.setdefault(p["cliente_id"], []).append(p)
    res = []
    for c in clientes:
        suyos = sorted(por_cliente.get(c["cliente_id"], []), key=lambda p: (p["fecha"], p["pedido_id"]), reverse=True)
        res.append({"_id": c["cliente_id"], "nombre": c["nombre"],
                    "ultimos_pedidos": [{"pedido_id": p["pedido_id"], "fecha": p["fecha"]} for p in suyos[:n]],
                    "total_pedidos": len(suyos)})
    return res
```
```pista
Agrupa los pedidos por cliente en un diccionario. Para cada cliente, ordena por `(fecha, pedido_id)` con `reverse=True` y corta los primeros `n`.
```
```python test
clientes = [{"cliente_id": 7, "nombre": "Lucía"}, {"cliente_id": 9, "nombre": "Tomás"}]
pedidos = [{"pedido_id": 1, "cliente_id": 7, "fecha": "2024-01-05"}, {"pedido_id": 2, "cliente_id": 7, "fecha": "2024-03-01"},
           {"pedido_id": 3, "cliente_id": 7, "fecha": "2024-03-01"}, {"pedido_id": 4, "cliente_id": 7, "fecha": "2023-12-31"}]
r = perfiles(clientes, pedidos, 2)
assert r[0] == {"_id": 7, "nombre": "Lucía", "ultimos_pedidos": [{"pedido_id": 3, "fecha": "2024-03-01"}, {"pedido_id": 2, "fecha": "2024-03-01"}], "total_pedidos": 4}, f"Obtuviste {r[0]}"
assert r[1] == {"_id": 9, "nombre": "Tomás", "ultimos_pedidos": [], "total_pedidos": 0}
```
:::
