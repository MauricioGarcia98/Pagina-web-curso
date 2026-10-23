---
titulo: Databricks Asset Bundles y CI/CD
nivel: Experto
duracion: 40
resumen: Proyectos como código con databricks.yml, targets dev/prod, validate/deploy/run y despliegue con GitHub Actions.
---

**Databricks Asset Bundles (DABs)** son la forma oficial de tratar jobs, pipelines, notebooks y configuraciones como **código**: se versionan en Git, se revisan en Pull Requests y se despliegan a dev/test/prod con la CLI.

## Crear un bundle

```bash norun
databricks bundle init                  # elige una plantilla: default-python, dbt-sql, default-sql...
cd mi_proyecto
```

```text
mi_proyecto/
├── databricks.yml            # definición del bundle y de los entornos (targets)
├── resources/
│   └── etl_diario.job.yml    # jobs y pipelines
├── src/
│   ├── bronze.py
│   └── silver.ipynb
└── tests/
```

## databricks.yml

```yaml norun
bundle:
  name: tienda_lakehouse

include:
  - resources/*.yml

variables:
  catalogo:
    default: dev

targets:
  dev:
    mode: development          # prefija recursos con tu usuario y pausa los schedules
    default: true
    workspace:
      host: https://adb-1111111111111111.1.azuredatabricks.net
  prod:
    mode: production
    workspace:
      host: https://adb-2222222222222222.2.azuredatabricks.net
    variables:
      catalogo: prod
    run_as:
      service_principal_name: "11111111-2222-3333-4444-555555555555"
```

## Un job definido como código

```yaml norun
# resources/etl_diario.job.yml
resources:
  jobs:
    etl_diario:
      name: etl_diario
      schedule:
        quartz_cron_expression: "0 0 3 * * ?"
        timezone_id: America/Argentina/Buenos_Aires
      parameters:
        - name: fecha
          default: "{{job.start_time.iso_date}}"
      tasks:
        - task_key: bronze
          notebook_task:
            notebook_path: ../src/bronze.py
            base_parameters: { catalogo: "${var.catalogo}" }
        - task_key: silver
          depends_on: [{ task_key: bronze }]
          notebook_task:
            notebook_path: ../src/silver.ipynb
        - task_key: gold_dbt
          depends_on: [{ task_key: silver }]
          dbt_task:
            commands: ["dbt deps", "dbt build --target ${bundle.target}"]
            project_directory: ../dbt
      email_notifications:
        on_failure: [equipo-datos@empresa.com]
```

## El ciclo de trabajo

```bash norun
databricks bundle validate                      # revisa la configuración
databricks bundle deploy -t dev                 # sube código y crea/actualiza jobs en dev
databricks bundle run -t dev etl_diario         # ejecuta el job y muestra el progreso
databricks bundle summary -t dev                # qué recursos hay desplegados
databricks bundle deploy -t prod                # (normalmente desde CI)
databricks bundle destroy -t dev                # borra lo desplegado en dev
```

## CI/CD con GitHub Actions

```yaml norun
name: deploy-prod
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: prod
    steps:
      - uses: actions/checkout@v4
      - uses: databricks/setup-cli@main
      - run: databricks bundle validate -t prod
      - run: databricks bundle deploy -t prod
        env:
          DATABRICKS_HOST: ${{ secrets.DATABRICKS_HOST }}
          DATABRICKS_CLIENT_ID: ${{ secrets.DATABRICKS_CLIENT_ID }}
          DATABRICKS_CLIENT_SECRET: ${{ secrets.DATABRICKS_CLIENT_SECRET }}
```

Flujo típico: rama → PR (CI: tests unitarios + `bundle validate` + deploy a un entorno de pruebas) → merge a `main` → deploy automático a producción con un **service principal**.

## Ejercicios

:::ejercicio cli
Crea un nuevo bundle desde una plantilla.
```respuesta
databricks bundle init( default-python| dbt-sql| default-sql)?
```
```solucion
databricks bundle init
```
:::

:::ejercicio cli
Valida la configuración del bundle.
```respuesta
databricks bundle validate( (-t|--target) \w+)?
```
```solucion
databricks bundle validate
```
```setup
databricks bundle init
cd mi_proyecto
echo "resources:" > resources/etl_diario.job.yml
echo "  jobs:" >> resources/etl_diario.job.yml
echo "    etl_diario:" >> resources/etl_diario.job.yml
echo "      name: etl_diario" >> resources/etl_diario.job.yml
```
:::

:::ejercicio cli
Despliega el bundle en el target `dev`.
```respuesta
databricks bundle deploy (-t|--target) dev
```
```solucion
databricks bundle deploy -t dev
```
```setup
databricks bundle init
cd mi_proyecto
echo "resources:" > resources/etl_diario.job.yml
echo "  jobs:" >> resources/etl_diario.job.yml
echo "    etl_diario:" >> resources/etl_diario.job.yml
echo "      name: etl_diario" >> resources/etl_diario.job.yml
```
:::

:::ejercicio cli
Ejecuta el job `etl_diario` del bundle en el target `dev`.
```respuesta
databricks bundle run (-t|--target) dev etl_diario
databricks bundle run etl_diario (-t|--target) dev
```
```solucion
databricks bundle run -t dev etl_diario
```
```setup
databricks bundle init
cd mi_proyecto
echo "resources:" > resources/etl_diario.job.yml
echo "  jobs:" >> resources/etl_diario.job.yml
echo "    etl_diario:" >> resources/etl_diario.job.yml
echo "      name: etl_diario" >> resources/etl_diario.job.yml
databricks bundle deploy -t dev
```
:::

:::ejercicio cli
Elimina todos los recursos que el bundle desplegó en `dev`.
```respuesta
databricks bundle destroy (-t|--target) dev( --auto-approve)?
```
```solucion
databricks bundle destroy -t dev
```
```setup
databricks bundle init
cd mi_proyecto
echo "resources:" > resources/etl_diario.job.yml
echo "  jobs:" >> resources/etl_diario.job.yml
echo "    etl_diario:" >> resources/etl_diario.job.yml
echo "      name: etl_diario" >> resources/etl_diario.job.yml
databricks bundle deploy -t dev
```
:::

:::ejercicio quiz
¿Qué hace `mode: development` en un target?

- [ ] Despliega en producción
- [x] Prefija los recursos con tu nombre de usuario y pausa los schedules, para que cada desarrollador tenga su copia aislada
- [ ] Desactiva la validación
- [ ] Borra los jobs de producción
:::
