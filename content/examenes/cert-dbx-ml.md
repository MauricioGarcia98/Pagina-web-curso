# examen: cert-databricks
# id: dbx-ml
# titulo: Databricks Machine Learning Associate

## Autolog
leccion: cert-databricks-ml-associate
Quieres que cada entrenamiento de scikit-learn registre parámetros, métricas y el modelo sin escribir cada `log_param`. ¿Qué usas?
- [ ] `mlflow.log_model` al final de cada notebook de entrenamiento.
- [x] `mlflow.autolog()`
- [ ] AutoML con el mismo conjunto de datos.
- [ ] Un alias `@autolog` en el modelo registrado.
porque: `autolog` registra automáticamente hiperparámetros, métricas de entrenamiento y el modelo con su firma.

## Fuga temporal
leccion: cert-databricks-ml-associate
Un modelo de churn tiene AUC de 0,97 en validación y 0,61 en producción. Las features se calcularon con todos los datos disponibles hoy. ¿Cuál es el problema más probable?
- [ ] El modelo es demasiado simple para los datos de producción.
- [x] Fuga de información del futuro en las features.
- [ ] La firma del modelo no coincide con las columnas de producción.
- [ ] El endpoint de Model Serving usa otra versión de scikit-learn.
porque: Si las features usan información posterior a la fecha de cada etiqueta, la validación se ve excelente y producción falla. Se corrige con uniones a un momento dado.

## Point-in-time
leccion: cert-databricks-ml-associate
¿Qué permite que cada fila de entrenamiento reciba las features tal como eran en su fecha de corte?
- [ ] Ordenar la tabla de features por fecha de forma descendente antes de unirla con las etiquetas.
- [x] Una tabla de features con clave de tiempo y `timestamp_lookup_key` en el `FeatureLookup`.
- [ ] Una validación cruzada con particiones aleatorias que mezcle fechas pasadas y futuras.
- [ ] Un `JOIN` por `cliente_id` con la última fila disponible de la tabla de features.
porque: La clave de tiempo permite la unión a un momento dado: trae el valor vigente a la fecha de cada fila.

## AutoML
leccion: cert-databricks-ml-associate
El equipo necesita en un día un modelo de referencia de regresión y el código para mejorarlo. ¿Qué usa?
- [x] AutoML.
- [ ] Un endpoint de provisioned throughput.
- [ ] Un espacio de Genie con la tabla de entrenamiento.
- [ ] Un pipeline declarativo con expectativas.
porque: AutoML prueba algoritmos e hiperparámetros, registra todo en MLflow y genera notebooks editables de cada ejecución.

## Alias
leccion: cert-databricks-ml-associate
El job de inferencia carga `models:/prod.ml.ventas@champion`. ¿Qué haces para que use la versión 9?
- [ ] Editar el job para que cargue `models:/prod.ml.ventas/9`.
- [x] Mover el alias `champion` a la versión 9.
- [ ] Borrar las versiones anteriores a la 9.
- [ ] Registrar la versión 9 con el nombre `prod.ml.ventas_champion`.
porque: El alias apunta a una versión; al moverlo, el job usa la versión nueva sin cambios.

## Inferencia batch
leccion: cert-databricks-ml-associate
Cada noche hay que puntuar 8 millones de clientes y guardar el resultado en una tabla. ¿Qué despliegue usas?
- [ ] Un endpoint de Model Serving llamado desde un bucle de Python.
- [x] Un job con `mlflow.pyfunc.spark_udf` (o `score_batch`).
- [ ] AutoML programado cada noche sobre los 8 millones.
- [ ] Un notebook interactivo que ejecuta el modelo con pandas.
porque: La inferencia batch con Spark aplica el modelo en paralelo y es mucho más barata que un endpoint en tiempo real.

## Tiempo real
leccion: cert-databricks-ml-associate
La app necesita la probabilidad de fraude de cada compra en menos de 100 ms. ¿Qué despliegue usas?
- [ ] Inferencia batch cada hora con `spark_udf`, guardando las probabilidades en una tabla.
- [x] Un endpoint de Model Serving, con features en una tienda en línea.
- [ ] Un stream con trigger `availableNow` que se ejecuta cada 10 minutos desde un job.
- [ ] Una tabla de predicciones que se recalcula cada noche y la app consulta por SQL.
porque: Model Serving responde en milisegundos; la tienda en línea da las features con baja latencia.

## Preprocesamiento
leccion: cert-databricks-ml-associate
Calculaste la media para imputar nulos con **todos** los datos antes de separar entrenamiento y prueba. ¿Qué problema introduces?
- [ ] Ninguno, la media no cambia mucho con más datos.
- [x] Fuga de información del conjunto de prueba hacia el entrenamiento.
- [ ] El modelo no se puede registrar con una firma.
- [ ] Los nulos se convierten en ceros en producción.
porque: Los parámetros de preprocesamiento deben calcularse solo con entrenamiento; si no, la evaluación queda optimista.

## Spark ML
leccion: cert-databricks-ml-associate
¿Por qué conviene encadenar `StringIndexer`, `VectorAssembler` y el modelo en un `Pipeline` de Spark ML?
- [ ] Porque un Pipeline entrena más rápido que ejecutar cada paso por separado en el clúster.
- [x] Para aplicar el mismo preprocesamiento en entrenamiento e inferencia.
- [ ] Porque los Estimators de Spark ML solo funcionan cuando están dentro de un Pipeline.
- [ ] Para que el modelo quede registrado automáticamente en Unity Catalog al entrenarlo.
porque: El Pipeline ajustado guarda todos los pasos; al aplicarlo a datos nuevos se repite el mismo preprocesamiento.

## Ajuste
leccion: cert-databricks-ml-associate
Tienes un presupuesto de 40 pruebas para ajustar 6 hiperparámetros. ¿Qué estrategia aprovecha mejor ese presupuesto?
- [ ] Grid search con todas las combinaciones posibles.
- [x] Optimización bayesiana (por ejemplo con Optuna).
- [ ] Probar los valores por defecto 40 veces con distintas semillas.
- [ ] Elegir los hiperparámetros por la métrica del conjunto de prueba.
porque: La optimización bayesiana usa los resultados previos para proponer combinaciones prometedoras; con 6 hiperparámetros, un grid completo excedería el presupuesto.

## Deriva
leccion: cert-databricks-ml-associate
Después de un cambio en la app, la distribución de una feature en producción es muy distinta a la de entrenamiento. ¿Cómo se llama y qué la detecta?
- [ ] Sobreajuste; lo detecta la validación cruzada.
- [x] Deriva de datos; la detecta el monitoreo sobre las tablas de inferencia.
- [ ] Fuga de información; la detecta la firma del modelo.
- [ ] Desbalance de clases; lo detecta AutoML.
porque: El cambio en la distribución de entrada es deriva de datos; el monitoreo de calidad compara períodos sobre las tablas de inferencia.

## Firma
leccion: cert-databricks-ml-associate
Un endpoint de Model Serving rechaza solicitudes con columnas de tipos incorrectos antes de llegar al modelo. ¿Qué lo permite?
- [ ] El alias del modelo registrado.
- [x] La firma del modelo registrada en MLflow.
- [ ] La tabla de features con clave primaria.
- [ ] El experimento de MLflow del entrenamiento.
porque: La firma describe el esquema de entrada y salida, y el endpoint valida las solicitudes contra ella.
