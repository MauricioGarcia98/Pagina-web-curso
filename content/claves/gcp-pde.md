# Tarjetas: Google Cloud Professional Data Engineer

## "Serverless" o "sin administrar infraestructura"
**BigQuery**, **Dataflow**, **Pub/Sub**, Cloud Run por sobre Dataproc o VMs.

## Migrar Spark/Hadoop con cambios mínimos
dominio: 1
**Dataproc** (clústeres efímeros, datos en Cloud Storage, workers Spot).

## Formato abierto para varios motores
dominio: 1
**Iceberg** con **BigLake**.

## Consultar datos en S3 o Azure desde BigQuery
dominio: 1
**BigQuery Omni**.

## Traducir SQL de Teradata o Redshift
dominio: 1
**BigQuery Migration Service**.

## Mover cientos de TB con red lenta
dominio: 1
**Transfer Appliance**. Desde otra nube: **Storage Transfer Service**.

## Ventanas, marcas de agua y datos tardíos
dominio: 2
**Dataflow (Apache Beam)**: allowed lateness + disparadores tardíos.

## Actualizar un pipeline de streaming sin perder estado
dominio: 2
**Update** (compatible) o **drain** y relanzar; nunca cancel.

## CDC de MySQL, PostgreSQL u Oracle a BigQuery
dominio: 2
**Datastream**.

## Pub/Sub directo a BigQuery sin código
dominio: 2
**Suscripción de BigQuery**.

## Mensajes que fallan siempre
dominio: 2
**Dead-letter topic** con máximo de intentos.

## Catálogo chico para enriquecer eventos
dominio: 2
**Side input**.

## Muchos DAGs con dependencias / unas pocas llamadas a APIs
dominio: 2
**Cloud Composer** / **Workflows**.

## SQL modular con pruebas en BigQuery
dominio: 2
**Dataform** (tablas incrementales, aserciones).

## Millones de escrituras por segundo, lecturas en ms
dominio: 3
**Bigtable** (clave sin valores crecientes al inicio).

## Transacciones globales con consistencia fuerte
dominio: 3
**Spanner**.

## PostgreSQL con analítica rápida
dominio: 3
**AlloyDB**.

## Consultas que escanean toda la tabla aunque filtran por fecha
dominio: 3
**Particionar** por fecha (+ `require_partition_filter`) y **clustering**.

## Join pedido–líneas costoso
dominio: 3
**ARRAY de STRUCT** (desnormalizar).

## Recuperar el estado de hace unas horas
dominio: 3
**Time travel** (`FOR SYSTEM_TIME AS OF`, hasta 7 días).

## Compartir sin copiar con otras empresas
dominio: 4
**Analytics Hub**; sin ver filas individuales: **data clean rooms**.

## Filas / columnas según el usuario
dominio: 4
**Row access policies** / **policy tags** con enmascaramiento dinámico.

## Modelos con SQL
dominio: 4
**BigQuery ML** (ARIMA_PLUS, `AI.FORECAST`, modelos remotos de Gemini).

## Cargas estables con mucho gasto on-demand
dominio: 5
**Ediciones con reservas de slots** y autoescalado.

## Lotes de Dataflow no urgentes más baratos
dominio: 5
**FlexRS**.

## Impedir exfiltración con credenciales válidas
dominio: 5
**VPC Service Controls**.

## La empresa debe poder revocar la clave
dominio: 5
**CMEK** con Cloud KMS.

## Encontrar y tokenizar PII
dominio: 5
**Sensitive Data Protection**.

## Quién leyó una tabla
dominio: 5
**Data Access audit logs** (o `INFORMATION_SCHEMA.JOBS`).
