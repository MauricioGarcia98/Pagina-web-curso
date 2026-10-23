---
titulo: GROUP BY y HAVING
nivel: Intermedio
duracion: 30
resumen: Agrupar filas para calcular totales por categoría, y filtrar grupos.
---

`GROUP BY` divide las filas en **grupos** y calcula la agregación **para cada grupo**. Es probablemente la herramienta más usada en análisis de datos.

```sql
SELECT pais, COUNT(*) AS clientes
FROM clientes
GROUP BY pais
ORDER BY clientes DESC;
```

:::analogia Separar caramelos por color
Tienes una bolsa de caramelos. `GROUP BY color` los separa en montoncitos por color; `COUNT(*)` cuenta cada montoncito. Al final tienes **una fila por color**.
:::

## La regla de oro

Toda columna del `SELECT` debe estar **en el GROUP BY** o **dentro de una función de agregación**.

```sql
-- ✅ Bien
SELECT pais, segmento, COUNT(*) AS clientes
FROM clientes
GROUP BY pais, segmento
ORDER BY pais, segmento;
```

## Agrupar por expresiones

```sql
SELECT strftime('%Y-%m', fecha_pedido) AS mes, COUNT(*) AS pedidos
FROM pedidos
GROUP BY mes        -- SQLite, PostgreSQL, MySQL y Spark aceptan el alias; SQL Server no
ORDER BY mes;
```

## HAVING: filtrar grupos

`WHERE` filtra **filas antes** de agrupar. `HAVING` filtra **grupos después** de agrupar (y puede usar agregaciones).

```sql
-- Ciudades con más de 100 clientes
SELECT ciudad, COUNT(*) AS clientes
FROM clientes
GROUP BY ciudad
HAVING COUNT(*) > 100
ORDER BY clientes DESC;
```

## El orden de ejecución lógico

SQL se **escribe** en un orden pero se **ejecuta** en otro. Entender esto explica muchos errores:

| Orden | Cláusula | Qué hace |
|---|---|---|
| 1 | `FROM` / `JOIN` | Junta las tablas |
| 2 | `WHERE` | Filtra filas |
| 3 | `GROUP BY` | Forma grupos |
| 4 | `HAVING` | Filtra grupos |
| 5 | `SELECT` | Calcula columnas y alias |
| 6 | `DISTINCT` | Quita duplicados |
| 7 | `ORDER BY` | Ordena |
| 8 | `LIMIT` | Recorta |

Por eso en `WHERE` no puedes usar `COUNT(*)` (todavía no hay grupos) ni, en el estándar, un alias del `SELECT` (todavía no existe).

## Ejercicios

:::ejercicio sql
Cuenta cuántos pedidos hay de cada `estado`. Columnas: `estado`, `pedidos`.
```sql solucion
SELECT estado, COUNT(*) AS pedidos FROM pedidos GROUP BY estado;
```
:::

:::ejercicio sql
Para cada `marca`, muestra la cantidad de productos (`productos`) y el precio promedio redondeado a 2 decimales (`precio_promedio`).
```sql solucion
SELECT marca, COUNT(*) AS productos, ROUND(AVG(precio), 2) AS precio_promedio FROM productos GROUP BY marca;
```
:::

:::ejercicio sql ordenado
Cuenta los pedidos por **año** (alias `anio`, como texto de 4 dígitos) y `canal`. Ordena por año y luego por canal. Columnas: `anio`, `canal`, `pedidos`.
```sql solucion
SELECT strftime('%Y', fecha_pedido) AS anio, canal, COUNT(*) AS pedidos
FROM pedidos
GROUP BY anio, canal
ORDER BY anio, canal;
```
:::

:::ejercicio sql
Muestra los clientes (`cliente_id`) que hicieron **10 o más pedidos**, con la cantidad (`pedidos`).
```sql solucion
SELECT cliente_id, COUNT(*) AS pedidos FROM pedidos GROUP BY cliente_id HAVING COUNT(*) >= 10;
```
```pista
Agrupa por `cliente_id` y filtra los grupos con `HAVING COUNT(*) >= 10`.
```
:::

:::ejercicio sql
Para cada `pedido_id` de `detalle_pedidos`, calcula el importe neto total (`SUM(cantidad * precio_unitario * (1 - descuento))`, redondeado a 2) con el alias `total`. Muestra solo los pedidos cuyo total supera **3000**.
```sql solucion
SELECT pedido_id, ROUND(SUM(cantidad * precio_unitario * (1 - descuento)), 2) AS total
FROM detalle_pedidos
GROUP BY pedido_id
HAVING SUM(cantidad * precio_unitario * (1 - descuento)) > 3000;
```
:::

:::ejercicio sql
Por `departamento_id`, muestra cuántos empleados **activos** (sin `fecha_salida`) hay (`empleados`) y su salario promedio redondeado a 0 decimales (`salario_promedio`). Solo departamentos con **al menos 5** empleados activos.
```sql solucion
SELECT departamento_id, COUNT(*) AS empleados, ROUND(AVG(salario), 0) AS salario_promedio
FROM empleados
WHERE fecha_salida IS NULL
GROUP BY departamento_id
HAVING COUNT(*) >= 5;
```
```pista
Los empleados activos se filtran con `WHERE` (antes de agrupar); la condición de 5 o más va en `HAVING`.
```
:::

:::ejercicio quiz
Quieres las categorías con un precio promedio mayor a 300. ¿Dónde va la condición `AVG(precio) > 300`?

- [ ] En el WHERE
- [x] En el HAVING
- [ ] En el ORDER BY
- [ ] En el FROM
:::
