---
titulo: Construirlo paso a paso - una guía, no una solución
nivel: Avanzado
duracion: 300
resumen: Construyes el proyecto de cero con las fuentes vivas de Mercado Vecino a volumen de empresa (30 comercios, unos 6.000 clientes, cerca de 850 pedidos por día, miles de cambios de CDC y de eventos de PagoYa por día). Cada paso dice qué tienes que lograr, qué esconden las fuentes, cómo comprobarlo y pistas graduales. La solución de referencia de cada paso se desbloquea recién cuando tu entrega pasa la revisión.
objetivos: Combinar un snapshot y un flujo de CDC sin perder ni duplicar cambios | Aplicar bajas físicas y el derecho al olvido que solo viajan por el CDC | Traer eventos de una API con límite de pedidos de forma incremental | Verificar firmas HMAC de webhooks, también durante una rotación de secreto | Conciliar pagos, pedidos y liquidaciones con categorías de prioridad
prerrequisitos: proyecto-mercado-vecino-el-dia-a-dia
autoevaluacion: ¿Sabes para qué sirve _lsn en el MERGE? | ¿Sabes por qué una carga por actualizado_en pierde cancelaciones? | ¿Sabes por qué se aceptan dos secretos de webhook durante la rotación? | ¿Sabes por qué la conciliación excluye el día de hoy?
---

:::trabajo Cómo se usa esta guía
Nada de esto viene hecho: el lago, el Key Vault, el endpoint de webhooks, el script de PagoYa, las tablas y el DAG los creas tú. Solo te damos las fuentes (la réplica de la base, el CDC y PagoYa) y su documentación. Cada paso tiene cuatro partes:

1. **Qué tienes que lograr**: el resultado concreto (un archivo, una tabla, un número).
2. **Lo que esconden las fuentes**: las trampas que traen los datos y que tu código tiene que resolver.
3. **Compruébalo tú**: cómo saber, antes de pedir revisión, si vas bien.
4. **Pistas**: ábrelas de a una solo si te trabas. La primera es conceptual, la segunda nombra la herramienta y la última te da la estructura.

Al final de cada paso hay una **solución de referencia** bloqueada 🔒. Se abre cuando tu entrega pasa la misma revisión que hace el líder técnico en Jira (el panel **Revisar mi entrega** de [El día a día](#/l/proyecto-mercado-vecino-el-dia-a-dia)). Compárala con la tuya como en un code review: no hay una sola forma correcta.
:::

## Antes de empezar: el volumen

| Fuente | Volumen aproximado | Qué implica |
|---|---|---|
| Base (réplica) | 30 comercios, 150 productos, ~6.000 clientes y ~12.000 pedidos de antes de PagoYa, ~850 pedidos nuevos por día | El snapshot inicial es de decenas de miles de filas: se exporta con `\copy`, no con un `SELECT` en pantalla |
| CDC | ~3.000 cambios por día solo en `pedidos` (más clientes, ítems y productos) | La retención es de **24 horas**: si tu proceso no corre un día, pierdes cambios y hay que volver a hacer el snapshot |
| PagoYa | ~1.500 eventos y otros tantos webhooks por día; una liquidación diaria de cientos de líneas | Con el límite de 100 pedidos por minuto, traer los 30 días de la API cada vez no escala: la carga tiene que ser incremental |

Crea el repositorio `mercado-datos` (en el [GitHub de práctica](#/github)) con esta estructura y trabaja con una rama por paso:

```text
mercado-datos/
├── README.md               ← qué resuelve, cómo correrlo, decisiones
├── docs/fuentes.md         ← paso 2: lo que descubriste de cada fuente
├── ingesta/
│   ├── snapshot.sh         ← paso 2: el export inicial de la réplica
│   └── pagoya.py           ← paso 4: API + webhooks + liquidaciones
├── sql/
│   ├── 01_silver_pedidos.sql
│   ├── 02_silver_clientes.sql
│   ├── 03_pagoya.sql
│   └── 04_conciliacion.sql
└── dags/mercado_horario.py ← paso 6
```

## Paso 1 · El lago, el Key Vault y el webhook

**Qué tienes que lograr.** Una cuenta de almacenamiento con un contenedor `landing`, un Key Vault con las credenciales (al menos tres de las cuatro: la clave de la base, la cadena de conexión del Event Hub, la clave de PagoYa y el secreto de firma) y el **endpoint de webhooks** del equipo de datos escribiendo en tu lago.

**Lo que esconden las fuentes.** PagoYa solo manda por webhook lo que pasa **desde que registras el endpoint**: cada hora que tardas en registrarlo es una hora que después tienes que recuperar por la API. Y las credenciales del correo de accesos no van en el código ni en el historial de la terminal de un script.

**Compruébalo tú.** `az keyvault secret list` muestra los secretos (no sus valores) y, unos minutos después de configurar el webhook, `az storage blob list … --prefix pagoya/webhooks/` empieza a mostrar archivos.

<details><summary>Pista 1</summary>

Primero lo que no se puede recuperar después: el webhook. El resto (snapshot, API) se puede hacer mañana; los webhooks de hoy, no.
</details>

<details><summary>Pista 2</summary>

`mercado accesos` tiene las credenciales; `az storage account create … --hns true`, `az keyvault create`, `az keyvault secret set` y `pagoya webhooks configurar --cuenta <tu cuenta>`.
</details>

:::solucion MV:Seguridad+Webhook | el lago, el Key Vault y el webhook
```bash
mercado accesos
az login
az group create -n rg-mercado -l eastus2
az storage account create -n stmercado -g rg-mercado -l eastus2 --sku Standard_LRS --hns true
az storage container create --account-name stmercado -n landing
ID=$(az storage account show -n stmercado -g rg-mercado --query id -o tsv)
az role assignment create --assignee unity-catalog-access-connector --role "Storage Blob Data Contributor" --scope $ID
az keyvault create -n kv-mercado -g rg-mercado -l eastus2
az keyvault secret set --vault-name kv-mercado -n pg-clave --value '…'
az keyvault secret set --vault-name kv-mercado -n pagoya-clave --value 'sk_…'
az keyvault secret set --vault-name kv-mercado -n pagoya-webhook --value 'whsec_…'
pagoya webhooks configurar --cuenta stmercado
```

El webhook se configura **el primer día**: PagoYa solo manda lo que pasa desde ese momento. Lo de antes se recupera por la API (paso 4).
:::

## Paso 2 · El snapshot de la base y mirar el CDC

**Qué tienes que lograr.** Un export completo de `pedidos` y `clientes` de la réplica en el lago (`landing/snap/`), y entender qué trae un mensaje del CDC. Anota en `docs/fuentes.md` qué es cada campo de un mensaje de Debezium.

**Lo que esconden las fuentes.** La réplica es un PostgreSQL de verdad, de **solo lectura**: no puedes crear tablas ni escribir. El CDC trae cuatro tipos de operación y, en una baja, los datos no están donde los buscas. Los timestamps del CDC no vienen como texto. Y en algún momento la base cambia de esquema: aparecen columnas nuevas en `pedidos`.

**Compruébalo tú.** El `count(*)` de pedidos en la réplica es igual a las líneas de tu CSV menos el encabezado. Puedes contestar: ¿qué número ordena los cambios? ¿dónde está el id en una baja? ¿en qué unidad viene `creado_en` en un mensaje?

<details><summary>Pista 1</summary>

Un snapshot de decenas de miles de filas no se mira en pantalla: se exporta a un archivo. Y para el CDC, mira un solo mensaje entero antes de escribir nada.
</details>

<details><summary>Pista 2</summary>

`psql … -c "\copy (SELECT …) TO 'archivo.csv' WITH (FORMAT csv, HEADER)"` y `az storage blob upload-batch`. Para Kafka, `kcat` con un archivo de configuración (`~/.config/kcat.conf`) y `-C -t <tópico> -o beginning -e -c 1`.
</details>

<details><summary>Pista 3</summary>

Un mensaje de Debezium tiene `op` (`c`, `u`, `d`, `r`), `before`, `after` y `source.lsn`. Los timestamps son microsegundos desde 1970.
</details>

:::solucion MV:CDC | el snapshot y el CDC
La réplica de lectura es un PostgreSQL de verdad, con un usuario que no puede escribir:

```bash
export PGPASSWORD='…'
psql "postgresql://lector_datos@mv-prod-replica.postgres.database.azure.com:5432/mercado?sslmode=require" -c "SELECT estado, count(*) FROM pedidos GROUP BY 1 ORDER BY 1"
psql -h mv-prod-replica.postgres.database.azure.com -U lector_datos -d mercado -c "\d pedidos"

mkdir -p ~/mv/snap
psql -h mv-prod-replica.postgres.database.azure.com -U lector_datos -d mercado -c "\copy (SELECT * FROM pedidos) TO 'mv/snap/pedidos.csv' WITH (FORMAT csv, HEADER)"
psql -h mv-prod-replica.postgres.database.azure.com -U lector_datos -d mercado -c "\copy clientes TO 'mv/snap/clientes.csv' CSV HEADER"
az storage blob upload-batch --account-name stmercado -d landing/snap -s ~/mv/snap
```

Y el CDC en Kafka: una configuración en `~/.config/kcat.conf` evita repetir las credenciales en cada comando.

```bash
mkdir -p ~/.config && printf 'bootstrap.servers=mv-eventos.servicebus.windows.net:9093\nsecurity.protocol=SASL_SSL\nsasl.mechanisms=PLAIN\nsasl.username=$ConnectionString\nsasl.password=Endpoint=sb://…\n' > ~/.config/kcat.conf
kcat -L | head -5
kcat -C -t mv_prod.public.pedidos -o beginning -e -c 1
```

Cada mensaje trae `op` (`c` alta, `u` cambio, `d` baja, `r` lectura inicial), `before`, `after` y `source.lsn`: la posición del cambio en el log de la base. Ese número es el que ordena todo.
:::

## Paso 3 · Silver: snapshot + CDC con MERGE

**Qué tienes que lograr.** `mercado.silver.pedidos` y `mercado.silver.clientes` con las columnas de [La entrega](#/l/proyecto-mercado-vecino-la-entrega), cada fila con su `_lsn` (el del último cambio aplicado, 0 si viene del snapshot). Que puedas correr el proceso dos veces sin duplicar nada.

**Lo que esconden las fuentes.**

- El **backoffice cancela pedidos sin tocar `actualizado_en`**: una carga incremental por esa columna no ve la cancelación; el CDC sí.
- El equipo de fraude **borra** pedidos (`DELETE`): un borrado físico no aparece en ningún snapshot posterior, solo en el CDC.
- Un cliente puede sacar un producto **antes de pagar**: el mismo pedido cambia de total varias veces en minutos, y el orden importa.
- Los clientes que piden el **borrado de sus datos** quedan con `email` en NULL en la base: ese UPDATE tiene que llegar a silver.

**Compruébalo tú.**

- `count(*)` contra `count(DISTINCT pedido_id)`: tienen que ser iguales.
- Elige un pedido que se canceló hoy en el CDC y míralo en silver.
- Corre el MERGE dos veces seguidas: la segunda no cambia nada.
- `SELECT count(*) FROM mercado.silver.clientes WHERE nombre = '(eliminado)' AND email IS NOT NULL` da 0.

<details><summary>Pista 1</summary>

El snapshot es una foto en un momento; el CDC son los cambios. Si guardas en cada fila **hasta qué cambio** está aplicada, puedes reprocesar el tópico entero sin miedo: un cambio que ya tienes (o uno más viejo) no pisa nada.
</details>

<details><summary>Pista 2</summary>

`read_kafka` en Databricks para llevar el tópico a una tabla bronze tal cual, y `MERGE INTO … USING (…)`. Para leer el JSON del mensaje, la sintaxis `v:after.estado` sobre una columna de texto.
</details>

<details><summary>Pista 3</summary>

Por pedido, quédate con el último cambio (`ROW_NUMBER() OVER (PARTITION BY id ORDER BY lsn DESC)`). En el MERGE: si es una baja, `DELETE`; si es más nuevo que lo que hay (`s.lsn > t._lsn`), `UPDATE`; si no existe, `INSERT`. En una baja el id está en `before`.
</details>

:::solucion MV:CDC | silver.pedidos
Primero el snapshot, con `_lsn = 0`:

```sql norun
CREATE EXTERNAL LOCATION lago_mercado URL 'abfss://landing@stmercado.dfs.core.windows.net/' WITH (STORAGE CREDENTIAL credencial_lago);
CREATE CATALOG IF NOT EXISTS mercado;
CREATE SCHEMA IF NOT EXISTS mercado.bronze; CREATE SCHEMA IF NOT EXISTS mercado.silver; CREATE SCHEMA IF NOT EXISTS mercado.gold;

CREATE OR REPLACE TABLE mercado.silver.pedidos AS
SELECT CAST(id AS BIGINT) AS pedido_id, CAST(cliente_id AS BIGINT) AS cliente_id, estado,
       CAST(total AS DECIMAL(12,2)) AS total, CAST(descuento AS DECIMAL(12,2)) AS descuento, cupon,
       CAST(creado_en AS TIMESTAMP) AS creado_en, CAST(actualizado_en AS TIMESTAMP) AS actualizado_en,
       CAST(0 AS BIGINT) AS _lsn
FROM read_files('abfss://landing@stmercado.dfs.core.windows.net/snap/pedidos.csv', format => 'csv', header => true);
```

El CDC a bronze, tal cual llega:

```sql norun
CREATE OR REPLACE TABLE mercado.bronze.cdc_pedidos AS
SELECT CAST(value AS STRING) AS v, offset
FROM read_kafka(bootstrapServers => 'mv-eventos.servicebus.windows.net:9093', subscribe => 'mv_prod.public.pedidos',
  startingOffsets => 'earliest', `kafka.security.protocol` => 'SASL_SSL', `kafka.sasl.mechanism` => 'PLAIN',
  `kafka.sasl.jaas.config` => 'kafkashaded.org.apache.kafka.common.security.plain.PlainLoginModule required username="$ConnectionString" password="Endpoint=sb://…";');
```

Y el MERGE. Tres ideas:

1. Por pedido, solo el **último** cambio (`ROW_NUMBER` por LSN descendente): aplicar todos en orden daría lo mismo, pero más lento.
2. Se actualiza solo si el cambio es **más nuevo** que lo que ya hay (`s.lsn > t._lsn`). Así, reprocesar el tópico entero no rompe nada, y un cambio viejo nunca pisa a uno nuevo.
3. Las bajas (`op = 'd'`) borran.

```sql norun
MERGE INTO mercado.silver.pedidos t USING (
  SELECT * FROM (
    SELECT CAST(coalesce(v:after.id, v:before.id) AS BIGINT) AS id, v:op AS op, CAST(v:source.lsn AS BIGINT) AS lsn,
           CAST(v:after.cliente_id AS BIGINT) AS cliente_id, v:after.estado AS estado,
           CAST(v:after.total AS DECIMAL(12,2)) AS total, CAST(coalesce(v:after.descuento, '0') AS DECIMAL(12,2)) AS descuento,
           v:after.cupon AS cupon,
           timestamp_micros(v:after.creado_en) AS creado_en, timestamp_micros(v:after.actualizado_en) AS actualizado_en,
           ROW_NUMBER() OVER (PARTITION BY coalesce(v:after.id, v:before.id) ORDER BY CAST(v:source.lsn AS BIGINT) DESC) AS rn
    FROM mercado.bronze.cdc_pedidos) x
  WHERE rn = 1
) s ON t.pedido_id = s.id
WHEN MATCHED AND s.op = 'd' THEN DELETE
WHEN MATCHED AND s.lsn > t._lsn THEN UPDATE SET
  cliente_id = s.cliente_id, estado = s.estado, total = s.total, descuento = s.descuento, cupon = s.cupon,
  creado_en = s.creado_en, actualizado_en = s.actualizado_en, _lsn = s.lsn
WHEN NOT MATCHED AND s.op <> 'd' THEN INSERT (pedido_id, cliente_id, estado, total, descuento, cupon, creado_en, actualizado_en, _lsn)
  VALUES (s.id, s.cliente_id, s.estado, s.total, s.descuento, s.cupon, s.creado_en, s.actualizado_en, s.lsn);
```

En una baja, `after` es nulo: el id está en `before`. Y `descuento` y `cupon` aparecen recién después del cambio de esquema de la base; `coalesce(…, '0')` cubre los mensajes viejos que no los traen.
:::

:::solucion MV:Olvido | silver.clientes
El mismo patrón sobre `clientes`. El derecho al olvido no necesita nada especial: la base pone `nombre = '(eliminado)'` y `email = NULL`, ese UPDATE viaja por el CDC y el MERGE lo aplica.

```sql norun
CREATE OR REPLACE TABLE mercado.silver.clientes AS
SELECT CAST(id AS BIGINT) AS cliente_id, nombre, email, telefono, barrio,
       CAST(creado_en AS TIMESTAMP) AS creado_en, CAST(actualizado_en AS TIMESTAMP) AS actualizado_en, CAST(0 AS BIGINT) AS _lsn
FROM read_files('abfss://landing@stmercado.dfs.core.windows.net/snap/clientes.csv', format => 'csv', header => true);

CREATE OR REPLACE TABLE mercado.bronze.cdc_clientes AS
SELECT CAST(value AS STRING) AS v, offset
FROM read_kafka(bootstrapServers => 'mv-eventos.servicebus.windows.net:9093', subscribe => 'mv_prod.public.clientes',
  startingOffsets => 'earliest', `kafka.security.protocol` => 'SASL_SSL', `kafka.sasl.mechanism` => 'PLAIN',
  `kafka.sasl.jaas.config` => 'kafkashaded.org.apache.kafka.common.security.plain.PlainLoginModule required username="$ConnectionString" password="Endpoint=sb://…";');

MERGE INTO mercado.silver.clientes t USING (
  SELECT * FROM (
    SELECT CAST(coalesce(v:after.id, v:before.id) AS BIGINT) AS id, v:op AS op, CAST(v:source.lsn AS BIGINT) AS lsn,
           v:after.nombre AS nombre, v:after.email AS email, v:after.telefono AS telefono, v:after.barrio AS barrio,
           timestamp_micros(v:after.creado_en) AS creado_en, timestamp_micros(v:after.actualizado_en) AS actualizado_en,
           ROW_NUMBER() OVER (PARTITION BY coalesce(v:after.id, v:before.id) ORDER BY CAST(v:source.lsn AS BIGINT) DESC) AS rn
    FROM mercado.bronze.cdc_clientes) x
  WHERE rn = 1
) s ON t.cliente_id = s.id
WHEN MATCHED AND s.op = 'd' THEN DELETE
WHEN MATCHED AND s.lsn > t._lsn THEN UPDATE SET
  nombre = s.nombre, email = s.email, telefono = s.telefono, barrio = s.barrio, actualizado_en = s.actualizado_en, _lsn = s.lsn
WHEN NOT MATCHED AND s.op <> 'd' THEN INSERT (cliente_id, nombre, email, telefono, barrio, creado_en, actualizado_en, _lsn)
  VALUES (s.id, s.nombre, s.email, s.telefono, s.barrio, s.creado_en, s.actualizado_en, s.lsn);
```
:::

## Paso 4 · PagoYa: la API, los webhooks y las liquidaciones

**Qué tienes que lograr.** Un script (`ingesta/pagoya.py`) que deje en el lago **un registro por evento** de los tipos `pago.aprobado`, `reembolso.creado`, `disputa.abierta` y `disputa.cerrada` (de la API y de los webhooks, sin repetidos ni falsos) y las líneas de todas las liquidaciones publicadas. Y `mercado.silver.pagoya_eventos` cargada desde ahí.

**Lo que esconden las fuentes.**

- Los webhooks llegan **al menos una vez**: repetidos, desordenados y tarde.
- Al endpoint también llegan entregas **falsas** (firma que no valida) y **repeticiones viejas** de entregas reales.
- A mitad del proyecto se **rota el secreto** de firma: durante un día llegan dos firmas `v1` y tienes que aceptar las dos.
- La API pagina **del más nuevo al más viejo**, con límite de 100 pedidos por minuto y algún 503 suelto.
- Los montos vienen en **centavos** y `pedido_id` es **texto**.

**Compruébalo tú.** En tu archivo de eventos, `evento_id` es único. Todos los `pago.aprobado` de ayer de la API están. Ningún evento que solo vino por webhook deja de estar en la API cuando lo buscas por id (si no está, era falso). La suma de `bruto` de una liquidación coincide con lo que dice su encabezado.

<details><summary>Pista 1</summary>

La API es la fuente completa; los webhooks son la fuente rápida. El `id` del evento es lo que permite juntarlas sin duplicar.
</details>

<details><summary>Pista 2</summary>

`requests` con reintentos ante 429 y 503 (respetando `Retry-After`), paginación con `despues_de` y filtro por `tipo`. Para la firma: `hmac.new(secreto, f"{t}.{cuerpo}", sha256)` y `hmac.compare_digest`.
</details>

<details><summary>Pista 3</summary>

Una entrega es válida si **alguna** firma `v1` coincide con **alguno** de los secretos vigentes y si su `t` está a menos de 5 minutos de cuando llegó. Guarda los eventos en un diccionario por `id`: lo que viene de la API y lo que viene de los webhooks se pisan, no se suman.
</details>

:::solucion MV:PagoYa | API, webhooks y liquidaciones
La API recupera **todo** lo que pasó (también antes del webhook). Los webhooks se verifican: la firma es un HMAC-SHA256 de `t.cuerpo` con el secreto. Durante la rotación del secreto llegan dos firmas `v1`, así que se aceptan los dos secretos. Y una entrega cuya marca `t` está a más de 5 minutos de cuando llegó es una repetición vieja (o un ataque): se descarta.

```bash
az storage blob download-batch --account-name stmercado -d ~/mv/webhooks -s landing --pattern "pagoya/webhooks/*"
```

Guárdalo como `~/mv/pagoya.py`:

```python norun
import requests, json, hmac, hashlib, os, glob, time
from datetime import datetime
SK = os.environ["PAGOYA_SK"]; SECRETOS = [x for x in os.environ["PAGOYA_WH"].split(",") if x]
H = {"Authorization": "Bearer " + SK}

def get(url, **kw):
    while True:
        r = requests.get(url, headers=H, **kw)
        if r.status_code in (429, 503):
            time.sleep(int(r.headers.get("retry-after", 1))); continue
        r.raise_for_status(); return r

# 1) la API: todos los eventos, con cursor
eventos, despues = {}, None
while True:
    params = {"limite": 100, "tipo": "pago.aprobado,reembolso.creado,disputa.abierta,disputa.cerrada"}
    if despues: params["despues_de"] = despues
    d = get("https://api.pagoya.example/v1/eventos", params=params).json()
    for e in d["datos"]: eventos[e["id"]] = e
    if not d["hay_mas"]: break
    despues = d["datos"][-1]["id"]

# 2) los webhooks: firma válida y no repetidos viejos; el id del evento deduplica contra la API
for f in glob.glob("mv/webhooks/**/*.json", recursive=True):
    w = json.loads(open(f).read())
    pares = [x.split("=", 1) for x in w["headers"]["pagoya-signature"].split(",")]
    t = int(dict(pares)["t"]); firmas = [v for k, v in pares if k == "v1"]
    esperadas = [hmac.new(s.encode(), f"{t}.{w['body']}".encode(), hashlib.sha256).hexdigest() for s in SECRETOS]
    if not any(hmac.compare_digest(e, x) for e in esperadas for x in firmas): continue      # falsificado
    if abs(datetime.fromisoformat(w["recibido_en"].replace("Z", "+00:00")).timestamp() - t) > 300: continue   # repetición vieja
    e = json.loads(w["body"]); eventos[e["id"]] = e

with open("mv/eventos.jsonl", "w") as out:
    for e in eventos.values():
        o = e["datos"]["objeto"]; pago = o["id"] if o["objeto"] == "pago" else o["pago"]
        out.write(json.dumps({"evento_id": e["id"], "tipo": e["tipo"], "creado": e["creado"], "pago_id": pago,
                              "pedido_id": o.get("metadatos", {}).get("pedido_id"), "monto": o["monto"] / 100, "estado": o.get("estado")}) + "\n")

# 3) las liquidaciones: el índice y el reporte de cada una
filas = []
for l in get("https://api.pagoya.example/v1/liquidaciones").json()["datos"]:
    filas += get("https://api.pagoya.example" + l["reporte"]).text.strip().split("\n")[1:]
open("mv/liquidaciones.csv", "w").write("fecha_liquidacion,tipo,pago_id,pedido_id,bruto,comision,neto,moneda\n" + "\n".join(filas) + "\n")
```

```bash
PAGOYA_SK=sk_… PAGOYA_WH=whsec_nuevo,whsec_viejo python ~/mv/pagoya.py
az storage blob upload --account-name stmercado -c landing -n pagoya/eventos/eventos.jsonl -f ~/mv/eventos.jsonl --overwrite
az storage blob upload --account-name stmercado -c landing -n pagoya/liquidaciones/liquidaciones.csv -f ~/mv/liquidaciones.csv --overwrite
```

```sql norun
CREATE OR REPLACE TABLE mercado.silver.pagoya_eventos AS
SELECT evento_id, tipo, CAST(creado AS BIGINT) AS creado, pago_id, CAST(pedido_id AS BIGINT) AS pedido_id,
       CAST(monto AS DECIMAL(12,2)) AS monto, estado
FROM read_files('abfss://landing@stmercado.dfs.core.windows.net/pagoya/eventos/eventos.jsonl', format => 'json');
```

Comparar firmas con `==` corta en el primer carácter distinto, y el tiempo que tarda le da pistas a un atacante. `compare_digest` tarda siempre lo mismo. Y a este volumen, después de la primera carga conviene pedir a la API solo lo nuevo (`creado_desde` con la marca del último evento que guardaste): la versión de arriba recorre todo cada vez y, con 30 días de eventos, choca con el límite de pedidos.
:::

## Paso 5 · La conciliación

**Qué tienes que lograr.** `mercado.gold.conciliacion`: un registro por pago **aprobado** de los días cerrados, con su `categoria` y `liquidado_el`, como dice [La entrega](#/l/proyecto-mercado-vecino-la-entrega). Y una vista diaria de la liquidación para Finanzas.

**Lo que esconden las fuentes.** Un pago puede estar en varias situaciones a la vez (reembolsado **y** en disputa): la categoría sigue un orden de prioridad. Hay pagos que llegan **después** de que el pedido venció, y contracargos que solo existen en la pasarela. Los pagos de las 23:00 se liquidan dos días después: la liquidación no coincide día a día con las ventas.

**Compruébalo tú.** La cantidad de filas es igual a los `pago.aprobado` de los días cerrados. Ninguna fila es de hoy. La suma por categoría tiene sentido (casi todo `ok`, unos pocos por ciento en el resto).

<details><summary>Pista 1</summary>

Arma primero un conjunto por situación (reembolsados, en disputa, disputas cerradas, liquidados) y después decide la categoría con un `CASE` en el orden de prioridad.
</details>

<details><summary>Pista 2</summary>

`LEFT JOIN` de los aprobados contra cada conjunto y contra `mercado.silver.pedidos`. El día es el de la tienda: `to_date(from_unixtime(creado - 10800))`.
</details>

:::solucion MV:Conciliación | gold.conciliacion
```sql norun
CREATE OR REPLACE TABLE mercado.silver.liquidaciones AS
SELECT * FROM read_files('abfss://landing@stmercado.dfs.core.windows.net/pagoya/liquidaciones/liquidaciones.csv', format => 'csv', header => true);
```

Un pago aprobado por fila, con una categoría que sigue un orden de prioridad (un contracargo pesa más que un reembolso, y así). Solo días cerrados (hora de la tienda): el día de hoy todavía puede cambiar.

```sql norun
CREATE OR REPLACE TABLE mercado.gold.conciliacion AS
WITH ap AS (SELECT pago_id, pedido_id, monto, to_date(from_unixtime(creado - 10800)) AS fecha FROM mercado.silver.pagoya_eventos WHERE tipo = 'pago.aprobado'),
hoy AS (SELECT to_date(from_unixtime(unix_timestamp() - 10800)) AS d),
re AS (SELECT DISTINCT pago_id FROM mercado.silver.pagoya_eventos WHERE tipo = 'reembolso.creado'),
da AS (SELECT DISTINCT pago_id FROM mercado.silver.pagoya_eventos WHERE tipo = 'disputa.abierta'),
dc AS (SELECT pago_id, max(estado) AS estado FROM mercado.silver.pagoya_eventos WHERE tipo = 'disputa.cerrada' GROUP BY pago_id),
li AS (SELECT pago_id, min(fecha_liquidacion) AS f FROM mercado.silver.liquidaciones WHERE tipo = 'cobro' GROUP BY pago_id)
SELECT ap.pago_id, ap.pedido_id, ap.fecha, ap.monto,
       CASE WHEN dc.estado = 'perdida' THEN 'contracargo'
            WHEN da.pago_id IS NOT NULL AND dc.pago_id IS NULL THEN 'en_disputa'
            WHEN re.pago_id IS NOT NULL THEN 'reembolsado'
            WHEN p.pedido_id IS NULL THEN 'pago_sin_pedido'
            WHEN p.estado = 'cancelado' THEN 'cobrado_y_cancelado'
            ELSE 'ok' END AS categoria,
       CAST(li.f AS DATE) AS liquidado_el
FROM ap CROSS JOIN hoy
LEFT JOIN re ON re.pago_id = ap.pago_id
LEFT JOIN da ON da.pago_id = ap.pago_id
LEFT JOIN dc ON dc.pago_id = ap.pago_id
LEFT JOIN li ON li.pago_id = ap.pago_id
LEFT JOIN mercado.silver.pedidos p ON p.pedido_id = ap.pedido_id
WHERE ap.fecha < hoy.d;

CREATE OR REPLACE TABLE mercado.gold.conciliacion_diaria AS
SELECT CAST(fecha_liquidacion AS DATE) AS fecha_liquidacion,
       SUM(CASE WHEN tipo = 'cobro' THEN CAST(bruto AS DECIMAL(14,2)) ELSE 0 END) AS cobros,
       SUM(CASE WHEN tipo = 'reembolso' THEN CAST(bruto AS DECIMAL(14,2)) ELSE 0 END) AS reembolsos,
       SUM(CASE WHEN tipo = 'contracargo' THEN CAST(bruto AS DECIMAL(14,2)) ELSE 0 END) AS contracargos,
       SUM(CAST(comision AS DECIMAL(14,2))) AS comisiones, SUM(CAST(neto AS DECIMAL(14,2))) AS neto
FROM mercado.silver.liquidaciones GROUP BY fecha_liquidacion;
```

Para que Finanzas lo lea desde Snowflake, se exporta al lago:

```sql norun
INSERT OVERWRITE DIRECTORY 'abfss://landing@stmercado.dfs.core.windows.net/gold/conciliacion_diaria'
USING CSV OPTIONS ('header' = 'true')
SELECT * FROM mercado.gold.conciliacion_diaria;
```
:::

## Paso 6 · Automatizar

**Qué tienes que lograr.** Un DAG con `mercado` en el `dag_id`, programado cada hora, que dispare el job de Databricks con el MERGE y la conciliación (ticket de Jira MV), y las líneas de cada liquidación traídas por Data Factory.

**Lo que esconde.** El CDC tiene 24 horas de retención: si el DAG falla un fin de semana, al volver ya perdiste cambios. Tu proceso tiene que **darse cuenta** (comparar el offset más bajo disponible con el último que leíste) y, si hay hueco, rehacer el snapshot.

**Compruébalo tú.** `airflow dags test <dag_id>` en verde y el ticket de Jira pasa la revisión.

<details><summary>Pista 1</summary>

Lo que corre cada hora tiene que ser idempotente: si corre dos veces, el resultado es el mismo. Eso ya lo resolviste con `_lsn` y con el diccionario de eventos.
</details>

<details><summary>Pista 2</summary>

`DatabricksRunNowOperator` con `job_name` y `schedule="@hourly"`. En Data Factory, un servicio vinculado REST con la cabecera `Authorization` sacada del Key Vault y una actividad Copy con la fecha como parámetro.
</details>

:::solucion MV:Conciliación | el DAG
```python norun
from datetime import datetime
from airflow.sdk import DAG
from airflow.providers.databricks.operators.databricks import DatabricksRunNowOperator

with DAG("mercado_horario", start_date=datetime(2026, 11, 1), schedule="@hourly", catchup=False, tags=["mercado"]):
    DatabricksRunNowOperator(task_id="cdc_y_gold", job_name="mercado_cdc")
```

Las líneas de cada liquidación también se pueden traer con Data Factory: un servicio vinculado REST con la cabecera `Authorization` sacada del Key Vault (`pagoya-auth`) y un Copy con la fecha como parámetro.
:::

:::real En tu computadora y en la web real
Para repetir esta solución en tu propia nube:

1. **Azure Portal**: grupo de recursos, cuenta de almacenamiento (con *hierarchical namespace*), **Key Vault** (*Secrets → Generate/Import*) y Event Hubs.
2. **Databricks**: *Catalog* para el catálogo y los esquemas; *Workspace* para los notebooks; *Workflows* para el job que corre todo cada día; los secretos se leen con `dbutils.secrets.get` desde un *secret scope* respaldado por el Key Vault.
3. **Terminal**: `az` para crear los recursos, `databricks` para desplegar el bundle y `git` para el repositorio.

Al terminar, borra el grupo de recursos si usas crédito gratuito.
:::

:::capturas Capturas para tu portafolio
Guárdalas en `docs/capturas/` del repositorio del proyecto y úsalas en el README.

- `06-arquitectura.png`: el diagrama de la solución (exportado con ⬇ PNG).
- `06-merge.png`: el resultado del MERGE en silver.
- `06-conciliacion.png`: la tabla de conciliación entre pedidos y pagos.
- `06-job.png`: el job diario en verde.

Antes de publicar, tapa con un rectángulo los correos, los IDs de suscripción y de tenant, los nombres de cuentas reales y cualquier clave o token.
:::

## Ejercicios

:::ejercicio quiz
Llega otra vez un cambio de CDC que ya aplicaste (mismo LSN). ¿Qué hace el MERGE?
- [ ] Lo aplica de nuevo y duplica la fila
- [x] Nada: `s.lsn > t._lsn` es falso, así que no actualiza
- [ ] Borra la fila
- [ ] Da error
:::

:::ejercicio quiz
Llega un webhook con la firma correcta pero con `t` de hace dos horas. ¿Qué haces?
- [ ] Lo acepto: la firma es válida
- [x] Lo descarto: es una repetición vieja (o un ataque de reenvío); si el evento es real, ya está por la API
- [ ] Le pido a PagoYa que lo reenvíe
- [ ] Lo guardo dos veces
:::

## Resumen

- Snapshot con `_lsn = 0` y un MERGE que solo aplica cambios más nuevos: idempotente y en orden.
- La API completa la historia; los webhooks la mantienen al día, siempre verificados.
- La conciliación cruza pagos, pedidos y liquidaciones con una prioridad clara y solo sobre días cerrados.
