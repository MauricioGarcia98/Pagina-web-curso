# area: Terraform

## IaC
alias: infraestructura como código, infrastructure as code
nino: En vez de **armar tu castillo de bloques de memoria** cada vez (y que salga distinto), **escribes las instrucciones** paso a paso. Así cualquiera puede armar el mismo castillo, igualito, las veces que quiera.
que: Definir la infraestructura (buckets, redes, bases, clústeres, permisos) en **archivos de código** versionados en Git, en lugar de crearla a mano en la consola. Una herramienta compara lo escrito con lo que existe y aplica las diferencias. Herramientas: Terraform/OpenTofu, Pulumi, CloudFormation, Bicep, Asset Bundles.
ejemplo: El mismo código crea el entorno `dev` y el entorno `prod`, cambiando solo un archivo de variables.
para: Entornos reproducibles, revisión de cambios en pull requests, historial de quién cambió qué, y poder recrear todo ante un desastre.
cuidado: Si alguien después cambia cosas a mano en la consola, el código y la realidad se separan (drift).
ver: Terraform, Drift, CI/CD

## Terraform
alias: opentofu, tofu
nino: Terraform es un **constructor robot**: le das el plano de la casa (código) y él mira qué ya está construido, te dice qué le falta, y si le dices que sí, lo construye.
que: Herramienta de IaC de HashiCorp (OpenTofu es su versión abierta compatible). Se escribe en **HCL** con *providers* para cada plataforma (AWS, Azure, GCP, Databricks, Snowflake…). Flujo: `terraform init` → `plan` (qué cambiaría) → `apply` (lo hace). Guarda lo que creó en el **estado**.
ejemplo:
```bash
terraform init
terraform plan -out plan.tfplan
terraform apply plan.tfplan
```
para: Crear y mantener la infraestructura de datos de forma declarativa en cualquier nube.
ver: HCL, Provider, Estado, Plan

## HCL
alias: hashicorp configuration language, .tf
nino: Es **el idioma en que se escriben los planos** para Terraform: bloques con nombre y dentro, cosas como `nombre = "valor"`.
que: El lenguaje de configuración de Terraform: **bloques** (`resource`, `variable`, `output`, `module`, `provider`, `locals`, `data`) con **argumentos**, expresiones, referencias (`aws_s3_bucket.lago.arn`), funciones (`format`, `merge`, `lookup`), condicionales y bucles (`for`, `for_each`, `count`). Es declarativo: describes el resultado, no los pasos.
ejemplo:
```hcl
variable "entorno" { type = string }
locals { prefijo = "datos-${var.entorno}" }
resource "aws_s3_bucket" "lago" {
  bucket = "${local.prefijo}-lago"
  tags   = { entorno = var.entorno }
}
```
para: Escribir infraestructura legible y reutilizable.
ver: Terraform, Resource, for_each

## Provider
alias: proveedor, providers
nino: Es el **traductor** que le explica a Terraform cómo hablar con cada empresa: uno habla "AWS", otro "Azure", otro "Databricks".
que: Un plugin de Terraform que conoce la API de una plataforma y expone sus recursos y data sources. Se declara en `required_providers` con versión y se configura (región, suscripción, credenciales). Se descargan con `terraform init`.
ejemplo:
```hcl
terraform {
  required_providers { aws = { source = "hashicorp/aws", version = "~> 5.0" } }
}
provider "aws" { region = "us-east-1" }
```
para: Usar Terraform con cualquier plataforma.
cuidado: Fija versiones (`~> 5.0`) y guarda el `.terraform.lock.hcl` en Git para que todos usen lo mismo.
ver: Terraform, Archivo de bloqueo

## Resource
alias: recurso, resources
nino: Es **cada pieza del castillo**: una torre, una puerta, un puente. En el plano dices "quiero una puerta así" y Terraform la construye.
que: Bloque `resource "<tipo>" "<nombre>"` que declara un objeto de infraestructura que Terraform crea, actualiza y borra (bucket, rol, clúster, permiso). Se referencia como `tipo.nombre.atributo`, y esas referencias definen el orden de creación.
ejemplo:
```hcl
resource "azurerm_storage_container" "bronze" {
  name               = "bronze"
  storage_account_id = azurerm_storage_account.lago.id
}
```
para: Declarar cada cosa que debe existir.
ver: HCL, Data source, Estado

## Data source
alias: data, fuente de datos de terraform
nino: Es **mirar algo que ya existe** (pero que no construiste tú) para usar sus datos: "¿cuál es el número de la casa del vecino?". No lo construye ni lo cambia.
que: Bloque `data "<tipo>" "<nombre>"` que **lee** información de algo existente (una cuenta, una VPC, un rol creado por otro equipo, la identidad actual) para usarla en tus recursos, sin administrarlo.
ejemplo:
```hcl
data "aws_caller_identity" "actual" {}
locals { cuenta = data.aws_caller_identity.actual.account_id }
```
para: Conectar tu código con infraestructura que no es tuya.
ver: Resource, Output

## Output
alias: outputs, salida
nino: Es el **cartelito que deja el robot al terminar**: "la puerta quedó en tal lugar, la llave es esta". Otros pueden leer el cartel.
que: Bloque `output` que expone valores después del `apply` (nombres, IDs, URLs). Se ven con `terraform output` y los usan otros módulos, scripts o pipelines.
ejemplo:
```hcl
output "bucket_lago" { value = aws_s3_bucket.lago.bucket }
```
`terraform output -raw bucket_lago`
para: Pasar datos de la infraestructura a quien la usa.
cuidado: Marca como `sensitive = true` los outputs secretos (aun así quedan en el estado).
ver: Módulo, Estado

## Estado
alias: state, terraform.tfstate, tfstate
nino: Es la **libreta donde el robot anota todo lo que construyó**: "hice esta torre, tiene este número". Si pierde la libreta, ya no sabe qué es suyo y podría construir todo de nuevo.
que: El archivo `terraform.tfstate` (JSON) que mapea cada recurso del código con el objeto real (sus IDs y atributos). Terraform lo usa para calcular el plan. Contiene datos sensibles. En equipo debe estar en un **backend remoto** con bloqueo.
ejemplo: `terraform state list` muestra `aws_s3_bucket.lago`; `terraform state show aws_s3_bucket.lago` sus atributos.
para: Que Terraform sepa qué administra y qué cambiar.
cuidado: Nunca edites el estado a mano ni lo subas a Git. Usa `terraform state mv` o bloques `moved`/`import` para cambios.
ver: Backend remoto, Plan, Import

## Backend remoto
alias: remote backend, backend
nino: Es guardar la **libreta del robot en una caja fuerte compartida**, para que todo el equipo use la misma libreta y dos personas no escriban a la vez.
que: Dónde se guarda el estado: S3 (con bloqueo nativo `use_lockfile` o DynamoDB), Azure Blob (bloqueo por *lease*), GCS, HCP Terraform. Aporta estado compartido, **bloqueo** (evita dos `apply` simultáneos), cifrado y versionado.
ejemplo:
```hcl
terraform {
  backend "s3" {
    bucket       = "empresa-tfstate"
    key          = "datos/prod.tfstate"
    region       = "us-east-1"
    use_lockfile = true
    encrypt      = true
  }
}
```
para: Trabajar en equipo y desde CI/CD de forma segura.
ver: Estado, Workspace

## Plan
alias: terraform plan, plan de terraform
nino: Antes de construir, el robot te muestra **la lista de lo que va a hacer**: "voy a agregar 2 torres, pintar 1 puerta y **tirar 1 puente**". Tú revisas y dices sí o no.
que: `terraform plan` compara el código con el estado y la realidad y muestra las acciones: `+` crear, `~` modificar, `-` destruir, `-/+` reemplazar. Con `-out` se guarda para que `apply` haga exactamente eso. En CI se publica en el pull request.
ejemplo: `Plan: 2 to add, 1 to change, 0 to destroy.` — si dice `1 to destroy` y no lo esperabas, frena.
para: Revisar los cambios antes de aplicarlos.
cuidado: Lee siempre las líneas `-/+ must be replaced`: reemplazar una base o un bucket puede significar perder datos.
ver: Terraform, Estado, Lifecycle

## Workspace
alias: workspaces, terraform workspace
nino: Es tener **varias libretas para el mismo plano**: una para la casa de práctica y otra para la casa de verdad.
que: En Terraform CLI, estados separados para la misma configuración (`terraform workspace new dev`), accesibles con `terraform.workspace`. Muchos equipos prefieren carpetas o archivos de variables por entorno (`envs/dev`, `envs/prod`) con backends distintos, porque es más explícito y aísla mejor los permisos.
ejemplo: `terraform workspace select prod && terraform plan -var-file=prod.tfvars`.
para: Varios entornos con el mismo código.
ver: Estado, Backend remoto, Módulo

## Módulo
alias: module, modules
nino: Es una **pieza de Lego prearmada**: alguien ya armó "una ventana completa" y tú la usas cada vez que necesitas una ventana, solo eligiendo el color.
que: Un conjunto de archivos `.tf` reutilizable con **variables** (entradas) y **outputs** (salidas). Se usa con un bloque `module` apuntando a una carpeta local, al Registry o a Git (con versión). Encapsula buenas prácticas (por ejemplo, un "lago" con buckets bronze/silver/gold, cifrado, versionado y permisos).
ejemplo:
```hcl
module "lago" {
  source  = "./modules/lago"
  entorno = "dev"
  capas   = ["bronze", "silver", "gold"]
}
output "buckets" { value = module.lago.buckets }
```
para: No repetir código y estandarizar la infraestructura.
ver: HCL, Output, for_each

## for_each
alias: count, bucle de terraform
nino: Es decirle al robot "**haz una torre por cada color de esta lista**", en vez de escribir tres veces "haz una torre".
que: Meta-argumento que crea **una instancia de un recurso o módulo por cada elemento** de un mapa o conjunto, identificadas por clave (`aws_s3_bucket.capa["silver"]`). `count` lo hace por número, pero al quitar un elemento de la mitad renumera y puede destruir recursos: `for_each` es más seguro.
ejemplo:
```hcl
resource "aws_s3_bucket" "capa" {
  for_each = toset(["bronze", "silver", "gold"])
  bucket   = "datos-dev-${each.key}"
}
```
para: Crear muchos recursos similares sin repetir código.
ver: HCL, Módulo

## Lifecycle
alias: prevent_destroy, ignore_changes, create_before_destroy
nino: Son **reglas especiales para una pieza**: "esta torre **nunca** se puede tirar", o "si alguien le cambia el color, no lo toques".
que: Bloque `lifecycle` dentro de un recurso: `prevent_destroy` (falla si el plan intenta destruirlo), `ignore_changes` (no revierte cambios en ciertos atributos), `create_before_destroy` (crea el reemplazo antes de borrar el viejo) y `replace_triggered_by`.
ejemplo:
```hcl
resource "aws_s3_bucket" "lago" {
  bucket = "empresa-lago-prod"
  lifecycle { prevent_destroy = true }
}
```
para: Proteger recursos con datos y controlar reemplazos.
ver: Plan, Resource

## Import
alias: terraform import, bloque import
nino: Si ya había una torre **construida a mano**, *import* es **anotarla en la libreta del robot** para que desde ahora la cuide él.
que: Llevar al estado de Terraform un recurso que ya existe. Hoy se hace con un bloque `import { to = …  id = … }` y `terraform plan -generate-config-out=generado.tf` para obtener el código. Luego Terraform lo administra como cualquier otro.
ejemplo:
```hcl
import {
  to = aws_s3_bucket.lago
  id = "empresa-lago-prod"
}
```
para: Pasar a IaC infraestructura creada a mano.
ver: Estado, Drift

## Drift
alias: deriva, desvío de configuración
nino: Es cuando **alguien movió las piezas del castillo sin avisar**: el plano dice una cosa y el castillo real es otro.
que: La diferencia entre lo que dice el código/estado y la infraestructura real, normalmente por cambios manuales en la consola. `terraform plan` la detecta (`terraform plan -refresh-only` solo la muestra). Se resuelve llevando el cambio al código o dejando que Terraform lo revierta.
ejemplo: Alguien abrió una regla de firewall a mano; el plan nocturno en CI muestra `~ update in-place` en esa regla y alerta al equipo.
para: Mantener la confianza en que el código describe la realidad.
cuidado: Lo mejor es que en producción nadie tenga permisos de escritura a mano: los cambios solo pasan por el pipeline.
ver: IaC, Plan, Import

## OIDC
alias: openid connect, federación de identidad, workload identity federation
nino: En vez de darle a tu robot (el pipeline) **una llave que guarda para siempre**, cada vez que necesita entrar **muestra su carnet oficial** y le dan una pulsera que dura una hora.
que: Protocolo de identidad usado para que un sistema externo (GitHub Actions, GitLab, Azure DevOps) obtenga **credenciales temporales** en la nube sin secretos guardados: el proveedor de CI emite un token firmado ("soy el repo X, rama main"), y la nube confía en él según reglas (AWS IAM OIDC provider + rol; Azure federated credentials; GCP Workload Identity Federation).
ejemplo:
```yaml
permissions: {id-token: write, contents: read}
steps:
  - uses: aws-actions/configure-aws-credentials@v4
    with: {role-to-assume: "arn:aws:iam::123456789012:role/gh-terraform", aws-region: us-east-1}
  - run: terraform plan
```
para: CI/CD sin claves de larga duración que se puedan filtrar.
cuidado: Restringe la confianza al repositorio y la rama (o al entorno) exactos.
ver: Credenciales temporales, Rol, CI/CD, Service principal
