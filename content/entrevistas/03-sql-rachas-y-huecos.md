---
titulo: SQL de entrevista 2 - rachas y huecos (gaps & islands)
nivel: Experto
duracion: 60
resumen: El patrón "gaps and islands" resuelve todas las preguntas de días seguidos - rachas de login, días consecutivos con ventas, huecos sin actividad, calendarios con días faltantes. Aprendes el truco de restar ROW_NUMBER a la fecha, el de LAG/LEAD para huecos, y cómo generar un calendario con una CTE recursiva para encontrar lo que no está.
objetivos: Explicar por qué fecha menos ROW_NUMBER es constante dentro de una racha | Listar islas (rachas) con inicio, fin y duración | Encontrar huecos entre eventos con LAG o LEAD | Generar un calendario con una CTE recursiva para detectar días faltantes
prerrequisitos: entrevistas-sql-top-n-y-empates | sql-ventanas-2 | sql-recursivas
autoevaluacion: ¿Puedes explicar el truco de la resta con una tabla de 5 filas? | ¿Qué cambia si un cliente tiene dos logins el mismo día? | ¿Cuándo usas LAG y cuándo la resta con ROW_NUMBER? | ¿Cómo encuentras días que no están en ninguna tabla?
---

:::analogia En palabras simples
Imagina un calendario donde marcas con una X cada día que fuiste al gimnasio. Las **islas** son los bloques de X seguidas (tus rachas) y los **huecos** son los blancos entre ellas. Las preguntas de entrevista sobre "días consecutivos" siempre piden una de esas dos cosas.
:::

## El truco: fecha menos número de fila

Numera los días de cada cliente en orden (`ROW_NUMBER`) y réstale ese número a la fecha. Dentro de una racha, la fecha sube de a 1 y el número de fila también, así que **la resta queda fija**. Cuando hay un salto, la fecha sube más que el número de fila y la resta cambia: empieza una isla nueva.

| fecha | ROW_NUMBER | fecha − ROW_NUMBER | isla |
|---|---|---|---|
| 2024-02-01 | 1 | 2024-01-31 | A |
| 2024-02-02 | 2 | 2024-01-31 | A |
| 2024-02-03 | 3 | 2024-01-31 | A |
| 2024-02-07 | 4 | 2024-02-03 | B |
| 2024-02-08 | 5 | 2024-02-03 | B |

Como las fechas están guardadas como texto, la resta se hace con `julianday(fecha)`, que devuelve un número de días. El valor del grupo no significa nada por sí mismo: solo sirve para agrupar.

```sql
WITH numerado AS (
  SELECT cliente_id, fecha,
         julianday(fecha) - ROW_NUMBER() OVER (PARTITION BY cliente_id ORDER BY fecha) AS grupo
  FROM logins
)
SELECT cliente_id, MIN(fecha) AS inicio, MAX(fecha) AS fin, COUNT(*) AS dias
FROM numerado
GROUP BY cliente_id, grupo
ORDER BY cliente_id, inicio;
```

:::cuidado Fechas repetidas rompen el truco
Si un cliente tiene **dos logins el mismo día**, `ROW_NUMBER` avanza dos veces mientras la fecha avanza una, y la racha se parte en dos. Primero deja una fila por día (`SELECT DISTINCT cliente_id, fecha`) o usa `DENSE_RANK` en lugar de `ROW_NUMBER`. En la tabla `logins` no hay repetidos, pero en una entrevista **dilo**: es exactamente el caso borde que esperan.
:::

## Huecos con LAG y LEAD

Para los huecos no hace falta agrupar: compara cada fila con la siguiente. `LEAD(fecha)` trae la fecha del próximo login; si la diferencia es mayor que 1, entre medio hay días sin actividad.

```sql
WITH l AS (
  SELECT cliente_id, fecha,
         LEAD(fecha) OVER (PARTITION BY cliente_id ORDER BY fecha) AS siguiente
  FROM logins
)
SELECT cliente_id,
       date(fecha, '+1 day')      AS desde,
       date(siguiente, '-1 day')  AS hasta,
       CAST(julianday(siguiente) - julianday(fecha) - 1 AS INTEGER) AS dias_sin_login
FROM l
WHERE siguiente IS NOT NULL AND julianday(siguiente) - julianday(fecha) > 1;
```

| Patrón | Herramienta | Ejemplo de pregunta |
|---|---|---|
| Islas (rachas) | `fecha - ROW_NUMBER()` + `GROUP BY` | "Racha más larga de login de cada usuario" |
| Huecos entre eventos | `LAG` / `LEAD` | "Clientes que estuvieron más de 30 días sin comprar" |
| Días que no existen en la tabla | Calendario recursivo + anti-join | "¿Qué días no hubo ventas?" |
| Sesiones | `LAG` + marca de inicio + suma acumulada | "Sesiones con 30 minutos de inactividad" (lección 4) |

## Lo que no está: el calendario

Una tabla de pedidos no tiene filas para los días **sin** pedidos, así que ningún `GROUP BY` los va a mostrar. Hay que generar todos los días y buscar los que faltan:

```sql
WITH RECURSIVE dias(fecha) AS (
  SELECT '2024-01-01'
  UNION ALL
  SELECT date(fecha, '+1 day') FROM dias WHERE fecha < '2024-01-31'
)
SELECT fecha
FROM dias
WHERE fecha NOT IN (SELECT fecha_pedido FROM pedidos WHERE canal = 'telefono');
```

:::nota En otros motores
DuckDB, PostgreSQL y BigQuery tienen funciones que generan series de fechas (`generate_series`, `GENERATE_DATE_ARRAY`); en los warehouses suele existir una tabla `dim_fecha`. La CTE recursiva funciona en todos y demuestra que entiendes el problema.
:::

:::practica sql Ver el truco funcionando fila por fila
1. Ejecuta: verás los logins del cliente 1 con su número de fila y el valor del grupo.
2. Fíjate cómo el grupo se mantiene igual mientras los días son seguidos y cambia después de cada hueco.
3. Agrega `GROUP BY grupo` con `MIN(fecha)`, `MAX(fecha)` y `COUNT(*)` para convertir las filas en rachas.

```sql
SELECT cliente_id, fecha,
       ROW_NUMBER() OVER (PARTITION BY cliente_id ORDER BY fecha) AS fila,
       julianday(fecha) - ROW_NUMBER() OVER (PARTITION BY cliente_id ORDER BY fecha) AS grupo
FROM logins
WHERE cliente_id = 1
ORDER BY fecha
LIMIT 30;
```

Reto: repite la consulta con `LAG(fecha)` y una columna `nueva_racha` que valga 1 cuando la diferencia con el día anterior no es 1. La suma acumulada de esa columna es otro número de isla: compáralo con el grupo.

Documentación oficial: [Funciones de ventana (SQLite)](https://www.sqlite.org/windowfunctions.html) · [Funciones de fecha (SQLite)](https://www.sqlite.org/lang_datefunc.html) · [CTE recursivas (SQLite)](https://www.sqlite.org/lang_with.html)
:::

:::errores
- **No quitar duplicados antes del truco.** Una fecha repetida parte la racha.
- **Restar fechas como texto.** `'2024-02-02' - '2024-02-01'` no da 1 en SQLite: convierte con `julianday`.
- **Olvidar el PARTITION BY.** Las rachas de un cliente se mezclan con las de otro.
- **Buscar días faltantes con GROUP BY.** Lo que no existe no se agrupa: necesitas un calendario.
:::

:::entrevista
**Pregunta:** "Resuélvelo sin funciones de ventana."

**Respuesta modelo:** "Un día empieza racha si el día anterior no existe para ese cliente: `WHERE NOT EXISTS (SELECT 1 FROM logins l2 WHERE l2.cliente_id = l.cliente_id AND l2.fecha = date(l.fecha, '-1 day'))`. Igual para el fin con el día siguiente. Después emparejo cada inicio con el primer fin mayor o igual. Funciona, pero es más lento: con ventanas se recorre la tabla una vez."
:::

## Ejercicios

:::ejercicio quiz
Un cliente tiene logins el 3, 4, 4 y 5 de marzo (el 4 está repetido). ¿Qué pasa con el truco `julianday(fecha) - ROW_NUMBER()`?
- [ ] Funciona igual: devuelve una racha de 3 días
- [x] La racha se parte en dos, porque el número de fila avanza dos veces en el mismo día
- [ ] Da error porque hay filas duplicadas
- [ ] Devuelve una racha de 4 días
:::

:::ejercicio sql dificultad=Experto titulo="Todas las rachas de 7 días o más"
Lista cada racha de **7 o más días seguidos** de login de cada cliente. Columnas: `cliente_id`, `inicio`, `fin`, `dias`.
```sql solucion
WITH numerado AS (
  SELECT cliente_id, fecha,
         julianday(fecha) - ROW_NUMBER() OVER (PARTITION BY cliente_id ORDER BY fecha) AS grupo
  FROM logins
)
SELECT cliente_id, MIN(fecha) AS inicio, MAX(fecha) AS fin, COUNT(*) AS dias
FROM numerado
GROUP BY cliente_id, grupo
HAVING COUNT(*) >= 7;
```
```pista
El grupo se calcula con `julianday(fecha) - ROW_NUMBER() OVER (PARTITION BY cliente_id ORDER BY fecha)`.
```
```pista
Agrupa por `cliente_id, grupo` y filtra con `HAVING COUNT(*) >= 7`.
```
:::

:::ejercicio sql dificultad=Experto titulo="Cuántas rachas largas tuvo cada cliente"
Para cada cliente que tuvo al menos una racha de **14 días o más**, devuelve cuántas rachas de ese largo tuvo. Columnas: `cliente_id`, `rachas_largas`.
```sql solucion
WITH numerado AS (
  SELECT cliente_id, fecha,
         julianday(fecha) - ROW_NUMBER() OVER (PARTITION BY cliente_id ORDER BY fecha) AS grupo
  FROM logins
),
rachas AS (SELECT cliente_id, COUNT(*) AS dias FROM numerado GROUP BY cliente_id, grupo)
SELECT cliente_id, COUNT(*) AS rachas_largas FROM rachas WHERE dias >= 14 GROUP BY cliente_id;
```
```pista
Dos niveles de agregación: primero una fila por racha (con su largo), después cuentas rachas por cliente.
```
:::

:::ejercicio sql dificultad=Experto titulo="Huecos de 10 días o más sin login"
Lista cada período de **10 días o más sin login** entre dos logins de un mismo cliente. `desde` es el primer día sin login, `hasta` el último y `dias` la cantidad de días del hueco. Columnas: `cliente_id`, `desde`, `hasta`, `dias`.
```sql solucion
WITH l AS (
  SELECT cliente_id, fecha,
         LEAD(fecha) OVER (PARTITION BY cliente_id ORDER BY fecha) AS siguiente
  FROM logins
)
SELECT cliente_id,
       date(fecha, '+1 day') AS desde,
       date(siguiente, '-1 day') AS hasta,
       CAST(julianday(siguiente) - julianday(fecha) - 1 AS INTEGER) AS dias
FROM l
WHERE siguiente IS NOT NULL AND julianday(siguiente) - julianday(fecha) - 1 >= 10;
```
```pista
Con `LEAD(fecha)` traes el próximo login del mismo cliente. Los días sin login son la diferencia **menos 1**.
```
```pista
`desde` es el día siguiente al login (`date(fecha, '+1 day')`) y `hasta` el día anterior al próximo (`date(siguiente, '-1 day')`).
```
:::

:::ejercicio sql dificultad=Experto titulo="La racha más larga de ventas telefónicas"
Considera los días de 2024 en que hubo **al menos un pedido** por el canal `telefono` (cualquier estado). Devuelve la racha más larga de días seguidos con ventas telefónicas; si hay dos del mismo largo, la que empezó antes. Una sola fila con columnas: `inicio`, `fin`, `dias`.
```sql solucion
WITH d AS (
  SELECT DISTINCT fecha_pedido AS fecha FROM pedidos
  WHERE canal = 'telefono' AND fecha_pedido >= '2024-01-01' AND fecha_pedido < '2025-01-01'
),
g AS (SELECT fecha, julianday(fecha) - ROW_NUMBER() OVER (ORDER BY fecha) AS grupo FROM d),
r AS (SELECT MIN(fecha) AS inicio, MAX(fecha) AS fin, COUNT(*) AS dias FROM g GROUP BY grupo)
SELECT inicio, fin, dias FROM r ORDER BY dias DESC, inicio LIMIT 1;
```
```pista
Hay varios pedidos por día: empieza con `SELECT DISTINCT fecha_pedido`, o el truco se rompe.
```
```pista
Sin `PARTITION BY` (hay una sola serie). Ordena las rachas por `dias DESC, inicio` y quédate con la primera.
```
:::

:::ejercicio sql dificultad=Experto titulo="Días de enero de 2024 sin ventas telefónicas"
Devuelve los días de **enero de 2024** en los que no hubo ningún pedido por el canal `telefono`. Columna: `fecha`.
```sql solucion
WITH RECURSIVE dias(fecha) AS (
  SELECT '2024-01-01'
  UNION ALL
  SELECT date(fecha, '+1 day') FROM dias WHERE fecha < '2024-01-31'
)
SELECT fecha FROM dias
WHERE fecha NOT IN (SELECT fecha_pedido FROM pedidos WHERE canal = 'telefono');
```
```pista
Los días sin pedidos no existen en `pedidos`: genera los 31 días con una CTE recursiva.
```
```pista
Después quédate con los que **no** están en los pedidos telefónicos (`NOT IN` o `LEFT JOIN ... WHERE p.pedido_id IS NULL`).
```
:::
