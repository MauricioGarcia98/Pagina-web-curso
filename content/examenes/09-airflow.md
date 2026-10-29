# examen: airflow

## Qué es un DAG
leccion: airflow-orquestacion
¿Por qué un DAG no puede tener ciclos?
- [ ] Porque Python no permite que dos objetos se referencien mutuamente.
- [x] Porque con un ciclo no existiría un orden de ejecución posible.
- [ ] Porque Airflow solo admite flujos lineales de hasta 10 tareas.
- [ ] Sí puede tenerlos si se activa la opción `allow_cycles=True`.
porque: "Acíclico" garantiza que siempre existe un orden en que ejecutar todas las tareas respetando sus dependencias.

## Código de nivel superior
leccion: airflow-primer-dag
¿Por qué está mal poner una consulta a la base de datos fuera de las tareas, al nivel superior del archivo del DAG?
- [ ] Porque Airflow no permite importar librerías de bases de datos en los DAGs.
- [x] Porque el archivo se ejecuta cada pocos segundos y la consulta correría sin parar.
- [ ] Porque la consulta nunca se ejecuta: Airflow solo lee las tareas del archivo.
- [ ] No está mal: es la forma recomendada de leer configuración del DAG.
porque: El procesador de DAGs re-ejecuta el archivo seguido. Todo trabajo real debe ir **dentro** de las tareas, que corren solo cuando les toca.

## Intervalo de datos
leccion: airflow-programacion
Un DAG `@daily` con `start_date` 2024-12-01. ¿Cuándo corre la ejecución cuya fecha lógica es el 1 de diciembre?
- [ ] El 1 de diciembre a las 00:00, al comenzar el día.
- [x] El 2 de diciembre a las 00:00.
- [ ] El 30 de noviembre a las 00:00, un día antes.
- [ ] Apenas se activa el DAG, sin importar la fecha.
porque: Airflow ejecuta al **final** del intervalo de datos: los datos del 1 de diciembre están completos recién cuando termina ese día.

## catchup
leccion: airflow-programacion
Activas hoy un DAG diario con `start_date` de hace 6 meses y `catchup=True`. ¿Qué pasa?
- [ ] Corre solo la ejecución de hoy, porque las anteriores ya vencieron.
- [x] Crea una ejecución por cada día pendiente: unas 180.
- [ ] El DAG no se puede activar con una fecha de inicio en el pasado.
- [ ] Corre una única ejecución que procesa los 6 meses juntos.
porque: Con `catchup=True` el scheduler "se pone al día" con todos los intervalos pendientes. Si no lo quieres, usa `catchup=False`.

## Idempotencia
leccion: airflow-buenas-practicas
Una tarea carga los pedidos del día con `INSERT INTO ventas SELECT ... WHERE fecha = '{{ ds }}'`. Falla a la mitad y Airflow la reintenta. ¿Qué problema puede haber?
- [ ] Ninguno, porque Airflow revierte lo insertado cuando una tarea falla.
- [x] Filas duplicadas: lo insertado antes del fallo se vuelve a insertar.
- [ ] La tarea no se puede reintentar porque usa una plantilla Jinja.
- [ ] `{{ ds }}` cambia en el reintento y se cargan los pedidos de otro día.
porque: Una tarea **idempotente** deja el mismo resultado se ejecute una o diez veces. "Borrar el día y reinsertar" (o MERGE por clave) lo logra.

## Plantillas
leccion: airflow-operadores-plantillas
¿Por qué usar `{{ ds }}` en vez de `datetime.now()` para elegir qué día procesar?
- [ ] Porque `datetime.now()` no se puede importar dentro de un DAG.
- [x] Porque `ds` es la fecha lógica: los reintentos y backfills procesan el día correcto.
- [ ] Porque `{{ ds }}` se calcula más rápido que `datetime.now()`.
- [ ] Porque `ds` incluye la hora exacta y `now()` solo devuelve la fecha.
porque: Con `now()`, re-ejecutar una fecha pasada procesaría "hoy". La fecha lógica hace reproducibles los reintentos y backfills.

## XCom
leccion: airflow-xcom-taskflow
Una tarea genera un DataFrame de 3 millones de filas que la siguiente necesita. ¿Cómo debería pasárselo?
- [ ] Devolver el DataFrame desde la tarea para que viaje automáticamente por XCom.
- [x] Guardar los datos en el lago y pasar por XCom solo la ruta.
- [ ] Guardarlo en una variable global del archivo del DAG.
- [ ] Imprimirlo en el log y que la siguiente tarea lo lea de ahí.
porque: XCom vive en la base de metadatos de Airflow y está pensado para valores **chicos**. Cada tarea puede correr en otro worker, así que las variables globales no sirven.

## Trigger rules
leccion: airflow-control-flujo
Quieres una tarea que borre archivos temporales **siempre**, aunque alguna tarea anterior haya fallado. ¿Qué trigger rule usas?
- [ ] `all_success`
- [x] `all_done`
- [ ] `one_success`
- [ ] `none_failed`
porque: `all_done` corre cuando todas las anteriores terminaron, con cualquier estado. La regla por defecto, `all_success`, no correría si algo falló.

## Sensores
leccion: airflow-control-flujo
¿Por qué conviene `mode="reschedule"` (o un sensor *deferrable*) para un sensor que puede esperar horas un archivo?
- [ ] Porque revisa la condición con más frecuencia que el modo `poke`.
- [x] Porque libera el worker entre chequeos.
- [ ] Porque así el sensor no necesita un `timeout` configurado.
- [ ] Porque el modo `poke` dejó de existir en Airflow 2.
porque: En modo `poke`, el sensor ocupa un slot de worker mientras espera. Con muchos sensores, se bloquea todo el Airflow.

## Connections
leccion: airflow-buenas-practicas
¿Dónde deberían estar la contraseña y el host de la base que usa un DAG?
- [ ] Escritos en el código del DAG, para que cada DAG tenga sus propias credenciales.
- [x] En una Connection de Airflow, referenciada por su `conn_id`.
- [ ] En un comentario al inicio del archivo, para que el equipo las encuentre.
- [ ] En una Variable de Airflow en texto plano, visible para todos.
porque: Las Connections separan las credenciales del código, se cifran en la metabase o se leen desde Secrets Manager o Key Vault, y se cambian sin tocar los DAGs.

## Orquestar, no procesar
leccion: airflow-airflow-databricks-dbt
En un pipeline Airflow + Databricks + dbt, ¿dónde debería ocurrir la transformación pesada de 500 GB?
- [ ] En un `PythonOperator` que carga los datos con pandas en el worker.
- [x] En Databricks o en el warehouse; Airflow solo dispara y vigila.
- [ ] En el scheduler de Airflow, que tiene acceso a todos los workers.
- [ ] En XCom, que puede guardar resultados intermedios de cualquier tamaño.
porque: Airflow es el **director** de orquesta. Hacer el trabajo pesado en sus workers lo satura y no escala.
