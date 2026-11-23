---
titulo: El pedido - tres sistemas, un cliente y nadie sabe cuánto facturamos de verdad
nivel: Avanzado
duracion: 25
resumen: Cuentas Claras vende un software de facturación por suscripción a pymes. Finanzas no sabe explicar el MRR, Customer Success mira tres sistemas para entender a un cliente y Ventas quiere ver todo sin salir del CRM. El pedido, sin paso a paso.
objetivos: Entender métricas de negocio SaaS (MRR y sus movimientos) antes de calcularlas | Unir entidades entre sistemas que no comparten identificadores | Planificar un reverse ETL hacia una herramienta operativa
prerrequisitos: proyecto-mercado-vecino-el-pedido
autoevaluacion: ¿Sabes qué es el MRR y por qué un plan anual no suma 12 veces? | ¿Sabes cómo unir un cliente de facturación con una empresa del CRM? | ¿Sabes qué es un reverse ETL?
---

:::escenario Martes, 9:00 · Cuentas Claras
Cuentas Claras tiene unos 3.000 clientes (unos 1.200 pagando hoy) con una suscripción mensual o anual, 18 meses de historia de facturación y unos 12.600 usuarios que generan cerca de medio millón de eventos de uso por mes. Tres sistemas: **Contacto CRM** (lo usa Ventas), **Cobrable** (la plataforma de cobros por suscripción) y **Medidor** (la analítica del producto). Cada uno tiene su id del cliente y ninguno conoce los otros.
:::

## Los pedidos

> **Andrea Molina (CFO):** el directorio me pregunta cuánto crecimos y de dónde viene el crecimiento. Necesito el MRR de cada mes y separado en nuevos, expansión, contracción, bajas y reactivaciones. Que se pueda auditar cliente por cliente.

> **Customer Success:** para saber si un cliente está bien abrimos el CRM, Cobrable y Medidor. Queremos una sola tabla con todo y un *health score*.

> **Ventas:** nosotros vivimos en el CRM. Si el health score existe, lo queremos ver ahí, en la ficha de la empresa.

## Lo que hay que entregar

| Entrega | Qué es |
|---|---|
| `cc.gold.mrr_mensual` | Por cliente y mes (últimos 6 meses cerrados): MRR y movimiento |
| `cc.gold.cliente_360` | Por cada cliente que hoy paga: empresa del CRM, plan, MRR, uso de los últimos 30 días y health score |
| Reverse ETL | `health_score`, `mrr_actual` y `plan_actual` escritos en la empresa del CRM |

Las definiciones exactas están en [Fuentes y accesos](#/l/proyecto-cuentas-claras-fuentes-y-accesos). Lo que viene después, en [El día a día](#/l/proyecto-cuentas-claras-el-dia-a-dia).

:::trabajo Las métricas se definen antes de calcularse
"MRR" parece obvio hasta que preguntas: ¿un plan anual de 790 USD es 790 de MRR? (No: es 65,83.) ¿Una prueba gratis cuenta? (No.) ¿Un cliente moroso? (Depende de la empresa: acá sí, hasta que se da de baja.) Escribe la definición con finanzas **antes** de escribir SQL.
:::

## Cómo se trabaja: el proyecto CC en Jira

En una empresa nadie trabaja "desde un correo": cada pedido es un **ticket** con dueño, estado, fecha y criterios de aceptación. Trabajas en una consultora de datos y Cuentas Claras es un cliente, así que tiene su propio proyecto de Jira con la clave **CC**: lo abres en [Jira → Projects → Cuentas Claras](#/jira/projects/CC/board).

```diagrama
titulo: El recorrido de un ticket de Cuentas Claras, de punta a punta
nodo pide: El negocio pide | icono=usuario | col=0 | fila=0 | color=gris | sub=Andrea Molina · CFO
nodo todo: To Do | icono=list | col=1 | fila=0 | color=gris | sub=al sprint en curso, sin asignar
nodo prog: In Progress | icono=engranaje | col=2 | fila=0 | color=azul | sub=Assign to me
nodo code: Commits con la clave | icono=git | col=2 | fila=1 | color=violeta | sub=git commit -m "CC-101 …"
nodo rev: In Review | icono=lupa | col=3 | fila=0 | color=naranja | sub=el líder revisa
nodo done: Done | icono=check | col=4 | fila=0 | color=verde | sub=cumple los criterios
flecha pide -> todo | explica=Cada pedido del negocio llega como una issue de CC: requerimientos como Story, incidentes como Bug con prioridad Highest y vencimiento al día siguiente, preguntas como Task. Entra al sprint en curso y sin responsable.
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
project = CC AND assignee = currentUser() AND statusCategory != Done ORDER BY priority DESC
project = CC AND type = Bug AND resolution = Unresolved
project = CC AND labels = consulta-negocio AND status != Done
```

:::trabajo Un día normal en Cuentas Claras
Empieza en el **Board** de CC: ¿llegó algo nuevo? ¿hay un Bug *Highest*? En la reunión diaria cuentas qué cerraste, qué vas a hacer y qué te traba (si algo te traba, ponle un **flag** a la tarjeta). Trabaja de a un ticket: tómalo, nombra la clave en cada commit y, cuando esté listo, pásalo a In Review. Al final del sprint, el **Sprint report** muestra lo entregado y lo que llegó a mitad de camino (marcado con un asterisco): de eso se habla en la retrospectiva.
:::

:::real En tu computadora y en la web real
En una empresa SaaS, "cuánto facturamos" tiene varias respuestas. Antes de tocar datos, escribe en `docs/definiciones.md` qué es **MRR**, qué cuenta como cliente activo y cómo se trata un descuento, y hazlo aprobar por finanzas.
:::

:::capturas Capturas para tu portafolio
Guárdalas en `docs/capturas/` del repositorio del proyecto y úsalas en el README.

- `01-definiciones.png`: tus definiciones de negocio aprobadas.

Antes de publicar, tapa con un rectángulo los correos, los IDs de suscripción y de tenant, los nombres de cuentas reales y cualquier clave o token.
:::

## Ejercicios

:::ejercicio quiz
Un cliente tiene el plan Pro anual (790 USD por año) con un 20 % de descuento vigente. ¿Cuál es su MRR?
- [ ] 790
- [ ] 65,83
- [x] 52,67 (790 / 12 × 0,8)
- [ ] 632
:::

:::ejercicio quiz
Un cliente se dio de baja en marzo y volvió en junio. En junio, ¿qué movimiento es?
- [ ] Nuevo
- [x] Reactivación: ya había tenido MRR antes
- [ ] Expansión
- [ ] Ninguno
:::

## Resumen

- Tres sistemas, tres ids, ninguna llave común confiable.
- Métricas de negocio con **definiciones acordadas**.
- La salida no termina en el lago: vuelve al CRM (**reverse ETL**).
