---
titulo: Microsoft Fabric por dentro - qué es cada parte y para qué sirve
nivel: Intermedio
duracion: 45
resumen: Recorrido por Microsoft Fabric - capacidad, workspace e ítems; OneLake y Delta; lakehouse (Files, Tables, Load to Tables, atajos y SQL analytics endpoint); warehouse; notebooks de Spark; pipelines; modelo semántico con Direct Lake; Monitor, catálogo de OneLake e integración con Git.
objetivos: Explicar capacidad, workspace, ítem y OneLake | Distinguir lakehouse, SQL analytics endpoint y warehouse, y cuándo usar cada uno | Cargar archivos a Files y convertirlos en tablas Delta | Transformar con un notebook y orquestar con un pipeline | Conectar un workspace a Git
prerrequisitos: interfaces-portal-azure-por-dentro
autoevaluacion: ¿Sabes qué diferencia hay entre Files y Tables en un lakehouse? | ¿Sabes por qué el SQL analytics endpoint no acepta INSERT? | ¿Sabes qué es un atajo (shortcut) de OneLake? | ¿Sabes qué es Direct Lake? | ¿Sabes qué se guarda en Git cuando conectas un workspace?
---

:::tip Practícalo mientras lees
Abre el [Fabric de práctica](#/fabric). Crea un lakehouse, carga los datos de ejemplo y sigue la lección con la réplica al lado.
:::

## Qué es Fabric

**Microsoft Fabric** es una plataforma de datos de software como servicio (SaaS): en un mismo portal, con un mismo almacenamiento y una misma facturación, junta lo que en Azure son servicios separados.

| En Fabric | Equivale más o menos a |
|---|---|
| Pipelines y Dataflow Gen2 (*Data Factory*) | Azure Data Factory, Power Query |
| Lakehouse y notebooks de Spark (*Data Engineering*) | Databricks o Synapse Spark + ADLS |
| Warehouse (*Data Warehouse*) | Synapse dedicated SQL pool |
| Eventstream y Eventhouse (*Real-Time Intelligence*) | Event Hubs + Azure Data Explorer |
| Modelo semántico e informes | Power BI |

La diferencia: no creas cuentas de almacenamiento, clústeres ni redes. Todo corre sobre una **capacidad** y guarda los datos en **OneLake**.

## Los conceptos

| Concepto | Qué es |
|---|---|
| **Tenant** | Tu organización (el mismo de Microsoft 365 / Entra ID) |
| **Capacidad** | El cómputo que pagas, medido en **CU** (*capacity units*): F2, F4… F64. Una prueba (*Trial*) equivale a F64. Todos los ítems de los workspaces asignados consumen de ahí |
| **Workspace** | Carpeta colaborativa con permisos (Admin, Member, Contributor, Viewer). Se asigna a una capacidad |
| **Ítem** | Cada cosa que creas: lakehouse, warehouse, notebook, pipeline, modelo semántico, informe… |
| **OneLake** | Un único data lake por tenant ("el OneDrive de los datos"). Cada lakehouse y warehouse guarda allí sus tablas en formato **Delta** |

Como todos los motores leen la misma tabla Delta en OneLake, **no hay copias**: lo que escribe un notebook lo lee el SQL de inmediato y lo muestra Power BI.

## La ventana del portal

- **Barra de navegación** (izquierda): *Home*, *Workspaces*, *OneLake* (catálogo), *Monitor*, *Real-Time*, *Workloads*, y debajo el workspace y los ítems que tienes abiertos.
- **Barra superior**: búsqueda, notificaciones, configuración, ayuda y tu cuenta. El aviso *Trial* indica los días que quedan de la prueba.
- **Workspace**: botón **+ New item** (agrupado en *Get data*, *Store data*, *Prepare data*, *Analyze and train data*, *Track data*), la lista de ítems y la vista **Lineage** (qué ítem alimenta a cuál).

## Lakehouse

Un lakehouse tiene dos zonas:

| Zona | Qué guarda | Cómo se usa |
|---|---|---|
| **Files** | Archivos tal como llegan (CSV, JSON, Parquet): la zona *sin administrar* | Subes archivos, los lee Spark con `Files/carpeta/archivo.csv` |
| **Tables** | **Tablas Delta** administradas, en el esquema `dbo` | Las leen Spark, el SQL analytics endpoint y Power BI |

El paso típico es subir a **Files** y luego **Load to Tables** (desde el menú **…** del archivo): Fabric infiere el esquema y crea la tabla Delta. Si eliges una tabla existente, **agrega** las filas, y las columnas tienen que coincidir.

Un **atajo** (*shortcut*) es una referencia a datos que viven en otro lugar (otro lakehouse, ADLS, S3) **sin copiarlos**: aparece en Tables como una tabla más, con un ícono de enlace.

### SQL analytics endpoint

Cada lakehouse trae un **SQL analytics endpoint** (el selector arriba a la derecha): T-SQL de **solo lectura** sobre las tablas Delta. Sirve para explorar con SQL y para que los analistas consulten sin tocar Spark. Un `INSERT` o un `CREATE TABLE` falla: para escribir se usa Spark (un notebook) o un warehouse.

## Warehouse

El **warehouse** es T-SQL completo **con escritura**: `CREATE TABLE`, `INSERT`, `UPDATE`, `DELETE`, transacciones y procedimientos. También guarda sus tablas en Delta en OneLake. Puede consultar tablas de un lakehouse del mismo workspace con nombres de tres partes:

```sql
INSERT INTO dbo.resumen_estados
SELECT estado, COUNT(*) FROM LH_Ventas.dbo.pedidos GROUP BY estado;
```

| ¿Lakehouse o warehouse? | |
|---|---|
| Lakehouse | Equipos que trabajan con Spark/Python, datos semiestructurados, ciencia de datos, capas bronze/silver |
| Warehouse | Equipos de SQL, modelos dimensionales, capa gold, cargas con transacciones |

Muchos proyectos usan los dos: lakehouse para bronze y silver, warehouse (o lakehouse) para gold.

## Notebooks

Un notebook de Fabric corre **Spark** en celdas de **PySpark**, **Spark SQL** (`%%sql`), Scala o R. Se le adjunta un **lakehouse por defecto**, que permite rutas relativas:

```python norun
df = spark.read.format("csv").option("header", "true").load("Files/raw/pedidos_2024.csv")
limpio = df.dropna(subset=["cliente_id"])
limpio.write.mode("overwrite").saveAsTable("pedidos_limpios")   # aparece en Tables
```

La sesión de Spark arranca al correr la primera celda. **Run all** ejecuta todo en orden. `display(df)` muestra una tabla interactiva.

## Pipelines

Un **pipeline** orquesta pasos, igual que en Data Factory: **Copy data** (traer datos de un origen a una tabla), **Notebook**, **Dataflow**, **Stored procedure**, **ForEach**, **If condition**… Las flechas indican dependencias (*On success*, *On fail*). La pestaña **Output** muestra el estado y la salida de cada actividad, y **Schedule** lo programa.

## Modelo semántico y Direct Lake

El **modelo semántico** (antes *dataset* de Power BI) define las tablas, relaciones y medidas DAX que usan los informes. En Fabric suele usar **Direct Lake**: Power BI lee las tablas Delta de OneLake directamente, sin importar una copia (como *Import*) y sin traducir cada clic a SQL (como *DirectQuery*). Desde 2025 el lakehouse ya no crea un modelo por defecto: lo creas con **New semantic model**.

## Monitor, catálogo y Git

- **Monitor**: todas las ejecuciones (notebooks, pipelines, cargas) con estado, duración y quién las lanzó.
- **OneLake catalog**: buscar y explorar los ítems de toda la organización (*Explore*), su gobierno (*Govern*) y sus permisos (*Secure*).
- **Git integration** (*Workspace settings*): conecta el workspace a un repositorio de Azure DevOps o GitHub. Cada ítem se guarda como una carpeta (`Ventas.Notebook/notebook-content.py`, `.platform`…), y desde **Source control** haces commit de los cambios. Con eso funcionan las revisiones por pull request y el CI/CD con **Deployment pipelines** (desarrollo → prueba → producción).

## Qué tiene la réplica y qué no

| En la réplica | Todavía no |
|---|---|
| Workspaces, ítems, lineage, Monitor, catálogo de OneLake | Capacidades y su consumo de CU, roles del workspace |
| Lakehouse: Files, Tables, Load to Tables, atajos entre lakehouses, propiedades y rutas ABFS | Atajos a ADLS o S3, mantenimiento real (OPTIMIZE, VACUUM) |
| SQL analytics endpoint de solo lectura y warehouse con T-SQL de escritura y nombres de tres partes | Procedimientos almacenados, seguridad a nivel de fila |
| Notebooks con PySpark (mini-Spark del curso) y Spark SQL sobre el lakehouse por defecto | Scala y R, entornos, bibliotecas |
| Pipelines con Copy data y Notebook, salida por actividad | Dataflow Gen2, ForEach e If (están en el Data Factory del portal de Azure) |
| Modelo semántico con tablas y medidas, exportar a CSV para Power BI | Informes dentro de Fabric, Direct Lake real |
| Git con los repositorios del GitHub de práctica | Deployment pipelines |

:::ejercicio quiz
Subiste `ventas.csv` a la zona **Files** del lakehouse y no la ves desde el SQL analytics endpoint. ¿Por qué?
- [ ] El endpoint tarda un día en actualizarse
- [x] El endpoint solo muestra tablas Delta de Tables: hay que hacer Load to Tables (o escribirla con Spark)
- [ ] Los CSV no se pueden subir a Fabric
- [ ] Falta crear un modelo semántico
:::

:::ejercicio quiz
Un analista quiere crear una tabla resumen con `CREATE TABLE … AS SELECT` usando T-SQL. ¿Dónde puede hacerlo?
- [ ] En el SQL analytics endpoint del lakehouse
- [x] En un warehouse
- [ ] En el Monitor
- [ ] En OneLake catalog
:::

:::ejercicio quiz
¿Qué ventaja tiene un **atajo** de OneLake frente a copiar la tabla con un pipeline?
- [x] No duplica los datos: si cambian en el origen, el atajo ve el cambio
- [ ] Es más rápido de escribir
- [ ] Permite hacer INSERT desde el endpoint
- [ ] Convierte el CSV en Delta
:::

:::ejercicio quiz
¿Qué consume la **capacidad** (CU) de Fabric?
- [ ] Solo los informes de Power BI
- [ ] Solo el almacenamiento en OneLake
- [x] Las operaciones de todos los ítems de los workspaces asignados: Spark, SQL, pipelines, informes
- [ ] Nada, Fabric es gratuito
:::
