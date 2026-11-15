---
titulo: Notebooks - Spark sobre el lakehouse
nivel: 3 · Intermedio
duracion: 35
resumen: Los notebooks de Fabric corren Spark (PySpark y Spark SQL) con un lakehouse por defecto. Abres un notebook desde el lakehouse, recorres su explorador, ejecutas la primera celda que lee la tabla de ventas y entiendes la sesión de Spark, las celdas de código y de texto, y cómo se cambia el lenguaje.
objetivos: Crear un notebook adjunto a un lakehouse | Entender el lakehouse por defecto | Ejecutar celdas y leer su salida | Distinguir celdas de código y Markdown | Cambiar de lenguaje con %%sql
prerrequisitos: fabric-paso-a-paso-proyecto-lakehouse-ordenado
autoevaluacion: ¿Sabes qué significa el lakehouse por defecto? | ¿Sabes cómo escribir una celda en Spark SQL? | ¿Sabes qué es la sesión de Spark? | ¿Sabes leer un archivo de Files desde un notebook?
---

## Paso 1 — Abrir un notebook desde el lakehouse

En `lh_ventas`, **Open notebook → New notebook**:

```captura
archivo: fabric/b09-notebook.webp
texto: El lakehouse por defecto (1), la primera celda (2) y Run all (3)
```

| Zona | Qué tiene |
|---|---|
| **Explorer** | El lakehouse **por defecto** (con estrella), sus tablas y archivos |
| **Celdas** | Código (PySpark por defecto) o texto (Markdown) |
| **Cinta** | Run all, Stop session, + Code, + Markdown |

El **lakehouse por defecto** es al que se refieren los nombres cortos: `spark.table("pedidos")` lee `lh_ventas.pedidos`, y `Files/raw/…` es una carpeta de ese lakehouse.

## Paso 2 — Ejecutar

La celda que creó Fabric lee la tabla:

```python norun
df = spark.sql("SELECT * FROM lh_ventas.ventas_tiendas LIMIT 1000")
display(df)
```

**Run all**:

```captura
archivo: fabric/b09-celda.webp
texto: La celda ejecutada - el tiempo, "Command executed" y la tabla con sus tipos
```

La primera ejecución tarda más: arranca la **sesión de Spark** (en Fabric real, unos segundos gracias a los *starter pools*). Las siguientes celdas usan la misma sesión. **Stop session** la apaga: en una capacidad real, una sesión encendida consume capacidad.

## Paso 3 — Los lenguajes

| Escribes | Lenguaje |
|---|---|
| Nada (por defecto) | **PySpark** (Python) |
| `%%sql` en la primera línea | **Spark SQL** |
| Celda **Markdown** | Texto con formato para documentar |

Formas habituales de leer datos:

```python norun
# una tabla del lakehouse
pedidos = spark.table("pedidos")

# un archivo de Files
crudo = spark.read.csv("Files/raw/pedidos_2024.csv", header=True)

# SQL desde Python
resumen = spark.sql("SELECT canal, COUNT(*) AS n FROM pedidos GROUP BY canal")
```

:::tip Documenta en el mismo notebook
Una celda Markdown al principio con **qué hace el notebook, qué lee y qué escribe** ahorra horas al próximo que lo abra (que puedes ser tú en tres meses).
:::

## ✅ Lo que lograste

- Abriste un notebook con lakehouse por defecto y ejecutaste celdas.
- Conoces la sesión de Spark y los lenguajes de las celdas.

:::ejercicio quiz
¿Qué lee `spark.table("pedidos")` en un notebook con lh_ventas por defecto?
- [ ] Una tabla de otro workspace
- [x] La tabla pedidos de lh_ventas
- [ ] Un archivo CSV
- [ ] Nada, da error
:::

:::ejercicio quiz
¿Cómo escribes una celda en Spark SQL?
- [ ] Con `#sql` al final
- [x] Con `%%sql` en la primera línea
- [ ] No se puede
- [ ] Cambiando el workspace
:::

:::ejercicio quiz
¿Por qué tarda más la primera celda?
- [x] Porque arranca la sesión de Spark
- [ ] Porque descarga Fabric
- [ ] Porque la tabla es grande siempre
- [ ] Porque hay un error
:::

:::ejercicio quiz
¿Cómo lees un CSV de Files/raw?
- [ ] `spark.table("raw")`
- [x] `spark.read.csv("Files/raw/archivo.csv", header=True)`
- [ ] `SELECT * FROM Files`
- [ ] `open("raw")`
:::
