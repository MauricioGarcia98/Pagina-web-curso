---
titulo: Contar y sumar con condiciones - COUNTIF(S), SUMIF(S), AVERAGEIF(S) y MAXIFS
nivel: 3 · Intermedio
duracion: 50
resumen: Las funciones que más se usan en el trabajo con datos en Excel. Cómo contar y sumar solo las filas que cumplen una o varias condiciones, cómo escribir criterios (texto, números, comodines, distinto de, fechas entre dos días) y cómo armar una tabla resumen con criterios en celdas para copiarla. Sobre los pedidos y los pagos reales de la tienda.
objetivos: Contar con una condición (COUNTIF) y con varias (COUNTIFS) | Sumar y promediar con condiciones (SUMIF, SUMIFS, AVERAGEIF) | Escribir criterios con operadores, comodines y fechas | Tomar el criterio de una celda para copiar la fórmula | Buscar el máximo con condición (MAXIFS)
prerrequisitos: excel-decisiones-if
autoevaluacion: ¿Sabes contar los pedidos cancelados? | ¿Sabes el orden de los argumentos de SUMIFS? | ¿Sabes filtrar por un rango de fechas? | ¿Sabes armar una tabla resumen copiando una sola fórmula?
---

:::analogia En palabras simples
Con miles de filas no se cuenta a mano: se le hace una pregunta a la tabla. "¿Cuántos pedidos están entregados?" es `COUNTIF`. "¿Cuánta plata entró por pagos aprobados en 2024?" es `SUMIFS`. Las funciones con **IF** al final son las mismas de siempre, pero solo miran las filas que cumplen tu condición.
:::

## Paso 1 — Contar con una condición: COUNTIF

Seguimos en la hoja **pedidos** (si no la tienes: **Data → Get Data → pedidos → Load**).

Pregunta: **¿cuántos pedidos están entregados?**

1. En **I1** escribe `Entregados`.
2. En **J1** escribe `=COUNTIF(E:E,"entregado")` y Enter.

```captura
archivo: excel/03-countif.webp
texto: COUNTIF en la barra de fórmulas (1) y su resultado (2): 9.288 pedidos entregados
```

```text
=COUNTIF(dónde_buscar, qué_condición)
```

`E:E` es toda la columna E. Se lee: "en la columna E, contá las celdas que dicen *entregado*".

## Paso 2 — Cómo se escriben los criterios

| Criterio | Cuenta las celdas… | Ejemplo |
|---|---|---|
| `"entregado"` | iguales a ese texto (sin importar mayúsculas) | |
| `"<>cancelado"` | distintas de cancelado | |
| `">100"` | mayores a 100 | montos |
| `"<=0"` | menores o iguales a 0 | stock agotado |
| `"t*"` | que empiezan con t | tienda, telefono |
| `"*tarjeta*"` | que contienen "tarjeta" | tarjeta_credito, tarjeta_debito |
| `">="&H1` | mayores o iguales al valor de H1 | criterio en una celda |

Prueba en una celda vacía, por ejemplo **J6**: `=COUNTIF(G:G,"tarjeta*")` (pedidos pagados con cualquier tarjeta: 8.366).

## Paso 3 — Varias condiciones: COUNTIFS

Pregunta: **¿cuántos pedidos entregados entraron por la web?**

1. En **I2** escribe `Entregados web`.
2. En **J2** escribe `=COUNTIFS(E:E,"entregado",F:F,"web")` → **4.201**.

`COUNTIFS` recibe **pares** de rango y criterio, y cuenta las filas que cumplen **todos** (es un AND).

:::tip Fechas entre dos días
Para contar los pedidos de marzo de 2024, usa dos condiciones sobre la misma columna:

```text
=COUNTIFS(D:D,">=2024-03-01",D:D,"<2024-04-01")
```

Resultado: 354. Usa siempre "mayor o igual al primer día" y "menor al primer día del mes siguiente": funciona con meses de 28, 30 o 31 días sin pensar.
:::

## Paso 4 — Sumar con condiciones: SUMIF y SUMIFS

Para sumar plata necesitamos montos. Carga la tabla **pagos** (**Data → Get Data → pagos → Load**): una fila por pago, con **C** fecha_pago, **D** monto y **E** estado (aprobado o rechazado).

1. Crea una hoja `Cobros` y escribe este esqueleto:

| | A | B | C | D |
|---|---|---|---|---|
| 1 | estado | pagos | monto | promedio |
| 2 | aprobado | | | |
| 3 | rechazado | | | |

2. En **B2**: `=COUNTIF(pagos!E:E,A2)` — fíjate que el criterio es **la celda A2**, no el texto.
3. En **C2**: `=SUMIF(pagos!E:E,A2,pagos!D:D)`.
4. En **D2**: `=AVERAGEIF(pagos!E:E,A2,pagos!D:D)`.
5. Selecciona **B2:D3** y **Ctrl + D**: la fila 3 calcula para *rechazado* sin escribir nada más.

```captura
archivo: excel/e10-sumif.webp
texto: SUMIF (1) suma los montos de los pagos con el estado de A2 (2)
```

`pagos!E:E` significa "la columna E de la hoja pagos". Así se usan datos de otra hoja.

```text
=SUMIF(dónde_mirar_la_condición, condición, qué_sumar)
=SUMIFS(qué_sumar, rango1, condición1, rango2, condición2, ...)
```

:::cuidado SUMIF y SUMIFS tienen el orden al revés
En `SUMIF` el rango a sumar va **al final**; en `SUMIFS` va **primero**. Es la confusión más común. Si dudas, empieza a escribir la función y mira la ayuda que aparece.
:::

6. Cobrado en 2024 (aprobado **y** con fecha en 2024). En **A5** escribe `Aprobado 2024` y en **C5**:

```text
=SUMIFS(pagos!D:D,pagos!E:E,"aprobado",pagos!C:C,">=2024-01-01",pagos!C:C,"<2025-01-01")
```

```captura
archivo: excel/e10-sumifs.webp
texto: SUMIFS con tres condiciones (1): lo cobrado en 2024 (2)
```

## Paso 5 — El máximo y el mínimo con condición

| Función | Pregunta | Fórmula |
|---|---|---|
| `MAXIFS` | ¿Cuál fue el pago aprobado más alto? | `=MAXIFS(pagos!D:D,pagos!E:E,"aprobado")` |
| `MINIFS` | ¿Y el más bajo? | `=MINIFS(pagos!D:D,pagos!E:E,"aprobado")` |
| `AVERAGEIFS` | ¿Promedio de pagos aprobados en 2024? | `=AVERAGEIFS(pagos!D:D,pagos!E:E,"aprobado",pagos!C:C,">=2024-01-01")` |

## Paso 6 — La tabla resumen que se copia sola

El patrón profesional: **criterios en celdas, una sola fórmula, copiada**.

En la hoja **Cobros**, arma un cuadro por canal con los pedidos:

| | F | G | H |
|---|---|---|---|
| 1 | canal | pedidos | cancelados |
| 2 | web | | |
| 3 | app | | |
| 4 | tienda | | |
| 5 | telefono | | |

- **G2**: `=COUNTIF(pedidos!F:F,F2)`
- **H2**: `=COUNTIFS(pedidos!F:F,F2,pedidos!E:E,"cancelado")`
- Selecciona **G2:H5** → Ctrl + D.

Control: la suma de **G2:G5** tiene que dar **12.000** (todos los pedidos tienen canal).

## ✅ Lo que lograste

- Contaste, sumaste y promediaste con una y varias condiciones.
- Filtraste por rangos de fechas y usaste datos de otra hoja.
- Armaste una tabla resumen que se copia con una sola fórmula.

:::ejercicio quiz
¿Qué fórmula cuenta los pedidos que NO están cancelados (estado en la columna E)?
- [ ] `=COUNTIF(E:E,"cancelado")`
- [x] `=COUNTIF(E:E,"<>cancelado")`
- [ ] `=COUNTIF(E:E,"!cancelado")`
- [ ] `=COUNT(E:E)-1`
:::

:::ejercicio quiz
Quieres sumar los montos (columna D) de los pagos aprobados (columna E). ¿Cuál está bien escrita?
- [ ] `=SUMIFS(E:E,"aprobado",D:D)`
- [x] `=SUMIFS(D:D,E:E,"aprobado")`
- [ ] `=SUMIF(D:D,"aprobado",E:E)`
- [ ] `=SUM(D:D,"aprobado")`
:::

:::ejercicio quiz
¿Qué criterios cuentan los pedidos de febrero de 2024 (fechas en D)?
- [ ] `D:D,"2024-02"`
- [ ] `D:D,">=2024-02-01",D:D,"<=2024-02-30"`
- [x] `D:D,">=2024-02-01",D:D,"<2024-03-01"`
- [ ] `D:D,"febrero"`
:::

:::ejercicio quiz
¿Por qué conviene escribir `=COUNTIF(pedidos!F:F,F2)` en lugar de `=COUNTIF(pedidos!F:F,"web")`?
- [ ] Porque es más rápido de calcular
- [x] Porque al copiarla hacia abajo cada fila usa su propio canal
- [ ] Porque las comillas dan error
- [ ] Es indistinto
:::
