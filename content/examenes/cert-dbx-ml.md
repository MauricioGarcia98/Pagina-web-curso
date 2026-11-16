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

## @caso precios: Supermercados del Pacífico
Supermercados del Pacífico quiere predecir las ventas diarias de cada producto en cada una de sus 180 tiendas para ajustar los pedidos a los proveedores. Tiene tres años de ventas diarias en `prod.ventas.diarias` (unas 400 millones de filas), un calendario de feriados y promociones, y quiere un modelo que se reentrene cada semana.

El equipo usa notebooks con Databricks Runtime ML y registra los modelos en Unity Catalog. Quiere:
- entrenar un modelo por tienda sin escribir un bucle que tarde horas;
- elegir hiperparámetros sin probar combinaciones a mano;
- promover un modelo nuevo solo si mejora al actual.

## Un modelo por tienda
leccion: cert-databricks-ml-associate
dominio: 3
caso: precios
¿Cómo entrenas un modelo distinto para cada una de las 180 tiendas aprovechando el clúster?
- [ ] Un bucle `for` en el driver que filtra cada tienda con pandas, entrena su modelo y guarda las métricas en una lista, de a una tienda por vez.
- [x] `groupBy("tienda_id").applyInPandas(...)` con una función que entrena y devuelve las métricas de cada tienda.
- [ ] Un único modelo de Spark ML con la columna `tienda_id` como etiqueta.
- [ ] Copiar los datos a 180 notebooks distintos y ejecutarlos a mano.
porque: `applyInPandas` reparte los grupos entre los ejecutores y corre la función de entrenamiento en paralelo, una vez por tienda.

## Separación para series de tiempo
leccion: cert-databricks-ml-associate
dominio: 2
caso: precios
¿Cómo separas entrenamiento y validación para este pronóstico?
- [ ] Al azar, con `randomSplit([0.8, 0.2], seed=42)`, para que entrenamiento y validación tengan todas las fechas, tiendas y temporadas.
- [x] Por fecha: entrenar con el pasado y validar con las semanas más recientes.
- [ ] Por tienda: unas tiendas para entrenar y otras para validar, sin mirar las fechas.
- [ ] No hace falta validar si el modelo se reentrena cada semana.
porque: En series de tiempo, mezclar fechas filtra información del futuro y sobreestima la calidad del modelo.

## Promover solo si mejora
leccion: cert-databricks-ml-associate
dominio: 4
caso: precios
El job semanal entrena un modelo nuevo. ¿Cómo se promueve sin riesgo?
- [ ] Registrar la nueva versión con el mismo nombre y borrar la anterior del registro, para que la inferencia tome siempre la última versión disponible.
- [x] Registrar la nueva versión, compararla con la del alias `@champion` sobre los mismos datos de validación y mover el alias solo si mejora.
- [ ] Cambiar el nombre del modelo cada semana para no pisar el anterior.
- [ ] Copiar el archivo del modelo a la carpeta del job de inferencia.
porque: Los alias de Unity Catalog permiten cambiar qué versión usa la inferencia sin tocar el código, y la comparación evita promover un modelo peor.

## Métrica para pronósticos
leccion: cert-databricks-ml-associate
dominio: 3
caso: precios
Hay productos que venden 2 unidades y otros 2.000. ¿Qué métrica comunica mejor el error a compras?
- [ ] La exactitud, calculada como el porcentaje de días en que el pronóstico coincide con la venta real.
- [ ] El AUC.
- [x] Un error relativo como MAPE o WAPE, junto al MAE en unidades.
- [ ] La matriz de confusión.
porque: Con escalas tan distintas, un error porcentual o ponderado permite comparar productos; la exactitud y el AUC son métricas de clasificación.

## Registro en Unity Catalog
leccion: cert-databricks-ml-associate
dominio: 1
¿Qué hay que configurar en MLflow para que los modelos se registren en Unity Catalog?
- [ ] Un archivo de configuración en el driver con la contraseña del metastore y la ruta de DBFS donde se guardan las versiones del modelo, que se lee al registrar.
- [x] `mlflow.set_registry_uri("databricks-uc")` (es el valor por defecto en las versiones recientes) y un nombre de tres partes `catalogo.esquema.modelo`.
- [ ] Nada: alcanza con un nombre de una sola parte, como `modelo_churn`.
- [ ] Guardar el modelo en DBFS y crear una vista que lo apunte.
porque: Con el registro de Unity Catalog, los modelos se nombran como cualquier objeto de UC y heredan su gobierno y permisos.

## Qué guarda un run
leccion: cert-databricks-ml-associate
dominio: 1
¿Qué guarda un run de MLflow?
- [x] Parámetros, métricas, etiquetas y artefactos (por ejemplo, el modelo y gráficos).
- [ ] Solo el modelo final en formato pickle.
- [ ] El código del notebook y nada más.
- [ ] Una copia completa de los datos de entrenamiento y validación, siempre, para poder reproducir el run aunque la tabla original cambie.
porque: Un run registra parámetros, métricas, etiquetas y artefactos; los datos se referencian, no se copian por defecto.

## Buscar el mejor run
leccion: cert-databricks-ml-associate
dominio: 1
¿Cómo encuentras con código el run de mayor F1 de un experimento?
- [ ] Recorriendo a mano la carpeta de artefactos.
- [x] `mlflow.search_runs(experiment_ids=[...], order_by=["metrics.f1 DESC"], max_results=1)`.
- [ ] `spark.read.table("system.mlflow.runs").orderBy("f1").limit(1)`, que lee la tabla interna donde MLflow guarda los runs de cada experimento.
- [ ] Con `dbutils.fs.ls` sobre el experimento.
porque: `search_runs` devuelve un DataFrame con los runs y permite filtrar y ordenar por métricas o parámetros.

## Etiquetas de un run
leccion: cert-databricks-ml-associate
dominio: 1
¿Para qué sirve agregar etiquetas (`mlflow.set_tag`) a un run?
- [ ] Para definir la métrica principal del experimento, que MLflow usa después para ordenar los runs y elegir automáticamente el mejor modelo.
- [x] Para anotar contexto (por ejemplo, el dataset, el autor o "candidato") y poder filtrar runs después.
- [ ] Para que el run use una GPU.
- [ ] Para borrar el run al terminar.
porque: Las etiquetas son metadatos libres que se usan para buscar y organizar runs.

## Modelo personalizado
leccion: cert-databricks-ml-associate
dominio: 1
El modelo necesita un preprocesamiento propio antes de predecir. ¿Cómo lo empaquetas para que viaje con el modelo?
- [ ] Documentando el preprocesamiento en un README del repositorio.
- [x] Con un modelo `mlflow.pyfunc.PythonModel` que aplica el preprocesamiento en `predict`.
- [ ] Copiando la función de preprocesamiento en cada job y endpoint que use el modelo, y documentando en el registro qué versión de la función corresponde a cada versión.
- [ ] No se puede: MLflow solo guarda modelos de scikit-learn.
porque: Un modelo pyfunc personalizado incluye la lógica de preprocesamiento y se carga igual que cualquier otro modelo de MLflow.

## Entorno del modelo
leccion: cert-databricks-ml-associate
dominio: 1
¿Qué evita que un modelo registrado falle en serving por una versión distinta de una librería?
- [ ] Instalar en el endpoint la última versión disponible de cada librería, porque las versiones nuevas siempre pueden cargar modelos guardados con versiones anteriores.
- [x] Las dependencias que MLflow guarda con el modelo (`requirements.txt` o `conda.yaml`), que se usan para armar su entorno.
- [ ] Usar siempre el mismo nombre de experimento.
- [ ] Registrar el modelo dos veces.
porque: MLflow captura las dependencias al registrar el modelo y Model Serving construye el entorno con ellas.

## Elegir el Runtime
leccion: cert-databricks-ml-associate
dominio: 1
¿Por qué usar Databricks Runtime for Machine Learning en lugar del Runtime estándar?
- [x] Porque trae preinstaladas las librerías de ML más usadas (scikit-learn, XGBoost, PyTorch, MLflow…) probadas juntas.
- [ ] Porque es el único Runtime que puede leer tablas Delta y registrar modelos en Unity Catalog; el estándar solo trabaja con archivos CSV.
- [ ] Porque no cobra DBUs.
- [ ] Porque desactiva Unity Catalog.
porque: El Runtime ML incluye un conjunto de librerías de ML compatibles entre sí, con y sin GPU.

## Librería extra en el notebook
leccion: cert-databricks-ml-associate
dominio: 1
Necesitas una librería que no viene en el Runtime ML, solo para tu notebook. ¿Qué haces?
- [ ] Reinstalar el sistema operativo del clúster.
- [x] `%pip install nombre-libreria` al principio del notebook.
- [ ] Copiar el código fuente de la librería en una celda.
- [ ] Pedir a un administrador que la instale como librería del clúster, porque `%pip` no funciona en Databricks Runtime ML.
porque: `%pip install` instala la librería con alcance de notebook, sin afectar a otros usuarios del clúster.

## Crear el set de entrenamiento con features
leccion: cert-databricks-ml-associate
dominio: 1
¿Qué combina la tabla de etiquetas con las feature tables para entrenar?
- [ ] Un `JOIN` escrito a mano en cada notebook entre la tabla de etiquetas y cada feature table, guardando el resultado como una tabla nueva por modelo.
- [x] `FeatureEngineeringClient.create_training_set(...)` con una lista de `FeatureLookup`.
- [ ] `mlflow.autolog()`.
- [ ] `VectorAssembler`.
porque: `create_training_set` une las features por clave (y por tiempo) y deja registrado qué features usa el modelo.

## Puntuar con las features del modelo
leccion: cert-databricks-ml-associate
dominio: 1
El modelo se registró con `fe.log_model(...)` usando feature lookups. ¿Cómo puntúas un lote que solo trae las claves?
- [ ] Hay que volver a unir a mano todas las feature tables por clave antes de predecir, porque el modelo registrado solo guarda los pesos y no sabe qué features usa.
- [x] `fe.score_batch(model_uri=..., df=claves)`: busca las features por clave y aplica el modelo.
- [ ] `spark.sql("PREDICT ...")`.
- [ ] No se puede puntuar con solo las claves.
porque: Un modelo empaquetado con sus feature lookups sabe qué features buscar y `score_batch` las agrega automáticamente.

## Clave de tiempo en una feature table
leccion: cert-databricks-ml-associate
dominio: 1
¿Para qué se define una clave de tiempo (timeseries key) en una feature table?
- [ ] Para ordenar la tabla al mostrarla.
- [x] Para que los lookups tomen el valor de la feature vigente en la fecha de cada etiqueta (point-in-time) y no filtren el futuro.
- [ ] Para que Databricks borre automáticamente las filas viejas de la feature table y solo quede el último valor de cada clave, ahorrando almacenamiento.
- [ ] Para particionar el experimento de MLflow.
porque: Con una clave de tiempo, el join point-in-time trae el último valor anterior a la fecha del evento, evitando la fuga de información.

## Permiso para usar un modelo
leccion: cert-databricks-ml-associate
dominio: 1
Un equipo debe poder cargar el modelo para inferencia pero no modificarlo. ¿Qué permiso le das en Unity Catalog?
- [ ] `MODIFY` sobre el esquema y `SELECT` sobre el modelo, que permiten leerlo para inferencia sin dar acceso a las tablas de entrenamiento.
- [x] `EXECUTE` sobre el modelo (más `USE CATALOG` y `USE SCHEMA`).
- [ ] `MODIFY` sobre el esquema.
- [ ] Ninguno: los modelos son públicos dentro del workspace.
porque: `EXECUTE` permite usar el modelo para inferencia sin poder cambiarlo; los permisos de uso del catálogo y del esquema son necesarios para llegar a él.

## AutoML: qué devuelve
leccion: cert-databricks-ml-associate
dominio: 1
Después de una corrida de AutoML, ¿qué obtienes además del mejor modelo?
- [ ] Solo un número con la mejor métrica, sin forma de saber cómo se obtuvo.
- [x] Un notebook de exploración de datos y notebooks editables con el código de cada prueba, registrados en MLflow.
- [ ] Un dashboard de ventas.
- [ ] El mejor modelo ya desplegado en un endpoint de producción, con el alias `@champion` asignado y un monitor de deriva configurado.
porque: AutoML genera notebooks con el código de las pruebas para que el equipo los revise y los adapte; no despliega solo.

## Deduplicar antes de entrenar
leccion: cert-databricks-ml-associate
dominio: 2
La tabla de entrenamiento tiene clientes repetidos por un error de carga. ¿Por qué importa antes de separar los datos?
- [x] Porque el mismo cliente puede quedar en entrenamiento y en validación, y la métrica sale inflada.
- [ ] No importa: más filas siempre mejoran el modelo.
- [ ] Porque Spark no permite filas repetidas.
- [ ] Porque Spark no permite filas repetidas en una tabla Delta y el entrenamiento falla con un error de clave duplicada al llegar al primer cliente repetido.
porque: Los duplicados que cruzan la separación hacen que el modelo "vea" en validación casos que ya memorizó.

## Valores atípicos
leccion: cert-databricks-ml-associate
dominio: 2
En la exploración aparecen pedidos con montos de 10 millones, imposibles para el negocio. ¿Qué haces primero?
- [ ] Borrar sin revisar todo lo que esté a más de tres desvíos estándar de la media, porque cualquier valor tan alto es siempre un error de carga.
- [x] Investigar con el dueño de los datos si son errores de carga, y documentar la regla de limpieza que se aplique.
- [ ] Dejarlos tal cual: el modelo se adapta solo.
- [ ] Multiplicar todos los montos por 10 para que no se noten.
porque: Las reglas de limpieza tienen que tener sentido de negocio y quedar documentadas; borrar sin entender puede eliminar casos reales.

## Variables categóricas con muchos valores
leccion: cert-databricks-ml-associate
dominio: 2
Una columna tiene 50.000 códigos de producto distintos. ¿Qué problema tiene aplicar one-hot encoding directo?
- [ ] Ninguno.
- [x] Genera 50.000 columnas muy dispersas; conviene agrupar los poco frecuentes, usar target encoding o embeddings, o un modelo de árboles que lo tolere.
- [ ] Que `OneHotEncoder` de Spark tiene un máximo de 1.000 categorías por columna, así que falla y hay que dividir la columna en varias partes.
- [ ] Convierte la columna en numérica continua.
porque: Con alta cardinalidad, one-hot explota la dimensión; hay técnicas para reducirla.

## Imputar con estadísticas del entrenamiento
leccion: cert-databricks-ml-associate
dominio: 2
¿De dónde salen los valores para imputar los nulos de validación y producción?
- [ ] De la mediana de todo el dataset, incluidos validación y producción, para que el valor imputado represente mejor a toda la población.
- [x] De lo aprendido solo con los datos de entrenamiento, aplicado igual al resto (por ejemplo, con un `Imputer` dentro del pipeline).
- [ ] De un valor distinto cada vez que se predice.
- [ ] Siempre de cero.
porque: Calcular la imputación con datos de validación filtra información; el pipeline ajustado en entrenamiento se aplica igual después.

## Búsqueda aleatoria o en grilla
leccion: cert-databricks-ml-associate
dominio: 2
Tienes 6 hiperparámetros y poco tiempo. ¿Qué estrategia de búsqueda conviene?
- [ ] Una grilla completa con 10 valores por hiperparámetro, porque es la única estrategia que garantiza encontrar la mejor combinación.
- [x] Búsqueda aleatoria o bayesiana (por ejemplo, con Optuna), con un número de pruebas acotado.
- [ ] Probar un solo valor por hiperparámetro.
- [ ] No ajustar nada.
porque: Una grilla completa crece exponencialmente; la búsqueda aleatoria o bayesiana explora mejor con el mismo presupuesto.

## Registrar el ajuste en MLflow
leccion: cert-databricks-ml-associate
dominio: 2
¿Cómo queda ordenado en MLflow un ajuste de hiperparámetros con 50 pruebas?
- [ ] 50 experimentos distintos, uno por prueba, cada uno con su propio nombre que incluya los valores de los hiperparámetros probados.
- [x] Un run padre con 50 runs hijos anidados, cada uno con sus parámetros y métrica.
- [ ] Un solo run con la última prueba.
- [ ] No se registra: el ajuste no usa MLflow.
porque: Los runs anidados agrupan las pruebas de un mismo ajuste y permiten compararlas en la interfaz.

## Validación cruzada en Spark ML
leccion: cert-databricks-ml-associate
dominio: 2
¿Qué clase de Spark ML combina una grilla de parámetros con validación cruzada de k particiones?
- [ ] `TrainValidationSplit` con un `ParamGridBuilder` y `trainRatio=0.8`.
- [x] `CrossValidator` con un `ParamGridBuilder` y un evaluador.
- [ ] `StandardScaler`.
- [ ] `Bucketizer`.
porque: `CrossValidator` evalúa cada combinación de la grilla en k particiones y elige la mejor según el evaluador.

## Más rápido que validación cruzada
leccion: cert-databricks-ml-associate
dominio: 2
Los datos son enormes y la validación cruzada tarda demasiado. ¿Qué alternativa de Spark ML evalúa cada combinación una sola vez?
- [x] `TrainValidationSplit`.
- [ ] `CrossValidator` con `numFolds=10` y `parallelism=8`.
- [ ] `OneHotEncoder`.
- [ ] `PCA`.
porque: `TrainValidationSplit` usa una única partición de entrenamiento y validación: menos robusto, pero mucho más barato con datos grandes.

## Escalado y árboles
leccion: cert-databricks-ml-associate
dominio: 3
¿Para qué modelo es necesario escalar las variables numéricas?
- [ ] Para un árbol de decisión.
- [ ] Para un random forest, porque promedia muchos árboles y cada uno usa variables distintas.
- [x] Para una regresión logística con regularización o un modelo basado en distancias (k-means, KNN).
- [ ] Para ninguno.
porque: Los árboles no dependen de la escala; la regularización y las distancias sí.

## StringIndexer antes de un clasificador
leccion: cert-databricks-ml-associate
dominio: 3
La etiqueta es el texto "si"/"no". ¿Qué haces antes de entrenar un clasificador de Spark ML?
- [x] Convertirla en índice numérico con `StringIndexer`.
- [ ] Dejarla como texto: Spark ML la entiende.
- [ ] Aplicarle `VectorAssembler` para convertirla en un vector antes de entrenar.
- [ ] Escalarla con `StandardScaler`.
porque: Los estimadores de Spark ML esperan una etiqueta numérica; `StringIndexer` la indexa.

## Ajustar el pipeline completo
leccion: cert-databricks-ml-associate
dominio: 3
¿Qué devuelve `pipeline.fit(entrenamiento)` en Spark ML?
- [ ] Una métrica de evaluación.
- [x] Un `PipelineModel` con todas las etapas ajustadas, que se aplica a nuevos datos con `transform`.
- [ ] El DataFrame de entrenamiento con una columna nueva `prediction` y otra `probability`.
- [ ] Un experimento de MLflow.
porque: `fit` ajusta cada etapa en orden y devuelve un modelo de pipeline listo para transformar datos nuevos con los mismos pasos.

## Random forest: más árboles
leccion: cert-databricks-ml-associate
dominio: 3
¿Qué suele pasar al aumentar `numTrees` en un random forest?
- [ ] El modelo sobreajusta mucho más, porque cada árbol nuevo memoriza otra parte del entrenamiento y el promedio hereda todos esos errores.
- [x] Las predicciones se estabilizan y mejora un poco la calidad hasta un punto, con más costo de entrenamiento.
- [ ] El modelo pasa a ser lineal.
- [ ] Se eliminan las variables categóricas.
porque: Promediar más árboles reduce la varianza; a partir de cierto número la mejora es marginal y solo crece el costo.

## Profundidad máxima
leccion: cert-databricks-ml-associate
dominio: 3
Un árbol de decisión tiene error casi nulo en entrenamiento y alto en validación. ¿Qué ajuste pruebas?
- [x] Reducir `maxDepth` (o aumentar el mínimo de filas por hoja).
- [ ] Aumentar `maxDepth` y bajar `minInstancesPerNode` para que el árbol capture más detalle.
- [ ] Quitar el conjunto de validación.
- [ ] Usar más columnas irrelevantes.
porque: Un árbol muy profundo memoriza el entrenamiento; limitar la profundidad reduce el sobreajuste.

## Regularización
leccion: cert-databricks-ml-associate
dominio: 3
¿Qué efecto tiene aumentar `regParam` en una regresión logística de Spark ML?
- [ ] Hace el modelo más complejo, porque agrega términos de interacción entre las variables para capturar relaciones no lineales.
- [x] Penaliza los coeficientes grandes y reduce el sobreajuste (con riesgo de subajuste si es excesivo).
- [ ] Cambia la etiqueta.
- [ ] Desactiva la convergencia.
porque: La regularización restringe los coeficientes para que el modelo generalice mejor.

## Precisión y recall
leccion: cert-databricks-ml-associate
dominio: 3
Un modelo de fraude marca 100 pagos y 80 son fraude real; hubo 200 fraudes en total. ¿Cuánto valen precisión y recall?
- [ ] Precisión 40 %, recall 80 %.
- [x] Precisión 80 %, recall 40 %.
- [ ] Precisión 50 %, recall 50 %.
- [ ] Precisión 100 %, recall 80 %.
porque: Precisión = 80 / 100 marcados; recall = 80 / 200 fraudes reales.

## Curva ROC
leccion: cert-databricks-ml-associate
dominio: 3
¿Qué representa la curva ROC?
- [ ] El error por época de entrenamiento.
- [x] La tasa de verdaderos positivos contra la de falsos positivos para cada umbral.
- [ ] La importancia de cada variable en el modelo, ordenada de mayor a menor contribución a la predicción.
- [ ] La distribución de la etiqueta.
porque: La curva ROC muestra el compromiso entre detectar positivos y generar falsas alarmas a medida que cambia el umbral.

## RMSE o MAE
leccion: cert-databricks-ml-associate
dominio: 3
¿En qué se diferencia el RMSE del MAE?
- [ ] No hay diferencia.
- [x] El RMSE penaliza más los errores grandes porque eleva al cuadrado; el MAE pesa todos los errores igual.
- [ ] El MAE solo sirve para clasificación.
- [ ] El RMSE siempre es menor que el MAE, porque al sacar la raíz cuadrada los errores grandes se achican.
porque: Al elevar al cuadrado, el RMSE es más sensible a los errores grandes; el MAE es el error absoluto medio.

## pandas API on Spark
leccion: cert-databricks-ml-associate
dominio: 3
Un científico tiene código de pandas que no entra en la memoria del driver. ¿Qué cambio mínimo le permite escalarlo?
- [ ] Reescribir todo en Scala.
- [x] Usar la pandas API on Spark (`import pyspark.pandas as ps`), que mantiene casi la misma sintaxis.
- [ ] Elegir un driver con mucha más memoria y dejar el código igual, porque pandas en Databricks reparte el trabajo entre los ejecutores automáticamente.
- [ ] Convertir el DataFrame a una lista de Python.
porque: La pandas API on Spark ofrece una interfaz similar a pandas que se ejecuta distribuida.

## Convertir a pandas
leccion: cert-databricks-ml-associate
dominio: 3
¿Qué riesgo tiene llamar a `toPandas()` sobre un DataFrame de Spark de 300 millones de filas?
- [x] Traer todas las filas al driver y quedarse sin memoria.
- [ ] Ninguno: en Databricks, `toPandas()` devuelve un DataFrame distribuido que sigue repartido entre los ejecutores.
- [ ] Que se pierdan las columnas de texto.
- [ ] Que se borre la tabla original.
porque: `toPandas()` recolecta todo en el driver; conviene filtrar, muestrear o usar la pandas API on Spark.

## Comparar con una línea base
leccion: cert-databricks-ml-associate
dominio: 3
¿Por qué se compara un modelo nuevo contra una línea base simple (por ejemplo, "predecir el promedio" o "lo mismo que la semana pasada")?
- [ ] Porque MLflow exige registrar una línea base antes de permitir registrar el modelo en Unity Catalog.
- [x] Para saber si el modelo aporta valor real frente a la regla más simple posible.
- [ ] Para aumentar la exactitud.
- [ ] No sirve para nada.
porque: Si un modelo complejo no supera una regla trivial, no justifica su costo ni su riesgo.

## Inferencia en streaming
leccion: cert-databricks-ml-associate
dominio: 4
Las transacciones llegan continuamente a una tabla Delta y se quieren puntuar a medida que llegan, con unos minutos de demora aceptable. ¿Qué usas?
- [ ] Un endpoint de Model Serving al que un dashboard llama cada vez que alguien abre la página, guardando la respuesta en la tabla.
- [x] Structured Streaming leyendo la tabla y aplicando el modelo con `mlflow.pyfunc.spark_udf`.
- [ ] Un job manual una vez por mes.
- [ ] AutoML.
porque: La misma UDF de Spark que se usa en lotes sirve en streaming para puntuar los datos a medida que llegan.

## Tabla de inferencias del endpoint
leccion: cert-databricks-ml-associate
dominio: 4
¿Para qué se habilita la tabla de inferencias en un endpoint de Model Serving?
- [ ] Para entrenar el modelo en el endpoint.
- [x] Para guardar en una tabla Delta las solicitudes y respuestas del endpoint y poder monitorearlas y auditarlas.
- [ ] Para que el endpoint guarde en caché las respuestas y devuelva al instante las predicciones de solicitudes repetidas, con latencia casi nula.
- [ ] Para cambiar el alias del modelo.
porque: Las tablas de inferencias registran el tráfico del endpoint y alimentan el monitoreo de calidad y deriva.

## Escalar a cero
leccion: cert-databricks-ml-associate
dominio: 4
Un endpoint se usa solo en horario laboral. ¿Qué opción ahorra costo?
- [ ] Desplegarlo en un clúster con muchos nodos encendido todo el día.
- [x] Habilitar el escalado a cero (scale to zero), aceptando una demora en la primera solicitud.
- [ ] Borrar el endpoint cada noche y recrearlo cada mañana con un job, volviendo a registrar el modelo en Unity Catalog cada vez.
- [ ] No hay forma de ahorrar.
porque: Con scale to zero el endpoint no consume recursos sin tráfico; la primera solicitud tarda más mientras arranca.
