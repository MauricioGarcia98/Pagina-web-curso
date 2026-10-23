---
titulo: CASE WHEN: lógica condicional
nivel: Intermedio
duracion: 20
resumen: Clasificar valores, crear categorías y hacer "conteos condicionales".
---

`CASE` es el **si… entonces… si no…** de SQL. Evalúa condiciones en orden y devuelve el valor de la primera que se cumpla.

```sql
SELECT nombre, precio,
       CASE
         WHEN precio < 50   THEN 'económico'
         WHEN precio < 300  THEN 'medio'
         WHEN precio < 1000 THEN 'premium'
         ELSE 'lujo'
       END AS gama
FROM productos
LIMIT 10;
```

- Las condiciones se revisan **de arriba hacia abajo**; gana la primera verdadera.
- Si ninguna se cumple y no hay `ELSE`, el resultado es `NULL`.

Hay una forma corta cuando comparas una sola columna por igualdad:

```sql
SELECT pedido_id,
       CASE canal WHEN 'web' THEN 'Online' WHEN 'app' THEN 'Online' ELSE 'Presencial' END AS tipo_canal
FROM pedidos LIMIT 5;
```

## CASE + agregación = superpoder

Poner un `CASE` **dentro** de `SUM` o `COUNT` permite contar o sumar solo lo que cumple una condición, todo en una consulta. Se llama **agregación condicional** y es la base de los “pivots”:

```sql
SELECT strftime('%Y', fecha_pedido) AS anio,
       COUNT(*) AS total,
       SUM(CASE WHEN estado = 'cancelado' THEN 1 ELSE 0 END) AS cancelados,
       ROUND(100.0 * SUM(CASE WHEN estado = 'cancelado' THEN 1 ELSE 0 END) / COUNT(*), 2) AS pct_cancelados
FROM pedidos
GROUP BY anio
ORDER BY anio;
```

:::nota FILTER
PostgreSQL, SQLite (≥3.30) y Spark aceptan una sintaxis más limpia: `COUNT(*) FILTER (WHERE estado = 'cancelado')`.
:::

## Ejercicios

:::ejercicio sql
Muestra `cliente_id`, `nombre` y una columna `grupo_edad` según `fecha_nacimiento`: `'joven'` si nació en 1995 o después, `'adulto'` si nació entre 1970 y 1994, y `'senior'` si nació antes de 1970.
```sql solucion
SELECT cliente_id, nombre,
       CASE
         WHEN fecha_nacimiento >= '1995-01-01' THEN 'joven'
         WHEN fecha_nacimiento >= '1970-01-01' THEN 'adulto'
         ELSE 'senior'
       END AS grupo_edad
FROM clientes;
```
```pista
Como las fechas son texto ISO, puedes compararlas directamente: `fecha_nacimiento >= '1995-01-01'`.
```
:::

:::ejercicio sql
Cuenta cuántos productos hay en cada gama de precio: `'económico'` (< 50), `'medio'` (< 300), `'premium'` (< 1000) y `'lujo'` (el resto). Columnas: `gama`, `productos`.
```sql solucion
SELECT CASE
         WHEN precio < 50 THEN 'económico'
         WHEN precio < 300 THEN 'medio'
         WHEN precio < 1000 THEN 'premium'
         ELSE 'lujo'
       END AS gama,
       COUNT(*) AS productos
FROM productos
GROUP BY gama;
```
:::

:::ejercicio sql
Para cada `canal`, muestra el total de pedidos (`total`), cuántos fueron `entregado` (`entregados`) y cuántos `devuelto` (`devueltos`), usando agregación condicional.
```sql solucion
SELECT canal,
       COUNT(*) AS total,
       SUM(CASE WHEN estado = 'entregado' THEN 1 ELSE 0 END) AS entregados,
       SUM(CASE WHEN estado = 'devuelto' THEN 1 ELSE 0 END) AS devueltos
FROM pedidos
GROUP BY canal;
```
:::

:::ejercicio sql
Haz un **pivot**: una fila por `pais` de clientes con tres columnas que cuenten cuántos clientes hay de cada segmento: `consumidor`, `pyme`, `corporativo`.
```sql solucion
SELECT pais,
       SUM(CASE WHEN segmento = 'Consumidor' THEN 1 ELSE 0 END) AS consumidor,
       SUM(CASE WHEN segmento = 'Pyme' THEN 1 ELSE 0 END) AS pyme,
       SUM(CASE WHEN segmento = 'Corporativo' THEN 1 ELSE 0 END) AS corporativo
FROM clientes
GROUP BY pais;
```
:::
