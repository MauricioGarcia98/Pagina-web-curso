# area: Databricks

## Databricks
alias: databricks lakehouse platform
nino: Databricks es un **taller completo para trabajar con datos**: trae las máquinas (Spark), la mesa de trabajo (notebooks), los cajones ordenados (Delta y Unity Catalog) y el reloj que dice cuándo trabajar (Workflows), todo en el mismo lugar y en cualquier nube.
que: Plataforma de datos y analítica sobre AWS, Azure y GCP, creada por los autores de Spark. Ofrece clústeres y cómputo serverless de Spark, notebooks, **Delta Lake**, **Unity Catalog** (gobierno), SQL Warehouses, Workflows (orquestación), Auto Loader, DLT/Lakeflow (pipelines declarativos), ML y Asset Bundles. Es la plataforma lakehouse más usada.
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
alias: databricks asset bundles, dab, databricks.yml
nino: Es una **caja de mudanza con etiqueta**: guardas juntos el código, los jobs y su configuración, y con un comando instalas todo igualito en desarrollo o en producción.
que: La forma de Databricks de definir proyectos como código: un `databricks.yml` con recursos (jobs, pipelines, clústeres, permisos) y *targets* (dev, prod). Se valida, despliega y ejecuta con la CLI (`databricks bundle validate|deploy|run`) desde tu máquina o CI/CD.
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
