---
titulo: Azure CLI: instalación y primeros comandos
nivel: Básico
duracion: 30
resumen: Instalar az, iniciar sesión, elegir suscripción, ayuda, extensiones y configuración por defecto.
---

## Por qué la terminal y no el portal

Azure tiene una web muy completa, el **portal** (portal.azure.com), donde todo se hace con clics. Para aprender a "ver" los servicios es ideal. Pero en el trabajo de datos casi todo se hace con la **Azure CLI** (el comando `az`), por tres motivos:

| Portal (clics) | CLI (`az`) |
|---|---|
| Para crear 3 contenedores, haces 3 veces los mismos clics | Un bucle de una línea |
| No queda registro de qué hiciste ni en qué orden | Los comandos se guardan en un **script**, se versionan en Git y se repiten idénticos en dev y prod |
| No se puede automatizar | Se ejecuta desde pipelines de CI/CD, Airflow o tareas programadas |
| Ideal para explorar | Ideal para **trabajar** |

La CLI también está disponible directamente en el navegador con **Azure Cloud Shell** (el botón `>_` del portal): una terminal ya autenticada, sin instalar nada.

## Instalación

```bash norun
# Windows (PowerShell)
winget install -e --id Microsoft.AzureCLI

# macOS
brew update && brew install azure-cli

# Linux (Debian/Ubuntu)
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

az version
```

## Iniciar sesión y elegir la suscripción

```bash norun
az login                                    # abre el navegador para autenticarte
az login --use-device-code                  # si no hay navegador (servidores, SSH): te da un código para usar en otro dispositivo
az account show                             # suscripción activa
az account list --output table              # todas tus suscripciones
az account set --subscription "sub-datos-dev"
```

Qué pasa en cada paso:

1. `az login` te autentica con tu cuenta de **Microsoft Entra ID** (el directorio de identidades de la empresa). Las credenciales quedan guardadas (cifradas) en tu carpeta personal y duran hasta que expiran.
2. Al terminar, muestra en JSON las **suscripciones** a las que tienes acceso. Una es la **activa** (`"isDefault": true`): todos los comandos que ejecutes van a **esa** suscripción.
3. `az account set` cambia la activa. Antes de crear o borrar algo, verifica **siempre** en qué suscripción estás con `az account show`: crear recursos de prueba en la suscripción de producción es un error clásico (y caro).

:::nota Usuarios, aplicaciones e identidades administradas
`az login` es para **personas**. Los programas (un pipeline de CI, un job de Databricks) se autentican con un **service principal** (`az login --service-principal …`) o, mejor aún, con una **identidad administrada** (*managed identity*) que Azure gestiona sin contraseñas. Lo verás en la lección de identidad y seguridad.
:::

## La estructura de todos los comandos

```text
az  <grupo>  <subgrupo>  <acción>  --parametros
az  storage  account     create    --name stdatos --resource-group rg-datos-dev
az  group                list      --output table
az  keyvault secret      show      --vault-name kv-datos --name token
```

Los grupos siguen los servicios de Azure (`group`, `storage`, `keyvault`, `databricks`, `datafactory`…) y las acciones casi siempre son las mismas: `create`, `list`, `show`, `update`, `delete`. Una vez que aprendes el patrón con un servicio, adivinas los demás.

Todas las respuestas son **JSON**. Con `--output table` (o `-o table`) se ven como tabla, y con `--query` se filtran (lección siguiente).

## Ayuda y descubrimiento

No hace falta memorizar parámetros:

```bash norun
az --help
az storage --help
az storage account create --help            # todos los parámetros, cuáles son obligatorios y ejemplos
az find "crear cuenta de almacenamiento"    # busca ejemplos reales
```

## Extensiones y configuración

Algunos servicios (Databricks, Data Factory…) se gestionan con **extensiones**: módulos adicionales de la CLI que se instalan aparte.

```bash norun
az extension add --name databricks
az extension list --output table
az config set extension.use_dynamic_install=yes_without_prompt   # instala extensiones automáticamente cuando hacen falta
az configure --defaults group=rg-datos-dev location=eastus2     # valores por defecto: ya no hace falta escribir -g ni -l
az upgrade                                                       # actualizar la CLI
```

## Pruébalo en la terminal

La terminal del curso simula la Azure CLI con estado: lo que creas queda guardado (en tu navegador) y los errores se parecen a los reales.

```bash
az login
az account show
az account list --output table
az account set --subscription sub-datos-prod
az account show --query name -o tsv
az account set --subscription sub-datos-dev
```

## Resumen

- `az` permite automatizar y versionar todo lo que harías en el portal.
- `az login` (personas) → suscripción activa; verifica siempre con `az account show` antes de crear o borrar.
- Patrón: `az <servicio> <subgrupo> <acción> --parámetros`; respuestas en JSON, `-o table` para leer.
- `--help` y `az find` para descubrir; extensiones para servicios como Databricks.

## Ejercicios

:::ejercicio cli
Inicia sesión en Azure desde la terminal.
```respuesta
az login
```
:::

:::ejercicio cli
Inicia sesión en un servidor **sin navegador** usando un código de dispositivo.
```respuesta
az login --use-device-code
```
:::

:::ejercicio cli
Lista todas tus suscripciones en formato **tabla**.
```respuesta
az account list (--output|-o) table
```
```solucion
az account list --output table
```
```salida
Name             CloudName    SubscriptionId                        State    IsDefault
---------------  -----------  ------------------------------------  -------  -----------
sub-datos-dev    AzureCloud   1111aaaa-0000-0000-0000-000000000000  Enabled  True
sub-datos-prod   AzureCloud   2222bbbb-0000-0000-0000-000000000000  Enabled  False
```
:::

:::ejercicio cli
Cambia la suscripción activa a `sub-datos-prod`.
```respuesta
az account set (--subscription|-s|--name|-n) ['"]?sub-datos-prod['"]?
```
```solucion
az account set --subscription "sub-datos-prod"
```
:::

:::ejercicio cli
Instala la extensión de la CLI para administrar **Databricks**.
```respuesta
az extension add (--name|-n) databricks
```
```solucion
az extension add --name databricks
```
:::

:::ejercicio cli
Configura como valores por defecto el grupo de recursos `rg-datos-dev` y la región `eastus2`.
```respuesta
az configure (--defaults|-d) group=rg-datos-dev location=eastus2
az configure (--defaults|-d) location=eastus2 group=rg-datos-dev
```
```solucion
az configure --defaults group=rg-datos-dev location=eastus2
```
:::
