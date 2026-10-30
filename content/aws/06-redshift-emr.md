---
titulo: Redshift y EMR, warehouse y Spark a gran escala
nivel: Avanzado
duracion: 45
resumen: Redshift (columnar, MPP, distribución y orden, COPY desde S3, Spectrum, Serverless, Data API) y EMR (clusters, steps, spot, EMR Serverless). Cuándo elegir cada uno.
---

## Redshift: el data warehouse de AWS

**Amazon Redshift** es una base de datos **columnar** y **MPP** (*massively parallel processing*): reparte las filas de cada tabla entre muchos nodos y cada nodo procesa su parte en paralelo. Está pensada para **BI**: dashboards, reportes y muchas consultas concurrentes con respuesta en segundos.

:::analogia Athena vs. Redshift
**Athena** es como ir a buscar a un depósito enorme (S3) cada vez: no pagas alquiler, pagas por viaje. **Redshift** es tener una tienda con los productos ya ordenados en góndolas: pagas el local, pero cada búsqueda es rapidísima. Si consultas los mismos datos cientos de veces por día, la tienda sale más barata y más rápida.
:::

| | Athena | Redshift |
|---|---|---|
| Datos | En S3 (archivos) | Dentro de Redshift (almacenamiento administrado) + S3 vía Spectrum |
| Cobro | Por TB escaneado | Por nodo-hora, o RPU-hora en Serverless |
| Ideal para | Exploración, consultas esporádicas, ETL con CTAS | Dashboards, muchas consultas concurrentes, SLAs de segundos |
| Modelado | Tablas sobre archivos | Esquemas estrella, vistas materializadas |

### Distribución y orden: cómo se reparten los datos

Elegir bien es lo que separa un Redshift rápido de uno lento:

| Opción | Qué hace | Cuándo |
|---|---|---|
| `DISTSTYLE KEY` + `DISTKEY(col)` | Filas con el mismo valor van al mismo nodo | Tablas de hechos grandes que se unen por esa columna (`cliente_id`) |
| `DISTSTYLE ALL` | Copia completa en cada nodo | Dimensiones chicas (países, categorías) |
| `DISTSTYLE EVEN` | Reparto parejo, sin criterio | Tablas sin un join dominante |
| `AUTO` | Redshift decide | Por defecto; suele estar bien |
| `SORTKEY(col)` | Ordena en disco por esa columna | La columna por la que más filtras (fecha) |

```sql norun
CREATE TABLE gold.fact_ventas (
  pedido_id   BIGINT,
  fecha       DATE,
  cliente_id  BIGINT,
  producto_id BIGINT,
  cantidad    INT,
  importe     DECIMAL(12,2)
)
DISTSTYLE KEY DISTKEY (cliente_id)
SORTKEY (fecha);

CREATE TABLE gold.dim_cliente (cliente_id BIGINT, nombre VARCHAR(200), pais VARCHAR(60), segmento VARCHAR(30))
DISTSTYLE ALL;
```

:::cuidado El join que mueve todo por la red
Si `fact_ventas` se distribuye por `pedido_id` y la unes con `dim_cliente` por `cliente_id`, Redshift tiene que **redistribuir** filas entre nodos en cada consulta (en el plan verás `DS_BCAST_INNER` o `DS_DIST_BOTH`). Distribuir la tabla de hechos por la clave de join, o la dimensión chica con `ALL`, lo evita. Es el mismo concepto del *shuffle* de Spark.
:::

### Cargar datos: COPY desde S3

Nunca cargues millones de filas con `INSERT … VALUES`. Usa `COPY`, que lee en paralelo desde S3:

```sql norun
COPY staging.ventas
FROM 's3://lake-tienda-dev/silver/ventas/'
IAM_ROLE 'arn:aws:iam::123456789012:role/RedshiftCopyRole'
FORMAT AS PARQUET;

-- y de staging a la tabla final, idempotente:
MERGE INTO gold.fact_ventas USING staging.ventas s ON gold.fact_ventas.pedido_id = s.pedido_id
WHEN MATCHED THEN UPDATE SET importe = s.importe
WHEN NOT MATCHED THEN INSERT VALUES (s.pedido_id, s.fecha, s.cliente_id, s.producto_id, s.cantidad, s.importe);
```

- **Redshift Spectrum**: consultar tablas del Glue Data Catalog (archivos en S3) desde Redshift, y unirlas con tablas internas. Útil para el histórico frío.
- **Redshift Serverless**: sin nodos que dimensionar; pagas por capacidad usada (RPU) mientras hay consultas.
- **Data API** (`aws redshift-data`): ejecutar SQL por HTTPS sin drivers ni conexiones abiertas. Ideal desde Lambda, Step Functions o Airflow.

```bash norun
ID=$(aws redshift-data execute-statement --workgroup-name analitica --database tienda \
      --sql "SELECT canal, COUNT(*) FROM public.pedidos GROUP BY canal" --query Id --output text)
aws redshift-data describe-statement --id $ID --query Status
aws redshift-data get-statement-result --id $ID
```

En esta terminal, la Data API ejecuta el SQL de verdad sobre las tablas del curso:

```bash
ID=$(aws redshift-data execute-statement --workgroup-name analitica --database tienda --sql "SELECT canal, COUNT(*) AS pedidos FROM pedidos GROUP BY canal ORDER BY pedidos DESC" --query Id --output text)
aws redshift-data describe-statement --id $ID --query Status
aws redshift-data get-statement-result --id $ID --query "Records[][0].stringValue"
```

## EMR: Spark (y más) en clusters que controlas

**Amazon EMR** levanta clusters con Spark, Hive, Presto/Trino, Flink o HBase. Te da control total: tipo de máquina, versión, configuración de Spark, librerías nativas.

```text
Cluster EMR
├── nodo primario (master)   → coordina, corre el driver de YARN/Spark
├── nodos core               → ejecutan tareas y guardan HDFS
└── nodos task (opcionales)  → solo cómputo: ideales para instancias SPOT (baratas, pueden desaparecer)
```

| Modalidad | Para qué |
|---|---|
| **EMR on EC2** | Clusters clásicos; *transient* (se crean para un job y se apagan) o de larga vida |
| **EMR Serverless** | Envías el job de Spark y AWS escala solo, sin cluster |
| **EMR on EKS** | Spark sobre Kubernetes, si tu empresa ya usa EKS |

```bash norun
aws emr create-cluster --name etl-nocturno --release-label emr-7.2.0 \
  --applications Name=Spark \
  --instance-type m5.xlarge --instance-count 5 \
  --use-default-roles --auto-terminate \
  --steps Type=Spark,Name=silver,ActionOnFailure=TERMINATE_CLUSTER,Args=[s3://lake-tienda-dev/scripts/silver.py]

aws emr list-clusters --active --query "Clusters[].{Id:Id, Nombre:Name, Estado:Status.State}" --output table
aws emr add-steps --cluster-id j-ABC123 --steps Type=Spark,Name=gold,Args=[s3://lake-tienda-dev/scripts/gold.py]
aws emr terminate-clusters --cluster-ids j-ABC123
```

:::tip Cluster transitorio = la regla
El error más caro con EMR es un cluster encendido sin trabajo. El patrón recomendado: el orquestador (Step Functions o Airflow) **crea** el cluster, ejecuta los *steps* y lo **apaga** (`--auto-terminate`). Si los jobs son esporádicos, EMR Serverless directamente.
:::

## El árbol de decisión

```text
¿Qué necesitas?
├─ SQL esporádico sobre el lago ──────────────────────────► Athena
├─ BI con muchas consultas y SLA de segundos ─────────────► Redshift (Serverless si la carga es irregular)
├─ ETL Spark, equipo chico, sin administrar ──────────────► Glue
├─ ETL Spark enorme, control fino, costo con spot ────────► EMR (o EMR Serverless)
├─ Lakehouse con notebooks y Delta en AWS ────────────────► Databricks on AWS
└─ Transformaciones SQL versionadas sobre Redshift/Athena ► dbt (dbt-redshift, dbt-athena)
```

```recorrido
titulo: Tres pedidos, tres servicios distintos
estacion p1: SQL esporádico | icono=lupa
estacion p2: BI diario | icono=dashboard
estacion p3: Spark enorme | icono=chispa
estacion regla: La regla | icono=check
paso p1: "Necesito revisar un archivo del lago una vez por semana"
Pocas consultas, sin servidores que mantener encendidos, sobre datos que ya están en S3 → **Athena**: pagas solo por lo que escanea cada consulta.
>>> texto
frecuencia: baja · datos: en S3 · usuarios: 1-2
→ Athena
paso p2: "El tablero de ventas lo abren 200 personas cada mañana"
Muchas consultas repetidas que deben responder en segundos → **Redshift**. Con carga irregular (picos a la mañana), Redshift Serverless escala solo.
>>> texto
frecuencia: alta · latencia: segundos · usuarios: 200
→ Redshift (Serverless)
paso p3: "Procesar 5 TB de logs cada noche con Spark"
Si el equipo es chico y no quiere administrar nada → **Glue**. Si necesita control fino (versiones, instancias spot, tunning) → **EMR** o EMR Serverless.
>>> texto
volumen: enorme · motor: Spark
→ Glue (simple)  ·  EMR (control y costo)
paso regla: La pregunta que ordena todo
No hay "el mejor" servicio: depende de **cuántas veces**, **qué tan rápido**, **cuántos datos** y **cuánto quieres administrar**. En la mayoría de las empresas conviven varios.
>>> texto
¿cuántas consultas?  ¿qué latencia?  ¿qué volumen?  ¿quién administra?
```

## Ejercicios

:::ejercicio sql ordenado titulo="Consulta de dashboard en el warehouse"
Esta consulta alimentaría un dashboard en Redshift (caso 💳 SaaS). Con `saas_facturas` **pagadas** (`estado = 'pagada'`) y `saas_planes`, calcula por `mes` y plan (`plan`, el nombre del plan): `empresas` (empresas distintas facturadas) e `ingresos` (suma de `monto`, redondeada a 2). Ordena por mes y luego por ingresos descendente.
```sql solucion
SELECT f.mes, p.nombre AS plan, COUNT(DISTINCT f.empresa_id) AS empresas, ROUND(SUM(f.monto), 2) AS ingresos
FROM saas_facturas f JOIN saas_planes p ON p.plan_id = f.plan_id
WHERE f.estado = 'pagada'
GROUP BY f.mes, p.nombre
ORDER BY f.mes, ingresos DESC;
```
:::

:::ejercicio sql ordenado titulo="Top 3 productos por categoría"
Un clásico de warehouse: para cada categoría (`categoria`, nombre en `categorias`), los **3 productos** con más unidades vendidas en pedidos no cancelados. Columnas: `categoria`, `producto`, `unidades`, `puesto` (1 a 3). Ordena por categoría y puesto. En empates de unidades, desempata por nombre de producto.
```sql solucion
WITH u AS (
  SELECT c.nombre AS categoria, pr.nombre AS producto, SUM(d.cantidad) AS unidades
  FROM detalle_pedidos d
  JOIN pedidos p ON p.pedido_id = d.pedido_id
  JOIN productos pr ON pr.producto_id = d.producto_id
  JOIN categorias c ON c.categoria_id = pr.categoria_id
  WHERE p.estado <> 'cancelado'
  GROUP BY c.nombre, pr.nombre
), r AS (
  SELECT *, ROW_NUMBER() OVER (PARTITION BY categoria ORDER BY unidades DESC, producto) AS puesto FROM u
)
SELECT categoria, producto, unidades, puesto FROM r WHERE puesto <= 3 ORDER BY categoria, puesto;
```
:::

:::ejercicio cli
Con la **Data API** de Redshift, ejecuta `SELECT COUNT(*) FROM pedidos` en el workgroup `analitica` y la base `tienda`.
```respuesta
todos: aws redshift-data execute-statement || --workgroup-name analitica || --database tienda || --sql ['"]SELECT COUNT\(\*\) FROM (public\.)?pedidos;?['"]
```
```solucion
aws redshift-data execute-statement --workgroup-name analitica --database tienda --sql "SELECT COUNT(*) FROM pedidos"
```
:::

:::ejercicio cli
Crea un cluster EMR llamado `etl-nocturno` con la versión `emr-7.2.0` y la aplicación Spark.
```respuesta
todos: aws emr create-cluster || --name ['"]?etl-nocturno['"]? || --release-label emr-7\.2\.0 || --applications ['"]?Name=Spark['"]?
```
```solucion
aws emr create-cluster --name etl-nocturno --release-label emr-7.2.0 --applications Name=Spark --instance-type m5.xlarge --instance-count 3 --use-default-roles --auto-terminate
```
:::

:::ejercicio cli
Lista los clusters EMR **activos** mostrando Id, Nombre y Estado en una tabla.
```respuesta
todos: aws emr list-clusters || --active || --query ['"]Clusters\[\]\.\{.*\}['"] || --output table
```
```solucion
aws emr list-clusters --active --query "Clusters[].{Id:Id, Nombre:Name, Estado:Status.State}" --output table
```
```setup
aws emr create-cluster --name etl-nocturno --release-label emr-7.2.0 --applications Name=Spark
```
:::

:::ejercicio quiz
En Redshift, `fact_ventas` (2.000 millones de filas) se une casi siempre con `dim_pais` (200 filas) y con `dim_cliente` (5 millones) por `cliente_id`. ¿Qué diseño es razonable?

- [ ] Todo con `DISTSTYLE ALL`
- [x] `fact_ventas` con `DISTKEY(cliente_id)`, `dim_cliente` con `DISTKEY(cliente_id)` y `dim_pais` con `DISTSTYLE ALL`
- [ ] `fact_ventas` con `DISTKEY(pais)`
- [ ] No importa: Redshift es columnar
```explicacion
Hechos y dimensión grande distribuidas por la misma clave hacen que el join sea **local** en cada nodo. La dimensión chica se copia a todos los nodos con `ALL`. `ALL` en una tabla de 2.000 millones de filas multiplicaría el almacenamiento por la cantidad de nodos.
```
:::

:::ejercicio quiz
Un dashboard ejecuta 50 consultas por minuto sobre los últimos 90 días de ventas. Hoy usa Athena sobre CSV y es lento y caro. ¿Qué propones?

- [ ] Más workers de Glue
- [ ] Un cluster EMR siempre encendido
- [x] Cargar una tabla gold en Redshift (o al menos materializarla en Parquet particionado) y apuntar el dashboard ahí
- [ ] Lambda
:::

:::ejercicio quiz
¿Por qué se recomiendan instancias *spot* para los nodos **task** de EMR y no para el nodo primario?

- [ ] Porque los nodos task son más caros
- [x] Porque AWS puede quitar una instancia spot con poco aviso: perder un nodo task solo reintenta tareas, pero perder el primario mata el cluster
- [ ] Porque spot solo existe para nodos task
- [ ] No se recomiendan nunca
:::
