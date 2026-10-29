---
titulo: Patrones avanzados de análisis
nivel: Experto
duracion: 50
resumen: Deduplicación, gaps & islands (rachas), sesiones, embudos, cohortes y "último valor conocido".
objetivos: Deduplicar registros quedándote con la versión más reciente | Detectar rachas de días consecutivos (gaps & islands) | Agrupar eventos en sesiones con un corte de inactividad | Calcular embudos de conversión y retención por cohortes
prerrequisitos: sql-ventanas-2 | sql-cte
autoevaluacion: ¿Puedes deduplicar una tabla de clientes quedándote con la carga más reciente? | ¿Puedes explicar el truco de restar un `ROW_NUMBER` a la fecha para encontrar rachas? | ¿Puedes sesionizar clics con un corte de 30 minutos? | ¿Puedes calcular un embudo vista → carrito → compra por dispositivo? | ¿Puedes armar una tabla de retención por cohortes mensuales?
---

<!-- estandar:escenario -->
:::escenario Las preguntas difíciles de producto
El equipo de producto se sumó a los pedidos, y sus preguntas son más difíciles:

> "¿Cuánto dura una visita promedio al sitio? ¿Cuántos usuarios llegan al carrito y cuántos terminan comprando, por dispositivo? ¿Cuántos de los que compraron por primera vez en enero siguen comprando tres meses después?"

Ninguna se resuelve con una sola función. Son **patrones**: combinaciones de ventanas, CTE y agregaciones que se repiten en todas las empresas. Aprenderlos de memoria te ahorra días de trabajo (y te hace brillar en las entrevistas).
:::
Estos son los problemas que separan a un analista de un **experto**. Ninguno se resuelve con una sola cláusula: todos combinan CTE, funciones de ventana y agregaciones en **varios pasos**. La forma de abordarlos es siempre la misma: entender el patrón con un ejemplo chico (como las tablas de abajo), escribir cada paso en una CTE y verificar el resultado intermedio antes de seguir.

| Patrón | Pregunta de negocio típica | Herramienta clave |
|---|---|---|
| Deduplicación | "Quédate con la versión más reciente de cada cliente" | `ROW_NUMBER` + `rn = 1` |
| Gaps & islands | "¿Cuál fue la racha más larga de días seguidos?" | fecha − número de fila |
| Sesionización | "Agrupa los clics en visitas" | `LAG` + suma acumulada de cortes |
| Embudos | "¿Cuántos llegaron a cada paso de la compra?" | `COUNT(DISTINCT CASE …)` |
| Cohortes | "¿Qué % de los clientes de enero sigue comprando?" | primera fecha + meses transcurridos |
| Último valor conocido | "Usa el tipo de cambio vigente ese día" | as-of join |

 Aparecen todo el tiempo en el trabajo real y en entrevistas de nivel senior. Todos combinan CTEs y funciones de ventana.

## 1. Deduplicación: quedarse con el registro más reciente

Los datos crudos casi siempre traen **duplicados**: el sistema de origen reenvió un registro, un proceso se ejecutó dos veces, o el cliente actualizó su email y llegó una versión nueva. En la capa limpia (silver) debe quedar **una fila por clave**, normalmente la más reciente.

La tabla `clientes_crudo` tiene el mismo cliente cargado varias veces, con distintas `fecha_carga`. El patrón tiene dos pasos:

1. **Numerar** las copias de cada `cliente_id`, de la más reciente a la más vieja: `ROW_NUMBER() OVER (PARTITION BY cliente_id ORDER BY fecha_carga DESC)`. La más reciente recibe el 1.
2. **Quedarse** con las filas numeradas 1.

Aprovecha el mismo paso para limpiar (`TRIM`, `LOWER`): deduplicar y normalizar van juntos.

```sql
WITH numerados AS (
    SELECT *,
           ROW_NUMBER() OVER (PARTITION BY cliente_id ORDER BY fecha_carga DESC) AS rn
    FROM clientes_crudo
)
SELECT registro_id, cliente_id, TRIM(nombre) AS nombre, LOWER(email) AS email, fecha_carga
FROM numerados
WHERE rn = 1
LIMIT 10;
```

## 2. Gaps & islands: rachas de días consecutivos

La tabla `logins` tiene los días en que cada cliente entró a la app. Queremos sus **rachas** (*streaks*): bloques de días **consecutivos**. Se llama *gaps and islands* (huecos e islas): las rachas son islas separadas por huecos.

¿Por qué es difícil? Porque "consecutivo" compara cada fila con la anterior, y una racha puede tener 2 días o 200: no sirve un número fijo de `LAG`.

El truco genial: si a cada fecha le restas su número de fila (en días), las fechas **consecutivas** dan **el mismo resultado**. Ese valor identifica la “isla”.

| fecha | rn | fecha − rn días |
|---|---|---|
| 2024-01-10 | 1 | 2024-01-09 |
| 2024-01-11 | 2 | 2024-01-09 |
| 2024-01-12 | 3 | 2024-01-09 |
| 2024-01-20 | 4 | 2024-01-16 ← nueva isla |
| 2024-01-21 | 5 | 2024-01-16 |

```sql
WITH marcados AS (
    SELECT cliente_id, fecha,
           date(fecha, '-' || ROW_NUMBER() OVER (PARTITION BY cliente_id ORDER BY fecha) || ' days') AS grupo
    FROM logins
),
rachas AS (
    SELECT cliente_id, grupo, MIN(fecha) AS desde, MAX(fecha) AS hasta, COUNT(*) AS dias
    FROM marcados
    GROUP BY cliente_id, grupo
)
SELECT * FROM rachas WHERE cliente_id = 1 ORDER BY desde;
```

## 3. Sesionización: agrupar clics en visitas

Las herramientas de analítica web (como Google Analytics) agrupan los eventos de un usuario en **sesiones** (visitas). La regla estándar: una sesión **termina** si pasan más de 30 minutos sin actividad; el próximo evento abre una sesión nueva. Los datos crudos solo traen eventos sueltos; las sesiones hay que construirlas.

El razonamiento en tres pasos:

1. Para cada evento, ¿cuántos minutos pasaron desde el evento **anterior del mismo usuario**? → `LAG`.
2. Si fueron más de 30 (o es el primer evento), marca un **corte**: `1`; si no, `0`.
3. La **suma acumulada** de los cortes numera las sesiones: 1, 1, 1, 2, 2, 3… Cada corte incrementa el contador.



```sql
WITH e AS (
    SELECT cliente_id, fecha_hora, pagina,
           (julianday(fecha_hora) - julianday(LAG(fecha_hora) OVER (PARTITION BY cliente_id ORDER BY fecha_hora))) * 24 * 60 AS min_desde_anterior
    FROM eventos_web
    WHERE cliente_id IS NOT NULL
),
cortes AS (
    SELECT *, CASE WHEN min_desde_anterior IS NULL OR min_desde_anterior > 30 THEN 1 ELSE 0 END AS nueva_sesion
    FROM e
)
SELECT cliente_id, fecha_hora, pagina, ROUND(min_desde_anterior, 1) AS min_desde_anterior,
       SUM(nueva_sesion) OVER (PARTITION BY cliente_id ORDER BY fecha_hora ROWS UNBOUNDED PRECEDING) AS sesion
FROM cortes
WHERE cliente_id = 5
ORDER BY fecha_hora;
```

## 4. Embudos (funnels)

Un **embudo** (*funnel*) mide cuántas personas llegan a cada paso de un proceso: ver un producto → agregar al carrito → iniciar el pago → confirmar. Siempre se "angosta" hacia abajo, y la pregunta del negocio es **dónde se pierde más gente** (la conversión entre pasos).

Se calcula en una sola pasada contando **personas distintas** que pasaron por cada paso (no eventos: alguien que vio 10 productos cuenta una vez). La técnica es `COUNT(DISTINCT CASE WHEN condición THEN cliente_id END)`: el `CASE` sin `ELSE` devuelve `NULL` para los demás, y `COUNT(DISTINCT …)` ignora los `NULL`.

¿Cuántos visitantes vieron un producto, cuántos agregaron al carrito y cuántos compraron?

```sql
SELECT COUNT(DISTINCT CASE WHEN pagina = 'producto'     THEN cliente_id END) AS vieron_producto,
       COUNT(DISTINCT CASE WHEN pagina = 'carrito'      THEN cliente_id END) AS agregaron_carrito,
       COUNT(DISTINCT CASE WHEN pagina = 'checkout'     THEN cliente_id END) AS checkout,
       COUNT(DISTINCT CASE WHEN pagina = 'confirmacion' THEN cliente_id END) AS compraron
FROM eventos_web
WHERE cliente_id IS NOT NULL;
```

## 5. Cohortes de retención

"¿Los clientes vuelven?" es una de las preguntas más importantes de cualquier negocio. Mirar el total de clientes activos por mes engaña: puede crecer porque entran muchos nuevos aunque los viejos se vayan. Un **análisis de cohortes** separa a los clientes según **cuándo empezaron** y sigue a cada grupo en el tiempo.

Pasos:

1. **Cohorte** de cada cliente: el mes de su **primera** compra (`MIN` de la fecha, truncada al mes).
2. **Mes relativo** de cada compra: cuántos meses pasaron desde la cohorte (mes 0 = el de la primera compra, mes 1 = el siguiente…). Se calcula como (años de diferencia × 12) + meses de diferencia.
3. **Pivotar**: para cada cohorte, cuántos clientes distintos compraron en el mes 0, 1, 2, 3… Dividiendo por el mes 0 obtienes el **% de retención**.

El resultado es la famosa tabla triangular de retención: cada fila es una cohorte y cada columna, un mes desde el inicio.

```sql
WITH primera AS (
    SELECT cliente_id, MIN(date(fecha_pedido, 'start of month')) AS cohorte FROM pedidos GROUP BY cliente_id
),
actividad AS (
    SELECT DISTINCT p.cliente_id, f.cohorte,
           (CAST(strftime('%Y', p.fecha_pedido) AS INT) - CAST(strftime('%Y', f.cohorte) AS INT)) * 12
         + (CAST(strftime('%m', p.fecha_pedido) AS INT) - CAST(strftime('%m', f.cohorte) AS INT)) AS mes_n
    FROM pedidos p JOIN primera f ON f.cliente_id = p.cliente_id
)
SELECT cohorte,
       COUNT(DISTINCT CASE WHEN mes_n = 0 THEN cliente_id END) AS m0,
       COUNT(DISTINCT CASE WHEN mes_n = 1 THEN cliente_id END) AS m1,
       COUNT(DISTINCT CASE WHEN mes_n = 2 THEN cliente_id END) AS m2,
       COUNT(DISTINCT CASE WHEN mes_n = 3 THEN cliente_id END) AS m3
FROM actividad
WHERE cohorte >= '2024-01-01'
GROUP BY cohorte
ORDER BY cohorte;
```

## 6. Último valor conocido (forward fill)

Muchos datos de referencia solo existen en **algunas** fechas: el tipo de cambio no se publica los fines de semana, un precio cambia de vez en cuando, el estado de un cliente se actualiza solo cuando algo cambia. Para cada evento necesitas **el último valor vigente en ese momento**: ni el de hoy, ni uno posterior (eso sería "ver el futuro", un error grave en análisis financieros y en modelos de machine learning).

`tipos_cambio` no tiene sábados ni domingos. Para convertir un pedido del sábado, usamos la última cotización **anterior o igual** a esa fecha:

```sql
SELECT p.pedido_id, p.fecha_pedido,
       (SELECT t.valor_usd FROM tipos_cambio t
         WHERE t.moneda = 'MXN' AND t.fecha <= p.fecha_pedido
         ORDER BY t.fecha DESC LIMIT 1) AS mxn_por_usd
FROM pedidos p
WHERE p.fecha_pedido BETWEEN '2024-03-01' AND '2024-03-10'
LIMIT 10;
```

:::experto El “as-of join”
Esto se llama **as-of join** o *point-in-time join*. Con volúmenes grandes, la subconsulta correlacionada es lenta; alternativas: un calendario con el valor propagado (`LAST_VALUE ... IGNORE NULLS` en Spark/Snowflake), o rangos de validez `[desde, hasta)` con `LEAD(fecha)` y un join por rango.
:::



<!-- estandar:errores -->
:::errores
- **Deduplicar sin desempate**: si dos registros tienen la misma `fecha_carga`, `ROW_NUMBER` elige uno al azar en cada ejecución y el resultado cambia. Agrega un segundo criterio (`registro_id DESC`).
- **Rachas con fechas repetidas**: si un usuario tiene dos logins el mismo día, el truco de restar el `ROW_NUMBER` falla. Deduplica a un registro por día antes.
- **Sesiones que cruzan la medianoche**: si agrupas por día antes de sesionizar, partes una visita en dos. Sesioniza sobre la marca de tiempo completa.
- **Embudos que cuentan eventos en vez de personas**: un usuario que vio 10 páginas no es 10 visitantes. Cuenta `DISTINCT` usuarios en cada paso.
- **Cohortes que mezclan meses incompletos**: el último mes siempre parece tener mala retención porque todavía no terminó. Exclúyelo o márcalo.
:::

<!-- estandar:trabajo -->
:::trabajo
- Estos patrones son el trabajo diario de los equipos de analítica de producto. En una empresa grande, los resultados (sesiones, embudos, cohortes) se guardan como tablas gold que alimentan los dashboards de producto.
- La deduplicación aparece en **todos** los pipelines: los sistemas de origen reenvían eventos, las APIs devuelven el mismo registro dos veces y los reintentos duplican cargas. Es lo primero que hace la capa silver.
- Cuando el volumen es muy grande (miles de millones de eventos), la sesionización se hace en Spark con las mismas ventanas que aprendiste aquí: el SQL se traslada casi palabra por palabra.
:::

## Ejercicios

:::ejercicio sql
Deduplica `clientes_crudo`: devuelve **una fila por `cliente_id`**, la de `fecha_carga` más reciente, con `cliente_id`, `nombre` sin espacios a los lados (`TRIM(nombre)`), `email` en minúsculas y `fecha_carga`.
```sql solucion
WITH n AS (
  SELECT *, ROW_NUMBER() OVER (PARTITION BY cliente_id ORDER BY fecha_carga DESC) AS rn FROM clientes_crudo
)
SELECT cliente_id, TRIM(nombre) AS nombre, LOWER(email) AS email, fecha_carga FROM n WHERE rn = 1;
```
:::

:::ejercicio sql
Encuentra la **racha más larga** (en días consecutivos) de cada cliente en `logins`. Columnas: `cliente_id`, `racha_maxima`.
```sql solucion
WITH m AS (
  SELECT cliente_id, fecha,
         date(fecha, '-' || ROW_NUMBER() OVER (PARTITION BY cliente_id ORDER BY fecha) || ' days') AS grupo
  FROM logins
),
r AS (
  SELECT cliente_id, grupo, COUNT(*) AS dias FROM m GROUP BY cliente_id, grupo
)
SELECT cliente_id, MAX(dias) AS racha_maxima FROM r GROUP BY cliente_id;
```
```pista
1) Calcula el grupo con `date(fecha, '-' || ROW_NUMBER() OVER (...) || ' days')`. 2) Cuenta días por cliente y grupo. 3) Toma el máximo por cliente.
```
:::

:::ejercicio sql
¿Cuántos clientes tuvieron alguna racha de **14 días o más**? Columna: `clientes`.
```sql solucion
WITH m AS (
  SELECT cliente_id, date(fecha, '-' || ROW_NUMBER() OVER (PARTITION BY cliente_id ORDER BY fecha) || ' days') AS grupo FROM logins
),
r AS (SELECT cliente_id, grupo, COUNT(*) AS dias FROM m GROUP BY cliente_id, grupo)
SELECT COUNT(DISTINCT cliente_id) AS clientes FROM r WHERE dias >= 14;
```
:::

:::ejercicio sql
Sesioniza `eventos_web` (solo eventos con `cliente_id`, corte de **30 minutos**) y calcula la **cantidad total de sesiones** y el **promedio de eventos por sesión** (redondeado a 2). Columnas: `sesiones`, `eventos_por_sesion`.
```sql solucion
WITH e AS (
  SELECT cliente_id, fecha_hora,
         (julianday(fecha_hora) - julianday(LAG(fecha_hora) OVER (PARTITION BY cliente_id ORDER BY fecha_hora))) * 1440 AS gap
  FROM eventos_web WHERE cliente_id IS NOT NULL
),
s AS (
  SELECT cliente_id,
         SUM(CASE WHEN gap IS NULL OR gap > 30 THEN 1 ELSE 0 END) OVER (PARTITION BY cliente_id ORDER BY fecha_hora ROWS UNBOUNDED PRECEDING) AS sesion
  FROM e
),
t AS (SELECT cliente_id, sesion, COUNT(*) AS eventos FROM s GROUP BY cliente_id, sesion)
SELECT COUNT(*) AS sesiones, ROUND(AVG(eventos), 2) AS eventos_por_sesion FROM t;
```
:::

:::ejercicio sql
Calcula el **embudo por dispositivo**: para cada `dispositivo`, cuántos clientes distintos vieron una página de `producto` (`vieron`), cuántos llegaron a `carrito` (`carrito`) y cuántos a `confirmacion` (`compraron`), y la tasa de conversión `compraron / vieron` en porcentaje redondeado a 2 (`conversion_pct`). Solo eventos con cliente.
```sql solucion
WITH f AS (
  SELECT dispositivo,
         COUNT(DISTINCT CASE WHEN pagina = 'producto' THEN cliente_id END) AS vieron,
         COUNT(DISTINCT CASE WHEN pagina = 'carrito' THEN cliente_id END) AS carrito,
         COUNT(DISTINCT CASE WHEN pagina = 'confirmacion' THEN cliente_id END) AS compraron
  FROM eventos_web WHERE cliente_id IS NOT NULL
  GROUP BY dispositivo
)
SELECT dispositivo, vieron, carrito, compraron, ROUND(100.0 * compraron / vieron, 2) AS conversion_pct FROM f;
```
:::

:::ejercicio sql ordenado
**Retención de cohortes 2023**: para cada cohorte mensual de 2023 (mes de la primera compra, formato `YYYY-MM-01`), muestra el tamaño de la cohorte (`clientes`) y el porcentaje que volvió a comprar en **cualquier mes posterior** al de su primera compra (`pct_recompra`, redondeado a 2). Ordena por cohorte.
```sql solucion
WITH primera AS (
  SELECT cliente_id, MIN(date(fecha_pedido, 'start of month')) AS cohorte FROM pedidos GROUP BY cliente_id
),
recompra AS (
  SELECT f.cliente_id, f.cohorte,
         MAX(CASE WHEN date(p.fecha_pedido, 'start of month') > f.cohorte THEN 1 ELSE 0 END) AS volvio
  FROM primera f JOIN pedidos p ON p.cliente_id = f.cliente_id
  GROUP BY f.cliente_id, f.cohorte
)
SELECT cohorte, COUNT(*) AS clientes, ROUND(100.0 * SUM(volvio) / COUNT(*), 2) AS pct_recompra
FROM recompra
WHERE cohorte >= '2023-01-01' AND cohorte < '2024-01-01'
GROUP BY cohorte
ORDER BY cohorte;
```
:::

:::ejercicio sql
Convierte a pesos mexicanos el **importe neto** de los pedidos del canal `web` del **9 y 10 de marzo de 2024** (fin de semana), usando la **última cotización conocida** de `MXN` en o antes de la fecha del pedido. Columnas: `pedido_id`, `fecha_pedido`, `importe_usd` (redondeado a 2), `cotizacion` y `importe_mxn` (redondeado a 2).
```sql solucion
WITH t AS (
  SELECT p.pedido_id, p.fecha_pedido, SUM(d.cantidad * d.precio_unitario * (1 - d.descuento)) AS importe
  FROM pedidos p JOIN detalle_pedidos d ON d.pedido_id = p.pedido_id
  WHERE p.canal = 'web' AND p.fecha_pedido IN ('2024-03-09', '2024-03-10')
  GROUP BY p.pedido_id, p.fecha_pedido
)
SELECT pedido_id, fecha_pedido, ROUND(importe, 2) AS importe_usd,
       (SELECT valor_usd FROM tipos_cambio c WHERE c.moneda = 'MXN' AND c.fecha <= t.fecha_pedido ORDER BY c.fecha DESC LIMIT 1) AS cotizacion,
       ROUND(importe * (SELECT valor_usd FROM tipos_cambio c WHERE c.moneda = 'MXN' AND c.fecha <= t.fecha_pedido ORDER BY c.fecha DESC LIMIT 1), 2) AS importe_mxn
FROM t;
```
:::

:::ejercicio sql dificultad=Intermedio
En `clientes_crudo` hay varias cargas del mismo cliente. Quédate con la **más reciente** de cada `cliente_id` (según `fecha_carga`). Columnas: `cliente_id`, `registro_id`, `fecha_carga`.
```pista
Numera los registros de cada cliente del más nuevo al más viejo con `ROW_NUMBER()`.
```
```pista
`PARTITION BY cliente_id ORDER BY fecha_carga DESC` y filtra la fila 1 en una consulta externa.
```
```sql solucion
SELECT cliente_id, registro_id, fecha_carga
FROM (
  SELECT cliente_id, registro_id, fecha_carga,
         ROW_NUMBER() OVER (PARTITION BY cliente_id ORDER BY fecha_carga DESC) AS rn
  FROM clientes_crudo
) AS t
WHERE rn = 1;
```
:::

:::ejercicio sql dificultad=Avanzado
Embudo de 2024: cuántos clientes distintos (sin contar visitantes anónimos) tuvieron al menos un evento de cada tipo. En una fila: `vieron` (`vista`), `agregaron` (`agregar_carrito`) y `compraron` (`compra`).
```pista
`COUNT(DISTINCT CASE WHEN tipo_evento = 'vista' THEN cliente_id END)`: el CASE devuelve NULL en las demás filas y `COUNT` las ignora.
```
```sql solucion
SELECT COUNT(DISTINCT CASE WHEN tipo_evento = 'vista' THEN cliente_id END) AS vieron,
       COUNT(DISTINCT CASE WHEN tipo_evento = 'agregar_carrito' THEN cliente_id END) AS agregaron,
       COUNT(DISTINCT CASE WHEN tipo_evento = 'compra' THEN cliente_id END) AS compraron
FROM eventos_web
WHERE cliente_id IS NOT NULL AND fecha_hora >= '2024-01-01' AND fecha_hora < '2025-01-01';
```
:::

:::ejercicio sql ordenado dificultad=Avanzado
Gaps & islands: muestra los **5 clientes con la racha más larga** de días consecutivos con login. Columnas: `cliente_id`, `racha_max`. Ordena por racha (mayor primero) y desempata por `cliente_id`.
```pista
En una racha, la fecha menos su número de fila (en días) da siempre la misma fecha “ancla”.
```
```pista
`date(fecha, '-' || ROW_NUMBER() OVER (PARTITION BY cliente_id ORDER BY fecha) || ' days')` es la isla. Cuenta por cliente e isla y después toma el máximo por cliente.
```
```sql solucion
WITH islas AS (
  SELECT cliente_id, date(fecha, '-' || ROW_NUMBER() OVER (PARTITION BY cliente_id ORDER BY fecha) || ' days') AS isla
  FROM logins
), rachas AS (
  SELECT cliente_id, isla, COUNT(*) AS dias FROM islas GROUP BY cliente_id, isla
)
SELECT cliente_id, MAX(dias) AS racha_max
FROM rachas
GROUP BY cliente_id
ORDER BY racha_max DESC, cliente_id
LIMIT 5;
```
:::
