# area: Nube

## Nube
alias: cloud, cloud computing, computación en la nube
nino: En vez de **comprarte un auto**, lo **alquilas por horas** cuando lo necesitas: no lo mantienes, no lo guardas, y si un día necesitas un camión, alquilas un camión. La nube es alquilar computadoras, discos y servicios por internet y pagar solo lo que usas.
que: Infraestructura y servicios de cómputo ofrecidos bajo demanda por proveedores (AWS, Azure, Google Cloud), pagando por uso. Va de **IaaS** (máquinas virtuales), a **PaaS** (servicios gestionados: bases de datos, Spark) y **SaaS** (software listo). Para datos, aporta almacenamiento casi infinito y barato, cómputo elástico y servicios gestionados.
ejemplo: Guardas 10 TB en S3 (~US$230/mes) y prendes un clúster de 20 máquinas por 30 minutos para procesarlos, en lugar de comprar servidores.
para: Empezar sin inversión, escalar según la necesidad y delegar el mantenimiento.
cuidado: "Pagar por uso" también significa que lo que queda prendido o mal configurado se paga. Configura presupuestos y alertas desde el primer día.
ver: Región, Serverless, Presupuesto, IAM

## Región
alias: regiones, zona de disponibilidad, availability zone, AZ
nino: El proveedor tiene **edificios llenos de computadoras en distintas ciudades del mundo**. Una región es una de esas ciudades; dentro de cada una hay varios edificios separados (zonas) por si uno se queda sin luz.
que: Una ubicación geográfica con centros de datos del proveedor (`us-east-1`, `eastus2`, `southamerica-east1`). Cada región tiene varias **zonas de disponibilidad** independientes. Los datos se quedan en la región que elijas (importante para leyes de datos) y mover datos entre regiones cuesta.
ejemplo: Una empresa de Chile crea su lago en `sa-east-1` (São Paulo) por cercanía, o en `us-east-1` porque es más barato y tiene todos los servicios.
para: Elegir latencia, costo, cumplimiento legal y alta disponibilidad.
cuidado: Pon el almacenamiento y el cómputo en la misma región: leer datos de otra región es lento y se cobra la transferencia.
ver: Nube

## Serverless
alias: sin servidor, gestionado
nino: Es como **pedir comida a domicilio** en vez de cocinar: no tienes cocina, ni ollas, ni lavas platos; pides y pagas por plato.
que: Servicios en los que **no administras servidores**: el proveedor asigna los recursos automáticamente y cobras por uso real (consultas, ejecuciones, datos leídos). Ejemplos: Lambda, Athena, BigQuery, Glue, Cloud Functions, Databricks serverless.
ejemplo: Athena cobra ~US$5 por TB leído: una consulta que lee 2 GB cuesta 1 centavo y no hay nada prendido mientras no consultas.
para: Cargas variables o esporádicas sin pagar máquinas ociosas ni mantenerlas.
cuidado: Con cargas constantes y grandes, puede salir más caro que cómputo reservado; y una consulta mal escrita (que lee todo) también se paga.
ver: Nube, Lambda, Athena, BigQuery

## Object storage
alias: almacenamiento de objetos, bucket, contenedor, blob
nino: Es un **depósito gigante de cajas con etiqueta**: guardas cualquier cosa (fotos, CSV, Parquet) en una caja, le pones un nombre único y la recuperas por ese nombre. Nunca se llena.
que: Almacenamiento de archivos ("objetos") en **buckets** (S3, Cloud Storage) o **contenedores** (Azure Blob/ADLS), accesibles por API/HTTP. Barato, durable (11 nueves), prácticamente ilimitado. Las "carpetas" en realidad son prefijos del nombre. Es la base de todo data lake.
ejemplo: `s3://empresa-lago/bronze/pedidos/fecha=2024-12-01/parte-0001.parquet`.
para: Guardar el lago de datos, archivos de entrada, backups y artefactos.
cuidado: Los objetos no se editan: se reescriben enteros. Por eso existen formatos de tabla (Delta, Iceberg) para hacer UPDATE y MERGE encima.
ver: S3, Cloud Storage, ADLS Gen2, Data lake

## CLI
alias: command line interface, línea de comandos, aws cli, az, gcloud
nino: En vez de **apretar botones en una pantalla**, le escribes órdenes a la computadora: "crea una caja llamada X". Es más rápido y lo puedes repetir igualito.
que: Herramientas de línea de comandos para manejar servicios: `aws` (AWS), `az` (Azure), `gcloud`/`gsutil`/`bq` (GCP), `databricks`, `terraform`, `dbt`. Permiten automatizar en scripts y CI/CD lo que se hace en la consola web.
ejemplo: `aws s3 ls s3://empresa-lago/bronze/` · `az storage blob list ...` · `bq query --use_legacy_sql=false 'SELECT 1'`.
para: Automatizar, documentar pasos exactos y trabajar más rápido.
ver: Terminal, IaC

## IAM
alias: identity and access management, gestión de identidades y accesos
nino: Es el **guardia de la escuela con una lista**: sabe quién eres (identidad) y a qué salones puedes entrar (permisos). Sin estar en la lista, no entras a ningún lado.
que: El sistema que define **quién** (usuarios, grupos, roles, cuentas de servicio) puede hacer **qué acción** sobre **qué recurso**. En AWS: IAM con políticas JSON; en Azure: Entra ID + RBAC; en GCP: IAM con roles por proyecto o recurso. Todo empieza denegado.
ejemplo: El rol `etl-glue` puede `s3:GetObject` en `bronze/*` y `s3:PutObject` en `silver/*`, y nada más.
para: Seguridad: que cada persona y cada proceso tenga solo los accesos que necesita.
ver: Rol, Permisos mínimos, RBAC, Cuenta de servicio

## Rol
alias: roles, role, assume role
nino: Es un **disfraz con permisos**: cuando te pones el disfraz de "bombero", puedes usar la manguera; cuando te lo quitas, ya no. Cualquiera autorizado puede ponérselo un rato.
que: Una identidad con permisos que **se asume temporalmente** en lugar de tener contraseña fija. Los servicios (una Lambda, un clúster, un job de CI) asumen un rol y reciben credenciales temporales. En AWS se llama *IAM role*; en Azure, managed identity + roles RBAC; en GCP, cuentas de servicio con roles.
ejemplo: El job de Glue asume `rol-etl-ventas`; GitHub Actions asume `rol-deploy` con OIDC sin guardar claves.
para: Que nada use credenciales permanentes y se pueda auditar quién hizo qué.
ver: IAM, Credenciales temporales, Managed identity, OIDC

## Permisos mínimos
alias: least privilege, mínimo privilegio
nino: Si tu amigo te cuida el perro, **le das la llave de la casa, no la del auto ni la de la caja fuerte**. Solo lo que necesita para lo que tiene que hacer.
que: El principio de dar a cada identidad **solo los permisos indispensables**, sobre los recursos indispensables, por el tiempo indispensable. Se acota por acción (leer vs. escribir), recurso (un bucket o carpeta, no todos) y condiciones.
ejemplo: Mal: `"Action": "s3:*", "Resource": "*"`. Bien: `"Action": ["s3:GetObject"], "Resource": "arn:aws:s3:::lago/bronze/*"`.
para: Limitar el daño si una credencial se filtra o un proceso falla.
ver: IAM, Rol, RBAC

## SSO
alias: single sign-on, inicio de sesión único, IAM Identity Center
nino: Es tener **una sola llave mágica que abre todas las puertas** a las que tienes permiso, en vez de un llavero con 20 llaves.
que: Iniciar sesión **una vez** con la identidad de la empresa (Google, Entra ID, Okta) y acceder a todas las herramientas autorizadas sin claves separadas. En AWS, *IAM Identity Center* con `aws sso login` da credenciales temporales por perfil.
ejemplo: `aws configure sso` → `aws sso login --profile datos-dev` → abre el navegador, te logueas con la cuenta de la empresa y la CLI queda con credenciales por algunas horas.
para: Menos contraseñas, bajas de empleados en un solo lugar y credenciales que expiran.
ver: MFA, Credenciales temporales, Entra ID

## MFA
alias: multi-factor authentication, autenticación de dos factores, 2FA
nino: Para entrar a tu casa necesitas **la llave y además decir la palabra secreta**. Si un ladrón roba la llave, igual no sabe la palabra.
que: Autenticación con más de un factor: algo que sabes (contraseña) + algo que tienes (app de códigos, llave física) o algo que eres (huella). Imprescindible en la cuenta raíz de la nube y en todos los usuarios humanos.
ejemplo: Al iniciar sesión en la consola de AWS te pide el código de 6 dígitos de tu app autenticadora.
para: Evitar que una contraseña filtrada alcance para entrar.
ver: SSO, IAM

## Credenciales temporales
alias: tokens temporales, STS, short-lived credentials
nino: Es como la **pulsera de un parque de diversiones**: te deja entrar a los juegos solo hoy. Si la pierdes, mañana ya no sirve.
que: Credenciales que **expiran solas** (de 15 minutos a unas horas), emitidas al asumir un rol o al iniciar sesión con SSO u OIDC (AWS STS, tokens de Entra ID, tokens de GCP). Son lo opuesto a las claves de acceso permanentes.
ejemplo: `aws sts get-caller-identity` muestra el rol asumido; las variables `AWS_SESSION_TOKEN` cambian cada hora.
para: Que una credencial filtrada sirva poco tiempo.
cuidado: Las claves permanentes (`AKIA…`) en un `.env` o en el código son la causa número uno de incidentes: evítalas.
ver: Rol, OIDC, SSO

## Cuenta de servicio
alias: service account, cuenta técnica
nino: Es un **usuario que no es una persona** sino un robot: el programa que corre de noche tiene su propia credencial, con su propio nombre y solo sus permisos.
que: Una identidad para aplicaciones y procesos, no para humanos. En GCP se llama *service account* (`etl@proyecto.iam.gserviceaccount.com`); en Azure, *service principal* o *managed identity*; en AWS, un rol de servicio.
ejemplo: Dataflow corre como `sa-dataflow@datos-prod.iam.gserviceaccount.com`, que solo puede leer un bucket y escribir en un dataset de BigQuery.
para: Separar los permisos de cada proceso y auditar lo que hace.
cuidado: No descargues claves JSON de cuentas de servicio si puedes evitarlo: usa identidad del recurso (ADC, workload identity) u OIDC.
ver: IAM, Service principal, Managed identity, ADC

## Secreto
alias: secrets, secret, gestor de secretos
nino: Es como la **clave del candado de tu diario**: no la escribes en la tapa del diario ni se la cuentas a todos. La guardas en un lugar seguro y solo la usa quien debe.
que: Cualquier dato que da acceso: contraseñas, tokens, claves de API, cadenas de conexión, certificados. Se guardan en **gestores de secretos** (AWS Secrets Manager / Parameter Store, Azure Key Vault, GCP Secret Manager, Databricks secret scopes, GitHub Secrets) y se leen en tiempo de ejecución, con permisos y auditoría.
ejemplo:
```python
import boto3, json
s = boto3.client("secretsmanager").get_secret_value(SecretId="prod/postgres-ventas")
cred = json.loads(s["SecretString"])
```
para: Que las credenciales no aparezcan en el código, Git, logs ni notebooks, y se puedan rotar.
cuidado: Si un secreto llegó a Git, aunque lo borres sigue en el historial: rótalo (cámbialo) inmediatamente.
ver: Key Vault, Secret scope, Variable de entorno

## Presupuesto
alias: budget, alertas de costo, FinOps
nino: Es como la **mesada**: sabes cuánto puedes gastar en el mes, y una alarma te avisa cuando ya gastaste la mitad, para que no te quedes sin nada.
que: Un límite de gasto con **alertas** (por ejemplo al 50 %, 80 % y 100 %) en AWS Budgets, Azure Cost Management o GCP Billing budgets. FinOps es la práctica de medir y optimizar el costo de la nube (etiquetas, tamaños correctos, apagado automático, reservas).
ejemplo: `aws budgets create-budget` con US$20 mensuales y aviso por email al 80 %.
para: Evitar sorpresas en la factura, sobre todo mientras aprendes.
cuidado: Un presupuesto **avisa, no apaga**: tienes que actuar tú (o automatizarlo).
ver: Etiquetas, Nube

## Etiquetas
alias: tags, labels
nino: Son **stickers con nombre** que le pegas a cada cosa: "esto es del equipo de ventas", "esto es de prueba". Después puedes juntar todo lo que tenga el mismo sticker.
que: Pares clave-valor asignados a los recursos (`equipo=datos`, `entorno=dev`, `proyecto=lago`). Sirven para repartir costos, buscar recursos, aplicar políticas y automatizar (por ejemplo, apagar todo lo de `entorno=dev` de noche).
ejemplo: El reporte de costos agrupado por la etiqueta `proyecto` muestra que `poc-streaming` gastó US$900 este mes.
para: Saber cuánto cuesta cada cosa y de quién es.
ver: Presupuesto, Terraform
