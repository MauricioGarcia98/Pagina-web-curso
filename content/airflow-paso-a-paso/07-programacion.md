---
titulo: Programación - schedule, cron, start_date y catchup
nivel: 2 · Básico-intermedio
duracion: 45
resumen: Que un Dag corra solo es la razón de usar Airflow. Lees los horarios de la lista de Dags, aprendes los atajos (@daily, @hourly), las expresiones cron y los timedelta, qué hacen start_date y catchup en Airflow 3, qué es el timetable y cómo ver la historia en el calendario.
objetivos: Escribir un horario con atajos, cron o timedelta | Explicar start_date y catchup | Entender cuándo corre un cron en Airflow 3 | Leer Next Dag Run, Details y Calendar
prerrequisitos: airflow-paso-a-paso-errores-reintentos-y-clear
autoevaluacion: ¿Sabes escribir "todos los días a las 6"? | ¿Sabes qué hace catchup=True? | ¿Sabes qué valor tiene catchup por defecto en Airflow 3? | ¿Sabes dónde ves la próxima corrida?
---

## Paso 1 — Los horarios de la lista

```captura
archivo: airflow/a07-horarios.webp
texto: Schedule y Next Dag Run - los Dags activos muestran su próxima corrida; los pausados, no
```

## Paso 2 — Cómo se escribe un horario

| `schedule=` | Significa |
|---|---|
| `None` | Solo a mano |
| `"@once"` | Una sola vez |
| `"@hourly"` | Cada hora, en el minuto 0 |
| `"@daily"` | Todos los días a las 00:00 |
| `"@weekly"` | Los domingos a las 00:00 |
| `"0 6 * * *"` | Todos los días a las 06:00 (cron) |
| `"30 7 * * 1-5"` | De lunes a viernes a las 07:30 |
| `timedelta(hours=4)` | Cada 4 horas desde la anterior |
| `[Asset(...)]` | Cuando se actualiza un dato (nivel 4) |

:::analogia Cómo leer un cron
Cinco campos: **minuto, hora, día del mes, mes, día de la semana**. `0 6 * * *` = minuto 0, hora 6, cualquier día, cualquier mes, cualquier día de la semana. `*` es "todos".
:::

Las horas son **UTC** salvo que configures otra zona. Si la tienda abre a las 8 de Lima (UTC-5), son las 13:00 UTC.

## Paso 3 — start_date y catchup

| Parámetro | Qué hace |
|---|---|
| `start_date` | Desde cuándo el Dag puede tener corridas. Usa una fecha fija, nunca `datetime.now()` |
| `catchup=False` | Al activarlo, solo programa desde ahora en adelante |
| `catchup=True` | Al activarlo, crea corridas para **todas** las fechas pendientes desde `start_date` |

:::cuidado catchup en Airflow 3
En Airflow 3 el valor por defecto es **`catchup=False`** (en Airflow 2 era `True`, y activar un Dag con `start_date` de hace un año creaba cientos de corridas). Igual conviene escribirlo explícito. Para reprocesar fechas pasadas, usa un **backfill** (nivel 4).
:::

## Paso 4 — Cuándo corre en Airflow 3

Abre `ingesta_api` → **Details**:

```captura
archivo: airflow/a07-details.webp
texto: Details - Schedule 0 6 * * *, Timetable CronTriggerTimetable, Start Date, Catchup false y los demás atributos
```

En Airflow 3, un cron usa por defecto **CronTriggerTimetable**: la corrida arranca **a la hora del cron** y su fecha lógica es ese momento. La corrida de las 06:00 del 16 tiene fecha lógica 16 a las 06:00.

:::nota Si vienes de Airflow 2
En Airflow 2, la corrida "del día 15" arrancaba al **final** de su intervalo, el 16 a las 00:00. Si un Dag migrado usaba `{{ ds }}` para "ayer", revisa sus fechas: ahora `{{ ds }}` es el día en que corre. Para leer "el día anterior" usa `{{ macros.ds_add(ds, -1) }}`.
:::

## Paso 5 — El calendario

`ventas_diarias` → **Calendar**:

```captura
archivo: airflow/a07-calendar.webp
texto: Calendar - un cuadrado por día con el estado de sus corridas
```

Sirve para ver de un vistazo qué días faltan o fallaron.

:::errores
- **`start_date=datetime.now()`.** Cambia en cada lectura del archivo; usa una fecha fija.
- **Confundir el orden del cron.** Es minuto, hora, día del mes, mes, día de la semana: las 6:00 es `0 6 * * *`.
- **Activar catchup sin querer.** Con catchup y una `start_date` vieja, Airflow crea una corrida por cada intervalo pasado.
:::

## ✅ Lo que lograste

- Escribes horarios con atajos, cron y timedelta.
- Entiendes start_date, catchup y el timetable de Airflow 3.
- Lees Next Dag Run, Details y Calendar.

:::ejercicio quiz
¿Qué cron significa "todos los días a las 06:00"?
- [x] `0 6 * * *`
- [ ] `6 0 * * *`
- [ ] `* 6 * * *`
- [ ] `0 0 6 * *`
:::

:::ejercicio quiz
¿Qué valor tiene catchup por defecto en Airflow 3?
- [ ] True
- [x] False
- [ ] True, pero solo para Dags con cron
- [ ] True, como en Airflow 2
:::

:::ejercicio quiz
¿Por qué no se usa `start_date=datetime.now()`?
- [ ] Porque Airflow solo acepta fechas en UTC escritas como texto
- [x] Porque cambia cada vez que se lee el archivo y el Dag nunca tiene una fecha de inicio estable
- [ ] Porque Airflow no acepta fechas
- [ ] Porque es de Airflow 1
:::

:::ejercicio quiz
En Airflow 3, un Dag con `0 6 * * *` corre el 16 a las 06:00. ¿Qué fecha lógica tiene esa corrida?
- [ ] El 15 a las 06:00
- [x] El 16 a las 06:00
- [ ] El 17 a las 00:00
- [ ] El 16 a las 00:00
:::
