---
titulo: DEA-C01 - Administración del almacén de datos
nivel: Avanzado
duracion: 70
resumen: El dominio 2 del DEA-C01 (26 %) - elegir el almacén correcto (S3, Redshift, DynamoDB, RDS/Aurora, OpenSearch, vectores), clases de almacenamiento y ciclo de vida de S3, formatos y particionado, Apache Iceberg y S3 Tables, el Glue Data Catalog y los crawlers, el diseño de tablas en Redshift (distribución, ordenamiento, Spectrum, RA3, Serverless), el modelado en DynamoDB y los índices vectoriales HNSW e IVF.
objetivos: Elegir el almacén de datos según el patrón de acceso | Configurar clases y reglas de ciclo de vida de S3 | Diseñar tablas de Redshift con estilos de distribución y claves de ordenamiento | Explicar las ventajas de Iceberg y S3 Tables | Modelar claves de partición y ordenamiento en DynamoDB | Elegir entre índices vectoriales HNSW e IVF
prerrequisitos: cert-aws-dea-ingesta-transformacion | aws-s3-data-lake | aws-redshift-emr
autoevaluacion: ¿Sabes qué clase de S3 usar para datos que se leen una vez por trimestre? | ¿Sabes cuándo usar DISTSTYLE ALL? | ¿Sabes qué resuelve Iceberg frente a tablas Hive? | ¿Sabes cómo registrar particiones nuevas sin un crawler? | ¿Sabes qué índice vectorial da mejor recall?
---

:::escenario
El lago de Tomás ya recibe datos, pero los costos de S3 crecen 20 % por mes, las consultas a Redshift sobre envíos tardan minutos y la app de seguimiento necesita leer el estado de un envío en milisegundos. Además, el equipo de IA pide guardar embeddings de manuales para un asistente. Todo es el dominio 2: dónde y cómo se guardan los datos.
:::

## Elegir el almacén

| Patrón | Servicio |
|---|---|
| Lago de datos barato, cualquier formato, analítica con varios motores | **Amazon S3** (con Iceberg o S3 Tables) |
| Data warehouse SQL, agregaciones sobre grandes volúmenes, BI | **Amazon Redshift** |
| Clave-valor con latencia de milisegundos a cualquier escala | **Amazon DynamoDB** |
| Transaccional relacional (OLTP) | **Amazon RDS / Aurora** |
| Búsqueda de texto, logs, búsqueda vectorial | **Amazon OpenSearch Service** |
| Vectores baratos a gran escala sobre S3 | **Amazon S3 Vectors** |
| Grafos (relaciones, fraude) | **Amazon Neptune** |
| Series de tiempo | **Amazon Timestream** |
| Caché en memoria | **Amazon ElastiCache / MemoryDB** |

```recorrido
titulo: Elegir el almacén según la pregunta que tiene que responder
estacion s3: Lago | icono=base
estacion rs: Data warehouse | icono=dashboard
estacion ddb: Clave-valor | icono=api
estacion rds: Transaccional | icono=servidor
estacion regla: La regla | icono=check
paso s3: "Guardar todo, barato, en cualquier formato"
Archivos crudos y procesados, de cualquier tamaño, consultables con Athena, Glue o EMR → **S3**.
>>> texto
patrón: lago de datos (bronze, silver, gold en Parquet/Iceberg)
servicio: Amazon S3
paso rs: "Tableros con muchas consultas SQL complejas, en segundos"
Agregaciones sobre muchas filas y muchos usuarios concurrentes → **Redshift** (Serverless si la carga es irregular).
>>> texto
patrón: OLAP, columnar
servicio: Amazon Redshift
paso ddb: "Leer un ítem por su clave en milisegundos, a cualquier escala"
Accesos por clave conocida, sin joins, con latencia de un dígito de milisegundos → **DynamoDB**. Diseñas la clave según las consultas.
>>> texto
patrón: clave-valor / documentos
servicio: Amazon DynamoDB
paso rds: "La aplicación registra pedidos con transacciones"
Muchas escrituras chicas, con integridad referencial y transacciones → **RDS / Aurora** (OLTP).
>>> texto
patrón: OLTP relacional
servicio: Amazon RDS / Aurora
paso regla: La regla de examen
Busca en el enunciado **cómo se lee** el dato (por clave, por agregación, por archivo) y **con qué latencia**. Eso decide el almacén, no el volumen solo.
>>> tabla
cómo se lee,servicio
archivos y SQL esporádico,S3 + Athena
agregaciones y BI,Redshift
un ítem por clave,DynamoDB
transacciones de la app,RDS / Aurora
```

## Amazon S3 a fondo

### Clases de almacenamiento

| Clase | Uso típico | Detalle |
|---|---|---|
| **S3 Standard** | Datos de acceso frecuente | Sin costo de recuperación |
| **S3 Intelligent-Tiering** | Patrón de acceso **desconocido o cambiante** | Mueve objetos entre niveles automáticamente; pequeño cargo de monitoreo |
| **S3 Standard-IA** | Acceso infrecuente, recuperación inmediata | Mínimo 30 días; cobro por GB recuperado |
| **S3 One Zone-IA** | Infrecuente y recreable | Una sola zona de disponibilidad |
| **S3 Glacier Instant Retrieval** | Acceso trimestral, recuperación en milisegundos | Mínimo 90 días |
| **S3 Glacier Flexible Retrieval** | Archivo, minutos a horas | Mínimo 90 días |
| **S3 Glacier Deep Archive** | Retención legal de años | Hasta 12–48 horas; mínimo 180 días; la más barata |
| **S3 Express One Zone** | Latencia de un dígito de milisegundos para cargas intensivas (ML, consultas) | Buckets de directorio en una zona |

**Reglas de ciclo de vida**: transicionan objetos por antigüedad (por ejemplo, a Standard-IA a los 30 días y a Deep Archive a los 365) y los **expiran**; también borran versiones antiguas y cargas multiparte incompletas. **Versionado** protege de borrados; **Object Lock** (modo cumplimiento) impide borrar o modificar durante el período de retención (WORM).

```json norun
{
  "Rules": [{
    "ID": "bronze-a-archivo",
    "Filter": {"Prefix": "bronze/"},
    "Status": "Enabled",
    "Transitions": [
      {"Days": 30, "StorageClass": "STANDARD_IA"},
      {"Days": 365, "StorageClass": "DEEP_ARCHIVE"}
    ],
    "NoncurrentVersionExpiration": {"NoncurrentDays": 30},
    "AbortIncompleteMultipartUpload": {"DaysAfterInitiation": 7}
  }]
}
```

### Formatos y particionado

- **Parquet u ORC** (columnares y comprimidos) reducen lo escaneado por Athena, Redshift Spectrum y Glue: menos costo y más velocidad que CSV o JSON.
- **Particionar** por las columnas de filtro (fecha, región) con el esquema `s3://lago/ventas/anio=2026/mes=10/`. No sobreparticionar: millones de particiones con archivos chicos empeoran todo.
- **Archivos chicos**: compactar a archivos de 128 MB–1 GB.
- **Compresión**: Snappy (rápida), GZIP (más compacta, no divisible en texto), ZSTD.

### Apache Iceberg y S3 Tables

**Iceberg** es un formato de tabla abierto que agrega a los archivos de S3:

- Transacciones **ACID**, `MERGE`, `UPDATE` y `DELETE` desde Athena, Glue, EMR, Redshift y Firehose.
- **Evolución de esquema** y de particiones sin reescribir datos.
- **Particionado oculto**: el usuario filtra por `fecha` y Iceberg aplica la partición `day(fecha)`.
- **Viaje en el tiempo** y snapshots.

**Amazon S3 Tables** son *table buckets* que guardan tablas Iceberg **administradas**: AWS ejecuta automáticamente la compactación, la expiración de snapshots y el borrado de archivos huérfanos, con más rendimiento de consulta que Iceberg autogestionado. Se integran con el catálogo de AWS Glue y Lake Formation.

```sql norun
-- Athena: tabla Iceberg y upsert
CREATE TABLE silver.envios (
  envio_id string, estado string, actualizado timestamp
)
PARTITIONED BY (day(actualizado))
LOCATION 's3://lago/silver/envios/'
TBLPROPERTIES ('table_type' = 'ICEBERG');

MERGE INTO silver.envios t
USING bronze.envios_cambios s ON t.envio_id = s.envio_id
WHEN MATCHED THEN UPDATE SET estado = s.estado, actualizado = s.actualizado
WHEN NOT MATCHED THEN INSERT VALUES (s.envio_id, s.estado, s.actualizado);

OPTIMIZE silver.envios REWRITE DATA USING BIN_PACK;   -- compactar
```

## El catálogo de datos

- **AWS Glue Data Catalog**: metastore compatible con Hive con bases, tablas, esquemas y particiones, compartido por Athena, Redshift Spectrum, EMR y Glue.
- **Crawlers**: recorren S3 o JDBC, infieren el esquema y crean o actualizan tablas y particiones. Se programan o se disparan por evento.
- Alternativas al crawler para particiones nuevas: `MSCK REPAIR TABLE`, `ALTER TABLE ADD PARTITION`, la API `BatchCreatePartition` o **partition projection** en Athena (calcula las particiones desde la configuración, sin catálogo, ideal para muchas particiones).
- **Glue Schema Registry**: versiona esquemas Avro, JSON o Protobuf para streams.
- **Amazon SageMaker Catalog** (construido sobre Amazon DataZone): catálogo de **negocio** para descubrir, publicar y suscribirse a datos con glosario y aprobaciones, dentro de **SageMaker Unified Studio**.

## Amazon Redshift

### Arquitectura

- **RA3** con **Redshift Managed Storage**: cómputo y almacenamiento escalan por separado.
- **Redshift Serverless**: se paga por **RPU**-hora, sin clúster; ideal para cargas variables.
- **Concurrency scaling**: agrega capacidad temporal en picos de consultas.
- **Data sharing**: compartir datos en vivo entre clústeres o cuentas sin copiar.
- **Redshift Spectrum**: consulta tablas externas en S3 (catálogo de Glue) y las une con tablas locales.
- **Federated query**: consulta RDS/Aurora PostgreSQL y MySQL en vivo.
- **Vistas materializadas** con refresco automático, también sobre streams (**streaming ingestion** desde Kinesis o MSK).

### Diseño de tablas

| Estilo de distribución | Cuándo |
|---|---|
| **AUTO** (por defecto) | Redshift decide según el tamaño |
| **KEY** | Tablas grandes que se unen por la misma columna: las filas con igual clave van al mismo nodo y el join no mueve datos |
| **ALL** | Dimensiones **chicas** que se unen con todo: copia completa en cada nodo |
| **EVEN** | Sin joins claros: reparto en round robin |

- **Sort keys**: las columnas por las que se filtra o rangea (normalmente la fecha). Permiten saltar bloques (*zone maps*). Las compuestas sirven si el filtro usa el prefijo.
- **Compresión** (`ENCODE AUTO`, AZ64 para numéricos y fechas, ZSTD para texto).
- Carga con **`COPY`** desde S3 en paralelo (varios archivos, divisibles), nunca con miles de `INSERT`. `UNLOAD` exporta a S3 en Parquet.
- `VACUUM` reordena y libera espacio; `ANALYZE` actualiza estadísticas (ambos automáticos por defecto).

```sql norun
CREATE TABLE envios (
  envio_id    BIGINT,
  cliente_id  INT,
  fecha       DATE,
  monto       DECIMAL(12,2)
)
DISTSTYLE KEY DISTKEY (cliente_id)
SORTKEY (fecha);

COPY envios
FROM 's3://lago/silver/envios/'
IAM_ROLE 'arn:aws:iam::123456789012:role/redshift-copy'
FORMAT AS PARQUET;
```

## Amazon DynamoDB

- Tabla con **clave de partición** (y opcional **clave de ordenamiento**). Toda consulta eficiente usa la clave: `Query` por partición; `Scan` lee todo (caro).
- **GSI** (índice secundario global): otra clave de partición y ordenamiento, se crea cuando sea. **LSI**: misma partición, otro ordenamiento, solo al crear la tabla.
- Capacidad **on-demand** o **aprovisionada** con auto scaling. Claves de baja cardinalidad crean particiones calientes.
- **TTL** borra ítems vencidos sin costo; **DynamoDB Streams** emite los cambios (para Lambda o CDC); **PITR** restaura a cualquier segundo de los últimos 35 días; **DAX** es un caché de microsegundos.
- **Export to S3** (sin consumir capacidad) y **zero-ETL** a Redshift u OpenSearch para analítica.

## Vectores (nuevo en v1.1)

Los **embeddings** se guardan en un almacén vectorial y se buscan por similitud.

| Índice | Cómo funciona | Cuándo |
|---|---|---|
| **HNSW** | Grafo jerárquico de vecinos navegables | **Mejor recall y baja latencia**; usa más memoria; inserciones incrementales sin reentrenar |
| **IVF** | Agrupa los vectores en *clusters* y busca en los más cercanos | **Menos memoria**, conjuntos muy grandes; requiere entrenar los centroides; recall algo menor |

Opciones en AWS: **OpenSearch Service/Serverless** (motores FAISS o Lucene, HNSW o IVF, cuantización para ahorrar memoria), **Aurora PostgreSQL con pgvector**, **Amazon S3 Vectors** (más barato, latencia de subsegundo, para grandes volúmenes poco consultados) y **MemoryDB** (latencia mínima). **Bedrock Knowledge Bases** divide los documentos en fragmentos (*chunking*), genera los embeddings y los guarda en uno de esos almacenes automáticamente.

:::examen Palabras clave
- "Patrón de acceso desconocido" → **Intelligent-Tiering**.
- "Retener 7 años, recuperar raramente, lo más barato" → **Glacier Deep Archive**.
- "Dimensión chica unida con todas las tablas de hechos" → **DISTSTYLE ALL**.
- "Miles de particiones nuevas por día en Athena" → **partition projection**.
- "Upserts y borrados en el lago" → **Iceberg** (o S3 Tables para que AWS lo mantenga).
:::

## Ejercicios

:::ejercicio quiz
Los logs de auditoría deben conservarse 7 años por regulación, casi nunca se leen y una recuperación de 48 horas es aceptable. ¿Qué es lo más barato?
- [ ] S3 Standard-IA con versionado.
- [x] S3 Glacier Deep Archive, con una regla de ciclo de vida que lo mueva allí.
- [ ] S3 Intelligent-Tiering.
- [ ] S3 One Zone-IA.
```explicacion
Deep Archive es la clase más barata para retención larga con recuperación de horas. Una regla de ciclo de vida hace la transición automáticamente.
```
:::

:::ejercicio quiz
En Redshift, la tabla de hechos `envios` (miles de millones de filas) se une siempre con `clientes` (40 millones de filas) por `cliente_id`. ¿Qué distribución minimiza el movimiento de datos?
- [ ] DISTSTYLE ALL en las dos tablas.
- [x] DISTSTYLE KEY con DISTKEY `cliente_id` en las dos tablas.
- [ ] DISTSTYLE EVEN en las dos tablas.
- [ ] SORTKEY `cliente_id` sin cambiar la distribución.
```explicacion
Con la misma clave de distribución, las filas que se unen quedan en el mismo nodo. ALL no conviene para una tabla de 40 millones de filas.
```
:::

:::ejercicio quiz
Athena tarda en planificar consultas sobre una tabla con cientos de miles de particiones por fecha y hora, y el crawler no llega a registrar las nuevas. ¿Qué lo resuelve con menos mantenimiento?
- [ ] Ejecutar `MSCK REPAIR TABLE` cada cinco minutos.
- [x] Configurar partition projection en la tabla.
- [ ] Quitar las particiones y leer todo.
- [ ] Duplicar la frecuencia del crawler.
```explicacion
Partition projection calcula las particiones desde la configuración de la tabla: no hay que registrarlas y la planificación es más rápida.
```
:::

:::ejercicio quiz
El equipo quiere tablas Iceberg en S3 pero no quiere programar compactación ni expiración de snapshots. ¿Qué usa?
- [ ] Tablas Hive en Parquet con un crawler diario.
- [x] Amazon S3 Tables.
- [ ] S3 Express One Zone.
- [ ] Redshift Spectrum.
```explicacion
S3 Tables administra el mantenimiento de las tablas Iceberg (compactación, snapshots, archivos huérfanos) automáticamente.
```
:::

:::ejercicio quiz
Un índice vectorial debe dar el mejor recall con baja latencia y recibir documentos nuevos continuamente; la memoria no es un problema. ¿Qué tipo eliges?
- [x] HNSW.
- [ ] IVF.
- [ ] Un índice B-tree.
- [ ] Un índice de texto invertido.
```explicacion
HNSW da el mejor equilibrio entre recall y latencia y admite inserciones sin reentrenar; IVF ahorra memoria a cambio de recall.
```
:::

:::ejercicio abierto
Diseña la tabla de DynamoDB para la app de seguimiento de Tomás: hay que obtener el estado actual de un envío por su id y el historial de eventos de un envío ordenado por fecha, y los eventos de más de 90 días deben borrarse solos.
```text solucion
Tabla "envios": clave de partición envio_id, clave de ordenamiento sk.
- Estado actual: ítem con sk = "ESTADO" (GetItem por envio_id + "ESTADO").
- Historial: ítems con sk = "EVT#<timestamp ISO>"; Query por envio_id con begins_with(sk, "EVT#"), orden por sk (ScanIndexForward=false para el más reciente primero).
- Atributo expira (epoch) en los eventos y TTL habilitado sobre ese atributo para borrarlos a los 90 días.
- Si se necesita buscar por cliente: GSI con partición cliente_id y ordenamiento fecha.
- Capacidad on-demand si el tráfico es variable; DynamoDB Streams para enviar los cambios al lago.
```
:::
