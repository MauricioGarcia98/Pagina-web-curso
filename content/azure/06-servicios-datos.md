---
titulo: Servicios de datos en Azure desde la CLI
nivel: Avanzado
duracion: 55
resumen: La arquitectura de referencia de un lakehouse en Azure, crear Databricks, Data Factory y Event Hubs desde la CLI, y llevar un proyecto dbt de tu terminal a Azure Databricks (profiles.yml, SQL warehouse, job con tarea dbt).
---

## Arquitectura de referencia (lakehouse en Azure)

```text
 Fuentes (ERP, APIs, archivos, eventos)
     │  Azure Data Factory (copia batch)     Event Hubs (streaming)
     ▼                                        ▼
 ADLS Gen2:  bronze  ──▶  silver  ──▶  gold        ← Azure Databricks (Spark + Delta + Unity Catalog)
                                         │           dbt (modelos SQL)   Airflow / Workflows (orquestación)
                                         ▼
                        Power BI / Databricks SQL / ML
 Transversal: Entra ID + RBAC, Key Vault, Azure Monitor, Cost Management
```

Cada servicio cumple un papel en ese recorrido:

| Etapa | Servicio | Qué hace | Equivalente en AWS / GCP |
|---|---|---|---|
| Ingesta batch | **Data Factory (ADF)** | Copia datos desde más de 100 conectores al lago, con orquestación visual | Glue / DMS · Data Transfer / Datastream |
| Ingesta streaming | **Event Hubs** | Recibe millones de eventos por segundo (compatible con Kafka) | Kinesis / MSK · Pub/Sub |
| Almacenamiento | **ADLS Gen2** | El lago: bronze, silver, gold | S3 · Cloud Storage |
| Proceso | **Azure Databricks** | Spark, Delta Lake, SQL, notebooks, jobs | EMR / Glue · Dataproc |
| Plataforma integrada | **Microsoft Fabric** | Lakehouse, warehouse y Power BI en un producto SaaS | — |
| Consumo | **Power BI** | Dashboards y reportes | QuickSight · Looker |
| Secretos | **Key Vault** | Contraseñas y tokens | Secrets Manager · Secret Manager |

<!-- dg:az06-ref -->
```diagrama
titulo: Lakehouse de referencia en Azure
nodo erp: ERP y bases | icono=base | col=0 | fila=0 | forma=cilindro
nodo ev: Eventos de la app | icono=movil | col=0 | fila=1
nodo adf: Data Factory | icono=engranaje | col=1 | fila=0 | color=azul | sub=copia por lotes
nodo eh: Event Hubs | icono=stream | col=1 | fila=1 | color=azul | sub=streaming
nodo adls: ADLS Gen2 | icono=bucket | col=2 | fila=0 | color=naranja | sub=bronze · silver · gold
nodo dbx: Azure Databricks | icono=spark | col=2 | fila=1 | color=rojo | sub=Spark + Unity Catalog
nodo pbi: Power BI | icono=dashboard | col=3 | fila=0 | color=amarillo
nodo kv: Key Vault | icono=candado | col=3 | fila=1 | color=gris | sub=secretos
flecha erp -> adf
flecha ev -> eh
flecha adf -> adls
flecha eh -> dbx
flecha adls <-> dbx: lee / escribe Delta
flecha dbx -> pbi: SQL warehouse
flecha kv -> dbx: credenciales | estilo=punteada
```

## Azure Databricks

```bash norun
az extension add --name databricks
az databricks workspace create \
  --resource-group rg-datos-dev --name dbw-datos-dev \
  --location eastus2 --sku premium
az databricks workspace show --resource-group rg-datos-dev --name dbw-datos-dev --query workspaceUrl -o tsv
```

El SKU **premium** es necesario para Unity Catalog, controles de acceso y la mayoría de las funciones empresariales.

## Azure Data Factory

```bash norun
az extension add --name datafactory
az datafactory create --resource-group rg-datos-dev --factory-name adf-datos-dev --location eastus2
az datafactory pipeline create-run --resource-group rg-datos-dev --factory-name adf-datos-dev --name pl_copiar_ventas
```

ADF es ideal para **copiar** datos de cientos de conectores (SQL Server on-premises, SAP, APIs, SFTP…) al data lake, con un Integration Runtime que puede vivir dentro de tu red.

## Event Hubs (streaming)

```bash norun
az eventhubs namespace create --resource-group rg-datos-dev --name evh-datos-dev --location eastus2 --sku Standard
az eventhubs eventhub create --resource-group rg-datos-dev --namespace-name evh-datos-dev --name clics --partition-count 4
```

Spark Structured Streaming lo consume con el conector de Kafka (Event Hubs es compatible con el protocolo Kafka).

## Etiquetas (tags) y costos

```bash norun
az group update --name rg-datos-dev --set tags.centro_costos=analitica tags.entorno=dev
az resource list --tag entorno=dev -o table
az consumption usage list --start-date 2024-12-01 --end-date 2024-12-31 -o table
```

## Pruébalo en la terminal

```bash
az login
az group create --name rg-datos-dev --location eastus2
az extension add --name databricks
az databricks workspace create --resource-group rg-datos-dev --name dbw-datos-dev --location eastus2 --sku premium
az databricks workspace show --resource-group rg-datos-dev --name dbw-datos-dev --query workspaceUrl -o tsv
az resource list --resource-group rg-datos-dev -o table
```

Sin el `az extension add`, el comando `az databricks` responde que no existe: prueba quitarlo para ver el error real. La URL que devuelve el `show` es la dirección del workspace; con ella configurarás la **Databricks CLI** en el módulo de Databricks (`databricks auth login --host https://…`).

## De dbt en tu terminal a Azure, paso a paso

En el módulo de dbt construiste un proyecto que corre en la terminal sobre una base local. Llevarlo a Azure no cambia los modelos: cambia **dónde** se ejecuta el SQL (un SQL warehouse de Azure Databricks) y **quién** lo ejecuta todos los días (un job). Estos son los pasos, según la documentación de Databricks.

**1. Crear el workspace y un SQL warehouse.** El workspace es el que creaste arriba con `az databricks workspace create`. Dentro de él, un **SQL warehouse** es el cómputo que va a ejecutar el SQL que genera dbt. Los workspaces nuevos traen un *Serverless Starter Warehouse*; su página *Connection details* muestra dos datos que vas a necesitar: el **Server hostname** (`adb-1234567890123456.7.azuredatabricks.net`) y el **HTTP path** (`/sql/1.0/warehouses/1a2b3c4d5e6f7a8b`).

```bash
databricks auth login --host https://adb-1234567890123456.7.azuredatabricks.net
databricks warehouses list
```

**2. Instalar el adaptador de Databricks en tu proyecto.** En el entorno virtual del proyecto (la documentación recomienda `dbt-databricks` 1.8 o más nuevo):

```bash norun
pip install "dbt-databricks>=1.8,<2.0"
```

**3. Agregar el destino en `profiles.yml`.** Tu perfil ya tenía un destino local; se agrega uno para Azure. La documentación recomienda OAuth en vez de un token personal, y no escribir secretos en el archivo:

```yaml norun
tienda_dbt:
  target: dev
  outputs:
    dev:                               # tu destino local de siempre
      type: duckdb
      path: tienda.duckdb
    azure:
      type: databricks
      host: adb-1234567890123456.7.azuredatabricks.net
      http_path: /sql/1.0/warehouses/1a2b3c4d5e6f7a8b
      catalog: main                    # el catálogo de Unity Catalog donde dbt crea las tablas
      schema: dbt_ana                  # tu esquema de desarrollo
      auth_type: oauth                 # abre el navegador la primera vez
      threads: 4                       # cuántos modelos construye en paralelo
```

**4. Probar la conexión y construir.** Con el warehouse encendido:

```bash norun
dbt debug --target azure               # "Connection test: OK connection ok"
dbt build --target azure               # los mismos modelos, ahora como tablas Delta en main.dbt_ana
```

Los datos de origen tienen que existir en Unity Catalog (por ejemplo, cargados en bronze por Data Factory o Auto Loader) y tu `sources.yml` debe apuntar a ese catálogo y esquema. Es el único archivo del proyecto que suele cambiar.

**5. Programarlo con un job.** En producción nadie corre `dbt build` desde su computadora. Un **Lakeflow Job** con una tarea de tipo **dbt** lo hace todos los días: toma el proyecto desde Git, ejecuta los comandos en orden sobre un SQL warehouse y usa como identidad el *Run as* del job (un *service principal*), que necesita permiso `CAN USE` sobre el warehouse y los privilegios de Unity Catalog sobre el catálogo. Definido como código en un bundle:

```yaml norun
# databricks.yml (fragmento)
resources:
  jobs:
    dbt_diario:
      name: dbt-diario
      schedule:
        quartz_cron_expression: "0 30 5 * * ?"     # todos los días a las 5:30
        timezone_id: America/Argentina/Buenos_Aires
      tasks:
        - task_key: dbt_build
          dbt_task:
            project_directory: ./
            commands: ["dbt deps", "dbt build --target prod"]
            warehouse_id: 1a2b3c4d5e6f7a8b
            catalog: main
            schema: analytics
          environment_key: dbt
      environments:
        - environment_key: dbt
          spec:
            dependencies: ["dbt-databricks>=1.8,<2.0"]
```

```bash norun
databricks bundle validate -t prod
databricks bundle deploy -t prod
databricks bundle run dbt_diario -t prod
```

La documentación recomienda **fijar la versión** de `dbt-databricks` para que desarrollo y producción usen la misma, y correr la parte de dbt en cómputo *serverless* o en un clúster de un solo nodo (el trabajo pesado lo hace el warehouse, no dbt).

| | En tu terminal | En Azure |
|---|---|---|
| Dónde corre el SQL | DuckDB o SQLite en tu máquina | SQL warehouse de Azure Databricks |
| Dónde quedan las tablas | Un archivo local | Tablas Delta en Unity Catalog (sobre ADLS Gen2) |
| Quién lo ejecuta | Tú, con `dbt build` | Un Lakeflow Job con tarea dbt, como service principal |
| Credenciales | Ninguna | OAuth (U2M para ti, M2M para el job) |
| Qué cambia en el proyecto | — | `profiles.yml` (destino nuevo) y `sources.yml` (catálogo de origen) |

:::errores
- **`dbt debug` falla con timeout**: el SQL warehouse está detenido; arráncalo o espera a que se encienda.
- **Copiar el host con `https://`** en `profiles.yml`: el adaptador espera solo el nombre (`adb-....azuredatabricks.net`).
- **El job falla con permiso denegado** aunque a ti te funciona: el *Run as* del job es otra identidad y necesita sus propios permisos sobre el warehouse y el catálogo.
- **Crear el workspace con SKU standard**: Unity Catalog y varias funciones de seguridad necesitan premium.
- **No fijar la versión del adaptador**: una actualización automática cambia el comportamiento entre un día y otro.
:::

:::trabajo
- El recorrido típico de un equipo: Data Factory o Lakeflow Connect cargan bronze, dbt transforma silver y gold en un SQL warehouse, un Lakeflow Job lo programa y Power BI lee gold. Todo definido en Git: Bicep o Terraform para la infraestructura, un bundle para los jobs.
- Los costos se controlan con etiquetas en el grupo de recursos y en los jobs, y con el apagado automático (*auto stop*) de los warehouses.
:::

:::entrevista "¿Cómo llevarías a producción en Azure un proyecto dbt que hoy corre en tu computadora?"
Instalaría el adaptador dbt-databricks con una versión fija y agregaría un destino en profiles.yml apuntando al SQL warehouse de Azure Databricks con OAuth, con las tablas en un catálogo de Unity Catalog. Ajustaría los sources al catálogo donde está bronze y probaría con dbt debug y dbt build. Para producción crearía un Lakeflow Job con una tarea dbt que toma el proyecto desde Git y ejecuta dbt deps y dbt build, con un service principal como Run as con permisos mínimos, definido en un bundle y desplegado desde CI. También usaría dbt build, para que un test que falla impida publicar datos malos.
:::

## Ejercicios

:::ejercicio cli
Crea un workspace de Azure Databricks llamado `dbw-datos-dev` en `rg-datos-dev`, región `eastus2`, con SKU `premium`.
```respuesta
todos: az databricks workspace create || (--resource-group|-g) rg-datos-dev || (--name|-n) dbw-datos-dev || (--location|-l) eastus2 || --sku premium
```
```solucion
az databricks workspace create --resource-group rg-datos-dev --name dbw-datos-dev --location eastus2 --sku premium
```
```setup
az group create --name rg-datos-dev --location eastus2
```
:::

:::ejercicio cli
Obtén **solo la URL** del workspace `dbw-datos-dev` (propiedad `workspaceUrl`) en formato `tsv`.
```respuesta
todos: az databricks workspace show || (--resource-group|-g) rg-datos-dev || (--name|-n) dbw-datos-dev || --query ['"]?workspaceUrl['"]? || (-o|--output) tsv
```
```solucion
az databricks workspace show --resource-group rg-datos-dev --name dbw-datos-dev --query workspaceUrl -o tsv
```
```salida
adb-1234567890123456.7.azuredatabricks.net
```
```setup
az group create --name rg-datos-dev --location eastus2
az extension add --name databricks
az databricks workspace create --resource-group rg-datos-dev --name dbw-datos-dev --location eastus2 --sku premium
```
:::

:::ejercicio cli
Crea un Data Factory llamado `adf-datos-dev` en `rg-datos-dev`, región `eastus2`.
```respuesta
todos: az datafactory create || (--resource-group|-g) rg-datos-dev || (--factory-name|--name|-n) adf-datos-dev || (--location|-l) eastus2
```
```solucion
az datafactory create --resource-group rg-datos-dev --factory-name adf-datos-dev --location eastus2
```
```setup
az group create --name rg-datos-dev --location eastus2
```
:::

:::ejercicio quiz
Tienes que copiar cada noche 300 tablas de un SQL Server que está dentro de la red de la empresa al data lake. ¿Qué servicio es el más adecuado?

- [ ] Event Hubs
- [x] Azure Data Factory (con un Self-hosted Integration Runtime)
- [ ] Key Vault
- [ ] Power BI
:::
