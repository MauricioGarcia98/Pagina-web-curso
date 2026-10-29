# examen: aws

## Servicio para cada cosa
leccion: aws-aws-para-datos
¿Qué combinación arma un data lake consultable con SQL sin servidores en AWS?
- [ ] EC2 (servidores) + EBS (discos) + un PostgreSQL instalado a mano
- [x] S3 + Glue Data Catalog + Athena
- [ ] Redshift + Lambda + CloudWatch
- [ ] Kinesis + DynamoDB + Step Functions
porque: S3 guarda los archivos, el Glue Data Catalog describe las tablas (esquema, ubicación, particiones) y Athena las consulta con SQL cobrando por datos escaneados.

## Políticas IAM
leccion: aws-cli-iam
Un job necesita leer `s3://lago/bronze/` y escribir en `s3://lago/silver/`. ¿Qué política cumple el principio de permisos mínimos?
- [ ] `s3:*` sobre `*`, para no tener que actualizar la política cuando cambien las carpetas.
- [ ] `s3:*` sobre `arn:aws:s3:::lago/*`, que limita el acceso al bucket del lago.
- [x] `s3:GetObject` en `lago/bronze/*` y `s3:PutObject` en `lago/silver/*`.
- [ ] La política administrada `AmazonS3FullAccess`, mantenida por AWS.
porque: Cada acción y cada recurso se limita a lo necesario. Si las credenciales del job se filtran, el daño queda acotado a esas carpetas y acciones.

## Credenciales
leccion: aws-cli-iam
¿Qué forma de dar acceso a AWS a un pipeline de GitHub Actions es la recomendada?
- [ ] Una access key de un usuario IAM, guardada en un archivo del repositorio.
- [ ] Una access key de la cuenta root, guardada como secreto de GitHub.
- [x] OIDC: el pipeline asume un rol y recibe credenciales temporales.
- [ ] El usuario y la contraseña de la consola, guardados como secretos de GitHub.
porque: Con OIDC no hay secretos de larga duración que se puedan filtrar, y la confianza se limita al repositorio y la rama exactos.

## Clases de S3
leccion: aws-s3-data-lake
Los archivos crudos de bronze casi no se leen después de 90 días, pero hay que guardarlos 7 años. ¿Qué haces?
- [ ] Borrarlos a los 90 días y volver a pedirlos a la fuente si hacen falta.
- [x] Una regla de ciclo de vida hacia clases más baratas, con expiración a los 7 años.
- [ ] Copiarlos a un disco EBS, que es más barato que S3 para datos fríos.
- [ ] Dejarlos en S3 Standard, porque cambiar de clase obliga a reescribirlos.
porque: Las reglas de ciclo de vida mueven y expiran objetos automáticamente según su edad: se paga mucho menos por datos fríos sin trabajo manual.

## Crawlers
leccion: aws-glue
¿Qué hace un crawler de Glue?
- [ ] Transforma los datos de bronze a silver usando Spark sin servidores.
- [x] Recorre S3, infiere el esquema y crea o actualiza tablas en el catálogo.
- [ ] Busca y borra los archivos duplicados de un bucket.
- [ ] Ejecuta consultas SQL programadas sobre las tablas del catálogo.
porque: El crawler descubre metadatos. Las transformaciones las hacen los Glue jobs (Spark o Python).

## Costo en Athena
leccion: aws-athena
Una consulta de Athena sobre CSV sin particionar escanea 800 GB. ¿Qué cambio reduce más el costo?
- [ ] Agregar `LIMIT 100`, que hace que Athena lea solo las primeras filas.
- [x] Convertir a Parquet particionado por fecha y filtrar por la partición.
- [ ] Escribir las palabras clave en mayúsculas para que el motor optimice el plan.
- [ ] Ejecutarla de noche, cuando el precio por TB escaneado es menor.
porque: Athena cobra por bytes escaneados. Parquet lee solo las columnas usadas y comprime; las particiones evitan leer fechas que no se piden. `LIMIT` no reduce lo escaneado en muchos casos.

## Redshift vs. Athena
leccion: aws-redshift-emr
¿Cuándo conviene Redshift sobre Athena?
- [ ] Para consultas esporádicas sobre archivos crudos que cambian de formato.
- [x] Para BI con muchas consultas concurrentes y frecuentes sobre datos modelados.
- [ ] Para guardar imágenes y documentos que luego se analizan con SQL.
- [ ] Para procesar eventos de a uno, apenas llegan, con baja latencia.
porque: Athena es ideal para consultas ad hoc sin infraestructura. Un warehouse como Redshift rinde mejor y sale más barato con cargas constantes y muchos usuarios.

## Firehose
leccion: aws-streaming-serverless
¿Qué hace Kinesis Data Firehose en un pipeline de eventos?
- [ ] Guarda cada evento como una fila en una base relacional gestionada.
- [x] Agrupa los eventos en mini-lotes y los entrega en S3 u otros destinos.
- [ ] Ejecuta jobs de Spark sobre los eventos que recibe.
- [ ] Reemplaza al catálogo de Glue para las tablas de streaming.
porque: Firehose es entrega gestionada: evita escribir consumidores propios para llevar el stream al lago.

## Lambda
leccion: aws-streaming-serverless
¿Para qué tarea **no** es adecuada una Lambda?
- [ ] Validar el formato de un archivo cuando llega a S3.
- [ ] Mover un archivo a otra carpeta según su nombre.
- [x] Procesar un join de 300 GB que tarda 2 horas.
- [ ] Enviar una notificación cuando termina un job de Glue.
porque: Lambda tiene un límite de 15 minutos y memoria acotada. Las tareas largas y pesadas van en Glue, EMR o contenedores.

## Lake Formation
leccion: aws-orquestacion-gobierno
Marketing debe poder consultar `clientes` pero sin ver `email` ni `telefono`. ¿Qué servicio lo resuelve sin copiar la tabla?
- [ ] CloudWatch, con una alarma que avise cuando alguien lea esas columnas.
- [x] Lake Formation, con permisos a nivel de columna.
- [ ] Step Functions, con un paso que elimine las columnas antes de cada consulta.
- [ ] Una regla de ciclo de vida de S3 que oculte esas columnas.
porque: Lake Formation permite permisos por base, tabla, columna y fila, aplicados por Athena, Redshift Spectrum, EMR y Glue.
