---
titulo: Proyecto 2 (guiado, con pistas) - el cierre semanal de ventas de una sucursal
nivel: 2 · Básico-intermedio
duracion: 60
resumen: El gerente de una sucursal te pasa las ventas de la semana y quiere saber cuánto se vendió de verdad, cómo le fue contra la meta y qué día rindió más. Esta vez tienes el qué pero no el cómo - cada columna dice qué calcular y las fórmulas están en pistas que abres solo si las necesitas. Incluye una trampa clásica (el promedio de promedios) y números de control para verificar tu trabajo.
objetivos: Convertir un pedido en columnas calculadas | Usar referencias absolutas para una meta fija | Resumir con SUM, AVERAGE, MAX y MIN | Evitar el error del promedio de promedios | Verificar el trabajo con números de control
prerrequisitos: excel-funciones-basicas
autoevaluacion: ¿Sabes calcular ventas netas y ticket promedio? | ¿Sabes comparar contra una meta guardada en una celda? | ¿Sabes por qué no se promedian promedios? | ¿Sabes verificar un total de dos formas?
---

:::escenario El pedido
Mensaje del gerente de la sucursal Centro: *"Te paso lo que facturamos esta semana. Para la reunión del lunes necesito: cuánto vendimos de verdad (sacando devoluciones), el ticket promedio, cómo estuvimos contra la meta de 7.500 por día y cuál fue el mejor y el peor día. Y si podés, qué porcentaje se nos fue en devoluciones."*
:::

En este proyecto **no hay capturas de cada clic**: ya sabes moverte por Excel. Cada paso dice **qué** calcular. Si te trabas, abre la pista. Intenta primero sin mirarla.

## Los datos

Crea una hoja `Semana` y escribe:

| | A | B | C | D |
|---|---|---|---|---|
| 1 | Día | Tickets | Ventas brutas | Devoluciones |
| 2 | Lunes | 142 | 6390 | 210 |
| 3 | Martes | 128 | 5630 | 0 |
| 4 | Miércoles | 135 | 6075 | 180 |
| 5 | Jueves | 160 | 7520 | 95 |
| 6 | Viernes | 210 | 10290 | 340 |
| 7 | Sábado | 265 | 13780 | 520 |
| 8 | Domingo | 190 | 9310 | 150 |

La meta no se escribe dentro de las fórmulas: en **I1** escribe `Meta diaria` y en **J1** `7500`.

## Tarea 1 — Ventas netas (columna E)

Lo que de verdad entró: ventas brutas menos devoluciones. Escribe la fórmula en **E2** y cópiala hasta el domingo.

<details><summary>💡 Pista</summary>

`=C2-D2` y después selecciona E2:E8 → Ctrl + D.

</details>

## Tarea 2 — Ticket promedio (columna F)

Cuánto gastó en promedio cada cliente ese día: ventas netas divididas por cantidad de tickets.

<details><summary>💡 Pista</summary>

`=E2/B2`, copiada hacia abajo.

</details>

## Tarea 3 — % de la meta (columna G)

Ventas netas del día contra la meta de **J1**. Ojo: la fórmula se va a copiar siete filas.

<details><summary>💡 Pista</summary>

`=E2/$J$1`. Sin los `$`, en G3 la fórmula apuntaría a J2, que está vacía, y daría `#DIV/0!`.

</details>

## Tarea 4 — El resumen de la semana

Debajo de la tabla, deja una fila vacía y arma:

| Fila | Rótulo | Qué calcular |
|---|---|---|
| 10 | Total | La suma de tickets, brutas, devoluciones y netas (columnas B a E) |
| 11 | Promedio diario | El promedio de ventas netas por día |
| 12 | Mejor día | La venta neta más alta |
| 13 | Peor día | La venta neta más baja |
| 14 | % devoluciones | Devoluciones totales sobre ventas brutas totales |

<details><summary>💡 Pista</summary>

B10 `=SUM(B2:B8)` (cópiala a C10:E10) · E11 `=AVERAGE(E2:E8)` · E12 `=MAX(E2:E8)` · E13 `=MIN(E2:E8)` · E14 `=D10/C10`.

</details>

## Tarea 5 — La trampa: el ticket promedio de la semana

¿Cuál es el ticket promedio **de toda la semana**? Hay dos formas de calcularlo y solo una es correcta:

- `=AVERAGE(F2:F8)` → promedia los siete tickets promedio: **46.17**.
- `=E10/B10` → todo lo vendido dividido por todos los tickets: **46.75**.

La correcta es la segunda. El sábado tuvo el doble de tickets que el martes, pero en `AVERAGE(F2:F8)` los dos días pesan igual. **Nunca promedies promedios**: vuelve a los totales y divide.

Escribe en **F10** `=E10/B10`, y en **G10** el % de la meta semanal (las netas totales contra siete días de meta).

<details><summary>💡 Pista</summary>

`=E10/(J1*7)`.

</details>

## Tarea 6 — Formato para presentar

- Importes (C2:F13) en **Currency**; porcentajes (G2:G10 y E14) en **Percentage**.
- Encabezados y fila de Total en negrita.

```captura
archivo: excel/e08-semana.webp
texto: El cierre de la semana: el ticket promedio semanal (2) se calcula con los totales (1)
```

## ✔ Números de control

Si tu hoja está bien, tienes que ver exactamente esto. Si algún número no coincide, revisa la fórmula de esa celda con F2 o con Show Formulas.

| Control | Valor esperado |
|---|---|
| Ventas netas de la semana | $57,500.00 |
| Brutas − devoluciones (C10 − D10) | igual a E10: $57,500.00 |
| Tickets de la semana | 1230 |
| Ticket promedio semanal | $46.75 |
| Mejor día / peor día | $13,260.00 / $5,630.00 |
| Sábado, % de la meta | 176.8 % |
| % de devoluciones | 2.5 % |

:::tip Verificar de dos formas
La segunda fila de la tabla de control es una técnica profesional: calcular el mismo número por dos caminos (sumar las netas de cada día, o restar los totales). Si coinciden, la tabla es coherente.
:::

## Entrega

1. **File → Export CSV** y renombra el archivo a `cierre_semana_sucursal_centro.csv`.
2. Escribe el mensaje para el gerente (máximo tres líneas). Debe tener el número principal, la comparación con la meta y una observación. Ejemplo: *"Vendimos $57.500 netos (109,5 % de la meta semanal). El fin de semana explica casi el 40 % de la venta; de lunes a jueves estuvimos debajo de la meta todos los días."*

<details><summary>Cómo sale el "casi 40 %" del ejemplo</summary>

Sábado + domingo = 13.260 + 9.160 = 22.420; 22.420 / 57.500 = 39 %. Puedes calcularlo en una celda: `=(E7+E8)/E10`.

</details>

## 🖥️ Hazlo también en Excel real

Repite el proyecto en Excel para la web o de escritorio. Todo lo que usaste existe igual. Dos diferencias que vas a notar: en Excel real puedes ajustar el ancho de una columna con **doble clic** en el borde del encabezado, y el controlador de relleno también se puede usar con **doble clic** (rellena hasta donde llegan los datos de la columna de al lado).

:::ejercicio quiz
¿Por qué en G2 hay que escribir `=E2/$J$1` y no `=E2/J1`?
- [ ] Porque J1 tiene texto
- [x] Porque al copiar hacia abajo, J1 pasaría a J2, J3… que están vacías
- [ ] Porque los porcentajes necesitan $
- [ ] Es indistinto
:::

:::ejercicio quiz
El martes hubo 100 tickets con promedio $40 y el sábado 300 tickets con promedio $60. ¿Cuál es el ticket promedio de los dos días?
- [ ] $50, el promedio de 40 y 60
- [x] $55: (100×40 + 300×60) / 400
- [ ] $60
- [ ] No se puede calcular
:::

:::ejercicio quiz
Tu total de ventas netas no coincide con "brutas totales − devoluciones totales". ¿Qué es lo más probable?
- [ ] Que Excel sumó mal
- [x] Que alguna fórmula de la columna de netas no se copió bien o falta una fila en un SUM
- [ ] Que falta el formato de moneda
- [ ] Que hay que redondear
:::
