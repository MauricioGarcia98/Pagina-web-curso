---
titulo: Proyecto 2 (semiguiado) - el Dag diario de ventas
nivel: 2 · Básico-intermedio
duracion: 50
resumen: El equipo quiere dejar de correr la carga de ventas a mano. Escribes carga_ventas_tienda - tres tareas, todos los días a las 6:00 UTC, con dueño, etiquetas, reintentos y documentación - lo activas, lo pruebas y compruebas que la plantilla {{ ds }} se resolvió con la fecha correcta. Pistas escondidas.
objetivos: Escribir un Dag programado desde cero | Usar default_args para dueño y reintentos | Documentar el Dag con doc_md | Usar una plantilla con la fecha lógica
prerrequisitos: airflow-paso-a-paso-programacion
autoevaluacion: ¿El Dag corre a las 6:00 UTC? | ¿Tiene dueño, etiquetas y reintentos? | ¿Su documentación aparece en Overview? | ¿La plantilla se resolvió con la fecha de la corrida?
---

:::escenario El pedido
Lucía: *"Quiero `carga_ventas_tienda`: extraer, validar y publicar, todos los días a las 6 UTC. Que diga de quién es, que reintente dos veces si falla y que tenga escrito qué hace, para que la guardia de la noche sepa qué mirar."*
:::

## Lo que tienes que lograr

1. Un archivo `carga_ventas_tienda.py` en la carpeta de Dags.
2. Tres tareas en orden: `extraer` (Bash, que imprima la fecha de los datos) → `validar` (Python, que falle si no hay filas) → `publicar` (Bash).
3. `schedule="0 6 * * *"`, `catchup=False`, etiquetas `tienda` y `ventas`.
4. `owner`, `retries=2` y `retry_delay` de 5 minutos para todas las tareas.
5. Documentación visible en la pestaña Overview.
6. Una corrida exitosa y el Dag activo.

<details><summary>💡 Pista 1: lo que se repite en todas las tareas</summary>

`default_args={"owner": "equipo-datos", "retries": 2, "retry_delay": timedelta(minutes=5)}` en el `DAG(...)`. Cada tarea toma esos valores salvo que los pise.
</details>

<details><summary>💡 Pista 2: la documentación</summary>

Escribe un docstring en Markdown al principio del archivo y pásalo con `doc_md=__doc__`.
</details>

<details><summary>💡 Pista 3: la fecha en el comando</summary>

`bash_command` es una **plantilla**: `"echo 'Descargando ventas del {{ ds }}'"`. Airflow reemplaza `{{ ds }}` por la fecha lógica justo antes de ejecutar.
</details>

## Cómo se ve terminado

```captura
archivo: airflow/a08-dag.webp
texto: Horario 0 6 * * *, próxima corrida a las 06:00, dueño y etiquetas (1), la primera corrida en verde (2) y la documentación del Dag (3)
```

```captura
archivo: airflow/a08-rendered.webp
texto: Rendered Templates de extraer - {{ ds }} quedó reemplazado por la fecha de la corrida
```

:::errores
- **Repetir dueño y reintentos en cada tarea.** Van una vez en `default_args`.
- **Validaciones que no fallan.** Si `validar` solo imprime un aviso, el reporte vacío se publica igual.
- **Probar solo con un disparo manual.** Revisa también que el horario y la próxima corrida sean los esperados.
:::

## ✅ Lista de verificación

- [ ] El Dag aparece sin errores de importación.
- [ ] Next Run dice el próximo día a las 06:00 UTC.
- [ ] Overview muestra la documentación.
- [ ] Rendered Templates de `extraer` muestra la fecha, no `{{ ds }}`.
- [ ] Details dice Catchup false y Owners equipo-datos.

<details><summary>💡 Solución comentada</summary>

```python norun
"""
### Carga de ventas de Tienda Andina

Todos los días a las 6:00 UTC trae las ventas, las valida y las publica.
Responsable: **equipo de datos**. Si falla, revisar primero el log de `validar`.
"""
from datetime import datetime, timedelta

from airflow.providers.standard.operators.bash import BashOperator
from airflow.providers.standard.operators.python import PythonOperator
from airflow.sdk import DAG


def validar_ventas(**context):
    filas = 1240
    print(f"Ventas del {context['ds']}: {filas} filas")
    if filas == 0:
        raise ValueError("No llegaron ventas")
    return filas


with DAG(
    dag_id="carga_ventas_tienda",
    schedule="0 6 * * *",
    start_date=datetime(2026, 11, 1),
    catchup=False,
    tags=["tienda", "ventas", "curso"],
    default_args={"owner": "equipo-datos", "retries": 2, "retry_delay": timedelta(minutes=5)},
    doc_md=__doc__,
):
    extraer = BashOperator(task_id="extraer", bash_command="echo 'Descargando ventas del {{ ds }}'")
    validar = PythonOperator(task_id="validar", python_callable=validar_ventas)
    publicar = BashOperator(task_id="publicar", bash_command="echo 'Publicando ventas validadas'")

    extraer >> validar >> publicar
```

**Por qué `validar` lanza un error:** si la carga trae cero filas, es mejor que la tarea **falle** (y se vea en rojo) a que publique un reporte vacío que parece correcto. Un Dag que termina en verde con datos malos es el peor caso.
</details>

## Lo que aprendiste en el nivel 2

- Grid, Graph y tipos de corrida.
- Logs, reintentos y Clear.
- Horarios, catchup y el timetable de Airflow 3.

En el nivel 3: TaskFlow, XComs, variables, conexiones y parámetros.

:::ejercicio quiz
¿Para qué sirve default_args?
- [ ] Para definir el horario
- [x] Para dar valores comunes (dueño, reintentos) a todas las tareas del Dag
- [ ] Para importar operadores
- [ ] Para pasar parámetros al formulario de Trigger
:::

:::ejercicio quiz
¿Qué hace `doc_md=__doc__`?
- [x] Muestra el docstring del archivo como documentación del Dag en la interfaz
- [ ] Borra los comentarios
- [ ] Ejecuta el docstring
- [ ] Exporta la documentación a un archivo README
:::

:::ejercicio quiz
¿Cuándo se reemplaza `{{ ds }}` en un bash_command?
- [ ] Al escribir el archivo
- [x] Justo antes de ejecutar la tarea, con la fecha lógica de la corrida
- [ ] Cuando el dag processor lee el archivo
- [ ] Al crear la corrida, con la hora actual
:::

:::ejercicio quiz
¿Por qué conviene que validar falle si no hay filas?
- [ ] Para que Airflow reintente hasta que lleguen filas
- [x] Para que el problema se vea en rojo en lugar de publicar un reporte vacío que parece correcto
- [ ] Porque Airflow lo exige
- [ ] Porque una tarea sin filas queda en skipped
:::
