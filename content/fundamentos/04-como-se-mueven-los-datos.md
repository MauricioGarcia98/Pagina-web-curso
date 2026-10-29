---
titulo: Cómo se mueven los datos - batch, streaming, ETL, ELT y orquestación
nivel: Básico
duracion: 40
resumen: La segunda profundización del viaje. Cómo se extraen los datos (completos, incrementales o por captura de cambios), cuándo conviene procesar por lotes y cuándo en tiempo real, por qué hoy se hace ELT en lugar de ETL, y qué hace un orquestador como Airflow. Con dos recorridos animados - una noche en la vida de un pipeline batch y un pago sospechoso detectado en dos segundos.
objetivos: Diferenciar una extracción completa, una incremental y una por captura de cambios (CDC) | Elegir entre batch y streaming según el costo de esperar | Explicar la diferencia entre ETL y ELT y por qué ELT es lo más común | Describir qué es un DAG y qué hace un orquestador | Escribir una extracción incremental simple con SQL
prerrequisitos: fundamentos-donde-viven-los-datos
autoevaluacion: ¿Sabes qué es una extracción incremental y qué es una marca de agua? | ¿Sabes dar un ejemplo donde streaming vale lo que cuesta? | ¿Sabes por qué ELT reemplazó a ETL? | ¿Sabes qué es un DAG? | ¿Sabes qué pasa si el paso 2 de un pipeline falla?
---

:::escenario
Dos pedidos llegan el mismo día a tu equipo. Finanzas quiere "las ventas de ayer, todos los días a las 8:00". Prevención de fraude quiere "saber si un pago es sospechoso **antes** de aprobarlo". Los dos usan los mismos datos de pagos, pero necesitan pipelines completamente distintos.
:::

## La idea en una frase

Mover datos es decidir **qué** copiar (todo o solo lo nuevo), **cada cuánto** (de a lotes o al instante), **dónde transformar** (antes o después de cargar) y **quién coordina** que cada paso ocurra en orden.

## Extraer: todo, lo nuevo o los cambios

| Estrategia | Cómo funciona | Ventaja | Problema |
|---|---|---|---|
| **Completa** (full) | Copiar la tabla entera cada vez | Simple y siempre correcta | Lenta y cara con tablas grandes |
| **Incremental** | Copiar solo las filas con fecha mayor a la última copiada (la **marca de agua**) | Rápida | No ve los borrados; los datos tardíos pueden perderse |
| **CDC** (captura de cambios) | Leer el registro interno de cambios de la base y copiar cada INSERT, UPDATE y DELETE | Completa y casi en tiempo real; no carga la base | Más compleja de operar (Debezium, Datastream, DMS, Fivetran) |

## Batch o streaming: ¿cuánto cuesta esperar?

| | Batch (por lotes) | Streaming (tiempo real) |
|---|---|---|
| Cada cuánto | Cada hora, cada día | Cada evento, en segundos |
| Ejemplo | Ventas de ayer para el tablero de las 8:00 | Bloquear un pago fraudulento antes de aprobarlo |
| Costo y complejidad | Bajos | Altos: el sistema está siempre encendido |
| Herramientas | Spark, dbt, SQL + Airflow | Kafka, Flink, Spark Structured Streaming, Dataflow |

La pregunta clave no es "¿se puede en tiempo real?" (casi siempre se puede) sino **"¿cuánto dinero se pierde por esperar una hora?"**. Para un tablero de ventas, nada. Para un fraude con tarjeta, todo.

## Una noche en la vida de un pipeline batch

```recorrido
titulo: Una noche del pipeline de ventas de Tienda Andina
estacion reloj: 03:00 Airflow | icono=airflow
estacion ext: Extraer | icono=postgres
estacion bronze: Bronze | icono=bucket
estacion trans: Transformar | icono=dbt
estacion test: Tests | icono=check
estacion pub: Publicar | icono=dashboard
paso reloj: Son las 03:00 y Airflow despierta
El **orquestador** revisa el horario de cada DAG (un DAG es un grafo de tareas con su orden). El de ventas está programado todos los días a las 3:00. Airflow crea una ejecución para la fecha lógica **2024-12-30** (el día que se procesa, que es ayer).
>>> python
with DAG("ventas_diarias", schedule="0 3 * * *", catchup=False) as dag:
    extraer = extraer_pedidos()
    cargar = cargar_bronze(extraer)
    transformar = dbt_run(cargar)
    probar = dbt_test(transformar)
    publicar = refrescar_tablero(probar)
paso ext: Extraer solo lo nuevo
La tarea de extracción pregunta: "¿hasta qué fecha copié la última vez?". Esa fecha es la **marca de agua**. Solo copia los pedidos posteriores. Así, en lugar de 12.000 pedidos, mueve los de un día.
>>> sql
SELECT *
FROM pedidos
WHERE fecha_pedido > '2024-12-29'   -- marca de agua de la ejecución anterior
  AND fecha_pedido <= '2024-12-30';
paso bronze: Cargar en bronze, tal cual
Los pedidos extraídos se escriben en el lago, en una carpeta con la fecha procesada. Si la tarea se reintenta, **reemplaza** esa carpeta en lugar de agregar otra copia: así un reintento no duplica (eso se llama ser **idempotente**).
>>> texto
s3://lago/bronze/pedidos/fecha=2024-12-30/part-0000.parquet   (reemplazada en cada ejecución)
paso trans: Transformar dentro del lago o warehouse (ELT)
Con los datos ya cargados, **dbt** ejecuta los modelos SQL de silver y gold dentro del mismo motor. Esto es **ELT**: primero se carga (L) y después se transforma (T), con la potencia del warehouse.
>>> log
dbt run --select +gold_ventas_diarias
  1 of 3 OK created silver_lineas_pedido ........ [OK in 4.2s]
  2 of 3 OK created silver_clientes ............. [OK in 1.1s]
  3 of 3 OK created gold_ventas_diarias ......... [OK in 2.8s]
paso test: Los tests deciden si se publica
Antes de que alguien vea los números, corren los tests. Si uno falla, el DAG se detiene, el tablero sigue mostrando el día anterior (viejo, pero correcto) y la persona de guardia recibe una alerta.
>>> log
dbt test --select gold_ventas_diarias
  PASS not_null_gold_ventas_diarias_fecha
  PASS unique_gold_ventas_diarias_fecha_pais
  PASS ventas_no_negativas
  Done. PASS=3 WARN=0 ERROR=0
paso pub: Publicar
El tablero se refresca con los datos nuevos y Airflow marca la ejecución como exitosa. A las 8:00 Finanzas tiene las ventas de ayer. Mañana a las 3:00, todo de nuevo, con la marca de agua en **2024-12-30**.
>>> tabla
dag_id,fecha_logica,estado,inicio,fin
ventas_diarias,2024-12-30,success,03:00:02,03:14:51
```

## Un pago sospechoso en dos segundos

```recorrido
titulo: Streaming - un pago evaluado antes de aprobarse
estacion pago: Pago | icono=dinero
estacion cola: Kafka | icono=kafka
estacion stream: Procesamiento | icono=flink
estacion modelo: Modelo de fraude | icono=ml
estacion dec: Decisión | icono=escudo
paso pago: 23:41:07.120 - Se intenta un pago
Una tarjeta intenta pagar 2.300 dólares en una tienda de Lima. El sistema de pagos no lo aprueba todavía: publica el intento como **evento** y espera la respuesta.
>>> json
{"pago_id": "p-88123", "tarjeta": "****4421", "monto": 2300.00, "pais": "PE", "ts": "2024-12-30T23:41:07.120Z"}
paso cola: 23:41:07.180 - El evento entra a la cola
Kafka guarda el evento y lo entrega a quienes estén suscritos. Tarda milisegundos.
>>> texto
topic: pagos   partición: 4   offset: 9.120.554
paso stream: 23:41:07.400 - Se calculan señales en tiempo real
Un job de streaming (Flink, Spark Structured Streaming) mantiene en memoria lo que pasó con esa tarjeta en los últimos minutos y calcula **señales**: cuántos pagos hizo en 10 minutos, en cuántos países, cuánto gasta normalmente.
>>> json
{"tarjeta": "****4421", "pagos_10min": 4, "paises_10min": ["CL", "PE"], "monto_promedio_90d": 85.40}
paso modelo: 23:41:08.050 - El modelo da un puntaje
Un modelo de machine learning recibe las señales y devuelve la probabilidad de fraude.
>>> json
{"pago_id": "p-88123", "prob_fraude": 0.94, "motivo": ["monto 27x el habitual", "2 países en 10 minutos"]}
paso dec: 23:41:09.000 - Pago retenido
Menos de dos segundos después del intento, el pago se retiene y el cliente recibe un aviso para confirmar. En batch, este pago se habría descubierto a las 3:00 del día siguiente, con el dinero ya perdido.
>>> tabla
pago_id,decision,latencia_ms
p-88123,RETENIDO,1880
```

## ETL o ELT

| | ETL (antes) | ELT (hoy) |
|---|---|---|
| Orden | Extraer → **Transformar** en un servidor aparte → Cargar | Extraer → **Cargar** crudo → Transformar dentro del warehouse o lakehouse |
| Dónde se transforma | Una herramienta ETL (Informatica, SSIS, Talend) | El propio motor (SQL con dbt, Spark en Databricks) |
| Datos crudos | Se descartan después de transformar | Quedan en bronze para reprocesar |
| Por qué cambió | El almacenamiento era caro y los warehouses, lentos | El almacenamiento en la nube es barato y los motores escalan |

## El orquestador

Un **orquestador** (Airflow, Dagster, Prefect, los Jobs de Databricks, Azure Data Factory) se encarga de:

- **Cuándo**: ejecutar cada pipeline a su hora o cuando llega un archivo.
- **En qué orden**: el DAG define que transformar va después de extraer.
- **Qué hacer si falla**: reintentar, avisar, no ejecutar lo que depende del paso fallido.
- **Historia**: qué corrió, cuánto tardó, qué falló, con sus logs.

```diagrama
titulo: Un DAG - si un paso falla, lo que depende de él no corre
nodo e: extraer | icono=postgres | col=0 | fila=0 | color=verde | sub=success
nodo c: cargar_bronze | icono=bucket | col=1 | fila=0 | color=verde | sub=success
nodo t: dbt_run | icono=dbt | col=2 | fila=0 | color=rojo | sub=failed
nodo p: dbt_test | icono=check | col=3 | fila=0 | color=gris | sub=upstream_failed
nodo r: refrescar_tablero | icono=dashboard | col=3 | fila=1 | color=gris | sub=upstream_failed
flecha e -> c
flecha c -> t
flecha t -> p
flecha p -> r
```

## Práctica

:::ejercicio sql dificultad=Básico titulo="Extracción completa"
Una extracción completa copia toda la tabla. Cuenta cuántos pedidos tendría que mover.
```sql solucion
SELECT COUNT(*) AS pedidos FROM pedidos;
```
```pista
`SELECT COUNT(*) FROM pedidos;`
```
:::

:::ejercicio sql dificultad=Básico titulo="Extracción incremental"
La marca de agua de la ejecución anterior es `2024-12-30`. Cuenta los pedidos **posteriores** a esa fecha: es lo que movería una extracción incremental.
```sql inicial
SELECT COUNT(*) AS pedidos
FROM pedidos
WHERE fecha_pedido > ...;
```
```sql solucion
SELECT COUNT(*) AS pedidos FROM pedidos WHERE fecha_pedido > '2024-12-30';
```
```pista
Las fechas van entre comillas simples: `'2024-12-30'`.
```
```explicacion
16 pedidos contra 12.000. En una tabla de 2.000 millones de filas, esa diferencia es la que separa un pipeline de minutos de uno de horas.
```
:::

:::ejercicio sql ordenado dificultad=Intermedio titulo="Lo que movería cada noche"
Para planificar el pipeline, cuenta los pedidos por **día** de la última semana de 2024 (desde el `2024-12-25`). Columnas `fecha_pedido` y `pedidos`, ordenado por fecha.
```sql solucion
SELECT fecha_pedido, COUNT(*) AS pedidos
FROM pedidos
WHERE fecha_pedido >= '2024-12-25'
GROUP BY fecha_pedido
ORDER BY fecha_pedido;
```
```pista
Filtra con `WHERE fecha_pedido >= '2024-12-25'`, agrupa por `fecha_pedido` y cuenta.
```
:::

:::ejercicio sql dificultad=Intermedio titulo="Una transformación de silver"
`clientes_crudo` es una copia bronze de clientes, con duplicados y emails en mayúsculas o con espacios. Cuenta cuántas filas tiene (`filas`) y cuántos emails distintos hay después de normalizarlos con `LOWER(TRIM(email))` (`emails_unicos`).
```sql inicial
SELECT COUNT(*) AS filas,
       COUNT(DISTINCT ...) AS emails_unicos
FROM clientes_crudo;
```
```pista
Dentro del `COUNT(DISTINCT …)` va el email normalizado: `LOWER(TRIM(email))`.
```
```sql solucion
SELECT COUNT(*) AS filas, COUNT(DISTINCT LOWER(TRIM(email))) AS emails_unicos FROM clientes_crudo;
```
```explicacion
400 filas y 230 emails distintos: muchas filas son el mismo cliente cargado varias veces, con el email escrito de distintas formas. Normalizar y deduplicar es exactamente lo que hace la capa silver (lo vas a hacer completo en el curso de SQL).
```
:::

:::ejercicio quiz dificultad=Básico
¿Cuál de estos casos justifica **streaming**?

- [ ] El informe mensual de ventas para el directorio
- [x] Detectar un pago fraudulento antes de aprobarlo
- [ ] El tablero de ventas que la gerente mira a las 8:00
- [ ] La conciliación contable del cierre de mes
:::

:::ejercicio quiz dificultad=Básico
¿Qué es una **marca de agua** en una extracción incremental?

- [ ] Un sello que identifica al autor de los datos
- [x] El punto (por ejemplo, la última fecha) hasta donde ya se copiaron los datos
- [ ] Una columna que indica si la fila fue borrada
- [ ] El nombre del archivo en el lago
:::

:::ejercicio quiz dificultad=Intermedio
¿Qué ventaja tiene **CDC** frente a una extracción incremental por fecha?

- [ ] Es más simple de configurar
- [x] Captura también los UPDATE y DELETE, casi en tiempo real, leyendo el registro de cambios de la base
- [ ] No necesita ninguna herramienta
- [ ] Copia la tabla completa cada vez
:::

:::ejercicio quiz dificultad=Intermedio
¿Por qué **ELT** reemplazó a ETL en la mayoría de las empresas?

- [ ] Porque ETL está prohibido en la nube
- [ ] Porque ELT no necesita SQL
- [x] Porque guardar los datos crudos en la nube es barato y los warehouses modernos transforman rápido, lo que permite reprocesar
- [ ] Porque ELT no necesita orquestador
:::

:::ejercicio quiz dificultad=Básico
En el DAG del diagrama, `dbt_run` falla. ¿Qué pasa con `refrescar_tablero`?

- [ ] Se ejecuta igual con los datos que haya
- [x] No se ejecuta (upstream_failed): el tablero sigue con los datos del día anterior
- [ ] Se ejecuta dos veces
- [ ] Airflow lo marca como exitoso
:::

:::ejercicio quiz dificultad=Intermedio
Una tarea de carga se reintenta después de un error de red. ¿Qué hace que el reintento **no duplique** datos?

- [ ] Esperar más tiempo entre reintentos
- [x] Que la carga reemplace la partición del día (o haga MERGE) en lugar de agregar filas: que sea idempotente
- [ ] Que el reintento use otro usuario
- [ ] Que la tabla no tenga clave primaria
:::

:::errores
- **Streaming porque "suena moderno"**: cuesta más y es más difícil de operar. Si nadie actúa en segundos, alcanza con batch.
- **Incremental sin pensar en los datos tardíos**: un pedido que llega con fecha de ayer después de la extracción se pierde (lo resuelve una ventana de relectura; lo ves en el módulo de Guardia).
- **Cargas que agregan filas sin control**: el primer reintento duplica todo. Las cargas deben ser idempotentes.
- **Pipelines sin orquestador** (un cron por script): nadie sabe qué depende de qué ni qué falló anoche.
:::

## Resumen

| Decisión | Opciones | Criterio |
|---|---|---|
| Qué extraer | Completo, incremental, CDC | Tamaño de la tabla, si hay borrados, latencia necesaria |
| Cada cuánto | Batch, streaming | Cuánto cuesta esperar |
| Dónde transformar | ETL, ELT | Hoy casi siempre ELT: crudo en bronze y transformación en el motor |
| Quién coordina | Airflow, Dagster, Jobs de Databricks, ADF | Dependencias, horarios, reintentos, alertas |
