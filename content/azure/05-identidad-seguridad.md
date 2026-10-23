---
titulo: Identidad, permisos (RBAC) y Key Vault
nivel: Avanzado
duracion: 35
resumen: Usuarios, service principals, managed identities, roles RBAC, alcance y secretos con Key Vault.
---

## ¿Quién accede? Tipos de identidad

| Identidad | Qué es | Uso típico |
|---|---|---|
| **Usuario** | Una persona en Entra ID | Tú, trabajando en el portal o con `az login` |
| **Grupo** | Conjunto de usuarios | Dar permisos al “equipo de datos” y no persona por persona |
| **Service principal** | Identidad de una **aplicación** (con secreto o certificado) | Pipelines de CI/CD (GitHub Actions), herramientas externas |
| **Managed identity** | Identidad que Azure gestiona **sin secretos** para un recurso | Databricks, Data Factory o una VM accediendo al data lake o Key Vault |

:::tip Preferí managed identities
No tienen contraseñas que rotar ni que se puedan filtrar. Úsalas siempre que el servicio lo permita. Para GitHub Actions, usa **federated credentials (OIDC)** en lugar de secretos.
:::

## RBAC: quién puede hacer qué, dónde

Un **role assignment** = **identidad** + **rol** + **alcance (scope)**.

| Rol | Permite |
|---|---|
| `Owner` | Todo, incluido dar permisos |
| `Contributor` | Crear y administrar recursos, pero no dar permisos |
| `Reader` | Solo ver |
| `Storage Blob Data Contributor` | Leer/escribir **datos** en blobs/ADLS |
| `Storage Blob Data Reader` | Solo leer datos |
| `Key Vault Secrets User` | Leer secretos |

El **alcance** puede ser una suscripción, un grupo de recursos o un recurso concreto. Se hereda hacia abajo. Aplica el **principio de mínimo privilegio**: el rol más chico en el alcance más chico.

```bash norun
# Service principal para el pipeline de CI, con Contributor solo sobre un grupo de recursos
az ad sp create-for-rbac --name sp-ci-datos --role Contributor \
  --scopes /subscriptions/$SUB_ID/resourceGroups/rg-datos-dev

# Dar permiso de datos sobre la cuenta de almacenamiento a un grupo de Entra ID
ST_ID=$(az storage account show --name stdatosdev001 --resource-group rg-datos-dev --query id -o tsv)
az role assignment create --assignee "equipo-datos@empresa.com" \
  --role "Storage Blob Data Contributor" --scope $ST_ID

az role assignment list --scope $ST_ID -o table
```

## Key Vault: el lugar de los secretos

```bash norun
az keyvault create --name kv-datos-dev --resource-group rg-datos-dev --location eastus2
az keyvault secret set --vault-name kv-datos-dev --name sql-password --value "S3cr3t0!"
az keyvault secret show --vault-name kv-datos-dev --name sql-password --query value -o tsv
az keyvault secret list --vault-name kv-datos-dev -o table
```

En Databricks, un **secret scope respaldado por Key Vault** permite leer esos secretos en notebooks con `dbutils.secrets.get(scope="kv", key="sql-password")`, sin que el valor aparezca nunca en pantalla. Airflow puede usar Key Vault como backend de Connections y Variables.

## Ejercicios

:::ejercicio cli
Crea un Key Vault llamado `kv-datos-dev` en el grupo `rg-datos-dev`, región `eastus2`.
```respuesta
todos: az keyvault create || (--name|-n) kv-datos-dev || (--resource-group|-g) rg-datos-dev || (--location|-l) eastus2
```
```solucion
az keyvault create --name kv-datos-dev --resource-group rg-datos-dev --location eastus2
```
```setup
az group create --name rg-datos-dev --location eastus2
```
:::

:::ejercicio cli
Guarda en `kv-datos-dev` el secreto `databricks-token` con el valor `dapi123`.
```respuesta
todos: az keyvault secret set || --vault-name kv-datos-dev || (--name|-n) databricks-token || --value ['"]?dapi123['"]?
```
```solucion
az keyvault secret set --vault-name kv-datos-dev --name databricks-token --value "dapi123"
```
```setup
az group create --name rg-datos-dev --location eastus2
az keyvault create --name kv-datos-dev --resource-group rg-datos-dev --location eastus2
```
:::

:::ejercicio cli
Muestra **solo el valor** del secreto `databricks-token` de `kv-datos-dev`, en formato `tsv`.
```respuesta
todos: az keyvault secret show || --vault-name kv-datos-dev || (--name|-n) databricks-token || --query ['"]?value['"]? || (-o|--output) tsv
```
```solucion
az keyvault secret show --vault-name kv-datos-dev --name databricks-token --query value -o tsv
```
```setup
az group create --name rg-datos-dev --location eastus2
az keyvault create --name kv-datos-dev --resource-group rg-datos-dev --location eastus2
az keyvault secret set --vault-name kv-datos-dev --name databricks-token --value dapi123
```
:::

:::ejercicio cli
Asigna al usuario `ana@empresa.com` el rol `Storage Blob Data Reader` sobre el alcance guardado en la variable `$ST_ID`.
```respuesta
todos: az role assignment create || --assignee ['"]?ana@empresa\.com['"]? || --role ['"]Storage Blob Data Reader['"] || --scope ['"]?\$ST_ID['"]?
```
```solucion
az role assignment create --assignee ana@empresa.com --role "Storage Blob Data Reader" --scope $ST_ID
```
```setup
az group create --name rg-datos-dev --location eastus2
az storage account create --name stdatosdev001 --resource-group rg-datos-dev --location eastus2 --sku Standard_LRS --kind StorageV2 --hns true
ST_ID=$(az storage account show --name stdatosdev001 --resource-group rg-datos-dev --query id -o tsv)
```
:::

:::ejercicio quiz
Un workspace de Databricks necesita leer el data lake. ¿Qué identidad es la más segura?

- [ ] Tu usuario personal
- [ ] La account key de la cuenta de almacenamiento
- [x] Una managed identity (Access Connector) con el rol Storage Blob Data Contributor
- [ ] Un SAS token sin vencimiento
:::

:::ejercicio quiz
Tienes rol **Owner** sobre la cuenta de almacenamiento pero `az storage blob list --auth-mode login` falla con “no autorizado”. ¿Por qué?

- [ ] Owner no existe
- [x] Owner administra el recurso, pero para leer datos hace falta un rol de datos (Storage Blob Data Reader/Contributor)
- [ ] Hay que usar `--auth-mode key` siempre
- [ ] La CLI está desactualizada
:::
