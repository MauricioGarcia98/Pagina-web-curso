---
titulo: Tu primera API con FastAPI - leer datos con GET
nivel: Avanzado
duracion: 65
resumen: Construyes una API que sirve datos de la tienda con FastAPI - una ruta de salud, un recurso por id con 404 cuando no existe, una lista con filtros y límites validados, un resumen agregado y una paginación por cursor. Cada ejercicio se prueba con TestClient, la misma herramienta que se usa en los proyectos reales para probar una API sin levantar un servidor.
objetivos: Crear una app de FastAPI y declarar rutas GET | Recibir parámetros de ruta y de consulta con tipos que FastAPI valida solo | Responder 404 con HTTPException cuando un recurso no existe | Limitar parámetros con Query(ge=, le=) y entender el 422 que devuelve FastAPI | Probar cada ruta con TestClient y asserts sobre el código y el JSON
prerrequisitos: apis-disenar-una-api-de-datos
autoevaluacion: ¿Cómo sabe FastAPI que un parámetro viene de la ruta y otro de la query? | ¿Qué pasa si piden /productos/abc y el parámetro es int? | ¿Cómo devuelves un 404 con un mensaje? | ¿Para qué sirve TestClient?
---

:::analogia En palabras simples
FastAPI es como un recepcionista que lee la firma de tus funciones. Si escribes `def producto(producto_id: int)`, el recepcionista ya sabe que hay que pedir un número, convertirlo, y rechazar con un mensaje claro a quien mande letras. Tú solo escribes qué hacer con un pedido correcto.
:::

## La app más chica

```python
from fastapi import FastAPI
from fastapi.testclient import TestClient

app = FastAPI(title="API de la tienda")

@app.get("/salud")
def salud():
    return {"estado": "ok"}

cliente = TestClient(app)
r = cliente.get("/salud")
print(r.status_code, r.json())   # 200 {'estado': 'ok'}
```

| Pieza | Qué hace |
|---|---|
| `FastAPI()` | Crea la aplicación |
| `@app.get("/salud")` | Esta función atiende `GET /salud` |
| `return {...}` | FastAPI lo convierte a JSON |
| `TestClient(app)` | Un cliente que le habla a la app **sin servidor**: ideal para tests |

:::nota En tu computadora y en el navegador
En este curso, FastAPI corre en el navegador con una **versión reducida** que tiene la misma interfaz y responde igual (mismos códigos y mismos mensajes de error). En tu computadora instalas la real con `uv add "fastapi[standard]"` y la levantas con `fastapi dev main.py`: queda en `http://127.0.0.1:8000`, con la documentación interactiva en `/docs`. El código es el mismo. Detalles en la [documentación oficial](https://fastapi.tiangolo.com/tutorial/first-steps/).
:::

## Parámetros de ruta y de consulta

FastAPI decide de dónde sale cada parámetro mirando la firma de la función:

```diagrama
titulo: Qué hace FastAPI con cada pedido antes de llamar a tu función
nodo req: GET /productos/7?limite=5 | icono=internet | col=0 | fila=1 | color=gris
nodo ruta: Buscar la ruta | icono=lupa | col=1 | fila=1 | color=azul | sub=si no existe: 404
nodo val: Validar parámetros | icono=reglas | col=2 | fila=1 | color=violeta | sub=producto_id: int · limite entre 1 y 50
nodo e422: 422 con el detalle | icono=x | col=2 | fila=2 | color=rojo
nodo fn: Tu función | icono=python | col=3 | fila=1 | color=verde | sub=recibe producto_id=7, limite=5
nodo json: Respuesta JSON | icono=documento | col=4 | fila=1 | color=verde
flecha req -> ruta
flecha ruta -> val
flecha val -> e422: inválido
flecha val -> fn: válido
flecha fn -> json
```

```python norun
@app.get("/productos/{producto_id}")          # producto_id está en la ruta
def producto(producto_id: int):               # → parámetro de ruta, convertido a int
    ...

@app.get("/productos")
def productos(categoria: str | None = None,   # no está en la ruta y es simple → query, opcional
              limite: int = 10):              # → query con valor por defecto
    ...
```

| Petición | Qué recibe la función |
|---|---|
| `GET /productos/7` | `producto_id=7` (int) |
| `GET /productos/abc` | Nada: FastAPI responde **422** sin llamar a tu función |
| `GET /productos?categoria=audio&limite=5` | `categoria="audio"`, `limite=5` |
| `GET /productos` | `categoria=None`, `limite=10` |

## Errores: HTTPException

```python norun
from fastapi import HTTPException

@app.get("/productos/{producto_id}")
def producto(producto_id: int):
    for p in PRODUCTOS:
        if p["id"] == producto_id:
            return p
    raise HTTPException(status_code=404, detail="Producto no encontrado")
```

La respuesta es `404` con el cuerpo `{"detail": "Producto no encontrado"}`.

## Límites con Query

`limite: int = Query(10, ge=1, le=50)` valida que esté entre 1 y 50. Si piden `?limite=500`, FastAPI responde 422 con un detalle que dice exactamente qué falló y dónde:

```json
{"detail": [{"type": "less_than_equal", "loc": ["query", "limite"],
             "msg": "Input should be less than or equal to 50", "input": "500", "ctx": {"le": 50}}]}
```

:::cuidado Sin límite, una API se cae
Un endpoint de lista sin tope (`limite` sin `le=`) deja que alguien pida un millón de filas de una vez: la API se queda sin memoria o tarda minutos. Toda lista lleva un máximo y paginación.
:::

:::practica python Una API completa en un solo archivo
1. Ejecuta: la API tiene salud, un producto por id y una lista filtrable; abajo, el cliente de prueba hace pedidos y muestra las respuestas.
2. Mira la respuesta de `/productos/abc` y de `?limite=500`: FastAPI responde 422 sin que hayas escrito ni una línea de validación.
3. Agrega una ruta `GET /categorias` que devuelva la lista de categorías sin repetir, ordenada.

```python
from fastapi import FastAPI, HTTPException, Query
from fastapi.testclient import TestClient

PRODUCTOS = [
    {"id": 1, "nombre": "Parlante JBL Pro", "categoria": "audio", "precio": 120.0},
    {"id": 2, "nombre": "Auricular Sony Air", "categoria": "audio", "precio": 85.5},
    {"id": 3, "nombre": "Teclado Logitech Mini", "categoria": "pc", "precio": 45.0},
    {"id": 4, "nombre": "Webcam Logitech Pro", "categoria": "pc", "precio": 60.0},
]

app = FastAPI(title="API de la tienda")

@app.get("/salud")
def salud():
    return {"estado": "ok"}

@app.get("/productos/{producto_id}")
def producto(producto_id: int):
    for p in PRODUCTOS:
        if p["id"] == producto_id:
            return p
    raise HTTPException(status_code=404, detail="Producto no encontrado")

@app.get("/productos")
def productos(categoria: str | None = None, limite: int = Query(10, ge=1, le=50)):
    filtrados = [p for p in PRODUCTOS if categoria is None or p["categoria"] == categoria]
    return filtrados[:limite]

c = TestClient(app)
for url in ["/salud", "/productos/3", "/productos/99", "/productos/abc", "/productos?categoria=audio", "/productos?limite=500"]:
    r = c.get(url)
    print(f"{url:28} {r.status_code} {r.json()}")
```

Reto: agrega a `/productos` un parámetro `orden` que acepte `precio` o `nombre` y ordene la lista (pista: `typing.Literal["precio", "nombre"]` hace que FastAPI rechace cualquier otro valor con 422).

Documentación oficial: [Primeros pasos](https://fastapi.tiangolo.com/tutorial/first-steps/) · [Parámetros de ruta](https://fastapi.tiangolo.com/tutorial/path-params/) · [Parámetros de consulta](https://fastapi.tiangolo.com/tutorial/query-params/) · [Testing](https://fastapi.tiangolo.com/tutorial/testing/)
:::

:::errores
- **Devolver `None` cuando no existe.** Responde 404 con `HTTPException`.
- **Validar a mano lo que FastAPI ya valida.** Declara el tipo y los límites en la firma.
- **Listas sin tope.** Siempre `Query(..., le=...)`.
- **Probar abriendo el navegador.** Un test con `TestClient` se repite en segundos y en cada cambio.
:::

:::entrevista
**Pregunta:** "¿Por qué FastAPI y no Flask para una API de datos?"

**Respuesta modelo:** "FastAPI usa los tipos de Python para validar entradas y salidas con pydantic y genera la documentación OpenAPI sola, en `/docs`. Eso elimina mucho código de validación y hace el contrato explícito. Además soporta funciones asíncronas para endpoints que esperan a otras APIs. Flask sigue siendo válido, pero ahí la validación y la documentación las agregas tú con otras librerías."
:::

## Ejercicios

:::ejercicio python dificultad=Intermedio titulo="La ruta de salud"
Crea una app de FastAPI llamada `app` con una ruta `GET /salud` que devuelva `{"estado": "ok", "version": "1.0"}`.
```python inicial
from fastapi import FastAPI

app = FastAPI()
# tu ruta aquí
```
```python solucion
from fastapi import FastAPI

app = FastAPI()

@app.get("/salud")
def salud():
    return {"estado": "ok", "version": "1.0"}
```
```pista
Decora una función con `@app.get("/salud")` y devuelve el diccionario.
```
```python test
from fastapi.testclient import TestClient
r = TestClient(app).get("/salud")
assert r.status_code == 200, f"Código {r.status_code}"
assert r.json() == {"estado": "ok", "version": "1.0"}, f"Obtuviste {r.json()}"
```
:::

:::ejercicio python dificultad=Avanzado titulo="Un producto por id, con 404"
Completa la ruta `GET /productos/{producto_id}`: devuelve el producto con ese id, o responde **404** con `detail` igual a `"Producto no encontrado"`. El id debe ser entero (si mandan letras, FastAPI debe responder 422 solo).
```python inicial
from fastapi import FastAPI, HTTPException

PRODUCTOS = [{"id": 1, "nombre": "Mouse", "precio": 20.0}, {"id": 2, "nombre": "Teclado", "precio": 35.5}]
app = FastAPI()

@app.get("/productos/{producto_id}")
def producto(producto_id):
    pass
```
```python solucion
from fastapi import FastAPI, HTTPException

PRODUCTOS = [{"id": 1, "nombre": "Mouse", "precio": 20.0}, {"id": 2, "nombre": "Teclado", "precio": 35.5}]
app = FastAPI()

@app.get("/productos/{producto_id}")
def producto(producto_id: int):
    for p in PRODUCTOS:
        if p["id"] == producto_id:
            return p
    raise HTTPException(status_code=404, detail="Producto no encontrado")
```
```pista
Sin la anotación `: int`, el id llega como texto y `"2" == 2` es falso. Con `producto_id: int`, FastAPI lo convierte y rechaza las letras.
```
```pista
Si el bucle termina sin encontrarlo: `raise HTTPException(status_code=404, detail="Producto no encontrado")`.
```
```python test
from fastapi.testclient import TestClient
c = TestClient(app)
r = c.get("/productos/2")
assert r.status_code == 200 and r.json()["nombre"] == "Teclado", f"Obtuviste {r.status_code} {r.json()}"
r = c.get("/productos/9")
assert r.status_code == 404, f"Para un id que no existe se esperaba 404 y llegó {r.status_code}"
assert r.json() == {"detail": "Producto no encontrado"}
assert c.get("/productos/abc").status_code == 422, "Con letras, FastAPI debe responder 422: falta anotar el tipo int"
```
:::

:::ejercicio python dificultad=Avanzado titulo="Lista con filtro y límite validado"
Completa `GET /productos`: un parámetro opcional `categoria` filtra la lista; `limite` (por defecto 10) debe estar **entre 1 y 50** (si no, 422) y corta la cantidad de resultados. Devuelve la lista de productos.
```python inicial
from fastapi import FastAPI, Query

PRODUCTOS = [{"id": i, "categoria": "audio" if i % 2 else "pc"} for i in range(1, 31)]
app = FastAPI()

@app.get("/productos")
def productos():
    pass
```
```python solucion
from fastapi import FastAPI, Query

PRODUCTOS = [{"id": i, "categoria": "audio" if i % 2 else "pc"} for i in range(1, 31)]
app = FastAPI()

@app.get("/productos")
def productos(categoria: str | None = None, limite: int = Query(10, ge=1, le=50)):
    filtrados = [p for p in PRODUCTOS if categoria is None or p["categoria"] == categoria]
    return filtrados[:limite]
```
```pista
`categoria: str | None = None` es opcional. Para el límite validado: `limite: int = Query(10, ge=1, le=50)`.
```
```python test
from fastapi.testclient import TestClient
c = TestClient(app)
r = c.get("/productos")
assert r.status_code == 200 and len(r.json()) == 10, "Sin parámetros: 10 productos"
r = c.get("/productos", params={"categoria": "pc", "limite": 3})
assert [p["id"] for p in r.json()] == [2, 4, 6], f"Obtuviste {r.json()}"
assert c.get("/productos", params={"limite": 0}).status_code == 422, "limite=0 debe dar 422"
assert c.get("/productos", params={"limite": 51}).status_code == 422, "limite=51 debe dar 422"
assert len(c.get("/productos", params={"limite": 50}).json()) == 30
```
:::

:::ejercicio python dificultad=Avanzado titulo="Un resumen agregado"
Crea `GET /ventas/resumen` que devuelva, para los pedidos de la lista `PEDIDOS`, un diccionario `{canal: {"pedidos": n, "total": suma_redondeada_a_2}}`. Con el parámetro opcional `estado`, solo cuenta los pedidos con ese estado.
```python inicial
from fastapi import FastAPI

PEDIDOS = [
    {"id": 1, "canal": "web", "estado": "entregado", "monto": 10.5},
    {"id": 2, "canal": "app", "estado": "cancelado", "monto": 99.0},
    {"id": 3, "canal": "web", "estado": "entregado", "monto": 4.25},
    {"id": 4, "canal": "app", "estado": "entregado", "monto": 20.0},
]
app = FastAPI()
```
```python solucion
from fastapi import FastAPI

PEDIDOS = [
    {"id": 1, "canal": "web", "estado": "entregado", "monto": 10.5},
    {"id": 2, "canal": "app", "estado": "cancelado", "monto": 99.0},
    {"id": 3, "canal": "web", "estado": "entregado", "monto": 4.25},
    {"id": 4, "canal": "app", "estado": "entregado", "monto": 20.0},
]
app = FastAPI()

@app.get("/ventas/resumen")
def resumen(estado: str | None = None):
    res = {}
    for p in PEDIDOS:
        if estado is not None and p["estado"] != estado:
            continue
        r = res.setdefault(p["canal"], {"pedidos": 0, "total": 0.0})
        r["pedidos"] += 1
        r["total"] = round(r["total"] + p["monto"], 2)
    return res
```
```pista
Recorre los pedidos acumulando en un diccionario por canal con `setdefault`. El filtro por estado va primero.
```
```python test
from fastapi.testclient import TestClient
c = TestClient(app)
r = c.get("/ventas/resumen").json()
assert r == {"web": {"pedidos": 2, "total": 14.75}, "app": {"pedidos": 2, "total": 119.0}}, f"Obtuviste {r}"
r = c.get("/ventas/resumen", params={"estado": "entregado"}).json()
assert r == {"web": {"pedidos": 2, "total": 14.75}, "app": {"pedidos": 1, "total": 20.0}}, f"Obtuviste {r}"
assert c.get("/ventas/resumen", params={"estado": "devuelto"}).json() == {}
```
:::

:::ejercicio python dificultad=Experto titulo="Pedidos paginados por cursor"
Crea `GET /pedidos` con los parámetros `cursor` (entero opcional) y `limite` (entre 1 y 100, por defecto 2). Devuelve `{"datos": [...], "siguiente": ...}` con los pedidos de `id` mayor al cursor, ordenados por `id`; `siguiente` es el último `id` devuelto si quedan más, o `None`.
```python inicial
from fastapi import FastAPI, Query

PEDIDOS = [{"id": i, "monto": i * 1.5} for i in (8, 3, 15, 4, 11)]
app = FastAPI()
```
```python solucion
from fastapi import FastAPI, Query

PEDIDOS = [{"id": i, "monto": i * 1.5} for i in (8, 3, 15, 4, 11)]
app = FastAPI()

@app.get("/pedidos")
def pedidos(cursor: int | None = None, limite: int = Query(2, ge=1, le=100)):
    resto = sorted((p for p in PEDIDOS if cursor is None or p["id"] > cursor), key=lambda p: p["id"])
    datos = resto[:limite]
    siguiente = datos[-1]["id"] if len(resto) > limite else None
    return {"datos": datos, "siguiente": siguiente}
```
```pista
Es el servidor de la lección 1 dentro de una ruta: filtra, ordena, corta y calcula `siguiente`.
```
```python test
from fastapi.testclient import TestClient
c = TestClient(app)
r = c.get("/pedidos").json()
assert [p["id"] for p in r["datos"]] == [3, 4] and r["siguiente"] == 4, f"Obtuviste {r}"
r = c.get("/pedidos", params={"cursor": 4}).json()
assert [p["id"] for p in r["datos"]] == [8, 11] and r["siguiente"] == 11
r = c.get("/pedidos", params={"cursor": 11}).json()
assert [p["id"] for p in r["datos"]] == [15] and r["siguiente"] is None
assert c.get("/pedidos", params={"cursor": "x"}).status_code == 422
assert c.get("/pedidos", params={"limite": 101}).status_code == 422
```
:::
