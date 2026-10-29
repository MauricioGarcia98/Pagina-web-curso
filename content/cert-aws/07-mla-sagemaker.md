---
titulo: MLA-C02 - Machine Learning Engineer con Amazon SageMaker AI
nivel: Avanzado
duracion: 85
resumen: Los cuatro dominios del ML Engineer – Associate (MLA-C02, que reemplaza a MLA-C01 con la misma estructura) - preparar datos para ML (Data Wrangler, Feature Store, Ground Truth, calidad y sesgo), desarrollar modelos (algoritmos integrados, entrenamiento, ajuste automático, evaluación, Clarify, Model Registry), desplegar y orquestar (tipos de endpoint, autoescalado, SageMaker Pipelines, CI/CD) y monitorear, mantener y asegurar (Model Monitor, costos, IAM, VPC y cifrado).
objetivos: Preparar y transformar datos para entrenar, evitando fugas y sesgo | Elegir algoritmo, instancia y estrategia de entrenamiento | Ajustar hiperparámetros y evaluar modelos con las métricas correctas | Elegir entre endpoints en tiempo real, serverless, asíncronos y transformación por lotes | Automatizar el ciclo con SageMaker Pipelines y Model Registry | Monitorear deriva y calidad, optimizar costos y asegurar la infraestructura de ML
prerrequisitos: cert-aws-aif-fundamentos-ia
autoevaluacion: ¿Sabes qué endpoint usar para cargas de 20 minutos con archivos de 1 GB? | ¿Sabes cómo reducir el costo de entrenamiento con interrupciones tolerables? | ¿Sabes qué detecta Model Monitor? | ¿Sabes cuándo usar Feature Store online y offline? | ¿Sabes cómo desplegar sin cortar el tráfico?
---

:::escenario
El equipo de ML de la empresa de Tomás predice demoras de entrega. Hoy el modelo se entrena en una notebook, se copia a mano a un servidor y nadie sabe si sigue acertando. Deben reentrenar cada semana, desplegar sin interrupciones, detectar cuándo el modelo se degrada y bajar el costo de GPU a la mitad. Es exactamente lo que evalúa la MLA.
:::

## El examen

- **MLA-C02** reemplazó a **MLA-C01** (última fecha para rendirlo: 28 de septiembre de 2026). Mantiene los 4 dominios y sus pesos, con servicios y temas actualizados (incluida la IA generativa en SageMaker AI).
- 65 preguntas (50 puntuadas), 130 minutos, USD 150, aprobación 720/1000.
- Dominios: preparación de datos (28 %), desarrollo de modelos (26 %), despliegue y orquestación (22 %), monitoreo, mantenimiento y seguridad (24 %).

```diagrama
titulo: El ciclo de ML en SageMaker AI
nodo s3: Datos en S3 | icono=s3 | col=0 | fila=0 | forma=cilindro | color=verde
nodo dw: Data Wrangler | icono=sagemaker | col=1 | fila=0 | sub=preparar | color=verde
nodo fs: Feature Store | icono=sigla:FS:verde | col=2 | fila=0 | sub=online / offline | color=verde
nodo tr: Training job | icono=sagemaker | col=3 | fila=0 | sub=Spot + checkpoints | color=azul
nodo hpo: Ajuste automático | icono=sigla:AMT:azul | col=3 | fila=1 | sub=bayesiano, Hyperband | color=azul
nodo mr: Model Registry | icono=sigla:MR:violeta | col=4 | fila=0 | sub=aprobación | color=violeta
nodo ep: Endpoint | icono=sigla:EP:naranja | col=5 | fila=0 | sub=blue/green, canary | color=naranja
nodo mm: Model Monitor | icono=cloudwatch | col=5 | fila=1 | sub=deriva y calidad | color=rosa
nodo pl: SageMaker Pipelines | icono=orquestador | col=1 | fila=1 | sub=automatiza todo | color=cian
flecha s3 -> dw
flecha dw -> fs
flecha fs -> tr
flecha hpo -> tr | estilo=punteada
flecha tr -> mr
flecha mr -> ep
flecha ep -> mm
flecha mm -> pl: dispara reentrenamiento | estilo=punteada
```

## Dominio 1 (28 %): preparación de datos

### Ingesta y almacenamiento

- Formatos: **Parquet** para tablas; **RecordIO-protobuf** para algoritmos integrados; **CSV** o **JSON Lines**. Imágenes y archivos grandes en S3.
- Modos de entrada al entrenamiento: **File** (copia todo al disco), **Pipe** y **Fast File** (transmiten desde S3 sin esperar la copia), **FSx for Lustre** o **EFS** para muchos archivos chicos y entrenamientos repetidos.
- Fuentes: S3, Redshift, Athena, EMR, Glue, Kinesis.

### Transformar y crear variables

- **SageMaker Data Wrangler** (en **SageMaker Canvas**): importación, más de 300 transformaciones, análisis de calidad, detección de fuga de objetivo, y exportación a un job o a Pipelines.
- **SageMaker Processing**: jobs de scikit-learn, Spark o un contenedor propio para transformar a escala.
- **Glue** y **EMR** para volúmenes grandes; **DataBrew** para limpieza visual.
- Técnicas: imputación (media, mediana, modelo), escalado (estandarización, min-max), **one-hot** (pocas categorías) o **codificación por objetivo**/embeddings (muchas), binning, transformaciones logarítmicas, tokenización, fechas a componentes.
- **Desbalance**: sobremuestreo, **SMOTE**, submuestreo, pesos por clase.
- **Fuga de datos**: dividir **antes** de ajustar escaladores o imputadores; en series temporales, dividir por tiempo.

### Feature Store y etiquetado

- **SageMaker Feature Store**: grupos de variables con almacén **online** (baja latencia para inferencia) y **offline** (S3/Iceberg, histórico para entrenar), con consultas **point-in-time** para evitar fugas.
- **SageMaker Ground Truth** y **Ground Truth Plus**: etiquetado con personas (equipos propios, Mechanical Turk, proveedores) y etiquetado automático activo.

### Calidad, sesgo y privacidad

- **SageMaker Clarify** antes de entrenar: desbalance de clases (CI), diferencia en proporciones de etiquetas (DPL) y otras métricas de sesgo.
- **Glue Data Quality** y Data Wrangler para validar.
- PII: enmascarar o anonimizar, cifrado con KMS, Macie para descubrirla.

## Dominio 2 (26 %): desarrollo de modelos

### Elegir el enfoque

| Problema | Opciones en AWS |
|---|---|
| Ya existe un servicio de IA (OCR, traducción, sentimiento) | **Textract, Translate, Comprehend…** sin entrenar |
| Tabular: clasificación o regresión | **XGBoost**, **LightGBM**, **CatBoost**, Linear Learner, **AutoGluon** / Autopilot |
| Clustering | **K-Means** |
| Anomalías | **Random Cut Forest** |
| Series de tiempo | **DeepAR**, AutoGluon-TimeSeries, Canvas |
| Recomendaciones / datos dispersos | **Factorization Machines** |
| Texto | **BlazingText** (Word2Vec y clasificación), **Seq2Seq**, modelos de JumpStart |
| Imágenes | Clasificación, detección de objetos, segmentación semántica |
| Temas en documentos | **LDA**, **NTM** |
| Reducción de dimensiones | **PCA** |
| IA generativa | Modelos de **JumpStart** con fine-tuning, o Bedrock |

### Entrenar

- Un **training job** recibe una imagen (algoritmo integrado, framework como PyTorch/TensorFlow/scikit-learn o contenedor propio), instancias, datos en S3 y escribe el modelo en S3.
- **Spot administrado** (*managed spot training*): hasta 90 % menos costo; requiere **checkpoints** en S3 para reanudar tras una interrupción.
- **Entrenamiento distribuido**: paralelismo de **datos** (el modelo cabe en una GPU, muchos datos) o de **modelo** (el modelo no cabe); **SageMaker HyperPod** para clústeres de entrenamiento largos y resilientes.
- **Warm pools** reducen el arranque de jobs repetidos.
- **SageMaker Debugger**: detecta problemas durante el entrenamiento (gradientes que desaparecen, sobreajuste, cuellos de botella de CPU/GPU) y puede detener el job.
- **SageMaker Experiments** / **MLflow administrado** en SageMaker: registro de ejecuciones, parámetros y métricas.

### Ajuste automático (AMT)

- Estrategias: **bayesiana** (aprende de los intentos previos; la más eficiente), **aleatoria**, **grid** y **Hyperband** (corta temprano las configuraciones malas).
- Se define la métrica objetivo, rangos (continuos, enteros, categóricos; escala logarítmica para tasas de aprendizaje) y el máximo de jobs en paralelo. **Warm start** reutiliza ajustes previos.

### Evaluar y mejorar

- Validación cruzada, conjunto de prueba separado, métricas según el problema (ver la lección de AIF).
- **Sobreajuste**: regularización L1/L2, *dropout*, *early stopping*, más datos, menos profundidad (XGBoost: `max_depth`, `eta`, `subsample`, `alpha`, `lambda`).
- **Clarify** después de entrenar: sesgo en predicciones y **explicabilidad** (SHAP).
- **Shadow testing** para comparar con producción.
- **SageMaker Model Registry**: grupos de paquetes de modelo versionados con métricas y estado de **aprobación** (`PendingManualApproval`, `Approved`, `Rejected`), que dispara el despliegue.

```python norun
from sagemaker.estimator import Estimator
from sagemaker.tuner import HyperparameterTuner, ContinuousParameter, IntegerParameter

xgb = Estimator(
    image_uri=sagemaker.image_uris.retrieve("xgboost", region, "1.7-1"),
    role=rol, instance_count=1, instance_type="ml.m5.2xlarge",
    use_spot_instances=True, max_run=3600, max_wait=7200,
    checkpoint_s3_uri="s3://ml-demoras/checkpoints/",
    output_path="s3://ml-demoras/modelos/",
)
xgb.set_hyperparameters(objective="binary:logistic", num_round=400, eval_metric="auc")

tuner = HyperparameterTuner(
    xgb, objective_metric_name="validation:auc", strategy="Bayesian",
    hyperparameter_ranges={
        "eta": ContinuousParameter(0.01, 0.3, scaling_type="Logarithmic"),
        "max_depth": IntegerParameter(3, 10),
    },
    max_jobs=30, max_parallel_jobs=3,
)
tuner.fit({"train": "s3://ml-demoras/train/", "validation": "s3://ml-demoras/val/"})
```

## Dominio 3 (22 %): despliegue y orquestación

### Tipos de inferencia

| Opción | Cuándo |
|---|---|
| **Endpoint en tiempo real** | Latencia baja y tráfico constante; autoescalado por `InvocationsPerInstance` |
| **Serverless Inference** | Tráfico intermitente o impredecible; escala a cero; tolera arranques en frío |
| **Asynchronous Inference** | Cargas grandes (hasta 1 GB) o procesamiento largo (hasta 1 hora); cola interna; puede escalar a cero |
| **Batch Transform** | Puntuar un conjunto completo en S3 sin endpoint permanente |
| **Multi-model endpoint** | Muchos modelos similares (uno por cliente) en el mismo contenedor, cargados bajo demanda |
| **Multi-container / componentes de inferencia** | Varios modelos distintos en un endpoint, con recursos asignados por modelo |
| **SageMaker Neo / edge** | Compilar y optimizar para dispositivos |

- **Instancias**: CPU (ml.c, ml.m), GPU (ml.g, ml.p), **Inferentia** (ml.inf2) y **Trainium** (ml.trn) para bajar costo en inferencia y entrenamiento de aprendizaje profundo.
- **Inference Recommender**: prueba de carga para elegir instancia y configuración.
- **Guardrails de despliegue**: **blue/green** con traslado de tráfico **todo de una vez**, **canary** (un porcentaje primero) o **lineal**, con **rollback automático** por alarmas de CloudWatch. **Shadow variants** reciben copia del tráfico sin responder.
- **Production variants**: varios modelos en un endpoint con pesos de tráfico (A/B).

### Orquestación y CI/CD

- **SageMaker Pipelines**: DAG de pasos (Processing, Training, Tuning, `ConditionStep` sobre métricas, `RegisterModel`, Transform, Lambda, `FailStep`), con caché de pasos y parámetros. Se programa o se dispara con **EventBridge**.
- **SageMaker Projects**: plantillas de MLOps con repositorio, pipeline de construcción y de despliegue.
- **CodePipeline**, **CodeBuild**, **CloudFormation/CDK** para infraestructura; **Step Functions** o **MWAA** si la organización ya los usa.
- **Contenedores**: imágenes propias en **ECR**; despliegue también en **EKS** o **ECS** cuando la plataforma lo exige.

## Dominio 4 (24 %): monitoreo, mantenimiento y seguridad

### Monitorear el modelo

- **SageMaker Model Monitor** compara el tráfico capturado (*data capture*) con una **línea base**:
  - **Calidad de datos**: deriva de distribuciones, valores faltantes, tipos.
  - **Calidad del modelo**: métricas con etiquetas reales (*ground truth*) que llegan después.
  - **Deriva de sesgo** y **deriva de atribución de variables** (con Clarify).
- Las violaciones van a CloudWatch; una alarma puede disparar el pipeline de reentrenamiento.
- **A/B y shadow** para validar cambios con tráfico real.

### Monitorear la infraestructura y el costo

- **CloudWatch**: latencia del modelo, errores 4xx/5xx, uso de CPU/GPU y memoria; CloudWatch Logs del contenedor.
- **CloudTrail** para auditoría; **AWS X-Ray** para trazas.
- Costo: Spot para entrenar, **Savings Plans de SageMaker**, apagar notebooks y endpoints sin uso, serverless o asíncrono con escalado a cero, Inferentia, multi-model endpoints, **Cost Explorer** con etiquetas y **AWS Budgets**.
- **Compute Optimizer** y Inference Recommender para dimensionar.

### Seguridad

- **Roles de ejecución** con permisos mínimos para jobs y endpoints; **SageMaker Role Manager** crea roles por persona y actividad.
- **VPC**: jobs y endpoints en subredes privadas, **aislamiento de red** del contenedor (sin salida a internet), **VPC endpoints** para S3, SageMaker API y Runtime.
- **Cifrado** con KMS de volúmenes, artefactos en S3, tráfico entre nodos del entrenamiento distribuido.
- **SageMaker Model Cards** y **Model Dashboard** para gobierno.

:::examen Decisiones típicas
- "Imágenes de 500 MB con 10 minutos de procesamiento" → **Asynchronous Inference**.
- "Mil modelos chicos, uno por tienda, poco tráfico cada uno" → **multi-model endpoint**.
- "Tráfico esporádico, pagar solo cuando se usa" → **Serverless Inference**.
- "Puntuar 50 millones de filas una vez al mes" → **Batch Transform**.
- "Reducir costo de entrenamiento tolerando interrupciones" → **Spot + checkpoints**.
- "Entradas en producción distintas de las del entrenamiento" → **Model Monitor** (calidad de datos).
:::

## Ejercicios

:::ejercicio quiz
Un modelo procesa videos de hasta 800 MB y tarda unos 15 minutos por solicitud; las solicitudes llegan pocas veces al día. ¿Qué opción de inferencia usas?
- [ ] Endpoint en tiempo real con autoescalado.
- [x] Asynchronous Inference con escalado a cero.
- [ ] Serverless Inference.
- [ ] Un multi-model endpoint.
```explicacion
Async admite cargas de hasta 1 GB y procesamiento de hasta 1 hora, encola las solicitudes y puede escalar a cero entre usos.
```
:::

:::ejercicio quiz
El entrenamiento semanal en GPU cuesta demasiado; el equipo puede tolerar que demore más. ¿Qué cambio reduce más el costo?
- [ ] Más instancias en paralelo.
- [x] Managed spot training con checkpoints en S3.
- [ ] Modo de entrada File en vez de Fast File.
- [ ] Desactivar SageMaker Debugger.
```explicacion
Spot puede ahorrar hasta 90 %; los checkpoints permiten reanudar si la instancia se interrumpe.
```
:::

:::ejercicio quiz
Una empresa tiene un modelo de demanda por cada una de sus 2.000 tiendas; cada uno recibe pocas solicitudes. ¿Cómo los despliegas al menor costo?
- [ ] 2.000 endpoints en tiempo real.
- [x] Un multi-model endpoint que carga los modelos bajo demanda.
- [ ] Batch Transform cada minuto.
- [ ] Un endpoint por región con todos los modelos unidos en uno solo.
```explicacion
El multi-model endpoint comparte instancias y contenedor entre muchos modelos parecidos y los carga desde S3 cuando se piden.
```
:::

:::ejercicio quiz
Después de una campaña, el modelo empezó a fallar y la distribución de una variable de entrada cambió. ¿Qué lo habría detectado automáticamente?
- [ ] SageMaker Debugger.
- [x] SageMaker Model Monitor con un monitor de calidad de datos y una línea base.
- [ ] CloudTrail.
- [ ] Inference Recommender.
```explicacion
Model Monitor compara los datos capturados con la línea base del entrenamiento y reporta violaciones de deriva en CloudWatch.
```
:::

:::ejercicio quiz
Un modelo nuevo debe recibir primero el 10 % del tráfico y revertirse solo si sube la tasa de errores. ¿Qué configuras?
- [ ] Reemplazar el endpoint con una ventana de mantenimiento.
- [x] Un guardrail de despliegue canary con alarmas de CloudWatch para rollback automático.
- [ ] Un shadow variant con el 100 % del tráfico.
- [ ] Batch Transform con el 10 % de los datos.
```explicacion
El despliegue blue/green canary traslada una parte del tráfico, espera y revierte automáticamente si se disparan las alarmas.
```
:::

:::ejercicio quiz
Para entrenar sin fuga de datos hay que unir eventos históricos con el valor que tenían las variables del cliente **en ese momento**. ¿Qué usas?
- [ ] El almacén online de Feature Store.
- [x] Una consulta point-in-time sobre el almacén offline de Feature Store.
- [ ] Data capture del endpoint.
- [ ] Una tabla de DynamoDB con el último valor.
```explicacion
El almacén offline guarda el histórico con marcas de tiempo; la consulta point-in-time toma el valor vigente en cada fecha del evento.
```
:::

:::ejercicio abierto
Diseña el pipeline de MLOps semanal para el modelo de demoras: pasos, condición de calidad, registro y despliegue, y cómo se dispara el reentrenamiento si el modelo se degrada.
```text solucion
SageMaker Pipelines programado con EventBridge (semanal):
1. ProcessingStep: lee de Feature Store offline (point-in-time), divide train/val/test por tiempo, valida calidad.
2. TrainingStep (o TuningStep bayesiano) con Spot y checkpoints.
3. ProcessingStep de evaluación: AUC en test + Clarify (sesgo y explicabilidad).
4. ConditionStep: si AUC >= 0,85 y no empeora más de 1 punto respecto del modelo en producción → RegisterModel en Model Registry como PendingManualApproval; si no, FailStep con aviso por SNS.
5. Al aprobarse (evento de Model Registry), CodePipeline despliega con CloudFormation al endpoint usando canary 10 % con rollback por alarmas de latencia y errores.
Monitoreo: data capture + Model Monitor (calidad de datos diaria y calidad del modelo cuando llegan las demoras reales). Una alarma de CloudWatch sobre las violaciones dispara el pipeline fuera de calendario.
```
:::
