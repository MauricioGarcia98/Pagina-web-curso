---
titulo: Funciones de ventana II: acumulados, LAG/LEAD y marcos
nivel: Avanzado
duracion: 50
resumen: Totales acumulados, promedios móviles, comparar con el periodo anterior, FIRST_VALUE, NTILE y percentiles.
---

## Más allá del ranking

En la lección anterior usaste `ORDER BY` dentro de `OVER` para numerar filas. Ese mismo orden abre otras puertas: **acumular** ("ventas acumuladas del año"), **suavizar** ("promedio de los últimos 3 meses") y **comparar con filas vecinas** ("¿cuánto crecimos respecto al mes anterior?", "¿cuántos días pasaron desde la compra anterior?"). Son las herramientas de cualquier análisis temporal.

## Totales acumulados

Si a una agregación de ventana le agregas `ORDER BY`, deja de ser "el total del grupo" y pasa a ser **"el total desde el principio hasta esta fila"**:

```sql
WITH mensual AS (
  SELECT strftime('%Y-%m', fecha_pedido) AS mes, COUNT(*) AS pedidos
  FROM pedidos
  GROUP BY mes
)
SELECT mes, pedidos,
       SUM(pedidos) OVER (ORDER BY mes) AS acumulado
FROM mensual
ORDER BY mes;
```

| mes | pedidos | acumulado |
|---|---|---|
| 2022-01 | 233 | 233 |
| 2022-02 | 238 | 471 |
| 2022-03 | 247 | 718 |
| 2022-04 | 275 | 993 |

Cada fila suma su valor al de todas las anteriores: 233, luego 233 + 238 = 471, luego 471 + 247 = 718…

:::tip Primero agrega, después acumula
Fíjate en la estructura: una CTE agrupa por mes (una fila por mes) y **después** se aplica la ventana. Intentar acumular sobre los 12.000 pedidos sueltos y agrupar a la vez lleva a errores. El patrón "agregar en una CTE y aplicar ventanas en el paso siguiente" es el que usarás siempre.
:::

### Acumular "por año": PARTITION BY + ORDER BY

Con `PARTITION BY`, el acumulado **vuelve a cero** en cada grupo. Es el clásico "acumulado del año" (*year to date*, YTD):

```sql
WITH mensual AS (
  SELECT strftime('%Y-%m', p.fecha_pedido) AS mes,
         SUM(d.cantidad * d.precio_unitario * (1 - d.descuento)) AS ventas
  FROM pedidos p JOIN detalle_pedidos d ON d.pedido_id = p.pedido_id
  WHERE p.estado <> 'cancelado'
  GROUP BY mes
)
SELECT mes,
       ROUND(ventas, 2) AS ventas,
       ROUND(SUM(ventas) OVER (ORDER BY mes), 2)                                AS acumulado_total,
       ROUND(SUM(ventas) OVER (PARTITION BY substr(mes, 1, 4) ORDER BY mes), 2) AS acumulado_anual
FROM mensual
ORDER BY mes;
```

`substr(mes, 1, 4)` toma el año (`'2022'`), así que cada año es una partición: en enero de 2023 el acumulado anual arranca de nuevo.

## El marco: qué filas entran en el cálculo

El **marco** (*frame*) define, para cada fila, **cuáles filas de su partición** participan del cálculo. Se escribe con `ROWS BETWEEN inicio AND fin`:

| Marco | Significa | Uso típico |
|---|---|---|
| `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` | Desde la primera fila hasta la actual | Acumulado |
| `ROWS BETWEEN 2 PRECEDING AND CURRENT ROW` | La actual y las 2 anteriores | Promedio móvil de 3 periodos |
| `ROWS BETWEEN 6 PRECEDING AND CURRENT ROW` | La actual y las 6 anteriores | Promedio de 7 días |
| `ROWS BETWEEN 1 PRECEDING AND 1 FOLLOWING` | Anterior, actual y siguiente | Suavizado centrado |
| `ROWS BETWEEN CURRENT ROW AND UNBOUNDED FOLLOWING` | Desde la actual hasta la última | "Lo que falta" |
| `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING` | Toda la partición | Total del grupo |

### Promedio móvil

Las series mensuales o diarias tienen "ruido" (un mes con un feriado, una semana con una promoción). Un **promedio móvil** suaviza la curva para ver la tendencia:

```sql
WITH mensual AS (
  SELECT strftime('%Y-%m', fecha_pedido) AS mes, COUNT(*) AS pedidos
  FROM pedidos GROUP BY mes
)
SELECT mes, pedidos,
       ROUND(AVG(pedidos) OVER (ORDER BY mes ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 1) AS movil_3m
FROM mensual;
```

| mes | pedidos | movil_3m | cálculo |
|---|---|---|---|
| 2022-01 | 233 | 233.0 | solo enero (no hay anteriores) |
| 2022-02 | 238 | 235.5 | (233 + 238) / 2 |
| 2022-03 | 247 | 239.3 | (233 + 238 + 247) / 3 |
| 2022-04 | 275 | 253.3 | (238 + 247 + 275) / 3 |

Observa los primeros meses: el marco "2 anteriores" todavía no tiene 2 filas, así que promedia las que haya. Si eso te molesta, puedes mostrar `NULL` mientras `COUNT(*) OVER (mismo marco) < 3`.

:::cuidado ROWS vs RANGE (el detalle que nadie te cuenta)
Si escribes `ORDER BY` **sin** marco, el marco por defecto es `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`. **RANGE** trata como una sola cosa a todas las filas **empatadas** en el orden:

```sql
WITH t(dia, v) AS (VALUES ('d1', 10), ('d2', 5), ('d2', 7), ('d3', 1))
SELECT dia, v,
       SUM(v) OVER (ORDER BY dia)                                           AS con_range,
       SUM(v) OVER (ORDER BY dia ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS con_rows
FROM t;
```

| dia | v | con_range | con_rows |
|---|---|---|---|
| d1 | 10 | 10 | 10 |
| d2 | 5 | **22** | 15 |
| d2 | 7 | 22 | 22 |
| d3 | 1 | 23 | 23 |

Las dos filas del día `d2` muestran 22 con `RANGE` (ya incluyen a las dos). Con `ROWS`, se suma fila por fila. Ninguno está "mal", pero tienes que saber cuál quieres. Si el orden no tiene empates (una fila por mes), ambos dan lo mismo.
:::

## LAG y LEAD: mirar a los vecinos

- `LAG(columna, n, valor_por_defecto)`: el valor de la fila que está `n` posiciones **antes** (por defecto, 1).
- `LEAD(columna, n, valor_por_defecto)`: el valor de la fila `n` posiciones **después**.

### Crecimiento respecto al periodo anterior

```sql
WITH mensual AS (
  SELECT strftime('%Y-%m', fecha_pedido) AS mes, COUNT(*) AS pedidos FROM pedidos GROUP BY mes
)
SELECT mes, pedidos,
       LAG(pedidos) OVER (ORDER BY mes) AS mes_anterior,
       ROUND(100.0 * (pedidos - LAG(pedidos) OVER (ORDER BY mes))
             / LAG(pedidos) OVER (ORDER BY mes), 1) AS crecimiento_pct
FROM mensual;
```

| mes | pedidos | mes_anterior | crecimiento_pct |
|---|---|---|---|
| 2022-01 | 233 | NULL | NULL |
| 2022-02 | 238 | 233 | 2.1 |
| 2022-04 | 275 | 247 | 11.3 |
| 2022-05 | 241 | 275 | −12.4 |

El primer mes no tiene anterior: `LAG` devuelve `NULL` (o el tercer argumento si lo das: `LAG(pedidos, 1, 0)`). La fórmula del crecimiento es siempre **(actual − anterior) / anterior**.

Para comparar con **el mismo mes del año anterior** (y evitar la estacionalidad), usa `LAG(pedidos, 12)`, siempre que no falten meses en la serie.

### Tiempo entre eventos

Con `PARTITION BY`, `LAG` mira la fila anterior **del mismo cliente**:

```sql
SELECT cliente_id, pedido_id, fecha_pedido,
       julianday(fecha_pedido) - julianday(LAG(fecha_pedido) OVER (PARTITION BY cliente_id ORDER BY fecha_pedido)) AS dias_desde_anterior
FROM pedidos
WHERE cliente_id = 3;
```

| cliente_id | pedido_id | fecha_pedido | dias_desde_anterior |
|---|---|---|---|
| 3 | 10386 | 2024-09-17 | NULL |
| 3 | 10727 | 2024-10-18 | 31.0 |
| 3 | 11506 | 2024-12-06 | 49.0 |
| 3 | 11915 | 2024-12-27 | 21.0 |

Esta técnica es la base de muchísimos análisis: frecuencia de compra, sesiones web (un "corte" cuando pasan más de 30 minutos entre eventos), rachas, detección de fraude (tres compras en pocos segundos: lo verás en el caso del banco con `LAG(fecha_hora, 2)`).

## FIRST_VALUE, LAST_VALUE y NTH_VALUE

Devuelven el valor de la primera, la última o la n-ésima fila **del marco**:

```sql
SELECT cliente_id, pedido_id, fecha_pedido,
       FIRST_VALUE(fecha_pedido) OVER (PARTITION BY cliente_id ORDER BY fecha_pedido) AS primera_compra
FROM pedidos
WHERE cliente_id <= 3;
```

Cada pedido muestra la fecha de la **primera** compra de su cliente: útil para análisis de cohortes ("clientes que empezaron en enero").

:::cuidado La trampa de LAST_VALUE
`LAST_VALUE(fecha_pedido) OVER (PARTITION BY cliente_id ORDER BY fecha_pedido)` devuelve… la fecha de la **fila actual**, no la última. ¿Por qué? Por el marco por defecto: termina en `CURRENT ROW`, así que "la última fila del marco" es la actual. Soluciones:
- Ampliar el marco: `… ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING`.
- Más simple: `FIRST_VALUE` con el orden invertido (`ORDER BY fecha_pedido DESC`), o `MAX(fecha_pedido) OVER (PARTITION BY cliente_id)`.
:::

## Distribuciones: NTILE, PERCENT_RANK y CUME_DIST

| Función | Devuelve | Ejemplo de uso |
|---|---|---|
| `NTILE(n)` | En cuál de `n` grupos iguales cae la fila (1…n) | Cuartiles de gasto (segmentación RFM) |
| `PERCENT_RANK()` | (puesto − 1) / (filas − 1), entre 0 y 1 | "Este producto es más caro que el 87 % del catálogo" |
| `CUME_DIST()` | Proporción de filas con valor ≤ al actual | Distribución acumulada |

```sql
SELECT nombre, precio,
       NTILE(4) OVER (ORDER BY precio)                AS cuartil,
       ROUND(PERCENT_RANK() OVER (ORDER BY precio), 3) AS pct_rank
FROM productos
LIMIT 10;
```

## Ventanas con nombre: WINDOW

Si repites la misma definición varias veces, ponle nombre al final de la consulta:

```sql
SELECT nombre, salario,
       RANK() OVER w                  AS puesto,
       ROUND(AVG(salario) OVER w, 0)  AS promedio_acumulado
FROM empleados
WINDOW w AS (ORDER BY salario DESC)
LIMIT 10;
```

Funciona en SQLite, PostgreSQL, MySQL 8 y Spark. Hace el código más corto y evita que dos ventanas "iguales" queden distintas por un error de tipeo.

## Resumen

- Agregación + `ORDER BY` en el `OVER` = acumulado; con `PARTITION BY` se reinicia por grupo (YTD).
- El marco `ROWS BETWEEN … AND …` define qué filas entran: acumulados, promedios móviles, ventanas centradas.
- Sin marco explícito, el defecto es `RANGE … CURRENT ROW`: los empates se tratan juntos.
- `LAG`/`LEAD` miran filas anteriores/siguientes: crecimiento, días entre compras, sesiones.
- `FIRST_VALUE` es seguro; `LAST_VALUE` necesita ampliar el marco. `NTILE` y `PERCENT_RANK` describen distribuciones.

## Ejercicios

:::ejercicio sql ordenado
Calcula los **pedidos por día** de diciembre de 2024 y el **acumulado** del mes. Columnas: `dia` (la fecha), `pedidos`, `acumulado`. Ordena por día.
```sql solucion
SELECT fecha_pedido AS dia, COUNT(*) AS pedidos,
       SUM(COUNT(*)) OVER (ORDER BY fecha_pedido) AS acumulado
FROM pedidos
WHERE fecha_pedido >= '2024-12-01' AND fecha_pedido < '2025-01-01'
GROUP BY fecha_pedido
ORDER BY dia;
```
```pista
Puedes anidar: `SUM(COUNT(*)) OVER (ORDER BY fecha_pedido)`. O hacerlo en dos pasos con una CTE.
```
:::

:::ejercicio sql ordenado
Para el cliente `1367`, muestra cada pedido con `pedido_id`, `fecha_pedido`, la fecha de su pedido anterior (`fecha_anterior`) y los **días transcurridos** desde ese pedido anterior (`dias`, entero; NULL en el primero). Ordena por fecha y `pedido_id`.
```sql solucion
SELECT pedido_id, fecha_pedido,
       LAG(fecha_pedido) OVER (ORDER BY fecha_pedido, pedido_id) AS fecha_anterior,
       CAST(julianday(fecha_pedido) - julianday(LAG(fecha_pedido) OVER (ORDER BY fecha_pedido, pedido_id)) AS INTEGER) AS dias
FROM pedidos
WHERE cliente_id = 1367
ORDER BY fecha_pedido, pedido_id;
```
:::

:::ejercicio sql ordenado
Calcula los pedidos por **mes** (`mes` en formato `YYYY-MM`) y un **promedio móvil de 3 meses** (el mes actual y los 2 anteriores) redondeado a 2 (`movil_3m`). Ordena por mes.
```sql solucion
WITH m AS (
  SELECT strftime('%Y-%m', fecha_pedido) AS mes, COUNT(*) AS pedidos FROM pedidos GROUP BY mes
)
SELECT mes, pedidos,
       ROUND(AVG(pedidos) OVER (ORDER BY mes ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 2) AS movil_3m
FROM m
ORDER BY mes;
```
:::

:::ejercicio sql ordenado
Calcula la **variación porcentual de facturación neta año contra año** (pedidos no cancelados). Columnas: `anio`, `ventas` (redondeado a 2), `ventas_anio_anterior` (redondeado a 2) y `variacion_pct` (redondeado a 2). Ordena por año.
```sql solucion
WITH a AS (
  SELECT strftime('%Y', p.fecha_pedido) AS anio, SUM(d.cantidad * d.precio_unitario * (1 - d.descuento)) AS ventas
  FROM pedidos p JOIN detalle_pedidos d ON d.pedido_id = p.pedido_id
  WHERE p.estado <> 'cancelado'
  GROUP BY anio
)
SELECT anio, ROUND(ventas, 2) AS ventas,
       ROUND(LAG(ventas) OVER (ORDER BY anio), 2) AS ventas_anio_anterior,
       ROUND(100.0 * (ventas - LAG(ventas) OVER (ORDER BY anio)) / LAG(ventas) OVER (ORDER BY anio), 2) AS variacion_pct
FROM a
ORDER BY anio;
```
:::

:::ejercicio sql
Segmenta a los clientes que compraron en **4 cuartiles** según su cantidad de pedidos (cuartil 4 = los que más compran) y muestra, por cuartil, cuántos clientes hay (`clientes`) y el mínimo y máximo de pedidos (`min_pedidos`, `max_pedidos`). Usa `NTILE(4) OVER (ORDER BY pedidos, cliente_id)`.
```sql solucion
WITH pc AS (
  SELECT cliente_id, COUNT(*) AS pedidos FROM pedidos GROUP BY cliente_id
),
q AS (
  SELECT cliente_id, pedidos, NTILE(4) OVER (ORDER BY pedidos, cliente_id) AS cuartil FROM pc
)
SELECT cuartil, COUNT(*) AS clientes, MIN(pedidos) AS min_pedidos, MAX(pedidos) AS max_pedidos
FROM q GROUP BY cuartil;
```
:::

:::ejercicio sql
Para cada cliente con pedidos, muestra `cliente_id`, la fecha de su **primera** compra (`primera`) y la de su **última** compra (`ultima`) usando `FIRST_VALUE` (sin `GROUP BY`; usa `DISTINCT` para dejar una fila por cliente).
```sql solucion
SELECT DISTINCT cliente_id,
       FIRST_VALUE(fecha_pedido) OVER (PARTITION BY cliente_id ORDER BY fecha_pedido) AS primera,
       FIRST_VALUE(fecha_pedido) OVER (PARTITION BY cliente_id ORDER BY fecha_pedido DESC) AS ultima
FROM pedidos;
```
```pista
Para la última, usa `FIRST_VALUE` con el orden invertido (`DESC`), así evitas la trampa del marco de `LAST_VALUE`.
```
:::
