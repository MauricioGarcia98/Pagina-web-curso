---
titulo: S3, construir un data lake
nivel: Intermedio
duracion: 40
resumen: Buckets, objetos y prefijos; capas bronze, silver y gold; particiones estilo Hive; aws s3 mb, cp, sync, ls y rm; clases de almacenamiento, versionado, ciclo de vida y seguridad.
---

## Qué es S3

**Amazon S3** (*Simple Storage Service*) guarda **objetos** (archivos) dentro de **buckets** (contenedores). Es prácticamente infinito, muy durable (11 nueves: 99,999999999 %) y barato. En AWS, **el data lake es S3**.

```text
s3://lake-tienda-dev/bronze/ventas/anio=2024/mes=12/ventas_2024_12.csv
     └──── bucket ───┘└──────────────────── key (clave) ─────────────────┘
```

:::analogia No hay carpetas, hay etiquetas largas
S3 no tiene carpetas de verdad: cada objeto tiene una **clave** larga como `bronze/ventas/anio=2024/mes=12/archivo.csv`. La consola y la CLI muestran las barras como si fueran carpetas (los llaman **prefijos**), pero en el fondo es un enorme diccionario `clave → archivo`. Por eso "renombrar una carpeta" en S3 significa copiar y borrar cada objeto.
:::

### Reglas de los nombres de bucket

- Únicos **en todo el mundo** (no solo en tu cuenta): `datos` ya está tomado; usa `lake-tienda-dev-123456789012`.
- De 3 a 63 caracteres, minúsculas, números, puntos y guiones. Sin mayúsculas ni guion bajo.

## Organizar el lago: capas y particiones

```text
s3://lake-tienda-dev/
├── landing/            ← llega tal cual de la fuente (temporal)
├── bronze/             ← copia cruda e inmutable, con fecha de carga
│   └── ventas/anio=2024/mes=12/ventas_2024_12.csv
├── silver/             ← limpio, tipado, deduplicado, en Parquet/Delta/Iceberg
│   └── ventas/anio=2024/mes=12/part-0000.parquet
└── gold/               ← tablas de negocio listas para BI
    └── ventas_por_canal/
```

Las carpetas `anio=2024/mes=12` siguen el estilo **Hive**: `columna=valor`. Athena, Glue, Spark y Redshift Spectrum entienden ese formato y lo usan para **saltarse** las particiones que no necesitas (*partition pruning*).

:::tip ¿Por qué columnas y no solo "2024/12"?
Con `anio=2024/mes=12` el motor sabe que la carpeta corresponde a la columna `anio` con valor `2024`. Una consulta con `WHERE anio = 2024 AND mes = 12` lee **una sola carpeta** en lugar de todo el histórico.
:::

:::cuidado El problema de los archivos chiquitos
Millones de archivos de 10 KB hacen todo lento y caro: S3 cobra por petición y los motores tardan en listar. Apunta a archivos de **128 MB a 1 GB** en silver y gold, y compacta periódicamente.
:::

## Los comandos de `aws s3`

```bash norun
aws s3 mb s3://lake-tienda-dev                       # make bucket: crear
aws s3 ls                                            # listar buckets
aws s3 ls s3://lake-tienda-dev/bronze/               # listar un prefijo
aws s3 ls s3://lake-tienda-dev --recursive --summarize
aws s3 cp datos/clientes.csv s3://lake-tienda-dev/bronze/clientes/         # subir un archivo
aws s3 cp s3://lake-tienda-dev/bronze/clientes/clientes.csv ./copia.csv    # bajar
aws s3 cp datos/ s3://lake-tienda-dev/landing/ --recursive                 # subir una carpeta
aws s3 sync datos/ s3://lake-tienda-dev/landing/     # sincronizar: sube solo lo nuevo o cambiado
aws s3 mv s3://lake-tienda-dev/landing/a.csv s3://lake-tienda-dev/bronze/a.csv
aws s3 rm s3://lake-tienda-dev/landing/ --recursive  # borrar un prefijo
aws s3 rb s3://lake-tienda-dev                       # remove bucket (debe estar vacío, o --force)
aws s3 presign s3://lake-tienda-dev/gold/reporte.csv --expires-in 3600  # link temporal para compartir
```

### Laboratorio: tu primer lago

Abre la terminal con el botón **⌨ En la terminal** (es la misma máquina que el laboratorio: los archivos de `datos/` ya están ahí). Si antes no configuraste credenciales, empieza por `aws configure`.

```bash
aws configure
aws s3 mb s3://lake-tienda-dev
aws s3 cp datos/ventas_2024_12.csv s3://lake-tienda-dev/bronze/ventas/anio=2024/mes=12/
aws s3 cp datos/clientes.csv s3://lake-tienda-dev/bronze/clientes/
aws s3 ls s3://lake-tienda-dev/bronze/
aws s3 ls s3://lake-tienda-dev --recursive --summarize
```

```recorrido
titulo: De un archivo en tu computadora al lago particionado
estacion local: Archivo local | icono=archivo
estacion mb: Bucket | icono=base
estacion cp: aws s3 cp | icono=transformar
estacion pre: Prefijos | icono=capas
estacion ls: Verificar | icono=check
paso local: Dos archivos de pedidos
Cada día el sistema de la tienda deja un CSV. Queremos guardarlos en la capa **bronze** del lago, uno por fecha.
>>> csv
pedido_id,cliente_id,total
2,11,120
3,12,45
paso mb: Crear el bucket
Un bucket es el "disco" del lago. Su nombre es **único en todo AWS** (no solo en tu cuenta).
>>> log
$ aws s3 mb s3://lake-tienda-dev
make_bucket: lake-tienda-dev
paso cp: Subir a una ruta con la fecha
S3 no tiene carpetas: la "ruta" es parte del nombre del objeto (la **clave**). Poner `fecha=AAAA-MM-DD/` en la clave es la convención Hive que entienden Glue, Athena y Spark.
>>> log
$ aws s3 cp pedidos_2024-12-31.csv s3://lake-tienda-dev/bronze/pedidos/fecha=2024-12-31/
upload: pedidos_2024-12-31.csv to s3://lake-tienda-dev/bronze/pedidos/fecha=2024-12-31/pedidos_2024-12-31.csv
paso pre: ls muestra los prefijos como carpetas
`PRE` significa *prefix*: la consola y la CLI agrupan las claves que comparten un prefijo para que **parezcan** carpetas.
>>> log
$ aws s3 ls s3://lake-tienda-dev/bronze/pedidos/
                           PRE fecha=2024-12-30/
                           PRE fecha=2024-12-31/
paso ls: --recursive: las claves completas
Así se ve lo que S3 guarda de verdad: una lista plana de objetos, con fecha, tamaño en bytes y clave. Una consulta que filtre por `fecha` solo lee las particiones necesarias.
>>> log
$ aws s3 ls s3://lake-tienda-dev/ --recursive
2026-10-30 21:01:49    37 bronze/pedidos/fecha=2024-12-30/pedidos_2024-12-30.csv
2026-10-30 21:01:49    44 bronze/pedidos/fecha=2024-12-31/pedidos_2024-12-31.csv
```

## La API de bajo nivel: `aws s3api`

`aws s3` son atajos amigables. `aws s3api` expone cada operación de la API, con salida JSON y `--query`:

```bash norun
aws s3api list-buckets --query "Buckets[].Name" --output text
aws s3api list-objects-v2 --bucket lake-tienda-dev --prefix bronze/ --query "Contents[].Key"
aws s3api put-bucket-versioning --bucket lake-tienda-dev --versioning-configuration Status=Enabled
aws s3api put-public-access-block --bucket lake-tienda-dev \
  --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
```

## Costo, durabilidad y seguridad

| Tema | Qué hacer |
|---|---|
| **Clases de almacenamiento** | `STANDARD` para lo que se usa seguido; `STANDARD_IA` para lo que se lee poco; `GLACIER` / `DEEP_ARCHIVE` para archivo histórico (barato de guardar, lento y caro de leer). `INTELLIGENT_TIERING` mueve solo |
| **Ciclo de vida** (*lifecycle*) | Reglas automáticas: "`landing/` se borra a los 7 días", "`bronze/` pasa a Glacier a los 180 días" |
| **Versionado** | Guarda versiones anteriores: te salva de un borrado o una sobrescritura accidental |
| **Cifrado** | Activado por defecto (SSE-S3). Con datos sensibles, SSE-KMS con tu propia llave |
| **Acceso público** | **Bloqueado** siempre en un data lake (*Block Public Access*) |
| **Permisos** | Políticas de IAM por rol y prefijo; políticas de bucket; Lake Formation para tablas |

```json
{
  "Rules": [
    { "ID": "limpiar-landing", "Filter": { "Prefix": "landing/" }, "Status": "Enabled",
      "Expiration": { "Days": 7 } },
    { "ID": "bronze-a-glacier", "Filter": { "Prefix": "bronze/" }, "Status": "Enabled",
      "Transitions": [ { "Days": 180, "StorageClass": "GLACIER" } ] }
  ]
}
```

:::experto Formatos de tabla abiertos: Iceberg, Delta y Hudi
Parquet guarda datos, pero no sabe de transacciones. **Apache Iceberg** (muy usado en AWS: Athena, Glue y EMR lo soportan nativamente, y existen las **S3 Tables**), **Delta Lake** y **Hudi** agregan una capa de metadatos encima: `MERGE`, `UPDATE`, `DELETE`, *time travel* y evolución de esquema sobre S3. Es la base del *lakehouse*.
:::

## Ejercicios

:::ejercicio cli
Crea el bucket `lake-banco-dev`.
```respuesta
aws s3 mb s3://lake-banco-dev/?( --region [\w-]+)?
```
```solucion
aws s3 mb s3://lake-banco-dev
```
:::

:::ejercicio cli
Sube el archivo `datos/clientes.csv` al prefijo `bronze/clientes/` del bucket `lake-banco-dev` (ya existe).
```respuesta
aws s3 cp (\./)?datos/clientes\.csv s3://lake-banco-dev/bronze/clientes/(clientes\.csv)?
```
```solucion
aws s3 cp datos/clientes.csv s3://lake-banco-dev/bronze/clientes/
```
```setup
aws s3 mb s3://lake-banco-dev
```
:::

:::ejercicio cli
Sube el archivo de ventas `datos/ventas_2024_12.csv` respetando las **particiones estilo Hive**: año 2024 y mes 12, dentro de `s3://lake-banco-dev/bronze/ventas/`.
```respuesta
aws s3 cp (\./)?datos/ventas_2024_12\.csv s3://lake-banco-dev/bronze/ventas/anio=2024/mes=12/(ventas_2024_12\.csv)?
```
```solucion
aws s3 cp datos/ventas_2024_12.csv s3://lake-banco-dev/bronze/ventas/anio=2024/mes=12/
```
```pista
Las particiones Hive son carpetas `columna=valor`: `anio=2024/mes=12/`.
```
```setup
aws s3 mb s3://lake-banco-dev
```
:::

:::ejercicio cli
Sincroniza **toda** la carpeta local `datos/` con el prefijo `landing/` del bucket `lake-banco-dev` (solo sube lo nuevo o cambiado).
```respuesta
aws s3 sync (\./)?datos/? s3://lake-banco-dev/landing/?
```
```solucion
aws s3 sync datos/ s3://lake-banco-dev/landing/
```
```setup
aws s3 mb s3://lake-banco-dev
```
:::

:::ejercicio cli
Lista **todos** los objetos del bucket `lake-banco-dev` (recorriendo todos los prefijos) y muestra al final el total de objetos y el tamaño.
```respuesta
todos: aws s3 ls s3://lake-banco-dev/? || --recursive || --summarize
```
```solucion
aws s3 ls s3://lake-banco-dev --recursive --summarize
```
```setup
aws s3 mb s3://lake-banco-dev
aws s3 cp datos/clientes.csv s3://lake-banco-dev/bronze/clientes/
aws s3 cp datos/ventas_2024_12.csv s3://lake-banco-dev/bronze/ventas/anio=2024/mes=12/
```
:::

:::ejercicio cli
Borra todo lo que hay bajo el prefijo `landing/` del bucket `lake-banco-dev`.
```respuesta
todos: aws s3 rm s3://lake-banco-dev/landing/? || --recursive
```
```solucion
aws s3 rm s3://lake-banco-dev/landing/ --recursive
```
```setup
aws s3 mb s3://lake-banco-dev
aws s3 sync datos/ s3://lake-banco-dev/landing/
```
:::

:::ejercicio cli
Activa el **versionado** del bucket `lake-banco-dev` con `s3api`.
```respuesta
todos: aws s3api put-bucket-versioning || --bucket lake-banco-dev || --versioning-configuration ['"]?Status=Enabled['"]?
```
```solucion
aws s3api put-bucket-versioning --bucket lake-banco-dev --versioning-configuration Status=Enabled
```
```setup
aws s3 mb s3://lake-banco-dev
```
:::

:::ejercicio quiz
¿Cuál de estos nombres de bucket es **válido**?

- [ ] `Lake_Tienda_Prod`
- [ ] `lt`
- [x] `lake-tienda-prod-123456789012`
- [ ] `lake tienda prod`
:::

:::ejercicio quiz
Tienes 3 años de ventas en `s3://lake/silver/ventas/fecha=YYYY-MM-DD/`. Un analista consulta siempre "las ventas de ayer". ¿Por qué esta estructura es buena?

- [ ] Porque S3 ordena los archivos por fecha
- [x] Porque el motor lee solo la carpeta `fecha=` de ayer (*partition pruning*) en lugar de los 3 años
- [ ] Porque S3 cobra menos por carpeta
- [ ] No es buena: conviene un único archivo gigante
:::

:::ejercicio quiz
Los archivos de `landing/` solo sirven hasta que se copian a bronze. ¿Cómo evitas pagar por ellos para siempre?

- [ ] Borrándolos a mano cada mes
- [x] Con una regla de **ciclo de vida** que los expire a los pocos días
- [ ] Activando el versionado
- [ ] Moviéndolos a otra región
:::
