---
titulo: Funciones de ventana II: acumulados, LAG/LEAD y marcos
nivel: Avanzado
duracion: 40
resumen: Totales acumulados, promedios móviles, comparar con el periodo anterior, FIRST_VALUE, NTILE y percentiles.
---

## Totales acumulados (running totals)

Con `ORDER BY` dentro de `OVER`, una agregación se vuelve **acumulada**: suma desde el inicio de la partición hasta la fila actual.

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
       ROUND(SUM(ventas) OVER (ORDER BY mes), 2) AS acumulado,
       ROUND(SUM(ventas) OVER (PARTITION BY substr(mes, 1, 4) ORDER BY mes), 2) AS acumulado_anual
FROM mensual
ORDER BY mes;
```

## El marco (frame): ROWS BETWEEN

El **marco** define exactamente qué filas de la partición entran en el cálculo:

| Marco | Significado |
|---|---|
| `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` | Desde el inicio hasta la fila actual (acumulado) |
| `ROWS BETWEEN 2 PRECEDING AND CURRENT ROW` | La actual y las 2 anteriores (móvil de 3) |
| `ROWS BETWEEN 1 PRECEDING AND 1 FOLLOWING` | Anterior, actual y siguiente (centrado) |
| `ROWS BETWEEN CURRENT ROW AND UNBOUNDED FOLLOWING` | Desde la actual hasta el final |

```sql
-- Promedio móvil de 3 meses
WITH mensual AS (
  SELECT strftime('%Y-%m', fecha_pedido) AS mes, COUNT(*) AS pedidos
  FROM pedidos GROUP BY mes
)
SELECT mes, pedidos,
       ROUND(AVG(pedidos) OVER (ORDER BY mes ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 1) AS movil_3m
FROM mensual;
```

:::cuidado ROWS vs RANGE (el detalle que nadie te cuenta)
Si escribes `ORDER BY` sin marco, el marco por defecto es `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`. **RANGE** incluye a todas las filas **empatadas** con la actual. Si dos filas tienen la misma fecha, ambas muestran el mismo acumulado (que ya incluye a las dos). Si quieres sumar fila por fila, usa `ROWS` explícitamente o desempata el `ORDER BY`.
:::

## LAG y LEAD: mirar filas vecinas

- `LAG(col, n, por_defecto)`: el valor de `n` filas **antes** (por defecto 1).
- `LEAD(col, n, por_defecto)`: el valor de `n` filas **después**.

Perfectas para “crecimiento respecto al mes anterior” o “días entre compras”:

```sql
WITH mensual AS (
  SELECT strftime('%Y-%m', fecha_pedido) AS mes, COUNT(*) AS pedidos FROM pedidos GROUP BY mes
)
SELECT mes, pedidos,
       LAG(pedidos) OVER (ORDER BY mes) AS mes_anterior,
       ROUND(100.0 * (pedidos - LAG(pedidos) OVER (ORDER BY mes)) / LAG(pedidos) OVER (ORDER BY mes), 1) AS crecimiento_pct
FROM mensual;
```

## FIRST_VALUE, LAST_VALUE y NTH_VALUE

```sql
SELECT cliente_id, pedido_id, fecha_pedido,
       FIRST_VALUE(fecha_pedido) OVER (PARTITION BY cliente_id ORDER BY fecha_pedido) AS primera_compra
FROM pedidos
WHERE cliente_id <= 3;
```

:::cuidado La trampa de LAST_VALUE
`LAST_VALUE` con el marco por defecto devuelve… la fila actual (el marco termina en `CURRENT ROW`). Para la última de verdad: `LAST_VALUE(x) OVER (PARTITION BY ... ORDER BY ... ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING)`. O más simple: `FIRST_VALUE` con el orden invertido.
:::

## NTILE, PERCENT_RANK y CUME_DIST

- `NTILE(4)` divide las filas en 4 grupos de tamaño parecido (cuartiles). Muy usado para segmentar clientes (RFM).
- `PERCENT_RANK()` = (rank − 1) / (filas − 1), entre 0 y 1.
- `CUME_DIST()` = proporción de filas con valor ≤ al actual.

```sql
SELECT nombre, precio,
       NTILE(4) OVER (ORDER BY precio) AS cuartil,
       ROUND(PERCENT_RANK() OVER (ORDER BY precio), 3) AS pct_rank
FROM productos
LIMIT 10;
```

## Ventanas con nombre (WINDOW)

Si repites la misma ventana, dale un nombre:

```sql
SELECT nombre, salario,
       RANK() OVER w AS puesto,
       ROUND(AVG(salario) OVER w, 0) AS promedio_acumulado
FROM empleados
WINDOW w AS (ORDER BY salario DESC)
LIMIT 10;
```

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
