# examen: cert-aws
# id: aws-mla
# titulo: AWS Certified Machine Learning Engineer – Associate (MLA-C02)

## Fuga
leccion: cert-aws-mla-sagemaker
Un modelo da resultados excelentes en validación y malos en producción. El escalador se ajustó con todos los datos antes de dividir. ¿Qué ocurrió?
- [ ] Subajuste por falta de variables de entrada.
- [x] Fuga de datos: la validación influyó en la transformación.
- [ ] Deriva de concepto después del despliegue.
- [ ] Un error de la instancia de entrenamiento.
porque: Ajustar transformaciones con todos los datos filtra información de validación; se divide antes de ajustar.

## Desbalance
leccion: cert-aws-mla-sagemaker
Solo el 0,5 % de los registros son de la clase positiva. ¿Qué técnica ayuda en el entrenamiento?
- [ ] Quitar la clase positiva y entrenar con el resto.
- [x] SMOTE o pesos por clase.
- [ ] Usar exactitud como métrica objetivo del ajuste.
- [ ] Aumentar la profundidad máxima de los árboles.
porque: Sobremuestrear o ponderar la clase minoritaria evita que el modelo la ignore.

## Point-in-time
leccion: cert-aws-mla-sagemaker
Para entrenar hay que unir cada evento con el valor que tenían las variables del cliente en esa fecha. ¿Qué usas?
- [ ] El almacén online de Feature Store con el último valor.
- [x] Una consulta point-in-time sobre el almacén offline de Feature Store.
- [ ] Data capture del endpoint de producción.
- [ ] Una tabla de DynamoDB con TTL por fecha.
porque: El almacén offline guarda el histórico; la consulta point-in-time evita usar valores del futuro.

## Etiquetado
leccion: cert-aws-mla-sagemaker
Hay 200.000 imágenes de paquetes sin etiquetar y se quiere reducir el costo del etiquetado humano. ¿Qué usas?
- [ ] SageMaker Clarify sobre las imágenes sin etiquetas.
- [x] SageMaker Ground Truth con etiquetado automático activo.
- [ ] Amazon Rekognition Custom Labels sin ninguna etiqueta.
- [ ] SageMaker Data Wrangler con una transformación de imagen.
porque: Ground Truth combina etiquetadores humanos con un modelo que etiqueta automáticamente los casos fáciles.

## Algoritmo
leccion: cert-aws-mla-sagemaker
Hay que detectar lecturas anómalas en sensores, sin etiquetas. ¿Qué algoritmo integrado usas?
- [ ] XGBoost con objetivo binario.
- [x] Random Cut Forest.
- [ ] DeepAR para pronósticos.
- [ ] BlazingText en modo supervisado.
porque: Random Cut Forest es el algoritmo integrado de detección de anomalías no supervisado.

## Spot
leccion: cert-aws-mla-sagemaker
El entrenamiento en GPU es caro y puede tardar más sin problema. ¿Qué configuras?
- [ ] Más instancias en paralelo con entrenamiento distribuido.
- [x] Managed spot training con checkpoints en S3.
- [ ] Modo de entrada File en lugar de Fast File.
- [ ] Una instancia más grande de la misma familia.
porque: Spot ahorra hasta 90 %; los checkpoints permiten reanudar si se interrumpe.

## Ajuste
leccion: cert-aws-mla-sagemaker
Con un presupuesto de solo 20 entrenamientos, ¿qué estrategia de ajuste automático es la más eficiente para encontrar buenos hiperparámetros?
- [ ] Grid sobre todas las combinaciones posibles.
- [x] Bayesiana.
- [ ] Aleatoria sin límites de rango.
- [ ] Manual, cambiando un parámetro por vez.
porque: La búsqueda bayesiana usa los resultados previos para elegir la siguiente combinación.

## Debugger
leccion: cert-aws-mla-sagemaker
Durante el entrenamiento de una red, la pérdida dejó de bajar porque los gradientes se anulan. ¿Qué lo detecta y detiene el job?
- [ ] SageMaker Model Monitor.
- [x] SageMaker Debugger con reglas integradas.
- [ ] Amazon CloudWatch Synthetics.
- [ ] SageMaker Inference Recommender.
porque: Debugger analiza tensores durante el entrenamiento y sus reglas detectan gradientes que desaparecen.

## Registro
leccion: cert-aws-mla-sagemaker
Solo los modelos aprobados por el líder de ML deben desplegarse a producción. ¿Qué usas?
- [ ] Una carpeta de S3 llamada "aprobados" que el líder de ML revisa a mano cada semana.
- [x] SageMaker Model Registry con estado de aprobación que dispara el despliegue.
- [ ] Etiquetas en cada training job con el nombre del líder que revisó el modelo entrenado.
- [ ] Un notebook programado que despliega siempre el último modelo entrenado del bucket.
porque: Model Registry versiona los modelos con estado de aprobación y eventos para automatizar el despliegue.

## Asíncrono
leccion: cert-aws-mla-sagemaker
Las solicitudes traen archivos de 600 MB y cada una tarda unos 12 minutos. ¿Qué opción de inferencia usas?
- [ ] Endpoint en tiempo real con autoescalado.
- [x] Asynchronous Inference.
- [ ] Serverless Inference con más memoria.
- [ ] Un multi-model endpoint.
porque: Async admite cargas de hasta 1 GB y procesamiento de hasta una hora, con cola y escalado a cero.

## Serverless
leccion: cert-aws-mla-sagemaker
Un modelo recibe pocas solicitudes al día en horarios impredecibles y se acepta un arranque en frío. ¿Qué es lo más barato?
- [ ] Un endpoint en tiempo real con una instancia ml.m5.large.
- [x] Serverless Inference.
- [ ] Batch Transform cada hora.
- [ ] Un endpoint en tiempo real con Inferentia.
porque: Serverless escala a cero y se paga por uso.

## Multi-model
leccion: cert-aws-mla-sagemaker
Hay 1.500 modelos XGBoost, uno por sucursal, cada uno con poco tráfico. ¿Cómo los despliegas al menor costo?
- [ ] Un endpoint en tiempo real por cada sucursal.
- [x] Un multi-model endpoint.
- [ ] Batch Transform cada cinco minutos.
- [ ] Un endpoint serverless por modelo.
porque: El multi-model endpoint comparte instancias y carga cada modelo desde S3 cuando se pide.

## Canary
leccion: cert-aws-mla-sagemaker
Un modelo nuevo debe recibir primero una parte del tráfico y revertirse solo si fallan las alarmas. ¿Qué configuras?
- [ ] Un despliegue que reemplaza el endpoint completo durante una ventana de mantenimiento nocturna.
- [x] Un guardrail de despliegue blue/green canary con rollback automático.
- [ ] Un shadow variant que recibe y responde al tráfico de todos los usuarios del endpoint.
- [ ] Un endpoint nuevo en paralelo y un cambio manual del registro DNS de la aplicación.
porque: Canary traslada un porcentaje, espera y revierte automáticamente con alarmas de CloudWatch.

## Deriva
leccion: cert-aws-mla-sagemaker
Tras una campaña, la distribución de una variable de entrada cambió y el modelo empeoró. ¿Qué lo detecta automáticamente?
- [ ] SageMaker Debugger, configurado con reglas integradas durante cada reentrenamiento semanal.
- [x] SageMaker Model Monitor de calidad de datos con una línea base.
- [ ] AWS CloudTrail, con data events habilitados sobre las invocaciones del endpoint.
- [ ] SageMaker Experiments, comparando las métricas del training job con las del anterior.
porque: Model Monitor compara los datos capturados con la línea base y reporta la deriva.

## Aislamiento
leccion: cert-aws-mla-sagemaker
Seguridad exige que el contenedor de entrenamiento no tenga ninguna salida a internet y lea los datos de S3 por la red privada. ¿Qué configuras?
- [ ] Un security group que permite todo el tráfico de salida.
- [x] Aislamiento de red del job, subredes privadas y un VPC endpoint para S3.
- [ ] Una política de bucket pública restringida por IP.
- [ ] Una NAT gateway en la subred del entrenamiento.
porque: El aislamiento de red bloquea la salida del contenedor y el VPC endpoint da acceso privado a S3.
