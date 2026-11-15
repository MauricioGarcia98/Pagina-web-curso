---
titulo: Datos de ejemplo y tablas Delta - propiedades y mantenimiento
nivel: 2 · Básico-intermedio
duracion: 35
resumen: Cargas las tablas de Tienda Andina como datos de ejemplo, recorres una tabla Delta grande, lees sus propiedades (dónde vive en OneLake y sus columnas) y conoces el mantenimiento que toda tabla Delta necesita - OPTIMIZE, V-Order y VACUUM - y por qué.
objetivos: Cargar datos de ejemplo en un lakehouse | Leer las propiedades de una tabla Delta | Entender qué es Delta y qué ventajas tiene | Conocer OPTIMIZE, V-Order y VACUUM
prerrequisitos: fabric-paso-a-paso-proyecto-primera-tabla
autoevaluacion: ¿Sabes qué agrega Delta sobre Parquet? | ¿Sabes dónde vive una tabla en OneLake? | ¿Sabes para qué sirve OPTIMIZE? | ¿Sabes qué riesgo tiene VACUUM?
---

## Paso 1 — Get data → Sample data

En `lh_ventas`, **Get data**:

```captura
archivo: fabric/b05-get-data.webp
texto: Get data - subir archivos, datos de ejemplo, accesos directos y pipelines
```

**Sample data**, marca `clientes`, `productos`, `pedidos` y `detalle_pedidos`:

```captura
archivo: fabric/b05-muestras.webp
texto: Las tablas de ejemplo de Tienda Andina
```

**Load**. Se agregan a Tables y, además, un CSV de ejemplo en `Files/raw`.

```captura
archivo: fabric/b05-tabla.webp
texto: Las tablas en el explorador (1) y la tabla pedidos con sus 12 000 filas (2)
```

## Paso 2 — Qué es Delta

Una tabla **Delta** son archivos **Parquet** (columnares y comprimidos) más un **registro de transacciones** (`_delta_log`). Ese registro agrega lo que un montón de archivos no tiene:

| Característica | Qué significa |
|---|---|
| **Transacciones ACID** | Una escritura queda completa o no queda: nadie lee una tabla a medio escribir |
| **Esquema** | La tabla rechaza filas que no coinciden con sus columnas |
| **Time travel** | Consultar la tabla como estaba ayer |
| **Un formato para todos** | Spark, el endpoint SQL y Power BI (Direct Lake) leen los mismos archivos, sin copias |

## Paso 3 — Propiedades

En el menú **…** de la tabla:

```captura
archivo: fabric/b05-menu-tabla.webp
texto: Properties, Maintenance, Copy ABFS path y Delete
```

**Properties**:

```captura
archivo: fabric/b05-propiedades.webp
texto: El tipo (Managed · Delta), la dirección en OneLake (URL y ABFS) y las columnas
```

La dirección `abfss://…@onelake.dfs.fabric.microsoft.com/…` es la misma forma que en ADLS Gen2: OneLake **es** un ADLS Gen2, así que cualquier herramienta que lee ADLS puede leer OneLake.

## Paso 4 — Mantenimiento

**Maintenance**:

```captura
archivo: fabric/b05-mantenimiento.webp
texto: Optimize (con V-Order) y VACUUM con un umbral de retención
```

| Comando | Qué hace | Cuándo |
|---|---|---|
| **OPTIMIZE** | Une muchos archivos chicos en pocos grandes | Después de muchas cargas pequeñas: las consultas se aceleran |
| **V-Order** | Ordena los datos dentro de los Parquet para que Power BI y SQL los lean más rápido | Al optimizar, sobre todo en tablas que lee Power BI |
| **VACUUM** | Borra los archivos que ya no usa ninguna versión de la tabla | Para no pagar almacenamiento de más |

:::cuidado VACUUM borra el pasado
Después de un VACUUM con retención de 7 días, ya no se puede hacer *time travel* más atrás de 7 días. No uses retenciones muy cortas en tablas que podrías necesitar restaurar.
:::

## ✅ Lo que lograste

- Cargaste datos de ejemplo y recorriste una tabla Delta.
- Sabes qué agrega Delta y dónde vive cada tabla en OneLake.
- Conoces el mantenimiento de las tablas.

:::ejercicio quiz
¿Qué agrega Delta sobre los archivos Parquet?
- [ ] Nada
- [x] Un registro de transacciones: ACID, esquema y time travel
- [ ] Compresión
- [ ] Gráficos
:::

:::ejercicio quiz
Hiciste 500 cargas pequeñas y las consultas están lentas. ¿Qué ejecutas?
- [x] OPTIMIZE
- [ ] VACUUM con 0 días
- [ ] DROP TABLE
- [ ] Nada
:::

:::ejercicio quiz
¿Qué pierdes después de un VACUUM con retención de 7 días?
- [ ] Las filas actuales
- [x] La posibilidad de consultar versiones de más de 7 días
- [ ] El esquema
- [ ] Los permisos
:::

:::ejercicio quiz
¿Por qué otras herramientas pueden leer OneLake?
- [ ] Porque es público
- [x] Porque OneLake expone la misma API que ADLS Gen2 (direcciones abfss)
- [ ] Porque copia los datos a cada herramienta
- [ ] No pueden
:::
