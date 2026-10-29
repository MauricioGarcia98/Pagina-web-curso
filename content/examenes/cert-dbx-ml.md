# examen: cert-databricks
# id: dbx-ml
# titulo: Databricks Machine Learning Associate

## Autolog
leccion: cert-databricks-ml-associate
dominio: 1
Quieres que cada entrenamiento de scikit-learn registre parámetros, métricas y el modelo sin escribir cada `log_param`. ¿Qué usas?
- [ ] `mlflow.log_model` al final de cada notebook de entrenamiento.
- [x] `mlflow.autolog()`
- [ ] AutoML con el mismo conjunto de datos.
- [ ] Un alias `@autolog` en el modelo registrado.
porque: `autolog` registra automáticamente hiperparámetros, métricas de entrenamiento y el modelo con su firma.

## Fuga temporal
leccion: cert-databricks-ml-associate
dominio: 2
Un modelo de churn tiene AUC de 0,97 en validación y 0,61 en producción. Las features se calcularon con todos los datos disponibles hoy. ¿Cuál es el problema más probable?
- [ ] El modelo es demasiado simple para los datos de producción.
- [x] Fuga de información del futuro en las features.
- [ ] La firma del modelo no coincide con las columnas de producción.
- [ ] El endpoint de Model Serving usa otra versión de scikit-learn.
porque: Si las features usan información posterior a la fecha de cada etiqueta, la validación se ve excelente y producción falla. Se corrige con uniones a un momento dado.

## Point-in-time
leccion: cert-databricks-ml-associate
dominio: 2
¿Qué permite que cada fila de entrenamiento reciba las features tal como eran en su fecha de corte?
- [ ] Ordenar la tabla de features por fecha de forma descendente antes de unirla con las etiquetas.
- [x] Una tabla de features con clave de tiempo y `timestamp_lookup_key` en el `FeatureLookup`.
- [ ] Una validación cruzada con particiones aleatorias que mezcle fechas pasadas y futuras.
- [ ] Un `JOIN` por `cliente_id` con la última fila disponible de la tabla de features.
porque: La clave de tiempo permite la unión a un momento dado: trae el valor vigente a la fecha de cada fila.

## AutoML
leccion: cert-databricks-ml-associate
dominio: 1
El equipo necesita en un día un modelo de referencia de regresión y el código para mejorarlo. ¿Qué usa?
- [x] AutoML.
- [ ] Un endpoint de provisioned throughput.
- [ ] Un espacio de Genie con la tabla de entrenamiento.
- [ ] Un pipeline declarativo con expectativas.
porque: AutoML prueba algoritmos e hiperparámetros, registra todo en MLflow y genera notebooks editables de cada ejecución.

## Alias
leccion: cert-databricks-ml-associate
dominio: 4
El job de inferencia carga `models:/prod.ml.ventas@champion`. ¿Qué haces para que use la versión 9?
- [ ] Editar el job para que cargue `models:/prod.ml.ventas/9`.
- [x] Mover el alias `champion` a la versión 9.
- [ ] Borrar las versiones anteriores a la 9.
- [ ] Registrar la versión 9 con el nombre `prod.ml.ventas_champion`.
porque: El alias apunta a una versión; al moverlo, el job usa la versión nueva sin cambios.

## Inferencia batch
leccion: cert-databricks-ml-associate
dominio: 4
Cada noche hay que puntuar 8 millones de clientes y guardar el resultado en una tabla. ¿Qué despliegue usas?
- [ ] Un endpoint de Model Serving llamado desde un bucle de Python.
- [x] Un job con `mlflow.pyfunc.spark_udf` (o `score_batch`).
- [ ] AutoML programado cada noche sobre los 8 millones.
- [ ] Un notebook interactivo que ejecuta el modelo con pandas.
porque: La inferencia batch con Spark aplica el modelo en paralelo y es mucho más barata que un endpoint en tiempo real.

## Tiempo real
leccion: cert-databricks-ml-associate
dominio: 4
La app necesita la probabilidad de fraude de cada compra en menos de 100 ms. ¿Qué despliegue usas?
- [ ] Inferencia batch cada hora con `spark_udf`, guardando las probabilidades en una tabla.
- [x] Un endpoint de Model Serving, con features en una tienda en línea.
- [ ] Un stream con trigger `availableNow` que se ejecuta cada 10 minutos desde un job.
- [ ] Una tabla de predicciones que se recalcula cada noche y la app consulta por SQL.
porque: Model Serving responde en milisegundos; la tienda en línea da las features con baja latencia.

## Preprocesamiento
leccion: cert-databricks-ml-associate
dominio: 2
Calculaste la media para imputar nulos con **todos** los datos antes de separar entrenamiento y prueba. ¿Qué problema introduces?
- [ ] Ninguno, la media no cambia mucho con más datos.
- [x] Fuga de información del conjunto de prueba hacia el entrenamiento.
- [ ] El modelo no se puede registrar con una firma.
- [ ] Los nulos se convierten en ceros en producción.
porque: Los parámetros de preprocesamiento deben calcularse solo con entrenamiento; si no, la evaluación queda optimista.

## Spark ML
leccion: cert-databricks-ml-associate
dominio: 3
¿Por qué conviene encadenar `StringIndexer`, `VectorAssembler` y el modelo en un `Pipeline` de Spark ML?
- [ ] Porque un Pipeline entrena más rápido que ejecutar cada paso por separado en el clúster.
- [x] Para aplicar el mismo preprocesamiento en entrenamiento e inferencia.
- [ ] Porque los Estimators de Spark ML solo funcionan cuando están dentro de un Pipeline.
- [ ] Para que el modelo quede registrado automáticamente en Unity Catalog al entrenarlo.
porque: El Pipeline ajustado guarda todos los pasos; al aplicarlo a datos nuevos se repite el mismo preprocesamiento.

## Ajuste
leccion: cert-databricks-ml-associate
dominio: 3
Tienes un presupuesto de 40 pruebas para ajustar 6 hiperparámetros. ¿Qué estrategia aprovecha mejor ese presupuesto?
- [ ] Grid search con todas las combinaciones posibles.
- [x] Optimización bayesiana (por ejemplo con Optuna).
- [ ] Probar los valores por defecto 40 veces con distintas semillas.
- [ ] Elegir los hiperparámetros por la métrica del conjunto de prueba.
porque: La optimización bayesiana usa los resultados previos para proponer combinaciones prometedoras; con 6 hiperparámetros, un grid completo excedería el presupuesto.

## Deriva
leccion: cert-databricks-ml-associate
dominio: 4
Después de un cambio en la app, la distribución de una feature en producción es muy distinta a la de entrenamiento. ¿Cómo se llama y qué la detecta?
- [ ] Sobreajuste; lo detecta la validación cruzada.
- [x] Deriva de datos; la detecta el monitoreo sobre las tablas de inferencia.
- [ ] Fuga de información; la detecta la firma del modelo.
- [ ] Desbalance de clases; lo detecta AutoML.
porque: El cambio en la distribución de entrada es deriva de datos; el monitoreo de calidad compara períodos sobre las tablas de inferencia.

## Firma
leccion: cert-databricks-ml-associate
dominio: 4
Un endpoint de Model Serving rechaza solicitudes con columnas de tipos incorrectos antes de llegar al modelo. ¿Qué lo permite?
- [ ] El alias del modelo registrado.
- [x] La firma del modelo registrada en MLflow.
- [ ] La tabla de features con clave primaria.
- [ ] El experimento de MLflow del entrenamiento.
porque: La firma describe el esquema de entrada y salida, y el endpoint valida las solicitudes contra ella.

## @caso churn: Telco Andina
Telco Andina quiere predecir qué clientes darán de baja el servicio el mes próximo. Tiene 12 millones de clientes en `prod.crm.clientes`, los consumos diarios en `prod.red.consumos` (3.000 millones de filas) y una etiqueta `baja` calculada cada mes. Solo el 3 % de los clientes se da de baja.

El equipo de ciencia de datos trabaja con notebooks en Databricks Runtime ML y quiere:
- reutilizar las features de consumo en otros modelos;
- comparar experimentos de forma ordenada;
- puntuar a todos los clientes cada noche y guardar el resultado en una tabla;
- detectar si el modelo empeora con el tiempo.

## Features reutilizables
leccion: cert-databricks-ml-associate
dominio: 1
caso: churn
¿Dónde conviene guardar las features de consumo para reutilizarlas en otros modelos?
- [ ] En un DataFrame de pandas guardado como archivo pickle en el volume personal del científico.
- [x] En una feature table de Unity Catalog con clave primaria `cliente_id` (y clave de tiempo).
- [ ] En una variable global del notebook que comparten todos los modelos del equipo.
- [ ] En el historial del experimento de MLflow, como artefacto de cada run.
porque: Las feature tables en Unity Catalog se descubren, gobiernan y reutilizan, y guardan el linaje con los modelos que las usan.

## Métrica con clases desbalanceadas
leccion: cert-databricks-ml-associate
dominio: 3
caso: churn
Con un 3 % de bajas, ¿qué métrica es más útil para comparar modelos?
- [ ] La exactitud, porque resume en un solo número qué tan bien acierta el modelo en todas las clases.
- [x] El área bajo la curva precisión-recall (o F1 de la clase baja).
- [ ] El error cuadrático medio de las probabilidades.
- [ ] El R² del modelo.
porque: Con clases muy desbalanceadas, un modelo que predice "no baja" siempre tiene 97 % de exactitud; PR-AUC y F1 se enfocan en la clase minoritaria.

## Puntuar cada noche
leccion: cert-databricks-ml-associate
dominio: 4
caso: churn
¿Qué despliegue usas para puntuar a los 12 millones de clientes cada noche?
- [ ] Un endpoint de Model Serving llamado cliente por cliente desde un bucle en el notebook.
- [x] Un job que carga el modelo por alias con `mlflow.pyfunc.spark_udf` y escribe en una tabla.
- [ ] Un dashboard que calcula la predicción cuando alguien lo abre.
- [ ] Copiar el modelo a una laptop y ejecutarlo localmente.
porque: La inferencia por lotes con una UDF de Spark distribuye la puntuación en el clúster y escribe el resultado en Delta.

## Detectar degradación
leccion: cert-databricks-ml-associate
dominio: 4
caso: churn
¿Qué te permite detectar que el modelo empeora con el tiempo?
- [ ] Volver a entrenar todas las noches sin comparar contra el modelo anterior.
- [x] Monitorear la tabla de predicciones (deriva de features y de predicciones) y la calidad cuando llegan las etiquetas reales.
- [ ] Revisar la latencia del job de puntuación en la interfaz de jobs.
- [ ] Mirar el tamaño de la tabla de predicciones cada semana.
porque: El monitoreo compara distribuciones contra una línea base y calcula métricas de calidad con las etiquetas que llegan después.

## Runtime ML
leccion: cert-databricks-ml-associate
dominio: 1
¿Qué ofrece Databricks Runtime for Machine Learning frente al runtime estándar?
- [ ] Un motor de SQL distinto, optimizado solo para consultas de modelos de ML entrenados.
- [x] Librerías de ML preinstaladas (scikit-learn, XGBoost, PyTorch, MLflow…) y soporte para GPU.
- [ ] Acceso a datos sin pasar por Unity Catalog.
- [ ] Clústeres que no consumen DBU.
porque: El runtime ML trae las librerías más usadas ya instaladas y compatibles entre sí, además de imágenes con GPU.

## Experimento de MLflow
leccion: cert-databricks-ml-associate
dominio: 1
¿Qué guarda un run de MLflow?
- [ ] Solo el modelo entrenado, sin información sobre cómo se obtuvo.
- [x] Parámetros, métricas, artefactos (como el modelo) y etiquetas del entrenamiento.
- [ ] El clúster completo para poder recrearlo.
- [ ] Los datos de entrenamiento copiados en cada ejecución.
porque: Un run registra todo lo necesario para comparar y reproducir un entrenamiento.

## Comparar runs
leccion: cert-databricks-ml-associate
dominio: 1
Hiciste 40 runs con distintos parámetros. ¿Cómo encuentras el de mejor `val_auc` desde código?
- [ ] Recorriendo las carpetas de artefactos y leyendo cada archivo de métricas uno por uno.
- [x] `mlflow.search_runs(order_by=["metrics.val_auc DESC"], max_results=1)`.
- [ ] `mlflow.log_metric("val_auc", max)`.
- [ ] `mlflow.end_run()` en el run con mejor resultado.
porque: `search_runs` devuelve los runs como DataFrame y permite filtrar y ordenar por métricas.

## Runs anidados
leccion: cert-databricks-ml-associate
dominio: 1
Durante un ajuste de hiperparámetros quieres que cada prueba quede dentro de un run padre. ¿Qué usas?
- [ ] Un experimento distinto por cada prueba de hiperparámetros.
- [x] `mlflow.start_run(nested=True)` dentro del run padre.
- [ ] `mlflow.autolog(disable=True)`.
- [ ] Una etiqueta con el número de prueba.
porque: Los runs anidados agrupan las pruebas bajo el run del ajuste para compararlas juntas.

## Firma y ejemplo
leccion: cert-databricks-ml-associate
dominio: 1
¿Qué dos elementos conviene registrar con el modelo para que sea fácil de usar y validar al servirlo?
- [x] La firma (esquema de entradas y salidas).
- [x] Un ejemplo de entrada (`input_example`).
- [ ] El token personal del científico de datos.
- [ ] Una copia completa de los datos de entrenamiento.
- [ ] El historial de Git del notebook.
porque: La firma valida los tipos al servir y el ejemplo documenta cómo llamar al modelo; Unity Catalog exige firma.

## Registrar en Unity Catalog
leccion: cert-databricks-ml-associate
dominio: 1
¿Qué nombre usas para registrar un modelo en Unity Catalog?
- [ ] Un nombre simple como `churn`, porque los modelos no pertenecen a un catálogo.
- [x] Un nombre de tres niveles: `catalogo.esquema.modelo`.
- [ ] La ruta del notebook donde se entrenó.
- [ ] El id del run.
porque: Los modelos en Unity Catalog son objetos de un esquema, como las tablas, con permisos y linaje.

## Versiones y alias
leccion: cert-databricks-ml-associate
dominio: 1
¿Qué reemplaza en Unity Catalog a las etapas Staging y Production del registro heredado?
- [ ] Las etiquetas de los runs del experimento original.
- [x] Los alias (por ejemplo, `champion` y `challenger`) que apuntan a versiones.
- [ ] Carpetas distintas en un volume.
- [ ] Un catálogo por etapa con copias del modelo.
porque: Los alias son punteros móviles a versiones; el código carga `models:/cat.esq.modelo@champion`.

## Permisos del modelo
leccion: cert-databricks-ml-associate
dominio: 1
El job de inferencia debe poder cargar el modelo pero no modificarlo. ¿Qué privilegio le das a su service principal?
- [ ] `ALL PRIVILEGES` sobre el esquema del modelo.
- [x] `EXECUTE` sobre el modelo (más `USE CATALOG` y `USE SCHEMA`).
- [ ] `MODIFY` sobre el modelo.
- [ ] Ser propietario del modelo.
porque: `EXECUTE` permite cargar y usar el modelo registrado sin cambiarlo.

## Feature lookup
leccion: cert-databricks-ml-associate
dominio: 1
¿Qué hace `FeatureLookup` al crear un training set con Feature Engineering en Unity Catalog?
- [ ] Copia la feature table completa al notebook como pandas antes de entrenar el modelo.
- [x] Une las features a las filas de entrenamiento por clave (y por tiempo si es point-in-time).
- [ ] Calcula features nuevas a partir de la etiqueta.
- [ ] Elimina las features con valores nulos.
porque: FeatureLookup define qué features traer y cómo unirlas; el modelo queda empaquetado con esa información.

## Modelo empaquetado con features
leccion: cert-databricks-ml-associate
dominio: 1
Registraste el modelo con `fe.log_model` y su training set. ¿Qué ventaja tiene al puntuar?
- [ ] Que no necesita ningún dato de entrada al puntuar, ni siquiera la clave del cliente.
- [x] Que `score_batch` busca solo las features a partir de las claves.
- [ ] Que se ejecuta sin cómputo.
- [ ] Que no requiere permisos sobre las feature tables.
porque: El modelo recuerda sus feature lookups; al puntuar solo se pasan las claves y el resto se busca automáticamente.

## Online features
leccion: cert-databricks-ml-associate
dominio: 1
Un modelo en tiempo real necesita las features más recientes de un cliente en milisegundos. ¿Qué usas?
- [ ] Leer la feature table Delta con una consulta SQL en cada predicción del endpoint.
- [x] Publicar la feature table en una tienda online (online feature store) que Model Serving consulta.
- [ ] Calcular las features desde cero en cada solicitud con Spark.
- [ ] Guardar las features en un widget.
porque: La tienda online sirve features con baja latencia y Model Serving las busca automáticamente.

## AutoML
leccion: cert-databricks-ml-associate
dominio: 1
¿Qué entrega AutoML de Databricks al terminar?
- [ ] Solo el mejor modelo, sin el código, para evitar que se modifique.
- [x] Los runs en MLflow, el mejor modelo y notebooks editables con el código de cada prueba.
- [ ] Un endpoint desplegado en producción.
- [ ] Un dashboard con predicciones.
porque: AutoML genera notebooks con el código de las pruebas, un notebook de exploración y registra todo en MLflow.

## Exploración de datos
leccion: cert-databricks-ml-associate
dominio: 1
¿Qué comando muestra rápidamente estadísticas de cada columna (nulos, distribución, mínimos y máximos) de un DataFrame en un notebook?
- [ ] `df.collect()` y revisar las filas una por una en la salida de la celda.
- [x] `dbutils.data.summarize(df)` (o el perfil de datos de `display`).
- [ ] `df.explain()`.
- [ ] `spark.catalog.listTables()`.
porque: El resumen de datos calcula estadísticas por columna sin escribir código de agregación.

## Separación temporal
leccion: cert-databricks-ml-associate
dominio: 2
Para predecir bajas del mes próximo, ¿cómo separas entrenamiento y validación?
- [ ] Al azar, mezclando todos los meses, para que ambas partes tengan la misma distribución.
- [x] Por tiempo: entrenar con meses anteriores y validar con los posteriores.
- [ ] Por orden alfabético del nombre del cliente.
- [ ] Usando el mismo conjunto para entrenar y validar.
porque: En problemas temporales, la separación al azar filtra información del futuro y sobreestima el rendimiento.

## Estratificación
leccion: cert-databricks-ml-associate
dominio: 2
Con 3 % de clase positiva, ¿cómo te aseguras de que la validación tenga la misma proporción de bajas?
- [ ] Eliminando la mitad de los clientes que no se dieron de baja antes de separar.
- [x] Con una separación estratificada por la etiqueta.
- [ ] Ordenando por la etiqueta y tomando el 20 % final.
- [ ] Duplicando las filas de la clase positiva en validación.
porque: La estratificación conserva la proporción de clases en cada parte.

## Imputación
leccion: cert-databricks-ml-associate
dominio: 2
La columna `ingreso` tiene 8 % de nulos y valores extremos. ¿Qué imputación es más robusta?
- [ ] Con la media de toda la tabla, calculada antes de separar los conjuntos.
- [x] Con la mediana calculada solo con el conjunto de entrenamiento.
- [ ] Con cero en todos los casos.
- [ ] Eliminando la columna.
porque: La mediana resiste valores extremos y calcularla solo con entrenamiento evita fuga de datos.

## Codificación de categorías
leccion: cert-databricks-ml-associate
dominio: 2
La columna `plan` tiene 6 valores sin orden. ¿Cómo la codificas para un modelo lineal?
- [ ] Asignando 1 a 6 según el orden alfabético y usándola como número continuo.
- [x] One-hot encoding.
- [ ] Eliminándola.
- [ ] Con su hash como número.
porque: One-hot evita imponer un orden artificial entre categorías en modelos lineales.

## Escalado
leccion: cert-databricks-ml-associate
dominio: 2
¿Para qué modelos es más importante estandarizar las variables numéricas?
- [ ] Para árboles de decisión y random forest, que comparan distancias entre las variables.
- [x] Para modelos basados en distancias o gradientes (regresión logística regularizada, k-means, redes).
- [ ] Para ninguno: el escalado no cambia los resultados.
- [ ] Solo para la variable objetivo.
porque: Los árboles no dependen de la escala; los modelos con distancias o penalizaciones sí.

## Optuna
leccion: cert-databricks-ml-associate
dominio: 2
¿Qué ventaja tiene una búsqueda bayesiana (por ejemplo, con Optuna) frente a una grid search?
- [ ] Prueba todas las combinaciones posibles, por lo que siempre encuentra el óptimo exacto.
- [x] Usa los resultados anteriores para elegir las próximas pruebas y necesita menos intentos.
- [ ] No necesita una métrica objetivo.
- [ ] No se puede registrar en MLflow.
porque: La búsqueda bayesiana concentra las pruebas en las zonas prometedoras del espacio de hiperparámetros.

## Ajuste distribuido
leccion: cert-databricks-ml-associate
dominio: 2
¿Qué dos prácticas aceleran el ajuste de hiperparámetros de un modelo de scikit-learn en Databricks?
- [x] Ejecutar pruebas en paralelo en el clúster (por ejemplo, Optuna con un backend distribuido o Ray).
- [x] Cortar temprano las pruebas que no mejoran (pruning).
- [ ] Usar un solo nodo con más memoria para todas las pruebas.
- [ ] Desactivar el registro en MLflow.
- [ ] Aumentar la cantidad de folds a 50.
porque: La paralelización reparte las pruebas y el pruning evita gastar tiempo en las malas.

## Validación cruzada
leccion: cert-databricks-ml-associate
dominio: 2
¿Cuándo conviene la validación cruzada k-fold frente a una sola separación de validación?
- [ ] Cuando el conjunto de datos es enorme y entrenar una vez ya lleva muchas horas.
- [x] Cuando hay pocos datos y se quiere una estimación más estable del rendimiento.
- [ ] Cuando los datos son series de tiempo y no se puede mezclar.
- [ ] Nunca: siempre da peores resultados.
porque: K-fold usa todos los datos para validar en turnos y reduce la varianza de la estimación.

## Pipeline de Spark ML
leccion: cert-databricks-ml-associate
dominio: 3
¿Qué diferencia hay entre un `Estimator` y un `Transformer` en Spark ML?
- [ ] El `Estimator` transforma DataFrames y el `Transformer` aprende de los datos de entrenamiento.
- [x] El `Estimator` aprende con `fit()` y devuelve un `Transformer`, que aplica `transform()`.
- [ ] Son lo mismo con distinto nombre.
- [ ] El `Transformer` solo existe en scikit-learn.
porque: Un estimador (por ejemplo, `LogisticRegression`) se ajusta a los datos y produce un modelo (transformador) que agrega predicciones.

## VectorAssembler
leccion: cert-databricks-ml-associate
dominio: 3
¿Para qué sirve `VectorAssembler` en Spark ML?
- [ ] Para entrenar modelos de vectores de embeddings de texto con redes neuronales.
- [x] Para juntar varias columnas en una sola columna de tipo vector, que esperan los algoritmos.
- [ ] Para escalar las columnas numéricas.
- [ ] Para dividir el DataFrame en entrenamiento y prueba.
porque: Los algoritmos de Spark ML reciben las features en una única columna vector.

## Árbol o lineal
leccion: cert-databricks-ml-associate
dominio: 3
La relación entre las variables y la baja es no lineal y con interacciones complejas. ¿Qué familia de modelos suele rendir mejor sin mucha ingeniería de features?
- [ ] Regresión lineal sin transformar las variables ni agregar interacciones.
- [x] Árboles potenciados (gradient boosting, por ejemplo XGBoost o LightGBM).
- [ ] K-means.
- [ ] Un modelo que siempre predice la clase mayoritaria.
porque: Los árboles potenciados capturan no linealidades e interacciones automáticamente.

## pandas API on Spark
leccion: cert-databricks-ml-associate
dominio: 3
Un científico tiene código de pandas que falla por memoria con 300 millones de filas. ¿Qué le permite escalarlo con pocos cambios?
- [ ] Convertir el DataFrame de Spark a pandas con `toPandas()` en un nodo más grande.
- [x] pandas API on Spark (`import pyspark.pandas as ps`).
- [ ] Reescribir todo en Scala.
- [ ] Usar un solo executor.
porque: pandas API on Spark ofrece la sintaxis de pandas ejecutada de forma distribuida.

## Pandas UDF para entrenar por grupo
leccion: cert-databricks-ml-associate
dominio: 3
Hay que entrenar un modelo de scikit-learn por cada una de 5.000 tiendas. ¿Qué patrón distribuye el trabajo?
- [ ] Un bucle `for` en el driver que entrena las tiendas una por una con pandas.
- [x] `groupBy("tienda").applyInPandas(entrenar, schema)`.
- [ ] Un solo modelo con la tienda como variable.
- [ ] Un job por tienda creado a mano.
porque: `applyInPandas` ejecuta la función de entrenamiento por grupo en paralelo en los executors.

## Sobreajuste
leccion: cert-databricks-ml-associate
dominio: 3
El modelo tiene AUC 0,99 en entrenamiento y 0,72 en validación. ¿Qué dos acciones ayudan?
- [x] Regularizar o reducir la complejidad (por ejemplo, menor profundidad de los árboles).
- [x] Conseguir más datos o usar early stopping.
- [ ] Agregar más features sin revisar su relación con la etiqueta.
- [ ] Entrenar más rondas sin validar.
- [ ] Evaluar sobre el conjunto de entrenamiento.
porque: La brecha indica sobreajuste; más regularización, menos complejidad, más datos o early stopping lo reducen.

## Métrica de regresión
leccion: cert-databricks-ml-associate
dominio: 3
Un modelo predice el consumo mensual en GB y los errores grandes son muy costosos. ¿Qué métrica penaliza más esos errores?
- [ ] El MAE, que trata todos los errores por igual sin importar su tamaño.
- [x] El RMSE.
- [ ] La exactitud.
- [ ] El F1.
porque: El RMSE eleva los errores al cuadrado antes de promediar, por lo que los grandes pesan más.

## Umbral de decisión
leccion: cert-databricks-ml-associate
dominio: 3
Retención solo puede llamar a 50.000 clientes por mes. ¿Qué ajustas para elegir a quién llamar?
- [ ] Reentrenar el modelo con un algoritmo distinto hasta que prediga exactamente 50.000 bajas.
- [x] El umbral de probabilidad (o tomar los 50.000 con mayor probabilidad).
- [ ] La cantidad de features del modelo.
- [ ] La semilla aleatoria.
porque: El umbral convierte probabilidades en decisiones según la capacidad y el costo del negocio.

## Matriz de confusión
leccion: cert-databricks-ml-associate
dominio: 3
En la matriz de confusión, ¿qué es un falso negativo en el modelo de bajas?
- [ ] Un cliente que el modelo marcó como baja y finalmente no se dio de baja.
- [x] Un cliente que se dio de baja y el modelo predijo que no.
- [ ] Un cliente sin datos de consumo.
- [ ] Un cliente que el modelo no pudo puntuar.
porque: Falso negativo es un positivo real que el modelo clasificó como negativo.

## Importancia de features
leccion: cert-databricks-ml-associate
dominio: 3
Negocio quiere saber qué variables influyen en cada predicción individual. ¿Qué técnica usas?
- [ ] La importancia global de features del modelo, que vale igual para todos los clientes.
- [x] Valores SHAP por predicción.
- [ ] La correlación de cada variable con la etiqueta.
- [ ] El número de veces que se usó cada variable en el código.
porque: SHAP atribuye la contribución de cada variable a cada predicción individual.

## Fuga por variable
leccion: cert-databricks-ml-associate
dominio: 3
Una variable `fecha_cancelacion` tiene una importancia altísima en el modelo de bajas. ¿Qué sospechas?
- [ ] Que es la mejor variable del modelo y conviene darle aún más peso.
- [x] Fuga de la etiqueta: esa variable solo existe cuando el cliente ya se dio de baja.
- [ ] Que falta escalarla.
- [ ] Que hay pocos datos.
porque: Una variable que contiene la respuesta no está disponible al predecir; hay que quitarla.

## Desbalance
leccion: cert-databricks-ml-associate
dominio: 3
¿Qué técnica ayuda a que el modelo no ignore la clase de bajas (3 %)?
- [ ] Eliminar del entrenamiento todas las filas de la clase positiva que tengan nulos.
- [x] Pesos por clase o sobremuestreo de la clase minoritaria en entrenamiento.
- [ ] Usar exactitud como métrica de selección.
- [ ] Entrenar con menos features.
porque: Ponderar o sobremuestrear hace que los errores en la clase minoritaria pesen más.

## Serving en tiempo real
leccion: cert-databricks-ml-associate
dominio: 4
Una app debe pedir la probabilidad de baja de un cliente cuando un agente abre su ficha. ¿Qué usas?
- [ ] Un job nocturno que escribe la probabilidad en un archivo CSV del volume.
- [x] Un endpoint de Model Serving con el modelo por alias.
- [ ] Un notebook que el agente ejecuta.
- [ ] AutoML.
porque: Model Serving expone el modelo como API REST con baja latencia y autoescalado.

## Probar un challenger
leccion: cert-databricks-ml-associate
dominio: 4
Quieres comparar en producción un modelo nuevo con el actual, enviándole el 10 % de las solicitudes. ¿Qué configuras?
- [ ] Dos endpoints distintos y una regla en la app que elige uno al azar en cada solicitud.
- [x] Un endpoint con dos modelos servidos y reparto de tráfico 90/10.
- [ ] Reemplazar el modelo y volver atrás si hay quejas.
- [ ] Un job que puntúa con ambos cada noche.
porque: Un endpoint de Model Serving puede servir varias versiones con porcentajes de tráfico.

## Autolog con Spark ML
leccion: cert-databricks-ml-associate
dominio: 1
¿Qué registra automáticamente `mlflow.autolog()` al entrenar con scikit-learn en Databricks?
- [ ] Solo el tiempo de ejecución de la celda, porque las métricas deben registrarse a mano.
- [x] Parámetros, métricas de entrenamiento, el modelo con su firma y otros artefactos.
- [ ] El conjunto de datos completo copiado dentro del run.
- [ ] Nada si el experimento no se creó antes manualmente.
porque: Autolog captura parámetros, métricas y el modelo de las librerías compatibles sin código adicional.

## Experimento compartido
leccion: cert-databricks-ml-associate
dominio: 1
Varios científicos quieren registrar sus runs en el mismo lugar desde notebooks distintos. ¿Qué hacen?
- [ ] Cada uno usa el experimento por defecto de su notebook y luego copian los runs a mano.
- [x] Usan `mlflow.set_experiment("/Shared/churn")` con un experimento de workspace compartido.
- [ ] Guardan los runs en una tabla Delta propia.
- [ ] Usan el mismo notebook al mismo tiempo.
porque: Un experimento de workspace puede recibir runs de cualquier notebook o job con permisos.

## Cargar un modelo
leccion: cert-databricks-ml-associate
dominio: 1
¿Qué URI carga la versión que tiene el alias `champion` del modelo `prod.ml.churn`?
- [ ] `runs:/champion/model`, usando el alias como si fuera el id del run.
- [x] `models:/prod.ml.churn@champion`
- [ ] `models:/prod.ml.churn/Production`
- [ ] `dbfs:/models/churn/champion`
porque: Con Unity Catalog, los alias se referencian con `@alias` en la URI del modelo.

## Linaje del modelo
leccion: cert-databricks-ml-associate
dominio: 1
Auditoría pregunta con qué tablas se entrenó la versión 4 del modelo. ¿Dónde lo ves?
- [ ] En el nombre del modelo, que debe incluir la lista de tablas usadas.
- [x] En el linaje de Unity Catalog del modelo (y el run de MLflow asociado).
- [ ] En el endpoint de Model Serving.
- [ ] En la tabla de facturación.
porque: Unity Catalog registra el linaje entre tablas, features y versiones de modelo, y la versión enlaza con su run.

## Point-in-time
leccion: cert-databricks-ml-associate
dominio: 1
Las features de consumo cambian cada día. ¿Qué evita que el entrenamiento use valores posteriores a la fecha de cada ejemplo?
- [ ] Usar siempre la última versión de la feature table al crear el training set.
- [x] Una feature table de series de tiempo (`timeseries_column`) con búsqueda point-in-time.
- [ ] Borrar las filas viejas de la feature table cada mes.
- [ ] Entrenar sin features de consumo.
porque: La búsqueda point-in-time trae el valor vigente en la fecha de cada fila de entrenamiento, sin fuga del futuro.

## Escribir features
leccion: cert-databricks-ml-associate
dominio: 1
¿Qué dos condiciones debe cumplir una tabla para usarse como feature table en Unity Catalog?
- [x] Ser una tabla Delta en Unity Catalog.
- [x] Tener una clave primaria declarada.
- [ ] Estar particionada por fecha.
- [ ] Tener menos de 100 columnas.
- [ ] Estar en el catálogo `hive_metastore`.
porque: Cualquier tabla Delta de Unity Catalog con clave primaria puede usarse como feature table.

## GPU
leccion: cert-databricks-ml-associate
dominio: 1
¿Cuándo vale la pena usar un clúster con GPU para entrenar?
- [ ] Para cualquier modelo de scikit-learn, que siempre se acelera con GPU.
- [x] Para aprendizaje profundo y librerías que aprovechan GPU (PyTorch, XGBoost con GPU).
- [ ] Para leer archivos Delta más rápido.
- [ ] Para registrar runs en MLflow.
porque: Las GPU aceleran operaciones de matrices masivas; la mayoría de los modelos clásicos de scikit-learn no las usan.

## Curva de aprendizaje
leccion: cert-databricks-ml-associate
dominio: 3
Al agregar más datos de entrenamiento, el error de validación ya no baja y es parecido al de entrenamiento, ambos altos. ¿Qué indica?
- [ ] Sobreajuste: el modelo memorizó los datos de entrenamiento.
- [x] Subajuste: el modelo es demasiado simple; conviene más features o más complejidad.
- [ ] Fuga de datos.
- [ ] Que el modelo es perfecto.
porque: Errores altos y parecidos en entrenamiento y validación indican alto sesgo (subajuste).

## Evaluador de Spark ML
leccion: cert-databricks-ml-associate
dominio: 3
¿Qué clase de Spark ML calcula el AUC de un clasificador binario sobre un DataFrame de predicciones?
- [ ] `RegressionEvaluator`, configurado con `metricName="auc"`.
- [x] `BinaryClassificationEvaluator`.
- [ ] `VectorAssembler`.
- [ ] `StringIndexer`.
porque: `BinaryClassificationEvaluator` calcula areaUnderROC y areaUnderPR.
