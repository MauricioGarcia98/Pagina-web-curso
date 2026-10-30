---
titulo: Segmentar - histogramas, Pareto y RFM
nivel: Intermedio
duracion: 50
resumen: Cómo partir clientes y productos en grupos que sirvan para decidir - histogramas por rangos, la regla 80/20 con clasificación ABC, cuartiles con NTILE y el modelo RFM (recencia, frecuencia y monto) que usan los equipos de CRM.
objetivos: Armar histogramas con rangos de ancho fijo | Calcular el aporte acumulado y clasificar productos en A, B y C | Repartir clientes en cuartiles con NTILE | Construir un puntaje RFM y nombrar segmentos accionables
autoevaluacion: ¿Sabes armar un histograma en SQL? | ¿Sabes qué es la clasificación ABC? | ¿Sabes calcular recencia, frecuencia y monto por cliente?
---

:::escenario
El equipo de CRM tiene presupuesto para una sola campaña. Pregunta: “¿a quién le hablamos?”. Mandarle a todos lo mismo es caro y poco efectivo. Segmentar es agrupar clientes que se parecen para tratarlos distinto: a los que compran mucho y hace poco, a los que antes compraban y dejaron, a los nuevos.
:::

## Histogramas: cuántos hay en cada rango

Un histograma cuenta cuántos casos caen en cada rango de un valor. En SQL, el rango se calcula dividiendo y truncando.

```sql
-- ¿Cuántos clientes hicieron 1, 2, 3… pedidos?
SELECT pedidos, COUNT(*) AS clientes
FROM (SELECT cliente_id, COUNT(*) AS pedidos FROM pedidos GROUP BY cliente_id) AS t
GROUP BY pedidos
ORDER BY pedidos;

-- Rangos de 100 en el precio de los productos: 0-99, 100-199…
SELECT CAST(precio / 100 AS INTEGER) * 100 AS desde, COUNT(*) AS productos
FROM productos
GROUP BY desde
ORDER BY desde;
```

## Pareto y la clasificación ABC

En casi todos los negocios, pocos productos (o clientes) explican la mayor parte de las ventas. La **clasificación ABC** ordena de mayor a menor, acumula el porcentaje y corta: **A** hasta el 80 %, **B** hasta el 95 %, **C** el resto.

```sql
WITH ventas AS (
  SELECT producto_id, SUM(cantidad * precio_unitario * (1 - descuento)) AS ventas
  FROM detalle_pedidos GROUP BY producto_id
), acumulado AS (
  SELECT producto_id, ventas,
         SUM(ventas) OVER (ORDER BY ventas DESC, producto_id) / SUM(ventas) OVER () AS pct_acum
  FROM ventas
)
SELECT CASE WHEN pct_acum <= 0.80 THEN 'A' WHEN pct_acum <= 0.95 THEN 'B' ELSE 'C' END AS clase,
       COUNT(*) AS productos
FROM acumulado
GROUP BY clase;
```

```recorrido
titulo: La clasificación ABC, paso a paso
estacion ventas: Ventas por producto | icono=tabla
estacion orden: Ordenar | icono=flujo
estacion acum: % acumulado | icono=capas
estacion clase: Clase | icono=etiqueta
estacion res: Pareto | icono=check
paso ventas: Cuánto vendió cada producto
Una fila por producto con su venta total.
>>> tabla
producto_id,ventas
1,191735.75
2,56232.76
3,226982.17
4,5125.77
paso orden: Ordenar de mayor a menor
El producto que más vende queda primero.
>>> tabla
puesto,producto_id,ventas
1,146,834980
2,144,466219.37
3,124,453047.07
4,119,440746.34
5,212,436208.41
paso acum: El porcentaje acumulado
`SUM(ventas) OVER (ORDER BY ventas DESC)` / total: qué parte de las ventas suman los productos desde el primero hasta este.
>>> tabla
puesto,producto_id,ventas,pct_acum
1,146,834980,5.8
2,144,466219.37,9
3,124,453047.07,12.2
4,119,440746.34,15.2
5,212,436208.41,18.2
paso clase: Cortar en A, B y C
Hasta el 80 % acumulado → A; hasta el 95 % → B; el resto → C.
>>> tabla
puesto,producto_id,pct_acum,clase
1,146,5.8,A
2,144,9,A
50,10,72.6,A
51,23,73.1,A
100,87,89,B
150,263,95.2,C
200,219,98.3,C
paso res: Pocos productos, casi todas las ventas
La clase A tiene una parte chica del catálogo y el 80 % de las ventas: son los productos que no pueden quedarse sin stock.
>>> tabla
clase,productos,pct_catalogo
A,66,22
B,81,27
C,153,51
```

## RFM: recencia, frecuencia y monto

Para cada cliente:
- **R**ecencia: días desde su última compra (menos es mejor).
- **F**recuencia: cantidad de pedidos.
- **M**onto: cuánto gastó.

Cada dimensión se reparte en grupos con `NTILE` y se combinan en un puntaje. Los segmentos clásicos:

| Segmento | Regla típica | Acción |
|---|---|---|
| Campeones | R alto, F alto, M alto | Programa de fidelidad, lanzamientos |
| En riesgo | R bajo, F alto | Campaña de reactivación |
| Nuevos | R alto, F = 1 | Bienvenida y segunda compra |
| Perdidos | R bajo, F bajo | Solo si la campaña es barata |

```sql
-- base RFM al 1 de enero de 2025
SELECT cliente_id,
       CAST(julianday('2025-01-01') - julianday(MAX(fecha_pedido)) AS INTEGER) AS recencia,
       COUNT(*) AS frecuencia
FROM pedidos
WHERE estado <> 'cancelado'
GROUP BY cliente_id
LIMIT 5;
```

:::tip NTILE y el orden
`NTILE(4) OVER (ORDER BY recencia DESC)` da 4 a los de recencia más baja (los que compraron hace poco). Elige el orden para que **4 siempre sea “lo mejor”**: así el puntaje se lee fácil.
:::

## Ejercicios

:::ejercicio sql ordenado dificultad=Básico
Histograma de clientes por cantidad de pedidos (cualquier estado): `pedidos` y `clientes`, ordenado por `pedidos`.
```sql solucion
SELECT pedidos, COUNT(*) AS clientes
FROM (SELECT cliente_id, COUNT(*) AS pedidos FROM pedidos GROUP BY cliente_id) AS t
GROUP BY pedidos
ORDER BY pedidos;
```
:::

:::ejercicio sql ordenado dificultad=Básico
Histograma de productos por rangos de precio de **250** (0, 250, 500…). Columnas: `desde`, `productos`. Ordena por `desde`.
```pista
`CAST(precio / 250 AS INTEGER) * 250` da el inicio del rango.
```
```sql solucion
SELECT CAST(precio / 250 AS INTEGER) * 250 AS desde, COUNT(*) AS productos FROM productos GROUP BY desde ORDER BY desde;
```
:::

:::ejercicio sql ordenado dificultad=Intermedio
Histograma del **ticket** de los pedidos no cancelados (importe con descuento del pedido) en rangos de **500**. Columnas: `desde`, `pedidos`. Ordena por `desde`.
```pista
Primero el total de cada pedido; después el rango y el conteo.
```
```sql solucion
WITH t AS (
  SELECT p.pedido_id, SUM(d.cantidad * d.precio_unitario * (1 - d.descuento)) AS total
  FROM pedidos p JOIN detalle_pedidos d ON d.pedido_id = p.pedido_id
  WHERE p.estado <> 'cancelado'
  GROUP BY p.pedido_id
)
SELECT CAST(total / 500 AS INTEGER) * 500 AS desde, COUNT(*) AS pedidos FROM t GROUP BY desde ORDER BY desde;
```
:::

:::ejercicio sql dificultad=Intermedio
¿Qué porcentaje de las ventas (importe con descuento de todas las líneas) aportan los **10 productos que más venden**? 2 decimales. Columna: `pct_top10`.
```pista
Calcula las ventas por producto, toma los 10 primeros y divide su suma por el total.
```
```sql solucion
WITH v AS (SELECT producto_id, SUM(cantidad * precio_unitario * (1 - descuento)) AS ventas FROM detalle_pedidos GROUP BY producto_id)
SELECT ROUND(100.0 * (SELECT SUM(ventas) FROM (SELECT ventas FROM v ORDER BY ventas DESC LIMIT 10) AS t) / (SELECT SUM(ventas) FROM v), 2) AS pct_top10;
```
:::

:::ejercicio sql dificultad=Avanzado
Clasificación ABC de productos por ventas (importe con descuento de todas las líneas): A hasta el 80 % acumulado, B hasta el 95 % y C el resto. Ordena por ventas descendente y desempata por `producto_id`. Devuelve cuántos productos hay en cada clase. Columnas: `clase`, `productos`.
```pista
`SUM(ventas) OVER (ORDER BY ventas DESC, producto_id)` es el acumulado; `SUM(ventas) OVER ()`, el total.
```
```pista
Compara el cociente con 0.80 y 0.95 en un `CASE` y agrupa por clase.
```
```sql solucion
WITH v AS (SELECT producto_id, SUM(cantidad * precio_unitario * (1 - descuento)) AS ventas FROM detalle_pedidos GROUP BY producto_id),
a AS (SELECT producto_id, SUM(ventas) OVER (ORDER BY ventas DESC, producto_id) / SUM(ventas) OVER () AS pct FROM v)
SELECT CASE WHEN pct <= 0.80 THEN 'A' WHEN pct <= 0.95 THEN 'B' ELSE 'C' END AS clase, COUNT(*) AS productos
FROM a GROUP BY clase;
```
:::

:::ejercicio sql dificultad=Intermedio
Reparte los clientes que compraron (pedidos no cancelados) en **cuartiles** según cuánto gastaron (importe con descuento): 4 = el cuarto que más gastó. Devuelve cuántos clientes hay en cada cuartil y el gasto promedio (2 decimales). Columnas: `cuartil`, `clientes`, `gasto_promedio`.
```pista
`NTILE(4) OVER (ORDER BY gasto)` deja el gasto más alto en el grupo 4.
```
```sql solucion
WITH g AS (
  SELECT p.cliente_id, SUM(d.cantidad * d.precio_unitario * (1 - d.descuento)) AS gasto
  FROM pedidos p JOIN detalle_pedidos d ON d.pedido_id = p.pedido_id
  WHERE p.estado <> 'cancelado'
  GROUP BY p.cliente_id
), q AS (SELECT cliente_id, gasto, NTILE(4) OVER (ORDER BY gasto, cliente_id) AS cuartil FROM g)
SELECT cuartil, COUNT(*) AS clientes, ROUND(AVG(gasto), 2) AS gasto_promedio FROM q GROUP BY cuartil;
```
:::

:::ejercicio sql dificultad=Intermedio
Base RFM al 1 de enero de 2025 (pedidos no cancelados): para cada cliente, `recencia` (días enteros desde su último pedido), `frecuencia` (pedidos) y `monto` (importe con descuento, 2 decimales). Columnas: `cliente_id`, `recencia`, `frecuencia`, `monto`.
```pista
Ojo con el grano: si unes con el detalle, `COUNT(*)` cuenta líneas. Usa `COUNT(DISTINCT p.pedido_id)`.
```
```sql solucion
SELECT p.cliente_id,
       CAST(julianday('2025-01-01') - julianday(MAX(p.fecha_pedido)) AS INTEGER) AS recencia,
       COUNT(DISTINCT p.pedido_id) AS frecuencia,
       ROUND(SUM(d.cantidad * d.precio_unitario * (1 - d.descuento)), 2) AS monto
FROM pedidos p JOIN detalle_pedidos d ON d.pedido_id = p.pedido_id
WHERE p.estado <> 'cancelado'
GROUP BY p.cliente_id;
```
:::

:::ejercicio sql dificultad=Avanzado
Con la base RFM anterior, calcula los puntajes `r`, `f` y `m` de 1 a 4 con `NTILE(4)` (4 = mejor: compró hace menos, más pedidos, más monto; desempata por `cliente_id`) y cuenta cuántos clientes son **campeones** (r = 4, f = 4 y m = 4). Columna: `campeones`.
```pista
Para la recencia, “mejor” es menor: ordena `recencia DESC` para que el 4 quede en los más recientes.
```
```pista
Tres `NTILE(4) OVER (ORDER BY …)` en la misma consulta y un `COUNT(*)` con el filtro afuera.
```
```sql solucion
WITH base AS (
  SELECT p.cliente_id,
         julianday('2025-01-01') - julianday(MAX(p.fecha_pedido)) AS recencia,
         COUNT(DISTINCT p.pedido_id) AS frecuencia,
         SUM(d.cantidad * d.precio_unitario * (1 - d.descuento)) AS monto
  FROM pedidos p JOIN detalle_pedidos d ON d.pedido_id = p.pedido_id
  WHERE p.estado <> 'cancelado'
  GROUP BY p.cliente_id
), s AS (
  SELECT cliente_id,
         NTILE(4) OVER (ORDER BY recencia DESC, cliente_id) AS r,
         NTILE(4) OVER (ORDER BY frecuencia, cliente_id) AS f,
         NTILE(4) OVER (ORDER BY monto, cliente_id) AS m
  FROM base
)
SELECT COUNT(*) AS campeones FROM s WHERE r = 4 AND f = 4 AND m = 4;
```
:::

:::ejercicio sql dificultad=Avanzado
Segmentos simples para una campaña (al 1 de enero de 2025, pedidos no cancelados): `nuevo` si hizo 1 pedido y compró hace 90 días o menos; `en riesgo` si hizo 3 o más pedidos y su última compra fue hace más de 180 días; `activo` el resto. Cuenta los clientes por segmento. Columnas: `segmento`, `clientes`.
```pista
Calcula recencia y frecuencia por cliente en una CTE y clasifica con `CASE` en orden (la primera condición que se cumple gana).
```
```sql solucion
WITH b AS (
  SELECT cliente_id, julianday('2025-01-01') - julianday(MAX(fecha_pedido)) AS recencia, COUNT(*) AS frecuencia
  FROM pedidos WHERE estado <> 'cancelado' GROUP BY cliente_id
)
SELECT CASE WHEN frecuencia = 1 AND recencia <= 90 THEN 'nuevo'
            WHEN frecuencia >= 3 AND recencia > 180 THEN 'en riesgo'
            ELSE 'activo' END AS segmento,
       COUNT(*) AS clientes
FROM b
GROUP BY segmento;
```
:::

:::ejercicio sql ordenado dificultad=Avanzado
Streaming (Ritmo). Segmenta a los usuarios por **cuánto escucharon en 2024**: `liviano` (menos de 1 hora en total), `medio` (de 1 a menos de 5 horas) y `intenso` (5 horas o más). Incluye solo usuarios con alguna reproducción. Columnas: `segmento`, `usuarios`. Ordena por `usuarios` de mayor a menor.
```pista
Suma `segundos_escuchados` por usuario; 1 hora = 3600 segundos.
```
```sql solucion
WITH u AS (SELECT usuario_id, SUM(segundos_escuchados) AS seg FROM streaming_reproducciones GROUP BY usuario_id)
SELECT CASE WHEN seg < 3600 THEN 'liviano' WHEN seg < 5 * 3600 THEN 'medio' ELSE 'intenso' END AS segmento,
       COUNT(*) AS usuarios
FROM u
GROUP BY segmento
ORDER BY usuarios DESC;
```
:::
