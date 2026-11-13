---
titulo: Copiar fórmulas y referencias - relativas, absolutas ($) y mixtas
nivel: 2 · Básico-intermedio
duracion: 45
resumen: Escribir una fórmula una vez y copiarla a mil filas es lo que hace rápido a Excel. Cómo copiar con el controlador de relleno y con Ctrl+D, qué le pasa a cada referencia al copiarla, cuándo fijar una celda con $ (y F4 para ponerlo), las referencias mixtas para tablas de doble entrada y cómo auditar el resultado con Show Formulas.
objetivos: Copiar una fórmula con el controlador de relleno y con Ctrl+D | Predecir cómo cambia una referencia relativa al copiarla | Fijar una celda con $ y alternar con F4 | Usar referencias mixtas ($A2, B$1) en una tabla de doble entrada | Auditar las fórmulas copiadas
prerrequisitos: excel-formulas-y-operadores
autoevaluacion: ¿Sabes qué queda en D3 si copias =B2*C2 desde D2? | ¿Sabes cuándo usar $H$1? | ¿Sabes qué fija $A2 y qué fija A$1? | ¿Sabes ver todas las fórmulas de la hoja?
---

:::analogia En palabras simples
Una referencia como `D2` no significa "la celda D2" sino "la celda que está **una columna a la izquierda** en mi misma fila". Por eso, al copiar la fórmula una fila más abajo, apunta a D3. El `$` es como clavar la referencia con un alfiler: no se mueve.
:::

## Paso 1 — Prepara una celda fija

Seguimos en la hoja **Sheet1** del libro de ejemplo. Queremos el total **con IVA** de cada producto. El IVA (1.21) va en **una sola celda**, para poder cambiarlo en un solo lugar.

1. En **H1** escribe `1.21` y Enter.
2. En **E1** escribe `Con IVA` y Enter.

:::tip Los supuestos, separados
Los números que pueden cambiar (IVA, tipo de cambio, comisión) van en su propia celda, con un rótulo al lado. Nunca los escribas dentro de las fórmulas (`=D2*1.21`): el día que cambie el IVA tendrías que editar cada fórmula.
:::

## Paso 2 — Escribe la fórmula con $

1. En **E2** escribe `=D2*$H$1`.

```captura
archivo: excel/02-absoluta.webp
texto: La fórmula =D2*$H$1 (1) usa la celda fija H1 (2)
```

El `$` delante de la columna **y** de la fila significa: "esta celda no se mueve aunque copie la fórmula".

:::tip F4 pone los $ por ti
Mientras editas, deja el cursor sobre una referencia (por ejemplo `H1`) y presiona **F4**: va pasando por `$H$1` → `H$1` → `$H1` → `H1`.
:::

## Paso 3 — Copia la fórmula

1. Haz clic en **E2**. Abajo a la derecha de la celda hay un **cuadradito verde**: el *controlador de relleno*.

```captura
archivo: excel/02-controlador.webp
texto: El controlador de relleno, el cuadradito verde de la esquina
```

2. Arrástralo hacia abajo hasta **E5**.

Otra forma, la que más se usa con tablas largas: selecciona **E2:E5** y presiona **Ctrl + D** ("rellenar hacia abajo": copia la primera celda en las demás).

```captura
archivo: excel/02-relleno-hecho.webp
texto: La fórmula copiada hasta E5
```

## Paso 4 — Mira qué pasó con cada referencia

1. Pestaña **Formulas** → **Show Formulas** (o **Ctrl + `**).

```captura
archivo: excel/02-ver-formulas.webp
texto: Show Formulas (1): se ve cómo cambió cada fórmula al copiarla
```

| Celda | Fórmula | Qué se movió |
|---|---|---|
| E2 | `=D2*$H$1` | — |
| E3 | `=D3*$H$1` | `D2` pasó a `D3`; `$H$1` quedó igual |
| E5 | `=D5*$H$1` | solo se mueve la parte sin `$` |

Sin el `$`, en E3 habría quedado `=D3*H2`, y H2 está vacía: el resultado sería **0**. Es el error más común de quien empieza, y es silencioso: no aparece ningún mensaje.

2. Presiona otra vez **Show Formulas** para volver a los resultados.

## Paso 5 — Las cuatro formas de una referencia

| Escribes | Al copiar hacia abajo | Al copiar a la derecha | Se llama |
|---|---|---|---|
| `H1` | cambia la fila | cambia la columna | relativa |
| `$H$1` | no cambia | no cambia | absoluta |
| `H$1` | **no** cambia la fila | cambia la columna | mixta (fila fija) |
| `$H1` | cambia la fila | **no** cambia la columna | mixta (columna fija) |

## Paso 6 — Referencias mixtas: una tabla de doble entrada

Las mixtas sirven cuando una fórmula se copia **hacia abajo y hacia la derecha** a la vez. Ejemplo real: cuánto cuesta cada producto si lo compras en 1, 5 o 10 unidades.

1. Crea una hoja nueva (**+**) y llámala `Cantidades`.
2. Escribe:

| | A | B | C | D |
|---|---|---|---|---|
| 1 | Precio \ Unidades | 1 | 5 | 10 |
| 2 | 25 | | | |
| 3 | 12.5 | | | |
| 4 | 180 | | | |

3. En **B2** escribe `=$A2*B$1`: el precio está siempre en la columna A (`$A`) y las unidades siempre en la fila 1 (`$1`).
4. Copia **B2** (Ctrl + C), selecciona **B2:D4** y pega (Ctrl + V): Excel pega la fórmula en las nueve celdas y ajusta cada copia. (Otra forma: selecciona B2:B4 y **Ctrl + D**; después B2:D4 y **Ctrl + R**, "rellenar a la derecha".)

:::tip Selecciona un rango escribiéndolo
En el cuadro de nombres puedes escribir un rango, por ejemplo `B2:D4`, y presionar Enter: queda seleccionado. Es lo más rápido con rangos grandes.
:::
5. Comprueba: **D4** debe dar **1800** (180 × 10). Mira su fórmula: `=$A4*D$1`.

:::cuidado Si te olvidas un $
Con `=A2*B1` copiado a la derecha, C2 quedaría `=B2*C1`: multiplicaría el resultado anterior por 5. Si una tabla de doble entrada da números absurdos, revisa los `$` con Show Formulas.
:::

## Paso 7 — Formato a los importes

1. Vuelve a **Sheet1**, selecciona **D2:E6**.
2. Home → Number → **Currency**.

```captura
archivo: excel/02-formato.webp
texto: El formato de número (1) cambia cómo se ve el valor, no el valor
```

## ✅ Lo que lograste

- Copiaste fórmulas a muchas filas en segundos.
- Sabes predecir cómo cambia cada referencia y cuándo fijarla.
- Armaste una tabla de doble entrada con referencias mixtas.

:::ejercicio quiz
En D2 tienes `=B2*C2` y la copias a D3. ¿Qué queda en D3?
- [ ] `=B2*C2`
- [x] `=B3*C3`
- [ ] `=B2*C3`
- [ ] `=D3`
:::

:::ejercicio quiz
Todas las filas deben multiplicar por el valor de H1. ¿Qué escribes en E2 antes de copiar hacia abajo?
- [ ] `=D2*H1`
- [x] `=D2*$H$1`
- [ ] `=$D$2*H1`
- [ ] `=D2*H:H`
:::

:::ejercicio quiz
En B2 escribes `=$A2*B$1` y la copias a C3. ¿Qué queda en C3?
- [ ] `=$A2*C$1`
- [x] `=$A3*C$1`
- [ ] `=$A3*C$2`
- [ ] `=B3*C$1`
:::

:::ejercicio quiz
¿Qué atajo copia la primera celda de la selección en las de abajo?
- [ ] Ctrl + R
- [x] Ctrl + D
- [ ] Alt + =
- [ ] F2
:::
