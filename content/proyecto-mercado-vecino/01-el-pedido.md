---
titulo: El pedido - finanzas no confía en los números de ventas
nivel: Avanzado
duracion: 30
resumen: Empiezas en Mercado Vecino, un marketplace de comercios de barrio. Finanzas tiene un problema concreto - lo que dice la base de pedidos, lo que cobró la pasarela y lo que llegó al banco no coinciden - y te pide resolverlo. Esta página es el pedido tal como llega en un trabajo - el contexto, lo que hay que entregar, los criterios de aceptación y los plazos. No hay paso a paso.
objetivos: Leer un pedido de negocio y separar lo que se pide de lo que se supone | Identificar qué fuente tiene la verdad para cada dato | Entender los criterios de aceptación antes de empezar a construir | Planificar el trabajo sobre fuentes que cambian mientras trabajas
prerrequisitos: proyecto-pedalia-el-encargo
autoevaluacion: ¿Sabes por qué la base de la app no alcanza para conciliar con la pasarela? | ¿Sabes qué es un pago "cobrado y cancelado" y por qué le importa a finanzas? | ¿Sabes qué significa que una fuente esté "viva"? | ¿Sabes qué tienes que entregar y cómo se va a revisar?
---

:::escenario Martes, 10:00 · tu primer día en Mercado Vecino
Mercado Vecino conecta a 12 comercios de barrio (almacén, verdulería, carnicería, ferretería…) con vecinos que compran desde la app. Hace tres días la empresa cambió de pasarela de pagos: dejó **CobroSur** y pasó a **PagoYa**. Desde entonces finanzas cierra el día con una planilla y nunca le da. El ingeniero que armaba los reportes se fue a otra empresa la semana pasada y dejó unas notas. Te sientas, abres el correo y está esto.
:::

## El correo

> **De:** Valentina Ruiz (Finanzas)
> **Para:** equipo de datos
> **Asunto:** Conciliación con PagoYa — urgente
>
> Hola. Necesitamos dejar de cerrar el día a mano.
>
> Cada mañana comparamos tres cosas: los pedidos pagados que muestra el panel de la app, lo que PagoYa dice que cobró, y la plata que efectivamente llega al banco (la **liquidación**). Nunca coinciden y no sabemos por qué. Algunas cosas que ya vimos:
>
> - Hay clientes que pagaron un pedido que la app muestra como **cancelado**. ¿Les devolvimos la plata?
> - PagoYa nos descontó **contracargos** de pedidos que en el panel no aparecen. Como si no existieran.
> - Los días no cierran: lo que se cobra un día no llega al banco el día siguiente, a veces llega dos días después.
> - El panel de la app a veces dice "pagado" y a veces no, para el mismo pedido, según cuándo lo miremos.
>
> Lo que necesitamos: **una tabla con cada pago aprobado de PagoYa, a qué pedido corresponde, en qué estado está el pedido, si ya se liquidó, y una categoría que nos diga qué hacer** (nada, devolver la plata, reclamar, investigar). La queremos todos los días, sin tocar nada.
>
> Ah, y legales nos recordó que cuando un cliente pide que borremos sus datos, eso tiene que llegar a todas las copias. Incluidas las de ustedes.
>
> Gracias, Valentina.

## Lo que tienes a disposición

El equipo de plataforma ya te dio acceso a tres sistemas. Los tres son **fuentes vivas**: la tienda vende mientras trabajas, el CDC publica cambios cada pocos segundos y PagoYa manda webhooks a medida que pasan cosas. Lo que consultes ahora va a ser distinto en diez minutos.

| Sistema | Qué es | Cómo llegas |
|---|---|---|
| **Base operacional** (PostgreSQL) | Clientes, comercios, productos, pedidos e ítems. Es la base de la app | Réplica de **solo lectura**, con `psql` |
| **CDC** (Debezium → Event Hubs) | Cada INSERT, UPDATE y DELETE de la base, en orden, como mensajes Kafka | `kcat` en la terminal, o `read_kafka` en Databricks |
| **PagoYa** | La pasarela: pagos, reembolsos, disputas y liquidaciones | API REST, webhooks firmados que llegan al lago, y un reporte de liquidación por día |

Además tienes el portal de Azure, el Databricks y la terminal de práctica, como en el proyecto de Pedalia. La documentación de cada fuente y tus credenciales están en la página siguiente: [Fuentes y accesos](#/l/proyecto-mercado-vecino-fuentes-y-accesos).

## Lo que hay que entregar

Cuatro tablas en el catálogo `mercado` del Databricks de práctica. El detalle de columnas está en [La entrega](#/l/proyecto-mercado-vecino-la-entrega).

| Tabla | Qué tiene que tener | Por qué |
|---|---|---|
| `mercado.silver.pedidos` | **Todos** los pedidos de la base, con su estado actual, construida con un snapshot inicial + el CDC aplicado encima | Es la verdad de la app, pero sin consultar producción cada vez |
| `mercado.silver.clientes` | Todos los clientes, con el **derecho al olvido** aplicado | Legales |
| `mercado.silver.pagoya_eventos` | Los eventos de PagoYa (pagos aprobados, reembolsos, disputas), **uno por evento**, sin los falsos | Los webhooks llegan repetidos, desordenados y alguno no es de PagoYa |
| `mercado.gold.conciliacion` | Un registro por **pago aprobado** en un día ya cerrado, con su pedido, su categoría y la fecha en que se liquidó | Lo que pidió Valentina |

### Las categorías (acordadas con finanzas)

Cada pago aprobado lleva **una sola** categoría. Si aplican varias, gana la primera de esta lista:

| Categoría | Cuándo | Qué hace finanzas |
|---|---|---|
| `contracargo` | El cliente desconoció el pago con su banco y PagoYa **perdió** la disputa | Lo registra como pérdida |
| `en_disputa` | Hay una disputa abierta (todavía sin resolver) | Junta pruebas de entrega |
| `reembolsado` | PagoYa hizo un reembolso de ese pago | Nada: la plata ya volvió |
| `pago_sin_pedido` | El pedido **ya no existe** en la base | Investiga (suele ser fraude) |
| `cobrado_y_cancelado` | El pedido está cancelado en la base y nadie devolvió la plata | **Devuelve la plata** |
| `ok` | Ninguna de las anteriores | Nada |

### Criterios de aceptación

1. Los números tienen que ser los **de la tienda**, no los de la planilla: la revisión automática compara tus tablas con lo que pasó de verdad.
2. `silver.pedidos` tiene que coincidir con la base **en el último cambio que aplicaste**. No hace falta estar al segundo, pero lo que tienes tiene que ser exacto hasta ese punto.
3. Un pago "del día" es el día de **aprobación en hora de la tienda** (Ciudad del Río, UTC-3). La base guarda las fechas en UTC.
4. Los montos de la conciliación van **en pesos**, como en la base.
5. Ninguna credencial en el código ni en archivos sueltos: van a un **Key Vault**.
6. Si un cliente pidió que se borren sus datos, en tus tablas no puede quedar su email.

:::trabajo Cómo se trabaja este proyecto
No hay paso a paso: es un pedido, como en un trabajo. Tienes la documentación de las fuentes, las notas del ingeniero anterior (con lo que sabía y con lo que creía saber) y una revisión automática que te dice qué está bien y qué no, con pistas. Las herramientas las eliges tú. La guía paso a paso del proyecto llega más adelante; si te trabas, la revisión y las notas son tu punto de apoyo, igual que en una empresa.
:::

## Antes de tocar nada

Escribe tu plan en una nota (en [Mis notas](#/notas) o en un papel). Como mínimo:

- De qué fuente sale cada columna de la conciliación.
- Cómo vas a tener todos los pedidos si el CDC solo guarda 24 horas.
- Cómo vas a saber que un webhook es de PagoYa y no de cualquiera.
- Qué vas a hacer con los eventos de PagoYa de antes de que configuraras el webhook.
- Dónde van las credenciales.

:::cuidado Las fuentes no te esperan
El tópico del CDC retiene los mensajes **24 horas**. Si cargas el snapshot hoy y vuelves en dos días a consumir el CDC, te faltan cambios y tu tabla va a estar mal sin que nada falle. Organízate para hacer el snapshot y el primer consumo en la misma sesión.
:::

:::real En tu computadora y en la web real
El pedido de finanzas llega por correo. En tu computadora, antes de tocar datos:

1. Crea la carpeta del proyecto y un repositorio (`git init`) con un `README.md` que copie el pedido y la pregunta de negocio en una línea.
2. Lista en `docs/preguntas.md` lo que falta saber (qué cuenta como venta, en qué moneda, qué día corta).
3. Responde el correo con esas preguntas: es lo que haría cualquier ingeniero de datos con experiencia.
:::

:::capturas Capturas para tu portafolio
Guárdalas en `docs/capturas/` del repositorio del proyecto y úsalas en el README.

- `01-readme.png`: el README del repositorio con el pedido y la definición de "venta".
- `01-preguntas.png`: tu lista de preguntas a finanzas.

Antes de publicar, tapa con un rectángulo los correos, los IDs de suscripción y de tenant, los nombres de cuentas reales y cualquier clave o token.
:::

## Ejercicios

:::ejercicio quiz
Valentina pide "cada pago aprobado y en qué estado está el pedido". ¿Por qué no alcanza con consultar la tabla pedidos de la base?
- [ ] Porque la base no tiene la columna pago_ref
- [x] Porque hay cosas que solo existen en PagoYa (reembolsos hechos desde su panel, disputas, contracargos, liquidaciones) y pedidos que se borraron de la base
- [ ] Porque la base está en PostgreSQL y finanzas usa Databricks
- [ ] Porque la base solo guarda los pedidos del día
:::

:::ejercicio quiz
Un pago se aprobó a las 22:30 del día 18 en Ciudad del Río. La base guarda los tiempos en UTC. ¿Qué fecha lleva en la conciliación?
- [x] 18: el día se mide en hora de la tienda (22:30 UTC-3 son 01:30 UTC del 19, pero el día de la tienda es el 18)
- [ ] 19, porque en UTC ya es 19
- [ ] Depende de cuándo se liquide
- [ ] La del pedido, no la del pago
:::

:::ejercicio quiz
Un pedido está cancelado en la base, PagoYa lo cobró y además tiene una disputa abierta. ¿Qué categoría lleva?
- [ ] cobrado_y_cancelado, porque es lo más urgente
- [x] en_disputa, porque está antes en la lista de prioridad
- [ ] Las dos
- [ ] ok, hasta que se resuelva la disputa
:::

## Resumen

- El pedido real: una **conciliación diaria** entre la app, la pasarela y la liquidación, más el **derecho al olvido**.
- Tres fuentes vivas: la base (réplica de lectura), el **CDC** con retención de 24 h y **PagoYa** (API, webhooks firmados, liquidación).
- Cuatro tablas de entrega, con categorías definidas y criterios de aceptación que se revisan solos.
- Antes de construir: el plan, sobre todo **cómo no perder cambios**.
