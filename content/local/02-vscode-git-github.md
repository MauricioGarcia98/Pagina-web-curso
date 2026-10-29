---
titulo: "VS Code, Git y GitHub: editar y versionar como en un equipo"
nivel: Básico
duracion: 55
resumen: Instala y configura VS Code con las extensiones de un data engineer, configura Git con tu identidad, conecta tu computadora con GitHub por SSH y practica el flujo de trabajo de un equipo: rama, commits, push y pull request.
objetivos: Instalar VS Code y las extensiones para Python, SQL, dbt, Docker, Terraform y WSL | Configurar la identidad de Git y la rama por defecto | Crear una clave SSH, agregarla a GitHub y comprobar la conexión | Crear un repositorio con .gitignore y subirlo a GitHub | Trabajar con ramas y pull requests como en un equipo
prerrequisitos: local-preparar-la-computadora | fundamentos-git
autoevaluacion: ¿Sabes abrir una carpeta de WSL en VS Code con code . ? | ¿Configuraste user.name y user.email de Git? | ¿Sabes generar una clave SSH y probar la conexión con GitHub? | ¿Sabes qué va en un .gitignore de un proyecto de datos? | ¿Puedes explicar el flujo rama → commit → push → pull request → merge?
---

:::escenario El primer pull request
Tu líder te comparte el repositorio del equipo y te pide un cambio chico para que te familiarices:

> "Clona el repo, crea una rama, agrega tu nombre al README y abre un pull request. Lo importante no es el cambio: es que tu máquina quede lista para trabajar como el resto del equipo."
:::

## 1. VS Code

**Visual Studio Code** es el editor más usado en datos: liviano, gratuito y con extensiones para todo.

**Instalar:** Windows → `winget install -e --id Microsoft.VisualStudioCode` (en PowerShell) · macOS → `brew install --cask visual-studio-code` · Ubuntu → descarga el `.deb` de [code.visualstudio.com](https://code.visualstudio.com) y `sudo apt install ./code_*.deb`.

**Extensiones recomendadas** (pestaña Extensiones, `Ctrl+Shift+X`):

| Extensión | Para qué |
|---|---|
| **WSL** (Microsoft) | Solo Windows: abre carpetas de Linux con todo funcionando dentro de WSL |
| **Python** + **Pylance** | Autocompletado, depurador, entornos virtuales |
| **Ruff** | Formato y errores de Python al guardar |
| **Jupyter** | Notebooks dentro de VS Code |
| **SQLTools** + driver de PostgreSQL | Conectarte a bases y ejecutar SQL |
| **dbt Power User** | Navegar modelos de dbt, ver el SQL compilado y el linaje |
| **Docker** | Ver contenedores, imágenes y logs |
| **HashiCorp Terraform** | Sintaxis y autocompletado de HCL |
| **YAML** (Red Hat) | Validar YAML (dbt, Docker Compose, GitHub Actions) |
| **GitLens** | Ver quién cambió cada línea y cuándo |

**Abrir un proyecto desde la terminal:** dentro de la carpeta del proyecto, `code .` abre VS Code en esa carpeta. En WSL, la primera vez instala solo el "servidor" de VS Code en Linux, y la barra inferior muestra `WSL: Ubuntu`.

:::tip Atajos que vas a usar todo el día
`Ctrl+P` (`Cmd+P` en Mac) abre un archivo por nombre · `Ctrl+Shift+P` abre la paleta de comandos · `` Ctrl+` `` abre la terminal integrada · `Ctrl+/` comenta líneas · `F2` renombra una variable en todo el proyecto.
:::

## 2. Git: tu identidad

Git viene en macOS (con `xcode-select`) y lo instalaste en WSL/Linux con `apt`. Antes del primer commit, dile quién eres (queda en cada commit):

```bash norun
git config --global user.name "Ana Pérez"
git config --global user.email "ana@correo.com"     # el mismo email de tu cuenta de GitHub
git config --global init.defaultBranch main
git config --global pull.rebase false
git config --global --list
```

`--global` guarda la configuración para tu usuario (en `~/.gitconfig`), para todos tus repositorios.

## 3. GitHub con SSH

GitHub necesita saber que eres tú cuando haces `push`. La forma recomendada es una **clave SSH**: un par de archivos, uno **privado** (queda en tu máquina, nunca se comparte) y uno **público** (`.pub`, se sube a GitHub).

```diagrama
titulo: Cómo te reconoce GitHub con SSH
nodo pc: Tu computadora | icono=equipo | col=0 | fila=0 | color=azul | sub=~/.ssh/id_ed25519\n(clave privada)
nodo gh: GitHub | icono=git | col=2 | fila=0 | color=gris | sub=Settings → SSH keys\n(clave pública)
nodo par: Par de claves | icono=llave | col=1 | fila=1 | color=amarillo | sub=ssh-keygen\nlas crea juntas
flecha par -> pc: privada
flecha par -> gh: id_ed25519.pub
flecha pc <-> gh: git push / pull
```

**Paso 1.** Crea la clave (pon una frase de contraseña cuando la pida):

```bash norun
ssh-keygen -t ed25519 -C "ana@correo.com"
```

**Paso 2.** Copia la clave **pública**:

```bash norun
cat ~/.ssh/id_ed25519.pub
```

**Paso 3.** En GitHub: tu foto → **Settings** → **SSH and GPG keys** → **New SSH key**, pega el contenido y guarda. (Con la CLI de GitHub: `gh auth login` y `gh ssh-key add ~/.ssh/id_ed25519.pub`.)

**Paso 4.** Prueba la conexión:

```text
$ ssh -T git@github.com
Hi ana-perez! You've successfully authenticated, but GitHub does not provide shell access.
```

## 4. Tu primer repositorio

```bash norun
mkdir -p ~/proyectos/lago && cd ~/proyectos/lago
git init
code .gitignore           # pega el contenido de abajo
echo "# Lago de datos" > README.md
git add .
git commit -m "Primer commit: README y .gitignore"
```

Un `.gitignore` de un proyecto de datos:

```text
# entornos y cachés de Python
.venv/
__pycache__/
.pytest_cache/
.ruff_cache/

# secretos: NUNCA a Git
.env
*.pem
credenciales*.json

# datos y bases locales (se regeneran; pueden ser grandes o sensibles)
data/
*.duckdb
*.parquet

# dbt
target/
dbt_packages/
logs/

# Terraform
.terraform/
*.tfstate
*.tfstate.*
```

Crea el repositorio vacío en GitHub (botón **New**, sin README) y conéctalo:

```bash norun
git remote add origin git@github.com:ana-perez/lago.git
git push -u origin main
```

## 5. El flujo de trabajo de un equipo

Nadie trabaja directo en `main`. Cada cambio va en una **rama**, se sube y se propone con un **pull request** (PR) que otra persona revisa.

```diagrama
titulo: Del cambio al merge: el flujo con ramas y pull requests
nodo main: main | icono=git | col=0 | fila=0 | color=verde | sub=siempre funciona
nodo rama: feat/ingesta | icono=codigo | col=1 | fila=0 | color=azul | sub=git switch -c
nodo push: git push | icono=nube | col=2 | fila=0 | color=gris
nodo pr: Pull request | icono=equipo | col=3 | fila=0 | color=violeta | sub=revisión + CI
nodo merge: Merge a main | icono=check | col=3 | fila=1 | color=verde
nodo pull: git pull | icono=archivos | col=0 | fila=1 | color=gris | sub=traer lo nuevo
flecha main -> rama
flecha rama -> push: commits
flecha push -> pr
flecha pr -> merge: aprobado
flecha merge -> pull | estilo=punteada
flecha pull -> main | estilo=punteada
```

```bash norun
git switch main && git pull              # empezar siempre desde main actualizado
git switch -c feat/ingesta-pedidos       # rama nueva con un nombre que diga qué haces
# … editas, pruebas …
git add ingesta.py
git commit -m "Agrega ingesta diaria de pedidos"
git push -u origin feat/ingesta-pedidos  # la primera vez, -u conecta la rama local con la remota
```

GitHub muestra un botón **Compare & pull request**. En la descripción explica **qué** cambia y **por qué**, y cómo lo probaste. Cuando te aprueban, se hace el merge y borras la rama.

:::nota Mensajes de commit
Un buen mensaje dice qué hace el cambio, en presente y en una línea: "Agrega ingesta diaria de pedidos", "Corrige el cálculo de churn mensual". Muchos equipos usan prefijos (*Conventional Commits*): `feat:`, `fix:`, `docs:`, `refactor:`.
:::

<!-- estandar:errores -->
:::errores
- **`Permission denied (publickey)`** al hacer push: la clave pública no está en GitHub, o el remoto es `https://` en lugar de `git@github.com:`. Revisa con `git remote -v` y `ssh -T git@github.com`.
- **Commits con otro nombre o email** (el de la computadora): no configuraste `user.name` y `user.email`, y GitHub no los asocia a tu cuenta.
- **Subir un `.env` o una clave**: aunque lo borres después, queda en la historia. Hay que **rotar** la credencial (crear una nueva e invalidar la vieja) de inmediato.
- **Trabajar en `main` y no poder hacer push** porque el repositorio protege la rama: crea una rama con tus cambios (`git switch -c mi-rama`) y súbela.
- **`code .` abre VS Code de Windows sin conectarse a WSL** (y no encuentra Python): falta la extensión WSL. Instálala y vuelve a ejecutar `code .` desde Ubuntu.
:::

<!-- estandar:trabajo -->
:::trabajo
- Los repositorios del equipo tienen `main` **protegida**: solo se cambia por pull request con al menos una aprobación y la CI en verde.
- Muchos equipos agregan **pre-commit** (`pip install pre-commit` y un archivo `.pre-commit-config.yaml`) para correr ruff, el formato de SQL y la detección de secretos antes de cada commit.
- Un pull request chico (menos de 300 líneas) se revisa en el día; uno enorme espera una semana. Divide el trabajo.
:::

## Ejercicios

:::ejercicio quiz
¿Qué parte de la clave SSH se sube a GitHub?

- [ ] La privada (`id_ed25519`)
- [x] La pública (`id_ed25519.pub`)
- [ ] Las dos
- [ ] Ninguna: GitHub la genera
:::

:::ejercicio quiz
¿Cuál de estos archivos **no** debería estar en el `.gitignore` de un proyecto de datos?

- [ ] `.env`
- [ ] `.venv/`
- [x] `pyproject.toml`
- [ ] `terraform.tfstate`
:::

:::ejercicio quiz
Antes de crear una rama nueva para un cambio, ¿qué conviene hacer?

- [ ] Nada, se crea desde donde estés
- [x] Volver a `main` y traer lo último (`git switch main && git pull`)
- [ ] Borrar el repositorio y clonarlo de nuevo
- [ ] Hacer un commit vacío
:::

:::ejercicio cli
Configura tu nombre en Git para todos tus repositorios: `Ana Pérez`.
```respuesta
git config --global user.name ["']Ana Pérez["']
```
```solucion
git config --global user.name "Ana Pérez"
```
:::

:::ejercicio cli
Genera una clave SSH de tipo `ed25519` con el comentario `ana@correo.com`.
```respuesta
ssh-keygen -t ed25519 -C ["']ana@correo.com["']
ssh-keygen -C ["']ana@correo.com["'] -t ed25519
```
```solucion
ssh-keygen -t ed25519 -C "ana@correo.com"
```
:::

:::ejercicio cli
Estás en `main` del repositorio `~/proyectos/lago`. Crea una rama llamada `feat/ingesta` y cámbiate a ella en un solo comando.
```respuesta
git switch -c feat/ingesta
git checkout -b feat/ingesta
```
```setup
mkdir -p ~/proyectos/lago
cd ~/proyectos/lago
git init
echo "# Lago" > README.md
git add .
git commit -m "Primer commit"
```
:::

:::ejercicio cli
Ya creaste la rama `feat/ingesta` con un commit y el remoto `origin`. Súbela a GitHub y deja configurado el seguimiento de la rama remota.
```respuesta
git push -u origin feat/ingesta
git push --set-upstream origin feat/ingesta
```
```setup
mkdir -p ~/proyectos/lago2
cd ~/proyectos/lago2
git init
echo "# Lago" > README.md
git add .
git commit -m "Primer commit"
git switch -c feat/ingesta
echo "print(1)" > ingesta.py
git add ingesta.py
git commit -m "Agrega ingesta"
git remote add origin git@github.com:alumno/lago.git
```
:::
