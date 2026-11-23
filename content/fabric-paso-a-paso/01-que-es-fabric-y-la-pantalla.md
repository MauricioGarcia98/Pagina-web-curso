---
titulo: Qué es Microsoft Fabric y cómo es su pantalla
nivel: 1 · Básico
duracion: 30
resumen: Microsoft Fabric junta en un solo producto lo que en Azure son varios servicios - ingesta, data lake, Spark, warehouse y Power BI - sobre un único lago llamado OneLake. Qué problema resuelve, sus piezas principales (workspace, lakehouse, warehouse, notebook, pipeline, modelo semántico), cada zona de la pantalla y qué puedes practicar en la réplica.
objetivos: Explicar qué es Fabric y en qué se diferencia de armar la plataforma con servicios sueltos de Azure | Nombrar los ítems principales y para qué sirve cada uno | Ubicar la barra superior, la navegación y el centro de creación | Entender qué es OneLake | Saber qué es real y qué es simulado en la práctica
prerrequisitos: fundamentos-bienvenida
autoevaluacion: ¿Sabes qué es un workspace? | ¿Sabes la diferencia entre lakehouse y warehouse? | ¿Sabes qué es OneLake? | ¿Sabes dónde se crea un ítem nuevo?
---

:::analogia En palabras simples
Si armar una plataforma en Azure es comprar los muebles por separado (un almacenamiento, un Data Factory, un Databricks, un Power BI) y conectarlos, **Fabric es la casa amueblada**: todo viene junto, comparte el mismo lago de datos, los mismos permisos y la misma factura.
:::

## Paso 1 — Qué es Fabric

**Microsoft Fabric** es una plataforma de datos de punta a punta, como servicio. Todo vive en **OneLake**, un único data lake por organización, y cada herramienta lee y escribe ahí en formato **Delta**:

| Ítem | Qué es | Equivalente fuera de Fabric |
|---|---|---|
| **Lakehouse** | Archivos (Files) + tablas Delta (Tables), con un endpoint SQL de solo lectura | ADLS Gen2 + Databricks |
| **Warehouse** | Base analítica con T-SQL completo (lectura y escritura) | Synapse dedicated pool, Azure SQL |
| **Notebook** | Spark (PySpark, Spark SQL) | Notebooks de Databricks |
| **Pipeline** | Orquestación y copia | Azure Data Factory |
| **Semantic model** | El modelo de Power BI: tablas, relaciones y medidas | Modelo de Power BI |
| **Report** | El informe de Power BI | Power BI |

Este curso usa el mismo caso que los demás: el equipo de datos de **Tienda Andina**.

## Paso 2 — La pantalla de inicio

Abre el [Fabric de práctica](#/fabric):

```captura
archivo: fabric/b01-home.webp
texto: La página de inicio - la barra superior (1), la navegación (2) y los accesos para crear (3)
```

| Zona | Qué tiene |
|---|---|
| **1. Barra superior** | La búsqueda, el contador de la **capacidad de prueba** (Trial), notificaciones, ajustes y tu cuenta |
| **2. Navegación** | Home, Create, Browse, **Workspaces**, **OneLake**, **Monitor**, Real-Time, Workloads; y abajo, los ítems abiertos |
| **3. Create** | Accesos para crear un lakehouse, warehouse, notebook, pipeline o modelo semántico |

## Paso 3 — Create

**Create** muestra todos los tipos de ítem, agrupados por tarea:

```captura
archivo: fabric/b01-create.webp
texto: Create - Store data, Prepare data, Get data y los demás grupos
```

Los grupos siguen el recorrido de los datos: **Get data** (traer), **Store data** (guardar), **Prepare data** (transformar), **Analyze and train data** (analizar) y **Track data** (vigilar). En la práctica están Lakehouse, Warehouse, Notebook, Pipeline y Semantic model; los demás muestran un aviso.

## Paso 4 — Workspaces

**Workspaces** abre la lista de espacios de trabajo:

```captura
archivo: fabric/b01-workspaces.webp
texto: El panel de workspaces - My workspace y el botón New workspace
```

Todo ítem vive dentro de un **workspace**: la carpeta del equipo con sus permisos y su capacidad. **My workspace** es tu espacio personal; para trabajo de equipo se crea uno nuevo (lección siguiente).

:::nota Qué es real y qué es simulado en la práctica
Las pantallas, los nombres de botones, el lakehouse con Files y Tables, Load to Tables, los accesos directos, el endpoint SQL de solo lectura, el warehouse con T-SQL, los notebooks con PySpark y Spark SQL, los pipelines, el modelo semántico y la integración con Git siguen a Fabric. Lo simulado: todo corre en tu navegador con datos chicos; no hay capacidad real ni facturación. Los ítems de tiempo real (Eventstream, Eventhouse con KQL, Activator), Dataflow Gen2, Copy job, SQL database, Spark Job Definition y Experiment funcionan con datos de ejemplo que se generan solos; el KQL entiende los operadores más usados (where, project, extend, summarize, bin, top, render), no el lenguaje completo.
:::

:::errores
- **Buscar Fabric en el portal de Azure.** Fabric se usa desde su propio portal (app.fabric.microsoft.com); en Azure solo se compra la capacidad.
- **Copiar los mismos datos a cada herramienta.** En Fabric todos los ítems leen el mismo OneLake; duplicar tablas es justo lo que viene a evitar.
- **Elegir el ítem por costumbre.** T-SQL con escrituras va en un warehouse; Spark y archivos, en un lakehouse; si eliges al revés, te vas a chocar con lo que no permite.
:::

## ✅ Lo que lograste

- Sabes qué es Fabric y qué reemplaza.
- Conoces los ítems principales y OneLake.
- Ubicas cada zona de la pantalla.

:::ejercicio quiz
¿Qué es OneLake?
- [ ] Una cuenta de almacenamiento distinta para cada workspace
- [x] El único data lake de la organización, donde todos los ítems de Fabric guardan sus datos
- [ ] Una base de datos SQL
- [ ] Un conector de Power BI
:::

:::ejercicio quiz
Necesitas T-SQL con INSERT y UPDATE. ¿Qué ítem usas?
- [ ] Lakehouse
- [x] Warehouse
- [ ] Notebook
- [ ] Pipeline
:::

:::ejercicio quiz
¿Dónde viven los ítems de Fabric?
- [ ] En el portal de Azure
- [x] En un workspace
- [ ] En una suscripción de Azure, como recursos
- [ ] En Power BI Desktop
:::

:::ejercicio quiz
¿Qué ítem de Fabric equivale a Azure Data Factory?
- [ ] Notebook
- [ ] Lakehouse
- [x] Pipeline
- [ ] Dataflow Gen2, que es el único que copia datos
:::
