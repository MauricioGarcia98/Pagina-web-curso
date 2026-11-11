---
titulo: Microsoft Fabric por dentro - workspaces, lakehouse, warehouse, notebooks y pipelines
nivel: Intermedio
duracion: 45
resumen: Recorrido por Microsoft Fabric - qué es OneLake, cómo se organiza un workspace, la diferencia entre lakehouse y warehouse, el SQL analytics endpoint de solo lectura, notebooks con Spark, pipelines, modelo semántico, Monitor e integración con Git. Con el flujo completo de una carga de punta a punta.
objetivos: Explicar qué es OneLake y por qué hay uno solo por organización | Distinguir lakehouse, warehouse y SQL analytics endpoint, y saber cuál escribe con T-SQL | Cargar un archivo a un lakehouse y convertirlo en tabla Delta | Transformar con un notebook de PySpark y orquestar con un pipeline | Conectar un workspace a Git y seguir una ejecución en Monitor
prerrequisitos: interfaces-portal-azure-por-dentro
autoevaluacion: ¿Sabes cuántos OneLake tiene una organización? | ¿Sabes por qué un INSERT falla en el SQL analytics endpoint? | ¿Sabes qué hace Load to Tables? | ¿Sabes en qué se diferencia un shortcut de una copia? | ¿Sabes dónde ver por qué falló un pipeline?
---

:::tip Practícalo mientras lees
Abre [Microsoft Fabric de práctica](#/fabric). Corre en tu navegador con las bases de ejemplo del curso: no necesitas cuenta de Microsoft ni capacidad paga. Las capturas y nombres siguen la documentación pública de Microsoft Learn.
:::

:::analogia En palabras simples
Fabric es como un edificio de oficinas para los datos de una empresa: hay un solo depósito en el sótano (**OneLake**), cada equipo tiene su piso (**workspace**) y en cada piso hay distintas herramientas (**ítems**) que guardan, transforman o muestran los datos. Todas leen y escriben en el mismo depósito.
:::

## Qué es Fabric

**Microsoft Fabric** junta en un solo producto lo que en Azure son varios servicios separados: ingesta (Data Factory), almacenamiento (Data Lake), procesamiento con Spark (parecido a Databricks o Synapse), un warehouse SQL, tiempo real y Power BI. Se paga por **capacidad** (SKU F2, F4, F64…): una cantidad de cómputo que comparten todos los workspaces asignados a ella.

| En Azure "clásico" | En Fabric |
|---|---|
| Una cuenta de ADLS por proyecto | **OneLake**, uno solo por organización |
| Data Factory | **Pipelines** y **Dataflow Gen2** |
| Synapse Spark / Databricks | **Notebooks** y **Spark job definitions** |
| Synapse dedicated SQL pool | **Warehouse** |
| Power BI (servicio aparte) | **Modelo semántico** e **informes**, en el mismo lugar |

## OneLake y los workspaces

**OneLake** es un único data lake lógico por tenant (la organización), construido sobre ADLS Gen2. No se crea: ya existe. Cada **workspace** es una carpeta dentro de él y cada ítem (lakehouse, warehouse) es una subcarpeta. Todo se guarda en formato abierto **Delta Parquet**, así que el mismo archivo lo pueden leer Spark, el motor SQL y Power BI sin copiarlo.

En la barra izquierda de la réplica:

| Ícono | Para qué sirve |
|---|---|
| **Home** | Accesos rápidos para crear ítems y los recientes |
| **Workspaces** | La lista de espacios de trabajo y el botón **New workspace** |
| **OneLake** | El catálogo: todos los ítems de datos a los que tienes acceso |
| **Monitor** | Las ejecuciones de pipelines, notebooks y actualizaciones |
| **Real-Time** | Eventos y flujos en tiempo real |
| **Workloads** | Las cargas de trabajo disponibles |

Dentro de un workspace, **+ New item** crea lakehouses, warehouses, notebooks, pipelines y modelos semánticos. Los **roles del workspace** (Admin, Member, Contributor, Viewer) dan permiso sobre todo lo que hay adentro.

## Lakehouse: Files y Tables

Un **lakehouse** tiene dos secciones:

- **Files**: archivos crudos de cualquier formato (CSV, JSON, Parquet, imágenes). Es la zona de aterrizaje.
- **Tables**: tablas **Delta** administradas, con esquema, listas para consultar.

Para pasar de una a otra sin código, haz clic derecho en un CSV de Files y elige **Load to Tables**: crea una tabla Delta con las columnas del archivo. Con código, un notebook lee el archivo y lo guarda con `saveAsTable`.

Un **shortcut** (atajo) es un puntero a datos que están en otro lugar (otro lakehouse, ADLS, Amazon S3, Google Cloud Storage). Se ve como una carpeta o tabla más, pero **no copia** los datos: si cambian en el origen, cambian en el atajo.

## SQL analytics endpoint y warehouse

Cada lakehouse trae automáticamente un **SQL analytics endpoint**: una forma de consultar sus tablas con T-SQL. Es **de solo lectura**: sirve para `SELECT`, vistas y funciones, pero un `INSERT`, `UPDATE` o `CREATE TABLE` falla. Para escribir en un lakehouse se usa Spark, un pipeline o un dataflow.

El **warehouse** es la otra opción: un almacén SQL completo donde sí se escribe con T-SQL (`CREATE TABLE`, `INSERT`, `UPDATE`, `MERGE`, `COPY INTO`) y se usan transacciones. También guarda los datos en Delta dentro de OneLake.

| Necesitas… | Usa |
|---|---|
| Transformar con Python o Spark, datos semiestructurados | **Lakehouse** + notebook |
| Un equipo que trabaja solo en SQL, con DML y transacciones | **Warehouse** |
| Consultar con SQL las tablas que dejó Spark | **SQL analytics endpoint** del lakehouse |

Desde un warehouse puedes unir tablas de otro ítem del mismo workspace con un nombre de tres partes: `SELECT ... FROM lh_ventas.dbo.pedidos`.

## Notebooks

Un **notebook** de Fabric se parece a uno de Databricks o Jupyter: celdas de PySpark, Spark SQL (`%%sql`) o Markdown. A la izquierda se elige el **lakehouse predeterminado**: sus tablas se leen por nombre (`spark.read.table("pedidos")`) y lo que guardas con `saveAsTable` queda en su sección Tables.

En la réplica, las celdas de PySpark usan el mismo mini-Spark del Databricks de práctica, así que `df.groupBy(...).agg(...)`, `display(df)` y `saveAsTable` funcionan con las bases del curso.

## Pipelines

Un **pipeline** orquesta pasos, igual que en Azure Data Factory: **Copy data** mueve datos de un origen a un destino, **Notebook** ejecuta un notebook, y hay actividades de control (Lookup, ForEach, If Condition, Set variable). Se programan con **Schedule** o se ejecutan con **Run**, y cada ejecución aparece en **Monitor** con el estado de cada actividad. Si una falla, ahí ves el mensaje de error y, en una actividad Notebook, la celda que falló.

## Modelo semántico e informes

El **modelo semántico** es el modelo de Power BI: tablas, relaciones y medidas DAX. En Fabric puede usar el modo **Direct Lake**, que lee directamente los archivos Delta de OneLake: es casi tan rápido como importar los datos, pero sin tener que programar actualizaciones.

## Git y despliegue

En **Workspace settings → Git integration** se conecta el workspace a una rama de un repositorio (Azure DevOps o GitHub). El panel **Source control** muestra qué ítems cambiaron; con **Commit** se guardan en el repositorio y con **Update** se traen los cambios de otros. Para pasar de desarrollo a producción se usan **deployment pipelines** (etapas Development → Test → Production).

En la réplica, la integración de Git usa los repositorios del [GitHub de práctica](#/github): lo que confirmas desde Fabric aparece ahí como un commit.

## Un flujo completo

1. Crea un workspace `ventas-dev` y dentro un lakehouse `lh_ventas`.
2. Sube `ventas.csv` a **Files** y usa **Load to Tables**.
3. Consulta la tabla desde el **SQL analytics endpoint** con un `SELECT ... GROUP BY`.
4. Crea un notebook que lea la tabla, agregue por mes y guarde `ventas_mensuales` con `saveAsTable`.
5. Crea un pipeline con una actividad **Notebook** que ejecute ese notebook y córrelo.
6. Revisa la ejecución en **Monitor**.
7. Conecta el workspace a Git y haz **Commit**.

## Qué tiene la réplica y qué no

| En la réplica | Todavía no |
|---|---|
| Workspaces, lakehouse con Files/Tables, Load to Tables y shortcuts | Roles del workspace, capacidades reales, métricas de CU y throttling |
| SQL analytics endpoint (solo lectura) y warehouse con T-SQL | Eventhouse con KQL, Eventstream y Activator |
| Notebooks con PySpark y Spark SQL sobre las bases del curso | Dataflow Gen2 (Power Query) y Spark job definitions |
| Pipelines con Copy data y Notebook, Run y Schedule, Monitor | Lookup, ForEach e If (practícalos en el [Data Factory del portal de Azure](#/azure/studio)); deployment pipelines |
| Modelo semántico e integración con Git | Seguridad de OneLake por carpeta y etiquetas de confidencialidad |

:::ejercicio quiz
Desde el SQL analytics endpoint de un lakehouse ejecutas `INSERT INTO pedidos VALUES (...)` y falla. ¿Por qué?
- [ ] Porque el lakehouse no usa formato Delta
- [x] Porque el SQL analytics endpoint es de solo lectura; para escribir con T-SQL se usa un warehouse
- [ ] Porque falta el rol Admin del workspace
- [ ] Porque T-SQL no existe en Fabric
:::

:::ejercicio quiz
Subiste `clientes.csv` a la sección Files de un lakehouse y quieres consultarlo con SQL sin escribir código. ¿Qué haces?
- [ ] Creo un warehouse y copio el archivo a mano
- [x] Clic derecho sobre el archivo y **Load to Tables**
- [ ] Lo abro en un informe de Power BI
- [ ] Creo un shortcut del archivo
:::

:::ejercicio quiz
Los datos de un socio están en un bucket de Amazon S3 y no quieres duplicarlos en OneLake. ¿Qué usas?
- [ ] Un pipeline con Copy data cada hora
- [ ] Un warehouse con `COPY INTO`
- [x] Un shortcut a S3 desde el lakehouse
- [ ] Un notebook que descarga el bucket
:::

:::ejercicio quiz
Una empresa tiene cinco workspaces en Fabric. ¿Cuántos OneLake tiene?
- [x] Uno solo, compartido por toda la organización
- [ ] Cinco, uno por workspace
- [ ] Uno por cada lakehouse
- [ ] Ninguno hasta que se crea una cuenta de almacenamiento
:::

:::ejercicio quiz
Un pipeline nocturno falló en la actividad Notebook. ¿Dónde empiezas a buscar la causa?
- [ ] En la configuración del workspace
- [x] En **Monitor**, en la ejecución del pipeline y el detalle de la actividad que falló
- [ ] En la lista de shortcuts del lakehouse
- [ ] En el modelo semántico
:::
