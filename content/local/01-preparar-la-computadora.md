---
titulo: "Preparar tu computadora: Windows con WSL, macOS o Linux"
nivel: Básico
duracion: 45
resumen: El plan de todo lo que vas a instalar en este módulo y por qué, los requisitos mínimos, y el primer paso según tu sistema operativo: WSL 2 con Ubuntu en Windows, Homebrew en macOS o apt en Linux. Termina con una checklist para comprobar que todo funciona.
objetivos: Explicar qué herramientas forman el entorno local de un data engineer y para qué sirve cada una | Instalar WSL 2 con Ubuntu en Windows, o Homebrew en macOS | Usar el gestor de paquetes de tu sistema para instalar herramientas | Comprobar las versiones instaladas desde la terminal
prerrequisitos: fundamentos-terminal
autoevaluacion: ¿Sabes qué vas a instalar en este módulo y en qué orden? | ¿Sabes por qué en Windows conviene trabajar dentro de WSL? | ¿Sabes instalar un programa con apt, brew o winget? | ¿Sabes comprobar la versión de una herramienta desde la terminal?
---

:::escenario Tu primer día con una laptop nueva
Te contratan en el equipo de datos del Grupo Andino. Te dan una laptop vacía y un mensaje de tu líder:

> "Antes del viernes, tu máquina tiene que poder correr el proyecto del equipo: Python, Git, Docker, una base de datos, dbt, Airflow y las CLIs de la nube. Si te trabas, pregunta; pero intenta seguir la guía del equipo."

Este módulo es esa guía, paso a paso, para que puedas hacer **en tu computadora** todo lo que practicaste en el navegador.
:::

## El mapa de lo que vas a instalar

```diagrama
titulo: Tu entorno local de data engineering, en capas
nodo so: Sistema operativo | icono=servidor | col=0 | fila=0 | color=gris | sub=Windows + WSL 2,\nmacOS o Linux
nodo term: Terminal y gestor\nde paquetes | icono=codigo | col=1 | fila=0 | color=gris | sub=apt, brew, winget
nodo ed: VS Code + Git | icono=git | col=2 | fila=0 | color=azul | sub=editar y versionar
nodo py: Python con uv | icono=codigo | col=3 | fila=0 | color=amarillo | sub=entornos aislados
nodo dock: Docker | icono=docker | col=0 | fila=1 | color=cian | sub=bases y servicios\nen contenedores
nodo db: PostgreSQL y DuckDB | icono=base | col=1 | fila=1 | color=azul | sub=SQL local
nodo tools: dbt, Airflow, Spark | icono=engranaje | col=2 | fila=1 | color=violeta | sub=las herramientas\ndel pipeline
nodo nube: CLIs de nube\ny Terraform | icono=nube | col=3 | fila=1 | color=naranja | sub=aws, gcloud, az,\ndatabricks
flecha so -> term
flecha term -> ed
flecha ed -> py
flecha py -> tools
flecha term -> dock
flecha dock -> db
flecha tools -> nube | estilo=punteada
```

| Lección | Qué instalas | Para qué |
|---|---|---|
| 1 (esta) | WSL 2 (Windows) o Homebrew (macOS) | Una terminal Linux y un gestor de paquetes |
| 2 | VS Code, Git, cuenta de GitHub con SSH | Editar código y versionarlo |
| 3 | Python con **uv**, entornos virtuales, ruff y pytest | Proyectos de Python aislados y reproducibles |
| 4 | Docker Desktop | Correr bases de datos y servicios sin instalarlos |
| 5 | PostgreSQL (en Docker) y DuckDB | Practicar SQL con datos reales |
| 6 | dbt con DuckDB | Transformaciones como en el trabajo |
| 7 | Airflow | Orquestar pipelines |
| 8 | Java y PySpark | Spark en tu máquina |
| 9 | CLIs de AWS, Google Cloud, Azure, Databricks y Terraform | Trabajar con la nube desde tu terminal |
| 10 | Todo junto | El proyecto completo, corriendo en tu computadora |

### Requisitos mínimos

| | Mínimo | Recomendado |
|---|---|---|
| Memoria (RAM) | 8 GB | 16 GB (Docker + Airflow + Spark consumen bastante) |
| Disco libre | 30 GB | 60 GB en SSD |
| Sistema | Windows 10 22H2 / 11, macOS 13, Ubuntu 22.04 | Windows 11, macOS 14 o superior, Ubuntu 24.04 |
| Procesador | Cualquier x86-64 o Apple Silicon (M1–M4) | 4 núcleos o más |

:::tip Puedes practicar sin instalar nada
Cada comando de este módulo funciona también en la **terminal del curso** (botón ⌨ Terminal): tiene Docker, PostgreSQL, DuckDB, uv, dbt, Airflow y las CLIs de nube simulados con estado. Úsala para ensayar antes de hacerlo en tu máquina, o si tu computadora no cumple los requisitos.
:::

## Windows: trabajar dentro de Linux con WSL 2

Casi todas las herramientas de datos están pensadas para Linux: los servidores de producción, los contenedores y la documentación de dbt, Airflow y Spark asumen una terminal Linux. **WSL 2** (*Windows Subsystem for Linux*) corre un Ubuntu real dentro de Windows, integrado con el explorador de archivos y con VS Code. Es la forma recomendada de trabajar en Windows.

**Paso 1.** Abre **PowerShell como administrador** (clic derecho en el menú Inicio → "Terminal (Administrador)") y ejecuta:

```powershell
wsl --install
```

Instala la plataforma de virtualización, el kernel de Linux y **Ubuntu**. Reinicia cuando te lo pida.

**Paso 2.** Al reiniciar se abre Ubuntu y te pide un **usuario y una contraseña de Linux** (no tienen que ser los de Windows; anota la contraseña: la pide `sudo`).

**Paso 3.** Comprueba que es la versión 2:

```powershell
wsl -l -v
```

```text
  NAME      STATE           VERSION
* Ubuntu    Running         2
```

**Paso 4.** Instala **Windows Terminal** (viene con Windows 11; en Windows 10, desde la Microsoft Store). Desde ahora abre "Ubuntu" en Windows Terminal para trabajar.

**Paso 5.** Actualiza Ubuntu e instala lo básico:

```bash norun
sudo apt update && sudo apt upgrade -y
sudo apt install -y build-essential curl unzip git make
```

:::cuidado Dónde guardar tus proyectos
Guarda tus proyectos **dentro de Linux** (`/home/tu_usuario/proyectos`), no en `C:\Users\...` (que en WSL aparece como `/mnt/c/...`). Leer archivos de Windows desde Linux es hasta 10 veces más lento, y Git, Python y Docker se comportan mejor con el sistema de archivos de Linux. Desde el explorador de Windows puedes ver tus archivos de Linux en `\\wsl$\Ubuntu\home\tu_usuario`.
:::

**Instalar programas de Windows** (VS Code, Docker Desktop) se hace con el instalador o con **winget** en PowerShell:

```powershell
winget install -e --id Microsoft.VisualStudioCode
winget install -e --id Docker.DockerDesktop
```

## macOS: Homebrew

macOS ya tiene una terminal tipo Unix (zsh). Le falta un **gestor de paquetes**: **Homebrew**, que instala y actualiza herramientas con un comando.

**Paso 1.** Instala las herramientas de línea de comandos de Apple (incluyen `git` y el compilador):

```bash norun
xcode-select --install
```

**Paso 2.** Instala Homebrew (el comando oficial de [brew.sh](https://brew.sh)):

```bash norun
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Al terminar, Homebrew te muestra **dos líneas para agregar al PATH** (en Apple Silicon, `eval "$(/opt/homebrew/bin/brew shellenv)"`). Cópialas y ejecútalas: si no, la terminal no encuentra `brew`.

**Paso 3.** Instala lo básico:

```bash norun
brew install git make wget
brew install --cask visual-studio-code docker
```

`--cask` es para aplicaciones con ventana (VS Code, Docker Desktop).

## Linux (Ubuntu o Debian)

Ya tienes todo lo necesario para empezar. Actualiza e instala lo básico con **apt**:

```bash norun
sudo apt update && sudo apt upgrade -y
sudo apt install -y build-essential curl unzip git make
```

## Los gestores de paquetes, comparados

| Tarea | Ubuntu / WSL (`apt`) | macOS (`brew`) | Windows (`winget`, en PowerShell) |
|---|---|---|---|
| Actualizar la lista | `sudo apt update` | `brew update` | (automático) |
| Instalar | `sudo apt install git` | `brew install git` | `winget install -e --id Git.Git` |
| Actualizar todo | `sudo apt upgrade` | `brew upgrade` | `winget upgrade --all` |
| Buscar | `apt search duckdb` | `brew search duckdb` | `winget search duckdb` |
| Desinstalar | `sudo apt remove x` | `brew uninstall x` | `winget uninstall x` |

`sudo` ejecuta el comando como administrador: `apt` lo necesita porque instala para todo el sistema; `brew` no (instala en tu usuario).

## La checklist: ¿está todo listo?

Al terminar el módulo, estos comandos deberían responder con una versión. Ve tachando a medida que avanzas:

```bash norun
git --version          # lección 2
code --version         # lección 2
uv --version           # lección 3
python --version       # lección 3
docker --version       # lección 4
docker compose version # lección 4
psql --version         # lección 5
duckdb --version       # lección 5
java -version          # lección 8
aws --version; gcloud --version; az --version; databricks --version   # lección 9
terraform -version     # lección 9
```

Si un comando dice `command not found`, la herramienta no está instalada **o** no está en el **PATH** (la lista de carpetas donde la terminal busca programas). `echo $PATH` la muestra, y `which git` te dice dónde está un programa.

<!-- estandar:errores -->
:::errores
- **"WSL 2 requires an update to its kernel component"**: ejecuta `wsl --update` en PowerShell y vuelve a intentar.
- **"Virtualization is not enabled"** al instalar WSL o Docker: hay que activar la virtualización (Intel VT-x / AMD-V / SVM) en la BIOS de la computadora.
- **`brew: command not found` después de instalarlo**: faltó agregar Homebrew al PATH (las dos líneas que muestra el instalador). Cierra y vuelve a abrir la terminal.
- **Proyectos en `/mnt/c/...` desde WSL**: todo anda lento y Git muestra archivos modificados por los finales de línea. Muévelos a tu carpeta de Linux.
- **Instalar Python, Git y Docker dos veces** (una en Windows y otra en WSL) y confundirse de cuál se usa: en Windows, las herramientas de desarrollo van **dentro de WSL**; solo VS Code y Docker Desktop se instalan en Windows.
:::

<!-- estandar:trabajo -->
:::trabajo
- Muchos equipos tienen un **script de onboarding** (`setup.sh` o un `Makefile`) que instala todo lo de este módulo de una vez, o usan **Dev Containers**: un contenedor con el entorno ya armado que VS Code abre con un clic. Pregunta el primer día si existe.
- Las empresas suelen entregar laptops con restricciones (sin permisos de administrador, proxy corporativo). Si `apt`, `brew` o `pip` fallan por certificados o red, es eso: pide ayuda a soporte en lugar de desactivar la seguridad.
:::

## Ejercicios

:::ejercicio quiz
Trabajas en Windows. ¿Dónde conviene guardar tus proyectos de datos?

- [ ] En `C:\Users\tu_usuario\Documentos`, para verlos desde Windows
- [x] Dentro de Linux, en `/home/tu_usuario/proyectos`, y abrirlos desde VS Code con la extensión de WSL
- [ ] En el escritorio de Windows
- [ ] En una memoria USB
:::

:::ejercicio quiz
¿Para qué sirve `--cask` en `brew install --cask docker`?

- [ ] Para instalar una versión más vieja
- [x] Para instalar una aplicación de macOS con interfaz gráfica (Docker Desktop) en lugar de una herramienta de terminal
- [ ] Para instalar sin permisos de administrador
- [ ] Para instalar en Windows
:::

:::ejercicio quiz
Instalaste una herramienta y la terminal dice `command not found`. ¿Qué revisas primero?

- [ ] Reinstalar el sistema operativo
- [x] Si su carpeta está en el PATH (cerrar y abrir la terminal, `echo $PATH`, `which herramienta`)
- [ ] Si tienes internet
- [ ] La memoria RAM
:::

:::ejercicio cli
Estás en Ubuntu (WSL). Instala `git` y `make` con el gestor de paquetes del sistema, como administrador.
```respuesta
sudo apt install( -y)? git make
sudo apt install( -y)? make git
sudo apt-get install( -y)? git make
sudo apt-get install( -y)? make git
```
```solucion
sudo apt install -y git make
```
:::

:::ejercicio cli
Comprueba qué versión de Docker tienes instalada.
```respuesta
docker --version
docker -v
docker version
```
:::

:::ejercicio cli
En PowerShell de Windows, lista tus distribuciones de WSL con su versión (para confirmar que usas WSL 2).
```respuesta
wsl -l -v
wsl --list --verbose
wsl -l --verbose
wsl --list -v
```
```solucion
wsl -l -v
```
:::
