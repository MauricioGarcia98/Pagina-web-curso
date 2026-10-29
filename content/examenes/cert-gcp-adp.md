# examen: cert-gcp
# id: gcp-adp
# titulo: Google Cloud Associate Data Practitioner

## Carga desde S3
leccion: cert-gcp-pde-diseno-ingesta
Cada día hay que copiar archivos nuevos de un bucket de Amazon S3 a Cloud Storage. ¿Qué servicio usas?
- [ ] Datastream con S3 como origen.
- [x] Storage Transfer Service.
- [ ] Transfer Appliance.
- [ ] Pub/Sub con una suscripción push.
porque: Storage Transfer Service copia programadamente desde S3, Azure u otras fuentes hacia Cloud Storage.

## SaaS
leccion: cert-gcp-pde-diseno-ingesta
Marketing necesita los datos de Google Ads en BigQuery cada día sin escribir código. ¿Qué usa?
- [ ] Dataflow con una plantilla personalizada.
- [x] BigQuery Data Transfer Service.
- [ ] Cloud Data Fusion con un clúster dedicado.
- [ ] Una función que llama a la API de Ads.
porque: BigQuery Data Transfer Service carga programadamente datos de Google Ads y otras fuentes.

## Formato
leccion: cert-gcp-pde-diseno-ingesta
¿Qué formato de archivo conviene para cargar grandes volúmenes en BigQuery conservando el esquema y los tipos?
- [ ] CSV sin encabezado.
- [x] Parquet o Avro.
- [ ] Texto plano delimitado por tabulaciones.
- [ ] JSON con un objeto por archivo.
porque: Parquet y Avro son autodescriptivos, comprimidos y conservan los tipos.

## ELT
leccion: cert-gcp-pde-diseno-ingesta
Los datos crudos ya están en BigQuery y el equipo quiere transformarlos con SQL versionado en Git, con pruebas y dependencias. ¿Qué usa?
- [ ] Cloud Data Fusion.
- [x] Dataform.
- [ ] Dataproc.
- [ ] Storage Transfer Service.
porque: Dataform gestiona transformaciones SQL en BigQuery con dependencias, aserciones y Git.

## Consulta programada
leccion: cert-gcp-pde-diseno-ingesta
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
