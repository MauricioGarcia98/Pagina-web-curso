---
titulo: Errores de importación y cómo probar un Dag antes de activarlo
nivel: 5 · Avanzado
duracion: 45
resumen: Un Dag con un error de Python no aparece en la lista - aparece en Dag Import Errors. Lees el error de avisos_slack (falta un provider), lo ves también en la CLI, y aprendes a probar sin esperar al scheduler - airflow tasks test para una tarea y airflow dags test para el Dag entero - más una prueba automática para el CI.
objetivos: Encontrar y leer un error de importación | Distinguir un error de importación de una tarea fallida | Probar una tarea con airflow tasks test | Probar un Dag entero con airflow dags test | Escribir una prueba de carga de Dags para CI
prerrequisitos: airflow-paso-a-paso-proyecto-reproceso-de-un-dia
autoevaluacion: ¿Sabes por qué un Dag no aparece en la lista? | ¿Sabes qué significa ModuleNotFoundError en un Dag? | ¿Sabes qué diferencia hay entre tasks test y dags test? | ¿Sabes qué prueba poner en el CI?
---

:::analogia El portero que revisa los papeles
El dag processor es el portero: antes de dejar pasar un Dag, lo lee entero. Si tiene un error de Python o le falta un paquete, no entra a la lista y queda anotado en Dag Import Errors con el motivo.
:::

## Paso 1 — El error

En Home, **Dag Import Errors**:

```captura
archivo: airflow/a17-import.webp
texto: Dag Import Errors - avisos_slack.py no carga: ModuleNotFoundError No module named 'airflow.providers.slack'
```

| Error de importación | Tarea fallida |
|---|---|
| El archivo no se pudo leer: error de sintaxis, import que falta, excepción al nivel superior | El Dag carga bien pero una tarea falla al ejecutarse |
| El Dag **no aparece** en la lista | El Dag aparece; la tarea queda en rojo |
| Se ve en **Dag Import Errors** | Se ve en la grilla y en el log |

`avisos_slack.py` importa el operador de Slack, que viene en el paquete **apache-airflow-providers-slack**, y ese paquete no está instalado. En Airflow real se arregla instalándolo en la imagen o el entorno (`pip install apache-airflow-providers-slack`). En la práctica no se pueden instalar paquetes: queda como ejemplo.

## Paso 2 — En la CLI

```bash norun
airflow dags list-import-errors
```

```captura
archivo: airflow/a17-cli.webp
texto: La misma información desde la terminal - archivo y traceback
```

## Paso 3 — Probar una tarea

```bash norun
airflow tasks test carga_ventas_tienda validar 2026-11-14
```

```captura
archivo: airflow/a17-tasks-test.webp
texto: tasks test corre solo validar para el 14, muestra su salida y no guarda nada en la historia
```

Corre **una tarea**, sin dependencias, sin guardar estado. Ideal mientras escribes la función.

## Paso 4 — Probar el Dag entero

```bash norun
airflow dags test resumen_tiendas 2026-11-14
```

```captura
archivo: airflow/a17-dags-test.webp
texto: dags test corre todas las tareas en orden en un solo proceso y termina con el estado de la corrida
```

| Comando | Corre | Guarda en la historia |
|---|---|---|
| `airflow tasks test DAG TAREA FECHA` | Una tarea | No |
| `airflow dags test DAG FECHA` | Todo el Dag, en orden, en un proceso | No (sin scheduler) |
| `dag.test()` al final del archivo | Igual que dags test, desde Python o el depurador | No |

## Paso 5 — Una prueba para el CI

Que ningún Dag con error llegue a producción:

```python norun
# tests/test_dags.py
from airflow.models import DagBag


def test_sin_errores_de_importacion():
    bolsa = DagBag(dag_folder="dags/", include_examples=False)
    assert bolsa.import_errors == {}, bolsa.import_errors


def test_todos_tienen_dueno_y_tags():
    bolsa = DagBag(dag_folder="dags/", include_examples=False)
    for dag_id, dag in bolsa.dags.items():
        assert dag.tags, f"{dag_id} no tiene tags"
        assert dag.owner != "airflow", f"{dag_id} no tiene dueño"
```

Se corre con `pytest` en cada pull request (lo ves en el [curso de GitHub](#/m/github)).

:::errores
- **Buscar el Dag en la lista cuando no carga.** Míralo en Dag Import Errors o con `airflow dags list-import-errors`.
- **Probar en producción.** `airflow tasks test` corre una tarea sin guardar estado; una prueba con DagBag en CI detecta errores antes de fusionar.
- **Instalar el paquete en tu computadora y no en Airflow.** El provider tiene que estar en el entorno donde corren el dag processor y los workers.
:::

## ✅ Lo que lograste

- Lees errores de importación en la interfaz y la CLI.
- Pruebas tareas y Dags sin esperar al scheduler.
- Tienes una prueba para el CI.

:::ejercicio quiz
Un Dag no aparece en la lista después de guardarlo. ¿Qué miras primero?
- [x] Dag Import Errors
- [ ] Pool Slots
- [ ] El Audit Log
- [ ] Admin → Variables
:::

:::ejercicio quiz
`ModuleNotFoundError: No module named 'airflow.providers.slack'`. ¿Qué falta?
- [ ] Una variable
- [ ] Una conexión
- [x] Instalar el provider de Slack en el entorno de Airflow
- [ ] Despausar el Dag
:::

:::ejercicio quiz
¿Qué hace `airflow tasks test`?
- [ ] Corre el Dag entero y guarda la corrida
- [x] Corre una sola tarea sin dependencias y sin guardar estado
- [ ] Corre la tarea en el worker y deja la corrida en la grilla
- [ ] Valida la sintaxis del archivo sin ejecutar nada
:::

:::ejercicio quiz
¿Qué conviene correr en el CI de cada pull request?
- [ ] airflow dags trigger de todos los Dags
- [x] Una prueba que cargue los Dags con DagBag y falle si hay import_errors
- [ ] Un backfill de un año
- [ ] airflow standalone
:::
