---
titulo: La consola de AWS por dentro - S3, Glue, Athena e IAM para un lago de datos
nivel: Intermedio
duracion: 45
resumen: Recorrido por la consola de AWS con lo que usa un equipo de datos. Primero, un bucket de S3 con los archivos del lago, particionados por mes. Después, un crawler de Glue que los cataloga y Athena consultándolos con SQL, pagando por cada byte escaneado. Por último, IAM, que da a cada servicio solo los permisos que necesita. Todo se hace en la réplica, que comparte el estado con el comando aws de la terminal.
objetivos: Recorrer la consola de AWS - servicios, región, migas y asistentes | Crear un bucket seguro y subir datos particionados | Catalogar una carpeta con un crawler de Glue y leer el esquema que detecta | Consultar con Athena y bajar el costo filtrando por partición | Crear un rol de IAM con el mínimo privilegio
prerrequisitos: sql-select
autoevaluacion: ¿Sabes por qué un bucket de un lago de datos nunca es público? | ¿Sabes qué hace un crawler y por qué deja las columnas como string? | ¿Sabes por qué Athena pide una ubicación de resultados? | ¿Sabes cuánto cobra Athena y cómo bajar ese costo? | ¿Sabes por qué un crawler no lleva AdministratorAccess?
---

:::tip Practícalo mientras lees
Abre la [consola de AWS de práctica](#/aws). Corre en tu navegador, sin cuenta de AWS ni tarjeta. Comparte el estado con el comando `aws` de la [terminal](#/lab/terminal): un bucket creado en la consola aparece con `aws s3 ls`, y uno creado con `aws s3 mb` aparece en la consola. Al final de la lección está lo que la réplica tiene y lo que no.
:::

:::analogia En palabras simples
Piensa en un depósito enorme. **S3** son los estantes donde dejas las cajas (los archivos). **Glue** es el inventario: alguien recorre los estantes y anota qué hay en cada caja y cómo está organizado. **Athena** es el empleado al que le haces una pregunta ("¿cuántos pedidos hubo en enero?") y la responde leyendo las cajas, y te cobra por cada caja que tuvo que abrir. **IAM** decide quién tiene llave de qué puerta.
:::

## La consola en un minuto

| Parte | Para qué |
|---|---|
| **Services** y el buscador (*Alt+S*) | Ir a cualquier servicio (S3, Glue, Athena, IAM…) |
| **Región** (arriba a la derecha) | Dónde viven los recursos. S3 es global en la lista, pero cada bucket vive en una región |
| **CloudShell** | Una terminal con la CLI `aws` ya configurada (en la práctica, la terminal del curso) |
| **Migas** (*breadcrumbs*) | Dónde estás: *Amazon S3 › Buckets › tu-bucket* |
| **Botón naranja** | La acción principal de cada página: *Create bucket*, *Run*, *Create role* |

## El recorrido de un lago de datos en AWS

```diagrama
titulo: De un archivo en S3 a una respuesta en SQL
nodo arch: Archivos CSV | icono=archivos | col=0 | fila=0 | sub=pedidos por mes
nodo s3: S3 | icono=bucket | col=1 | fila=0 | color=verde | sub=el lago: un bucket, una carpeta por tabla
nodo cr: Crawler de Glue | icono=lupa | col=2 | fila=0 | color=violeta | sub=lee las carpetas y deduce el esquema
nodo cat: Data Catalog | icono=tabla | col=2 | fila=1 | color=violeta | sub=databases y tablas
nodo ath: Athena | icono=codigo | col=1 | fila=1 | color=violeta | sub=SQL sobre los archivos
nodo res: Resultado | icono=grafico | col=0 | fila=1 | sub=y un CSV en S3
flecha arch -> s3: Upload | paso=1 | explica=Subes los archivos al bucket, una carpeta por tabla. Las carpetas columna=valor (anio_mes=2024-01) son particiones.
flecha s3 -> cr: lee | paso=2 | explica=El crawler recorre la carpeta, lee la primera línea de cada archivo y detecta columnas y particiones.
flecha cr -> cat: crea la tabla | paso=3 | explica=El crawler escribe la tabla en una database del Data Catalog. Los datos no se mueven: la tabla apunta a la carpeta de S3.
flecha cat -> ath: esquema | paso=4 | explica=Athena usa el catálogo para saber qué columnas tiene la tabla y dónde están sus archivos.
flecha ath -> res: responde | paso=5 | explica=Athena lee los archivos, calcula la respuesta y guarda el resultado como CSV en la ubicación de resultados.
```

La idea central: **los datos se quedan en S3**. El catálogo solo describe dónde están y qué forma tienen. Athena los lee cada vez que preguntas. Por eso no hay que "cargar" nada en una base de datos.

## S3: el bucket del lago

1. **S3 → Create bucket**. El nombre es único en **todo AWS**: usa un prefijo propio (`tienda-andina-lago-dev`).
2. Deja **Block all public access** encendido. Un lago de datos nunca es público: así viene por defecto desde 2023.
3. **Versioning**: actívalo si quieres poder recuperar un archivo pisado o borrado.
4. Entra al bucket → **Upload** → *datos de ejemplo: pedidos*. Quedan en `pedidos/anio_mes=2022-01/pedidos.csv`, `pedidos/anio_mes=2022-02/…`.

```captura
archivo: aws/a01-bucket.webp
texto: El bucket con la carpeta pedidos/ y las acciones (Upload es la principal)
```

:::cuidado Las carpetas no existen
En S3 no hay carpetas de verdad: `pedidos/anio_mes=2022-01/pedidos.csv` es **un solo objeto** cuya clave tiene barras. La consola las muestra como carpetas para que sea cómodo. Por eso "mover una carpeta" en S3 es copiar y borrar cada objeto.
:::

## Glue: el catálogo y el crawler

1. **Glue → Databases → Add database**: `lago_bronze`.
2. **Glue → Crawlers → Create crawler**: nombre, *S3 path* de la carpeta de **una** tabla (`s3://tienda-andina-lago-dev/pedidos/`), el rol de IAM y la database de destino.
3. Selecciónalo y presiona **Run**. Al terminar, **Tables** muestra `pedidos` con sus columnas y la clave de partición `anio_mes`.

```captura
archivo: aws/a02-tabla.webp
texto: La tabla que creó el crawler: ubicación en S3, columnas y la partición anio_mes
```

Fíjate en el esquema: sobre CSV, el crawler deja **todas las columnas como `string`**. En Athena conviene castear (`CAST(total AS double)`) o, mejor, convertir los datos a Parquet en la capa silver, donde los tipos viajan con el archivo.

## Athena: SQL que se paga por byte

1. **Athena → Settings**: elige la *query result location* (`s3://tu-bucket/athena-resultados/`). Sin eso, Athena responde *No output location provided*. Es el primer error de todo el mundo.
2. En **Editor**, elige la database y escribe:

```sql norun
SELECT anio_mes, COUNT(*) AS pedidos
FROM "lago_bronze"."pedidos"
GROUP BY anio_mes
ORDER BY anio_mes;
```

3. Debajo del resultado: **Run time** y **Data scanned**. Athena cobra **5 USD por TB escaneado**.
4. Filtra por la partición (`WHERE anio_mes = '2022-01'`) y vuelve a mirar *Data scanned*: lee una sola carpeta.

```captura
archivo: aws/a03-athena.webp
texto: Athena: el editor, la database elegida, el resultado y los datos escaneados
```

| Para pagar menos en Athena | Por qué |
|---|---|
| Filtrar por la columna de partición | Athena no abre las carpetas que no necesita |
| Nombrar solo las columnas que usas | Con Parquet (columnar), las demás columnas no se leen |
| Guardar en Parquet comprimido | Lee menos bytes que el mismo dato en CSV |
| `LIMIT` | **No** baja el costo si igual tiene que leer los archivos |

## IAM: cada servicio con lo justo

Un crawler necesita leer el bucket y escribir en el catálogo, y nada más. **IAM → Roles → Create role**:

1. *Trusted entity*: **AWS service → Glue** (el rol lo puede asumir Glue, no una persona).
2. Permisos: **AWSGlueServiceRole** y **AmazonS3ReadOnlyAccess**. **No** `AdministratorAccess`: si algo falla o se filtra una credencial, el daño queda acotado.
3. Nombre: `GlueCrawlerRole-pedidos`.

Las personas entran con su usuario (o con SSO desde IAM Identity Center). Los servicios usan roles con credenciales temporales: nunca claves de un usuario pegadas en el código.

## Lo mismo desde la terminal

Todo lo anterior también se hace con la CLI. En la terminal del curso:

```bash
aws s3 mb s3://tienda-andina-lago-dev-2
aws s3 ls s3://tienda-andina-lago-dev/pedidos/ --recursive
aws glue get-tables --database-name lago_bronze --query "TableList[].Name"
aws athena start-query-execution --query-string "SELECT COUNT(*) FROM lago_bronze.pedidos" --result-configuration OutputLocation=s3://tienda-andina-lago-dev/athena-resultados/
```

Refresca la consola: el bucket nuevo aparece en S3. En una empresa, lo repetitivo se automatiza así (o con Terraform), y la consola queda para mirar y diagnosticar.

## Qué tiene la réplica y qué no

| En la réplica | Todavía no |
|---|---|
| S3: buckets, carpetas, subida de archivos, versionado, Block Public Access, vista previa | Clases de almacenamiento, ciclo de vida activo, replicación, notificaciones de eventos |
| Glue: databases, tablas con esquema y particiones, crawlers, ejecución de jobs | Editor visual de jobs (Glue Studio), Data Quality, conexiones JDBC |
| Athena: editor, ubicación de resultados, datos escaneados y costo, historial | Workgroups con límites, consultas federadas, CTAS e Iceberg |
| IAM: usuarios, roles con políticas y relación de confianza | Políticas personalizadas, IAM Identity Center, Access Analyzer |

El SQL de Athena corre de verdad sobre los CSV del bucket, pero en el motor del curso: las funciones de Trino propias de Athena (por ejemplo `date_parse`) pueden no estar.

:::practica aws El lago en cinco pasos
1. Crea un bucket y sube los datos de ejemplo de pedidos.
2. Crea la database `lago_bronze` y un rol para Glue con el mínimo privilegio.
3. Crea un crawler sobre la carpeta `pedidos/` y ejecútalo.
4. Configura la ubicación de resultados de Athena.
5. Cuenta los pedidos por mes y después filtra por un mes: compara *Data scanned*.

Documentación oficial: [crear un bucket](https://docs.aws.amazon.com/AmazonS3/latest/userguide/create-bucket-overview.html) · [crawlers de Glue](https://docs.aws.amazon.com/glue/latest/dg/add-crawler.html) · [primeros pasos con Athena](https://docs.aws.amazon.com/athena/latest/ug/getting-started.html)
:::

:::errores
- **Dejar el bucket público "para probar"**. Los datos de clientes terminan indexados. Block Public Access siempre encendido.
- **Apuntar el crawler a la raíz del bucket**. Crea una tabla por cada cosa que encuentra, mezclando todo. Una carpeta por tabla.
- **Olvidar la ubicación de resultados de Athena** y pensar que la consulta está mal.
- **Creer que `LIMIT 10` abarata la consulta**. Athena igual lee los archivos; lo que abarata es filtrar por partición y usar Parquet.
- **Dar `AdministratorAccess` a un rol de servicio** porque "así funciona".
:::

## Ejercicios

:::ejercicio quiz
Subes `pedidos/anio_mes=2024-01/pedidos.csv` a S3. ¿Cuántos objetos creaste?
- [ ] Tres: dos carpetas y un archivo
- [x] Uno: la clave completa, con las barras, es el nombre del objeto
- [ ] Dos: la carpeta y el archivo
- [ ] Ninguno hasta que corra un crawler
:::

:::ejercicio quiz
¿Qué hace un crawler de Glue?
- [ ] Copia los archivos de S3 a una base de datos
- [x] Lee una carpeta de S3, deduce columnas y particiones y crea la tabla en el Data Catalog
- [ ] Ejecuta las consultas de Athena
- [ ] Borra los archivos viejos del bucket
:::

:::ejercicio quiz
Athena responde "No output location provided". ¿Qué falta?
- [ ] Permisos de administrador
- [ ] Que el crawler termine
- [x] Configurar en Settings la ubicación de S3 donde Athena guarda los resultados
- [ ] Una cuenta de Redshift
:::

:::ejercicio quiz
Una consulta escanea 1 TB al día. ¿Cuál es la forma más efectiva de bajar el costo?
- [ ] Agregar LIMIT 100
- [x] Filtrar por la columna de partición y guardar los datos en Parquet
- [ ] Ejecutarla de noche
- [ ] Usar SELECT * para que Athena optimice
:::

:::ejercicio quiz
¿Qué permisos le das al rol de un crawler que lee un bucket?
- [ ] AdministratorAccess, para que no falle
- [x] AWSGlueServiceRole y lectura sobre el bucket
- [ ] AmazonS3FullAccess sobre todos los buckets
- [ ] Ninguno: los crawlers no usan roles
:::

## Resumen

- **S3** guarda los archivos del lago. Bucket privado, una carpeta por tabla y particiones `columna=valor`.
- **Glue** cataloga: un crawler lee la carpeta y crea la tabla, que apunta a S3 sin mover datos.
- **Athena** consulta con SQL, guarda los resultados en S3 y cobra por byte escaneado. Las particiones y Parquet bajan el costo.
- **IAM**: personas con usuario o SSO; servicios con roles de mínimo privilegio.
- La consola y la CLI comparten el estado: lo repetitivo se automatiza con la CLI o con Terraform.
