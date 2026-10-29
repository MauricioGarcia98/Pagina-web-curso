# examen: cert-databricks
# id: dbx-de-professional
# titulo: Databricks Data Engineer Professional

## Estado sin watermark
leccion: cert-databricks-nivel-professional
Un stream cuenta eventos por usuario en ventanas de 1 hora. Después de una semana, el job falla por falta de memoria aunque el volumen diario es estable. ¿Cuál es la causa más probable?
- [ ] El checkpoint está en un volumen lento y se acumulan escrituras pendientes en memoria.
- [x] Falta una watermark, así que el estado de todas las ventanas pasadas nunca se libera.
- [ ] El trigger es demasiado frecuente y cada micro-lote guarda una copia completa del estado.
- [ ] El modo de salida `append` guarda todas las filas emitidas en el driver hasta el final.
porque: Sin watermark, Spark conserva el estado de cada ventana para siempre por si llega un evento atrasado; el estado crece sin límite.

## MERGE desde stream
leccion: cert-databricks-nivel-professional
Los cambios de clientes llegan por streaming y hay que aplicarlos con upsert a `silver.clientes`. Cada micro-lote puede traer varias versiones del mismo cliente. ¿Qué implementación es correcta?
- [ ] `writeStream` con `outputMode("update")` hacia la tabla, que aplica un upsert por clave primaria.
- [x] `foreachBatch` que deduplica el lote por cliente y luego ejecuta un `MERGE`.
- [ ] `foreachBatch` con un `MERGE` directo del lote, porque Delta resuelve solo los duplicados.
- [ ] Un stream con `dropDuplicates()` sin watermark y escritura en modo `append`.
porque: El `MERGE` falla si varias filas del origen coinciden con la misma fila del destino, así que hay que deduplicar cada lote antes.

## Escritura idempotente
leccion: cert-databricks-nivel-professional
Dentro de `foreachBatch`, un job hace append a dos tablas distintas. Si el job falla y el lote se reintenta, no deben duplicarse filas. ¿Qué usas?
- [ ] Cambiar el trigger a `availableNow`, que nunca reprocesa un lote ya iniciado.
- [x] Las opciones `txnAppId` y `txnVersion` (con el `batch_id`) en cada escritura.
- [ ] `outputMode("complete")`, que reemplaza las tablas en cada lote y evita los duplicados.
- [ ] Un `VACUUM` al inicio de cada lote para limpiar escrituras parciales anteriores.
porque: Con `txnAppId` y `txnVersion`, Delta detecta que esa aplicación ya escribió ese lote y descarta la repetición.

## Change Data Feed
leccion: cert-databricks-nivel-professional
Gold debe actualizarse con los cambios de `silver.pedidos` (inserts, updates y deletes) sin releer la tabla entera. ¿Qué habilitas y lees?
- [ ] Liquid Clustering en silver y una lectura batch filtrada por la última fecha de carga.
- [x] Change Data Feed en silver, leído con `readChangeFeed`.
- [ ] Un índice Delta Sync sobre silver, que expone las filas modificadas en cada sincronización.
- [ ] Deletion vectors en silver, que guardan una lista de filas cambiadas para lectores externos.
porque: Change Data Feed registra cada fila insertada, actualizada (pre y post imagen) y borrada, y se puede leer en batch o como stream.

## Constraints
leccion: cert-databricks-nivel-professional
¿Cuál de estas restricciones **se fuerza** al escribir en una tabla Delta de Databricks?
- [ ] `PRIMARY KEY`, que rechaza filas con una clave repetida.
- [ ] `FOREIGN KEY`, que rechaza filas sin su fila en la tabla padre.
- [x] `CHECK (monto >= 0)`
- [ ] `UNIQUE`, que rechaza valores repetidos en la columna.
porque: `NOT NULL` y `CHECK` se fuerzan. Las claves primarias y foráneas son informativas.

## Funciones de IA
leccion: cert-databricks-nivel-professional
Hay que clasificar 4 millones de reseñas en categorías fijas usando un LLM, dentro de un pipeline SQL. ¿Qué es lo más adecuado?
- [ ] Un notebook con un bucle de Python que llama al endpoint de a una reseña.
- [x] `ai_classify` o `ai_query` aplicados a la tabla en SQL.
- [ ] Una Python UDF fila a fila que llama a la API del proveedor del modelo.
- [ ] Un agente desplegado en Model Serving que reciba las reseñas de a una.
porque: Las funciones de IA en SQL procesan tablas completas en paralelo y se integran en pipelines; los bucles fila a fila son lentos y caros.

## UDF correcta
leccion: cert-databricks-nivel-professional
Una regla de negocio para calcular el impuesto se puede expresar con `CASE` y operaciones aritméticas, y la usan varios equipos desde SQL. ¿Cómo la implementas?
- [ ] Una Python UDF fila a fila, registrada en cada notebook que la necesita usar.
- [x] Función SQL en Unity Catalog con `CREATE FUNCTION ... RETURN`.
- [ ] Una pandas UDF dentro de un paquete instalado en todos los clústeres de la empresa.
- [ ] Una vista por equipo que repite la expresión `CASE` con sus propios nombres de columnas.
porque: La función SQL de Unity Catalog es gobernada, reutilizable y se expande dentro del plan, con mejor rendimiento que una UDF de Python.

## Leer de otros motores
leccion: cert-databricks-nivel-professional
Un equipo de análisis usa Snowflake y necesita leer las tablas Delta administradas por Unity Catalog sin copiarlas. ¿Qué habilitas?
- [ ] Un job que exporte las tablas a CSV en un bucket compartido cada noche.
- [x] UniForm, para que las tablas se lean como Iceberg desde el catálogo de Unity Catalog.
- [ ] Deletion vectors, que hacen las tablas compatibles con cualquier motor externo.
- [ ] Lakehouse Federation desde Databricks hacia Snowflake.
porque: UniForm genera metadatos Iceberg, y otros motores leen las tablas a través del catálogo REST de Iceberg de Unity Catalog.

## Particionado excesivo
leccion: cert-databricks-optimizacion-monitoreo
Una tabla particionada por `cliente_id` (3 millones de valores) tiene consultas lentas y millones de archivos chicos. ¿Qué haces?
- [ ] Agregar `fecha` como segunda columna de partición para repartir mejor los archivos.
- [x] Recrear la tabla sin particiones, con Liquid Clustering por `cliente_id`.
- [ ] Ejecutar `VACUUM` con retención de 0 horas para eliminar los archivos chicos.
- [ ] Aumentar el tamaño del SQL warehouse para leer más archivos en paralelo.
porque: Particionar por una columna de alta cardinalidad crea demasiadas particiones y archivos. Liquid Clustering agrupa los datos sin ese problema.

## Predictive Optimization
leccion: cert-databricks-optimizacion-monitoreo
La plataforma tiene 2.000 tablas administradas de Unity Catalog y nadie programa `OPTIMIZE` ni `VACUUM`. ¿Qué activas?
- [ ] Un job nocturno que recorre todas las tablas y ejecuta `OPTIMIZE` y `VACUUM`.
- [x] Predictive Optimization en el catálogo o la cuenta.
- [ ] Auto compactación en cada clúster que escribe en esas tablas.
- [ ] Liquid Clustering automático, que también ejecuta `VACUUM`.
porque: Predictive Optimization ejecuta OPTIMIZE, VACUUM y ANALYZE en tablas administradas cuando conviene, sin programarlo.

## Spill
leccion: cert-databricks-optimizacion-monitoreo
En la Spark UI, todas las tasks de un stage de agregación tienen spill a disco de varios GB, con tiempos parejos. ¿Qué ajuste es el más adecuado?
- [ ] Activar AQE skew join, que divide las particiones más grandes de ese stage del shuffle.
- [x] Más particiones de shuffle, o máquinas con más memoria por núcleo.
- [ ] Hacer `collect()` antes de la agregación, para que el driver resuelva el cálculo final.
- [ ] Desactivar Photon, que usa bastante más memoria que el motor estándar de Spark.
porque: Spill parejo en todas las tasks indica particiones demasiado grandes para la memoria disponible (no skew): más particiones o más memoria.

## Consultas caras
leccion: cert-databricks-optimizacion-monitoreo
¿Cómo encuentras las consultas de un SQL warehouse que más bytes leyeron en el último mes?
- [ ] En `system.billing.usage`, filtrando por `warehouse_id`.
- [x] En `system.query.history`, ordenando por `read_bytes`.
- [ ] En `system.access.audit`, filtrando por las consultas SQL.
- [ ] En el event log del warehouse, en la pestaña de monitoreo.
porque: `system.query.history` guarda cada consulta con su duración, bytes leídos, usuario y warehouse.

## Alerta de frescura
leccion: cert-databricks-optimizacion-monitoreo
El equipo quiere enterarse si `gold.ventas` no se actualizó en las últimas 6 horas, aunque el job no haya fallado. ¿Qué configuras?
- [ ] Una notificación de falla en el job que actualiza la tabla.
- [x] Una alerta de SQL o el monitoreo de calidad de datos con detección de frescura.
- [ ] Un reintento infinito en el job hasta que la tabla se actualice.
- [ ] Una expectativa `FAIL UPDATE` en la tabla gold.
porque: Un job puede terminar bien sin escribir datos nuevos. Las alertas de frescura miran la tabla, no el estado del job.

## Política ABAC
leccion: cert-databricks-gobierno-seguridad
Hay columnas con datos personales en cientos de tablas y se crean tablas nuevas cada semana. ¿Cómo garantizas que se enmascaren siempre?
- [ ] Revisando cada semana las tablas nuevas y aplicando una column mask a mano a cada una.
- [x] Etiquetas gobernadas en las columnas y una política ABAC de máscara en el catálogo.
- [ ] Una vista dinámica por cada tabla nueva, creada por un job que detecta tablas nuevas.
- [ ] Quitando `SELECT` a todos los usuarios y dando acceso solo a tablas revisadas por legal.
porque: La política ABAC se define una vez y aplica a toda columna con la etiqueta, incluidas las de tablas futuras.

## Derecho al olvido
leccion: cert-databricks-gobierno-seguridad
Un cliente pidió que se borren sus datos. La tabla tiene deletion vectors activados. Ejecutaste `DELETE`. ¿Qué falta para que los datos desaparezcan físicamente?
- [ ] Nada, porque los deletion vectors borran las filas de los archivos al instante.
- [x] Reescribir los archivos afectados (`REORG TABLE ... APPLY (PURGE)`) y luego `VACUUM`.
- [ ] Un `RESTORE` a la versión anterior al `DELETE` para limpiar el historial de la tabla.
- [ ] Desactivar Change Data Feed, que guarda una copia de cada fila borrada.
porque: Con deletion vectors las filas solo se marcan como borradas; hay que purgarlas reescribiendo los archivos y después eliminar los archivos viejos con VACUUM.

## Compartir parcialmente
leccion: cert-databricks-gobierno-seguridad
Un socio solo debe ver las filas de Lima de una tabla de ventas compartida por Delta Sharing. ¿Qué haces?
- [ ] Le das acceso a toda la tabla y le pides que filtre por Lima.
- [x] Agregas la tabla al share con una partición (`PARTITION (ciudad = 'Lima')`) o compartes una vista filtrada.
- [ ] Creas un row filter que evalúa el nombre del recipient con `current_user()`.
- [ ] Usas Lakehouse Federation para que el socio consulte solo Lima.
porque: Delta Sharing permite compartir particiones específicas o vistas, así el socio solo recibe lo que corresponde.

## Monitorear streams
leccion: cert-databricks-nivel-professional
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
¿Cómo se prueba de forma unitaria una función que limpia un DataFrame de pedidos?
- [ ] Ejecutando el job en producción y revisando a la mañana siguiente si el resultado se ve bien.
- [x] Con `pytest`, DataFrames chicos de entrada y salida esperada, y `assertDataFrameEqual`.
- [ ] Con una expectativa `FAIL UPDATE` en la tabla de pedidos limpios del pipeline de producción.
- [ ] Revisando el linaje de la tabla en el Catalog Explorer después de cada despliegue.
porque: Las pruebas unitarias verifican la lógica con datos mínimos y conocidos, en CI, sin depender de producción.

## Ingesta con CDC
leccion: cert-databricks-ingesta
Hay que replicar en Databricks una base SQL Server con todos sus cambios, incluidos borrados, con latencia de minutos y sin escribir el código de CDC. ¿Qué usas?
- [ ] `spark.read.jdbc` programado cada 5 minutos con filtro por fecha de modificación.
- [x] Un conector gestionado de Lakeflow Connect para SQL Server, con su gateway de ingesta.
- [ ] Lakehouse Federation, porque las consultas siempre ven los datos actuales.
- [ ] Auto Loader sobre los archivos de backup diarios de la base.
porque: El conector gestionado lee el log de cambios mediante el gateway y aplica inserts, updates y deletes de forma incremental.
