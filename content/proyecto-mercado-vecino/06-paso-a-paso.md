---
titulo: Paso a paso - una solución completa, explicada
nivel: Avanzado
duracion: 75
resumen: Una forma de resolver el proyecto de punta a punta, con el código probado y el porqué de cada decisión - snapshot más CDC con MERGE ordenado por LSN, los eventos de PagoYa por API y por webhook con la firma verificada, y la conciliación. Léela después de intentarlo.
objetivos: Ver cómo se combinan un snapshot y un flujo de CDC sin perder ni duplicar cambios | Verificar firmas HMAC de webhooks y descartar repeticiones | Conciliar pagos, pedidos y liquidaciones
prerrequisitos: proyecto-mercado-vecino-el-dia-a-dia
autoevaluacion: ¿Sabes para qué sirve _lsn en el MERGE? | ¿Sabes por qué se aceptan dos secretos de webhook durante la rotación? | ¿Sabes por qué la conciliación excluye el día de hoy?
---

:::cuidado Inténtalo primero
Esta es **una** solución. Si ya resolviste el proyecto, compara: ¿qué hace tu versión si el mismo cambio de CDC llega dos veces, o llega uno viejo después de uno nuevo?
:::

## El plan

| Paso | Qué | Dónde |
|---|---|---|
| 1 | Lago, Key Vault y webhook | Terminal (`az`, `pagoya`) |
| 2 | Snapshot de la base y mirar el CDC | Terminal (`psql`, `kcat`) |
| 3 | Silver: snapshot + MERGE del CDC | Databricks |
| 4 | PagoYa: API + webhooks verificados + liquidaciones | Terminal (`python`) |
| 5 | La conciliación | Databricks |
| 6 | Automatizar | Data Factory / Airflow |

## Paso 1 · El lago, el Key Vault y el webhook

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

## Paso 2 · El snapshot y el CDC

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

## Paso 3 · Silver: snapshot + MERGE

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

:::tip coalesce(after.id, before.id)
En una baja, `after` es nulo: el id está en `before`. Y `descuento` y `cupon` aparecen recién después del cambio de esquema de la base; `coalesce(…, '0')` cubre los mensajes viejos que no los traen.
:::

`mercado.silver.clientes` se arma igual (snapshot + MERGE sobre `cdc_clientes`). Cuando un cliente pide el borrado, la base pone su email en NULL y ese cambio viaja por el CDC.

## Paso 4 · PagoYa en Python

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

:::trabajo hmac.compare_digest, no ==
Comparar firmas con `==` corta en el primer carácter distinto, y el tiempo que tarda le da pistas a un atacante. `compare_digest` tarda siempre lo mismo. Es una línea y es la forma correcta.
:::

## Paso 5 · La conciliación

```sql norun
CREATE OR REPLACE TABLE mercado.silver.pagoya_eventos AS
SELECT evento_id, tipo, CAST(creado AS BIGINT) AS creado, pago_id, CAST(pedido_id AS BIGINT) AS pedido_id,
       CAST(monto AS DECIMAL(12,2)) AS monto, estado
FROM read_files('abfss://landing@stmercado.dfs.core.windows.net/pagoya/eventos/eventos.jsonl', format => 'json');

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

## Paso 6 · Automatizar

Un job de Databricks con el MERGE y la conciliación, disparado cada hora por un DAG:

```python norun
from datetime import datetime
from airflow.sdk import DAG
from airflow.providers.databricks.operators.databricks import DatabricksRunNowOperator

with DAG("mercado_horario", start_date=datetime(2026, 11, 1), schedule="@hourly", catchup=False, tags=["mercado"]):
    DatabricksRunNowOperator(task_id="cdc_y_gold", job_name="mercado_cdc")
```

Las líneas de cada liquidación también se pueden traer con Data Factory: un servicio vinculado REST con la cabecera `Authorization` sacada del Key Vault (`pagoya-auth`) y un Copy con la fecha como parámetro.

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
