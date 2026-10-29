---
titulo: Series de tiempo - tendencia, estacionalidad y anomalías
nivel: Avanzado
duracion: 50
resumen: Analizar métricas a lo largo del tiempo con SQL - completar días sin datos con un calendario, agregar por semana y mes, suavizar con promedios móviles, comparar contra el año anterior, medir la estacionalidad con un índice y detectar días anómalos con la desviación respecto de la media.
objetivos: Construir series diarias completas aunque falten días | Calcular promedios móviles y comparaciones interanuales | Medir la estacionalidad de cada mes | Marcar valores anómalos con un criterio explícito
autoevaluacion: ¿Sabes por qué hay que rellenar los días sin datos? | ¿Sabes calcular el crecimiento contra el mismo mes del año anterior? | ¿Sabes qué es un índice de estacionalidad? | ¿Sabes un criterio simple para detectar anomalías?
---

:::escenario
En diciembre las ventas subieron un 11 % contra noviembre y en el directorio aplauden. El analista senior pregunta: “¿y contra diciembre del año pasado?”. Diciembre siempre sube: lo que importa es si subió **más de lo habitual**. Separar tendencia, estacionalidad y ruido evita festejos (y alarmas) equivocados.
:::

## Series completas: el calendario

Si un día no hubo pedidos, `GROUP BY fecha` simplemente no lo devuelve, y un promedio móvil de “7 filas” deja de ser de 7 días. Por eso se parte de un calendario y se une con `LEFT JOIN`.

```sql
WITH RECURSIVE cal(dia) AS (
  SELECT '2024-12-01' UNION ALL SELECT date(dia, '+1 day') FROM cal WHERE dia < '2024-12-31'
)
SELECT cal.dia, COUNT(p.pedido_id) AS pedidos
FROM cal LEFT JOIN pedidos p ON p.fecha_pedido = cal.dia
GROUP BY cal.dia
ORDER BY cal.dia
LIMIT 7;
```

## Tendencia: promedios móviles

Un promedio móvil de 7 días suaviza el efecto del día de la semana y deja ver la tendencia:

```sql
-- AVG(pedidos) OVER (ORDER BY dia ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)
```

## Comparar contra el año anterior

El crecimiento interanual (YoY) compara cada mes con **el mismo mes del año anterior**: elimina la estacionalidad de la comparación.

## Estacionalidad: el índice

Índice del mes = promedio de ese mes ÷ promedio de todos los meses. Un índice de 1,4 en diciembre significa que diciembre vende 40 % más que un mes típico.

## Anomalías

Un criterio simple: un día es anómalo si se aleja de la media más de 2 desviaciones estándar. SQLite no trae `STDDEV`, pero la varianza es `AVG(x²) − AVG(x)²`, y comparar `(x − media)² > 4 × varianza` evita la raíz cuadrada.

:::tip Siempre explicita la regla
“Anómalo” no existe sin una regla. Escribe cuál usaste (2 desviaciones, ventana de 28 días, excluyendo feriados…) y qué hiciste con los datos atípicos.
:::

## Ejercicios

:::ejercicio sql ordenado dificultad=Básico
Pedidos por **semana** de diciembre de 2024 usando `strftime('%W', fecha_pedido)` (número de semana del año). Columnas: `semana`, `pedidos`. Ordena por semana.
```sql solucion
SELECT strftime('%W', fecha_pedido) AS semana, COUNT(*) AS pedidos
FROM pedidos WHERE fecha_pedido >= '2024-12-01' AND fecha_pedido < '2025-01-01'
GROUP BY semana ORDER BY semana;
```
:::

:::ejercicio sql ordenado dificultad=Intermedio
Pedidos por **día de la semana** en todo 2024 (`dia_semana` de 0 = domingo a 6 = sábado, entero) y el promedio por día (2 decimales: pedidos ÷ cantidad de días distintos con ese día de la semana en los datos). Columnas: `dia_semana`, `pedidos`, `promedio_diario`. Ordena por `dia_semana`.
```pista
El promedio divide por los días distintos: `COUNT(DISTINCT fecha_pedido)`.
```
```sql solucion
SELECT CAST(strftime('%w', fecha_pedido) AS INTEGER) AS dia_semana, COUNT(*) AS pedidos,
       ROUND(1.0 * COUNT(*) / COUNT(DISTINCT fecha_pedido), 2) AS promedio_diario
FROM pedidos WHERE fecha_pedido >= '2024-01-01' AND fecha_pedido < '2025-01-01'
GROUP BY dia_semana ORDER BY dia_semana;
```
:::

:::ejercicio sql ordenado dificultad=Intermedio
Serie diaria **completa** de pedidos de febrero de 2024 (todos los días, con 0 si no hubo). Columnas: `dia`, `pedidos`. Ordena por día.
```pista
Calendario con CTE recursiva + `LEFT JOIN` + `COUNT(p.pedido_id)`.
```
```sql solucion
WITH RECURSIVE cal(dia) AS (SELECT '2024-02-01' UNION ALL SELECT date(dia, '+1 day') FROM cal WHERE dia < '2024-02-29')
SELECT cal.dia, COUNT(p.pedido_id) AS pedidos
FROM cal LEFT JOIN pedidos p ON p.fecha_pedido = cal.dia
GROUP BY cal.dia ORDER BY cal.dia;
```
:::

:::ejercicio sql ordenado dificultad=Avanzado
Promedio móvil de 7 días de los pedidos diarios de diciembre de 2024, sobre la serie **completa** de días. Columnas: `dia`, `pedidos`, `media_7d` (2 decimales). Ordena por día.
```pista
Primero la serie completa (calendario + LEFT JOIN), después la ventana `ROWS BETWEEN 6 PRECEDING AND CURRENT ROW`.
```
```sql solucion
WITH RECURSIVE cal(dia) AS (SELECT '2024-12-01' UNION ALL SELECT date(dia, '+1 day') FROM cal WHERE dia < '2024-12-31'),
s AS (SELECT cal.dia, COUNT(p.pedido_id) AS pedidos FROM cal LEFT JOIN pedidos p ON p.fecha_pedido = cal.dia GROUP BY cal.dia)
SELECT dia, pedidos, ROUND(AVG(pedidos) OVER (ORDER BY dia ROWS BETWEEN 6 PRECEDING AND CURRENT ROW), 2) AS media_7d
FROM s ORDER BY dia;
```
:::

:::ejercicio sql ordenado dificultad=Intermedio
Crecimiento interanual de pedidos por mes de 2024 contra el mismo mes de 2023 (%, 1 decimal). Columnas: `mes` (número de 1 a 12), `pedidos_2023`, `pedidos_2024`, `yoy_pct`. Ordena por mes.
```pista
Agregación condicional por año agrupando por el número de mes.
```
```sql solucion
SELECT CAST(strftime('%m', fecha_pedido) AS INTEGER) AS mes,
       SUM(CASE WHEN strftime('%Y', fecha_pedido) = '2023' THEN 1 ELSE 0 END) AS pedidos_2023,
       SUM(CASE WHEN strftime('%Y', fecha_pedido) = '2024' THEN 1 ELSE 0 END) AS pedidos_2024,
       ROUND(100.0 * (SUM(CASE WHEN strftime('%Y', fecha_pedido) = '2024' THEN 1 ELSE 0 END) - SUM(CASE WHEN strftime('%Y', fecha_pedido) = '2023' THEN 1 ELSE 0 END))
             / SUM(CASE WHEN strftime('%Y', fecha_pedido) = '2023' THEN 1 ELSE 0 END), 1) AS yoy_pct
FROM pedidos
WHERE fecha_pedido >= '2023-01-01' AND fecha_pedido < '2025-01-01'
GROUP BY mes ORDER BY mes;
```
:::

:::ejercicio sql ordenado dificultad=Avanzado
Índice de estacionalidad por mes con los tres años (2022–2024): promedio de pedidos de ese mes en los tres años ÷ promedio mensual general, 2 decimales. Columnas: `mes` (1 a 12), `indice`. Ordena por mes.
```pista
Primero los pedidos por año y mes (36 filas); después el promedio por mes y el promedio general de esas 36 filas.
```
```sql solucion
WITH am AS (
  SELECT strftime('%Y', fecha_pedido) AS anio, CAST(strftime('%m', fecha_pedido) AS INTEGER) AS mes, COUNT(*) AS pedidos
  FROM pedidos GROUP BY anio, mes
)
SELECT mes, ROUND(AVG(pedidos) / (SELECT AVG(pedidos) FROM am), 2) AS indice FROM am GROUP BY mes ORDER BY mes;
```
:::

:::ejercicio sql ordenado dificultad=Avanzado
Días **anómalos** de 2024 en pedidos: los días (con al menos un pedido) cuya cantidad se aleja de la media diaria de 2024 más de 2 desviaciones estándar. Columnas: `dia`, `pedidos`. Ordena por día.
```pista
Varianza = `AVG(x * x) - AVG(x) * AVG(x)` sobre la serie diaria.
```
```pista
Anómalo si `(pedidos - media) * (pedidos - media) > 4 * varianza`.
```
```sql solucion
WITH d AS (SELECT fecha_pedido AS dia, COUNT(*) AS pedidos FROM pedidos WHERE fecha_pedido >= '2024-01-01' AND fecha_pedido < '2025-01-01' GROUP BY fecha_pedido),
e AS (SELECT AVG(pedidos) AS media, AVG(pedidos * pedidos) - AVG(pedidos) * AVG(pedidos) AS var FROM d)
SELECT dia, pedidos FROM d, e WHERE (pedidos - media) * (pedidos - media) > 4 * var ORDER BY dia;
```
:::

:::ejercicio sql ordenado dificultad=Intermedio
Delivery (Rápido). Pedidos y minutos promedio de entrega (de `creado` a `entregado`, 1 decimal) por **hora** del día de los pedidos entregados. Columnas: `hora` (00–23), `pedidos`, `min_entrega`. Ordena por hora.
```sql solucion
SELECT strftime('%H', creado) AS hora, COUNT(*) AS pedidos,
       ROUND(AVG((julianday(entregado) - julianday(creado)) * 1440), 1) AS min_entrega
FROM delivery_pedidos WHERE estado = 'entregado'
GROUP BY hora ORDER BY hora;
```
:::

:::ejercicio sql ordenado dificultad=Avanzado
Energía (Luz del Valle). Consumo total por mes de 2024 (kWh) y su variación contra el mes anterior (%, 1 decimal; NULL en enero). Columnas: `mes`, `kwh`, `var_pct`. Ordena por mes.
```pista
`LAG(kwh) OVER (ORDER BY mes)` trae el mes anterior.
```
```sql solucion
WITH m AS (SELECT mes, SUM(kwh) AS kwh FROM energia_lecturas GROUP BY mes)
SELECT mes, kwh, ROUND(100.0 * (kwh - LAG(kwh) OVER (ORDER BY mes)) / LAG(kwh) OVER (ORDER BY mes), 1) AS var_pct
FROM m ORDER BY mes;
```
:::

:::ejercicio sql ordenado dificultad=Avanzado
Ventas netas (con descuento, sin cancelados) acumuladas en lo que va del año (**YTD**) mes a mes para 2023 y 2024, una al lado de la otra. Columnas: `mes` (1–12), `ytd_2023`, `ytd_2024` (2 decimales). Ordena por mes.
```pista
Primero ventas por año y mes; después `SUM(ventas) OVER (PARTITION BY anio ORDER BY mes)`; al final, pivotea con agregación condicional.
```
```sql solucion
WITH v AS (
  SELECT strftime('%Y', p.fecha_pedido) AS anio, CAST(strftime('%m', p.fecha_pedido) AS INTEGER) AS mes,
         SUM(d.cantidad * d.precio_unitario * (1 - d.descuento)) AS ventas
  FROM pedidos p JOIN detalle_pedidos d ON d.pedido_id = p.pedido_id
  WHERE p.estado <> 'cancelado' AND p.fecha_pedido >= '2023-01-01' AND p.fecha_pedido < '2025-01-01'
  GROUP BY anio, mes
), a AS (SELECT anio, mes, SUM(ventas) OVER (PARTITION BY anio ORDER BY mes) AS ytd FROM v)
SELECT mes, ROUND(SUM(CASE WHEN anio = '2023' THEN ytd END), 2) AS ytd_2023, ROUND(SUM(CASE WHEN anio = '2024' THEN ytd END), 2) AS ytd_2024
FROM a GROUP BY mes ORDER BY mes;
```
:::

:::ejercicio quiz dificultad=Intermedio
Las ventas de diciembre subieron 11 % contra noviembre. El índice de estacionalidad de diciembre es 1,6 y el de noviembre 1,45. ¿Qué concluyes?

- [ ] Fue un gran mes: 11 % es mucho crecimiento
- [x] Es casi exactamente lo esperado por estacionalidad (1,6 ÷ 1,45 ≈ +10 %): no hubo un crecimiento extra destacable
- [ ] Fue un mal mes porque el índice de diciembre es mayor
- [ ] No se puede concluir nada sin datos diarios
:::
