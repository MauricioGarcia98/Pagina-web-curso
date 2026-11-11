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

## Kinesis on-demand
leccion: cert-aws-dea-ingesta-transformacion
dominio: 1
El tráfico de clics es impredecible: a veces 10 veces más que lo normal, sin aviso. El equipo no quiere calcular shards. ¿Qué modo de Kinesis Data Streams usa?
- [x] On-demand.
- [ ] Provisioned con un solo shard y reintentos en el productor.
- [ ] Provisioned con escalado manual cada mañana desde la consola.
- [ ] Ninguno: Kinesis no admite picos y hay que usar SQS FIFO.
porque: En modo on-demand, Kinesis ajusta la capacidad solo según el tráfico; en provisioned hay que dimensionar los shards.

## Crawler de Glue
leccion: cert-aws-dea-ingesta-transformacion
dominio: 1
Llegan Parquet nuevos a S3 en carpetas `anio=/mes=/` y Athena no ve las particiones nuevas. ¿Qué forma automática de registrarlas en el Data Catalog usa el equipo?
- [ ] Editar el JSON de la tabla en S3 a mano cada día.
- [x] Un crawler de Glue programado (o partition projection).
- [ ] Reiniciar Athena desde la consola para que relea el bucket.
- [ ] Copiar los archivos a una sola carpeta sin particiones.
porque: El crawler detecta tablas y particiones nuevas y actualiza el catálogo. Partition projection evita registrar particiones calculándolas al consultar.

## EMR Serverless
leccion: cert-aws-dea-ingesta-transformacion
dominio: 1
Un job de Spark que corre 3 veces por semana usa bibliotecas propias y el equipo no quiere administrar clústeres. ¿Qué opción elige?
- [ ] Un clúster EMR en EC2 encendido todo el mes.
- [ ] AWS Lambda con Spark instalado en una capa.
- [x] EMR Serverless.
- [ ] Una instancia EC2 con Spark instalado a mano.
porque: EMR Serverless ejecuta Spark sin administrar clústeres y cobra por los recursos usados durante el job.

## Athena CTAS
leccion: cert-aws-dea-ingesta-transformacion
dominio: 1
Quieres convertir una tabla CSV de Athena a Parquet particionado por fecha, con una sola consulta SQL. ¿Qué usas?
- [ ] `INSERT INTO` sobre la misma tabla CSV.
- [ ] `UNLOAD` hacia Redshift con formato CSV.
- [ ] Un crawler de Glue configurado con salida Parquet.
- [x] `CREATE TABLE ... WITH (format = 'PARQUET', partitioned_by = ...) AS SELECT ...`
porque: CTAS en Athena escribe el resultado en S3 con el formato y las particiones indicadas y crea la tabla en el catálogo.

## Redshift Spectrum
leccion: cert-aws-dea-ingesta-transformacion
dominio: 1
En Redshift necesitan unir las ventas del warehouse con 5 años de logs en S3 que nadie quiere cargar. ¿Qué usan?
- [x] Redshift Spectrum con un esquema externo del Data Catalog.
- [ ] `COPY` de los 5 años de logs a una tabla temporal de Redshift.
- [ ] Un export diario de Redshift a CSV para unir en Excel.
- [ ] DynamoDB Streams entre S3 y Redshift.
porque: Spectrum consulta datos en S3 desde Redshift con tablas externas; no hace falta cargarlos.

## DataSync
leccion: cert-aws-dea-ingesta-transformacion
dominio: 1
Una empresa debe mover 40 TB de un servidor NFS de su oficina a S3 por la red, con verificación de integridad y programación. ¿Qué servicio usa?
- [ ] AWS Glue con un conector JDBC hacia el servidor NFS.
- [x] AWS DataSync.
- [ ] Amazon Kinesis Data Firehose con un agente en la oficina.
- [ ] Amazon AppFlow, que copia archivos desde servidores locales.
porque: DataSync transfiere archivos desde NFS, SMB u otros almacenamientos a S3, EFS o FSx, con verificación y programación.

## Evento de S3 a EventBridge
leccion: cert-aws-dea-ingesta-transformacion
dominio: 1
Cuando llega un archivo a `s3://ventas/entrada/`, debe arrancar un Step Functions y además avisar a otro equipo. ¿Qué es lo más simple?
- [ ] Una Lambda que lista el bucket cada minuto y compara con la lista anterior.
- [ ] Un crawler de Glue que corre cada 5 minutos y dispara el resto.
- [x] Activar las notificaciones de S3 a EventBridge y crear reglas con dos destinos.
- [ ] Un cron de EC2 que revisa la carpeta y envía correos.
porque: S3 envía eventos a EventBridge y una regla puede tener varios destinos (Step Functions, SNS, etc.) sin código de sondeo.

## Reintentos en Step Functions
leccion: cert-aws-dea-ingesta-transformacion
dominio: 1
Un paso de Step Functions llama a una API que a veces responde con error temporal. ¿Cómo lo manejas sin código extra?
- [ ] Duplicar el estado tres veces seguidas en la máquina de estados.
- [x] Un bloque `Retry` en ese estado, con backoff, y un `Catch` para el error final.
- [ ] Un estado `Wait` de 24 horas antes de cada llamada.
- [ ] Ignorar el error con `ResultPath: null` en ese estado.
porque: `Retry` reintenta con espera creciente según el tipo de error; `Catch` deriva a otro estado si se agotan los intentos.

## Glue DataBrew
leccion: cert-aws-dea-ingesta-transformacion
dominio: 1
Analistas sin experiencia en código quieren limpiar y normalizar un dataset con una interfaz visual y guardar los pasos como receta reutilizable. ¿Qué servicio usan?
- [ ] Amazon EMR con notebooks de Jupyter.
- [ ] AWS Lambda con pandas en una capa.
- [ ] Amazon Kinesis Data Analytics para SQL.
- [x] AWS Glue DataBrew.
porque: DataBrew ofrece más de 250 transformaciones visuales y guarda los pasos como recetas que se ejecutan en jobs.

## Concurrencia de Lambda
leccion: cert-aws-dea-ingesta-transformacion
dominio: 1
Una Lambda que escribe en una base relacional abre demasiadas conexiones en los picos y la base se satura. ¿Qué ajuste de Lambda limita esto?
- [x] Concurrencia reservada con un tope de ejecuciones (y RDS Proxy).
- [ ] Aumentar la memoria de la función al máximo para que termine antes.
- [ ] Bajar el timeout a un segundo para cortar las conexiones lentas.
- [ ] Cambiar el runtime de Python a Node.js para abrir menos conexiones.
porque: La concurrencia reservada pone un máximo de instancias simultáneas; RDS Proxy reutiliza conexiones a la base.

## SQS FIFO
leccion: cert-aws-dea-ingesta-transformacion
dominio: 1
Los cambios de saldo de cada cuenta deben procesarse en orden y sin duplicados, pero cuentas distintas pueden procesarse en paralelo. ¿Qué usas?
- [ ] Una cola SQS estándar con un solo consumidor para todas las cuentas.
- [ ] Un tema SNS estándar con varias suscripciones de Lambda.
- [x] Una cola SQS FIFO con `MessageGroupId` = id de cuenta.
- [ ] Un bucket de S3 con un archivo por cambio y nombres ordenados.
porque: FIFO garantiza orden dentro de cada grupo de mensajes y deduplica; grupos distintos se procesan en paralelo.

## Intelligent-Tiering
leccion: cert-aws-dea-almacenamiento
dominio: 2
Un data lake tiene archivos cuyo patrón de acceso nadie conoce: algunos se leen todos los días y otros nunca. ¿Qué clase de S3 baja costos sin reglas manuales?
- [ ] S3 Glacier Deep Archive para todos los objetos del bucket.
- [x] S3 Intelligent-Tiering.
- [ ] S3 One Zone-IA para todo, porque es la más barata de acceso rápido.
- [ ] S3 Standard con versionado activado.
porque: Intelligent-Tiering mueve cada objeto entre niveles de acceso según su uso real, sin costo de recuperación.

## Vistas materializadas en Redshift
leccion: cert-aws-dea-almacenamiento
dominio: 2
Un tablero ejecuta cada minuto la misma agregación costosa sobre una tabla grande de Redshift. ¿Qué usas?
- [ ] Una vista común, que guarda el resultado en disco.
- [ ] Un `UNLOAD` a S3 cada minuto y consultar con Athena.
- [ ] Copiar la tabla a DynamoDB y agregar ahí.
- [x] Una vista materializada con actualización automática.
porque: La vista materializada guarda el resultado precalculado y Redshift puede actualizarla de forma incremental.

## Concurrency scaling
leccion: cert-aws-dea-almacenamiento
dominio: 2
A fin de mes, cientos de analistas consultan Redshift a la vez y las consultas hacen cola. El resto del mes, la carga es baja. ¿Qué activas?
- [x] Concurrency scaling.
- [ ] Un clúster el doble de grande todo el año.
- [ ] Un segundo clúster que se crea a mano el día 28.
- [ ] Bajar la cantidad de slots de la cola de WLM a uno.
porque: Concurrency scaling agrega capacidad temporal para atender picos de consultas concurrentes y se cobra por uso.

## UNLOAD
leccion: cert-aws-dea-almacenamiento
dominio: 2
Hay que exportar una tabla grande de Redshift a S3 en Parquet, particionada por fecha, para que la lea otro equipo con Athena. ¿Qué comando usas?
- [ ] `COPY ventas TO 's3://...'` con formato Parquet.
- [ ] `SELECT ... INTO OUTFILE` como en MySQL.
- [x] `UNLOAD ('SELECT ...') TO 's3://...' FORMAT PARQUET PARTITION BY (fecha)`
- [ ] Un crawler de Glue sobre el clúster de Redshift.
porque: UNLOAD escribe el resultado de una consulta en S3, en paralelo, con formato y partición. COPY es para cargar hacia Redshift.

## TTL en DynamoDB
leccion: cert-aws-dea-almacenamiento
dominio: 2
Las sesiones de usuario en DynamoDB deben borrarse 24 horas después de creadas, sin costo de escritura extra. ¿Qué usas?
- [ ] Una Lambda que escanea la tabla cada hora y borra las viejas.
- [x] Time to Live (TTL) con un atributo de vencimiento.
- [ ] Un índice secundario global ordenado por fecha.
- [ ] DynamoDB Streams con un filtro por fecha de creación.
porque: TTL borra los ítems vencidos en segundo plano sin consumir capacidad de escritura.

## S3 Tables
leccion: cert-aws-dea-almacenamiento
dominio: 2
El equipo quiere tablas Apache Iceberg en S3 con compactación y limpieza de snapshots administradas por AWS. ¿Qué opción usa?
- [ ] Un bucket S3 común con un job de Glue que compacta a mano cada noche.
- [ ] DynamoDB con exportación a S3 en formato Iceberg.
- [ ] Redshift con tablas locales en formato Iceberg.
- [x] Amazon S3 Tables (table buckets).
porque: S3 Tables guarda tablas Iceberg en buckets especiales y hace el mantenimiento (compactación, snapshots) de forma automática.

## Workgroups de Athena
leccion: cert-aws-dea-almacenamiento
dominio: 2
Marketing lanza consultas de Athena que escanean terabytes por error. ¿Cómo limitas el gasto de ese equipo?
- [x] Un workgroup de Athena para marketing con límite de datos escaneados por consulta.
- [ ] Bajar los permisos de S3 de marketing a solo lectura.
- [ ] Mover los datos a Glacier para que las consultas fallen.
- [ ] Activar el versionado del bucket de resultados.
porque: Los workgroups separan equipos y permiten límites de datos escaneados por consulta o por período, y métricas por grupo.

## Schema Registry
leccion: cert-aws-dea-almacenamiento
dominio: 2
Varios productores escriben en Kinesis y un cambio de esquema rompió a los consumidores. ¿Qué servicio valida la compatibilidad de esquemas?
- [ ] AWS Config con una regla de esquemas.
- [ ] Amazon Macie.
- [x] AWS Glue Schema Registry.
- [ ] Un crawler de Glue sobre el stream.
porque: Schema Registry guarda versiones de esquemas (Avro, JSON, Protobuf) y verifica su compatibilidad antes de producir.

## VACUUM y ANALYZE en Redshift
leccion: cert-aws-dea-almacenamiento
dominio: 2
Después de borrar millones de filas y cargar otras tantas, las consultas en una tabla de Redshift empeoraron. ¿Qué haces si el mantenimiento automático no alcanzó a correr?
- [ ] Recrear el clúster desde un snapshot de la semana pasada.
- [x] Ejecutar `VACUUM` y `ANALYZE` sobre la tabla.
- [ ] Cambiar todas las columnas a `VARCHAR(MAX)`.
- [ ] Desactivar la compresión de las columnas de la tabla.
porque: VACUUM recupera espacio y reordena según la sort key; ANALYZE actualiza las estadísticas que usa el planificador.

## Alarmas de Glue
leccion: cert-aws-dea-operacion-seguridad
dominio: 3
El equipo quiere enterarse si un job de Glue falla, sin revisar la consola. ¿Qué es lo más directo?
- [ ] Revisar los logs de CloudWatch cada mañana a mano.
- [ ] Aumentar los reintentos del job a 10 para que nunca falle.
- [x] Una regla de EventBridge por estado FAILED con destino SNS.
- [ ] Un crawler que revisa si la tabla destino cambió.
porque: Glue publica eventos de cambio de estado en EventBridge; una regla puede notificar por SNS (correo, Slack mediante otros servicios).

## Monitoreo de consultas en Redshift
leccion: cert-aws-dea-operacion-seguridad
dominio: 3
Algunas consultas mal escritas ocupan Redshift durante horas. ¿Qué configuras para cortarlas o moverlas automáticamente?
- [ ] Un límite de filas en cada tabla.
- [x] Reglas de monitoreo de consultas (QMR) en WLM.
- [ ] Un snapshot automático cada hora.
- [ ] Un índice en cada columna filtrada.
porque: Las reglas de monitoreo de WLM definen límites (tiempo, filas, uso de CPU) y acciones como registrar, cambiar de cola o cancelar.

## Logs de MWAA
leccion: cert-aws-dea-operacion-seguridad
dominio: 3
Una tarea de un DAG de Amazon MWAA falla y quieres ver su log desde la consola de AWS. ¿Qué debe estar activado?
- [ ] AWS X-Ray en el entorno.
- [ ] Un bucket de S3 con versionado.
- [ ] La auditoría de CloudTrail para datos de S3.
- [x] El envío de logs de tareas de Airflow a CloudWatch Logs en el entorno.
porque: MWAA puede enviar a CloudWatch los logs de tareas, scheduler, workers y webserver; se activan por tipo y nivel.

## Reglas de calidad en DQDL
leccion: cert-aws-dea-operacion-seguridad
dominio: 3
En un job de Glue quieres que falle la carga si más del 1 % de `email` es nulo. ¿Cómo lo expresas en Glue Data Quality?
- [x] `Completeness "email" > 0.99`
- [ ] `IsUnique "email"`
- [ ] `ColumnLength "email" > 1`
- [ ] `RowCount > 0.99`
porque: La regla `Completeness` mide la proporción de valores no nulos de una columna.

## CloudTrail de datos
leccion: cert-aws-dea-operacion-seguridad
dominio: 3
Auditoría pide saber quién descargó objetos del bucket `finanzas` el mes pasado. ¿Qué debió estar activado?
- [ ] Solo los eventos de administración de CloudTrail.
- [x] Eventos de datos de S3 en CloudTrail para ese bucket.
- [ ] S3 Inventory semanal del bucket.
- [ ] Las métricas de solicitudes de CloudWatch.
porque: Los eventos de administración no registran lecturas de objetos; los eventos de datos sí (`GetObject`, `PutObject`).

## Rendimiento de Athena
leccion: cert-aws-dea-operacion-seguridad
dominio: 3
Una consulta de Athena sobre JSON sin particionar escanea 2 TB para leer un día. ¿Qué dos cambios reducen más el costo? (Elige dos.)
- [x] Convertir los datos a Parquet o ORC.
- [x] Particionar por fecha y filtrar por la partición.
- [ ] Usar `SELECT *` para que Athena lea en bloque.
- [ ] Aumentar el timeout de la consulta en el workgroup.
- [ ] Guardar los resultados en otro bucket con versionado.
porque: Los formatos columnares leen solo las columnas pedidas y la partición limita los archivos leídos; Athena cobra por datos escaneados.

## Etiquetas de costo
leccion: cert-aws-dea-operacion-seguridad
dominio: 3
Finanzas quiere ver cuánto cuesta cada pipeline (Glue, EMR, S3) por separado. ¿Qué haces?
- [ ] Una cuenta de AWS distinta por cada job.
- [ ] Revisar la factura total y repartirla en partes iguales.
- [x] Etiquetas `pipeline=...` activadas para asignación de costos.
- [ ] Desactivar los jobs de a uno y ver cuánto baja la factura.
porque: Las etiquetas de asignación de costos permiten agrupar el gasto en Cost Explorer y en los informes de costos.

## Filtros de Lake Formation
leccion: cert-aws-dea-operacion-seguridad
dominio: 4
Los analistas de Chile solo deben ver filas con `pais = 'CL'` y nunca la columna `dni`, en la misma tabla del catálogo. ¿Qué usas?
- [ ] Una copia de la tabla por país en otro bucket.
- [ ] Una política de bucket que filtra por prefijo.
- [ ] Una vista de Athena que cada analista se compromete a usar.
- [x] Un data filter de Lake Formation (filas y columnas).
porque: Los data filters de Lake Formation combinan seguridad a nivel de fila y de columna sobre tablas del catálogo.

## Object Lock
leccion: cert-aws-dea-operacion-seguridad
dominio: 4
Por regulación, los registros contables en S3 no pueden borrarse ni modificarse durante 7 años, ni siquiera por administradores. ¿Qué usas?
- [ ] Versionado del bucket y una política que niega `DeleteObject`.
- [x] S3 Object Lock en modo compliance con retención de 7 años.
- [ ] Una regla de ciclo de vida que mueve los objetos a Glacier.
- [ ] Cifrado SSE-KMS con una clave que nadie puede usar.
porque: Object Lock en modo compliance impide borrar o sobrescribir versiones hasta que termine la retención, para cualquier usuario.

## Bloqueo de acceso público
leccion: cert-aws-dea-operacion-seguridad
dominio: 4
Un desarrollador hizo público un bucket con datos de clientes por error. ¿Qué control evita que vuelva a pasar en toda la cuenta?
- [x] S3 Block Public Access a nivel de cuenta.
- [ ] Activar el cifrado por defecto con SSE-S3.
- [ ] Activar el versionado en todos los buckets.
- [ ] Cambiar la clase de almacenamiento a Standard-IA.
porque: Block Public Access anula ACLs y políticas que darían acceso público, aunque alguien las configure.

## Acceso entre cuentas
leccion: cert-aws-dea-operacion-seguridad
dominio: 4
Un job de Glue en la cuenta A debe leer un bucket de la cuenta B. ¿Cuál es la práctica recomendada?
- [ ] Crear un usuario IAM en B y pegar sus claves en el job.
- [ ] Hacer público el bucket de B solo durante la corrida.
- [x] Un rol en B que confíe en el rol del job de A, más la política del bucket.
- [ ] Copiar los datos de B a A por correo electrónico.
porque: Con un rol que se asume entre cuentas no hay claves de larga duración; la política del bucket y la del rol limitan el acceso.

## Enmascaramiento en Redshift
leccion: cert-aws-dea-operacion-seguridad
dominio: 4
En Redshift, soporte debe ver solo los últimos 4 dígitos de la tarjeta y riesgo el número completo, en la misma tabla. ¿Qué usas?
- [ ] Dos tablas sincronizadas con un job cada hora.
- [ ] Cifrado de la columna con una clave de KMS solo para riesgo.
- [x] Dynamic data masking con políticas asociadas a cada rol.
- [ ] Una vista para soporte y confiar en que no lean la tabla.
porque: Las políticas de enmascaramiento dinámico de Redshift se asocian a roles o usuarios y transforman el valor al consultar.

## Rotación de claves KMS
leccion: cert-aws-dea-operacion-seguridad
dominio: 4
Una política interna exige rotar cada año la clave KMS administrada por el cliente que cifra el data lake, sin volver a cifrar los objetos. ¿Qué haces?
- [ ] Crear una clave nueva y copiar todos los objetos para recifrarlos.
- [x] Activar la rotación automática de la clave en KMS.
- [ ] Borrar la clave vieja y esperar a que S3 use la nueva.
- [ ] Pasar a SSE-C con claves que entrega el equipo.
porque: Con rotación automática, KMS genera material nuevo y conserva el anterior para descifrar los objetos existentes.

## AWS Config
leccion: cert-aws-dea-operacion-seguridad
dominio: 4
Seguridad quiere detectar cualquier bucket sin cifrado por defecto y registrar cuándo cambió su configuración. ¿Qué servicio usa?
- [ ] Amazon Inspector.
- [ ] AWS Trusted Advisor con revisión manual.
- [ ] Amazon QuickSight sobre el inventario.
- [x] AWS Config con reglas administradas.
porque: AWS Config registra el historial de configuración de los recursos y evalúa reglas (por ejemplo, cifrado de S3) de forma continua.

## @caso salud: Red Salud Andina
Red Salud Andina tiene 40 centros médicos. Las historias clínicas viven en una base PostgreSQL en Amazon RDS y los turnos llegan como eventos desde una app móvil. Los datos se usan para tableros en QuickSight y para modelos de demanda.

Requisitos:
- Los turnos deben verse en los tableros en menos de 5 minutos.
- Los cambios en la base clínica deben llegar al data lake sin cargar la base de producción con consultas pesadas.
- Los datos de pacientes (nombre, documento) solo los ven los médicos; los analistas ven datos anonimizados.
- Todo dato debe estar cifrado con claves propias de la empresa.

## Turnos casi en tiempo real
leccion: cert-aws-dea-ingesta-transformacion
dominio: 1
caso: salud
¿Qué arquitectura cumple el primer requisito con menos administración?
- [ ] Un export diario de la app a S3 y un crawler cada noche.
- [x] Firehose hacia S3 con buffer corto, consultado desde QuickSight vía Athena.
- [ ] Un clúster EMR encendido que lee la API de la app cada hora.
- [ ] Copiar los eventos a mano a una planilla compartida.
porque: Firehose entrega en minutos sin servidores que administrar; Athena consulta los datos en S3 y QuickSight los muestra.

## Cambios de la base clínica
leccion: cert-aws-dea-ingesta-transformacion
dominio: 1
caso: salud
¿Qué cumple el segundo requisito?
- [ ] Un `SELECT *` completo de cada tabla cada hora desde Glue.
- [ ] Un snapshot manual de RDS por semana.
- [x] AWS DMS con carga completa inicial y luego CDC hacia S3.
- [ ] Una Lambda que consulta la base cada minuto.
porque: DMS con CDC lee el log de cambios de PostgreSQL y entrega solo los cambios, sin consultas pesadas repetidas.

## Pacientes protegidos
leccion: cert-aws-dea-operacion-seguridad
dominio: 4
caso: salud
¿Cómo cumples el tercer requisito sobre las tablas del data lake?
- [ ] Una copia de las tablas para cada perfil, actualizada a mano.
- [ ] Una política de bucket que niegue el acceso a los analistas.
- [ ] Pedir a los analistas que no seleccionen esas columnas.
- [x] Permisos de Lake Formation por columna según el perfil.
porque: Lake Formation aplica permisos por columna a quien consulta desde Athena, Redshift Spectrum o EMR.

## Claves propias
leccion: cert-aws-dea-operacion-seguridad
dominio: 4
caso: salud
¿Qué cumple el cuarto requisito para S3, Firehose y RDS?
- [x] SSE-KMS con una clave administrada por el cliente en cada servicio.
- [ ] SSE-S3, porque usa claves que maneja la empresa.
- [ ] Sin cifrado, pero con buckets privados.
- [ ] Comprimir los datos con contraseña antes de guardarlos.
porque: Con una clave de KMS administrada por el cliente, la empresa controla la política de la clave, su rotación y su auditoría en CloudTrail.
