---
titulo: Proyecto 5 (solo el objetivo) - que las fallas avisen solas
nivel: 5 · Avanzado
duracion: 50
resumen: La carga de devoluciones falló el fin de semana y nadie se enteró hasta el lunes. Agregas un callback de falla que arma un aviso con la tarea y la corrida, lo pruebas forzando la falla y documentas la guardia. Solo se dan el objetivo y el criterio de aceptación.
objetivos: Escribir un on_failure_callback | Aplicarlo a todas las tareas con default_args | Probarlo provocando una falla | Conocer notifiers y alertas por SLA en Airflow 3
prerrequisitos: airflow-paso-a-paso-browse-y-auditoria
autoevaluacion: ¿El aviso dice qué tarea y qué corrida fallaron? | ¿Se dispara solo después del último intento? | ¿Sabes cómo mandarlo a Slack o al correo? | ¿Sabes avisar si un Dag tarda demasiado?
---

:::escenario El objetivo
Lucía: *"Si una carga falla, quiero un aviso en el canal #datos con qué tarea falló y en qué corrida. Probalo antes de dejarlo activo."*
:::

## Criterio de aceptación

- `carga_devoluciones` tiene un callback de falla que aplica a todas sus tareas.
- El aviso incluye el `task_id` y el `run_id`.
- Se dispara **después del último intento**, no en cada reintento.
- Hay una corrida de prueba en la que se ve el aviso en el log.

## Cómo se ve terminado

```captura
archivo: airflow/a20-callback.webp
texto: El log de validar - el error, "Running on_failure_callback" y la línea ALERTA con la tarea y la corrida
```

```captura
archivo: airflow/a20-home.webp
texto: Home - Failed Dags en 1 (1) y la falla en el historial de las últimas 24 horas (2)
```

<details><summary>💡 Solución comentada</summary>

```python norun
from datetime import datetime

from airflow.sdk import DAG, task


def avisar_falla(context):
    tarea = context["task"].task_id
    print(f"ALERTA para el canal #datos: falló {tarea} en la corrida {context['run_id']}")


with DAG(
    dag_id="carga_devoluciones",
    schedule="30 6 * * *",
    start_date=datetime(2026, 11, 1),
    catchup=False,
    tags=["tienda", "curso"],
    default_args={"owner": "equipo-datos", "retries": 1, "on_failure_callback": avisar_falla},
):

    @task
    def leer_devoluciones():
        return []

    @task
    def validar(devoluciones):
        if not devoluciones:
            raise ValueError("El archivo de devoluciones llegó vacío")
        return len(devoluciones)

    validar(leer_devoluciones())
```

- `on_failure_callback` corre cuando la tarea queda en **failed**, después del último reintento. Para avisar en cada reintento existe `on_retry_callback`.
- En `default_args` aplica a todas las tareas. Si se pone en el `DAG(...)`, corre una vez por **corrida** fallida.
- Para mandarlo de verdad, en lugar de `print` se usa un **notifier** de un provider, por ejemplo `SlackNotifier` de `apache-airflow-providers-slack`: `on_failure_callback=SlackNotifier(slack_conn_id="slack_datos", text="Falló {{ ti.task_id }}")`.
- Para "avisar si a las 8 no terminó", Airflow 3 reemplaza los antiguos SLA por **Deadline Alerts** (`deadline=` en el Dag).

**Decisión a defender:** el aviso tiene que decir **qué** falló y **dónde mirar**. "Algo falló" a las 3 de la mañana obliga a investigar desde cero.
</details>

:::errores
- **Callback en cada tarea a mano.** Va en `default_args` para todo el Dag.
- **Avisos sin contexto.** "Algo falló" obliga a buscar; el aviso debe decir qué tarea, qué corrida y dónde mirar.
- **No probar la alerta.** Fuerza una falla y comprueba que el aviso llega antes de confiar en él.
:::

## Lo que aprendiste en el nivel 5

- Errores de importación y pruebas.
- Pools y concurrencia.
- Browse, Audit Log y alertas.

En el nivel 6: buenas prácticas, mapeo dinámico y el paso a Airflow real.

:::ejercicio quiz
¿Cuándo se ejecuta on_failure_callback de una tarea con retries=1?
- [ ] En cada intento fallido
- [x] Cuando la tarea queda en failed, después del último intento
- [ ] En cada intento, incluido el primero
- [ ] Cuando termina bien
:::

:::ejercicio quiz
¿Cómo aplicas el callback a todas las tareas del Dag?
- [ ] Copiándolo en cada tarea a mano, sin otra opción
- [x] Poniéndolo en default_args
- [ ] En una variable
- [ ] En la función del Dag con @dag(on_failure_callback=...) para cada tarea por separado
:::

:::ejercicio quiz
¿Qué conviene usar para mandar el aviso a Slack?
- [ ] Un print
- [x] Un notifier del provider de Slack
- [ ] Un XCom
- [ ] Un BashOperator con echo
:::

:::ejercicio quiz
¿Qué debe decir un buen aviso de falla?
- [ ] "Algo falló"
- [x] Qué tarea falló, en qué corrida y dónde mirar
- [ ] El traceback completo en el texto del aviso
- [ ] Nada, alcanza con que llegue
:::
