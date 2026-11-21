---
titulo: SQL de entrevista 4 - deduplicar, pivotear, anti-join y comparar períodos
nivel: Experto
duracion: 65
resumen: Las preguntas de "ordenar datos desprolijos" y "comparar" - quedarse con la última versión de cada registro, convertir filas en columnas, encontrar lo que no tiene pareja (clientes sin pedidos, clientes perdidos), comparar un trimestre con el mismo del año anterior y unir una tabla consigo misma. Son las que más aparecen en entrevistas de ingeniería de datos porque son el trabajo diario.
objetivos: Deduplicar con ROW_NUMBER quedándote con la última versión y normalizando valores | Pivotear filas a columnas con agregación condicional | Elegir entre NOT EXISTS, LEFT JOIN ... IS NULL y EXCEPT para encontrar lo que falta | Comparar períodos en una sola pasada con CASE dentro de SUM | Usar self-joins para comparar filas de la misma tabla
prerrequisitos: entrevistas-sql-acumulados-y-retencion | sql-capa-bronze | sql-joins-avanzados
autoevaluacion: ¿Por qué NOT IN con una subconsulta que tiene NULL devuelve cero filas? | ¿Cómo pivoteas si no existe PIVOT en el motor? | ¿Qué columna usas para desempatar al deduplicar? | ¿Cómo comparas dos trimestres sin hacer dos consultas?
---

:::analogia En palabras simples
Deduplicar es como ordenar una pila de formularios donde la misma persona se anotó tres veces: te quedas con el **más reciente** y lo pasas en limpio. Pivotear es dar vuelta una lista en una planilla con una columna por categoría. El anti-join es pasar lista: ¿quién **no** vino?
:::

## Deduplicar: la última versión de cada registro

Los datos crudos (capa bronze) traen el mismo pedido varias veces porque se reenvió un archivo o porque cambió de estado. La regla de negocio típica: **la carga más reciente gana**.

```sql
WITH versiones AS (
  SELECT pedido_id, estado, monto, cargado_en,
         ROW_NUMBER() OVER (PARTITION BY pedido_id ORDER BY cargado_en DESC, registro_id DESC) AS rn
  FROM bronze_pedidos
)
SELECT pedido_id, estado, monto
FROM versiones
WHERE rn = 1;
```

Y casi siempre hay que **normalizar** al mismo tiempo: estados escritos de varias formas (`Entregado`, `ENTREGADO`, `delivered`) y montos con coma decimal o signo `$`.

| Problema | Arreglo en SQL |
|---|---|
| Mayúsculas mezcladas | `LOWER(estado)` |
| Sinónimos en otro idioma | `CASE LOWER(estado) WHEN 'delivered' THEN 'entregado' ... ELSE LOWER(estado) END` |
| Espacios sobrantes | `TRIM(nombre)` |
| `974,07` o `$47.99` | `CAST(REPLACE(REPLACE(monto, '$', ''), ',', '.') AS REAL)` |

:::cuidado Normalizar antes o después de deduplicar
Si la clave de deduplicación es un texto sucio (un email con mayúsculas), **normaliza primero**: `PARTITION BY LOWER(TRIM(email))`. Si no, `Ana@x.com` y `ana@x.com` quedan como dos clientes distintos.
:::

## Pivotear con agregación condicional

`PIVOT` existe en SQL Server, Snowflake, Databricks, BigQuery y DuckDB, pero con sintaxis distinta en cada uno. La versión que funciona en **todos** es `SUM(CASE WHEN ...)`:

```sql
SELECT substr(fecha_pedido, 1, 4) AS anio,
       SUM(CASE WHEN canal = 'web'      THEN 1 ELSE 0 END) AS web,
       SUM(CASE WHEN canal = 'app'      THEN 1 ELSE 0 END) AS app,
       SUM(CASE WHEN canal = 'tienda'   THEN 1 ELSE 0 END) AS tienda,
       SUM(CASE WHEN canal = 'telefono' THEN 1 ELSE 0 END) AS telefono
FROM pedidos
GROUP BY substr(fecha_pedido, 1, 4);
```

El mismo truco compara períodos en una sola pasada: `SUM(CASE WHEN fecha en Q4 2023 THEN monto ELSE 0 END) AS q4_2023`.

## Encontrar lo que falta: tres formas

| Forma | Ejemplo | Cuidado |
|---|---|---|
| `NOT EXISTS` | `WHERE NOT EXISTS (SELECT 1 FROM pedidos p WHERE p.cliente_id = c.cliente_id)` | La más segura y clara |
| `LEFT JOIN ... IS NULL` | `LEFT JOIN pedidos p ON ... WHERE p.pedido_id IS NULL` | Filtra por una columna que nunca es nula en la tabla derecha |
| `EXCEPT` | `SELECT cliente_id FROM a EXCEPT SELECT cliente_id FROM b` | Compara filas completas y quita duplicados |
| `NOT IN` | `WHERE cliente_id NOT IN (SELECT cliente_id FROM pedidos)` | Si la subconsulta tiene **un solo NULL**, devuelve **cero filas** |

:::cuidado La trampa del NOT IN
`x NOT IN (1, 2, NULL)` nunca es verdadero: comparar con `NULL` da "desconocido". Es una pregunta clásica de entrevista. Usa `NOT EXISTS`, o agrega `WHERE cliente_id IS NOT NULL` dentro de la subconsulta.
:::

## Self-join: comparar filas de la misma tabla

Cuando una tabla se refiere a sí misma (un empleado tiene un `jefe_id` que es otro empleado), la unes consigo misma con dos alias:

```sql
SELECT e.nombre AS empleado, j.nombre AS jefe
FROM empleados e
JOIN empleados j ON j.empleado_id = e.jefe_id;
```

:::practica sql Deduplicar y normalizar la capa bronze
1. Ejecuta: verás cuántas filas tiene `bronze_pedidos`, cuántos pedidos distintos hay y cuántos estados distintos aparecen escritos.
2. Lee la segunda consulta: deduplica por `pedido_id` y normaliza el estado. Ejecuta y compara los conteos.
3. Cambia `ORDER BY cargado_en DESC` por `ASC` y fíjate qué cambia: te quedarías con la **primera** versión en lugar de la última.

```sql
SELECT COUNT(*) AS filas, COUNT(DISTINCT pedido_id) AS pedidos, COUNT(DISTINCT estado) AS estados_escritos
FROM bronze_pedidos;

WITH versiones AS (
  SELECT pedido_id, estado,
         ROW_NUMBER() OVER (PARTITION BY pedido_id ORDER BY cargado_en DESC, registro_id DESC) AS rn
  FROM bronze_pedidos
)
SELECT CASE LOWER(estado)
         WHEN 'delivered' THEN 'entregado' WHEN 'shipped' THEN 'enviado'
         WHEN 'pending' THEN 'pendiente' WHEN 'canceled' THEN 'cancelado'
         WHEN 'returned' THEN 'devuelto' ELSE LOWER(estado) END AS estado,
       COUNT(*) AS pedidos
FROM versiones WHERE rn = 1
GROUP BY 1
ORDER BY pedidos DESC;
```

Reto: agrega la columna `monto` limpia y verifica con `WHERE monto_limpio = 0` si quedó algún monto que no se pudo convertir.

Documentación oficial: [PIVOT (DuckDB)](https://duckdb.org/docs/current/sql/statements/pivot) · [EXCEPT (SQLite)](https://www.sqlite.org/lang_select.html#compound_select_statements) · [Subconsultas EXISTS (PostgreSQL)](https://www.postgresql.org/docs/current/functions-subquery.html)
:::

:::errores
- **Deduplicar sin desempate.** Si dos versiones tienen el mismo `cargado_en`, agrega `registro_id DESC`.
- **`NOT IN` con nulos.** Devuelve vacío sin avisar.
- **Pivotear con `COUNT(CASE ... ELSE 0 END)`.** `COUNT` cuenta el 0 también: usa `SUM(... ELSE 0)` o `COUNT(CASE ... END)` sin `ELSE`.
- **Comparar trimestres con dos consultas y restar a mano.** Una sola pasada con `CASE` evita errores y es más rápida.
:::

:::entrevista
**Pregunta:** "¿Cómo harías esta deduplicación todos los días sobre 500 millones de filas?"

**Respuesta modelo:** "No recalcularía todo: procesaría solo lo que llegó desde la última carga y haría un `MERGE` contra la tabla silver por `pedido_id`, actualizando solo si la versión nueva es más reciente. En Databricks eso es `MERGE INTO` sobre Delta o un flujo `AUTO CDC` en Lakeflow Declarative Pipelines; así cada día se procesan miles de filas, no millones."
:::

## Ejercicios

:::ejercicio quiz
`SELECT * FROM clientes WHERE cliente_id NOT IN (SELECT cliente_id FROM eventos_web)` devuelve cero filas, aunque sabes que hay clientes sin eventos. ¿Por qué?
- [ ] Porque `NOT IN` no funciona con subconsultas
- [x] Porque `eventos_web.cliente_id` tiene valores `NULL`, y cualquier comparación con `NULL` es desconocida
- [ ] Porque falta un `DISTINCT` en la subconsulta
- [ ] Porque hay que usar `JOIN` en lugar de subconsultas
:::

:::ejercicio sql dificultad=Experto titulo="La última versión de cada pedido, normalizada"
Deduplica `bronze_pedidos` quedándote con la **carga más reciente** de cada `pedido_id` (desempata por `registro_id` mayor). Normaliza `estado` a minúsculas en castellano (`delivered`→`entregado`, `shipped`→`enviado`, `pending`→`pendiente`, `canceled`→`cancelado`, `returned`→`devuelto`; el resto, en minúsculas) y `monto` a número (quita `$` y cambia la coma decimal por punto). Columnas: `pedido_id`, `estado`, `monto`.
```sql solucion
WITH r AS (
  SELECT pedido_id, estado, monto,
         ROW_NUMBER() OVER (PARTITION BY pedido_id ORDER BY cargado_en DESC, registro_id DESC) AS rn
  FROM bronze_pedidos
)
SELECT pedido_id,
       CASE LOWER(estado)
         WHEN 'delivered' THEN 'entregado' WHEN 'shipped' THEN 'enviado'
         WHEN 'pending' THEN 'pendiente' WHEN 'canceled' THEN 'cancelado'
         WHEN 'returned' THEN 'devuelto' ELSE LOWER(estado) END AS estado,
       CAST(REPLACE(REPLACE(monto, '$', ''), ',', '.') AS REAL) AS monto
FROM r WHERE rn = 1;
```
```pista
Deduplica con `ROW_NUMBER() OVER (PARTITION BY pedido_id ORDER BY cargado_en DESC, registro_id DESC)` y quédate con `rn = 1`.
```
```pista
El estado se normaliza con `CASE LOWER(estado) WHEN 'delivered' THEN 'entregado' ... ELSE LOWER(estado) END`; el monto con `CAST(REPLACE(REPLACE(monto, '$', ''), ',', '.') AS REAL)`.
```
:::

:::ejercicio sql dificultad=Avanzado titulo="Pedidos por canal y año, en columnas"
Devuelve una fila por año con la cantidad de pedidos (cualquier estado) de cada canal en columnas separadas. Columnas: `anio` (texto `AAAA`), `web`, `app`, `tienda`, `telefono`.
```sql solucion
SELECT substr(fecha_pedido, 1, 4) AS anio,
       SUM(CASE WHEN canal = 'web' THEN 1 ELSE 0 END) AS web,
       SUM(CASE WHEN canal = 'app' THEN 1 ELSE 0 END) AS app,
       SUM(CASE WHEN canal = 'tienda' THEN 1 ELSE 0 END) AS tienda,
       SUM(CASE WHEN canal = 'telefono' THEN 1 ELSE 0 END) AS telefono
FROM pedidos
GROUP BY substr(fecha_pedido, 1, 4);
```
```pista
Una columna por canal: `SUM(CASE WHEN canal = 'web' THEN 1 ELSE 0 END) AS web`, y así con los otros tres.
```
:::

:::ejercicio sql dificultad=Avanzado titulo="Clientes que nunca compraron, por país"
Para cada país, cuenta los clientes registrados que **no tienen ningún pedido** (de ningún estado). Columnas: `pais`, `clientes_sin_pedidos`.
```sql solucion
SELECT c.pais, COUNT(*) AS clientes_sin_pedidos
FROM clientes c
WHERE NOT EXISTS (SELECT 1 FROM pedidos p WHERE p.cliente_id = c.cliente_id)
GROUP BY c.pais;
```
```pista
`NOT EXISTS (SELECT 1 FROM pedidos p WHERE p.cliente_id = c.cliente_id)` deja solo a los clientes sin pareja.
```
:::

:::ejercicio sql dificultad=Avanzado titulo="Clientes perdidos: compraron en 2023 y no en 2024"
Devuelve los clientes que tuvieron al menos un pedido no cancelado en **2023** y ninguno no cancelado en **2024**. Columna: `cliente_id`.
```sql solucion
SELECT cliente_id FROM pedidos
WHERE estado <> 'cancelado' AND fecha_pedido >= '2023-01-01' AND fecha_pedido < '2024-01-01'
EXCEPT
SELECT cliente_id FROM pedidos
WHERE estado <> 'cancelado' AND fecha_pedido >= '2024-01-01' AND fecha_pedido < '2025-01-01';
```
```pista
Son dos conjuntos: los de 2023 **menos** los de 2024. `EXCEPT` resta conjuntos y además quita duplicados.
```
:::

:::ejercicio sql dificultad=Experto titulo="Cuarto trimestre: 2024 contra 2023 por canal"
Para cada canal, compara las ventas (pedidos no cancelados, `cantidad * precio_unitario * (1 - descuento)`) del **cuarto trimestre de 2023** con el de **2024**, en una sola consulta. Redondea las ventas a 2 decimales y la variación porcentual a 1. Columnas: `canal`, `q4_2023`, `q4_2024`, `variacion_pct`.
```sql solucion
WITH t AS (
  SELECT p.canal,
         SUM(CASE WHEN p.fecha_pedido >= '2023-10-01' AND p.fecha_pedido < '2024-01-01'
                  THEN d.cantidad * d.precio_unitario * (1 - d.descuento) ELSE 0 END) AS q4_2023,
         SUM(CASE WHEN p.fecha_pedido >= '2024-10-01' AND p.fecha_pedido < '2025-01-01'
                  THEN d.cantidad * d.precio_unitario * (1 - d.descuento) ELSE 0 END) AS q4_2024
  FROM pedidos p JOIN detalle_pedidos d ON d.pedido_id = p.pedido_id
  WHERE p.estado <> 'cancelado'
  GROUP BY p.canal
)
SELECT canal, ROUND(q4_2023, 2) AS q4_2023, ROUND(q4_2024, 2) AS q4_2024,
       ROUND(100.0 * (q4_2024 - q4_2023) / NULLIF(q4_2023, 0), 1) AS variacion_pct
FROM t;
```
```pista
Dos columnas con `SUM(CASE WHEN fecha en el trimestre THEN monto ELSE 0 END)`, agrupadas por canal.
```
```pista
Calcula la variación en una capa externa, con los totales **sin redondear**, y redondea solo al mostrar.
```
:::

:::ejercicio sql dificultad=Avanzado titulo="Contratados antes que su jefe"
Lista a las personas que fueron contratadas **antes** que su jefe directo. Columnas: `empleado` (nombre y apellido), `fecha_contratacion`, `jefe` (nombre y apellido), `jefe_desde` (fecha de contratación del jefe).
```sql solucion
SELECT e.nombre || ' ' || e.apellido AS empleado, e.fecha_contratacion,
       j.nombre || ' ' || j.apellido AS jefe, j.fecha_contratacion AS jefe_desde
FROM empleados e
JOIN empleados j ON j.empleado_id = e.jefe_id
WHERE e.fecha_contratacion < j.fecha_contratacion;
```
```pista
Une `empleados` consigo misma: `e` es la persona y `j` su jefe, con `j.empleado_id = e.jefe_id`.
```
:::
