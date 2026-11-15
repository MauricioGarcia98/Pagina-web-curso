---
titulo: Datasets - qué datos, en qué formato y dónde
nivel: 1 · Básico
duracion: 40
resumen: Un dataset le dice a Data Factory qué datos usar dentro de una conexión - contenedor, carpeta, archivo y formato. Creas el dataset de origen de las ventas en raw, ves sus datos con Preview data, lees su JSON, provocas el error de un contenedor mal escrito, y creas el dataset de destino en bronze y uno en formato JSON para las devoluciones.
objetivos: Crear un dataset CSV sobre ADLS Gen2 | Elegir carpeta, archivo, delimitador y encabezado | Verificar un dataset con Preview data | Interpretar el error FilesystemNotFound | Crear un dataset JSON
prerrequisitos: data-factory-paso-a-paso-linked-services
autoevaluacion: ¿Sabes qué pasa si dejas el archivo vacío? | ¿Sabes para qué sirve First row as header? | ¿Sabes por qué "Raw" no es lo mismo que "raw"? | ¿Sabes por qué conviene un dataset para el origen y otro para el destino?
---

## Paso 1 — Qué es un dataset

Un **dataset** apunta a datos concretos dentro de un linked service:

| Parte | Ejemplo |
|---|---|
| **Linked service** | `ls_adls_tiendaandina` |
| **File path** | contenedor `raw` / carpeta `ventas` / archivo (vacío = todos) |
| **Formato** | DelimitedText (CSV), JSON, Parquet… |
| **Opciones del formato** | Delimitador `,`, la primera fila es el encabezado |

## Paso 2 — El dataset de origen

En **Author**, el botón **+** junto a *Factory Resources*:

```captura
archivo: adf/b03-menu-nuevo.webp
texto: El menú + - Pipeline o Dataset
```

Elige **Dataset** y completa:

1. **Format**: DelimitedText (CSV).
2. **Name**: `ds_raw_ventas`.
3. **Linked service**: `ls_adls_tiendaandina`.
4. **File path**: contenedor `raw`, carpeta `ventas`, archivo vacío.
5. **First row as header**: marcado.

```captura
archivo: adf/b03-nuevo-dataset.webp
texto: New dataset - formato (1), nombre (2), conexión (3), contenedor (4), carpeta (5) y encabezado (6)
```

Con el **archivo vacío**, el dataset representa **todos los archivos de la carpeta**. Es lo habitual en el origen: cada día llega un archivo nuevo con otro nombre.

```captura
archivo: adf/b03-dataset.webp
texto: El dataset en Factory Resources (1), su configuración (2) y su barra (3) con Code, Preview data y Delete
```

## Paso 3 — Preview data

Haz clic en **Preview data**:

```captura
archivo: adf/b03-preview.webp
texto: Las primeras filas del primer archivo de la carpeta, con sus columnas
```

Antes de usar un dataset en un pipeline, **siempre** mira la vista previa: confirma que llegas a los datos (permisos y ruta) y que el formato es el correcto (delimitador, encabezado). Si las columnas aparecen todas juntas en una sola, el delimitador está mal.

## Paso 4 — El JSON del dataset

**Code**:

```captura
archivo: adf/b03-json.webp
texto: La definición JSON - el linked service, la ubicación (fileSystem y folderPath) y las opciones del CSV
```

En ADLS Gen2, el contenedor se llama **fileSystem** y la carpeta **folderPath**. Es el mismo JSON que verás en Git y en las plantillas ARM.

## Paso 5 — Un error a propósito

Crea un dataset `ds_prueba` igual al anterior, pero con el contenedor escrito `Raw` (con mayúscula), y haz **Preview data**:

```captura
archivo: adf/b03-preview-error.webp
texto: El contenedor "Raw" (1) no existe - FilesystemNotFound (2)
```

Los nombres de contenedor en Azure son **siempre en minúsculas**: `Raw` y `raw` no son lo mismo. **FilesystemNotFound** quiere decir "ese contenedor no existe en esa cuenta". Borra `ds_prueba` con **Delete**.

## Paso 6 — El destino y un dataset JSON

Crea dos datasets más:

| Nombre | Formato | Contenedor / carpeta | Para qué |
|---|---|---|---|
| `ds_bronze_ventas` | DelimitedText | `bronze` / `ventas` | Destino de la copia de ventas |
| `ds_raw_devoluciones` | JSON | `raw` / `devoluciones` | Las devoluciones, que llegan en JSON |

```captura
archivo: adf/b03-preview-json.webp
texto: Los tres datasets (1) y la vista previa del JSON de devoluciones (2)
```

:::tip Un dataset por lugar, no por archivo
Un error común es crear un dataset por cada archivo (`ds_ventas_12`, `ds_ventas_13`…). Se crea **uno por carpeta** y el archivo se elige en la actividad, con comodines o con expresiones (lecciones 6 y 13).
:::

## ✅ Lo que lograste

- Creaste datasets de origen y destino, en CSV y en JSON.
- Verificas cada dataset con Preview data.
- Sabes leer su JSON y el error de un contenedor inexistente.

:::ejercicio quiz
Dejas el campo de archivo vacío en un dataset. ¿Qué representa?
- [ ] Ningún archivo
- [x] Todos los archivos de la carpeta
- [ ] Solo el más reciente
- [ ] El primero en orden alfabético
:::

:::ejercicio quiz
En Preview data todas las columnas aparecen juntas en una sola. ¿Qué revisas?
- [ ] Los permisos
- [x] El delimitador de columnas
- [ ] El nombre del dataset
- [ ] El trigger
:::

:::ejercicio quiz
¿Qué significa "FilesystemNotFound"?
- [x] El contenedor no existe en esa cuenta (por ejemplo, por una mayúscula)
- [ ] El archivo está vacío
- [ ] Falta un rol
- [ ] La cuenta está apagada
:::

:::ejercicio quiz
Llegan archivos de ventas nuevos todos los días. ¿Cuántos datasets de origen creas?
- [ ] Uno por archivo
- [x] Uno para la carpeta; el archivo se elige en la actividad
- [ ] Uno por mes
- [ ] Ninguno
:::
