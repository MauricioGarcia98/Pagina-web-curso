---
titulo: LEFT, RIGHT, FULL, SELF y CROSS JOIN
nivel: Intermedio
duracion: 35
resumen: Conservar filas sin pareja, encontrar lo que falta (anti-join), unir una tabla consigo misma y productos cartesianos.
---

## LEFT JOIN: conservar todo lo de la izquierda

`LEFT JOIN` devuelve **todas** las filas de la tabla izquierda, tengan o no pareja. Si no la tienen, las columnas de la derecha vienen en `NULL`.

```sql
SELECT c.cliente_id, c.nombre, p.pedido_id
FROM clientes c
LEFT JOIN pedidos p ON p.cliente_id = c.cliente_id
ORDER BY c.cliente_id
LIMIT 15;
```

| Tipo | Qué filas devuelve |
|---|---|
| `INNER JOIN` | Solo las que tienen pareja en ambos lados |
| `LEFT JOIN` | Todas las de la izquierda + pareja (o NULL) |
| `RIGHT JOIN` | Todas las de la derecha + pareja (o NULL). Es un LEFT JOIN con las tablas al revés |
| `FULL OUTER JOIN` | Todas las de ambos lados |
| `CROSS JOIN` | Todas las combinaciones posibles (producto cartesiano) |

:::nota Soporte
SQLite soporta `RIGHT` y `FULL OUTER JOIN` desde la versión 3.39 (la de este sitio lo soporta). En la práctica, el 95% de las veces usarás `INNER` y `LEFT`.
:::

## El anti-join: encontrar lo que falta

¿Qué clientes **nunca** compraron? LEFT JOIN y quedarse con los que no encontraron pareja:

```sql
SELECT c.cliente_id, c.nombre, c.fecha_registro
FROM clientes c
LEFT JOIN pedidos p ON p.cliente_id = c.cliente_id
WHERE p.pedido_id IS NULL;
```

:::cuidado WHERE vs ON en un LEFT JOIN
Una condición sobre la tabla **derecha** puesta en el `WHERE` convierte tu LEFT JOIN en un INNER JOIN (porque descarta las filas con NULL). Si quieres filtrar la tabla derecha **y conservar** a todos los de la izquierda, pon la condición en el `ON`:

```sql
-- Todos los clientes, con sus pedidos de 2024 (si tienen)
SELECT c.cliente_id, COUNT(p.pedido_id) AS pedidos_2024
FROM clientes c
LEFT JOIN pedidos p ON p.cliente_id = c.cliente_id AND p.fecha_pedido >= '2024-01-01'
GROUP BY c.cliente_id
LIMIT 10;
```
Fíjate en `COUNT(p.pedido_id)`: cuenta solo las filas con pedido (los NULL no cuentan), así quien no compró queda con 0.
:::

## SELF JOIN: una tabla consigo misma

La tabla `empleados` tiene `jefe_id`, que apunta a otro empleado. Para ver cada empleado con el nombre de su jefe, unimos la tabla con ella misma usando **dos alias**:

```sql
SELECT e.nombre AS empleado, e.cargo, j.nombre AS jefe, j.cargo AS cargo_jefe
FROM empleados e
LEFT JOIN empleados j ON j.empleado_id = e.jefe_id
LIMIT 10;
```

(Es LEFT porque el CEO no tiene jefe.)

## CROSS JOIN: todas las combinaciones

Útil para generar “grillas”: por ejemplo, todas las combinaciones de canal y año, para luego rellenar con ceros los que no tuvieron ventas.

```sql
SELECT canales.canal, anios.anio
FROM (SELECT DISTINCT canal FROM pedidos) AS canales
CROSS JOIN (SELECT DISTINCT strftime('%Y', fecha_pedido) AS anio FROM pedidos) AS anios
ORDER BY 1, 2;
```

:::cuidado Explosión de filas
Un CROSS JOIN de dos tablas de 10.000 filas da 100 millones. Y un JOIN con un `ON` mal escrito puede hacer lo mismo sin que te des cuenta. Si un total te da “demasiado grande”, sospecha de un join que duplica filas.
:::

## Joins con condiciones que no son igualdad

El `ON` acepta cualquier condición. Ejemplo: asignar a cada pedido el **rango de precio** de una tabla de rangos.

```sql
WITH rangos(nombre, desde, hasta) AS (VALUES ('chico', 0, 100), ('mediano', 100, 1000), ('grande', 1000, 1e9))
SELECT r.nombre, COUNT(*) AS lineas
FROM detalle_pedidos d
JOIN rangos r ON d.precio_unitario >= r.desde AND d.precio_unitario < r.hasta
GROUP BY r.nombre;
```

## Ejercicios

:::ejercicio sql
Muestra `cliente_id`, `nombre` y `apellido` de los clientes que **nunca hicieron un pedido**.
```sql solucion
SELECT c.cliente_id, c.nombre, c.apellido
FROM clientes c LEFT JOIN pedidos p ON p.cliente_id = c.cliente_id
WHERE p.pedido_id IS NULL;
```
:::

:::ejercicio sql
Para **todos** los clientes de `Bolivia`, muestra `cliente_id`, `nombre` y la cantidad de pedidos (`pedidos`), incluyendo con 0 a quienes no compraron.
```sql solucion
SELECT c.cliente_id, c.nombre, COUNT(p.pedido_id) AS pedidos
FROM clientes c LEFT JOIN pedidos p ON p.cliente_id = c.cliente_id
WHERE c.pais = 'Bolivia'
GROUP BY c.cliente_id, c.nombre;
```
```pista
`COUNT(p.pedido_id)` (no `COUNT(*)`) para que los clientes sin pedidos den 0.
```
:::

:::ejercicio sql
Muestra `pedido_id`, `fecha_pedido` y `estado` de los pedidos **no cancelados** que **no tienen ningún pago aprobado**.
```sql solucion
SELECT p.pedido_id, p.fecha_pedido, p.estado
FROM pedidos p
LEFT JOIN pagos pg ON pg.pedido_id = p.pedido_id AND pg.estado = 'aprobado'
WHERE pg.pago_id IS NULL AND p.estado <> 'cancelado';
```
```pista
La condición `pg.estado = 'aprobado'` va en el `ON` (si la pones en el WHERE, el anti-join deja de funcionar).
```
:::

:::ejercicio sql
Muestra el nombre de cada empleado (`empleado`), su `cargo` y el nombre de su jefe (`jefe`). Incluye al CEO con `jefe` en NULL.
```sql solucion
SELECT e.nombre AS empleado, e.cargo, j.nombre AS jefe
FROM empleados e LEFT JOIN empleados j ON j.empleado_id = e.jefe_id;
```
:::

:::ejercicio sql
Para cada jefe, cuenta cuántas personas le reportan **directamente**. Columnas: `jefe_id`, `nombre` (del jefe), `subordinados`. Solo jefes con **más de 5** subordinados.
```sql solucion
SELECT j.empleado_id AS jefe_id, j.nombre, COUNT(*) AS subordinados
FROM empleados e JOIN empleados j ON j.empleado_id = e.jefe_id
GROUP BY j.empleado_id, j.nombre
HAVING COUNT(*) > 5;
```
:::

:::ejercicio sql ordenado
Crea una grilla con **todos** los canales y **todos** los años (2022, 2023, 2024) y la cantidad de pedidos `devuelto` de cada combinación, **incluyendo ceros**. Columnas: `canal`, `anio`, `devueltos`. Ordena por canal y año.
```sql solucion
SELECT c.canal, a.anio, COUNT(p.pedido_id) AS devueltos
FROM (SELECT DISTINCT canal FROM pedidos) c
CROSS JOIN (SELECT DISTINCT strftime('%Y', fecha_pedido) AS anio FROM pedidos) a
LEFT JOIN pedidos p ON p.canal = c.canal AND strftime('%Y', p.fecha_pedido) = a.anio AND p.estado = 'devuelto'
GROUP BY c.canal, a.anio
ORDER BY c.canal, a.anio;
```
```pista
CROSS JOIN de canales distintos y años distintos, y luego LEFT JOIN a pedidos con todas las condiciones en el `ON`.
```
:::
