---
titulo: NULL: el valor que no es un valor
nivel: Básico
duracion: 20
resumen: IS NULL, COALESCE, NULLIF y la lógica de tres valores.
---

`NULL` significa **desconocido o inexistente**. Un cliente sin teléfono no tiene teléfono `0` ni `''`: tiene `NULL`.

## La trampa número uno de SQL

```sql
-- ❌ Esto NO devuelve nada, aunque haya clientes sin email
SELECT * FROM clientes WHERE email = NULL;
```

Cualquier comparación con `NULL` da como resultado **`NULL`** (ni verdadero ni falso), y `WHERE` solo deja pasar lo verdadero. Para preguntar por nulos se usa `IS NULL` / `IS NOT NULL`:

```sql
SELECT cliente_id, nombre, email FROM clientes WHERE email IS NULL;
```

## Lógica de tres valores

En SQL una condición puede ser **TRUE**, **FALSE** o **UNKNOWN** (cuando hay NULL):

| Expresión | Resultado |
|---|---|
| `NULL = NULL` | UNKNOWN |
| `NULL <> 5` | UNKNOWN |
| `NULL + 10` | NULL |
| `TRUE AND UNKNOWN` | UNKNOWN |
| `FALSE AND UNKNOWN` | FALSE |
| `TRUE OR UNKNOWN` | TRUE |

:::cuidado NOT IN con NULL
Si una lista de `NOT IN` contiene un `NULL`, la condición **nunca** es verdadera: `5 NOT IN (1, 2, NULL)` es UNKNOWN. Es un error clásico con subconsultas. Lo veremos de nuevo con `NOT EXISTS`.
:::

## COALESCE: reemplazar nulos

`COALESCE(a, b, c, ...)` devuelve **el primer valor que no sea NULL**:

```sql
SELECT nombre,
       COALESCE(telefono, 'sin teléfono') AS telefono,
       COALESCE(email, telefono, 'sin contacto') AS contacto
FROM clientes
LIMIT 10;
```

Variantes por motor: `IFNULL(a, b)` (SQLite, MySQL), `ISNULL(a, b)` (SQL Server), `NVL(a, b)` (Oracle, Spark).

## NULLIF: crear nulos a propósito

`NULLIF(a, b)` devuelve `NULL` si `a = b`, y si no, devuelve `a`. Su uso estrella: **evitar dividir por cero**.

```sql
SELECT nombre, stock, precio / NULLIF(stock, 0) AS precio_por_unidad_en_stock
FROM productos
LIMIT 10;
```

## Ejercicios

:::ejercicio sql
Muestra `cliente_id`, `nombre` y `apellido` de los clientes que **no tienen teléfono**.
```sql solucion
SELECT cliente_id, nombre, apellido FROM clientes WHERE telefono IS NULL;
```
:::

:::ejercicio sql
Muestra `pedido_id`, `canal` de los pedidos que **sí** tienen un empleado asignado (`empleado_id` no nulo) y que **no** son del canal `tienda`.
```sql solucion
SELECT pedido_id, canal FROM pedidos WHERE empleado_id IS NOT NULL AND canal <> 'tienda';
```
```pista
Los pedidos por teléfono también tienen vendedor.
```
:::

:::ejercicio sql
Muestra `nombre`, `apellido` y una columna `email_contacto` que tenga el email del cliente o, si no tiene, el texto `'sin email'`. Solo para los clientes de **Uruguay**.
```sql solucion
SELECT nombre, apellido, COALESCE(email, 'sin email') AS email_contacto
FROM clientes WHERE pais = 'Uruguay';
```
:::

:::ejercicio sql
Muestra `nombre`, `apellido` y `fecha_salida` de los empleados que **ya no trabajan** en la empresa (tienen fecha de salida), ordenados por `fecha_salida`.
```sql solucion
SELECT nombre, apellido, fecha_salida FROM empleados WHERE fecha_salida IS NOT NULL ORDER BY fecha_salida;
```
:::

:::ejercicio quiz
¿Qué devuelve `SELECT COUNT(*) FROM clientes WHERE telefono <> '123'` respecto a los clientes con teléfono NULL?

- [ ] Los cuenta, porque NULL es distinto de '123'
- [x] No los cuenta, porque `NULL <> '123'` es UNKNOWN
- [ ] Da un error
- [ ] Los cuenta dos veces
:::
