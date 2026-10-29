---
titulo: IA generativa II - desarrollar agentes con herramientas, MCP y Agent Bricks
nivel: Avanzado
duracion: 60
resumen: Qué es un agente y cómo funciona el llamado a herramientas, herramientas como funciones de Unity Catalog, servidores MCP, Genie como agente de datos, el Agent Framework con la interfaz ResponsesAgent de MLflow, LangGraph y otros frameworks, Agent Bricks (Knowledge Assistant y Supervisor Agent), trazas con MLflow, memoria y patrones multiagente.
objetivos: Explicar el ciclo de razonamiento y herramientas de un agente | Crear herramientas como funciones de Unity Catalog con descripciones útiles para el modelo | Construir un agente con el Agent Framework y registrarlo con la interfaz ResponsesAgent | Elegir entre construir un agente con código o con Agent Bricks | Instrumentar un agente con trazas de MLflow para depurarlo
prerrequisitos: cert-databricks-genai-diseno-datos
autoevaluacion: ¿Sabes qué hace el modelo y qué hace tu código en el llamado a herramientas? | ¿Sabes por qué importa la descripción de una función usada como herramienta? | ¿Sabes qué es un servidor MCP y qué servidores administrados ofrece Databricks? | ¿Sabes cuándo usar Agent Bricks? | ¿Sabes qué muestra una traza de MLflow?
---

:::escenario
El asistente de Rápido ya recupera bien del manual (lección anterior). Ahora tiene que **actuar**: consultar el estado de un pedido, calcular la comisión de un mes y, si el restaurante lo pide, abrir un ticket. Además el área comercial quiere que también responda preguntas de datos ("¿cuánto vendí en octubre?") sin que nadie escriba SQL. El dominio de **desarrollo de aplicaciones** (30 % del examen, el más pesado) trata de construir esto.
:::

## Qué es un agente

Un **agente** es un programa en el que un LLM decide, en un ciclo, **qué hacer a continuación**: responder o llamar a una **herramienta** (*tool*), leer el resultado y volver a decidir, hasta tener la respuesta.

```diagrama
titulo: El ciclo de un agente con herramientas
nodo u: Pregunta del usuario | icono=usuario | col=0 | fila=0
nodo m: LLM | icono=ml | col=1 | fila=0 | sub=decide: responder o usar herramienta | color=verde
nodo t: Tu código ejecuta la herramienta | icono=engranaje | col=2 | fila=0 | color=azul
nodo h1: buscar_manual | icono=lupa | col=3 | fila=0 | sub=Vector Search
nodo h2: estado_pedido | icono=tabla | col=3 | fila=1 | sub=función de UC
nodo h3: abrir_ticket | icono=api | col=3 | fila=2 | sub=API externa
nodo r: Respuesta final | icono=check | col=1 | fila=1
flecha u -> m
flecha m -> t: pide herramienta + argumentos
flecha t -> h1
flecha t -> h2
flecha t -> h3
flecha t -> m: resultado | estilo=punteada
flecha m -> r
```

Lo importante del **llamado a herramientas** (*tool calling* o *function calling*): el modelo **no ejecuta nada**. Recibe la lista de herramientas (nombre, descripción, parámetros en JSON Schema), y cuando decide usar una, devuelve un mensaje "llamar a `estado_pedido` con `{"pedido_id": 88213}`". **Tu código** ejecuta la herramienta y le devuelve el resultado al modelo. Por eso la **descripción** de cada herramienta es tan importante: es lo único que el modelo sabe para decidir cuándo usarla.

## Herramientas como funciones de Unity Catalog

La forma gobernada de crear herramientas en Databricks es escribir **funciones de Unity Catalog** (SQL o Python). Quedan con permisos, linaje y auditoría, y se pueden reutilizar en cualquier agente.

```sql norun
CREATE OR REPLACE FUNCTION prod.ia.estado_pedido(
  pedido_id BIGINT COMMENT 'Número del pedido, por ejemplo 88213'
)
RETURNS STRING
COMMENT 'Devuelve el estado actual de un pedido de Rápido (creado, aceptado, en camino, entregado o cancelado). Úsala cuando el usuario pregunte por un pedido concreto.'
RETURN (SELECT estado FROM prod.silver.pedidos p WHERE p.pedido_id = estado_pedido.pedido_id LIMIT 1);

CREATE OR REPLACE FUNCTION prod.ia.comision_mes(restaurante_id BIGINT, mes STRING COMMENT 'Mes en formato YYYY-MM')
RETURNS DECIMAL(12,2)
COMMENT 'Calcula la comisión cobrada a un restaurante en un mes.'
RETURN (SELECT SUM(subtotal * comision_pct / 100) FROM prod.gold.pedidos_restaurante
        WHERE restaurante_id = comision_mes.restaurante_id AND date_format(dia, 'yyyy-MM') = comision_mes.mes);
```

Los **comentarios** de la función y de cada parámetro se convierten en la descripción que ve el modelo. Una herramienta mal descrita es una herramienta que el modelo no usa, o usa mal.

## MCP: herramientas por protocolo

**MCP** (*Model Context Protocol*) es un protocolo abierto para exponer herramientas y datos a los agentes de forma estándar. Un **servidor MCP** publica herramientas; un agente (cliente MCP) las descubre y las llama. Databricks ofrece **servidores MCP administrados** para funciones de Unity Catalog, índices de Vector Search y espacios de Genie, y permite conectar servidores MCP externos o propios (alojados, por ejemplo, en Databricks Apps). La ventaja: el agente no necesita código específico para cada herramienta y los permisos siguen pasando por Unity Catalog.

## Genie: un agente para preguntas de datos

Un **espacio de Genie** (AI/BI Genie) responde preguntas en lenguaje natural sobre un conjunto de tablas generando SQL, usando las descripciones de las tablas, ejemplos de consultas e instrucciones que define el equipo de datos. Para "¿cuánto vendí en octubre?", Genie es la herramienta adecuada, y puede ser un subagente de un agente mayor.

## Construir el agente con código: Agent Framework

El **Agent Framework** de Databricks permite escribir agentes con cualquier biblioteca (LangGraph, OpenAI Agents SDK, LlamaIndex, código Python puro) y empaquetarlos con una interfaz estándar de MLflow, **`ResponsesAgent`** (compatible con el formato de la API *Responses* de OpenAI; la interfaz anterior, `ChatAgent`, sigue funcionando). Con esa interfaz, el agente funciona con la evaluación, el despliegue, la aplicación de revisión y el monitoreo de Databricks.

```python norun
# agente.py: esquema de un agente con herramientas
import mlflow
from mlflow.pyfunc import ResponsesAgent
from mlflow.types.responses import ResponsesAgentRequest, ResponsesAgentResponse

mlflow.openai.autolog()                       # trazas automáticas de cada llamada al modelo

class AgenteSoporte(ResponsesAgent):
    def __init__(self):
        self.modelo = "databricks-claude-sonnet-4"          # un endpoint de Model Serving
        self.herramientas = cargar_herramientas_uc(["prod.ia.estado_pedido", "prod.ia.comision_mes"])

    @mlflow.trace(span_type="AGENT")
    def predict(self, request: ResponsesAgentRequest) -> ResponsesAgentResponse:
        mensajes = [{"role": "system", "content": PROMPT_SISTEMA}, *request.input]
        while True:
            salida = llamar_modelo(self.modelo, mensajes, self.herramientas)
            if not salida.llamadas_a_herramientas:
                return ResponsesAgentResponse(output=[salida.mensaje_final])
            for llamada in salida.llamadas_a_herramientas:          # tu código ejecuta cada herramienta
                resultado = ejecutar(llamada.nombre, llamada.argumentos)
                mensajes.append(resultado_como_mensaje(llamada, resultado))

mlflow.models.set_model(AgenteSoporte())
```

Lo que importa para el examen no es la sintaxis exacta, sino las piezas: un **endpoint de modelo**, una lista de **herramientas**, el **ciclo** de decisión con un límite de iteraciones, la interfaz **`ResponsesAgent`** y las **trazas**.

### Frameworks y patrones

- **LangChain / LangGraph**: LangGraph modela el agente como un grafo de estados (nodos y transiciones), útil para flujos con pasos y condiciones explícitas.
- **Cadenas (chains)** vs. **agentes**: una cadena ejecuta pasos fijos (recuperar → generar); un agente decide los pasos. Si el flujo siempre es el mismo, una cadena es más predecible y barata.
- **Multiagente con supervisor**: un agente supervisor decide a qué agente especializado derivar (manual, datos, tickets) y combina las respuestas.
- **Memoria**: la conversación se envía en cada llamada (memoria de corto plazo); para recordar entre sesiones se guarda en una base (por ejemplo, Lakebase, el PostgreSQL administrado de Databricks).
- **Salidas estructuradas**: pedir al modelo una respuesta que cumpla un esquema JSON cuando la salida la consume otro programa.

## Agent Bricks: agentes sin código

**Agent Bricks** construye agentes declarando el objetivo y las fuentes, y optimiza la calidad automáticamente:

| Agent Brick | Para qué |
|---|---|
| **Knowledge Assistant** | Preguntas y respuestas con citas sobre documentos (PDF, texto) en volúmenes: un RAG listo |
| **Supervisor Agent** (antes *Multi-Agent Supervisor*) | Coordina espacios de Genie, endpoints de agentes, funciones de Unity Catalog y servidores MCP |
| **Extracción de información** | Convierte documentos en campos estructurados |
| **LLM personalizado** | Tareas de texto específicas (resumir, clasificar, transformar) con un modelo optimizado |

**¿Agent Bricks o código?** Agent Bricks para casos comunes (Q&A sobre documentos, extracción, coordinar agentes existentes) con poco tiempo y sin necesidad de lógica a medida. Código con el Agent Framework cuando hace falta controlar el flujo, integrar sistemas propios o lógica de negocio compleja.

## Prototipar y depurar

- **AI Playground**: interfaz para probar modelos, prompts y herramientas sin escribir código, y exportar el resultado a un notebook.
- **MLflow Tracing**: registra cada paso del agente como una **traza** con *spans* anidados: el prompt enviado, la respuesta del modelo, cada llamada a herramienta con sus argumentos y resultados, los documentos recuperados, la latencia y los tokens. Se activa con *autolog* (`mlflow.langchain.autolog()`, `mlflow.openai.autolog()`) o con el decorador `@mlflow.trace`. Cuando el agente responde mal, la traza muestra **dónde** se equivocó: si no recuperó el documento, si eligió la herramienta equivocada o si interpretó mal el resultado.

:::examen Patrones que se preguntan
- "El agente nunca usa la herramienta `comision_mes` aunque la pregunta es de comisiones" → mejorar la **descripción** de la función y de sus parámetros.
- "Hay que reutilizar las mismas herramientas en varios agentes con permisos controlados" → **funciones de Unity Catalog** (o expuestas por MCP).
- "Preguntas en lenguaje natural sobre tablas de ventas" → **Genie**.
- "Un asistente de Q&A sobre PDFs, rápido y sin código" → **Agent Bricks: Knowledge Assistant**.
- "Saber por qué el agente dio una respuesta incorrecta" → **trazas de MLflow**.
:::

:::errores
- **Herramientas sin descripción o con nombres crípticos (`fn1`).** Síntoma: el modelo no las usa o las confunde. Corrección: nombre claro, comentario que diga cuándo usarla y parámetros documentados.
- **Ciclo de agente sin límite.** Síntoma: el agente llama herramientas en bucle y el costo se dispara. Corrección: máximo de iteraciones.
- **Darle al agente herramientas que modifican datos sin control.** Síntoma: acciones no deseadas. Corrección: permisos mínimos y confirmación humana para acciones sensibles.
- **Un agente cuando alcanza una cadena.** Síntoma: respuestas impredecibles y más caras. Corrección: si el flujo es fijo, cadena.
:::

:::trabajo Cómo se organiza en un equipo
Las herramientas viven como funciones en un esquema `prod.ia` con dueños y permisos; el código del agente está en un repositorio con un bundle; cada cambio se evalúa contra un conjunto de preguntas antes de desplegar (próxima lección); y las trazas de producción se revisan cada semana para encontrar preguntas que el agente no resuelve.
:::

:::entrevista
**"¿Qué hace el modelo y qué hace tu código cuando un agente usa una herramienta?"** El modelo solo decide: devuelve el nombre de la herramienta y los argumentos en JSON. Mi código valida esos argumentos, ejecuta la herramienta con los permisos del agente, y le devuelve el resultado al modelo como un mensaje nuevo. El modelo nunca ejecuta código ni accede a datos por su cuenta.
:::

## Ejercicios

:::ejercicio quiz
En el llamado a herramientas, ¿quién ejecuta la función `estado_pedido`?
- [ ] El LLM, dentro del endpoint de Model Serving.
- [x] El código del agente, que recibe del modelo el nombre de la herramienta y los argumentos.
- [ ] Vector Search, que tiene acceso a las tablas.
- [ ] Unity Catalog, automáticamente cuando el modelo menciona la función.
```explicacion
El modelo solo pide la herramienta. La aplicación (el agente) la ejecuta y devuelve el resultado al modelo.
```
:::

:::ejercicio quiz
Un agente tiene la herramienta `prod.ia.comision_mes`, pero cuando los usuarios preguntan por comisiones responde "no tengo esa información". Las trazas muestran que nunca la llama. ¿Qué corriges primero?
- [ ] Subir la temperatura para que el modelo explore más herramientas.
- [x] La descripción de la función y de sus parámetros, para que el modelo entienda cuándo usarla.
- [ ] Cambiar la función de SQL a Python.
- [ ] Aumentar la cantidad de documentos recuperados.
```explicacion
El modelo elige herramientas por su nombre y su descripción. Si la descripción no menciona comisiones, el modelo no sabe que sirve para eso.
```
:::

:::ejercicio quiz
El área comercial quiere preguntar en lenguaje natural "¿cuánto vendí en octubre por ciudad?" sobre las tablas gold. ¿Qué componente usas?
- [ ] Un índice de Vector Search sobre las tablas gold.
- [x] Un espacio de Genie configurado sobre esas tablas.
- [ ] Un Knowledge Assistant con las tablas exportadas a PDF.
- [ ] Un modelo ajustado con el historial de ventas.
```explicacion
Genie traduce preguntas a SQL sobre tablas, usando sus descripciones e instrucciones. Vector Search sirve para buscar textos parecidos, no para agregar ventas.
```
:::

:::ejercicio quiz
Hay que tener en dos semanas un asistente que responda preguntas con citas sobre 2.000 PDFs de un volumen, sin lógica a medida. ¿Qué es lo más adecuado?
- [x] Agent Bricks: Knowledge Assistant.
- [ ] Un agente escrito desde cero con LangGraph.
- [ ] Un modelo ajustado con el texto de los PDFs.
- [ ] Un espacio de Genie sobre los PDFs.
```explicacion
Knowledge Assistant resuelve Q&A con citas sobre documentos sin escribir código y optimiza la calidad automáticamente.
```
:::

:::ejercicio quiz
¿Para qué sirve la interfaz `ResponsesAgent` de MLflow?
- [ ] Para entrenar el modelo de lenguaje del agente.
- [x] Para empaquetar el agente con una interfaz estándar compatible con la evaluación, el despliegue y el monitoreo de Databricks.
- [ ] Para generar automáticamente las herramientas a partir de las tablas.
- [ ] Para limitar la cantidad de tokens de las respuestas.
```explicacion
Con una interfaz estándar, el agente se puede registrar en MLflow, evaluar, desplegar en Model Serving y monitorear sin importar con qué biblioteca se escribió.
```
:::

:::ejercicio quiz
Un agente respondió mal una pregunta. ¿Qué herramienta te muestra paso a paso qué documentos recuperó, qué herramientas llamó y qué devolvió el modelo?
- [ ] La Spark UI.
- [ ] El historial de consultas de SQL.
- [x] MLflow Tracing.
- [ ] Las tablas de facturación.
```explicacion
Las trazas de MLflow registran cada paso del agente con entradas, salidas, latencia y tokens.
```
:::

:::ejercicio abierto
Escribe una función de Unity Catalog `prod.ia.pedidos_activos` que reciba `restaurante_id` y devuelva cuántos pedidos tiene ese restaurante en estado `en camino`, con un comentario que le explique al modelo cuándo usarla.
```sql solucion
CREATE OR REPLACE FUNCTION prod.ia.pedidos_activos(
  restaurante_id BIGINT COMMENT 'Id del restaurante socio'
)
RETURNS BIGINT
COMMENT 'Cuenta los pedidos de un restaurante que están en camino ahora. Úsala cuando el restaurante pregunte cuántos pedidos tiene en reparto.'
RETURN (SELECT COUNT(*) FROM prod.silver.pedidos p
        WHERE p.restaurante_id = pedidos_activos.restaurante_id AND p.estado = 'en camino');
```
:::
