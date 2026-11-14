---
titulo: GitHub en el flujo de datos - CI de dbt, despliegue de Databricks, Terraform, entornos y workflows programados
nivel: 6 · Avanzado completo
duracion: 55
resumen: Cómo se usa GitHub en un equipo de datos real, más allá de los tests de Python - CI que construye los modelos de dbt en un esquema temporal, despliegue de jobs de Databricks con Declarative Automation Bundles y OIDC, terraform plan comentado en el PR, entornos con aprobación manual para producción, workflows programados y el recorrido completo de un cambio desde el issue hasta producción.
objetivos: Diseñar el CI de un proyecto dbt | Desplegar a Databricks desde Actions con OIDC | Usar entornos con aprobación para producción | Programar workflows con cron | Describir el recorrido de un cambio de datos de punta a punta
prerrequisitos: github-repositorio-profesional
autoevaluacion: ¿Sabes por qué el CI de dbt construye en un esquema aparte? | ¿Sabes qué hace un environment con required reviewers? | ¿Sabes escribir un cron para todos los días a las 6 UTC? | ¿Sabes en qué momento se despliega a producción?
---

:::analogia En palabras simples
En un equipo de datos, GitHub es la torre de control: nada despega a producción sin pasar por ella. El código de los pipelines, los modelos, la infraestructura y hasta los tableros viven en repositorios, y los workflows son los que los prueban y los despliegan.
:::

## Paso 1 — El recorrido de un cambio

```text
Issue → rama → commits → PR → CI (tests, lint, dbt build en un esquema temporal)
     → revisión → merge a main → despliegue a dev/staging automático
     → aprobación manual → despliegue a prod → monitoreo
```

Todo lo que hiciste en el curso es parte de ese recorrido. Lo que agregan los equipos de datos son los pasos de **datos**: construir modelos contra una base real y desplegar jobs.

## Paso 2 — CI de un proyecto dbt

En cada PR, el CI construye los modelos en un **esquema temporal** (para no tocar las tablas que usa el negocio) y corre los tests de datos:

```yaml
name: dbt-ci
on:
  pull_request:
jobs:
  dbt:
    runs-on: ubuntu-latest
    env:
      DBT_SCHEMA: ci_pr_${{ github.event.number }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - run: pip install dbt-core dbt-databricks
      - run: dbt deps
      - run: dbt build --target ci
        env:
          DBT_TOKEN: ${{ secrets.DBT_CI_TOKEN }}
```

- El `profiles.yml` del target `ci` lee el esquema con `{{ env_var('DBT_SCHEMA') }}`: cada PR construye en `ci_pr_12`, `ci_pr_13`…
- **Slim CI**: en proyectos grandes, `dbt build --select state:modified+ --defer --state prod-artifacts/` construye solo lo que cambió y lo que depende de eso, usando el `manifest.json` de producción.
- Un workflow aparte, al cerrar el PR, borra el esquema temporal.

Lo practicas en el curso de [dbt](#/m/dbt).

## Paso 3 — Desplegar a Databricks con OIDC

Los jobs y pipelines de Databricks se describen en archivos con **Declarative Automation Bundles** (antes Asset Bundles) y se despliegan con la CLI:

```yaml
name: deploy
on:
  push:
    branches: [main]
permissions:
  id-token: write
  contents: read
jobs:
  deploy-dev:
    runs-on: ubuntu-latest
    environment: dev
    env:
      DATABRICKS_HOST: ${{ vars.DATABRICKS_HOST }}
      DATABRICKS_CLIENT_ID: ${{ vars.DATABRICKS_CLIENT_ID }}
      DATABRICKS_AUTH_TYPE: github-oidc
    steps:
      - uses: actions/checkout@v4
      - uses: databricks/setup-cli@main
      - run: databricks bundle validate -t dev
      - run: databricks bundle deploy -t dev
```

Con OIDC (lección 17) no hay ningún token de Databricks guardado: en Databricks se configura una *federation policy* que confía en "este repositorio, este entorno".

:::nota Terraform igual
Para infraestructura, el patrón es: en el PR, `terraform plan` y un comentario con el plan para revisarlo; al fusionar, `terraform apply`. Lo ves en el curso de [Terraform](#/m/terraform).
:::

## Paso 4 — Entornos con aprobación

En **Settings → Environments** se crean `dev`, `staging` y `prod`. Cada uno puede tener:

| Opción | Para qué |
|---|---|
| **Required reviewers** | El job queda en pausa hasta que alguien del equipo aprueba ("Review deployments") |
| **Wait timer** | Esperar N minutos antes de desplegar |
| **Deployment branches** | Solo `main` puede desplegar a `prod` |
| **Secretos y variables del entorno** | El `DATABRICKS_HOST` de prod distinto del de dev |

```yaml
  deploy-prod:
    needs: deploy-dev
    runs-on: ubuntu-latest
    environment: prod        # aquí se detiene hasta que alguien apruebe
```

## Paso 5 — Workflows programados

```yaml
on:
  schedule:
    - cron: "0 6 * * *"      # todos los días a las 06:00 UTC
  workflow_dispatch:
```

| Campo | minuto | hora | día del mes | mes | día de la semana |
|---|---|---|---|---|---|
| `0 6 * * *` | 0 | 6 | todos | todos | todos |
| `30 11 * * 1-5` | 30 | 11 | todos | todos | lunes a viernes |

- La hora es **UTC** y puede demorarse unos minutos en horas pico.
- Sirven para tareas livianas (un reporte, revisar la calidad de una tabla, limpiar esquemas de CI viejos). La orquestación de pipelines de producción va en Airflow, Databricks Jobs o Data Factory, no en GitHub Actions.

## Paso 6 — Lo que se versiona en un equipo de datos

| Qué | Dónde |
|---|---|
| Pipelines (Python, PySpark, SQL) | Repositorio, con tests |
| Modelos de dbt | Repositorio dbt, con CI |
| Jobs de Databricks | Bundles en el repositorio |
| Infraestructura | Terraform en el repositorio |
| DAGs de Airflow | Repositorio, desplegado al servidor de Airflow |
| Pipelines de Data Factory y Fabric | Integración con Git (cada cambio es un commit) |
| Informes de Power BI | Formato PBIP en el repositorio |

## ✅ Lo que lograste

- Sabes cómo es el CI de dbt y por qué usa un esquema temporal.
- Sabes desplegar a Databricks desde Actions sin tokens guardados.
- Sabes usar entornos con aprobación y workflows programados.
- Conoces el recorrido completo de un cambio de datos.

:::ejercicio quiz
¿Por qué el CI de dbt construye los modelos en un esquema como ci_pr_12?
- [ ] Porque es más rápido
- [x] Para probar los cambios contra la base sin tocar las tablas que usa el negocio
- [ ] Porque dbt no permite otro nombre
- [ ] Para borrar producción
:::

:::ejercicio quiz
Quieres que nadie despliegue a producción sin la aprobación de alguien del equipo. ¿Qué usas?
- [ ] Un comentario en el README
- [x] Un environment prod con required reviewers
- [ ] Un secreto
- [ ] Un issue
:::

:::ejercicio quiz
¿Qué significa `cron: "0 6 * * *"`?
- [ ] Cada 6 minutos
- [x] Todos los días a las 06:00 UTC
- [ ] Los días 6 de cada mes
- [ ] 6 veces por día
:::
