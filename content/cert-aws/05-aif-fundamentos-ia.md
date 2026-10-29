---
titulo: AIF-C01 - AI Practitioner - IA, IA generativa e IA responsable en AWS
nivel: Intermedio
duracion: 65
resumen: Los cinco dominios del AWS Certified AI Practitioner - conceptos de IA, ML y aprendizaje profundo, tipos de aprendizaje y métricas, el ciclo de vida de ML, fundamentos de IA generativa (tokens, embeddings, transformers, difusión), cómo elegir y adaptar un modelo fundacional (prompting, RAG, fine-tuning), los servicios de IA de AWS, IA responsable y seguridad y gobierno.
objetivos: Distinguir IA, ML, aprendizaje profundo e IA generativa | Elegir el tipo de aprendizaje y la métrica según el problema | Comparar prompting, RAG, fine-tuning y preentrenamiento continuo por costo y esfuerzo | Elegir el servicio de IA administrado de AWS para cada caso | Aplicar principios de IA responsable y las herramientas de AWS para medir sesgo y explicar modelos | Explicar el modelo de responsabilidad compartida en IA
prerrequisitos: cert-aws-mapa-certificaciones
autoevaluacion: ¿Sabes cuándo un problema no necesita ML? | ¿Sabes qué métrica usar si los falsos negativos son caros? | ¿Sabes qué controla la temperatura? | ¿Sabes cuándo usar RAG y cuándo fine-tuning? | ¿Sabes qué hace SageMaker Clarify?
---

:::escenario
Lucía es analista de producto en la empresa de Tomás. No programa modelos, pero debe decidir si un asistente para choferes usa Amazon Bedrock o un servicio ya armado, explicar por qué el modelo de demoras se equivoca más en una región y defender ante legales que el sistema es responsable. La AI Practitioner es la certificación para ella: conceptos, criterio y servicios, sin programar.
:::

## Dominio 1 (20 %): fundamentos de IA y ML

- **IA** ⊃ **ML** (aprende de datos) ⊃ **aprendizaje profundo** (redes neuronales de muchas capas) ⊃ **IA generativa** (crea contenido nuevo).
- **Tipos de aprendizaje**:
  - **Supervisado**: con etiquetas. **Clasificación** (¿es fraude?) y **regresión** (¿cuántos días tarda?).
  - **No supervisado**: sin etiquetas. **Clustering** (segmentar clientes), detección de anomalías, reducción de dimensiones.
  - **Por refuerzo**: un agente aprende por recompensas (robótica, rutas). **RLHF** usa preferencias humanas para alinear LLMs.
- **Inferencia** en tiempo real (una predicción por solicitud, baja latencia) o por **lotes** (muchas predicciones programadas, más barato).
- **Cuándo no usar ML**: si una regla fija resuelve el problema, si se necesita un resultado exacto y determinista, si no hay datos, o si el costo supera el beneficio.

### Métricas

| Problema | Métricas |
|---|---|
| Clasificación | **Exactitud** (engaña con clases desbalanceadas), **precisión** (de lo que predije positivo, cuánto lo era), **recall** (de lo positivo, cuánto encontré), **F1**, **AUC-ROC**, matriz de confusión |
| Regresión | **MAE**, **RMSE** (penaliza errores grandes), **R²** |
| Negocio | ROI, costo por predicción, tasa de conversión |

Si el falso negativo es caro (no detectar un fraude o una enfermedad), se prioriza el **recall**. Si el falso positivo es caro (bloquear a un buen cliente), la **precisión**.

- **Sobreajuste** (*overfitting*): muy bien en entrenamiento, mal en datos nuevos (alta varianza). Se reduce con más datos, regularización, menos complejidad o *early stopping*. **Subajuste**: mal en todo (alto sesgo).

### El ciclo de vida de ML

Objetivo de negocio → recolección y preparación de datos (**SageMaker Data Wrangler**, **Feature Store**) → entrenamiento y ajuste de hiperparámetros → evaluación → despliegue (**endpoints**) → monitoreo (**Model Monitor**) → reentrenamiento. **SageMaker Canvas** permite crear modelos **sin código**; **JumpStart** ofrece modelos preentrenados.

## Dominio 2 (24 %): fundamentos de IA generativa

| Concepto | Qué es |
|---|---|
| **Token** | Unidad de texto que procesa el modelo (≈ ¾ de palabra en inglés). Se paga por token de entrada y de salida |
| **Ventana de contexto** | Cuántos tokens entran en una solicitud |
| **Embedding** | Vector numérico que representa el significado; textos parecidos quedan cerca |
| **Transformer** | Arquitectura con **atención** que relaciona cada token con los demás; base de los LLM |
| **Modelo de difusión** | Genera imágenes partiendo de ruido y eliminándolo paso a paso |
| **Multimodal** | Entiende o genera texto, imagen, audio o video |
| **Modelo fundacional (FM)** | Modelo grande preentrenado con datos amplios, adaptable a muchas tareas |
| **Alucinación** | Respuesta plausible pero falsa |

**Parámetros de inferencia**: **temperatura** (más alta = más variada y creativa; más baja = más determinista), **top-p** y **top-k** (limitan qué tokens se consideran), **máximo de tokens** y **secuencias de parada**.

**Ventajas**: adaptabilidad, rapidez para prototipar, interfaz natural. **Limitaciones**: alucinaciones, no determinismo, interpretabilidad baja, costo por token, conocimiento con fecha de corte.

## Dominio 3 (28 %): aplicaciones de modelos fundacionales

### Elegir un modelo

Criterios: **costo**, **latencia**, **tamaño del contexto**, **modalidad**, idiomas, calidad en la tarea (evaluación), personalización disponible y licencias. En **Amazon Bedrock** hay modelos de Anthropic (Claude), Amazon (**Nova**, Titan Embeddings), Meta (Llama), Mistral, Cohere y otros, con una sola API.

### Adaptar un modelo: de lo más barato a lo más caro

```diagrama
titulo: Cómo adaptar un modelo fundacional
nodo pr: Ingeniería de prompts | icono=mensaje | col=0 | fila=0 | sub=sin entrenar, minutos | color=verde
nodo rag: RAG | icono=knowledgebases | col=1 | fila=0 | sub=datos propios y actuales | color=azul
nodo ft: Fine-tuning | icono=sigla:FT:naranja | col=2 | fila=0 | sub=ejemplos etiquetados | color=naranja
nodo cpt: Preentrenamiento continuo | icono=sigla:CPT:rojo | col=3 | fila=0 | sub=mucho texto sin etiquetar | color=rojo
flecha pr -> rag: más costo y esfuerzo
flecha rag -> ft
flecha ft -> cpt
```

| Técnica | Cuándo |
|---|---|
| **Ingeniería de prompts** (zero-shot, few-shot, cadena de pensamiento, rol, plantillas) | Siempre primero |
| **RAG** (Retrieval Augmented Generation) con **Bedrock Knowledge Bases** | El modelo necesita **datos propios o actuales**, con citas; los datos cambian seguido |
| **Fine-tuning** | Cambiar el **estilo, formato o comportamiento** en una tarea con ejemplos etiquetados (pares prompt–respuesta) |
| **Preentrenamiento continuo** | Adaptar el modelo al **vocabulario de un dominio** con mucho texto sin etiquetar |
| **Destilación** | Un modelo chico aprende de uno grande: menos costo y latencia |

**Agentes** (**Amazon Bedrock Agents**, **Bedrock AgentCore**): el modelo planifica, llama herramientas (APIs, Lambda) y consulta bases de conocimiento para completar tareas de varios pasos.

**Riesgos de prompts**: inyección de prompt, *jailbreak*, fuga del prompt de sistema, envenenamiento de datos.

**Evaluar**: evaluación humana, conjuntos de referencia y métricas automáticas (**ROUGE** para resúmenes, **BLEU** para traducción, **BERTScore** para similitud semántica), **Bedrock Model Evaluation** (automática, humana o con un modelo como juez).

### Los servicios de IA de AWS

| Servicio | Para qué |
|---|---|
| **Amazon Bedrock** | Modelos fundacionales por API, Knowledge Bases, Agents, Guardrails, evaluación |
| **Amazon Q Business** | Asistente generativo sobre los datos de la empresa (conectores a SharePoint, S3, Confluence) |
| **Amazon Q Developer** | Asistente para programar y operar AWS |
| **SageMaker AI** | Construir, entrenar y desplegar modelos propios; JumpStart, Canvas |
| **Amazon Comprehend** | NLP: entidades, sentimiento, PII, clasificación de texto |
| **Amazon Textract** | Extraer texto, formularios y tablas de documentos |
| **Amazon Rekognition** | Análisis de imágenes y video (objetos, rostros, moderación) |
| **Amazon Transcribe / Polly** | Voz a texto / texto a voz |
| **Amazon Translate** | Traducción |
| **Amazon Lex** | Chatbots conversacionales (voz y texto) |
| **Amazon Personalize** | Recomendaciones |
| **Amazon Kendra** | Búsqueda empresarial inteligente |
| **Amazon Fraud Detector** / **Forecast** | Fraude / pronósticos (servicios heredados; para nuevos casos se usa SageMaker) |
| **Amazon A2I** | Revisión humana de predicciones |

## Dominio 4 (14 %): IA responsable

- Principios: **equidad**, **explicabilidad**, **privacidad y seguridad**, **robustez**, **gobernanza**, **transparencia**, **veracidad**, **seguridad**.
- **Sesgo** en los datos (muestras no representativas) o en el modelo. Se mide con **SageMaker Clarify** (sesgo antes y después de entrenar, y **explicabilidad** con valores SHAP).
- **Guardrails for Amazon Bedrock**: filtros de contenido dañino, temas denegados, filtros de palabras, **detección y enmascarado de PII**, **verificación de grounding** contextual y **comprobaciones de razonamiento automatizado**.
- **SageMaker Model Cards** documentan el uso previsto, los datos y los riesgos; **AI Service Cards** describen los servicios de AWS.
- **Augmented AI (A2I)**: humanos revisan predicciones de baja confianza.
- Modelos transparentes (árboles, regresión) frente a cajas negras (redes profundas): equilibrio entre rendimiento e interpretabilidad.

## Dominio 5 (14 %): seguridad, cumplimiento y gobierno

- **Responsabilidad compartida**: AWS protege la infraestructura; el cliente, sus datos, accesos, prompts y configuraciones.
- **IAM** con permisos mínimos, **KMS** para cifrar, **PrivateLink** para usar Bedrock sin internet, **Macie** para PII, **CloudTrail** para auditoría.
- En Bedrock, **los prompts y respuestas no se usan para entrenar los modelos** de los proveedores ni se comparten con ellos.
- **Linaje y origen de datos**: SageMaker Model Registry, ML Lineage Tracking, citas de fuentes.
- **Cumplimiento**: **AWS Artifact** (informes de cumplimiento de AWS), **AWS Audit Manager**, **AWS Config**, **Trusted Advisor**; normas ISO 42001 y el EU AI Act.

:::examen Reglas rápidas
- "Datos propios que cambian a diario, con citas" → **RAG / Knowledge Bases**.
- "Que responda siempre con el formato y tono de la marca" → **fine-tuning** (si el prompting no alcanza).
- "Detectar sesgo y explicar predicciones" → **SageMaker Clarify**.
- "Bloquear temas y ocultar PII en un chatbot de Bedrock" → **Guardrails**.
- "Analistas sin código crean un modelo" → **SageMaker Canvas**.
- "Respuestas más creativas" → subir la **temperatura**.
:::

## Ejercicios

:::ejercicio quiz
Un modelo de detección de fraude tiene 99 % de exactitud, pero solo el 1 % de las transacciones son fraude y casi no detecta ninguna. ¿Qué métrica conviene mirar?
- [ ] La exactitud, porque ya es muy alta.
- [x] El recall de la clase fraude.
- [ ] El RMSE.
- [ ] El R².
```explicacion
Con clases desbalanceadas, la exactitud engaña. El recall mide cuántos fraudes reales detecta el modelo.
```
:::

:::ejercicio quiz
Un asistente debe responder preguntas sobre los procedimientos internos de la empresa, que cambian todas las semanas, citando el documento. ¿Qué técnica es la adecuada?
- [ ] Preentrenamiento continuo con los procedimientos.
- [x] RAG con Amazon Bedrock Knowledge Bases.
- [ ] Fine-tuning mensual con los procedimientos.
- [ ] Subir la temperatura del modelo.
```explicacion
RAG recupera los documentos vigentes en cada consulta y permite citar la fuente, sin reentrenar cuando cambian.
```
:::

:::ejercicio quiz
Las respuestas de un modelo son demasiado repetitivas para generar ideas de campañas. ¿Qué parámetro ajustas?
- [ ] Bajar la temperatura a 0.
- [x] Subir la temperatura.
- [ ] Bajar el máximo de tokens.
- [ ] Agregar una secuencia de parada.
```explicacion
Una temperatura más alta da salidas más variadas; una más baja, más deterministas.
```
:::

:::ejercicio quiz
Legales quiere evidencia de que el modelo de aprobación de créditos no discrimina por edad y explicar qué variables influyen en cada decisión. ¿Qué usas?
- [ ] Amazon Comprehend.
- [x] Amazon SageMaker Clarify.
- [ ] Amazon Macie.
- [ ] AWS Artifact.
```explicacion
Clarify mide sesgo en datos y predicciones y explica la contribución de cada variable con valores SHAP.
```
:::

:::ejercicio quiz
Hay que extraer los campos y las tablas de miles de remitos escaneados. ¿Qué servicio administrado usas?
- [ ] Amazon Rekognition.
- [x] Amazon Textract.
- [ ] Amazon Translate.
- [ ] Amazon Lex.
```explicacion
Textract extrae texto, pares clave-valor de formularios y tablas de documentos escaneados.
```
:::

:::ejercicio abierto
Lucía debe proponer cómo construir el asistente para choferes (preguntas sobre normas de seguridad y rutas). Escribe en cinco puntos la arquitectura en AWS y los controles de IA responsable que incluirías.
```text solucion
1. Modelo en Amazon Bedrock (por ejemplo, uno de Anthropic o Amazon Nova), elegido por calidad, latencia y costo tras una evaluación con preguntas reales.
2. RAG con Bedrock Knowledge Bases sobre los manuales en S3, con citas de la fuente.
3. Guardrails: temas denegados (asesoramiento legal), filtros de contenido, enmascarado de PII y verificación de grounding.
4. Seguridad: rol IAM con permisos mínimos, PrivateLink, cifrado con KMS, registros en CloudTrail; los prompts no entrenan al modelo.
5. Evaluación y monitoreo: conjunto de preguntas de prueba, Bedrock Model Evaluation, revisión humana de respuestas reportadas y un Model Card con el uso previsto y las limitaciones.
```
:::
