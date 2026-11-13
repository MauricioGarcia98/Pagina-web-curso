---
titulo: Markdown y archivos - explicar con texto, crear notebooks, carpetas y abrir los datos
nivel: 1 · Básico
duracion: 40
resumen: Un notebook no es solo código - el texto que explica es lo que lo vuelve útil para otros. Cómo escribir celdas Markdown (títulos, negrita, listas, tablas, código), cómo moverte por el explorador de archivos, abrir un CSV en el visor, crear un notebook nuevo, renombrarlo, duplicarlo y borrarlo con el menú contextual.
objetivos: Escribir celdas Markdown con títulos, listas, negrita y código | Navegar carpetas en el explorador de archivos | Abrir un CSV en el visor de tablas | Crear, renombrar, duplicar y borrar archivos | Entender las rutas relativas (datos/pedidos.csv)
prerrequisitos: jupyterlab-celdas-y-modos
autoevaluacion: ¿Sabes hacer un título en Markdown? | ¿Sabes abrir un CSV sin escribir código? | ¿Sabes renombrar un notebook? | ¿Sabes qué significa la ruta datos/pedidos.csv?
---

:::analogia En palabras simples
Las celdas Markdown son los textos del informe: el título, la explicación de qué vas a hacer y la conclusión. Un notebook sin texto es como una planilla sin rótulos: funciona, pero nadie más lo entiende, ni tú dentro de tres meses.
:::

## Paso 1 — Edita una celda Markdown

1. En **Bienvenida.ipynb**, haz **doble clic** en el texto de "Un gráfico". Se abre el código Markdown y el desplegable de tipo dice **Markdown** (1).

```captura
archivo: jupyter/02-markdown-editando.webp
texto: Una celda Markdown en edición: el texto con su marcado y el tipo de celda (1)
```

2. Presiona **Shift + Enter** para "ejecutarla": vuelve a verse con formato.

## Paso 2 — Lo que vas a escribir siempre en Markdown

| Escribes | Se ve |
|---|---|
| `# Título` | Título principal |
| `## Sección` | Subtítulo |
| `**importante**` | **importante** |
| `*nota*` | *nota* |
| `- punto` | Una lista con viñetas |
| `1. paso` | Una lista numerada |
| `` `pedidos.csv` `` | `pedidos.csv` (código en línea) |
| `[texto](https://…)` | Un enlace |

Practica: agrega una celda abajo (**B**), conviértela en Markdown (**M**), Enter, escribe:

```text
## Mis notas
- El archivo tiene **12.000 pedidos**.
- Columnas clave: `estado` y `canal`.
```

y Shift + Enter.

:::tip Los títulos arman el índice
Cada título (`#`, `##`) aparece en la **tabla de contenidos** (tercer ícono de la barra lateral). En un notebook largo es la forma de saltar entre secciones. Lo usamos en el nivel 6.
:::

## Paso 3 — El explorador de archivos

1. En el panel de la izquierda, haz **doble clic** en la carpeta **datos**. Arriba aparece la ruta (1) y la lista de archivos.

```captura
archivo: jupyter/03-carpeta-datos.webp
texto: La carpeta datos/: la ruta (1) y el archivo pedidos.csv (2)
```

2. Haz **doble clic** en **pedidos.csv**: se abre en el visor de tablas, en su propia pestaña.

```captura
archivo: jupyter/03-visor-csv.webp
texto: El CSV abierto en el visor, en una pestaña nueva
```

3. Para volver a la carpeta principal, haz clic en el ícono de carpeta de la ruta, arriba del explorador.

:::nota Rutas relativas
En el código escribimos `pd.read_csv("datos/pedidos.csv")`: "desde la carpeta donde está el notebook, entra a `datos/` y abre `pedidos.csv`". Si el notebook estuviera dentro de otra carpeta, la ruta cambiaría. El error `FileNotFoundError` casi siempre es una ruta mal escrita.
:::

## Paso 4 — Crea, renombra y organiza

1. **File → New → Notebook** (o el Launcher).

```captura
archivo: jupyter/03-menu-file.webp
texto: El menú File: New Notebook (1)
```

2. Aparece **Untitled.ipynb** en el explorador (1) y abierto en una pestaña (2).

```captura
archivo: jupyter/03-notebook-nuevo.webp
texto: El notebook nuevo en el explorador (1) y en su pestaña (2)
```

3. **Clic derecho** sobre Untitled.ipynb en el explorador → **Rename**.

```captura
archivo: jupyter/03-clic-derecho.webp
texto: El menú contextual del explorador: Rename (1), Delete, Duplicate, Download…
```

4. Escribe `analisis_pedidos.ipynb` y **Rename**.

```captura
archivo: jupyter/03-renombrar.webp
texto: El cuadro para renombrar el archivo
```

| Opción del menú contextual | Hace |
|---|---|
| Open | Abre el archivo |
| Rename | Cambia el nombre (también: F2 sobre el archivo en JupyterLab real) |
| Delete | Borra el archivo |
| Duplicate | Crea una copia (`…-Copy1.ipynb`) |
| Download | Lo descarga a tu computadora |
| Copy Path | Copia la ruta, para usarla en el código |

:::tip Nombres de archivo
Sin espacios ni tildes, en minúscula y que digan qué hay: `analisis_pedidos_2024.ipynb`, no `Untitled3.ipynb`. Con el botón **New Folder** del explorador puedes agrupar notebooks por proyecto.
:::

## ✅ Lo que lograste

- Escribes texto con formato en celdas Markdown.
- Navegas carpetas y abres CSV en el visor.
- Creas, renombras y organizas archivos.

:::ejercicio quiz
¿Qué escribes en una celda Markdown para un subtítulo?
- [ ] `<subtitulo>`
- [x] `## Subtítulo`
- [ ] `**Subtítulo**`
- [ ] `# # Subtítulo #`
:::

:::ejercicio quiz
Tu notebook está en la carpeta principal y el archivo en `datos/ventas.csv`. ¿Qué ruta usas?
- [ ] `ventas.csv`
- [x] `datos/ventas.csv`
- [ ] `/ventas/datos.csv`
- [ ] `datos\ventas`
:::

:::ejercicio quiz
¿Cómo renombras un notebook desde el explorador?
- [ ] Doble clic en la pestaña
- [x] Clic derecho sobre el archivo → Rename
- [ ] Kernel → Rename
- [ ] Editando la primera celda
:::
