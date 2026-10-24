---
titulo: "Infraestructura como código y tu primer terraform apply"
nivel: Intermedio
duracion: 50
resumen: Por qué la infraestructura se escribe como código, cómo piensa Terraform (declarativo, proveedores, estado) y el ciclo init → plan → apply → destroy en un laboratorio real.
objetivos: Explicar qué problemas resuelve la infraestructura como código frente a crear recursos a mano | Describir las piezas de Terraform: proveedor, recurso, estado, plan | Ejecutar el ciclo init, plan, apply y destroy e interpretar cada salida | Verificar que lo creado con Terraform existe en la nube y que el estado lo refleja
prerrequisitos: fundamentos-terminal | aws-s3-data-lake
autoevaluacion: ¿Puedes explicar tres problemas de crear la infraestructura con clics? | ¿Sabes qué significa que Terraform sea declarativo? | ¿Sabes qué hace cada uno de init, plan, apply y destroy? | ¿Puedes leer un plan y decir qué se va a crear, cambiar o borrar? | ¿Sabes qué es el archivo terraform.tfstate y por qué no se edita a mano?
---

:::escenario La plataforma que nadie puede repetir
El lakehouse del Grupo Andino se armó en los primeros meses con clics en la consola de la nube. Ahora hay que crear un entorno de **pruebas** idéntico al de producción, y nadie sabe exactamente qué se creó, con qué configuración ni en qué orden. Martín te dice:

> "Esto no puede volver a pasar. Desde hoy, todo recurso de la nube se define en código, en Git, y se crea con Terraform. Empecemos por algo chico: los buckets del lago."
:::

## El problema de los clics

Crear recursos desde la consola web es cómodo la primera vez. Después aparecen los problemas:

| Problema | Ejemplo |
|---|---|
| **No se puede repetir** | Crear el entorno de pruebas "igual que producción" lleva días y siempre queda algo distinto |
| **No hay historia** | Nadie sabe quién cambió la retención del bucket ni cuándo |
| **No hay revisión** | Un clic equivocado en producción no lo revisó nadie antes |
| **Errores silenciosos** | Un bucket público "por un ratito" que quedó así meses |
| **Se pierde el conocimiento** | La persona que armó todo se fue de la empresa |

La **infraestructura como código** (IaC, *infrastructure as code*) resuelve todo esto con una idea simple: la infraestructura se **describe en archivos de texto**, que se guardan en Git, se revisan en pull requests y los ejecuta una herramienta. Si el archivo dice que existen tres buckets, la herramienta se asegura de que existan tres buckets.

## Cómo piensa Terraform

**Terraform** (de HashiCorp; su versión libre se llama **OpenTofu**) es la herramienta de IaC más usada. Funciona con todas las nubes y con cientos de servicios (Databricks, Snowflake, GitHub, Datadog…).

### Declarativo, no imperativo

Con la CLI de una nube das **órdenes**: "crea este bucket". Si lo ejecutas dos veces, la segunda falla porque ya existe. Con Terraform **describes el resultado** que quieres: "tiene que existir este bucket". Terraform compara lo que describes con lo que existe y hace **solo lo que falta**. Si lo ejecutas dos veces, la segunda no hace nada.

:::analogia El plano de una casa
Las órdenes de la CLI son como darle instrucciones a un albañil ladrillo por ladrillo. Terraform es como entregarle **el plano**: él compara el plano con lo que ya está construido y hace solo lo que falta. Si cambias el plano (una ventana más), construye solo esa ventana.
:::

### Las piezas

```diagrama
titulo: Cómo trabaja Terraform: compara tu código con el estado y la nube, y calcula un plan
nodo code: Tu código .tf | icono=codigo | col=0 | fila=0 | color=azul | sub=lo que QUIERES que exista
nodo tf: Terraform | icono=terraform | col=1 | fila=0 | color=violeta | sub=calcula la diferencia
nodo plan: Plan | icono=archivo | col=2 | fila=0 | color=amarillo | sub=+ crear  ~ cambiar  - borrar
nodo prov: Proveedor | icono=engranaje | col=2 | fila=1 | color=gris | sub=aws, azurerm, google…
nodo cloud: La nube | icono=nube | col=3 | fila=1 | color=naranja | sub=lo que EXISTE
nodo state: terraform.tfstate | icono=base | col=1 | fila=1 | color=verde | sub=lo que Terraform creó
flecha code -> tf
flecha state -> tf: lee
flecha tf -> plan
flecha plan -> prov: apply
flecha prov -> cloud: llama a la API
flecha prov -> state: guarda | estilo=punteada
```

| Pieza | Qué es |
|---|---|
| **Proveedor** (*provider*) | El plugin que sabe hablar con una plataforma: `aws`, `azurerm`, `google`, `databricks`. Se descarga con `terraform init` |
| **Recurso** (*resource*) | Algo que existe en la plataforma: un bucket, una base, un rol |
| **Estado** (*state*) | Un archivo JSON donde Terraform anota qué creó y con qué atributos. Es su memoria |
| **Plan** | La lista de cambios que Terraform haría: crear, cambiar o borrar |

## Tu primer archivo de Terraform

Un archivo `.tf` está escrito en **HCL** (HashiCorp Configuration Language). Este crea un bucket de S3 para la capa bronze del lago:

```hcl
# main.tf
provider "aws" {
  region = "us-east-1"
}

resource "aws_s3_bucket" "bronze" {
  bucket = "tienda-lake-bronze"

  tags = {
    proyecto = "lakehouse"
    capa     = "bronze"
  }
}

output "arn_bronze" {
  value = aws_s3_bucket.bronze.arn
}
```

Cómo leerlo:

- **`provider "aws"`** configura el proveedor de AWS: en qué región trabajar.
- **`resource "aws_s3_bucket" "bronze"`** declara un recurso. `aws_s3_bucket` es el **tipo** (lo define el proveedor) y `bronze` es el **nombre local**: cómo lo llamas dentro de tu código. No es el nombre del bucket en AWS.
- **`bucket = "tienda-lake-bronze"`** es un **argumento**: el nombre real del bucket.
- **`output`** muestra un valor al terminar. `aws_s3_bucket.bronze.arn` es una **referencia**: el ARN del bucket, que AWS asigna al crearlo.

## El ciclo de trabajo

```diagrama
titulo: El ciclo de Terraform
nodo w: Escribir .tf | icono=codigo | col=0 | fila=0 | color=azul
nodo i: terraform init | icono=archivos | col=1 | fila=0 | color=gris | sub=descarga proveedores
nodo p: terraform plan | icono=lupa | col=2 | fila=0 | color=amarillo | sub=muestra qué haría
nodo a: terraform apply | icono=check | col=3 | fila=0 | color=verde | sub=lo hace y guarda el estado
nodo d: terraform destroy | icono=x | col=3 | fila=1 | color=rojo | sub=borra todo lo creado
flecha w -> i: una vez
flecha i -> p
flecha p -> a
flecha a -> w: siguiente cambio | estilo=punteada
flecha a -> d: al terminar | estilo=punteada
```

| Comando | Qué hace | Cuándo |
|---|---|---|
| `terraform init` | Lee la configuración, descarga los proveedores y prepara el backend del estado | Al empezar, o cuando agregas un proveedor o un módulo |
| `terraform fmt` | Ordena el formato (sangría, alineación) | Antes de cada commit |
| `terraform validate` | Revisa la sintaxis y las referencias, sin tocar la nube | Antes del plan |
| `terraform plan` | Compara código, estado y nube, y muestra los cambios **sin hacerlos** | Siempre antes de aplicar |
| `terraform apply` | Muestra el plan, pide confirmación y lo ejecuta | Para crear o cambiar |
| `terraform destroy` | Borra todo lo que este código creó | Al terminar un laboratorio |

## Laboratorio: tu primer lago con Terraform

La terminal del curso tiene un **Terraform simulado** que lee tus archivos de verdad y crea los recursos en las nubes simuladas. Abre la terminal (⌨ Terminal) y sigue los pasos.

**1. Prepara la carpeta y las credenciales.** Terraform usa las mismas credenciales que la CLI de AWS:

```bash norun
aws configure
mkdir -p ~/infra/lake && cd ~/infra/lake
code main.tf
```

Pega en el editor el archivo `main.tf` de arriba y guarda.

**2. Inicializa:**

```text
$ terraform init
Initializing the backend...
Initializing provider plugins...
- Finding hashicorp/aws versions matching "latest"...
- Installing hashicorp/aws v5.82.2...
- Installed hashicorp/aws v5.82.2 (signed by HashiCorp)
Terraform has created a lock file .terraform.lock.hcl ...
Terraform has been successfully initialized!
```

Se crearon dos cosas: la carpeta `.terraform/` (los proveedores descargados; no va a Git) y el archivo `.terraform.lock.hcl` (las versiones exactas de los proveedores; **sí** va a Git, para que todo el equipo use las mismas).

**3. Mira el plan:**

```text
$ terraform plan
  # aws_s3_bucket.bronze will be created
  + resource "aws_s3_bucket" "bronze" {
      + arn                = (known after apply)
      + bucket             = "tienda-lake-bronze"
      + id                 = (known after apply)
      + tags               = {
          + "proyecto" = "lakehouse"
          + "capa"     = "bronze"
        }
    }

Plan: 1 to add, 0 to change, 0 to destroy.
```

El `+` significa "se va a crear". `(known after apply)` son valores que recién se conocen cuando AWS crea el recurso, como el ARN. **Leer el plan con atención es la habilidad más importante de Terraform**: es tu última oportunidad de ver un error antes de que ocurra.

**4. Aplica y verifica:**

```bash norun
terraform apply          # confirma con yes (el simulador confirma solo)
aws s3 ls                # el bucket existe de verdad
terraform output         # el ARN
```

**5. Ejecuta `terraform plan` otra vez.** Vas a ver `No changes. Your infrastructure matches the configuration.` Terraform compara lo que pediste con lo que existe, y ya coincide: eso es lo declarativo.

**6. Cambia algo.** Agrega una etiqueta `entorno = "dev"` en `tags` y ejecuta `terraform plan`. Ahora el símbolo es `~` (*update in-place*): se modifica sin recrear. Aplica el cambio.

**7. Limpia:**

```bash norun
terraform destroy
aws s3 ls                # el bucket ya no existe
```

## El archivo de estado

Después del `apply` apareció `terraform.tfstate`. Es un JSON con todo lo que Terraform creó y sus atributos. Con él, Terraform sabe que `aws_s3_bucket.bronze` en tu código corresponde al bucket `tienda-lake-bronze` en AWS.

```bash norun
terraform state list                         # qué recursos administra
terraform state show aws_s3_bucket.bronze    # sus atributos
```

:::cuidado Tres reglas del estado
1. **No se edita a mano.** Si hace falta, se usan los comandos `terraform state`.
2. **No va a Git**: puede contener contraseñas y llaves. Va en el `.gitignore`.
3. **No se pierde.** Si lo pierdes, Terraform "olvida" lo que creó e intenta crearlo de nuevo. En un equipo, el estado vive en un **backend remoto** (un bucket), que se ve en la lección de estado.
:::

<!-- estandar:errores -->
:::errores
- **Aplicar sin leer el plan**: el `-/+` (reemplazar) en una base de datos significa **borrarla y crearla de nuevo**, con sus datos.
- **Cambiar a mano lo que administra Terraform**: el siguiente `apply` lo vuelve a dejar como dice el código (o falla). Todo cambio, por código.
- **Confundir el nombre local con el nombre real**: en `resource "aws_s3_bucket" "bronze"`, `bronze` es solo el nombre en tu código.
- **Olvidar el `terraform init`** después de agregar un proveedor o un módulo: aparece "Inconsistent dependency lock file".
- **Subir `terraform.tfstate` o `.terraform/` a Git.**
:::

<!-- estandar:trabajo -->
:::trabajo
- En los equipos de datos, Terraform crea la "plataforma": buckets, bases, catálogos, permisos, clústeres, jobs de Databricks, cuentas de servicio. Los pipelines (dbt, Spark, Airflow) corren **sobre** esa plataforma.
- El flujo profesional es: cambio en una rama → pull request → la CI ejecuta `terraform plan` y lo publica como comentario → alguien lo revisa → al hacer merge, la CI ejecuta `terraform apply`. Nadie aplica cambios de producción desde su computadora.
- Saber leer y escribir Terraform aparece en casi todas las ofertas de data engineer semi senior y senior.
:::

<!-- estandar:entrevista -->
:::entrevista "¿Qué es el estado de Terraform y dónde lo guardarías?"
Es el archivo donde Terraform registra qué recursos reales corresponden a cada recurso del código, con sus atributos; lo usa para calcular el plan. En un equipo se guarda en un backend remoto (un bucket de S3, GCS o un contenedor de Azure) con bloqueo, versionado y cifrado, para que todos usen el mismo estado, nadie aplique a la vez y se pueda recuperar una versión anterior. Nunca va a Git porque puede contener secretos.
:::

## Ejercicios

:::ejercicio quiz
Ejecutas `terraform apply` dos veces seguidas con el mismo código. ¿Qué pasa en la segunda?

- [ ] Falla porque el bucket ya existe
- [ ] Crea un segundo bucket
- [x] No hace nada: compara el código con lo que existe y no hay diferencias
- [ ] Borra el bucket y lo vuelve a crear
:::

:::ejercicio quiz
En un plan ves `-/+ resource "aws_db_instance" "ventas"` con la nota `# forces replacement`. ¿Qué significa?

- [ ] Que se va a actualizar un atributo sin tocar la base
- [x] Que la base se va a destruir y crear de nuevo (con riesgo de perder datos)
- [ ] Que se va a crear una copia
- [ ] Que el plan falló
:::

:::ejercicio quiz
¿Qué archivos de un proyecto de Terraform **sí** van a Git?

- [ ] `terraform.tfstate` y `.terraform/`
- [x] Los `.tf` y `.terraform.lock.hcl`
- [ ] Solo `terraform.tfstate`
- [ ] Ninguno
:::

:::ejercicio cli
En la carpeta `~/infra/lake` ya hay un `main.tf` con un bucket. Descarga el proveedor y prepara la carpeta para trabajar.
```respuesta
terraform init
```
```setup
mkdir -p ~/infra/lake
printf 'provider "aws" {\n  region = "us-east-1"\n}\n\nresource "aws_s3_bucket" "bronze" {\n  bucket = "tienda-lake-bronze"\n}\n' > ~/infra/lake/main.tf
cd ~/infra/lake
```
:::

:::ejercicio cli
Con el proyecto ya inicializado, muestra qué cambios haría Terraform **sin** aplicarlos.
```respuesta
terraform plan
```
```setup
aws configure
mkdir -p ~/infra/lake2
printf 'provider "aws" {\n  region = "us-east-1"\n}\n\nresource "aws_s3_bucket" "silver" {\n  bucket = "tienda-lake-silver"\n}\n' > ~/infra/lake2/main.tf
cd ~/infra/lake2
terraform init
```
:::

:::ejercicio cli
Aplica la configuración **sin** que pida confirmación (como se hace en un pipeline de CI).
```respuesta
terraform apply -auto-approve
```
```setup
aws configure
mkdir -p ~/infra/lake3
printf 'provider "aws" {\n  region = "us-east-1"\n}\n\nresource "aws_s3_bucket" "gold" {\n  bucket = "tienda-lake-gold"\n}\n' > ~/infra/lake3/main.tf
cd ~/infra/lake3
terraform init
```
:::

:::ejercicio cli
Lista los recursos que Terraform administra en este proyecto (los que guarda en su estado).
```respuesta
terraform state list
```
```setup
aws configure
mkdir -p ~/infra/lake4
printf 'provider "aws" {\n  region = "us-east-1"\n}\n\nresource "aws_s3_bucket" "landing" {\n  bucket = "tienda-lake-landing"\n}\n' > ~/infra/lake4/main.tf
cd ~/infra/lake4
terraform init
terraform apply -auto-approve
```
:::
