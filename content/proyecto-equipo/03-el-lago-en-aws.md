---
titulo: El lago en AWS - cargar dos días, catalogar con Glue y consultar con Athena
nivel: Intermedio
duracion: 40
resumen: Ejecutas el script versionado para cargar dos días de pedidos a S3, creas el rol que va a usar el crawler, catalogas la carpeta con Glue y respondes con Athena. Filtrar por la partición hace que la consulta lea un solo día y cueste menos.
objetivos: Generar la exportación de pedidos y cargarla a S3 con el script del repositorio | Crear un rol de IAM de mínimo privilegio para Glue | Catalogar los datos con un crawler y leer el esquema que detecta | Consultar con Athena filtrando por la partición y comparar los datos escaneados
prerrequisitos: proyecto-equipo-el-codigo-en-azure-devops
autoevaluacion: ¿Sabes por qué conviene cargar con el script y no con un comando suelto? | ¿Sabes qué permisos lleva el rol del crawler? | ¿Sabes qué columna agrega el crawler por la carpeta fecha_carga? | ¿Sabes por qué filtrar por fecha_carga baja el costo?
---

:::escenario Lunes, 15:00
El pull request está completo y el pipeline en verde. Ahora el script tiene que hacer su trabajo de verdad: llevar los pedidos al lago.
:::

```diagrama
titulo: Del CSV a la respuesta
nodo csv: pedidos.csv | icono=csv | col=0 | fila=0 | sub=la exportación del sistema
nodo sh: cargar_pedidos.sh | icono=terminal | col=1 | fila=0 | color=naranja | sub=el script del repositorio
nodo s3: S3 raw | icono=bucket | col=2 | fila=0 | color=verde | sub=fecha_carga=2026-11-20 y 2026-11-21
nodo rol: Rol de IAM | icono=escudo | col=2 | fila=1 | color=rojo | sub=leer el bucket y escribir el catálogo
nodo cr: Crawler | icono=lupa | col=1 | fila=1 | color=violeta | sub=crea lago_raw.pedidos
nodo ath: Athena | icono=codigo | col=0 | fila=1 | color=violeta | sub=WHERE fecha_carga = …
flecha csv -> sh: argumento | paso=1 | explica=generar-datos simula la exportación del sistema de pedidos. El script recibe la fecha y el archivo como argumentos.
flecha sh -> s3: aws s3 cp | paso=2 | explica=Cada ejecución sube el archivo a una carpeta nueva fecha_carga=AAAA-MM-DD. Dos ejecuciones con fechas distintas dejan dos particiones.
flecha rol -> cr: lo asume | paso=3 | explica=El crawler no usa tus permisos: asume un rol con AWSGlueServiceRole y lectura del bucket, nada más.
flecha s3 -> cr: lee | paso=4 | explica=El crawler recorre raw/pedidos/, lee el encabezado del CSV y reconoce fecha_carga como partición.
flecha cr -> ath: tabla | paso=5 | explica=Athena consulta lago_raw.pedidos. Con WHERE fecha_carga = '2026-11-21' solo abre esa carpeta: escanea la mitad y cuesta la mitad.
```

## 1. Cargar dos días

En la [terminal](#/lab/terminal), genera la exportación de pedidos, crea el bucket (una sola vez) y carga dos días con el script:

```bash
generar-datos ecommerce --filas 200 --semilla 7
head -3 ~/datos/generados/ecommerce/pedidos.csv
aws s3 mb s3://tienda-andina-lago-equipo
cd ~/lago-pedidos
bash cargar_pedidos.sh 2026-11-20
bash cargar_pedidos.sh 2026-11-21
aws s3 ls s3://tienda-andina-lago-equipo/raw/pedidos/
```

La última línea muestra las dos carpetas: `fecha_carga=2026-11-20/` y `fecha_carga=2026-11-21/`. Si el nombre del bucket ya existe, elige otro y úsalo así: `BUCKET=mi-bucket bash cargar_pedidos.sh 2026-11-20`.

:::nota Por qué con el script
Podrías subir el archivo con un `aws s3 cp` suelto, pero el script es el que está **versionado y probado**. Si mañana hay que cambiar la ruta, se cambia en un solo lugar con un pull request, y todos cargan igual.
:::

## 2. El rol del crawler

[Consola de AWS](#/aws) → **IAM → Roles → Create role**:

1. *Trusted entity*: **AWS service → Glue**.
2. Permisos: **AWSGlueServiceRole** y **AmazonS3ReadOnlyAccess**. Nada de `AdministratorAccess`.
3. Nombre: `GlueCrawlerRole-lago-pedidos`.

## 3. Catalogar con Glue

1. **Glue → Databases → Add database**: `lago_raw`.
2. **Glue → Crawlers → Create crawler**: nombre `cr-pedidos-raw`, *S3 path* `s3://tienda-andina-lago-equipo/raw/pedidos/`, el rol del paso anterior, database `lago_raw`.
3. Selecciónalo y presiona **Run**. En **Tables**, abre `pedidos`: verás las columnas del CSV (todas `string`) y la clave de partición **fecha_carga**.

## 4. Consultar con Athena

1. **Athena → Settings**: ubicación de resultados `s3://tienda-andina-lago-equipo/athena-resultados/`.
2. En el **Editor**, con la database `lago_raw`, primero sin filtro:

```sql norun
SELECT fecha_carga, COUNT(*) AS pedidos
FROM "lago_raw"."pedidos"
GROUP BY fecha_carga;
```

3. Y la respuesta para finanzas, solo de la última carga:

```sql norun
SELECT canal, COUNT(*) AS pedidos
FROM "lago_raw"."pedidos"
WHERE fecha_carga = '2026-11-21'
GROUP BY canal
ORDER BY pedidos DESC;
```

Compara **Data scanned** entre las dos consultas: la segunda lee una sola partición. Anota el resultado y la consulta: van a la story en la próxima lección.

:::cuidado Cargar dos veces el mismo día
Si ejecutas `bash cargar_pedidos.sh 2026-11-21` otra vez, el archivo se **reemplaza** (misma clave): no se duplica. Esa es la ventaja de que cada carga tenga su carpeta. Si en cambio subieras con nombres distintos dentro de la misma carpeta, Athena contaría los pedidos dos veces.
:::

:::real En tu computadora y en la web real
- **Terminal**: con la **AWS CLI** instalada (`brew install awscli` o el instalador de Windows) y `aws configure sso` para entrar con tu usuario de la empresa. Los mismos comandos `aws s3 mb`, `aws s3 cp` y `aws s3 ls`.
- **Consola** (`console.aws.amazon.com`): IAM, Glue y Athena están exactamente en los menús que usaste.
- **Costo**: S3 y Glue cuestan centavos con estos volúmenes. Athena cobra 5 USD por TB escaneado, así que estas consultas cuestan fracciones de centavo.
- **Al terminar**: borra el bucket (`aws s3 rb s3://… --force`) y el crawler.
:::

:::capturas Capturas para tu portafolio
Guárdalas en `docs/capturas/` del repositorio y úsalas en el README.

- `03-s3.png`: el bucket con las dos carpetas `fecha_carga=…`.
- `03-glue.png`: la tabla `pedidos` en Glue, con la partición `fecha_carga`.
- `03-athena.png`: la consulta por canal con *Data scanned* visible.

Antes de publicar, tapa el número de cuenta de AWS (arriba a la derecha) y los nombres reales de buckets de tu empresa.
:::

:::errores
- **Apuntar el crawler a la raíz del bucket**: mezcla resultados de Athena con los datos. Siempre a la carpeta de la tabla.
- **Olvidar la ubicación de resultados de Athena**: el error *No output location provided* no es un problema del SQL.
- **Filtrar por `fecha_pedido` esperando que baje el costo**: no es la columna de partición; Athena lee todo igual.
- **Rol con permisos de más** para que el crawler "no falle".
:::

## Ejercicios

:::ejercicio quiz
Ejecutas el script con dos fechas distintas. ¿Qué queda en S3?
- [ ] Un archivo con los dos días juntos
- [x] Dos carpetas fecha_carga=… con un pedidos.csv cada una
- [ ] Nada, hasta que corra el crawler
- [ ] Una tabla de Athena
:::

:::ejercicio quiz
¿Qué columna agrega el crawler además de las del CSV?
- [ ] pedido_id
- [ ] canal
- [x] fecha_carga, tomada del nombre de la carpeta (partición)
- [ ] _id
:::

:::ejercicio quiz
¿Cuál consulta escanea menos datos?
- [ ] La que tiene LIMIT 10
- [x] La que filtra WHERE fecha_carga = '2026-11-21'
- [ ] La que ordena por canal
- [ ] Todas escanean lo mismo
:::

## Resumen

- El script versionado carga cada día en su carpeta **fecha_carga=…**.
- El **crawler** asume un **rol** de mínimo privilegio y crea la tabla con su partición.
- **Athena** responde con SQL. Filtrar por la partición lee menos y cuesta menos.
