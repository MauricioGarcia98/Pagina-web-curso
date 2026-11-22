---
titulo: Cerrar el ticket - responder con el número, su definición y la consulta
nivel: Intermedio
duracion: 25
resumen: El trabajo no termina cuando la consulta funciona. Termina cuando quien lo pidió tiene su respuesta, entendible y verificable. Respondes en la story de Jira, la cierras, completas el sprint y armas el README del proyecto para tu portafolio. Una revisión automática comprueba cada paso en las tres herramientas.
objetivos: Responder un pedido con el número, su definición y la consulta que lo respalda | Cerrar la story y completar el sprint | Documentar el proyecto en un README con capturas | Comprobar el proyecto completo con la revisión automática
prerrequisitos: proyecto-equipo-el-lago-en-aws
autoevaluacion: ¿Sabes qué tiene que tener una buena respuesta a un pedido de datos? | ¿Sabes por qué la respuesta va en el ticket y no por privado? | ¿Sabes qué pasa con lo que no se terminó al completar el sprint? | ¿Sabes qué poner en el README de un proyecto de portafolio?
---

:::escenario Lunes, 17:30
Tienes el número. Sofía lo necesita para la reunión de mañana a las 9:00.
:::

## 1. La respuesta

Una buena respuesta a un pedido de datos tiene tres partes. En la story de Jira → **Add a comment**:

```text
Pedidos por canal en la carga del 2026-11-21: web 259, app 188, tienda 116, teléfono 37 (total 600).

Definición: pedidos de la exportación diaria del sistema de la tienda, cargados en
s3://tienda-andina-lago-equipo/raw/pedidos/fecha_carga=2026-11-21/, sin filtrar por estado.

Consulta (Athena, database lago_raw):
SELECT canal, COUNT(*) AS pedidos FROM "lago_raw"."pedidos"
WHERE fecha_carga = '2026-11-21' GROUP BY canal ORDER BY pedidos DESC;
```

Si generaste los datos con `--semilla 7`, tus números son estos. Con otra semilla, usa los tuyos.

:::trabajo Por qué así
- **El número solo** genera la siguiente pregunta ("¿incluye los cancelados?"). La **definición** la responde antes de que alguien la haga.
- **La consulta** permite que cualquiera la vuelva a correr mañana.
- **En el ticket y no por privado**: queda junto al pedido, para quien lo busque en tres meses.
:::

## 2. Cerrar el trabajo

1. Pasa las tres subtareas y la story a **Done** (en el tablero o en la issue).
2. **Complete sprint** cuando el equipo termine el sprint: lo que no se terminó pasa al siguiente. Mira el **Velocity report**.

## 3. El README del portafolio

En `~/lago-pedidos`, amplía el `README.md` con: el problema (el pedido de finanzas), la arquitectura (Jira → Azure Repos/Pipelines → S3 → Glue → Athena), cómo se ejecuta, la respuesta y las capturas de `docs/capturas/`. Súbelo con una rama y un pull request, como en la lección 2.

:::real En tu computadora y en la web real
- **La respuesta** va en el ticket real (Jira o Azure Boards) y, si es para una reunión, también un mensaje corto en el canal con el enlace al ticket.
- **El README** se escribe en VS Code y se sube igual que cualquier cambio.
- **Para tu portafolio**, conviene un repositorio **público en GitHub** con el mismo contenido, sin datos de empresa ni números de cuenta.
:::

:::capturas Capturas para tu portafolio
Guárdalas en `docs/capturas/` del repositorio y úsalas en el README.

- `04-respuesta.png`: el comentario con la respuesta en la story.
- `04-done.png`: el tablero con la story en *Done*.
- `04-revision.png`: la revisión automática de abajo, completa.

Antes de publicar, tapa correos, números de cuenta y nombres reales de tu empresa.
:::

## Revisar mi proyecto

La revisión lee el estado real de Jira, Azure DevOps, la terminal y la consola de AWS. Vuelve a esta página cuando termines cada parte.

<div data-equipo="revisar"></div>

:::errores
- **Responder solo con el número**: genera más preguntas que respuestas.
- **Dejar la story abierta** "por si acaso": el sprint no refleja lo que se hizo.
- **README sin cómo ejecutarlo**: quien lo lea no puede reproducir nada.
:::

## Ejercicios

:::ejercicio quiz
¿Qué tiene que tener la respuesta a un pedido de datos?
- [ ] Solo el número, cuanto más corto mejor
- [x] El número, su definición (qué se contó, de qué fuente y fecha) y la consulta que lo respalda
- [ ] Una captura de pantalla de Athena
- [ ] El código completo del script
:::

:::ejercicio quiz
¿Por qué la respuesta va como comentario en la story?
- [ ] Porque Jira no permite mensajes privados
- [x] Porque queda junto al pedido, a la vista del equipo y de quien lo busque después
- [ ] Porque así se cierra sola
- [ ] Porque Athena la publica ahí
:::

## Resumen

- Un pedido termina con una respuesta: **número + definición + consulta**, en el ticket.
- La story pasa a **Done** y el sprint se completa.
- El **README** cuenta el problema, la arquitectura, cómo correrlo y la respuesta, con capturas.
- La **revisión automática** comprueba cada paso en Jira, Azure DevOps y AWS.
