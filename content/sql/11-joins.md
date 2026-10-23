---
titulo: JOIN: combinar tablas
nivel: Intermedio
duracion: 30
resumen: Claves primarias y foráneas, INNER JOIN, alias de tabla y joins de varias tablas.
---

En una base de datos bien diseñada, la información está **repartida** en varias tablas para no repetirla. El pedido guarda solo el `cliente_id`, no el nombre del cliente. Para ver ambos juntos hay que **unir** (*join*) las tablas.

## Claves primarias y foráneas

- **Clave primaria (PK)**: identifica cada fila de una tabla. `clientes.cliente_id`.
- **Clave foránea (FK)**: una columna que apunta a la PK de otra tabla. `pedidos.cliente_id` apunta a `clientes.cliente_id`.

```sql
SELECT p.pedido_id, p.fecha_pedido, c.nombre, c.apellido, c.pais
FROM pedidos AS p
JOIN clientes AS c ON c.cliente_id = p.cliente_id
LIMIT 10;
```

- `JOIN ... ON condición` dice qué filas se emparejan.
- `p` y `c` son **alias de tabla**: abrevian y evitan ambigüedades (`p.cliente_id` vs `c.cliente_id`).
- `JOIN` a secas significa `INNER JOIN`: solo quedan las filas **con pareja en ambas tablas**.

:::analogia El baile de parejas
INNER JOIN es un baile donde solo entran a la pista quienes encontraron pareja. Un cliente que nunca compró (sin pedidos) no baila; un pedido sin cliente válido tampoco.
:::

## Relaciones uno a muchos

Un cliente tiene **muchos** pedidos; un pedido tiene **muchas** líneas de detalle. Al unir, la fila del “uno” se **repite** por cada fila del “muchos”. Por eso, después de un join, `COUNT(*)` cuenta filas del lado “muchos”.

## Unir varias tablas

Encadena joins. Cada uno agrega una tabla:

```sql
SELECT c.pais,
       pr.marca,
       ROUND(SUM(d.cantidad * d.precio_unitario * (1 - d.descuento)), 2) AS ventas
FROM detalle_pedidos d
JOIN pedidos   p  ON p.pedido_id    = d.pedido_id
JOIN clientes  c  ON c.cliente_id   = p.cliente_id
JOIN productos pr ON pr.producto_id = d.producto_id
WHERE p.estado <> 'cancelado'
GROUP BY c.pais, pr.marca
ORDER BY ventas DESC
LIMIT 10;
```

:::tip Cómo pensar un join de varias tablas
1. Empieza por la tabla que tiene el **nivel de detalle** que necesitas (aquí, líneas de pedido).
2. Agrega una tabla por vez, siguiendo las flechas del diagrama de [Los datos](#/datos).
3. Revisa que cada `ON` use la clave correcta. Un `ON` equivocado multiplica filas sin avisar.
:::

## USING

Si la columna se llama igual en ambas tablas, puedes escribir `USING`:

```sql
SELECT pedido_id, nombre, fecha_pedido
FROM pedidos JOIN clientes USING (cliente_id)
LIMIT 5;
```

## Ejercicios

:::ejercicio sql
Muestra `pedido_id`, `fecha_pedido`, `nombre` y `apellido` del cliente para los pedidos del **1 de enero de 2024**.
```sql solucion
SELECT p.pedido_id, p.fecha_pedido, c.nombre, c.apellido
FROM pedidos p JOIN clientes c ON c.cliente_id = p.cliente_id
WHERE p.fecha_pedido = '2024-01-01';
```
:::

:::ejercicio sql
Muestra el `nombre` de cada producto junto con el `nombre` de su categoría (alias `categoria`). Columnas: `producto`, `categoria`.
```sql solucion
SELECT p.nombre AS producto, c.nombre AS categoria
FROM productos p JOIN categorias c ON c.categoria_id = p.categoria_id;
```
```pista
Ambas tablas tienen una columna `nombre`: usa alias de tabla y renombra con `AS`.
```
:::

:::ejercicio sql
Para cada **país** de los clientes, calcula la cantidad de pedidos (`pedidos`). Columnas: `pais`, `pedidos`.
```sql solucion
SELECT c.pais, COUNT(*) AS pedidos
FROM pedidos p JOIN clientes c ON c.cliente_id = p.cliente_id
GROUP BY c.pais;
```
:::

:::ejercicio sql
Calcula las **ventas netas** por nombre de **categoría** (alias `categoria`), solo de pedidos con estado `entregado`. Ventas netas = `SUM(cantidad * precio_unitario * (1 - descuento))` redondeado a 2 (alias `ventas`).
```sql solucion
SELECT c.nombre AS categoria,
       ROUND(SUM(d.cantidad * d.precio_unitario * (1 - d.descuento)), 2) AS ventas
FROM detalle_pedidos d
JOIN pedidos p ON p.pedido_id = d.pedido_id
JOIN productos pr ON pr.producto_id = d.producto_id
JOIN categorias c ON c.categoria_id = pr.categoria_id
WHERE p.estado = 'entregado'
GROUP BY c.nombre;
```
```pista
Necesitas 4 tablas: detalle_pedidos → pedidos (estado), detalle_pedidos → productos → categorias (nombre).
```
:::

:::ejercicio sql
Muestra el `nombre` y `apellido` de cada **vendedor** (empleado) junto con la cantidad de pedidos que atendió (`pedidos`) y el `nombre` de su departamento (alias `departamento`).
```sql solucion
SELECT e.nombre, e.apellido, d.nombre AS departamento, COUNT(*) AS pedidos
FROM pedidos p
JOIN empleados e ON e.empleado_id = p.empleado_id
JOIN departamentos d ON d.departamento_id = e.departamento_id
GROUP BY e.empleado_id, e.nombre, e.apellido, d.nombre;
```
```pista
Agrupa por `e.empleado_id` (y las columnas que muestras): dos empleados pueden llamarse igual.
```
:::
