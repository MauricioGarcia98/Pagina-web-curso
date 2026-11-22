---
titulo: El código en Azure DevOps - el script, sus tests, el pipeline y el pull request
nivel: Intermedio
duracion: 45
resumen: Escribes el script que sube los pedidos a S3, una validación con tests y el pipeline que los corre en cada cambio. Todo vive en Azure Repos, con la clave de la story en cada commit. Después proteges main y haces entrar un cambio por pull request, con revisión, como en cualquier equipo serio.
objetivos: Crear un repositorio y subirlo a Azure Repos desde la terminal | Escribir un script de carga parametrizado y una validación con pytest | Crear un pipeline YAML y llevarlo a verde leyendo sus logs | Proteger main y completar un pull request revisado
prerrequisitos: proyecto-equipo-el-pedido-en-jira
autoevaluacion: ¿Sabes qué hace cada línea del script de carga? | ¿Sabes por qué el script recibe la fecha como argumento? | ¿Sabes qué dispara el pipeline? | ¿Sabes qué exige la política de rama en main?
---

:::escenario Lunes, 11:00
La story está en *In Progress*. Martín te recuerda la regla del equipo: *"Nada entra a main sin pull request y sin el pipeline en verde."*
:::

```diagrama
titulo: Del código en tu terminal a main
nodo local: Tu terminal | icono=terminal | col=0 | fila=0 | sub=el repositorio lago-pedidos
nodo remoto: Azure Repos | icono=git | col=1 | fila=0 | color=naranja | sub=dev.azure.com/…/_git/lago-pedidos
nodo pipe: Pipeline | icono=engranaje | col=2 | fila=0 | color=azul | sub=pip install + pytest
nodo rama: Rama TA-12-… | icono=flujo | col=1 | fila=1 | color=violeta | sub=un cambio nuevo
nodo pr: Pull request | icono=mensaje | col=2 | fila=1 | color=verde | sub=revisión + build en verde
flecha local -> remoto: git push | paso=1 | explica=Creas el repositorio en tu terminal, haces el primer commit nombrando TA-12 y lo subes con git push a Azure Repos.
flecha remoto -> pipe: trigger: main | paso=2 | explica=El pipeline se define en azure-pipelines.yml dentro del repositorio. Con trigger main, corre solo en cada push a main.
flecha local -> rama: git checkout -b | paso=3 | explica=Con main protegido, cada cambio nuevo se hace en una rama que nombra la story (TA-12-readme).
flecha rama -> pr: git push y New pull request | paso=4 | explica=Subes la rama y abres un pull request hacia main, enlazado al trabajo.
flecha pr -> remoto: Complete | paso=5 | explica=Cuando un compañero aprueba y el pipeline está en verde, Complete une la rama a main. Después, git pull en tu terminal trae el merge.
```

## 1. El repositorio y el script

Abre la [terminal del curso](#/lab/terminal) y crea el proyecto:

```bash
mkdir -p ~/lago-pedidos && cd ~/lago-pedidos
git init
git branch -M main
```

Si es la primera vez que usas git en esta terminal, dile quién eres (aparece como autor de cada commit):

```bash
git config --global user.name "Tu Nombre"
git config --global user.email "tu@correo.com"
```

El script recibe la **fecha de carga** y el **archivo** como argumentos, con valores por defecto. Así se puede volver a cargar un día puntual sin tocar el código:

```bash
cat > cargar_pedidos.sh << 'EOF'
#!/usr/bin/env bash
# Sube la exportación de pedidos a la capa raw del lago, en una carpeta por fecha de carga.
# Uso: bash cargar_pedidos.sh [AAAA-MM-DD] [archivo.csv]
set -e
BUCKET="${BUCKET:-tienda-andina-lago-equipo}"
FECHA="${1:-$(date +%F)}"
ARCHIVO="${2:-$HOME/datos/generados/ecommerce/pedidos.csv}"
echo "Subiendo $ARCHIVO a s3://$BUCKET/raw/pedidos/fecha_carga=$FECHA/"
aws s3 cp "$ARCHIVO" "s3://$BUCKET/raw/pedidos/fecha_carga=$FECHA/pedidos.csv"
EOF
```

| Línea | Para qué |
|---|---|
| `set -e` | Si un comando falla, el script se detiene (no sigue como si nada) |
| `BUCKET="${BUCKET:-…}"` | Usa la variable `BUCKET` si existe; si no, el bucket por defecto. Sirve para apuntar a otro entorno sin editar el script |
| `FECHA="${1:-$(date +%F)}"` | El primer argumento, o la fecha de hoy (`2026-11-22`) si no se pasa |
| `fecha_carga=$FECHA/` | La carpeta con forma `columna=valor`: Glue y Athena la reconocen como **partición** |

## 2. La validación y sus tests

Antes de subir un archivo, conviene comprobar que trae las columnas esperadas. Una función chica, con tests:

```bash
cat > validar.py << 'EOF'
COLUMNAS = ["pedido_id", "cliente_id", "fecha_pedido", "canal", "estado", "metodo_pago"]

def encabezado_valido(linea):
    """True si la primera línea del CSV tiene exactamente las columnas esperadas."""
    return [c.strip() for c in linea.strip().split(",")] == COLUMNAS
EOF
mkdir -p tests
cat > tests/test_validar.py << 'EOF'
from validar import encabezado_valido

def test_encabezado_correcto():
    assert encabezado_valido("pedido_id,cliente_id,fecha_pedido,canal,estado,metodo_pago")

def test_falta_una_columna():
    assert not encabezado_valido("pedido_id,cliente_id,fecha_pedido,canal")
EOF
printf "pytest\n" > requirements.txt
```

## 3. Subirlo a Azure Repos

```bash
git add .
git commit -m "TA-12 Script de carga a S3 y validación del encabezado"
git remote add origin https://dev.azure.com/academia/tienda-andina/_git/lago-pedidos
git push -u origin main
```

Cambia `TA-12` por tu clave. Abre [Azure DevOps → Repos](#/azure-devops/tienda-andina/repos?repo=lago-pedidos): ahí están tus archivos y el commit.

## 4. El pipeline

**Pipelines → New pipeline → Azure Repos Git → lago-pedidos → Python package → Save and run**. El asistente agrega `azure-pipelines.yml` al repositorio y lo ejecuta:

- **Install dependencies** instala lo que dice `requirements.txt`.
- **Run tests** corre `pytest`: tus dos tests pasan.

Si un paso queda en rojo, ábrelo y **lee el log**. Casi siempre falta un archivo (`requirements.txt`, o los tests en `tests/test_*.py`). Súbelo con otro commit y el push vuelve a disparar el pipeline.

Como el asistente hizo un commit en Azure Repos, trae ese cambio a tu terminal:

```bash
git pull
```

## 5. Proteger main y entrar por pull request

1. **Repos → Branches → main → Add branch policies**: desde ahora, a main se entra con pull request, 1 revisor y la build en verde.
2. En la terminal, un cambio en una rama que nombra la story:

```bash
git checkout -b TA-12-readme
printf "# lago-pedidos\n\nCarga diaria de pedidos a S3 (raw/pedidos/fecha_carga=AAAA-MM-DD).\n\n    bash cargar_pedidos.sh 2026-11-21\n" > README.md
git add README.md
git commit -m "TA-12 README con el uso del script"
git push -u origin TA-12-readme
```

3. **Repos → Pull requests → New pull request**: de `TA-12-readme` a `main`, con un título claro. **Pedir revisión a Camila** y esperar su aprobación. Cuando el check esté en verde, **Complete**.
4. Vuelve a main en tu terminal y trae el merge:

```bash
git checkout main
git pull
```

:::real En tu computadora y en la web real
En tu computadora, esto se hace igual en la **Terminal** (macOS), **Ubuntu/WSL** o **Git Bash** (Windows), con `git` y la **AWS CLI** instalados. En **dev.azure.com** de tu empresa:

- la primera vez que haces `git push`, Git Credential Manager abre el navegador para que entres con tu cuenta de Microsoft (no se escriben contraseñas en la URL);
- el pipeline corre en un agente de Microsoft, y para subir a AWS usaría una *service connection* de AWS (sin claves en el YAML).

Si tu equipo usa GitHub en vez de Azure Repos, los pasos son los mismos con GitHub Actions y *branch protection rules*.
:::

:::capturas Capturas para tu portafolio
Guárdalas en `docs/capturas/` del repositorio y úsalas en el README.

- `02-repo.png`: Azure Repos con los archivos (`cargar_pedidos.sh`, `validar.py`, `tests/`, `azure-pipelines.yml`).
- `02-pipeline.png`: la ejecución del pipeline en verde, con el paso *Run tests* abierto.
- `02-pr.png`: el pull request completado, con la aprobación y el check en verde.

Antes de publicar, tapa la URL de la organización y los correos si son de tu trabajo.
:::

:::errores
- **Escribir la fecha fija dentro del script**: para recargar otro día hay que editar código. La fecha va como argumento.
- **Commits sin la clave de la story**: en tres meses nadie sabe por qué se hizo ese cambio.
- **Subir directo a main** "porque es un cambio chiquito": con la política de rama, ni siquiera se puede.
- **Ignorar el log del pipeline** y volver a ejecutarlo esperando que pase: el log dice qué falta.
:::

## Ejercicios

:::ejercicio quiz
¿Qué hace `FECHA="${1:-$(date +%F)}"` en el script?
- [ ] Siempre usa la fecha de hoy
- [x] Usa el primer argumento del script; si no se pasa, la fecha de hoy
- [ ] Pide la fecha por teclado
- [ ] Borra la variable FECHA
:::

:::ejercicio quiz
¿Por qué la carpeta se llama `fecha_carga=2026-11-21` y no solo `2026-11-21`?
- [ ] Por estética
- [x] Porque con la forma columna=valor, Glue y Athena la reconocen como partición
- [ ] Porque S3 no acepta nombres que empiecen con números
- [ ] Porque lo exige Azure DevOps
:::

:::ejercicio quiz
El pipeline falla en *Run tests* con "no tests ran". ¿Qué falta?
- [ ] Más memoria en el agente
- [x] Archivos de test con funciones test_… en tests/test_*.py
- [ ] Un bucket de S3
- [ ] Una política de rama
:::

## Resumen

- El script de carga es **parametrizado** (fecha y archivo como argumentos) y escribe en carpetas `fecha_carga=…`.
- Una validación chica con **tests** y un **pipeline** que los corre en cada push evitan subir archivos rotos.
- La **clave de la story** va en cada commit y en el nombre de la rama.
- Con la **política de rama**, a main se entra por pull request revisado y con la build en verde.
