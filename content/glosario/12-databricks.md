# area: Databricks

## Databricks
alias: databricks lakehouse platform
nino: Databricks es un **taller completo para trabajar con datos**: trae las máquinas (Spark), la mesa de trabajo (notebooks), los cajones ordenados (Delta y Unity Catalog) y el reloj que dice cuándo trabajar (Workflows), todo en el mismo lugar y en cualquier nube.
que: Plataforma de datos y analítica sobre AWS, Azure y GCP, creada por los autores de Spark. Ofrece clústeres y cómputo serverless de Spark, notebooks, **Delta Lake**, **Unity Catalog** (gobierno), SQL Warehouses, Lakeflow Jobs (orquestación, antes Workflows), Auto Loader, Lakeflow Connect (ingesta), Lakeflow Spark Declarative Pipelines (antes DLT), IA y ML (Mosaic AI, MLflow) y Declarative Automation Bundles (antes Asset Bundles). Es la plataforma lakehouse más usada.
ejemplo: Un pipeline que lee archivos nuevos con Auto Loader a una tabla Delta bronze, la limpia a silver con PySpark y crea marts gold que consulta Power BI vía SQL Warehouse.
para: Ingeniería de datos, analítica y ML sobre el lago con una sola plataforma.
cuidado: Los clústeres prendidos cuestan DBUs más las máquinas de la nube: configura autoapagado y usa job clusters para producción.
ver: Lakehouse, Delta Lake, Unity Catalog, DBU

## Notebook
alias: cuaderno, jupyter, notebooks
nino: Es un **cuaderno donde escribes un poco, pruebas, ves el resultado y sigues escribiendo**: como hacer la tarea de matemáticas mostrando cada paso.
que: Documento interactivo de **celdas** con código (Python, SQL, Scala) y texto, que se ejecutan una por una mostrando el resultado abajo. Jupyter es el estándar abierto; Databricks, Colab, Fabric y BigQuery Studio tienen los suyos.
ejemplo: Celda 1: `df = spark.read.table("silver.pedidos")` · Celda 2: `display(df.groupBy("ciudad").count())` → muestra una tabla y un gráfico.
para: Explorar datos, prototipar y documentar análisis.
cuidado: Los notebooks fomentan el desorden (celdas ejecutadas fuera de orden, estado oculto). Para producción, extrae la lógica a módulos con pruebas y versiónalos en Git.
ver: Databricks, Python

## Delta Lake
alias: delta, tabla delta
nino: Imagina una **carpeta de dibujos con un cuaderno de registro**: cada vez que agregas, cambias o borras dibujos, lo anotas. Así nunca se mezclan los cambios de dos personas y puedes ver cómo estaba la carpeta ayer.
que: Un **formato de tabla abierto** sobre archivos Parquet más un **registro de transacciones** (`_delta_log/`, archivos JSON y checkpoints) que agrega a un data lake: transacciones ACID, `UPDATE`/`DELETE`/`MERGE`, esquema validado y evolucionable, *time travel*, y optimizaciones (OPTIMIZE, Z-order, Liquid Clustering). Es el formato por defecto de Databricks.
ejemplo:
```sql
MERGE INTO silver.clientes t USING updates s ON t.cliente_id = s.cliente_id
WHEN MATCHED THEN UPDATE SET *
WHEN NOT MATCHED THEN INSERT *;
DESCRIBE HISTORY silver.clientes;
```
para: Tablas confiables y editables sobre almacenamiento barato.
ver: Formato de tabla abierto, Time travel, ACID, Lakehouse

## Time travel
alias: viaje en el tiempo, versionAsOf, timestampAsOf
nino: Es una **máquina del tiempo para tus tablas**: puedes preguntar "¿cómo estaba esta tabla el martes a las 10?" y ver exactamente eso.
que: Consultar una versión anterior de una tabla Delta o Iceberg gracias a su registro de transacciones: `VERSION AS OF 12` o `TIMESTAMP AS OF '2024-12-01'`. Permite comparar, auditar y restaurar (`RESTORE TABLE … TO VERSION AS OF 12`). En BigQuery existe `FOR SYSTEM_TIME AS OF` (hasta 7 días).
ejemplo:
```sql
SELECT COUNT(*) FROM silver.pedidos VERSION AS OF 41;  -- antes del borrado accidental
RESTORE TABLE silver.pedidos TO VERSION AS OF 41;
```
para: Recuperarse de errores, auditar cambios y reproducir resultados.
cuidado: Solo se puede volver hasta donde `VACUUM` no haya borrado los archivos viejos (7 días por defecto).
ver: Delta Lake, VACUUM

## OPTIMIZE
alias: compactación, small files, archivos pequeños
nino: Si en tu cajón hay **mil papelitos sueltos**, tardas mucho en encontrar algo. OPTIMIZE es **juntar los papelitos en unos pocos cuadernos ordenados**.
que: Comando de Delta que **compacta** muchos archivos pequeños en archivos grandes (~1 GB) y, opcionalmente, los ordena (`ZORDER BY` o Liquid Clustering) para que los filtros salten más datos. El problema de los archivos pequeños aparece con streaming, cargas frecuentes y particiones de más.
ejemplo: `OPTIMIZE silver.eventos WHERE fecha >= current_date() - 7;` → de 48.000 archivos de 200 KB a 40 archivos de 1 GB.
para: Consultas mucho más rápidas en tablas que reciben datos seguido.
ver: VACUUM, Liquid Clustering, Delta Lake

## VACUUM
alias: vacuum, limpieza de archivos
nino: Después de reordenar el cajón, quedan **cuadernos viejos que ya nadie usa**. VACUUM **los tira a la basura** para liberar lugar, pero espera unos días por si alguien todavía los necesita.
que: Comando de Delta que **borra archivos de datos que ya no pertenecen a la versión actual** de la tabla y son más viejos que el período de retención (7 días por defecto). Reduce el costo de almacenamiento, pero limita hasta dónde se puede hacer time travel.
ejemplo: `VACUUM silver.eventos RETAIN 168 HOURS;`
para: No pagar por archivos huérfanos.
cuidado: Bajar la retención a 0 puede romper lectores o streams que aún usan versiones anteriores y elimina el time travel.
ver: Time travel, OPTIMIZE

## Liquid Clustering
alias: cluster by, clustering líquido
nino: Es un **cajón que se ordena solo** según cómo buscas las cosas, y que puedes cambiar de orden sin tener que vaciarlo entero.
que: Técnica de Delta (y similar a las tablas *clustered* de BigQuery) que agrupa físicamente los datos por una o más columnas (`CLUSTER BY (cliente_id, fecha)`) de forma incremental, reemplazando el particionamiento y Z-order. Las claves se pueden cambiar sin reescribir todo, y con `CLUSTER BY AUTO` Databricks las elige.
ejemplo: `CREATE TABLE gold.eventos (…) CLUSTER BY (usuario_id, fecha);` luego `OPTIMIZE gold.eventos;` agrupa los datos nuevos.
para: Filtros rápidos sin el problema de demasiadas particiones.
ver: OPTIMIZE, Partición, Delta Lake

## Unity Catalog
alias: uc, unity
nino: Es el **gran catálogo de la biblioteca** con guardia incluido: dice qué libros hay, dónde está cada uno, de dónde salió, y quién puede leer cada uno.
que: La capa de **gobierno** de Databricks: un único metastore por región con jerarquía `catálogo.esquema.tabla` (también vistas, volúmenes, funciones y modelos), permisos con `GRANT`, linaje automático por columna, auditoría, etiquetas, filtros de fila y máscaras de columna, y acceso a almacenamiento mediante *storage credentials* y *external locations*.
ejemplo:
```sql
GRANT USE CATALOG ON CATALOG prod TO `analistas`;
GRANT SELECT ON SCHEMA prod.gold TO `analistas`;
SELECT * FROM prod.gold.fct_ventas;
```
para: Saber qué datos hay, quién los usa y controlar el acceso en un solo lugar.
ver: Gobierno de datos, Linaje, Catálogo de datos, Volume

## Volume
alias: volumen de unity catalog, /Volumes
nino: Es una **carpeta normal dentro del catálogo**: para guardar archivos sueltos (CSV, imágenes, PDFs) con los mismos permisos que las tablas.
que: Un objeto de Unity Catalog que gobierna **archivos no tabulares** en almacenamiento en la nube, accesibles por la ruta `/Volumes/catálogo/esquema/volumen/…`. Puede ser *managed* o *external*.
ejemplo: `df = spark.read.csv("/Volumes/prod/bronze/aterrizaje/banco/2024-12-01.csv", header=True)`
para: Archivos de entrada, librerías y modelos con gobierno, sin montar rutas.
ver: Unity Catalog, Auto Loader

## Auto Loader
alias: cloudFiles, autoloader
nino: Es un **ayudante que vigila la puerta del depósito**: cada vez que llega un archivo nuevo, lo carga a la tabla, y se acuerda de cuáles ya cargó para no repetirlos.
que: Fuente de Structured Streaming de Databricks (`format("cloudFiles")`) que detecta y procesa **solo los archivos nuevos** de una ruta, con estado en el *checkpoint* (exactamente una vez), inferencia y evolución de esquema, y una columna `_rescued_data` para lo que no encaja. Corre continuo o con `trigger(availableNow=True)` como batch incremental.
ejemplo:
```python
(spark.readStream.format("cloudFiles")
   .option("cloudFiles.format", "json")
   .option("cloudFiles.schemaLocation", "/Volumes/prod/chk/pedidos_schema")
   .load("/Volumes/prod/bronze/aterrizaje/pedidos/")
 .writeStream.option("checkpointLocation", "/Volumes/prod/chk/pedidos")
   .trigger(availableNow=True).toTable("prod.bronze.pedidos"))
```
para: Ingesta incremental de archivos sin llevar la cuenta a mano.
ver: Structured Streaming, Ingesta, Incremental

## Asset Bundles
alias: databricks asset bundles, dab, dabs, declarative automation bundles, databricks.yml
nino: Es una **caja de mudanza con etiqueta**: guardas juntos el código, los jobs y su configuración, y con un comando instalas todo igualito en desarrollo o en producción.
que: La forma de Databricks de definir proyectos como código: un `databricks.yml` con recursos (jobs, pipelines, clústeres, permisos) y *targets* (dev, prod). Se valida, despliega y ejecuta con la CLI (`databricks bundle validate|deploy|run`) desde tu máquina o CI/CD. En marzo de 2026 pasaron a llamarse **Declarative Automation Bundles**; el archivo y los comandos no cambiaron.
ejemplo:
```yaml
bundle: {name: ventas}
resources:
  jobs:
    ventas_diarias:
      tasks: [{task_key: silver, notebook_task: {notebook_path: ./src/silver.py}}]
targets:
  dev: {mode: development, default: true}
  prod: {workspace: {host: https://adb-123.azuredatabricks.net}}
```
para: Versionar y desplegar todo lo de Databricks igual que el software.
ver: CI/CD, IaC, Databricks

## Secret scope
alias: dbutils.secrets, secret scopes
nino: Es una **cajita con candado dentro de Databricks** para guardar contraseñas. Los notebooks pueden usarlas, pero si alguien intenta mostrarlas en pantalla, aparece `[REDACTED]`.
que: Un contenedor de secretos en Databricks (propio o respaldado por Azure Key Vault) con permisos por scope. Se leen con `dbutils.secrets.get(scope, key)` y el valor se oculta en las salidas de los notebooks.
ejemplo: `pwd = dbutils.secrets.get("pg-ventas", "password")` y `databricks secrets put-secret pg-ventas password` desde la CLI.
para: Usar credenciales en notebooks y jobs sin escribirlas.
ver: Secreto, Key Vault

## DBU
alias: databricks unit
nino: Es la **ficha del juego**: cada máquina de Databricks gasta cierta cantidad de fichas por hora, y al final del mes pagas las fichas que usaste.
que: *Databricks Unit*: la unidad de consumo de Databricks; cada tipo de cómputo consume DBU/hora según tamaño y tipo (jobs, all-purpose, SQL, serverless), con precios distintos. En las nubes, además, pagas las máquinas virtuales (salvo en serverless, que lo incluye).
ejemplo: Un clúster all-purpose que consume 6 DBU/h a US$0,55 = US$3,30/h más las VM. El mismo trabajo como *job cluster* cuesta bastante menos por DBU.
para: Estimar y optimizar costos de Databricks.
cuidado: Los clústeres interactivos (all-purpose) son los más caros: no los uses para jobs programados.
ver: Databricks, Presupuesto

## SQL Warehouse
alias: databricks sql, sql endpoint
nino: Es la **ventanilla de preguntas** de Databricks: los analistas y los tableros hacen preguntas en SQL y ella responde rápido, sin tener que saber de Spark.
que: Cómputo de Databricks optimizado para SQL y BI (motor Photon), en modalidad clásica, pro o serverless, con autoescalado y autoapagado. Power BI, Tableau, dbt y el editor SQL se conectan a él.
ejemplo: dbt corre los modelos contra un SQL Warehouse serverless que se prende en segundos y se apaga a los 10 minutos sin uso.
para: Servir el lakehouse a BI y analistas.
ver: Databricks, Data warehouse

## External location
alias: ubicación externa, storage credential
nino: Es un **permiso escrito para entrar a un depósito de afuera**: dice "esta carpeta de la nube se puede usar, y con esta llave".
que: En Unity Catalog, un objeto que une una ruta de almacenamiento (`abfss://…`, `s3://…`) con una **storage credential** (managed identity o rol de IAM), y sobre el que se otorgan permisos para crear tablas externas o volúmenes.
ejemplo: `CREATE EXTERNAL LOCATION lago_bronze URL 'abfss://bronze@stlago.dfs.core.windows.net/' WITH (STORAGE CREDENTIAL mi_identidad);`
para: Acceder al almacenamiento sin repartir claves y con permisos auditables.
ver: Unity Catalog, Managed identity, Rol

## Lakeflow Spark Declarative Pipelines
alias: lakeflow declarative pipelines, sdp, dlt, delta live tables, pipelines declarativos
nino: Es como **darle a la cocina la receta final** en vez de explicar cada paso: dices qué tablas quieres y de dónde salen, y Databricks decide el orden, reintenta si algo falla y vigila la calidad.
que: El framework declarativo de Databricks para pipelines batch y streaming (antes **Delta Live Tables**, DLT). Se escriben con `from pyspark import pipelines as dp`: `@dp.table` crea una **streaming table**, `@dp.materialized_view` una **vista materializada**, y `dp.create_auto_cdc_flow` aplica CDC (SCD tipo 1 o 2). Las **expectations** validan calidad (registrar, descartar o fallar).
ejemplo:
```python
from pyspark import pipelines as dp

@dp.table
@dp.expect_or_drop("monto_valido", "monto > 0")
def ventas_silver():
    return spark.readStream.table("bronze.ventas")
```
para: Construir pipelines confiables sin programar a mano el orden, los reintentos ni los checkpoints.
cuidado: Las vistas materializadas se recalculan (de forma incremental si se puede); para datos que solo se agregan, usa streaming tables.
ver: Databricks, Auto Loader, CDC, Delta Lake

## Lakeflow Jobs
alias: databricks workflows, workflows, jobs de databricks
nino: Es el **reloj y el capataz** de Databricks: decide a qué hora arranca cada tarea, en qué orden, y qué hacer si una falla.
que: El orquestador de Databricks (antes **Databricks Workflows**): jobs con tareas (notebooks, scripts, SQL, dbt, pipelines, otros jobs), dependencias, condiciones `if/else`, bucles `for each`, disparadores por horario, llegada de archivos o cambios en tablas, reintentos, alertas y cómputo serverless.
ejemplo: Un job diario con tres tareas: ingesta con Lakeflow Connect → pipeline declarativo silver → tarea SQL que refresca el tablero, con alerta por correo si falla.
para: Orquestar todo lo que vive dentro de Databricks sin un Airflow aparte.
ver: Databricks, Orquestación, Asset Bundles

## Lakeflow Connect
alias: conectores administrados de databricks
nino: Son **mangueras ya armadas** que traen datos de otros sistemas (Salesforce, SQL Server, SharePoint) hasta tu lago sin que tengas que fabricarlas.
que: Los conectores de ingesta administrados de Databricks: conectores para aplicaciones SaaS (Salesforce, Workday, ServiceNow, Google Analytics) y bases de datos (SQL Server, MySQL, PostgreSQL) con **CDC**, que escriben en tablas gobernadas por Unity Catalog. Para archivos se usa Auto Loader.
ejemplo: Un conector de SQL Server lee el change tracking de la base de pedidos y mantiene actualizada `bronze.pedidos` cada 15 minutos.
para: Ingerir de fuentes comunes sin escribir ni mantener código de extracción.
ver: Databricks, CDC, Auto Loader


## Genie Agent
alias: genie space, genie spaces, genie agents, ai/bi genie, espacio de genie
nino: Es como **un ayudante que conoce muy bien un solo tema** (por ejemplo, las ventas de la tienda): le preguntas en tu idioma y te responde mirando los datos de verdad, porque alguien del equipo le explicó qué significa cada cosa.
que: En Databricks, un espacio de conversación en lenguaje natural sobre un conjunto de tablas, vistas o vistas de métricas de Unity Catalog (hasta 50), configurado por el equipo de datos con descripciones, sinónimos, SQL expressions, consultas de ejemplo e instrucciones. Genie convierte cada pregunta en SQL, la ejecuta en un SQL warehouse y devuelve tabla, resumen y gráfico. Los datos se leen con los permisos de Unity Catalog de quien pregunta. Hasta 2026 se llamaba Genie Space.
ejemplo: El agente "Ventas de Tienda Andina" con la vista `ventas_lineas` y la vista de métricas `metricas_ventas` responde "¿cuánto vendió el local en marzo?" con `WHERE canal = 'tienda' AND mes = '2024-03'`.
para: Que las personas de negocio respondan sus propias preguntas de datos con las definiciones oficiales.
cuidado: La calidad depende del contexto: pocas tablas bien documentadas, definiciones estructuradas antes que instrucciones de texto, y benchmarks para medir.
ver: Genie One, Genie Code, Vista de métricas, Benchmark de Genie, Unity Catalog

## Genie One
alias: databricks one, genie one
nino: Es **la puerta de entrada fácil** a los datos para quien no es técnico: ve sus tableros y le pregunta cosas a Genie sin ver nada complicado.
que: La interfaz simplificada de Databricks para personas de negocio: tableros de AI/BI, preguntas en lenguaje natural y Databricks Apps, sin notebooks, clústeres ni consultas a la vista. Existe a nivel de workspace (con el entitlement Consumer access) y a nivel de cuenta. Antes se llamaba Databricks One.
ejemplo: Una gerente con permiso Consumer access entra al workspace y aterriza en Genie One, donde ve el tablero de ventas y el agente de ventas.
para: Dar acceso a datos e IA a toda la empresa con el mínimo de complejidad.
cuidado: Genie One muestra lo que se comparte con cada usuario: los tableros y agentes tienen que estar bien hechos y compartidos con los grupos correctos.
ver: Genie Agent, Unity Catalog

## Genie Code
alias: databricks assistant, asistente de databricks
nino: Es **un compañero que programa a tu lado**: le pides "limpia esta tabla" y te propone el código, pero tú lo revisas antes de usarlo.
que: El asistente de código de Databricks para personas técnicas (antes Databricks Assistant). Genera, explica, optimiza y corrige código en notebooks, el editor de SQL, Lakeflow, tableros y archivos; comandos `/explain`, `/fix`, `/doc`, `/optimize`, `/findTables`; Quick Fix y Diagnose Error; instrucciones personales en `.assistant_instructions.md`. Usa los permisos de Unity Catalog del usuario. Se cobra por uso desde julio de 2026, con una cantidad gratuita mensual por usuario.
ejemplo: En una celda con error, `/fix` muestra la corrección en una vista de diferencias; al aceptarla, el código queda en la celda sin ejecutarse.
para: Escribir, entender y corregir código más rápido dentro de Databricks.
cuidado: Revisa siempre el código antes de ejecutarlo; puede equivocarse en reglas de negocio, nulos o idempotencia.
ver: Genie Agent, Notebook

## Vista de métricas
alias: metric view, metric views, vistas de métricas
nino: Es **una receta oficial de cada número importante**: "ventas" se calcula siempre igual, y después puedes pedirlo por mes, por país o por lo que quieras.
que: Un objeto de Unity Catalog que define, en YAML, medidas (cálculos como ventas netas o ticket promedio) por separado de los campos por los que se agrupa (mes, país, canal). Se crea con `CREATE VIEW ... WITH METRICS LANGUAGE YAML AS $$ ... $$` y se consulta con `MEASURE(nombre)`. Las medidas pueden reutilizar otras con `MEASURE()`. Es la base de la capa semántica de Databricks y la usan Genie, los tableros y herramientas de BI.
ejemplo: `SELECT pais, MEASURE(ticket_promedio) FROM metricas_ventas GROUP BY pais` calcula ventas ÷ pedidos por país, aunque la vista no fue definida "por país".
para: Tener una sola definición de cada indicador en toda la empresa.
cuidado: Una vista común congela el grano y las agregaciones; una vista de métricas no. No dupliques las mismas medidas como SQL expressions en Genie.
ver: Genie Agent, Capa semántica

## Benchmark de Genie
alias: benchmarks, benchmark genie
nino: Es **el examen de práctica del ayudante**: le haces las mismas preguntas con sus respuestas correctas y ves cuántas acierta después de cada cambio.
que: Una pregunta de prueba de un Genie Agent con su respuesta correcta en SQL (SQL Answer). Al correr los benchmarks, Genie compara el resultado de su consulta con el de la respuesta: es Good si coincide (aunque cambie el orden o redondeando a 4 cifras significativas) y Bad si está vacío, da error o tiene columnas de más; sin SQL Answer queda en revisión manual. Los benchmarks no se usan como contexto para responder.
ejemplo: Tres variantes ("ventas del local en marzo", "facturación del canal tienda en 2024-03"...) con el mismo SQL Answer; la exactitud sube de 70 % a 95 % después de agregar sinónimos.
para: Medir la calidad del agente y detectar regresiones después de cada cambio.
cuidado: Usa varias formas de cada pregunta y un SQL Answer con exactamente las columnas esperadas.
ver: Genie Agent

## Databricks Runtime
alias: runtime, dbr, databricks runtime ml
nino: Es **el paquete de software que viene instalado en las máquinas de Databricks**: una versión de Spark con todas sus herramientas, probadas para que funcionen juntas.
que: La imagen de software de los clústeres de Databricks: una versión de Apache Spark más Delta Lake, Photon, bibliotecas de Python y conectores, con un número de versión (por ejemplo, 15.4 LTS). Las versiones **LTS** tienen soporte largo; la variante **ML** agrega bibliotecas de machine learning. El cómputo serverless usa una versión que administra Databricks.
ejemplo: Un job de producción fijado en una versión LTS para que una actualización no cambie el comportamiento sin aviso.
para: Saber qué versión de Spark y de las bibliotecas corre tu código.
cuidado: Al cambiar de versión mayor (por ejemplo, a una basada en Spark 4) pueden cambiar comportamientos, como el modo ANSI: prueba los jobs antes de migrarlos.
ver: Databricks, Spark, Cluster
