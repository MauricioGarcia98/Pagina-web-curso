# area: SQL

## SQL
alias: lenguaje SQL, structured query language
nino: SQL es el **idioma para hablar con las bases de datos**. Es como pedirle algo muy claro a un ayudante: "tráeme el nombre de todos los clientes de Lima, ordenados por apellido". El ayudante (la base de datos) entiende esa frase y te trae la lista.
que: *Structured Query Language*: el lenguaje estándar para consultar y modificar datos en bases relacionales y warehouses. Es **declarativo**: dices *qué* quieres, no *cómo* buscarlo; el motor decide la mejor forma. Tiene partes para consultar (`SELECT`), modificar datos (DML: `INSERT`, `UPDATE`, `DELETE`, `MERGE`) y definir estructuras (DDL: `CREATE`, `ALTER`, `DROP`).
ejemplo:
```sql
SELECT nombre, apellido
FROM clientes
WHERE ciudad = 'Lima'
ORDER BY apellido;
```
para: Es la herramienta número uno de un data engineer: se usa en PostgreSQL, BigQuery, Snowflake, Databricks, Athena, DuckDB, dbt y Spark SQL.
cuidado: Cada motor tiene su **dialecto** (pequeñas diferencias en funciones de fechas, tipos, `LIMIT` vs `TOP`). Lo esencial es igual en todos.
ver: SELECT, Base de datos, DDL, DML

## SELECT
alias: consulta
nino: `SELECT` es la palabra mágica para **pedir ver cosas**. Como cuando le dices a alguien "muéstrame las fotos de las vacaciones": no cambias nada, solo miras.
que: La sentencia que **lee** datos. Su forma completa, en el orden en que se escribe: `SELECT columnas FROM tabla WHERE filtro GROUP BY grupos HAVING filtro_de_grupos ORDER BY orden LIMIT n`. El motor la ejecuta en otro orden: primero `FROM` y los `JOIN`, después `WHERE`, `GROUP BY`, `HAVING`, `SELECT`, `ORDER BY` y `LIMIT`.
ejemplo:
```sql
SELECT canal, COUNT(*) AS pedidos
FROM pedidos
WHERE fecha_pedido >= '2024-01-01'
GROUP BY canal
ORDER BY pedidos DESC;
```
para: Toda pregunta a los datos empieza con un `SELECT`.
cuidado: `SELECT *` (todas las columnas) está bien para explorar, pero no en código de producción: lee de más (cuesta más en BigQuery) y se rompe si cambian las columnas.
ver: WHERE, GROUP BY, ORDER BY

## WHERE
alias: filtro
nino: `WHERE` es el **colador**: de todas las filas, deja pasar solo las que cumplen lo que pides. "Las pelotas que sean rojas" → solo pasan las rojas.
que: La cláusula que **filtra filas** antes de agrupar. Usa comparaciones (`=`, `<>`, `>`, `<=`), `AND`, `OR`, `NOT`, `IN (…)`, `BETWEEN`, `LIKE` (patrones de texto) e `IS NULL`.
ejemplo:
```sql
SELECT * FROM pedidos
WHERE estado = 'entregado'
  AND fecha_pedido BETWEEN '2024-12-01' AND '2024-12-31'
  AND canal IN ('app', 'web');
```
para: Quedarte solo con los datos que importan para la pregunta.
cuidado: `WHERE columna = NULL` nunca es verdadero: se escribe `IS NULL`. Y no se pueden usar agregados (`COUNT`, `SUM`) en el `WHERE`: eso va en `HAVING`.
ver: HAVING, NULL, SELECT

## ORDER BY
alias: ordenar
nino: Es **ordenar las figuritas**: por número, de la más chica a la más grande, o al revés.
que: Ordena el resultado por una o más columnas, `ASC` (ascendente, por defecto) o `DESC`. Con `LIMIT n` (o `TOP n` en SQL Server, `FETCH FIRST n ROWS`) se queda con las primeras n filas.
ejemplo:
```sql
SELECT nombre, precio FROM productos
ORDER BY precio DESC, nombre    -- desempata por nombre
LIMIT 5;
```
para: Rankings, "los 10 clientes que más compran", mostrar resultados de forma legible.
cuidado: Sin `ORDER BY`, la base **no garantiza ningún orden**, aunque hoy parezca que sí. Y si hay empates, agrega una columna de desempate para que el resultado sea siempre el mismo.
ver: SELECT, Window function

## NULL
alias: nulo, valor nulo
nino: `NULL` es una **casilla vacía porque no sabemos qué va**. No es cero ni es un espacio en blanco: es "no sé". Si te pregunto cuántos años tiene alguien que no conoces, la respuesta es "no sé", no "cero años".
que: El valor que representa **ausencia o desconocimiento**. Cualquier comparación con `NULL` da `NULL` (ni verdadero ni falso): `NULL = NULL` no es verdadero. Por eso se usa `IS NULL` / `IS NOT NULL`. Las funciones de agregación (`SUM`, `AVG`, `COUNT(columna)`) ignoran los `NULL`; `COUNT(*)` los cuenta.
ejemplo:
```sql
SELECT COUNT(*) AS todos, COUNT(fecha_entrega) AS entregados
FROM envios;    -- los que no tienen fecha de entrega (NULL) no cuentan en el segundo
```
para: Representar honestamente lo que falta: un pedido todavía no entregado no tiene fecha de entrega.
cuidado: `WHERE ciudad <> 'Lima'` **no** devuelve las filas con ciudad `NULL`. Y `AVG` de una columna con nulos promedia solo los conocidos. Usa `COALESCE` cuando necesites un valor por defecto.
ver: COALESCE, WHERE, Agregación

## Alias
alias: AS
nino: Un alias es un **apodo**: en vez de decir "Alejandro Sebastián", le dices "Ale". En SQL, le pones un nombre corto o más claro a una columna o a una tabla.
que: Un nombre alternativo con `AS` para una columna del resultado (`COUNT(*) AS pedidos`) o para una tabla dentro de la consulta (`FROM pedidos AS p` o `FROM pedidos p`). Los alias de tabla son indispensables cuando se une la misma tabla dos veces o hay columnas con el mismo nombre.
ejemplo:
```sql
SELECT p.pedido_id, c.nombre AS cliente
FROM pedidos p
JOIN clientes c ON c.cliente_id = p.cliente_id;
```
para: Resultados con nombres claros y consultas más cortas y legibles.
cuidado: En la mayoría de los motores no puedes usar en el `WHERE` un alias de columna definido en el `SELECT` (porque el `WHERE` se ejecuta antes).
ver: SELECT, JOIN

## Agregación
alias: funciones de agregación, agregar
nino: Agregar es **resumir un montón de cosas en un solo número**. Tienes una bolsa con 50 caramelos: "¿cuántos hay?" (contar), "¿cuánto pesan en total?" (sumar), "¿cuál es el más grande?" (máximo).
que: Funciones que convierten muchas filas en un valor: `COUNT` (cuenta), `SUM` (suma), `AVG` (promedio), `MIN`, `MAX`, y otras como `COUNT(DISTINCT …)` o `STRING_AGG`. Se usan solas (un número para toda la tabla) o con `GROUP BY` (un número por grupo).
ejemplo:
```sql
SELECT COUNT(*) AS pedidos, SUM(total) AS ventas, AVG(total) AS ticket_promedio
FROM pedidos WHERE estado <> 'cancelado';
```
para: Los KPI del negocio son casi siempre agregaciones: ventas, clientes activos, tiempo promedio.
cuidado: El "promedio de promedios" casi siempre está mal: promediar el ticket de cada día da el mismo peso a un día con 10 pedidos que a uno con 500. Divide sumas: `SUM(total) / COUNT(*)`.
ver: GROUP BY, HAVING, Medidas aditivas

## GROUP BY
alias: agrupar
nino: Es **separar los caramelos por color en montoncitos** y después contar cada montoncito: "hay 10 rojos, 7 verdes, 3 azules".
que: Agrupa las filas que tienen los mismos valores en las columnas indicadas y calcula las agregaciones **por cada grupo**. Toda columna del `SELECT` que no esté dentro de una agregación tiene que estar en el `GROUP BY`. El resultado tiene una fila por grupo: ese es su **grano**.
ejemplo:
```sql
SELECT ciudad, canal, COUNT(*) AS pedidos
FROM pedidos
GROUP BY ciudad, canal;    -- una fila por cada combinación ciudad + canal
```
para: Responder "¿cuánto por…?": ventas por mes, clientes por país, pedidos por canal.
ver: Agregación, HAVING, Granularidad

## HAVING
alias: filtrar grupos
nino: Primero hiciste los montoncitos de caramelos por color. `HAVING` es decir: "**ahora quédate solo con los montoncitos que tienen más de 5**".
que: Filtra **grupos** después del `GROUP BY`, usando agregaciones. `WHERE` filtra filas antes de agrupar; `HAVING` filtra los resultados ya agrupados.
ejemplo:
```sql
SELECT cliente_id, COUNT(*) AS pedidos
FROM pedidos
GROUP BY cliente_id
HAVING COUNT(*) >= 10;   -- clientes con 10 pedidos o más
```
para: "Productos con más de 100 ventas", "días con más del 1 % de registros inválidos".
ver: WHERE, GROUP BY

## DISTINCT
alias: valores únicos, sin repetidos
nino: Si tienes una caja con figuritas repetidas, `DISTINCT` es **quedarte con una de cada una**, sin repetidas.
que: Elimina las filas duplicadas del resultado (`SELECT DISTINCT ciudad FROM clientes`) o cuenta valores únicos (`COUNT(DISTINCT cliente_id)`).
ejemplo:
```sql
SELECT COUNT(*) AS pedidos, COUNT(DISTINCT cliente_id) AS clientes_distintos
FROM pedidos WHERE fecha_pedido >= '2024-12-01';
```
para: Contar clientes activos, ver qué valores tiene una columna.
cuidado: Usar `DISTINCT` para "arreglar" duplicados que aparecen después de un `JOIN` suele esconder un error de lógica (fan-out). Entiende primero por qué se duplican.
ver: Fan-out, Agregación

## CASE WHEN
alias: CASE, condicional
nino: Es un **"si pasa esto, pon esto; si no, pon esto otro"**. Como cuando clasificas notas: si sacó más de 7, "aprobado"; si no, "a recuperar".
que: La expresión condicional de SQL. Evalúa condiciones en orden y devuelve el valor de la primera que se cumple; si ninguna se cumple, el `ELSE` (o `NULL` si no hay `ELSE`). Se usa en `SELECT`, `WHERE`, `ORDER BY` y dentro de agregaciones.
ejemplo:
```sql
SELECT pedido_id,
       CASE WHEN total >= 500 THEN 'grande'
            WHEN total >= 100 THEN 'mediano'
            ELSE 'chico' END AS tamano,
       SUM(CASE WHEN estado = 'cancelado' THEN 1 ELSE 0 END) OVER () AS cancelados_total
FROM pedidos;
```
para: Crear categorías, contar con condiciones (`SUM(CASE WHEN … THEN 1 ELSE 0 END)`) y hacer tablas tipo pivot.
ver: Pivot, Agregación, COALESCE

## COALESCE
alias: valor por defecto
nino: `COALESCE` es como decir: "**si no hay chocolate, dame vainilla; si tampoco, dame frutilla**". Devuelve el primero que exista.
que: Devuelve el primer argumento que no es `NULL`. Sirve para reemplazar nulos por un valor por defecto o elegir entre varias columnas.
ejemplo:
```sql
SELECT cliente_id, COALESCE(telefono_movil, telefono_fijo, 'sin teléfono') AS contacto,
       COALESCE(SUM(p.total), 0) AS ventas    -- clientes sin pedidos: 0 en lugar de NULL
FROM clientes c LEFT JOIN pedidos p USING (cliente_id)
GROUP BY cliente_id, telefono_movil, telefono_fijo;
```
para: Evitar nulos en reportes y que los cálculos no den `NULL`.
ver: NULL, LEFT JOIN

## JOIN
alias: unir tablas, join
nino: Tienes una lista con **nombres de alumnos y su número**, y otra lista con **números y notas**. JOIN es **pegar las dos listas** usando el número para saber qué nota es de quién.
que: Combina filas de dos tablas según una condición, normalmente que una clave coincida (`ON a.id = b.id`). Tipos: `INNER JOIN` (solo las que coinciden), `LEFT JOIN` (todas las de la izquierda), `RIGHT JOIN`, `FULL OUTER JOIN` (todas de ambos lados) y `CROSS JOIN` (todas las combinaciones).
ejemplo:
```sql
SELECT p.pedido_id, c.nombre, c.ciudad
FROM pedidos p
JOIN clientes c ON c.cliente_id = p.cliente_id;
```
para: Los datos están repartidos en tablas (normalizados); para responder casi cualquier pregunta hay que unirlas.
cuidado: Antes de unir, piensa la **cardinalidad**: si un pedido tiene 3 líneas de detalle, unir pedidos con detalle repite el pedido 3 veces (y su total se suma 3 veces).
ver: LEFT JOIN, Fan-out, Clave foránea, Anti-join

## LEFT JOIN
alias: left outer join
nino: Tienes la lista de **todos los alumnos** y la lista de **quiénes trajeron la autorización**. LEFT JOIN muestra a todos los alumnos; al lado, la autorización si la trajo, y un espacio vacío si no.
que: Devuelve **todas las filas de la tabla de la izquierda** y, cuando hay coincidencia, las columnas de la derecha; si no hay, esas columnas quedan en `NULL`.
ejemplo:
```sql
SELECT c.cliente_id, c.nombre, COUNT(p.pedido_id) AS pedidos
FROM clientes c
LEFT JOIN pedidos p ON p.cliente_id = c.cliente_id
GROUP BY c.cliente_id, c.nombre;   -- incluye clientes con 0 pedidos
```
para: No perder registros: clientes sin compras, productos sin ventas, días sin pedidos.
cuidado: Un filtro sobre la tabla derecha en el `WHERE` (`WHERE p.estado = 'entregado'`) convierte el LEFT JOIN en un INNER JOIN (las filas con `NULL` se descartan). Pon ese filtro en el `ON`.
ver: JOIN, Anti-join, NULL

## Anti-join
alias: anti join, los que no tienen
nino: Es buscar **a los que no están en la otra lista**: los alumnos que **no** trajeron la autorización.
que: Encontrar las filas de una tabla que **no tienen** coincidencia en otra. Se escribe con `NOT EXISTS (…)`, con `LEFT JOIN … WHERE derecha.clave IS NULL`, o en Spark con `join(…, how='left_anti')`.
ejemplo:
```sql
SELECT c.cliente_id, c.nombre
FROM clientes c
WHERE NOT EXISTS (SELECT 1 FROM pedidos p WHERE p.cliente_id = c.cliente_id);
```
para: Clientes que nunca compraron, productos sin stock registrado, registros de la fuente que no llegaron al destino (controles de calidad).
cuidado: `NOT IN (subconsulta)` falla en silencio si la subconsulta devuelve algún `NULL` (el resultado queda vacío). Prefiere `NOT EXISTS`.
ver: LEFT JOIN, EXISTS

## Fan-out
alias: duplicación por join, explosión de filas
nino: Tienes **una torta** y la anotas en la lista de cada uno de los **3 invitados** que comieron. Si después sumas las tortas de la lista, te dan 3 tortas, ¡pero había una sola!
que: El error de unir una tabla con otra que tiene **varias filas por cada fila** de la primera, y después sumar columnas de la primera: los valores se repiten y se suman varias veces. Es el error más común (y silencioso) en SQL analítico.
ejemplo:
```sql
-- MAL: cada póliza con 3 siniestros suma su prima 3 veces
SELECT SUM(p.prima) FROM polizas p JOIN siniestros s USING (poliza_id);
-- BIEN: agregar cada tabla a su grano y unir después
WITH pr AS (SELECT ramo, SUM(prima) AS primas FROM polizas GROUP BY ramo),
     si AS (SELECT p.ramo, SUM(s.pagado) AS pagado FROM siniestros s JOIN polizas p USING (poliza_id) GROUP BY p.ramo)
SELECT pr.ramo, pr.primas, si.pagado FROM pr LEFT JOIN si USING (ramo);
```
para: Saber detectarlo evita reportes con números inflados.
cuidado: Comprueba siempre: ¿el total de mi consulta coincide con un `SUM` directo sobre la tabla original?
ver: JOIN, Granularidad, CTE

## Subconsulta
alias: subquery
nino: Es una **pregunta dentro de otra pregunta**. "¿Quiénes sacaron más nota que el promedio?" Primero hay que saber cuál es el promedio (pregunta de adentro) y después comparar (pregunta de afuera).
que: Un `SELECT` dentro de otra consulta: en el `WHERE` (`WHERE total > (SELECT AVG(total) FROM pedidos)`), en el `FROM` (como tabla derivada) o en el `SELECT` (escalar). Puede ser **correlacionada**: se refiere a la fila de la consulta exterior y se evalúa por cada una.
ejemplo:
```sql
SELECT pedido_id, total
FROM pedidos
WHERE total > (SELECT AVG(total) FROM pedidos);
```
para: Comparar contra un valor calculado o filtrar por la existencia de algo en otra tabla.
cuidado: Las subconsultas anidadas varias veces se vuelven ilegibles: usa CTE.
ver: CTE, EXISTS

## EXISTS
alias: NOT EXISTS
nino: Es preguntar "**¿hay al menos uno?**". ¿Este cliente tiene al menos un pedido? Sí o no. No importa cuántos.
que: Devuelve verdadero si la subconsulta devuelve al menos una fila. Es eficiente porque deja de buscar al encontrar la primera. `NOT EXISTS` es la forma recomendada del anti-join.
ejemplo:
```sql
SELECT c.* FROM clientes c
WHERE EXISTS (SELECT 1 FROM pedidos p
              WHERE p.cliente_id = c.cliente_id AND p.fecha_pedido >= '2024-12-01');
```
para: "Clientes que compraron este mes", "líneas que tuvieron algún reclamo".
ver: Anti-join, Subconsulta

## CTE
alias: WITH, common table expression
nino: Una CTE es como **hacer la tarea en borradores con nombre**: "borrador 1: los pedidos de diciembre", "borrador 2: el total por cliente usando el borrador 1", y al final copias el resultado en limpio.
que: *Common Table Expression*: una consulta con nombre definida con `WITH nombre AS (…)` al principio, que se usa como una tabla en el resto. Permite escribir consultas complejas **paso a paso**, de forma legible y fácil de probar.
ejemplo:
```sql
WITH diciembre AS (
  SELECT * FROM pedidos WHERE fecha_pedido >= '2024-12-01'
),
por_cliente AS (
  SELECT cliente_id, SUM(total) AS gastado FROM diciembre GROUP BY cliente_id
)
SELECT * FROM por_cliente ORDER BY gastado DESC LIMIT 10;
```
para: Es el estilo estándar en dbt y en cualquier SQL profesional: cada CTE hace una cosa.
ver: Subconsulta, CTE recursiva

## CTE recursiva
alias: WITH RECURSIVE, recursividad
nino: Es como un **árbol genealógico**: empiezas por el abuelo, buscas a sus hijos, después a los hijos de los hijos, y sigues hasta que no hay más.
que: Una CTE que se llama a sí misma: una parte inicial (el "ancla") y una parte recursiva unidas con `UNION ALL`, que se repite hasta que no agrega filas nuevas. Sirve para jerarquías (empleado → jefe, categoría → subcategoría) y para generar series (fechas, números).
ejemplo:
```sql
WITH RECURSIVE dias(d) AS (
  SELECT DATE '2024-12-01'
  UNION ALL
  SELECT d + INTERVAL '1 day' FROM dias WHERE d < DATE '2024-12-31'
)
SELECT d FROM dias;   -- los 31 días de diciembre
```
para: Recorrer organigramas, categorías anidadas y completar fechas faltantes en un reporte.
cuidado: Sin una condición de corte, no termina. Pon siempre un límite.
ver: CTE

## UNION
alias: UNION ALL
nino: Es **juntar dos listas una debajo de la otra**: la lista de alumnos de 3.º A y la de 3.º B, en una sola lista.
que: Apila los resultados de dos consultas con las mismas columnas. `UNION ALL` deja todas las filas (rápido); `UNION` elimina duplicados (más lento). También existen `INTERSECT` (las que están en ambas) y `EXCEPT` (las de la primera que no están en la segunda).
ejemplo:
```sql
SELECT cliente_id, 'web' AS origen FROM pedidos_web
UNION ALL
SELECT cliente_id, 'tienda' AS origen FROM pedidos_tienda;
```
para: Combinar datos de varias fuentes o períodos con la misma estructura.
cuidado: Usa `UNION ALL` salvo que realmente necesites quitar duplicados: `UNION` puede ocultar filas legítimamente repetidas.
ver: JOIN

## Window function
alias: función de ventana, ventanas, OVER
nino: Imagina que estás en una **fila para el cine** y quieres saber qué número eres, o cuántas personas hay delante de ti, **sin que nadie salga de la fila**. Las funciones de ventana miran a los vecinos de cada fila pero no las juntan en una.
que: Funciones que calculan algo **sobre un grupo de filas relacionadas con la fila actual** sin colapsarlas (a diferencia de `GROUP BY`). Se escriben con `OVER (PARTITION BY … ORDER BY … ROWS BETWEEN …)`. Incluyen rankings (`ROW_NUMBER`, `RANK`, `DENSE_RANK`, `NTILE`), desplazamientos (`LAG`, `LEAD`) y agregaciones móviles (`SUM(…) OVER`).
ejemplo:
```sql
SELECT fecha, ventas,
       SUM(ventas) OVER (ORDER BY fecha) AS acumulado,
       AVG(ventas) OVER (ORDER BY fecha ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS media_7_dias
FROM ventas_diarias;
```
para: Rankings por grupo, acumulados, promedios móviles, comparar con el período anterior, deduplicar.
ver: PARTITION BY, ROW_NUMBER, LAG / LEAD

## PARTITION BY
alias: partición de ventana
nino: Es decir "**cuenta los puestos por separado en cada fila del cine**": la fila 1 tiene su primero, su segundo…; la fila 2 tiene los suyos.
que: Dentro de `OVER(…)`, divide las filas en grupos independientes para la función de ventana. Es como un `GROUP BY` que no colapsa filas.
ejemplo:
```sql
SELECT cliente_id, pedido_id, fecha_pedido,
       ROW_NUMBER() OVER (PARTITION BY cliente_id ORDER BY fecha_pedido) AS numero_de_compra
FROM pedidos;   -- 1 = primera compra de cada cliente
```
para: Calcular rankings y comparaciones dentro de cada cliente, producto o ciudad.
cuidado: No confundir con el **particionamiento de tablas** (carpetas por fecha en un lago): son conceptos distintos con el mismo nombre.
ver: Window function, ROW_NUMBER, Partición

## ROW_NUMBER
alias: numerar filas
nino: Es **ponerle un número a cada uno en la fila**: 1, 2, 3… sin repetir, aunque dos personas sean igual de altas.
que: Función de ventana que numera las filas 1, 2, 3… dentro de cada partición según el `ORDER BY`. Nunca repite números (en un empate, el orden lo decide el desempate o el azar). Es la herramienta clásica para **quedarse con una fila por grupo** (la última, la primera) y para deduplicar.
ejemplo:
```sql
WITH r AS (
  SELECT *, ROW_NUMBER() OVER (PARTITION BY cliente_id ORDER BY actualizado_en DESC) AS n
  FROM clientes_crudo
)
SELECT * FROM r WHERE n = 1;   -- la versión más reciente de cada cliente
```
para: Deduplicar, "el último estado de cada pedido", "el primer pedido de cada cliente".
ver: DENSE_RANK, QUALIFY, Window function

## DENSE_RANK
alias: RANK, ranking
nino: Es la **tabla de posiciones de un torneo**: si dos empatan en el primer puesto, los dos son "1.º" y el siguiente es "2.º" (con `DENSE_RANK`) o "3.º" (con `RANK`, que salta).
que: Funciones de ranking que dan **el mismo número a los empates**. `RANK` deja huecos (1, 1, 3); `DENSE_RANK` no (1, 1, 2). `ROW_NUMBER` nunca empata.
ejemplo:
```sql
SELECT producto, ventas,
       RANK()       OVER (ORDER BY ventas DESC) AS rank,
       DENSE_RANK() OVER (ORDER BY ventas DESC) AS dense_rank
FROM ventas_por_producto;
```
para: "Top 3 productos por categoría" incluyendo empates.
ver: ROW_NUMBER, NTILE

## NTILE
alias: cuartiles, deciles
nino: Es **repartir a los alumnos en 4 equipos del mismo tamaño**, del más alto al más bajo: el equipo 1 tiene a los más altos, el equipo 4 a los más bajos.
que: Función de ventana que reparte las filas ordenadas en *n* grupos de tamaño (casi) igual y devuelve el número de grupo. `NTILE(4)` da cuartiles, `NTILE(10)` deciles.
ejemplo:
```sql
SELECT cliente_id, gastado, NTILE(5) OVER (ORDER BY gastado DESC) AS quintil
FROM gasto_por_cliente;   -- quintil 1 = el 20 % que más gasta
```
para: Segmentar clientes (RFM), encontrar el 10 % superior, análisis de Pareto.
ver: DENSE_RANK, Window function

## LAG / LEAD
alias: LAG, LEAD, fila anterior, fila siguiente
nino: `LAG` es **mirar al que está atrás tuyo en la fila** y `LEAD`, **al que está adelante**. Sirve para comparar: "¿yo soy más alto que el de atrás?".
que: Funciones de ventana que traen el valor de la fila **anterior** (`LAG`) o **siguiente** (`LEAD`) dentro de la partición y el orden indicados, con un desplazamiento opcional y un valor por defecto.
ejemplo:
```sql
SELECT mes, ventas,
       LAG(ventas) OVER (ORDER BY mes) AS mes_anterior,
       ventas - LAG(ventas) OVER (ORDER BY mes) AS variacion
FROM ventas_mensuales;
```
para: Variación contra el período anterior, días entre una compra y la siguiente, detectar cambios de estado.
ver: Window function, Gaps & islands

## QUALIFY
alias: filtrar ventanas
nino: Es como el `HAVING`, pero para las funciones de ventana: "**de cada fila del cine, quédate solo con el primero**".
que: Cláusula (de Snowflake, BigQuery, Databricks y DuckDB) que filtra por el resultado de una función de ventana sin necesitar un CTE. En motores sin `QUALIFY` (PostgreSQL, SQLite), se usa un CTE y un `WHERE`.
ejemplo:
```sql
SELECT * FROM clientes_crudo
QUALIFY ROW_NUMBER() OVER (PARTITION BY cliente_id ORDER BY actualizado_en DESC) = 1;
```
para: Deduplicar en una sola consulta corta.
ver: ROW_NUMBER, CTE

## Gaps & islands
alias: gaps and islands, rachas, islas
nino: Imagina un **calendario donde marcas los días que fuiste a la pileta**. Las "islas" son las rachas de días seguidos que fuiste; los "huecos", los días que faltaste. El problema es encontrar cada racha y cuánto duró.
que: Un patrón clásico de SQL para agrupar filas **consecutivas** (fechas seguidas, estados repetidos). El truco: restar a cada fecha su `ROW_NUMBER()`; dentro de una racha, esa diferencia es constante y sirve de identificador de grupo.
ejemplo:
```sql
WITH d AS (
  SELECT cliente_id, fecha,
         fecha - ROW_NUMBER() OVER (PARTITION BY cliente_id ORDER BY fecha) * INTERVAL '1 day' AS grupo
  FROM logins
)
SELECT cliente_id, MIN(fecha) AS inicio, MAX(fecha) AS fin, COUNT(*) AS dias_seguidos
FROM d GROUP BY cliente_id, grupo;
```
para: Rachas de uso de una app, períodos continuos de un estado, sesiones, caídas de un servicio.
ver: ROW_NUMBER, LAG / LEAD, Sesionización

## Pivot
alias: pivotear, tabla dinámica
nino: Es **dar vuelta una tabla**: en vez de una lista larga "mes, canal, ventas", haces una tabla donde cada canal es una columna, como las tablas dinámicas de Excel.
que: Transformar valores de filas en columnas. Se hace con agregaciones condicionales (`SUM(CASE WHEN canal = 'app' THEN total END) AS app`) o con `PIVOT` en los motores que lo tienen. La operación inversa es *unpivot*.
ejemplo:
```sql
SELECT strftime('%Y-%m', fecha_pedido) AS mes,
       SUM(CASE WHEN canal = 'app' THEN 1 ELSE 0 END) AS app,
       SUM(CASE WHEN canal = 'web' THEN 1 ELSE 0 END) AS web
FROM pedidos GROUP BY 1;
```
para: Reportes para personas (es más fácil leer meses en filas y canales en columnas).
cuidado: Para guardar datos en un warehouse, es mejor el formato largo (filas): si aparece un canal nuevo, no hay que agregar columnas.
ver: CASE WHEN, Agregación

## Vista
alias: view
nino: Una vista es una **ventana con un nombre**: no guarda nada, pero cada vez que miras por ella ves los datos de siempre filtrados de una forma especial.
que: Una consulta guardada con nombre (`CREATE VIEW v AS SELECT …`) que se usa como una tabla. No almacena datos: se ejecuta cada vez que se consulta. Una **vista materializada** sí guarda el resultado y se refresca cada tanto.
ejemplo:
```sql
CREATE VIEW pedidos_validos AS
SELECT * FROM pedidos WHERE estado <> 'cancelado' AND total > 0;
```
para: Reutilizar lógica, ocultar columnas sensibles, dar una capa simple sobre tablas complejas. En dbt, `materialized='view'`.
ver: Materialización, Tabla

## Índice
alias: index
nino: Es el **índice de un libro**: en vez de leer las 500 páginas para encontrar "dinosaurios", miras el índice y vas directo a la página 230.
que: Una estructura extra que una base de datos mantiene sobre una o más columnas para **encontrar filas rápido** sin recorrer toda la tabla (normalmente un árbol B). Acelera los `WHERE` y `JOIN` sobre esas columnas, pero ocupa espacio y hace un poco más lentas las escrituras.
ejemplo:
```sql
CREATE INDEX idx_pedidos_cliente ON pedidos (cliente_id);
-- ahora "WHERE cliente_id = 77" no recorre millones de filas
```
para: Que las aplicaciones (OLTP) respondan en milisegundos.
cuidado: Los warehouses columnares (BigQuery, Snowflake) casi no usan índices: optimizan con particiones, clustering y estadísticas por bloque.
ver: Clave primaria, Plan de ejecución, Partition pruning

## Clave primaria
alias: primary key, PK
nino: Es el **número de documento** de cada fila: no hay dos iguales y nunca está vacío. Si dos alumnos se llaman Juan Pérez, el número de documento los distingue.
que: La columna (o combinación de columnas) que **identifica de forma única** cada fila de una tabla. No puede repetirse ni ser `NULL`. Las otras tablas la usan para referirse a esa fila (claves foráneas).
ejemplo: `pedido_id` en `pedidos`; en `detalle_pedidos`, la clave puede ser `detalle_id` o la combinación `(pedido_id, linea)`.
para: Evitar duplicados, unir tablas con seguridad y hacer `MERGE`/upserts.
cuidado: Muchos warehouses (BigQuery, Snowflake, Databricks) aceptan declarar claves primarias pero **no las hacen cumplir**: los duplicados se detectan con pruebas (`unique` en dbt).
ver: Clave foránea, Clave subrogada, Índice

## Clave foránea
alias: foreign key, FK
nino: En la lista de pedidos, en vez de escribir todos los datos del cliente, anotas **su número de documento**. Ese número "apunta" a la ficha del cliente en la otra lista.
que: Una columna que guarda la clave primaria de **otra tabla**, creando la relación entre las dos (`pedidos.cliente_id` → `clientes.cliente_id`). Con la restricción `FOREIGN KEY`, la base impide guardar un pedido de un cliente que no existe.
ejemplo:
```sql
CREATE TABLE pedidos (
  pedido_id  INTEGER PRIMARY KEY,
  cliente_id INTEGER REFERENCES clientes(cliente_id)
);
```
para: Unir tablas con `JOIN` y mantener la integridad de los datos.
cuidado: En un lago o warehouse suelen no existir las restricciones: un pedido puede apuntar a un cliente que no está (dato "huérfano"). Se controla con pruebas de `relationships`.
ver: Clave primaria, JOIN

## DDL
alias: data definition language, CREATE, ALTER, DROP
nino: DDL son las órdenes para **construir y modificar los muebles** donde van los datos: crear un cajón nuevo, agregarle un compartimento, tirar un cajón viejo.
que: *Data Definition Language*: las sentencias que definen estructuras: `CREATE TABLE/VIEW/SCHEMA`, `ALTER TABLE` (agregar o cambiar columnas), `DROP` (borrar), `TRUNCATE` (vaciar).
ejemplo:
```sql
CREATE TABLE IF NOT EXISTS ventas_diarias (fecha DATE, ciudad TEXT, total DECIMAL(12,2));
ALTER TABLE ventas_diarias ADD COLUMN pedidos INTEGER;
```
para: Crear y evolucionar las tablas de un warehouse (en dbt, el DDL lo genera la herramienta).
cuidado: `DROP TABLE` en producción no tiene vuelta atrás (salvo time travel o backups).
ver: DML, Schema

## DML
alias: data manipulation language, INSERT, UPDATE, DELETE
nino: DML son las órdenes para **poner, cambiar o sacar cosas de los cajones**: meter una figurita nueva, cambiar una de lugar, tirar una rota.
que: *Data Manipulation Language*: las sentencias que modifican los datos: `INSERT` (agregar filas), `UPDATE` (cambiar valores), `DELETE` (borrar filas) y `MERGE` (insertar o actualizar según exista).
ejemplo:
```sql
UPDATE pedidos SET estado = 'entregado' WHERE pedido_id = 1042;
DELETE FROM pedidos WHERE estado = 'prueba';
```
para: Cargar y mantener los datos.
cuidado: Un `UPDATE` o `DELETE` sin `WHERE` afecta **todas** las filas. Prueba primero el `WHERE` con un `SELECT`.
ver: DDL, MERGE, Transacción

## Transacción
alias: transaction, BEGIN, COMMIT, ROLLBACK
nino: Una transferencia de dinero son dos pasos: **sacar de una cuenta y poner en la otra**. Una transacción asegura que pasen **los dos o ninguno**: nunca desaparece la plata a mitad de camino.
que: Un grupo de operaciones que se ejecuta como una unidad: `BEGIN`, las operaciones, y `COMMIT` (confirmar todo) o `ROLLBACK` (deshacer todo). Si algo falla en el medio, la base vuelve al estado anterior.
ejemplo:
```sql
BEGIN;
UPDATE cuentas SET saldo = saldo - 100 WHERE cuenta_id = 1;
UPDATE cuentas SET saldo = saldo + 100 WHERE cuenta_id = 2;
COMMIT;
```
para: Que los datos nunca queden a medias.
ver: ACID, DML

## ACID
alias: atomicidad, consistencia, aislamiento, durabilidad
nino: Son las **cuatro promesas** de una base de datos seria: (A) todo o nada, (C) las reglas siempre se cumplen, (I) lo que hace otro al mismo tiempo no te mezcla los datos, (D) lo que se guardó no se pierde aunque se corte la luz.
que: Las propiedades de una transacción confiable: **Atomicidad** (todo o nada), **Consistencia** (respeta las restricciones), **Aislamiento** (*Isolation*: transacciones simultáneas no se interfieren) y **Durabilidad** (lo confirmado sobrevive a fallos). Las bases OLTP las tienen; los lagos de archivos no, y por eso nacieron Delta Lake, Iceberg y Hudi.
ejemplo: Dos jobs escriben a la vez en una tabla Delta: gracias a ACID, un lector ve la versión anterior completa o la nueva completa, nunca archivos a medio escribir.
para: Poder confiar en los datos aunque haya fallos y procesos simultáneos.
ver: Transacción, Delta Lake, Formato de tabla abierto

## MERGE
alias: MERGE INTO
nino: Tienes una **libreta de contactos** y te llega una lista nueva. MERGE revisa uno por uno: si el contacto ya estaba, le actualiza el teléfono; si no estaba, lo agrega.
que: Sentencia que, comparando una tabla destino con un origen por una clave, **actualiza** las filas que coinciden, **inserta** las nuevas y opcionalmente **borra** las que ya no están, todo en una operación.
ejemplo:
```sql
MERGE INTO dim_cliente d
USING stg_clientes s ON d.cliente_id = s.cliente_id
WHEN MATCHED THEN UPDATE SET email = s.email, ciudad = s.ciudad
WHEN NOT MATCHED THEN INSERT (cliente_id, email, ciudad) VALUES (s.cliente_id, s.email, s.ciudad);
```
para: Cargas incrementales e idempotentes, CDC, dimensiones que cambian.
cuidado: Si el origen trae **dos filas con la misma clave**, MERGE falla o da resultados impredecibles: deduplica antes.
ver: UPSERT, Idempotencia, CDC, Incremental

## UPSERT
alias: insert or update
nino: Es la palabra combinada de **"update" e "insert"**: actualizar si existe, insertar si no existe.
que: La operación "insertar o actualizar" por clave. Se implementa con `MERGE`, con `INSERT … ON CONFLICT (clave) DO UPDATE` (PostgreSQL, SQLite) o con la estrategia `merge` de los modelos incrementales de dbt.
ejemplo:
```sql
INSERT INTO precios (producto_id, precio) VALUES (10, 99.90)
ON CONFLICT (producto_id) DO UPDATE SET precio = excluded.precio;
```
para: Mantener una tabla al día con lo último de cada clave.
ver: MERGE

## Plan de ejecución
alias: EXPLAIN, query plan
nino: Antes de un viaje, el GPS **te muestra el camino que va a tomar**. El plan de ejecución es el camino que la base de datos decidió seguir para responder tu consulta.
que: La estrategia que el optimizador elige para ejecutar una consulta: qué tablas lee primero, si usa índices, qué tipo de join hace, dónde filtra. Se ve con `EXPLAIN` (o `EXPLAIN ANALYZE` con los tiempos reales); en Spark, con `df.explain()` o la Spark UI.
ejemplo: `EXPLAIN SELECT * FROM pedidos WHERE cliente_id = 77` muestra `Index Scan using idx_pedidos_cliente` (rápido) o `Seq Scan on pedidos` (recorre toda la tabla).
para: Entender por qué una consulta es lenta y cómo arreglarla.
ver: Índice, Catalyst, Predicate pushdown
