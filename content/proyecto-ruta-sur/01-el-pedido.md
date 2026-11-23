---
titulo: El pedido - saber en tiempo real si cumplimos lo que prometemos
nivel: Avanzado
duracion: 25
resumen: Ruta Sur reparte paquetes con 250 camionetas que mandan su posición y cada entrega a un stream en tiempo real. Dirección comercial quiere saber, pedido por pedido, si se cumplió la ventana prometida, y operaciones lo quiere ver durante el día. El pedido tal como llega, sin paso a paso.
objetivos: Entender un pedido sobre datos en movimiento | Distinguir la hora del evento de la hora de llegada | Planificar con eventos tardíos, desordenados y repetidos | Combinar un stream con un sistema transaccional (el plan del día)
prerrequisitos: proyecto-mercado-vecino-el-pedido
autoevaluacion: ¿Sabes por qué un evento puede llegar horas después de ocurrir? | ¿Sabes qué es "a tiempo" en este negocio? | ¿Sabes de dónde sale la lista de pedidos de un día?
---

:::escenario Lunes, 7:45 · depósito de Ruta Sur
Las camionetas salen a las 8:00. Cada una lleva un equipo GPS que manda su posición cada 3 minutos y un evento cada vez que llega a una parada y entrega (o no puede entregar). Todo va a un Event Hubs con protocolo Kafka. El plan del día (qué pedidos lleva cada camioneta y en qué ventana se le prometió al cliente) está en el sistema de despachos, el TMS.
:::

## El pedido

> **De:** Lucía Paz (Dirección comercial)
>
> Le prometemos al cliente una ventana de 3 horas. El cliente más grande dice que llegamos tarde "siempre". Yo creo que no, pero no tengo cómo demostrarlo. Necesito, pedido por pedido, si llegamos dentro de la ventana. Y que operaciones lo pueda ver durante el día, no al día siguiente.

> **De:** Operaciones
>
> Además queremos guardar la telemetría: hoy solo la vemos en vivo en el mapa del proveedor y después se pierde.

## Lo que tienes

| Sistema | Qué es | Cómo llegas |
|---|---|---|
| **Telemetría** | Event Hubs (Kafka), tópico `rutasur.telemetria`, 8 particiones, retención 3 días | `kcat` o `read_kafka` en Databricks |
| **TMS** | API REST con el plan de rutas de cada día | `curl`, Python o Data Factory |
| **Herramientas** | Portal de Azure, Databricks (con tablas de streaming), Airflow, Power BI | Las de práctica |

## Lo que hay que entregar

| Tabla | Qué es |
|---|---|
| `ruta.silver.telemetria` | Un registro por evento (sin repetidos), con un esquema único |
| `ruta.gold.entregas` | Un registro por pedido del plan: estado (completada, fallida o sin evento) y si llegó **a tiempo** |

Después, en [El día a día](#/l/proyecto-ruta-sur-el-dia-a-dia), llegan más pedidos, incidentes y preguntas.

:::trabajo Dos relojes
Cada evento tiene **dos horas**: cuándo pasó (la que reporta el dispositivo) y cuándo llegó al stream (la que pone Event Hubs). Casi siempre se diferencian en segundos. Pero una camioneta en una zona sin señal guarda los eventos y los manda juntos cuando vuelve la señal: llegan tarde y mezclados. Para el negocio importa **cuándo pasó**; para saber si ya tienes todo, importa **cuándo llegó**.
:::

## Cómo se trabaja: el proyecto RS en Jira

En una empresa nadie trabaja "desde un correo": cada pedido es un **ticket** con dueño, estado, fecha y criterios de aceptación. Trabajas en una consultora de datos y Ruta Sur es un cliente, así que tiene su propio proyecto de Jira con la clave **RS**: lo abres en [Jira → Projects → Ruta Sur](#/jira/projects/RS/board).

```diagrama
titulo: El recorrido de un ticket de Ruta Sur, de punta a punta
nodo pide: El negocio pide | icono=usuario | col=0 | fila=0 | color=gris | sub=Lucía Paz · Dirección comercial
nodo todo: To Do | icono=list | col=1 | fila=0 | color=gris | sub=al sprint en curso, sin asignar
nodo prog: In Progress | icono=engranaje | col=2 | fila=0 | color=azul | sub=Assign to me
nodo code: Commits con la clave | icono=git | col=2 | fila=1 | color=violeta | sub=git commit -m "RS-101 …"
nodo rev: In Review | icono=lupa | col=3 | fila=0 | color=naranja | sub=el líder revisa
nodo done: Done | icono=check | col=4 | fila=0 | color=verde | sub=cumple los criterios
flecha pide -> todo | explica=Cada pedido del negocio llega como una issue de RS: requerimientos como Story, incidentes como Bug con prioridad Highest y vencimiento al día siguiente, preguntas como Task. Entra al sprint en curso y sin responsable.
flecha todo -> prog | explica=Lo tomas con Assign to me y lo pasas a In Progress. Así el equipo sabe quién está con qué y nadie hace el mismo trabajo dos veces.
flecha prog -> code | explica=Cada commit nombra la clave del ticket. Con smart commits también comenta (#comment), registra tiempo (#time 2h) y cambia el estado (#in-review) cuando haces git push.
flecha code -> rev | explica=Cuando crees que está listo, lo pasas a In Review.
flecha rev -> done: cumple | explica=El líder técnico lo revisa contra los criterios de aceptación escritos en el ticket. Si cumple, lo pasa a Done y lo comenta.
flecha rev -> prog: falta algo | estilo=punteada | color=rojo | explica=Si falta algo, lo devuelve a In Progress con un comentario que dice exactamente qué. Es lo normal: se corrige y se vuelve a pasar a In Review.
```

| Tipo de ticket | En Jira | Cómo se cierra |
|---|---|---|
| 📋 Requerimiento ("necesito una tabla con…") | **Story** con story points y épica *Entrega* | Pásalo a **In Review**: el líder corre los criterios de aceptación y lo aprueba o lo devuelve con un comentario |
| 🔥 Incidente ("el tablero está mal desde ayer") | **Bug** con prioridad *Highest* y vencimiento al día siguiente | Igual que un requerimiento, pero primero: es lo urgente del sprint |
| ❓ Pregunta del negocio ("¿cuánto fue…?") | **Task** con la etiqueta *consulta-negocio* | Responde con un **comentario** en la issue. Quien preguntó lo verifica: si coincide, agradece y lo cierra; si no, te dice qué no le cierra |

Las búsquedas que más vas a usar en este proyecto:

```sql norun
project = RS AND assignee = currentUser() AND statusCategory != Done ORDER BY priority DESC
project = RS AND type = Bug AND resolution = Unresolved
project = RS AND labels = consulta-negocio AND status != Done
```

:::trabajo Un día normal en Ruta Sur
Empieza en el **Board** de RS: ¿llegó algo nuevo? ¿hay un Bug *Highest*? En la reunión diaria cuentas qué cerraste, qué vas a hacer y qué te traba (si algo te traba, ponle un **flag** a la tarjeta). Trabaja de a un ticket: tómalo, nombra la clave en cada commit y, cuando esté listo, pásalo a In Review. Al final del sprint, el **Sprint report** muestra lo entregado y lo que llegó a mitad de camino (marcado con un asterisco): de eso se habla en la retrospectiva.
:::

:::real En tu computadora y en la web real
En una empresa de logística, el pedido llega del área de operaciones. Antes de programar, escribe en `docs/sla.md` qué significa "cumplir" (¿llegar dentro de la ventana?, ¿con qué tolerancia?, ¿en qué zona horaria?) y valídalo con quien pidió el tablero.
:::

:::capturas Capturas para tu portafolio
Guárdalas en `docs/capturas/` del repositorio del proyecto y úsalas en el README.

- `01-sla.png`: tu definición de SLA, aprobada.

Antes de publicar, tapa con un rectángulo los correos, los IDs de suscripción y de tenant, los nombres de cuentas reales y cualquier clave o token.
:::

## Ejercicios

:::ejercicio quiz
Una entrega se completó a las 11:50 (ventana 9:00–12:00), pero el evento llegó al stream a las 12:40. ¿Fue a tiempo?
- [x] Sí: lo que cuenta es cuándo pasó; la demora es de la transmisión, no de la entrega
- [ ] No, porque llegó después de las 12:00
- [ ] Depende de la partición
- [ ] No se puede saber
:::

:::ejercicio quiz
¿Por qué no alcanza con contar los eventos entrega_completada para saber qué porcentaje llegó a tiempo?
- [ ] Porque hay que contar los pings
- [x] Porque el total son los pedidos del plan (del TMS): los fallidos y los que no tienen evento también cuentan, y no aparecen como completados
- [ ] Porque los eventos están en UTC
- [ ] Porque hay 8 particiones
:::

## Resumen

- Un stream de telemetría con **dos relojes** y un sistema transaccional con el **plan**.
- Entrega: telemetría limpia y entregas con estado y a tiempo, por pedido.
- Lo difícil: eventos **tardíos, desordenados y repetidos**.
