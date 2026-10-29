# examen: cert-gcp
# id: gcp-pde
# titulo: Google Cloud Professional Data Engineer

## Servicio de streaming
leccion: cert-gcp-pde-diseno-ingesta
dominio: 1
Eventos de clics deben agregarse por ventanas de 5 minutos, corrigiendo resultados cuando llegan datos tardíos, sin administrar servidores. ¿Qué usas?
- [ ] Dataproc con Spark Streaming en un clúster permanente.
- [x] Pub/Sub y Dataflow con ventanas fijas y allowed lateness.
- [ ] Consultas programadas de BigQuery cada cinco minutos.
- [ ] Cloud Functions que suman los eventos en Firestore.
porque: Dataflow maneja ventanas, marcas de agua y datos tardíos de forma serverless.

## Marca de agua
leccion: cert-gcp-pde-diseno-ingesta
dominio: 2
En Apache Beam, ¿qué representa la marca de agua (watermark)?
- [ ] El número máximo de mensajes que puede procesar un worker.
- [x] La estimación de hasta qué tiempo de evento ya llegaron los datos.
- [ ] El momento en que el job se lanzó en Dataflow.
- [ ] El tamaño máximo de una ventana de sesión.
porque: La marca de agua indica cuándo se considera completa una ventana; los datos posteriores son tardíos.

## Sesiones
leccion: cert-gcp-pde-diseno-ingesta
dominio: 2
Hay que agrupar la actividad de cada usuario en visitas que terminan tras 30 minutos sin eventos. ¿Qué ventana usas?
- [ ] Fijas de 30 minutos.
- [x] De sesión con un intervalo de 30 minutos.
- [ ] Deslizantes de 30 minutos cada minuto.
- [ ] Global con un disparador por cantidad.
porque: Las ventanas de sesión se cierran por inactividad para cada clave.

## Actualizar streaming
leccion: cert-gcp-pde-diseno-ingesta
dominio: 2
Un pipeline de Dataflow en streaming debe actualizarse sin perder datos en vuelo, y el cambio es compatible. ¿Qué haces?
- [ ] Cancelar el job y lanzar el nuevo de inmediato.
- [x] Lanzar el nuevo código con la opción de actualización sobre el job existente.
- [ ] Crear una suscripción nueva de Pub/Sub para el job nuevo.
- [ ] Detener los workers y reiniciarlos con la imagen nueva.
porque: Update reemplaza el job conservando el estado; drain se usa si no es compatible.

## CDC
leccion: cert-gcp-pde-diseno-ingesta
dominio: 2
Una base PostgreSQL on-premises debe replicarse a BigQuery con cambios casi en tiempo real y mínimo mantenimiento. ¿Qué usas?
- [ ] Exportaciones nocturnas a Cloud Storage con cargas por lotes.
- [x] Datastream hacia BigQuery.
- [ ] Database Migration Service hacia BigQuery.
- [ ] Una consulta federada que lee la base en cada consulta.
porque: Datastream captura los cambios (CDC) y los aplica en BigQuery de forma serverless.

## Hadoop
leccion: cert-gcp-pde-diseno-ingesta
dominio: 1
Una empresa quiere mover 300 trabajos de Spark y Hive a Google Cloud con cambios mínimos y menor costo. ¿Qué combinación recomiendas?
- [ ] Reescribir todo en Dataflow con Apache Beam antes de migrar.
- [x] Dataproc con clústeres efímeros, datos en Cloud Storage y workers Spot.
- [ ] Un clúster de Dataproc permanente con HDFS en discos persistentes.
- [ ] Compute Engine con Hadoop instalado a mano en cada VM.
porque: Dataproc ejecuta los trabajos existentes; clústeres efímeros, Cloud Storage y Spot reducen el costo.

## ETL visual
leccion: cert-gcp-pde-diseno-ingesta
dominio: 2
Un equipo sin programadores necesita construir pipelines ETL con conectores a muchas fuentes usando una interfaz visual. ¿Qué usas?
- [ ] Dataflow con plantillas Flex.
- [x] Cloud Data Fusion.
- [ ] Cloud Composer.
- [ ] Dataproc Serverless.
porque: Data Fusion ofrece ETL visual sin código basado en CDAP.

## Orquestación
leccion: cert-gcp-pde-diseno-ingesta
dominio: 2
Un proceso nocturno depende de cargas en Cloud Storage, jobs de Dataflow, Dataproc y transformaciones en BigQuery, con reintentos y alertas. ¿Qué orquestador usas?
- [ ] Cloud Scheduler con un disparador por servicio.
- [x] Cloud Composer.
- [ ] Consultas programadas de BigQuery.
- [ ] Pub/Sub con suscripciones push.
porque: Composer (Airflow) maneja dependencias complejas entre servicios con reintentos y monitoreo.

## Transferencia física
leccion: cert-gcp-pde-diseno-ingesta
dominio: 1
Hay que mover 600 TB de archivos históricos con un enlace lento. ¿Qué usas?
- [ ] Storage Transfer Service por internet.
- [x] Transfer Appliance.
- [ ] `gcloud storage cp` en paralelo desde varios servidores.
- [ ] BigQuery Data Transfer Service.
porque: Transfer Appliance envía grandes volúmenes en un dispositivo físico cuando la red no alcanza.

## Bigtable
leccion: cert-gcp-pde-almacenamiento-analisis
dominio: 3
Una aplicación de IoT escribe 2 millones de lecturas por segundo y consulta las de un sensor por rango de tiempo en milisegundos. ¿Qué almacén usas?
- [ ] BigQuery con particiones por hora.
- [x] Bigtable.
- [ ] Cloud SQL para PostgreSQL con réplicas.
- [ ] Firestore en modo nativo.
porque: Bigtable sostiene millones de operaciones por segundo con latencia de milisegundos y rangos por clave.

## Hotspot
leccion: cert-gcp-pde-almacenamiento-analisis
dominio: 3
En Bigtable, ¿qué clave de fila evita concentrar las escrituras en un nodo?
- [ ] `timestamp#sensor_id`.
- [x] `sensor_id#timestamp_invertido`.
- [ ] Un id secuencial creciente.
- [ ] La fecha del día en formato AAAAMMDD.
porque: Empezar por un campo de alta cardinalidad reparte las escrituras; los valores crecientes generan hotspots.

## Spanner
leccion: cert-gcp-pde-almacenamiento-analisis
dominio: 3
Un sistema de inventario global necesita transacciones con consistencia fuerte en varios continentes y escala horizontal. ¿Qué usas?
- [ ] Cloud SQL con réplicas de lectura entre regiones.
- [x] Spanner multirregional.
- [ ] Bigtable con replicación entre clústeres.
- [ ] BigQuery con datasets replicados.
porque: Spanner ofrece SQL relacional, transacciones globales con consistencia fuerte y escala horizontal.

## Particiones
leccion: cert-gcp-pde-almacenamiento-analisis
dominio: 3
Las consultas sobre una tabla de 40 TB siempre filtran por fecha y cliente pero escanean todo. ¿Qué haces?
- [ ] Crear un índice de búsqueda sobre todas las columnas.
- [x] Particionar por fecha y agrupar por cliente.
- [ ] Mover la tabla a Bigtable.
- [ ] Aumentar las reservas de slots.
porque: La partición reduce los días leídos y el clustering reduce los bloques dentro de cada partición.

## Anidados
leccion: cert-gcp-pde-almacenamiento-analisis
dominio: 3
Los pedidos y sus líneas se unen en todas las consultas y el join es costoso. ¿Qué diseño de BigQuery recomienda Google?
- [ ] Mantener dos tablas normalizadas y agregar más slots.
- [x] Una tabla de pedidos con las líneas como ARRAY de STRUCT.
- [ ] Una tabla por cliente con sus pedidos.
- [ ] Exportar las líneas a Cloud Storage como tabla externa.
porque: Los campos anidados y repetidos evitan el join y mantienen juntos los datos que se leen juntos.

## BigLake
leccion: cert-gcp-pde-almacenamiento-analisis
dominio: 3
Archivos Iceberg en Cloud Storage deben consultarse desde BigQuery y Spark con seguridad por columna. ¿Qué usas?
- [ ] Tablas externas simples sin metadatos.
- [x] Tablas BigLake.
- [ ] Una copia de los datos en tablas nativas.
- [ ] Vistas materializadas sobre los archivos.
porque: BigLake aplica seguridad fina sobre datos en formatos abiertos y los expone a varios motores.

## Compartir
leccion: cert-gcp-pde-almacenamiento-analisis
dominio: 4
Hay que compartir un dataset con 30 empresas socias, siempre actualizado, sin copias y sin pagar sus consultas. ¿Qué usas?
- [ ] Exportaciones diarias a un bucket por socio.
- [x] Analytics Hub.
- [ ] Roles de editor en el proyecto para cada socio.
- [ ] Transferencias programadas a cada proyecto socio.
porque: Analytics Hub publica listings; cada suscriptor obtiene un dataset vinculado y paga sus consultas.

## Columna sensible
leccion: cert-gcp-pde-almacenamiento-analisis
dominio: 4
La columna `dni` solo debe verse completa para el grupo de cumplimiento; el resto debe verla enmascarada. ¿Qué usas?
- [ ] Una política de acceso por fila.
- [x] Una etiqueta de política con enmascaramiento dinámico.
- [ ] Una vista que excluye la columna para todos.
- [ ] CMEK sobre la tabla.
porque: Las policy tags controlan el acceso por columna y el enmascaramiento dinámico muestra una versión oculta al resto.

## BigQuery ML
leccion: cert-gcp-pde-almacenamiento-analisis
dominio: 4
Analistas que solo saben SQL deben pronosticar ventas diarias por producto con datos en BigQuery. ¿Qué usan?
- [ ] Un entrenamiento personalizado en TPU.
- [x] BigQuery ML con un modelo ARIMA_PLUS.
- [ ] AutoML de imágenes.
- [ ] Dataproc con Spark MLlib.
porque: BigQuery ML entrena y predice con SQL, incluidos modelos de series de tiempo.

## Costo de consultas
leccion: cert-gcp-pde-operacion-seguridad-adp
Un equipo hace consultas accidentales de decenas de terabytes. ¿Qué control aplicas sin bloquear el trabajo normal?
- [ ] Quitar el acceso a BigQuery a todo el equipo.
- [x] Maximum bytes billed en las consultas y cuotas personalizadas por usuario.
- [ ] Mover las tablas a almacenamiento long-term.
- [ ] Pasar a la edición Enterprise Plus.
porque: El límite de bytes facturados hace fallar consultas demasiado grandes y las cuotas limitan el total.

## Slots
leccion: cert-gcp-pde-operacion-seguridad-adp
Una empresa tiene cargas de BigQuery estables y predecibles todo el día y gasta mucho en on-demand. ¿Qué evalúa?
- [ ] Particionar menos las tablas.
- [x] Una edición con reservas de slots y autoescalado, con compromiso si es estable.
- [ ] Desactivar la caché de resultados.
- [ ] Cambiar a tablas externas en Cloud Storage.
porque: Con cargas estables, la capacidad en slots suele costar menos que pagar por TB escaneado.

## Exfiltración
leccion: cert-gcp-pde-operacion-seguridad-adp
Aunque alguien tenga credenciales válidas, no debe poder copiar datos de BigQuery a un proyecto ajeno. ¿Qué usas?
- [ ] Rotación diaria de las claves de cuentas de servicio.
- [x] VPC Service Controls.
- [ ] Políticas de acceso por fila.
- [ ] Cloud Audit Logs de Admin Activity.
porque: Un perímetro de VPC Service Controls impide mover datos fuera de él.

## Clave propia
leccion: cert-gcp-pde-operacion-seguridad-adp
Regulación exige que la empresa controle, rote y pueda revocar la clave que cifra sus datasets. ¿Qué configuras?
- [ ] El cifrado por defecto de Google.
- [x] CMEK con Cloud KMS.
- [ ] Sensitive Data Protection.
- [ ] Policy tags en todas las columnas.
porque: Con CMEK la empresa gestiona la clave en Cloud KMS; revocarla deja los datos inaccesibles.

## PII
leccion: cert-gcp-pde-operacion-seguridad-adp
Hay que descubrir qué tablas contienen números de tarjeta y tokenizarlos conservando el formato. ¿Qué usas?
- [ ] Knowledge Catalog con etiquetas cargadas a mano.
- [x] Sensitive Data Protection.
- [ ] Cloud KMS con rotación automática.
- [ ] Analytics Hub con data clean rooms.
porque: Sensitive Data Protection descubre datos sensibles y los desidentifica con cifrado preservando formato.

## Auditoría
leccion: cert-gcp-pde-operacion-seguridad-adp
¿Qué registros muestran quién leyó los datos de una tabla de BigQuery?
- [ ] Admin Activity audit logs.
- [x] Data Access audit logs.
- [ ] System Event audit logs.
- [ ] Policy Denied audit logs.
porque: Los registros de Data Access registran lecturas de datos; Admin Activity registra cambios de configuración.

## Backlog
leccion: cert-gcp-pde-operacion-seguridad-adp
Hay que alertar si un pipeline deja de consumir mensajes de una suscripción de Pub/Sub. ¿Qué métrica monitoreas?
- [ ] El número de temas del proyecto.
- [x] La antigüedad del mensaje más viejo sin reconocer.
- [ ] La cantidad de slots usados en BigQuery.
- [ ] El uso de CPU de Cloud Composer.
porque: `oldest_unacked_message_age` crece cuando nadie consume la suscripción.

## @caso energia: Energía Patagónica
Energía Patagónica opera 40 parques eólicos. Cada turbina envía 200 lecturas por segundo (velocidad, temperatura, vibración). Además tiene un ERP en Oracle on-premises con los mantenimientos y quiere:
- detectar en menos de 30 segundos vibraciones anómalas;
- guardar 5 años de lecturas para análisis y entrenamiento de modelos de fallas;
- que los analistas crucen lecturas con mantenimientos en SQL;
- cumplir una auditoría que exige que los datos no salgan de la región y que la empresa controle las claves.

## Lecturas de alta frecuencia
leccion: cert-gcp-pde-diseno-ingesta
dominio: 1
caso: energia
¿Qué combinación ingiere y procesa las lecturas para detectar anomalías en segundos?
- [ ] Archivos CSV por hora en Cloud Storage cargados en BigQuery con un job programado.
- [x] Pub/Sub y Dataflow en streaming con ventanas por turbina.
- [ ] Datastream desde las turbinas.
- [ ] Transfer Appliance.
porque: Pub/Sub absorbe el volumen de eventos y Dataflow procesa ventanas por clave con baja latencia.

## Acceso de baja latencia por turbina
leccion: cert-gcp-pde-almacenamiento-analisis
dominio: 3
caso: energia
El tablero de operación debe mostrar las últimas lecturas de una turbina en milisegundos. ¿Dónde se guardan?
- [ ] En BigQuery, con una consulta por turbina cada vez que se abre el tablero.
- [x] En Bigtable con clave de fila `turbina_id#timestamp_invertido`.
- [ ] En Cloud SQL con un índice por fecha.
- [ ] En Cloud Storage como JSON.
porque: Bigtable da lecturas de milisegundos por rango de clave con altísimo volumen de escritura.

## Mantenimientos del ERP
leccion: cert-gcp-pde-diseno-ingesta
dominio: 2
caso: energia
¿Cómo llevas los mantenimientos del Oracle on-premises a BigQuery con cambios casi en tiempo real?
- [ ] Una exportación semanal a CSV subida manualmente a Cloud Storage y cargada.
- [x] Datastream con CDC desde Oracle hacia BigQuery (con conectividad privada).
- [ ] Pub/Sub Lite.
- [ ] BigQuery Data Transfer Service desde Oracle.
porque: Datastream replica cambios de Oracle a BigQuery de forma serverless, también por conexión privada.

## Auditoría de claves y región
leccion: cert-gcp-pde-operacion-seguridad-adp
dominio: 5
caso: energia
¿Qué dos configuraciones cumplen la auditoría?
- [x] Datasets y buckets en una ubicación regional y una política de organización que restrinja las ubicaciones.
- [x] CMEK con Cloud KMS en BigQuery, Cloud Storage y Bigtable.
- [ ] Datasets multirregión US para mayor disponibilidad.
- [ ] Acceso público a los buckets con URLs firmadas.
- [ ] Desactivar los registros de auditoría.
porque: La ubicación regional con políticas de organización garantiza la residencia y CMEK da control de las claves.

## Diseño para fallas
leccion: cert-gcp-pde-diseno-ingesta
dominio: 1
¿Qué propiedad debe tener un pipeline para poder reprocesar un día sin duplicar datos?
- [ ] Debe ejecutarse una sola vez por día y nunca reintentarse ante errores.
- [x] Idempotencia: reescribir la partición o hacer MERGE por clave.
- [ ] Usar siempre `WRITE_APPEND` en BigQuery.
- [ ] Guardar los datos en memoria.
porque: Un pipeline idempotente produce el mismo resultado aunque se ejecute varias veces.

## Dataflow o Dataproc
leccion: cert-gcp-pde-diseno-ingesta
dominio: 1
Un equipo nuevo debe construir pipelines de lotes y streaming sin administrar clústeres ni migrar código existente. ¿Qué recomiendas?
- [ ] Dataproc con clústeres permanentes, porque permite usar Spark para lotes y streaming.
- [x] Dataflow con Apache Beam.
- [ ] Compute Engine con scripts.
- [ ] Cloud Functions para todo.
porque: Dataflow es serverless y unifica lotes y streaming; Dataproc conviene para reutilizar Spark/Hadoop.

## Portabilidad
leccion: cert-gcp-pde-diseno-ingesta
dominio: 1
La empresa quiere evitar quedar atada a un motor y que Spark y BigQuery lean las mismas tablas. ¿Qué formato de tabla elige?
- [ ] Tablas nativas de BigQuery exportadas a CSV cada noche para que Spark las lea.
- [x] Apache Iceberg con BigLake.
- [ ] Archivos JSON sin catálogo.
- [ ] Tablas de Bigtable.
porque: Iceberg es un formato abierto y BigLake permite usarlo desde BigQuery, Spark y otros motores.

## Multinube
leccion: cert-gcp-pde-diseno-ingesta
dominio: 1
Una filial guarda datos en Amazon S3 y los analistas quieren consultarlos desde BigQuery sin moverlos. ¿Qué usan?
- [ ] Storage Transfer Service diario de S3 a Cloud Storage y luego cargas a BigQuery.
- [x] BigQuery Omni con tablas BigLake sobre S3.
- [ ] Datastream.
- [ ] Pub/Sub.
porque: BigQuery Omni ejecuta consultas sobre datos en AWS o Azure sin copiarlos.

## Migrar un data warehouse
leccion: cert-gcp-pde-diseno-ingesta
dominio: 1
Hay que migrar 3.000 consultas SQL de Teradata a BigQuery. ¿Qué herramienta acelera la traducción?
- [ ] Reescribir todas las consultas a mano, una por una, por un equipo de consultores.
- [x] BigQuery Migration Service (traductor de SQL por lotes).
- [ ] Datastream.
- [ ] Cloud Data Fusion.
porque: El traductor de SQL de BigQuery convierte dialectos como Teradata a GoogleSQL.

## Validación de migración
leccion: cert-gcp-pde-diseno-ingesta
dominio: 1
Después de migrar tablas a BigQuery, ¿cómo verificas que los datos coinciden con el origen?
- [ ] Revisando a ojo las primeras diez filas de cada tabla migrada en la consola.
- [x] Con una herramienta de validación de datos que compare conteos, sumas y checksums.
- [ ] Borrando el origen y esperando quejas.
- [ ] Con Cloud Monitoring.
porque: La validación automatizada compara agregados y hashes entre origen y destino.

## Diseño serverless
leccion: cert-gcp-pde-diseno-ingesta
dominio: 1
¿Qué dos servicios permiten construir una plataforma de datos sin administrar servidores ni clústeres?
- [x] BigQuery.
- [x] Dataflow.
- [ ] Dataproc en Compute Engine con clústeres permanentes.
- [ ] Compute Engine con Hadoop.
- [ ] GKE con Spark administrado por el equipo.
porque: BigQuery y Dataflow son serverless; los demás requieren administrar infraestructura.

## Disponibilidad regional
leccion: cert-gcp-pde-diseno-ingesta
dominio: 1
Un pipeline crítico debe seguir funcionando si falla una zona. ¿Qué haces con Dataflow?
- [ ] Fijar los workers en una sola zona específica para que el job sea más estable.
- [x] Usar un endpoint regional y dejar que Dataflow elija zonas.
- [ ] Usar Transfer Appliance.
- [ ] Desactivar el autoescalado.
porque: Los jobs regionales pueden ubicarse en otra zona de la región ante fallas zonales.

## Exactly-once
leccion: cert-gcp-pde-diseno-ingesta
dominio: 2
Una suscripción pull de Pub/Sub debe evitar procesar el mismo mensaje dos veces dentro de la ventana de entrega. ¿Qué habilitas?
- [ ] El orden por clave, que garantiza también que cada mensaje se entregue una vez.
- [x] La entrega exactly-once en la suscripción.
- [ ] Un dead-letter topic.
- [ ] Más suscriptores.
porque: La entrega exactly-once evita reentregas de mensajes reconocidos correctamente.

## Mensajes fallidos
leccion: cert-gcp-pde-diseno-ingesta
dominio: 2
Algunos mensajes nunca se procesan bien y se reentregan sin fin. ¿Qué configuras en Pub/Sub?
- [ ] Un tiempo de reconocimiento de 600 segundos para que el suscriptor tenga más tiempo.
- [x] Un dead-letter topic con un máximo de intentos de entrega.
- [ ] Un esquema Avro.
- [ ] La retención de 31 días.
porque: Tras el máximo de intentos, el mensaje va al dead-letter topic para analizarlo aparte.

## Pub/Sub a BigQuery
leccion: cert-gcp-pde-diseno-ingesta
dominio: 2
Los eventos de Pub/Sub deben guardarse tal cual en BigQuery, sin transformación y sin código. ¿Qué usas?
- [ ] Un job de Dataflow con una plantilla personalizada escrita por el equipo.
- [x] Una suscripción de BigQuery (exportación directa).
- [ ] Datastream.
- [ ] Cloud Composer.
porque: Las suscripciones de BigQuery escriben los mensajes directamente en una tabla.

## Side input
leccion: cert-gcp-pde-diseno-ingesta
dominio: 2
Un pipeline de Dataflow debe enriquecer cada evento con un catálogo de 5.000 productos que cambia una vez por día. ¿Qué usas?
- [ ] Una consulta a BigQuery por cada evento que llega al pipeline en streaming.
- [x] Un side input con el catálogo, refrescado periódicamente.
- [ ] Un `GroupByKey` sobre todo el stream.
- [ ] Un dead-letter topic.
porque: Los side inputs distribuyen datos chicos a todos los workers para enriquecer sin llamadas externas.

## Hot keys
leccion: cert-gcp-pde-diseno-ingesta
dominio: 2
En Dataflow, una agregación por cliente es lenta porque un cliente concentra el 40 % de los eventos. ¿Qué ayuda?
- [ ] Reducir el número de workers para que el cliente grande use una sola máquina.
- [x] `Combine.perKey` con fanout (o repartir la clave caliente).
- [ ] Usar ventanas de sesión.
- [ ] Cambiar a Pub/Sub Lite.
porque: Combinar con fanout reparte el trabajo de una clave caliente entre varios workers.

## Dataproc Serverless
leccion: cert-gcp-pde-diseno-ingesta
dominio: 2
Un equipo tiene trabajos de PySpark esporádicos y no quiere administrar clústeres. ¿Qué usa?
- [ ] Un clúster de Dataproc permanente con autoescalado configurado al mínimo.
- [x] Dataproc Serverless (Serverless for Apache Spark).
- [ ] Dataflow con un runner de Spark.
- [ ] Cloud Run.
porque: Dataproc Serverless ejecuta trabajos de Spark sin crear ni administrar clústeres.

## Composer o Workflows
leccion: cert-gcp-pde-diseno-ingesta
dominio: 2
Hay que encadenar tres llamadas a APIs de Google Cloud con una condición, unas pocas veces por día, al menor costo. ¿Qué usas?
- [ ] Cloud Composer, con un entorno dedicado para este único flujo de trabajo.
- [x] Workflows.
- [ ] Dataproc.
- [ ] Bigtable.
porque: Workflows es serverless y barato para orquestaciones livianas; Composer conviene para muchos DAGs complejos.

## Dataform incremental
leccion: cert-gcp-pde-diseno-ingesta
dominio: 2
Una tabla de Dataform recalcula 3 años de datos en cada ejecución. ¿Qué cambias?
- [ ] Aumentar la reserva de slots para que el recálculo completo termine antes.
- [x] Definirla como incremental, procesando solo las filas nuevas.
- [ ] Convertirla en vista.
- [ ] Moverla a Bigtable.
porque: Las tablas incrementales de Dataform agregan o fusionan solo los datos nuevos.

## Aserciones
leccion: cert-gcp-pde-diseno-ingesta
dominio: 2
¿Cómo verificas en Dataform que `pedido_id` sea único y no nulo en cada ejecución?
- [ ] Revisando la tabla a mano después de cada ejecución con una consulta en la consola.
- [x] Con aserciones (`uniqueKey`, `nonNull`) en la definición de la tabla.
- [ ] Con Cloud Monitoring.
- [ ] Con un side input.
porque: Las aserciones de Dataform validan la calidad y fallan la ejecución si no se cumplen.

## Clases de almacenamiento
leccion: cert-gcp-pde-almacenamiento-analisis
dominio: 3
Los archivos crudos se leen la primera semana y luego casi nunca, pero deben guardarse 2 años. ¿Qué configuras?
- [ ] La clase Standard para todo, con el versionado activado para no perder archivos.
- [x] Reglas de ciclo de vida que pasen a Coldline o Archive y borren a los 2 años (o Autoclass).
- [ ] Bigtable.
- [ ] Una tabla de BigQuery.
porque: El ciclo de vida o Autoclass mueve objetos a clases más baratas según su uso.

## Time travel
leccion: cert-gcp-pde-almacenamiento-analisis
dominio: 3
Un `UPDATE` erróneo modificó una tabla hace 3 horas. ¿Cómo recuperas el estado anterior?
- [ ] Restaurando una copia de seguridad del día anterior desde Cloud Storage.
- [x] Consultando la tabla con `FOR SYSTEM_TIME AS OF` y restaurándola.
- [ ] No es posible.
- [ ] Con Pub/Sub seek.
porque: El time travel de BigQuery permite leer el estado de una tabla de hasta 7 días atrás.

## Vistas materializadas
leccion: cert-gcp-pde-almacenamiento-analisis
dominio: 3
Un tablero ejecuta la misma agregación costosa cada pocos minutos sobre una tabla que crece continuamente. ¿Qué la acelera?
- [ ] Una vista común, que guarda el resultado y lo reutiliza en cada consulta del tablero.
- [x] Una vista materializada con actualización incremental.
- [ ] Exportar a CSV.
- [ ] Bigtable.
porque: Las vistas materializadas guardan resultados precalculados y se actualizan de forma incremental.

## AlloyDB
leccion: cert-gcp-pde-almacenamiento-analisis
dominio: 3
Una aplicación PostgreSQL necesita alto rendimiento transaccional y consultas analíticas rápidas sobre los mismos datos. ¿Qué base eliges?
- [ ] Cloud SQL para PostgreSQL con réplicas de lectura en otra región para analítica.
- [x] AlloyDB para PostgreSQL.
- [ ] Bigtable.
- [ ] Firestore.
porque: AlloyDB es compatible con PostgreSQL y agrega un motor columnar para analítica.

## Snapshots
leccion: cert-gcp-pde-almacenamiento-analisis
dominio: 3
Antes de una migración riesgosa, quieres conservar el estado de una tabla de BigQuery durante 30 días al menor costo. ¿Qué usas?
- [ ] Una copia completa de la tabla en otro dataset, que se cobra completa desde el inicio.
- [x] Un snapshot de tabla.
- [ ] Time travel de 30 días.
- [ ] Una vista.
porque: Los snapshots guardan el estado de la tabla y solo cobran por los datos que cambian después.

## Catálogo
leccion: cert-gcp-pde-almacenamiento-analisis
dominio: 3
¿Qué servicio permite buscar datasets por descripción, ver su linaje y su glosario de negocio en Google Cloud?
- [ ] Cloud Monitoring, con paneles por dataset que muestran el uso de cada tabla.
- [x] Knowledge Catalog (Dataplex).
- [ ] Pub/Sub.
- [ ] Cloud Scheduler.
porque: Knowledge Catalog unifica búsqueda, metadatos, glosario y linaje.

## Enmascaramiento dinámico
leccion: cert-gcp-pde-almacenamiento-analisis
dominio: 4
Los analistas deben ver el correo de los clientes como un hash, y soporte verlo completo. ¿Qué usas en BigQuery?
- [ ] Dos tablas: una con correos y otra sin correos, sincronizadas por un job.
- [x] Etiquetas de política con reglas de enmascaramiento de datos por grupo.
- [ ] Una política de acceso por fila.
- [ ] Cifrado con CMEK.
porque: El enmascaramiento dinámico de BigQuery aplica distintas vistas de una columna según el rol.

## Data clean room
leccion: cert-gcp-pde-almacenamiento-analisis
dominio: 4
Un socio comercial y la empresa quieren medir clientes en común sin que ninguno vea las filas del otro. ¿Qué usan?
- [ ] Compartir ambos datasets completos con acceso de lectura entre las dos empresas.
- [x] Una data clean room de BigQuery (Analytics Hub).
- [ ] Un bucket público.
- [ ] Pub/Sub.
porque: Las clean rooms permiten análisis conjuntos con reglas que impiden ver datos individuales.

## Gemini en SQL
leccion: cert-gcp-pde-almacenamiento-analisis
dominio: 4
Hay que clasificar el sentimiento de 1 millón de reseñas guardadas en una tabla de BigQuery, desde SQL. ¿Qué usas?
- [ ] Exportar las reseñas a CSV y procesarlas con un script local que llama a una API.
- [x] Funciones de IA de BigQuery (`AI.GENERATE` o un modelo remoto de Gemini).
- [ ] Dataform.
- [ ] Pub/Sub.
porque: Las funciones de IA de BigQuery llaman a Gemini sobre los datos de una tabla con SQL.

## Búsqueda vectorial
leccion: cert-gcp-pde-almacenamiento-analisis
dominio: 4
Hay que encontrar productos similares a partir de sus descripciones, con datos en BigQuery. ¿Qué combinas?
- [ ] Un `LIKE '%texto%'` sobre la columna de descripción de cada producto.
- [x] `ML.GENERATE_EMBEDDING` y `VECTOR_SEARCH` (con un índice vectorial).
- [ ] Una vista materializada.
- [ ] Particiones por producto.
porque: BigQuery genera embeddings y busca vecinos cercanos con índices vectoriales.

## Looker semántico
leccion: cert-gcp-pde-almacenamiento-analisis
dominio: 4
Cada área calcula "ventas netas" de forma distinta en sus tableros. ¿Qué lo resuelve?
- [ ] Pedir a cada área que documente su fórmula en un archivo compartido del equipo.
- [x] Un modelo semántico en LookML con una única definición de la métrica.
- [ ] Más tablas en BigQuery.
- [ ] Bigtable.
porque: La capa semántica de Looker define métricas una sola vez para todos los tableros.

## BI Engine
leccion: cert-gcp-pde-almacenamiento-analisis
dominio: 4
Los tableros de Looker Studio sobre BigQuery tardan varios segundos. ¿Qué los acelera sin cambiar las consultas?
- [ ] Exportar los datos a Google Sheets y conectar los tableros a la hoja de cálculo.
- [x] Una reserva de BI Engine.
- [ ] Datastream.
- [ ] Bigtable.
porque: BI Engine guarda datos en memoria y acelera las consultas de herramientas de BI.

## Reservas por proyecto
leccion: cert-gcp-pde-operacion-seguridad-adp
dominio: 5
Los tableros de gerencia se vuelven lentos cuando data science lanza consultas grandes. ¿Qué configuras?
- [ ] Prohibir a data science usar BigQuery durante el horario de oficina.
- [x] Reservas de slots separadas asignadas a cada proyecto o carpeta.
- [ ] Más particiones.
- [ ] Bigtable para los tableros.
porque: Las reservas aíslan la capacidad de cada carga de trabajo.

## Costo de Dataflow por lotes
leccion: cert-gcp-pde-operacion-seguridad-adp
dominio: 5
Un pipeline de lotes nocturno de Dataflow puede empezar más tarde sin problema. ¿Qué reduce su costo?
- [ ] Aumentar el número máximo de workers para que termine más rápido.
- [x] FlexRS (programación flexible de recursos).
- [ ] Streaming Engine.
- [ ] Desactivar el autoescalado.
porque: FlexRS usa una combinación de VMs preemptibles y estándar con inicio diferido a menor costo.

## Facturación a BigQuery
leccion: cert-gcp-pde-operacion-seguridad-adp
dominio: 5
Finanzas quiere analizar el gasto de cada equipo en Google Cloud con SQL. ¿Qué configuras?
- [ ] Descargar el PDF de la factura cada mes y cargarlo a una planilla.
- [x] La exportación de facturación de Cloud Billing a BigQuery, con etiquetas por equipo.
- [ ] Cloud Monitoring.
- [ ] Pub/Sub.
porque: La exportación de facturación deja el detalle de costos en BigQuery para analizarlo.

## Workload Identity Federation
leccion: cert-gcp-pde-operacion-seguridad-adp
dominio: 5
GitHub Actions debe desplegar tablas con Terraform en Google Cloud sin claves de cuenta de servicio. ¿Qué usas?
- [ ] Una clave JSON de cuenta de servicio guardada como secreto del repositorio.
- [x] Workload Identity Federation con el proveedor OIDC de GitHub.
- [ ] La cuenta personal del líder.
- [ ] Un bucket público.
porque: La federación entrega credenciales de corta duración sin claves permanentes.
