# Tarjetas: Google Cloud Professional ML Engineer

## OCR, traducción o transcripción sin entrenar
dominio: 1
**APIs preentrenadas** (Document AI, Translation, Speech-to-Text).

## Datos en BigQuery y equipo con SQL
dominio: 1
**BigQuery ML**.

## Imágenes etiquetadas propias, poca experiencia
dominio: 1
**AutoML**.

## Modelos abiertos o de terceros
dominio: 1
**Model Garden**.

## Construir y desplegar agentes
dominio: 1
**ADK** + **Agent Engine**.

## Mismas features en entrenamiento y servicio
dominio: 2
**Feature Store** (sobre BigQuery, con almacén online).

## Comparar ejecuciones
dominio: 2
**Experiments** + TensorBoard.

## Linaje de artefactos
dominio: 2
**ML Metadata**.

## Transformaciones a escala reutilizadas al servir
dominio: 2
**TensorFlow Transform** sobre Dataflow.

## Librerías de sistema o CUDA específica
dominio: 3
**Contenedor personalizado** en Artifact Registry.

## Varias GPU en una máquina / muchos nodos
dominio: 3
`MirroredStrategy` / **Reduction Server** para acelerar all-reduce.

## Modelos grandes de JAX/TensorFlow
dominio: 3
**TPU**.

## Ajuste de hiperparámetros eficiente
dominio: 3
Bayesiano (Vizier) con **poco paralelismo**; reportar la métrica con `hypertune`.

## Explicar cada predicción
dominio: 3
**Explainable AI** (Shapley muestreado, gradientes integrados, XRAI).

## Formato fijo de salida de Gemini
dominio: 3
**Ajuste supervisado** con pares JSONL.

## Puntuar millones sin latencia
dominio: 4
**Batch prediction** (BigQuery o Cloud Storage).

## Probar con el 10 % del tráfico
dominio: 4
**División de tráfico** en el endpoint.

## Sin internet
dominio: 4
**Endpoint privado** (Private Service Connect).

## LLM abierto con alto rendimiento
dominio: 4
Contenedor **vLLM**.

## Pasos reproducibles con caché y linaje
dominio: 5
**Pipelines** (Kubeflow v2 o TFX).

## Desplegar solo si supera un umbral
dominio: 5
`dsl.If` sobre la métrica (TFX: **Evaluator** con blessing).

## CI que compila y lanza el pipeline
dominio: 5
**Cloud Build** disparado por el repositorio.

## Producción difiere del entrenamiento / cambia con el tiempo
dominio: 6
**Training-serving skew** / **deriva** en Model Monitoring.

## Inyección de prompts y fuga de datos
dominio: 6
**Model Armor**.

## Comparar dos versiones de un prompt
dominio: 6
Evaluación **por pares** del servicio de evaluación de IA generativa.
