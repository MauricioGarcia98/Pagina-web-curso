---
titulo: Proyecto 1 (guiado) - de un CSV a una tabla Delta
nivel: 1 · Básico
duracion: 40
resumen: Llega el archivo de ventas de las tiendas y hay que dejarlo consultable. Lo subes a Files, lo revisas en la vista previa, lo cargas a una tabla con Load to Tables y verificas que la tabla tiene las filas y columnas correctas. Cada paso con su captura y una lista de verificación.
objetivos: Subir un archivo a Files | Revisar un CSV en la vista previa | Cargar un archivo a una tabla nueva | Verificar filas, columnas y tipos de la tabla
prerrequisitos: fabric-paso-a-paso-tu-primer-lakehouse
autoevaluacion: ¿Sabes subir un archivo? | ¿Sabes qué opción convierte un archivo en tabla? | ¿Sabes qué pasa con el encabezado? | ¿Sabes verificar la tabla creada?
---

:::escenario El pedido
Lucía: *"Te paso `ventas_tiendas.csv` con las ventas de esta semana. Dejalo como tabla en el lakehouse para que el equipo lo pueda consultar."*
:::

Crea en tu computadora `ventas_tiendas.csv`:

```text
venta_id,fecha,tienda,producto_id,cantidad,precio_unitario
2001,2026-11-10,Lima Centro,101,1,9.90
2002,2026-11-11,Bogotá Norte,108,2,22.90
2003,2026-11-12,CDMX Roma,115,3,35.90
2004,2026-11-13,Santiago Providencia,122,4,48.90
```

(Las capturas usan un archivo de 12 filas con la misma forma.)

## Paso 1 — Subir a Files

En `lh_ventas`, **Upload files** y elige el archivo:

```captura
archivo: fabric/b04-files.webp
texto: El archivo en Files (1 y 2), con su fecha, tipo y tamaño
```

## Paso 2 — Revisar

Haz clic en el archivo:

```captura
archivo: fabric/b04-preview.webp
texto: La vista previa del CSV (2) y el botón Load to Tables (1)
```

Mira que las columnas estén bien separadas y que la primera fila sea el encabezado.

## Paso 3 — Load to Tables

**Load to Tables**:

```captura
archivo: fabric/b04-cargar.webp
texto: El nombre de la tabla (1), usar el encabezado (2) y el separador (3)
```

| Opción | Qué hace |
|---|---|
| **New table** / **Existing table (append)** | Crear una tabla o agregar filas a una que existe (con las mismas columnas) |
| **Table name** | Minúsculas, números y guiones bajos |
| **Use header for column names** | La primera fila da los nombres de columna |
| **Separator** | El delimitador del CSV |

**Load**:

```captura
archivo: fabric/b04-tabla.webp
texto: La tabla ventas_tiendas en Tables (1) con sus filas, columnas y tipos (2)
```

Arriba de cada columna se ve el **tipo** que Fabric detectó (`int`, `date`, `string`, `double`).

## ✅ Lista de verificación

- [ ] `ventas_tiendas.csv` está en Files.
- [ ] Existe la tabla `ventas_tiendas` en Tables/dbo.
- [ ] La tabla tiene las mismas filas que el archivo, sin el encabezado como fila.
- [ ] `fecha` se detectó como fecha y `precio_unitario` como número.

:::cuidado Append con cuidado
**Existing table (append)** agrega filas: si cargas el mismo archivo dos veces, las ventas quedan **duplicadas**. Para cargas repetidas conviene un notebook o un pipeline que controle qué se cargó (niveles 3 y 5).
:::

## Lo que aprendiste en el nivel 1

- Qué es Fabric, OneLake y sus ítems.
- Workspaces, licencias y ajustes.
- Lakehouse: Files, Tables y Load to Tables.

:::ejercicio quiz
¿Qué opción convierte un CSV de Files en una tabla?
- [ ] New shortcut
- [x] Load to Tables
- [ ] New semantic model
- [ ] Refresh
:::

:::ejercicio quiz
Cargas el mismo archivo dos veces con "Existing table (append)". ¿Qué pasa?
- [ ] Nada, Fabric lo detecta
- [x] Las filas quedan duplicadas
- [ ] Falla
- [ ] Se reemplaza la tabla
:::

:::ejercicio quiz
¿Qué indica el texto chico arriba de cada columna de la tabla?
- [ ] El autor
- [x] El tipo de dato detectado
- [ ] El tamaño
- [ ] El color
:::

:::ejercicio quiz
¿Para qué sirve "Use header for column names"?
- [x] Para que la primera fila dé los nombres de columna
- [ ] Para borrar la primera fila sin usarla
- [ ] Para ordenar las columnas
- [ ] Para cambiar el separador
:::
