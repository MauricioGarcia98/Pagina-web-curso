---
titulo: Databricks por dentro - qué es cada parte y para qué sirve
nivel: Intermedio
duracion: 75
resumen: Recorrido completo por un workspace de Databricks - cuenta y workspace, plano de control y de cómputo, la barra lateral actual, notebooks, Unity Catalog, Delta Lake, compute y SQL warehouses, jobs, pipelines declarativos, SQL, dashboards, Genie y despliegue con bundles.
objetivos: Explicar cuenta, workspace, metastore, plano de control y plano de cómputo | Proteger filas y columnas con funciones, filtros de fila, máscaras y etiquetas | Crear tablas de streaming incrementales desde SQL | Armar un dashboard, una alerta y un Genie Agent que responda bien | Registrar modelos con MLflow y usar alias | Ubicar cada sección de la barra lateral y para qué sirve | Navegar Unity Catalog (catálogo, esquema, tabla, volumen) y dar permisos | Elegir el cómputo correcto - serverless, clúster de uso general, de jobs o SQL warehouse | Armar un job con tareas y un pipeline declarativo, y llevarlos a producción con bundles
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

## Lakehouse y Analytics: SQL, dashboards, alertas y Genie

Piensa en esta parte como **el lugar donde los datos se convierten en respuestas** para gente que no programa.

- **SQL Editor**: escribes SQL y lo ejecutas contra un SQL warehouse, con autocompletado, parámetros y gráficos. **Queries** guarda tus consultas y **Query History** muestra cada ejecución con su duración.
- **Dashboards** (AI/BI): un tablero se arma en tres pasos:
  1. **Datasets**: una o más consultas SQL que traen los datos (por ejemplo, ventas por categoría y país).
  2. **Widgets**: cada gráfico (barras, líneas, contador, tabla) usa un dataset y dice qué va en cada eje.
  3. **Filtros**: un desplegable (por ejemplo *país*) que cambia todos los gráficos a la vez.

  Mientras lo editas es un **borrador** (*draft*). Al **publicarlo** se congela una versión que ven los demás: puedes seguir cambiando el borrador sin romper lo que ya están mirando.
- **Alerts**: una consulta que se ejecuta con un horario y **avisa** (correo, Slack) cuando el resultado cumple una condición. Ejemplo: "si los pedidos cancelados de hoy son más de 50, avísale al equipo". La alerta mira **la primera fila** del resultado y compara una columna contra un umbral.
- **Genie Agents** (antes *Genie spaces*): alguien del negocio pregunta en castellano ("¿cuánto vendimos por categoría?") y Genie escribe el SQL, lo ejecuta y muestra la tabla o el gráfico. **Siempre puedes ver el SQL** que generó (*Show code*) para revisar que tenga sentido.

:::tip Cómo hacer que Genie responda bien
Genie no "adivina" el negocio: aprende de lo que el equipo de datos le enseña.

1. **Pocas tablas y bien documentadas** (comentarios en tablas y columnas). Con 5 tablas claras responde mejor que con 25 confusas.
2. **Instrucciones** con el vocabulario de la empresa, una por línea: `ventas = cantidad * precio_unitario`. Así, cuando alguien dice "ventas", Genie sabe qué cuenta hacer.
3. **Consultas de ejemplo** (*SQL queries*): preguntas frecuentes con su SQL correcto. Cuando alguien pregunta lo mismo, Genie usa ese SQL tal cual.
4. **Feedback**: cada 👎 es una pista de qué instrucción o ejemplo falta.
:::

En la réplica, el Genie Agent une las tablas por sus columnas `_id`, entiende "por mes", "en 2023", "top 5", "más baratos" y valores reales como "cancelados" o "Argentina", y te dice qué supuso ("Uní pedidos con clientes por cliente_id"). Es mucho más simple que el Genie real (que usa un modelo de lenguaje), pero sirve para aprender lo importante: **revisar el SQL** y **mejorar el espacio con instrucciones y ejemplos**.

## Gobierno fino: quién ve qué filas y qué columnas

`GRANT SELECT` es todo o nada: o ves la tabla o no la ves. Pero muchas veces la regla es más fina: *"el equipo de Argentina solo ve los clientes de Argentina"* o *"solo soporte ve el email completo"*. Para eso Unity Catalog tiene tres piezas que se usan juntas.

**1. Una función SQL propia** (*UDF*). Es como una fórmula de Excel con nombre: recibe valores y devuelve un resultado.

```sql norun
CREATE FUNCTION main.default.con_iva(precio DOUBLE)
RETURNS DOUBLE
RETURN precio * 1.21;

SELECT nombre, main.default.con_iva(precio) AS precio_final
FROM samples.tienda.productos;
```

**2. Un filtro de fila** (*row filter*): una función que devuelve **verdadero o falso** para cada fila. Las filas con falso desaparecen para quien consulta, como si no existieran.

```sql norun
CREATE FUNCTION main.default.solo_mi_pais(pais STRING)
RETURNS BOOLEAN
RETURN is_account_group_member('admins') OR pais = 'Argentina';

ALTER TABLE main.default.clientes
  SET ROW FILTER main.default.solo_mi_pais ON (pais);
```

`is_account_group_member('admins')` pregunta "¿la persona que está consultando está en el grupo admins?". Si está, ve todo; si no, solo Argentina.

**3. Una máscara de columna** (*column mask*): una función que recibe el valor real y devuelve lo que se muestra.

```sql norun
CREATE FUNCTION main.default.ocultar_email(email STRING)
RETURNS STRING
RETURN CASE WHEN is_account_group_member('soporte') THEN email
            ELSE concat('***@', split(email, '@')[1]) END;

ALTER TABLE main.default.clientes
  ALTER COLUMN email SET MASK main.default.ocultar_email;
```

Quien no está en `soporte` ve `***@gmail.com`; quien está, ve el email completo. **Los datos guardados no cambian**: la máscara se aplica cada vez que alguien lee.

:::warning El orden importa al quitarlos
Primero quita el filtro o la máscara (`ALTER TABLE … DROP ROW FILTER` o `ALTER COLUMN … DROP MASK`) y **después** borra la función. Si borras la función primero, la tabla queda inaccesible hasta que quites la referencia.
:::

**Etiquetas** (*tags*): marcan qué es sensible para poder encontrarlo y auditarlo.

```sql norun
ALTER TABLE main.default.clientes SET TAGS ('dominio' = 'ventas');
ALTER TABLE main.default.clientes ALTER COLUMN email SET TAGS ('pii' = 'email');

SELECT * FROM main.information_schema.column_tags;   -- ¿dónde hay datos personales?
SELECT * FROM main.information_schema.row_filters;    -- ¿qué tablas tienen filtro?
```

Con muchas tablas, Databricks recomienda **políticas ABAC**: reglas que se aplican solas a todas las columnas que tengan cierta etiqueta (por ejemplo, "enmascarar todo lo etiquetado `pii`"). Los filtros y máscaras por tabla que acabas de ver son la base para entenderlas.

:::tip Pruébalo en la réplica
En **Settings → Identity and access → Groups** puedes entrar y salir de los grupos `admins` y `soporte`. Consulta la tabla, cambia de grupo y vuelve a consultarla: verás aparecer y desaparecer filas, y el email pasar de oculto a visible.
:::

## Tablas de streaming desde el editor SQL

No hace falta armar un pipeline para ingerir archivos de forma incremental: desde el SQL Editor puedes crear una **tabla de streaming independiente** (Databricks crea por detrás un pipeline administrado).

```sql norun
CREATE OR REFRESH STREAMING TABLE main.default.pedidos_bronze
AS SELECT * FROM STREAM read_files('/Volumes/main/default/crudos/', format => 'csv', header => true);

-- llegan archivos nuevos al volumen…
REFRESH STREAMING TABLE main.default.pedidos_bronze;        -- procesa SOLO los archivos nuevos
REFRESH STREAMING TABLE main.default.pedidos_bronze FULL;   -- borra todo y procesa desde cero
```

La palabra **`STREAM`** es lo que la hace incremental: la tabla **recuerda qué archivos ya leyó** y no los vuelve a leer. También puede leer de otra tabla con `FROM STREAM(main.default.otra_tabla)`, pero solo si a esa tabla **se le agregan filas** (*append-only*): si alguien borra o cambia filas de la fuente, el siguiente `REFRESH` falla y tienes que decidir si haces `FULL`.

## Machine learning: Experiments y Models

**MLflow** es el cuaderno de laboratorio del machine learning: cada vez que entrenas un modelo anota **qué probaste** y **qué tan bien salió**.

| Pieza | Qué guarda | Ejemplo |
|---|---|---|
| **Experimento** | Una carpeta de intentos sobre el mismo problema | `/Users/tu@empresa.com/precio-envios` |
| **Corrida** (*run*) | Un intento: **parámetros** (lo que elegiste) y **métricas** (el resultado) | `max_depth = 5` → `rmse = 2.1` |
| **Modelo registrado** | El modelo guardado en Unity Catalog con nombre de tres partes y **versiones** | `main.default.precio_envio` versión 3 |
| **Alias** | Un apodo que apunta a una versión | `@champion` = la versión que usa producción |

```python norun
import mlflow
mlflow.set_registry_uri("databricks-uc")      # los modelos van a Unity Catalog
with mlflow.start_run():
    mlflow.log_param("max_depth", 5)
    mlflow.log_metric("rmse", 2.1)
    mlflow.sklearn.log_model(modelo, "modelo", registered_model_name="main.default.precio_envio")
```

En **Experiments** comparas corridas lado a lado para elegir la mejor; en **Models** le pones el alias `champion` a esa versión. Las aplicaciones cargan `models:/main.default.precio_envio@champion`: para cambiar de modelo en producción **solo mueves el alias**, sin tocar el código.

## Llevar a producción

- **Databricks Asset Bundles**: un `databricks.yml` describe jobs, pipelines y su código; `databricks bundle deploy -t prod` lo despliega igual en cada entorno (ideal con GitHub Actions o Azure DevOps).
- **CLI de Databricks** y **API REST** para automatizar todo lo que haces con clics.
- **Costos**: se paga en **DBU** (unidades de Databricks) según el tipo de cómputo, más las máquinas en el caso clásico. Las tablas del sistema `system.billing` muestran el gasto por job, usuario o etiqueta.

## Qué tiene la réplica y qué no

| En la réplica | Todavía no |
|---|---|
| Workspace con carpetas, notebooks SQL y Python (Spark en el navegador), widgets, dbutils, `%run`, importar y exportar | Scala y R, carpetas Git conectadas a un repositorio, Genie Code |
| Unity Catalog con catálogos, esquemas, tablas, vistas, volúmenes, GRANT, historial, viaje en el tiempo, MERGE, COPY INTO, `system` y `samples` | Tablas externas reales, Delta Sharing, políticas ABAC |
| Funciones SQL propias, filtros de fila, máscaras de columna, etiquetas, grupos (Settings) e `information_schema` con todo eso | Funciones en Python y funciones de tabla (`RETURNS TABLE`) |
| Compute (clústeres y SQL warehouses con estados y terminación automática), jobs con tareas, Run if, parámetros y Repair | Escalado y rendimiento reales, triggers por llegada de archivos que se disparen solos |
| Pipelines declarativos con expectativas y AUTO CDC, tablas de streaming desde SQL con `REFRESH`, Structured Streaming y Auto Loader en notebooks | Kafka y fuentes en tiempo real |
| Dashboards con datasets, widgets, filtros y publicación; alertas; Genie Agents con instrucciones, ejemplos y feedback | Programar envíos por correo; el modelo de lenguaje real de Genie |
| MLflow: experimentos, corridas, comparación, registro de modelos en Unity Catalog y alias | Model Serving, Playground y AI Gateway |
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

:::ejercicio quiz
Los vendedores de cada país solo deben ver los clientes de su país en la tabla `clientes`. ¿Qué usas?
- [ ] Una máscara de columna sobre `pais`
- [x] Un filtro de fila: una función que devuelva verdadero solo para las filas de su país, aplicada con `ALTER TABLE … SET ROW FILTER`
- [ ] `GRANT SELECT` a cada vendedor
- [ ] Copiar la tabla una vez por país
:::

:::ejercicio quiz
Aplicaste una máscara al email y ahora quieres eliminarla para siempre. ¿Qué orden es el correcto?
- [ ] Primero `DROP FUNCTION` y después `ALTER COLUMN … DROP MASK`
- [x] Primero `ALTER COLUMN … DROP MASK` y después `DROP FUNCTION`
- [ ] Solo `DROP FUNCTION`: la máscara se quita sola
- [ ] Hay que borrar la tabla
:::

:::ejercicio quiz
Una tabla de streaming lee archivos de un volumen con `STREAM read_files(…)`. Llegan 2 archivos nuevos y ejecutas `REFRESH STREAMING TABLE`. ¿Qué pasa?
- [ ] Vuelve a leer todos los archivos y duplica los datos
- [x] Lee solo los 2 archivos nuevos y agrega sus filas; los que ya había leído no se vuelven a procesar
- [ ] No hace nada hasta que ejecutes `FULL`
- [ ] Borra la tabla y la crea de nuevo
:::

:::ejercicio quiz
Genie responde mal a "¿cuánto facturamos por país?" porque no sabe qué es "facturar". ¿Qué es lo primero que haces?
- [ ] Agregar las 25 tablas de la empresa al espacio
- [x] Agregar una instrucción como `facturación = cantidad * precio_unitario` y una consulta de ejemplo con el SQL correcto
- [ ] Pedirle al usuario que escriba SQL
- [ ] Cambiar el SQL warehouse por uno más grande
:::

:::ejercicio quiz
En MLflow, ¿para qué sirve el alias `@champion` de un modelo registrado?
- [ ] Para borrar las versiones viejas
- [x] Para que las aplicaciones carguen "la versión buena" por su apodo: cambiar de modelo en producción es mover el alias, sin cambiar el código
- [ ] Para entrenar más rápido
- [ ] Para compartir el modelo fuera de Databricks
:::
