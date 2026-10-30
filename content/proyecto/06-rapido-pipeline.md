---
titulo: "Proyecto completo II · Rápido: el pipeline en producción"
nivel: Experto
duracion: 110
resumen: La segunda parte del proyecto de Rápido. Las reglas de negocio en Python con pruebas, el mart diario en PySpark, la tabla de hechos incremental en dbt, el DAG de Airflow con una compuerta de calidad que decide si se publica, la infraestructura en Google Cloud con Terraform y el workflow de CI. Termina con la checklist de entrega y cómo presentarlo.
objetivos: Programar reglas de validez y de negocio como funciones de Python con pruebas | Escribir el mart diario en PySpark con diferencias de timestamps y agregaciones condicionales | Convertir la tabla de hechos en un modelo incremental de dbt que solo procesa los días nuevos | Orquestar el pipeline en Airflow con una compuerta de calidad que frena la publicación | Crear la infraestructura del proyecto con Terraform y llevarla a CI
prerrequisitos: proyecto-rapido-modelo | dbt-materializaciones | airflow-control-flujo | terraform-plataforma-aws-gcp
autoevaluacion: ¿Sabes probar una regla de negocio con assert antes de usarla en un pipeline? | ¿Puedes calcular minutos entre dos timestamps en PySpark? | ¿Sabes escribir el filtro incremental de un modelo de dbt? | ¿Sabes qué hace un ShortCircuitOperator y por qué sirve como compuerta de calidad? | ¿Puedes listar los recursos de nube que necesita este proyecto y crearlos con Terraform?
---

:::escenario De la consulta al pipeline
Las consultas de la primera parte funcionan, y la directora ya vio los números. Ahora Martín pone la vara de producción:

> "Que corra solo todos los días a las 6, que si los datos están mal **no publique**, que se pueda reprocesar un día cualquiera, que la infraestructura esté en Terraform y que cualquier cambio pase por un pull request con pruebas. Cuando esté, me lo presentas en 10 minutos."
:::

## El pipeline completo

```diagrama
titulo: El pipeline diario de Rápido: cada pieza con su herramienta
nodo ing: Ingesta | icono=archivos | col=0 | fila=0 | color=gris | sub=copia de ayer\na bronze (GCS)
nodo stg: stg_rapido_pedidos | icono=transformar | col=1 | fila=0 | color=gris | sub=dbt (vista)\nreglas de validez
nodo fct: fct_rapido_pedidos | icono=tabla | col=2 | fila=0 | color=amarillo | sub=dbt incremental\npor fecha
nodo mart: mart diario | icono=spark | col=3 | fila=0 | color=naranja | sub=PySpark o dbt
nodo dq: Compuerta de calidad | icono=escudo | col=3 | fila=1 | color=rojo | sub=ShortCircuitOperator
nodo pub: Publicar | icono=dashboard | col=2 | fila=1 | color=verde | sub=refresca el tablero
nodo alerta: Alerta | icono=correo | col=1 | fila=1 | color=rojo | sub=si algo falla
nodo af: Airflow | icono=orquestador | col=0 | fila=1 | color=azul | sub=0 6 * * *\nreintentos, backfill
flecha ing -> stg
flecha stg -> fct
flecha fct -> mart
flecha mart -> dq
flecha dq -> pub: pasa
flecha dq -> alerta: no pasa | estilo=punteada
flecha af -> ing | estilo=punteada
```

| Pieza | Herramienta | Por qué esa |
|---|---|---|
| Reglas de negocio | Python con pruebas | Se prueban solas, se reutilizan en la app y en los controles |
| stg y fct | dbt | SQL versionado, `ref()` entre modelos, pruebas y documentación |
| Mart diario | PySpark (o dbt) | Cuando el volumen crece, Spark escala; aquí ves las dos versiones |
| Orquestación | Airflow | Horario, dependencias, reintentos, reprocesos por fecha |
| Infraestructura | Terraform | Buckets, datasets, cuenta de servicio y permisos, repetibles por entorno |
| Cambios | GitHub Actions | Pruebas y plan en cada pull request |

## 1. Python: las reglas de negocio, con pruebas

La regla de validez de la primera parte vive en un `CASE` de SQL. Escrita como función de Python, se puede **probar** con casos borde antes de confiar en ella, y reutilizar (por ejemplo, en el servicio que recibe los pedidos).

:::ejercicio python titulo="validar_pedido"
Escribe `validar_pedido(p)` que recibe un diccionario con `estado`, `subtotal`, `creado`, `aceptado`, `retirado`, `entregado` (textos `"AAAA-MM-DD hh:mm:ss"` o `None`) y devuelve la **lista** de reglas que incumple (vacía si es válido), con estos códigos: `"estado_desconocido"`, `"subtotal_no_positivo"`, `"faltan_tiempos"` (entregado sin alguno de los tres tiempos) y `"tiempos_desordenados"` (entregado con los cuatro tiempos pero no en orden creado ≤ aceptado ≤ retirado ≤ entregado).
```python inicial
ESTADOS = {"entregado", "cancelado_cliente", "cancelado_restaurante", "sin_repartidor"}

def validar_pedido(p):
    errores = []
    # tu código
    return errores

print(validar_pedido({"estado": "entregado", "subtotal": 20, "creado": "2024-08-14 20:00:00",
                      "aceptado": "2024-08-14 20:25:00", "retirado": "2024-08-14 20:22:00", "entregado": "2024-08-14 20:40:00"}))
```
```python solucion
ESTADOS = {"entregado", "cancelado_cliente", "cancelado_restaurante", "sin_repartidor"}

def validar_pedido(p):
    errores = []
    if p.get("estado") not in ESTADOS:
        errores.append("estado_desconocido")
    if not p.get("subtotal") or p["subtotal"] <= 0:
        errores.append("subtotal_no_positivo")
    if p.get("estado") == "entregado":
        tiempos = [p.get("creado"), p.get("aceptado"), p.get("retirado"), p.get("entregado")]
        if any(t is None for t in tiempos):
            errores.append("faltan_tiempos")
        elif tiempos != sorted(tiempos):
            errores.append("tiempos_desordenados")
    return errores

print(validar_pedido({"estado": "entregado", "subtotal": 20, "creado": "2024-08-14 20:00:00",
                      "aceptado": "2024-08-14 20:25:00", "retirado": "2024-08-14 20:22:00", "entregado": "2024-08-14 20:40:00"}))
```
```python test
ok = {"estado": "entregado", "subtotal": 20, "creado": "2024-03-01 20:00:00", "aceptado": "2024-03-01 20:03:00", "retirado": "2024-03-01 20:20:00", "entregado": "2024-03-01 20:41:00"}
assert validar_pedido(ok) == [], "Un pedido correcto no tiene errores"
assert validar_pedido(dict(ok, aceptado="2024-03-01 20:25:00")) == ["tiempos_desordenados"], "aceptado después de retirado"
assert validar_pedido(dict(ok, retirado=None)) == ["faltan_tiempos"]
assert validar_pedido(dict(ok, estado="ENTREGADO")) == ["estado_desconocido"], "Los estados distinguen mayúsculas"
assert validar_pedido(dict(ok, subtotal=0)) == ["subtotal_no_positivo"]
cancelado = {"estado": "cancelado_cliente", "subtotal": 15, "creado": "2024-03-01 20:00:00", "aceptado": None, "retirado": None, "entregado": None}
assert validar_pedido(cancelado) == [], "Un cancelado no necesita los tiempos"
assert validar_pedido(dict(ok, estado="x", subtotal=-1)) == ["estado_desconocido", "subtotal_no_positivo"], "Devuelve todas las reglas incumplidas"
```
```pista
Los textos en formato `AAAA-MM-DD hh:mm:ss` se ordenan igual que las fechas: `tiempos == sorted(tiempos)` comprueba el orden. Revisa primero si falta alguno (`None`), porque `sorted` no puede comparar `None` con texto.
```
:::

## 2. PySpark: el mart diario

Cuando Rápido opere en veinte ciudades con millones de pedidos por mes, el mart se calculará en Spark (Dataproc o Databricks). El código es la misma lógica de la primera parte.

:::ejercicio pyspark titulo="mart_operaciones_diario"
Con `spark.table("delivery_pedidos")`, calcula por `ciudad` y `fecha` (la fecha de `creado`, como texto `yyyy-MM-dd`): `pedidos`, `entregados`, `sin_repartidor`, `suma_min_total` (suma de minutos entre `creado` y `entregado` de los entregados, redondeada a 1) y `gmv` (suma de `subtotal` de los entregados, redondeada a 2). Para este ejercicio, usa todos los pedidos (sin la regla de validez). Guarda el resultado en `resultado`.
```python inicial
from pyspark.sql import functions as F

p = spark.table("delivery_pedidos")
entregado = F.col("estado") == "entregado"
minutos = (F.unix_timestamp("entregado") - F.unix_timestamp("creado")) / 60

resultado = None   # agrupa y agrega
```
```python solucion
from pyspark.sql import functions as F

p = spark.table("delivery_pedidos")
entregado = F.col("estado") == "entregado"
minutos = (F.unix_timestamp("entregado") - F.unix_timestamp("creado")) / 60

resultado = (p.withColumn("fecha", F.date_format(F.to_timestamp("creado"), "yyyy-MM-dd"))
              .groupBy("ciudad", "fecha")
              .agg(F.count("*").alias("pedidos"),
                   F.sum(F.when(entregado, 1).otherwise(0)).alias("entregados"),
                   F.sum(F.when(F.col("estado") == "sin_repartidor", 1).otherwise(0)).alias("sin_repartidor"),
                   F.round(F.sum(F.when(entregado, minutos)), 1).alias("suma_min_total"),
                   F.round(F.sum(F.when(entregado, F.col("subtotal")).otherwise(0)), 2).alias("gmv")))
```
```pista
`F.unix_timestamp(col)` da segundos; la diferencia dividida por 60 son minutos. `F.when(condición, valor)` sin `otherwise` deja `null` cuando no se cumple, y `F.sum` ignora los `null`: así sumas solo los entregados.
```
:::

## 3. dbt: la tabla de hechos incremental

`fct_rapido_pedidos` crece todos los días y los días cerrados no cambian. En dbt se escribe como modelo **incremental**: la primera vez procesa todo; después, solo las fechas posteriores a la última que ya tiene. En el proyecto de dbt:

```text
models/
├── staging/stg_rapido_pedidos.sql        ← vista: las reglas de validez (es_valido)
├── marts/fct_rapido_pedidos.sql          ← incremental por fecha
├── marts/mart_operaciones_diario.sql
└── schema.yml                     ← pruebas: unique, not_null, accepted_values, relationships
```

:::ejercicio dbt incremental this=fct_rapido_pedidos titulo="fct_rapido_pedidos incremental"
`stg_rapido_pedidos` ya existe (pedidos con `fecha` y `es_valido`) y `fct_rapido_pedidos` ya tiene los días **hasta el 30 de noviembre de 2024**. Escribe el modelo incremental que, a partir de `ref('stg_rapido_pedidos')` filtrando `es_valido = 1`, devuelve `pedido_id`, `fecha`, `ciudad`, `estado`, `min_total` (minutos entre `creado` y `entregado`, redondeado a 1) y `gmv` (subtotal si se entregó, 0 si no); y que cuando `is_incremental()` sea verdadero procese solo las fechas mayores a la máxima de `{{ this }}`.
```sql previo
CREATE TABLE stg_rapido_pedidos AS
SELECT p.*, date(p.creado) AS fecha,
       CASE WHEN p.estado = 'entregado' AND NOT (p.creado <= p.aceptado AND p.aceptado <= p.retirado AND p.retirado <= p.entregado) THEN 0 ELSE 1 END AS es_valido
FROM delivery_pedidos p;
CREATE TABLE fct_rapido_pedidos AS
SELECT pedido_id, fecha, ciudad, estado,
       ROUND((julianday(entregado) - julianday(creado)) * 1440, 1) AS min_total,
       CASE WHEN estado = 'entregado' THEN subtotal ELSE 0 END AS gmv
FROM stg_rapido_pedidos WHERE es_valido = 1 AND fecha <= '2024-11-30'
```
```sql inicial
{{ config(materialized='incremental', unique_key='pedido_id') }}

select pedido_id, fecha, ciudad, estado,
       round((julianday(entregado) - julianday(creado)) * 1440, 1) as min_total,
       case when estado = 'entregado' then subtotal else 0 end as gmv
from {{ ref('stg_rapido_pedidos') }}
where es_valido = 1
-- filtro incremental aquí
```
```sql solucion
{{ config(materialized='incremental', unique_key='pedido_id') }}

select pedido_id, fecha, ciudad, estado,
       round((julianday(entregado) - julianday(creado)) * 1440, 1) as min_total,
       case when estado = 'entregado' then subtotal else 0 end as gmv
from {{ ref('stg_rapido_pedidos') }}
where es_valido = 1
{% if is_incremental() %}
  and fecha > (select max(fecha) from {{ this }})
{% endif %}
```
```pista
Ya hay un `where`: el filtro incremental se agrega con `and` dentro de `{% if is_incremental() %} … {% endif %}`, comparando con `(select max(fecha) from {{ this }})`.
```
:::

:::nota Reprocesar un día
¿Y si el incidente de agosto se corrige en la fuente y hay que recalcular esos tres días? Con `unique_key='pedido_id'`, dbt actualiza las filas existentes. Para reprocesar fechas puntuales, el modelo acepta una variable (`--vars '{"desde": "2024-08-14"}'`) que reemplaza el filtro incremental, o se usa la estrategia `insert_overwrite` por partición en BigQuery. Y para reconstruir todo: `dbt build --full-refresh -s fct_rapido_pedidos`.
:::

## 4. Airflow: el DAG con compuerta de calidad

La compuerta es un **`ShortCircuitOperator`**: ejecuta una función; si devuelve `True`, el DAG sigue; si devuelve `False`, **saltea** todo lo que viene después (no publica) sin marcar el DAG como roto. Los controles bloqueantes devuelven `False`; los de advertencia solo dejan un mensaje.

:::ejercicio airflow titulo="DAG rapido_operaciones"
Crea el DAG `rapido_operaciones` con `schedule="0 6 * * *"`, `start_date` 2024-01-01 y `catchup=False`, con `default_args={"retries": 2}` y estas tareas en orden:

1. `ingesta`: `BashOperator` con `bash_command="python ingesta.py --fecha {{ ds }}"`.
2. `dbt_build`: `BashOperator` con `bash_command="dbt build -s +mart_operaciones_diario"`.
3. `compuerta_calidad`: `ShortCircuitOperator` que llama a `pasa_calidad`, que devuelve `True` solo si **ningún** control del diccionario `CONTROLES` con severidad `"bloqueante"` tiene `filas > 0`.
4. `publicar`: `EmptyOperator`.
```python inicial
from datetime import datetime
from airflow.sdk import DAG
from airflow.providers.standard.operators.bash import BashOperator
from airflow.providers.standard.operators.python import ShortCircuitOperator
from airflow.providers.standard.operators.empty import EmptyOperator

# resultado de los controles de hoy: filas problemáticas que devolvió cada consulta
CONTROLES = {
    "frescura_ayer": {"severidad": "bloqueante", "filas": 0},
    "pedido_id_unico": {"severidad": "bloqueante", "filas": 0},
    "pct_invalidos": {"severidad": "advertencia", "filas": 3},
}

def pasa_calidad():
    pass
```
```python solucion
from datetime import datetime
from airflow.sdk import DAG
from airflow.providers.standard.operators.bash import BashOperator
from airflow.providers.standard.operators.python import ShortCircuitOperator
from airflow.providers.standard.operators.empty import EmptyOperator

CONTROLES = {
    "frescura_ayer": {"severidad": "bloqueante", "filas": 0},
    "pedido_id_unico": {"severidad": "bloqueante", "filas": 0},
    "pct_invalidos": {"severidad": "advertencia", "filas": 3},
}

def pasa_calidad():
    fallan = [n for n, c in CONTROLES.items() if c["severidad"] == "bloqueante" and c["filas"] > 0]
    avisos = [n for n, c in CONTROLES.items() if c["severidad"] == "advertencia" and c["filas"] > 0]
    if avisos:
        print("Advertencias:", avisos)
    return not fallan

with DAG("rapido_operaciones", schedule="0 6 * * *", start_date=datetime(2024, 1, 1),
         catchup=False, default_args={"retries": 2}) as dag:
    ingesta = BashOperator(task_id="ingesta", bash_command="python ingesta.py --fecha {{ ds }}")
    dbt = BashOperator(task_id="dbt_build", bash_command="dbt build -s +mart_operaciones_diario")
    compuerta = ShortCircuitOperator(task_id="compuerta_calidad", python_callable=pasa_calidad)
    publicar = EmptyOperator(task_id="publicar")
    ingesta >> dbt >> compuerta >> publicar
```
```python test
d = dags.get("rapido_operaciones")
assert d is not None, "No encontré el DAG 'rapido_operaciones'"
assert d.catchup is False
orden = ["ingesta", "dbt_build", "compuerta_calidad", "publicar"]
for a, b in zip(orden, orden[1:]):
    assert d.get_task(a).downstream_task_ids == {b}, f"{a} debe ir antes de {b}"
assert "{{ ds }}" in d.get_task("ingesta").bash_command, "La ingesta recibe la fecha lógica {{ ds }} para poder reprocesar días"
assert d.get_task("dbt_build").retries == 2, "default_args debe dar 2 reintentos"
run = d.test()
assert run.states["publicar"] == "success", "Con solo advertencias, se publica"
CONTROLES["pedido_id_unico"]["filas"] = 4
run2 = d.test()
assert run2.states["compuerta_calidad"] == "success" and run2.states["publicar"] == "skipped", "Un control bloqueante con filas saltea la publicación"
```
```pista
`pasa_calidad` lee `CONTROLES` al ejecutarse: devuelve `False` si alguno con severidad `"bloqueante"` tiene `filas > 0`. Con `ShortCircuitOperator`, `False` hace que `publicar` quede en `skipped`.
```
:::

## 5. Terraform: la infraestructura en Google Cloud

Rápido trabaja en Google Cloud. El proyecto necesita: un bucket para bronze, datasets de BigQuery para silver y gold, una cuenta de servicio para el pipeline con permisos **solo** sobre esos recursos, y el estado de Terraform en un bucket aparte.

```hcl
# infra/envs/dev/main.tf
terraform {
  backend "gcs" {
    bucket = "rapido-tfstate"
    prefix = "operaciones/dev"
  }
}

provider "google" {
  project = "rapido-datos-dev"
  region  = "us-central1"
}

locals {
  entorno = "dev"
  capas   = toset(["silver", "gold"])
}

resource "google_storage_bucket" "bronze" {
  name                        = "rapido-${local.entorno}-bronze"
  location                    = "US"
  uniform_bucket_level_access = true
  lifecycle_rule {
    condition {
      age = 90                      # bronze se guarda 90 días
    }
    action {
      type = "Delete"
    }
  }
}

resource "google_bigquery_dataset" "capa" {
  for_each   = local.capas
  dataset_id = "rapido_${each.key}"
  location   = "US"
}

resource "google_service_account" "pipeline" {
  account_id   = "pipeline-operaciones"
  display_name = "Pipeline del tablero de operaciones"
}

resource "google_storage_bucket_iam_member" "pipeline_bronze" {
  bucket = google_storage_bucket.bronze.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.pipeline.email}"
}

resource "google_bigquery_dataset_iam_member" "pipeline_capas" {
  for_each   = local.capas
  dataset_id = google_bigquery_dataset.capa[each.key].dataset_id
  role       = "roles/bigquery.dataEditor"
  member     = "serviceAccount:${google_service_account.pipeline.email}"
}

resource "google_project_iam_member" "pipeline_jobs" {
  project = "rapido-datos-dev"
  role    = "roles/bigquery.jobUser"
  member  = "serviceAccount:${google_service_account.pipeline.email}"
}

output "cuenta_pipeline" {
  value = google_service_account.pipeline.email
}
```

:::ejercicio cli
El archivo de arriba (sin el bloque `backend`, para el laboratorio) ya está en `~/rapido/infra`. Con la sesión de Google Cloud iniciada y `terraform init` hecho, crea la infraestructura sin que pida confirmación.
```respuesta
terraform apply -auto-approve
```
```setup
gcloud auth login
gcloud config set project rapido-datos-dev
mkdir -p ~/rapido/infra
printf 'provider "google" {\n  project = "rapido-datos-dev"\n  region  = "us-central1"\n}\n\nlocals {\n  capas = toset(["silver", "gold"])\n}\n\nresource "google_storage_bucket" "bronze" {\n  name                        = "rapido-dev-bronze"\n  location                    = "US"\n  uniform_bucket_level_access = true\n}\n\nresource "google_bigquery_dataset" "capa" {\n  for_each   = local.capas\n  dataset_id = "rapido_${each.key}"\n  location   = "US"\n}\n\nresource "google_service_account" "pipeline" {\n  account_id = "pipeline-operaciones"\n}\n\nresource "google_storage_bucket_iam_member" "pipeline_bronze" {\n  bucket = google_storage_bucket.bronze.name\n  role   = "roles/storage.objectAdmin"\n  member = "serviceAccount:${google_service_account.pipeline.email}"\n}\n\noutput "cuenta_pipeline" {\n  value = google_service_account.pipeline.email\n}\n' > ~/rapido/infra/main.tf
cd ~/rapido/infra
terraform init
```
:::

:::ejercicio cli
La infraestructura ya está creada. Verifica con la CLI de BigQuery que existen los datasets del proyecto.
```respuesta
bq ls
bq ls --project_id=rapido-datos-dev
bq ls --project_id rapido-datos-dev
```
```setup
gcloud auth login
gcloud config set project rapido-datos-dev
mkdir -p ~/rapido/infra2
printf 'provider "google" {\n  project = "rapido-datos-dev"\n}\n\nresource "google_bigquery_dataset" "capa" {\n  for_each   = toset(["silver", "gold"])\n  dataset_id = "rapido_${each.key}"\n  location   = "US"\n}\n' > ~/rapido/infra2/main.tf
cd ~/rapido/infra2
terraform init
terraform apply -auto-approve
```
:::

## 6. CI: cada cambio, probado

El repositorio del proyecto tiene tres carpetas (`ingesta/`, `dbt/`, `infra/`) y un workflow que, en cada pull request, corre lo que corresponde a lo que cambió:

```yaml
# .github/workflows/ci.yml
name: ci
on: [pull_request]

permissions:
  id-token: write
  contents: read

jobs:
  python:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.12" }
      - run: pip install -r requirements.txt
      - run: ruff check . && pytest -q          # validar_pedido y compañía

  dbt:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: google-github-actions/auth@v2       # OIDC: sin claves guardadas
        with:
          workload_identity_provider: projects/123/locations/global/workloadIdentityPools/github/providers/github
          service_account: ci-dbt@rapido-datos-dev.iam.gserviceaccount.com
      - run: pip install dbt-bigquery
      - run: dbt build --target ci --select state:modified+ --defer --state ./prod-manifest

  terraform:
    runs-on: ubuntu-latest
    defaults: { run: { working-directory: infra/envs/dev } }
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3
      - run: terraform fmt -check -recursive && terraform init -input=false && terraform validate
      - run: terraform plan -input=false -no-color
```

`dbt build --select state:modified+` construye y prueba **solo** los modelos que cambiaron y los que dependen de ellos, en un dataset de CI; `--defer` lee lo que no cambió desde producción. Así un pull request de dbt tarda minutos, no horas.

## 7. La entrega

Antes de decir "está listo", la checklist:

| Área | Listo cuando… |
|---|---|
| **Datos** | El GMV de un mes cerrado coincide con finanzas (o la diferencia está explicada) |
| **Calidad** | Los controles bloqueantes y de advertencia corren cada día y alguien recibe las alertas |
| **Operación** | El DAG corre a las 6:00, tiene reintentos y se probó un reproceso de un día |
| **Código** | Todo en Git, con pruebas en CI y revisión de otra persona |
| **Infraestructura** | Creada con Terraform; dev y prod con el mismo código |
| **Documentación** | README con el diagrama, las definiciones de las métricas y qué hacer si falla |
| **Costos** | Particiones por fecha en BigQuery y retención en bronze; costo mensual estimado |

### Cómo presentarlo en 10 minutos

1. **El problema** (1 min): qué decisión necesitaba tomar operaciones.
2. **El resultado** (2 min): el tablero, y una conclusión concreta ("la preparación pesa tanto como el viaje; estos 10 restaurantes explican el X % de las demoras").
3. **Cómo está hecho** (4 min): el diagrama del pipeline, las decisiones (grano, medidas aditivas, incremental, compuerta de calidad) y por qué.
4. **Confiabilidad** (2 min): controles, el incidente de agosto que se detectó, reprocesos.
5. **Lo que sigue** (1 min): fase 2 en tiempo real, más ciudades, costos.

<!-- estandar:errores -->
:::errores
- **Probar el pipeline solo con datos buenos**: el incidente de agosto existe para eso. Cada control se prueba con un caso que lo hace fallar.
- **Un DAG que hace todo en una tarea**: si falla, no sabes dónde, y reintentar repite todo. Una tarea por paso.
- **Fechas "de hoy" dentro del código**: el reproceso de un día viejo vuelve a procesar hoy. Usa la fecha lógica de Airflow (`{{ ds }}`) en todas las tareas.
- **Permisos de administrador para la cuenta del pipeline**: si se filtra, se filtra todo. Permisos por recurso, como en el `main.tf`.
- **Presentar el cómo antes que el qué**: a la directora le importa la decisión que puede tomar; la arquitectura va después.
:::

<!-- estandar:trabajo -->
:::trabajo
- Así se ve un proyecto "de verdad" en un equipo de datos: relevamiento, capas, pruebas, orquestación, infraestructura como código y CI. La diferencia entre un junior y un semi senior suele estar en los pasos 4 a 7, no en el SQL.
- En tu portafolio, este proyecto va en un repositorio público con un README que tenga el diagrama, las preguntas de negocio, las decisiones y capturas del tablero. Puedes reproducirlo en tu computadora con DuckDB, dbt y Airflow (lo ves en el módulo "Desde tu computadora").
:::

<!-- estandar:entrevista -->
:::entrevista "¿Cómo te aseguras de que un pipeline no publique datos malos?"
Separo los controles en bloqueantes y de advertencia. Los bloqueantes (frescura, unicidad de la clave, totales que no cuadran con la fuente) van en una compuerta antes de publicar: en Airflow, un ShortCircuitOperator o una tarea que falla, de modo que el tablero sigue mostrando el dato de ayer en lugar de uno incorrecto, y alguien recibe una alerta. Los de advertencia (volumen fuera de lo normal, porcentaje de registros inválidos) publican con una nota. Todos los controles devuelven las filas problemáticas para investigar, y cada uno se prueba con un caso que lo hace fallar.
:::
