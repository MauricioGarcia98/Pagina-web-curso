---
titulo: "Caso práctico I: el informe ejecutivo en SQL"
nivel: Experto
duracion: 60
resumen: Responde las preguntas de la gerencia con SQL sobre los datos de Tienda Andina.
---

La gerente general te pide un informe para la reunión de directorio. Cada pregunta es un ejercicio. Usa CTEs y piensa en el **grano** de cada resultado. Considera **ventas netas** = `cantidad * precio_unitario * (1 - descuento)` y excluye pedidos **cancelados** salvo que se indique otra cosa.

:::ejercicio sql ordenado titulo="KPIs anuales"
Para cada año: `anio`, `pedidos` (cantidad de pedidos no cancelados), `clientes` (distintos), `ventas` (redondeado a 2) y `ticket_promedio` (ventas / pedidos, redondeado a 2). Ordena por año.
```sql solucion
WITH lineas AS (
  SELECT strftime('%Y', p.fecha_pedido) AS anio, p.pedido_id, p.cliente_id,
         d.cantidad * d.precio_unitario * (1 - d.descuento) AS importe
  FROM pedidos p JOIN detalle_pedidos d ON d.pedido_id = p.pedido_id
  WHERE p.estado <> 'cancelado'
)
SELECT anio, COUNT(DISTINCT pedido_id) AS pedidos, COUNT(DISTINCT cliente_id) AS clientes,
       ROUND(SUM(importe), 2) AS ventas,
       ROUND(SUM(importe) / COUNT(DISTINCT pedido_id), 2) AS ticket_promedio
FROM lineas GROUP BY anio ORDER BY anio;
```
:::

:::ejercicio sql ordenado titulo="Participación por categoría padre en 2024"
Ventas 2024 por **categoría padre** (`categoria`) y su participación sobre el total (`pct`, redondeado a 2). Ordena de mayor a menor venta. Columnas: `categoria`, `ventas` (redondeado a 2), `pct`.
```sql solucion
WITH RECURSIVE arbol AS (
  SELECT categoria_id, nombre AS raiz FROM categorias WHERE categoria_padre_id IS NULL
  UNION ALL
  SELECT c.categoria_id, a.raiz FROM categorias c JOIN arbol a ON c.categoria_padre_id = a.categoria_id
),
v AS (
  SELECT a.raiz AS categoria, SUM(d.cantidad * d.precio_unitario * (1 - d.descuento)) AS ventas
  FROM detalle_pedidos d
  JOIN pedidos p ON p.pedido_id = d.pedido_id
  JOIN productos pr ON pr.producto_id = d.producto_id
  JOIN arbol a ON a.categoria_id = pr.categoria_id
  WHERE p.estado <> 'cancelado' AND p.fecha_pedido >= '2024-01-01'
  GROUP BY a.raiz
)
SELECT categoria, ROUND(ventas, 2) AS ventas, ROUND(100.0 * ventas / SUM(ventas) OVER (), 2) AS pct
FROM v ORDER BY ventas DESC;
```
```pista
Las categorías tienen hasta 3 niveles (Tecnología > Computadoras > Laptops). Una CTE recursiva que lleve la **raíz** de cada categoría resuelve el mapeo.
```
:::

:::ejercicio sql titulo="Mejores vendedores de 2024"
Top 5 vendedores (empleados) por ventas 2024 con su departamento. Columnas: `vendedor` (nombre y apellido separados por espacio), `pedidos`, `ventas` (redondeado a 2).
```sql solucion
SELECT e.nombre || ' ' || e.apellido AS vendedor, COUNT(DISTINCT p.pedido_id) AS pedidos,
       ROUND(SUM(d.cantidad * d.precio_unitario * (1 - d.descuento)), 2) AS ventas
FROM pedidos p
JOIN detalle_pedidos d ON d.pedido_id = p.pedido_id
JOIN empleados e ON e.empleado_id = p.empleado_id
WHERE p.estado <> 'cancelado' AND p.fecha_pedido >= '2024-01-01'
GROUP BY e.empleado_id, vendedor
ORDER BY SUM(d.cantidad * d.precio_unitario * (1 - d.descuento)) DESC
LIMIT 5;
```
:::

:::ejercicio sql titulo="Segmentación RFM"
Clasifica a los clientes con compras no canceladas en segmentos: `'Campeón'` si compraron en los últimos 90 días (respecto a `2024-12-31`) **y** tienen 10 o más pedidos; `'En riesgo'` si su última compra fue hace más de 365 días; `'Regular'` el resto. Devuelve cuántos clientes hay en cada segmento. Columnas: `segmento`, `clientes`.
```sql solucion
WITH r AS (
  SELECT cliente_id, MAX(fecha_pedido) AS ultima, COUNT(*) AS pedidos
  FROM pedidos WHERE estado <> 'cancelado' GROUP BY cliente_id
)
SELECT CASE
         WHEN julianday('2024-12-31') - julianday(ultima) <= 90 AND pedidos >= 10 THEN 'Campeón'
         WHEN julianday('2024-12-31') - julianday(ultima) > 365 THEN 'En riesgo'
         ELSE 'Regular'
       END AS segmento,
       COUNT(*) AS clientes
FROM r GROUP BY segmento;
```
:::

:::ejercicio sql titulo="Alertas de calidad"
Arma un reporte de calidad con **una fila por regla** y la cantidad de filas que la violan. Columnas: `regla`, `filas`. Reglas: `'pedido_entregado_sin_pago'` (pedidos `entregado` sin pago `aprobado`), `'cliente_sin_email'` (clientes con email NULL), `'pago_rechazado'` (pagos con estado `rechazado`). Usa `UNION ALL`.
```sql solucion
SELECT 'pedido_entregado_sin_pago' AS regla, COUNT(*) AS filas
FROM pedidos p
WHERE p.estado = 'entregado'
  AND NOT EXISTS (SELECT 1 FROM pagos g WHERE g.pedido_id = p.pedido_id AND g.estado = 'aprobado')
UNION ALL
SELECT 'cliente_sin_email', COUNT(*) FROM clientes WHERE email IS NULL
UNION ALL
SELECT 'pago_rechazado', COUNT(*) FROM pagos WHERE estado = 'rechazado';
```
:::
