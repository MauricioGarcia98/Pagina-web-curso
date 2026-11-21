---
titulo: Seguridad, límites de uso y llevar la API a producción
nivel: Experto
duracion: 70
resumen: Una API de datos pública o interna necesita saber quién llama, limitar cuánto llama y no devolver más de lo que debe. Proteges rutas con una clave usando dependencias, respondes 401 y 403 correctamente, ocultas campos sensibles con response_model, limitas el uso con 429 y Retry-After, versionas con routers, y ves cómo se despliega - variables de entorno para los secretos, uvicorn y un Dockerfile.
objetivos: Proteger rutas con una dependencia que verifica una clave de API | Distinguir cuándo responder 401 y cuándo 403 | Ocultar campos sensibles de la respuesta con response_model | Implementar un límite de uso por ventana de tiempo que responde 429 con Retry-After | Organizar versiones con APIRouter y prefijos | Preparar la API para producción con secretos en variables de entorno y un contenedor
prerrequisitos: apis-recibir-y-validar-datos
autoevaluacion: ¿Qué es una dependencia en FastAPI y por qué sirve para la autenticación? | ¿Por qué response_model protege datos aunque la función devuelva de más? | ¿Qué debe hacer un cliente cuando recibe 429? | ¿Dónde guardas la clave secreta de la API?
---

:::analogia En palabras simples
Un edificio de oficinas tiene un guardia en la entrada (la clave de API: ¿quién eres?), tarjetas que solo abren ciertos pisos (los permisos: ¿qué puedes ver?), un límite de visitas por día (el límite de uso) y no deja que nadie se lleve los archivos de personal (los campos sensibles). Una API en producción necesita las cuatro cosas.
:::

## Dependencias: el guardia de la entrada

Una **dependencia** es una función que FastAPI ejecuta **antes** de tu ruta. Si lanza una excepción, la ruta no se ejecuta. Es el lugar natural para verificar quién llama:

```diagrama
titulo: Los controles por los que pasa un pedido antes de llegar a los datos
nodo req: Pedido con X-API-Key | icono=internet | col=0 | fila=1 | color=gris
nodo k: ¿Clave válida? | icono=llave | col=1 | fila=1 | color=amarillo | forma=rombo
nodo l: ¿Dentro del límite? | icono=reloj | col=2 | fila=1 | color=amarillo | forma=rombo
nodo p: ¿Tiene permiso? | icono=candado | col=3 | fila=1 | color=amarillo | forma=rombo
nodo ok: Ruta + response_model | icono=check | col=4 | fila=1 | color=verde | sub=solo los campos públicos
nodo e401: 401 | icono=x | col=1 | fila=2 | color=rojo
nodo e429: 429 + Retry-After | icono=x | col=2 | fila=2 | color=rojo
nodo e403: 403 | icono=x | col=3 | fila=2 | color=rojo
flecha req -> k
flecha k -> l: sí
flecha l -> p: sí
flecha p -> ok: sí
flecha k -> e401: no
flecha l -> e429: no
flecha p -> e403: no
```

```python norun
from fastapi import Depends, Header, HTTPException

CLAVES = {"clave-finanzas": "finanzas", "clave-comercial": "comercial"}

def equipo_actual(x_api_key: str | None = Header(None)) -> str:
    if x_api_key is None or x_api_key not in CLAVES:
        raise HTTPException(status_code=401, detail="Falta la clave o no es válida")
    return CLAVES[x_api_key]

@app.get("/reportes/ventas")
def ventas(equipo: str = Depends(equipo_actual)):
    return {"equipo": equipo, "total": 5351271.08}
```

| Situación | Código |
|---|---|
| No mandó clave, o la clave no existe | **401** Unauthorized: "no sé quién eres" |
| La clave es válida pero ese equipo no puede ver el recurso | **403** Forbidden: "sé quién eres y no puedes" |

:::cuidado Las claves no van en el código
En el ejemplo, las claves están en un diccionario para practicar. En producción viven en un gestor de secretos (Azure Key Vault, AWS Secrets Manager) o en variables de entorno que se leen al arrancar (`os.environ["API_KEY"]`), y se guardan **hasheadas**, como las contraseñas. Una clave en el repositorio queda expuesta para siempre en el historial de Git.
:::

## response_model: no devolver de más

Si la función devuelve el registro completo del cliente, el email y el teléfono salen en la respuesta. Con `response_model`, FastAPI **filtra** la salida a los campos del modelo, aunque la función devuelva más:

```python norun
class ClientePublico(BaseModel):
    cliente_id: int
    nombre: str
    ciudad: str

@app.get("/clientes/{cliente_id}", response_model=ClientePublico)
def cliente(cliente_id: int):
    return CLIENTES[cliente_id]      # trae email y teléfono, pero no salen
```

Es una red de seguridad: si mañana alguien agrega una columna sensible a la tabla, no aparece en la API por accidente. Ver [modelo de respuesta en la documentación](https://fastapi.tiangolo.com/tutorial/response-model/).

## Límites de uso: 429 y Retry-After

Un límite de uso protege la API de un cliente con un bucle descontrolado. La forma más simple es la **ventana fija**: como máximo N pedidos por clave cada X segundos. Al pasarse, se responde **429** con el encabezado `Retry-After` (segundos que faltan para que se abra la ventana siguiente). Un cliente bien escrito espera ese tiempo antes de reintentar (lo viste del lado del cliente en [Python: extraer de una API](#/l/python-extraer-de-apis)).

```python norun
raise HTTPException(status_code=429, detail="Demasiados pedidos", headers={"Retry-After": "12"})
```

## Versiones con routers

```python norun
from fastapi import APIRouter

v1 = APIRouter(prefix="/v1")

@v1.get("/productos")
def productos_v1(): ...

app.include_router(v1)        # la ruta queda en /v1/productos
```

Cuando necesites un cambio incompatible, creas `v2` y mantienes `v1` durante la transición.

## Llevarla a producción

| Tema | Cómo |
|---|---|
| Servidor | `fastapi run main.py` (usa uvicorn) o `uvicorn main:app --host 0.0.0.0 --port 8000` |
| Contenedor | Un `Dockerfile` con la imagen oficial de Python, `uv sync` y el comando de arriba ([guía oficial](https://fastapi.tiangolo.com/deployment/docker/)) |
| Secretos | Variables de entorno o un gestor de secretos; nunca en el código |
| Varias copias | Detrás de un balanceador; el estado (claves de idempotencia, contadores) va en Redis o en una base, no en memoria |
| Observabilidad | Registros con el id de cada pedido, métricas de latencia y de códigos 4xx/5xx |
| Documentación | `/docs` (Swagger UI) y `/openapi.json` salen solos: compártelos con quien consume la API |

```dockerfile norun
FROM python:3.13-slim
WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN pip install uv && uv sync --frozen --no-dev
COPY . .
CMD ["uv", "run", "fastapi", "run", "main.py", "--port", "8000"]
```

:::practica python Una API protegida, filtrada y con límite
1. Ejecuta: la API exige clave, oculta el email de los clientes y limita a 3 pedidos por clave.
2. Mira la respuesta del cuarto pedido: 429 con `Retry-After`.
3. Agrega la regla de permisos: solo el equipo `finanzas` puede ver `/reportes/ventas`; el resto recibe 403.

```python
from fastapi import FastAPI, Depends, Header, HTTPException
from fastapi.testclient import TestClient
from pydantic import BaseModel

CLAVES = {"clave-finanzas": "finanzas", "clave-comercial": "comercial"}
USOS = {}
LIMITE = 3
CLIENTES = {7: {"cliente_id": 7, "nombre": "Lucía", "ciudad": "Lima", "email": "lucia@correo.com"}}

def equipo_actual(x_api_key: str | None = Header(None)) -> str:
    if x_api_key not in CLAVES:
        raise HTTPException(status_code=401, detail="Falta la clave o no es válida")
    USOS[x_api_key] = USOS.get(x_api_key, 0) + 1
    if USOS[x_api_key] > LIMITE:
        raise HTTPException(status_code=429, detail="Demasiados pedidos", headers={"Retry-After": "60"})
    return CLAVES[x_api_key]

class ClientePublico(BaseModel):
    cliente_id: int
    nombre: str
    ciudad: str

app = FastAPI()

@app.get("/clientes/{cliente_id}", response_model=ClientePublico)
def cliente(cliente_id: int, equipo: str = Depends(equipo_actual)):
    if cliente_id not in CLIENTES:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return CLIENTES[cliente_id]

c = TestClient(app)
print(c.get("/clientes/7").status_code, "sin clave")
h = {"X-API-Key": "clave-comercial"}
for i in range(4):
    r = c.get("/clientes/7", headers=h)
    print(i + 1, r.status_code, r.json(), r.headers.get("retry-after"))
```

Reto: cambia el contador por una ventana de tiempo real (guarda el inicio de la ventana y reinicia el conteo cuando pasan 60 segundos) y calcula el `Retry-After` exacto.

Documentación oficial: [Dependencias (FastAPI)](https://fastapi.tiangolo.com/tutorial/dependencies/) · [Seguridad (FastAPI)](https://fastapi.tiangolo.com/tutorial/security/) · [Modelo de respuesta (FastAPI)](https://fastapi.tiangolo.com/tutorial/response-model/) · [Despliegue con Docker (FastAPI)](https://fastapi.tiangolo.com/deployment/docker/) · [429 Too Many Requests (MDN, en inglés)](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/429)
:::

:::errores
- **Claves en el código o en el repositorio.** Van en variables de entorno o en un gestor de secretos.
- **401 y 403 mezclados.** 401: no te identificaste; 403: no tienes permiso.
- **Devolver el registro completo de la base.** Usa `response_model` para mostrar solo lo público.
- **Contadores en memoria con varias copias de la API.** Cada copia cuenta por su lado: el estado compartido va en Redis.
:::

:::entrevista
**Pregunta:** "Otro equipo te pide acceso a los datos de clientes por API. ¿Qué cuidas?"

**Respuesta modelo:** "Que tengan una clave propia (así sé quién consulta y puedo revocarla), que la respuesta solo traiga los campos que necesitan con un `response_model` sin datos personales salvo que haya una razón aprobada, paginación con límite máximo, un límite de uso con 429, registros de acceso para auditoría y la documentación OpenAPI con el contrato. Si necesitan datos masivos, quizás no es una API sino compartir una tabla con permisos en el catálogo, como Delta Sharing o Unity Catalog."
:::

## Ejercicios

:::ejercicio quiz
Un pedido trae una clave de API válida del equipo comercial, pero el recurso es solo para finanzas. ¿Qué respondes?
- [ ] 401, porque la clave no sirve para ese recurso
- [x] 403, porque se identificó bien pero no tiene permiso
- [ ] 404, para que no sepa que el recurso existe
- [ ] 429
:::

:::ejercicio python dificultad=Avanzado titulo="Proteger una ruta con clave"
Escribe la dependencia `equipo_actual` que lea el encabezado opcional `X-API-Key`: si falta o no está en `CLAVES`, responde **401** con `detail` `"Clave inválida"`; si es válida, devuelve el nombre del equipo. Úsala en `GET /reportes` para que devuelva `{"equipo": <equipo>}`.
```python inicial
from fastapi import FastAPI, Depends, Header, HTTPException

CLAVES = {"k-fin": "finanzas", "k-com": "comercial"}
app = FastAPI()
```
```python solucion
from fastapi import FastAPI, Depends, Header, HTTPException

CLAVES = {"k-fin": "finanzas", "k-com": "comercial"}
app = FastAPI()

def equipo_actual(x_api_key: str | None = Header(None)) -> str:
    if x_api_key is None or x_api_key not in CLAVES:
        raise HTTPException(status_code=401, detail="Clave inválida")
    return CLAVES[x_api_key]

@app.get("/reportes")
def reportes(equipo: str = Depends(equipo_actual)):
    return {"equipo": equipo}
```
```pista
`x_api_key: str | None = Header(None)` lee `X-API-Key`. Con `None` por defecto, si falta llega `None` (y tú respondes 401, en lugar del 422 automático).
```
```pista
En la ruta: `equipo: str = Depends(equipo_actual)`. FastAPI ejecuta la dependencia antes y le pasa lo que devuelve.
```
```python test
from fastapi.testclient import TestClient
c = TestClient(app)
r = c.get("/reportes")
assert r.status_code == 401 and r.json() == {"detail": "Clave inválida"}, f"Sin clave: {r.status_code} {r.json()}"
assert c.get("/reportes", headers={"X-API-Key": "mala"}).status_code == 401
r = c.get("/reportes", headers={"X-API-Key": "k-fin"})
assert r.status_code == 200 and r.json() == {"equipo": "finanzas"}, f"Obtuviste {r.status_code} {r.json()}"
assert c.get("/reportes", headers={"x-api-key": "k-com"}).json() == {"equipo": "comercial"}
```
:::

:::ejercicio python dificultad=Avanzado titulo="No exponer el email"
Los registros de `CLIENTES` tienen `email` y `telefono`. Crea el modelo `ClientePublico` (`cliente_id`, `nombre`, `ciudad`) y la ruta `GET /clientes/{cliente_id}` con `response_model=ClientePublico`, para que la respuesta **no** incluya los datos de contacto aunque la función devuelva el registro completo. Si no existe, 404.
```python inicial
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

CLIENTES = {
    7: {"cliente_id": 7, "nombre": "Lucía", "ciudad": "Lima", "email": "lucia@correo.com", "telefono": "999"},
    9: {"cliente_id": 9, "nombre": "Tomás", "ciudad": "Quito", "email": "tomas@correo.com", "telefono": "888"},
}
app = FastAPI()
```
```python solucion
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

CLIENTES = {
    7: {"cliente_id": 7, "nombre": "Lucía", "ciudad": "Lima", "email": "lucia@correo.com", "telefono": "999"},
    9: {"cliente_id": 9, "nombre": "Tomás", "ciudad": "Quito", "email": "tomas@correo.com", "telefono": "888"},
}
app = FastAPI()

class ClientePublico(BaseModel):
    cliente_id: int
    nombre: str
    ciudad: str

@app.get("/clientes/{cliente_id}", response_model=ClientePublico)
def cliente(cliente_id: int):
    if cliente_id not in CLIENTES:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return CLIENTES[cliente_id]
```
```pista
`response_model=ClientePublico` en el decorador: FastAPI arma la respuesta solo con los campos del modelo.
```
```python test
from fastapi.testclient import TestClient
c = TestClient(app)
r = c.get("/clientes/7")
assert r.status_code == 200, f"Código {r.status_code}"
assert r.json() == {"cliente_id": 7, "nombre": "Lucía", "ciudad": "Lima"}, f"La respuesta trae de más: {r.json()}"
assert "email" not in c.get("/clientes/9").json()
assert c.get("/clientes/1").status_code == 404
```
:::

:::ejercicio python dificultad=Experto titulo="Un limitador de ventana fija"
Escribe la clase `Limitador(maximo, ventana)` con el método `permitir(clave, ahora)` (`ahora` en segundos). Cada clave puede hacer como máximo `maximo` pedidos por ventana; la ventana de una clave empieza en su primer pedido y dura `ventana` segundos. `permitir` devuelve `(True, 0)` si el pedido entra, o `(False, segundos)` si no, donde `segundos` es lo que falta para que empiece la ventana siguiente (redondeado hacia arriba con `math.ceil`). Las claves son independientes.
```python inicial
import math

class Limitador:
    def __init__(self, maximo, ventana):
        pass

    def permitir(self, clave, ahora):
        pass
```
```python solucion
import math

class Limitador:
    def __init__(self, maximo, ventana):
        self.maximo = maximo
        self.ventana = ventana
        self.estado = {}

    def permitir(self, clave, ahora):
        inicio, usados = self.estado.get(clave, (None, 0))
        if inicio is None or ahora >= inicio + self.ventana:
            inicio, usados = ahora, 0
        if usados < self.maximo:
            self.estado[clave] = (inicio, usados + 1)
            return True, 0
        self.estado[clave] = (inicio, usados)
        return False, math.ceil(inicio + self.ventana - ahora)
```
```pista
Guarda por clave `(inicio_de_ventana, usados)`. Si no hay ventana o ya venció (`ahora >= inicio + ventana`), empieza una nueva con 0 usados.
```
```pista
Si quedan usos, suma uno y devuelve `(True, 0)`. Si no, devuelve `(False, math.ceil(inicio + ventana - ahora))`.
```
```python test
lim = Limitador(2, 10)
assert lim.permitir("a", 0) == (True, 0)
assert lim.permitir("a", 1) == (True, 0)
assert lim.permitir("a", 2.5) == (False, 8), f"Obtuviste {lim.permitir('a', 2.5)}"
assert lim.permitir("b", 3) == (True, 0), "Cada clave tiene su propio límite"
assert lim.permitir("a", 10) == (True, 0), "A los 10 segundos empieza una ventana nueva"
assert lim.permitir("a", 11) == (True, 0)
assert lim.permitir("a", 19.2) == (False, 1)
```
:::

:::ejercicio python dificultad=Avanzado titulo="Versionar con un router"
Crea un `APIRouter` con prefijo `/v1` que tenga `GET /productos` (devuelve la lista `PRODUCTOS`) e inclúyelo en la app. La ruta debe responder en `/v1/productos`; `/productos` (sin versión) debe dar 404.
```python inicial
from fastapi import FastAPI, APIRouter

PRODUCTOS = [{"id": 1, "nombre": "Mouse"}]
app = FastAPI()
```
```python solucion
from fastapi import FastAPI, APIRouter

PRODUCTOS = [{"id": 1, "nombre": "Mouse"}]
app = FastAPI()
v1 = APIRouter(prefix="/v1")

@v1.get("/productos")
def productos():
    return PRODUCTOS

app.include_router(v1)
```
```pista
`v1 = APIRouter(prefix="/v1")`, decora la ruta con `@v1.get("/productos")` y al final `app.include_router(v1)`.
```
```python test
from fastapi.testclient import TestClient
c = TestClient(app)
r = c.get("/v1/productos")
assert r.status_code == 200 and r.json() == [{"id": 1, "nombre": "Mouse"}], f"Obtuviste {r.status_code} {r.json()}"
assert c.get("/productos").status_code == 404, "Sin el prefijo /v1 la ruta no debe existir"
```
:::
