---
titulo: Backfill - reprocesar fechas pasadas
nivel: 4 · Intermedio-avanzado
duracion: 40
resumen: Cuando un Dag nuevo necesita historia, o cuando hay que recalcular una semana, se usa un backfill. Lanzas uno para carga_ventas_tienda del 8 al 14 de noviembre desde la interfaz, entiendes las opciones de reproceso, lo sigues en la pestaña Backfills y filtras las corridas por tipo. También ves el comando de la CLI.
objetivos: Lanzar un backfill desde la interfaz | Elegir el comportamiento de reproceso | Seguir el backfill y sus corridas | Lanzarlo desde la CLI
prerrequisitos: airflow-paso-a-paso-ramas-y-trigger-rules
autoevaluacion: ¿Sabes qué crea un backfill? | ¿Sabes la diferencia entre Missing Runs y All Runs? | ¿Sabes cómo se reconocen las corridas de un backfill? | ¿Sabes cuándo usar backfill y cuándo Clear?
---

:::escenario El pedido
Lucía: *"Activamos `carga_ventas_tienda` el 15. Comercial necesita la semana anterior también: del 8 al 14."*
:::

## Paso 1 — Lanzar el backfill

En `carga_ventas_tienda` → **Backfills → Backfill** (o **Trigger → Backfill**):

```captura
archivo: airflow/a15-backfill.webp
texto: Backfill - desde y hasta, el comportamiento de reproceso, Run Backwards y cuántas corridas se van a crear
```

| Opción | Qué hace |
|---|---|
| **From / To** | El rango de fechas lógicas |
| **Missing Runs** | Solo crea las fechas que no tienen corrida |
| **Missing and Errored Runs** | Además, vuelve a correr las que fallaron |
| **All Runs** | Rehace todas, incluso las exitosas |
| **Run Backwards** | Empieza por la fecha más reciente |

El aviso dice cuántas corridas va a crear: una por cada horario del Dag dentro del rango.

## Paso 2 — Seguirlo

```captura
archivo: airflow/a15-backfills.webp
texto: Las corridas del backfill en la grilla (1) y el backfill con su rango y sus corridas (2)
```

```captura
archivo: airflow/a15-runs.webp
texto: Runs filtrado por Run Type backfill (1) - cada corrida con su fecha lógica (2)
```

En Airflow 3 el backfill lo ejecuta el **scheduler**, igual que las corridas normales: respeta `max_active_runs`, se ve en la interfaz y se puede pausar o cancelar.

## Paso 3 — Desde la CLI

```bash norun
airflow backfill create --dag-id carga_ventas_tienda \
  --from-date 2026-11-08 --to-date 2026-11-14 \
  --reprocess-behavior failed
```

## Paso 4 — ¿Backfill o Clear?

| Situación | Usa |
|---|---|
| Fechas que **nunca** corrieron (historia de un Dag nuevo) | **Backfill** |
| Rehacer **un rango** después de corregir la lógica | **Backfill** con All Runs |
| Rehacer **una corrida** o una tarea puntual | **Clear** |

:::cuidado Idempotencia
Un backfill vuelve a correr fechas que quizás ya se cargaron. Si la tarea hace `INSERT` sin borrar antes, duplica filas. Las tareas tienen que ser **idempotentes**: correrlas dos veces para la misma fecha deja el mismo resultado (nivel 6).
:::

## ✅ Lo que lograste

- Lanzaste y seguiste un backfill.
- Elegiste el comportamiento de reproceso.
- Sabes cuándo usar backfill y cuándo Clear.

:::ejercicio quiz
¿Qué crea un backfill?
- [ ] Un Dag nuevo
- [x] Corridas para fechas lógicas pasadas dentro de un rango
- [ ] Una variable
- [ ] Una copia del código
:::

:::ejercicio quiz
Quieres rehacer solo las fechas sin corrida y las que fallaron. ¿Qué opción eliges?
- [ ] Missing Runs
- [x] Missing and Errored Runs
- [ ] All Runs
- [ ] Run Backwards
:::

:::ejercicio quiz
¿Cómo reconoces una corrida de backfill?
- [x] Su Run Type es backfill y su Run ID empieza con backfill__
- [ ] Es de color violeta
- [ ] No tiene tareas
- [ ] Siempre falla
:::

:::ejercicio quiz
Solo falló la corrida del 12 y ya corregiste el código. ¿Qué usas?
- [ ] Un backfill de todo el año
- [x] Clear de esa corrida
- [ ] Borrar el Dag
- [ ] Un Dag nuevo
:::
