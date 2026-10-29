---
titulo: Generative AI Leader - estrategia y oferta de IA generativa de Google Cloud
nivel: Intermedio
duracion: 50
resumen: Las cuatro secciones del Generative AI Leader - fundamentos de IA generativa, la oferta de Google Cloud (Gemini, Gemini Enterprise, Gemini Enterprise Agent Platform, Model Garden, agentes, NotebookLM), técnicas para mejorar la salida de los modelos (prompts, grounding, RAG, ajuste, parámetros) y estrategias de negocio para adoptar IA generativa con seguridad y responsabilidad.
objetivos: Explicar los conceptos básicos de IA generativa a un público de negocio | Elegir la oferta de Google Cloud adecuada para cada caso | Explicar cómo mejorar la calidad de las respuestas de un modelo | Proponer una estrategia de adopción con métricas, riesgos y gobierno
prerrequisitos: cert-gcp-mapa-certificaciones
autoevaluacion: ¿Sabes qué es grounding? | ¿Sabes qué ofrece Gemini Enterprise? | ¿Sabes cuándo conviene ajustar un modelo? | ¿Sabes qué medir en un piloto de IA generativa?
---

:::escenario
La gerente comercial de la cadena de Valentina debe presentar al directorio un plan de IA generativa: qué casos de uso encarar primero, con qué productos de Google, cuánto cuesta, qué riesgos hay y cómo se mide el éxito. No programa, pero necesita hablar con criterio. La Generative AI Leader está pensada para ella.
:::

## El examen

- 50–60 preguntas, 90 minutos, USD 99, vigencia de 3 años. No exige experiencia técnica.
- Secciones (pesos aproximados, no oficiales): **fundamentos de IA generativa** (~30 %), **oferta de IA generativa de Google Cloud** (~35 %), **técnicas para mejorar la salida de los modelos** (~20 %) y **estrategias de negocio para una solución exitosa** (~15 %).

## Sección 1: fundamentos

- **IA → ML → aprendizaje profundo → IA generativa**. Un **modelo fundacional** se entrena con datos enormes y se adapta a muchas tareas; un **LLM** es uno de lenguaje; los **multimodales** combinan texto, imagen, audio y video.
- Tipos de datos: **estructurados** (tablas) y **no estructurados** (texto, imágenes); **etiquetados** y no etiquetados.
- Tipos de aprendizaje: supervisado, no supervisado, por refuerzo.
- Ciclo de vida: recolectar y preparar datos, entrenar, desplegar, gestionar.
- **Limitaciones**: alucinaciones, sesgo, conocimiento con fecha de corte, dependencia de los datos, costo.

## Sección 2: la oferta de Google Cloud

```diagrama
titulo: Capas de la oferta de IA generativa de Google Cloud
nodo inf: Infraestructura | icono=cpu | col=0 | fila=0 | sub=TPU, GPU, Google Cloud | color=gris
nodo mod: Modelos | icono=gemini | col=1 | fila=0 | sub=Gemini, Imagen, Veo,\nModel Garden | color=azul
nodo pla: Plataforma | icono=agentplatform | col=2 | fila=0 | sub=Gemini Enterprise\nAgent Platform | color=violeta
nodo age: Agentes | icono=robot | col=3 | fila=0 | sub=ADK, Agent Engine,\nAgent Builder | color=verde
nodo app: Aplicaciones | icono=geminient | col=4 | fila=0 | sub=Gemini Enterprise,\nGemini en Workspace | color=naranja
flecha inf -> mod
flecha mod -> pla
flecha pla -> age
flecha age -> app
```

| Producto | Para qué |
|---|---|
| **Gemini** (Pro, Flash, Flash-Lite) | Modelos multimodales de Google; Pro para razonar, Flash para velocidad y costo |
| **Imagen**, **Veo**, **Chirp** | Generar imágenes, video y voz |
| **Model Garden** | Catálogo de modelos de Google, de terceros (Anthropic, Meta, Mistral) y abiertos (Gemma) |
| **Gemini Enterprise Agent Platform** (antes Vertex AI) | Construir, ajustar, evaluar y desplegar modelos y agentes |
| **Gemini Enterprise** (antes Agentspace) | Asistente y plataforma de agentes para empleados, con búsqueda sobre las fuentes de la empresa (Drive, SharePoint, Jira) |
| **Gemini en Google Workspace** | IA en Gmail, Docs, Sheets, Meet |
| **NotebookLM** | Investigar y resumir sobre documentos propios con citas |
| **Agentes de Google Cloud** | Agentes de atención al cliente (**Customer Engagement Suite**), de código, de datos y de seguridad |
| **Gemini Code Assist** y **Gemini Cloud Assist** | Asistencia para programar y para operar Google Cloud |

- **Agentes**: un modelo con **razonamiento**, **herramientas** (APIs, extensiones, funciones) y **memoria**, que actúa para cumplir un objetivo. Se construyen con **Agent Development Kit (ADK)** o sin código con **Agent Designer**/Agent Builder, y se despliegan en **Agent Engine**.
- Protocolos abiertos: **MCP** (herramientas) y **A2A** (agente a agente).

## Sección 3: mejorar la salida

| Técnica | Qué hace |
|---|---|
| **Prompt engineering** | Instrucciones claras, rol, ejemplos (*few-shot*), formato de salida, cadena de pensamiento |
| **Grounding** | Basar la respuesta en fuentes verificables: **Google Search** o datos de la empresa |
| **RAG** | Recuperar documentos relevantes y pasarlos al modelo |
| **Ajuste** (*fine-tuning*) | Entrenar con ejemplos propios para un estilo o tarea específicos |
| **Parámetros** | **Temperatura**, top-p, top-k, longitud máxima |
| **Humano en el circuito** | Revisión de respuestas en decisiones de impacto |

Orden recomendado: primero prompts, después grounding/RAG, y ajustar solo si lo anterior no alcanza.

## Sección 4: estrategia de negocio

- **Elegir casos de uso**: alto valor, factibles, con datos disponibles y riesgo controlado (resumir reclamos, búsqueda interna, generación de descripciones de productos). Empezar con un piloto acotado.
- **Medir**: productividad (tiempo ahorrado), calidad (exactitud, satisfacción), adopción, costo por interacción, ROI.
- **Factores de éxito**: patrocinio ejecutivo, datos listos, capacitación, gestión del cambio.
- **IA responsable** según los principios de IA de Google: equidad, transparencia, privacidad, seguridad, rendición de cuentas.
- **Seguridad**: **Secure AI Framework (SAIF)**, IAM, protección de datos (los datos de los clientes no se usan para entrenar los modelos de Google), **Model Armor**, filtros de seguridad, auditoría.
- **Costos**: pago por token o por usuario (Gemini Enterprise), elegir el modelo más chico que cumpla, caché de contexto.

:::examen Palabras clave
- "Empleados buscan en Drive, SharePoint y Jira con un asistente" → **Gemini Enterprise**.
- "Respuestas basadas en información actual de la web" → **grounding con Google Search**.
- "Desarrolladores construyen y despliegan agentes propios" → **ADK** y **Agent Engine** en la plataforma.
- "Probar modelos de terceros" → **Model Garden**.
- "Resumir y consultar un conjunto de documentos con citas" → **NotebookLM**.
:::

## Ejercicios

:::ejercicio quiz
Los empleados quieren un asistente que busque y responda con información de Drive, SharePoint y Jira, y que pueda ejecutar agentes, sin desarrollar nada. ¿Qué producto recomiendas?
- [ ] Model Garden.
- [x] Gemini Enterprise.
- [ ] Agent Development Kit.
- [ ] BigQuery ML.
```explicacion
Gemini Enterprise (antes Agentspace) conecta las fuentes de la empresa y ofrece asistente y agentes listos para usar.
```
:::

:::ejercicio quiz
Un asistente responde con datos desactualizados sobre normas publicadas la semana pasada. ¿Qué técnica lo corrige?
- [ ] Bajar la temperatura.
- [x] Grounding con Google Search o con las fuentes actualizadas de la empresa.
- [ ] Ajustar el modelo con las normas del año pasado.
- [ ] Usar un modelo más grande sin cambios.
```explicacion
El grounding basa la respuesta en fuentes actuales y verificables, en vez del conocimiento fijo del modelo.
```
:::

:::ejercicio quiz
¿Qué indicador es más útil para decidir si escalar un piloto de resumen de reclamos?
- [ ] La cantidad de parámetros del modelo.
- [x] El tiempo ahorrado por reclamo con calidad aceptable y el costo por resumen.
- [ ] El número de prompts escritos por el equipo.
- [ ] La temperatura usada en el piloto.
```explicacion
Las métricas de negocio (productividad, calidad y costo) muestran si el piloto genera valor.
```
:::

:::ejercicio abierto
Escribe para el directorio una propuesta de tres casos de uso de IA generativa para la cadena, ordenados por prioridad, con el producto de Google, la métrica de éxito y el principal riesgo de cada uno.
```text solucion
1. Búsqueda interna para empleados (políticas, procedimientos): Gemini Enterprise. Métrica: tiempo para encontrar respuestas y consultas resueltas sin escalar. Riesgo: documentos desactualizados o permisos mal configurados; mitigación: fuentes curadas y respeto de los permisos de origen.
2. Descripciones de productos para el e-commerce: Gemini en la plataforma con plantillas de prompts y revisión humana. Métrica: productos publicados por día y tasa de conversión. Riesgo: errores en atributos; mitigación: grounding en la ficha técnica y aprobación humana.
3. Asistente de atención al cliente: agente con ADK o Customer Engagement Suite, con grounding en políticas y acceso al estado de pedidos. Métrica: tasa de resolución y satisfacción. Riesgo: respuestas incorrectas o inyección de prompts; mitigación: Model Armor, filtros de seguridad, derivación a humanos y evaluación continua.
```
:::
