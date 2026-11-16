# examen: cert-gcp
# id: gcp-adp
# titulo: Google Cloud Associate Data Practitioner

## Carga desde S3
leccion: cert-gcp-pde-diseno-ingesta
dominio: 1
Cada día hay que copiar archivos nuevos de un bucket de Amazon S3 a Cloud Storage. ¿Qué servicio usas?
- [ ] Datastream con S3 como origen.
- [x] Storage Transfer Service.
- [ ] Transfer Appliance.
- [ ] Pub/Sub con una suscripción push.
porque: Storage Transfer Service copia programadamente desde S3, Azure u otras fuentes hacia Cloud Storage.

## SaaS
leccion: cert-gcp-pde-diseno-ingesta
dominio: 1
Marketing necesita los datos de Google Ads en BigQuery cada día sin escribir código. ¿Qué usa?
- [ ] Dataflow con una plantilla personalizada.
- [x] BigQuery Data Transfer Service.
- [ ] Cloud Data Fusion con un clúster dedicado.
- [ ] Una función que llama a la API de Ads.
porque: BigQuery Data Transfer Service carga programadamente datos de Google Ads y otras fuentes.

## Formato
leccion: cert-gcp-pde-diseno-ingesta
dominio: 1
¿Qué formato de archivo conviene para cargar grandes volúmenes en BigQuery conservando el esquema y los tipos?
- [ ] CSV sin encabezado.
- [x] Parquet o Avro.
- [ ] Texto plano delimitado por tabulaciones.
- [ ] JSON con un objeto por archivo.
porque: Parquet y Avro son autodescriptivos, comprimidos y conservan los tipos.

## ELT
leccion: cert-gcp-pde-diseno-ingesta
dominio: 3
Los datos crudos ya están en BigQuery y el equipo quiere transformarlos con SQL versionado en Git, con pruebas y dependencias. ¿Qué usa?
- [ ] Cloud Data Fusion.
- [x] Dataform.
- [ ] Dataproc.
- [ ] Storage Transfer Service.
porque: Dataform gestiona transformaciones SQL en BigQuery con dependencias, aserciones y Git.

## Consulta programada
leccion: cert-gcp-pde-diseno-ingesta
dominio: 3
Una única consulta debe recalcular una tabla de resumen cada mañana. ¿Qué es lo más simple?
- [ ] Un entorno de Cloud Composer con un DAG.
- [x] Una consulta programada de BigQuery.
- [ ] Un clúster de Dataproc con un cron.
- [ ] Un job de Dataflow en streaming.
porque: Las consultas programadas resuelven tareas simples sin infraestructura adicional.

## Visualización
leccion: cert-gcp-pde-almacenamiento-analisis
Un analista necesita un panel compartible, gratis, conectado a una tabla de BigQuery. ¿Qué usa?
- [ ] Looker con un modelo LookML completo.
- [x] Looker Studio.
- [ ] Cloud Monitoring.
- [ ] Workbench con matplotlib.
porque: Looker Studio crea paneles conectados a BigQuery sin costo de licencia.

## Agregación
leccion: cert-gcp-pde-almacenamiento-analisis
En BigQuery, ¿cómo obtienes el total por producto de una columna `lineas` que es un ARRAY de STRUCT?
- [ ] Con `GROUP BY lineas`.
- [x] Con `UNNEST(lineas)` en el FROM y `GROUP BY` el campo del producto.
- [ ] Con `JSON_EXTRACT` sobre la columna.
- [ ] No se puede: hay que normalizar la tabla primero.
porque: UNNEST convierte cada elemento del arreglo en una fila para poder agregarlo.

## Modelo con SQL
leccion: cert-gcp-pde-almacenamiento-analisis
Un analista quiere clasificar clientes que abandonan usando solo SQL sobre datos de BigQuery. ¿Qué usa?
- [ ] AutoML de imágenes.
- [x] BigQuery ML con regresión logística.
- [ ] Un modelo personalizado en TPU.
- [ ] Dataproc con Spark MLlib.
porque: BigQuery ML permite crear y evaluar modelos con CREATE MODEL y ML.EVALUATE.

## Mínimo privilegio
leccion: cert-gcp-pde-operacion-seguridad-adp
Un analista debe consultar las tablas de un dataset sin poder modificarlas. ¿Qué roles le das?
- [ ] BigQuery Admin en el proyecto, para que no tenga problemas de permisos al consultar.
- [x] BigQuery Data Viewer en el dataset y BigQuery Job User en el proyecto.
- [ ] BigQuery Data Editor en el dataset, que incluye lectura y la creación de tablas.
- [ ] Owner del proyecto, revisando sus acciones en los registros de auditoría.
porque: Data Viewer permite leer los datos y Job User ejecutar consultas, sin permisos de escritura.

## Ciclo de vida
leccion: cert-gcp-pde-operacion-seguridad-adp
Los archivos de un bucket se consultan el primer mes y después casi nunca, pero deben conservarse 5 años. ¿Qué configuras?
- [ ] Una copia manual a otro bucket cada mes.
- [x] Reglas de ciclo de vida que cambien la clase a Coldline o Archive y borren a los 5 años.
- [ ] La clase Standard con versionado.
- [ ] Un job de Dataflow que mueva los archivos.
porque: Las reglas de ciclo de vida cambian la clase de almacenamiento y eliminan objetos automáticamente.

## Borrado accidental
leccion: cert-gcp-pde-operacion-seguridad-adp
Alguien borró filas de una tabla de BigQuery hace 2 días. ¿Cómo las recuperas?
- [ ] No se puede recuperar.
- [x] Con time travel, consultando la tabla `FOR SYSTEM_TIME AS OF` antes del borrado.
- [ ] Desde los registros de Cloud Logging.
- [ ] Con un snapshot de Pub/Sub.
porque: Time travel permite leer el estado de una tabla de hasta 7 días atrás.

## Datos sensibles
leccion: cert-gcp-pde-operacion-seguridad-adp
Hay que encontrar automáticamente columnas con correos y teléfonos en BigQuery. ¿Qué servicio usas?
- [ ] Cloud KMS, con una clave administrada por el cliente para cada dataset.
- [x] Sensitive Data Protection.
- [ ] Looker Studio, con un panel que muestra las columnas de cada tabla.
- [ ] Cloud Scheduler, con una consulta que busca la palabra "correo" en los nombres.
porque: Sensitive Data Protection descubre y clasifica datos sensibles en BigQuery y Cloud Storage.

## @caso cafe: Café de Altura
Café de Altura es una cadena de 60 cafeterías. Cada noche, el sistema de cajas deja un archivo CSV por tienda en un bucket de Cloud Storage. El equipo de marketing tiene los datos de campañas en Google Ads y la gerente comercial quiere:
- un tablero diario de ventas por tienda y producto;
- un pronóstico de ventas para la semana próxima;
- que los empleados de cada tienda no vean los datos de las demás;
- no gastar en infraestructura que no se use.

## Cargar los CSV
leccion: cert-gcp-pde-diseno-ingesta
dominio: 1
caso: cafe
¿Cuál es la forma más simple de cargar los CSV de cada noche en BigQuery sin servidores?
- [ ] Un clúster de Dataproc encendido toda la noche que lee los archivos con Spark.
- [x] Una transferencia programada de BigQuery Data Transfer Service desde Cloud Storage (o una carga programada).
- [ ] Datastream desde el bucket.
- [ ] Bigtable.
porque: BigQuery Data Transfer Service carga archivos de Cloud Storage de forma programada y administrada.

## Datos de Google Ads
leccion: cert-gcp-pde-diseno-ingesta
dominio: 1
caso: cafe
¿Cómo llevan los datos de campañas de Google Ads a BigQuery?
- [ ] Descargando un informe desde la interfaz de Google Ads cada día y subiéndolo a mano.
- [x] Con el conector de Google Ads de BigQuery Data Transfer Service.
- [ ] Con Pub/Sub.
- [ ] Con Transfer Appliance.
porque: Data Transfer Service tiene conectores nativos para productos de Google como Ads.

## Pronóstico semanal
leccion: cert-gcp-pde-almacenamiento-analisis
dominio: 2
caso: cafe
¿Qué es lo más simple para pronosticar las ventas de la semana próxima con los datos en BigQuery?
- [ ] Exportar los datos y entrenar un modelo de TensorFlow en una VM con GPU.
- [x] Un modelo de series de tiempo de BigQuery ML (ARIMA_PLUS o `AI.FORECAST`).
- [ ] Un tablero de Looker Studio sin modelo.
- [ ] Una consulta con `LIMIT 7`.
porque: BigQuery ML pronostica series de tiempo con SQL, sin mover los datos.

## Cada tienda lo suyo
leccion: cert-gcp-pde-operacion-seguridad-adp
dominio: 4
caso: cafe
¿Cómo ven los empleados de cada tienda solo sus ventas en la misma tabla?
- [ ] Una tabla separada por tienda, con permisos distintos en cada una.
- [x] Una política de acceso por fila según el grupo de cada tienda.
- [ ] Etiquetas de política en la columna de montos.
- [ ] CMEK por tienda.
porque: Las row access policies filtran filas según el usuario sin duplicar tablas.

## Limpieza de datos
leccion: cert-gcp-pde-diseno-ingesta
dominio: 1
Los CSV traen fechas en distintos formatos y espacios de más en los nombres. ¿Dónde conviene limpiarlos con SQL una vez cargados?
- [ ] En el sistema de cajas de cada tienda, pidiendo a los empleados que corrijan los archivos.
- [x] En una tabla staging de BigQuery con funciones como `TRIM` y `PARSE_DATE`.
- [ ] En Pub/Sub.
- [ ] En Cloud Monitoring.
porque: Cargar crudo y limpiar con SQL en una capa de staging (ELT) es simple y auditable.

## Esquema automático
leccion: cert-gcp-pde-diseno-ingesta
dominio: 1
Al cargar un CSV en BigQuery no conoces todas las columnas. ¿Qué opción detecta el esquema?
- [ ] Definir todas las columnas como STRING y convertirlas después con CAST en cada consulta.
- [x] La detección automática de esquema (autodetect).
- [ ] Un índice vectorial.
- [ ] Una vista materializada.
porque: Autodetect infiere nombres y tipos de las columnas a partir de una muestra del archivo.

## Archivos con errores
leccion: cert-gcp-pde-diseno-ingesta
dominio: 1
Algunas filas del CSV están mal formadas y la carga completa falla. ¿Qué opción permite cargar el resto?
- [ ] Borrar el archivo entero y pedir uno nuevo al sistema de cajas.
- [x] Permitir un número máximo de registros inválidos (max bad records) y revisar los errores.
- [ ] Cambiar el formato a Bigtable.
- [ ] Usar Pub/Sub.
porque: La opción de registros inválidos permite cargar el archivo saltando las filas con problemas.

## Tabla externa
leccion: cert-gcp-pde-diseno-ingesta
dominio: 1
Un analista quiere consultar archivos Parquet de Cloud Storage desde BigQuery sin cargarlos. ¿Qué crea?
- [ ] Una copia de los archivos en Bigtable consultada desde BigQuery con federación.
- [x] Una tabla externa (o tabla BigLake) sobre los archivos.
- [ ] Un tema de Pub/Sub.
- [ ] Un snapshot.
porque: Las tablas externas leen los datos donde están, sin cargarlos en el almacenamiento de BigQuery.

## Tipo de dato
leccion: cert-gcp-pde-diseno-ingesta
dominio: 1
¿Qué tipo de dato de BigQuery conviene para montos de dinero con decimales exactos?
- [ ] FLOAT64, porque ocupa menos espacio y es más rápido en las agregaciones.
- [x] NUMERIC.
- [ ] STRING.
- [ ] INT64 con los decimales separados.
porque: NUMERIC guarda decimales exactos; FLOAT64 puede introducir errores de redondeo.

## Duplicados
leccion: cert-gcp-pde-diseno-ingesta
dominio: 1
Un archivo se cargó dos veces y hay ventas duplicadas. ¿Qué consulta deja una fila por `ticket_id`?
- [ ] `SELECT DISTINCT ticket_id FROM ventas`, que conserva todas las columnas de la venta.
- [x] `SELECT * FROM ventas QUALIFY ROW_NUMBER() OVER (PARTITION BY ticket_id ORDER BY cargado DESC) = 1`
- [ ] `SELECT * FROM ventas LIMIT 1`
- [ ] `SELECT COUNT(*) FROM ventas`
porque: La función de ventana numera las filas por ticket y QUALIFY conserva una.

## ETL o ELT
leccion: cert-gcp-pde-diseno-ingesta
dominio: 1
¿Qué caracteriza el enfoque ELT en Google Cloud?
- [ ] Transformar los datos en un servidor intermedio antes de cargarlos al data warehouse.
- [x] Cargar los datos crudos en BigQuery y transformarlos allí con SQL.
- [ ] No transformar nunca los datos.
- [ ] Usar solo Dataflow.
porque: En ELT la transformación ocurre dentro del data warehouse, aprovechando su escala.

## Streaming a BigQuery
leccion: cert-gcp-pde-diseno-ingesta
dominio: 1
Una app debe escribir eventos en BigQuery en tiempo real con alto rendimiento. ¿Qué API usa?
- [ ] Cargas por lotes de un archivo por evento desde Cloud Storage.
- [x] La Storage Write API de BigQuery.
- [ ] La API de Data Transfer Service.
- [ ] La API de Looker.
porque: La Storage Write API escribe filas en streaming con alto rendimiento y semántica exactly-once.

## Dataflow con plantilla
leccion: cert-gcp-pde-diseno-ingesta
dominio: 1
Hay que llevar mensajes de Pub/Sub a BigQuery aplicando una transformación simple, sin programar un pipeline. ¿Qué usas?
- [ ] Un clúster de Dataproc con un trabajo de Spark Streaming escrito por el equipo.
- [x] Una plantilla de Dataflow de Google (Pub/Sub a BigQuery) con una UDF.
- [ ] Datastream.
- [ ] Transfer Appliance.
porque: Las plantillas de Google permiten lanzar pipelines comunes con parámetros y UDF simples.

## Datos semiestructurados
leccion: cert-gcp-pde-diseno-ingesta
dominio: 1
Los eventos llegan como JSON con campos que cambian. ¿Qué tipo de columna de BigQuery los guarda con flexibilidad?
- [ ] Una columna STRING por cada campo posible, creada a mano cuando aparece.
- [x] Una columna de tipo JSON.
- [ ] Una columna BYTES.
- [ ] Una columna DATE.
porque: El tipo JSON permite guardar y consultar documentos con estructura variable.

## Calidad al cargar
leccion: cert-gcp-pde-diseno-ingesta
dominio: 1
¿Qué dos controles conviene aplicar después de cada carga diaria?
- [x] Verificar que la cantidad de filas sea razonable respecto de días anteriores.
- [x] Verificar que las claves no estén duplicadas ni nulas.
- [ ] Borrar la tabla del día anterior.
- [ ] Cambiar el formato a CSV.
- [ ] Desactivar los permisos.
porque: Los controles de volumen y unicidad detectan cargas incompletas o duplicadas.

## Unir tablas
leccion: cert-gcp-pde-almacenamiento-analisis
dominio: 2
Hay que listar todas las tiendas, incluso las que no vendieron ayer. ¿Qué tipo de JOIN usas desde la tabla de tiendas?
- [ ] INNER JOIN con las ventas de ayer, que devuelve todas las tiendas del catálogo.
- [x] LEFT JOIN con las ventas de ayer.
- [ ] CROSS JOIN.
- [ ] UNION ALL.
porque: LEFT JOIN conserva todas las filas de la tabla izquierda aunque no tengan coincidencias.

## Ventas acumuladas
leccion: cert-gcp-pde-almacenamiento-analisis
dominio: 2
¿Qué función calcula el acumulado de ventas por tienda día a día?
- [ ] `GROUP BY tienda` con `SUM(ventas)` sobre toda la tabla de ventas.
- [x] `SUM(ventas) OVER (PARTITION BY tienda ORDER BY fecha)`.
- [ ] `COUNT(*)`.
- [ ] `MAX(fecha)`.
porque: Una función de ventana ordenada suma progresivamente dentro de cada tienda.

## Looker Studio
leccion: cert-gcp-pde-almacenamiento-analisis
dominio: 2
La gerente quiere un tablero compartible y gratuito conectado a BigQuery. ¿Qué usa?
- [ ] Looker con un modelo LookML desarrollado por un equipo de ingeniería.
- [x] Looker Studio.
- [ ] Cloud Monitoring.
- [ ] Dataproc.
porque: Looker Studio crea tableros conectados a BigQuery sin costo de licencia.

## Connected Sheets
leccion: cert-gcp-pde-almacenamiento-analisis
dominio: 2
Un analista quiere usar tablas dinámicas de Google Sheets sobre 200 millones de filas de BigQuery. ¿Qué usa?
- [ ] Descargar las filas a un CSV e importarlo en Google Sheets por partes.
- [x] Connected Sheets.
- [ ] Pub/Sub.
- [ ] Datastream.
porque: Connected Sheets consulta BigQuery desde Sheets sin traer todas las filas a la hoja.

## Gemini en BigQuery
leccion: cert-gcp-pde-almacenamiento-analisis
dominio: 2
Un analista que recién aprende SQL quiere ayuda para escribir y explicar consultas en BigQuery Studio. ¿Qué usa?
- [ ] Cloud Monitoring, con alertas que sugieren cómo mejorar cada consulta.
- [x] Gemini en BigQuery (asistencia de código y explicación de SQL).
- [ ] Dataproc.
- [ ] Bigtable.
porque: Gemini en BigQuery genera, completa y explica consultas SQL.

## Evaluar el modelo
leccion: cert-gcp-pde-almacenamiento-analisis
dominio: 2
Después de crear un modelo con BigQuery ML, ¿qué función muestra sus métricas de calidad?
- [ ] `ML.PREDICT`, que devuelve las métricas junto con cada predicción.
- [x] `ML.EVALUATE`.
- [ ] `ML.TRANSFORM`.
- [ ] `INFORMATION_SCHEMA.JOBS`.
porque: `ML.EVALUATE` calcula las métricas del modelo sobre datos de evaluación.

## Predecir con el modelo
leccion: cert-gcp-pde-almacenamiento-analisis
dominio: 2
¿Qué función de BigQuery ML aplica un modelo de clasificación a clientes nuevos?
- [ ] `ML.EVALUATE`, que devuelve la predicción de cada fila con sus métricas.
- [x] `ML.PREDICT`.
- [ ] `ML.FORECAST`.
- [ ] `CREATE MODEL`.
porque: `ML.PREDICT` devuelve las predicciones del modelo para las filas de entrada.

## Segmentar clientes
leccion: cert-gcp-pde-almacenamiento-analisis
dominio: 2
Marketing quiere agrupar clientes por comportamiento de compra, sin etiquetas. ¿Qué tipo de modelo de BigQuery ML usa?
- [ ] Regresión logística, con la etiqueta de grupo calculada a mano por el equipo.
- [x] K-means.
- [ ] ARIMA_PLUS.
- [ ] Regresión lineal.
porque: K-means agrupa observaciones similares sin etiquetas previas.

## Visualización adecuada
leccion: cert-gcp-pde-almacenamiento-analisis
dominio: 2
¿Qué gráfico muestra mejor la evolución de las ventas diarias durante un año?
- [ ] Un gráfico de torta con un sector por cada día del año analizado.
- [x] Un gráfico de líneas con la fecha en el eje horizontal.
- [ ] Una tabla de 365 filas.
- [ ] Un mapa.
porque: Las líneas muestran tendencias y estacionalidad en el tiempo.

## Filtros del tablero
leccion: cert-gcp-pde-almacenamiento-analisis
dominio: 2
Cada vez que alguien cambia el filtro de fecha del tablero, BigQuery escanea toda la tabla. ¿Qué mejora el costo?
- [ ] Quitar el filtro de fecha del tablero para que se consulte una sola vez.
- [x] Particionar la tabla por fecha para que el filtro reduzca lo escaneado.
- [ ] Usar más colores en los gráficos.
- [ ] Cambiar a Bigtable.
porque: Con particiones por fecha, BigQuery solo lee los días filtrados.

## Compartir resultados
leccion: cert-gcp-pde-almacenamiento-analisis
dominio: 2
¿Qué dos formas permiten compartir datos de BigQuery con otro equipo sin darle acceso a toda la tabla?
- [x] Una vista autorizada con las columnas y filas permitidas.
- [x] Un dataset autorizado o un listing de Analytics Hub.
- [ ] Hacer público el proyecto.
- [ ] Copiar las credenciales del analista.
- [ ] Enviar un CSV por correo cada día.
porque: Las vistas y datasets autorizados, o Analytics Hub, exponen solo lo necesario.

## Programar consultas
leccion: cert-gcp-pde-diseno-ingesta
dominio: 3
Una tabla de resumen debe recalcularse cada mañana a las 6. ¿Qué es lo más simple?
- [ ] Un entorno de Cloud Composer con un DAG de una sola tarea para esta consulta.
- [x] Una consulta programada de BigQuery.
- [ ] Un clúster de Dataproc.
- [ ] Un tema de Pub/Sub.
porque: Las consultas programadas ejecutan SQL de forma periódica sin infraestructura adicional.

## Dependencias en Dataform
leccion: cert-gcp-pde-diseno-ingesta
dominio: 3
En Dataform, ¿cómo se indica que la tabla `ventas_por_tienda` depende de `ventas_limpias`?
- [ ] Escribiendo el orden de ejecución en un archivo de texto aparte del repositorio.
- [x] Con `${ref("ventas_limpias")}` en la consulta SQLX.
- [ ] Con un tema de Pub/Sub.
- [ ] No se puede.
porque: `ref()` declara la dependencia y Dataform ordena la ejecución.

## Disparar por archivo
leccion: cert-gcp-pde-diseno-ingesta
dominio: 3
Un proceso debe ejecutarse apenas llega un archivo nuevo al bucket. ¿Qué usas?
- [ ] Una consulta programada cada minuto que revisa si apareció el archivo en el bucket.
- [x] Un evento de Cloud Storage con Eventarc que dispare una Cloud Run function o un workflow.
- [ ] Transfer Appliance.
- [ ] Looker Studio.
porque: Eventarc reacciona a eventos como la creación de un objeto y dispara servicios.

## Cloud Scheduler
leccion: cert-gcp-pde-diseno-ingesta
dominio: 3
Hay que llamar a una API interna cada hora para disparar una exportación. ¿Qué servicio programa la llamada?
- [ ] Bigtable, con una tabla de horarios que se consulta cada minuto.
- [x] Cloud Scheduler.
- [ ] Dataform.
- [ ] Analytics Hub.
porque: Cloud Scheduler ejecuta tareas cron administradas, como llamar a una URL o publicar en Pub/Sub.

## Composer
leccion: cert-gcp-pde-diseno-ingesta
dominio: 3
El equipo tiene 80 flujos con dependencias entre Cloud Storage, Dataflow, BigQuery y APIs externas, con reintentos y alertas. ¿Qué orquestador usan?
- [ ] Consultas programadas de BigQuery, una por cada paso de los 80 flujos.
- [x] Cloud Composer (Apache Airflow administrado).
- [ ] Looker Studio.
- [ ] Bigtable.
porque: Composer maneja muchos DAGs con dependencias complejas, reintentos y monitoreo.

## Reintentos
leccion: cert-gcp-pde-diseno-ingesta
dominio: 3
Una tarea que llama a una API externa falla a veces por errores temporales. ¿Qué configuras en el orquestador?
- [ ] Una alerta que avise al equipo para que vuelva a ejecutar la tarea a mano.
- [x] Reintentos automáticos con espera entre intentos.
- [ ] Borrar la tarea.
- [ ] Cambiar a Bigtable.
porque: Los reintentos con espera absorben fallas transitorias sin intervención.

## Lotes o streaming
leccion: cert-gcp-pde-diseno-ingesta
dominio: 3
Las ventas solo se analizan al día siguiente. ¿Qué enfoque es más simple y barato?
- [ ] Un pipeline de streaming con Pub/Sub y Dataflow encendido las 24 horas.
- [x] Una carga por lotes diaria.
- [ ] Bigtable con escrituras en tiempo real.
- [ ] Datastream.
porque: Si no se necesita baja latencia, el procesamiento por lotes es más simple y económico.

## Monitorear ejecuciones
leccion: cert-gcp-pde-diseno-ingesta
dominio: 3
¿Dónde ves si una consulta programada de BigQuery falló anoche?
- [ ] En Looker Studio, que muestra un aviso cuando faltan datos en el tablero.
- [x] En el historial de ejecuciones de la consulta programada (y Cloud Logging).
- [ ] En Analytics Hub.
- [ ] En Bigtable.
porque: Las consultas programadas registran cada ejecución con su estado y errores.

## Dataform en Git
leccion: cert-gcp-pde-diseno-ingesta
dominio: 3
¿Qué ventaja da conectar el repositorio de Dataform a Git?
- [ ] Que las consultas se ejecutan sin consumir recursos de BigQuery.
- [x] Control de versiones, revisión de cambios y entornos de desarrollo separados.
- [ ] Que no hace falta escribir SQL.
- [ ] Que los datos se copian a Git.
porque: Git permite versionar y revisar el código SQL antes de llevarlo a producción.

## Roles de BigQuery
leccion: cert-gcp-pde-operacion-seguridad-adp
dominio: 4
Un analista debe poder ejecutar consultas y leer un dataset, sin modificarlo. ¿Qué roles le das?
- [ ] BigQuery Admin en el proyecto para evitar problemas de permisos.
- [x] BigQuery Job User en el proyecto y BigQuery Data Viewer en el dataset.
- [ ] Owner del proyecto.
- [ ] BigQuery Data Editor en el dataset.
porque: Job User permite ejecutar consultas y Data Viewer leer datos, sin permisos de escritura.

## Grupos
leccion: cert-gcp-pde-operacion-seguridad-adp
dominio: 4
¿Cuál es la buena práctica para dar acceso a 40 analistas?
- [ ] Dar los permisos a cada analista por separado, revisando uno por uno cada mes.
- [x] Dar los permisos a un grupo y agregar a los analistas al grupo.
- [ ] Compartir una sola cuenta entre todos.
- [ ] Hacer público el dataset.
porque: Los grupos simplifican la administración y la auditoría de permisos.

## Retención de tablas
leccion: cert-gcp-pde-operacion-seguridad-adp
dominio: 4
Las tablas temporales de un dataset deben borrarse solas a los 7 días. ¿Qué configuras?
- [ ] Un recordatorio semanal para que un analista borre las tablas a mano.
- [x] La expiración predeterminada de tablas del dataset.
- [ ] Time travel de 7 días.
- [ ] CMEK.
porque: La expiración de tablas elimina automáticamente las tablas después del tiempo indicado.

## Ciclo de vida de Cloud Storage
leccion: cert-gcp-pde-operacion-seguridad-adp
dominio: 4
Los CSV crudos solo se usan la primera semana, pero deben guardarse un año. ¿Qué haces?
- [ ] Moverlos a mano a otro bucket una vez por mes para ahorrar costo.
- [x] Una regla de ciclo de vida que los pase a Nearline o Coldline y los borre al año.
- [ ] Bigtable.
- [ ] Analytics Hub.
porque: Las reglas de ciclo de vida cambian la clase y borran objetos automáticamente.

## Recuperar un borrado
leccion: cert-gcp-pde-operacion-seguridad-adp
dominio: 4
Alguien borró por error una tabla de BigQuery ayer. ¿Qué permite recuperarla?
- [ ] Nada: los borrados en BigQuery son definitivos e inmediatos.
- [x] La restauración dentro de la ventana de time travel (por ejemplo, con un snapshot de ese momento).
- [ ] Pub/Sub.
- [ ] Looker Studio.
porque: Las tablas borradas pueden restaurarse dentro de la ventana de time travel.

## Versiones de archivos
leccion: cert-gcp-pde-operacion-seguridad-adp
dominio: 4
Un proceso sobrescribe archivos del bucket y a veces hace falta la versión anterior. ¿Qué habilitas?
- [ ] Una clase de almacenamiento Archive para todos los archivos del bucket.
- [x] El versionado de objetos del bucket.
- [ ] Analytics Hub.
- [ ] Bigtable.
porque: Con versionado, Cloud Storage conserva las versiones anteriores de cada objeto.

## Datos sensibles
leccion: cert-gcp-pde-operacion-seguridad-adp
dominio: 4
¿Qué servicio encuentra columnas con correos y teléfonos en todas las tablas de BigQuery?
- [ ] Cloud Monitoring, con una alerta por cada columna que contenga datos personales.
- [x] Sensitive Data Protection.
- [ ] Dataform.
- [ ] Cloud Scheduler.
porque: Sensitive Data Protection descubre y clasifica datos sensibles automáticamente.

## Catálogo de datos
leccion: cert-gcp-pde-operacion-seguridad-adp
dominio: 4
Los analistas no saben qué tablas existen ni qué significa cada columna. ¿Qué ayuda?
- [ ] Un documento de texto en Drive que alguien actualiza cuando tiene tiempo.
- [x] Documentar las tablas en Knowledge Catalog (Dataplex), con descripciones y glosario.
- [ ] Más particiones.
- [ ] Pub/Sub.
porque: El catálogo centraliza metadatos, descripciones y búsqueda de datos.

## Ubicación
leccion: cert-gcp-pde-operacion-seguridad-adp
dominio: 4
Por regulación, los datos deben quedar en Brasil. ¿Qué haces al crear el dataset?
- [ ] Elegir la multirregión US, que tiene la mayor cantidad de servicios disponibles.
- [x] Elegir la región de São Paulo (`southamerica-east1`) como ubicación del dataset.
- [ ] No importa la ubicación.
- [ ] Usar Analytics Hub.
porque: La ubicación del dataset determina dónde se almacenan los datos.

## Formato columnar
leccion: cert-gcp-pde-diseno-ingesta
dominio: 1
¿Por qué conviene guardar los datos crudos en Parquet en lugar de CSV en el lago?
- [ ] Porque Parquet se puede abrir directamente con cualquier editor de texto plano.
- [x] Porque es columnar, comprimido y conserva los tipos, lo que reduce espacio y lectura.
- [ ] Porque no necesita esquema.
- [ ] Porque es más fácil de editar a mano.
porque: Parquet guarda por columnas con tipos y compresión, ideal para analítica.

## Transfer Service
leccion: cert-gcp-pde-diseno-ingesta
dominio: 1
Hay que mover 20 TB desde Azure Blob Storage a Cloud Storage con un proceso administrado y programable. ¿Qué usas?
- [ ] Descargar los archivos a una computadora local y subirlos con la consola web.
- [x] Storage Transfer Service.
- [ ] Datastream.
- [ ] Looker Studio.
porque: Storage Transfer Service copia datos desde otras nubes de forma administrada y programable.

## Promedio por grupo
leccion: cert-gcp-pde-almacenamiento-analisis
dominio: 2
¿Qué consulta devuelve el ticket promedio por tienda?
- [ ] `SELECT tienda, ticket FROM ventas ORDER BY ticket`
- [x] `SELECT tienda, AVG(total) FROM ventas GROUP BY tienda`
- [ ] `SELECT AVG(tienda) FROM ventas`
- [ ] `SELECT COUNT(DISTINCT tienda) FROM ventas`
porque: `AVG` con `GROUP BY` calcula el promedio dentro de cada tienda.

## Claves de servicio
leccion: cert-gcp-pde-operacion-seguridad-adp
dominio: 4
Un proceso automático necesita leer de BigQuery. ¿Qué identidad usa?
- [ ] La cuenta personal del analista que escribió el proceso, con su contraseña.
- [x] Una cuenta de servicio con los roles mínimos necesarios.
- [ ] Una cuenta compartida por todo el equipo.
- [ ] Acceso anónimo.
porque: Las cuentas de servicio son identidades para procesos, con permisos limitados.

## @caso bici: BiciRuta
BiciRuta alquila bicicletas en tres ciudades. Cada bicicleta envía su posición y su batería cada 30 segundos, y la app guarda cada viaje con el usuario, el inicio, el fin y el precio. Hoy todo termina en archivos JSON que un analista abre a mano.

El equipo quiere:
- ver en un tablero las bicicletas con batería baja, con pocos minutos de demora;
- un informe diario de viajes e ingresos por ciudad;
- que finanzas vea los ingresos pero no los datos personales de los usuarios;
- guardar los datos crudos un año, al menor costo posible.

## Posiciones casi en tiempo real
leccion: cert-gcp-pde-diseno-ingesta
dominio: 1
caso: bici
¿Cómo llegan las posiciones de las bicicletas a BigQuery con pocos minutos de demora?
- [ ] Un archivo CSV por día que un analista sube a mano a Cloud Storage y carga con la consola.
- [x] Las bicicletas publican en Pub/Sub y una suscripción de BigQuery (o un job de Dataflow) escribe en la tabla.
- [ ] Una consulta programada cada 24 horas que lee los archivos JSON del bucket con una tabla externa.
- [ ] Una transferencia de Data Transfer Service desde la app, configurada para copiar los datos una vez por semana.
porque: Pub/Sub recibe los eventos en tiempo real y una suscripción de BigQuery o Dataflow los escribe en la tabla de forma continua.

## Informe diario de viajes
leccion: cert-gcp-pde-diseno-ingesta
dominio: 3
caso: bici
¿Cuál es la forma más simple de recalcular cada mañana la tabla de viajes e ingresos por ciudad?
- [x] Una consulta programada de BigQuery que escribe el resultado en una tabla.
- [ ] Un clúster de Dataproc encendido todo el día con un script de Spark que corre a las 6:00.
- [ ] Un entorno de Cloud Composer con un DAG de un solo paso y sin dependencias.
- [ ] Una máquina virtual de Compute Engine con un `cron` que exporta los datos a una hoja de cálculo.
porque: Para una transformación SQL diaria sin dependencias, una consulta programada es la opción más simple y sin infraestructura.

## Ingresos sin datos personales
leccion: cert-gcp-pde-operacion-seguridad-adp
dominio: 4
caso: bici
¿Cómo ve finanzas los ingresos sin acceder a los datos personales de los usuarios?
- [ ] Dándole a finanzas el rol BigQuery Data Viewer sobre todo el proyecto y pidiéndole que no consulte las columnas personales.
- [x] Con una vista autorizada (en otro dataset) que expone solo las columnas de ingresos, o con seguridad a nivel de columna.
- [ ] Exportando cada mes una copia de la tabla completa a una hoja de cálculo compartida con el equipo de finanzas.
- [ ] Borrando las columnas personales de la tabla original para que nadie pueda verlas.
porque: Una vista autorizada o las etiquetas de política por columna limitan lo que finanzas puede leer sin duplicar ni borrar datos.

## Crudos un año, barato
leccion: cert-gcp-pde-operacion-seguridad-adp
dominio: 4
caso: bici
Los JSON crudos casi no se leen después del primer mes, pero hay que guardarlos un año. ¿Qué configuras?
- [ ] Copiar los archivos cada semana a un disco persistente de una máquina virtual, que cuesta menos que Cloud Storage.
- [x] Una regla de ciclo de vida que pasa los objetos a una clase más barata (Nearline o Coldline) y los borra a los 365 días.
- [ ] Dejar los archivos en la clase Standard para siempre y borrar a mano los viejos cuando alguien se acuerde.
- [ ] Cargar todos los JSON en una tabla de BigQuery sin partición y borrar el bucket, porque el almacenamiento de BigQuery es siempre el más barato.
porque: Las reglas de ciclo de vida cambian la clase de almacenamiento según la edad y eliminan los objetos al vencer la retención.

## Tablero de batería baja
leccion: cert-gcp-pde-almacenamiento-analisis
dominio: 2
caso: bici
¿Qué herramienta arma el tablero de batería baja con datos de BigQuery sin desarrollo?
- [ ] Un notebook de Python que el analista ejecuta a mano cada hora y envía por correo.
- [x] Looker Studio conectado a la tabla o vista de BigQuery, con actualización de datos frecuente.
- [ ] Cloud Monitoring, con una alerta por cada bicicleta configurada a mano y un panel de métricas personalizadas.
- [ ] Una hoja de cálculo con los datos copiados y pegados desde la consola cada mañana.
porque: Looker Studio se conecta directamente a BigQuery y permite tableros compartibles sin código.

## Cargar Parquet
leccion: cert-gcp-pde-diseno-ingesta
dominio: 1
Un proveedor entrega archivos Parquet en Cloud Storage. ¿Qué ventaja tienen al cargarlos en BigQuery frente a CSV?
- [ ] Ninguna: BigQuery convierte todo a CSV antes de cargarlo.
- [x] Traen el esquema y los tipos, son columnares y comprimidos, y se cargan más rápido.
- [ ] Solo se pueden consultar como tabla externa, nunca cargarse en una tabla nativa de BigQuery.
- [ ] Ocupan más espacio, pero BigQuery los cobra a mitad de precio al consultarlos.
porque: Parquet es autodescriptivo y columnar: conserva el esquema y es eficiente para cargar.

## Encabezado del CSV
leccion: cert-gcp-pde-diseno-ingesta
dominio: 1
Al cargar un CSV, la primera fila con los nombres de columna aparece como un registro de datos. ¿Qué opción corriges?
- [ ] `max_bad_records`, para que esa fila se descarte como error.
- [x] `skip_leading_rows=1`.
- [ ] `write_disposition=WRITE_TRUNCATE`, para que se reemplace la tabla.
- [ ] `field_delimiter=";"`, porque la coma confunde al encabezado.
porque: `skip_leading_rows` indica cuántas filas iniciales saltear, como el encabezado.

## Agregar o reemplazar
leccion: cert-gcp-pde-diseno-ingesta
dominio: 1
Cada noche se carga el archivo completo de productos y la tabla debe quedar igual al archivo. ¿Qué disposición de escritura usas?
- [ ] `WRITE_APPEND`, que agrega las filas nuevas al final de la tabla existente.
- [x] `WRITE_TRUNCATE`, que reemplaza el contenido de la tabla.
- [ ] `WRITE_EMPTY`, que agrega filas aunque la tabla tenga datos.
- [ ] Ninguna: BigQuery detecta solo que el archivo es completo.
porque: `WRITE_TRUNCATE` sobrescribe la tabla con los datos cargados; `WRITE_APPEND` duplicaría los productos.

## Nulos en el origen
leccion: cert-gcp-pde-diseno-ingesta
dominio: 1
En una tabla de clientes, el país viene vacío en el 5 % de las filas. ¿Qué haces primero?
- [x] Medir cuántos faltan y por qué, y decidir con el negocio si se imputa, se marca como "desconocido" o se corrige en el origen.
- [ ] Borrar todas las filas con nulos, porque cualquier fila incompleta es un error.
- [ ] Reemplazar los nulos por el país más frecuente en un paso automático, sin medir cuántos son ni avisar al negocio, para que el tablero no muestre huecos.
- [ ] Ignorarlo: BigQuery no permite valores nulos en columnas de texto.
porque: El tratamiento de faltantes depende de la causa y del uso; hay que medirlo y documentar la decisión.

## Normalizar texto
leccion: cert-gcp-pde-diseno-ingesta
dominio: 1
Las ciudades aparecen como "Lima", "lima " y "LIMA". ¿Qué SQL las unifica para agrupar?
- [ ] `SELECT DISTINCT ciudad`, que ya trata igual mayúsculas y espacios.
- [x] `UPPER(TRIM(ciudad))` (o `INITCAP`) antes de agrupar.
- [ ] `CAST(ciudad AS INT64)`.
- [ ] `SAFE_DIVIDE(ciudad, 1)`.
porque: Quitar espacios y unificar mayúsculas convierte las variantes en un mismo valor.

## Convertir sin fallar
leccion: cert-gcp-pde-diseno-ingesta
dominio: 1
Una columna de texto con montos tiene algunos valores como "N/A". ¿Cómo la conviertes a número sin que falle toda la consulta?
- [ ] `CAST(monto AS NUMERIC)`, que en BigQuery ignora solo los valores inválidos y convierte el resto.
- [x] `SAFE_CAST(monto AS NUMERIC)`, que devuelve NULL en los valores que no se pueden convertir.
- [ ] `PARSE_DATE('%Y', monto)`.
- [ ] `CONCAT(monto, 0)`.
porque: `SAFE_CAST` devuelve NULL en lugar de error cuando la conversión no es posible.

## Fechas en otro formato
leccion: cert-gcp-pde-diseno-ingesta
dominio: 1
Las fechas llegan como texto "31/12/2025". ¿Qué función las convierte a DATE?
- [ ] `DATE("31/12/2025")`.
- [x] `PARSE_DATE('%d/%m/%Y', fecha_texto)`.
- [ ] `FORMAT_DATE('%d/%m/%Y', fecha_texto)`.
- [ ] `EXTRACT(DATE FROM fecha_texto)`.
porque: `PARSE_DATE` interpreta un texto con el formato indicado; `FORMAT_DATE` hace lo contrario.

## Base de datos operativa
leccion: cert-gcp-pde-diseno-ingesta
dominio: 1
Quieres replicar los cambios de una base Cloud SQL para PostgreSQL a BigQuery de forma continua y administrada. ¿Qué servicio usas?
- [ ] Data Transfer Service, que copia las tablas completas una vez por semana.
- [x] Datastream, que captura los cambios (CDC) y los escribe en BigQuery.
- [ ] Cloud Scheduler, que exporta la base a CSV cada hora.
- [ ] Looker Studio, conectado directamente a la base operativa.
porque: Datastream es el servicio administrado de captura de cambios desde bases como PostgreSQL y MySQL hacia BigQuery.

## Preparar datos sin código
leccion: cert-gcp-pde-diseno-ingesta
dominio: 1
Un analista que no programa quiere limpiar y transformar una tabla con ayuda visual y sugerencias dentro de BigQuery. ¿Qué usa?
- [ ] Un clúster de Dataproc con notebooks de Spark.
- [x] BigQuery data preparation, con sugerencias de transformación asistidas por Gemini.
- [ ] Cloud Functions, con una función por cada transformación y un disparador por tabla.
- [ ] Pub/Sub, publicando cada fila en un tema.
porque: La preparación de datos de BigQuery ofrece una interfaz visual con sugerencias de limpieza y transformación.

## Muestra para explorar
leccion: cert-gcp-pde-diseno-ingesta
dominio: 1
Quieres ver unas filas de una tabla enorme sin pagar por escanearla. ¿Qué haces?
- [ ] `SELECT * FROM tabla LIMIT 10`, que solo lee 10 filas.
- [x] Usar la pestaña Vista previa (Preview) de la tabla en la consola.
- [ ] `SELECT * FROM tabla LIMIT 10 OFFSET 0`, que lee solo las primeras filas.
- [ ] Exportar la tabla completa a Cloud Storage y abrir el archivo.
porque: La vista previa no cobra bytes; `LIMIT` no reduce lo que se escanea en una tabla no agrupada.

## Calidad automática
leccion: cert-gcp-pde-diseno-ingesta
dominio: 1
¿Qué servicio de Google Cloud permite definir reglas de calidad (no nulos, rangos, unicidad) sobre tablas de BigQuery y ver los resultados?
- [ ] Cloud Build.
- [x] Dataplex (calidad de datos y perfilado).
- [ ] Cloud Armor, con reglas por columna.
- [ ] Artifact Registry.
porque: Dataplex ofrece perfilado y escaneos de calidad de datos con reglas sobre tablas de BigQuery.

## Funciones de ventana
leccion: cert-gcp-pde-almacenamiento-analisis
dominio: 2
¿Qué consulta da el ranking de productos por ventas dentro de cada categoría?
- [ ] `GROUP BY categoria ORDER BY SUM(ventas) DESC LIMIT 10`.
- [x] `RANK() OVER (PARTITION BY categoria ORDER BY ventas DESC)`.
- [ ] `COUNT(DISTINCT categoria)`.
- [ ] `SUM(ventas) OVER ()` sin partición.
porque: `RANK` con `PARTITION BY` reinicia el ranking en cada categoría.

## El último registro por cliente
leccion: cert-gcp-pde-almacenamiento-analisis
dominio: 2
¿Cómo te quedas con el último pedido de cada cliente en BigQuery?
- [ ] `SELECT DISTINCT cliente_id, MAX(fecha), producto, total FROM pedidos`.
- [x] `QUALIFY ROW_NUMBER() OVER (PARTITION BY cliente_id ORDER BY fecha DESC) = 1`.
- [ ] `GROUP BY cliente_id` con `SELECT *`.
- [ ] `ORDER BY fecha DESC LIMIT 1`.
porque: `QUALIFY` filtra sobre el resultado de una función de ventana: queda una fila por cliente.

## Variación contra el mes anterior
leccion: cert-gcp-pde-almacenamiento-analisis
dominio: 2
¿Qué función trae las ventas del mes anterior en la misma fila para calcular la variación?
- [ ] `LEAD(ventas) OVER (ORDER BY mes)`, que trae el valor del mes anterior.
- [x] `LAG(ventas) OVER (ORDER BY mes)`.
- [ ] `FIRST_VALUE(ventas) OVER ()`, que trae el mes anterior a cualquier fila.
- [ ] `NTILE(12) OVER (ORDER BY mes)`.
porque: `LAG` devuelve el valor de la fila anterior según el orden; `LEAD`, el de la siguiente.

## Dividir sin error
leccion: cert-gcp-pde-almacenamiento-analisis
dominio: 2
Calculas el ticket promedio como ingresos / pedidos, pero algunas tiendas tienen 0 pedidos. ¿Qué usas?
- [ ] `ingresos / pedidos`, que en BigQuery devuelve 0 cuando el divisor es 0.
- [x] `SAFE_DIVIDE(ingresos, pedidos)`, que devuelve NULL si el divisor es 0.
- [ ] `ingresos * pedidos`.
- [ ] `ROUND(ingresos, pedidos)`.
porque: `SAFE_DIVIDE` evita el error de división por cero devolviendo NULL.

## Explorar un array
leccion: cert-gcp-pde-almacenamiento-analisis
dominio: 2
La tabla de pedidos tiene una columna `items ARRAY<STRUCT<sku STRING, cantidad INT64>>`. ¿Cómo cuentas las unidades por SKU?
- [ ] `GROUP BY items` con `SUM(items.cantidad)`, que agrupa por cada elemento del array.
- [x] `CROSS JOIN UNNEST(items) AS i` y luego `GROUP BY i.sku` con `SUM(i.cantidad)`.
- [ ] `ARRAY_LENGTH(items)` agrupado por pedido.
- [ ] `JSON_EXTRACT(items, '$.sku')`.
porque: `UNNEST` convierte cada elemento del array en una fila que se puede agrupar.

## Gráfico para una tendencia
leccion: cert-gcp-pde-almacenamiento-analisis
dominio: 2
¿Qué tipo de gráfico muestra mejor la evolución de los viajes día por día durante seis meses?
- [ ] Un gráfico de torta con un sector por día, ordenado por fecha.
- [x] Un gráfico de líneas con la fecha en el eje horizontal.
- [ ] Una tabla con 180 filas sin formato.
- [ ] Un mapa con un punto por día.
porque: Las líneas muestran tendencias en el tiempo; una torta con 180 sectores no se puede leer.

## Comparar categorías
leccion: cert-gcp-pde-almacenamiento-analisis
dominio: 2
¿Qué gráfico compara mejor los ingresos de 8 ciudades?
- [x] Un gráfico de barras ordenado de mayor a menor.
- [ ] Un gráfico de líneas que une las ciudades en orden alfabético.
- [ ] Un gráfico de dispersión con una sola variable.
- [ ] Un indicador (scorecard) con el total de todas las ciudades.
porque: Las barras ordenadas permiten comparar magnitudes entre categorías de un vistazo.

## Campo calculado
leccion: cert-gcp-pde-almacenamiento-analisis
dominio: 2
En Looker Studio quieres mostrar el margen como (ingresos - costo) / ingresos sin cambiar la tabla de BigQuery. ¿Qué haces?
- [ ] Pedirle a ingeniería que agregue la columna a la tabla de origen.
- [x] Crear un campo calculado en la fuente de datos del informe.
- [ ] Exportar los datos a una hoja de cálculo y calcular ahí.
- [ ] No se puede: Looker Studio solo muestra columnas existentes.
porque: Los campos calculados de Looker Studio permiten fórmulas sobre los campos de la fuente.

## Preguntas en lenguaje natural
leccion: cert-gcp-pde-almacenamiento-analisis
dominio: 2
Un gerente quiere preguntar "¿qué ciudad tuvo más viajes la semana pasada?" sin escribir SQL. ¿Qué opción de Google Cloud conviene?
- [ ] Un tablero fijo de Looker Studio con todas las combinaciones de ciudad y semana precalculadas y filtros para cada pregunta posible.
- [x] Conversational analytics (agentes de datos en BigQuery o Looker) sobre tablas curadas, que generan y ejecutan el SQL.
- [ ] Un modelo de BigQuery ML de regresión lineal.
- [ ] Una regla de ciclo de vida en Cloud Storage.
porque: Las herramientas de análisis conversacional traducen preguntas en lenguaje natural a consultas sobre datos gobernados.

## Notebooks en BigQuery
leccion: cert-gcp-pde-almacenamiento-analisis
dominio: 2
Un analista quiere combinar SQL y Python (pandas) para explorar datos sin salir de BigQuery Studio. ¿Qué usa?
- [ ] Cloud Shell con un editor de texto.
- [x] Un notebook de BigQuery Studio (Colab Enterprise), con BigQuery DataFrames si los datos son grandes.
- [ ] Cloud Scheduler, que ejecuta un script de Python con pandas cada vez que el analista lo programa desde la consola.
- [ ] Data Transfer Service.
porque: Los notebooks de BigQuery Studio permiten SQL y Python, y BigQuery DataFrames ejecuta las operaciones dentro de BigQuery.

## Clasificación con BigQuery ML
leccion: cert-gcp-pde-almacenamiento-analisis
dominio: 2
¿Qué `model_type` de BigQuery ML usas para predecir si un usuario cancelará (sí/no)?
- [ ] `'linear_reg'`, con la etiqueta 0 o 1 como número continuo.
- [x] `'logistic_reg'` (o un modelo de árboles como `'boosted_tree_classifier'`).
- [ ] `'kmeans'`.
- [ ] `'arima_plus'`.
porque: La regresión logística y los clasificadores de árboles predicen una etiqueta binaria; `linear_reg` predice números.

## Sobreajuste en BigQuery ML
leccion: cert-gcp-pde-almacenamiento-analisis
dominio: 2
`ML.EVALUATE` muestra métricas excelentes sobre los mismos datos con los que entrenaste. ¿Qué problema tiene esa evaluación?
- [ ] Ninguno: evaluar con los datos de entrenamiento es la práctica recomendada.
- [x] Sobreestima la calidad; hay que evaluar con datos que el modelo no vio (separación de evaluación).
- [ ] `ML.EVALUATE` solo funciona con modelos de series de tiempo; para clasificación hay que usar `ML.PREDICT` y contar los aciertos.
- [ ] Las métricas excelentes significan que no hace falta reentrenar nunca.
porque: Las métricas sobre datos de entrenamiento no reflejan cómo funcionará el modelo con datos nuevos.

## Orden de los pasos
leccion: cert-gcp-pde-diseno-ingesta
dominio: 3
Una tabla de resumen depende de que primero se carguen las ventas y los clientes. ¿Qué herramienta maneja esas dependencias de SQL dentro de BigQuery?
- [ ] Dos consultas programadas a la misma hora, que se ejecutan en el orden en que se crearon.
- [x] Dataform, que calcula el orden a partir de las referencias `ref()` entre tablas.
- [ ] Looker Studio, que actualiza los datos en orden alfabético.
- [ ] Una regla de ciclo de vida que borra las tablas viejas.
porque: Dataform construye un grafo de dependencias y ejecuta cada tabla después de las que referencia.

## Pruebas en Dataform
leccion: cert-gcp-pde-diseno-ingesta
dominio: 3
¿Cómo detiene Dataform la publicación de una tabla si la clave tiene duplicados?
- [ ] No puede: Dataform solo ejecuta SQL sin verificar resultados.
- [x] Con aserciones (por ejemplo, `uniqueKey` o `nonNull` en la configuración de la tabla).
- [ ] Con una alerta de Cloud Billing que se dispara si la tabla crece demasiado.
- [ ] Con una vista materializada.
porque: Las aserciones de Dataform son consultas que deben devolver cero filas; si fallan, la ejecución lo informa.

## Flujo con varios servicios
leccion: cert-gcp-pde-diseno-ingesta
dominio: 3
Un proceso debe esperar un archivo, ejecutar un job de Dataflow, luego un SQL en BigQuery y avisar por correo si falla. ¿Qué herramienta orquesta todo?
- [ ] Una consulta programada de BigQuery.
- [x] Cloud Composer (Airflow administrado) con un DAG que encadena los pasos.
- [ ] Una tabla externa sobre el bucket.
- [ ] Looker Studio con actualización automática de datos cada 15 minutos.
porque: Composer orquesta tareas en distintos servicios con dependencias, reintentos y alertas.

## Orquestación liviana
leccion: cert-gcp-pde-diseno-ingesta
dominio: 3
Necesitas encadenar tres llamadas a APIs de Google Cloud en secuencia, sin servidores y pagando solo por ejecución. ¿Qué opción liviana conviene?
- [ ] Un entorno de Cloud Composer encendido todo el día.
- [x] Workflows.
- [ ] Un clúster de Dataproc permanente.
- [ ] Una máquina virtual con un script en bucle.
porque: Workflows orquesta pasos y llamadas a APIs sin infraestructura y con cobro por paso ejecutado.

## Alerta de fallas
leccion: cert-gcp-pde-diseno-ingesta
dominio: 3
¿Cómo te enteras si la consulta programada de la noche falla?
- [ ] Revisando el historial cada mañana a mano.
- [x] Configurando las notificaciones por correo o Pub/Sub de la consulta programada (o una alerta en Cloud Monitoring).
- [ ] Agregando `LIMIT 1` a la consulta.
- [ ] No hace falta: si una consulta programada falla, BigQuery la reintenta hasta que funciona y avisa al dueño del proyecto por correo.
porque: Las consultas programadas pueden notificar fallas y Cloud Monitoring permite alertas sobre los jobs.

## Rol para ejecutar consultas
leccion: cert-gcp-pde-operacion-seguridad-adp
dominio: 4
Un analista tiene BigQuery Data Viewer en un dataset pero no puede ejecutar consultas. ¿Qué rol le falta?
- [ ] BigQuery Admin en la organización.
- [x] BigQuery Job User en el proyecto donde corren las consultas.
- [ ] Storage Object Viewer en un bucket.
- [ ] BigQuery Data Owner en todos los datasets, que incluye ejecutar consultas.
porque: Para ejecutar consultas se necesita crear jobs (Job User); Data Viewer solo da lectura de los datos.

## Filas por región
leccion: cert-gcp-pde-operacion-seguridad-adp
dominio: 4
Cada gerente regional debe ver solo las filas de su región en la misma tabla. ¿Qué usas?
- [ ] Una tabla copiada por región, actualizada a mano.
- [x] Una política de acceso a nivel de fila (row access policy) con el filtro por región.
- [ ] Una etiqueta de política en la columna región.
- [ ] Una vista por región con permisos de Data Viewer sobre la tabla original para cada gerente.
porque: Las row access policies filtran las filas según quién consulta, sobre una sola tabla.

## Enmascarar una columna
leccion: cert-gcp-pde-operacion-seguridad-adp
dominio: 4
Soporte puede ver que existe un correo de cliente pero no su valor completo. ¿Qué configuras?
- [ ] Borrar la columna de correo.
- [x] Una etiqueta de política con enmascaramiento dinámico de datos para ese grupo.
- [ ] Un índice de búsqueda sobre la columna, que oculta parte del valor al consultarla.
- [ ] Una partición por correo.
porque: El enmascaramiento dinámico muestra un valor enmascarado (por ejemplo, un hash) a quienes no tienen acceso al dato completo.

## Encontrar datos sensibles
leccion: cert-gcp-pde-operacion-seguridad-adp
dominio: 4
Quieres saber en qué tablas hay números de tarjeta o documentos sin revisar columna por columna. ¿Qué servicio usas?
- [ ] Cloud Scheduler, con un escaneo nocturno de las tablas.
- [x] Sensitive Data Protection (descubrimiento e inspección de datos sensibles).
- [ ] Data Transfer Service.
- [ ] Looker Studio.
porque: Sensitive Data Protection escanea y clasifica datos sensibles en BigQuery y Cloud Storage.

## Claves de cifrado propias
leccion: cert-gcp-pde-operacion-seguridad-adp
dominio: 4
Una norma exige que la empresa controle y pueda rotar la clave que cifra los datos de BigQuery. ¿Qué configuras?
- [ ] Nada: el cifrado predeterminado de Google ya cumple ese requisito de control propio.
- [x] Claves administradas por el cliente (CMEK) en Cloud KMS, asignadas al dataset o a la tabla.
- [ ] Una contraseña en la descripción del dataset, que BigQuery usa para cifrar cada tabla nueva.
- [ ] Un archivo ZIP con contraseña antes de cargar los datos.
porque: Con CMEK, la clave vive en Cloud KMS bajo control del cliente, que puede rotarla o deshabilitarla.

## Quién hizo qué
leccion: cert-gcp-pde-operacion-seguridad-adp
dominio: 4
Auditoría pregunta quién borró una tabla el martes. ¿Dónde lo buscas?
- [ ] En Looker Studio, en el historial del informe.
- [x] En los registros de auditoría de Cloud Audit Logs (actividad de administración y acceso a datos).
- [ ] En la descripción de la tabla, que BigQuery actualiza con cada cambio y cada borrado.
- [ ] En la factura del mes.
porque: Cloud Audit Logs registra quién hizo cada operación administrativa y de acceso a datos.

## Particionar por fecha
leccion: cert-gcp-pde-operacion-seguridad-adp
dominio: 4
La tabla de viajes crece cada día y casi todas las consultas filtran por fecha. ¿Qué diseño baja el costo?
- [ ] Una tabla nueva por cada consulta.
- [x] Particionar por la fecha del viaje (y exigir el filtro de partición).
- [ ] Guardar todo en una sola columna JSON.
- [ ] Ordenar la tabla por fecha al consultarla con `ORDER BY`, para que BigQuery lea solo las primeras filas.
porque: Con partición por fecha, las consultas que filtran por fecha leen solo las particiones necesarias.

## Vencimiento de particiones
leccion: cert-gcp-pde-operacion-seguridad-adp
dominio: 4
Las posiciones de las bicicletas solo se necesitan 90 días en BigQuery. ¿Qué configuras?
- [ ] Un recordatorio para borrar a mano cada trimestre.
- [x] El vencimiento de particiones (`partition_expiration_days = 90`).
- [ ] Una vista que filtra los últimos 90 días, sin borrar nada.
- [ ] Un clustering por fecha, que borra los bloques de más de 90 días.
porque: El vencimiento de particiones borra automáticamente las particiones más viejas que el plazo.

## Descubrir datos
leccion: cert-gcp-pde-operacion-seguridad-adp
dominio: 4
Un analista nuevo no sabe qué tablas existen ni quién es responsable de cada una. ¿Qué servicio le ayuda a buscar y entender los datos?
- [ ] Cloud Build.
- [x] Dataplex Universal Catalog, con búsqueda, descripciones y metadatos de negocio.
- [ ] Cloud NAT, con un registro de las tablas consultadas.
- [ ] Compute Engine.
porque: El catálogo de Dataplex centraliza la búsqueda y los metadatos técnicos y de negocio de los datos.
