---
titulo: CTE recursivas: jerarquías y series
nivel: Avanzado
duracion: 30
resumen: Recorrer árboles (organigramas, categorías) y generar series de fechas.
---

Una **CTE recursiva** se llama a sí misma. Sirve para datos con forma de **árbol** o **grafo** (organigramas, categorías y subcategorías, rutas) y para **generar** filas (series de números o de fechas).

## Estructura

```sql norun
WITH RECURSIVE nombre AS (
    -- 1. Caso base (ancla): las filas iniciales
    SELECT ...
    UNION ALL
    -- 2. Paso recursivo: usa "nombre" para producir las siguientes filas
    SELECT ... FROM tabla JOIN nombre ON ...
)
SELECT * FROM nombre;
```

El motor ejecuta el ancla, luego aplica el paso recursivo sobre las filas nuevas, una y otra vez, **hasta que el paso no produce filas**.

## Generar una serie

```sql
WITH RECURSIVE numeros(n) AS (
    SELECT 1
    UNION ALL
    SELECT n + 1 FROM numeros WHERE n < 10
)
SELECT n, n * n AS cuadrado FROM numeros;
```

:::cuidado La condición de parada
Sin `WHERE n < 10`, la recursión sería infinita. Siempre asegúrate de que el paso recursivo, en algún momento, no devuelva filas.
:::

## Calendario de fechas

Muy útil para rellenar días sin ventas (con LEFT JOIN):

```sql
WITH RECURSIVE dias(dia) AS (
    SELECT '2024-12-20'
    UNION ALL
    SELECT date(dia, '+1 day') FROM dias WHERE dia < '2024-12-31'
)
SELECT d.dia, COUNT(p.pedido_id) AS pedidos
FROM dias d LEFT JOIN pedidos p ON p.fecha_pedido = d.dia
GROUP BY d.dia;
```

## Recorrer el organigrama

```sql
WITH RECURSIVE org AS (
    SELECT empleado_id, nombre, cargo, jefe_id, 0 AS nivel, nombre AS ruta
    FROM empleados WHERE jefe_id IS NULL                 -- ancla: el CEO
    UNION ALL
    SELECT e.empleado_id, e.nombre, e.cargo, e.jefe_id, o.nivel + 1, o.ruta || ' > ' || e.nombre
    FROM empleados e JOIN org o ON e.jefe_id = o.empleado_id
)
SELECT nivel, nombre, cargo, ruta FROM org ORDER BY nivel, nombre LIMIT 25;
```

## Ejercicios

:::ejercicio sql
Genera los números del **1 al 20** y muestra solo los **pares**. Una columna: `n`.
```sql solucion
WITH RECURSIVE s(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM s WHERE n < 20)
SELECT n FROM s WHERE n % 2 = 0;
```
:::

:::ejercicio sql
Muestra la jerarquía completa de categorías con su **ruta**: `categoria_id`, `nombre`, `nivel` (0 para las raíces) y `ruta` con el formato `Tecnología > Computadoras > Laptops`.
```sql solucion
WITH RECURSIVE c AS (
  SELECT categoria_id, nombre, 0 AS nivel, nombre AS ruta FROM categorias WHERE categoria_padre_id IS NULL
  UNION ALL
  SELECT k.categoria_id, k.nombre, c.nivel + 1, c.ruta || ' > ' || k.nombre
  FROM categorias k JOIN c ON k.categoria_padre_id = c.categoria_id
)
SELECT categoria_id, nombre, nivel, ruta FROM c;
```
:::

:::ejercicio sql
¿Cuántas personas tiene **a su cargo en total** (directa o indirectamente) el empleado `2` (un director)? Una columna: `equipo_total`. No cuentes al propio empleado 2.
```sql solucion
WITH RECURSIVE sub AS (
  SELECT empleado_id FROM empleados WHERE jefe_id = 2
  UNION ALL
  SELECT e.empleado_id FROM empleados e JOIN sub s ON e.jefe_id = s.empleado_id
)
SELECT COUNT(*) AS equipo_total FROM sub;
```
```pista
Ancla: los que reportan directamente al 2. Paso: los que reportan a alguien que ya está en la CTE.
```
:::

:::ejercicio sql ordenado
Genera todos los días de **enero de 2024** y muestra cuántos pedidos hubo cada día, **incluyendo los días con 0**. Columnas: `dia`, `pedidos`. Ordena por día.
```sql solucion
WITH RECURSIVE d(dia) AS (
  SELECT '2024-01-01' UNION ALL SELECT date(dia, '+1 day') FROM d WHERE dia < '2024-01-31'
)
SELECT d.dia, COUNT(p.pedido_id) AS pedidos
FROM d LEFT JOIN pedidos p ON p.fecha_pedido = d.dia
GROUP BY d.dia
ORDER BY d.dia;
```
:::
