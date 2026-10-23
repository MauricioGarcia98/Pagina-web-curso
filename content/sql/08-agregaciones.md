---
titulo: Funciones de agregación
nivel: Intermedio
duracion: 20
resumen: COUNT, SUM, AVG, MIN, MAX y COUNT(DISTINCT): resumir muchas filas en un número.
---

Hasta ahora cada fila del resultado correspondía a una fila de la tabla. Las **funciones de agregación** hacen lo contrario: **resumen muchas filas en un solo valor**.

| Función | Qué calcula |
|---|---|
| `COUNT(*)` | Cantidad de filas |
| `COUNT(columna)` | Cantidad de valores **no nulos** de la columna |
| `COUNT(DISTINCT columna)` | Cantidad de valores distintos (no nulos) |
| `SUM(columna)` | Suma |
| `AVG(columna)` | Promedio (ignora los NULL) |
| `MIN(columna)` / `MAX(columna)` | Mínimo / máximo (también con textos y fechas) |

```sql
SELECT COUNT(*)              AS total_clientes,
       COUNT(email)          AS con_email,
       COUNT(DISTINCT pais)  AS paises,
       MIN(fecha_registro)   AS primer_registro,
       MAX(fecha_registro)   AS ultimo_registro
FROM clientes;
```

:::cuidado COUNT(*) vs COUNT(columna)
`COUNT(*)` cuenta todas las filas. `COUNT(email)` ignora las que tienen email `NULL`. Por eso `COUNT(*) - COUNT(email)` = clientes sin email.
:::

:::cuidado AVG ignora los NULL
`AVG(x)` es `SUM(x) / COUNT(x)`, **no** `SUM(x) / COUNT(*)`. Si quieres tratar los NULL como cero: `AVG(COALESCE(x, 0))`.
:::

## Agregar con filtros

`WHERE` se aplica **antes** de agregar:

```sql
-- Facturación total (sin descuentos) de 2024
SELECT ROUND(SUM(d.cantidad * d.precio_unitario), 2) AS facturacion_bruta
FROM detalle_pedidos d
WHERE d.pedido_id IN (SELECT pedido_id FROM pedidos WHERE fecha_pedido >= '2024-01-01');
```

:::nota Una regla importante
Si usas funciones de agregación sin `GROUP BY`, el resultado tiene **una sola fila**. No puedes mezclar columnas “normales” con agregaciones (`SELECT nombre, COUNT(*) FROM clientes` es un error en casi todos los motores; SQLite lo permite pero devuelve un nombre al azar). La solución es `GROUP BY`, en la próxima lección.
:::

## Ejercicios

:::ejercicio sql
¿Cuántos productos hay y cuál es su precio **promedio** (redondeado a 2 decimales)? Columnas: `cantidad`, `precio_promedio`.
```sql solucion
SELECT COUNT(*) AS cantidad, ROUND(AVG(precio), 2) AS precio_promedio FROM productos;
```
:::

:::ejercicio sql
Muestra el precio **mínimo** y **máximo** de los productos de la marca `Apple`. Columnas: `minimo`, `maximo`.
```sql solucion
SELECT MIN(precio) AS minimo, MAX(precio) AS maximo FROM productos WHERE marca = 'Apple';
```
:::

:::ejercicio sql
¿Cuántos clientes **distintos** hicieron al menos un pedido? Columna: `clientes_con_pedidos`.
```sql solucion
SELECT COUNT(DISTINCT cliente_id) AS clientes_con_pedidos FROM pedidos;
```
:::

:::ejercicio sql
Calcula el **total de unidades vendidas** (`SUM(cantidad)`) y el **importe neto** total de todas las líneas de `detalle_pedidos`, donde importe neto = `cantidad * precio_unitario * (1 - descuento)`, redondeado a 2 decimales. Columnas: `unidades`, `importe_neto`.
```sql solucion
SELECT SUM(cantidad) AS unidades, ROUND(SUM(cantidad * precio_unitario * (1 - descuento)), 2) AS importe_neto
FROM detalle_pedidos;
```
:::

:::ejercicio sql
¿Cuántos clientes **no tienen** teléfono y cuántos no tienen email? Hazlo en una sola consulta, **sin WHERE**, usando la diferencia entre `COUNT(*)` y `COUNT(columna)`. Columnas: `sin_telefono`, `sin_email`.
```sql solucion
SELECT COUNT(*) - COUNT(telefono) AS sin_telefono, COUNT(*) - COUNT(email) AS sin_email FROM clientes;
```
:::
