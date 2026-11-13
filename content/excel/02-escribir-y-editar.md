---
titulo: Escribir, editar y borrar datos - los cuatro tipos de dato y los atajos que usarás todos los días
nivel: 1 · Básico
duracion: 35
resumen: Cómo se escribe en una celda, cómo Excel decide si lo que escribiste es texto, número, fecha o lógico, cómo corregir una celda sin reescribirla (F2), cómo borrar, deshacer y rehacer, y cómo copiar, cortar y pegar un rango. Todo paso a paso con capturas de la app.
objetivos: Escribir datos y confirmar con Enter o Tab | Reconocer los cuatro tipos de dato por cómo se alinean | Editar una celda con F2 o desde la barra de fórmulas | Borrar, deshacer (Ctrl+Z) y rehacer (Ctrl+Y) | Copiar, cortar y pegar un rango
prerrequisitos: excel-la-pantalla
autoevaluacion: ¿Sabes por qué un número queda a la derecha y un texto a la izquierda? | ¿Sabes corregir una celda sin borrarla entera? | ¿Sabes deshacer un error? | ¿Sabes copiar un bloque de celdas a otro lugar?
---

:::analogia En palabras simples
Escribir en Excel es como completar un formulario: eliges la casilla, escribes y pasas a la siguiente. La diferencia es que Excel **mira lo que escribiste** y decide si es un texto, un número o una fecha. De eso depende si después puede sumarlo u ordenarlo.
:::

## Paso 1 — Escribe y confirma

1. Abre [Excel de práctica](#/excel).
2. Abajo, junto a las hojas, presiona **+** para crear una hoja nueva (en la próxima lección vemos las hojas a fondo).
3. Haz clic en **A1** y escribe `Texto`. Fíjate: el texto aparece en la celda **y** en la barra de fórmulas a la vez.
4. Presiona **Tab**: Excel confirma y pasa a **B1**. Escribe `Número`, Tab, `Fecha`, Tab, `Lógico` y **Enter**.

| Tecla | Confirma y va a… |
|---|---|
| **Enter** | La celda de abajo |
| **Tab** | La celda de la derecha |
| **Shift + Enter** | La celda de arriba |
| **Esc** | No confirma: deja la celda como estaba |

5. Completa dos filas más:

| | A | B | C | D |
|---|---|---|---|---|
| 2 | Mouse | 12.5 | 2024-03-15 | TRUE |
| 3 | Teclado | -3 | 2024-12-01 | FALSE |

:::cuidado El separador decimal
En esta réplica (y en Excel configurado en inglés) el decimal se escribe con **punto**: `12.5`. Si tu Excel real está en español de España o Argentina, usa **coma**: `12,5`. Si escribes el separador equivocado, Excel lo toma como texto.
:::

## Paso 2 — Reconoce el tipo de dato por la alineación

```captura
archivo: excel/e02-tipos.webp
texto: Texto a la izquierda; números y fechas a la derecha
```

Excel alinea solo, según el tipo:

| Tipo | Ejemplo | Alineación | Se puede sumar |
|---|---|---|---|
| Texto | `Mouse` | Izquierda | No |
| Número | `12.5`, `-3` | Derecha | Sí |
| Fecha | `2024-03-15` | Derecha (por dentro es un número) | Se puede restar: días entre fechas |
| Lógico | `TRUE`, `FALSE` | Centro | Cuenta como 1 y 0 en algunas funciones |

:::tip El truco para detectar datos rotos
Si ves un "número" pegado a la izquierda, Excel lo guardó como **texto** (por ejemplo `12,5` con coma o `  300` con espacios). No se va a sumar. Es el problema número uno de los archivos que llegan de otros sistemas; lo resolvemos en el nivel 4.
:::

:::nota Fechas en formato ISO
Escribe las fechas como `año-mes-día` (`2024-03-15`). Es el formato que entienden todos los sistemas de datos (SQL, Python, Power BI) y Excel lo reconoce en cualquier idioma. `03/04/2024` es ambiguo: ¿3 de abril o 4 de marzo?
:::

## Paso 3 — Corrige una celda sin borrarla: F2

Quieres cambiar `Teclado` por `Teclado inalámbrico`.

1. Selecciona **A3**.
2. Presiona **F2**. Aparece el cursor al final del texto: estás en **modo edición** (la barra de estado lo dice).

```captura
archivo: excel/e02-editar-f2.webp
texto: Con F2 editas el contenido sin reemplazarlo
```

3. Escribe ` inalámbrico` y Enter.

Otras dos formas de editar: **doble clic** en la celda, o hacer clic en la **barra de fórmulas** y escribir ahí.

:::cuidado Escribir encima reemplaza
Si seleccionas una celda y empiezas a escribir **sin** F2, lo que había se borra y queda lo nuevo. Si te pasa, presiona **Esc** antes de Enter, o **Ctrl + Z** después.
:::

## Paso 4 — Borra, deshaz y rehaz

1. Selecciona **D2:D3** (clic en D2, Shift + clic en D3).
2. Presiona **Supr** (Delete). Las celdas quedan vacías.
3. Presiona **Ctrl + Z**: vuelven. **Ctrl + Y** rehace el borrado; presiona Ctrl + Z otra vez para dejarlas.

| Acción | Atajo | Botón |
|---|---|---|
| Borrar contenido | Supr | Home → **Clear** |
| Deshacer | Ctrl + Z | |
| Rehacer | Ctrl + Y | |

## Paso 5 — Copia y pega un bloque

1. Selecciona **A1:D3**.
2. **Ctrl + C** (o Home → **Copy**). El rango queda con un borde animado.
3. Haz clic en **F1** y presiona **Ctrl + V** (o Home → **Paste**).

```captura
archivo: excel/e02-copiar-pegar.webp
texto: Paste (1) pega el bloque copiado a partir de F1 (2)
```

Solo hace falta elegir la **primera celda** de destino: Excel pega el bloque entero hacia la derecha y hacia abajo.

**Cortar** (Ctrl + X) funciona igual, pero mueve en lugar de copiar. Borra ahora la copia: selecciona **F1:I3** y presiona Supr.

## ✅ Lo que lograste

- Escribiste datos de los cuatro tipos y aprendiste a reconocerlos.
- Editaste sin reescribir, deshiciste errores y copiaste bloques.

:::ejercicio quiz
Escribes `1500` en una celda y queda pegado a la izquierda. ¿Qué indica?
- [ ] Que es un número grande
- [x] Que Excel lo guardó como texto: no se va a sumar
- [ ] Que tiene formato de moneda
- [ ] Nada: los números siempre van a la izquierda
:::

:::ejercicio quiz
¿Qué tecla te deja corregir el contenido de una celda sin borrarlo?
- [ ] Supr
- [ ] Esc
- [x] F2
- [ ] Tab
:::

:::ejercicio quiz
Escribiste encima de una celda por error, pero todavía no presionaste Enter. ¿Qué haces?
- [x] Presiono Esc y la celda queda como estaba
- [ ] Presiono Tab
- [ ] Cierro el libro
- [ ] Presiono Supr
:::

:::ejercicio quiz
¿Por qué conviene escribir las fechas como `2024-03-15`?
- [ ] Porque Excel no acepta otro formato
- [ ] Porque ocupa menos espacio
- [x] Porque no es ambiguo y lo entienden SQL, Python y Excel en cualquier idioma
- [ ] Porque así se suman mejor
:::
