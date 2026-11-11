---
titulo: Airflow por dentro - la interfaz web de Airflow 3 pantalla por pantalla
nivel: Intermedio
duracion: 40
resumen: Recorrido por la interfaz de Apache Airflow 3 - Home, la lista de DAGs, la vista de un DAG con Grid, Graph y Code, el log de cada intento, Trigger con parámetros, Clear y backfill, assets, Browse y Admin (variables, conexiones, pools). Con el flujo de arreglar una tarea que falló.
objetivos: Ubicar cada sección de la interfaz de Airflow 3 y para qué sirve | Leer la Grid de un DAG y encontrar la tarea que falló | Abrir el log de un intento, corregir el DAG y volver a correrlo con Clear | Disparar un DAG con parámetros y entender un backfill | Usar variables, conexiones y assets desde la interfaz
prerrequisitos: airflow-primer-dag
autoevaluacion: ¿Sabes por qué un DAG nuevo no corre aunque esté bien escrito? | ¿Sabes qué significa cada color de la Grid? | ¿Sabes qué hace Clear sobre una tarea fallida? | ¿Sabes dónde aparece un DAG que tiene un error de sintaxis? | ¿Sabes dónde se guarda una contraseña para que no esté en el código?
---

:::tip Practícalo mientras lees
Abre [Airflow de práctica](#/airflow). Lee los DAGs de la carpeta `~/airflow/dags` de la terminal del curso (botón **Terminal** abajo a la izquierda) y los ejecuta con el mini-Airflow de Python: si editas un archivo, la interfaz lo vuelve a analizar.
:::

:::analogia En palabras simples
Si un DAG es la receta, la interfaz de Airflow es la cocina vista desde arriba: ves qué recetas hay, cuáles se están cocinando, qué paso salió mal y en qué intento, y puedes volver a cocinar solo ese paso sin empezar de cero.
:::

## Las piezas de Airflow

La interfaz es solo una parte. Detrás hay varios procesos:

| Proceso | Qué hace |
|---|---|
| **DAG processor** | Lee los archivos `.py` de la carpeta de DAGs y detecta errores |
| **Scheduler** | Decide qué corridas y tareas tocan, según el horario y las dependencias |
| **Executor / workers** | Ejecutan las tareas |
| **API server** | Sirve la interfaz web y la API REST |
| **Base de metadatos** | Guarda corridas, estados, variables, conexiones y logs |

En la réplica no hay procesos reales: todo corre en tu navegador, pero la pantalla **Home** muestra el estado de cada pieza como en Airflow.

## La barra lateral

| Sección | Para qué sirve |
|---|---|
| **Home** | Resumen: DAGs fallidos, errores de importación, corridas activas y salud de los procesos |
| **Dags** | La lista de DAGs, con su horario, última corrida y el interruptor de pausa |
| **Assets** | Los datos que producen y consumen los DAGs (programación por datos) |
| **Browse** | Dag Runs, Task Instances, Audit Log y XComs de todos los DAGs |
| **Admin** | Variables, Pools, Providers, Plugins, Connections y Config |

## La lista de DAGs

Cada fila muestra el **dag_id**, las **etiquetas**, el **horario** (`@daily`, un cron, o un asset), la **próxima corrida** y el resultado de las últimas. A la izquierda está el **interruptor de pausa**.

Por defecto, los DAGs nuevos están **pausados** (`dags_are_paused_at_creation = True`): aunque el archivo esté perfecto, no corre hasta que lo despausas. Es la primera causa de "mi DAG no hace nada".

Si un archivo tiene un error (de sintaxis, un `import` que falla, un ciclo entre tareas), el DAG **no aparece en la lista**: aparece en **Dag Import Errors**, con el archivo y la traza. En la réplica, `avisos_slack.py` falla a propósito porque le falta un provider: ábrelo y lee el error.

## La vista de un DAG

Al entrar a un DAG hay varias pestañas:

- **Grid**: una columna por corrida y una fila por tarea. Cada cuadro es una **task instance** con el color de su estado. Es la vista para encontrar qué falló y cuándo.
- **Graph**: las tareas y sus dependencias como diagrama. Sirve para entender el orden.
- **Code**: el código del archivo, tal como lo leyó Airflow.
- **Details**: configuración del DAG (horario, `start_date`, `catchup`, dueño, reintentos por defecto).

Colores de estado más comunes:

| Estado | Significa |
|---|---|
| **success** (verde) | Terminó bien |
| **failed** (rojo) | Falló después de agotar los reintentos |
| **running** (verde claro) | Se está ejecutando |
| **queued** / **scheduled** | Esperando un worker o su turno |
| **up_for_retry** (amarillo) | Falló y se va a reintentar |
| **upstream_failed** (naranja) | No corrió porque falló una tarea anterior |
| **skipped** (rosa) | Se saltó (por ejemplo, por una rama no elegida) |

## El log de una tarea

Haz clic en un cuadro de la Grid y luego en **Logs**. Cada **intento** (*try*) tiene su propio log: si la tarea tiene `retries=2`, verás hasta tres. El error real suele estar al final, en la traza de Python. Al lado están **XCom** (los valores que la tarea devolvió) y **Details** (inicio, fin, duración, operador).

## Volver a correr: Clear, Trigger y backfill

- **Clear** sobre una tarea fallida borra su estado y el scheduler la vuelve a ejecutar (y, si eliges *downstream*, también las que dependen de ella). Es lo que se hace después de arreglar el problema: no hace falta correr todo el DAG de nuevo.
- **Trigger** dispara una corrida manual ahora. Si el DAG tiene `params`, aparece un formulario para completarlos.
- **Backfill** crea corridas para un rango de fechas pasadas (por ejemplo, para recalcular una semana después de corregir un error). Respeta `max_active_runs`.
- **Mark as success / failed** cambia el estado sin ejecutar: úsalo con cuidado, porque oculta lo que pasó.

## Assets: programar por datos

Un DAG puede declarar que produce un **asset** (por ejemplo `Asset("s3://lago/ventas_diarias")`) y otro puede programarse con `schedule=[ese_asset]`. Cuando el primero termina bien, el segundo arranca solo. En **Assets** ves cada asset, quién lo produce, quién lo consume y sus eventos. En la réplica, `ventas_diarias` actualiza un asset que dispara `reporte_ventas`.

## Admin: variables, conexiones y pools

- **Variables**: pares clave-valor para configuración (`ambiente = prod`). En el código: `Variable.get("ambiente")`.
- **Connections**: datos de acceso a sistemas externos (host, usuario, contraseña, extra en JSON), identificados por un `conn_id`. Así las contraseñas no quedan en el código del DAG.
- **Pools**: limitan cuántas tareas corren a la vez contra un recurso (por ejemplo, 2 consultas simultáneas a una base frágil).

Todo esto también se maneja desde la terminal con `airflow variables`, `airflow connections` y `airflow pools`.

## Un flujo completo: arreglar una tarea que falló

1. En **Dags**, despausa `conciliacion_pagos` y dispárala con **Trigger**.
2. En la **Grid**, una tarea queda en rojo y las siguientes en naranja (`upstream_failed`).
3. Abre el **log** del último intento y lee la traza: dice qué línea falló.
4. En la terminal, corrige el archivo en `~/airflow/dags/` (con `nano` o `vim`).
5. Vuelve a la tarea y haz **Clear** con *downstream*.
6. La tarea y las siguientes pasan a verde.

## Qué tiene la réplica y qué no

| En la réplica | Todavía no |
|---|---|
| Home, lista de DAGs con pausa, Grid, Graph, Code y Details | Gantt y Calendar detallados |
| Logs por intento, XCom, Clear, Mark as, Trigger con params y backfill | Ejecución distribuida real (Celery, Kubernetes) |
| Assets con programación por datos | Deferrable operators y triggerer real |
| Variables, Connections, Pools, Config, Audit Log y la CLI `airflow` | Autenticación y roles de usuario |

:::ejercicio quiz
Escribiste un DAG nuevo sin errores, aparece en la lista, pero nunca corre. ¿Qué revisas primero?
- [ ] Que el archivo tenga extensión `.txt`
- [x] Que no esté pausado: los DAGs nuevos empiezan pausados
- [ ] Que el scheduler tenga más memoria
- [ ] Que tenga una conexión creada
:::

:::ejercicio quiz
Tu archivo `ventas.py` no aparece en la lista de DAGs. ¿Dónde buscas?
- [ ] En Admin → Pools
- [ ] En el log de la última tarea
- [x] En **Dag Import Errors**, que muestra el archivo y el error de Python
- [ ] En Assets
:::

:::ejercicio quiz
La tarea `cargar` falló por un error que ya corregiste en el código. ¿Cómo la vuelves a correr sin repetir las tareas que ya terminaron bien?
- [ ] Borro el DAG y lo creo de nuevo
- [x] **Clear** sobre esa tarea (con *downstream* para las que dependen de ella)
- [ ] **Mark as success** sobre la tarea
- [ ] Disparo un backfill de todo el año
:::

:::ejercicio quiz
En la Grid, varias tareas aparecen en naranja con el estado `upstream_failed`. ¿Qué significa?
- [ ] Que están corriendo más lento de lo normal
- [ ] Que se van a reintentar
- [x] Que no corrieron porque falló una tarea anterior de la que dependen
- [ ] Que terminaron bien pero con avisos
:::

:::ejercicio quiz
Un DAG necesita la contraseña de una base de datos. ¿Dónde se guarda?
- [ ] En una variable de Python al principio del archivo
- [x] En una **Connection** de Admin, y el DAG la usa por su `conn_id`
- [ ] En el nombre de la tarea
- [ ] En un comentario del DAG
:::
