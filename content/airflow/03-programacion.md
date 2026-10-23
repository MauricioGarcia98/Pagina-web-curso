---
titulo: Programación: schedule, start_date, catchup e intervalos
nivel: Intermedio
duracion: 30
resumen: Expresiones cron, presets, el intervalo de datos (data interval), logical date, catchup y backfill.
---

## schedule

| Valor | Significado |
|---|---|
| `None` | Solo se ejecuta manualmente o disparado por otro DAG |
| `"@once"` | Una sola vez |
| `"@hourly"` | Cada hora (`0 * * * *`) |
| `"@daily"` | Todos los días a medianoche (`0 0 * * *`) |
| `"@weekly"` | Domingos a medianoche |
| `"@monthly"` | El día 1 de cada mes |
| `"30 6 * * 1-5"` | Cron: a las 6:30, de lunes a viernes |
| `timedelta(hours=6)` | Cada 6 horas |
| `[Dataset("...")]` | Cuando otro DAG actualiza ese dataset (*data-aware scheduling*) |

### Expresiones cron

```text
┌───────── minuto (0-59)
│ ┌─────── hora (0-23)
│ │ ┌───── día del mes (1-31)
│ │ │ ┌─── mes (1-12)
│ │ │ │ ┌─ día de la semana (0-6, 0 = domingo)
│ │ │ │ │
0 2 * * *      todos los días a las 2:00
*/15 * * * *   cada 15 minutos
0 8 1 * *      el día 1 de cada mes a las 8:00
0 9 * * 1      los lunes a las 9:00
```

## El concepto más confuso de Airflow: el intervalo de datos

Airflow fue pensado para procesar **periodos**: “las ventas de ayer”. Una ejecución diaria tiene un **data interval** `[inicio, fin)` y se ejecuta **al terminar** ese intervalo.

```text
DAG @daily con start_date = 2024-01-01

Ejecución que corre el 2024-01-02 a las 00:00
  data_interval_start = 2024-01-01 00:00   ← es la "logical date" ({{ ds }} = '2024-01-01')
  data_interval_end   = 2024-01-02 00:00
  → procesa los datos DEL 1 de enero
```

:::tip Cómo recordarlo
La `logical_date` (antes `execution_date`) **no es cuándo corre**, sino **qué periodo procesa**. El run del “1 de enero” corre el 2 de enero, cuando el día 1 ya está completo.
:::

## catchup y backfill

Si el DAG tiene `start_date=2024-01-01`, `schedule="@daily"` y lo activas el 2024-03-01:

- `catchup=True` (valor por defecto en Airflow 2): crea **todas** las ejecuciones pendientes desde enero (¡60 runs!).
- `catchup=False`: solo la más reciente.

Para reprocesar un rango a propósito se usa **backfill**: `airflow dags backfill -s 2024-01-01 -e 2024-01-31 etl_ventas`.

:::cuidado start_date dinámico
Nunca uses `start_date=datetime.now()`: el scheduler nunca encuentra un intervalo completo y el DAG no corre. Usa una fecha fija.
:::

## default_args

Parámetros comunes a todas las tareas del DAG:

```python
from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.empty import EmptyOperator

default_args = {
    "owner": "equipo-datos",
    "retries": 2,
    "retry_delay": timedelta(minutes=5),
    "email_on_failure": True,
}

with DAG("con_defaults", start_date=datetime(2024, 1, 1), schedule="0 3 * * *",
         catchup=False, default_args=default_args, max_active_runs=1) as dag:
    t = EmptyOperator(task_id="tarea")

print(dag.get_task("tarea").retries)
```

## Ejercicios

:::ejercicio airflow
Crea el DAG `ventas_diarias` que corra **todos los días a las 6:30** (cron), con `start_date=datetime(2024, 1, 1)`, **sin catchup**, y `default_args` con `retries=3`. Agrega una tarea `EmptyOperator` llamada `procesar`.
```python inicial
from datetime import datetime
from airflow import DAG
from airflow.operators.empty import EmptyOperator
```
```python solucion
from datetime import datetime
from airflow import DAG
from airflow.operators.empty import EmptyOperator

with DAG("ventas_diarias", start_date=datetime(2024, 1, 1), schedule="30 6 * * *",
         catchup=False, default_args={"retries": 3}) as dag:
    procesar = EmptyOperator(task_id="procesar")
```
```python test
d = dags.get("ventas_diarias")
assert d is not None, "No encontré el DAG 'ventas_diarias'"
assert str(d.schedule).split() == ["30", "6", "*", "*", "*"], f"schedule debería ser '30 6 * * *' y es {d.schedule!r}"
assert d.catchup is False, "catchup debe ser False"
assert d.get_task("procesar").retries == 3, "La tarea debe heredar retries=3 de default_args"
```
:::

:::ejercicio quiz
Un DAG `@daily` procesa “los pedidos del día”. ¿Qué fecha tiene `{{ ds }}` en la ejecución que corre el **2024-05-10 a las 00:00**?

- [ ] 2024-05-10
- [x] 2024-05-09
- [ ] 2024-05-11
- [ ] La fecha y hora actual
```explicacion
La ejecución que corre el 10 procesa el intervalo del 9 (de 00:00 a 00:00 del 10). `ds` es el inicio del intervalo: 2024-05-09.
```
:::

:::ejercicio quiz
¿Qué expresión cron significa “cada lunes a las 9:00”?

- [ ] `9 0 * * 1`
- [x] `0 9 * * 1`
- [ ] `0 9 1 * *`
- [ ] `* 9 * * 1`
:::

:::ejercicio cli
Reprocesa con un **backfill** el DAG `etl_ventas` para todo enero de 2024 (del 2024-01-01 al 2024-01-31).
```respuesta
airflow dags backfill (-s|--start-date) 2024-01-01 (-e|--end-date) 2024-01-31 etl_ventas
airflow dags backfill etl_ventas (-s|--start-date) 2024-01-01 (-e|--end-date) 2024-01-31
```
```solucion
airflow dags backfill -s 2024-01-01 -e 2024-01-31 etl_ventas
```
:::
