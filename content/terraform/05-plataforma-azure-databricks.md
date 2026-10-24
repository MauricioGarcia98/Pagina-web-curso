---
titulo: "Proyecto: el lakehouse completo en Azure y Databricks con Terraform"
nivel: Avanzado
duracion: 90
resumen: Construye de punta a punta la plataforma del Grupo Andino: grupo de recursos, Data Lake Gen2 con sus capas, Key Vault con secretos, Databricks con Unity Catalog (credencial, ubicaciones externas, catálogo, esquemas, permisos), un clúster, un job programado, un SQL Warehouse y Data Factory. En dos proyectos de Terraform conectados.
objetivos: Diseñar una plataforma de datos en Azure como un conjunto de recursos de Terraform con sus dependencias | Crear el Data Lake Gen2 con capas, el Key Vault y el workspace de Databricks con identidades y permisos | Configurar Unity Catalog con Terraform: credencial, ubicaciones externas, catálogo, esquemas y grants | Separar la infraestructura de nube y la del workspace en dos proyectos conectados con terraform_remote_state | Verificar con az y databricks que lo creado existe y funciona
prerrequisitos: terraform-modulos | azure-storage | databricks-unity-catalog
autoevaluacion: ¿Puedes dibujar los recursos de la plataforma y sus dependencias? | ¿Sabes por qué el lago usa is_hns_enabled = true? | ¿Sabes cómo accede Databricks al lago sin claves (access connector + rol)? | ¿Sabes por qué se separan los proyectos de nube y de workspace? | ¿Puedes escribir un databricks_job con dos tareas dependientes?
---

:::escenario La plataforma del Grupo Andino, en código
El Grupo Andino eligió Azure con Databricks. La plataforma se armó en meses de clics. Ahora hay que crear `test` y `prod` idénticos, y la auditoría pide saber quién tiene acceso a qué. Martín te asigna el proyecto:

> "Toda la plataforma en Terraform, en dos proyectos: uno para lo de Azure y otro para lo de adentro de Databricks. Que `terraform apply` en una suscripción vacía deje todo listo para que el equipo de datos empiece a trabajar."
:::

## La arquitectura

```diagrama
titulo: La plataforma de datos del Grupo Andino en Azure (proyecto 1) y Databricks (proyecto 2)
nodo rg: rg-andina-dev-datos | icono=capas | col=0 | fila=0 | color=gris | sub=grupo de recursos
nodo st: stlakeandinadev | icono=bucket | col=1 | fila=0 | color=azul | sub=Data Lake Gen2\nbronze · silver · gold
nodo kv: kv-andina-dev | icono=llave | col=2 | fila=0 | color=amarillo | sub=secretos de las fuentes
nodo adf: adf-andina-dev | icono=orquestador | col=3 | fila=0 | color=cian | sub=Data Factory
nodo ac: Access connector | icono=escudo | col=1 | fila=1 | color=rojo | sub=identidad administrada
nodo dbw: dbw-andina-dev | icono=spark | col=2 | fila=1 | color=naranja | sub=workspace premium
nodo uc: Unity Catalog | icono=tabla | col=1 | fila=2 | color=violeta | sub=credencial con la identidad\ndel connector, catálogo,\nesquemas, grants
nodo comp: Cómputo | icono=servidor | col=2 | fila=2 | color=verde | sub=clúster ETL, job diario,\nSQL Warehouse: leen y\nescriben tablas
grupo p1: Proyecto 1 · plataforma (azurerm) | nodos=rg,st,kv,adf,ac,dbw | color=azul
grupo p2: Proyecto 2 · workspace (databricks) | nodos=uc,comp | color=violeta
flecha rg -> st
flecha st -> kv | estilo=punteada
flecha ac -> st: Storage Blob Data Contributor
flecha dbw -> comp
flecha uc -> ac
flecha comp -> uc
```

| Recurso | Para qué | Decisión clave |
|---|---|---|
| Grupo de recursos | Agrupa todo y define la región | Uno por entorno: borrar el entorno es borrar el grupo |
| Storage con **HNS** | El lago (ADLS Gen2) | `is_hns_enabled = true`: carpetas reales y permisos por carpeta |
| Contenedores bronze/silver/gold | Una capa por contenedor | Permisos distintos por capa |
| Key Vault | Contraseñas de las fuentes | RBAC; protección contra borrado en prod |
| Workspace de Databricks | Notebooks, jobs, SQL | SKU `premium` (Unity Catalog lo necesita) |
| Access connector | La identidad con la que Databricks lee el lago | Sin claves: rol `Storage Blob Data Contributor` |
| Data Factory | Copia desde las fuentes (ERP, SFTP) a bronze | Identidad administrada |

## ¿Por qué dos proyectos?

El proveedor `databricks` necesita la **URL de un workspace** para conectarse. Si el workspace y lo de adentro están en el mismo proyecto, en el primer plan esa URL todavía no existe, y si un día hay que reemplazar el workspace, el proveedor se queda sin destino a mitad del plan. Por eso la práctica recomendada es:

1. **Proyecto `plataforma`** (proveedor `azurerm`): todo lo de Azure. Expone outputs: la URL del workspace, los `abfss://` de cada capa, el id del access connector.
2. **Proyecto `workspace`** (proveedor `databricks`): Unity Catalog, clústeres, jobs y permisos. Lee los outputs del primero con `terraform_remote_state`.

Además, suelen tener dueños distintos: el equipo de plataforma administra el primero, y el equipo de datos, el segundo.

## Proyecto 1: la plataforma en Azure

### Proveedores y variables

```hcl
# plataforma/versions.tf
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.14"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
}

provider "azurerm" {
  features {}           # obligatorio en azurerm, aunque esté vacío
}

# plataforma/variables.tf
variable "entorno" {
  type    = string
  default = "dev"
}

variable "ubicacion" {
  type    = string
  default = "brazilsouth"
}
```

### Nombres y etiquetas

```hcl
data "azurerm_client_config" "actual" {}        # quién ejecuta: tenant_id, object_id

locals {
  nombre = "andina-${var.entorno}"
  cuenta = substr(replace("stlakeandina${var.entorno}", "-", ""), 0, 24)
  capas  = toset(["bronze", "silver", "gold"])
  etiquetas = {
    proyecto = "lakehouse"
    entorno  = var.entorno
  }
}
```

Un **data source** (`data "tipo" "nombre"`) **lee** algo que ya existe en lugar de crearlo. `azurerm_client_config` devuelve los datos de la sesión con la que ejecutas Terraform; el Key Vault necesita el `tenant_id`.

### El lago

```hcl
resource "azurerm_resource_group" "datos" {
  name     = "rg-${local.nombre}-datos"
  location = var.ubicacion
  tags     = local.etiquetas
}

resource "azurerm_storage_account" "lago" {
  name                     = local.cuenta
  resource_group_name      = azurerm_resource_group.datos.name
  location                 = azurerm_resource_group.datos.location
  account_tier             = "Standard"
  account_replication_type = "LRS"       # en prod: ZRS o GRS
  is_hns_enabled           = true        # Data Lake Gen2
  tags                     = local.etiquetas
}

resource "azurerm_storage_data_lake_gen2_filesystem" "capa" {
  for_each           = local.capas
  name               = each.key
  storage_account_id = azurerm_storage_account.lago.id
}
```

Mira las **referencias**: la cuenta usa `azurerm_resource_group.datos.name`. Así Terraform sabe que primero tiene que crear el grupo. Nunca escribas el nombre del grupo a mano en la cuenta: perderías la dependencia y el orden.

### Secretos

```hcl
resource "azurerm_key_vault" "kv" {
  name                      = "kv-${local.nombre}"
  location                  = azurerm_resource_group.datos.location
  resource_group_name       = azurerm_resource_group.datos.name
  tenant_id                 = data.azurerm_client_config.actual.tenant_id
  sku_name                  = "standard"
  enable_rbac_authorization = true
  purge_protection_enabled  = var.entorno == "prod"
}

resource "random_password" "sql" {
  length  = 24
  special = true
}

resource "azurerm_key_vault_secret" "sql" {
  name         = "sql-erp-password"
  value        = random_password.sql.result
  key_vault_id = azurerm_key_vault.kv.id
}
```

La contraseña la **genera** Terraform (`random_password`) y la guarda en el Key Vault: no aparece en el código ni en el plan (`(sensitive value)`). Los pipelines la leen del Key Vault, nunca de Terraform.

### Databricks y su identidad

```hcl
resource "azurerm_databricks_workspace" "dbw" {
  name                = "dbw-${local.nombre}"
  resource_group_name = azurerm_resource_group.datos.name
  location            = azurerm_resource_group.datos.location
  sku                 = "premium"
  tags                = local.etiquetas
}

# la identidad con la que Unity Catalog lee y escribe el lago
resource "azurerm_databricks_access_connector" "uc" {
  name                = "ac-${local.nombre}"
  resource_group_name = azurerm_resource_group.datos.name
  location            = azurerm_resource_group.datos.location
  identity {
    type = "SystemAssigned"
  }
}

resource "azurerm_role_assignment" "uc_lago" {
  scope                = azurerm_storage_account.lago.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azurerm_databricks_access_connector.uc.identity[0].principal_id
}

resource "azurerm_data_factory" "adf" {
  name                = "adf-${local.nombre}"
  location            = azurerm_resource_group.datos.location
  resource_group_name = azurerm_resource_group.datos.name
  identity {
    type = "SystemAssigned"
  }
}
```

`identity[0].principal_id` es el id de la identidad que Azure crea para el connector. El `role_assignment` le da permiso sobre **solo** esta cuenta (el `scope`). Ninguna clave de almacenamiento se copia a ningún lado.

### Outputs

```hcl
output "databricks_url" {
  value = "https://${azurerm_databricks_workspace.dbw.workspace_url}"
}

output "access_connector_id" {
  value = azurerm_databricks_access_connector.uc.id
}

output "dfs" {
  value = { for k, f in azurerm_storage_data_lake_gen2_filesystem.capa :
    k => "abfss://${f.name}@${azurerm_storage_account.lago.name}.dfs.core.windows.net/" }
}
```

## Proyecto 2: dentro de Databricks

### Conectarse al workspace del proyecto 1

```hcl
# workspace/main.tf
data "terraform_remote_state" "plataforma" {
  backend = "local"                      # en la empresa: "azurerm", con el mismo contenedor de estados
  config = {
    path = "../plataforma/terraform.tfstate"
  }
}

locals {
  plat = data.terraform_remote_state.plataforma.outputs
}

provider "databricks" {
  host = local.plat.databricks_url        # se autentica con tu sesión (databricks auth login o az login)
}
```

### Unity Catalog

```hcl
resource "databricks_storage_credential" "lago" {
  name = "cred-lago"
  azure_managed_identity {
    access_connector_id = local.plat.access_connector_id
  }
}

resource "databricks_external_location" "capa" {
  for_each        = toset(["bronze", "silver", "gold"])
  name            = "lago-${each.key}"
  url             = local.plat.dfs[each.key]
  credential_name = databricks_storage_credential.lago.name
}

resource "databricks_catalog" "dev" {
  name    = "dev"
  comment = "Catálogo de desarrollo"
}

resource "databricks_schema" "capa" {
  for_each     = toset(["bronze", "silver", "gold"])
  catalog_name = databricks_catalog.dev.name
  name         = each.key
}

resource "databricks_grants" "gold" {
  schema = databricks_schema.capa["gold"].id
  grant {
    principal  = "analistas"
    privileges = ["USE_SCHEMA", "SELECT"]
  }
}
```

La cadena completa: el **access connector** (Azure) tiene permiso sobre el lago → la **storage credential** (Databricks) usa esa identidad → cada **external location** autoriza una ruta `abfss://` → los **esquemas** y tablas viven ahí → los **grants** dicen quién puede leer qué. Con esto, la pregunta de la auditoría ("¿quién accede a gold?") se responde leyendo un archivo en Git.

### Cómputo y un job

```hcl
data "databricks_spark_version" "lts" {
  long_term_support = true
}

data "databricks_node_type" "chico" {
  local_disk = true
}

resource "databricks_cluster" "etl" {
  cluster_name            = "etl-dev"
  spark_version           = data.databricks_spark_version.lts.id
  node_type_id            = data.databricks_node_type.chico.id
  autotermination_minutes = 20           # se apaga solo: no pagues un clúster ocioso
  autoscale {
    min_workers = 1
    max_workers = 4
  }
}

resource "databricks_notebook" "ingesta" {
  path           = "/Shared/etl/ingesta_pedidos"
  language       = "PYTHON"
  content_base64 = base64encode(file("${path.module}/notebooks/ingesta_pedidos.py"))
}

resource "databricks_job" "diario" {
  name = "etl-pedidos-diario"

  task {
    task_key            = "ingesta"
    existing_cluster_id = databricks_cluster.etl.id
    notebook_task {
      notebook_path = databricks_notebook.ingesta.path
    }
  }

  task {
    task_key = "silver"
    depends_on {
      task_key = "ingesta"
    }
    existing_cluster_id = databricks_cluster.etl.id
    notebook_task {
      notebook_path = "/Shared/etl/silver_pedidos"
    }
  }

  schedule {
    quartz_cron_expression = "0 0 3 * * ?"     # todos los días a las 03:00
    timezone_id            = "America/Lima"
  }
}

resource "databricks_sql_endpoint" "bi" {
  name                      = "bi-dev"
  cluster_size              = "2X-Small"
  auto_stop_mins            = 10
  enable_serverless_compute = true
}
```

- Los **data sources** `databricks_spark_version` y `databricks_node_type` eligen la versión LTS más nueva y el tipo de máquina más chico con disco local. Así el código no queda atado a una versión vieja.
- `file()` lee un archivo de tu repositorio; `base64encode()` lo codifica como pide la API. El notebook se versiona en Git junto al job que lo ejecuta.
- En `databricks_job`, cada `task` tiene una clave, y `depends_on` arma el grafo: `silver` corre cuando `ingesta` termina bien.

:::nota Terraform o Asset Bundles
Para los **jobs y notebooks** de un proyecto de datos, muchos equipos usan **Databricks Asset Bundles** (que viste en el módulo de Databricks) en lugar de Terraform: están pensados para el ciclo de vida del código. Una división frecuente: Terraform para la plataforma (workspace, Unity Catalog, permisos, clústeres compartidos, warehouses) y Asset Bundles para los pipelines de cada equipo.
:::

## Laboratorio

La terminal tiene los dos simuladores (Azure y Databricks) conectados con Terraform.

**1. Sesiones:**

```bash norun
az login
databricks auth login --host https://adb-1234567890123456.7.azuredatabricks.net
mkdir -p ~/infra/plataforma ~/infra/workspace
```

**2. Proyecto 1.** En `~/infra/plataforma` escribe un `main.tf` con todo lo del proyecto 1 (proveedores, variables, locals, recursos y outputs; para el laboratorio puedes omitir `required_providers`):

```text
$ cd ~/infra/plataforma && terraform init && terraform apply -auto-approve
...
Plan: 12 to add, 0 to change, 0 to destroy.
...
Apply complete! Resources: 12 added, 0 changed, 0 destroyed.

Outputs:

access_connector_id = "/subscriptions/…/accessConnectors/ac-andina-dev"
databricks_url = "https://adb-….azuredatabricks.net"
dfs = {
  "bronze" = "abfss://bronze@stlakeandinadev.dfs.core.windows.net/"
  "gold"   = "abfss://gold@stlakeandinadev.dfs.core.windows.net/"
  "silver" = "abfss://silver@stlakeandinadev.dfs.core.windows.net/"
}
```

Son 12: grupo, cuenta, 3 contenedores, Key Vault, contraseña, secreto, workspace, connector, rol y Data Factory.

**3. Verifica con la CLI de Azure:**

```bash norun
az storage fs list --account-name stlakeandinadev --auth-mode login -o table
az keyvault secret list --vault-name kv-andina-dev -o table
```

**4. Proyecto 2.** En `~/infra/workspace` escribe el `main.tf` del proyecto 2. Para el laboratorio, cambia el `content_base64` del notebook por `base64encode("print('hola')")` (o crea el archivo `notebooks/ingesta_pedidos.py`).

```bash norun
cd ~/infra/workspace && terraform init && terraform apply -auto-approve
databricks catalogs list
databricks schemas list dev
databricks jobs list
```

**5. El orden de destrucción.** Para limpiar, primero el proyecto 2 y después el 1: `terraform destroy` en `workspace`, luego en `plataforma`. Al revés, el proyecto 2 queda apuntando a un workspace que ya no existe.

## Del laboratorio a producción

| En el laboratorio | En producción |
|---|---|
| Estado local | `backend "azurerm"` en una cuenta aparte, con un estado por proyecto y entorno |
| `terraform_remote_state` con `backend = "local"` | `backend = "azurerm"` y la clave del proyecto 1 |
| Tu usuario (`az login`) | Una identidad de la CI con OIDC (sin secretos) y permisos mínimos |
| `account_replication_type = "LRS"` | `ZRS` o `GRS` |
| Lago con acceso público de red | `public_network_access_enabled = false`, endpoints privados y workspace con *VNet injection* |
| Sin protección | `prevent_destroy` en el lago, el Key Vault y el catálogo; `purge_protection_enabled` |
| Grants a un grupo de prueba | Grants a grupos de Entra ID sincronizados con Databricks (SCIM) |

<!-- estandar:errores -->
:::errores
- **`StorageAccountAlreadyTaken`**: el nombre de una cuenta de Storage es **global** en todo Azure. Agrega un sufijo propio (o un `random_string`) al nombre.
- **El proveedor databricks falla con "cannot configure default credentials"**: falta la sesión (`databricks auth login` o `az login`) o el `host` del proveedor.
- **`403 This request is not authorized`** al crear tablas en una external location: el rol del access connector todavía no se propagó (puede tardar minutos) o se asignó en otra cuenta.
- **Unity Catalog pide un metastore**: el workspace tiene que estar asignado a un metastore de la región (se hace una vez por región con `databricks_metastore_assignment`, normalmente desde la cuenta de Databricks).
- **Destruir el proyecto 1 antes que el 2**: el estado del 2 queda con recursos huérfanos. Siempre en orden inverso de dependencias.
:::

<!-- estandar:trabajo -->
:::trabajo
- Este mismo código, con `entorno = "prod"` y su backend, crea producción en horas en lugar de semanas. Y la diferencia entre entornos queda escrita en un archivo `.tfvars`.
- Los permisos de Unity Catalog en Terraform son la respuesta a las auditorías: cada `grant` tiene un pull request con quién lo pidió y quién lo aprobó.
- Las empresas grandes tienen una **suscripción por entorno** (y a veces por dominio), creadas también con Terraform por el equipo de plataforma (*landing zones*).
- Los costos se controlan con código: `autotermination_minutes`, `auto_stop_mins`, tamaños máximos de clúster y **políticas de clúster** (`databricks_cluster_policy`) que limitan lo que cada equipo puede crear.
:::

<!-- estandar:entrevista -->
:::entrevista "¿Cómo le das acceso a Databricks al data lake sin guardar claves?"
Con una identidad administrada: creo un access connector de Databricks (que tiene una identidad del sistema), le asigno el rol Storage Blob Data Contributor sobre la cuenta del lago, y en Unity Catalog creo una storage credential que usa ese connector y external locations para cada ruta. Así no hay claves de la cuenta ni service principals con secretos que rotar, el acceso se controla con grants de Unity Catalog, y todo queda en Terraform.
:::

## Ejercicios

:::ejercicio quiz
¿Por qué la cuenta de Storage del lago lleva `is_hns_enabled = true`?

- [ ] Para que sea más barata
- [x] Para activar el espacio de nombres jerárquico de Data Lake Gen2: carpetas reales y permisos por carpeta
- [ ] Para que se pueda acceder desde internet
- [ ] Porque Databricks no funciona sin cifrado
:::

:::ejercicio quiz
En el proyecto 1, la cuenta usa `resource_group_name = azurerm_resource_group.datos.name` en lugar de `"rg-andina-dev-datos"`. ¿Qué se gana?

- [ ] Nada, es lo mismo
- [x] Terraform sabe que la cuenta depende del grupo y los crea (y borra) en el orden correcto
- [ ] El nombre se vuelve aleatorio
- [ ] Se evita que el grupo se cree
:::

:::ejercicio quiz
¿Qué hace `data "azurerm_client_config" "actual" {}`?

- [ ] Crea una configuración nueva en Azure
- [x] Lee los datos de la sesión con la que corre Terraform (tenant, suscripción, usuario)
- [ ] Guarda el estado en Azure
- [ ] Configura el proveedor
:::

:::ejercicio quiz
¿En qué orden se destruyen los dos proyectos?

- [ ] Primero plataforma, después workspace
- [x] Primero workspace (lo de adentro de Databricks), después plataforma
- [ ] No importa el orden
- [ ] Se destruyen los dos con un solo comando
:::

:::ejercicio cli
El proyecto `~/infra/plataforma` está aplicado. Muestra el valor del output `databricks_url` sin comillas (para usarlo en `databricks auth login --host`).
```respuesta
terraform output -raw databricks_url
```
```setup
az login
mkdir -p ~/infra/plataforma
printf 'provider "azurerm" {\n  features {}\n}\n\nresource "azurerm_resource_group" "datos" {\n  name     = "rg-andina-dev-datos"\n  location = "brazilsouth"\n}\n\nresource "azurerm_databricks_workspace" "dbw" {\n  name                = "dbw-andina-dev"\n  resource_group_name = azurerm_resource_group.datos.name\n  location            = azurerm_resource_group.datos.location\n  sku                 = "premium"\n}\n\noutput "databricks_url" {\n  value = "https://${azurerm_databricks_workspace.dbw.workspace_url}"\n}\n' > ~/infra/plataforma/main.tf
cd ~/infra/plataforma
terraform init
terraform apply -auto-approve
```
:::

:::ejercicio cli
Ya aplicaste el proyecto. Verifica con la CLI de Azure que existen los contenedores (filesystems) del lago en la cuenta `stlakeandinadev`, en formato tabla.
```respuesta
az storage fs list --account-name stlakeandinadev --auth-mode login -o table
az storage fs list --account-name stlakeandinadev --auth-mode login --output table
az storage fs list --auth-mode login --account-name stlakeandinadev -o table
az storage container list --account-name stlakeandinadev --auth-mode login -o table
```
```setup
az login
mkdir -p ~/infra/lago
printf 'provider "azurerm" {\n  features {}\n}\n\nresource "azurerm_resource_group" "datos" {\n  name     = "rg-andina-dev-datos"\n  location = "brazilsouth"\n}\n\nresource "azurerm_storage_account" "lago" {\n  name                     = "stlakeandinadev"\n  resource_group_name      = azurerm_resource_group.datos.name\n  location                 = azurerm_resource_group.datos.location\n  account_tier             = "Standard"\n  account_replication_type = "LRS"\n  is_hns_enabled           = true\n}\n\nresource "azurerm_storage_data_lake_gen2_filesystem" "capa" {\n  for_each           = toset(["bronze", "silver", "gold"])\n  name               = each.key\n  storage_account_id = azurerm_storage_account.lago.id\n}\n' > ~/infra/lago/main.tf
cd ~/infra/lago
terraform init
terraform apply -auto-approve
```
:::

:::ejercicio cli
En `~/infra/workspace` está el proyecto de Databricks ya aplicado. Lista los esquemas del catálogo `dev` con la CLI de Databricks para comprobar que Terraform los creó.
```respuesta
databricks schemas list dev
```
```setup
databricks auth login --host https://adb-1234567890123456.7.azuredatabricks.net
mkdir -p ~/infra/workspace
printf 'provider "databricks" {\n  host = "https://adb-1234567890123456.7.azuredatabricks.net"\n}\n\nresource "databricks_catalog" "dev" {\n  name = "dev"\n}\n\nresource "databricks_schema" "capa" {\n  for_each     = toset(["bronze", "silver", "gold"])\n  catalog_name = databricks_catalog.dev.name\n  name         = each.key\n}\n' > ~/infra/workspace/main.tf
cd ~/infra/workspace
terraform init
terraform apply -auto-approve
```
:::

:::ejercicio abierto titulo="El entorno de producción"
Partiendo del proyecto 1, describe qué cambiarías para producción y cómo lo harías sin duplicar el código: (1) dónde viven las diferencias; (2) tres cambios de seguridad; (3) dos de disponibilidad; (4) qué recursos protegerías con lifecycle y por qué; (5) cómo te asegurarías de que `terraform apply` de prod no lo ejecute cualquiera.
```solucion
1. El código del proyecto pasa a un módulo (modules/plataforma) y envs/dev y envs/prod lo llaman con su terraform.tfvars; cada uno con su backend "azurerm" (clave plataforma/prod.tfstate) y en su propia suscripción.
2. Seguridad: public_network_access_enabled = false en la cuenta y el Key Vault, con private endpoints; workspace de Databricks con VNet injection y sin IP pública (no_public_ip); purge_protection_enabled = true y soft delete en el Key Vault; network_rules con default_action = "Deny".
3. Disponibilidad: account_replication_type = "ZRS" (o "GRS"/"RAGZRS" si se exige otra región); soft delete y versionado de blobs para recuperar archivos borrados por error.
4. lifecycle { prevent_destroy = true } en la cuenta del lago (tiene los datos), el Key Vault (secretos; además no se puede recrear con el mismo nombre durante el período de retención) y el catálogo de Unity Catalog. Un destroy o un cambio que fuerce reemplazo falla y obliga a una decisión explícita en un pull request.
5. Nadie aplica prod desde su computadora: solo la CI, con una identidad federada (OIDC) que tiene permisos en la suscripción de prod; el job de apply de prod usa un environment de GitHub con aprobación obligatoria de dos personas y solo corre desde la rama main. Las personas tienen solo lectura en la suscripción de prod.
```
:::
