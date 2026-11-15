---
titulo: Buenas prácticas - Dags confiables y baratos de operar
nivel: 6 · Avanzado completo
duracion: 45
resumen: Lo que separa un Dag que funciona de uno que se puede operar años. Idempotencia, tareas atómicas, nada pesado en el nivel superior del archivo, Airflow orquesta pero no procesa, fechas lógicas en lugar de "hoy", configuración por variables de entorno y una lista de revisión para cada pull request.
objetivos: Escribir tareas idempotentes y atómicas | Evitar código pesado al cargar el archivo | Delegar el procesamiento pesado | Configurar Airflow con variables de entorno | Revisar un Dag antes de aprobarlo
prerrequisitos: airflow-paso-a-paso-proyecto-alertas-al-fallar
autoevaluacion: ¿Sabes qué es una tarea idempotente? | ¿Sabes por qué no se consulta una base en el nivel superior? | ¿Sabes dónde debería correr un join de 200 millones de filas? | ¿Sabes pisar una opción de airflow.cfg?
---

## Paso 1 — Idempotencia

Una tarea es **idempotente** si correrla dos veces para la misma fecha deja el mismo resultado. Es lo que hace seguros los reintentos, Clear y los backfills.

| No idempotente | Idempotente |
|---|---|
| `INSERT INTO ventas SELECT ... WHERE fecha = '{{ ds }}'` | `DELETE FROM ventas WHERE fecha = '{{ ds }}'` y después el `INSERT` (o un `MERGE`) |
| Escribir en `/lake/ventas/ultimo.csv` | Escribir en `/lake/ventas/fecha={{ ds }}/` y sobrescribir |
| Usar `datetime.now()` para elegir qué día procesar | Usar `{{ ds }}` o `data_interval_start` |

## Paso 2 — Tareas atómicas

Una tarea hace **una cosa** que se puede reintentar sola. "Descargar, limpiar y cargar" en una sola función obliga a repetir la descarga cuando falla la carga. Tres tareas permiten reintentar solo lo que falló.

## Paso 3 — Nada pesado al cargar el archivo

El dag processor lee cada archivo cada pocos segundos. Todo lo que está **fuera de las tareas** se ejecuta en cada lectura:

```python norun
# ❌ se ejecuta cada vez que se lee el archivo
clientes = requests.get("https://api.tienda.local/clientes").json()
umbral = Variable.get("umbral_alerta")

# ✅ se ejecuta solo cuando corre la tarea
@task
def descargar():
    clientes = requests.get("https://api.tienda.local/clientes").json()
```

## Paso 4 — Airflow orquesta, no procesa

Los workers de Airflow no son para unir 200 millones de filas. El trabajo pesado va donde corresponde y Airflow lo dispara y espera:

| Trabajo | Dónde corre | Cómo lo dispara Airflow |
|---|---|---|
| SQL sobre el data warehouse | Snowflake, BigQuery, Databricks SQL | Operador SQL del provider |
| Spark | Databricks, Dataproc, EMR | `DatabricksRunNowOperator`, etc. |
| Transformaciones con dbt | El warehouse | `BashOperator` con `dbt build` o Cosmos |
| Python liviano (validar, decidir, avisar) | El worker | `@task` |

## Paso 5 — Configuración

```captura
archivo: airflow/a21-config.webp
texto: Airflow Configuration - en Airflow real esta página está desactivada por defecto porque puede mostrar secretos
```

Cualquier opción de `airflow.cfg` se pisa con una variable de entorno `AIRFLOW__SECCION__CLAVE`:

```bash norun
export AIRFLOW__CORE__LOAD_EXAMPLES=False
export AIRFLOW__CORE__PARALLELISM=64
export AIRFLOW__DAG_PROCESSOR__REFRESH_INTERVAL=60
```

## Paso 6 — Lista de revisión de un pull request

```captura
archivo: airflow/a21-details.webp
texto: Details de carga_ventas_tienda - dueño, etiquetas, catchup, start_date fija y límites
```

- [ ] `start_date` fija, `catchup` explícito.
- [ ] `owner` y `tags` definidos; `doc_md` dice qué hace y qué mirar si falla.
- [ ] Tareas idempotentes y atómicas.
- [ ] Nada pesado ni lecturas de variables en el nivel superior.
- [ ] Sin contraseñas en el código: conexiones o secrets backend.
- [ ] Reintentos y alertas de falla.
- [ ] Pasa la prueba de DagBag del CI.

## ✅ Lo que lograste

- Conoces las reglas que hacen operable un Dag.
- Sabes configurar Airflow por variables de entorno.
- Tienes una lista para revisar pull requests.

:::ejercicio quiz
¿Qué significa que una tarea sea idempotente?
- [ ] Que corre muy rápido
- [x] Que correrla dos veces para la misma fecha deja el mismo resultado
- [ ] Que nunca falla
- [ ] Que no tiene código
:::

:::ejercicio quiz
¿Cómo haces idempotente una carga diaria a una tabla?
- [ ] INSERT sin condición
- [x] Borrar la partición de esa fecha antes de insertar, o usar MERGE
- [ ] Insertar dos veces
- [ ] Usar datetime.now()
:::

:::ejercicio quiz
¿Dónde debería correr un join de 200 millones de filas?
- [ ] En el worker de Airflow
- [x] En el warehouse o en Spark, disparado por Airflow
- [ ] En el navegador
- [ ] En el dag processor
:::

:::ejercicio quiz
¿Cómo pisas `[core] parallelism` sin editar airflow.cfg?
- [x] Con la variable de entorno AIRFLOW__CORE__PARALLELISM
- [ ] Con una Variable de Airflow llamada parallelism
- [ ] Con un XCom
- [ ] No se puede
:::
