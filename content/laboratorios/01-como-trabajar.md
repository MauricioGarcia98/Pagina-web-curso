---
titulo: Cómo trabajar los laboratorios sin sorpresas en la factura
nivel: Intermedio
duracion: 35
resumen: El método de todos los laboratorios guiados - practicar primero en la terminal simulada, después repetir en tu cuenta real con presupuesto, alertas, etiquetas, región fija, nombres con sufijo -lab y una limpieza obligatoria al final. Incluye qué servicios cobran aunque no los uses y cómo verificar que no quedó nada encendido.
objetivos: Seguir el flujo de cada laboratorio - simulador, cuenta real y limpieza | Configurar presupuestos y alertas de costo en AWS, Google Cloud, Azure y Databricks | Reconocer los recursos que cobran por hora aunque no tengan tráfico | Verificar con la terminal que la limpieza quedó completa
autoevaluacion: ¿Sabes qué recursos cobran por estar encendidos aunque nadie los use? | ¿Sabes configurar una alerta de presupuesto en tu nube? | ¿Sabes comprobar que borraste todo al terminar?
---

:::escenario
Lucía aprobó la teoría de la certificación pero nunca creó una Knowledge Base ni un endpoint. En el examen aparece: "el endpoint devuelve 4xx después de cambiar el tráfico". Quien lo hizo con sus manos lo resuelve en segundos. Estos laboratorios son para eso: hacer cada servicio de punta a punta, primero gratis en la terminal del curso y después, si quieres, en tu cuenta real con un costo de centavos.
:::

## Cómo está armado cada laboratorio

Todos los laboratorios siguen el mismo orden:

1. **Arquitectura**: qué vas a construir y por qué cada pieza.
2. **Costo**: cuánto cuesta en una cuenta real y qué recurso es el peligroso.
3. **Práctica guiada**: ejercicios de terminal en orden. Cada uno deja el estado listo para el siguiente (el bucket creado, la tabla catalogada…). Si saltas un paso, el ejercicio prepara lo que falta en silencio.
4. **En tu cuenta real**: los mismos comandos para tu nube, con las diferencias que la simulación no muestra (permisos, tiempos de espera, consola).
5. **Limpieza**: los comandos para borrar todo. **No es opcional**.
6. **Preguntas de examen** sobre lo que acabas de hacer.

:::nota
La terminal del curso simula AWS, Google Cloud, Azure y Databricks: guarda estado, valida parámetros y devuelve errores realistas. No necesitas tarjeta de crédito para hacer la práctica guiada. Los laboratorios que necesitan archivos (documentos para un RAG, YAML de despliegues) los crean con `lab-preparar`.
:::

## Las reglas de oro para tu cuenta real

| Regla | Por qué |
|---|---|
| **Una cuenta o proyecto solo para laboratorios** | Si algo sale mal, borras todo el proyecto (GCP) o el grupo de recursos (Azure) sin tocar nada de trabajo |
| **Presupuesto con alertas al 50 %, 80 % y 100 %** | Te avisa por correo antes de que la factura crezca |
| **Una sola región** (`us-east-1`, `us-central1`, `eastus2`) | Los recursos olvidados en otra región no aparecen en la consola que miras |
| **Nombres con sufijo `-lab`** | Encuentras todo lo que creaste con un filtro |
| **Etiquetas** `proyecto=lab` | Los informes de costo se filtran por etiqueta |
| **Limpieza el mismo día** | Un endpoint olvidado un mes cuesta más que todos los laboratorios juntos |

### Lo que cobra aunque no lo uses

| Nube | Recurso | Costo aproximado si lo olvidas |
|---|---|---|
| AWS | Endpoint de SageMaker (`ml.m5.large`) | USD 0,115 por hora: unos USD 80 al mes |
| AWS | OpenSearch Serverless para una Knowledge Base | Mínimo de OCU: cientos de dólares al mes. En el laboratorio usamos **S3 Vectors**, que cobra por uso |
| AWS | NAT Gateway, cluster de EMR o de Redshift | Desde USD 30 hasta miles al mes |
| Google Cloud | Endpoint de Vertex AI con `min-replica-count 1` | Una máquina `n1-standard-2` encendida: unos USD 70 al mes |
| Azure | Online endpoint de Azure ML con instancia `Standard_DS3_v2` | Unos USD 200 al mes |
| Azure | Azure AI Search (tier Basic o superior) | Desde unos USD 75 al mes |
| Databricks | Cluster sin auto-terminación, SQL warehouse sin auto-stop | DBU + máquinas por hora |

:::cuidado La regla del endpoint
Todo lo que **sirve predicciones en tiempo real** (SageMaker, Vertex AI, Azure ML) cobra por hora de máquina, no por petición. Termina cada laboratorio de endpoints borrándolo y verificando con un `list` que no queda ninguno.
:::

```recorrido
titulo: La vida de un laboratorio en tu cuenta real, sin sorpresas en la factura
estacion antes: Antes | icono=escudo
estacion crear: Crear | icono=chispa
estacion usar: Practicar | icono=codigo
estacion limpiar: Limpiar | icono=x
estacion verificar: Verificar | icono=check
paso antes: Antes de empezar: presupuesto y alertas
Un presupuesto con alertas al 50 %, 80 % y 100 % te avisa por correo antes de que la factura crezca. Se configura **una vez**.
>>> texto
presupuesto mensual: USD 10
alertas: 5 USD (50 %) · 8 USD (80 %) · 10 USD (100 %)
paso crear: Crear todo junto y con etiqueta
Un grupo de recursos (o proyecto) solo para el laboratorio, una región y la etiqueta `proyecto=lab`.
>>> bash
az group create -n rg-lab-hoy -l eastus2 --tags proyecto=lab
paso usar: Practicar
Cada recurso va **dentro** del grupo del laboratorio. Lo que cobra por hora (endpoints, clusters) se apaga apenas termina el ejercicio.
>>> texto
endpoint ML     → se borra al terminar el ejercicio
cluster Spark   → autoterminación de 30 minutos
almacenamiento  → centavos, se borra con el grupo
paso limpiar: Limpiar el mismo día
Borrar el grupo borra todo lo que tiene adentro. Un endpoint olvidado un mes cuesta más que todos los laboratorios juntos.
>>> bash
az group delete -n rg-lab-hoy --yes --no-wait
paso verificar: Comprobar que no quedó nada
Buscar por la etiqueta: la lista tiene que estar vacía. Al día siguiente, revisar el costo en la consola.
>>> log
$ az resource list --tag proyecto=lab -o table
(sin resultados)
```

## Práctica guiada: prepara la terminal

:::ejercicio cli
Antes de cualquier laboratorio de AWS, comprueba **con qué cuenta e identidad** estás trabajando.
```respuesta
aws sts get-caller-identity( (--output|-o) \w+)?
```
```solucion
aws sts get-caller-identity
```
```explicacion
En tu cuenta real este es el primer comando de cada sesión: evita crear recursos en la cuenta de trabajo por error.
```
:::

:::ejercicio cli
Fija la región por defecto de la CLI de AWS en `us-east-1`, la región de todos los laboratorios.
```respuesta
aws configure set (default\.)?region us-east-1
```
```solucion
aws configure set region us-east-1
```
:::

:::ejercicio cli
En Google Cloud, deja configurado el proyecto `academia-datos-dev` como proyecto por defecto.
```respuesta
gcloud config set (core/)?project academia-datos-dev
```
```solucion
gcloud config set project academia-datos-dev
```
:::

:::ejercicio cli
En Azure, crea el grupo de recursos `rg-lab-ia` en `eastus2`. Todo lo del laboratorio irá ahí, así al final lo borras de una vez.
```respuesta
todos: az group create || (-n|--name) rg-lab-ia || (-l|--location) eastus2
```
```solucion
az group create -n rg-lab-ia -l eastus2
```
:::

:::ejercicio cli
Prepara los archivos del laboratorio de RAG (documentos de políticas con metadatos y un lote JSONL) con el comando del curso `lab-preparar`.
```respuesta
lab-preparar rag
```
```explicacion
Crea `~/labs/rag/` con tres documentos Markdown, sus archivos `.metadata.json` y `lote.jsonl`. Revísalos con `ls -R labs` y `cat`.
```
:::

## En tu cuenta real: presupuestos y alertas

```bash norun
# AWS: presupuesto mensual de USD 10 con alerta por correo al 80 %
aws budgets create-budget --account-id $(aws sts get-caller-identity --query Account --output text) \
  --budget '{"BudgetName":"labs","BudgetLimit":{"Amount":"10","Unit":"USD"},"TimeUnit":"MONTHLY","BudgetType":"COST"}' \
  --notifications-with-subscribers '[{"Notification":{"NotificationType":"ACTUAL","ComparisonOperator":"GREATER_THAN","Threshold":80},"Subscribers":[{"SubscriptionType":"EMAIL","Address":"tu-correo@ejemplo.com"}]}]'

# Google Cloud: proyecto exclusivo y presupuesto sobre la cuenta de facturación
gcloud projects create labs-$(date +%s) --name="Laboratorios"
gcloud billing budgets create --billing-account=XXXXXX-XXXXXX-XXXXXX \
  --display-name="labs" --budget-amount=10USD \
  --threshold-rule=percent=0.5 --threshold-rule=percent=0.8 --threshold-rule=percent=1.0

# Azure: presupuesto sobre el grupo de recursos
az consumption budget create --budget-name labs --amount 10 --time-grain Monthly \
  --resource-group rg-lab-ia --category Cost \
  --start-date 2026-11-01 --end-date 2027-11-01
```

- **AWS**: activa también la capa gratuita con alertas (*Free Tier usage alerts*) y revisa **Cost Explorer** filtrando por la etiqueta `proyecto`.
- **Google Cloud**: el presupuesto **avisa pero no corta**. Si quieres un corte duro, conecta la alerta a Pub/Sub y una función que deshabilite la facturación del proyecto.
- **Azure**: las cuentas gratuitas y de estudiante tienen un límite de gasto; las de pago por uso no.
- **Databricks**: usa la **Free Edition** para practicar; en una cuenta paga, crea una *budget policy* y revisa `system.billing.usage`.

## Cómo comprobar que limpiaste todo

```bash norun
# AWS: recursos con la etiqueta del laboratorio, en todas las regiones
aws resourcegroupstaggingapi get-resources --tag-filters Key=proyecto,Values=lab --query "ResourceTagMappingList[].ResourceARN"
aws sagemaker list-endpoints --query "Endpoints[].EndpointName"

# Google Cloud: lo más rápido es borrar el proyecto completo
gcloud ai endpoints list --region us-central1
gcloud projects delete labs-1730000000

# Azure: borrar el grupo borra todo lo que contiene
az group delete -n rg-lab-ia --yes --no-wait
```

:::ejercicio quiz
Terminaste un laboratorio de SageMaker y quieres asegurarte de no pagar nada más. ¿Qué es lo **imprescindible**?

- [ ] Borrar el modelo registrado
- [x] Borrar el endpoint y verificar con `list-endpoints` que no queda ninguno
- [ ] Borrar los artefactos del modelo en S3
- [ ] Cerrar la sesión de la consola
```explicacion
El endpoint cobra por hora de instancia. El modelo y la configuración son metadatos gratuitos; los artefactos en S3 cuestan centavos.
```
:::

:::ejercicio quiz
Configuraste un presupuesto de USD 10 en Google Cloud. Un endpoint olvidado hace que el gasto llegue a USD 40. ¿Qué pasó?

- [ ] Google Cloud apagó el endpoint al llegar a USD 10
- [x] El presupuesto envió alertas, pero no detiene recursos por sí solo
- [ ] El presupuesto no se aplica a Vertex AI
- [ ] La factura se queda en USD 10 porque es el límite
```explicacion
Los presupuestos de Google Cloud (y los de AWS por defecto) solo notifican. Para cortar el gasto hay que automatizar una acción con Pub/Sub y una función, o con *budget actions* en AWS.
```
:::

:::ejercicio quiz
¿Por qué conviene crear todos los recursos de Azure de un laboratorio dentro de un único grupo de recursos?

- [ ] Porque Azure lo exige
- [ ] Porque los recursos dentro de un grupo son gratuitos
- [x] Porque al terminar borras el grupo y se borra todo lo que contiene
- [ ] Porque así no necesitas permisos
:::

:::errores
- **Usar la cuenta de trabajo para practicar**: un recurso olvidado o un permiso mal dado afecta a sistemas reales. Usa una cuenta o un proyecto aparte.
- **Crear el presupuesto después del laboratorio**: las alertas llegan tarde. Es el primer paso, antes de crear cualquier recurso.
- **Cambiar de región a mitad del laboratorio**: los recursos de la otra región no aparecen en la consola que estás mirando.
- **Confiar en que "borré todo" sin listar**: el `list` final es el único que lo confirma.
- **Creer que una alerta de presupuesto frena el gasto**: solo avisa. Para cortar hay que borrar recursos (o configurar acciones de presupuesto donde la nube lo permite).
:::

:::trabajo
- En las empresas los entornos de prueba (*sandbox*) tienen presupuesto, etiquetas obligatorias y, muchas veces, un proceso automático que borra lo que tiene más de unos días.
- Revisar la factura por etiqueta o por grupo de recursos es tarea habitual del equipo de plataforma; cada recurso sin etiqueta es una pregunta de "¿de quién es esto?".
:::

:::entrevista "¿Cómo controlarías los costos de un entorno de datos en la nube?"
Con presupuestos y alertas por entorno, etiquetas obligatorias de proyecto y responsable, y reportes de costo por etiqueta. Apagado automático de lo que cobra por hora: auto-terminación de clústeres, auto-stop de warehouses, endpoints que escalan a cero o se borran. Límites de escaneo en motores que cobran por bytes leídos, como Athena o BigQuery. Y una revisión periódica de recursos sin uso.
:::

