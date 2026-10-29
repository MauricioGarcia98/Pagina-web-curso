# examen: cert-aws
# id: aws-dea
# titulo: AWS Certified Data Engineer – Associate (DEA-C01)

## Firehose
leccion: cert-aws-dea-ingesta-transformacion
Eventos de una app móvil deben llegar a S3 en Parquet, particionados por fecha, sin programar consumidores; un retraso de 2 minutos es aceptable. ¿Qué usas?
- [ ] Kinesis Data Streams con una aplicación KCL en una instancia EC2 propia.
- [x] Amazon Data Firehose con conversión de formato y particionado dinámico.
- [ ] Amazon MSK con un clúster de Kafka Connect y un conector hacia S3.
- [ ] Una función Lambda por evento que escribe un archivo Parquet en S3.
porque: Firehose entrega a S3 sin código, convierte a Parquet con el esquema del Glue Data Catalog y particiona por campos del registro.

## Orden por clave
leccion: cert-aws-dea-ingesta-transformacion
Los eventos de cada pedido deben procesarse en orden, varios equipos consumen el mismo flujo y a veces hay que releer los últimos 3 días. ¿Qué servicio cumple todo?
- [ ] Amazon Data Firehose con un buffer de 900 segundos hacia S3.
- [x] Kinesis Data Streams con el id de pedido como clave de partición.
- [ ] Amazon SQS estándar con varios consumidores leyendo la misma cola.
- [ ] Amazon SNS con una suscripción por cada equipo consumidor.
porque: KDS mantiene el orden por shard (misma clave, mismo shard), admite varios consumidores y retención ampliable para releer.

## Shard caliente
leccion: cert-aws-dea-ingesta-transformacion
Un stream aprovisionado devuelve `ProvisionedThroughputExceededException` aunque el total está por debajo de la capacidad. La clave de partición es el tipo de evento (5 valores). ¿Qué haces?
- [ ] Aumentar la retención del stream a 7 días.
- [x] Usar una clave de partición de alta cardinalidad.
- [ ] Agregar consumidores con fan-out mejorado.
- [ ] Reducir el tamaño de cada registro enviado.
porque: Con pocas claves, el tráfico se concentra en pocos shards. Una clave con muchos valores reparte la escritura.

## CDC
leccion: cert-aws-dea-ingesta-transformacion
Una base SQL Server on-premises debe replicarse a S3 continuamente, incluyendo actualizaciones y borrados. ¿Qué servicio usas?
- [ ] AWS DataSync con una tarea programada cada quince minutos.
- [x] AWS DMS con carga completa y replicación continua (CDC).
- [ ] Amazon AppFlow con un flujo programado sobre la base de datos.
- [ ] AWS Transfer Family con exportaciones nocturnas por SFTP.
porque: DMS hace la carga inicial y luego aplica los cambios leídos del log de transacciones.

## SaaS
leccion: cert-aws-dea-ingesta-transformacion
Marketing necesita los datos de oportunidades de Salesforce en S3 cada día, sin escribir código. ¿Qué usas?
- [ ] AWS DMS con Salesforce como endpoint de origen.
- [x] Amazon AppFlow con un flujo programado.
- [ ] Un job de Glue con un conector JDBC genérico.
- [ ] AWS DataSync con un agente on-premises.
porque: AppFlow conecta aplicaciones SaaS como Salesforce con S3 y otros destinos sin código.

## Zero-ETL
leccion: cert-aws-dea-ingesta-transformacion
Los pedidos en Aurora MySQL deben analizarse en Redshift casi en tiempo real, sin construir ni mantener pipelines. ¿Qué configuras?
- [ ] Un job de Glue que copia la tabla completa cada cinco minutos.
- [x] Una integración zero-ETL de Aurora hacia Redshift.
- [ ] Una consulta federada desde Redshift ejecutada por los paneles.
- [ ] Un export diario de Aurora a S3 y un `COPY` hacia Redshift.
porque: Zero-ETL replica los cambios de Aurora a Redshift en segundos sin pipelines que mantener.

## Bookmarks
leccion: cert-aws-dea-ingesta-transformacion
Un job de Glue programado cada hora procesa otra vez todos los archivos históricos. ¿Qué falta?
- [ ] Un crawler que se ejecute antes del job en cada corrida.
- [x] Habilitar job bookmarks con `transformation_ctx` y `job.commit()`.
- [ ] Más workers G.2X y auto scaling habilitado en el job.
- [ ] Cambiar el tipo de job de Spark a Python shell.
porque: Los bookmarks guardan qué se procesó; sin ellos cada ejecución lee todo.

## Glue o EMR
leccion: cert-aws-dea-ingesta-transformacion
Una transformación diaria de Spark necesita una biblioteca de HBase y configuraciones finas del clúster, y corre 20 horas al día. ¿Qué es más adecuado?
- [ ] Un job de AWS Glue con workers Flex para ahorrar costo.
- [x] Amazon EMR, con nodos task en instancias Spot.
- [ ] Una función Lambda con una capa que incluya HBase.
- [ ] Athena con CTAS sobre los datos de S3.
porque: EMR da control del framework y la configuración; para uso casi continuo y nodos Spot suele ser más barato que Glue.

## Lambda
leccion: cert-aws-dea-ingesta-transformacion
Cada vez que llega a S3 un archivo de unos 5 MB hay que validarlo y moverlo a otra carpeta. ¿Qué es lo más simple?
- [ ] Un clúster de EMR que revisa el bucket cada minuto.
- [x] Una función Lambda disparada por la notificación de S3.
- [ ] Un job de Glue programado cada cinco minutos.
- [ ] Un flujo de Kinesis que lee el bucket en tiempo real.
porque: Lambda responde al evento de S3 y procesa archivos chicos en segundos, sin servidores.

## Step Functions
leccion: cert-aws-dea-ingesta-transformacion
Un pipeline debe ejecutar un crawler, esperar un job de Glue, procesar en paralelo miles de archivos y notificar errores, sin servidores. ¿Qué orquestador usas?
- [ ] Amazon MWAA con un entorno dedicado para el equipo.
- [x] AWS Step Functions con estados Task, Map y Catch.
- [ ] Un cron en EC2 que llama a la API de Glue en orden.
- [ ] Amazon EventBridge con una regla por cada paso.
porque: Step Functions integra Glue y SNS, espera con `.sync`, paraleliza con Map y maneja errores, todo serverless.

## MWAA
leccion: cert-aws-dea-ingesta-transformacion
El equipo tiene 300 DAGs de Apache Airflow en un servidor propio y quiere dejar de administrarlo sin reescribirlos. ¿Qué usa?
- [ ] AWS Step Functions, convirtiendo cada DAG en una máquina de estados.
- [x] Amazon Managed Workflows for Apache Airflow (MWAA).
- [ ] Glue Workflows, recreando los DAGs con triggers de Glue.
- [ ] EventBridge Scheduler con una regla por cada tarea del DAG.
porque: MWAA ejecuta los DAGs existentes en un Airflow administrado.

## Clase de S3
leccion: cert-aws-dea-almacenamiento
Un bucket de datos de ML tiene un patrón de acceso impredecible: algunos objetos se leen a diario y otros nunca. ¿Qué clase minimiza el costo sin análisis manual?
- [ ] S3 Standard-IA para todos los objetos del bucket.
- [x] S3 Intelligent-Tiering.
- [ ] S3 One Zone-IA con replicación a otra región.
- [ ] S3 Glacier Flexible Retrieval para todo el bucket.
porque: Intelligent-Tiering mueve cada objeto al nivel adecuado según su acceso real.

## Retención
leccion: cert-aws-dea-almacenamiento
Los registros de transacciones deben conservarse 10 años sin poder modificarse ni borrarse, y casi nunca se consultan. ¿Qué combinación usas?
- [ ] S3 Standard con versionado y MFA Delete habilitados.
- [x] S3 Glacier Deep Archive con Object Lock en modo cumplimiento.
- [ ] S3 Intelligent-Tiering con una política de bucket restrictiva.
- [ ] Una tabla de DynamoDB con PITR y TTL de 10 años.
porque: Deep Archive es la clase más barata para retención larga y Object Lock en modo cumplimiento impide modificar o borrar.

## Formato
leccion: cert-aws-dea-almacenamiento
Las consultas de Athena sobre archivos JSON cuestan mucho y solo usan 4 de 60 columnas. ¿Qué cambio reduce más el costo?
- [ ] Comprimir los JSON con GZIP y dejarlos en la misma carpeta.
- [x] Convertir a Parquet particionado por fecha.
- [ ] Mover los archivos a S3 Standard-IA.
- [ ] Aumentar el límite de datos escaneados del workgroup.
porque: Un formato columnar lee solo las columnas usadas y las particiones evitan leer fechas que no se consultan.

## Iceberg
leccion: cert-aws-dea-almacenamiento
El lago necesita `MERGE` y `DELETE` por cumplimiento del derecho al olvido, con transacciones ACID desde Athena y Glue. ¿Qué formato de tabla usas?
- [ ] Tablas Hive en CSV con particiones por cliente.
- [x] Apache Iceberg.
- [ ] Archivos ORC sin catálogo.
- [ ] Tablas externas de Redshift Spectrum.
porque: Iceberg agrega ACID, MERGE, UPDATE, DELETE, evolución de esquema y viaje en el tiempo sobre S3.

## Partition projection
leccion: cert-aws-dea-almacenamiento
Una tabla tiene particiones por fecha y hora desde hace 5 años y el crawler tarda horas en registrar las nuevas. ¿Qué lo resuelve con menos mantenimiento?
- [ ] Ejecutar `MSCK REPAIR TABLE` cada diez minutos.
- [x] Configurar partition projection en Athena.
- [ ] Reducir las particiones a una sola por año.
- [ ] Programar el crawler cada cinco minutos.
porque: Partition projection calcula las particiones desde la configuración de la tabla, sin registrarlas en el catálogo.

## Distribución
leccion: cert-aws-dea-almacenamiento
En Redshift, una tabla de 300 filas de países se une con todas las tablas de hechos. ¿Qué estilo de distribución usas para ella?
- [ ] KEY por el id del país en todas las tablas.
- [x] ALL.
- [ ] EVEN.
- [ ] Ninguno: se deja sin clave de ordenamiento.
porque: Una dimensión chica con ALL tiene una copia en cada nodo y los joins no mueven datos.

## Carga a Redshift
leccion: cert-aws-dea-almacenamiento
Hay que cargar 2.000 millones de filas desde S3 a Redshift de la forma más rápida. ¿Cómo?
- [ ] Con `INSERT` por lotes de mil filas desde una función Lambda.
- [x] Con `COPY` desde varios archivos en S3 en paralelo.
- [ ] Con una consulta federada desde Redshift hacia los archivos.
- [ ] Con DMS usando S3 como origen y Redshift como destino.
porque: COPY carga en paralelo usando todos los slices del clúster; conviene dividir en varios archivos.

## DynamoDB
leccion: cert-aws-dea-almacenamiento
Una app debe leer el estado de un envío por id en milisegundos con millones de lecturas por hora. ¿Qué almacén usas?
- [ ] Amazon Redshift con una clave de ordenamiento por id.
- [x] Amazon DynamoDB con el id de envío como clave de partición.
- [ ] Amazon Athena con una tabla particionada por id.
- [ ] Amazon S3 con un objeto JSON por envío.
porque: DynamoDB da latencia de milisegundos a cualquier escala con acceso por clave.

## Vectores
leccion: cert-aws-dea-almacenamiento
Un índice vectorial de 2.000 millones de embeddings debe usar poca memoria; se acepta un recall algo menor. ¿Qué tipo de índice conviene?
- [ ] HNSW sin cuantización.
- [x] IVF (con cuantización).
- [ ] Un índice B-tree.
- [ ] Un índice invertido de texto.
porque: IVF agrupa los vectores y busca en pocos grupos, con menos memoria que HNSW a cambio de algo de recall.

## Alertas
leccion: cert-aws-dea-operacion-seguridad
dominio: 3
Un job de Glue falla de noche y nadie se entera. ¿Qué configuras con el menor esfuerzo operativo?
- [ ] Un script en EC2 que consulta el estado del job cada cinco minutos.
- [x] Una regla de EventBridge para el estado FAILED que publique en SNS.
- [ ] Un panel de QuickSight con el historial de ejecuciones del job.
- [ ] Un crawler que verifica si llegaron particiones nuevas a la tabla.
porque: Glue emite eventos de cambio de estado; EventBridge los envía a SNS sin código.

## Calidad
leccion: cert-aws-dea-operacion-seguridad
dominio: 3
Un pipeline debe frenar la publicación si hay ids duplicados o montos negativos, con reglas declarativas. ¿Qué usas?
- [ ] Amazon Macie con identificadores de datos personalizados.
- [x] AWS Glue Data Quality con reglas DQDL en el job.
- [ ] AWS Config con reglas administradas sobre el bucket.
- [ ] CloudTrail Lake con consultas SQL sobre los eventos.
porque: Glue Data Quality evalúa reglas como `IsUnique` y `ColumnValues` y permite detener el pipeline si fallan.

## Lake Formation
leccion: cert-aws-dea-operacion-seguridad
dominio: 4
Analistas de varios equipos consultan el lago desde Athena y EMR; cada equipo solo debe ver las filas de su región y no ver la columna de salario. ¿Qué usas?
- [ ] Una copia de la tabla por equipo, filtrada y sin la columna.
- [x] Lake Formation con filtros de datos por fila y columna.
- [ ] Políticas de bucket por prefijo de región en S3.
- [ ] Cifrado SSE-KMS con una clave distinta por equipo.
porque: Lake Formation aplica permisos de fila, columna y celda que respetan Athena, EMR, Glue y Redshift Spectrum.

## Secretos
leccion: cert-aws-dea-operacion-seguridad
dominio: 4
Un job de Glue se conecta a una base RDS y la contraseña debe rotarse automáticamente cada 30 días. ¿Dónde la guardas?
- [ ] En los parámetros del job de Glue, como texto plano.
- [x] En AWS Secrets Manager con rotación automática.
- [ ] En un archivo de configuración cifrado dentro de S3.
- [ ] En Parameter Store como String, rotada por un cron.
porque: Secrets Manager guarda y rota credenciales; el job lee el secreto por ARN con su rol.

## PII
leccion: cert-aws-dea-operacion-seguridad
dominio: 4
Auditoría quiere saber qué buckets contienen números de tarjeta y documentos de identidad. ¿Qué servicio usas?
- [ ] AWS CloudTrail con data events habilitados en S3.
- [x] Amazon Macie.
- [ ] Amazon GuardDuty.
- [ ] AWS Config con reglas de cifrado.
porque: Macie descubre y clasifica datos sensibles en S3 y genera hallazgos.

## @caso retail: Mercado Austral
Mercado Austral es una cadena de supermercados con 450 tiendas. Su plataforma de datos en AWS tiene:
- Ventas de las cajas que llegan como eventos JSON (unos 4.000 por segundo en hora pico).
- Una base Aurora PostgreSQL con el catálogo de productos y precios.
- Un lago en S3 con capas bronze, silver y gold, catalogado en AWS Glue.
- Analistas que consultan con Athena y un data warehouse en Amazon Redshift para los tableros de gerencia.

Problemas: los tableros de gerencia muestran datos de ayer, la factura de Athena se triplicó, un analista de marketing pudo ver el DNI de los clientes y nadie se entera cuando falla la carga nocturna.

## Tableros casi en tiempo real
leccion: cert-aws-dea-ingesta-transformacion
dominio: 1
caso: retail
Gerencia quiere ver las ventas en Redshift con menos de un minuto de retraso, con el menor esfuerzo operativo. ¿Qué haces?
- [ ] Un job de Glue cada hora que lee los archivos de ventas de S3 y los carga en Redshift con `COPY`.
- [x] Enviar las ventas a Kinesis Data Streams y usar streaming ingestion de Redshift con una vista materializada.
- [ ] Un clúster de EMR con Spark Streaming escribiendo en Redshift fila por fila.
- [ ] Exportar las ventas a CSV cada minuto y cargarlas con `INSERT`.
porque: La ingesta de streaming de Redshift lee directamente de Kinesis o MSK en una vista materializada, con baja latencia y sin pipeline intermedio.

## Factura de Athena
leccion: cert-aws-dea-operacion-seguridad
dominio: 3
caso: retail
¿Qué dos cambios reducen el costo de Athena sobre la capa silver?
- [x] Convertir los JSON a Parquet particionado por fecha.
- [x] Crear workgroups con límites de datos escaneados por consulta.
- [ ] Mover la capa silver a S3 Glacier Deep Archive.
- [ ] Desactivar el Glue Data Catalog.
- [ ] Aumentar la retención de los resultados de consultas.
porque: Athena cobra por datos escaneados: formatos columnares y particiones reducen lo leído, y los workgroups ponen límites.

## DNI visible
leccion: cert-aws-dea-operacion-seguridad
dominio: 4
caso: retail
¿Cómo evitas que marketing vea la columna DNI en Athena sin crear copias de las tablas?
- [ ] Una política de bucket que bloquee a marketing todos los objetos de la carpeta de clientes en S3.
- [x] Permisos de columna en AWS Lake Formation que excluyan DNI para el rol de marketing.
- [ ] Cifrar la columna con SSE-S3.
- [ ] Un crawler que borre la columna.
porque: Lake Formation concede permisos a nivel de columna sobre el catálogo y Athena los aplica.

## Carga nocturna sin aviso
leccion: cert-aws-dea-operacion-seguridad
dominio: 3
caso: retail
La carga nocturna es una máquina de estados de Step Functions. ¿Cómo te enteras cuando falla?
- [ ] Revisando cada mañana el historial de ejecuciones en la consola de Step Functions.
- [x] Una regla de EventBridge para el estado `FAILED` de la ejecución que publique en SNS.
- [ ] Un crawler que verifica la tabla.
- [ ] Una consulta de Athena programada.
porque: Step Functions emite eventos de cambio de estado; EventBridge los enruta a SNS para notificar.

## Firehose a Iceberg
leccion: cert-aws-dea-ingesta-transformacion
dominio: 1
Hay que escribir eventos de streaming directamente en tablas Apache Iceberg en S3 con inserciones y actualizaciones por clave, sin código. ¿Qué usas?
- [ ] Kinesis Data Streams con un consumidor KCL que escribe archivos Parquet en la carpeta de la tabla.
- [x] Amazon Data Firehose con destino de tablas Apache Iceberg.
- [ ] AWS DataSync.
- [ ] Amazon AppFlow.
porque: Firehose puede entregar a tablas Iceberg y aplicar operaciones de inserción, actualización y borrado.

## Transformación en Firehose
leccion: cert-aws-dea-ingesta-transformacion
dominio: 1
Antes de llegar a S3, cada evento debe enriquecerse con un campo calculado simple. ¿Qué usas dentro de Firehose?
- [ ] Un job de Glue en streaming que lee de Firehose y vuelve a escribir en otro Firehose.
- [x] Una función Lambda de transformación de datos de Firehose.
- [ ] Una vista materializada de Redshift.
- [ ] Un crawler.
porque: Firehose puede invocar una Lambda por lote de registros para transformarlos antes de entregarlos.

## Flink administrado
leccion: cert-aws-dea-ingesta-transformacion
dominio: 1
Hay que detectar en tiempo real tarjetas con más de 5 compras en 2 minutos y enviar una alerta. ¿Qué servicio usas?
- [ ] Amazon Data Firehose con un buffer de 120 segundos y una Lambda que cuenta las compras de cada lote.
- [x] Amazon Managed Service for Apache Flink con ventanas por tarjeta.
- [ ] Athena con consultas programadas cada minuto.
- [ ] AWS Glue con job bookmarks.
porque: Flink procesa streams con estado y ventanas por clave, ideal para detección de patrones en tiempo real.

## Consumidores de Kinesis
leccion: cert-aws-dea-ingesta-transformacion
dominio: 1
Cinco aplicaciones leen el mismo stream de Kinesis y sufren límites de lectura. ¿Qué lo resuelve?
- [ ] Aumentar el período de retención del stream a 7 días para que las aplicaciones lean más tarde.
- [x] Enhanced fan-out, que da a cada consumidor su propio ancho de banda de lectura.
- [ ] Usar una sola clave de partición.
- [ ] Cambiar a Firehose.
porque: Con enhanced fan-out cada consumidor registrado obtiene 2 MB/s por shard propios.

## Lambda con SQS
leccion: cert-aws-dea-ingesta-transformacion
dominio: 1
Una Lambda procesa mensajes de SQS y algunos fallan siempre por datos corruptos, bloqueando el reprocesamiento. ¿Qué configuras?
- [ ] Aumentar el tiempo de espera de la Lambda al máximo de 15 minutos para que termine de procesarlos.
- [x] Una dead-letter queue en la cola, con un máximo de recepciones.
- [ ] Desactivar los reintentos de SQS.
- [ ] Una cola FIFO.
porque: Tras varios intentos fallidos, SQS mueve el mensaje a la DLQ para analizarlo sin bloquear el resto.

## Glue Flex
leccion: cert-aws-dea-ingesta-transformacion
dominio: 1
Un job de Glue no urgente puede tardar más en arrancar. ¿Qué opción reduce su costo?
- [ ] Workers G.8X para que termine más rápido y cueste menos en total por la duración menor.
- [x] La clase de ejecución Flex.
- [ ] Job bookmarks deshabilitados.
- [ ] Un crawler adicional.
porque: Flex usa capacidad de reserva con menor precio para trabajos que toleran demoras de inicio.

## Map distribuido
leccion: cert-aws-dea-ingesta-transformacion
dominio: 1
Hay que procesar en paralelo 2 millones de objetos de S3 con una Lambda cada uno, orquestado y con reintentos. ¿Qué usas?
- [ ] Un bucle `for` en una sola Lambda que procesa los objetos de a uno durante 15 minutos.
- [x] Step Functions con el estado Map en modo distribuido.
- [ ] Un crawler de Glue.
- [ ] Amazon AppFlow.
porque: Map distribuido ejecuta hasta miles de iteraciones en paralelo sobre objetos de S3 con manejo de errores.

## Programación de EventBridge
leccion: cert-aws-dea-ingesta-transformacion
dominio: 1
Un job de Glue debe correr cada día a las 3:00 hora local con el menor esfuerzo. ¿Qué usas?
- [ ] Una instancia EC2 encendida todo el día con un cron que llama a la API de Glue.
- [x] Un disparador programado de Glue o EventBridge Scheduler.
- [ ] Un stream de Kinesis.
- [ ] Un crawler.
porque: Los disparadores programados de Glue y EventBridge Scheduler ejecutan tareas por horario sin servidores.

## Procesamiento con LLM
leccion: cert-aws-dea-ingesta-transformacion
dominio: 1
Hay que clasificar 10 millones de reseñas en categorías dentro de un pipeline nocturno, al menor costo. ¿Qué usas?
- [ ] Llamadas síncronas a Amazon Bedrock desde una Lambda por cada reseña del archivo.
- [x] Inferencia por lotes de Amazon Bedrock sobre un archivo en S3.
- [ ] Amazon Comprehend en tiempo real por reseña.
- [ ] Un crawler.
porque: La inferencia por lotes de Bedrock procesa grandes volúmenes de forma asíncrona y con descuento.

## Particionar en S3
leccion: cert-aws-dea-almacenamiento
dominio: 2
Las consultas filtran casi siempre por fecha y a veces por región. ¿Qué esquema de prefijos en S3 conviene?
- [ ] `s3://lago/ventas/<id_transaccion>.json`, un archivo por transacción.
- [x] `s3://lago/ventas/fecha=AAAA-MM-DD/` (y región si hay pocas).
- [ ] `s3://lago/ventas/<usuario>/`.
- [ ] Todo en una sola carpeta.
porque: Particionar por las columnas de filtro permite descartar particiones; demasiadas particiones chicas perjudican.

## Redshift Serverless
leccion: cert-aws-dea-almacenamiento
dominio: 2
Un equipo usa Redshift pocas horas al día con picos impredecibles y no quiere administrar nodos. ¿Qué usa?
- [ ] Un clúster aprovisionado RA3 de 8 nodos encendido todo el día con concurrency scaling.
- [x] Amazon Redshift Serverless.
- [ ] Amazon RDS.
- [ ] DynamoDB.
porque: Redshift Serverless escala automáticamente y cobra por uso (RPU-hora).

## Data sharing
leccion: cert-aws-dea-almacenamiento
dominio: 2
Finanzas tiene su propio clúster de Redshift y necesita leer en vivo tablas del clúster de ventas, sin copias. ¿Qué usas?
- [ ] `UNLOAD` diario a S3 y `COPY` desde el clúster de finanzas.
- [x] Redshift data sharing.
- [ ] AWS DMS.
- [ ] Federated query.
porque: Data sharing da acceso de solo lectura en vivo a datos de otro clúster o cuenta sin moverlos.

## Sort key
leccion: cert-aws-dea-almacenamiento
dominio: 2
Casi todas las consultas filtran la tabla de ventas por rango de fechas. ¿Qué defines en Redshift?
- [ ] Una distribution key por fecha para que todas las filas de un día queden en el mismo nodo.
- [x] Una sort key por fecha.
- [ ] DISTSTYLE ALL.
- [ ] Un índice secundario global.
porque: Ordenar por fecha permite a Redshift saltar bloques que no cumplen el filtro (zone maps).

## Clave de DynamoDB
leccion: cert-aws-dea-almacenamiento
dominio: 2
Una tabla de DynamoDB con clave de partición `estado` (5 valores) tiene throttling aunque la capacidad total alcanza. ¿Qué cambias?
- [ ] Aumentar la capacidad aprovisionada de la tabla al doble de lo que se necesita.
- [x] Usar una clave de partición de alta cardinalidad (por ejemplo, el id del pedido).
- [ ] Activar TTL.
- [ ] Crear un LSI.
porque: Pocas claves concentran el tráfico en pocas particiones físicas; una clave con muchos valores lo distribuye.

## GSI
leccion: cert-aws-dea-almacenamiento
dominio: 2
La tabla tiene clave `pedido_id`, pero ahora hay que consultar los pedidos de un cliente ordenados por fecha. ¿Qué agregas?
- [ ] Un `Scan` con filtro por cliente en cada consulta de la aplicación.
- [x] Un índice secundario global con partición `cliente_id` y ordenamiento `fecha`.
- [ ] Un índice secundario local con partición `cliente_id`.
- [ ] Una tabla nueva sin claves.
porque: Un GSI permite otro patrón de acceso con claves distintas; un LSI debe compartir la clave de partición.

## Exportar DynamoDB
leccion: cert-aws-dea-almacenamiento
dominio: 2
Hay que analizar la tabla de DynamoDB con Athena cada semana sin consumir capacidad de lectura. ¿Qué haces?
- [ ] Un `Scan` completo con una Lambda que escribe los ítems en S3.
- [x] Export to S3 de DynamoDB (requiere PITR) y consultar el resultado.
- [ ] Un crawler sobre DynamoDB.
- [ ] Federated query de Redshift.
porque: La exportación a S3 usa los backups continuos y no consume capacidad de la tabla.

## Vectores en Aurora
leccion: cert-aws-dea-almacenamiento
dominio: 2
El equipo ya usa Aurora PostgreSQL y quiere guardar embeddings junto a los datos relacionales con búsqueda por similitud. ¿Qué usa?
- [ ] Amazon S3 Glacier con un índice manual de los vectores guardado en un archivo CSV.
- [x] La extensión pgvector en Aurora PostgreSQL.
- [ ] Amazon Redshift Spectrum.
- [ ] DynamoDB con TTL.
porque: pgvector agrega tipos e índices vectoriales (HNSW, IVFFlat) a PostgreSQL.

## Versionado de S3
leccion: cert-aws-dea-almacenamiento
dominio: 2
¿Qué dos medidas protegen los objetos de bronze contra borrados accidentales?
- [x] Habilitar el versionado del bucket.
- [x] Usar Object Lock o MFA Delete para impedir borrados.
- [ ] Cambiar la clase a One Zone-IA.
- [ ] Desactivar el cifrado.
- [ ] Hacer el bucket público.
porque: El versionado conserva versiones anteriores y Object Lock o MFA Delete impiden eliminar o sobrescribir.

## Athena sobre Iceberg
leccion: cert-aws-dea-operacion-seguridad
dominio: 3
Un analista necesita ver cómo estaba la tabla Iceberg de precios ayer a las 18:00. ¿Qué usa en Athena?
- [ ] Una restauración del bucket de S3 con el versionado de objetos a esa hora.
- [x] `FOR TIMESTAMP AS OF` (viaje en el tiempo de Iceberg).
- [ ] `MSCK REPAIR TABLE`.
- [ ] Un nuevo crawler.
porque: Iceberg guarda snapshots y Athena permite consultar una versión anterior por fecha o id de snapshot.

## Reutilizar resultados
leccion: cert-aws-dea-operacion-seguridad
dominio: 3
Un tablero ejecuta la misma consulta de Athena cada 5 minutos sobre datos que cambian una vez por día. ¿Qué reduce el costo?
- [ ] Aumentar el tamaño de los archivos de resultados de las consultas del workgroup.
- [x] Habilitar la reutilización de resultados de consultas con una antigüedad máxima.
- [ ] Usar CSV en vez de Parquet.
- [ ] Desactivar el workgroup.
porque: Athena puede devolver resultados previos de la misma consulta sin volver a escanear los datos.

## QuickSight SPICE
leccion: cert-aws-dea-operacion-seguridad
dominio: 3
Los tableros de QuickSight son lentos porque cada visual consulta Athena en directo. ¿Qué mejora el rendimiento?
- [ ] Un clúster de EMR dedicado para procesar las consultas que hacen los tableros.
- [x] Importar los datos a SPICE con actualizaciones programadas.
- [ ] Más workgroups de Athena.
- [ ] Un crawler más frecuente.
porque: SPICE es el motor en memoria de QuickSight que acelera los tableros sin consultar la fuente en cada visual.

## Logs Insights
leccion: cert-aws-dea-operacion-seguridad
dominio: 3
Hay que encontrar cuántas veces apareció un error específico en los logs de los jobs de Glue la última semana. ¿Qué usas?
- [ ] Descargar todos los archivos de log a una laptop y buscarlos con un editor de texto.
- [x] CloudWatch Logs Insights con una consulta sobre el grupo de logs.
- [ ] AWS Config.
- [ ] Amazon Macie.
porque: Logs Insights consulta y agrega logs de CloudWatch con un lenguaje propio.

## Consumidor atrasado
leccion: cert-aws-dea-operacion-seguridad
dominio: 3
¿Qué métrica de CloudWatch indica que una Lambda que consume Kinesis se está atrasando?
- [ ] `Invocations`, que cuenta cuántas veces se ejecutó la función en el período.
- [x] `IteratorAge`.
- [ ] `Throttles` en S3.
- [ ] `BucketSizeBytes`.
porque: `IteratorAge` mide la antigüedad del último registro leído; si crece, el consumidor va atrasado.

## Recomendar reglas de calidad
leccion: cert-aws-dea-operacion-seguridad
dominio: 3
El equipo no sabe qué reglas de calidad escribir para 200 tablas nuevas. ¿Qué función ayuda?
- [ ] Amazon Macie, que crea reglas de calidad a partir de los datos sensibles encontrados.
- [x] Las recomendaciones de reglas de AWS Glue Data Quality, que analizan los datos y proponen reglas.
- [ ] AWS CloudTrail.
- [ ] Amazon QuickSight.
porque: Glue Data Quality puede calcular estadísticas y recomendar reglas DQDL como punto de partida.

## Anomalías de calidad
leccion: cert-aws-dea-operacion-seguridad
dominio: 3
El número de filas diarias de una tabla suele ser estable, pero un día llega la mitad. ¿Qué lo detecta sin reglas fijas?
- [ ] Una regla `RowCount > 0`, que verifica que la tabla no quede vacía después de cada carga.
- [x] La detección de anomalías de Glue Data Quality.
- [ ] Un crawler.
- [ ] Un VPC endpoint.
porque: La detección de anomalías aprende el comportamiento normal de las métricas y marca desvíos.

## Perfilar datos
leccion: cert-aws-dea-operacion-seguridad
dominio: 3
Un analista sin experiencia en código quiere ver la distribución, los nulos y los duplicados de un dataset nuevo. ¿Qué usa?
- [ ] Un job de EMR con un script de PySpark escrito por el equipo de ingeniería.
- [x] Un perfil de datos de AWS Glue DataBrew.
- [ ] AWS Config.
- [ ] Amazon Kinesis.
porque: DataBrew genera perfiles con estadísticas y calidad de columnas de forma visual.

## Auditar cambios de configuración
leccion: cert-aws-dea-operacion-seguridad
dominio: 3
¿Qué servicio muestra el historial de configuración de un bucket (por ejemplo, cuándo se desactivó el cifrado) y evalúa reglas de cumplimiento?
- [ ] Amazon CloudWatch Logs, con los logs de acceso del bucket guardados en otro bucket.
- [x] AWS Config.
- [ ] Amazon Macie.
- [ ] AWS Glue.
porque: Config registra cambios de configuración de recursos y evalúa reglas, como "buckets cifrados".

## Notebook SQL
leccion: cert-aws-dea-operacion-seguridad
dominio: 3
Un equipo quiere en un solo entorno consultar el lago con SQL, crear jobs de Glue y usar Bedrock sobre los mismos datos catalogados. ¿Qué usa?
- [ ] Una instancia EC2 con Jupyter y credenciales de administrador para cada analista.
- [x] Amazon SageMaker Unified Studio.
- [ ] AWS Config.
- [ ] Amazon AppFlow.
porque: SageMaker Unified Studio reúne analítica, ingeniería de datos e IA sobre el mismo catálogo.

## Rol de Glue
leccion: cert-aws-dea-operacion-seguridad
dominio: 4
Un job de Glue debe leer de `s3://lago/bronze/` y escribir en `s3://lago/silver/`. ¿Qué permisos le das?
- [ ] La política administrada `AmazonS3FullAccess` para que no falle por permisos.
- [x] Un rol de ejecución con lectura en bronze y escritura en silver (más permisos de Glue y del catálogo).
- [ ] Claves de acceso de un usuario IAM en los parámetros del job.
- [ ] Acceso público a los buckets.
porque: El principio de permisos mínimos limita el rol a las rutas y acciones necesarias.

## Endpoint de gateway
leccion: cert-aws-dea-operacion-seguridad
dominio: 4
Los jobs en subredes privadas deben acceder a S3 sin pasar por internet ni una NAT gateway. ¿Qué agregas?
- [ ] Una IP elástica para cada instancia de las subredes privadas del clúster.
- [x] Un VPC gateway endpoint para S3.
- [ ] Un bucket público.
- [ ] AWS Direct Connect.
porque: El gateway endpoint enruta el tráfico a S3 por la red de AWS desde la VPC, sin costo de NAT.

## Política de bucket con HTTPS
leccion: cert-aws-dea-operacion-seguridad
dominio: 4
Seguridad exige que el bucket rechace cualquier acceso que no use TLS. ¿Qué agregas a la política del bucket?
- [ ] Una condición que permita solo las direcciones IP de la oficina central de la empresa.
- [x] Un `Deny` con la condición `aws:SecureTransport` igual a `false`.
- [ ] El cifrado SSE-S3.
- [ ] Object Lock.
porque: La condición `aws:SecureTransport` permite rechazar solicitudes sin HTTPS.

## Clave KMS propia
leccion: cert-aws-dea-operacion-seguridad
dominio: 4
Cumplimiento exige controlar quién puede descifrar los datos de silver y auditar cada uso de la clave. ¿Qué usas?
- [ ] SSE-S3, que cifra con claves que administra AWS de forma transparente.
- [x] SSE-KMS con una clave administrada por el cliente y su política de clave.
- [ ] Cifrado del lado del cliente con una contraseña compartida.
- [ ] Ningún cifrado, con permisos IAM estrictos.
porque: Con una clave KMS propia se controla su política y cada uso queda registrado en CloudTrail.

## Bucket Keys
leccion: cert-aws-dea-operacion-seguridad
dominio: 4
Un bucket con SSE-KMS recibe millones de objetos por día y el costo de KMS es alto. ¿Qué lo reduce?
- [ ] Cambiar a una clave KMS distinta para cada objeto que se escribe en el bucket.
- [x] Habilitar S3 Bucket Keys.
- [ ] Desactivar el versionado.
- [ ] Usar One Zone-IA.
porque: Bucket Keys reduce las llamadas a KMS usando una clave de bucket de corta duración.

## LF-Tags
leccion: cert-aws-dea-operacion-seguridad
dominio: 4
Hay 3.000 tablas y los permisos deben darse por nivel de confidencialidad, incluidas las tablas nuevas. ¿Qué usas en Lake Formation?
- [ ] Permisos tabla por tabla con un script que se ejecuta cada vez que alguien crea una tabla.
- [x] Control de acceso basado en LF-Tags (por ejemplo, `confidencialidad=alta`).
- [ ] Una política de bucket por tabla.
- [ ] Un rol IAM por tabla.
porque: Los LF-Tags permiten conceder permisos por etiqueta, que escalan a muchas tablas.

## Compartir entre cuentas
leccion: cert-aws-dea-operacion-seguridad
dominio: 4
La cuenta de analítica debe consultar con Athena las tablas del lago de la cuenta de datos, sin copiar. ¿Qué usas?
- [ ] Copiar los archivos de S3 a la cuenta de analítica todas las noches con DataSync.
- [x] Compartir las tablas con Lake Formation entre cuentas (con AWS RAM).
- [ ] Hacer público el bucket.
- [ ] Usar AppFlow.
porque: Lake Formation comparte bases y tablas del catálogo con otras cuentas manteniendo el control de permisos.

## Residencia
leccion: cert-aws-dea-operacion-seguridad
dominio: 4
La empresa debe garantizar que ninguna cuenta cree recursos fuera de dos regiones de la UE. ¿Qué usas?
- [ ] Una política IAM en cada usuario que pida no usar otras regiones al crear recursos.
- [x] Una SCP de AWS Organizations que deniegue acciones fuera de esas regiones.
- [ ] Amazon Macie.
- [ ] Un VPC endpoint.
porque: Las SCP establecen límites para todas las cuentas de la organización, incluidas las regiones permitidas.

## Datos sensibles en jobs
leccion: cert-aws-dea-operacion-seguridad
dominio: 4
Un job de Glue debe detectar y enmascarar correos y teléfonos mientras transforma los datos. ¿Qué usa?
- [ ] Amazon Macie dentro del job, llamado una vez por fila para clasificar cada valor.
- [x] La transformación de detección de datos sensibles de AWS Glue.
- [ ] AWS Config.
- [ ] CloudTrail Lake.
porque: Glue incluye detección de PII en los jobs con acciones como enmascarar o hacer hash.
