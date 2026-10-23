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
