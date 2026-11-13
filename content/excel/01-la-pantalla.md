---
titulo: Excel desde cero - la pantalla, las celdas y tu primer libro
nivel: Básico
duracion: 30
resumen: Primer contacto con Excel, paso a paso y con capturas. Qué es cada parte de la pantalla (pestañas, cinta de opciones, cuadro de nombres, barra de fórmulas, grilla, hojas y barra de estado), cómo se llama cada celda y cómo seleccionar celdas y rangos con el mouse y con el teclado.
objetivos: Reconocer las seis partes de la pantalla de Excel | Nombrar una celda (B3) y un rango (A1:D6) | Seleccionar celdas y rangos con mouse y teclado | Leer la barra de estado para ver sumas y promedios sin escribir fórmulas
prerrequisitos: fundamentos-bienvenida
autoevaluacion: ¿Sabes dónde se ve el nombre de la celda activa? | ¿Sabes qué diferencia hay entre la celda y la barra de fórmulas? | ¿Sabes seleccionar un rango con Shift? | ¿Sabes dónde aparece la suma de lo que seleccionaste?
---

:::tip Cómo usar este curso
Abre [Excel de práctica](#/excel) en otra pestaña (o en otra ventana al lado) y haz cada paso a medida que lo lees. Las capturas son de esa misma app: lo que ves aquí es lo que vas a ver allá. Todo se guarda en tu navegador; si te equivocas, **File → New workbook** empieza de cero.
:::

:::analogia En palabras simples
Una hoja de cálculo es una cuadrícula gigante, como una hoja cuadriculada de cuaderno. Cada cuadradito es una **celda** y tiene una dirección (como "la casilla B3" de la batalla naval). En cada celda puedes escribir un dato o una **cuenta** que usa otras celdas.
:::

## Paso 1 — Abre Excel y mira la pantalla completa

1. Entra a [Excel de práctica](#/excel).
2. Se abre un libro de ejemplo con una pequeña tabla de productos.
3. No toques nada todavía: primero vamos a reconocer cada parte.

```captura
archivo: excel/01-pantalla.webp
texto: Excel recién abierto, con el libro de ejemplo
```

## Paso 2 — Reconoce las seis partes de la pantalla

```captura
archivo: excel/01-zonas.webp
texto: Las seis partes de la pantalla, numeradas
```

| # | Parte | Para qué sirve |
|---|---|---|
| 1 | **Pestañas** (File, Home, Insert, Formulas, Data, View) | Cambian los botones que se ven abajo |
| 2 | **Cinta de opciones** | Los botones de la pestaña elegida, agrupados (Clipboard, Font, Number…) |
| 3 | **Cuadro de nombres** | Dice qué celda está seleccionada (por ejemplo `A1`). También sirve para saltar a una celda |
| 4 | **Barra de fórmulas** (fx) | Muestra lo que **realmente** hay dentro de la celda: el dato o la fórmula |
| 5 | **Pestañas de hojas** (Sheet1, +) | Un libro puede tener varias hojas, como las páginas de un cuaderno |
| 6 | **Barra de estado** | Dice si estás editando y muestra la suma, el promedio y la cantidad de lo que seleccionaste |

:::tip La diferencia más importante
La **celda** muestra el resultado; la **barra de fórmulas** muestra cómo se calculó. Si la celda dice `$300.00`, la barra puede decir `=B2*C2`. Siempre que algo te parezca raro, mira la barra de fórmulas.
:::

## Paso 3 — El nombre de cada celda

Cada columna tiene una letra (A, B, C…) y cada fila un número (1, 2, 3…). El nombre de una celda es **letra + número**.

1. Haz clic en la celda que dice **Mouse** y después en su precio, **$12.50**.
2. Mira el cuadro de nombres: dice **C3** (columna C, fila 3).
3. Mira la barra de fórmulas: dice **12.5**. El signo `$` y los dos decimales son solo el **formato**, no el dato.

```captura
archivo: excel/01-celda-activa.webp
texto: La celda C3 seleccionada: su nombre aparece en el cuadro de nombres (1) y su contenido en la barra de fórmulas (2)
```

## Paso 4 — Selecciona un rango

Un **rango** es un rectángulo de celdas. Se nombra con la primera y la última celda separadas por dos puntos: `A1:D6`.

1. Haz clic en **A1**.
2. Mantén apretada la tecla **Shift** y haz clic en **D6**.
3. El cuadro de nombres dice **A1:D6** y la barra de estado muestra **Average**, **Count** y **Sum** de los números seleccionados.

```captura
archivo: excel/01-rango.webp
texto: El rango A1:D6 seleccionado: su nombre (1) y el resumen en la barra de estado (2)
```

:::tip Truco que usan todos los analistas
La barra de estado es una calculadora gratis: selecciona una columna de números y ves la suma y el promedio al instante, sin escribir ninguna fórmula.
:::

## Paso 5 — Muévete con el teclado

| Tecla | Hace |
|---|---|
| Flechas | Mueven la celda activa |
| Enter / Tab | Bajan / van a la derecha |
| Shift + flechas | Agrandan la selección |
| Ctrl + flecha | Saltan al borde de los datos (muy útil en tablas largas) |
| Ctrl + A | Selecciona toda la tabla |
| Escribe en el cuadro de nombres `D6` + Enter | Salta directo a esa celda |

Prueba ahora: haz clic en **A1** y presiona **Ctrl + ↓**. Vas directo a la última fila con datos.

## ✅ Lo que lograste

- Reconoces las seis partes de la pantalla.
- Sabes nombrar una celda (`C3`) y un rango (`A1:D6`).
- Sabes leer la barra de estado.

:::ejercicio quiz
¿Dónde ves la fórmula que hay dentro de una celda?
- [ ] En la barra de estado
- [ ] En la pestaña Home
- [x] En la barra de fórmulas (fx)
- [ ] En la pestaña de la hoja
:::

:::ejercicio quiz
¿Cómo se llama la celda de la columna D y la fila 7?
- [ ] 7D
- [x] D7
- [ ] D:7
- [ ] Fila7ColumnaD
:::

:::ejercicio quiz
Seleccionas una columna de precios. ¿Dónde ves la suma sin escribir fórmulas?
- [ ] En el cuadro de nombres
- [x] En la barra de estado, abajo a la derecha
- [ ] En la pestaña Formulas
- [ ] No se puede sin una fórmula
:::

:::ejercicio quiz
¿Qué selecciona el rango `B2:C4`?
- [ ] Solo las celdas B2 y C4
- [x] El rectángulo desde B2 hasta C4: seis celdas
- [ ] Toda la columna B y la C
- [ ] Las filas 2 y 4
:::
