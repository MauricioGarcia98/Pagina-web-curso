---
titulo: El pedido en Jira - de un mensaje de finanzas a una story con subtareas
nivel: Intermedio
duracion: 30
resumen: Llega un pedido de finanzas por chat. Antes de tocar una sola línea de código, lo conviertes en una story de Jira bien escrita, con criterios de aceptación, subtareas, estimación y sprint. Es lo primero que se hace en un equipo de datos real, y es lo que permite que todos sepan qué estás haciendo y cuándo está terminado.
objetivos: Convertir un pedido informal en una user story con criterios de aceptación | Partir la story en subtareas técnicas | Estimar en story points y meter la story en el sprint | Mover el trabajo en el tablero a medida que avanza
prerrequisitos: sql-select
autoevaluacion: ¿Sabes escribir una story con "Como… quiero… para…"? | ¿Sabes qué son los criterios de aceptación y por qué van antes de empezar? | ¿Sabes en qué se diferencia una story de sus subtareas? | ¿Sabes por qué la story tiene que estar en el sprint?
---

:::escenario Lunes, 9:10 · canal #datos
Sofía, de finanzas: *"¿Podemos tener los pedidos de la tienda en el lago de AWS? Queremos consultarlos con Athena sin pedirle cada vez un CSV a sistemas. Lo primero que necesito es cuántos pedidos entraron por cada canal en la carga de ayer."*

Tu líder, Martín: *"Tómalo vos. Arma la story en Jira antes de arrancar."*
:::

Este proyecto recorre las herramientas de un equipo de datos, una por lección:

```diagrama
titulo: El recorrido completo del proyecto
nodo jira: Jira | icono=etiqueta | col=0 | fila=0 | color=azul | sub=la story TA-12 y sus subtareas
nodo repo: Azure Repos | icono=git | col=1 | fila=0 | color=naranja | sub=el script de carga, versionado
nodo pipe: Azure Pipelines | icono=engranaje | col=2 | fila=0 | color=azul | sub=los tests en cada cambio
nodo s3: S3 | icono=bucket | col=2 | fila=1 | color=verde | sub=los pedidos por fecha de carga
nodo glue: Glue | icono=lupa | col=1 | fila=1 | color=violeta | sub=la tabla en el catálogo
nodo ath: Athena | icono=codigo | col=0 | fila=1 | color=violeta | sub=la respuesta en SQL
flecha jira -> repo: TA-12 en el commit | paso=1 | explica=El pedido se convierte en una story de Jira. Todo el código que la resuelve nombra su clave (TA-12) en la rama y en los commits: así se rastrea qué código resolvió qué pedido.
flecha repo -> pipe: cada push | paso=2 | explica=Cada push a Azure Repos dispara el pipeline, que instala dependencias y corre los tests. Si algo se rompe, se sabe en minutos y no en producción.
flecha pipe -> s3: el script sube | paso=3 | explica=El script ya probado sube la exportación de pedidos a S3, en una carpeta por fecha de carga (fecha_carga=AAAA-MM-DD).
flecha s3 -> glue: el crawler cataloga | paso=4 | explica=Un crawler de Glue lee la carpeta y crea la tabla pedidos, con la partición fecha_carga. Los datos no se mueven.
flecha glue -> ath: SQL | paso=5 | explica=Athena consulta la tabla filtrando por la partición, así lee solo un día y cuesta menos.
flecha ath -> jira: la respuesta vuelve al ticket | paso=6 | estilo=punteada | explica=El número, su definición y la consulta vuelven como comentario en la story, que pasa a Done. El pedido queda cerrado y documentado.
```

## 1. Del mensaje a la story

Un pedido por chat no alcanza para trabajar: falta saber **para quién es**, **qué entrega exactamente** y **cómo se sabe que está terminado**. Eso es lo que ordena una *user story*.

Abre [Jira de práctica](#/jira/backlog) → botón **Create**:

| Campo | Qué poner |
|---|---|
| **Issue type** | Story |
| **Summary** | `Como finanzas, quiero los pedidos en el lago de AWS para consultarlos con Athena` |
| **Description** | El pedido de Sofía y los **criterios de aceptación** (abajo) |
| **Assignee** | Tú |
| **Parent** | La épica *Lago de datos de ventas* (`TA-1`) |

**Criterios de aceptación** (pégalos en la descripción):

```text
- Los pedidos de cada día quedan en s3://<bucket>/raw/pedidos/fecha_carga=AAAA-MM-DD/
- La carga se hace con un script versionado y probado (pipeline en verde)
- Existe la tabla pedidos en Glue, con la partición fecha_carga
- Respuesta a finanzas: pedidos por canal de la última carga, con la consulta de Athena
```

:::trabajo Por qué los criterios van antes de empezar
Si no están escritos, "terminado" significa una cosa para ti y otra para Sofía. Con los criterios, la revisión es simple: se cumplen o no. Si dudas de algo, pregúntalo como **comentario de la story**, no por privado: queda registrado para todos.
:::

## 2. Las subtareas

Abre la story → **Add subtask**, una por cada parte técnica:

1. `Script de carga a S3 con tests`
2. `Catálogo en Glue (crawler)`
3. `Consulta en Athena y respuesta a finanzas`

Después, en *Story point estimate*, estima la story (por ejemplo, **5**). Los puntos no son horas: comparan el esfuerzo con otras stories del equipo.

## 3. Al sprint y a trabajar

1. **Backlog** → arrastra la story al sprint activo (o usa *Move to*). Si no hay sprint activo, **Start sprint**.
2. **Board** → pasa la story y la primera subtarea a **In Progress**.

Tu clave (por ejemplo, **TA-12**) es la que vas a nombrar en la rama, en los commits y en el pull request. Anótala.

:::real En tu computadora y en la web real
En una empresa, esto se hace en **Jira Cloud** (`tu-empresa.atlassian.net`), con los mismos botones: *Create*, *Backlog*, *Board*. Si el equipo usa **Azure DevOps Boards** en lugar de Jira, la story es un *User Story* y las subtareas son *Tasks* (lo viste en [Azure DevOps por dentro](#/l/interfaces-azure-devops-por-dentro)). Nada de esto pasa por la terminal: es trabajo en la web, y suele llevar 10 minutos que ahorran días de malentendidos.
:::

:::capturas Capturas para tu portafolio
Guárdalas en `docs/capturas/` del repositorio y úsalas en el README.

- `01-story.png`: la story abierta, con los criterios de aceptación y las tres subtareas.
- `01-tablero.png`: el tablero del sprint con tu story en *In Progress*.

Antes de publicar, tapa los nombres reales de personas y de tu empresa si usas tu Jira de trabajo.
:::

:::errores
- **Arrancar a programar sin story**: nadie sabe que lo estás haciendo y no cuenta en el sprint.
- **Criterios vagos** ("que funcione"): no hay forma de saber cuándo terminaste.
- **Subtareas como lista de deseos**: cada una tiene que ser algo que se termina en uno o dos días.
- **Dejar la story en *To Do*** mientras trabajas: el tablero miente y nadie puede ayudarte.
:::

## Ejercicios

:::ejercicio quiz
¿Cuál es la mejor forma de escribir el pedido de Sofía como story?
- [ ] "Hacer lo de AWS"
- [ ] "Script en Python con boto3"
- [x] "Como finanzas, quiero los pedidos en el lago de AWS para consultarlos con Athena", con criterios de aceptación
- [ ] "Urgente: datos"
:::

:::ejercicio quiz
¿Para qué sirven los criterios de aceptación?
- [ ] Para estimar las horas exactas
- [x] Para acordar antes de empezar cuándo la story está terminada
- [ ] Para asignar la story a otra persona
- [ ] Solo para las épicas
:::

:::ejercicio quiz
Tu story es TA-12. ¿Dónde vas a escribir esa clave?
- [ ] Solo en Jira
- [x] En el nombre de la rama, en los mensajes de commit y en el pull request
- [ ] En el nombre del bucket de S3
- [ ] En ningún lado: Jira la encuentra solo
:::

## Resumen

- Un pedido se convierte en una **story** con "Como… quiero… para…" y **criterios de aceptación**.
- La story se parte en **subtareas** técnicas, se **estima** y entra en el **sprint**.
- La **clave** (TA-12) conecta el ticket con todo el trabajo que viene: rama, commits y pull request.
