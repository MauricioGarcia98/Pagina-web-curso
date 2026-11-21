---
titulo: Diseñar una API de datos - recursos, códigos y paginación
nivel: Intermedio
duracion: 50
resumen: Antes de escribir código, una API se diseña - qué recursos expone, con qué métodos, qué códigos de estado devuelve, cómo se filtra y cómo se pagina. Aprendes las convenciones de HTTP que cualquier cliente espera, la diferencia entre paginar por número de página y por cursor, y por qué el cursor es el estándar cuando los datos cambian mientras alguien los lee.
objetivos: Modelar recursos y elegir el método HTTP correcto para cada operación | Elegir el código de estado adecuado para cada respuesta | Diseñar filtros, orden y paginación en la URL | Explicar por qué la paginación por cursor no pierde ni repite filas | Versionar una API sin romper a sus clientes
prerrequisitos: python-extraer-de-apis | python-clases
autoevaluacion: ¿Qué método usas para crear y cuál para reemplazar? | ¿Cuándo devuelves 404, 409, 422 y 429? | ¿Qué problema tiene paginar con OFFSET cuando entran filas nuevas? | ¿Cómo agregas un campo sin romper a nadie?
---

:::analogia En palabras simples
Una API es el mostrador de un negocio: el cliente no entra a la trastienda (tu base de datos), pide por el mostrador con un formulario conocido y recibe una respuesta con un formato acordado. Diseñar la API es decidir qué se puede pedir, con qué formulario y qué contesta el mostrador cuando algo sale mal.
:::

## Recursos y métodos

En una API REST, la URL nombra un **recurso** (un sustantivo) y el **método HTTP** dice qué haces con él.

| Método | Qué hace | Ejemplo | ¿Idempotente? |
|---|---|---|---|
| `GET` | Leer | `GET /productos/42` | Sí |
| `POST` | Crear | `POST /pedidos` | **No** (dos POST crean dos pedidos) |
| `PUT` | Reemplazar completo | `PUT /productos/42` | Sí |
| `PATCH` | Modificar una parte | `PATCH /productos/42` | Depende |
| `DELETE` | Borrar | `DELETE /productos/42` | Sí |

**Idempotente** significa que repetir la operación deja el mismo resultado que hacerla una vez. Importa porque las redes fallan y los clientes reintentan: un `GET` o un `PUT` repetido no hace daño; un `POST` repetido puede duplicar un pedido (en la lección 3 lo resuelves con una clave de idempotencia).

:::tip Sustantivos, no verbos
`GET /productos?categoria=audio` y no `GET /obtenerProductosDeAudio`. El verbo ya está en el método.
:::

## Códigos de estado

| Código | Significa | Cuándo |
|---|---|---|
| 200 OK | Salió bien | Lectura o actualización exitosa |
| 201 Created | Se creó | Después de un `POST` exitoso |
| 204 No Content | Salió bien, sin cuerpo | Después de un `DELETE` |
| 400 Bad Request | El pedido está mal armado | JSON roto |
| 401 Unauthorized | No sé quién eres | Falta la clave o es inválida |
| 403 Forbidden | Sé quién eres, pero no puedes | Clave válida sin permiso para ese recurso |
| 404 Not Found | No existe | `GET /productos/999999` |
| 409 Conflict | Choca con el estado actual | Crear algo que ya existe |
| 422 Unprocessable Content | Los datos no son válidos | `cantidad: -3` (así responde FastAPI) |
| 429 Too Many Requests | Te pasaste del límite | Con el encabezado `Retry-After` |
| 500 Internal Server Error | Falló el servidor | Un error no previsto |

La regla general: **4xx es culpa del cliente** (puede corregir y reintentar distinto), **5xx es culpa del servidor** (reintentar igual puede funcionar más tarde).

## Filtros, orden y paginación

Los filtros y la paginación van en la **query** de la URL: `GET /pedidos?canal=web&desde=2024-07-01&limite=100`.

| Paginación | Cómo pide la página siguiente | Problema |
|---|---|---|
| Por número u offset | `?pagina=3` o `?offset=200` | Si entran o se borran filas mientras paginas, **se repiten o se pierden** filas |
| Por cursor | `?cursor=<id del último que viste>` | Ninguno de esos: "dame los que vienen después de este" |

Con cursor, la respuesta incluye dónde seguir:

```json
{"datos": [{"pedido_id": 101}, {"pedido_id": 102}], "siguiente": 102}
```

y el cliente pide `?cursor=102` hasta que `siguiente` venga vacío. Así paginan las APIs de Stripe, GitHub (para muchos recursos) y la mayoría de las APIs de datos grandes.

:::cuidado OFFSET con datos que cambian
Estás en la página 3 (`OFFSET 200`) y entra un pedido nuevo al principio: todo se corre una posición, y la primera fila de la página 4 es la última que ya viste en la 3. Si se borra uno, te salteas una fila sin enterarte. Para extraer datos completos, usa cursor con una columna **ordenada y única** (`pedido_id`, o `(actualizado_en, id)`).
:::

## Versionar sin romper

| Cambio | ¿Rompe a los clientes? | Qué hacer |
|---|---|---|
| Agregar un campo a la respuesta | No | Hacerlo, los clientes lo ignoran |
| Agregar un filtro opcional | No | Hacerlo |
| Quitar o renombrar un campo | **Sí** | Versión nueva: `/v2/...`, y mantener `/v1` un tiempo |
| Cambiar el tipo de un campo | **Sí** | Versión nueva |

Es la misma lógica de compatibilidad que viste con los esquemas de tablas en [Calidad: contratos y esquemas](#/l/calidad-contratos-y-esquemas).

:::practica python Paginar por cursor y comprobar que no se pierde nada
1. Ejecuta: una función simula el servidor (devuelve páginas por cursor) y un bucle la recorre como lo haría un cliente.
2. Fíjate en que el bucle termina cuando `siguiente` es `None`, y que se juntan todas las filas exactamente una vez.
3. Cambia `limite=3` por `limite=1` y por `limite=100`: el total debe ser siempre el mismo.

```python
PEDIDOS = [{"pedido_id": i, "monto": i * 10} for i in (3, 5, 8, 9, 12, 15, 21)]

def pagina(cursor=None, limite=3):
    """El servidor: los pedidos con id mayor al cursor, en orden, y dónde seguir."""
    resto = [p for p in PEDIDOS if cursor is None or p["pedido_id"] > cursor]
    datos = resto[:limite]
    siguiente = datos[-1]["pedido_id"] if len(resto) > limite else None
    return {"datos": datos, "siguiente": siguiente}

todos, cursor, llamadas = [], None, 0
while True:
    r = pagina(cursor, limite=3)
    llamadas += 1
    todos += r["datos"]
    if r["siguiente"] is None:
        break
    cursor = r["siguiente"]

print(llamadas, "llamadas,", len(todos), "pedidos:", [p["pedido_id"] for p in todos])
```

Reto: entre la primera y la segunda llamada, agrega a `PEDIDOS` un pedido con id 1 (uno "viejo" que llegó tarde). ¿El cursor lo trae? ¿Qué columna usarías como cursor para no perderlo? (Pista: `actualizado_en`.)

Documentación oficial: [Métodos HTTP (MDN)](https://developer.mozilla.org/es/docs/Web/HTTP/Methods) · [Códigos de estado HTTP (MDN)](https://developer.mozilla.org/es/docs/Web/HTTP/Status) · [RFC 9110: semántica de HTTP](https://www.rfc-editor.org/rfc/rfc9110)
:::

:::errores
- **Verbos en la URL.** `/crearPedido` en vez de `POST /pedidos`.
- **Todo devuelve 200.** Con un error dentro del JSON, los clientes no pueden reaccionar bien.
- **Paginar con OFFSET para extraer todo.** Se repiten o pierden filas si los datos cambian.
- **Romper el formato sin versión.** Quitar un campo rompe a clientes que no conoces.
:::

:::entrevista
**Pregunta:** "¿Cómo diseñarías un endpoint para que otro equipo extraiga todos los pedidos de forma incremental?"

**Respuesta modelo:** "`GET /v1/pedidos?actualizado_desde=...&cursor=...&limite=500`, ordenado por `(actualizado_en, pedido_id)`, con el cursor como esa pareja codificada. La respuesta trae `datos` y `siguiente`. Así el cliente guarda el último cursor y la próxima corrida pide solo lo nuevo o modificado, sin repetir ni perder filas. Le pondría un límite de uso con 429 y `Retry-After`, y documentaría todo con OpenAPI, que FastAPI genera solo."
:::

## Ejercicios

:::ejercicio quiz
Un cliente manda `POST /pedidos` con `"cantidad": -3`. ¿Qué código devuelve FastAPI si el modelo exige `cantidad >= 1`?
- [ ] 400
- [ ] 404
- [x] 422
- [ ] 500
:::

:::ejercicio quiz
¿Por qué la paginación por cursor es mejor que la paginación por OFFSET para extraer una tabla que recibe filas nuevas todo el tiempo?
- [ ] Porque es más fácil de programar
- [x] Porque pide "lo que viene después de este registro", así que las filas nuevas o borradas no corren las páginas
- [ ] Porque devuelve más filas por página
- [ ] Porque no necesita ordenar
:::

:::ejercicio quiz
La API recibe la misma clave válida, pero el usuario no tiene permiso para ver ese cliente. ¿Qué código corresponde?
- [ ] 401
- [x] 403
- [ ] 404
- [ ] 429
:::

:::ejercicio python dificultad=Avanzado titulo="El servidor de una paginación por cursor"
Escribe `pagina(filas, cursor, limite)` que haga de servidor. `filas` es una lista de diccionarios con la clave `"id"` (puede venir desordenada). Devuelve `{"datos": [...], "siguiente": ...}` con las filas de `id` **mayor** que `cursor` (todas si `cursor` es `None`), ordenadas por `id`, como máximo `limite`. `siguiente` es el `id` de la última fila devuelta si quedan más filas después, o `None` si no.
```python inicial
def pagina(filas, cursor, limite):
    pass
```
```python solucion
def pagina(filas, cursor, limite):
    resto = sorted((f for f in filas if cursor is None or f["id"] > cursor), key=lambda f: f["id"])
    datos = resto[:limite]
    siguiente = datos[-1]["id"] if len(resto) > limite else None
    return {"datos": datos, "siguiente": siguiente}
```
```pista
Filtra los `id` mayores al cursor, ordena por `id` y corta los primeros `limite`.
```
```pista
Hay página siguiente solo si quedaron más filas que `limite`; en ese caso, el cursor es el `id` de la última fila que devolviste.
```
```python test
fs = [{"id": i} for i in (9, 2, 5, 7, 1)]
r = pagina(fs, None, 2)
assert r == {"datos": [{"id": 1}, {"id": 2}], "siguiente": 2}, f"Obtuviste {r}"
assert pagina(fs, 2, 2) == {"datos": [{"id": 5}, {"id": 7}], "siguiente": 7}
assert pagina(fs, 7, 2) == {"datos": [{"id": 9}], "siguiente": None}
assert pagina(fs, 9, 2) == {"datos": [], "siguiente": None}
assert pagina(fs, None, 5)["siguiente"] is None
```
:::

:::ejercicio python dificultad=Avanzado titulo="Recorrer todas las páginas"
Escribe `extraer_todo(pedir)` donde `pedir(cursor)` es una función que devuelve `{"datos": [...], "siguiente": ...}`. Llama a `pedir` empezando con `cursor=None` y siguiendo con cada `siguiente` hasta que sea `None`. Devuelve la lista con todos los datos, en orden.
```python inicial
def extraer_todo(pedir):
    pass
```
```python solucion
def extraer_todo(pedir):
    todos, cursor = [], None
    while True:
        r = pedir(cursor)
        todos.extend(r["datos"])
        if r["siguiente"] is None:
            return todos
        cursor = r["siguiente"]
```
```pista
Un `while True` que junta `r["datos"]` y termina cuando `r["siguiente"]` es `None`.
```
```python test
paginas = {None: {"datos": [1, 2], "siguiente": "a"}, "a": {"datos": [3], "siguiente": "b"}, "b": {"datos": [4, 5], "siguiente": None}}
llamadas = []
def pedir(c):
    llamadas.append(c)
    return paginas[c]
assert extraer_todo(pedir) == [1, 2, 3, 4, 5], "Faltan o sobran datos"
assert llamadas == [None, "a", "b"], f"Llamadas: {llamadas}"
assert extraer_todo(lambda c: {"datos": [], "siguiente": None}) == []
```
:::
