# area: Azure

## Resource group
alias: grupo de recursos, rg
nino: Es una **caja donde guardas todos los juguetes de un mismo juego**: cuando terminas de jugar, tiras la caja entera y no queda ninguna pieza suelta por la casa.
que: En Azure, todo recurso vive dentro de un **grupo de recursos**: un contenedor lógico con región, permisos (RBAC), etiquetas y costos propios. Borrar el grupo borra todo lo que contiene. Encima están la suscripción (facturación) y los grupos de administración.
ejemplo:
```bash
az group create -n rg-datos-dev -l eastus2
az group delete -n rg-datos-dev --yes   # borra todo lo de adentro
```
para: Organizar por proyecto y entorno, y limpiar laboratorios sin dejar recursos cobrando.
ver: Storage Account, RBAC, Etiquetas

## Storage Account
alias: cuenta de almacenamiento, storage
nino: Es **el edificio de depósitos** de Azure: adentro tiene distintas salas (blobs, archivos, colas, tablas), y en la sala de blobs están los contenedores con tus archivos.
que: El recurso de Azure que agrupa servicios de almacenamiento (Blob, Files, Queues, Tables) con un nombre global único (`stlagodatosdev.blob.core.windows.net`), redundancia (LRS, ZRS, GRS), nivel de acceso (hot, cool, archive) y configuración de red y seguridad. Con el **espacio de nombres jerárquico** activado, pasa a ser ADLS Gen2.
ejemplo: `az storage account create -n stlagodatosdev -g rg-datos-dev --sku Standard_LRS --kind StorageV2 --hns true`
para: Guardar el data lake y los archivos en Azure.
cuidado: El nombre solo admite minúsculas y números, de 3 a 24 caracteres, y debe ser único en todo Azure.
ver: ADLS Gen2, Object storage, Resource group

## ADLS Gen2
alias: azure data lake storage, adls, abfss
nino: Es el depósito de Azure pero **con carpetas de verdad**: puedes mover o renombrar una carpeta entera de una vez y ponerle permisos a cada carpeta, como en tu computadora.
que: *Azure Data Lake Storage Gen2*: una Storage Account con espacio de nombres jerárquico, optimizada para analítica: directorios reales (renombrar es atómico), ACL POSIX por carpeta y archivo, y el protocolo `abfss://`. La usan Databricks, Synapse, Fabric y Data Factory.
ejemplo: `abfss://bronze@stlagodatosdev.dfs.core.windows.net/pedidos/fecha=2024-12-01/` (contenedor `bronze`, carpeta `pedidos`).
para: El data lake en Azure.
ver: Storage Account, Data lake, Managed identity

## Entra ID
alias: azure ad, azure active directory, microsoft entra
nino: Es el **padrón de la escuela**: la lista oficial de todos los alumnos, profesores y robots, con su nombre y cómo comprobar que son quienes dicen ser.
que: El servicio de identidad de Microsoft (antes Azure Active Directory): usuarios, grupos, aplicaciones (*app registrations*), service principals y managed identities de un tenant; inicio de sesión, SSO, MFA y acceso condicional. Responde **quién eres**; RBAC decide **qué puedes hacer**.
ejemplo: Al crear el grupo `grp-datos-ingenieros` y darle el rol *Storage Blob Data Contributor* en el lago, todos sus miembros pueden escribir allí.
para: Gestionar identidades de personas y aplicaciones en Azure y Microsoft 365.
ver: RBAC, Service principal, Managed identity, SSO

## Managed identity
alias: identidad administrada, identidad gestionada, msi
nino: Es una **credencial que Azure le cose al uniforme del robot**: el robot no tiene que recordar ninguna contraseña; Azure ya sabe quién es y le abre las puertas que le corresponden.
que: Una identidad de Entra ID que Azure crea y administra para un recurso (Data Factory, una VM, una Function, el conector de Databricks). El recurso obtiene tokens automáticamente, sin secretos que guardar ni rotar. Puede ser *system-assigned* (vive y muere con el recurso) o *user-assigned* (independiente y reutilizable).
ejemplo: Le das a la managed identity de Data Factory el rol *Storage Blob Data Contributor* en el lago y la configuras como método de autenticación del servicio vinculado.
para: Conectar servicios de Azure entre sí sin contraseñas.
ver: Service principal, RBAC, Cuenta de servicio, Secreto

## Service principal
alias: entidad de servicio, app registration, spn
nino: Es un **carnet para un programa** que vive fuera de Azure o que no puede usar una managed identity: con el carnet (y su contraseña o certificado) el programa demuestra quién es.
que: La identidad de una aplicación en un tenant de Entra ID. Se autentica con un secreto, un certificado o —mejor— credenciales federadas (OIDC, por ejemplo desde GitHub Actions). Se le asignan roles RBAC como a un usuario.
ejemplo: `az ad sp create-for-rbac -n sp-terraform-ci --role Contributor --scopes /subscriptions/<id>/resourceGroups/rg-datos-dev`
para: Que herramientas externas (Terraform, CI/CD) operen sobre Azure.
cuidado: Si usas secreto de cliente, guárdalo en Key Vault y ponle vencimiento; mejor aún, usa OIDC.
ver: Managed identity, OIDC, RBAC, Entra ID

## RBAC
alias: role-based access control, control de acceso basado en roles
nino: En vez de dar permisos persona por persona, **das permisos a puestos**: "los bibliotecarios pueden prestar libros". Si alguien es bibliotecario, puede; si deja de serlo, ya no.
que: Modelo en el que se asignan **roles** (conjuntos de permisos) a identidades sobre un **alcance** (*scope*). En Azure: una asignación = principal + definición de rol (Reader, Contributor, Storage Blob Data Reader…) + scope (grupo de administración, suscripción, grupo de recursos o recurso), heredada hacia abajo. Bases de datos, Databricks y Snowflake usan el mismo concepto.
ejemplo: `az role assignment create --assignee <id-grupo> --role "Storage Blob Data Reader" --scope <id-storage-account>`
para: Permisos ordenados, auditables y fáciles de mantener.
cuidado: *Contributor* deja administrar el recurso, pero no necesariamente leer los datos: para los blobs hacen falta los roles *Storage Blob Data*.
ver: IAM, Permisos mínimos, Entra ID

## Key Vault
alias: azure key vault, akv
nino: Es la **caja fuerte de Azure** para contraseñas y llaves: solo pueden abrirla quienes estén autorizados, y queda anotado cada vez que alguien la abre.
que: Servicio de Azure para guardar **secretos**, **claves** de cifrado y **certificados**, con control de acceso (RBAC), auditoría, versionado y borrado protegido (*soft delete*). Databricks puede usarlo como respaldo de secret scopes y Data Factory lo referencia desde los servicios vinculados.
ejemplo:
```bash
az keyvault secret set --vault-name kv-datos-dev --name pg-ventas-password --value '...'
az keyvault secret show --vault-name kv-datos-dev --name pg-ventas-password --query value -o tsv
```
para: Centralizar credenciales fuera del código.
ver: Secreto, Secret scope, Managed identity

## Data Factory
alias: azure data factory, adf, pipelines de synapse
nino: Es una **fábrica con cintas transportadoras que armas arrastrando cajitas**: "copia de aquí a allá", "después corre este notebook", "si falla, avísame".
que: El servicio de integración y orquestación de Azure: **pipelines** con **actividades** (Copy, Notebook de Databricks, Stored Procedure, ForEach, If…), **servicios vinculados** (conexiones), **datasets**, **triggers** (horario, evento de archivo, ventana de tiempo) y *integration runtimes* (incluido el self-hosted para fuentes locales). Tiene 100+ conectores.
ejemplo: Un pipeline que copia tablas de un SQL Server local con self-hosted IR a `bronze/` en ADLS y luego ejecuta un job de Databricks.
para: Ingesta y orquestación low-code en Azure.
ver: Orquestación, Ingesta, ADLS Gen2

## az
alias: azure cli
nino: Es el **control remoto de Azure por escrito**: en vez de hacer clic, escribes "az crea esto" y Azure lo hace.
que: La CLI de Azure. Estructura `az <grupo> <subgrupo> <acción> --parámetros`: `az login`, `az account set`, `az group create`, `az storage …`, `az keyvault …`. Salidas `-o table|json|tsv` y filtro con `--query` (JMESPath).
ejemplo: `az storage account list -g rg-datos-dev --query "[].{nombre:name, sku:sku.name}" -o table`
para: Automatizar Azure en scripts y CI.
ver: CLI, JMESPath

## JMESPath
alias: --query, jmespath
nino: Es una **forma de señalar con el dedo** dentro de una respuesta enorme: "de toda esta lista, dame solo los nombres de los que están en Brasil".
que: Un lenguaje de consultas sobre JSON que usan `az --query` y `aws --query`: `[]` recorre listas, `.campo` entra a un campo, `[?cond]` filtra, `{alias: campo}` proyecta, y tiene funciones como `length()`, `sort_by()` y `contains()`.
ejemplo: `az vm list --query "[?location=='brazilsouth'].name" -o tsv` · `aws s3api list-buckets --query "Buckets[].Name"`.
para: Sacar justo el dato que necesitas en scripts sin herramientas extra.
cuidado: Los textos literales van entre comillas simples dentro de la consulta: `"[?name=='x']"`.
ver: az, JSON, CLI
