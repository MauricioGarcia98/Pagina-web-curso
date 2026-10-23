---
titulo: Dialectos de SQL: SQLite, PostgreSQL, SQL Server, Spark
nivel: Experto
duracion: 35
resumen: Lo que cambia entre motores y cómo traducir tus consultas a Databricks / Spark SQL.
---

## Un idioma, muchos acentos

SQL tiene un **estándar** (ANSI/ISO SQL) que define el núcleo común: `SELECT`, `JOIN`, `GROUP BY`, `CASE`, CTE, funciones de ventana. Todo eso funciona igual en casi cualquier motor. Pero cada fabricante agregó, a lo largo de décadas, sus propias funciones y atajos: esas variantes se llaman **dialectos**.

:::analogia El español de cada país
Un argentino, un mexicano y un español se entienden perfectamente, aunque uno diga "auto", otro "carro" y otro "coche". Con SQL pasa lo mismo: si sabes qué quieres decir (los conceptos), traducir la palabra exacta es buscarla en el diccionario. Por eso este curso enseña conceptos con SQLite y te marca las diferencias.
:::

¿Dónde vas a encontrar cada motor?

| Motor | Dónde se usa |
|---|---|
| **PostgreSQL** | Bases de aplicaciones, muy popular en startups; Redshift y muchos motores modernos copian su sintaxis |
| **MySQL / MariaDB** | Aplicaciones web clásicas |
| **SQL Server (T-SQL)** | Empresas con ecosistema Microsoft; Azure SQL, Synapse, Fabric |
| **Oracle** | Grandes corporaciones, bancos |
| **Spark SQL / Databricks SQL** | Lakehouse, big data |
| **BigQuery (GoogleSQL)** | Google Cloud |
| **Snowflake** | Data warehouse multinube |
| **Athena / Trino / Presto** | Consultas sobre data lakes en AWS y otros |
| **SQLite / DuckDB** | Bases embebidas, análisis local (DuckDB es furor para analítica en una laptop) |

## La chuleta de equivalencias

| Tarea | SQLite | PostgreSQL | SQL Server | Spark / Databricks | BigQuery | Snowflake |
|---|---|---|---|---|---|---|
| Limitar filas | `LIMIT 10` | `LIMIT 10` | `TOP 10` | `LIMIT 10` | `LIMIT 10` | `LIMIT 10` |
| Concatenar | `a \|\| b` | `a \|\| b` | `a + b` / `CONCAT` | `CONCAT` / `\|\|` | `CONCAT` / `\|\|` | `\|\|` / `CONCAT` |
| Reemplazar NULL | `COALESCE` / `IFNULL` | `COALESCE` | `COALESCE` / `ISNULL` | `COALESCE` / `NVL` | `COALESCE` / `IFNULL` | `COALESCE` / `NVL` |
| Fecha actual | `date('now')` | `CURRENT_DATE` | `GETDATE()` | `current_date()` | `CURRENT_DATE()` | `CURRENT_DATE` |
| Año | `strftime('%Y', f)` | `EXTRACT(YEAR FROM f)` | `YEAR(f)` | `year(f)` | `EXTRACT(YEAR FROM f)` | `YEAR(f)` |
| Truncar a mes | `date(f, 'start of month')` | `date_trunc('month', f)` | `DATETRUNC(month, f)` | `date_trunc('MONTH', f)` | `DATE_TRUNC(f, MONTH)` | `DATE_TRUNC('month', f)` |
| Sumar 7 días | `date(f, '+7 days')` | `f + INTERVAL '7 day'` | `DATEADD(day, 7, f)` | `date_add(f, 7)` | `DATE_ADD(f, INTERVAL 7 DAY)` | `DATEADD(day, 7, f)` |
| Días entre fechas | `julianday(b) - julianday(a)` | `b - a` | `DATEDIFF(day, a, b)` | `datediff(b, a)` | `DATE_DIFF(b, a, DAY)` | `DATEDIFF(day, a, b)` |
| Conversión segura | — | — | `TRY_CAST` | `try_cast` | `SAFE_CAST` | `TRY_CAST` |
| Filtrar ventanas | CTE + `WHERE` | CTE + `WHERE` | CTE + `WHERE` | `QUALIFY` | `QUALIFY` | `QUALIFY` |
| Upsert | `ON CONFLICT` | `ON CONFLICT` / `MERGE` | `MERGE` | `MERGE INTO` | `MERGE` | `MERGE` |
| Regex | (extensión) | `~`, `regexp_replace` | limitado | `rlike`, `regexp_extract` | `REGEXP_CONTAINS` | `REGEXP_LIKE` |
| Arrays / JSON | `json_extract` | `ARRAY`, `jsonb` | `OPENJSON` | `ARRAY`, `explode`, `from_json` | `ARRAY`, `UNNEST`, `JSON_VALUE` | `VARIANT`, `FLATTEN` |
| Nombre raro de columna | `"col"` | `"col"` | `[col]` | `` `col` `` | `` `col` `` | `"col"` |

## Diferencias que causan errores silenciosos

Las diferencias de sintaxis son fáciles: el motor da un error y lo corriges. Las peligrosas son las que **no dan error** pero cambian el resultado:

| Comportamiento | Dónde cambia | Ejemplo |
|---|---|---|
| **División entera** | `7/2 = 3` en SQLite, PostgreSQL, SQL Server; `3.5` en MySQL, Spark, BigQuery | Porcentajes que dan 0 al migrar |
| **Mayúsculas en comparaciones** | SQL Server y MySQL suelen ignorarlas; PostgreSQL y Spark no | `WHERE pais = 'chile'` encuentra filas en un motor y en otro no |
| **NULL al ordenar** | Primero en SQLite/MySQL; último en PostgreSQL/Oracle | Un "top 10" distinto |
| **Texto vacío vs NULL** | Oracle trata `''` como `NULL` | Filtros `IS NULL` que cambian |
| **Tipos estrictos** | SQLite convierte en silencio; los demás fallan o convierten distinto | `CAST('abc' AS INT)` → 0 en SQLite, error en otros |

Cuando migres una consulta de un motor a otro, compara **resultados** (conteos y totales), no solo que "ejecute sin error".

## Particularidades de Spark SQL / Databricks que vas a usar

```sql norun
-- Leer archivos directamente, sin crear una tabla
SELECT * FROM parquet.`/mnt/datos/pedidos/`;
SELECT * FROM read_files('/Volumes/main/crudo/archivos/', format => 'csv', header => true);

-- QUALIFY: top-1 por grupo sin CTE
SELECT * FROM pedidos
QUALIFY ROW_NUMBER() OVER (PARTITION BY cliente_id ORDER BY fecha_pedido DESC) = 1;

-- Arrays: explode genera una fila por elemento
SELECT pedido_id, explode(array('a', 'b', 'c')) AS letra FROM pedidos LIMIT 3;

-- Tres niveles de nombres con Unity Catalog: catálogo.esquema.tabla
SELECT * FROM main.ventas.pedidos;

-- Time travel en Delta Lake: la tabla como era antes
SELECT * FROM main.ventas.pedidos VERSION AS OF 12;
SELECT * FROM main.ventas.pedidos TIMESTAMP AS OF '2024-06-01';
```

## Cómo aprender un dialecto nuevo en una tarde

1. Busca la página de **funciones de fecha** y la de **funciones de texto** de su documentación: ahí están el 80 % de las diferencias.
2. Revisa cómo hace **upsert** (`MERGE`) y cómo **filtra ventanas** (`QUALIFY` o CTE).
3. Prueba los "errores silenciosos" de la tabla de arriba con consultas chiquitas (`SELECT 7/2`, `SELECT 'a' = 'A'`).
4. Pásale tus consultas favoritas de este curso y ajusta lo que falle.

Herramientas como **sqlglot** (Python) traducen automáticamente entre dialectos, muy útil en migraciones grandes.

:::tip Consejo profesional
Escribe SQL lo más **estándar** posible (CTE, `COALESCE`, `CASE`, ventanas, `CAST`) y usa los trucos específicos solo cuando aporten mucho. Tu código será más fácil de leer para otros y de migrar entre motores, algo que pasa más seguido de lo que crees (de un PostgreSQL a Snowflake, de un Hive a Databricks…).
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
