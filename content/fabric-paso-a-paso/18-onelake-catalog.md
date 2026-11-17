---
titulo: OneLake catalog - encontrar datos y sus rutas
nivel: 5 · Avanzado
duracion: 35
resumen: OneLake es el único lago de datos de la organización y el catálogo es su buscador. Filtras por tipo de ítem, ves dueño, workspace y última actualización, y copias la ruta ABFS de una carpeta para leerla desde Spark o desde fuera de Fabric.
objetivos: Explicar qué es OneLake | Buscar y filtrar ítems en el catálogo | Copiar la ruta ABFS o relativa de un archivo | Entender las pestañas Govern y Secure
prerrequisitos: fabric-paso-a-paso-monitor
autoevaluacion: ¿Sabes cuántos OneLake tiene una organización? | ¿Sabes filtrar el catálogo por tipo? | ¿Sabes para qué sirve la ruta ABFS? | ¿Sabes qué diferencia hay entre ruta ABFS y relativa?
---

## Paso 1 — Qué es OneLake

:::analogia OneDrive para datos
Así como OneDrive guarda los documentos de toda la empresa en un solo lugar, **OneLake** guarda los datos de todos los workspaces. Hay **uno por organización** (por tenant). Cada lakehouse y warehouse es una carpeta dentro de él, y todo se guarda en formato Delta abierto.
:::

## Paso 2 — Recorrer el catálogo

Barra izquierda → **OneLake**:

```captura
archivo: fabric/b18-onelake.webp
texto: Los filtros por tipo (1) y los ítems con su tipo, workspace, dueño y última actualización (2)
```

Las pestañas de arriba:

| Pestaña | Para qué |
|---|---|
| **Explore** | Buscar ítems de datos |
| **Govern** | Ver el estado de gobierno: etiquetas de sensibilidad, ítems sin descripción, certificados |
| **Secure** | Revisar quién tiene acceso a qué |

Filtra por **Lakehouse**:

```captura
archivo: fabric/b18-filtro.webp
texto: El filtro Lakehouse activo - solo quedan lh_ventas y lh_reportes, cada uno con su SQL analytics endpoint
```

:::tip Endorsement y Sensitivity
**Endorsement** marca un ítem como *Promoted* o *Certified* (confiable para usar). **Sensitivity** muestra la etiqueta de Microsoft Purview (Confidencial, General…). En una empresa grande, busca primero lo certificado antes de crear una copia propia.
:::

## Paso 3 — Copiar la ruta de un archivo

En `lh_ventas`, carpeta **Files/raw**, menú **…** del archivo:

```captura
archivo: fabric/b18-abfs.webp
texto: Load to Tables, Copy ABFS path, Copy relative path for Spark y Delete
```

| Ruta | Forma | Dónde se usa |
|---|---|---|
| **ABFS** | `abfss://<workspace>@onelake.dfs.fabric.microsoft.com/<lakehouse>.Lakehouse/Files/raw/pedidos_2024.csv` | Desde cualquier lado: otro workspace, Azure Databricks, herramientas con el conector de ADLS |
| **Relativa** | `Files/raw/pedidos_2024.csv` | En un notebook con ese lakehouse como predeterminado |

```python norun
df = spark.read.option("header", True).csv("Files/raw/pedidos_2024.csv")
```

OneLake habla la misma API que Azure Data Lake Storage Gen2: por eso las herramientas que ya leían ADLS también leen OneLake.

:::errores
- **Pensar que hay un OneLake por workspace.** Hay uno por organización; los workspaces son carpetas dentro de él.
- **Copiar la URL del navegador para leer desde otra herramienta.** La ruta que sirve es la ABFS.
- **Usar cualquier tabla del catálogo sin mirar si está certificada.** Prefiere los ítems marcados como confiables.
:::

## ✅ Lo que lograste

- Sabes qué es OneLake y cómo buscar en su catálogo.
- Copiaste rutas ABFS y relativas.

:::ejercicio quiz
¿Cuántos OneLake tiene una organización?
- [x] Uno
- [ ] Uno por workspace
- [ ] Uno por lakehouse
- [ ] Ninguno
:::

:::ejercicio quiz
Quieres leer un archivo del lakehouse desde Azure Databricks. ¿Qué ruta copias?
- [ ] La relativa
- [x] La ABFS
- [ ] El nombre del archivo
- [ ] La URL del navegador
:::

:::ejercicio quiz
¿Qué significa que un ítem esté "Certified"?
- [ ] Que está vacío
- [x] Que fue marcado como confiable para usar
- [ ] Que es de pago
- [ ] Que se actualiza todos los días
:::

:::ejercicio quiz
¿Por qué las herramientas que leían ADLS Gen2 pueden leer OneLake?
- [ ] No pueden
- [x] Porque OneLake expone la misma API que ADLS Gen2
- [ ] Porque copian los datos
- [ ] Porque Fabric copia cada tabla a una cuenta de ADLS
:::
