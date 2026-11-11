# examen: cert-databricks
# id: dbx-de-associate
# titulo: Databricks Data Engineer Associate

## Plano de control
leccion: cert-databricks-plataforma-computo
Una empresa con cómputo clásico pregunta dónde se procesan sus datos de ventas cuando corre un job de Spark. ¿Qué respondes?
- [ ] En el plano de control de Databricks, que ejecuta Spark para todos los clientes.
- [x] En máquinas virtuales dentro de la cuenta de nube de la empresa.
- [ ] En el almacenamiento administrado de Unity Catalog, que también procesa.
- [ ] En el navegador del usuario que abrió el notebook.
porque: En cómputo clásico, el plano de cómputo son VMs en la cuenta de nube del cliente. El plano de control (Databricks) coordina, pero no procesa los datos del job.

## Cómputo para BI
leccion: cert-databricks-plataforma-computo
Los analistas conectan Power BI para consultar las tablas gold durante el horario laboral. Quieren arranque rápido y no pagar fuera de horario. ¿Qué cómputo usan?
- [ ] Un clúster all-purpose con autoapagado de 2 horas.
- [ ] Un job cluster que se crea con cada consulta del tablero.
- [x] Un SQL warehouse serverless con autoapagado.
- [ ] Un clúster en modo Dedicated asignado al grupo de analistas.
porque: Los SQL warehouses están pensados para BI y SQL; el serverless arranca en segundos y se apaga solo cuando no hay consultas.

## Auto Loader y esquema
leccion: cert-databricks-ingesta
Los archivos JSON de pedidos empiezan a traer a veces el campo `total` como texto ("N/A"). El equipo no quiere que el stream falle ni perder esos valores. ¿Qué pasa con ellos si Auto Loader infiere `total` como número?
- [ ] La fila completa se descarta y queda un aviso en el log.
- [ ] El stream falla hasta que alguien cambie el tipo de la columna.
- [x] El valor queda en la columna `_rescued_data` y `total` queda nulo en esa fila.
- [ ] Auto Loader convierte "N/A" en 0 para mantener el tipo numérico.
porque: Los valores que no encajan con el tipo esperado se guardan en `_rescued_data`, así no se pierden ni se rompe el stream.

## COPY INTO vs Auto Loader
leccion: cert-databricks-ingesta
Una vez por semana, un analista carga desde SQL unos 30 archivos CSV nuevos que deja un proveedor en un volumen. Si repite el comando por error, no debe duplicar filas. ¿Qué es lo más simple?
- [x] `COPY INTO`
- [ ] Auto Loader en modo continuo con notificaciones de archivos.
- [ ] `CREATE OR REPLACE TABLE ... AS SELECT * FROM read_files(...)` cada semana.
- [ ] Un `INSERT INTO ... SELECT * FROM read_files(...)` cada semana.
porque: `COPY INTO` es SQL, simple e idempotente: saltea los archivos ya cargados. Las otras opciones reemplazan o duplican, y un stream continuo es excesivo para 30 archivos por semana.

## Checkpoint
leccion: cert-databricks-ingesta
Un ingeniero borró la carpeta de checkpoint de un stream de Auto Loader y lo reinició. ¿Qué ocurre?
- [ ] Nada: Auto Loader consulta la tabla de destino para saber qué archivos ya cargó antes.
- [x] Vuelve a procesar todos los archivos de la ruta y aparecen duplicados.
- [ ] El stream se niega a iniciar hasta que alguien restaure el checkpoint desde un respaldo.
- [ ] Solo se pierde el esquema inferido, pero los archivos ya cargados no se reprocesan.
porque: El checkpoint guarda qué archivos se procesaron. Sin él, Auto Loader empieza de cero.

## Fuentes SaaS
leccion: cert-databricks-ingesta
Hay que traer diariamente objetos de Salesforce a tablas Delta, con cargas incrementales y sin mantener código de la API. ¿Qué usas?
- [ ] Un notebook con la librería de Salesforce programado en un job.
- [x] Un conector gestionado de Lakeflow Connect.
- [ ] Lakehouse Federation con una conexión a Salesforce.
- [ ] Auto Loader apuntando al endpoint REST de Salesforce.
porque: Los conectores gestionados de Lakeflow Connect administran la autenticación, el incremental y la evolución de esquema de aplicaciones SaaS.

## Consultar sin copiar
leccion: cert-databricks-ingesta
Para una prueba de concepto, un analista necesita cruzar una tabla de PostgreSQL con una tabla Delta sin construir un pipeline. ¿Qué usa?
- [ ] Lakeflow Connect con un gateway de CDC que replique PostgreSQL a Delta cada hora.
- [ ] `COPY INTO` desde la base PostgreSQL hacia una tabla Delta temporal.
- [x] Lakehouse Federation, con PostgreSQL como catálogo foráneo.
- [ ] Delta Sharing desde PostgreSQL, con un recipient para el workspace del analista.
porque: Federation consulta la base externa en su lugar, gobernada por Unity Catalog, sin copiar datos. Es ideal para consultas puntuales.

## Deduplicar
leccion: cert-databricks-transformacion-pipelines
La tabla `clientes_raw` tiene varias versiones de cada cliente con la columna `actualizado_en`. ¿Qué consulta deja la versión más reciente de cada uno?
- [ ] `SELECT DISTINCT * FROM clientes_raw`
- [ ] `SELECT * FROM clientes_raw ORDER BY actualizado_en DESC LIMIT 1`
- [x] `SELECT * FROM clientes_raw QUALIFY ROW_NUMBER() OVER (PARTITION BY cliente_id ORDER BY actualizado_en DESC) = 1`
- [ ] `SELECT cliente_id, MAX(actualizado_en) FROM clientes_raw GROUP BY cliente_id`
porque: `QUALIFY` filtra por el resultado de la ventana: queda la primera fila de cada cliente ordenando por fecha descendente. `DISTINCT` no elimina versiones distintas y el `GROUP BY` pierde las demás columnas.

## Arrays sin explotar
leccion: cert-databricks-transformacion-pipelines
Cada pedido tiene `items ARRAY<STRUCT<precio DOUBLE, cant INT>>`. Quieres el total de cada pedido sin cambiar la cantidad de filas. ¿Qué expresión usas?
- [ ] `SUM(explode(items).precio * explode(items).cant)`
- [x] `aggregate(items, 0D, (acc, x) -> acc + x.precio * x.cant)`
- [ ] `transform(items, x -> x.precio * x.cant)`
- [ ] `filter(items, x -> x.cant > 0)`
porque: `aggregate` reduce el array a un valor por fila. `transform` devuelve otro array (no un total) y `explode` multiplicaría las filas.

## ST o MV
leccion: cert-databricks-transformacion-pipelines
En un pipeline declarativo, la tabla gold calcula el gasto total por cliente leyendo silver, donde a veces se corrigen montos de pedidos antiguos. ¿Qué tipo de objeto conviene para gold?
- [ ] Streaming table, porque procesa cada fila una sola vez.
- [x] Materialized view.
- [ ] Vista temporal del pipeline.
- [ ] Streaming table leída con `STREAM(silver)` y watermark.
porque: Una materialized view refleja los cambios de sus fuentes, incluidas correcciones. Una streaming table no vuelve a procesar filas ya vistas.

## Expectativas
leccion: cert-databricks-transformacion-pipelines
En silver, si aparece aunque sea un pedido sin `cliente_id`, el pipeline debe detenerse para que nadie use datos incompletos. ¿Qué escribes?
- [ ] `CONSTRAINT con_cliente EXPECT (cliente_id IS NOT NULL)`
- [ ] `CONSTRAINT con_cliente EXPECT (cliente_id IS NOT NULL) ON VIOLATION DROP ROW`
- [x] `CONSTRAINT con_cliente EXPECT (cliente_id IS NOT NULL) ON VIOLATION FAIL UPDATE`
- [ ] Un `WHERE cliente_id IS NOT NULL` en la definición de silver.
porque: `FAIL UPDATE` detiene la actualización ante una violación. Sin acción solo advierte, `DROP ROW` descarta y sigue, y el `WHERE` filtra sin dejar métricas.

## AUTO CDC
leccion: cert-databricks-transformacion-pipelines
Recibes el CDC de la tabla de productos y necesitas una tabla con **solo el estado actual** de cada producto, aplicando borrados. ¿Qué configuras?
- [ ] AUTO CDC con `STORED AS SCD TYPE 2`.
- [x] AUTO CDC con `STORED AS SCD TYPE 1` y `APPLY AS DELETE WHEN`.
- [ ] Una materialized view con `SELECT DISTINCT` sobre el CDC.
- [ ] Una streaming table con `INSERT` de cada cambio.
porque: SCD tipo 1 mantiene solo la versión actual; `APPLY AS DELETE WHEN` indica qué cambios son borrados.

## Run if
leccion: cert-databricks-lakeflow-jobs
Un job tiene tres tareas de carga en paralelo y una tarea `notificar_error` que debe correr solo si alguna de ellas falló. ¿Qué condición Run if le pones?
- [ ] All done
- [ ] None failed
- [x] At least one failed
- [ ] At least one succeeded
porque: *At least one failed* corre si al menos una dependencia falló. *All failed* exigiría que fallen las tres.

## Disparador por archivos
leccion: cert-databricks-lakeflow-jobs
Un banco deposita el archivo de conciliación entre las 2 y las 6 de la mañana, cada día a una hora distinta. ¿Cómo disparas el job?
- [ ] Programado cada 10 minutos entre las 2 y las 6, con una tarea que revisa si llegó.
- [x] Disparador de llegada de archivos sobre el volumen de destino.
- [ ] Disparador continuo, para que el job siempre esté esperando el archivo nuevo.
- [ ] Programado a las 6:00, cuando ya se sabe que el archivo llegó con seguridad.
porque: El disparador de llegada de archivos inicia el job apenas aparece el archivo, sin ejecuciones vacías ni esperas innecesarias.

## Pasar valores
leccion: cert-databricks-lakeflow-jobs
La tarea `contar` calcula cuántos pedidos llegaron hoy y la tarea `decidir` debe usar ese número. ¿Cómo se lo pasa?
- [ ] Escribiendo el número en una variable global de Python que comparten todas las tareas del job.
- [x] Con `taskValues.set` en `contar` y `{{tasks.contar.values.<clave>}}` en `decidir`.
- [ ] Con un parámetro de job que un operador completa a mano antes de cada ejecución diaria.
- [ ] Guardándolo en el checkpoint del stream de ingesta para que lo lea la tarea siguiente.
porque: Los task values permiten que una tarea publique valores chicos que leen las tareas posteriores o una condición If/else.

## Reparar
leccion: cert-databricks-lakeflow-jobs
Un job de 8 tareas falló en la tarea 7 por un timeout de red. Las 6 anteriores tardaron 2 horas. ¿Qué haces?
- [ ] Ejecutar el job completo otra vez, ahora con el doble de workers para que termine antes.
- [ ] Copiar el notebook de la tarea 7 y ejecutarlo a mano en un clúster interactivo.
- [x] Un repair run, que reejecuta la tarea 7 y las que dependen de ella.
- [ ] Cambiar el disparador a continuo para que el job se reintente solo hasta terminar.
porque: Repair run reutiliza los resultados de las tareas exitosas y vuelve a ejecutar solo lo que falló y lo que depende de eso.

## Git folders
leccion: cert-databricks-cicd-bundles
Un ingeniero quiere crear una rama, editar notebooks y hacer commit sin salir del workspace. ¿Qué usa?
- [ ] Para desplegar jobs y pipelines a producción sin necesidad de un proceso de CI/CD.
- [x] Para clonar un repositorio y trabajar con ramas y commits desde el workspace.
- [ ] Para guardar los secretos del proyecto cifrados junto al código fuente.
- [ ] Para reemplazar a Unity Catalog como sistema de permisos sobre notebooks.
porque: Los Git folders permiten clonar, cambiar de rama, hacer commit y push desde el workspace. Los bundles sirven para desplegar.

## Targets
leccion: cert-databricks-cicd-bundles
El mismo bundle se despliega en dev y prod, y en cada uno los jobs deben escribir en un catálogo distinto. ¿Cómo lo resuelves?
- [ ] Con dos bundles, uno por entorno, cada uno con su propia copia del código fuente.
- [x] Con una variable para el catálogo y un valor distinto en cada target.
- [ ] Editando el YAML a mano antes de cada despliegue para cambiar el nombre del catálogo.
- [ ] Con un parámetro de job que alguien cambia desde la interfaz después de desplegar en prod.
porque: Las variables con valores por target permiten desplegar el mismo código en varios entornos sin duplicarlo ni editarlo.

## Data skipping
leccion: cert-databricks-optimizacion-monitoreo
Las consultas filtran casi siempre por `region` y `fecha` sobre una tabla nueva de 3 TB. ¿Qué recomienda Databricks para organizarla?
- [ ] Particionar por `region` y `fecha`, y ejecutar ZORDER cada noche.
- [x] Liquid Clustering con `CLUSTER BY (region, fecha)`.
- [ ] Crear un índice secundario sobre ambas columnas.
- [ ] Guardarla como varias tablas, una por región.
porque: Para tablas nuevas, Liquid Clustering es la técnica recomendada: agrupa los datos por esas columnas y permite cambiar las claves sin reescribir.

## Skew
leccion: cert-databricks-optimizacion-monitoreo
En la Spark UI, el stage de un join tiene casi todas las tasks en 10 segundos y una en 25 minutos con mucho spill. ¿Cuál es la causa más probable?
- [ ] El driver tiene poca memoria y tarda en coordinar las tasks del stage del join.
- [x] Una clave del join concentra la mayoría de las filas (skew).
- [ ] El clúster tiene demasiados workers y las tasks compiten por la red durante el shuffle.
- [ ] Photon está activado y no soporta joins con claves de tipo texto en este stage.
porque: Una task mucho más lenta que el resto en el mismo stage, con spill, es el síntoma típico de skew.

## Permisos completos
leccion: cert-databricks-gobierno-seguridad
Un grupo debe poder **leer y escribir** filas en `prod.silver.pedidos`, y nada más. Ya tiene `USE CATALOG` y `USE SCHEMA`. ¿Qué le das?
- [ ] `ALL PRIVILEGES` sobre el esquema `prod.silver`.
- [x] `SELECT` y `MODIFY` sobre la tabla.
- [ ] `CREATE TABLE` sobre el esquema.
- [ ] Ownership de la tabla.
porque: `SELECT` permite leer y `MODIFY` insertar, actualizar y borrar. Las otras opciones dan mucho más de lo necesario.

## Managed vs external
leccion: cert-databricks-gobierno-seguridad
Otro sistema fuera de Databricks escribe archivos Parquet en una ruta que no se puede mover, y hay que consultarlos como tabla. ¿Qué tipo de tabla creas?
- [ ] Una tabla administrada creada con CTAS, que copia los archivos al almacenamiento de UC.
- [x] Una tabla externa con `LOCATION` en una external location.
- [ ] Una vista temporal sobre `read_files` que se crea cada vez que alguien abre una sesión.
- [ ] Una materialized view sobre la ruta, que se refresca cuando el otro sistema escribe.
porque: Cuando los archivos los administra otro sistema y deben quedar en su ruta, se usa una tabla externa sobre una external location.

## Row filter
leccion: cert-databricks-gobierno-seguridad
Cada gerente debe ver solo los pedidos de su país en `prod.silver.pedidos`, desde cualquier herramienta y sin crear vistas aparte. ¿Qué aplicas?
- [ ] Una vista por país, con permisos de `SELECT` sobre cada vista para su gerente.
- [x] Un row filter sobre la tabla, con una función que evalúa el grupo del usuario.
- [ ] Una column mask sobre la columna `pais`, que oculta los países que no le corresponden.
- [ ] Particionar la tabla por país y dar permisos de lectura sobre cada partición.
porque: El row filter se aplica a la tabla misma para cualquier consulta. La column mask oculta valores de una columna, no filas.

## Compartir con un socio
leccion: cert-databricks-gobierno-seguridad
Un socio con su propia cuenta de Databricks en otra región necesita leer una tabla gold actualizada, sin copias ni archivos exportados. ¿Qué usas?
- [ ] Lakehouse Federation desde el workspace del socio.
- [x] Delta Sharing de Databricks a Databricks.
- [ ] Un clean room.
- [ ] Un job que copie la tabla al workspace del socio cada noche.
porque: Delta Sharing comparte la tabla en vivo y sin copias; entre cuentas de Databricks se usa la modalidad Databricks a Databricks.

## Costos
leccion: cert-databricks-plataforma-computo
El gerente pide saber cuánto gastó cada job el mes pasado. ¿De dónde sacas el dato?
- [ ] De la Spark UI de cada ejecución, sumando la duración de los stages de cada job.
- [ ] Del event log de cada pipeline, que registra los DBU de cada actualización.
- [x] De `system.billing.usage` por `usage_metadata.job_id`, con `system.billing.list_prices`.
- [ ] De `system.access.audit`, filtrando las acciones de ejecución de jobs del último mes.
porque: Las tablas de facturación registran el consumo por recurso, y `list_prices` da el precio vigente en cada momento.

## @caso logistica: Rutas Andinas
Rutas Andinas es una empresa de transporte con 1.200 camiones. Cada camión envía un archivo JSON con su posición cada minuto a un volume de Unity Catalog (`/Volumes/prod/raw/gps/`). Además, el sistema de facturación vive en una base SQL Server on-premises y el equipo comercial usa Salesforce.

Requisitos del proyecto:
- Las posiciones deben estar en una tabla bronze en menos de 5 minutos, sin reprocesar archivos ya leídos.
- Los JSON cambian de esquema cada tanto (se agregan sensores nuevos) y no se puede perder ningún campo.
- Silver debe descartar posiciones con latitud fuera de rango y dejar constancia de cuántas se descartaron.
- Todo el pipeline debe correr como un job diario con alertas por correo si falla, y desplegarse igual en dev y prod desde Git.

## Ingesta incremental de posiciones
leccion: cert-databricks-ingesta
dominio: 2
caso: logistica
¿Qué opción cumple el requisito de ingerir las posiciones en bronze de forma incremental y sin reprocesar archivos?
- [ ] Un `spark.read.json` programado cada 5 minutos que lee toda la carpeta y hace `overwrite`.
- [x] Auto Loader (`cloudFiles`) con un checkpoint, que solo lee los archivos nuevos.
- [ ] Un `COPY INTO` por cada archivo, lanzado manualmente desde un notebook.
- [ ] Una vista sobre la carpeta de JSON que se consulta directamente desde silver.
porque: Auto Loader registra en el checkpoint qué archivos ya procesó y escala a millones de archivos; es la forma recomendada de ingesta incremental de archivos.

## Esquema que cambia
leccion: cert-databricks-ingesta
dominio: 2
caso: logistica
Los camiones nuevos agregan el campo `temperatura_carga`. ¿Qué configuración de Auto Loader evita perderlo?
- [ ] `cloudFiles.schemaEvolutionMode` en `none`, para que el esquema sea siempre el mismo.
- [x] `cloudFiles.schemaLocation` con `schemaEvolutionMode` en `addNewColumns` (el valor por defecto).
- [ ] Inferir el esquema con `samplingRatio` de 0,01 para que sea más rápido.
- [ ] Convertir los JSON a CSV antes de leerlos para fijar las columnas.
porque: Con `addNewColumns`, el stream se detiene al detectar una columna nueva, la agrega al esquema guardado y al reiniciar la incorpora; con `rescue` los campos inesperados van a `_rescued_data`.

## Calidad con constancia
leccion: cert-databricks-transformacion-pipelines
dominio: 3
caso: logistica
En el pipeline declarativo, silver debe descartar las posiciones con latitud fuera de rango y registrar cuántas se descartaron. ¿Qué usas?
- [ ] Un `filter` en el código, porque las métricas de descarte no se pueden obtener en pipelines.
- [x] Una expectation con `expect_or_drop`, cuyas métricas quedan en el event log del pipeline.
- [ ] Una expectation con `expect_or_fail`, para que el pipeline se detenga ante el primer error.
- [ ] Un constraint `CHECK` en la tabla bronze para rechazar las filas al escribir.
porque: `expect_or_drop` elimina las filas que no cumplen y registra cuántas pasaron y cuántas se descartaron en el event log; `expect_or_fail` detendría la actualización.

## Despliegue igual en dev y prod
leccion: cert-databricks-cicd-bundles
dominio: 5
caso: logistica
¿Cómo se despliegan el pipeline y el job en dev y prod con la misma definición versionada en Git?
- [ ] Exportando el job como JSON desde la interfaz y pegándolo en el workspace de prod.
- [x] Con un bundle (`databricks.yml`) con targets `dev` y `prod`, y `databricks bundle deploy -t prod`.
- [ ] Clonando el repositorio en una carpeta personal de prod y ejecutando los notebooks.
- [ ] Copiando el pipeline con el botón "Clonar" en cada workspace.
porque: Los bundles describen jobs y pipelines como código, con variables por target, y se despliegan con la CLI desde CI/CD.

## Plano de control
leccion: cert-databricks-plataforma-computo
dominio: 1
En un workspace clásico de Databricks, ¿dónde corren las máquinas de un clúster de cómputo clásico?
- [ ] En el plano de control de Databricks, junto con la interfaz web.
- [x] En el plano de cómputo, dentro de la cuenta de nube del cliente.
- [ ] En el plano de cómputo serverless, siempre administrado por Databricks.
- [ ] En el equipo del usuario, mediante Databricks Connect.
porque: El cómputo clásico se crea en la cuenta de nube del cliente; el serverless corre en la cuenta de Databricks. El plano de control aloja la interfaz, los jobs y los metadatos.

## COPY INTO
leccion: cert-databricks-ingesta
dominio: 2
Cada noche llegan 20 archivos CSV a una carpeta y deben cargarse en una tabla existente, sin duplicar los ya cargados, con una sola sentencia SQL. ¿Qué usas?
- [ ] `INSERT INTO ... SELECT * FROM csv.` con la ruta de la carpeta.
- [x] `COPY INTO` con `FILEFORMAT = CSV`.
- [ ] `CREATE OR REPLACE TABLE ... AS SELECT` sobre la carpeta.
- [ ] `MERGE INTO` sin condición de coincidencia.
porque: `COPY INTO` es idempotente: recuerda qué archivos ya cargó y los omite en las siguientes ejecuciones.

## Datos rescatados
leccion: cert-databricks-ingesta
dominio: 2
En una tabla cargada con Auto Loader aparece la columna `_rescued_data` con valores. ¿Qué significa?
- [ ] Que hubo archivos corruptos que no se pudieron leer.
- [x] Que llegaron campos que no coinciden con el esquema (nuevos o con otro tipo) y se guardaron ahí.
- [ ] Que el checkpoint se borró y se recuperaron filas de una ejecución anterior.
- [ ] Que hay filas duplicadas que Auto Loader detectó.
porque: La columna de datos rescatados guarda en JSON los campos que no encajan en el esquema para no perderlos.

## Lakeflow Connect
leccion: cert-databricks-ingesta
dominio: 2
Hay que traer los objetos de Salesforce a Databricks de forma incremental, sin escribir código de extracción ni mantener una herramienta externa. ¿Qué usas?
- [ ] Un notebook que llama a la API de Salesforce con `requests` cada hora.
- [x] Un conector administrado de Lakeflow Connect para Salesforce.
- [ ] Auto Loader apuntando a la URL de Salesforce.
- [ ] Delta Sharing desde Salesforce.
porque: Lakeflow Connect ofrece conectores administrados para SaaS y bases de datos que ingieren de forma incremental a tablas de Unity Catalog.

## JSON anidado
leccion: cert-databricks-ingesta
dominio: 2
La columna `payload` es un string JSON con un objeto anidado `cliente.direccion.ciudad`. ¿Cómo lo lees en SQL sin definir un esquema completo?
- [ ] `payload.cliente.direccion.ciudad`, porque los strings se navegan con punto.
- [x] `payload:cliente.direccion.ciudad`, la sintaxis de dos puntos para strings JSON.
- [ ] `explode(payload)` y después un `GROUP BY ciudad`.
- [ ] `CAST(payload AS MAP<STRING, STRING>)['ciudad']`.
porque: La sintaxis `columna:ruta` extrae campos de un string JSON; el punto se usa para structs ya tipados.

## Tabla externa o administrada
leccion: cert-databricks-ingesta
dominio: 2
¿Qué ocurre con los archivos de datos al ejecutar `DROP TABLE` sobre una tabla **administrada** de Unity Catalog?
- [ ] Nada: los archivos quedan en el almacenamiento hasta que alguien los borre.
- [x] Unity Catalog borra los datos (se pueden recuperar con `UNDROP` durante un período).
- [ ] Se mueven a una carpeta de papelera de la ubicación externa.
- [ ] Se convierten en una tabla externa.
porque: En las tablas administradas, Unity Catalog administra el ciclo de vida de los datos; en las externas solo se borran los metadatos.

## Deduplicar versiones
leccion: cert-databricks-transformacion-pipelines
dominio: 3
La tabla `bronze.pedidos` tiene varias versiones de cada pedido. Silver debe quedarse con la más reciente por `pedido_id` según `actualizado`. ¿Qué consulta lo hace?
- [ ] `SELECT DISTINCT * FROM bronze.pedidos`
- [x] `SELECT * FROM bronze.pedidos QUALIFY ROW_NUMBER() OVER (PARTITION BY pedido_id ORDER BY actualizado DESC) = 1`
- [ ] `SELECT pedido_id, MAX(actualizado) FROM bronze.pedidos GROUP BY pedido_id`
- [ ] `SELECT * FROM bronze.pedidos ORDER BY actualizado DESC LIMIT 1`
porque: La ventana numera las versiones por pedido y `QUALIFY` deja la primera; `DISTINCT` no elimina versiones distintas y el `GROUP BY` pierde las demás columnas.

## Streaming table o vista materializada
leccion: cert-databricks-transformacion-pipelines
dominio: 3
En un pipeline declarativo, ¿cuándo conviene una **streaming table** en vez de una vista materializada?
- [ ] Cuando la tabla agrega o une todo el historial y debe recalcularse con cada cambio.
- [x] Cuando la fuente solo agrega filas y cada fila debe procesarse una sola vez.
- [ ] Cuando la tabla es chica y se consulta desde Power BI.
- [ ] Nunca: las vistas materializadas son siempre más baratas.
porque: Las streaming tables procesan cada registro nuevo una vez (ideal para ingesta y fuentes append-only); las vistas materializadas mantienen el resultado correcto de una consulta, recalculando de forma incremental cuando pueden.

## AUTO CDC con historial
leccion: cert-databricks-transformacion-pipelines
dominio: 3
Un feed de cambios trae inserciones, actualizaciones y borrados de clientes, a veces fuera de orden. Silver debe guardar el historial (SCD tipo 2). ¿Qué usas en el pipeline declarativo?
- [ ] Un `MERGE INTO` escrito a mano en un notebook aparte.
- [x] `AUTO CDC` (`create_auto_cdc_flow`) con `sequence_by` y `stored_as_scd_type = 2`.
- [ ] Una vista materializada con `DISTINCT` sobre el feed.
- [ ] `expect_or_drop` sobre las filas con borrados.
porque: AUTO CDC aplica los cambios en el orden indicado por `sequence_by`, maneja los desordenados y mantiene SCD tipo 1 o 2.

## Joins de dimensiones chicas
leccion: cert-databricks-transformacion-pipelines
dominio: 3
Un join entre una tabla de hechos de 2 TB y una dimensión de 5 MB es lento. ¿Qué técnica suele resolverlo?
- [ ] Reparticionar la tabla de hechos en 10.000 particiones antes del join.
- [x] Un broadcast join de la dimensión (AQE lo suele elegir solo).
- [ ] Convertir la dimensión a CSV.
- [ ] Hacer el join con un `CROSS JOIN` y filtrar después.
porque: Enviar la tabla chica a cada executor evita el shuffle de la tabla grande.

## Explode
leccion: cert-databricks-transformacion-pipelines
dominio: 3
La columna `items` es un array de structs con los productos de cada pedido. ¿Cómo obtienes una fila por producto?
- [ ] `SELECT pedido_id, items[0] FROM pedidos`
- [x] `SELECT pedido_id, explode(items) AS item FROM pedidos`
- [ ] `SELECT pedido_id, flatten(items) FROM pedidos`
- [ ] `SELECT pedido_id, size(items) FROM pedidos`
porque: `explode` genera una fila por cada elemento del array.

## Capa gold
leccion: cert-databricks-transformacion-pipelines
dominio: 3
Un tablero consulta todos los días las ventas por región y mes calculadas sobre silver. ¿Qué objeto conviene para gold?
- [ ] Una vista común que recalcula todo en cada consulta del tablero.
- [x] Una vista materializada que se refresca de forma incremental.
- [ ] Una tabla temporal creada en la sesión de cada usuario.
- [ ] Un archivo CSV exportado cada mañana.
porque: La vista materializada guarda el resultado precalculado y lo actualiza al refrescarse, con lecturas rápidas para el tablero.

## Agregación en dos pasos
leccion: cert-databricks-transformacion-pipelines
dominio: 3
¿Qué dos afirmaciones sobre `GROUP BY` con `count(DISTINCT cliente_id)` en Spark son correctas?
- [x] Es más costoso que `count(*)` porque requiere eliminar duplicados.
- [x] `approx_count_distinct` da un resultado aproximado mucho más barato en tablas enormes.
- [ ] Siempre devuelve el mismo resultado que `count(cliente_id)`.
- [ ] Ignora el filtro `WHERE` de la consulta.
- [ ] Solo funciona sobre tablas particionadas por `cliente_id`.
porque: Contar distintos exige deduplicar (más shuffle y memoria); `approx_count_distinct` usa HyperLogLog con un error pequeño y configurable.

## Run if
leccion: cert-databricks-lakeflow-jobs
dominio: 4
Una tarea de limpieza debe ejecutarse siempre al final del job, aunque alguna tarea anterior haya fallado. ¿Qué configuras?
- [ ] Una dependencia normal; las tareas siguientes siempre corren.
- [x] La condición "Run if" en `All done`.
- [ ] Un segundo job programado cinco minutos después.
- [ ] Reintentos infinitos en las tareas anteriores.
porque: Con `All done`, la tarea corre cuando terminan sus dependencias, sin importar si fallaron.

## File arrival
leccion: cert-databricks-lakeflow-jobs
dominio: 4
Un job debe arrancar en cuanto llegue un archivo nuevo a una ubicación externa, no a una hora fija. ¿Qué disparador usas?
- [ ] Un disparador programado que se ejecuta cada minuto y revisa si hay archivos nuevos en la carpeta.
- [x] Un disparador de llegada de archivos (file arrival).
- [ ] Un disparador continuo, que mantiene el job siempre en ejecución aunque no haya datos.
- [ ] Una alerta de SQL que cuenta los archivos de la carpeta y ejecuta el job.
porque: El disparador de llegada de archivos inicia el job cuando aparecen archivos nuevos en la ubicación vigilada.

## Task values
leccion: cert-databricks-lakeflow-jobs
dominio: 4
La tarea `validar` calcula cuántas filas llegaron y la tarea siguiente debe usar ese número. ¿Cómo se pasa?
- [ ] Escribiéndolo en una variable global de Python, que todas las tareas del job comparten.
- [x] Con `dbutils.jobs.taskValues.set` y leyéndolo en la tarea siguiente.
- [ ] Imprimiéndolo con `print` y leyendo el log de la tarea anterior desde la siguiente.
- [ ] Guardándolo en un widget del notebook, que el job copia a todas las tareas.
porque: Los task values comparten valores pequeños entre tareas del mismo job run.

## Repair run
leccion: cert-databricks-lakeflow-jobs
dominio: 4
En un job de 12 tareas falló la décima por un error ya corregido. ¿Cómo lo terminas sin repetir las 9 tareas exitosas?
- [ ] Ejecutando el job completo de nuevo, porque las tareas no guardan su resultado.
- [x] Con "Repair run", que reejecuta las tareas fallidas y las que dependen de ellas.
- [ ] Clonando el job y borrando las primeras nueve tareas antes de ejecutarlo.
- [ ] Ejecutando a mano el notebook de la décima tarea con los parámetros del job.
porque: Repair run reutiliza los resultados exitosos y reejecuta lo que falló y lo que depende de eso.

## For each
leccion: cert-databricks-lakeflow-jobs
dominio: 4
La misma tarea debe ejecutarse para 30 países, con hasta 5 en paralelo. ¿Qué tipo de tarea usas?
- [ ] 30 tareas copiadas a mano, una por país.
- [x] Una tarea "For each" sobre la lista de países, con concurrencia 5.
- [ ] Un bucle `for` dentro del notebook que ejecuta los países en serie.
- [ ] 30 jobs separados con el mismo horario.
porque: La tarea For each ejecuta una tarea anidada por cada elemento de una lista con el paralelismo indicado.

## Avisos del job
leccion: cert-databricks-lakeflow-jobs
dominio: 4
¿Qué dos mecanismos te avisan cuando un job tarda demasiado o falla?
- [x] Notificaciones del job por correo o a un destino (Slack, webhook) ante fallas.
- [x] Un umbral de duración esperada que dispara una advertencia.
- [ ] El historial de Git del bundle.
- [ ] El catálogo de Unity Catalog.
- [ ] Un `print` al final de cada tarea.
porque: Los jobs admiten notificaciones por evento (inicio, éxito, falla) y umbrales de duración para avisar demoras.

## Git folders
leccion: cert-databricks-cicd-bundles
dominio: 5
¿Para qué sirven las Git folders en un workspace de Databricks?
- [ ] Para desplegar jobs y pipelines a producción sin necesidad de un proceso de CI/CD.
- [x] Para clonar un repositorio y trabajar con ramas y commits desde el workspace.
- [ ] Para guardar los secretos del proyecto cifrados junto al código fuente.
- [ ] Para reemplazar a Unity Catalog como sistema de permisos sobre notebooks.
porque: Las Git folders sincronizan notebooks y archivos con un proveedor Git para desarrollar con control de versiones.

## Validar el bundle
leccion: cert-databricks-cicd-bundles
dominio: 5
En CI, antes de desplegar, quieres detectar errores de configuración en `databricks.yml`. ¿Qué comando ejecutas?
- [ ] `databricks bundle run`, que ejecuta el job y muestra los errores de configuración.
- [x] `databricks bundle validate`
- [ ] `databricks jobs list`, que compara los jobs desplegados con el archivo.
- [ ] `databricks bundle destroy`, que borra el despliegue anterior antes de validar.
porque: `validate` comprueba la configuración y las variables del target sin desplegar nada.

## Modo development
leccion: cert-databricks-cicd-bundles
dominio: 5
¿Qué hace `mode: development` en un target de un bundle?
- [ ] Despliega con la identidad de un service principal y sin prefijos.
- [x] Agrega un prefijo con el usuario a los recursos y pausa los horarios, para no chocar con prod.
- [ ] Borra los recursos al terminar la ejecución.
- [ ] Desactiva las pruebas del proyecto.
porque: En modo development los recursos se nombran con el usuario y los disparadores quedan en pausa.

## Query Profile
leccion: cert-databricks-optimizacion-monitoreo
dominio: 6
Una consulta de un SQL warehouse tarda mucho. ¿Dónde ves qué operador consumió más tiempo y cuántas filas leyó cada paso?
- [ ] En el event log del pipeline, que guarda el plan de todas las consultas del warehouse.
- [x] En el Query Profile de la consulta.
- [ ] En el historial de Git del proyecto, junto con la versión del código ejecutado.
- [ ] En `DESCRIBE HISTORY` de la tabla consultada, que lista cada lectura.
porque: El Query Profile muestra el plan ejecutado con tiempos, filas y bytes por operador.

## Liquid Clustering
leccion: cert-databricks-optimizacion-monitoreo
dominio: 6
Una tabla nueva se filtra siempre por `cliente_id` y `fecha`, con valores muy desbalanceados. ¿Qué recomienda Databricks?
- [ ] Particionar por `cliente_id` y Z-ORDER por fecha.
- [x] Liquid Clustering con `CLUSTER BY (cliente_id, fecha)`.
- [ ] No hacer nada: Delta ordena solo por cualquier columna.
- [ ] Crear un índice B-tree sobre `cliente_id`.
porque: Liquid Clustering reemplaza particionado y Z-ORDER, se adapta a datos desbalanceados y se puede cambiar sin reescribir la tabla.

## Archivos chicos
leccion: cert-databricks-optimizacion-monitoreo
dominio: 6
Una tabla Delta tiene 400.000 archivos de pocos KB y las lecturas son lentas. ¿Qué la mejora?
- [ ] `VACUUM` con una retención de 0 horas para eliminar los archivos sobrantes de la tabla.
- [x] `OPTIMIZE` (o Predictive Optimization) para compactar los archivos.
- [ ] Aumentar `spark.sql.shuffle.partitions` para leer más archivos en paralelo.
- [ ] Convertir la tabla a Parquet sin Delta, que maneja mejor los archivos chicos.
porque: OPTIMIZE compacta archivos chicos en archivos grandes; VACUUM solo borra archivos que ya no se usan.

## Tablas de sistema
leccion: cert-databricks-optimizacion-monitoreo
dominio: 6
Finanzas quiere saber cuántos DBU consumió cada job el último mes. ¿Dónde se consulta?
- [ ] En `information_schema.tables`.
- [x] En `system.billing.usage`.
- [ ] En el event log de cada pipeline.
- [ ] En el Spark UI del clúster.
porque: La tabla de sistema de facturación registra el consumo por SKU y por recurso, como jobs y warehouses.

## Column mask
leccion: cert-databricks-gobierno-seguridad
dominio: 7
Solo el grupo `rrhh` debe ver el salario completo; el resto debe verlo como nulo, en la misma tabla. ¿Qué usas?
- [ ] Una vista por grupo y quitar el acceso a la tabla.
- [x] Una column mask con una función que usa `is_account_group_member('rrhh')`.
- [ ] Un row filter sobre la columna salario.
- [ ] Cifrar la columna con una clave guardada en un secreto.
porque: Las column masks aplican una función a la columna según quién consulta, sin duplicar tablas.

## Privilegios para leer
leccion: cert-databricks-gobierno-seguridad
dominio: 7
Un analista debe consultar `prod.ventas.pedidos`. ¿Qué privilegios mínimos necesita?
- [ ] `SELECT` sobre la tabla solamente.
- [x] `USE CATALOG` en `prod`, `USE SCHEMA` en `ventas` y `SELECT` en la tabla.
- [ ] `ALL PRIVILEGES` sobre el catálogo.
- [ ] Ser owner del esquema.
porque: En Unity Catalog hay que poder "usar" el catálogo y el esquema además de tener `SELECT` sobre la tabla.

## Delta Sharing
leccion: cert-databricks-gobierno-seguridad
dominio: 7
Un socio que no usa Databricks debe leer una tabla actualizada sin que copies los datos. ¿Qué usas?
- [ ] Un export diario a un bucket compartido, con una URL firmada que vence cada día.
- [x] Delta Sharing con el protocolo abierto (un recipient con token).
- [ ] Darle un usuario en tu workspace con permiso de lectura sobre el catálogo completo.
- [ ] Lakehouse Federation, que expone tus tablas como una base de datos externa.
porque: Delta Sharing comparte datos en vivo con cualquier plataforma compatible con el protocolo abierto, sin copiarlos.

## Linaje
leccion: cert-databricks-gobierno-seguridad
dominio: 7
Antes de cambiar una columna de silver, quieres saber qué tablas y tableros dependen de ella. ¿Dónde lo ves?
- [ ] En el historial de la tabla con `DESCRIBE HISTORY`, que lista las tablas que la leen.
- [x] En el linaje de Unity Catalog.
- [ ] En la Spark UI del último job que escribió la tabla de silver.
- [ ] En las notificaciones del job, que avisan a los dueños de tablas dependientes.
porque: Unity Catalog captura el linaje a nivel de tabla y columna automáticamente.

## Serverless o clásico
leccion: cert-databricks-plataforma-computo
dominio: 6
¿Qué dos ventajas tiene el cómputo serverless para jobs frente a un job cluster clásico?
- [x] Arranca en segundos, sin esperar a crear máquinas.
- [x] Databricks administra la capacidad y las versiones, sin configurar instancias.
- [ ] Permite instalar cualquier librería del sistema operativo con init scripts.
- [ ] Corre siempre en la cuenta de nube del cliente.
- [ ] Es la única opción que soporta Unity Catalog.
porque: Serverless elimina el arranque y la administración de máquinas; los init scripts y el control de instancias son del cómputo clásico.

## Nombre de tres niveles
leccion: cert-databricks-plataforma-computo
dominio: 1
Un analista escribe `SELECT * FROM ventas` y recibe "table not found", aunque la tabla existe en Unity Catalog. ¿Cuál es la forma completa de referirse a ella?
- [ ] `workspace.ventas`, porque cada workspace tiene su propio espacio de nombres.
- [x] `catalogo.esquema.ventas`, el espacio de nombres de tres niveles de Unity Catalog.
- [ ] `dbfs:/user/hive/warehouse/ventas`, la ruta física de la tabla.
- [ ] `hive_metastore.ventas`, porque Unity Catalog usa solo dos niveles de nombre.
porque: En Unity Catalog toda tabla vive en `catálogo.esquema.tabla`. Sin calificar, Databricks busca en el catálogo y esquema actuales de la sesión.

## Modo de acceso compartido
leccion: cert-databricks-plataforma-computo
dominio: 1
Diez analistas quieren compartir un mismo clúster clásico y que Unity Catalog aplique a cada uno sus propios permisos. ¿Qué modo de acceso eligen?
- [ ] Dedicated (single user), asignado al primero que lo crea.
- [ ] No isolation shared, para que todos usen la misma identidad.
- [x] Standard (antes llamado shared), con aislamiento entre usuarios.
- [ ] Cualquiera: los permisos de Unity Catalog no dependen del modo de acceso.
porque: El modo Standard permite que varios usuarios compartan el clúster con aislamiento, y Unity Catalog aplica los permisos de cada identidad. "No isolation shared" no es compatible con Unity Catalog.

## Photon
leccion: cert-databricks-plataforma-computo
dominio: 1
Un equipo tiene consultas SQL con muchos joins y agregaciones sobre tablas Delta grandes y quiere que corran más rápido sin cambiar código. ¿Qué activan?
- [x] Photon, el motor vectorizado de Databricks compatible con las APIs de Spark.
- [ ] Un clúster de un solo nodo con más memoria.
- [ ] La caché de resultados del navegador.
- [ ] El modo de alta concurrencia del notebook, que reparte las consultas entre usuarios.
porque: Photon reemplaza partes de la ejecución de Spark por un motor vectorizado en C++; acelera SQL y DataFrames sin cambiar el código.

## Volúmenes
leccion: cert-databricks-ingesta
dominio: 2
Un proveedor deja archivos CSV que el equipo quiere gobernar con Unity Catalog (permisos y linaje), sin crear todavía una tabla. ¿Dónde los guardan?
- [ ] En DBFS root, en `/FileStore/proveedor/`.
- [ ] En el disco local del driver del clúster, que se conserva entre reinicios.
- [x] En un volumen de Unity Catalog, en `/Volumes/catalogo/esquema/volumen/`.
- [ ] En un notebook, como celda de texto.
porque: Los volúmenes son el lugar gobernado por Unity Catalog para archivos no tabulares o crudos. DBFS root ya no se recomienda para datos de producción.

## read_files con pistas de esquema
leccion: cert-databricks-ingesta
dominio: 2
Al leer CSV con `read_files`, la columna `codigo_postal` se infiere como número y se pierden los ceros a la izquierda. ¿Qué haces sin declarar todas las columnas?
- [ ] Cambiar la extensión de los archivos a `.txt`.
- [x] Usar `schemaHints => 'codigo_postal STRING'` para fijar solo esa columna.
- [ ] Leer con `inferSchema => false` y convertir todo a número después.
- [ ] Agregar `LIMIT 1` a la consulta para que la inferencia de tipos sea más precisa.
porque: Las pistas de esquema fijan el tipo de algunas columnas y dejan que el resto se infiera.

## Ubicación del esquema
leccion: cert-databricks-ingesta
dominio: 2
Un stream de Auto Loader reinicia y vuelve a inferir el esquema desde cero cada vez, con resultados distintos. ¿Qué opción falta?
- [ ] `cloudFiles.maxFilesPerTrigger`
- [ ] `cloudFiles.useNotifications`
- [ ] `mergeSchema` en la escritura
- [x] `cloudFiles.schemaLocation`
porque: `schemaLocation` guarda el esquema inferido y su evolución; así los reinicios parten del mismo esquema.

## Columnas nuevas
leccion: cert-databricks-ingesta
dominio: 2
Los JSON empiezan a traer una columna `cupon`. Con el modo de evolución por defecto de Auto Loader (`addNewColumns`), ¿qué ocurre?
- [ ] La columna se ignora para siempre.
- [ ] Auto Loader convierte el archivo a CSV.
- [x] El stream se detiene una vez, actualiza el esquema y al reiniciar incluye la columna.
- [ ] Los datos de `cupon` se escriben automáticamente en otra tabla con el mismo nombre más `_nuevas`.
porque: Con `addNewColumns`, el stream falla al detectar columnas nuevas, guarda el esquema actualizado y al reiniciarse (por ejemplo, con reintentos del job) sigue con la columna agregada.

## Trigger availableNow
leccion: cert-databricks-ingesta
dominio: 2
Quieren usar Auto Loader pero pagar cómputo solo una vez por hora: procesar lo nuevo y apagar. ¿Qué trigger usan en un job programado?
- [ ] `processingTime='1 hour'` en un clúster encendido todo el día.
- [x] `availableNow=True`
- [ ] `continuous='1 second'`
- [ ] Ningún trigger: Auto Loader solo funciona en modo continuo.
porque: `availableNow` procesa todo lo pendiente en uno o varios lotes y termina; combinado con un job programado da ingesta incremental sin un clúster siempre encendido.

## MERGE para upsert
leccion: cert-databricks-ingesta
dominio: 2
Cada día llega un archivo con clientes nuevos y clientes que cambiaron de dirección. La tabla `clientes` debe quedar con una fila por cliente. ¿Qué sentencia usan?
- [ ] `INSERT INTO clientes SELECT * FROM nuevos`
- [ ] `INSERT OVERWRITE clientes SELECT * FROM nuevos`
- [x] `MERGE INTO clientes USING nuevos ON ...` con `WHEN MATCHED` y `WHEN NOT MATCHED`
- [ ] `CREATE OR REPLACE TABLE clientes AS SELECT * FROM nuevos`, que conserva las filas anteriores
porque: MERGE actualiza los que ya existen e inserta los nuevos en una sola operación atómica. Las demás duplican o borran el historial de los que no vinieron.

## Clon superficial
leccion: cert-databricks-ingesta
dominio: 2
Quieren probar un cambio de transformación sobre una copia de `gold.ventas` (2 TB) sin copiar los archivos de datos. ¿Qué usan?
- [ ] `CREATE TABLE prueba DEEP CLONE gold.ventas`
- [x] `CREATE TABLE prueba SHALLOW CLONE gold.ventas`
- [ ] `CREATE VIEW prueba AS SELECT * FROM gold.ventas` y escribir sobre la vista.
- [ ] Exportar la tabla a CSV y volver a cargarla.
porque: Un shallow clone copia solo los metadatos y apunta a los archivos originales; los cambios en el clon escriben archivos nuevos sin tocar la tabla fuente.

## Time travel
leccion: cert-databricks-transformacion-pipelines
dominio: 3
Ayer a las 15:00 alguien ejecutó un `UPDATE` erróneo sobre `silver.pedidos`. ¿Cómo ves la tabla como estaba antes?
- [ ] No se puede: Delta sobrescribe los archivos de datos en cada UPDATE y no guarda versiones anteriores.
- [ ] Restaurando el backup nocturno del almacenamiento.
- [ ] Con `SELECT * FROM silver.pedidos WHERE fecha < '15:00'`.
- [x] Con `DESCRIBE HISTORY` para encontrar la versión y `SELECT ... VERSION AS OF n` (o `TIMESTAMP AS OF`).
porque: Delta guarda versiones en su log de transacciones. Con time travel se consulta una versión anterior y con `RESTORE` se vuelve a ella.

## VACUUM y time travel
leccion: cert-databricks-transformacion-pipelines
dominio: 3
Después de correr `VACUUM` con la retención por defecto, ¿qué pasa con el time travel?
- [x] Ya no se puede volver a versiones que necesitan archivos con más de 7 días de borrados.
- [ ] Se borra todo el historial de la tabla, incluida la versión actual.
- [ ] Nada cambia: VACUUM solo compacta los archivos chicos y nunca borra archivos que use el historial.
- [ ] Se puede volver a cualquier versión porque el log sigue completo.
porque: VACUUM elimina los archivos que ya no usa la tabla y que superan la retención (7 días por defecto). Las versiones que dependían de esos archivos dejan de poder leerse.

## RESTORE
leccion: cert-databricks-transformacion-pipelines
dominio: 3
Encontraste que la versión 41 de `silver.pedidos` es la última correcta. ¿Cómo dejas la tabla así?
- [ ] `DROP TABLE` y recrearla desde los archivos crudos.
- [x] `RESTORE TABLE silver.pedidos TO VERSION AS OF 41`
- [ ] `DELETE FROM silver.pedidos WHERE _version > 41`
- [ ] `ALTER TABLE silver.pedidos SET VERSION 41`
porque: RESTORE crea una nueva versión cuyo contenido es igual al de la versión indicada; el historial se conserva.

## Funciones de orden superior
leccion: cert-databricks-transformacion-pipelines
dominio: 3
La columna `items` es un array de structs con `precio` y `cantidad`. Quieres un array solo con los items de precio mayor a 100, sin explotar la tabla. ¿Qué usas?
- [ ] `explode(items)` y luego `collect_list`.
- [ ] Un UDF de Python fila por fila.
- [ ] `PIVOT` sobre la columna `items`.
- [x] `filter(items, i -> i.precio > 100)`
porque: Las funciones de orden superior (`filter`, `transform`, `exists`, `aggregate`) trabajan sobre arrays sin explotar la tabla y sin el costo de un UDF.

## JSON en texto
leccion: cert-databricks-transformacion-pipelines
dominio: 3
La columna `payload` es un texto con JSON y quieres acceder a `payload.cliente.id` sin definir un esquema completo. ¿Qué es lo más directo en Databricks SQL?
- [x] `payload:cliente.id` (sintaxis de dos puntos para cadenas JSON).
- [ ] `payload.cliente.id`, que funciona igual sobre columnas de texto.
- [ ] `split(payload, ',')[3]`
- [ ] Guardar el texto en un volumen y leerlo con `read_files`.
porque: La sintaxis `columna:campo.subcampo` extrae valores de cadenas JSON. Para un tipo fuerte se usa `from_json` con un esquema.

## Vista temporal
leccion: cert-databricks-transformacion-pipelines
dominio: 3
En un notebook creas `CREATE TEMP VIEW recientes AS ...`. Un compañero, en su propio notebook, intenta consultarla. ¿Qué pasa?
- [ ] La ve, porque las vistas temporales se guardan en Unity Catalog.
- [x] No la ve: una vista temporal existe solo en la sesión que la creó.
- [ ] La ve solo si los dos notebooks están conectados al mismo clúster.
- [ ] La ve durante 7 días y después desaparece.
porque: Las vistas temporales son de la sesión de Spark. Para compartir, se crea una vista permanente en un esquema de Unity Catalog.

## Streaming table en SQL
leccion: cert-databricks-transformacion-pipelines
dominio: 3
En un pipeline declarativo quieres ingerir de forma incremental los JSON de un volumen. ¿Qué definición es correcta?
- [ ] `CREATE TABLE bronze USING STREAM AS SELECT * FROM '/Volumes/...'`
- [ ] `CREATE VIEW bronze AS SELECT * FROM STREAM json.'/Volumes/...'`
- [x] `CREATE OR REFRESH STREAMING TABLE bronze AS SELECT * FROM STREAM read_files('/Volumes/...', format => 'json')`
- [ ] `CREATE MATERIALIZED VIEW bronze AS SELECT * FROM read_files('/Volumes/...', format => 'json')`
porque: Una streaming table con `STREAM read_files(...)` usa Auto Loader por detrás y procesa solo los archivos nuevos en cada actualización.

## Expectativa que detiene
leccion: cert-databricks-transformacion-pipelines
dominio: 3
Un pedido sin `pedido_id` indica un error grave en la fuente: el equipo prefiere que el pipeline se detenga antes que cargar datos incompletos. ¿Qué expectativa usan?
- [ ] `CONSTRAINT id EXPECT (pedido_id IS NOT NULL)` (sin acción).
- [ ] `CONSTRAINT id EXPECT (pedido_id IS NOT NULL) ON VIOLATION DROP ROW`
- [ ] Un `WHERE pedido_id IS NOT NULL` en la consulta de la streaming table.
- [x] `CONSTRAINT id EXPECT (pedido_id IS NOT NULL) ON VIOLATION FAIL UPDATE`
porque: `FAIL UPDATE` detiene la actualización; `DROP ROW` descarta la fila y la cuenta en las métricas; sin acción, solo registra la violación y deja pasar la fila.

## Refresco completo
leccion: cert-databricks-transformacion-pipelines
dominio: 3
Se corrigió la lógica de limpieza de una streaming table y hay que reprocesar todos los archivos desde el principio. ¿Qué haces?
- [ ] Nada: la próxima actualización reprocesa todo sola.
- [x] Ejecutar un full refresh de esa tabla en el pipeline.
- [ ] Borrar los archivos de origen y volver a subirlos.
- [ ] Cambiar el pipeline a modo development y volver a ejecutarlo.
porque: Un full refresh borra el estado y los datos de la tabla y vuelve a leer toda la fuente con la lógica nueva. Una actualización normal solo procesa lo nuevo.

## Modo development del pipeline
leccion: cert-databricks-transformacion-pipelines
dominio: 3
Mientras desarrollas un pipeline declarativo quieres que el cómputo quede encendido entre corridas y que no haya reintentos automáticos que escondan errores. ¿Qué modo usas?
- [x] Development
- [ ] Production
- [ ] Continuous
- [ ] Triggered con reintentos infinitos
porque: En development el cómputo se reutiliza y no se reintenta automáticamente; production reinicia el cómputo y reintenta ante errores.

## Dependencias entre tareas
leccion: cert-databricks-lakeflow-jobs
dominio: 4
Un job tiene `ingesta_ventas` e `ingesta_clientes`, y `gold` necesita ambas. ¿Cómo lo configuras para que las dos ingestas corran en paralelo?
- [ ] Tres jobs separados programados a la misma hora.
- [ ] Una sola tarea con un notebook que llama a los otros dos.
- [x] Dos tareas sin dependencias y `gold` dependiendo de ambas.
- [ ] `gold` primero y las ingestas después.
porque: Las tareas sin dependencias entre sí corren en paralelo; `gold` espera a que terminen las dos de las que depende.

## Reintentos de tarea
leccion: cert-databricks-lakeflow-jobs
dominio: 4
La API de un proveedor falla a veces por unos minutos. La tarea que la consulta debería intentarlo de nuevo antes de marcar el job como fallido. ¿Qué configuras?
- [ ] Un clúster más grande para esa tarea.
- [x] Reintentos en esa tarea, con un intervalo entre intentos.
- [ ] Que el job corra cada 5 minutos.
- [ ] Un `try/except` en el notebook que oculte el error y devuelva éxito.
porque: Cada tarea admite reintentos con intervalo mínimo. Ocultar el error haría que el job parezca exitoso sin datos.

## Una corrida a la vez
leccion: cert-databricks-lakeflow-jobs
dominio: 4
Un job programado cada 15 minutos a veces tarda 20, y dos corridas a la vez escriben la misma tabla. ¿Qué ajuste lo evita?
- [ ] Bajar el cronograma a cada minuto.
- [ ] Agregar `time.sleep(300)` al final del notebook para que la corrida siguiente espere a la anterior.
- [ ] Usar un clúster all-purpose compartido.
- [x] Máximo de corridas concurrentes = 1 (las corridas que se superponen se saltean o esperan).
porque: Con `max_concurrent_runs = 1`, el job no inicia otra corrida mientras haya una activa.

## Cómputo para jobs
leccion: cert-databricks-lakeflow-jobs
dominio: 4
Un job nocturno usa hoy un clúster all-purpose que queda encendido todo el día. ¿Qué cambio reduce el costo sin tocar el código?
- [x] Usar cómputo serverless para jobs o un job cluster que se crea y destruye con cada corrida.
- [ ] Reiniciar el clúster all-purpose cada mañana.
- [ ] Ejecutar el notebook a mano para controlar el horario.
- [ ] Un SQL warehouse Pro para ejecutar el notebook de Python, que se apaga solo cuando termina.
porque: El cómputo de jobs (serverless o job cluster) existe solo durante la corrida y su tarifa es menor que la de all-purpose.

## Parámetros del job
leccion: cert-databricks-lakeflow-jobs
dominio: 4
El mismo job debe correr para `pais = AR` o `pais = CL` según quién lo dispare. ¿Cómo lo resuelves sin duplicar el job?
- [ ] Copiar el job y cambiar el código en cada copia.
- [ ] Leer el país de un archivo que se edita a mano antes de cada corrida.
- [x] Definir un parámetro de job `pais` y leerlo en las tareas.
- [ ] Crear un clúster distinto por país.
porque: Los parámetros de job se pasan a todas las tareas y se pueden sobrescribir al ejecutar con "Run now with different parameters" o desde la API.

## If/else
leccion: cert-databricks-lakeflow-jobs
dominio: 4
Solo si la tarea `contar_nuevos` devuelve más de 0 filas debe correr `actualizar_gold`. ¿Qué tipo de tarea usas entre ambas?
- [ ] Una tarea de notebook que siempre corre `actualizar_gold`.
- [x] Una tarea If/else condition que compara el task value con 0.
- [ ] Una tarea Run Job que llama a otro workspace.
- [ ] Un SQL alert enviado por correo a quien aprueba.
porque: La tarea If/else evalúa una condición (por ejemplo, sobre un task value) y define qué rama del job sigue.

## Tiempo máximo
leccion: cert-databricks-lakeflow-jobs
dominio: 4
Una tarea que normalmente tarda 10 minutos a veces se cuelga y queda horas corriendo. ¿Qué configuras?
- [ ] Más workers para esa tarea.
- [ ] Desactivar las notificaciones de falla.
- [ ] Un reintento infinito para que la tarea termine en algún momento.
- [x] Un timeout en la tarea, más una notificación de duración.
porque: El timeout corta la tarea si supera el tiempo y la marca como fallida; los avisos de duración alertan antes.

## Archivo del bundle
leccion: cert-databricks-cicd-bundles
dominio: 5
¿Qué archivo define un Databricks Asset Bundle (recursos, targets y variables)?
- [ ] `requirements.txt`
- [x] `databricks.yml` en la raíz del proyecto.
- [ ] `job.json` exportado desde la interfaz.
- [ ] `.databrickscfg` en la carpeta del usuario.
porque: `databricks.yml` es la configuración principal del bundle; puede incluir otros archivos YAML con los recursos.

## Desplegar a producción
leccion: cert-databricks-cicd-bundles
dominio: 5
El bundle tiene targets `dev` y `prod`. ¿Qué comando despliega a producción?
- [ ] `databricks jobs create --prod`
- [ ] `databricks bundle run prod`
- [x] `databricks bundle deploy -t prod`
- [ ] `databricks workspace import prod`
porque: `bundle deploy -t <target>` despliega los recursos del target; `bundle run` ejecuta un job o pipeline ya desplegado.

## Variables por entorno
leccion: cert-databricks-cicd-bundles
dominio: 5
El catálogo es `dev_ventas` en dev y `ventas` en prod. ¿Cómo lo maneja el bundle sin duplicar la definición del job?
- [x] Con una variable `catalogo` que cambia de valor en cada target, usada como `${var.catalogo}`.
- [ ] Con dos archivos `databricks.yml`, uno por entorno.
- [ ] Editando el job en la interfaz después de cada despliegue.
- [ ] Con una tarea previa que busca y reemplaza el nombre del catálogo en todos los notebooks.
porque: Las variables del bundle se pueden sobrescribir por target y se referencian con `${var.nombre}`.

## Identidad del CI
leccion: cert-databricks-cicd-bundles
dominio: 5
GitHub Actions despliega el bundle a producción. ¿Con qué identidad debería autenticarse?
- [ ] Con el token personal del líder del equipo.
- [ ] Con el usuario y la contraseña de un administrador.
- [ ] Sin autenticación, porque el bundle hereda los permisos de quien lo escribió.
- [x] Con un service principal (OAuth M2M o federación de identidad).
porque: Un service principal no depende de una persona y sus permisos se limitan a lo que necesita el despliegue.

## Spill a disco
leccion: cert-databricks-optimizacion-monitoreo
dominio: 6
En la Spark UI, un stage muestra mucho "spill (disk)". ¿Qué indica?
- [ ] Que la tabla tiene archivos chicos.
- [x] Que los datos de las tareas no entran en memoria y Spark escribe temporales en disco.
- [ ] Que el clúster perdió un worker y Spark está copiando sus datos a otro nodo.
- [ ] Que la consulta usa demasiadas columnas.
porque: El spill ocurre cuando una tarea maneja más datos de los que caben en memoria (por ejemplo, por skew o particiones muy grandes).

## Predictive optimization
leccion: cert-databricks-optimizacion-monitoreo
dominio: 6
El equipo olvida correr `OPTIMIZE` y `VACUUM` en las tablas administradas. ¿Qué opción de Unity Catalog lo resuelve sola?
- [ ] Un job manual por tabla que corra cada hora.
- [ ] Desactivar el time travel.
- [x] Predictive optimization.
- [ ] Convertir las tablas en externas.
porque: Predictive optimization decide cuándo correr OPTIMIZE, VACUUM y ANALYZE en las tablas administradas de Unity Catalog.

## Historial de consultas
leccion: cert-databricks-optimizacion-monitoreo
dominio: 6
Un tablero tarda 2 minutos en cargar. ¿Dónde ves cuánto tardó cada consulta del SQL warehouse y abres su perfil?
- [ ] En el log del navegador, en la pestaña de red de las herramientas de desarrollo.
- [x] En Query History, desde donde se abre el Query Profile de cada consulta.
- [ ] En `DESCRIBE HISTORY` de la tabla.
- [ ] En la pestaña de librerías del clúster.
porque: Query History lista las consultas con duración, usuario y estado; el Query Profile muestra en qué operador se fue el tiempo.

## Clave de clustering nueva
leccion: cert-databricks-optimizacion-monitoreo
dominio: 6
La tabla `ventas` tiene Liquid Clustering por `fecha`, pero ahora casi todas las consultas filtran por `tienda_id`. ¿Qué haces?
- [ ] Recrear la tabla particionada por `tienda_id`.
- [ ] Nada: Liquid Clustering detecta el filtro solo, sin cambios.
- [ ] Agregar `ZORDER BY tienda_id` en cada OPTIMIZE y mantener el Liquid Clustering por fecha.
- [x] `ALTER TABLE ventas CLUSTER BY (tienda_id)` (o incluir ambas columnas) y correr `OPTIMIZE`.
porque: Con Liquid Clustering las claves se cambian sin reescribir la tabla; OPTIMIZE reorganiza los datos con las claves nuevas. (Con `CLUSTER BY AUTO`, Databricks las elige solo.)

## Dueño de la tabla
leccion: cert-databricks-gobierno-seguridad
dominio: 7
La persona que creó `gold.ventas` dejó la empresa. ¿Qué conviene hacer?
- [x] Transferir la propiedad a un grupo: `ALTER TABLE gold.ventas OWNER TO data_engineers`.
- [ ] Borrar la tabla y recrearla.
- [ ] Dejarla así: el dueño no importa en Unity Catalog.
- [ ] Darle a todos los usuarios `ALL PRIVILEGES` sobre el catálogo para que nadie quede bloqueado.
porque: El dueño puede administrar permisos del objeto. Que sea un grupo evita depender de una persona.

## Escribir en una tabla
leccion: cert-databricks-gobierno-seguridad
dominio: 7
El grupo `etl` ya tiene `USE CATALOG`, `USE SCHEMA` y `SELECT` sobre `silver.pedidos`, pero su `INSERT` falla. ¿Qué privilegio falta?
- [ ] `CREATE TABLE`
- [ ] `READ FILES`
- [x] `MODIFY`
- [ ] `EXECUTE`
porque: `MODIFY` permite agregar, actualizar y borrar datos de la tabla. `CREATE TABLE` es para crear tablas nuevas en el esquema.

## Vista dinámica
leccion: cert-databricks-gobierno-seguridad
dominio: 7
Quieres que una vista muestre el salario completo solo a los miembros del grupo `rrhh`. ¿Qué función usas?
- [ ] `current_date()`
- [ ] `current_catalog()`
- [ ] `has_role('rrhh', current_user())`
- [x] `is_account_group_member('rrhh')`
porque: En vistas dinámicas, `is_account_group_member` permite mostrar u ocultar columnas o filas según el grupo de quien consulta.

## Credencial y ubicación externa
leccion: cert-databricks-gobierno-seguridad
dominio: 7
Unity Catalog debe leer datos de un contenedor de ADLS que ya existe. ¿Qué objetos se crean?
- [ ] Un secreto con la clave de la cuenta en cada notebook.
- [ ] Un montaje en DBFS con `dbutils.fs.mount` y la clave de la cuenta en el código del notebook.
- [x] Una storage credential (identidad administrada) y una external location que apunta a la ruta.
- [ ] Una tabla administrada vacía.
porque: La storage credential guarda cómo autenticarse; la external location asocia esa credencial a una ruta y se le dan permisos en Unity Catalog. Los montajes son el método antiguo.

## Secretos en notebooks
leccion: cert-databricks-gobierno-seguridad
dominio: 7
Un notebook necesita la contraseña de una base externa. ¿Cuál es la práctica correcta?
- [ ] Escribirla en una celda y ocultar la celda.
- [x] Leerla con `dbutils.secrets.get(scope, key)` desde un secret scope.
- [ ] Guardarla en un archivo CSV dentro de un volumen.
- [ ] Pasarla como parámetro del job en texto plano, visible solo para los dueños del job.
porque: Los secretos se guardan en un scope (respaldado por Databricks o Key Vault) y Databricks oculta su valor en las salidas.

## Auditoría
leccion: cert-databricks-gobierno-seguridad
dominio: 7
Seguridad pide saber quién leyó la tabla `gold.clientes` el mes pasado. ¿Dónde lo buscas?
- [ ] En `DESCRIBE HISTORY gold.clientes`, que registra cada lectura.
- [ ] En el Query Profile de la última consulta.
- [x] En la tabla de sistema `system.access.audit`.
- [ ] En el log del driver del clúster.
porque: Los logs de auditoría (tabla de sistema `system.access.audit`) registran accesos y acciones. `DESCRIBE HISTORY` solo registra escrituras.

## @caso clinica: Clínica del Valle
Clínica del Valle tiene 12 sedes. Cada noche, el sistema de turnos deja archivos JSON en un volumen de Unity Catalog. Hoy un analista los carga a mano con un notebook y los tableros se actualizan cuando puede.

Requisitos nuevos:
- Cargar solo los archivos nuevos cada noche, sin duplicar si se repite la corrida.
- Descartar turnos sin `paciente_id`, pero saber cuántos se descartaron.
- Los médicos ven solo los turnos de su sede; dirección ve todo.
- Si la carga falla, avisar por correo al equipo de datos.

## Carga nocturna de turnos
leccion: cert-databricks-ingesta
dominio: 2
caso: clinica
¿Qué solución de ingesta cumple el primer requisito con menos código?
- [ ] Un notebook que lee todo el volumen y hace `INSERT INTO` cada noche.
- [x] Una streaming table con `STREAM read_files(...)` que corre cada noche.
- [ ] Un `CREATE OR REPLACE TABLE` que vuelve a leer todos los archivos del volumen cada noche.
- [ ] Copiar los archivos a mano a otra carpeta después de cargarlos.
porque: La streaming table usa Auto Loader: recuerda qué archivos procesó, así una corrida repetida no duplica.

## Turnos sin paciente
leccion: cert-databricks-transformacion-pipelines
dominio: 3
caso: clinica
¿Cómo cumples el segundo requisito?
- [ ] Un `WHERE paciente_id IS NOT NULL` y contar a mano los archivos.
- [ ] `ON VIOLATION FAIL UPDATE`, para revisar cada caso.
- [x] Una expectativa con `ON VIOLATION DROP ROW`.
- [ ] Guardar los turnos sin paciente en otra columna.
porque: `DROP ROW` descarta y registra cuántas filas violaron la regla; el `WHERE` también filtra, pero no deja registro.

## Cada médico, su sede
leccion: cert-databricks-gobierno-seguridad
dominio: 7
caso: clinica
¿Qué cumple el tercer requisito sin duplicar la tabla por sede?
- [x] Un row filter que compara la sede de la fila con el grupo de quien consulta.
- [ ] Doce tablas, una por sede, con permisos distintos.
- [ ] Pedir a los médicos que filtren por su sede en el tablero y confiar en que lo hagan.
- [ ] Una column mask sobre la columna `sede`.
porque: Un row filter aplica el filtro en cada consulta según la identidad. Una column mask oculta valores de una columna, no filas.

## Aviso de falla
leccion: cert-databricks-lakeflow-jobs
dominio: 4
caso: clinica
¿Cómo cumples el cuarto requisito?
- [ ] Revisar cada mañana si el tablero cambió.
- [ ] Un `print` al final del pipeline.
- [ ] Programar una alerta de SQL que cuente las filas de la tabla cada minuto y avise si no cambian.
- [x] Correr el pipeline desde un job con notificación de falla por correo.
porque: Los jobs envían notificaciones al iniciar, terminar con éxito o fallar (correo, Slack, webhooks).
