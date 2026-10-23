---
titulo: CTE: consultas legibles con WITH
nivel: Avanzado
duracion: 25
resumen: Common Table Expressions para dividir un problema en pasos con nombre.
---

Una **CTE** (*Common Table Expression*) es una subconsulta con nombre, declarada **antes** de la consulta principal con `WITH`. Convierte un laberinto de paréntesis en una receta paso a paso.

```sql
WITH ventas_por_cliente AS (
    SELECT p.cliente_id,
           SUM(d.cantidad * d.precio_unitario * (1 - d.descuento)) AS total
    FROM pedidos p
    JOIN detalle_pedidos d ON d.pedido_id = p.pedido_id
    WHERE p.estado = 'entregado'
    GROUP BY p.cliente_id
)
SELECT c.nombre, c.apellido, c.pais, ROUND(v.total, 2) AS total
FROM ventas_por_cliente v
JOIN clientes c ON c.cliente_id = v.cliente_id
ORDER BY v.total DESC
LIMIT 10;
```

## Varias CTE encadenadas

Se separan con comas, y cada una puede usar las anteriores:

```sql
WITH pedidos_2024 AS (
    SELECT * FROM pedidos WHERE fecha_pedido >= '2024-01-01'
),
por_cliente AS (
    SELECT cliente_id, COUNT(*) AS pedidos FROM pedidos_2024 GROUP BY cliente_id
),
distribucion AS (
    SELECT pedidos, COUNT(*) AS clientes FROM por_cliente GROUP BY pedidos
)
SELECT * FROM distribucion ORDER BY pedidos;
```

:::tip Por qué los profesionales aman las CTE
- **Legibilidad**: cada paso tiene un nombre que explica qué hace.
- **Depuración**: puedes ejecutar `SELECT * FROM paso_intermedio` para revisar cada etapa.
- **Reutilización**: una CTE se puede usar varias veces en la misma consulta.
- Es exactamente el estilo que usarás en **dbt**, donde cada modelo es una cadena de CTEs.
:::

:::experto ¿Las CTE son más rápidas?
No necesariamente. La mayoría de los motores modernos (PostgreSQL ≥ 12, Spark, Snowflake) las **expanden** como si fueran subconsultas y optimizan todo junto. Algunos pueden “materializarlas” (calcularlas una vez y guardarlas). Úsalas por claridad; mide si el rendimiento importa.
:::

## Ejercicios

:::ejercicio sql
Usando una CTE llamada `totales` con el importe neto por pedido, muestra cuántos pedidos (`pedidos`) y el promedio de importe (`ticket_promedio`, redondeado a 2) **por canal**. Columnas: `canal`, `pedidos`, `ticket_promedio`. Incluye todos los estados.
```sql solucion
WITH totales AS (
  SELECT pedido_id, SUM(cantidad * precio_unitario * (1 - descuento)) AS total
  FROM detalle_pedidos GROUP BY pedido_id
)
SELECT p.canal, COUNT(*) AS pedidos, ROUND(AVG(t.total), 2) AS ticket_promedio
FROM pedidos p JOIN totales t ON t.pedido_id = p.pedido_id
GROUP BY p.canal;
```
:::

:::ejercicio sql
Encuentra los **clientes VIP**: los que gastaron (en pedidos `entregado`) **más de 3 veces el gasto promedio** de los clientes que compraron. Muestra `cliente_id` y `gasto` (redondeado a 2). Usa dos CTE: una con el gasto por cliente y otra con el promedio.
```sql solucion
WITH gasto AS (
  SELECT p.cliente_id, SUM(d.cantidad * d.precio_unitario * (1 - d.descuento)) AS gasto
  FROM pedidos p JOIN detalle_pedidos d ON d.pedido_id = p.pedido_id
  WHERE p.estado = 'entregado'
  GROUP BY p.cliente_id
),
promedio AS (
  SELECT AVG(gasto) AS prom FROM gasto
)
SELECT g.cliente_id, ROUND(g.gasto, 2) AS gasto
FROM gasto g, promedio
WHERE g.gasto > 3 * promedio.prom;
```
```pista
En la consulta final puedes unir `gasto` con `promedio` (que tiene una sola fila) usando `FROM gasto g, promedio` o un `CROSS JOIN`.
```
:::

:::ejercicio sql ordenado
Calcula la **facturación neta mensual** de 2024 (pedidos no cancelados) y la cantidad de clientes **distintos** que compraron cada mes. Columnas: `mes` (formato `YYYY-MM`), `facturacion` (redondeada a 2), `clientes`. Ordena por mes.
```sql solucion
WITH lineas AS (
  SELECT strftime('%Y-%m', p.fecha_pedido) AS mes, p.cliente_id,
         d.cantidad * d.precio_unitario * (1 - d.descuento) AS importe
  FROM pedidos p JOIN detalle_pedidos d ON d.pedido_id = p.pedido_id
  WHERE p.estado <> 'cancelado' AND p.fecha_pedido >= '2024-01-01'
)
SELECT mes, ROUND(SUM(importe), 2) AS facturacion, COUNT(DISTINCT cliente_id) AS clientes
FROM lineas
GROUP BY mes
ORDER BY mes;
```
:::
