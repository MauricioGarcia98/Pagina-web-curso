---
titulo: "Caso 🚕 Ruta: viajes, esperas y tarifa dinámica"
nivel: Avanzado
duracion: 55
resumen: Tasa de cancelación, tiempos de espera, horas pico, tarifa dinámica, ranking de conductores y retención de pasajeros.
objetivos: Calcular tasas de completitud y de viajes sin conductor por ciudad y por hora | Medir tiempos de espera y duración con diferencias entre marcas de tiempo | Separar el ingreso base del ingreso por tarifa dinámica | Rankear conductores con un mínimo de viajes y medir la retención de pasajeros
prerrequisitos: casos-metodo | sql-ventanas-1
autoevaluacion: ¿Puedes calcular el porcentaje de viajes sin conductor por hora del día? | ¿Puedes calcular el tiempo de espera en minutos entre la solicitud y el inicio? | ¿Sabes cuánto del ingreso viene del recargo dinámico y cómo se calcula? | ¿Sabes por qué un ranking de calificación necesita un mínimo de viajes? | ¿Puedes seguir mes a mes a una cohorte de pasajeros?
---

<!-- estandar:escenario -->
:::escenario Ruta
La gerente de operaciones de **Ruta**, la app de viajes, tiene la reunión mensual con las ciudades:

> "Cada ciudad dice que le va bien, pero los números de quejas dicen otra cosa. Quiero ver por ciudad cuántas solicitudes se completan, cuánto espera la gente y qué conductores son los mejores. Y finanzas quiere saber cuánto ganamos por la tarifa dinámica."

Una app de viajes es un **mercado de dos lados**: pasajeros que piden y conductores que ofrecen. Si falta oferta, se pierden viajes; si sobra, los conductores ganan poco y se van.
:::
**Ruta** es una app de viajes que opera en cinco ciudades. Operaciones quiere saber dónde falla el servicio y finanzas quiere entender los ingresos.

## El modelo de datos

```text
viajes_pasajeros (pasajero_id, ciudad, fecha_registro)
viajes_conductores (conductor_id, nombre, ciudad, fecha_alta, vehiculo)
viajes_viajes (viaje_id, pasajero_id, conductor_id, ciudad,
               fecha_hora_solicitud, fecha_hora_inicio, fecha_hora_fin,
               distancia_km, tarifa, multiplicador, estado, calificacion)
```

- Cada fila de `viajes_viajes` es una **solicitud**. `estado`: `completado`, `cancelado_pasajero`, `cancelado_conductor` o `sin_conductor` (nadie aceptó).
- **Tiempo de espera** = minutos entre `fecha_hora_solicitud` y `fecha_hora_inicio` (solo completados).
- `multiplicador` > 1 significa **tarifa dinámica** (*surge*): hay más demanda que conductores.
- `tarifa` y `calificacion` solo existen en viajes completados (y no todos califican).

## Cómo funciona una app de viajes

Una app como Ruta es un **mercado de dos lados** (*marketplace*): de un lado los **pasajeros** que piden viajes, del otro los **conductores** que los aceptan. La app no tiene autos: conecta a ambos y cobra una comisión por cada viaje completado. Su gran desafío es el **equilibrio entre oferta y demanda**:

- Si hay **más pasajeros que conductores** (hora pico, lluvia), las esperas crecen, muchas solicitudes quedan `sin_conductor` y los pasajeros se van a la competencia.
- Si hay **más conductores que pasajeros**, los conductores ganan poco por hora y dejan de conectarse.

La **tarifa dinámica** (*surge pricing*) es la herramienta para equilibrar: cuando falta oferta, el precio sube (`multiplicador` > 1). Eso reduce algo de demanda y, sobre todo, atrae conductores a la calle.

## Los indicadores (KPIs) de este caso

| KPI | Definición | Fórmula | Por qué importa |
|---|---|---|---|
| **Tasa de completados** | Solicitudes que terminan en viaje | completados / solicitudes | Mide la calidad del servicio: cada solicitud perdida es ingreso perdido |
| **Tasa sin conductor** | Solicitudes que nadie aceptó | sin_conductor / solicitudes | Indica **falta de oferta** (zonas u horas a reforzar) |
| **Tasa de cancelación** | Cancelaciones del pasajero o del conductor | canceladas / solicitudes | Pasajero: esperas largas o precio. Conductor: viajes poco convenientes |
| **Tiempo de espera** | Minutos desde la solicitud hasta el inicio | `(inicio − solicitud) × 1440` | La métrica que más percibe el pasajero |
| **Tarifa por km** | Ingreso por distancia recorrida | `SUM(tarifa) / SUM(distancia_km)` | Compara precios entre ciudades o tipos de vehículo |
| **Ingreso por hora conectado** | Lo que gana un conductor por hora de viaje | tarifa / horas de viaje | Si baja, los conductores se van |
| **Retención de pasajeros** | Pasajeros que vuelven a viajar | activos en el mes N que ya viajaban antes | Adquirir un pasajero nuevo es caro: retener es crecer |

## Un ejemplo resuelto paso a paso

**Pregunta:** "¿Cambia la experiencia según el tipo de vehículo? Queremos viajes, distancia promedio, tarifa por km y calificación promedio."

1. **Grano**: una fila por tipo de vehículo. El vehículo está en `viajes_conductores`, así que hay que **unir** con el conductor de cada viaje.
2. **Filtro**: solo viajes `completado` (los demás no tienen tarifa ni distancia).
3. **Métricas**: ojo con la tarifa por km: es `SUM(tarifa) / SUM(distancia)`, **no** el promedio de `tarifa / distancia` de cada viaje (un viaje de 1 km a precio mínimo distorsionaría ese promedio). Es el famoso "promedio de cocientes vs. cociente de sumas".

```sql
SELECT c.vehiculo,
       COUNT(*)                                   AS viajes,
       ROUND(AVG(v.distancia_km), 1)              AS km_promedio,
       ROUND(SUM(v.tarifa) / SUM(v.distancia_km), 2) AS tarifa_por_km,
       ROUND(AVG(v.calificacion), 2)              AS calificacion
FROM viajes_viajes v
JOIN viajes_conductores c ON c.conductor_id = v.conductor_id
WHERE v.estado = 'completado'
GROUP BY c.vehiculo
ORDER BY tarifa_por_km DESC;
```

| vehiculo | viajes | km_promedio | tarifa_por_km | calificacion |
|---|---|---|---|---|
| van | 647 | 10.1 | 1.29 | 4.21 |
| auto | 6437 | 10.2 | 1.28 | 4.27 |
| moto | 1839 | 10.2 | 1.26 | 4.34 |

**Lectura de negocio:** las motos cobran un poco menos por km pero tienen la **mejor calificación** (probablemente llegan más rápido en el tráfico). Ese dato justifica, por ejemplo, ofrecer motos en las horas pico de ciudades congestionadas.

Fíjate en `AVG(v.calificacion)`: 2.317 viajes completados **no** tienen calificación (`NULL`), y `AVG` los ignora. Es lo correcto aquí: un viaje sin calificar no es un viaje con nota 0.

```recorrido
titulo: La experiencia por tipo de vehículo, paso a paso
estacion v: Viajes | icono=tabla
estacion join: JOIN conductores | icono=capas
estacion filtro: Solo completados | icono=lupa
estacion km: Tarifa por km | icono=reglas
estacion res: Resultado | icono=check
paso v: Los viajes
`viajes_viajes` tiene la tarifa y la distancia, pero el **vehículo** es un dato del conductor.
>>> tabla
viaje_id,conductor_id,estado,distancia_km,tarifa,calificacion
1,202,completado,6.81,7.33,5
2,162,completado,14.39,14.15,5
3,6,completado,2.95,3.86,3
4,91,completado,21.94,20.95,NULL
5,236,completado,3.13,4.02,4
6,242,completado,6.84,7.36,4
paso join: Unir con el conductor
`JOIN viajes_conductores` agrega el `vehiculo` de quien hizo cada viaje.
>>> tabla
viaje_id,vehiculo,estado,distancia_km,tarifa
1,auto,completado,6.81,7.33
2,moto,completado,14.39,14.15
3,auto,completado,2.95,3.86
4,auto,completado,21.94,20.95
5,auto,completado,3.13,4.02
6,auto,completado,6.84,7.36
paso filtro: Solo los completados
Un viaje cancelado no tiene tarifa ni distancia real: entra en otra métrica (cancelaciones), no en esta.
>>> tabla
viaje_id,vehiculo,distancia_km,tarifa,calificacion
1,auto,6.81,7.33,5
2,moto,14.39,14.15,5
3,auto,2.95,3.86,3
4,auto,21.94,20.95,NULL
5,auto,3.13,4.02,4
6,auto,6.84,7.36,4
paso km: SUM(tarifa) / SUM(distancia)
La tarifa por km es el **cociente de sumas**. Y `AVG(calificacion)` ignora los viajes sin calificar (`NULL`), que es lo correcto: sin nota no es nota 0.
>>> sql
ROUND(SUM(v.tarifa) / SUM(v.distancia_km), 2) AS tarifa_por_km,
ROUND(AVG(v.calificacion), 2)                 AS calificacion
paso res: Una fila por vehículo
Las motos cobran un poco menos por km, pero tienen la mejor calificación.
>>> tabla
vehiculo,viajes,km_promedio,tarifa_por_km,calificacion
van,647,10.1,1.29,4.21
auto,6437,10.2,1.28,4.27
moto,1839,10.2,1.26,4.34
```

:::cuidado Las trampas de este caso
- **El denominador**: "tasa de cancelación" sobre **todas** las solicitudes o sobre las que tuvieron conductor asignado da números distintos. Decláralo siempre.
- **Promedio de cocientes**: usa `SUM(a) / SUM(b)` para tasas como tarifa por km o ingreso por hora.
- **Columnas que solo existen en algunos estados**: tarifa, inicio, fin y calificación son `NULL` en los viajes no completados. Filtra antes de calcular.
:::

<!-- estandar:trabajo -->
:::trabajo
- Las apps de movilidad usan **streaming**: los precios dinámicos se calculan cada pocos segundos con la oferta y la demanda de cada zona. Lo verás con Kinesis, Pub/Sub y Spark Streaming.
- Los rankings de calificación siempre usan un mínimo de viajes (o promedios bayesianos), porque un conductor con un solo viaje de 5 estrellas no es mejor que uno con 2.000 viajes de 4,9.
- Las marcas de tiempo se guardan en UTC y se convierten a la hora local de cada ciudad. Con ciudades en distintos husos horarios, un error de zona horaria mueve los picos de demanda.
:::

## Ejercicios

:::ejercicio sql ordenado titulo="Embudo de estados por ciudad"
Para cada `ciudad`: `solicitudes`, `completados` y `pct_completados` (redondeado a 2). Ordena por `pct_completados` ascendente (las peores primero).
```sql solucion
SELECT ciudad, COUNT(*) AS solicitudes,
       SUM(CASE WHEN estado = 'completado' THEN 1 ELSE 0 END) AS completados,
       ROUND(100.0 * SUM(CASE WHEN estado = 'completado' THEN 1 ELSE 0 END) / COUNT(*), 2) AS pct_completados
FROM viajes_viajes
GROUP BY ciudad
ORDER BY pct_completados;
```
:::

:::ejercicio sql ordenado titulo="¿A qué hora falta oferta?"
Por **hora del día** de la solicitud (`hora` como entero 0-23): `solicitudes`, `sin_conductor` y `pct_sin_conductor` (redondeado a 2). Ordena por hora.
```sql solucion
SELECT CAST(strftime('%H', fecha_hora_solicitud) AS INTEGER) AS hora,
       COUNT(*) AS solicitudes,
       SUM(CASE WHEN estado = 'sin_conductor' THEN 1 ELSE 0 END) AS sin_conductor,
       ROUND(100.0 * SUM(CASE WHEN estado = 'sin_conductor' THEN 1 ELSE 0 END) / COUNT(*), 2) AS pct_sin_conductor
FROM viajes_viajes
GROUP BY hora
ORDER BY hora;
```
:::

:::ejercicio sql titulo="Tiempo de espera"
Para cada ciudad, el tiempo de espera **promedio** en minutos de los viajes completados (`espera_promedio`, redondeado a 1) y el **máximo** (`espera_maxima`, entero).
```sql solucion
SELECT ciudad,
       ROUND(AVG((julianday(fecha_hora_inicio) - julianday(fecha_hora_solicitud)) * 1440), 1) AS espera_promedio,
       CAST(ROUND(MAX((julianday(fecha_hora_inicio) - julianday(fecha_hora_solicitud)) * 1440)) AS INTEGER) AS espera_maxima
FROM viajes_viajes
WHERE estado = 'completado'
GROUP BY ciudad;
```
:::

:::ejercicio sql titulo="¿Cuánto aporta la tarifa dinámica?"
De los viajes completados, ¿qué parte de los ingresos viene del **recargo dinámico**? El ingreso sin recargo de un viaje es `tarifa / multiplicador`. Columnas: `ingresos` (total de tarifas), `ingresos_sin_dinamica` y `aporte_dinamica_pct` (porcentaje de los ingresos que corresponde al recargo). Redondea todo a 2.
```sql solucion
SELECT ROUND(SUM(tarifa), 2) AS ingresos,
       ROUND(SUM(tarifa / multiplicador), 2) AS ingresos_sin_dinamica,
       ROUND(100.0 * (SUM(tarifa) - SUM(tarifa / multiplicador)) / SUM(tarifa), 2) AS aporte_dinamica_pct
FROM viajes_viajes
WHERE estado = 'completado';
```
:::

:::ejercicio sql titulo="Mejores conductores por ciudad"
Para cada ciudad, los **3 conductores** con mejor calificación promedio, considerando solo conductores con **al menos 20 viajes calificados** (desempata por más viajes calificados y luego por `conductor_id`). Columnas: `ciudad`, `conductor_id`, `nombre`, `calificados`, `promedio` (redondeado a 2).
```sql solucion
WITH c AS (
  SELECT v.ciudad, d.conductor_id, d.nombre, COUNT(v.calificacion) AS calificados, AVG(v.calificacion) AS prom
  FROM viajes_viajes v JOIN viajes_conductores d ON d.conductor_id = v.conductor_id
  WHERE v.calificacion IS NOT NULL
  GROUP BY v.ciudad, d.conductor_id, d.nombre
  HAVING COUNT(v.calificacion) >= 20
),
r AS (SELECT *, ROW_NUMBER() OVER (PARTITION BY ciudad ORDER BY prom DESC, calificados DESC, conductor_id) AS rn FROM c)
SELECT ciudad, conductor_id, nombre, calificados, ROUND(prom, 2) AS promedio FROM r WHERE rn <= 3;
```
```explicacion
El mínimo de 20 viajes evita premiar a un conductor con un solo viaje de 5 estrellas: un promedio sobre pocas observaciones es poco confiable.
```
:::

:::ejercicio sql titulo="Ingreso por hora conectado"
Para cada conductor con viajes completados, calcula su ingreso total (`ingresos`), las **horas en viaje** (suma de duración inicio→fin, `horas`) y el ingreso por hora (`por_hora`). Redondea a 2. Columnas: `conductor_id`, `ingresos`, `horas`, `por_hora`.
```sql solucion
SELECT conductor_id,
       ROUND(SUM(tarifa), 2) AS ingresos,
       ROUND(SUM((julianday(fecha_hora_fin) - julianday(fecha_hora_inicio)) * 24), 2) AS horas,
       ROUND(SUM(tarifa) / SUM((julianday(fecha_hora_fin) - julianday(fecha_hora_inicio)) * 24), 2) AS por_hora
FROM viajes_viajes
WHERE estado = 'completado'
GROUP BY conductor_id;
```
:::

:::ejercicio sql ordenado titulo="Retención de pasajeros"
De los pasajeros cuyo **primer viaje completado** fue en julio de 2024, ¿cuántos volvieron a completar un viaje en cada mes siguiente? Columnas: `mes` (`YYYY-MM`, de agosto a diciembre) y `activos`. Ordena por mes.
```sql solucion
WITH primero AS (
  SELECT pasajero_id, MIN(fecha_hora_solicitud) AS primer_viaje
  FROM viajes_viajes WHERE estado = 'completado' GROUP BY pasajero_id
),
cohorte AS (
  SELECT pasajero_id FROM primero WHERE primer_viaje >= '2024-07-01' AND primer_viaje < '2024-08-01'
)
SELECT strftime('%Y-%m', v.fecha_hora_solicitud) AS mes, COUNT(DISTINCT v.pasajero_id) AS activos
FROM viajes_viajes v JOIN cohorte c ON c.pasajero_id = v.pasajero_id
WHERE v.estado = 'completado' AND v.fecha_hora_solicitud >= '2024-08-01'
GROUP BY mes ORDER BY mes;
```
:::

:::errores
- **Tasa de cancelación sobre los viajes completados**: el denominador son todas las solicitudes.
- **Tiempo de espera promedio con valores nulos** de viajes cancelados: el promedio queda sesgado; decide si se excluyen y dilo.
- **Horas pico en la zona horaria del servidor** (UTC) en vez de la local.
- **Ranking de conductores sin mínimo de viajes**: un conductor con un viaje de 5 estrellas queda primero.
:::

:::entrevista "¿Cómo armarías un ranking justo de conductores por calificación?"
Exigiría un mínimo de viajes en el período para que el promedio sea estable, y consideraría un promedio ajustado (bayesiano) que acerca a la media general a quienes tienen pocos viajes. Rankearía con `DENSE_RANK` por ciudad para comparar en el mismo contexto, y desempataría por cantidad de viajes. Mostraría además la tasa de cancelación del conductor, porque una buena nota con muchas cancelaciones no es un buen servicio.
:::
