---
titulo: Jobs - el historial de todo lo que corrió
nivel: 2 · Básico-intermedio
duracion: 25
resumen: Cada consulta y cada carga es un job. Recorres el historial con su estado, tipo, bytes procesados y facturados, duración y caché, abres el detalle de uno, lo reabres como consulta nueva y aprendes a usarlo para encontrar errores y consultas caras.
objetivos: Leer el historial de jobs | Abrir el detalle de un job | Reabrir una consulta desde el historial | Usar el historial para encontrar lo caro y lo que falló
prerrequisitos: bigquery-paso-a-paso-costos-limit-y-cache
autoevaluacion: ¿Sabes qué tipos de job hay? | ¿Sabes cómo reconocer un job que salió de la caché? | ¿Sabes reabrir un SQL del historial? | ¿Sabes por qué un job puede fallar sin costo?
---

## Paso 1 — El historial

**Jobs explorer**:

```captura
archivo: bigquery/q07-jobs.webp
texto: Cada job con su estado, tipo, SQL, bytes procesados y facturados, duración y cuándo se creó
```

| Tipo de job | Qué es |
|---|---|
| `QUERY` | Una consulta, incluidos CREATE, INSERT, MERGE |
| `LOAD` | Una carga de archivos |
| `EXTRACT` | Una exportación a Cloud Storage |
| `COPY` | Una copia de tabla |

## Paso 2 — El detalle

```captura
archivo: bigquery/q07-detalle.webp
texto: El detalle de un job - el SQL, los bytes (0 B, results cached), qué se leyó y Open as new query
```

**Open as new query** abre el SQL en una pestaña nueva: útil para repetir o corregir lo que hizo otra persona.

## Paso 3 — Para qué sirve

| Pregunta | Qué mirar |
|---|---|
| ¿Por qué falló la carga de anoche? | Jobs en error y su mensaje |
| ¿Qué consulta gasta más? | Ordenar por **Billed** |
| ¿Se está aprovechando la caché? | La marca *cache* |
| ¿Quién corre esa consulta tan cara? | El usuario del job (en BigQuery real, con permisos de administrador) |

Un job que falla en la validación (un error de sintaxis o de nombre) **no cobra**. Para analizar los jobs con SQL, existe `INFORMATION_SCHEMA.JOBS` (nivel 5).

## ✅ Lo que lograste

- Lees el historial de jobs.
- Abres y reabres un job.
- Sabes usarlo para encontrar lo caro.

:::ejercicio quiz
¿Qué tipo de job es un INSERT?
- [x] QUERY
- [ ] LOAD
- [ ] COPY
- [ ] EXTRACT
:::

:::ejercicio quiz
¿Cómo reconoces un job que salió de la caché?
- [ ] Tarda más
- [x] Tiene 0 B procesados y la marca de caché
- [ ] Está en rojo
- [ ] No tiene SQL
:::

:::ejercicio quiz
¿Qué hace Open as new query?
- [ ] Borra el job
- [x] Abre el SQL del job en una pestaña nueva
- [ ] Repite el job automáticamente cada día
- [ ] Exporta el resultado
:::

:::ejercicio quiz
¿Cobra BigQuery por un job que falla por un error de sintaxis?
- [ ] Sí, el mínimo de 10 MB
- [x] No
- [ ] Sí, el doble
- [ ] Depende del usuario
:::
