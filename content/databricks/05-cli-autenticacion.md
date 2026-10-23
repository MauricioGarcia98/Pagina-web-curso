---
titulo: Databricks CLI: instalación y autenticación
nivel: Intermedio
duracion: 25
resumen: Instalar la CLI, autenticarse con OAuth o token, perfiles en .databrickscfg y comandos de diagnóstico.
---

La **Databricks CLI** controla tu workspace desde la terminal: archivos, clusters, jobs, secretos, catálogos y, sobre todo, el despliegue con **Asset Bundles**. La versión actual (0.2xx, escrita en Go) reemplazó a la antigua `databricks-cli` de Python.

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
