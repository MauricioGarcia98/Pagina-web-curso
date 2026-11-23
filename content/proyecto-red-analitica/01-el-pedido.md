---
titulo: El pedido - cinco laboratorios, cinco formatos y datos de salud
nivel: Avanzado
duracion: 25
resumen: Red Analítica junta cinco laboratorios clínicos que nunca compartieron datos. Cada uno deja sus resultados en un servidor SFTP, a su manera. Dirección médica quiere ver a cada paciente completo; protección de datos exige que nadie del equipo vea nombres ni documentos. Esta página es el pedido, sin paso a paso.
objetivos: Entender un pedido con requisitos de negocio y de privacidad a la vez | Identificar los riesgos de integrar fuentes heterogéneas | Planificar una ingesta por archivos con llegadas irregulares | Distinguir anonimizar de seudonimizar
prerrequisitos: proyecto-mercado-vecino-el-pedido
autoevaluacion: ¿Sabes por qué seudonimizar no es lo mismo que anonimizar? | ¿Sabes qué puede cambiar de un día para otro en un archivo que manda un tercero? | ¿Sabes qué se entrega y cómo se revisa?
---

:::escenario Lunes, 8:30 · Red Analítica
La red se formó hace un mes uniendo cinco laboratorios de la ciudad: Norte, Centro, Sur, Costa y Cerro. Cada uno tiene su sistema, su gente y sus costumbres. Lo único en común es un servidor SFTP donde cada laboratorio deja un archivo por día con los resultados del día anterior. Eres la primera persona de datos de la red.
:::

## Los dos correos

> **De:** Dra. Silvia Prado (Dirección médica)
>
> Hoy un paciente que se atiende en Norte y en Cerro tiene sus análisis en dos lugares que no se hablan. Necesito un solo lugar con todos los resultados, comparables entre sí: la glucosa de un laboratorio tiene que significar lo mismo que la del otro. Y quiero indicadores por día y por laboratorio.

> **De:** Delegado de protección de datos
>
> Recordatorio: son datos de salud, la categoría más sensible. El equipo de datos **no** trabaja con nombres ni documentos: cada paciente se identifica con un seudónimo estable. Y si una persona pide que borremos sus datos, se borran de todas las copias que controlamos, en 72 horas.

## Lo que tienes

| Sistema | Qué es |
|---|---|
| **Servidor SFTP** `sftp.redanalitica.example` | Una carpeta por laboratorio en `/entrantes/`. Cada laboratorio sube un archivo por día, cuando puede. Los archivos se borran a los 7 días |
| **Documentación de cada laboratorio** | Formato, codificación, códigos de estudio y unidades (página siguiente) |
| **Herramientas** | Terminal (`sftp`, `scp`, `iconv`, `file`), portal de Azure (lago y Key Vault), Databricks, Airflow y Power BI de práctica |

Las fuentes están **vivas**: los archivos llegan cada día con los resultados del día anterior, y los laboratorios cambian cosas sin avisar.

**El volumen.** La red atiende a unas **24.000 personas**. Un día hábil, cada laboratorio procesa unas **400 muestras** (de 1 a 5 estudios cada una): son cerca de **1.000 resultados por laboratorio** y unos **5.000 por día** entre los cinco; los fines de semana, menos de la mitad. Con 7 días de archivos en el servidor tienes unos 30.000 resultados para empezar, y la tabla crece cada mañana. A ese tamaño ya no se revisa "a ojo": las trampas (un documento escrito distinto, una fila repetida, una unidad cambiada) se encuentran con consultas.

## Lo que hay que entregar

| Tabla | Qué es |
|---|---|
| `red.silver.resultados` | Un registro por **resultado** de los 5 laboratorios: laboratorio, muestra, estudio en **código canónico**, resultado en **unidad canónica**, fecha de toma (hora de la ciudad) y **paciente_id** (seudónimo). Sin nombres, documentos ni fechas de nacimiento |
| `red.gold.resultados_diarios` | Por día, laboratorio y estudio: cantidad de resultados y cuántos fuera del rango de referencia |

El detalle está en [La entrega](#/l/proyecto-red-analitica-la-entrega) y el tablero con lo que va llegando, en [El día a día](#/l/proyecto-red-analitica-el-dia-a-dia).

:::trabajo Seudonimizar no es anonimizar
Un **seudónimo** reemplaza el documento por un identificador que no lo revela, pero que es el mismo cada vez (por ejemplo, un hash del documento con una **sal** secreta). Con la sal se puede volver a calcular, y por eso la sal se guarda en un Key Vault y no la tiene cualquiera. **Anonimizar** es que ya no se pueda volver a la persona de ninguna forma. Para unir los análisis de un paciente entre laboratorios necesitas un seudónimo, no anonimizar.
:::

## Antes de empezar

Escribe en tus notas:

- Cómo vas a reconocer al mismo paciente si cada laboratorio escribe el documento distinto.
- Qué haces si un archivo no llega, llega dos veces o llega corregido.
- Dónde guardas la clave SSH y la sal.
- Cómo vas a enterarte si un laboratorio cambia el formato sin avisar.

## Cómo se trabaja: el proyecto RA en Jira

En una empresa nadie trabaja "desde un correo": cada pedido es un **ticket** con dueño, estado, fecha y criterios de aceptación. Trabajas en una consultora de datos y Red Analítica es un cliente, así que tiene su propio proyecto de Jira con la clave **RA**: lo abres en [Jira → Projects → Red Analítica](#/jira/projects/RA/board).

```diagrama
titulo: El recorrido de un ticket de Red Analítica, de punta a punta
nodo pide: El negocio pide | icono=usuario | col=0 | fila=0 | color=gris | sub=Dra. Silvia Prado · Dirección médica
nodo todo: To Do | icono=list | col=1 | fila=0 | color=gris | sub=al sprint en curso, sin asignar
nodo prog: In Progress | icono=engranaje | col=2 | fila=0 | color=azul | sub=Assign to me
nodo code: Commits con la clave | icono=git | col=2 | fila=1 | color=violeta | sub=git commit -m "RA-101 …"
nodo rev: In Review | icono=lupa | col=3 | fila=0 | color=naranja | sub=el líder revisa
nodo done: Done | icono=check | col=4 | fila=0 | color=verde | sub=cumple los criterios
flecha pide -> todo | explica=Cada pedido del negocio llega como una issue de RA: requerimientos como Story, incidentes como Bug con prioridad Highest y vencimiento al día siguiente, preguntas como Task. Entra al sprint en curso y sin responsable.
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
project = RA AND assignee = currentUser() AND statusCategory != Done ORDER BY priority DESC
project = RA AND type = Bug AND resolution = Unresolved
project = RA AND labels = consulta-negocio AND status != Done
```

:::trabajo Un día normal en Red Analítica
Empieza en el **Board** de RA: ¿llegó algo nuevo? ¿hay un Bug *Highest*? En la reunión diaria cuentas qué cerraste, qué vas a hacer y qué te traba (si algo te traba, ponle un **flag** a la tarjeta). Trabaja de a un ticket: tómalo, nombra la clave en cada commit y, cuando esté listo, pásalo a In Review. Al final del sprint, el **Sprint report** muestra lo entregado y lo que llegó a mitad de camino (marcado con un asterisco): de eso se habla en la retrospectiva.
:::

:::real En tu computadora y en la web real
Con datos de salud, lo primero en una empresa real es **leer la política de privacidad** y saber quién es el responsable de los datos (DPO). En tu computadora: crea el repositorio, un `README.md` con el pedido y un `docs/privacidad.md` con lo que **no** puede salir del lago (nombres, documentos) y cómo se va a seudonimizar.
:::

:::capturas Capturas para tu portafolio
Guárdalas en `docs/capturas/` del repositorio del proyecto y úsalas en el README.

- `01-privacidad.png`: tu `privacidad.md` con las reglas de datos sensibles.

Antes de publicar, tapa con un rectángulo los correos, los IDs de suscripción y de tenant, los nombres de cuentas reales y cualquier clave o token.
:::

## Ejercicios

:::ejercicio quiz
¿Por qué el seudónimo se calcula con una sal secreta y no solo con sha2(documento)?
- [ ] Porque sha2 es lento
- [x] Porque los documentos son pocos y predecibles: sin sal, cualquiera puede calcular el hash de todos los documentos posibles y revertir el seudónimo
- [ ] Porque la sal hace que cada análisis tenga un seudónimo distinto
- [ ] Porque Databricks no tiene sha2
:::

:::ejercicio quiz
Norte informa la glucosa en mg/dL y Sur en mmol/L. ¿Qué haces en silver?
- [ ] Guardas cada valor como vino, con su unidad, y que cada analista convierta
- [x] Conviertes todo a una unidad canónica (mg/dL), así los resultados son comparables y los indicadores no mezclan escalas
- [ ] Descartas los del Sur
- [ ] Promedias los dos
:::

## Resumen

- Cinco fuentes de archivos, un SFTP, llegadas irregulares y cambios sin aviso.
- Dos exigencias que conviven: **integrar** (comparables entre laboratorios) y **proteger** (seudónimos, derecho al olvido).
- Dos tablas de entrega con revisión automática, y un tablero que sigue llenándose con los días.
