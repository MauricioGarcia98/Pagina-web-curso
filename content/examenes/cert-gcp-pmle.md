# examen: cert-gcp
# id: gcp-pmle
# titulo: Google Cloud Professional Machine Learning Engineer

## API preentrenada
leccion: cert-gcp-pmle-agent-platform
dominio: 1
Hay que transcribir llamadas del call center en español sin datos de entrenamiento propios. ¿Qué usas?
- [ ] AutoML de texto con transcripciones etiquetadas.
- [x] Speech-to-Text (Chirp).
- [ ] Un modelo personalizado de audio en TPU.
- [ ] BigQuery ML con un modelo remoto de imágenes.
porque: Para tareas estándar, las APIs preentrenadas resuelven sin entrenar.

## AutoML
leccion: cert-gcp-pmle-agent-platform
dominio: 1
Un equipo sin experiencia en ML tiene 20.000 imágenes etiquetadas de defectos y necesita un clasificador rápido. ¿Qué usa?
- [ ] Un modelo de TensorFlow escrito desde cero.
- [x] AutoML de imágenes.
- [ ] La API de Vision sin ajuste.
- [ ] BigQuery ML con k-means.
porque: AutoML entrena modelos de calidad con datos etiquetados propios sin escribir código de modelado.

## Feature Store
leccion: cert-gcp-pmle-agent-platform
dominio: 2
El modelo usa en producción variables calculadas con otro código que en el entrenamiento y sus resultados empeoran. ¿Qué lo previene?
- [ ] Entrenar más épocas.
- [x] Centralizar las variables en Feature Store y servirlas desde allí en ambos casos.
- [ ] Desplegar el modelo en una máquina más grande.
- [ ] Aumentar la división de tráfico.
porque: Compartir la definición de las variables entre entrenamiento y servicio evita el training-serving skew.

## Experimentos
leccion: cert-gcp-pmle-agent-platform
dominio: 2
Varios científicos prueban configuraciones y necesitan comparar métricas y parámetros de cada ejecución. ¿Qué usan?
- [ ] Una planilla compartida donde cada científico copia sus resultados al terminar.
- [x] Experiments con TensorBoard.
- [ ] Model Monitoring, con alertas configuradas para cada ejecución de entrenamiento.
- [ ] Cloud Logging, buscando las métricas impresas en los registros de cada job.
porque: Experiments registra parámetros y métricas de cada ejecución para compararlas.

## TPU
leccion: cert-gcp-pmle-agent-platform
dominio: 3
Un modelo grande de JAX con lotes muy grandes tarda días en GPU. ¿Qué hardware evalúas?
- [ ] CPU de alta memoria.
- [x] TPU.
- [ ] GPU de menor tamaño.
- [ ] VMs preemptibles de CPU.
porque: Las TPU aceleran operaciones matriciales a gran escala con TensorFlow y JAX.

## Hiperparámetros
leccion: cert-gcp-pmle-agent-platform
dominio: 3
Con presupuesto para 40 pruebas, ¿cómo configuras el ajuste de hiperparámetros para obtener el mejor resultado?
- [ ] Búsqueda grid con 40 trabajos en paralelo.
- [x] Optimización bayesiana con pocos trabajos en paralelo.
- [ ] Búsqueda aleatoria con un solo valor por parámetro.
- [ ] Sin ajuste: valores por defecto.
porque: La búsqueda bayesiana aprende de las pruebas anteriores; menos paralelismo le da más información.

## Explicabilidad
leccion: cert-gcp-pmle-agent-platform
dominio: 3
Un banco debe explicar qué variables llevaron a rechazar cada solicitud de crédito. ¿Qué usa?
- [ ] Model Monitoring de deriva, comparando las solicitudes rechazadas con las aprobadas.
- [x] Explainable AI con atribuciones de variables.
- [ ] La división de tráfico del endpoint entre un modelo simple y uno complejo.
- [ ] Cloud Audit Logs, con el registro de cada llamada a la API de predicción.
porque: Explainable AI calcula la contribución de cada variable a cada predicción.

## Por lotes
leccion: cert-gcp-pmle-agent-platform
dominio: 4
Hay que puntuar 80 millones de registros cada noche sin requisito de latencia. ¿Qué es lo más rentable?
- [ ] Un endpoint en línea con muchas réplicas mínimas.
- [x] Predicción por lotes.
- [ ] Un endpoint privado con Private Service Connect.
- [ ] Llamadas en paralelo desde Cloud Run.
porque: La predicción por lotes no requiere un endpoint encendido.

## Canary
leccion: cert-gcp-pmle-agent-platform
dominio: 4
Un modelo nuevo debe recibir el 10 % del tráfico en producción antes de reemplazar al actual. ¿Qué configuras?
- [ ] Un endpoint nuevo y cambiar la URL en la aplicación.
- [x] La división de tráfico entre los dos modelos desplegados en el mismo endpoint.
- [ ] Una predicción por lotes paralela.
- [ ] Un pipeline que reentrene el modelo con el 10 % de los datos.
porque: Un endpoint admite varios modelos con porcentajes de tráfico configurables.

## Pipelines
leccion: cert-gcp-pmle-agent-platform
dominio: 5
El preprocesamiento, el entrenamiento, la evaluación y el despliegue deben ser reproducibles, con linaje y caché de pasos. ¿Qué usas?
- [ ] Notebooks ejecutados en orden por una persona.
- [x] Pipelines con Kubeflow Pipelines.
- [ ] Cloud Scheduler llamando a cada script.
- [ ] Un job de Dataflow por paso.
porque: Pipelines orquesta los pasos con linaje en ML Metadata y reutiliza resultados en caché.

## CI/CD
leccion: cert-gcp-pmle-agent-platform
dominio: 5
Cada cambio en el código de entrenamiento debe compilar los componentes y lanzar el pipeline automáticamente. ¿Qué usas?
- [ ] Un recordatorio semanal al equipo para que lance el pipeline a mano desde un notebook.
- [x] Cloud Build disparado por el repositorio.
- [ ] Model Monitoring con alertas que se disparan cuando cambia el código del repositorio.
- [ ] Experiments, que registra cada cambio de código como una ejecución nueva.
porque: Cloud Build compila, prueba y lanza el pipeline ante cada cambio en Git.

## Skew
leccion: cert-gcp-pmle-agent-platform
dominio: 6
¿Qué detecta el monitoreo de training-serving skew?
- [ ] La latencia del endpoint por encima de un umbral.
- [x] Diferencias entre la distribución de los datos de producción y la del entrenamiento.
- [ ] Cambios en el código del modelo.
- [ ] Errores de permisos en el endpoint.
porque: El skew compara producción con los datos de entrenamiento; la deriva compara producción a lo largo del tiempo.

## Evaluación generativa
leccion: cert-gcp-pmle-agent-platform
dominio: 6
Antes de cambiar el prompt de un asistente, hay que medir fundamentación y seguridad sobre 300 preguntas. ¿Qué usas?
- [ ] Model Monitoring de deriva.
- [x] El servicio de evaluación de IA generativa con métricas basadas en modelo.
- [ ] Explainable AI.
- [ ] Un ajuste de hiperparámetros.
porque: El Gen AI evaluation service mide calidad, fundamentación y seguridad, y compara versiones.

## Inyección
leccion: cert-gcp-pmle-agent-platform
dominio: 6
Un agente procesa documentos de terceros que podrían contener instrucciones maliciosas. ¿Qué agregas?
- [ ] Una temperatura más alta, para que el modelo no siga instrucciones de forma literal.
- [x] Model Armor para filtrar inyecciones de prompt y fuga de datos.
- [ ] Más réplicas en el endpoint del agente para procesar los documentos más rápido.
- [ ] Predicción por lotes, que procesa los documentos sin interacción con el usuario.
porque: Model Armor inspecciona prompts y respuestas para detectar inyecciones y datos sensibles.

## Grounding
leccion: cert-gcp-pmle-agent-platform
dominio: 1
Un asistente con Gemini debe responder sobre el catálogo de productos de la empresa con citas. ¿Qué técnica aplicas?
- [ ] Preentrenar un modelo desde cero.
- [x] Grounding o RAG sobre los datos del catálogo.
- [ ] Subir la temperatura.
- [ ] Usar solo few-shot con tres productos.
porque: El grounding con datos propios basa las respuestas en el catálogo y permite citar la fuente.
