---
titulo: ¿Qué es Databricks? Recorrido por la plataforma
nivel: Básico
duracion: 25
resumen: Workspace, cómputo (clusters, SQL warehouses, serverless), Unity Catalog, notebooks, jobs y costos (DBUs).
---

**Databricks** es una plataforma de datos en la nube (Azure, AWS y GCP) creada por los autores de Spark. Reúne en un solo lugar el **lakehouse**: almacenamiento barato en el data lake + tablas Delta confiables + Spark + SQL + orquestación + gobierno + machine learning.

## El problema que resolvió: lago vs. warehouse

Durante años, las empresas tuvieron **dos** sistemas de datos separados, cada uno con sus limitaciones:

| | Data warehouse (Teradata, Redshift, Snowflake…) | Data lake (archivos en S3 / ADLS / HDFS) | **Lakehouse** (Databricks, Delta/Iceberg) |
|---|---|---|---|
| Qué guarda | Tablas estructuradas | Cualquier archivo: CSV, JSON, imágenes, logs | Tablas abiertas sobre archivos del lago |
| Costo de almacenamiento | Alto | Muy bajo | Muy bajo |
| Transacciones (ACID), `UPDATE`, `MERGE` | Sí | No (archivos sueltos) | **Sí** (gracias a Delta Lake) |
| SQL rápido para BI | Sí | Lento | Sí |
| Machine learning, Python, streaming | Limitado | Sí | Sí |
| Formato | Cerrado (propietario) | Abierto | **Abierto** (Parquet + Delta/Iceberg) |

El resultado era copiar los datos del lago al warehouse (con su costo y sus desfasajes), y tener dos verdades distintas. El **lakehouse** propone **una sola copia** en el lago, con una capa de tablas (Delta Lake) que le da las garantías de un warehouse. Databricks es la plataforma que popularizó esa idea, y la usan desde startups hasta bancos.

:::analogia Una casa con depósito y biblioteca juntos
El lago era un depósito enorme y barato donde se tiraba todo en cajas. El warehouse, una biblioteca ordenada pero cara, adonde había que llevar copias de lo útil. El lakehouse pone **fichas de biblioteca** (el registro de Delta) sobre las cajas del depósito: los datos siguen en el depósito barato, pero ordenados y consultables como en una biblioteca.
:::

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

<!-- dg:dbx01-planos -->
```diagrama
titulo: Databricks por dentro: el plano de control es de Databricks, los datos quedan en tu nube
nodo u: Tú (navegador, CLI) | icono=usuario | col=0 | fila=0
nodo cp: Plano de control | icono=engranaje | col=1 | fila=0 | color=violeta | sub=workspace, notebooks, jobs
nodo uc: Unity Catalog | icono=candado | col=2 | fila=0 | color=amarillo | sub=permisos y linaje
nodo cl: Clústeres / serverless | icono=spark | col=1 | fila=1 | color=rojo | sub=cómputo
nodo st: Tu almacenamiento | icono=bucket | col=2 | fila=1 | color=naranja | sub=S3 · ADLS · GCS (Delta)
grupo nube: Tu cuenta de nube (plano de datos) | nodos=cl,st | color=azul
flecha u -> cp
flecha cp -> cl: lanza
flecha cl <-> st: lee / escribe
flecha uc -> cl: ¿puede leer? | estilo=punteada
```

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
