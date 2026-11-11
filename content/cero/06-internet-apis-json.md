---
titulo: Internet por dentro - servidores, URLs, HTTP, APIs y JSON
nivel: Básico
duracion: 40
resumen: Cada vez que abres una página o una app consulta datos, hay un pedido y una respuesta. Entender ese ida y vuelta es entender de dónde vienen la mitad de los datos de una empresa.
objetivos: Explicar qué es un cliente y qué es un servidor | Leer las partes de una URL | Reconocer los métodos y los códigos de estado de HTTP | Explicar qué es una API y para qué la usa un ingeniero de datos | Leer y escribir JSON | Hacer tu primer pedido a una API desde la terminal y desde Python
prerrequisitos: cero-tu-computadora | cero-ingles-tecnico
autoevaluacion: ¿Puedes explicar qué hace un servidor? | ¿Sabes qué es el `?` en una URL? | ¿Sabes qué significan los códigos 200, 404, 429 y 500? | ¿Sabes qué es una API y por qué un ingeniero de datos la usa todos los días? | ¿Puedes leer un JSON y sacar un dato de adentro?
---

:::escenario Los datos que no están en ninguna base
Ahora que sabes qué es una API y cómo se lee un JSON, mira para qué se usa en un trabajo. Imagina que Martín, tu líder, te pide: *"Necesitamos el tipo de cambio de cada día y los productos del proveedor. El proveedor no nos da acceso a su base de datos, pero tiene una **API**. Trae los datos de ahí."*

Muchos de los datos que necesita una empresa no están en sus propias bases: están en sistemas de otros (pagos, clima, redes sociales, proveedores) y se consiguen **pidiéndolos por internet**, exactamente como practicaste en esta lección.
:::

## Cliente y servidor

Internet es, en el fondo, millones de computadoras pidiéndose cosas:

- El **cliente** pide. Tu navegador, una app del celular, un programa de Python.
- El **servidor** responde. Una computadora (casi siempre en la nube) que está siempre encendida esperando pedidos.

:::analogia El mozo y la cocina
Tú (cliente) le pides al mozo un plato del menú. El mozo lleva el pedido a la cocina (servidor), que lo prepara y lo devuelve. No entras a la cocina ni ves cómo se cocina: solo pides lo que está en el menú, de la forma en que el menú dice.
:::

## Las partes de una URL

Una **URL** es la dirección de lo que pides:

```text norun
https://api.tiendaandina.dev/v1/productos?categoria=audio&page=2
└─┬─┘   └────────┬─────────┘└─────┬────┘└──────────┬──────────┘
protocolo     dominio           ruta           parámetros
```

- **Protocolo** (`https`): cómo se habla. La `s` es de *secure*: la conversación viaja cifrada.
- **Dominio** (`api.tiendaandina.dev`): qué servidor.
- **Ruta** (`/v1/productos`): qué recurso dentro del servidor. `v1` es la versión de la API.
- **Parámetros** (después del `?`): opciones del pedido, en pares `nombre=valor` separados por `&`. Aquí: "solo la categoría audio, la página 2".

## HTTP: el idioma de los pedidos

Los pedidos y respuestas viajan en **HTTP**. Cada pedido tiene un **método** (qué quieres hacer):

| Método | Para qué | Ejemplo |
|---|---|---|
| `GET` | Leer | Traer la lista de productos |
| `POST` | Crear o enviar | Crear un pedido, pedir un token |
| `PUT` / `PATCH` | Cambiar | Actualizar un precio |
| `DELETE` | Borrar | Borrar un producto |

Y cada respuesta trae un **código de estado**, un número que dice cómo salió:

| Código | Significa | Qué haces |
|---|---|---|
| `200` OK | Salió bien | Usas los datos |
| `201` Created | Se creó lo que pediste | — |
| `400` Bad Request | Pediste algo mal formado | Revisa los parámetros |
| `401` Unauthorized | No te identificaste (o tu token venció) | Renueva el token |
| `403` Forbidden | Te identificaste, pero no tienes permiso | Pide acceso |
| `404` Not Found | Eso no existe | Revisa la URL o el id |
| `429` Too Many Requests | Hiciste demasiados pedidos seguidos | **Espera** y reintenta |
| `500` Internal Server Error | Falló el servidor (no es tu culpa) | Reintenta más tarde |
| `503` Service Unavailable | El servidor está caído o saturado | Reintenta más tarde |

Regla rápida: los **4xx** son "algo hiciste mal tú"; los **5xx**, "algo falló del otro lado".

## Qué es una API

Una **API** (*Application Programming Interface*) es un "menú" que un sistema publica para que **otros programas** le pidan datos o acciones, con reglas fijas. La página web de un banco es para personas; su API es para programas. Para un ingeniero de datos, las APIs son una de las fuentes más comunes: pagos (Stripe, Mercado Pago), CRM (Salesforce, HubSpot), marketing (Google Ads), clima, tipo de cambio, sistemas internos de la empresa.

Tres cosas que toda API real tiene y que vas a manejar en el módulo de Python:

1. **Autenticación**: te identificas con una clave o un **token** (una contraseña temporal) en cada pedido.
2. **Paginación**: no te da 1 millón de filas de golpe; te da de a 100 y te dice cómo pedir la página siguiente.
3. **Límites**: si pides demasiado rápido, responde `429` y tienes que esperar.

## JSON: el formato de las respuestas

Casi todas las APIs responden en **JSON** (*JavaScript Object Notation*): texto con una estructura de llaves y corchetes, fácil de leer para personas y programas.

```json norun
{
  "id": 3,
  "nombre": "Auriculares Pulse",
  "precio": 45990,
  "en_stock": true,
  "categorias": ["audio", "accesorios"],
  "proveedor": { "nombre": "Sonora", "pais": "Chile" }
}
```

- `{ }` es un **objeto**: pares `"clave": valor`, como una ficha.
- `[ ]` es una **lista** (array): varios valores en orden.
- Los valores pueden ser texto (entre comillas dobles), números, `true`/`false`, `null` (vacío), otra lista u otro objeto.

Para llegar a un dato "de adentro" vas entrando de a un nivel: el país del proveedor es `proveedor` → `pais`. En Python eso se escribe `producto["proveedor"]["pais"]`.

:::cuidado JSON no es Python (aunque se parezcan)
En JSON el texto va **siempre** con comillas dobles, y se escribe `true`, `false` y `null`. En Python es `True`, `False` y `None`. El módulo `json` de Python traduce de uno a otro por ti.
:::

## Tu primer pedido a una API

En este curso hay una **API de práctica** de Tienda Andina en `https://api.tiendaandina.dev/v1`, que funciona dentro del sitio (no sale a internet). Se comporta como una API real: tiene paginación, pide token para los pedidos y responde `429` si te apuras. Pruébala en la terminal con `curl`, el comando para hacer pedidos HTTP:

```bash
curl https://api.tiendaandina.dev/v1/estado
curl https://api.tiendaandina.dev/v1/productos/3
curl "https://api.tiendaandina.dev/v1/productos?page=1&per_page=2"
```

Y desde Python, con la librería `requests`:

```python
import requests
r = requests.get("https://api.tiendaandina.dev/v1/productos/3")
print(r.status_code)        # 200
producto = r.json()         # convierte el JSON en un diccionario de Python
print(producto["nombre"])
```

:::trabajo
"Traer datos de una API" es una de las tareas más comunes de un ingeniero de datos junior. El trabajo real está en los detalles: guardar el token en un lugar seguro, recorrer todas las páginas, esperar cuando la API dice 429, reintentar cuando falla y no traer dos veces lo mismo. Lo practicas en el módulo de Python, lección "Python para ingeniería de datos".
:::

## Practica

:::ejercicio quiz
En `https://api.clima.com/v2/ciudades?pais=PE&limite=5`, ¿qué es `pais=PE&limite=5`?
- [ ] El dominio
- [ ] La ruta
- [x] Los parámetros: opciones del pedido (país Perú, máximo 5 resultados)
- [ ] El protocolo
```explicacion
Todo lo que va después del `?` son parámetros, en pares `nombre=valor` separados por `&`.
```
:::

:::ejercicio quiz
Tu programa recibe un `429 Too Many Requests` de una API. ¿Qué haces?
- [ ] Reintentas inmediatamente, muchas veces
- [x] Esperas un rato (lo que indique la API) y reintentas
- [ ] Cambias la URL
- [ ] Concluyes que la API está caída para siempre
```explicacion
429 dice "vas demasiado rápido". Reintentar de inmediato lo empeora. Las APIs suelen indicar cuántos segundos esperar (cabecera `Retry-After`).
```
:::

:::ejercicio quiz
¿Cuál código indica que el problema está **del lado del servidor** y no en tu pedido?
- [ ] 404
- [ ] 401
- [ ] 400
- [x] 503
```explicacion
Los 5xx son errores del servidor. Los 4xx dicen que tu pedido tiene algo mal (no existe, no estás autorizado, está mal formado).
```
:::

:::ejercicio quiz
Para **leer** la lista de productos de una API, ¿qué método HTTP usas?
- [x] GET
- [ ] POST
- [ ] DELETE
- [ ] PATCH
```explicacion
GET es para leer. POST crea o envía, PATCH cambia, DELETE borra.
```
:::

:::ejercicio python titulo="Leer un JSON"
La variable `texto` tiene un JSON como el que devuelve una API. Conviértelo en un diccionario con `json.loads(texto)` y guarda en `nombre` el nombre del producto y en `pais` el país del proveedor.
```python inicial
import json
texto = '{"id": 3, "nombre": "Auriculares Pulse", "precio": 45990, "proveedor": {"nombre": "Sonora", "pais": "Chile"}}'
producto = json.loads(texto)
nombre = None
pais = None
```
```python solucion
import json
texto = '{"id": 3, "nombre": "Auriculares Pulse", "precio": 45990, "proveedor": {"nombre": "Sonora", "pais": "Chile"}}'
producto = json.loads(texto)
nombre = producto["nombre"]
pais = producto["proveedor"]["pais"]
```
```python test
assert nombre == "Auriculares Pulse", f"nombre debería ser 'Auriculares Pulse' y es {nombre!r}"
assert pais == "Chile", f"pais debería ser 'Chile' y es {pais!r}"
```
```pista
Para entrar un nivel, usa corchetes con la clave: `producto["proveedor"]`. Para entrar dos, encadena: `producto["proveedor"]["pais"]`.
```
:::

:::ejercicio python titulo="Una lista dentro del JSON"
`respuesta` tiene una página de productos de la API. Guarda en `cantidad` cuántos productos trae la lista `datos`, y en `primero` el nombre del primero.
```python inicial
import json
respuesta = json.loads('{"page": 1, "datos": [{"id": 1, "nombre": "Mouse Óptico"}, {"id": 2, "nombre": "Teclado Mecánico"}, {"id": 3, "nombre": "Auriculares Pulse"}], "siguiente": 2}')
cantidad = 0
primero = None
```
```python solucion
import json
respuesta = json.loads('{"page": 1, "datos": [{"id": 1, "nombre": "Mouse Óptico"}, {"id": 2, "nombre": "Teclado Mecánico"}, {"id": 3, "nombre": "Auriculares Pulse"}], "siguiente": 2}')
cantidad = len(respuesta["datos"])
primero = respuesta["datos"][0]["nombre"]
```
```python test
assert cantidad == 3, f"cantidad debería ser 3 y es {cantidad}"
assert primero == "Mouse Óptico", f"primero debería ser 'Mouse Óptico' y es {primero!r}"
```
```pista
`len(lista)` cuenta elementos. En una lista, la primera posición es la `[0]`.
```
:::

:::ejercicio python titulo="Tu primer pedido a la API"
Usa `requests.get` para pedir el producto 3 a la API de práctica (`https://api.tiendaandina.dev/v1/productos/3`). Guarda en `codigo` el código de estado y en `nombre` el nombre del producto.
```python inicial
import requests
r = requests.get("https://api.tiendaandina.dev/v1/productos/3")
codigo = None
nombre = None
```
```python solucion
import requests
r = requests.get("https://api.tiendaandina.dev/v1/productos/3")
codigo = r.status_code
nombre = r.json()["nombre"]
```
```python test
assert codigo == 200, f"codigo debería ser 200 y es {codigo}"
assert nombre == "Auriculares Pulse", f"nombre debería ser 'Auriculares Pulse' (lo que devuelve la API) y es {nombre!r}"
```
```pista
`r.status_code` es el código; `r.json()` convierte la respuesta en un diccionario.
```
:::

:::ejercicio cli
Desde la terminal, pide el **estado** de la API de práctica con `curl` (la ruta es `/v1/estado`).
```respuesta
curl (-s )?["']?https://api\.tiendaandina\.dev/v1/estado/?["']?
```
```solucion
curl https://api.tiendaandina.dev/v1/estado
```
```pista
`curl` seguido de la URL completa: `https://api.tiendaandina.dev/v1/estado`.
```
:::

:::ejercicio cli
Pide el producto con id **5** a la API de práctica con `curl`.
```respuesta
curl (-s )?["']?https://api\.tiendaandina\.dev/v1/productos/5/?["']?
```
```solucion
curl https://api.tiendaandina.dev/v1/productos/5
```
:::
