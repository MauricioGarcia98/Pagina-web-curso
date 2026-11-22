---
titulo: Las notas del equipo - lo que dijo el proveedor y lo que pasa en la calle
nivel: Avanzado
duracion: 15
resumen: Un hilo con el proveedor de GPS y las notas de quien armó el mapa en vivo. Mezcla promesas del proveedor, costumbres del depósito y suposiciones sobre el stream. Léelo con ojo de data engineer antes de diseñar.
objetivos: Detectar suposiciones frágiles sobre streams | Diseñar para eventos tardíos y repetidos | Anticipar cambios de esquema del proveedor
prerrequisitos: proyecto-ruta-sur-fuentes-y-accesos
autoevaluacion: ¿Sabes qué es "al menos una vez"? | ¿Sabes por qué no puedes cerrar un día a las 00:00 en punto? | ¿Sabes qué validación te avisa de un cambio de esquema?
---

## El hilo con el proveedor de GPS

> **Proveedor:** los equipos mandan cada evento apenas ocurre. Si no hay señal, lo guardan y lo mandan cuando vuelve. Nunca se pierde nada.
>
> **Proveedor:** si el equipo no recibe confirmación, reenvía. Pueden ver algún evento repetido, pero tiene el mismo event_id.
>
> **Proveedor:** el reloj de los equipos se sincroniza solo por GPS. Salvo que se desconecte la batería: ahí arranca con la hora que tenía guardada hasta que vuelve a sincronizar.

## Las notas del mapa en vivo

> - Los eventos vienen en orden: proceso el último de cada camioneta y listo.
> - El día termina a las 00:00: a esa hora cierro el resumen del día.
> - Los urgentes los agrega despachos por teléfono, no sé si quedan en el TMS.
> - La velocidad viene en km/h.

## El depósito

> **Jefe de depósito:** cuando una camioneta se queda sin datos móviles, el equipo descarga todo por el WiFi del depósito al volver. A veces vuelven a las 22:00, a veces el equipo no se conecta hasta la mañana siguiente.

:::trabajo De la nota al diseño
"Los eventos vienen en orden" no es cierto ni dentro de una camioneta: los que se guardaron sin señal llegan juntos y después. "El día termina a las 00:00" choca con el depósito: hay eventos de ayer que llegan hoy a la mañana. Decide **cuánto esperas** (tu marca de agua o *watermark*) antes de dar un día por cerrado, y qué haces si llega algo después: ¿recalculas? ¿avisas?
:::

:::real En tu computadora y en la web real
Estas notas vendrían del proveedor de GPS (correo) y del equipo de operaciones (Slack/Teams). Verifica cada una con los datos del tópico antes de decidir tu diseño y anótala en `docs/hallazgos.md`.
:::

:::capturas Capturas para tu portafolio
Guárdalas en `docs/capturas/` del repositorio del proyecto y úsalas en el README.

- `03-hallazgos.png`: lo que confirmaste de cada nota.

Antes de publicar, tapa con un rectángulo los correos, los IDs de suscripción y de tenant, los nombres de cuentas reales y cualquier clave o token.
:::

## Ejercicios

:::ejercicio quiz
El proveedor dice que reenvía si no recibe confirmación. ¿Qué tiene que hacer tu pipeline?
- [ ] Nada, son pocos
- [x] Deduplicar por event_id (la entrega es "al menos una vez")
- [ ] Descartar los eventos con el mismo vehículo y minuto
- [ ] Pedirle al proveedor que no reenvíe
:::

:::ejercicio quiz
Cierras el SLA de cada día a las 00:00 y nunca lo recalculas. ¿Qué pasa con una camioneta que volvió sin datos móviles?
- [x] Sus entregas de la tarde quedan "sin evento" en el SLA de ese día, aunque se hayan hecho
- [ ] Nada: los eventos se descartan
- [ ] Se suman al día siguiente correctamente
- [ ] El SLA sale mejor
:::

## Resumen

- Al menos una vez → **deduplicar**.
- Orden por llegada, no por ocurrencia → **ordenar por la hora del evento**.
- Eventos tardíos → decidir un **watermark** y si recalculas días cerrados.
- El proveedor va a cambiar el esquema → **validar** lo que llega.
