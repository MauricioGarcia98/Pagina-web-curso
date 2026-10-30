# area: Herramientas

## Terminal
alias: consola, shell, bash, zsh, powershell, línea de comandos
nino: Es una **ventana donde le hablas a la computadora escribiendo**, en lugar de hacer clic. Escribes una orden, apretas Enter y la computadora te responde con texto.
que: La aplicación que ejecuta una **shell** (bash, zsh en macOS, PowerShell en Windows, o bash dentro de WSL): un intérprete que corre comandos (`ls`, `cd`, `cat`, `grep`), programas (`python`, `git`, `docker`, `terraform`) y scripts. Conceptos clave: directorio actual, rutas, variables de entorno, tuberías (`|`) y redirecciones (`>`, `>>`).
ejemplo:
```bash
cd ~/proyectos/curso-datos
ls -la
head -5 data/pedidos.csv | column -s, -t
grep -c "entregado" data/pedidos.csv > conteo.txt
```
para: Casi todo el trabajo de datos (Git, Python, Docker, nubes, servidores) se hace o automatiza desde la terminal.
cuidado: Comandos como `rm -rf` no tienen papelera: revisa la ruta antes de apretar Enter.
ver: PATH, Variable de entorno, Git, CLI

## Git
alias: control de versiones
nino: Git es una **máquina de fotos para tu trabajo**: cada vez que terminas algo, sacas una foto (commit) con una nota. Si después rompes algo, vuelves a la foto de ayer. Y varias personas pueden trabajar a la vez sin pisarse.
que: El sistema de **control de versiones** distribuido estándar: guarda la historia completa de los archivos de un proyecto en un repositorio, con commits, ramas y fusiones. Comandos base: `git init|clone`, `status`, `add`, `commit`, `log`, `diff`, `branch`, `switch`, `merge`, `pull`, `push`.
ejemplo:
```bash
git switch -c feature/mart-ventas
git add models/marts/fct_ventas.sql
git commit -m "Agrega mart de ventas diarias por ciudad"
git push -u origin feature/mart-ventas
```
para: Historial, colaboración, revisión de código y despliegues automáticos.
ver: Commit, Rama, Repositorio, Pull request

## Repositorio
alias: repo, repository
nino: Es la **caja del proyecto** que contiene todos sus archivos y además el **álbum de fotos** con toda su historia.
que: Una carpeta de proyecto con su historia de Git (carpeta oculta `.git/`). Hay una copia **local** (en tu computadora) y una **remota** (en GitHub, GitLab, Azure DevOps), llamada habitualmente `origin`. `git clone` copia una remota a tu máquina.
ejemplo: `git clone https://github.com/empresa/pipelines-datos.git && cd pipelines-datos`
para: Tener el código del proyecto con su historia, compartido con el equipo.
ver: Git, GitHub

## Commit
alias: commits, confirmación
nino: Es **una foto del proyecto** con una nota que dice qué cambiaste: "arreglé el cálculo del IVA". Puedes ver todas las fotos en orden.
que: Una instantánea del estado de los archivos preparados (`git add`) con autor, fecha, mensaje y un identificador único (hash). Los commits forman la historia; se pueden comparar (`git diff`), revertir (`git revert`) o ver (`git show`).
ejemplo: `git commit -m "Corrige duplicados en stg_pedidos (filtra por _cargado_en más reciente)"`
para: Cambios pequeños, explicados y reversibles.
cuidado: Nunca hagas commit de secretos, datos personales ni archivos de datos grandes. Mensajes como "cambios" no explican nada.
ver: Git, .gitignore

## Rama
alias: branch, ramas, main
nino: Es **una copia del cuaderno para probar una idea** sin ensuciar el cuaderno principal. Si la idea funciona, pasas los cambios al cuaderno principal; si no, tiras la copia.
que: Una línea de desarrollo independiente en Git. La principal suele ser `main`; para cada cambio se crea una rama (`feature/…`, `fix/…`), se trabaja, se abre un pull request y se fusiona (*merge*) en `main`.
ejemplo: `git switch -c fix/zona-horaria-pedidos` … `git switch main && git pull`.
para: Trabajar en paralelo sin romper lo que funciona.
ver: Git, Pull request

## Pull request
alias: pr, merge request, mr
nino: Es **levantar la mano y decir "terminé, ¿lo revisas?"**: un compañero mira tus cambios, te deja comentarios y, si está bien, se suman al proyecto.
que: Una solicitud para fusionar una rama en otra (normalmente `main`) en GitHub/GitLab/Azure DevOps. Muestra el diff, permite **revisión de código** y comentarios, y ejecuta **CI** (pruebas, lint, `terraform plan`, `dbt build` en un entorno temporal) antes de aprobar.
ejemplo: PR "Agrega mart de ventas": 3 archivos, CI verde (dbt build + tests), 1 aprobación → *Merge*.
para: Calidad y conocimiento compartido: ningún cambio llega a producción sin otro par de ojos y sin pruebas.
ver: Rama, CI/CD, GitHub

## .gitignore
alias: gitignore
nino: Es la **lista de cosas que no van en la foto**: "no saques foto de la basura, ni de mis contraseñas".
que: Un archivo con patrones de archivos y carpetas que Git debe **ignorar**: entornos virtuales (`.venv/`), cachés (`__pycache__/`), secretos (`.env`), datos (`*.csv`, `data/`), estado de Terraform (`*.tfstate`, `.terraform/`), salidas de dbt (`target/`).
ejemplo:
```text
.venv/
__pycache__/
.env
*.tfstate*
.terraform/
target/
data/*.parquet
```
para: Que no se suban secretos, basura ni archivos pesados.
cuidado: Si un archivo ya fue commiteado, agregarlo al `.gitignore` no lo borra de la historia: hay que sacarlo con `git rm --cached`, y si era un secreto, rotarlo.
ver: Git, Secreto

## GitHub
alias: github.com, gitlab, azure devops
nino: Es una **gran biblioteca en internet de cajas de proyectos**: guardas ahí tu repositorio, otros lo pueden ver, comentar y ayudarte.
que: Plataforma para alojar repositorios Git con pull requests, revisión de código, issues, GitHub Actions (CI/CD), Pages (sitios estáticos), secretos y permisos. Alternativas: GitLab, Bitbucket, Azure DevOps.
ejemplo: Este curso está en un repositorio de GitHub y se publica con GitHub Pages.
para: Colaboración, automatización y portafolio profesional.
ver: Git, GitHub Actions, Pull request

## CI/CD
alias: integración continua, entrega continua, despliegue continuo, ci, cd
nino: Es un **robot inspector y repartidor**: cada vez que alguien cambia algo, el robot lo prueba enseguida (CI) y, si todo está bien, lo lleva solo a donde tiene que estar (CD).
que: **CI** (*integración continua*): en cada push o pull request se ejecutan automáticamente lint, pruebas, build, `dbt build` contra un entorno de prueba y `terraform plan`. **CD** (*entrega/despliegue continuo*): al fusionar en `main` se despliega automáticamente (`terraform apply`, `databricks bundle deploy`, imágenes Docker, DAGs). Herramientas: GitHub Actions, GitLab CI, Azure Pipelines, Jenkins.
ejemplo: PR → CI: `ruff`, `pytest`, `sqlfluff`, `dbt build --select state:modified+` → merge → CD: despliegue a prod.
para: Cambios frecuentes, seguros y sin pasos manuales.
ver: GitHub Actions, Pull request, Prueba unitaria, OIDC

## GitHub Actions
alias: actions, workflows, .github/workflows
nino: Son **instrucciones para el robot de GitHub**: "cada vez que alguien suba algo, prueba esto; cada lunes a las 8, haz esto otro".
que: El sistema de CI/CD de GitHub: **workflows** en YAML (`.github/workflows/*.yml`) que se disparan por eventos (`push`, `pull_request`, `schedule`, `workflow_dispatch`), con **jobs** que corren en *runners* y **steps** que ejecutan comandos o *actions* reutilizables. Usa secretos y OIDC para la nube.
ejemplo:
```yaml
name: ci
on: [pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v6
      - run: uv sync && uv run pytest -q
```
para: Automatizar pruebas y despliegues junto al código.
ver: CI/CD, GitHub, OIDC

## Docker
alias: contenedores, docker engine
nino: Docker es como una **lonchera hermética**: pones adentro tu comida con sus cubiertos y servilleta, y donde sea que la abras (casa, escuela, plaza) está todo igual. Nunca más "en mi casa funcionaba".
que: Plataforma para empaquetar una aplicación con **todo lo que necesita** (sistema base, Python, librerías, configuración) en una **imagen**, y ejecutarla como **contenedor** aislado, igual en cualquier máquina. Herramientas: Docker Desktop, Docker Engine, Podman.
ejemplo:
```bash
docker run --rm -e POSTGRES_PASSWORD=curso -p 5432:5432 postgres:16
```
— una base PostgreSQL lista en segundos, sin instalar nada.
para: Entornos reproducibles, bases y herramientas locales, y despliegue en Kubernetes, ECS, Cloud Run, etc.
ver: Imagen, Contenedor, Dockerfile, Docker Compose

## Imagen
alias: docker image, imagen de docker
nino: Es la **receta congelada** de la lonchera: con ella puedes preparar todas las loncheras que quieras, siempre iguales.
que: Una plantilla inmutable de solo lectura, formada por capas, que contiene el sistema de archivos y la configuración para iniciar contenedores. Se construye con un Dockerfile (`docker build`) y se publica en un registro (Docker Hub, ECR, ACR, Artifact Registry) con nombre y etiqueta (`empresa/etl:1.4.0`).
ejemplo: `docker build -t etl-pedidos:1.0 .` · `docker images` · `docker push registro.empresa.com/etl-pedidos:1.0`.
para: Distribuir software listo para correr.
cuidado: Evita la etiqueta `latest` en producción: usa versiones fijas.
ver: Dockerfile, Contenedor

## Contenedor
alias: container, contenedores
nino: Es **la lonchera abierta y en uso**, preparada con la receta (imagen). Puedes tener muchas loncheras iguales abiertas a la vez.
que: Una instancia en ejecución de una imagen: un proceso aislado con su propio sistema de archivos, red y variables. Es efímero: lo que escribe adentro se pierde al borrarlo, salvo que use volúmenes. Comandos: `docker run`, `ps`, `logs`, `exec`, `stop`, `rm`.
ejemplo: `docker exec -it pg psql -U postgres` — entrar a la base que corre en el contenedor `pg`.
para: Ejecutar servicios y jobs aislados y reproducibles.
ver: Imagen, Volumen de Docker, Docker

## Dockerfile
alias: dockerfile
nino: Es **la receta escrita paso a paso** para preparar la lonchera: "pon pan, pon queso, pon jugo".
que: Archivo de texto con las instrucciones para construir una imagen: `FROM` (imagen base), `WORKDIR`, `COPY`, `RUN` (instala), `ENV`, `USER`, `CMD`/`ENTRYPOINT` (qué ejecutar). Cada instrucción crea una capa que se reutiliza en caché.
ejemplo:
```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY src/ src/
USER 1000
CMD ["python", "-m", "src.etl_pedidos"]
```
para: Imágenes reproducibles y versionadas en Git.
cuidado: Copia primero los archivos de dependencias y luego el código, para aprovechar la caché; nunca copies secretos a la imagen.
ver: Imagen, Docker

## Volumen de Docker
alias: docker volume, bind mount, -v
nino: Es un **cajón fuera de la lonchera** donde guardas lo que no quieres perder cuando tiras la lonchera.
que: Almacenamiento persistente para contenedores: **volúmenes** administrados por Docker (`-v pgdata:/var/lib/postgresql/data`) o **bind mounts** que montan una carpeta de tu máquina (`-v "$PWD/data:/data"`). Los datos sobreviven a que el contenedor se borre.
ejemplo: `docker run -d --name pg -v pgdata:/var/lib/postgresql/data -e POSTGRES_PASSWORD=curso postgres:16`
para: Bases de datos locales que no pierden sus datos y compartir archivos con el contenedor.
ver: Contenedor, Docker Compose

## Docker Compose
alias: compose, docker-compose.yml, compose.yaml
nino: Es una **lista para preparar varias loncheras a la vez** que trabajan juntas: una con la base de datos, otra con Airflow, otra con el tablero, y todas se conocen entre sí.
que: Herramienta para definir y levantar **varios contenedores** con un archivo YAML (`compose.yaml`): servicios, imágenes, puertos, variables, volúmenes, redes y dependencias. `docker compose up -d` levanta todo; `down` lo apaga.
ejemplo:
```yaml
services:
  postgres:
    image: postgres:16
    environment: {POSTGRES_PASSWORD: curso}
    ports: ["5432:5432"]
    volumes: [pgdata:/var/lib/postgresql/data]
  metabase:
    image: metabase/metabase:v0.50.0
    ports: ["3000:3000"]
    depends_on: [postgres]
volumes: {pgdata: {}}
```
para: Entornos locales de varias piezas con un comando.
ver: Docker, Volumen de Docker

## WSL
alias: windows subsystem for linux, wsl2
nino: Es **una computadora Linux escondida adentro de tu Windows**: abres una ventana y ahí tienes Linux de verdad, sin tener que borrar Windows.
que: *Windows Subsystem for Linux*: ejecuta distribuciones Linux (Ubuntu) dentro de Windows con un kernel real (WSL2). Es la forma recomendada de hacer ingeniería de datos en Windows: bash, Python, Docker Desktop integrado y las mismas instrucciones que en Linux y macOS.
ejemplo: En PowerShell como administrador: `wsl --install -d Ubuntu`; luego, en Ubuntu: `sudo apt update && sudo apt install -y git make`.
para: Tener un entorno Linux en una computadora con Windows.
cuidado: Trabaja dentro del sistema de archivos de Linux (`~/proyectos`), no en `/mnt/c/…`: es mucho más rápido.
ver: Terminal, Docker

## Homebrew
alias: brew
nino: Es la **tienda de aplicaciones de la terminal** en Mac: escribes "brew install" y el programa queda instalado.
que: El gestor de paquetes de macOS (también disponible en Linux): instala herramientas de línea de comandos (`brew install git python@3.12 terraform awscli azure-cli duckdb`) y aplicaciones (`brew install --cask docker visual-studio-code`), y las actualiza con `brew upgrade`.
ejemplo: `brew install uv duckdb terraform && uv --version`.
para: Preparar una Mac para trabajar con datos en minutos.
ver: Terminal, PATH

## VS Code
alias: visual studio code, editor
nino: Es el **cuaderno inteligente donde escribes el código**: te pinta las palabras de colores, te avisa si te equivocaste y te sugiere cómo terminar lo que estás escribiendo.
que: Editor de código gratuito de Microsoft con extensiones para Python, SQL, dbt, Terraform, Docker, Jupyter, Git y conexión remota (WSL, SSH, Dev Containers). Incluye terminal integrada, depurador y control de Git.
ejemplo: `code .` abre la carpeta actual; la extensión Python selecciona el intérprete de `.venv`.
para: Escribir, probar y depurar código cómodamente.
ver: Terminal, Linter

## SSH
alias: secure shell, ssh-keygen, clave ssh
nino: Es un **túnel secreto** para manejar otra computadora desde la tuya, y además tener una **llave especial** que GitHub reconoce para saber que eres tú.
que: Protocolo para conectarse de forma segura a máquinas remotas (`ssh usuario@servidor`) y autenticarse con un **par de claves**: la privada (`~/.ssh/id_ed25519`, nunca se comparte) y la pública (`.pub`, se registra en el servidor o en GitHub).
ejemplo: `ssh-keygen -t ed25519 -C "ana@empresa.com"` y pegar `~/.ssh/id_ed25519.pub` en GitHub → Settings → SSH keys; luego `git clone git@github.com:empresa/repo.git`.
para: Acceso seguro a servidores y a Git sin contraseñas.
cuidado: La clave privada es como la llave de tu casa: no la copies a ningún lado ni la subas a Git.
ver: Git, Terminal

## PostgreSQL
alias: postgres, psql
nino: Es una **base de datos muy confiable y gratuita**: como un fichero gigante y ordenado donde muchas personas pueden guardar y buscar datos al mismo tiempo sin que se mezclen.
que: Base de datos relacional de código abierto, muy completa: SQL estándar, transacciones ACID, índices, JSONB, funciones de ventana, extensiones (PostGIS, TimescaleDB, pgvector). Muy usada como base operacional (OLTP) de aplicaciones y como fuente de ingesta; servicios gestionados: RDS/Aurora, Azure Database, Cloud SQL. Cliente: `psql`.
ejemplo: `psql -h localhost -U postgres -c "\dt"` · `\copy pedidos FROM 'pedidos.csv' CSV HEADER`.
para: Aplicaciones, prácticas de SQL y laboratorios locales.
ver: OLTP, SQL, DuckDB, CDC

## DuckDB
alias: duckdb
nino: DuckDB es una **calculadora de datos de bolsillo**: no hay que instalar un servidor; la abres, le das un CSV o un Parquet y le haces preguntas en SQL rapidísimo, en tu propia compu.
que: Base de datos analítica (OLAP) **embebida**, en un solo archivo o en memoria, columnar y vectorizada. Lee directamente CSV, Parquet, JSON, archivos en S3/HTTP, Delta e Iceberg; tiene API para Python, R y Node, y CLI. Este curso la usa en el navegador (DuckDB-WASM).
ejemplo:
```sql
SELECT ciudad, SUM(total) AS ventas
FROM 'data/pedidos.parquet'
GROUP BY ciudad ORDER BY ventas DESC;
```
para: Análisis local rápido, pruebas de pipelines y procesar decenas de GB sin clúster.
ver: OLAP, Parquet, SQL

## Makefile
alias: make, makefile
nino: Es una **lista de atajos con nombre**: en vez de recordar cinco comandos largos, escribes `make probar` y la computadora hace los cinco.
que: Archivo para la herramienta `make` con **objetivos** (*targets*) y los comandos que ejecuta cada uno. Se usa como "menú" del proyecto: instalar, probar, formatear, levantar servicios, desplegar. Las líneas de comandos van con tabulación.
ejemplo:
```make
.PHONY: setup test up
setup: ; uv sync
test:  ; uv run ruff check . && uv run pytest -q
up:    ; docker compose up -d
```
para: Que cualquiera del equipo use el proyecto con los mismos comandos.
ver: Terminal, CI/CD

## Log
alias: logs, logging, registro de eventos
nino: Un log es **el diario de un programa**: va anotando, con fecha y hora, qué hizo, qué le salió bien y qué le salió mal, para que después alguien pueda leer qué pasó.
que: Mensajes con marca de tiempo y nivel (`DEBUG`, `INFO`, `WARNING`, `ERROR`) que escribe un programa mientras corre. En producción se centralizan (CloudWatch, Cloud Logging, Log Analytics, los logs de las tareas de Airflow) para buscarlos y crear alertas.
ejemplo: `2026-10-29 01:10:02 WARN ingesta_pagos columna "amount" no existe; se completa con NULL`
para: Entender qué pasó en una ejecución, sobre todo cuando falló.
cuidado: Los warnings de un job que "termina bien" casi nadie los lee: lo crítico tiene que fallar o alertar. Y nunca escribas contraseñas ni datos personales en los logs.
ver: Observabilidad, Script, Job

## Despliegue
alias: deploy, desplegar, deployment
nino: Desplegar es **llevar la versión nueva del trabajo al lugar donde se usa de verdad**, como pasar una receta probada en casa a la cocina del restaurante.
que: El proceso de publicar código o infraestructura en un entorno (desarrollo, prueba, producción). En datos: subir un DAG a Airflow, `databricks bundle deploy`, `terraform apply`, `dbt build` en producción. Lo ideal es que lo haga un pipeline de CI/CD después de una revisión, no una persona desde su computadora.
ejemplo: Al aprobar el pull request, GitHub Actions ejecuta `databricks bundle deploy -t prod` y actualiza el job de producción.
para: Que los cambios lleguen a producción de forma repetible y con control.
cuidado: Un despliegue debe poder repetirse sin efectos raros y deshacerse (volver a la versión anterior) si algo sale mal.
ver: CI/CD, GitHub Actions, IaC

## YAML
alias: yml, archivo yaml
nino: YAML es **una forma ordenada de escribir una lista de ajustes** usando sangrías, como un índice de un libro con títulos y subtítulos.
que: Formato de texto para configuración basado en `clave: valor`, listas con `-` y **sangría** para anidar. Se usa en dbt (`dbt_project.yml`, `schema.yml`), Databricks Asset Bundles (`databricks.yml`), GitHub Actions, Docker Compose y Kubernetes.
ejemplo:
```yaml
targets:
  dev:
    mode: development
  prod:
    mode: production
```
para: Describir configuración que se lee fácil y se guarda en Git.
cuidado: La sangría **es** la estructura: un espacio de más o un tabulador rompen el archivo. Algunos valores se interpretan solos (`no` puede leerse como falso, `010` como número): usa comillas cuando dudes.
ver: Docker Compose, profiles.yml, Asset Bundles
