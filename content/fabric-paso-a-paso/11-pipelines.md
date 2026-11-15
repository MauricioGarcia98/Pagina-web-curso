---
titulo: Pipelines en Fabric - copiar y ejecutar notebooks en orden
nivel: 3 · Intermedio
duracion: 40
resumen: Los pipelines de Fabric son el Data Factory de Fabric. Creas pl_cargar_pedidos con una actividad Copy data que trae los pedidos a una tabla del lakehouse y una actividad Notebook que corre la transformación después, lo ejecutas y lees el resultado de cada actividad.
objetivos: Crear un pipeline en un workspace | Configurar Copy data con origen y destino | Encadenar una actividad Notebook | Ejecutar y leer la salida | Relacionar los pipelines de Fabric con Azure Data Factory
prerrequisitos: fabric-paso-a-paso-transformar-con-spark
autoevaluacion: ¿Sabes qué destinos admite Copy data en Fabric? | ¿Sabes en qué orden corren las actividades? | ¿Sabes dónde ves las filas copiadas? | ¿Sabes qué se parece a Data Factory?
---

## Paso 1 — Crear el pipeline

En el workspace, **New item → Pipeline**, `pl_cargar_pedidos`:

```captura
archivo: fabric/b11-pipeline-vacio.webp
texto: La cinta con Save, Run, Schedule y las actividades (1), y el lienzo vacío (2)
```

## Paso 2 — Copy data

**Copy data** y configura:

- **Name**: `Copiar pedidos`.
- **Source**: los datos de ejemplo, tabla `pedidos`.
- **Destination**: `lh_ventas`, tabla `pedidos_copia`.

```captura
archivo: fabric/b11-copy.webp
texto: El origen, el lakehouse de destino y la tabla nueva
```

En Fabric real, Copy data tiene los mismos más de 90 conectores que Data Factory (bases, archivos, APIs, otras nubes), y como destino un lakehouse, un warehouse u otros almacenes.

## Paso 3 — La actividad Notebook

**Notebook**, nombre `Transformar`, notebook `Notebook1`:

```captura
archivo: fabric/b11-notebook.webp
texto: Copiar pedidos y después Transformar (1), con sus propiedades (2)
```

La flecha indica la dependencia: el notebook corre **cuando la copia termina bien**.

## Paso 4 — Ejecutar

**Run**:

```captura
archivo: fabric/b11-run.webp
texto: Las dos actividades en verde (1) y la salida con filas leídas y copiadas (2)
```

`rowsRead: 12000, rowsCopied: 12000`: los 12 000 pedidos llegaron a `pedidos_copia`, y después corrió el notebook.

:::nota Si ya hiciste el curso de Data Factory
Todo lo que aprendiste allá vale aquí: actividades, dependencias, parámetros, expresiones, ForEach, If Condition, Lookup y triggers. La práctica de Fabric tiene solo Copy data y Notebook; para practicar lo demás usa el [curso de Data Factory](#/m/data-factory-paso-a-paso). Diferencias de Fabric: no hay linked services ni datasets separados (las conexiones se eligen en la actividad), no hay que publicar (se guarda y listo) y el monitoreo está en el Monitor de Fabric.
:::

## ✅ Lo que lograste

- Creaste un pipeline con copia y notebook encadenados.
- Lo ejecutaste y leíste la salida de cada actividad.

:::ejercicio quiz
¿En qué orden corren Copiar pedidos y Transformar?
- [ ] A la vez
- [x] Primero la copia y, si sale bien, el notebook
- [ ] Primero el notebook
- [ ] Al azar
:::

:::ejercicio quiz
¿Qué se diferencia de Azure Data Factory en los pipelines de Fabric?
- [x] No hay linked services ni datasets separados ni que publicar
- [ ] No hay actividad Copy
- [ ] No hay dependencias
- [ ] No se pueden ejecutar
:::

:::ejercicio quiz
¿Dónde ves cuántas filas copió la actividad?
- [ ] En el lakehouse, en Files
- [x] En la salida del pipeline (Output)
- [ ] En OneLake catalog
- [ ] No se puede ver
:::

:::ejercicio quiz
¿Qué destinos admite Copy data en Fabric?
- [ ] Solo archivos CSV
- [x] Un lakehouse, un warehouse u otros almacenes de datos
- [ ] Solo Power BI
- [ ] Solo OneDrive
:::
