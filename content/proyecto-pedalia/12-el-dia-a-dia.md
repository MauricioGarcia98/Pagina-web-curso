---
titulo: El día a día - la API cambia, las áreas preguntan y hay que responder
nivel: Intermedio
duracion: 35
resumen: El proyecto ya está en producción y ahora empieza el trabajo de todos los días. La API de Pedalia es un proveedor vivo con su propio calendario - deprecación de la v1, campos nuevos, una estación que abre, un maestro que cambia - y las áreas te escriben con preguntas y problemas. Esta página es tu tablero - sin paso a paso - con revisión automática contra los datos reales de la API.
objetivos: Atender preguntas de negocio con definiciones claras y números verificables | Seguir el changelog de un proveedor y migrar antes de una baja | Diagnosticar un número que no cuadra hasta la causa (caché, enum, join) | Usar el registro de la API como evidencia
prerrequisitos: proyecto-pedalia-dia-3-el-incidente
autoevaluacion: ¿Sabes de qué día es un viaje que empezó a las 23:30 en Ciudad del Río? | ¿Sabes por qué un INNER JOIN con un maestro desactualizado hace desaparecer filas sin error? | ¿Sabes dónde ver si algún proceso todavía llama a la v1? | ¿Sabes por qué un ETag guardado para siempre es un problema?
---

:::escenario Una semana después
El tablero de Pedalia ya se usa en la reunión de los viernes. Rocío, Lucía y Tomás confían en los números… y por eso preguntan más. Plataforma te recuerda que la API v1 tiene fecha de baja. Abres el tablero del equipo.
:::

## El tablero

<div data-pedalia="tablero"></div>

Los tickets llegan con los días, según el calendario de **tu** API (el mismo que ves en el changelog del [portal de desarrolladores](#/pedalia-dev/changelog)). Para responder puedes usar lo que quieras: `curl` o Python contra la API, Databricks, Excel o Jupyter.

## Lo que conviene tener a mano

| Para | Dónde |
|---|---|
| Ver qué cambió en la API y cuándo | Portal → **Changelog** |
| Saber si algún proceso sigue usando la v1 | Portal → **Registro** (cada pedido, con su ruta y su código) |
| Estado e incidentes de la API | Portal → **Estado** |
| Los viajes de un día | `GET /v2/trips` con `updated_since` y paginación por cursor |
| El maestro de estaciones | `GET /v2/stations` (con `ETag`: si cambia, el maestro cambió) |

:::trabajo Antes de responder un número
Escribe la definición en una línea: qué cuentas, de qué día (en qué zona horaria) y de qué fuente. "Viajes que empezaron el 18 en hora de Ciudad del Río, según /v2/trips, incluidos los reembolsados". Si el ticket no lo aclara, el hilo de comentarios casi siempre lo hace. Y si tampoco, se pregunta: nadie se enoja por una pregunta, sí por un número equivocado en una reunión.
:::

:::errores
- **Contar el día en UTC**: la v2 da `started_at` en UTC. Un viaje de las 22:00 en Ciudad del Río ya es del día siguiente en UTC.
- **Validar enums de forma estricta sin mirar el changelog**: un valor nuevo (`corporate`) se descarta en silencio o rompe el pipeline.
- **Cachear el maestro para siempre**: cuando cambia una capacidad o aparece una estación, los cálculos quedan mal sin que nada falle.
- **INNER JOIN contra un maestro incompleto**: las filas sin pareja desaparecen. Un LEFT JOIN y un control de "huérfanos" lo hacen visible.
:::

:::real En tu computadora y en la web real
En un equipo de datos, los tickets viven en **Jira, Azure DevOps Boards, Linear o GitHub Issues**. El flujo es el mismo que en el tablero de esta lección: tomas un ticket, lo pasas a *En curso*, preguntas en el hilo lo que no está claro, lo resuelves con un pull request que menciona el ticket (`Closes #12` en GitHub, o la clave `PED-12` en Jira) y respondes con el número **y su definición**.
:::

:::capturas Capturas para tu portafolio
Guárdalas en `docs/capturas/` del repositorio del proyecto y úsalas en el README.

- `12-tablero.png`: el tablero con los tickets que resolviste.
- `12-respuesta.png`: una respuesta a un área de negocio con el número, la definición y la consulta que lo respalda.

Antes de publicar, tapa con un rectángulo los correos, los IDs de suscripción y de tenant, los nombres de cuentas reales y cualquier clave o token.
:::

## Ejercicios

:::ejercicio quiz
Rocío pregunta por las salidas de "ayer". Un viaje empezó a las 23:40 del 18 en Ciudad del Río (UTC-3). ¿De qué día es?
- [x] Del 18: el día se cuenta en hora de la ciudad, aunque en UTC ya sean las 02:40 del 19
- [ ] Del 19, porque la API está en UTC
- [ ] De ninguno, porque cruza la medianoche
- [ ] Depende de cuándo terminó
:::

:::ejercicio quiz
Desde que abrió la estación 73, el total de viajes de silver es un poco menor que el de la API. ¿Causa más probable?
- [ ] La API duplica viajes
- [x] silver hace un INNER JOIN con un maestro de estaciones que no tiene la 73: esos viajes se pierden sin error
- [ ] Los viajes de la 73 son gratis
- [ ] El cursor saltea páginas
:::

## Resumen

- El proyecto en producción genera trabajo nuevo: **preguntas**, **cambios del proveedor** e **incidentes**.
- El **changelog** y el **registro** del proveedor son tus fuentes de evidencia.
- Cada número va con su **definición** (qué, qué día, en qué zona horaria, de qué fuente).
- Los errores silenciosos más comunes: zona horaria, enum estricto, caché eterna, INNER JOIN contra un maestro incompleto.
