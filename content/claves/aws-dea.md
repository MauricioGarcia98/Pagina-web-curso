# Tarjetas: AWS DEA-C01

## "Menor esfuerzo operativo"
Servicio **administrado o serverless** que resuelve sin código propio (Glue antes que EMR, Firehose antes que un consumidor propio).

## Eventos a S3 en Parquet, sin consumidores, con 1–2 min de retraso
dominio: 1
**Amazon Data Firehose** con conversión de formato y particionado dinámico.

## Orden por clave, varios consumidores y releer datos
dominio: 1
**Kinesis Data Streams** (clave de partición de alta cardinalidad).

## `ProvisionedThroughputExceededException` con poco tráfico total
dominio: 1
**Shard caliente**: clave de partición de mayor cardinalidad (o on-demand).

## Muchos consumidores de un stream con límites de lectura
dominio: 1
**Enhanced fan-out**.

## Base on-premises a S3 con cambios y borrados
dominio: 1
**AWS DMS** con carga completa + **CDC**.

## Salesforce o SaaS a S3 sin código
dominio: 1
**Amazon AppFlow**.

## Aurora o DynamoDB a Redshift sin pipelines
dominio: 1
Integración **zero-ETL**.

## Job de Glue que reprocesa todo
dominio: 1
**Job bookmarks** (`transformation_ctx` + `job.commit()`).

## Patrones en tiempo real con ventanas por clave
dominio: 1
**Managed Service for Apache Flink**.

## Map sobre millones de objetos con reintentos
dominio: 1
**Step Functions** con Map **distribuido**.

## DAGs de Airflow existentes sin administrar servidores
dominio: 1
**Amazon MWAA**.

## Patrón de acceso desconocido en S3
dominio: 2
**S3 Intelligent-Tiering**.

## Retención de años, casi sin lectura, lo más barato
dominio: 2
**Glacier Deep Archive** (+ Object Lock en modo cumplimiento si es WORM).

## Upserts y borrados en el lago
dominio: 2
**Apache Iceberg**; sin programar mantenimiento: **S3 Tables**.

## Miles de particiones por día en Athena
dominio: 2
**Partition projection**.

## Dimensión chica unida con todo en Redshift
dominio: 2
`DISTSTYLE ALL`. Tablas grandes unidas por la misma columna: `DISTSTYLE KEY`.

## Filtros por rango de fechas en Redshift
dominio: 2
**Sort key** por fecha.

## Cargar miles de millones de filas a Redshift
dominio: 2
`COPY` desde varios archivos en S3, en paralelo.

## Leer en vivo otro clúster de Redshift
dominio: 2
**Data sharing**.

## Índice vectorial con mejor recall / con menos memoria
dominio: 2
**HNSW** / **IVF**.

## Alertar cuando falla un job
dominio: 3
Regla de **EventBridge** (estado FAILED) → **SNS**.

## Bajar el costo de Athena
dominio: 3
Parquet + particiones + **workgroups** con límite de datos escaneados.

## Reglas de calidad declarativas
dominio: 3
**Glue Data Quality** (DQDL, recomendaciones y anomalías).

## Consumidor de Kinesis atrasado
dominio: 3
Métrica **`IteratorAge`**.

## Permisos por columna/fila en el lago para varios motores
dominio: 4
**Lake Formation** (filtros de datos, **LF-Tags**).

## Rotar la contraseña de una base automáticamente
dominio: 4
**Secrets Manager**.

## S3 sin pasar por internet desde la VPC
dominio: 4
**VPC gateway endpoint**.

## Leer objetos KMS de otra cuenta
dominio: 4
Permiso en la **política de la clave KMS** + `kms:Decrypt` en IAM + política del bucket.

## Encontrar PII en buckets / quién borró una tabla
dominio: 4
**Macie** / **CloudTrail**.
