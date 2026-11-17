---
titulo: Tu primer Dag - un archivo Python en la carpeta de Dags
nivel: 1 · Básico
duracion: 45
resumen: Un Dag es un archivo Python que vive en la carpeta de Dags. Escribes hola_tienda.py con nano en la terminal, entiendes cada línea (imports de Airflow 3, el bloque with DAG, dos operadores y la flecha >>), compruebas con airflow dags list que Airflow lo leyó y lo encuentras en la interfaz.
objetivos: Crear un archivo de Dag en ~/airflow/dags | Entender dag_id, schedule, start_date y tags | Crear tareas con BashOperator y PythonOperator | Definir el orden con >> | Comprobar que Airflow leyó el Dag
prerrequisitos: airflow-paso-a-paso-la-lista-de-dags
autoevaluacion: ¿Sabes dónde se guardan los Dags? | ¿Sabes qué hace >>? | ¿Sabes de dónde se importa DAG en Airflow 3? | ¿Sabes cómo comprobar que Airflow leyó tu archivo?
---

:::escenario El pedido
Lucía, líder del equipo de datos: *"Antes de migrar los scripts, quiero ver un Dag mínimo funcionando: un paso que avise que arranca la carga y otro que salude desde Python."*
:::

:::analogia Una receta escrita en Python
Un Dag es una receta escrita en Python: dice qué pasos hay (las tareas) y en qué orden (las flechas `>>`). El archivo no cocina: Airflow lo lee, entiende la receta y la ejecuta cuando corresponde.
:::

## Paso 1 — Abrir la terminal

En la barra izquierda, **Terminal**. Es la misma máquina del curso: los Dags viven en `~/airflow/dags`.

```bash norun
cd ~/airflow/dags
ls
nano hola_tienda.py
```

## Paso 2 — Escribir el Dag

```python norun
from datetime import datetime

from airflow.providers.standard.operators.bash import BashOperator
from airflow.providers.standard.operators.python import PythonOperator
from airflow.sdk import DAG


def saludar():
    print("Hola, Tienda Andina: el equipo de datos ya orquesta con Airflow")


with DAG(
    dag_id="hola_tienda",
    schedule=None,
    start_date=datetime(2026, 11, 1),
    tags=["curso"],
):
    inicio = BashOperator(task_id="inicio", bash_command="echo 'Arranca la carga'")
    saludo = PythonOperator(task_id="saludo", python_callable=saludar)

    inicio >> saludo
```

```captura
archivo: airflow/a03-nano.webp
texto: El archivo hola_tienda.py abierto con nano en la terminal de la práctica
```

Guarda con **Ctrl+O**, Enter, y sal con **Ctrl+X**.

## Paso 3 — Línea por línea

| Línea | Qué hace |
|---|---|
| `from airflow.sdk import DAG` | En Airflow 3, lo que usas para escribir Dags se importa de **`airflow.sdk`** (el Task SDK) |
| `from airflow.providers.standard...` | Los operadores básicos vienen en el provider **standard** |
| `dag_id="hola_tienda"` | El nombre único del Dag |
| `schedule=None` | No corre solo: se dispara a mano |
| `start_date=...` | Desde qué fecha el Dag puede tener corridas |
| `tags=["curso"]` | Etiquetas para filtrar |
| `BashOperator` | Una tarea que corre un comando de la terminal |
| `PythonOperator` | Una tarea que llama a una función de Python |
| `task_id` | El nombre de la tarea, único dentro del Dag |
| `inicio >> saludo` | El orden: `saludo` corre después de que `inicio` termine bien |

:::nota Si vienes de Airflow 2
`from airflow import DAG` y `from airflow.operators.bash import BashOperator` todavía funcionan en muchos casos, pero muestran avisos de obsoleto. En Airflow 3 usa `airflow.sdk` y los providers.
:::

## Paso 4 — Comprobar que Airflow lo leyó

```bash norun
airflow dags list
```

```captura
archivo: airflow/a03-cli.webp
texto: airflow dags list - hola_tienda aparece con su archivo, su dueño y pausado
```

Y en la interfaz, busca `hola`:

```captura
archivo: airflow/a03-lista.webp
texto: hola_tienda en la lista de Dags, con Schedule None y la etiqueta curso
```

```captura
archivo: airflow/a03-code.webp
texto: La pestaña Code muestra el archivo tal como lo leyó Airflow
```

:::cuidado ¿No aparece?
Si el archivo tiene un error de Python, no aparece en la lista: aparece en **Dag Import Errors**. Si tiene código válido pero no aparece, pulsa **Reparse** en la lista. En Airflow real el dag processor revisa la carpeta cada cierto tiempo (`refresh_interval`), así que puede tardar hasta unos minutos.
:::

:::errores
- **Guardar el archivo fuera de la carpeta de Dags.** Airflow solo lee esa carpeta.
- **Imports de Airflow 2 en Airflow 3.** `DAG` y `@task` se importan de `airflow.sdk`.
- **Ejecutar el archivo con `python` para "probarlo".** Solo comprueba que el código no rompe; para que corra, Airflow tiene que leerlo y dispararlo.
:::

## ✅ Lo que lograste

- Escribiste tu primer Dag en la carpeta de Dags.
- Entiendes cada línea.
- Comprobaste que Airflow lo leyó.

:::ejercicio quiz
¿Dónde tiene que estar el archivo para que Airflow lo lea?
- [ ] En la carpeta de plugins
- [x] En la carpeta de Dags (~/airflow/dags en la práctica)
- [ ] En la base de metadatos
- [ ] En la misma carpeta que airflow.cfg
:::

:::ejercicio quiz
¿Qué significa `inicio >> saludo`?
- [ ] Que corren a la vez
- [x] Que saludo corre después de que inicio termine bien
- [ ] Que inicio corre después de saludo
- [ ] Que saludo corre aunque inicio falle
:::

:::ejercicio quiz
En Airflow 3, ¿de dónde se importa DAG?
- [ ] `from airflow.dag import Dag`
- [x] `from airflow.sdk import DAG`
- [ ] `from airflow.models import DAG`, como en todas las versiones
- [ ] `from airflow.decorators import DAG`
:::

:::ejercicio quiz
¿Con qué comando compruebas que Airflow leyó tu Dag?
- [x] `airflow dags list`
- [ ] `airflow tasks list hola_tienda --tree`
- [ ] `python hola_tienda.py --run`
- [ ] `airflow db check`
:::
