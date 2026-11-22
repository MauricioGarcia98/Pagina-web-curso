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

Una búsqueda útil se guarda con **Save filter** y se usa en tableros y suscripciones por correo. Si escribes mal un campo, Jira te lo dice: *Field 'foo' does not exist*.

## Los reportes

- **Burndown**: puntos que faltan día a día, contra la línea ideal. Si la línea roja va por encima de la gris, el sprint viene atrasado.
- **Velocity**: puntos comprometidos y completados en cada sprint. El promedio de completados (la *velocidad*) sirve para planificar el próximo sin comprometer de más.

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

## Qué tiene la réplica y qué no

| En la réplica | Todavía no |
|---|---|
| Backlog con sprints (crear, iniciar, completar), tablero con arrastre y filtro por persona | Tableros Kanban sin sprints, límites de WIP, swimlanes |
| Issues con tipo, estado, responsable, prioridad, puntos, épica, subtareas, etiquetas, comentarios y actividad | Campos personalizados, flujos de trabajo editables, adjuntos |
| JQL con AND/OR, IN, ~, IS EMPTY, currentUser(), openSprints() y ORDER BY | Funciones avanzadas (`updatedDate`, `WAS`, `CHANGED`), dashboards |
| Burndown y velocidad | Informe de sprint, cumulative flow, automatizaciones |

:::practica jira Un sprint completo
1. En el **Backlog**, abre `TA-7`, estímala y asígnatela.
2. En el **Board**, lleva tus issues hasta *Done*.
3. Busca con JQL tus issues abiertas ordenadas por prioridad y guarda el filtro.
4. **Complete sprint**: mueve lo abierto al Sprint 2 y mira la velocidad.
5. Inicia el Sprint 2 con un objetivo y mira el burndown.

Documentación oficial: [usar el backlog](https://support.atlassian.com/jira-software-cloud/docs/use-your-scrum-backlog/) · [JQL](https://support.atlassian.com/jira-service-management-cloud/docs/use-advanced-search-with-jira-query-language-jql/) · [burndown](https://support.atlassian.com/jira-software-cloud/docs/view-and-understand-the-burndown-chart/)
:::

:::errores
- **Trabajar en algo que no está en Jira**: nadie sabe que lo estás haciendo y no cuenta en el sprint.
- **Empezar una story sin criterios de aceptación**: no hay forma de saber cuándo está terminada.
- **Dejar la issue en *To Do* mientras trabajas**: el tablero miente y el equipo no puede ayudarte.
- **Meter más puntos de los que dice la velocidad**: el sprint termina con la mitad sin hacer.
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

## Resumen

- Todo es una **issue** con clave (`TA-12`), tipo, estado, responsable, prioridad y puntos.
- El **backlog** tiene lo pendiente. Un **sprint** es lo que el equipo se compromete a terminar en una o dos semanas, con un objetivo.
- El **tablero** muestra el día a día. Al **completar el sprint**, lo abierto pasa al siguiente.
- **JQL** busca issues con campos, operadores, funciones (`currentUser()`, `openSprints()`) y `ORDER BY`.
- **Burndown** y **velocidad** muestran cómo va el sprint y cuánto suele terminar el equipo.
