---
titulo: Trabajar con fechas
nivel: Básico
duracion: 35
resumen: Formato ISO, date(), strftime(), julianday(), rangos de fechas y diferencias entre motores.
objetivos: Filtrar periodos con rangos semiabiertos que no pierden datos | Extraer año, mes y día de la semana con `strftime` | Calcular diferencias entre fechas en días con `julianday` | Sumar y restar intervalos con `date(..., '+N days')` y reconocer la trampa de fin de mes
prerrequisitos: sql-where | sql-funciones
autoevaluacion: ¿Puedes filtrar los pedidos de diciembre de 2024 sin usar `BETWEEN`? | ¿Sabes por qué el formato `2024-03-15` es el único que conviene guardar? | ¿Puedes calcular cuántos días pasaron entre un pedido y su pago? | ¿Puedes contar los pedidos hechos en fin de semana? | ¿Sabes por qué usar "la fecha de hoy" en una consulta de un pipeline es peligroso?
---

<!-- estandar:escenario -->
:::escenario El cierre de diciembre
Diego, de finanzas, está cerrando el año:

> "Necesito los pedidos de diciembre de 2024, y cuántos días tardamos en cobrar cada uno. También me piden saber si los fines de semana se vende más. Ojo, que el año pasado alguien me pasó un número que no incluía el 31 de diciembre."

Las fechas parecen simples hasta que aparecen los rangos, las horas, los meses de distinto largo y las zonas horarias. Esta lección te enseña a no perder ni duplicar un día.
:::
## Por qué las fechas merecen una lección aparte

Casi toda pregunta de negocio tiene una fecha adentro: "ventas **por mes**", "clientes nuevos **este año**", "días **entre** la compra y la entrega", "usuarios activos **en los últimos 30 días**". Y las fechas son traicioneras: meses de distinta cantidad de días, años bisiestos, horas, zonas horarias, formatos distintos según el país (`03/04/2024`, ¿es 3 de abril o 4 de marzo?). Esta lección te da las herramientas para trabajarlas sin errores.

## El formato ISO 8601: el único que deberías usar

El estándar internacional escribe las fechas de **lo más grande a lo más chico**:

```text
2024-03-15              ← fecha:        año-mes-día
2024-03-15 14:30:00     ← fecha y hora: año-mes-día hora:minuto:segundo
2024-03-15T14:30:00Z    ← con "T" y zona horaria (Z = UTC), típico en APIs y JSON
```

Su gran ventaja: **ordenar el texto es lo mismo que ordenar en el tiempo**. Comparando carácter por carácter, `'2023-12-31'` < `'2024-01-01'`, exactamente como en el calendario. Con `'31/12/2023'` y `'01/01/2024'` no pasa: alfabéticamente `'01…'` va primero aunque sea posterior.

### Cómo guarda las fechas SQLite

SQLite no tiene un tipo `DATE` propio: guarda las fechas como **texto ISO**. Por eso en el curso puedes comparar directamente:

```sql
SELECT pedido_id, fecha_pedido
FROM pedidos
WHERE fecha_pedido >= '2024-12-24' AND fecha_pedido < '2024-12-26'
ORDER BY fecha_pedido;
```

Otros motores (PostgreSQL, BigQuery, Spark, Snowflake) sí tienen tipos `DATE` y `TIMESTAMP` de verdad, pero aceptan el mismo texto ISO al comparar: `WHERE fecha >= '2024-12-24'` funciona en todos.

## Filtrar periodos: el rango semiabierto

La forma profesional de pedir un periodo es: **desde el inicio (incluido) hasta el inicio del periodo siguiente (excluido)**.

```sql
-- Todo diciembre de 2024, con o sin horas en la columna
SELECT COUNT(*)
FROM pedidos
WHERE fecha_pedido >= '2024-12-01' AND fecha_pedido < '2025-01-01';
```

| Forma | ¿Funciona con horas? | Problema |
|---|---|---|
| `>= '2024-12-01' AND < '2025-01-01'` | ✅ sí | Ninguno |
| `BETWEEN '2024-12-01' AND '2024-12-31'` | ❌ no | Pierde todo lo del 31 después de las 00:00:00 |
| `strftime('%Y-%m', fecha) = '2024-12'` | ✅ sí | Funciona, pero aplica una función a cada fila: no usa índices ni la poda de particiones |

:::tip Regla para toda tu carrera
Para fechas, usa `>=` inicio y `<` inicio-del-siguiente. Es correcto con fechas y con fecha-hora, no tienes que saber cuántos días tiene el mes, y es eficiente.
:::

## Las funciones de fecha de SQLite

SQLite tiene unas pocas funciones muy potentes:

| Función | Para qué | Ejemplo | Resultado |
|---|---|---|---|
| `date(t)` | Quedarse con la fecha (sin hora) | `date('2024-03-15 14:30:00')` | `2024-03-15` |
| `date(t, mod1, mod2…)` | Mover o "redondear" fechas con modificadores | `date('2024-03-15', '+1 month')` | `2024-04-15` |
| `datetime(t, …)` | Igual, pero conserva la hora | `datetime('2024-03-15 10:00', '+3 hours')` | `2024-03-15 13:00:00` |
| `strftime(formato, t)` | Extraer partes o formatear | `strftime('%Y-%m', '2024-03-15')` | `2024-03` |
| `julianday(t)` | Convertir a número de días (para restar) | `julianday('2024-12-25') - julianday('2024-12-01')` | `24.0` |

### Modificadores de `date()`

Se aplican **en orden**, de izquierda a derecha:

| Modificador | Efecto |
|---|---|
| `'+7 days'`, `'-1 day'` | Sumar o restar días |
| `'+1 month'`, `'-3 months'`, `'+1 year'` | Sumar o restar meses o años |
| `'start of month'` | Ir al día 1 del mes |
| `'start of year'` | Ir al 1 de enero |
| `'weekday 1'` | Avanzar hasta el próximo lunes (0 = domingo, 1 = lunes…) |

Combinándolos se resuelven preguntas típicas:

```sql
SELECT date('2024-03-15', 'start of month')                     AS primer_dia_mes,   -- 2024-03-01
       date('2024-03-15', 'start of month', '+1 month', '-1 day') AS ultimo_dia_mes,   -- 2024-03-31
       date('2024-03-15', 'start of year')                      AS inicio_anio,      -- 2024-01-01
       date('2024-03-15', '-30 days')                           AS hace_30_dias;     -- 2024-02-14
```

El "último día del mes" se lee: ve al día 1, suma un mes (día 1 del mes siguiente), resta un día.

:::cuidado Sumar meses a fin de mes
`date('2024-01-31', '+1 month')` da **2024-03-02**, no 2024-02-29: SQLite suma un mes al número de mes (31 de febrero, que no existe) y "desborda" hacia marzo. Cada motor resuelve distinto este caso (PostgreSQL y Spark devuelven el último día de febrero). Si tu lógica depende de vencimientos mensuales, pruébala con días 29, 30 y 31.
:::

### strftime: extraer partes de una fecha

| Código | Significa | Para `'2024-12-25 18:45:10'` |
|---|---|---|
| `%Y` | año | `2024` |
| `%m` | mes (01–12) | `12` |
| `%d` | día del mes | `25` |
| `%H`, `%M`, `%S` | hora, minuto, segundo | `18`, `45`, `10` |
| `%w` | día de la semana (0 = domingo … 6 = sábado) | `3` (miércoles) |
| `%j` | día del año (001–366) | `360` |
| `%W` | número de semana del año | `52` |
| `%Y-%m` | año-mes: la clave para agrupar por mes | `2024-12` |

`strftime` **siempre devuelve texto**. Si necesitas un número (para comparar `mes > 6` o sumar), conviértelo: `CAST(strftime('%m', fecha) AS INTEGER)`.

```sql
SELECT pedido_id,
       fecha_pedido,
       strftime('%Y', fecha_pedido)               AS anio,
       CAST(strftime('%m', fecha_pedido) AS INT)  AS mes,
       date(fecha_pedido, 'start of month')       AS inicio_mes,
       date(fecha_pedido, '+30 days')             AS vence
FROM pedidos
WHERE fecha_pedido >= '2024-12-24'
LIMIT 3;
```

| pedido_id | fecha_pedido | anio | mes | inicio_mes | vence |
|---|---|---|---|---|---|
| 11836 | 2024-12-24 | 2024 | 12 | 2024-12-01 | 2025-01-23 |

### Diferencias entre fechas: julianday

`julianday` convierte una fecha en un número: los días transcurridos desde una fecha muy antigua (el año 4713 a. C.). No importa el número en sí; lo útil es **restar** dos de ellos:

```sql
SELECT julianday('2024-12-25') - julianday('2024-12-01')                    AS dias,      -- 24.0
       (julianday('2024-12-25 18:00') - julianday('2024-12-25 06:00')) * 24 AS horas,     -- 12.0
       (julianday('2024-12-25 18:00') - julianday('2024-12-25 06:00')) * 1440 AS minutos; -- 720.0
```

- El resultado está en **días**, con decimales para las horas: 12 horas = 0,5 días.
- Para horas multiplica por 24; para minutos, por 1.440 (24 × 60).
- Es la técnica de los casos de negocio: minutos de demora de un vuelo, días de atraso de una cuota, horas para cerrar un ticket.

## Fecha "de hoy": cuidado

`date('now')` devuelve la fecha actual (en UTC). Es útil para explorar, pero en un pipeline es peligroso: si re-ejecutas el proceso de ayer, hoy, "hoy" cambió y el resultado también. En producción, la fecha de referencia **entra como parámetro** (por ejemplo, la fecha lógica de un DAG de Airflow). Lo verás en los módulos de Airflow y de casos de punta a punta.

:::cuidado Zonas horarias
Un evento a las 23:30 del 31 de diciembre en Buenos Aires (UTC−3) es el **1 de enero a las 02:30 en UTC**. Si guardas en UTC (lo recomendado) y reportas "ventas del 31 de diciembre", tienes que convertir a la hora local antes de agrupar. Regla de oro: **guardar en UTC, convertir al mostrar**.
:::

## Lo mismo en otros motores

| Qué | SQLite | PostgreSQL | Spark SQL / Databricks | BigQuery | SQL Server |
|---|---|---|---|---|---|
| Año | `strftime('%Y', f)` | `EXTRACT(YEAR FROM f)` | `year(f)` | `EXTRACT(YEAR FROM f)` | `YEAR(f)` |
| Inicio de mes | `date(f, 'start of month')` | `date_trunc('month', f)` | `date_trunc('month', f)` | `DATE_TRUNC(f, MONTH)` | `DATETRUNC(month, f)` |
| Sumar 7 días | `date(f, '+7 days')` | `f + INTERVAL '7 days'` | `date_add(f, 7)` | `DATE_ADD(f, INTERVAL 7 DAY)` | `DATEADD(day, 7, f)` |
| Días entre a y b | `julianday(b) - julianday(a)` | `b - a` | `datediff(b, a)` | `DATE_DIFF(b, a, DAY)` | `DATEDIFF(day, a, b)` |
| Formatear año-mes | `strftime('%Y-%m', f)` | `to_char(f, 'YYYY-MM')` | `date_format(f, 'yyyy-MM')` | `FORMAT_DATE('%Y-%m', f)` | `FORMAT(f, 'yyyy-MM')` |

Los conceptos son los mismos en todos: extraer partes, truncar a un periodo, sumar intervalos y restar fechas.





<!-- estandar:errores -->
:::errores
- **`BETWEEN` con fechas y horas**: `fecha BETWEEN '2024-12-01' AND '2024-12-31'` excluye todo el 31 después de la medianoche. Usa `fecha >= '2024-12-01' AND fecha < '2025-01-01'`.
- **Fechas guardadas en otro formato**: `'15/03/2024'` se ordena y compara como texto, mal. Conviértelas a ISO (`2024-03-15`) en la capa de limpieza.
- **Restar fechas como texto**: `'2024-03-15' - '2024-03-01'` da `0` en SQLite (resta los primeros números). Usa `julianday(a) - julianday(b)`.
- **"Hoy" en el código**: `date('now')` hace que el resultado dependa del día en que corre. En un pipeline se usa la fecha lógica que recibe (por ejemplo `{{ ds }}` en Airflow), para poder reprocesar cualquier día.
- **Zonas horarias**: un pedido de las 23:30 en México es del día siguiente en UTC. Decide (y documenta) en qué zona se reporta.
:::

<!-- estandar:trabajo -->
:::trabajo
- Casi todas las tablas grandes están **particionadas por fecha**. Un filtro de rango sobre esa columna hace que la base lea solo los días necesarios; una función sobre la columna (`strftime('%Y', fecha) = '2024'`) puede obligarla a leer todo.
- Los equipos guardan las marcas de tiempo en **UTC** y convierten a la hora local solo al mostrar. Es la forma de evitar errores con el cambio de horario.
- Para reportes con días sin ventas se usa una **tabla calendario** (una fila por día) y se une con los datos. Lo verás con CTE recursivas y en dbt (`date_spine`).
:::

## Resumen

- Usa siempre el formato ISO `AAAA-MM-DD [HH:MM:SS]`: se ordena igual que el tiempo.
- Filtra periodos con `>= inicio AND < inicio_siguiente`.
- `date()` con modificadores mueve y trunca fechas; `strftime()` extrae partes (devuelve texto); `julianday()` permite restar (resultado en días).
- Evita `date('now')` en pipelines: la fecha de referencia debe ser un parámetro. Guarda en UTC.

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
