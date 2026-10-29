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
