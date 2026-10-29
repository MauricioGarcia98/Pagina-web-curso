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
