---
titulo: Issues - registrar tareas y errores, etiquetar, asignar y cerrar desde un commit
nivel: 2 · Básico-intermedio
duracion: 40
resumen: Los issues son la lista de trabajo de un repositorio. Cómo escribir un issue que se entienda (título, contexto, pasos, criterio de terminado), usar listas de tareas, etiquetas y responsables, comentar, buscar con filtros y cerrar un issue automáticamente desde un pull request con Closes #n.
objetivos: Escribir un issue claro con contexto y criterio de terminado | Usar listas de tareas, etiquetas y responsables | Buscar issues con filtros | Cerrar un issue automáticamente desde un PR o un commit con Closes #n | Saber cuándo un issue es demasiado grande
prerrequisitos: github-clonar-y-subir
autoevaluacion: ¿Sabes qué tiene un buen issue? | ¿Sabes asignarte un issue? | ¿Sabes buscar los bugs abiertos? | ¿Sabes cerrar un issue sin entrar a GitHub?
---

:::analogia En palabras simples
Un issue es una tarjeta del tablero de tareas del equipo: dice qué hay que hacer o qué está roto, quién lo tiene y en qué estado está. La diferencia con un mensaje de chat es que queda registrado, se puede buscar y se cierra solo cuando el código que lo resuelve se fusiona.
:::

## Paso 1 — Un issue nuevo

En tu repositorio `ventas-app` → pestaña **Issues** → **New issue**:

```captura
archivo: github/g06-issue-nuevo.webp
texto: El título (1), la descripción con una lista de tareas (2) y la barra lateral con responsable y etiqueta (3)
```

| Parte | Cómo |
|---|---|
| **Título** | Qué hay que hacer, en una línea: `Agregar el script de resumen de ventas` |
| **Descripción** | Contexto, qué se espera y cómo se sabe que está terminado |
| **Lista de tareas** | `- [ ] Leer el CSV` crea casillas que se tildan |
| **Assignees** | Quién lo tiene (ruedita → tu usuario) |
| **Labels** | `bug`, `enhancement`, `documentation`… |

Presiona **Create**:

```captura
archivo: github/g06-issue.webp
texto: El issue #1 abierto, con su lista de tareas, responsable y etiqueta
```

El número (`#1`) es su identificador: se usa para mencionarlo en commits, PRs y otros issues.

## Paso 2 — Qué tiene un buen issue

| Débil | Útil |
|---|---|
| "No anda" | "El ETL no incluye pedidos de México desde el 2024-10-01" |
| (sin descripción) | Qué pasa, qué debería pasar, cómo reproducirlo |
| "Mejorar el script" | "Agregar ticket promedio por canal al resumen; terminado cuando el CSV tenga la columna `ticket`" |

Para un **bug**: qué hiciste, qué esperabas, qué pasó (con el mensaje de error) y en qué versión o commit. Para una **mejora**: el problema que resuelve y el criterio de terminado.

:::tip Un issue, una cosa
Si la lista de tareas tiene diez casillas de temas distintos, son varios issues. Issues chicos se terminan, se revisan y se cierran; los gigantes quedan abiertos para siempre.
:::

## Paso 3 — Cerrar desde un pull request

Si un commit o la descripción de un PR dice **`Closes #1`** (también `Fixes #1` o `Resolves #1`), cuando ese PR se fusiona en `main`, GitHub **cierra el issue solo** y deja el enlace entre los dos. En el nivel 3 lo vas a ver pasar:

```captura
archivo: github/g06-issue-cerrado.webp
texto: El issue #1 cerrado automáticamente al fusionar el pull request que decía Closes #1
```

## Paso 4 — Buscar issues

El buscador de la pestaña Issues acepta filtros:

| Filtro | Muestra |
|---|---|
| `is:issue is:open` | Los abiertos |
| `label:bug` | Los que tienen esa etiqueta |
| `assignee:@me` | Los asignados a ti |
| `author:camila` | Los que abrió camila |
| `is:closed` | Los cerrados |

Se combinan: `is:open label:bug assignee:@me`.

## Paso 5 — Comentar y mencionar

En los comentarios puedes mencionar a alguien con `@camila` (le llega una notificación) y a otro issue o PR con `#2`. En el repositorio del equipo, si comentas un issue, Camila o Martín responden.

## ✅ Lo que lograste

- Escribes issues claros con tareas, etiquetas y responsables.
- Buscas issues con filtros.
- Sabes cerrar un issue automáticamente desde un PR.

:::ejercicio quiz
¿Qué escribes en la descripción de un PR para que cierre el issue #7 al fusionarse?
- [ ] `Issue 7`
- [x] `Closes #7`
- [ ] `@7`
- [ ] `#close 7`
:::

:::ejercicio quiz
¿Cuál es el mejor título para un issue?
- [ ] "Error"
- [ ] "Ayuda urgente"
- [x] "El resumen de ventas cuenta los pedidos cancelados"
- [ ] "Script"
:::

:::ejercicio quiz
¿Qué filtro muestra los bugs abiertos asignados a ti?
- [ ] `bug me open`
- [x] `is:open label:bug assignee:@me`
- [ ] `label:me is:bug`
- [ ] `assignee:bug`
:::
