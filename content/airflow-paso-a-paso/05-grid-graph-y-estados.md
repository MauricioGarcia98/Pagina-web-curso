---
titulo: Grid, Graph y el historial de corridas
nivel: 2 · Básico-intermedio
duracion: 35
resumen: Con varias corridas, la grilla se vuelve la mejor forma de ver la salud de un Dag de un vistazo. Disparas ventas_diarias para tres fechas, lees la grilla (altura = duración, color = estado), cambias al grafo para ver las dependencias y usas la pestaña Runs para filtrar por estado y tipo de corrida.
objetivos: Leer la grilla con varias corridas | Usar el grafo para entender las dependencias | Filtrar las corridas por estado y tipo | Distinguir corridas manuales, programadas, backfill y por assets
prerrequisitos: airflow-paso-a-paso-proyecto-primer-dag-corriendo
autoevaluacion: ¿Sabes qué indica la altura de una barra en la grilla? | ¿Sabes cuándo conviene el grafo? | ¿Sabes qué tipos de corrida existen? | ¿Sabes filtrar las corridas fallidas?
---

## Paso 1 — Varias corridas

Dispara `ventas_diarias` tres veces, cada una con una **Logical Date** distinta (en Advanced Options): 12, 13 y 14 de noviembre a las 06:00.

:::nota ¿Por qué fechas distintas?
Airflow no permite dos corridas del mismo Dag con la misma fecha lógica. Si disparas dos veces en el mismo minuto sin cambiarla, la segunda da error.
:::

## Paso 2 — La grilla

```captura
archivo: airflow/a05-grid.webp
texto: La grilla con cuatro corridas - barras arriba (altura = duración) y un cuadrado por tarea y corrida
```

| Qué mirar | Qué te dice |
|---|---|
| **Barra de arriba** | Una por corrida; su altura es la duración y su color el estado de la corrida |
| **Fila de cuadrados** | El estado de una tarea en cada corrida |
| **Una columna roja** | Qué tarea rompió esa corrida |
| **Una barra mucho más alta** | Una corrida lenta: más datos, un recurso más chico o un problema |

El selector **10 runs** cambia cuántas corridas se ven.

## Paso 3 — El grafo

**Graph**:

```captura
archivo: airflow/a05-graph.webp
texto: El grafo - extraer → limpiar → publicar, cada caja con su operador y su estado
```

| Vista | Conviene para |
|---|---|
| **Grid** | Ver la historia: qué falló, cuándo y cuánto tardó |
| **Graph** | Ver la forma del Dag: qué depende de qué, qué corre en paralelo |

**Tasks and assets** suma los datos que el Dag produce o espera (nivel 4).

## Paso 4 — La pestaña Runs

```captura
archivo: airflow/a05-runs.webp
texto: Runs - cada corrida con su estado, tipo, fecha lógica, inicio, fin y duración
```

| Run Type | Quién la creó | Run ID empieza con |
|---|---|---|
| **Manual** | Alguien la disparó | `manual__` |
| **Scheduled** | El scheduler, por el horario | `scheduled__` |
| **Backfill** | Un reproceso de fechas pasadas | `backfill__` |
| **Asset Triggered** | La actualización de un dato | `asset_triggered__` |

Los filtros **All States** y **All Run Types** sirven para encontrar, por ejemplo, todas las corridas programadas que fallaron.

## ✅ Lo que lograste

- Lees la grilla con varias corridas.
- Sabes cuándo usar el grafo.
- Distingues los tipos de corrida.

:::ejercicio quiz
En la grilla, ¿qué indica la altura de la barra de una corrida?
- [ ] La cantidad de tareas
- [x] Cuánto tardó la corrida
- [ ] Cuántas veces se reintentó
- [ ] La fecha
:::

:::ejercicio quiz
¿Qué vista conviene para entender qué tareas corren en paralelo?
- [ ] Grid
- [x] Graph
- [ ] Calendar
- [ ] Audit Log
:::

:::ejercicio quiz
Una corrida tiene Run ID `scheduled__2026-11-15T00:00:00+00:00`. ¿Quién la creó?
- [ ] Un usuario a mano
- [x] El scheduler, por el horario del Dag
- [ ] Un backfill
- [ ] Un asset
:::

:::ejercicio quiz
¿Por qué falla disparar dos veces el mismo Dag en el mismo minuto sin cambiar la fecha lógica?
- [x] Porque no puede haber dos corridas con la misma fecha lógica
- [ ] Porque Airflow solo permite una corrida por día
- [ ] Porque el Dag se pausa solo
- [ ] Porque falta una variable
:::
