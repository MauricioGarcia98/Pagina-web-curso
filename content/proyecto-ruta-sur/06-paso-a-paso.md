---
titulo: Construirlo paso a paso - una guía, no una solución
nivel: Avanzado
duracion: 240
resumen: Construyes el proyecto de cero con la flota de Ruta Sur a volumen de empresa (250 camionetas, unos 5.500 pedidos y 52.000 eventos de telemetría por día, más de 100.000 mensajes en el tópico). Cada paso dice qué lograr, qué esconden los datos, cómo comprobarlo y pistas graduales; la solución de referencia de cada paso se desbloquea cuando tu entrega pasa la revisión.
objetivos: Explorar un tópico de Kafka antes de procesarlo | Ingerir un stream con checkpoint sin perder datos | Normalizar eventos de dos versiones de firmware y deduplicarlos | Detectar un reloj adelantado comparando con la llegada | Unir el plan con los eventos para medir un SLA
prerrequisitos: proyecto-ruta-sur-el-dia-a-dia
autoevaluacion: ¿Sabes qué guarda el checkpoint de una streaming table? | ¿Sabes cómo distinguir un evento de firmware 2.0? | ¿Sabes por qué el plan va a la izquierda del LEFT JOIN? | ¿Sabes por qué el SLA de ayer puede cambiar hoy?
---

:::trabajo Cómo se usa esta guía
Nada viene hecho: el lago, el Key Vault, el script del plan, las tablas y el refresco diario los creas tú. Cada paso tiene **qué tienes que lograr**, **lo que esconden los datos**, **compruébalo tú** y **pistas** (ábrelas de a una). Al final de cada paso hay una **solución de referencia** bloqueada 🔒 que se abre cuando tu entrega pasa la misma revisión que hace el líder técnico en Jira.
:::

## Antes de empezar: el volumen

| Fuente | Volumen aproximado | Qué implica |
|---|---|---|
| Tópico `rutasur.telemetria` | ~52.000 eventos por día, 8 particiones, 3 días de retención: más de 100.000 mensajes | Leerlo entero en cada corrida no escala: el checkpoint es lo que permite traer solo lo nuevo |
| API del TMS | ~5.500 pedidos por día en 250 rutas, con urgentes que se suman durante el día | 8 días de plan son ~33.000 pedidos y un archivo de ~8 MB |
| Flota | 250 camionetas, dos firmwares, una con el reloj adelantado y una que pierde señal | Los errores no se ven mirando 10 filas: hay que buscarlos con consultas |

Crea el repositorio `ruta-sur` con `README.md`, `tms/plan.py` y `sql/` (bronze, silver y gold en archivos separados), y trabaja con una rama por paso.

## Paso 1 · El lago, el Key Vault y el tópico

**Qué tienes que lograr.** Una cuenta de almacenamiento con jerarquía de nombres y un contenedor `landing`, el conector de Unity Catalog con permiso sobre ella, y la cadena de Event Hubs y la clave del TMS en un Key Vault (no en el código). Además, una nota con lo que viste en el tópico.

**Lo que esconden los datos.** La clave de cada mensaje es el vehículo; hay mensajes repetidos (el mismo `event_id`); desde el cambio de firmware conviven `velocidad_kmh` y `speed_mps`, y la hora en texto o en milisegundos.

**Compruébalo tú.** Puedes decir, sin código, cuántas particiones tiene el tópico, desde qué offset hay datos en cada una y cómo es un mensaje de cada firmware.

<details><summary>Pista 1</summary>

`ruta accesos` te da el broker, la cadena de conexión y la clave del TMS. Event Hubs habla protocolo Kafka con SASL_SSL y usuario `$ConnectionString`.
</details>

<details><summary>Pista 2</summary>

`kcat … -L` lista particiones; `kcat … -C -t rutasur.telemetria -p 1 -o -2 -e` lee los últimos mensajes de una partición. Para la infraestructura, el recorrido es el de los otros proyectos (`--hns true`, rol *Storage Blob Data Contributor* para el conector).
</details>

:::solucion RS:Seguridad | Paso 1, infraestructura y exploración
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


```bash
kcat -b rutasur-telemetria.servicebus.windows.net:9093 -X security.protocol=SASL_SSL -X sasl.mechanisms=PLAIN \
  -X 'sasl.username=$ConnectionString' -X 'sasl.password=Endpoint=sb://…' -L
kcat -b rutasur-telemetria.servicebus.windows.net:9093 -X security.protocol=SASL_SSL -X sasl.mechanisms=PLAIN \
  -X 'sasl.username=$ConnectionString' -X 'sasl.password=Endpoint=sb://…' \
  -C -t rutasur.telemetria -p 1 -o -2 -e -f '%p %o %T %k %s\n'
```

:::

## Paso 2 · El plan del TMS

**Qué tienes que lograr.** `tms/plan.jsonl` en el lago: una línea por pedido de los últimos 8 días, con fecha, vehículo, zona y ventana prometida.

**Lo que esconden los datos.** El plan de cada día se publica la tarde anterior y **suma pedidos urgentes** durante el día: si lo bajas a la mañana y no lo vuelves a bajar, te faltan pedidos. Un día sin reparto (domingo) responde distinto.

**Compruébalo tú.** Cuenta pedidos por día: los días hábiles tienen miles; si un día tiene cero, ¿es domingo o un error tuyo?

<details><summary>Pista 1</summary>

Un pedido por línea (JSON Lines) es más fácil de leer desde Databricks que un JSON gigante con rutas anidadas.
</details>

<details><summary>Pista 2</summary>

`GET /v1/rutas?fecha=AAAA-MM-DD` con el header `X-Api-Key`. La respuesta trae `rutas[]` y cada ruta, sus `pedidos[]`: aplánalos agregando la fecha y el vehículo.
</details>

:::solucion RS:SLA | Paso 2, el plan del TMS
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

:::

## Paso 3 · Bronze: la streaming table

**Qué tienes que lograr.** `ruta.bronze.telemetria` con cada mensaje **tal cual** (el JSON como texto), su partición, su offset y cuándo llegó, alimentada con un checkpoint que trae solo lo nuevo en cada refresco.

**Lo que esconden los datos.** El tópico guarda **3 días**: lo que no leas a tiempo se pierde para siempre. Hay una camioneta que estuvo sin señal: sus eventos llegan juntos y tarde, y algunos al día siguiente.

**Compruébalo tú.** Después de dos refrescos seguidos, la cantidad de filas solo crece con mensajes nuevos: el segundo refresco no duplica lo que ya estaba.

<details><summary>Pista 1</summary>

En bronze no se interpreta nada. Si mañana descubres un error en silver, lo recalculas desde bronze; si hubieras interpretado al leer, tendrías que volver a Kafka, y Kafka ya lo borró.
</details>

<details><summary>Pista 2</summary>

`CREATE OR REFRESH STREAMING TABLE … AS SELECT … FROM STREAM read_kafka(…)` con `startingOffsets => 'earliest'` la primera vez, y `REFRESH STREAMING TABLE` después.
</details>

:::solucion RS:Streaming | Paso 3, bronze desde Kafka
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

:::

## Paso 4 · Silver: un formato, un evento por fila

**Qué tienes que lograr.** `ruta.silver.telemetria` con `event_id, vehiculo, tipo, ts_evento, ts_ingesta, lat, lon, velocidad_kmh, pedido_id`: un registro por evento y un solo formato.

**Lo que esconden los datos.**
- Dos firmwares: `fw: "2.0"` trae `speed_mps` (m/s) y `ts` en **milisegundos**; el viejo, `velocidad_kmh` y `ts_dispositivo` en texto. Algunos nombres de campo cambian (`vehicle`, `type`, `order_id`).
- Reintentos: el mismo `event_id` llega más de una vez.

**Compruébalo tú.** `count(*)` igual a `count(DISTINCT event_id)`; ninguna camioneta del firmware nuevo con velocidad siempre 0 (ese es el incidente del ticket de mantenimiento).

<details><summary>Pista 1</summary>

Primero normaliza cada campo con un `CASE` según `fw` (o `coalesce` entre el nombre viejo y el nuevo); después deduplica.
</details>

<details><summary>Pista 2</summary>

Para quedarte con la primera copia de cada evento: `ROW_NUMBER() OVER (PARTITION BY event_id ORDER BY ts_ingesta)` y filtrar `rn = 1`. 1 m/s son 3,6 km/h.
</details>

:::solucion RS:Streaming | Paso 4, silver normalizada
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

:::

## Paso 5 · Gold: cada pedido del plan con su entrega

**Qué tienes que lograr.** `ruta.gold.entregas` con cada pedido del plan, su `estado` (`completada`, `fallida` o `sin_evento`), la hora de entrega y si llegó **a tiempo** (dentro de la ventana prometida). Con ella, `ruta.gold.sla_diario` por fecha y zona.

**Lo que esconden los datos.**
- Una camioneta tiene el **reloj adelantado 2 horas** un día (ticket "V13 entrega en el futuro"): un evento no puede ocurrir después de haber llegado.
- Un pedido **sin ningún evento** también es un resultado, y es el que más le importa a Dirección.
- Las horas de la ventana son **locales** (UTC−3).

**Compruébalo tú.** La cantidad de filas de `entregas` es igual a la cantidad de pedidos del plan (ni uno más, ni uno menos). Responde con SQL el % a tiempo de un día y compáralo con lo que contestaste en Jira.

<details><summary>Pista 1</summary>

¿Qué tabla va a la izquierda del JOIN si quieres que ningún pedido desaparezca?
</details>

<details><summary>Pista 2</summary>

Si `ts_evento` supera a `ts_ingesta` por más de unos minutos, ese reloj está mal: corrige restando el adelanto solo en ese caso. `read_files(…, format => 'json')` lee el plan del lago.
</details>

:::solucion RS:SLA | Paso 5, gold y el SLA
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


```sql norun
-- % a tiempo de un día
SELECT round(100.0 * sum(CASE WHEN a_tiempo THEN 1 ELSE 0 END) / count(*), 1)
FROM ruta.gold.entregas WHERE fecha = '2026-11-18';

-- cuántos eventos de un día llegaron con más de 15 minutos de demora
SELECT count(*) FROM ruta.silver.telemetria
WHERE substr(CAST(from_unixtime(unix_timestamp(ts_evento) - 10800) AS STRING), 1, 10) = '2026-11-18'
  AND unix_timestamp(ts_ingesta) - unix_timestamp(ts_evento) > 900;
```

:::

## Paso 6 · Todos los días

**Qué tienes que lograr.** Un refresco diario: `REFRESH` de bronze (solo lo nuevo), recrear silver y gold, y volver a bajar el plan.

**Lo que esconden los datos.** Los eventos de la camioneta que estuvo sin señal llegan al día siguiente: el SLA de ayer **cambia esta mañana**. Por eso gold se recalcula sobre varios días, no solo sobre ayer.

**Compruébalo tú.** Corre el refresco dos días seguidos y compara el % a tiempo del mismo día en las dos corridas. Si cambió, ¿puedes explicar qué eventos llegaron tarde?

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
