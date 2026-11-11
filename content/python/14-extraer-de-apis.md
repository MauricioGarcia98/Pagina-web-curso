---
titulo: Extraer datos de una API - tokens, paginación, límites y reintentos
nivel: Avanzado
duracion: 60
resumen: La tarea más común de un data engineer junior: traer datos de una API sin perder ni duplicar nada. Contra una API de práctica que se porta como una real.
objetivos: Hacer pedidos GET y POST con `requests` y leer el código de estado | Recorrer todas las páginas de una API (por número de página y por cursor) | Autenticarte con un token y renovarlo cuando vence | Respetar el límite de pedidos (429 y Retry-After) | Reintentar con espera creciente cuando el servidor falla | Deduplicar y limpiar lo que llega antes de guardarlo
prerrequisitos: cero-internet-apis-json | python-errores | python-python-datos
autoevaluacion: ¿Sabes recorrer una API paginada hasta la última página sin saber de antemano cuántas hay? | ¿Sabes qué hacer cuando la API responde 429? | ¿Sabes por qué no hay que reintentar inmediatamente después de un 503? | ¿Sabes dónde guardar el secreto de una API (y dónde no)? | ¿Sabes por qué hay que deduplicar lo que llega de una API?
---

:::escenario Los pedidos del marketplace
Martín te asigna tu primera extracción: *"El marketplace donde también vendemos tiene una API. Necesito todos los pedidos de octubre en nuestro lago, todos los días a las 4. La API pide token, devuelve de a 50 y si le pegas muy rápido te bloquea. Ah, y a veces se cae."*

Esto es, palabra por palabra, una tarea real de la primera semana. En esta lección la resuelves contra la **API de práctica** de Tienda Andina (`https://api.tiendaandina.dev/v1`), que corre dentro del sitio y se porta como una de verdad: pide token, pagina, limita y falla.
:::

:::analogia En palabras simples
Pedirle datos a una API es como pedir comida por teléfono a un restaurante con reglas: tienes que identificarte (el **token**), solo te mandan los platos de a tandas (la **paginación**), no puedes llamar cada segundo (el **límite**) y, si la línea está ocupada, vuelves a intentar un rato después (los **reintentos**). Esta lección enseña a hacer el pedido completo sin perder ni repetir ningún plato.
:::

## La documentación primero

Toda API tiene su documentación. La de práctica también: `GET /v1/docs`. Léela antes de escribir código; es lo primero que hace un profesional.

```python
import requests
r = requests.get("https://api.tiendaandina.dev/v1/docs")
for tema, texto in r.json().items():
    print(f"{tema}: {texto}\n")
```

## Un pedido, con cuidado

```python
import requests

r = requests.get("https://api.tiendaandina.dev/v1/productos", params={"page": 1, "per_page": 5})
print(r.status_code)              # 200
print(r.headers["content-type"])  # application/json
datos = r.json()
print(datos["total"], datos["total_pages"], datos["siguiente"])
for p in datos["datos"]:
    print(p["id"], p["nombre"], p["precio"])
```

- `params=` arma la parte de la URL después del `?` por ti (y escapa los espacios y tildes).
- Siempre mira el **código de estado** antes de usar los datos. `r.raise_for_status()` lanza una excepción si el código es 4xx o 5xx: así un error no pasa inadvertido.

:::cuidado El error silencioso más común
Si no revisas el estado, un `404` o un `401` también trae JSON (`{"error": "..."}`) y tu programa sigue como si nada, guardando un error en vez de datos. Por eso: `r.raise_for_status()` o un `if r.status_code != 200` antes de seguir.
:::

## Paginación: hasta que no haya más

Ninguna API te da todo de una vez. Hay dos estilos y la de práctica tiene los dos.

**Por número de página** (`/v1/productos`): pides `page=1`, `page=2`… hasta que la respuesta diga que no hay `siguiente`:

```python
import requests
URL = "https://api.tiendaandina.dev/v1/productos"
todos, page = [], 1
while page is not None:
    r = requests.get(URL, params={"page": page, "per_page": 10})
    r.raise_for_status()
    cuerpo = r.json()
    todos.extend(cuerpo["datos"])
    page = cuerpo["siguiente"]        # None en la última página
print(len(todos))
```

**Por cursor** (`/v1/pedidos`): en vez de un número, la API te da un **cursor** (un código opaco) que apunta a "dónde quedaste". Lo devuelves en el próximo pedido hasta que venga `null`. Es más robusto cuando llegan datos nuevos mientras paginas, y por eso lo usan casi todas las APIs grandes.

:::nota No adivines el final
Nunca calcules cuántas páginas hay "a mano" ni pares cuando una página viene con menos filas: usa lo que te dice la API (`siguiente`, `siguiente_cursor`, `has_more`, `next`). Es la única señal confiable.
:::

## Autenticación con token

Los datos sensibles (pedidos, clientes) piden **identificarse**. El flujo típico (OAuth "client credentials"):

1. Haces `POST /v1/token` con tu `cliente_id` y tu `secreto`.
2. La API te da un `access_token` que vence (aquí, a los 60 segundos o tras 25 pedidos).
3. Lo mandas en cada pedido, en la cabecera `Authorization: Bearer <token>`.
4. Si recibes `401` con "token expirado", pides otro y repites el pedido.

```python
import os, requests
BASE = "https://api.tiendaandina.dev/v1"
credenciales = {"cliente_id": "academia", "secreto": os.environ.get("TIENDA_SECRETO", "s3cr3t0-de-practica")}
token = requests.post(f"{BASE}/token", json=credenciales).json()["access_token"]
r = requests.get(f"{BASE}/pedidos", params={"limit": 3}, headers={"Authorization": f"Bearer {token}"})
print(r.status_code, r.json()["siguiente_cursor"])
```

:::cuidado El secreto no va en el código
En un proyecto real, el secreto **nunca** se escribe en el código ni se sube a Git: se lee de una variable de entorno (`os.environ`), de un archivo `.env` que está en `.gitignore`, o de un gestor de secretos (Key Vault, Secrets Manager, Secret Manager, los *secret scopes* de Databricks, las *Connections* de Airflow). Aquí lo escribimos porque es una API de práctica.
:::

## Límites: 429 y Retry-After

Las APIs se protegen limitando cuántos pedidos aceptan por segundo o por minuto. La de práctica acepta **10 por segundo**. Si te pasas responde `429 Too Many Requests` con la cabecera `Retry-After` (segundos a esperar). Lo correcto es **esperar eso y reintentar**:

```python
import time, requests

def get_respetando_limite(url, **kw):
    while True:
        r = requests.get(url, **kw)
        if r.status_code != 429:
            return r
        espera = int(r.headers.get("Retry-After", "1"))
        print(f"429: espero {espera} s")
        time.sleep(espera)
```

## Reintentos con espera creciente (backoff)

Los `5xx` (500, 502, 503, 504) y los cortes de red suelen ser **temporales**. Se reintenta, pero esperando cada vez más (1, 2, 4, 8 segundos…) para no empeorar un servidor que ya está saturado. Eso se llama **backoff exponencial**. Los `4xx` (salvo 429) **no** se reintentan: el pedido está mal y va a seguir mal.

```python
import time, requests

def get_con_reintentos(url, intentos=5, **kw):
    for n in range(intentos):
        r = requests.get(url, **kw)
        if r.status_code < 500 and r.status_code != 429:
            return r                      # éxito, o un error que no se arregla reintentando
        espera = 2 ** n                   # 1, 2, 4, 8, 16
        print(f"intento {n + 1}: {r.status_code}, reintento en {espera} s")
        time.sleep(espera)
    r.raise_for_status()                  # se agotaron los intentos: que falle fuerte
```

:::experto En producción
Librerías como `tenacity` o el `Retry` de `urllib3` hacen esto por ti, y también se suma un poco de azar a la espera (*jitter*) para que mil clientes no reintenten todos en el mismo segundo. En Airflow, además, cada tarea tiene `retries` y `retry_delay`: un reintento dentro del código para fallas cortas y otro de la tarea para fallas largas.
:::

## Lo que llega no está limpio

Las APIs también mandan datos sucios: emails con mayúsculas y espacios, y **registros duplicados** (el sistema de origen reintentó y grabó dos veces, o un pedido cambió de página mientras paginabas). Antes de guardar:

- **Deduplica por la clave** (`id`), quedándote con una sola versión.
- **Normaliza** los textos que se usan para cruzar (`email.strip().lower()`).
- Guarda también **cuándo** lo extrajiste: si algo sale mal, sabes qué corrida lo trajo.

## Idempotencia: correrlo dos veces no puede duplicar

El pipeline va a fallar alguna noche y alguien lo va a volver a correr. Si cada corrida *agrega* los pedidos, la segunda los duplica. Un pipeline **idempotente** da el mismo resultado lo corras una o diez veces: por ejemplo, escribe la extracción de cada día en su propia partición (`pedidos/fecha=2024-10-31/`) **reemplazándola**, o usa `MERGE` por `id`. Lo profundizas en el módulo de incidentes (cargas duplicadas).

## Practica

:::errores
- Usar los datos sin mirar el código de estado.
- Paginar con un `range(10)` "porque hay 10 páginas" en vez de seguir `siguiente`.
- Reintentar en un `while True` sin espera, o reintentar errores 4xx.
- Escribir el secreto en el código y subirlo a GitHub.
- Guardar lo que llega sin deduplicar.
:::

:::trabajo
En el trabajo esta extracción va dentro de una tarea de Airflow (o un job de Databricks), escribe en la capa bronze del lago y deja un registro: cuántas filas trajo, cuántos duplicados quitó, cuánto tardó. Si mañana la API cambia, ese registro es lo primero que vas a mirar.
:::

:::entrevista "¿Cómo extraerías todos los datos de una API paginada con límite de pedidos?"
Leo la documentación (autenticación, estilo de paginación, límites). Pido el token y lo renuevo con un 401. Recorro siguiendo el cursor que da la API hasta que venga vacío, sin asumir cuántas páginas hay. Respeto el 429 esperando lo que dice `Retry-After`, y reintento los 5xx con backoff exponencial y un máximo de intentos. Deduplico por clave, guardo en una partición por fecha de forma idempotente y registro métricas de la corrida.
:::

:::ejercicio python titulo="Primera página"
Pide la primera página de productos con **5 por página** (`params={"page": 1, "per_page": 5}`) y guarda en `nombres` la lista de sus nombres.
```python inicial
import requests
URL = "https://api.tiendaandina.dev/v1/productos"
nombres = []
```
```python solucion
import requests
URL = "https://api.tiendaandina.dev/v1/productos"
r = requests.get(URL, params={"page": 1, "per_page": 5})
r.raise_for_status()
nombres = [p["nombre"] for p in r.json()["datos"]]
```
```python test
assert nombres == ["Mouse Óptico", "Teclado Mecánico", "Auriculares Pulse", "Parlante Bluetooth Eco", 'Monitor 24" Nitido'], f"nombres no coincide con la primera página de 5: {nombres}"
```
```pista
La lista de productos viene en la clave `datos` de la respuesta.
```
:::

:::ejercicio python titulo="Cuando no existe"
Pide el producto **999** y guarda en `codigo` el código de estado y en `mensaje` el texto de la clave `error` del JSON. (No uses `raise_for_status()` aquí: queremos leer el error).
```python inicial
import requests
codigo = None
mensaje = None
```
```python solucion
import requests
r = requests.get("https://api.tiendaandina.dev/v1/productos/999")
codigo = r.status_code
mensaje = r.json()["error"]
```
```python test
assert codigo == 404, f"codigo debería ser 404 y es {codigo}"
assert mensaje == "producto no encontrado", f"mensaje debería ser 'producto no encontrado' y es {mensaje!r}"
```
:::

:::ejercicio python titulo="Todas las páginas"
Trae **todos** los productos recorriendo las páginas de 10 en 10 hasta que `siguiente` sea `None`. Guarda la lista completa de productos (diccionarios) en `todos`.
```python inicial
import requests
URL = "https://api.tiendaandina.dev/v1/productos"
todos = []
page = 1
```
```python solucion
import requests
URL = "https://api.tiendaandina.dev/v1/productos"
todos = []
page = 1
while page is not None:
    r = requests.get(URL, params={"page": page, "per_page": 10})
    r.raise_for_status()
    cuerpo = r.json()
    todos.extend(cuerpo["datos"])
    page = cuerpo["siguiente"]
```
```python test
assert len(todos) == 25, f"Deberías tener los 25 productos y tienes {len(todos)}"
assert len({p["id"] for p in todos}) == 25, "Hay productos repetidos: ¿pediste dos veces la misma página?"
assert "while" in _codigo or "for" in _codigo, "Recorre las páginas con un bucle, siguiendo 'siguiente'"
```
```pista
Usa un `while page is not None:` y al final de cada vuelta `page = cuerpo["siguiente"]`.
```
:::

:::ejercicio python titulo="Filtrar en la API"
Pide los productos de la categoría `audio` usando el parámetro `categoria` (con `per_page=50` alcanza una página) y guarda en `audio` la cantidad.
```python inicial
import requests
audio = 0
```
```python solucion
import requests
r = requests.get("https://api.tiendaandina.dev/v1/productos", params={"categoria": "audio", "per_page": 50})
r.raise_for_status()
audio = len(r.json()["datos"])
```
```python test
assert audio == 4, f"Hay 4 productos de audio y obtuviste {audio}"
assert "categoria" in _codigo, "Filtra en la API con el parámetro categoria (no traigas todo para filtrar después)"
```
```pista
Filtrar en el servidor trae menos datos: `params={"categoria": "audio", "per_page": 50}`.
```
:::

:::ejercicio python titulo="Pedir un token"
Haz `POST` a `/v1/token` enviando como JSON `{"cliente_id": "academia", "secreto": "s3cr3t0-de-practica"}` y guarda el `access_token` en `token`.
```python inicial
import requests
BASE = "https://api.tiendaandina.dev/v1"
token = None
```
```python solucion
import requests
BASE = "https://api.tiendaandina.dev/v1"
r = requests.post(f"{BASE}/token", json={"cliente_id": "academia", "secreto": "s3cr3t0-de-practica"})
r.raise_for_status()
token = r.json()["access_token"]
```
```python test
assert isinstance(token, str) and token.startswith("tk_"), f"token debería ser el access_token (empieza con 'tk_') y es {token!r}"
```
```pista
`requests.post(url, json={...})` manda el diccionario como JSON.
```
:::

:::ejercicio python titulo="Todos los pedidos con cursor"
Con un token, trae **todos** los pedidos de `/v1/pedidos` (de a 50, con `limit=50`), siguiendo `siguiente_cursor` hasta que sea `None`. Guarda la lista en `pedidos`.
```python inicial
import requests
BASE = "https://api.tiendaandina.dev/v1"
token = requests.post(f"{BASE}/token", json={"cliente_id": "academia", "secreto": "s3cr3t0-de-practica"}).json()["access_token"]
cabeceras = {"Authorization": f"Bearer {token}"}
pedidos = []
cursor = None
```
```python solucion
import requests
BASE = "https://api.tiendaandina.dev/v1"
token = requests.post(f"{BASE}/token", json={"cliente_id": "academia", "secreto": "s3cr3t0-de-practica"}).json()["access_token"]
cabeceras = {"Authorization": f"Bearer {token}"}
pedidos = []
cursor = None
while True:
    params = {"limit": 50}
    if cursor:
        params["cursor"] = cursor
    r = requests.get(f"{BASE}/pedidos", params=params, headers=cabeceras)
    r.raise_for_status()
    cuerpo = r.json()
    pedidos.extend(cuerpo["datos"])
    cursor = cuerpo["siguiente_cursor"]
    if cursor is None:
        break
```
```python test
assert len(pedidos) == 138, f"La API tiene 138 registros (con un duplicado) y trajiste {len(pedidos)}"
```
```pista
La primera vez no mandes `cursor`. Después, manda el `siguiente_cursor` de la respuesta anterior. Cuando venga `None`, terminaste.
```
:::

:::ejercicio python titulo="Deduplicar y limpiar"
`pedidos` trae un registro duplicado (mismo `id`) y emails sucios. Guarda en `limpios` una lista **sin ids repetidos** (quédate con la primera aparición) y con `cliente_email` en minúsculas y sin espacios.
```python inicial
import requests
BASE = "https://api.tiendaandina.dev/v1"
tok = requests.post(f"{BASE}/token", json={"cliente_id": "academia", "secreto": "s3cr3t0-de-practica"}).json()["access_token"]
h = {"Authorization": f"Bearer {tok}"}
pedidos, cursor = [], None
while True:
    r = requests.get(f"{BASE}/pedidos", params={"limit": 50, **({"cursor": cursor} if cursor else {})}, headers=h)
    r.raise_for_status()
    pedidos += r.json()["datos"]
    cursor = r.json()["siguiente_cursor"]
    if cursor is None:
        break

limpios = []
```
```python solucion
import requests
BASE = "https://api.tiendaandina.dev/v1"
tok = requests.post(f"{BASE}/token", json={"cliente_id": "academia", "secreto": "s3cr3t0-de-practica"}).json()["access_token"]
h = {"Authorization": f"Bearer {tok}"}
pedidos, cursor = [], None
while True:
    r = requests.get(f"{BASE}/pedidos", params={"limit": 50, **({"cursor": cursor} if cursor else {})}, headers=h)
    r.raise_for_status()
    pedidos += r.json()["datos"]
    cursor = r.json()["siguiente_cursor"]
    if cursor is None:
        break

limpios = []
vistos = set()
for p in pedidos:
    if p["id"] in vistos:
        continue
    vistos.add(p["id"])
    limpios.append({**p, "cliente_email": p["cliente_email"].strip().lower()})
```
```python test
assert len(limpios) == 137, f"Deberían quedar 137 pedidos únicos y quedan {len(limpios)}"
assert len({p["id"] for p in limpios}) == len(limpios), "Todavía hay ids repetidos"
assert all(p["cliente_email"] == p["cliente_email"].strip().lower() for p in limpios), "Hay emails con mayúsculas o espacios"
```
```pista
Lleva un `set` con los ids que ya viste; si el id ya está, sáltalo con `continue`.
```
:::

:::ejercicio python titulo="Respetar el límite (429)"
Necesitas el detalle de los 25 productos pidiéndolos **uno por uno** (`/v1/productos/1` … `/v1/productos/25`). La API acepta 10 pedidos por segundo: si responde `429`, espera lo que diga `Retry-After` con `time.sleep` y **reintenta el mismo producto**. Guarda los 25 diccionarios en `detalles`.
```python inicial
import time, requests
BASE = "https://api.tiendaandina.dev/v1"
detalles = []
for i in range(1, 26):
    r = requests.get(f"{BASE}/productos/{i}")
    detalles.append(r.json())
```
```python solucion
import time, requests
BASE = "https://api.tiendaandina.dev/v1"
detalles = []
for i in range(1, 26):
    while True:
        r = requests.get(f"{BASE}/productos/{i}")
        if r.status_code == 429:
            time.sleep(int(r.headers.get("Retry-After", "1")))
            continue
        r.raise_for_status()
        detalles.append(r.json())
        break
```
```python test
assert len(detalles) == 25, f"Deberías tener 25 productos y tienes {len(detalles)}"
assert all("error" not in d for d in detalles), "Algunos 'productos' son en realidad errores 429: reintenta cuando la API pide esperar"
assert [d["id"] for d in detalles] == list(range(1, 26)), "Faltan productos o están en otro orden"
```
```pista
Dentro del `for`, un `while True:` que pide el producto; si el código es 429, `time.sleep(...)` y `continue`; si no, guardas y `break`.
```
:::

:::ejercicio python titulo="Reintentos con backoff"
`/v1/inestable` falla con `503` dos de cada tres veces. Escribe un bucle de **hasta 5 intentos** que espere `2 ** n` segundos entre intentos (`n` = 0, 1, 2…) y termine en cuanto responda `200`. Guarda la respuesta final (el JSON) en `respuesta` y el número de intentos usados en `intentos`.
```python inicial
import time, requests
URL = "https://api.tiendaandina.dev/v1/inestable"
respuesta = None
intentos = 0
```
```python solucion
import time, requests
URL = "https://api.tiendaandina.dev/v1/inestable"
respuesta = None
intentos = 0
for n in range(5):
    intentos += 1
    r = requests.get(URL)
    if r.status_code == 200:
        respuesta = r.json()
        break
    time.sleep(2 ** n)
```
```python test
assert respuesta is not None and respuesta.get("ok") is True, f"respuesta debería ser el JSON exitoso y es {respuesta!r}"
assert intentos == 3, f"Con esta API se logra al tercer intento; usaste {intentos}"
assert "sleep" in _codigo, "Espera entre intentos con time.sleep (backoff)"
```
:::

:::ejercicio python titulo="El token vence"
Trae todos los pedidos pidiendo **de a 5** (`limit=5`). Son 28 pedidos a la API: el token vence a los 25 usos (responde `401`) y además vas a chocar con el límite de 10 por segundo (`429`). Maneja los dos casos: con `401` pide un token nuevo y repite; con `429` espera `Retry-After` y repite. Guarda todo en `pedidos`.
```python inicial
import time, requests
BASE = "https://api.tiendaandina.dev/v1"
CRED = {"cliente_id": "academia", "secreto": "s3cr3t0-de-practica"}

def nuevo_token():
    return requests.post(f"{BASE}/token", json=CRED).json()["access_token"]

pedidos = []
```
```python solucion
import time, requests
BASE = "https://api.tiendaandina.dev/v1"
CRED = {"cliente_id": "academia", "secreto": "s3cr3t0-de-practica"}

def nuevo_token():
    while True:
        r = requests.post(f"{BASE}/token", json=CRED)
        if r.status_code == 429:
            time.sleep(int(r.headers.get("Retry-After", "1")))
            continue
        r.raise_for_status()
        return r.json()["access_token"]

pedidos = []
token = nuevo_token()
cursor = None
while True:
    params = {"limit": 5}
    if cursor:
        params["cursor"] = cursor
    r = requests.get(f"{BASE}/pedidos", params=params, headers={"Authorization": f"Bearer {token}"})
    if r.status_code == 401:
        token = nuevo_token()
        continue
    if r.status_code == 429:
        time.sleep(int(r.headers.get("Retry-After", "1")))
        continue
    r.raise_for_status()
    cuerpo = r.json()
    pedidos.extend(cuerpo["datos"])
    cursor = cuerpo["siguiente_cursor"]
    if cursor is None:
        break
```
```python test
assert len(pedidos) == 138, f"Deberías traer los 138 registros y trajiste {len(pedidos)}"
```
```pista
Un solo `while True` que hace el pedido y decide: 401 → token nuevo y `continue`; 429 → `sleep` y `continue`; 200 → guardar y avanzar el cursor.
```
:::

:::ejercicio python titulo="La función de extracción"
Junta todo en una función `extraer_pedidos(desde)` que devuelva la lista de pedidos **únicos** creados desde la fecha `desde` (`"AAAA-MM-DD"`, usa el parámetro `desde` de la API), con los emails limpios. Debe manejar 401 y 429. Al final, guarda en `octubre_20` el resultado de `extraer_pedidos("2024-10-20")`.
```python inicial
import time, requests
BASE = "https://api.tiendaandina.dev/v1"
CRED = {"cliente_id": "academia", "secreto": "s3cr3t0-de-practica"}

def extraer_pedidos(desde):
    ...

octubre_20 = extraer_pedidos("2024-10-20")
```
```python solucion
import time, requests
BASE = "https://api.tiendaandina.dev/v1"
CRED = {"cliente_id": "academia", "secreto": "s3cr3t0-de-practica"}

def _pedir(metodo, url, **kw):
    while True:
        r = requests.request(metodo, url, **kw)
        if r.status_code == 429:
            time.sleep(int(r.headers.get("Retry-After", "1")))
            continue
        return r

def _token():
    r = _pedir("POST", f"{BASE}/token", json=CRED)
    r.raise_for_status()
    return r.json()["access_token"]

def extraer_pedidos(desde):
    token, cursor, filas = _token(), None, []
    while True:
        params = {"limit": 50, "desde": desde}
        if cursor:
            params["cursor"] = cursor
        r = _pedir("GET", f"{BASE}/pedidos", params=params, headers={"Authorization": f"Bearer {token}"})
        if r.status_code == 401:
            token = _token()
            continue
        r.raise_for_status()
        cuerpo = r.json()
        filas.extend(cuerpo["datos"])
        cursor = cuerpo["siguiente_cursor"]
        if cursor is None:
            break
    unicos, vistos = [], set()
    for p in filas:
        if p["id"] not in vistos:
            vistos.add(p["id"])
            unicos.append({**p, "cliente_email": p["cliente_email"].strip().lower()})
    return unicos

octubre_20 = extraer_pedidos("2024-10-20")
```
```python test
from js import ApiTienda
_esperados = {p.id for p in ApiTienda.pedidos if p.creado[:10] >= "2024-10-20"}
assert isinstance(octubre_20, list) and octubre_20, "extraer_pedidos debe devolver una lista con pedidos"
assert {p["id"] for p in octubre_20} == _esperados, f"Deberías traer {len(_esperados)} pedidos únicos desde el 20 y trajiste {len({p['id'] for p in octubre_20})}"
assert len(octubre_20) == len(_esperados), "Hay pedidos repetidos"
assert all(p["creado"][:10] >= "2024-10-20" for p in octubre_20), "Hay pedidos anteriores al 20 de octubre"
assert all(p["cliente_email"] == p["cliente_email"].strip().lower() for p in octubre_20), "Hay emails sin limpiar"
```
:::

:::ejercicio quiz
Tu extracción falló a mitad de camino y la vuelves a correr. Al otro día ves los pedidos de ese día **duplicados** en el lago. ¿Qué le faltó al pipeline?
- [ ] Más reintentos
- [x] Ser idempotente: escribir la partición del día reemplazándola (o hacer MERGE por id) en vez de agregar filas
- [ ] Un token que no venza
- [ ] Pedir páginas más grandes
```explicacion
Correr dos veces tiene que dar lo mismo que correr una. Reemplazar la partición del día, o hacer `MERGE` por la clave, lo garantiza.
```
:::
