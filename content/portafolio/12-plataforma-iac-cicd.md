---
titulo: "Proyecto 11: La plataforma con Terraform, Declarative Automation Bundles y CI/CD"
nivel: Experto
duracion: 120
resumen: Lo que convierte proyectos sueltos en una plataforma profesional. Toda la infraestructura en código con Terraform (grupo de recursos, lago, Key Vault, workspace de Databricks), los pipelines y jobs en un Databricks Asset Bundle con entornos dev y prod, y GitHub Actions que validan cada cambio y despliegan al aprobar. Usas cualquiera de los proyectos anteriores como carga de trabajo. Valor - desplegar en minutos, igual en cada entorno y sin pasos manuales.
objetivos: Describir infraestructura de Azure y Databricks con Terraform y estado remoto | Empaquetar jobs y pipelines en un Asset Bundle con targets dev y prod | Diseñar un flujo de CI que valide, pruebe y despliegue | Autenticar la CI sin secretos de larga duración (OIDC o identidades federadas) | Explicar cómo se promueve un cambio de dev a prod
prerrequisitos: portafolio-lakehouse-de-ventas | terraform-plataforma-azure-databricks
autoevaluacion: ¿Sabes qué va en Terraform y qué va en el Asset Bundle? | ¿Sabes por qué el estado de Terraform va en un backend remoto? | ¿Sabes qué hace mode development en un target? | ¿Sabes qué pasos tiene tu CI y por qué en ese orden? | ¿Sabes cómo se autentica GitHub Actions contra Azure sin una clave guardada?
---

:::escenario
El equipo tiene tres proyectos en producción, creados a mano desde la consola. Nadie sabe exactamente qué configuración tiene el job de producción, un cambio "rápido" rompió el pipeline del viernes y el entorno de pruebas no se parece al de producción. La líder técnica pide: "todo en código, revisado por pull request y desplegado igual en todos lados".
:::

## Qué va en cada herramienta

| Capa | Herramienta | Ejemplos |
|---|---|---|
| Infraestructura de la nube | **Terraform** (azurerm + databricks) | Grupo de recursos, cuenta de almacenamiento, Key Vault, workspace, catálogos y permisos |
| Cargas de trabajo de datos | **Databricks Asset Bundle** | Jobs, pipelines declarativos, notebooks, tableros |
| Automatización | **GitHub Actions** | Lint, tests, `terraform plan`, `bundle validate` y `deploy` |

Regla práctica: lo que cambia poco y crea recursos (la infraestructura) va en Terraform; lo que cambia todas las semanas con el código de datos va en el bundle, en el mismo repositorio que ese código.

## Arquitectura

```diagrama
titulo: De un pull request a producción
nodo dev: Rama de trabajo | icono=git | col=0 | fila=0
nodo pr: Pull request | icono=github | col=1 | fila=0 | sub=revisión de código
nodo ci: CI | icono=githubactions | col=2 | fila=0 | sub=lint, tests, plan,\nbundle validate
nodo d: Deploy dev | icono=databricks | col=3 | fila=0 | sub=target dev
nodo m: Merge a main | icono=git | col=2 | fila=1
nodo p: Deploy prod | icono=databricks | col=3 | fila=1 | color=verde | sub=con aprobación
nodo tf: Terraform | icono=terraform | col=1 | fila=1 | sub=infraestructura,\nestado remoto
flecha dev -> pr
flecha pr -> ci
flecha ci -> d
flecha ci -> m: aprobado
flecha m -> p
flecha tf -> p: crea lo que el bundle usa | estilo=punteada
```

## Fase 1: Terraform

```hcl
terraform {
  backend "azurerm" {
    resource_group_name  = "rg-tfstate"
    storage_account_name = "sttfstateacademia"
    container_name       = "tfstate"
    key                  = "plataforma.tfstate"
  }
}

resource "azurerm_resource_group" "rg" {
  name     = "rg-datos-${var.entorno}"
  location = "eastus2"
  tags     = { proyecto = "plataforma", entorno = var.entorno }
}

resource "azurerm_storage_account" "lago" {
  name                     = "stlago${var.entorno}${random_string.sufijo.result}"
  resource_group_name      = azurerm_resource_group.rg.name
  location                 = azurerm_resource_group.rg.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  is_hns_enabled           = true
}
```

- **Estado remoto** con bloqueo: dos personas (o dos ejecuciones de CI) no pueden aplicar a la vez, y el estado no vive en la computadora de nadie.
- **Un estado por entorno** (`dev`, `prod`), con variables distintas: mismo código, distinta escala.

## Fase 2: el Asset Bundle

```yaml
# databricks.yml
bundle:
  name: ventas_lakehouse

include:
  - resources/*.yml

targets:
  dev:
    mode: development        # prefija los recursos con tu usuario y pausa los horarios
    default: true
    workspace:
      host: https://adb-1111111111111111.1.azuredatabricks.net
  prod:
    mode: production
    workspace:
      host: https://adb-2222222222222222.2.azuredatabricks.net
    run_as:
      service_principal_name: sp-datos-prod   # producción no corre con un usuario personal
```

```yaml
# resources/ventas.job.yml
resources:
  jobs:
    ventas_diarias:
      name: ventas_diarias
      schedule: { quartz_cron_expression: "0 0 6 * * ?", timezone_id: "America/Bogota" }
      tasks:
        - task_key: dbt_build
          dbt_task: { project_directory: ./transform, commands: ["dbt deps", "dbt build"] }
```

## Fase 3: CI/CD con GitHub Actions

```yaml
# .github/workflows/ci.yml
on:
  pull_request:
  push: { branches: [main] }
permissions: { id-token: write, contents: read }   # OIDC: sin secretos de larga duración
jobs:
  validar:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v5
      - run: uv run ruff check . && uv run pytest
      - run: uv run dbt build --target ci          # contra DuckDB, rápido y gratis
      - uses: databricks/setup-cli@main
      - run: databricks bundle validate -t dev
  desplegar_prod:
    needs: validar
    if: github.ref == 'refs/heads/main'
    environment: produccion                        # requiere aprobación manual
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: databricks/setup-cli@main
      - run: databricks bundle deploy -t prod
```

La autenticación de la CI usa **identidades federadas** (OIDC): GitHub presenta un token firmado y Azure o Databricks confían en él según el repositorio y la rama. No hay claves guardadas que puedan filtrarse.

## Entregables

- [ ] Terraform con estado remoto y dos entornos.
- [ ] Bundle con targets dev y prod, y un job real (de cualquier proyecto anterior).
- [ ] CI que corre en cada PR y despliega a prod con aprobación.
- [ ] Documento "cómo se promueve un cambio" y qué se haría ante un deploy fallido (rollback).

## Práctica

:::ejercicio cli dificultad=Básico titulo="Crear el bundle"
Crea un Asset Bundle nuevo con la plantilla `default-python`.
```respuesta
databricks bundle init( default-python)?
```
```solucion
databricks bundle init default-python
```
:::

:::ejercicio cli dificultad=Intermedio titulo="Validar el bundle"
Entra en la carpeta `mi_proyecto` del bundle y valídalo para el target `dev`.
```setup
databricks bundle init default-python
```
```respuesta
cd \S*mi_proyecto && databricks bundle validate( (-t|--target) dev)?
```
```solucion
cd mi_proyecto && databricks bundle validate -t dev
```
:::

:::ejercicio cli dificultad=Intermedio titulo="Desplegar a dev"
Despliega el bundle de `mi_proyecto` al target `dev`.
```setup
databricks bundle init default-python
```
```respuesta
cd \S*mi_proyecto && databricks bundle deploy (-t|--target) dev
```
```solucion
cd mi_proyecto && databricks bundle deploy -t dev
```
:::

:::ejercicio quiz dificultad=Intermedio
¿Dónde defines el job diario que corre `dbt build`?

- [ ] En Terraform, junto con la cuenta de almacenamiento
- [x] En el Asset Bundle, en el mismo repositorio que el código de dbt
- [ ] A mano en la interfaz de Databricks
- [ ] En el README
:::

:::ejercicio quiz dificultad=Avanzado
¿Qué hace `mode: development` en el target dev de un bundle?

- [ ] Despliega a producción con menos permisos
- [x] Prefija los recursos con el nombre del usuario y pausa los horarios, para que varias personas desarrollen sin pisarse ni ejecutar jobs programados
- [ ] Desactiva Unity Catalog
- [ ] Hace que los jobs no se puedan ejecutar
:::

:::ejercicio quiz dificultad=Avanzado
¿Cómo debe autenticarse GitHub Actions contra Azure y Databricks?

- [ ] Con la contraseña de un administrador en un secreto del repositorio
- [x] Con identidades federadas (OIDC): sin claves de larga duración guardadas
- [ ] Con un token personal sin vencimiento
- [ ] No necesita autenticarse
:::

:::ejercicio quiz dificultad=Intermedio
¿Por qué el estado de Terraform va en un backend remoto con bloqueo?

- [ ] Para que Terraform sea más rápido
- [x] Para que todos (y la CI) usen el mismo estado y nadie aplique cambios al mismo tiempo que otro
- [ ] Porque Terraform no funciona en local
- [ ] Para no tener que escribir variables
:::

## Para ir más lejos

- Políticas como código: un chequeo en la CI que rechace recursos sin etiquetas o cuentas de almacenamiento públicas.
- Pruebas de integración: después del deploy a dev, correr el job con un dataset chico generado y verificar resultados.
