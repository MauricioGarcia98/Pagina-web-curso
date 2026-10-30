---
titulo: "Laboratorio Google Cloud: Pub/Sub a BigQuery, Workflows, Scheduler y Vertex AI"
nivel: Avanzado
duracion: 60
resumen: Ingesta de eventos sin código con una suscripción de Pub/Sub que escribe directo en BigQuery, un proceso de dos pasos con Workflows disparado cada noche por Cloud Scheduler, y un modelo publicado en un endpoint de Vertex AI con división de tráfico, predicción y limpieza (retirar el modelo antes de borrar el endpoint). Cubre ingesta y operación del PDE y despliegue del PMLE.
objetivos: Crear una suscripción de BigQuery en Pub/Sub y verificar las filas | Desplegar y ejecutar un workflow desde un YAML | Programar el workflow con Cloud Scheduler en tu zona horaria | Subir un modelo al Model Registry, desplegarlo en un endpoint y predecir | Retirar el modelo y borrar el endpoint
autoevaluacion: ¿Sabes cuándo alcanza una suscripción de BigQuery y cuándo necesitas Dataflow? | ¿Sabes cuántos campos tiene el cron de Cloud Scheduler? | ¿Sabes por qué un endpoint de Vertex AI cobra sin tráfico? | ¿Sabes en qué orden se limpia un endpoint?
---

:::escenario
La app de la tienda manda cada clic a Pub/Sub y hoy un servicio propio los copia a BigQuery (y se cae). Además, el resumen de ventas se refresca a mano cada mañana, y el equipo de ciencia de datos quiere publicar su modelo de segmentos para que la web lo consulte.
:::

## Arquitectura

```diagrama
titulo: Ingesta, orquestación y modelo en Google Cloud
nodo app: App | icono=movil | col=0 | fila=0
nodo ps: Pub/Sub clics-lab | icono=pubsub | col=1 | fila=0 | color=azul
nodo bq: BigQuery eventos_lab.clics | icono=bigquery | col=2 | fila=0 | sub=suscripción de BigQuery | color=azul
nodo sch: Cloud Scheduler | icono=reloj | col=0 | fila=1 | sub=03:30 Buenos Aires | color=naranja
nodo wf: Workflows | icono=orquestador | col=1 | fila=1 | sub=cargar → transformar | color=naranja
nodo bq2: BigQuery resumen | icono=bigquery | col=2 | fila=1 | color=azul
nodo reg: Model Registry | icono=ml | col=0 | fila=2 | sub=segmento-v1 | color=verde
nodo ep: Endpoint Vertex AI | icono=agentplatform | col=1 | fila=2 | sub=min 1 réplica | color=rojo
nodo web: Web | icono=usuario | col=2 | fila=2
flecha app -> ps
flecha ps -> bq
flecha sch -> wf
flecha wf -> bq2
flecha reg -> ep
flecha web -> ep: predict
```

## Costo en una cuenta real

| Recurso | Costo |
|---|---|
| Pub/Sub y suscripción de BigQuery | Capa gratuita (10 GB por mes) |
| Workflows y Cloud Scheduler | Capa gratuita (5.000 pasos, 3 jobs) |
| Endpoint de Vertex AI `n1-standard-2` | Unos USD 0,10 por hora **mientras tenga un modelo desplegado** |

## Práctica guiada: eventos a BigQuery sin código

:::ejercicio cli
Paso 1. Prepara los archivos con `lab-preparar gcp`, crea el dataset `eventos_lab` y la tabla `eventos_lab.clics` con el esquema `evento:STRING,usuario:STRING,ts:TIMESTAMP`.
```respuesta
todos: lab-preparar gcp || bq mk --dataset eventos_lab || bq mk --table eventos_lab\.clics evento:STRING,usuario:STRING,ts:TIMESTAMP
todos: bq mk --dataset eventos_lab || bq mk --table eventos_lab\.clics evento:STRING,usuario:STRING,ts:TIMESTAMP
```
```solucion
lab-preparar gcp && bq mk --dataset eventos_lab && bq mk --table eventos_lab.clics evento:STRING,usuario:STRING,ts:TIMESTAMP
```
:::

:::ejercicio cli
Paso 2. Crea el tópico `clics-lab` y la suscripción `clics-a-bq` que escriba en `academia-datos-dev:eventos_lab.clics`.
```respuesta
todos: gcloud pubsub topics create clics-lab || gcloud pubsub subscriptions create clics-a-bq || --topic(=| )clics-lab || --bigquery-table(=| )academia-datos-dev[:.]eventos_lab\.clics
```
```solucion
gcloud pubsub topics create clics-lab && gcloud pubsub subscriptions create clics-a-bq --topic clics-lab --bigquery-table academia-datos-dev:eventos_lab.clics
```
```setup
bq mk --dataset eventos_lab
bq mk --table eventos_lab.clics evento:STRING,usuario:STRING,ts:TIMESTAMP
```
```explicacion
La suscripción de BigQuery mapea los campos del JSON a las columnas. Alcanza cuando no hay transformación; si necesitas limpiar, enriquecer o agrupar por ventanas, usa Dataflow.
```
:::

:::ejercicio cli
Paso 3. Publica el evento `{"evento":"compra","usuario":"u1","ts":"2026-10-29 10:00:00"}` en `clics-lab`.
```respuesta
todos: gcloud pubsub topics publish clics-lab || --message
```
```solucion
gcloud pubsub topics publish clics-lab --message '{"evento":"compra","usuario":"u1","ts":"2026-10-29 10:00:00"}'
```
```setup
bq mk --dataset eventos_lab
bq mk --table eventos_lab.clics evento:STRING,usuario:STRING,ts:TIMESTAMP
gcloud pubsub topics create clics-lab
gcloud pubsub subscriptions create clics-a-bq --topic clics-lab --bigquery-table academia-datos-dev:eventos_lab.clics
```
:::

:::ejercicio cli
Paso 4. Comprueba en BigQuery que llegó: cuenta las filas de `eventos_lab.clics` por `evento`.
```respuesta
todos: bq query || --use_legacy_sql=false || .*eventos_lab\.clics\S* || .*GROUP BY evento\S*
```
```solucion
bq query --use_legacy_sql=false 'SELECT evento, COUNT(*) AS n FROM eventos_lab.clics GROUP BY evento'
```
```setup
bq mk --dataset eventos_lab
bq mk --table eventos_lab.clics evento:STRING,usuario:STRING,ts:TIMESTAMP
gcloud pubsub topics create clics-lab
gcloud pubsub subscriptions create clics-a-bq --topic clics-lab --bigquery-table academia-datos-dev:eventos_lab.clics
gcloud pubsub topics publish clics-lab --message '{"evento":"vista","usuario":"u2","ts":"2026-10-29 10:01:00"}'
```
:::

## Práctica guiada: orquestación

:::ejercicio cli
Paso 5. Despliega el workflow `refrescar-ventas` desde `labs/gcp/workflow.yaml` en `us-central1`. Revisa antes el YAML con `cat`.
```respuesta
todos: gcloud workflows deploy refrescar-ventas || --source(=| )labs/gcp/workflow\.yaml
```
```solucion
gcloud workflows deploy refrescar-ventas --source labs/gcp/workflow.yaml --location us-central1
```
```setup
lab-preparar gcp
```
:::

:::ejercicio cli
Paso 6. Ejecuta el workflow y espera el resultado.
```respuesta
gcloud workflows run refrescar-ventas( --location(=| )us-central1)?
```
```solucion
gcloud workflows run refrescar-ventas --location us-central1
```
```setup
lab-preparar gcp
gcloud workflows deploy refrescar-ventas --source labs/gcp/workflow.yaml --location us-central1
```
:::

:::ejercicio cli
Paso 7. Programa el job HTTP `refresco-nocturno` de Cloud Scheduler que dispare el workflow **todos los días a las 03:30 en Buenos Aires**, con `POST` a `https://workflowexecutions.googleapis.com/v1/projects/academia-datos-dev/locations/us-central1/workflows/refrescar-ventas/executions`.
```respuesta
todos: gcloud scheduler jobs create http refresco-nocturno || --schedule(=| )['"]30 3 \* \* \*['"] || --uri(=| )https://workflowexecutions\.googleapis\.com/\S+ || --http-method(=| )POST || --time-zone(=| )America/Argentina/Buenos_Aires
```
```solucion
gcloud scheduler jobs create http refresco-nocturno --schedule="30 3 * * *" --uri=https://workflowexecutions.googleapis.com/v1/projects/academia-datos-dev/locations/us-central1/workflows/refrescar-ventas/executions --http-method=POST --time-zone=America/Argentina/Buenos_Aires --location us-central1
```
```explicacion
Cloud Scheduler usa cron de **cinco** campos y acepta zona horaria. En una cuenta real agrega `--oauth-service-account-email` con una cuenta que tenga `roles/workflows.invoker`.
```
:::

## Práctica guiada: modelo en Vertex AI

:::ejercicio cli
Paso 8. Sube el modelo `segmento-v1` al Model Registry con la imagen `us-docker.pkg.dev/vertex-ai/prediction/sklearn-cpu.1-5:latest` y los artefactos en `gs://academia-modelos/segmento/`.
```respuesta
todos: gcloud ai models upload || --display-name(=| )segmento-v1 || --container-image-uri(=| )us-docker\.pkg\.dev/vertex-ai/prediction/sklearn-cpu\.1-5:latest || --artifact-uri(=| )gs://academia-modelos/segmento/
```
```solucion
gcloud ai models upload --region us-central1 --display-name segmento-v1 --container-image-uri us-docker.pkg.dev/vertex-ai/prediction/sklearn-cpu.1-5:latest --artifact-uri gs://academia-modelos/segmento/
```
:::

:::ejercicio cli
Paso 9. Crea el endpoint `segmento` y despliega el modelo con una máquina `n1-standard-2`, de 1 a 2 réplicas y el 100 % del tráfico (`--traffic-split 0=100`).
```respuesta
todos: gcloud ai endpoints create || --display-name(=| )segmento || gcloud ai endpoints deploy-model segmento || --model(=| )segmento-v1 || --machine-type(=| )n1-standard-2 || --traffic-split(=| )0=100
```
```solucion
gcloud ai endpoints create --region us-central1 --display-name segmento && gcloud ai endpoints deploy-model segmento --region us-central1 --model segmento-v1 --display-name segmento-v1 --machine-type n1-standard-2 --min-replica-count 1 --max-replica-count 2 --traffic-split 0=100
```
```setup
gcloud ai models upload --region us-central1 --display-name segmento-v1 --container-image-uri us-docker.pkg.dev/vertex-ai/prediction/sklearn-cpu.1-5:latest --artifact-uri gs://academia-modelos/segmento/
```
```explicacion
En la CLI real, `ENDPOINT` y `--model` son los **ids** numéricos (los ves con `gcloud ai endpoints list` y `gcloud ai models list`). La terminal del curso acepta también el nombre visible para que el laboratorio sea más corto. `0=100` significa "el modelo que estoy desplegando recibe el 100 %".
```
:::

:::ejercicio cli
Paso 10. Pide predicciones al endpoint con el archivo `labs/gcp/instancias.json`.
```respuesta
todos: gcloud ai endpoints predict segmento || --json-request(=| )labs/gcp/instancias\.json
```
```solucion
gcloud ai endpoints predict segmento --region us-central1 --json-request labs/gcp/instancias.json
```
```setup
lab-preparar gcp
gcloud ai models upload --region us-central1 --display-name segmento-v1 --container-image-uri us-docker.pkg.dev/vertex-ai/prediction/sklearn-cpu.1-5:latest --artifact-uri gs://academia-modelos/segmento/
gcloud ai endpoints create --region us-central1 --display-name segmento
gcloud ai endpoints deploy-model segmento --region us-central1 --model segmento-v1 --display-name segmento-v1 --machine-type n1-standard-2 --min-replica-count 1 --max-replica-count 2 --traffic-split 0=100
```
:::

## En tu cuenta real

```bash norun
gcloud services enable pubsub.googleapis.com workflows.googleapis.com cloudscheduler.googleapis.com aiplatform.googleapis.com
# la cuenta de servicio de Pub/Sub necesita escribir en BigQuery
gcloud projects add-iam-policy-binding $PROYECTO \
  --member="serviceAccount:service-$NUMERO@gcp-sa-pubsub.iam.gserviceaccount.com" --role=roles/bigquery.dataEditor
# ids reales del endpoint y del modelo
EP=$(gcloud ai endpoints list --region us-central1 --filter="display_name=segmento" --format="value(name)")
MODELO=$(gcloud ai models list --region us-central1 --filter="display_name=segmento-v1" --format="value(name)")
gcloud ai endpoints deploy-model $EP --region us-central1 --model $MODELO --display-name segmento-v1 \
  --machine-type n1-standard-2 --min-replica-count 1 --max-replica-count 2 --traffic-split 0=100
```

El modelo de sklearn espera en `gs://academia-modelos/segmento/` un archivo `model.joblib` (o `model.pkl`) entrenado con la misma versión de la imagen.

## Limpieza

```bash norun
DM=$(gcloud ai endpoints describe $EP --region us-central1 --format="value(deployedModels[0].id)")
gcloud ai endpoints undeploy-model $EP --region us-central1 --deployed-model-id $DM
gcloud ai endpoints delete $EP --region us-central1 --quiet
gcloud ai models delete $MODELO --region us-central1 --quiet
gcloud scheduler jobs delete refresco-nocturno --location us-central1 --quiet
gcloud workflows delete refrescar-ventas --location us-central1 --quiet
gcloud pubsub subscriptions delete clics-a-bq && gcloud pubsub topics delete clics-lab
bq rm -r -f eventos_lab
```

:::ejercicio cli error
Intenta borrar el endpoint `segmento` **sin** retirar antes el modelo. Lee el error.
```respuesta
gcloud ai endpoints delete segmento( --region(=| )us-central1)?( --quiet)?
```
```solucion
gcloud ai endpoints delete segmento --region us-central1
```
```setup
gcloud ai models upload --region us-central1 --display-name segmento-v1 --container-image-uri us-docker.pkg.dev/vertex-ai/prediction/sklearn-cpu.1-5:latest --artifact-uri gs://academia-modelos/segmento/
gcloud ai endpoints create --region us-central1 --display-name segmento
gcloud ai endpoints deploy-model segmento --region us-central1 --model segmento-v1 --display-name segmento-v1 --machine-type n1-standard-2 --min-replica-count 1 --max-replica-count 2 --traffic-split 0=100
```
:::

:::ejercicio cli
Ahora hazlo bien: retira el modelo desplegado `segmento-v1` del endpoint y después borra el endpoint.
```respuesta
todos: gcloud ai endpoints undeploy-model segmento || --deployed-model-id(=| )\S+ || gcloud ai endpoints delete segmento
```
```solucion
gcloud ai endpoints undeploy-model segmento --region us-central1 --deployed-model-id segmento-v1 && gcloud ai endpoints delete segmento --region us-central1
```
```setup
gcloud ai models upload --region us-central1 --display-name segmento-v1 --container-image-uri us-docker.pkg.dev/vertex-ai/prediction/sklearn-cpu.1-5:latest --artifact-uri gs://academia-modelos/segmento/
gcloud ai endpoints create --region us-central1 --display-name segmento
gcloud ai endpoints deploy-model segmento --region us-central1 --model segmento-v1 --display-name segmento-v1 --machine-type n1-standard-2 --min-replica-count 1 --max-replica-count 2 --traffic-split 0=100
```
:::

:::ejercicio cli
Borra también el job `refresco-nocturno` de Cloud Scheduler.
```respuesta
gcloud scheduler jobs delete refresco-nocturno( --location(=| )us-central1)?( --quiet)?
```
```solucion
gcloud scheduler jobs delete refresco-nocturno --location us-central1
```
```setup
gcloud scheduler jobs create http refresco-nocturno --schedule="30 3 * * *" --uri=https://workflowexecutions.googleapis.com/v1/projects/academia-datos-dev/locations/us-central1/workflows/refrescar-ventas/executions --http-method=POST --time-zone=America/Argentina/Buenos_Aires --location us-central1
```
:::

:::errores
- **Esquema de la suscripción distinto del de la tabla**: la suscripción de Pub/Sub a BigQuery rechaza los mensajes. Hay que configurar la tabla de mensajes no entregados (*dead letter*) para no perderlos.
- **Cloud Scheduler sin zona horaria** explícita: el proceso de "la noche" corre a otra hora.
- **Workflows sin manejo de errores**: un paso que falla deja el proceso a medias sin aviso; se agregan reintentos y un paso de notificación.
- **Dividir el tráfico de un endpoint y no comparar métricas** entre las dos versiones: la división no sirve si no se mide.
- **Dejar el endpoint de Vertex AI con una réplica mínima encendida**: cobra por hora aunque no reciba tráfico.
:::

:::trabajo
- La suscripción directa de Pub/Sub a BigQuery reemplaza muchos jobs de Dataflow simples: cuando no hay transformación, es la ingesta más barata y con menos mantenimiento.
- Workflows y Cloud Scheduler se usan para procesos cortos de pocos pasos; para pipelines con muchas dependencias, Composer (Airflow).
:::

:::entrevista "¿Cómo publicarías una nueva versión de un modelo sin riesgo para los usuarios?"
Desplegaría la nueva versión en el mismo endpoint con una división de tráfico pequeña, por ejemplo 10 %, compararía métricas de negocio y técnicas con la versión actual, y aumentaría el tráfico de a poco si todo va bien. Si algo empeora, vuelvo el tráfico a la versión anterior sin redesplegar. Antes, la evaluaría fuera de línea con datos recientes y la registraría con su versión.
:::

## Preguntas de examen

:::ejercicio quiz
Los eventos de Pub/Sub deben llegar a BigQuery tal cual, sin transformación, con el menor mantenimiento posible. ¿Qué eliges?

- [ ] Un job de Dataflow con la plantilla Pub/Sub a BigQuery
- [x] Una suscripción de BigQuery en Pub/Sub
- [ ] Una Cloud Run function que inserte cada mensaje
- [ ] Un DAG de Composer que lea cada 5 minutos
:::

:::ejercicio quiz
Quieres probar una versión nueva del modelo con el 10 % del tráfico en el mismo endpoint de Vertex AI. ¿Qué haces?

- [ ] Creas un segundo endpoint y repartes en el balanceador
- [x] Despliegas la versión nueva en el mismo endpoint con `--traffic-split` 90/10
- [ ] Reemplazas el modelo del endpoint
- [ ] Usas predicción por lotes con el 10 % de los datos
:::

:::ejercicio quiz
Un endpoint de Vertex AI sin tráfico sigue cobrando. ¿Por qué?

- [ ] Por el almacenamiento del modelo en el registro
- [x] Porque mantiene al menos `min-replica-count` máquinas encendidas mientras tenga un modelo desplegado
- [ ] Por las llamadas de monitoreo de salud
- [ ] No debería cobrar: es un error de facturación
:::
