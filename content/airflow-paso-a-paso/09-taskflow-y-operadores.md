---
titulo: TaskFlow y operadores - dos formas de escribir tareas
nivel: 3 · Intermedio
duracion: 45
resumen: Airflow tiene dos estilos para crear tareas - los operadores clásicos y TaskFlow con @task. Escribes resumen_tiendas con TaskFlow, donde cada tarea devuelve un valor que usa la siguiente, comparas con ingesta_api hecho con operadores y un TaskGroup, y aprendes cuándo conviene cada estilo.
objetivos: Escribir tareas con @dag y @task | Pasar valores entre tareas devolviéndolos | Reconocer operadores clásicos y TaskGroup | Elegir entre TaskFlow y operadores
prerrequisitos: airflow-paso-a-paso-proyecto-dag-diario-de-ventas
autoevaluacion: ¿Sabes qué hace @task? | ¿Sabes cómo se arma el orden en TaskFlow? | ¿Sabes qué es un TaskGroup? | ¿Sabes cuándo conviene un operador clásico?
---

## Paso 1 — Un Dag con TaskFlow

`resumen_tiendas.py`:

```python norun
from datetime import datetime

from airflow.sdk import dag, task


@dag(schedule=None, start_date=datetime(2026, 11, 1), catchup=False, tags=["curso", "tienda"])
def resumen_tiendas():
    @task
    def leer_ventas():
        return [
            {"tienda": "Lima Centro", "unidades": 3},
            {"tienda": "Bogotá Norte", "unidades": 6},
            {"tienda": "CDMX Roma", "unidades": 9},
            {"tienda": "Santiago Providencia", "unidades": 12},
        ]

    @task
    def total_unidades(ventas):
        total = sum(v["unidades"] for v in ventas)
        print(f"Unidades vendidas: {total}")
        return total

    @task
    def mejor_tienda(ventas):
        mejor = max(ventas, key=lambda v: v["unidades"])
        print(f"La tienda que más vendió: {mejor['tienda']}")
        return mejor["tienda"]

    @task
    def informar(total, tienda):
        print(f"Resumen del día: {total} unidades, tienda destacada {tienda}")

    ventas = leer_ventas()
    informar(total_unidades(ventas), mejor_tienda(ventas))


resumen_tiendas()
```

| Pieza | Qué hace |
|---|---|
| `@dag` | Convierte la función en un Dag; el `dag_id` es el nombre de la función |
| `@task` | Convierte la función en una tarea |
| `ventas = leer_ventas()` | No ejecuta la función: crea la tarea y guarda una referencia a lo que va a devolver |
| `total_unidades(ventas)` | Crea la tarea **y** la dependencia: `total_unidades` corre después de `leer_ventas` |
| `resumen_tiendas()` | La última línea registra el Dag. **Si la olvidas, el Dag no aparece** |

## Paso 2 — Correrlo

```captura
archivo: airflow/a09-graph.webp
texto: El grafo - leer_ventas alimenta a total_unidades y mejor_tienda, que corren en paralelo, y las dos alimentan a informar
```

No escribiste ninguna `>>`: el orden sale de **quién usa el resultado de quién**.

```captura
archivo: airflow/a09-log.webp
texto: El log de informar - recibió el total y la tienda que calcularon las tareas anteriores
```

## Paso 3 — Operadores clásicos y TaskGroup

`ingesta_api` está hecho con operadores:

```captura
archivo: airflow/a09-operadores.webp
texto: inicio (EmptyOperator) → el grupo descargas con clientes y productos (BashOperator) → validar (PythonOperator)
```

```python norun
with TaskGroup("descargas") as descargas:
    BashOperator(task_id="clientes", bash_command="echo descargando clientes del {{ ds }}")
    BashOperator(task_id="productos", bash_command="echo descargando productos del {{ ds }}")

inicio >> descargas >> validar >> fin
```

Un **TaskGroup** agrupa tareas visualmente (en la grilla se pliega) y permite conectar el grupo entero con una sola flecha. Las tareas quedan con nombre `descargas.clientes`.

## Paso 4 — ¿Cuál uso?

| Si la tarea… | Conviene |
|---|---|
| Es lógica en Python (transformar, decidir, calcular) | **TaskFlow** (`@task`) |
| Usa un servicio con operador listo (SQL, Databricks, S3, BigQuery) | **Operador del provider** |
| Corre un comando o script existente | **BashOperator** (o `@task.bash`) |
| Es solo un punto de unión | **EmptyOperator** |

Se pueden mezclar en el mismo Dag: `tarea_taskflow() >> operador_clasico`.

## ✅ Lo que lograste

- Escribiste un Dag con TaskFlow.
- Entiendes cómo se arma el orden pasando resultados.
- Reconoces operadores y TaskGroups.

:::ejercicio quiz
¿Qué crea `ventas = leer_ventas()` dentro de un @dag?
- [ ] Ejecuta la función en ese momento
- [x] La tarea y una referencia a lo que va a devolver
- [ ] Un archivo
- [ ] Un error
:::

:::ejercicio quiz
En TaskFlow, ¿cómo se define que informar corre después de total_unidades?
- [ ] Con un comentario
- [x] Pasándole el resultado de total_unidades como argumento
- [ ] Con time.sleep
- [ ] No se puede
:::

:::ejercicio quiz
¿Qué pasa si olvidas la última línea `resumen_tiendas()`?
- [x] El Dag no se registra y no aparece en la lista
- [ ] Corre dos veces
- [ ] Nada
- [ ] Se borra el archivo
:::

:::ejercicio quiz
Necesitas ejecutar una consulta en Databricks. ¿Qué conviene?
- [ ] Un BashOperator con curl
- [x] El operador del provider de Databricks
- [ ] Un EmptyOperator
- [ ] Un TaskGroup vacío
:::
