---
titulo: ORDER BY, LIMIT y DISTINCT
nivel: Básico
duracion: 20
resumen: Ordenar resultados, paginar y eliminar duplicados.
---

## Ordenar con ORDER BY

Las filas de una tabla **no tienen un orden garantizado**. Si el orden importa, pídelo con `ORDER BY`:

```sql
SELECT nombre, precio
FROM productos
ORDER BY precio DESC   -- DESC = de mayor a menor; ASC (por defecto) = de menor a mayor
LIMIT 5;
```

Puedes ordenar por varias columnas. La segunda desempata a la primera:

```sql
SELECT pais, ciudad, nombre
FROM clientes
ORDER BY pais ASC, ciudad ASC, nombre ASC
LIMIT 20;
```

También puedes ordenar por un alias o por una expresión:

```sql
SELECT nombre, precio - costo AS ganancia
FROM productos
ORDER BY ganancia DESC
LIMIT 5;
```

:::nota ¿Dónde quedan los NULL?
En SQLite y MySQL los `NULL` van **primero** en orden ascendente; en PostgreSQL y Oracle van **al final**. Puedes controlarlo con `NULLS FIRST` / `NULLS LAST` (SQLite ≥ 3.30, PostgreSQL, Spark).
:::

## LIMIT y OFFSET: paginar

```sql
-- "Página 3" de 10 resultados: salta 20, toma 10
SELECT producto_id, nombre FROM productos
ORDER BY producto_id
LIMIT 10 OFFSET 20;
```

:::nota Dialectos
- SQL Server: `SELECT TOP 10 ...` o `OFFSET 20 ROWS FETCH NEXT 10 ROWS ONLY`.
- Oracle / estándar: `FETCH FIRST 10 ROWS ONLY`.
- PostgreSQL, MySQL, SQLite, Spark: `LIMIT 10`.
:::

## DISTINCT: valores únicos

```sql
SELECT DISTINCT pais FROM clientes ORDER BY pais;
```

`DISTINCT` aplica a **la combinación** de todas las columnas seleccionadas:

```sql
SELECT DISTINCT pais, segmento FROM clientes ORDER BY pais, segmento;
```

## El orden en que se escriben las cláusulas

```sql norun
SELECT    columnas
FROM      tabla
WHERE     condición
ORDER BY  columnas
LIMIT     n;
```

¡El orden importa! `WHERE` siempre va antes de `ORDER BY`, y `LIMIT` al final.

## Ejercicios

:::ejercicio sql ordenado
Muestra `nombre` y `precio` de los **10 productos más baratos**, del más barato al más caro. Si hay empate de precio, ordena por `nombre`.
```sql solucion
SELECT nombre, precio FROM productos ORDER BY precio ASC, nombre ASC LIMIT 10;
```
:::

:::ejercicio sql ordenado
Muestra `nombre`, `apellido`, `cargo` y `salario` de los **5 empleados que más ganan**.
```sql solucion
SELECT nombre, apellido, cargo, salario FROM empleados ORDER BY salario DESC LIMIT 5;
```
:::

:::ejercicio sql ordenado
¿Qué **marcas** distintas hay en la tabla `productos`? Muéstralas ordenadas alfabéticamente (una columna llamada `marca`).
```sql solucion
SELECT DISTINCT marca FROM productos ORDER BY marca;
```
:::

:::ejercicio sql ordenado
Muestra las combinaciones únicas de `canal` y `metodo_pago` que existen en `pedidos`, ordenadas por `canal` y luego por `metodo_pago`.
```sql solucion
SELECT DISTINCT canal, metodo_pago FROM pedidos ORDER BY canal, metodo_pago;
```
:::

:::ejercicio sql ordenado
Muestra `producto_id` y `nombre` de los productos de la **segunda página** de 15 resultados, ordenados por `producto_id` (es decir, los productos que ocupan las posiciones 16 a 30).
```sql solucion
SELECT producto_id, nombre FROM productos ORDER BY producto_id LIMIT 15 OFFSET 15;
```
:::
