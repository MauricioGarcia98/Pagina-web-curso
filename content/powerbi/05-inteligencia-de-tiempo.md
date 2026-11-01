---
titulo: Inteligencia de tiempo - acumulados, año anterior y variaciones
nivel: Avanzado
duracion: 50
resumen: La tabla calendario, por qué Power BI la necesita y cómo calcular el acumulado del año (TOTALYTD), el mismo período del año anterior (SAMEPERIODLASTYEAR, DATEADD), el mes anterior y la variación interanual, con VAR y RETURN para que la fórmula se lea fácil.
objetivos: Explicar para qué sirve una tabla calendario marcada como tabla de fechas | Calcular acumulados del año y del mes | Comparar contra el año anterior con SAMEPERIODLASTYEAR y DATEADD | Escribir medidas legibles con VAR y RETURN
autoevaluacion: ¿Sabes por qué conviene una tabla calendario en vez de usar la fecha de la tabla de hechos? | ¿Sabes calcular la variación interanual sin repetir la fórmula? | ¿Sabes qué devuelve TOTALYTD en marzo?
---

:::escenario
El directorio quiere ver cada mes con tres números: lo vendido en el mes, lo acumulado en el año y cuánto creció contra el mismo mes del año anterior. Son las funciones de **inteligencia de tiempo** de DAX.
:::

## La tabla calendario

Las funciones de tiempo necesitan una columna de fechas **sin huecos** (todos los días, aunque no haya ventas). Por eso en Power BI se crea una **tabla calendario**:

```dax
Calendario = ADDCOLUMNS(
    CALENDAR(DATE(2022, 1, 1), DATE(2024, 12, 31)),
    "Año", YEAR([Date]),
    "Mes", FORMAT([Date], "MMMM"),
    "Trimestre", "T" & QUARTER([Date])
)
```

Después se relaciona `Calendario[Date]` (lado 1) con la fecha de los hechos (`pedidos[fecha_pedido]`, lado *) y se marca como **tabla de fechas** (Herramientas de tabla → Marcar como tabla de fechas). En el [Power BI de práctica](#/powerbi) puedes crearla con *Modelado → Nueva tabla* y `CALENDARAUTO()`.

:::nota En estos ejercicios
El modelo de la tienda no tiene tabla calendario. Por eso los ejercicios usan directamente `pedidos[fecha_pedido]`. Las funciones son las mismas. En tus informes reales usa la tabla calendario.
:::

## Las funciones

| Medida | Fórmula |
|---|---|
| Acumulado del año | `TOTALYTD([Ventas], Calendario[Date])` |
| Acumulado del mes | `TOTALMTD([Ventas], Calendario[Date])` |
| Mismo período del año anterior | `CALCULATE([Ventas], SAMEPERIODLASTYEAR(Calendario[Date]))` |
| Desplazar un período | `CALCULATE([Ventas], DATEADD(Calendario[Date], -1, MONTH))` |
| Mes anterior completo | `CALCULATE([Ventas], PREVIOUSMONTH(Calendario[Date]))` |
| Un rango fijo | `CALCULATE([Ventas], DATESBETWEEN(Calendario[Date], DATE(2024,1,1), DATE(2024,6,30)))` |

`TOTALYTD([Ventas], fecha)` es un atajo de `CALCULATE([Ventas], DATESYTD(fecha))`. Toma la última fecha visible en la celda y suma desde el 1 de enero de ese año hasta esa fecha.

## VAR y RETURN

Para la variación interanual hace falta el valor del año anterior dos veces. Con variables se calcula una sola vez y la fórmula se lee como una receta:

```dax
Var. interanual % =
VAR actual = [Ventas]
VAR anterior = CALCULATE([Ventas], SAMEPERIODLASTYEAR(Calendario[Date]))
RETURN
    DIVIDE(actual - anterior, anterior)
```

:::tip Medidas rápidas
En Power BI, *Inicio → Medida rápida* arma estas fórmulas con unos clics ("Total del año hasta la fecha", "Cambio año tras año"). Úsalas para aprender: después abre la medida y lee el DAX que generó.
:::

## Practica

Las consultas filtran fechas con `DATESBETWEEN` o con `TREATAS` para mirar días puntuales. Lee la consulta de prueba de cada ejercicio.

:::ejercicio dax dificultad=Avanzado titulo="Acumulado del año"
Escribe **Ventas acumuladas del año** con `TOTALYTD` sobre `pedidos[fecha_pedido]`. Se evalúa en tres fechas de 2024 (31/3, 30/6 y 31/12).
```dax medidas
Ventas = SUMX(detalle_pedidos, detalle_pedidos[cantidad] * detalle_pedidos[precio_unitario] * (1 - detalle_pedidos[descuento]))
```
```dax prueba
EVALUATE SUMMARIZECOLUMNS(pedidos[fecha_pedido], TREATAS({"2024-03-31", "2024-06-30", "2024-12-31"}, pedidos[fecha_pedido]), "Acumulado", [?])
```
```dax solucion
Ventas acumuladas del año = TOTALYTD([Ventas], pedidos[fecha_pedido])
```
```pista
`TOTALYTD(<medida>, <columna de fecha>)`.
```
:::

:::ejercicio dax dificultad=Avanzado titulo="El año anterior"
Escribe **Ventas año anterior** con `SAMEPERIODLASTYEAR`. Se evalúa sobre todo 2024: debe dar las ventas de 2023.
```dax medidas
Ventas = SUMX(detalle_pedidos, detalle_pedidos[cantidad] * detalle_pedidos[precio_unitario] * (1 - detalle_pedidos[descuento]))
```
```dax prueba
EVALUATE ROW("Año anterior", CALCULATE([?], DATESBETWEEN(pedidos[fecha_pedido], DATE(2024, 1, 1), DATE(2024, 12, 31))))
```
```dax solucion
Ventas año anterior = CALCULATE([Ventas], SAMEPERIODLASTYEAR(pedidos[fecha_pedido]))
```
```pista
Es un CALCULATE con un filtro de tiempo: `CALCULATE([Ventas], SAMEPERIODLASTYEAR(pedidos[fecha_pedido]))`.
```
:::

:::ejercicio dax dificultad=Avanzado titulo="Variación interanual"
Escribe **Var. interanual %** con `VAR` y `RETURN`: (ventas − ventas del año anterior) ÷ ventas del año anterior. Se evalúa sobre 2024.
```dax medidas
Ventas = SUMX(detalle_pedidos, detalle_pedidos[cantidad] * detalle_pedidos[precio_unitario] * (1 - detalle_pedidos[descuento]))
```
```dax prueba
EVALUATE ROW("Var. interanual", CALCULATE([?], DATESBETWEEN(pedidos[fecha_pedido], DATE(2024, 1, 1), DATE(2024, 12, 31))))
```
```dax inicial
Var. interanual % =
VAR actual = [Ventas]
VAR anterior = ...
RETURN
    ...
```
```dax solucion
Var. interanual % =
VAR actual = [Ventas]
VAR anterior = CALCULATE([Ventas], SAMEPERIODLASTYEAR(pedidos[fecha_pedido]))
RETURN
    DIVIDE(actual - anterior, anterior)
```
```pista
`anterior` es el CALCULATE con `SAMEPERIODLASTYEAR`. El resultado es `DIVIDE(actual - anterior, anterior)`.
```
:::

:::ejercicio dax dificultad=Avanzado titulo="El mes anterior"
Escribe **Ventas mes anterior** con `DATEADD` (un mes hacia atrás). Se evalúa sobre marzo de 2024: debe dar las ventas de febrero de 2024.
```dax medidas
Ventas = SUMX(detalle_pedidos, detalle_pedidos[cantidad] * detalle_pedidos[precio_unitario] * (1 - detalle_pedidos[descuento]))
```
```dax prueba
EVALUATE ROW("Mes anterior", CALCULATE([?], DATESBETWEEN(pedidos[fecha_pedido], DATE(2024, 3, 1), DATE(2024, 3, 31))))
```
```dax solucion
Ventas mes anterior = CALCULATE([Ventas], DATEADD(pedidos[fecha_pedido], -1, MONTH))
```
```pista
`DATEADD(<columna de fecha>, -1, MONTH)` mueve el rango visible un mes hacia atrás.
```
:::

:::ejercicio dax dificultad=Avanzado titulo="Pedidos en un rango"
Escribe **Pedidos primer semestre 2024**: la cantidad de pedidos entre el 1/1/2024 y el 30/6/2024, con `DATESBETWEEN`. Se evalúa por canal.
```dax medidas
Pedidos = COUNTROWS(pedidos)
```
```dax prueba
EVALUATE SUMMARIZECOLUMNS(pedidos[canal], "Pedidos S1 2024", [?])
```
```dax solucion
Pedidos primer semestre 2024 = CALCULATE([Pedidos], DATESBETWEEN(pedidos[fecha_pedido], DATE(2024, 1, 1), DATE(2024, 6, 30)))
```
:::

:::ejercicio quiz dificultad=Avanzado
En un gráfico por mes, la celda de **marzo de 2024** de `TOTALYTD([Ventas], Calendario[Date])` muestra…
- [ ] Solo las ventas de marzo
- [x] Las ventas desde el 1 de enero hasta el 31 de marzo de 2024
- [ ] Las ventas de los últimos 12 meses
- [ ] Las ventas de todo 2024
:::

:::ejercicio quiz dificultad=Avanzado
¿Por qué se recomienda una tabla calendario aparte en vez de usar `pedidos[fecha_pedido]` en las funciones de tiempo?
- [ ] Porque DAX no acepta columnas de tablas de hechos
- [x] Porque necesitan todos los días sin huecos, la tabla calendario filtra todas las tablas de hechos a la vez y permite agrupar por año, mes o trimestre
- [ ] Porque la fecha de los pedidos está en texto
- [ ] Porque Power BI cobra por cada columna de fecha
:::

:::entrevista "¿Cómo calcularías el crecimiento contra el año anterior en Power BI?"
Con una tabla calendario marcada como tabla de fechas y relacionada con los hechos. La medida usa VAR para el valor actual y para el del año anterior (CALCULATE con SAMEPERIODLASTYEAR o DATEADD de -1 año), y devuelve DIVIDE(actual - anterior, anterior) para no dividir por cero. Aclararía qué pasa con el año en curso incompleto: para comparar parejo, se compara contra el mismo período (YTD contra YTD del año anterior).
:::
