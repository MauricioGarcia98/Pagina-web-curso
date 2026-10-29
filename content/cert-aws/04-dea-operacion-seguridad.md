---
titulo: DEA-C01 - Operación, monitoreo, seguridad y gobierno
nivel: Avanzado
duracion: 75
resumen: Los dominios 3 (22 %) y 4 (18 %) del DEA-C01 - automatizar y analizar con Athena, QuickSight y notebooks; monitorear pipelines con CloudWatch, CloudTrail y alertas; calidad de datos con Glue Data Quality y DataBrew; autenticación y autorización con IAM, Lake Formation y Secrets Manager; cifrado con KMS; redes privadas; auditoría; privacidad con Macie y gobierno con SageMaker Unified Studio y Catalog.
objetivos: Optimizar costo y rendimiento de Athena con workgroups, formatos y particiones | Monitorear y alertar sobre pipelines con CloudWatch, EventBridge y SNS | Definir reglas de calidad con Glue Data Quality | Aplicar permisos mínimos con IAM y Lake Formation (fila, columna, etiquetas) | Cifrar datos en reposo y en tránsito con KMS | Detectar datos sensibles con Macie y auditar con CloudTrail
prerrequisitos: cert-aws-dea-almacenamiento | aws-orquestacion-gobierno | aws-cli-iam
autoevaluacion: ¿Sabes cómo limitar cuánto escanea un equipo en Athena? | ¿Sabes qué servicio registra quién llamó a una API? | ¿Sabes cómo dar acceso a columnas específicas de una tabla del lago? | ¿Sabes cómo una cuenta lee un bucket cifrado con KMS de otra cuenta? | ¿Sabes qué detecta Macie?
---

:::escenario
Los pipelines de Tomás ya funcionan, pero un viernes un job falló sin que nadie se enterara y el lunes los paneles mostraban datos viejos. Además, auditoría pidió que los analistas de marketing no vean el DNI ni el teléfono de los clientes, y que todo esté cifrado con claves que la empresa controle. Esta lección cubre los dominios 3 y 4: juntos, el 40 % del examen.
:::

## Dominio 3: operación y soporte

### Analizar datos

- **Amazon Athena**: SQL serverless sobre S3, se paga por **TB escaneado** (o capacidad aprovisionada). Bajar costo = escanear menos: Parquet, particiones, compresión, `SELECT` de columnas concretas, partition projection.
- **Workgroups**: separan equipos, fijan la ubicación de resultados, imponen cifrado y **límites de datos escaneados** por consulta o por período, con alertas.
- **Athena para Apache Spark** y **federated query** (conectores Lambda a DynamoDB, RDS, CloudWatch Logs).
- **Resultados reutilizados** (*query result reuse*) evitan reescanear consultas repetidas.
- **Amazon QuickSight**: BI serverless con **SPICE** (motor en memoria) y Q en QuickSight para preguntas en lenguaje natural.
- **SageMaker Unified Studio**: un entorno único con notebooks, editor SQL, Glue, EMR, Redshift y Bedrock sobre el mismo catálogo.

### Monitorear y alertar

```diagrama
titulo: Detectar un job que falla y avisar
nodo job: Job de Glue | icono=glue | col=0 | fila=0 | color=violeta
nodo eb: EventBridge | icono=eventbridge | col=1 | fila=0 | sub=regla: estado FAILED | color=rosa
nodo sns: Amazon SNS | icono=sns | col=2 | fila=0 | sub=correo, Slack, PagerDuty | color=rosa
nodo cw: CloudWatch | icono=cloudwatch | col=1 | fila=1 | sub=métricas, logs, alarmas | color=rosa
nodo ct: CloudTrail | icono=cloudtrail | col=0 | fila=1 | sub=quién llamó a qué API | color=rosa
flecha job -> eb: evento de cambio de estado
flecha eb -> sns
flecha job -> cw: logs y métricas
flecha cw -> sns: alarma | estilo=punteada
```

- **CloudWatch Logs y métricas**: los jobs de Glue, Lambda, Step Functions y EMR escriben allí. **Logs Insights** consulta logs con un lenguaje propio. **Alarmas** sobre métricas (por ejemplo, el `IteratorAge` de un consumidor de Kinesis que se atrasa).
- **EventBridge**: reglas sobre eventos de estado (`Glue Job State Change` = `FAILED`, `TIMEOUT`) → SNS, Lambda o reintento.
- **CloudTrail**: registro de **llamadas a la API** (quién, cuándo, desde dónde). **CloudTrail Lake** permite consultarlo con SQL. Los *data events* de S3 registran lecturas y escrituras de objetos (cuestan más, se habilitan aparte).
- **AWS Config**: historial de configuración de recursos y reglas de cumplimiento (por ejemplo, "todos los buckets cifrados").

### Calidad de datos

- **AWS Glue Data Quality**: reglas en **DQDL** evaluadas en el catálogo o dentro de un job; puede **recomendar reglas** a partir de los datos, detectar anomalías y frenar el pipeline si no se cumplen.
- **Glue DataBrew**: perfiles de datos y reglas de calidad visuales.
- Técnicas: muestreo, validación de esquema, chequeo de completitud, unicidad, rangos, consistencia entre fuentes, y **sesgo** en muestras.

```text norun
Rules = [
  RowCount > 1000,
  IsComplete "envio_id",
  IsUnique "envio_id",
  ColumnValues "estado" in ["CREADO", "EN_RUTA", "ENTREGADO", "DEVUELTO"],
  ColumnValues "monto" between 0 and 1000000,
  Completeness "cliente_id" > 0.99
]
```

## Dominio 4: seguridad y gobierno

### Autenticación

- **IAM**: usuarios, grupos, **roles** (credenciales temporales, la forma recomendada para servicios), políticas basadas en identidad y en recurso (políticas de bucket). Las aplicaciones en EC2, Lambda o Glue usan su **rol de ejecución**, nunca claves de acceso en el código.
- **IAM Identity Center**: inicio de sesión único de personas con el proveedor de identidad corporativo.
- **AWS Secrets Manager**: guarda credenciales de bases y las **rota** automáticamente; Glue y Redshift las leen por ARN. **Parameter Store** es para configuración (y secretos simples sin rotación).
- **Redes**: subredes privadas, **security groups**, **VPC endpoints** (gateway para S3 y DynamoDB, interface/PrivateLink para el resto) para que el tráfico no salga a internet. Los jobs de Glue que acceden a una base en una VPC usan una **conexión** con subred y security group.

### Autorización

- **Permisos mínimos** (*least privilege*), condiciones (`aws:SourceVpce`, `aws:PrincipalTag`), **ABAC** con etiquetas.
- **AWS Lake Formation**: permisos centralizados sobre el catálogo con `GRANT` a nivel de **base, tabla, columna, fila y celda** (*data filters*), y **LF-Tags** (control por etiquetas: `confidencialidad=alta`) que escalan a miles de tablas. Athena, Redshift Spectrum, EMR y Glue respetan esos permisos. Comparte datos **entre cuentas** sin copiar.
- **Redshift**: roles y `GRANT`, **seguridad de filas** (RLS), **enmascaramiento dinámico** y permisos por columna.

```sql norun
-- Redshift: enmascarar el documento para quien no sea del rol "cumplimiento"
CREATE MASKING POLICY ocultar_dni
WITH (dni VARCHAR(20))
USING ('***' || RIGHT(dni, 3));

ATTACH MASKING POLICY ocultar_dni ON clientes(dni) TO PUBLIC;
ATTACH MASKING POLICY ocultar_dni ON clientes(dni) TO ROLE cumplimiento PRIORITY 10 USING (dni);
```

### Cifrado

- **En reposo**: S3 cifra por defecto con **SSE-S3**. Con **SSE-KMS** la empresa controla la clave, su política, la rotación y la auditoría de uso en CloudTrail. **S3 Bucket Keys** reducen las llamadas (y el costo) a KMS. **DSSE-KMS** aplica doble capa.
- **Entre cuentas**: para leer objetos cifrados con una clave KMS de otra cuenta, hace falta permiso en **la política de la clave KMS** además de la política del bucket y el permiso IAM.
- Redshift, Glue (catálogo, jobs, bookmarks), Kinesis, DynamoDB y EBS se cifran con KMS.
- **En tránsito**: TLS; políticas de bucket con `aws:SecureTransport` para rechazar HTTP.
- **Enmascaramiento y anonimización** en transformaciones: hashing con sal, tokenización, truncado.

### Auditoría, privacidad y gobierno

- **Amazon Macie**: descubre y clasifica **datos sensibles** (PII, credenciales, datos financieros) en S3 con aprendizaje automático y patrones; genera hallazgos.
- **Glue sensitive data detection**: detecta PII dentro de un job y permite enmascararla.
- **Residencia de datos**: elegir regiones y usar **SCP** de AWS Organizations para impedir recursos fuera de ellas.
- **AWS Config** y **Security Hub**: cumplimiento continuo.
- **Amazon SageMaker Catalog** (sobre DataZone) en **SageMaker Unified Studio**: catálogo de negocio, glosario, linaje, publicación y **suscripción con aprobación** a activos de datos; los permisos se aplican con Lake Formation por debajo.
- **Compartir**: Redshift data sharing, Lake Formation entre cuentas, **AWS Data Exchange** para datos de terceros.

:::examen Cómo leer las preguntas de seguridad
- "Sin credenciales en el código" → **rol IAM** o **Secrets Manager**.
- "Rotar automáticamente la contraseña de la base" → **Secrets Manager**.
- "Que el tráfico a S3 no pase por internet" → **VPC gateway endpoint**.
- "Permisos por columna en el lago para varios motores" → **Lake Formation**.
- "Encontrar PII en buckets" → **Macie**.
- "Quién borró la tabla" → **CloudTrail**.
:::

## Ejercicios

:::ejercicio quiz
Un job de Glue nocturno falla a veces y nadie se entera hasta el lunes. ¿Qué configuras con el menor esfuerzo operativo?
- [ ] Un script en EC2 que revisa el estado del job cada cinco minutos.
- [x] Una regla de EventBridge para el estado FAILED del job que publique en un tema de SNS.
- [ ] Un crawler que verifique si llegaron datos nuevos.
- [ ] Un panel de QuickSight con el historial de ejecuciones.
```explicacion
Glue emite eventos de cambio de estado. Una regla de EventBridge los envía a SNS sin código ni servidores.
```
:::

:::ejercicio quiz
Los analistas de marketing consultan la tabla `clientes` del lago desde Athena y no deben ver las columnas `dni` y `telefono`. ¿Qué usas?
- [ ] Una copia de la tabla sin esas columnas, actualizada cada noche.
- [x] Permisos de columna en Lake Formation para el rol de marketing.
- [ ] Una política de bucket que bloquee los archivos con esas columnas.
- [ ] Cifrar esas columnas con SSE-S3.
```explicacion
Lake Formation concede permisos por columna sobre el catálogo y Athena los respeta, sin duplicar datos.
```
:::

:::ejercicio quiz
Seguridad pregunta quién eliminó una tabla del Glue Data Catalog el martes. ¿Dónde se busca?
- [ ] En CloudWatch Logs del último job de Glue.
- [x] En los eventos de AWS CloudTrail.
- [ ] En los hallazgos de Amazon Macie.
- [ ] En las métricas de Athena del workgroup.
```explicacion
CloudTrail registra las llamadas a la API, como `DeleteTable`, con la identidad, la hora y el origen.
```
:::

:::ejercicio quiz
Un equipo gasta demasiado en Athena porque algunas consultas escanean terabytes por error. ¿Qué control aplicas a nivel de equipo?
- [ ] Pasar todas las tablas a CSV comprimido.
- [x] Un workgroup con límite de datos escaneados por consulta.
- [ ] Mover los datos a S3 Glacier.
- [ ] Desactivar los resultados de consultas.
```explicacion
Los workgroups imponen límites de datos escaneados y alertas. Combinado con Parquet y particiones, baja el costo.
```
:::

:::ejercicio quiz
Un rol de la cuenta B debe leer objetos de un bucket de la cuenta A cifrados con una clave KMS administrada por el cliente en la cuenta A. Ya tiene permiso en la política del bucket. ¿Qué falta?
- [ ] Nada: la política del bucket alcanza.
- [x] Permitir al rol usar la clave en la política de la clave KMS (y `kms:Decrypt` en su política IAM).
- [ ] Cambiar el cifrado del bucket a SSE-S3 solo para esa cuenta.
- [ ] Crear un usuario IAM en la cuenta A con claves de acceso para la cuenta B.
```explicacion
Con SSE-KMS hay que poder descifrar: la política de la clave en la cuenta A debe permitirlo y el rol necesita `kms:Decrypt`.
```
:::

:::ejercicio abierto
Escribe tres reglas DQDL para la tabla `envios` (envio_id, estado, monto, entregado_en) y explica qué haces con el pipeline si fallan.
```text solucion
Rules = [
  IsUnique "envio_id",
  ColumnValues "estado" in ["CREADO", "EN_RUTA", "ENTREGADO", "DEVUELTO"],
  ColumnValues "monto" > 0
]
Las reglas se evalúan en el job de Glue antes de escribir en silver. Si fallan: se escriben las filas inválidas en una tabla de cuarentena, el job termina con error (o se marca el resultado), EventBridge detecta el resultado de Data Quality y SNS avisa al equipo. Los datos válidos solo se publican si el porcentaje de error está por debajo del umbral acordado.
```
:::
