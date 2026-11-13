---
titulo: Fórmulas paso a paso - escribir, copiar y fijar referencias con $
nivel: Básico
duracion: 40
resumen: Cómo escribir tu primera fórmula, cómo Excel la calcula y la recalcula sola, AutoSum, cómo copiar una fórmula a muchas filas con el controlador de relleno o Ctrl+D, y por qué a veces hace falta el $ (referencias absolutas). Todo guiado con capturas.
objetivos: Escribir una fórmula que empiece con = y use referencias a celdas | Usar AutoSum (Alt+=) | Copiar fórmulas con el controlador de relleno y con Ctrl+D | Fijar una celda con $ (y alternar con F4) | Ver todas las fórmulas de la hoja y dar formato de moneda
prerrequisitos: excel-la-pantalla
autoevaluacion: ¿Sabes por qué una fórmula empieza con =? | ¿Sabes qué le pasa a =B2*C2 cuando la copias hacia abajo? | ¿Sabes cuándo usar $H$1? | ¿Sabes ver todas las fórmulas de la hoja a la vez?
---

:::tip Antes de empezar
Abre [Excel de práctica](#/excel). Si ya hiciste cambios y quieres que tu pantalla coincida con las capturas, ve a **File → New workbook**.
:::

:::analogia En palabras simples
Una fórmula es una receta: "multiplica lo que hay en B2 por lo que hay en C2". Excel guarda la **receta**, no el resultado. Por eso, si cambias B2, el resultado se actualiza solo.
:::

## Paso 1 — Escribe tu primera fórmula

Vamos a calcular el precio promedio de los productos.

1. Haz clic en la celda **G2**.
2. Escribe `=AVERAGE(C2:C5)`. Mientras escribes, el texto aparece en la celda **y** en la barra de fórmulas.
3. Todavía no presiones Enter: mira la captura.

```captura
archivo: excel/02-escribiendo.webp
texto: Escribiendo la fórmula: se ve en la celda (1) y en la barra de fórmulas (2)
```

:::tip Siempre empieza con =
Sin el `=`, Excel guarda el texto tal cual. `AVERAGE(C2:C5)` es un texto; `=AVERAGE(C2:C5)` es una fórmula. Mientras escribes el nombre de la función, aparece una lista de sugerencias: puedes elegir una con el mouse.
:::

4. Presiona **Enter**. La celda muestra el resultado: **64.375**.

```captura
archivo: excel/02-resultado.webp
texto: El resultado de la fórmula en G2
```

5. Vuelve a hacer clic en **G2**: la celda muestra el número, pero la barra de fórmulas muestra la receta.

```captura
archivo: excel/02-formula-en-barra.webp
texto: La barra de fórmulas (1) muestra la fórmula de la celda seleccionada (2)
```

## Paso 2 — AutoSum: la suma en un atajo

1. Haz clic en **C6** (debajo de los precios).
2. Presiona **Alt + =** (o el botón **AutoSum** de la pestaña Home).
3. Excel propone `=SUM(C2:C5)`: detectó solo los números de arriba.
4. Presiona **Enter** para aceptar.

```captura
archivo: excel/02-autosuma.webp
texto: AutoSum propone la suma del rango de arriba
```

## Paso 3 — Una celda fija: el $

Queremos el total **con IVA** de cada producto. El IVA (1.21) está en una sola celda.

1. En **H1** escribe `1.21` y Enter.
2. En **E1** escribe `Con IVA` y Enter.
3. En **E2** escribe `=D2*$H$1`. El `$` delante de la columna y de la fila significa: "esta celda no se mueve aunque copie la fórmula".

```captura
archivo: excel/02-absoluta.webp
texto: La fórmula =D2*$H$1 (1) usa la celda fija H1 (2)
```

:::tip F4 pone los $ por ti
Mientras editas una fórmula, pon el cursor sobre una referencia (por ejemplo `H1`) y presiona **F4**: va pasando por `$H$1` → `H$1` → `$H1` → `H1`.
:::

## Paso 4 — Copia la fórmula a las demás filas

1. Haz clic otra vez en **E2**. Abajo a la derecha de la celda hay un **cuadradito verde**: el *controlador de relleno*.

```captura
archivo: excel/02-controlador.webp
texto: El controlador de relleno, el cuadradito verde de la esquina
```

2. Arrástralo hacia abajo hasta **E5**. (Otra forma: selecciona de E2 a E5 y presiona **Ctrl + D**, que significa "rellenar hacia abajo".)

```captura
archivo: excel/02-relleno-hecho.webp
texto: La fórmula copiada hasta E5
```

## Paso 5 — Mira qué pasó con las referencias

1. Ve a la pestaña **Formulas** y presiona **Show Formulas** (o **Ctrl + `**).
2. Ahora cada celda muestra su fórmula en vez del resultado.

```captura
archivo: excel/02-ver-formulas.webp
texto: Show Formulas (1): se ve cómo cambió cada fórmula al copiarla
```

Fíjate en la columna E:

| Celda | Fórmula | Qué se movió |
|---|---|---|
| E2 | `=D2*$H$1` | — |
| E3 | `=D3*$H$1` | `D2` pasó a `D3`; `$H$1` quedó igual |
| E5 | `=D5*$H$1` | igual: solo se mueve la parte sin `$` |

Sin el `$`, en E3 habría quedado `=D3*H2`, y H2 está vacía: el resultado sería 0. Ese es el error más común de quien empieza.

3. Presiona otra vez **Show Formulas** para volver a ver los resultados.

## Paso 6 — Dale formato de moneda

1. Selecciona de **D2** a **E6**.
2. En la pestaña **Home**, en el desplegable del grupo **Number**, elige **Currency**.

```captura
archivo: excel/02-formato.webp
texto: El formato de número (1) cambia cómo se ve el valor, no el valor
```

El formato solo cambia cómo se **ve** el número; el valor sigue siendo el mismo (lo ves en la barra de fórmulas).

## ✅ Lo que lograste

- Escribiste fórmulas con referencias y con funciones.
- Usaste AutoSum.
- Copiaste fórmulas y entendiste referencias relativas y absolutas.

:::ejercicio quiz
En D2 tienes `=B2*C2` y la copias a D3. ¿Qué queda en D3?
- [ ] `=B2*C2`
- [x] `=B3*C3`
- [ ] `=B2*C3`
- [ ] `=D3`
:::

:::ejercicio quiz
Todas las filas deben multiplicar por el valor de H1. ¿Qué escribes en E2 antes de copiar?
- [ ] `=D2*H1`
- [x] `=D2*$H$1`
- [ ] `=$D$2*H1`
- [ ] `=D2*H:H`
:::

:::ejercicio quiz
¿Qué atajo rellena hacia abajo la fórmula de la primera celda seleccionada?
- [ ] Ctrl + R
- [x] Ctrl + D
- [ ] Alt + =
- [ ] F2
:::

:::ejercicio quiz
Cambias a formato Currency una celda que tiene 12.5. ¿Qué valor guarda la celda?
- [ ] "$12.50" como texto
- [x] 12.5: el formato solo cambia cómo se ve
- [ ] 1250
- [ ] Se convierte en una fórmula
:::
