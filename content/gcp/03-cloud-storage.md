---
titulo: Cloud Storage, el lago de datos
nivel: Intermedio
duracion: 45
resumen: Buckets y objetos, ubicaciones, gcloud storage (create, cp, ls, rm, rsync), clases de almacenamiento, ciclo de vida, permisos uniformes y la organización del lago.
---

En Google Cloud, el data lake vive en **Cloud Storage** (GCS). Es donde aterrizan los archivos que mandan los sistemas de origen, donde se guarda la capa bronze y de donde BigQuery, Dataproc y Dataflow leen. En esta lección vas a entender cómo se organiza, cuánto cuesta, cómo se protege y cómo se maneja desde la terminal.

## Buckets y objetos

GCS guarda **objetos** (archivos) dentro de **buckets** (contenedores). Funciona igual que S3 en AWS o que los contenedores de ADLS en Azure.

```text
gs://lake-tienda-dev/bronze/ventas/fecha=2024-12-01/ventas.csv
     └── bucket ───┘└──────────────── nombre del objeto ─────────┘
```

Tres ideas que hay que tener claras desde el principio:

1. **No hay carpetas de verdad.** El nombre del objeto es `bronze/ventas/fecha=2024-12-01/ventas.csv`, completo, con barras incluidas. La consola y `ls` muestran "carpetas" porque agrupan por lo que hay antes de cada `/` (los **prefijos**), pero no existe un objeto "carpeta". Por eso no hace falta crear `bronze/` antes de copiar un archivo ahí.
2. **Los objetos no se editan: se reemplazan.** No puedes agregar una línea a un CSV que ya está en GCS. Si lo cambias, subes el objeto entero otra vez. Por eso los pipelines escriben **archivos nuevos** (uno por día o por lote) en lugar de modificar uno.
3. **El nombre del bucket es global.** Tiene que ser único en **todo Google Cloud**, no solo en tu proyecto: si alguien ya creó `lake-dev`, tú no puedes. Por eso se usa un prefijo de la empresa: `tiendaandina-lake-dev`. Solo admite minúsculas, números, `-`, `_` y `.`, con entre 3 y 63 caracteres.

### Las decisiones al crear un bucket

| Decisión | Opciones | Consejo |
|---|---|---|
| **Ubicación** | Región (`us-central1`), doble región, multirregión (`US`, `EU`) | La **misma** ubicación que tus datasets de BigQuery: cargar entre ubicaciones distintas falla o cuesta |
| **Clase** | `STANDARD`, `NEARLINE` (≥30 días), `COLDLINE` (≥90), `ARCHIVE` (≥365) | Standard para el lago activo; ciclo de vida para lo viejo |
| **Acceso** | *Uniform bucket-level access* | Siempre uniforme (permisos por IAM, sin ACL por objeto) |
| **Acceso público** | *Public access prevention* | Activado en todo bucket de datos |

**La ubicación no se puede cambiar después.** Para mover un bucket de región tienes que crear otro y copiar todo. Piénsala bien:

- **Región** (`us-central1`, `southamerica-east1`): la más barata, y lo más común para un lake. Pon en la misma región tu BigQuery, tus clústeres de Dataproc y tus jobs de Dataflow.
- **Doble región o multirregión** (`US`, `EU`): los datos se copian en varias regiones. Sobreviven a que se caiga una región entera, pero cuestan más.

### Clases de almacenamiento: pagar menos por lo que casi no se lee

| Clase | Precio aprox. por GB al mes* | Mínimo de permanencia | Cobro por leer | Para qué |
|---|---|---|---|---|
| `STANDARD` | 0,020 USD | — | No | Datos que se leen seguido: landing, bronze reciente |
| `NEARLINE` | 0,010 USD | 30 días | Sí | Datos que se leen una vez al mes |
| `COLDLINE` | 0,004 USD | 90 días | Sí, más alto | Datos de hace meses, por si hay que reprocesar |
| `ARCHIVE` | 0,0012 USD | 365 días | Sí, el más alto | Retención legal: guardar años "por si acaso" |

\*Precios orientativos de una región de EE. UU. Varían según la región y cambian con el tiempo.

La trampa: las clases frías son baratas para **guardar**, pero **caras para leer**. Y si borras un objeto antes del mínimo, igual pagas los días que faltan. Nunca pongas en `COLDLINE` algo que un pipeline lee todos los días.

## Los comandos

Hoy la herramienta recomendada es **`gcloud storage`**. La clásica, `gsutil`, sigue funcionando y la vas a ver en mucha documentación y scripts viejos.

```bash norun
gcloud storage buckets create gs://lake-tienda-dev --location=us-central1 --uniform-bucket-level-access
gcloud storage buckets list --format="value(name)"
gcloud storage buckets describe gs://lake-tienda-dev   # configuración del bucket
gcloud storage ls                                      # buckets
gcloud storage ls gs://lake-tienda-dev/bronze/         # un prefijo
gcloud storage ls --recursive gs://lake-tienda-dev
gcloud storage ls -l gs://lake-tienda-dev/bronze/ventas/   # con tamaño y fecha
gcloud storage du -s --readable-sizes gs://lake-tienda-dev # cuánto ocupa
gcloud storage cp datos/clientes.csv gs://lake-tienda-dev/bronze/clientes/
gcloud storage cp --recursive datos gs://lake-tienda-dev/landing/
gcloud storage rsync --recursive datos gs://lake-tienda-dev/landing/datos   # sincronizar
gcloud storage mv gs://lake-tienda-dev/landing/a.csv gs://lake-tienda-dev/bronze/   # mover
gcloud storage cat gs://lake-tienda-dev/bronze/clientes/clientes.csv | head -3
gcloud storage rm --recursive gs://lake-tienda-dev/landing/
gsutil ls gs://lake-tienda-dev                         # la herramienta clásica sigue funcionando
```

Algunos detalles importantes:

- **`cp` con la barra final**: `gs://lake/bronze/clientes/` (con `/`) copia el archivo **dentro** de ese prefijo, con su nombre. Sin la barra, `gs://lake/bronze/clientes` sería el **nombre del objeto**: tu archivo se llamaría `clientes`, sin extensión.
- **`cp` vs. `rsync`**: `cp --recursive` copia **todo**, siempre. `rsync` compara origen y destino y copia **solo lo que cambió**. Si lo corres dos veces seguidas, la segunda no copia nada. Con `--delete-unmatched-destination-objects` además borra del destino lo que ya no está en el origen (¡cuidado!).
- **`mv`** es en realidad copiar y después borrar el original. En GCS no existe "renombrar" sin copiar.
- **Comodines**: `*` coincide con cualquier texto **dentro de un nivel** y `**` cruza niveles. `gs://lake/bronze/*/*.csv` lista los CSV que están a un nivel debajo de bronze, y `gs://lake/**.csv`, todos los CSV del bucket.

### Laboratorio: arma el lago en GCS

Abre la terminal (⌨ Terminal) y ejecuta paso a paso. En la carpeta `datos/` ya tienes dos archivos de Tienda Andina.

```bash
gcloud auth login
gcloud config set project academia-datos-dev
gcloud storage buckets create gs://lake-tienda-dev --location=us-central1 --uniform-bucket-level-access
gcloud storage cp datos/ventas_2024_12.csv gs://lake-tienda-dev/bronze/ventas/
gcloud storage cp datos/clientes.csv gs://lake-tienda-dev/bronze/clientes/
gcloud storage ls --recursive gs://lake-tienda-dev
gcloud storage cat gs://lake-tienda-dev/bronze/clientes/clientes.csv | head -3
```

Deberías ver los dos objetos y las primeras líneas de clientes:

```text
gs://lake-tienda-dev/bronze/clientes/clientes.csv
gs://lake-tienda-dev/bronze/ventas/ventas_2024_12.csv
cliente_id,nombre,apellido,email,ciudad,pais,segmento
1,Lucía,Aguilar,lucia.aguilar@correo.com,Madrid,España,Corporativo
```

Sigue explorando:

```bash norun
gcloud storage ls -l --recursive gs://lake-tienda-dev      # tamaños y total
gcloud storage du -s --readable-sizes gs://lake-tienda-dev # cuánto ocupa el bucket
gcloud storage ls gs://lake-tienda-dev/bronze/*/*.csv       # comodines
gcloud storage rsync datos gs://lake-tienda-dev/landing/datos   # ejecútalo dos veces y compara
```

## Ciclo de vida y versiones

Nadie se acuerda de borrar archivos viejos a mano. Las **reglas de ciclo de vida** lo hacen solas: GCS revisa los objetos todos los días y aplica la acción a los que cumplen la condición.

```json
{
  "rule": [
    { "action": { "type": "Delete" }, "condition": { "age": 7, "matchesPrefix": ["landing/"] } },
    { "action": { "type": "SetStorageClass", "storageClass": "COLDLINE" }, "condition": { "age": 180, "matchesPrefix": ["bronze/"] } }
  ]
}
```

Este archivo tiene dos reglas:

1. Todo lo que está en `landing/` y tiene **más de 7 días** se **borra**. Landing es una zona de paso: los archivos llegan, se procesan hacia bronze y ya no hacen falta.
2. Todo lo que está en `bronze/` y tiene **más de 180 días** pasa a **COLDLINE**: se conserva por si hay que reprocesar, pero cuesta un 80 % menos.

```bash norun
gcloud storage buckets update gs://lake-tienda-dev --lifecycle-file=ciclo.json
gcloud storage buckets update gs://lake-tienda-dev --versioning
gcloud storage buckets describe gs://lake-tienda-dev      # verifica que quedó aplicado
```

**Versionado** (`--versioning`): cuando sobrescribes o borras un objeto, GCS guarda la versión anterior en lugar de perderla. Te salva de un `rm` equivocado, pero **cada versión ocupa espacio y se cobra**. Combínalo con una regla de ciclo de vida que borre las versiones viejas (condición `numNewerVersions`).

## Permisos

Con *uniform bucket-level access*, los permisos se dan con **IAM**, a nivel de bucket (o de proyecto), igual que en el resto de Google Cloud. Los roles que más se usan:

| Rol | Puede | Para quién |
|---|---|---|
| `roles/storage.objectViewer` | Leer y listar objetos | Analistas, jobs que solo leen |
| `roles/storage.objectCreator` | Crear objetos, pero no leer ni borrar | El sistema que sube archivos a landing |
| `roles/storage.objectUser` | Leer, crear, sobrescribir y borrar objetos | Los pipelines de ETL |
| `roles/storage.admin` | Todo, incluida la configuración del bucket | El equipo de plataforma |

```bash norun
gcloud storage buckets add-iam-policy-binding gs://lake-tienda-dev \
  --member="serviceAccount:etl-tienda@academia-datos-dev.iam.gserviceaccount.com" \
  --role="roles/storage.objectUser"
```

:::cuidado Un bucket público es un incidente
Un bucket de datos con `allUsers` como lector expone tus datos a todo internet. Activa *public access prevention* (`--public-access-prevention` al crear o actualizar) en todos los buckets de datos: así ni siquiera un error de configuración puede volverlos públicos.
:::

## Cómo organizar el lago

Una convención típica, en **un bucket por entorno**, con un prefijo por capa:

```text
gs://tiendaandina-lake-prod/
├── landing/            ← lo que llega, tal cual, una vez al día (se borra a los 7 días)
│   └── erp/ventas/2024-12-01/ventas.csv
├── bronze/             ← copia fiel e histórica, particionada por fecha de carga
│   └── ventas/fecha=2024-12-01/part-000.parquet
├── silver/             ← limpio y tipado (si no vive en BigQuery)
└── tmp/                ← temporales de Dataproc o Dataflow (regla de ciclo de vida corta)
```

Usar `fecha=2024-12-01` en la ruta (particionado estilo Hive) permite que BigQuery, Spark y Dataproc lean **solo las fechas que necesitan**.

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
