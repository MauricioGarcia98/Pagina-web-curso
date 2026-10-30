---
titulo: Automatización: scripts e infraestructura como código
nivel: Experto
duracion: 55
resumen: Desde cero - por qué automatizar, un script bash idempotente con az, qué es la infraestructura como código, Bicep paso a paso, what-if, el modo incremental (y por qué borrar del archivo no borra en Azure), deployment stacks y CI/CD con GitHub Actions y OIDC.
objetivos: Escribir un script de aprovisionamiento con az que se pueda correr dos veces | Leer y escribir un archivo Bicep con parámetros | Previsualizar cambios con what-if y entender Create, Modify, NoChange e Ignore | Explicar el modo incremental y cuándo usar deployment stacks | Desplegar desde GitHub Actions sin guardar contraseñas
autoevaluacion: ¿Sabes qué pasa en Azure si borras un recurso de tu archivo Bicep? | ¿Sabes qué hace set -euo pipefail? | ¿Sabes por qué OIDC es mejor que guardar un secreto en GitHub?
---

:::escenario
El entorno de desarrollo se armó a mano en el portal hace un año. Ahora hay que crear el de producción "igual", y nadie recuerda qué opciones se marcaron: qué redundancia tenía la cuenta de almacenamiento, qué etiquetas, qué permisos. Dos semanas después, producción tiene diferencias sutiles con desarrollo que causan errores que no se pueden reproducir. Esto es lo que evita la automatización.
:::

## Por qué automatizar

Hacer clics en el portal no es **repetible** (nadie hace los mismos 40 clics dos veces igual) ni **auditable** (no queda escrito quién cambió qué ni por qué). En equipos profesionales la infraestructura se crea con **código**, guardado en Git como cualquier otro programa. Hay dos formas, de menor a mayor madurez:

1. **Scripts**: una secuencia de comandos `az` que se ejecutan en orden.
2. **Infraestructura como código (IaC) declarativa**: un archivo que describe **cómo debe quedar** la infraestructura; la herramienta calcula qué hacer.

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
if [ "$(az keyvault list -g "$RG" --query "[?name=='$KV'] | length(@)" -o tsv)" = "0" ]; then
  az keyvault create -n "$KV" -g "$RG" -l "$UBICACION" -o none
fi
echo "✔ Entorno $ENTORNO listo"
```

Línea por línea, lo importante:

- `#!/usr/bin/env bash`: la primera línea dice con qué programa se ejecuta el archivo (bash).
- `set -euo pipefail`: tres seguros. `-e` detiene el script si **cualquier** comando falla; `-u` lo detiene si usas una variable que no existe (un error de tipeo en `$ENTRONO` no crea un recurso con nombre vacío); `-o pipefail` hace que una tubería `a | b` falle si falla `a`, no solo si falla `b`.
- `ENTORNO=${1:-dev}`: toma el primer argumento del script; si no hay, usa `dev`. Así el mismo script crea dev, test o prod, y los nombres se derivan del entorno: nunca hay nombres escritos a mano.
- `-o none`: no imprime el JSON de cada creación; la salida queda limpia.
- El `if` del Key Vault consulta primero si existe, con `--query` (la lección de grupos y consultas explica JMESPath) y `-o tsv` para obtener el número "pelado".

Un script que se puede correr dos veces sin romper nada se llama **idempotente**. Muchos `az ... create` ya lo son: si el recurso existe con la misma configuración, lo dejan igual. Pero no todos (un Key Vault borrado queda en "borrado lógico" y el nombre no se puede reusar por 90 días), por eso los scripts profesionales preguntan antes de crear o borrar.

## Infraestructura como código (IaC)

Un script dice **cómo** llegar ("crea esto, después esto"). La IaC declarativa dice **qué** quieres que exista ("debe haber una cuenta con HNS y tres contenedores") y la herramienta compara con lo que ya existe y calcula la diferencia.

| | Script con `az` | Bicep | Terraform |
|---|---|---|---|
| Describe | Pasos | Estado final deseado | Estado final deseado |
| Si lo ejecutas dos veces | Depende de cómo lo escribiste | Segunda vez: sin cambios | Segunda vez: sin cambios |
| Si **borras** un recurso del código | Sigue existiendo | **Sigue existiendo** (modo incremental); para borrar se usan *deployment stacks* | `terraform plan` propone **borrarlo** |
| Vista previa | No | `az deployment group what-if` | `terraform plan` |
| Dónde guarda qué administra | En ningún lado | En Azure mismo | En un archivo de **estado** |
| Nubes | Solo Azure | Solo Azure | Azure, AWS, GCP y cientos más |

## Bicep paso a paso

**Bicep** es el lenguaje de Microsoft para describir recursos de Azure. Por dentro, Azure lo traduce a una plantilla ARM (JSON), el formato original, mucho más verboso. Así se lee un archivo:

```bicep norun
// main.bicep
param entorno string                                  // 1. parámetro obligatorio
param ubicacion string = resourceGroup().location     // 2. parámetro con valor por defecto

resource lake 'Microsoft.Storage/storageAccounts@2025-06-01' = {   // 3. tipo y versión de API
  name: 'stdatos${entorno}001'                        // 4. nombre armado con el parámetro
  location: ubicacion
  sku: { name: 'Standard_LRS' }                       // 5. redundancia local (3 copias en un centro de datos)
  kind: 'StorageV2'
  properties: { isHnsEnabled: true }                  // 6. espacio de nombres jerárquico = ADLS Gen2
  tags: { entorno: entorno }
}

output lakeId string = lake.id                        // 7. un valor que devuelve el despliegue
```

1. `param entorno string`: un valor que se pasa al desplegar (`--parameters entorno=dev`). Si no lo pasas, el despliegue falla diciendo qué falta.
2. Con `= ...` el parámetro tiene un valor por defecto. `resourceGroup().location` es una **función** de Bicep: la región del grupo de recursos donde despliegas.
3. `resource lake '<tipo>@<versión>'`: `lake` es el nombre **simbólico** (para referirte al recurso dentro del archivo); el tipo dice qué es (`Microsoft.Storage/storageAccounts`) y la fecha es la **versión de la API**, que define qué propiedades existen.
4. `'stdatos${entorno}001'`: interpolación, como en bash. Con `entorno=dev` da `stdatosdev001`.
5. y 6. Las propiedades del recurso, las mismas opciones que verías en el portal.
7. `output`: valores que el despliegue devuelve, útiles para encadenar pasos (por ejemplo, pasarle el ID del lago a Databricks).

## Previsualizar con what-if

Antes de aplicar, siempre se mira qué va a pasar. `what-if` compara el archivo con lo que ya existe y clasifica cada recurso:

```bash norun
az deployment group what-if --resource-group rg-datos-dev --template-file main.bicep --parameters entorno=dev
az deployment group create  --resource-group rg-datos-dev --template-file main.bicep --parameters entorno=dev
```

| Símbolo | Tipo de cambio | Significado |
|---|---|---|
| `+` | Create | No existe y está en el archivo: se va a crear |
| `~` | Modify | Existe y está en el archivo, con propiedades distintas: se va a modificar |
| `=` | NoChange | Existe y está igual: se vuelve a desplegar sin cambios |
| `*` | Ignore | Existe en Azure pero **no** está en el archivo: no se toca |

### El modo incremental: lo que más sorprende

Por defecto, un despliegue de Bicep es **incremental**. Según la documentación oficial:

- Los recursos que existen en el grupo pero **no están en el archivo** se dejan como están (por eso `what-if` dice *Ignore*). Si borras el Key Vault de tu archivo, el Key Vault **sigue existiendo** en Azure.
- Los recursos que **sí** están en el archivo se vuelven a aplicar **completos**: si una propiedad no está escrita en el archivo, vuelve a su valor **por defecto**. Un error común es creer que lo que no escribes "se deja como está". El archivo tiene que describir el recurso entero, no solo lo que quieres cambiar.

Existía un modo *complete* (que borraba lo que no estaba en el archivo), pero Microsoft ya no lo recomienda y lo está retirando. Para que quitar un recurso del archivo lo **borre**, se usan los **deployment stacks**:

```bash norun
az stack group create --name datos --resource-group rg-datos-dev \
  --template-file main.bicep --parameters entorno=dev \
  --action-on-unmanage deleteResources \
  --deny-settings-mode none
```

Un *stack* recuerda qué recursos administra. Si en la siguiente versión del archivo falta uno, `--action-on-unmanage` decide: `detachAll` lo deja de administrar pero no lo borra, `deleteResources` borra los recursos y `deleteAll` borra también los grupos de recursos administrados. `--deny-settings-mode` puede además impedir que alguien modifique o borre esos recursos a mano desde el portal.

### Pruébalo en la terminal

La terminal del curso lee de verdad tu archivo Bicep y compara con lo desplegado:

```bash
az login
az group create -n rg-datos-dev -l eastus2 -o none
code main.bicep                     # pega el ejemplo de arriba y guarda
az deployment group what-if -g rg-datos-dev -f main.bicep -p entorno=dev
az deployment group create -g rg-datos-dev -f main.bicep -p entorno=dev -o none
az deployment group what-if -g rg-datos-dev -f main.bicep -p entorno=dev
```

El primer `what-if` muestra `+ Create`; después del `create`, el segundo muestra `= NoChange`. Cambia `Standard_LRS` por `Standard_ZRS` y vuelve a correrlo: verás `~ Modify`. Agrega un segundo recurso, despliégalo, bórralo del archivo y mira cómo aparece como `* Ignore`; después repite con `az stack group create ... --action-on-unmanage deleteResources` y verás que el stack sí lo borra.

## CI/CD con GitHub Actions (OIDC, sin secretos)

En un equipo, nadie despliega producción desde su computadora: lo hace un **pipeline** de CI/CD cuando se aprueba un *pull request*. Para que GitHub Actions pueda entrar a Azure sin guardar una contraseña, se usa **OpenID Connect (OIDC)**:

1. Se crea una **identidad** en Microsoft Entra ID para el pipeline: una aplicación con *service principal*, o una identidad administrada asignada por el usuario.
2. Se le asigna un rol con los permisos mínimos (por ejemplo, *Contributor* solo sobre `rg-datos-prod`).
3. Se configura una **credencial federada**: le dice a Azure "confía en los tokens que GitHub emite para el repositorio `empresa/plataforma-datos`, rama `main`".
4. En GitHub se guardan como secretos solo tres identificadores, que no son contraseñas: `AZURE_CLIENT_ID`, `AZURE_TENANT_ID` y `AZURE_SUBSCRIPTION_ID`.

```yaml norun
name: desplegar-infra
on: { push: { branches: [main] } }
permissions: { id-token: write, contents: read }    # id-token: write permite pedir el token OIDC
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
      - run: az deployment group what-if -g rg-datos-prod -f infra/main.bicep -p entorno=prod
      - run: az deployment group create -g rg-datos-prod -f infra/main.bicep -p entorno=prod
```

En cada ejecución, GitHub emite un token de corta duración que dice "soy el workflow de este repositorio y esta rama", Azure lo valida contra la credencial federada y entrega acceso por unos minutos. No hay ningún secreto que pueda filtrarse ni que haya que rotar. La documentación recomienda además usar *environment secrets* con aprobación obligatoria para producción.

:::errores
- **Creer que borrar un recurso del Bicep lo borra en Azure**: en modo incremental queda *Ignore*. Para eso están los deployment stacks.
- **Escribir solo las propiedades que quieres cambiar**: las que faltan vuelven a su valor por defecto en el próximo despliegue.
- **Scripts sin `set -euo pipefail`**: un paso falla y el script sigue creando recursos sobre una base rota.
- **Guardar un secreto de service principal en GitHub** cuando se puede usar OIDC.
- **Desplegar producción sin `what-if`**: un cambio de SKU o de redundancia puede recrear recursos.
- **Mezclar portal y código**: si alguien cambia a mano lo que maneja Bicep, el próximo despliegue lo pisa. Los *deny settings* de los stacks lo evitan.
:::

:::trabajo
- La estructura típica de un repositorio de plataforma: `infra/` con Bicep o Terraform, un archivo de parámetros por entorno (`dev.bicepparam`, `prod.bicepparam`) y un workflow que corre `what-if` en cada *pull request* y `create` al aprobar.
- El resultado de `what-if` se publica como comentario en el *pull request* para que el revisor vea qué cambia en Azure, no solo qué cambia en el código.
- Muchas empresas usan Terraform para la plataforma (red, Databricks, almacenamiento, permisos) y Declarative Automation Bundles para los jobs de datos. El módulo de Terraform del curso lo muestra completo.
:::

:::entrevista "¿Qué pasa si eliminas un recurso de un archivo Bicep y vuelves a desplegar?"
Con el modo por defecto, que es incremental, nada: el recurso sigue existiendo en Azure y what-if lo marca como Ignore. Bicep solo crea o actualiza lo que está en el archivo. Si quiero que el código sea la fuente de verdad también para las eliminaciones, uso un deployment stack con `--action-on-unmanage deleteResources`, que recuerda qué recursos administra y borra los que ya no están. El modo complete existía para esto pero Microsoft lo está retirando. Además tengo en cuenta que el modo incremental vuelve a aplicar el recurso completo, así que las propiedades que no escribo vuelven a sus valores por defecto.
:::

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
printf "param entorno string = 'dev'\n\nresource lake 'Microsoft.Storage/storageAccounts@2025-06-01' = {\n  name: 'stdatos\${entorno}001'\n  location: resourceGroup().location\n  sku: { name: 'Standard_LRS' }\n  kind: 'StorageV2'\n  properties: { isHnsEnabled: true }\n}\n" > main.bicep
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
printf "param entorno string\n\nresource lake 'Microsoft.Storage/storageAccounts@2025-06-01' = {\n  name: 'stdatos\${entorno}001'\n  location: resourceGroup().location\n  sku: { name: 'Standard_LRS' }\n  kind: 'StorageV2'\n  properties: { isHnsEnabled: true }\n}\n" > main.bicep
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

:::ejercicio cli dificultad=Avanzado titulo="Borrar con un deployment stack"
Despliega `main.bicep` en `rg-datos-dev` como el **deployment stack** `datos`, con el parámetro `entorno=dev`, para que los recursos que se quiten del archivo **se borren** (`deleteResources`) y sin restricciones de modificación (`--deny-settings-mode none`).
```respuesta
todos: az stack group create || (--name|-n) datos || (--resource-group|-g) rg-datos-dev || (--template-file|-f) main\.bicep || (--parameters|-p) entorno=dev || --action-on-unmanage deleteResources || --deny-settings-mode none
```
```solucion
az stack group create --name datos --resource-group rg-datos-dev --template-file main.bicep --parameters entorno=dev --action-on-unmanage deleteResources --deny-settings-mode none
```
```setup
az group create --name rg-datos-dev --location eastus2
printf "param entorno string\n\nresource lake 'Microsoft.Storage/storageAccounts@2025-06-01' = {\n  name: 'stdatos\${entorno}001'\n  location: resourceGroup().location\n  sku: { name: 'Standard_LRS' }\n  kind: 'StorageV2'\n}\n" > main.bicep
```
:::

:::ejercicio quiz dificultad=Intermedio
Desplegaste con Bicep una cuenta de almacenamiento y un Key Vault. Borras el Key Vault del archivo y corres `az deployment group create`. ¿Qué pasa?

- [ ] Azure borra el Key Vault
- [x] Nada: en modo incremental el Key Vault sigue existiendo (what-if lo muestra como Ignore)
- [ ] El despliegue falla
- [ ] Se borra todo el grupo de recursos
:::

:::ejercicio quiz dificultad=Avanzado
En el Bicep de una cuenta de almacenamiento ya desplegada solo escribiste `name`, `location`, `sku` y `kind`, aunque en el portal alguien activó `isHnsEnabled`. ¿Qué indica la documentación sobre el modo incremental?

- [ ] Las propiedades no escritas se conservan
- [x] El recurso se vuelve a aplicar completo: las propiedades no escritas vuelven a su valor por defecto, así que el archivo debe describir el recurso entero
- [ ] Bicep copia las propiedades del portal al archivo
- [ ] El despliegue se salta ese recurso
:::

:::ejercicio quiz dificultad=Intermedio
¿Qué guarda GitHub como secretos cuando el despliegue a Azure usa OIDC?

- [ ] La contraseña del service principal
- [x] Solo identificadores (client ID, tenant ID y subscription ID); el acceso se obtiene con un token de corta duración que Azure valida contra una credencial federada
- [ ] Un certificado
- [ ] El usuario y la contraseña de un administrador
:::
