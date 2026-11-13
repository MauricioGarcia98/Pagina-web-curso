---
titulo: Archivos y carpetas - abrir, crear, renombrar y moverte rápido por un proyecto
nivel: 1 · Básico
duracion: 35
resumen: Cómo se maneja un proyecto con muchos archivos. Abrir archivos desde el explorador, leer las pestañas y las migas de pan, saltar a cualquier archivo por su nombre con Ctrl+P, crear archivos y carpetas desde el explorador, el menú contextual (renombrar, eliminar, copiar ruta, abrir en la terminal) y el punto que indica cambios sin guardar.
objetivos: Abrir archivos y carpetas desde el explorador | Leer pestañas, migas de pan y el indicador de cambios sin guardar | Abrir cualquier archivo por su nombre con Ctrl+P | Crear archivos y carpetas (incluso con subcarpetas en un paso) | Usar el menú contextual para renombrar, eliminar y copiar rutas
prerrequisitos: vscode-la-pantalla
autoevaluacion: ¿Sabes abrir un archivo sin buscarlo en el árbol? | ¿Sabes qué significa el punto en una pestaña? | ¿Sabes crear notas/ideas.md en un paso? | ¿Sabes renombrar un archivo?
---

:::analogia En palabras simples
El explorador es el índice del proyecto; las pestañas, los documentos que tienes abiertos sobre la mesa. Con Ctrl+P no buscas en el índice: le dices el nombre al editor y te lo trae.
:::

## Paso 1 — Abre un archivo desde el explorador

1. En el explorador, haz clic en la carpeta **scripts** para desplegarla.
2. Haz clic en **resumen_ventas.py**.

```captura
archivo: vscode/v02-archivo.webp
texto: El archivo abierto: su pestaña (1), las migas de pan con la ruta (2) y el esquema (3)
```

| Parte | Qué muestra |
|---|---|
| Pestaña | El archivo abierto; la **x** la cierra. Un **●** en lugar de la x = hay cambios sin guardar |
| Migas de pan | La ruta del archivo dentro del proyecto (`scripts › resumen_ventas.py`) |
| Esquema | Las funciones, clases o títulos del archivo, para saltar a ellos |
| Línea de tiempo | El historial del archivo (guardados y commits) |

:::tip Guarda con Ctrl + S
VS Code no guarda solo (salvo que actives el guardado automático, lección 7). Si ves un **●** en la pestaña o en el explorador, ese archivo tiene cambios sin guardar: lo que ejecutes en la terminal todavía no los ve.
:::

## Paso 2 — Abrir rápido: Ctrl + P

1. Presiona **Ctrl + P**.
2. Escribe `etl`: aparece **etl_ventas.py** aunque esté en otra carpeta.
3. **Enter** lo abre.

```captura
archivo: vscode/v02-abrir-rapido.webp
texto: Ctrl+P busca por nombre en todo el proyecto
```

En proyectos de cientos de archivos es la forma más rápida de moverse. Presiona **Esc** para cerrar sin abrir.

## Paso 3 — Crea archivos y carpetas

1. En la cabecera del explorador, presiona **Archivo nuevo…** (1).
2. Aparece una fila para escribir el nombre (2). Escribe `notas/ideas.md` y **Enter**.

```captura
archivo: vscode/v02-nuevo-archivo.webp
texto: El botón Archivo nuevo (1) y la fila donde se escribe el nombre (2)
```

Si escribes una ruta con `/`, VS Code crea las carpetas que falten: `notas/ideas.md` crea la carpeta `notas` y el archivo adentro.

3. Escribe algo en el archivo y guárdalo con **Ctrl + S**.

| Botón de la cabecera | Hace |
|---|---|
| Archivo nuevo… | Crea un archivo (en la carpeta seleccionada o en la raíz) |
| Carpeta nueva… | Crea una carpeta |
| Actualizar | Vuelve a leer el disco (por si creaste algo desde la terminal) |
| Contraer | Cierra todas las carpetas del árbol |

## Paso 4 — El menú contextual

Haz **clic derecho** sobre un archivo del explorador (por ejemplo **README.md**):

```captura
archivo: vscode/v02-menu-contextual.webp
texto: El menú contextual: abrir, abrir en la terminal, copiar ruta, renombrar, eliminar
```

| Opción | Hace |
|---|---|
| Abrir en la terminal integrada | Abre la terminal parada en esa carpeta |
| Copiar ruta | Copia la ruta del archivo (útil para pegarla en el código o en un comando) |
| Renombrar… (o **F2**) | Cambia el nombre, en la misma fila del árbol |
| Eliminar | Borra el archivo |

:::tip Nombres de archivo
Minúsculas, sin espacios ni tildes, con guion bajo: `limpiar_clientes.py`, `ventas_por_canal.sql`. Los espacios y tildes dan problemas en la terminal, en Git y en los pipelines.
:::

## ✅ Lo que lograste

- Abres archivos desde el árbol y con Ctrl+P.
- Creas archivos y carpetas desde el explorador.
- Renombras, eliminas y copias rutas con el menú contextual.

:::ejercicio quiz
Una pestaña muestra ● en lugar de la x. ¿Qué significa?
- [ ] El archivo tiene errores
- [x] Hay cambios sin guardar
- [ ] El archivo es de solo lectura
- [ ] Está en Git
:::

:::ejercicio quiz
Quieres abrir `etl_ventas.py` y no recuerdas en qué carpeta está. ¿Qué haces?
- [ ] Abro todas las carpetas del explorador
- [x] Ctrl + P y escribo parte del nombre
- [ ] Busco en el menú Archivo
- [ ] Lo creo de nuevo
:::

:::ejercicio quiz
En Archivo nuevo escribes `src/utils/fechas.py`. ¿Qué pasa?
- [ ] Da error por las barras
- [x] Crea las carpetas src y utils y el archivo fechas.py adentro
- [ ] Crea un archivo llamado src-utils-fechas.py
- [ ] Solo crea la carpeta src
:::
