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

## Watermark y datos tardíos
leccion: cert-databricks-nivel-professional
dominio: 1
Un stream agrupa eventos en ventanas de 10 minutos con `withWatermark("ts", "30 minutes")`. Llega un evento cuyo `ts` es 45 minutos anterior al mayor `ts` visto hasta ahora. ¿Qué ocurre con él?
- [ ] Se suma a su ventana original, porque la watermark solo afecta al orden en que se emiten los resultados.
- [x] Se descarta: su ventana ya quedó por debajo de la watermark y su estado fue liberado.
- [ ] El stream falla con un error de evento fuera de orden.
- [ ] Se guarda en una tabla de cuarentena automática para reprocesarlo.
porque: La watermark es el máximo `ts` visto menos la tolerancia. Lo que llega más atrasado que eso se ignora, y por eso Spark puede borrar el estado de esas ventanas.

## Modo append con agregaciones
leccion: cert-databricks-nivel-professional
dominio: 1
Un stream con una agregación por ventana y watermark escribe en una tabla Delta con `outputMode("append")`. ¿Cuándo aparece en la tabla la fila de una ventana?
- [ ] En cada micro-lote, con el valor parcial acumulado hasta ese momento, y se va corrigiendo en los lotes siguientes.
- [x] Una sola vez, cuando la watermark supera el final de la ventana y el resultado ya no puede cambiar.
- [ ] Solo al detener el stream, cuando se cierran todas las ventanas abiertas.
- [ ] Nunca: `append` no admite agregaciones aunque haya watermark.
porque: En `append` solo se emiten resultados definitivos. Con watermark, una ventana es definitiva cuando ya no puede recibir más eventos.

## Deduplicar en streaming
leccion: cert-databricks-nivel-professional
dominio: 1
Los eventos pueden llegar repetidos hasta 2 horas después del original. Hay que eliminarlos sin que el estado crezca sin límite. ¿Qué usas?
- [ ] `dropDuplicates(["evento_id"])` sin watermark.
- [ ] `distinct()` sobre el stream completo.
- [x] `withWatermark("ts", "2 hours")` y `dropDuplicatesWithinWatermark(["evento_id"])`.
- [ ] Un `MERGE` en `foreachBatch` contra una tabla auxiliar que guarda todos los identificadores ya vistos.
porque: Con watermark, Spark recuerda cada clave solo durante la tolerancia y después libera el estado. Sin watermark recuerda todas las claves para siempre.

## Join de stream con tabla estática
leccion: cert-databricks-nivel-professional
dominio: 1
Un stream de pedidos se une con la tabla Delta `dim_clientes`, que se actualiza una vez por día. ¿Qué versión de `dim_clientes` usa cada micro-lote?
- [ ] La versión que existía cuando arrancó el stream, que queda fija en el plan hasta que se reinicie.
- [x] La versión más reciente de la tabla en el momento de procesar ese micro-lote.
- [ ] Ninguna: un stream no se puede unir con una tabla estática.
- [ ] La versión indicada en el checkpoint.
porque: En un join stream–estático, la parte estática Delta se vuelve a leer en cada micro-lote, así que ve los cambios sin reiniciar. No guarda estado.

## Cambiar la consulta de un stream
leccion: cert-databricks-nivel-professional
dominio: 1
Un stream en producción agrupa por `pais`. Cambias el código para agrupar por `pais` y `ciudad` y lo reinicias con el mismo checkpoint. ¿Qué pasa?
- [ ] Continúa normalmente: detecta el cambio de claves y recalcula todos los totales leyendo la fuente desde el principio.
- [x] Falla o da resultados incorrectos: el estado guardado no es compatible con las nuevas claves; hace falta un checkpoint nuevo.
- [ ] Spark migra el estado al nuevo esquema automáticamente.
- [ ] Ignora el cambio y sigue agrupando solo por `pais`.
porque: El checkpoint guarda el estado con el esquema de la consulta original. Cambiar las claves o las agregaciones con estado exige empezar con un checkpoint nuevo.

## Trigger availableNow
leccion: cert-databricks-nivel-professional
dominio: 1
Un job diario debe procesar todo lo que llegó desde la última ejecución y terminar, respetando los límites por lote. ¿Qué trigger eliges?
- [ ] `processingTime="1 day"`.
- [ ] `once=True`.
- [x] `availableNow=True`.
- [ ] `continuous="1 second"`.
porque: `availableNow` procesa todo lo pendiente en varios micro-lotes (respeta `maxFilesPerTrigger` y similares) y se detiene. `once` hace un único lote y está en desuso.

## Fuente Delta con borrados
leccion: cert-databricks-nivel-professional
dominio: 1
Un stream lee de una tabla Delta como fuente. Alguien ejecuta un `DELETE` en esa tabla y el stream falla. Los borrados no importan aguas abajo. ¿Qué opción lo resuelve?
- [ ] `ignoreMissingFiles`.
- [x] `skipChangeCommits`.
- [ ] `mergeSchema`.
- [ ] `failOnDataLoss = false`.
porque: Una fuente Delta en streaming espera solo agregados. `skipChangeCommits` hace que el stream ignore las transacciones que actualizan o borran filas.

## applyInPandas
leccion: cert-databricks-nivel-professional
dominio: 1
Hay que ajustar un modelo estadístico distinto por cada tienda, con una función de pandas que recibe todas las filas de la tienda. ¿Qué API usas?
- [ ] Una UDF de Python fila por fila.
- [ ] `collect()` y un bucle en el driver.
- [x] `groupBy("tienda").applyInPandas(funcion, schema)`.
- [ ] `mapInPandas(funcion, schema)`, que agrupa las filas por tienda.
porque: `applyInPandas` entrega a la función un DataFrame de pandas por grupo y lo ejecuta en paralelo. `mapInPandas` recibe lotes arbitrarios, sin agrupar.

## Costo de una UDF de Python
leccion: cert-databricks-nivel-professional
dominio: 1
Una transformación usa una UDF de Python fila por fila y es muy lenta. La lógica es una concatenación con una condición. ¿Qué es lo más eficiente?
- [ ] Convertirla en una pandas UDF con vectorización por Arrow.
- [x] Reescribirla con funciones integradas de Spark (`when`, `concat`).
- [ ] Aumentar el número de particiones.
- [ ] Guardar el DataFrame en caché antes de aplicarla.
porque: Las funciones integradas se optimizan y pueden ejecutarse en Photon, sin pasar datos a Python. Una pandas UDF mejora a la UDF fila por fila, pero sigue siendo más lenta que lo nativo.

## Lectura de un MERGE
leccion: cert-databricks-nivel-professional
dominio: 1
Un `MERGE` tiene `WHEN MATCHED AND s.borrado = true THEN DELETE` y después `WHEN MATCHED THEN UPDATE SET *`. Para una fila que coincide y tiene `borrado = true`, ¿qué se ejecuta?
- [x] Solo el `DELETE`: se aplica la primera cláusula cuya condición se cumple.
- [ ] El `UPDATE` y luego el `DELETE`.
- [ ] Ninguna de las dos: tener dos cláusulas `WHEN MATCHED` produce un error de análisis.
- [ ] La última cláusula escrita, que tiene prioridad.
porque: Las cláusulas `WHEN MATCHED` se evalúan en orden y se ejecuta la primera que cumple. Por eso las más específicas van primero.

## MERGE con evolución de esquema
leccion: cert-databricks-nivel-professional
dominio: 1
El origen de un `MERGE` trae una columna nueva que el destino no tiene y debe agregarse sola. ¿Cómo lo logras?
- [ ] Con `overwriteSchema` en la escritura.
- [x] Con `MERGE WITH SCHEMA EVOLUTION` (o la configuración de evolución automática) y `UPDATE SET *` / `INSERT *`.
- [ ] No se puede hacer dentro del `MERGE`: hay que ejecutar `ALTER TABLE ADD COLUMN` antes de cada carga que traiga columnas nuevas.
- [ ] Con `spark.sql.shuffle.partitions = auto`.
porque: La evolución de esquema en `MERGE` agrega las columnas nuevas del origen cuando se usan las formas `*`. `overwriteSchema` es para reemplazar la tabla completa.

## Concurrencia en Delta
leccion: cert-databricks-nivel-professional
dominio: 1
Dos jobs hacen `MERGE` sobre la misma tabla al mismo tiempo y uno falla con `ConcurrentAppendException`. Cada job trabaja con países distintos. ¿Qué reduce el conflicto?
- [ ] Ejecutar `VACUUM` antes de cada job.
- [x] Que la condición del `MERGE` incluya el país y la tabla esté organizada por esa columna, para que no toquen los mismos archivos.
- [ ] Cambiar el nivel de aislamiento de la tabla a `Serializable`, que permite más escrituras simultáneas sobre los mismos archivos.
- [ ] Desactivar el control de concurrencia optimista.
porque: Delta detecta conflictos cuando dos transacciones pueden leer o escribir los mismos archivos. Separar los datos y hacerlo explícito en la condición evita el solapamiento.

## Estado arbitrario en Python
leccion: cert-databricks-nivel-professional
dominio: 1
Necesitas detectar sesiones de usuario con reglas propias (cerrar la sesión tras 30 minutos sin actividad y emitir un resumen). ¿Qué operador está pensado para esto?
- [ ] `window()` con `groupBy`.
- [ ] `dropDuplicates`.
- [x] `transformWithState` (o `applyInPandasWithState`), con temporizadores por clave.
- [ ] `foreachBatch` con un diccionario global en el driver que recuerda la sesión de cada usuario.
porque: Los operadores de estado arbitrario permiten guardar un estado propio por clave y usar temporizadores para emitir y limpiar cuando corresponde.

## Almacén de estado
leccion: cert-databricks-nivel-professional
dominio: 1
Un stream con millones de claves en estado sufre pausas largas por recolección de basura en los executors. ¿Qué cambio ayuda?
- [ ] Guardar el estado en una tabla Delta administrada, que no ocupa memoria de los executors.
- [x] Usar RocksDB como almacén de estado, que lo guarda fuera de la memoria de la JVM.
- [ ] Quitar la watermark para simplificar el plan.
- [ ] Cambiar a `outputMode("complete")`.
porque: El almacén por defecto mantiene el estado en la memoria de la JVM. RocksDB lo mantiene en memoria nativa y disco local, lo que reduce la presión sobre el recolector.

## Evolución de esquema en Auto Loader
leccion: cert-databricks-ingesta
dominio: 2
Auto Loader lee JSON con `schemaEvolutionMode` por defecto (`addNewColumns`). Llega un archivo con una columna nueva. ¿Qué pasa?
- [ ] La columna se ignora en silencio.
- [x] El stream se detiene con un error, registra la columna nueva en el esquema guardado y, al reiniciarse, la incluye.
- [ ] La columna se guarda en `_rescued_data` y el stream sigue.
- [ ] El stream sigue sin detenerse y reprocesa todos los archivos anteriores para completarlos con la columna nueva.
porque: En `addNewColumns` el stream falla una vez, actualiza la ubicación del esquema y continúa con la columna al reiniciar. Por eso estos jobs se configuran con reintentos.

## Datos que no encajan
leccion: cert-databricks-ingesta
dominio: 2
En Auto Loader, una columna declarada como `INT` recibe el texto `"N/A"` en algunas filas. Con la configuración por defecto, ¿dónde queda ese valor?
- [ ] La fila completa se descarta.
- [ ] El stream falla al primer valor inválido.
- [x] En la columna `_rescued_data`, y la columna tipada queda en `NULL`.
- [ ] En el archivo `_corrupt_record` dentro de la carpeta del checkpoint.
porque: La columna de datos rescatados conserva lo que no coincide con el esquema (tipo distinto, columna inesperada) para no perderlo.

## Listado frente a eventos de archivos
leccion: cert-databricks-ingesta
dominio: 2
Una carpeta recibe millones de archivos por día y listar el directorio en cada lote es lento y caro. ¿Qué modo de Auto Loader conviene?
- [ ] Listado de directorio con `maxFilesPerTrigger = 1`.
- [x] Eventos de archivos (notificaciones), que avisan de cada archivo nuevo sin listar la carpeta.
- [ ] `COPY INTO` ejecutado cada minuto.
- [ ] Lectura batch con `spark.read` y un filtro por fecha de modificación, que evita abrir los archivos ya procesados.
porque: Con eventos de archivos, el almacenamiento notifica las llegadas y Auto Loader no recorre la carpeta entera, que es lo que escala mal.

## COPY INTO
leccion: cert-databricks-ingesta
dominio: 2
Un `COPY INTO` carga archivos de una carpeta. Se vuelve a ejecutar sin que haya archivos nuevos. ¿Cuál es el resultado?
- [ ] Duplica todas las filas.
- [x] No carga nada: recuerda qué archivos ya procesó.
- [ ] Falla porque la tabla ya tiene datos.
- [ ] Reemplaza la tabla con el contenido de la carpeta.
porque: `COPY INTO` es idempotente: lleva el registro de los archivos cargados. Para forzar la recarga existe la opción `force`.

## Volúmenes de Unity Catalog
leccion: cert-databricks-ingesta
dominio: 2
Un proveedor deja archivos PDF y CSV que deben quedar gobernados por Unity Catalog antes de procesarlos. ¿Dónde los guardas?
- [ ] En DBFS root, bajo `/FileStore`.
- [ ] En una tabla Delta administrada con una columna binaria por cada archivo recibido.
- [x] En un volumen, accesible en `/Volumes/<catálogo>/<esquema>/<volumen>/`.
- [ ] En el directorio de trabajo del notebook.
porque: Los volúmenes gobiernan archivos que no son tablas con los mismos permisos de Unity Catalog (`READ VOLUME`, `WRITE VOLUME`).

## Columna de metadatos del archivo
leccion: cert-databricks-ingesta
dominio: 2
En bronze hay que registrar de qué archivo vino cada fila y cuándo se modificó ese archivo. ¿Cómo lo obtienes al leer?
- [ ] Con la función `input_file_name()`, que es la forma recomendada y la única disponible en cómputo con Unity Catalog.
- [x] Seleccionando la columna oculta `_metadata` (`_metadata.file_path`, `_metadata.file_modification_time`).
- [ ] Con una UDF que liste el directorio.
- [ ] No es posible sin Auto Loader.
porque: `_metadata` está disponible al leer archivos y trae la ruta, el nombre, el tamaño y la fecha de modificación. Hay que seleccionarla de forma explícita.

## Expectativas: tres comportamientos
leccion: cert-databricks-transformacion-pipelines
dominio: 3
En un pipeline declarativo, una regla dice `CONSTRAINT monto_ok EXPECT (monto > 0) ON VIOLATION DROP ROW`. Llegan 100 filas y 5 tienen monto negativo. ¿Qué queda en la tabla?
- [ ] 100 filas, y las 5 inválidas se cuentan en las métricas.
- [x] 95 filas, y las 5 descartadas se cuentan en el registro de eventos.
- [ ] Ninguna: la actualización falla.
- [ ] 95 filas en la tabla y 5 en una tabla de cuarentena creada automáticamente.
porque: `DROP ROW` elimina las filas que no cumplen y las registra. Sin cláusula se conservan (solo se miden) y con `FAIL UPDATE` se detiene la actualización.

## Detener ante datos inválidos
leccion: cert-databricks-transformacion-pipelines
dominio: 3
Para una tabla de facturación, cualquier fila sin `cliente_id` debe impedir que se publiquen datos. ¿Qué expectativa corresponde?
- [ ] `EXPECT (cliente_id IS NOT NULL)`.
- [ ] `EXPECT (cliente_id IS NOT NULL) ON VIOLATION DROP ROW`, con una alerta.
- [x] `EXPECT (cliente_id IS NOT NULL) ON VIOLATION FAIL UPDATE`.
- [ ] Un `CHECK` agregado después con `ALTER TABLE`.
porque: `FAIL UPDATE` detiene la actualización ante la primera fila inválida, y la transacción no se confirma.

## AUTO CDC con eventos desordenados
leccion: cert-databricks-transformacion-pipelines
dominio: 3
Un feed de cambios llega desordenado: a veces el `UPDATE` de un cliente llega antes que un cambio anterior. ¿Qué cláusula de `AUTO CDC` asegura que quede el último valor real?
- [ ] `KEYS (cliente_id)`.
- [x] `SEQUENCE BY` con la columna que ordena los cambios (por ejemplo, la marca de tiempo del origen).
- [ ] `STORED AS SCD TYPE 2`.
- [ ] `APPLY AS DELETE WHEN`, que descarta los eventos que llegan con una marca de tiempo anterior a la ya aplicada.
porque: `SEQUENCE BY` indica el orden lógico de los cambios; un evento más viejo que llega tarde no pisa a uno más nuevo.

## SCD tipo 2 automático
leccion: cert-databricks-transformacion-pipelines
dominio: 3
Con `AUTO CDC … STORED AS SCD TYPE 2`, ¿qué columnas agrega Databricks para llevar el historial?
- [ ] `valid_from` y `valid_to`.
- [ ] `_commit_version` y `_commit_timestamp`.
- [x] `__START_AT` y `__END_AT`.
- [ ] `effective_date` y `is_current`.
porque: En SCD tipo 2, cada versión de la fila tiene su vigencia en `__START_AT` y `__END_AT`; la versión actual tiene `__END_AT` nulo.

## Vista materializada o tabla de streaming
leccion: cert-databricks-transformacion-pipelines
dominio: 3
Gold calcula ventas por mes a partir de silver, donde hay actualizaciones y borrados de pedidos. ¿Qué tipo de objeto conviene en el pipeline?
- [ ] Una tabla de streaming, porque es incremental y procesa también las actualizaciones y los borrados de la fuente.
- [x] Una vista materializada, que recalcula el resultado correcto aunque la fuente tenga cambios.
- [ ] Una vista temporal.
- [ ] Una tabla externa con `OVERWRITE` manual.
porque: Las tablas de streaming esperan fuentes de solo agregado. Las vistas materializadas admiten fuentes con cambios y se actualizan de forma incremental cuando es posible.

## Leer VARIANT
leccion: cert-databricks-nivel-professional
dominio: 3
Una columna `payload` de tipo `VARIANT` guarda JSON con forma variable. ¿Cómo extraes el campo `cliente.ciudad` como texto?
- [ ] `payload.cliente.ciudad`.
- [x] `payload:cliente.ciudad::string`.
- [ ] `get_json_object(payload, '$.cliente.ciudad')`.
- [ ] `from_json(payload, 'cliente STRUCT<ciudad STRING>')`.
porque: Los campos de un `VARIANT` se navegan con `:` y se convierten con `::tipo`. Las funciones de JSON trabajan sobre texto, no sobre `VARIANT`.

## Aplanar un arreglo
leccion: cert-databricks-transformacion-pipelines
dominio: 3
Cada pedido tiene una columna `items` que es un arreglo de estructuras. Se necesita una fila por artículo, sin perder los pedidos que no tienen artículos. ¿Qué función usas?
- [ ] `explode(items)`.
- [x] `explode_outer(items)`.
- [ ] `flatten(items)`.
- [ ] `array_distinct(items)`.
porque: `explode` descarta las filas con arreglo vacío o nulo. `explode_outer` las conserva con valores nulos.

## Cuarentena de filas inválidas
leccion: cert-databricks-transformacion-pipelines
dominio: 3
Las filas inválidas no deben llegar a silver, pero tampoco perderse: alguien las revisará. ¿Qué patrón aplicas en el pipeline?
- [ ] `ON VIOLATION DROP ROW`, y recuperar después las filas descartadas desde el registro de eventos del pipeline.
- [x] Dos tablas con la regla invertida: una recibe las filas válidas y otra, de cuarentena, las que no cumplen.
- [ ] `ON VIOLATION FAIL UPDATE` y reintentar hasta que pase.
- [ ] Guardar todo en silver y filtrar en cada consulta.
porque: Una expectativa con `DROP ROW` elimina las filas. Para conservarlas hay que enviarlas a otra tabla con la condición contraria.

## Delta Sharing: quién recibe
leccion: cert-databricks-gobierno-seguridad
dominio: 4
Un socio usa otro proveedor de nube y no tiene Databricks. Debe leer una tabla tuya siempre actualizada, sin copias. ¿Qué usas?
- [ ] Lakehouse Federation hacia el almacén del socio.
- [x] Delta Sharing con protocolo abierto: creas un share, un destinatario y le entregas el archivo de credenciales.
- [ ] Un job que exporta la tabla a CSV en un bucket público cada hora y un enlace firmado que el socio descarga cuando quiere.
- [ ] Un `DEEP CLONE` en la cuenta del socio.
porque: Delta Sharing comparte datos en vivo y de solo lectura. Con el protocolo abierto, el destinatario puede leer desde pandas, Spark o Power BI sin tener Databricks.

## Compartir con historial
leccion: cert-databricks-gobierno-seguridad
dominio: 4
El destinatario de un share quiere leer la tabla compartida como fuente de streaming. ¿Qué necesita el share?
- [ ] Nada especial: todas las tablas de un share admiten streaming.
- [x] Que la tabla se agregue al share con historial (`WITH HISTORY`).
- [ ] Que el destinatario tenga el privilegio `MODIFY`.
- [ ] Que la tabla sea externa.
porque: Para viaje en el tiempo, lectura incremental o streaming del lado del destinatario, la tabla debe compartirse con su historial.

## Federation: catálogo extranjero
leccion: cert-databricks-gobierno-seguridad
dominio: 4
Los analistas quieren unir, en una misma consulta, tablas de Unity Catalog con tablas de un PostgreSQL operativo, sin copiar los datos. ¿Qué configuras?
- [ ] Un share de Delta Sharing sobre PostgreSQL.
- [x] Una conexión a PostgreSQL y un catálogo extranjero (foreign catalog) creado sobre ella.
- [ ] Un volumen externo que apunte a la base.
- [ ] Un pipeline con Auto Loader que lea directamente los archivos del log de transacciones de PostgreSQL.
porque: Lakehouse Federation expone la base externa como un catálogo de solo lectura; las consultas se envían al origen y se gobiernan con Unity Catalog.

## Cuándo no usar Federation
leccion: cert-databricks-gobierno-seguridad
dominio: 4
Un tablero consulta cada minuto, con agregaciones pesadas, una tabla de 2.000 millones de filas de una base federada. La base de origen se satura. ¿Qué conviene?
- [ ] Aumentar el tamaño del SQL warehouse, para que la base de origen reciba menos trabajo en cada consulta.
- [x] Ingerir esa tabla al lakehouse (por ejemplo con Lakeflow Connect) y consultar la copia Delta.
- [ ] Crear más catálogos extranjeros sobre la misma base.
- [ ] Activar Photon en la base de origen.
porque: Federation sirve para acceso ocasional o exploración. La carga analítica frecuente y pesada conviene traerla al lakehouse para no cargar el sistema de origen.

## Clean Rooms
leccion: cert-databricks-gobierno-seguridad
dominio: 4
Dos empresas quieren saber cuántos clientes tienen en común sin mostrarse las listas de clientes. ¿Qué producto está pensado para eso?
- [ ] Delta Sharing con todas las columnas.
- [ ] Un catálogo extranjero compartido.
- [x] Clean Rooms: un entorno donde solo se ejecutan los notebooks aprobados por ambas partes y los datos crudos no se ven.
- [ ] Una vista dinámica con `current_user()` que cada empresa comparte con la otra por Delta Sharing, filtrando las filas propias.
porque: En una clean room cada parte aporta tablas, ninguna puede consultarlas libremente y solo sale el resultado de los análisis acordados.

## Tablas de sistema: historial de consultas
leccion: cert-databricks-optimizacion-monitoreo
dominio: 5
Quieres saber qué consultas de los SQL warehouses tardaron más de 5 minutos la semana pasada y quién las ejecutó. ¿Dónde lo buscas?
- [ ] En `system.billing.usage`.
- [x] En `system.query.history`.
- [ ] En `information_schema.tables`.
- [ ] En los logs del driver de cada clúster.
porque: `system.query.history` registra las sentencias ejecutadas con su duración, el usuario y el cómputo usado.

## Auditoría
leccion: cert-databricks-optimizacion-monitoreo
dominio: 5
Seguridad pregunta quién le dio `SELECT` sobre una tabla sensible a un grupo y cuándo. ¿Qué consultas?
- [ ] `DESCRIBE HISTORY` de la tabla.
- [x] `system.access.audit`, filtrando las acciones de cambio de permisos.
- [ ] `SHOW GRANTS` sobre la tabla, que lista cada permiso con su autor.
- [ ] `system.billing.usage`.
porque: `SHOW GRANTS` muestra los permisos actuales, no quién los otorgó. La tabla de auditoría registra cada acción con su autor y su fecha.

## Linaje en tablas de sistema
leccion: cert-databricks-optimizacion-monitoreo
dominio: 5
Antes de eliminar una columna, necesitas la lista de tablas y columnas que dependen de ella. ¿Qué tabla de sistema lo responde con SQL?
- [ ] `system.query.history`.
- [ ] `system.compute.clusters`.
- [x] `system.access.column_lineage`.
- [ ] `information_schema.columns`.
porque: Unity Catalog captura el linaje a nivel de tabla y de columna y lo expone en `system.access.table_lineage` y `system.access.column_lineage`.

## Métricas de un stream
leccion: cert-databricks-optimizacion-monitoreo
dominio: 5
En el progreso de un stream, `inputRowsPerSecond` es mayor que `processedRowsPerSecond` de forma sostenida. ¿Qué significa?
- [ ] El stream está ocioso.
- [x] Llegan datos más rápido de lo que se procesan: el atraso crece.
- [ ] La watermark es demasiado corta y descarta filas antes de contarlas.
- [ ] El checkpoint está dañado.
porque: Si la entrada supera a la capacidad de proceso, el stream se atrasa. Hay que agregar cómputo o hacer cada lote más liviano.

## Avisar cuando un stream se atrasa
leccion: cert-databricks-optimizacion-monitoreo
dominio: 5
Hay que enviar las métricas de cada micro-lote a un sistema externo de monitoreo sin modificar la lógica del stream. ¿Qué usas?
- [ ] Un `print` dentro de `foreachBatch`.
- [x] Un `StreamingQueryListener` que recibe el evento de progreso de cada lote.
- [ ] Un job aparte que lee cada minuto los archivos del checkpoint del stream.
- [ ] `DESCRIBE HISTORY` de la tabla destino.
porque: El listener recibe los eventos de inicio, progreso y fin de cada consulta de streaming y permite reenviarlos a donde haga falta.

## Monitoreo de calidad de una tabla
leccion: cert-databricks-optimizacion-monitoreo
dominio: 5
Quieres detectar solo que una tabla gold dejó de actualizarse o que su cantidad de filas cayó de forma anormal. ¿Qué usas?
- [ ] Una expectativa `FAIL UPDATE` sobre la cantidad de filas de cada actualización, con un umbral fijo calculado a mano una vez por trimestre.
- [x] El monitoreo de calidad de datos de Unity Catalog, que aprende la frecuencia y el volumen habituales y marca anomalías.
- [ ] `ANALYZE TABLE` todas las noches.
- [ ] Un `VACUUM` con retención corta.
porque: El monitoreo de calidad evalúa frescura y completitud a partir del historial de la tabla, sin que tengas que definir umbrales a mano.

## Notificaciones de un job
leccion: cert-databricks-lakeflow-jobs
dominio: 5
Un job suele tardar 20 minutos. Quieres un aviso si sigue corriendo a los 45, sin cancelarlo. ¿Qué configuras?
- [ ] Un tiempo límite (timeout) de 45 minutos.
- [x] Un umbral de duración esperada (warning) con una notificación.
- [ ] Reintentos automáticos con una espera de 45 minutos entre intentos.
- [ ] Un trigger continuo.
porque: El umbral de duración avisa cuando el job excede lo esperado y lo deja seguir. El timeout lo cancela.

## Registro de eventos del pipeline
leccion: cert-databricks-transformacion-pipelines
dominio: 5
¿Dónde consultas cuántas filas descartó cada expectativa en cada actualización de un pipeline declarativo?
- [ ] En `DESCRIBE HISTORY` de la tabla.
- [x] En el registro de eventos (event log) del pipeline.
- [ ] En `system.billing.usage`.
- [ ] En la Spark UI, pestaña SQL.
porque: El registro de eventos guarda las métricas de calidad de cada flujo, además del linaje y los eventos de cada actualización.

## Alerta de SQL
leccion: cert-databricks-optimizacion-monitoreo
dominio: 5
Una alerta de SQL compara una columna del resultado contra un umbral. ¿Qué fila del resultado evalúa?
- [ ] Todas las filas del resultado, y se dispara si al menos una de ellas cumple.
- [x] La primera fila del resultado (según la agregación elegida, si la hay).
- [ ] La última fila.
- [ ] Una fila al azar.
porque: La alerta toma un valor del resultado de la consulta. Por eso la consulta suele devolver una sola fila con el número que interesa.

## Liquid Clustering
leccion: cert-databricks-optimizacion-monitoreo
dominio: 6
Una tabla se filtra a veces por `cliente_id` y a veces por `fecha`, y los patrones cambian con el tiempo. ¿Qué diseño es el recomendado hoy?
- [ ] Particionar por `cliente_id` y `fecha`.
- [ ] Particionar por `fecha` y ejecutar `OPTIMIZE … ZORDER BY (cliente_id)` todas las noches, que sigue siendo lo recomendado.
- [x] `CLUSTER BY (cliente_id, fecha)` (Liquid Clustering), cuyas claves pueden cambiarse después.
- [ ] No hacer nada: Delta ordena los datos solo.
porque: Liquid Clustering reemplaza a particiones y Z-ORDER: agrupa de forma incremental y permite cambiar las claves sin reescribir toda la tabla.

## Clustering automático
leccion: cert-databricks-optimizacion-monitoreo
dominio: 6
No sabes por qué columnas se filtrará una tabla administrada nueva. ¿Qué opción deja la decisión en manos de Databricks?
- [ ] `PARTITIONED BY AUTO`.
- [x] `CLUSTER BY AUTO`, con Predictive Optimization activa.
- [ ] `OPTIMIZE … ZORDER BY AUTO`.
- [ ] La propiedad `delta.autoOptimize.autoCompact = true` en la tabla.
porque: Con clustering automático, Databricks observa las consultas y elige y ajusta las claves de clustering.

## Deletion vectors
leccion: cert-databricks-optimizacion-monitoreo
dominio: 6
Con deletion vectors activos, ¿qué hace un `DELETE` de pocas filas dentro de un archivo grande?
- [ ] Reescribe el archivo completo sin esas filas.
- [x] Marca las filas como borradas en un archivo aparte; el Parquet original se reescribe más adelante.
- [ ] Borra el archivo original de inmediato y mueve las filas restantes a un archivo nuevo más chico dentro de la misma transacción.
- [ ] Nada hasta el próximo `VACUUM`.
porque: Los deletion vectors evitan reescribir archivos en cada borrado o actualización; la limpieza física ocurre con `OPTIMIZE` o `REORG TABLE … APPLY (PURGE)`.

## Join por broadcast
leccion: cert-databricks-optimizacion-monitoreo
dominio: 6
Un join entre una tabla de hechos enorme y una dimensión de 5 MB hace un shuffle costoso. ¿Qué estrategia lo evita?
- [ ] Un sort-merge join con más particiones.
- [x] Un broadcast hash join: la dimensión se envía completa a cada executor.
- [ ] Un producto cartesiano con filtro.
- [ ] Repartir ambas tablas por la clave con `repartition` antes de unir.
porque: Si una de las tablas entra en memoria, difundirla evita mover la tabla grande por la red.

## AQE y particiones chicas
leccion: cert-databricks-optimizacion-monitoreo
dominio: 6
Tras un shuffle quedan miles de particiones de pocos KB. ¿Qué hace Adaptive Query Execution?
- [ ] Aumenta el número de particiones.
- [x] Las une en particiones de tamaño razonable durante la ejecución.
- [ ] Cancela la etapa y la reintenta con otro número de particiones.
- [ ] Convierte el join en un producto cartesiano.
porque: AQE ajusta el plan con las estadísticas reales: une particiones chicas, divide las sesgadas y puede cambiar la estrategia de join.

## Archivos chicos
leccion: cert-databricks-optimizacion-monitoreo
dominio: 6
Un stream escribe cada 10 segundos y la tabla tiene cientos de miles de archivos de pocos KB; las lecturas son lentas. ¿Qué ayuda sin cambiar el stream?
- [ ] `VACUUM` con retención de 0 horas.
- [x] Escrituras optimizadas y compactación automática, o un `OPTIMIZE` periódico (o Predictive Optimization).
- [ ] Particionar por minuto.
- [ ] Desactivar la recolección de estadísticas de la tabla, para que cada archivo se escriba más rápido y el lector no tenga que evaluarlas.
porque: Muchos archivos chicos encarecen el listado y la lectura. Compactarlos en archivos más grandes devuelve el rendimiento.

## Qué hace VACUUM
leccion: cert-databricks-optimizacion-monitoreo
dominio: 6
Tras un `VACUUM` con la retención por defecto (7 días), ¿qué deja de ser posible?
- [ ] Leer la versión actual de la tabla hasta que se ejecute `OPTIMIZE` para reconstruir los archivos.
- [x] Viajar en el tiempo a versiones cuyos archivos tenían más de 7 días sin uso.
- [ ] Ejecutar `DESCRIBE HISTORY`.
- [ ] Hacer `MERGE` sobre la tabla.
porque: `VACUUM` borra los archivos de datos que ninguna versión reciente usa. El historial sigue en el log, pero esas versiones ya no se pueden leer.

## Caché de disco
leccion: cert-databricks-optimizacion-monitoreo
dominio: 6
Varios analistas repiten consultas sobre los mismos archivos remotos. ¿Qué acelera las lecturas repetidas sin cambiar el código?
- [ ] `df.cache()` en cada notebook, que comparte el resultado entre todos los usuarios.
- [x] La caché de disco, que guarda copias locales de los archivos leídos en los nodos.
- [ ] Aumentar `spark.sql.shuffle.partitions`.
- [ ] `VACUUM` más frecuente.
porque: La caché de disco es automática y guarda los datos leídos en el almacenamiento local del nodo. `cache()` guarda un DataFrame en memoria y hay que administrarlo.

## Elegir el cómputo por costo
leccion: cert-databricks-plataforma-computo
dominio: 6
Un job nocturno corre 40 minutos sobre un clúster de uso general que queda encendido todo el día. ¿Qué cambio reduce más el costo?
- [ ] Agregar más workers al clúster de uso general para que el job termine antes y consuma menos.
- [x] Ejecutarlo en cómputo de jobs (o serverless), que se crea para el job y se apaga al terminar.
- [ ] Activar el modo de alta concurrencia.
- [ ] Guardar todo en caché.
porque: El cómputo de jobs tiene una tarifa menor que el de uso general y no queda encendido sin trabajo.

## Atribuir el gasto
leccion: cert-databricks-optimizacion-monitoreo
dominio: 6
Finanzas quiere el gasto por equipo. ¿Qué combinación lo permite?
- [ ] Un clúster distinto por equipo y repartir a mano la factura mensual del proveedor de nube según las horas encendidas.
- [x] Etiquetas (tags) en el cómputo y los jobs, y consultar `system.billing.usage` unida con `system.billing.list_prices`.
- [ ] `DESCRIBE DETAIL` de cada tabla.
- [ ] La Spark UI de cada job.
porque: El uso se registra con sus etiquetas en `system.billing.usage`; multiplicado por los precios de lista da el costo por equipo, job o proyecto.

## Skew en la Spark UI
leccion: cert-databricks-optimizacion-monitoreo
dominio: 6
En una etapa, 199 tareas terminan en segundos y una tarda 20 minutos y procesa muchos más datos. ¿Qué indica?
- [ ] Falta de memoria en el driver.
- [x] Sesgo (skew): una clave concentra la mayor parte de los datos.
- [ ] Demasiados archivos chicos en la tabla de origen, que obligan a una tarea a abrirlos.
- [ ] Un problema de permisos en una partición.
porque: Una tarea mucho más pesada que las demás es la señal típica de sesgo. AQE puede dividir esa partición; también ayuda tratar aparte la clave dominante.

## Estadísticas para data skipping
leccion: cert-databricks-optimizacion-monitoreo
dominio: 6
Una tabla tiene 80 columnas y se filtra por la columna 60, pero no se saltan archivos. ¿Por qué puede ser?
- [ ] Delta no admite filtros sobre columnas que estén más allá de la posición 32 del esquema, así que siempre lee todo.
- [x] Por defecto solo se recolectan estadísticas de las primeras 32 columnas; esa columna no tiene mínimos y máximos.
- [ ] Falta ejecutar `VACUUM`.
- [ ] El filtro debe escribirse con `LIKE`.
porque: El salto de archivos usa mínimos y máximos por archivo. Hay que incluir la columna en las estadísticas (o en el clustering, que las garantiza).

## Vista dinámica o máscara
leccion: cert-databricks-gobierno-seguridad
dominio: 7
Quieres que los usuarios consulten la tabla `clientes` con su nombre de siempre, pero que el email aparezca enmascarado salvo para el grupo `soporte`. ¿Qué usas?
- [ ] Una vista dinámica nueva con el email enmascarado, quitar el acceso a la tabla y pedir a todos que cambien sus consultas.
- [x] Una máscara de columna aplicada a `email` con una función que consulta `is_account_group_member('soporte')`.
- [ ] Un `CHECK` sobre la columna.
- [ ] Cifrar la columna con `aes_encrypt` al ingerir.
porque: La máscara se aplica sobre la propia tabla al leer, sin crear objetos nuevos. La vista dinámica obliga a cambiar el objeto que consultan los usuarios.

## Privilegios mínimos para leer
leccion: cert-databricks-gobierno-seguridad
dominio: 7
Un grupo tiene `SELECT` sobre `prod.ventas.pedidos` pero recibe un error de permisos al consultarla. ¿Qué le falta?
- [ ] `MODIFY` sobre la tabla.
- [x] `USE CATALOG` sobre `prod` y `USE SCHEMA` sobre `prod.ventas`.
- [ ] Ser propietario del esquema `prod.ventas` o del catálogo.
- [ ] `ALL PRIVILEGES` sobre el metastore.
porque: Para llegar a un objeto hacen falta los privilegios de uso sobre sus contenedores, además del privilegio sobre el objeto.

## Herencia de privilegios
leccion: cert-databricks-gobierno-seguridad
dominio: 7
Otorgas `SELECT` sobre el esquema `prod.ventas` a un grupo. Mañana se crea una tabla nueva en ese esquema. ¿El grupo puede leerla?
- [x] Sí: los privilegios otorgados en el esquema se heredan a los objetos actuales y futuros.
- [ ] No: hay que otorgar `SELECT` tabla por tabla.
- [ ] Solo si la tabla es administrada.
- [ ] Solo después de ejecutar `REFRESH` sobre el esquema, que vuelve a calcular los privilegios de las tablas que contiene.
porque: En Unity Catalog los privilegios se heredan hacia abajo: catálogo → esquema → tablas, incluidas las que se creen después.

## Credenciales de almacenamiento
leccion: cert-databricks-gobierno-seguridad
dominio: 7
Un equipo necesita crear tablas externas en una ruta de la nube. ¿Qué objetos de Unity Catalog lo habilitan de forma gobernada?
- [ ] Un secreto con la clave de la cuenta de almacenamiento y `spark.conf.set` al inicio de cada notebook.
- [x] Una credencial de almacenamiento y una ubicación externa sobre esa ruta, con `CREATE EXTERNAL TABLE` otorgado.
- [ ] Un montaje en DBFS.
- [ ] Un perfil de instancia asignado al clúster.
porque: La ubicación externa vincula una ruta con una credencial y permite dar permisos sobre ella sin repartir claves.

## Secretos en notebooks
leccion: cert-databricks-gobierno-seguridad
dominio: 7
Un notebook hace `print(dbutils.secrets.get("ventas", "clave_api"))`. ¿Qué se ve en la salida?
- [ ] La clave completa.
- [x] `[REDACTED]`: los valores de secretos se ocultan en la salida de los notebooks.
- [ ] Un error de permisos, porque los secretos no se pueden leer desde un notebook.
- [ ] El nombre del scope.
porque: Databricks oculta los valores de secretos en las salidas. No es una protección total, así que igual hay que limitar quién puede leer el scope.

## Borrado definitivo de datos personales
leccion: cert-databricks-gobierno-seguridad
dominio: 7
Tras un `DELETE` de los datos de un cliente en una tabla con deletion vectors, ¿qué falta para que no queden físicamente en el almacenamiento?
- [ ] Nada: `DELETE` los borra del disco.
- [x] `REORG TABLE … APPLY (PURGE)` para reescribir los archivos y luego `VACUUM` pasado el período de retención.
- [ ] `OPTIMIZE` solamente, que compacta los archivos y elimina del almacenamiento todo lo que ya no pertenece a la versión actual.
- [ ] `RESTORE` a la versión anterior.
porque: El `DELETE` crea una versión nueva; los archivos viejos siguen ahí para el viaje en el tiempo hasta que se reescriben y `VACUUM` los elimina.

## Política ABAC
leccion: cert-databricks-gobierno-seguridad
dominio: 7
Hay 300 tablas con columnas de datos personales y todas deben enmascararse igual. ¿Qué escala mejor?
- [ ] Un script que ejecute `ALTER TABLE … ALTER COLUMN … SET MASK` en cada columna de cada tabla y se vuelva a correr cada semana.
- [x] Etiquetas gobernadas en las columnas y una política ABAC en el catálogo que enmascare todo lo que tenga esa etiqueta.
- [ ] Una vista dinámica por tabla.
- [ ] Un job que sobrescriba las columnas con asteriscos.
porque: ABAC aplica la regla a todo lo que cumpla la condición de etiquetas, incluidas las tablas nuevas, sin configurar cada una.

## Identidad de un job en producción
leccion: cert-databricks-gobierno-seguridad
dominio: 7
Un job de producción corre con el usuario de la persona que lo creó. Esa persona deja la empresa y el job empieza a fallar. ¿Qué debió usarse?
- [ ] El usuario del administrador del workspace.
- [x] Un service principal como identidad de ejecución (Run as).
- [ ] Un token personal de larga duración del creador, guardado en un secreto.
- [ ] El grupo `users`.
porque: Un service principal es una identidad que no depende de una persona. Los permisos se le otorgan a él y el job no se rompe con los cambios de personal.

## Administrada o externa
leccion: cert-databricks-gobierno-seguridad
dominio: 8
Ejecutas `DROP TABLE` sobre una tabla externa de Unity Catalog. ¿Qué pasa con los archivos de datos?
- [ ] Se borran de inmediato.
- [ ] Se borran a los 7 días.
- [x] Quedan en su ubicación: solo se elimina el registro de la tabla en el metastore.
- [ ] Se mueven a la papelera del workspace, de donde se recuperan con `UNDROP`.
porque: En una tabla externa los archivos son tuyos y el `DROP` no los toca. En una administrada, Unity Catalog los elimina tras el período de retención.

## Recuperar una tabla borrada
leccion: cert-databricks-gobierno-seguridad
dominio: 8
Alguien borró por error una tabla administrada hace dos días. ¿Cómo la recuperas?
- [ ] Con `RESTORE TABLE … TO VERSION AS OF`.
- [x] Con `UNDROP TABLE`, dentro del período de retención (7 días por defecto).
- [ ] No se puede recuperar: hay que volver a crearla y recargar los datos desde bronze.
- [ ] Con `VACUUM … DRY RUN`.
porque: `UNDROP` recupera una tabla administrada borrada recientemente. `RESTORE` vuelve una tabla existente a una versión anterior.

## Niveles del espacio de nombres
leccion: cert-databricks-gobierno-seguridad
dominio: 8
Una empresa quiere aislar por completo los datos de desarrollo y de producción, incluso en almacenamiento distinto. ¿En qué nivel de Unity Catalog conviene separarlos?
- [ ] En esquemas distintos del mismo catálogo.
- [x] En catálogos distintos, cada uno con su ubicación de almacenamiento administrado, y enlazados a los workspaces que corresponda.
- [ ] En dos metastores distintos creados dentro de la misma región, uno para cada entorno, cada uno con sus propios workspaces.
- [ ] Con prefijos en los nombres de las tablas.
porque: El catálogo es la unidad natural de aislamiento: puede tener su propio almacenamiento y limitarse a ciertos workspaces. Por región hay un solo metastore.

## Propietario y privilegio MANAGE
leccion: cert-databricks-gobierno-seguridad
dominio: 8
Un equipo debe poder otorgar permisos sobre un esquema sin ser su propietario. ¿Qué privilegio le das?
- [ ] `ALL PRIVILEGES`.
- [x] `MANAGE` sobre el esquema.
- [ ] `USE SCHEMA`.
- [ ] `CREATE TABLE`.
porque: `MANAGE` permite administrar los permisos del objeto sin transferir la propiedad. `ALL PRIVILEGES` no incluye otorgar permisos a otros.

## Documentar para descubrir
leccion: cert-databricks-gobierno-seguridad
dominio: 8
Los analistas no encuentran las tablas correctas ni entienden sus columnas. ¿Qué mejora más el descubrimiento (y las respuestas de Genie)?
- [ ] Nombres de tabla más cortos.
- [x] Comentarios en tablas y columnas, etiquetas y claves primarias y foráneas declaradas.
- [ ] Mover todas las tablas al esquema `default`.
- [ ] Dar `ALL PRIVILEGES` a todos los analistas para que exploren los datos sin restricciones.
porque: Los comentarios, las etiquetas y las relaciones declaradas son los metadatos que usan la búsqueda, el linaje y los asistentes para entender qué es cada dato.

## Alcance del linaje
leccion: cert-databricks-gobierno-seguridad
dominio: 8
¿Qué captura automáticamente el linaje de Unity Catalog?
- [ ] Solo las consultas de los SQL warehouses.
- [x] Las relaciones entre tablas y columnas generadas por consultas, notebooks, jobs y pipelines que corren con Unity Catalog, en cualquier lenguaje.
- [ ] Solo los pipelines declarativos.
- [ ] Solo las relaciones que cada equipo documenta a mano en Catalog Explorer, más las consultas ejecutadas en los SQL warehouses durante el último día.
porque: El linaje se obtiene en tiempo de ejecución, sin configuración, para las cargas que leen y escriben a través de Unity Catalog.

## Objetivos de un bundle
leccion: cert-databricks-cicd-bundles
dominio: 9
En un `databricks.yml`, el target `dev` tiene `mode: development`. ¿Qué efecto tiene al desplegar?
- [ ] Despliega con el service principal de producción.
- [x] Agrega un prefijo con tu usuario a los recursos, pausa los horarios y facilita iterar sin pisar el trabajo de otros.
- [ ] Impide ejecutar los jobs.
- [ ] Borra todos los recursos desplegados cuando termina cada ejecución, para no dejar nada en el workspace.
porque: El modo desarrollo aísla los despliegues de cada persona (prefijo, horarios en pausa). `mode: production` valida lo contrario: rutas compartidas e identidad de servicio.

## Validar antes de desplegar
leccion: cert-databricks-cicd-bundles
dominio: 9
En el pipeline de CI quieres detectar errores de configuración del bundle antes de tocar el workspace. ¿Qué comando ejecutas primero?
- [ ] `databricks bundle run`.
- [x] `databricks bundle validate`.
- [ ] `databricks bundle destroy`.
- [ ] `databricks jobs create`.
porque: `validate` revisa la sintaxis y la coherencia de la configuración sin crear ni modificar recursos.

## Autenticación en CI/CD
leccion: cert-databricks-cicd-bundles
dominio: 9
GitHub Actions debe desplegar un bundle a producción. ¿Qué forma de autenticación es la recomendada?
- [ ] El token personal de un ingeniero del equipo, guardado como secreto del repositorio y renovado cada año.
- [x] Un service principal con OAuth (o federación de identidad de la carga, sin secretos de larga duración).
- [ ] Usuario y contraseña del administrador.
- [ ] Ninguna: el workspace confía en GitHub por defecto.
porque: El despliegue automatizado debe usar una identidad de servicio con credenciales de corta duración, no las de una persona.

## Código que se puede probar
leccion: cert-databricks-cicd-bundles
dominio: 9
Las transformaciones están escritas dentro de celdas de notebook que también leen y escriben tablas. ¿Qué cambio las vuelve fáciles de probar con pytest?
- [ ] Agregar `assert` al final de cada celda.
- [x] Moverlas a funciones en archivos `.py` que reciben y devuelven DataFrames, y dejar la lectura y la escritura en el notebook.
- [ ] Ejecutar el notebook entero contra las tablas de producción en cada commit y comparar la cantidad de filas con la del día anterior.
- [ ] Convertir todo a SQL.
porque: Una función pura sobre DataFrames se prueba con datos pequeños creados en la prueba, sin tablas ni cómputo de producción.

## Reparar una ejecución
leccion: cert-databricks-lakeflow-jobs
dominio: 9
Un job de 8 tareas falla en la sexta por un error transitorio. ¿Cómo lo retomas sin repetir las cinco que terminaron bien?
- [ ] Con `Run now`, que detecta lo ya hecho.
- [x] Con `Repair run`, que vuelve a ejecutar las tareas fallidas y las que dependen de ellas.
- [ ] Clonando el job, borrando las cinco primeras tareas y ejecutando la copia.
- [ ] Reiniciando el clúster.
porque: La reparación reutiliza los resultados de las tareas exitosas y ejecuta solo lo que falló o quedó sin correr.

## Pasar valores entre tareas
leccion: cert-databricks-lakeflow-jobs
dominio: 9
La tarea `validar` calcula la cantidad de filas y la tarea `publicar` debe decidir según ese número. ¿Cómo se lo pasa?
- [ ] Con una variable global de Python.
- [x] `validar` usa `dbutils.jobs.taskValues.set` y `publicar` lo lee con `{{tasks.validar.values.filas}}` o `taskValues.get`.
- [ ] Escribiendo en el log del driver.
- [ ] No es posible: las tareas de un job corren aisladas y lo único que comparten es el resultado final de éxito o fallo.
porque: Los valores de tarea son el mecanismo para comunicar resultados chicos entre tareas, y sirven también para una tarea de condición.

## Fallo por memoria en el driver
leccion: cert-databricks-nivel-professional
dominio: 9
Un job falla con error de memoria en el driver justo después de un `df.collect()` sobre 200 millones de filas. ¿Cuál es la corrección?
- [ ] Agregar más workers.
- [x] No traer los datos al driver: escribir el resultado en una tabla o reducirlo con agregaciones o `limit` antes.
- [ ] Aumentar `spark.sql.shuffle.partitions` para que cada partición que llega al driver sea más chica.
- [ ] Activar Photon.
porque: `collect()` copia todo el resultado a la memoria del driver. Los workers no ayudan: el cuello de botella es el driver.

## Leer la Spark UI
leccion: cert-databricks-nivel-professional
dominio: 9
En la Spark UI, una etapa muestra valores altos de "Spill (Disk)". ¿Qué significa y qué pruebas primero?
- [ ] Hay archivos dañados; ejecutar `FSCK REPAIR`.
- [x] Las particiones no entran en memoria y se vuelcan a disco; probar más particiones de shuffle, corregir el sesgo o usar nodos con más memoria.
- [ ] El driver se quedó sin espacio en disco; hay que borrar el checkpoint y los archivos temporales y volver a ejecutar el job desde cero.
- [ ] El clúster tiene demasiados workers.
porque: El spill ocurre cuando una tarea necesita más memoria de la que tiene. Particiones más chicas o más memoria por tarea lo reducen.

## Databricks Connect
leccion: cert-databricks-cicd-bundles
dominio: 9
¿Para qué sirve Databricks Connect en el flujo de desarrollo?
- [ ] Para conectar Power BI con un SQL warehouse.
- [x] Para escribir y depurar código Spark en tu IDE local mientras la ejecución ocurre en cómputo de Databricks.
- [ ] Para replicar tablas y permisos entre dos workspaces de regiones distintas sin copiar archivos.
- [ ] Para programar jobs desde la terminal.
porque: Databricks Connect envía el plan de las operaciones de DataFrame al cómputo remoto, así pruebas con datos reales y depuras con las herramientas del IDE.

## Clave primaria en Unity Catalog
leccion: cert-databricks-nivel-professional
dominio: 10
Declaras `PRIMARY KEY (cliente_id)` en una tabla de Unity Catalog. Después insertas dos filas con el mismo `cliente_id`. ¿Qué ocurre?
- [ ] La segunda inserción falla.
- [x] Ambas se insertan: las claves primarias y foráneas son informativas, no se hacen cumplir.
- [ ] La segunda fila reemplaza a la primera.
- [ ] La tabla queda bloqueada para escritura hasta que se corrija el duplicado.
porque: `PRIMARY KEY` y `FOREIGN KEY` documentan el modelo y ayudan al optimizador y a las herramientas, pero no validan los datos. `NOT NULL` y `CHECK` sí se hacen cumplir.

## Clave sustituta
leccion: cert-databricks-nivel-professional
dominio: 10
Una dimensión necesita una clave numérica propia generada por la tabla. ¿Qué usas?
- [ ] `monotonically_increasing_id()` en cada carga.
- [x] Una columna `BIGINT GENERATED ALWAYS AS IDENTITY`.
- [ ] `uuid()` convertido a entero.
- [ ] `row_number()` sobre toda la tabla en cada ejecución.
porque: Las columnas de identidad generan valores únicos y crecientes administrados por la tabla (no necesariamente consecutivos).

## Hechos y dimensiones
leccion: cert-databricks-nivel-professional
dominio: 10
En un modelo en estrella de ventas, ¿qué va en la tabla de hechos?
- [ ] El nombre y la dirección de cada cliente.
- [x] Las medidas numéricas (cantidad, importe) y las claves hacia las dimensiones, con un grano definido.
- [ ] La jerarquía de categorías, subcategorías y marcas de cada producto, con sus descripciones.
- [ ] El calendario con feriados.
porque: La tabla de hechos registra los eventos medibles al nivel de detalle elegido; los atributos descriptivos viven en las dimensiones.

## SCD tipo 1 frente a tipo 2
leccion: cert-databricks-nivel-professional
dominio: 10
Finanzas necesita que las ventas de 2023 sigan asociadas a la región que tenía el vendedor en ese momento, aunque después se haya mudado. ¿Qué tipo de dimensión hace falta?
- [ ] SCD tipo 1: sobrescribir la región del vendedor con cada cambio.
- [x] SCD tipo 2: una fila nueva por cada cambio, con su período de vigencia.
- [ ] Una dimensión degenerada.
- [ ] Ninguna: alcanza con el valor actual.
porque: El tipo 2 conserva el historial; el tipo 1 lo pierde porque pisa el valor anterior.

## Capas medallion
leccion: cert-databricks-nivel-professional
dominio: 10
¿Qué describe mejor la capa silver?
- [ ] Los datos tal como llegaron de la fuente, sin ningún cambio, para poder reprocesarlos cuando haga falta.
- [x] Datos limpios, con tipos correctos, deduplicados y conformados, listos para combinar entre fuentes.
- [ ] Agregados de negocio listos para tableros.
- [ ] Copias de respaldo de gold.
porque: Bronze guarda lo crudo, silver lo limpia y lo conforma, y gold lo modela para el consumo.

## Clonar para pruebas
leccion: cert-databricks-nivel-professional
dominio: 10
Necesitas probar una migración sobre una copia de una tabla de 5 TB, rápido y sin duplicar el almacenamiento. ¿Qué usas?
- [ ] `CREATE TABLE … AS SELECT *`.
- [ ] `DEEP CLONE`.
- [x] `SHALLOW CLONE`, que copia solo los metadatos y referencia los archivos del origen.
- [ ] Un `INSERT OVERWRITE` en otra tabla con el mismo esquema, que reutiliza los archivos.
porque: El clon superficial no copia datos: es inmediato y barato. Los cambios que hagas en él se escriben en archivos propios y no afectan al origen.

## @caso logistica: Envíos del Sur
Envíos del Sur recibe eventos de seguimiento de paquetes como archivos JSON en un contenedor de almacenamiento: unos 3 millones de archivos chicos por día, con campos que cambian según el transportista. Los datos de clientes viven en un PostgreSQL operativo.

Situación actual:
- La ingesta lista el contenedor completo en cada ejecución y cada día tarda más.
- Algunos transportistas agregan campos nuevos sin avisar y el job se rompe.
- La tabla `silver.eventos` se filtra por `paquete_id` o por `fecha`, según el equipo, y las consultas son lentas.
- Un cliente pidió que se borren todos sus datos personales, y legal exige poder demostrar que ya no existen.

## Ingesta que escala
leccion: cert-databricks-ingesta
dominio: 2
caso: logistica
¿Qué cambio resuelve que la ingesta tarde cada día más?
- [ ] Ejecutar el job con más workers.
- [x] Auto Loader con eventos de archivos, que descubre los archivos nuevos sin listar todo el contenedor.
- [ ] Un `COPY INTO` por cada carpeta de transportista, ejecutados en paralelo cada cinco minutos.
- [ ] Leer con `spark.read.json` y filtrar por nombre de archivo.
porque: El costo crece porque se lista todo el contenedor. Con notificaciones, Auto Loader solo se entera de lo que llega y recuerda lo ya procesado.

## Campos que cambian
leccion: cert-databricks-ingesta
dominio: 3
caso: logistica
Los campos varían por transportista y aparecen nuevos sin aviso. ¿Qué diseño de bronze es más robusto?
- [ ] Un esquema fijo con todas las columnas conocidas hoy, descartar las filas que traigan otras y avisar al transportista para que corrija el formato.
- [x] Guardar el evento en una columna `VARIANT` (o permitir la evolución de esquema con datos rescatados) y tipar en silver lo que se usa.
- [ ] Una tabla por transportista creada a mano.
- [ ] Convertir cada archivo a CSV antes de ingerir.
porque: Bronze debe aceptar lo que llegue sin romperse. `VARIANT` conserva la forma original y deja la interpretación para la capa siguiente.

## Consultas lentas en silver
leccion: cert-databricks-optimizacion-monitoreo
dominio: 6
caso: logistica
¿Cómo organizas `silver.eventos` para los dos patrones de filtro?
- [ ] Particionando por `paquete_id`.
- [x] Con `CLUSTER BY (paquete_id, fecha)`.
- [ ] Con un índice secundario sobre `fecha`.
- [ ] Duplicando la tabla, una ordenada por cada columna.
porque: Particionar por una columna de altísima cardinalidad crea millones de particiones. Liquid Clustering agrupa por varias claves y sirve a ambos filtros.

## Demostrar el borrado
leccion: cert-databricks-gobierno-seguridad
dominio: 7
caso: logistica
Tras borrar las filas del cliente con `DELETE`, ¿qué completa el borrado físico en las tablas Delta?
- [ ] Nada más: el `DELETE` es suficiente.
- [x] Reescribir los archivos afectados (`REORG TABLE … APPLY (PURGE)` si hay deletion vectors) y ejecutar `VACUUM` cuando pase la retención; también en bronze y en las tablas derivadas.
- [ ] Ejecutar `OPTIMIZE` una vez sobre cada tabla afectada y guardar el resultado del comando como evidencia para el área legal, sin tocar bronze.
- [ ] Borrar el checkpoint del stream.
porque: Las versiones anteriores siguen conteniendo los datos hasta que sus archivos se eliminan. El borrado debe propagarse a todas las capas donde estén.
