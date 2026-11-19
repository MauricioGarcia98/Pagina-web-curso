---
titulo: La entrega - la telemetría limpia y el SLA por pedido
nivel: Avanzado
duracion: 20
resumen: La especificación de ruta.silver.telemetria y ruta.gold.entregas, la definición de terminado y la revisión automática contra lo que pasó en la calle.
objetivos: Normalizar dos versiones de un esquema en una tabla | Deduplicar eventos | Calcular un SLA combinando stream y plan
prerrequisitos: proyecto-ruta-sur-las-notas-del-equipo
autoevaluacion: ¿Sabes qué columnas lleva cada tabla? | ¿Sabes qué pedidos entran en gold? | ¿Sabes cuándo se recalcula un día?
---

## ruta.silver.telemetria

| Columna | Regla |
|---|---|
| `event_id` | Único |
| `vehiculo` | |
| `tipo` | `inicio_jornada`, `ping`, `llegada_parada`, `entrega_completada`, `entrega_fallida`, `fin_jornada` |
| `ts_evento` | La hora del evento (timestamp UTC) |
| `ts_ingesta` | Cuándo llegó a Event Hubs |
| `lat`, `lon` | |
| `velocidad_kmh` | En km/h (para los pings) |
| `pedido_id` | Si corresponde |

La revisión mira los eventos de los últimos días cerrados que ya estaban en el tópico.

## ruta.gold.entregas

| Columna | Regla |
|---|---|
| `pedido_id` | Uno por pedido del **plan** (incluidos los urgentes) |
| `vehiculo`, `fecha` | `fecha` = día del plan (hora local) |
| `ventana_inicio`, `ventana_fin` | Del TMS |
| `estado` | `completada`, `fallida` o `sin_evento` |
| `ts_entrega` | Hora del evento de entrega |
| `a_tiempo` | `true` si está completada dentro de la ventana |

La revisión mira los últimos 3 días cerrados y acepta lo que era cierto hasta hace 6 horas (los eventos tardíos cambian el resultado).

## Definición de terminado

- [ ] La revisión pasa completa.
- [ ] Reprocesar un día no duplica nada.
- [ ] Sabes cuánto esperas eventos tardíos y qué pasa con los que llegan después.

## La revisión

<div data-ruta="revisar"></div>

## Resumen

- Silver: dos firmwares, un esquema; sin repetidos.
- Gold: plan + eventos; el SLA puede cambiar cuando llegan eventos tardíos.
