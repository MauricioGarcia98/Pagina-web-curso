---
titulo: "Módulos: tu propia biblioteca de infraestructura"
nivel: Avanzado
duracion: 65
resumen: Empaqueta un patrón (una capa del lago con seguridad, versionado y retención) en un módulo con entradas y salidas, úsalo muchas veces con for_each, y organiza el repositorio en módulos y entornos como lo hacen los equipos de plataforma.
objetivos: Explicar qué es un módulo y la diferencia entre módulo raíz y módulo hijo | Escribir un módulo con variables, recursos y outputs, y llamarlo desde otro proyecto | Crear varias copias de un módulo con for_each y leer sus outputs | Organizar un repositorio en modules/ y envs/ con un estado por entorno | Elegir entre un módulo propio y uno público del registro, y fijar su versión
prerrequisitos: terraform-hcl-variables | terraform-estado-remoto
autoevaluacion: ¿Sabes qué archivos tiene un módulo y qué va en cada uno? | ¿Sabes pasarle valores a un módulo y leer sus outputs? | ¿Sabes cómo se llaman en el estado los recursos de un módulo? | ¿Sabes cuándo vale la pena hacer un módulo y cuándo no? | ¿Sabes fijar la versión de un módulo del registro o de Git?
---

:::escenario Doce buckets, doce formas distintas
El lago del Grupo Andino ya tiene doce buckets en tres entornos. Una auditoría de seguridad encuentra que cuatro no tienen bloqueo de acceso público, dos no tienen cifrado y ninguno de bronze tiene regla de retención. Cada uno se escribió copiando y pegando bloques, y cada copia quedó un poco distinta.

> "Quiero **una** definición de cómo es una capa del lago en esta empresa: privada, cifrada, versionada si hace falta y con retención. Y que todos los buckets salgan de ahí."
:::

## Qué es un módulo

Un **módulo** es una carpeta con archivos `.tf`. Ya escribiste uno: la carpeta donde ejecutas `terraform` es el **módulo raíz**. Cuando ese módulo llama a otra carpeta con un bloque `module`, esa carpeta es un **módulo hijo**.

Un módulo es como una **función**: recibe entradas (variables), hace algo (crea recursos) y devuelve salidas (outputs). El código que lo llama no necesita saber cómo está hecho por dentro.

```diagrama
titulo: Un módulo es una función de infraestructura: entradas, recursos, salidas
nodo raiz: Módulo raíz | icono=codigo | col=0 | fila=0 | color=azul | sub=envs/dev/main.tf
nodo vin: variables | icono=archivo | col=1 | fila=0 | color=amarillo | sub=nombre, dias_retencion,\nversionado, etiquetas
grupo mod: modules/capa_lago | nodos=vin,b,pab,ver,lc,vout | color=violeta
nodo b: aws_s3_bucket | icono=bucket | col=2 | fila=0 | color=naranja
nodo pab: public_access_block | icono=candado | col=3 | fila=0 | color=rojo | sub=siempre privado
nodo ver: versioning | icono=capas | col=3 | fila=1 | color=verde | sub=según la entrada
nodo lc: lifecycle | icono=reloj | col=2 | fila=1 | color=gris | sub=solo si dias > 0
nodo vout: outputs | icono=check | col=1 | fila=1 | color=verde | sub=nombre, arn
flecha raiz -> vin: module "capa" { … }
flecha vin -> b
flecha b -> pab
flecha b -> ver
flecha b -> lc
flecha lc -> vout | estilo=punteada
flecha vout -> raiz: module.capa.arn
```

## Escribir el módulo

La estructura estándar de un módulo:

```text
modules/capa_lago/
├── variables.tf    ← las entradas
├── main.tf         ← los recursos
├── outputs.tf      ← las salidas
└── README.md       ← cómo se usa (muchos equipos lo generan con terraform-docs)
```

**variables.tf** — la "firma" del módulo. Pocas entradas, con descripción y valores por defecto razonables:

```hcl
variable "nombre" {
  type        = string
  description = "Nombre completo del bucket"
}

variable "dias_retencion" {
  type        = number
  description = "Días hasta borrar los objetos. 0 = nunca"
  default     = 0
}

variable "versionado" {
  type    = bool
  default = false
}

variable "etiquetas" {
  type    = map(string)
  default = {}
}
```

**main.tf** — lo que la empresa decidió que **toda** capa del lago debe tener:

```hcl
resource "aws_s3_bucket" "this" {
  bucket = var.nombre
  tags   = var.etiquetas
}

# siempre privado: no es una opción del módulo
resource "aws_s3_bucket_public_access_block" "this" {
  bucket                  = aws_s3_bucket.this.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "this" {
  bucket = aws_s3_bucket.this.id
  versioning_configuration {
    status = var.versionado ? "Enabled" : "Suspended"
  }
}

# la regla de retención solo existe si se pidió
resource "aws_s3_bucket_lifecycle_configuration" "this" {
  count  = var.dias_retencion > 0 ? 1 : 0
  bucket = aws_s3_bucket.this.id
  rule {
    id     = "expirar"
    status = "Enabled"
    expiration {
      days = var.dias_retencion
    }
  }
}
```

- El nombre local **`this`** es la convención cuando el módulo tiene un único recurso principal de ese tipo.
- Lo obligatorio para la empresa (privado) **no** es una variable: nadie puede apagarlo por error. Lo que cambia entre usos (retención, versionado) sí lo es.

**outputs.tf** — lo que necesita saber quien lo usa:

```hcl
output "nombre" {
  value = aws_s3_bucket.this.bucket
}

output "arn" {
  value = aws_s3_bucket.this.arn
}
```

:::cuidado Un módulo no configura el proveedor
Un módulo hijo **no** lleva bloque `provider "aws" { region = ... }`: hereda el del módulo raíz. Si lo configura por dentro, no se puede usar en otra región ni en otra cuenta, y no se puede borrar limpiamente. Solo declara qué proveedores necesita en `terraform { required_providers { ... } }`.
:::

## Llamar al módulo

```hcl
# envs/dev/main.tf
provider "aws" {
  region = "us-east-1"
}

locals {
  capas = {
    bronze = { dias = 90, versionado = false }
    silver = { dias = 0, versionado = true }
    gold   = { dias = 0, versionado = true }
  }
}

module "capa" {
  source   = "../../modules/capa_lago"
  for_each = local.capas

  nombre         = "andina-dev-${each.key}"
  dias_retencion = each.value.dias
  versionado     = each.value.versionado
  etiquetas      = { capa = each.key }
}

module "logs" {
  source = "../../modules/capa_lago"
  nombre = "andina-dev-logs"          # el resto, con los valores por defecto
}

output "arns" {
  value = { for k, m in module.capa : k => m.arn }
}
```

- **`source`** dice dónde está el módulo. Una ruta local empieza con `./` o `../`.
- Los demás argumentos son las **variables** del módulo. Si falta una sin `default`, el plan falla con `Missing required argument`.
- Los outputs se leen como **`module.<nombre>.<output>`**. Con `for_each`, `module.capa` es un mapa: `module.capa["gold"].arn`.
- Cada vez que agregas un bloque `module` o cambias su `source`, hay que volver a ejecutar **`terraform init`**.

## Laboratorio: el lago con un módulo

En la terminal, arma esta estructura (para simplificar, el raíz va en `~/infra/m` y el módulo en `~/infra/m/modules/capa_lago`, así que el `source` es `"./modules/capa_lago"`):

```bash norun
aws configure
mkdir -p ~/infra/m/modules/capa_lago && cd ~/infra/m
code modules/capa_lago/variables.tf
code modules/capa_lago/main.tf
code modules/capa_lago/outputs.tf
code main.tf
terraform init
```

El `init` ahora instala los módulos:

```text
Initializing modules...
- capa in modules/capa_lago
- logs in modules/capa_lago
```

Aplica y mira cómo se llaman los recursos en el estado:

```text
$ terraform apply -auto-approve
...
Apply complete! Resources: 13 added, 0 changed, 0 destroyed.

$ terraform state list
module.capa["bronze"].aws_s3_bucket.this
module.capa["bronze"].aws_s3_bucket_lifecycle_configuration.this[0]
module.capa["bronze"].aws_s3_bucket_public_access_block.this
module.capa["bronze"].aws_s3_bucket_versioning.this
module.capa["gold"].aws_s3_bucket.this
...
module.logs.aws_s3_bucket_versioning.this
```

Cuenta: 3 recursos por cada una de las 4 copias (12) + 1 regla de retención, solo en bronze = **13**. La dirección completa de un recurso es `module.<nombre>[clave].<tipo>.<nombre_local>`.

Prueba: agrega una capa `sandbox = { dias = 7, versionado = false }` al mapa y ejecuta `terraform plan`. Aparecen 4 recursos nuevos, todos con la misma seguridad, sin escribir una línea de recursos.

## Organizar el repositorio

```text
infra-datos/
├── modules/
│   ├── capa_lago/         ← un bucket del lago con todo lo obligatorio
│   ├── catalogo_glue/     ← base de Glue + crawler + rol
│   └── job_spark/         ← job de Glue o de Databricks con sus permisos
├── envs/
│   ├── dev/    main.tf  backend.tf  terraform.tfvars
│   ├── test/   main.tf  backend.tf  terraform.tfvars
│   └── prod/   main.tf  backend.tf  terraform.tfvars
└── .github/workflows/terraform.yml
```

```diagrama
titulo: Los entornos llaman a los mismos módulos con valores distintos, y cada uno tiene su estado
nodo m1: modules/capa_lago | icono=cubo | col=1 | fila=0 | color=violeta
nodo m2: modules/catalogo_glue | icono=cubo | col=2 | fila=0 | color=violeta
nodo dev: envs/dev | icono=codigo | col=0 | fila=1 | color=azul | sub=retención 7 días
nodo test: envs/test | icono=codigo | col=1 | fila=1 | color=amarillo
nodo prod: envs/prod | icono=codigo | col=2 | fila=1 | color=rojo | sub=versionado + prevent_destroy
nodo st: Bucket de estado | icono=bucket | col=3 | fila=1 | color=verde | sub=dev/ test/ prod/
flecha dev -> m1
flecha test -> m1
flecha prod -> m1
flecha prod -> m2
flecha prod -> st | estilo=punteada
```

## Módulos del registro público

No hace falta escribir todo. El **Terraform Registry** (registry.terraform.io) tiene miles de módulos. Los de `terraform-aws-modules` y `Azure/avm-*` (Azure Verified Modules) son los más usados:

```hcl
module "lago_bronze" {
  source  = "terraform-aws-modules/s3-bucket/aws"
  version = "~> 4.2"            # fija la versión: 4.2, 4.3… pero nunca 5.0

  bucket = "andina-prod-bronze"
  versioning = {
    enabled = true
  }
}

module "red" {
  source = "git::https://github.com/grupo-andina/tf-modulos.git//red?ref=v1.3.0"   # un módulo interno en Git, en un tag
}
```

| | Módulo propio | Módulo público |
|---|---|---|
| Control | Total: hace exactamente lo que la empresa necesita | Lo que el autor decidió |
| Trabajo | Lo escribes y lo mantienes tú | Ya está hecho y probado por miles |
| Riesgo | Errores tuyos | Cambios de versión, dependencias de terceros |
| Típico | Envolver uno público con las reglas de la empresa | Recursos complejos (VPC, EKS, buckets con muchas opciones) |

Un patrón muy común: el módulo **interno** `capa_lago` usa por dentro el módulo **público** de S3 y le fija las reglas de la empresa.

:::tip Versiones de módulos y proveedores
`version = "~> 4.2"` significa ">= 4.2 y < 5.0": aceptas arreglos y funciones nuevas, pero no cambios que rompen (versión mayor). Lo mismo para los proveedores en `required_providers`. Un módulo de Git sin `?ref=` usa la rama principal y cambia sin aviso: siempre un tag.
:::

## Cuándo hacer un módulo

| Hazlo cuando… | No lo hagas cuando… |
|---|---|
| El mismo patrón se repite 3 o más veces | Es un recurso suelto que aparece una vez |
| Hay reglas que **todos** deben cumplir (seguridad, etiquetas) | El "módulo" solo pasa variables a un único recurso sin agregar nada |
| Varios equipos necesitan lo mismo | Todavía no sabes cómo va a ser el patrón (primero repite, después abstrae) |

<!-- estandar:errores -->
:::errores
- **`Module not installed`**: agregaste o cambiaste un bloque `module` sin `terraform init`.
- **`Unsupported argument`** en el bloque `module`: le pasaste un argumento que el módulo no declara como variable (o lo escribiste mal).
- **Mover recursos a un módulo y que el plan quiera destruirlos**: `aws_s3_bucket.bronze` pasa a llamarse `module.capa["bronze"].aws_s3_bucket.this`. Agrega un bloque `moved { from = aws_s3_bucket.bronze  to = module.capa["bronze"].aws_s3_bucket.this }`.
- **Módulos con 40 variables** que exponen cada argumento del recurso: es más difícil de usar que el recurso directo. Un buen módulo decide por ti.
- **`source` de Git sin `?ref=`** o del registro sin `version`: un día el módulo cambia y tu plan quiere reemplazar recursos.
:::

<!-- estandar:trabajo -->
:::trabajo
- En empresas medianas y grandes, un **equipo de plataforma** mantiene los módulos (con versiones, changelog y ejemplos) y los equipos de datos los usan. Pedir "un bucket" es escribir 5 líneas de `module`.
- Los módulos tienen pruebas: `terraform validate` y `tflint` en la CI, y pruebas con **`terraform test`** (archivos `.tftest.hcl` que crean el módulo en una cuenta de pruebas y verifican los outputs) o con Terratest.
- El README de cada módulo se genera con **terraform-docs**: lista entradas, salidas y un ejemplo de uso.
- Las herramientas de políticas (**Checkov**, **tfsec/Trivy**, **OPA/Conftest**) revisan en el pull request que ningún bucket sea público o sin cifrado, aunque alguien no use el módulo.
:::

<!-- estandar:entrevista -->
:::entrevista "¿Cómo organizarías el Terraform de una plataforma de datos con tres entornos?"
Un repositorio con dos carpetas: `modules/`, con módulos chicos por patrón (capa del lago, catálogo, job, permisos), con versión y pruebas; y `envs/dev`, `envs/test` y `envs/prod`, donde cada entorno llama a los mismos módulos con sus valores y tiene su propio estado remoto (idealmente en cuentas o suscripciones distintas, para que los permisos de prod estén separados). Los proveedores se configuran solo en los entornos. La CI hace `fmt`, `validate`, `tflint`, chequeos de seguridad y `plan` en cada pull request, y `apply` al hacer merge, primero en dev y con aprobación manual en prod.
:::

## Resumen

| Concepto | Detalle |
|---|---|
| Módulo raíz | La carpeta donde ejecutas `terraform` |
| Módulo hijo | Una carpeta llamada con `module "x" { source = "…" }` |
| Entradas / salidas | `variable` del módulo / `module.x.output` |
| Dirección en el estado | `module.x["clave"].tipo.nombre` |
| Fuentes | Local (`./modules/x`), registro (`org/nombre/proveedor` + `version`), Git (`git::…?ref=v1.0.0`) |
| Después de agregar o cambiar un módulo | `terraform init` |

## Ejercicios

:::ejercicio quiz
Un módulo `capa_lago` crea 3 recursos, más 1 regla de retención si `dias_retencion > 0`. Lo llamas con `for_each` para bronze (90 días), silver (0) y gold (0). ¿Cuántos recursos se crean?

- [ ] 3
- [ ] 9
- [x] 10
- [ ] 12
:::

:::ejercicio quiz
Con `module "capa" { for_each = local.capas ... }`, ¿cómo lees el ARN de la capa gold?

- [ ] `module.capa.gold.arn`
- [x] `module.capa["gold"].arn`
- [ ] `capa["gold"].arn`
- [ ] `module.capa_lago.arn`
:::

:::ejercicio quiz
¿Qué significa `version = "~> 4.2"` en un módulo del registro?

- [ ] Exactamente la versión 4.2
- [x] Cualquier versión desde la 4.2 hasta antes de la 5.0
- [ ] Cualquier versión mayor que la 4.2, incluida la 5.0
- [ ] La última versión disponible
:::

:::ejercicio quiz
¿Por qué un módulo hijo no debería tener un bloque `provider "aws" { region = "us-east-1" }`?

- [ ] Porque Terraform no lo permite
- [x] Porque así no se puede usar en otra región o cuenta, y debe heredar el proveedor del raíz
- [ ] Porque los módulos no pueden crear recursos de AWS
- [ ] Porque duplica el estado
:::

:::ejercicio cli
Agregaste un bloque `module "capa"` en `~/infra/m/main.tf`. Prepara la carpeta para que Terraform encuentre el módulo.
```respuesta
terraform init
```
```setup
mkdir -p ~/infra/m/modules/capa_lago
printf 'variable "nombre" {\n  type = string\n}\n\nresource "aws_s3_bucket" "this" {\n  bucket = var.nombre\n}\n\noutput "arn" {\n  value = aws_s3_bucket.this.arn\n}\n' > ~/infra/m/modules/capa_lago/main.tf
printf 'provider "aws" {\n  region = "us-east-1"\n}\n\nmodule "capa" {\n  source   = "./modules/capa_lago"\n  for_each = toset(["bronze", "silver", "gold"])\n  nombre   = "andina-dev-${each.key}"\n}\n' > ~/infra/m/main.tf
cd ~/infra/m
```
:::

:::ejercicio cli
El proyecto ya está aplicado. Lista **solo** los recursos que pertenecen a la copia `gold` del módulo `capa` (la dirección empieza con `module.capa["gold"]`).
```respuesta
terraform state list ['"]module\.capa\[\\?"gold\\?"\]['"]
```
```solucion
terraform state list 'module.capa["gold"]'
```
```setup
aws configure
mkdir -p ~/infra/m2/modules/capa_lago
printf 'variable "nombre" {\n  type = string\n}\n\nresource "aws_s3_bucket" "this" {\n  bucket = var.nombre\n}\n\nresource "aws_s3_bucket_versioning" "this" {\n  bucket = aws_s3_bucket.this.id\n  versioning_configuration {\n    status = "Enabled"\n  }\n}\n' > ~/infra/m2/modules/capa_lago/main.tf
printf 'provider "aws" {\n  region = "us-east-1"\n}\n\nmodule "capa" {\n  source   = "./modules/capa_lago"\n  for_each = toset(["bronze", "silver", "gold"])\n  nombre   = "andina-dev-${each.key}"\n}\n' > ~/infra/m2/main.tf
cd ~/infra/m2
terraform init
terraform apply -auto-approve
```
:::

:::ejercicio abierto titulo="Diseña el módulo del catálogo"
El equipo necesita un módulo `catalogo_glue` que cree, para un dominio de datos (ventas, clientes, logística…): una base de datos de Glue, un rol IAM que pueda leer el bucket silver del dominio, y un crawler que use ese rol. Define: (1) las variables (nombre, tipo, si tienen default y por qué); (2) qué decisiones fija el módulo y no deja cambiar; (3) los outputs; (4) cómo lo llamarías para tres dominios desde envs/prod.
```solucion
1. Variables:
   - dominio (string, obligatoria): "ventas". Con validation: solo minúsculas y guiones bajos.
   - entorno (string, obligatoria): para los nombres.
   - bucket_arn (string, obligatoria): el bucket silver a rastrear.
   - prefijo (string, default = dominio): la carpeta dentro del bucket.
   - horario (string, default = "cron(0 3 * * ? *)"): cuándo corre el crawler. Default razonable porque la mayoría lo quiere de noche.
   - etiquetas (map(string), default = {}).
2. Fijo en el módulo: el nombre de la base (${entorno}_${dominio}), el rol con permisos mínimos (solo s3:GetObject/ListBucket sobre bucket_arn/prefijo y los permisos de Glue), la política de cambios del crawler (actualizar el esquema, registrar en log las tablas borradas en vez de borrarlas) y las etiquetas obligatorias (dominio, entorno, equipo) mezcladas con merge.
3. Outputs: nombre_base, arn_rol, nombre_crawler.
4. En envs/prod:
   module "catalogo" {
     source     = "../../modules/catalogo_glue"
     for_each   = toset(["ventas", "clientes", "logistica"])
     dominio    = each.key
     entorno    = "prod"
     bucket_arn = module.capa["silver"].arn
   }
   Y para usar la base de ventas en otro recurso: module.catalogo["ventas"].nombre_base.
```
:::
