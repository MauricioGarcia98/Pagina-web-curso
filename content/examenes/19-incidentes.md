# examen: incidentes

## Verde no es correcto
leccion: incidentes-primera-guardia
Todas las tareas de un DAG están en SUCCESS, pero el tablero no tiene los datos de ayer. ¿Qué miras primero?
- [ ] La configuración del scheduler y los pools de Airflow del entorno.
- [x] Los WARNING del log y las filas que cargó cada tarea.
- [ ] El historial de deploys del tablero de BI.
- [ ] La cantidad de workers que había disponibles durante la noche.
porque: SUCCESS solo significa que el código no lanzó una excepción. El log suele decir "0 filas" o "se continúa con un lote vacío", y el volumen de la carga lo confirma.

## Alertas ruidosas
leccion: incidentes-monitoreo-y-checks
Una alerta suena 20 veces al mes y siempre se resuelve sola en minutos. ¿Qué haces?
- [ ] La subes a SEV1 para que alguien la atienda.
- [ ] La dejas igual: más alertas siempre es más seguridad para el equipo.
- [x] Subes el umbral o la duración, o la bajas a un ticket.
- [ ] La borras sin avisar al dueño del sistema.
porque: Una alerta que no lleva a ninguna acción genera fatiga y hace que la guardia ignore las que importan. Se ajusta con el dueño.

## El commit fantasma
leccion: incidentes-duplicados-e-idempotencia
Un intento falla por timeout después de que el COMMIT se aplicó, y el reintento vuelve a insertar. ¿Qué lo habría evitado?
- [ ] Desactivar los reintentos de la tarea en el DAG de producción.
- [x] Reemplazar la partición o hacer MERGE por clave.
- [ ] Subir el `execution_timeout` de la tarea a 24 horas o más.
- [ ] Agregar `DISTINCT` en el tablero.
porque: Una carga idempotente deja el mismo resultado sin importar cuántas veces corra. Los reintentos son inevitables; el append es lo que duplica.

## Una columna renombrada
leccion: incidentes-cambios-de-esquema
El origen renombró `amount` a `amount_cents` y el lector está en modo PERMISSIVE. ¿Qué pasa?
- [ ] El job falla con un error de esquema.
- [x] `amount` llega NULL y el job termina bien.
- [ ] Spark detecta el renombre por el tipo de dato y migra los valores.
- [ ] Los montos se cargan multiplicados por 100.
porque: PERMISSIVE completa con NULL lo que no encuentra y sigue. Por eso hace falta un check de nulos por carga o un contrato que falle rápido.

## La marca de agua
leccion: incidentes-datos-tardios-y-backfills
Una carga incremental lee `WHERE evento_ts > max(evento_ts)` del destino. ¿Qué datos pierde?
- [ ] Los eventos duplicados del origen.
- [ ] Los eventos de la última hora de cada ejecución del job.
- [x] Los que llegan tarde con una hora del evento vieja.
- [ ] Ninguno, si la carga corre cada hora y nunca se saltea una ejecución.
porque: Un evento que llega después de que la marca de agua lo pasó nunca se lee. Se usa la hora de ingesta o una ventana de relectura con MERGE.

## Zombies
leccion: incidentes-airflow-en-produccion
El scheduler dice "Detected zombie job" y el log del worker muestra `Negsignal.SIGKILL`. ¿Qué pasó?
- [ ] La tarea terminó bien pero no avisó al scheduler a tiempo.
- [x] El sistema mató el proceso, típicamente por memoria.
- [ ] El DAG tiene un error de importación.
- [ ] El pool de la tarea no tenía slots.
porque: Un SIGKILL (por ejemplo, del OOM killer) mata el proceso sin que pueda escribir nada; el scheduler deja de recibir heartbeats y lo declara zombie.

## Skew
leccion: incidentes-spark-skew-memoria-archivos
199 tareas de un stage tardan 50 s y una tarda 45 minutos con 9 GB de shuffle. ¿Qué haces primero?
- [ ] Duplicar la memoria de todos los executors.
- [ ] Subir `spark.sql.shuffle.partitions` a 5.000 para repartir más.
- [x] Buscar la clave caliente con un `groupBy().count()`.
- [ ] Reiniciar el clúster completo y volver a correr el job desde cero.
porque: Es skew: una clave concentra las filas. Si es un valor basura (0, NULL) se separa; si no, AQE skew join, broadcast o salting.

## Cambio de horario
leccion: incidentes-zonas-horarias-y-codificacion
Una tabla usa la clave `(sensor_id, ts_local)` en Nueva York. ¿Qué pasa el día que el reloj se atrasa?
- [x] La hora repetida choca y se pierden o pisan lecturas.
- [ ] Falta una hora completa de lecturas de cada sensor ese día.
- [ ] Las lecturas se guardan con un día de diferencia.
- [ ] No pasa nada si la base está en UTC.
porque: Entre la 01:00 y las 02:00 locales hay dos lecturas por sensor con la misma hora local. La clave debería estar en UTC o incluir el desplazamiento.

## Mensaje venenoso
leccion: incidentes-kafka-y-streaming
Una partición de Kafka no avanza y el log muestra el mismo offset fallando una y otra vez. ¿Qué haces?
- [ ] Reiniciar los consumidores del grupo hasta que logren leerlo.
- [x] Mandar el mensaje a una DLQ y confirmar el offset.
- [ ] Subir `max.poll.records` para leer más rápido.
- [ ] Borrar el topic y volver a crearlo.
porque: Un mensaje que no se puede procesar traba su partición porque el consumidor nunca confirma el offset. La DLQ guarda el mensaje con el error para reprocesarlo después.

## RESTORE que falla
leccion: incidentes-lakehouse-delta-restore
`RESTORE TABLE … TO VERSION AS OF 40` falla con archivo no encontrado. ¿Cuál es la causa más probable?
- [ ] La versión 40 fue un MERGE.
- [ ] Faltan permisos de lectura sobre la tabla para el usuario de soporte.
- [x] Un VACUUM con retención corta borró esos archivos.
- [ ] RESTORE solo sirve para la última hora.
porque: Time travel y RESTORE necesitan los archivos de la versión. Un VACUUM con retención 0 los borra; la salida es reconstruir desde bronze o un backup.

## Extracción incompleta
leccion: incidentes-apis-credenciales-y-costos
Un extractor recibe un 401 a mitad de la paginación y termina con "Fin OK". ¿Qué check lo habría detectado?
- [x] Comparar las filas escritas con el total del origen.
- [ ] Un check de unicidad sobre el id del contacto en la tabla destino.
- [ ] Un check de nulos en el campo email.
- [ ] Un check de frescura de seis horas.
porque: La reconciliación contra el total que informa el origen es el único check que detecta datos que nunca llegaron.

## Postmortem
leccion: incidentes-simulacro-de-guardia
¿Cuál es una buena acción de postmortem?
- [ ] "Tener más cuidado con los reintentos."
- [ ] "Revisar todos los pipelines del equipo."
- [x] "MERGE en fct_pagos y check de unicidad. Dueño y fecha."
- [ ] "Capacitar al ingeniero que estaba de guardia sobre los reintentos."
porque: Una acción útil cambia el sistema, es concreta y tiene dueño y fecha. Las acciones vagas o dirigidas a personas no evitan que se repita.
