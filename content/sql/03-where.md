---
titulo: WHERE: filtrar filas
nivel: Básico
duracion: 25
resumen: Comparaciones, AND/OR/NOT, IN, BETWEEN y LIKE.
---

`WHERE` se queda solo con las filas que cumplen una condición. Va **después** de `FROM`.

```sql
SELECT nombre, precio
FROM productos
WHERE precio > 1000;
```

## Operadores de comparación

| Operador | Significado | Ejemplo |
|---|---|---|
| `=` | igual | `pais = 'Chile'` |
| `<>` o `!=` | distinto | `estado <> 'cancelado'` |
| `>`, `>=` | mayor, mayor o igual | `precio >= 100` |
| `<`, `<=` | menor, menor o igual | `stock < 10` |

:::cuidado Comillas
Los textos van entre comillas **simples**: `pais = 'Chile'`. Y las comparaciones de texto suelen distinguir mayúsculas: `'chile'` no es igual a `'Chile'` en la mayoría de los motores.
:::

## Combinar condiciones: AND, OR, NOT

```sql
-- Productos de Apple caros
SELECT nombre, marca, precio
FROM productos
WHERE marca = 'Apple' AND precio > 1000;

-- Clientes de Chile o de Perú
SELECT nombre, pais
FROM clientes
WHERE pais = 'Chile' OR pais = 'Perú';
```

`AND` tiene más prioridad que `OR` (como la multiplicación sobre la suma). **Usa paréntesis** para no equivocarte:

```sql
-- ✅ Pedidos web o app que fueron cancelados
SELECT * FROM pedidos
WHERE (canal = 'web' OR canal = 'app') AND estado = 'cancelado';
```

Sin paréntesis, `canal = 'web' OR canal = 'app' AND estado = 'cancelado'` traería **todos** los pedidos web (cancelados o no) más los de app cancelados.

## IN: una lista de valores

```sql
SELECT nombre, pais FROM clientes
WHERE pais IN ('Chile', 'Perú', 'Uruguay');
```

Equivale a varios `OR`. `NOT IN` hace lo contrario.

## BETWEEN: un rango (incluye los extremos)

```sql
SELECT nombre, precio FROM productos
WHERE precio BETWEEN 100 AND 200;   -- 100 <= precio <= 200
```

## LIKE: buscar patrones de texto

- `%` = cualquier cantidad de caracteres (incluso ninguno).
- `_` = exactamente un carácter.

```sql
SELECT nombre FROM productos WHERE nombre LIKE 'Laptop%';   -- empieza con Laptop
SELECT nombre FROM productos WHERE nombre LIKE '%Pro%';     -- contiene Pro
SELECT email FROM clientes  WHERE email LIKE '%@gmail.com'; -- termina en @gmail.com
```

:::nota Mayúsculas en LIKE
En SQLite `LIKE` no distingue mayúsculas para letras simples (A-Z). En PostgreSQL sí; allí existe `ILIKE` para ignorarlas.
:::

## Ejercicios

:::ejercicio sql
Muestra `nombre`, `apellido` y `ciudad` de los clientes de **Argentina**.
```sql solucion
SELECT nombre, apellido, ciudad FROM clientes WHERE pais = 'Argentina';
```
:::

:::ejercicio sql
Muestra todas las columnas de los productos de la marca `Samsung` con precio **menor a 500**.
```sql solucion
SELECT * FROM productos WHERE marca = 'Samsung' AND precio < 500;
```
:::

:::ejercicio sql
Muestra `pedido_id`, `fecha_pedido` y `estado` de los pedidos cuyo estado sea `cancelado` **o** `devuelto`. Usa `IN`.
```sql solucion
SELECT pedido_id, fecha_pedido, estado FROM pedidos WHERE estado IN ('cancelado', 'devuelto');
```
:::

:::ejercicio sql
Muestra el `nombre` y `precio` de los productos cuyo nombre **contiene** la palabra `Ultra` y cuesten entre 100 y 600 (incluidos).
```sql solucion
SELECT nombre, precio FROM productos
WHERE nombre LIKE '%Ultra%' AND precio BETWEEN 100 AND 600;
```
```pista
Combina `LIKE '%Ultra%'` con `BETWEEN 100 AND 600` usando `AND`.
```
:::

:::ejercicio sql
Muestra `pedido_id`, `canal` y `metodo_pago` de los pedidos hechos por `web` **o** `app` pagados en `efectivo`. ¡Cuidado con los paréntesis!
```sql solucion
SELECT pedido_id, canal, metodo_pago FROM pedidos
WHERE (canal = 'web' OR canal = 'app') AND metodo_pago = 'efectivo';
```
:::

:::ejercicio sql
Muestra `nombre`, `cargo` y `salario` de los empleados que **no** son del departamento 2 (Ventas) y ganan **más de 4000**.
```sql solucion
SELECT nombre, cargo, salario FROM empleados WHERE departamento_id <> 2 AND salario > 4000;
```
:::
