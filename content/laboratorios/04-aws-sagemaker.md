---
titulo: "Laboratorio AWS: entrenar con Spot, desplegar y borrar un endpoint de SageMaker"
nivel: Avanzado
duracion: 50
resumen: Entrena un modelo XGBoost de demoras de envíos con Managed Spot Training y checkpoints, registra el modelo, crea la configuración y el endpoint en tiempo real, invócalo con un CSV y borra los tres recursos en el orden correcto. Es la práctica central del MLA-C01.
objetivos: Lanzar un training job con Spot y entender MaxWaitTimeInSeconds y los checkpoints | Leer el tiempo facturado frente al tiempo total | Crear modelo, configuración de endpoint y endpoint | Invocar el endpoint con sagemaker-runtime | Borrar endpoint, configuración y modelo
autoevaluacion: ¿Sabes qué parámetro exige el entrenamiento con Spot? | ¿Sabes para qué sirve el checkpoint en Spot? | ¿Sabes qué tres recursos hacen falta para un endpoint? | ¿Sabes qué recurso es el que cobra por hora?
---

:::escenario
El equipo de logística quiere predecir qué envíos van a llegar tarde. El científico de datos ya tiene el script; a ti te toca entrenarlo barato, publicarlo para que la app lo consulte y no dejar nada encendido el fin de semana.
:::

## Arquitectura

```diagrama
titulo: Entrenamiento y despliegue en SageMaker AI
nodo s3: S3 datos/ | icono=s3 | col=0 | fila=1 | sub=ml-demoras-lab | color=verde
nodo tj: Training job (Spot) | icono=sagemaker | col=1 | fila=1 | sub=ml.m5.xlarge | color=azul
nodo ck: Checkpoints | icono=s3 | col=1 | fila=0 | sub=si Spot interrumpe | color=verde
nodo art: model.tar.gz | icono=archivos | col=2 | fila=1
nodo m: Modelo | icono=ml | col=3 | fila=0 | color=violeta
nodo cfg: Endpoint config | icono=engranaje | col=3 | fila=1 | color=violeta
nodo ep: Endpoint | icono=api | col=4 | fila=1 | sub=cobra por hora | color=rojo
nodo app: App de logística | icono=movil | col=4 | fila=2
flecha s3 -> tj
flecha tj -> ck | estilo=punteada
flecha tj -> art
flecha art -> m
flecha m -> cfg
flecha cfg -> ep
flecha app -> ep: invoke-endpoint
```

## Costo en una cuenta real

| Recurso | Costo |
|---|---|
| Entrenamiento `ml.m5.xlarge` bajo demanda, 30 min | Unos USD 0,12 |
| El mismo con **Spot** | Hasta 70-90 % menos: unos USD 0,04 |
| Endpoint `ml.m5.large` | USD 0,115 por hora **mientras exista** |
| Artefactos en S3 | Centavos |

:::cuidado El endpoint es lo único peligroso
Si te vas a dormir con el endpoint creado, pagas toda la noche. Para cargas esporádicas existen **Serverless Inference** (cobra por invocación) y **Asynchronous Inference** con escalado a cero.
:::

## Práctica guiada

:::ejercicio cli
Paso 1. Crea el bucket `ml-demoras-lab` para datos, checkpoints y artefactos.
```respuesta
aws s3 mb s3://ml-demoras-lab/?
```
```solucion
aws s3 mb s3://ml-demoras-lab
```
:::

:::ejercicio cli error
Paso 2. Intenta lanzar el training job `demoras-v1` con `--enable-managed-spot-training` pero **solo** con `MaxRuntimeInSeconds=3600` en la condición de parada. Lee el error.
```respuesta
todos: aws sagemaker create-training-job || --training-job-name demoras-v1 || --enable-managed-spot-training || --stopping-condition MaxRuntimeInSeconds=3600
```
```solucion
aws sagemaker create-training-job --training-job-name demoras-v1 --algorithm-specification TrainingImage=683313688378.dkr.ecr.us-east-1.amazonaws.com/sagemaker-xgboost:1.7-1,TrainingInputMode=File --role-arn arn:aws:iam::123456789012:role/rol-sagemaker --output-data-config S3OutputPath=s3://ml-demoras-lab/modelos/ --resource-config InstanceType=ml.m5.xlarge,InstanceCount=1,VolumeSizeInGB=30 --stopping-condition MaxRuntimeInSeconds=3600 --enable-managed-spot-training
```
```setup
aws s3 mb s3://ml-demoras-lab
```
```explicacion
Con Spot es obligatorio `MaxWaitTimeInSeconds` (mayor o igual que `MaxRuntimeInSeconds`): es cuánto aceptas esperar, contando las interrupciones, antes de que el job falle.
```
:::

:::ejercicio cli
Paso 3. Lánzalo bien: agrega `MaxWaitTimeInSeconds=7200` y un checkpoint en `s3://ml-demoras-lab/checkpoints/`.
```respuesta
todos: aws sagemaker create-training-job || --training-job-name demoras-v1 || --enable-managed-spot-training || \S*MaxWaitTimeInSeconds=7200\S* || --checkpoint-config S3Uri=s3://ml-demoras-lab/checkpoints/
```
```solucion
aws sagemaker create-training-job --training-job-name demoras-v1 --algorithm-specification TrainingImage=683313688378.dkr.ecr.us-east-1.amazonaws.com/sagemaker-xgboost:1.7-1,TrainingInputMode=File --role-arn arn:aws:iam::123456789012:role/rol-sagemaker --output-data-config S3OutputPath=s3://ml-demoras-lab/modelos/ --resource-config InstanceType=ml.m5.xlarge,InstanceCount=1,VolumeSizeInGB=30 --stopping-condition MaxRuntimeInSeconds=3600,MaxWaitTimeInSeconds=7200 --enable-managed-spot-training --checkpoint-config S3Uri=s3://ml-demoras-lab/checkpoints/
```
```setup
aws s3 mb s3://ml-demoras-lab
```
:::

:::ejercicio cli
Paso 4. Mira el resultado del entrenamiento: estado, ruta del modelo, `BillableTimeInSeconds` y `TrainingTimeInSeconds`.
```respuesta
todos: aws sagemaker describe-training-job || --training-job-name demoras-v1 || \S*BillableTimeInSeconds\S* || \S*TrainingTimeInSeconds\S*
```
```solucion
aws sagemaker describe-training-job --training-job-name demoras-v1 --query "{estado:TrainingJobStatus,modelo:ModelArtifacts.S3ModelArtifacts,facturado:BillableTimeInSeconds,total:TrainingTimeInSeconds}"
```
```setup
aws s3 mb s3://ml-demoras-lab
aws sagemaker create-training-job --training-job-name demoras-v1 --algorithm-specification TrainingImage=683313688378.dkr.ecr.us-east-1.amazonaws.com/sagemaker-xgboost:1.7-1,TrainingInputMode=File --role-arn arn:aws:iam::123456789012:role/rol-sagemaker --output-data-config S3OutputPath=s3://ml-demoras-lab/modelos/ --resource-config InstanceType=ml.m5.xlarge,InstanceCount=1,VolumeSizeInGB=30 --stopping-condition MaxRuntimeInSeconds=3600,MaxWaitTimeInSeconds=7200 --enable-managed-spot-training --checkpoint-config S3Uri=s3://ml-demoras-lab/checkpoints/
```
```explicacion
El ahorro de Spot es `1 - facturado / total`. Aquí se pagó cerca de un tercio del tiempo.
```
:::

:::ejercicio cli
Paso 5. Registra el modelo `demoras-v1` con la imagen de XGBoost, el artefacto `s3://ml-demoras-lab/modelos/demoras-v1/output/model.tar.gz` y el rol `arn:aws:iam::123456789012:role/rol-sagemaker`.
```respuesta
todos: aws sagemaker create-model || --model-name demoras-v1 || \S*ModelDataUrl=s3://ml-demoras-lab/modelos/demoras-v1/output/model\.tar\.gz\S* || --execution-role-arn arn:aws:iam::123456789012:role/rol-sagemaker
```
```solucion
aws sagemaker create-model --model-name demoras-v1 --primary-container Image=683313688378.dkr.ecr.us-east-1.amazonaws.com/sagemaker-xgboost:1.7-1,ModelDataUrl=s3://ml-demoras-lab/modelos/demoras-v1/output/model.tar.gz --execution-role-arn arn:aws:iam::123456789012:role/rol-sagemaker
```
:::

:::ejercicio cli
Paso 6. Crea la configuración `demoras-cfg` con una variante `AllTraffic` del modelo `demoras-v1` en **una** instancia `ml.m5.large`.
```respuesta
todos: aws sagemaker create-endpoint-config || --endpoint-config-name demoras-cfg || \S*ModelName=demoras-v1\S* || \S*InstanceType=ml\.m5\.large\S* || \S*InitialInstanceCount=1\S*
```
```solucion
aws sagemaker create-endpoint-config --endpoint-config-name demoras-cfg --production-variants VariantName=AllTraffic,ModelName=demoras-v1,InstanceType=ml.m5.large,InitialInstanceCount=1
```
```setup
aws sagemaker create-model --model-name demoras-v1 --primary-container Image=683313688378.dkr.ecr.us-east-1.amazonaws.com/sagemaker-xgboost:1.7-1,ModelDataUrl=s3://ml-demoras-lab/modelos/demoras-v1/output/model.tar.gz --execution-role-arn arn:aws:iam::123456789012:role/rol-sagemaker
```
:::

:::ejercicio cli
Paso 7. Crea el endpoint `demoras` con esa configuración. **Desde aquí empieza a cobrar.**
```respuesta
todos: aws sagemaker create-endpoint || --endpoint-name demoras || --endpoint-config-name demoras-cfg
```
```solucion
aws sagemaker create-endpoint --endpoint-name demoras --endpoint-config-name demoras-cfg
```
```setup
aws sagemaker create-model --model-name demoras-v1 --primary-container Image=683313688378.dkr.ecr.us-east-1.amazonaws.com/sagemaker-xgboost:1.7-1,ModelDataUrl=s3://ml-demoras-lab/modelos/demoras-v1/output/model.tar.gz --execution-role-arn arn:aws:iam::123456789012:role/rol-sagemaker
aws sagemaker create-endpoint-config --endpoint-config-name demoras-cfg --production-variants VariantName=AllTraffic,ModelName=demoras-v1,InstanceType=ml.m5.large,InitialInstanceCount=1
```
:::

:::ejercicio cli
Paso 8. Invoca el endpoint con el CSV `12.5,3,1` (distancia, bultos, es_feriado) y guarda la respuesta en `prediccion.csv`.
```respuesta
todos: aws sagemaker-runtime invoke-endpoint || --endpoint-name demoras || --content-type text/csv || --body ['"]?12\.5,3,1['"]? || prediccion\.csv
```
```solucion
aws sagemaker-runtime invoke-endpoint --endpoint-name demoras --content-type text/csv --body "12.5,3,1" prediccion.csv
```
```setup
aws sagemaker create-model --model-name demoras-v1 --primary-container Image=683313688378.dkr.ecr.us-east-1.amazonaws.com/sagemaker-xgboost:1.7-1,ModelDataUrl=s3://ml-demoras-lab/modelos/demoras-v1/output/model.tar.gz --execution-role-arn arn:aws:iam::123456789012:role/rol-sagemaker
aws sagemaker create-endpoint-config --endpoint-config-name demoras-cfg --production-variants VariantName=AllTraffic,ModelName=demoras-v1,InstanceType=ml.m5.large,InitialInstanceCount=1
aws sagemaker create-endpoint --endpoint-name demoras --endpoint-config-name demoras-cfg
```
```explicacion
Lee el resultado con `cat prediccion.csv`: es la probabilidad de demora. En la CLI v2, si el body no es binario, agrega `--cli-binary-format raw-in-base64-out`.
```
:::

## En tu cuenta real

- El **rol** necesita la política `AmazonSageMakerFullAccess` (o una mínima) y acceso al bucket.
- El script de entrenamiento lee los datos de `/opt/ml/input/data/train/` y escribe el modelo en `/opt/ml/model/`. Con la imagen integrada de XGBoost alcanza con pasar un canal `train` con un CSV sin encabezado y la etiqueta en la primera columna.
- El endpoint tarda de 5 a 10 minutos en quedar `InService`: `aws sagemaker wait endpoint-in-service --endpoint-name demoras`.

```python norun
import sagemaker
from sagemaker.estimator import Estimator

sesion = sagemaker.Session()
imagen = sagemaker.image_uris.retrieve("xgboost", sesion.boto_region_name, "1.7-1")
est = Estimator(
    image_uri=imagen, role="arn:aws:iam::123456789012:role/rol-sagemaker",
    instance_count=1, instance_type="ml.m5.xlarge",
    use_spot_instances=True, max_run=3600, max_wait=7200,
    checkpoint_s3_uri="s3://ml-demoras-lab/checkpoints/",
    output_path="s3://ml-demoras-lab/modelos/",
    hyperparameters={"objective": "binary:logistic", "num_round": 200},
)
est.fit({"train": "s3://ml-demoras-lab/datos/train/"})
pred = est.deploy(initial_instance_count=1, instance_type="ml.m5.large")
# … pruebas …
pred.delete_endpoint()  # ¡no te olvides!
```

## Limpieza

El orden importa: primero el endpoint, después su configuración y por último el modelo.

:::ejercicio cli
Borra el endpoint `demoras`.
```respuesta
aws sagemaker delete-endpoint --endpoint-name demoras
```
```setup
aws sagemaker create-model --model-name demoras-v1 --primary-container Image=683313688378.dkr.ecr.us-east-1.amazonaws.com/sagemaker-xgboost:1.7-1,ModelDataUrl=s3://ml-demoras-lab/modelos/demoras-v1/output/model.tar.gz --execution-role-arn arn:aws:iam::123456789012:role/rol-sagemaker
aws sagemaker create-endpoint-config --endpoint-config-name demoras-cfg --production-variants VariantName=AllTraffic,ModelName=demoras-v1,InstanceType=ml.m5.large,InitialInstanceCount=1
aws sagemaker create-endpoint --endpoint-name demoras --endpoint-config-name demoras-cfg
```
:::

:::ejercicio cli
Borra la configuración `demoras-cfg` y el modelo `demoras-v1`, y verifica con `list-endpoints` que no queda nada.
```respuesta
todos: aws sagemaker delete-endpoint-config --endpoint-config-name demoras-cfg || aws sagemaker delete-model --model-name demoras-v1 || aws sagemaker list-endpoints\S*
```
```solucion
aws sagemaker delete-endpoint-config --endpoint-config-name demoras-cfg && aws sagemaker delete-model --model-name demoras-v1 && aws sagemaker list-endpoints
```
```setup
aws sagemaker create-model --model-name demoras-v1 --primary-container Image=683313688378.dkr.ecr.us-east-1.amazonaws.com/sagemaker-xgboost:1.7-1,ModelDataUrl=s3://ml-demoras-lab/modelos/demoras-v1/output/model.tar.gz --execution-role-arn arn:aws:iam::123456789012:role/rol-sagemaker
aws sagemaker create-endpoint-config --endpoint-config-name demoras-cfg --production-variants VariantName=AllTraffic,ModelName=demoras-v1,InstanceType=ml.m5.large,InitialInstanceCount=1
```
:::

```bash norun
aws s3 rb s3://ml-demoras-lab --force
```

## Preguntas de examen

:::ejercicio quiz
Un entrenamiento de 6 horas con Spot se interrumpe a las 5 horas y vuelve a empezar desde cero. ¿Qué faltó?

- [ ] Aumentar `MaxRuntimeInSeconds`
- [x] Configurar `checkpoint_s3_uri` y que el script guarde y retome los checkpoints
- [ ] Usar más instancias
- [ ] Desactivar Spot en la última hora
:::

:::ejercicio quiz
Un modelo recibe 20 predicciones por día, en horarios impredecibles, y cada una tolera un arranque en frío de unos segundos. ¿Qué opción de inferencia minimiza el costo?

- [ ] Endpoint en tiempo real con una instancia
- [x] Serverless Inference
- [ ] Batch Transform cada hora
- [ ] Un endpoint multimodelo
:::

:::ejercicio quiz
¿Qué tres recursos de SageMaker necesitas, en orden, para tener un endpoint en tiempo real?

- [ ] Training job, pipeline y endpoint
- [x] Modelo, configuración de endpoint y endpoint
- [ ] Notebook, modelo y endpoint
- [ ] Dominio, perfil de usuario y endpoint
:::
