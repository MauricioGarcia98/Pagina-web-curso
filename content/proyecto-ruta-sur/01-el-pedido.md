---
titulo: El pedido - saber en tiempo real si cumplimos lo que prometemos
nivel: Avanzado
duracion: 25
resumen: Ruta Sur reparte paquetes con 20 camionetas que mandan su posición y cada entrega a un stream en tiempo real. Dirección comercial quiere saber, pedido por pedido, si se cumplió la ventana prometida, y operaciones lo quiere ver durante el día. El pedido tal como llega, sin paso a paso.
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
| **Telemetría** | Event Hubs (Kafka), tópico `rutasur.telemetria`, 4 particiones, retención 3 días | `kcat` o `read_kafka` en Databricks |
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
- [ ] Porque hay 4 particiones
:::

## Resumen

- Un stream de telemetría con **dos relojes** y un sistema transaccional con el **plan**.
- Entrega: telemetría limpia y entregas con estado y a tiempo, por pedido.
- Lo difícil: eventos **tardíos, desordenados y repetidos**.
