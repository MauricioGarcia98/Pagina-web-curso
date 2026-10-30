---
titulo: Orquestación y el concepto de DAG
nivel: Básico
duracion: 35
resumen: Qué problema resuelve un orquestador, qué es un DAG, el vocabulario básico, los componentes de Airflow 3 (Dag processor, scheduler, executor, API server, base de metadatos) y qué cambió respecto de Airflow 2.
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

## ¿Por qué no alcanza con cron?

Linux trae `cron`, que ejecuta comandos a una hora fija. Muchas empresas empezaron así… y se encontraron con estos problemas:

| Necesidad | cron | Airflow |
|---|---|---|
| Ejecutar a una hora | ✅ | ✅ |
| "B solo cuando A termina bien" | ❌ (adivinas horarios: "A tarda ~20 min, pongo B a las 2:30") | ✅ dependencias explícitas |
| Reintentar si falla | ❌ | ✅ `retries=3` |
| Ver qué falló, cuándo y por qué | ❌ (buscar en logs sueltos) | ✅ interfaz web con el historial y los logs de cada tarea |
| Reprocesar el martes pasado | ❌ (a mano) | ✅ cada ejecución sabe **qué día** procesa |
| Alertar si algo falla o tarda demasiado | ❌ | ✅ callbacks y *deadline alerts* |
| Paralelizar tareas independientes | ❌ | ✅ |

## Vocabulario básico

| Término | Qué es | Ejemplo |
|---|---|---|
| **DAG** | El flujo completo, definido en un archivo Python | `etl_ventas` |
| **Tarea** (*task*) | Un paso del DAG | `extraer_ventas` |
| **Operador** | La "plantilla" de una tarea: qué tipo de trabajo hace | `PythonOperator`, `BashOperator` |
| **DAG run** | **Una ejecución** del DAG, para un periodo concreto | "la ejecución del 15 de marzo" |
| **Task instance** | **Una ejecución de una tarea** dentro de un DAG run | "`extraer_ventas` del 15 de marzo" |

Cada task instance pasa por **estados**: `scheduled` → `queued` → `running` → `success` (o `failed`, `up_for_retry`, `skipped`, `upstream_failed`). En la interfaz web se ven como cuadraditos de colores: verde (éxito), rojo (falló), amarillo (reintentando), rosa (salteada). Gran parte del trabajo diario de un data engineer de guardia es mirar esa grilla y entender por qué algo está en rojo.

## Componentes de Airflow

Airflow no es un solo programa: son varios programas que trabajan juntos y se comunican a través de una base de datos. Saber qué hace cada uno es lo que te permite diagnosticar un problema ("el DAG no aparece" es un problema de una pieza distinta que "la tarea no arranca"). Esta es la arquitectura de **Airflow 3**, según la documentación oficial:

| Componente | Qué hace | ¿Obligatorio? |
|---|---|---|
| **Dag bundle** (la carpeta `dags/` o un repositorio Git) | Donde viven tus archivos `.py` con DAGs. Un *bundle* también guarda versiones, para que cada ejecución use el código con el que empezó | Sí |
| **Dag processor** | Lee (parsea) los archivos de DAGs cada cierto tiempo y guarda su definición en la base de metadatos. Si un archivo tiene un error de Python, aquí aparece el *import error* | Sí |
| **Scheduler** | Decide qué DAG runs crear y qué tareas ya pueden correr (sus dependencias terminaron), y se las pasa al **executor** | Sí |
| **Executor** | Una configuración del scheduler que define **dónde** corre cada tarea: en la misma máquina (`LocalExecutor`), en una cola de workers (`CeleryExecutor`) o en un pod de Kubernetes por tarea (`KubernetesExecutor`) | Sí (es parte del scheduler) |
| **Workers** | Las máquinas o procesos que ejecutan las tareas | Según el executor |
| **API server** | Sirve la interfaz web y la API REST. Las tareas también le reportan su estado a través de él, sin tocar la base directamente | Sí |
| **Base de metadatos** | Una base PostgreSQL o MySQL con el estado de todo: DAGs, ejecuciones, tareas, variables, conexiones | Sí |
| **Triggerer** | Espera eventos para las tareas *diferibles* (por ejemplo, "avísame cuando aparezca el archivo") sin ocupar un worker | Opcional |

El recorrido de una ejecución, paso a paso:

1. Guardas `ventas_diarias.py` en la carpeta de DAGs.
2. El **Dag processor** lo lee y registra el DAG en la base de metadatos. Si tiene un error, el DAG **no aparece** en la interfaz y se registra un error de importación.
3. Llega la hora programada: el **scheduler** crea un *DAG run* y marca como listas las tareas sin dependencias pendientes.
4. El **executor** envía cada tarea lista a un **worker**.
5. El worker ejecuta la tarea e informa el resultado (éxito, falla) al **API server**, que lo guarda en la base.
6. El scheduler ve que la tarea terminó y libera a las que dependían de ella. Así hasta el final.
7. Tú miras todo en la **interfaz web**: la grilla de colores, los logs de cada intento, y desde ahí relanzas lo que falló.

Formas de usarlo: instalarlo tú (`pip install apache-airflow`, `airflow standalone` para probar en tu computadora, Docker Compose, el *chart* de Helm en Kubernetes) o un servicio administrado que se ocupa de los servidores: **Astronomer**, **Google Cloud Composer**, **Amazon MWAA**, o **Apache Airflow Job** en Microsoft Fabric.

## Airflow 2 y Airflow 3: qué cambió

Airflow 3 salió en abril de 2025 y la versión estable hoy es la 3.3. Muchas empresas todavía usan Airflow 2, y la mayoría de los tutoriales de internet están escritos para Airflow 2, así que conviene reconocer las dos formas:

| Tema | Airflow 2 | Airflow 3 |
|---|---|---|
| Importar `DAG`, `@dag`, `@task` | `from airflow import DAG`, `from airflow.decorators import dag, task` | `from airflow.sdk import DAG, dag, task` |
| Operadores básicos | `from airflow.operators.bash import BashOperator` | `from airflow.providers.standard.operators.bash import BashOperator` (paquete `apache-airflow-providers-standard`) |
| Interfaz web | *Webserver* | *API server* (la interfaz es nueva, en React) |
| Leer los DAGs | Lo hacía el scheduler | Componente aparte: el *Dag processor* |
| Datos que disparan DAGs | `Dataset` | `Asset` |
| `catchup` por defecto | `True` | `False` |
| Fecha de la ejecución en plantillas | `execution_date` | `logical_date` (`execution_date` ya no existe) |
| Alertas por demora | `sla` | *Deadline alerts* |
| Sub-DAGs | `SubDagOperator` (obsoleto) | Eliminado: se usan `TaskGroup` |

Las rutas viejas de importación siguen funcionando en Airflow 3 con un aviso de obsoleto, pero se van a eliminar. En este curso escribimos con la sintaxis de Airflow 3 y mostramos la de Airflow 2 cuando la vas a encontrar en proyectos existentes.

:::nota Alternativas
**Lakeflow Jobs** (antes Databricks Workflows) orquesta tareas dentro de Databricks (notebooks, dbt, SQL) y muchas empresas lo usan en lugar de Airflow si todo vive en Databricks. Otras: **Dagster**, **Prefect**, **Azure Data Factory**. Los conceptos (tareas, dependencias, reintentos, programación) son los mismos.
:::

:::nota Cómo practicamos Airflow aquí
Tus DAGs se ejecutan en **mini-Airflow**, un simulador que acepta la sintaxis de Airflow 3 (`from airflow.sdk import ...`, el provider estándar, `Asset`) y también la de Airflow 2: `DAG`, operadores, `>>`, XCom, TaskFlow (`@dag`, `@task`), ramas, trigger rules y `TaskGroup`. El corrector inspecciona el DAG que creaste (tareas, dependencias, programación) y puede "ejecutarlo" con `dag.test()`, que es también como se prueba un DAG en Airflow real sin scheduler.
:::

<!-- dg:af01-componentes -->
```diagrama
titulo: Los componentes de Airflow 3 y cómo se comunican
nodo dags: Dag bundle | icono=codigo | col=0 | fila=0 | sub=archivos .py (en Git)
nodo dp: Dag processor | icono=engranaje | col=1 | fila=0 | color=violeta | sub=lee y valida los DAGs
nodo meta: Base de metadatos | icono=base | col=2 | fila=1 | forma=cilindro | color=gris | sub=estados, historial
nodo sch: Scheduler + executor | icono=reloj | col=2 | fila=0 | color=violeta | sub=decide qué corre
nodo w: Workers | icono=servidor | col=3 | fila=0 | color=naranja | sub=ejecutan las tareas
nodo api: API server + interfaz | icono=web | col=1 | fila=1 | color=azul | sub=ver, relanzar, logs
nodo ext: Sistemas externos | icono=nube | col=4 | fila=0 | sub=Spark, dbt, bases, APIs
flecha dags -> dp: parsea
flecha dp -> meta: guarda los DAGs
flecha sch <-> meta
flecha sch -> w: envía tareas
flecha w -> api: reporta estado | estilo=punteada
flecha api <-> meta
flecha w -> ext: dispara trabajo
```

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

:::ejercicio quiz dificultad=Intermedio
Guardaste un DAG nuevo en la carpeta de DAGs y no aparece en la interfaz. ¿Qué componente revisas primero?

- [ ] El worker
- [x] El Dag processor: es el que lee los archivos, y si hay un error de Python registra un error de importación y el DAG no se carga
- [ ] El triggerer
- [ ] La API de Databricks
:::

:::ejercicio quiz dificultad=Básico
En Airflow 3, ¿de dónde se importan `DAG`, `dag` y `task`?

- [ ] `airflow.decorators`
- [x] `airflow.sdk`
- [ ] `airflow.models`
- [ ] `airflow.core`
:::

:::ejercicio quiz dificultad=Intermedio
¿Qué decide el **executor**?

- [ ] A qué hora corre el DAG
- [x] Dónde y cómo se ejecuta cada tarea: en la misma máquina, en una cola de workers o en un pod de Kubernetes
- [ ] Qué usuario puede ver la interfaz
- [ ] El orden de las tareas
:::
