---
titulo: AI-103 - Microsoft Foundry, IA generativa, RAG con Azure AI Search y agentes
nivel: Avanzado
duracion: 65
resumen: Los dos dominios más pesados de AI-103 - planificar y administrar una solución en Microsoft Foundry (recursos y proyectos, catálogo y tipos de despliegue de modelos, cuotas, autenticación sin claves, filtros de contenido, red y costos) e implementar IA generativa y agentes (prompts, RAG con Azure AI Search, Foundry Agent Service con sus herramientas, multiagente, evaluación, trazas y ajuste fino).
objetivos: Crear y organizar recursos y proyectos de Microsoft Foundry y elegir el tipo de despliegue de un modelo | Proteger una solución con autenticación de Entra ID, identidades administradas y filtros de contenido | Construir RAG con un índice híbrido y semántico de Azure AI Search | Crear agentes con herramientas, conocimiento y orquestación multiagente en Foundry Agent Service | Evaluar, trazar y mejorar una aplicación generativa
prerrequisitos: cert-azure-mapa-certificaciones | cert-databricks-genai-diseno-datos
autoevaluacion: ¿Sabes la diferencia entre un despliegue Standard, Global Standard y Provisioned? | ¿Sabes autenticar una app contra Foundry sin claves? | ¿Sabes qué agrega el ranker semántico a una búsqueda híbrida? | ¿Sabes qué herramientas puede usar un agente de Foundry? | ¿Sabes qué evaluadores miden la calidad y cuáles la seguridad?
---

:::escenario
Lucía construye para la cadena de farmacias un asistente que responde a los farmacéuticos sobre interacciones de medicamentos usando los prospectos (miles de PDF), consulta el stock de cada sucursal y, si falta un producto, crea un pedido de reposición. Debe cumplir con las políticas de seguridad del grupo: nada de claves en el código, datos que no salgan de la región y bloqueo de contenido dañino. Todo esto es la mitad del AI-103.
:::

## Microsoft Foundry: recursos y proyectos

**Microsoft Foundry** (antes Azure AI Foundry y Azure AI Studio) es la plataforma de Azure para construir aplicaciones y agentes de IA.

- **Recurso de Foundry**: el recurso de Azure que define el límite de gobierno, red y facturación. Contiene **proyectos**.
- **Proyecto**: el espacio de trabajo de un equipo o aplicación: despliegues de modelos, agentes, conexiones, evaluaciones y archivos. Los proyectos de Foundry ya no requieren un *hub*; los proyectos basados en hub siguen existiendo para algunas capacidades, como camino heredado.
- **Conexiones**: acceso configurado a otros recursos (Azure AI Search, Storage, Bing, servicios externos) que usan los agentes y las herramientas.

## Modelos: catálogo y tipos de despliegue

El **catálogo de modelos** incluye modelos de OpenAI vendidos por Azure, otros modelos vendidos directamente por Azure (por ejemplo, de Meta, Mistral, DeepSeek o xAI, según disponibilidad) y modelos de socios. Para usar un modelo, se crea un **despliegue** con un nombre, que es lo que llama la aplicación.

| Tipo de despliegue | Dónde se procesa | Cobro | Cuándo |
|---|---|---|---|
| **Global Standard** | En cualquier región de Azure del mundo | Por token | Mejor disponibilidad y cuota; sin requisitos de residencia de datos durante el procesamiento |
| **Data Zone Standard** | Dentro de una zona (por ejemplo, la UE o EE. UU.) | Por token | Hay que mantener el procesamiento dentro de una zona geográfica |
| **Standard** (regional) | En la región del recurso | Por token | Residencia estricta en una región |
| **Provisioned** (global, zona o regional) | Capacidad dedicada en **PTU** (*provisioned throughput units*) | Por hora o reserva | Volumen alto y estable, latencia predecible |
| **Global Batch** | Global, asíncrono | Por token, con descuento | Procesar muchas solicitudes sin urgencia (respuesta en hasta 24 h) |

La **cuota** se mide en tokens por minuto (TPM) por modelo, región y tipo de despliegue. Si una aplicación recibe errores **429**, está superando la cuota o los límites: se reparte la carga, se pide más cuota, se usa Global Standard o se pasa a Provisioned.

:::examen Elegir el despliegue
- "Los datos de clientes europeos no pueden procesarse fuera de la UE, y se paga por uso" → **Data Zone Standard** (UE).
- "Resumir 2 millones de documentos durante el fin de semana al menor costo" → **Global Batch**.
- "Un call center con tráfico alto y constante que necesita latencia estable" → **Provisioned**.
- "Errores 429 en horas pico con un despliegue Standard regional" → más cuota, **Global Standard** o Provisioned.
:::

## Seguridad, red y costo

- **Autenticación sin claves**: la aplicación usa **Microsoft Entra ID** con `DefaultAzureCredential` y una **identidad administrada** (en producción) con un rol de RBAC sobre el recurso (por ejemplo **Azure AI User** o **Cognitive Services OpenAI User**). Las claves de API funcionan, pero son secretos de larga duración: si se usan, van en **Key Vault** y se rotan.
- **Red**: **private endpoints** y desactivar el acceso público para que el tráfico no salga a internet; la red administrada del proyecto para los agentes.
- **Filtros de contenido** (Azure AI Content Safety): todo despliegue tiene una política que filtra entradas y salidas por categorías (odio, sexual, violencia, autolesiones) y niveles de severidad, más **Prompt Shields** contra *jailbreaks* y ataques indirectos (instrucciones escondidas en documentos), detección de material protegido y de afirmaciones sin respaldo (*groundedness*). Se crean políticas propias y se asignan a cada despliegue.
- **Monitoreo y costo**: métricas del recurso en Azure Monitor (tokens, latencia, solicitudes rechazadas), **Application Insights** para trazas, y **Cost Management** con presupuestos. Para bajar costos: modelos más chicos para tareas simples, menos contexto, caché de prompts, Batch para lo asíncrono.

## Prompts y respuestas estructuradas

Las aplicaciones llaman a los modelos con el **SDK de Foundry** o con la API compatible con OpenAI (incluida la API *Responses*). Las técnicas son las de siempre: **mensaje de sistema** con rol e instrucciones, ejemplos (*few-shot*), delimitadores para el contexto, **salidas estructuradas** con un esquema JSON cuando la respuesta la procesa un programa, y parámetros (`temperature`, `max_output_tokens`).

## RAG con Azure AI Search

**Azure AI Search** es el servicio de búsqueda de Azure para RAG.

```diagrama
titulo: RAG con Azure AI Search y Foundry
nodo blob: Prospectos PDF | icono=archivos | col=0 | fila=0 | sub=Blob Storage
nodo idx: Indexador + skillset | icono=engranaje | col=1 | fila=0 | sub=extraer, dividir, vectorizar | color=azul
nodo ai: Índice de AI Search | icono=aisearch | col=2 | fila=0 | sub=texto + vectores | color=violeta
nodo app: App o agente | icono=robot | col=1 | fila=1 | color=verde
nodo q: Consulta híbrida\n+ ranker semántico | icono=lupa | col=2 | fila=1 | color=violeta
nodo llm: Modelo en Foundry | icono=foundry | col=3 | fila=1 | sub=respuesta con citas | color=verde
flecha blob -> idx
flecha idx -> ai
flecha app -> q
flecha ai -> q | estilo=punteada
flecha q -> llm: contexto
```

- **Índice**: campos con atributos (*searchable*, *filterable*, *sortable*, *facetable*, *retrievable*) y **campos vectoriales** con su dimensión y un **perfil vectorial** (algoritmo HNSW o búsqueda exhaustiva).
- **Indexador**: lee una fuente (Blob Storage, ADLS, Azure SQL, Cosmos DB…) en forma programada e incremental. El **skillset** enriquece cada documento: extraer texto (OCR), **dividir en fragmentos** (*Text Split*), generar **embeddings** con un modelo de Foundry. Esto es la **vectorización integrada**: el servicio también convierte la pregunta en vector al consultar.
- **Búsqueda híbrida**: combina la búsqueda por palabras clave (BM25) y la vectorial, fusionando resultados con **RRF** (*Reciprocal Rank Fusion*).
- **Ranker semántico**: reordena los mejores resultados con un modelo de lenguaje de Microsoft y puede devolver **subtítulos** y **respuestas** destacadas. Es la combinación que suele dar mejor relevancia: híbrida + semántica.
- **Filtros** sobre campos *filterable* (por ejemplo, país o vigencia) y **seguridad a nivel de documento** filtrando por grupos del usuario.
- **Recuperación agéntica**: el servicio puede usar un modelo para descomponer una pregunta compleja en varias subconsultas, ejecutarlas y combinar los resultados.

## Agentes con Foundry Agent Service

Un **agente** en Foundry es un modelo + **instrucciones** + **herramientas** + conocimiento, que mantiene una **conversación** y decide qué herramienta usar.

| Herramienta | Para qué |
|---|---|
| **File search** | Buscar en archivos subidos (crea un almacén de vectores administrado) |
| **Azure AI Search** | Buscar en un índice propio de AI Search |
| **Grounding con Bing Search** | Información pública y actual de la web |
| **Code interpreter** | Ejecutar Python en un entorno aislado: cálculos, gráficos, procesar archivos |
| **Function calling** | Funciones de tu aplicación (consultar stock, crear un pedido) |
| **OpenAPI** | Llamar a una API descrita con una especificación OpenAPI |
| **MCP** | Herramientas de un servidor *Model Context Protocol* |
| **Azure Functions**, **Logic Apps** | Acciones y flujos de integración |

- **Multiagente**: un agente principal delega en **agentes conectados** especializados (uno de interacciones de medicamentos, otro de stock), o se define un **flujo de trabajo** (*workflow*) con pasos y agentes.
- **Controles**: aprobación humana antes de ejecutar herramientas sensibles (crear el pedido), límites de herramientas por agente, filtros de contenido del despliegue, y gobierno del acceso a herramientas.
- **Memoria**: la conversación guarda el contexto; la memoria persistente permite recordar preferencias entre sesiones.

```python norun
# Esquema con el SDK de Foundry (azure-ai-projects): el agente usa un índice de AI Search y una función propia
from azure.identity import DefaultAzureCredential
from azure.ai.projects import AIProjectClient

proyecto = AIProjectClient(endpoint="https://farmacias.services.ai.azure.com/api/projects/asistente",
                           credential=DefaultAzureCredential())          # sin claves: Entra ID

agente = proyecto.agents.create_agent(
    model="gpt-4.1-mini",                                                # nombre del despliegue
    name="asistente-farmacia",
    instructions="Responde solo con los prospectos. Cita el medicamento y la sección. "
                 "Antes de crear un pedido, pide confirmación al usuario.",
    tools=[herramienta_ai_search_prospectos, herramienta_funcion_stock, herramienta_funcion_pedido],
)
```

## Evaluar y observar

- **Evaluadores de calidad**: *groundedness* (¿la respuesta se apoya en el contexto?), relevancia, coherencia, fluidez, similitud con una respuesta esperada; para agentes, resolución de la intención, exactitud de las llamadas a herramientas y adherencia a la tarea.
- **Evaluadores de riesgo y seguridad**: contenido dañino, material protegido, vulnerabilidad a *jailbreak*; y el **agente de red teaming** para probar ataques automáticamente.
- **Trazas**: con OpenTelemetry y Application Insights se ve cada paso del agente (llamadas al modelo, herramientas, latencia, tokens).
- **Ajuste fino** (*fine-tuning*): supervisado, por preferencias o por refuerzo, para estilo, formato o tareas específicas; para conocimiento que cambia, RAG.

:::errores
- **Claves de API en el código o en el repositorio.** Síntoma: alerta de seguridad y rotación de emergencia. Corrección: identidad administrada y Entra ID.
- **Solo búsqueda vectorial con códigos de producto.** Síntoma: no encuentra "Ibuprofeno 400 mg" exacto. Corrección: búsqueda híbrida y ranker semántico.
- **Un agente que crea pedidos sin confirmación.** Síntoma: pedidos por error. Corrección: aprobación humana para herramientas que modifican datos.
- **Ignorar los 429.** Síntoma: usuarios con errores en horas pico. Corrección: reintentos con espera, más cuota, Global Standard o Provisioned.
:::

:::trabajo Cómo se arma en una empresa
Un recurso de Foundry por entorno con private endpoints; despliegues Data Zone por residencia; identidad administrada de la app con el rol mínimo; índice híbrido con ranker semántico y filtros por país; un agente con las herramientas justas y aprobación para acciones; un conjunto de evaluación con preguntas reales que corre en CI antes de cada cambio; y trazas en Application Insights revisadas cada semana.
:::

## Ejercicios

:::ejercicio quiz
Por regulación, los textos de clientes europeos no pueden procesarse fuera de la Unión Europea, y el tráfico es variable. ¿Qué tipo de despliegue usas?
- [ ] Global Standard, que da la mayor cuota disponible.
- [x] Data Zone Standard en la zona UE.
- [ ] Global Batch, que procesa en lotes.
- [ ] Provisioned global, que garantiza la capacidad.
```explicacion
Data Zone Standard mantiene el procesamiento dentro de la zona geográfica elegida y cobra por token. Los despliegues globales pueden procesar en cualquier región.
```
:::

:::ejercicio quiz
La aplicación que corre en Azure App Service debe llamar a un modelo de Foundry sin guardar claves. ¿Qué haces?
- [ ] Guardar la clave en una variable de entorno de App Service.
- [x] Habilitar una identidad administrada en App Service y darle un rol de RBAC sobre el recurso de Foundry.
- [ ] Usar la clave principal del recurso y rotarla cada mes.
- [ ] Hacer público el endpoint del modelo.
```explicacion
Con identidad administrada y Entra ID no hay secretos que guardar ni rotar; el permiso se controla con RBAC.
```
:::

:::ejercicio quiz
Los farmacéuticos buscan por nombres comerciales y dosis exactas ("Amoxicilina 500 mg"), y también hacen preguntas en lenguaje natural. ¿Qué configuración de Azure AI Search da mejor relevancia?
- [ ] Solo búsqueda vectorial con el mejor modelo de embeddings.
- [ ] Solo búsqueda por palabras clave con BM25.
- [x] Búsqueda híbrida (palabras clave + vectores) con el ranker semántico.
- [ ] Búsqueda vectorial con filtros por fecha.
```explicacion
La híbrida encuentra coincidencias exactas y semánticas, y el ranker semántico reordena los mejores resultados por relevancia.
```
:::

:::ejercicio quiz
Un agente debe consultar el stock de una sucursal en el sistema de la empresa, que expone una API REST con especificación OpenAPI. ¿Qué herramienta del agente usas?
- [ ] File search.
- [ ] Grounding con Bing Search.
- [x] La herramienta OpenAPI con la especificación de la API.
- [ ] Code interpreter.
```explicacion
La herramienta OpenAPI permite al agente llamar a una API descrita en una especificación, con sus operaciones y parámetros.
```
:::

:::ejercicio quiz
Hay que resumir 3 millones de documentos históricos este fin de semana al menor costo, sin necesidad de respuesta inmediata. ¿Qué usas?
- [ ] Un despliegue Provisioned dedicado durante el fin de semana.
- [x] Un despliegue Global Batch.
- [ ] Un despliegue Standard regional con muchos reintentos.
- [ ] Un agente con code interpreter.
```explicacion
Global Batch procesa solicitudes de forma asíncrona con descuento, ideal para grandes volúmenes sin urgencia.
```
:::

:::ejercicio quiz
Un documento indexado contiene instrucciones escondidas para que el modelo ignore sus reglas. ¿Qué función de Content Safety ayuda a detectarlo?
- [ ] La detección de material protegido.
- [x] Prompt Shields, que detecta ataques directos e indirectos.
- [ ] El filtro de contenido sexual.
- [ ] La detección de groundedness.
```explicacion
Prompt Shields detecta jailbreaks en la entrada del usuario y ataques indirectos ocultos en documentos o datos que llegan al modelo.
```
:::

:::ejercicio quiz
¿Qué evaluador mide si la respuesta de un asistente RAG se apoya en los documentos recuperados?
- [ ] Fluidez.
- [ ] Coherencia.
- [x] Groundedness.
- [ ] Similitud.
```explicacion
Groundedness verifica que las afirmaciones de la respuesta estén respaldadas por el contexto recuperado.
```
:::

:::ejercicio cli
Con la CLI de Azure, asigna a la identidad administrada con id de objeto `11111111-2222-3333-4444-555555555555` el rol `Azure AI User` sobre el recurso `/subscriptions/abc/resourceGroups/rg-ia/providers/Microsoft.CognitiveServices/accounts/foundry-farmacias`.
```respuesta
todos: az role assignment create || --assignee(-object-id)? 11111111-2222-3333-4444-555555555555 || --role ['"]?Azure AI User['"]? || --scope /subscriptions/abc/resourceGroups/rg-ia/providers/Microsoft\.CognitiveServices/accounts/foundry-farmacias
```
```solucion
az role assignment create --assignee-object-id 11111111-2222-3333-4444-555555555555 --role "Azure AI User" --scope /subscriptions/abc/resourceGroups/rg-ia/providers/Microsoft.CognitiveServices/accounts/foundry-farmacias
```
:::
