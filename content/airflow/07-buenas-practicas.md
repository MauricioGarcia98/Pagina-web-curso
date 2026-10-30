---
titulo: Buenas prácticas, Variables, Connections y CLI
nivel: Avanzado
duracion: 45
resumen: Idempotencia, código top-level, secretos, Variables y Connections, pruebas de DAGs y la CLI de Airflow.
---

Escribir un DAG que corra una vez es fácil. Lo difícil es que siga funcionando a las 3 de la mañana, durante dos años, cuando falla la red, cuando alguien lo relanza por error o cuando hay que recalcular todo marzo. Esta lección reúne las prácticas que separan un DAG de juguete de uno de producción.

## Las reglas de oro

### 1. Idempotencia: ejecutar dos veces da lo mismo que ejecutar una

Una tarea es **idempotente** si correrla dos veces para la misma fecha deja los datos exactamente igual que correrla una vez. Es la regla más importante, porque **en Airflow las tareas se repiten**: por reintentos, porque alguien hace *clear* o porque corres un backfill.

Ejemplo con la carga diaria de ventas del 15 de marzo:

```sql norun
-- ❌ No idempotente: si la tarea corre dos veces, las ventas del día quedan duplicadas
INSERT INTO ventas_diarias
SELECT fecha, SUM(total) FROM pedidos WHERE fecha = '{{ ds }}' GROUP BY fecha;

-- ✅ Idempotente: primero borra lo de ese día y después lo vuelve a escribir
DELETE FROM ventas_diarias WHERE fecha = '{{ ds }}';
INSERT INTO ventas_diarias
SELECT fecha, SUM(total) FROM pedidos WHERE fecha = '{{ ds }}' GROUP BY fecha;
```

Otras formas de lograr lo mismo: `MERGE` (actualiza si existe, inserta si no), sobrescribir la partición del día (`INSERT OVERWRITE ... PARTITION (fecha='{{ ds }}')`) o escribir en una ruta que incluye la fecha (`s3://lake/ventas/fecha={{ ds }}/`).

:::cuidado Nunca uses "hoy" dentro de una tarea
`datetime.now()` o `CURRENT_DATE` hacen que la tarea dependa del momento en que corre. Si relanzas el 20 de marzo la tarea del 15, procesarías el 20. Usa siempre la fecha lógica: `{{ ds }}`, o el argumento `ds` en Python.
:::

### 2. Atomicidad: cada tarea hace una cosa completa

Una tarea debería hacer **una sola cosa** y dejarla completa, o fallar sin dejar basura. Si "extraer, limpiar y cargar" es una sola tarea y falla en la carga, al reintentar vuelves a extraer todo. Si son tres tareas, reintentas solo la carga.

Para no dejar datos a medias, escribe primero en una tabla o carpeta temporal y, cuando todo está listo, renómbrala o muévela al destino final en un solo paso.

### 3. Airflow orquesta, no procesa

Airflow es el **director de orquesta**, no el músico. Su trabajo es decir "ahora corre este job de Spark, después este modelo de dbt, después avisa". El cálculo pesado va al motor adecuado: Spark/Databricks, el data warehouse o dbt.

Si cargas 5 GB en un `PythonOperator` con pandas, el worker de Airflow se queda sin memoria y tumba también a las otras tareas que corrían en él. Pasa lo mismo con XCom: sirve para **pasar datos chicos** (un conteo, una ruta, un id), nunca un DataFrame entero.

### 4. Nada pesado en el nivel superior del archivo

Esta es la causa más común de un Airflow lento. El **scheduler vuelve a leer (parsear) todos los archivos de la carpeta `dags/` cada 30 segundos** aproximadamente, para detectar cambios. Todo lo que está **fuera de una función** se ejecuta en cada lectura.

```python norun
# ❌ Malo: se ejecuta cada vez que el scheduler lee el archivo (¡miles de veces al día!)
clientes = requests.get("https://api/clientes").json()

# ✅ Bien: se ejecuta solo cuando corre la tarea
@task
def traer_clientes():
    return requests.get("https://api/clientes", timeout=30).json()
```

Lo mismo vale para `Variable.get(...)` en el nivel superior (hace una consulta a la base de metadatos en cada parseo) o para importar librerías enormes. En el nivel superior solo deberían estar las definiciones del DAG y de sus tareas.

### 5. Fechas fijas y catchup consciente

- `start_date` siempre **fija** (`datetime(2024, 1, 1)`), nunca `datetime.now()`. Con una fecha que se mueve, Airflow nunca sabe qué intervalos ya pasaron.
- `catchup=False`, salvo que realmente quieras que al activar el DAG se ejecuten todos los días desde `start_date` hasta hoy.

### 6. Reintentos y alertas

Las fallas pasajeras (la red, un servidor que reinicia) son normales. Configura reintentos para todas las tareas con `default_args`, y una alerta que avise solo cuando se agotan:

```python norun
def avisar(context):
    ti = context["task_instance"]
    enviar_a_slack(f"Falló {ti.dag_id}.{ti.task_id} del {context['ds']}")

default_args = {
    "retries": 3,
    "retry_delay": timedelta(minutes=5),
    "retry_exponential_backoff": True,   # 5 min, 10 min, 20 min…
    "on_failure_callback": avisar,       # solo cuando falla el último intento
}
with DAG("etl_ventas", default_args=default_args, ...):
    ...
```

Para tareas que no deberían tardar más de cierto tiempo, agrega `execution_timeout=timedelta(hours=1)`. Así una consulta colgada no bloquea el DAG para siempre.

### 7. Secretos fuera del código

Contraseñas, tokens y claves **nunca** van en el archivo del DAG: ese archivo está en Git y lo lee todo el equipo. Van en **Connections**, idealmente guardadas en un gestor de secretos (Azure Key Vault, AWS Secrets Manager, GCP Secret Manager).

## Variables y Connections

Airflow guarda dos tipos de configuración en su base de metadatos:

| | Variables | Connections |
|---|---|---|
| Qué guardan | Configuración clave-valor: `bucket_destino = "lake-prod"` | Cómo conectarse a un sistema: host, usuario, contraseña, puerto, extras |
| Cómo se leen | `Variable.get("bucket_destino")` o `{{ var.value.bucket_destino }}` | Los operadores reciben un id: `databricks_conn_id="databricks_default"` |
| Ejemplo de uso | Nombre del entorno, umbrales, listas de países | Databricks, Postgres, Snowflake, S3, Slack |

Se crean desde la interfaz web, la CLI o variables de entorno con un prefijo especial:

```bash
export AIRFLOW_VAR_ENTORNO=prod                                   # Variable "entorno"
export AIRFLOW_CONN_MI_DB='postgresql://usuario:clave@host:5432/ventas'   # Connection "mi_db"
```

:::tip Prefiere plantillas a Variable.get
`{{ var.value.bucket }}` dentro de un parámetro con plantilla se resuelve **cuando corre la tarea**. `Variable.get("bucket")` en el nivel superior se ejecuta **en cada parseo**.
:::

## Probar DAGs antes de subirlos

Un DAG con un error de sintaxis no aparece en la interfaz: Airflow lo registra como **import error** y sigue de largo. Para que eso no llegue a producción, los equipos corren tests en CI (por ejemplo, GitHub Actions) en cada pull request:

```python norun
# tests/test_dags.py — se corre en CI con pytest
from airflow.dag_processing.dagbag import DagBag   # en Airflow 2: from airflow.models import DagBag

def test_sin_errores_de_importacion():
    bag = DagBag(dag_folder="dags/", include_examples=False)
    assert bag.import_errors == {}, bag.import_errors

def test_todas_las_tareas_tienen_reintentos():
    bag = DagBag(dag_folder="dags/", include_examples=False)
    for dag in bag.dags.values():
        for t in dag.tasks:
            assert t.retries >= 1, f"{dag.dag_id}.{t.task_id} no tiene reintentos"
```

`DagBag` lee la carpeta igual que el Dag processor. El primer test atrapa errores de sintaxis e imports rotos. El segundo hace cumplir una regla del equipo.

## La CLI de Airflow

La interfaz web es cómoda, pero en el día a día (y en scripts) se usa mucho la línea de comandos:

| Comando | Qué hace |
|---|---|
| `airflow dags list` | Lista los DAGs |
| `airflow dags list-import-errors` | Muestra los archivos que no se pudieron leer y por qué |
| `airflow dags trigger etl_ventas` | Dispara una ejecución manual |
| `airflow dags trigger etl_ventas --conf '{"pais": "Chile"}'` | …con parámetros, que la tarea lee en `dag_run.conf` |
| `airflow dags pause etl_ventas` / `unpause` | Pausa o reactiva el DAG |
| `airflow dags test etl_ventas 2024-03-15` | Ejecuta el DAG completo localmente para esa fecha |
| `airflow tasks test etl_ventas extraer 2024-03-15` | Ejecuta **una tarea** sin registrar su estado (ideal para depurar) |
| `airflow tasks clear etl_ventas -s 2024-03-01 -e 2024-03-05` | Borra los estados de ese rango para que se vuelvan a ejecutar |
| `airflow dags backfill -s 2024-03-01 -e 2024-03-05 etl_ventas` | Ejecuta todos los intervalos de ese rango |
| `airflow variables set entorno prod` | Crea o actualiza una variable |
| `airflow connections add mi_db --conn-uri '...'` | Crea una conexión |

:::nota `tasks test` vs `dags test`
`tasks test` corre una sola tarea ignorando dependencias y sin guardar nada: es para probar. `dags test` corre todo el DAG en orden. Ninguna de las dos necesita que el scheduler esté encendido.
:::

Abre la terminal del curso (botón ⌨ Terminal) y prueba: `ls dags`, `airflow dags list`, `airflow tasks list etl_ventas` y `airflow dags test etl_ventas 2024-03-15`. Son DAGs reales que corre el mini-Airflow del curso.

## Checklist antes de subir un DAG

- [ ] ¿Cada tarea es idempotente y usa `{{ ds }}` en vez de "hoy"?
- [ ] ¿`start_date` es fija y `catchup` está decidido a propósito?
- [ ] ¿Hay `retries`, `execution_timeout` y una alerta de falla?
- [ ] ¿El nivel superior del archivo está libre de consultas, APIs y `Variable.get`?
- [ ] ¿El trabajo pesado corre fuera de Airflow (Spark, dbt, warehouse)?
- [ ] ¿Los secretos están en Connections?
- [ ] ¿Pasa el test de `DagBag` sin import errors?

## Ejercicios

:::ejercicio cli
Lista los DAGs que tienen **errores de importación**.
```respuesta
airflow dags list-import-errors
```
:::

:::ejercicio cli
Prueba **solo la tarea** `validar` del DAG `etl_ventas` para la fecha `2024-03-15`.
```respuesta
airflow tasks test etl_ventas validar 2024-03-15
```
:::

:::ejercicio cli
Dispara manualmente el DAG `etl_ventas` pasando la configuración `{"pais": "Chile"}`.
```respuesta
airflow dags trigger etl_ventas (--conf|-c) ['"]?\{"pais": ?"Chile"\}['"]?
airflow dags trigger (--conf|-c) ['"]?\{"pais": ?"Chile"\}['"]? etl_ventas
```
```solucion
airflow dags trigger etl_ventas --conf '{"pais": "Chile"}'
```
:::

:::ejercicio cli
Pausa el DAG `reporte_mensual`.
```respuesta
airflow dags pause reporte_mensual
```
```setup
printf "from datetime import datetime\nfrom airflow import DAG\nfrom airflow.operators.empty import EmptyOperator\n\nwith DAG(\"reporte_mensual\", start_date=datetime(2024, 1, 1), schedule=\"@monthly\", catchup=False) as dag:\n    EmptyOperator(task_id=\"generar\")\n" > ~/dags/reporte_mensual.py
```
:::

:::ejercicio quiz
Tu archivo de DAG hace una consulta a la base de datos de producción en el nivel superior del archivo (fuera de cualquier función). ¿Cuál es el problema?

- [ ] Ninguno
- [x] El scheduler re-parsea el archivo constantemente: la consulta se ejecuta cada pocos segundos y ralentiza todo
- [ ] La consulta nunca se ejecuta
- [ ] Airflow no permite consultas
:::

:::ejercicio quiz
¿Dónde deberían estar las credenciales de Databricks que usa un DAG?

- [ ] En el código del DAG
- [ ] En un XCom
- [x] En una Connection de Airflow (idealmente respaldada por un gestor de secretos como Key Vault)
- [ ] En una variable global de Python
:::
