---
titulo: El encargo - Pedalia necesita datos, y nadie sabe bien cuáles
nivel: Intermedio
duracion: 35
resumen: Empieza el proyecto como empieza en un trabajo real. Pedalia, una red de bicicletas compartidas, tiene tres áreas que piden cosas distintas con palabras distintas. Aprendes a convertir esos pedidos en preguntas concretas, a elegir qué herramienta hace cada parte y por qué, y a escribir el plan antes de tocar nada.
objetivos: Traducir pedidos vagos de negocio a métricas con definición | Explicar qué hace cada herramienta del proyecto y qué pasaría si no estuviera | Dibujar el recorrido de los datos de la app al tablero | Identificar los riesgos antes de empezar
prerrequisitos: interfaces-proyecto-integrador
autoevaluacion: ¿Sabes qué preguntar cuando alguien pide "ver cómo vamos"? | ¿Sabes por qué el orquestador no debe transformar los datos? | ¿Sabes qué es un contrato de datos y para qué sirve? | ¿Sabes dibujar el recorrido de un viaje desde la app hasta el tablero?
---

:::escenario Lunes, 9:15
Empiezas en **Pedalia**, una red de bicicletas compartidas con 24 estaciones y 180 bicis en Ciudad del Río. Hasta hoy, los números salían de una planilla que alguien armaba a mano cada lunes. Tu jefa te reenvía tres mensajes y escribe: "Hay que armar esto bien. Tienes dos semanas. Primero mándame un plan".
:::

## Los tres pedidos, tal cual llegaron

> **Finanzas (Lucía):** "Necesito los ingresos por día. Y que cuadren con lo que cobra la pasarela de pagos, que siempre hay diferencias".

> **Marketing (Tomás):** "Queremos saber qué barrios usan más el pase diario, para hacer campañas. Nosotros trabajamos todo en BigQuery".

> **Operaciones (Rocío):** "Quiero un tablero para ver qué estaciones se usan más y si hay bicis que no vuelven".

Así llegan los pedidos de verdad: mezclan una necesidad ("cuadrar con la pasarela"), una herramienta ("trabajamos en BigQuery") y una idea suelta ("bicis que no vuelven"). Tu primer trabajo no es programar: es **preguntar hasta que cada pedido tenga una definición que se pueda calcular**.

:::analogia El plano antes de la obra
Nadie empieza una casa comprando ladrillos. Primero se habla con quien la va a habitar ("¿cuántos dormitorios?, ¿trabajan desde casa?"), después se dibuja el plano y recién ahí se compra. Si te salteas el plano, construyes rápido una casa que nadie pidió. En datos pasa igual: el contrato de datos y la arquitectura son el plano.
:::

## De pedido a definición

Para cada pedido, haz las mismas cuatro preguntas: **qué se mide, con qué grano, con qué reglas y cada cuánto**.

| Pedido | Lo que preguntaste | Definición acordada |
|---|---|---|
| "Ingresos por día" | ¿Día de inicio o de fin del viaje? ¿Los viajes sin cerrar cuentan? ¿Los abonos mensuales? | **Ingresos diarios** = suma de `monto` de los viajes **válidos** con inicio ese día, separados por `tipo_usuario`. Los abonos pagan aparte (por mes): acá solo entra el recargo por exceder 30 minutos |
| "Barrios con más pase diario" | ¿Barrio de salida o de llegada? | **Uso por barrio** = viajes válidos por día y **barrio de la estación de origen**, y cuántos fueron con pase diario |
| "Estaciones más usadas" | ¿Salidas, llegadas o ambas? ¿"bicis que no vuelven" son las dejadas fuera de estación o las que no se devolvieron? | **Viajes por estación** = salidas por día y estación con su duración promedio. Aparte, un conteo de viajes **fuera de estación** (destino 99) |

¿Y qué es un viaje **válido**? Esa es la pregunta que más discusión trae, y la respuesta va al **contrato de datos**:

- Un viaje cuenta **una sola vez** (el sistema a veces reenvía filas).
- Un viaje **sin fin** todavía está en curso: no es válido hoy (lo será cuando llegue cerrado).
- Un viaje que **termina antes de empezar** es un error de reloj: va a cuarentena, no a los números.
- Un viaje con destino **99** es válido (se cobró), pero queda marcado como **fuera de estación**.

:::cuidado La conciliación con la pasarela
Lucía pidió que "cuadre con la pasarela de pagos". Eso necesita una segunda fuente (los cobros de la pasarela) que hoy no tienes. Anótalo como **fuera de alcance de la primera entrega** y dilo por escrito. Prometer algo sin la fuente es la forma más rápida de perder la confianza del área.
:::

## Quién hace qué, y por qué

| Pieza | Herramienta | Qué hace en Pedalia | Si no estuviera… |
|---|---|---|---|
| Código y cambios | **GitHub** | Guarda el DAG, el SQL y los pipelines. Todo cambio pasa por un pull request con revisión y pruebas automáticas (Actions) | Nadie sabe qué versión corre ni quién cambió qué |
| Lago | **Azure Storage (ADLS Gen2)** | Recibe los archivos y guarda cada capa: `landing`, `bronze`, `silver`, `gold` | Cada herramienta tendría su copia y no coincidirían |
| Ingesta | **Data Factory** | Copia los archivos del día de `landing` a `bronze` | Scripts sueltos sin monitoreo ni reintentos |
| Transformación | **Databricks** | Limpia (silver), calcula métricas (gold) y exporta gold como archivos | La lógica quedaría repartida en tres herramientas |
| Orquestación | **Airflow** | Decide el orden y vigila: ingesta → transformación → cargas. Si algo falla, no sigue | Habría que disparar cada paso a mano, en orden |
| Finanzas | **Snowflake** | El warehouse donde Lucía consulta los ingresos | — (es la herramienta del área) |
| Marketing | **BigQuery** | El warehouse donde Tomás arma sus campañas | — (es la herramienta del área) |
| Tablero | **Power BI** | Junta las tres fuentes en un informe para operaciones | Cada área miraría su número y no coincidirían |

:::nota ¿Tres warehouses en una empresa chica?
En la vida real se elige una plataforma. Acá hay dos razones para tener varias: es común en empresas que crecieron por áreas (o que compraron otra empresa) y te obliga a practicar lo más difícil, que es **mover datos entre sistemas sin que se rompan**. En tu portafolio, explica esta decisión y di qué harías si pudieras elegir una sola.
:::

## El recorrido de un viaje

```diagrama
titulo: El recorrido de un viaje en Pedalia
nodo app: App de Pedalia | icono=movil | col=0 | fila=0 | sub=archivos diarios
nodo la: landing | icono=carpeta | col=1 | fila=0 | color=gris
nodo br: bronze | icono=capas | col=2 | fila=0 | color=naranja | sub=con Data Factory
nodo sv: silver | icono=databricks | col=3 | fila=0 | color=gris | sub=con Databricks
nodo gd: gold | icono=databricks | col=4 | fila=0 | color=amarillo
nodo sf: Snowflake | icono=snowflake | col=3 | fila=1 | color=azul | sub=finanzas
nodo bq: BigQuery | icono=bigquery | col=4 | fila=1 | color=azul | sub=marketing
nodo pbi: Power BI | icono=powerbi | col=5 | fila=1 | color=verde | sub=finanzas, marketing y operaciones
flecha app -> la | explica=La app deja un archivo por día en landing.
flecha la -> br | explica=Data Factory copia los archivos a bronze sin cambiarlos.
flecha br -> sv | explica=Databricks limpia los viajes y los deja en silver.
flecha sv -> gd | explica=También en Databricks se arman las tablas de gold.
flecha gd -> sf: archivos de gold | explica=Para finanzas, se exportan archivos de gold y se cargan en Snowflake.
flecha gd -> bq | explica=Para marketing, gold también se carga en BigQuery.
flecha gd -> pbi: operaciones, directo | explica=Operaciones lee gold directo desde Power BI.
flecha sf -> pbi | explica=Los informes de finanzas leen de Snowflake.
flecha bq -> pbi | explica=Y los de marketing, de BigQuery.
```

Airflow dispara y vigila cada flecha. GitHub guarda el código y lo despliega.

## El plan que le mandas a tu jefa

```markdown
# Plan · Datos de Pedalia (v1)

Objetivo: ingresos diarios (finanzas), uso por barrio (marketing) y tablero de estaciones (operaciones), actualizados cada mañana a las 7:00.

Fuera de alcance (v1): conciliación con la pasarela de pagos (falta acceso a esa fuente).

Fuente: archivos diarios de la app (viajes, mantenimientos, estaciones).
Reglas: ver docs/contrato.md (viaje válido, cuarentena, fuera de estación).

Entregas:
1. Repositorio y CI (día 1)
2. Lago y carga de la entrega del día (día 2)
3. Limpieza y métricas en Databricks (días 3-4)
4. Orquestación diaria con Airflow (día 5)
5. Cargas a Snowflake y BigQuery (día 6)
6. Tablero en Power BI (día 7)

Riesgos: el formato de los archivos puede cambiar sin aviso; los viajes tardíos cambian días ya cerrados.
```

:::errores
- **Empezar por la herramienta**: "hagamos un dashboard en Power BI" antes de saber qué número va adentro.
- **Aceptar palabras sin definición**: "ingresos", "activos" o "más usadas" significan cosas distintas para cada área. Si no está escrito, se discute después, con el número ya publicado.
- **Prometer lo que depende de otra fuente** (la conciliación con la pasarela) sin tener acceso.
- **Poner la lógica en el orquestador**: Airflow decide el orden; el cálculo va en Databricks, que escala y deja registro.
:::

## Cómo se trabaja: el proyecto PD en Jira

En una empresa nadie trabaja "desde un correo": cada pedido es un **ticket** con dueño, estado, fecha y criterios de aceptación. Trabajas en una consultora de datos y Pedalia es un cliente, así que tiene su propio proyecto de Jira con la clave **PD**: lo abres en [Jira → Projects → Pedalia](#/jira/projects/PD/board).

```diagrama
titulo: El recorrido de un ticket de Pedalia, de punta a punta
nodo pide: El negocio pide | icono=usuario | col=0 | fila=0 | color=gris | sub=Rocío · Operaciones
nodo todo: To Do | icono=list | col=1 | fila=0 | color=gris | sub=al sprint en curso, sin asignar
nodo prog: In Progress | icono=engranaje | col=2 | fila=0 | color=azul | sub=Assign to me
nodo code: Commits con la clave | icono=git | col=2 | fila=1 | color=violeta | sub=git commit -m "PD-201 …"
nodo rev: In Review | icono=lupa | col=3 | fila=0 | color=naranja | sub=el líder revisa
nodo done: Done | icono=check | col=4 | fila=0 | color=verde | sub=cumple los criterios
flecha pide -> todo | explica=Cada pedido del negocio llega como una issue de PD: requerimientos como Story, incidentes como Bug con prioridad Highest y vencimiento al día siguiente, preguntas como Task. Entra al sprint en curso y sin responsable.
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
project = PD AND assignee = currentUser() AND statusCategory != Done ORDER BY priority DESC
project = PD AND type = Bug AND resolution = Unresolved
project = PD AND labels = consulta-negocio AND status != Done
```

:::trabajo Un día normal en Pedalia
Empieza en el **Board** de PD: ¿llegó algo nuevo? ¿hay un Bug *Highest*? En la reunión diaria cuentas qué cerraste, qué vas a hacer y qué te traba (si algo te traba, ponle un **flag** a la tarjeta). Trabaja de a un ticket: tómalo, nombra la clave en cada commit y, cuando esté listo, pásalo a In Review. Al final del sprint, el **Sprint report** muestra lo entregado y lo que llegó a mitad de camino (marcado con un asterisco): de eso se habla en la retrospectiva.
:::

:::real En tu computadora y en la web real
En una empresa, este pedido llega por **correo o por Slack/Teams**, y el plan se responde por el mismo canal o en un documento compartido (Google Docs, Confluence, Notion). En tu computadora:

1. Abre tu editor (VS Code) y crea `plan.md` en una carpeta de trabajo.
2. Escribe una sección por pedido: **qué piden**, **la definición que propones** y **la pregunta que falta responder**.
3. Mándalo antes de programar nada. Si la jefa responde "ok", ya tienes el alcance aprobado por escrito.
:::

:::capturas Capturas para tu portafolio
Guárdalas en `docs/capturas/` del repositorio del proyecto y úsalas en el README.

- `01-plan.png`: tu `plan.md` abierto en VS Code, con las tres definiciones.
- `01-recorrido.png`: el diagrama del recorrido de un viaje (puedes exportarlo con ⬇ PNG desde el diagrama de esta lección y rehacerlo con tus palabras).

Antes de publicar, tapa con un rectángulo los correos, los IDs de suscripción y de tenant, los nombres de cuentas reales y cualquier clave o token.
:::

## Ejercicios

:::ejercicio quiz
Marketing pide "los barrios que más usan el pase diario". ¿Qué tienes que acordar antes de calcular?
- [ ] Qué color va a tener el gráfico en Power BI
- [x] Si el barrio es el de la estación de salida o el de llegada, y qué viajes cuentan como válidos
- [ ] Si la tabla va a estar en BigQuery o en Snowflake
- [ ] Cuántos workers va a tener el clúster de Databricks
:::

:::ejercicio quiz
Un viaje viene sin fecha de fin, sin destino y sin monto. Según el contrato de Pedalia, ¿qué es?
- [ ] Un error que hay que borrar del archivo original
- [ ] Un viaje gratis que cuenta con monto cero en los ingresos
- [x] Un viaje en curso: no es válido hoy y lo será cuando llegue cerrado
- [ ] Un viaje fuera de estación
:::

:::ejercicio quiz
¿Por qué la conciliación con la pasarela de pagos queda fuera de la primera entrega?
- [ ] Porque Snowflake no permite comparar dos tablas
- [x] Porque necesita una fuente (los cobros de la pasarela) a la que todavía no hay acceso, y prometerla sin ella es arriesgado
- [ ] Porque finanzas no la necesita
- [ ] Porque Airflow no puede orquestar dos fuentes a la vez
:::

:::ejercicio abierto
Escribe la definición de **"bicis que no vuelven"** que le propondrías a operaciones: qué cuenta, con qué grano y qué casos quedan afuera. Después compárala con la respuesta modelo.
```text solucion
Propuesta: "Viajes fuera de estación por día y estación de origen".
- Cuenta: viajes válidos cuyo destino es 99 (la bici quedó fuera de una estación).
- Grano: un número por día y estación de origen.
- No cuenta: los viajes en curso (sin fin). Esos no son "bicis que no vuelven" sino viajes que todavía no terminaron; si siguen abiertos más de 24 horas, se reportan aparte como posible robo o falla.
- Pregunta abierta para operaciones: ¿les sirve por estación de origen o necesitan la ubicación donde quedó la bici? (eso requiere datos de GPS que hoy no tenemos).
```
:::

## Resumen

- Un pedido de negocio no se programa: primero se convierte en una **definición** (qué, grano, reglas, frecuencia).
- Las reglas de qué es un dato válido van al **contrato de datos**, por escrito.
- Cada herramienta tiene un rol claro. El orquestador **vigila**, no transforma.
- Lo que depende de una fuente que no tienes se declara **fuera de alcance**.
