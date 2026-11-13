---
titulo: Proyecto 3 (pedido con pistas) - el reporte comercial 2023 vs 2024
nivel: 3 · Intermedio
duracion: 75
resumen: La directora comercial necesita comparar 2024 contra 2023 - cuántos pedidos hubo en cada estado, qué canal pierde más pedidos y cómo se movió cada mes. Recibes el pedido y una lista de entregables; tú decides las fórmulas (con pistas cerradas por si te trabas). Trabajas sobre los 12.000 pedidos reales de la tienda y verificas con números de control.
objetivos: Traducir un pedido de negocio en tablas de resumen | Contar por dos dimensiones (estado y año) con COUNTIFS y criterios de fecha | Calcular tasas y marcarlas con IF | Armar una serie mensual con criterios de fecha en celdas | Redactar hallazgos con números
prerrequisitos: excel-texto-y-fechas
autoevaluacion: ¿Sabes armar una tabla de doble entrada con COUNTIFS? | ¿Sabes filtrar un año con dos criterios de fecha? | ¿Sabes calcular una tasa de cancelación? | ¿Sabes escribir tres hallazgos con números?
---

:::escenario El pedido
Mail de la directora comercial: *"Para el comité del jueves necesito ver cómo cerramos 2024 contra 2023. Tres cosas: (1) cuántos pedidos hubo en cada estado, los dos años lado a lado; (2) de 2024, qué canal pierde más pedidos por cancelación; (3) la evolución mes a mes de 2024. Y mandame tres conclusiones en el cuerpo del mail, no quiero abrir el archivo para entender."*
:::

Desde este proyecto **no hay pasos numerados**: hay entregables. Las pistas están cerradas; ábrelas solo si te trabas más de diez minutos. Al final tienes números de control para verificar.

## Datos

La hoja **pedidos** (Data → Get Data → pedidos). Recuerda: **D** fecha_pedido, **E** estado, **F** canal. Los pedidos van de 2022 a 2024; solo nos interesan 2023 y 2024.

## Entregable 1 — Estados por año

Una hoja `Reporte` con esta forma (los números los calculas tú):

| | A | B | C |
|---|---|---|---|
| 1 | estado | 2023 | 2024 |
| 2 | entregado | | |
| 3 | cancelado | | |
| 4 | devuelto | | |
| 5 | enviado | | |
| 6 | pendiente | | |
| 7 | Total | | |
| 8 | % cancelación | | |

Requisitos: **una sola fórmula** escrita en B2 que se pueda copiar a todo el cuadro B2:C6 (el estado sale de la columna A y el año de la fila 1).

<details><summary>💡 Pista 1: cómo filtrar un año</summary>

Dos criterios sobre la misma columna de fecha: `">=2023-01-01"` y `"<2024-01-01"`.

</details>

<details><summary>💡 Pista 2: la fórmula que se copia</summary>

Si escribes los años como números en B1 y C1, puedes armar los criterios con `DATE`:

```text
=COUNTIFS(pedidos!$E:$E,$A2,pedidos!$D:$D,">="&DATE(B$1,1,1),pedidos!$D:$D,"<"&DATE(B$1+1,1,1))
```

`$A2` fija la columna del estado; `B$1` fija la fila del año. Cópiala a B2:C6.

</details>

<details><summary>💡 Pista 3: total y tasa</summary>

B7 `=SUM(B2:B6)` · B8 `=B3/B7` con formato Percentage.

</details>

```captura
archivo: excel/e12-reporte.webp
texto: Una versión del cuadro con criterios de fecha escritos: COUNTIFS por estado y año
```

## Entregable 2 — Cancelación por canal en 2024

En la misma hoja (por ejemplo desde **E1**): canal, pedidos 2024, cancelados 2024, % cancelación y una columna **alerta** que diga `revisar` si el canal supera el **8 %** de cancelación y quede vacía si no. El 8 % no va escrito dentro de la fórmula: va en una celda de supuestos.

<details><summary>💡 Pista</summary>

Pedidos: COUNTIFS con canal y las dos fechas de 2024. Cancelados: lo mismo más `pedidos!E:E,"cancelado"`. Alerta: `=IF(H2>$K$1,"revisar","")` si la tasa está en H y el umbral en K1.

</details>

## Entregable 3 — Pedidos por mes de 2024

Una tabla con los meses 1 a 12 y la cantidad de pedidos de cada uno. Los 12 números tienen que sumar el total de 2024.

<details><summary>💡 Pista</summary>

Con el mes en la columna A (números 1 a 12):

```text
=COUNTIFS(pedidos!D:D,">="&DATE(2024,A2,1),pedidos!D:D,"<"&DATE(2024,A2+1,1))
```

`DATE(2024,13,1)` da el 1 de enero de 2025: diciembre también funciona.

</details>

## ✔ Números de control

| Control | 2023 | 2024 |
|---|---|---|
| Entregados | 3,115 | 3,597 |
| Cancelados | 332 | 371 |
| Pendientes | 168 | 183 |
| Total de pedidos | 4,021 | 4,633 |
| % cancelación | 8.3 % | 8.0 % |

| Canal (2024) | Pedidos | Cancelados | % |
|---|---|---|---|
| web | 2,061 | 172 | 8.3 % |
| app | 1,142 | 102 | 8.9 % |
| tienda | 1,012 | 69 | 6.8 % |
| telefono | 418 | 28 | 6.7 % |

Pedidos por mes de 2024: enero **376**, julio **444**, diciembre **594**; la suma de los 12 meses, **4,633**.

## Entregable 4 — El mail

Tres conclusiones, cada una con un número. No describas la tabla ("en la tabla se ve…"): di qué significa. Por ejemplo:

<details><summary>Ver un ejemplo de mail (después de escribir el tuyo)</summary>

*"Cerramos 2024 con 4.633 pedidos, 15 % más que en 2023 (4.021). La tasa de cancelación se mantuvo estable (8,0 % contra 8,3 %), pero la app es el canal que más pierde: 8,9 % de sus pedidos se cancelan, contra 6,8 % de la tienda. Noviembre y diciembre concentraron el 24 % de los pedidos del año: conviene reforzar logística en ese período."*

</details>

## ✔ Lista de control antes de enviar

- [ ] Cada número del cuadro sale de una fórmula (no hay valores escritos a mano).
- [ ] La fórmula del cuadro de estados es una sola, copiada.
- [ ] El umbral del 8 % está en una celda, con un rótulo.
- [ ] Los totales coinciden con los números de control.
- [ ] Los porcentajes tienen formato Percentage.
- [ ] El mail tiene tres conclusiones con números y se entiende sin abrir el archivo.

:::ejercicio quiz
¿Por qué conviene que la fórmula del cuadro use `$A2` y `B$1`?
- [ ] Porque así calcula más rápido
- [x] Porque al copiarla, cada celda toma el estado de su fila y el año de su columna
- [ ] Porque COUNTIFS lo exige
- [ ] Para que no se pueda borrar
:::

:::ejercicio quiz
La tasa de cancelación de 2024 se calcula como…
- [ ] cancelados 2024 / cancelados totales
- [x] cancelados 2024 / pedidos totales de 2024
- [ ] cancelados 2024 / entregados 2024
- [ ] pedidos 2024 / pedidos 2023
:::

:::ejercicio quiz
¿Cuál de estas es una conclusión útil para un mail ejecutivo?
- [ ] "En la tabla se ven los pedidos por estado"
- [ ] "Hay cuatro canales"
- [x] "La app cancela el 8,9 % de sus pedidos, dos puntos más que la tienda"
- [ ] "Usé COUNTIFS para calcular"
:::
