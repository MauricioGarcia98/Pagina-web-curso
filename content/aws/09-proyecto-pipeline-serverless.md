---
titulo: Proyecto - un pipeline serverless de punta a punta en la consola
nivel: Experto
duracion: 90
resumen: Armas en la consola de AWS de práctica el pipeline que tendría un equipo de datos real. Un archivo llega a landing, una Lambda lo valida y lo pasa al lago, un job de Glue Studio lo limpia hacia silver y lo registra en el Data Catalog, Step Functions orquesta la corrida nocturna con aviso por SNS si falla, CloudWatch guarda los logs y la alarma, y Billing te dice cuánto costó.
objetivos: Construir un job visual de Glue con fuente, transformaciones, destino particionado y Data Catalog | Explicar qué hace un job bookmark y qué pasa sin él | Escribir y desplegar una Lambda disparada por S3 que valida archivos | Orquestar Glue, Athena y SNS con Step Functions, con Retry y Catch | Investigar una falla con CloudWatch Logs Insights y vigilar el pipeline con una alarma | Leer el costo del pipeline y crear un presupuesto
autoevaluacion: ¿Por qué la Lambda escribe en un prefijo distinto del que la dispara? | ¿Qué pasa si corres dos veces el job sin bookmark? | ¿Por qué el estado de Glue en Step Functions usa .sync? | ¿Dónde miras primero cuando el pipeline falla?
---

:::tip Todo en la misma consola
Este proyecto usa la [consola de AWS de práctica](#/aws): S3, Glue, Athena, **Lambda**, **Step Functions**, **CloudWatch** y **Billing** comparten el estado con el comando `aws` de la terminal. El job de Glue lee y escribe de verdad los archivos del bucket, la Lambda corre tu código Python y Step Functions llama a los servicios en orden. Nada toca una cuenta real.
:::

:::trabajo
**El pedido.** Tienda Andina recibe cada noche un CSV de pedidos de su sistema de ventas. Hoy alguien lo copia a mano al lago y corre un script: si el archivo llega mal, nadie se entera hasta que el tablero de la mañana muestra números raros. Te piden que el proceso sea automático, que un archivo roto no llegue al lago, que la guardia reciba un aviso si algo falla y saber cuánto cuesta.
:::

## El diseño

```diagrama
titulo: El pipeline de pedidos en AWS
nodo l: landing/pedidos/ | icono=archivo | col=0 | fila=0 | color=gris | sub=llega el CSV del día
nodo f: Lambda validar-pedidos | icono=lambda | col=1 | fila=0 | color=naranja | sub=revisa el encabezado
nodo b: pedidos/anio_mes=… | icono=almacen | col=2 | fila=0 | color=azul | sub=bronze, particionado
nodo s: Step Functions | icono=flujo | col=2 | fila=1 | color=violeta | sub=pipeline-pedidos, cada noche
nodo g: Glue job pedidos-silver | icono=engranaje | col=3 | fila=1 | color=verde | sub=limpia y registra en el catálogo
nodo a: Athena | icono=search | col=4 | fila=1 | color=azul | sub=control de filas
nodo n: SNS guardia-datos | icono=alerta | col=3 | fila=2 | color=rojo | sub=aviso si algo falla
nodo c: CloudWatch | icono=monitor | col=4 | fila=2 | color=gris | sub=logs, métricas y alarma
flecha l -> f | explica=Un disparador de S3 (ObjectCreated, prefijo landing/pedidos/, sufijo .csv) invoca la función por cada archivo nuevo.
flecha f -> b | explica=Si el encabezado tiene las columnas esperadas, la función copia el archivo a pedidos/anio_mes=AAAA-MM/. Si no, falla y el archivo queda en landing.
flecha s -> g | explica=La máquina de estados arranca el job con glue:startJobRun.sync: espera a que termine y falla si el job falla.
flecha b -> g | explica=El job lee los archivos de pedidos/; con el bookmark activo, solo los que no procesó antes.
flecha g -> a | explica=Con la tabla de silver en el Data Catalog, una consulta de Athena cuenta las filas como control.
flecha s -> n | estilo=punteada | explica=Si cualquier paso falla, el Catch publica la causa en el tópico de SNS de la guardia.
flecha g -> c | estilo=punteada | explica=Glue, Lambda y Step Functions escriben logs y métricas en CloudWatch; una alarma vigila las ejecuciones fallidas.
```

| Decisión | Por qué |
|---|---|
| La Lambda escribe en `pedidos/`, no en `landing/` | Si escribiera en el prefijo que la dispara, cada archivo que copia la volvería a invocar (un bucle recursivo) |
| Glue con **job bookmark** | Cada noche procesa solo los archivos nuevos; sin bookmark, relee todo y duplica silver |
| Step Functions en lugar de encadenar Lambdas | Reintentos, manejo de errores y un historial visual de cada corrida, sin código propio |
| Alarma sobre `ExecutionsFailed` | Avisa por el pipeline completo, no por cada pieza |

## Paso 1 — El lago y los datos

Si todavía no lo tienes (de [Glue](#/l/aws-glue) y [Athena](#/l/aws-athena)), en **S3 → Create bucket** crea `tienda-andina-lago-dev` y sube los **datos de ejemplo de pedidos** (quedan en `pedidos/anio_mes=AAAA-MM/pedidos.csv`). En **Glue → Databases** crea `lago_silver`.

## Paso 2 — El job de Glue Studio

**Glue → Visual ETL → Visual ETL**, nombre `pedidos-silver`. Arma los nodos:

1. **Source · Amazon S3**: `s3://tienda-andina-lago-dev/pedidos/`. Presiona **Preview**: como el primer nodo de *Change Schema* está vacío, la consola lo completa con las columnas del archivo.
2. **Change Schema (ApplyMapping)**: deja `pedido_id` (int), `cliente_id` (int), `fecha_pedido` (date), `estado` (string), `canal` (string) y `anio_mes` (string, sale de la carpeta). Las columnas que borres se descartan.
3. **Filter**: `estado` `!=` `cancelado`.
4. **Drop Duplicates**: clave `pedido_id`.
5. **Target**: `s3://tienda-andina-lago-dev/silver/pedidos/`, **partition keys** `anio_mes`, y *Create a table in the Data Catalog…* en `lago_silver`, tabla `pedidos`.
6. En **Job details**: 2 workers G.1X y **Job bookmark: Enable**. **Save** y **Run**.

En **Runs** aparece la corrida con las filas leídas y escritas, los **DPU hours** y los enlaces a los logs. La pestaña **Script** muestra el PySpark que Glue generó (`create_dynamic_frame`, `ApplyMapping.apply`, `getSink` con `enableUpdateCatalog=True` y `job.commit()`, que es lo que guarda el bookmark).

```captura
archivo: aws/a04-glue-studio.webp
texto: El job visual - la fuente S3 (1), las transformaciones (2) y el destino particionado con el Data Catalog (3)
```

:::cuidado El bookmark es la diferencia entre un pipeline y un generador de duplicados
Corre el job otra vez: con el bookmark activo lee **0 archivos nuevos** y termina bien. Desactívalo en *Job details*, córrelo dos veces y mira `silver/pedidos/`: cada corrida escribió los mismos pedidos de nuevo. En un lago real eso duplica las ventas del tablero. (Con **Reset job bookmark** vuelves a empezar.)
:::

## Paso 3 — La Lambda que valida

**Lambda → Create function** → `validar-pedidos`, Python 3.12. En **Code** reemplaza el código, presiona **Deploy** (sin Deploy, las invocaciones siguen usando el código anterior):

```python norun
import json
import logging
import urllib.parse
import boto3

logger = logging.getLogger()
logger.setLevel(logging.INFO)
s3 = boto3.client("s3")
COLUMNAS = {"pedido_id", "cliente_id", "fecha_pedido", "estado", "canal"}

def lambda_handler(event, context):
    r = event["Records"][0]["s3"]
    bucket = r["bucket"]["name"]
    clave = urllib.parse.unquote_plus(r["object"]["key"])
    texto = s3.get_object(Bucket=bucket, Key=clave)["Body"].read().decode("utf-8")
    lineas = [l for l in texto.splitlines() if l.strip()]
    encabezado = set(lineas[0].split(",")) if lineas else set()
    faltan = COLUMNAS - encabezado
    if faltan or len(lineas) < 2:
        # fallar a propósito: el archivo queda en landing y el error queda en CloudWatch
        raise ValueError(f"{clave}: faltan columnas {sorted(faltan)} o no tiene filas")
    mes = lineas[1].split(",")[3][:7]          # fecha_pedido de la primera fila
    destino = f"pedidos/anio_mes={mes}/{clave.split('/')[-1]}"
    s3.put_object(Bucket=bucket, Key=destino, Body=texto)
    logger.info("Validado %s: %d filas -> s3://%s/%s", clave, len(lineas) - 1, bucket, destino)
    return {"archivo": clave, "filas": len(lineas) - 1, "destino": destino}
```

En **Configuration → Triggers → Add trigger**: bucket `tienda-andina-lago-dev`, prefijo `landing/pedidos/`, sufijo `.csv`. Pruébalo desde la terminal con un archivo bueno y uno malo:

```bash
printf 'pedido_id,cliente_id,empleado_id,fecha_pedido,estado,canal,metodo_pago\n90001,15,,2026-11-22,entregado,web,tarjeta_debito\n' > pedidos_2026-11-22.csv
aws s3 cp pedidos_2026-11-22.csv s3://tienda-andina-lago-dev/landing/pedidos/
printf 'id;fecha;total\n1;2026-11-22;10\n' > roto.csv
aws s3 cp roto.csv s3://tienda-andina-lago-dev/landing/pedidos/
aws logs tail /aws/lambda/validar-pedidos --since 1h
```

En **Monitor** verás dos invocaciones: una correcta y otra con `ValueError`. La primera de la sesión muestra **Init Duration**: es el *cold start*, el tiempo de preparar el entorno de Python.

```captura
archivo: aws/a05-lambda.webp
texto: La función con su disparador de S3 (1), el código (2) y el resultado de una prueba con los logs (3)
```

## Paso 4 — La orquestación con Step Functions

**Step Functions → Create state machine** → plantilla *Pipeline de datos*, job `pedidos-silver` (o el nombre de tu job), nombre `pipeline-pedidos`. En **Definition**, agrega un control con Athena entre el ETL y el aviso de éxito:

```json
"Ejecutar ETL": { "...": "...", "Next": "Contar filas" },
"Contar filas": {
  "Type": "Task",
  "Resource": "arn:aws:states:::athena:startQueryExecution.sync",
  "Parameters": { "QueryString": "SELECT COUNT(*) AS filas FROM \"lago_silver\".\"pedidos\"", "WorkGroup": "primary" },
  "ResultPath": "$.control",
  "Catch": [{ "ErrorEquals": ["States.ALL"], "ResultPath": "$.error", "Next": "Avisar fallo" }],
  "Next": "Avisar exito"
}
```

**Save**, mira el grafo y **Start execution** con `{"fecha": "2026-11-22"}`. Cada estado se pinta de verde a medida que termina y la tabla **Events** muestra el detalle (`TaskScheduled`, `TaskSucceeded`…).

| Pieza del JSON | Qué hace |
|---|---|
| `glue:startJobRun.sync` | Arranca el job **y espera** a que termine; sin `.sync`, Step Functions sigue apenas el job arranca |
| `"--fecha.$": "$.fecha"` | Pasa al job un valor de la entrada (`.$` significa "tómalo de esta ruta") |
| `ResultPath` | Dónde guarda el resultado del paso sin pisar la entrada |
| `Retry` | Reintenta errores pasajeros (por ejemplo, otra corrida del mismo job en curso) |
| `Catch` | Ante cualquier otro error, va a *Avisar fallo* con la causa en `$.error` |

Ahora rómpelo a propósito: en el job, cambia el destino a un bucket que no existe y vuelve a ejecutar la máquina. *Ejecutar ETL* falla, el **Catch** lleva a *Avisar fallo* (que publica en SNS) y la ejecución termina en *Fallo* con la causa.

```captura
archivo: aws/a06-step-functions.webp
texto: Una ejecución fallida - el grafo con el paso que falló y el camino del Catch (1) y la causa del error (2)
```

:::nota Step Functions o Airflow
Hacen lo mismo con distinto modelo: Step Functions es administrado y se cobra por transición (US$0,025 cada 1.000), ideal si todo está en AWS. [Airflow](#/m/airflow) (o MWAA) conviene cuando el flujo cruza muchas herramientas o el equipo ya tiene sus DAGs.
:::

## Paso 5 — Investigar y vigilar con CloudWatch

Cuando algo falla, el orden es: **la ejecución** (qué paso falló) → **el log del servicio** (por qué). En **CloudWatch → Log groups** abre `/aws-glue/jobs/error` y el stream de la corrida: ahí está el `NoSuchBucket` o el `cannot resolve 'columna'`.

Para mirar varias cosas a la vez, **Logs Insights**:

```text
fields @timestamp, @logStream, @message
| filter @message like /ERROR/
| sort @timestamp desc
| limit 20
```

```text
filter @message like /REPORT/
| parse @message "Duration: * ms" as duracion
| stats avg(duracion) as promedio_ms, max(duracion) as max_ms, count(*) as invocaciones
```

Y una alarma para no depender de que alguien mire: **Metrics** → `AWS/States · pipeline-pedidos · ExecutionsFailed`, **Create alarm**: *Sum*, período 1 hora, *Greater than 0*, datos faltantes como *good*, tópico `alertas-datos` con el correo de la guardia. La próxima ejecución fallida la pasa a **ALARM** y publica el aviso.

```captura
archivo: aws/a07-cloudwatch.webp
texto: La alarma en ALARM (1) y el mensaje que recibió el tópico de SNS (2)
```

## Paso 6 — Cuánto costó

**Billing and Cost Management** junta lo que usaste: DPU-hora de Glue (el mínimo es 1 minuto por corrida, por eso una corrida de segundos cuesta igual que una de un minuto), datos escaneados por Athena (mínimo 10 MB por consulta), invocaciones y GB-segundo de Lambda, transiciones de Step Functions y almacenamiento de S3. Crea un **budget** de US$1 al mes con alertas al 80 % y al 100 %: es lo primero que se hace en una cuenta nueva.

:::errores
- **Disparador en el mismo prefijo donde escribe la función.** Bucle recursivo: AWS lo corta, pero ya gastaste invocaciones. Salida siempre en otro prefijo o bucket.
- **Glue sin bookmark en un proceso diario.** Duplica silver en cada corrida.
- **`startJobRun` sin `.sync` en Step Functions.** La máquina termina "bien" aunque el job falle después.
- **Una Lambda para procesos largos o pesados.** El límite es 15 minutos y 10 GB de memoria: eso es trabajo de Glue o EMR.
- **Editar el código de la Lambda y no presionar Deploy.** Las invocaciones siguen corriendo la versión anterior.
- **Log groups con "Never expire".** En producción se define una retención: los logs también se cobran.
:::

## Ejercicios

:::ejercicio quiz
La Lambda `validar-pedidos` escribe la salida en `landing/pedidos/validados/`. ¿Qué pasa?
- [ ] Nada: los archivos validados quedan ordenados
- [x] Cada archivo que escribe vuelve a disparar la función, porque coincide con el prefijo y el sufijo del disparador
- [ ] S3 rechaza la escritura
- [ ] El job de Glue los procesa dos veces
:::

:::ejercicio quiz
El job `pedidos-silver` tiene el bookmark desactivado y corre dos noches seguidas sin archivos nuevos. ¿Qué queda en `silver/pedidos/`?
- [ ] Los pedidos una sola vez
- [x] Los mismos pedidos escritos dos veces, en archivos distintos
- [ ] Nada: Glue borra la carpeta antes de escribir
- [ ] Un error por archivos duplicados
:::

:::ejercicio quiz
La ejecución de `pipeline-pedidos` terminó en *Fallo*. ¿Dónde está el mensaje exacto del error del ETL?
- [ ] En Billing
- [ ] En el grafo de Step Functions, únicamente
- [x] En el log group `/aws-glue/jobs/error`, en el stream de esa corrida (y resumido en la causa de la ejecución)
- [ ] En el Data Catalog
:::

## ✅ Lo que lograste

- Un job visual de Glue que limpia, deduplica, particiona y registra la tabla en el catálogo, con bookmark.
- Una Lambda disparada por S3 que deja pasar solo los archivos válidos.
- Una máquina de estados con Glue, Athena y SNS, con Retry y Catch.
- Logs, Logs Insights, una alarma con aviso y el costo del pipeline con su presupuesto.
