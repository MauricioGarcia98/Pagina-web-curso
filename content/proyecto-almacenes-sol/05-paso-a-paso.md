---
titulo: Paso a paso - una solución completa, explicada
nivel: Avanzado
duracion: 60
resumen: Una forma de resolver el proyecto de punta a punta, con el código probado y el porqué de cada decisión: la foto diaria del ERP, la SCD tipo 2 con LAG, las ventas con el costo del día y las metas con la planilla nueva. Léela después de intentarlo.
objetivos: Ver una SCD tipo 2 construida desde fotos diarias | Unir ventas con la versión del producto vigente ese día | Automatizar la foto con un DAG
prerrequisitos: proyecto-almacenes-sol-el-dia-a-dia
autoevaluacion: ¿Sabes qué hace LAG en la dimensión? | ¿Sabes por qué la unión con la dimensión usa un rango de fechas? | ¿Sabes por qué SELECT DISTINCT resuelve el reenvío de Villa Sol?
---

:::cuidado Intentalo primero
Esta es **una** solución, no la única. Si ya resolviste el proyecto, compárala con la tuya: ¿qué pasa en cada una si un día no se saca la foto?
:::

## El plan

| Paso | Qué | Dónde |
|---|---|---|
| 1 | Mirar el ERP y sacar la foto del día | Terminal (`psql`) |
| 2 | Bajar los tickets de las cajas | Terminal (`python`) |
| 3 | Bajar la planilla de metas | Terminal |
| 4 | Subir todo al lago | Azure |
| 5 | La dimensión SCD2, las ventas y las metas | Databricks |
| 6 | Key Vault y el DAG diario | Azure + Airflow |

## Paso 1 · El ERP y la foto diaria

```bash
sol accesos
mkdir -p ~/sol/erp ~/sol/pos ~/sol/metas
psql "postgresql://consulta_bi:CLAVE@erp-sol.almacenes.example:5432/erp" -c "\dt"
psql "postgresql://consulta_bi:CLAVE@erp-sol.almacenes.example:5432/erp" -c "SELECT sku, nombre, categoria, precio, costo, ult_modif FROM productos ORDER BY sku LIMIT 5"
```

El ERP solo muestra el presente. La foto es la tabla completa, con la **fecha en el nombre del archivo** (de ahí sale `valido_desde`):

```bash
HOY=$(date +%F)
psql "postgresql://consulta_bi:CLAVE@erp-sol.almacenes.example:5432/erp" \
  -c "\copy (SELECT sku, nombre, categoria, precio, costo FROM productos ORDER BY sku) TO '~/sol/erp/productos_$HOY.csv' WITH CSV HEADER"
```

:::trabajo Foto completa, no incremental
`ult_modif` parece un atajo ("traer solo lo que cambió"), pero la reorganización de categorías la cargaron a mano y no la tocó. Una foto completa por día pesa poco (44 filas) y no depende de que todos los procesos actualicen bien esa columna. Y se saca **después de las 03:00**, cuando ya corrió el proceso de precios.
:::

## Paso 2 · Los tickets de las cajas

Un archivo por día (los archivos de la terminal tienen un límite de tamaño, y además así queda particionado como en un lago de verdad). La API pagina de a 200 y responde 404 si el cierre de caja todavía no llegó: eso se anota, no se corta todo.
Guárdalo como `~/sol.py`.

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

`DESDE` arranca el lunes de la semana pasada: hace falta la semana completa para el cumplimiento de metas.

## Paso 3 · La planilla

```bash
sol metas descargar -o ~/sol/metas/metas.csv
head -5 ~/sol/metas/metas.csv
```

Antes de la reorganización, la planilla tenía títulos, `;` y montos con `$` y puntos: había que saltear filas y limpiar. Después quedó en formato largo (una fila por sucursal y semana) con `codigo_sucursal`. Se une **por código**, nunca por nombre: el nombre de Centro cambió.

## Paso 4 · Al lago

```bash
az login
az group create -n rg-sol -l eastus2
az storage account create -n stsol -g rg-sol -l eastus2 --sku Standard_LRS --hns true
az storage container create --account-name stsol -n landing
ID=$(az storage account show -n stsol -g rg-sol --query id -o tsv)
az role assignment create --assignee unity-catalog-access-connector --role "Storage Blob Data Contributor" --scope $ID
az storage blob upload-batch --account-name stsol -d landing/sol -s ~/sol
```

## Paso 5 · Databricks

Las fotos, con la fecha sacada del nombre del archivo (`productos_2026-11-16.csv` → posición 11, 10 caracteres):

```sql norun
CREATE EXTERNAL LOCATION lago_sol URL 'abfss://landing@stsol.dfs.core.windows.net/' WITH (STORAGE CREDENTIAL credencial_lago);
CREATE CATALOG IF NOT EXISTS sol; CREATE SCHEMA IF NOT EXISTS sol.silver; CREATE SCHEMA IF NOT EXISTS sol.gold;

CREATE OR REPLACE TEMP VIEW fotos AS
SELECT sku, nombre, categoria, CAST(precio AS DOUBLE) AS precio, CAST(costo AS DOUBLE) AS costo,
       substr(_metadata.file_name, 11, 10) AS fecha
FROM read_files('abfss://landing@stsol.dfs.core.windows.net/sol/erp/', format => 'csv', header => true, inferSchema => false);
```

La SCD2: con `LAG` se compara cada foto con la anterior del mismo producto. Una versión nueva empieza cuando cambia precio, costo **o categoría**. Después, `LEAD` cierra cada versión con el inicio de la siguiente.

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

Los tickets: `SELECT DISTINCT` elimina las líneas repetidas que Villa Sol reenvió al reconectarse (son copias exactas), y los anulados se filtran.

```sql norun
CREATE OR REPLACE TEMP VIEW lineas AS
SELECT DISTINCT * FROM read_files('abfss://landing@stsol.dfs.core.windows.net/sol/pos/', format => 'csv', header => true, inferSchema => false);

CREATE OR REPLACE TEMP VIEW lineas_ok AS
SELECT ticket_id, sucursal, fecha, medio_pago, sku,
       CAST(cantidad AS INT) * CAST(precio_unitario AS DOUBLE) - CAST(descuento AS DOUBLE) AS neta,
       CAST(cantidad AS INT) AS cantidad
FROM lineas WHERE anulado = 'False';
```

Las ventas diarias: el margen usa el costo de la versión **vigente el día de la venta** (unión por rango), y solo desde el día de la primera foto (antes no hay costos).

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

Las metas, con la planilla en formato largo:

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

Y las preguntas del tablero, por ejemplo el margen de Bebidas de un día (con el costo de ese día):

```sql norun
SELECT round(sum(l.neta - l.cantidad * d.costo) / sum(l.neta) * 100, 1)
FROM lineas_ok l
JOIN sol.silver.dim_producto d ON d.sku = l.sku AND CAST(l.fecha AS DATE) >= d.valido_desde
 AND (d.valido_hasta IS NULL OR CAST(l.fecha AS DATE) < d.valido_hasta)
WHERE l.fecha = '2026-11-18' AND d.categoria = 'BEB';
```

## Paso 6 · Key Vault y el DAG

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

A las 05:30: después del proceso de precios (03:00) y del cierre de cajas (02:00), y antes de que abran las sucursales (08:00).

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
