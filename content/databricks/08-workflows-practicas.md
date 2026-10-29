---
titulo: Workflows (Jobs), monitoreo y buenas prácticas
nivel: Experto
duracion: 45
resumen: Jobs multi-tarea, parámetros, reintentos, alertas, costos y la checklist de un lakehouse bien hecho.
---

Ya tienes notebooks que leen bronze, limpian a silver y calculan gold. Falta que corran **solos**, todas las noches, en el orden correcto, con reintentos y con alguien que se entere si algo falla. Eso son los **Jobs** de Databricks (hoy llamados **Lakeflow Jobs**, y antes **Workflows**). Esta lección explica cómo se arman, cómo se pasan datos entre tareas, cómo se monitorean y cierra el módulo con la checklist de un lakehouse profesional.

## Lakeflow Jobs (Workflows)

Un **job** de Databricks es un DAG de **tareas**, igual que un DAG de Airflow, pero dentro de Databricks. Cada tarea puede ser:

| Tipo de tarea | Qué ejecuta |
|---|---|
| Notebook | Un notebook (Python, SQL o Scala) |
| Python script / wheel | Un archivo `.py` o un paquete instalado |
| SQL | Una consulta o un archivo `.sql` en un SQL warehouse |
| dbt | `dbt build` sobre el proyecto, en un SQL warehouse |
| Pipeline | Un pipeline declarativo (Lakeflow Spark Declarative Pipelines, antes DLT) |
| Run Job | Otro job completo |
| If/else, For each | Condiciones y bucles sobre parámetros o resultados |

Un job tiene:

- **Disparadores** (*triggers*): cron ("todos los días a las 3:00"), llegada de archivos (*file arrival*: arranca cuando aparece un archivo en un volumen o un bucket), actualización de una tabla, modo continuo o manual.
- **Parámetros de job**: valores propios (`fecha`, `pais`) y valores dinámicos como `{{job.start_time.iso_date}}`, que llegan a los widgets de los notebooks.
- **Reintentos**, **timeouts**, **notificaciones** (email, Slack, Teams, webhooks) y **condiciones** (`if/else`, `for each`).
- **Cómputo**: un *job cluster* que comparten las tareas (se crea al empezar y se borra al terminar) o **serverless**.

### Cómo se define un job

Se puede crear con clics en la interfaz, pero en un equipo profesional se define como **código**: en un Asset Bundle (lo viste en la lección de CLI) o en un JSON. Este job tiene cuatro tareas: bronze, después silver, y después dos gold en paralelo:

```json
{
  "name": "lakehouse_diario",
  "parameters": [{ "name": "fecha", "default": "2024-12-31" }],
  "schedule": { "quartz_cron_expression": "0 0 3 * * ?", "timezone_id": "America/Santiago" },
  "email_notifications": { "on_failure": ["datos@tiendaandina.com"] },
  "tasks": [
    { "task_key": "bronze",
      "notebook_task": { "notebook_path": "/Repos/datos/pipelines/bronze" } },
    { "task_key": "silver", "depends_on": [{ "task_key": "bronze" }],
      "notebook_task": { "notebook_path": "/Repos/datos/pipelines/silver" },
      "max_retries": 2, "min_retry_interval_millis": 600000 },
    { "task_key": "gold_ventas", "depends_on": [{ "task_key": "silver" }],
      "notebook_task": { "notebook_path": "/Repos/datos/pipelines/gold_ventas" } },
    { "task_key": "gold_clientes", "depends_on": [{ "task_key": "silver" }],
      "notebook_task": { "notebook_path": "/Repos/datos/pipelines/gold_clientes" } }
  ]
}
```

Cómo leerlo:

- **`task_key`** es el nombre de la tarea dentro del job. Tiene que ser único.
- **`depends_on`** dice qué tareas tienen que terminar antes. Así se arma el DAG: `gold_ventas` y `gold_clientes` dependen de `silver`, así que corren **en paralelo** cuando silver termina.
- **`parameters`** define el parámetro `fecha` con un valor por defecto. Al lanzar el job a mano puedes cambiarlo (por ejemplo, para reprocesar un día).
- **`schedule`** usa formato *Quartz cron*, que tiene un campo más que el cron de Airflow: los **segundos**. `0 0 3 * * ?` es "segundo 0, minuto 0, hora 3, todos los días".
- **`max_retries`** y **`min_retry_interval_millis`**: silver se reintenta hasta 2 veces, esperando 10 minutos entre intentos.

### Leer los parámetros en el notebook

En cada notebook, el parámetro llega como un **widget**:

```python norun
fecha = dbutils.widgets.get("fecha")             # "2024-12-31"
df = spark.read.table("bronze.pedidos").where(f"fecha_ingesta = '{fecha}'")
```

### Pasar valores entre tareas

A veces una tarea necesita un dato de la anterior, por ejemplo cuántas filas cargó bronze, para saltarse silver si llegaron 0. Para eso están los **task values** (el "XCom" de Databricks):

```python norun
# En el notebook de la tarea "bronze"
dbutils.jobs.taskValues.set(key="filas", value=1200)

# En una tarea posterior
filas = dbutils.jobs.taskValues.get(taskKey="bronze", key="filas", default=0)
```

También se pueden usar en una tarea **If/else**: `{{tasks.bronze.values.filas}} > 0`. Como con XCom en Airflow, sirven para valores **chicos** (números, textos, rutas), no para datos.

## Laboratorio: un job de cuatro tareas en la terminal

Abre la terminal (⌨ Terminal) y conéctate al workspace simulado:

```bash norun
databricks auth login --host https://adb-1234567890123456.7.azuredatabricks.net
code job.json
```

En el editor, pega este JSON (es el de arriba, más corto) y guarda:

```json
{"name": "lakehouse_diario",
 "parameters": [{"name": "fecha", "default": "2024-12-31"}],
 "tasks": [
   {"task_key": "bronze"},
   {"task_key": "silver", "depends_on": [{"task_key": "bronze"}]},
   {"task_key": "gold_ventas", "depends_on": [{"task_key": "silver"}]},
   {"task_key": "gold_clientes", "depends_on": [{"task_key": "silver"}]}
 ]}
```

Ahora crea el job, guarda su id en una variable y ejecútalo:

```bash norun
databricks jobs create --json @job.json
JOB=$(databricks jobs list | grep lakehouse_diario | cut -d" " -f1)
databricks jobs run-now $JOB
databricks jobs run-now $JOB --json '{"job_parameters": {"fecha": "2024-12-30"}}'
databricks jobs list-runs --job-id $JOB
```

En `run-now` vas a ver las tareas en el orden del DAG: bronze, silver y después las dos gold, con los parámetros que recibió el job. La segunda ejecución **reprocesa el 30 de diciembre** sin tocar el código: así se arregla un día que salió mal.

Prueba también romperlo a propósito: cambia en `job.json` la dependencia de `gold_ventas` a `"silverr"` y vuelve a ejecutar `databricks jobs create --json @job.json`. Databricks rechaza el job porque la tarea de la que depende no existe.

## ¿Airflow o Lakeflow Jobs (antes Databricks Workflows)?

| Si… | Usa |
|---|---|
| Todo el pipeline vive en Databricks | Workflows (más simple, sin otra plataforma) |
| Orquestas muchos sistemas (ADF, APIs, Snowflake, Databricks, SaaS) | Airflow (o ADF) llamando a jobs de Databricks |
| Necesitas dependencias entre equipos y plataformas | Airflow con datasets / sensores |

No es uno o el otro: es muy común que **Airflow dispare un job de Databricks** con `DatabricksRunNowOperator` (lo viste en el módulo de Airflow), y que ese job tenga varias tareas adentro. Airflow coordina la empresa y el job coordina lo de Databricks.

## Monitoreo

Un job que nadie mira es un job que falla en silencio. Los tres niveles de monitoreo son:

1. **La UI de Job runs**: el historial de ejecuciones, en una matriz de colores (verde, rojo, gris). Para cada ejecución ves la duración y los logs de cada tarea, cuántos reintentos hizo y con qué parámetros corrió. Si una tarea falló, puedes usar **Repair run**, que vuelve a ejecutar **solo** las tareas que fallaron y las que dependen de ellas, sin repetir lo que ya salió bien.
2. **System tables**: tablas que Databricks llena solo, consultables con SQL:
   - `system.lakeflow.job_run_timeline`: cada ejecución con inicio, fin y resultado.
   - `system.billing.usage`: lo que consumió cada job, para saber **cuánto cuesta**.
3. **Alertas sobre los datos**: que el job termine en verde no significa que los datos estén bien. Una **alerta de Databricks SQL** sobre una consulta de calidad avisa cuando algo no cuadra.

```sql norun
-- ¿Qué jobs fallaron en los últimos 7 días?
SELECT job_id, run_id, period_start_time, result_state
FROM system.lakeflow.job_run_timeline
WHERE result_state = 'FAILED' AND period_start_time >= current_date() - 7;

-- Alerta: si hoy llegaron 0 pedidos, algo pasó en la ingesta (aunque el job esté en verde)
SELECT count(*) AS pedidos_hoy FROM silver.pedidos WHERE fecha_pedido = current_date() - 1;
```

## Checklist de un lakehouse profesional

Es el resumen de todo el módulo. Si tu proyecto cumple estos puntos, está al nivel de un equipo de datos profesional:

- [ ] Medallón: bronze (crudo, append), silver (limpio, deduplicado, MERGE), gold (negocio).
- [ ] Todo en **Unity Catalog**, con catálogos por entorno (`dev`, `prod`) y permisos por grupos.
- [ ] Código en **Git** + **Declarative Automation Bundles** (antes Asset Bundles) + CI/CD; nada se edita a mano en producción.
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

- [x] Lakeflow Jobs (antes Databricks Workflows)
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
