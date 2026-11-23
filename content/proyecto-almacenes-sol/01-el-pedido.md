---
titulo: El pedido - una cadena de supermercados que no sabe cuánto gana
nivel: Avanzado
duracion: 25
resumen: Almacenes del Sol tiene 30 sucursales y unos 700 productos, un ERP viejo que pisa los precios todas las noches, cajas que mandan las ventas al día siguiente y una planilla de metas que mantiene una persona a mano. Dirección quiere ventas, margen y cumplimiento de metas. El pedido, sin paso a paso.
objetivos: Entender por qué un sistema sin historia obliga a guardar fotos diarias | Planificar una dimensión lentamente cambiante (SCD tipo 2) | Unir ventas, costos y metas de tres fuentes distintas
prerrequisitos: proyecto-cuentas-claras-el-pedido
autoevaluacion: ¿Sabes qué es una SCD tipo 2 y para qué sirve? | ¿Sabes por qué el margen de la semana pasada no se puede calcular con el costo de hoy? | ¿Sabes qué riesgo tiene leer una planilla que edita una persona?
---

:::escenario Jueves, 8:30 · Almacenes del Sol
Almacenes del Sol es una cadena regional de 30 supermercados en cinco ciudades, con unos 700 productos y cerca de 8.000 tickets por día (unas 24.000 líneas). Las ventas salen de las **cajas** (un sistema de punto de venta en cada sucursal), los productos, precios y costos viven en un **ERP** de hace quince años y las metas de venta las arma **Planeamiento** en una planilla. Hasta hoy, el informe de los lunes lo hacía una persona copiando y pegando.
:::

## Los pedidos

> **Dirección:** quiero ver, por sucursal y por día, cuánto vendimos, cuántos tickets hubo y cuánto margen nos dejó. Y los lunes, quién llegó a la meta de la semana.

> **Comercial:** cada vez que discutimos un margen alguien pregunta "¿cuánto costaba esto la semana pasada?" y nadie sabe. El ERP solo muestra el precio de hoy.

> **Sistemas:** el ERP es un PostgreSQL 9.6 en la oficina central. Les damos un usuario de solo lectura. No le pidan que guarde historia: no la guarda, y no lo vamos a tocar.

## Lo que hay que entregar

| Entrega | Qué es |
|---|---|
| `sol.silver.dim_producto` | La historia de cada producto: una fila por versión (precio, costo y categoría) con `valido_desde`, `valido_hasta` y `vigente` |
| `sol.gold.ventas_diarias` | Por fecha y sucursal: tickets, ventas netas y margen bruto |
| `sol.gold.cumplimiento_semanal` | Por semana y sucursal: ventas, meta y % de cumplimiento |

Las fuentes y las reglas están en [Fuentes y accesos](#/l/proyecto-almacenes-sol-fuentes-y-accesos).

:::trabajo Si la fuente no guarda historia, la historia la guardas tú
El ERP te muestra **el presente**. Si hoy sube el costo del aceite, mañana ya no hay forma de saber cuánto costaba ayer. La única salida es sacar una **foto** (snapshot) del catálogo **todos los días** y comparar cada foto con la anterior. Un día sin foto es un día de historia perdido para siempre: por eso esto no puede depender de que alguien se acuerde.
:::

:::analogia
Es como la libreta de precios de un almacén de barrio: si el dueño borra el precio viejo y escribe el nuevo encima, nadie puede saber después cuánto ganó el mes pasado. Si en vez de borrar tacha y anota la fecha, tiene la historia. Una SCD tipo 2 es tachar y anotar la fecha.
:::

## Cómo se trabaja: el proyecto AS en Jira

En una empresa nadie trabaja "desde un correo": cada pedido es un **ticket** con dueño, estado, fecha y criterios de aceptación. Trabajas en una consultora de datos y Almacenes del Sol es un cliente, así que tiene su propio proyecto de Jira con la clave **AS**: lo abres en [Jira → Projects → Almacenes del Sol](#/jira/projects/AS/board).

```diagrama
titulo: El recorrido de un ticket de Almacenes del Sol, de punta a punta
nodo pide: El negocio pide | icono=usuario | col=0 | fila=0 | color=gris | sub=Dirección
nodo todo: To Do | icono=list | col=1 | fila=0 | color=gris | sub=al sprint en curso, sin asignar
nodo prog: In Progress | icono=engranaje | col=2 | fila=0 | color=azul | sub=Assign to me
nodo code: Commits con la clave | icono=git | col=2 | fila=1 | color=violeta | sub=git commit -m "AS-101 …"
nodo rev: In Review | icono=lupa | col=3 | fila=0 | color=naranja | sub=el líder revisa
nodo done: Done | icono=check | col=4 | fila=0 | color=verde | sub=cumple los criterios
flecha pide -> todo | explica=Cada pedido del negocio llega como una issue de AS: requerimientos como Story, incidentes como Bug con prioridad Highest y vencimiento al día siguiente, preguntas como Task. Entra al sprint en curso y sin responsable.
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
project = AS AND assignee = currentUser() AND statusCategory != Done ORDER BY priority DESC
project = AS AND type = Bug AND resolution = Unresolved
project = AS AND labels = consulta-negocio AND status != Done
```

:::trabajo Un día normal en Almacenes del Sol
Empieza en el **Board** de AS: ¿llegó algo nuevo? ¿hay un Bug *Highest*? En la reunión diaria cuentas qué cerraste, qué vas a hacer y qué te traba (si algo te traba, ponle un **flag** a la tarjeta). Trabaja de a un ticket: tómalo, nombra la clave en cada commit y, cuando esté listo, pásalo a In Review. Al final del sprint, el **Sprint report** muestra lo entregado y lo que llegó a mitad de camino (marcado con un asterisco): de eso se habla en la retrospectiva.
:::

:::real En tu computadora y en la web real
En un supermercado, "cuánto ganamos" depende de cómo se cuente el costo. Escribe en `docs/definiciones.md` qué es venta neta, margen y cumplimiento de meta, y acuérdalo con Dirección y Comercial antes de programar.
:::

:::capturas Capturas para tu portafolio
Guárdalas en `docs/capturas/` del repositorio del proyecto y úsalas en el README.

- `01-definiciones.png`: las definiciones acordadas.

Antes de publicar, tapa con un rectángulo los correos, los IDs de suscripción y de tenant, los nombres de cuentas reales y cualquier clave o token.
:::

## Ejercicios

:::ejercicio quiz
El costo de la yerba subió el martes. El miércoles calculas el margen del lunes con la tabla `productos` del ERP. ¿Qué pasa?
- [ ] Da bien: el ERP tiene el costo correcto
- [x] Da mal: usa el costo de hoy, más alto que el del lunes, y el margen del lunes aparece más bajo de lo que fue
- [ ] Da error
- [ ] Da bien si se redondea
:::

:::ejercicio quiz
En una SCD tipo 2, ¿qué pasa cuando cambia el precio de un producto?
- [ ] Se actualiza la fila existente
- [x] Se cierra la versión anterior (valido_hasta, vigente = false) y se agrega una fila nueva vigente desde ese día
- [ ] Se borra el producto y se vuelve a crear
- [ ] Se agrega una columna precio_anterior
:::

## Resumen

- Tres fuentes: el **ERP** (solo el presente), las **cajas** (tickets al día siguiente) y la **planilla** de Planeamiento.
- Sin historia en la fuente, hay que **sacar fotos diarias** y construir una SCD tipo 2.
- El margen de un día se calcula con el costo **de ese día**.
