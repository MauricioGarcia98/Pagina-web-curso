---
titulo: "Caso 🎧 Ritmo: suscripciones, MRR y churn"
nivel: Avanzado
duracion: 60
resumen: Usuarios activos, skips, artistas top, MRR mes a mes, churn, conversión de gratis a pago y motivos de baja.
---

**Ritmo** es una app de música por suscripción con planes `gratis`, `individual`, `duo` y `familiar`. La directora de producto quiere entender el **engagement** (cuánto se usa la app) y el **negocio** (cuánto se factura y cuántos se van).

## El modelo de datos

```text
streaming_usuarios (usuario_id, pais, fecha_registro, edad, dispositivo_principal)
  ├── streaming_suscripciones (suscripcion_id, usuario_id, plan, precio_mensual, fecha_inicio, fecha_fin, motivo_baja)
  └── streaming_reproducciones (repro_id, usuario_id, contenido_id, fecha_hora, segundos_escuchados, dispositivo)
                                                     └── streaming_contenidos (contenido_id, titulo, tipo, genero, artista, duracion_seg, ...)
```

## Glosario de métricas

| Métrica | Definición |
|---|---|
| **DAU / MAU** | Usuarios activos (con al menos una reproducción) por día / por mes |
| **Skip** | Reproducción de menos de 30 segundos |
| **MRR** (*Monthly Recurring Revenue*) | Suma del precio mensual de las suscripciones **vigentes** al inicio del mes |
| **Churn** | Usuarios que se dan de baja de un plan pago en un periodo |
| **Conversión** | Usuarios que pasaron de `gratis` a un plan pago |

Una suscripción está **vigente** en una fecha `F` si `fecha_inicio <= F` y (`fecha_fin` es NULL o `fecha_fin >= F`).

## Cómo funciona un negocio de streaming

Una app de música por suscripción tiene un modelo **freemium**: mucha gente usa el plan **gratis** (con anuncios y limitaciones), y el negocio vive de **convertir** a una parte de ellos en suscriptores pagos y de **retenerlos** mes a mes. Por eso la directora de producto mira dos familias de métricas que están conectadas:

- **Engagement** (uso): si la gente escucha mucho y todos los días, es más probable que pague y que no se vaya.
- **Negocio**: cuántos pagan (MRR), cuántos se van (churn) y por qué.

La cadena causal que el equipo intenta mover es: **buen catálogo y recomendaciones → más horas de escucha → más conversión a pago → menos bajas → más MRR**.

## Un ejemplo resuelto paso a paso

**Pregunta:** "¿La gente termina lo que empieza a escuchar? Compara canciones y podcasts."

1. **Grano**: una fila por tipo de contenido (`cancion`, `podcast`). El tipo está en `streaming_contenidos`, así que unimos cada reproducción con su contenido.
2. **Métricas**: reproducciones, minutos promedio escuchados y **% completado**. Para el % completado usamos el cociente de sumas: segundos escuchados totales / duración total de lo reproducido. (El promedio de los porcentajes individuales daría el mismo peso a una canción de 2 minutos que a un podcast de 1 hora.)

```sql
SELECT c.tipo,
       COUNT(*)                                                   AS reproducciones,
       ROUND(AVG(r.segundos_escuchados) / 60.0, 1)                AS min_promedio,
       ROUND(100.0 * SUM(r.segundos_escuchados) / SUM(c.duracion_seg), 1) AS pct_completado
FROM streaming_reproducciones r
JOIN streaming_contenidos c ON c.contenido_id = r.contenido_id
GROUP BY c.tipo;
```

| tipo | reproducciones | min_promedio | pct_completado |
|---|---|---|---|
| cancion | 16057 | 2.4 | 67.0 |
| podcast | 1943 | 18.7 | 54.1 |

**Lectura de negocio:** los podcasts se escuchan mucho más tiempo por reproducción (casi 19 minutos), pero se **abandonan más** (solo se completa el 54 %). Una función "continuar donde lo dejaste" para podcasts tiene sentido; también recomendar episodios más cortos.

:::cuidado Las trampas de este caso
- **"Activo" se define por reproducciones**, no por suscripciones: un suscriptor pago que no escucha nada en el mes no es un usuario activo (y es un candidato a darse de baja).
- **Vigencia de una suscripción**: está vigente en la fecha F si empezó antes o ese día y no terminó (`fecha_fin` es NULL o posterior). Olvidar el `NULL` deja afuera a todos los suscriptores actuales.
- **Churn de planes pagos**: el que pasa de pago a gratis también es churn de ingresos, aunque siga usando la app.
:::

## Ejercicios

:::ejercicio sql ordenado titulo="Usuarios activos por mes (MAU)"
Calcula los usuarios activos mensuales de 2024: `mes` (formato `YYYY-MM`) y `mau` (usuarios distintos con reproducciones). Ordena por mes.
```sql solucion
SELECT strftime('%Y-%m', fecha_hora) AS mes, COUNT(DISTINCT usuario_id) AS mau
FROM streaming_reproducciones
GROUP BY mes ORDER BY mes;
```
:::

:::ejercicio sql ordenado titulo="¿Qué géneros se saltean?"
Para cada `genero`, calcula las reproducciones (`reproducciones`), los skips (`skips`, menos de 30 s) y la tasa de skip (`skip_pct`, redondeada a 2). Ordena de mayor a menor tasa de skip.
```sql solucion
SELECT c.genero, COUNT(*) AS reproducciones,
       SUM(CASE WHEN r.segundos_escuchados < 30 THEN 1 ELSE 0 END) AS skips,
       ROUND(100.0 * SUM(CASE WHEN r.segundos_escuchados < 30 THEN 1 ELSE 0 END) / COUNT(*), 2) AS skip_pct
FROM streaming_reproducciones r JOIN streaming_contenidos c ON c.contenido_id = r.contenido_id
GROUP BY c.genero
ORDER BY skip_pct DESC;
```
:::

:::ejercicio sql titulo="Artista #1 de cada país"
Para cada país del usuario, el artista con más **horas escuchadas** (solo canciones, no podcasts). Columnas: `pais`, `artista`, `horas` (redondeado a 1).
```sql solucion
WITH h AS (
  SELECT u.pais, c.artista, SUM(r.segundos_escuchados) / 3600.0 AS horas
  FROM streaming_reproducciones r
  JOIN streaming_usuarios u ON u.usuario_id = r.usuario_id
  JOIN streaming_contenidos c ON c.contenido_id = r.contenido_id
  WHERE c.tipo = 'cancion'
  GROUP BY u.pais, c.artista
),
r AS (SELECT *, ROW_NUMBER() OVER (PARTITION BY pais ORDER BY horas DESC) AS rn FROM h)
SELECT pais, artista, ROUND(horas, 1) AS horas FROM r WHERE rn = 1;
```
:::

:::ejercicio sql ordenado titulo="MRR mes a mes"
Calcula el **MRR** al día 1 de cada mes de 2024: `mes` (fecha `YYYY-MM-01`), `suscriptores_pagos` (suscripciones vigentes con precio > 0) y `mrr` (suma de precios, redondeada a 2). Ordena por mes.
```sql solucion
WITH RECURSIVE meses(mes) AS (
  SELECT '2024-01-01' UNION ALL SELECT date(mes, '+1 month') FROM meses WHERE mes < '2024-12-01'
)
SELECT m.mes, COUNT(s.suscripcion_id) AS suscriptores_pagos, ROUND(COALESCE(SUM(s.precio_mensual), 0), 2) AS mrr
FROM meses m
LEFT JOIN streaming_suscripciones s
  ON s.precio_mensual > 0 AND s.fecha_inicio <= m.mes AND (s.fecha_fin IS NULL OR s.fecha_fin >= m.mes)
GROUP BY m.mes
ORDER BY m.mes;
```
```pista
Genera los 12 meses con una CTE recursiva y únelos con las suscripciones **vigentes** en ese día: `fecha_inicio <= mes AND (fecha_fin IS NULL OR fecha_fin >= mes)`.
```
:::

:::ejercicio sql ordenado titulo="Churn mensual de planes pagos"
Para cada mes de 2024 (`mes` como `YYYY-MM`), cuántas suscripciones **pagas** terminaron en ese mes (`bajas`) **excluyendo** las que terminaron por `cambio_plan` (no son clientes perdidos). Ordena por mes.
```sql solucion
SELECT strftime('%Y-%m', fecha_fin) AS mes, COUNT(*) AS bajas
FROM streaming_suscripciones
WHERE precio_mensual > 0 AND fecha_fin >= '2024-01-01' AND fecha_fin < '2025-01-01'
  AND motivo_baja <> 'cambio_plan'
GROUP BY mes ORDER BY mes;
```
:::

:::ejercicio sql ordenado titulo="Motivos de baja"
Entre las suscripciones pagas que terminaron (cualquier año), ¿cuál es el porcentaje de cada `motivo_baja`? Columnas: `motivo_baja`, `bajas`, `pct` (redondeado a 2). Ordena por bajas descendente.
```sql solucion
SELECT motivo_baja, COUNT(*) AS bajas,
       ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) AS pct
FROM streaming_suscripciones
WHERE precio_mensual > 0 AND fecha_fin IS NOT NULL
GROUP BY motivo_baja
ORDER BY bajas DESC;
```
:::

:::ejercicio sql titulo="Conversión de gratis a pago"
¿Qué porcentaje de los usuarios que **alguna vez** tuvieron plan `gratis` pasó **después** a un plan pago? Columnas: `usuarios_gratis`, `convertidos`, `conversion_pct` (redondeado a 2).
```sql solucion
WITH g AS (
  SELECT usuario_id, MIN(fecha_inicio) AS inicio_gratis
  FROM streaming_suscripciones WHERE plan = 'gratis' GROUP BY usuario_id
),
c AS (
  SELECT DISTINCT g.usuario_id
  FROM g JOIN streaming_suscripciones s ON s.usuario_id = g.usuario_id
  WHERE s.precio_mensual > 0 AND s.fecha_inicio > g.inicio_gratis
)
SELECT (SELECT COUNT(*) FROM g) AS usuarios_gratis,
       (SELECT COUNT(*) FROM c) AS convertidos,
       ROUND(100.0 * (SELECT COUNT(*) FROM c) / (SELECT COUNT(*) FROM g), 2) AS conversion_pct;
```
:::

:::ejercicio sql titulo="Usuarios en riesgo"
Un usuario con plan pago **vigente** al `2024-12-31` está “en riesgo” si no escuchó nada en los últimos **30 días** (desde el `2024-12-01`). Devuelve `usuario_id`, `plan` y su última reproducción (`ultima_reproduccion`, NULL si nunca escuchó).
```sql solucion
WITH vig AS (
  SELECT usuario_id, plan FROM streaming_suscripciones
  WHERE precio_mensual > 0 AND fecha_inicio <= '2024-12-31' AND (fecha_fin IS NULL OR fecha_fin >= '2024-12-31')
),
ult AS (
  SELECT usuario_id, MAX(fecha_hora) AS ultima FROM streaming_reproducciones GROUP BY usuario_id
)
SELECT v.usuario_id, v.plan, u.ultima AS ultima_reproduccion
FROM vig v LEFT JOIN ult u ON u.usuario_id = v.usuario_id
WHERE u.ultima IS NULL OR u.ultima < '2024-12-01';
```
:::
