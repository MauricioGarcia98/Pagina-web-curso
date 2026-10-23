---
titulo: ¿Qué es dbt y por qué todos lo usan?
nivel: Básico
duracion: 20
resumen: ELT, analytics engineering, qué hace dbt (y qué no) y cómo encaja con Databricks y Airflow.
---

**dbt** (*data build tool*) es la herramienta estándar para la **T** de ELT: transformar datos **dentro** del data warehouse o lakehouse usando **SQL**, pero con las prácticas de la ingeniería de software: control de versiones, modularidad, tests, documentación y entornos.

:::analogia dbt es un “compilador de SQL con superpoderes”
Tú escribes archivos `.sql` con un `SELECT` cada uno (un **modelo**). dbt los **compila** (resolviendo referencias y plantillas), descubre en qué **orden** ejecutarlos y los **materializa** en tu base como vistas o tablas. No mueve datos de un lado a otro: le dice a tu motor (Databricks, Snowflake, BigQuery, Postgres…) qué SQL ejecutar.
:::

## El problema que resuelve

Imagina el área de datos de una empresa **antes** de dbt. Las transformaciones (de las tablas crudas a las tablas de reportes) vivían en:

- **Decenas de scripts SQL sueltos**, ejecutados en un orden que solo una persona conocía ("primero corro `limpiar_clientes.sql`, después `ventas.sql`, y el viernes `resumen.sql`").
- **Stored procedures** de cientos de líneas dentro de la base de datos, sin control de versiones.
- **Cero tests**: los errores se descubrían cuando el gerente veía un número raro en el dashboard.
- **Sin documentación**: nadie sabía de dónde salía la columna `venta_neta_ajustada` ni quién la usaba.

dbt resuelve cada uno de esos problemas con una idea simple: **cada transformación es un archivo `.sql` con un `SELECT`**, guardado en un repositorio Git, y dbt se ocupa del resto.

| Problema | Cómo lo resuelve dbt |
|---|---|
| ¿En qué orden se ejecuta? | Lees `{{ ref('otro_modelo') }}` y dbt arma solo el **grafo de dependencias** (DAG) |
| ¿Tabla o vista? ¿`CREATE` o `INSERT`? | Una línea de configuración (`materialized`); dbt escribe el DDL |
| ¿Los datos están bien? | **Tests** declarados en YAML (`unique`, `not_null`…) que corren con `dbt test` |
| ¿Qué significa cada columna? | Documentación en YAML y un sitio web generado con `dbt docs` |
| ¿Cómo pruebo sin romper producción? | **Entornos**: cada desarrollador escribe en su propio esquema |
| ¿Quién cambió qué? | Todo es código en Git, con *pull requests* y revisión |

## Qué pasa cuando ejecutas `dbt run`

1. dbt **lee** todos los archivos `.sql` de la carpeta `models/`.
2. **Compila** cada uno: reemplaza las expresiones Jinja (`{{ ref('stg_pedidos') }}` → `analytics.staging.stg_pedidos`) y produce SQL puro.
3. Con los `ref()`, arma el **DAG** y decide el orden: primero los modelos que no dependen de nadie.
4. **Envuelve** cada `SELECT` en el DDL de su materialización (`CREATE VIEW … AS SELECT …`, `CREATE TABLE … AS SELECT …`) y lo envía a tu motor.
5. Ejecuta en paralelo lo que se puede y reporta qué funcionó y qué falló.

El trabajo pesado lo hace tu **motor** (Databricks, Snowflake, BigQuery…): dbt solo genera y ordena el SQL.

## Pruébalo en la terminal

La terminal del curso tiene un proyecto dbt de verdad en la carpeta `tienda_dbt` (los modelos se ejecutan sobre la base SQLite del curso). Ábrela con el botón **⌨ En la terminal** y ejecuta:

```bash
cd tienda_dbt
dbt debug
dbt ls
dbt compile -s ventas_por_canal
dbt run
dbt test
```

Fíjate en la salida de `dbt compile`: el modelo tiene `from {{ ref('stg_ventas') }}` y el SQL compilado tiene `from main.stg_ventas`. Esa traducción es el corazón de dbt.

## Qué hace y qué no hace

| dbt SÍ | dbt NO |
|---|---|
| Transforma datos que **ya están** en tu warehouse/lakehouse | Extraer de APIs o bases de origen (eso es Fivetran, Airbyte, ADF, código propio) |
| Ordena las dependencias entre modelos (un DAG) | Programar horarios complejos de todo el pipeline (eso es Airflow, Databricks Workflows, dbt Cloud jobs) |
| Prueba la calidad de los datos | Procesar en Python a gran escala (para eso, Spark; aunque dbt soporta modelos Python en algunos motores) |
| Genera documentación y linaje | Visualizar datos (eso es Power BI, Tableau, Looker) |

## El flujo moderno de datos

```text
 Fuentes ──(EL: Fivetran/ADF/Airbyte/Auto Loader)──▶ Bronze / raw
                                                       │
                                     dbt (T): staging ─▶ intermediate ─▶ marts (gold)
                                                       │
                                     BI / ML / reverse ETL
 Orquestación de todo: Airflow / Databricks Workflows / dbt Cloud
```

## Analytics engineering

dbt popularizó el rol de **Analytics Engineer**: alguien entre el analista y el ingeniero de datos, que modela los datos con SQL de calidad productiva. Como Data Engineer, vas a escribir y revisar muchos modelos dbt.

## Sabores de dbt

- **dbt Core**: open source, se instala con `pip` y se usa desde la terminal. Es lo que aprenderás aquí.
- **dbt Cloud / plataforma de dbt Labs**: servicio pago con IDE web, jobs programados, CI, catálogo y semantic layer.
- Se conecta a cada motor con un **adaptador**: `dbt-databricks`, `dbt-snowflake`, `dbt-bigquery`, `dbt-postgres`, `dbt-duckdb`…

:::nota Cómo practicamos dbt aquí
Los ejercicios de dbt compilan tus modelos con **Jinja real** (la misma librería que usa dbt) y ejecutan el SQL resultante en la base SQLite del curso. Ya existen los modelos de staging `stg_clientes`, `stg_productos`, `stg_pedidos`, `stg_detalle_pedidos` (con la columna `importe`) y `stg_pagos`, y las fuentes de la tienda: `source('tienda', 'pedidos')` apunta a la tabla `pedidos` (se compila como `main.pedidos`), etc. Siempre verás el **SQL compilado**.
:::

:::ejercicio quiz
Tu empresa necesita copiar datos de Salesforce al lakehouse cada hora. ¿dbt sirve para eso?

- [ ] Sí, es su función principal
- [x] No: dbt transforma datos que ya están en el warehouse; la extracción la hace otra herramienta
- [ ] Solo dbt Cloud
- [ ] Sí, con un macro
:::

:::ejercicio quiz
¿Qué escribe principalmente un desarrollador en un proyecto dbt?

- [ ] Programas en Java
- [x] Archivos SQL con un SELECT (modelos), más YAML para tests y documentación
- [ ] Notebooks de Spark
- [ ] DAGs de Airflow
:::
