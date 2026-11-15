---
titulo: Mapeo dinámico - una tarea por cada elemento
nivel: 6 · Avanzado completo
duracion: 40
resumen: Cuando la cantidad de tiendas, archivos o países cambia, no conviene escribir una tarea por cada uno. Con dynamic task mapping, procesar.expand(tienda=...) crea una instancia por elemento en el momento de correr. Escribes ventas_por_tienda, ves las instancias mapeadas y aprendes partial, los límites y cuándo usar mapeo en lugar de un for.
objetivos: Crear tareas mapeadas con expand | Fijar argumentos comunes con partial | Leer las instancias mapeadas en la grilla y el log | Elegir entre mapeo dinámico y un bucle for
prerrequisitos: airflow-paso-a-paso-buenas-practicas
autoevaluacion: ¿Sabes qué crea expand? | ¿Sabes cuándo se decide la cantidad de instancias? | ¿Sabes qué recibe la tarea que va después? | ¿Sabes cuándo alcanza con un for?
---

## Paso 1 — El Dag

`ventas_por_tienda.py`:

```python norun
from datetime import datetime

from airflow.sdk import dag, task


@dag(schedule=None, start_date=datetime(2026, 11, 1), catchup=False, tags=["curso", "tienda"])
def ventas_por_tienda():
    @task
    def tiendas():
        return ["Lima Centro", "Bogotá Norte", "CDMX Roma", "Santiago Providencia"]

    @task
    def procesar(tienda):
        print(f"Procesando las ventas de {tienda}")
        return len(tienda)

    @task
    def consolidar(resultados):
        print(f"Tiendas procesadas: {len(list(resultados))}")

    consolidar(procesar.expand(tienda=tiendas()))


ventas_por_tienda()
```

| Pieza | Qué hace |
|---|---|
| `tiendas()` | Devuelve la lista **al correr** (podría leerla de una tabla) |
| `procesar.expand(tienda=...)` | Crea **una instancia de `procesar` por elemento** |
| `consolidar(...)` | Recibe la lista de resultados de todas las instancias |

## Paso 2 — Correrlo

```captura
archivo: airflow/a22-mapeo.webp
texto: La grilla con procesar [ ] - una tarea mapeada (1) - y las tres tareas en success (2)
```

```captura
archivo: airflow/a22-log.webp
texto: El log de procesar - 4 instancias mapeadas, una por tienda
```

Si mañana se abre una quinta tienda, la lista trae cinco elementos y hay cinco instancias, **sin tocar el Dag**.

## Paso 3 — partial

Para fijar argumentos que son iguales en todas las instancias:

```python norun
@task
def cargar(tienda, destino):
    print(f"Cargando {tienda} en {destino}")

cargar.partial(destino="gold.ventas").expand(tienda=tiendas())
```

Con operadores clásicos funciona igual: `BashOperator.partial(task_id="copiar").expand(bash_command=[...])`.

## Paso 4 — ¿Mapeo o for?

| Usa un `for` (como en `catalogo_api`) | Usa mapeo dinámico |
|---|---|
| La lista es fija y la conoces al escribir el Dag | La lista se conoce **al correr** (archivos que llegaron, filas de una tabla) |
| Pocas tareas con nombre propio | Cantidad variable |

:::cuidado Límites
`[core] max_map_length` (1024 por defecto) limita cuántas instancias puede crear una tarea mapeada. Si son miles de elementos, agrúpalos en lotes. Las instancias mapeadas también respetan pools y `max_active_tasks`.
:::

## ✅ Lo que lograste

- Creaste tareas mapeadas con expand y partial.
- Lees las instancias mapeadas.
- Sabes cuándo conviene mapear.

:::ejercicio quiz
¿Qué crea `procesar.expand(tienda=tiendas())`?
- [ ] Una sola tarea con la lista entera
- [x] Una instancia de procesar por cada elemento de la lista
- [ ] Un Dag por tienda
- [ ] Nada hasta que se reinicie Airflow
:::

:::ejercicio quiz
¿Cuándo se decide cuántas instancias hay?
- [ ] Al escribir el archivo
- [x] Al correr, según lo que devuelva la tarea anterior
- [ ] Una vez por semana
- [ ] Al instalar Airflow
:::

:::ejercicio quiz
¿Para qué sirve partial?
- [x] Para fijar los argumentos que son iguales en todas las instancias
- [ ] Para correr solo la mitad
- [ ] Para pausar el Dag
- [ ] Para borrar instancias
:::

:::ejercicio quiz
La lista de categorías es fija y son 4. ¿Qué alcanza?
- [x] Un for al escribir el Dag
- [ ] Obligatoriamente mapeo dinámico
- [ ] Un Dag por categoría
- [ ] Un backfill
:::
