---
titulo: SELECT: elegir columnas, alias y cálculos
nivel: Básico
duracion: 20
resumen: Seleccionar columnas específicas, renombrarlas con AS y calcular nuevas columnas.
---

## Elegir columnas

Casi nunca necesitas todas las columnas. Escríbelas separadas por comas, en el orden en que las quieres ver:

```sql
SELECT nombre, apellido, pais
FROM clientes
LIMIT 5;
```

:::tip Buena práctica
En código profesional evita `SELECT *`: pide solo las columnas que usas. Es más rápido (sobre todo en Parquet/Spark) y el código no se rompe si alguien agrega columnas a la tabla.
:::

## Calcular columnas nuevas

Puedes hacer operaciones con los operadores `+`, `-`, `*`, `/` y `%` (resto de la división):

```sql
SELECT nombre, precio, costo, precio - costo
FROM productos
LIMIT 5;
```

## Alias con AS

La columna calculada tiene un nombre feo (`precio - costo`). Con `AS` le das un nombre (un **alias**):

```sql
SELECT nombre,
       precio,
       costo,
       precio - costo AS ganancia,
       ROUND((precio - costo) / precio * 100, 1) AS margen_pct
FROM productos
LIMIT 5;
```

- `ROUND(valor, decimales)` redondea.
- Si el alias tiene espacios, va entre comillas dobles: `AS "margen %"`. Mejor evitarlo y usar `snake_case` (palabras unidas con guion bajo).

## Texto literal y concatenación

En SQL el **texto va entre comillas simples** `'así'`. Las comillas dobles se usan para nombres de columnas. Para unir textos, SQLite (y PostgreSQL, Oracle) usa `||`:

```sql
SELECT nombre || ' ' || apellido AS nombre_completo,
       'Cliente de ' || pais AS descripcion
FROM clientes
LIMIT 5;
```

:::nota Otros motores
En SQL Server se usa `+` para concatenar y en MySQL/Spark la función `CONCAT(a, b)`. En este curso marcaremos las diferencias importantes entre motores (“dialectos”).
:::

## Ejercicios

:::ejercicio sql
Muestra el `nombre`, la `marca` y el `precio` de **todos** los productos.
```sql solucion
SELECT nombre, marca, precio FROM productos;
```
:::

:::ejercicio sql
Para cada producto, muestra `nombre`, `precio` y una columna llamada `precio_con_iva` con el precio multiplicado por 1.21, **redondeado a 2 decimales**.
```sql solucion
SELECT nombre, precio, ROUND(precio * 1.21, 2) AS precio_con_iva
FROM productos;
```
```pista
`ROUND(precio * 1.21, 2) AS precio_con_iva`
```
:::

:::ejercicio sql
Muestra el `email` de cada empleado y una columna `nombre_completo` con el formato `apellido, nombre` (por ejemplo `García, Ana`).
```sql solucion
SELECT email, apellido || ', ' || nombre AS nombre_completo
FROM empleados;
```
```pista
Concatena con `||` y no olvides el texto `', '` entre comillas simples.
```
:::

:::ejercicio sql
Muestra `nombre`, `stock`, `costo` y el **valor del inventario** de cada producto (`stock * costo`) con el alias `valor_inventario`.
```sql solucion
SELECT nombre, stock, costo, stock * costo AS valor_inventario
FROM productos;
```
:::
