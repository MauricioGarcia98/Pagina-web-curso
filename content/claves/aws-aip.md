# Tarjetas: AWS AIP-C01

## Cambiar de modelo sin reescribir solicitudes
dominio: 1
API **Converse** (`toolConfig` para herramientas).

## Documentos largos con secciones
dominio: 1
Chunking **jerárquico**. Sin títulos claros: **semántico**. Formato propio: **Lambda** personalizada.

## PDF escaneados con tablas
dominio: 1
Parsing con **modelo fundacional** o **Bedrock Data Automation**.

## Cambiar el modelo de embeddings
dominio: 1
Hay que **reindexar** todo.

## Muchísimos vectores, pocas consultas, bajo costo
dominio: 1
**Amazon S3 Vectors**.

## Relaciones entre entidades
dominio: 1
**Neptune Analytics (GraphRAG)**.

## Preguntas en lenguaje natural sobre Redshift
dominio: 1
Knowledge Base de **datos estructurados** (genera SQL).

## Fragmentos correctos mal ubicados
dominio: 1
**Reranking**; preguntas compuestas: **descomposición de consultas**.

## Residencia con inferencia entre regiones
dominio: 1
Perfil de inferencia **geográfico** (por ejemplo, EU).

## Agente de cualquier framework, serverless
dominio: 2
**AgentCore Runtime**.

## APIs y Lambdas como herramientas MCP
dominio: 2
**AgentCore Gateway**.

## OAuth en nombre del usuario
dominio: 2
**AgentCore Identity**.

## Memoria entre sesiones
dominio: 2
**AgentCore Memory** (o memoria de Bedrock Agents).

## La app ejecuta la acción en vez de una Lambda
dominio: 2
**Return of control**.

## Flujo fijo de prompts, KB y condiciones
dominio: 2
**Bedrock Flows**.

## Prompts versionados con variables
dominio: 2
**Prompt Management**.

## Jailbreak e inyección en la entrada
dominio: 3
Filtro de **ataques de prompt** de Guardrails.

## Guardrails para un modelo fuera de Bedrock
dominio: 3
API **`ApplyGuardrail`**.

## Exigir un guardrail en toda invocación
dominio: 3
Condición IAM **`bedrock:GuardrailIdentifier`**.

## Guardar todos los prompts y respuestas
dominio: 3
**Model invocation logging**.

## Aislamiento entre clientes en una KB
dominio: 3
**Filtros de metadatos** fijados por la aplicación.

## Prefijo largo repetido
dominio: 4
**Caché de prompts**.

## Millones de solicitudes sin urgencia
dominio: 4
**Inferencia por lotes**.

## Throttling en picos
dominio: 4
Inferencia **entre regiones** + reintentos con backoff y jitter.

## Modelo más barato que alcance, por solicitud
dominio: 4
**Enrutamiento inteligente de prompts**.

## Evaluar un RAG
dominio: 5
**Bedrock Evaluations** para Knowledge Bases (LLM como juez).

## Respuesta cortada a la mitad
dominio: 5
`stopReason = max_tokens`: subir el máximo de tokens.
