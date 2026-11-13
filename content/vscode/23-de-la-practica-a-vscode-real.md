---
titulo: De la práctica a VS Code real - instalar, Python, intérprete, idioma, sincronización y diferencias
nivel: 6 · Avanzado completo
duracion: 45
resumen: Todo lo que hiciste funciona igual en el VS Code de tu computadora. Cómo instalarlo en Windows, Mac o Linux, instalar Python y Git, las extensiones del primer día, elegir el intérprete correcto, cambiar el idioma (y los nombres de los menús en inglés), sincronizar la configuración entre computadoras, las diferencias con esta práctica y los problemas típicos de la primera semana.
objetivos: Instalar VS Code, Python y Git en tu sistema operativo | Configurar las extensiones y el intérprete del primer día | Trabajar con VS Code en español o en inglés | Sincronizar la configuración entre computadoras | Resolver los problemas típicos de la primera semana
prerrequisitos: vscode-vscode-en-el-flujo-de-trabajo
autoevaluacion: ¿Sabes instalar VS Code y Python? | ¿Sabes elegir el intérprete de un proyecto? | ¿Sabes cómo se llaman los menús en inglés? | ¿Sabes qué hacer si "python" no se reconoce en la terminal?
---

:::analogia En palabras simples
La práctica es un VS Code que ya viene armado dentro del navegador. En tu computadora lo armas una vez (VS Code, Python, Git y unas pocas extensiones) y después funciona igual que acá, con la diferencia de que todo es real: tus archivos, tu Python y tu GitHub.
:::

## Paso 1 — Instalar

| Programa | De dónde | Nota |
|---|---|---|
| **VS Code** | code.visualstudio.com | Gratis. En Windows, marca "Agregar a PATH" y "Abrir con Code" en el instalador |
| **Python** | python.org (o la Microsoft Store en Windows) | En Windows, marca **"Add python.exe to PATH"** |
| **Git** | git-scm.com | Después: `git config --global user.name "Tu Nombre"` y `user.email` |

Comprueba en una terminal nueva: `code --version`, `python --version` (en Mac/Linux puede ser `python3`) y `git --version`.

## Paso 2 — Las extensiones del primer día

Python (incluye Pylance y el depurador), Jupyter, Ruff y, si trabajas con dbt, dbt Power User. Con eso tienes todo lo de este curso.

## Paso 3 — El intérprete correcto

1. Abre la carpeta del proyecto y crea el entorno: `python -m venv .venv`.
2. **Ctrl + Shift + P** → **Python: Select Interpreter** → elige el de `.venv`.
3. La barra de estado muestra `3.12 ('.venv': venv)`; las terminales nuevas activan el entorno solas.

Si un import funciona en la terminal pero VS Code lo marca en rojo, o al revés, casi siempre es el intérprete equivocado.

## Paso 4 — Español o inglés

VS Code viene en inglés. Para español: paleta → **Configure Display Language** → **Spanish** (instala el paquete de idioma y reinicia). La mayoría de los tutoriales y las empresas lo usan en inglés, así que conviene conocer los dos:

| Español | Inglés |
|---|---|
| Archivo, Editar, Ver, Ejecutar, Terminal | File, Edit, View, Run, Terminal |
| Explorador | Explorer |
| Control de código fuente | Source Control |
| Ejecutar y depurar | Run and Debug |
| Extensiones | Extensions |
| Paleta de comandos | Command Palette |
| Configuración | Settings |
| Problemas, Salida, Consola de depuración | Problems, Output, Debug Console |
| Esquema, Línea de tiempo | Outline, Timeline |
| Punto de interrupción | Breakpoint |

## Paso 5 — Sincronizar la configuración

Ruedita (abajo a la izquierda) → **Backup and Sync Settings** (Sincronización de configuración): con tu cuenta de GitHub o Microsoft, tus ajustes, extensiones, atajos y fragmentos se copian a cualquier computadora donde inicies sesión.

## Paso 6 — Diferencias con la práctica

| En VS Code real | En la práctica |
|---|---|
| Archivos de tu disco | Archivos de la máquina simulada (se guardan en tu navegador) |
| Cualquier lenguaje y extensión del Marketplace | Las extensiones del catálogo de la práctica |
| Python, pip, Git, dbt de verdad en tu sistema | Simulados en el navegador (Python de verdad con Pyodide) |
| Vista Testing, Rename Symbol (F2), Go to Definition (F12) con Pylance | Tests y búsquedas desde la terminal y la paleta |
| Botones para resolver conflictos de merge | Se resuelven editando el texto |
| GitHub real | La [réplica de GitHub](#/github) |

## Paso 7 — Problemas típicos de la primera semana

| Problema | Causa probable | Solución |
|---|---|---|
| `python` no se reconoce | No está en el PATH | Reinstala marcando "Add to PATH", o usa `py` en Windows / `python3` en Mac |
| `No module named pandas` | Instalaste en otro Python | Activa el `.venv` y `pip install pandas`; revisa el intérprete |
| La terminal no activa el entorno (Windows) | Política de scripts de PowerShell | `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, o usa la terminal "Command Prompt" |
| `git push` pide contraseña y falla | GitHub no acepta contraseñas | `gh auth login` o un token personal |
| Todo va lento | Demasiadas extensiones | Desactiva las que no uses (o un perfil limpio) |

## Tu checklist de transición

- [ ] VS Code, Python y Git instalados y comprobados con `--version`.
- [ ] Extensiones Python, Jupyter y Ruff.
- [ ] Un proyecto con `.venv` seleccionado como intérprete.
- [ ] El proyecto 4 rehecho contra un repositorio tuyo en GitHub.
- [ ] Sincronización de configuración activada.

## ✅ Lo que lograste

- Sabes instalar y configurar VS Code real para datos.
- Trabajas con los menús en español o en inglés.
- Conoces las diferencias con la práctica y cómo resolver los problemas típicos.

:::ejercicio quiz
En Windows, `python` no se reconoce en la terminal después de instalarlo. ¿Qué es lo más probable?
- [ ] VS Code está mal instalado
- [x] Python no se agregó al PATH durante la instalación
- [ ] Falta la extensión Ruff
- [ ] Hay que reiniciar Git
:::

:::ejercicio quiz
¿Cómo se llama en inglés la vista "Control de código fuente"?
- [ ] Code Control
- [x] Source Control
- [ ] Git View
- [ ] Version Panel
:::

:::ejercicio quiz
`import pandas` falla en VS Code pero funciona en la terminal. ¿Qué revisas primero?
- [ ] Reinstalo pandas en todos lados
- [x] Que el intérprete seleccionado en VS Code sea el del .venv donde instalaste pandas
- [ ] Que el archivo tenga extensión .py
- [ ] Que esté conectado a internet
:::
