---
titulo: SQL de entrevista 1 - top-N por grupo, empates y el N-ésimo valor
nivel: Avanzado
duracion: 60
resumen: La familia de preguntas más repetida en entrevistas de SQL - "los 3 mejores de cada grupo", "el segundo más alto", "el primer pedido de cada cliente", "el 10 % superior". Aprendes a elegir entre ROW_NUMBER, RANK, DENSE_RANK y NTILE según lo que pide la pregunta sobre los empates, y a desempatar de forma determinista.
objetivos: Elegir ROW_NUMBER, RANK o DENSE_RANK según cómo deben tratarse los empates | Resolver top-N por grupo con PARTITION BY y un filtro en una capa externa | Desempatar de forma determinista agregando una segunda columna al ORDER BY | Usar NTILE para percentiles y explicar sus límites
prerrequisitos: entrevistas-como-es-una-entrevista | sql-ventanas-1
autoevaluacion: ¿Sabes qué devuelven ROW_NUMBER, RANK y DENSE_RANK con un empate? | ¿Por qué no puedes filtrar una función de ventana en el WHERE de la misma consulta? | ¿Qué pasa si ordenas solo por fecha y dos pedidos tienen la misma fecha? | ¿Qué hace NTILE cuando las filas no se dividen exacto?
---

:::analogia En palabras simples
Un podio olímpico es un top-N con empates. Si dos atletas empatan el oro, ¿hay medalla de plata? Con **RANK** no (pasa de 1 a 3), con **DENSE_RANK** sí (1, 1, 2), y con **ROW_NUMBER** uno de los dos se queda sin oro aunque haya empatado. La pregunta de la entrevista te dice cuál de los tres podios quieren, y si no lo dice, **preguntas**.
:::

## Las tres numeraciones, lado a lado

Con salarios 9000, 9000, 7000 y 6000 en un mismo departamento:

| salario | ROW_NUMBER | RANK | DENSE_RANK |
|---|---|---|---|
| 9000 | 1 | 1 | 1 |
| 9000 | 2 | 1 | 1 |
| 7000 | 3 | 3 | 2 |
| 6000 | 4 | 4 | 3 |

| Si la pregunta dice… | Usa | Por qué |
|---|---|---|
| "el primer pedido", "uno por cliente", "quedarse con el último" | `ROW_NUMBER` | Exactamente una fila por grupo |
| "los 3 mejores, con empates incluidos" | `RANK` | Los empatados comparten puesto; el top puede tener más de 3 filas |
| "el segundo valor más alto", "los 3 valores más altos" | `DENSE_RANK` | Cuenta **valores** distintos, no filas |
| "el 10 % superior", "cuartiles" | `NTILE` | Reparte las filas en baldes de igual tamaño |

## La plantilla de top-N por grupo

Las funciones de ventana se calculan **después** del `WHERE`, así que no puedes escribir `WHERE RANK() OVER (...) <= 3`. La solución es siempre la misma: calcular la posición en una capa y filtrar en la siguiente.

```sql
WITH ranking AS (
  SELECT d.nombre AS departamento,
         e.nombre || ' ' || e.apellido AS empleado,
         e.salario,
         DENSE_RANK() OVER (PARTITION BY e.departamento_id ORDER BY e.salario DESC) AS pos
  FROM empleados e
  JOIN departamentos d ON d.departamento_id = e.departamento_id
  WHERE e.fecha_salida IS NULL
)
SELECT departamento, empleado, salario, pos
FROM ranking
WHERE pos <= 2
ORDER BY departamento, pos;
```

| Pieza | Qué hace |
|---|---|
| `PARTITION BY e.departamento_id` | Reinicia la numeración en cada departamento |
| `ORDER BY e.salario DESC` | El más alto recibe la posición 1 |
| `WHERE e.fecha_salida IS NULL` | Se aplica **antes** de numerar: solo quienes siguen trabajando |
| `WHERE pos <= 2` (afuera) | Se aplica **después** de numerar |

:::nota QUALIFY
Databricks, Snowflake, BigQuery y DuckDB tienen `QUALIFY`, que filtra por una función de ventana sin capa extra: `... QUALIFY DENSE_RANK() OVER (...) <= 2`. SQLite, PostgreSQL, MySQL y SQL Server no lo tienen. En una entrevista, la versión con CTE funciona en todos lados; menciona `QUALIFY` como mejora si el motor lo soporta.
:::

## Desempate determinista

"El primer pedido de cada cliente" parece fácil, pero un cliente puede tener **dos pedidos el mismo día**. Si ordenas solo por `fecha_pedido`, `ROW_NUMBER` elige uno al azar y la consulta puede dar resultados distintos cada vez que corre. Agrega una columna que nunca se repite:

```sql norun
ROW_NUMBER() OVER (PARTITION BY cliente_id ORDER BY fecha_pedido, pedido_id)
```

:::cuidado Resultados que cambian entre ejecuciones
Un `ROW_NUMBER` con empates en el `ORDER BY` es **no determinista**: en Spark o en un warehouse distribuido, dos ejecuciones pueden quedarse con filas distintas. En producción eso rompe pruebas y conciliaciones. Siempre termina el `ORDER BY` con la clave primaria.
:::

## NTILE y percentiles

`NTILE(10) OVER (ORDER BY gasto DESC)` reparte las filas en 10 baldes del mismo tamaño (los primeros baldes reciben una fila más si no se dividen exacto). El balde 1 es el 10 % superior **por cantidad de filas**, no por monto. Si la pregunta es "clientes que suman el 80 % de las ventas", eso es Pareto, y se resuelve con un acumulado (lección 4), no con `NTILE`.

:::practica sql Las tres numeraciones sobre los mismos datos
1. Ejecuta: verás `ROW_NUMBER`, `RANK` y `DENSE_RANK` sobre los salarios de un departamento.
2. Busca dos filas con el mismo salario y compara las tres columnas.
3. Cambia `departamento_id = 2` por `4` y predice, **antes** de ejecutar, dónde va a saltar `RANK`.

```sql
SELECT nombre, salario,
       ROW_NUMBER() OVER (ORDER BY salario DESC, empleado_id) AS fila,
       RANK()       OVER (ORDER BY salario DESC) AS rank,
       DENSE_RANK() OVER (ORDER BY salario DESC) AS dense_rank
FROM empleados
WHERE departamento_id = 2
ORDER BY salario DESC, empleado_id;
```

Reto: escribe la misma consulta con `PARTITION BY departamento_id` y sin el `WHERE`, y quédate con el top 3 de cada departamento usando una CTE.

Documentación oficial: [Funciones de ventana (DuckDB)](https://duckdb.org/docs/current/sql/functions/window_functions) · [QUALIFY](https://duckdb.org/docs/current/sql/query_syntax/qualify) · [Window functions (PostgreSQL)](https://www.postgresql.org/docs/current/tutorial-window.html)
:::

:::errores
- **Filtrar la ventana en el mismo WHERE.** Da error: calcula en una CTE y filtra afuera.
- **Usar ROW_NUMBER cuando piden empates.** Pierdes filas que empataron.
- **Olvidar PARTITION BY.** Obtienes el top global, no el top por grupo.
- **Ordenar ASC cuando piden "los más altos".** Revisa el sentido del `ORDER BY` de la ventana.
:::

:::entrevista
**Pregunta:** "¿Por qué usaste DENSE_RANK y no RANK?"

**Respuesta modelo:** "Porque pediste el segundo **salario** más alto, no la segunda **persona**. Si dos personas empatan en el primero, con `RANK` la posición 2 no existe y la consulta devolvería vacío; `DENSE_RANK` cuenta valores distintos, así que la posición 2 es el siguiente salario."
:::

## Ejercicios

:::ejercicio sql dificultad=Avanzado titulo="Los dos salarios más altos de cada departamento"
Para cada departamento, lista a las personas **que siguen trabajando** (`fecha_salida` nula) cuyos salarios están entre los **dos valores más altos** del departamento. Si hay empates, aparecen todos los empatados. Columnas: `departamento` (nombre), `empleado` (nombre y apellido separados por un espacio), `salario`, `pos`.
```sql solucion
WITH ranking AS (
  SELECT d.nombre AS departamento,
         e.nombre || ' ' || e.apellido AS empleado,
         e.salario,
         DENSE_RANK() OVER (PARTITION BY e.departamento_id ORDER BY e.salario DESC) AS pos
  FROM empleados e
  JOIN departamentos d ON d.departamento_id = e.departamento_id
  WHERE e.fecha_salida IS NULL
)
SELECT departamento, empleado, salario, pos FROM ranking WHERE pos <= 2;
```
```pista
"Los dos valores más altos, con empates" es `DENSE_RANK`, con `PARTITION BY` por departamento.
```
```pista
Filtra `fecha_salida IS NULL` **dentro** de la CTE (antes de numerar) y `pos <= 2` afuera.
```
:::

:::ejercicio sql dificultad=Avanzado titulo="El tercer salario distinto de cada departamento"
Para cada `departamento_id`, devuelve el **tercer salario distinto** más alto (considera a todas las personas, incluso las que se fueron). Los departamentos con menos de tres salarios distintos no aparecen. Columnas: `departamento_id`, `salario`.
```sql solucion
WITH distintos AS (SELECT DISTINCT departamento_id, salario FROM empleados),
ranking AS (
  SELECT departamento_id, salario,
         DENSE_RANK() OVER (PARTITION BY departamento_id ORDER BY salario DESC) AS pos
  FROM distintos
)
SELECT departamento_id, salario FROM ranking WHERE pos = 3;
```
```pista
Con `DENSE_RANK` no hace falta el `DISTINCT`, pero aparecerían filas repetidas si dos personas comparten el tercer salario. Quita duplicados primero o agrega `DISTINCT` al final.
```
:::

:::ejercicio sql dificultad=Avanzado titulo="El primer pedido de cada cliente, sin azar"
Para cada cliente, devuelve su **primer pedido** (cualquier estado). Si tiene dos pedidos el mismo día, gana el de menor `pedido_id`. Columnas: `cliente_id`, `pedido_id`, `fecha_pedido`, `canal`.
```sql solucion
WITH r AS (
  SELECT cliente_id, pedido_id, fecha_pedido, canal,
         ROW_NUMBER() OVER (PARTITION BY cliente_id ORDER BY fecha_pedido, pedido_id) AS rn
  FROM pedidos
)
SELECT cliente_id, pedido_id, fecha_pedido, canal FROM r WHERE rn = 1;
```
```pista
"Uno por cliente" es `ROW_NUMBER`. El desempate va como segunda columna del `ORDER BY` de la ventana.
```
:::

:::ejercicio sql dificultad=Avanzado titulo="El producto más vendido de cada categoría en 2024"
Para cada categoría, devuelve el producto (o los productos, si empatan) con **más unidades vendidas en 2024** en pedidos no cancelados. Columnas: `categoria` (nombre), `producto` (nombre), `unidades`.
```sql solucion
WITH u AS (
  SELECT pr.categoria_id, c.nombre AS categoria, pr.nombre AS producto, SUM(d.cantidad) AS unidades
  FROM detalle_pedidos d
  JOIN pedidos p     ON p.pedido_id = d.pedido_id
  JOIN productos pr  ON pr.producto_id = d.producto_id
  JOIN categorias c  ON c.categoria_id = pr.categoria_id
  WHERE p.estado <> 'cancelado' AND p.fecha_pedido >= '2024-01-01' AND p.fecha_pedido < '2025-01-01'
  GROUP BY pr.categoria_id, c.nombre, pr.producto_id, pr.nombre
),
r AS (SELECT categoria, producto, unidades, RANK() OVER (PARTITION BY categoria_id ORDER BY unidades DESC) AS rk FROM u)
SELECT categoria, producto, unidades FROM r WHERE rk = 1;
```
```pista
Primero las unidades por producto (cuatro tablas: detalle, pedidos, productos, categorías). Agrupa por `producto_id`, no solo por nombre: dos productos podrían llamarse igual.
```
```pista
"Si empatan, todos" con posición 1: `RANK() OVER (PARTITION BY categoria_id ORDER BY unidades DESC)` y te quedas con `rk = 1`. En Fitness hay un empate: deben salir los dos.
```
:::

:::ejercicio sql dificultad=Experto titulo="El 10 % de clientes que más gastó en 2024"
Calcula el gasto de cada cliente en 2024 (pedidos no cancelados; gasto = `cantidad * precio_unitario * (1 - descuento)`, redondeado a 2 decimales) y devuelve los clientes del **primer decil** según `NTILE(10)` ordenado por gasto descendente. Columnas: `cliente_id`, `gasto`.
```sql solucion
WITH g AS (
  SELECT p.cliente_id,
         ROUND(SUM(d.cantidad * d.precio_unitario * (1 - d.descuento)), 2) AS gasto
  FROM pedidos p
  JOIN detalle_pedidos d ON d.pedido_id = p.pedido_id
  WHERE p.estado <> 'cancelado' AND p.fecha_pedido >= '2024-01-01' AND p.fecha_pedido < '2025-01-01'
  GROUP BY p.cliente_id
),
t AS (SELECT cliente_id, gasto, NTILE(10) OVER (ORDER BY gasto DESC) AS decil FROM g)
SELECT cliente_id, gasto FROM t WHERE decil = 1;
```
```pista
Primero una CTE con el gasto por cliente (join de pedidos con detalle, filtro de año y de estado).
```
```pista
Después `NTILE(10) OVER (ORDER BY gasto DESC)` y te quedas con el balde 1.
```
:::

:::ejercicio sql dificultad=Experto titulo="El canal favorito de cada cliente, sin empates"
Para cada cliente, devuelve el **canal con más pedidos** (cualquier estado). Si empata en dos canales, gana el que va primero alfabéticamente. Columnas: `cliente_id`, `canal`, `pedidos`.
```sql solucion
WITH c AS (
  SELECT cliente_id, canal, COUNT(*) AS pedidos FROM pedidos GROUP BY cliente_id, canal
),
r AS (
  SELECT cliente_id, canal, pedidos,
         ROW_NUMBER() OVER (PARTITION BY cliente_id ORDER BY pedidos DESC, canal) AS rn
  FROM c
)
SELECT cliente_id, canal, pedidos FROM r WHERE rn = 1;
```
```pista
Primero agrega (cliente, canal) con `COUNT(*)`; después numera dentro de cada cliente.
```
```pista
"Sin empates" con regla de desempate: `ROW_NUMBER() OVER (PARTITION BY cliente_id ORDER BY pedidos DESC, canal)`.
```
:::
