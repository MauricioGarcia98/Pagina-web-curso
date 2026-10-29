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

## @caso salud: Red de Salud Austral
Red de Salud Austral quiere tres soluciones en Google Cloud:
1. Clasificar automáticamente radiografías de tórax en "normal" o "requiere revisión" (tiene 80.000 imágenes etiquetadas por radiólogos).
2. Predecir el riesgo de reinternación de cada paciente al alta, con datos tabulares en BigQuery.
3. Un asistente que responda a los médicos sobre protocolos internos, citando la fuente.

Requisitos: explicar cada predicción de riesgo, evitar sesgos por edad o sexo, desplegar sin interrupciones y detectar cuándo los modelos empeoran.

## Radiografías
leccion: cert-gcp-pmle-agent-platform
dominio: 1
caso: salud
El equipo tiene poca experiencia en visión por computadora. ¿Qué enfoque es más rápido para el clasificador de radiografías?
- [ ] Una red convolucional escrita desde cero en TensorFlow y entrenada en TPU.
- [x] AutoML de clasificación de imágenes con las 80.000 imágenes etiquetadas.
- [ ] La API de Vision sin entrenamiento.
- [ ] BigQuery ML con regresión lineal.
porque: AutoML entrena clasificadores de imágenes de calidad con datos propios sin escribir el modelo.

## Explicar el riesgo
leccion: cert-gcp-pmle-agent-platform
dominio: 3
caso: salud
¿Qué permite explicar a los médicos qué variables pesaron en cada predicción de reinternación?
- [ ] El AUC del modelo, que resume qué tan bien predice para todos los pacientes.
- [x] Explainable AI con atribuciones por predicción.
- [ ] Model Monitoring de deriva.
- [ ] La división de tráfico.
porque: Las atribuciones de features indican cuánto contribuyó cada variable a una predicción.

## Sesgo por edad
leccion: cert-gcp-pmle-agent-platform
dominio: 6
caso: salud
¿Cómo verificas que el modelo no rinde peor para ciertos grupos de edad o sexo?
- [ ] Revisando solo la exactitud global del modelo sobre todo el conjunto de prueba.
- [x] Evaluando las métricas por segmento (edad, sexo) y comparando las diferencias.
- [ ] Quitando las columnas de edad y sexo sin revisar nada más.
- [ ] Aumentando las réplicas del endpoint.
porque: La evaluación por segmentos revela diferencias de rendimiento entre grupos.

## Asistente de protocolos
leccion: cert-gcp-pmle-agent-platform
dominio: 1
caso: salud
¿Qué enfoque responde sobre protocolos internos con citas y se actualiza cuando cambian?
- [ ] Ajustar Gemini cada mes con todos los protocolos vigentes de la red de salud.
- [x] Gemini con grounding sobre los protocolos.
- [ ] AutoML de texto.
- [ ] BigQuery ML k-means.
porque: El grounding con datos propios usa los protocolos vigentes y permite citar la fuente.

## Modelos de Model Garden
leccion: cert-gcp-pmle-agent-platform
dominio: 1
El equipo quiere probar un modelo abierto (Gemma o Llama) y desplegarlo en su proyecto. ¿Dónde lo encuentra?
- [ ] En BigQuery ML, como uno de los tipos de modelo disponibles en CREATE MODEL.
- [x] En Model Garden, con despliegue en un endpoint.
- [ ] En Cloud Storage.
- [ ] En Looker.
porque: Model Garden reúne modelos de Google, de terceros y abiertos, listos para desplegar o ajustar.

## Document AI
leccion: cert-gcp-pmle-agent-platform
dominio: 1
Hay que extraer campos de formularios de admisión escaneados, con un procesador entrenable si hace falta. ¿Qué usas?
- [ ] La API de Natural Language sobre las imágenes escaneadas de los formularios.
- [x] Document AI (procesadores de formularios o Custom Extractor).
- [ ] Speech-to-Text.
- [ ] AutoML tabular.
porque: Document AI extrae datos estructurados de documentos con procesadores preentrenados o personalizados.

## Agentes con ADK
leccion: cert-gcp-pmle-agent-platform
dominio: 1
Hay que construir un agente con varias herramientas y desplegarlo administrado en Google Cloud. ¿Qué combinación usas?
- [ ] AutoML de texto para entrenar el agente y un endpoint para servirlo.
- [x] Agent Development Kit (ADK) y Agent Engine.
- [ ] BigQuery ML y Looker.
- [ ] Dataflow y Pub/Sub.
porque: ADK construye agentes y Agent Engine los despliega y opera con sesiones y memoria.

## Notebooks administrados
leccion: cert-gcp-pmle-agent-platform
dominio: 2
Los científicos quieren notebooks con GPU administrados, integrados con BigQuery y con apagado por inactividad. ¿Qué usan?
- [ ] Notebooks de Jupyter instalados a mano en VMs de Compute Engine sin apagado.
- [x] Workbench (o Colab Enterprise).
- [ ] Looker Studio.
- [ ] Dataform.
porque: Workbench y Colab Enterprise ofrecen notebooks administrados con integración y apagado automático.

## Feature Store sobre BigQuery
leccion: cert-gcp-pmle-agent-platform
dominio: 2
¿Dónde viven los datos de origen de Feature Store en la plataforma actual?
- [ ] En una base propia de Feature Store que hay que cargar desde BigQuery cada día.
- [x] En BigQuery, sincronizadas a un almacén online.
- [ ] En Cloud SQL.
- [ ] En Pub/Sub.
porque: Feature Store usa BigQuery como fuente y sincroniza a un almacén online de baja latencia.

## Linaje de artefactos
leccion: cert-gcp-pmle-agent-platform
dominio: 2
Auditoría pregunta con qué dataset y qué ejecución se entrenó el modelo en producción. ¿Dónde se ve?
- [ ] En el nombre del modelo, que debe incluir la fecha y el nombre del dataset.
- [x] En ML Metadata y el linaje del pipeline que produjo el modelo.
- [ ] En Cloud Monitoring.
- [ ] En el endpoint.
porque: ML Metadata registra artefactos, ejecuciones y sus relaciones.

## Preprocesamiento a escala
leccion: cert-gcp-pmle-agent-platform
dominio: 2
Hay que transformar 5 TB de datos para entrenamiento con las mismas transformaciones al servir. ¿Qué usas?
- [ ] Un script de pandas en un notebook con mucha memoria, y otro script distinto al servir.
- [x] TensorFlow Transform sobre Dataflow.
- [ ] Looker Studio.
- [ ] Cloud Scheduler.
porque: TF Transform calcula las transformaciones a escala y las exporta para aplicarlas igual al servir.

## Datos sensibles
leccion: cert-gcp-pmle-agent-platform
dominio: 2
Los datos de entrenamiento incluyen nombres y documentos de pacientes que el modelo no necesita. ¿Qué haces?
- [ ] Mantenerlos, porque más columnas siempre mejoran el rendimiento del modelo.
- [x] Desidentificarlos o quitarlos con Sensitive Data Protection antes de entrenar.
- [ ] Cifrarlos con una clave en el notebook.
- [ ] Moverlos a Bigtable.
porque: Minimizar y desidentificar datos personales reduce riesgos de privacidad.

## Datasets administrados
leccion: cert-gcp-pmle-agent-platform
dominio: 2
¿Qué ventaja tiene crear un dataset administrado en la plataforma para AutoML?
- [ ] Que no necesita etiquetas para entrenar modelos supervisados de clasificación.
- [x] Que centraliza los datos, sus etiquetas y las divisiones de entrenamiento, validación y prueba.
- [ ] Que es gratis.
- [ ] Que reemplaza a BigQuery.
porque: Los datasets administrados guardan datos, anotaciones y divisiones para entrenar y versionar.

## Compartir modelos
leccion: cert-gcp-pmle-agent-platform
dominio: 2
¿Dónde se versionan los modelos entrenados para que otros equipos los encuentren y desplieguen?
- [ ] En una carpeta de Cloud Storage con el nombre de cada modelo y la fecha.
- [x] En Model Registry, con versiones y alias.
- [ ] En Pub/Sub.
- [ ] En Looker.
porque: Model Registry centraliza modelos con versiones, alias y evaluaciones.

## Contenedor prediseñado
leccion: cert-gcp-pmle-agent-platform
dominio: 3
El equipo tiene un script de PyTorch y no quiere construir imágenes. ¿Cómo lo entrena en la plataforma?
- [ ] Copiándolo a una VM y ejecutándolo con un cron que revisa si terminó.
- [x] Con un custom training job usando un contenedor prediseñado de PyTorch.
- [ ] Con AutoML.
- [ ] Con BigQuery ML.
porque: Los contenedores prediseñados ejecutan el código de entrenamiento con el framework ya instalado.

## Contenedor personalizado
leccion: cert-gcp-pmle-agent-platform
dominio: 3
El entrenamiento necesita librerías de sistema y una versión específica de CUDA. ¿Qué haces?
- [ ] Instalarlas al inicio del script de entrenamiento en cada ejecución del job.
- [x] Construir un contenedor personalizado y subirlo a Artifact Registry.
- [ ] Usar AutoML.
- [ ] Usar Looker.
porque: Los contenedores personalizados controlan todo el entorno de entrenamiento.

## Varias GPU
leccion: cert-gcp-pmle-agent-platform
dominio: 3
Un modelo de TensorFlow entrena en una máquina con 4 GPU y solo usa una. ¿Qué estrategia usa todas?
- [ ] `TPUStrategy`, que distribuye el trabajo entre las GPU de la máquina.
- [x] `tf.distribute.MirroredStrategy`.
- [ ] Ninguna: TensorFlow usa todas las GPU automáticamente siempre.
- [ ] Bajar el tamaño del lote.
porque: MirroredStrategy replica el modelo en las GPU de una máquina y sincroniza los gradientes.

## Reduction server
leccion: cert-gcp-pmle-agent-platform
dominio: 3
En un entrenamiento distribuido con muchos nodos GPU, la sincronización de gradientes es el cuello de botella. ¿Qué opción de la plataforma ayuda?
- [ ] Reducir la cantidad de nodos a uno solo para evitar sincronizar gradientes.
- [x] Reduction Server.
- [ ] AutoML.
- [ ] Model Monitoring.
porque: Reduction Server acelera la agregación de gradientes all-reduce entre nodos.

## Checkpoints
leccion: cert-gcp-pmle-agent-platform
dominio: 3
Un entrenamiento de 3 días en VMs Spot se interrumpe a veces. ¿Qué evita perder el progreso?
- [ ] Usar un tamaño de lote más chico para que cada época termine más rápido.
- [x] Guardar checkpoints periódicos en Cloud Storage y reanudar desde el último.
- [ ] Desactivar la evaluación.
- [ ] Usar Looker.
porque: Los checkpoints permiten retomar el entrenamiento tras una interrupción.

## Métrica del ajuste
leccion: cert-gcp-pmle-agent-platform
dominio: 3
¿Qué debe informar el código de entrenamiento para que el ajuste de hiperparámetros funcione?
- [ ] El tiempo total de entrenamiento, que el servicio usa para elegir los mejores valores.
- [x] La métrica objetivo (por ejemplo, con `hypertune`) al final de cada prueba.
- [ ] Los datos de entrenamiento completos.
- [ ] El nombre del científico.
porque: El servicio de ajuste compara pruebas según la métrica que reporta cada una.

## Ajuste de Gemini
leccion: cert-gcp-pmle-agent-platform
dominio: 3
Gemini debe responder con un formato clínico estándar y el prompting no alcanza. ¿Qué haces?
- [ ] Preentrenar un modelo propio desde cero con todos los informes clínicos de la red.
- [x] Ajuste supervisado de Gemini con pares de ejemplo en JSONL.
- [ ] AutoML tabular.
- [ ] Bajar la temperatura a 2.
porque: El ajuste supervisado adapta el estilo y formato del modelo con ejemplos.

## Umbral de clasificación
leccion: cert-gcp-pmle-agent-platform
dominio: 3
En radiografías, no detectar un caso grave es mucho peor que una revisión innecesaria. ¿Cómo ajustas el modelo?
- [ ] Subir el umbral de decisión para que el modelo solo marque los casos muy seguros.
- [x] Bajar el umbral para aumentar el recall de "requiere revisión".
- [ ] Usar la exactitud como única métrica.
- [ ] Quitar la clase minoritaria.
porque: Un umbral más bajo detecta más positivos a costa de más falsos positivos.

## Validación temporal
leccion: cert-gcp-pmle-agent-platform
dominio: 3
Para predecir reinternaciones futuras, ¿cómo divides los datos?
- [ ] Al azar, para que entrenamiento y prueba tengan la misma mezcla de años.
- [x] Por fecha: entrenar con el pasado y evaluar con el período más reciente.
- [ ] Por orden alfabético de paciente.
- [ ] No hace falta dividir.
porque: La división temporal simula el uso real y evita fuga de información futura.

## Clases desbalanceadas
leccion: cert-gcp-pmle-agent-platform
dominio: 3
¿Qué dos técnicas ayudan con un 2 % de reinternaciones?
- [x] Pesos de clase o sobremuestreo en entrenamiento.
- [x] Evaluar con PR-AUC o recall en lugar de exactitud.
- [ ] Eliminar la clase positiva.
- [ ] Usar solo exactitud.
- [ ] Entrenar con menos datos.
porque: Ponderar la clase minoritaria y usar métricas adecuadas evita modelos que ignoran los positivos.

## Escalado del endpoint
leccion: cert-gcp-pmle-agent-platform
dominio: 4
El endpoint de riesgo tiene picos durante el horario de altas. ¿Qué configuras?
- [ ] Una réplica fija muy grande para cubrir el pico durante todo el día.
- [x] Autoescalado con mínimo y máximo de réplicas según el uso.
- [ ] Predicción por lotes.
- [ ] Un modelo distinto por hora.
porque: El autoescalado agrega réplicas en los picos y las quita cuando baja la demanda.

## Endpoint privado
leccion: cert-gcp-pmle-agent-platform
dominio: 4
Las aplicaciones del hospital deben llamar al modelo sin salir a internet. ¿Qué usas?
- [ ] Un endpoint público protegido con una clave compartida entre las aplicaciones.
- [x] Un endpoint privado (Private Service Connect o peering de VPC).
- [ ] Looker Studio.
- [ ] Cloud Scheduler.
porque: Los endpoints privados exponen el modelo solo dentro de la red.

## Predicción por lotes desde BigQuery
leccion: cert-gcp-pmle-agent-platform
dominio: 4
Hay que puntuar cada noche a 2 millones de pacientes cuyos datos están en BigQuery. ¿Qué usas?
- [ ] Un endpoint en línea llamado desde un bucle que recorre los pacientes uno por uno.
- [x] Un batch prediction job con entrada y salida en BigQuery.
- [ ] AutoML de imágenes.
- [ ] Un endpoint privado.
porque: La predicción por lotes procesa tablas completas y escribe el resultado en BigQuery.

## Alias del modelo
leccion: cert-gcp-pmle-agent-platform
dominio: 4
¿Para qué sirve el alias `default` (o uno propio como `champion`) en Model Registry?
- [ ] Para cifrar el modelo con una clave administrada por el cliente en Cloud KMS.
- [x] Para referirse a una versión sin depender de su número, y cambiarla sin tocar el código.
- [ ] Para borrar versiones viejas.
- [ ] Para entrenar más rápido.
porque: Los alias apuntan a versiones y permiten promover o revertir de forma controlada.

## Servir modelos grandes
leccion: cert-gcp-pmle-agent-platform
dominio: 4
Hay que servir un modelo abierto de lenguaje con alto rendimiento en GPU. ¿Qué contenedor de servicio conviene evaluar?
- [ ] El contenedor de scikit-learn prediseñado, que soporta modelos de lenguaje.
- [x] Un contenedor optimizado como vLLM (disponible desde Model Garden).
- [ ] Un notebook de Workbench.
- [ ] Dataform.
porque: vLLM optimiza la inferencia de LLM con batching continuo y gestión eficiente de memoria.

## Costo de servir
leccion: cert-gcp-pmle-agent-platform
dominio: 4
Un endpoint con GPU recibe pocas solicitudes y siempre en horario laboral. ¿Qué dos medidas reducen el costo?
- [x] Ajustar el mínimo de réplicas y el tipo de máquina al uso real.
- [x] Pasar a predicción por lotes las cargas que no necesitan respuesta inmediata.
- [ ] Duplicar las réplicas para tener más margen.
- [ ] Usar la GPU más grande.
- [ ] Desactivar el autoescalado.
porque: Dimensionar bien y usar lotes cuando se puede evita pagar capacidad ociosa.

## Latencia del preprocesamiento
leccion: cert-gcp-pmle-agent-platform
dominio: 4
La latencia del endpoint es alta porque el preprocesamiento de cada solicitud consulta BigQuery. ¿Qué mejora?
- [ ] Aumentar el número de réplicas del endpoint para repartir las consultas a BigQuery.
- [x] Servir las features precalculadas desde el almacén online de Feature Store.
- [ ] Usar predicción por lotes cada segundo.
- [ ] Bajar la precisión del modelo.
porque: Leer features precalculadas de un almacén online es mucho más rápido que consultar BigQuery.

## Probar en sombra
leccion: cert-gcp-pmle-agent-platform
dominio: 4
¿Cómo comparas un modelo nuevo con tráfico real sin afectar a los usuarios?
- [ ] Reemplazando el modelo actual durante un día y comparando las quejas recibidas.
- [x] Enviando una copia de las solicitudes al modelo nuevo y registrando sus predicciones sin devolverlas.
- [ ] Con AutoML.
- [ ] Con Looker.
porque: El despliegue en sombra evalúa con tráfico real sin impacto en las respuestas.

## Optimizar el modelo
leccion: cert-gcp-pmle-agent-platform
dominio: 4
Un modelo de TensorFlow tiene latencia alta en CPU. ¿Qué opción de la plataforma suele mejorarla sin cambiar el código del modelo?
- [ ] Un contenedor personalizado con una versión más vieja de TensorFlow.
- [x] El optimized TensorFlow runtime.
- [ ] Dataform.
- [ ] Cloud Scheduler.
porque: El runtime optimizado de TensorFlow mejora el rendimiento y el costo de la inferencia.

## Componentes de Google
leccion: cert-gcp-pmle-agent-platform
dominio: 5
¿Qué ventaja tiene usar los Google Cloud Pipeline Components en un pipeline?
- [ ] Que el pipeline no necesita definir entradas ni salidas para cada paso.
- [x] Pasos listos para entrenar, evaluar y desplegar.
- [ ] Que no consumen recursos.
- [ ] Que reemplazan a BigQuery.
porque: Los componentes de Google encapsulan operaciones comunes de la plataforma.

## Parámetros del pipeline
leccion: cert-gcp-pmle-agent-platform
dominio: 5
El mismo pipeline debe correr en dev con una tabla chica y en prod con la completa. ¿Cómo lo haces?
- [ ] Dos copias del código del pipeline con la tabla escrita a mano en cada una.
- [x] Parámetros del pipeline (por ejemplo, la tabla de entrada) definidos al ejecutarlo.
- [ ] Un `if` con la fecha.
- [ ] Un modelo distinto.
porque: Los parámetros permiten reutilizar el mismo pipeline compilado en distintos entornos.

## Paso condicional
leccion: cert-gcp-pmle-agent-platform
dominio: 5
El pipeline debe desplegar el modelo solo si su AUC supera 0,85. ¿Cómo lo implementas?
- [ ] Desplegando siempre y revisando la métrica a mano después de cada ejecución.
- [x] Con `dsl.If` sobre la métrica antes del despliegue.
- [ ] Con Looker.
- [ ] Con Pub/Sub.
porque: Las condiciones de KFP ejecutan pasos solo si se cumple una expresión sobre salidas previas.

## Programar el pipeline
leccion: cert-gcp-pmle-agent-platform
dominio: 5
El reentrenamiento debe correr cada lunes a las 2. ¿Qué usas?
- [ ] Un recordatorio al equipo para que lo ejecute a mano cada lunes.
- [x] Un schedule de Pipelines (o Cloud Scheduler).
- [ ] Un endpoint privado.
- [ ] AutoML.
porque: Los pipelines pueden programarse con una expresión cron administrada.

## Disparo por datos nuevos
leccion: cert-gcp-pmle-agent-platform
dominio: 5
El pipeline debe correr cuando llegan datos etiquetados nuevos a Cloud Storage. ¿Qué arquitectura usas?
- [ ] Un cron cada minuto que revisa si cambió el tamaño del bucket de datos.
- [x] Un evento de Cloud Storage con Eventarc que lanza el pipeline.
- [ ] Looker Studio.
- [ ] Un endpoint.
porque: Los eventos de Cloud Storage pueden iniciar el pipeline automáticamente.

## Caché de pasos
leccion: cert-gcp-pmle-agent-platform
dominio: 5
Al cambiar solo el paso de evaluación, el pipeline vuelve a preprocesar y entrenar todo. ¿Qué lo evita?
- [ ] Borrar los artefactos de la ejecución anterior antes de cada nueva ejecución.
- [x] La caché de ejecución de Pipelines, que reutiliza pasos con las mismas entradas.
- [ ] Más réplicas.
- [ ] Un endpoint privado.
porque: Con caché, los pasos sin cambios reutilizan sus resultados anteriores.

## Pruebas del pipeline
leccion: cert-gcp-pmle-agent-platform
dominio: 5
¿Qué dos pruebas conviene incluir en el CI de un pipeline de ML?
- [x] Pruebas unitarias del código de los componentes.
- [x] Validación de esquema y calidad de los datos de entrada.
- [ ] Desplegar a producción sin evaluar.
- [ ] Borrar el modelo anterior.
- [ ] Probar solo la interfaz web.
porque: Probar código y datos evita fallas silenciosas en el entrenamiento y el modelo.

## TFX
leccion: cert-gcp-pmle-agent-platform
dominio: 5
¿Qué componente de TFX valida que el nuevo modelo sea mejor que el actual antes de publicarlo?
- [ ] ExampleGen, que lee los datos de entrada del pipeline desde BigQuery.
- [x] Evaluator.
- [ ] Transform.
- [ ] Trainer.
porque: Evaluator calcula métricas y puede bendecir (blessing) el modelo si supera al actual.

## Infraestructura del pipeline
leccion: cert-gcp-pmle-agent-platform
dominio: 5
¿Cómo se crean de forma reproducible los buckets, cuentas de servicio y permisos que usa el pipeline en cada entorno?
- [ ] Desde la consola, siguiendo una lista de pasos documentada por el equipo.
- [x] Con Terraform en el pipeline de CI/CD.
- [ ] Con Looker.
- [ ] Con AutoML.
porque: La infraestructura como código crea los mismos recursos en cada entorno.

## Deriva de predicciones
leccion: cert-gcp-pmle-agent-platform
dominio: 6
Sin etiquetas reales todavía, ¿qué señal indica que el modelo podría estar empeorando?
- [ ] La cantidad de réplicas del endpoint, que aumenta cuando el modelo se equivoca.
- [x] Deriva de las predicciones y de las features respecto de la línea base.
- [ ] El tamaño del bucket.
- [ ] El número de pipelines.
porque: Los cambios en la distribución de entradas o salidas anticipan problemas antes de tener etiquetas.

## Model Armor
leccion: cert-gcp-pmle-agent-platform
dominio: 6
El asistente médico recibe textos copiados de fuentes externas que podrían contener instrucciones ocultas. ¿Qué protege la aplicación?
- [ ] Un modelo más grande, que reconoce y descarta las instrucciones ocultas.
- [x] Model Armor sobre prompts y respuestas.
- [ ] AutoML.
- [ ] BigQuery ML.
porque: Model Armor detecta inyecciones de prompt, jailbreaks y fuga de datos sensibles.

## Evaluación por pares
leccion: cert-gcp-pmle-agent-platform
dominio: 6
¿Qué evaluación compara directamente las respuestas de dos versiones de un prompt para decidir cuál es mejor?
- [ ] Una métrica de exactitud sobre la clasificación de las preguntas por tema.
- [x] La evaluación por pares (pairwise) del servicio de evaluación de IA generativa.
- [ ] Model Monitoring.
- [ ] La división de tráfico.
porque: La evaluación por pares pide a un evaluador elegir la mejor respuesta entre dos candidatos.
