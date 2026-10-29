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
- [x] Un Git folder conectado al repositorio.
- [ ] Un Declarative Automation Bundle desplegado en modo development.
- [ ] La pestaña de historial de versiones del notebook.
- [ ] Un volumen de Unity Catalog con el código.
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
