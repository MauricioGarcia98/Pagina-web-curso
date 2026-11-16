# examen: cert-aws
# id: aws-mla
# titulo: AWS Certified Machine Learning Engineer – Associate (MLA-C02)

## Fuga
leccion: cert-aws-mla-sagemaker
dominio: 1
Un modelo da resultados excelentes en validación y malos en producción. El escalador se ajustó con todos los datos antes de dividir. ¿Qué ocurrió?
- [ ] Subajuste por falta de variables de entrada.
- [x] Fuga de datos: la validación influyó en la transformación.
- [ ] Deriva de concepto después del despliegue.
- [ ] Un error de la instancia de entrenamiento.
porque: Ajustar transformaciones con todos los datos filtra información de validación; se divide antes de ajustar.

## Desbalance
leccion: cert-aws-mla-sagemaker
dominio: 1
Solo el 0,5 % de los registros son de la clase positiva. ¿Qué técnica ayuda en el entrenamiento?
- [ ] Quitar la clase positiva y entrenar con el resto.
- [x] SMOTE o pesos por clase.
- [ ] Usar exactitud como métrica objetivo del ajuste.
- [ ] Aumentar la profundidad máxima de los árboles.
porque: Sobremuestrear o ponderar la clase minoritaria evita que el modelo la ignore.

## Point-in-time
leccion: cert-aws-mla-sagemaker
dominio: 1
Para entrenar hay que unir cada evento con el valor que tenían las variables del cliente en esa fecha. ¿Qué usas?
- [ ] El almacén online de Feature Store con el último valor.
- [x] Una consulta point-in-time sobre el almacén offline de Feature Store.
- [ ] Data capture del endpoint de producción.
- [ ] Una tabla de DynamoDB con TTL por fecha.
porque: El almacén offline guarda el histórico; la consulta point-in-time evita usar valores del futuro.

## Etiquetado
leccion: cert-aws-mla-sagemaker
dominio: 1
Hay 200.000 imágenes de paquetes sin etiquetar y se quiere reducir el costo del etiquetado humano. ¿Qué usas?
- [ ] SageMaker Clarify sobre las imágenes sin etiquetas.
- [x] SageMaker Ground Truth con etiquetado automático activo.
- [ ] Amazon Rekognition Custom Labels sin ninguna etiqueta.
- [ ] SageMaker Data Wrangler con una transformación de imagen.
porque: Ground Truth combina etiquetadores humanos con un modelo que etiqueta automáticamente los casos fáciles.

## Algoritmo
leccion: cert-aws-mla-sagemaker
dominio: 2
Hay que detectar lecturas anómalas en sensores, sin etiquetas. ¿Qué algoritmo integrado usas?
- [ ] XGBoost con objetivo binario.
- [x] Random Cut Forest.
- [ ] DeepAR para pronósticos.
- [ ] BlazingText en modo supervisado.
porque: Random Cut Forest es el algoritmo integrado de detección de anomalías no supervisado.

## Spot
leccion: cert-aws-mla-sagemaker
dominio: 2
El entrenamiento en GPU es caro y puede tardar más sin problema. ¿Qué configuras?
- [ ] Más instancias en paralelo con entrenamiento distribuido.
- [x] Managed spot training con checkpoints en S3.
- [ ] Modo de entrada File en lugar de Fast File.
- [ ] Una instancia más grande de la misma familia.
porque: Spot ahorra hasta 90 %; los checkpoints permiten reanudar si se interrumpe.

## Ajuste
leccion: cert-aws-mla-sagemaker
dominio: 2
Con un presupuesto de solo 20 entrenamientos, ¿qué estrategia de ajuste automático es la más eficiente para encontrar buenos hiperparámetros?
- [ ] Grid sobre todas las combinaciones posibles.
- [x] Bayesiana.
- [ ] Aleatoria sin límites de rango.
- [ ] Manual, cambiando un parámetro por vez.
porque: La búsqueda bayesiana usa los resultados previos para elegir la siguiente combinación.

## Debugger
leccion: cert-aws-mla-sagemaker
dominio: 2
Durante el entrenamiento de una red, la pérdida dejó de bajar porque los gradientes se anulan. ¿Qué lo detecta y detiene el job?
- [ ] SageMaker Model Monitor.
- [x] SageMaker Debugger con reglas integradas.
- [ ] Amazon CloudWatch Synthetics.
- [ ] SageMaker Inference Recommender.
porque: Debugger analiza tensores durante el entrenamiento y sus reglas detectan gradientes que desaparecen.

## Registro
leccion: cert-aws-mla-sagemaker
dominio: 2
Solo los modelos aprobados por el líder de ML deben desplegarse a producción. ¿Qué usas?
- [ ] Una carpeta de S3 llamada "aprobados" que el líder de ML revisa a mano cada semana.
- [x] SageMaker Model Registry con estado de aprobación que dispara el despliegue.
- [ ] Etiquetas en cada training job con el nombre del líder que revisó el modelo entrenado.
- [ ] Un notebook programado que despliega siempre el último modelo entrenado del bucket.
porque: Model Registry versiona los modelos con estado de aprobación y eventos para automatizar el despliegue.

## Asíncrono
leccion: cert-aws-mla-sagemaker
dominio: 3
Las solicitudes traen archivos de 600 MB y cada una tarda unos 12 minutos. ¿Qué opción de inferencia usas?
- [ ] Endpoint en tiempo real con autoescalado.
- [x] Asynchronous Inference.
- [ ] Serverless Inference con más memoria.
- [ ] Un multi-model endpoint.
porque: Async admite cargas de hasta 1 GB y procesamiento de hasta una hora, con cola y escalado a cero.

## Serverless
leccion: cert-aws-mla-sagemaker
dominio: 3
Un modelo recibe pocas solicitudes al día en horarios impredecibles y se acepta un arranque en frío. ¿Qué es lo más barato?
- [ ] Un endpoint en tiempo real con una instancia ml.m5.large.
- [x] Serverless Inference.
- [ ] Batch Transform cada hora.
- [ ] Un endpoint en tiempo real con Inferentia.
porque: Serverless escala a cero y se paga por uso.

## Multi-model
leccion: cert-aws-mla-sagemaker
dominio: 3
Hay 1.500 modelos XGBoost, uno por sucursal, cada uno con poco tráfico. ¿Cómo los despliegas al menor costo?
- [ ] Un endpoint en tiempo real por cada sucursal.
- [x] Un multi-model endpoint.
- [ ] Batch Transform cada cinco minutos.
- [ ] Un endpoint serverless por modelo.
porque: El multi-model endpoint comparte instancias y carga cada modelo desde S3 cuando se pide.

## Canary
leccion: cert-aws-mla-sagemaker
dominio: 3
Un modelo nuevo debe recibir primero una parte del tráfico y revertirse solo si fallan las alarmas. ¿Qué configuras?
- [ ] Un despliegue que reemplaza el endpoint completo durante una ventana de mantenimiento nocturna.
- [x] Un guardrail de despliegue blue/green canary con rollback automático.
- [ ] Un shadow variant que recibe y responde al tráfico de todos los usuarios del endpoint.
- [ ] Un endpoint nuevo en paralelo y un cambio manual del registro DNS de la aplicación.
porque: Canary traslada un porcentaje, espera y revierte automáticamente con alarmas de CloudWatch.

## Deriva
leccion: cert-aws-mla-sagemaker
dominio: 4
Tras una campaña, la distribución de una variable de entrada cambió y el modelo empeoró. ¿Qué lo detecta automáticamente?
- [ ] SageMaker Debugger, configurado con reglas integradas durante cada reentrenamiento semanal.
- [x] SageMaker Model Monitor de calidad de datos con una línea base.
- [ ] AWS CloudTrail, con data events habilitados sobre las invocaciones del endpoint.
- [ ] SageMaker Experiments, comparando las métricas del training job con las del anterior.
porque: Model Monitor compara los datos capturados con la línea base y reporta la deriva.

## Aislamiento
leccion: cert-aws-mla-sagemaker
dominio: 4
Seguridad exige que el contenedor de entrenamiento no tenga ninguna salida a internet y lea los datos de S3 por la red privada. ¿Qué configuras?
- [ ] Un security group que permite todo el tráfico de salida.
- [x] Aislamiento de red del job, subredes privadas y un VPC endpoint para S3.
- [ ] Una política de bucket pública restringida por IP.
- [ ] Una NAT gateway en la subred del entrenamiento.
porque: El aislamiento de red bloquea la salida del contenedor y el VPC endpoint da acceso privado a S3.

## @caso entregas: Envíos Cóndor
Envíos Cóndor predice el tiempo de entrega de cada paquete. Tiene 3 años de historial en S3 (400 millones de envíos), datos de clima por hora y el tráfico de cada ruta. Hoy un científico entrena un XGBoost en su notebook una vez por mes y lo copia a un endpoint a mano.

Objetivos:
- Reentrenar cada semana de forma automática y reproducible.
- Servir predicciones en menos de 100 ms desde la app de seguimiento.
- Reducir a la mitad el costo de entrenamiento.
- Saber cuándo el modelo empieza a fallar (por ejemplo, con rutas nuevas).

## Reentrenamiento semanal
leccion: cert-aws-mla-sagemaker
dominio: 3
caso: entregas
¿Qué servicio orquesta el reentrenamiento semanal con evaluación y registro condicional?
- [ ] Un cron en una instancia EC2 que ejecuta el notebook del científico con papermill.
- [x] SageMaker Pipelines programado con EventBridge, con un paso condicional y registro en Model Registry.
- [ ] AWS Glue DataBrew.
- [ ] Amazon QuickSight.
porque: SageMaker Pipelines encadena preparación, entrenamiento, evaluación y registro con condiciones y linaje.

## Bajar el costo de entrenamiento
leccion: cert-aws-mla-sagemaker
dominio: 2
caso: entregas
¿Qué dos medidas reducen el costo del entrenamiento semanal?
- [x] Managed spot training con checkpoints en S3.
- [x] Usar el modo Fast File o Pipe para no esperar la copia completa de los datos.
- [ ] Entrenar siempre con la instancia más grande disponible.
- [ ] Desactivar la evaluación del modelo.
- [ ] Copiar los datos a EBS cada vez.
porque: Spot reduce el precio de las instancias y los modos de streaming acortan el tiempo facturado de carga de datos.

## Rutas nuevas
leccion: cert-aws-mla-sagemaker
dominio: 4
caso: entregas
¿Qué detecta que aparecieron valores de ruta que no estaban en el entrenamiento?
- [ ] Las métricas de CPU del endpoint, configuradas con una alarma de CloudWatch.
- [x] Model Monitor de calidad de datos, comparando el tráfico capturado con la línea base.
- [ ] SageMaker Debugger.
- [ ] AWS Config.
porque: El monitor de calidad de datos detecta valores fuera de la distribución o del dominio de la línea base.

## Latencia de 100 ms
leccion: cert-aws-mla-sagemaker
dominio: 3
caso: entregas
¿Qué opción de inferencia cumple la latencia de la app de seguimiento?
- [ ] Batch Transform cada hora, guardando las predicciones en una tabla que lee la app.
- [x] Un endpoint en tiempo real con autoescalado.
- [ ] Asynchronous Inference.
- [ ] Serverless Inference con arranque en frío.
porque: Los endpoints en tiempo real dan baja latencia constante; async y serverless pueden agregar demoras.

## Formato de datos
leccion: cert-aws-mla-sagemaker
dominio: 1
¿Qué formato conviene para guardar 400 millones de registros tabulares de entrenamiento en S3?
- [ ] CSV sin comprimir, un archivo por envío para que se lean en paralelo.
- [x] Parquet, columnar y comprimido.
- [ ] JSON con un objeto por archivo.
- [ ] Imágenes PNG.
porque: Parquet reduce el tamaño y acelera la lectura de columnas; millones de archivos chicos perjudican.

## Muchos archivos chicos
leccion: cert-aws-mla-sagemaker
dominio: 1
Un entrenamiento lee millones de imágenes chicas de S3 en cada época y la lectura es el cuello de botella. ¿Qué ayuda?
- [ ] Copiar las imágenes una por una a la instancia con un script antes de cada época.
- [x] Amazon FSx for Lustre vinculado al bucket.
- [ ] S3 Glacier Deep Archive.
- [ ] Amazon RDS.
porque: FSx for Lustre ofrece un sistema de archivos de alto rendimiento sobre los datos de S3 para entrenamiento.

## Codificación de alta cardinalidad
leccion: cert-aws-mla-sagemaker
dominio: 1
La variable `ruta_id` tiene 80.000 valores distintos. ¿Qué codificación evita miles de columnas?
- [ ] One-hot encoding, una columna binaria por cada ruta distinta del historial.
- [x] Target encoding o embeddings.
- [ ] Eliminar todas las variables categóricas.
- [ ] Codificación ordinal por orden alfabético.
porque: Target encoding o embeddings representan categorías con muchos valores de forma compacta.

## Valores atípicos
leccion: cert-aws-mla-sagemaker
dominio: 1
Algunos envíos tienen tiempos de entrega de 900 días por errores de carga. ¿Qué haces antes de entrenar?
- [ ] Nada: el modelo aprenderá a ignorarlos con suficientes épocas de entrenamiento.
- [x] Detectarlos y corregirlos o filtrarlos según reglas de negocio.
- [ ] Duplicarlos para que el modelo los aprenda.
- [ ] Convertirlos a texto.
porque: Los valores erróneos distorsionan el entrenamiento, sobre todo con métricas sensibles a errores grandes.

## Transformación logarítmica
leccion: cert-aws-mla-sagemaker
dominio: 1
La variable `peso_kg` tiene una distribución muy sesgada a la derecha. ¿Qué transformación ayuda a un modelo lineal?
- [ ] One-hot encoding del peso en cada valor posible que aparece en los datos.
- [x] Una transformación logarítmica.
- [ ] Multiplicarla por 1.000.
- [ ] Convertirla a texto.
porque: El logaritmo comprime los valores grandes y acerca la distribución a una forma más simétrica.

## Variables de fecha
leccion: cert-aws-mla-sagemaker
dominio: 1
¿Qué variables útiles puedes extraer de la fecha de despacho para predecir demoras?
- [ ] Solo el año, porque los demás componentes de la fecha no aportan información.
- [x] Día de la semana, hora, mes y si es feriado.
- [ ] El timestamp como texto.
- [ ] Ninguna: las fechas no sirven.
porque: Los componentes de la fecha capturan patrones estacionales y de calendario.

## Data Wrangler
leccion: cert-aws-mla-sagemaker
dominio: 1
Un analista quiere explorar los datos, aplicar transformaciones visuales y exportarlas a un pipeline sin escribir código. ¿Qué usa?
- [ ] Amazon QuickSight, con un análisis que exporta las transformaciones a SageMaker.
- [x] SageMaker Data Wrangler (en SageMaker Canvas).
- [ ] AWS CloudTrail.
- [ ] Amazon Lex.
porque: Data Wrangler permite preparar datos visualmente y exportar el flujo a Processing o Pipelines.

## Processing job
leccion: cert-aws-mla-sagemaker
dominio: 1
Hay que ejecutar un script de scikit-learn que transforma 200 GB antes de entrenar, de forma administrada. ¿Qué usas?
- [ ] Un endpoint en tiempo real que procesa los archivos cuando se lo llama.
- [x] Un SageMaker Processing job.
- [ ] Amazon Kendra.
- [ ] Amazon Polly.
porque: Processing ejecuta scripts de preparación y evaluación en infraestructura administrada que se apaga al terminar.

## Sesgo previo
leccion: cert-aws-mla-sagemaker
dominio: 1
Antes de entrenar, hay que comprobar si una región está subrepresentada en los datos. ¿Qué usas?
- [ ] SageMaker Model Monitor sobre el endpoint de producción del modelo anterior.
- [x] SageMaker Clarify (análisis de sesgo previo al entrenamiento).
- [ ] SageMaker Debugger.
- [ ] Amazon Inspector.
porque: Clarify calcula métricas de sesgo en los datos, como el desbalance de clases o grupos.

## Validación de esquema
leccion: cert-aws-mla-sagemaker
dominio: 1
¿Qué dos verificaciones conviene automatizar antes de cada entrenamiento?
- [x] Que el esquema y los tipos de las columnas sean los esperados.
- [x] Que los porcentajes de nulos y los rangos estén dentro de lo normal.
- [ ] Que el bucket tenga versionado desactivado.
- [ ] Que la instancia sea la más grande.
- [ ] Que el modelo anterior se haya borrado.
porque: Validar esquema y calidad evita entrenar con datos rotos que producen modelos malos.

## División temporal
leccion: cert-aws-mla-sagemaker
dominio: 1
¿Cómo separas entrenamiento y prueba para predecir demoras futuras?
- [ ] Al azar, mezclando los tres años, para que ambos conjuntos tengan todo tipo de envíos.
- [x] Por tiempo: entrenar con el pasado y probar con los meses más recientes.
- [ ] Por orden de id del envío.
- [ ] Usando los mismos datos en ambos conjuntos.
porque: En problemas temporales, la separación al azar filtra información futura.

## Linear Learner
leccion: cert-aws-mla-sagemaker
dominio: 2
¿Qué algoritmo integrado de SageMaker sirve para regresión o clasificación lineal a gran escala?
- [ ] K-Means, configurado con el número de clusters igual al número de clases.
- [x] Linear Learner.
- [ ] BlazingText.
- [ ] DeepAR.
porque: Linear Learner entrena modelos lineales de regresión y clasificación de forma distribuida.

## DeepAR
leccion: cert-aws-mla-sagemaker
dominio: 2
Hay que pronosticar la demanda diaria de envíos en 2.000 sucursales, aprovechando patrones comunes entre ellas. ¿Qué algoritmo integrado usas?
- [ ] XGBoost, entrenado con un modelo por sucursal y sin variables temporales.
- [x] DeepAR.
- [ ] K-Means.
- [ ] Object Detection.
porque: DeepAR entrena un modelo global sobre muchas series de tiempo relacionadas.

## Texto
leccion: cert-aws-mla-sagemaker
dominio: 2
Hay que clasificar millones de reclamos de texto en categorías con un algoritmo integrado rápido. ¿Cuál usas?
- [ ] Random Cut Forest, que detecta los reclamos fuera de lo común.
- [x] BlazingText en modo de clasificación de texto.
- [ ] DeepAR.
- [ ] PCA.
porque: BlazingText ofrece clasificación de texto rápida (y Word2Vec).

## Hiperparámetros de XGBoost
leccion: cert-aws-mla-sagemaker
dominio: 2
El XGBoost sobreajusta. ¿Qué dos cambios de hiperparámetros ayudan?
- [x] Reducir `max_depth`.
- [x] Aumentar la regularización (`alpha` o `lambda`) o bajar `subsample`.
- [ ] Aumentar `num_round` sin early stopping.
- [ ] Aumentar `max_depth` a 20.
- [ ] Quitar el conjunto de validación.
porque: Árboles menos profundos, más regularización y submuestreo reducen la varianza.

## Early stopping
leccion: cert-aws-mla-sagemaker
dominio: 2
¿Para qué sirve el early stopping en el entrenamiento?
- [ ] Para detener el entrenamiento cuando la instancia Spot se interrumpe por falta de capacidad.
- [x] Para detener el entrenamiento cuando la métrica de validación deja de mejorar.
- [ ] Para reducir el tamaño del dataset.
- [ ] Para desplegar el modelo antes.
porque: Cortar cuando la validación no mejora evita sobreajuste y ahorra cómputo.

## Script mode
leccion: cert-aws-mla-sagemaker
dominio: 2
El equipo tiene su propio script de PyTorch. ¿Cómo lo entrena en SageMaker sin construir un contenedor?
- [ ] Copiando el script a una instancia EC2 y ejecutándolo con `nohup` en segundo plano.
- [x] Con el estimador de PyTorch en script mode, usando el contenedor prediseñado.
- [ ] Con Amazon Lex.
- [ ] Con Batch Transform.
porque: Los contenedores de frameworks ejecutan tu script con el entorno ya preparado.

## Contenedor propio
leccion: cert-aws-mla-sagemaker
dominio: 2
El modelo necesita librerías de sistema que no están en los contenedores de SageMaker. ¿Qué haces?
- [ ] Instalarlas a mano en cada instancia de entrenamiento cuando el job ya está corriendo.
- [x] Construir una imagen propia (o extender una de SageMaker) y subirla a Amazon ECR.
- [ ] Usar Amazon Polly.
- [ ] Cambiar a Batch Transform.
porque: SageMaker puede entrenar y servir con imágenes personalizadas almacenadas en ECR.

## Paralelismo de datos
leccion: cert-aws-mla-sagemaker
dominio: 2
El modelo cabe en una GPU, pero hay muchísimos datos y el entrenamiento tarda días. ¿Qué estrategia distribuida usas?
- [ ] Paralelismo de modelo, que divide las capas del modelo entre varias GPU.
- [x] Paralelismo de datos (distributed data parallel).
- [ ] Una sola CPU más grande.
- [ ] Reducir los datos al 1 %.
porque: El paralelismo de datos replica el modelo y reparte los lotes entre GPU.

## Experimentos
leccion: cert-aws-mla-sagemaker
dominio: 2
¿Dónde registran y comparan los científicos los parámetros y métricas de sus entrenamientos en SageMaker AI?
- [ ] En un archivo de texto en el bucket de cada proyecto, actualizado a mano.
- [x] En MLflow administrado de SageMaker (o SageMaker Experiments).
- [ ] En AWS Artifact.
- [ ] En Amazon Kendra.
porque: El tracking de experimentos guarda parámetros, métricas y artefactos para comparar ejecuciones.

## JumpStart
leccion: cert-aws-mla-sagemaker
dominio: 2
Hay que ajustar un modelo fundacional abierto con datos propios y desplegarlo en un endpoint de la cuenta. ¿Qué usas?
- [ ] Amazon Comprehend con un clasificador personalizado entrenado con los datos.
- [x] SageMaker JumpStart.
- [ ] AWS Glue.
- [ ] Amazon Translate.
porque: JumpStart ofrece modelos preentrenados y fundacionales listos para ajustar y desplegar.

## Métrica de regresión
leccion: cert-aws-mla-sagemaker
dominio: 2
Para el tiempo de entrega, el negocio quiere una métrica en horas fácil de explicar. ¿Cuál eliges?
- [ ] El AUC, porque resume el rendimiento del modelo en un solo número entre 0 y 1.
- [x] El MAE (error absoluto medio).
- [ ] La matriz de confusión.
- [ ] El F1.
porque: El MAE expresa el error promedio en la misma unidad (horas), fácil de comunicar.

## Model Registry
leccion: cert-aws-mla-sagemaker
dominio: 2
¿Qué información guarda un paquete de modelo en SageMaker Model Registry?
- [ ] Solo el nombre del científico que entrenó el modelo y la fecha.
- [x] La imagen de inferencia, los artefactos, las métricas y el estado de aprobación de cada versión.
- [ ] Los datos de entrenamiento completos.
- [ ] Las credenciales del endpoint.
porque: El registro versiona modelos con su información de inferencia, métricas y estado de aprobación.

## Inference Recommender
leccion: cert-aws-mla-sagemaker
dominio: 3
¿Qué herramienta prueba el modelo en distintos tipos de instancia y recomienda la mejor configuración de costo y latencia?
- [ ] SageMaker Debugger, que analiza el rendimiento durante el entrenamiento.
- [x] SageMaker Inference Recommender.
- [ ] AWS Trusted Advisor.
- [ ] Amazon Inspector.
porque: Inference Recommender ejecuta pruebas de carga y sugiere instancias y configuraciones.

## Inferentia
leccion: cert-aws-mla-sagemaker
dominio: 3
Un modelo de aprendizaje profundo con mucho tráfico tiene un costo de inferencia alto en GPU. ¿Qué evaluar?
- [ ] Instancias de CPU de propósito general más grandes que la GPU actual.
- [x] Instancias con AWS Inferentia (ml.inf2), compilando el modelo con Neuron.
- [ ] Batch Transform cada minuto.
- [ ] Desactivar el autoescalado.
porque: Inferentia está diseñada para inferencia de aprendizaje profundo con menor costo por predicción.

## Escalado del endpoint
leccion: cert-aws-mla-sagemaker
dominio: 3
¿Qué métrica se usa habitualmente en la política de autoescalado de un endpoint en tiempo real?
- [ ] El tamaño del bucket donde se guardan los artefactos del modelo entrenado.
- [x] `SageMakerVariantInvocationsPerInstance`.
- [ ] La cantidad de modelos registrados.
- [ ] El número de jobs de entrenamiento.
porque: El seguimiento de invocaciones por instancia permite agregar o quitar instancias según la carga.

## Shadow variant
leccion: cert-aws-mla-sagemaker
dominio: 3
Quieres probar un modelo nuevo con tráfico real sin que sus respuestas lleguen a los usuarios. ¿Qué usas?
- [ ] Una production variant con el 50 % del tráfico durante una semana completa.
- [x] Una shadow variant (shadow testing).
- [ ] Batch Transform.
- [ ] Un modelo en otra región.
porque: La variante sombra recibe una copia del tráfico y se comparan sus resultados sin afectar a los usuarios.

## Modelos en el borde
leccion: cert-aws-mla-sagemaker
dominio: 3
Un modelo debe correr en los escáneres de los depósitos sin conexión estable. ¿Qué usas para optimizarlo para ese hardware?
- [ ] Un endpoint serverless en la región más cercana a cada depósito.
- [x] SageMaker Neo para compilarlo para el dispositivo.
- [ ] Amazon Kendra.
- [ ] AWS Glue.
porque: Neo optimiza modelos para hardware específico, incluidos dispositivos en el borde.

## Infraestructura como código
leccion: cert-aws-mla-sagemaker
dominio: 3
¿Cómo se crean los endpoints y pipelines de forma repetible en varias cuentas (dev, prod)?
- [ ] Desde la consola de SageMaker, siguiendo un documento con capturas de pantalla.
- [x] Con AWS CloudFormation o AWS CDK desde un pipeline de CI/CD.
- [ ] Con Amazon Lex.
- [ ] Con AWS Artifact.
porque: La infraestructura como código crea recursos idénticos y versionados en cada entorno.

## Disparar por aprobación
leccion: cert-aws-mla-sagemaker
dominio: 3
¿Cómo se inicia el despliegue a producción cuando alguien aprueba una versión en Model Registry?
- [ ] Revisando el registro cada hora con un script que compara los estados de aprobación.
- [x] Con una regla de EventBridge sobre el cambio de estado que inicia CodePipeline.
- [ ] Con Amazon Polly.
- [ ] Con un crawler.
porque: Model Registry emite eventos de cambio de estado que pueden disparar pipelines de despliegue.

## Pasos con caché
leccion: cert-aws-mla-sagemaker
dominio: 3
Al reejecutar el pipeline, el paso de preparación de datos no cambió. ¿Qué evita volver a ejecutarlo?
- [ ] Borrar los resultados de la ejecución anterior para forzar un cálculo nuevo y limpio.
- [x] La caché de pasos de SageMaker Pipelines.
- [ ] Un endpoint serverless.
- [ ] Desactivar el registro.
porque: Con la caché habilitada, los pasos con las mismas entradas reutilizan resultados anteriores.

## Calidad del modelo
leccion: cert-aws-mla-sagemaker
dominio: 4
Las demoras reales llegan una semana después de la predicción. ¿Qué monitor de Model Monitor usa esas etiquetas?
- [ ] El monitor de calidad de datos, que compara las entradas con la línea base.
- [x] El monitor de calidad del modelo, con las etiquetas de ground truth.
- [ ] El monitor de deriva de sesgo.
- [ ] SageMaker Debugger.
porque: El monitor de calidad del modelo calcula métricas cuando se cargan las etiquetas reales.

## Deriva de atribuciones
leccion: cert-aws-mla-sagemaker
dominio: 4
¿Qué detecta la deriva de atribución de features con Clarify en producción?
- [ ] Que la latencia del endpoint aumentó respecto de la semana anterior.
- [x] Que cambió la importancia relativa de las variables en las predicciones.
- [ ] Que el bucket cambió de región.
- [ ] Que el modelo se borró.
porque: Si las variables que más influyen cambian, puede indicar que el modelo ya no se comporta como al entrenar.

## Data capture
leccion: cert-aws-mla-sagemaker
dominio: 4
¿Qué hay que habilitar en el endpoint para que Model Monitor tenga datos que analizar?
- [ ] El registro de CloudTrail de las llamadas al endpoint con los datos de entrada.
- [x] Data capture, que guarda en S3 las solicitudes y respuestas.
- [ ] Un shadow variant.
- [ ] Spot training.
porque: Data capture registra una muestra del tráfico del endpoint para el monitoreo.

## Errores 5xx
leccion: cert-aws-mla-sagemaker
dominio: 4
El endpoint empieza a devolver errores 5xx. ¿Dónde buscas la causa primero?
- [ ] En AWS Artifact, en los informes de disponibilidad de SageMaker.
- [x] En los logs del contenedor en CloudWatch Logs y las métricas de errores del endpoint.
- [ ] En Model Registry.
- [ ] En Ground Truth.
porque: Los logs del contenedor y las métricas `Invocation5XXErrors` muestran fallas del modelo o del servidor.

## Notebooks ociosos
leccion: cert-aws-mla-sagemaker
dominio: 4
La factura muestra instancias de notebooks y endpoints de prueba encendidos sin uso. ¿Qué dos medidas ayudan?
- [x] Configurar el apagado automático por inactividad de los espacios de trabajo.
- [x] Etiquetar recursos y revisar costos con Cost Explorer y AWS Budgets.
- [ ] Usar instancias más grandes para terminar antes.
- [ ] Desactivar CloudWatch.
- [ ] Mover los notebooks a otra región.
porque: El apagado por inactividad evita costos ociosos y las etiquetas con presupuestos dan visibilidad.

## Savings Plans
leccion: cert-aws-mla-sagemaker
dominio: 4
El uso de SageMaker es estable y predecible durante el año. ¿Qué reduce el costo sin cambiar la arquitectura?
- [ ] Instancias Spot para los endpoints en tiempo real de producción.
- [x] SageMaker Savings Plans.
- [ ] Más réplicas en el endpoint.
- [ ] Desactivar el monitoreo.
porque: Los Savings Plans dan descuento a cambio de un compromiso de uso de 1 o 3 años.

## Rol de ejecución
leccion: cert-aws-mla-sagemaker
dominio: 4
¿Qué permisos debe tener el rol de ejecución de un training job?
- [ ] AdministratorAccess, para que no falle si necesita algún servicio adicional.
- [x] Solo leer los datos de entrenamiento, escribir el modelo en su prefijo de S3 y usar KMS y ECR necesarios.
- [ ] Ninguno.
- [ ] Permisos de facturación.
porque: El principio de permisos mínimos limita el rol a lo que el job necesita.

## Cifrado de artefactos
leccion: cert-aws-mla-sagemaker
dominio: 4
Cumplimiento exige que los volúmenes de entrenamiento y los artefactos del modelo se cifren con claves de la empresa. ¿Qué configuras?
- [ ] Un bucket público con una política que impide listar los objetos.
- [x] Claves de KMS administradas por el cliente para el volumen y la salida en S3.
- [ ] Amazon Macie.
- [ ] Un shadow variant.
porque: SageMaker permite indicar claves KMS para los volúmenes y los artefactos de salida.

## Tráfico entre nodos
leccion: cert-aws-mla-sagemaker
dominio: 4
En un entrenamiento distribuido con datos sensibles, ¿qué opción cifra la comunicación entre las instancias?
- [ ] El cifrado del bucket de S3 con SSE-S3, que también cubre el tráfico entre nodos.
- [x] El cifrado del tráfico entre contenedores (inter-container traffic encryption).
- [ ] Amazon Inspector.
- [ ] AWS Artifact.
porque: El cifrado entre contenedores protege los datos que intercambian los nodos durante el entrenamiento.

## Role Manager
leccion: cert-aws-mla-sagemaker
dominio: 4
¿Qué herramienta ayuda a crear roles de SageMaker con permisos mínimos según la persona (científico, ingeniero de MLOps)?
- [ ] AWS Artifact, que contiene plantillas de roles aprobadas por los auditores.
- [x] Amazon SageMaker Role Manager.
- [ ] Amazon Lex.
- [ ] Amazon Kendra.
porque: Role Manager genera roles basados en personas y actividades de ML con permisos mínimos.

## Model Dashboard
leccion: cert-aws-mla-sagemaker
dominio: 4
¿Dónde ves en un solo lugar los modelos desplegados, sus monitores y alertas activas?
- [ ] En la consola de EC2, filtrando las instancias que tienen la etiqueta del modelo.
- [x] En SageMaker Model Dashboard.
- [ ] En Amazon Polly.
- [ ] En AWS Glue.
porque: Model Dashboard centraliza modelos, endpoints, monitores y Model Cards para gobierno.

## Feature Store online
leccion: cert-aws-mla-sagemaker
dominio: 1
El endpoint necesita el promedio de demora de la ruta en las últimas 24 horas, con latencia de milisegundos. ¿De dónde lo lee?
- [ ] Del almacén offline de Feature Store, consultado con Athena en cada predicción.
- [x] Del almacén online de SageMaker Feature Store.
- [ ] De un archivo CSV en S3.
- [ ] De CloudTrail.
porque: El almacén online sirve las variables más recientes con baja latencia para inferencia.

## Imputación
leccion: cert-aws-mla-sagemaker
dominio: 1
La variable `temperatura` tiene 5 % de nulos. ¿Qué imputación evita fuga de datos?
- [ ] La media de todo el dataset, calculada antes de separar entrenamiento y prueba.
- [x] La mediana calculada solo con el conjunto de entrenamiento y aplicada a los demás.
- [ ] Un valor al azar distinto en cada fila.
- [ ] El valor de la etiqueta.
porque: Los parámetros de transformación se calculan con entrenamiento y se reutilizan en validación y producción.

## SMOTE
leccion: cert-aws-mla-sagemaker
dominio: 1
¿Qué hace SMOTE?
- [ ] Elimina al azar filas de la clase mayoritaria hasta igualar la cantidad de la minoritaria.
- [x] Genera ejemplos sintéticos de la clase minoritaria interpolando entre vecinos.
- [ ] Normaliza las variables numéricas.
- [ ] Reduce dimensiones.
porque: SMOTE crea ejemplos sintéticos para balancear clases sin duplicar exactamente.

## Rollback automático
leccion: cert-aws-mla-sagemaker
dominio: 4
Durante un despliegue blue/green, la latencia del modelo nuevo se dispara. ¿Qué hace que SageMaker vuelva solo al modelo anterior?
- [ ] Una persona que revisa el tablero y cambia el endpoint a mano cuando nota el problema.
- [x] Alarmas de CloudWatch configuradas en la política de despliegue, que activan el rollback.
- [ ] Model Registry.
- [ ] Ground Truth.
porque: Las guardas de despliegue revierten el tráfico automáticamente si se disparan las alarmas definidas.

## @caso seguros: Aseguradora Andina
Aseguradora Andina quiere detectar reclamos de seguros de auto con alto riesgo de fraude. Tiene cinco años de reclamos en Amazon S3 (CSV, unos 40 GB), con un 2 % de fraudes confirmados. Los peritos revisan cada día los reclamos marcados por el modelo.

Requisitos:
- puntuar cada reclamo nuevo en menos de un segundo cuando se carga;
- explicar a los peritos por qué un reclamo fue marcado;
- detectar si los datos de producción cambian respecto del entrenamiento;
- que los datos nunca viajen por internet público.

## Puntuar al cargar
leccion: cert-aws-mla-sagemaker
dominio: 3
caso: seguros
¿Cómo se despliega el modelo para puntuar cada reclamo en menos de un segundo?
- [ ] Un batch transform que corre cada noche sobre todos los reclamos del día y escribe los resultados en S3.
- [x] Un endpoint de inferencia en tiempo real de SageMaker AI.
- [ ] Un endpoint asíncrono que deja el resultado en S3 unos minutos después de cada solicitud.
- [ ] Un notebook de SageMaker Studio que un perito ejecuta a mano por cada reclamo que llega.
porque: Para respuestas por solicitud con baja latencia se usa un endpoint de inferencia en tiempo real.

## Clase minoritaria
leccion: cert-aws-mla-sagemaker
dominio: 2
caso: seguros
Con un 2 % de fraudes, ¿qué métrica eliges para evaluar el modelo?
- [ ] La exactitud (accuracy), porque resume en un número el porcentaje total de reclamos bien clasificados.
- [x] El recall y la precisión de la clase fraude (o el AUC-PR).
- [ ] El RMSE.
- [ ] El tiempo de entrenamiento.
porque: Con clases muy desbalanceadas, la exactitud engaña: un modelo que nunca marca fraude tendría 98 %.

## Explicar a los peritos
leccion: cert-aws-mla-sagemaker
dominio: 2
caso: seguros
¿Qué herramienta muestra qué variables pesaron en cada reclamo marcado?
- [ ] SageMaker Model Monitor con la línea base de calidad de datos de la última semana.
- [x] SageMaker Clarify, con explicaciones por predicción (valores de Shapley).
- [ ] Amazon CloudWatch Logs.
- [ ] AWS Glue DataBrew.
porque: Clarify calcula la contribución de cada variable a una predicción individual.

## Datos de producción que cambian
leccion: cert-aws-mla-sagemaker
dominio: 4
caso: seguros
¿Qué se configura para detectar que los datos de producción se alejan de los de entrenamiento?
- [ ] Una alarma de CloudWatch sobre el uso de CPU del endpoint, que sube cuando cambian los datos de entrada.
- [x] Data capture en el endpoint y un monitoreo de calidad de datos de Model Monitor con una línea base del entrenamiento.
- [ ] Un reentrenamiento cada hora sin comparar nada.
- [ ] Un endpoint multimodelo.
porque: Model Monitor compara los datos capturados con una línea base y reporta violaciones.

## Sin internet público
leccion: cert-aws-mla-sagemaker
dominio: 4
caso: seguros
¿Cómo evitas que el tráfico a S3 y a la API de SageMaker salga a internet público?
- [ ] Usando HTTPS, que por sí solo garantiza que el tráfico no pase por internet público en ningún caso.
- [x] Ejecutando en una VPC con endpoints de VPC (PrivateLink y gateway endpoint de S3).
- [ ] Haciendo público el bucket.
- [ ] Desactivando el cifrado.
porque: Los endpoints de VPC mantienen el tráfico dentro de la red de AWS.

## Ingesta en streaming
leccion: cert-aws-mla-sagemaker
dominio: 1
Los eventos de la app llegan continuamente y deben quedar en S3 para entrenar, agrupados en archivos. ¿Qué servicio los entrega sin administrar servidores?
- [ ] AWS Glue Data Catalog, que recibe los eventos y los escribe agrupados en S3.
- [x] Amazon Data Firehose.
- [ ] Amazon Athena.
- [ ] AWS Artifact.
porque: Firehose recibe datos en streaming y los entrega en lotes a destinos como S3.

## Consultar datos en S3
leccion: cert-aws-mla-sagemaker
dominio: 1
Quieres explorar con SQL los CSV de S3 sin cargarlos en una base de datos. ¿Qué usas?
- [ ] Amazon RDS, importando cada archivo en una tabla nueva antes de consultarlo.
- [x] Amazon Athena, con las tablas definidas en el Glue Data Catalog.
- [ ] Amazon Polly.
- [ ] AWS KMS.
porque: Athena consulta datos en S3 con SQL usando el catálogo de Glue.

## ETL administrado
leccion: cert-aws-mla-sagemaker
dominio: 1
¿Qué servicio ejecuta trabajos de ETL con Spark sin administrar clústeres para preparar los datos?
- [ ] Amazon SageMaker Ground Truth, que transforma los datos mientras los etiqueta.
- [x] AWS Glue.
- [ ] Amazon Lex.
- [ ] Amazon Route 53.
porque: Glue ofrece trabajos de ETL serverless con Spark.

## Limpieza visual
leccion: cert-aws-mla-sagemaker
dominio: 1
Un analista quiere limpiar y normalizar datos con transformaciones visuales predefinidas, sin código. ¿Qué servicio usa?
- [ ] Amazon EMR con un clúster de Spark y notebooks de PySpark escritos a mano.
- [x] AWS Glue DataBrew (o Data Wrangler en SageMaker Canvas).
- [ ] AWS CloudTrail.
- [ ] Amazon SNS.
porque: DataBrew y Data Wrangler ofrecen transformaciones visuales para preparar datos.

## Normalización
leccion: cert-aws-mla-sagemaker
dominio: 1
¿Por qué se escalan las variables antes de entrenar k-means o una regresión con regularización?
- [ ] Porque los modelos de árboles lo necesitan siempre para converger correctamente.
- [x] Porque las variables con valores grandes dominan las distancias o la penalización si no se escalan.
- [ ] Para reducir el tamaño del bucket.
- [ ] Para cifrar los datos.
porque: Sin escalar, una variable con rango grande domina el cálculo; los árboles no dependen de la escala.

## One-hot encoding
leccion: cert-aws-mla-sagemaker
dominio: 1
Una columna "color" tiene los valores rojo, verde y azul, sin orden. ¿Cómo la codificas para un modelo lineal?
- [ ] Como 1, 2 y 3 en una sola columna, para que el modelo aprenda que azul es mayor que rojo.
- [x] Con one-hot encoding: una columna binaria por color.
- [ ] Borrando la columna siempre.
- [ ] Con una transformación logarítmica.
porque: Las categorías sin orden se codifican con one-hot para no inventar un orden falso.

## Etiquetado con revisión
leccion: cert-aws-mla-sagemaker
dominio: 1
Necesitas etiquetar 100.000 imágenes con ayuda de personas y reducir el costo con etiquetado automático. ¿Qué servicio usas?
- [ ] Amazon Rekognition Custom Labels, que etiqueta todas las imágenes sin ninguna persona.
- [x] SageMaker Ground Truth, con etiquetado activo automático.
- [ ] AWS Glue.
- [ ] Amazon Athena.
porque: Ground Truth combina etiquetadores humanos con etiquetado automático para reducir costo.

## Aumento de datos
leccion: cert-aws-mla-sagemaker
dominio: 1
Tienes pocas imágenes de una clase rara. ¿Qué técnica amplía el conjunto sin recolectar más?
- [ ] Duplicar los archivos sin cambios hasta igualar la cantidad de la clase mayoritaria.
- [x] Aumento de datos: rotar, recortar o cambiar el brillo de las imágenes existentes.
- [ ] Borrar la clase rara.
- [ ] Bajar la tasa de aprendizaje.
porque: El aumento de datos genera variantes realistas que mejoran la generalización.

## Formato para entrenar
leccion: cert-aws-mla-sagemaker
dominio: 1
Los algoritmos integrados de SageMaker leen mucho más rápido con streaming (Pipe mode). ¿Qué formato conviene?
- [ ] Miles de archivos JSON pequeños, uno por fila, para que se lean en paralelo.
- [x] RecordIO-protobuf (o Parquet según el algoritmo).
- [ ] PDF.
- [ ] Imágenes PNG con las tablas.
porque: Los formatos binarios y columnares se leen en streaming de forma eficiente.

## Datos personales en las variables
leccion: cert-aws-mla-sagemaker
dominio: 1
¿Qué haces con el número de documento de los asegurados antes de entrenar?
- [ ] Usarlo como variable numérica, porque más columnas mejoran siempre el modelo.
- [x] Quitarlo (o reemplazarlo por un identificador seudónimo si hace falta unir tablas).
- [ ] Publicarlo en un bucket abierto.
- [ ] Guardarlo en la descripción del modelo.
porque: Los identificadores personales no aportan al modelo y aumentan el riesgo de privacidad.

## Algoritmo de árboles
leccion: cert-aws-mla-sagemaker
dominio: 2
Para datos tabulares con relaciones no lineales, ¿qué algoritmo integrado de SageMaker suele dar un buen punto de partida?
- [ ] DeepAR, que está pensado para cualquier tipo de dato tabular.
- [x] XGBoost.
- [ ] BlazingText.
- [ ] Object2Vec para imágenes.
porque: XGBoost es un algoritmo de árboles con gradiente muy eficaz en datos tabulares.

## Anomalías sin etiquetas
leccion: cert-aws-mla-sagemaker
dominio: 2
No hay etiquetas de fraude y quieres encontrar reclamos inusuales. ¿Qué algoritmo integrado sirve?
- [ ] Linear Learner, que necesita una etiqueta de fraude para cada reclamo.
- [x] Random Cut Forest.
- [ ] Seq2Seq.
- [ ] Image Classification.
porque: Random Cut Forest detecta anomalías sin etiquetas.

## Ajuste automático
leccion: cert-aws-mla-sagemaker
dominio: 2
¿Qué estrategia de ajuste automático de SageMaker usa los resultados previos para elegir las siguientes combinaciones?
- [ ] Grid search, que prueba todas las combinaciones en orden sin mirar los resultados.
- [x] Bayesiana.
- [ ] Ninguna: el ajuste siempre es aleatorio.
- [ ] Alfabética.
porque: La búsqueda bayesiana aprende de las pruebas anteriores para elegir las siguientes.

## Regularización
leccion: cert-aws-mla-sagemaker
dominio: 2
El modelo sobreajusta. ¿Qué ajuste pruebas?
- [ ] Aumentar la profundidad de los árboles y quitar la regularización para que aprenda más detalles.
- [x] Aumentar la regularización (por ejemplo, `alpha` o `lambda` en XGBoost) o reducir la complejidad.
- [ ] Usar menos datos de validación.
- [ ] Entrenar más épocas.
porque: La regularización y un modelo más simple reducen el sobreajuste.

## Matriz de confusión
leccion: cert-aws-mla-sagemaker
dominio: 2
De 100 fraudes reales, el modelo detectó 70. ¿Cuál es el recall?
- [ ] 30 %.
- [x] 70 %.
- [ ] 100 %.
- [ ] No se puede calcular sin la precisión.
porque: Recall = verdaderos positivos / positivos reales = 70 / 100.

## Modelos preentrenados
leccion: cert-aws-mla-sagemaker
dominio: 2
Quieres partir de un modelo preentrenado de visión y ajustarlo con tus imágenes. ¿Dónde lo buscas en SageMaker?
- [ ] En Amazon ECR, que publica modelos de visión listos para entrenar.
- [x] En SageMaker JumpStart.
- [ ] En AWS Glue.
- [ ] En Amazon Athena.
porque: JumpStart ofrece modelos preentrenados que se ajustan y despliegan con pocos pasos.

## Entrenamiento distribuido
leccion: cert-aws-mla-sagemaker
dominio: 2
El modelo es tan grande que no entra en la memoria de una GPU. ¿Qué técnica necesitas?
- [ ] Paralelismo de datos, que copia el modelo completo en cada GPU.
- [x] Paralelismo de modelo, que reparte el modelo entre varias GPU.
- [ ] Inferencia por lotes.
- [ ] Un endpoint multimodelo.
porque: Si el modelo no entra en una GPU, se reparte con paralelismo de modelo.

## Reducir el modelo
leccion: cert-aws-mla-sagemaker
dominio: 2
¿Qué técnica reduce el tamaño y la latencia de un modelo con poca pérdida de precisión?
- [ ] Aumentar la cantidad de capas y parámetros para que el modelo responda más rápido.
- [x] Cuantización o poda.
- [ ] Desactivar el cifrado.
- [ ] Usar más datos de validación.
porque: La cuantización y la poda reducen el tamaño y aceleran la inferencia.

## Pipelines de SageMaker
leccion: cert-aws-mla-sagemaker
dominio: 3
¿Qué servicio define un flujo de procesamiento, entrenamiento, evaluación y registro como pasos encadenados?
- [ ] AWS Config, que encadena los pasos según las reglas de configuración.
- [x] SageMaker Pipelines.
- [ ] Amazon Macie.
- [ ] Amazon Polly.
porque: SageMaker Pipelines orquesta flujos de ML con pasos y condiciones.

## Paso condicional
leccion: cert-aws-mla-sagemaker
dominio: 3
¿Cómo evitas registrar un modelo cuya métrica no alcanza el umbral dentro del pipeline?
- [ ] Registrando siempre el modelo y borrándolo a mano si después resulta ser peor que el actual.
- [x] Con un paso de condición que solo ejecuta el registro si la métrica supera el umbral.
- [ ] Con un endpoint asíncrono.
- [ ] Con un bucket público.
porque: El ConditionStep ramifica el pipeline según el resultado de la evaluación.

## Endpoints serverless
leccion: cert-aws-mla-sagemaker
dominio: 3
Un modelo recibe pocas solicitudes irregulares y puede tolerar arranques en frío. ¿Qué opción de inferencia es más barata?
- [ ] Un endpoint en tiempo real con instancias grandes encendidas todo el día.
- [x] Serverless Inference.
- [ ] Un clúster de entrenamiento permanente.
- [ ] Un batch transform cada minuto.
porque: Serverless Inference escala a cero y cobra por uso, aceptando arranques en frío.

## Cargas grandes asíncronas
leccion: cert-aws-mla-sagemaker
dominio: 3
Cada solicitud trae un archivo de 500 MB y el procesamiento tarda varios minutos. ¿Qué opción de inferencia usas?
- [ ] Un endpoint en tiempo real, que acepta cargas de cualquier tamaño con cualquier tiempo de espera.
- [x] Asynchronous Inference, con la entrada y la salida en S3.
- [ ] Serverless Inference.
- [ ] Una función Lambda de un segundo.
porque: La inferencia asíncrona admite cargas grandes y procesamientos largos, y puede escalar a cero.

## Despliegue gradual
leccion: cert-aws-mla-sagemaker
dominio: 3
¿Qué opción de despliegue de SageMaker mueve el tráfico al modelo nuevo por partes y vuelve atrás si una alarma se dispara?
- [ ] Borrar el endpoint actual y crear uno nuevo con el modelo nuevo en un solo paso.
- [x] Un despliegue blue/green con traffic shifting (canary o lineal) y alarmas de CloudWatch para el rollback automático.
- [ ] Un batch transform.
- [ ] Un endpoint multimodelo.
porque: Las guardrails de despliegue de SageMaker cambian el tráfico gradualmente y revierten ante alarmas.

## Contenedores en ECR
leccion: cert-aws-mla-sagemaker
dominio: 3
¿Dónde se guarda la imagen de un contenedor propio de inferencia para SageMaker?
- [ ] En Amazon S3 Glacier, como archivo comprimido.
- [x] En Amazon ECR.
- [ ] En AWS Artifact.
- [ ] En Amazon Athena.
porque: SageMaker toma las imágenes de contenedores desde ECR.

## Orquestar con eventos
leccion: cert-aws-mla-sagemaker
dominio: 3
Cuando llega un archivo nuevo a S3, debe arrancar el pipeline de reentrenamiento. ¿Qué lo dispara?
- [ ] Un ingeniero que revisa el bucket cada mañana y lanza el pipeline a mano.
- [x] Una regla de Amazon EventBridge que inicia la ejecución del pipeline.
- [ ] Amazon Polly.
- [ ] AWS Artifact.
porque: EventBridge reacciona a eventos (como un objeto nuevo en S3) e inicia la ejecución de SageMaker Pipelines.

## CI/CD para ML
leccion: cert-aws-mla-sagemaker
dominio: 3
¿Qué servicios de AWS se combinan para probar y desplegar automáticamente el código del pipeline al hacer un commit?
- [ ] Amazon Macie y Amazon Polly, que revisan y despliegan el código.
- [x] AWS CodePipeline y AWS CodeBuild (o un sistema de CI como GitHub Actions).
- [ ] AWS Artifact y AWS Config.
- [ ] Amazon Lex y Amazon Kendra.
porque: CodePipeline orquesta las etapas y CodeBuild ejecuta las pruebas y la construcción.

## Calidad del modelo con etiquetas
leccion: cert-aws-mla-sagemaker
dominio: 4
¿Qué hace falta para que Model Monitor mida la calidad del modelo (por ejemplo, la precisión) en producción?
- [ ] Nada: Model Monitor calcula la precisión sin conocer los resultados reales de cada caso.
- [x] Cargar las etiquetas reales (ground truth) y unirlas con las predicciones capturadas.
- [ ] Desactivar data capture.
- [ ] Usar un endpoint serverless.
porque: El monitoreo de calidad del modelo compara las predicciones con las etiquetas reales.

## Sesgo en producción
leccion: cert-aws-mla-sagemaker
dominio: 4
¿Qué tipo de monitor detecta que el modelo empieza a tratar distinto a un grupo en producción?
- [ ] El monitor de calidad de datos, que solo revisa tipos, nulos y rangos de las variables.
- [x] El monitor de deriva de sesgo (bias drift) con SageMaker Clarify.
- [ ] Una alarma de CPU.
- [ ] AWS Artifact.
porque: El monitoreo de deriva de sesgo controla métricas de equidad a lo largo del tiempo.

## Métricas del endpoint
leccion: cert-aws-mla-sagemaker
dominio: 4
¿Dónde ves la latencia del modelo y la cantidad de invocaciones de un endpoint?
- [ ] En AWS CloudTrail, que guarda la latencia de cada predicción del modelo.
- [x] En las métricas de Amazon CloudWatch del endpoint (por ejemplo, ModelLatency e Invocations).
- [ ] En AWS Artifact.
- [ ] En Amazon Macie.
porque: SageMaker publica métricas del endpoint en CloudWatch.

## Autoescalado por invocaciones
leccion: cert-aws-mla-sagemaker
dominio: 4
El tráfico del endpoint se triplica en horario laboral. ¿Qué configuras?
- [ ] La cantidad máxima de instancias fija todo el día, para que el pico nunca encuentre el endpoint chico.
- [x] Una política de autoescalado con seguimiento de objetivo sobre las invocaciones por instancia.
- [ ] Un batch transform cada hora.
- [ ] Un bucket más grande.
porque: El autoescalado ajusta las instancias según una métrica objetivo como las invocaciones por instancia.

## Costos por proyecto
leccion: cert-aws-mla-sagemaker
dominio: 4
Finanzas quiere saber cuánto gasta cada equipo en SageMaker. ¿Qué aplicas?
- [ ] Una cuenta de AWS distinta por cada experimento que se ejecute.
- [x] Etiquetas (tags) de asignación de costos en los recursos, analizadas en Cost Explorer.
- [ ] Amazon Polly.
- [ ] Un endpoint multimodelo.
porque: Las etiquetas de asignación de costos permiten agrupar el gasto por equipo o proyecto.

## Claves de cifrado
leccion: cert-aws-mla-sagemaker
dominio: 4
¿Cómo cifras los volúmenes de entrenamiento y los artefactos del modelo con una clave que controla la empresa?
- [ ] Con una contraseña escrita en el nombre del trabajo de entrenamiento.
- [x] Con una clave administrada por el cliente en AWS KMS indicada en el trabajo y en S3.
- [ ] Con Amazon Polly.
- [ ] No se puede cifrar.
porque: SageMaker y S3 admiten claves de KMS administradas por el cliente para cifrar datos y artefactos.

## Permisos mínimos
leccion: cert-aws-mla-sagemaker
dominio: 4
¿Qué permisos debe tener el rol de ejecución de un trabajo de entrenamiento?
- [ ] AdministratorAccess, para que el trabajo nunca falle por falta de permisos en ningún servicio.
- [x] Solo los necesarios: leer los datos de entrada en S3, escribir los artefactos y usar las claves de KMS indicadas.
- [ ] Ninguno.
- [ ] Los del usuario raíz.
porque: El principio de mínimo privilegio limita el impacto de un error o compromiso.
