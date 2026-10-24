# area: Arquitectura

## Data warehouse
alias: dwh, almacén de datos, warehouse
nino: Es un **supermercado muy ordenado**: todo llega limpio, con etiqueta, en su góndola, y encuentras lo que buscas al instante. Pero solo acepta productos ya empaquetados.
que: Una base de datos **analítica** (OLAP) que integra datos de muchas fuentes, limpios y modelados (hechos y dimensiones), optimizada para consultas grandes: almacenamiento columnar, procesamiento paralelo y SQL. Ejemplos: Snowflake, BigQuery, Redshift, Synapse, Databricks SQL. Se escribe con esquema definido (*schema-on-write*).
ejemplo: `gold.fct_ventas` y `gold.dim_cliente` en Snowflake, consultadas por el tablero de finanzas.
para: Una única fuente de verdad para reportes, BI y análisis.
cuidado: Guardar datos crudos, semiestructurados o enormes en el warehouse puede salir caro: para eso está el lago.
ver: Data lake, Lakehouse, OLAP, Star schema

## Data lake
alias: lago de datos, lago
nino: Es un **gran galpón donde se guarda todo tal como llega**: cajas, bolsas, papeles, fotos. Es barato y entra de todo, pero si no lo ordenas, se convierte en un basural donde nadie encuentra nada.
que: Almacenamiento central de datos en **archivos** (CSV, JSON, Parquet, imágenes, logs) sobre object storage (S3, ADLS, GCS), barato y escalable. Se guarda primero y se interpreta al leer (*schema-on-read*). Lo leen Spark, Athena, Trino, Databricks. Suele organizarse en zonas o capas (raw/bronze, silver, gold).
ejemplo: `s3://empresa-lago/bronze/app/pedidos/fecha=2024-12-01/…json`.
para: Guardar todo (también histórico y no estructurado) a bajo costo, para analítica y ML.
cuidado: Sin catálogo, formato de tabla ni gobierno, se vuelve un *data swamp* (pantano).
ver: Object storage, Lakehouse, Arquitectura medallón, Catálogo de datos

## Lakehouse
alias: lake house
nino: Es **el galpón barato del lago, pero con las góndolas ordenadas del supermercado**: guardas todo en el mismo lugar barato y además encuentras cada cosa rápido y en orden.
que: Arquitectura que combina el almacenamiento barato y abierto del **data lake** con las capacidades del **warehouse** (transacciones ACID, esquemas, rendimiento SQL, gobierno), gracias a **formatos de tabla abiertos** (Delta, Iceberg, Hudi) y motores que los leen. Un solo lugar para BI, ingeniería y ML.
ejemplo: Tablas Delta en ADLS, gobernadas con Unity Catalog, transformadas con Spark y consultadas con SQL Warehouse por Power BI.
para: Evitar copiar datos entre lago y warehouse y tener una sola plataforma.
ver: Data lake, Data warehouse, Formato de tabla abierto, Delta Lake

## Arquitectura medallón
alias: medallón, medallion, Bronze / Silver / Gold, bronze/silver/gold, bronce plata oro
nino: Es como **lavar la ropa en tres pasos**: primero juntas toda la ropa sucia en un canasto (bronce), después la lavas y la doblas (plata), y al final armas los conjuntos listos para usar (oro).
que: Organización del lakehouse en capas de calidad creciente. **Bronze**: datos crudos tal como llegan, con metadatos de carga (append-only, reprocesables). **Silver**: limpios, tipados, deduplicados, conformados y unidos a nivel de entidad. **Gold**: agregados y modelos de negocio (hechos, dimensiones, marts, features) listos para consumir.
ejemplo: `bronze.pedidos_raw` (JSON tal cual) → `silver.pedidos` (tipos correctos, sin duplicados, estados normalizados) → `gold.ventas_diarias_ciudad`.
para: Trazabilidad, poder reprocesar desde lo crudo y separar responsabilidades.
cuidado: No es obligatorio tener exactamente tres capas: lo importante es que cada capa tenga un contrato claro.
ver: Lakehouse, Staging, Mart, Linaje

## Formato de tabla abierto
alias: open table format, table format
nino: Los archivos del lago son como **hojas sueltas**. Un formato de tabla es **la carpeta con índice** que dice qué hojas forman la tabla hoy, qué cambió y quién la está editando.
que: Una especificación que agrega una **capa de metadatos** sobre archivos Parquet para que se comporten como tablas de base de datos: transacciones ACID, actualizaciones y borrados, evolución de esquema, time travel y particionamiento oculto. Los principales: **Delta Lake**, **Apache Iceberg** y **Apache Hudi**. Son abiertos: varios motores leen las mismas tablas.
ejemplo: La misma tabla Iceberg en S3 la escribe Spark y la leen Athena, Snowflake y Trino.
para: Lakehouse sin quedar atado a un único proveedor.
ver: Delta Lake, Iceberg, Lakehouse

## Iceberg
alias: apache iceberg
nino: Es otro tipo de **carpeta con índice** para las hojas del lago, que muchísimos programas distintos saben leer.
que: Formato de tabla abierto (creado en Netflix) con metadatos en árbol (*metadata* → *manifest lists* → *manifests* → archivos), **particionamiento oculto** (filtras por fecha y él sabe qué archivos leer), evolución de esquema y de particiones, time travel y catálogos REST. Lo soportan Spark, Trino, Flink, Athena, Snowflake, BigQuery y Databricks.
ejemplo: `CREATE TABLE lago.pedidos (…) USING iceberg PARTITIONED BY (days(creado_en));` — las consultas `WHERE creado_en >= …` podan solas.
para: Tablas abiertas que comparten muchos motores.
ver: Formato de tabla abierto, Delta Lake

## Ingesta
alias: ingestion, carga, extracción
nino: Es **traer los ingredientes del mercado a la cocina**: sin ingredientes no hay comida. Hay que ir a buscarlos a cada mercado (bases, APIs, archivos) y traerlos sin que se rompan.
que: Mover datos desde las **fuentes** (bases de datos operacionales, APIs SaaS, archivos, eventos) hacia la plataforma de datos (lago o warehouse). Patrones: **completa** (todo cada vez), **incremental** (por fecha de actualización), **CDC** (leer el log de cambios de la base) y **streaming** (eventos continuos). Herramientas: Fivetran, Airbyte, Data Factory, Glue, Auto Loader, Debezium, Kafka Connect, scripts propios.
ejemplo: Cada hora, traer de PostgreSQL las filas de `pedidos` con `actualizado_en > última marca` y guardarlas en `bronze/pedidos/`.
para: Es el primer paso de todo pipeline.
cuidado: Guarda siempre lo crudo y la hora de carga: permite reprocesar y auditar.
ver: CDC, Incremental, ETL, Auto Loader

## CDC
alias: change data capture, captura de cambios
nino: En vez de **fotocopiar la libreta entera** cada día para ver qué cambió, alguien te pasa **una lista de cambios**: "Ana se mudó", "llegó Pedro", "se fue Luis".
que: *Change Data Capture*: capturar los **cambios** (inserts, updates, deletes) de una base de datos, idealmente leyendo su **log de transacciones** (WAL de Postgres, binlog de MySQL) con herramientas como Debezium, DMS o Datastream, y enviarlos como eventos. Del lado destino se aplican con MERGE.
ejemplo: `{"op":"u","before":{"id":7,"estado":"pagado"},"after":{"id":7,"estado":"entregado"},"ts_ms":1733097600000}`
para: Réplicas casi en tiempo real, sin cargar la base de origen con consultas completas y capturando también los borrados.
ver: Ingesta, MERGE, Kafka, Streaming

## Kafka
alias: apache kafka, topic, tópico, broker
nino: Kafka es un **cuaderno gigante compartido donde se anotan las cosas que pasan, una debajo de la otra, y nunca se borran enseguida**. Muchos pueden leerlo a la vez, cada uno a su ritmo, y cada uno sabe por qué renglón va.
que: Plataforma distribuida de **eventos**: los productores escriben mensajes en **tópicos**, divididos en **particiones** ordenadas y replicadas en brokers; los **consumidores** (en grupos) leen guardando su posición (*offset*). Los mensajes se retienen días o para siempre. Ecosistema: Kafka Connect, Schema Registry, ksqlDB. Gestionados: Confluent, MSK, Event Hubs (compatible).
ejemplo: El tópico `pedidos` recibe cada evento de la app; Spark Structured Streaming lo lee para métricas en vivo y un conector lo guarda en S3.
para: Ingesta de eventos en tiempo real y desacoplar sistemas.
cuidado: El orden solo está garantizado dentro de una partición: usa como clave el ID de la entidad (por ejemplo `pedido_id`).
ver: Streaming, CDC, Structured Streaming

## Ventana de tiempo
alias: window, tumbling, sliding, ventana deslizante
nino: Es **contar cuántos autos pasan cada 5 minutos**: cuentas en una cajita de 5 minutos, la cierras y empiezas otra.
que: En streaming, agrupar eventos por intervalos de tiempo: **tumbling** (fijas y sin solaparse: 10:00–10:05, 10:05–10:10), **sliding/hopping** (se solapan: 10 minutos que avanzan cada 5) y **session** (se cierra tras un período de inactividad). Se combinan con marcas de agua para eventos tardíos.
ejemplo: `df.groupBy(F.window("ts", "10 minutes", "5 minutes"), "ciudad").count()` — ventana deslizante.
para: Métricas en tiempo real: pedidos por minuto, usuarios activos por hora.
cuidado: Usa el tiempo **del evento** (cuándo ocurrió), no el de llegada.
ver: Watermark, Structured Streaming, Sesionización

## Lambda / Kappa
alias: arquitectura lambda, arquitectura kappa
nino: **Lambda** es tener dos cocineros: uno rápido que hace todo al instante (aunque a veces se equivoca) y uno lento que lo rehace bien de noche. **Kappa** es tener un solo cocinero rápido que también sabe rehacer lo viejo cuando hace falta.
que: **Lambda**: una capa batch (exacta, reprocesa todo) + una capa de velocidad (streaming, aproximada) + una capa de servicio que combina ambas; problema: dos códigos para la misma lógica. **Kappa**: solo streaming; para reprocesar, se vuelve a leer el log de eventos (Kafka) desde el principio. Hoy, los motores unificados (Spark, Flink, Beam) y los formatos de tabla hacen que se use un mismo código para batch y streaming.
ejemplo: Kappa: métricas de pedidos con Flink desde Kafka; ante un cambio de regla, se lanza otra versión del job desde el offset 0.
para: Elegir cómo combinar latencia y exactitud.
ver: Batch, Streaming, Kafka

## Data mesh
alias: malla de datos
nino: En lugar de que **una sola cocina central** cocine para toda la ciudad (y tenga una fila enorme), **cada barrio tiene su cocina** que prepara sus platos con las mismas reglas de higiene para todos.
que: Enfoque organizacional en el que **cada dominio de negocio** (ventas, logística, pagos) es dueño de sus datos y los publica como **productos de datos** (con dueño, documentación, contrato y SLA), sobre una **plataforma de autoservicio** común y con **gobierno federado** (reglas comunes). Responde a los cuellos de botella de un equipo de datos central.
ejemplo: El equipo de pagos publica `pagos.transacciones_v1` con contrato y pruebas; marketing lo consume sin pedirle nada al equipo central.
para: Escalar en organizaciones grandes con muchos dominios.
cuidado: Es un cambio de organización más que de tecnología; en empresas chicas suele ser excesivo.
ver: Data contract, Gobierno de datos

## Data contract
alias: contrato de datos
nino: Es un **acuerdo firmado entre el que hace la torta y el que la va a vender**: "la torta será de chocolate, de 1 kg, llegará a las 8". Si el pastelero quiere cambiar algo, avisa antes.
que: Un acuerdo explícito y versionado entre productor y consumidor de datos: esquema (columnas, tipos, obligatoriedad), semántica, reglas de calidad, frescura y SLA, dueño, y política de cambios. Se escribe como código (YAML, por ejemplo Open Data Contract Standard) y se valida automáticamente en CI y en el pipeline.
ejemplo:
```yaml
dataset: pagos.transacciones_v1
owner: equipo-pagos
schema:
  - {name: transaccion_id, type: string, required: true, unique: true}
  - {name: monto, type: decimal(12,2), required: true}
freshness: {max_delay: 2h}
```
para: Que un cambio en la app no rompa en silencio los tableros de otros.
ver: Schema, Calidad de datos, SLA, Data mesh

## Capa semántica
alias: semantic layer, métricas, metrics layer
nino: Es un **diccionario oficial de la empresa**: dice exactamente qué significa "venta" o "cliente activo", para que todos calculen lo mismo y no haya tres números distintos en tres reuniones.
que: Una capa que define **métricas y dimensiones de negocio** una sola vez (fórmula, filtros, granularidades) y las sirve a todas las herramientas (BI, notebooks, APIs). Ejemplos: dbt Semantic Layer (MetricFlow), LookML, Cube, métricas de Power BI o Databricks.
ejemplo: `ingresos_netos = sum(total) - sum(reembolsos)` con filtro `estado = 'entregado'`, consultable por fecha, ciudad y canal desde cualquier herramienta.
para: Una sola definición de cada KPI.
ver: KPI, Mart

## Reverse ETL
alias: etl inverso, activación de datos
nino: Normalmente los datos van **de las tiendas al almacén**. Reverse ETL es **llevar del almacén de vuelta a las tiendas** algo útil que se calculó ahí: "este cliente está por irse, ofrécele un descuento".
que: Sincronizar datos modelados del warehouse hacia **herramientas operativas** (CRM, marketing, soporte, publicidad): Hightouch, Census, o scripts propios.
ejemplo: Cada noche, el puntaje de riesgo de churn de `gold.clientes` se envía a Salesforce para que el equipo comercial llame a los de riesgo alto.
para: Que el análisis se use en el día a día del negocio.
ver: ETL, Churn

## Linaje
alias: lineage, data lineage, trazabilidad
nino: Es el **árbol genealógico de un dato**: muestra de quién es hijo (de qué tablas salió), quiénes son sus abuelos, y qué nietos tiene (qué tableros lo usan).
que: El registro de **de dónde viene y a dónde va** cada dato: qué tablas y columnas alimentan a cuáles, a través de qué transformaciones y hasta qué tableros. Lo generan dbt (`dbt docs`), Unity Catalog, OpenLineage/Marquez, DataHub, Purview.
ejemplo: El tablero "Ventas diarias" depende de `gold.fct_ventas`, que viene de `silver.pedidos` y `silver.pagos`, que vienen de `bronze` y de la base de la app.
para: Saber qué se rompe si cambias algo (análisis de impacto), encontrar la causa de un dato malo y cumplir auditorías.
ver: Catálogo de datos, dbt, Unity Catalog, Gobierno de datos

## Catálogo de datos
alias: data catalog, metastore, catálogo
nino: Es el **fichero de la biblioteca**: no tiene los libros, pero te dice qué libros hay, de qué trata cada uno, dónde está y quién lo cuida.
que: Inventario de los activos de datos con sus **metadatos**: técnicos (esquema, ubicación, particiones, formato) y de negocio (descripción, dueño, glosario, sensibilidad, uso, linaje). Técnicos: Hive Metastore, Glue Catalog, Unity Catalog, Iceberg REST. Empresariales: DataHub, OpenMetadata, Purview, Collibra, Dataplex.
ejemplo: Buscas "clientes" en el catálogo y encuentras `gold.dim_cliente`, su dueño (equipo CRM), la descripción de cada columna y que `email` es PII.
para: Encontrar, entender y confiar en los datos.
ver: Metadatos, Linaje, Gobierno de datos

## Calidad de datos
alias: data quality, dq, validación de datos
nino: Es **revisar que las manzanas no estén podridas antes de hacer la torta**: que haya la cantidad correcta, que estén frescas y que sean de verdad manzanas.
que: Qué tan aptos son los datos para su uso, medido en dimensiones: **completitud** (sin faltantes), **unicidad** (sin duplicados), **validez** (formatos y rangos), **consistencia** (entre tablas), **exactitud** (refleja la realidad) y **frescura** (actualizados a tiempo). Se controla con pruebas automáticas en el pipeline: dbt tests, Great Expectations, Soda, expectativas de DLT.
ejemplo: Reglas: `pedido_id` único y no nulo, `total >= 0`, `estado` dentro de una lista, cada `cliente_id` existe en `dim_cliente`, los datos de ayer llegaron antes de las 06:00.
para: Que las decisiones se basen en datos confiables.
ver: Pruebas de dbt, Data contract, Observabilidad

## Gobierno de datos
alias: data governance, gobernanza
nino: Son **las reglas de la casa** sobre los datos: quién puede usar qué, quién es responsable de cada cosa, cómo se cuida lo privado y cuánto tiempo se guarda.
que: El conjunto de políticas, roles y procesos sobre los datos: propiedad (*owners*, *stewards*), clasificación y protección de datos sensibles, control de acceso, calidad, retención y borrado, linaje, cumplimiento legal (GDPR, leyes locales de protección de datos). Se apoya en herramientas como Unity Catalog, Lake Formation, Purview o Dataplex.
ejemplo: Política: las columnas marcadas como PII solo las ven roles autorizados; el resto ve un valor enmascarado; los datos de clientes dados de baja se borran a los 5 años.
para: Usar los datos con seguridad, legalidad y confianza.
ver: PII, Linaje, Catálogo de datos, Permisos mínimos

## PII
alias: datos personales, información personal identificable, datos sensibles
nino: Son los **datos que dicen quién eres**: tu nombre, tu documento, tu dirección, tu teléfono. Son como tu diario privado: no se le muestran a cualquiera.
que: *Personally Identifiable Information*: datos que identifican a una persona directamente (nombre, documento, email, teléfono) o al combinarlos (fecha de nacimiento + código postal). Protegidos por ley: hay que minimizarlos, restringir el acceso, enmascararlos, seudonimizarlos (hash con sal), cifrarlos y poder borrarlos a pedido.
ejemplo:
```sql
SELECT sha2(concat(email, '<sal secreta>'), 256) AS email_hash, ciudad, total
FROM silver.pedidos;   -- el análisis no necesita el email real
```
para: Cumplir la ley y respetar a los usuarios.
cuidado: Los datos personales suelen colarse en logs, CSV de prueba y notebooks compartidos: revísalos.
ver: Gobierno de datos, Unity Catalog, Lake Formation

## SLA
alias: service level agreement, acuerdo de nivel de servicio, SLO
nino: Es una **promesa con hora**: "el diario llega a tu puerta antes de las 7 de la mañana". Si llega a las 9, se rompió la promesa.
que: Compromiso medible sobre un servicio de datos: **frescura** (datos de ayer disponibles a las 06:00), **disponibilidad**, **calidad** y tiempo de respuesta ante incidentes. Los **SLO** son los objetivos internos y los **SLI** las métricas que los miden.
ejemplo: SLA: "el mart de ventas tiene los datos del día anterior a las 07:00 hora local, el 99 % de los días". Una alerta salta a las 06:30 si todavía no terminó.
para: Que los consumidores sepan qué esperar y el equipo sepa qué priorizar.
ver: Observabilidad, Data contract, Latencia

## Observabilidad
alias: observability, monitoreo, data observability
nino: Es tener **cámaras y alarmas en toda la fábrica**: si una máquina se traba, o salen menos cajas que lo normal, suena una alarma antes de que se enoje el cliente.
que: La capacidad de saber **qué está pasando** en los pipelines y los datos: **logs**, **métricas** (duración, filas procesadas, costo), **trazas** y monitoreo de datos (volumen, frescura, distribución, esquema, nulos) con alertas. Herramientas: Datadog, Grafana/Prometheus, CloudWatch, Azure Monitor, Monte Carlo, Elementary.
ejemplo: Alerta: "`silver.pedidos` recibió 1.200 filas hoy (promedio de los últimos 28 días: 48.000)": se rompió la ingesta aunque el pipeline terminó en verde.
para: Detectar problemas antes que los usuarios.
ver: Calidad de datos, SLA, Linaje
