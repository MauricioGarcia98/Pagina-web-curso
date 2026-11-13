---
titulo: Un repositorio profesional - estructura, entorno virtual, dependencias, configuración y README
nivel: 6 · Avanzado completo
duracion: 50
resumen: Lo que hace que un proyecto de datos se pueda clonar y ejecutar en otra máquina el primer día. La estructura de carpetas estándar, el entorno virtual, requirements.txt o pyproject.toml, la configuración de ruff y pytest en un solo archivo, la carpeta .vscode con ajustes, extensiones recomendadas y tareas para el equipo, variables de entorno en .env y un README que lleva de cero a ejecutar.
objetivos: Organizar un repositorio de datos con una estructura estándar | Crear y usar un entorno virtual por proyecto | Declarar dependencias y configurar herramientas en pyproject.toml | Compartir la configuración de VS Code con el equipo | Manejar secretos con variables de entorno
prerrequisitos: vscode-proyecto-modelo-dbt
autoevaluacion: ¿Sabes qué carpetas tiene un proyecto ordenado? | ¿Sabes crear y activar un entorno virtual? | ¿Sabes dónde configurar ruff y pytest? | ¿Sabes por qué el .env no va a Git?
---

:::analogia En palabras simples
Un repositorio profesional es como una mochila de campamento bien armada: todo tiene su bolsillo, hay una lista de lo que lleva (dependencias) y un instructivo pegado en la tapa (README). Cualquiera la abre y sabe qué hacer, sin preguntarte.
:::

## Paso 1 — La estructura

```text
ventas_app/
├── README.md              ← de cero a ejecutar
├── pyproject.toml         ← dependencias y configuración de herramientas
├── .gitignore
├── .env.example           ← qué variables hacen falta (sin valores reales)
├── .vscode/
│   ├── settings.json      ← ajustes del proyecto
│   ├── extensions.json    ← extensiones recomendadas
│   └── tasks.json         ← "revisar y probar"
├── src/
│   └── ventas_app/
│       ├── __init__.py
│       └── limpieza.py
├── tests/
│   └── test_limpieza.py
└── datos/                 ← fuera de Git (en .gitignore)
```

| Carpeta | Regla |
|---|---|
| `src/` | El código que se importa y se reutiliza |
| `tests/` | Un archivo de tests por módulo |
| `datos/`, `salidas/` | Nunca en Git |
| `notebooks/` (si hay) | Exploración; la lógica estable va a `src/` |

## Paso 2 — El entorno virtual

En la terminal integrada, en la raíz del proyecto:

```bash
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install pandas pytest ruff
```

El prompt muestra `(.venv)`: las bibliotecas se instalan **solo** para este proyecto. VS Code real detecta el `.venv` y ofrece usarlo como intérprete. `deactivate` sale del entorno.

## Paso 3 — pyproject.toml: un solo archivo de configuración

```toml
[project]
name = "ventas_app"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = ["pandas>=2.2"]

[project.optional-dependencies]
dev = ["pytest", "ruff"]

[tool.ruff]
line-length = 100

[tool.ruff.lint]
select = ["E", "F", "I"]

[tool.pytest.ini_options]
testpaths = ["tests"]
```

`pip install -e ".[dev]"` instala el proyecto y las herramientas de desarrollo. Alternativa más simple y muy usada: `requirements.txt` (`pip freeze > requirements.txt`). Herramientas modernas como **uv** hacen todo esto más rápido (`uv init`, `uv add pandas`).

## Paso 4 — La carpeta .vscode para el equipo

```json
// .vscode/settings.json
{
  "python.defaultInterpreterPath": ".venv/bin/python",
  "editor.formatOnSave": true,
  "[python]": { "editor.defaultFormatter": "charliermarsh.ruff" },
  "python.testing.pytestEnabled": true
}
```

Junto con `extensions.json` (lección 18) y `tasks.json` (lección 19), quien clona el repositorio tiene el mismo entorno que tú en VS Code.

## Paso 5 — Secretos: variables de entorno

```text
# .env  (en .gitignore, nunca en Git)
DB_PASSWORD=la-clave-real

# .env.example  (sí va a Git: dice qué hace falta)
DB_PASSWORD=
```

El código lee `os.environ["DB_PASSWORD"]` (o usa `python-dotenv` para cargar el `.env`). Así la clave nunca queda en el código ni en la historia de Git.

## Paso 6 — El README que lleva de cero a ejecutar

```text
# ventas_app
Limpia y resume las ventas de la tienda.

## Requisitos
Python 3.11+

## Instalación
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env   # y completar los valores

## Uso
python -m ventas_app.limpieza datos/clientes.csv

## Tests
pytest && ruff check .
```

La prueba de fuego: alguien que nunca vio el proyecto lo clona, sigue el README y lo ejecuta sin preguntarte nada.

## ✅ Lo que lograste

- Conoces la estructura de un repositorio de datos ordenado.
- Usas entornos virtuales y declaras dependencias y configuración.
- Compartes la configuración de VS Code y proteges secretos.

:::ejercicio quiz
¿Por qué cada proyecto tiene su entorno virtual?
- [ ] Porque VS Code lo exige
- [x] Para que sus dependencias y versiones no choquen con las de otros proyectos
- [ ] Para que el código corra más rápido
- [ ] Para no tener que instalar Python
:::

:::ejercicio quiz
¿Qué va a Git: .env o .env.example?
- [ ] .env, con las claves reales
- [x] .env.example, con los nombres de las variables y sin valores
- [ ] Los dos
- [ ] Ninguno
:::

:::ejercicio quiz
¿Cuál es la prueba de que un README está bien?
- [ ] Que sea largo
- [x] Que alguien que no conoce el proyecto lo clone y lo ejecute siguiéndolo, sin preguntar
- [ ] Que tenga emojis
- [ ] Que explique cada función
:::
