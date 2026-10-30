---
titulo: "Laboratorio AWS: operación y seguridad de un pipeline"
nivel: Avanzado
duracion: 55
resumen: Las piezas que rodean a un pipeline en producción - credenciales en Secrets Manager con rotación, una clave de KMS con alias y rotación anual, un tópico de SNS para alertas, una regla programada de EventBridge, una alarma de CloudWatch sobre fallos de Glue y una tabla de DynamoDB para el estado de los envíos con TTL. Cubre el dominio 3 y 4 del DEA-C01 y la parte de seguridad del MLA-C01.
objetivos: Guardar y leer credenciales con Secrets Manager en lugar de dejarlas en el código | Crear una clave de KMS con alias y rotación | Conectar alarmas de CloudWatch y reglas de EventBridge con SNS | Modelar una tabla de DynamoDB con clave de partición y de orden, y consultarla con begins_with | Borrar todo al terminar
autoevaluacion: ¿Sabes por qué un secreto es mejor que una variable de entorno? | ¿Sabes qué es un alias de KMS? | ¿Sabes qué servicio programa un proceso con cron en AWS? | ¿Sabes cuándo usar query y cuándo scan en DynamoDB?
---

:::escenario
El pipeline nocturno de la tienda funciona, pero la contraseña de la base está en el código, nadie se entera cuando un job falla y el estado de cada envío se guarda en un CSV. Auditoría pide cifrado con clave propia y rotación. Vas a dejarlo listo para producción.
:::

## Arquitectura

```diagrama
titulo: Operación del pipeline nocturno
nodo eb: EventBridge | icono=eventbridge | col=0 | fila=1 | sub=cron 03:00 | color=rosa
nodo job: Job de Glue | icono=glue | col=1 | fila=1 | color=violeta
nodo sm: Secrets Manager | icono=llave | col=1 | fila=0 | sub=lab/rds/ventas | color=rojo
nodo kms: KMS | icono=llave | col=2 | fila=0 | sub=alias/lago-silver-lab | color=rojo
nodo cw: CloudWatch | icono=cloudwatch | col=2 | fila=2 | sub=alarma de fallos | color=rosa
nodo sns: SNS | icono=sns | col=3 | fila=2 | sub=alertas-datos-lab | color=rosa
nodo ddb: DynamoDB | icono=base | col=3 | fila=1 | sub=envios-lab | color=azul
flecha eb -> job
flecha job -> sm | estilo=punteada
flecha job -> kms | estilo=punteada
flecha job -> ddb
flecha job -> cw
flecha cw -> sns
```

## Costo en una cuenta real

| Recurso | Costo |
|---|---|
| Secreto de Secrets Manager | USD 0,40 por mes (prorrateado: centavos si lo borras hoy) |
| Clave de KMS administrada por el cliente | USD 1 por mes, prorrateada; se borra con espera de 7 a 30 días |
| SNS, EventBridge, CloudWatch (una alarma) | Capa gratuita |
| DynamoDB bajo demanda | Centavos |

## Práctica guiada

:::ejercicio cli
Paso 1. Guarda la credencial de la base en el secreto `lab/rds/ventas` con el valor `{"usuario":"etl","clave":"Cambiame-123"}`.
```respuesta
todos: aws secretsmanager create-secret || --name lab/rds/ventas || --secret-string
```
```solucion
aws secretsmanager create-secret --name lab/rds/ventas --secret-string '{"usuario":"etl","clave":"Cambiame-123"}'
```
:::

:::ejercicio cli
Paso 2. Lee el secreto como lo haría el job: solo el `SecretString`, en texto.
```respuesta
todos: aws secretsmanager get-secret-value || --secret-id lab/rds/ventas || --query ['"]?SecretString['"]? || --output text
```
```solucion
aws secretsmanager get-secret-value --secret-id lab/rds/ventas --query SecretString --output text
```
```setup
aws secretsmanager create-secret --name lab/rds/ventas --secret-string '{"usuario":"etl","clave":"Cambiame-123"}'
```
:::

:::ejercicio cli
Paso 3. Crea una clave de KMS con la descripción `lago silver lab` y guarda su `KeyId` en la variable `KEY`.
```respuesta
todos: KEY=\$\(aws kms create-key || --query ['"]?KeyMetadata\.KeyId['"]? || --output text\)?
```
```solucion
KEY=$(aws kms create-key --description "lago silver lab" --query KeyMetadata.KeyId --output text)
```
:::

:::ejercicio cli
Paso 4. Ponle el alias `alias/lago-silver-lab` y activa la **rotación automática** de la clave.
```respuesta
todos: aws kms create-alias || --alias-name alias/lago-silver-lab || --target-key-id \$KEY || aws kms enable-key-rotation --key-id \$KEY
```
```solucion
aws kms create-alias --alias-name alias/lago-silver-lab --target-key-id $KEY && aws kms enable-key-rotation --key-id $KEY
```
```setup
KEY=$(aws kms create-key --description "lago silver lab" --query KeyMetadata.KeyId --output text)
```
```explicacion
El alias permite cambiar la clave sin tocar el código, que referencia `alias/lago-silver-lab`. Con la rotación, KMS genera material nuevo cada año y sigue descifrando lo viejo.
```
:::

:::ejercicio cli
Paso 5. Crea el tópico SNS `alertas-datos-lab` y suscribe el correo `tu-correo@ejemplo.com`.
```respuesta
todos: aws sns create-topic --name alertas-datos-lab || aws sns subscribe || --protocol email || --notification-endpoint tu-correo@ejemplo\.com
```
```solucion
aws sns create-topic --name alertas-datos-lab && aws sns subscribe --topic-arn arn:aws:sns:us-east-1:123456789012:alertas-datos-lab --protocol email --notification-endpoint tu-correo@ejemplo.com
```
:::

:::ejercicio cli
Paso 6. Crea la alarma `glue-job-fallido-lab` en el namespace `Glue`, métrica `glue.driver.aggregate.numFailedTasks`, suma en 5 minutos, que se dispare con **1 o más** fallos y avise al tópico.
```respuesta
todos: aws cloudwatch put-metric-alarm || --alarm-name glue-job-fallido-lab || --namespace Glue || --metric-name glue\.driver\.aggregate\.numFailedTasks || --threshold 1 || --comparison-operator GreaterThanOrEqualToThreshold || --evaluation-periods 1 || --alarm-actions arn:aws:sns:us-east-1:123456789012:alertas-datos-lab
```
```solucion
aws cloudwatch put-metric-alarm --alarm-name glue-job-fallido-lab --namespace Glue --metric-name glue.driver.aggregate.numFailedTasks --statistic Sum --period 300 --evaluation-periods 1 --threshold 1 --comparison-operator GreaterThanOrEqualToThreshold --alarm-actions arn:aws:sns:us-east-1:123456789012:alertas-datos-lab
```
```setup
aws sns create-topic --name alertas-datos-lab
```
:::

:::ejercicio cli
Paso 7. Programa la regla de EventBridge `carga-nocturna-lab` que se dispare **todos los días a las 03:00 UTC**.
```respuesta
todos: aws events put-rule || --name carga-nocturna-lab || --schedule-expression ['"]cron\(0 3 \* \* \? \*\)['"]
```
```solucion
aws events put-rule --name carga-nocturna-lab --schedule-expression "cron(0 3 * * ? *)"
```
```explicacion
El cron de AWS tiene **seis** campos (minutos, horas, día del mes, mes, día de la semana, año) y uno de los dos días debe ser `?`. Para zonas horarias o tareas de una sola vez se usa **EventBridge Scheduler** (`aws scheduler create-schedule`).
```
:::

:::ejercicio cli
Paso 8. Crea la tabla de DynamoDB `envios-lab` con clave de partición `envio_id` (texto) y de orden `sk` (texto), en modo bajo demanda.
```respuesta
todos: aws dynamodb create-table || --table-name envios-lab || AttributeName=envio_id,AttributeType=S || AttributeName=sk,AttributeType=S || AttributeName=envio_id,KeyType=HASH || AttributeName=sk,KeyType=RANGE || --billing-mode PAY_PER_REQUEST
```
```solucion
aws dynamodb create-table --table-name envios-lab --attribute-definitions AttributeName=envio_id,AttributeType=S AttributeName=sk,AttributeType=S --key-schema AttributeName=envio_id,KeyType=HASH AttributeName=sk,KeyType=RANGE --billing-mode PAY_PER_REQUEST
```
:::

:::ejercicio cli
Paso 9. Guarda el evento del envío `E100`: `sk` = `EVT#2026-10-02T14:30` y `estado` = `EN_RUTA`.
```respuesta
todos: aws dynamodb put-item || --table-name envios-lab || \S*E100\S* || \S*EVT#2026-10-02T14:30\S* || \S*EN_RUTA\S*
```
```solucion
aws dynamodb put-item --table-name envios-lab --item '{"envio_id":{"S":"E100"},"sk":{"S":"EVT#2026-10-02T14:30"},"estado":{"S":"EN_RUTA"}}'
```
```setup
aws dynamodb create-table --table-name envios-lab --attribute-definitions AttributeName=envio_id,AttributeType=S AttributeName=sk,AttributeType=S --key-schema AttributeName=envio_id,KeyType=HASH AttributeName=sk,KeyType=RANGE --billing-mode PAY_PER_REQUEST
aws dynamodb put-item --table-name envios-lab --item '{"envio_id":{"S":"E100"},"sk":{"S":"EVT#2026-10-01T09:00"},"estado":{"S":"CREADO"}}'
```
:::

:::ejercicio cli
Paso 10. Consulta los eventos de `E100` (los `sk` que empiezan con `EVT#`) **del más nuevo al más viejo** y muestra solo el estado.
```respuesta
todos: aws dynamodb query || --table-name envios-lab || --key-condition-expression || \S*begins_with\S* || --expression-attribute-values || --no-scan-index-forward
```
```solucion
aws dynamodb query --table-name envios-lab --key-condition-expression "envio_id = :e AND begins_with(sk, :p)" --expression-attribute-values '{":e":{"S":"E100"},":p":{"S":"EVT#"}}' --no-scan-index-forward --query "Items[].estado.S"
```
```setup
aws dynamodb create-table --table-name envios-lab --attribute-definitions AttributeName=envio_id,AttributeType=S AttributeName=sk,AttributeType=S --key-schema AttributeName=envio_id,KeyType=HASH AttributeName=sk,KeyType=RANGE --billing-mode PAY_PER_REQUEST
aws dynamodb put-item --table-name envios-lab --item '{"envio_id":{"S":"E100"},"sk":{"S":"EVT#2026-10-01T09:00"},"estado":{"S":"CREADO"}}'
aws dynamodb put-item --table-name envios-lab --item '{"envio_id":{"S":"E100"},"sk":{"S":"EVT#2026-10-02T14:30"},"estado":{"S":"EN_RUTA"}}'
```
```explicacion
`query` lee una sola partición y usa la clave de orden: es barato aunque la tabla tenga millones de envíos. `scan` lee toda la tabla y cobra por todo lo leído.
```
:::

:::ejercicio cli
Paso 11. Activa el TTL de `envios-lab` sobre el atributo `expira`, para que DynamoDB borre solo los eventos viejos.
```respuesta
todos: aws dynamodb update-time-to-live || --table-name envios-lab || \S*Enabled=true\S* || \S*AttributeName=expira\S*
```
```solucion
aws dynamodb update-time-to-live --table-name envios-lab --time-to-live-specification Enabled=true,AttributeName=expira
```
```setup
aws dynamodb create-table --table-name envios-lab --attribute-definitions AttributeName=envio_id,AttributeType=S AttributeName=sk,AttributeType=S --key-schema AttributeName=envio_id,KeyType=HASH AttributeName=sk,KeyType=RANGE --billing-mode PAY_PER_REQUEST
```
:::

## En tu cuenta real

- **Confirma la suscripción**: SNS manda un correo con un enlace; hasta que no lo abras, la suscripción queda `pending confirmation`.
- **Permisos de destino**: para que EventBridge publique en SNS, el tópico necesita una política que permita `events.amazonaws.com`. Con `put-targets` apuntando a un job de Glue o a Step Functions, la regla usa un rol.
- **Rotación de secretos**: para RDS, la consola crea la Lambda de rotación por ti; por CLI, `aws secretsmanager rotate-secret --rotation-lambda-arn … --rotation-rules AutomaticallyAfterDays=30`.

```python norun
import json, boto3

sm = boto3.client("secretsmanager")
cred = json.loads(sm.get_secret_value(SecretId="lab/rds/ventas")["SecretString"])
# conecta con cred["usuario"] y cred["clave"]; nunca imprimas la clave en los logs
```

## Limpieza

```bash norun
aws dynamodb delete-table --table-name envios-lab
aws events remove-targets --rule carga-nocturna-lab --ids 1
aws events delete-rule --name carga-nocturna-lab
aws cloudwatch delete-alarms --alarm-names glue-job-fallido-lab
aws sns delete-topic --topic-arn arn:aws:sns:us-east-1:<cuenta>:alertas-datos-lab
aws secretsmanager delete-secret --secret-id lab/rds/ventas --force-delete-without-recovery
aws kms delete-alias --alias-name alias/lago-silver-lab
aws kms schedule-key-deletion --key-id $KEY --pending-window-in-days 7
```

:::ejercicio cli
Limpieza en la terminal del curso: borra la tabla `envios-lab` y el secreto `lab/rds/ventas` **sin período de recuperación**.
```respuesta
todos: aws dynamodb delete-table --table-name envios-lab || aws secretsmanager delete-secret --secret-id lab/rds/ventas || --force-delete-without-recovery
```
```solucion
aws dynamodb delete-table --table-name envios-lab && aws secretsmanager delete-secret --secret-id lab/rds/ventas --force-delete-without-recovery
```
```setup
aws dynamodb create-table --table-name envios-lab --attribute-definitions AttributeName=envio_id,AttributeType=S AttributeName=sk,AttributeType=S --key-schema AttributeName=envio_id,KeyType=HASH AttributeName=sk,KeyType=RANGE --billing-mode PAY_PER_REQUEST
aws secretsmanager create-secret --name lab/rds/ventas --secret-string '{"usuario":"etl","clave":"Cambiame-123"}'
```
:::

:::errores
- **Credenciales en variables de entorno o en el código** en lugar de Secrets Manager: quedan en el historial de Git y en los logs.
- **Rotar la contraseña sin que la aplicación la vuelva a leer**: la rotación funciona y el pipeline falla al día siguiente. El código debe leer el secreto en cada ejecución (o con un caché corto).
- **Alarmas que nadie recibe**: un tópico de SNS sin suscripción confirmada no avisa a nadie.
- **Permisos con `*`** en la política de IAM del pipeline: si la credencial se filtra, da acceso a todo.
- **Programar con EventBridge en hora local** sin revisar la zona: las expresiones `cron` de EventBridge son en UTC salvo que uses EventBridge Scheduler con zona horaria.
:::

:::trabajo
- Estas piezas (secretos, cifrado, alertas, programación, alarmas) rodean a casi todo pipeline en AWS y suelen definirse con infraestructura como código (CloudFormation, CDK o Terraform), no a mano.
- Las alarmas tienen un responsable y un *runbook*: qué mirar y qué hacer cuando suena.
:::

:::entrevista "¿Cómo manejarías las credenciales de una base de datos que usa un pipeline en AWS?"
Las guardaría en Secrets Manager, cifradas con una clave de KMS, con rotación automática. El pipeline correría con un rol de IAM que solo puede leer ese secreto, y lo leería en cada ejecución en lugar de copiarlo a variables o archivos. Ninguna credencial en el código ni en el repositorio, y CloudTrail para auditar quién accedió al secreto.
:::

## Preguntas de examen

:::ejercicio quiz
Un job de Glue necesita la contraseña de una base RDS y auditoría exige rotarla cada 30 días sin tocar el código. ¿Qué usas?

- [ ] Una variable de entorno del job
- [ ] Un archivo cifrado en S3
- [x] Secrets Manager con rotación automática
- [ ] Parameter Store con un parámetro `String`
:::

:::ejercicio quiz
Necesitas el último estado de un envío entre 50 millones de registros, muchas veces por segundo. ¿Qué operación de DynamoDB usas?

- [ ] `scan` con un filtro por `envio_id`
- [x] `query` por la clave de partición, orden descendente y límite 1
- [ ] Exportar la tabla a S3 y consultarla con Athena
- [ ] Un índice secundario global por `estado`
:::

:::ejercicio quiz
Quieres que el equipo se entere por correo cuando un job de Glue falla. ¿Qué combinación es la estándar?

- [ ] CloudTrail y S3
- [x] Una alarma de CloudWatch (o una regla de EventBridge sobre el cambio de estado del job) que publique en un tópico de SNS
- [ ] Un crawler de Glue que revise los logs
- [ ] AWS Config con una regla administrada
```explicacion
También es muy común una regla de EventBridge con el patrón `{"source":["aws.glue"],"detail-type":["Glue Job State Change"],"detail":{"state":["FAILED"]}}` y SNS como destino.
```
:::
