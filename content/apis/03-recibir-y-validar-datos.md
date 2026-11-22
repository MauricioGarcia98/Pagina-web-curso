---
titulo: Recibir datos - modelos de pydantic, 422 e idempotencia
nivel: Avanzado
duracion: 70
resumen: Una API de datos también recibe - pedidos nuevos, eventos, correcciones. Defines la forma de lo que entra con modelos de pydantic (tipos, rangos, valores permitidos, listas anidadas), dejas que FastAPI responda 422 con el detalle exacto de cada error, devuelves 201 al crear, y evitas los duplicados que provocan los reintentos con una clave de idempotencia, como hacen Stripe y la mayoría de las APIs de pagos.
objetivos: Definir modelos de pydantic con tipos, valores por defecto, Field con rangos y Literal | Recibir el cuerpo JSON de un POST como un modelo validado | Leer el detalle de un error 422 y saber qué campo falló | Responder 201 al crear y 404 al modificar algo que no existe | Hacer que un POST sea seguro de reintentar con una clave de idempotencia
prerrequisitos: apis-primera-api-fastapi
autoevaluacion: ¿Qué hace pydantic con "5" en un campo int? ¿Y con 5 en un campo str? | ¿Cómo limitas un campo a tres valores posibles? | ¿Qué dice el campo loc de un error 422? | ¿Por qué un POST reintentado puede duplicar un pedido y cómo lo evitas?
---

:::analogia En palabras simples
Un formulario en papel con casilleros ("cantidad: solo números del 1 al 100") evita que alguien escriba "muchas". Un modelo de pydantic es ese formulario: FastAPI lo usa para rechazar lo que no encaja **antes** de que llegue a tu código, y dice exactamente qué casillero está mal.
:::

## Un modelo describe lo que entra

```python
from typing import Literal
from pydantic import BaseModel, Field

class Linea(BaseModel):
    producto_id: int
    cantidad: int = Field(ge=1, le=100)

class PedidoNuevo(BaseModel):
    cliente_id: int
    canal: Literal["web", "app", "tienda", "telefono"] = "web"
    lineas: list[Linea] = Field(min_length=1)
    cupon: str | None = None
```

| Declaración | Significa |
|---|---|
| `cliente_id: int` | Obligatorio y entero (`"5"` se convierte a `5`; `"cinco"` es error) |
| `canal: Literal[...] = "web"` | Solo esos valores; si no viene, `"web"` |
| `lineas: list[Linea]` | Una lista de objetos que se validan uno por uno |
| `Field(ge=1, le=100)` | Rango permitido |
| `cupon: str \| None = None` | Opcional |

:::nota Conversión "lax"
pydantic v2 convierte lo razonable y rechaza lo ambiguo: `"5"` sirve para un `int`, pero `5` **no** sirve para un `str` (podría ser un error del cliente). Así lo define la [documentación de pydantic](https://docs.pydantic.dev/latest/concepts/conversion_table/).
:::

## El cuerpo de un POST

Si un parámetro de la función es un modelo, FastAPI lo lee del **cuerpo JSON**:

```python norun
@app.post("/pedidos", status_code=201)
def crear(pedido: PedidoNuevo):
    nuevo = {"pedido_id": len(PEDIDOS) + 1, **pedido.model_dump()}
    PEDIDOS.append(nuevo)
    return nuevo
```

`model_dump()` convierte el modelo en un diccionario (incluidos los modelos anidados). `status_code=201` es el código correcto al crear.

## Leer un 422

Si mandan `{"cliente_id": 7, "canal": "fax", "lineas": [{"producto_id": 1, "cantidad": 0}]}`:

```json
{"detail": [
  {"type": "literal_error", "loc": ["body", "canal"], "msg": "Input should be 'web', 'app', 'tienda' or 'telefono'", "input": "fax"},
  {"type": "greater_than_equal", "loc": ["body", "lineas", 0, "cantidad"], "msg": "Input should be greater than or equal to 1", "input": 0}
]}
```

`loc` es el camino al campo que falló: en el cuerpo, la lista `lineas`, el elemento `0`, el campo `cantidad`. Todos los errores vienen juntos, así el cliente corrige todo de una vez.

## Reintentos sin duplicados: la clave de idempotencia

El cliente manda un `POST /pedidos`, la red se corta **antes** de recibir la respuesta, y reintenta. ¿Se creó el pedido la primera vez? No lo sabe. Si reintenta y se había creado, ahora hay dos.

```diagrama
titulo: La clave de idempotencia evita el pedido duplicado al reintentar
nodo c: Cliente | icono=movil | col=0 | fila=0 | color=gris | sub=Idempotency-Key: pedido-abc-1
nodo api: POST /pedidos | icono=fastapi | col=1 | fila=0 | color=azul
nodo q: ¿Ya vi esta clave? | icono=lupa | col=2 | fila=0 | color=amarillo | forma=rombo
nodo cr: Crear el pedido y guardar la respuesta | icono=check | col=3 | fila=0 | color=verde
nodo re: Devolver la respuesta guardada | icono=archivo | col=3 | fila=1 | color=violeta | sub=sin crear nada
flecha c -> api: 1.º intento y reintento | explica=El cliente manda el pedido con una clave de idempotencia. Si no recibe respuesta (se cortó la red), reintenta con la misma clave.
flecha api -> q | explica=La API primero se fija si ya vio esa clave.
flecha q -> cr: no | explica=Si es nueva, crea el pedido y guarda la respuesta asociada a la clave.
flecha q -> re: sí | explica=Si ya la vio, devuelve la respuesta guardada sin crear nada. Así un reintento nunca duplica el pedido.
```

La solución estándar: el cliente genera una clave única por operación y la manda en el encabezado `Idempotency-Key`. El servidor guarda la respuesta de cada clave; si vuelve a llegar la misma clave, devuelve la respuesta guardada **sin crear nada**. Así lo documenta, por ejemplo, la [API de Stripe](https://docs.stripe.com/api/idempotent_requests).

```python norun
from fastapi import Header

RESPUESTAS = {}

@app.post("/pedidos", status_code=201)
def crear(pedido: PedidoNuevo, idempotency_key: str | None = Header(None)):
    if idempotency_key in RESPUESTAS:
        return RESPUESTAS[idempotency_key]
    nuevo = {"pedido_id": len(PEDIDOS) + 1, **pedido.model_dump()}
    PEDIDOS.append(nuevo)
    if idempotency_key:
        RESPUESTAS[idempotency_key] = nuevo
    return nuevo
```

`Header(None)` lee el encabezado; FastAPI convierte `idempotency_key` en `idempotency-key` (sin distinguir mayúsculas).

:::cuidado Guardar las claves en memoria
En este ejemplo las claves viven en un diccionario: si el servidor se reinicia o hay varias copias de la API, se pierden. En producción se guardan en una base o en Redis, con vencimiento (por ejemplo, 24 horas).
:::

:::practica python Ver los errores 422 y la idempotencia en acción
1. Ejecuta: se crea un pedido válido, uno inválido (mira el detalle del 422) y se repite un pedido con la misma clave.
2. Comprueba que, con la misma `Idempotency-Key`, la lista de pedidos no crece.
3. Agrega al modelo `Linea` un campo `precio_unitario: float = Field(gt=0)` y prueba qué pasa si mandas `0`.

```python
from typing import Literal
from fastapi import FastAPI, Header
from fastapi.testclient import TestClient
from pydantic import BaseModel, Field

class Linea(BaseModel):
    producto_id: int
    cantidad: int = Field(ge=1, le=100)

class PedidoNuevo(BaseModel):
    cliente_id: int
    canal: Literal["web", "app", "tienda", "telefono"] = "web"
    lineas: list[Linea] = Field(min_length=1)

PEDIDOS, RESPUESTAS = [], {}
app = FastAPI()

@app.post("/pedidos", status_code=201)
def crear(pedido: PedidoNuevo, idempotency_key: str | None = Header(None)):
    if idempotency_key in RESPUESTAS:
        return RESPUESTAS[idempotency_key]
    nuevo = {"pedido_id": len(PEDIDOS) + 1, **pedido.model_dump()}
    PEDIDOS.append(nuevo)
    if idempotency_key:
        RESPUESTAS[idempotency_key] = nuevo
    return nuevo

c = TestClient(app)
ok = {"cliente_id": 7, "lineas": [{"producto_id": 1, "cantidad": 2}]}
print(c.post("/pedidos", json=ok).json())
malo = {"cliente_id": 7, "canal": "fax", "lineas": [{"producto_id": 1, "cantidad": 0}]}
r = c.post("/pedidos", json=malo)
print(r.status_code)
for e in r.json()["detail"]:
    print("  ", e["loc"], "→", e["msg"])
for _ in range(3):
    c.post("/pedidos", json=ok, headers={"Idempotency-Key": "pedido-abc-1"})
print("pedidos guardados:", len(PEDIDOS))   # 2: el primero y uno solo de los tres reintentos
```

Reto: haz que un reintento con la misma clave pero con un cuerpo **distinto** responda 409 (conflicto), como hace Stripe.

Documentación oficial: [Cuerpo del pedido (FastAPI)](https://fastapi.tiangolo.com/tutorial/body/) · [Validación de campos (FastAPI)](https://fastapi.tiangolo.com/tutorial/body-fields/) · [Modelos (pydantic)](https://docs.pydantic.dev/latest/concepts/models/) · [Pedidos idempotentes (Stripe)](https://docs.stripe.com/api/idempotent_requests)
:::

:::errores
- **Validar con `if` a mano.** Lo que se puede declarar en el modelo, se declara.
- **Devolver 200 al crear.** El código correcto es 201.
- **`POST` sin idempotencia en operaciones con dinero.** Un reintento duplica el cobro.
- **Aceptar listas vacías sin pensarlo.** Un pedido sin líneas casi nunca es válido: `Field(min_length=1)`.
:::

:::entrevista
**Pregunta:** "Te llegan eventos de una app móvil por una API, y a veces llegan repetidos. ¿Cómo lo manejas?"

**Respuesta modelo:** "Cada evento trae un id único generado en el teléfono. En la API, si un id ya se procesó, respondo como si fuera nuevo pero no lo guardo dos veces (idempotencia por clave). Y, como defensa en profundidad, la capa silver deduplica por ese id con `MERGE`, porque los duplicados también pueden entrar por otros caminos, como un reprocesamiento."
:::

## Ejercicios

:::ejercicio python dificultad=Avanzado titulo="Un modelo que valida un pedido"
Define el modelo `PedidoNuevo` de pydantic con: `producto_id` entero obligatorio; `cantidad` entero entre 1 y 100 (obligatorio); `canal` que solo acepta `"web"`, `"app"` o `"tienda"`, con `"web"` por defecto; y `cupon` texto opcional (por defecto `None`).
```python inicial
from typing import Literal
from pydantic import BaseModel, Field

class PedidoNuevo(BaseModel):
    pass
```
```python solucion
from typing import Literal
from pydantic import BaseModel, Field

class PedidoNuevo(BaseModel):
    producto_id: int
    cantidad: int = Field(ge=1, le=100)
    canal: Literal["web", "app", "tienda"] = "web"
    cupon: str | None = None
```
```pista
Un campo por línea con su tipo. El rango va con `Field(ge=1, le=100)` y los valores permitidos con `Literal[...]`.
```
```python test
from pydantic import ValidationError
p = PedidoNuevo(producto_id="5", cantidad=3)
assert p.producto_id == 5 and p.canal == "web" and p.cupon is None, f"Obtuviste {p.model_dump()}"
for malo, campo in [({"producto_id": 1, "cantidad": 0}, "cantidad"), ({"producto_id": 1, "cantidad": 101}, "cantidad"),
                    ({"producto_id": 1, "cantidad": 2, "canal": "fax"}, "canal"), ({"cantidad": 2}, "producto_id")]:
    try:
        PedidoNuevo(**malo)
    except ValidationError as e:
        assert any(x["loc"][0] == campo for x in e.errors()), f"Con {malo} el error debería ser en '{campo}'"
    else:
        raise AssertionError(f"{malo} debería ser inválido")
assert PedidoNuevo(producto_id=1, cantidad=100, canal="tienda", cupon="VERANO10").cupon == "VERANO10"
```
:::

:::ejercicio python dificultad=Avanzado titulo="Crear un pedido con POST"
Con el modelo dado, crea `POST /pedidos` que responda **201** y devuelva el pedido creado con un campo `pedido_id` (el siguiente número: 1, 2, 3…) más los campos del modelo. Guarda cada pedido en la lista `PEDIDOS`. Si el cuerpo no es válido, FastAPI responde 422 solo.
```python inicial
from fastapi import FastAPI
from pydantic import BaseModel, Field

class PedidoNuevo(BaseModel):
    producto_id: int
    cantidad: int = Field(ge=1, le=100)

PEDIDOS = []
app = FastAPI()
```
```python solucion
from fastapi import FastAPI
from pydantic import BaseModel, Field

class PedidoNuevo(BaseModel):
    producto_id: int
    cantidad: int = Field(ge=1, le=100)

PEDIDOS = []
app = FastAPI()

@app.post("/pedidos", status_code=201)
def crear(pedido: PedidoNuevo):
    nuevo = {"pedido_id": len(PEDIDOS) + 1, **pedido.model_dump()}
    PEDIDOS.append(nuevo)
    return nuevo
```
```pista
Si el parámetro de la función es un modelo, FastAPI lo lee del cuerpo. El código va en el decorador: `@app.post("/pedidos", status_code=201)`.
```
```python test
from fastapi.testclient import TestClient
c = TestClient(app)
r = c.post("/pedidos", json={"producto_id": 4, "cantidad": 2})
assert r.status_code == 201, f"Al crear se espera 201 y llegó {r.status_code}"
assert r.json() == {"pedido_id": 1, "producto_id": 4, "cantidad": 2}, f"Obtuviste {r.json()}"
assert c.post("/pedidos", json={"producto_id": 5, "cantidad": 1}).json()["pedido_id"] == 2
r = c.post("/pedidos", json={"producto_id": 4, "cantidad": 0})
assert r.status_code == 422 and r.json()["detail"][0]["loc"] == ["body", "cantidad"], f"Obtuviste {r.status_code} {r.json()}"
assert len(PEDIDOS) == 2, "Un pedido inválido no se debe guardar"
```
:::

:::ejercicio python dificultad=Experto titulo="POST seguro de reintentar"
Agrega idempotencia a `POST /pedidos`: lee el encabezado opcional `Idempotency-Key`. Si la clave ya se usó, devuelve la misma respuesta guardada **sin crear otro pedido**. Sin clave, cada POST crea un pedido. Responde 201.
```python inicial
from fastapi import FastAPI, Header
from pydantic import BaseModel

class PedidoNuevo(BaseModel):
    producto_id: int
    cantidad: int

PEDIDOS, RESPUESTAS = [], {}
app = FastAPI()

@app.post("/pedidos", status_code=201)
def crear(pedido: PedidoNuevo):
    nuevo = {"pedido_id": len(PEDIDOS) + 1, **pedido.model_dump()}
    PEDIDOS.append(nuevo)
    return nuevo
```
```python solucion
from fastapi import FastAPI, Header
from pydantic import BaseModel

class PedidoNuevo(BaseModel):
    producto_id: int
    cantidad: int

PEDIDOS, RESPUESTAS = [], {}
app = FastAPI()

@app.post("/pedidos", status_code=201)
def crear(pedido: PedidoNuevo, idempotency_key: str | None = Header(None)):
    if idempotency_key in RESPUESTAS:
        return RESPUESTAS[idempotency_key]
    nuevo = {"pedido_id": len(PEDIDOS) + 1, **pedido.model_dump()}
    PEDIDOS.append(nuevo)
    if idempotency_key:
        RESPUESTAS[idempotency_key] = nuevo
    return nuevo
```
```pista
`idempotency_key: str | None = Header(None)` lee el encabezado `Idempotency-Key`: FastAPI cambia el guion bajo por guion.
```
```pista
Antes de crear, si la clave está en `RESPUESTAS`, devuelve lo guardado. Después de crear, guarda la respuesta con su clave.
```
```python test
from fastapi.testclient import TestClient
c = TestClient(app)
cuerpo = {"producto_id": 1, "cantidad": 2}
r1 = c.post("/pedidos", json=cuerpo, headers={"Idempotency-Key": "k-1"})
r2 = c.post("/pedidos", json=cuerpo, headers={"idempotency-key": "k-1"})
assert r1.json() == r2.json(), "Con la misma clave debe volver la misma respuesta"
assert len(PEDIDOS) == 1, f"Con la misma clave no se debe crear otro pedido: hay {len(PEDIDOS)}"
c.post("/pedidos", json=cuerpo)
c.post("/pedidos", json=cuerpo)
assert len(PEDIDOS) == 3, "Sin clave, cada POST crea un pedido"
assert c.post("/pedidos", json=cuerpo, headers={"Idempotency-Key": "k-2"}).json()["pedido_id"] == 4
```
:::

:::ejercicio python dificultad=Avanzado titulo="Actualizar un precio con PUT"
Crea `PUT /productos/{producto_id}` que reciba un cuerpo `{"precio": ...}` (modelo `NuevoPrecio` con `precio` decimal **mayor que 0**), actualice el precio del producto y devuelva el producto completo. Si el producto no existe, responde **404** con `detail` `"Producto no encontrado"`.
```python inicial
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

PRODUCTOS = {1: {"id": 1, "nombre": "Mouse", "precio": 20.0}, 2: {"id": 2, "nombre": "Teclado", "precio": 35.5}}
app = FastAPI()
```
```python solucion
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

PRODUCTOS = {1: {"id": 1, "nombre": "Mouse", "precio": 20.0}, 2: {"id": 2, "nombre": "Teclado", "precio": 35.5}}
app = FastAPI()

class NuevoPrecio(BaseModel):
    precio: float = Field(gt=0)

@app.put("/productos/{producto_id}")
def actualizar(producto_id: int, cambio: NuevoPrecio):
    if producto_id not in PRODUCTOS:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    PRODUCTOS[producto_id]["precio"] = cambio.precio
    return PRODUCTOS[producto_id]
```
```pista
La función recibe dos parámetros: el id de la ruta (`producto_id: int`) y el cuerpo (`cambio: NuevoPrecio`). FastAPI distingue cada uno solo.
```
```python test
from fastapi.testclient import TestClient
c = TestClient(app)
r = c.put("/productos/2", json={"precio": 39.9})
assert r.status_code == 200 and r.json() == {"id": 2, "nombre": "Teclado", "precio": 39.9}, f"Obtuviste {r.status_code} {r.json()}"
assert PRODUCTOS[2]["precio"] == 39.9
assert c.put("/productos/9", json={"precio": 10}).status_code == 404
assert c.put("/productos/1", json={"precio": 0}).status_code == 422, "precio 0 debe dar 422"
assert c.put("/productos/1", json={}).status_code == 422
```
:::
