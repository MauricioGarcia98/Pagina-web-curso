---
titulo: Cohortes, retención y churn
nivel: Avanzado
duracion: 55
resumen: Medir si los clientes vuelven - usuarios activos (DAU, MAU, stickiness), cohortes por mes de primera compra, la tabla de retención mes a mes, la tasa de bajas (churn) de una suscripción y la diferencia entre clientes nuevos, recurrentes y recuperados.
objetivos: Calcular usuarios activos diarios y mensuales | Asignar a cada cliente su cohorte de primera compra | Construir una tabla de retención por cohorte y mes | Calcular churn mensual sobre la base correcta
autoevaluacion: ¿Sabes qué es una cohorte? | ¿Sabes armar la tabla de retención? | ¿Sabes sobre qué base se calcula el churn de un mes?
---

:::escenario
Marketing celebra: “¡este mes ganamos 400 clientes nuevos!”. Producto pregunta lo incómodo: “¿y cuántos de los 400 del mes pasado volvieron?”. Conseguir clientes cuesta caro; que vuelvan es lo que hace rentable el negocio. Las cohortes responden esa pregunta mes por mes.
:::

## Usuarios activos: DAU, MAU y stickiness

- **DAU**: usuarios distintos activos en un día. **MAU**: en un mes.
- **Stickiness** = DAU promedio ÷ MAU. Un 20 % significa que el usuario típico entra unos 6 días al mes.

```sql
-- usuarios activos por mes en los logins de la tienda
SELECT strftime('%Y-%m', fecha) AS mes, COUNT(DISTINCT cliente_id) AS mau
FROM logins
GROUP BY mes
ORDER BY mes;
```

```recorrido
titulo: DAU, MAU y stickiness de diciembre, paso a paso
estacion ev: Eventos | icono=reloj
estacion dau: DAU | icono=usuario
estacion mau: MAU | icono=capas
estacion ratio: DAU / MAU | icono=engranaje
estacion lectura: Lectura | icono=check
paso ev: Cada evento tiene un cliente y un día
"Activo" se define por **haber hecho algo**: aquí, cualquier evento en la web con cliente identificado.
>>> tabla
cliente_id,fecha_hora,tipo_evento
1146,2024-12-01 07:29:48,vista
1146,2024-12-01 07:38:01,vista
1146,2024-12-01 07:38:14,agregar_carrito
1146,2024-12-01 07:42:51,vista
paso dau: DAU: clientes distintos por día
`COUNT(DISTINCT cliente_id)` por día. Un cliente con 10 eventos en el día cuenta **una** vez.
>>> tabla
dia,dau
2024-12-01,10
2024-12-02,15
2024-12-03,4
2024-12-04,6
2024-12-05,5
paso mau: MAU: clientes distintos en el mes
No es la suma de los DAU: un cliente activo varios días se cuenta una sola vez en el mes.
>>> tabla
mau,suma_de_dau_incorrecta
255,296
paso ratio: Stickiness = DAU promedio / MAU
Qué parte de los clientes del mes vuelve un día cualquiera.
>>> tabla
dau_promedio,mau,stickiness_pct
9.5,255,3.7
paso lectura: Cómo se lee
Una tienda online tiene stickiness baja por naturaleza: la gente no compra todos los días. Una red social o una app de mensajería apunta a valores mucho más altos. Compara siempre contra tu propio historial y tu rubro.
>>> texto
stickiness = 100 %  → todos los del mes entran todos los días
stickiness ≈ 3,7 %  → un cliente típico entra ~1 día al mes (diciembre, arriba)
```

## Cohortes

Una **cohorte** es un grupo de clientes que empezó en el mismo período (por ejemplo, el mes de su primera compra). Se sigue a cada cohorte en el tiempo: ¿qué porcentaje sigue comprando 1, 2, 3 meses después?

```sql
WITH primera AS (
  SELECT cliente_id, MIN(fecha_pedido) AS primera_compra
  FROM pedidos
  GROUP BY cliente_id
)
SELECT strftime('%Y-%m', primera_compra) AS cohorte, COUNT(*) AS clientes
FROM primera
GROUP BY cohorte
ORDER BY cohorte
LIMIT 6;
```

### La tabla de retención

Para cada pedido, el **mes relativo** es cuántos meses pasaron desde la cohorte del cliente: 0 es el mes de la primera compra.

```sql
WITH primera AS (
  SELECT cliente_id, MIN(fecha_pedido) AS primera FROM pedidos GROUP BY cliente_id
), actividad AS (
  SELECT DISTINCT p.cliente_id,
         strftime('%Y-%m', f.primera) AS cohorte,
         (CAST(strftime('%Y', p.fecha_pedido) AS INTEGER) * 12 + CAST(strftime('%m', p.fecha_pedido) AS INTEGER))
       - (CAST(strftime('%Y', f.primera) AS INTEGER) * 12 + CAST(strftime('%m', f.primera) AS INTEGER)) AS mes_rel
  FROM pedidos p JOIN primera f ON f.cliente_id = p.cliente_id
)
SELECT cohorte, mes_rel, COUNT(*) AS clientes_activos
FROM actividad
WHERE cohorte BETWEEN '2024-01' AND '2024-03' AND mes_rel <= 3
GROUP BY cohorte, mes_rel
ORDER BY cohorte, mes_rel;
```

La retención del mes N es `clientes_activos(mes N) ÷ clientes de la cohorte (mes 0)`.

## Churn de una suscripción

En una suscripción, el **churn del mes** es: suscriptores que se dieron de baja en el mes ÷ suscriptores activos **al inicio** del mes. Dividir por los activos al final (o por el total histórico) es un error frecuente.

:::cuidado Cohortes incompletas
La cohorte de diciembre todavía no tuvo “mes 3”. En la tabla, esa celda no es 0 %: es “todavía no ocurrió”. Mostrarla como 0 hace pensar que la retención se desplomó.
:::

## Ejercicios

:::ejercicio sql ordenado dificultad=Básico
MAU de los logins de la tienda por mes de 2024. Columnas: `mes` (`'YYYY-MM'`), `mau`. Ordena por mes.
```sql solucion
SELECT strftime('%Y-%m', fecha) AS mes, COUNT(DISTINCT cliente_id) AS mau FROM logins GROUP BY mes ORDER BY mes;
```
:::

:::ejercicio sql dificultad=Intermedio
DAU promedio de marzo de 2024 en los logins: promedio de usuarios distintos por día, 2 decimales. Columna: `dau_promedio`.
```pista
Primero los usuarios por día (subconsulta), después el promedio.
```
```sql solucion
SELECT ROUND(AVG(dau), 2) AS dau_promedio
FROM (SELECT fecha, COUNT(DISTINCT cliente_id) AS dau FROM logins WHERE fecha >= '2024-03-01' AND fecha < '2024-04-01' GROUP BY fecha) AS t;
```
:::

:::ejercicio sql dificultad=Avanzado
Stickiness de marzo de 2024 (logins): DAU promedio ÷ MAU de marzo, en porcentaje con 1 decimal. Columna: `stickiness`.
```pista
Calcula el DAU promedio y el MAU en dos CTE (o subconsultas) y divide.
```
```sql solucion
WITH dau AS (
  SELECT AVG(n) AS dau FROM (SELECT fecha, COUNT(DISTINCT cliente_id) AS n FROM logins WHERE fecha >= '2024-03-01' AND fecha < '2024-04-01' GROUP BY fecha) AS t
), mau AS (
  SELECT COUNT(DISTINCT cliente_id) AS mau FROM logins WHERE fecha >= '2024-03-01' AND fecha < '2024-04-01'
)
SELECT ROUND(100.0 * dau / mau, 1) AS stickiness FROM dau, mau;
```
:::

:::ejercicio sql ordenado dificultad=Intermedio
Tamaño de las cohortes de la tienda de 2024: clientes cuya **primera compra** (cualquier estado) fue en cada mes de 2024. Columnas: `cohorte` (`'YYYY-MM'`), `clientes`. Ordena por cohorte.
```pista
La primera compra es `MIN(fecha_pedido)` por cliente; después filtra 2024 y agrupa por mes.
```
```sql solucion
WITH primera AS (SELECT cliente_id, MIN(fecha_pedido) AS primera FROM pedidos GROUP BY cliente_id)
SELECT strftime('%Y-%m', primera) AS cohorte, COUNT(*) AS clientes
FROM primera
WHERE primera >= '2024-01-01' AND primera < '2025-01-01'
GROUP BY cohorte
ORDER BY cohorte;
```
:::

:::ejercicio sql dificultad=Intermedio
Clientes nuevos y recurrentes de 2024: un cliente es `nuevo` si su primera compra histórica fue en 2024 y `recurrente` si ya había comprado antes. Cuenta solo a los clientes que compraron en 2024. Columnas: `tipo`, `clientes`.
```pista
Calcula la primera compra histórica por cliente y cruza con los que compraron en 2024.
```
```sql solucion
WITH primera AS (SELECT cliente_id, MIN(fecha_pedido) AS primera FROM pedidos GROUP BY cliente_id),
c2024 AS (SELECT DISTINCT cliente_id FROM pedidos WHERE fecha_pedido >= '2024-01-01' AND fecha_pedido < '2025-01-01')
SELECT CASE WHEN f.primera >= '2024-01-01' THEN 'nuevo' ELSE 'recurrente' END AS tipo, COUNT(*) AS clientes
FROM c2024 c JOIN primera f ON f.cliente_id = c.cliente_id
GROUP BY tipo;
```
:::

:::ejercicio sql ordenado dificultad=Avanzado
Tabla de retención de la tienda: para las cohortes de **enero, febrero y marzo de 2024**, cuántos clientes de cada cohorte compraron en los meses relativos 0 a 3. Columnas: `cohorte`, `mes_rel`, `clientes`. Ordena por cohorte y mes.
```pista
El mes relativo es (año × 12 + mes del pedido) − (año × 12 + mes de la primera compra).
```
```pista
Usa `DISTINCT cliente_id, cohorte, mes_rel` antes de contar: un cliente con dos pedidos en el mismo mes cuenta una vez.
```
```sql solucion
WITH primera AS (SELECT cliente_id, MIN(fecha_pedido) AS primera FROM pedidos GROUP BY cliente_id),
act AS (
  SELECT DISTINCT p.cliente_id, strftime('%Y-%m', f.primera) AS cohorte,
         (CAST(strftime('%Y', p.fecha_pedido) AS INTEGER) * 12 + CAST(strftime('%m', p.fecha_pedido) AS INTEGER))
       - (CAST(strftime('%Y', f.primera) AS INTEGER) * 12 + CAST(strftime('%m', f.primera) AS INTEGER)) AS mes_rel
  FROM pedidos p JOIN primera f ON f.cliente_id = p.cliente_id
)
SELECT cohorte, mes_rel, COUNT(*) AS clientes
FROM act
WHERE cohorte IN ('2024-01', '2024-02', '2024-03') AND mes_rel BETWEEN 0 AND 3
GROUP BY cohorte, mes_rel
ORDER BY cohorte, mes_rel;
```
:::

:::ejercicio sql ordenado dificultad=Avanzado
La misma tabla, ahora en **porcentaje** de la cohorte (1 decimal): `cohorte`, `mes_rel`, `retencion_pct`. El mes 0 siempre da 100.
```pista
Divide los activos de cada celda por los activos del mes 0 de su cohorte: `FIRST_VALUE(clientes) OVER (PARTITION BY cohorte ORDER BY mes_rel)` o un JOIN con el tamaño de la cohorte.
```
```sql solucion
WITH primera AS (SELECT cliente_id, MIN(fecha_pedido) AS primera FROM pedidos GROUP BY cliente_id),
act AS (
  SELECT DISTINCT p.cliente_id, strftime('%Y-%m', f.primera) AS cohorte,
         (CAST(strftime('%Y', p.fecha_pedido) AS INTEGER) * 12 + CAST(strftime('%m', p.fecha_pedido) AS INTEGER))
       - (CAST(strftime('%Y', f.primera) AS INTEGER) * 12 + CAST(strftime('%m', f.primera) AS INTEGER)) AS mes_rel
  FROM pedidos p JOIN primera f ON f.cliente_id = p.cliente_id
), celdas AS (
  SELECT cohorte, mes_rel, COUNT(*) AS clientes FROM act
  WHERE cohorte IN ('2024-01', '2024-02', '2024-03') AND mes_rel BETWEEN 0 AND 3
  GROUP BY cohorte, mes_rel
)
SELECT cohorte, mes_rel, ROUND(100.0 * clientes / FIRST_VALUE(clientes) OVER (PARTITION BY cohorte ORDER BY mes_rel), 1) AS retencion_pct
FROM celdas
ORDER BY cohorte, mes_rel;
```
:::

:::ejercicio sql dificultad=Intermedio
Streaming (Ritmo). ¿Cuántas suscripciones **pagas** (plan distinto de `gratis`) estaban activas el **1 de julio de 2024**? Activa = empezó ese día o antes y no terminó antes de ese día. Columna: `activas`.
```pista
`fecha_inicio <= '2024-07-01' AND (fecha_fin IS NULL OR fecha_fin >= '2024-07-01')`.
```
```sql solucion
SELECT COUNT(*) AS activas FROM streaming_suscripciones
WHERE plan <> 'gratis' AND fecha_inicio <= '2024-07-01' AND (fecha_fin IS NULL OR fecha_fin >= '2024-07-01');
```
:::

:::ejercicio sql dificultad=Avanzado
Churn de julio de 2024 en Ritmo (suscripciones pagas): bajas de julio (suscripciones pagas activas al 1 de julio cuya `fecha_fin` cae en julio y cuyo `motivo_baja` **no** es `cambio_plan`) ÷ suscripciones pagas activas al 1 de julio. Porcentaje con 2 decimales. Columna: `churn_pct`.
```pista
Un cambio de plan cierra una suscripción y abre otra: no es una baja del cliente.
```
```pista
Base: activas al 1 de julio. Numerador: de esa base, las que terminan entre el 1 y el 31 de julio con motivo distinto de `cambio_plan`.
```
```sql solucion
WITH base AS (
  SELECT * FROM streaming_suscripciones
  WHERE plan <> 'gratis' AND fecha_inicio <= '2024-07-01' AND (fecha_fin IS NULL OR fecha_fin >= '2024-07-01')
)
SELECT ROUND(100.0 * SUM(CASE WHEN fecha_fin >= '2024-07-01' AND fecha_fin < '2024-08-01' AND motivo_baja <> 'cambio_plan' THEN 1 ELSE 0 END) / COUNT(*), 2) AS churn_pct
FROM base;
```
:::

:::ejercicio sql ordenado dificultad=Avanzado
Ritmo: motivos de baja de 2024 (suscripciones con `fecha_fin` en 2024 y motivo distinto de `cambio_plan`), con la cantidad y el porcentaje sobre el total de bajas (1 decimal). Columnas: `motivo_baja`, `bajas`, `pct`. Ordena por `bajas` de mayor a menor.
```pista
`SUM(COUNT(*)) OVER ()` da el total de bajas en cada fila después del `GROUP BY`.
```
```sql solucion
SELECT motivo_baja, COUNT(*) AS bajas, ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS pct
FROM streaming_suscripciones
WHERE fecha_fin >= '2024-01-01' AND fecha_fin < '2025-01-01' AND motivo_baja <> 'cambio_plan'
GROUP BY motivo_baja
ORDER BY bajas DESC;
```
:::

:::ejercicio sql ordenado dificultad=Avanzado
Delivery (Rápido). Clientes **recuperados** por mes de 2024: compraron en el mes, **no** compraron en el mes anterior, pero sí en algún mes antes de ese. Columnas: `mes`, `recuperados`. Ordena por mes (enero no puede tener recuperados).
```pista
Arma la lista distinta de (cliente, mes) con pedidos y numera los meses como enteros (año × 12 + mes).
```
```pista
Con `LAG(mes_num) OVER (PARTITION BY cliente_id ORDER BY mes_num)`: es recuperado si el mes anterior con compra existe y es menor que `mes_num − 1`.
```
```sql solucion
WITH m AS (
  SELECT DISTINCT cliente_id, strftime('%Y-%m', creado) AS mes,
         CAST(strftime('%Y', creado) AS INTEGER) * 12 + CAST(strftime('%m', creado) AS INTEGER) AS mes_num
  FROM delivery_pedidos
), l AS (
  SELECT cliente_id, mes, mes_num, LAG(mes_num) OVER (PARTITION BY cliente_id ORDER BY mes_num) AS anterior FROM m
)
SELECT mes, SUM(CASE WHEN anterior IS NOT NULL AND anterior < mes_num - 1 THEN 1 ELSE 0 END) AS recuperados
FROM l
GROUP BY mes
ORDER BY mes;
```
:::
