---
titulo: Editar código como un profesional - buscar y reemplazar, multicursor, mover líneas y la paleta de comandos
nivel: 1 · Básico
duracion: 40
resumen: Los atajos que hacen la diferencia entre pelearse con el editor y volar. Buscar y reemplazar en un archivo, ir a una línea, editar varias líneas a la vez con multicursor, mover, duplicar y comentar líneas, deshacer, autocompletar con IntelliSense y la paleta de comandos, que da acceso a todo lo que VS Code sabe hacer.
objetivos: Buscar y reemplazar dentro de un archivo | Ir a una línea con Ctrl+G | Editar varias apariciones a la vez con Ctrl+D y Alt+clic | Mover, duplicar y comentar líneas con el teclado | Encontrar cualquier acción con la paleta de comandos
prerrequisitos: vscode-archivos-y-carpetas
autoevaluacion: ¿Sabes reemplazar un nombre de variable en todo el archivo? | ¿Sabes editar tres líneas a la vez? | ¿Sabes comentar un bloque de código? | ¿Sabes encontrar un comando sin conocer su menú?
---

:::analogia En palabras simples
Escribir código es un 20 % escribir y un 80 % moverse, buscar y modificar lo que ya está. Estos atajos son como aprender a usar el teclado sin mirar: al principio cuesta, a la semana no puedes volver atrás.
:::

## Paso 1 — Buscar y reemplazar en el archivo

1. Abre **scripts/resumen_ventas.py** (Ctrl + P → `resumen`).
2. Haz clic dentro del código y presiona **Ctrl + F**. Escribe `ventas`.

```captura
archivo: vscode/v03-buscar-en-archivo.webp
texto: El buscador del editor: resalta cada aparición y dice cuántas hay (4 of 5)
```

| Atajo | Hace |
|---|---|
| **Ctrl + F** | Buscar en el archivo |
| **Enter / Shift + Enter** | Siguiente / anterior aparición |
| **Ctrl + H** | Buscar y reemplazar |
| Ícono **Aa** del buscador | Distinguir mayúsculas |
| Ícono **ab** | Palabra completa (no reemplaza `ventas` dentro de `ventas_2024`) |
| **Esc** | Cerrar |

:::cuidado Reemplazar todo, con cuidado
"Reemplazar todo" cambia también apariciones que no querías (dentro de textos o de otros nombres). Activa **palabra completa** y revisa con Enter antes de reemplazar todo. Para renombrar una variable de Python de forma segura, VS Code real tiene **F2 → Rename Symbol** con la extensión de Python.
:::

## Paso 2 — Ir a una línea

Cuando un error dice "line 12", presiona **Ctrl + G**, escribe `12` y Enter. La barra de estado muestra siempre la posición actual (**Lín. 12, col. 5**).

## Paso 3 — Multicursor: editar varias cosas a la vez

| Atajo | Hace |
|---|---|
| **Ctrl + D** | Selecciona la palabra; cada vez que lo repites, agrega la **siguiente** aparición |
| **Ctrl + Shift + L** | Selecciona **todas** las apariciones de la selección |
| **Alt + clic** | Agrega un cursor donde haces clic |
| **Ctrl + Alt + ↓ / ↑** | Agrega un cursor en la línea de abajo / arriba |
| **Esc** | Vuelve a un solo cursor |

Prueba: haz doble clic en `totales`, presiona **Ctrl + D** dos veces y escribe `importes`: cambiaste tres apariciones a la vez. **Ctrl + Z** para deshacer.

## Paso 4 — Mover, duplicar y comentar

| Atajo | Hace |
|---|---|
| **Alt + ↑ / ↓** | Mueve la línea (o las líneas seleccionadas) |
| **Shift + Alt + ↓** | Duplica la línea |
| **Ctrl + Shift + K** | Borra la línea |
| **Ctrl + /** | Comenta o descomenta (`#` en Python, `--` en SQL) |
| **Tab / Shift + Tab** | Indenta / desindenta lo seleccionado |
| **Ctrl + Z / Ctrl + Y** | Deshacer / rehacer |

:::tip Comentar para probar
Para desactivar un bloque sin borrarlo mientras pruebas algo, selecciónalo y **Ctrl + /**. Antes de entregar, borra el código comentado que no sirve: para recuperarlo está Git.
:::

## Paso 5 — Autocompletado (IntelliSense)

Mientras escribes, VS Code propone nombres de variables, funciones y métodos. **Tab** o **Enter** acepta la sugerencia; **Ctrl + Espacio** la pide aunque no aparezca. Ahorra tiempo y, sobre todo, errores de tipeo.

## Paso 6 — La paleta de comandos: todo en un lugar

**Ctrl + Shift + P** abre la paleta. Escribe lo que quieres hacer, por ejemplo `tema`:

```captura
archivo: vscode/v03-paleta.webp
texto: La paleta de comandos encuentra acciones por su nombre, con su atajo al lado
```

No hace falta memorizar menús: si sabes cómo se llama lo que quieres, la paleta lo encuentra. Fíjate que cada comando muestra su **atajo**: así se aprenden.

| Atajo | Abre |
|---|---|
| **Ctrl + P** | Archivos por nombre |
| **Ctrl + Shift + P** (o F1) | Comandos |

## ✅ Lo que lograste

- Buscas, reemplazas y saltas a líneas.
- Editas varias apariciones a la vez y manejas líneas con el teclado.
- Encuentras cualquier acción con la paleta de comandos.

:::ejercicio quiz
Quieres cambiar las 3 primeras apariciones de `total` por `importe`, sin tocar las demás. ¿Qué usas?
- [ ] Ctrl + H y Reemplazar todo
- [x] Doble clic en total, Ctrl + D dos veces y escribir importe
- [ ] Ctrl + G
- [ ] Borrar y escribir tres veces
:::

:::ejercicio quiz
¿Qué hace Ctrl + / en un archivo de Python?
- [ ] Divide el editor
- [x] Comenta o descomenta las líneas seleccionadas con #
- [ ] Busca en el archivo
- [ ] Abre la paleta
:::

:::ejercicio quiz
No sabes en qué menú está "dividir el editor". ¿Qué haces?
- [ ] Reviso todos los menús
- [x] Ctrl + Shift + P y escribo "dividir"
- [ ] Busco en internet
- [ ] Ctrl + P y escribo "dividir"
:::
