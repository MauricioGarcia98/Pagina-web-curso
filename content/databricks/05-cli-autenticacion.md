---
titulo: Databricks CLI: instalación y autenticación
nivel: Intermedio
duracion: 25
resumen: Instalar la CLI, autenticarse con OAuth o token, perfiles en .databrickscfg y comandos de diagnóstico.
---

La **Databricks CLI** controla tu workspace desde la terminal: archivos, clusters, jobs, secretos, catálogos y, sobre todo, el despliegue con **Asset Bundles**. La versión actual (0.2xx, escrita en Go) reemplazó a la antigua `databricks-cli` de Python.

## ¿Para qué una CLI si existe la interfaz web?

La interfaz web de Databricks es excelente para explorar y desarrollar. La CLI es para todo lo que tiene que ser **repetible**: subir archivos de un proceso, crear secretos en un script de instalación, reiniciar un cluster desde un job de monitoreo y, sobre todo, **desplegar** notebooks y jobs desde Git hacia dev y prod con CI/CD (Asset Bundles, lección 7). Es exactamente la misma idea que `az`, `aws` o `gcloud`, pero para el workspace de Databricks.

La CLI habla con la **API REST** de Databricks: cada comando es una llamada HTTPS autenticada a tu workspace. Por eso lo primero es decirle **a qué workspace** hablar (el *host*) y **con qué credencial**.

## Instalación

```bash norun
# macOS / Linux con Homebrew
brew tap databricks/tap && brew install databricks

# Linux / macOS con el script oficial
curl -fsSL https://raw.githubusercontent.com/databricks/setup-cli/main/install.sh | sh

# Windows
winget install Databricks.DatabricksCLI

databricks -v
```

## Autenticación

| Método | Comando | Cuándo |
|---|---|---|
| **OAuth usuario a máquina (U2M)** | `databricks auth login --host https://adb-123.azuredatabricks.net` | Recomendado para personas: abre el navegador |
| **Token personal (PAT)** | `databricks configure --token` | Simple, pero es un secreto de larga duración |
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

### ¿Por qué OAuth y no un token?

Un **token personal** (PAT) es como una contraseña que no vence (o vence en meses): si alguien lo copia de un archivo o de un repositorio, tiene acceso a todo lo que tú tienes. **OAuth** emite credenciales de **corta duración** que se renuevan solas y se pueden revocar centralmente. Por eso la recomendación actual es `databricks auth login` para personas y *service principals* con OAuth M2M para automatizaciones.

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
