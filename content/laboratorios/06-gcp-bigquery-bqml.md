---
titulo: "Laboratorio Google Cloud: BigQuery particionado, dry run y BigQuery ML"
nivel: Avanzado
duracion: 55
resumen: Carga pedidos desde Cloud Storage a una tabla particionada por fecha y agrupada por canal, mide con dry run cuánto escanea cada consulta (y cómo bajan los bytes al filtrar la partición y elegir columnas), y entrena dentro de BigQuery un modelo de clasificación y uno de pronóstico con BigQuery ML. Es la práctica de PDE, ADP y PMLE.
objetivos: Crear una tabla particionada y agrupada y cargarla desde Cloud Storage | Estimar el costo de una consulta con --dry_run antes de ejecutarla | Reducir los bytes escaneados con filtros de partición y columnas explícitas | Entrenar, evaluar y usar un modelo LOGISTIC_REG | Pronosticar una serie diaria con ARIMA_PLUS | Borrar datasets y bucket
autoevaluacion: ¿Sabes por qué SELECT * es caro en BigQuery aunque uses LIMIT? | ¿Sabes qué hace la poda de particiones? | ¿Sabes qué opción obligatoria tiene un modelo de clasificación en BQML? | ¿Sabes qué columnas necesita ARIMA_PLUS?
---

:::escenario
La factura de BigQuery de la tienda se triplicó: los tableros consultan la tabla de pedidos completa cada 5 minutos. Además, el equipo comercial quiere saber qué clientes tienen perfil corporativo y finanzas quiere un pronóstico de cobranza para la semana. Vas a resolverlo todo sin salir de BigQuery.
:::

## Arquitectura

```diagrama
titulo: Pedidos particionados y modelos en BigQuery
nodo csv: ventas_2024_12.csv | icono=documento | col=0 | fila=1
nodo gcs: Cloud Storage | icono=gcs | col=1 | fila=1 | sub=academia-lab-datos | color=azul
nodo bq: ventas_lab.pedidos | icono=bigquery | col=2 | fila=1 | sub=partición por fecha, cluster por canal | color=azul
nodo dr: Dry run | icono=lupa | col=3 | fila=0 | sub=bytes antes de pagar | color=naranja
nodo ml: BigQuery ML | icono=ml | col=3 | fila=2 | sub=LOGISTIC_REG y ARIMA_PLUS | color=verde
nodo tab: Tableros | icono=dashboard | col=4 | fila=1
flecha csv -> gcs
flecha gcs -> bq: bq load
flecha bq -> dr | estilo=punteada
flecha bq -> ml
flecha bq -> tab
```

## Costo en una cuenta real

| Recurso | Costo |
|---|---|
| Almacenamiento (menos de 1 MB) | Capa gratuita de 10 GB |
| Consultas | Capa gratuita de 1 TB por mes; luego unos USD 6,25 por TB |
| BigQuery ML `CREATE MODEL` | Cobra por bytes procesados al entrenar: con estas tablas, gratis dentro de la capa |
| Cloud Storage | Centavos |

Puedes hacer todo en el **sandbox de BigQuery**, sin tarjeta (las tablas expiran a los 60 días).

## Práctica guiada

:::ejercicio cli
Paso 1. Crea el bucket `gs://academia-lab-datos` en `us-central1` y copia `datos/ventas_2024_12.csv` a la carpeta `ventas/`.
```respuesta
todos: gcloud storage buckets create gs://academia-lab-datos || gcloud storage cp datos/ventas_2024_12\.csv gs://academia-lab-datos/ventas/
```
```solucion
gcloud storage buckets create gs://academia-lab-datos --location=us-central1 && gcloud storage cp datos/ventas_2024_12.csv gs://academia-lab-datos/ventas/
```
:::

:::ejercicio cli
Paso 2. Crea el dataset `ventas_lab` y la tabla `ventas_lab.pedidos` **particionada por `fecha`** y **agrupada por `canal`**, con el esquema `pedido_id:INTEGER,fecha:DATE,cliente_id:INTEGER,canal:STRING,estado:STRING,total:FLOAT`.
```respuesta
todos: bq mk --dataset ventas_lab || bq mk --table || --time_partitioning_field fecha || --clustering_fields canal || ventas_lab\.pedidos || pedido_id:INTEGER,fecha:DATE,cliente_id:INTEGER,canal:STRING,estado:STRING,total:FLOAT
```
```solucion
bq mk --dataset ventas_lab && bq mk --table --time_partitioning_field fecha --clustering_fields canal ventas_lab.pedidos pedido_id:INTEGER,fecha:DATE,cliente_id:INTEGER,canal:STRING,estado:STRING,total:FLOAT
```
:::

:::ejercicio cli
Paso 3. Carga el CSV de Cloud Storage en `ventas_lab.pedidos`, salteando la fila de encabezado.
```respuesta
todos: bq load || --source_format=CSV || --skip_leading_rows=1 || ventas_lab\.pedidos || gs://academia-lab-datos/ventas/ventas_2024_12\.csv
```
```solucion
bq load --source_format=CSV --skip_leading_rows=1 ventas_lab.pedidos gs://academia-lab-datos/ventas/ventas_2024_12.csv
```
```setup
gcloud storage buckets create gs://academia-lab-datos --location=us-central1
gcloud storage cp datos/ventas_2024_12.csv gs://academia-lab-datos/ventas/
bq mk --dataset ventas_lab
bq mk --table --time_partitioning_field fecha --clustering_fields canal ventas_lab.pedidos pedido_id:INTEGER,fecha:DATE,cliente_id:INTEGER,canal:STRING,estado:STRING,total:FLOAT
```
:::

:::ejercicio cli
Paso 4. Sin ejecutarla, estima cuántos bytes procesaría `SELECT * FROM ventas_lab.pedidos`.
```respuesta
todos: bq query || --use_legacy_sql=false || --dry_run || \S*SELECT \* FROM ventas_lab\.pedidos\S*
```
```solucion
bq query --use_legacy_sql=false --dry_run 'SELECT * FROM ventas_lab.pedidos'
```
```setup
gcloud storage buckets create gs://academia-lab-datos --location=us-central1
gcloud storage cp datos/ventas_2024_12.csv gs://academia-lab-datos/ventas/
bq mk --dataset ventas_lab
bq mk --table --time_partitioning_field fecha --clustering_fields canal ventas_lab.pedidos pedido_id:INTEGER,fecha:DATE,cliente_id:INTEGER,canal:STRING,estado:STRING,total:FLOAT
bq load --source_format=CSV --skip_leading_rows=1 ventas_lab.pedidos gs://academia-lab-datos/ventas/ventas_2024_12.csv
```
:::

:::ejercicio cli
Paso 5. Ahora estima la consulta que de verdad necesita el tablero: la suma de `total` **solo del 15 de diciembre** (`fecha = '2024-12-15'`). Compara los bytes con el paso anterior.
```respuesta
todos: bq query || --use_legacy_sql=false || --dry_run || .*SUM\(total\)\S* || .*fecha\s*=\s*'2024-12-15'\S*
```
```solucion
bq query --use_legacy_sql=false --dry_run "SELECT SUM(total) FROM ventas_lab.pedidos WHERE fecha = '2024-12-15'"
```
```setup
gcloud storage buckets create gs://academia-lab-datos --location=us-central1
gcloud storage cp datos/ventas_2024_12.csv gs://academia-lab-datos/ventas/
bq mk --dataset ventas_lab
bq mk --table --time_partitioning_field fecha --clustering_fields canal ventas_lab.pedidos pedido_id:INTEGER,fecha:DATE,cliente_id:INTEGER,canal:STRING,estado:STRING,total:FLOAT
bq load --source_format=CSV --skip_leading_rows=1 ventas_lab.pedidos gs://academia-lab-datos/ventas/ventas_2024_12.csv
```
```explicacion
Dos ahorros a la vez: BigQuery es **columnar** (solo lee `fecha` y `total`, no las seis columnas) y la **partición** hace que solo lea el día filtrado. `LIMIT` no reduce lo escaneado; estas dos cosas sí.
```
:::

:::ejercicio cli
Paso 6. Ejecuta la consulta real: ventas por `canal` de la **primera semana** de diciembre (`BETWEEN '2024-12-01' AND '2024-12-07'`).
```respuesta
todos: bq query || --use_legacy_sql=false || .*GROUP BY canal\S* || .*BETWEEN '2024-12-01' AND '2024-12-07'\S*
```
```solucion
bq query --use_legacy_sql=false "SELECT canal, ROUND(SUM(total), 2) AS ventas FROM ventas_lab.pedidos WHERE fecha BETWEEN '2024-12-01' AND '2024-12-07' GROUP BY canal"
```
```setup
gcloud storage buckets create gs://academia-lab-datos --location=us-central1
gcloud storage cp datos/ventas_2024_12.csv gs://academia-lab-datos/ventas/
bq mk --dataset ventas_lab
bq mk --table --time_partitioning_field fecha --clustering_fields canal ventas_lab.pedidos pedido_id:INTEGER,fecha:DATE,cliente_id:INTEGER,canal:STRING,estado:STRING,total:FLOAT
bq load --source_format=CSV --skip_leading_rows=1 ventas_lab.pedidos gs://academia-lab-datos/ventas/ventas_2024_12.csv
```
:::

:::ejercicio cli
Paso 7. Crea el dataset `ml_lab` y entrena el modelo `ml_lab.corporativo` de tipo `LOGISTIC_REG` que prediga `es_corporativo` (1 si `segmento = 'Corporativo'`) a partir de `pais`, con los datos de `tienda.clientes`.
```respuesta
todos: bq mk --dataset ml_lab || bq query || --use_legacy_sql=false || .*CREATE MODEL ml_lab\.corporativo\S* || .*model_type\s*=\s*'LOGISTIC_REG'\S* || .*input_label_cols\s*=\s*\['es_corporativo'\]\S*
```
```solucion
bq mk --dataset ml_lab && bq query --use_legacy_sql=false "CREATE MODEL ml_lab.corporativo OPTIONS(model_type='LOGISTIC_REG', input_label_cols=['es_corporativo']) AS SELECT pais, CASE WHEN segmento = 'Corporativo' THEN 1 ELSE 0 END AS es_corporativo FROM tienda.clientes"
```
```explicacion
Sin `input_label_cols`, BQML busca una columna llamada `label`. Pruébalo: el error te dice qué falta.
```
:::

:::ejercicio cli
Paso 8. Evalúa el modelo con `ML.EVALUATE`.
```respuesta
todos: bq query || --use_legacy_sql=false || .*ML\.EVALUATE\(MODEL ml_lab\.corporativo\)\S*
```
```solucion
bq query --use_legacy_sql=false 'SELECT * FROM ML.EVALUATE(MODEL ml_lab.corporativo)'
```
```setup
bq mk --dataset ml_lab
bq query --use_legacy_sql=false "CREATE MODEL ml_lab.corporativo OPTIONS(model_type='LOGISTIC_REG', input_label_cols=['es_corporativo']) AS SELECT pais, CASE WHEN segmento = 'Corporativo' THEN 1 ELSE 0 END AS es_corporativo FROM tienda.clientes"
```
:::

:::ejercicio cli
Paso 9. Predice para 3 clientes con `ML.PREDICT`, pasando solo la columna `pais` de `tienda.clientes`.
```respuesta
todos: bq query || --use_legacy_sql=false || .*ML\.PREDICT\(MODEL ml_lab\.corporativo,\S* || .*SELECT pais FROM tienda\.clientes\S*
```
```solucion
bq query --use_legacy_sql=false 'SELECT * FROM ML.PREDICT(MODEL ml_lab.corporativo, (SELECT pais FROM tienda.clientes LIMIT 3))'
```
```setup
bq mk --dataset ml_lab
bq query --use_legacy_sql=false "CREATE MODEL ml_lab.corporativo OPTIONS(model_type='LOGISTIC_REG', input_label_cols=['es_corporativo']) AS SELECT pais, CASE WHEN segmento = 'Corporativo' THEN 1 ELSE 0 END AS es_corporativo FROM tienda.clientes"
```
:::

:::ejercicio cli
Paso 10. Entrena `ml_lab.cobranza` de tipo `ARIMA_PLUS` con la cobranza diaria: `DATE(fecha_pago) AS dia` y `SUM(monto) AS monto` de `tienda.pagos`, agrupando por día.
```respuesta
todos: bq query || --use_legacy_sql=false || .*CREATE MODEL ml_lab\.cobranza\S* || .*'ARIMA_PLUS'\S* || .*time_series_timestamp_col\s*=\s*'dia'\S* || .*time_series_data_col\s*=\s*'monto'\S* || .*tienda\.pagos\S*
```
```solucion
bq query --use_legacy_sql=false "CREATE MODEL ml_lab.cobranza OPTIONS(model_type='ARIMA_PLUS', time_series_timestamp_col='dia', time_series_data_col='monto') AS SELECT DATE(fecha_pago) AS dia, SUM(monto) AS monto FROM tienda.pagos GROUP BY 1"
```
```setup
bq mk --dataset ml_lab
```
:::

:::ejercicio cli
Paso 11. Pronostica los próximos **7 días** con `ML.FORECAST`.
```respuesta
todos: bq query || --use_legacy_sql=false || .*ML\.FORECAST\(MODEL ml_lab\.cobranza,\S* || .*STRUCT\(7 AS horizon\)\S*
```
```solucion
bq query --use_legacy_sql=false 'SELECT * FROM ML.FORECAST(MODEL ml_lab.cobranza, STRUCT(7 AS horizon))'
```
```setup
bq mk --dataset ml_lab
bq query --use_legacy_sql=false "CREATE MODEL ml_lab.cobranza OPTIONS(model_type='ARIMA_PLUS', time_series_timestamp_col='dia', time_series_data_col='monto') AS SELECT DATE(fecha_pago) AS dia, SUM(monto) AS monto FROM tienda.pagos GROUP BY 1"
```
```explicacion
ARIMA_PLUS detecta solo la estacionalidad semanal y anual, los feriados (con `holiday_region`) y los valores atípicos. Para varias series a la vez (una por tienda) se agrega `time_series_id_col`.
```
:::

## En tu cuenta real

- Habilita la API de BigQuery y usa la consola o Cloud Shell, que ya trae `bq` y `gcloud`.
- En la consola, el **validador** (arriba a la derecha del editor) muestra los bytes igual que `--dry_run`.
- Para obligar a filtrar la partición: `bq update --require_partition_filter ventas_lab.pedidos`. Las consultas sin filtro fallan en lugar de cobrar.
- Pon un **tope por consulta**: `bq query --maximum_bytes_billed=1000000000 …` (1 GB).

```sql norun
-- Lo mismo en el editor de la consola
CREATE TABLE ventas_lab.pedidos2
PARTITION BY fecha
CLUSTER BY canal
OPTIONS (require_partition_filter = TRUE) AS
SELECT * FROM ventas_lab.pedidos;
```

## Limpieza

```bash norun
bq rm -r -f ventas_lab
bq rm -r -f ml_lab
gcloud storage rm -r gs://academia-lab-datos
```

:::ejercicio cli
Limpieza en la terminal del curso: borra el dataset `ml_lab` **con todo su contenido** (modelos incluidos) sin pedir confirmación.
```respuesta
todos: bq rm || -r || -f || ml_lab
```
```solucion
bq rm -r -f ml_lab
```
```setup
bq mk --dataset ml_lab
```
:::

:::errores
- **Particionar y después no filtrar por la partición**: BigQuery escanea la tabla entera. Se puede exigir el filtro con `require_partition_filter`.
- **`SELECT *` en BigQuery**: cobra por columnas leídas; `LIMIT` no reduce el costo.
- **No usar el dry run** antes de una consulta grande: el costo se ve después.
- **Evaluar el modelo con los mismos datos del entrenamiento**: las métricas salen infladas. BigQuery ML separa datos de evaluación; revisa cuáles usó.
- **Clustering en columnas con pocos valores distintos** o que no se filtran: no reduce lo escaneado.
:::

:::trabajo
- En empresas que usan BigQuery, revisar los bytes escaneados de las consultas más caras es una tarea semanal; las tablas grandes siempre se particionan por fecha.
- BigQuery ML se usa para modelos rápidos cerca de los datos (clasificación, pronósticos) cuando no hace falta una plataforma de ML completa.
:::

:::entrevista "¿Qué diferencia hay entre particionar y agrupar (clustering) una tabla en BigQuery?"
Particionar divide la tabla en segmentos, normalmente por fecha, y una consulta que filtra la partición solo lee esos segmentos, lo que se ve en el costo estimado. El clustering ordena los datos dentro de cada partición por hasta cuatro columnas, y el motor salta bloques que no cumplen el filtro; ayuda en columnas con muchos valores que se filtran o agrupan seguido. Se combinan: partición por fecha y clustering por cliente o canal.
:::

## Preguntas de examen

:::ejercicio quiz
Un analista ejecuta `SELECT * FROM pedidos LIMIT 10` sobre una tabla de 5 TB. ¿Cuánto escanea BigQuery?

- [ ] Solo 10 filas
- [ ] Una partición
- [x] Toda la tabla, todas las columnas
- [ ] Nada, porque usa la caché
```explicacion
`LIMIT` corta el resultado, no la lectura. La vista previa de la tabla (*Preview*) sí es gratuita.
```
:::

:::ejercicio quiz
Los tableros filtran siempre por fecha y casi siempre por `pais`. ¿Qué diseño reduce más el costo?

- [ ] Agrupar por fecha y particionar por `pais`
- [x] Particionar por fecha y agrupar (*cluster*) por `pais`
- [ ] Una tabla por país
- [ ] Una vista materializada por cada tablero
:::

:::ejercicio quiz
Quieres pronosticar la demanda diaria de 300 tiendas en una sola sentencia de BigQuery ML. ¿Qué agregas a `ARIMA_PLUS`?

- [ ] `input_label_cols=['tienda_id']`
- [x] `time_series_id_col='tienda_id'`
- [ ] Un modelo por tienda con un bucle
- [ ] `model_type='KMEANS'`
:::
