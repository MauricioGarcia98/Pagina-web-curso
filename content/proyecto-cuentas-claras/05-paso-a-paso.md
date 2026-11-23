---
titulo: Construirlo paso a paso - una guía, no una solución
nivel: Avanzado
duracion: 240
resumen: Construyes el proyecto de cero con los datos de Cuentas Claras a volumen de empresa (unos 3.000 clientes, 18 meses de facturación y cerca de medio millón de eventos de uso por mes). Cada paso dice qué tienes que lograr, qué trampas esconden los datos, cómo comprobarlo tú y pistas graduales. El código de referencia de cada paso se desbloquea recién cuando tu entrega pasa la revisión.
objetivos: Explorar tres APIs desconocidas y anotar sus reglas antes de programar | Reconstruir el estado de cada mes desde un log de eventos | Procesar exportaciones grandes por tramos sin cargar todo en memoria | Unir entidades entre sistemas con un respaldo por dominio | Escribir de vuelta en una herramienta operativa en lotes y respetando su límite
prerrequisitos: proyecto-cuentas-claras-el-dia-a-dia
autoevaluacion: ¿Sabes por qué el MRR de un mes pasado no sale de /v1/subscriptions? | ¿Sabes qué empresa del CRM se elige cuando hay duplicados? | ¿Sabes por qué el uso se procesa por tramos? | ¿Sabes por qué el reverse ETL usa el endpoint batch?
---

:::trabajo Cómo se usa esta guía
Nada de esto viene hecho: el repositorio, los scripts, las tablas y el job los creas tú. Cada paso tiene cuatro partes:

1. **Qué tienes que lograr**: el resultado concreto (un archivo, una tabla, un número).
2. **Lo que esconden los datos**: las trampas que un dato real trae y que tu código tiene que resolver.
3. **Compruébalo tú**: cómo saber, antes de pedir revisión, si vas bien.
4. **Pistas**: ábrelas de a una solo si te trabas. La primera es conceptual, la segunda nombra la herramienta y la última te da la estructura.

Al final de cada paso hay una **solución de referencia** bloqueada 🔒. Se abre cuando tu entrega pasa la misma revisión que hace el líder técnico en Jira. Compárala con la tuya como en un code review: no hay una sola forma correcta.
:::

## Antes de empezar: el volumen

Cuentas Claras no es un ejercicio de 20 filas. En la práctica tiene:

| Fuente | Volumen aproximado | Qué implica |
|---|---|---|
| Contacto CRM | ~3.200 empresas (con duplicados y archivadas) | ~32 páginas de 100, con un límite de 100 pedidos cada 10 s |
| Cobrable | ~3.000 clientes y ~9.000 eventos de suscripción en 18 meses | ~90 páginas de eventos; ordenarlos es tu trabajo |
| Medidor | ~12.600 usuarios y ~16.000 eventos de uso **por día** | 30 días ≈ medio millón de líneas: no se cargan de una vez |

Con este volumen, lo que funciona con 20 filas deja de funcionar: un `PATCH` por empresa tarda minutos por el límite de pedidos y guardar medio millón de diccionarios en memoria pone lento al intérprete. Pensar en volumen es parte del trabajo.

Crea el repositorio `cuentas-claras` (en el [GitHub de práctica](#/github)) con esta estructura, y trabaja con una rama por paso:

```text
cuentas-claras/
├── README.md            ← qué resuelve, cómo correrlo, decisiones
├── cc/
│   ├── fuentes.py       ← un cliente HTTP con reintentos para las tres APIs
│   ├── crm.py           ← paso 2
│   ├── mrr.py           ← paso 3
│   ├── uso.py           ← paso 4
│   ├── vista360.py      ← paso 5
│   └── reverse_etl.py   ← paso 6
└── sql/
    └── gold.sql         ← paso 7
```

## Paso 1 · Explorar antes de programar

**Qué tienes que lograr.** Una nota (en el README) con las reglas de cada API: cómo pagina, en qué orden devuelve, qué límite tiene, en qué unidades vienen los montos y las fechas, y qué campos unen un sistema con otro.

**Lo que esconden los datos.** Cada API pagina distinto (`after` en el CRM, `starting_after` en Cobrable, rangos de fecha en Medidor) y cada una se autentica distinto. Las credenciales están en [Fuentes y accesos](#/l/proyecto-cuentas-claras-fuentes-y-accesos) y con `cuentas accesos` en la terminal.

**Compruébalo tú.** Puedes responder sin mirar código: ¿cuántas empresas trae una página del CRM y cómo sabes si hay otra? ¿En qué unidad viene `plan.amount`? ¿Qué distingue un evento de `pagina_vista` de un `login`?

<details><summary>Pista 1</summary>

Pide de a poco: `limit=2` y mira la respuesta completa. Lo importante no está en los primeros campos, sino en cómo te indica la API que hay más páginas.
</details>

<details><summary>Pista 2</summary>

`curl -s … | head -c 600` para no inundar la terminal. Para el CRM agrega `-H "Authorization: Bearer …"`; para Medidor, HTTP Basic con `-u secreto:`. Prueba también `archived=true` en el CRM.
</details>

## Paso 2 · El CRM: qué empresa es la de verdad

**Qué tienes que lograr.** En memoria (o en un archivo intermedio), todas las empresas del CRM, activas y archivadas, y una forma de encontrar la **empresa principal** de un cliente a partir de su dominio.

**Lo que esconden los datos.**
- El límite de 100 pedidos cada 10 segundos devuelve **429** con `Retry-After`: tu cliente HTTP tiene que esperar y reintentar **ese** pedido, no saltearlo.
- Los vendedores escriben el dominio a mano: `www.`, mayúsculas.
- Hay empresas duplicadas: un *lead* creado después, con el nombre en mayúsculas. Cuando Ventas las fusiona, el duplicado queda **archivado** con `mergedInto`.

**Compruébalo tú.** La cantidad de empresas activas más las archivadas tiene que coincidir con lo que viste paginando a mano. Ningún dominio normalizado tendría que apuntar a dos empresas principales distintas.

<details><summary>Pista 1</summary>

Piénsalo en dos partes: un `get` que sabe reintentar, y un bucle de paginación que no sabe nada de reintentos. Separarlas te sirve para las tres APIs.
</details>

<details><summary>Pista 2</summary>

La principal de un dominio es la que tiene `lifecyclestage == "customer"` y no está archivada. Normaliza con `lower()` y quitando `www.`.
</details>

<details><summary>Pista 3</summary>

Estructura: `get(url, headers, params)` con un `while True` que mira `status_code == 429`; `for archivado in ("false", "true")` con un `while` interno que sigue `paging.next.after`; al final, un diccionario `dominio → empresa principal` y otro `id → empresa`.
</details>

:::solucion CC:Cliente 360 | Paso 2, el CRM
```python norun
import requests, json, os, time, base64
from datetime import date, datetime, timedelta, timezone
CRM, COB, MED = os.environ["CRM"], os.environ["COB"], os.environ["MED"]
HOY = date.fromisoformat(os.environ["HOY"]); TZ = timezone(timedelta(hours=-3))

def get(url, headers, params=None):
    while True:
        r = requests.get(url, headers=headers, params=params)
        if r.status_code == 429:
            time.sleep(int(r.headers.get("retry-after", "10"))); continue
        r.raise_for_status(); return r

hc = {"Authorization": "Bearer " + CRM}
empresas = []
for arch in ("false", "true"):
    after = None
    while True:
        p = {"limit": 100, "archived": arch, "properties": "name,domain,hubspot_owner_id,lifecyclestage,createdate"}
        if after: p["after"] = after
        d = get("https://api.contactocrm.example/crm/v3/objects/companies", hc, p).json()
        empresas += d["results"]
        if "paging" not in d: break
        after = d["paging"]["next"]["after"]

norm = lambda dom: (dom or "").lower().replace("www.", "")
principal = {}   # dominio → la empresa principal (la que es customer y no está archivada)
for e in empresas:
    if e["archived"] or e["properties"]["lifecyclestage"] != "customer": continue
    principal[norm(e["properties"]["domain"])] = e
porId = {e["id"]: e for e in empresas}
```
:::

## Paso 3 · El MRR de cada mes, desde el log de eventos

**Qué tienes que lograr.** `mrr_mensual.csv` con `cliente_id, mes, mrr, movimiento` para los **últimos 6 meses cerrados**. Movimientos: `nuevo`, `expansion`, `contraccion`, `churn`, `reactivacion`, `sin_cambio`.

**Lo que esconden los datos.**
- `/v1/subscriptions` es solo **el presente**: el MRR de un mes pasado sale de recorrer `/v1/events` en orden.
- Cobrable devuelve del **más nuevo al más viejo**.
- El monto viene en **centavos**; el plan anual cobra 10 meses y se reparte en 12; hay asientos y descuentos.
- `created` está en **segundos** y a veces dos eventos del mismo cliente caen en el mismo segundo (un cambio de plan y el fin de un cupón, por ejemplo). El único desempate es el orden en que los devuelve la API.
- Pruebas gratis y bajas no suman MRR. Morosos (`past_due`) sí.
- El cierre de mes es en **hora local** (UTC−3), no en UTC.
- Para separar `nuevo` de `reactivacion` tienes que mirar más atrás que 6 meses.

**Compruébalo tú.** El MRR que calculas para el mes en curso, hasta hoy, tiene que coincidir con la suma de `/v1/subscriptions` aplicando tu misma fórmula. Si no coincide, el error está en la fórmula, no en el recorrido.

<details><summary>Pista 1</summary>

Cada evento trae la suscripción **completa como quedó**. Si recorres los eventos en orden de fecha y guardas el último estado de cada cliente, en cualquier momento tienes "la foto" de todas las suscripciones.
</details>

<details><summary>Pista 2</summary>

Ordena por `created` (segundos). Para cada cierre de mes, avanza el puntero de eventos hasta ese instante y calcula el MRR de la foto. `datetime(año, mes+1, 1, tzinfo=TZ).timestamp()` es el primer instante del mes siguiente en hora local.
</details>

<details><summary>Pista 3</summary>

Un único recorrido: `for mes in 24_meses: while i < len(eventos) and eventos[i].created <= cierre(mes): estado[cliente] = suscripción; i += 1` y guardas `hist[mes] = {cliente: mrr(sub)}`. Después comparas cada mes con el anterior; un diccionario `alguna_vez_pagó` decide entre nuevo y reactivación.
</details>

:::solucion CC:MRR | Paso 3, el MRR
```python norun
hb = {"Authorization": "Bearer " + COB}
def todo(ruta):   # Cobrable lista del más nuevo al más viejo, con starting_after
    out, sa = [], None
    while True:
        p = {"limit": 100}
        if sa: p["starting_after"] = sa
        d = get("https://api.cobrable.example" + ruta, hb, p).json()
        out += d["data"]
        if not d["has_more"]: return out
        sa = d["data"][-1]["id"]

clientes = todo("/v1/customers")
# la API lista del más nuevo al más viejo y "created" está en segundos: al revés queda en orden, también cuando
# dos eventos del mismo cliente caen en el mismo segundo (sorted() es estable y respeta ese orden)
eventos = sorted(todo("/v1/events")[::-1], key=lambda e: e["created"])

def mrr(o):
    if o["status"] not in ("active", "past_due"): return 0.0      # pruebas y bajas no suman
    precio = o["plan"]["amount"] / 100                             # viene en centavos
    mensual = precio / 12 if o["plan"]["interval"] == "year" else precio
    pct = (o.get("discount") or {}).get("coupon", {}).get("percent_off", 0) or 0
    return round(mensual * o["quantity"] * (1 - pct / 100), 2)

def cierre(mes):   # el último instante del mes, en hora de Ciudad del Río
    y, m = map(int, mes.split("-")); y2, m2 = (y + (m // 12), m % 12 + 1)
    return datetime(y2, m2, 1, tzinfo=TZ).timestamp() - 0.001

def meses_atras(n):
    out = []
    for k in range(n, 0, -1):
        mm, yy = HOY.month - k, HOY.year
        while mm <= 0: mm += 12; yy -= 1
        out.append(f"{yy}-{mm:02d}")
    return out

todos = meses_atras(24)        # 24 meses para saber si una "alta" es nueva o reactivación
estado, i, hist = {}, 0, {}
for mes in todos:
    c = cierre(mes)
    while i < len(eventos) and eventos[i]["created"] <= c:
        e = eventos[i]; estado[e["data"]["object"]["customer"]] = e["data"]["object"]; i += 1
    hist[mes] = {k: mrr(v) for k, v in estado.items()}

filas, tuvo = [], {}
for k, mes in enumerate(todos):
    prev, act = (hist[todos[k - 1]] if k else {}), hist[mes]
    for c in set(prev) | set(act):
        a, b = prev.get(c, 0), act.get(c, 0)
        if a == 0 and b > 0: mov = "reactivacion" if tuvo.get(c) else "nuevo"
        elif a > 0 and b == 0: mov = "churn"
        elif b > a: mov = "expansion"
        elif b < a: mov = "contraccion"
        else: mov = "sin_cambio" if b > 0 else None
        if mov and k >= len(todos) - 6: filas.append((c, mes, b, mov))   # solo los últimos 6 cerrados
        if b > 0: tuvo[c] = True

with open("mrr_mensual.csv", "w") as f:
    f.write("cliente_id,mes,mrr,movimiento\n")
    for r in filas: f.write(f"{r[0]},{r[1]},{r[2]:.2f},{r[3]}\n")
```
:::

## Paso 4 · El uso de los últimos 30 días, por tramos

**Qué tienes que lograr.** Por cliente que paga: cuántos **usuarios distintos** hicieron login y cuántas **facturas** emitieron en los últimos 30 días completos.

**Lo que esconden los datos.**
- El export acepta **7 días por pedido** y solo días completos (hasta ayer).
- Son cerca de **medio millón de líneas**: si las guardas todas antes de procesarlas, el intérprete se arrastra. Procesa cada tramo y quédate solo con los conteos.
- Antes del login, los eventos tienen un id **anónimo** que no está en `/users`.
- La app móvil renombró `factura_emitida` a `invoice_created` (mira el ticket CC-106 en Jira).

**Compruébalo tú.** Cuenta facturas por día y míralas en orden: si un día se desploman, ¿es que la gente dejó de facturar o que cambió el nombre del evento?

<details><summary>Pista 1</summary>

La memoria que necesitas no depende de cuántos eventos hay, sino de cuántos clientes: un conjunto de usuarios activos y un contador de facturas por cliente.
</details>

<details><summary>Pista 2</summary>

Recorre la ventana con un `while d <= fin` que avanza de a 7 días; de cada respuesta lee línea por línea (`text.splitlines()` y `json.loads`) y descarta la línea apenas la contaste. `/users` te da `user_id → billing_customer_id`.
</details>

<details><summary>Pista 3</summary>

Dos diccionarios: `activos[cliente] = set(usuarios con login)` y `facturas[cliente] += 1` para los dos nombres del evento. Las líneas cuyo `distinct_id` no está en el maestro de usuarios se ignoran.
</details>

:::solucion CC:Cliente 360 | Paso 4, el uso por tramos
```python norun
basic = {"Authorization": "Basic " + base64.b64encode((MED + ":").encode()).decode()}
usuarios = get("https://api.medidor.example/api/2.0/users", basic).json()["results"]
cuentaDe = {u["user_id"]: u["billing_customer_id"] for u in usuarios}
totalU = {}
for u in usuarios: totalU[u["billing_customer_id"]] = totalU.get(u["billing_customer_id"], 0) + 1

activos, facturas = {}, {}
fin = HOY - timedelta(days=1); ini = fin - timedelta(days=29); d = ini
while d <= fin:
    h = min(d + timedelta(days=6), fin)
    txt = get("https://api.medidor.example/api/2.0/export", basic, {"from_date": d.isoformat(), "to_date": h.isoformat()}).text
    for linea in txt.splitlines():           # cada tramo se procesa y se descarta: solo quedan los conteos
        e = json.loads(linea); c = cuentaDe.get(e["distinct_id"])
        if not c: continue
        if e["event"] == "login": activos.setdefault(c, set()).add(e["distinct_id"])
        if e["event"] in ("factura_emitida", "invoice_created"): facturas[c] = facturas.get(c, 0) + 1
    del txt
    d = h + timedelta(days=1)
```
:::

## Paso 5 · La vista 360 y el health score

**Qué tienes que lograr.** `cliente_360.csv` con `billing_customer_id, crm_company_id, plan, mrr_actual, usuarios_activos_30d, facturas_30d, health_score`, una fila por cliente que **hoy paga**. La fórmula del health score está en [Fuentes y accesos](#/l/proyecto-cuentas-claras-fuentes-y-accesos).

**Lo que esconden los datos.**
- `metadata.crm_company_id` lo cargó Ventas **a veces**, y a veces apunta al duplicado que después archivaron.
- Sin id, el respaldo es el **dominio** del email del cliente contra la empresa principal.

**Compruébalo tú.** Ningún `crm_company_id` de tu tabla tiene que ser una empresa archivada. La cantidad de filas tiene que ser la cantidad de clientes con MRR mayor que cero hoy.

<details><summary>Pista 1</summary>

El orden de preferencia importa: primero el id que cargó Ventas, solo si existe y no está archivado; si no, el dominio.
</details>

<details><summary>Pista 2</summary>

El estado actual de cada suscripción es el último evento de cada cliente (ya lo tienes del paso 3). Los usuarios totales por cliente salen de `/users`.
</details>

:::solucion CC:Cliente 360 | Paso 5, la vista 360
```python norun
actual = {e["data"]["object"]["customer"]: e["data"]["object"] for e in eventos}
cli = {c["id"]: c for c in clientes}
filas360 = []
for c, o in actual.items():
    m = mrr(o)
    if m <= 0: continue
    meta = cli[c].get("metadata", {}).get("crm_company_id")
    crm = meta if meta and meta in porId and not porId[meta]["archived"] else None
    if not crm:
        e = principal.get(norm(cli[c]["email"].split("@")[1])); crm = e["id"] if e else ""
    a, fc, u = len(activos.get(c, set())), facturas.get(c, 0), totalU.get(c, 1)
    health = round(50 * a / u + 50 * min(1, fc / 60))
    filas360.append((c, crm, o["plan"]["id"].split("_")[0], m, a, fc, health))

with open("cliente_360.csv", "w") as f:
    f.write("billing_customer_id,crm_company_id,plan,mrr_actual,usuarios_activos_30d,facturas_30d,health_score\n")
    for r in filas360: f.write(",".join(str(x) for x in r) + "\n")
```
:::

## Paso 6 · El reverse ETL, en lotes

**Qué tienes que lograr.** `health_score`, `mrr_actual` y `plan_actual` escritos en la empresa del CRM de cada cliente que paga (ticket CC-108).

**Lo que esconden los datos.**
- Son unas 1.200 empresas. Con un `PATCH` por empresa y 100 pedidos cada 10 segundos, son **minutos** esperando. El CRM tiene `POST /crm/v3/objects/companies/batch/update`: hasta **100 empresas por pedido**, y cuenta como un solo pedido para el límite.
- La respuesta puede ser **207**: algunas se escribieron y otras no (por ejemplo, una archivada). Un 207 no es un éxito completo: hay que leer `errors`.
- Cuando Ventas fusiona duplicados (CC-107), una empresa a la que escribías queda archivada. Si tu proceso guardaba ids "para siempre", ahí se rompe.

**Compruébalo tú.** Después de correrlo, pide al CRM algunas empresas al azar y mira las tres propiedades. Corre el proceso dos veces: el resultado tiene que ser el mismo (idempotente).

<details><summary>Pista 1</summary>

Agrupa las filas de la vista 360 de a 100 y manda un lote por pedido. El 429 se maneja igual que en el paso 2.
</details>

<details><summary>Pista 2</summary>

El cuerpo es `{"inputs": [{"id": "…", "properties": {"health_score": "72", …}}]}`. Ante un 207, junta `errors[].context.ids` para revisarlos: no reintentes a ciegas lo que la API rechazó por un motivo de negocio.
</details>

:::solucion CC:Reverse ETL | Paso 6, el reverse ETL en lotes
```python norun
lote, rechazados = [], []
def enviar(inputs):
    while True:
        r = requests.post("https://api.contactocrm.example/crm/v3/objects/companies/batch/update", headers=hc, json={"inputs": inputs})
        if r.status_code == 429: time.sleep(int(r.headers.get("retry-after", "10"))); continue
        if r.status_code == 207: rechazados.extend(e["context"]["ids"][0] for e in r.json()["errors"])
        elif r.status_code != 200: r.raise_for_status()
        return

for c, crm, plan, m, a, fc, health in filas360:
    if not crm: continue
    lote.append({"id": crm, "properties": {"health_score": str(health), "mrr_actual": f"{m:.2f}", "plan_actual": plan}})
    if len(lote) == 100: enviar(lote); lote = []
if lote: enviar(lote)
print(f"Rechazadas por el CRM: {len(rechazados)}", rechazados[:5])
```
:::

## Paso 7 · Las tablas gold, el job y el Key Vault

**Qué tienes que lograr.** `cc.gold.mrr_mensual` y `cc.gold.cliente_360` en Databricks (Unity Catalog), las tres credenciales en un Key Vault (CC-103) y el proceso corriendo como job diario.

**Lo que esconden los datos.** `read_files` sobre CSV con `inferSchema => false` deja todo como texto: los tipos se ponen a mano. Las credenciales nunca van en el código ni en el repositorio.

**Compruébalo tú.** Responde con SQL las preguntas del tablero (el MRR del mes pasado, el % perdido por bajas) y compara con lo que contestaste en Jira.

<details><summary>Pista 1</summary>

El recorrido es el de los otros proyectos: cuenta con `--hns true`, contenedor `landing`, permiso para el conector de Unity Catalog, `CREATE CATALOG cc`.
</details>

:::solucion CC:Seguridad+MRR+Cliente 360 | Paso 7, Databricks y Key Vault
```bash
az storage blob upload --account-name stcc -c landing -n gold/mrr_mensual.csv -f ~/mrr_mensual.csv --overwrite
az storage blob upload --account-name stcc -c landing -n gold/cliente_360.csv -f ~/cliente_360.csv --overwrite
az keyvault secret set --vault-name kv-cc -n crm-token --value 'pat-…' -o none
az keyvault secret set --vault-name kv-cc -n cobrable-key --value 'ck_live_…' -o none
az keyvault secret set --vault-name kv-cc -n medidor-secreto --value 'mx_…' -o none
```

```sql norun
CREATE CATALOG IF NOT EXISTS cc; CREATE SCHEMA IF NOT EXISTS cc.gold;

CREATE OR REPLACE TABLE cc.gold.mrr_mensual AS
SELECT cliente_id, mes, CAST(mrr AS DOUBLE) AS mrr, movimiento
FROM read_files('abfss://landing@stcc.dfs.core.windows.net/gold/mrr_mensual.csv', format => 'csv', header => true, inferSchema => false);

CREATE OR REPLACE TABLE cc.gold.cliente_360 AS
SELECT billing_customer_id, crm_company_id, plan, CAST(mrr_actual AS DOUBLE) AS mrr_actual,
       CAST(usuarios_activos_30d AS INT) AS usuarios_activos_30d, CAST(facturas_30d AS INT) AS facturas_30d,
       CAST(health_score AS INT) AS health_score
FROM read_files('abfss://landing@stcc.dfs.core.windows.net/gold/cliente_360.csv', format => 'csv', header => true, inferSchema => false);

-- MRR perdido por churn en el último mes / MRR del mes anterior
SELECT round(100 * sum(a.mrr) / (SELECT sum(mrr) FROM cc.gold.mrr_mensual WHERE mes = '2026-09' AND movimiento <> 'churn'), 1)
FROM cc.gold.mrr_mensual a JOIN cc.gold.mrr_mensual b ON a.cliente_id = b.cliente_id
WHERE b.mes = '2026-10' AND b.movimiento = 'churn' AND a.mes = '2026-09';
```
:::

:::real En tu computadora y en la web real
En tu nube, el código Python que llama a las APIs corre como tarea de un **job de Databricks** (o en Airflow), los tokens se leen del **Key Vault** a través de un *secret scope* y el MRR y la vista 360 son tablas gold en Unity Catalog. Con millones de eventos de uso, el paso 4 se resuelve con una exportación diaria a archivos en el lago y Spark, no con un script que lee la API.
:::

:::capturas Capturas para tu portafolio
Guárdalas en `docs/capturas/` del repositorio del proyecto y úsalas en el README.

- `05-explorar.png`: la exploración inicial de una API en la terminal.
- `05-mrr.png`: el MRR calculado desde el log de eventos.
- `05-job.png`: el job diario en verde.

Antes de publicar, tapa con un rectángulo los correos, los IDs de suscripción y de tenant, los nombres de cuentas reales y cualquier clave o token.
:::

## Ejercicios

:::ejercicio quiz
¿Por qué se reconstruyen 24 meses si la tabla pide solo los últimos 6?
- [ ] Para que sea más lento
- [x] Para saber si un cliente que vuelve a pagar ya había tenido MRR antes (reactivación) o es nuevo
- [ ] Porque Cobrable lo exige
- [ ] No hace falta
:::

:::ejercicio quiz
El export de Medidor de 30 días tiene medio millón de líneas. ¿Qué conviene?
- [ ] Guardar todas las líneas en una lista y procesarlas al final
- [x] Procesar cada tramo de 7 días apenas llega y quedarse solo con los conteos por cliente
- [ ] Pedir un solo export de 30 días
- [ ] Bajar el límite a 100 líneas
:::

:::ejercicio quiz
El `batch/update` del CRM respondió **207**. ¿Qué significa?
- [ ] Que todo se escribió bien
- [ ] Que hay que reintentar el lote entero
- [x] Que una parte se escribió y otra no: hay que leer `errors` y revisar esos ids
- [ ] Que se superó el límite de pedidos
:::

## Resumen

- Primero se explora y se anotan las reglas de cada fuente; recién después se programa.
- El historial sale del log de eventos; el presente, de la API de estado.
- A volumen de empresa se procesa por tramos y se escribe en lotes, leyendo los errores parciales.
- Unir por id externo y, si falla, por dominio normalizado contra la entidad principal.
