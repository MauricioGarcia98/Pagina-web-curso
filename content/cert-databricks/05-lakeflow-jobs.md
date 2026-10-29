---
titulo: Orquestar con Lakeflow Jobs
nivel: Avanzado
duracion: 50
resumen: Jobs y tareas, tipos de tarea, dependencias y condiciones Run if, If/else y For each, parámetros y referencias dinámicas, task values, disparadores (programado, llegada de archivos, actualización de tablas, continuo), reintentos, timeouts, notificaciones, repair run, permisos y monitoreo con tablas de sistema.
objetivos: Diseñar un job con tareas, dependencias y condiciones Run if adecuadas | Elegir el disparador correcto para cada escenario | Pasar parámetros y valores entre tareas con referencias dinámicas y task values | Configurar reintentos, timeouts, alertas y ejecutar solo las tareas fallidas con repair run | Monitorear ejecuciones y costos con las tablas de sistema de Lakeflow
prerrequisitos: cert-databricks-transformacion-pipelines | airflow-control-flujo
autoevaluacion: ¿Sabes qué tipos de tarea existen y cuándo usar cada uno? | ¿Puedes explicar las condiciones Run if? | ¿Sabes cuándo usar un disparador de llegada de archivos y cuándo uno de actualización de tablas? | ¿Sabes pasar un valor de una tarea a otra? | ¿Sabes qué hace un repair run?
---

:::escenario
El pipeline de Rápido tiene tres pasos: ingerir (Declarative Pipeline), validar con un notebook que cuenta filas, y refrescar un dashboard. Hoy alguien los ejecuta a mano cada mañana. El jefe pide: que corra solo cuando lleguen los archivos del día, que reintente si falla la red, que avise a Slack si algo sale mal, que si la validación encuentra pocas filas **no** se actualice el dashboard, y que procese en paralelo las 12 ciudades. Todo eso se hace con **Lakeflow Jobs**, el orquestador integrado de Databricks (antes *Workflows*).
:::

## Job, tarea y ejecución

- Un **job** es una unidad de orquestación: un conjunto de **tareas** con dependencias entre ellas (un DAG), más disparadores, parámetros, notificaciones y permisos.
- Una **tarea** es un paso: ejecutar un notebook, un pipeline, una consulta SQL, etc.
- Una **ejecución** (*run*) es cada vez que el job corre; cada tarea tiene su *task run* con su estado.

```diagrama
titulo: El job diario de Rápido
nodo t: Disparador | icono=reloj | col=0 | fila=0 | sub=llegada de archivos
nodo i: ingesta | icono=lakeflow | col=1 | fila=0 | sub=tarea pipeline | color=verde
nodo v: validar | icono=notebook | col=2 | fila=0 | sub=fija task value filas | color=azul
nodo c: ¿filas > 1000? | col=2 | fila=1 | sub=tarea If/else | color=amarillo | forma=rombo | ancho=200
nodo f: por_ciudad | icono=capas | col=3 | fila=0 | sub=For each (12 ciudades) | color=violeta
nodo d: refrescar_dashboard | icono=dashboard | col=3 | fila=1 | sub=Run if: all succeeded | color=cian
nodo a: alerta | icono=alerta | col=1 | fila=1 | sub=Run if: at least one failed | color=rojo
flecha t -> i
flecha i -> v
flecha v -> c
flecha c -> f: true
flecha f -> d
flecha i -> a | estilo=punteada
```

## Tipos de tarea

| Tipo | Para qué |
|---|---|
| **Notebook** | Ejecutar un notebook (Python, SQL, Scala) |
| **Python script** / **Python wheel** / **JAR** | Código empaquetado o en archivos del repositorio |
| **SQL** | Una consulta, un archivo `.sql`, un dashboard o una alerta, en un SQL warehouse |
| **Pipeline** | Una actualización de un pipeline declarativo |
| **dbt** | Comandos de dbt contra un SQL warehouse |
| **Run Job** | Ejecutar **otro job** como tarea (para reutilizar jobs) |
| **If/else condition** | Bifurcar según una comparación (`==`, `!=`, `>`, `>=`, `<`, `<=`) entre valores o referencias |
| **For each** | Ejecutar una tarea anidada una vez por cada elemento de una lista, con concurrencia configurable |
| **Dashboard** | Refrescar un dashboard de AI/BI |

Cada tarea elige su **cómputo**: serverless, un *job cluster* definido en el job (que varias tareas pueden compartir) o un clúster existente (no recomendado en producción).

## Dependencias y condiciones Run if

Por defecto, una tarea corre solo si **todas** sus dependencias terminaron bien. Con **Run if** cambias esa regla:

| Run if | Corre cuando sus dependencias… |
|---|---|
| **All succeeded** (por defecto) | terminaron todas con éxito |
| **At least one succeeded** | al menos una tuvo éxito |
| **None failed** | ninguna falló (alguna puede haberse salteado) |
| **All done** | terminaron todas, con cualquier resultado |
| **At least one failed** | al menos una falló |
| **All failed** | fallaron todas |

Usos típicos: **All done** para limpiar temporales siempre; **At least one failed** para una tarea que avisa o registra el error.

:::examen If/else vs. Run if
**Run if** mira el **estado** de las tareas anteriores (éxito o falla). **If/else** compara **valores** (un parámetro, un task value, una referencia dinámica). "Solo refrescar el dashboard si la validación contó más de 1000 filas" → If/else con un task value. "Avisar si falló cualquier tarea" → Run if *At least one failed*.
:::

## Parámetros, referencias dinámicas y task values

**Parámetros de job**: pares clave-valor definidos a nivel del job que se pasan a **todas** las tareas (en un notebook se leen con `dbutils.widgets.get("fecha")`). Se pueden sobrescribir en cada ejecución manual o por API.

**Referencias dinámicas de valor**: expresiones entre llaves dobles que Databricks reemplaza al ejecutar:

| Referencia | Valor |
|---|---|
| `{{job.id}}`, `{{job.run_id}}` | Id del job y de la ejecución |
| `{{job.start_time.iso_date}}` | Fecha de inicio de la ejecución (`2026-10-29`) |
| `{{job.trigger.type}}` | Cómo se disparó (programado, archivo, tabla…) |
| `{{job.parameters.fecha}}` | El parámetro de job `fecha` |
| `{{tasks.validar.values.filas}}` | El task value `filas` que fijó la tarea `validar` |
| `{{input}}` | El elemento actual dentro de un For each |

**Task values**: así una tarea le pasa un dato chico a las siguientes (parecido al XCom de Airflow):

```python norun
# En la tarea "validar"
filas = spark.table("prod.silver.pedidos").where("dia = current_date()").count()
dbutils.jobs.taskValues.set(key="filas", value=filas)

# En una tarea posterior (o en la condición If/else: {{tasks.validar.values.filas}} > 1000)
filas = dbutils.jobs.taskValues.get(taskKey="validar", key="filas", default=0)
```

### For each

La tarea **For each** recibe una lista (fija, un parámetro o un task value en JSON) y ejecuta su tarea anidada una vez por elemento, con un límite de **concurrencia**. Dentro de la tarea anidada, `{{input}}` es el elemento actual:

```yaml
- task_key: por_ciudad
  depends_on: [{ task_key: decidir }]
  for_each_task:
    inputs: '["Lima", "Cusco", "Arequipa"]'
    concurrency: 3
    task:
      task_key: por_ciudad_iteracion
      notebook_task:
        notebook_path: ../src/procesar_ciudad.py
        base_parameters: { ciudad: "{{input}}" }
```

## Disparadores

| Disparador | Corre cuando… | Ejemplo |
|---|---|---|
| **Programado** | Llega la hora, según una expresión cron de Quartz y una zona horaria | Todos los días a las 06:00 hora de Lima |
| **Llegada de archivos** | Aparecen archivos nuevos en un volumen o ubicación externa de Unity Catalog | Cuando el banco deja el archivo diario |
| **Actualización de tablas** | Se actualizan una o varias tablas (hasta 10), cuando cambia **cualquiera** o **todas** | Refrescar gold cuando terminan de actualizarse dos tablas silver |
| **Continuo** | Siempre: al terminar una ejecución empieza otra | Jobs de streaming que deben estar siempre activos |
| Manual o por API | Alguien lo ejecuta | `databricks jobs run-now` |

:::examen Elegir el disparador
"Los archivos llegan a horas impredecibles y el proceso debe correr apenas lleguen" → **llegada de archivos**, no un cron cada 5 minutos. "Gold debe recalcularse cuando cambien las tablas silver que lee, que vienen de equipos distintos" → **actualización de tablas**. "Un stream debe reiniciarse solo si se cae" → **continuo**.
:::

## Hacerlo confiable

- **Reintentos** por tarea: cantidad, espera entre intentos y si reintenta ante timeout.
- **Timeout** por tarea y por job: corta ejecuciones colgadas.
- **Máximo de ejecuciones concurrentes** del job y **cola** (*queueing*): si llega un disparo mientras otra ejecución corre, espera en vez de descartarse.
- **Reglas de salud**: por ejemplo, avisar si una ejecución dura más de 45 minutos.
- **Notificaciones**: email, Slack, Microsoft Teams, PagerDuty o *webhooks*, al empezar, al terminar bien, al fallar o al superar la duración esperada.
- **Run as**: la identidad con la que corre el job. En producción, un **service principal**, no una persona (si la persona se va, el job sigue funcionando y los permisos son los mínimos).
- **Repair run**: si una ejecución falla en la tarea 4 de 6, *Repair run* vuelve a ejecutar **solo las tareas fallidas y las que dependen de ellas**, reutilizando los resultados de las que terminaron bien. Ahorra tiempo y costo.

### Permisos de un job

| Permiso | Permite |
|---|---|
| CAN VIEW | Ver el job y sus ejecuciones |
| CAN MANAGE RUN | Ejecutar, cancelar y reparar |
| IS OWNER | Dueño (puede todo y se usa para el *run as* por defecto) |
| CAN MANAGE | Editar la definición y los permisos |

## Monitorear

- La interfaz muestra la **vista de matriz** (cada tarea en cada ejecución), duraciones, logs y el enlace a la Spark UI.
- Las tablas de sistema **`system.lakeflow.jobs`**, **`system.lakeflow.job_run_timeline`** y **`system.lakeflow.job_task_run_timeline`** guardan la historia de jobs, ejecuciones y tareas para analizar fallas y duraciones; se cruzan con `system.billing.usage` por `usage_metadata.job_id` para saber cuánto cuesta cada job.

```sql norun
-- Jobs con más ejecuciones fallidas en los últimos 7 días
SELECT job_id, COUNT(*) AS fallas
FROM system.lakeflow.job_run_timeline
WHERE period_start_time >= current_timestamp() - INTERVAL 7 DAYS
  AND result_state = 'FAILED'
GROUP BY job_id
ORDER BY fallas DESC;
```

## Desde la CLI

```bash norun
databricks jobs list                                             # jobs del workspace
databricks jobs run-now 123456                                   # ejecutar ahora
databricks jobs run-now 123456 --json '{"job_parameters": {"fecha": "2026-10-28"}}'
databricks jobs get-run 987654                                   # estado de una ejecución
databricks jobs repair-run 987654 --rerun-all-failed-tasks       # reparar solo lo que falló
```

:::errores
- **Programar un cron cada 5 minutos para "detectar" archivos.** Síntoma: cientos de ejecuciones vacías y costo de arranque. Corrección: disparador de llegada de archivos.
- **Jobs que corren como una persona.** Síntoma: el job falla cuando esa persona cambia de equipo. Corrección: *run as* un service principal.
- **Volver a ejecutar el job entero tras una falla en la última tarea.** Síntoma: doble costo y datos reprocesados. Corrección: repair run.
- **Pasar DataFrames como task values.** Síntoma: error de tamaño. Corrección: los task values son para valores chicos; los datos van en tablas.
:::

:::trabajo Cómo se ve un job sano en producción
Definido en un bundle (siguiente lección), corre como service principal, usa serverless o un job cluster compartido entre tareas, tiene reintentos en las tareas que tocan la red, una tarea de alerta con *At least one failed*, una regla de salud de duración y notificaciones a un canal del equipo. Las fechas de procesamiento llegan como parámetros (`{{job.start_time.iso_date}}`) para poder reprocesar un día pasado sin tocar el código.
:::

:::entrevista
**"¿Lakeflow Jobs o Airflow?"** Si todo el trabajo corre en Databricks, Lakeflow Jobs: está integrado, sin infraestructura extra, con disparadores por archivos y tablas, linaje y costos en las tablas de sistema. Airflow tiene sentido cuando orquestas muchos sistemas fuera de Databricks o la empresa ya lo opera; en ese caso Airflow dispara jobs de Databricks con su operador.
:::

## Ejercicios

:::ejercicio quiz
Una tarea debe borrar archivos temporales al final del job **siempre**, aunque alguna tarea anterior haya fallado. ¿Qué condición Run if le pones?
- [ ] All succeeded
- [ ] None failed
- [x] All done
- [ ] At least one succeeded
```explicacion
All done corre cuando todas las dependencias terminaron, con cualquier resultado. None failed no correría si alguna falló.
```
:::

:::ejercicio quiz
Un proveedor deja un archivo en un volumen de Unity Catalog a una hora distinta cada día. El proceso debe empezar apenas llegue. ¿Qué disparador usas?
- [ ] Programado cada 5 minutos, que revisa si llegó el archivo.
- [x] Llegada de archivos sobre ese volumen.
- [ ] Continuo, para que siempre esté corriendo.
- [ ] Actualización de tablas sobre la tabla bronze.
```explicacion
El disparador de llegada de archivos inicia el job cuando aparecen archivos nuevos, sin ejecuciones vacías. La tabla bronze todavía no cambió cuando llega el archivo: el job es el que la actualiza.
```
:::

:::ejercicio quiz
La tarea `validar` cuenta las filas cargadas. El dashboard solo debe refrescarse si son más de 1000. ¿Cómo lo armas?
- [ ] Con Run if *All succeeded* en la tarea del dashboard.
- [x] `validar` fija un task value `filas` y una tarea If/else compara `{{tasks.validar.values.filas}} > 1000` antes del dashboard.
- [ ] Con un parámetro de job `filas` que el usuario completa cada mañana.
- [ ] Con un reintento en la tarea del dashboard hasta que haya más de 1000 filas.
```explicacion
Run if mira estados, no valores. Para decidir según un dato calculado se usa un task value y una tarea If/else.
```
:::

:::ejercicio quiz
Un job de 6 tareas falló en la quinta por un error de red. ¿Qué es lo más eficiente?
- [ ] Ejecutar el job completo de nuevo.
- [x] Hacer un repair run, que vuelve a ejecutar solo la tarea fallida y las que dependen de ella.
- [ ] Clonar el job y borrar las tareas que ya terminaron.
- [ ] Ejecutar la quinta tarea en un notebook interactivo.
```explicacion
Repair run reutiliza los resultados de las tareas exitosas y ejecuta solo lo que falló y lo que depende de eso.
```
:::

:::ejercicio quiz
La tabla `gold.ventas` debe recalcularse cuando se actualicen **las dos** tablas `silver.pedidos` y `silver.pagos`, que actualizan equipos distintos a horas distintas. ¿Qué disparador usas?
- [ ] Programado a las 23:59.
- [ ] Llegada de archivos en la carpeta de silver.
- [x] Actualización de tablas sobre las dos tablas, con la opción de que se actualicen todas.
- [ ] Continuo.
```explicacion
El disparador de actualización de tablas espera cambios en las tablas indicadas, y puede exigir que cambien todas antes de disparar.
```
:::

:::ejercicio quiz
¿Con qué identidad conviene que corra un job de producción?
- [ ] Con el usuario de quien lo creó, para saber quién es responsable.
- [x] Con un service principal que tenga solo los permisos que el job necesita.
- [ ] Con un usuario administrador del workspace.
- [ ] Con el usuario de la persona de guardia de esa semana.
```explicacion
Un service principal no depende de una persona y permite aplicar permisos mínimos. Un administrador o un usuario personal dan más permisos de los necesarios y rompen el job si la persona cambia.
```
:::

:::ejercicio cli
Repara la ejecución `987654`, volviendo a ejecutar todas las tareas que fallaron.
```respuesta
databricks jobs repair-run 987654 --rerun-all-failed-tasks
```
```salida
{
  "repair_id": 4421
}
```
:::

:::ejercicio abierto
Escribe la definición YAML (formato de bundle) de una tarea For each llamada `por_ciudad` que ejecute el notebook `../src/procesar_ciudad.py` para Lima, Cusco y Arequipa, de a dos en paralelo, pasándole la ciudad como parámetro `ciudad`.
```yaml solucion
- task_key: por_ciudad
  for_each_task:
    inputs: '["Lima", "Cusco", "Arequipa"]'
    concurrency: 2
    task:
      task_key: por_ciudad_iteracion
      notebook_task:
        notebook_path: ../src/procesar_ciudad.py
        base_parameters:
          ciudad: "{{input}}"
```
:::
