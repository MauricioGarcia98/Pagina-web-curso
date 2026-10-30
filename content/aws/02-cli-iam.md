---
titulo: AWS CLI e IAM, quién puede hacer qué
nivel: Básico
duracion: 35
resumen: Instalar y configurar la AWS CLI, perfiles y SSO, --region, --output y --query (JMESPath), y los fundamentos de IAM, usuarios, roles, políticas y mínimo privilegio.
---

## La AWS CLI: AWS desde la terminal

Todo lo que se hace con clics en la consola web se puede hacer con el comando `aws`. Los data engineers prefieren la terminal porque **se puede repetir, guardar en un script y versionar en Git**.

La forma de todos los comandos es siempre la misma:

```text
aws  <servicio>  <operación>  [--parámetros]
aws   s3          ls
aws   glue        get-databases   --output table
aws   athena      start-query-execution --query-string "SELECT 1" ...
```

:::analogia Una frase con sujeto y verbo
`aws` es "oye AWS", el **servicio** es "a quién le hablas" (S3, Glue) y la **operación** es "qué le pides" (listar, crear, borrar). Los parámetros son los detalles: `--name`, `--region`…
:::

### Instalar y verificar

```bash norun
# Linux (en macOS: brew install awscli · en Windows: el instalador .msi)
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o awscliv2.zip
unzip awscliv2.zip && sudo ./aws/install
aws --version
```

### Configurar credenciales

```bash norun
aws configure                       # pide Access Key, Secret Key, región y formato
aws configure list                  # muestra qué configuración se está usando
aws sts get-caller-identity         # "¿quién soy?": cuenta, usuario o rol actual
```

`aws configure` guarda dos archivos en tu carpeta personal:

```ini
# ~/.aws/credentials   (secreto: nunca a Git)
[default]
aws_access_key_id = AKIA...
aws_secret_access_key = ...

# ~/.aws/config
[default]
region = us-east-1
output = json

[profile datos-prod]
sso_session = empresa
sso_account_id = 210987654321
sso_role_name = DataEngineer
region = sa-east-1
```

:::cuidado Las llaves de acceso son como la contraseña del banco
Una *access key* filtrada en GitHub es usada por bots en **minutos** (minan criptomonedas a tu costo). En empresas se usa **SSO** (`aws configure sso` y `aws sso login`) con credenciales temporales, y en servidores se usan **roles**, nunca llaves fijas.
:::

### Perfiles y región

```bash norun
aws s3 ls --profile datos-prod            # usar otro perfil para un comando
export AWS_PROFILE=datos-prod             # o para toda la sesión
aws glue get-databases --region sa-east-1 # cambiar de región para un comando
```

## Formatos de salida y --query

| `--output` | Para qué |
|---|---|
| `json` (por defecto) | Completo, para procesar con otras herramientas |
| `table` | Para leer en pantalla |
| `text` | Para scripts: valores separados por tabulaciones, sin comillas |
| `yaml` | Legible |

`--query` usa **JMESPath** (el mismo lenguaje que `az`). La diferencia con Azure: en AWS la respuesta casi siempre viene **envuelta** en una clave, por ejemplo `{"Buckets": [...]}` o `{"DatabaseList": [...]}`, así que la consulta empieza por esa clave:

```bash norun
aws s3api list-buckets --query "Buckets[].Name" --output text
aws glue get-databases --query "DatabaseList[].Name" --output text
aws lambda list-functions --query "Functions[?Runtime=='python3.12'].FunctionName"
aws glue get-tables --database-name lake_bronze --query "TableList[].{Tabla:Name, Ubicacion:Location}" --output table
```

```bash
aws sts get-caller-identity
aws sts get-caller-identity --query Account --output text
aws s3 ls
```

:::tip Guarda resultados en variables
```bash norun
CUENTA=$(aws sts get-caller-identity --query Account --output text)
echo "Trabajando en la cuenta $CUENTA"
```
:::

```recorrido
titulo: Del comando a la respuesta: JSON, --query y --output
estacion cmd: El comando | icono=terminal
estacion api: La API de AWS | icono=api
estacion json: La respuesta | icono=codigo
estacion query: --query | icono=lupa
estacion text: --output text | icono=check
paso cmd: Escribes un comando
`aws <servicio> <operación>`. Este pregunta "¿con qué identidad estoy conectado?". Es lo primero que conviene ejecutar en cualquier terminal nueva.
>>> bash
aws sts get-caller-identity
paso api: La CLI llama a la API
La CLI toma tus credenciales (del perfil o de SSO), **firma** la petición y la manda al servicio STS de AWS por internet. Cada comando de la CLI es una llamada a una API.
>>> texto
perfil "default"  →  credenciales  →  petición firmada
                                   →  https://sts.amazonaws.com
                                   ←  respuesta en JSON
paso json: La respuesta llega en JSON
Por defecto se muestra el JSON completo: tu número de cuenta, tu identificador y tu ARN (el "nombre completo" de cualquier recurso en AWS).
>>> json
{
  "UserId": "AIDAC14D3913C3A110C7",
  "Account": "123456789012",
  "Arn": "arn:aws:iam::123456789012:user/alumno"
}
paso query: --query elige una parte
`--query Account` usa JMESPath para quedarse **solo** con esa clave, antes de mostrar nada.
>>> bash
aws sts get-caller-identity --query Account --output text
paso text: --output text: listo para un script
Sin comillas ni llaves: el valor justo para guardarlo en una variable (`CUENTA=$(...)`) y usarlo en el comando siguiente.
>>> log
123456789012
```

## IAM: identidades y permisos

**IAM** (*Identity and Access Management*) responde a una sola pregunta: **¿quién puede hacer qué sobre qué recurso?**

| Concepto | Qué es | Ejemplo |
|---|---|---|
| **Usuario** | Una persona o programa con credenciales permanentes | `ana.lopez` (hoy se prefiere SSO) |
| **Grupo** | Un conjunto de usuarios con los mismos permisos | `data-engineers` |
| **Rol** | Una identidad **sin contraseña** que alguien o algo "asume" por un rato | `GlueServiceRole-datos`, el rol que usa un job de Glue |
| **Política** | Un documento JSON que dice qué está permitido | "puede leer `s3://lake/silver/*`" |

:::analogia El rol es una tarjeta de visitante
Un usuario es un empleado con su propia llave. Un **rol** es una tarjeta de acceso que se presta: el job de Glue la toma al arrancar, abre solo las puertas que la tarjeta permite y la devuelve al terminar. Las credenciales duran minutos u horas, así que si se filtran caducan solas.
:::

### Anatomía de una política

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "LeerSilver",
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:ListBucket"],
      "Resource": ["arn:aws:s3:::lake-tienda", "arn:aws:s3:::lake-tienda/silver/*"]
    },
    {
      "Sid": "NuncaBorrar",
      "Effect": "Deny",
      "Action": "s3:DeleteObject",
      "Resource": "arn:aws:s3:::lake-tienda/*"
    }
  ]
}
```

- **Effect**: `Allow` o `Deny`. Un `Deny` explícito **gana siempre**.
- **Action**: qué operaciones (`servicio:Operacion`). `s3:*` significa todas.
- **Resource**: sobre qué ARN. `ListBucket` se aplica al bucket; `GetObject` a los objetos (`bucket/*`).
- Por defecto todo está **denegado**: si nadie lo permitió, no se puede.

:::experto Mínimo privilegio
Da **solo** los permisos necesarios, sobre **solo** los recursos necesarios. Un job que lee `bronze` y escribe `silver` no necesita `s3:*` sobre `*`. En entrevistas se valora mucho mencionar roles por servicio, credenciales temporales y separar cuentas por entorno.
:::

### Roles para servicios

Un job de Glue, una Lambda o un cluster EMR necesitan un rol con dos partes:

1. **Política de confianza** (*trust policy*): quién puede asumir el rol (por ejemplo, `glue.amazonaws.com`).
2. **Políticas de permisos**: qué puede hacer una vez asumido.

```bash norun
aws iam create-role --role-name GlueJobSilver \
  --assume-role-policy-document file://confianza-glue.json
aws iam attach-role-policy --role-name GlueJobSilver \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSGlueServiceRole
aws iam list-roles --query "Roles[].RoleName" --output text
```

## Ejercicios

Las terminales de los ejercicios ya tienen una sesión iniciada. Escribe el comando y presiona Enter.

:::ejercicio cli
Averigua con qué identidad (cuenta y usuario o rol) estás conectado a AWS.
```respuesta
aws sts get-caller-identity( (--output|-o) \w+)?
```
```solucion
aws sts get-caller-identity
```
:::

:::ejercicio cli
Muestra **solo el número de cuenta** como texto plano (sin comillas), listo para guardar en una variable.
```respuesta
todos: aws sts get-caller-identity || --query ['"]?Account['"]? || --output text
```
```solucion
aws sts get-caller-identity --query Account --output text
```
:::

:::ejercicio cli
Guarda en la variable `CUENTA` el número de cuenta usando sustitución de comandos `$( … )`.
```respuesta
CUENTA=\$\(aws sts get-caller-identity (--query ['"]?Account['"]? --output text|--output text --query ['"]?Account['"]?)\)
```
```solucion
CUENTA=$(aws sts get-caller-identity --query Account --output text)
```
:::

:::ejercicio cli
Lista los nombres de los **roles** de IAM, como texto.
```respuesta
todos: aws iam list-roles || --query ['"]?Roles\[\]\.RoleName['"]? || --output text
```
```solucion
aws iam list-roles --query "Roles[].RoleName" --output text
```
:::

:::ejercicio cli
Lista los nombres de las funciones Lambda cuyo runtime sea `python3.12` (usa un filtro `[?...]` de JMESPath).
```respuesta
todos: aws lambda list-functions || --query ['"]Functions\[\?Runtime==[`']python3\.12[`']\]\.FunctionName['"]
```
```solucion
aws lambda list-functions --query "Functions[?Runtime=='python3.12'].FunctionName"
```
:::

:::ejercicio quiz
Una política tiene un `Allow` de `s3:*` sobre todo el bucket y otra un `Deny` de `s3:DeleteObject` sobre el mismo bucket. ¿Puede el usuario borrar un archivo?

- [ ] Sí, porque `s3:*` incluye borrar
- [x] No: un `Deny` explícito siempre gana sobre un `Allow`
- [ ] Depende del orden en que se crearon las políticas
- [ ] Solo si usa la consola web
:::

:::ejercicio quiz
Un job de Glue necesita leer de S3. ¿Cuál es la práctica correcta?

- [ ] Poner la access key de tu usuario dentro del código del job
- [ ] Crear un usuario IAM con `AdministratorAccess` para el job
- [x] Crear un **rol** que Glue pueda asumir, con permisos solo sobre las rutas que necesita
- [ ] Hacer el bucket público
:::

:::ejercicio quiz
En la política de arriba, ¿por qué `s3:ListBucket` usa `arn:aws:s3:::lake-tienda` y `s3:GetObject` usa `arn:aws:s3:::lake-tienda/silver/*`?

- [x] Porque listar es una acción sobre el **bucket** y leer es una acción sobre los **objetos** que contiene
- [ ] Es indistinto, son sinónimos
- [ ] Porque `ListBucket` es más peligroso
- [ ] Porque `GetObject` no admite comodines
:::
