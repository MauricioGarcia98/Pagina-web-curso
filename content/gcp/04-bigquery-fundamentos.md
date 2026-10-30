---
titulo: BigQuery, fundamentos
nivel: Intermedio
duracion: 45
resumen: Cómo funciona BigQuery por dentro (almacenamiento columnar, slots, separación de cómputo), proyectos, datasets y tablas, la CLI bq (mk, load, query, show, dry_run), costos y el dialecto GoogleSQL.
---

## Qué hace especial a BigQuery

```text
          tu SQL
            │
     ┌──────▼──────┐   reparte el trabajo en miles de "slots" (unidades de CPU+memoria)
     │  Dremel     │──────────────┬──────────────┬──────────────┐
     └─────────────┘            slot           slot   …        slot
            │ red Jupiter (petabits/s)
     ┌──────▼──────────────────────────────────────────────────┐
     │ Colossus: almacenamiento columnar (Capacitor), comprimido │
     └─────────────────────────────────────────────────────────┘
```

- **Almacenamiento y cómputo separados**: guardas datos sin pagar cómputo; consultas sin "encender" nada.
- **Columnar**: cada columna se guarda aparte. Leer 3 columnas de 100 cuesta ~3 % de leer todas.
- **Slots**: cuando consultas, BigQuery asigna cientos o miles de slots durante segundos.
- **Sin índices**: en lugar de índices, BigQuery usa **particiones** y **clustering** (lección siguiente).

:::analogia Una biblioteca con un ejército de lectores
Imagina que cada columna es un tomo separado y que, cuando haces una pregunta, mil bibliotecarios leen en paralelo solo los tomos necesarios. Por eso responde rápido sobre terabytes, y por eso te cobran por **tomos leídos**, no por respuestas.
:::

## Proyecto → dataset → tabla

```text
academia-datos-dev                 ← proyecto (factura las consultas)
├── tienda_bronze                  ← dataset (como un "esquema"; tiene ubicación: US, EU, southamerica-east1…)
│   └── ventas                     ← tabla
└── tienda_gold
    ├── ventas_por_canal           ← tabla
    └── v_clientes_activos         ← vista
```

Una tabla se nombra completa así: `` `academia-datos-dev.tienda_gold.ventas_por_canal` `` (con *backticks* si el proyecto tiene guiones).

| Objeto | Qué es |
|---|---|
| Tabla nativa | Datos guardados en BigQuery (lo normal) |
| Tabla externa / BigLake | Datos en GCS (CSV, Parquet, Iceberg) consultados desde BigQuery |
| Vista | Consulta guardada; no guarda datos |
| Vista materializada | Resultado precalculado que BigQuery mantiene actualizado |
| Snapshot / clon | Copia barata de una tabla en un momento |

## La CLI `bq`

```bash norun
bq mk --dataset --location=US academia-datos-dev:tienda_bronze      # crear dataset
bq ls                                                               # datasets del proyecto
bq ls tienda_bronze                                                 # tablas del dataset
bq load --source_format=CSV --autodetect --skip_leading_rows=1 \
   tienda_bronze.ventas gs://lake-tienda-dev/bronze/ventas/ventas_2024_12.csv
bq show tienda_bronze.ventas                                        # filas, tamaño, particiones
bq show --schema --format=prettyjson tienda_bronze.ventas           # esquema
bq query --use_legacy_sql=false 'SELECT canal, COUNT(*) FROM tienda_bronze.ventas GROUP BY canal'
bq query --use_legacy_sql=false --dry_run 'SELECT * FROM tienda_bronze.ventas'   # ¿cuántos bytes leería?
bq rm -t tienda_bronze.ventas_vieja                                 # borrar tabla
```

:::cuidado Siempre `--use_legacy_sql=false`
Por razones históricas, `bq query` usa por defecto el viejo *Legacy SQL*. Agrega siempre `--use_legacy_sql=false` (o `--nouse_legacy_sql`), o ponlo en tu `~/.bigqueryrc`. En la consola web y en las librerías ya se usa **GoogleSQL** por defecto.
:::

### Laboratorio: del archivo a la consulta

Esta terminal carga el CSV **de verdad** y la consulta se ejecuta sobre esos datos:

```bash
gcloud config set project academia-datos-dev
gcloud storage buckets create gs://lake-tienda-dev --location=US
gcloud storage cp datos/ventas_2024_12.csv gs://lake-tienda-dev/bronze/ventas/
bq mk --dataset tienda_bronze
bq load --source_format=CSV --autodetect --skip_leading_rows=1 tienda_bronze.ventas gs://lake-tienda-dev/bronze/ventas/ventas_2024_12.csv
bq query --use_legacy_sql=false 'SELECT canal, COUNT(*) AS pedidos, ROUND(SUM(total), 2) AS total FROM `academia-datos-dev.tienda_bronze.ventas` GROUP BY canal ORDER BY total DESC'
```

```recorrido
titulo: De un CSV en Cloud Storage a una consulta en BigQuery
estacion gcs: Cloud Storage | icono=archivo
estacion ds: Dataset | icono=base
estacion load: bq load | icono=transformar
estacion dry: --dry_run | icono=lupa
estacion query: bq query | icono=check
paso gcs: El archivo en el lago
Un CSV de ventas ya está en el bucket.
>>> log
$ gcloud storage ls --recursive gs://lake-tienda-dev
gs://lake-tienda-dev/bronze/ventas/ventas_2024_12.csv
paso ds: Crear el dataset
En BigQuery las tablas viven en **datasets** (como un esquema), y los datasets en un proyecto: `proyecto.dataset.tabla`.
>>> log
$ bq mk --dataset tienda_bronze
Dataset 'academia-datos-dev:tienda_bronze' successfully created.
paso load: Cargar el archivo en una tabla
`bq load` copia los datos **dentro** de BigQuery. `--autodetect` deduce las columnas y `--skip_leading_rows=1` saltea el encabezado.
>>> log
$ bq load --source_format=CSV --autodetect --skip_leading_rows=1 \
    tienda_bronze.ventas gs://lake-tienda-dev/bronze/ventas/ventas_2024_12.csv
Waiting on bqjob_r105e424d0242104d_61fd91480ee8c76e ... (1s) Current status: DONE
paso dry: Antes de consultar: ¿cuánto va a leer?
BigQuery cobra (en el modelo bajo demanda) por **bytes leídos**. `--dry_run` lo dice sin ejecutar ni cobrar. Úsalo siempre antes de consultar una tabla grande.
>>> log
$ bq query --use_legacy_sql=false --dry_run 'SELECT * FROM tienda_bronze.ventas'
Query successfully validated. Assuming the tables are not modified,
running this query will process 96 bytes of data.
paso query: La consulta
Con `--use_legacy_sql=false` se usa GoogleSQL, el dialecto estándar de BigQuery.
>>> tabla
canal,pedidos,total
web,2,144.5
app,1,120
```

## GoogleSQL vs. lo que practicas aquí

Las consultas de los ejercicios corren en SQLite. Las diferencias más comunes con BigQuery:

| Quiero… | BigQuery (GoogleSQL) | SQLite (este curso) |
|---|---|---|
| Truncar a mes | `DATE_TRUNC(fecha, MONTH)` | `strftime('%Y-%m', fecha)` |
| Formatear fecha | `FORMAT_DATE('%Y-%m', fecha)` | `strftime('%Y-%m', fecha)` |
| Diferencia de días | `DATE_DIFF(b, a, DAY)` | `julianday(b) - julianday(a)` |
| Sumar días | `DATE_ADD(fecha, INTERVAL 7 DAY)` | `date(fecha, '+7 days')` |
| Hora | `EXTRACT(HOUR FROM ts)` | `CAST(strftime('%H', ts) AS INTEGER)` |
| División segura | `SAFE_DIVIDE(a, b)` | `a * 1.0 / NULLIF(b, 0)` |
| Conversión segura | `SAFE_CAST(x AS INT64)` | `CAST(x AS INTEGER)` |
| Contar con condición | `COUNTIF(cond)` | `SUM(CASE WHEN cond THEN 1 ELSE 0 END)` |
| Filtrar ventanas | `QUALIFY ROW_NUMBER() OVER (…) = 1` | subconsulta con `WHERE rn = 1` |
| Excluir columnas | `SELECT * EXCEPT (email)` | listar columnas |

:::experto QUALIFY, el truco favorito
En BigQuery puedes filtrar por una función de ventana sin subconsulta: `SELECT * FROM pedidos QUALIFY ROW_NUMBER() OVER (PARTITION BY cliente_id ORDER BY fecha_pedido DESC) = 1` devuelve el último pedido de cada cliente. En los ejercicios usa la versión con CTE, que funciona en todos los motores.
:::

## Ejercicios de SQL

:::ejercicio sql ordenado titulo="Último pedido de cada cliente (deduplicación)"
Para cada cliente con pedidos, devuelve su **último** pedido: `cliente_id`, `pedido_id`, `fecha_pedido`, `canal`. Si hay dos pedidos el mismo instante, quédate con el `pedido_id` mayor. Ordena por `cliente_id`. (En BigQuery lo harías con `QUALIFY`.)
```sql solucion
WITH r AS (
  SELECT cliente_id, pedido_id, fecha_pedido, canal,
         ROW_NUMBER() OVER (PARTITION BY cliente_id ORDER BY fecha_pedido DESC, pedido_id DESC) AS rn
  FROM pedidos
)
SELECT cliente_id, pedido_id, fecha_pedido, canal FROM r WHERE rn = 1 ORDER BY cliente_id;
```
:::

:::ejercicio sql ordenado titulo="Clínica: ausentismo por especialidad"
Caso 🏥 clínica. Por `especialidad` (de `clinica_medicos`): `turnos` (todos los turnos), `ausentes` (estado `ausente`) y `pct_ausentismo` (redondeado a 2). Ordena por `pct_ausentismo` descendente.
```sql solucion
SELECT m.especialidad, COUNT(*) AS turnos,
       SUM(CASE WHEN t.estado = 'ausente' THEN 1 ELSE 0 END) AS ausentes,
       ROUND(100.0 * SUM(CASE WHEN t.estado = 'ausente' THEN 1 ELSE 0 END) / COUNT(*), 2) AS pct_ausentismo
FROM clinica_turnos t JOIN clinica_medicos m ON m.medico_id = t.medico_id
GROUP BY m.especialidad
ORDER BY pct_ausentismo DESC;
```
```pista
En BigQuery: `COUNTIF(t.estado = 'ausente')`. Aquí: `SUM(CASE WHEN … THEN 1 ELSE 0 END)`.
```
:::

:::ejercicio sql ordenado titulo="Ventas semana a semana"
Con los pedidos **entregados** de diciembre de 2024, calcula por semana (`semana`, la fecha del **lunes** de cada semana, `YYYY-MM-DD`) la cantidad de `pedidos`. Ordena por semana. (En BigQuery: `DATE_TRUNC(fecha, WEEK(MONDAY))`.)
```sql solucion
SELECT date(fecha_pedido, '-' || ((CAST(strftime('%w', fecha_pedido) AS INTEGER) + 6) % 7) || ' days') AS semana,
       COUNT(*) AS pedidos
FROM pedidos
WHERE estado = 'entregado' AND fecha_pedido >= '2024-12-01' AND fecha_pedido < '2025-01-01'
GROUP BY semana
ORDER BY semana;
```
```pista
`strftime('%w', fecha)` da 0 para domingo … 6 para sábado. Los días a restar para llegar al lunes son `(w + 6) % 7`.
```
:::

## Ejercicios de terminal

:::ejercicio cli
Crea el dataset `tienda_gold` en el proyecto actual.
```respuesta
bq mk (--dataset|-d) ((--location=?\w+) )?((academia-datos-dev:)?tienda_gold)
bq mk (--location=?\w+ )?(--dataset|-d) (academia-datos-dev:)?tienda_gold
```
```solucion
bq mk --dataset tienda_gold
```
:::

:::ejercicio cli
Carga `gs://lake-tienda-dev/bronze/ventas/ventas_2024_12.csv` en la tabla `tienda_bronze.ventas`, con formato CSV, detectando el esquema solo y salteando la fila de encabezado.
```respuesta
todos: bq load || --source_format=CSV || --autodetect || --skip_leading_rows=1 || tienda_bronze\.ventas gs://lake-tienda-dev/bronze/ventas/ventas_2024_12\.csv
```
```solucion
bq load --source_format=CSV --autodetect --skip_leading_rows=1 tienda_bronze.ventas gs://lake-tienda-dev/bronze/ventas/ventas_2024_12.csv
```
```setup
gcloud storage buckets create gs://lake-tienda-dev --location=US
gcloud storage cp datos/ventas_2024_12.csv gs://lake-tienda-dev/bronze/ventas/
bq mk --dataset tienda_bronze
```
:::

:::ejercicio cli
Sin ejecutarla, averigua cuántos bytes leería `SELECT * FROM tienda_bronze.ventas` (en GoogleSQL).
```respuesta
todos: bq query || --use_legacy_sql=false || --dry_run || ['"]SELECT \* FROM `?(academia-datos-dev\.)?tienda_bronze\.ventas`?;?['"]
todos: bq query || --nouse_legacy_sql || --dry_run || ['"]SELECT \* FROM `?(academia-datos-dev\.)?tienda_bronze\.ventas`?;?['"]
```
```solucion
bq query --use_legacy_sql=false --dry_run 'SELECT * FROM tienda_bronze.ventas'
```
```setup
gcloud storage buckets create gs://lake-tienda-dev --location=US
gcloud storage cp datos/ventas_2024_12.csv gs://lake-tienda-dev/bronze/ventas/
bq mk --dataset tienda_bronze
bq load --source_format=CSV --autodetect --skip_leading_rows=1 tienda_bronze.ventas gs://lake-tienda-dev/bronze/ventas/ventas_2024_12.csv
```
:::

:::ejercicio cli
Consulta cuántos pedidos hay por `canal` en `tienda_bronze.ventas` (columnas `canal` y `pedidos`).
```respuesta
todos: bq query || --use_legacy_sql=false || ['"]SELECT canal, COUNT\(\*\) (AS )?pedidos FROM `?(academia-datos-dev\.)?tienda_bronze\.ventas`? GROUP BY canal;?['"]
todos: bq query || --nouse_legacy_sql || ['"]SELECT canal, COUNT\(\*\) (AS )?pedidos FROM `?(academia-datos-dev\.)?tienda_bronze\.ventas`? GROUP BY canal;?['"]
```
```solucion
bq query --use_legacy_sql=false 'SELECT canal, COUNT(*) AS pedidos FROM tienda_bronze.ventas GROUP BY canal'
```
```setup
gcloud storage buckets create gs://lake-tienda-dev --location=US
gcloud storage cp datos/ventas_2024_12.csv gs://lake-tienda-dev/bronze/ventas/
bq mk --dataset tienda_bronze
bq load --source_format=CSV --autodetect --skip_leading_rows=1 tienda_bronze.ventas gs://lake-tienda-dev/bronze/ventas/ventas_2024_12.csv
```
:::

:::ejercicio quiz
¿Por qué BigQuery no necesita índices para responder rápido?

- [ ] Porque guarda todo en memoria
- [x] Porque lee columnas comprimidas en paralelo con miles de slots, y reduce lo leído con particiones y clustering
- [ ] Porque solo admite tablas chicas
- [ ] Sí necesita índices, se crean con CREATE INDEX
:::
