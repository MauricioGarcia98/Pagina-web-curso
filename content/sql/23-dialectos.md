---
titulo: Dialectos de SQL: SQLite, PostgreSQL, SQL Server, Spark
nivel: Experto
duracion: 20
resumen: Lo que cambia entre motores y cómo traducir tus consultas a Databricks / Spark SQL.
---

El **estándar ANSI SQL** define el núcleo común, pero cada motor tiene su “acento”. Si dominas los conceptos, cambiar de motor es cuestión de días. Esta tabla es tu chuleta:

| Tarea | SQLite | PostgreSQL | SQL Server (T-SQL) | Spark SQL / Databricks |
|---|---|---|---|---|
| Limitar filas | `LIMIT 10` | `LIMIT 10` | `TOP 10` / `OFFSET ... FETCH` | `LIMIT 10` |
| Concatenar | `a \|\| b` | `a \|\| b` / `CONCAT` | `a + b` / `CONCAT` | `CONCAT(a, b)` / `a \|\| b` |
| Nulos | `IFNULL`, `COALESCE` | `COALESCE` | `ISNULL`, `COALESCE` | `NVL`, `COALESCE` |
| Fecha actual | `date('now')` | `CURRENT_DATE` | `GETDATE()` | `current_date()` |
| Año de una fecha | `strftime('%Y', f)` | `EXTRACT(YEAR FROM f)` | `YEAR(f)` | `year(f)` |
| Truncar a mes | `date(f, 'start of month')` | `date_trunc('month', f)` | `DATETRUNC(month, f)` | `date_trunc('MONTH', f)` |
| Sumar días | `date(f, '+7 days')` | `f + INTERVAL '7 day'` | `DATEADD(day, 7, f)` | `date_add(f, 7)` |
| Diferencia en días | `julianday(a) - julianday(b)` | `a - b` | `DATEDIFF(day, b, a)` | `datediff(a, b)` |
| Texto a número | `CAST(x AS INTEGER)` | `x::int` | `CAST`, `TRY_CAST` | `CAST`, `try_cast` |
| Filtrar ventanas | CTE + WHERE | CTE + WHERE | CTE + WHERE | `QUALIFY` |
| Upsert | `ON CONFLICT` | `ON CONFLICT` | `MERGE` | `MERGE INTO` (Delta) |
| Expresiones regulares | `REGEXP` (extensión) | `~`, `regexp_replace` | limitado | `rlike`, `regexp_extract` |
| Arreglos / JSON | JSON1 (`json_extract`) | `ARRAY`, `jsonb` | `OPENJSON` | `ARRAY`, `STRUCT`, `explode`, `from_json` |
| Identificadores | `"col"` | `"col"` | `[col]` | `` `col` `` |

## Particularidades de Spark SQL / Databricks que vas a usar

```sql norun
-- Leer archivos directamente
SELECT * FROM parquet.`/mnt/datos/pedidos/`;
SELECT * FROM read_files('/Volumes/main/crudo/archivos/', format => 'csv', header => true);

-- QUALIFY: top-1 por grupo sin CTE
SELECT * FROM pedidos
QUALIFY ROW_NUMBER() OVER (PARTITION BY cliente_id ORDER BY fecha_pedido DESC) = 1;

-- Arrays y explode
SELECT pedido_id, explode(array('a', 'b', 'c')) AS letra FROM pedidos LIMIT 3;

-- Tablas de tres niveles con Unity Catalog: catálogo.esquema.tabla
SELECT * FROM main.ventas.pedidos;

-- Time travel en Delta Lake
SELECT * FROM main.ventas.pedidos VERSION AS OF 12;
SELECT * FROM main.ventas.pedidos TIMESTAMP AS OF '2024-06-01';
```

:::tip Consejo profesional
Escribe SQL lo más **estándar** posible (CTE, `COALESCE`, `CASE`, ventanas, `CAST`) y deja los trucos específicos para cuando hagan falta. Tu código será más fácil de migrar entre motores (algo que pasa más de lo que crees).
:::

:::ejercicio quiz
Estás en Databricks y quieres el último pedido de cada cliente **sin** escribir una CTE. ¿Qué cláusula usas?

- [ ] HAVING
- [x] QUALIFY
- [ ] TOP
- [ ] FETCH FIRST
:::

:::ejercicio quiz
¿Cómo obtienes el año de una fecha en Spark SQL?

- [ ] `strftime('%Y', f)`
- [x] `year(f)`
- [ ] `DATEPART(f)`
- [ ] `f.year`
:::
