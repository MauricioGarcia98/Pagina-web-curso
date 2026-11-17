---
titulo: La lista de Dags y la página de un Dag
nivel: 1 · Básico
duracion: 30
resumen: La lista de Dags es la pantalla que más vas a usar. Buscas y filtras por estado y etiqueta, entiendes cada columna (horario, próxima corrida, última corrida), abres un Dag y recorres su cabecera, la grilla y las pestañas, y aprendes qué significa pausar y despausar.
objetivos: Buscar y filtrar Dags por estado y etiqueta | Leer las columnas Schedule, Next Dag Run y Latest Dag Run | Recorrer la cabecera y las pestañas de un Dag | Explicar qué hace el interruptor de pausa
prerrequisitos: airflow-paso-a-paso-que-es-airflow-y-la-pantalla
autoevaluacion: ¿Sabes filtrar los Dags por etiqueta? | ¿Sabes qué pasa con un Dag pausado? | ¿Sabes dónde está el código de un Dag? | ¿Sabes por qué los Dags nuevos aparecen pausados?
---

:::analogia El tablero de salidas del aeropuerto
La lista de Dags es el tablero de salidas: cada fila es un vuelo (un Dag), con su horario, la próxima salida y cómo le fue al último. Un Dag pausado es un vuelo suspendido: no sale solo, aunque puedes despacharlo a mano.
:::

## Paso 1 — La lista

Menú **Dags**:

```captura
archivo: airflow/a02-dags.webp
texto: El buscador (1), los filtros por estado, pausa, favoritos y etiqueta (2) y la tabla de Dags (3)
```

| Columna | Qué dice |
|---|---|
| Interruptor | Si el Dag está activo o pausado |
| **Dag** | El `dag_id` y su descripción |
| **Schedule** | Cuándo corre: `@daily`, un cron como `0 6 * * *`, `Asset` o `None` (solo a mano) |
| **Next Dag Run** | La próxima corrida programada (solo si está activo) |
| **Latest Dag Run** | La última corrida y su estado |
| **Tags** | Etiquetas para agrupar |
| Acciones | Disparar (▷), marcar como favorito y borrar |

## Paso 2 — Filtrar

Las etiquetas (`tags`) se definen en el código del Dag y sirven para ordenar cuando hay decenas de Dags. Filtra por `ventas`:

```captura
archivo: airflow/a02-filtro.webp
texto: El filtro por etiqueta - queda solo ventas_diarias
```

:::tip Etiquetas útiles
Usa etiquetas por **equipo** (`finanzas`), por **dominio** (`ventas`) o por **tipo** (`ingesta`, `reportes`). Un Dag puede tener varias.
:::

## Paso 3 — La página de un Dag

Abre `ventas_diarias`:

```captura
archivo: airflow/a02-dag.webp
texto: El nombre con el interruptor y las acciones (1), horario, última y próxima corrida, dueño y etiquetas (2), la grilla de corridas (3) y las pestañas (4)
```

| Pestaña | Qué tiene |
|---|---|
| **Overview** | Corridas y tareas fallidas, duración de las últimas corridas y la documentación del Dag |
| **Runs** | Todas las corridas con su tipo, fechas y duración |
| **Tasks** | Cada tarea con su operador |
| **Calendar** | Un calendario con el estado de cada día |
| **Backfills** | Reprocesos de fechas pasadas |
| **Audit Log** | Quién hizo qué sobre este Dag |
| **Code** | El código Python tal como lo leyó Airflow |
| **Details** | Todos los atributos del Dag |

## Paso 4 — Pausar y despausar

Activa el interruptor de `ventas_diarias`:

```captura
archivo: airflow/a02-activo.webp
texto: El Dag activo - aparece una corrida programada y la próxima en Next Run
```

| Estado | Qué pasa |
|---|---|
| **Pausado** | El scheduler no crea corridas programadas. Puedes dispararlo a mano |
| **Activo** | El scheduler crea las corridas según el horario |

:::cuidado Los Dags nuevos arrancan pausados
Por defecto (`dags_are_paused_at_creation = True`), un Dag nuevo aparece **pausado**. Es una protección: nada corre solo hasta que alguien lo revisa y lo activa. Vuelve a pausar `ventas_diarias` para seguir.
:::

:::errores
- **Esperar que un Dag nuevo corra solo.** Los Dags nuevos aparecen pausados; hay que activarlos.
- **Pensar que pausar impide todo.** Un Dag pausado se puede disparar a mano; lo que no ocurre son las corridas programadas.
- **Leer `Schedule = None` como error.** Significa que el Dag solo corre cuando alguien (o algo) lo dispara.
:::

## ✅ Lo que lograste

- Buscas y filtras Dags.
- Lees cada columna y cada pestaña.
- Sabes qué significa pausar.

:::ejercicio quiz
¿Qué significa Schedule = None?
- [ ] Que corre cada minuto
- [x] Que solo corre cuando alguien lo dispara
- [ ] Que usa el horario por defecto: @daily
- [ ] Que corre una vez por año
:::

:::ejercicio quiz
Un Dag está pausado. ¿Puedes correrlo?
- [ ] No, nunca
- [x] Sí, disparándolo a mano; lo que no ocurre son las corridas programadas
- [ ] Sí, pero solo desde la CLI con airflow dags unpause
- [ ] Solo desde la terminal
:::

:::ejercicio quiz
¿En qué pestaña ves el código del Dag?
- [ ] Overview
- [ ] Runs
- [x] Code
- [ ] Calendar
:::

:::ejercicio quiz
¿Por qué los Dags nuevos aparecen pausados?
- [x] Para que nada corra solo hasta que alguien lo revise y lo active
- [ ] Porque todavía no tienen una corrida exitosa
- [ ] Porque no tienen tareas
- [ ] Porque el scheduler los revisa una vez por día
:::
