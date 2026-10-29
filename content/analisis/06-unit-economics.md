---
titulo: Unit economics - MRR, retención neta y lo que deja cada pedido
nivel: Avanzado
duracion: 55
resumen: Las métricas que miran los inversores y la dirección - MRR y su cascada (nuevo, expansión, contracción, bajas y reactivación) en un SaaS, retención neta de ingresos (NRR), ARPA, un LTV simple, y la economía de un pedido de delivery (ingreso, costo de cupones y contribución).
objetivos: Calcular el MRR y clasificar sus movimientos mes a mes | Calcular la retención neta de ingresos | Estimar un LTV simple a partir de ARPA y churn | Calcular la contribución por pedido en un marketplace
autoevaluacion: ¿Sabes qué es expansión y contracción del MRR? | ¿Sabes calcular la NRR? | ¿Sabes qué le queda a la plataforma de cada pedido?
---

:::escenario
Nube Pyme va a pedir inversión. El fondo no pregunta “¿cuánto facturan?”, pregunta “¿cuánto de lo que facturaban hace un año siguen facturando hoy, contando las mejoras de plan y las bajas?”. Esa es la retención neta. Si supera el 100 %, el negocio crece aunque no consiga ni un cliente nuevo.
:::

## MRR y su cascada

El **MRR** (ingreso recurrente mensual) es la suma de las facturas del mes. Mes contra mes, cada empresa cae en un movimiento:

| Movimiento | Mes anterior | Mes actual |
|---|---|---|
| Nuevo | no facturó nunca | factura |
| Reactivación | no facturó (pero sí antes) | factura |
| Expansión | facturó X | factura más de X |
| Contracción | facturó X | factura menos de X (más de 0) |
| Baja (churn) | facturó X | no factura |

```sql
WITH f AS (SELECT empresa_id, mes, SUM(monto) AS mrr FROM saas_facturas GROUP BY empresa_id, mes)
SELECT a.mes, a.empresa_id, b.mrr AS mrr_anterior, a.mrr AS mrr_actual
FROM f a
LEFT JOIN f b ON b.empresa_id = a.empresa_id AND b.mes = date(a.mes, '-1 month')
WHERE a.mes = '2024-06-01'
LIMIT 5;
```

:::cuidado LAG no alcanza
`LAG(mrr) OVER (PARTITION BY empresa_id ORDER BY mes)` trae la **última** factura anterior, aunque haya sido hace cinco meses. Para comparar con el mes calendario anterior, únelo por `mes = date(mes, '-1 month')`.
:::

## Retención neta de ingresos (NRR)

NRR = MRR de hoy **de las empresas que ya pagaban hace 12 meses** ÷ MRR de esas empresas hace 12 meses. Incluye expansiones, contracciones y bajas; **no** incluye clientes nuevos.

## LTV simple

Un LTV de servilleta: `ARPA × margen bruto ÷ churn mensual`. Con ARPA de 200, margen de 80 % y churn de 2 % mensual, el LTV es 200 × 0,8 ÷ 0,02 = 8.000. Sirve para compararlo con el costo de conseguir un cliente (CAC).

## La economía de un pedido de delivery

Para la plataforma, cada pedido entregado deja: comisión del restaurante + costo de envío − cupón que pagó la plataforma. Esa diferencia es la **contribución** (antes de pagarle al repartidor y de los costos fijos).

## Ejercicios

:::ejercicio sql ordenado dificultad=Básico
MRR de Nube Pyme por mes de 2024 (suma de todas las facturas del mes, sin importar el estado). Columnas: `mes`, `mrr`. Ordena por mes.
```sql solucion
SELECT mes, SUM(monto) AS mrr FROM saas_facturas WHERE mes >= '2024-01-01' AND mes < '2025-01-01' GROUP BY mes ORDER BY mes;
```
:::

:::ejercicio sql dificultad=Básico
MRR de diciembre de 2024 por plan (nombre del plan). Columnas: `plan`, `empresas`, `mrr`.
```sql solucion
SELECT pl.nombre AS plan, COUNT(*) AS empresas, SUM(f.monto) AS mrr
FROM saas_facturas f JOIN saas_planes pl ON pl.plan_id = f.plan_id
WHERE f.mes = '2024-12-01'
GROUP BY pl.nombre;
```
:::

:::ejercicio sql ordenado dificultad=Intermedio
Empresas **nuevas** por mes de 2024: su primera factura histórica es de ese mes. Columnas: `mes`, `nuevas`. Ordena por mes.
```pista
`MIN(mes)` por empresa es su mes de alta como cliente.
```
```sql solucion
SELECT primera AS mes, COUNT(*) AS nuevas
FROM (SELECT empresa_id, MIN(mes) AS primera FROM saas_facturas GROUP BY empresa_id) AS t
WHERE primera >= '2024-01-01' AND primera < '2025-01-01'
GROUP BY primera
ORDER BY primera;
```
:::

:::ejercicio sql ordenado dificultad=Intermedio
Empresas **dadas de baja** por mes de 2024: facturaron el mes anterior y no facturaron en el mes. Columnas: `mes`, `bajas`. Ordena por mes. (Enero cuenta las que facturaron en diciembre de 2023 y no en enero.)
```pista
Para cada factura del mes anterior, busca con `LEFT JOIN` la del mes siguiente de la misma empresa; si no está, es baja en ese mes siguiente.
```
```sql solucion
WITH f AS (SELECT DISTINCT empresa_id, mes FROM saas_facturas)
SELECT date(a.mes, '+1 month') AS mes, COUNT(*) AS bajas
FROM f a
LEFT JOIN f b ON b.empresa_id = a.empresa_id AND b.mes = date(a.mes, '+1 month')
WHERE b.empresa_id IS NULL AND a.mes >= '2023-12-01' AND a.mes < '2024-12-01'
GROUP BY date(a.mes, '+1 month')
ORDER BY mes;
```
:::

:::ejercicio sql dificultad=Intermedio
Churn de **logos** (empresas) de 2024: bajas del año (como en el ejercicio anterior) ÷ empresas que facturaron en diciembre de 2023, en porcentaje con 2 decimales. Columna: `churn_logos_pct`.
```pista
No es lo mismo que el promedio mensual: es la proporción anual sobre la base de inicio de año. Para este ejercicio, cuenta las bajas mensuales de 2024 y divídelas por las empresas activas en diciembre de 2023.
```
```sql solucion
WITH f AS (SELECT DISTINCT empresa_id, mes FROM saas_facturas),
bajas AS (
  SELECT COUNT(*) AS n FROM f a
  LEFT JOIN f b ON b.empresa_id = a.empresa_id AND b.mes = date(a.mes, '+1 month')
  WHERE b.empresa_id IS NULL AND a.mes >= '2023-12-01' AND a.mes < '2024-12-01'
),
base AS (SELECT COUNT(*) AS n FROM f WHERE mes = '2023-12-01')
SELECT ROUND(100.0 * bajas.n / base.n, 2) AS churn_logos_pct FROM bajas, base;
```
:::

:::ejercicio sql dificultad=Avanzado
**Expansión** de MRR de 2024: suma de los aumentos (MRR del mes − MRR del mes anterior) de las empresas que facturaron en ambos meses y facturaron más. Columna: `expansion`.
```pista
Une cada (empresa, mes) con el mes anterior de la misma empresa con un `JOIN` (no LEFT: tiene que haber facturado en los dos).
```
```sql solucion
WITH f AS (SELECT empresa_id, mes, SUM(monto) AS mrr FROM saas_facturas GROUP BY empresa_id, mes)
SELECT SUM(a.mrr - b.mrr) AS expansion
FROM f a JOIN f b ON b.empresa_id = a.empresa_id AND b.mes = date(a.mes, '-1 month')
WHERE a.mes >= '2024-01-01' AND a.mes < '2025-01-01' AND a.mrr > b.mrr;
```
:::

:::ejercicio sql dificultad=Avanzado
Cascada de MRR de **junio de 2024**: clasifica cada empresa que facturó en mayo o en junio en `nuevo`, `reactivación`, `expansión`, `contracción`, `baja` o `sin cambio`, y suma el cambio de MRR de cada grupo. Columnas: `movimiento`, `empresas`, `cambio_mrr`.
```pista
Arma el universo con las empresas de mayo **unidas** a las de junio (UNION), y trae con `LEFT JOIN` el MRR de mayo, el de junio y si facturó alguna vez antes de junio.
```
```pista
Orden del `CASE`: sin mayo y con junio → nuevo o reactivación (según si facturó antes de mayo); con mayo y sin junio → baja; después expansión, contracción o sin cambio.
```
```sql solucion
WITH f AS (SELECT empresa_id, mes, SUM(monto) AS mrr FROM saas_facturas GROUP BY empresa_id, mes),
u AS (SELECT empresa_id FROM f WHERE mes = '2024-05-01' UNION SELECT empresa_id FROM f WHERE mes = '2024-06-01'),
x AS (
  SELECT u.empresa_id,
         COALESCE((SELECT mrr FROM f WHERE f.empresa_id = u.empresa_id AND mes = '2024-05-01'), 0) AS antes,
         COALESCE((SELECT mrr FROM f WHERE f.empresa_id = u.empresa_id AND mes = '2024-06-01'), 0) AS ahora,
         (SELECT COUNT(*) FROM f WHERE f.empresa_id = u.empresa_id AND mes < '2024-05-01') AS historia
  FROM u
)
SELECT CASE WHEN antes = 0 AND historia = 0 THEN 'nuevo'
            WHEN antes = 0 THEN 'reactivación'
            WHEN ahora = 0 THEN 'baja'
            WHEN ahora > antes THEN 'expansión'
            WHEN ahora < antes THEN 'contracción'
            ELSE 'sin cambio' END AS movimiento,
       COUNT(*) AS empresas,
       SUM(ahora - antes) AS cambio_mrr
FROM x
GROUP BY movimiento;
```
:::

:::ejercicio sql dificultad=Avanzado
**NRR** de 2024: MRR de diciembre de 2024 de las empresas que facturaron en diciembre de 2023, dividido por el MRR de diciembre de 2023 de esas mismas empresas. Porcentaje con 1 decimal. Columna: `nrr_pct`.
```pista
La base son las empresas de diciembre de 2023. Trae su MRR de diciembre de 2024 con `LEFT JOIN` (las que se fueron suman 0).
```
```sql solucion
WITH f AS (SELECT empresa_id, mes, SUM(monto) AS mrr FROM saas_facturas GROUP BY empresa_id, mes),
base AS (SELECT empresa_id, mrr FROM f WHERE mes = '2023-12-01')
SELECT ROUND(100.0 * SUM(COALESCE(h.mrr, 0)) / SUM(b.mrr), 1) AS nrr_pct
FROM base b LEFT JOIN f h ON h.empresa_id = b.empresa_id AND h.mes = '2024-12-01';
```
:::

:::ejercicio sql dificultad=Avanzado
LTV simple de Nube Pyme: ARPA de diciembre de 2024 (MRR ÷ empresas que facturaron) × margen bruto de 80 % ÷ churn mensual de logos de diciembre de 2024 (empresas de noviembre que no facturaron en diciembre ÷ empresas de noviembre). Redondea a 0 decimales. Columnas: `arpa` (2 decimales), `churn_mensual_pct` (2 decimales), `ltv`.
```pista
Calcula ARPA y churn en dos CTE y combínalos en la consulta final.
```
```sql solucion
WITH f AS (SELECT empresa_id, mes, SUM(monto) AS mrr FROM saas_facturas GROUP BY empresa_id, mes),
arpa AS (SELECT SUM(mrr) * 1.0 / COUNT(*) AS v FROM f WHERE mes = '2024-12-01'),
churn AS (
  SELECT 1.0 * SUM(CASE WHEN d.empresa_id IS NULL THEN 1 ELSE 0 END) / COUNT(*) AS v
  FROM f n LEFT JOIN f d ON d.empresa_id = n.empresa_id AND d.mes = '2024-12-01'
  WHERE n.mes = '2024-11-01'
)
SELECT ROUND(arpa.v, 2) AS arpa, ROUND(100 * churn.v, 2) AS churn_mensual_pct, ROUND(arpa.v * 0.8 / churn.v, 0) AS ltv FROM arpa, churn;
```
:::

:::ejercicio sql ordenado dificultad=Avanzado
Delivery (Rápido). Contribución promedio por pedido **entregado** según la plataforma del cliente: (comisión del restaurante `subtotal × comision_pct / 100` + `costo_envio` − `descuento_cupon`), 2 decimales. Columnas: `plataforma`, `pedidos`, `contribucion_promedio`. Ordena por contribución de mayor a menor.
```sql solucion
SELECT c.plataforma, COUNT(*) AS pedidos,
       ROUND(AVG(p.subtotal * r.comision_pct / 100 + p.costo_envio - p.descuento_cupon), 2) AS contribucion_promedio
FROM delivery_pedidos p
JOIN delivery_restaurantes r ON r.restaurante_id = p.restaurante_id
JOIN delivery_clientes c ON c.cliente_id = p.cliente_id
WHERE p.estado = 'entregado'
GROUP BY c.plataforma
ORDER BY contribucion_promedio DESC;
```
:::

:::ejercicio sql ordenado dificultad=Intermedio
Telco (Conecta). ARPU de diciembre de 2024 por tipo de cliente: facturación total ÷ líneas con consumo en el mes, 2 decimales. Columnas: `tipo`, `lineas`, `arpu`. Ordena por `tipo`.
```sql solucion
SELECT c.tipo, COUNT(DISTINCT co.linea_id) AS lineas, ROUND(SUM(co.monto_facturado) / COUNT(DISTINCT co.linea_id), 2) AS arpu
FROM telco_consumos co
JOIN telco_lineas l ON l.linea_id = co.linea_id
JOIN telco_clientes c ON c.cliente_id = l.cliente_id
WHERE co.mes = '2024-12'
GROUP BY c.tipo
ORDER BY c.tipo;
```
:::
