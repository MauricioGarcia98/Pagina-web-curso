---
titulo: Trabajar con fechas
nivel: Básico
duracion: 25
resumen: Formato ISO, date(), strftime(), julianday(), rangos de fechas y diferencias entre motores.
---

Las fechas están en casi todo análisis: ventas por mes, clientes nuevos por año, días entre la compra y el pago…

## Fechas en SQLite

SQLite no tiene un tipo `DATE` propiamente dicho: guarda las fechas como **texto en formato ISO 8601** (`'2024-03-15'` o `'2024-03-15 14:30:00'`). La ventaja: ordenar y comparar texto ISO funciona igual que ordenar fechas.

```sql
SELECT pedido_id, fecha_pedido
FROM pedidos
WHERE fecha_pedido >= '2024-12-24' AND fecha_pedido < '2024-12-26'
ORDER BY fecha_pedido;
```

:::tip Rangos semiabiertos
Para filtrar un periodo, usa `>= inicio AND < fin_siguiente`. Por ejemplo, todo marzo: `fecha >= '2024-03-01' AND fecha < '2024-04-01'`. Funciona igual con fechas y con fecha-hora, y evita errores con el último día.
:::

## Funciones de fecha de SQLite

| Función | Ejemplo | Resultado |
|---|---|---|
| `date(t)` | `date('2024-03-15 14:30:00')` | `2024-03-15` |
| `date(t, modificador)` | `date('2024-03-15', '+1 month')` | `2024-04-15` |
| | `date('2024-03-15', 'start of month')` | `2024-03-01` |
| | `date('now')` | la fecha de hoy |
| `strftime(formato, t)` | `strftime('%Y', '2024-03-15')` | `2024` (texto) |
| | `strftime('%Y-%m', fecha)` | `2024-03` (año-mes) |
| | `strftime('%w', fecha)` | día de la semana: 0 = domingo … 6 = sábado |
| `julianday(t)` | `julianday('2024-03-15') - julianday('2024-03-01')` | `14.0` (días de diferencia) |

```sql
SELECT pedido_id,
       fecha_pedido,
       strftime('%Y', fecha_pedido)               AS anio,
       CAST(strftime('%m', fecha_pedido) AS INT)  AS mes,
       date(fecha_pedido, 'start of month')       AS inicio_mes,
       date(fecha_pedido, '+30 days')             AS vence
FROM pedidos
LIMIT 5;
```

:::nota Lo mismo en otros motores
| Qué | SQLite | PostgreSQL | Spark SQL / Databricks | SQL Server |
|---|---|---|---|---|
| Año | `strftime('%Y', f)` | `EXTRACT(YEAR FROM f)` | `year(f)` | `YEAR(f)` |
| Inicio de mes | `date(f, 'start of month')` | `date_trunc('month', f)` | `date_trunc('month', f)` / `trunc(f, 'MM')` | `DATETRUNC(month, f)` |
| Sumar días | `date(f, '+7 days')` | `f + INTERVAL '7 days'` | `date_add(f, 7)` | `DATEADD(day, 7, f)` |
| Diferencia en días | `julianday(a) - julianday(b)` | `a - b` | `datediff(a, b)` | `DATEDIFF(day, b, a)` |

Los conceptos son iguales; solo cambia la sintaxis. Cuando trabajes con otro motor, busca “date functions” en su documentación.
:::

## Ejercicios

:::ejercicio sql
Muestra `pedido_id`, `cliente_id` y `fecha_pedido` de los pedidos realizados en **diciembre de 2024**.
```sql solucion
SELECT pedido_id, cliente_id, fecha_pedido FROM pedidos
WHERE fecha_pedido >= '2024-12-01' AND fecha_pedido < '2025-01-01';
```
```pista
Usa un rango semiabierto: `>= '2024-12-01' AND < '2025-01-01'`.
```
:::

:::ejercicio sql
Muestra `cliente_id`, `nombre` y `fecha_registro` de los clientes que se registraron en el año **2023**. Usa `strftime`.
```sql solucion
SELECT cliente_id, nombre, fecha_registro FROM clientes WHERE strftime('%Y', fecha_registro) = '2023';
```
```pista
`strftime('%Y', fecha_registro)` devuelve el año como **texto**, así que compáralo con `'2023'` entre comillas.
```
:::

:::ejercicio sql
Para cada pago **aprobado**, muestra `pago_id`, `pedido_id` y los **días** que pasaron entre el pedido y el pago (alias `dias_hasta_pago`, como entero). Necesitarás la fecha del pedido: por ahora, usa una subconsulta en el SELECT así: `(SELECT fecha_pedido FROM pedidos p WHERE p.pedido_id = pagos.pedido_id)`.
```sql solucion
SELECT pago_id, pedido_id,
       CAST(julianday(fecha_pago) - julianday((SELECT fecha_pedido FROM pedidos p WHERE p.pedido_id = pagos.pedido_id)) AS INTEGER) AS dias_hasta_pago
FROM pagos
WHERE estado = 'aprobado';
```
```pista
`julianday(fecha_pago) - julianday(fecha_del_pedido)` y envuélvelo en `CAST(... AS INTEGER)`. Pronto aprenderás a hacerlo con `JOIN`.
```
:::

:::ejercicio sql
Muestra `nombre`, `apellido`, `fecha_contratacion` de los empleados que llevaban **más de 7 años** en la empresa al `2024-12-31` (es decir, más de 7 × 365,25 días).
```sql solucion
SELECT nombre, apellido, fecha_contratacion FROM empleados
WHERE julianday('2024-12-31') - julianday(fecha_contratacion) > 7 * 365.25;
```
:::

:::ejercicio sql
¿Cuántos pedidos se hicieron en **fin de semana** (sábado o domingo)? Muestra una sola columna llamada `pedidos_fin_de_semana`. (Pista: `COUNT(*)` cuenta filas; lo verás en detalle en la próxima lección.)
```sql solucion
SELECT COUNT(*) AS pedidos_fin_de_semana FROM pedidos WHERE strftime('%w', fecha_pedido) IN ('0', '6');
```
```pista
`strftime('%w', fecha)` devuelve `'0'` para domingo y `'6'` para sábado.
```
:::
