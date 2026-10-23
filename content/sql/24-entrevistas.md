---
titulo: Desafíos SQL de entrevista (nivel senior)
nivel: Experto
duracion: 60
resumen: Problemas reales de entrevistas técnicas para Data Engineer y Analytics Engineer.
---

Llegaste al final del módulo de SQL. Estos desafíos combinan todo lo aprendido. Son del tipo que se piden en entrevistas para **Data Engineer**, **Analytics Engineer** y **Data Analyst senior**.

## Cómo es una entrevista técnica de SQL

Casi siempre tiene esta forma: te dan 2 a 4 tablas (muy parecidas a las de este curso), una pregunta de negocio y entre 15 y 30 minutos. A veces en una pizarra, a veces en un editor compartido sin poder ejecutar. Lo que evalúan **no** es solo si llegas al resultado:

| Lo que miran | Cómo demostrarlo |
|---|---|
| **Entender el problema** | Repite la pregunta con tus palabras y pregunta lo ambiguo: "¿los pedidos cancelados cuentan?", "¿qué pasa con los empates?" |
| **Estructurar** | Di el grano del resultado y los pasos antes de escribir: "primero agrupo por cliente y mes, después numero…" |
| **Conocer las herramientas** | Elige la correcta y justifícala: "uso `DENSE_RANK` porque si hay empate en el primer puesto…" |
| **Casos borde** | NULL, empates, clientes sin pedidos, divisiones por cero, días sin datos |
| **Comunicación** | Piensa en voz alta. Un silencio de 10 minutos y una respuesta perfecta vale menos que un razonamiento claro con un detalle a corregir |

## Las familias de preguntas que más aparecen

| Familia | Ejemplo | Técnica (lección) |
|---|---|---|
| Top-N por grupo | "El producto más vendido de cada país" | `ROW_NUMBER`/`RANK` + CTE (16) |
| Segundo / n-ésimo valor | "El segundo salario más alto" | `DENSE_RANK` (16) |
| Comparar con el periodo anterior | "Crecimiento mes a mes" | `LAG` (17) |
| Acumulados y móviles | "Ventas acumuladas del año", "promedio de 7 días" | `SUM … OVER`, marcos (17) |
| Rachas y consecutivos | "Usuarios que entraron 3 días seguidos" | Gaps & islands (20) |
| Lo que falta | "Clientes que nunca compraron" | Anti-join / `NOT EXISTS` (12, 13) |
| Retención y cohortes | "% de usuarios que vuelven al mes siguiente" | Primera fecha + meses (20) |
| Deduplicación | "Quédate con la última versión de cada registro" | `ROW_NUMBER` + `rn = 1` (20) |
| Métricas con condición | "Tasa de cancelación por canal" | `SUM(CASE WHEN …)` (10) |
| Mediana y percentiles | "Mediana del ticket" | Numerar y tomar el centro (este módulo) |

:::tip Método para resolver problemas difíciles
1. **Reformula** el problema con tus palabras y define el **grano** del resultado (“una fila por…”).
2. Escribe la solución en **pasos** con CTEs. Ejecuta cada paso y mira los datos.
3. Piensa en los **casos borde**: NULLs, empates, clientes sin pedidos, días sin datos.
4. Recién al final, optimiza.
:::

:::ejercicio sql dificultad=Experto titulo="Producto estrella por país"
Para cada **país** de cliente, encuentra la **marca** con más unidades vendidas (pedidos no cancelados). Si hay empate, todas las marcas empatadas. Columnas: `pais`, `marca`, `unidades`.
```sql solucion
WITH u AS (
  SELECT c.pais, pr.marca, SUM(d.cantidad) AS unidades
  FROM detalle_pedidos d
  JOIN pedidos p ON p.pedido_id = d.pedido_id
  JOIN clientes c ON c.cliente_id = p.cliente_id
  JOIN productos pr ON pr.producto_id = d.producto_id
  WHERE p.estado <> 'cancelado'
  GROUP BY c.pais, pr.marca
),
r AS (SELECT *, RANK() OVER (PARTITION BY pais ORDER BY unidades DESC) AS rk FROM u)
SELECT pais, marca, unidades FROM r WHERE rk = 1;
```
:::

:::ejercicio sql dificultad=Experto titulo="Clientes que compraron 3 meses seguidos"
Encuentra los `cliente_id` que hicieron pedidos en **al menos 3 meses calendario consecutivos** (en cualquier momento de la historia). Una columna: `cliente_id`.
```sql solucion
WITH m AS (
  SELECT DISTINCT cliente_id,
         CAST(strftime('%Y', fecha_pedido) AS INT) * 12 + CAST(strftime('%m', fecha_pedido) AS INT) AS mes_idx
  FROM pedidos
),
g AS (
  SELECT cliente_id, mes_idx - ROW_NUMBER() OVER (PARTITION BY cliente_id ORDER BY mes_idx) AS grupo FROM m
)
SELECT DISTINCT cliente_id FROM g GROUP BY cliente_id, grupo HAVING COUNT(*) >= 3;
```
```pista
Es un gaps & islands con meses: convierte cada mes a un número entero (año × 12 + mes) y réstale el número de fila.
```
:::

:::ejercicio sql dificultad=Experto titulo="Mediana del ticket"
Calcula la **mediana** del importe neto por pedido (todos los pedidos), sin funciones de mediana. Si la cantidad de pedidos es par, promedia los dos valores centrales. Redondea a 2. Columna: `mediana`.
```sql solucion
WITH t AS (
  SELECT pedido_id, SUM(cantidad * precio_unitario * (1 - descuento)) AS total FROM detalle_pedidos GROUP BY pedido_id
),
o AS (
  SELECT total, ROW_NUMBER() OVER (ORDER BY total) AS rn, COUNT(*) OVER () AS n FROM t
)
SELECT ROUND(AVG(total), 2) AS mediana FROM o WHERE rn IN ((n + 1) / 2, (n + 2) / 2);
```
```pista
Numera los totales ordenados y quédate con las posiciones `(n+1)/2` y `(n+2)/2` (división entera): si n es impar coinciden.
```
:::

:::ejercicio sql dificultad=Experto titulo="Primera y segunda compra"
Para cada cliente con **al menos 2 pedidos**, muestra `cliente_id`, la fecha de su primera compra (`primera`), la de la segunda (`segunda`) y los días entre ambas (`dias`, entero). Si hay dos pedidos el mismo día, desempata por `pedido_id`.
```sql solucion
WITH r AS (
  SELECT cliente_id, fecha_pedido, ROW_NUMBER() OVER (PARTITION BY cliente_id ORDER BY fecha_pedido, pedido_id) AS rn
  FROM pedidos
)
SELECT a.cliente_id, a.fecha_pedido AS primera, b.fecha_pedido AS segunda,
       CAST(julianday(b.fecha_pedido) - julianday(a.fecha_pedido) AS INTEGER) AS dias
FROM r a JOIN r b ON b.cliente_id = a.cliente_id AND b.rn = 2
WHERE a.rn = 1;
```
:::

:::ejercicio sql ordenado dificultad=Experto titulo="Pareto 80/20"
¿Qué productos acumulan el **80% de las ventas netas** (todas las líneas)? Ordena los productos de mayor a menor venta (desempate por `producto_id`) y devuelve los que, **antes de sumarlos**, el acumulado era menor al 80% del total. Columnas: `producto_id`, `ventas` (redondeado a 2), `pct_acumulado` (redondeado a 2, incluyendo al producto).
```sql solucion
WITH v AS (
  SELECT producto_id, SUM(cantidad * precio_unitario * (1 - descuento)) AS ventas FROM detalle_pedidos GROUP BY producto_id
),
a AS (
  SELECT producto_id, ventas,
         SUM(ventas) OVER (ORDER BY ventas DESC, producto_id ROWS UNBOUNDED PRECEDING) AS acum,
         SUM(ventas) OVER () AS total
  FROM v
)
SELECT producto_id, ROUND(ventas, 2) AS ventas, ROUND(100.0 * acum / total, 2) AS pct_acumulado
FROM a
WHERE acum - ventas < 0.8 * total
ORDER BY ventas DESC, producto_id;
```
:::

:::ejercicio sql dificultad=Experto titulo="Vendedores por encima de su jefe"
Encuentra a los empleados que ganan **más que su jefe directo**. Columnas: `empleado`, `salario`, `jefe`, `salario_jefe`.
```sql solucion
SELECT e.nombre AS empleado, e.salario, j.nombre AS jefe, j.salario AS salario_jefe
FROM empleados e JOIN empleados j ON j.empleado_id = e.jefe_id
WHERE e.salario > j.salario;
```
```pista
Self join de `empleados` y compara salarios.
```
:::

:::ejercicio sql dificultad=Experto titulo="Tasa de pagos rechazados que luego se aprobaron"
De los pedidos que tuvieron **algún pago rechazado**, ¿qué porcentaje terminó teniendo también un pago **aprobado**? Redondea a 2. Columnas: `pedidos_con_rechazo`, `luego_aprobados`, `pct_recuperado`.
```sql solucion
WITH r AS (
  SELECT pedido_id,
         MAX(CASE WHEN estado = 'rechazado' THEN 1 ELSE 0 END) AS rech,
         MAX(CASE WHEN estado = 'aprobado' THEN 1 ELSE 0 END) AS apro
  FROM pagos GROUP BY pedido_id
)
SELECT SUM(rech) AS pedidos_con_rechazo,
       SUM(CASE WHEN rech = 1 AND apro = 1 THEN 1 ELSE 0 END) AS luego_aprobados,
       ROUND(100.0 * SUM(CASE WHEN rech = 1 AND apro = 1 THEN 1 ELSE 0 END) / SUM(rech), 2) AS pct_recuperado
FROM r;
```
:::

:::ejercicio sql ordenado dificultad=Experto titulo="Ventas de cada mes vs. mismo mes del año anterior"
Para cada mes de **2024** (`mes` como número 1–12), muestra las ventas netas de 2024 (`ventas_2024`), las del mismo mes de 2023 (`ventas_2023`) y el crecimiento porcentual (`crecimiento_pct`), todo redondeado a 2. Pedidos no cancelados. Ordena por mes.
```sql solucion
WITH m AS (
  SELECT CAST(strftime('%Y', p.fecha_pedido) AS INT) AS anio, CAST(strftime('%m', p.fecha_pedido) AS INT) AS mes,
         SUM(d.cantidad * d.precio_unitario * (1 - d.descuento)) AS ventas
  FROM pedidos p JOIN detalle_pedidos d ON d.pedido_id = p.pedido_id
  WHERE p.estado <> 'cancelado'
  GROUP BY anio, mes
)
SELECT a.mes, ROUND(a.ventas, 2) AS ventas_2024, ROUND(b.ventas, 2) AS ventas_2023,
       ROUND(100.0 * (a.ventas - b.ventas) / b.ventas, 2) AS crecimiento_pct
FROM m a JOIN m b ON b.mes = a.mes AND b.anio = 2023
WHERE a.anio = 2024
ORDER BY a.mes;
```
:::
