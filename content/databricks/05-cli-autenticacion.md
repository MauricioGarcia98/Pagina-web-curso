---
titulo: Databricks CLI: instalación y autenticación
nivel: Intermedio
duracion: 25
resumen: Instalar la CLI, autenticarse con OAuth o token, perfiles en .databrickscfg y comandos de diagnóstico.
---

La **Databricks CLI** controla tu workspace desde la terminal: archivos, clústeres, jobs, secretos, catálogos y, sobre todo, el despliegue con **Declarative Automation Bundles** (antes *Asset Bundles*). La CLI actual es un programa escrito en Go (versión 0.205 en adelante, hoy en la línea 1.x) que reemplazó a la antigua `databricks-cli` de Python: si ves instrucciones con `pip install databricks-cli`, son de la versión vieja.

## ¿Para qué una CLI si existe la interfaz web?

La interfaz web de Databricks es excelente para explorar y desarrollar. La CLI es para todo lo que tiene que ser **repetible**: subir archivos de un proceso, crear secretos en un script de instalación, reiniciar un cluster desde un job de monitoreo y, sobre todo, **desplegar** notebooks y jobs desde Git hacia dev y prod con CI/CD (Declarative Automation Bundles, lección 7). Es exactamente la misma idea que `az`, `aws` o `gcloud`, pero para el workspace de Databricks.

La CLI habla con la **API REST** de Databricks: cada comando es una llamada HTTPS autenticada a tu workspace. Por eso lo primero es decirle **a qué workspace** hablar (el *host*) y **con qué credencial**.

## Instalación

```bash norun
# macOS / Linux con Homebrew (desde Homebrew 6 hay que "confiar" en el repositorio de terceros)
brew tap databricks/tap
brew trust databricks/tap
brew install databricks

# Linux / macOS con el script oficial
curl -fsSL https://raw.githubusercontent.com/databricks/setup-cli/main/install.sh | sh

# Windows
winget install Databricks.DatabricksCLI

databricks -v                     # o: databricks version
```

Para actualizarla se usa el mismo método con el que la instalaste (`brew upgrade databricks`, `winget upgrade Databricks.DatabricksCLI` o volver a correr el script).

## Autenticación

| Método | Comando | Cuándo |
|---|---|---|
| **OAuth usuario a máquina (U2M)** | `databricks auth login --host https://adb-123.azuredatabricks.net` | Recomendado para personas: abre el navegador |
| **Token personal (PAT)** | `databricks configure --token` | Método heredado (*legacy*): simple, pero es un secreto de larga duración |
| **OAuth máquina a máquina (M2M)** | Variables `DATABRICKS_CLIENT_ID` / `DATABRICKS_CLIENT_SECRET` | CI/CD con un service principal |
| **Azure CLI** | (usa tu `az login`) | En Azure, si ya iniciaste sesión con `az` |

La configuración queda en `~/.databrickscfg`, con **perfiles**:

```ini norun
[DEFAULT]
host = https://adb-1111111111111111.1.azuredatabricks.net
auth_type = databricks-cli

[prod]
host = https://adb-2222222222222222.2.azuredatabricks.net
auth_type = databricks-cli
```

```bash norun
databricks auth login --host https://adb-2222222222222222.2.azuredatabricks.net --profile prod
databricks auth profiles                  # lista los perfiles y si son válidos
databricks current-user me                # ¿quién soy?
databricks clusters list --profile prod   # usar otro perfil (-p prod)
```

También puedes usar variables de entorno `DATABRICKS_HOST` y `DATABRICKS_TOKEN` (útil en CI).

### Dónde se guardan las credenciales

Desde la versión 1.0 de la CLI, los tokens de `databricks auth login` **no** se guardan en `.databrickscfg`: van al almacén seguro del sistema operativo (el *Keychain* en macOS, el *Credential Manager* en Windows, el *Secret Service* en Linux). El archivo `.databrickscfg` solo tiene datos no secretos, como el host y el tipo de autenticación. En servidores sin ese almacén (un contenedor de CI) se puede usar un archivo de texto con `export DATABRICKS_AUTH_STORAGE=plaintext`.

### En qué orden busca la CLI las credenciales

Cuando ejecutas un comando, la CLI busca la configuración en este orden y **se detiene en la primera que encuentra**:

1. Los archivos de configuración del *bundle*, si estás dentro de la carpeta de uno.
2. Las **variables de entorno** (`DATABRICKS_HOST`, `DATABRICKS_TOKEN`, `DATABRICKS_CLIENT_ID`…).
3. Los **perfiles** de `~/.databrickscfg`.

Consecuencia práctica, que la documentación pone como ejemplo: si tienes una variable `DATABRICKS_TOKEN` definida (de una prueba de ayer), la CLI la usa **aunque** pases `--profile prod`. Cuando "la CLI se conecta al workspace equivocado", lo primero es mirar `env | grep DATABRICKS`.

### ¿Por qué OAuth y no un token?

Un **token personal** (PAT) es como una contraseña que no vence (o vence en meses): si alguien lo copia de un archivo o de un repositorio, tiene acceso a todo lo que tú tienes. **OAuth** emite credenciales de **corta duración** (los tokens de OAuth vencen en menos de una hora) que la CLI renueva sola y se pueden revocar centralmente. Por eso la recomendación actual es `databricks auth login` para personas y *service principals* con OAuth M2M para automatizaciones.

## Pruébalo en la terminal

```bash
databricks current-user me
databricks auth login --host https://adb-1234567890123456.7.azuredatabricks.net
databricks auth profiles
databricks current-user me
databricks clusters list
databricks catalogs list
```

El primer `current-user me` falla con el mismo mensaje que la CLI real cuando no hay credenciales configuradas; después del `auth login` funciona. Ese error ("cannot configure default credentials") es el que más vas a ver al empezar: casi siempre significa que falta el login o que el perfil apunta a otro host.

:::errores
- **`cannot configure default credentials`**: no hay login o el perfil no existe. Corre `databricks auth login --host ...` o revisa `databricks auth profiles`.
- **La CLI habla con el workspace equivocado**: hay una variable `DATABRICKS_HOST` o `DATABRICKS_TOKEN` definida que tiene prioridad sobre el perfil.
- **Instalar `pip install databricks-cli`**: es la CLI vieja de Python, con otros comandos. La actual se instala con brew, winget o el script.
- **Subir un PAT a Git** en un script de CI: queda en el historial para siempre. En CI se usa un *service principal* con OAuth M2M y el secreto en el gestor de secretos del CI.
- **Usar la misma credencial personal en producción**: si te vas de la empresa, los jobs dejan de funcionar. Los jobs de producción corren como un *service principal*.
:::

:::trabajo
- El primer día con un workspace: instalar la CLI, `databricks auth login` con un perfil por entorno (`dev`, `prod`) y comprobar con `databricks current-user me -p dev`.
- En GitHub Actions o Azure DevOps se definen `DATABRICKS_HOST`, `DATABRICKS_CLIENT_ID` y `DATABRICKS_CLIENT_SECRET` como secretos del pipeline, y el paso de despliegue corre `databricks bundle deploy -t prod`.
- En Azure también existe la autenticación con la identidad de `az login` o con *managed identities*, muy usada en empresas que centralizan todo en Microsoft Entra ID.
:::

:::entrevista "¿Cómo se autentica un pipeline de CI/CD contra Databricks?"
Con un service principal y OAuth máquina a máquina: se crea el service principal en la cuenta, se le da acceso al workspace con los permisos mínimos y se genera un secreto OAuth. En el CI se guardan como secretos el host, el client ID y el client secret, que la CLI lee de las variables de entorno. Así no hay tokens personales de larga duración, las credenciales se pueden rotar y revocar, y los despliegues no dependen de una persona.
:::

## Ejercicios

:::ejercicio cli
Inicia sesión con **OAuth** en el workspace `https://adb-1234567890123456.7.azuredatabricks.net`.
```respuesta
todos: databricks auth login || --host https://adb-1234567890123456\.7\.azuredatabricks\.net/?
```
```solucion
databricks auth login --host https://adb-1234567890123456.7.azuredatabricks.net
```
:::

:::ejercicio cli
Muestra qué usuario está autenticado.
```respuesta
databricks current-user me
```
```salida
{
  "userName": "ana@empresa.com",
  "displayName": "Ana Pérez",
  "active": true
}
```
:::

:::ejercicio cli
Lista los perfiles de autenticación configurados.
```respuesta
databricks auth profiles
```
:::

:::ejercicio cli
Lista los clusters del workspace usando el perfil `prod`.
```respuesta
databricks clusters list (--profile|-p) prod
databricks (--profile|-p) prod clusters list
```
```solucion
databricks clusters list --profile prod
```
:::

:::ejercicio quiz
¿Cuál es la forma recomendada de autenticar un pipeline de CI/CD contra Databricks?

- [ ] El token personal de un desarrollador
- [x] Un service principal con OAuth M2M (client id + secret, o federación de identidad)
- [ ] Usuario y contraseña
- [ ] No autenticarse
:::
