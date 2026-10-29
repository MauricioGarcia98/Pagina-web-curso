---
titulo: "Proyecto completo I · Rápido: del pedido de negocio al modelo de datos"
nivel: Experto
duracion: 90
resumen: Un proyecto real de punta a punta con la app de delivery Rápido. En esta primera parte, el relevamiento, la arquitectura, las capas bronze/silver/gold escritas en SQL (limpieza, tabla de hechos con las etapas del pedido, dimensiones y un mart diario) y los controles de calidad que deciden si los datos se publican.
objetivos: Convertir un pedido de negocio en requerimientos, métricas definidas y un diseño de capas | Escribir la capa silver: limpieza, tipos y reglas de validez de los pedidos | Diseñar la tabla de hechos de pedidos con las duraciones de cada etapa (accumulating snapshot) | Construir un mart diario por ciudad con KPIs que se puedan sumar correctamente | Escribir controles de calidad que devuelvan las filas problemáticas
prerrequisitos: casos-delivery | modelado-kimball | arquitectura-diseno-lakehouse
autoevaluacion: ¿Puedes escribir el documento de requerimientos de un tablero (preguntas, métricas, grano, frescura)? | ¿Sabes qué reglas de calidad aplicarías a una tabla de pedidos con cuatro timestamps? | ¿Sabes por qué el mart guarda sumas y conteos en lugar de promedios? | ¿Puedes explicar qué es un accumulating snapshot? | ¿Sabes qué control debe frenar una publicación y cuál solo avisar?
---

:::escenario El primer proyecto que te asignan solo
Llevas tres meses en el equipo de datos de **Rápido**. La directora de operaciones (la del caso 🛵) aprobó el proyecto **"Tablero de operaciones"** y te lo asignan:

> "Quiero ver cada mañana, por ciudad y por día, cuántos pedidos entregamos, en cuánto tiempo y en qué etapa se nos va el tiempo, cuántos perdimos por falta de repartidores, y el GMV y el take rate. Y que los números sean los mismos que ve finanzas."

Este proyecto (dos lecciones) es exactamente lo que harías en tu trabajo, en orden. Si lo completas, tienes un proyecto de portafolio que puedes explicar en una entrevista de principio a fin.
:::

## Paso 1: el relevamiento

Antes de una línea de código, un ingeniero de datos senior escribe una página de **requerimientos** y la valida con quien lo pidió. Es la mejor inversión del proyecto: evita construir el tablero equivocado.

| Pregunta | Respuesta acordada |
|---|---|
| **¿Quién lo usa y para qué decisión?** | Operaciones, cada mañana: dónde poner incentivos de repartidores y con qué restaurantes hablar |
| **Métricas y definiciones** | Pedidos entregados; tiempo total y por etapa (promedio y % de más de 45 min); pedidos sin repartidor; GMV = subtotal de entregados; take rate = (comisión + envío − cupón) / GMV |
| **Grano** | Ciudad × día (la fecha es la de **creación** del pedido) |
| **Frescura** | Datos de ayer listos a las 7:00 |
| **Fuente** | Base transaccional de la app (pedidos) y el maestro de restaurantes |
| **Fuente de verdad del GMV** | La misma regla que usa finanzas (se valida con ellos el total de un mes) |
| **Fuera de alcance** | Tiempo real (fase 2), datos de repartidores individuales |

:::tip El acuerdo de definiciones
"Pedidos del día" puede significar pedidos **creados** ese día o **entregados** ese día; a las 23:50 la diferencia importa. Escribe la definición, haz que la directora la apruebe, y ponla en la documentación del modelo. Es lo que evita la reunión de "tu número no coincide con el mío".
:::

## Paso 2: la arquitectura

```diagrama
titulo: Arquitectura del tablero de operaciones de Rápido
nodo app: Base de la app | icono=base | col=0 | fila=0 | color=gris | sub=pedidos, restaurantes
nodo br: bronze | icono=bucket | col=1 | fila=0 | color=naranja | sub=copia diaria cruda\n(ingesta incremental)
nodo sv: silver | icono=transformar | col=2 | fila=0 | color=gris | sub=stg_rapido_pedidos:\nlimpio y validado
nodo fct: gold: fct_rapido_pedidos | icono=tabla | col=3 | fila=0 | color=amarillo | sub=1 fila por pedido\ncon sus etapas
nodo dim: gold: dims | icono=cubo | col=3 | fila=1 | color=amarillo | sub=dim_restaurante,\ndim_fecha
nodo mart: mart_operaciones_diario | icono=grafico | col=2 | fila=1 | color=verde | sub=ciudad × día
nodo dq: Controles de calidad | icono=escudo | col=1 | fila=1 | color=rojo | sub=frenan o avisan
nodo bi: Tablero | icono=dashboard | col=1 | fila=2 | color=azul | sub=cada mañana 7:00
flecha app -> br
flecha br -> sv
flecha sv -> fct
flecha dim -> mart
flecha fct -> mart
flecha mart -> dq
flecha dq -> bi: publica si pasa
```

| Capa | Qué tiene | Quién la usa |
|---|---|---|
| **bronze** | La copia tal cual de la fuente, con fecha de carga | Nadie directo; sirve para reprocesar |
| **silver** | `stg_rapido_pedidos`: tipos correctos, estados normalizados, reglas de validez | Ingeniería, analistas avanzados |
| **gold** | `fct_rapido_pedidos` (hechos) y dimensiones | Analistas, ciencia de datos |
| **mart** | `mart_operaciones_diario`: el tablero, ya agregado | La directora y su equipo |

En esta lección escribes silver, gold, el mart y los controles en **SQL** sobre las tablas `delivery_*` (que hacen de bronze). En la segunda parte, el mismo flujo se convierte en un pipeline con Python, PySpark, dbt, Airflow y Terraform.

## Paso 3: silver — limpiar y validar

Reglas acordadas para que un pedido sea **válido** para el tablero:

1. El estado es uno de los cuatro conocidos.
2. Si está `entregado`, tiene los cuatro timestamps y están **en orden** (creado ≤ aceptado ≤ retirado ≤ entregado).
3. El subtotal es positivo.

Los pedidos que no cumplen no se borran: se marcan (`es_valido = 0`) y un control cuenta cuántos hay.

:::ejercicio sql titulo="stg_rapido_pedidos: la capa silver"
Escribe la consulta de `stg_rapido_pedidos`: todas las columnas de `delivery_pedidos` que necesita el tablero (`pedido_id`, `cliente_id`, `restaurante_id`, `ciudad`, `creado`, `aceptado`, `retirado`, `entregado`, `subtotal`, `costo_envio`, `descuento_cupon`, `estado`), más `fecha` (la fecha de `creado`, con `date()`) y `es_valido` (1 si cumple las tres reglas de arriba, 0 si no). Ordena por `pedido_id`.
```sql inicial
SELECT pedido_id, cliente_id, restaurante_id, ciudad,
       creado, aceptado, retirado, entregado,
       subtotal, costo_envio, descuento_cupon, estado,
       date(creado) AS fecha,
       -- es_valido: 1 o 0 según las tres reglas
FROM delivery_pedidos
ORDER BY pedido_id;
```
```sql solucion
SELECT pedido_id, cliente_id, restaurante_id, ciudad,
       creado, aceptado, retirado, entregado,
       subtotal, costo_envio, descuento_cupon, estado,
       date(creado) AS fecha,
       CASE
         WHEN estado NOT IN ('entregado', 'cancelado_cliente', 'cancelado_restaurante', 'sin_repartidor') THEN 0
         WHEN subtotal <= 0 THEN 0
         WHEN estado = 'entregado'
              AND NOT (aceptado IS NOT NULL AND retirado IS NOT NULL AND entregado IS NOT NULL
                       AND creado <= aceptado AND aceptado <= retirado AND retirado <= entregado) THEN 0
         ELSE 1
       END AS es_valido
FROM delivery_pedidos
ORDER BY pedido_id;
```
```pista
Un `CASE` que devuelve 0 en cuanto falla una regla y 1 al final (`ELSE 1`). Las fechas-hora en formato `'AAAA-MM-DD hh:mm:ss'` se pueden comparar como texto: el orden alfabético coincide con el cronológico.
```
:::

## Paso 4: gold — la tabla de hechos con etapas

`fct_rapido_pedidos` tiene **una fila por pedido** con sus claves, sus importes y la duración de cada etapa ya calculada. En Kimball se llama **accumulating snapshot**: una fila que se va completando a medida que el proceso avanza (creado → aceptado → retirado → entregado). Calcular las duraciones una sola vez aquí evita que cada analista las calcule distinto.

```text
fct_rapido_pedidos
  pedido_id, fecha, ciudad, restaurante_id, cliente_id, estado
  min_aceptacion, min_preparacion, min_viaje, min_total     ← NULL si la etapa no ocurrió
  gmv (subtotal si se entregó, 0 si no), comision, costo_envio, descuento_cupon
  es_tarde (1 si min_total > 45)
```

:::ejercicio sql titulo="fct_rapido_pedidos: la tabla de hechos"
Escribe `fct_rapido_pedidos` a partir de `delivery_pedidos` **válidos** (aplica las mismas reglas de validez del ejercicio anterior en el `WHERE`, o repite el CASE en un CTE) y de `delivery_restaurantes` (para la comisión). Columnas: `pedido_id`, `fecha`, `ciudad`, `restaurante_id`, `estado`, `min_aceptacion`, `min_preparacion`, `min_viaje`, `min_total` (minutos redondeados a 1), `gmv` (subtotal si `entregado`, si no 0), `comision` (gmv × comision_pct / 100, redondeada a 2), `costo_envio` y `descuento_cupon` (0 si no se entregó) y `es_tarde`. Ordena por `pedido_id`.
```sql solucion
WITH stg AS (
  SELECT p.*, date(p.creado) AS fecha,
         CASE
           WHEN p.estado NOT IN ('entregado', 'cancelado_cliente', 'cancelado_restaurante', 'sin_repartidor') THEN 0
           WHEN p.subtotal <= 0 THEN 0
           WHEN p.estado = 'entregado'
                AND NOT (p.aceptado IS NOT NULL AND p.retirado IS NOT NULL AND p.entregado IS NOT NULL
                         AND p.creado <= p.aceptado AND p.aceptado <= p.retirado AND p.retirado <= p.entregado) THEN 0
           ELSE 1
         END AS es_valido
  FROM delivery_pedidos p
)
SELECT s.pedido_id, s.fecha, s.ciudad, s.restaurante_id, s.estado,
       ROUND((julianday(s.aceptado) - julianday(s.creado)) * 1440, 1) AS min_aceptacion,
       ROUND((julianday(s.retirado) - julianday(s.aceptado)) * 1440, 1) AS min_preparacion,
       ROUND((julianday(s.entregado) - julianday(s.retirado)) * 1440, 1) AS min_viaje,
       ROUND((julianday(s.entregado) - julianday(s.creado)) * 1440, 1) AS min_total,
       CASE WHEN s.estado = 'entregado' THEN s.subtotal ELSE 0 END AS gmv,
       ROUND(CASE WHEN s.estado = 'entregado' THEN s.subtotal * r.comision_pct / 100.0 ELSE 0 END, 2) AS comision,
       CASE WHEN s.estado = 'entregado' THEN s.costo_envio ELSE 0 END AS costo_envio,
       CASE WHEN s.estado = 'entregado' THEN s.descuento_cupon ELSE 0 END AS descuento_cupon,
       CASE WHEN s.estado = 'entregado' AND (julianday(s.entregado) - julianday(s.creado)) * 1440 > 45 THEN 1 ELSE 0 END AS es_tarde
FROM stg s
JOIN delivery_restaurantes r ON r.restaurante_id = s.restaurante_id
WHERE s.es_valido = 1
ORDER BY s.pedido_id;
```
```pista
Reutiliza el `CASE` de validez en un CTE y filtra `es_valido = 1`. Los minutos salen de `(julianday(b) - julianday(a)) * 1440`; si alguna fecha es `NULL`, el resultado es `NULL` (la etapa no ocurrió), que es justo lo que se quiere.
```
:::

## Paso 5: el mart diario, con medidas aditivas

El tablero muestra promedios y porcentajes, pero el mart **no** los guarda: guarda **sumas y conteos** (medidas **aditivas**), y el tablero divide. ¿Por qué? Porque el usuario va a querer ver la semana, el mes o "todas las ciudades", y **el promedio de los promedios diarios no es el promedio del mes**: un día con 10 pedidos pesaría igual que uno con 500.

```text
mart_operaciones_diario (ciudad, fecha,
  pedidos, entregados, sin_repartidor, tarde,
  suma_min_total, suma_min_preparacion, suma_min_viaje,       ← para promediar: suma / entregados
  gmv, comision, envios, cupones)                              ← take rate = (comision + envios − cupones) / gmv
```

:::ejercicio sql titulo="mart_operaciones_diario"
Construye el mart por `ciudad` y `fecha` a partir de los pedidos **válidos** (con el mismo CTE de validez y las mismas definiciones de `fct_rapido_pedidos`). Columnas: `ciudad`, `fecha`, `pedidos`, `entregados`, `sin_repartidor`, `tarde`, `suma_min_total`, `suma_min_preparacion`, `suma_min_viaje` (redondeadas a 1), `gmv`, `comision`, `envios`, `cupones` (redondeados a 2). Ordena por `ciudad` y `fecha`.
```sql solucion
WITH stg AS (
  SELECT p.*, date(p.creado) AS fecha,
         CASE
           WHEN p.estado NOT IN ('entregado', 'cancelado_cliente', 'cancelado_restaurante', 'sin_repartidor') THEN 0
           WHEN p.subtotal <= 0 THEN 0
           WHEN p.estado = 'entregado'
                AND NOT (p.aceptado IS NOT NULL AND p.retirado IS NOT NULL AND p.entregado IS NOT NULL
                         AND p.creado <= p.aceptado AND p.aceptado <= p.retirado AND p.retirado <= p.entregado) THEN 0
           ELSE 1
         END AS es_valido
  FROM delivery_pedidos p
),
fct AS (
  SELECT s.ciudad, s.fecha, s.estado,
         (julianday(s.entregado) - julianday(s.creado)) * 1440 AS min_total,
         (julianday(s.retirado) - julianday(s.aceptado)) * 1440 AS min_preparacion,
         (julianday(s.entregado) - julianday(s.retirado)) * 1440 AS min_viaje,
         CASE WHEN s.estado = 'entregado' THEN s.subtotal ELSE 0 END AS gmv,
         CASE WHEN s.estado = 'entregado' THEN s.subtotal * r.comision_pct / 100.0 ELSE 0 END AS comision,
         CASE WHEN s.estado = 'entregado' THEN s.costo_envio ELSE 0 END AS envio,
         CASE WHEN s.estado = 'entregado' THEN s.descuento_cupon ELSE 0 END AS cupon
  FROM stg s
  JOIN delivery_restaurantes r ON r.restaurante_id = s.restaurante_id
  WHERE s.es_valido = 1
)
SELECT ciudad, fecha,
       COUNT(*) AS pedidos,
       SUM(estado = 'entregado') AS entregados,
       SUM(estado = 'sin_repartidor') AS sin_repartidor,
       SUM(estado = 'entregado' AND min_total > 45) AS tarde,
       ROUND(SUM(CASE WHEN estado = 'entregado' THEN min_total END), 1) AS suma_min_total,
       ROUND(SUM(CASE WHEN estado = 'entregado' THEN min_preparacion END), 1) AS suma_min_preparacion,
       ROUND(SUM(CASE WHEN estado = 'entregado' THEN min_viaje END), 1) AS suma_min_viaje,
       ROUND(SUM(gmv), 2) AS gmv,
       ROUND(SUM(comision), 2) AS comision,
       ROUND(SUM(envio), 2) AS envios,
       ROUND(SUM(cupon), 2) AS cupones
FROM fct
GROUP BY ciudad, fecha
ORDER BY ciudad, fecha;
```
:::

:::ejercicio sql ordenado titulo="El tablero del mes, desde el mart"
Usando la lógica del mart (puedes pegar sus CTE), calcula el resumen de **diciembre de 2024** por `ciudad`: `entregados`, `min_promedio` (suma de minutos / entregados, redondeado a 1), `pct_tarde` (redondeado a 1), `pct_sin_repartidor` (sobre todos los pedidos, redondeado a 1), `gmv` (redondeado a 0) y `take_rate_pct` (redondeado a 1). Ordena por `gmv` descendente.
```sql solucion
WITH stg AS (
  SELECT p.*, date(p.creado) AS fecha,
         CASE
           WHEN p.estado NOT IN ('entregado', 'cancelado_cliente', 'cancelado_restaurante', 'sin_repartidor') THEN 0
           WHEN p.subtotal <= 0 THEN 0
           WHEN p.estado = 'entregado'
                AND NOT (p.aceptado IS NOT NULL AND p.retirado IS NOT NULL AND p.entregado IS NOT NULL
                         AND p.creado <= p.aceptado AND p.aceptado <= p.retirado AND p.retirado <= p.entregado) THEN 0
           ELSE 1
         END AS es_valido
  FROM delivery_pedidos p
),
fct AS (
  SELECT s.ciudad, s.fecha, s.estado,
         (julianday(s.entregado) - julianday(s.creado)) * 1440 AS min_total,
         CASE WHEN s.estado = 'entregado' THEN s.subtotal ELSE 0 END AS gmv,
         CASE WHEN s.estado = 'entregado' THEN s.subtotal * r.comision_pct / 100.0 ELSE 0 END AS comision,
         CASE WHEN s.estado = 'entregado' THEN s.costo_envio ELSE 0 END AS envio,
         CASE WHEN s.estado = 'entregado' THEN s.descuento_cupon ELSE 0 END AS cupon
  FROM stg s JOIN delivery_restaurantes r ON r.restaurante_id = s.restaurante_id
  WHERE s.es_valido = 1
),
mart AS (
  SELECT ciudad, fecha, COUNT(*) AS pedidos,
         SUM(estado = 'entregado') AS entregados,
         SUM(estado = 'sin_repartidor') AS sin_repartidor,
         SUM(estado = 'entregado' AND min_total > 45) AS tarde,
         SUM(CASE WHEN estado = 'entregado' THEN min_total END) AS suma_min_total,
         SUM(gmv) AS gmv, SUM(comision) AS comision, SUM(envio) AS envios, SUM(cupon) AS cupones
  FROM fct GROUP BY ciudad, fecha
)
SELECT ciudad,
       SUM(entregados) AS entregados,
       ROUND(SUM(suma_min_total) / SUM(entregados), 1) AS min_promedio,
       ROUND(100.0 * SUM(tarde) / SUM(entregados), 1) AS pct_tarde,
       ROUND(100.0 * SUM(sin_repartidor) / SUM(pedidos), 1) AS pct_sin_repartidor,
       ROUND(SUM(gmv), 0) AS gmv,
       ROUND(100.0 * (SUM(comision) + SUM(envios) - SUM(cupones)) / SUM(gmv), 1) AS take_rate_pct
FROM mart
WHERE fecha >= '2024-12-01' AND fecha < '2025-01-01'
GROUP BY ciudad
ORDER BY gmv DESC;
```
```pista
Del mart diario al mes se **suman** las medidas y se divide al final: `SUM(suma_min_total) / SUM(entregados)`, nunca `AVG` de un promedio diario.
```
:::

## Paso 6: los controles de calidad

Los controles se escriben como consultas que **devuelven las filas problemáticas**: si la consulta devuelve 0 filas, el control pasa. Así el resultado sirve a la vez para la alerta y para investigar.

| Control | Severidad | Si falla |
|---|---|---|
| Hay datos de **ayer** en todas las ciudades | Bloqueante | No se publica; alerta al equipo |
| `pedido_id` único | Bloqueante | No se publica |
| Pedidos inválidos < 1 % del día | Advertencia | Se publica y se avisa |
| GMV diario dentro de ±50 % del promedio de los 7 días anteriores | Advertencia | Se publica con una nota |

:::ejercicio sql titulo="Control: la proporción de inválidos por día"
Escribe el control de advertencia: para cada `fecha`, `pedidos`, `invalidos` y `pct_invalidos` (redondeado a 2), devolviendo **solo** los días donde los inválidos superan el 1 %. Ordena por `fecha`.
```sql solucion
WITH stg AS (
  SELECT date(creado) AS fecha,
         CASE
           WHEN estado NOT IN ('entregado', 'cancelado_cliente', 'cancelado_restaurante', 'sin_repartidor') THEN 0
           WHEN subtotal <= 0 THEN 0
           WHEN estado = 'entregado'
                AND NOT (aceptado IS NOT NULL AND retirado IS NOT NULL AND entregado IS NOT NULL
                         AND creado <= aceptado AND aceptado <= retirado AND retirado <= entregado) THEN 0
           ELSE 1
         END AS es_valido
  FROM delivery_pedidos
)
SELECT fecha,
       COUNT(*) AS pedidos,
       SUM(es_valido = 0) AS invalidos,
       ROUND(100.0 * SUM(es_valido = 0) / COUNT(*), 2) AS pct_invalidos
FROM stg
GROUP BY fecha
HAVING 100.0 * SUM(es_valido = 0) / COUNT(*) > 1
ORDER BY fecha;
```
```explicacion
El control encuentra un incidente: del 14 al 16 de agosto, alrededor de un 30 % de los pedidos tiene `aceptado` **después** de `retirado`. Fue una versión de la app con un error en el reloj del restaurante. Sin este control, esos días habrían mostrado tiempos de preparación negativos que bajan el promedio y nadie se habría enterado. Con el control, el tablero se publica con una nota y el equipo de la app recibe el detalle de los pedidos afectados.
```
:::

:::ejercicio sql titulo="Control: GMV fuera de lo normal"
Por `ciudad` y `fecha` (entregados válidos; para simplificar, usa todos los entregados), calcula el `gmv` del día y el `promedio_7d` (promedio del GMV de los **7 días anteriores** de esa ciudad, sin incluir el día). Devuelve solo los días con al menos 7 días previos de historia donde el GMV se aleja más de un 50 % del promedio (`desvio_pct` = (gmv − promedio) / promedio × 100, redondeado a 1). Columnas: `ciudad`, `fecha`, `gmv`, `promedio_7d` (redondeados a 2) y `desvio_pct`. Ordena por `ciudad` y `fecha`.
```sql solucion
WITH d AS (
  SELECT ciudad, date(creado) AS fecha, SUM(subtotal) AS gmv
  FROM delivery_pedidos
  WHERE estado = 'entregado'
  GROUP BY ciudad, date(creado)
),
v AS (
  SELECT ciudad, fecha, gmv,
         AVG(gmv) OVER (PARTITION BY ciudad ORDER BY fecha ROWS BETWEEN 7 PRECEDING AND 1 PRECEDING) AS promedio_7d,
         COUNT(*) OVER (PARTITION BY ciudad ORDER BY fecha ROWS BETWEEN 7 PRECEDING AND 1 PRECEDING) AS dias_previos
  FROM d
)
SELECT ciudad, fecha, ROUND(gmv, 2) AS gmv, ROUND(promedio_7d, 2) AS promedio_7d,
       ROUND(100.0 * (gmv - promedio_7d) / promedio_7d, 1) AS desvio_pct
FROM v
WHERE dias_previos = 7 AND ABS(gmv - promedio_7d) > 0.5 * promedio_7d
ORDER BY ciudad, fecha;
```
```pista
`ROWS BETWEEN 7 PRECEDING AND 1 PRECEDING` toma las 7 filas anteriores sin la actual. Cuenta también cuántas filas entraron en la ventana para ignorar los primeros días.
```
```explicacion
Con pocos pedidos por ciudad y día, el GMV diario es muy variable y el control dispara muchas veces: es una señal de que el umbral (±50 %) o la ventana (7 días) no son adecuados para ciudades chicas. Calibrar los controles para que no generen ruido es parte del trabajo; un control que siempre suena termina ignorado.
```
:::

<!-- estandar:errores -->
:::errores
- **Arrancar por el tablero**: sin definiciones acordadas, el tablero se rehace tres veces. Primero el relevamiento.
- **Guardar promedios en el mart**: al agregar por semana o por "todas las ciudades" el número sale mal. Guarda sumas y conteos.
- **Borrar los registros inválidos**: desaparecen sin rastro y nadie sabe que hubo un problema en la fuente. Márcalos y cuéntalos.
- **Repetir la lógica en cada capa**: si la regla de validez está escrita en tres lugares, un día alguien cambia una y los números dejan de cuadrar. En la segunda parte, dbt resuelve esto con `ref()`: `fct_rapido_pedidos` lee de `stg_rapido_pedidos`.
- **Controles que solo dicen "falló"**: un control útil devuelve las filas, la severidad y a quién avisar.
:::

<!-- estandar:trabajo -->
:::trabajo
- Este documento de requerimientos (una página) se guarda en el repositorio junto al código, y cada métrica se documenta en el modelo (dbt docs o el catálogo). Cuando alguien pregunta "¿cómo se calcula el take rate?", la respuesta es un enlace.
- La validación con finanzas se hace **antes** de publicar: se compara el GMV de un mes cerrado entre el mart y el sistema contable. Si no coincide, se entiende la diferencia y se documenta.
- En una entrevista, este proyecto se cuenta así: problema de negocio → decisiones de diseño (grano, capas, medidas aditivas) → calidad → resultado (qué decisión permitió tomar).
:::

<!-- estandar:entrevista -->
:::entrevista "Cuéntame un proyecto de datos que hayas hecho de principio a fin."
Uso la estructura situación–decisiones–resultado. "En Rápido, operaciones necesitaba ver cada mañana los tiempos de entrega por ciudad y etapa. Empecé acordando definiciones y grano (ciudad por día, por fecha de creación). Diseñé una capa silver con reglas de validez que marcan en lugar de borrar, una tabla de hechos tipo accumulating snapshot con las duraciones de cada etapa, y un mart con medidas aditivas para que cualquier agregación sea correcta. Agregué controles de frescura y unicidad que bloquean la publicación y controles de volumen que avisan. El tablero mostró que la preparación pesaba tanto como el viaje, y operaciones empezó a trabajar con los restaurantes más lentos."
:::
