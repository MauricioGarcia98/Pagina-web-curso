---
titulo: Patrones avanzados de análisis
nivel: Experto
duracion: 50
resumen: Deduplicación, gaps & islands (rachas), sesiones, embudos, cohortes y "último valor conocido".
---

Estos son los problemas que separan a un analista de un **experto**. Aparecen todo el tiempo en el trabajo real y en entrevistas de nivel senior. Todos combinan CTEs y funciones de ventana.

## 1. Deduplicación: quedarse con el registro más reciente

La tabla `clientes_crudo` tiene el mismo cliente cargado varias veces. Patrón: numerar las copias de cada clave y quedarse con la #1.

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

La tabla `logins` tiene los días en que cada cliente entró. ¿Cuál fue su racha más larga de días seguidos?

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

Una **sesión** termina si pasan más de 30 minutos sin actividad. Patrón: con `LAG` detectas los “cortes” y con una **suma acumulada** de cortes numeras las sesiones.

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

Una **cohorte** agrupa clientes por el mes de su primera compra; luego se mide qué proporción vuelve a comprar en los meses siguientes.

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
