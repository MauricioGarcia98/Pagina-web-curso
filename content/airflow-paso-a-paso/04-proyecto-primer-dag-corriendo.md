---
titulo: Proyecto 1 (guiado) - dispararlo, seguirlo y leer su log
nivel: 1 · Básico
duracion: 40
resumen: Disparas hola_tienda desde la interfaz, entiendes el formulario de Trigger (fecha lógica, Run ID, configuración, notas), sigues la corrida en la grilla y lees el log de cada tarea para comprobar que hizo lo que esperabas. Guiado paso a paso.
objetivos: Disparar un Dag a mano | Entender la fecha lógica y el Run ID | Seguir una corrida en la grilla | Leer el log de una tarea
prerrequisitos: airflow-paso-a-paso-tu-primer-dag
autoevaluacion: ¿Sabes qué es la fecha lógica? | ¿Sabes qué significa el cuadrado verde en la grilla? | ¿Sabes dónde está el log de una tarea? | ¿Sabes qué pasa con un Dag pausado al dispararlo?
---

:::escenario El pedido
Lucía: *"Córrelo y muéstrame en el log que el saludo salió."*
:::

## Paso 1 — Disparar

En `hola_tienda`, **Trigger**:

```captura
archivo: airflow/a04-trigger.webp
texto: El formulario de Trigger - Single Run, opciones avanzadas y "Unpause on trigger"
```

| Campo | Qué es |
|---|---|
| **Logical Date** | La fecha "de los datos" que procesa la corrida. Llega a las tareas como `{{ ds }}` |
| **Run ID** | El nombre de la corrida. Si lo dejas vacío se genera, por ejemplo `manual__2026-11-15T19:05:00+00:00` |
| **Configuration JSON** | Valores que recibe esta corrida (lo usas en el nivel 3) |
| **Dag Run Notes** | Una nota para el equipo: por qué se corrió a mano |
| **Unpause on trigger** | Como el Dag está pausado, lo despausa al dispararlo |

Pulsa **Trigger**.

## Paso 2 — Seguir la corrida

```captura
archivo: airflow/a04-run.webp
texto: La grilla (1) - una columna por corrida y una fila por tarea; el detalle de la corrida (2) y sus task instances (3)
```

En la grilla, **cada columna es una corrida** y **cada fila una tarea**. El color es el estado:

| Color | Estado |
|---|---|
| Sin color | Todavía no se creó la instancia |
| Tostado | `scheduled`: lista para correr |
| Gris | `queued`: esperando un lugar en un worker |
| Verde lima | `running` |
| Verde | `success` |
| Rojo | `failed` |
| Dorado | `up_for_retry`: falló y espera para reintentar |
| Naranja | `upstream_failed`: no corrió porque falló una anterior |
| Rosa | `skipped`: se saltó a propósito |

## Paso 3 — Leer el log

Haz clic en el cuadrado de `saludo`:

```captura
archivo: airflow/a04-log.webp
texto: El log de saludo - se ve el print de la función y "Task instance in success state"
```

Busca la línea del `print`. Ahí está la prueba de que la tarea hizo lo que esperabas, no solo que terminó.

:::errores
- **Confundir la fecha lógica con la hora de ejecución.** La fecha lógica dice qué día de datos procesa la corrida; puede ser distinta de cuándo corrió.
- **Leer el log de la corrida equivocada.** Cada cuadrado de la grilla es una tarea en una corrida; fíjate en la columna antes de abrir el log.
- **Tratar upstream_failed como un error propio.** La tarea no corrió porque falló una anterior; arregla primero esa.
:::

## ✅ Lista de verificación

- [ ] `hola_tienda` tiene una corrida en **success**.
- [ ] Las dos tareas están en verde.
- [ ] El log de `inicio` muestra `Arranca la carga`.
- [ ] El log de `saludo` muestra el saludo.

<details><summary>💡 Si algo salió distinto</summary>

- **La corrida quedó en `queued`**: el Dag estaba pausado y desmarcaste "Unpause on trigger". Actívalo con el interruptor.
- **No encuentras el log**: el log está en la instancia de la tarea (corrida + tarea), no en la tarea sola. Entra desde el cuadrado de la grilla.
</details>

## Lo que aprendiste en el nivel 1

- Qué es Airflow y sus piezas.
- La lista de Dags y la página de un Dag.
- Escribir, disparar y seguir un Dag, y leer sus logs.

En el nivel 2: la grilla y el grafo a fondo, errores y reintentos, y la programación.

:::ejercicio quiz
¿Qué es la fecha lógica (logical date)?
- [ ] La hora a la que terminó la corrida
- [x] La fecha de los datos que procesa la corrida, que llega a las tareas como {{ ds }}
- [ ] La fecha de creación del archivo
- [ ] La fecha en que se disparó el Dag a mano
:::

:::ejercicio quiz
En la grilla, ¿qué es cada columna?
- [x] Una corrida del Dag
- [ ] Una tarea
- [ ] Un intento de la misma tarea
- [ ] Una fecha del calendario, aunque no haya corrida
:::

:::ejercicio quiz
¿Dónde está el log de una tarea?
- [ ] En la lista de Dags
- [x] En la instancia de la tarea: clic en su cuadrado de la grilla
- [ ] En Admin → Config
- [ ] En el archivo .py
:::

:::ejercicio quiz
¿Qué significa naranja (upstream_failed)?
- [ ] Que falló y se va a reintentar
- [x] Que no corrió porque falló una tarea anterior
- [ ] Que está corriendo
- [ ] Que se canceló a mano
:::
