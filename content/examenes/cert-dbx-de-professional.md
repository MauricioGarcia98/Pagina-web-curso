# examen: cert-databricks
# id: dbx-de-professional
# titulo: Databricks Data Engineer Professional

## Estado sin watermark
leccion: cert-databricks-nivel-professional
dominio: 1
Un stream cuenta eventos por usuario en ventanas de 1 hora. Después de una semana, el job falla por falta de memoria aunque el volumen diario es estable. ¿Cuál es la causa más probable?
- [ ] El checkpoint está en un volumen lento y se acumulan escrituras pendientes en memoria.
- [x] Falta una watermark, así que el estado de todas las ventanas pasadas nunca se libera.
- [ ] El trigger es demasiado frecuente y cada micro-lote guarda una copia completa del estado.
- [ ] El modo de salida `append` guarda todas las filas emitidas en el driver hasta el final.
porque: Sin watermark, Spark conserva el estado de cada ventana para siempre por si llega un evento atrasado; el estado crece sin límite.

## MERGE desde stream
leccion: cert-databricks-nivel-professional
dominio: 1
Los cambios de clientes llegan por streaming y hay que aplicarlos con upsert a `silver.clientes`. Cada micro-lote puede traer varias versiones del mismo cliente. ¿Qué implementación es correcta?
- [ ] `writeStream` con `outputMode("update")` hacia la tabla, que aplica un upsert por clave primaria.
- [x] `foreachBatch` que deduplica el lote por cliente y luego ejecuta un `MERGE`.
- [ ] `foreachBatch` con un `MERGE` directo del lote, porque Delta resuelve solo los duplicados.
- [ ] Un stream con `dropDuplicates()` sin watermark y escritura en modo `append`.
porque: El `MERGE` falla si varias filas del origen coinciden con la misma fila del destino, así que hay que deduplicar cada lote antes.

## Escritura idempotente
leccion: cert-databricks-nivel-professional
dominio: 1
Dentro de `foreachBatch`, un job hace append a dos tablas distintas. Si el job falla y el lote se reintenta, no deben duplicarse filas. ¿Qué usas?
- [ ] Cambiar el trigger a `availableNow`, que nunca reprocesa un lote ya iniciado.
- [x] Las opciones `txnAppId` y `txnVersion` (con el `batch_id`) en cada escritura.
- [ ] `outputMode("complete")`, que reemplaza las tablas en cada lote y evita los duplicados.
- [ ] Un `VACUUM` al inicio de cada lote para limpiar escrituras parciales anteriores.
porque: Con `txnAppId` y `txnVersion`, Delta detecta que esa aplicación ya escribió ese lote y descarta la repetición.

## Change Data Feed
leccion: cert-databricks-nivel-professional
dominio: 3
Gold debe actualizarse con los cambios de `silver.pedidos` (inserts, updates y deletes) sin releer la tabla entera. ¿Qué habilitas y lees?
- [ ] Liquid Clustering en silver y una lectura batch filtrada por la última fecha de carga.
- [x] Change Data Feed en silver, leído con `readChangeFeed`.
- [ ] Un índice Delta Sync sobre silver, que expone las filas modificadas en cada sincronización.
- [ ] Deletion vectors en silver, que guardan una lista de filas cambiadas para lectores externos.
porque: Change Data Feed registra cada fila insertada, actualizada (pre y post imagen) y borrada, y se puede leer en batch o como stream.

## Constraints
leccion: cert-databricks-nivel-professional
dominio: 3
¿Cuál de estas restricciones **se fuerza** al escribir en una tabla Delta de Databricks?
- [ ] `PRIMARY KEY`, que rechaza filas con una clave repetida.
- [ ] `FOREIGN KEY`, que rechaza filas sin su fila en la tabla padre.
- [x] `CHECK (monto >= 0)`
- [ ] `UNIQUE`, que rechaza valores repetidos en la columna.
porque: `NOT NULL` y `CHECK` se fuerzan. Las claves primarias y foráneas son informativas.

## Funciones de IA
leccion: cert-databricks-nivel-professional
dominio: 1
Hay que clasificar 4 millones de reseñas en categorías fijas usando un LLM, dentro de un pipeline SQL. ¿Qué es lo más adecuado?
- [ ] Un notebook con un bucle de Python que llama al endpoint de a una reseña.
- [x] `ai_classify` o `ai_query` aplicados a la tabla en SQL.
- [ ] Una Python UDF fila a fila que llama a la API del proveedor del modelo.
- [ ] Un agente desplegado en Model Serving que reciba las reseñas de a una.
porque: Las funciones de IA en SQL procesan tablas completas en paralelo y se integran en pipelines; los bucles fila a fila son lentos y caros.

## UDF correcta
leccion: cert-databricks-nivel-professional
dominio: 1
Una regla de negocio para calcular el impuesto se puede expresar con `CASE` y operaciones aritméticas, y la usan varios equipos desde SQL. ¿Cómo la implementas?
- [ ] Una Python UDF fila a fila, registrada en cada notebook que la necesita usar.
- [x] Función SQL en Unity Catalog con `CREATE FUNCTION ... RETURN`.
- [ ] Una pandas UDF dentro de un paquete instalado en todos los clústeres de la empresa.
- [ ] Una vista por equipo que repite la expresión `CASE` con sus propios nombres de columnas.
porque: La función SQL de Unity Catalog es gobernada, reutilizable y se expande dentro del plan, con mejor rendimiento que una UDF de Python.

## Leer de otros motores
leccion: cert-databricks-nivel-professional
dominio: 4
Un equipo de análisis usa Snowflake y necesita leer las tablas Delta administradas por Unity Catalog sin copiarlas. ¿Qué habilitas?
- [ ] Un job que exporte las tablas a CSV en un bucket compartido cada noche.
- [x] UniForm, para que las tablas se lean como Iceberg desde el catálogo de Unity Catalog.
- [ ] Deletion vectors, que hacen las tablas compatibles con cualquier motor externo.
- [ ] Lakehouse Federation desde Databricks hacia Snowflake.
porque: UniForm genera metadatos Iceberg, y otros motores leen las tablas a través del catálogo REST de Iceberg de Unity Catalog.

## Particionado excesivo
leccion: cert-databricks-optimizacion-monitoreo
dominio: 6
Una tabla particionada por `cliente_id` (3 millones de valores) tiene consultas lentas y millones de archivos chicos. ¿Qué haces?
- [ ] Agregar `fecha` como segunda columna de partición para repartir mejor los archivos.
- [x] Recrear la tabla sin particiones, con Liquid Clustering por `cliente_id`.
- [ ] Ejecutar `VACUUM` con retención de 0 horas para eliminar los archivos chicos.
- [ ] Aumentar el tamaño del SQL warehouse para leer más archivos en paralelo.
porque: Particionar por una columna de alta cardinalidad crea demasiadas particiones y archivos. Liquid Clustering agrupa los datos sin ese problema.

## Predictive Optimization
leccion: cert-databricks-optimizacion-monitoreo
dominio: 6
La plataforma tiene 2.000 tablas administradas de Unity Catalog y nadie programa `OPTIMIZE` ni `VACUUM`. ¿Qué activas?
- [ ] Un job nocturno que recorre todas las tablas y ejecuta `OPTIMIZE` y `VACUUM`.
- [x] Predictive Optimization en el catálogo o la cuenta.
- [ ] Auto compactación en cada clúster que escribe en esas tablas.
- [ ] Liquid Clustering automático, que también ejecuta `VACUUM`.
porque: Predictive Optimization ejecuta OPTIMIZE, VACUUM y ANALYZE en tablas administradas cuando conviene, sin programarlo.

## Spill
leccion: cert-databricks-optimizacion-monitoreo
dominio: 6
En la Spark UI, todas las tasks de un stage de agregación tienen spill a disco de varios GB, con tiempos parejos. ¿Qué ajuste es el más adecuado?
- [ ] Activar AQE skew join, que divide las particiones más grandes de ese stage del shuffle.
- [x] Más particiones de shuffle, o máquinas con más memoria por núcleo.
- [ ] Hacer `collect()` antes de la agregación, para que el driver resuelva el cálculo final.
- [ ] Desactivar Photon, que usa bastante más memoria que el motor estándar de Spark.
porque: Spill parejo en todas las tasks indica particiones demasiado grandes para la memoria disponible (no skew): más particiones o más memoria.

## Consultas caras
leccion: cert-databricks-optimizacion-monitoreo
dominio: 5
¿Cómo encuentras las consultas de un SQL warehouse que más bytes leyeron en el último mes?
- [ ] En `system.billing.usage`, filtrando por `warehouse_id`.
- [x] En `system.query.history`, ordenando por `read_bytes`.
- [ ] En `system.access.audit`, filtrando por las consultas SQL.
- [ ] En el event log del warehouse, en la pestaña de monitoreo.
porque: `system.query.history` guarda cada consulta con su duración, bytes leídos, usuario y warehouse.

## Alerta de frescura
leccion: cert-databricks-optimizacion-monitoreo
dominio: 5
El equipo quiere enterarse si `gold.ventas` no se actualizó en las últimas 6 horas, aunque el job no haya fallado. ¿Qué configuras?
- [ ] Una notificación de falla en el job que actualiza la tabla.
- [x] Una alerta de SQL o el monitoreo de calidad de datos con detección de frescura.
- [ ] Un reintento infinito en el job hasta que la tabla se actualice.
- [ ] Una expectativa `FAIL UPDATE` en la tabla gold.
porque: Un job puede terminar bien sin escribir datos nuevos. Las alertas de frescura miran la tabla, no el estado del job.

## Política ABAC
leccion: cert-databricks-gobierno-seguridad
dominio: 7
Hay columnas con datos personales en cientos de tablas y se crean tablas nuevas cada semana. ¿Cómo garantizas que se enmascaren siempre?
- [ ] Revisando cada semana las tablas nuevas y aplicando una column mask a mano a cada una.
- [x] Etiquetas gobernadas en las columnas y una política ABAC de máscara en el catálogo.
- [ ] Una vista dinámica por cada tabla nueva, creada por un job que detecta tablas nuevas.
- [ ] Quitando `SELECT` a todos los usuarios y dando acceso solo a tablas revisadas por legal.
porque: La política ABAC se define una vez y aplica a toda columna con la etiqueta, incluidas las de tablas futuras.

## Derecho al olvido
leccion: cert-databricks-gobierno-seguridad
dominio: 7
Un cliente pidió que se borren sus datos. La tabla tiene deletion vectors activados. Ejecutaste `DELETE`. ¿Qué falta para que los datos desaparezcan físicamente?
- [ ] Nada, porque los deletion vectors borran las filas de los archivos al instante.
- [x] Reescribir los archivos afectados (`REORG TABLE ... APPLY (PURGE)`) y luego `VACUUM`.
- [ ] Un `RESTORE` a la versión anterior al `DELETE` para limpiar el historial de la tabla.
- [ ] Desactivar Change Data Feed, que guarda una copia de cada fila borrada.
porque: Con deletion vectors las filas solo se marcan como borradas; hay que purgarlas reescribiendo los archivos y después eliminar los archivos viejos con VACUUM.

## Compartir parcialmente
leccion: cert-databricks-gobierno-seguridad
dominio: 4
Un socio solo debe ver las filas de Lima de una tabla de ventas compartida por Delta Sharing. ¿Qué haces?
- [ ] Le das acceso a toda la tabla y le pides que filtre por Lima.
- [x] Agregas la tabla al share con una partición (`PARTITION (ciudad = 'Lima')`) o compartes una vista filtrada.
- [ ] Creas un row filter que evalúa el nombre del recipient con `current_user()`.
- [ ] Usas Lakehouse Federation para que el socio consulte solo Lima.
porque: Delta Sharing permite compartir particiones específicas o vistas, así el socio solo recibe lo que corresponde.

## Monitorear streams
leccion: cert-databricks-nivel-professional
dominio: 5
¿Dónde obtienes métricas de un stream como filas procesadas por segundo, retraso y tamaño del estado?
- [ ] En `system.billing.usage`, que registra el consumo de cada stream.
- [x] En `query.lastProgress` o con un `StreamingQueryListener`.
- [ ] En el Query Profile del SQL warehouse que lee la tabla de destino.
- [ ] En `system.access.table_lineage`, que registra cada micro-lote.
porque: El progreso de cada micro-lote incluye tasas de entrada y procesamiento, duración y métricas del state store.

## Despliegue reproducible
leccion: cert-databricks-cicd-bundles
Un job de producción fue modificado a mano en la interfaz y el siguiente despliegue del bundle revirtió el cambio. ¿Qué práctica evita esto?
- [ ] Desplegar el bundle solo los fines de semana, cuando nadie edita jobs.
- [x] Que los cambios entren solo por el YAML del bundle y CI, con permisos de solo lectura en la interfaz de prod.
- [ ] Desactivar el despliegue declarativo para que el bundle no modifique jobs existentes.
- [ ] Copiar los cambios de la interfaz al YAML después de cada despliegue.
porque: Con bundles, el YAML es la fuente de verdad. Los cambios manuales se pierden en el siguiente despliegue: hay que restringirlos.

## Pruebas
leccion: cert-databricks-nivel-professional
dominio: 9
¿Cómo se prueba de forma unitaria una función que limpia un DataFrame de pedidos?
- [ ] Ejecutando el job en producción y revisando a la mañana siguiente si el resultado se ve bien.
- [x] Con `pytest`, DataFrames chicos de entrada y salida esperada, y `assertDataFrameEqual`.
- [ ] Con una expectativa `FAIL UPDATE` en la tabla de pedidos limpios del pipeline de producción.
- [ ] Revisando el linaje de la tabla en el Catalog Explorer después de cada despliegue.
porque: Las pruebas unitarias verifican la lógica con datos mínimos y conocidos, en CI, sin depender de producción.

## Ingesta con CDC
leccion: cert-databricks-ingesta
dominio: 2
Hay que replicar en Databricks una base SQL Server con todos sus cambios, incluidos borrados, con latencia de minutos y sin escribir el código de CDC. ¿Qué usas?
- [ ] `spark.read.jdbc` programado cada 5 minutos con filtro por fecha de modificación.
- [x] Un conector gestionado de Lakeflow Connect para SQL Server, con su gateway de ingesta.
- [ ] Lakehouse Federation, porque las consultas siempre ven los datos actuales.
- [ ] Auto Loader sobre los archivos de backup diarios de la base.
porque: El conector gestionado lee el log de cambios mediante el gateway y aplica inserts, updates y deletes de forma incremental.

## @caso pagos: Pagos Rápidos
Pagos Rápidos procesa 30 millones de transacciones por día. Cada transacción llega a Kafka y debe estar en `silver.transacciones` en menos de un minuto. Un segundo stream trae las actualizaciones de estado (`aprobada`, `rechazada`, `reembolsada`) que pueden llegar hasta 2 horas después de la transacción.

Problemas actuales:
- El job de streaming que une transacciones con estados falla cada pocos días por falta de memoria.
- Algunas transacciones aparecen duplicadas en silver después de cada reinicio del job.
- Los analistas de riesgo necesitan ver el número de tarjeta completo; el resto de la empresa solo los últimos 4 dígitos.
- La factura de cómputo subió 40 % en tres meses y nadie sabe qué job la causa.

## Join de streams con estado
leccion: cert-databricks-nivel-professional
dominio: 1
caso: pagos
¿Qué cambio resuelve la falta de memoria del join entre los dos streams?
- [ ] Aumentar la memoria de los executors al doble cada vez que el job falla.
- [x] Definir watermarks en ambos streams y una condición de tiempo en el join (hasta 2 horas).
- [ ] Convertir el join de streams en un join con una tabla estática leída una vez al inicio.
- [ ] Desactivar el checkpoint para que el estado no se guarde en disco.
porque: Sin watermark y límite de tiempo, el estado del join crece sin fin. Con ambos, Spark puede descartar el estado viejo.

## Duplicados tras reiniciar
leccion: cert-databricks-nivel-professional
dominio: 1
caso: pagos
Silver se escribe con `foreachBatch` y un `INSERT`. ¿Qué evita los duplicados al reiniciar?
- [ ] Borrar el checkpoint antes de cada reinicio para empezar limpio.
- [x] Escribir con `MERGE` por `transaccion_id` (o usar `txnVersion`/`txnAppId`) para que el lote sea idempotente.
- [ ] Agregar un `DISTINCT` en las consultas de los analistas.
- [ ] Aumentar el intervalo del trigger a 10 minutos.
porque: Un lote puede reprocesarse tras una falla; MERGE por clave o las opciones de escritura idempotente de Delta evitan aplicarlo dos veces.

## Tarjeta enmascarada
leccion: cert-databricks-gobierno-seguridad
dominio: 7
caso: pagos
¿Cómo cumples el requisito del número de tarjeta en la misma tabla?
- [ ] Dos tablas: una completa para riesgo y otra enmascarada para el resto, sincronizadas cada hora.
- [x] Una column mask que devuelve el número completo si el usuario está en el grupo `riesgo` y solo los últimos 4 dígitos al resto.
- [ ] Un row filter que oculta las filas con tarjeta a quien no sea de riesgo.
- [ ] Cifrar la columna con AES y compartir la clave solo con riesgo.
porque: La column mask aplica la lógica por usuario en tiempo de consulta, sin duplicar datos.

## Qué job cuesta más
leccion: cert-databricks-optimizacion-monitoreo
dominio: 6
caso: pagos
¿Cómo identificas qué jobs causaron el aumento de costo?
- [ ] Revisando a mano la Spark UI de cada job del último trimestre.
- [x] Consultando `system.billing.usage` unido a `system.lakeflow.jobs` por `usage_metadata.job_id`, agrupado por mes.
- [ ] Pidiendo a cada equipo una estimación de sus DBU.
- [ ] Mirando el tamaño de las tablas en Catalog Explorer.
porque: Las tablas de sistema de facturación registran el consumo por job; unidas a la de jobs dan nombres y dueños.

## Escritura en varias tablas
leccion: cert-databricks-nivel-professional
dominio: 1
Dentro de `foreachBatch` escribes el mismo lote en dos tablas Delta. ¿Qué opciones de escritura hacen idempotente cada escritura?
- [ ] `mergeSchema` y `overwriteSchema`.
- [x] `txnAppId` y `txnVersion` (con el `batchId`).
- [ ] `checkpointLocation` y `trigger`.
- [ ] `maxFilesPerTrigger` y `maxBytesPerTrigger`.
porque: Delta registra el par (`txnAppId`, `txnVersion`) y omite una escritura que ya se aplicó.

## Ventanas y salida
leccion: cert-databricks-nivel-professional
dominio: 1
Una agregación por ventanas de 10 minutos con watermark de 15 minutos escribe en modo `append`. ¿Cuándo aparece cada ventana en la salida?
- [ ] Cada vez que llega un evento de esa ventana, con el valor parcial acumulado hasta ese momento del micro-lote.
- [x] Cuando la marca de agua supera el final de la ventana, una sola vez con el valor final.
- [ ] Solo cuando se detiene el stream.
- [ ] Nunca: `append` no admite agregaciones.
porque: En `append`, una ventana se emite cuando ya no puede recibir más datos según la marca de agua.

## Estado arbitrario
leccion: cert-databricks-nivel-professional
dominio: 1
Hay que detectar, por tarjeta, tres rechazos seguidos en menos de 5 minutos, con lógica propia y timers. ¿Qué API usas?
- [ ] Una agregación con `groupBy(window(...))` y un filtro posterior que cuenta los rechazos de cada ventana fija.
- [x] `transformWithState` (o `applyInPandasWithState`) con estado por clave y timers.
- [ ] Una UDF escalar de Python.
- [ ] Una vista materializada.
porque: Las APIs de estado arbitrario permiten guardar estado propio por clave y reaccionar con timers.

## UDF vectorizada
leccion: cert-databricks-nivel-professional
dominio: 1
Hay que aplicar a 500 millones de filas una función de Python que usa numpy y no existe como función nativa. ¿Qué tipo de UDF es más eficiente?
- [ ] Una UDF escalar de Python fila por fila.
- [x] Una pandas UDF (vectorizada con Arrow).
- [ ] Una función SQL `CREATE FUNCTION` que llama a Python fila por fila.
- [ ] Un `collect()` y un bucle en el driver.
porque: La pandas UDF procesa lotes con Arrow y operaciones vectorizadas, mucho más rápido que fila por fila.

## Delta como fuente de streaming
leccion: cert-databricks-nivel-professional
dominio: 1
Un stream lee de una tabla Delta en la que a veces se actualizan filas viejas. El stream falla con un error de cambios no soportados. ¿Qué haces?
- [ ] Reiniciar el stream borrando el checkpoint cada vez que falla.
- [x] Usar `skipChangeCommits` para ignorar esos commits, o leer el Change Data Feed si hay que procesarlos.
- [ ] Desactivar el registro de transacciones de la tabla.
- [ ] Convertir la tabla de origen a Parquet.
porque: Una fuente Delta de streaming espera solo agregados; `skipChangeCommits` ignora actualizaciones y borrados, y el CDF los entrega como cambios.

## Lote inicial gigante
leccion: cert-databricks-nivel-professional
dominio: 1
Al iniciar un stream nuevo sobre una tabla Delta de 50 TB, el primer micro-lote es enorme y falla. ¿Qué opción lo controla?
- [ ] `trigger(availableNow=True)` sin otros cambios, que procesa todo el histórico en un único lote grande.
- [x] `maxFilesPerTrigger` o `maxBytesPerTrigger` para limitar cada micro-lote.
- [ ] `mergeSchema` en la escritura.
- [ ] `spark.sql.shuffle.partitions = 1`.
porque: Limitar los archivos o bytes por lote divide la carga histórica en lotes manejables.

## Lakeflow Connect con CDC
leccion: cert-databricks-ingesta
dominio: 2
¿Qué dos requisitos tiene un conector de base de datos de Lakeflow Connect para ingerir cambios de SQL Server?
- [x] Habilitar change tracking o CDC en la base de origen.
- [x] Un gateway de ingesta que lea los cambios y los deje en un volume de staging.
- [ ] Exportar las tablas a CSV cada hora.
- [ ] Instalar Kafka entre la base y Databricks.
- [ ] Un clúster clásico encendido las 24 horas en el workspace.
porque: Los conectores de bases usan un gateway que lee los cambios (change tracking o CDC) y un pipeline de ingesta que los aplica.

## Auto Loader con notificaciones
leccion: cert-databricks-ingesta
dominio: 2
Una carpeta recibe millones de archivos por día y listar el directorio se volvió lento. ¿Qué cambias en Auto Loader?
- [ ] `cloudFiles.maxFilesPerTrigger = 1`, para que cada micro-lote liste una porción más chica del directorio.
- [x] El modo de eventos de archivos (notificaciones) en lugar del listado.
- [ ] Cambiar a `COPY INTO` con un patrón de archivos.
- [ ] `spark.read` en lotes de una hora.
porque: Con notificaciones de eventos, Auto Loader recibe los archivos nuevos sin listar todo el directorio.

## Ingesta de Kafka
leccion: cert-databricks-ingesta
dominio: 2
Los eventos están en Kafka en formato Avro con Schema Registry. ¿Cómo los lees en Databricks?
- [ ] Con Auto Loader apuntando al broker de Kafka y `cloudFiles.format` en `avro` para decodificar los mensajes.
- [x] Con `readStream.format("kafka")` y `from_avro` con el Schema Registry.
- [ ] Con `COPY INTO` desde el tópico.
- [ ] Con Delta Sharing desde Kafka.
porque: La fuente Kafka entrega el valor en binario; `from_avro` lo decodifica con el esquema del registro.

## Cuarentena
leccion: cert-databricks-transformacion-pipelines
dominio: 3
En un pipeline declarativo hay que separar las filas inválidas en una tabla de cuarentena para revisarlas, en lugar de perderlas. ¿Cómo se hace?
- [ ] Con `expect_or_fail`, que guarda las filas en una tabla aparte.
- [x] Con dos tablas que leen la misma fuente: una con la condición y otra con la condición negada.
- [ ] Con `expect_or_drop`, que mueve las filas a `_quarantine`.
- [ ] Con un constraint `CHECK` que redirige las filas.
porque: Las expectations no mueven filas a otra tabla; el patrón de cuarentena escribe las inválidas en una tabla aparte con la regla invertida.

## VARIANT
leccion: cert-databricks-nivel-professional
dominio: 3
Los eventos JSON tienen campos muy variables entre productos. ¿Qué tipo de columna ofrece flexibilidad y buen rendimiento de consulta?
- [ ] `STRING` y `from_json` con un esquema de 300 campos.
- [x] `VARIANT`, con `parse_json` y consultas con `:`.
- [ ] `MAP<STRING, STRING>` con todos los valores convertidos a texto.
- [ ] `BINARY` con el JSON comprimido.
porque: VARIANT guarda datos semiestructurados en un formato binario eficiente, sin esquema fijo y con consultas rápidas.

## Funciones de IA en lote
leccion: cert-databricks-nivel-professional
dominio: 3
Hay que extraer la intención de 2 millones de mensajes de clientes como parte de una transformación SQL. ¿Qué función usas?
- [ ] Una UDF de Python que llama a una API externa fila por fila.
- [x] `ai_query` (o `ai_classify`) sobre un endpoint de modelo.
- [ ] `regexp_extract` con una lista de palabras clave.
- [ ] `explode` sobre el texto.
porque: Las funciones de IA de Databricks ejecutan inferencia en lote desde SQL con buen paralelismo.

## Calidad con expectations agregadas
leccion: cert-databricks-transformacion-pipelines
dominio: 3
¿Dónde consultas el porcentaje de filas que no cumplieron cada expectation en las últimas ejecuciones de un pipeline?
- [ ] En `DESCRIBE HISTORY` de la tabla.
- [x] En el event log del pipeline (eventos `flow_progress` con `data_quality`).
- [ ] En el Query Profile de la tabla.
- [ ] En `system.billing.usage`.
porque: El event log registra las métricas de calidad de cada flujo en cada actualización.

## Lakehouse Federation
leccion: cert-databricks-gobierno-seguridad
dominio: 4
Los analistas deben consultar tablas de una base PostgreSQL operativa desde Databricks, con permisos de Unity Catalog y sin copiar datos. ¿Qué usas?
- [ ] Un job que copia la base completa cada noche a tablas Delta administradas, con permisos de Unity Catalog.
- [x] Lakehouse Federation: una conexión y un catálogo foráneo.
- [ ] Delta Sharing desde PostgreSQL.
- [ ] Auto Loader sobre el directorio de datos de PostgreSQL.
porque: Federation registra la base externa como catálogo foráneo y ejecuta las consultas en el origen, gobernadas por Unity Catalog.

## Alertas de SQL
leccion: cert-databricks-optimizacion-monitoreo
dominio: 5
Hay que avisar por correo si el porcentaje de transacciones rechazadas de la última hora supera el 5 %. ¿Qué usas?
- [ ] Un `print` en el job de silver que escribe el porcentaje en el log y lo envía por correo al terminar.
- [x] Una alerta de Databricks SQL sobre una consulta con esa condición.
- [ ] Las notificaciones de falla del job.
- [ ] El linaje de Unity Catalog.
porque: Las alertas evalúan una consulta de forma programada y notifican cuando se cumple la condición.

## Monitoreo de calidad de datos
leccion: cert-databricks-optimizacion-monitoreo
dominio: 5
¿Qué función de Databricks detecta automáticamente anomalías de frescura y completitud en las tablas de un esquema?
- [ ] El Query Profile.
- [x] El monitoreo de calidad de datos (detección de anomalías) de Unity Catalog.
- [ ] Las expectations de los pipelines.
- [ ] Predictive Optimization.
porque: El monitoreo de calidad de datos revisa las tablas de un esquema y marca las que dejaron de actualizarse o tienen menos filas de lo esperado.

## Progreso del stream
leccion: cert-databricks-nivel-professional
dominio: 5
¿Qué métrica de `StreamingQueryProgress` indica que el stream no da abasto con lo que llega?
- [ ] `numInputRows` igual a cero en varios micro-lotes seguidos, lo que indica que la fuente dejó de enviar.
- [x] `inputRowsPerSecond` mayor que `processedRowsPerSecond` de forma sostenida.
- [ ] `batchId` creciente.
- [ ] `stateOperators` vacío.
porque: Si entran más filas por segundo de las que se procesan, el retraso crece.

## Skew en joins
leccion: cert-databricks-optimizacion-monitoreo
dominio: 6
En la Spark UI, una task de un stage de join tarda 40 minutos y las demás 30 segundos. ¿Qué indica y qué ayuda?
- [ ] Falta de memoria en el driver; aumentarla.
- [x] Skew en la clave del join; AQE con skew join (o salting de la clave caliente).
- [ ] Pocas particiones de shuffle; bajar a 10.
- [ ] Archivos chicos; ejecutar VACUUM.
porque: Una task mucho más lenta indica una clave con muchas filas; AQE divide las particiones sesgadas y el salting reparte la clave.

## Photon
leccion: cert-databricks-plataforma-computo
dominio: 6
¿Qué cargas se benefician más de Photon?
- [ ] UDFs de Python fila por fila, que Photon traduce a código nativo vectorizado en C++ de forma automática.
- [x] SQL y DataFrames con joins, agregaciones y escaneos grandes.
- [ ] Notebooks que solo usan pandas en el driver.
- [ ] Jobs que esperan respuestas de APIs externas.
porque: Photon es un motor vectorizado en C++ que acelera operaciones nativas de SQL y DataFrame; no acelera código Python arbitrario.

## Spill a disco
leccion: cert-databricks-optimizacion-monitoreo
dominio: 6
Todas las tasks de un shuffle tienen spill de varios GB y tiempos parejos. ¿Qué ajuste ayuda primero?
- [ ] Activar Z-ORDER sobre la tabla destino.
- [x] Más particiones de shuffle (o dejar que AQE las ajuste) o workers con más memoria.
- [ ] Bajar las particiones de shuffle a 1.
- [ ] Usar una UDF de Python.
porque: El spill parejo indica particiones demasiado grandes para la memoria; más particiones o más memoria lo reducen.

## Data skipping
leccion: cert-databricks-optimizacion-monitoreo
dominio: 6
¿Qué dos acciones mejoran el data skipping de una tabla Delta muy filtrada por `fecha` y `tienda`?
- [x] Liquid Clustering por esas columnas.
- [x] Asegurar que esas columnas estén entre las que recogen estadísticas.
- [ ] Ejecutar VACUUM con retención mínima.
- [ ] Convertir las columnas a STRING.
- [ ] Desactivar el registro de estadísticas.
porque: El clustering agrupa valores parecidos y las estadísticas min/max por archivo permiten saltar los que no aplican.

## Service principal
leccion: cert-databricks-gobierno-seguridad
dominio: 7
Los jobs de producción corren con la identidad de un ingeniero que se va de la empresa. ¿Cuál es la práctica correcta?
- [ ] Transferir la propiedad del job a otro ingeniero del equipo, que pasa a ser responsable de ejecutarlo.
- [x] Ejecutar los jobs con un service principal con permisos mínimos.
- [ ] Compartir la contraseña del ingeniero en un secreto.
- [ ] Dar ALL PRIVILEGES al grupo de ingenieros.
porque: Los service principals son identidades de máquina para automatizaciones, independientes de las personas.

## Secretos
leccion: cert-databricks-gobierno-seguridad
dominio: 7
Un notebook necesita la contraseña de una base externa. ¿Cómo la usas sin exponerla?
- [ ] La escribes en una celda y la borras después de ejecutar.
- [x] La guardas en un secret scope y la lees con `dbutils.secrets.get`; Databricks la oculta en las salidas.
- [ ] La pones en una variable de entorno del clúster en texto plano.
- [ ] La guardas en una tabla con acceso restringido.
porque: Los secretos se almacenan cifrados y su valor se redacta en las salidas de los notebooks.

## Borrado definitivo
leccion: cert-databricks-gobierno-seguridad
dominio: 7
Tras borrar con `DELETE` los datos de un cliente, ¿qué dos pasos garantizan que no queden en los archivos?
- [x] Reescribir los archivos afectados (`REORG TABLE ... APPLY (PURGE)` si hay deletion vectors).
- [x] Ejecutar `VACUUM` después del período de retención para borrar los archivos viejos.
- [ ] Ejecutar `OPTIMIZE ZORDER BY (cliente_id)`.
- [ ] Hacer `DESCRIBE HISTORY` para confirmar el borrado.
- [ ] Desactivar el Change Data Feed después de borrar.
porque: El DELETE marca filas; los archivos viejos siguen existiendo para el viaje en el tiempo hasta que VACUUM los elimina.

## Auditoría de accesos
leccion: cert-databricks-gobierno-seguridad
dominio: 8
Cumplimiento pregunta quién leyó la tabla `clientes` en las últimas dos semanas. ¿Dónde se consulta?
- [ ] En `DESCRIBE HISTORY clientes`.
- [x] En `system.access.audit`.
- [ ] En el event log del pipeline.
- [ ] En `system.billing.usage`.
porque: La tabla de auditoría registra las acciones de los usuarios, incluidas las lecturas de tablas.

## Etiquetas y descubrimiento
leccion: cert-databricks-gobierno-seguridad
dominio: 8
¿Cómo ayudas a que los analistas encuentren las tablas certificadas y entiendan sus columnas?
- [ ] Con un archivo de Excel compartido con la lista de tablas.
- [x] Con comentarios, etiquetas (tags) y descripciones en Unity Catalog, visibles en Catalog Explorer y en la búsqueda.
- [ ] Con nombres de tabla muy largos.
- [ ] Con un esquema por analista.
porque: Unity Catalog guarda la documentación, etiquetas y propietarios junto a los datos, y los hace buscables.

## Propietario
leccion: cert-databricks-gobierno-seguridad
dominio: 8
¿Quién debería ser el propietario (owner) de los esquemas de producción?
- [ ] El ingeniero que los creó, porque es quien mejor conoce su contenido y puede dar permisos rápido.
- [x] Un grupo (por ejemplo, `data-platform`), no una persona.
- [ ] Todos los usuarios de la cuenta.
- [ ] Nadie: los esquemas no tienen propietario.
porque: Que un grupo sea dueño evita que los objetos queden huérfanos cuando una persona cambia de rol.

## Linaje de columnas
leccion: cert-databricks-gobierno-seguridad
dominio: 8
Hay que saber de qué columnas de origen se calcula `margen` en gold. ¿Qué usas?
- [ ] `DESCRIBE DETAIL` de la tabla gold.
- [x] El linaje a nivel de columna de Unity Catalog (`system.access.column_lineage`).
- [ ] El Query Profile del último refresco.
- [ ] Las etiquetas de la tabla.
porque: Unity Catalog captura el linaje de columnas de las consultas y pipelines ejecutados.

## Pruebas con Databricks Connect
leccion: cert-databricks-nivel-professional
dominio: 9
Quieres ejecutar en tu IDE pruebas de pytest que usan Spark contra un clúster de Databricks. ¿Qué usas?
- [ ] Copiar las pruebas a un notebook y ejecutarlas a mano.
- [x] Databricks Connect, que ejecuta el código de Spark de tu IDE en el cómputo remoto.
- [ ] La CLI con `databricks fs cp`.
- [ ] Delta Sharing.
porque: Databricks Connect permite desarrollar y probar código local que corre en el cómputo de Databricks.

## Variables del bundle
leccion: cert-databricks-cicd-bundles
dominio: 9
El catálogo debe ser `dev` en el target de desarrollo y `prod` en el de producción, sin duplicar la definición del job. ¿Cómo?
- [ ] Dos archivos `databricks.yml` diferentes, uno por entorno, que se eligen con un parámetro de la CLI.
- [x] Una variable `catalogo` con valores por target (`${var.catalogo}`).
- [ ] Un `if` dentro del notebook que lee el nombre del workspace.
- [ ] Cambiar el nombre a mano antes de cada despliegue.
porque: Las variables del bundle se definen una vez y se sobrescriben por target.

## Ejecutar como
leccion: cert-databricks-cicd-bundles
dominio: 9
En producción, el job desplegado por el bundle debe correr con un service principal aunque lo despliegue un usuario. ¿Qué configuras?
- [ ] Permisos `CAN_VIEW` en el job para el service principal, que así pasa a ser la identidad de ejecución.
- [x] `run_as` con el service principal en el target de prod.
- [ ] `mode: development` en prod.
- [ ] Un secreto con el token del usuario.
porque: `run_as` define la identidad con la que se ejecutan los recursos desplegados.

## Logs del driver
leccion: cert-databricks-nivel-professional
dominio: 9
Un job de Python falla con un error que no aparece en la salida del notebook. ¿Dónde lo buscas?
- [ ] En `system.billing.usage`, que guarda el mensaje de error de cada ejecución junto con el consumo.
- [x] En los logs del driver (stdout, stderr y log4j) del run.
- [ ] En el linaje de la tabla.
- [ ] En el historial del bundle.
porque: Los logs del driver capturan excepciones y mensajes que no siempre llegan a la salida de la celda.

## Columnas de identidad
leccion: cert-databricks-nivel-professional
dominio: 10
Una dimensión necesita una clave subrogada numérica que se genere sola al insertar filas. ¿Qué usas en Delta?
- [ ] `monotonically_increasing_id()` en cada carga.
- [x] Una columna `GENERATED ALWAYS AS IDENTITY`.
- [ ] Un `ROW_NUMBER()` sobre toda la tabla en cada carga.
- [ ] Un UUID como string.
porque: Las columnas de identidad generan valores únicos y crecientes, sin colisiones entre cargas.

## Columnas generadas
leccion: cert-databricks-nivel-professional
dominio: 10
Quieres que la columna `fecha` se calcule siempre a partir de `timestamp_evento` y no pueda escribirse con otro valor. ¿Qué defines?
- [ ] Un trigger de base de datos que recalcula la columna cada vez que se inserta o actualiza una fila.
- [x] `fecha DATE GENERATED ALWAYS AS (CAST(timestamp_evento AS DATE))`.
- [ ] Una vista que calcula la columna.
- [ ] Un constraint `NOT NULL`.
porque: Las columnas generadas se calculan al escribir y Delta valida que coincidan con la expresión.

## SCD tipo 2
leccion: cert-databricks-nivel-professional
dominio: 10
¿Qué columnas suele agregar una dimensión SCD tipo 2 para conservar el historial?
- [ ] Solo una columna `actualizado`.
- [x] Fechas de inicio y fin de vigencia (y a veces un indicador de registro actual).
- [ ] Una columna por cada valor anterior del atributo.
- [ ] Ninguna: Delta guarda el historial con time travel.
porque: SCD2 crea una fila por versión con su período de vigencia; el time travel no sirve como historial de negocio de largo plazo.

## Constraints informativos
leccion: cert-databricks-nivel-professional
dominio: 10
¿Qué ocurre con una `PRIMARY KEY` declarada en una tabla de Unity Catalog?
- [ ] Rechaza las filas con claves duplicadas al insertar, igual que en una base de datos transaccional.
- [x] Es informativa: documenta la relación y ayuda al optimizador.
- [ ] Crea un índice B-tree.
- [ ] Particiona la tabla por esa columna.
porque: Las claves primarias y foráneas son informativas; los constraints que se fuerzan son `NOT NULL` y `CHECK`.
