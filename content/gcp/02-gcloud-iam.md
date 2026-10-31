---
titulo: gcloud, proyectos e IAM
nivel: Básico
duracion: 30
resumen: Instalar y configurar gcloud, autenticarse, elegir proyecto y región, habilitar APIs, formatos de salida y filtros, e IAM con roles y cuentas de servicio.
---

## Las tres herramientas de línea de comandos

El **Google Cloud CLI** trae tres comandos:

| Comando | Para qué |
|---|---|
| `gcloud` | Casi todo: proyectos, IAM, Cloud Storage (`gcloud storage`), Pub/Sub, Dataproc, Composer, Dataflow… |
| `bq` | BigQuery: datasets, tablas, cargas y consultas |
| `gsutil` | La herramienta **clásica** de Cloud Storage (hoy se recomienda `gcloud storage`, más rápida) |

La forma de los comandos de `gcloud` es: `gcloud <grupo> [<subgrupo>] <verbo> [ARGUMENTOS] [--flags]`

```text
gcloud  storage  buckets  create  gs://lake-tienda-dev  --location=us-central1
gcloud  pubsub   topics   publish ventas                --message='{"id": 1}'
gcloud  dataproc clusters list                          --region=us-central1
```

## Primeros pasos

```bash norun
gcloud init                                        # asistente: login + proyecto + región
gcloud auth login                                  # inicia sesión con tu cuenta (abre el navegador)
gcloud auth application-default login              # credenciales para TUS programas (Python, dbt, Terraform)
gcloud config set project academia-datos-dev       # proyecto por defecto
gcloud config set compute/region us-central1       # región por defecto
gcloud config list                                 # ver la configuración activa
gcloud projects list                               # proyectos a los que tienes acceso
gcloud services enable bigquery.googleapis.com storage.googleapis.com pubsub.googleapis.com
```

```bash
gcloud auth login
gcloud config set project academia-datos-dev
gcloud config list
gcloud projects list
```

:::nota Dos tipos de credenciales
`gcloud auth login` sirve para que **tú** uses `gcloud`. `gcloud auth application-default login` crea las *Application Default Credentials* (ADC), que usan **tus programas** (la librería `google-cloud-bigquery` de Python, dbt, Terraform). En un servidor o en Composer, ese papel lo cumple una **cuenta de servicio**.
:::

### Configuraciones con nombre

Si trabajas con dev y prod, crea una configuración para cada uno y cambia con un comando:

```bash norun
gcloud config configurations create prod
gcloud config set project academia-datos-prod
gcloud config configurations activate default
gcloud storage ls --project=academia-datos-prod  # o sobrescribe el proyecto en un solo comando
```

## Formatos de salida y filtros

`gcloud` tiene sus propias banderas (en lugar del `--query` de AWS y Azure):

```bash norun
gcloud projects list --format="value(projectId)"                 # solo valores, ideal para scripts
gcloud projects list --format=json                               # JSON completo
gcloud projects list --format="table(projectId, name)"           # tabla con columnas elegidas
gcloud storage buckets list --filter="location=US" --format="value(name)"
PROYECTO=$(gcloud config get-value project)
```

```recorrido
titulo: Qué proyecto usa cada comando, y cómo darle forma a la salida
estacion login: Iniciar sesión | icono=usuario
estacion proj: Proyecto por defecto | icono=etiqueta
estacion conf: gcloud config list | icono=engranaje
estacion cmd: Un comando | icono=terminal
estacion fmt: --format | icono=check
paso login: Dos inicios de sesión distintos
`gcloud auth login` es para que **tú** uses gcloud. `gcloud auth application-default login` deja credenciales para **tus programas** (Python, dbt, Terraform). Son cosas separadas.
>>> bash
gcloud auth login                       # para la CLI
gcloud auth application-default login   # para tus programas
paso proj: Elegir el proyecto
En Google Cloud todo recurso vive dentro de un **proyecto**. Fijarlo en la configuración evita escribir `--project` en cada comando.
>>> log
$ gcloud config set project academia-datos-dev
Updated property [core/project].
paso conf: Verificar antes de crear nada
`gcloud config list` muestra el proyecto y la región activos. Mirarlo antes de crear o borrar algo evita el error clásico: hacerlo en **producción** creyendo que estabas en desarrollo.
>>> log
$ gcloud config list
[core]
project = academia-datos-dev
[compute]
region = us-central1
paso cmd: El comando usa esa configuración
`bq ls`, `gcloud storage ls`, etc. trabajan sobre `academia-datos-dev` sin que lo digas. Para un comando puntual en otro proyecto: `--project=academia-datos-prod`.
>>> bash
gcloud storage buckets list
gcloud storage buckets list --project=academia-datos-prod
paso fmt: --format y --filter
`--filter` elige **qué** filas; `--format` elige **cómo** mostrarlas. `value(...)` deja solo los valores, ideal para scripts.
>>> log
$ gcloud storage buckets list --filter="location=US-CENTRAL1" --format="value(name)"
lake-tienda-dev
```

## IAM en Google Cloud

La pregunta es la misma que en todas las nubes: **¿quién** puede hacer **qué** sobre **qué recurso?**

| Concepto | Qué es | Ejemplo |
|---|---|---|
| **Principal** (miembro) | Quién | `user:ana@empresa.com`, `group:datos@empresa.com`, `serviceAccount:etl@proyecto.iam.gserviceaccount.com` |
| **Rol** | Un conjunto de permisos | `roles/bigquery.dataViewer`, `roles/storage.objectAdmin` |
| **Política** (*binding*) | "Este principal tiene este rol sobre este recurso" | ana → `bigquery.dataViewer` → dataset `tienda_gold` |

Los permisos se **heredan** hacia abajo: un rol dado en la organización aplica a todos los proyectos; uno dado en el proyecto aplica a todos sus datasets y buckets.

| Tipo de rol | Ejemplo | Comentario |
|---|---|---|
| Básicos | `roles/owner`, `roles/editor`, `roles/viewer` | Demasiado amplios: evítalos en producción |
| Predefinidos | `roles/bigquery.dataEditor`, `roles/bigquery.jobUser`, `roles/storage.objectViewer` | Los que usarás casi siempre |
| Personalizados | `roles/miEmpresa.lectorFacturas` | Cuando ninguno predefinido encaja |

:::experto Dos roles para consultar BigQuery
Para ejecutar una consulta hacen falta **dos** cosas: permiso para **leer los datos** (`roles/bigquery.dataViewer` sobre el dataset) y permiso para **crear trabajos** (`roles/bigquery.jobUser` sobre el proyecto que paga). Separarlos permite que el proyecto de analítica pague las consultas de datos que viven en otro proyecto. Es una pregunta clásica.
:::

### Cuentas de servicio

Una **cuenta de servicio** es una identidad para programas (el equivalente al *rol* de AWS o a la *identidad administrada* de Azure). Composer, Dataflow o un contenedor de Cloud Run corren "como" una cuenta de servicio.

```bash norun
gcloud iam service-accounts create etl-datos --display-name="ETL del lago"
gcloud projects add-iam-policy-binding academia-datos-dev \
  --member="serviceAccount:etl-datos@academia-datos-dev.iam.gserviceaccount.com" \
  --role="roles/bigquery.dataEditor"
```

:::cuidado No descargues llaves JSON
Las llaves de cuentas de servicio (`.json`) son el equivalente a las *access keys* de AWS: si se filtran, cualquiera actúa como tu ETL. Prefiere la identidad asociada al servicio (Composer, Cloud Run), la **suplantación** (`--impersonate-service-account`) o *Workload Identity Federation* desde GitHub Actions.
:::

## Ejercicios

:::ejercicio cli
Configura `academia-datos-dev` como proyecto por defecto.
```respuesta
gcloud config set (core/)?project academia-datos-dev
```
```solucion
gcloud config set project academia-datos-dev
```
:::

:::ejercicio cli
Configura `southamerica-east1` como región por defecto.
```respuesta
gcloud config set compute/region southamerica-east1
```
:::

:::ejercicio cli
Habilita en el proyecto actual las APIs de BigQuery (`bigquery.googleapis.com`) y de Pub/Sub (`pubsub.googleapis.com`), en un solo comando.
```respuesta
todos: gcloud services enable || bigquery\.googleapis\.com || pubsub\.googleapis\.com
```
```solucion
gcloud services enable bigquery.googleapis.com pubsub.googleapis.com
```
:::

:::ejercicio cli
Guarda en la variable `PROYECTO` el proyecto configurado actualmente.
```respuesta
PROYECTO=\$\(gcloud config get(-value)? project\)
```
```solucion
PROYECTO=$(gcloud config get-value project)
```
:::

:::ejercicio cli
Crea la cuenta de servicio `etl-datos`.
```respuesta
gcloud iam service-accounts create etl-datos( --display-name=?['"][^'"]*['"])?
```
```solucion
gcloud iam service-accounts create etl-datos --display-name="ETL del lago"
```
:::

:::ejercicio cli
Dale a la cuenta de servicio `etl-datos@academia-datos-dev.iam.gserviceaccount.com` el rol `roles/bigquery.dataEditor` sobre el proyecto `academia-datos-dev`.
```respuesta
todos: gcloud projects add-iam-policy-binding academia-datos-dev || --member=?['"]?serviceAccount:etl-datos@academia-datos-dev\.iam\.gserviceaccount\.com['"]? || --role=?['"]?roles/bigquery\.dataEditor['"]?
```
```solucion
gcloud projects add-iam-policy-binding academia-datos-dev --member="serviceAccount:etl-datos@academia-datos-dev.iam.gserviceaccount.com" --role="roles/bigquery.dataEditor"
```
:::

:::ejercicio quiz
Ana tiene `roles/bigquery.dataViewer` sobre el dataset `tienda_gold`, pero al consultar recibe "User does not have bigquery.jobs.create permission". ¿Qué le falta?

- [ ] `roles/owner` en la organización
- [x] `roles/bigquery.jobUser` en el proyecto donde se ejecuta (y factura) la consulta
- [ ] Una llave JSON
- [ ] Habilitar Cloud Storage
:::

:::ejercicio quiz
Tu script de Python en tu laptop usa la librería `google-cloud-bigquery` y falla con "Could not automatically determine credentials". ¿Qué ejecutas?

- [ ] `gcloud auth login`
- [x] `gcloud auth application-default login`
- [ ] `gcloud config set project`
- [ ] `bq ls`
:::
