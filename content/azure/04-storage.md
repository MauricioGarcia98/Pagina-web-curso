---
titulo: Almacenamiento: Storage Accounts y ADLS Gen2
nivel: Intermedio
duracion: 40
resumen: Crear el data lake, contenedores, subir y listar archivos, autenticación con --auth-mode login y rutas abfss://.
---

## El data lake de Azure

En AWS el lago es S3 y en Google Cloud es Cloud Storage. En Azure es **Azure Data Lake Storage Gen2 (ADLS Gen2)**: una **Storage Account** (cuenta de almacenamiento) con una opción activada, el **espacio de nombres jerárquico** (*hierarchical namespace*, HNS). Esa opción es la que la convierte en un data lake de verdad:

| | Blob Storage común | ADLS Gen2 (HNS activado) |
|---|---|---|
| Carpetas | "Falsas": prefijos en el nombre, como en S3 | **Reales**: renombrar o borrar una carpeta es una sola operación |
| Permisos | Por contenedor | También por carpeta y archivo (ACL estilo POSIX) |
| Rendimiento con Spark | Bueno | Mejor (operaciones de carpetas atómicas) |
| Protocolo para Spark | `wasbs://` (antiguo) | `abfss://` |

La jerarquía es:

```text
Storage Account  stdatosdev001                      ← la cuenta (un recurso de Azure)
 └── Contenedor (file system)  bronze               ← como un bucket; uno por capa
      └── Carpetas  ventas/anio=2024/mes=12/        ← carpetas reales
           └── Archivo  ventas.parquet
```

## Crear la cuenta

```bash norun
az storage account create \
  --name stdatosdev001 \
  --resource-group rg-datos-dev \
  --location eastus2 \
  --sku Standard_LRS \
  --kind StorageV2 \
  --hns true
```

| Parámetro | Significa |
|---|---|
| `--name` | Nombre único en **todo Azure** (forma parte de la URL) |
| `--resource-group` | El grupo de recursos que la contiene |
| `--location` | La región |
| `--sku` | La **redundancia**: cuántas copias y dónde |
| `--kind StorageV2` | El tipo de cuenta moderno |
| `--hns true` | **Activa el hierarchical namespace** → ADLS Gen2. ¡No se puede cambiar después con facilidad! |

:::nota Nombres de cuentas de almacenamiento
Entre 3 y 24 caracteres, **solo minúsculas y números** (sin guiones), y únicos en todo Azure, porque forman parte de una URL pública: `https://stdatosdev001.dfs.core.windows.net`. Convención común: `st` + proyecto + entorno + número.
:::

### Redundancia (`--sku`)

| SKU | Copias | Protege contra | Uso típico |
|---|---|---|---|
| `Standard_LRS` | 3 en un datacenter | Falla de un disco o servidor | Desarrollo, datos que se pueden regenerar |
| `Standard_ZRS` | 3 en 3 zonas de la región | Caída de un datacenter | Producción |
| `Standard_GRS` | 6: 3 locales + 3 en otra región | Desastre regional | Datos críticos |

## Contenedores (file systems) y carpetas

Un **contenedor** es la división de primer nivel de la cuenta (en ADLS Gen2 también se llama *file system*). Lo habitual es un contenedor por capa del lakehouse:

```bash norun
# Contenedores para las capas del lakehouse
for capa in bronze silver gold; do
  az storage container create --name $capa --account-name stdatosdev001 --auth-mode login
done

# En ADLS Gen2 también existe el grupo "fs" (file system), con carpetas reales
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

- `--name` es la **ruta dentro del contenedor** (con carpetas); `--file` es el archivo **local**.
- `upload-batch` sube una carpeta entera.
- En la práctica, las cargas grandes las hace **azcopy** (otra herramienta de Microsoft, mucho más rápida) o un servicio como Data Factory; la CLI es para operaciones puntuales y scripts.

```recorrido
titulo: De la cuenta de almacenamiento a la ruta que usa Spark
estacion cuenta: Cuenta | icono=base
estacion cont: Contenedor | icono=cubo
estacion subir: Subir | icono=transformar
estacion lista: Listar | icono=lupa
estacion ruta: Ruta abfss | icono=check
paso cuenta: La cuenta, con espacio de nombres jerárquico
`--hns true` convierte la cuenta en **ADLS Gen2**: carpetas de verdad (renombrar una carpeta es una operación, no miles). Fíjate en el endpoint `dfs`: es el que usa Spark.
>>> json
{
  "nombre": "stdatosdev001",
  "adls": true,
  "dfs": "https://stdatosdev001.dfs.core.windows.net/"
}
paso cont: Un contenedor por capa
El contenedor (en ADLS se llama *file system*) es el primer nivel: `bronze`, `silver`, `gold`.
>>> log
$ az storage fs create --name bronze --account-name stdatosdev001 --auth-mode login
{
  "created": true
}
paso subir: Subir un archivo
`--name` es la ruta dentro del contenedor. `--auth-mode login` usa **tu** identidad (y tus roles), sin claves de la cuenta.
>>> log
$ az storage blob upload --account-name stdatosdev001 --container-name bronze \
    --name ventas/2024/ventas_2024-12.csv --file ventas_2024-12.csv --auth-mode login
Finished[#############################################################]  100.0000%
paso lista: Verificar
El archivo quedó en `bronze`, en la carpeta `ventas/2024/`.
>>> log
$ az storage blob list --account-name stdatosdev001 --container-name bronze --output table --auth-mode login
Name
------------------------------
ventas/2024/ventas_2024-12.csv
paso ruta: La misma ubicación, vista desde Spark
Spark y Databricks leen con el protocolo `abfss`: **contenedor @ cuenta** . dfs.core.windows.net / ruta.
>>> python
df = spark.read.csv(
    "abfss://bronze@stdatosdev001.dfs.core.windows.net/ventas/2024/",
    header=True)
```

## Autenticación: --auth-mode login

Cada comando de datos necesita saber **con qué credencial** acceder. Hay tres opciones:

| Forma | Seguridad | Comentario |
|---|---|---|
| `--auth-mode login` | ✅ Recomendada | Usa tu identidad de Entra ID y permisos RBAC (`Storage Blob Data Contributor`) |
| Account key | ⚠️ | Llave maestra con acceso total a toda la cuenta. Evítala; si se filtra, hay que rotarla |
| SAS token | ⚠️ con cuidado | Acceso limitado (a un contenedor, solo lectura…) y con vencimiento. Útil para compartir algo puntual |

Si no pones `--auth-mode login`, la CLI intenta buscar la **account key**, lo que requiere permisos de administración y te muestra una advertencia.

:::cuidado Tener Owner no alcanza
Para leer o escribir **datos** con `--auth-mode login` necesitas un rol **de datos**, como **Storage Blob Data Contributor** o **Storage Blob Data Reader**. Los roles Owner y Contributor administran el **recurso** (crearlo, borrarlo, cambiar su configuración), no los **datos** que contiene. Es la causa número uno del error "This request is not authorized to perform this operation".
:::

## Las rutas desde Spark / Databricks

```text
abfss://<contenedor>@<cuenta>.dfs.core.windows.net/<ruta>
abfss://bronze@stdatosdev001.dfs.core.windows.net/ventas/2024/
```

`abfss` = *Azure Blob File System, Secure*. Desde PySpark se lee igual que cualquier ruta: `spark.read.parquet("abfss://silver@stdatosdev001.dfs.core.windows.net/pedidos/")`. En Databricks con Unity Catalog se registran como **External Locations** (con una *storage credential* basada en una identidad administrada) y se accede vía tablas externas o **Volumes**, sin manejar llaves.

## Laboratorio: tu data lake en Azure

Ejecuta en la terminal (crea todo desde cero; si ya existe algo, verás el error real de Azure):

```bash
az login
az group create --name rg-datos-dev --location eastus2
az storage account create --name stdatosdev001 --resource-group rg-datos-dev --location eastus2 --sku Standard_LRS --kind StorageV2 --hns true --query "{nombre:name, hns:isHnsEnabled}"
az storage container create --name bronze --account-name stdatosdev001 --auth-mode login
az storage blob upload --account-name stdatosdev001 --container-name bronze --name clientes/clientes.csv --file datos/clientes.csv --auth-mode login
az storage blob list --account-name stdatosdev001 --container-name bronze --output table --auth-mode login
```

## Resumen

- ADLS Gen2 = Storage Account con `--hns true`: carpetas reales y permisos finos; es el lago de Azure.
- Nombres de cuenta: 3–24 caracteres, minúsculas y números, únicos globalmente.
- Un contenedor por capa (bronze, silver, gold); `az storage blob upload/list/download`.
- Usa `--auth-mode login` con un rol de **datos** (Storage Blob Data Contributor).
- Desde Spark: `abfss://contenedor@cuenta.dfs.core.windows.net/ruta`.

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
```setup
az group create --name rg-datos-dev --location eastus2
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
```setup
az group create --name rg-datos-dev --location eastus2
az storage account create --name stdatosdev001 --resource-group rg-datos-dev --location eastus2 --sku Standard_LRS --kind StorageV2 --hns true
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
```setup
az group create --name rg-datos-dev --location eastus2
az storage account create --name stdatosdev001 --resource-group rg-datos-dev --location eastus2 --sku Standard_LRS --kind StorageV2 --hns true
az storage container create --name bronze --account-name stdatosdev001 --auth-mode login
cp datos/clientes.csv clientes.csv
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
```setup
az group create --name rg-datos-dev --location eastus2
az storage account create --name stdatosdev001 --resource-group rg-datos-dev --location eastus2 --sku Standard_LRS --kind StorageV2 --hns true
az storage container create --name bronze --account-name stdatosdev001 --auth-mode login
az storage blob upload --account-name stdatosdev001 --container-name bronze --name clientes/clientes.csv --file datos/clientes.csv --auth-mode login
```
:::

:::ejercicio quiz
¿Cuál es la ruta correcta para leer desde Spark la carpeta `ventas/` del contenedor `bronze` de la cuenta `stdatosdev001`?

- [ ] `https://bronze/stdatosdev001/ventas`
- [x] `abfss://bronze@stdatosdev001.dfs.core.windows.net/ventas/`
- [ ] `dbfs:/bronze/ventas`
- [ ] `s3://stdatosdev001/bronze/ventas`
:::
