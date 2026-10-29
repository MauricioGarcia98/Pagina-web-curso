---
titulo: Machine Learning en Databricks - AutoML, features, MLflow y despliegue
nivel: Avanzado
duracion: 55
resumen: El ciclo de vida de un modelo de ML clásico en Databricks para el Machine Learning Associate - runtime ML, exploración, feature engineering con tablas de features en Unity Catalog, AutoML, entrenamiento con scikit-learn y Spark ML, ajuste de hiperparámetros, seguimiento con MLflow, registro en Unity Catalog con alias, despliegue batch, streaming y en tiempo real, y monitoreo.
objetivos: Registrar experimentos con MLflow (parámetros, métricas, modelos y firmas) y compararlos | Crear tablas de features en Unity Catalog y armar un conjunto de entrenamiento con FeatureLookup | Usar AutoML como punto de partida y explicar qué genera | Registrar modelos en Unity Catalog y promoverlos con alias | Elegir entre inferencia batch, streaming y Model Serving
prerrequisitos: cert-databricks-genai-despliegue-evaluacion | pyspark-agregaciones
autoevaluacion: ¿Sabes qué registra mlflow.autolog? | ¿Sabes para qué sirve la firma de un modelo? | ¿Sabes cómo evitar fugas de información al unir features por fecha? | ¿Sabes cómo cambiar el modelo en producción sin cambiar el código que lo usa? | ¿Sabes cuándo conviene Model Serving y cuándo inferencia batch?
---

:::escenario
Rápido quiere predecir qué clientes van a dejar de pedir en los próximos 30 días para ofrecerles un cupón. El equipo de datos tiene las tablas de pedidos y sesiones en Unity Catalog. El camino: armar features por cliente, entrenar y comparar modelos, registrar el mejor, calcular la predicción para todos los clientes cada noche y, para la app, servir la predicción en tiempo real. Es exactamente el temario del **Machine Learning Associate**.
:::

## El entorno: Databricks Runtime ML

El **Databricks Runtime ML** trae preinstaladas las bibliotecas de ML (scikit-learn, XGBoost, LightGBM, PyTorch, TensorFlow, MLflow, Optuna) y se usa en cómputo clásico o en serverless con el entorno de ML. Para entrenar con GPU o en forma distribuida se usa cómputo clásico en modo **Dedicated**.

## Exploración y preparación

- **Explorar**: `display(df)` y `dbutils.data.summarize(df)` muestran estadísticas y distribuciones; en SQL, los perfiles de columnas del Catalog Explorer.
- **Separar** entrenamiento, validación y prueba **antes** de transformar, para no filtrar información del conjunto de prueba al ajuste. En datos con tiempo (como el churn), separar **por fecha**: entrenar con el pasado y probar con el futuro.
- **Valores faltantes**: imputar (media, mediana, moda) con los parámetros calculados **solo** sobre entrenamiento, y agregar una columna indicadora si la ausencia es informativa.
- **Categóricas**: *one-hot encoding* para pocas categorías; *target encoding* o embeddings para muchas.
- **Desbalance** (pocos clientes que se van): métricas adecuadas (AUC-PR, F1, *recall*), pesos por clase o muestreo.

## Features en Unity Catalog

Una **tabla de features** es una tabla Delta de Unity Catalog con una **clave primaria** (y opcionalmente una clave de tiempo) que guarda features reutilizables. Cualquier tabla de Unity Catalog con clave primaria puede usarse como tabla de features.

```python norun
from databricks.feature_engineering import FeatureEngineeringClient, FeatureLookup

fe = FeatureEngineeringClient()

fe.create_table(
    name="prod.ml.features_cliente",
    primary_keys=["cliente_id", "fecha"],
    timeseries_column="fecha",                     # clave de tiempo: habilita uniones "a esa fecha"
    df=features_df,
    description="Pedidos, gasto y recencia por cliente y día",
)

conjunto = fe.create_training_set(
    df=etiquetas_df,                               # cliente_id, fecha_corte, se_fue (la etiqueta)
    feature_lookups=[FeatureLookup(
        table_name="prod.ml.features_cliente",
        lookup_key="cliente_id",
        timestamp_lookup_key="fecha_corte",        # trae el valor vigente a esa fecha, no uno futuro
    )],
    label="se_fue",
)
entrenamiento = conjunto.load_df()
```

- **Uniones a un momento dado** (*point-in-time*): con la clave de tiempo, cada fila de entrenamiento recibe las features **tal como eran en su fecha de corte**. Evita la **fuga de información del futuro**, uno de los errores más graves en ML.
- Al registrar el modelo con `fe.log_model`, el modelo "recuerda" de qué tablas sacar las features, y en la inferencia batch solo hace falta pasar las claves (`fe.score_batch`).
- Para inferencia en tiempo real, las features se publican en una **tienda en línea** (*online store*) de baja latencia.

## AutoML

**AutoML** recibe una tabla y una columna objetivo, prueba varios algoritmos e hiperparámetros, y entrega:

- Un **notebook por cada ejecución**, con el código completo y editable (no es una caja negra).
- Un notebook de **exploración de datos**.
- Todas las ejecuciones registradas en un experimento de **MLflow**, con métricas para comparar.

Soporta **clasificación**, **regresión** y **pronóstico** (*forecasting*). Es un excelente **punto de partida** (*baseline*): en minutos sabes qué nivel de calidad es razonable y tienes código para mejorar.

## Entrenar y registrar con MLflow

**MLflow** organiza el trabajo en **experimentos**, que contienen **ejecuciones** (*runs*); cada ejecución guarda parámetros, métricas, artefactos y el modelo.

```python norun
import mlflow
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.metrics import roc_auc_score

mlflow.set_experiment("/Shared/rapido/churn")
mlflow.autolog()                                    # registra parámetros, métricas y el modelo automáticamente

with mlflow.start_run(run_name="hgb_v1"):
    modelo = HistGradientBoostingClassifier(max_depth=6, learning_rate=0.05)
    modelo.fit(X_train, y_train)
    auc = roc_auc_score(y_val, modelo.predict_proba(X_val)[:, 1])
    mlflow.log_metric("auc_validacion", auc)        # métricas propias además de las automáticas
```

- **`autolog`** registra los hiperparámetros, las métricas de entrenamiento y el modelo con su **firma**.
- La **firma** (*signature*) describe las columnas y tipos de entrada y salida del modelo; Model Serving la usa para validar las solicitudes. El **ejemplo de entrada** (*input example*) ayuda a probar el modelo registrado.
- En la interfaz del experimento se comparan ejecuciones por métricas y parámetros.

### Ajuste de hiperparámetros

Se prueban combinaciones de hiperparámetros y se elige la que mejor rinde en **validación**:

- **Grid search** (todas las combinaciones) y **random search** (al azar): simples pero costosos.
- **Optimización bayesiana** con **Optuna**: usa los resultados anteriores para proponer combinaciones prometedoras; con MLflow, cada prueba queda como una ejecución hija.
- **Validación cruzada**: para datos sin orden temporal, promedia el rendimiento en varias particiones; con series de tiempo se usa validación por ventanas temporales.

### Spark ML

Para entrenar sobre datos que no entran en una máquina se usa **Spark ML** (`pyspark.ml`):

- **Transformer**: transforma un DataFrame (por ejemplo, un modelo ya entrenado).
- **Estimator**: se entrena con `fit()` y devuelve un Transformer (por ejemplo, `LogisticRegression`).
- **Pipeline**: encadena pasos (`StringIndexer`, `OneHotEncoder`, `VectorAssembler`, el modelo) para que el mismo preprocesamiento se aplique en entrenamiento e inferencia.
- `CrossValidator` y `TrainValidationSplit` ajustan hiperparámetros.
- **pandas API on Spark** (`pyspark.pandas`) permite usar sintaxis de pandas sobre datos distribuidos.

## Registro en Unity Catalog y alias

```python norun
mlflow.set_registry_uri("databricks-uc")
mlflow.register_model(f"runs:/{run_id}/model", "prod.ml.churn")      # crea la versión 3, por ejemplo

from mlflow import MlflowClient
MlflowClient().set_registered_model_alias("prod.ml.churn", "champion", 3)

modelo = mlflow.pyfunc.load_model("models:/prod.ml.churn@champion")    # el código usa el alias, no el número
```

- Cada registro crea una **versión** nueva, con linaje hacia el experimento y los datos.
- Los **alias** (`champion`, `challenger`) reemplazan a las antiguas "etapas" (*Staging*, *Production*). Promover un modelo es mover el alias a otra versión: el código que carga `@champion` no cambia.
- Para pasar modelos de un entorno a otro (dev → prod), se **copia** la versión entre catálogos o se reentrena en prod con el mismo código (el enfoque de "desplegar código").

## Desplegar

| Modo | Cómo | Cuándo |
|---|---|---|
| **Batch** | `mlflow.pyfunc.spark_udf` (o `fe.score_batch`, o `ai_query` sobre un endpoint) aplicado a una tabla en un job | Predicciones para todos los clientes cada noche: lo más barato y común |
| **Streaming** | El mismo UDF sobre un DataFrame de Structured Streaming | Puntuar eventos a medida que llegan |
| **Tiempo real** | Endpoint de **Model Serving** con autoescalado (y escala a cero) | La app necesita la predicción en milisegundos |

```python norun
predecir = mlflow.pyfunc.spark_udf(spark, "models:/prod.ml.churn@champion", result_type="double")
(spark.table("prod.ml.features_hoy")
   .withColumn("prob_churn", predecir(*columnas_features))
   .write.mode("overwrite").saveAsTable("prod.ml.churn_scores"))
```

## Monitorear

Un modelo pierde calidad cuando cambian los datos (**deriva de datos**, *data drift*) o la relación entre features y resultado (**deriva de concepto**). Las **tablas de inferencia** de Model Serving guardan entradas y predicciones; el **monitoreo de calidad de datos** sobre esas tablas calcula perfiles y deriva entre períodos, y cuando llega la etiqueta real se calculan las métricas del modelo en producción. Si la calidad cae por debajo de un umbral, se reentrena.

:::examen Lo que más se pregunta en ML Associate
- "Cambiar el modelo en producción sin modificar el job que lo usa" → **mover el alias** `@champion` a la versión nueva.
- "Evitar que las features usen datos posteriores a la fecha de la etiqueta" → **tabla de features con clave de tiempo** y `timestamp_lookup_key`.
- "Tener rápido un modelo de referencia y el código para mejorarlo" → **AutoML**.
- "Predicciones diarias para 5 millones de clientes" → **inferencia batch** con `spark_udf`, no Model Serving.
- "Registrar parámetros y métricas sin escribir cada `log_param`" → **`mlflow.autolog()`**.
:::

:::errores
- **Calcular la imputación o la normalización con todos los datos antes de separar.** Síntoma: métricas de validación demasiado buenas. Corrección: ajustar el preprocesamiento solo con entrenamiento (con un pipeline).
- **Features calculadas "a hoy" para etiquetas del pasado.** Síntoma: el modelo es excelente en pruebas y malo en producción. Corrección: uniones a un momento dado.
- **Cargar el modelo por número de versión en el código de producción.** Síntoma: hay que cambiar el código para cada modelo nuevo. Corrección: alias.
- **Elegir el modelo por la métrica de prueba después de muchos intentos.** Síntoma: sobreajuste al conjunto de prueba. Corrección: elegir con validación y usar la prueba una sola vez al final.
:::

:::trabajo El flujo típico en un equipo
Features en tablas de Unity Catalog actualizadas por un pipeline; entrenamiento en un job que registra en MLflow y registra la versión candidata con el alias `@challenger`; una evaluación automática que compara `@challenger` contra `@champion` en el mismo conjunto; si mejora, se mueve el alias; la inferencia batch nocturna carga `@champion`; el monitoreo alerta cuando la deriva supera un umbral y dispara el reentrenamiento.
:::

## Ejercicios

:::ejercicio quiz
Entrenaste una versión nueva del modelo `prod.ml.churn` (versión 7) que es mejor que la actual. El job de inferencia carga `models:/prod.ml.churn@champion`. ¿Cómo la pones en producción?
- [ ] Cambias el job para que cargue la versión 7.
- [x] Mueves el alias `champion` a la versión 7.
- [ ] Borras las versiones anteriores.
- [ ] Registras la versión 7 con el nombre `prod.ml.churn_champion`.
```explicacion
El alias apunta a una versión. Al moverlo, todo lo que carga `@champion` usa la versión nueva sin cambios de código.
```
:::

:::ejercicio quiz
Para predecir el churn al 1 de marzo, una feature es "pedidos en los últimos 30 días". ¿Cómo evitas usar pedidos posteriores al 1 de marzo?
- [ ] Calculando la feature con todos los pedidos de la tabla.
- [x] Con una tabla de features con clave de tiempo y un `FeatureLookup` con `timestamp_lookup_key` igual a la fecha de corte.
- [ ] Ordenando los pedidos por fecha antes de entrenar.
- [ ] Usando validación cruzada aleatoria.
```explicacion
La unión a un momento dado trae el valor de la feature vigente en la fecha de corte de cada fila, sin información futura.
```
:::

:::ejercicio quiz
¿Qué entrega AutoML además del mejor modelo?
- [ ] Solo el modelo serializado, sin código.
- [x] Un notebook editable por cada ejecución, un notebook de exploración y las ejecuciones registradas en MLflow.
- [ ] Un endpoint de Model Serving ya desplegado.
- [ ] Una tabla de features en Unity Catalog.
```explicacion
AutoML es transparente: genera el código de cada ejecución para que puedas revisarlo y mejorarlo.
```
:::

:::ejercicio quiz
Cada noche hay que calcular la probabilidad de churn de 5 millones de clientes y guardarla en una tabla. ¿Qué despliegue usas?
- [ ] Un endpoint de Model Serving llamado 5 millones de veces.
- [x] Inferencia batch con `mlflow.pyfunc.spark_udf` en un job.
- [ ] Un notebook interactivo que alguien ejecuta cada mañana.
- [ ] AutoML programado cada noche.
```explicacion
La inferencia batch con un UDF de Spark aplica el modelo en paralelo a toda la tabla y es mucho más barata que llamar a un endpoint fila por fila.
```
:::

:::ejercicio quiz
¿Para qué sirve la firma (*signature*) de un modelo registrado en MLflow?
- [ ] Para firmar digitalmente el modelo y evitar cambios.
- [x] Para describir las columnas y tipos de entrada y salida, y validar las solicitudes al servirlo.
- [ ] Para identificar al autor del modelo.
- [ ] Para cifrar el modelo en Unity Catalog.
```explicacion
La firma define el esquema de entrada y salida. Model Serving la usa para validar y documentar las solicitudes.
```
:::

:::ejercicio quiz
En un Pipeline de Spark ML, ¿qué es un Estimator?
- [ ] Un paso que solo transforma columnas sin aprender nada.
- [x] Un algoritmo que se entrena con `fit()` y devuelve un Transformer.
- [ ] Una métrica para evaluar el modelo.
- [ ] Un DataFrame con las predicciones.
```explicacion
Los Estimators aprenden de los datos (`fit`) y producen Transformers, que aplican lo aprendido con `transform`.
```
:::

:::ejercicio abierto
Escribe el código que registre el modelo de la ejecución `run_id` como `prod.ml.churn`, le asigne el alias `challenger` a la versión creada, y lo cargue después por ese alias.
```python solucion
import mlflow
from mlflow import MlflowClient

mlflow.set_registry_uri("databricks-uc")
version = mlflow.register_model(f"runs:/{run_id}/model", "prod.ml.churn")
MlflowClient().set_registered_model_alias("prod.ml.churn", "challenger", version.version)
modelo = mlflow.pyfunc.load_model("models:/prod.ml.churn@challenger")
```
:::
