# Tarjetas: AWS AIF-C01

## Una regla fija resuelve el problema
dominio: 1
**No usar ML**.

## Clasificación vs. regresión vs. clustering
dominio: 1
Categoría / número continuo / agrupar sin etiquetas.

## Falsos negativos muy costosos
dominio: 1
Priorizar **recall**. Falsos positivos costosos: **precisión**.

## 99 % en entrenamiento, 70 % en datos nuevos
dominio: 1
**Sobreajuste**.

## Analistas crean modelos sin código
dominio: 1
**SageMaker Canvas**.

## Etiquetar datos con personas
dominio: 1
**SageMaker Ground Truth**.

## Respuestas más variadas / más deterministas
dominio: 2
Subir / bajar la **temperatura**.

## Qué es un embedding
dominio: 2
Vector que representa el significado; textos parecidos quedan cerca.

## Mecanismo de los transformers
dominio: 2
**Autoatención** (self-attention).

## Generar imágenes desde ruido
dominio: 2
Modelos de **difusión**.

## Respuesta falsa pero convincente
dominio: 2
**Alucinación**.

## Datos propios que cambian, con citas
dominio: 3
**RAG** con **Bedrock Knowledge Bases**.

## Estilo y formato que el prompt no logra
dominio: 3
**Fine-tuning** con pares de ejemplo.

## Vocabulario de un dominio con mucho texto sin etiquetar
dominio: 3
**Preentrenamiento continuo**.

## Tareas de varios pasos con APIs
dominio: 3
**Bedrock Agents** (o AgentCore).

## Evaluar resúmenes / traducciones
dominio: 3
**ROUGE** / **BLEU**.

## Asistente sobre SharePoint y Confluence sin desarrollar
dominio: 3
**Amazon Q Business**.

## Voz→texto / texto→voz / documentos→campos / sentimiento
dominio: 3
**Transcribe** / **Polly** / **Textract** / **Comprehend**.

## Medir sesgo y explicar predicciones
dominio: 4
**SageMaker Clarify** (SHAP).

## Bloquear temas y ocultar PII en un chatbot
dominio: 4
**Guardrails for Amazon Bedrock**.

## Revisión humana de predicciones dudosas
dominio: 4
**Amazon A2I**.

## Documentar uso previsto y limitaciones de un modelo
dominio: 4
**SageMaker Model Card**.

## ¿Bedrock usa mis prompts para entrenar?
dominio: 5
**No**, ni los comparte con los proveedores.

## Bedrock sin internet
dominio: 5
**PrivateLink** (VPC interface endpoint).

## Informes de cumplimiento de AWS
dominio: 5
**AWS Artifact**. Evidencia continua: **Audit Manager**.
