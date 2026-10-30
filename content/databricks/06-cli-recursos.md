---
titulo: "Databricks CLI: workspace, archivos, clusters, jobs y secretos"
nivel: Avanzado
duracion: 35
resumen: Los comandos que usarás a diario para operar un workspace desde la terminal.
---

Una vez autenticado, la CLI organiza los comandos por **tipo de recurso**, con el mismo patrón que `az` o `aws`: `databricks <grupo> <acción> [argumentos]`.

| Grupo | Administra | Ejemplos de acciones |
|---|---|---|
| `workspace` | Notebooks y carpetas del workspace | `list`, `import`, `export`, `mkdirs`, `delete` |
| `fs` | Archivos en Volumes (y DBFS) | `ls`, `cp`, `cat`, `rm` |
| `clusters` | Cómputo | `list`, `get`, `start`, `restart`, `delete` |
| `jobs` | Jobs (Lakeflow Jobs) | `list`, `create`, `run-now`, `get-run` |
| `secrets` | Secret scopes y secretos | `create-scope`, `put-secret`, `list-secrets` |
| `catalogs`, `schemas`, `tables` | Unity Catalog | `list`, `get` |
| `bundle` | Declarative Automation Bundles | `init`, `validate`, `deploy`, `run` |

Agrega `--output json` a casi cualquier comando para procesar la respuesta con `jq` en un script.

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

```recorrido
titulo: La vida de un cluster desde la CLI
estacion lista: Listar | icono=lupa
estacion start: start | icono=chispa
estacion get: get | icono=servidor
estacion delete: delete | icono=reloj
estacion perm: permanent-delete | icono=x
paso lista: Los clusters del workspace
Cada cluster tiene un **ID** (lo usan los comandos) y un nombre (lo usan las personas).
>>> log
$ databricks clusters list
ID                    Name                  State
--------------------  --------------------  ----------
0123-456789-abcdef12  dev-ana               TERMINATED
0456-111111-zzzz9999  compartido-analistas  RUNNING
paso start: Encender
`start` lo pasa a `PENDING` (pidiendo máquinas a la nube) y después a `RUNNING`. Desde ahí, **se cobra**.
>>> bash
databricks clusters start 0123-456789-abcdef12
paso get: Ver su configuración
`get` muestra versión de runtime, tipo de máquina, cantidad de workers y la autoterminación: se apaga solo tras 30 minutos sin uso.
>>> json
{
  "cluster_id": "0123-456789-abcdef12",
  "cluster_name": "dev-ana",
  "state": "RUNNING",
  "node_type_id": "Standard_D4ds_v5",
  "num_workers": 2,
  "autotermination_minutes": 30
}
paso delete: "delete" en realidad apaga
Un nombre engañoso: `clusters delete` lo **termina** (`TERMINATED`). La configuración se conserva y se puede volver a encender con `start`.
>>> bash
databricks clusters delete 0123-456789-abcdef12   # → TERMINATED
paso perm: permanent-delete sí lo borra
Este sí elimina el cluster y su configuración: no hay vuelta atrás. Antes de usarlo, verifica el ID dos veces.
>>> bash
databricks clusters permanent-delete 0123-456789-abcdef12
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

## Laboratorio en la terminal

```bash
databricks auth login --host https://adb-1234567890123456.7.azuredatabricks.net
databricks fs cp datos/clientes.csv dbfs:/Volumes/main/crudo/archivos/clientes.csv
databricks fs ls dbfs:/Volumes/main/crudo/archivos
databricks secrets create-scope datos-api
databricks secrets put-secret datos-api token --string-value abc123
databricks secrets list-secrets datos-api
databricks jobs list
```

Fíjate que `list-secrets` muestra las **claves** pero nunca los **valores**: los secretos solo se leen desde el código que corre en Databricks (`dbutils.secrets.get`), y aun así aparecen como `[REDACTED]` si alguien intenta imprimirlos.

## Ejercicios

:::ejercicio cli
Copia el archivo local `./clientes.csv` al volumen `dbfs:/Volumes/main/crudo/archivos/clientes.csv`.
```respuesta
databricks fs cp (\./)?clientes\.csv dbfs:/Volumes/main/crudo/archivos/clientes\.csv( --overwrite)?
```
```solucion
databricks fs cp ./clientes.csv dbfs:/Volumes/main/crudo/archivos/clientes.csv
```
```setup
cp datos/clientes.csv clientes.csv
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
```setup
databricks secrets create-scope datos-api
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
```setup
echo "df = spark.table(\"bronze.ventas\")" > silver.py
```
:::
