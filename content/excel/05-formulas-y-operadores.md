---
titulo: Fórmulas y operadores - cómo calcula Excel, en qué orden y por qué se recalcula solo
nivel: 2 · Básico-intermedio
duracion: 40
resumen: Todo lo que necesitas para escribir cualquier cuenta. Los operadores (+ - * / ^ &), el orden en que Excel los resuelve y cómo forzarlo con paréntesis, cómo una fórmula usa otras celdas y se recalcula sola, AutoSum, las sugerencias mientras escribes y cómo leer la barra de fórmulas para entender una hoja ajena.
objetivos: Escribir fórmulas con los seis operadores | Aplicar el orden de las operaciones y usar paréntesis | Ver que una fórmula se recalcula al cambiar sus celdas | Usar AutoSum y las sugerencias de funciones | Leer una fórmula ajena desde la barra de fórmulas
prerrequisitos: excel-proyecto-presupuesto
autoevaluacion: ¿Sabes cuánto da =2+3*4 y por qué? | ¿Sabes calcular un precio con descuento con paréntesis? | ¿Sabes unir dos textos? | ¿Sabes dónde ver la fórmula de una celda?
---

:::analogia En palabras simples
Una fórmula es una receta: "multiplica lo que hay en B2 por lo que hay en C2". Excel guarda la **receta**, no el resultado. Por eso, si cambias B2, el resultado se actualiza solo, como una calculadora que nunca se olvida de rehacer la cuenta.
:::

## Paso 1 — Escribe tu primera fórmula con función

Vamos a usar el libro de ejemplo que trae la app (la tabla de productos de la hoja **Sheet1**). Si ya lo modificaste, **File → New workbook** lo deja como al principio.

1. Haz clic en la celda **G2**.
2. Escribe `=AVERAGE(C2:C5)`. Mientras escribes, el texto aparece en la celda (1) **y** en la barra de fórmulas (2).

```captura
archivo: excel/02-escribiendo.webp
texto: Escribiendo la fórmula: se ve en la celda (1) y en la barra de fórmulas (2)
```

3. Presiona **Enter**. La celda muestra el resultado: **64.375** (el precio promedio).

```captura
archivo: excel/02-resultado.webp
texto: El resultado de la fórmula en G2
```

4. Vuelve a hacer clic en **G2**: la celda muestra el número, pero la barra de fórmulas muestra la receta.

```captura
archivo: excel/02-formula-en-barra.webp
texto: La barra de fórmulas (1) muestra la fórmula de la celda seleccionada (2)
```

:::tip Siempre empieza con =
Sin el `=`, Excel guarda el texto tal cual. `AVERAGE(C2:C5)` es un texto; `=AVERAGE(C2:C5)` es una fórmula.
:::

## Paso 2 — Los operadores

| Operador | Hace | Ejemplo | Resultado |
|---|---|---|---|
| `+` | Suma | `=10+5` | 15 |
| `-` | Resta | `=10-5` | 5 |
| `*` | Multiplica | `=10*5` | 50 |
| `/` | Divide | `=10/5` | 2 |
| `^` | Potencia | `=10^2` | 100 |
| `&` | Une textos | `="Hola "&"Ana"` | Hola Ana |

Pruébalos en celdas vacías (por ejemplo en **G4**, **G5**…) antes de seguir.

Los de comparación devuelven `TRUE` o `FALSE`: `=`, `<>` (distinto), `<`, `>`, `<=`, `>=`. Por ejemplo `=C2>50` responde si el precio de C2 supera 50. Los vas a usar mucho con `IF` en el nivel 3.

## Paso 3 — El orden de las operaciones

¿Cuánto da `=2+3*4`? Excel no lee de izquierda a derecha: primero resuelve las multiplicaciones y divisiones.

| Orden | Qué | Ejemplo |
|---|---|---|
| 1 | Paréntesis | `(2+3)` |
| 2 | Potencias `^` | `3^2` |
| 3 | `*` y `/` | `3*4` |
| 4 | `+` y `-` | `2+12` |
| 5 | `&` (unir textos) | |
| 6 | Comparaciones | `=`, `<`, `>`… |

Así que `=2+3*4` da **14**, y `=(2+3)*4` da **20**.

:::cuidado El error clásico del descuento
Un producto de $820 con 10 % de descuento:

- `=820*1-0.1` da **819.9** ✘ (multiplica primero y después resta 0.1).
- `=820*(1-0.1)` da **738** ✔.

Cuando dudes, pon paréntesis: nunca molestan y hacen la fórmula más fácil de leer.
:::

## Paso 4 — Fórmulas que usan otras celdas

1. En **J1** escribe `Descuento` y en **J2** escribe `0.1`.
2. En **G6** escribe `=C2*(1-J2)`: el precio de C2 con el descuento de J2.
3. Cambia **J2** a `0.25`. G6 cambia solo.

Eso es lo que hace a Excel poderoso: escribes la lógica una vez y cambias los datos todas las veces que quieras.

## Paso 5 — AutoSum: la suma en un atajo

1. Haz clic en **C6** (debajo de los precios).
2. Presiona **Alt + =** (o el botón **AutoSum** de Home).
3. Excel propone `=SUM(C2:C5)`: detectó los números de arriba.
4. **Enter** para aceptar.

```captura
archivo: excel/02-autosuma.webp
texto: AutoSum propone la suma del rango de arriba
```

## Paso 6 — Que Excel te ayude a escribir

1. En una celda vacía escribe `=COU`. Aparece la lista de funciones que empiezan así, con una explicación de cada una.

```captura
archivo: excel/03-sugerencias.webp
texto: Las sugerencias aparecen mientras escribes el nombre de la función
```

2. Presiona **Esc** para salir sin guardar.
3. Si no recuerdas el nombre: **Formulas → Insert Function**, escribe lo que quieres hacer (por ejemplo `promedio`) y lee cómo se usa.

```captura
archivo: excel/03-insertar-funcion.webp
texto: Insert Function: busca por lo que quieres hacer (1) y lee cómo se usa (2)
```

## Paso 7 — Lee la hoja de otra persona

Cuando te pasan un archivo, no confíes en los números que ves: haz clic en ellos y lee la barra de fórmulas.

- Si dice un número (`1770`), alguien lo escribió a mano: no se va a actualizar.
- Si dice una fórmula (`=SUM(D2:D5)`), sigue la receta: ¿suma el rango correcto? ¿le falta una fila?

**Formulas → Show Formulas** (Ctrl + `) muestra todas las fórmulas de la hoja a la vez. Es la forma más rápida de auditar una hoja ajena.

## ✅ Lo que lograste

- Escribiste fórmulas con operadores y funciones.
- Aplicaste el orden de las operaciones y los paréntesis.
- Sabes leer y auditar las fórmulas de una hoja.

:::ejercicio quiz
¿Cuánto da `=2+3*4`?
- [ ] 20
- [x] 14
- [ ] 24
- [ ] 9
:::

:::ejercicio quiz
Precio en B2, descuento (como 0.15) en C2. ¿Qué fórmula da el precio con descuento?
- [ ] `=B2*1-C2`
- [x] `=B2*(1-C2)`
- [ ] `=B2-C2`
- [ ] `=(B2*1)-C2`
:::

:::ejercicio quiz
En A2 está "Ana" y en B2 "Pérez". ¿Qué fórmula da "Ana Pérez"?
- [ ] `=A2+B2`
- [ ] `=A2&B2`
- [x] `=A2&" "&B2`
- [ ] `=SUM(A2:B2)`
:::

:::ejercicio quiz
Haces clic en un total y la barra de fórmulas dice `48250`. ¿Qué significa?
- [ ] Que la fórmula está bien
- [x] Que el número se escribió a mano: no se va a actualizar si cambian los datos
- [ ] Que tiene formato de número
- [ ] Que la hoja está protegida
:::
