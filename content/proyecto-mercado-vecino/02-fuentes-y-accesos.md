---
titulo: Fuentes y accesos - la documentación de cada sistema
nivel: Avanzado
duracion: 40
resumen: La referencia de las tres fuentes de Mercado Vecino, como la documentación interna de una empresa - tus credenciales, el esquema de la base y cómo conectarte a la réplica, la configuración del conector Debezium y el formato de cada mensaje del CDC, la API de PagoYa, el formato y la firma de los webhooks, y las reglas de la liquidación. Es para consultar mientras trabajas, no para leer de corrido.
objetivos: Conectarte a una réplica de PostgreSQL de solo lectura con credenciales seguras | Leer un mensaje Debezium (before, after, op, source.lsn) e interpretar sus tipos | Consumir un tópico Kafka con offsets y grupos | Usar una API paginada de más nuevo a más viejo | Verificar la firma HMAC de un webhook | Entender cuándo se liquida cada movimiento
prerrequisitos: proyecto-mercado-vecino-el-pedido
autoevaluacion: ¿Sabes conectarte a la réplica sin dejar la clave en el historial? | ¿Sabes en qué unidad vienen las fechas y los montos en cada fuente? | ¿Sabes qué pasa si tu grupo de consumo se queda atrás más de 24 horas? | ¿Sabes verificar una firma PagoYa-Signature?
---

## Tus credenciales

<div data-mercado="accesos"></div>

<div data-mercado="fuentes"></div>

:::cuidado Credenciales de prueba, pero trátalas como reales
Son inventadas y solo funcionan en las herramientas de práctica, pero el hábito es el mismo que en un trabajo: van al **Key Vault** (la revisión lo verifica), no a un script, no a un repositorio y, si puedes evitarlo, tampoco al historial de la terminal. Si alguna vez compartes una captura, tápalas.
:::

## 1. La base operacional (PostgreSQL 16)

Réplica de lectura en Azure Database for PostgreSQL. Va **unos segundos atrás** de la base principal (replicación asincrónica) y no acepta escrituras: ni INSERT, ni tablas temporales.

```diagrama
titulo: Los sistemas de Mercado Vecino y por dónde llegan los datos
nodo pg: PostgreSQL 16 | icono=postgres | col=0 | fila=0 | color=azul | forma=cilindro | sub=la base operacional
nodo dbz: Debezium | icono=stream | col=1 | fila=0 | color=violeta | sub=lee el log de cambios (CDC)
nodo eh: Event Hubs (Kafka) | icono=eventhubs | col=2 | fila=0 | color=cian | sub=un tópico por tabla
nodo api: API de PagoYa | icono=webhook | col=0 | fila=1 | color=naranja | sub=pagos y reembolsos
nodo wh: Webhooks firmados | icono=correo | col=1 | fila=1 | color=naranja | sub=avisos en tiempo real
nodo liq: Liquidación diaria | icono=archivo | col=1 | fila=2 | color=amarillo | sub=lo que PagoYa te paga
nodo lake: Tu lakehouse | icono=capas | col=3 | fila=1 | color=verde | sub=bronze → silver → gold
flecha pg -> dbz | explica=Debezium lee el log de cambios de PostgreSQL (CDC), sin consultar las tablas ni cargar la base.
flecha dbz -> eh | explica=Publica cada cambio en Event Hubs, que habla el protocolo de Kafka: un tópico por tabla.
flecha eh -> lake | explica=El lakehouse consume los tópicos y arma bronze.
flecha api -> lake: consultar | explica=Los pagos y reembolsos se consultan a la API de PagoYa.
flecha wh -> lake: recibir | explica=PagoYa también avisa cada cambio con webhooks firmados: se verifica la firma antes de aceptarlos.
flecha liq -> lake: conciliar | explica=La liquidación diaria dice cuánto paga PagoYa; se concilia contra los pagos registrados.
```

```bash
# la clave se puede pasar por variable de entorno (no queda en la URI)...
export PGPASSWORD='<la clave del correo>'
psql "postgresql://lector_datos@mv-prod-replica.postgres.database.azure.com:5432/mercado?sslmode=require"

# ...o en ~/.pgpass (host:puerto:base:usuario:clave), con permisos 600
psql -h mv-prod-replica.postgres.database.azure.com -U lector_datos -d mercado -c '\dt'

# exportar a CSV desde el cliente (se escribe en tu máquina, no en el servidor)
psql "…" -c "\copy (SELECT * FROM clientes) TO 'clientes.csv' WITH (FORMAT csv, HEADER)"
```

### Esquema

| Tabla | Columnas | Notas |
|---|---|---|
| `vendedores` | id, nombre, rubro, barrio, comision_pct, creado_en | 12 comercios. Casi no cambia |
| `productos` | id, vendedor_id, nombre, precio, activo, actualizado_en | Los precios se actualizan cada mañana a las 09:00 |
| `clientes` | id, nombre, email, telefono, barrio, creado_en, actualizado_en | Datos personales (PII) |
| `pedidos` | id, cliente_id, estado, subtotal, envio, total, proveedor_pago, pago_ref, creado_en, actualizado_en | `estado`: creado, pagado, enviado, entregado, cancelado. `pago_ref` = id del pago en PagoYa |
| `items_pedido` | id, pedido_id, producto_id, cantidad, precio_unitario | |

- Montos en **pesos** (`numeric(12,2)`). Tiempos en `timestamp` **sin zona, en UTC**.
- `proveedor_pago` = `cobrosur` para los pedidos de antes del cambio de pasarela, `pagoya` desde entonces.
- Para ver todo de una tabla (comentarios, índices, identidad de réplica): `\d pedidos`.

## 2. El CDC: Debezium → Event Hubs (Kafka)

Debezium lee el WAL de la base principal y publica **un mensaje por fila cambiada** en un tópico por tabla. Event Hubs habla el protocolo Kafka.

```json
{
  "name": "mv-prod-cdc",
  "config": {
    "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
    "database.dbname": "mercado",
    "topic.prefix": "mv_prod",
    "plugin.name": "pgoutput",
    "publication.name": "dbz_publication",
    "table.include.list": "public.clientes,public.productos,public.pedidos,public.items_pedido,public.vendedores",
    "snapshot.mode": "initial",
    "decimal.handling.mode": "string",
    "time.precision.mode": "adaptive",
    "tombstones.on.delete": "false",
    "key.converter.schemas.enable": "false",
    "value.converter.schemas.enable": "false"
  }
}
```

| Dato | Valor |
|---|---|
| Broker | `mv-eventos.servicebus.windows.net:9093` |
| Seguridad | `SASL_SSL`, mecanismo `PLAIN`, usuario **literal** `$ConnectionString`, clave = la cadena de conexión completa |
| Tópicos | `mv_prod.public.<tabla>`, **1 partición** cada uno |
| Retención | **24 horas** (lo más viejo se borra) |
| Clave del mensaje | `{"id": 123}` |
| Snapshot inicial | Se hizo cuando se creó el conector, hace días: esos mensajes (`op: "r"`) ya vencieron |

### Un mensaje

```json
{
  "before": { "id": 1474, "estado": "creado", "total": "1760.00", "actualizado_en": 1794969312825000, "…": "…" },
  "after":  { "id": 1474, "estado": "pagado", "total": "1760.00", "pago_ref": "py_0piz7m4007m", "actualizado_en": 1794969330112000, "…": "…" },
  "source": { "connector": "postgresql", "name": "mv_prod", "db": "mercado", "schema": "public", "table": "pedidos", "txId": 9123, "lsn": 1509981234, "ts_ms": 1794969330112 },
  "op": "u",
  "ts_ms": 1794969330591
}
```

| Campo | Qué es |
|---|---|
| `op` | `c` alta, `u` modificación, `d` borrado |
| `before` / `after` | La fila antes y después. En un alta `before` es null; en un borrado `after` es null |
| `source.lsn` | Posición en el WAL: **crece con cada cambio**. Sirve para ordenar y para saber hasta dónde llegaste |
| `source.ts_ms` | Cuándo se confirmó el cambio en la base |
| Montos | Texto (`"1760.00"`), por `decimal.handling.mode = string` |
| Tiempos (`creado_en`, `actualizado_en`) | **Microsegundos** desde 1970 (UTC) |

:::nota REPLICA IDENTITY
`clientes` y `pedidos` tienen `REPLICA IDENTITY FULL`: el `before` viene completo. `productos` e `items_pedido` tienen la identidad por defecto: en un UPDATE el `before` es null, y en un DELETE el `before` trae **solo el id**.
:::

### Consumir desde la terminal (kcat)

```bash
# propiedades en un archivo (así la clave no queda en el historial)
mkdir -p ~/.config && cat > ~/.config/kcat.conf <<'CONF'
bootstrap.servers=mv-eventos.servicebus.windows.net:9093
security.protocol=SASL_SSL
sasl.mechanisms=PLAIN
sasl.username=$ConnectionString
sasl.password=<la cadena de conexión>
CONF

kcat -L                                                   # tópicos
kcat -C -t mv_prod.public.pedidos -o beginning -e -c 3    # los 3 más viejos que quedan
kcat -C -t mv_prod.public.pedidos -o beginning -e > pedidos.jsonl
kcat -G mi-grupo mv_prod.public.pedidos -o beginning -e   # con grupo: la próxima vez sigue desde donde quedó
```

Con `-G`, el offset se guarda al terminar. Un grupo nuevo sin `-o` empieza **por el final** (no ve nada viejo). Si el offset guardado ya venció por la retención, Kafka salta al más viejo disponible y avisa con `Offset out of range`: **los mensajes del medio se perdieron**.

### Consumir desde Databricks (read_kafka)

```sql norun
SELECT CAST(value AS STRING) AS valor, offset, timestamp
FROM read_kafka(
  bootstrapServers => 'mv-eventos.servicebus.windows.net:9093',
  subscribe => 'mv_prod.public.pedidos',
  startingOffsets => 'earliest',
  `kafka.security.protocol` => 'SASL_SSL',
  `kafka.sasl.mechanism` => 'PLAIN',
  `kafka.sasl.jaas.config` => 'kafkashaded.org.apache.kafka.common.security.plain.PlainLoginModule required username="$ConnectionString" password="<cadena de conexión>";'
);
```

- `startingOffsets` acepta `earliest`, `latest` o un JSON por partición: `'{"mv_prod.public.pedidos":{"0":2150}}'` (para seguir desde donde quedaste).
- Para leer campos del JSON: `valor:after.estado`, `valor:source.lsn`, `timestamp_micros(valor:after.creado_en)`.
- Si pides un offset que ya venció, falla con `failOnDataLoss` (y está bien que falle).

## 3. PagoYa: la API

`https://api.pagoya.example/v1` · Autenticación: `Authorization: Bearer sk_test_…` (o `curl -u sk_test_…:`). La clave del equipo de datos es **de solo lectura**.

| Ruta | Qué devuelve |
|---|---|
| `GET /v1/eventos` | Eventos de los últimos 30 días, **del más nuevo al más viejo**. Parámetros: `limite` (1–100, por defecto 10), `despues_de=<evt_id>` (la página siguiente: más viejos que ese), `tipo` (`pago.aprobado`, `disputa.*`, varios separados por coma), `creado_desde` / `creado_hasta` (segundos Unix) |
| `GET /v1/eventos/{id}` | Un evento |
| `GET /v1/pagos?pedido_id=…` · `GET /v1/pagos/{id}` | Pagos (con su estado actual) |
| `GET /v1/disputas?estado=abierta` | Disputas |
| `GET /v1/liquidaciones` · `GET /v1/liquidaciones/{fecha}` | Liquidaciones publicadas |
| `GET /v1/liquidaciones/{fecha}/reporte.csv` | El detalle de una liquidación (CSV) |

Respuesta de lista: `{"objeto": "lista", "hay_mas": true, "datos": [...]}`. Para recorrer todo: pide la primera página, toma el `id` del **último** elemento y pide `despues_de=<ese id>` hasta que `hay_mas` sea `false`.

Un evento:

```json
{
  "id": "evt_0xa3j5200ld",
  "objeto": "evento",
  "tipo": "pago.aprobado",
  "creado": 1795054367,
  "version_api": "2026-07-01",
  "datos": { "objeto": { "id": "py_0h9s00u00a7", "objeto": "pago", "monto": 47500, "moneda": "CRP", "estado": "aprobado",
                         "creado": 1795054363, "aprobado_en": 1795054367, "metadatos": { "pedido_id": "1563" } } }
}
```

- **Montos en centavos** (`47500` = $475,00). Tiempos en **segundos Unix**.
- `metadatos.pedido_id` es **texto**.
- Tipos: `pago.creado`, `pago.aprobado`, `pago.rechazado`, `reembolso.creado` (objeto reembolso, con `pago`), `disputa.abierta` y `disputa.cerrada` (objeto disputa, con `pago`; al cerrar, `estado` = `ganada` o `perdida`).
- Límite: **100 pedidos por minuto** (429 + `Retry-After`). Cerca del 1 % de los pedidos responde **503**: reintenta con espera.
- **Haz la cuenta antes de programar.** La tienda genera unos 1.500 eventos por día: los 30 días de la API son más de 400 páginas de 100, y con el límite eso es más de 4 minutos de esperas. Filtra por `tipo` lo que vas a usar y, después de la primera carga, pide solo lo nuevo con `creado_desde` (guarda dónde quedaste).

## 4. PagoYa: los webhooks

PagoYa avisa cada evento con un `POST` a los endpoints registrados. El del equipo de datos lo das de alta tú:

```bash
pagoya webhooks configurar --cuenta <tu cuenta del lago> --contenedor landing --prefijo pagoya/webhooks
pagoya webhooks estado
```

Del otro lado está la función **mv-webhooks** (la escribió el ingeniero anterior): responde 200 y guarda **cada entrega tal como llegó**, sin verificar nada, en:

```text
abfss://landing@<cuenta>.dfs.core.windows.net/pagoya/webhooks/fecha=AAAA-MM-DD/hora=HH/<entrega_id>.json
```

```json
{"entrega_id": "whd_5ed0f802465a4d37", "recibido_en": "2026-11-19T13:01:02.123Z", "endpoint": "we_75fcbebf33ebac",
 "headers": {"content-type": "application/json; charset=utf-8", "pagoya-signature": "t=1795034813,v1=31bb2c7c…", "user-agent": "PagoYa/1.0"},
 "body": "{\"id\":\"evt_1f1ts8t00j3\",\"objeto\":\"evento\",\"tipo\":\"pago.aprobado\",…}"}
```

- `fecha` y `hora` de la carpeta son de `recibido_en` (UTC).
- Un endpoint nuevo recibe solo eventos **desde que se crea**.
- La entrega es **al menos una vez**: si la función tarda en responder, PagoYa reintenta (mismo evento, otra entrega). Si la función está caída, reintenta más tarde (1 min, 5 min, 30 min, 2 h…): llegan **tarde y desordenadas**.
- El contenedor tiene una regla de ciclo de vida: borra las entregas de **más de 3 días**.

### Verificar la firma

La cabecera `PagoYa-Signature` tiene la forma `t=<segundos Unix>,v1=<firma>`. Para verificar una entrega:

1. Arma el texto firmado: `<t>` + `.` + el **body exacto como llegó** (el texto, sin volver a serializar el JSON).
2. Calcula HMAC-SHA256 de ese texto con el **secreto de firma completo** (`whsec_…`, incluido el prefijo) como clave, en hexadecimal.
3. Compáralo con `v1` con una comparación de tiempo constante (`hmac.compare_digest` en Python).
4. Rechaza la entrega si `t` está a más de **5 minutos** de `recibido_en`: protege contra repeticiones de entregas viejas.

```python norun
import hmac, hashlib
firmado = f"{t}.{body}".encode()
esperada = hmac.new(secreto.encode(), firmado, hashlib.sha256).hexdigest()
valida = hmac.compare_digest(esperada, v1)
```

## 5. PagoYa: la liquidación

PagoYa transfiere al banco **una vez por día** el neto de lo que se liquida ese día, y publica el detalle a las **06:00** (hora de la tienda) del día de pago.

| Movimiento | Se liquida | Bruto | Comisión |
|---|---|---|---|
| Cobro (pago aprobado) | El día siguiente a la aprobación. Si se aprobó **a las 23:00 o después**, a los dos días (corte diario) | + monto | 3,9 % + $5 |
| Reembolso | El día siguiente al reembolso | − monto | 0 (la comisión del cobro no se devuelve) |
| Contracargo | El día siguiente a que se **pierde** la disputa | − monto | $150 de cargo |

`reporte.csv`: `fecha_liquidacion,tipo,pago_id,pedido_id,bruto,comision,neto,moneda`, montos en **pesos**.

:::real En tu computadora y en la web real
Cada fuente se toca de verdad así:

- **PostgreSQL**: con `psql` en la terminal o con un cliente gráfico (DBeaver, gratis), usando el host, usuario y contraseña que te da IT. Nunca pegues la contraseña en el código: va en una variable de entorno o en el Key Vault.
- **Debezium → Event Hubs (Kafka)**: lo levanta el equipo de plataforma; tú lees el tópico con `kcat` o con Spark.
- **PagoYa (API)**: la documentación está en su portal de desarrolladores; pruebas con `curl` o con Postman/Bruno.
- **Webhooks**: se configuran en el **portal web de PagoYa** (Configuración → Webhooks), apuntando al contenedor `landing` de tu lago.
:::

:::capturas Capturas para tu portafolio
Guárdalas en `docs/capturas/` del repositorio del proyecto y úsalas en el README.

- `02-psql.png`: la terminal conectada a la base, con `\dt` mostrando las tablas.
- `02-api.png`: una respuesta de la API de PagoYa (sin el token a la vista).

Antes de publicar, tapa con un rectángulo los correos, los IDs de suscripción y de tenant, los nombres de cuentas reales y cualquier clave o token.
:::

## Ejercicios

:::ejercicio quiz
En un mensaje del CDC, `after.actualizado_en` vale `1794969330112000`. ¿Qué es?
- [ ] Segundos desde 1970
- [ ] Milisegundos desde 1970, en hora de la tienda
- [x] Microsegundos desde 1970, en UTC (se convierte con timestamp_micros)
- [ ] El lsn del cambio
:::

:::ejercicio quiz
Tu grupo de consumo guardó el offset 1800 hace dos días. Hoy el offset más viejo del tópico es 2100. ¿Qué pasa al consumir con ese grupo?
- [ ] Kafka espera a que lleguen los mensajes 1800 a 2099
- [x] Kafka salta al 2100 (Offset out of range) y los 300 cambios del medio se pierden: hay que volver a hacer el snapshot
- [ ] Kafka devuelve los mensajes desde el 1800 porque el grupo los tiene reservados
- [ ] Falla y no devuelve nada hasta que borres el grupo
:::

:::ejercicio quiz
Para verificar un webhook parseas el body con json.loads, lo vuelves a serializar con json.dumps y calculas el HMAC. Las firmas nunca coinciden. ¿Por qué?
- [ ] Porque el secreto va sin el prefijo whsec_
- [x] Porque la firma se calcula sobre el texto exacto que llegó; al re-serializar cambian espacios, orden o escapes y el HMAC es otro
- [ ] Porque hay que usar SHA-1
- [ ] Porque t va después del body
:::

:::ejercicio quiz
Un pago se aprobó el 18 a las 23:20 (hora de la tienda). ¿En qué liquidación aparece?
- [ ] La del 18
- [ ] La del 19
- [x] La del 20: después del corte de las 23:00 se liquida a los dos días
- [ ] Depende de la comisión
:::

## Resumen

- **Base**: réplica de solo lectura, montos en pesos, tiempos UTC sin zona. Credenciales por `PGPASSWORD` o `~/.pgpass`.
- **CDC**: un mensaje por fila cambiada, ordenado por `source.lsn`, montos como texto, tiempos en microsegundos, **retención de 24 h**.
- **PagoYa API**: centavos y segundos Unix, del más nuevo al más viejo, paginación con `despues_de`, 429 y 503.
- **Webhooks**: al menos una vez, tarde y desordenados, firmados con HMAC-SHA256 sobre `t.body`; la función guarda todo sin verificar.
- **Liquidación**: día siguiente (o dos días después del corte de las 23:00), con comisiones, reembolsos y contracargos.
