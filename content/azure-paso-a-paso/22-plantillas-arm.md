---
titulo: Plantillas ARM - la infraestructura como código
nivel: 6 · Avanzado completo
duracion: 60
resumen: Hasta ahora creaste todo a mano. En producción la infraestructura se describe en un archivo que se guarda en Git y se despliega siempre igual. Lees una plantilla ARM completa con parámetros, variables, funciones y recursos dependientes, la despliegas con un error a propósito, la corriges, creas un entorno qa entero (lago con sus tres capas, key vault y data factory) en un solo despliegue y lo borras al terminar.
objetivos: Leer la estructura de una plantilla ARM | Usar parámetros, variables y funciones de plantilla | Desplegar una plantilla personalizada desde el portal | Interpretar un error de validación de plantilla | Explicar idempotencia y el modo incremental
prerrequisitos: azure-paso-a-paso-proyecto-endurecer-el-lago
autoevaluacion: ¿Sabes para qué sirven parameters y variables? | ¿Sabes qué devuelve resourceGroup().location? | ¿Sabes qué pasa si despliegas la misma plantilla dos veces? | ¿Sabes qué relación hay entre ARM, Bicep y Terraform?
---

:::escenario El pedido
Lucía: *"Necesitamos un entorno qa igual a dev para probar antes de producción, y después producción. Nada a mano: quiero una plantilla en Git que cree el lago, el vault y el factory, y que sirva para cualquier entorno cambiando un parámetro."*
:::

:::analogia Un plano en vez de construir a mano
Una plantilla ARM es el plano del edificio: describe qué recursos van y cómo. Desplegarla dos veces no hace dos edificios: Azure compara el plano con lo que existe y solo agrega o cambia lo que falta (es idempotente).
:::

## Paso 1 — Qué es una plantilla ARM

**Azure Resource Manager (ARM)** es la API por la que pasa todo lo que creas en Azure, desde el portal, la CLI o cualquier herramienta. Una **plantilla ARM** es un JSON que describe el **estado deseado**: "quiero que existan estos recursos con esta configuración". Azure compara con lo que ya hay y crea o actualiza lo necesario.

| Ventaja | Por qué importa |
|---|---|
| **Repetible** | dev, qa y prod salen idénticos, cambiando solo parámetros |
| **Versionada** | Vive en Git: se revisa en un pull request y se sabe quién cambió qué |
| **Idempotente** | Desplegarla dos veces no duplica nada |
| **Documentación viva** | El archivo *es* la descripción de la plataforma |

## Paso 2 — La plantilla de Tienda Andina

```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "entorno": {
      "type": "string",
      "defaultValue": "qa",
      "allowedValues": [
        "dev",
        "qa",
        "prod"
      ],
      "metadata": {
        "description": "Entorno a desplegar"
      }
    },
    "location": {
      "type": "string",
      "defaultValue": "[resourceGroup().location]"
    }
  },
  "variables": {
    "sufijo": "[concat('tiendaandina', parameters('entorno'))]",
    "storageName": "[concat('st', variables('sufijo'))]",
    "vaultName": "[concat('kv-tiendaandina-', parameters('entorno'))]",
    "factoryName": "[concat('adf-tiendaandina-', parameters('entorno'))]",
    "tags": {
      "proyecto": "tienda-andina",
      "entorno": "[parameters('entorno')]",
      "owner": "equipo-datos"
    }
  },
  "resources": [
    {
      "type": "Microsoft.Storage/storageAccounts",
      "apiVersion": "2023-05-01",
      "name": "[variables('storageName')]",
      "location": "[parameters('location')]",
      "tags": "[variables('tags')]",
      "sku": {
        "name": "[if(equals(parameters('entorno'), 'prod'), 'Standard_ZRS', 'Standard_LRS')]"
      },
      "kind": "StorageV2",
      "properties": {
        "isHnsEnabled": true,
        "minimumTlsVersion": "TLS1_2",
        "allowBlobPublicAccess": false,
        "accessTier": "Hot"
      }
    },
    {
      "type": "Microsoft.Storage/storageAccounts/blobServices/containers",
      "apiVersion": "2023-05-01",
      "name": "[concat(variables('storageName'), '/default/bronze')]"
    },
    {
      "type": "Microsoft.Storage/storageAccounts/blobServices/containers",
      "apiVersion": "2023-05-01",
      "name": "[concat(variables('storageName'), '/default/silver')]"
    },
    {
      "type": "Microsoft.Storage/storageAccounts/blobServices/containers",
      "apiVersion": "2023-05-01",
      "name": "[concat(variables('storageName'), '/default/gold')]"
    },
    {
      "type": "Microsoft.KeyVault/vaults",
      "apiVersion": "2023-07-01",
      "name": "[variables('vaultName')]",
      "location": "[parameters('location')]",
      "tags": "[variables('tags')]",
      "properties": {
        "tenantId": "[subscription().tenantId]",
        "sku": {
          "family": "A",
          "name": "standard"
        },
        "enableRbacAuthorization": true,
        "softDeleteRetentionInDays": 90
      }
    },
    {
      "type": "Microsoft.DataFactory/factories",
      "apiVersion": "2018-06-01",
      "name": "[variables('factoryName')]",
      "location": "[parameters('location')]",
      "tags": "[variables('tags')]",
      "identity": {
        "type": "SystemAssigned"
      }
    }
  ]
}
```

Sus partes:

| Sección | Qué tiene | En esta plantilla |
|---|---|---|
| **parameters** | Lo que cambia en cada despliegue | `entorno` (solo `dev`, `qa` o `prod`) y `location` |
| **variables** | Valores calculados que se reutilizan | Los nombres de los recursos y las etiquetas |
| **resources** | Lo que se crea | La cuenta, sus tres contenedores, el vault y el factory |

Las **funciones** van entre corchetes:

| Función | Devuelve |
|---|---|
| `parameters('entorno')` | El valor del parámetro |
| `variables('storageName')` | El valor de la variable |
| `concat('st', 'tiendaandinaqa')` | `sttiendaandinaqa` |
| `resourceGroup().location` | La región del grupo donde despliegas |
| `if(equals(parameters('entorno'), 'prod'), 'Standard_ZRS', 'Standard_LRS')` | **ZRS en prod**, LRS en los demás |
| `subscription().tenantId` | El tenant de la suscripción |

Los contenedores se llaman `<cuenta>/default/<contenedor>`: Azure sabe que dependen de la cuenta y los crea después.

## Paso 3 — Desplegar, con un error a propósito

**Create a resource → Template deployment** (o busca *deploy a custom template*):

```captura
archivo: azure/b21-opciones.webp
texto: Custom deployment - escribir tu propia plantilla (1) o usar un ejemplo (2)
```

Elige **Build your own template in the editor** y pega la plantilla **con un error**: en la variable `sufijo`, escribe `parameters('entornos')` (con *s* al final):

```captura
archivo: azure/b21-editor.webp
texto: El editor de plantillas (1) y Save (2)
```

Pulsa **Save**. En **Basics**, escribe un grupo nuevo, `rg-tiendaandina-qa`. Los parámetros aparecen como campos:

```captura
archivo: azure/b21-basics.webp
texto: El grupo nuevo (1) y los parámetros de la plantilla - entorno (2) y location (3)
```

**Review + create**:

```captura
archivo: azure/b21-error.webp
texto: Validation failed - "The template parameter 'entornos' is not found"
```

Los errores de plantilla dicen **qué** expresión falló. Es el error más común: un nombre mal escrito entre parámetros, variables y su uso.

## Paso 4 — Corregir y desplegar

Vuelve a **Basics → Edit template**, corrige `entornos` por `entorno`, **Save**, escribe otra vez `rg-tiendaandina-qa` y **Review + create**:

```captura
archivo: azure/b21-revisar.webp
texto: Validation Passed (1), los parámetros ya evaluados (2) y los seis recursos que se van a crear (3)
```

Mira cómo las funciones ya se resolvieron: `sttiendaandinaqa`, `kv-tiendaandina-qa`, `adf-tiendaandina-qa`. Pulsa **Create**:

```captura
archivo: azure/b21-despliegue.webp
texto: Deployment complete (1) y el estado de cada recurso (2)
```

```captura
archivo: azure/b21-grupo-qa.webp
texto: El grupo qa con la cuenta, el vault y el factory, creado en un solo despliegue
```

:::nota La región en la práctica
Como el grupo era nuevo, la práctica lo creó en East US. En el portal real eliges la región del grupo nuevo en la misma pantalla de Basics.
:::

## Paso 5 — Idempotencia y modo incremental

Si despliegas la misma plantilla otra vez sobre `rg-tiendaandina-qa`, **no se duplica nada**: Azure ve que los recursos ya existen con esa configuración y no hace cambios. Si cambiaras algo en la plantilla (por ejemplo una etiqueta), solo aplicaría ese cambio.

Por defecto los despliegues son **incrementales**: lo que existe en el grupo y **no** está en la plantilla se deja como está. Existe el modo **completo**, que **borra** lo que no está en la plantilla: es potente y peligroso, y casi nadie lo usa a mano.

## Paso 6 — Borrar el entorno qa

Las pruebas terminaron. En el grupo `rg-tiendaandina-qa`, **Delete resource group**, escribe el nombre para confirmar:

```captura
archivo: azure/b21-borrar-grupo.webp
texto: La advertencia (1) y la confirmación escribiendo el nombre del grupo (2)
```

Con la plantilla en Git, borrar un entorno ya no da miedo: volver a tenerlo es un despliegue.

## Paso 7 — ARM, Bicep y Terraform

| Herramienta | Lenguaje | De quién | Nubes |
|---|---|---|---|
| **ARM** | JSON | Microsoft | Azure |
| **Bicep** | Más corto y legible; se **compila a ARM** | Microsoft | Azure |
| **Terraform** | HCL; guarda un archivo de **estado** | HashiCorp | Azure, AWS, GCP y más |

Las tres describen el estado deseado. En equipos de datos que trabajan solo con Azure se ve mucho Bicep; en equipos multinube, Terraform. El módulo [Terraform](#/m/terraform) tiene su propio laboratorio.

:::errores
- **Nombres de parámetros que no coinciden.** Un `parameters('entornos')` con el parámetro declarado como `entorno` falla al desplegar.
- **Valores fijos que cambian entre entornos.** Van como parámetros y se pasan en cada despliegue.
- **Editar en el portal lo que creó la plantilla.** El próximo despliegue lo pisa; el cambio va en la plantilla.
:::

## ✅ Lo que lograste

- Lees una plantilla ARM completa y sus funciones.
- Desplegaste un entorno entero desde una plantilla, corrigiendo un error.
- Entiendes idempotencia, el modo incremental y la relación con Bicep y Terraform.

:::ejercicio quiz
¿Qué valor toma `storageName` con `entorno = prod`?
- [ ] `st-tiendaandina-prod`
- [x] `sttiendaandinaprod`
- [ ] `tiendaandinaprod`
- [ ] `sttiendaandina-prod`
:::

:::ejercicio quiz
¿Qué redundancia tiene la cuenta cuando `entorno` es `qa`?
- [ ] ZRS
- [x] LRS
- [ ] GRS
- [ ] GZRS
:::

:::ejercicio quiz
Despliegas la misma plantilla dos veces sobre el mismo grupo. ¿Qué pasa?
- [ ] Se crean dos cuentas de almacenamiento
- [ ] Falla porque ya existen
- [x] No se duplica nada: el despliegue es idempotente
- [ ] Se borra todo y se vuelve a crear
:::

:::ejercicio quiz
"The template parameter 'entornos' is not found". ¿Qué revisas?
- [ ] La región del grupo
- [ ] Los permisos de la suscripción
- [x] Que el nombre usado en `parameters('…')` coincida con un parámetro declarado
- [ ] El precio de los recursos
:::
