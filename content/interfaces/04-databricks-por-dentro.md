---
titulo: Databricks por dentro - qué es cada parte y para qué sirve
nivel: Intermedio
duracion: 50
resumen: Recorrido completo por un workspace de Databricks - cuenta y workspace, plano de control y de cómputo, la barra lateral actual, notebooks, Unity Catalog, Delta Lake, compute y SQL warehouses, jobs, pipelines declarativos, SQL, dashboards, Genie y despliegue con bundles.
objetivos: Explicar cuenta, workspace, metastore, plano de control y plano de cómputo | Ubicar cada sección de la barra lateral y para qué sirve | Navegar Unity Catalog (catálogo, esquema, tabla, volumen) y dar permisos | Elegir el cómputo correcto - serverless, clúster de uso general, de jobs o SQL warehouse | Armar un job con tareas y un pipeline declarativo, y llevarlos a producción con bundles
prerrequisitos: databricks-que-es-databricks | databricks-unity-catalog
autoevaluacion: ¿Sabes qué diferencia hay entre la cuenta y un workspace? | ¿Sabes en qué orden se nombran las tablas en Unity Catalog? | ¿Sabes cuándo usar un SQL warehouse y cuándo un clúster? | ¿Sabes qué diferencia hay entre un job y un pipeline declarativo? | ¿Sabes qué hace VACUUM y qué te impide hacer después?
---

:::tip Practícalo mientras lees
Abre el [Databricks de práctica](#/databricks) y usa sus **🎯 Retos**. La réplica sigue la misma organización que un workspace real.
:::

## Cuenta, workspace y planos

```text
Cuenta de Databricks  (account console: usuarios, workspaces, metastores, facturación)
├── Metastore de Unity Catalog  (uno por región: el catálogo de todos los datos)
└── Workspace  (adb-xxxx.azuredatabricks.net: notebooks, jobs, compute, SQL)
      ├── Plano de control  → lo opera Databricks: la interfaz, los jobs, el catálogo
      └── Plano de cómputo  → donde corren los datos:
            · clásico: máquinas en TU suscripción (el grupo de recursos administrado)
            · serverless: máquinas que administra Databricks, listas en segundos
```

- La **cuenta** agrupa todo: usuarios y grupos (sincronizados desde Microsoft Entra ID), workspaces y metastores.
- Un **workspace** es el entorno donde se trabaja. Una empresa suele tener uno por entorno (dev, prod) o por área.
- El **metastore** de Unity Catalog se comparte entre workspaces de la misma región: la misma tabla se ve, con los mismos permisos, desde todos.
- Los datos viven en **tu almacenamiento** (ADLS Gen2 en Azure) en formato **Delta**; Databricks los gobierna y procesa.

## La ventana del workspace

**Barra superior**: búsqueda (notebooks, tablas, jobs, dashboards), **Genie** para preguntar en lenguaje natural, el selector de workspace, el selector de aplicación (**Analytics and AI**) y tu usuario con **Settings** (preferencias, idioma, tema, tokens, configuración de administrador).

**Inicio**: *Ask Genie* (preguntar, buscar o abrir **Genie Code**), recomendados, favoritos, populares y novedades.

**+ New**: crear notebook, consulta, dashboard, job, pipeline, clúster, SQL warehouse, carga de archivos y más.

### La barra lateral (organización de mayo de 2026)

| Sección | Elementos | Para qué |
|---|---|---|
| *(arriba)* | **Workspace**, **Recents**, **Catalog**, **Jobs & Pipelines**, **Compute**, **Discover**, **Marketplace** | Lo de todos los días: archivos, datos, orquestación y cómputo |
| **Lakehouse** | **SQL Editor**, **Queries**, **Query History**, **SQL Warehouses** | Trabajar con SQL sobre el lakehouse (antes esta sección se llamaba *SQL*) |
| **Analytics** | **Dashboards**, **Genie Agents**, **Alerts** | Analítica para el negocio: tableros AI/BI, espacios de preguntas en lenguaje natural y alertas |
| **Data Engineering** | **Runs**, **Data Ingestion** | Ejecuciones de jobs y pipelines; asistentes para cargar datos (Lakeflow Connect) |
| **AI/ML** | **Playground**, **Agents**, **AI Gateway**, **Experiments**, **Features**, **Models**, **Serving** | Modelos de lenguaje, agentes, MLflow, feature store, registro y servicio de modelos |

Un candado junto a un elemento indica que te falta el permiso (*entitlement*) para usarlo.

## Workspace: los archivos

El **explorador del workspace** guarda **notebooks**, archivos, consultas, dashboards, experimentos y **carpetas Git** (*Git folders*, antes *Repos*: un repositorio de GitHub o Azure DevOps clonado, con ramas, commits y pull). Carpetas principales: **Home** (`/Workspace/Users/tu@correo`), **Shared** y la **Papelera** (30 días).

## Notebooks

| Parte | Qué es |
|---|---|
| **Celdas** | Código o texto. Se ejecutan con Shift+Enter; el resultado queda debajo |
| **Idioma por defecto y comandos mágicos** | `%python`, `%sql`, `%scala`, `%r` cambian el idioma de una celda; `%md` es texto; `%sh` ejecuta en la terminal del driver; `%fs` maneja archivos; `%run` incluye otro notebook; `%pip` instala librerías |
| **Selector de cómputo** | Arriba a la derecha: **Serverless** o un clúster. Sin cómputo conectado no se ejecuta nada |
| **Resultados** | Tabla con orden y filtro, **+** para agregar visualizaciones, descargar |
| **`display()`** | Muestra un DataFrame como tabla interactiva |
| **Widgets** | Parámetros del notebook (texto, lista) que también recibe de un job: `dbutils.widgets.get("fecha")` |
| **`dbutils`** | Utilidades: `fs` (archivos), `secrets` (leer secretos sin mostrarlos), `widgets`, `notebook.run` / `notebook.exit`, `jobs.taskValues` |
| **Panel lateral** | Tabla de contenidos, explorador de variables, **historial de versiones**, comentarios, **Genie Code** (el asistente que escribe y corrige código) |
| **Programar** | Convertir el notebook en un job con horario |

## Catalog: Unity Catalog

Todo dato tiene un nombre de **tres partes**: `catálogo.esquema.objeto`, por ejemplo `main.ventas.pedidos`.

| Objeto | Qué es |
|---|---|
| **Catálogo** | El nivel más alto: suele separar entornos o áreas (`dev`, `prod`, `finanzas`) |
| **Esquema** (*schema* o *database*) | Agrupa objetos de un tema o capa (`bronze`, `silver`, `gold`) |
| **Tabla administrada** | Unity Catalog decide dónde guardar los archivos y los borra al hacer `DROP` |
| **Tabla externa** | Los archivos están en una ruta tuya (*external location*); `DROP` no los borra |
| **Vista**, **vista materializada**, **tabla de streaming** | Consultas guardadas; las materializadas guardan el resultado y se actualizan |
| **Volumen** | Archivos que no son tablas (CSV, imágenes, PDFs) en `/Volumes/catálogo/esquema/volumen/` |
| **Función** y **modelo** | Funciones SQL/Python y modelos de ML registrados |

En **Catalog Explorer** ves el esquema de cada tabla, datos de muestra, **historial** de versiones Delta, **linaje** (de dónde viene y quién la usa), **permisos** y etiquetas. Los permisos se dan con SQL: `GRANT SELECT ON TABLE main.ventas.pedidos TO analistas` (además se necesitan `USE CATALOG` y `USE SCHEMA`). El catálogo **system** tiene tablas del sistema: facturación, auditoría, historial de consultas y linaje. El catálogo **samples** trae datos de ejemplo de solo lectura.

### Delta Lake en una tabla

Cada tabla Delta es un conjunto de archivos Parquet más un **registro de transacciones** (`_delta_log`) que anota cada cambio como una **versión**. Eso permite:

- `DESCRIBE HISTORY`: ver quién cambió qué.
- **Viaje en el tiempo**: `SELECT … VERSION AS OF 3` y `RESTORE`.
- `MERGE INTO`: upserts y sincronizaciones.
- `OPTIMIZE` (compactar archivos chicos) y **Liquid Clustering** (`CLUSTER BY`, el reemplazo de particiones y Z-ORDER).
- `VACUUM`: borra archivos viejos que ya no usa ninguna versión reciente. Después no puedes viajar a las versiones cuyos archivos se borraron.

## Compute

| Tipo | Qué es | Para qué |
|---|---|---|
| **Serverless** (notebooks, jobs, pipelines) | Cómputo que administra Databricks, arranca en segundos y se cobra por uso | La opción recomendada cuando está disponible |
| **Clúster de uso general** (*all-purpose*) | Un clúster tuyo, compartido para trabajar en notebooks | Desarrollo interactivo con configuración propia |
| **Clúster de jobs** | Se crea para un job y se apaga al terminar | Producción con cómputo clásico (más barato que uno de uso general) |
| **SQL warehouse** | Cómputo optimizado para SQL: *Serverless*, *Pro* o *Classic* | SQL Editor, dashboards, herramientas de BI (Power BI se conecta acá) |

Al crear un clúster eliges: **modo de acceso** (*Standard*, antes *Shared*: varios usuarios con aislamiento; *Dedicated*, antes *Single user*), versión de **Databricks Runtime** (o *ML* con librerías de machine learning), **Photon** (motor vectorizado más rápido), tamaño de nodos, **escalado automático** (mínimo y máximo de workers) y **terminación automática** tras N minutos sin uso (lo que más ahorra). Las **políticas de cómputo** limitan lo que cada equipo puede crear.

## Jobs & Pipelines

### Jobs (Lakeflow Jobs)

Un **job** ejecuta **tareas** en orden:

- **Tipos de tarea**: notebook, script Python, SQL (consulta, archivo o dashboard), **pipeline**, dbt, JAR, *If/else condition*, *For each*, *Run job*.
- **Dependencias** entre tareas y **Run if** (*All succeeded*, *At least one failed*, *All done*…).
- **Parámetros** del job y **valores dinámicos**: `{{job.parameters.fecha}}`, `{{tasks.limpiar.values.filas}}` (lo que una tarea guarda con `dbutils.jobs.taskValues.set`).
- **Triggers**: programado (cron), **llegada de archivos**, **actualización de tabla** o continuo.
- **Reintentos**, **tiempo límite**, **notificaciones** (correo, Slack) y **Repair run**: volver a correr solo las tareas que fallaron.

En **Runs** ves todas las ejecuciones con su matriz de tareas, duración y salida.

### Pipelines declarativos (Lakeflow Spark Declarative Pipelines)

Describes **qué tablas quieres** y Databricks resuelve el orden, el estado y los reintentos:

- **Tabla de streaming**: procesa solo los datos nuevos (ingesta incremental, `STREAM(…)`, `read_files`).
- **Vista materializada**: el resultado de una consulta, recalculado de forma incremental cuando puede.
- **Expectativas**: `CONSTRAINT … EXPECT (…) ON VIOLATION DROP ROW | FAIL UPDATE` para la calidad de datos.
- **AUTO CDC**: aplica un feed de cambios (altas, cambios, bajas desordenadas) como SCD tipo 1 o 2.
- Modo **triggered** o **continuous**, modo **desarrollo** o **producción**, **Full refresh**, y el **registro de eventos** con métricas y calidad.

**Data Ingestion** (Lakeflow Connect) trae datos de SaaS y bases de datos con conectores administrados, y **Lakeflow Designer** permite armar transformaciones de forma visual.

## Lakehouse y Analytics: SQL, dashboards y Genie

- **SQL Editor**: escribir y ejecutar SQL contra un SQL warehouse, con autocompletado, Genie Code, parámetros, visualizaciones y edición colaborativa. **Queries** guarda las consultas y **Query History** muestra cada ejecución con su plan y duración.
- **Dashboards** (AI/BI): tableros con datasets en SQL, visualizaciones, filtros y programación por correo; se publican con permisos propios.
- **Genie Agents** (antes *Genie spaces*): espacios donde el negocio pregunta en lenguaje natural sobre tablas curadas, con instrucciones y ejemplos que define el equipo de datos.
- **Alerts**: una consulta que se evalúa a horario y avisa si cumple una condición.

## Llevar a producción

- **Databricks Asset Bundles**: un `databricks.yml` describe jobs, pipelines y su código; `databricks bundle deploy -t prod` lo despliega igual en cada entorno (ideal con GitHub Actions o Azure DevOps).
- **CLI de Databricks** y **API REST** para automatizar todo lo que haces con clics.
- **Costos**: se paga en **DBU** (unidades de Databricks) según el tipo de cómputo, más las máquinas en el caso clásico. Las tablas del sistema `system.billing` muestran el gasto por job, usuario o etiqueta.

## Qué tiene la réplica y qué no

| En la réplica | Todavía no |
|---|---|
| Workspace con carpetas, notebooks SQL y Python (Spark en el navegador), widgets, dbutils, `%run`, importar y exportar | Scala y R, carpetas Git conectadas a un repositorio, Genie Code |
| Unity Catalog con catálogos, esquemas, tablas, vistas, volúmenes, GRANT, historial, viaje en el tiempo, MERGE, COPY INTO, `system` y `samples` | Tablas externas reales, linaje completo, etiquetas, Delta Sharing |
| Compute (clústeres y SQL warehouses con estados y terminación automática), jobs con tareas, Run if, parámetros y Repair | Escalado y rendimiento reales, triggers por llegada de archivos que se disparen solos |
| Pipelines declarativos con expectativas y AUTO CDC, SQL Editor, consultas, historial | Dashboards AI/BI completos, Genie Agents, Playground, MLflow y Serving |
| Exportar como Asset Bundle | Desplegar en un workspace real (para eso: Databricks Free Edition) |

:::ejercicio quiz
¿Cómo se llama de forma completa la tabla `pedidos` del esquema `silver` en el catálogo `main`?
- [ ] silver.pedidos.main
- [x] main.silver.pedidos
- [ ] main/silver/pedidos
- [ ] pedidos@main.silver
:::

:::ejercicio quiz
El equipo de BI conecta Power BI para consultar tablas gold con SQL. ¿Qué cómputo conviene?
- [ ] Un clúster de uso general con Scala
- [x] Un SQL warehouse (serverless si está disponible)
- [ ] Un clúster de jobs
- [ ] No necesita cómputo
:::

:::ejercicio quiz
Un job de 5 tareas falló en la tarea 4. ¿Qué haces para no volver a correr las 3 primeras?
- [ ] Borrar el job y crearlo de nuevo
- [x] Repair run: vuelve a ejecutar solo las tareas que fallaron (y las que dependen de ellas)
- [ ] Ejecutar VACUUM
- [ ] Cambiar el modo de acceso del clúster
:::

:::ejercicio quiz
¿Qué diferencia hay entre una tabla de streaming y una vista materializada en un pipeline declarativo?
- [ ] Ninguna, son sinónimos
- [x] La tabla de streaming procesa solo los datos nuevos que llegan; la vista materializada guarda el resultado de una consulta y lo actualiza
- [ ] La vista materializada no guarda datos
- [ ] La tabla de streaming solo funciona con Kafka
:::
