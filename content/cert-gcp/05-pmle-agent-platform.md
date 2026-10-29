---
titulo: PMLE - Machine Learning Engineer con Gemini Enterprise Agent Platform
nivel: Experto
duracion: 90
resumen: Las seis secciones del Professional Machine Learning Engineer (guía del 1 de junio de 2026) - soluciones de bajo código (BigQuery ML, AutoML, APIs de IA, Model Garden y Gemini), colaboración y gestión de datos y modelos (Feature Store, Workbench, Experiments, Metadata), escalar prototipos (entrenamiento personalizado, distribuido, hiperparámetros, fine-tuning), servir y escalar (endpoints, predicción por lotes, optimización), automatizar con Pipelines y CI/CD, y monitorear (Model Monitoring, IA responsable y evaluación de IA generativa).
objetivos: Elegir entre APIs preentrenadas, BigQuery ML, AutoML, Model Garden y entrenamiento personalizado | Gestionar variables, experimentos y linaje | Escalar el entrenamiento con contenedores, GPU/TPU y búsqueda de hiperparámetros | Servir modelos en línea y por lotes con buen costo y latencia | Automatizar con Pipelines (Kubeflow) y CI/CD | Monitorear sesgo de entrenamiento-servicio, deriva y calidad de modelos generativos
prerrequisitos: cert-gcp-pde-almacenamiento-analisis
autoevaluacion: ¿Sabes cuándo basta una API preentrenada? | ¿Sabes qué es training-serving skew? | ¿Sabes cuándo usar TPU? | ¿Sabes cómo dividir tráfico entre dos modelos de un endpoint? | ¿Sabes evaluar un modelo generativo en la plataforma?
---

:::escenario
El equipo de ML de la cadena de Valentina quiere predecir la demanda de 50.000 productos por sucursal, clasificar fotos de góndolas y ofrecer un asistente con Gemini. Hoy entrenan en laptops. Deben elegir el enfoque correcto para cada caso, ponerlo en producción y vigilarlo. Eso es el PMLE.
:::

## El examen

- 50–60 preguntas, 2 horas, USD 200, vigencia de 2 años. Guía vigente del **1 de junio de 2026**.
- La plataforma **Vertex AI** pasó a llamarse **Gemini Enterprise Agent Platform**; sus componentes (Pipelines, Feature Store, Model Registry, AutoML, Model Garden, Workbench, Experiments, Endpoints) mantienen su función. Verás ambos nombres.

| Sección | Peso aprox. |
|---|---|
| 1. Diseñar soluciones de IA de bajo código | ~13 % |
| 2. Colaborar dentro y entre equipos para gestionar datos y modelos | ~16 % |
| 3. Escalar prototipos a modelos de ML | ~21 % |
| 4. Servir y escalar modelos | ~20 % |
| 5. Automatizar y orquestar pipelines de ML | ~18 % |
| 6. Monitorear soluciones de IA | ~13 % |

```diagrama
titulo: MLOps en Gemini Enterprise Agent Platform
nodo bq: BigQuery | icono=bigquery | col=0 | fila=0 | forma=cilindro | color=verde
nodo fs: Feature Store | icono=sigla:FS:azul | col=1 | fila=0 | sub=sobre BigQuery | color=azul
nodo wb: Workbench | icono=jupyter | col=1 | fila=1 | sub=experimentar | color=gris
nodo tr: Entrenamiento | icono=agentplatform | col=2 | fila=0 | sub=custom, AutoML, HPT | color=azul
nodo ex: Experiments + Metadata | icono=sigla:EXP:violeta | col=2 | fila=1 | sub=linaje | color=violeta
nodo mr: Model Registry | icono=sigla:MR:violeta | col=3 | fila=0 | sub=versiones y alias | color=violeta
nodo ep: Endpoint | icono=sigla:EP:naranja | col=4 | fila=0 | sub=división de tráfico | color=naranja
nodo mo: Model Monitoring | icono=activity | col=4 | fila=1 | sub=skew y deriva | color=rosa
nodo pl: Pipelines | icono=orquestador | col=3 | fila=1 | sub=Kubeflow / TFX | color=cian
flecha bq -> fs
flecha fs -> tr
flecha wb -> tr | estilo=punteada
flecha tr -> ex | estilo=punteada
flecha tr -> mr
flecha mr -> ep
flecha ep -> mo
flecha mo -> pl: reentrenar | estilo=punteada
flecha pl -> tr | estilo=punteada
```

## Sección 1: soluciones de bajo código

| Enfoque | Cuándo |
|---|---|
| **APIs preentrenadas** (Vision, Natural Language, Speech-to-Text, Translation, **Document AI**, Video Intelligence) | La tarea es estándar: OCR, entidades, traducción, transcripción |
| **Gemini** y modelos de **Model Garden** con prompts | Tareas de lenguaje, visión o multimodales sin entrenar |
| **BigQuery ML** | Datos en BigQuery, equipo con SQL, modelos tabulares o de series de tiempo |
| **AutoML** (tabular, imagen, texto, video) | Datos etiquetados propios, poca experiencia en ML, se acepta menos control |
| **Entrenamiento personalizado** | Arquitecturas propias, control total, requisitos especiales |

- **IA generativa**: elegir modelo (Gemini Pro para razonar, Flash para costo y latencia), **grounding** con Google Search o con datos propios (**Vertex AI Search** / búsqueda de la plataforma, **RAG Engine**), **Agent Builder** y el **Agent Development Kit (ADK)** con **Agent Engine** para agentes.
- Adaptar: **ingeniería de prompts**, **ajuste supervisado** (*supervised fine-tuning*) de Gemini, **destilación**.

## Sección 2: datos y modelos en equipo

- **Feature Store** (sobre BigQuery): variables como vistas o tablas de BigQuery con **servicio online** de baja latencia; evita *training-serving skew* al reutilizar la misma lógica.
- **Workbench** (notebooks administrados) y **Colab Enterprise**.
- **Experiments** y **TensorBoard** para comparar ejecuciones; **ML Metadata** para el linaje de artefactos.
- **Datasets** administrados; preprocesamiento con **Dataflow** o **TensorFlow Transform** a escala; **Dataproc** para Spark.
- **Privacidad**: Sensitive Data Protection, IAM por recurso, **CMEK**, VPC Service Controls.

## Sección 3: escalar prototipos

- **Custom training**: contenedores **prediseñados** (TensorFlow, PyTorch, scikit-learn, XGBoost) o **personalizados** en Artifact Registry; trabajos simples o **pipelines de entrenamiento**.
- **Hardware**: CPU para modelos clásicos; **GPU** para aprendizaje profundo general; **TPU** para grandes modelos de TensorFlow/JAX con muchas multiplicaciones de matrices y lotes grandes.
- **Entrenamiento distribuido**: `MirroredStrategy` (varias GPU, un host), `MultiWorkerMirroredStrategy`, **reduction server**, `TPUStrategy`; Ray en la plataforma.
- **Hyperparameter tuning**: optimización bayesiana por defecto (Vizier), búsqueda grid o aleatoria, trabajos en paralelo (menos paralelismo = mejor aprendizaje de la búsqueda bayesiana).
- **Evaluación**: métricas por clase, umbrales, curvas PR y ROC; **Explainable AI** (Shapley muestreado, gradientes integrados, XRAI) para atribución de variables.
- **Modelos generativos**: ajuste supervisado y evaluación antes de desplegar.

## Sección 4: servir y escalar

| Opción | Cuándo |
|---|---|
| **Endpoint en línea** | Predicciones de baja latencia; **autoescalado** por réplicas mínimas y máximas |
| **Predicción por lotes** | Grandes volúmenes desde BigQuery o Cloud Storage, sin endpoint permanente |
| **BigQuery ML `ML.PREDICT`** | Los datos ya están en BigQuery |
| **Endpoints privados** / Private Service Connect | Tráfico sin internet, menor latencia |
| **Optimized TensorFlow runtime**, NVIDIA Triton, vLLM | Menor latencia y costo |

- **División de tráfico** entre versiones de modelo en un endpoint (canary, A/B) y **alias** en Model Registry (`default`, `champion`).
- **Cotizaciones de costo**: escalar a cero no siempre está disponible en línea; para tráfico bajo y sin requisito de latencia, predicción por lotes.
- **Cuellos de botella**: preprocesamiento en el cliente frente al servidor, tamaño de lote, cuantización, tipo de máquina, aceleradores.

## Sección 5: automatizar y orquestar

- **Pipelines** (Kubeflow Pipelines v2 o TFX), serverless, con **caché** de pasos, **componentes de Google Cloud** (AutoML, entrenamiento, despliegue, BigQuery), linaje en ML Metadata y programación.
- **CI/CD**: Cloud Build compila componentes y lanza pipelines al cambiar el código; **Cloud Deploy** o Terraform para infraestructura; pruebas de datos y de modelos como compuertas.
- **Disparar reentrenamiento**: por calendario (Cloud Scheduler), por llegada de datos (Eventarc, Pub/Sub) o por alertas de monitoreo.
- **Composer** si la organización ya orquesta allí.

```python norun
from kfp import dsl
from google_cloud_pipeline_components.v1.automl.training_job import AutoMLTabularTrainingJobRunOp
from google_cloud_pipeline_components.v1.dataset import TabularDatasetCreateOp

@dsl.pipeline(name="demanda-semanal")
def pipeline(proyecto: str, tabla_bq: str):
    ds = TabularDatasetCreateOp(project=proyecto, display_name="demanda",
                                bq_source=tabla_bq)
    modelo = AutoMLTabularTrainingJobRunOp(
        project=proyecto, display_name="demanda-automl",
        optimization_prediction_type="regression",
        dataset=ds.outputs["dataset"], target_column="unidades",
        budget_milli_node_hours=1000)
    evaluar_y_desplegar(modelo=modelo.outputs["model"], umbral_mape=0.15)
```

## Sección 6: monitorear

- **Model Monitoring**: **training-serving skew** (los datos en producción difieren de los de entrenamiento) y **deriva de predicción** (cambian con el tiempo) para variables y atribuciones; umbrales por variable (distancia L-infinito para categóricas, Jensen-Shannon para numéricas) y alertas.
- **Calidad** con etiquetas reales cuando llegan; reentrenamiento cuando cae.
- **IA responsable**: equidad por segmentos, explicabilidad, **Model Cards**, filtros de seguridad de Gemini y **Model Armor** contra inyección de prompts y fuga de datos.
- **Evaluación de IA generativa** (**Gen AI evaluation service**): métricas basadas en modelo (*autorater*: fluidez, coherencia, fundamentación, seguridad) y basadas en cálculo (ROUGE, BLEU, coincidencia exacta), comparación por pares.
- Registros de solicitudes y respuestas a BigQuery; Cloud Monitoring para latencia, errores y uso.

:::examen Decisiones típicas
- "OCR de facturas sin entrenar" → **Document AI**.
- "Analistas con SQL, datos en BigQuery" → **BigQuery ML**.
- "Imágenes etiquetadas propias, equipo sin experiencia en ML" → **AutoML**.
- "Producción recibe valores distintos a los de entrenamiento" → **skew** en Model Monitoring.
- "Puntuar 100 millones de filas cada noche" → **predicción por lotes**.
- "Probar un modelo con el 10 % del tráfico" → **división de tráfico** en el endpoint.
:::

## Ejercicios

:::ejercicio quiz
Hay que extraer campos de facturas de proveedores con mínimo esfuerzo y sin datos etiquetados. ¿Qué usas?
- [ ] AutoML de imágenes con miles de facturas etiquetadas.
- [x] Document AI con el procesador de facturas.
- [ ] Un modelo personalizado de TensorFlow entrenado en TPU.
- [ ] BigQuery ML con regresión logística.
```explicacion
Document AI ofrece procesadores preentrenados para facturas que extraen los campos sin entrenamiento.
```
:::

:::ejercicio quiz
Un modelo funciona bien en la evaluación, pero en producción la variable `precio` llega en dólares cuando se entrenó en pesos. ¿Qué monitoreo lo detecta?
- [ ] La deriva de predicción a lo largo de meses.
- [x] La detección de training-serving skew de Model Monitoring.
- [ ] Las métricas de latencia del endpoint.
- [ ] Explainable AI con gradientes integrados.
```explicacion
El skew compara la distribución de los datos de producción con la del entrenamiento y detecta diferencias como esta.
```
:::

:::ejercicio quiz
Un modelo de lenguaje grande en JAX con lotes enormes y multiplicaciones de matrices tarda días en GPU. ¿Qué hardware conviene evaluar?
- [ ] Más CPU con más memoria.
- [x] TPU.
- [ ] Una sola GPU más pequeña.
- [ ] Instancias preemptibles de CPU.
```explicacion
Las TPU están diseñadas para operaciones matriciales a gran escala con TensorFlow y JAX.
```
:::

:::ejercicio quiz
Hay que puntuar 100 millones de clientes una vez por noche y no hay requisito de latencia. ¿Qué es lo más rentable?
- [ ] Un endpoint en línea con 20 réplicas mínimas.
- [x] Predicción por lotes desde BigQuery.
- [ ] Un endpoint privado con Private Service Connect.
- [ ] Llamadas en paralelo desde Cloud Run al endpoint.
```explicacion
La predicción por lotes procesa grandes volúmenes sin mantener un endpoint encendido.
```
:::

:::ejercicio abierto
Diseña la solución para los tres casos de Valentina (demanda de 50.000 productos, fotos de góndolas y asistente con Gemini), indicando para cada uno el enfoque, cómo se sirve y cómo se monitorea.
```text solucion
Demanda: BigQuery ML ARIMA_PLUS (o TimesFM con AI.FORECAST) sobre las ventas diarias, con predicción por lotes nocturna en BigQuery; un pipeline programado reentrena semanalmente y compara el error (MAPE) contra el modelo anterior antes de reemplazarlo.
Góndolas: AutoML de detección de objetos con imágenes etiquetadas; endpoint en línea para la app de los repositores con autoescalado; Model Monitoring de deriva y revisión de muestras etiquetadas mensualmente.
Asistente: Gemini Flash con grounding sobre el catálogo y las políticas (búsqueda de la plataforma o RAG Engine), construido con ADK y desplegado en Agent Engine; Model Armor y filtros de seguridad; evaluación con Gen AI evaluation service (fundamentación, seguridad) en CI y registros a BigQuery para revisar respuestas.
```
:::
