---
titulo: "La nube desde tu computadora: cuentas gratuitas, CLIs, credenciales seguras y Terraform"
nivel: Intermedio
duracion: 65
resumen: Abre cuentas de prueba en AWS, Google Cloud, Azure y Databricks sin llevarte sorpresas en la factura, instala sus CLIs y Terraform, inicia sesión de la forma segura (SSO, credenciales temporales, Application Default Credentials), maneja perfiles y entornos, y aprende a no dejar nada encendido.
objetivos: Abrir cuentas gratuitas y configurar alertas de presupuesto antes de crear cualquier recurso | Instalar las CLIs de AWS, Google Cloud, Azure y Databricks, y Terraform | Iniciar sesión con SSO y credenciales temporales en lugar de claves fijas | Manejar varios perfiles, proyectos o suscripciones y saber cuál está activo | Limpiar los recursos al terminar y proteger las credenciales de tu máquina
prerrequisitos: local-preparar-la-computadora | terraform-que-es-iac
autoevaluacion: ¿Configuraste una alerta de presupuesto en cada nube que usas? | ¿Sabes por qué SSO es mejor que una access key guardada? | ¿Sabes qué son las Application Default Credentials de Google Cloud? | ¿Sabes comprobar en qué cuenta, proyecto o suscripción estás antes de crear algo? | ¿Sabes cómo borrar todo lo que creaste en un laboratorio?
---

:::escenario La factura de 400 dólares
Una estudiante dejó un clúster de prueba encendido "un ratito" un viernes. El lunes tenía una factura de 400 dólares. Otro subió por error su archivo de credenciales a un repositorio público: en minutos, alguien usó su cuenta para minar criptomonedas.

> "Antes de crear tu primer recurso en la nube: alerta de presupuesto, sesión con SSO y nada de claves fijas en archivos. Y al terminar cada práctica, `terraform destroy`."
:::

## 1. Cuentas gratuitas, con red de seguridad

| Nube | Qué ofrece para aprender | Cuidado con |
|---|---|---|
| **AWS** | Free Tier: S3, Lambda, Glue y otros con límites mensuales; créditos para cuentas nuevas | NAT Gateways, clústeres EMR/Redshift, instancias grandes: no son gratis |
| **Google Cloud** | 300 USD de crédito por 90 días + capa siempre gratuita (BigQuery: 1 TB de consultas y 10 GB de almacenamiento por mes) | Dataproc y Composer cobran por hora |
| **Azure** | 200 USD de crédito por 30 días + servicios gratis 12 meses | Databricks y Synapse consumen el crédito rápido |
| **Databricks** | **Free Edition** (gratuita, sin tarjeta, con límites) y prueba de 14 días en tu nube | La prueba en tu nube cobra la infraestructura a tu cuenta de nube |

:::cuidado Lo primero: una alerta de presupuesto
Antes de crear cualquier recurso, crea un presupuesto con alerta por email (por ejemplo, 10 USD al mes). No apaga nada, pero te avisa a tiempo.

```bash norun
# AWS
aws budgets create-budget --account-id 123456789012 \
  --budget '{"BudgetName":"mensual","BudgetLimit":{"Amount":"10","Unit":"USD"},"TimeUnit":"MONTHLY","BudgetType":"COST"}' \
  --notifications-with-subscribers '[{"Notification":{"NotificationType":"ACTUAL","ComparisonOperator":"GREATER_THAN","Threshold":80},"Subscribers":[{"SubscriptionType":"EMAIL","Address":"ana@correo.com"}]}]'

# Google Cloud
gcloud billing budgets create --billing-account=0X0X0X-0X0X0X-0X0X0X \
  --display-name=mensual --budget-amount=10USD --threshold-rule=percent=0.8

# Azure
az consumption budget create --budget-name mensual --amount 10 --category cost \
  --time-grain monthly --start-date 2025-01-01 --end-date 2026-12-31
```

Además, en AWS activa **MFA** en el usuario raíz y no lo uses nunca para el día a día.
:::

## 2. Instalar las CLIs y Terraform

| Herramienta | Ubuntu / WSL | macOS |
|---|---|---|
| AWS CLI v2 | `curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o awscliv2.zip && unzip awscliv2.zip && sudo ./aws/install` | `brew install awscli` |
| Google Cloud CLI | `sudo apt install google-cloud-cli` (después de agregar el repositorio de Google) o el instalador de [cloud.google.com/sdk](https://cloud.google.com/sdk/docs/install) | `brew install --cask google-cloud-sdk` |
| Azure CLI | `curl -sL https://aka.ms/InstallAzureCLIDeb \| sudo bash` | `brew install azure-cli` |
| Databricks CLI | `curl -fsSL https://raw.githubusercontent.com/databricks/setup-cli/main/install.sh \| sh` | `brew tap databricks/tap && brew install databricks` |
| Terraform | Repositorio de HashiCorp con `apt`, o `tfenv` para manejar versiones | `brew tap hashicorp/tap && brew install hashicorp/tap/terraform` |

Comprueba: `aws --version`, `gcloud --version`, `az version`, `databricks --version`, `terraform -version`.

:::tip Varias versiones de Terraform
Cada proyecto fija su versión (`required_version`). Con **tfenv** (`tfenv install 1.10.3`, `tfenv use 1.10.3`) o con un archivo `.terraform-version` en el repositorio, cambias de versión por proyecto, como `uv` con Python.
:::

## 3. Iniciar sesión de forma segura

```diagrama
titulo: Credenciales temporales: la sesión vence sola y no hay claves fijas en tu disco
nodo tu: Tú | icono=usuario | col=0 | fila=0 | color=azul
nodo idp: Inicio de sesión\nde la empresa (SSO) | icono=escudo | col=1 | fila=0 | color=violeta | sub=usuario + MFA
nodo tmp: Credenciales\ntemporales | icono=llave | col=2 | fila=0 | color=amarillo | sub=vencen en 1–12 h
nodo cli: CLIs, Terraform,\nPython, dbt | icono=codigo | col=3 | fila=0 | color=verde
nodo mal: Access key fija\nen ~/.aws/credentials | icono=alerta | col=2 | fila=1 | color=rojo | sub=no vence:\nsi se filtra, sirve para siempre
flecha tu -> idp: navegador
flecha idp -> tmp
flecha tmp -> cli
flecha mal -> cli | estilo=punteada
```

| Nube | Recomendado | Evitar |
|---|---|---|
| **AWS** | `aws configure sso` una vez, después `aws sso login --profile dev` | `aws configure` con una access key de un usuario IAM |
| **Google Cloud** | `gcloud auth login` (para la CLI) **y** `gcloud auth application-default login` (para Terraform, Python, dbt) | Descargar archivos JSON de claves de cuentas de servicio |
| **Azure** | `az login` (abre el navegador) | Service principals con secreto en tu máquina |
| **Databricks** | `databricks auth login --host https://…` (OAuth) | Tokens personales sin vencimiento |

**Google Cloud tiene dos inicios de sesión distintos.** `gcloud auth login` es para los comandos `gcloud`/`bq`; las librerías (Terraform, Python, dbt) usan las **Application Default Credentials (ADC)**, que se crean con `gcloud auth application-default login`. Si Terraform dice "could not find default credentials", falta el segundo.

## 4. ¿Dónde estoy? Perfiles, proyectos y suscripciones

El error más caro es crear algo en la cuenta equivocada (producción en lugar de pruebas). Antes de crear, verifica:

| Nube | ¿Quién soy y dónde estoy? | Cambiar |
|---|---|---|
| AWS | `aws sts get-caller-identity` | `export AWS_PROFILE=dev` o `--profile dev` |
| Google Cloud | `gcloud config list` | `gcloud config set project academia-datos-dev` (o configuraciones con `gcloud config configurations`) |
| Azure | `az account show -o table` | `az account set --subscription sub-datos-dev` |
| Databricks | `databricks auth profiles` | `--profile dev` o `DATABRICKS_CONFIG_PROFILE=dev` |
| Terraform | `terraform workspace show` y el backend de la carpeta | La carpeta del entorno |

:::tip El prompt que te salva
Herramientas como **Starship** muestran en el prompt de la terminal el perfil de AWS, el proyecto de GCP y el workspace de Terraform activos. Ver `☁️ prod` en rojo antes de un `apply` evita desastres.
:::

## 5. Al terminar: limpiar

- Si lo creaste con **Terraform**: `terraform destroy` en la carpeta del laboratorio.
- Si lo creaste con la CLI: borra el **contenedor** completo, no recurso por recurso: el grupo de recursos en Azure (`az group delete -n rg-lab --yes`), el proyecto de prueba en Google Cloud (`gcloud projects delete lab-xyz`).
- Revisa al día siguiente el panel de costos de la nube.

## 6. Proteger tu máquina

- Las credenciales viven en `~/.aws/`, `~/.config/gcloud/`, `~/.azure/`, `~/.databrickscfg`: **nunca** las copies a un proyecto ni a la nube.
- Agrega a tu `.gitignore` global (`git config --global core.excludesFile ~/.gitignore_global`): `.env`, `*.pem`, `credentials*.json`, `*.tfstate`.
- Activa el escaneo de secretos de GitHub en tus repositorios y, si se filtra algo, **rota la credencial** de inmediato.

<!-- estandar:errores -->
:::errores
- **`ExpiredToken` / `The SSO session has expired`**: la sesión temporal venció (es lo esperado). `aws sso login --profile dev` y listo.
- **Terraform con Google: `could not find default credentials`**: faltan las ADC: `gcloud auth application-default login`.
- **`AuthorizationFailed` en Azure con un usuario que tiene permisos**: estás en otra suscripción. `az account show` y `az account set`.
- **Crear recursos en la región por defecto equivocada** (us-east-1 cuando tus datos están en southamerica): fija la región en el perfil y en el proveedor de Terraform.
- **Una access key en un repositorio**: aunque borres el commit, ya está expuesta. Desactívala en la consola, crea otra y revisa la actividad de la cuenta.
:::

<!-- estandar:trabajo -->
:::trabajo
- En las empresas no existen usuarios IAM con claves para las personas: todos entran por **SSO** (IAM Identity Center, Entra ID, Google Workspace) con MFA, y los permisos se asignan por grupo y por cuenta/proyecto.
- Cada persona tiene acceso de escritura solo a `dev` (o a su *sandbox*); producción es de solo lectura para las personas y la CI aplica los cambios.
- Los presupuestos y las alertas de costo se crean también con Terraform, por proyecto y por equipo, junto con etiquetas obligatorias para saber quién gasta qué.
:::

## Ejercicios

:::ejercicio quiz
Terraform no puede crear un bucket en Google Cloud ("could not find default credentials"), aunque `gcloud storage ls` funciona. ¿Qué falta?

- [ ] Reinstalar Terraform
- [x] Las Application Default Credentials: `gcloud auth application-default login`
- [ ] Un archivo JSON de una cuenta de servicio
- [ ] `gcloud init`
:::

:::ejercicio quiz
¿Qué es lo primero que haces en una cuenta de nube nueva para practicar?

- [ ] Crear un clúster para probar
- [x] Crear una alerta de presupuesto (y activar MFA)
- [ ] Generar una access key
- [ ] Hacer pública la cuenta
:::

:::ejercicio cli
Tienes un perfil de AWS `dev` configurado con SSO y la sesión venció. Inicia sesión de nuevo con ese perfil.
```respuesta
aws sso login --profile dev
aws sso login --profile=dev
```
:::

:::ejercicio cli
Antes de crear recursos en AWS, comprueba con qué identidad y en qué cuenta estás trabajando.
```respuesta
aws sts get-caller-identity
aws sts get-caller-identity --profile \w+
```
```solucion
aws sts get-caller-identity
```
```setup
aws configure
```
:::

:::ejercicio cli
Inicia sesión en Google Cloud para las **librerías** (Terraform, Python, dbt), no solo para la CLI.
```respuesta
gcloud auth application-default login
```
:::

:::ejercicio cli
En Azure, cambia la suscripción activa a `sub-datos-dev`.
```respuesta
az account set (--subscription|-s) ["']?sub-datos-dev["']?
```
```solucion
az account set --subscription sub-datos-dev
```
```setup
az login
```
:::

:::ejercicio cli
Crea un presupuesto mensual de AWS llamado `mensual` de 10 USD para la cuenta `123456789012` (tipo `COST`).
```respuesta
aws budgets create-budget --account-id 123456789012 --budget ['"]\{.*"BudgetName": ?"mensual".*\}['"].*
```
```solucion
aws budgets create-budget --account-id 123456789012 --budget '{"BudgetName":"mensual","BudgetLimit":{"Amount":"10","Unit":"USD"},"TimeUnit":"MONTHLY","BudgetType":"COST"}'
```
```setup
aws configure
```
:::
