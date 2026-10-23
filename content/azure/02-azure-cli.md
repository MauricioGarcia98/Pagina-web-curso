---
titulo: Azure CLI: instalación y primeros comandos
nivel: Básico
duracion: 25
resumen: Instalar az, iniciar sesión, elegir suscripción, ayuda, extensiones y configuración por defecto.
---

La **Azure CLI** (`az`) permite crear y administrar todo Azure desde la terminal. Es **scriptable** (automatizable), repetible y mucho más rápida que hacer clics en el portal. También la tienes lista en el navegador con **Azure Cloud Shell** (botón `>_` del portal).

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
az login --use-device-code                  # si no hay navegador (servidores, SSH)
az account show                             # suscripción activa
az account list --output table              # todas tus suscripciones
az account set --subscription "sub-datos-dev"
```

## Estructura de los comandos

```text
az  <grupo>  <subgrupo>  <acción>  --parametros
az  storage  account     create    --name stdatos --resource-group rg-datos-dev
```

## Ayuda y descubrimiento

```bash norun
az --help
az storage --help
az storage account create --help            # parámetros y ejemplos
az find "crear cuenta de almacenamiento"    # busca ejemplos
```

## Extensiones y configuración

Algunos servicios (Databricks, Data Factory…) se gestionan con **extensiones**:

```bash norun
az extension add --name databricks
az extension list --output table
az config set extension.use_dynamic_install=yes_without_prompt   # instala extensiones automáticamente
az configure --defaults group=rg-datos-dev location=eastus2     # valores por defecto
az upgrade                                                       # actualizar la CLI
```

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
