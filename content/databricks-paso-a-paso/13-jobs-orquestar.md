---
titulo: Jobs - orquestar notebooks y consultas con tareas, dependencias, reintentos y horario
nivel: 4 · Intermedio-avanzado
duracion: 55
resumen: Un job es lo que convierte un notebook que corre cuando tú lo ejecutas en algo que corre solo, en orden, con reintentos y avisos. Crear un job con una tarea de notebook y una de SQL, encadenarlas con Depends on, entender Run if, reintentos y timeout, ejecutarlo y leer la corrida (el grafo, el estado de cada tarea, la salida), la matriz de corridas, reparar una corrida fallida, parámetros y el horario.
objetivos: Crear un job con varias tareas y dependencias | Leer una corrida y encontrar la tarea que falló | Reparar una corrida sin repetir lo que ya salió bien | Pasar parámetros del job al notebook | Programar el job
prerrequisitos: databricks-paso-a-paso-proyecto-capa-silver
autoevaluacion: ¿Sabes qué pasa con una tarea si falla la anterior? | ¿Sabes qué hace Repair run? | ¿Sabes cómo llega un parámetro del job al notebook? | ¿Sabes dónde ver todas las corridas de todos los jobs?
---

:::analogia En palabras simples
Un job es la receta escrita para que la cocina funcione sin ti: primero cargar, después controlar, después publicar; si un paso falla, no sigas con el siguiente; si fue un tropiezo, intenta de nuevo; y todo esto todos los días a las 6. Las **tareas** son los pasos; las **dependencias**, el orden.
:::

## Paso 1 — Crear el job

Menú **Jobs & Pipelines**:

```captura
archivo: databricks/d13-jobs.webp
texto: Jobs, Pipelines y Runs (1), Create (2) y la exportación como bundle (3)
```

**Create → Job**. El job nace con una tarea vacía. Ponle nombre `ventas_diarias` y completa la tarea:

```captura
archivo: databricks/d13-tarea.webp
texto: Nombre del job (1), el grafo de tareas (2), el formulario de la tarea (3) y los detalles del job (4)
```

| Campo | Qué es |
|---|---|
| **Task name** | Identificador de la tarea (`cargar_ventas`); sin espacios |
| **Type** | Notebook, SQL, If/else o Pipeline |
| **Path** | El notebook que ejecuta (`Ventas por canal`) |
| **Compute** | Serverless o un cluster; en producción, **job compute** |
| **Parameters** | Valores que el notebook lee con `dbutils.widgets.get` |

**Save task**.

## Paso 2 — Una segunda tarea que depende de la primera

**Add task → SQL**: nombre `control_calidad`, consulta `SELECT COUNT(*) AS filas FROM main.default.ventas_por_canal`, y en **Depends on** marca `cargar_ventas`:

```captura
archivo: databricks/d13-dag.webp
texto: El grafo con las dos tareas encadenadas (1) y Add task (2) para seguir agregando
```

```captura
archivo: databricks/d13-dependencias.webp
texto: En la tarea - Depends on (1), Run if (2), reintentos (3) y timeout (4)
```

| Opción | Qué controla |
|---|---|
| **Depends on** | Qué tareas tienen que terminar antes |
| **Run if dependencies** | *All succeeded* (lo normal), *At least one succeeded*, *None failed*, *All done* (siempre, útil para avisar o limpiar), *At least one failed* |
| **Retries** | Cuántas veces reintentar si falla (para errores pasajeros de red o cómputo) |
| **Timeout** | Segundos máximos; pasado eso, falla |

## Paso 3 — Ejecutar y leer la corrida

**Run now**:

```captura
archivo: databricks/d13-corriendo.webp
texto: La corrida en marcha - cada tarea cambia de color al pasar
```

```captura
archivo: databricks/d13-run.webp
texto: La corrida terminada - estado general (1), el grafo con el estado de cada tarea (2) y la lista con duración y valores (3)
```

Haz clic en una tarea del grafo para ver su salida: las celdas del notebook con sus resultados, o el resultado de la consulta SQL. Si una tarea falla, ahí está el error.

Si `cargar_ventas` fallara, `control_calidad` quedaría en **UPSTREAM_FAILED**: no corrió porque su dependencia falló. Es exactamente lo que quieres: no controlar calidad sobre datos que no se cargaron.

## Paso 4 — Las corridas y la reparación

Pestaña **Runs** del job:

```captura
archivo: databricks/d13-runs.webp
texto: La matriz de corridas (1) - una columna por corrida, una fila por tarea; Run now (2) y Run now with different parameters (3)
```

En una corrida fallida aparece **Repair run**: vuelve a ejecutar **solo las tareas que fallaron y las que dependen de ellas**. Si la tarea 1 tardó una hora y falló la 3, la reparación no repite la hora.

Menú **Data Engineering → Runs** lista las corridas de **todos** los jobs: es la pantalla de la mañana del equipo de datos.

## Paso 5 — Parámetros

En **Job details → Job parameters → Edit** defines `fecha=2024-12-01`. Todas las tareas lo reciben; un notebook lo lee con `dbutils.widgets.get("fecha")`. **Run now with different parameters** permite lanzar una corrida con otro valor (por ejemplo, para reprocesar un día). Valores dinámicos: `{{job.start_time.iso_date}}` es la fecha de la corrida.

En la práctica, el notebook `Ventas por canal` define sus widgets `canal` y `minimo` con valores por defecto; un parámetro del job con el mismo nombre los reemplaza.

## Paso 6 — Horario y avisos

```captura
archivo: databricks/d13-schedule.webp
texto: Add trigger - cada hora, día o semana, con hora y zona horaria
```

**Schedules & Triggers → Add trigger** programa el job. **Notifications** envía correo al fallar. **Max concurrent runs** = 1 evita que dos corridas del mismo job se pisen si una tarda más de lo previsto.

:::tip Lo que distingue un job bien hecho
Tareas chicas con nombres claros, dependencias explícitas, reintentos solo donde el error puede ser pasajero, una tarea final de control de calidad, aviso al fallar y parámetros en lugar de fechas escritas en el código.
:::

## ✅ Lo que lograste

- Creaste un job con dos tareas encadenadas y lo ejecutaste.
- Lees una corrida, la matriz y sabes reparar.
- Pasas parámetros y programas el job.

:::ejercicio quiz
La tarea A falla y B depende de A con Run if = All succeeded. ¿Qué pasa con B?
- [ ] Corre igual
- [x] Queda en UPSTREAM_FAILED: no corre
- [ ] Se reintenta
- [ ] Se borra
:::

:::ejercicio quiz
¿Qué hace Repair run?
- [ ] Repite toda la corrida
- [x] Vuelve a correr solo las tareas que fallaron y las que dependen de ellas
- [ ] Borra la corrida
- [ ] Edita el notebook
:::

:::ejercicio quiz
¿Cómo recibe un notebook el parámetro fecha definido en el job?
- [ ] Con sys.argv
- [x] Con dbutils.widgets.get("fecha")
- [ ] Con input()
- [ ] No lo recibe
:::

:::ejercicio quiz
¿Para qué sirve Max concurrent runs = 1?
- [ ] Para que corra más rápido
- [x] Para que no arranque otra corrida del mismo job mientras una sigue en marcha
- [ ] Para limitar los usuarios
- [ ] Para ahorrar DBU
:::
