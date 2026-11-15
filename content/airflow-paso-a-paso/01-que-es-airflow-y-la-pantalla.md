---
titulo: Qué es Apache Airflow y cómo es su pantalla
nivel: 1 · Básico
duracion: 30
resumen: Airflow es el orquestador de tareas de datos más usado - decide qué corre, en qué orden, cuándo y qué pasa si algo falla. Qué problema resuelve, sus piezas (Dag, tarea, scheduler, dag processor, base de metadatos), cada zona de la pantalla de Airflow 3 y qué puedes practicar en la réplica.
objetivos: Explicar qué es un orquestador y qué problema resuelve Airflow | Nombrar las piezas de Airflow 3 y qué hace cada una | Ubicar la navegación, los indicadores y la salud de los componentes | Saber qué es real y qué es simulado en la práctica
prerrequisitos: fundamentos-bienvenida
autoevaluacion: ¿Sabes qué es un Dag? | ¿Sabes qué hace el scheduler? | ¿Sabes dónde ver si hay errores al cargar los Dags? | ¿Sabes qué hay en Browse y en Admin?
---

:::analogia En palabras simples
Airflow es el **director de orquesta** de los procesos de datos. No toca ningún instrumento (no guarda datos ni los transforma él mismo): le dice a cada músico cuándo entrar - "primero descarga las ventas, después límpialas, después avisa" - y, si alguien se equivoca, lo hace repetir o avisa al resto.
:::

## Paso 1 — El problema que resuelve

El equipo de datos de **Tienda Andina** tiene varios scripts: uno descarga las ventas, otro las limpia, otro arma el reporte. Hoy los corre una persona a mano cada mañana. Cuando falla uno, nadie se entera hasta que el gerente pregunta por qué el reporte está vacío.

Un **orquestador** resuelve eso:

| Sin orquestador | Con Airflow |
|---|---|
| Alguien corre los scripts a mano | Corren solos a la hora definida |
| El orden vive en la cabeza de una persona | El orden está escrito en código |
| Si falla, nadie se entera | Reintenta, registra el error y puede avisar |
| No hay historia | Cada corrida queda con su estado, duración y log |

## Paso 2 — Las piezas

| Pieza | Qué es |
|---|---|
| **Dag** | Un flujo de trabajo: tareas y el orden entre ellas, escrito en Python. Viene de *Directed Acyclic Graph* (grafo dirigido sin ciclos) |
| **Tarea (task)** | Un paso del Dag: correr un comando, una función de Python, una consulta |
| **Dag run** | Una ejecución del Dag para una fecha |
| **Scheduler** | Decide qué corridas y tareas tienen que arrancar |
| **Dag processor** | Lee los archivos `.py` de la carpeta de Dags y los convierte en Dags |
| **API server** | Sirve la interfaz web y la API (en Airflow 3 reemplaza al antiguo *webserver*) |
| **Base de metadatos** | Guarda Dags, corridas, estados, variables y conexiones |
| **Executor y workers** | Ejecutan las tareas |

## Paso 3 — La pantalla de inicio

Abre el [Airflow de práctica](#/airflow):

```captura
archivo: airflow/a01-home.webp
texto: Home - la navegación (1), los indicadores de Dags (2) y la salud de los componentes (3)
```

| Zona | Qué muestra |
|---|---|
| **Indicadores** | Dags que fallaron, errores al importar archivos, Dags corriendo y Dags activos |
| **Health** | Si la base de metadatos, el scheduler, el triggerer y el dag processor están vivos |
| **Pool Slots** | Cuántas tareas pueden correr a la vez y cuántas lo están haciendo |
| **History** | Corridas y tareas de las últimas 24 horas por estado |
| **Asset Events** | Los últimos datos que se actualizaron (lo ves en el nivel 4) |

El indicador **Dag Import Errors** ya marca 1: uno de los archivos de ejemplo tiene un error a propósito. Lo arreglas en el nivel 5.

## Paso 4 — Browse y Admin

```captura
archivo: airflow/a01-browse.webp
texto: Browse - Dag Runs, Task Instances, Audit Log y XComs
```

```captura
archivo: airflow/a01-admin.webp
texto: Admin - Variables, Pools, Providers, Plugins, Connections y Config
```

| Menú | Para qué |
|---|---|
| **Dags** | La lista de flujos (la usas todo el tiempo) |
| **Assets** | Los datos que producen y esperan los Dags |
| **Browse** | Buscar corridas, tareas, eventos de auditoría y valores intercambiados |
| **Admin** | Configurar variables, conexiones, pools y ver los providers instalados |

## Paso 5 — Qué es real en la práctica

| Real | Simulado |
|---|---|
| Los Dags son archivos Python que escribes en `~/airflow/dags` desde la terminal | No hay procesos de servidor: el scheduler y el dag processor corren en tu navegador |
| El código se analiza con Python de verdad y los errores son los de Python | Las tareas que llaman a servicios externos (S3, BigQuery) registran lo que harían |
| La interfaz, los estados, los logs y la CLI `airflow` son los de Airflow 3 | Los tiempos están acelerados |

:::tip Volver al curso
El botón **Volver a Herramientas** arriba a la izquierda te trae de vuelta. Lo que hagas en la práctica se guarda en tu navegador.
:::

## ✅ Lo que lograste

- Sabes qué problema resuelve un orquestador.
- Conoces las piezas de Airflow 3.
- Ubicas cada zona de la pantalla.

:::ejercicio quiz
¿Qué hace Airflow?
- [ ] Guarda los datos de la empresa
- [x] Decide qué tareas corren, en qué orden y cuándo, y qué pasa si fallan
- [ ] Reemplaza a Python
- [ ] Hace los gráficos del reporte
:::

:::ejercicio quiz
¿Qué componente lee los archivos .py de la carpeta de Dags?
- [ ] El executor
- [x] El dag processor
- [ ] La base de metadatos
- [ ] El navegador
:::

:::ejercicio quiz
¿Dónde ves si un archivo de Dag tiene un error al cargarse?
- [x] En el indicador Dag Import Errors
- [ ] En Pool Slots
- [ ] En Admin → Plugins
- [ ] No se puede ver
:::

:::ejercicio quiz
¿En qué menú están las Variables y las Connections?
- [ ] Browse
- [ ] Assets
- [x] Admin
- [ ] Dags
:::
