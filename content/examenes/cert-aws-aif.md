# examen: cert-aws
# id: aws-aif
# titulo: AWS Certified AI Practitioner (AIF-C01)

## Sin ML
leccion: cert-aws-aif-fundamentos-ia
dominio: 1
Una empresa quiere calcular el IVA de cada factura, que es un porcentaje fijo por ley. ¿Conviene ML?
- [ ] Sí, un modelo de regresión entrenado con facturas pasadas.
- [x] No: una regla determinista resuelve el problema exactamente.
- [ ] Sí, un LLM que lea cada factura y calcule el impuesto.
- [ ] Sí, un modelo de clustering que agrupe facturas por monto.
porque: Cuando una regla fija da el resultado exacto, ML agrega costo y error sin beneficio.

## Tipo de aprendizaje
leccion: cert-aws-aif-fundamentos-ia
dominio: 1
Hay que agrupar clientes en segmentos de comportamiento sin etiquetas previas. ¿Qué tipo de aprendizaje es?
- [ ] Supervisado de clasificación con etiquetas por segmento.
- [x] No supervisado (clustering).
- [ ] Aprendizaje por refuerzo con recompensas por compra.
- [ ] Supervisado de regresión sobre el gasto mensual.
porque: Sin etiquetas, agrupar por similitud es clustering, un problema no supervisado.

## Métrica
leccion: cert-aws-aif-fundamentos-ia
dominio: 1
En un modelo que detecta una enfermedad grave, no detectar un caso real es lo más costoso. ¿Qué métrica priorizas?
- [ ] La precisión de la clase positiva.
- [x] El recall de la clase positiva.
- [ ] La exactitud global del modelo.
- [ ] El RMSE de las probabilidades.
porque: El recall mide qué proporción de los casos reales detecta el modelo: pocos falsos negativos.

## Sobreajuste
leccion: cert-aws-aif-fundamentos-ia
dominio: 1
Un modelo tiene 99 % de exactitud en entrenamiento y 70 % en datos nuevos. ¿Qué ocurre?
- [ ] Subajuste: el modelo es demasiado simple para los datos.
- [x] Sobreajuste: memorizó el entrenamiento y no generaliza.
- [ ] Deriva de datos: la producción cambió después del despliegue.
- [ ] Sesgo de muestreo: faltan clases en el conjunto de prueba.
porque: Rendimiento alto en entrenamiento y bajo en datos nuevos es la señal clásica de sobreajuste.

## Temperatura
leccion: cert-aws-aif-fundamentos-ia
dominio: 2
Un asistente que extrae datos de contratos debe dar siempre la misma respuesta para el mismo texto. ¿Cómo configuras la temperatura?
- [ ] Alta, cerca de 1, con un top-p también alto.
- [x] Baja, cerca de 0.
- [ ] No influye en la variabilidad de las respuestas.
- [ ] Media, y se compensa con más tokens de salida.
porque: Una temperatura baja hace la salida más determinista.

## Embeddings
leccion: cert-aws-aif-fundamentos-ia
dominio: 2
¿Qué es un embedding?
- [ ] Un fragmento de texto que el modelo procesa como unidad.
- [x] Un vector numérico que representa el significado de un contenido.
- [ ] Un filtro que bloquea contenido dañino en las respuestas.
- [ ] Un parámetro que limita la longitud de la respuesta.
porque: Los embeddings ubican contenidos parecidos cerca en un espacio vectorial; son la base de la búsqueda semántica.

## RAG
leccion: cert-aws-aif-fundamentos-ia
dominio: 3
Un chatbot debe responder sobre el catálogo de productos, que cambia cada día, con la fuente de cada dato. ¿Qué técnica usas?
- [ ] Fine-tuning diario con el catálogo nuevo.
- [x] RAG con Amazon Bedrock Knowledge Bases.
- [ ] Preentrenamiento continuo con el catálogo.
- [ ] Prompts few-shot con tres productos de ejemplo.
porque: RAG recupera la información vigente en cada consulta y permite citar la fuente sin reentrenar.

## Fine-tuning
leccion: cert-aws-aif-fundamentos-ia
dominio: 3
Después de probar varios prompts, el modelo sigue sin respetar el formato y el tono de las respuestas de soporte de la empresa. Hay 5.000 ejemplos de respuestas buenas. ¿Qué haces?
- [ ] RAG con los 5.000 ejemplos como documentos de la base.
- [x] Fine-tuning con los pares pregunta–respuesta.
- [ ] Subir la temperatura para que el modelo varíe más.
- [ ] Preentrenamiento continuo con manuales técnicos.
porque: El fine-tuning ajusta el comportamiento, el estilo y el formato con ejemplos etiquetados.

## Servicio
leccion: cert-aws-aif-fundamentos-ia
dominio: 3
Un call center necesita transcribir llamadas y luego detectar el sentimiento de cada cliente. ¿Qué servicios combinas?
- [ ] Amazon Polly y Amazon Translate.
- [x] Amazon Transcribe y Amazon Comprehend.
- [ ] Amazon Textract y Amazon Rekognition.
- [ ] Amazon Lex y Amazon Personalize.
porque: Transcribe convierte voz a texto y Comprehend analiza el sentimiento del texto.

## Asistente empresarial
leccion: cert-aws-aif-fundamentos-ia
dominio: 3
Los empleados quieren un asistente que responda con los documentos de SharePoint y Confluence de la empresa, sin desarrollar una aplicación. ¿Qué usas?
- [ ] Amazon SageMaker JumpStart con un modelo ajustado.
- [x] Amazon Q Business con conectores a esas fuentes.
- [ ] Amazon Lex con intenciones para cada documento.
- [ ] Amazon Kendra con un índice y una interfaz propia.
porque: Q Business es un asistente generativo listo para usar sobre los datos de la empresa, con conectores y permisos.

## Sin código
leccion: cert-aws-aif-fundamentos-ia
dominio: 1
Un analista de negocio sin conocimientos de programación quiere crear un modelo de predicción de bajas de clientes. ¿Qué usa?
- [ ] SageMaker Studio con notebooks de Python.
- [x] Amazon SageMaker Canvas.
- [ ] Amazon Bedrock Agents con action groups.
- [ ] AWS Glue DataBrew con recetas.
porque: Canvas permite preparar datos, entrenar y predecir con una interfaz visual sin código.

## Sesgo
leccion: cert-aws-aif-fundamentos-ia
dominio: 4
Un banco debe demostrar que su modelo de créditos no perjudica a un grupo de edad y explicar qué variables pesan en cada decisión. ¿Qué usa?
- [ ] Amazon Macie sobre los datos de entrenamiento.
- [x] Amazon SageMaker Clarify.
- [ ] Amazon Augmented AI con revisores humanos.
- [ ] AWS Audit Manager con un marco de controles.
porque: Clarify mide sesgo antes y después de entrenar y explica las predicciones con valores SHAP.

## Guardrails
leccion: cert-aws-aif-fundamentos-ia
dominio: 4
Un chatbot en Bedrock no debe dar consejos de inversión y debe ocultar números de tarjeta en las respuestas. ¿Qué configuras?
- [ ] Una temperatura de 0 y un prompt de sistema más largo.
- [x] Guardrails con un tema denegado y filtro de PII.
- [ ] Amazon Comprehend antes de cada respuesta del modelo.
- [ ] Un fine-tuning con ejemplos de respuestas seguras.
porque: Guardrails permite denegar temas y bloquear o enmascarar PII en entradas y salidas.

## Responsabilidad compartida
leccion: cert-aws-aif-fundamentos-ia
dominio: 5
En una aplicación construida con Amazon Bedrock, ¿qué es responsabilidad del cliente?
- [ ] La seguridad física de los centros de datos donde corren los modelos.
- [x] Los permisos IAM, los datos que envía y la configuración de la aplicación.
- [ ] El parcheo del hardware y del hipervisor de las instancias de inferencia.
- [ ] El entrenamiento base de los modelos fundacionales del catálogo.
porque: AWS protege la infraestructura; el cliente protege sus datos, accesos y configuraciones.

## Cumplimiento
leccion: cert-aws-aif-fundamentos-ia
dominio: 5
Un auditor pide los informes de cumplimiento ISO y SOC de AWS. ¿Dónde se obtienen?
- [ ] En AWS CloudTrail, filtrando eventos de cumplimiento.
- [x] En AWS Artifact.
- [ ] En Amazon Inspector, en la sección de hallazgos.
- [ ] En AWS Trusted Advisor, en la categoría de seguridad.
porque: AWS Artifact da acceso a los informes de cumplimiento y acuerdos de AWS.
