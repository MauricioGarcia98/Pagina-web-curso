---
titulo: Pools y concurrencia - no saturar lo que está del otro lado
nivel: 5 · Avanzado
duracion: 40
resumen: Airflow puede lanzar muchas tareas a la vez, pero la API de la tienda acepta dos conexiones. Creas el pool api_tienda con 2 lugares, escribes catalogo_api con cuatro descargas que lo usan y aprendes los otros límites de concurrencia - max_active_runs, max_active_tasks, parallelism y priority_weight.
objetivos: Crear un pool con un número de lugares | Asignar tareas a un pool | Limitar corridas y tareas por Dag | Entender parallelism y priority_weight
prerrequisitos: airflow-paso-a-paso-errores-de-importacion-y-pruebas
autoevaluacion: ¿Sabes para qué sirve un pool? | ¿Sabes cuántos lugares tiene default_pool? | ¿Sabes qué limita max_active_runs? | ¿Sabes qué decide priority_weight?
---

:::escenario El problema
El día que se agregaron más categorías al catálogo, Airflow lanzó todas las descargas a la vez y la API de la tienda empezó a responder con errores 429 (demasiadas solicitudes).
:::

## Paso 1 — Crear el pool

**Admin → Pools → Add Pool**:

```captura
archivo: airflow/a18-pool-nuevo.webp
texto: Add Pool - api_tienda con 2 lugares y una descripción
```

```captura
archivo: airflow/a18-pools.webp
texto: default_pool con 128 lugares y api_tienda con 2
```

Un **pool** es un cupo compartido: cada tarea del pool ocupa un lugar mientras corre. Si no hay lugar, espera en **queued**. Desde la CLI: `airflow pools set api_tienda 2 "API de la tienda"`.

## Paso 2 — Usarlo

```python norun
with DAG(
    dag_id="catalogo_api",
    schedule="0 4 * * *",
    start_date=datetime(2026, 11, 1),
    catchup=False,
    max_active_runs=1,
    tags=["tienda", "ingesta", "curso"],
    default_args={"owner": "equipo-datos", "pool": "api_tienda"},
):
    for categoria in ["electronica", "hogar", "moda", "deportes"]:
        BashOperator(task_id=f"descargar_{categoria}", bash_command=f"echo 'Descargando {categoria}'")
```

```captura
archivo: airflow/a18-pool-tarea.webp
texto: Details de descargar_hogar - Pool api_tienda
```

Las cuatro descargas no dependen entre sí, pero el pool deja correr **dos a la vez**. Un pool lo pueden compartir tareas de **varios Dags**: es la forma de proteger un recurso que usa todo el equipo.

## Paso 3 — Los otros límites

| Límite | Dónde | Qué limita |
|---|---|---|
| `pool` / `pool_slots` | Tarea | Lugares de un pool compartido |
| `max_active_tasks` | Dag | Tareas de **este Dag** corriendo a la vez |
| `max_active_runs` | Dag | Corridas de **este Dag** a la vez (útil en backfills) |
| `parallelism` | Configuración `[core]` | Tareas corriendo en **toda la instalación** |
| `priority_weight` | Tarea | Quién toma primero un lugar libre cuando hay cola |

:::tip max_active_runs=1
Si cada corrida escribe la misma tabla, dos corridas a la vez pueden pisarse. `max_active_runs=1` hace que un backfill de 30 días corra de a uno, en orden.
:::

## ✅ Lo que lograste

- Creaste un pool y lo asignaste.
- Conoces los límites de concurrencia y dónde se configura cada uno.

:::ejercicio quiz
¿Para qué sirve un pool?
- [ ] Para guardar datos
- [x] Para limitar cuántas tareas usan un recurso a la vez
- [ ] Para programar Dags
- [ ] Para guardar contraseñas
:::

:::ejercicio quiz
Hay 4 tareas en el pool api_tienda de 2 lugares. ¿Qué pasa?
- [ ] Fallan dos
- [x] Corren dos y las otras esperan en queued hasta que se libere un lugar
- [ ] Corren las cuatro
- [ ] No corre ninguna
:::

:::ejercicio quiz
¿Qué limita max_active_runs?
- [x] Cuántas corridas del mismo Dag pueden estar activas a la vez
- [ ] Cuántos Dags hay
- [ ] Cuántas tareas tiene el Dag
- [ ] Cuántos usuarios entran
:::

:::ejercicio quiz
Dos tareas esperan el último lugar del pool. ¿Qué decide cuál entra primero?
- [ ] El orden alfabético
- [x] priority_weight
- [ ] El color
- [ ] La fecha del archivo
:::
