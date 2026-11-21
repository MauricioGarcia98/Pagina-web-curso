---
titulo: Casos de negocio para analistas - de la pregunta vaga a la métrica
nivel: Experto
duracion: 75
resumen: La entrevista de analista de datos no pregunta "escribe un JOIN" - pregunta "las ventas de agosto cayeron, ¿qué pasó?" o "¿funcionó el checkout nuevo?". Aprendes un marco para responder (definir la métrica, descomponerla, segmentar, descartar explicaciones aburridas, recomendar) y lo aplicas con SQL sobre los datos del curso, incluida una paradoja de Simpson real escondida en el experimento A/B.
objetivos: Definir una métrica sin ambigüedad (numerador, denominador, filtros, período) | Descomponer un cambio en volumen y valor (pedidos × ticket promedio) | Segmentar por canal, dispositivo o cliente para encontrar dónde está el cambio | Reconocer la paradoja de Simpson y el efecto de mezcla en un experimento | Cerrar un caso con una recomendación accionable y sus riesgos
prerrequisitos: entrevistas-sql-deduplicar-pivotear-comparar | analisis-cohortes-retencion
autoevaluacion: ¿Puedes escribir la definición exacta de "tasa de cancelación"? | ¿Cómo separas una caída de ventas en volumen y ticket? | ¿Qué es el efecto de mezcla y cómo se detecta? | ¿Qué revisas antes de culpar a un cambio de producto?
---

:::analogia En palabras simples
Un médico que escucha "me siento mal" no receta enseguida: pregunta desde cuándo, dónde duele, mide la fiebre y descarta lo común antes de lo raro. Un caso de negocio es igual: "las ventas cayeron" es el síntoma; tu trabajo es medir, ubicar el dolor y descartar las causas aburridas (un feriado, un dato mal cargado) antes de las interesantes.
:::

## El marco en cinco pasos

| Paso | Pregunta que te haces | Ejemplo con "las ventas de agosto cayeron un 33 %" |
|---|---|---|
| 1. Definir | ¿Qué métrica exacta, qué período, contra qué? | Ventas netas de pedidos no cancelados, agosto contra julio de 2024 |
| 2. Validar | ¿El dato es real o es un problema de carga? | ¿Llegaron todos los archivos? ¿Cambió la definición de "cancelado"? |
| 3. Descomponer | ¿Bajó el volumen o el valor? | Ventas = pedidos × ticket promedio |
| 4. Segmentar | ¿Dónde está concentrado el cambio? | Por canal, país, dispositivo, cliente nuevo o recurrente |
| 5. Recomendar | ¿Qué haría, con qué riesgo, y cómo lo mido? | "Revisar la campaña de julio en web; si fue estacional, comparar con agosto de 2023" |

:::tip Descartar lo aburrido primero
Antes de proponer una teoría sofisticada, pregunta por lo aburrido: ¿cambió la cantidad de días del mes, hubo un feriado, un corte del sistema, un cambio en la forma de contar? En la práctica, una buena parte de las "caídas" son problemas de datos o de calendario.
:::

## Definir una métrica sin ambigüedad

"Tasa de cancelación" puede significar tres cosas distintas. Escríbela completa:

| Parte | Decisión |
|---|---|
| Numerador | Pedidos con `estado = 'cancelado'` |
| Denominador | **Todos** los pedidos del período (incluidos los cancelados) |
| Período | Por `fecha_pedido`, no por fecha de cancelación |
| Grano | Por canal |

## Descomponer: volumen por valor

`ventas = pedidos × ticket promedio`. Si las ventas caen, una de las dos (o las dos) cayó. Saber cuál cambia la conversación: menos pedidos sugiere tráfico o conversión; un ticket más bajo sugiere descuentos, mezcla de productos o clientes distintos.

## La paradoja de Simpson

En el experimento del checkout (`experimento_checkout`), el total dice que los dos grupos convierten igual: 12,4 % el control y 12,5 % el checkout nuevo. Pero si separas por dispositivo:

| dispositivo | control | nuevo_checkout |
|---|---|---|
| escritorio | 16,0 % (595 clientes) | 16,6 % (295 clientes) |
| móvil | 7,4 % (419 clientes) | 10,7 % (691 clientes) |

El checkout nuevo **gana en los dos dispositivos** y aun así empata en el total. ¿Cómo? El grupo nuevo recibió muchos más usuarios móviles, que convierten menos en cualquier versión. Esa diferencia de **mezcla** arrastra su promedio hacia abajo. Es la paradoja de Simpson: una tendencia que aparece en cada grupo puede desaparecer o invertirse al juntarlos.

:::cuidado Qué concluir (y qué no)
La paradoja no prueba que el checkout nuevo sea mejor: también dice que **la asignación no fue pareja** (un experimento bien aleatorizado reparte los dispositivos de forma parecida entre grupos). La recomendación correcta es: revisar por qué se desbalanceó la asignación, analizar por segmento con una prueba estadística en cada uno, y si se repite, correr el experimento de nuevo estratificando por dispositivo. Con estas muestras, la diferencia en escritorio es ruido; la de móvil hay que confirmarla.
:::

:::practica sql Encontrar la paradoja en el experimento
1. Ejecuta la primera consulta: conversión por grupo, sin segmentar. Los grupos parecen iguales.
2. Ejecuta la segunda: la misma métrica por dispositivo y grupo. Compara cada fila.
3. Ejecuta la tercera: el porcentaje de usuarios móviles en cada grupo. Ahí está la explicación.

```sql
SELECT grupo, COUNT(*) AS clientes, ROUND(100.0 * SUM(convirtio) / COUNT(*), 1) AS conversion_pct
FROM experimento_checkout GROUP BY grupo;

SELECT dispositivo, grupo, COUNT(*) AS clientes, ROUND(100.0 * SUM(convirtio) / COUNT(*), 1) AS conversion_pct
FROM experimento_checkout GROUP BY dispositivo, grupo ORDER BY dispositivo, grupo;

SELECT grupo, ROUND(100.0 * SUM(CASE WHEN dispositivo = 'movil' THEN 1 ELSE 0 END) / COUNT(*), 1) AS pct_movil
FROM experimento_checkout GROUP BY grupo;
```

Reto: calcula una conversión **ajustada** del grupo nuevo, ponderando cada dispositivo con la mezcla del grupo control (pista: conversión del nuevo en escritorio × % de escritorio del control + lo mismo para móvil).

Documentación oficial: [Agregaciones (DuckDB)](https://duckdb.org/docs/current/sql/functions/aggregates) · [CASE (SQLite)](https://www.sqlite.org/lang_expr.html#the_case_expression)
:::

:::errores
- **Responder con una teoría sin datos.** "Seguro fue la competencia" no es un análisis.
- **Promediar porcentajes.** El promedio de 16 % y 7 % no es la conversión total: pesa cada grupo por su tamaño.
- **Comparar contra un período no comparable.** Agosto contra julio mezcla estacionalidad; agrega agosto del año anterior.
- **Olvidar la recomendación.** El caso termina con "qué haría yo", no con una tabla.
:::

:::entrevista
**Pregunta:** "El gerente quiere lanzar el checkout nuevo ya, porque 'gana en todos los dispositivos'. ¿Qué le dices?"

**Respuesta modelo:** "Que el resultado es prometedor en móvil pero todavía no es concluyente: la asignación al experimento quedó desbalanceada, y en escritorio la diferencia es tan chica que puede ser ruido. Propongo dos semanas más con asignación estratificada por dispositivo y una métrica de éxito definida de antemano. Si el gerente necesita decidir hoy, lanzaría solo en móvil, con una alarma si la conversión baja."
:::

## Ejercicios

:::ejercicio quiz
El checkout nuevo convierte mejor en escritorio y en móvil, pero igual que el control en el total. ¿Cuál es la explicación más probable?
- [ ] Hay un error en la consulta del total
- [ ] El checkout nuevo es peor y los segmentos mienten
- [x] Los grupos tienen distinta mezcla de dispositivos, y móvil convierte menos en cualquier versión
- [ ] La conversión no se puede comparar entre dispositivos
:::

:::ejercicio quiz
Las ventas cayeron 33 % de julio a agosto. ¿Qué haces primero?
- [ ] Propongo una campaña de descuentos para agosto
- [x] Verifico que el dato sea real (cargas completas, misma definición) y comparo también con agosto del año anterior
- [ ] Busco qué hizo la competencia en agosto
- [ ] Segmento por cliente para encontrar a los culpables
:::

:::ejercicio sql dificultad=Avanzado titulo="Tasa de cancelación por canal en 2024"
Para cada canal, calcula sobre los pedidos de 2024: total de pedidos, cancelados y la tasa de cancelación en porcentaje con 1 decimal (cancelados sobre **todos** los pedidos). Columnas: `canal`, `pedidos`, `cancelados`, `tasa_pct`.
```sql solucion
SELECT canal, COUNT(*) AS pedidos,
       SUM(CASE WHEN estado = 'cancelado' THEN 1 ELSE 0 END) AS cancelados,
       ROUND(100.0 * SUM(CASE WHEN estado = 'cancelado' THEN 1 ELSE 0 END) / COUNT(*), 1) AS tasa_pct
FROM pedidos
WHERE fecha_pedido >= '2024-01-01' AND fecha_pedido < '2025-01-01'
GROUP BY canal;
```
```pista
El denominador incluye los cancelados: no filtres el estado en el `WHERE`. Cuenta los cancelados con `SUM(CASE WHEN estado = 'cancelado' THEN 1 ELSE 0 END)`.
```
:::

:::ejercicio sql dificultad=Experto titulo="Ticket promedio por segmento"
Calcula el **ticket promedio** (monto promedio por pedido) de cada segmento de cliente en 2024, solo pedidos no cancelados. El monto de un pedido es la suma de `cantidad * precio_unitario * (1 - descuento)` de sus líneas. Redondea a 2. Columnas: `segmento`, `pedidos`, `ticket_promedio`.
```sql solucion
WITH t AS (
  SELECT p.pedido_id, c.segmento, SUM(d.cantidad * d.precio_unitario * (1 - d.descuento)) AS total
  FROM pedidos p
  JOIN clientes c ON c.cliente_id = p.cliente_id
  JOIN detalle_pedidos d ON d.pedido_id = p.pedido_id
  WHERE p.estado <> 'cancelado' AND p.fecha_pedido >= '2024-01-01' AND p.fecha_pedido < '2025-01-01'
  GROUP BY p.pedido_id, c.segmento
)
SELECT segmento, COUNT(*) AS pedidos, ROUND(AVG(total), 2) AS ticket_promedio
FROM t GROUP BY segmento;
```
```pista
El ticket es **por pedido**: primero suma las líneas de cada pedido en una CTE, después promedia por segmento.
```
```pista
Si promedias directamente sobre `detalle_pedidos` obtienes el promedio por **línea**, que es otra métrica.
```
:::

:::ejercicio sql dificultad=Avanzado titulo="Conversión del experimento por dispositivo"
Con `experimento_checkout`, calcula para cada combinación de dispositivo y grupo: clientes, conversiones y conversión en porcentaje con 1 decimal. Columnas: `dispositivo`, `grupo`, `clientes`, `conversiones`, `conversion_pct`.
```sql solucion
SELECT dispositivo, grupo, COUNT(*) AS clientes, SUM(convirtio) AS conversiones,
       ROUND(100.0 * SUM(convirtio) / COUNT(*), 1) AS conversion_pct
FROM experimento_checkout
GROUP BY dispositivo, grupo;
```
```pista
`convirtio` vale 0 o 1: su suma son las conversiones y su promedio la tasa.
```
:::

:::ejercicio sql dificultad=Experto titulo="¿Cayeron los pedidos o el ticket?"
Descompón la caída de julio a agosto de 2024 por canal (pedidos no cancelados). Para cada canal devuelve los pedidos de julio y de agosto, y el ticket promedio (monto por pedido, redondeado a 2) de cada mes. Columnas: `canal`, `pedidos_jul`, `pedidos_ago`, `ticket_jul`, `ticket_ago`.
```sql solucion
WITH t AS (
  SELECT p.pedido_id, p.canal, substr(p.fecha_pedido, 1, 7) AS mes,
         SUM(d.cantidad * d.precio_unitario * (1 - d.descuento)) AS total
  FROM pedidos p JOIN detalle_pedidos d ON d.pedido_id = p.pedido_id
  WHERE p.estado <> 'cancelado' AND p.fecha_pedido >= '2024-07-01' AND p.fecha_pedido < '2024-09-01'
  GROUP BY p.pedido_id, p.canal, substr(p.fecha_pedido, 1, 7)
)
SELECT canal,
       SUM(CASE WHEN mes = '2024-07' THEN 1 ELSE 0 END) AS pedidos_jul,
       SUM(CASE WHEN mes = '2024-08' THEN 1 ELSE 0 END) AS pedidos_ago,
       ROUND(AVG(CASE WHEN mes = '2024-07' THEN total END), 2) AS ticket_jul,
       ROUND(AVG(CASE WHEN mes = '2024-08' THEN total END), 2) AS ticket_ago
FROM t GROUP BY canal;
```
```pista
Primero una fila por pedido con su total y su mes. Después pivotea por mes con `CASE`.
```
```pista
`AVG(CASE WHEN mes = '2024-07' THEN total END)` promedia solo julio: el `CASE` sin `ELSE` deja `NULL` en agosto y `AVG` ignora los nulos.
```
:::

:::ejercicio sql dificultad=Experto titulo="Margen bruto por categoría en 2024"
Calcula, para cada categoría, el **margen bruto** de 2024 (pedidos no cancelados): ingreso neto menos costo, donde el ingreso de una línea es `cantidad * precio_unitario * (1 - descuento)` y el costo es `cantidad * productos.costo`. Devuelve el margen redondeado a 2 y el margen sobre el ingreso en porcentaje con 1 decimal. Columnas: `categoria`, `margen`, `margen_pct`.
```sql solucion
WITH l AS (
  SELECT c.nombre AS categoria,
         d.cantidad * d.precio_unitario * (1 - d.descuento) AS ingreso,
         d.cantidad * pr.costo AS costo
  FROM detalle_pedidos d
  JOIN pedidos p ON p.pedido_id = d.pedido_id
  JOIN productos pr ON pr.producto_id = d.producto_id
  JOIN categorias c ON c.categoria_id = pr.categoria_id
  WHERE p.estado <> 'cancelado' AND p.fecha_pedido >= '2024-01-01' AND p.fecha_pedido < '2025-01-01'
)
SELECT categoria, ROUND(SUM(ingreso - costo), 2) AS margen,
       ROUND(100.0 * SUM(ingreso - costo) / SUM(ingreso), 1) AS margen_pct
FROM l GROUP BY categoria;
```
```pista
Calcula ingreso y costo por línea en una CTE (cuatro tablas), después suma por categoría.
```
```pista
El porcentaje es `SUM(margen) / SUM(ingreso)`, no el promedio de los porcentajes de cada línea.
```
:::
