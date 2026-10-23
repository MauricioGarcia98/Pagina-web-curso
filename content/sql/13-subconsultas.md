---
titulo: Subconsultas
nivel: Intermedio
duracion: 30
resumen: Consultas dentro de consultas: escalares, con IN, EXISTS, correlacionadas y tablas derivadas.
---

Una **subconsulta** es un `SELECT` dentro de otro. Se escribe entre paréntesis y puede aparecer en varios lugares.

## 1. Subconsulta escalar (devuelve un solo valor)

```sql
-- Productos más caros que el promedio
SELECT nombre, precio
FROM productos
WHERE precio > (SELECT AVG(precio) FROM productos)
ORDER BY precio;
```

## 2. Subconsulta con IN (devuelve una lista)

```sql
-- Clientes que compraron algún producto Apple
SELECT cliente_id, nombre FROM clientes
WHERE cliente_id IN (
  SELECT p.cliente_id
  FROM pedidos p JOIN detalle_pedidos d ON d.pedido_id = p.pedido_id
  JOIN productos pr ON pr.producto_id = d.producto_id
  WHERE pr.marca = 'Apple'
);
```

## 3. EXISTS (¿existe al menos una fila?)

`EXISTS` es verdadero si la subconsulta devuelve **alguna** fila. Suele ser muy eficiente porque se detiene en la primera coincidencia.

```sql
SELECT c.cliente_id, c.nombre
FROM clientes c
WHERE EXISTS (SELECT 1 FROM pedidos p WHERE p.cliente_id = c.cliente_id AND p.canal = 'telefono');
```

:::cuidado NOT IN vs NOT EXISTS
Si la subconsulta de un `NOT IN` puede devolver algún `NULL`, el resultado será **vacío** (recuerda la lógica de tres valores). `NOT EXISTS` no tiene ese problema. Regla práctica: para “lo que no está”, prefiere **NOT EXISTS** o el anti-join con LEFT JOIN.
:::

## 4. Subconsultas correlacionadas

Una subconsulta **correlacionada** usa columnas de la consulta de afuera, así que se evalúa (conceptualmente) **una vez por fila**:

```sql
-- Para cada producto, su precio comparado con el promedio de SU categoría
SELECT p.nombre, p.categoria_id, p.precio,
       (SELECT ROUND(AVG(p2.precio), 2) FROM productos p2 WHERE p2.categoria_id = p.categoria_id) AS promedio_categoria
FROM productos p
LIMIT 10;
```

## 5. Tablas derivadas (subconsulta en el FROM)

El resultado de una subconsulta se puede usar como si fuera una tabla. Necesita un alias.

```sql
-- Promedio de pedidos por cliente (entre los que compraron)
SELECT ROUND(AVG(n), 2) AS promedio_pedidos
FROM (SELECT cliente_id, COUNT(*) AS n FROM pedidos GROUP BY cliente_id) AS t;
```

Cuando las subconsultas se anidan mucho, el código se vuelve difícil de leer. En la próxima sección aprenderás las **CTE** (`WITH`), que resuelven eso.

## Ejercicios

:::ejercicio sql
Muestra `nombre`, `apellido` y `salario` de los empleados que ganan **más que el salario promedio** de toda la empresa.
```sql solucion
SELECT nombre, apellido, salario FROM empleados WHERE salario > (SELECT AVG(salario) FROM empleados);
```
:::

:::ejercicio sql
Muestra `producto_id` y `nombre` de los productos que **nunca** se vendieron con un descuento del 20% (`descuento = 0.2`). Usa `NOT EXISTS`.
```sql solucion
SELECT pr.producto_id, pr.nombre FROM productos pr
WHERE NOT EXISTS (SELECT 1 FROM detalle_pedidos d WHERE d.producto_id = pr.producto_id AND d.descuento = 0.2);
```
:::

:::ejercicio sql
Muestra `nombre`, `categoria_id` y `precio` de los productos cuyo precio es **mayor que el promedio de su propia categoría** (subconsulta correlacionada).
```sql solucion
SELECT p.nombre, p.categoria_id, p.precio FROM productos p
WHERE p.precio > (SELECT AVG(p2.precio) FROM productos p2 WHERE p2.categoria_id = p.categoria_id);
```
:::

:::ejercicio sql
¿Cuál es el **promedio de unidades por pedido**? Primero suma las unidades de cada pedido en una tabla derivada y luego promedia, redondeando a 2. Columna: `unidades_promedio`.
```sql solucion
SELECT ROUND(AVG(unidades), 2) AS unidades_promedio
FROM (SELECT pedido_id, SUM(cantidad) AS unidades FROM detalle_pedidos GROUP BY pedido_id) t;
```
:::

:::ejercicio sql
Muestra el `pedido_id` y la `fecha_pedido` del (o de los) pedido(s) con el **importe neto más alto** de toda la historia, y ese importe redondeado a 2 (`total`).
```sql solucion
SELECT p.pedido_id, p.fecha_pedido, ROUND(t.total, 2) AS total
FROM pedidos p
JOIN (SELECT pedido_id, SUM(cantidad * precio_unitario * (1 - descuento)) AS total FROM detalle_pedidos GROUP BY pedido_id) t
  ON t.pedido_id = p.pedido_id
WHERE t.total = (SELECT MAX(total) FROM (SELECT SUM(cantidad * precio_unitario * (1 - descuento)) AS total FROM detalle_pedidos GROUP BY pedido_id));
```
```pista
Calcula el total por pedido en una tabla derivada, y compáralo con el máximo de esos totales (otra subconsulta).
```
:::
