---
titulo: Qué es Databricks y cómo es el workspace
nivel: 1 · Básico
duracion: 30
resumen: Databricks es la plataforma donde los equipos de datos guardan, transforman, analizan y modelan datos a gran escala. Qué es un lakehouse, qué es un workspace, qué hay en cada parte de la pantalla (barra superior, menú lateral, área de trabajo, botón New) y qué puedes hacer en el Databricks de práctica, que corre en tu navegador sin cuenta ni costo.
objetivos: Explicar qué es Databricks y qué problema resuelve | Reconocer las zonas de la pantalla del workspace | Ubicar cada sección del menú lateral y para qué sirve | Saber qué hace el botón New | Entender qué es real y qué es simulado en la práctica
prerrequisitos: fundamentos-bienvenida
autoevaluacion: ¿Sabes qué es un lakehouse en una frase? | ¿Sabes dónde están los notebooks, los datos y el cómputo en el menú? | ¿Sabes qué crea el botón New? | ¿Sabes qué pasa con tus datos al cerrar el navegador de la práctica?
---

:::analogia En palabras simples
Imagina una fábrica de datos. Databricks es el edificio completo: el depósito donde llegan los datos (el *lakehouse*), las máquinas que los procesan (el **cómputo**), los cuadernos donde los ingenieros escriben las recetas (los **notebooks**), el catálogo que dice qué hay en cada estante y quién puede tocarlo (**Unity Catalog**) y la sala de tableros para los directores (**dashboards**). El **workspace** es la puerta por la que entras a todo eso.
:::

## Paso 1 — Qué es Databricks

Databricks es una plataforma en la nube (Azure, AWS o Google Cloud) para trabajar con datos de cualquier tamaño:

| Necesitas | En Databricks |
|---|---|
| Guardar millones de filas y consultarlas rápido | Tablas **Delta** sobre el almacenamiento de tu nube |
| Transformar datos con SQL o Python | **Notebooks** y el **editor SQL** sobre Spark |
| Que algo corra todos los días a las 6 | **Jobs** y **pipelines** |
| Saber qué tabla es cuál y quién la puede ver | **Unity Catalog** |
| Tableros y preguntas en lenguaje natural | **Dashboards** y **Genie** |
| Entrenar y registrar modelos | **MLflow** |

La palabra **lakehouse** resume la idea: la flexibilidad de un *data lake* (archivos en tu nube, baratos, de cualquier tipo) con el orden de un *data warehouse* (tablas, transacciones, permisos, rendimiento).

## Paso 2 — La pantalla

Abre el [Databricks de práctica](#/databricks):

```captura
archivo: databricks/d01-pantalla.webp
texto: El inicio del workspace de práctica
```

```captura
archivo: databricks/d01-zonas.webp
texto: Las cuatro zonas - barra superior (1), menú lateral (2), área de trabajo (3) y el botón New (4)
```

| Zona | Qué tiene |
|---|---|
| **1. Barra superior** | El buscador (**Ctrl P**: tablas, notebooks, jobs, recientes), el selector de workspace (`academia-dev`), la ayuda y tu usuario con **Settings** |
| **2. Menú lateral** | Las secciones del producto; el botón ☰ lo pliega para ganar espacio |
| **3. Área de trabajo** | Lo que estés haciendo: un notebook, una tabla, un job… |
| **4. New** | Crear cualquier cosa desde cualquier lugar |

## Paso 3 — El menú lateral

| Sección | Elementos | Para qué |
|---|---|---|
| *(arriba)* | **Workspace**, **Recents**, **Catalog**, **Jobs & Pipelines**, **Compute** | Lo de todos los días: archivos, datos, orquestación y máquinas |
| **Lakehouse** | **SQL Editor**, **Queries**, **Query History**, **SQL Warehouses** | Trabajar con SQL |
| **Analytics** | **Dashboards**, **Genie Agents**, **Alerts** | Analítica para el negocio |
| **Data Engineering** | **Runs**, **Data Ingestion** | Ejecuciones y asistentes para cargar datos |
| **AI/ML** | **Playground**, **Agents**, **AI Gateway**, **Experiments**, **Features**, **Models**, **Serving** | Modelos de lenguaje, agentes y MLflow |

Al final del menú, **Volver al curso** te trae de regreso a esta lección.

## Paso 4 — El botón New

```captura
archivo: databricks/d01-nuevo.webp
texto: Todo lo que se puede crear desde New - notebook, consulta, dashboard, Genie Agent, alerta, job, pipeline, compute, SQL warehouse, datos y catálogo
```

Es el atajo más usado: en lugar de ir a cada sección, **New → Notebook** crea un notebook en tu carpeta personal, **New → Job** abre un job vacío, etc.

## Paso 5 — Qué es real y qué es simulado en la práctica

| Real | Simulado |
|---|---|
| El SQL: corre de verdad sobre las bases del curso (catálogo `samples`) y sobre lo que crees en `main` | No hay máquinas: Python y Spark corren en tu navegador con un Spark reducido |
| Las pantallas, los menús, los formularios y los mensajes de error siguen al producto | Los clusters "arrancan" en segundos (en Databricks real tardan minutos) |
| Lo que crees queda guardado en tu navegador | No hay cuenta, costo ni conexión a una nube |

:::tip Lo que guardes se queda
Notebooks, tablas, jobs y clusters se guardan en tu navegador: al volver están donde los dejaste. Si quieres empezar de cero, el menú de tu usuario (la **A** arriba a la derecha) tiene la opción de reiniciar la práctica.
:::

:::errores
- **Confundir el workspace con los datos.** El workspace es donde trabajas; los datos viven en tu nube y los gobierna Unity Catalog.
- **Buscar las máquinas en Workspace.** El cómputo está en Compute.
- **Creer que todo en la práctica es real.** El SQL corre de verdad; los clusters y los costos son una simulación.
:::

## ✅ Lo que lograste

- Sabes qué es Databricks y qué es un lakehouse.
- Reconoces las zonas de la pantalla y las secciones del menú.
- Sabes qué puedes practicar y qué es simulado.

:::ejercicio quiz
¿Qué es un lakehouse?
- [ ] Una base de datos relacional tradicional
- [x] Archivos en tu nube con el orden de un warehouse: tablas, transacciones, permisos y buen rendimiento
- [ ] Un servidor para alojar páginas web
- [ ] Un data lake sin tablas ni permisos, solo archivos
:::

:::ejercicio quiz
¿En qué sección del menú están las máquinas que ejecutan el código?
- [ ] Workspace
- [ ] Catalog
- [x] Compute
- [ ] Dashboards
:::

:::ejercicio quiz
¿Qué hace el botón New?
- [ ] Crea un usuario nuevo
- [x] Crea un notebook, una consulta, un job, un pipeline, compute y otros objetos desde cualquier lugar
- [ ] Abre una sesión nueva del navegador
- [ ] Abre la documentación
:::

:::ejercicio quiz
En la práctica, ¿qué es real?
- [x] El SQL: corre de verdad sobre las bases del curso
- [ ] Los clusters: son máquinas en Azure
- [ ] El costo: se cobra por hora
- [ ] Nada: son solo imágenes
:::
