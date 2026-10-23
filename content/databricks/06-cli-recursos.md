---
titulo: "Databricks CLI: workspace, archivos, clusters, jobs y secretos"
nivel: Avanzado
duracion: 35
resumen: Los comandos que usarás a diario para operar un workspace desde la terminal.
---

## Workspace (notebooks y carpetas)

```bash norun
databricks workspace list /Users/ana@empresa.com
databricks workspace mkdirs /Shared/pipelines
databricks workspace import /Shared/pipelines/silver --file ./silver.py --language PYTHON --format SOURCE
databricks workspace export /Shared/pipelines/silver --format SOURCE --file ./silver.py
databricks workspace import-dir ./notebooks /Shared/pipelines --overwrite
```

## Archivos (Volumes / DBFS)

```bash norun
databricks fs ls dbfs:/Volumes/main/crudo/archivos/
databricks fs cp ./ventas.csv dbfs:/Volumes/main/crudo/archivos/ventas.csv
databricks fs cp -r ./exportes dbfs:/Volumes/main/crudo/archivos/exportes --overwrite
databricks fs cat dbfs:/Volumes/main/crudo/archivos/ventas.csv
databricks fs rm -r dbfs:/Volumes/main/crudo/tmp
```

## Clusters

```bash norun
databricks clusters list
databricks clusters get 0123-456789-abcdef12
databricks clusters start 0123-456789-abcdef12
databricks clusters delete 0123-456789-abcdef12        # "delete" = TERMINAR (apagar), se puede volver a iniciar
databricks clusters permanent-delete 0123-456789-abcdef12
databricks clusters create --json @cluster.json
databricks clusters spark-versions                      # versiones de Databricks Runtime disponibles
```

## Jobs

```bash norun
databricks jobs list
databricks jobs get 123456
databricks jobs run-now 123456
databricks jobs run-now 123456 --json '{"job_parameters": {"fecha": "2024-12-31"}}'
databricks jobs list-runs --job-id 123456
databricks jobs get-run 987654321
databricks jobs cancel-run 987654321
databricks jobs create --json @job.json
```

## Secretos

```bash norun
databricks secrets create-scope datos-api
databricks secrets put-secret datos-api token              # pide el valor de forma segura
databricks secrets put-secret datos-api token --string-value "abc123"
databricks secrets list-scopes
databricks secrets list-secrets datos-api
databricks secrets put-acl datos-api ingenieros-datos READ
```

## Unity Catalog y SQL

```bash norun
databricks catalogs list
databricks schemas list main
databricks tables list main ventas
databricks warehouses list
```

:::tip --output json + jq
Casi todos los comandos aceptan `--output json`. Combínalo con `jq` para scripts: `databricks clusters list --output json | jq -r '.[] | select(.state=="RUNNING") | .cluster_id'`.
:::

## Ejercicios

:::ejercicio cli
Copia el archivo local `./clientes.csv` al volumen `dbfs:/Volumes/main/crudo/archivos/clientes.csv`.
```respuesta
databricks fs cp (\./)?clientes\.csv dbfs:/Volumes/main/crudo/archivos/clientes\.csv( --overwrite)?
```
```solucion
databricks fs cp ./clientes.csv dbfs:/Volumes/main/crudo/archivos/clientes.csv
```
:::

:::ejercicio cli
Lista el contenido de `dbfs:/Volumes/main/crudo/archivos/`.
```respuesta
databricks fs ls dbfs:/Volumes/main/crudo/archivos/?
```
```solucion
databricks fs ls dbfs:/Volumes/main/crudo/archivos/
```
:::

:::ejercicio cli
Ejecuta ahora el job con id `123456`.
```respuesta
databricks jobs run-now (--job-id )?123456
```
```solucion
databricks jobs run-now 123456
```
:::

:::ejercicio cli
Ejecuta el job `123456` pasándole el parámetro de job `fecha` con el valor `2024-12-31` (en JSON).
```respuesta
databricks jobs run-now 123456 --json ['"]\{"job_parameters": ?\{"fecha": ?"2024-12-31"\}\}['"]
```
```solucion
databricks jobs run-now 123456 --json '{"job_parameters": {"fecha": "2024-12-31"}}'
```
:::

:::ejercicio cli
Apaga (termina) el cluster `0123-456789-abcdef12`.
```respuesta
databricks clusters delete 0123-456789-abcdef12
```
:::

:::ejercicio cli
Crea un secret scope llamado `datos-api`.
```respuesta
databricks secrets create-scope datos-api
```
:::

:::ejercicio cli
Guarda en el scope `datos-api` el secreto `token` (deja que la CLI te pida el valor de forma segura).
```respuesta
databricks secrets put-secret datos-api token
```
:::

:::ejercicio cli
Importa el archivo local `./silver.py` como notebook de Python en `/Shared/pipelines/silver`.
```respuesta
todos: databricks workspace import /Shared/pipelines/silver || --file (\./)?silver\.py || --language PYTHON
```
```solucion
databricks workspace import /Shared/pipelines/silver --file ./silver.py --language PYTHON --format SOURCE
```
:::
