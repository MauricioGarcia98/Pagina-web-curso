---
titulo: Workflows (Jobs), monitoreo y buenas prácticas
nivel: Experto
duracion: 30
resumen: Jobs multi-tarea, parámetros, reintentos, alertas, costos y la checklist de un lakehouse bien hecho.
---

## Lakeflow Jobs (Workflows)

Un **job** de Databricks es un DAG de **tareas**: notebooks, scripts Python, wheels, SQL, dbt, pipelines declarativos, o incluso otros jobs. Tiene:

- **Disparadores**: cron, llegada de archivos (*file arrival*), actualización de tablas, continuo o manual.
- **Parámetros de job** (`{{job.start_time.iso_date}}`, valores propios) que llegan a los widgets de los notebooks.
- **Reintentos**, **timeouts**, **notificaciones** (email, Slack, Teams, webhooks) y **condiciones** (`if/else`, `for each`).
- **Cómputo**: job clusters compartidos entre tareas, o serverless.

Pasar valores entre tareas: `dbutils.jobs.taskValues.set(key="filas", value=1200)` y en otra tarea `dbutils.jobs.taskValues.get(taskKey="bronze", key="filas")` (el “XCom” de Databricks).

## ¿Airflow o Databricks Workflows?

| Si… | Usa |
|---|---|
| Todo el pipeline vive en Databricks | Workflows (más simple, sin otra plataforma) |
| Orquestas muchos sistemas (ADF, APIs, Snowflake, Databricks, SaaS) | Airflow (o ADF) llamando a jobs de Databricks |
| Necesitas dependencias entre equipos y plataformas | Airflow con datasets / sensores |

## Monitoreo

- UI de **Job runs**: historial, duración, logs de cada tarea, reintentos.
- **System tables**: `system.lakeflow.job_run_timeline`, `system.billing.usage` para costos por job.
- **Alertas de Databricks SQL** sobre tablas de calidad (por ejemplo, “si hoy llegaron 0 pedidos, avisar”).

## Checklist de un lakehouse profesional

- [ ] Medallón: bronze (crudo, append), silver (limpio, deduplicado, MERGE), gold (negocio).
- [ ] Todo en **Unity Catalog**, con catálogos por entorno (`dev`, `prod`) y permisos por grupos.
- [ ] Código en **Git** + **Asset Bundles** + CI/CD; nada se edita a mano en producción.
- [ ] Jobs con job clusters o serverless, reintentos, timeouts y alertas.
- [ ] Ingesta incremental (Auto Loader, `MERGE`, CDF) e idempotente.
- [ ] Tests: unitarios (pytest) de transformaciones, tests de datos (dbt / expectations).
- [ ] Mantenimiento: Predictive Optimization u `OPTIMIZE`/`VACUUM` programados; Liquid Clustering.
- [ ] Secretos en Key Vault / secret scopes; acceso a datos con managed identities.
- [ ] Costos vigilados: auto-terminación, políticas de cómputo, tags y tablas de facturación.

:::ejercicio quiz
En un job, la tarea `bronze` calcula cuántas filas ingirió y la tarea `silver` necesita ese número. ¿Cómo se lo pasa?

- [ ] Con un archivo de texto en el escritorio
- [x] `dbutils.jobs.taskValues.set(...)` en bronze y `dbutils.jobs.taskValues.get(...)` en silver
- [ ] Con `print`
- [ ] No se puede
:::

:::ejercicio quiz
Todo tu pipeline (ingesta con Auto Loader, transformaciones, dbt y tableros) vive en Databricks. ¿Qué orquestador es la opción más simple?

- [x] Databricks Workflows (Lakeflow Jobs)
- [ ] Un cron en la laptop de alguien
- [ ] Airflow obligatoriamente
- [ ] Ninguno: se ejecuta todo a mano
:::

:::ejercicio abierto
Diseña (en texto o YAML) un job `ventas_diarias` con tres tareas: `ingesta` (notebook `src/ingesta`), `transformacion` (notebook `src/silver`, depende de `ingesta`) y `dbt_gold` (tarea dbt con `dbt build`, depende de `transformacion`), que corra a las 4:00 todos los días, con 2 reintentos por tarea y aviso por email al fallar.
```yaml solucion
resources:
  jobs:
    ventas_diarias:
      name: ventas_diarias
      schedule:
        quartz_cron_expression: "0 0 4 * * ?"
        timezone_id: UTC
      email_notifications:
        on_failure: [equipo-datos@empresa.com]
      tasks:
        - task_key: ingesta
          max_retries: 2
          notebook_task: { notebook_path: ../src/ingesta }
        - task_key: transformacion
          max_retries: 2
          depends_on: [{ task_key: ingesta }]
          notebook_task: { notebook_path: ../src/silver }
        - task_key: dbt_gold
          max_retries: 2
          depends_on: [{ task_key: transformacion }]
          dbt_task:
            commands: ["dbt deps", "dbt build"]
            project_directory: ../dbt
```
:::
