---
titulo: VS Code en el flujo de trabajo real - notebooks, contenedores, conexiones remotas, la nube y la IA
nivel: 6 · Avanzado completo
duracion: 45
resumen: En una empresa, VS Code se conecta con todo lo demás. Notebooks de Jupyter dentro de VS Code, Dev Containers para que todos tengan el mismo entorno, desarrollo remoto por SSH y WSL, Codespaces en la nube, la extensión de Databricks para ejecutar en un clúster, GitHub Actions para correr tests en cada PR y asistentes de IA como GitHub Copilot, con sus límites.
objetivos: Abrir y ejecutar notebooks dentro de VS Code | Explicar qué resuelven los Dev Containers y Codespaces | Conocer el desarrollo remoto por SSH y WSL | Relacionar VS Code con Databricks y con la integración continua | Usar asistentes de IA de forma responsable
prerrequisitos: vscode-proyecto-profesional
autoevaluacion: ¿Sabes abrir un .ipynb en VS Code? | ¿Sabes qué problema resuelve un Dev Container? | ¿Sabes qué es la integración continua? | ¿Sabes qué verificar antes de aceptar código de una IA?
---

:::analogia En palabras simples
VS Code es el escritorio desde donde manejas máquinas que pueden estar en otro lado: un contenedor con todo instalado, un servidor de la empresa, un clúster de Databricks. Tú escribes en tu pantalla; el código corre donde tiene que correr.
:::

## Paso 1 — Notebooks dentro de VS Code

Con la extensión **Jupyter**, un `.ipynb` se abre en VS Code con celdas, como en JupyterLab:

| En JupyterLab | En VS Code |
|---|---|
| Kernel arriba a la derecha | **Seleccionar kernel** arriba a la derecha (elige el `.venv` del proyecto) |
| Shift + Enter | Shift + Enter |
| Variables con %whos | Panel **Variables** con un clic |
| Git como extensión | Git integrado, con diff de notebooks |

Ventaja: el notebook convive en el mismo editor con los `.py`, los tests y Git. Todo lo del curso [JupyterLab paso a paso](#/m/jupyterlab) aplica igual.

## Paso 2 — Dev Containers: el mismo entorno para todos

"En mi máquina funciona" se termina con un **contenedor de desarrollo**: un archivo `.devcontainer/devcontainer.json` en el repositorio describe la imagen (Python 3.12, dbt, las extensiones). VS Code abre el proyecto **dentro** de ese contenedor, con todo instalado igual para todos.

```json
{
  "name": "ventas_app",
  "image": "mcr.microsoft.com/devcontainers/python:3.12",
  "postCreateCommand": "pip install -e '.[dev]'",
  "customizations": { "vscode": { "extensions": ["ms-python.python", "charliermarsh.ruff"] } }
}
```

Necesita Docker instalado y la extensión **Dev Containers**. **GitHub Codespaces** hace lo mismo pero en la nube: abres el repositorio desde GitHub y tienes VS Code en el navegador con el contenedor listo.

## Paso 3 — Desarrollo remoto

| Extensión | Para |
|---|---|
| **Remote - SSH** | Abrir una carpeta de un servidor: editas en tu VS Code, el código corre en el servidor |
| **WSL** | En Windows, trabajar dentro de Linux (Ubuntu) con VS Code de Windows |
| **Tunnels** | Conectarte a una máquina sin abrir puertos |

## Paso 4 — VS Code y la nube de datos

- **Extensión de Databricks**: sincroniza la carpeta con el workspace y ejecuta archivos o notebooks en un clúster; combinada con **Databricks Asset Bundles** (`databricks bundle deploy`) despliega jobs desde el repositorio.
- **dbt Power User / dbt Cloud**: modelos, linaje y SQL compilado desde el editor.
- Extensiones de **Azure**, **AWS** y **Google Cloud** para explorar recursos y desplegar.

Puedes ver ese otro lado en las réplicas de [Databricks](#/databricks) y [GitHub](#/github) del curso.

## Paso 5 — Integración continua: los tests corren solos

Un archivo `.github/workflows/tests.yml` hace que GitHub ejecute `ruff check` y `pytest` en cada pull request. Si fallan, el PR muestra una cruz roja y no se fusiona. Es la misma rutina de "revisar y probar" que haces en VS Code, pero automática y para todo el equipo.

## Paso 6 — Asistentes de IA (GitHub Copilot y otros)

Sugieren código mientras escribes y responden preguntas sobre el proyecto en un chat. Bien usados, ahorran tiempo en lo repetitivo.

:::cuidado La responsabilidad es tuya
Lo que sugiere la IA puede estar mal, usar funciones que no existen o tener errores sutiles (como el `>=` del proyecto 3). Reglas: entiende cada línea antes de aceptarla, prueba con tests, nunca pegues datos de clientes ni claves en un chat externo, y respeta la política de tu empresa sobre qué herramientas se pueden usar.
:::

## ✅ Lo que lograste

- Sabes trabajar con notebooks en VS Code.
- Conoces Dev Containers, Codespaces y el desarrollo remoto.
- Relacionas VS Code con Databricks, la integración continua y la IA, con criterio.

:::ejercicio quiz
¿Qué problema resuelve un Dev Container?
- [ ] Que VS Code sea más rápido
- [x] Que todo el equipo trabaje con el mismo entorno (versiones, herramientas, extensiones)
- [ ] Que no haga falta Git
- [ ] Que el código no tenga errores
:::

:::ejercicio quiz
¿Qué hace un workflow de GitHub Actions con ruff y pytest?
- [ ] Formatea tu código en tu computadora
- [x] Ejecuta las revisiones y los tests automáticamente en cada pull request
- [ ] Reemplaza la revisión de código
- [ ] Instala VS Code
:::

:::ejercicio quiz
Copilot te sugiere una función entera. ¿Qué haces?
- [ ] La acepto: la IA no se equivoca
- [x] La leo, la entiendo, la pruebo con tests y recién ahí la dejo
- [ ] La rechazo siempre
- [ ] Le pego los datos de clientes para que la mejore
:::
