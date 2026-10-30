---
titulo: Identidad, permisos (RBAC) y Key Vault
nivel: Avanzado
duracion: 35
resumen: Usuarios, service principals, managed identities, roles RBAC, alcance y secretos con Key Vault.
---

## Las dos preguntas de la seguridad

Toda la seguridad en la nube se reduce a dos preguntas:

1. **Autenticación**: ¿**quién** eres? (demuéstralo con una contraseña, un certificado, un token).
2. **Autorización**: ¿**qué** puedes hacer y **dónde**?

En Azure, la primera la responde **Microsoft Entra ID** (antes Azure Active Directory), el directorio de identidades de la organización. La segunda, **RBAC** (*role-based access control*): permisos asignados por roles. Y un tercer servicio, **Key Vault**, guarda los secretos (contraseñas, tokens, llaves) para que nunca estén escritos en el código.

:::analogia El edificio de oficinas
Entra ID es la recepción que verifica tu DNI y te da una tarjeta. RBAC define qué puertas abre tu tarjeta: el piso 3 completo (un grupo de recursos), solo la sala de servidores (un recurso), o todo el edificio (la suscripción). Key Vault es la caja fuerte donde se guardan las llaves de los proveedores; quien tiene permiso puede pedirlas, pero nadie las lleva en el bolsillo.
:::

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

### Cómo se lee un role assignment

`az role assignment create --assignee equipo-datos@empresa.com --role "Storage Blob Data Contributor" --scope $ST_ID` se lee: "el grupo **equipo-datos** puede **leer y escribir datos** en **esta cuenta de almacenamiento** (y en todo lo que contiene)". Las tres partes son obligatorias, y equivocarse en el alcance es el error más peligroso: el mismo rol con `--scope /subscriptions/$SUB_ID` daría acceso a **todas** las cuentas de la suscripción.

## Key Vault: el lugar de los secretos

```bash norun
az keyvault create --name kv-datos-dev --resource-group rg-datos-dev --location eastus2
az keyvault secret set --vault-name kv-datos-dev --name sql-password --value "S3cr3t0!"
az keyvault secret show --vault-name kv-datos-dev --name sql-password --query value -o tsv
az keyvault secret list --vault-name kv-datos-dev -o table
```

En Databricks, un **secret scope respaldado por Key Vault** permite leer esos secretos en notebooks con `dbutils.secrets.get(scope="kv", key="sql-password")`, sin que el valor aparezca nunca en pantalla. Airflow puede usar Key Vault como backend de Connections y Variables.

```recorrido
titulo: Cómo decide Azure si una identidad puede leer el lago
estacion quien: Identidad | icono=usuario
estacion rol: Rol | icono=etiqueta
estacion scope: Alcance | icono=capas
estacion pide: La petición | icono=api
estacion kv: Key Vault | icono=escudo
paso quien: ¿Quién pide?
Puede ser una persona, un *service principal* (una aplicación) o una **identidad administrada** (la de un recurso de Azure, por ejemplo un clúster de Databricks o una Function). Para procesos automáticos se prefiere la identidad administrada: no tiene contraseña que guardar.
>>> texto
persona               → alumno@contoso.com
service principal     → sp-ci-datos (GitHub Actions)
identidad administrada → la de la Function func-ingesta
paso rol: ¿Qué puede hacer? El rol
Un rol es una lista de acciones permitidas. Para **leer datos** de un lago hace falta un rol de datos (`Storage Blob Data Reader`); `Reader` solo deja ver que la cuenta existe.
>>> texto
Reader                        → ver el recurso (plano de control)
Storage Blob Data Reader      → leer archivos (plano de datos)
Storage Blob Data Contributor → leer y escribir archivos
paso scope: ¿Dónde? El alcance
La asignación une identidad + rol + **alcance**. Se hereda hacia abajo: asignada al grupo de recursos, vale para todas las cuentas de ese grupo.
>>> log
$ az role assignment create --assignee alumno@contoso.com \
    --role 'Storage Blob Data Reader' \
    --scope /subscriptions/1111aaaa-1111-4111-8111-111111111111/resourceGroups/rg-datos-dev
{
  "rol": "Storage Blob Data Reader",
  "scope": "/subscriptions/1111aaaa-1111-4111-8111-111111111111/resourceGroups/rg-datos-dev"
}
paso pide: La petición se evalúa
Al leer un archivo, Azure busca una asignación cuyo rol incluya esa acción, en ese alcance o en uno superior. Si no la encuentra, responde `AuthorizationPermissionMismatch` (403). Las asignaciones nuevas pueden tardar unos minutos en aplicarse.
>>> texto
identidad: alumno@contoso.com
acción:   leer bronze/ventas/2024/ventas_2024-12.csv
→ ¿hay rol con esa acción en la cuenta, el grupo o la suscripción?  sí → 200 OK
paso kv: Y los secretos, en Key Vault
Contraseñas y tokens no van en el código: se guardan en Key Vault y se leen con la misma lógica de identidad + rol (`Key Vault Secrets User`).
>>> bash
az keyvault secret show --vault-name kv-datos --name token --query value -o tsv
```

## Pruébalo en la terminal

```bash
az login
az group create --name rg-datos-dev --location eastus2
az keyvault create --name kv-datos-dev --resource-group rg-datos-dev --location eastus2
az keyvault secret set --vault-name kv-datos-dev --name databricks-token --value dapi-ejemplo-123
az keyvault secret list --vault-name kv-datos-dev -o table
az keyvault secret show --vault-name kv-datos-dev --name databricks-token --query value -o tsv
```

Fíjate en el último comando: `--query value -o tsv` devuelve **solo** el valor, listo para guardarlo en una variable (`TOKEN=$(az keyvault secret show … )`) sin que quede escrito en ningún archivo.

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
