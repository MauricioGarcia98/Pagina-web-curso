---
titulo: Automatización: scripts e infraestructura como código
nivel: Experto
duracion: 35
resumen: Scripts bash idempotentes con az, Bicep y Terraform, despliegues y CI/CD con GitHub Actions.
---

Hacer clics en el portal no es repetible ni auditable. En equipos profesionales la infraestructura se crea con **código**.

## Un script de aprovisionamiento con az

```bash norun
#!/usr/bin/env bash
set -euo pipefail                      # cortar ante cualquier error

ENTORNO=${1:-dev}
UBICACION=eastus2
RG="rg-datos-$ENTORNO"
ST="stdatos${ENTORNO}001"
KV="kv-datos-$ENTORNO"

az group create -n "$RG" -l "$UBICACION" --tags entorno="$ENTORNO" proyecto=tienda -o none
az storage account create -n "$ST" -g "$RG" -l "$UBICACION" --sku Standard_LRS --kind StorageV2 --hns true -o none
for capa in bronze silver gold; do
  az storage container create -n "$capa" --account-name "$ST" --auth-mode login -o none
done
az keyvault create -n "$KV" -g "$RG" -l "$UBICACION" -o none
echo "✔ Entorno $ENTORNO listo"
```

`create` en Azure suele ser **idempotente**: si el recurso ya existe con la misma configuración, no falla. Igual, verifica con `az ... show` antes de acciones destructivas.

## Infraestructura como código (IaC)

**Bicep** (de Microsoft) y **Terraform** (multi-nube) describen el estado deseado; la herramienta calcula qué crear, cambiar o borrar.

```bicep norun
// main.bicep
param entorno string = 'dev'
param ubicacion string = resourceGroup().location

resource lake 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: 'stdatos${entorno}001'
  location: ubicacion
  sku: { name: 'Standard_LRS' }
  kind: 'StorageV2'
  properties: { isHnsEnabled: true }
  tags: { entorno: entorno }
}
```

```bash norun
az deployment group what-if --resource-group rg-datos-dev --template-file main.bicep --parameters entorno=dev
az deployment group create  --resource-group rg-datos-dev --template-file main.bicep --parameters entorno=dev
```

`what-if` muestra los cambios **antes** de aplicarlos (como `terraform plan`).

## CI/CD con GitHub Actions (OIDC, sin secretos)

```yaml norun
name: desplegar-infra
on: { push: { branches: [main] } }
permissions: { id-token: write, contents: read }
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
      - run: az deployment group create -g rg-datos-prod -f infra/main.bicep -p entorno=prod
```

## Ejercicios

:::ejercicio cli
Previsualiza (sin aplicar) los cambios del template `main.bicep` en el grupo `rg-datos-dev`.
```respuesta
todos: az deployment group what-if || (--resource-group|-g) rg-datos-dev || (--template-file|-f) main\.bicep
```
```solucion
az deployment group what-if --resource-group rg-datos-dev --template-file main.bicep
```
```setup
az group create --name rg-datos-dev --location eastus2
echo "param location string = resourceGroup().location" > main.bicep
```
:::

:::ejercicio cli
Despliega `main.bicep` en `rg-datos-prod` con el parámetro `entorno=prod`.
```respuesta
todos: az deployment group create || (--resource-group|-g) rg-datos-prod || (--template-file|-f) main\.bicep || (--parameters|-p) entorno=prod
```
```solucion
az deployment group create --resource-group rg-datos-prod --template-file main.bicep --parameters entorno=prod
```
```setup
az group create --name rg-datos-prod --location eastus2
echo "param entorno string" > main.bicep
```
:::

:::ejercicio abierto
Escribe un script bash que reciba el entorno como primer argumento (`dev` por defecto) y cree el grupo de recursos `rg-datos-<entorno>` en `eastus2` y una cuenta ADLS Gen2 `stdatos<entorno>001` con los contenedores `bronze`, `silver` y `gold`. Compáralo con la respuesta modelo.
```bash solucion
#!/usr/bin/env bash
set -euo pipefail
ENTORNO=${1:-dev}
RG="rg-datos-$ENTORNO"
ST="stdatos${ENTORNO}001"
az group create -n "$RG" -l eastus2 -o none
az storage account create -n "$ST" -g "$RG" -l eastus2 --sku Standard_LRS --kind StorageV2 --hns true -o none
for capa in bronze silver gold; do
  az storage container create -n "$capa" --account-name "$ST" --auth-mode login -o none
done
```
:::

:::ejercicio quiz
¿Qué ventaja principal tiene la infraestructura como código frente a crear recursos en el portal?

- [ ] Es más barata
- [x] Es repetible, versionable en Git, revisable en PRs y permite recrear entornos idénticos
- [ ] No necesita permisos
- [ ] Funciona sin internet
:::
