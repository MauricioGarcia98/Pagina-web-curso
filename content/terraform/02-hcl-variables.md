---
titulo: "HCL a fondo: variables, locals, outputs, expresiones y for_each"
nivel: Intermedio
duracion: 70
resumen: El lenguaje de Terraform en detalle. Parametriza con variables y validaciones, calcula con locals y funciones, crea muchos recursos con count y for_each, y separa la configuración por entorno con archivos .tfvars.
objetivos: Declarar variables con tipo, descripción, valor por defecto y validación | Darles valor con -var, archivos .tfvars y variables de entorno TF_VAR_ | Calcular valores con locals, condicionales, plantillas de texto y funciones | Crear varias copias de un recurso con count y for_each y elegir entre los dos | Exponer resultados con outputs y leerlos con terraform output
prerrequisitos: terraform-que-es-iac
autoevaluacion: ¿Sabes declarar una variable con tipo y validación? | ¿Conoces las cuatro formas de darle valor a una variable y cuál gana? | ¿Sabes qué diferencia hay entre una variable y un local? | ¿Sabes cuándo usar for_each en lugar de count? | ¿Puedes escribir una expresión for que transforme una lista en un mapa? | ¿Sabes leer un output desde un script con terraform output -raw?
---

:::escenario Tres entornos, un solo código
El lago del Grupo Andino ya se crea con Terraform, pero el código tiene los nombres escritos a mano: `tienda-lake-bronze`. Ahora hacen falta tres entornos (**dev**, **test** y **prod**), cada uno con sus tres capas, y producción tiene reglas propias: versionado activado y un bucket de logs de auditoría. Martín pide:

> "Un solo código para los tres entornos. Lo único que cambia entre ellos va en un archivo de variables. Y si alguien escribe `produccion` en lugar de `prod`, que Terraform lo frene antes de crear nada."
:::

## Los bloques de un proyecto

Un proyecto de Terraform es una **carpeta**. Terraform lee **todos** los archivos `.tf` de la carpeta como si fueran uno solo, así que se reparten por tema. Esta es la convención que vas a ver en casi todos los equipos:

| Archivo | Contiene |
|---|---|
| `versions.tf` | Bloque `terraform { }`: versión de Terraform y de los proveedores, backend |
| `providers.tf` | Bloques `provider` |
| `variables.tf` | Todas las `variable` (las "entradas") |
| `locals.tf` | Los `locals` (valores calculados) |
| `main.tf` (o `s3.tf`, `iam.tf`…) | Los `resource` y `data` |
| `outputs.tf` | Los `output` (las "salidas") |
| `dev.tfvars`, `prod.tfvars` | Los valores de las variables para cada entorno |

```diagrama
titulo: Entradas, cálculos y salidas de un proyecto de Terraform
nodo tfv: dev.tfvars / prod.tfvars | icono=archivo | col=0 | fila=0 | color=amarillo | sub=valores por entorno
nodo var: variables.tf | icono=codigo | col=1 | fila=0 | color=azul | sub=entradas con tipo\ny validación
nodo loc: locals.tf | icono=engranaje | col=2 | fila=0 | color=violeta | sub=nombres, etiquetas,\nreglas calculadas
nodo res: main.tf | icono=nube | col=2 | fila=1 | color=naranja | sub=resources y data
nodo out: outputs.tf | icono=check | col=1 | fila=1 | color=verde | sub=lo que otros\nnecesitan saber
nodo cli: -var / TF_VAR_ | icono=equipo | col=0 | fila=1 | color=gris | sub=valores desde\nla CLI o la CI
flecha tfv -> var
flecha cli -> var | estilo=punteada
flecha var -> loc
flecha loc -> res
flecha res -> out
```

## Tipos de datos en HCL

| Tipo | Ejemplo | Para qué |
|---|---|---|
| `string` | `"us-east-1"` | Nombres, regiones |
| `number` | `90` | Días, tamaños, cantidades |
| `bool` | `true` | Encender o apagar algo |
| `list(string)` | `["bronze", "silver", "gold"]` | Una lista ordenada |
| `set(string)` | `toset(["a", "b"])` | Lista sin orden ni repetidos |
| `map(number)` | `{ bronze = 90, gold = 730 }` | Pares clave → valor del mismo tipo |
| `object({...})` | `{ nombre = "x", dias = 30 }` | Una estructura con campos de distinto tipo |

## Variables: las entradas

```hcl
# variables.tf
variable "proyecto" {
  type        = string
  description = "Prefijo de todos los recursos"
  default     = "tienda"
}

variable "entorno" {
  type        = string
  description = "dev, test o prod"

  validation {
    condition     = contains(["dev", "test", "prod"], var.entorno)
    error_message = "El entorno debe ser dev, test o prod."
  }
}

variable "capas" {
  type    = list(string)
  default = ["bronze", "silver", "gold"]
}

variable "dias_retencion" {
  type = map(number)
  default = {
    bronze = 90
    silver = 365
    gold   = 730
  }
}
```

Cómo leerlo:

- **`type`** obliga a que el valor sea de ese tipo. Si alguien pasa `"noventa"` donde se espera un número, Terraform se niega antes de empezar.
- **`description`** documenta. Aparece en la ayuda y es lo primero que lee alguien nuevo.
- **`default`** hace la variable **opcional**. `entorno` no tiene default: es **obligatoria**, y Terraform falla si nadie le da un valor. Es intencional: así nadie despliega en el entorno equivocado por olvido.
- **`validation`** agrega una regla propia. `contains(lista, valor)` devuelve `true` si el valor está en la lista. Si la condición da `false`, Terraform muestra `error_message` y se detiene.

Se usan con **`var.nombre`**: `var.entorno`, `var.capas`.

:::experto Variables sensibles
Una variable con `sensitive = true` (por ejemplo, una contraseña) no se muestra en el plan ni en la salida: aparece como `(sensitive value)`. Ojo: **sí queda en el archivo de estado** en texto claro. Por eso el estado se guarda cifrado y con acceso restringido, y lo ideal es que las contraseñas las genere la nube (o un `random_password`) y vivan en un Key Vault o Secrets Manager.
:::

### Cómo se les da valor

Hay cuatro formas. Si una variable recibe valor por más de una, **gana la de más abajo**:

| Prioridad | Forma | Ejemplo |
|---|---|---|
| 1 (la más débil) | `default` en la declaración | `default = "tienda"` |
| 2 | Variable de entorno `TF_VAR_nombre` | `export TF_VAR_entorno=dev` |
| 3 | Archivo de valores | `terraform plan -var-file=dev.tfvars` (y `terraform.tfvars`, que se carga solo) |
| 4 (la más fuerte) | Argumento en la línea de comandos | `terraform plan -var entorno=prod` |

Un archivo `.tfvars` tiene solo asignaciones:

```hcl
# dev.tfvars
entorno = "dev"

# prod.tfvars
entorno = "prod"
capas   = ["bronze", "silver", "gold", "sandbox"]
```

:::tip ¿Qué va en Git?
Los `.tfvars` de cada entorno **sí** van a Git: son configuración, no secretos. Los secretos nunca van en un `.tfvars`: se pasan desde la CI con `TF_VAR_` leyendo un gestor de secretos.
:::

## Locals: los valores calculados

Un **local** es un valor que calculas una vez y reutilizas. Sirve para no repetir la misma expresión en diez lugares:

```hcl
# locals.tf
locals {
  prefijo = "${var.proyecto}-${var.entorno}"     # "tienda-dev"

  etiquetas = {
    proyecto = var.proyecto
    entorno  = var.entorno
    equipo   = "datos"
  }

  es_prod = var.entorno == "prod"               # true o false
}
```

Se usan con **`local.nombre`** (en singular): `local.prefijo`, `local.es_prod`.

| | Variable | Local |
|---|---|---|
| ¿Quién le da el valor? | Quien ejecuta Terraform (tfvars, -var) | El propio código |
| ¿Se puede cambiar desde afuera? | Sí | No |
| ¿Para qué? | Lo que cambia entre entornos o usos | Nombres, etiquetas y reglas derivadas |

## Expresiones

| Expresión | Ejemplo | Resultado |
|---|---|---|
| Plantilla de texto | `"${local.prefijo}-gold"` | `"tienda-dev-gold"` |
| Condicional | `local.es_prod ? "Enabled" : "Suspended"` | Según el entorno |
| Comparación y lógica | `var.entorno == "prod" && var.dias > 30` | `true`/`false` |
| Índice de lista | `var.capas[0]` | `"bronze"` |
| Clave de mapa | `var.dias_retencion["gold"]` | `730` |
| `for` a lista | `[for c in var.capas : upper(c)]` | `["BRONZE", "SILVER", "GOLD"]` |
| `for` a mapa | `{ for c in var.capas : c => "${local.prefijo}-${c}" }` | `{ bronze = "tienda-dev-bronze", … }` |
| `for` con filtro | `[for c in var.capas : c if c != "bronze"]` | `["silver", "gold"]` |

### Funciones más usadas

Terraform no deja definir funciones propias, pero trae muchas. Estas aparecen en casi todo proyecto de datos:

| Función | Ejemplo | Resultado |
|---|---|---|
| `lower`, `upper` | `lower("Gold")` | `"gold"` |
| `replace` | `replace("tienda-dev", "-", "")` | `"tiendadev"` (útil para cuentas de Azure, que no aceptan guiones) |
| `substr` | `substr("tiendadevlake", 0, 8)` | `"tiendade"` |
| `format` | `format("%s-%03d", "nodo", 7)` | `"nodo-007"` |
| `join`, `split` | `join(",", ["a", "b"])` | `"a,b"` |
| `length` | `length(var.capas)` | `3` |
| `contains` | `contains(var.capas, "gold")` | `true` |
| `merge` | `merge(local.etiquetas, { capa = "gold" })` | Un mapa con las claves de los dos |
| `lookup` | `lookup(var.dias_retencion, "sandbox", 30)` | `30` (valor por defecto si la clave no está) |
| `toset` | `toset(["a", "a", "b"])` | `["a", "b"]` |
| `jsonencode` | `jsonencode({ Version = "2012-10-17" })` | Un texto JSON (para políticas IAM) |
| `coalesce` | `coalesce(var.nombre, local.prefijo)` | El primer valor no vacío |

## Muchas copias de un recurso: count y for_each

Necesitas tres buckets iguales salvo el nombre. Escribir tres bloques `resource` es repetir código. Terraform tiene dos **meta-argumentos** para crear varias **instancias** de un mismo bloque.

### count: N copias numeradas

```hcl
resource "aws_s3_bucket" "logs" {
  count  = local.es_prod ? 1 : 0          # 1 en prod, 0 en los demás
  bucket = "${local.prefijo}-logs"
}
```

- `count = 3` crea `aws_s3_bucket.logs[0]`, `[1]` y `[2]`; dentro del bloque, `count.index` vale 0, 1, 2.
- **`count = condición ? 1 : 0`** es el truco más usado para crear un recurso **solo en algunos entornos**.

### for_each: una copia por cada clave

```hcl
resource "aws_s3_bucket" "capa" {
  for_each = toset(var.capas)                      # "bronze", "silver", "gold"

  bucket = "${local.prefijo}-${each.key}"
  tags   = merge(local.etiquetas, { capa = each.key })
}
```

- `for_each` recibe un **set de textos** o un **mapa**. Crea `aws_s3_bucket.capa["bronze"]`, `["silver"]` y `["gold"]`.
- Dentro del bloque, **`each.key`** es la clave y **`each.value`** el valor (con un set, los dos son iguales; con un mapa, `each.value` es el valor de esa clave).
- Puedes encadenar recursos: `for_each = aws_s3_bucket.capa` crea una instancia por cada bucket, y `each.value.id` es el id de ese bucket.

```hcl
resource "aws_s3_bucket_versioning" "capa" {
  for_each = aws_s3_bucket.capa
  bucket   = each.value.id

  versioning_configuration {
    status = local.es_prod ? "Enabled" : "Suspended"
  }
}
```

### ¿count o for_each? El problema del índice

```diagrama
titulo: Por qué for_each es más seguro que count al quitar un elemento de la lista
nodo l1: Lista: bronze, silver, gold | icono=tabla | col=0 | fila=0 | color=gris | sub=quitas "silver"
nodo c: count | icono=alerta | col=1 | fila=0 | color=rojo | sub=[1] pasa de silver a gold\n[2] desaparece
nodo cr: Resultado | icono=x | col=2 | fila=0 | color=rojo | sub=reemplaza silver por gold\ny borra el gold viejo
nodo f: for_each | icono=check | col=1 | fila=1 | color=verde | sub=las claves no se mueven
nodo fr: Resultado | icono=check | col=2 | fila=1 | color=verde | sub=borra solo ["silver"]
flecha l1 -> c
flecha c -> cr
flecha l1 -> f
flecha f -> fr
```

Con `count`, cada instancia se identifica por su **posición**. Si quitas `silver` de la lista, `gold` pasa de la posición 2 a la 1, y Terraform cree que `[1]` cambió de nombre (lo **reemplaza**) y que `[2]` sobra (lo **borra**). Con un bucket de datos, eso es una catástrofe. Con `for_each`, cada instancia se identifica por su **clave**: quitar `silver` borra solo `["silver"]`.

**Regla práctica:** `count` solo para "0 o 1" (crear algo opcional) o copias idénticas de verdad. Para todo lo que tiene un nombre, `for_each`.

## Outputs: las salidas

```hcl
# outputs.tf
output "buckets" {
  description = "Nombre de cada bucket por capa"
  value       = { for k, b in aws_s3_bucket.capa : k => b.bucket }
}

output "retencion_gold" {
  value = lookup(var.dias_retencion, "gold", 30)
}
```

Los outputs sirven para tres cosas: mostrarte datos útiles al terminar el `apply`, pasarle datos a **otro** proyecto de Terraform (se ve en la lección de estado remoto) y usarlos desde **scripts**:

```bash norun
terraform output                     # todos
terraform output buckets             # uno
terraform output -json               # en JSON, para jq
terraform output -raw retencion_gold # el valor solo, sin comillas: para scripts
BUCKET=$(terraform output -json buckets | jq -r '.gold')
```

## Laboratorio: los tres entornos

Abre la terminal. Arma el proyecto con los bloques de esta lección en un único `main.tf` (o repártelos en archivos, como prefieras):

```bash norun
aws configure
mkdir -p ~/infra/lago && cd ~/infra/lago
code main.tf          # variables + locals + provider + los tres recursos + outputs
code dev.tfvars       # entorno = "dev"
terraform init
```

**1. La validación funciona.** Prueba un entorno que no existe:

```text
$ terraform plan -var entorno=qa
╷
│ Error: Invalid value for variable
│
│ El entorno debe ser dev, test o prod.
╵
```

**2. El plan de dev.** `terraform plan -var-file=dev.tfvars` muestra 6 recursos a crear: los tres buckets con sus etiquetas y los tres versionados, con `status = "Suspended"`. No aparece el bucket de logs (en dev, `count = 0`).

**3. Aplica y mira los outputs:**

```text
$ terraform apply -auto-approve -var-file=dev.tfvars
$ terraform output
buckets = {
  "bronze" = "tienda-dev-bronze"
  "gold"   = "tienda-dev-gold"
  "silver" = "tienda-dev-silver"
}
retencion_gold = 730
```

**4. Un cambio de etiqueta.** Cambia `equipo = "datos"` por `equipo = "plataforma"` en los locals. El plan muestra un `~` por bucket, y dentro, solo la clave que cambió:

```text
  ~ resource "aws_s3_bucket" "capa" {
      ~ tags = {
          ~ "equipo" = "datos" -> "plataforma"
            # (3 unchanged elements hidden)
        }
    }
```

**5. El peligro de cambiar un nombre.** Ejecuta `terraform plan -var entorno=prod` **en la misma carpeta**. Terraform quiere **reemplazar** (`-/+`) los tres buckets, porque el nombre de un bucket no se puede cambiar: hay que borrarlo y crearlo. Con datos adentro, eso es perderlos. La lección: **cada entorno necesita su propio estado** (lo resuelves en la lección siguiente con backends y workspaces). No apliques este plan.

**6. Limpia:** `terraform destroy -var-file=dev.tfvars`.

<!-- estandar:errores -->
:::errores
- **`Error: No value for required variable`**: una variable sin `default` no recibió valor. Pasa `-var-file=` o define `TF_VAR_`.
- **`Invalid for_each argument ... cannot be determined until apply`**: las **claves** del `for_each` dependen de algo que recién se conoce al crear (un id). Usa como clave algo que conozcas antes: nombres de tu código, no ids de la nube.
- **Usar `count` con una lista de nombres** y después quitar un elemento del medio: Terraform reemplaza o borra los que siguen.
- **`var.` en un `.tfvars`**: un archivo de valores solo admite valores literales (`entorno = "dev"`), no expresiones.
- **Nombres inválidos para la nube**: las cuentas de Azure Storage solo aceptan minúsculas y números (sin guiones), entre 3 y 24 caracteres. Usa `replace()` y `substr()` en un local, y una `validation` para avisar temprano.
:::

<!-- estandar:trabajo -->
:::trabajo
- Las **etiquetas** (`tags` en AWS, `labels` en GCP) son obligatorias en casi todas las empresas: proyecto, entorno, equipo, centro de costo. Con ellas se arma el reporte de costos por equipo. Se definen una vez en un `local` y se agregan con `merge`. En AWS, el proveedor tiene además `default_tags` para ponerlas en todo.
- Cada variable lleva `description` y, si tiene valores posibles, `validation`. En la revisión de código, una variable sin descripción suele rechazarse.
- Los nombres se arman siempre con un **prefijo calculado** (`proyecto-entorno-…`), nunca escritos a mano: así se evitan choques entre entornos.
- Para "crear algo solo en prod" se usa `count = local.es_prod ? 1 : 0`, y para referenciarlo, `one(aws_s3_bucket.logs[*].arn)` o `aws_s3_bucket.logs[0].arn` dentro de una condición.
:::

<!-- estandar:entrevista -->
:::entrevista "¿Cuál es la diferencia entre count y for_each?"
`count` crea N instancias identificadas por posición (`[0]`, `[1]`), y `for_each` crea una instancia por cada clave de un mapa o set (`["bronze"]`). La diferencia importa al cambiar la colección: con `count`, quitar un elemento del medio corre los índices y Terraform reemplaza o destruye recursos que no querías tocar; con `for_each`, cada instancia mantiene su clave y solo se borra la que quitaste. Uso `count` para recursos opcionales (`condición ? 1 : 0`) y `for_each` para colecciones con nombre.
:::

## Resumen

| Bloque | Se usa como | Para qué |
|---|---|---|
| `variable "x" {}` | `var.x` | Entradas con tipo, descripción y validación |
| `locals { x = … }` | `local.x` | Valores calculados que se reutilizan |
| `output "x" {}` | `terraform output x` | Salidas para personas, scripts y otros proyectos |
| `count = n` | `count.index`, `recurso.x[0]` | N copias, o un recurso opcional (`? 1 : 0`) |
| `for_each = mapa o set` | `each.key`, `each.value`, `recurso.x["k"]` | Una copia por clave |

## Ejercicios

:::ejercicio quiz
La variable `entorno` tiene `default = "dev"`, en `terraform.tfvars` dice `entorno = "test"`, y ejecutas `terraform plan -var entorno=prod`. ¿Qué valor usa?

- [ ] dev
- [ ] test
- [x] prod
- [ ] Da error porque tiene dos valores
:::

:::ejercicio quiz
Tienes `count = length(var.clientes)` con `["ana", "beto", "carla"]` y quitas `"beto"`. ¿Qué hace Terraform?

- [ ] Borra solo el recurso de beto
- [x] Reemplaza el recurso [1] (que pasa a ser carla) y borra el [2]
- [ ] No hace nada
- [ ] Borra los tres y los vuelve a crear
:::

:::ejercicio quiz
¿Qué devuelve `{ for c in ["bronze", "gold"] : c => "lake-${c}" }`?

- [ ] `["lake-bronze", "lake-gold"]`
- [x] `{ bronze = "lake-bronze", gold = "lake-gold" }`
- [ ] `"lake-bronze,lake-gold"`
- [ ] Un error: `for` solo funciona con listas
:::

:::ejercicio quiz
Quieres crear un bucket de auditoría **solo** en producción. ¿Qué escribes?

- [ ] `for_each = var.entorno == "prod"`
- [x] `count = var.entorno == "prod" ? 1 : 0`
- [ ] `enabled = var.entorno == "prod"`
- [ ] Un bloque `if` alrededor del recurso
:::

:::ejercicio cli
En `~/infra/lago` hay un proyecto inicializado con una variable obligatoria `entorno` y un archivo `dev.tfvars`. Muestra el plan usando los valores de ese archivo.
```respuesta
terraform plan -var-file=dev.tfvars
terraform plan -var-file dev.tfvars
terraform plan --var-file=dev.tfvars
```
```setup
aws configure
mkdir -p ~/infra/lago
printf 'variable "entorno" {\n  type = string\n}\n\nprovider "aws" {\n  region = "us-east-1"\n}\n\nresource "aws_s3_bucket" "bronze" {\n  bucket = "tienda-${var.entorno}-bronze"\n}\n' > ~/infra/lago/main.tf
printf 'entorno = "dev"\n' > ~/infra/lago/dev.tfvars
cd ~/infra/lago
terraform init
```
:::

:::ejercicio cli
El proyecto ya está aplicado y tiene un output llamado `bucket_gold`. Imprime **solo su valor**, sin comillas, para usarlo en un script.
```respuesta
terraform output -raw bucket_gold
```
```setup
aws configure
mkdir -p ~/infra/out
printf 'provider "aws" {\n  region = "us-east-1"\n}\n\nresource "aws_s3_bucket" "gold" {\n  bucket = "tienda-dev-gold"\n}\n\noutput "bucket_gold" {\n  value = aws_s3_bucket.gold.bucket\n}\n' > ~/infra/out/main.tf
cd ~/infra/out
terraform init
terraform apply -auto-approve
```
:::

:::ejercicio cli
Antes de pedir una revisión, revisa que la configuración sea válida (sintaxis, tipos y referencias) **sin** consultar la nube.
```respuesta
terraform validate
```
```setup
mkdir -p ~/infra/val
printf 'variable "capas" {\n  type    = list(string)\n  default = ["bronze", "silver", "gold"]\n}\n\nprovider "aws" {\n  region = "us-east-1"\n}\n\nresource "aws_s3_bucket" "capa" {\n  for_each = toset(var.capas)\n  bucket   = "tienda-dev-${each.key}"\n}\n' > ~/infra/val/main.tf
cd ~/infra/val
terraform init
```
:::

:::ejercicio abierto titulo="La variable de la cuenta de Azure"
En Azure, el nombre de una cuenta de Storage debe tener entre 3 y 24 caracteres, solo minúsculas y números. Escribe: (1) una variable `proyecto` con una validación que rechace mayúsculas y guiones; (2) un local `cuenta` que arme el nombre `st` + proyecto + entorno, sin guiones y cortado a 24 caracteres; (3) un recurso `azurerm_storage_account` que lo use.
```solucion
variable "proyecto" {
  type        = string
  description = "Nombre corto del proyecto, solo minúsculas y números"
  validation {
    condition     = length(regexall("^[a-z0-9]{2,12}$", var.proyecto)) > 0
    error_message = "proyecto: solo minúsculas y números, entre 2 y 12 caracteres."
  }
}

locals {
  cuenta = substr(replace("st${var.proyecto}${var.entorno}", "-", ""), 0, 24)
}

resource "azurerm_storage_account" "lago" {
  name                     = local.cuenta
  resource_group_name      = azurerm_resource_group.datos.name
  location                 = azurerm_resource_group.datos.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  is_hns_enabled           = true   # Data Lake Gen2
}

La validación frena el error en el plan, con un mensaje claro, en lugar de que falle la API de Azure a mitad del apply. replace() saca los guiones por si el entorno los tuviera, y substr() asegura el máximo de 24.
```
:::
