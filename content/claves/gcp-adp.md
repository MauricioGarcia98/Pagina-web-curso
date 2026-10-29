# Tarjetas: Google Cloud Associate Data Practitioner

## Archivos de Cloud Storage a BigQuery cada noche
dominio: 1
**BigQuery Data Transfer Service** o una carga programada.

## Google Ads a BigQuery sin código
dominio: 1
Conector de Ads de **Data Transfer Service**.

## Copiar desde S3 o Azure a Cloud Storage
dominio: 1
**Storage Transfer Service**.

## Consultar Parquet sin cargarlo
dominio: 1
**Tabla externa** o **BigLake**.

## Montos de dinero exactos
dominio: 1
Tipo **NUMERIC**.

## Escritura en tiempo real desde una app
dominio: 1
**Storage Write API**.

## Cargar crudo y transformar con SQL dentro de BigQuery
dominio: 1
**ELT**.

## Todas las filas de la izquierda aunque no coincidan
dominio: 2
**LEFT JOIN**.

## Acumulado por grupo
dominio: 2
`SUM(x) OVER (PARTITION BY grupo ORDER BY fecha)`.

## Tablero gratuito sobre BigQuery
dominio: 2
**Looker Studio**. Métricas únicas para toda la empresa: **Looker (LookML)**.

## Tablas dinámicas en Sheets sobre millones de filas
dominio: 2
**Connected Sheets**.

## Métricas / predicciones de un modelo de BigQuery ML
dominio: 2
`ML.EVALUATE` / `ML.PREDICT`.

## Segmentar clientes sin etiquetas
dominio: 2
**K-means**.

## Recalcular una tabla cada mañana
dominio: 3
**Consulta programada** de BigQuery.

## Dependencia entre tablas en Dataform
dominio: 3
`${ref("tabla")}`.

## Reaccionar a un archivo nuevo
dominio: 3
**Eventarc** → Cloud Run function o workflow.

## Llamar una URL cada hora
dominio: 3
**Cloud Scheduler**.

## Leer y consultar sin modificar
dominio: 4
**Data Viewer** en el dataset + **Job User** en el proyecto.

## Tablas temporales que se borran solas
dominio: 4
**Expiración predeterminada** del dataset.

## Archivos viejos más baratos
dominio: 4
**Reglas de ciclo de vida** o **Autoclass**.

## Recuperar una tabla borrada ayer
dominio: 4
**Time travel** (restaurar dentro de la ventana).

## Datos que deben quedar en un país
dominio: 4
Elegir la **ubicación regional** al crear el dataset o bucket.
