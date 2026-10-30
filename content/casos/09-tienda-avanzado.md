---
titulo: "Caso 🛒 Tienda Andina: preguntas de directorio"
nivel: Experto
duracion: 50
resumen: Canasta de productos, cliente nuevo vs recurrente, primer producto comprado, LTV y tiempo hasta la recompra.
objetivos: Encontrar pares de productos que se compran juntos sin contar cada par dos veces | Separar ventas de clientes nuevos y recurrentes usando la primera compra | Calcular el LTV por cohorte de registro | Calcular la mediana del tiempo hasta la segunda compra sin funciones de mediana
prerrequisitos: casos-metodo | sql-patrones
autoevaluacion: ¿Puedes listar los pares de productos más comprados juntos? | ¿Sabes cómo evitar contar el par (A, B) y el par (B, A) por separado? | ¿Puedes marcar si cada pedido fue el primero de su cliente? | ¿Puedes calcular el LTV promedio por año de registro? | ¿Puedes calcular una mediana con funciones de ventana?
---

<!-- estandar:escenario -->
:::escenario El directorio de Tienda Andina
Valentina vuelve a presentar en el directorio y esta vez las preguntas son de estrategia:

> "Me van a preguntar: ¿crecemos porque conseguimos clientes nuevos o porque los que tenemos vuelven? ¿Con qué productos entra la gente? ¿Cuánto vale un cliente en toda su vida? ¿Y cuánto tarda en volver a comprar? Con eso decidimos el presupuesto de marketing del año."

Son las preguntas que hace cualquier directorio de un e-commerce. Todas dependen de identificar bien la **primera** compra de cada cliente y de no mezclar granos.
:::
Volvemos a la tienda que conoces, ahora con preguntas que haría un directorio. Todas exigen pensar bien el **grano** y el **orden temporal**.

## Preguntas de directorio: qué hay detrás de cada una

Los ejercicios de esta lección son los que aparecen en una reunión de directorio de cualquier e-commerce. Antes de resolverlos, conviene entender qué concepto de negocio hay detrás de cada uno:

| Pregunta | Concepto | Para qué se usa |
|---|---|---|
| ¿Qué productos se compran juntos? | **Análisis de canasta** (*market basket*) | Recomendaciones ("quienes compraron esto también…"), combos, ubicación en la tienda |
| ¿Cuánto venden los clientes nuevos vs. los que vuelven? | **Nuevo vs. recurrente** | Saber si el crecimiento depende de adquirir (caro) o de retener (barato) |
| ¿Con qué categoría entran los clientes? | **Categoría de entrada** (*first purchase*) | Qué productos traen clientes nuevos: dónde invertir en publicidad |
| ¿Cuánto vale un cliente a lo largo del tiempo? | **LTV** (*lifetime value*) por cohorte | Cuánto se puede gastar para conseguir un cliente (debe ser menor que su LTV) |
| ¿Cuánto tarda en volver a comprar? | **Mediana de tiempo a la segunda compra** | Cuándo enviar un recordatorio o un cupón |

Todas comparten dos dificultades: el **orden temporal** (qué pasó primero: hay que identificar la *primera* compra de cada cliente con `MIN` o `ROW_NUMBER`) y el **grano** (pedidos, líneas, clientes y pares de productos son niveles distintos; mezclarlos multiplica o pierde filas).

:::tip ¿Por qué la mediana y no el promedio?
Si 9 clientes vuelven a los 20 días y uno a los 700, el promedio da 88 días, que no describe a nadie. La **mediana** (el valor del medio) da 20: lo que le pasa al cliente típico. Para tiempos, montos de compra y salarios, que tienen valores extremos, la mediana es casi siempre más honesta.
:::

<!-- estandar:errores -->
:::errores
- **Pares duplicados en la canasta**: un self join de las líneas del mismo pedido devuelve (A, B) y (B, A), y también (A, A). Usa `a.producto_id < b.producto_id`.
- **"Nuevo" por año en vez de por cliente**: un cliente nuevo es el que hace su **primer** pedido, no el que se registró ese año.
- **Primera compra con pedidos cancelados**: si el primer pedido se canceló, ¿cuenta? Decide y aplica la misma regla en todas las métricas.
- **LTV de cohortes recientes**: los clientes de 2024 tuvieron menos tiempo para comprar. Compara cohortes con el mismo tiempo de antigüedad, o acláralo.
:::

<!-- estandar:trabajo -->
:::trabajo
- Estas métricas (nuevos vs. recurrentes, LTV, tiempo a la recompra) son la base de las decisiones de marketing: cuánto invertir para conseguir un cliente (que tiene que ser menos que su LTV) y cuándo mandar un recordatorio.
- El análisis de canasta con millones de pedidos genera una explosión de pares. En producción se limita a los productos más vendidos o se usan algoritmos específicos en Spark.
:::

:::ejercicio sql titulo="Productos que se compran juntos"
Análisis de **canasta**: pares de productos que aparecen en el **mismo pedido**. Devuelve los 10 pares más frecuentes: `producto_a`, `producto_b` (ids, con `producto_a < producto_b` para no duplicar), `pedidos_juntos`. Desempata por `producto_a` y `producto_b`.
```sql solucion
SELECT a.producto_id AS producto_a, b.producto_id AS producto_b, COUNT(*) AS pedidos_juntos
FROM detalle_pedidos a
JOIN detalle_pedidos b ON b.pedido_id = a.pedido_id AND a.producto_id < b.producto_id
GROUP BY a.producto_id, b.producto_id
ORDER BY pedidos_juntos DESC, producto_a, producto_b
LIMIT 10;
```
```pista
Self join de `detalle_pedidos` por `pedido_id` con la condición `a.producto_id < b.producto_id`.
```
:::

:::ejercicio sql ordenado titulo="Ventas de clientes nuevos vs recurrentes"
Para cada año, separa las ventas netas (pedidos no cancelados) entre pedidos de clientes **nuevos** (es su primer pedido) y **recurrentes**. Columnas: `anio`, `tipo_cliente` (`'nuevo'` o `'recurrente'`), `pedidos`, `ventas` (redondeado a 2). Ordena por año y tipo.
```sql solucion
WITH p AS (
  SELECT pedido_id, cliente_id, fecha_pedido,
         ROW_NUMBER() OVER (PARTITION BY cliente_id ORDER BY fecha_pedido, pedido_id) AS n
  FROM pedidos WHERE estado <> 'cancelado'
),
t AS (SELECT pedido_id, SUM(cantidad * precio_unitario * (1 - descuento)) AS total FROM detalle_pedidos GROUP BY pedido_id)
SELECT strftime('%Y', p.fecha_pedido) AS anio,
       CASE WHEN p.n = 1 THEN 'nuevo' ELSE 'recurrente' END AS tipo_cliente,
       COUNT(*) AS pedidos, ROUND(SUM(t.total), 2) AS ventas
FROM p JOIN t ON t.pedido_id = p.pedido_id
GROUP BY anio, tipo_cliente
ORDER BY anio, tipo_cliente;
```
:::

:::ejercicio sql ordenado titulo="La categoría de entrada"
¿Por qué categoría (nombre de la categoría del producto) entran los clientes? Toma el **primer pedido** no cancelado de cada cliente y cuenta, por categoría, cuántos clientes compraron algún producto de ella en ese primer pedido. Columnas: `categoria`, `clientes`. Ordena por clientes descendente y por categoría.
```sql solucion
WITH primero AS (
  SELECT pedido_id FROM (
    SELECT pedido_id, ROW_NUMBER() OVER (PARTITION BY cliente_id ORDER BY fecha_pedido, pedido_id) AS n
    FROM pedidos WHERE estado <> 'cancelado'
  ) WHERE n = 1
)
SELECT c.nombre AS categoria, COUNT(DISTINCT p.cliente_id) AS clientes
FROM primero f
JOIN pedidos p ON p.pedido_id = f.pedido_id
JOIN detalle_pedidos d ON d.pedido_id = f.pedido_id
JOIN productos pr ON pr.producto_id = d.producto_id
JOIN categorias c ON c.categoria_id = pr.categoria_id
GROUP BY c.nombre
ORDER BY clientes DESC, categoria;
```
:::

:::ejercicio sql ordenado titulo="LTV por cohorte de alta"
**LTV** (valor de vida) a la fecha: para los clientes que compraron, agrupados por **año de registro** (`anio_registro`), calcula `clientes` y el gasto neto promedio por cliente (`ltv_promedio`, redondeado a 2), considerando pedidos no cancelados. Ordena por año.
```sql solucion
WITH g AS (
  SELECT p.cliente_id, SUM(d.cantidad * d.precio_unitario * (1 - d.descuento)) AS gasto
  FROM pedidos p JOIN detalle_pedidos d ON d.pedido_id = p.pedido_id
  WHERE p.estado <> 'cancelado'
  GROUP BY p.cliente_id
)
SELECT strftime('%Y', c.fecha_registro) AS anio_registro, COUNT(*) AS clientes, ROUND(AVG(g.gasto), 2) AS ltv_promedio
FROM g JOIN clientes c ON c.cliente_id = g.cliente_id
GROUP BY anio_registro ORDER BY anio_registro;
```
```explicacion
Los clientes más antiguos tienen LTV más alto en parte porque tuvieron **más tiempo** para comprar. Para comparar cohortes de forma justa se usa el LTV a **igual antigüedad** (por ejemplo, gasto en los primeros 12 meses).
```
:::

:::ejercicio sql titulo="Mediana de días hasta la segunda compra"
Para los clientes con al menos dos pedidos no cancelados, calcula los días entre su primer y segundo pedido y devuelve la **mediana** (`mediana_dias`, redondeada a 1) y el **promedio** (`promedio_dias`, redondeado a 1). ¿Por qué difieren?
```sql solucion
WITH r AS (
  SELECT cliente_id, fecha_pedido, ROW_NUMBER() OVER (PARTITION BY cliente_id ORDER BY fecha_pedido, pedido_id) AS n
  FROM pedidos WHERE estado <> 'cancelado'
),
d AS (
  SELECT julianday(b.fecha_pedido) - julianday(a.fecha_pedido) AS dias
  FROM r a JOIN r b ON b.cliente_id = a.cliente_id AND a.n = 1 AND b.n = 2
),
o AS (SELECT dias, ROW_NUMBER() OVER (ORDER BY dias) AS rn, COUNT(*) OVER () AS c FROM d)
SELECT ROUND(AVG(CASE WHEN rn IN ((c + 1) / 2, (c + 2) / 2) THEN dias END), 1) AS mediana_dias,
       ROUND((SELECT AVG(dias) FROM d), 1) AS promedio_dias
FROM o;
```
```explicacion
Unos pocos clientes que tardan muchísimo en volver “tiran” el promedio hacia arriba. La **mediana** representa mejor al cliente típico cuando la distribución tiene cola larga.
```
:::

:::entrevista "¿Cómo calcularías el tiempo hasta la recompra de los clientes?"
Para cada cliente ordenaría sus pedidos no cancelados por fecha y usaría `LEAD` para obtener la fecha del siguiente pedido; la diferencia en días es el tiempo hasta la recompra. Tomaría la mediana además del promedio, porque hay valores muy largos, y la separaría por la categoría de la primera compra. Los clientes con un solo pedido no tienen recompra todavía: los informaría aparte, no como cero.
:::
