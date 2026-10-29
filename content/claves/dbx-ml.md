# Tarjetas: Databricks Machine Learning Associate

## Registrar parámetros, métricas y modelo sin código
dominio: 1
`mlflow.autolog()`.

## Encontrar el mejor run por métrica
dominio: 1
`mlflow.search_runs(order_by=["metrics.val_auc DESC"])`.

## Pruebas de ajuste agrupadas bajo un run padre
dominio: 1
`mlflow.start_run(nested=True)`.

## Requisitos para registrar un modelo en Unity Catalog
dominio: 1
Nombre de **tres niveles** y **firma** (con `input_example` recomendado).

## Qué reemplaza a Staging/Production
dominio: 1
**Alias** (`@champion`, `@challenger`): `models:/cat.esq.modelo@champion`.

## Permiso para cargar un modelo sin modificarlo
dominio: 1
`EXECUTE` sobre el modelo.

## Features reutilizables y gobernadas
dominio: 1
**Feature table** en Unity Catalog (Delta con clave primaria).

## Features sin fuga del futuro
dominio: 1
Feature table de **series de tiempo** con búsqueda **point-in-time**.

## Puntuar solo con las claves
dominio: 1
Modelo registrado con `fe.log_model` + `score_batch`.

## Features para tiempo real
dominio: 1
**Online feature store** consultado por Model Serving.

## Qué entrega AutoML
dominio: 1
Runs en MLflow, mejor modelo y **notebooks editables** con el código.

## Separar datos para predecir el futuro
dominio: 2
División **temporal**, no al azar.

## Clases muy desbalanceadas al dividir
dominio: 2
División **estratificada**.

## Imputar con valores extremos
dominio: 2
**Mediana** calculada solo con entrenamiento.

## Categorías sin orden en un modelo lineal
dominio: 2
**One-hot encoding**.

## Pocas pruebas de hiperparámetros
dominio: 2
Búsqueda **bayesiana** (Optuna) con pruning y paralelismo.

## Estimator vs. Transformer en Spark ML
dominio: 3
`Estimator.fit()` → devuelve un `Transformer` que aplica `transform()`.

## Juntar columnas en un vector
dominio: 3
`VectorAssembler`.

## Código de pandas que no entra en memoria
dominio: 3
**pandas API on Spark** (`pyspark.pandas`).

## Un modelo por grupo en paralelo
dominio: 3
`groupBy(...).applyInPandas(...)`.

## Métrica con 3 % de positivos
dominio: 3
**PR-AUC** o F1 de la clase minoritaria, no exactitud.

## Errores grandes muy costosos
dominio: 3
**RMSE**.

## Explicar cada predicción
dominio: 3
Valores **SHAP**.

## Puntuar millones cada noche
dominio: 4
Job con `mlflow.pyfunc.spark_udf` cargando el modelo por alias.

## Probabilidad en menos de 100 ms
dominio: 4
**Model Serving** (endpoint en tiempo real).

## Probar un challenger con el 10 % del tráfico
dominio: 4
Endpoint con **dos modelos servidos** y reparto 90/10.
