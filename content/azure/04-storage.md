---
titulo: Almacenamiento: Storage Accounts y ADLS Gen2
nivel: Intermedio
duracion: 35
resumen: Crear el data lake, contenedores, subir y listar archivos, autenticación con --auth-mode login y rutas abfss://.
---

## Cuenta de almacenamiento con hierarchical namespace

**Azure Data Lake Storage Gen2** es una Storage Account con el **espacio de nombres jerárquico** activado (carpetas reales, permisos POSIX, renombrados atómicos). Es la base de cualquier lakehouse en Azure.

```bash norun
az storage account create \
  --name stdatosdev001 \
  --resource-group rg-datos-dev \
  --location eastus2 \
  --sku Standard_LRS \
  --kind StorageV2 \
  --hns true
```

:::nota Nombres de cuentas de almacenamiento
Entre 3 y 24 caracteres, **solo minúsculas y números**, y únicos en todo Azure (forman parte de una URL: `https://stdatosdev001.dfs.core.windows.net`).
:::

Redundancia (`--sku`): `Standard_LRS` (3 copias en un datacenter), `Standard_ZRS` (en 3 zonas), `Standard_GRS` (y otra región).

## Contenedores (file systems) y carpetas

```bash norun
# Contenedores para las capas del lakehouse
for capa in bronze silver gold; do
  az storage container create --name $capa --account-name stdatosdev001 --auth-mode login
done

# En ADLS Gen2 también: az storage fs (file system)
az storage fs directory create --name ventas/2024 --file-system bronze --account-name stdatosdev001 --auth-mode login
```

## Subir, listar y descargar

```bash norun
az storage blob upload \
  --account-name stdatosdev001 --container-name bronze \
  --name ventas/2024/ventas_2024-03-15.csv --file ./ventas_2024-03-15.csv \
  --auth-mode login

az storage blob upload-batch --account-name stdatosdev001 --destination bronze/ventas --source ./exportes --auth-mode login

az storage blob list --account-name stdatosdev001 --container-name bronze --output table --auth-mode login

az storage blob download --account-name stdatosdev001 --container-name bronze \
  --name ventas/2024/ventas_2024-03-15.csv --file ./copia.csv --auth-mode login
```

## Autenticación: --auth-mode login

| Forma | Seguridad | Comentario |
|---|---|---|
| `--auth-mode login` | ✅ Recomendada | Usa tu identidad de Entra ID y permisos RBAC (`Storage Blob Data Contributor`) |
| Account key | ⚠️ | Llave maestra con acceso total. Evítala; si se filtra, rótala |
| SAS token | ⚠️ con cuidado | Acceso limitado y con vencimiento. Útil para compartir algo puntual |

:::cuidado Tener Owner no alcanza
Para leer o escribir **datos** con `--auth-mode login` necesitas un rol de datos, como **Storage Blob Data Contributor**. Los roles Owner/Contributor administran el recurso, no los datos.
:::

## Las rutas desde Spark / Databricks

```text
abfss://<contenedor>@<cuenta>.dfs.core.windows.net/<ruta>
abfss://bronze@stdatosdev001.dfs.core.windows.net/ventas/2024/
```

En Databricks con Unity Catalog se registran como **External Locations** (con una *storage credential* basada en una Managed Identity) y se accede vía tablas externas o **Volumes**.

## Ejercicios

:::ejercicio cli
Crea la cuenta de almacenamiento `stdatosdev001` en el grupo `rg-datos-dev`, región `eastus2`, SKU `Standard_LRS`, con **hierarchical namespace** activado (ADLS Gen2).
```respuesta
todos: az storage account create || (--name|-n) stdatosdev001 || (--resource-group|-g) rg-datos-dev || (--location|-l) eastus2 || --sku Standard_LRS || (--hns|--enable-hierarchical-namespace)( true)?
```
```solucion
az storage account create --name stdatosdev001 --resource-group rg-datos-dev --location eastus2 --sku Standard_LRS --kind StorageV2 --hns true
```
```pista
Parámetros: `--name`, `--resource-group`, `--location`, `--sku Standard_LRS` y `--hns true` (opcionalmente `--kind StorageV2`).
```
:::

:::ejercicio cli
Crea el contenedor `silver` en la cuenta `stdatosdev001` autenticándote con tu identidad (no con la llave).
```respuesta
todos: az storage container create || (--name|-n) silver || --account-name stdatosdev001 || --auth-mode login
todos: az storage fs create || (--name|-n) silver || --account-name stdatosdev001 || --auth-mode login
```
```solucion
az storage container create --name silver --account-name stdatosdev001 --auth-mode login
```
:::

:::ejercicio cli
Sube el archivo local `./clientes.csv` al contenedor `bronze` de la cuenta `stdatosdev001`, con el nombre `clientes/clientes.csv`, usando `--auth-mode login`.
```respuesta
todos: az storage blob upload || --account-name stdatosdev001 || (--container-name|-c) bronze || (--name|-n) clientes/clientes\.csv || (--file|-f) (\./)?clientes\.csv || --auth-mode login
```
```solucion
az storage blob upload --account-name stdatosdev001 --container-name bronze --name clientes/clientes.csv --file ./clientes.csv --auth-mode login
```
:::

:::ejercicio cli
Lista en formato tabla los archivos del contenedor `bronze` de la cuenta `stdatosdev001` (con `--auth-mode login`).
```respuesta
todos: az storage blob list || --account-name stdatosdev001 || (--container-name|-c) bronze || (--output|-o) table || --auth-mode login
```
```solucion
az storage blob list --account-name stdatosdev001 --container-name bronze --output table --auth-mode login
```
:::

:::ejercicio quiz
¿Cuál es la ruta correcta para leer desde Spark la carpeta `ventas/` del contenedor `bronze` de la cuenta `stdatosdev001`?

- [ ] `https://bronze/stdatosdev001/ventas`
- [x] `abfss://bronze@stdatosdev001.dfs.core.windows.net/ventas/`
- [ ] `dbfs:/bronze/ventas`
- [ ] `s3://stdatosdev001/bronze/ventas`
:::
