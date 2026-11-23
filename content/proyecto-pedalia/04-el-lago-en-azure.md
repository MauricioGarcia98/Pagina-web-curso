---
titulo: El lago en Azure - capas, permisos y la primera carga
nivel: Intermedio
duracion: 45
resumen: Creas la infraestructura del proyecto en el portal de Azure de práctica - grupo de recursos, una cuenta de almacenamiento ADLS Gen2 con las cuatro capas, el data factory - y das permisos con mínimo privilegio a las identidades que van a leer y escribir. Después subes la entrega del día a landing desde la terminal, como lo haría un proceso automático.
objetivos: Crear una cuenta ADLS Gen2 y explicar por qué necesita el espacio de nombres jerárquico | Organizar el lago en landing, bronze, silver y gold | Asignar roles de datos a identidades administradas con alcance mínimo | Subir archivos al lago con la CLI de Azure
prerrequisitos: proyecto-pedalia-recibir-los-datos | interfaces-portal-azure-por-dentro
autoevaluacion: ¿Sabes qué guarda cada capa del lago? | ¿Sabes por qué ser Owner no alcanza para leer blobs con tu usuario? | ¿Sabes qué identidad usa Data Factory para entrar al lago? | ¿Sabes subir una carpeta entera con az storage blob upload-batch?
---

:::escenario Martes, 9:00
"Ya tienes acceso a la suscripción de desarrollo", te escriben desde infraestructura. "Crea lo que necesites en un grupo de recursos propio y avísanos qué permisos das. Nada de Owner para los servicios".
:::

:::analogia Un depósito con cuatro salas
El lago es un depósito con cuatro salas. A **landing** llegan los camiones y se descarga tal cual. En **bronze** se guarda una copia ordenada de todo lo que llegó, sin tocar. En **silver** está lo limpio y revisado. En **gold**, lo empaquetado para cada cliente. Cada empleado tiene llave solo de las salas donde trabaja: eso es el mínimo privilegio.
:::

## 1. Grupo de recursos y cuenta de almacenamiento

Puedes hacerlo desde el [portal de Azure de práctica](#/azure) o con la CLI. Las dos formas dejan lo mismo.

**Desde el portal:** Create a resource → Storage account:
- Resource group: crea **`rg-pedalia-dev`**, región **East US 2**.
- Storage account name: **`stpedaliadev`** (en Azure real el nombre es único en todo el mundo: agrégale tus iniciales).
- En la pestaña **Advanced**, marca **Enable hierarchical namespace**. Sin esto, la cuenta es Blob Storage común y no ADLS Gen2.

**Desde la terminal:**

<details><summary>Pista</summary>

Tres comandos: `az group create`, `az storage account create` (con `--hns true`, si no, no es un lago) y `az storage container create`, uno por capa. Un `for capa in landing bronze silver gold; do … done` evita repetirlo cuatro veces.
</details>

:::solucion PD:Azure | grupo, cuenta y contenedores por la terminal
```bash
az login
az group create -n rg-pedalia-dev -l eastus2
az storage account create -n stpedaliadev -g rg-pedalia-dev -l eastus2 --sku Standard_LRS --hns true
for capa in landing bronze silver gold; do
  az storage container create --account-name stpedaliadev -n $capa
done
```
:::

:::nota ¿Por qué el espacio de nombres jerárquico?
Con él, las carpetas son carpetas de verdad (renombrar una carpeta es una operación, no copiar miles de archivos) y aparece la dirección `abfss://…dfs.core.windows.net`, que es la que usan Databricks y Spark. Sin él, Databricks no puede usar la cuenta como ubicación externa.
:::

## 2. El data factory

<details><summary>Pista</summary>

La CLI de Data Factory es una extensión: primero se instala (`az extension add --name …`) y después se crea la fábrica con `az datafactory create -g … -n … -l …`.
</details>

:::solucion PD:Azure | el data factory
```bash
az extension add --name datafactory
az datafactory create -g rg-pedalia-dev -n adf-pedalia-dev -l eastus2
```
:::

Cada data factory tiene una **identidad administrada** con su mismo nombre: es la "cuenta" con la que el servicio entra a otros recursos sin guardar contraseñas.

## 3. Permisos con mínimo privilegio

Dos identidades necesitan entrar al lago:

| Identidad | Para qué | Rol |
|---|---|---|
| `adf-pedalia-dev` (identidad del data factory) | Leer landing y escribir bronze | Storage Blob Data Contributor |
| `unity-catalog-access-connector` (identidad de Databricks) | Leer bronze y escribir gold | Storage Blob Data Contributor |

El **alcance** es la cuenta de almacenamiento, no la suscripción ni el grupo de recursos. Primero obtén su identificador:

<details><summary>Pista</summary>

Primero el identificador de la cuenta (`az storage account show … --query id -o tsv`, guárdalo en una variable) y después un `az role assignment create --assignee <identidad> --role "Storage Blob Data Contributor" --scope <id>` por cada identidad. `az role assignment list --scope <id> -o table` te muestra si quedó.
</details>

:::solucion PD:Azure | los permisos
```bash
ID=$(az storage account show -n stpedaliadev -g rg-pedalia-dev --query id -o tsv)
echo $ID
az role assignment create --assignee adf-pedalia-dev --role "Storage Blob Data Contributor" --scope $ID
az role assignment create --assignee unity-catalog-access-connector --role "Storage Blob Data Contributor" --scope $ID
az role assignment list --scope $ID -o table
```
:::

O desde el portal: la cuenta → **Access control (IAM)** → **Add role assignment** → el rol → **Managed identity** → la identidad.

:::cuidado Owner no es lo mismo que leer datos
Como dueño de la suscripción puedes **administrar** la cuenta (crearla, borrarla, ver sus claves), pero para **leer blobs con tu usuario de Entra ID** necesitas además un rol de datos (Storage Blob Data Reader o Contributor). Son dos planos distintos: el de control y el de datos. Es una de las confusiones más comunes en Azure, y el portal de práctica la reproduce: cambia el contenedor a "Microsoft Entra user account" y mira el mensaje.
:::

:::nota En producción
Lo ideal es un rol por contenedor (el data factory solo escribe en `bronze`, Databricks solo en `silver` y `gold`). Acá lo damos a nivel cuenta para no alargar el proyecto: anótalo como mejora en tu README.
:::

## 4. Subir la entrega a landing

Simula lo que haría el proceso automático de la app: dejar los archivos del día en `landing/pedalia/<fecha>/`.

<details><summary>Pista</summary>

`az storage blob upload-batch` sube una carpeta entera (`-d contenedor/ruta -s carpeta-local`); el maestro de estaciones es un archivo suelto, con `az storage blob upload -c … -n … -f …`.
</details>

:::solucion PD:Azure | subir la entrega
```bash
az storage blob upload-batch --account-name stpedaliadev -d landing/pedalia/2026-11-09 -s ~/pedalia/entrega/2026-11-09
az storage blob upload --account-name stpedaliadev -c landing -n pedalia/estaciones/estaciones.json -f ~/pedalia/entrega/estaciones.json
az storage blob list --account-name stpedaliadev -c landing -o table
```
:::

Ábrelo también en el portal: **stpedaliadev → Containers → landing**. Vas a ver la carpeta `pedalia/2026-11-09` con los dos archivos y `pedalia/estaciones`.

:::errores
- **Crear la cuenta sin espacio de nombres jerárquico**. Después no se puede activar sin migrar, y Databricks no la acepta como ubicación externa.
- **Dar Owner o Contributor a los servicios** "para que funcione". Funcionan, pero cualquier error o credencial filtrada puede borrar la cuenta entera. Los roles de datos alcanzan.
- **Asignar el rol en la suscripción** en vez de en la cuenta: el data factory termina con acceso a todos los lagos de la empresa.
- **Esperar que el permiso funcione al instante**: en Azure real una asignación de rol tarda hasta unos minutos en aplicarse. Si da 403 justo después, espera y reintenta antes de cambiar otra cosa.
:::

:::real En tu computadora y en la web real
En tu propia suscripción de Azure se hace igual, por dos caminos:

- **Portal** (`portal.azure.com`): buscador de arriba → *Resource groups* → *Create*; después *Storage accounts* → *Create* (marca **Enable hierarchical namespace** para que sea un lago); después *Data factories* → *Create*. Los permisos se dan en el recurso → *Access control (IAM)* → *Add role assignment*.
- **Terminal**: instala la Azure CLI (`brew install azure-cli` en macOS, `winget install Microsoft.AzureCLI` en Windows), entra con `az login` y corre los mismos comandos `az` de la lección.

Con una cuenta gratuita, borra el grupo de recursos al terminar (`az group delete -n <grupo>`) para no gastar crédito.
:::

:::capturas Capturas para tu portafolio
Guárdalas en `docs/capturas/` del repositorio del proyecto y úsalas en el README.

- `04-grupo-recursos.png`: el grupo de recursos con la cuenta de almacenamiento y el data factory.
- `04-capas.png`: los contenedores `landing`, `bronze`, `silver` y `gold` de la cuenta.
- `04-iam.png`: la asignación de rol de la identidad del data factory (mínimo privilegio).

Antes de publicar, tapa con un rectángulo los correos, los IDs de suscripción y de tenant, los nombres de cuentas reales y cualquier clave o token.
:::

## Ejercicios

:::ejercicio quiz
¿Qué capa del lago guarda los archivos de la app **tal cual llegaron**, ordenados y sin tocar?
- [ ] gold
- [ ] silver
- [x] bronze (landing es solo la zona de llegada; bronze es la copia ordenada que se conserva)
- [ ] ninguna: los originales se borran después de limpiar
:::

:::ejercicio quiz
Eres Owner de la suscripción, pero el portal no te deja listar los blobs con tu usuario de Entra ID. ¿Por qué?
- [ ] Porque la cuenta no tiene espacio de nombres jerárquico
- [x] Porque Owner es un rol del plano de control; para leer datos con tu usuario necesitas un rol de datos como Storage Blob Data Reader
- [ ] Porque el contenedor es privado y nadie puede listarlo
- [ ] Porque falta crear un data factory
:::

:::ejercicio quiz
¿Con qué alcance (scope) conviene asignar el rol del data factory en este proyecto?
- [ ] La suscripción completa
- [ ] El grupo de recursos de toda el área de datos
- [x] La cuenta de almacenamiento (o mejor aún, cada contenedor que necesita)
- [ ] Ninguno: el data factory entra con la clave de la cuenta
:::

## Resumen

- El lago tiene capas con roles distintos: **landing → bronze → silver → gold**.
- **ADLS Gen2** = cuenta con espacio de nombres jerárquico; sin él no hay `abfss://`.
- Los servicios entran con **identidades administradas** y **roles de datos**, con el alcance más chico posible.
- Ser Owner (plano de control) no da acceso a los datos (plano de datos).
