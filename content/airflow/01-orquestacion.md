---
titulo: Orquestación y el concepto de DAG
nivel: Básico
duracion: 20
resumen: Qué problema resuelve Airflow, qué es un DAG y los componentes de la plataforma.
---

Imagina un pipeline diario: a las 2:00 descargar ventas, a las 2:30 limpiarlas con Spark, después correr `dbt build`, y si todo salió bien, actualizar el tablero y avisar por Slack. ¿Qué pasa si la descarga falla? ¿Y si tarda más de lo normal? ¿Cómo reprocesas el martes pasado?

Ese es el trabajo de un **orquestador**. **Apache Airflow** (creado en Airbnb en 2014) es el más usado del mundo.

:::analogia El director de orquesta
Airflow no toca ningún instrumento: no procesa datos él mismo. Le indica a cada músico (Spark, dbt, una API, un script) **cuándo** entrar, en qué **orden**, y qué hacer si alguien se equivoca.
:::

## DAG: Directed Acyclic Graph

Un **DAG** (grafo dirigido acíclico) es el conjunto de **tareas** con sus **dependencias**:

```text
extraer_ventas ──┐
                 ├──▶ transformar ──▶ dbt_build ──▶ notificar
extraer_clientes ┘
```

- **Dirigido**: las flechas tienen sentido (A antes que B).
- **Acíclico**: no hay ciclos (B no puede depender de A si A depende de B).
- En Airflow, **un DAG se escribe en un archivo Python**.

## Componentes de Airflow

| Componente | Qué hace |
|---|---|
| **Scheduler** | Lee los DAGs, decide qué tareas deben ejecutarse y las encola |
| **Executor / workers** | Ejecutan las tareas (Local, Celery, Kubernetes…) |
| **Webserver / UI** | Interfaz web para ver ejecuciones, logs, reintentar tareas |
| **Metadata DB** | Base de datos (PostgreSQL) con el estado de todo |
| **Carpeta `dags/`** | Donde pones tus archivos `.py` con DAGs |

Formas de usarlo: instalarlo tú (`pip install apache-airflow`, Docker Compose, Helm en Kubernetes) o un servicio administrado: **Astronomer**, **Google Cloud Composer**, **Amazon MWAA**, o **Azure Data Factory Workflow Orchestration Manager**.

:::nota Alternativas
**Databricks Workflows (Lakeflow Jobs)** orquesta tareas dentro de Databricks (notebooks, dbt, SQL) y muchas empresas lo usan en lugar de Airflow si todo vive en Databricks. Otras: **Dagster**, **Prefect**, **Azure Data Factory**. Los conceptos (tareas, dependencias, reintentos, programación) son los mismos.
:::

:::nota Cómo practicamos Airflow aquí
Tus DAGs se ejecutan en **mini-Airflow**, un simulador con la misma API que Airflow 2.x: `DAG`, operadores, `>>`, XCom, TaskFlow (`@dag`, `@task`), ramas, trigger rules y `TaskGroup`. El corrector inspecciona el DAG que creaste (tareas, dependencias, programación) y puede “ejecutarlo” con `dag.test()`.
:::

:::ejercicio quiz
¿Por qué un DAG no puede tener ciclos?

- [ ] Porque Python no lo permite
- [x] Porque si A depende de B y B de A, ninguna podría empezar nunca
- [ ] Porque Airflow solo admite 10 tareas
- [ ] Sí puede tener ciclos
:::

:::ejercicio quiz
¿Qué componente de Airflow decide **cuándo** debe ejecutarse cada tarea?

- [ ] El webserver
- [x] El scheduler
- [ ] La metadata DB
- [ ] dbt
:::
