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

## @caso cosecha: AgroAndes
AgroAndes vende insumos agrícolas a 30.000 productores. Quiere predecir qué productores van a comprar fertilizante el mes próximo para que los vendedores los llamen primero. Los datos de compras, visitas y clima están en BigQuery; el equipo de ciencia de datos tiene dos personas y poco tiempo de operación.

Requisitos:
- una lista nueva de clientes priorizados cada lunes;
- poder explicar a un vendedor por qué un cliente está arriba en la lista;
- reentrenar solo si el modelo empeora;
- no usar datos personales que no hagan falta.

## Lista de cada lunes
leccion: cert-gcp-pmle-agent-platform
dominio: 4
caso: cosecha
¿Cómo se genera la lista priorizada de cada lunes con el menor costo de operación?
- [ ] Un endpoint en línea encendido toda la semana que los vendedores consultan cliente por cliente desde una planilla.
- [x] Una predicción por lotes semanal que lee de BigQuery y escribe los puntajes en una tabla.
- [ ] Un clúster de GKE con autoescalado y una API propia que recalcula la lista cada vez que alguien la abre.
- [ ] Un notebook que un científico ejecuta a mano cada lunes y exporta a un CSV que envía por correo a los vendedores.
porque: Si la predicción se necesita una vez por semana para todos los clientes, la predicción por lotes es más simple y barata que un endpoint en línea.

## Empezar con poco equipo
leccion: cert-gcp-pmle-agent-platform
dominio: 1
caso: cosecha
Con dos personas y los datos ya en BigQuery, ¿por dónde conviene empezar?
- [x] Con BigQuery ML o AutoML tabular, para tener una línea base rápida sin mover los datos.
- [ ] Con un modelo de deep learning personalizado entrenado en un pod de TPU, para tener la mejor precisión posible desde el primer día.
- [ ] Con un pipeline completo de TFX con diez componentes personalizados antes de probar si el problema se puede resolver.
- [ ] Con el ajuste fino de un modelo de lenguaje grande sobre las tablas de compras convertidas a texto.
porque: Las opciones de bajo código dan una línea base rápida; se agrega complejidad solo si la línea base no alcanza.

## Por qué está arriba
leccion: cert-gcp-pmle-agent-platform
dominio: 6
caso: cosecha
¿Cómo explicas a un vendedor por qué un cliente tiene un puntaje alto?
- [ ] Mostrándole la arquitectura del modelo y la cantidad de árboles que tiene.
- [x] Con atribuciones por predicción (por ejemplo, valores de Shapley) que indican qué variables subieron el puntaje de ese cliente.
- [ ] Con la exactitud global del modelo sobre el conjunto de prueba del último entrenamiento y la curva ROC completa, que muestran qué tan confiable es cada puntaje.
- [ ] Con la lista completa de hiperparámetros elegidos en el ajuste del modelo.
porque: Las explicaciones por predicción muestran la contribución de cada variable al resultado de ese cliente en particular.

## Reentrenar si empeora
leccion: cert-gcp-pmle-agent-platform
dominio: 5
caso: cosecha
¿Cómo se reentrena el modelo solo cuando hace falta?
- [ ] Reentrenando a mano cada vez que un vendedor se queja de la lista.
- [x] Con monitoreo de deriva y de calidad cuyo aviso dispara el pipeline de entrenamiento, que valida el modelo nuevo antes de reemplazar al actual.
- [ ] Con un job que reentrena y despliega cada hora sin validar, aunque los datos no cambien, para que el modelo siempre esté al día con lo último que llegó a BigQuery.
- [ ] Borrando el modelo cada mes y entrenando uno nuevo con hiperparámetros elegidos al azar.
porque: El monitoreo detecta la degradación y el pipeline automatiza el reentrenamiento con una validación antes de promover.

## Datos mínimos
leccion: cert-gcp-pmle-agent-platform
dominio: 2
caso: cosecha
¿Qué haces con columnas como el número de documento y el teléfono de cada productor?
- [ ] Usarlas como variables del modelo, porque más columnas siempre mejoran la predicción.
- [x] Excluirlas del entrenamiento y usar un identificador seudónimo para unir las tablas.
- [ ] Copiarlas a un bucket público para que el equipo trabaje más rápido.
- [ ] Guardarlas en la descripción del modelo registrado.
porque: Los datos personales que no aportan al modelo se excluyen; un identificador seudónimo permite unir tablas sin exponerlos.

## Visión sin entrenar
leccion: cert-gcp-pmle-agent-platform
dominio: 1
Una aplicación debe leer el texto impreso de fotos de etiquetas de productos. ¿Qué es lo más rápido?
- [ ] Entrenar desde cero una red convolucional con fotos etiquetadas a mano.
- [x] La detección de texto (OCR) de la API de Vision.
- [ ] AutoML de imágenes con una clase por cada palabra posible del catálogo.
- [ ] BigQuery ML con un modelo k-means sobre los píxeles.
porque: La API de Vision resuelve el OCR sin entrenamiento propio.

## Traducción con términos propios
leccion: cert-gcp-pmle-agent-platform
dominio: 1
La traducción automática traduce mal los nombres de productos de la empresa. ¿Qué ajuste rápido pruebas antes de entrenar un modelo propio?
- [ ] Entrenar un modelo de traducción desde cero con todo el catálogo, los manuales y los correos de la empresa.
- [x] Un glosario en Cloud Translation con los términos que deben mantenerse o traducirse de cierta forma.
- [ ] Cambiar el idioma de origen a inglés para todos los textos antes de traducir.
- [ ] Aumentar la temperatura del modelo de traducción para que sea más creativo.
porque: Los glosarios de Translation fijan cómo se traducen términos específicos sin entrenar.

## Gemini o modelo propio
leccion: cert-gcp-pmle-agent-platform
dominio: 1
Hay que resumir reclamos de clientes en tres oraciones. ¿Qué pruebas primero?
- [x] Un modelo Gemini con un buen prompt y algunos ejemplos, medido con un conjunto de evaluación.
- [ ] Entrenar desde cero un modelo de lenguaje propio con los reclamos de los últimos diez años, en un pod de TPU.
- [ ] AutoML de clasificación de texto con una clase por cada resumen posible.
- [ ] Un modelo de regresión lineal en BigQuery ML sobre la longitud de cada reclamo.
porque: Para tareas de lenguaje generales, un modelo fundacional con prompting es el punto de partida más rápido.

## Modelo de Model Garden
leccion: cert-gcp-pmle-agent-platform
dominio: 1
El equipo necesita un modelo abierto de lenguaje para desplegar en su propio endpoint. ¿Dónde lo busca?
- [ ] En Artifact Registry, que publica los modelos abiertos de lenguaje listos para desplegar en un endpoint.
- [x] En Model Garden, que ofrece modelos de Google, de terceros y abiertos con opciones de despliegue.
- [ ] En Cloud Storage, en un bucket público de Google con todos los modelos.
- [ ] En BigQuery, como tabla con los pesos del modelo.
porque: Model Garden reúne modelos fundacionales y abiertos, y permite desplegarlos o ajustarlos.

## Workbench compartido
leccion: cert-gcp-pmle-agent-platform
dominio: 2
¿Qué ventaja tiene usar instancias de Workbench en lugar de notebooks en las laptops del equipo?
- [ ] Ninguna: los notebooks locales tienen acceso a los mismos permisos y datos del proyecto sin configurar nada ni descargar archivos.
- [x] Entornos administrados con acceso controlado por IAM a BigQuery y Cloud Storage, sin bajar datos a las laptops.
- [ ] Que no necesitan permisos de IAM porque corren fuera del proyecto.
- [ ] Que entrenan automáticamente un modelo con cada notebook que se abre.
porque: Workbench da entornos de notebooks administrados en el proyecto, con acceso gobernado a los datos.

## Versionar datasets
leccion: cert-gcp-pmle-agent-platform
dominio: 2
¿Por qué conviene registrar qué versión de los datos usó cada entrenamiento?
- [ ] Porque el registro de modelos no acepta modelos sin un CSV adjunto con los datos.
- [x] Para reproducir un modelo y entender cambios de desempeño entre versiones.
- [ ] Para que el entrenamiento use GPU automáticamente.
- [ ] Para borrar los datos viejos sin consultar a nadie.
porque: Saber qué datos produjeron cada modelo permite reproducirlo y auditarlo (linaje).

## Model Registry
leccion: cert-gcp-pmle-agent-platform
dominio: 2
¿Qué guarda el Model Registry además del artefacto del modelo?
- [ ] Solo el archivo del modelo y una copia completa de los datos con los que se entrenó.
- [x] Versiones, alias, métricas de evaluación y el linaje hacia el entrenamiento.
- [ ] Una copia de todos los datos de entrenamiento.
- [ ] La factura de cada entrenamiento.
porque: El registro centraliza versiones con metadatos, evaluaciones y alias para el despliegue.

## Etiquetado de datos
leccion: cert-gcp-pmle-agent-platform
dominio: 2
Tienes 50.000 imágenes sin etiquetar y presupuesto para etiquetar 5.000. ¿Cuáles conviene etiquetar primero?
- [ ] Las 5.000 imágenes más nítidas de la clase más frecuente, porque son las más fáciles de etiquetar sin errores y dan un modelo más preciso.
- [x] Una muestra representativa de todas las clases y condiciones, y luego las que el modelo predice con menos confianza.
- [ ] Solo las imágenes de la clase más frecuente.
- [ ] Ninguna: el modelo aprende igual sin etiquetas.
porque: Una muestra representativa y luego el aprendizaje activo (casos inciertos) aprovechan mejor el presupuesto de etiquetado.

## Separar sin fuga
leccion: cert-gcp-pmle-agent-platform
dominio: 2
Hay varias fotos de un mismo paciente. ¿Cómo separas entrenamiento y prueba?
- [ ] Al azar por foto, porque cada foto es un ejemplo independiente aunque sea del mismo paciente.
- [x] Por paciente, para que todas las fotos de un paciente queden en el mismo conjunto.
- [ ] Por fecha de nacimiento del paciente, en orden.
- [ ] Usando las mismas fotos en entrenamiento y prueba.
porque: Separar por grupo evita que el modelo vea en prueba casos casi idénticos a los de entrenamiento.

## Transformaciones consistentes
leccion: cert-gcp-pmle-agent-platform
dominio: 2
¿Cómo garantizas que la normalización usada en el entrenamiento sea la misma al servir?
- [ ] Reescribiendo la normalización en el código del servicio de predicción, con la media y el desvío que el desarrollador copie del notebook de entrenamiento y actualice a mano.
- [x] Incluyendo el preprocesamiento en el modelo exportado (o en una transformación compartida, como tf.Transform) con los parámetros calculados en entrenamiento.
- [ ] Calculando la media y el desvío con cada solicitud de predicción.
- [ ] No normalizando nada al servir.
porque: Empaquetar el preprocesamiento con el modelo evita el desfasaje entre entrenamiento y servicio.

## Entrenamiento distribuido
leccion: cert-gcp-pmle-agent-platform
dominio: 3
El entrenamiento tarda tres días en una GPU y el modelo entra en memoria. ¿Qué estrategia acelera más directamente?
- [ ] Paralelismo de modelo, partiendo las capas del modelo en varias máquinas aunque el modelo entre completo en una sola GPU.
- [x] Paralelismo de datos: varias GPU con una copia del modelo cada una, procesando partes distintas del lote.
- [ ] Reducir el conjunto de entrenamiento al 1 % para que termine en minutos.
- [ ] Cambiar la GPU por una CPU con más núcleos.
porque: Si el modelo entra en una GPU, el paralelismo de datos reparte los lotes y escala el entrenamiento.

## Spot VMs para entrenar
leccion: cert-gcp-pmle-agent-platform
dominio: 3
¿Cómo bajas el costo de entrenamientos largos que toleran interrupciones?
- [ ] Usando siempre las máquinas más grandes disponibles, que terminan antes.
- [x] Usando VMs Spot con checkpoints frecuentes para reanudar si se interrumpe.
- [ ] Desactivando los checkpoints para ir más rápido.
- [ ] Entrenando en la región más lejana.
porque: Las VMs Spot son más baratas pero pueden interrumpirse; los checkpoints permiten retomar sin perder el progreso.

## Entrenamiento personalizado
leccion: cert-gcp-pmle-agent-platform
dominio: 3
Tu código de entrenamiento usa una librería poco común con dependencias del sistema. ¿Cómo lo ejecutas en un trabajo de entrenamiento administrado?
- [ ] Con un contenedor prediseñado, instalando la librería a mano dentro de la máquina después de que arranca.
- [x] Con un contenedor personalizado (imagen propia en Artifact Registry) que trae todas las dependencias.
- [ ] Con AutoML, que acepta cualquier código de entrenamiento.
- [ ] Con BigQuery ML, pegando el código Python en la consulta.
porque: Un contenedor personalizado empaqueta el código y todas sus dependencias para el trabajo de entrenamiento.

## Búsqueda bayesiana
leccion: cert-gcp-pmle-agent-platform
dominio: 3
¿Qué estrategia usa el servicio de ajuste de hiperparámetros por defecto para elegir las próximas pruebas?
- [ ] Una grilla completa de todas las combinaciones posibles, sin importar los resultados anteriores.
- [x] Optimización bayesiana, que usa los resultados previos para elegir las siguientes combinaciones.
- [ ] Siempre el mismo valor para todos los hiperparámetros.
- [ ] El orden alfabético de los nombres de los hiperparámetros.
porque: La optimización bayesiana aprende de las pruebas anteriores para explorar con menos intentos.

## Paradas tempranas
leccion: cert-gcp-pmle-agent-platform
dominio: 3
¿Para qué sirve la parada temprana (early stopping) durante el entrenamiento?
- [ ] Para guardar un checkpoint y reiniciar el entrenamiento desde cero cada vez que la pérdida sube un poco.
- [x] Para detener el entrenamiento cuando la métrica de validación deja de mejorar y así evitar el sobreajuste.
- [ ] Para entrenar más épocas sin importar la métrica.
- [ ] Para cambiar de GPU a mitad del entrenamiento.
porque: Detener cuando la validación deja de mejorar ahorra cómputo y reduce el sobreajuste.

## TPU o GPU
leccion: cert-gcp-pmle-agent-platform
dominio: 3
¿En qué caso suelen convenir las TPU?
- [ ] Para modelos chicos de scikit-learn sobre datos tabulares pequeños, porque cualquier framework de Python corre en TPU sin cambios y siempre más rápido.
- [x] Para entrenar redes grandes con muchas multiplicaciones de matrices y lotes grandes, con frameworks compatibles como JAX o TensorFlow.
- [ ] Para consultas SQL en BigQuery.
- [ ] Para servir un modelo de árbol de decisión con poca carga.
porque: Las TPU están optimizadas para operaciones de matrices a gran escala en entrenamiento de deep learning.

## Ajuste eficiente de un LLM
leccion: cert-gcp-pmle-agent-platform
dominio: 3
Quieres adaptar un modelo de lenguaje al estilo de tus respuestas con pocos datos y poco cómputo. ¿Qué técnica conviene?
- [ ] Reentrenar todos los pesos del modelo desde cero con tus 500 ejemplos, en un pod de TPU durante varias semanas, para que el estilo quede bien aprendido.
- [x] Ajuste eficiente de parámetros (por ejemplo, LoRA o el ajuste supervisado de la plataforma), que entrena pocos parámetros adicionales.
- [ ] Aumentar el tamaño del prompt a un millón de tokens.
- [ ] Usar un modelo de visión.
porque: Las técnicas de ajuste eficiente adaptan el modelo con pocos datos y mucho menos cómputo que reentrenarlo.

## Autoescalado del endpoint
leccion: cert-gcp-pmle-agent-platform
dominio: 4
El tráfico del endpoint cae a casi cero de noche y se triplica a la tarde. ¿Qué configuras?
- [ ] Un número fijo de réplicas igual al pico, encendidas las 24 horas para no arriesgar.
- [x] Un mínimo y un máximo de réplicas para que el endpoint escale según la carga.
- [ ] Un endpoint distinto para cada hora del día.
- [ ] Predicción por lotes cada cinco minutos.
porque: El autoescalado ajusta las réplicas a la demanda entre el mínimo y el máximo configurados.

## Dos modelos en un endpoint
leccion: cert-gcp-pmle-agent-platform
dominio: 4
¿Cómo pruebas un modelo nuevo con el 10 % del tráfico real?
- [ ] Reemplazando el modelo actual y volviendo atrás si alguien se queja.
- [x] Desplegando ambos modelos en el mismo endpoint con una división de tráfico 90/10.
- [ ] Creando un endpoint nuevo y pidiéndole al 10 % de los usuarios que cambie la URL.
- [ ] Probándolo solo con el conjunto de entrenamiento.
porque: La división de tráfico entre modelos de un endpoint permite un despliegue canario controlado.

## Latencia del modelo
leccion: cert-gcp-pmle-agent-platform
dominio: 4
Un modelo grande tarda demasiado en responder en línea. ¿Qué opción reduce la latencia?
- [ ] Usar una máquina más chica para ahorrar costo.
- [x] Optimizarlo (cuantización, destilación o un acelerador como GPU) y medir de nuevo.
- [ ] Agregar más pasos de preprocesamiento en el servidor antes de cada predicción.
- [ ] Servirlo por lotes una vez por día.
porque: Optimizar el modelo o usar aceleradores reduce el tiempo de inferencia.

## Predicción en el dispositivo
leccion: cert-gcp-pmle-agent-platform
dominio: 4
Una app móvil debe clasificar fotos sin conexión a internet. ¿Cómo despliegas el modelo?
- [ ] En un endpoint en línea con autoescalado, llamado desde la app con cada foto que se saca.
- [x] Exportando un modelo optimizado para dispositivos (por ejemplo, LiteRT/TensorFlow Lite) dentro de la app.
- [ ] Con predicción por lotes cada noche en BigQuery.
- [ ] En un clúster de Dataproc.
porque: Sin conexión, el modelo tiene que ejecutarse en el dispositivo en un formato optimizado.

## Variables en línea
leccion: cert-gcp-pmle-agent-platform
dominio: 4
El modelo en línea necesita el promedio de compras de los últimos 30 días de cada cliente con baja latencia. ¿De dónde lo lee?
- [ ] De una consulta a BigQuery que recalcula el promedio de los últimos 30 días en cada solicitud de predicción.
- [x] Del servicio en línea de Feature Store, que sirve los valores precalculados por clave.
- [ ] De un archivo CSV en el contenedor del modelo.
- [ ] Del prompt del usuario.
porque: El servicio en línea de Feature Store entrega valores precalculados con baja latencia.

## Seguridad del endpoint
leccion: cert-gcp-pmle-agent-platform
dominio: 4
¿Cómo restringes quién puede llamar a un endpoint de predicción?
- [ ] Publicando la URL solo en la wiki interna.
- [x] Con permisos de IAM sobre el endpoint (y un endpoint privado si debe ser accesible solo desde la red interna).
- [ ] Con un comentario en el código del modelo.
- [ ] Cambiando el nombre del endpoint cada semana y avisando solo a los equipos autorizados por correo.
porque: IAM controla quién puede invocar el endpoint y los endpoints privados limitan el acceso a la red.

## Rollback
leccion: cert-gcp-pmle-agent-platform
dominio: 4
El modelo nuevo empezó a dar errores en producción. ¿Qué es lo más rápido?
- [ ] Reentrenar desde cero el modelo anterior y esperar que dé el mismo resultado que antes.
- [x] Volver el 100 % del tráfico al modelo anterior, que sigue desplegado o registrado.
- [ ] Borrar el endpoint y crear otro mañana.
- [ ] Esperar a que el modelo nuevo se corrija solo.
porque: Mantener la versión anterior permite revertir cambiando la división de tráfico o el alias.

## Artefactos del pipeline
leccion: cert-gcp-pmle-agent-platform
dominio: 5
¿Qué registra automáticamente un pipeline sobre cada ejecución?
- [ ] Nada: hay que anotar a mano qué se ejecutó.
- [x] Los artefactos de entrada y salida de cada paso, sus parámetros y el linaje en los metadatos de ML.
- [ ] Solo la hora de inicio.
- [ ] Solo los registros de texto de cada paso, que hay que leer a mano para saber qué datos se usaron.
porque: Los pipelines guardan metadatos y linaje de artefactos, lo que permite reproducir y auditar.

## Kubeflow Pipelines
leccion: cert-gcp-pmle-agent-platform
dominio: 5
¿Con qué SDK se definen habitualmente los pipelines que ejecuta el servicio de Pipelines?
- [ ] Con archivos YAML de Cloud Build, que el servicio de Pipelines ejecuta paso a paso.
- [ ] Con SQL de BigQuery solamente.
- [x] Con KFP o TFX, compilados a una definición que el servicio ejecuta.
- [ ] Con un archivo de Excel.
porque: El servicio de Pipelines ejecuta definiciones compiladas desde los SDK de Kubeflow Pipelines o TFX.

## Validar antes de promover
leccion: cert-gcp-pmle-agent-platform
dominio: 5
¿Qué paso del pipeline evita que un modelo peor llegue a producción?
- [ ] Un paso que siempre despliega el último modelo entrenado, porque tiene los datos más recientes y por eso siempre es mejor.
- [x] Un paso de evaluación que compara con el modelo actual y despliega solo si supera el umbral acordado.
- [ ] Un paso que borra el modelo anterior antes de evaluar.
- [ ] Un paso que duplica los datos de entrenamiento.
porque: Una compuerta de evaluación condiciona el despliegue a que el modelo nuevo sea mejor.

## Código del pipeline en Git
leccion: cert-gcp-pmle-agent-platform
dominio: 5
¿Qué práctica de CI/CD aplicas al código del pipeline de ML?
- [ ] Editar el pipeline directamente en producción desde la consola y anotar los cambios en un documento compartido.
- [x] Guardarlo en Git y, con cada cambio, correr pruebas y compilar/desplegar el pipeline con Cloud Build.
- [ ] Guardar el pipeline en un correo electrónico.
- [ ] No versionarlo, porque los pipelines no cambian.
porque: El código del pipeline se versiona y se prueba y despliega automáticamente como cualquier software.

## Validación de datos
leccion: cert-gcp-pmle-agent-platform
dominio: 5
Un día llegan datos con una columna vacía y el modelo se entrena igual. ¿Qué paso agregas al pipeline?
- [ ] Ninguno: el modelo aprende a ignorar las columnas vacías y el paso de evaluación detecta después cualquier problema en los datos.
- [x] Una validación de esquema y estadísticas (por ejemplo, TensorFlow Data Validation) que detiene el pipeline si los datos no cumplen.
- [ ] Un paso que agrega más épocas de entrenamiento.
- [ ] Un paso que cambia el tipo de máquina.
porque: Validar los datos antes de entrenar evita modelos construidos sobre datos rotos.

## Entrenamiento continuo
leccion: cert-gcp-pmle-agent-platform
dominio: 5
¿Qué diferencia hay entre CI/CD y entrenamiento continuo (CT) en MLOps?
- [ ] No hay diferencia: son dos nombres para lo mismo.
- [x] CI/CD prueba y despliega código y pipelines; CT vuelve a entrenar el modelo automáticamente con datos nuevos.
- [ ] CT solo se usa para modelos de visión.
- [ ] CI/CD reentrena el modelo cada vez que llegan datos; CT prueba el código del pipeline antes de desplegarlo en producción.
porque: CT automatiza el reentrenamiento con datos nuevos; CI/CD automatiza la integración y el despliegue del código.

## Monitoreo de atribuciones
leccion: cert-gcp-pmle-agent-platform
dominio: 6
Las predicciones siguen pareciendo normales, pero el modelo empezó a apoyarse mucho en una variable que antes no pesaba. ¿Qué lo detecta?
- [ ] El monitoreo de la latencia y de los errores del endpoint.
- [x] El monitoreo de la deriva de las atribuciones de las variables.
- [ ] El conteo de solicitudes por minuto.
- [ ] La factura mensual.
porque: La deriva de atribuciones muestra cambios en la importancia de las variables aunque las predicciones no cambien mucho.

## Calidad con etiquetas tardías
leccion: cert-gcp-pmle-agent-platform
dominio: 6
Las etiquetas reales (si el cliente compró) llegan un mes después de la predicción. ¿Cómo mides la calidad en producción?
- [ ] No se puede medir nunca en producción.
- [x] Uniendo las predicciones guardadas con las etiquetas cuando llegan y calculando las métricas por período, mientras se vigila la deriva de los datos.
- [ ] Usando la exactitud del conjunto de entrenamiento como estimación fija de la calidad en producción, sin esperar las etiquetas.
- [ ] Preguntándole al modelo si está seguro.
porque: Cuando las etiquetas tardan, se mide con retraso y se usa la deriva como señal temprana.

## Equidad por grupo
leccion: cert-gcp-pmle-agent-platform
dominio: 6
¿Cómo revisas si el modelo trata peor a los productores de una región?
- [ ] Mirando la métrica global del modelo, que ya resume el desempeño de todas las regiones.
- [x] Calculando las métricas (por ejemplo, recall y tasa de falsos positivos) por región y comparándolas.
- [ ] Quitando la región del informe.
- [ ] Entrenando más épocas.
porque: Las métricas por segmento revelan diferencias de desempeño que el promedio oculta.

## Alertas de monitoreo
leccion: cert-gcp-pmle-agent-platform
dominio: 6
¿Qué conviene configurar en el monitoreo del modelo para actuar a tiempo?
- [ ] Nada: alcanza con revisar el panel de monitoreo cuando alguien se acuerde de mirarlo.
- [x] Umbrales de deriva por variable con alertas por correo o canal del equipo.
- [ ] Una alerta por cada predicción individual.
- [ ] Una alerta cuando el endpoint recibe tráfico.
porque: Los umbrales de deriva con notificaciones permiten reaccionar antes de que el negocio note la degradación.

## Evaluar respuestas generativas
leccion: cert-gcp-pmle-agent-platform
dominio: 6
¿Cómo comparas dos prompts para un asistente con un criterio repetible?
- [ ] Probando cada prompt con tres preguntas que se le ocurran al desarrollador y eligiendo el que dé respuestas más largas.
- [x] Con un conjunto de evaluación y métricas (por ejemplo, un juez automático con criterios definidos) aplicadas a ambos prompts.
- [ ] Contando las palabras de cada respuesta.
- [ ] Eligiendo el prompt más largo.
porque: El servicio de evaluación de IA generativa compara salidas con métricas y criterios definidos de forma repetible.
