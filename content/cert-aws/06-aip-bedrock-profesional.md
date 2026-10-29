---
titulo: AIP-C01 - Generative AI Developer Professional con Amazon Bedrock
nivel: Experto
duracion: 90
resumen: Los cinco dominios del AWS Certified Generative AI Developer – Professional - arquitectura de soluciones con modelos fundacionales, Bedrock Knowledge Bases a fondo (chunking, embeddings, almacenes vectoriales, búsqueda híbrida y reranking), agentes con Bedrock Agents y AgentCore, Prompt Management y Flows, Guardrails, seguridad y gobierno, optimización de costo y latencia (caché de prompts, inferencia entre regiones, enrutamiento, Provisioned Throughput, lotes) y evaluación y resolución de problemas.
objetivos: Diseñar una aplicación generativa con Bedrock según requisitos de costo, latencia y cumplimiento | Configurar un pipeline RAG con la estrategia de chunking y el almacén vectorial adecuados | Implementar agentes con herramientas, memoria y aprobación humana | Aplicar Guardrails y controles de seguridad (IAM, PrivateLink, KMS, registros) | Optimizar costo y rendimiento con caché de prompts, inferencia por lotes y Provisioned Throughput | Evaluar y depurar aplicaciones generativas
prerrequisitos: cert-aws-aif-fundamentos-ia | cert-databricks-genai-diseno-datos
autoevaluacion: ¿Sabes qué estrategia de chunking usar con documentos muy estructurados? | ¿Sabes cuándo conviene Provisioned Throughput? | ¿Sabes qué resuelve la inferencia entre regiones? | ¿Sabes cómo reducir costo con prompts de sistema largos que se repiten? | ¿Sabes cómo evaluar un RAG?
---

:::escenario
Tomás pasó al equipo de IA. Debe llevar a producción un asistente que responde a los clientes sobre sus envíos (consultando la API de seguimiento), busca en 40.000 documentos de políticas, nunca da datos de otro cliente, responde en menos de 3 segundos y no puede costar más de USD 0,01 por conversación. Es el AIP-C01: la certificación Professional para desarrolladores de IA generativa.
:::

## El examen

- 75 preguntas (65 puntuadas), 180 minutos, USD 300, aprobación con 750/1000. Se lanzó en noviembre de 2025.
- Se recomiendan 2 o más años construyendo en AWS y 1 año con IA generativa.
- Dominios: **1.** integración de modelos fundacionales, gestión de datos y cumplimiento (31 %); **2.** implementación e integración (26 %); **3.** seguridad y gobierno de IA (20 %); **4.** eficiencia operativa y optimización (12 %); **5.** pruebas, validación y resolución de problemas (11 %).

## La arquitectura de referencia

```diagrama
titulo: Asistente de envíos con Amazon Bedrock
nodo u: Cliente | icono=usuario | col=0 | fila=1
nodo api: API Gateway + Lambda | icono=lambdaaws | col=1 | fila=1 | sub=autenticación Cognito | color=naranja
nodo gr: Guardrails | icono=guardrails | col=2 | fila=0 | sub=entrada y salida | color=rojo
nodo ag: Agente (AgentCore) | icono=agentcore | col=2 | fila=1 | sub=planifica y llama herramientas | color=verde
nodo fm: Modelo en Bedrock | icono=bedrock | col=3 | fila=0 | sub=caché de prompts | color=verde
nodo kb: Knowledge Base | icono=knowledgebases | col=3 | fila=1 | sub=búsqueda híbrida + rerank | color=azul
nodo vs: OpenSearch Serverless | icono=opensearch | col=4 | fila=1 | forma=cilindro | color=violeta
nodo seg: API de seguimiento | icono=camion | col=3 | fila=2 | sub=herramienta (Lambda) | color=naranja
nodo cw: CloudWatch | icono=cloudwatch | col=4 | fila=2 | sub=invocation logs, trazas | color=rosa
flecha u -> api
flecha api -> ag
flecha ag -> gr | estilo=punteada
flecha ag -> fm
flecha ag -> kb
flecha kb -> vs
flecha ag -> seg
flecha ag -> cw | estilo=punteada
```

## Dominio 1: modelos, datos y cumplimiento

### Elegir y consumir modelos

- **API Converse** (y `ConverseStream`): interfaz única para todos los modelos de Bedrock, con historial, herramientas (*tool use*) e imágenes. `InvokeModel` usa el formato propio de cada modelo.
- **Selección**: evaluar con datos reales (calidad, latencia, costo). Modelos chicos para clasificar o extraer; grandes para razonar.
- **Personalización** en Bedrock: **fine-tuning**, **preentrenamiento continuo**, **destilación** y modelos importados (**Custom Model Import**). Los modelos personalizados se sirven con **Provisioned Throughput** o bajo demanda según el modelo.
- **Amazon Bedrock Marketplace** y **SageMaker JumpStart** para modelos fuera del catálogo base.

### Bedrock Knowledge Bases a fondo

| Decisión | Opciones |
|---|---|
| **Fuente** | S3, web crawler, Confluence, SharePoint, Salesforce, conectores personalizados; también **datos estructurados** (Redshift) con generación de SQL |
| **Parsing** | Por defecto; con un **modelo fundacional** o **Bedrock Data Automation** para PDF con tablas e imágenes |
| **Chunking** | **Fijo** (tokens + solapamiento), **jerárquico** (fragmentos padre e hijo: busca con el chico, devuelve el grande), **semántico** (corta donde cambia el significado), **ninguno** (un archivo = un fragmento) o **personalizado con Lambda** |
| **Embeddings** | Titan Text Embeddings V2, Cohere Embed; dimensiones y tipo (float o binario) |
| **Almacén vectorial** | OpenSearch Serverless, Aurora PostgreSQL (pgvector), Neptune Analytics (GraphRAG), **S3 Vectors**, Pinecone, Redis, MongoDB Atlas |
| **Recuperación** | Semántica o **híbrida** (vector + palabras clave), **filtros por metadatos**, **reranking**, descomposición de la consulta |

- `Retrieve` devuelve fragmentos; `RetrieveAndGenerate` devuelve la respuesta con **citas**.
- **Sincronización** incremental de la fuente (ingestion jobs).
- **Filtros por metadatos** (archivos `.metadata.json` con, por ejemplo, `cliente_id` o `pais`) para limitar qué documentos ve cada usuario.

```python norun
import boto3

rt = boto3.client("bedrock-agent-runtime")
resp = rt.retrieve_and_generate(
    input={"text": "¿Cuál es el plazo para reclamar un paquete dañado?"},
    retrieveAndGenerateConfiguration={
        "type": "KNOWLEDGE_BASE",
        "knowledgeBaseConfiguration": {
            "knowledgeBaseId": "KB12345678",
            "modelArn": "arn:aws:bedrock:us-east-1::foundation-model/amazon.nova-pro-v1:0",
            "retrievalConfiguration": {
                "vectorSearchConfiguration": {
                    "numberOfResults": 8,
                    "overrideSearchType": "HYBRID",
                    "filter": {"equals": {"key": "pais", "value": "AR"}},
                }
            },
        },
    },
)
print(resp["output"]["text"])
for c in resp["citations"]:
    print([r["location"] for r in c["retrievedReferences"]])
```

### Gestión de datos y cumplimiento

- Preparar datos para FMs: limpieza, deduplicación, **detección de PII** (Comprehend, Macie, Guardrails), validación con Glue Data Quality.
- **Bedrock Data Automation**: extrae información estructurada de documentos, imágenes, audio y video.
- Residencia: elegir región; los **perfiles de inferencia entre regiones** dentro de una geografía (US, EU, APAC) mantienen el procesamiento en esa zona.

## Dominio 2: implementación e integración

### Agentes

- **Amazon Bedrock Agents**: agente administrado con instrucciones, **action groups** (esquema OpenAPI o funciones con Lambda), Knowledge Bases, **memoria** entre sesiones, **code interpreter**, **confirmación del usuario** antes de una acción y colaboración **multiagente** (supervisor y colaboradores).
- **Amazon Bedrock AgentCore**: servicios para operar agentes construidos con **cualquier framework** (Strands Agents, LangGraph, CrewAI) y cualquier modelo: **Runtime** (serverless, sesiones aisladas de hasta 8 horas), **Memory** (corto y largo plazo), **Gateway** (convierte APIs y Lambdas en herramientas **MCP**), **Identity** (OAuth hacia servicios externos en nombre del usuario), **Code Interpreter**, **Browser** y **Observability** (trazas OpenTelemetry).
- **Patrones**: ReAct (razonar y actuar), planificador-ejecutor, supervisor con subagentes, *human-in-the-loop*.
- **MCP** (Model Context Protocol) y **A2A** (agente a agente) para interoperar.

```python norun
from strands import Agent, tool
from bedrock_agentcore.runtime import BedrockAgentCoreApp

app = BedrockAgentCoreApp()

@tool
def estado_envio(envio_id: str) -> str:
    """Devuelve el estado actual de un envío."""
    return consultar_api_seguimiento(envio_id)

agente = Agent(
    model="us.amazon.nova-pro-v1:0",
    system_prompt="Eres el asistente de envíos. Solo respondes sobre envíos del cliente autenticado.",
    tools=[estado_envio],
)

@app.entrypoint
def invocar(payload):
    return {"respuesta": str(agente(payload["prompt"]))}

app.run()
```

### Prompts y flujos

- **Bedrock Prompt Management**: prompts versionados con variables, configuración de inferencia y comparación de variantes.
- **Bedrock Flows**: flujos visuales que encadenan prompts, Knowledge Bases, Lambda, condiciones y agentes.
- **Salida estructurada**: tool use con esquema JSON, o pedir JSON y validarlo.
- **Integración**: API Gateway (REST o WebSocket para streaming), Lambda, Step Functions para procesos largos, EventBridge, SQS para desacoplar, AppSync.
- **Amazon Q Business** para un asistente empresarial sin construir RAG; **Q Developer** para generar código.

## Dominio 3: seguridad y gobierno

- **Guardrails for Amazon Bedrock**: filtros de contenido (odio, insultos, sexual, violencia, mala conducta, **ataques de prompt**) con intensidad configurable, **temas denegados**, filtros de palabras, **PII** (bloquear o enmascarar), **grounding contextual** (umbral de fundamentación y relevancia) y **razonamiento automatizado** (verifica respuestas contra políticas formales). Se aplica en la invocación o por separado con **`ApplyGuardrail`** (también a modelos fuera de Bedrock).
- **IAM**: permisos por modelo (`bedrock:InvokeModel` sobre ARN concretos), por Knowledge Base y por agente; condiciones con etiquetas.
- **Red**: **VPC endpoints (PrivateLink)** para Bedrock; los jobs de personalización pueden correr dentro de la VPC.
- **Cifrado** con KMS administrado por el cliente para Knowledge Bases, agentes, modelos personalizados y logs.
- **Registros**: **model invocation logging** (prompts y respuestas a CloudWatch Logs o S3) y CloudTrail para las llamadas de control.
- **Multiinquilino**: aislar datos por cliente con filtros de metadatos, Knowledge Bases separadas o identidad propagada; nunca confiar en que el prompt "pida" respetar el aislamiento.
- **Amenazas**: inyección directa e indirecta (en documentos recuperados o páginas), exfiltración por herramientas, *jailbreaks*, envenenamiento de la base de conocimiento. Defensa en capas: Guardrails, validación de entradas y salidas, permisos mínimos para las herramientas, aprobación humana.

## Dominio 4: eficiencia operativa y optimización

| Técnica | Efecto |
|---|---|
| **Caché de prompts** | Reutiliza un prefijo largo repetido (prompt de sistema, documentos): hasta 90 % menos costo y menos latencia en esos tokens |
| **Inferencia entre regiones** (*cross-region inference*) | Distribuye la carga entre regiones de una geografía: más capacidad y menos errores de *throttling* |
| **Enrutamiento inteligente de prompts** | Envía cada solicitud al modelo más barato de una familia que pueda responder bien |
| **Inferencia por lotes** | Procesa archivos JSONL de forma asíncrona con descuento (~50 %) |
| **Provisioned Throughput** | Capacidad reservada (unidades de modelo) para volumen alto y estable o modelos personalizados |
| **Inferencia optimizada para latencia** | Variante de algunos modelos con menor latencia |
| **Modelos más chicos o destilados** | Menos costo por token |
| **Reducir tokens** | Prompts concisos, menos fragmentos recuperados, límites de salida, resúmenes del historial |
| **Streaming** | Mejora la latencia percibida (primer token) |

Ante **`ThrottlingException`**: reintentos con espera exponencial y *jitter*, inferencia entre regiones, solicitar más cuota o Provisioned Throughput.

## Dominio 5: pruebas, validación y resolución de problemas

- **Bedrock Evaluations**: evaluación de modelos y de **Knowledge Bases (RAG)** automática (con un **modelo como juez**: corrección, completitud, fidelidad, relevancia de la recuperación, daño) o humana.
- Conjuntos de prueba propios ("golden datasets"), pruebas de regresión de prompts en CI, pruebas A/B.
- **Diagnóstico**:
  - Respuestas sin relación con los documentos → revisar el chunking, el modelo de embeddings, el número de resultados, la búsqueda híbrida o el reranking.
  - Inventa datos → umbral de grounding en Guardrails, instrucciones de citar, menos temperatura.
  - El agente elige mal la herramienta → mejorar descripciones de herramientas y del esquema, menos herramientas por agente.
  - Respuestas cortadas → `stopReason` = `max_tokens`: subir el máximo.
  - Contexto excedido → menos fragmentos, resumir historial.
- **Observabilidad**: invocation logs, métricas de CloudWatch (`Invocations`, `InvocationLatency`, `InputTokenCount`, `OutputTokenCount`, `InvocationThrottles`), trazas de agentes y AgentCore Observability.

:::examen Decisiones típicas
- "Prompt de sistema de 5.000 tokens repetido en cada llamada" → **caché de prompts**.
- "Clasificar 2 millones de tickets esta noche al menor costo" → **inferencia por lotes**.
- "Errores de throttling en picos" → **inferencia entre regiones** y reintentos.
- "Agente que necesita OAuth hacia Salesforce en nombre del usuario" → **AgentCore Identity**.
- "Exponer APIs internas como herramientas MCP" → **AgentCore Gateway**.
- "Documentos largos con secciones y subsecciones" → chunking **jerárquico**.
:::

## Ejercicios

:::ejercicio quiz
Cada llamada al asistente incluye un prompt de sistema de 6.000 tokens idéntico y el costo de entrada es alto. ¿Qué optimización es más directa?
- [ ] Provisioned Throughput.
- [x] Caché de prompts para ese prefijo.
- [ ] Subir la temperatura.
- [ ] Usar InvokeModel en vez de Converse.
```explicacion
La caché de prompts reutiliza el prefijo repetido y cobra mucho menos por los tokens leídos de caché, además de bajar la latencia.
```
:::

:::ejercicio quiz
Hay que resumir 3 millones de reclamos acumulados; los resultados se necesitan mañana. ¿Qué es lo más rentable?
- [ ] Llamadas síncronas en paralelo con Lambda.
- [x] Inferencia por lotes de Amazon Bedrock con un archivo JSONL en S3.
- [ ] Provisioned Throughput por un mes.
- [ ] Un agente con code interpreter.
```explicacion
La inferencia por lotes procesa grandes volúmenes de forma asíncrona con descuento respecto de la bajo demanda.
```
:::

:::ejercicio quiz
Un RAG sobre manuales con capítulos, secciones y subsecciones recupera fragmentos que no tienen contexto suficiente para responder. ¿Qué cambias primero?
- [ ] Subir la temperatura del modelo.
- [x] Usar chunking jerárquico: buscar con fragmentos chicos y devolver el padre.
- [ ] Quitar el solapamiento entre fragmentos.
- [ ] Cambiar a un modelo con menos contexto.
```explicacion
El chunking jerárquico combina la precisión de los fragmentos chicos en la búsqueda con el contexto del fragmento padre en la respuesta.
```
:::

:::ejercicio quiz
Un asistente multiinquilino no debe recuperar documentos de otros clientes. ¿Qué control es el correcto?
- [ ] Indicar en el prompt de sistema que no muestre documentos de otros clientes.
- [x] Filtros de metadatos por `cliente_id` aplicados por la aplicación en cada recuperación.
- [ ] Un filtro de contenido de Guardrails con intensidad alta.
- [ ] Reducir el número de resultados a 1.
```explicacion
El aislamiento debe imponerse en la recuperación con filtros que la aplicación fija según la identidad, no pidiéndoselo al modelo.
```
:::

:::ejercicio quiz
La aplicación recibe `ThrottlingException` en horas pico con un modelo bajo demanda. ¿Qué combinación aplicas?
- [ ] Bajar el máximo de tokens y la temperatura.
- [x] Reintentos con espera exponencial y un perfil de inferencia entre regiones.
- [ ] Desactivar los Guardrails.
- [ ] Cambiar a la API InvokeModel.
```explicacion
La inferencia entre regiones distribuye las solicitudes en la geografía y los reintentos absorben picos; si persiste, más cuota o Provisioned Throughput.
```
:::

:::ejercicio abierto
El asistente de envíos a veces responde con plazos que no figuran en las políticas. Describe cómo lo diagnosticas y qué tres cambios harías, indicando cómo verificarías la mejora.
```text solucion
Diagnóstico: revisar los invocation logs y las trazas de las conversaciones con error; ver qué fragmentos se recuperaron. Si los fragmentos correctos no aparecen, el problema es la recuperación; si aparecen pero el modelo inventa, es la generación.
Cambios:
1. Recuperación: búsqueda híbrida, reranking y chunking jerárquico o semántico; filtros por país.
2. Generación: instrucciones de responder solo con el contexto y citar, temperatura baja, "no lo sé" si no hay información.
3. Guardrails con verificación de grounding contextual (umbral de fundamentación) para bloquear respuestas no respaldadas.
Verificación: un conjunto de 200 preguntas con respuesta esperada y una evaluación de Knowledge Base en Bedrock Evaluations (fidelidad, corrección, relevancia de la recuperación) antes y después, integrada en CI para detectar regresiones.
```
:::
