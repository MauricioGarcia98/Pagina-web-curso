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
