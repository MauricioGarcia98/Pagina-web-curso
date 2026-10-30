---
titulo: "Caso 🛵 Rápido: tiempos de entrega, take rate y retención en una app de delivery"
nivel: Experto
duracion: 60
resumen: Una app de delivery quiere entregar más rápido y que los clientes vuelvan. Descompone el tiempo de entrega por etapa, relaciona la demora con la calificación, calcula GMV y take rate, mide la falta de repartidores por hora y arma cohortes de recompra a 30 días.
objetivos: Descomponer el tiempo de entrega en aceptación, preparación y viaje con diferencias de fechas | Relacionar el tiempo de entrega con la calificación del cliente | Calcular GMV, ingresos de la plataforma y take rate | Encontrar las horas con falta de repartidores | Construir cohortes de recompra y reconocer el sesgo de los meses recientes
prerrequisitos: casos-metodo | sql-fechas | sql-subconsultas
autoevaluacion: ¿Sabes calcular minutos entre dos fechas-hora en SQLite? | ¿Puedes explicar qué etapa del pedido conviene atacar primero? | ¿Sabes qué es el GMV y qué es el take rate? | ¿Puedes calcular la recompra a 30 días por cohorte? | ¿Sabes por qué las cohortes de los últimos meses parecen peores?
---

<!-- estandar:escenario -->
:::escenario Más rápido, más pedidos
La directora de operaciones de **Rápido** llega con dos objetivos del año:

> "Uno: bajar el tiempo de entrega promedio a menos de 40 minutos. Dos: que más clientes nuevos vuelvan a pedir. Marketing dice que los cupones son la clave; yo creo que la clave es llegar rápido. Quiero datos, no opiniones."
:::

## Cómo funciona una app de delivery

Rápido es un **marketplace de tres lados**: clientes que piden, **restaurantes** que cocinan y **repartidores** que llevan. Un pedido pasa por etapas:

```diagrama
titulo: Las etapas de un pedido: cada una tiene su responsable
nodo c: Creado | icono=movil | col=0 | fila=0 | color=azul | sub=el cliente paga
nodo a: Aceptado | icono=comida | col=1 | fila=0 | color=naranja | sub=el restaurante\nlo toma
nodo r: Retirado | icono=check | col=2 | fila=0 | color=amarillo | sub=el repartidor\nlo levanta
nodo e: Entregado | icono=usuario | col=3 | fila=0 | color=verde | sub=llega al cliente
nodo x: Calificación | icono=grafico | col=3 | fila=1 | color=violeta | sub=1 a 5 estrellas
flecha c -> a: aceptación
flecha a -> r: preparación
flecha r -> e: viaje
flecha e -> x | estilo=punteada
```

Rápido gana una **comisión** sobre lo que vende el restaurante y el **costo de envío** que paga el cliente; los **cupones** son descuentos que paga Rápido.

| KPI | Fórmula | Para qué |
|---|---|---|
| **Tiempo de entrega** | entregado − creado | La experiencia del cliente |
| **Tiempo por etapa** | aceptado − creado, retirado − aceptado, entregado − retirado | Saber a quién mejorar: restaurante o logística |
| **GMV** (*gross merchandise value*) | suma del subtotal de los pedidos entregados | El tamaño del negocio |
| **Take rate** | (comisiones + envíos − cupones) / GMV | Cuánto de lo vendido queda para la plataforma |
| **Recompra a 30 días** | clientes nuevos que vuelven a pedir en 30 días / clientes nuevos | Retención |

## El modelo de datos

```text
delivery_clientes     (cliente_id, ciudad, fecha_registro, plataforma)
delivery_restaurantes (restaurante_id, nombre, ciudad, categoria, comision_pct, rating)
delivery_repartidores (repartidor_id, ciudad, vehiculo, fecha_alta)
delivery_pedidos      (pedido_id, cliente_id, restaurante_id, repartidor_id, ciudad,
                       creado, aceptado, retirado, entregado,
                       subtotal, costo_envio, descuento_cupon, propina, estado, calificacion)
```

- Los cuatro tiempos son fecha-hora (`'2024-03-05 20:14:33'`). Los que no ocurrieron son `NULL` (un pedido cancelado no tiene `entregado`).
- **Minutos entre dos momentos**: `(julianday(b) - julianday(a)) * 1440` (un día tiene 1440 minutos).
- `estado`: `entregado`, `cancelado_cliente`, `cancelado_restaurante`, `sin_repartidor` (nadie lo tomó).
- `comision_pct` es del restaurante: la comisión de un pedido es `subtotal * comision_pct / 100`.
- Ojo: del 14 al 16 de agosto una versión de la app registró mal algunos horarios (hay pedidos con `aceptado` después de `retirado`). En el proyecto final escribirás el control que lo detecta.

## Un ejemplo resuelto: ¿dónde se va el tiempo?

```sql
SELECT ciudad,
       COUNT(*) AS entregados,
       ROUND(AVG((julianday(aceptado)  - julianday(creado))   * 1440), 1) AS aceptacion_min,
       ROUND(AVG((julianday(retirado)  - julianday(aceptado)) * 1440), 1) AS preparacion_min,
       ROUND(AVG((julianday(entregado) - julianday(retirado)) * 1440), 1) AS viaje_min,
       ROUND(AVG((julianday(entregado) - julianday(creado))   * 1440), 1) AS total_min
FROM delivery_pedidos
WHERE estado = 'entregado'
GROUP BY ciudad
ORDER BY total_min DESC;
```

| ciudad | entregados | aceptacion_min | preparacion_min | viaje_min | total_min |
|---|---|---|---|---|---|
| Medellín | 1782 | 3.5 | 20.2 | 18.8 | 42.5 |
| Ciudad de México | 4235 | 3.5 | 20.3 | 18.4 | 42.3 |
| Bogotá | 3138 | 3.6 | 20.1 | 18.6 | 42.3 |
| Lima | 2642 | 3.6 | 19.9 | 18.5 | 41.9 |
| Buenos Aires | 2608 | 3.6 | 19.8 | 18.2 | 41.5 |

**Lectura:** el total ronda los 42 minutos en todas las ciudades, así que la meta de 40 no se logra mirando una ciudad en particular. La **preparación** (unos 20 minutos) es la etapa más larga, un poco más que el viaje: hay que trabajar con los restaurantes, no solo con los repartidores. El ejercicio de restaurantes lentos muestra con quién empezar.

:::cuidado Las trampas de este caso
- **Promediar tiempos de pedidos no entregados**: los cancelados no tienen `entregado`; `AVG` los ignoraría solo en esa columna, y las etapas quedarían calculadas sobre pedidos distintos. Filtra `estado = 'entregado'`.
- **Restar textos**: `entregado - creado` sobre texto da cualquier cosa. Usa `julianday`.
- **El promedio esconde la cola**: un promedio de 42 minutos puede tener un 30 % de pedidos de más de 45. Mira también los porcentajes por tramo.
- **Cohortes recientes**: un cliente que hizo su primer pedido el 20 de diciembre todavía no tuvo 30 días para volver. Las cohortes de noviembre y diciembre parecen peores solo porque están **incompletas** (*censura por la derecha*).
:::

<!-- estandar:trabajo -->
:::trabajo
- Las apps de delivery tienen tableros en tiempo real por ciudad y zona con exactamente estos tiempos por etapa, y alertas cuando la preparación de un restaurante se dispara (cocina saturada) para dejar de mandarle pedidos.
- Los eventos de cada etapa llegan como un **stream** (Kafka, Pub/Sub) y se procesan con Spark Structured Streaming o Flink; el modelo de este caso es la tabla de hechos que queda al final, con un timestamp por etapa (*accumulating snapshot*, en términos de Kimball).
- Las decisiones de cupones se toman con **experimentos A/B**: un grupo recibe el cupón y otro no, y se compara la recompra. Comparar a los que usaron cupón con los que no, sin experimento, mezcla causas.
:::

<!-- estandar:entrevista -->
:::entrevista "¿Cómo medirías la retención de una app de pedidos?"
Con cohortes: agrupo a los clientes por el mes de su primer pedido y, para cada cohorte, calculo qué porcentaje vuelve a pedir dentro de 30, 60 y 90 días desde su primer pedido. Uso ventanas relativas al primer pedido (no meses calendario) para que todos los clientes tengan la misma oportunidad, y excluyo o marco las cohortes que todavía no completaron la ventana. Después corto por canal de adquisición, ciudad o si el primer pedido llegó tarde, para encontrar qué explica la diferencia.
:::

## Ejercicios

:::ejercicio sql ordenado titulo="La demora y la calificación"
Solo pedidos entregados. Por tramo de tiempo total (`tramo`: `'hasta 30'`, `'31-45'`, `'más de 45'`): `pedidos`, `calificados` (con calificación) y `calificacion_promedio` (redondeado a 2). Ordena de menor a mayor demora.
```sql solucion
WITH p AS (
  SELECT (julianday(entregado) - julianday(creado)) * 1440 AS minutos, calificacion
  FROM delivery_pedidos
  WHERE estado = 'entregado'
)
SELECT CASE WHEN minutos <= 30 THEN 'hasta 30' WHEN minutos <= 45 THEN '31-45' ELSE 'más de 45' END AS tramo,
       COUNT(*) AS pedidos,
       COUNT(calificacion) AS calificados,
       ROUND(AVG(calificacion), 2) AS calificacion_promedio
FROM p
GROUP BY 1
ORDER BY MIN(minutos);
```
```explicacion
Hasta 30 minutos la calificación es casi perfecta; pasados los 45, cae más de un punto. La demora es el factor que más castiga la experiencia: un argumento fuerte para la directora de operaciones.
```
:::

:::ejercicio sql ordenado titulo="GMV y take rate por ciudad"
Solo pedidos entregados. Por `ciudad`: `gmv` (suma de subtotal), `comisiones`, `envios`, `cupones` (todos redondeados a 0) y `take_rate_pct` ((comisiones + envíos − cupones) / GMV, redondeado a 1). Ordena por `gmv` descendente.
```sql solucion
SELECT p.ciudad,
       ROUND(SUM(p.subtotal), 0) AS gmv,
       ROUND(SUM(p.subtotal * r.comision_pct / 100.0), 0) AS comisiones,
       ROUND(SUM(p.costo_envio), 0) AS envios,
       ROUND(SUM(p.descuento_cupon), 0) AS cupones,
       ROUND(100.0 * (SUM(p.subtotal * r.comision_pct / 100.0) + SUM(p.costo_envio) - SUM(p.descuento_cupon)) / SUM(p.subtotal), 1) AS take_rate_pct
FROM delivery_pedidos p
JOIN delivery_restaurantes r ON r.restaurante_id = p.restaurante_id
WHERE p.estado = 'entregado'
GROUP BY p.ciudad
ORDER BY gmv DESC;
```
:::

:::ejercicio sql ordenado titulo="¿Cuándo faltan repartidores?"
Por hora del día en que se creó el pedido (`hora`, texto de dos dígitos): `pedidos` y `pct_sin_repartidor` (redondeado a 1). Ordena por `hora`.
```sql solucion
SELECT strftime('%H', creado) AS hora,
       COUNT(*) AS pedidos,
       ROUND(100.0 * AVG(estado = 'sin_repartidor'), 1) AS pct_sin_repartidor
FROM delivery_pedidos
GROUP BY 1
ORDER BY 1;
```
```explicacion
En los picos del almuerzo (12 a 14 h) y la cena (19 a 22 h) el porcentaje de pedidos sin repartidor se triplica. Cada uno es una venta perdida y un cliente frustrado: ahí van los incentivos por hora para repartidores.
```
:::

:::ejercicio sql titulo="Los restaurantes más lentos"
Restaurantes con al menos 40 pedidos entregados: `restaurante_id`, `nombre`, `categoria`, `pedidos` y `preparacion_min` (promedio de minutos entre aceptado y retirado, redondeado a 1). Los 10 con mayor `preparacion_min`, de mayor a menor (desempata por `restaurante_id`).
```sql solucion
SELECT r.restaurante_id, r.nombre, r.categoria,
       COUNT(*) AS pedidos,
       ROUND(AVG((julianday(p.retirado) - julianday(p.aceptado)) * 1440), 1) AS preparacion_min
FROM delivery_pedidos p
JOIN delivery_restaurantes r ON r.restaurante_id = p.restaurante_id
WHERE p.estado = 'entregado'
GROUP BY r.restaurante_id, r.nombre, r.categoria
HAVING COUNT(*) >= 40
ORDER BY preparacion_min DESC, r.restaurante_id
LIMIT 10;
```
:::

:::ejercicio sql ordenado titulo="Cohortes: recompra a 30 días"
La cohorte de un cliente es el mes de su **primer pedido entregado** (`cohorte`, formato `'2024-01'`). Para cada cohorte: `clientes` y `recompra_30_pct`: porcentaje de clientes con **otro** pedido entregado dentro de los 30 días posteriores a su primer pedido (redondeado a 1). Ordena por cohorte.
```sql solucion
WITH primero AS (
  SELECT cliente_id, MIN(creado) AS primer_pedido
  FROM delivery_pedidos
  WHERE estado = 'entregado'
  GROUP BY cliente_id
)
SELECT substr(f.primer_pedido, 1, 7) AS cohorte,
       COUNT(*) AS clientes,
       ROUND(100.0 * AVG(EXISTS (
         SELECT 1 FROM delivery_pedidos p
         WHERE p.cliente_id = f.cliente_id
           AND p.estado = 'entregado'
           AND p.creado > f.primer_pedido
           AND julianday(p.creado) - julianday(f.primer_pedido) <= 30
       )), 1) AS recompra_30_pct
FROM primero f
GROUP BY 1
ORDER BY 1;
```
```pista
`EXISTS (subconsulta)` vale 1 o 0 para cada cliente; su `AVG` es la proporción que volvió.
```
```explicacion
Noviembre y diciembre caen a la mitad, pero no porque esos clientes sean peores: los que empezaron a fines de diciembre todavía no tuvieron 30 días para volver. Antes de presentar el gráfico, hay que excluir esas cohortes o marcarlas como incompletas.
```
:::

:::ejercicio sql ordenado titulo="¿El primer pedido tardío hace que no vuelvan?"
Usando el **primer pedido entregado** de cada cliente: clasifícalo en `'a tiempo'` (hasta 45 minutos) o `'tarde'` (más de 45) (columna `primer_pedido`). Para cada grupo: `clientes` y `recompra_30_pct` (como en el ejercicio anterior). Considera solo clientes cuyo primer pedido fue antes del `'2024-12-01'`. Ordena por `primer_pedido`.
```sql solucion
WITH primero AS (
  SELECT cliente_id, creado, entregado,
         ROW_NUMBER() OVER (PARTITION BY cliente_id ORDER BY creado) AS n
  FROM delivery_pedidos
  WHERE estado = 'entregado'
)
SELECT CASE WHEN (julianday(f.entregado) - julianday(f.creado)) * 1440 <= 45 THEN 'a tiempo' ELSE 'tarde' END AS primer_pedido,
       COUNT(*) AS clientes,
       ROUND(100.0 * AVG(EXISTS (
         SELECT 1 FROM delivery_pedidos p
         WHERE p.cliente_id = f.cliente_id AND p.estado = 'entregado'
           AND p.creado > f.creado AND julianday(p.creado) - julianday(f.creado) <= 30
       )), 1) AS recompra_30_pct
FROM primero f
WHERE f.n = 1 AND f.creado < '2024-12-01'
GROUP BY 1
ORDER BY 1;
```
```pista
Encuentra el primer pedido con `ROW_NUMBER() ... = 1` (necesitas su hora de entrega, no solo la fecha). El filtro de diciembre evita las cohortes incompletas.
```
```explicacion
La recompra es prácticamente igual (alrededor del 31 % contra el 30 %). La hipótesis "si el primer pedido llega tarde, el cliente no vuelve" **no se confirma** con estos datos. Un buen análisis también informa lo que no encontró: la demora sí baja la calificación (ejercicio 1), pero la retención depende de otras cosas. Antes de invertir en "proteger el primer pedido", conviene buscar otras causas (precio, variedad de restaurantes en la zona, plataforma).
```
:::

:::ejercicio abierto titulo="Cupones o velocidad"
La directora y marketing discuten. Con tus resultados (y lo que no se puede concluir de ellos), escribe: (1) qué palanca atacarías para bajar a 40 minutos y con qué acciones concretas por etapa; (2) qué puedes y qué no puedes decir sobre los cupones con estos datos; (3) cómo diseñarías un experimento para saber si los cupones aumentan la recompra; (4) qué tabla de hechos armarías para seguir todo esto cada día.
```solucion
1. Preparación (~20 min) y viaje (~18 min) pesan parecido; la aceptación es menor. Acciones: con los restaurantes más lentos, tiempos de preparación prometidos por plato y avisar al repartidor cuando el pedido está casi listo (que no espere en el local); en horas pico, incentivos por hora para repartidores (la falta de repartidores se triplica de 12 a 14 y de 19 a 22) y zonas de entrega más chicas. Meta intermedia: reducir el porcentaje de pedidos de más de 45 minutos, que es lo que hunde la calificación.
2. Con estos datos solo se ve que el ticket de los pedidos con cupón es igual al de los demás. No se puede concluir si los cupones generan recompra: los clientes que reciben cupones no son elegidos al azar (pueden ser los más activos o los que estaban por irse).
3. Experimento: tomar los clientes nuevos de un período, asignar al azar la mitad a recibir un cupón para su segundo pedido y la otra mitad a nada; comparar la recompra a 30 días y el margen (take rate después del costo del cupón). Definir antes el tamaño de muestra y la métrica principal.
4. fct_pedido con grano de un pedido: claves de cliente, restaurante, repartidor, ciudad y fecha; los cuatro timestamps de etapa (accumulating snapshot) y las duraciones ya calculadas; importes (subtotal, comisión, envío, cupón, propina), estado y calificación. De ahí salen todos los KPI de este caso con sumas y promedios simples, y un tablero diario por ciudad.
```
:::

:::errores
- **Tiempo de entrega promedio con pedidos cancelados** o sin hora de entrega.
- **Take rate sobre el total cobrado** incluyendo propinas o costo de envío, sin decirlo.
- **Relacionar demora y calificación** sin agrupar en tramos: una nube de puntos no se lee en un tablero.
:::
