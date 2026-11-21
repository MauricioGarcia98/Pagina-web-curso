---
titulo: SQL de entrevista 3 - acumulados, crecimiento, sesiones y retención
nivel: Experto
duracion: 70
resumen: Las preguntas de "cómo evoluciona algo en el tiempo" - ventas acumuladas, crecimiento mes a mes, porcentaje del total, promedio móvil, sesiones por inactividad y retención por cohorte. Todas usan las mismas tres piezas - agregar al grano correcto, una función de ventana con el marco adecuado y LAG para comparar con el período anterior.
objetivos: Calcular acumulados y promedios móviles con el marco ROWS BETWEEN correcto | Comparar cada período con el anterior usando LAG sin dividir por cero | Calcular el porcentaje del total con SUM() OVER () | Armar sesiones por inactividad con LAG y una suma acumulada | Construir una tabla de retención por cohorte de primera compra
prerrequisitos: entrevistas-sql-rachas-y-huecos | analisis-cohortes-retencion
autoevaluacion: ¿Por qué primero agregas por mes y después aplicas la ventana? | ¿Qué diferencia hay entre ROWS y RANGE en un acumulado? | ¿Cómo evitas la división entera en un porcentaje? | ¿Qué es una cohorte y qué mide la retención del mes 1?
---

:::analogia En palabras simples
Piensa en la libreta de un almacén. Cada día anotas lo que vendiste (el **total del período**), al lado lo que llevas vendido en el mes (el **acumulado**), y con lápiz rojo cuánto subiste o bajaste respecto de ayer (el **crecimiento**). Una función de ventana es esa columna extra que mira las filas de arriba sin borrar ninguna.
:::

## Primero el grano, después la ventana

El error más común es aplicar la ventana sobre la tabla de detalle. Si quieres ventas **por mes**, primero agregas a una fila por mes y recién ahí aplicas `SUM() OVER`, `LAG` o `AVG() OVER`.

```sql
WITH mensual AS (
  SELECT substr(p.fecha_pedido, 1, 7) AS mes,
         ROUND(SUM(d.cantidad * d.precio_unitario * (1 - d.descuento)), 2) AS ventas
  FROM pedidos p
  JOIN detalle_pedidos d ON d.pedido_id = p.pedido_id
  WHERE p.estado <> 'cancelado' AND p.fecha_pedido >= '2024-01-01' AND p.fecha_pedido < '2025-01-01'
  GROUP BY substr(p.fecha_pedido, 1, 7)
)
SELECT mes, ventas,
       SUM(ventas) OVER (ORDER BY mes ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS acumulado,
       LAG(ventas) OVER (ORDER BY mes) AS mes_anterior,
       ROUND(AVG(ventas) OVER (ORDER BY mes ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 2) AS movil_3m
FROM mensual
ORDER BY mes;
```

| Pregunta | Ventana |
|---|---|
| Acumulado del año | `SUM(x) OVER (ORDER BY mes ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)` |
| Acumulado que se reinicia cada año | Agrega `PARTITION BY anio` |
| Promedio móvil de 3 períodos | `AVG(x) OVER (ORDER BY mes ROWS BETWEEN 2 PRECEDING AND CURRENT ROW)` |
| Período anterior | `LAG(x) OVER (ORDER BY mes)` |
| Mismo mes del año anterior | `LAG(x, 12) OVER (ORDER BY mes)` si no faltan meses, o un self-join por mes − 12 |
| Porcentaje del total | `x * 100.0 / SUM(x) OVER ()` |

:::cuidado ROWS y RANGE no son lo mismo
Si escribes solo `SUM(x) OVER (ORDER BY fecha)`, el marco por defecto es `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`: las filas con la **misma fecha** se suman todas juntas y el acumulado "salta". Con una fila por período da igual, pero sobre datos de detalle cambia el resultado. Escribe el marco `ROWS` explícito y no dependas del valor por defecto.
:::

## Crecimiento sin trampas

```sql norun
ROUND(100.0 * (ventas - LAG(ventas) OVER (ORDER BY mes)) / NULLIF(LAG(ventas) OVER (ORDER BY mes), 0), 1)
```

- `100.0` (no `100`) evita la **división entera**: en SQLite y PostgreSQL, `7 / 2` da `3`.
- `NULLIF(..., 0)` evita dividir por cero si un mes tuvo ventas 0: el resultado queda `NULL`.
- El primer mes no tiene anterior: `LAG` da `NULL` y el crecimiento también. Dilo en la entrevista.

## Sesiones por inactividad

Una sesión termina cuando pasan más de 30 minutos sin actividad. Se arma en tres capas:

1. `LAG(fecha_hora)` trae el evento anterior del mismo cliente.
2. Una marca `nueva = 1` cuando no hay anterior o pasaron más de 30 minutos.
3. La **suma acumulada** de esa marca numera las sesiones: 1, 1, 1, 2, 2, 3…

Las diferencias de tiempo se calculan con `julianday`: `(julianday(b) - julianday(a)) * 1440` son minutos (un día tiene 1440).

## Retención por cohorte

Una **cohorte** es el grupo de clientes que hicieron su primera compra en el mismo mes. La **retención del mes 1** es qué porcentaje de esa cohorte volvió a comprar en el mes siguiente.

```sql
WITH primero AS (
  SELECT cliente_id, MIN(substr(fecha_pedido, 1, 7)) AS cohorte
  FROM pedidos WHERE estado <> 'cancelado' GROUP BY cliente_id
),
actividad AS (
  SELECT DISTINCT cliente_id, substr(fecha_pedido, 1, 7) AS mes
  FROM pedidos WHERE estado <> 'cancelado'
)
SELECT p.cohorte,
       COUNT(DISTINCT p.cliente_id) AS clientes,
       COUNT(DISTINCT CASE WHEN a.mes = substr(date(p.cohorte || '-01', '+1 month'), 1, 7)
                           THEN a.cliente_id END) AS volvieron_mes1
FROM primero p
LEFT JOIN actividad a ON a.cliente_id = p.cliente_id
GROUP BY p.cohorte
ORDER BY p.cohorte;
```

:::tip Cómo contarlo en voz alta
"Primero fijo la cohorte de cada cliente con su primera compra. Después armo una tabla de actividad cliente-mes sin duplicados. Al unirlas, para cada cohorte cuento clientes distintos y, con un `CASE`, los que tienen actividad justo un mes después."
:::

:::practica sql El tablero mensual completo en una consulta
1. Ejecuta: una fila por mes de 2024 con ventas, acumulado, mes anterior y promedio móvil.
2. Verifica a mano la fila de marzo: el acumulado debe ser enero + febrero + marzo.
3. Agrega una columna de crecimiento porcentual con `NULLIF` y comprueba que enero queda en `NULL`.

```sql
WITH mensual AS (
  SELECT substr(p.fecha_pedido, 1, 7) AS mes,
         ROUND(SUM(d.cantidad * d.precio_unitario * (1 - d.descuento)), 2) AS ventas
  FROM pedidos p
  JOIN detalle_pedidos d ON d.pedido_id = p.pedido_id
  WHERE p.estado <> 'cancelado' AND p.fecha_pedido >= '2024-01-01' AND p.fecha_pedido < '2025-01-01'
  GROUP BY substr(p.fecha_pedido, 1, 7)
)
SELECT mes, ventas,
       ROUND(SUM(ventas) OVER (ORDER BY mes ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW), 2) AS acumulado,
       LAG(ventas) OVER (ORDER BY mes) AS mes_anterior,
       ROUND(AVG(ventas) OVER (ORDER BY mes ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 2) AS movil_3m
FROM mensual
ORDER BY mes;
```

Reto: quita el filtro de año, agrega `substr(mes, 1, 4) AS anio` y haz que el acumulado se reinicie cada año con `PARTITION BY`.

Documentación oficial: [Marcos de ventana (SQLite)](https://www.sqlite.org/windowfunctions.html#frame_specifications) · [Funciones de ventana (DuckDB)](https://duckdb.org/docs/current/sql/functions/window_functions) · [Window functions (PostgreSQL)](https://www.postgresql.org/docs/current/functions-window.html)
:::

:::errores
- **Ventana sobre la tabla de detalle.** Agrega primero al grano pedido.
- **División entera.** Multiplica por `100.0`, no por `100`.
- **Dividir por cero.** Usa `NULLIF(denominador, 0)`.
- **LAG(x, 12) con meses faltantes.** Si falta un mes, el desfase de 12 filas ya no es "hace un año". Asegura un calendario completo o usa un join por fecha.
- **Contar filas en vez de clientes en la retención.** Siempre `COUNT(DISTINCT cliente_id)`.
:::

:::entrevista
**Pregunta:** "La retención de la cohorte de diciembre es mucho más baja. ¿Es un problema?"

**Respuesta modelo:** "Antes de concluir, revisaría tres cosas: si la cohorte está completa (si diciembre es el último mes de datos, el mes 1 todavía no ocurrió), el tamaño de la cohorte (con 40 clientes, 5 puntos son 2 personas) y la estacionalidad: quien compra regalos en diciembre suele volver menos en enero. Lo compararía con diciembre del año anterior."
:::

## Ejercicios

:::ejercicio sql dificultad=Avanzado titulo="Ventas mensuales y acumulado de 2024"
Devuelve una fila por mes de 2024 con las ventas del mes (pedidos no cancelados, `cantidad * precio_unitario * (1 - descuento)`, redondeado a 2) y el acumulado del año, también redondeado a 2. Columnas: `mes` (texto `AAAA-MM`), `ventas`, `acumulado`.
```sql solucion
WITH m AS (
  SELECT substr(p.fecha_pedido, 1, 7) AS mes,
         ROUND(SUM(d.cantidad * d.precio_unitario * (1 - d.descuento)), 2) AS ventas
  FROM pedidos p JOIN detalle_pedidos d ON d.pedido_id = p.pedido_id
  WHERE p.estado <> 'cancelado' AND p.fecha_pedido >= '2024-01-01' AND p.fecha_pedido < '2025-01-01'
  GROUP BY substr(p.fecha_pedido, 1, 7)
)
SELECT mes, ventas,
       ROUND(SUM(ventas) OVER (ORDER BY mes ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW), 2) AS acumulado
FROM m;
```
```pista
Primero una CTE con una fila por mes (`substr(fecha_pedido, 1, 7)`).
```
```pista
El acumulado es `SUM(ventas) OVER (ORDER BY mes ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)`.
```
:::

:::ejercicio sql dificultad=Avanzado titulo="Crecimiento mes a mes"
Con las mismas ventas mensuales de 2024, calcula el **crecimiento porcentual** respecto del mes anterior, redondeado a 1 decimal (enero queda en `NULL`). Columnas: `mes`, `ventas`, `crecimiento_pct`.
```sql solucion
WITH m AS (
  SELECT substr(p.fecha_pedido, 1, 7) AS mes,
         ROUND(SUM(d.cantidad * d.precio_unitario * (1 - d.descuento)), 2) AS ventas
  FROM pedidos p JOIN detalle_pedidos d ON d.pedido_id = p.pedido_id
  WHERE p.estado <> 'cancelado' AND p.fecha_pedido >= '2024-01-01' AND p.fecha_pedido < '2025-01-01'
  GROUP BY substr(p.fecha_pedido, 1, 7)
)
SELECT mes, ventas,
       ROUND(100.0 * (ventas - LAG(ventas) OVER (ORDER BY mes)) / NULLIF(LAG(ventas) OVER (ORDER BY mes), 0), 1) AS crecimiento_pct
FROM m;
```
```pista
`LAG(ventas) OVER (ORDER BY mes)` es el mes anterior. Crecimiento = (actual − anterior) / anterior × 100.
```
```pista
Usa `100.0` para evitar la división entera y `NULLIF(anterior, 0)` para no dividir por cero.
```
:::

:::ejercicio sql dificultad=Avanzado titulo="Participación de cada canal en 2024"
Para cada canal, cuenta los pedidos de 2024 (cualquier estado) y su **porcentaje sobre el total** de pedidos de 2024, redondeado a 1 decimal. Columnas: `canal`, `pedidos`, `pct`.
```sql solucion
SELECT canal, COUNT(*) AS pedidos,
       ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS pct
FROM pedidos
WHERE fecha_pedido >= '2024-01-01' AND fecha_pedido < '2025-01-01'
GROUP BY canal;
```
```pista
`SUM(COUNT(*)) OVER ()` suma los conteos de todos los grupos: una ventana sin `PARTITION BY` ni `ORDER BY` mira todas las filas del resultado agrupado.
```
:::

:::ejercicio sql dificultad=Avanzado titulo="Promedio móvil de 3 meses"
Con las ventas mensuales de 2024, calcula el **promedio móvil de 3 meses** (el mes actual y los dos anteriores; en enero y febrero se promedian los meses disponibles), redondeado a 2. Columnas: `mes`, `ventas`, `movil_3m`.
```sql solucion
WITH m AS (
  SELECT substr(p.fecha_pedido, 1, 7) AS mes,
         ROUND(SUM(d.cantidad * d.precio_unitario * (1 - d.descuento)), 2) AS ventas
  FROM pedidos p JOIN detalle_pedidos d ON d.pedido_id = p.pedido_id
  WHERE p.estado <> 'cancelado' AND p.fecha_pedido >= '2024-01-01' AND p.fecha_pedido < '2025-01-01'
  GROUP BY substr(p.fecha_pedido, 1, 7)
)
SELECT mes, ventas,
       ROUND(AVG(ventas) OVER (ORDER BY mes ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 2) AS movil_3m
FROM m;
```
```pista
El marco es `ROWS BETWEEN 2 PRECEDING AND CURRENT ROW`: tres filas como máximo.
```
:::

:::ejercicio sql dificultad=Experto titulo="Sesiones de navegación con inicio, fin y eventos"
Arma las sesiones de `eventos_web` (solo eventos con `cliente_id`): una sesión nueva empieza en el primer evento del cliente o cuando pasaron **más de 30 minutos** desde su evento anterior. Devuelve una fila por sesión. Columnas: `cliente_id`, `sesion` (1, 2, 3… dentro de cada cliente), `inicio`, `fin`, `eventos`.
```sql solucion
WITH e AS (
  SELECT cliente_id, evento_id, fecha_hora,
         LAG(fecha_hora) OVER (PARTITION BY cliente_id ORDER BY fecha_hora, evento_id) AS anterior
  FROM eventos_web WHERE cliente_id IS NOT NULL
),
m AS (
  SELECT cliente_id, evento_id, fecha_hora,
         CASE WHEN anterior IS NULL OR (julianday(fecha_hora) - julianday(anterior)) * 1440 > 30 THEN 1 ELSE 0 END AS nueva
  FROM e
),
s AS (
  SELECT cliente_id, fecha_hora,
         SUM(nueva) OVER (PARTITION BY cliente_id ORDER BY fecha_hora, evento_id ROWS UNBOUNDED PRECEDING) AS sesion
  FROM m
)
SELECT cliente_id, sesion, MIN(fecha_hora) AS inicio, MAX(fecha_hora) AS fin, COUNT(*) AS eventos
FROM s GROUP BY cliente_id, sesion;
```
```pista
Capa 1: `LAG(fecha_hora)` por cliente. Capa 2: marca 1 si no hay anterior o la diferencia en minutos (`(julianday(b) - julianday(a)) * 1440`) es mayor que 30.
```
```pista
Capa 3: la suma acumulada de la marca es el número de sesión. Al final agrupa por cliente y sesión.
```
:::

:::ejercicio sql dificultad=Experto titulo="Retención del mes 1 por cohorte de 2023"
Para cada cohorte de primera compra de **2023** (mes del primer pedido no cancelado del cliente), devuelve cuántos clientes tiene, cuántos volvieron a comprar (pedido no cancelado) **en el mes siguiente** y el porcentaje, redondeado a 1. Columnas: `cohorte` (`AAAA-MM`), `clientes`, `volvieron_mes1`, `retencion_pct`.
```sql solucion
WITH primero AS (
  SELECT cliente_id, MIN(substr(fecha_pedido, 1, 7)) AS cohorte
  FROM pedidos WHERE estado <> 'cancelado' GROUP BY cliente_id
),
actividad AS (
  SELECT DISTINCT cliente_id, substr(fecha_pedido, 1, 7) AS mes
  FROM pedidos WHERE estado <> 'cancelado'
),
r AS (
  SELECT p.cohorte,
         COUNT(DISTINCT p.cliente_id) AS clientes,
         COUNT(DISTINCT CASE WHEN a.mes = substr(date(p.cohorte || '-01', '+1 month'), 1, 7) THEN a.cliente_id END) AS volvieron_mes1
  FROM primero p LEFT JOIN actividad a ON a.cliente_id = p.cliente_id
  WHERE p.cohorte BETWEEN '2023-01' AND '2023-12'
  GROUP BY p.cohorte
)
SELECT cohorte, clientes, volvieron_mes1, ROUND(100.0 * volvieron_mes1 / clientes, 1) AS retencion_pct FROM r;
```
```pista
La cohorte es el `MIN` del mes de compra de cada cliente. La actividad es una tabla `DISTINCT` cliente-mes.
```
```pista
El mes siguiente a la cohorte: `substr(date(cohorte || '-01', '+1 month'), 1, 7)`. Cuéntalo con `COUNT(DISTINCT CASE WHEN ... THEN cliente_id END)`.
```
:::
