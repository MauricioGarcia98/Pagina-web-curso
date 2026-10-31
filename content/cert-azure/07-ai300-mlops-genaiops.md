---
titulo: AI-300 - MLOps con Azure Machine Learning y GenAIOps con Foundry
nivel: Experto
duracion: 60
resumen: El temario de AI-300 - infraestructura de MLOps como código (workspace, cómputo, datos, entornos, registros), ciclo de vida de modelos (jobs, componentes y pipelines, MLflow, registro, endpoints online y batch, despliegue azul-verde, monitoreo y deriva), infraestructura de GenAIOps en Foundry, calidad y observabilidad de la IA generativa, y optimización de costo y rendimiento.
objetivos: Definir la infraestructura de Azure Machine Learning con la CLI v2 y archivos YAML | Entrenar con jobs y pipelines registrando todo con MLflow, y promover modelos entre entornos con registros | Desplegar en endpoints online con despliegue azul-verde y en endpoints batch | Montar un pipeline de CI/CD que evalúe una aplicación generativa antes de desplegarla | Monitorear deriva, calidad y costo, y elegir la optimización correcta
prerrequisitos: cert-azure-ai103-foundry-agentes | cert-databricks-ml-associate
autoevaluacion: ¿Sabes qué es un componente y para qué sirve un registro de Azure ML? | ¿Sabes repartir tráfico entre dos despliegues de un endpoint? | ¿Sabes cuándo usar un endpoint batch? | ¿Sabes qué debería frenar un despliegue de una app generativa en CI? | ¿Sabes reducir el costo de una app generativa sin perder calidad?
---

:::escenario
La cadena de farmacias tiene un modelo que predice la demanda de cada producto por sucursal y el asistente de Lucía en producción. Hoy los científicos entrenan desde sus notebooks, copian el modelo a mano y nadie sabe qué versión está en producción ni si sigue siendo bueno. El nuevo puesto de **ingeniero de MLOps** debe automatizarlo todo: infraestructura como código, entrenamiento reproducible, despliegue sin cortes, evaluación automática y monitoreo. Ese es el temario de AI-300, el reemplazo de DP-100.
:::

## La infraestructura de MLOps

**Azure Machine Learning** organiza el trabajo en un **workspace**, con:

| Recurso | Qué es |
|---|---|
| **Cómputo** | *Compute instances* (máquinas de desarrollo), *compute clusters* (escalan a cero, para entrenar), **cómputo serverless** (sin administrar clústeres), clústeres de Kubernetes adjuntos |
| **Datastores** | Conexiones a almacenamiento (Blob, ADLS Gen2), preferentemente con identidad y no con claves |
| **Data assets** | Datos versionados: `uri_file`, `uri_folder` o `mltable` |
| **Environments** | Imagen Docker + dependencias (conda o pip), versionados |
| **Componentes** | Pasos reutilizables con entradas, salidas, código y entorno |
| **Registros** (*registries*) | Repositorio **compartido entre workspaces** de modelos, componentes y entornos: se entrena en dev y se promueve el mismo modelo a prod |

Todo se define como **código**: archivos YAML con la **CLI v2** (`az ml`) o el SDK de Python v2, y la infraestructura de Azure con **Bicep** o **Terraform**, desplegada desde CI con identidades federadas (OIDC), no con secretos.

```yaml
# job-entrenar.yml: un job de comando
$schema: https://azuremlschemas.azureedge.net/latest/commandJob.schema.json
code: ./src
command: python entrenar.py --datos ${{inputs.ventas}} --max_depth ${{inputs.max_depth}}
inputs:
  ventas: { type: uri_folder, path: azureml:ventas_sucursales@latest }
  max_depth: 6
environment: azureml:entorno-demanda@latest
compute: azureml:cluster-cpu
experiment_name: demanda
```

```bash norun
az ml job create --file job-entrenar.yml --workspace-name ws-ml-dev --resource-group rg-ml
```

## El ciclo de vida del modelo

- **Seguimiento con MLflow**: Azure ML es compatible con MLflow; `mlflow.autolog()` registra parámetros, métricas y el modelo de cada job.
- **Pipelines**: encadenan componentes (preparar → entrenar → evaluar → registrar) y se pueden **programar** o disparar desde CI. Los **sweep jobs** ajustan hiperparámetros (muestreo aleatorio, grilla o bayesiano, con terminación temprana).
- **Registro de modelos**: versiones con etiquetas y métricas; un paso de **evaluación** compara el candidato con el modelo en producción y solo lo registra o promueve si mejora.
- **IA responsable**: el panel de IA responsable (explicabilidad, análisis de errores, equidad) como parte de la evaluación.

### Desplegar

| Tipo | Para | Cómo |
|---|---|---|
| **Endpoint online administrado** | Predicciones en tiempo real | Un endpoint con uno o más **despliegues**; el tráfico se reparte entre ellos |
| **Endpoint batch** | Puntuar archivos o tablas grandes de forma asíncrona | Jobs de inferencia en un clúster que escala a cero |
| Endpoint serverless / Foundry | Modelos del catálogo con pago por uso | Desde Foundry |

**Despliegue azul-verde** (o *canary*): el endpoint tiene el despliegue `azul` (actual) y se agrega `verde` (nuevo). Primero se **espeja** un porcentaje del tráfico al verde sin afectar respuestas (*mirror traffic*), después se le da un 10 % del tráfico real, y si las métricas acompañan, el 100 %. Si algo sale mal, se vuelve el tráfico al azul sin cortes.

```bash norun
az ml online-endpoint create --file endpoint.yml
az ml online-deployment create --file deploy-verde.yml --endpoint-name demanda-api
az ml online-endpoint update --name demanda-api --traffic "azul=90 verde=10"
```

### Monitorear el modelo

- **Deriva de datos** (*data drift*): la distribución de las entradas cambia respecto del entrenamiento. **Deriva de predicción**: cambian las salidas. **Calidad**: cuando llega la etiqueta real, se comparan métricas.
- El **monitoreo de modelos** de Azure ML compara los datos de producción (recolectados del endpoint) con una referencia, calcula métricas por ventana de tiempo y envía alertas; una alerta puede disparar el pipeline de **reentrenamiento**.
- Métricas operativas (latencia, errores, uso de CPU y memoria) en **Azure Monitor** y **Application Insights**.

```diagrama
titulo: El ciclo de MLOps en Azure
nodo git: Repositorio | icono=github | col=0 | fila=0 | sub=código + YAML
nodo ci: CI/CD | icono=githubactions | col=1 | fila=0 | sub=tests, entrenar, evaluar
nodo reg: Registro compartido | icono=capas | col=2 | fila=0 | sub=modelo versionado | color=violeta
nodo ep: Endpoint online | icono=api | col=3 | fila=0 | sub=azul 90 % · verde 10 % | color=verde
nodo mon: Monitoreo | icono=monitor | col=3 | fila=1 | sub=deriva, calidad, latencia | color=naranja
nodo re: Reentrenamiento | icono=reloj | col=1 | fila=1 | sub=pipeline programado o por alerta | color=azul
flecha git -> ci
flecha ci -> reg: si mejora
flecha reg -> ep: desplegar
flecha ep -> mon
flecha mon -> re: alerta de deriva | estilo=punteada
flecha re -> reg | estilo=punteada
```

## GenAIOps: operar aplicaciones generativas

Las aplicaciones generativas tienen su propio ciclo: el "modelo" es una combinación de **modelo base + prompt + herramientas + datos de recuperación**, y la calidad no se mide con una sola métrica.

### Infraestructura

- **Proyectos de Foundry** por entorno (dev, test, prod) con conexiones, despliegues de modelos y agentes definidos como código (Bicep/Terraform y el SDK).
- **Versionado** de prompts, configuraciones de agentes y conjuntos de evaluación en Git.
- **Identidades administradas**, private endpoints, cuotas y políticas de contenido por entorno.

### Calidad y observabilidad

- **Evaluación en CI**: cada cambio de prompt, modelo o datos de recuperación corre las **evaluaciones** (groundedness, relevancia, coherencia; para agentes, exactitud de herramientas e intención; y evaluadores de seguridad) sobre un conjunto fijo. El pipeline **falla** si alguna métrica cae por debajo del umbral acordado.
- **Red teaming** automatizado antes de publicar.
- **Trazas** con OpenTelemetry en Application Insights: cada solicitud con sus pasos, tokens, latencia y errores.
- **Monitoreo continuo**: evaluaciones sobre una muestra del tráfico real, alertas de seguridad y de calidad, y **feedback** de los usuarios.

### Optimizar

| Problema | Opciones |
|---|---|
| Costo alto | Modelo más chico para tareas simples (o **enrutamiento** entre modelos), menos contexto (mejor recuperación, resúmenes del historial), **caché de prompts**, Batch para lo asíncrono, **destilación** (ajustar un modelo chico con salidas del grande) |
| Latencia alta | Respuestas en *streaming*, modelos más rápidos, **Provisioned** para latencia predecible, menos pasos de herramientas |
| Errores 429 | Más cuota, Global Standard, Provisioned, reintentos con espera exponencial |
| Calidad baja en una tarea específica | Mejor prompt y ejemplos, mejor recuperación, y recién después **ajuste fino** (con su propio ciclo de evaluación y despliegue) |

:::examen Lo típico de AI-300
- "Usar el mismo modelo entrenado en el workspace de dev en el de prod, con trazabilidad" → **registro** de Azure ML (compartido entre workspaces).
- "Probar un modelo nuevo con el 10 % del tráfico sin cortar el servicio" → **despliegue azul-verde** con reparto de tráfico.
- "Puntuar 50 millones de filas cada noche" → **endpoint batch**.
- "Que un cambio de prompt no llegue a producción si baja la groundedness" → **evaluación automática en CI** con umbral.
- "Detectar que los datos de entrada cambiaron respecto del entrenamiento" → **monitoreo de deriva de datos**.
- "Reducir el costo de una app que usa el modelo más grande para clasificar textos simples" → **modelo más chico o enrutamiento**.
:::

:::errores
- **Entrenar desde un notebook y subir el modelo a mano.** Síntoma: nadie sabe con qué datos y código se entrenó. Corrección: jobs y pipelines versionados con MLflow.
- **Pasar el 100 % del tráfico al despliegue nuevo de una vez.** Síntoma: un error afecta a todos los usuarios. Corrección: espejado y luego un porcentaje creciente.
- **Cambiar el prompt en producción "porque es solo texto".** Síntoma: la calidad cae sin que nadie lo note. Corrección: prompts versionados y evaluados en CI.
- **Claves de los servicios en los secretos de CI.** Síntoma: secretos de larga duración expuestos. Corrección: OIDC e identidades administradas.
:::

## Ejercicios

:::ejercicio quiz
El equipo entrena en el workspace de desarrollo y quiere desplegar exactamente el mismo modelo en el workspace de producción, con trazabilidad. ¿Qué usa?
- [ ] Descargar el modelo y subirlo al workspace de producción.
- [x] Un registro de Azure Machine Learning compartido entre los workspaces.
- [ ] Un datastore compartido con el archivo del modelo.
- [ ] Volver a entrenar en producción con otros datos.
```explicacion
Los registros guardan modelos, componentes y entornos compartidos entre workspaces, manteniendo el linaje.
```
:::

:::ejercicio quiz
Hay un despliegue `azul` en producción y uno nuevo `verde`. ¿Cómo pruebas el verde con usuarios reales minimizando el riesgo?
- [ ] Borrar el azul y desplegar el verde.
- [x] Repartir el tráfico del endpoint, por ejemplo 90 % azul y 10 % verde, y aumentarlo si las métricas acompañan.
- [ ] Crear un endpoint nuevo y pedir a los usuarios que cambien la URL.
- [ ] Desplegar el verde en un endpoint batch.
```explicacion
El reparto de tráfico (y el espejado previo) permite probar el despliegue nuevo y volver atrás sin cortes.
```
:::

:::ejercicio quiz
Cada noche hay que puntuar 50 millones de filas de un archivo y guardar los resultados. ¿Qué despliegue conviene?
- [ ] Un endpoint online con muchas instancias.
- [x] Un endpoint batch.
- [ ] Un compute instance encendido toda la noche.
- [ ] Un despliegue Provisioned de Foundry.
```explicacion
Los endpoints batch procesan grandes volúmenes de forma asíncrona en clústeres que escalan a cero.
```
:::

:::ejercicio quiz
¿Qué debería impedir que un cambio de prompt llegue a producción en un pipeline de GenAIOps?
- [ ] Que el prompt tenga más de 500 palabras.
- [x] Que las evaluaciones automáticas (por ejemplo groundedness o seguridad) queden por debajo del umbral acordado.
- [ ] Que el cambio lo haya hecho alguien fuera del equipo de datos.
- [ ] Que el modelo base tenga una versión más nueva disponible.
```explicacion
La evaluación automática en CI con umbrales es la compuerta de calidad de las aplicaciones generativas.
```
:::

:::ejercicio quiz
Una app usa el modelo más grande y caro para clasificar mensajes en 5 categorías simples, con buena precisión. ¿Qué optimización es la más directa?
- [ ] Pasar a Provisioned para pagar menos por token.
- [x] Usar un modelo más chico (o enrutar las tareas simples a uno más chico) y validar la precisión con evaluación.
- [ ] Aumentar la temperatura para respuestas más cortas.
- [ ] Ajustar el modelo grande con más ejemplos.
```explicacion
Una tarea simple no necesita el modelo más grande. Un modelo más chico baja costo y latencia; la evaluación confirma que la calidad se mantiene.
```
:::

:::ejercicio cli
Reparte el tráfico del endpoint online `demanda-api` en 80 % para `azul` y 20 % para `verde`. (El grupo de recursos y el workspace ya están configurados por defecto con `az configure --defaults`, así que no hace falta `-g` ni `-w`.)
```respuesta
az ml online-endpoint update (--name|-n) demanda-api --traffic ['"]?azul=80 verde=20['"]?
```
```solucion
az ml online-endpoint update --name demanda-api --traffic "azul=80 verde=20"
```
```setup
az group create -n rg-ml -l eastus2 -o none
az ml workspace create -n mlw-demanda -g rg-ml -o none
az configure --defaults group=rg-ml workspace=mlw-demanda
az ml online-endpoint create --name demanda-api -o none
printf "name: azul\nendpoint_name: demanda-api\ninstance_type: Standard_DS3_v2\n" > azul.yml
printf "name: verde\nendpoint_name: demanda-api\ninstance_type: Standard_DS3_v2\n" > verde.yml
az ml online-deployment create -f azul.yml --all-traffic -o none
az ml online-deployment create -f verde.yml -o none
```
:::
