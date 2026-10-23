---
titulo: Cloud Storage, el lago de datos
nivel: Intermedio
duracion: 30
resumen: Buckets y objetos, ubicaciones, gcloud storage (create, cp, ls, rm, rsync), clases de almacenamiento, ciclo de vida, permisos uniformes y la organización del lago.
---

## Buckets y objetos

**Cloud Storage (GCS)** funciona como S3: **buckets** con **objetos** identificados por una clave larga. Las "carpetas" son solo prefijos.

```text
gs://lake-tienda-dev/bronze/ventas/fecha=2024-12-01/ventas.csv
     └── bucket ───┘└──────────────── nombre del objeto ─────────┘
```

| Decisión | Opciones | Consejo |
|---|---|---|
| **Ubicación** | Región (`us-central1`), doble región, multirregión (`US`, `EU`) | La **misma** ubicación que tus datasets de BigQuery: cargar entre ubicaciones distintas falla o cuesta |
| **Clase** | `STANDARD`, `NEARLINE` (≥30 días), `COLDLINE` (≥90), `ARCHIVE` (≥365) | Standard para el lago activo; ciclo de vida para lo viejo |
| **Acceso** | *Uniform bucket-level access* | Siempre uniforme (permisos por IAM, sin ACL por objeto) |
| **Acceso público** | *Public access prevention* | Activado en todo bucket de datos |

## Los comandos

```bash norun
gcloud storage buckets create gs://lake-tienda-dev --location=us-central1 --uniform-bucket-level-access
gcloud storage buckets list --format="value(name)"
gcloud storage ls                                      # buckets
gcloud storage ls gs://lake-tienda-dev/bronze/         # un prefijo
gcloud storage ls --recursive gs://lake-tienda-dev
gcloud storage cp datos/clientes.csv gs://lake-tienda-dev/bronze/clientes/
gcloud storage cp --recursive datos gs://lake-tienda-dev/landing/
gcloud storage rsync --recursive datos gs://lake-tienda-dev/landing/datos   # sincronizar
gcloud storage cat gs://lake-tienda-dev/bronze/clientes/clientes.csv | head -3
gcloud storage rm --recursive gs://lake-tienda-dev/landing/
gsutil ls gs://lake-tienda-dev                         # la herramienta clásica sigue funcionando
```

### Laboratorio: arma el lago en GCS

```bash
gcloud config set project academia-datos-dev
gcloud storage buckets create gs://lake-tienda-dev --location=us-central1
gcloud storage cp datos/ventas_2024_12.csv gs://lake-tienda-dev/bronze/ventas/
gcloud storage cp datos/clientes.csv gs://lake-tienda-dev/bronze/clientes/
gcloud storage ls --recursive gs://lake-tienda-dev
gcloud storage cat gs://lake-tienda-dev/bronze/clientes/clientes.csv | head -3
```

## Ciclo de vida y versiones

```json
{
  "rule": [
    { "action": { "type": "Delete" }, "condition": { "age": 7, "matchesPrefix": ["landing/"] } },
    { "action": { "type": "SetStorageClass", "storageClass": "COLDLINE" }, "condition": { "age": 180, "matchesPrefix": ["bronze/"] } }
  ]
}
```

```bash norun
gcloud storage buckets update gs://lake-tienda-dev --lifecycle-file=ciclo.json
gcloud storage buckets update gs://lake-tienda-dev --versioning
```

:::tip GCS + BigQuery = lakehouse
En GCP muchas veces la capa silver/gold vive directamente en **BigQuery** (tablas nativas), y GCS guarda bronze y los archivos que llegan. Si quieres formatos abiertos, **BigLake** permite tablas Iceberg o Parquet en GCS consultadas desde BigQuery con permisos finos.
:::

## Ejercicios

:::ejercicio cli
Crea el bucket `lake-banco-dev` en la región `southamerica-east1`.
```respuesta
todos: gcloud storage buckets create gs://lake-banco-dev/? || (--location|-l)[= ]southamerica-east1
```
```solucion
gcloud storage buckets create gs://lake-banco-dev --location=southamerica-east1
```
:::

:::ejercicio cli
Sube `datos/clientes.csv` al prefijo `bronze/clientes/` del bucket `lake-banco-dev`.
```respuesta
(gcloud storage|gsutil) cp (\./)?datos/clientes\.csv gs://lake-banco-dev/bronze/clientes/(clientes\.csv)?
```
```solucion
gcloud storage cp datos/clientes.csv gs://lake-banco-dev/bronze/clientes/
```
```setup
gcloud storage buckets create gs://lake-banco-dev --location=southamerica-east1
```
:::

:::ejercicio cli
Lista **recursivamente** todos los objetos del bucket `lake-banco-dev`.
```respuesta
gcloud storage ls (--recursive|-r) gs://lake-banco-dev/?
gcloud storage ls gs://lake-banco-dev/? (--recursive|-r)
gsutil ls -r gs://lake-banco-dev/?
```
```solucion
gcloud storage ls --recursive gs://lake-banco-dev
```
```setup
gcloud storage buckets create gs://lake-banco-dev --location=southamerica-east1
gcloud storage cp datos/clientes.csv gs://lake-banco-dev/bronze/clientes/
gcloud storage cp datos/ventas_2024_12.csv gs://lake-banco-dev/bronze/ventas/
```
:::

:::ejercicio cli
Muestra las **primeras 3 líneas** de `gs://lake-banco-dev/bronze/clientes/clientes.csv` sin descargarlo (usa una tubería).
```respuesta
(gcloud storage|gsutil) cat gs://lake-banco-dev/bronze/clientes/clientes\.csv \| head (-n ?3|-3)
```
```solucion
gcloud storage cat gs://lake-banco-dev/bronze/clientes/clientes.csv | head -n 3
```
```setup
gcloud storage buckets create gs://lake-banco-dev --location=southamerica-east1
gcloud storage cp datos/clientes.csv gs://lake-banco-dev/bronze/clientes/
```
:::

:::ejercicio quiz
Tus datasets de BigQuery están en la multirregión `US`. ¿Dónde conviene crear el bucket de archivos a cargar?

- [ ] En `europe-west1`, que es más barato
- [x] En `US` (o una región dentro de EE. UU.): cargar desde una ubicación incompatible falla o genera costos de transferencia
- [ ] Da igual
- [ ] En varias regiones a la vez, por las dudas
:::

:::ejercicio quiz
Los archivos de `landing/` dejan de servir a la semana. ¿Qué configuras?

- [ ] Versionado
- [ ] Clase ARCHIVE
- [x] Una regla de ciclo de vida que borre `landing/` a los 7 días
- [ ] Un bucket público
:::
