---
titulo: "Caso 📦 Mercurio: stock, quiebres y entregas a tiempo"
nivel: Experto
duracion: 55
resumen: Stock a partir de movimientos, quiebres de stock, rotación, entregas a tiempo por transportista y costo por envío.
---

**Mercurio Logística** gestiona seis almacenes y despacha envíos con cuatro transportistas. No guarda el stock en una tabla: guarda **movimientos** (como un extracto bancario) y el stock se **calcula**.

## El modelo de datos

```text
logistica_almacenes (almacen_id, ciudad, capacidad_unidades)
logistica_movimientos (movimiento_id, almacen_id, sku, fecha, tipo, cantidad)   -- entrada (+), salida (-), ajuste (-)
logistica_envios (envio_id, almacen_id, ciudad_destino, transportista,
                  fecha_despacho, fecha_prometida, fecha_entrega, costo, estado)
```

- **Stock** de un SKU en un almacén a una fecha = suma de `cantidad` de sus movimientos hasta esa fecha (inclusive).
- **Quiebre de stock**: días en que el stock quedó **negativo** (se registraron salidas sin mercadería: un error operativo grave).
- Un envío es **a tiempo** si se entregó el día prometido o antes: `date(fecha_entrega) <= fecha_prometida`.

## Ejercicios

:::ejercicio sql titulo="Stock al cierre del año"
Stock al `2024-12-31` por almacén y SKU. Columnas: `almacen_id`, `sku`, `stock`.
```sql solucion
SELECT almacen_id, sku, SUM(cantidad) AS stock
FROM logistica_movimientos
WHERE fecha <= '2024-12-31'
GROUP BY almacen_id, sku;
```
:::

:::ejercicio sql titulo="Días con quiebre de stock"
Usando el stock acumulado **al final de cada día**, cuenta para cada almacén y SKU cuántos días terminaron con stock negativo. Devuelve solo los que tuvieron al menos un día así. Columnas: `almacen_id`, `sku`, `dias_quiebre`.
```sql solucion
WITH diario AS (
  SELECT almacen_id, sku, fecha, SUM(cantidad) AS neto
  FROM logistica_movimientos GROUP BY almacen_id, sku, fecha
),
acum AS (
  SELECT almacen_id, sku, fecha,
         SUM(neto) OVER (PARTITION BY almacen_id, sku ORDER BY fecha ROWS UNBOUNDED PRECEDING) AS stock
  FROM diario
)
SELECT almacen_id, sku, COUNT(*) AS dias_quiebre
FROM acum WHERE stock < 0
GROUP BY almacen_id, sku;
```
```pista
Primero suma los movimientos de cada día (un día puede tener entrada y salida). Después acumula con una ventana por almacén y SKU ordenada por fecha.
```
:::

:::ejercicio sql ordenado titulo="SKUs que más rotan"
Las **unidades despachadas** (salidas, en positivo) por SKU en todo el año, en todos los almacenes: `sku`, `unidades`. Devuelve los 5 con más unidades (desempata por `sku`).
```sql solucion
SELECT sku, -SUM(cantidad) AS unidades
FROM logistica_movimientos WHERE tipo = 'salida'
GROUP BY sku
ORDER BY unidades DESC, sku
LIMIT 5;
```
:::

:::ejercicio sql ordenado titulo="Puntualidad por transportista"
Para los envíos **entregados**, por `transportista`: `envios`, `a_tiempo` y `pct_a_tiempo` (redondeado a 2), y el retraso promedio en días de los que llegaron tarde (`dias_retraso_promedio`, redondeado a 2). Ordena por puntualidad descendente.
```sql solucion
SELECT transportista, COUNT(*) AS envios,
       SUM(CASE WHEN date(fecha_entrega) <= fecha_prometida THEN 1 ELSE 0 END) AS a_tiempo,
       ROUND(100.0 * SUM(CASE WHEN date(fecha_entrega) <= fecha_prometida THEN 1 ELSE 0 END) / COUNT(*), 2) AS pct_a_tiempo,
       ROUND(AVG(CASE WHEN date(fecha_entrega) > fecha_prometida THEN julianday(date(fecha_entrega)) - julianday(fecha_prometida) END), 2) AS dias_retraso_promedio
FROM logistica_envios
WHERE estado = 'entregado'
GROUP BY transportista
ORDER BY pct_a_tiempo DESC;
```
```pista
`AVG(CASE WHEN tarde THEN dias END)` promedia solo los tardíos: los demás quedan en NULL y `AVG` los ignora.
```
:::

:::ejercicio sql ordenado titulo="Costo por envío exitoso"
El costo de los envíos **devueltos** y **perdidos** también se paga. Por transportista, calcula el costo total (`costo_total`) y el **costo por envío entregado** (`costo_por_entregado` = costo total / entregados). Redondea a 2. Ordena por costo por entregado ascendente.
```sql solucion
SELECT transportista, ROUND(SUM(costo), 2) AS costo_total,
       ROUND(SUM(costo) / SUM(CASE WHEN estado = 'entregado' THEN 1 ELSE 0 END), 2) AS costo_por_entregado
FROM logistica_envios
GROUP BY transportista
ORDER BY costo_por_entregado;
```
:::

:::ejercicio sql ordenado titulo="Envíos por día y pico semanal"
Para cada almacén, ¿qué **día de la semana** despacha más envíos en promedio? Calcula envíos por fecha de despacho, promedia por día de la semana y quédate con el máximo de cada almacén. Columnas: `almacen_id`, `dia_semana` (0 = domingo … 6 = sábado), `promedio_envios` (redondeado a 2). Ordena por almacén.
```sql solucion
WITH d AS (
  SELECT almacen_id, date(fecha_despacho) AS dia, CAST(strftime('%w', fecha_despacho) AS INTEGER) AS dia_semana, COUNT(*) AS n
  FROM logistica_envios GROUP BY almacen_id, dia
),
p AS (
  SELECT almacen_id, dia_semana, AVG(n) AS prom FROM d GROUP BY almacen_id, dia_semana
),
r AS (SELECT *, ROW_NUMBER() OVER (PARTITION BY almacen_id ORDER BY prom DESC, dia_semana) AS rn FROM p)
SELECT almacen_id, dia_semana, ROUND(prom, 2) AS promedio_envios FROM r WHERE rn = 1 ORDER BY almacen_id;
```
:::
