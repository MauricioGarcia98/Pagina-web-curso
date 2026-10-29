---
titulo: "Proyecto: la plataforma de datos en AWS y en Google Cloud"
nivel: Avanzado
duracion: 90
resumen: El mismo lakehouse en las otras dos nubes. En AWS, lago en S3, catálogo y crawler de Glue, job de Spark con su script, rol IAM de permisos mínimos y workgroup de Athena con límite de costo. En Google Cloud, buckets, datasets y una tabla particionada de BigQuery, cuenta de servicio con IAM y Pub/Sub para eventos.
objetivos: Construir con Terraform un lago en S3 con catálogo de Glue, crawler, job y Athena, con sus dependencias | Escribir políticas IAM con jsonencode y expresiones for, aplicando el principio de permisos mínimos | Construir en Google Cloud buckets, datasets, una tabla particionada y agrupada de BigQuery y una suscripción de Pub/Sub | Dar permisos a una cuenta de servicio a nivel de bucket, dataset y proyecto | Comparar las piezas equivalentes de Azure, AWS y Google Cloud en Terraform
prerrequisitos: terraform-plataforma-azure-databricks | aws-glue | gcp-bigquery-fundamentos
autoevaluacion: ¿Puedes escribir el rol y la política de un job de Glue con jsonencode? | ¿Sabes subir un script a S3 con Terraform y usarlo en un job? | ¿Sabes limitar cuánto puede escanear una consulta de Athena? | ¿Sabes definir el esquema, la partición y el clustering de una tabla de BigQuery en Terraform? | ¿Sabes la diferencia entre dar un rol en el proyecto y en un recurso?
---

:::escenario Dos adquisiciones, dos nubes
El Grupo Andino compró dos empresas: **Ritmo** (la app de música) trabaja en AWS, y **Rápido** (delivery) en Google Cloud. La dirección decidió no migrarlas por ahora, pero exige el mismo estándar en las tres nubes: lago con capas, catálogo, permisos mínimos, todo en Terraform. Martín te pasa el pedido:

> "Repliquen el lakehouse de Azure en AWS para Ritmo y en Google Cloud para Rápido. Mismos nombres de capas, mismas etiquetas, mismo orden en el código. El que sepa leer uno tiene que poder leer los otros dos."
:::

## Las mismas piezas en tres nubes

| Pieza | Azure | AWS | Google Cloud |
|---|---|---|---|
| Lago | `azurerm_storage_data_lake_gen2_filesystem` | `aws_s3_bucket` | `google_storage_bucket` |
| Catálogo | Unity Catalog (`databricks_schema`) | `aws_glue_catalog_database` | `google_bigquery_dataset` |
| Descubrir esquemas | Auto Loader / tablas externas | `aws_glue_crawler` | Tablas externas / BigLake |
| Procesar (Spark) | `databricks_job` | `aws_glue_job` | `google_dataproc_*` |
| Consultar con SQL | `databricks_sql_endpoint` | `aws_athena_workgroup` | BigQuery |
| Identidad del proceso | Identidad administrada | `aws_iam_role` | `google_service_account` |
| Dar permisos | `azurerm_role_assignment` | `aws_iam_policy` + attachment | `google_*_iam_member` |
| Eventos | `azurerm_eventhub` | `aws_kinesis_stream` | `google_pubsub_topic` |
| Secretos | `azurerm_key_vault_secret` | `aws_secretsmanager_secret` | `google_secret_manager_secret` |

## Parte 1: AWS para Ritmo

```diagrama
titulo: El lago de Ritmo en AWS: todo lo crea Terraform, con un rol de permisos mínimos para Glue
nodo br: andina-dev-bronze | icono=bucket | col=0 | fila=0 | color=naranja | sub=datos crudos
nodo sv: andina-dev-silver | icono=bucket | col=1 | fila=0 | color=gris
nodo gd: andina-dev-gold | icono=bucket | col=2 | fila=0 | color=amarillo
nodo art: andina-dev-artefactos | icono=codigo | col=3 | fila=0 | color=violeta | sub=scripts y resultados\nde Athena
nodo cr: Crawler bronze | icono=lupa | col=0 | fila=1 | color=cian | sub=todas las noches 02:00
nodo cat: Glue Data Catalog | icono=tabla | col=1 | fila=1 | color=azul | sub=andina_dev_bronze/silver/gold
nodo job: Job silver_pedidos | icono=spark | col=2 | fila=1 | color=rojo | sub=Glue 4.0 · 2 × G.1X
nodo ath: Athena analistas | icono=lupa | col=3 | fila=1 | color=verde | sub=máx. 10 GB por consulta
nodo rol: Rol IAM glue | icono=escudo | col=1 | fila=2 | color=rojo | sub=solo los 3 buckets
flecha cr -> br: lee
flecha cr -> cat: registra tablas
flecha job -> br: lee
flecha job -> sv: escribe
flecha art -> job: script | estilo=punteada
flecha ath -> cat
flecha rol -> cr | estilo=punteada
flecha rol -> job | estilo=punteada
```

### Proveedor con etiquetas para todo

```hcl
provider "aws" {
  region = "us-east-1"

  default_tags {
    tags = {
      proyecto = "lakehouse"
      entorno  = "dev"
    }
  }
}

data "aws_caller_identity" "yo" {}     # la cuenta en la que estás: data.aws_caller_identity.yo.account_id

locals {
  prefijo = "andina-dev"
  capas   = toset(["bronze", "silver", "gold"])
}
```

`default_tags` pone esas etiquetas en **todos** los recursos de este proveedor: no hace falta repetirlas.

### Lago y artefactos

```hcl
resource "aws_s3_bucket" "capa" {
  for_each = local.capas
  bucket   = "${local.prefijo}-${each.key}"
}

resource "aws_s3_bucket" "artefactos" {
  bucket = "${local.prefijo}-artefactos"
}

# el script del job viaja con el código de Terraform
resource "aws_s3_object" "script" {
  bucket = aws_s3_bucket.artefactos.id
  key    = "glue/silver_pedidos.py"
  source = "${path.module}/glue/silver_pedidos.py"
  etag   = filemd5("${path.module}/glue/silver_pedidos.py")
}
```

`etag = filemd5(...)` hace que Terraform vuelva a subir el script cuando cambia su contenido. En el laboratorio, usa `content = "print('silver')"` en lugar de `source` y `etag`.

### El rol de Glue con permisos mínimos

Un **rol** de IAM tiene dos partes: **quién puede usarlo** (la *trust policy*, `assume_role_policy`) y **qué puede hacer** (las políticas que se le adjuntan).

```hcl
resource "aws_iam_role" "glue" {
  name = "${local.prefijo}-glue"

  # quién: solo el servicio Glue puede asumir este rol
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Action    = "sts:AssumeRole"
      Principal = { Service = "glue.amazonaws.com" }
    }]
  })
}

# qué: leer y escribir objetos SOLO en los tres buckets del lago
resource "aws_iam_policy" "lago" {
  name = "${local.prefijo}-lago-rw"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
        Resource = [for b in aws_s3_bucket.capa : "${b.arn}/*"]
      },
      {
        Effect   = "Allow"
        Action   = ["s3:ListBucket"]
        Resource = [for b in aws_s3_bucket.capa : b.arn]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lago" {
  role       = aws_iam_role.glue.name
  policy_arn = aws_iam_policy.lago.arn
}

resource "aws_iam_role_policy_attachment" "glue_servicio" {
  role       = aws_iam_role.glue.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSGlueServiceRole"
}
```

- **`jsonencode`** convierte un objeto de HCL en el texto JSON que pide IAM. Es mejor que escribir el JSON como texto: Terraform revisa la sintaxis y puedes usar expresiones.
- **`[for b in aws_s3_bucket.capa : "${b.arn}/*"]`** arma la lista de los tres ARN. Si agregas una capa, la política se actualiza sola.
- Los objetos (`GetObject`) se autorizan sobre `arn/*`; listar (`ListBucket`), sobre el bucket (`arn`). Confundirlos es el error de IAM más común en S3.

### Catálogo, crawler, job y Athena

```hcl
resource "aws_glue_catalog_database" "capa" {
  for_each = local.capas
  name     = "andina_dev_${each.key}"         # Glue no acepta guiones: guiones bajos
}

resource "aws_glue_crawler" "bronze" {
  name          = "${local.prefijo}-bronze-pedidos"
  database_name = aws_glue_catalog_database.capa["bronze"].name
  role          = aws_iam_role.glue.arn
  schedule      = "cron(0 2 * * ? *)"
  s3_target {
    path = "s3://${aws_s3_bucket.capa["bronze"].bucket}/pedidos/"
  }
}

resource "aws_glue_job" "silver" {
  name              = "${local.prefijo}-silver-pedidos"
  role_arn          = aws_iam_role.glue.arn
  glue_version      = "4.0"
  worker_type       = "G.1X"
  number_of_workers = 2
  command {
    script_location = "s3://${aws_s3_bucket.artefactos.bucket}/${aws_s3_object.script.key}"
    python_version  = "3"
  }
  default_arguments = {
    "--origen"  = "s3://${aws_s3_bucket.capa["bronze"].bucket}/pedidos/"
    "--destino" = "s3://${aws_s3_bucket.capa["silver"].bucket}/pedidos/"
  }
}

resource "aws_athena_workgroup" "analistas" {
  name = "${local.prefijo}-analistas"
  configuration {
    enforce_workgroup_configuration = true
    bytes_scanned_cutoff_per_query  = 10737418240          # 10 GB: corta consultas caras
    result_configuration {
      output_location = "s3://${aws_s3_bucket.artefactos.bucket}/athena/"
    }
  }
}
```

`bytes_scanned_cutoff_per_query` es un **control de costos en código**: Athena cobra por dato escaneado, y una consulta sin filtro de partición sobre años de datos se corta antes de costar cientos de dólares.

### Laboratorio AWS

```bash norun
aws configure
mkdir -p ~/infra/ritmo && cd ~/infra/ritmo
code main.tf                 # todo lo de la parte 1 (con content = "print('silver')" en el script)
terraform init
terraform apply -auto-approve          # Plan: 15 to add
aws glue get-databases --query 'DatabaseList[].Name' --output text
aws glue get-crawler --name andina-dev-bronze-pedidos --query Crawler.Targets
aws glue get-job --job-name andina-dev-silver-pedidos --query Job.Command.ScriptLocation --output text
aws s3 cp s3://andina-dev-artefactos/glue/silver_pedidos.py -
```

Cuenta los 15: 4 buckets, 1 objeto, 1 rol, 1 política, 2 attachments, 3 bases, 1 crawler, 1 job y 1 workgroup.

## Parte 2: Google Cloud para Rápido

```diagrama
titulo: Rápido en Google Cloud: lago, BigQuery por capas, eventos y una cuenta de servicio con permisos por recurso
nodo app: App de Rápido | icono=movil | col=0 | fila=0 | color=gris | sub=eventos de pedidos
nodo topic: eventos-pedidos | icono=stream | col=1 | fila=0 | color=cian | sub=Pub/Sub topic
nodo subs: eventos-pedidos-bq | icono=stream | col=2 | fila=0 | color=cian | sub=suscripción
nodo gcs: andina-dev-bronze/silver/gold | icono=bucket | col=0 | fila=1 | color=azul | sub=uniform access
nodo bq: andina_bronze/silver/gold | icono=base | col=2 | fila=1 | color=verde | sub=datasets de BigQuery
nodo tabla: silver.pedidos | icono=tabla | col=3 | fila=1 | color=verde | sub=partición por fecha\ncluster por cliente_id
nodo sa: etl-andina-dev | icono=llave | col=1 | fila=2 | color=rojo | sub=cuenta de servicio del ETL
flecha app -> topic
flecha topic -> subs
flecha subs -> bq | estilo=punteada
flecha bq -> tabla
flecha sa -> gcs: objectAdmin por bucket
flecha sa -> bq: dataEditor en silver
```

```hcl
provider "google" {
  project = "academia-datos-dev"
  region  = "us-central1"
}

locals {
  capas = toset(["bronze", "silver", "gold"])
}

resource "google_storage_bucket" "capa" {
  for_each                    = local.capas
  name                        = "andina-dev-${each.key}"
  location                    = "US"
  uniform_bucket_level_access = true          # permisos solo por IAM, sin ACL por objeto
  labels = {
    capa = each.key
  }
}

resource "google_bigquery_dataset" "capa" {
  for_each   = local.capas
  dataset_id = "andina_${each.key}"
  location   = "US"                            # la misma ubicación que los buckets
}

resource "google_bigquery_table" "pedidos" {
  dataset_id          = google_bigquery_dataset.capa["silver"].dataset_id
  table_id            = "pedidos"
  deletion_protection = false                  # en prod: true

  time_partitioning {
    type  = "DAY"
    field = "fecha"
  }
  clustering = ["cliente_id"]

  schema = jsonencode([
    { name = "pedido_id", type = "INT64", mode = "REQUIRED" },
    { name = "cliente_id", type = "INT64", mode = "REQUIRED" },
    { name = "fecha", type = "DATE", mode = "REQUIRED" },
    { name = "total", type = "NUMERIC", mode = "NULLABLE" }
  ])
}
```

La tabla queda **particionada por día** (una consulta con `WHERE fecha = ...` lee solo esa partición) y **agrupada** (*clustered*) por cliente: lo que viste en BigQuery, ahora en código revisable.

### Identidad y permisos

```hcl
resource "google_service_account" "etl" {
  account_id   = "etl-andina-dev"
  display_name = "ETL del lakehouse"
}

# permiso sobre CADA bucket, no sobre todo el proyecto
resource "google_storage_bucket_iam_member" "etl_lago" {
  for_each = local.capas
  bucket   = google_storage_bucket.capa[each.key].name
  role     = "roles/storage.objectAdmin"
  member   = "serviceAccount:${google_service_account.etl.email}"
}

# ejecutar consultas sí es un permiso de proyecto
resource "google_project_iam_member" "etl_bq" {
  project = "academia-datos-dev"
  role    = "roles/bigquery.jobUser"
  member  = "serviceAccount:${google_service_account.etl.email}"
}

# escribir tablas, solo en silver
resource "google_bigquery_dataset_iam_member" "etl_silver" {
  dataset_id = google_bigquery_dataset.capa["silver"].dataset_id
  role       = "roles/bigquery.dataEditor"
  member     = "serviceAccount:${google_service_account.etl.email}"
}

resource "google_pubsub_topic" "eventos" {
  name = "eventos-pedidos"
}

resource "google_pubsub_subscription" "a_bigquery" {
  name                 = "eventos-pedidos-bq"
  topic                = google_pubsub_topic.eventos.id
  ack_deadline_seconds = 30
}
```

:::cuidado _member, _binding y _policy
En Google Cloud hay tres recursos de IAM para cada cosa, y mezclarlos rompe permisos:
- **`google_*_iam_member`**: agrega **una** persona a un rol. No toca a los demás. Es el más seguro.
- **`google_*_iam_binding`**: define **la lista completa** de miembros de un rol. Quita a los que no estén en la lista.
- **`google_*_iam_policy`**: define **toda** la política del recurso. Quita todo lo que no esté escrito, incluidos permisos que Google necesita.

Usa `_member` salvo que de verdad quieras que Terraform sea el único dueño de ese rol.
:::

### Laboratorio Google Cloud

```bash norun
gcloud auth login
gcloud config set project academia-datos-dev
mkdir -p ~/infra/rapido && cd ~/infra/rapido
code main.tf                        # todo lo de la parte 2
terraform init
terraform apply -auto-approve                 # Plan: 15 to add
gcloud storage ls
bq ls
bq show andina_silver.pedidos                 # partición DAY (field: fecha), cluster cliente_id
bq show --schema --format=prettyjson andina_silver.pedidos
gcloud pubsub subscriptions list
```

<!-- estandar:errores -->
:::errores
- **`BucketAlreadyExists`** (AWS) o **`409 conflict`** (GCP): los nombres de buckets son **globales** en todo el mundo. Usa un prefijo de empresa y, si hace falta, un sufijo aleatorio.
- **`AccessDenied` en un job de Glue** con la política "bien escrita": casi siempre `ListBucket` sobre `arn/*` en lugar de `arn`, o `GetObject` sobre `arn` en lugar de `arn/*`.
- **`google_project_iam_policy` en un proyecto existente**: borra todos los permisos que no estén en tu código, incluidos los tuyos. Recuperarlo requiere a un administrador de la organización.
- **Dataset y bucket en ubicaciones distintas**: BigQuery no puede cargar desde un bucket `EU` a un dataset `US`.
- **Cambiar el esquema de una tabla de BigQuery**: agregar una columna `NULLABLE` se actualiza en el lugar; quitar o cambiar el tipo de una columna fuerza **reemplazo** (se borra la tabla y sus datos). Lee el plan.
:::

<!-- estandar:trabajo -->
:::trabajo
- Las políticas IAM se revisan en el pull request con la misma atención que el código: un `"Resource": "*"` o un `"Action": "s3:*"` deberían bloquear la aprobación. Herramientas como **Checkov** o **tfsec** lo marcan solas.
- Las empresas multinube mantienen la **misma estructura** en las tres (capas, nombres, etiquetas, carpetas del repositorio), como en este proyecto: el costo de cambiar de nube es la sintaxis, no el diseño.
- `default_tags` (AWS) y `default_labels` (GCP) se usan para que ningún recurso quede sin centro de costo.
- En GCP, el proyecto suele ser también el límite de facturación y permisos: muchos equipos tienen un proyecto por entorno y por dominio, creados con Terraform desde una "fábrica de proyectos".
:::

<!-- estandar:entrevista -->
:::entrevista "¿Cómo aplicas el principio de permisos mínimos con Terraform?"
Cada proceso tiene su propia identidad (un rol de IAM, una cuenta de servicio o una identidad administrada) y le doy permisos solo sobre los recursos que usa, escribiendo los ARN o nombres a partir de los recursos de Terraform (por ejemplo, la lista de buckets del lago con una expresión for), nunca con comodines. Prefiero asignaciones a nivel de recurso (bucket, dataset) antes que de proyecto o cuenta, y en GCP uso `_member` para no pisar otros permisos. El pull request muestra exactamente qué permiso se agrega, y un chequeo automático (Checkov, tfsec) rechaza comodines.
:::

## Ejercicios

:::ejercicio quiz
En una política de S3, ¿sobre qué recurso se autoriza `s3:ListBucket`?

- [x] Sobre el bucket: `arn:aws:s3:::andina-dev-bronze`
- [ ] Sobre los objetos: `arn:aws:s3:::andina-dev-bronze/*`
- [ ] Sobre `*`
- [ ] Sobre el rol
:::

:::ejercicio quiz
¿Qué hace `bytes_scanned_cutoff_per_query` en un workgroup de Athena?

- [ ] Acelera las consultas
- [x] Cancela cualquier consulta que escanee más de esa cantidad de bytes, para controlar el costo
- [ ] Comprime los resultados
- [ ] Limita la cantidad de usuarios
:::

:::ejercicio quiz
Quieres darle a la cuenta de servicio `etl` acceso de escritura solo al dataset silver, sin tocar los permisos que ya tiene el dataset. ¿Qué recurso usas?

- [x] `google_bigquery_dataset_iam_member`
- [ ] `google_project_iam_policy`
- [ ] `google_bigquery_dataset_iam_policy`
- [ ] `google_project_iam_member` con `roles/bigquery.admin`
:::

:::ejercicio quiz
En `aws_iam_role`, ¿qué define `assume_role_policy`?

- [ ] Qué buckets puede leer el rol
- [x] Quién puede usar (asumir) el rol, por ejemplo el servicio Glue
- [ ] Cuánto tiempo dura la sesión
- [ ] Qué región usa el rol
:::

:::ejercicio cli
El proyecto de Ritmo en `~/infra/ritmo` ya está aplicado. Con la CLI de AWS, muestra los nombres de las bases del catálogo de Glue (`DatabaseList[].Name`) en formato texto.
```respuesta
aws glue get-databases --query 'DatabaseList\[\]\.Name' --output text
aws glue get-databases --query "DatabaseList\[\]\.Name" --output text
aws glue get-databases --output text --query 'DatabaseList\[\]\.Name'
```
```solucion
aws glue get-databases --query 'DatabaseList[].Name' --output text
```
```setup
aws configure
mkdir -p ~/infra/ritmo
printf 'provider "aws" {\n  region = "us-east-1"\n}\n\nresource "aws_glue_catalog_database" "capa" {\n  for_each = toset(["bronze", "silver", "gold"])\n  name     = "andina_dev_${each.key}"\n}\n' > ~/infra/ritmo/main.tf
cd ~/infra/ritmo
terraform init
terraform apply -auto-approve
```
:::

:::ejercicio cli
El proyecto de Rápido ya creó la tabla `andina_silver.pedidos`. Muestra su información con `bq` para comprobar la partición y el clustering.
```respuesta
bq show andina_silver.pedidos
bq show academia-datos-dev:andina_silver.pedidos
```
```setup
gcloud auth login
gcloud config set project academia-datos-dev
mkdir -p ~/infra/rapido
printf 'provider "google" {\n  project = "academia-datos-dev"\n}\n\nresource "google_bigquery_dataset" "silver" {\n  dataset_id = "andina_silver"\n  location   = "US"\n}\n\nresource "google_bigquery_table" "pedidos" {\n  dataset_id          = google_bigquery_dataset.silver.dataset_id\n  table_id            = "pedidos"\n  deletion_protection = false\n  time_partitioning {\n    type  = "DAY"\n    field = "fecha"\n  }\n  clustering = ["cliente_id"]\n  schema     = jsonencode([{ name = "pedido_id", type = "INT64" }, { name = "cliente_id", type = "INT64" }, { name = "fecha", type = "DATE" }])\n}\n' > ~/infra/rapido/main.tf
cd ~/infra/rapido
terraform init
terraform apply -auto-approve
```
:::

:::ejercicio abierto titulo="El permiso de los analistas en Athena"
Los analistas de Ritmo tienen que poder consultar **solo** las tablas de la base `andina_dev_gold` desde el workgroup `andina-dev-analistas`, y leer los resultados de sus consultas. Escribe la política IAM con `jsonencode` (acciones de Athena, Glue y S3, y los recursos exactos) y el recurso que la adjunta a un grupo `analistas`. Explica qué quedaría expuesto si usaras `"Resource": "*"`.
```solucion
resource "aws_iam_policy" "analistas" {
  name = "andina-dev-analistas-gold"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["athena:StartQueryExecution", "athena:GetQueryExecution", "athena:GetQueryResults", "athena:StopQueryExecution"]
        Resource = aws_athena_workgroup.analistas.arn
      },
      {
        Effect = "Allow"
        Action = ["glue:GetDatabase", "glue:GetTable", "glue:GetTables", "glue:GetPartitions"]
        Resource = [
          "arn:aws:glue:us-east-1:${data.aws_caller_identity.yo.account_id}:catalog",
          "arn:aws:glue:us-east-1:${data.aws_caller_identity.yo.account_id}:database/${aws_glue_catalog_database.capa["gold"].name}",
          "arn:aws:glue:us-east-1:${data.aws_caller_identity.yo.account_id}:table/${aws_glue_catalog_database.capa["gold"].name}/*"
        ]
      },
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject"]
        Resource = ["${aws_s3_bucket.capa["gold"].arn}/*"]
      },
      {
        Effect   = "Allow"
        Action   = ["s3:ListBucket"]
        Resource = [aws_s3_bucket.capa["gold"].arn, aws_s3_bucket.artefactos.arn]
      },
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:PutObject"]
        Resource = ["${aws_s3_bucket.artefactos.arn}/athena/*"]
      }
    ]
  })
}

resource "aws_iam_group_policy_attachment" "analistas" {
  group      = "analistas"
  policy_arn = aws_iam_policy.analistas.arn
}

Con "Resource": "*", los analistas podrían leer bronze y silver (datos crudos, quizás con datos personales sin enmascarar), consultar desde cualquier workgroup (incluido uno sin límite de bytes escaneados, sin control de costo) y leer los resultados de consultas de otros equipos en cualquier bucket.
```
:::
