---
titulo: PDE - Almacenar datos y prepararlos para el análisis
nivel: Avanzado
duracion: 80
resumen: Las secciones 3 y 4 del Professional Data Engineer - elegir entre Cloud Storage, BigQuery, Bigtable, Spanner, Cloud SQL, AlloyDB y Firestore; diseñar en BigQuery (particiones, clustering, campos anidados, vistas materializadas, BigLake e Iceberg, ediciones y slots); data lakes y data mesh con Dataplex y Knowledge Catalog; y preparar datos para análisis e IA con BigQuery ML, funciones de IA, BI Engine, Looker y Analytics Hub.
objetivos: Elegir el almacén según latencia, escala, consistencia y modelo de datos | Diseñar tablas de BigQuery que minimicen bytes escaneados | Diseñar claves de fila en Bigtable que eviten hotspots | Gobernar un lago con Dataplex y Knowledge Catalog | Entrenar y usar modelos con BigQuery ML y llamar a Gemini desde SQL | Compartir datos con Analytics Hub y seguridad por fila y columna
prerrequisitos: cert-gcp-pde-diseno-ingesta | gcp-bigquery-avanzado
autoevaluacion: ¿Sabes cuándo usar Bigtable y cuándo Spanner? | ¿Sabes qué diferencia hay entre particionar y agrupar? | ¿Sabes por qué una clave de fila con la fecha al inicio es mala en Bigtable? | ¿Sabes qué es una tabla BigLake? | ¿Sabes cómo compartir un dataset con otra empresa sin copiarlo?
---

:::escenario
BigQuery le cuesta a la cadena de Valentina USD 40.000 por mes y los analistas se quejan de lentitud. La app de precios necesita leer el precio de 5 millones de productos por sucursal en milisegundos, y un proveedor quiere recibir las ventas de sus productos cada día. Toca decidir dónde vive cada dato y cómo se consulta.
:::

## Sección 3: elegir el almacén

| Necesidad | Servicio |
|---|---|
| Objetos, lago, archivos de cualquier formato | **Cloud Storage** (Standard, Nearline 30 días, Coldline 90, Archive 365; **Autoclass**) |
| Analítica SQL a escala de petabytes | **BigQuery** |
| Clave-valor de columnas anchas, millones de operaciones por segundo, latencia de un dígito de ms, series de tiempo e IoT | **Bigtable** |
| Relacional con **escala horizontal global** y consistencia fuerte | **Spanner** |
| Relacional tradicional (MySQL, PostgreSQL, SQL Server) | **Cloud SQL** |
| PostgreSQL de alto rendimiento con analítica (HTAP) | **AlloyDB** |
| Documentos para apps móviles y web | **Firestore** |
| Caché en memoria | **Memorystore** (Redis, Valkey) |

### Bigtable

- Una tabla, una **clave de fila** ordenada lexicográficamente; **familias de columnas**. Las búsquedas eficientes son por clave o por rango de claves.
- **Evitar hotspots**: no empezar la clave con un valor creciente (marca de tiempo, id secuencial). Usar campos de alta cardinalidad primero (`sucursal#producto#timestamp_invertido`), *salting* o hash.
- Escala agregando nodos; **replicación** entre clústeres con perfiles de aplicación; **Key Visualizer** muestra los hotspots.
- No soporta SQL completo ni transacciones entre filas (hay consultas SQL básicas y la integración con BigQuery).

### Cloud Storage para lagos

- **Clases** con duraciones mínimas, **reglas de ciclo de vida**, **Autoclass**, **versionado**, **retención con bloqueo** (*bucket lock*) para WORM.
- Ubicaciones regional, dual-región y multirregión (con **turbo replication** para RPO de 15 minutos en dual-región).

## BigQuery en profundidad

### Diseño de tablas

- **Particionado** por columna de fecha/marca de tiempo, por tiempo de ingesta o por rango de enteros. `require_partition_filter` obliga a filtrar. Límite de 10.000 particiones por tabla.
- **Clustering** por hasta 4 columnas de filtro o join frecuentes; ordena los bloques y reduce lo escaneado (también reagrupa automáticamente).
- **Campos anidados y repetidos** (`STRUCT`, `ARRAY`): desnormalizar evita joins costosos (pedido con sus líneas en una fila).
- **Vistas materializadas** con refresco incremental y reescritura automática de consultas; **vistas autorizadas** y **datasets autorizados** para exponer subconjuntos.
- **Tablas externas** y **BigLake**: consultar Parquet, ORC, Avro o **Iceberg** en Cloud Storage (o S3/Azure con **BigQuery Omni**) con seguridad fina y caché de metadatos. **Tablas Iceberg administradas por BigQuery** (BigLake tables for Apache Iceberg) para un lago abierto con escritura desde BigQuery.
- **Object tables**: tablas sobre archivos no estructurados (imágenes, PDF) para procesarlos con IA.
- **Time travel** (hasta 7 días), **snapshots** y **clones** de tablas.

### Costo y rendimiento

- **On-demand**: se paga por TB escaneado. **Ediciones** (Standard, Enterprise, Enterprise Plus): capacidad en **slots** con **autoescalado** y **reservas** asignadas a proyectos o carpetas; compromisos de 1 o 3 años.
- Reducir costo: seleccionar columnas (nunca `SELECT *`), filtrar por partición, clustering, **límite de bytes facturados** (*maximum bytes billed*), cuotas por usuario, almacenamiento **long-term** (más barato a los 90 días sin cambios) y facturación de almacenamiento **físico** (comprimido).
- **INFORMATION_SCHEMA.JOBS** para encontrar las consultas más caras; el **plan de ejecución** para ver etapas lentas y desbalance.
- **BI Engine** acelera paneles en memoria; **caché de resultados** de 24 horas sin costo.
- Escritura: **Storage Write API** (alto volumen, exactly-once), cargas por lotes gratuitas, `MERGE` para upserts.

```sql norun
CREATE TABLE ventas.tickets (
  ticket_id STRING,
  sucursal_id INT64,
  fecha TIMESTAMP,
  lineas ARRAY<STRUCT<producto_id STRING, cantidad INT64, precio NUMERIC>>
)
PARTITION BY DATE(fecha)
CLUSTER BY sucursal_id
OPTIONS (require_partition_filter = TRUE, partition_expiration_days = 1095);

-- total por producto de ayer, leyendo solo una partición
SELECT l.producto_id, SUM(l.cantidad * l.precio) AS total
FROM ventas.tickets, UNNEST(lineas) AS l
WHERE DATE(fecha) = DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)
GROUP BY l.producto_id;
```

## Lagos, data mesh y gobierno

- **Dataplex**: organiza datos de Cloud Storage y BigQuery en **lagos, zonas y activos** (por dominio), descubre metadatos, aplica permisos y ejecuta **calidad de datos** (*data quality scans*) y **perfilado**.
- **Knowledge Catalog** (antes Data Catalog / Dataplex Universal Catalog): búsqueda, **glosario de negocio**, **aspectos** (metadatos estructurados), **linaje** automático de BigQuery, Dataflow, Composer y otros.
- **Data mesh**: cada dominio es dueño de sus datos como productos, con gobierno federado mediante Dataplex.

## Sección 4: preparar y usar datos para análisis

### Seguridad fina en BigQuery

- **Seguridad por fila** (*row access policies*) y **por columna** con **etiquetas de política** (*policy tags*) de una taxonomía; **enmascaramiento dinámico** (hash, nulo, últimos 4 caracteres) según el rol.
- **Vistas autorizadas** para exponer columnas o filas a otro grupo sin dar acceso a la tabla base.

```sql norun
CREATE ROW ACCESS POLICY solo_su_region
ON ventas.tickets
GRANT TO ("group:gerentes-norte@cadena.com")
FILTER USING (region = "NORTE");
```

### Compartir datos

- **Analytics Hub** (BigQuery sharing): publicar **listings** en un **exchange**; el suscriptor obtiene un dataset vinculado de solo lectura **sin copia**, y paga sus consultas. **Data clean rooms** para analizar datos compartidos sin ver filas individuales.
- **Datasets autorizados** y permisos IAM para compartir dentro de la organización.

### IA sobre los datos

- **BigQuery ML**: `CREATE MODEL` con regresión lineal y logística, k-means, árboles potenciados, AutoML, series de tiempo (**ARIMA_PLUS**, **TimesFM** con `AI.FORECAST`), recomendaciones (matrix factorization), importación de TensorFlow u ONNX, y **modelos remotos** sobre Gemini. Evaluación con `ML.EVALUATE`, predicción con `ML.PREDICT`, explicación con `ML.EXPLAIN_PREDICT`.
- **Funciones de IA generativa en SQL**: `AI.GENERATE`, `AI.GENERATE_TABLE`, `ML.GENERATE_EMBEDDING`, `VECTOR_SEARCH` e índices vectoriales en BigQuery.
- **Feature engineering** con `TRANSFORM` en el modelo para que las mismas transformaciones se apliquen al predecir.
- **Gemini en BigQuery**: asistencia para escribir SQL, *data canvas* y agentes de datos.
- **Looker** (modelo semántico **LookML**), **Looker Studio** para paneles, **Connected Sheets** para analizar en Sheets.

```sql norun
CREATE OR REPLACE MODEL ventas.modelo_demanda
OPTIONS (model_type = 'ARIMA_PLUS',
         time_series_timestamp_col = 'dia',
         time_series_data_col = 'unidades',
         time_series_id_col = 'producto_id') AS
SELECT dia, producto_id, unidades FROM ventas.unidades_diarias;

SELECT * FROM ML.FORECAST(MODEL ventas.modelo_demanda, STRUCT(14 AS horizon));
```

:::examen Palabras clave
- "Latencia de milisegundos, millones de escrituras, series de tiempo" → **Bigtable**.
- "Transacciones globales con consistencia fuerte" → **Spanner**.
- "Consultas escanean toda la tabla aunque filtran por fecha" → **particionar** (y `require_partition_filter`).
- "Compartir con otra organización sin copiar" → **Analytics Hub**.
- "Analistas que solo saben SQL quieren un modelo" → **BigQuery ML**.
- "Consultar Parquet o Iceberg en GCS con seguridad por columna" → **BigLake**.
:::

## Ejercicios

:::ejercicio quiz
Una tabla de Bigtable con clave `timestamp#sensor_id` muestra un nodo saturado mientras los demás están ociosos. ¿Qué cambias?
- [ ] Agregar más nodos al clúster.
- [x] Rediseñar la clave para empezar por `sensor_id` (por ejemplo, `sensor_id#timestamp_invertido`).
- [ ] Crear una familia de columnas por sensor.
- [ ] Activar la replicación entre regiones.
```explicacion
Una clave que empieza por la marca de tiempo concentra todas las escrituras en el final del rango. Empezar por un campo de alta cardinalidad distribuye la carga.
```
:::

:::ejercicio quiz
Las consultas sobre `tickets` siempre filtran por fecha y por sucursal, pero escanean toda la tabla. ¿Qué diseño reduce más el costo?
- [ ] Crear un índice secundario por fecha.
- [x] Particionar por fecha y agrupar (clustering) por sucursal.
- [ ] Exportar la tabla a Cloud Storage y usar una tabla externa.
- [ ] Aumentar las reservas de slots.
```explicacion
La partición limita los días leídos y el clustering ordena los bloques por sucursal, así BigQuery salta los que no aplican.
```
:::

:::ejercicio quiz
Un proveedor externo debe consultar cada día las ventas de sus productos, siempre actualizadas, sin que la cadena copie datos ni pague sus consultas. ¿Qué usas?
- [ ] Una exportación diaria a un bucket compartido.
- [x] Un listing de Analytics Hub con una vista autorizada filtrada por proveedor.
- [ ] Dar al proveedor el rol de editor del dataset.
- [ ] Una transferencia de BigQuery Data Transfer Service a su proyecto.
```explicacion
Analytics Hub comparte un dataset vinculado sin copia; el suscriptor paga sus consultas, y la vista limita lo que ve.
```
:::

:::ejercicio quiz
Los gerentes de cada región solo deben ver las filas de su región en la misma tabla de BigQuery. ¿Qué usas?
- [ ] Una tabla por región con permisos separados.
- [x] Políticas de acceso por fila.
- [ ] Etiquetas de política en la columna región.
- [ ] Un bucket por región con IAM.
```explicacion
Las row access policies filtran las filas según el usuario o grupo, sin duplicar tablas.
```
:::

:::ejercicio abierto
Escribe en BigQuery ML un modelo de regresión logística que prediga si un cliente abandona (`abandona`) a partir de `compras_90d`, `ticket_promedio` y `dias_ultima_compra` de la tabla `crm.clientes`, y la consulta que lo evalúa.
```sql solucion
CREATE OR REPLACE MODEL crm.modelo_abandono
OPTIONS (model_type = 'LOGISTIC_REG', input_label_cols = ['abandona']) AS
SELECT compras_90d, ticket_promedio, dias_ultima_compra, abandona
FROM crm.clientes;

SELECT * FROM ML.EVALUATE(MODEL crm.modelo_abandono);
```
:::
