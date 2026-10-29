# Tarjetas: Databricks Generative AI Engineer Associate

## Conocimiento propio que cambia seguido, con citas
dominio: 1
**RAG** (Vector Search + modelo), no fine-tuning.

## Formato de salida estricto
dominio: 1
Instrucciones con ejemplos + **salida estructurada** con esquema. El ajuste es el último recurso.

## Cálculos exactos dentro de un asistente
dominio: 1
Una **herramienta determinista** (función de Unity Catalog o intérprete de código).

## Flujo fijo vs. agente
dominio: 1
Pasos siempre iguales → **cadena** (más barata y predecible). Decisiones dinámicas → **agente**.

## Datos en tablas + documentos en un mismo asistente
dominio: 1
**Supervisor multiagente**: Genie para tablas + agente de recuperación para documentos (Agent Bricks).

## PDF con tablas que se rompen al extraer
dominio: 2
Mejorar el **parseo**: `ai_parse_document` o parser con layout.

## Chunks que mezclan temas
dominio: 2
Chunks más chicos alineados a secciones, con algo de **solapamiento**.

## Índice que calcula los embeddings solo
dominio: 2
**Delta Sync** con embeddings **administrados**.

## Sincronización incremental del índice
dominio: 2
La tabla de origen necesita **Change Data Feed**.

## Códigos exactos que la búsqueda vectorial no encuentra
dominio: 2
**Búsqueda híbrida** (vector + palabras clave).

## El agente no usa una herramienta que debería
dominio: 3
Revisar la **descripción** de la herramienta y de sus parámetros.

## Ver qué recuperó y qué llamó el agente
dominio: 3
**MLflow Tracing**.

## Preguntas de seguimiento que la búsqueda no entiende
dominio: 3
**Reescribir la consulta** con el historial antes de buscar.

## Los chunks correctos llegan en malas posiciones
dominio: 3
**Reranker** antes de pasar el contexto al modelo.

## Exponer funciones, índices y Genie con un protocolo estándar
dominio: 3
**Servidores MCP administrados** de Databricks.

## Versionar el prompt de sistema
dominio: 3
**Prompt Registry** de MLflow (versiones y alias).

## Interfaz estándar para evaluar y desplegar un agente
dominio: 3
`ResponsesAgent` de MLflow.

## Dónde registrar el agente
dominio: 4
En **Unity Catalog** (`catalogo.esquema.modelo`), con alias.

## Qué agrega `agents.deploy()`
dominio: 4
Endpoint + **Review App** + tablas de inferencia y monitoreo.

## Prototipo con tráfico bajo
dominio: 4
Foundation Model APIs **pay-per-token**. Tráfico alto y estable: **provisioned throughput**.

## Gobernar un proveedor de modelos externo
dominio: 4
**External model** en Model Serving (clave en secreto) + AI Gateway.

## Interfaz web para el asistente
dominio: 4
**Databricks Apps**.

## Evitar que un script agote el presupuesto
dominio: 5
**AI Gateway**: límites de tasa por usuario/endpoint + seguimiento de uso.

## PII en las respuestas
dominio: 5
**Guardrails** de AI Gateway (no solo instrucciones en el prompt).

## ¿La respuesta responde la pregunta?
dominio: 6
Scorer `RelevanceToQuery`. ¿Está sustentada en el contexto? `RetrievalGroundedness`.

## Calidad en producción sin revisar todo
dominio: 6
**Monitoreo** con scorers (LLM como juez) sobre una muestra de trazas.
