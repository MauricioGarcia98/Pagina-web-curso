---
titulo: Funciones básicas - SUM, AVERAGE, MIN, MAX, COUNT, COUNTA, MEDIAN y ROUND
nivel: 2 · Básico-intermedio
duracion: 40
resumen: Las ocho funciones que resuelven la mayoría de las preguntas del día a día. Cómo se escribe una función (nombre, paréntesis, argumentos), qué diferencia hay entre COUNT y COUNTA, por qué el promedio puede engañar y la mediana no, y cómo redondear de verdad. Armas una tabla de ventas con descuentos y la resumes con funciones.
objetivos: Escribir funciones con uno o varios argumentos | Resumir una columna con SUM, AVERAGE, MIN y MAX | Distinguir COUNT de COUNTA | Saber cuándo usar MEDIAN en lugar de AVERAGE | Redondear con ROUND sabiendo que cambia el valor
prerrequisitos: excel-copiar-formulas-y-referencias
autoevaluacion: ¿Sabes qué cuenta COUNT y qué cuenta COUNTA? | ¿Sabes por qué un promedio puede engañar? | ¿Sabes la diferencia entre ROUND y el formato de número? | ¿Sabes escribir una función con varios argumentos?
---

:::analogia En palabras simples
Una función es una fórmula que ya viene hecha y tiene nombre. En lugar de escribir `=E2+E3+E4+E5`, escribes `=SUM(E2:E5)`. Entre paréntesis le das los datos con los que trabaja: sus **argumentos**, separados por coma.
:::

## Paso 1 — Cómo se escribe una función

```text
=NOMBRE(argumento1, argumento2, ...)
```

- `=SUM(E2:E5)` → un argumento: un rango.
- `=ROUND(E8, 0)` → dos argumentos: qué redondear y con cuántos decimales.
- `=MAX(E2:E5, 1000)` → el mayor entre el rango y el número 1000.

:::nota Coma o punto y coma
En Excel en inglés los argumentos se separan con **coma**. En Excel configurado en español, con **punto y coma**: `=REDONDEAR(E8;0)`. La lógica es la misma.
:::

## Paso 2 — Arma la tabla de ventas

1. En [Excel de práctica](#/excel), crea una hoja (**+**) y llámala `Ventas`.
2. Escribe:

| | A | B | C | D |
|---|---|---|---|---|
| 1 | Producto | Cantidad | Precio | Descuento |
| 2 | Notebook | 2 | 820 | 0.1 |
| 3 | Monitor | 5 | 190 | 0 |
| 4 | Mouse | 12 | 15 | 0.05 |
| 5 | Teclado | 7 | 35 | 0 |

3. En **E1** escribe `Neto` y en **E2**: `=B2*C2*(1-D2)` (cantidad × precio, menos el descuento).
4. Selecciona **E2:E5** y **Ctrl + D**. Notebook debe dar **1476**.

## Paso 3 — Resume la columna con funciones

Escribe los rótulos en la columna A y las funciones en la E:

| Celda | Rótulo (A) | Fórmula (E) | Resultado |
|---|---|---|---|
| fila 7 | Total | `=SUM(E2:E5)` | 2842 |
| fila 8 | Promedio | `=AVERAGE(E2:E5)` | 710.5 |
| fila 9 | Máximo | `=MAX(E2:E5)` | 1476 |
| fila 10 | Mínimo | `=MIN(E2:E5)` | 171 |
| fila 11 | Productos | `=COUNT(E2:E5)` | 4 |
| fila 12 | Redondeado | `=ROUND(E8,0)` | 711 |

```captura
archivo: excel/e07-funciones.webp
texto: AVERAGE en la barra de fórmulas (1) y su resultado (2)
```

## Paso 4 — COUNT y COUNTA no son lo mismo

| Función | Cuenta | En `Mouse, 12, (vacía), 15` da |
|---|---|---|
| `COUNT` | Solo celdas con **números** | 2 |
| `COUNTA` | Celdas **no vacías** (números, textos, fechas) | 3 |
| `COUNTBLANK` | Celdas vacías | 1 |

Pruébalo: en **G2** escribe `=COUNT(A2:A5)` (da 0: son textos) y en **G3** `=COUNTA(A2:A5)` (da 4).

:::tip Para contar filas de una tabla
`=COUNTA(A:A)-1` cuenta las filas con datos de la columna A, menos el encabezado. Úsalo sobre una columna que **nunca** esté vacía (como un id).
:::

## Paso 5 — El promedio puede engañar: MEDIAN

Agrega una venta grande para ver el efecto:

1. En **A6** escribe `Servidor`, en **B6** `1`, en **C6** `9000`, en **D6** `0`, y en **E6** `=B6*C6*(1-D6)`.
2. Cambia las fórmulas de las filas 7 a 11 para que lleguen hasta la fila 6 (por ejemplo `=AVERAGE(E2:E6)`).
3. En **A13** escribe `Mediana` y en **E13** `=MEDIAN(E2:E6)`.

| | Sin el servidor | Con el servidor |
|---|---|---|
| Promedio | 710.5 | 2368.4 |
| Mediana | — | 950 |

Una sola venta grande triplicó el promedio, pero la mediana (el valor del medio cuando ordenas) casi no se movió. Cuando hay valores extremos (sueldos, montos de compras, tiempos de entrega), informa la **mediana** o las dos.

4. Borra la fila del servidor (selecciona **A6:E6** y Supr) y vuelve las fórmulas a `E2:E5` para seguir con las capturas.

## Paso 6 — Redondear de verdad: ROUND

| Escribes | Da | Para |
|---|---|---|
| `=ROUND(710.5,0)` | 711 | Redondeo normal |
| `=ROUND(710.456,2)` | 710.46 | Dos decimales (dinero) |
| `=ROUNDUP(710.1,0)` | 711 | Siempre hacia arriba (cajas, personas) |
| `=ROUNDDOWN(710.9,0)` | 710 | Siempre hacia abajo |
| `=ROUND(1234,-2)` | 1200 | A las centenas |

:::cuidado ROUND cambia el valor, el formato no
El formato de número solo cambia cómo se **ve**. `ROUND` cambia el **valor**: las cuentas que usen esa celda van a usar el número redondeado. Redondea al final (en el número que se informa), no en los pasos intermedios.
:::

## Paso 7 — El IVA y el formato final

1. En **H1** escribe `IVA` y en **I1** `1.21`.
2. En **F1** escribe `Con IVA` y en **F2** `=E2*$I$1`. Cópiala hasta **F5**. En **F7**: `=SUM(F2:F5)`.
3. Formato: **D2:D5** → Percentage; **C2:C5** y **E2:F10** → Currency.

```captura
archivo: excel/e08-ventas.webp
texto: La tabla terminada: =E2*$I$1 (1) con el IVA fijo en I1
```

## ✅ Lo que lograste

- Escribiste funciones de uno y varios argumentos.
- Resumiste una tabla y entendiste COUNT, COUNTA y MEDIAN.
- Sabes cuándo redondear con ROUND y cuándo alcanza con el formato.

:::ejercicio quiz
En A2:A10 hay 6 nombres, 2 números y 1 celda vacía. ¿Cuánto da `=COUNTA(A2:A10)`?
- [ ] 2
- [ ] 6
- [x] 8
- [ ] 9
:::

:::ejercicio quiz
Los sueldos de un equipo son 1000, 1100, 1200, 1300 y 9000. ¿Qué número representa mejor al sueldo "típico"?
- [ ] El promedio, 2720
- [x] La mediana, 1200
- [ ] El máximo, 9000
- [ ] La suma, 13600
:::

:::ejercicio quiz
Necesitas saber cuántas cajas de 12 unidades hacen falta para 130 unidades. ¿Qué fórmula usas?
- [ ] `=ROUND(130/12,0)`
- [x] `=ROUNDUP(130/12,0)`
- [ ] `=ROUNDDOWN(130/12,0)`
- [ ] `=130/12` con formato Integer
:::

:::ejercicio quiz
¿Cuál es la diferencia entre `=ROUND(A1,0)` y poner A1 en formato Integer?
- [ ] Ninguna
- [x] ROUND cambia el valor que usan las demás cuentas; el formato solo cambia cómo se ve
- [ ] El formato cambia el valor; ROUND solo cómo se ve
- [ ] ROUND solo funciona con dinero
:::
