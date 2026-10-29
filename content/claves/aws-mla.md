# Tarjetas: AWS MLA-C02

## Millones de archivos chicos para entrenar
dominio: 1
**FSx for Lustre** o modos **Fast File/Pipe**.

## Categoría con miles de valores
dominio: 1
**Target encoding** o embeddings (no one-hot).

## Clases muy desbalanceadas
dominio: 1
**SMOTE**, sobremuestreo o pesos por clase.

## Variables sin fuga del futuro
dominio: 1
**Feature Store offline** con consulta **point-in-time**.

## Variables recientes con baja latencia al predecir
dominio: 1
**Feature Store online**.

## Preparar datos visualmente y exportar a un pipeline
dominio: 1
**Data Wrangler** (en Canvas).

## Sesgo en los datos antes de entrenar
dominio: 1
**Clarify** (pre-training bias).

## Anomalías sin etiquetas
dominio: 2
**Random Cut Forest**.

## Pronóstico de muchas series relacionadas
dominio: 2
**DeepAR**.

## Entrenar más barato tolerando interrupciones
dominio: 2
**Managed spot training** + **checkpoints**.

## Pocas pruebas de hiperparámetros
dominio: 2
Ajuste automático **bayesiano** (Hyperband para cortar temprano).

## Gradientes que desaparecen durante el entrenamiento
dominio: 2
**SageMaker Debugger**.

## Solo modelos aprobados a producción
dominio: 2
**Model Registry** con estado de aprobación.

## Cargas de hasta 1 GB y 1 hora
dominio: 3
**Asynchronous Inference**.

## Tráfico esporádico, pagar por uso
dominio: 3
**Serverless Inference**.

## Miles de modelos chicos con poco tráfico
dominio: 3
**Multi-model endpoint**.

## Puntuar un dataset completo sin endpoint
dominio: 3
**Batch Transform**.

## Desplegar con reversión automática
dominio: 3
Blue/green **canary** o lineal con **alarmas de CloudWatch**.

## Elegir la instancia de inferencia
dominio: 3
**Inference Recommender**; costo bajo en aprendizaje profundo: **Inferentia**.

## Orquestar entrenamiento, evaluación y registro
dominio: 3
**SageMaker Pipelines** (ConditionStep, caché de pasos).

## Entradas distintas a las del entrenamiento
dominio: 4
**Model Monitor** de calidad de datos (requiere **data capture**).

## Calidad con etiquetas que llegan después
dominio: 4
Monitor de **calidad del modelo** con ground truth.

## Costo estable todo el año
dominio: 4
**SageMaker Savings Plans**.

## Contenedor sin salida a internet
dominio: 4
**Aislamiento de red** + subredes privadas + VPC endpoints.

## Roles con permisos mínimos por persona
dominio: 4
**SageMaker Role Manager**.
