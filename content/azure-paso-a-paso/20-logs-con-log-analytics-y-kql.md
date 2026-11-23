---
titulo: Log Analytics - los logs de la plataforma, consultas KQL y alertas de logs
nivel: 5 · Avanzado
duracion: 60
resumen: Las métricas dicen cuántos pipelines fallaron; los logs dicen cuál, en qué actividad y con qué mensaje. Creas el workspace log-tiendaandina-dev, configuras los Diagnostic settings de Data Factory, del lago, del Key Vault y del Activity log, generas actividad real, la consultas con KQL y conviertes la consulta de pipelines fallidos en una alerta de logs para la guardia.
objetivos: Explicar la diferencia entre métricas, Activity log y resource logs | Crear un workspace de Log Analytics | Configurar Diagnostic settings con las categorías justas | Consultar ADFPipelineRun, ADFActivityRun, StorageBlobLogs y AzureDiagnostics con KQL | Crear una alerta de búsqueda de logs con ventana, frecuencia y grupo de acciones
prerrequisitos: azure-paso-a-paso-bloqueos-y-azure-monitor
autoevaluacion: ¿Sabes por qué un recurso nuevo no tiene logs? | ¿Sabes por qué ADFPipelineRun tiene dos filas por corrida? | ¿Sabes para qué sirve arg_max? | ¿Sabes por qué la ventana de una alerta de logs es más larga que su frecuencia?
---

:::tip Practícalo mientras lees
Todo funciona en el [portal de práctica](#/azure): **Log Analytics workspaces**, la sección **Monitoring** de cada recurso (Diagnostic settings y Logs) y las pestañas **Logs** y **Diagnostic settings** de [Monitor](#/azure/monitor). Los logs salen de lo que hagas de verdad: las corridas del Studio y los comandos `az` de la terminal.
:::

:::analogia La caja negra del avión
Las métricas son el tablero de la cabina: velocidad, altura, combustible. Los logs son la caja negra: cada evento con su hora, quién lo hizo y qué pasó. Cuando algo sale mal, el tablero te avisa; la caja negra te dice por qué.
:::

## Paso 1 — Tres tipos de datos de monitoreo

| Dato | Qué guarda | ¿Se guarda solo? | Dónde se ve |
|---|---|---|---|
| **Métricas** | Números cada minuto (pipelines fallidos, capacidad usada) | Sí, 93 días | Metrics y alertas de métricas |
| **Activity log** | Quién creó, cambió o borró cada recurso (el *plano de control*) | Sí, 90 días | Activity log |
| **Resource logs** | Lo que pasa *dentro* del recurso: cada corrida, cada lectura de un blob, cada secreto leído (el *plano de datos*) | **No** | Solo si un Diagnostic setting los envía a un destino |

Esa última columna es la que sorprende: un data factory, un storage o un Key Vault **no guardan sus resource logs en ningún lado** hasta que alguien crea un **Diagnostic setting**. Y solo se registra lo que pasa *después* de crearlo: si el incidente fue ayer y el setting se creó hoy, no hay logs de ayer.

```diagrama
titulo: Cómo llegan los logs a una consulta
nodo r: Recursos | icono=azure | col=0 | fila=0 | color=azul | sub=Data Factory, Storage, Key Vault
nodo d: Diagnostic setting | icono=settings | col=1 | fila=0 | color=naranja | sub=qué categorías y adónde
nodo w: Log Analytics workspace | icono=base | col=2 | fila=0 | color=verde | sub=log-tiendaandina-dev
nodo q: Consulta KQL | icono=search | col=3 | fila=0 | color=violeta | sub=Logs
nodo a: Alerta de logs | icono=alerta | col=3 | fila=1 | color=rojo | sub=avisa a la guardia
flecha r -> d | explica=Cada recurso emite resource logs por categorías (PipelineRuns, StorageWrite, AuditEvent…). Sin un Diagnostic setting, se descartan.
flecha d -> w | explica=El Diagnostic setting elige las categorías y el destino. Lo normal es un workspace por entorno al que mandan todos los recursos.
flecha w -> q | explica=En el workspace, cada categoría es una tabla (ADFPipelineRun, StorageBlobLogs…) que se consulta con KQL, igual que el Eventhouse de Fabric.
flecha w -> a | explica=Una alerta de logs corre una consulta cada pocos minutos y avisa al grupo de acciones si devuelve filas.
```

## Paso 2 — El workspace

**Log Analytics workspaces → + Create** (o `Create a resource → Log Analytics workspace`):

1. **Resource group**: `rg-tiendaandina-dev`.
2. **Name**: `log-tiendaandina-dev`.
3. **Region**: la misma que el resto de la plataforma.
4. **Review + Create**.

Lo mismo con la CLI, como quedaría en un script de la plataforma:

```bash
az monitor log-analytics workspace create -g rg-tiendaandina-dev -n log-tiendaandina-dev -l eastus
```

En una empresa no hay un workspace por recurso: hay pocos (típicamente uno por entorno, `log-…-dev` y `log-…-prod`) para poder cruzar en una misma consulta lo que pasó en Data Factory con lo que pasó en el lago.

## Paso 3 — Los Diagnostic settings

Abre `adf-tiendaandina-dev` → **Monitoring → Diagnostic settings → + Add diagnostic setting**:

1. **Name**: `diag-adf-a-log`.
2. **Categories**: marca **Pipeline runs log** y **Activity runs log**.
3. **Send to Log Analytics workspace**: `log-tiendaandina-dev`.
4. **Destination table**: **Resource specific**.
5. **Save**.

| Destination table | Qué crea | Cuándo |
|---|---|---|
| **Resource specific** | Una tabla por categoría: `ADFPipelineRun`, `ADFActivityRun`, `ADFTriggerRun`, con columnas propias | Siempre que puedas: es lo recomendado |
| **Azure diagnostics** | Todo mezclado en `AzureDiagnostics`, con columnas terminadas en `_s`, `_d`, `_t` | Solo por compatibilidad con consultas viejas |

Repite en `sttiendaandinadev` (categorías **StorageWrite** y **StorageDelete**; en una cuenta real se configura en el sub-recurso *blob*) y en `kv-tiendaandina-dev` (**Audit Logs**). Para el **Activity log** de la suscripción, que no tiene hoja propia, usa **Monitor → Diagnostic settings** y elige *Activity log (Subscription)*.

El del Key Vault con la CLI necesita el **resource ID** completo del vault:

```bash
KV_ID=$(az keyvault show -n kv-tiendaandina-dev --query id -o tsv)
az monitor diagnostic-settings create --name diag-kv-a-log --resource $KV_ID \
  --workspace log-tiendaandina-dev --logs '[{"category":"AuditEvent","enabled":true}]'
```

:::cuidado No marques todo "por las dudas"
En Log Analytics se paga por GB ingerido (alrededor de US$2,30 por GB en pay-as-you-go). **StorageRead** en un lago que lee Spark todo el día puede generar millones de filas por hora y costar más que el propio storage. Elige las categorías que vas a consultar o que te piden por auditoría.
:::

## Paso 4 — Que pase algo

Los logs se llenan con actividad real:

1. En el **Studio** de `adf-tiendaandina-dev`, crea un pipeline `pl_prueba_logs` con una actividad **Wait** de 1 segundo, **Publish all** y **Add trigger → Trigger now**.
2. Agrega después de Wait una actividad **Fail** con el mensaje `El archivo de pedidos llegó vacío` y el código `4001`. **Publish all** y **Trigger now** otra vez: esta corrida falla.
3. En la terminal (o Cloud Shell), sube un archivo con tu usuario y otro con la clave de la cuenta, y lee un secreto que existe y otro que no:

```bash
echo "pedido_id,monto" > prueba.csv
az storage blob upload --account-name sttiendaandinadev -c bronze -n pruebas/a.csv -f prueba.csv --auth-mode login
az storage blob upload --account-name sttiendaandinadev -c bronze -n pruebas/b.csv -f prueba.csv
az keyvault secret show --vault-name kv-tiendaandina-dev -n sql-ventas-password --query name
az keyvault secret show --vault-name kv-tiendaandina-dev -n no-existe
```

:::nota Debug no deja logs
Las ejecuciones de **Debug** del Studio no se envían a Azure Monitor: solo las que corre el servicio (Trigger now, triggers, la API). Si pruebas con Debug y no ves nada en Logs, es eso. En Azure real los logs tardan entre unos segundos y pocos minutos en aparecer; en la práctica, al instante.
:::

## Paso 5 — Consultar con KQL

Abre `log-tiendaandina-dev` → **Logs**. A la izquierda están las tablas con sus columnas; arriba, el **Time range** (por defecto *Last 24 hours*). Si la consulta filtra por `TimeGenerated`, el selector pasa a **Set in query**.

```kql
ADFPipelineRun
| project TimeGenerated, PipelineName, Status, RunId
| order by TimeGenerated desc
```

Vas a ver **dos filas por corrida**: una `InProgress` cuando arranca y otra con el estado final. Así funciona en Azure, y es el error más común al contar fallos o calcular duraciones: hay que quedarse con la fila final.

```kql
ADFPipelineRun
| where Status in ("Succeeded", "Failed", "Cancelled")
| summarize arg_max(TimeGenerated, *) by PipelineName
| project PipelineName, Status, TimeGenerated, RunId
```

`arg_max(TimeGenerated, *)` devuelve, para cada pipeline, **la fila completa** con el `TimeGenerated` más alto: el último estado conocido. Es la consulta del tablero de la guardia ("¿cómo terminó cada pipeline la última vez?").

El detalle del error está en las actividades:

```kql
ADFActivityRun
| where Status == "Failed"
| project TimeGenerated, PipelineName, ActivityName, ErrorCode, ErrorMessage
```

Y las otras dos fuentes, para seguridad:

```kql
StorageBlobLogs
| summarize operaciones = count() by AccountName, OperationName, AuthenticationType, StatusCode
```

```kql
AzureDiagnostics
| where ResourceProvider == "MICROSOFT.KEYVAULT"
| project TimeGenerated, OperationName, ResultSignature, requestUri_s, identity_claim_upn_s
```

| Pregunta de la empresa | Dónde se responde |
|---|---|
| ¿Qué pipelines fallaron anoche y por qué? | `ADFPipelineRun` + `ADFActivityRun` |
| ¿Cuánto tarda cada pipeline? ¿Está empeorando? | `datetime_diff("second", End, Start)` sobre las filas finales |
| ¿Alguien sigue usando la clave de la cuenta en vez de su identidad? | `StorageBlobLogs` con `AuthenticationType == "AccountKey"` |
| ¿Quién leyó el secreto de la base de ventas? | `AzureDiagnostics` del Key Vault, `OperationName == "SecretGet"` |
| ¿Quién borró el recurso? | `AzureActivity` (Activity log enviado al workspace) |

El botón **Queries** trae estas consultas listas, y **Save** guarda las tuyas en el workspace para todo el equipo.

```captura
archivo: azure/b19b-logs.webp
texto: Logs del workspace - las tablas con sus columnas (1), la consulta KQL (2) y los resultados (3)
```

## Paso 6 — Una alerta de logs

En la lección anterior la alerta de Data Factory usaba la métrica *Failed pipeline runs*: avisa que algo falló, pero no dice qué. Con la consulta de pipelines fallidos abierta, presiona **New alert rule**:

1. **Search query**: `ADFPipelineRun | where Status == "Failed"`.
2. **Measure**: *Table rows*. **Operator**: Greater than. **Threshold**: `0`.
3. **Lookback period**: 15 minutes. **Frequency of evaluation**: 5 minutes.
4. **Name**: `adf-pipeline-fallido-logs`. **Severity**: 1 - Error. **Action group**: `ag-guardia-datos`.

La ventana (*lookback*) es más larga que la frecuencia a propósito: los logs llegan con algunos minutos de demora, y una ventana de 5 minutos evaluada cada 5 minutos podría saltearse un fallo que llegó tarde. Como el pipeline falló hace un momento, la alerta se dispara y aparece en **Alerts** y en las notificaciones.

```captura
archivo: azure/b19b-alerta.webp
texto: La regla de logs (1) disparada, junto a la de métricas, y la alerta en Fired alerts (2)
```

:::tip Métrica o logs
Las alertas de **métricas** son más rápidas y baratas: úsalas para "¿algo falló?". Las de **logs** cuestan algo más (aprox. US$1,50 por regla al mes con frecuencia de 5 minutos) pero pueden filtrar por pipeline, por mensaje de error o cruzar tablas. Lo habitual es combinar las dos.
:::

## Paso 7 — Retención y costos

En el workspace, **Usage and estimated costs** muestra los datos ingeridos por tabla, y **Data retention** cuánto tiempo se guardan (30 días incluidos; más, se cobra por GB al mes). Para un entorno dev alcanza con 30 días; en producción, la retención la decide la empresa (por ejemplo, 90 días para operar y un año archivado por auditoría).

:::errores
- **Buscar logs de un recurso sin Diagnostic setting.** No hay nada que buscar: los resource logs no se guardan solos.
- **Esperar ver lo que pasó antes de crear el setting.** Solo se registra desde ese momento.
- **Contar corridas sin filtrar `InProgress`.** Cada corrida tiene una fila al arrancar y otra al terminar: cuentas el doble.
- **Probar con Debug y no encontrar los logs.** Debug no se envía a Azure Monitor; usa Trigger now.
- **Activar todas las categorías.** StorageRead de un lago muy leído es caro; elige lo que vas a usar.
- **Una alerta de logs con ventana igual a la frecuencia.** Los logs que llegan tarde quedan fuera de toda evaluación.
:::

## Ejercicios

:::ejercicio quiz
Creaste hoy a las 10:00 el Diagnostic setting del data factory. Un pipeline falló ayer a las 23:00. ¿Qué devuelve `ADFPipelineRun | where Status == "Failed"`?
- [ ] La corrida fallida de ayer
- [x] Nada: los resource logs se registran desde que existe el setting
- [ ] La corrida de ayer, pero sin el mensaje de error
- [ ] Un error porque la tabla no existe
:::

:::ejercicio quiz
¿Por qué `ADFPipelineRun | summarize count() by PipelineName` devuelve el doble de corridas de las que hubo?
- [ ] Porque cada corrida se guarda en dos workspaces
- [x] Porque hay una fila `InProgress` al arrancar y otra con el estado final
- [ ] Porque Debug y Trigger now se registran juntos
- [ ] Porque el Diagnostic setting está duplicado
:::

:::ejercicio quiz
¿Qué consulta responde "¿quién sigue usando la clave de la cuenta del lago?"
- [x] `StorageBlobLogs | where AuthenticationType == "AccountKey" | summarize count() by CallerIpAddress`
- [ ] `AzureActivity | where OperationNameValue == "ListKeys"`
- [ ] `ADFActivityRun | where ActivityType == "Copy"`
- [ ] Ninguna: Azure no registra cómo se autentica cada operación
:::

## ✅ Lo que lograste

- Sabes qué se guarda solo (métricas y Activity log) y qué necesita un Diagnostic setting (resource logs).
- Creaste el workspace y enviaste a él los logs de Data Factory, el lago, el Key Vault y la suscripción.
- Consultas con KQL corridas, errores, accesos al lago y lecturas de secretos, y sabes quedarte con la fila final de cada corrida.
- Convertiste una consulta en una alerta de logs con una ventana pensada para la demora de ingesta.
