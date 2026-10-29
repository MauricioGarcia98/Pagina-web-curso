---
titulo: "Laboratorio Azure: Foundry seguro y despliegue blue/green en Azure ML"
nivel: Avanzado
duracion: 60
resumen: Crea un recurso de Microsoft Foundry (AIServices), despliega un modelo con el SKU adecuado y desactiva las claves para usar solo Entra ID. Después, en Azure Machine Learning, crea un cómputo que escala a cero, entrena con un job YAML, registra dos versiones del modelo y hace un despliegue blue/green con tráfico espejo, canario y corte completo. Es la práctica de AI-103 y AI-300.
objetivos: Crear un recurso Foundry y un despliegue de modelo con el SKU correcto | Desactivar la autenticación por clave y el acceso público | Crear un cómputo de Azure ML que escala a cero y lanzar un job | Desplegar dos versiones en un online endpoint y mover tráfico con espejo y canario | Borrar todo con el grupo de recursos
autoevaluacion: ¿Sabes qué diferencia hay entre los SKU Standard, GlobalStandard y DataZoneStandard? | ¿Sabes qué pasa con las claves si desactivas la autenticación local? | ¿Sabes por qué el cómputo debe tener min-instances 0? | ¿Sabes qué es el tráfico espejo y su límite?
---

:::escenario
Una clínica quiere un asistente con un modelo de OpenAI que procese los datos dentro de la zona de datos de EE. UU. y sin claves compartidas en el código. Su equipo de riesgo, además, tiene un modelo de crédito en Azure ML y quiere cambiarlo por la versión 2 sin cortar el servicio ni arriesgar a todos los clientes a la vez.
:::

## Arquitectura

```diagrama
titulo: Foundry y Azure ML en el grupo rg-lab-ia
nodo app: Aplicación | icono=usuario | col=0 | fila=0 | sub=identidad administrada
nodo fd: Foundry (AIServices) | icono=foundry | col=1 | fila=0 | sub=sin claves | color=azul
nodo dep: Despliegue chat | icono=gemini | col=2 | fila=0 | sub=gpt-4o-mini, DataZoneStandard | color=violeta
nodo job: Job de entrenamiento | icono=codigo | col=0 | fila=2 | sub=cómputo cpu (0 a 2) | color=naranja
nodo reg: Modelo riesgo v1 y v2 | icono=ml | col=1 | fila=2 | color=verde
nodo ep: Online endpoint | icono=api | col=2 | fila=2 | sub=riesgo-credito | color=rojo
nodo b: blue (v1) | icono=servidor | col=3 | fila=1 | color=azul
nodo g: green (v2) | icono=servidor | col=3 | fila=3 | color=verde
flecha app -> fd
flecha fd -> dep
flecha job -> reg
flecha reg -> ep
flecha ep -> b: 90 %
flecha ep -> g: 10 %
```

## Costo en una cuenta real

| Recurso | Costo |
|---|---|
| Recurso Foundry y despliegue estándar | Sin costo fijo: pagas por tokens (centavos en el laboratorio) |
| Workspace de Azure ML | Crea un Storage, un Key Vault y Application Insights: centavos al día |
| Cómputo `amlcompute` con mínimo 0 | Solo mientras corre el job |
| **Online endpoint** con `Standard_DS3_v2` | Unos USD 0,30 por hora **por cada despliegue** (blue y green: el doble) |

:::cuidado Dos despliegues, dos máquinas
Durante el blue/green tienes dos despliegues encendidos. Termina el laboratorio el mismo día y borra el grupo de recursos.
:::

## Práctica guiada: Foundry

:::ejercicio cli
Paso 1. Crea el grupo `rg-lab-ia` en `eastus2` (si no lo hiciste en la lección 1).
```respuesta
todos: az group create || (-n|--name) rg-lab-ia || (-l|--location) eastus2
```
```solucion
az group create -n rg-lab-ia -l eastus2
```
:::

:::ejercicio cli
Paso 2. Crea el recurso de Foundry `foundry-lab-clinica` de tipo `AIServices`, SKU `S0`, con el dominio propio `foundry-lab-clinica`, y muestra su endpoint.
```respuesta
todos: az cognitiveservices account create || (-n|--name) foundry-lab-clinica || (-g|--resource-group) rg-lab-ia || --kind AIServices || --sku S0 || --custom-domain foundry-lab-clinica
```
```solucion
az cognitiveservices account create -n foundry-lab-clinica -g rg-lab-ia --kind AIServices --sku S0 --custom-domain foundry-lab-clinica --query properties.endpoint
```
```setup
az group create -n rg-lab-ia -l eastus2
```
```explicacion
El dominio propio es obligatorio para autenticarse con Entra ID: el token se emite para `https://foundry-lab-clinica.cognitiveservices.azure.com`.
```
:::

:::ejercicio cli
Paso 3. Despliega `gpt-4o-mini` versión `2024-07-18` con el nombre `chat`, formato `OpenAI` y SKU **`DataZoneStandard`** (el procesamiento queda dentro de la zona de datos de EE. UU.), con capacidad 10.
```respuesta
todos: az cognitiveservices account deployment create || (-n|--name) foundry-lab-clinica || --deployment-name chat || --model-name gpt-4o-mini || --model-version 2024-07-18 || --model-format OpenAI || --sku-name DataZoneStandard || --sku-capacity 10
```
```solucion
az cognitiveservices account deployment create -n foundry-lab-clinica -g rg-lab-ia --deployment-name chat --model-name gpt-4o-mini --model-version 2024-07-18 --model-format OpenAI --sku-name DataZoneStandard --sku-capacity 10
```
```setup
az group create -n rg-lab-ia -l eastus2
az cognitiveservices account create -n foundry-lab-clinica -g rg-lab-ia --kind AIServices --sku S0 --custom-domain foundry-lab-clinica
```
```explicacion
`Standard` procesa en la región del recurso; `GlobalStandard` en cualquier región del mundo (más capacidad y mejor precio); `DataZoneStandard` dentro de la zona de datos (EE. UU. o UE); `Provisioned…` reserva capacidad (PTU); `Batch` procesa lotes con descuento.
```
:::

:::ejercicio cli
Paso 4. Desactiva la autenticación por clave (`--disable-local-auth true`) y el acceso público (`--public-network-access Disabled`).
```respuesta
todos: az cognitiveservices account update || (-n|--name) foundry-lab-clinica || --disable-local-auth true || --public-network-access Disabled
```
```solucion
az cognitiveservices account update -n foundry-lab-clinica -g rg-lab-ia --disable-local-auth true --public-network-access Disabled
```
```setup
az group create -n rg-lab-ia -l eastus2
az cognitiveservices account create -n foundry-lab-clinica -g rg-lab-ia --kind AIServices --sku S0 --custom-domain foundry-lab-clinica
```
:::

:::ejercicio cli error
Paso 5. Intenta listar las claves del recurso. Lee el error: es lo que querías.
```respuesta
az cognitiveservices account keys list (-n|--name) foundry-lab-clinica (-g|--resource-group) rg-lab-ia
az cognitiveservices account keys list (-g|--resource-group) rg-lab-ia (-n|--name) foundry-lab-clinica
```
```solucion
az cognitiveservices account keys list -n foundry-lab-clinica -g rg-lab-ia
```
```setup
az group create -n rg-lab-ia -l eastus2
az cognitiveservices account create -n foundry-lab-clinica -g rg-lab-ia --kind AIServices --sku S0 --custom-domain foundry-lab-clinica
az cognitiveservices account update -n foundry-lab-clinica -g rg-lab-ia --disable-local-auth true
```
```explicacion
Sin claves, la aplicación se autentica con su **identidad administrada** y el rol `Cognitive Services OpenAI User` (o `Azure AI User`) sobre el recurso.
```
:::

## Práctica guiada: Azure ML blue/green

:::ejercicio cli
Paso 6. Crea el workspace `mlw-lab` y un cómputo `cpu` de tipo `amlcompute` que escale **de 0 a 2** instancias.
```respuesta
todos: az ml workspace create || (-n|--name) mlw-lab || az ml compute create || --type amlcompute || --min-instances 0 || --max-instances 2
```
```solucion
az ml workspace create -n mlw-lab -g rg-lab-ia && az ml compute create -w mlw-lab -g rg-lab-ia -n cpu --type amlcompute --min-instances 0 --max-instances 2
```
```setup
lab-preparar azureml
az group create -n rg-lab-ia -l eastus2
```
```explicacion
Con mínimo 0 el clúster se apaga solo cuando no hay jobs. La terminal ya preparó los YAML del laboratorio en `~/labs/azureml/` (`lab-preparar azureml`).
```
:::

:::ejercicio cli
Paso 7. Lanza el job de entrenamiento definido en `labs/azureml/job.yml` (míralo antes con `cat`).
```respuesta
todos: az ml job create || (-f|--file) labs/azureml/job\.yml
```
```solucion
az ml job create -w mlw-lab -g rg-lab-ia -f labs/azureml/job.yml
```
```setup
lab-preparar azureml
az group create -n rg-lab-ia -l eastus2
az ml workspace create -n mlw-lab -g rg-lab-ia
az ml compute create -w mlw-lab -g rg-lab-ia -n cpu --type amlcompute --min-instances 0 --max-instances 2
```
:::

:::ejercicio cli
Paso 8. Crea el online endpoint `riesgo-credito` y el despliegue `blue` (de `labs/azureml/blue.yml`) con **todo** el tráfico.
```respuesta
todos: az ml online-endpoint create || (-n|--name) riesgo-credito || az ml online-deployment create || (-f|--file) labs/azureml/blue\.yml || --all-traffic
```
```solucion
az ml online-endpoint create -w mlw-lab -g rg-lab-ia -n riesgo-credito && az ml online-deployment create -w mlw-lab -g rg-lab-ia -f labs/azureml/blue.yml --all-traffic
```
```setup
lab-preparar azureml
az group create -n rg-lab-ia -l eastus2
az ml workspace create -n mlw-lab -g rg-lab-ia
```
:::

:::ejercicio cli
Paso 9. Invoca el endpoint con `labs/azureml/solicitud.json`.
```respuesta
todos: az ml online-endpoint invoke || (-n|--name) riesgo-credito || --request-file labs/azureml/solicitud\.json
```
```solucion
az ml online-endpoint invoke -w mlw-lab -g rg-lab-ia -n riesgo-credito --request-file labs/azureml/solicitud.json
```
```setup
lab-preparar azureml
az group create -n rg-lab-ia -l eastus2
az ml workspace create -n mlw-lab -g rg-lab-ia
az ml online-endpoint create -w mlw-lab -g rg-lab-ia -n riesgo-credito
az ml online-deployment create -w mlw-lab -g rg-lab-ia -f labs/azureml/blue.yml --all-traffic
```
:::

:::ejercicio cli
Paso 10. Crea el despliegue `green` (versión 2, `labs/azureml/green.yml`) **sin** tráfico y mándale un **espejo** del 20 % del tráfico real.
```respuesta
todos: az ml online-deployment create || (-f|--file) labs/azureml/green\.yml || az ml online-endpoint update || --mirror-traffic ['"]?green=20['"]?
```
```solucion
az ml online-deployment create -w mlw-lab -g rg-lab-ia -f labs/azureml/green.yml && az ml online-endpoint update -w mlw-lab -g rg-lab-ia -n riesgo-credito --mirror-traffic "green=20"
```
```setup
lab-preparar azureml
az group create -n rg-lab-ia -l eastus2
az ml workspace create -n mlw-lab -g rg-lab-ia
az ml online-endpoint create -w mlw-lab -g rg-lab-ia -n riesgo-credito
az ml online-deployment create -w mlw-lab -g rg-lab-ia -f labs/azureml/blue.yml --all-traffic
```
```explicacion
El espejo copia las peticiones a `green`, pero el cliente siempre recibe la respuesta de `blue`. Sirve para medir latencia y errores de la versión nueva sin riesgo. Máximo 50 %.
```
:::

:::ejercicio cli error
Paso 11. Intenta pasar al canario `blue=90 green=10` con el espejo todavía activo. Lee el error.
```respuesta
todos: az ml online-endpoint update || (-n|--name) riesgo-credito || --traffic ['"]blue=90 green=10['"]
```
```solucion
az ml online-endpoint update -w mlw-lab -g rg-lab-ia -n riesgo-credito --traffic "blue=90 green=10"
```
```setup
lab-preparar azureml
az group create -n rg-lab-ia -l eastus2
az ml workspace create -n mlw-lab -g rg-lab-ia
az ml online-endpoint create -w mlw-lab -g rg-lab-ia -n riesgo-credito
az ml online-deployment create -w mlw-lab -g rg-lab-ia -f labs/azureml/blue.yml --all-traffic
az ml online-deployment create -w mlw-lab -g rg-lab-ia -f labs/azureml/green.yml
az ml online-endpoint update -w mlw-lab -g rg-lab-ia -n riesgo-credito --mirror-traffic "green=20"
```
:::

:::ejercicio cli
Paso 12. Quita el espejo (`green=0`) y aplica el canario `blue=90 green=10`.
```respuesta
todos: az ml online-endpoint update || --mirror-traffic ['"]?green=0['"]? || --traffic ['"]blue=90 green=10['"]
```
```solucion
az ml online-endpoint update -w mlw-lab -g rg-lab-ia -n riesgo-credito --mirror-traffic "green=0" && az ml online-endpoint update -w mlw-lab -g rg-lab-ia -n riesgo-credito --traffic "blue=90 green=10"
```
```setup
lab-preparar azureml
az group create -n rg-lab-ia -l eastus2
az ml workspace create -n mlw-lab -g rg-lab-ia
az ml online-endpoint create -w mlw-lab -g rg-lab-ia -n riesgo-credito
az ml online-deployment create -w mlw-lab -g rg-lab-ia -f labs/azureml/blue.yml --all-traffic
az ml online-deployment create -w mlw-lab -g rg-lab-ia -f labs/azureml/green.yml
az ml online-endpoint update -w mlw-lab -g rg-lab-ia -n riesgo-credito --mirror-traffic "green=20"
```
:::

:::ejercicio cli
Paso 13. Las métricas de `green` son buenas: pásale el **100 %** del tráfico.
```respuesta
todos: az ml online-endpoint update || (-n|--name) riesgo-credito || --traffic ['"]blue=0 green=100['"]
todos: az ml online-endpoint update || (-n|--name) riesgo-credito || --traffic ['"]green=100 blue=0['"]
```
```solucion
az ml online-endpoint update -w mlw-lab -g rg-lab-ia -n riesgo-credito --traffic "blue=0 green=100"
```
```setup
lab-preparar azureml
az group create -n rg-lab-ia -l eastus2
az ml workspace create -n mlw-lab -g rg-lab-ia
az ml online-endpoint create -w mlw-lab -g rg-lab-ia -n riesgo-credito
az ml online-deployment create -w mlw-lab -g rg-lab-ia -f labs/azureml/blue.yml --all-traffic
az ml online-deployment create -w mlw-lab -g rg-lab-ia -f labs/azureml/green.yml
```
```explicacion
Deja `blue` unas horas con 0 % por si hay que volver atrás y después bórralo con `az ml online-deployment delete --name blue --endpoint-name riesgo-credito`.
```
:::

## En tu cuenta real

```bash norun
az extension add -n ml
az provider register --namespace Microsoft.MachineLearningServices
# rol para que la app use Foundry sin claves
az role assignment create --assignee <object-id-de-la-identidad> \
  --role "Cognitive Services OpenAI User" \
  --scope $(az cognitiveservices account show -n foundry-lab-clinica -g rg-lab-ia --query id -o tsv)
```

```python norun
from azure.identity import DefaultAzureCredential, get_bearer_token_provider
from openai import AzureOpenAI

token = get_bearer_token_provider(DefaultAzureCredential(), "https://cognitiveservices.azure.com/.default")
cliente = AzureOpenAI(azure_endpoint="https://foundry-lab-clinica.openai.azure.com/",
                      azure_ad_token_provider=token, api_version="2024-10-21")
r = cliente.chat.completions.create(model="chat", messages=[{"role": "user", "content": "Hola"}])
print(r.choices[0].message.content)
```

- Con `--public-network-access Disabled` solo entras por un **private endpoint**; para probar desde tu computadora, deja el acceso público y restringe por IP.
- Los despliegues tardan de 5 a 15 minutos. Revisa los logs con `az ml online-deployment get-logs --name green --endpoint-name riesgo-credito`.
- Comprueba la **cuota** de la familia de VM (`Standard_DSv2`) en la región antes de desplegar.

## Limpieza

:::ejercicio cli
Borra el endpoint `riesgo-credito` (borra también sus despliegues) sin confirmación.
```respuesta
todos: az ml online-endpoint delete || (-n|--name) riesgo-credito || (--yes|-y)
```
```solucion
az ml online-endpoint delete -w mlw-lab -g rg-lab-ia -n riesgo-credito --yes
```
```setup
az group create -n rg-lab-ia -l eastus2
az ml workspace create -n mlw-lab -g rg-lab-ia
az ml online-endpoint create -w mlw-lab -g rg-lab-ia -n riesgo-credito
```
:::

:::ejercicio cli
Borra el grupo `rg-lab-ia` completo, sin confirmación y sin esperar a que termine.
```respuesta
todos: az group delete || (-n|--name) rg-lab-ia || (--yes|-y) || --no-wait
```
```solucion
az group delete -n rg-lab-ia --yes --no-wait
```
```setup
az group create -n rg-lab-ia -l eastus2
```
```explicacion
Los recursos de Foundry quedan en estado *soft-deleted* 48 horas. Para liberar el nombre de inmediato: `az cognitiveservices account purge -n foundry-lab-clinica -g rg-lab-ia -l eastus2`.
```
:::

## Preguntas de examen

:::ejercicio quiz
Un hospital de Alemania exige que los datos se procesen dentro de la UE y quiere el mejor precio por token. ¿Qué tipo de despliegue eliges?

- [ ] `GlobalStandard`
- [x] `DataZoneStandard` en un recurso de una región de la UE
- [ ] `Standard` en `eastus2`
- [ ] `Provisioned` en cualquier región
:::

:::ejercicio quiz
Quieres medir la latencia de la versión nueva con tráfico real **sin** que ningún cliente reciba sus respuestas. ¿Qué configuras?

- [ ] `--traffic "blue=50 green=50"`
- [x] `--mirror-traffic "green=20"`
- [ ] Un segundo endpoint con la misma URL
- [ ] Un batch endpoint con los datos de ayer
:::

:::ejercicio quiz
Desactivaste la autenticación local de un recurso de Foundry y la aplicación empieza a fallar con 401. ¿Qué falta?

- [ ] Regenerar las claves
- [ ] Activar el acceso público
- [x] Que la identidad de la aplicación tenga un rol de datos sobre el recurso y pida un token de Entra ID
- [ ] Cambiar el SKU a `S1`
:::
