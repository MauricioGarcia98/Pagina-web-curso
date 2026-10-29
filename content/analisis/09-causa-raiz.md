---
titulo: Encontrar la causa de una caída
nivel: Experto
duracion: 55
resumen: El método para responder “¿por qué bajaron las ventas?” - descartar primero la estacionalidad y los problemas de datos, descomponer la métrica en sus factores (pedidos y ticket), abrir por dimensiones para ver qué segmento explica el cambio y separar el efecto mezcla del efecto tasa.
objetivos: Elegir la comparación correcta (mes anterior o año anterior) | Descomponer el cambio de ventas en volumen y ticket | Encontrar qué segmentos explican la mayor parte del cambio | Distinguir un cambio de mezcla de un cambio de comportamiento
autoevaluacion: ¿Sabes qué revisar antes de buscar una causa de negocio? | ¿Sabes descomponer ventas en pedidos × ticket? | ¿Sabes calcular la contribución de cada segmento al cambio total?
---

:::escenario
El director comercial ve el tablero el 1 de septiembre de 2024: “¡los pedidos de agosto cayeron 31 % contra julio! Necesito saber por qué antes del mediodía”. Responder rápido “porque bajó la app” sin método es apostar. Vas a seguir los pasos de un analista senior.
:::

## El orden de las preguntas

```diagrama
titulo: Diagnóstico de una caída, en orden
nodo d: ¿Son datos? | icono=check | col=0 | fila=0 | sub=días faltantes, cargas, definiciones | color=rojo
nodo e: ¿Es estacional? | icono=reloj | col=1 | fila=0 | sub=comparar con el año anterior
nodo f: ¿Qué factor? | icono=grafico | col=2 | fila=0 | sub=volumen × ticket
nodo s: ¿Qué segmento? | icono=lupa | col=3 | fila=0 | sub=canal, país, categoría
nodo m: ¿Mezcla o tasa? | icono=transformar | col=4 | fila=0 | sub=cambió la composición o el comportamiento | color=verde
flecha d -> e
flecha e -> f
flecha f -> s
flecha s -> m
```

1. **¿Es un problema de datos?** Días sin cargar, un canal que dejó de enviar datos o un cambio de definición explican muchas “caídas”.
2. **¿Es estacional?** Si julio siempre es alto, compararse con julio engaña: la comparación justa es contra el **mismo mes del año anterior**.
3. **¿Qué factor cambió?** Ventas = pedidos × ticket. ¿Cayó la cantidad, el ticket o ambos?
4. **¿Qué segmento lo explica?** Abrir por canal, país, categoría… y ordenar por **contribución** al cambio total (no por variación porcentual: un segmento chico puede caer 50 % y no importar).
5. **¿Mezcla o tasa?** ¿Cambió cuánto pesa cada segmento, o cambió el comportamiento dentro de cada segmento?

## Descomponer un cambio

Si ventas = P × T (pedidos × ticket), el cambio entre dos períodos se reparte así:

- **Efecto volumen** = (P₂ − P₁) × T₁
- **Efecto ticket** = (T₂ − T₁) × P₂

y la suma de los dos da exactamente V₂ − V₁.

## Contribución de cada segmento

Contribución del segmento = cambio del segmento ÷ cambio total. Las contribuciones suman 100 %. Si la app aporta 60 % de la caída, es por ahí.

:::cuidado La trampa del porcentaje
“Bolivia creció 200 %” suena enorme… y son 4 pedidos más. Ordena siempre por el cambio absoluto o por la contribución.
:::

## Ejercicios

:::ejercicio sql dificultad=Básico
Primero, la comparación que hizo el director: pedidos de julio y agosto de 2024 y la variación (%, 1 decimal). Columnas: `julio`, `agosto`, `var_pct`.
```sql solucion
WITH m AS (
  SELECT SUM(CASE WHEN fecha_pedido >= '2024-07-01' AND fecha_pedido < '2024-08-01' THEN 1 ELSE 0 END) AS jul,
         SUM(CASE WHEN fecha_pedido >= '2024-08-01' AND fecha_pedido < '2024-09-01' THEN 1 ELSE 0 END) AS ago
  FROM pedidos
)
SELECT jul AS julio, ago AS agosto, ROUND(100.0 * (ago - jul) / jul, 1) AS var_pct FROM m;
```
:::

:::ejercicio sql ordenado dificultad=Básico
Control de datos: días con pedidos y pedidos por mes de junio a septiembre de 2024. Columnas: `mes`, `dias_con_pedidos`, `pedidos`. Ordena por mes. ¿Falta algún día?
```sql solucion
SELECT strftime('%Y-%m', fecha_pedido) AS mes, COUNT(DISTINCT fecha_pedido) AS dias_con_pedidos, COUNT(*) AS pedidos
FROM pedidos WHERE fecha_pedido >= '2024-06-01' AND fecha_pedido < '2024-10-01'
GROUP BY mes ORDER BY mes;
```
:::

:::ejercicio sql ordenado dificultad=Intermedio
¿Es estacional? Pedidos de julio y de agosto de **cada año** y la variación de agosto contra julio (%, 1 decimal). Columnas: `anio`, `julio`, `agosto`, `var_pct`. Ordena por año.
```sql solucion
SELECT strftime('%Y', fecha_pedido) AS anio,
       SUM(CASE WHEN strftime('%m', fecha_pedido) = '07' THEN 1 ELSE 0 END) AS julio,
       SUM(CASE WHEN strftime('%m', fecha_pedido) = '08' THEN 1 ELSE 0 END) AS agosto,
       ROUND(100.0 * (SUM(CASE WHEN strftime('%m', fecha_pedido) = '08' THEN 1 ELSE 0 END) - SUM(CASE WHEN strftime('%m', fecha_pedido) = '07' THEN 1 ELSE 0 END))
             / SUM(CASE WHEN strftime('%m', fecha_pedido) = '07' THEN 1 ELSE 0 END), 1) AS var_pct
FROM pedidos
GROUP BY anio ORDER BY anio;
```
:::

:::ejercicio sql dificultad=Intermedio
La comparación justa: pedidos de agosto de 2023 y de agosto de 2024 y la variación interanual (%, 1 decimal). Columnas: `ago_2023`, `ago_2024`, `yoy_pct`.
```sql solucion
WITH m AS (
  SELECT SUM(CASE WHEN fecha_pedido >= '2023-08-01' AND fecha_pedido < '2023-09-01' THEN 1 ELSE 0 END) AS a,
         SUM(CASE WHEN fecha_pedido >= '2024-08-01' AND fecha_pedido < '2024-09-01' THEN 1 ELSE 0 END) AS b
  FROM pedidos
)
SELECT a AS ago_2023, b AS ago_2024, ROUND(100.0 * (b - a) / a, 1) AS yoy_pct FROM m;
```
:::

:::ejercicio sql dificultad=Avanzado
Descompón el cambio de **ventas netas** (con descuento, sin cancelados) de agosto 2023 → agosto 2024 en efecto volumen y efecto ticket. Columnas: `cambio_total`, `efecto_volumen`, `efecto_ticket` (todos con 2 decimales). Comprueba que los dos efectos suman el total.
```pista
Calcula en una CTE pedidos (P) y ventas (V) de cada agosto; el ticket es T = V ÷ P.
```
```pista
Efecto volumen = (P₂ − P₁) × T₁; efecto ticket = (T₂ − T₁) × P₂.
```
```sql solucion
WITH b AS (
  SELECT strftime('%Y', p.fecha_pedido) AS anio, COUNT(DISTINCT p.pedido_id) AS P, SUM(d.cantidad * d.precio_unitario * (1 - d.descuento)) AS V
  FROM pedidos p JOIN detalle_pedidos d ON d.pedido_id = p.pedido_id
  WHERE p.estado <> 'cancelado' AND strftime('%m', p.fecha_pedido) = '08' AND strftime('%Y', p.fecha_pedido) IN ('2023', '2024')
  GROUP BY anio
), x AS (
  SELECT MAX(CASE WHEN anio = '2023' THEN P END) AS p1, MAX(CASE WHEN anio = '2023' THEN V END) AS v1,
         MAX(CASE WHEN anio = '2024' THEN P END) AS p2, MAX(CASE WHEN anio = '2024' THEN V END) AS v2
  FROM b
)
SELECT ROUND(v2 - v1, 2) AS cambio_total,
       ROUND((p2 - p1) * (v1 / p1), 2) AS efecto_volumen,
       ROUND((v2 / p2 - v1 / p1) * p2, 2) AS efecto_ticket
FROM x;
```
:::

:::ejercicio sql ordenado dificultad=Intermedio
Abre el cambio interanual de pedidos de agosto **por canal**: `canal`, `ago_2023`, `ago_2024`, `cambio`. Ordena por `cambio` (el más negativo primero).
```sql solucion
SELECT canal,
       SUM(CASE WHEN fecha_pedido >= '2023-08-01' AND fecha_pedido < '2023-09-01' THEN 1 ELSE 0 END) AS ago_2023,
       SUM(CASE WHEN fecha_pedido >= '2024-08-01' AND fecha_pedido < '2024-09-01' THEN 1 ELSE 0 END) AS ago_2024,
       SUM(CASE WHEN fecha_pedido >= '2024-08-01' AND fecha_pedido < '2024-09-01' THEN 1 ELSE 0 END) - SUM(CASE WHEN fecha_pedido >= '2023-08-01' AND fecha_pedido < '2023-09-01' THEN 1 ELSE 0 END) AS cambio
FROM pedidos GROUP BY canal ORDER BY cambio;
```
:::

:::ejercicio sql ordenado dificultad=Avanzado
**Contribución** de cada canal al cambio total de pedidos de agosto (2023 → 2024): cambio del canal ÷ cambio total, en porcentaje con 1 decimal. Columnas: `canal`, `cambio`, `contribucion_pct`. Ordena por contribución de mayor a menor.
```pista
`SUM(cambio) OVER ()` da el cambio total en cada fila.
```
```pista
Si el total es negativo, un canal que también cayó tiene contribución positiva (explica la caída) y uno que creció, negativa.
```
```sql solucion
WITH c AS (
  SELECT canal,
         SUM(CASE WHEN fecha_pedido >= '2024-08-01' AND fecha_pedido < '2024-09-01' THEN 1 ELSE 0 END) - SUM(CASE WHEN fecha_pedido >= '2023-08-01' AND fecha_pedido < '2023-09-01' THEN 1 ELSE 0 END) AS cambio
  FROM pedidos GROUP BY canal
)
SELECT canal, cambio, ROUND(100.0 * cambio / SUM(cambio) OVER (), 1) AS contribucion_pct FROM c ORDER BY contribucion_pct DESC;
```
:::

:::ejercicio sql ordenado dificultad=Avanzado
El mismo análisis **por país** del cliente: `pais`, `ago_2023`, `ago_2024`, `cambio`, `var_pct` (1 decimal). Ordena por `cambio` (el más negativo primero). Mira cuáles explican la caída y cuáles tienen variaciones grandes pero poco peso.
```sql solucion
WITH c AS (
  SELECT cl.pais,
         SUM(CASE WHEN p.fecha_pedido >= '2023-08-01' AND p.fecha_pedido < '2023-09-01' THEN 1 ELSE 0 END) AS a,
         SUM(CASE WHEN p.fecha_pedido >= '2024-08-01' AND p.fecha_pedido < '2024-09-01' THEN 1 ELSE 0 END) AS b
  FROM pedidos p JOIN clientes cl ON cl.cliente_id = p.cliente_id
  GROUP BY cl.pais
)
SELECT pais, a AS ago_2023, b AS ago_2024, b - a AS cambio, ROUND(100.0 * (b - a) / a, 1) AS var_pct FROM c ORDER BY cambio;
```
:::

:::ejercicio sql ordenado dificultad=Avanzado
¿Mezcla o tasa? Para cada canal, su **participación** en los pedidos de agosto de 2023 y de agosto de 2024 (%, 1 decimal). Columnas: `canal`, `part_2023`, `part_2024`. Ordena por canal. Si las participaciones casi no cambiaron, la caída es pareja en todos los canales.
```sql solucion
WITH c AS (
  SELECT canal,
         SUM(CASE WHEN fecha_pedido >= '2023-08-01' AND fecha_pedido < '2023-09-01' THEN 1 ELSE 0 END) AS a,
         SUM(CASE WHEN fecha_pedido >= '2024-08-01' AND fecha_pedido < '2024-09-01' THEN 1 ELSE 0 END) AS b
  FROM pedidos GROUP BY canal
)
SELECT canal, ROUND(100.0 * a / SUM(a) OVER (), 1) AS part_2023, ROUND(100.0 * b / SUM(b) OVER (), 1) AS part_2024 FROM c ORDER BY canal;
```
:::

:::ejercicio sql dificultad=Avanzado
Otra hipótesis: ¿empeoraron los pagos? Tasa de rechazo de intentos de pago (%, 2 decimales) de los pedidos de agosto de 2023 y de agosto de 2024 (por fecha del pedido). Columnas: `rechazo_2023`, `rechazo_2024`.
```sql solucion
SELECT ROUND(100.0 * SUM(CASE WHEN p.fecha_pedido LIKE '2023-08%' AND pg.estado = 'rechazado' THEN 1 ELSE 0 END) / SUM(CASE WHEN p.fecha_pedido LIKE '2023-08%' THEN 1 ELSE 0 END), 2) AS rechazo_2023,
       ROUND(100.0 * SUM(CASE WHEN p.fecha_pedido LIKE '2024-08%' AND pg.estado = 'rechazado' THEN 1 ELSE 0 END) / SUM(CASE WHEN p.fecha_pedido LIKE '2024-08%' THEN 1 ELSE 0 END), 2) AS rechazo_2024
FROM pagos pg JOIN pedidos p ON p.pedido_id = pg.pedido_id;
```
:::

:::ejercicio quiz dificultad=Avanzado
Con todo lo calculado, ¿cuál es la mejor respuesta para el director?

- [ ] “Agosto cayó 31 % porque la app dejó de funcionar”
- [x] “La caída contra julio es en gran parte estacional (todos los años agosto vende menos que julio). Contra agosto del año pasado bajamos alrededor de 7 %, sobre todo por menos pedidos en app y web, con España y Perú como los países que más restan; el ticket cambió poco”
- [ ] “No hubo caída: los datos de agosto están incompletos”
- [ ] “Bolivia y Costa Rica crecieron más del 100 %, así que el problema está compensado”
:::
