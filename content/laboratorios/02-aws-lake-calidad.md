---
titulo: "Laboratorio AWS: data lake con S3, Glue, Athena y Data Quality"
nivel: Avanzado
duracion: 60
resumen: Construye la capa bronze de un data lake en S3, catalógala con un crawler de Glue, consulta con un workgroup de Athena que limita los bytes escaneados, mide la calidad con Glue Data Quality (DQDL) y crea un table bucket de S3 Tables para Iceberg. Es el recorrido práctico de los dominios 1 a 4 del DEA-C01.
objetivos: Subir datos a un prefijo bronze y catalogarlos con un crawler | Crear un workgroup de Athena con límite de bytes y ubicación de resultados obligatoria | Escribir reglas DQDL y leer el resultado de una evaluación | Crear un table bucket de S3 Tables | Limpiar todos los recursos del laboratorio
autoevaluacion: ¿Sabes qué crea un crawler en el Data Catalog? | ¿Sabes cómo evitar que una consulta de Athena escanee terabytes? | ¿Sabes escribir una regla DQDL de completitud y de unicidad? | ¿Sabes qué ventaja tiene S3 Tables frente a Iceberg en un bucket común?
---

:::escenario
La tienda online quiere que los analistas consulten los clientes desde Athena, pero el año pasado una consulta sin filtro escaneó 3 TB y costó USD 15. Además, marketing se queja de correos vacíos. Vas a montar bronze en S3, catalogar, poner un tope de costo por consulta y una compuerta de calidad.
:::

## Arquitectura

```diagrama
titulo: Laboratorio de data lake en AWS
nodo csv: clientes.csv | icono=documento | col=0 | fila=1
nodo s3: S3 bronze/ | icono=s3 | col=1 | fila=1 | sub=lake-tienda-lab | color=verde
nodo cr: Crawler de Glue | icono=glue | col=2 | fila=0 | sub=infiere el esquema | color=violeta
nodo cat: Data Catalog | icono=tabla | col=3 | fila=0 | sub=lake_bronze.clientes | color=violeta
nodo dq: Glue Data Quality | icono=check | col=3 | fila=2 | sub=reglas DQDL | color=rojo
nodo ath: Athena (workgroup) | icono=lupa | col=4 | fila=1 | sub=tope 1 GB por consulta | color=azul
flecha csv -> s3
flecha s3 -> cr
flecha cr -> cat
flecha cat -> ath
flecha cat -> dq
```

## Costo en una cuenta real

| Recurso | Costo del laboratorio |
|---|---|
| S3 (un CSV de 30 KB) | Centavos |
| Crawler de Glue | USD 0,44 por DPU-hora, mínimo 10 minutos: unos USD 0,07 |
| Athena | USD 5 por TB escaneado: una fracción de centavo |
| Glue Data Quality | Cobra DPU por evaluación: unos USD 0,10 |
| S3 Tables | Almacenamiento y mantenimiento por uso: centavos |

**Total esperado: menos de USD 0,50.** Nada queda cobrando por hora.

## Práctica guiada

:::ejercicio cli
Paso 1. Crea el bucket `lake-tienda-lab`.
```respuesta
aws s3 mb s3://lake-tienda-lab/?( --region [\w-]+)?
```
```solucion
aws s3 mb s3://lake-tienda-lab
```
:::

:::ejercicio cli
Paso 2. Sube `datos/clientes.csv` al prefijo `bronze/clientes/` del bucket, con el nombre `clientes.csv`.
```respuesta
aws s3 cp datos/clientes\.csv s3://lake-tienda-lab/bronze/clientes/(clientes\.csv)?
```
```solucion
aws s3 cp datos/clientes.csv s3://lake-tienda-lab/bronze/clientes/clientes.csv
```
```setup
aws s3 mb s3://lake-tienda-lab
```
:::

:::ejercicio cli
Paso 3. Crea la base de datos `lake_bronze` en el Data Catalog.
```respuesta
todos: aws glue create-database || --database-input || \S*lake_bronze\S*
```
```solucion
aws glue create-database --database-input Name=lake_bronze
```
:::

:::ejercicio cli
Paso 4. Crea el crawler `crawler-clientes` con el rol `GlueServiceRole-lab`, que escriba en `lake_bronze` y lea `s3://lake-tienda-lab/bronze/clientes/`.
```respuesta
todos: aws glue create-crawler || --name crawler-clientes || --role GlueServiceRole-lab || --database-name lake_bronze || \S*s3://lake-tienda-lab/bronze/clientes/\S*
```
```solucion
aws glue create-crawler --name crawler-clientes --role GlueServiceRole-lab --database-name lake_bronze --targets '{"S3Targets":[{"Path":"s3://lake-tienda-lab/bronze/clientes/"}]}'
```
```setup
aws s3 mb s3://lake-tienda-lab
aws s3 cp datos/clientes.csv s3://lake-tienda-lab/bronze/clientes/clientes.csv
aws glue create-database --database-input Name=lake_bronze
```
:::

:::ejercicio cli
Paso 5. Ejecuta el crawler.
```respuesta
aws glue start-crawler --name crawler-clientes
```
```setup
aws s3 mb s3://lake-tienda-lab
aws s3 cp datos/clientes.csv s3://lake-tienda-lab/bronze/clientes/clientes.csv
aws glue create-crawler --name crawler-clientes --role GlueServiceRole-lab --database-name lake_bronze --targets '{"S3Targets":[{"Path":"s3://lake-tienda-lab/bronze/clientes/"}]}'
```
:::

:::ejercicio cli
Paso 6. Comprueba qué tablas creó: lista **solo los nombres** de las tablas de `lake_bronze`.
```respuesta
todos: aws glue get-tables || --database-name lake_bronze || --query ['"]?TableList\[\]\.Name['"]?
```
```solucion
aws glue get-tables --database-name lake_bronze --query "TableList[].Name"
```
```setup
aws s3 mb s3://lake-tienda-lab
aws s3 cp datos/clientes.csv s3://lake-tienda-lab/bronze/clientes/clientes.csv
aws glue create-crawler --name crawler-clientes --role GlueServiceRole-lab --database-name lake_bronze --targets '{"S3Targets":[{"Path":"s3://lake-tienda-lab/bronze/clientes/"}]}'
aws glue start-crawler --name crawler-clientes
```
:::

:::ejercicio cli
Paso 7. Crea el workgroup de Athena `analistas-lab` que **obligue** a guardar resultados en `s3://lake-tienda-lab/athena/` y corte cualquier consulta que escanee más de 1 GB (`1073741824` bytes).
```respuesta
todos: aws athena create-work-group || --name analistas-lab || \S*OutputLocation=s3://lake-tienda-lab/athena/\S* || \S*EnforceWorkGroupConfiguration=true\S* || \S*BytesScannedCutoffPerQuery=1073741824\S*
```
```solucion
aws athena create-work-group --name analistas-lab --configuration 'ResultConfiguration={OutputLocation=s3://lake-tienda-lab/athena/},EnforceWorkGroupConfiguration=true,BytesScannedCutoffPerQuery=1073741824'
```
```explicacion
`EnforceWorkGroupConfiguration=true` impide que el usuario cambie la ubicación de resultados o el tope desde su cliente. El tope corta la consulta (y el cobro) al llegar al límite.
```
:::

:::ejercicio cli
Paso 8. Ejecuta en el workgroup `analistas-lab` la consulta que cuenta clientes por `segmento` en `lake_bronze.clientes`.
```respuesta
todos: aws athena start-query-execution || --work-group analistas-lab || --query-string || .*GROUP BY segmento\S*
```
```solucion
aws athena start-query-execution --work-group analistas-lab --query-string "SELECT segmento, COUNT(*) AS clientes FROM lake_bronze.clientes GROUP BY segmento"
```
```setup
aws s3 mb s3://lake-tienda-lab
aws s3 cp datos/clientes.csv s3://lake-tienda-lab/bronze/clientes/clientes.csv
aws glue create-crawler --name crawler-clientes --role GlueServiceRole-lab --database-name lake_bronze --targets '{"S3Targets":[{"Path":"s3://lake-tienda-lab/bronze/clientes/"}]}'
aws glue start-crawler --name crawler-clientes
aws athena create-work-group --name analistas-lab --configuration 'ResultConfiguration={OutputLocation=s3://lake-tienda-lab/athena/},EnforceWorkGroupConfiguration=true,BytesScannedCutoffPerQuery=1073741824'
```
:::

:::ejercicio cli
Paso 9. Crea el ruleset de calidad `dq-clientes` sobre `lake_bronze.clientes` con estas reglas DQDL: más de 100 filas, `cliente_id` completo y único, `email` completo.
```respuesta
todos: aws glue create-data-quality-ruleset || --name dq-clientes || \S*RowCount > 100\S* || \S*IsComplete "cliente_id"\S* || \S*IsUnique "cliente_id"\S* || \S*IsComplete "email"\S* || DatabaseName=lake_bronze,TableName=clientes
```
```solucion
aws glue create-data-quality-ruleset --name dq-clientes --ruleset 'Rules = [ RowCount > 100, IsComplete "cliente_id", IsUnique "cliente_id", IsComplete "email" ]' --target-table DatabaseName=lake_bronze,TableName=clientes
```
```setup
aws s3 mb s3://lake-tienda-lab
aws s3 cp datos/clientes.csv s3://lake-tienda-lab/bronze/clientes/clientes.csv
aws glue create-crawler --name crawler-clientes --role GlueServiceRole-lab --database-name lake_bronze --targets '{"S3Targets":[{"Path":"s3://lake-tienda-lab/bronze/clientes/"}]}'
aws glue start-crawler --name crawler-clientes
```
:::

:::ejercicio cli
Paso 10. Lanza la evaluación del ruleset `dq-clientes` sobre la tabla y guarda el identificador de la ejecución en la variable `RUN`.
```respuesta
todos: RUN=\$\(aws glue start-data-quality-ruleset-evaluation-run || --ruleset-names dq-clientes || \S*lake_bronze\S* || --query ['"]?RunId['"]? || --output text\)?
```
```solucion
RUN=$(aws glue start-data-quality-ruleset-evaluation-run --data-source '{"GlueTable":{"DatabaseName":"lake_bronze","TableName":"clientes"}}' --role GlueServiceRole-lab --ruleset-names dq-clientes --query RunId --output text)
```
```setup
aws s3 mb s3://lake-tienda-lab
aws s3 cp datos/clientes.csv s3://lake-tienda-lab/bronze/clientes/clientes.csv
aws glue create-crawler --name crawler-clientes --role GlueServiceRole-lab --database-name lake_bronze --targets '{"S3Targets":[{"Path":"s3://lake-tienda-lab/bronze/clientes/"}]}'
aws glue start-crawler --name crawler-clientes
aws glue create-data-quality-ruleset --name dq-clientes --ruleset 'Rules = [ RowCount > 100, IsComplete "cliente_id", IsUnique "cliente_id", IsComplete "email" ]' --target-table DatabaseName=lake_bronze,TableName=clientes
```
:::

:::ejercicio cli
Paso 11. Obtén el resultado: guarda en `RES` el primer `ResultIds` de la ejecución `$RUN` y muestra el `Score` y, de cada regla, su nombre y resultado (`RuleResults[].[Name,Result]`).
```respuesta
todos: RES=\$\(aws glue get-data-quality-ruleset-evaluation-run || --run-id \$RUN || aws glue get-data-quality-result --result-id \$RES || \S*Score\S* || \S*RuleResults\[\]\.\[Name,\s*Result\]\S*
```
```solucion
RES=$(aws glue get-data-quality-ruleset-evaluation-run --run-id $RUN --query "ResultIds[0]" --output text) && aws glue get-data-quality-result --result-id $RES --query "{score:Score,reglas:RuleResults[].[Name,Result]}"
```
```setup
aws s3 mb s3://lake-tienda-lab
aws s3 cp datos/clientes.csv s3://lake-tienda-lab/bronze/clientes/clientes.csv
aws glue create-crawler --name crawler-clientes --role GlueServiceRole-lab --database-name lake_bronze --targets '{"S3Targets":[{"Path":"s3://lake-tienda-lab/bronze/clientes/"}]}'
aws glue start-crawler --name crawler-clientes
aws glue create-data-quality-ruleset --name dq-clientes --ruleset 'Rules = [ RowCount > 100, IsComplete "cliente_id", IsUnique "cliente_id", IsComplete "email" ]' --target-table DatabaseName=lake_bronze,TableName=clientes
RUN=$(aws glue start-data-quality-ruleset-evaluation-run --data-source '{"GlueTable":{"DatabaseName":"lake_bronze","TableName":"clientes"}}' --role GlueServiceRole-lab --ruleset-names dq-clientes --query RunId --output text)
```
```explicacion
El `Score` es la fracción de reglas que pasaron. En un pipeline real, un job de Glue o una máquina de Step Functions lee este resultado y **no publica** en silver si una regla crítica falla (compuerta de calidad).
```
:::

:::ejercicio cli
Paso 12. Crea el table bucket `tablas-tienda-lab` de **S3 Tables**, donde vivirían las tablas Iceberg de silver.
```respuesta
aws s3tables create-table-bucket --name tablas-tienda-lab
```
```explicacion
S3 Tables administra Iceberg por ti: compacta archivos chicos, expira snapshots y quita archivos huérfanos automáticamente. Con Iceberg en un bucket común, ese mantenimiento lo programas tú.
```
:::

## En tu cuenta real

Los comandos son los mismos. Diferencias que la simulación no muestra:

- El **rol `GlueServiceRole-lab`** tiene que existir: política de confianza para `glue.amazonaws.com`, la política administrada `AWSGlueServiceRole` y lectura sobre el bucket.
- El crawler tarda 1 o 2 minutos. Espera a que `aws glue get-crawler --name crawler-clientes --query Crawler.State` vuelva a `READY`.
- La evaluación de calidad tarda unos minutos: consulta `get-data-quality-ruleset-evaluation-run` hasta que `Status` sea `SUCCEEDED`.
- Para ver los resultados de Athena: `aws athena get-query-results --query-execution-id <id>`.

```bash norun
aws iam create-role --role-name GlueServiceRole-lab \
  --assume-role-policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"glue.amazonaws.com"},"Action":"sts:AssumeRole"}]}'
aws iam attach-role-policy --role-name GlueServiceRole-lab \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSGlueServiceRole
aws iam put-role-policy --role-name GlueServiceRole-lab --policy-name leer-lake \
  --policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Action":["s3:GetObject","s3:ListBucket"],"Resource":["arn:aws:s3:::lake-tienda-lab","arn:aws:s3:::lake-tienda-lab/*"]}]}'
```

## Limpieza

```bash norun
aws s3 rb s3://lake-tienda-lab --force
aws glue delete-crawler --name crawler-clientes
aws glue delete-data-quality-ruleset --name dq-clientes
aws glue delete-database --name lake_bronze
aws athena delete-work-group --work-group analistas-lab --recursive-delete-option
aws s3tables delete-table-bucket --table-bucket-arn arn:aws:s3tables:us-east-1:<cuenta>:bucket/tablas-tienda-lab
aws iam delete-role-policy --role-name GlueServiceRole-lab --policy-name leer-lake
aws iam detach-role-policy --role-name GlueServiceRole-lab --policy-arn arn:aws:iam::aws:policy/service-role/AWSGlueServiceRole
aws iam delete-role --role-name GlueServiceRole-lab
```

:::ejercicio cli
Limpieza en la terminal del curso: borra el bucket `lake-tienda-lab` **con todo su contenido** en un solo comando.
```respuesta
aws s3 rb s3://lake-tienda-lab/? --force
```
```solucion
aws s3 rb s3://lake-tienda-lab --force
```
```setup
aws s3 mb s3://lake-tienda-lab
aws s3 cp datos/clientes.csv s3://lake-tienda-lab/bronze/clientes/clientes.csv
```
:::

:::errores
- **El crawler crea una tabla por archivo** en lugar de una por carpeta: la estructura de carpetas no es uniforme o hay archivos con distinto esquema mezclados.
- **Consultar sin filtrar la partición**: Athena cobra por bytes escaneados; una consulta sobre todo el lago puede costar más que el laboratorio entero. El workgroup con límite lo evita.
- **CSV en vez de Parquet** para lo que se consulta seguido: escanea todas las columnas y ocupa varias veces más.
- **Reglas de calidad que nadie mira**: un resultado de Data Quality sin alerta asociada es solo un número.
- **Dejar los resultados de Athena en un bucket sin ciclo de vida**: se acumulan para siempre.
:::

:::trabajo
- El patrón "S3 + catálogo de Glue + Athena" es la forma más barata de tener SQL sobre un lago en AWS; se usa mucho para exploración y para tablas que se consultan poco.
- Cada vez más equipos usan tablas Iceberg (con S3 Tables o Glue) en lugar de Parquet suelto, para tener transacciones, borrado de filas y evolución del esquema.
- Los workgroups de Athena separan equipos y costos: cada área tiene el suyo, con su límite y su bucket de resultados.
:::

:::entrevista "¿Cómo reducirías el costo de las consultas de Athena sobre un data lake?"
Convertiría los datos a un formato columnar como Parquet o a tablas Iceberg, particionaría por la columna que más se filtra, normalmente la fecha, y pediría a los usuarios filtrar por partición y elegir columnas en lugar de `SELECT *`. Pondría workgroups con límite de bytes escaneados por consulta, y compactaría archivos chicos. También revisaría las consultas más caras en el historial del workgroup.
:::

## Preguntas de examen

:::ejercicio quiz
Los analistas de un equipo lanzan consultas de Athena sin filtros sobre tablas de varios TB. ¿Cuál es la forma **más directa** de limitar el costo por consulta?

- [ ] Convertir las tablas a CSV comprimido
- [x] Un workgroup con `BytesScannedCutoffPerQuery` y la configuración forzada
- [ ] Una política de IAM que niegue `athena:StartQueryExecution`
- [ ] Mover los datos a S3 Glacier
```explicacion
El tope del workgroup cancela la consulta al superar el límite. Particionar y usar Parquet reducen lo escaneado, pero no ponen un tope.
```
:::

:::ejercicio quiz
En el resultado de Data Quality, `IsComplete "email"` aparece como `FAIL`. ¿Qué significa?

- [ ] Que la columna `email` no existe
- [x] Que hay filas con `email` nulo o vacío
- [ ] Que hay correos repetidos
- [ ] Que el formato de algún correo es inválido
```explicacion
`IsComplete` verifica que no haya nulos. Para repetidos se usa `IsUnique`; para el formato, `ColumnValues "email" matches "…"`.
```
:::

:::ejercicio quiz
Necesitas tablas Iceberg en S3 con compactación automática y sin programar jobs de mantenimiento. ¿Qué eliges?

- [ ] Un bucket S3 común con Iceberg y un job semanal de Glue
- [x] Amazon S3 Tables (table buckets)
- [ ] Tablas Hive en formato CSV
- [ ] Redshift Spectrum
:::
