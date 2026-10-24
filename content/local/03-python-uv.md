---
titulo: "Python profesional en tu máquina: uv, entornos virtuales, ruff y pytest"
nivel: Intermedio
duracion: 55
resumen: Instala Python y gestiona tus proyectos con uv. Entiende por qué cada proyecto necesita su propio entorno virtual, cómo se declaran y bloquean las dependencias, cómo se organiza un proyecto de datos, y cómo se revisa y se prueba el código con ruff y pytest. También el camino clásico con venv y pip.
objetivos: Explicar qué problema resuelve un entorno virtual y qué es un archivo de bloqueo | Crear un proyecto con uv, agregar dependencias de ejecución y de desarrollo y ejecutar código con uv run | Crear y activar un entorno virtual con python -m venv y pip, en Linux, macOS y Windows | Organizar un proyecto de datos con src/, tests/ y configuración en .env | Revisar el código con ruff y probarlo con pytest
prerrequisitos: local-vscode-git-github | python-funciones
autoevaluacion: ¿Sabes por qué no se instalan paquetes en el Python del sistema? | ¿Sabes qué diferencia hay entre pyproject.toml y uv.lock? | ¿Sabes activar un entorno virtual en tu sistema operativo? | ¿Sabes dónde van las contraseñas de un proyecto y cómo se leen? | ¿Puedes correr ruff y pytest en tu proyecto?
---

:::escenario "En mi máquina funciona"
Un compañero te pasa un script de ingesta. Lo ejecutas y falla: `AttributeError: 'DataFrame' object has no attribute 'append'`. Él usa pandas 1.5; tú instalaste pandas 2.2 la semana pasada para otro proyecto, y en la versión 2 ese método ya no existe. Martín suspira:

> "Por eso cada proyecto tiene su entorno y sus versiones bloqueadas. Te muestro cómo lo hacemos con uv."
:::

## El problema: un Python para todo

Si instalas paquetes en el Python del sistema, **todos** tus proyectos comparten las mismas versiones. El proyecto A necesita pandas 1.5, el B necesita pandas 2.2: imposible. Además, en Linux y macOS el sistema operativo usa su propio Python, y romperlo rompe herramientas del sistema (por eso las versiones nuevas de Ubuntu directamente prohíben `pip install` global).

La solución es un **entorno virtual**: una carpeta (normalmente `.venv/` dentro del proyecto) con su propio Python y sus propios paquetes. Cada proyecto tiene el suyo.

```diagrama
titulo: Un entorno virtual por proyecto: cada uno con sus versiones
nodo sis: Python del sistema | icono=servidor | col=1 | fila=0 | color=gris | sub=no se toca
nodo a: proyecto-ingesta/.venv | icono=cubo | col=0 | fila=1 | color=azul | sub=pandas 1.5\nrequests 2.31
nodo b: proyecto-dbt/.venv | icono=cubo | col=1 | fila=1 | color=verde | sub=dbt-duckdb 1.8\npandas 2.2
nodo c: proyecto-spark/.venv | icono=cubo | col=2 | fila=1 | color=naranja | sub=pyspark 3.5\npandas 2.2
flecha sis -> a | estilo=punteada
flecha sis -> b | estilo=punteada
flecha sis -> c | estilo=punteada
```

Dos archivos describen las dependencias:

| Archivo | Qué dice | Ejemplo |
|---|---|---|
| `pyproject.toml` | Qué necesita el proyecto, con rangos | `pandas>=2.2` |
| `uv.lock` (o `requirements.txt` con `==`) | La versión **exacta** de cada paquete, incluidas las dependencias de las dependencias | `pandas==2.2.3`, `numpy==2.1.3`… |

El archivo de bloqueo (*lock file*) es lo que hace que tu entorno sea **idéntico** al de tu compañero y al del servidor. Los dos van a Git.

## uv: la herramienta recomendada

**uv** (de Astral, los creadores de ruff) reemplaza a `pip`, `venv`, `pip-tools` y `pyenv` con un solo programa, y es 10 a 100 veces más rápido.

**Instalar uv:**

```bash norun
# Linux, WSL y macOS
curl -LsSf https://astral.sh/uv/install.sh | sh
# o en macOS
brew install uv

uv --version
```

**Instalar Python** (uv descarga la versión que pidas, sin tocar la del sistema):

```bash norun
uv python install 3.12
```

### Un proyecto nuevo, paso a paso

```bash norun
uv init ingesta-rapido            # crea la carpeta con pyproject.toml, main.py, .python-version
cd ingesta-rapido
uv add pandas duckdb requests     # dependencias del proyecto (crea .venv y uv.lock)
uv add --dev ruff pytest          # herramientas solo para desarrollar
uv run python main.py             # ejecuta dentro del entorno, sin activarlo
```

Así queda el `pyproject.toml`:

```toml
[project]
name = "ingesta-rapido"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = [
    "duckdb>=1.1.3",
    "pandas>=2.2.3",
    "requests>=2.32.3",
]

[dependency-groups]
dev = [
    "pytest>=8.3.3",
    "ruff>=0.8.0",
]
```

| Comando | Qué hace |
|---|---|
| `uv add paquete` | Agrega una dependencia, la instala y actualiza el lock |
| `uv add --dev paquete` | Igual, pero solo para desarrollo |
| `uv remove paquete` | La quita |
| `uv sync` | Deja `.venv` exactamente como dice `uv.lock` (lo primero que haces al clonar un repo) |
| `uv run comando` | Ejecuta el comando dentro del entorno |
| `uv lock --upgrade` | Actualiza las versiones bloqueadas (en una rama, y después corres las pruebas) |

Cuando clones el proyecto en otra computadora: `git clone …`, `cd`, `uv sync`, y listo.

## El camino clásico: venv y pip

Lo vas a encontrar en muchos proyectos (y en entrevistas). Es lo mismo, paso a paso:

```bash norun
python3 -m venv .venv                 # crea el entorno
source .venv/bin/activate             # lo activa (Linux, WSL, macOS)
pip install pandas duckdb             # instala dentro del entorno
pip freeze > requirements.txt         # "bloquea" las versiones
deactivate                            # sale del entorno
```

En **Windows sin WSL** (PowerShell), la activación es `.venv\Scripts\Activate.ps1`. Cuando el entorno está activo, la terminal muestra su nombre al principio: `(.venv) ana@laptop:~/proyecto$`. Prueba en la terminal del curso: `python -m venv .venv` y `source .venv/bin/activate`.

| | uv | venv + pip |
|---|---|---|
| Crear el entorno | Automático | `python -m venv .venv` |
| Instalar | `uv add x` | `pip install x` (y acordarse de actualizar `requirements.txt`) |
| Bloqueo | `uv.lock` automático | `pip freeze` a mano |
| Versión de Python | `uv python install 3.12` | La que tengas instalada |
| Velocidad | Muy rápido | Lento en proyectos grandes |

## La estructura de un proyecto de datos

```text
ingesta-rapido/
├── pyproject.toml
├── uv.lock
├── .python-version
├── .env                  ← secretos locales (en .gitignore)
├── .env.example          ← las mismas claves, sin valores (sí va a Git)
├── README.md
├── src/
│   └── ingesta_rapido/
│       ├── __init__.py
│       ├── extraer.py
│       └── reglas.py     ← validar_pedido() y compañía
└── tests/
    └── test_reglas.py
```

### Los secretos van en `.env`, nunca en el código

```text
# .env  (NO va a Git)
POSTGRES_URL=postgresql://rapido:clave-local@localhost:5432/operaciones
API_TOKEN=abc123
```

```python norun
import os
from dotenv import load_dotenv   # uv add python-dotenv

load_dotenv()                    # lee .env y lo pone en las variables de entorno
url = os.environ["POSTGRES_URL"] # falla con un error claro si falta
```

En producción no hay `.env`: las mismas variables las pone la plataforma (Airflow, el contenedor, la CI) leyéndolas de un gestor de secretos. El código no cambia.

## ruff y pytest: código revisado y probado

**ruff** encuentra errores y aplica el formato estándar:

```bash norun
uv run ruff check .          # errores y malas prácticas (import sin usar, variable indefinida…)
uv run ruff check . --fix    # corrige lo que puede
uv run ruff format .         # formato estándar (como black)
```

**pytest** corre las pruebas: archivos `test_*.py` con funciones `test_*` que usan `assert`.

```python norun
# tests/test_reglas.py
from ingesta_rapido.reglas import validar_pedido

def test_pedido_correcto_no_tiene_errores():
    p = {"estado": "entregado", "subtotal": 20, "creado": "2024-03-01 20:00:00",
         "aceptado": "2024-03-01 20:03:00", "retirado": "2024-03-01 20:20:00", "entregado": "2024-03-01 20:41:00"}
    assert validar_pedido(p) == []

def test_tiempos_desordenados():
    p = {"estado": "entregado", "subtotal": 20, "creado": "2024-08-14 20:00:00",
         "aceptado": "2024-08-14 20:25:00", "retirado": "2024-08-14 20:22:00", "entregado": "2024-08-14 20:40:00"}
    assert validar_pedido(p) == ["tiempos_desordenados"]
```

```text
$ uv run pytest -q
..                                                                   [100%]
2 passed in 0.03s
```

**En VS Code**: `Ctrl+Shift+P` → "Python: Select Interpreter" → elige `.venv`. Desde ahí, el editor usa los paquetes del proyecto y la pestaña Testing muestra las pruebas.

<!-- estandar:errores -->
:::errores
- **`ModuleNotFoundError: No module named 'pandas'`** aunque "lo instalaste": lo instalaste en otro entorno. Usa `uv run`, o activa `.venv`, o elige el intérprete correcto en VS Code.
- **`error: externally-managed-environment`** al hacer `pip install` en Ubuntu 24.04 o macOS: el sistema no te deja instalar en su Python. Es una protección: usa un entorno virtual.
- **Subir `.venv/` a Git**: son cientos de MB y no sirven en otra máquina. Va en `.gitignore`; lo que se sube es `pyproject.toml` y `uv.lock`.
- **`requirements.txt` sin versiones** (`pandas`): cada instalación trae la última y un día el proyecto deja de funcionar. Bloquea versiones.
- **Un `.env` sin `.env.example`**: el compañero que clona el repo no sabe qué variables necesita.
:::

<!-- estandar:trabajo -->
:::trabajo
- En los equipos de datos, uv se volvió el estándar en 2024–2025; vas a ver también **Poetry** y **conda** (este último, frecuente en ciencia de datos por los paquetes con dependencias de C).
- La CI corre `uv sync --frozen` (falla si el lock no coincide con el pyproject), `ruff check`, `ruff format --check` y `pytest` en cada pull request.
- Las imágenes de Docker de los pipelines se construyen desde el mismo `uv.lock`: así lo que probaste es exactamente lo que corre en producción.
:::

## Ejercicios

:::ejercicio quiz
¿Qué archivo garantiza que tu compañero instale exactamente las mismas versiones que tú?

- [ ] `pyproject.toml`
- [x] `uv.lock` (o un `requirements.txt` con versiones exactas)
- [ ] `.python-version`
- [ ] `.env`
:::

:::ejercicio quiz
Clonaste un proyecto que usa uv. ¿Cuál es el primer comando para tener el entorno listo?

- [ ] `uv init`
- [x] `uv sync`
- [ ] `pip install uv.lock`
- [ ] `uv add`
:::

:::ejercicio quiz
¿Dónde guardas la contraseña de la base de datos local de un proyecto?

- [ ] En el código, en una constante
- [ ] En `pyproject.toml`
- [x] En un archivo `.env` que está en `.gitignore`, y se lee con variables de entorno
- [ ] En el README
:::

:::ejercicio cli
Crea un proyecto nuevo de Python con uv llamado `ingesta-rapido`.
```respuesta
uv init ingesta-rapido
```
:::

:::ejercicio cli
Estás dentro del proyecto. Agrega `pandas` y `duckdb` como dependencias.
```respuesta
uv add pandas duckdb
uv add duckdb pandas
```
```setup
uv init ingesta
cd ingesta
```
:::

:::ejercicio cli
En un proyecto sin uv, crea un entorno virtual en la carpeta `.venv` con el módulo `venv` de Python.
```respuesta
python3? -m venv .venv
```
```solucion
python -m venv .venv
```
```setup
mkdir -p ~/proyectos/clasico
cd ~/proyectos/clasico
```
:::

:::ejercicio cli
El entorno `.venv` ya existe. Actívalo (Linux, WSL o macOS).
```respuesta
source .venv/bin/activate
\. .venv/bin/activate
```
```solucion
source .venv/bin/activate
```
```setup
mkdir -p ~/proyectos/clasico2
cd ~/proyectos/clasico2
python -m venv .venv
```
:::
