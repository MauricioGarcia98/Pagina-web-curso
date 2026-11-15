---
titulo: Tu primer lakehouse - Files y Tables
nivel: 1 · Básico
duracion: 35
resumen: El lakehouse es el centro de Fabric - un lugar con archivos crudos (Files) y tablas Delta (Tables) que leen Spark, SQL y Power BI. Creas lh_ventas desde New item, chocas con la regla de nombres, recorres el explorador y entiendes la diferencia entre Files y Tables y para qué sirve el endpoint SQL.
objetivos: Crear un lakehouse desde New item | Respetar las reglas de nombres | Distinguir la zona Files de la zona Tables | Ubicar el explorador, las acciones de inicio y el selector de modo
prerrequisitos: fabric-paso-a-paso-workspaces
autoevaluacion: ¿Sabes qué va en Files y qué en Tables? | ¿Sabes qué caracteres admite el nombre de un lakehouse? | ¿Sabes en qué formato están las tablas? | ¿Sabes qué es el SQL analytics endpoint?
---

## Paso 1 — New item

En el workspace, **New item**:

```captura
archivo: fabric/b03-nuevo-item.webp
texto: New item - todos los tipos de ítem agrupados, con un filtro arriba
```

Elige **Lakehouse**. Escribe `lh bronze` (con espacio) y **Create**:

```captura
archivo: fabric/b03-nombre-error.webp
texto: El nombre (1) no es válido - solo letras, números y guiones bajos, empezando con letra (2)
```

Los nombres de lakehouse y warehouse no admiten espacios ni guiones: se usan en SQL (`lh_ventas.dbo.pedidos`). Cierra, vuelve a abrir y escribe `lh_ventas`:

```captura
archivo: fabric/b03-nuevo-lakehouse.webp
texto: El nombre válido (1) y el workspace donde se crea (2)
```

## Paso 2 — El lakehouse

```captura
archivo: fabric/b03-lakehouse.webp
texto: El explorador con Tables y Files (1), las formas de traer datos (2) y el selector Lakehouse / SQL analytics endpoint (3)
```

| Zona | Qué guarda | Formato | Quién la usa |
|---|---|---|---|
| **Files** | Archivos como llegan: CSV, JSON, Parquet, imágenes | El original | Spark, pipelines |
| **Tables** | Tablas administradas | **Delta** (Parquet + registro de transacciones) | Spark, **SQL**, **Power BI** |

El paso típico es: los archivos llegan a **Files**, y con **Load to Tables**, un notebook o un pipeline se convierten en tablas en **Tables**.

:::analogia La bodega y la góndola
**Files** es la bodega: las cajas tal como llegan del proveedor. **Tables** es la góndola: los productos ordenados y etiquetados, listos para que cualquiera los tome. SQL y Power BI solo compran en la góndola.
:::

Arriba a la derecha, el selector cambia entre **Lakehouse** (archivos y tablas) y **SQL analytics endpoint**: una vista SQL de solo lectura de las mismas tablas, que se crea sola con cada lakehouse (lección 6).

## ✅ Lo que lograste

- Creaste `lh_ventas` respetando las reglas de nombres.
- Sabes qué va en Files y qué en Tables.

:::ejercicio quiz
¿Cuál es un nombre válido de lakehouse?
- [ ] `lh bronze`
- [ ] `lh-ventas`
- [x] `lh_ventas`
- [ ] `1_ventas`
:::

:::ejercicio quiz
Llega un CSV de las tiendas. ¿Dónde se guarda primero?
- [x] En Files
- [ ] En Tables
- [ ] En el endpoint SQL
- [ ] En el modelo semántico
:::

:::ejercicio quiz
¿En qué formato están las tablas de Tables?
- [ ] CSV
- [ ] JSON
- [x] Delta
- [ ] Excel
:::

:::ejercicio quiz
¿Quién puede leer las tablas de Tables?
- [ ] Solo Spark
- [x] Spark, el endpoint SQL y Power BI
- [ ] Solo Power BI
- [ ] Nadie
:::
