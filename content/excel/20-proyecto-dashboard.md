---
titulo: Proyecto 5 (requisitos y rúbrica) - el tablero comercial 2024 en una hoja
nivel: 5 · Avanzado
duracion: 120
resumen: Gerencia quiere abrir un solo archivo el lunes y entender cómo fue 2024. Diseñas y construyes un tablero en Excel - indicadores principales con fórmulas, una tabla dinámica verificada, un gráfico mensual y uno de composición - con supuestos separados, controles de calidad y una nota de lectura. Recibes requisitos y una rúbrica; las decisiones de diseño son tuyas.
objetivos: Diseñar un tablero a partir de preguntas de negocio | Calcular indicadores con fórmulas robustas y supuestos en celdas | Combinar fórmulas, tablas dinámicas y gráficos en un entregable | Incluir controles que prueben que los números cierran | Evaluar el propio trabajo con una rúbrica
prerrequisitos: excel-formulas-avanzadas
autoevaluacion: ¿Sabes elegir los indicadores de un tablero? | ¿Sabes separar datos, cálculos y presentación? | ¿Sabes demostrar que tus números cierran? | ¿Sabes escribir la nota de lectura de un tablero?
---

:::escenario El pedido
Reunión con el gerente general: *"Quiero un tablero de una página con cómo nos fue en 2024: cuántos pedidos, cuántos se entregaron, cuánta plata cobramos, cómo se repartió por canal, cómo fue cada mes y con qué pagan los clientes. Lo voy a mirar yo y lo voy a reenviar al directorio, así que tiene que entenderse solo. Y que se pueda actualizar el año que viene sin rehacerlo."*
:::

Este proyecto no tiene pasos ni pistas de fórmulas: **ya tienes todas las herramientas**. Tienes requisitos, números de control y una rúbrica. Diseña antes de construir.

## Requisitos

### R1 — Estructura del libro

| Hoja | Contiene |
|---|---|
| `supuestos` | El año del tablero (2024) y cualquier umbral, cada uno con su rótulo |
| `calculos` | Las tablas intermedias (por canal, por mes, por método de pago) |
| `tablero` | Solo lo que ve el gerente: indicadores, gráficos y la nota |
| `control` | Las verificaciones (R5) |

Las tablas del curso (`pedidos`, `pagos`) quedan como vinieron.

### R2 — Indicadores principales (en `tablero`)

1. Pedidos del año.
2. % de pedidos entregados.
3. % de pedidos cancelados.
4. Monto cobrado en el año (pagos **aprobados**).
5. Pago promedio aprobado del año.

Todas las fórmulas deben tomar el año de `supuestos`: si el año que viene se cambia 2024 por 2025, el tablero se actualiza solo.

### R3 — Tablas de apoyo (en `calculos`)

- Pedidos del año por **canal**, ordenados de mayor a menor.
- Pedidos del año por **mes** (1 a 12).
- Pedidos del año por **método de pago**.

Al menos una de ellas hecha con **tabla dinámica** y verificada contra una fórmula (la réplica crea las tablas dinámicas en su propia hoja: está bien que quede ahí).

### R4 — Gráficos (en `tablero` o junto a sus tablas)

- La evolución mensual (el tipo de gráfico lo eliges tú, con criterio).
- La composición por método de pago o por canal.
- Cada gráfico con un título que diga la conclusión, no el tema.

### R5 — Controles (en `control`)

Cada control es una fórmula que devuelve `OK` o `REVISAR`:

- La suma de los 12 meses es igual a los pedidos del año.
- La suma por canal es igual a los pedidos del año.
- El cobrado con SUMIFS es igual al total de la tabla dinámica de pagos (si la hiciste).

<details><summary>💡 La única pista: cómo armar un control</summary>

`=IF(SUM(calculos!B2:B13)=tablero!B2,"OK","REVISAR")`. Cuando compares montos con decimales, redondea los dos lados: `=IF(ROUND(x,2)=ROUND(y,2),"OK","REVISAR")`.

</details>

### R6 — Nota de lectura

Tres a cinco líneas en `tablero`, arriba o al lado de los indicadores: qué pasó en el año, qué destaca y una recomendación. Con números.

## ✔ Números de control (año 2024)

| Indicador | Valor |
|---|---|
| Pedidos del año | 4,633 |
| Entregados | 3,597 (77.6 %) |
| Cancelados | 371 (8.0 %) |
| Pagos aprobados en el año | 4,163 |
| Monto cobrado | $5,232,793.79 |
| Pago promedio aprobado | $1,256.98 |
| Canal con más pedidos | web (2,061) |
| Pedidos con tarjeta de crédito | 2,139 |
| Mes con más pedidos | diciembre (594) |

:::cuidado Cuidado con las fechas de dos tablas
Los pedidos se filtran por `fecha_pedido` y los pagos por `fecha_pago`. Un pedido del 31 de diciembre puede cobrarse el 2 de enero: por eso "pagos de 2024" no es lo mismo que "pagos de los pedidos de 2024". Elige una definición, escríbela en `supuestos` y respétala. Los números de control usan `fecha_pago`.
:::

## Rúbrica

| Criterio | Insuficiente | Bien | Excelente |
|---|---|---|---|
| Exactitud | Algún indicador no coincide con el control | Todos coinciden | Coinciden y los controles de R5 lo demuestran |
| Robustez | Números escritos a mano | Todo con fórmulas | Cambiar el año en `supuestos` actualiza todo |
| Estructura | Todo mezclado en una hoja | Datos, cálculos y tablero separados | Además, rótulos claros y nombres de hoja consistentes |
| Gráficos | Tipo equivocado o sin título | Tipo correcto con título | Título con la conclusión y orden que ayuda a leer |
| Comunicación | Sin nota | Nota que describe | Nota con hallazgos, números y una recomendación |

Evalúate con la rúbrica antes de dar el proyecto por terminado. Si algo queda en "Bien", ya sabes qué mejorar.

## Entrega

1. Exporta cada hoja importante con **File → Export CSV** (en Excel real entregarías el `.xlsx`).
2. Escribe el mail al gerente con la nota de lectura en el cuerpo.
3. Opcional para tu portafolio: replica el tablero en [Power BI de práctica](#/powerbi) con las mismas cifras. Si los números coinciden en dos herramientas, tu lógica es correcta.

<details><summary>Ver una nota de lectura de ejemplo (después de escribir la tuya)</summary>

*"En 2024 recibimos 4.633 pedidos y cobramos $5,23 millones. El 77,6 % se entregó y el 8,0 % se canceló, en línea con 2023. La web trae el 44 % de los pedidos. Noviembre y diciembre concentran el 24 % del año: recomendamos planificar stock y logística desde octubre."*

</details>

:::ejercicio quiz
¿Por qué los indicadores deben tomar el año de la hoja `supuestos`?
- [ ] Porque Excel no deja escribir años en las fórmulas
- [x] Para que el año que viene baste con cambiar una celda y el tablero se actualice solo
- [ ] Para que el archivo pese menos
- [ ] Porque las tablas dinámicas lo exigen
:::

:::ejercicio quiz
Tu control dice REVISAR: la suma de los 12 meses da 4.632 y los pedidos del año 4.633. ¿Qué es lo más probable?
- [ ] Un error de redondeo de Excel
- [x] Un criterio de fecha mal escrito en algún mes (por ejemplo, `<=` en lugar de `<` o un mes que no llega al último día)
- [ ] Que falta formato de número
- [ ] Que hay que ordenar la tabla
:::

:::ejercicio quiz
¿Cuál es un buen título para el gráfico mensual?
- [ ] "Gráfico 1"
- [ ] "Pedidos por mes"
- [x] "Los pedidos suben más de 60 % en noviembre y diciembre"
- [ ] "Datos 2024"
:::
