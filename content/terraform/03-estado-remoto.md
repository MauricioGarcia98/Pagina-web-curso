---
titulo: "El estado en equipo: backends remotos, workspaces, import y lifecycle"
nivel: Avanzado
duracion: 75
resumen: Por qué el estado local no sirve en un equipo, cómo moverlo a un bucket con bloqueo y versionado, cómo separar entornos, y las herramientas para operar el estado sin romper nada (import, moved, state mv, prevent_destroy).
objetivos: Explicar los riesgos del estado local en un equipo y qué resuelven el bloqueo y el versionado | Configurar un backend remoto en S3, GCS o Azure Storage y migrar el estado | Separar entornos con workspaces o con carpetas y elegir entre los dos | Traer recursos creados a mano con import y renombrar recursos sin destruirlos con moved | Proteger recursos críticos con lifecycle (prevent_destroy, ignore_changes, create_before_destroy)
prerrequisitos: terraform-hcl-variables
autoevaluacion: ¿Sabes qué pasa si dos personas aplican a la vez con el estado local? | ¿Puedes escribir un bloque backend "s3", "gcs" o "azurerm"? | ¿Sabes dónde guarda el backend el estado de cada workspace? | ¿Sabes traer al estado un bucket creado a mano? | ¿Sabes renombrar un recurso en el código sin que Terraform lo destruya? | ¿Sabes cómo evitar que alguien borre la base de producción con un destroy?
---

:::escenario El día que se pisaron los estados
Ana y Bruno trabajan en el mismo proyecto de Terraform. Cada uno tiene su `terraform.tfstate` en su computadora. Ana crea el bucket de logs. Bruno, que no tiene ese bucket en **su** estado, agrega un permiso y aplica: Terraform intenta crear otra vez el bucket que ya existe y falla a la mitad. Otra semana, alguien borra por error su carpeta y su estado con ella: Terraform "olvida" 40 recursos de producción.

Martín decide:

> "El estado vive en un bucket, versionado y con bloqueo. Nadie más tiene un tfstate en su computadora. Y la base de producción no se puede destruir ni por error."
:::

## Qué guarda el estado y por qué importa

El estado es la **tabla de correspondencias** entre tu código y la nube: "`aws_s3_bucket.bronze` es el bucket `andina-prod-bronze`, con estos atributos". Sin él, Terraform no sabe qué creó.

```text
$ terraform state pull | jq '.resources[0]'
{
  "mode": "managed",
  "type": "aws_s3_bucket",
  "name": "bronze",
  "instances": [ { "attributes": { "bucket": "andina-prod-bronze", "arn": "arn:aws:s3:::andina-prod-bronze", ... } } ]
}
```

Tres problemas del estado **local** en un equipo:

| Problema | Qué pasa |
|---|---|
| **Cada uno tiene su copia** | El estado de Ana no sabe lo que aplicó Bruno. El siguiente plan es incorrecto |
| **Dos aplican a la vez** | Las dos ejecuciones leen el mismo estado, crean cosas en paralelo y una pisa el estado de la otra |
| **Se pierde** | Un disco roto o un `rm -rf` y Terraform pierde la memoria de todo lo que administra |

## Backends remotos

Un **backend** es el lugar donde Terraform guarda el estado. El remoto resuelve los tres problemas:

```diagrama
titulo: Un estado compartido, con bloqueo y versionado, para todo el equipo
nodo ana: Ana | icono=usuario | col=0 | fila=0 | color=azul
nodo bruno: Bruno | icono=usuario | col=0 | fila=1 | color=azul
nodo ci: CI/CD | icono=engranaje | col=0 | fila=2 | color=violeta | sub=GitHub Actions
nodo lock: Bloqueo | icono=candado | col=1 | fila=1 | color=rojo | sub=uno a la vez
nodo st: Bucket de estado | icono=bucket | col=2 | fila=1 | color=verde | sub=versionado + cifrado\nacceso restringido
nodo nube: La plataforma | icono=nube | col=3 | fila=1 | color=naranja
flecha ana -> lock
flecha bruno -> lock
flecha ci -> lock
flecha lock -> st: lee y guarda
flecha st -> nube: describe | estilo=punteada
```

- **Compartido**: todos leen y escriben el mismo archivo.
- **Bloqueo** (*state locking*): mientras alguien ejecuta `plan` o `apply`, el estado queda bloqueado y los demás reciben `Error acquiring the state lock`.
- **Versionado**: el bucket guarda cada versión del estado; si algo sale mal, se recupera la anterior.

### Los tres backends de nube

```hcl
# AWS: S3 (desde Terraform 1.10 el bloqueo usa un archivo .tflock en el mismo bucket)
terraform {
  backend "s3" {
    bucket       = "andina-tfstate"
    key          = "plataforma/lago.tfstate"
    region       = "us-east-1"
    encrypt      = true
    use_lockfile = true
  }
}
```

```hcl
# Google Cloud: GCS (el bloqueo viene incluido)
terraform {
  backend "gcs" {
    bucket = "andina-tfstate"
    prefix = "plataforma/lago"
  }
}
```

```hcl
# Azure: un contenedor de una cuenta de Storage (bloqueo con un lease del blob)
terraform {
  backend "azurerm" {
    resource_group_name  = "rg-tfstate"
    storage_account_name = "sttfstateandina"
    container_name       = "tfstate"
    key                  = "plataforma/lago.tfstate"
  }
}
```

:::nota El huevo y la gallina
El bucket del estado no puede crearlo el mismo proyecto que guarda su estado en él. Se crea **una sola vez**, aparte: con la CLI, o con un pequeño proyecto "bootstrap" que usa estado local. Antes de Terraform 1.10, en AWS hacía falta además una tabla de DynamoDB para el bloqueo (`dynamodb_table = "tf-locks"`); vas a verla en muchos proyectos existentes.
:::

:::cuidado El bloque backend no acepta variables
Dentro de `backend { }` no puedes usar `var.` ni `local.`: se lee antes que todo lo demás. Si necesitas valores distintos por entorno, se pasan en el `init`: `terraform init -backend-config="key=prod/lago.tfstate"` o `-backend-config=prod.s3.tfbackend`.
:::

## Laboratorio: mover el estado a S3

Abre la terminal y sigue los pasos.

**1. Crea el bucket del estado** (una vez, con la CLI) y actívale el versionado:

```bash norun
aws configure
aws s3 mb s3://andina-tfstate
aws s3api put-bucket-versioning --bucket andina-tfstate --versioning-configuration Status=Enabled
```

**2. El proyecto.** En `~/infra/lago`, un `main.tf` con el bloque `backend "s3"` de arriba, el proveedor y un bucket cuyo nombre usa el workspace:

```hcl
locals {
  prefijo = "andina-${terraform.workspace}"
}

resource "aws_s3_bucket" "bronze" {
  bucket = "${local.prefijo}-bronze"
}
```

**3. Inicializa y aplica:**

```text
$ terraform init
Initializing the backend...
Successfully configured the backend "s3"! Terraform will automatically
use this backend unless the backend configuration changes.
...
$ terraform apply -auto-approve
$ ls -a
.terraform/  .terraform.lock.hcl  main.tf          ← no hay terraform.tfstate local
$ aws s3 ls s3://andina-tfstate --recursive
2026-10-24 10:15:02       1317 plataforma/lago.tfstate
```

Si ya tenías un estado local, `terraform init` detecta el cambio de backend y pregunta si quieres **copiarlo** al nuevo (`terraform init -migrate-state`).

## Separar entornos

Ya viste en la lección anterior que aplicar `prod` sobre el estado de `dev` quiere **reemplazar** todo. Cada entorno necesita su propio estado. Hay dos formas.

### Opción 1: workspaces

Un **workspace** es un estado con nombre dentro del mismo backend. El código es el mismo; `terraform.workspace` te dice en cuál estás.

```text
$ terraform workspace new prod
Created and switched to workspace "prod"!
$ terraform workspace list
  default
* prod
$ terraform apply -auto-approve        # crea andina-prod-bronze
$ aws s3 ls s3://andina-tfstate --recursive
2026-10-24 10:20:11       1290 env:/prod/plataforma/lago.tfstate
2026-10-24 10:15:02       1317 plataforma/lago.tfstate
```

Cada backend guarda los workspaces a su manera: S3 en `env:/<workspace>/<key>`, GCS en `<prefix>/<workspace>.tfstate`, Azure en `<key>env:<workspace>`.

### Opción 2: una carpeta (o una clave) por entorno

```text
infra/
├── modules/lago/          ← el código reutilizable (lección de módulos)
└── envs/
    ├── dev/   main.tf  backend key = "dev/lago.tfstate"   terraform.tfvars
    ├── test/  main.tf  backend key = "test/lago.tfstate"  terraform.tfvars
    └── prod/  main.tf  backend key = "prod/lago.tfstate"  terraform.tfvars
```

| | Workspaces | Carpeta por entorno |
|---|---|---|
| Código | Exactamente el mismo | Cada carpeta llama al mismo módulo con sus valores |
| Riesgo | Olvidar en qué workspace estás y aplicar en prod | Menor: estás en la carpeta `prod/` |
| Diferencias entre entornos | Con condicionales (`terraform.workspace == "prod"`) | Naturales: cada carpeta tiene sus valores |
| Permisos distintos por entorno | Difícil (mismo backend) | Fácil: el estado de prod en otra cuenta o bucket |
| Uso típico | Entornos efímeros, ramas, pruebas | La mayoría de las empresas, para dev/test/prod |

## Operar el estado sin romper nada

### Ver: list, show, pull

```bash norun
terraform state list                         # todas las direcciones
terraform state show aws_s3_bucket.bronze    # los atributos de una
terraform state pull | jq .serial            # el JSON completo (serial = cuántas veces se escribió)
```

### Renombrar en el código: moved

Si cambias el nombre local `aws_s3_bucket.bronze` a `aws_s3_bucket.landing`, Terraform entiende que borraste uno y creaste otro: **destruye** el bucket y crea uno nuevo. Para decirle que es el mismo:

```hcl
resource "aws_s3_bucket" "landing" {
  bucket = "andina-bronze"
}

moved {
  from = aws_s3_bucket.bronze
  to   = aws_s3_bucket.landing
}
```

```text
$ terraform plan
  # aws_s3_bucket.bronze has moved to aws_s3_bucket.landing
Plan: 0 to add, 0 to change, 0 to destroy.
```

El bloque `moved` queda en el código (es documentación y sirve para los demás entornos). La alternativa por comando es `terraform state mv aws_s3_bucket.bronze aws_s3_bucket.landing`, pero hay que ejecutarla a mano en cada entorno; `moved` viaja por el pull request.

### Traer lo que se creó a mano: import

Un bucket que alguien creó en la consola no está en el estado. Para administrarlo con Terraform: escribe el bloque `resource` y **impórtalo**:

```text
$ terraform import aws_s3_bucket.manual creado-a-mano
aws_s3_bucket.manual: Importing from ID "creado-a-mano"...
Import successful!
$ terraform plan
No changes. Your infrastructure matches the configuration.
```

Si el plan después del import muestra cambios, es que tu código no describe exactamente cómo está el recurso: ajusta el código hasta que el plan diga `No changes`. Desde Terraform 1.5 también existe el bloque `import { to = aws_s3_bucket.manual  id = "creado-a-mano" }`, que se revisa en un pull request como cualquier cambio.

### Dejar de administrar: state rm

`terraform state rm aws_s3_bucket.viejo` saca el recurso del estado **sin borrarlo** de la nube. Se usa para pasar un recurso a otro proyecto (rm en uno, import en el otro).

## lifecycle: reglas de protección

```hcl
resource "aws_s3_bucket" "bronze" {
  bucket = "andina-prod-bronze"
  tags   = local.etiquetas

  lifecycle {
    prevent_destroy = true      # ningún plan puede destruirlo
    ignore_changes  = [tags]    # si alguien cambia las etiquetas afuera, no las pises
  }
}
```

| Regla | Qué hace | Cuándo |
|---|---|---|
| `prevent_destroy = true` | Cualquier plan que lo destruya o reemplace **falla** | Buckets con datos, bases de producción, el Key Vault |
| `ignore_changes = [x]` | Ignora diferencias en esos argumentos | Etiquetas que pone otra herramienta, tamaños que ajusta el autoescalado |
| `create_before_destroy = true` | En un reemplazo, crea el nuevo antes de borrar el viejo (`+/-`) | Recursos que no pueden faltar ni un minuto |

Con `prevent_destroy`, un `terraform destroy` o un cambio de nombre se frena así:

```text
│ Error: Instance cannot be destroyed
│
│   on main.tf line 4:
│
│ Resource aws_s3_bucket.bronze has lifecycle.prevent_destroy set, but the plan calls for
│ this resource to be destroyed.
```

### Más herramientas del plan

| Comando | Para qué |
|---|---|
| `terraform plan -target=aws_s3_bucket.bronze` | Planificar solo ese recurso (para emergencias, no para el día a día) |
| `terraform plan -replace=aws_s3_bucket.bronze` | Forzar que se reemplace (recurso dañado o corrupto) |
| `terraform plan -refresh-only` | Ver solo el **drift**: lo que cambió en la nube fuera de Terraform |

## Leer las salidas de otro proyecto

En una empresa no hay un único proyecto de Terraform: está la **red** (de un equipo), la **plataforma de datos** (de otro), cada uno con su estado. Para que la plataforma use la red que creó otro equipo, lee sus outputs:

```hcl
data "terraform_remote_state" "red" {
  backend = "s3"
  config = {
    bucket = "andina-tfstate"
    key    = "red/vpc.tfstate"
    region = "us-east-1"
  }
}

# data.terraform_remote_state.red.outputs.subred_privada
```

```diagrama
titulo: Proyectos separados que se pasan datos por los outputs
nodo red: Proyecto red | icono=servidor | col=0 | fila=0 | color=gris | sub=VPC, subredes\nestado: red/vpc.tfstate
nodo out: outputs | icono=check | col=1 | fila=0 | color=verde | sub=subred_privada\nvpc_id
nodo dat: Proyecto datos | icono=base | col=2 | fila=0 | color=azul | sub=lago, Glue, Redshift\nestado: datos/lago.tfstate
nodo ml: Proyecto ML | icono=ml | col=2 | fila=1 | color=violeta | sub=lee los buckets\ndel proyecto datos
flecha red -> out
flecha out -> dat: terraform_remote_state
flecha dat -> ml: terraform_remote_state | estilo=punteada
```

Dividir en proyectos chicos tiene ventajas: un plan más rápido, un error afecta menos cosas (*blast radius*) y cada equipo es dueño de lo suyo.

<!-- estandar:errores -->
:::errores
- **`Error acquiring the state lock`**: otra ejecución tiene el estado bloqueado. Espera. Si de verdad quedó colgado (una CI que se cortó), `terraform force-unlock <ID>`, **solo** si estás seguro de que nadie más está aplicando.
- **`Backend configuration changed`**: cambiaste el bloque backend. Ejecuta `terraform init -migrate-state` (copia el estado) o `-reconfigure` (empieza de cero, sin copiar).
- **Aplicar en el workspace equivocado**: antes de aplicar, `terraform workspace show`. Muchos equipos lo ponen en el prompt de la terminal.
- **Renombrar un recurso sin `moved`**: el plan muestra `1 to add, 1 to destroy` para algo que solo cambió de nombre. Si ves eso en un rename, para y agrega el bloque.
- **Editar el JSON del estado a mano**: usa `state mv`, `state rm` e `import`. Si de verdad hay que hacerlo, `state pull` > archivo > `state push`, con una copia de respaldo.
:::

<!-- estandar:trabajo -->
:::trabajo
- El bucket del estado tiene versionado, cifrado, **bloqueo de acceso público** y acceso solo para la CI y unas pocas personas: el estado puede contener contraseñas y llaves.
- Los estados se dividen por **dominio y entorno**: `red/prod`, `datos/prod`, `datos/dev`. Un estado gigante con todo tarda minutos en planificar, y un error ahí puede romper todo.
- Los recursos con datos (buckets, bases, Key Vault, catálogos) llevan `prevent_destroy`. En la revisión del pull request, cualquier `-/+` sobre ellos se discute.
- Una tarea programada (por ejemplo, cada noche) ejecuta `terraform plan -detailed-exitcode` en cada entorno y avisa si hay **drift**: alguien cambió algo a mano.
:::

<!-- estandar:entrevista -->
:::entrevista "Un compañero cambió algo en la consola y ahora el plan quiere revertirlo. ¿Qué haces?"
Primero entiendo si el cambio era correcto. Si lo era, lo llevo al código para que el plan quede en `No changes` (y si era un recurso nuevo, lo importo). Si no lo era, dejo que el apply lo revierta. En los dos casos, el cambio queda registrado en un pull request. Para que no se repita: permisos de solo lectura en la consola de producción, y un plan programado que detecte el drift y avise. Si el atributo lo cambia otro sistema a propósito (por ejemplo, el autoescalado), uso `lifecycle { ignore_changes = [...] }`.
:::

## Resumen

| Necesitas… | Usa |
|---|---|
| Compartir el estado con bloqueo | `backend "s3"` (`use_lockfile`), `"gcs"` o `"azurerm"` |
| Copiar el estado al cambiar de backend | `terraform init -migrate-state` |
| Un estado por entorno | Carpeta por entorno (o `terraform workspace new`) |
| Renombrar un recurso sin destruirlo | Bloque `moved` (o `terraform state mv`) |
| Administrar algo creado a mano | `terraform import` (o bloque `import`) |
| Dejar de administrar sin borrar | `terraform state rm` |
| Que algo no se pueda destruir | `lifecycle { prevent_destroy = true }` |
| Usar outputs de otro proyecto | `data "terraform_remote_state"` |

## Ejercicios

:::ejercicio quiz
Dos personas ejecutan `terraform apply` al mismo tiempo con un backend S3 con `use_lockfile = true`. ¿Qué pasa?

- [ ] Las dos aplican y el estado queda con los cambios de ambas
- [x] La segunda recibe "Error acquiring the state lock" y no aplica hasta que la primera termina
- [ ] Se corrompe el estado
- [ ] Terraform combina los dos planes
:::

:::ejercicio quiz
Cambias `resource "aws_s3_bucket" "bronze"` a `resource "aws_s3_bucket" "landing"` sin cambiar el nombre del bucket. ¿Qué muestra el plan si no agregas nada más?

- [ ] No changes, porque el bucket se llama igual
- [x] Que destruye aws_s3_bucket.bronze y crea aws_s3_bucket.landing
- [ ] Un error de sintaxis
- [ ] Que actualiza el bucket en el lugar
:::

:::ejercicio quiz
¿Por qué este bloque no funciona?

```hcl
terraform {
  backend "s3" {
    bucket = "andina-tfstate"
    key    = "${var.entorno}/lago.tfstate"
  }
}
```

- [ ] Falta la región
- [x] El bloque backend no admite variables: se pasa con terraform init -backend-config
- [ ] La clave no puede tener barras
- [ ] S3 no se puede usar como backend
:::

:::ejercicio quiz
¿Qué hace `terraform state rm aws_s3_bucket.viejo`?

- [ ] Borra el bucket de la nube
- [x] Saca el bucket del estado: Terraform deja de administrarlo, pero sigue existiendo
- [ ] Borra el bucket y el estado
- [ ] Mueve el bucket a otro workspace
:::

:::ejercicio cli
El proyecto de `~/infra/lago` guarda el estado en S3. Crea un workspace nuevo llamado `prod` (y queda seleccionado).
```respuesta
terraform workspace new prod
```
```setup
aws configure
aws s3 mb s3://andina-tfstate
mkdir -p ~/infra/lago
printf 'terraform {\n  backend "s3" {\n    bucket       = "andina-tfstate"\n    key          = "plataforma/lago.tfstate"\n    region       = "us-east-1"\n    use_lockfile = true\n  }\n}\n\nprovider "aws" {\n  region = "us-east-1"\n}\n\nresource "aws_s3_bucket" "bronze" {\n  bucket = "andina-${terraform.workspace}-bronze"\n}\n' > ~/infra/lago/main.tf
cd ~/infra/lago
terraform init
```
:::

:::ejercicio cli
Alguien creó a mano el bucket `andina-legacy`. En `main.tf` ya está escrito `resource "aws_s3_bucket" "legacy"` con ese nombre. Tráelo al estado de Terraform.
```respuesta
terraform import aws_s3_bucket.legacy andina-legacy
```
```setup
aws configure
aws s3 mb s3://andina-legacy
mkdir -p ~/infra/legacy
printf 'provider "aws" {\n  region = "us-east-1"\n}\n\nresource "aws_s3_bucket" "legacy" {\n  bucket = "andina-legacy"\n}\n' > ~/infra/legacy/main.tf
cd ~/infra/legacy
terraform init
```
:::

:::ejercicio cli
En el estado está `aws_s3_bucket.crudo` y en el código lo renombraste a `aws_s3_bucket.bronze`. Muévelo en el estado con un comando para que Terraform no lo destruya.
```respuesta
terraform state mv aws_s3_bucket.crudo aws_s3_bucket.bronze
```
```setup
aws configure
mkdir -p ~/infra/mv
printf 'provider "aws" {\n  region = "us-east-1"\n}\n\nresource "aws_s3_bucket" "crudo" {\n  bucket = "andina-dev-bronze"\n}\n' > ~/infra/mv/main.tf
cd ~/infra/mv
terraform init
terraform apply -auto-approve
sed -i 's/"crudo"/"bronze"/' main.tf
```
:::

:::ejercicio abierto titulo="Proteger el lago de producción"
Escribe el bloque del bucket `andina-prod-gold` de modo que: (1) nadie pueda destruirlo con Terraform; (2) las etiquetas que agrega el equipo de FinOps desde otra herramienta no se pisen en cada apply; (3) si alguna vez hay que reemplazarlo, el nuevo exista antes de borrar el viejo. Explica qué pasaría si alguien ejecuta `terraform destroy` en ese proyecto.
```solucion
resource "aws_s3_bucket" "gold" {
  bucket = "andina-prod-gold"
  tags   = local.etiquetas

  lifecycle {
    prevent_destroy       = true
    ignore_changes        = [tags]
    create_before_destroy = true
  }
}

Si alguien ejecuta terraform destroy, el plan falla con "Instance cannot be destroyed" y no se borra nada, ni siquiera los demás recursos: Terraform no aplica un plan parcial. Para borrarlo de verdad habría que quitar prevent_destroy en un pull request, que alguien tiene que revisar y aprobar. Ojo: create_before_destroy en un bucket con nombre fijo choca (dos buckets no pueden llamarse igual), así que en la práctica se combina con un nombre que tenga un sufijo aleatorio, o directamente se evita reemplazar buckets con datos.
```
:::
