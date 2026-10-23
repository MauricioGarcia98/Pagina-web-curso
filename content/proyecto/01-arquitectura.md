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
 Orquestación: Airflow (o Databricks Workflows)   Secretos: Key Vault   IaC: Bicep + Asset Bundles
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
| 7 | Empaquetar todo con Asset Bundles y desplegar con GitHub Actions | Databricks CLI + Git |
| 8 | Responder las preguntas de negocio con SQL avanzado | SQL |

:::tip Para tu portafolio
Sube el proyecto a GitHub con un README que tenga: el diagrama de arquitectura, cómo correrlo, decisiones de diseño (¿por qué incremental?, ¿por qué esa partición?), y capturas del tablero y del linaje. Eso vale más que cualquier certificado.
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
