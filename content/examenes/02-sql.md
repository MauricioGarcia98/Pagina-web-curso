# examen: sql

## Orden de ejecución
leccion: sql-group-by
¿Por qué esta consulta falla en la mayoría de los motores?
```sql norun
SELECT ciudad, SUM(total) AS ventas
FROM pedidos
WHERE ventas > 1000
GROUP BY ciudad;
```
- [ ] Porque `SUM` no se puede combinar con `GROUP BY` en la misma consulta; hay que usar una subconsulta.
- [x] Porque `WHERE` se evalúa antes de agrupar; hay que usar `HAVING SUM(total) > 1000`.
- [ ] Porque falta un `ORDER BY ventas` para que el motor sepa en qué orden comparar los totales.
- [ ] Porque `ciudad` debe ir después de `SUM(total)` en el `SELECT` cuando hay un `GROUP BY`.
porque: El orden lógico es FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY. `WHERE` filtra **filas** antes de agrupar; `HAVING` filtra **grupos** después de agregar.

## NULL en comparaciones
leccion: sql-null
La tabla `clientes` tiene 100 filas: 60 con `pais = 'Chile'`, 30 con `pais = 'Perú'` y 10 con `pais` en `NULL`. ¿Cuántas filas devuelve `SELECT * FROM clientes WHERE pais <> 'Chile'`?
- [ ] 40
- [x] 30
- [ ] 100
- [ ] 0
porque: `NULL <> 'Chile'` no es verdadero, es **desconocido** (`NULL`), y `WHERE` solo deja pasar lo verdadero. Para incluirlos: `WHERE pais <> 'Chile' OR pais IS NULL`.

## COUNT
leccion: sql-agregaciones
Con la misma tabla (100 clientes, 10 con `pais` en NULL), ¿qué devuelve `SELECT COUNT(*), COUNT(pais), COUNT(DISTINCT pais) FROM clientes`?
- [ ] 100, 100, 3
- [x] 100, 90, 2
- [ ] 90, 90, 2
- [ ] 100, 90, 3
porque: `COUNT(*)` cuenta filas; `COUNT(columna)` ignora los NULL; `COUNT(DISTINCT columna)` cuenta valores distintos no nulos (Chile y Perú).

## LEFT JOIN y WHERE
leccion: sql-joins-avanzados
Quieres **todos** los clientes con sus pedidos de 2024 (los que no compraron en 2024 también deben aparecer). ¿Qué consulta lo hace?
- [ ] `... LEFT JOIN pedidos p ON p.cliente_id = c.cliente_id WHERE p.fecha >= '2024-01-01'`
- [x] `... LEFT JOIN pedidos p ON p.cliente_id = c.cliente_id AND p.fecha >= '2024-01-01'`
- [ ] `... INNER JOIN pedidos p ON p.cliente_id = c.cliente_id AND p.fecha >= '2024-01-01'`
- [ ] `... FROM pedidos p LEFT JOIN clientes c ON ... WHERE p.fecha >= '2024-01-01'`
porque: Si el filtro de la tabla de la derecha va en `WHERE`, las filas sin pedido (con `p.fecha` NULL) se descartan y el LEFT JOIN se convierte en un INNER JOIN. El filtro debe ir en el `ON`.

## Fan-out
leccion: sql-joins
Un pedido tiene 3 ítems en `items` y 2 pagos en `pagos`. Si unes `pedidos` con `items` y con `pagos` por `pedido_id` y haces `SUM(pagos.monto)`, ¿qué pasa con ese pedido?
- [ ] Suma bien los 2 pagos, porque el join solo repite las columnas de la tabla `items`.
- [x] Cada pago aparece 3 veces, una por ítem: el monto pagado se triplica.
- [ ] La consulta da un error de ambigüedad porque las dos tablas tienen `pedido_id`.
- [ ] Solo cuenta el primer pago de cada pedido, porque el join toma una coincidencia por fila.
porque: Es el **fan-out**: el join produce 3 × 2 = 6 filas para ese pedido. Se resuelve agregando cada tabla hija por separado (en CTEs) antes de unirlas.

## Anti-join
leccion: sql-subconsultas
¿Cuál es la forma más segura de encontrar los clientes que **nunca** hicieron un pedido?
- [ ] `WHERE cliente_id NOT IN (SELECT cliente_id FROM pedidos)`, que funciona con cualquier dato.
- [x] `WHERE NOT EXISTS (SELECT 1 FROM pedidos p WHERE p.cliente_id = c.cliente_id)`
- [ ] `WHERE cliente_id <> ALL (SELECT cliente_id FROM pedidos)`, que ignora los valores NULL.
- [ ] `INNER JOIN pedidos` y quedarse con las filas en las que `p.cliente_id` es NULL.
porque: Si la subconsulta de `NOT IN` devuelve algún `NULL`, la condición nunca es verdadera y el resultado queda **vacío**. `NOT EXISTS` (o `LEFT JOIN ... WHERE p.cliente_id IS NULL`) no tiene ese problema.

## ROW_NUMBER vs. RANK
leccion: sql-ventanas-1
Tres vendedores tienen ventas de 500, 500 y 300. ¿Qué devuelven `ROW_NUMBER()`, `RANK()` y `DENSE_RANK()` ordenando por ventas descendente?
- [ ] Los tres devuelven 1, 2, 3, porque el orden descendente rompe los empates.
- [x] ROW_NUMBER: 1, 2, 3 · RANK: 1, 1, 3 · DENSE_RANK: 1, 1, 2
- [ ] ROW_NUMBER: 1, 1, 2 · RANK: 1, 2, 3 · DENSE_RANK: 1, 1, 3
- [ ] ROW_NUMBER: 1, 1, 3 · RANK: 1, 1, 2 · DENSE_RANK: 1, 2, 3
porque: `ROW_NUMBER` numera sin repetir (el empate se rompe arbitrariamente), `RANK` da el mismo puesto a los empatados y **salta** el siguiente, y `DENSE_RANK` no deja huecos.

## Deduplicar
leccion: sql-ventanas-1
La tabla `clientes_raw` trae varias versiones de cada cliente (columna `actualizado_en`). ¿Qué patrón deja solo la versión más reciente de cada uno?
- [ ] `SELECT DISTINCT * FROM clientes_raw`, que elimina las versiones repetidas de cada cliente.
- [ ] `SELECT cliente_id, MAX(actualizado_en) FROM clientes_raw GROUP BY cliente_id`, con todas las columnas.
- [x] `ROW_NUMBER() OVER (PARTITION BY cliente_id ORDER BY actualizado_en DESC)` y filtrar `rn = 1`.
- [ ] `SELECT * FROM clientes_raw ORDER BY actualizado_en DESC LIMIT 1` para cada cliente.
porque: `DISTINCT` no sirve porque las versiones difieren en algunas columnas; el `GROUP BY` devuelve solo la fecha, no la fila completa; `LIMIT 1` deja un solo cliente en total. `ROW_NUMBER` por cliente es el patrón estándar.

## Acumulados
leccion: sql-ventanas-2
¿Qué calcula `SUM(total) OVER (PARTITION BY cliente_id ORDER BY fecha ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)`?
- [ ] El total de cada cliente, repetido en todas sus filas, sin importar la fecha.
- [x] El gasto acumulado de cada cliente hasta cada pedido, en orden de fecha.
- [ ] El total de todos los clientes acumulado por fecha, sin separar por cliente.
- [ ] La diferencia entre cada pedido y el anterior del mismo cliente.
porque: Con `ORDER BY` y un marco "desde el principio hasta la fila actual", la ventana suma fila a fila: es un **acumulado** que se reinicia por cliente gracias al `PARTITION BY`.

## LAG
leccion: sql-ventanas-2
¿Qué devuelve `fecha - LAG(fecha) OVER (PARTITION BY cliente_id ORDER BY fecha)` en el **primer** pedido de cada cliente?
- [ ] 0, porque no hay días transcurridos desde un pedido anterior.
- [x] NULL, porque no hay un pedido anterior.
- [ ] La diferencia con el último pedido del mismo cliente, porque la ventana es circular.
- [ ] Un error, porque `LAG` no se puede usar en la primera fila de una partición.
porque: `LAG` devuelve NULL cuando no existe la fila anterior (salvo que le pases un valor por defecto como tercer argumento), y cualquier operación con NULL da NULL.

## CTE recursiva
leccion: sql-recursivas
¿Qué hace esta consulta?
```sql norun
WITH RECURSIVE dias(d) AS (
  SELECT DATE '2024-01-01'
  UNION ALL
  SELECT d + INTERVAL 1 DAY FROM dias WHERE d < DATE '2024-01-31'
)
SELECT COUNT(*) FROM dias;
```
- [ ] Devuelve 30, porque la condición `d < '2024-01-31'` deja afuera el último día.
- [x] Genera una fila por cada día de enero de 2024 y devuelve 31.
- [ ] Entra en un bucle infinito porque `UNION ALL` no elimina las filas repetidas.
- [ ] Devuelve 1, porque la parte recursiva solo se ejecuta si hay un `JOIN`.
porque: La parte inicial genera el 1 de enero; la parte recursiva suma un día mientras `d < 31 de enero`. La última fila generada es el 31, así que hay 31 filas. El `WHERE` es la condición de corte que evita el bucle infinito.

## Transacciones
leccion: sql-ddl-dml
Una transferencia resta 100 de la cuenta A y suma 100 a la cuenta B. ¿Por qué deben ir en una transacción?
- [ ] Para que se ejecuten más rápido, porque el motor agrupa los dos `UPDATE` en una sola escritura.
- [x] Para que se apliquen las dos o ninguna: si falla la segunda, la primera se deshace.
- [ ] Porque `UPDATE` solo funciona dentro de una transacción explícita en la mayoría de los motores.
- [ ] Para que ningún otro usuario pueda leer esas tablas mientras exista la conexión.
porque: Es la "A" de ACID: atomicidad. Sin transacción, un error entre los dos `UPDATE` dejaría 100 desaparecidos del sistema.

## Índices
leccion: sql-rendimiento
La tabla `pedidos` tiene un índice sobre `fecha`. ¿Cuál de estos filtros probablemente **no** puede usar el índice?
- [ ] `WHERE fecha = '2024-03-01'`
- [ ] `WHERE fecha BETWEEN '2024-03-01' AND '2024-03-31'`
- [x] `WHERE strftime('%Y', fecha) = '2024'`
- [ ] `WHERE fecha >= '2024-01-01' AND fecha < '2025-01-01'`
porque: Al aplicar una función sobre la columna, el motor tiene que calcularla fila por fila: el índice ordenado por `fecha` no sirve. Reescríbelo como rango: `fecha >= '2024-01-01' AND fecha < '2025-01-01'`.
