---
titulo: Airflow en producción - zombies, OOM, pools y DAGs que desaparecen
nivel: Avanzado
duracion: 60
resumen: Los fallos operativos de Airflow que más se repiten - errores de importación que hacen desaparecer un DAG, tareas zombie por workers que se quedan sin memoria (SIGKILL), pools sin slots, catchup que crea cientos de ejecuciones, timeouts y reglas de disparo. Diagnóstico con los logs del scheduler y del worker, y con SQL sobre la base de metadatos.
objetivos: Encontrar en el log del scheduler un error de importación y su causa | Explicar por qué aparece una tarea zombie y relacionarla con un OOM del worker | Detectar con SQL las tareas que más fallan, las que están colgadas y las que se volvieron lentas | Medir el tiempo en cola para diagnosticar pools saturados | Configurar reintentos, timeouts y catchup sin sorpresas
prerrequisitos: incidentes-datos-tardios-y-backfills
autoevaluacion: ¿Sabes por qué un DAG puede desaparecer de la interfaz? | ¿Sabes qué es una tarea zombie y qué la causa? | ¿Sabes qué significa "Task exited with return code Negsignal.SIGKILL"? | ¿Sabes consultar la base de metadatos de Airflow? | ¿Sabes qué hace catchup y cuándo es peligroso?
---

:::escenario
Lunes, 07:30. Finanzas avisa que el DAG `finanzas_cierre` **no aparece** en Airflow. `ml_features` falló tres noches seguidas con un mensaje que nadie entiende ("Detected zombie job"). Y desde las 02:00 las tareas pasan media hora en cola antes de empezar. Tres problemas distintos que se ven como uno solo: "Airflow anda mal".
:::

## Cómo funciona Airflow (lo justo para depurarlo)

```diagrama
titulo: Las piezas de Airflow que intervienen en un fallo
nodo dags: Carpeta dags/ | icono=carpeta | col=0 | fila=0 | sub=archivos .py
nodo dp: DAG processor | icono=engranaje | col=1 | fila=0 | sub=importa cada archivo
nodo sch: Scheduler | icono=orquestador | col=2 | fila=0 | sub=crea ejecuciones, encola tareas
nodo db: Base de metadatos | icono=postgres | col=2 | fila=1 | forma=cilindro | sub=dag_run, task_instance
nodo w: Workers | icono=servidor | col=3 | fila=0 | sub=ejecutan las tareas
nodo tr: Triggerer | icono=reloj | col=3 | fila=1 | sub=esperas asíncronas
flecha dags -> dp: paso=1 | explica=El DAG processor importa cada archivo de la carpeta dags/. Si el import falla, el DAG no se registra.
flecha dp -> db: paso=2 | explica=Los DAGs que se importaron bien quedan serializados en la base de metadatos.
flecha sch -> db: paso=3 | explica=El scheduler lee la base, crea las ejecuciones (dag_run) y decide qué tareas están listas.
flecha sch -> w: encola | paso=4 | explica=Las tareas listas se encolan y un worker las toma, si hay slots libres en su pool.
flecha w -> db: heartbeat | estilo=punteada | paso=5 | explica=Mientras corre, la tarea manda señales de vida (heartbeats). Si dejan de llegar, el scheduler la declara zombie.
flecha sch -> tr: sensores diferidos | estilo=punteada | paso=6 | explica=Los sensores deferrable esperan en el triggerer sin ocupar workers.
```

## Los cinco fallos más comunes

| Síntoma | Causa típica | Dónde se ve |
|---|---|---|
| El DAG **no aparece** o aparece con un banner rojo | Error de importación: falta un paquete, error de sintaxis, una variable que no existe en el import | Log del DAG processor / scheduler: `Failed to import`; `airflow dags list-import-errors` |
| **"Detected zombie job"** | El proceso de la tarea murió sin avisar: el sistema lo mató por memoria (OOM), el worker se reinició o el pod se desalojó | Log del scheduler + log del worker: `Negsignal.SIGKILL`, `Out of memory: Killed process` |
| Tareas en **cola** mucho tiempo | Pool sin slots, `parallelism` o `max_active_tasks` al límite, sensores en modo poke ocupando slots | `Pool default_pool has 0 open slots` |
| **Cientos de ejecuciones** de golpe | `catchup=True` con un `start_date` viejo al activar o reactivar el DAG | La grilla llena de ejecuciones en cola |
| Tarea `upstream_failed` o `skipped` | Una tarea anterior falló y la regla de disparo (`trigger_rule`) es `all_success` | `Dependencies not met` |

:::cuidado Un SIGKILL no se ve en el log de la tarea
Cuando el kernel de Linux mata un proceso por falta de memoria (el *OOM killer*), lo hace con `SIGKILL`: el proceso no alcanza a escribir nada. El log de la tarea termina de golpe y el scheduler, que deja de recibir heartbeats, lo declara **zombie**. La evidencia del OOM está en el log del **worker** o del sistema (`dmesg`, eventos del pod en Kubernetes: `OOMKilled`).
:::

## Reintentos y timeouts: la configuración que evita sorpresas

```python norun
default_args = {
    "retries": 3,
    "retry_delay": timedelta(minutes=5),
    "retry_exponential_backoff": True,      # 5, 10, 20 minutos: no martilla un sistema caído
    "max_retry_delay": timedelta(minutes=30),
    "execution_timeout": timedelta(hours=1), # cada intento; sin esto, una tarea colgada ocupa un slot para siempre
    "on_failure_callback": avisar_guardia,   # alerta con el enlace al log
}
```

Los reintentos solo ayudan con fallos **transitorios** (un corte de red, un 503). Un error de datos o de código falla igual en el intento 3, y si la tarea no es idempotente, cada reintento puede empeorar las cosas (lección 3).

## La base de metadatos es tu mejor herramienta

Todo lo que ves en la interfaz de Airflow está en tablas: `dag_run` (cada ejecución de un DAG) y `task_instance` (cada intento de cada tarea, con `state`, `try_number`, `queued_dttm`, `start_date`, `end_date`, `duration`). Con SQL respondes en segundos preguntas que en la interfaz llevan una hora de clics: qué tareas fallan más, cuáles se volvieron lentas, cuánto esperan en cola.

## Práctica

:::ejercicio cli dificultad=Básico titulo="Preparar el incidente"
Prepara los archivos del incidente `airflow`.
```respuesta
incidente-preparar airflow
```
:::

:::ejercicio cli dificultad=Intermedio titulo="¿Por qué desapareció el DAG?"
Busca en `~/incidentes/airflow/logs/scheduler.log` la línea `Failed to import` **y la línea siguiente** (la excepción), con la opción de contexto de `grep`.
```setup
incidente-preparar airflow
```
```respuesta
grep -A ?1 ['"]?Failed to import['"]? \S*scheduler\.log
grep -A ?1 ['"]?Failed['"]? \S*scheduler\.log
grep -A ?2 ['"]?Failed to import['"]? \S*scheduler\.log
```
```solucion
grep -A1 "Failed to import" ~/incidentes/airflow/logs/scheduler.log
```
```pista
`grep -A N` muestra también las N líneas siguientes a cada coincidencia (A de *after*). `-B N` muestra las anteriores.
```
:::

:::ejercicio quiz dificultad=Intermedio
El log dice `ModuleNotFoundError: No module named 'pandas_gbq'` al importar `finanzas_cierre.py`. ¿Qué haces?

- [ ] Instalar el paquete a mano con `pip install` dentro del worker que está corriendo
- [x] Agregar el paquete (con versión fija) a la imagen o a los requirements del entorno, desplegar, y agregar al CI una prueba que importe todos los DAGs
- [ ] Borrar el DAG y crearlo de nuevo desde la interfaz
- [ ] Reiniciar el scheduler hasta que aparezca
:::

:::ejercicio cli dificultad=Básico titulo="Contar los zombies"
Cuenta cuántas veces aparece `zombie` en el log del scheduler.
```setup
incidente-preparar airflow
```
```respuesta
grep -ci? ['"]?zombie['"]? \S*scheduler\.log
grep -i?c ['"]?zombie['"]? \S*scheduler\.log
grep( -i)? ['"]?zombie['"]? \S*scheduler\.log \| wc -l
```
```solucion
grep -c zombie ~/incidentes/airflow/logs/scheduler.log
```
```pista
`grep -c palabra archivo`.
```
:::

:::ejercicio cli dificultad=Intermedio titulo="La causa del zombie"
Los zombies son de `ml_features.construir_features`, en `airflow-worker-2`. En `~/incidentes/airflow/logs/worker-2.log`, muestra la línea que contiene `SIGKILL` **con la línea anterior**.
```setup
incidente-preparar airflow
```
```respuesta
grep -B ?1 ['"]?SIGKILL['"]? \S*worker-2\.log
grep -B ?2 ['"]?SIGKILL['"]? \S*worker-2\.log
grep -C ?1 ['"]?SIGKILL['"]? \S*worker-2\.log
```
```solucion
grep -B1 SIGKILL ~/incidentes/airflow/logs/worker-2.log
```
```pista
`-B 1` muestra una línea antes de cada coincidencia (B de *before*).
```
```explicacion
La tarea leyó 38 millones de filas en un DataFrame de pandas y el sistema mató el proceso por memoria (la línea siguiente del log es del kernel: `Out of memory: Killed process`).
```
:::

:::ejercicio quiz dificultad=Avanzado
¿Cuál es la corrección de fondo para los zombies de `construir_features`?

- [ ] Subir el timeout de heartbeat del scheduler
- [ ] Agregar más reintentos a la tarea
- [x] No traer 38 millones de filas a la memoria del worker: calcular las features en el warehouse o en Spark, o procesar en lotes (chunks); y si hace falta, una cola de workers con más memoria
- [ ] Marcar la tarea como success a mano cada mañana
:::

:::ejercicio quiz dificultad=Avanzado
Abre `~/incidentes/airflow/dags/clicks_horario.py`. Un compañero lo pausó por un mantenimiento y lo va a reactivar hoy. ¿Qué va a pasar?

- [ ] Nada: el DAG sigue desde la hora actual
- [x] Con `catchup=True` y `start_date` en 2025, el scheduler crea una ejecución por cada hora pendiente, hasta 64 a la vez, cada una con un sensor en modo poke de hasta 24 h que ocupa un slot
- [ ] Airflow rechaza el DAG porque el sensor tiene un timeout de 24 h
- [ ] Solo se ejecuta la última hora pendiente
:::

:::ejercicio sql ordenado dificultad=Intermedio titulo="¿Qué tareas fallan más?"
`task_instance` es una copia simplificada de la tabla de metadatos de Airflow (`dag_id`, `task_id`, `dia`, `state`, `try_number`, `queued_dttm`, `start_date`, `end_date`, `duration` en segundos). Devuelve las tareas con al menos un fallo (`state = 'failed'`) en los últimos 7 días (`dia >= '2026-10-23'`): `dag_id`, `task_id`, `fallos`, de más a menos fallos.
```sql setup
CREATE TABLE task_instance (dag_id TEXT, task_id TEXT, dia TEXT, state TEXT, try_number INTEGER, queued_dttm TEXT, start_date TEXT, end_date TEXT, duration REAL);
WITH RECURSIVE d(n) AS (SELECT 0 UNION ALL SELECT n + 1 FROM d WHERE n < 13),
t(dag_id, task_id, base_s, h) AS (VALUES ('ventas_diarias', 'erp_extract', 380, 3), ('ventas_diarias', 'fct_ventas_diarias', 95, 3), ('clientes_scd2', 'merge_scd2', 610, 2), ('ml_features', 'construir_features', 1500, 4), ('finanzas_cierre', 'conciliar', 240, 5), ('reportes_gerencia', 'exportar_pdf', 60, 6))
INSERT INTO task_instance (dag_id, task_id, dia, state, try_number, queued_dttm, start_date, duration)
SELECT dag_id, task_id, date('2026-10-16', '+' || n || ' days'),
       CASE WHEN task_id = 'construir_features' AND n >= 11 THEN 'failed'
            WHEN task_id = 'conciliar' AND n % 4 = 1 THEN 'failed'
            WHEN task_id = 'exportar_pdf' AND n = 12 THEN 'up_for_retry' ELSE 'success' END,
       CASE WHEN task_id = 'conciliar' AND n % 4 = 1 THEN 3 ELSE 1 END,
       datetime(date('2026-10-16', '+' || n || ' days'), '+' || h || ' hours'),
       datetime(date('2026-10-16', '+' || n || ' days'), '+' || h || ' hours', '+' || CASE WHEN n >= 11 AND h BETWEEN 2 AND 4 THEN 1500 ELSE 20 END || ' seconds'),
       base_s * CASE WHEN task_id = 'merge_scd2' AND n >= 10 THEN 3.4 ELSE 1 + (n % 3) * 0.05 END
FROM d, t;
UPDATE task_instance SET end_date = datetime(start_date, '+' || CAST(duration AS INTEGER) || ' seconds');
INSERT INTO task_instance VALUES ('ml_features', 'construir_features', '2026-10-29', 'running', 2, '2026-10-29 04:10:40', '2026-10-29 04:11:02', NULL, NULL);
```
```sql solucion
SELECT dag_id, task_id, COUNT(*) AS fallos
FROM task_instance
WHERE state = 'failed' AND dia >= '2026-10-23'
GROUP BY dag_id, task_id
ORDER BY fallos DESC;
```
```pista
Filtra `state = 'failed'` y la fecha, agrupa por `dag_id, task_id` y ordena por el conteo.
```
:::

:::ejercicio sql dificultad=Avanzado titulo="Tareas colgadas"
Son las `2026-10-29 07:30`. Devuelve las tareas en estado `running` que empezaron hace **más de 3 horas**: `dag_id`, `task_id`, `start_date` y `horas` corriendo (1 decimal).
```sql setup
CREATE TABLE task_instance (dag_id TEXT, task_id TEXT, dia TEXT, state TEXT, try_number INTEGER, queued_dttm TEXT, start_date TEXT, end_date TEXT, duration REAL);
INSERT INTO task_instance VALUES
('ml_features', 'construir_features', '2026-10-29', 'running', 2, '2026-10-29 04:10:40', '2026-10-29 04:11:02', NULL, NULL),
('ventas_diarias', 'erp_extract', '2026-10-29', 'running', 1, '2026-10-29 06:59:50', '2026-10-29 07:00:10', NULL, NULL),
('finanzas_cierre', 'conciliar', '2026-10-28', 'running', 1, '2026-10-28 23:58:00', '2026-10-28 23:59:12', NULL, NULL),
('reportes_gerencia', 'exportar_pdf', '2026-10-29', 'success', 1, '2026-10-29 01:00:00', '2026-10-29 01:00:05', '2026-10-29 01:01:05', 60);
```
```sql solucion
SELECT dag_id, task_id, start_date,
       ROUND((julianday('2026-10-29 07:30') - julianday(start_date)) * 24, 1) AS horas
FROM task_instance
WHERE state = 'running' AND (julianday('2026-10-29 07:30') - julianday(start_date)) * 24 > 3;
```
```pista
Filtra `state = 'running'` y calcula las horas con `julianday`.
```
```explicacion
Una tarea `running` sin `execution_timeout` puede quedar así días si su proceso murió y el estado no se actualizó, ocupando un slot. `conciliar` lleva 7,5 horas: es el cierre de Finanzas, y es el primero que hay que mirar.
```
:::

:::ejercicio sql ordenado dificultad=Avanzado titulo="Tareas que se volvieron lentas"
Compara la duración media de cada tarea en los últimos 4 días (`dia >= '2026-10-26'`) contra la de los días anteriores, solo con intentos en `success`. Devuelve `task_id`, `antes_s`, `ahora_s` (enteros) y `ratio` (2 decimales) de las tareas con ratio mayor a 2, de mayor a menor ratio.
```sql setup
CREATE TABLE task_instance (dag_id TEXT, task_id TEXT, dia TEXT, state TEXT, try_number INTEGER, queued_dttm TEXT, start_date TEXT, end_date TEXT, duration REAL);
WITH RECURSIVE d(n) AS (SELECT 0 UNION ALL SELECT n + 1 FROM d WHERE n < 13),
t(dag_id, task_id, base_s, h) AS (VALUES ('ventas_diarias', 'erp_extract', 380, 3), ('ventas_diarias', 'fct_ventas_diarias', 95, 3), ('clientes_scd2', 'merge_scd2', 610, 2), ('ml_features', 'construir_features', 1500, 4), ('finanzas_cierre', 'conciliar', 240, 5), ('reportes_gerencia', 'exportar_pdf', 60, 6))
INSERT INTO task_instance (dag_id, task_id, dia, state, try_number, queued_dttm, start_date, duration)
SELECT dag_id, task_id, date('2026-10-16', '+' || n || ' days'),
       CASE WHEN task_id = 'construir_features' AND n >= 11 THEN 'failed'
            WHEN task_id = 'conciliar' AND n % 4 = 1 THEN 'failed'
            WHEN task_id = 'exportar_pdf' AND n = 12 THEN 'up_for_retry' ELSE 'success' END,
       CASE WHEN task_id = 'conciliar' AND n % 4 = 1 THEN 3 ELSE 1 END,
       datetime(date('2026-10-16', '+' || n || ' days'), '+' || h || ' hours'),
       datetime(date('2026-10-16', '+' || n || ' days'), '+' || h || ' hours', '+' || CASE WHEN n >= 11 AND h BETWEEN 2 AND 4 THEN 1500 ELSE 20 END || ' seconds'),
       base_s * CASE WHEN task_id = 'merge_scd2' AND n >= 10 THEN 3.4 ELSE 1 + (n % 3) * 0.05 END
FROM d, t;
```
```sql solucion
WITH m AS (
  SELECT task_id,
         AVG(CASE WHEN dia < '2026-10-26' THEN duration END) AS antes,
         AVG(CASE WHEN dia >= '2026-10-26' THEN duration END) AS ahora
  FROM task_instance
  WHERE state = 'success'
  GROUP BY task_id
)
SELECT task_id, ROUND(antes) AS antes_s, ROUND(ahora) AS ahora_s, ROUND(ahora / antes, 2) AS ratio
FROM m
WHERE ahora / antes > 2
ORDER BY ratio DESC;
```
```pista
Agregación condicional: `AVG(CASE WHEN dia < '2026-10-26' THEN duration END)` ignora las filas que no cumplen (el `CASE` da NULL y `AVG` no cuenta los NULL).
```
```explicacion
`merge_scd2` tarda 3,3 veces más desde el 26/10. Una regresión de duración casi siempre tiene una causa concreta: la tabla creció, se perdió un filtro de partición, un join cambió, el warehouse está saturado. Detectarla antes de que la tarea empiece a vencer su timeout es mantenimiento preventivo.
```
:::

:::ejercicio sql ordenado dificultad=Avanzado titulo="¿A qué hora se satura la cola?"
Para los días `2026-10-27` en adelante, calcula la espera media en cola (de `queued_dttm` a `start_date`, en segundos, entero) por **hora** de encolado (`strftime('%H', queued_dttm)`). Columnas `hora` y `espera_s`, ordenadas por hora.
```sql setup
CREATE TABLE task_instance (dag_id TEXT, task_id TEXT, dia TEXT, state TEXT, try_number INTEGER, queued_dttm TEXT, start_date TEXT, end_date TEXT, duration REAL);
WITH RECURSIVE d(n) AS (SELECT 0 UNION ALL SELECT n + 1 FROM d WHERE n < 13),
t(dag_id, task_id, base_s, h) AS (VALUES ('ventas_diarias', 'erp_extract', 380, 3), ('ventas_diarias', 'fct_ventas_diarias', 95, 3), ('clientes_scd2', 'merge_scd2', 610, 2), ('ml_features', 'construir_features', 1500, 4), ('finanzas_cierre', 'conciliar', 240, 5), ('reportes_gerencia', 'exportar_pdf', 60, 6))
INSERT INTO task_instance (dag_id, task_id, dia, state, try_number, queued_dttm, start_date, duration)
SELECT dag_id, task_id, date('2026-10-16', '+' || n || ' days'),
       CASE WHEN task_id = 'construir_features' AND n >= 11 THEN 'failed'
            WHEN task_id = 'conciliar' AND n % 4 = 1 THEN 'failed'
            WHEN task_id = 'exportar_pdf' AND n = 12 THEN 'up_for_retry' ELSE 'success' END,
       CASE WHEN task_id = 'conciliar' AND n % 4 = 1 THEN 3 ELSE 1 END,
       datetime(date('2026-10-16', '+' || n || ' days'), '+' || h || ' hours'),
       datetime(date('2026-10-16', '+' || n || ' days'), '+' || h || ' hours', '+' || CASE WHEN n >= 11 AND h BETWEEN 2 AND 4 THEN 1500 ELSE 20 END || ' seconds'),
       base_s * CASE WHEN task_id = 'merge_scd2' AND n >= 10 THEN 3.4 ELSE 1 + (n % 3) * 0.05 END
FROM d, t;
```
```sql solucion
SELECT strftime('%H', queued_dttm) AS hora,
       CAST(ROUND(AVG((julianday(start_date) - julianday(queued_dttm)) * 86400)) AS INTEGER) AS espera_s
FROM task_instance
WHERE dia >= '2026-10-27'
GROUP BY hora
ORDER BY hora;
```
```pista
La espera en segundos es `(julianday(start_date) - julianday(queued_dttm)) * 86400`.
```
```explicacion
Entre las 02:00 y las 04:00 las tareas esperan 25 minutos en cola; el resto del día, 20 segundos. Es la ventana en que conviven los sensores en modo poke y los DAGs pesados de la madrugada. Las soluciones: sensores `deferrable`, pools separados para las tareas críticas o mover horarios.
```
:::

:::ejercicio quiz dificultad=Intermedio
Una tarea llama a una API que a veces responde 503 durante unos minutos. ¿Qué configuración de reintentos es la adecuada?

- [ ] `retries=0`: si falla, que lo vea la guardia
- [ ] `retries=50` con `retry_delay` de 1 segundo
- [x] `retries=3` con `retry_exponential_backoff=True` y un `max_retry_delay`, en una tarea idempotente
- [ ] Un bucle `while True` dentro de la tarea hasta que responda
:::

:::ejercicio quiz dificultad=Intermedio
¿Qué diferencia hay entre `execution_timeout` y el `timeout` de un sensor?

- [ ] Son sinónimos
- [x] `execution_timeout` limita cada intento de cualquier tarea y permite reintentar; el `timeout` del sensor limita la espera total y al vencerse no reintenta (AirflowSensorTimeout)
- [ ] `execution_timeout` solo existe en sensores
- [ ] El `timeout` del sensor se mide en número de pokes
:::

:::errores
- **Código pesado en el nivel superior del archivo del DAG**: una consulta a la base o una llamada a una API fuera de las tareas se ejecuta cada vez que se importa el archivo (cada pocos segundos) y vuelve lento o rompe el DAG processor.
- **Procesar datos grandes dentro del worker**: Airflow orquesta; el trabajo pesado va al warehouse, a Spark o a un contenedor dimensionado para eso.
- **Sin `execution_timeout`**: una tarea colgada ocupa un slot indefinidamente.
- **Reactivar un DAG con `catchup=True` sin pensar**: cientos de ejecuciones de golpe. Usa `catchup=False` salvo que el DAG esté diseñado para backfills.
- **Instalar paquetes a mano en un worker**: el próximo reinicio lo borra y los workers quedan distintos entre sí.
:::

:::trabajo
- En el CI de los DAGs se corre una prueba que **importa todos los archivos** (con `DagBag` o `airflow dags list-import-errors`) y falla si hay errores: así un `ModuleNotFoundError` nunca llega a producción.
- Las tareas pesadas usan `KubernetesPodOperator` o colas de workers separadas (`queue="alta_memoria"`) con recursos acordes.
- Los **pools** separan la capacidad: un pool chico para la API que limita las conexiones, uno reservado para lo crítico.
- Los equipos miran tableros con las métricas de Airflow (StatsD o OpenTelemetry): tareas en cola, slots libres, duración del parseo de DAGs, zombies por hora.
- En servicios administrados (MWAA, Cloud Composer, Astronomer) los logs del scheduler y de los workers están en CloudWatch, Cloud Logging o la consola del proveedor.
:::

:::entrevista
**"Una tarea de Airflow falla con 'Detected zombie job'. ¿Qué investigas?"** Explica que el scheduler dejó de recibir heartbeats porque el proceso murió; buscas en el log del worker o en los eventos del pod un `SIGKILL` u `OOMKilled`; revisas cuánta memoria usa la tarea y por qué (datos traídos a memoria); y corriges moviendo el cómputo, procesando en lotes o asignando una cola con más recursos. Subir el timeout del heartbeat solo esconde el problema.
:::

## Resumen

| Síntoma | Primer lugar donde mirar |
|---|---|
| DAG desaparecido | `Failed to import` en el log del scheduler / DAG processor |
| Zombie | Log del worker: SIGKILL, OOM, reinicios |
| Mucha espera en cola | Slots de los pools, sensores en poke, `parallelism` |
| Duraciones que crecen | `task_instance.duration` en el tiempo |
| Avalancha de ejecuciones | `catchup` y `start_date` |
