---
titulo: Funciones de ventana I: rankings
nivel: Avanzado
duracion: 35
resumen: OVER, PARTITION BY, ROW_NUMBER, RANK, DENSE_RANK y el top-N por grupo.
---

Las **funciones de ventana** (*window functions*) son, para muchos, la frontera entre un SQL intermedio y uno avanzado. Hacen cálculos **sobre un conjunto de filas relacionadas con la fila actual**, pero — a diferencia de `GROUP BY` — **no colapsan las filas**: cada fila conserva su identidad.

:::analogia La ventana del tren
Imagina que cada fila es un vagón. Una función de ventana mira **por la ventana** a los vagones de su mismo grupo (la *partición*), en cierto orden, y anota algo: “soy el 3.º más caro”, “la suma hasta aquí es 500”, “el vagón anterior vendía 20”.
:::

## La sintaxis

```sql norun
funcion() OVER (
    PARTITION BY columnas   -- opcional: define los grupos (como un GROUP BY que no colapsa)
    ORDER BY columnas       -- opcional: define el orden dentro de cada grupo
    ROWS BETWEEN ...        -- opcional: define el "marco" (lo vemos en la próxima lección)
)
```

## Agregaciones como ventana

Cualquier agregación (`SUM`, `AVG`, `COUNT`…) puede usarse con `OVER`:

```sql
SELECT nombre, categoria_id, precio,
       ROUND(AVG(precio) OVER (PARTITION BY categoria_id), 2) AS promedio_categoria,
       ROUND(precio - AVG(precio) OVER (PARTITION BY categoria_id), 2) AS diferencia,
       COUNT(*) OVER () AS total_productos
FROM productos
LIMIT 10;
```

Compara con la subconsulta correlacionada de la lección anterior: mismo resultado, mucho más claro (y normalmente más rápido).

## Rankings: ROW_NUMBER, RANK y DENSE_RANK

| Función | Con empates (valores 100, 90, 90, 80) |
|---|---|
| `ROW_NUMBER()` | 1, 2, 3, 4 — siempre únicos (el empate se rompe arbitrariamente) |
| `RANK()` | 1, 2, 2, **4** — empates comparten puesto y se salta |
| `DENSE_RANK()` | 1, 2, 2, **3** — empates comparten puesto sin saltos |

```sql
SELECT nombre, marca, precio,
       ROW_NUMBER() OVER (PARTITION BY marca ORDER BY precio DESC) AS rn,
       RANK()       OVER (PARTITION BY marca ORDER BY precio DESC) AS rnk,
       DENSE_RANK() OVER (PARTITION BY marca ORDER BY precio DESC) AS drnk
FROM productos
WHERE marca IN ('Apple', 'Sony')
ORDER BY marca, precio DESC;
```

## El patrón estrella: top-N por grupo

“Los 3 productos más caros **de cada marca**”, “el último pedido **de cada cliente**”… No puedes usar una función de ventana en el `WHERE` (se calcula después), así que se envuelve en una CTE:

```sql
WITH ranking AS (
    SELECT nombre, marca, precio,
           ROW_NUMBER() OVER (PARTITION BY marca ORDER BY precio DESC) AS rn
    FROM productos
)
SELECT marca, nombre, precio
FROM ranking
WHERE rn <= 3
ORDER BY marca, rn;
```

:::nota QUALIFY
Databricks/Spark SQL, Snowflake, BigQuery y DuckDB permiten filtrar directamente con `QUALIFY`: `... QUALIFY ROW_NUMBER() OVER (...) <= 3`. SQLite y PostgreSQL no, así que usamos la CTE.
:::

:::entrevista “Encuentra el segundo salario más alto”
Clásica. Con ventanas: `DENSE_RANK() OVER (ORDER BY salario DESC) = 2`. ¿Por qué `DENSE_RANK` y no `ROW_NUMBER`? Porque si dos personas empatan en el primer puesto, el “segundo salario” es el siguiente valor distinto.
:::

## Ejercicios

:::ejercicio sql
Para cada empleado muestra `nombre`, `departamento_id`, `salario` y el **salario promedio de su departamento** (alias `promedio_depto`, redondeado a 0) usando una función de ventana.
```sql solucion
SELECT nombre, departamento_id, salario,
       ROUND(AVG(salario) OVER (PARTITION BY departamento_id), 0) AS promedio_depto
FROM empleados;
```
:::

:::ejercicio sql ordenado
Muestra los **2 productos más caros de cada categoría**: `categoria_id`, `nombre`, `precio`. Si hay empate de precio, desempata por `nombre` (alfabético). Ordena por `categoria_id` y luego por precio descendente.
```sql solucion
WITH r AS (
  SELECT categoria_id, nombre, precio,
         ROW_NUMBER() OVER (PARTITION BY categoria_id ORDER BY precio DESC, nombre) AS rn
  FROM productos
)
SELECT categoria_id, nombre, precio FROM r WHERE rn <= 2 ORDER BY categoria_id, precio DESC, nombre;
```
:::

:::ejercicio sql
Muestra el **último pedido** de cada cliente: `cliente_id`, `pedido_id`, `fecha_pedido`. Si un cliente tiene dos pedidos el mismo día, quédate con el de mayor `pedido_id`.
```sql solucion
WITH r AS (
  SELECT cliente_id, pedido_id, fecha_pedido,
         ROW_NUMBER() OVER (PARTITION BY cliente_id ORDER BY fecha_pedido DESC, pedido_id DESC) AS rn
  FROM pedidos
)
SELECT cliente_id, pedido_id, fecha_pedido FROM r WHERE rn = 1;
```
:::

:::ejercicio sql
Encuentra a los empleados con el **segundo salario más alto de cada departamento** (puede haber empates). Columnas: `departamento_id`, `nombre`, `salario`.
```sql solucion
WITH r AS (
  SELECT departamento_id, nombre, salario,
         DENSE_RANK() OVER (PARTITION BY departamento_id ORDER BY salario DESC) AS dr
  FROM empleados
)
SELECT departamento_id, nombre, salario FROM r WHERE dr = 2;
```
:::

:::ejercicio sql
Para cada país, rankea las **ciudades** por cantidad de clientes (de mayor a menor) con `RANK()`. Columnas: `pais`, `ciudad`, `clientes`, `puesto`.
```sql solucion
SELECT pais, ciudad, COUNT(*) AS clientes,
       RANK() OVER (PARTITION BY pais ORDER BY COUNT(*) DESC) AS puesto
FROM clientes
GROUP BY pais, ciudad;
```
```pista
¡Puedes usar una agregación dentro de la ventana! Primero se agrupa y después se aplica la ventana: `RANK() OVER (PARTITION BY pais ORDER BY COUNT(*) DESC)`.
```
:::

:::ejercicio sql
¿Qué porcentaje de la facturación de su **categoría** representa cada producto? Usa las ventas netas de todas las líneas (sin filtrar estados). Columnas: `categoria_id`, `producto_id`, `ventas` (redondeado a 2) y `pct_categoria` (porcentaje redondeado a 2).
```sql solucion
WITH v AS (
  SELECT pr.categoria_id, pr.producto_id, SUM(d.cantidad * d.precio_unitario * (1 - d.descuento)) AS ventas
  FROM detalle_pedidos d JOIN productos pr ON pr.producto_id = d.producto_id
  GROUP BY pr.categoria_id, pr.producto_id
)
SELECT categoria_id, producto_id, ROUND(ventas, 2) AS ventas,
       ROUND(100.0 * ventas / SUM(ventas) OVER (PARTITION BY categoria_id), 2) AS pct_categoria
FROM v;
```
:::
