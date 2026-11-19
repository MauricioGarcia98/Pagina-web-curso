---
titulo: Fuentes y accesos - la mesa de ayuda, los correos, los contratos y Lumen IA
nivel: Avanzado
duracion: 45
resumen: La referencia de la API de la mesa de ayuda, los buzones de correo en formato .eml, los contratos en PDF y la API de Lumen IA (chat, embeddings, modelos, uso, límites y precios).
objetivos: Leer correos .eml con sus codificaciones | Extraer texto de un PDF | Llamar a un modelo de lenguaje desde un pipeline con reintentos | Calcular embeddings y buscar por similitud
prerrequisitos: proyecto-conecta-el-pedido
autoevaluacion: ¿Sabes leer un correo quoted-printable en Latin-1? | ¿Sabes qué hacer con un 429 y con un 529? | ¿Sabes qué es la similitud de coseno?
---

## Accesos

```bash
conecta accesos
```

## La mesa de ayuda · `https://api.mesa.conecta.example/v1`

`Authorization: Bearer mz_…` · solo lectura.

| Ruta | Qué devuelve |
|---|---|
| `GET /v1/tickets?updated_since=<ISO 8601>&cursor=…` | Tickets de la web y la app, de a 100, ordenados por `actualizado`. Trae `next_cursor` mientras haya más. Cada ticket: `id`, `cliente_id`, `canal`, `asunto`, `descripcion`, `estado`, `creado`, `primera_respuesta` |
| `GET /v1/clientes?pagina=1` | Clientes (personas y empresas) con su `email` y `contrato_id`, de a 200 |
| `GET /v1/kb/articulos` | La base de conocimiento |
| `GET /v1/kb/evaluacion` | 30 preguntas reales con el artículo que las responde (vacío si la base no tiene la respuesta) |

## Los buzones de correo

```bash
conecta correo descargar            # desde dos días antes del arranque
conecta correo descargar --desde 2026-11-20
```

Archivos `.eml` en `~/conecta/correo/soporte/` y `~/conecta/correo/facturacion/`. Son correos de verdad:

- Algunos vienen en `quoted-printable` con `charset=iso-8859-1`, otros en `base64`, otros tal cual.
- Muchos son respuestas que **citan** el mensaje anterior de Conecta (las líneas que empiezan con `>`). Lo que importa es lo que escribió el cliente.
- Si un correo se mandó a los dos buzones, aparece dos veces con el **mismo `Message-ID`**.
- El remitente se busca en `/v1/clientes`. Si no está, a veces el cliente escribió su "Nro de cliente" en el cuerpo.

```python
from email import policy
from email.parser import BytesParser
# con un archivo: crudo = open(ruta, "rb").read()
crudo = (b'From: Ana <ana@correo.example>\nMessage-ID: <abc123@correo.example>\n'
         b'Content-Type: text/plain; charset="iso-8859-1"\nContent-Transfer-Encoding: quoted-printable\n\n'
         b'No me lleg=F3 la factura.\n')
msg = BytesParser(policy=policy.default).parsebytes(crudo)
print(msg["Message-ID"], msg.get_body(preferencelist=("plain",)).get_content())
```

## Los contratos

```bash
conecta contratos descargar
pdftotext ~/conecta/contratos/CTR-4100.pdf -
```

Uno por empresa. La cláusula QUINTA tiene el plazo de primera respuesta. Algunos contratos tienen una **adenda** en otra página que lo cambia.

## Lumen IA · `https://api.lumenia.example/v1`

`Authorization: Bearer lum_…`

```bash
curl -s https://api.lumenia.example/v1/chat -H "Authorization: Bearer $LUMEN" \
  --json '{"model": "lumen-mini-1", "temperature": 0, "messages": [{"role": "user", "content": "Hola"}]}'
```

| Ruta | Qué hace |
|---|---|
| `POST /v1/chat` | `{"model", "messages": [{"role", "content"}], "temperature"}` → `salida.contenido` y `uso` (tokens y costo) |
| `POST /v1/embeddings` | `{"model": "lumen-embed", "input": ["texto", …]}` (hasta 100) → un vector de 256 números por texto, normalizado |
| `GET /v1/modelos` | Modelos, precios y estado |
| `GET /v1/uso?desde=&hasta=` | Lo que gastaste por día |

| Modelo | USD por millón de tokens (entrada / salida) |
|---|---|
| `lumen-mini-1` | 0,30 / 1,20 (obsoleto) |
| `lumen-mini-2` | 0,40 / 1,60 |
| `lumen-pro` | 6 / 24 |
| `lumen-embed` | 0,02 |

- Un token son unos 4 caracteres.
- Límite: **300 pedidos por minuto** (429 con `Retry-After`). Si el servicio está sobrecargado responde **529**: espera y reintenta.
- Las respuestas pueden traer la cabecera `deprecation`: léela.
- **Presupuesto del proyecto: USD 0,50.**

:::cuidado Datos personales
Los clientes escriben su DNI y hasta el número de su tarjeta. Para clasificar un mensaje no hacen falta: enmascáralos **antes** de mandarlos al proveedor.
:::

## Las definiciones

- **Interacción**: un ticket o un correo (los repetidos cuentan una vez). `fecha` es el día local del ticket (`creado`) o del correo (`Date`).
- **Dentro del plazo**: `primera_respuesta − creado ≤ plazo vigente del contrato` (en horas corridas).
- **recall@3**: de las preguntas que la base sí puede responder, en cuántas el artículo correcto está entre los 3 primeros que recupera tu buscador.
- **Respuesta correcta**: trae el dato del artículo; si la base no tiene la respuesta, el asistente dice que no la tiene.

```python
def coseno(a, b):  # los vectores ya vienen normalizados
    return sum(x * y for x, y in zip(a, b))
```

## Ejercicios

:::ejercicio quiz
Clasificas 600 mensajes de 250 tokens con lumen-pro (respuesta de 10 tokens). ¿Cuánto cuesta, más o menos?
- [ ] USD 0,06
- [x] USD 1 (600 × 250 × 6 / 1.000.000 + 600 × 10 × 24 / 1.000.000)
- [ ] USD 10
- [ ] USD 0,001
:::

:::ejercicio quiz
Un correo cita la respuesta anterior de Conecta, que habla de "el detalle de su factura". El cliente pregunta por un corte de internet. Si le mandas el correo completo al modelo, ¿qué puede pasar?
- [x] Que lo clasifique como facturación por el texto citado
- [ ] Nada, el modelo ignora las citas
- [ ] Que dé error
- [ ] Que cobre el doble
:::

## Resumen

- Mesa de ayuda con cursor; correos .eml con codificaciones, citas y repetidos; contratos en PDF con adendas.
- Lumen IA: chat, embeddings, límites (429, 529), modelos que se retiran y precios por token.
- Enmascarar datos personales, validar la salida y vigilar el gasto.
