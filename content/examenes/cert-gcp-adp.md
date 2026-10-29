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
