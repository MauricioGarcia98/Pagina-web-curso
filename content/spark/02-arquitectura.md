---
titulo: Arquitectura de Spark
nivel: Básico
duracion: 40
resumen: Driver, executors, cluster manager, particiones, jobs, stages y tasks.
---

En la lección anterior viste la idea: repartir el trabajo entre muchas máquinas. Ahora vamos a ver **quién hace qué** dentro de un clúster de Spark. Entender estas piezas es lo que te va a permitir leer la Spark UI, entender un error de memoria y saber por qué un job tarda 2 minutos o 2 horas.

## Las piezas

```text
                 ┌──────────────────────┐
                 │       DRIVER         │  tu programa (SparkSession):
                 │  planifica el trabajo│  arma el plan y reparte tareas
                 └─────────┬────────────┘
                           │  pide recursos
                 ┌─────────▼────────────┐
                 │   CLUSTER MANAGER    │  YARN, Kubernetes, Standalone
                 └─────────┬────────────┘  (en Databricks lo gestiona la plataforma)
          ┌────────────────┼────────────────┐
   ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐
   │  EXECUTOR 1 │  │  EXECUTOR 2 │  │  EXECUTOR 3 │  procesos en los "workers"
   │ [T][T][T][T]│  │ [T][T][T][T]│  │ [T][T][T][T]│  cada [T] = un core ejecutando una task
   └─────────────┘  └─────────────┘  └─────────────┘
```

<!-- dg:sp02-cluster -->
```diagrama
titulo: Un clúster de Spark: el driver planifica, el cluster manager presta máquinas y los executors trabajan
nodo drv: Driver | icono=notebook | col=1 | fila=0 | color=violeta | sub=tu código + SparkSession
nodo cm: Cluster manager | icono=engranaje | col=2 | fila=0 | color=gris | sub=YARN · Kubernetes
nodo e1: Executor 1 | icono=servidor | col=0 | fila=1 | color=naranja | sub=4 cores · 4 tasks
nodo e2: Executor 2 | icono=servidor | col=1 | fila=1 | color=naranja | sub=4 cores · 4 tasks
nodo e3: Executor 3 | icono=servidor | col=2 | fila=1 | color=naranja | sub=4 cores · 4 tasks
nodo lake: Data lake | icono=bucket | col=3 | fila=1 | color=azul | sub=Parquet / Delta
flecha drv <-> cm: pide recursos
flecha drv -> e1: tasks
flecha drv -> e2: tasks
flecha drv -> e3: tasks
flecha e3 <-> lake: lee / escribe
```

:::analogia Una obra en construcción
- El **driver** es el **jefe de obra**: lee los planos (tu código), decide en qué orden se hace cada cosa y reparte el trabajo. No pone ladrillos.
- Los **executors** son las **cuadrillas de obreros**. Cada obrero (un **core**) hace una tarea a la vez.
- El **cluster manager** es la **empresa constructora**, que decide cuántas cuadrillas te presta para tu obra.
:::

### Driver

- Es el proceso donde corre **tu código**: tu notebook o tu script de Python. Ahí vive la `SparkSession` (la variable `spark`).
- Convierte tus transformaciones en un **plan de ejecución**, lo divide en tareas y se las manda a los executors.
- Lleva la cuenta de qué tarea terminó, cuál falló y cuál hay que reintentar.
- Recibe los resultados **solo** cuando los pides explícitamente, por ejemplo con `collect()`, `show()` o `toPandas()`.

:::cuidado El error clásico: traer todo al driver
`df.collect()` o `df.toPandas()` sobre 50 millones de filas manda **todos los datos a una sola máquina**, la del driver. Resultado: `OutOfMemoryError` y el job se cae. Trae al driver solo resultados chicos (agregados, un `limit`, una muestra). Los datos grandes se escriben directo desde los executors con `df.write...`.
:::

### Executors

- Son procesos que corren en las máquinas trabajadoras (*workers*). Cada executor tiene una cantidad de **cores** (cuántas tareas puede correr a la vez) y de **memoria**.
- Leen los datos de su parte (del lake, de S3, de ADLS), aplican las transformaciones, guardan resultados intermedios en memoria o en disco y escriben la salida.
- Un clúster de 3 workers con 4 cores cada uno puede correr **12 tareas en paralelo**.

### Cluster manager

- Asigna máquinas, CPU y memoria a tu aplicación. Los más comunes son **YARN** (el de Hadoop), **Kubernetes** y el modo **Standalone** de Spark.
- En **Databricks**, **EMR** o **Dataproc** casi no lo ves: eliges cuántas máquinas quieres (o un rango, con *autoscaling*) y la plataforma se encarga.

## Particiones: la unidad de paralelismo

Spark no procesa "un DataFrame": procesa **particiones**. Una partición es un pedazo de las filas del DataFrame. **Cada partición la procesa una tarea, en un core.**

Por ejemplo, 10 GB de pedidos en archivos Parquet de unos 128 MB generan unas 80 particiones. Con un clúster de 40 cores:

```text
Oleada 1: 40 tareas en paralelo (particiones 1 a 40)
Oleada 2: 40 tareas en paralelo (particiones 41 a 80)
```

Si tienes 200 particiones y 40 cores, se procesan 40 a la vez, en 5 "oleadas".

¿De dónde salen las particiones?

- **Al leer archivos**: Spark agrupa los archivos en bloques de hasta unos 128 MB (`spark.sql.files.maxPartitionBytes`). Muchos archivos chicos se juntan en una partición, y un archivo enorme se parte en varias.
- **Después de un shuffle** (`groupBy`, `join`): el número lo define `spark.sql.shuffle.partitions`, que vale **200** por defecto. Con *Adaptive Query Execution* (AQE, activado por defecto desde Spark 3.2), Spark lo ajusta solo según el tamaño real de los datos.
- **A mano**: con `repartition(n)` o `coalesce(n)`, que se ven en la lección de particiones y joins.

```python norun
df = spark.read.parquet("/lake/silver/pedidos")
df.rdd.getNumPartitions()        # ¿en cuántos pedazos quedó? p. ej. 80
```

:::tip La regla práctica
- Muy pocas particiones → cores ociosos y particiones enormes que no entran en memoria.
- Demasiadas particiones → mucho tiempo perdido en coordinar tareas diminutas.
- Un tamaño razonable por partición suele estar entre **100 MB y 1 GB** (en Parquet, unos 128 MB).
- Apunta a tener al menos **2 a 4 veces más particiones que cores**, para que ninguno quede sin trabajo.
:::

## Job → Stage → Task

Cuando ejecutas una **acción** (como `count()`, `show()` o escribir un archivo), Spark crea un **job**. Las transformaciones anteriores (`filter`, `select`, `groupBy`) solo arman el plan; la acción lo pone en marcha. (Esto es la *lazy evaluation*, el tema de la próxima lección.)

1. El job se divide en **stages** (etapas). Un stage nuevo empieza cada vez que hay que **redistribuir datos entre máquinas** (un *shuffle*), por ejemplo en un `groupBy` o un `join`.
2. Cada stage se divide en **tasks**: una por partición.

```text
job: df.groupBy("pais").count().show()
 ├── stage 1: leer archivos + contar parcial por partición   (200 tasks)
 │        ── shuffle: mover filas del mismo país a la misma partición ──
 └── stage 2: sumar los conteos parciales por país            (200 tasks)
```

Es exactamente el MapReduce de la lección anterior: el stage 1 es el *map*, la línea del medio es el *shuffle* y el stage 2 es el *reduce*.

¿Por qué el shuffle parte el job en stages? Porque el stage 2 **no puede empezar** hasta que todas las tareas del stage 1 terminaron: necesita **todos** los conteos parciales de Chile antes de sumarlos. Dentro de un stage, en cambio, cada tarea avanza sola, sin esperar a nadie.

| Concepto | Qué es | Cuántos hay |
|---|---|---|
| **Application** | Tu programa completo (una SparkSession) | 1 |
| **Job** | Lo que dispara cada acción | 1 por acción |
| **Stage** | Un tramo del job sin shuffles adentro | 1 + uno por cada shuffle |
| **Task** | El trabajo sobre una partición dentro de un stage | 1 por partición |

### La Spark UI

Todo esto se ve en la **Spark UI**, una página web que muestra cada job, sus stages y sus tasks, con tiempos y bytes leídos o movidos. En Databricks está en la pestaña *Spark UI* del clúster, y cada celda de un notebook tiene un enlace "Spark Jobs". Es la herramienta número uno para entender por qué algo es lento. Lo primero que se mira:

- **¿Qué stage tarda más?** Casi siempre es uno con shuffle.
- **Shuffle read/write**: cuántos GB se movieron por la red.
- **Duración de las tasks**: si la mayoría tarda 5 segundos y una tarda 10 minutos, hay **skew** (datos desbalanceados: un país con muchísimas más filas que el resto).
- **Spill**: datos que no entraron en memoria y se escribieron al disco. Significa particiones demasiado grandes.

## Tolerancia a fallos

En un clúster de 100 máquinas, que alguna falle es algo normal. Spark no copia todos los datos intermedios por si acaso: recuerda **cómo** se construyó cada partición, su **linaje** (*lineage*): "esta partición sale de leer el archivo X, filtrar y agrupar".

Si un executor muere, el driver vuelve a mandar **solo las tareas de las particiones perdidas** a otro executor, que las recalcula a partir del linaje. El job sigue como si nada, solo un poco más lento.

:::nota ¿Y si muere el driver?
Ahí se pierde la aplicación completa, porque el driver es quien tiene el plan. Por eso, en producción, los jobs se lanzan con un orquestador (Lakeflow Jobs o Airflow) que **reintenta** el job entero.
:::

## Resumen

| Pieza | Rol | Si falla… |
|---|---|---|
| Driver | Planifica y coordina; recibe resultados de `collect()` | Se cae la aplicación |
| Executor | Procesa particiones en sus cores | Spark recalcula sus tareas en otro |
| Cluster manager | Presta máquinas y recursos | La plataforma lo maneja |
| Partición | Un pedazo de los datos = 1 task = 1 core | — |
| Shuffle | Mover datos entre máquinas; separa stages | Es lo más caro: minimízalo |

## Ejercicios

:::ejercicio quiz
¿Dónde se ejecuta el código que construye el plan y reparte las tareas?

- [x] En el driver
- [ ] En cada executor
- [ ] En el cluster manager
- [ ] En el data lake
:::

:::ejercicio quiz
Tienes un DataFrame con 8 particiones y un cluster con 64 cores. ¿Qué pasa?

- [ ] Se usan los 64 cores
- [x] Solo 8 tareas corren a la vez: 56 cores quedan ociosos
- [ ] Spark falla
- [ ] Cada partición se procesa 8 veces
```explicacion
Una partición = una tarea = un core. Con 8 particiones solo hay 8 tareas en paralelo. Conviene `repartition(...)` a un número mayor (por ejemplo, 2-4 veces la cantidad de cores).
```
:::

:::ejercicio quiz
¿Qué provoca que un job de Spark se divida en un **nuevo stage**?

- [ ] Un `filter`
- [ ] Un `select`
- [x] Un shuffle (redistribución de datos), por ejemplo en `groupBy` o `join`
- [ ] Un `print`
:::
