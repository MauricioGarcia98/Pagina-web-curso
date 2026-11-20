---
titulo: Paso a paso - una solución completa, explicada
nivel: Avanzado
duracion: 60
resumen: Una forma de resolver el proyecto de punta a punta, con el código probado y el porqué de cada decisión - el MRR reconstruido desde el log de eventos, la unión con el CRM por id y por dominio, el health score y el reverse ETL que respeta el límite de pedidos. Léela después de intentarlo.
objetivos: Ver cómo se reconstruye el estado de cada mes desde un log de eventos | Unir entidades entre sistemas con un respaldo por dominio | Escribir de vuelta en una herramienta operativa sin pasarse del límite
prerrequisitos: proyecto-cuentas-claras-el-dia-a-dia
autoevaluacion: ¿Sabes por qué el MRR de un mes pasado no sale de /v1/subscriptions? | ¿Sabes qué empresa del CRM se elige cuando hay duplicados? | ¿Sabes qué hace el reverse ETL con un 429?
---

:::cuidado Inténtalo primero
Esta es **una** solución. Si ya resolviste el proyecto, compara: ¿tu reverse ETL sigue funcionando después de que Ventas fusiona los duplicados?
:::

## El plan

| Paso | Qué | Dónde |
|---|---|---|
| 1 | Explorar las tres APIs | Terminal (`curl`) |
| 2 | El CRM: empresas activas y archivadas | Python |
| 3 | Cobrable: el MRR de cada mes desde el log de eventos | Python |
| 4 | Medidor: uso de 30 días | Python |
| 5 | La vista 360 y el health score | Python |
| 6 | El reverse ETL | Python |
| 7 | Las tablas en Databricks y el Key Vault | Azure + Databricks |

## Paso 1 · Explorar

```bash
cuentas accesos
curl -s "https://api.contactocrm.example/crm/v3/objects/companies?limit=2" -H "Authorization: Bearer pat-…"
curl -s "https://api.cobrable.example/v1/events?limit=2" -H "Authorization: Bearer ck_live_…"
curl -s -u mx_…: "https://api.medidor.example/api/2.0/users" | head -c 300
```

Mira un evento de Cobrable completo: trae la suscripción **como quedó** después del cambio. Esa es la clave del MRR histórico.

## Paso 2 · El CRM

Un `get` con reintento para el 429 (100 pedidos cada 10 segundos) y la paginación con `after`. Se piden también las **archivadas**: después de la fusión, los duplicados quedan archivados con `mergedInto`.

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

## Paso 3 · El MRR desde el log de eventos

`/v1/subscriptions` es solo el presente. Para el cierre de cada mes se recorre el log de eventos **en orden** y se guarda, por cliente, el último estado visto hasta esa fecha.

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
eventos = sorted(todo("/v1/events"), key=lambda e: e["created"])

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
```

Los movimientos comparan cada mes con el anterior. `tuvo` recuerda quién tuvo MRR alguna vez, para separar `nuevo` de `reactivacion`:

```python norun
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

## Paso 4 · El uso de 30 días

El export de Medidor acepta **7 días por pedido**: se recorre la ventana en tramos. Los eventos de antes del login tienen un id anónimo que no está en `/users`: no cuentan. Y desde que la app renombró `factura_emitida` a `invoice_created`, hay que contar los dos.

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
    for linea in txt.splitlines():
        e = json.loads(linea); c = cuentaDe.get(e["distinct_id"])
        if not c: continue
        if e["event"] == "login": activos.setdefault(c, set()).add(e["distinct_id"])
        if e["event"] in ("factura_emitida", "invoice_created"): facturas[c] = facturas.get(c, 0) + 1
    d = h + timedelta(days=1)
```

## Paso 5 · La vista 360

Para cada cliente que hoy paga: primero el id que cargó Ventas en `metadata` (si la empresa no está archivada); si no, el **dominio** del email normalizado contra la empresa principal.

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

## Paso 6 · El reverse ETL

Un `PATCH` por empresa con las tres propiedades. Si llega un 429, se espera lo que dice `Retry-After` y se reintenta **ese** pedido.

```python norun
for c, crm, plan, m, a, fc, health in filas360:
    if not crm: continue
    while True:
        r = requests.patch(f"https://api.contactocrm.example/crm/v3/objects/companies/{crm}", headers=hc,
                           json={"properties": {"health_score": str(health), "mrr_actual": f"{m:.2f}", "plan_actual": plan}})
        if r.status_code == 429: time.sleep(int(r.headers.get("retry-after", "10"))); continue
        r.raise_for_status(); break
```

```bash
CRM=pat-… COB=ck_live_… MED=mx_… HOY=$(date +%F) python ~/cc.py
```

:::trabajo Por qué el reverse ETL no se rompe con la fusión
Cuando Ventas fusiona los duplicados, la empresa vieja queda archivada y la API rechaza escribirle. Esta solución nunca elige una archivada: si el id de `metadata` está archivado, cae al dominio, que apunta a la principal. Si tu versión guardaba los ids del CRM "para siempre", ahí está el error.
:::

## Paso 7 · Databricks y Key Vault

```bash
az storage blob upload --account-name stcc -c landing -n gold/mrr_mensual.csv -f ~/mrr_mensual.csv --overwrite
az storage blob upload --account-name stcc -c landing -n gold/cliente_360.csv -f ~/cliente_360.csv --overwrite
az keyvault secret set --vault-name kv-cc -n crm-token --value 'pat-…' -o none
az keyvault secret set --vault-name kv-cc -n cobrable-key --value 'ck_live_…' -o none
az keyvault secret set --vault-name kv-cc -n medidor-secreto --value 'mx_…' -o none
```

(El grupo de recursos, la cuenta de almacenamiento con `--hns true`, el contenedor `landing`, el permiso para el conector de Unity Catalog y el Key Vault se crean igual que en los otros proyectos.)

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
```

Las preguntas del tablero salen de estas tablas. Por ejemplo, el MRR de un mes y el churn de MRR:

```sql norun
SELECT round(sum(mrr), 2) FROM cc.gold.mrr_mensual WHERE mes = '2026-10' AND movimiento <> 'churn';

-- MRR perdido en octubre (el que tenían en septiembre los que hicieron churn) / MRR de septiembre
SELECT round(100 * sum(a.mrr) / (SELECT sum(mrr) FROM cc.gold.mrr_mensual WHERE mes = '2026-09' AND movimiento <> 'churn'), 1)
FROM cc.gold.mrr_mensual a JOIN cc.gold.mrr_mensual b ON a.cliente_id = b.cliente_id
WHERE b.mes = '2026-10' AND b.movimiento = 'churn' AND a.mes = '2026-09';
```

## Ejercicios

:::ejercicio quiz
¿Por qué se reconstruyen 24 meses si la tabla pide solo los últimos 6?
- [ ] Para que sea más lento
- [x] Para saber si un cliente que vuelve a pagar ya había tenido MRR antes (reactivación) o es nuevo
- [ ] Porque Cobrable lo exige
- [ ] No hace falta
:::

:::ejercicio quiz
La app renombra `factura_emitida` a `invoice_created`. Si cuentas solo el nombre viejo, ¿qué pasa con el health score?
- [x] Baja para todos, aunque nadie dejó de usar el producto
- [ ] Sube
- [ ] No cambia
- [ ] Da error
:::

## Resumen

- El historial sale del log de eventos; el presente, de la API de estado.
- Unir por id externo y, si falla, por dominio normalizado contra la entidad principal.
- El reverse ETL respeta el límite de pedidos y nunca escribe en un registro archivado.
