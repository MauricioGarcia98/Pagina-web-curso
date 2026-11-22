---
titulo: Paso a paso - una solución completa, explicada
nivel: Avanzado
duracion: 60
resumen: Una forma de resolver el proyecto de punta a punta, con el código probado y el porqué de cada decisión - la streaming table desde Kafka con su checkpoint, silver que entiende los dos firmwares, el plan del TMS y el SLA de cada entrega. Léela después de intentarlo.
objetivos: Ver una ingesta de streaming con checkpoint de punta a punta | Normalizar eventos de dos versiones de firmware | Unir el plan con los eventos para medir un SLA
prerrequisitos: proyecto-ruta-sur-el-dia-a-dia
autoevaluacion: ¿Sabes qué guarda el checkpoint de una streaming table? | ¿Sabes cómo distinguir un evento de firmware 2.0? | ¿Sabes por qué el plan va a la izquierda del LEFT JOIN?
---

:::cuidado Inténtalo primero
Esta es **una** solución. Si ya resolviste el proyecto, compara: ¿qué hace tu versión con los eventos que llegan un día tarde?
:::

## El plan

| Paso | Qué | Dónde |
|---|---|---|
| 1 | Lago, Key Vault y mirar el tópico | Terminal (`az`, `kcat`) |
| 2 | El plan del TMS | Terminal (`python`) |
| 3 | Bronze: streaming table desde Kafka | Databricks |
| 4 | Silver: un evento por fila, en un solo formato | Databricks |
| 5 | Gold: cada pedido del plan con su entrega | Databricks |
| 6 | Refrescar todos los días | Databricks / Airflow |

## Paso 1 · El lago, el Key Vault y el tópico

```bash
ruta accesos
az login
az group create -n rg-ruta -l eastus2
az storage account create -n strutasur -g rg-ruta -l eastus2 --sku Standard_LRS --hns true
az storage container create --account-name strutasur -n landing
ID=$(az storage account show -n strutasur -g rg-ruta --query id -o tsv)
az role assignment create --assignee unity-catalog-access-connector --role "Storage Blob Data Contributor" --scope $ID
az keyvault create -n kv-ruta -g rg-ruta -l eastus2
az keyvault secret set --vault-name kv-ruta -n eh --value 'Endpoint=sb://…' -o none
az keyvault secret set --vault-name kv-ruta -n tms --value '…' -o none
```

Antes de escribir una línea de SQL, mira el tópico con `kcat`: particiones, offsets y cómo es un mensaje.

```bash
kcat -b rutasur-telemetria.servicebus.windows.net:9093 -X security.protocol=SASL_SSL -X sasl.mechanisms=PLAIN \
  -X 'sasl.username=$ConnectionString' -X 'sasl.password=Endpoint=sb://…' -L
kcat -b rutasur-telemetria.servicebus.windows.net:9093 -X security.protocol=SASL_SSL -X sasl.mechanisms=PLAIN \
  -X 'sasl.username=$ConnectionString' -X 'sasl.password=Endpoint=sb://…' \
  -C -t rutasur.telemetria -p 1 -o -2 -e -f '%p %o %T %k %s\n'
```

(El broker y la cadena exactos te los da `ruta accesos`.) Vas a ver que la clave del mensaje es el vehículo, que hay eventos repetidos (el mismo `event_id`) y, desde el cambio de firmware, mensajes con `fw: "2.0"`, `speed_mps` y `ts` en milisegundos.

## Paso 2 · El plan del TMS

El plan de cada día se publica la tarde anterior y puede sumar pedidos urgentes. Se baja una ventana de días hacia atrás. Guárdalo como `~/plan.py`:

```python norun
import requests, json, os
from datetime import date, timedelta
H = {"X-Api-Key": os.environ["RS_KEY"]}
hoy = date.fromisoformat(os.environ["HOY"])
n = 0
with open("plan.jsonl", "w") as out:
    for k in range(1, 9):
        f = (hoy - timedelta(days=k)).isoformat()
        r = requests.get("https://api.rutasur.example/v1/rutas", params={"fecha": f}, headers=H)
        if r.status_code != 200:
            print(f, r.status_code); continue
        for ruta in r.json()["rutas"]:
            for p in ruta["pedidos"]:
                out.write(json.dumps({"fecha": f, "vehiculo": ruta["vehiculo"], **p}) + "\n"); n += 1
print(n, "pedidos")
```

```bash
RS_KEY=… HOY=$(date +%F) python ~/plan.py
az storage blob upload --account-name strutasur -c landing -n tms/plan.jsonl -f ~/plan.jsonl --overwrite
```

## Paso 3 · Bronze: la streaming table

Una **streaming table** lee Kafka y guarda en el checkpoint hasta qué offset leyó en cada partición. Cada `REFRESH` trae solo lo nuevo. La primera vez se crea con `startingOffsets => 'earliest'`: el tópico guarda 3 días, así que hay que crearla **el primer día** (lo que se va del tópico no vuelve).

```sql norun
CREATE EXTERNAL LOCATION lago_ruta URL 'abfss://landing@strutasur.dfs.core.windows.net/' WITH (STORAGE CREDENTIAL credencial_lago);
CREATE CATALOG IF NOT EXISTS ruta;
CREATE SCHEMA IF NOT EXISTS ruta.bronze; CREATE SCHEMA IF NOT EXISTS ruta.silver; CREATE SCHEMA IF NOT EXISTS ruta.gold;

CREATE OR REFRESH STREAMING TABLE ruta.bronze.telemetria AS
SELECT CAST(value AS STRING) AS valor, partition, offset, timestamp AS ts_ingesta
FROM STREAM read_kafka(
  bootstrapServers => 'rutasur-telemetria.servicebus.windows.net:9093',
  subscribe => 'rutasur.telemetria',
  startingOffsets => 'earliest',
  `kafka.security.protocol` => 'SASL_SSL',
  `kafka.sasl.mechanism` => 'PLAIN',
  `kafka.sasl.jaas.config` => 'kafkashaded.org.apache.kafka.common.security.plain.PlainLoginModule required username="$ConnectionString" password="Endpoint=sb://…";');

-- cada día (o cada hora):
REFRESH STREAMING TABLE ruta.bronze.telemetria;
```

:::trabajo Bronze guarda el mensaje tal cual
En bronze no se interpreta nada: el JSON como texto, la partición, el offset y cuándo llegó. Si mañana descubres un error en silver, lo recalculas desde bronze. Si hubieras interpretado al leer, tendrías que volver a Kafka, y Kafka ya lo borró.
:::

## Paso 4 · Silver: un formato, un evento por fila

Dos firmwares conviven: se elige el campo según `fw`. Y como hay reintentos, se deduplica por `event_id` quedándose con la primera llegada.

```sql norun
CREATE OR REPLACE TABLE ruta.silver.telemetria AS
SELECT event_id, vehiculo, tipo, ts_evento, ts_ingesta, lat, lon, velocidad_kmh, pedido_id FROM (
  SELECT valor:event_id AS event_id,
         coalesce(valor:vehiculo, valor:vehicle) AS vehiculo,
         coalesce(valor:evento, valor:type) AS tipo,
         CASE WHEN valor:fw = '2.0' THEN timestamp_millis(CAST(valor:ts AS BIGINT))
              ELSE CAST(valor:ts_dispositivo AS TIMESTAMP) END AS ts_evento,
         ts_ingesta,
         CAST(valor:lat AS DOUBLE) AS lat, CAST(valor:lon AS DOUBLE) AS lon,
         CASE WHEN valor:fw = '2.0' THEN round(CAST(valor:speed_mps AS DOUBLE) * 3.6, 0)
              ELSE CAST(valor:velocidad_kmh AS DOUBLE) END AS velocidad_kmh,
         coalesce(valor:pedido_id, valor:order_id) AS pedido_id,
         ROW_NUMBER() OVER (PARTITION BY valor:event_id ORDER BY ts_ingesta) AS rn
  FROM ruta.bronze.telemetria) x
WHERE rn = 1;
```

## Paso 5 · Gold: cada pedido del plan

El reloj de V13 se adelantó 2 horas (es la pregunta del ticket "V13 entrega en el futuro"). Un evento no puede ocurrir **después** de haber llegado: si `ts_evento` supera a `ts_ingesta` por más de unos minutos, ese reloj está mal. Se corrige al usar el evento.

```sql norun
CREATE OR REPLACE TEMP VIEW plan AS
SELECT * FROM read_files('abfss://landing@strutasur.dfs.core.windows.net/tms/plan.jsonl', format => 'json');

CREATE OR REPLACE TEMP VIEW ent AS
SELECT pedido_id, tipo,
       CASE WHEN vehiculo = 'V13' AND unix_timestamp(ts_evento) > unix_timestamp(ts_ingesta) + 600
            THEN unix_timestamp(ts_evento) - 7200 ELSE unix_timestamp(ts_evento) END AS t
FROM ruta.silver.telemetria
WHERE tipo IN ('entrega_completada', 'entrega_fallida');
```

El plan va a la **izquierda**: un pedido sin ningún evento también es un resultado (`sin_evento`), y es justo el que más le importa a Dirección.

```sql norun
CREATE OR REPLACE TABLE ruta.gold.entregas AS
SELECT p.pedido_id, p.vehiculo, p.fecha, p.zona, p.ventana_inicio, p.ventana_fin,
       CASE WHEN e.tipo = 'entrega_completada' THEN 'completada'
            WHEN e.tipo = 'entrega_fallida' THEN 'fallida' ELSE 'sin_evento' END AS estado,
       from_unixtime(e.t) AS ts_entrega,
       CASE WHEN e.tipo = 'entrega_completada'
             AND e.t BETWEEN unix_timestamp(p.ventana_inicio) AND unix_timestamp(p.ventana_fin) THEN true ELSE false END AS a_tiempo
FROM plan p LEFT JOIN ent e ON e.pedido_id = p.pedido_id;

CREATE OR REPLACE TABLE ruta.gold.sla_diario AS
SELECT fecha, zona, count(*) AS pedidos,
       sum(CASE WHEN a_tiempo THEN 1 ELSE 0 END) AS a_tiempo,
       sum(CASE WHEN estado = 'fallida' THEN 1 ELSE 0 END) AS fallidas
FROM ruta.gold.entregas GROUP BY fecha, zona;
```

Las preguntas del tablero salen de estas tablas:

```sql norun
-- % a tiempo de un día
SELECT round(100.0 * sum(CASE WHEN a_tiempo THEN 1 ELSE 0 END) / count(*), 1)
FROM ruta.gold.entregas WHERE fecha = '2026-11-18';

-- cuántos eventos de un día llegaron con más de 15 minutos de demora
SELECT count(*) FROM ruta.silver.telemetria
WHERE substr(CAST(from_unixtime(unix_timestamp(ts_evento) - 10800) AS STRING), 1, 10) = '2026-11-18'
  AND unix_timestamp(ts_ingesta) - unix_timestamp(ts_evento) > 900;
```

:::nota Los km de una camioneta
Para la pregunta de mantenimiento: los pings de ese vehículo en ese día, ordenados por `ts_evento`, y la suma de la distancia entre cada punto y el siguiente (fórmula de haversine en Python o en SQL). La hora del día es la **local** (UTC−3).
:::

## Paso 6 · Todos los días

`REFRESH STREAMING TABLE` (lee solo lo nuevo desde el checkpoint), recrear silver y gold, y volver a bajar el plan. Los eventos de la camioneta que estuvo sin señal llegan al día siguiente: por eso el SLA de ayer puede cambiar esta mañana, y por eso gold se recalcula sobre varios días, no solo sobre ayer.

:::real En tu computadora y en la web real
En tu nube: **Event Hubs** en Azure Portal (crear el namespace y el tópico); **Databricks** con un pipeline declarativo (*Jobs & Pipelines → Create → ETL pipeline*) para la *streaming table* de bronze y las tablas silver y gold; el plan del TMS se baja con una tarea programada. El estado del stream (checkpoints) se ve en la página del pipeline.
:::

:::capturas Capturas para tu portafolio
Guárdalas en `docs/capturas/` del repositorio del proyecto y úsalas en el README.

- `06-pipeline.png`: el grafo del pipeline declarativo con bronze, silver y gold.
- `06-gold.png`: el resultado de gold con el cumplimiento por pedido.

Antes de publicar, tapa con un rectángulo los correos, los IDs de suscripción y de tenant, los nombres de cuentas reales y cualquier clave o token.
:::

## Ejercicios

:::ejercicio quiz
Creas la streaming table el cuarto día del proyecto. ¿Qué pasa con los eventos del primer día?
- [ ] Llegan igual
- [x] Ya no están: el tópico guarda 3 días y el checkpoint empieza desde lo que queda
- [ ] Se recuperan con REFRESH FULL
- [ ] Están en silver
:::

:::ejercicio quiz
¿Por qué se deduplica por `event_id` con `ORDER BY ts_ingesta` y `rn = 1`?
- [x] Porque el mismo evento puede llegar más de una vez (reintentos) y nos quedamos con la primera copia
- [ ] Para ordenar la tabla
- [ ] Porque Kafka lo exige
- [ ] Para borrar los pings
:::

## Resumen

- Bronze guarda el mensaje crudo; el checkpoint recuerda hasta dónde se leyó.
- Silver resuelve formatos y repetidos; un reloj que adelanta se detecta comparando con la llegada.
- Gold parte del plan: un pedido sin evento también es un resultado.
