---
titulo: Construirlo paso a paso - una guía, no una solución
nivel: Avanzado
duracion: 240
resumen: Construyes el proyecto de cero con los datos de Almacenes del Sol a volumen de empresa (30 sucursales, unos 700 productos y cerca de 8.000 tickets y 24.000 líneas por día). Cada paso dice qué lograr, qué esconden los datos, cómo comprobarlo y pistas graduales; la solución de referencia de cada paso se desbloquea cuando tu entrega pasa la revisión.
objetivos: Construir historia (SCD tipo 2) desde una fuente que solo muestra el presente | Bajar una API paginada por partes, sin cortar todo ante un faltante | Limpiar una planilla hecha a mano que cambia de formato | Unir ventas con la versión del producto vigente ese día | Automatizar todo con un DAG diario
prerrequisitos: proyecto-almacenes-sol-el-dia-a-dia
autoevaluacion: ¿Sabes por qué hace falta una foto diaria del ERP? | ¿Sabes qué hace LAG en la dimensión? | ¿Sabes por qué la unión con la dimensión usa un rango de fechas? | ¿Sabes qué hacer con un día que una sucursal no mandó?
---

:::trabajo Cómo se usa esta guía
Nada viene hecho: la foto diaria, la descarga de tickets, la limpieza de la planilla, las tablas y el DAG los creas tú. Cada paso tiene **qué tienes que lograr**, **lo que esconden los datos**, **compruébalo tú** y **pistas** (ábrelas de a una). Al final de cada paso hay una **solución de referencia** bloqueada 🔒 que se abre cuando tu entrega pasa la misma revisión que hace el líder técnico en Jira.
:::

## Antes de empezar: el volumen

| Fuente | Volumen aproximado | Qué implica |
|---|---|---|
| ERP (PostgreSQL) | ~700 productos en 10 categorías, con cambios de precio y costo todas las noches | La historia solo existe si la guardas tú, foto por foto |
| API de las cajas | 30 sucursales × ~250 tickets por día, páginas de 200: ~8.000 tickets y ~24.000 líneas por día | Dos semanas son ~330.000 líneas: se bajan por día y sucursal, y cada día queda en su archivo |
| Planilla de metas | Una fila por sucursal y semana, mantenida a mano | Cambia de formato a mitad del proyecto |

Crea el repositorio `almacenes-sol` con `README.md`, `ingesta/` (la foto y la descarga de tickets), `sql/` y `dags/`, y trabaja con una rama por paso.

## Paso 1 · El ERP y la foto diaria

**Qué tienes que lograr.** Un archivo por día con la tabla de productos **completa** (sku, nombre, categoría, precio, costo) y la fecha en el nombre, por ejemplo `erp/productos_2026-11-16.csv`.

**Lo que esconden los datos.**
- El proceso de las 03:00 **pisa** precios, costos y categorías sin guardar historia.
- `ult_modif` parece un atajo para traer solo lo que cambió, pero la reorganización de categorías se cargó a mano y no la actualizó.

**Compruébalo tú.** Saca dos fotos en dos días distintos y compáralas: ¿cuántos productos cambiaron de precio? ¿Y de categoría el día de la reorganización?

<details><summary>Pista 1</summary>

Piénsalo como un álbum de fotos: el ERP es la vista por la ventana (solo el presente). Si quieres saber cómo estaba la semana pasada, tuviste que sacarle una foto la semana pasada.
</details>

<details><summary>Pista 2</summary>

`sol accesos` te da la cadena de conexión. `psql … -c "\dt"` lista las tablas y `\copy (SELECT …) TO '…csv' WITH CSV HEADER` guarda el resultado de una consulta en un archivo.
</details>

:::solucion AS:SCD2 | Paso 1, el ERP y la foto diaria
```bash
sol accesos
mkdir -p ~/sol/erp ~/sol/pos ~/sol/metas
psql "postgresql://consulta_bi:CLAVE@erp-sol.almacenes.example:5432/erp" -c "\dt"
psql "postgresql://consulta_bi:CLAVE@erp-sol.almacenes.example:5432/erp" -c "SELECT sku, nombre, categoria, precio, costo, ult_modif FROM productos ORDER BY sku LIMIT 5"
```


```bash
HOY=$(date +%F)
psql "postgresql://consulta_bi:CLAVE@erp-sol.almacenes.example:5432/erp" \
  -c "\copy (SELECT sku, nombre, categoria, precio, costo FROM productos ORDER BY sku) TO '~/sol/erp/productos_$HOY.csv' WITH CSV HEADER"
```

:::

## Paso 2 · Los tickets de las cajas

**Qué tienes que lograr.** Las líneas de todos los tickets desde el lunes de la semana pasada hasta ayer, **un archivo por día** (`pos/lineas_AAAA-MM-DD.csv`).

**Lo que esconden los datos.**
- La API pagina de a 200 por sucursal y día: son decenas de pedidos por día.
- Responde **404** si el cierre de caja de una sucursal todavía no llegó. Villa Sol se queda sin conexión y manda un día **dos días después**, con algunos tickets repetidos.
- Hay tickets anulados.

**Compruébalo tú.** Cuenta tickets por sucursal y día: las grandes tienen el doble que las chicas. ¿Hay algún día de alguna sucursal en cero? Anótalo: no es un error tuyo, es un faltante a reintentar.

<details><summary>Pista 1</summary>

Un 404 por un cierre que todavía no llegó no es una razón para cortar toda la descarga: anótalo en una lista de faltantes y sigue con el resto.
</details>

<details><summary>Pista 2</summary>

`GET /v1/tickets?sucursal=S01&fecha=…&pagina=1` con `X-Api-Key`; la respuesta trae `paginas`. Escribe cada línea del ticket como una fila del CSV (con el ticket, la sucursal y la fecha repetidos en cada línea).
</details>

:::solucion AS:Ventas | Paso 2, los tickets
```python norun
import requests, os, csv
from datetime import date, timedelta
KEY = os.environ["POS"]; DESDE = date.fromisoformat(os.environ["DESDE"]); HOY = date.fromisoformat(os.environ["HOY"])
h = {"X-Api-Key": KEY}
sucs = [s["codigo"] for s in requests.get("https://api.possol.example/v1/sucursales", headers=h).json()["sucursales"]]
faltan = []
d = DESDE
while d < HOY:
    with open(os.path.expanduser(f"~/sol/pos/lineas_{d}.csv"), "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["ticket_id", "sucursal", "fecha", "fecha_hora", "medio_pago", "anulado", "sku", "cantidad", "precio_unitario", "descuento"])
        for s in sucs:
            pag = 1
            while True:
                r = requests.get("https://api.possol.example/v1/tickets", headers=h, params={"sucursal": s, "fecha": d.isoformat(), "pagina": pag})
                if r.status_code == 404: faltan.append(f"{s} {d}"); break     # todavía no sincronizó
                r.raise_for_status(); j = r.json()
                for t in j["tickets"]:
                    for l in t["lineas"]:
                        w.writerow([t["ticket_id"], s, d.isoformat(), t["fecha_hora"], t["medio_pago"], t["anulado"], l["sku"], l["cantidad"], l["precio_unitario"], l["descuento"]])
                if pag >= j["paginas"]: break
                pag += 1
    d += timedelta(days=1)
print("sin cierre todavía:", faltan)
```

```bash
POS=pos_… DESDE=2026-11-09 HOY=$(date +%F) python ~/sol.py
```

:::

## Paso 3 · La planilla de metas

**Qué tienes que lograr.** Las metas semanales por sucursal en un formato que se pueda unir con las ventas.

**Lo que esconden los datos.** Antes de la reorganización la planilla tiene títulos, `;`, montos con `$` y puntos, porcentajes como texto y una fila de **total**. Después pasa a formato largo con `codigo_sucursal`. El nombre de Centro **cambió**.

**Compruébalo tú.** Ninguna sucursal aparece dos veces en la misma semana y no hay ninguna fila llamada TOTAL.

<details><summary>Pista 1</summary>

Une siempre por **código**, nunca por nombre: los nombres los escriben personas y cambian.
</details>

:::solucion AS:Ventas | Paso 3, la planilla
```bash
sol metas descargar -o ~/sol/metas/metas.csv
head -5 ~/sol/metas/metas.csv
```

:::

## Paso 4 · Al lago

**Qué tienes que lograr.** Todo lo anterior en la cuenta de almacenamiento del proyecto, con la estructura `sol/erp`, `sol/pos` y `sol/metas`, y el conector de Unity Catalog con permiso.

**Compruébalo tú.** `az storage blob list` muestra un archivo de productos por cada foto y uno de líneas por cada día.

:::solucion AS:Ventas | Paso 4, al lago
```bash
az login
az group create -n rg-sol -l eastus2
az storage account create -n stsol -g rg-sol -l eastus2 --sku Standard_LRS --hns true
az storage container create --account-name stsol -n landing
ID=$(az storage account show -n stsol -g rg-sol --query id -o tsv)
az role assignment create --assignee unity-catalog-access-connector --role "Storage Blob Data Contributor" --scope $ID
az storage blob upload-batch --account-name stsol -d landing/sol -s ~/sol
```

:::

## Paso 5 · La dimensión SCD2, las ventas y las metas

**Qué tienes que lograr.**
- `sol.silver.dim_producto` con una fila por **versión** de cada producto (`valido_desde`, `valido_hasta`, `vigente`).
- `sol.gold.ventas_diarias` con tickets, ventas netas y margen bruto por sucursal y día.
- `sol.gold.cumplimiento_semanal` con las metas.

**Lo que esconden los datos.**
- Una versión nueva empieza cuando cambia precio, costo **o categoría** (Compras divide "Almacén" en "Almacén seco" y "Frescos").
- El margen tiene que usar el costo **del día de la venta**, no el de hoy.
- Los tickets reenviados de Villa Sol son copias exactas; los anulados no son venta.

**Compruébalo tú.** Elige un producto que cambió de precio: tiene que tener dos filas en la dimensión, la vieja cerrada y la nueva vigente. El margen de un día pasado no cambia cuando cambia un costo hoy.

<details><summary>Pista 1</summary>

Para saber si una foto trae un cambio, compara cada foto con **la anterior del mismo producto**. Para cerrar una versión, mira cuándo empieza **la siguiente**.
</details>

<details><summary>Pista 2</summary>

`LAG(...) OVER (PARTITION BY sku ORDER BY fecha)` y `LEAD(...)`. La fecha de cada foto sale del nombre del archivo (`_metadata.file_name`). La unión con la dimensión es por rango: `fecha >= valido_desde AND (valido_hasta IS NULL OR fecha < valido_hasta)`.
</details>

:::solucion AS:SCD2 | Paso 5a, la dimensión SCD2
```sql norun
CREATE EXTERNAL LOCATION lago_sol URL 'abfss://landing@stsol.dfs.core.windows.net/' WITH (STORAGE CREDENTIAL credencial_lago);
CREATE CATALOG IF NOT EXISTS sol; CREATE SCHEMA IF NOT EXISTS sol.silver; CREATE SCHEMA IF NOT EXISTS sol.gold;

CREATE OR REPLACE TEMP VIEW fotos AS
SELECT sku, nombre, categoria, CAST(precio AS DOUBLE) AS precio, CAST(costo AS DOUBLE) AS costo,
       substr(_metadata.file_name, 11, 10) AS fecha
FROM read_files('abfss://landing@stsol.dfs.core.windows.net/sol/erp/', format => 'csv', header => true, inferSchema => false);
```


```sql norun
CREATE OR REPLACE TEMP VIEW versiones AS
SELECT * FROM (
  SELECT *, concat_ws('|', categoria, CAST(precio AS STRING), CAST(costo AS STRING)) AS v,
         LAG(concat_ws('|', categoria, CAST(precio AS STRING), CAST(costo AS STRING))) OVER (PARTITION BY sku ORDER BY fecha) AS ant
  FROM fotos) x
WHERE ant IS NULL OR ant <> v;

CREATE OR REPLACE TABLE sol.silver.dim_producto AS
SELECT sku, nombre, categoria, precio, costo,
       CAST(fecha AS DATE) AS valido_desde,
       CAST(LEAD(fecha) OVER (PARTITION BY sku ORDER BY fecha) AS DATE) AS valido_hasta,
       LEAD(fecha) OVER (PARTITION BY sku ORDER BY fecha) IS NULL AS vigente
FROM versiones;
```

:::

:::solucion AS:Ventas | Paso 5b, las ventas y las metas
```sql norun
CREATE OR REPLACE TEMP VIEW lineas AS
SELECT DISTINCT * FROM read_files('abfss://landing@stsol.dfs.core.windows.net/sol/pos/', format => 'csv', header => true, inferSchema => false);

CREATE OR REPLACE TEMP VIEW lineas_ok AS
SELECT ticket_id, sucursal, fecha, medio_pago, sku,
       CAST(cantidad AS INT) * CAST(precio_unitario AS DOUBLE) - CAST(descuento AS DOUBLE) AS neta,
       CAST(cantidad AS INT) AS cantidad
FROM lineas WHERE anulado = 'False';
```


```sql norun
CREATE OR REPLACE TABLE sol.gold.ventas_diarias AS
SELECT CAST(l.fecha AS DATE) AS fecha, l.sucursal,
       count(DISTINCT l.ticket_id) AS tickets,
       round(sum(l.neta), 2) AS ventas_netas,
       round(sum(l.neta - l.cantidad * d.costo), 2) AS margen_bruto
FROM lineas_ok l
JOIN sol.silver.dim_producto d
  ON d.sku = l.sku AND CAST(l.fecha AS DATE) >= d.valido_desde
 AND (d.valido_hasta IS NULL OR CAST(l.fecha AS DATE) < d.valido_hasta)
WHERE l.fecha >= '2026-11-16'   -- el día de tu primera foto
GROUP BY l.fecha, l.sucursal;
```


```sql norun
CREATE OR REPLACE TEMP VIEW metas AS
SELECT codigo_sucursal AS sucursal, semana_desde, CAST(meta_ventas AS DOUBLE) AS meta
FROM read_files('abfss://landing@stsol.dfs.core.windows.net/sol/metas/metas.csv', format => 'csv', header => true, inferSchema => false);

CREATE OR REPLACE TABLE sol.gold.cumplimiento_semanal AS
SELECT m.semana_desde, m.sucursal, round(sum(l.neta), 2) AS ventas, m.meta,
       round(sum(l.neta) / m.meta * 100, 1) AS cumplimiento_pct
FROM lineas_ok l
JOIN metas m ON m.sucursal = l.sucursal AND l.fecha >= m.semana_desde
            AND l.fecha < CAST(date_add(CAST(m.semana_desde AS DATE), 7) AS STRING)
GROUP BY m.semana_desde, m.sucursal, m.meta;
```


```sql norun
SELECT round(sum(l.neta - l.cantidad * d.costo) / sum(l.neta) * 100, 1)
FROM lineas_ok l
JOIN sol.silver.dim_producto d ON d.sku = l.sku AND CAST(l.fecha AS DATE) >= d.valido_desde
 AND (d.valido_hasta IS NULL OR CAST(l.fecha AS DATE) < d.valido_hasta)
WHERE l.fecha = '2026-11-18' AND d.categoria = 'BEB';
```

:::

## Paso 6 · Key Vault y el DAG diario

**Qué tienes que lograr.** La clave del ERP y la de las cajas en un Key Vault, y un DAG que todos los días saque la foto, baje los tickets y recalcule gold.

**Lo que esconden los datos.** El horario importa: después del proceso de precios (03:00) y del cierre de cajas (02:00), y antes de que abran las sucursales (08:00).

**Compruébalo tú.** Deja correr el DAG dos días: tiene que haber una foto nueva por día y la dimensión tiene que crecer solo con los productos que cambiaron.

:::solucion AS:Seguridad | Paso 6, Key Vault y el DAG
```bash
az keyvault create -n kv-sol -g rg-sol -l eastus2
az keyvault secret set --vault-name kv-sol -n erp-clave --value 'Sol…' -o none
az keyvault secret set --vault-name kv-sol -n pos-key --value 'pos_…' -o none
```


```python norun
from datetime import datetime
from airflow.sdk import DAG
from airflow.providers.databricks.operators.databricks import DatabricksRunNowOperator

with DAG("sol_diario", start_date=datetime(2026, 11, 1), schedule="30 5 * * *", catchup=False, tags=["sol"]):
    DatabricksRunNowOperator(task_id="foto_y_gold", job_name="sol_diario")
```

:::

:::real En tu computadora y en la web real
En tu nube: la foto diaria del ERP se baja con una tarea programada; los tickets de las cajas y la planilla van al lago (**Azure Storage**); **Databricks** arma la dimensión SCD2 y las tablas gold; un **DAG de Airflow** coordina todo y lee los secretos del **Key Vault**.
:::

:::capturas Capturas para tu portafolio
Guárdalas en `docs/capturas/` del repositorio del proyecto y úsalas en el README.

- `05-dag.png`: el DAG con todas las tareas en verde.
- `05-gold.png`: la tabla de cumplimiento semanal.

Antes de publicar, tapa con un rectángulo los correos, los IDs de suscripción y de tenant, los nombres de cuentas reales y cualquier clave o token.
:::

## Ejercicios

:::ejercicio quiz
Si la unión con la dimensión fuera solo `ON d.sku = l.sku AND d.vigente`, ¿qué pasaría?
- [ ] Nada, da lo mismo
- [x] Todas las ventas usarían el costo de hoy y el margen del pasado cambiaría cada vez que cambia un costo
- [ ] Faltarían filas
- [ ] Daría error
:::

:::ejercicio quiz
¿Por qué alcanza `SELECT DISTINCT` para el reenvío de Villa Sol?
- [x] Porque los tickets reenviados son copias exactas, línea por línea
- [ ] Porque Databricks deduplica solo
- [ ] Porque los anulados se filtran
- [ ] No alcanza
:::

## Resumen

- Si la fuente no guarda historia, la foto diaria completa es la historia.
- `LAG` detecta los cambios y `LEAD` cierra las versiones.
- El margen se calcula con el costo vigente ese día, por rango de fechas.
