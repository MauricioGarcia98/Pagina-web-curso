---
titulo: "Terraform en equipo: pruebas, CI/CD con GitHub Actions y buenas prácticas"
nivel: Experto
duracion: 75
resumen: Lleva Terraform a producción como lo hace un equipo de plataforma. Pruebas con terraform test, chequeos de formato, lint y seguridad, un pipeline de GitHub Actions con OIDC que publica el plan en el pull request y aplica con aprobación, detección de drift y la lista de convenciones que se revisan en cada cambio.
objetivos: Escribir pruebas de Terraform con terraform test (run, assert, expect_failures) | Armar un pipeline de CI/CD que valide, planifique en cada pull request y aplique al hacer merge | Autenticar la CI en la nube con OIDC, sin secretos de larga duración | Detectar drift con un plan programado y explicar qué hacer con él | Revisar un pull request de Terraform con una checklist de buenas prácticas
prerrequisitos: terraform-modulos | terraform-estado-remoto | fundamentos-git
autoevaluacion: ¿Sabes escribir un archivo .tftest.hcl con dos run y sus assert? | ¿Sabes qué pasos tiene el pipeline de un pull request de Terraform? | ¿Sabes por qué OIDC es mejor que guardar una access key en los secretos de GitHub? | ¿Sabes detectar drift y qué significa el código de salida 2 de terraform plan? | ¿Puedes nombrar cinco cosas que revisarías en un pull request de Terraform?
---

:::escenario El apply de los viernes
En el Grupo Andino, cada persona aplica Terraform desde su computadora, con sus propias credenciales de administrador. Un viernes alguien aplica una rama vieja y revierte los permisos de Unity Catalog de toda la semana. Nadie revisó el plan. La auditoría pregunta quién lo aprobó.

> "Nadie más aplica desde su computadora. Cada cambio va por pull request, la CI muestra el plan, alguien lo aprueba, y la CI aplica. Y quiero pruebas: si alguien rompe el módulo del lago, que la CI lo frene."
:::

## El flujo de un cambio

```diagrama
titulo: Un cambio de infraestructura, de la rama a producción
nodo rama: Rama + commit | icono=git | col=0 | fila=0 | color=gris | sub=feat/capa-sandbox
nodo pr: Pull request | icono=equipo | col=1 | fila=0 | color=azul
nodo ci: CI: chequeos | icono=engranaje | col=2 | fila=0 | color=violeta | sub=fmt · validate · tflint\ncheckov · test
nodo plan: CI: plan | icono=lupa | col=3 | fila=0 | color=amarillo | sub=se publica como\ncomentario del PR
nodo rev: Revisión | icono=usuario | col=3 | fila=1 | color=azul | sub=alguien lee el plan\ny aprueba
nodo dev: Apply en dev | icono=check | col=2 | fila=1 | color=verde | sub=automático al merge
nodo prod: Apply en prod | icono=escudo | col=1 | fila=1 | color=rojo | sub=con aprobación manual
nodo drift: Plan nocturno | icono=reloj | col=0 | fila=1 | color=cian | sub=avisa si hay drift
flecha rama -> pr
flecha pr -> ci
flecha ci -> plan
flecha plan -> rev
flecha rev -> dev: merge a main
flecha dev -> prod
flecha drift -> prod | estilo=punteada
```

## Pruebas con terraform test

Desde la versión 1.6, Terraform trae su propio framework de pruebas. Una prueba es un archivo **`.tftest.hcl`** (en la carpeta del módulo o en `tests/`) con bloques **`run`**. Cada `run` planifica o aplica el módulo con ciertas variables y verifica condiciones con **`assert`**.

Para el proyecto del lago de la lección de HCL (buckets por capa, versionado solo en prod, bucket de logs solo en prod):

```hcl
# tests/lago.tftest.hcl
variables {                          # valores para todos los run
  proyecto = "tienda"
}

run "dev_sin_logs" {
  command = plan                     # solo planifica: rápido y sin crear nada

  variables {
    entorno = "dev"
  }

  assert {
    condition     = aws_s3_bucket.capa["gold"].bucket == "tienda-dev-gold"
    error_message = "El bucket gold debe llamarse tienda-dev-gold"
  }

  assert {
    condition     = length(aws_s3_bucket.logs) == 0
    error_message = "En dev no debe haber bucket de logs"
  }
}

run "prod_con_logs_y_versionado" {
  # sin command: aplica (en una cuenta de pruebas) y al final destruye
  variables {
    entorno = "prod"
  }

  assert {
    condition     = length(aws_s3_bucket.logs) == 1
    error_message = "En prod debe existir el bucket de logs"
  }

  assert {
    condition     = aws_s3_bucket_versioning.capa["gold"].versioning_configuration[0].status == "Enabled"
    error_message = "En prod el versionado debe estar activado"
  }

  assert {
    condition     = output.buckets["bronze"] == "tienda-prod-bronze"
    error_message = "El output buckets no tiene el nombre esperado"
  }
}

run "entorno_invalido" {
  command = plan
  variables {
    entorno = "produccion"
  }
  expect_failures = [var.entorno]    # la prueba pasa si la validación de la variable FALLA
}
```

| Pieza | Para qué |
|---|---|
| `command = plan` | Prueba la lógica (nombres, condicionales, `count`) sin crear nada. Es la mayoría de las pruebas |
| `command = apply` (por defecto) | Crea los recursos de verdad, verifica valores que solo se conocen al crear, y al terminar los **destruye** |
| `assert { condition, error_message }` | La condición tiene que dar `true` |
| `output.x` | Lee un output del módulo |
| `expect_failures = [var.x]` | Prueba que una validación rechaza un valor inválido |

```text
$ terraform test
tests/lago.tftest.hcl... in progress
  run "dev_sin_logs"... pass
  run "prod_con_logs_y_versionado"... pass
  run "entorno_invalido"... pass
tests/lago.tftest.hcl... tearing down
tests/lago.tftest.hcl... pass

Success! 3 passed, 0 failed.
```

:::nota En el simulador
La terminal del curso ejecuta `terraform test` de verdad sobre tus archivos. Los `run` con `command = apply` se **simulan**: calcula los valores como si hubiera creado los recursos, pero no toca la nube ni tu estado. En tu computadora, un `apply` de prueba crea recursos reales (y cobra), por eso las pruebas con apply corren en una cuenta o suscripción de pruebas.
:::

## Los chequeos automáticos

| Herramienta | Qué revisa | Comando |
|---|---|---|
| `terraform fmt` | Formato estándar | `terraform fmt -check -recursive` (código 3 si hay archivos sin formato) |
| `terraform validate` | Sintaxis, tipos, referencias | `terraform validate` |
| **TFLint** | Errores que validate no ve: tipos de instancia que no existen, variables sin usar, convenciones | `tflint --recursive` |
| **Checkov** / **Trivy** (ex tfsec) | Seguridad: buckets públicos, sin cifrado, `*` en IAM, puertos abiertos | `checkov -d .` |
| `terraform test` | La lógica de tus módulos | `terraform test` |
| **Infracost** | Cuánto va a costar el cambio por mes | `infracost diff --path .` |

Todo esto se corre también **antes del commit** con **pre-commit** (`.pre-commit-config.yaml` con los hooks de `pre-commit-terraform`), para que los errores obvios no lleguen ni al pull request.

## El pipeline en GitHub Actions

```yaml
# .github/workflows/terraform.yml
name: terraform

on:
  pull_request:
    paths: ["infra/**"]
  push:
    branches: [main]
    paths: ["infra/**"]

permissions:
  id-token: write          # para OIDC
  contents: read
  pull-requests: write     # para comentar el plan

jobs:
  plan:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: infra/envs/dev
    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.10.3

      - name: Login en AWS con OIDC (sin access keys)
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/github-terraform-plan
          aws-region: us-east-1

      - run: terraform fmt -check -recursive
      - run: terraform init -input=false
      - run: terraform validate
      - run: terraform test
      - run: terraform plan -input=false -no-color -out=tfplan | tee plan.txt

      - name: Publicar el plan en el PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const plan = require('fs').readFileSync('infra/envs/dev/plan.txt', 'utf8');
            await github.rest.issues.createComment({
              ...context.repo, issue_number: context.issue.number,
              body: '### Plan de dev\n```\n' + plan.slice(-60000) + '\n```'
            });

  apply-dev:
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    needs: plan
    runs-on: ubuntu-latest
    environment: dev
    defaults:
      run:
        working-directory: infra/envs/dev
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.10.3
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/github-terraform-apply
          aws-region: us-east-1
      - run: terraform init -input=false
      - run: terraform apply -input=false -auto-approve

  apply-prod:
    needs: apply-dev
    runs-on: ubuntu-latest
    environment: prod        # el environment "prod" de GitHub exige la aprobación de 2 personas
    # … los mismos pasos, en infra/envs/prod y con el rol de prod
```

Lo importante del pipeline:

- **El plan se publica en el pull request**: el revisor no aprueba código, aprueba **cambios en la nube**. Un `-/+` en una base de producción salta a la vista.
- **Dos roles distintos**: el de `plan` solo puede **leer** (y leer/escribir el estado); el de `apply`, crear y modificar. Un pull request de alguien de afuera no puede aplicar nada.
- **`environment: prod`** con *required reviewers*: GitHub pausa el job hasta que dos personas aprueben.
- **`-input=false`**: en la CI no hay nadie para responder preguntas; si falta una variable, que falle.

### OIDC: la CI sin secretos

La forma vieja era crear un usuario de IAM, generar una **access key** y guardarla en los secretos de GitHub. Esa clave no expira, se puede filtrar y hay que rotarla. Con **OIDC** (*OpenID Connect*), GitHub le presenta a la nube un token firmado que dice "soy el workflow del repositorio `grupo-andina/infra-datos`, rama `main`", y la nube le da credenciales **temporales** (una hora) para un rol que confía en ese repositorio:

```hcl
resource "aws_iam_openid_connect_provider" "github" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
}

resource "aws_iam_role" "github_apply" {
  name = "github-terraform-apply"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Action    = "sts:AssumeRoleWithWebIdentity"
      Principal = { Federated = aws_iam_openid_connect_provider.github.arn }
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:sub" = "repo:grupo-andina/infra-datos:ref:refs/heads/main"
        }
      }
    }]
  })
}
```

La condición `sub` es la clave: **solo** la rama `main` de **ese** repositorio puede usar el rol de apply. Azure (*federated credentials* de una identidad) y Google Cloud (*Workload Identity Federation*) tienen el mismo mecanismo.

## Drift: lo que cambió fuera de Terraform

El **drift** es la diferencia entre lo que dice el código y lo que hay en la nube porque alguien cambió algo a mano (o lo cambió otro sistema). Se detecta con un plan programado:

```yaml
on:
  schedule:
    - cron: "0 6 * * 1-5"       # de lunes a viernes, 06:00 UTC
jobs:
  drift:
    steps:
      # … checkout, setup, OIDC con el rol de solo lectura, init …
      - run: terraform plan -detailed-exitcode -input=false
```

`-detailed-exitcode` cambia el código de salida: **0** = sin cambios, **1** = error, **2** = hay cambios (drift). Un 2 abre un issue o avisa en Slack. Después alguien decide: llevar el cambio al código, o aplicar para revertirlo.

```text
$ terraform plan -detailed-exitcode
...
Plan: 0 to add, 1 to change, 0 to destroy.
$ echo $?
2
```

### Laboratorio: provoca un drift

En la terminal, crea un bucket con Terraform y bórralo "a mano", como haría alguien desde la consola:

```bash norun
aws configure
mkdir -p ~/infra/drift && cd ~/infra/drift
code main.tf                         # provider "aws" + resource "aws_s3_bucket" "gold" { bucket = "tienda-prod-gold" }
terraform init && terraform apply -auto-approve
aws s3 rb s3://tienda-prod-gold      # el cambio "por fuera"
terraform plan -refresh-only         # solo muestra lo que cambió afuera
terraform plan -detailed-exitcode; echo $?
```

```text
Note: Objects have changed outside of Terraform

  # aws_s3_bucket.gold has been deleted
  - resource "aws_s3_bucket" "gold" {
      - id = "tienda-prod-gold" -> null
    }
...
  # aws_s3_bucket.gold will be created
Plan: 1 to add, 0 to change, 0 to destroy.
2
```

Terraform **refresca** el estado antes de planificar: pregunta a la nube si cada recurso sigue existiendo y cómo está. El bucket ya no está, así que el plan propone crearlo de nuevo, y el código de salida es 2. Un `terraform apply` lo recrea (vacío: los datos que tenía no vuelven; para eso existen el versionado y las copias de seguridad).

## Checklist para revisar un pull request de Terraform

| Revisa | Por qué |
|---|---|
| El plan: ¿hay `-/+` o `-` en algo con datos? | Un reemplazo de una base o un bucket es perder datos |
| ¿El número de cambios es el esperado? | "Agregué una etiqueta" y el plan dice 40 cambios: algo está mal |
| Nombres armados con el prefijo, no escritos a mano | Choques entre entornos |
| Variables con `type`, `description` y `validation` | Errores tempranos y código que se entiende |
| Permisos: sin `*`, a nivel de recurso | Permisos mínimos |
| Nada de secretos en el código ni en los `.tfvars` | Los secretos van en un gestor y se generan o leen desde ahí |
| Versiones fijadas (`required_version`, `required_providers`, `version` de los módulos) | El mismo código produce el mismo resultado mañana |
| `prevent_destroy` en lo crítico | Un error no borra producción |
| Renombres con `moved`, importaciones con `import` | Nada se destruye por un cambio de nombre |
| Etiquetas de costo en todo (`default_tags`) | Se puede saber cuánto cuesta cada equipo |

### Las versiones, fijadas

```hcl
terraform {
  required_version = ">= 1.10, < 2.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.82"
    }
  }
}
```

Y el archivo **`.terraform.lock.hcl`** en Git, para que la CI y todo el equipo usen exactamente la misma versión de cada proveedor. Para actualizarlos: `terraform init -upgrade` en una rama, y el plan dirá si algo cambia.

:::experto HCP Terraform, Atlantis, OpenTofu
- **HCP Terraform** (antes Terraform Cloud) y **Terraform Enterprise** son la plataforma de HashiCorp: guardan el estado, ejecutan plan/apply, tienen políticas (Sentinel) y aprobaciones.
- **Atlantis** es la alternativa libre: un servidor que comenta el plan en el pull request y aplica cuando alguien escribe `atlantis apply`.
- **OpenTofu** es el fork libre de Terraform (de la Linux Foundation), compatible con la misma sintaxis; el comando es `tofu` en lugar de `terraform`. Algunas empresas lo eligieron por la licencia.
:::

<!-- estandar:errores -->
:::errores
- **Aplicar un plan viejo**: alguien aprueba el plan del lunes y el apply corre el jueves con otro estado. Por eso el apply de la CI vuelve a planificar sobre `main` (o aplica el archivo de plan guardado, que falla con "Saved plan is stale" si el estado cambió).
- **El mismo rol para plan y apply**: un pull request malicioso podría modificar el workflow y aplicar cambios. El rol del plan es de solo lectura.
- **Pruebas con `command = apply` contra la cuenta de producción**: crean y destruyen recursos reales. Siempre en una cuenta de pruebas.
- **Ignorar el drift**: el siguiente apply de alguien revierte el cambio manual sin que nadie se entere. El plan nocturno lo hace visible.
- **No fijar `terraform_version` en la CI**: la imagen se actualiza, el estado se escribe con una versión más nueva y ya no se puede usar con la vieja.
:::

<!-- estandar:trabajo -->
:::trabajo
- En un equipo maduro, **nadie** tiene permisos de escritura en producción desde su usuario: todo cambio pasa por la CI. Para emergencias existe un procedimiento *break glass* con un rol temporal, auditado.
- El plan publicado en el pull request es parte de la auditoría: quién pidió el cambio, qué cambió en la nube, quién lo aprobó, cuándo se aplicó.
- Las pruebas de los módulos corren en cada pull request del repositorio de módulos; los entornos solo se actualizan a una versión nueva del módulo después de que pasen.
- Un pull request de infraestructura es chico: un cambio, un plan que se entiende en dos minutos. Los cambios grandes se dividen.
:::

<!-- estandar:entrevista -->
:::entrevista "¿Cómo despliegas Terraform de forma segura en producción?"
Todo por pull request. La CI corre fmt, validate, tflint, un escáner de seguridad y terraform test, y publica el plan de cada entorno en el pull request. Un revisor lee el plan, no solo el código. Al hacer merge, la CI aplica en dev automáticamente y en prod con aprobación manual (environment protegido). La CI se autentica con OIDC, con un rol de solo lectura para el plan y otro para el apply que solo puede usar la rama main. El estado está en un backend remoto con bloqueo y versionado, los recursos críticos tienen prevent_destroy, y un plan nocturno con -detailed-exitcode detecta drift.
:::

## Resumen

| Etapa | Qué se hace |
|---|---|
| Antes del commit | `pre-commit`: fmt, validate, tflint |
| Pull request | fmt -check, validate, tflint, checkov, `terraform test`, plan publicado en el PR |
| Merge a main | Apply en dev automático |
| Producción | Apply con aprobación manual, rol separado, OIDC |
| Todos los días | Plan con `-detailed-exitcode` para detectar drift |

## Ejercicios

:::ejercicio quiz
En un `run` de `terraform test` con `command = plan`, ¿qué pasa con los recursos?

- [ ] Se crean y se destruyen al final
- [x] No se crea nada: solo se calcula el plan y se evalúan los assert
- [ ] Se crean y quedan creados
- [ ] Se importan
:::

:::ejercicio quiz
`terraform plan -detailed-exitcode` termina con código 2. ¿Qué significa?

- [ ] Que hubo un error
- [ ] Que no hay cambios
- [x] Que el plan tiene cambios (en un plan programado: hay drift)
- [ ] Que el estado está bloqueado
:::

:::ejercicio quiz
¿Por qué OIDC es mejor que guardar una access key de AWS en los secretos de GitHub?

- [ ] Porque es más rápido
- [x] Porque las credenciales son temporales y solo un repositorio y rama concretos pueden obtenerlas: no hay una clave fija que se pueda filtrar
- [ ] Porque no necesita un rol de IAM
- [ ] Porque permite aplicar sin plan
:::

:::ejercicio quiz
Revisas un pull request que dice "agrega una etiqueta a los buckets". El plan dice `Plan: 3 to add, 0 to change, 3 to destroy`. ¿Qué haces?

- [ ] Lo apruebo: las etiquetas no son peligrosas
- [x] No lo apruebo: agregar una etiqueta es un `~` (update); 3 destroy indican que algo cambió de nombre o fuerza reemplazo, y los buckets se perderían
- [ ] Lo apruebo si los tests pasan
- [ ] Pido que lo apliquen en prod primero
:::

:::ejercicio cli
En `~/infra/lago` hay un módulo con pruebas en `tests/`. Ejecuta las pruebas de Terraform.
```respuesta
terraform test
```
```setup
aws configure
mkdir -p ~/infra/lago/tests
printf 'variable "entorno" {\n  type = string\n  validation {\n    condition     = contains(["dev", "prod"], var.entorno)\n    error_message = "dev o prod"\n  }\n}\n\nprovider "aws" {\n  region = "us-east-1"\n}\n\nresource "aws_s3_bucket" "gold" {\n  bucket = "tienda-${var.entorno}-gold"\n}\n\nresource "aws_s3_bucket" "logs" {\n  count  = var.entorno == "prod" ? 1 : 0\n  bucket = "tienda-${var.entorno}-logs"\n}\n' > ~/infra/lago/main.tf
printf 'run "dev" {\n  command = plan\n  variables {\n    entorno = "dev"\n  }\n  assert {\n    condition     = aws_s3_bucket.gold.bucket == "tienda-dev-gold"\n    error_message = "nombre incorrecto"\n  }\n  assert {\n    condition     = length(aws_s3_bucket.logs) == 0\n    error_message = "dev no lleva logs"\n  }\n}\n\nrun "invalido" {\n  command = plan\n  variables {\n    entorno = "qa"\n  }\n  expect_failures = [var.entorno]\n}\n' > ~/infra/lago/tests/lago.tftest.hcl
cd ~/infra/lago
terraform init
```
:::

:::ejercicio cli
Antes de hacer commit, deja con el formato estándar **todos** los archivos de Terraform del repositorio, incluidas las subcarpetas.
```respuesta
terraform fmt -recursive
terraform fmt --recursive
```
```setup
mkdir -p ~/infra/repo/modules/capa
printf 'resource "aws_s3_bucket" "this" {\nbucket = var.nombre\n  tags = var.etiquetas\n}\n' > ~/infra/repo/modules/capa/main.tf
printf 'module "capa" {\nsource = "./modules/capa"\n}\n' > ~/infra/repo/main.tf
cd ~/infra/repo
```
:::

:::ejercicio cli
Simula el chequeo de drift de la CI: ejecuta el plan del proyecto de modo que el código de salida diga si hay cambios (0 sin cambios, 2 con cambios).
```respuesta
terraform plan -detailed-exitcode
terraform plan -detailed-exitcode -input=false
terraform plan -input=false -detailed-exitcode
```
```setup
aws configure
mkdir -p ~/infra/drift
printf 'provider "aws" {\n  region = "us-east-1"\n}\n\nresource "aws_s3_bucket" "gold" {\n  bucket = "tienda-prod-gold"\n}\n' > ~/infra/drift/main.tf
cd ~/infra/drift
terraform init
terraform apply -auto-approve
```
:::

:::ejercicio abierto titulo="Las pruebas del módulo capa_lago"
Para el módulo `capa_lago` de la lección de módulos (variables `nombre`, `dias_retencion`, `versionado`, `etiquetas`), escribe un `tests/capa_lago.tftest.hcl` con tres `run`: (1) con `dias_retencion = 0` no se crea la regla de retención; (2) con `dias_retencion = 90` la regla existe y expira a los 90 días; (3) el bloqueo de acceso público está siempre activado. Indica cuáles pueden ser `command = plan` y por qué.
```solucion
run "sin_retencion" {
  command = plan
  variables {
    nombre         = "prueba-capa-sin-retencion"
    dias_retencion = 0
  }
  assert {
    condition     = length(aws_s3_bucket_lifecycle_configuration.this) == 0
    error_message = "Con dias_retencion = 0 no debe haber regla de retención"
  }
}

run "con_retencion" {
  command = plan
  variables {
    nombre         = "prueba-capa-con-retencion"
    dias_retencion = 90
  }
  assert {
    condition     = length(aws_s3_bucket_lifecycle_configuration.this) == 1
    error_message = "Con dias_retencion = 90 debe existir la regla"
  }
  assert {
    condition     = aws_s3_bucket_lifecycle_configuration.this[0].rule[0].expiration[0].days == 90
    error_message = "La regla debe expirar a los 90 días"
  }
}

run "siempre_privado" {
  command = plan
  variables {
    nombre = "prueba-capa-privada"
  }
  assert {
    condition = alltrue([
      aws_s3_bucket_public_access_block.this.block_public_acls,
      aws_s3_bucket_public_access_block.this.block_public_policy,
      aws_s3_bucket_public_access_block.this.ignore_public_acls,
      aws_s3_bucket_public_access_block.this.restrict_public_buckets,
    ])
    error_message = "El bucket tiene que bloquear todo acceso público"
  }
}

Los tres pueden ser command = plan porque todo lo que verifican (cantidad de instancias de count, valores de argumentos que vienen de variables y valores fijos) se conoce en el plan. Haría falta command = apply para verificar valores que solo existen después de crear (un ARN, un id, un endpoint) o el comportamiento real de la nube (que de verdad no se pueda leer un objeto sin credenciales).
```
:::
