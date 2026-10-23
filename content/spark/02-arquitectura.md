---
titulo: Arquitectura de Spark
nivel: Básico
duracion: 25
resumen: Driver, executors, cluster manager, particiones, jobs, stages y tasks.
---

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

- **Driver**: el “jefe de obra”. Ejecuta tu código, crea el plan de ejecución, lo divide en tareas y las reparte. Es donde vive la `SparkSession`.
- **Executors**: los “obreros”. Procesos en las máquinas trabajadoras (*workers*) que ejecutan las tareas y guardan datos en memoria o disco.
- **Cluster manager**: asigna máquinas y recursos (CPU, memoria) a tu aplicación.

## Particiones: la unidad de paralelismo

Spark divide los datos en **particiones** (pedazos). **Cada partición la procesa una tarea, en un core**. Si tienes 200 particiones y 40 cores, se procesan 40 a la vez, en 5 “oleadas”.

:::tip La regla práctica
- Muy pocas particiones → cores ociosos y particiones enormes que no entran en memoria.
- Demasiadas particiones → mucho tiempo perdido en coordinar tareas diminutas.
- Un tamaño razonable por partición suele estar entre **100 MB y 1 GB** (en Parquet ~128 MB).
:::

## Job → Stage → Task

Cuando ejecutas una **acción** (como `count()` o escribir un archivo), Spark crea un **job**:

1. El job se divide en **stages** (etapas). Un nuevo stage empieza cada vez que hay que **redistribuir datos entre máquinas** (un *shuffle*), por ejemplo en un `groupBy` o un `join`.
2. Cada stage se divide en **tasks**: una por partición.

```text
job: df.groupBy("pais").count().show()
 ├── stage 1: leer archivos + contar parcial por partición   (200 tasks)
 │        ── shuffle: mover filas del mismo país a la misma partición ──
 └── stage 2: sumar los conteos parciales por país            (200 tasks)
```

Esto lo ves en la **Spark UI** (en Databricks: pestaña *Spark UI* del cluster), la herramienta número uno para entender por qué algo es lento.

## Tolerancia a fallos

Spark recuerda **cómo** se construyó cada partición (su *linaje*, *lineage*). Si un executor muere, recalcula solo las particiones perdidas en otra máquina. No hace falta replicar todos los datos intermedios.

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
