---
titulo: Servicios de datos en Azure desde la CLI
nivel: Avanzado
duracion: 30
resumen: Crear un workspace de Databricks, Data Factory y Event Hubs, y una arquitectura de referencia.
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
