---
titulo: ¿Qué es Databricks? Recorrido por la plataforma
nivel: Básico
duracion: 25
resumen: Workspace, cómputo (clusters, SQL warehouses, serverless), Unity Catalog, notebooks, jobs y costos (DBUs).
---

**Databricks** es una plataforma de datos en la nube (Azure, AWS y GCP) creada por los autores de Spark. Reúne en un solo lugar el **lakehouse**: almacenamiento barato en el data lake + tablas Delta confiables + Spark + SQL + orquestación + gobierno + machine learning.

## Las piezas del workspace

| Pieza | Qué es |
|---|---|
| **Workspace** | Tu entorno web: carpetas, notebooks, repos Git, jobs, tableros |
| **Notebooks** | Documentos con celdas de Python, SQL, Scala o Markdown |
| **Git folders (Repos)** | Carpetas vinculadas a un repositorio Git |
| **Compute** | Dónde se ejecuta el código (ver tabla siguiente) |
| **Catalog (Unity Catalog)** | Tablas, vistas, volúmenes, funciones y modelos, con permisos y linaje |
| **Jobs / Workflows (Lakeflow Jobs)** | Programar y orquestar notebooks, scripts, dbt y SQL |
| **SQL Editor / Dashboards** | SQL para analistas y tableros |
| **Lakeflow Declarative Pipelines** | Pipelines declarativos batch/streaming (antes Delta Live Tables) |

## Tipos de cómputo

| Tipo | Uso | Comentario |
|---|---|---|
| **All-purpose cluster** | Desarrollo interactivo en notebooks | Cuesta más: apágalo cuando no lo uses (auto-terminación) |
| **Job cluster** | Se crea para un job y se destruye al terminar | Más barato para producción |
| **SQL warehouse** | Consultas SQL, BI, dbt | Optimizado con Photon; existe versión serverless |
| **Serverless compute** | Notebooks y jobs sin administrar clusters | Arranca en segundos; Databricks gestiona la infraestructura |

Un cluster tiene un **driver** y **workers** (¿te acuerdas de la arquitectura de Spark?), una versión de **Databricks Runtime** (Spark + librerías) y un tipo de máquina.

## Unity Catalog

El **gobierno de datos** centralizado:

```text
Metastore (por región)
 └── Catálogo (main, dev, prod)
      └── Esquema (bronze, silver, gold, ventas)
           ├── Tablas y vistas        → main.ventas.pedidos
           ├── Volúmenes (archivos)    → /Volumes/main/crudo/archivos/
           ├── Funciones
           └── Modelos de ML
```

Permisos con SQL (`GRANT SELECT ON TABLE ... TO grupo`), linaje automático columna a columna, auditoría, y acceso al almacenamiento mediante **storage credentials** y **external locations**.

## Costos: DBUs

Databricks cobra en **DBUs** (*Databricks Units*) por hora de cómputo, según el tipo de cómputo y el plan, **además** de las máquinas virtuales de la nube (en cómputo clásico). Consejos: auto-terminación de clusters, job clusters para producción, autoscaling, políticas de cómputo, y revisar las tablas de sistema de facturación (`system.billing.usage`).

:::ejercicio quiz
¿Qué tipo de cómputo conviene para un job de producción que corre una vez por noche?

- [ ] Un all-purpose cluster siempre encendido
- [x] Un job cluster (o serverless) que se crea para la ejecución y se apaga al terminar
- [ ] La laptop del analista
- [ ] Un SQL warehouse para correr Python
:::

:::ejercicio quiz
En Unity Catalog, ¿cómo se nombra completamente una tabla?

- [ ] `tabla`
- [ ] `esquema.tabla`
- [x] `catalogo.esquema.tabla`
- [ ] `workspace/tabla`
:::
