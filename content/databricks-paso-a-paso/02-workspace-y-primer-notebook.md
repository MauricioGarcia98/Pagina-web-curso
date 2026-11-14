---
titulo: El workspace y tu primer notebook
nivel: 1 · Básico
duracion: 40
resumen: El explorador del workspace guarda tus notebooks, consultas y carpetas. Recorrer Home, Shared y la papelera, abrir el notebook de ejemplo, entender su cabecera (lenguaje, cómputo, Run all), ejecutar una celda SQL y una celda Python con Shift+Enter, crear tu propio notebook y renombrarlo, y los atajos que vas a usar todo el tiempo.
objetivos: Moverte por el explorador del workspace | Reconocer las partes de un notebook | Ejecutar celdas SQL y Python | Crear y renombrar un notebook | Usar los atajos básicos de celdas
prerrequisitos: databricks-paso-a-paso-que-es-databricks
autoevaluacion: ¿Sabes dónde está tu carpeta personal? | ¿Sabes qué hace Shift+Enter? | ¿Sabes cómo cambiar el lenguaje de una celda? | ¿Sabes crear un notebook nuevo?
---

:::analogia En palabras simples
Un notebook es un cuaderno con celdas: en cada una escribes un pedazo de código o un texto, lo ejecutas y el resultado aparece debajo. Es la herramienta principal de un ingeniero de datos en Databricks: ahí se explora, se prueba y se deja el código que después corre solo.
:::

## Paso 1 — El explorador del workspace

Menú lateral → **Workspace**:

```captura
archivo: databricks/d02-workspace.webp
texto: Las carpetas (1), la ruta actual (2) y el botón Create (3)
```

| Carpeta | Qué guarda |
|---|---|
| **Home** (`/Workspace/Users/tu@correo`) | Tus cosas: notebooks, consultas, carpetas |
| **Workspace** | La raíz: `Users` y `Shared` |
| **Shared** | Lo compartido con todo el equipo |
| **Trash** | Lo borrado (en Databricks real, 30 días) |

La ruta de arriba (2) son las "migas": cada parte es un enlace.

## Paso 2 — Abrir el notebook de ejemplo

Haz clic en **Introducción a Databricks**:

```captura
archivo: databricks/d02-notebook.webp
texto: Un notebook - título (1), lenguaje por defecto (2), cómputo conectado (3), Run all (4) y una celda (5)
```

| Parte | Qué es |
|---|---|
| **Título** (1) | Haz clic para renombrar |
| **Lenguaje** (2) | Python o SQL: el que usan las celdas que no dicen otra cosa |
| **Cómputo** (3) | La máquina que ejecuta. **Serverless** está lista al instante; un clúster propio se enciende y se apaga (nivel 3) |
| **Run all** (4) | Ejecuta todas las celdas en orden |
| **Celda** (5) | Un bloque de código o texto; su resultado aparece debajo |

## Paso 3 — Ejecutar una celda

Haz clic dentro de la segunda celda (la que empieza con `%sql`) y presiona **Shift + Enter**:

```captura
archivo: databricks/d02-celda-sql.webp
texto: El botón ▶ (1) también la ejecuta; el resultado (2) aparece como tabla debajo de la celda
```

`%sql` al principio dice "esta celda es SQL aunque el notebook sea Python". La consulta cuenta pedidos por canal en la tabla `samples.tienda.pedidos`.

Ahora la tercera celda, que es Python:

```captura
archivo: databricks/d02-celda-python.webp
texto: spark.table() lee la tabla y display() la muestra agrupada por estado - 9288 entregados, 967 cancelados
```

- `spark.table("samples.tienda.pedidos")` abre la tabla como un **DataFrame**.
- `display(df)` la muestra como tabla interactiva (ordenable, descargable, con el **+** para hacer gráficos).
- La primera celda Python tarda más: la práctica carga Python en tu navegador una sola vez.

:::nota El número de la celda
A la izquierda de cada celda ejecutada aparece `[1]`, `[2]`… el orden en que se corrieron. Si ves `[5]` arriba y `[2]` abajo, las celdas se ejecutaron en otro orden que el que se lee: un clásico de los notebooks que después da resultados raros. **Run all** las corre en orden.
:::

## Paso 4 — Crear tu notebook

Vuelve a **Workspace** → **Create**:

```captura
archivo: databricks/d02-crear.webp
texto: Create - Notebook, Query, Folder, File
```

```captura
archivo: databricks/d02-notebook-nuevo.webp
texto: El notebook nuevo - haz clic en el título (1) para renombrarlo; la primera celda (2) espera código
```

Escribe el nombre **Ventas por canal** y Enter. Lo vas a usar en todo el nivel.

## Paso 5 — Los atajos de celdas

| Atajo | Hace |
|---|---|
| **Shift + Enter** | Ejecuta y pasa a la siguiente celda (crea una si no hay) |
| **Ctrl + Enter** | Ejecuta y se queda en la celda |
| **Alt + Enter** | Ejecuta y crea una celda nueva debajo |
| **Ctrl + /** | Comenta o descomenta las líneas |
| **+ Code** / **+ Text** | Agregar una celda de código o de texto (Markdown) entre dos celdas |
| ↑ ↓ ⋯ (a la derecha de la celda) | Mover arriba o abajo, más opciones |

Una celda de texto empieza con `%md` y acepta Markdown (`#` títulos, `-` listas, `**negrita**`): sirve para explicar qué hace el notebook.

## ✅ Lo que lograste

- Te mueves por el workspace.
- Ejecutaste celdas SQL y Python y entendiste la cabecera del notebook.
- Creaste y renombraste tu notebook.

:::ejercicio quiz
¿Qué hace Shift + Enter en una celda?
- [ ] La borra
- [x] La ejecuta y pasa a la siguiente
- [ ] La convierte en texto
- [ ] Guarda el notebook
:::

:::ejercicio quiz
El notebook es Python y quieres una celda con SQL. ¿Qué haces?
- [ ] Creo otro notebook
- [x] Empiezo la celda con %sql
- [ ] Cambio el cómputo
- [ ] No se puede
:::

:::ejercicio quiz
¿Para qué sirve display(df)?
- [ ] Para borrar el DataFrame
- [x] Para mostrarlo como tabla interactiva, con orden, descarga y gráficos
- [ ] Para guardarlo en el catálogo
- [ ] Para imprimirlo en papel
:::

:::ejercicio quiz
¿Dónde queda un notebook que creas desde Workspace → Create en tu carpeta personal?
- [ ] En Shared
- [x] En /Workspace/Users/tu@correo
- [ ] En la papelera
- [ ] En Catalog
:::
