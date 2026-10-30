---
titulo: El proyecto final: arquitectura de punta a punta
nivel: Avanzado
duracion: 30
resumen: Diseña la plataforma de datos de Tienda Andina con todo lo aprendido.
---

¡Llegaste al final! Vamos a unir todas las piezas en un proyecto como los que se construyen en empresas reales. Este proyecto es ideal para tu **portafolio**.

## El caso de negocio

Tienda Andina quiere:

1. Un **tablero diario** de ventas por país, canal y categoría, actualizado a las 7:00.
2. Un **modelo de clientes** (RFM y cohortes) para campañas de marketing.
3. Detectar **problemas de calidad** (pedidos sin pago, duplicados) antes de que lleguen al tablero.
4. Que todo sea **reproducible, versionado y barato**.

## La arquitectura

```text
                ┌──────────────────────── Azure ────────────────────────────┐
 ERP (SQL) ──ADF──▶ ADLS Gen2 /bronze ──┐                                     │
 API pagos ─Python─▶ ADLS Gen2 /bronze ──┤  Databricks (Unity Catalog)         │
 Clics web ─Event Hubs────────────────── ┤   Auto Loader → bronze (Delta)      │
                                         │   PySpark     → silver (MERGE)      │
                                         │   dbt         → gold (estrella)     │
                                         │   SQL Warehouse → Power BI          │
                                         └─────────────────────────────────────┘
 Orquestación: Airflow (o Lakeflow Jobs)          Secretos: Key Vault   IaC: Bicep + Declarative Automation Bundles
 CI/CD: GitHub Actions   Calidad: tests dbt + expectations   Observabilidad: alertas + system tables
```

## Plan de trabajo (cada paso usa un módulo del curso)

| Paso | Qué haces | Módulo |
|---|---|---|
| 1 | Crear grupo de recursos, ADLS Gen2 (bronze/silver/gold), Key Vault y workspace de Databricks con un script o Bicep | Azure CLI |
| 2 | Configurar Unity Catalog: catálogos `dev`/`prod`, esquemas, external locations, grupos y permisos | Databricks |
| 3 | Ingestar los datos crudos a bronze con Auto Loader | Spark / PySpark |
| 4 | Construir silver: limpieza, tipos, deduplicación, MERGE, reglas de calidad con cuarentena | PySpark |
| 5 | Modelar gold con dbt: `fct_ventas`, `dim_clientes`, `dim_productos`, `mart_rfm`, tests y docs | dbt + SQL |
| 6 | Orquestar con Airflow (sensor → job Databricks → dbt build → aviso) o con un job multi-tarea | Airflow / Databricks |
| 7 | Empaquetar todo con Declarative Automation Bundles y desplegar con GitHub Actions | Databricks CLI + Git |
| 8 | Responder las preguntas de negocio con SQL avanzado | SQL |

:::tip Para tu portafolio
Sube el proyecto a GitHub con un README que tenga: el diagrama de arquitectura, cómo correrlo, decisiones de diseño (¿por qué incremental?, ¿por qué esa partición?), y capturas del tablero y del linaje. Eso vale más que cualquier certificado.
:::

## Por qué cada pieza, en una frase

Una arquitectura no es una lista de herramientas: es una decisión por cada necesidad. Si en una entrevista te preguntan "¿por qué usaste X?", la respuesta tiene que ser la necesidad, no la moda.

| Pieza | Necesidad que resuelve | Alternativa razonable |
|---|---|---|
| **Data Factory** para el ERP | Copiar tablas de una base SQL por lotes, sin programar conectores, incluso desde una red privada | Lakeflow Connect o un script de Python propio |
| **Python** para la API de pagos | La API tiene paginación y límites de solicitudes: hace falta lógica | Una función en la nube (Azure Functions) |
| **Event Hubs** para los clics | Llegan miles de eventos por segundo, todo el día | Kafka administrado |
| **ADLS Gen2** | Guardar todo barato y para siempre, en carpetas con permisos | — (es el lago) |
| **Auto Loader** a bronze | Procesar solo los archivos nuevos, sin listar millones de archivos cada vez | `COPY INTO` |
| **PySpark** a silver | Limpiar y deduplicar millones de filas con reglas en código | SQL en Databricks |
| **dbt** a gold | Métricas de negocio en SQL, con tests, documentación y linaje | Vistas en Databricks SQL (sin tests ni versiones) |
| **Unity Catalog** | Un solo lugar para permisos, linaje y auditoría | — |
| **Airflow / Lakeflow Jobs** | Orden, horarios, reintentos y alertas | Uno u otro: Lakeflow Jobs si todo vive en Databricks |
| **Bicep + bundles + GitHub Actions** | Que todo se pueda recrear y que nada se cambie a mano en producción | Terraform |

### Cuánto puede costar

Para el volumen del caso (algunos GB por día), un entorno así cuesta en Azure del orden de cientos de dólares por mes, casi todo en cómputo de Databricks. Las decisiones que más lo bajan: cómputo *serverless* o clústeres de jobs que se apagan al terminar, auto-stop del SQL warehouse, incremental en lugar de reconstruir todo, y almacenamiento con ciclo de vida para bronze viejo. Estimar el costo antes de construir (y medirlo después con las *system tables*) es parte del diseño.

:::errores
- **Elegir herramientas antes que necesidades**: un proyecto con Kafka, Spark y Airflow para 10.000 filas por día es caro y difícil de mantener.
- **Saltarse bronze** y escribir directo a silver: cuando una regla de limpieza estaba mal, no hay datos originales para reprocesar.
- **Un solo entorno**: probar en producción. Desde el paso 2, catálogos `dev` y `prod` separados.
- **Secretos en notebooks o en el repositorio**: todo va a Key Vault, leído con *secret scopes* o identidades administradas.
- **Sin alertas**: el tablero de las 7:00 vacío lo descubre la gerencia, no el equipo.
:::

:::trabajo
- Este diseño (lago en la nube, Databricks con Unity Catalog, dbt, un orquestador e IaC) es uno de los más comunes en empresas medianas y grandes de Latinoamérica.
- En un equipo real, el paso 1 y el 7 suelen ser de un equipo de plataforma; el data engineer se concentra en los pasos 3 a 6, y el analista en el 8.
:::

:::entrevista "Diseña la plataforma de datos de una tienda online que quiere un tablero diario a las 7:00."
Empezaría por los requisitos: fuentes, volumen, frescura, quién consume y presupuesto. Propondría un lakehouse: ingesta a bronze sin transformar (por lotes del ERP, la API con un proceso en Python, eventos por streaming), silver con limpieza, deduplicación y cuarentena en Spark con MERGE, y gold con dbt y tests, servido por un SQL warehouse a Power BI. Unity Catalog para permisos y linaje, un orquestador con reintentos y alertas que no publica si fallan los tests, y todo como código con CI/CD. Terminaría con costos y monitoreo de frescura.
:::

:::ejercicio abierto
Antes de construir, escribe en 5–8 líneas las **decisiones de diseño** para la tabla `silver.pedidos`: formato, clave, estrategia de carga (append/merge), manejo de duplicados, columnas de auditoría y particionado o clustering. Luego compara con la respuesta modelo.
```text solucion
- Formato: Delta en Unity Catalog (prod.silver.pedidos).
- Clave: pedido_id (único; test unique + not_null).
- Carga: incremental con MERGE por pedido_id, porque los pedidos cambian de estado durante días.
- Duplicados: deduplicar el lote de origen con ROW_NUMBER() por pedido_id ordenando por fecha de ingesta desc.
- Auditoría: _fecha_ingesta, _archivo_origen, _actualizado_en.
- Organización física: Liquid Clustering por fecha_pedido (las consultas filtran por fecha); sin particionar por columnas de alta cardinalidad.
- Calidad: filas inválidas a silver.pedidos_cuarentena con el motivo; alerta si superan el 1%.
```
:::
