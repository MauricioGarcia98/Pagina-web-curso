---
titulo: "Caso 🚕 Ruta: viajes, esperas y tarifa dinámica"
nivel: Avanzado
duracion: 55
resumen: Tasa de cancelación, tiempos de espera, horas pico, tarifa dinámica, ranking de conductores y retención de pasajeros.
---

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
