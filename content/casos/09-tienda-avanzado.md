---
titulo: "Caso 🛒 Tienda Andina: preguntas de directorio"
nivel: Experto
duracion: 50
resumen: Canasta de productos, cliente nuevo vs recurrente, primer producto comprado, LTV y tiempo hasta la recompra.
---

Volvemos a la tienda que conoces, ahora con preguntas que haría un directorio. Todas exigen pensar bien el **grano** y el **orden temporal**.

:::ejercicio sql titulo="Productos que se compran juntos"
Análisis de **canasta**: pares de productos que aparecen en el **mismo pedido**. Devuelve los 10 pares más frecuentes: `producto_a`, `producto_b` (ids, con `producto_a < producto_b` para no duplicar), `pedidos_juntos`. Desempata por `producto_a` y `producto_b`.
```sql solucion
SELECT a.producto_id AS producto_a, b.producto_id AS producto_b, COUNT(*) AS pedidos_juntos
FROM detalle_pedidos a
JOIN detalle_pedidos b ON b.pedido_id = a.pedido_id AND a.producto_id < b.producto_id
GROUP BY a.producto_id, b.producto_id
ORDER BY pedidos_juntos DESC, producto_a, producto_b
LIMIT 10;
```
```pista
Self join de `detalle_pedidos` por `pedido_id` con la condición `a.producto_id < b.producto_id`.
```
:::

:::ejercicio sql ordenado titulo="Ventas de clientes nuevos vs recurrentes"
Para cada año, separa las ventas netas (pedidos no cancelados) entre pedidos de clientes **nuevos** (es su primer pedido) y **recurrentes**. Columnas: `anio`, `tipo_cliente` (`'nuevo'` o `'recurrente'`), `pedidos`, `ventas` (redondeado a 2). Ordena por año y tipo.
```sql solucion
WITH p AS (
  SELECT pedido_id, cliente_id, fecha_pedido,
         ROW_NUMBER() OVER (PARTITION BY cliente_id ORDER BY fecha_pedido, pedido_id) AS n
  FROM pedidos WHERE estado <> 'cancelado'
),
t AS (SELECT pedido_id, SUM(cantidad * precio_unitario * (1 - descuento)) AS total FROM detalle_pedidos GROUP BY pedido_id)
SELECT strftime('%Y', p.fecha_pedido) AS anio,
       CASE WHEN p.n = 1 THEN 'nuevo' ELSE 'recurrente' END AS tipo_cliente,
       COUNT(*) AS pedidos, ROUND(SUM(t.total), 2) AS ventas
FROM p JOIN t ON t.pedido_id = p.pedido_id
GROUP BY anio, tipo_cliente
ORDER BY anio, tipo_cliente;
```
:::

:::ejercicio sql ordenado titulo="La categoría de entrada"
¿Por qué categoría (nombre de la categoría del producto) entran los clientes? Toma el **primer pedido** no cancelado de cada cliente y cuenta, por categoría, cuántos clientes compraron algún producto de ella en ese primer pedido. Columnas: `categoria`, `clientes`. Ordena por clientes descendente y por categoría.
```sql solucion
WITH primero AS (
  SELECT pedido_id FROM (
    SELECT pedido_id, ROW_NUMBER() OVER (PARTITION BY cliente_id ORDER BY fecha_pedido, pedido_id) AS n
    FROM pedidos WHERE estado <> 'cancelado'
  ) WHERE n = 1
)
SELECT c.nombre AS categoria, COUNT(DISTINCT p.cliente_id) AS clientes
FROM primero f
JOIN pedidos p ON p.pedido_id = f.pedido_id
JOIN detalle_pedidos d ON d.pedido_id = f.pedido_id
JOIN productos pr ON pr.producto_id = d.producto_id
JOIN categorias c ON c.categoria_id = pr.categoria_id
GROUP BY c.nombre
ORDER BY clientes DESC, categoria;
```
:::

:::ejercicio sql ordenado titulo="LTV por cohorte de alta"
**LTV** (valor de vida) a la fecha: para los clientes que compraron, agrupados por **año de registro** (`anio_registro`), calcula `clientes` y el gasto neto promedio por cliente (`ltv_promedio`, redondeado a 2), considerando pedidos no cancelados. Ordena por año.
```sql solucion
WITH g AS (
  SELECT p.cliente_id, SUM(d.cantidad * d.precio_unitario * (1 - d.descuento)) AS gasto
  FROM pedidos p JOIN detalle_pedidos d ON d.pedido_id = p.pedido_id
  WHERE p.estado <> 'cancelado'
  GROUP BY p.cliente_id
)
SELECT strftime('%Y', c.fecha_registro) AS anio_registro, COUNT(*) AS clientes, ROUND(AVG(g.gasto), 2) AS ltv_promedio
FROM g JOIN clientes c ON c.cliente_id = g.cliente_id
GROUP BY anio_registro ORDER BY anio_registro;
```
```explicacion
Los clientes más antiguos tienen LTV más alto en parte porque tuvieron **más tiempo** para comprar. Para comparar cohortes de forma justa se usa el LTV a **igual antigüedad** (por ejemplo, gasto en los primeros 12 meses).
```
:::

:::ejercicio sql titulo="Mediana de días hasta la segunda compra"
Para los clientes con al menos dos pedidos no cancelados, calcula los días entre su primer y segundo pedido y devuelve la **mediana** (`mediana_dias`, redondeada a 1) y el **promedio** (`promedio_dias`, redondeado a 1). ¿Por qué difieren?
```sql solucion
WITH r AS (
  SELECT cliente_id, fecha_pedido, ROW_NUMBER() OVER (PARTITION BY cliente_id ORDER BY fecha_pedido, pedido_id) AS n
  FROM pedidos WHERE estado <> 'cancelado'
),
d AS (
  SELECT julianday(b.fecha_pedido) - julianday(a.fecha_pedido) AS dias
  FROM r a JOIN r b ON b.cliente_id = a.cliente_id AND a.n = 1 AND b.n = 2
),
o AS (SELECT dias, ROW_NUMBER() OVER (ORDER BY dias) AS rn, COUNT(*) OVER () AS c FROM d)
SELECT ROUND(AVG(CASE WHEN rn IN ((c + 1) / 2, (c + 2) / 2) THEN dias END), 1) AS mediana_dias,
       ROUND((SELECT AVG(dias) FROM d), 1) AS promedio_dias
FROM o;
```
```explicacion
Unos pocos clientes que tardan muchísimo en volver “tiran” el promedio hacia arriba. La **mediana** representa mejor al cliente típico cuando la distribución tiene cola larga.
```
:::
