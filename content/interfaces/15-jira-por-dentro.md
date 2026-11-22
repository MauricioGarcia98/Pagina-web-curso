---
titulo: Jira por dentro - backlog, sprints, tablero y JQL en un equipo de datos
nivel: Básico-intermedio
duracion: 35
resumen: Jira es la herramienta de tickets más usada en las empresas. En tu primer trabajo, lo más probable es que tus tareas lleguen ahí. Recorrido por un proyecto Scrum: el backlog con sprints, el tablero, cada issue con su clave (TA-12), las estimaciones, la búsqueda con JQL y los reportes que mira el equipo en cada retrospectiva.
objetivos: Leer una issue - tipo, clave, estado, responsable, prioridad, story points y épica | Planificar un sprint desde el backlog e iniciarlo con un objetivo | Mover el trabajo en el tablero y completar el sprint | Buscar con JQL - currentUser(), openSprints(), IN, ~, ORDER BY | Leer el burndown y la velocidad
prerrequisitos: cero-tu-computadora
autoevaluacion: ¿Sabes qué es TA-12? | ¿Sabes la diferencia entre el backlog y un sprint? | ¿Sabes escribir en JQL "mis issues abiertas, primero las urgentes"? | ¿Sabes qué pasa con lo que no se terminó al completar un sprint? | ¿Sabes qué dice el burndown?
---

:::tip Practícalo mientras lees
Abre [Jira de práctica](#/jira/backlog). Es un proyecto Scrum del equipo de datos de Tienda Andina, con un sprint en curso. No necesitas cuenta de Atlassian. Si tu empresa usa [Azure DevOps](#/azure-devops/tienda-andina/boards), las mismas ideas tienen otros nombres.
:::

:::analogia En palabras simples
Jira es la pizarra del equipo, pero ordenada. Cada pedido es una tarjeta con número (*TA-12*). Cada tarjeta dice quién la tiene, qué tan urgente es y en qué estado está. El equipo trabaja en tandas de dos semanas (*sprints*): al empezar elige qué tarjetas entran, y al terminar mira qué cumplió.
:::

## Una issue

Todo en Jira es una **issue**. Su **clave** junta el proyecto y un número (`TA-12`). Se nombra así en todos lados: en el chat, en las reuniones y en los mensajes de commit.

| Campo | Qué dice |
|---|---|
| **Tipo** | *Epic* (iniciativa grande), *Story* (algo con valor para alguien), *Task* (trabajo técnico), *Bug* (algo roto), *Subtask* (una parte de otra issue) |
| **Status** | *To Do → In Progress → In Review → Done* |
| **Assignee** | Quién la tiene ahora. Si está vacío, nadie se hizo cargo |
| **Priority** | *Highest* a *Lowest*. Un bug en producción suele ser *Highest* |
| **Story points** | Cuánto esfuerzo se estima, en relación con otras issues (1, 2, 3, 5, 8…) |
| **Parent (epic)** | A qué iniciativa pertenece |

:::trabajo Una story bien escrita
"Como **analista**, quiero **los pedidos de ayer en silver antes de las 7:00**, para **preparar la reunión diaria**." Debajo van los **criterios de aceptación**: cómo se sabe que está terminada (el job corre a las 6:00, la cuenta de control cierra). Si no están, pregúntalos en un comentario de la issue **antes** de empezar.
:::

## Backlog y sprints

```diagrama
titulo: El ciclo de un sprint
nodo bl: Backlog | icono=archivos | col=0 | fila=0 | sub=todo lo pendiente, priorizado
nodo pl: Planificación | icono=calendario | col=1 | fila=0 | color=azul | sub=qué entra y el objetivo
nodo tb: Tablero | icono=dashboard | col=2 | fila=0 | color=verde | sub=el trabajo de cada día
nodo cp: Completar el sprint | icono=check | col=2 | fila=1 | color=violeta | sub=lo terminado queda, lo abierto se mueve
nodo re: Retrospectiva | icono=grafico | col=1 | fila=1 | color=naranja | sub=burndown y velocidad
flecha bl -> pl: se eligen issues | paso=1 | explica=El equipo arrastra issues del backlog al sprint, mirando la velocidad para no comprometer de más, y le pone un objetivo.
flecha pl -> tb: Start sprint | paso=2 | explica=Al iniciar el sprint (una o dos semanas), sus issues aparecen en el tablero.
flecha tb -> cp: dos semanas | paso=3 | explica=Cada día las tarjetas avanzan de columna. Al final, Complete sprint.
flecha cp -> re: se revisa | paso=4 | explica=Lo que no se terminó pasa al sprint siguiente o vuelve al backlog. El burndown y la velocidad muestran cómo le fue al equipo.
flecha re -> bl: se ajusta | paso=5 | estilo=punteada | explica=Con lo aprendido, se repriorizan el backlog y el próximo compromiso.
```

1. **Backlog**: arriba, el sprint en curso; debajo, el siguiente; al final, todo lo pendiente. Arrastras una issue de un lugar a otro (o usas *Move to*).
2. **Start sprint**: elige la duración y escribe el **objetivo** del sprint: qué valor entrega el equipo al terminar.
3. **Complete sprint**: Jira cuenta lo terminado y pregunta adónde van las issues abiertas.

```captura
archivo: jira/j01-backlog.webp
texto: El backlog: el sprint en curso con su objetivo, el próximo sprint y lo pendiente
```

## El tablero

Una columna por estado. Mueves la tarjeta cuando cambia su estado. Los avatares de arriba filtran por persona: en la reunión diaria, cada uno mira sus tarjetas.

Lo que el tablero agrega encima de eso (todo está en la réplica, en **Configure board**):

| Función | Qué hace | Por qué importa |
|---|---|---|
| **Column constraints** (límites WIP) | Un mínimo y un máximo de issues por columna. La cabecera se pone roja si se pasa del máximo y amarilla si no llega al mínimo. Para Scrum se recomienda *Work item count, excluding subtasks* | Limitar lo que está "en curso" obliga a terminar antes de empezar otra cosa. Los límites cuentan todas las issues de la columna, aunque un filtro las oculte |
| **Quick filters** | Botones con una consulta JQL: *Only My Issues* (`assignee = currentUser()`), *Recently Updated* (`updatedDate >= -1d`) y los que crees. Activar varios los combina con AND | En la reunión diaria, filtras lo tuyo o lo que cambió desde ayer con un clic |
| **Swimlanes** | Filas por historia (con sus subtareas), por persona, por épica o por consulta JQL (por ejemplo *Expedite*: `priority = Highest`). Lo que no coincide va a *Everything Else* | Ves de un vistazo qué está trabado en cada historia o quién tiene demasiado |
| **Flag** | En el menú ••• de la tarjeta: *Add flag*. La tarjeta queda amarilla para todo el equipo. Se busca con `Flagged = Impediment` | Es la forma de decir "estoy trabado" sin esperar a la reunión |
| **Linked work items** | Vínculos *blocks / is blocked by*, *relates to*, *duplicates*, *clones*, *causes* | Saber que TA-7 no puede empezar hasta que se cierre TA-6 cambia el orden del sprint |

```captura
archivo: jira/j02-tablero.webp
texto: El tablero del sprint: To Do, In Progress, In Review y Done
```

## JQL: buscar como un profesional

**Issues** (o *Filters*) acepta **JQL**, un lenguaje parecido a SQL para buscar issues:

```sql norun
assignee = currentUser() AND status != Done ORDER BY priority DESC
```

| Quiero… | JQL |
|---|---|
| Mis issues abiertas, primero las urgentes | `assignee = currentUser() AND status != Done ORDER BY priority DESC` |
| Lo del sprint en curso | `sprint in openSprints()` |
| Los bugs graves | `type = Bug AND priority in (Highest, High)` |
| Lo que nadie tomó | `assignee is EMPTY` |
| Lo que menciona "silver" | `text ~ "silver"` |
| Las historias grandes | `"story points" >= 5 ORDER BY "story points" DESC` |
| Lo que cambió en las últimas 24 horas | `updated >= -24h` |
| Lo creado esta semana | `created >= startOfWeek()` |
| Lo vencido y sin resolver | `due < now() AND resolution = Unresolved` |
| Lo que alguna vez estuvo en progreso | `status WAS "In Progress"` |
| A quién le subieron la prioridad, y quién | `priority CHANGED FROM High TO Highest BY martin` |
| Lo que está trabado | `Flagged = Impediment` |
| Lo que bloquea a otras issues | `issueLinkType = blocks` |
| Lo vinculado a una issue | `issue in linkedIssues(TA-6)` |

Tres reglas que confunden a casi todos al principio:

- **AND se evalúa antes que OR.** `status = Done AND type = Bug OR priority = Highest` trae los bugs terminados *y además* todo lo Highest. Usa paréntesis.
- **`!=` y `NOT IN` no traen las issues con el campo vacío.** `assignee != camila` no muestra las issues sin asignar; si las quieres, agrega `OR assignee IS EMPTY`.
- **Los campos de texto usan `~`, no `=`.** `summary = silver` da error; `summary ~ silver` busca la palabra.

Una búsqueda útil se guarda con **Save filter** y se usa en tableros y suscripciones por correo. Si escribes mal un campo, Jira te lo dice: *Field 'foo' does not exist*.

## Los reportes

- **Burndown**: puntos que faltan día a día, contra la línea ideal. Si la línea roja va por encima de la gris, el sprint viene atrasado.
- **Velocity**: puntos comprometidos y completados en cada sprint. El promedio de completados (la *velocidad*) sirve para planificar el próximo sin comprometer de más.
- **Sprint report**: lo completado y lo no completado del sprint. Un asterisco marca lo que se agregó después de empezar, y `3 → 5` muestra una estimación que cambió en el camino: las dos cosas son tema de la retrospectiva.
- **Cumulative flow diagram**: una banda por columna a lo largo del tiempo. Si la banda de *In Progress* se ensancha, entra más trabajo del que sale: hay un cuello de botella.

```captura
archivo: jira/j03-velocidad.webp
texto: El reporte de velocidad: comprometido y completado por sprint
```

## Jira y el código

Escribe la clave en el nombre de la rama y en el mensaje del commit:

```bash
git checkout -b TA-6-agregar-mexico
git commit -m "TA-6 Agrega México a PAISES"
```

Con la integración de GitHub, Bitbucket o GitLab activada, la issue muestra la rama, los commits y el pull request. Cualquiera puede rastrear qué código resolvió qué pedido.

Con los **smart commits**, el mensaje del commit además actúa sobre la issue cuando llega al repositorio remoto:

```bash
git commit -m "TA-7 Total por canal #comment Listo para revisar #time 1h 30m #in-review"
git push
```

| Comando | Qué hace |
|---|---|
| `#comment texto` | Agrega un comentario |
| `#time 1w 2d 4h 30m` | Registra tiempo trabajado (1w = 5 días, 1d = 8 horas) |
| `#in-review`, `#done`… | Cambia el estado. Si el nombre tiene espacios, va con guiones; la primera palabra sola sirve solo si no es ambigua (`#in` no sirve, porque hay *In Progress* e *In Review*) |

Todo va en una línea y una línea sin clave no hace nada. En una empresa, el email del commit (`git config user.email`) tiene que coincidir con tu usuario de Jira: es la causa más común de que un smart commit no funcione. En la réplica, el resultado de cada comando aparece en **Code**.

## Qué tiene la réplica y qué no

| En la réplica | Todavía no |
|---|---|
| Backlog con sprints (crear, iniciar con fechas, completar hacia el backlog, un sprint futuro o uno nuevo), tablero con arrastre, filtro por persona, límites WIP, quick filters, swimlanes y flag | Tableros Kanban sin sprints, sprints paralelos |
| Issues con tipo, estado, responsable, informante, prioridad, puntos, épica, subtareas, etiquetas, vencimiento, resolución, vínculos, registro de trabajo, comentarios e historial | Campos personalizados, flujos de trabajo editables, adjuntos |
| JQL con AND/OR/NOT, todos los operadores (incluidos `WAS` y `CHANGED`), fechas relativas y las funciones más usadas | Dashboards, suscripciones por correo |
| Burndown, sprint report, velocidad y cumulative flow; smart commits desde la terminal | Automatizaciones (Automation for Jira) |

:::practica jira Un sprint completo
1. En el **Backlog**, abre `TA-7`, estímala y asígnatela.
2. En el **Board**, lleva tus issues hasta *Done*.
3. Busca con JQL tus issues abiertas ordenadas por prioridad y guarda el filtro.
4. **Complete sprint**: mueve lo abierto al Sprint 2 y mira la velocidad.
5. Inicia el Sprint 2 con un objetivo y mira el burndown.

6. En **Configure board**, pon un máximo de 2 en *In Progress* y mira qué pasa cuando lo superas.
7. Marca con flag una issue trabada y vincúlala con la que la bloquea.
8. Desde la terminal, haz un commit con `TA-7 #comment … #time 1h #in-review`, empújalo y mira **Code**.

Documentación oficial: [usar el backlog](https://support.atlassian.com/jira-software-cloud/docs/use-your-scrum-backlog/) · [JQL](https://support.atlassian.com/jira-service-management-cloud/docs/use-advanced-search-with-jira-query-language-jql/) · [operadores](https://support.atlassian.com/jira-software-cloud/docs/jql-operators/) · [palabras clave](https://support.atlassian.com/jira-software-cloud/docs/jql-keywords/) · [columnas y límites](https://support.atlassian.com/jira-software-cloud/docs/configure-columns/) · [quick filters](https://support.atlassian.com/jira-software-cloud/docs/configure-quick-filters/) · [swimlanes](https://support.atlassian.com/jira-software-cloud/docs/configure-swimlanes/) · [flag](https://support.atlassian.com/jira-software-cloud/docs/flag-an-issue/) · [vincular issues](https://support.atlassian.com/jira-software-cloud/docs/link-issues/) · [smart commits](https://support.atlassian.com/jira-software-cloud/docs/process-issues-with-smart-commits/) · [sprint report](https://support.atlassian.com/jira-software-cloud/docs/view-and-understand-the-sprint-report/) · [cumulative flow](https://support.atlassian.com/jira-software-cloud/docs/view-and-understand-the-cumulative-flow-diagram/) · [burndown](https://support.atlassian.com/jira-software-cloud/docs/view-and-understand-the-burndown-chart/)
:::

:::errores
- **Trabajar en algo que no está en Jira**: nadie sabe que lo estás haciendo y no cuenta en el sprint.
- **Empezar una story sin criterios de aceptación**: no hay forma de saber cuándo está terminada.
- **Dejar la issue en *To Do* mientras trabajas**: el tablero miente y el equipo no puede ayudarte.
- **Meter más puntos de los que dice la velocidad**: el sprint termina con la mitad sin hacer.
- **Usar `!=` esperando ver las issues vacías**: `assignee != camila` no trae las sin asignar.
- **Un smart commit con `#in`**: es ambiguo entre *In Progress* e *In Review*; escribe `#in-progress`.
:::

## Ejercicios

:::ejercicio quiz
¿Qué es `TA-12`?
- [ ] El sprint número 12
- [x] La clave de una issue: proyecto TA, número 12
- [ ] Una rama de Git
- [ ] El responsable de la tarea
:::

:::ejercicio quiz
¿Qué JQL devuelve tus issues sin terminar, primero las más urgentes?
- [ ] `status = Done AND assignee = me`
- [x] `assignee = currentUser() AND status != Done ORDER BY priority DESC`
- [ ] `SELECT * FROM issues WHERE mine`
- [ ] `priority = Highest`
:::

:::ejercicio quiz
Completas un sprint con dos issues abiertas. ¿Qué pasa con ellas?
- [ ] Se borran
- [ ] Se marcan como Done
- [x] Pasan al sprint siguiente o vuelven al backlog, según elijas
- [ ] Se quedan en el sprint cerrado sin terminar para siempre
:::

:::ejercicio quiz
En el burndown, la línea de puntos pendientes va muy por encima de la línea ideal a mitad del sprint. ¿Qué significa?
- [ ] Que el equipo va adelantado
- [x] Que el sprint viene atrasado: quedan más puntos de los que debería
- [ ] Que hay que agregar más issues al sprint
- [ ] Nada: el burndown solo importa el último día
:::

:::ejercicio quiz
Quieres ver las issues que **no** están asignadas a Camila, incluidas las que no tienen responsable. ¿Qué JQL usas?
- [ ] `assignee != camila`
- [x] `assignee != camila OR assignee IS EMPTY`
- [ ] `assignee NOT IN (camila)`
- [ ] `NOT assignee = camila`
:::

:::ejercicio quiz
Tu commit dice `TA-7 #in Empecé la consulta` y el estado de TA-7 no cambia. ¿Por qué?
- [ ] Porque los smart commits solo funcionan en GitHub
- [ ] Porque falta `#comment`
- [x] Porque `#in` es ambiguo: hay dos estados que empiezan con "In" y hay que escribir `#in-progress`
- [ ] Porque el commit no se hizo en la rama main
:::

## Resumen

- Todo es una **issue** con clave (`TA-12`), tipo, estado, responsable, prioridad y puntos.
- El **backlog** tiene lo pendiente. Un **sprint** es lo que el equipo se compromete a terminar en una o dos semanas, con un objetivo.
- El **tablero** muestra el día a día. Al **completar el sprint**, lo abierto pasa al siguiente.
- **JQL** busca issues con campos, operadores, funciones (`currentUser()`, `openSprints()`) y `ORDER BY`.
- **Burndown** y **velocidad** muestran cómo va el sprint y cuánto suele terminar el equipo.
