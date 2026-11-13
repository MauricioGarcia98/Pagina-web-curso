---
titulo: De la práctica al JupyterLab real - instalar, entornos, kernels, paquetes y extensiones
nivel: 6 · Avanzado completo
duracion: 50
resumen: Todo lo que hiciste funciona igual en un JupyterLab instalado. Lo que cambia es lo que hay alrededor - instalarlo, crear un entorno por proyecto, elegir el kernel correcto, instalar paquetes sin romper nada, fijar versiones con requirements.txt, la terminal integrada, extensiones útiles y las diferencias con esta práctica. Más cómo seguir en Colab o VS Code si no puedes instalar nada.
objetivos: Instalar JupyterLab con pip o conda y abrirlo | Crear un entorno virtual por proyecto y registrarlo como kernel | Instalar paquetes desde el notebook con %pip en el entorno correcto | Fijar versiones con requirements.txt | Conocer las diferencias entre la práctica y el JupyterLab real
prerrequisitos: jupyterlab-jupyter-en-el-flujo-de-datos
autoevaluacion: ¿Sabes instalar y abrir JupyterLab? | ¿Sabes para qué sirve un entorno virtual? | ¿Sabes por qué %pip y no !pip? | ¿Sabes qué no puede hacer esta práctica?
---

:::analogia En palabras simples
La práctica es un JupyterLab "llave en mano": ya trae Python, pandas y matplotlib. En tu computadora armas la cocina tú: instalas Python, creas un espacio separado por proyecto (entorno) para que las versiones de un proyecto no rompan otro, y eliges qué Python usa cada notebook (kernel).
:::

## Paso 1 — Opciones para trabajar con Jupyter real

| Opción | Instalación | Cuándo |
|---|---|---|
| **Google Colab** | Ninguna (navegador, cuenta de Google) | Para practicar ya, sin instalar nada |
| **JupyterLite** (jupyter.org/try-jupyter) | Ninguna | Probar en el navegador, como esta práctica |
| **pip + entorno virtual** | Python instalado | Lo más liviano y estándar |
| **Anaconda / Miniconda** | Un instalador | Si vas a usar muchas bibliotecas científicas |
| **VS Code** con la extensión Jupyter | VS Code + Python | Si ya programas en VS Code |
| **JupyterHub de la empresa** | La da el equipo de plataforma | En el trabajo |

## Paso 2 — Instalar con pip y un entorno virtual

En la terminal (en Windows, PowerShell; en Mac/Linux, Terminal), dentro de la carpeta de tu proyecto:

```bash
python -m venv .venv
# Windows:      .venv\Scripts\activate
# Mac / Linux:  source .venv/bin/activate
pip install jupyterlab pandas matplotlib
jupyter lab
```

Se abre JupyterLab en el navegador (en `http://localhost:8888`), con la carpeta del proyecto en el explorador. La terminal tiene que quedar abierta mientras lo uses; para cerrarlo, **File → Shut Down** o Ctrl + C en la terminal.

:::tip Por qué un entorno por proyecto
El proyecto A necesita pandas 2 y el B pandas 3. Si instalas todo en el mismo Python, uno de los dos se rompe. Un entorno virtual (`.venv`) es una instalación de Python aparte para cada proyecto. Practícalo en el módulo [Desde tu computadora](#/m/local).
:::

## Paso 3 — Kernels: qué Python usa el notebook

Arriba a la derecha del notebook ves el kernel (**Python 3 (ipykernel)**). Si tienes varios entornos, regístralos para elegirlos desde JupyterLab:

```bash
pip install ipykernel
python -m ipykernel install --user --name analisis_ventas --display-name "Python (analisis_ventas)"
```

Después: **Kernel → Change Kernel…** y eliges el del proyecto.

## Paso 4 — Instalar paquetes desde el notebook

```python norun
%pip install seaborn
```

Usa `%pip` (magic) y no `!pip`: `%pip` instala en el **mismo entorno del kernel** que está usando el notebook; `!pip` puede instalar en otro Python y el `import` sigue fallando. Después de instalar, a veces hay que reiniciar el kernel.

En esta práctica, `%pip` muestra un aviso: corre en tu navegador y ya trae pandas, numpy y matplotlib.

## Paso 5 — Fijar versiones: requirements.txt

```bash
pip freeze > requirements.txt          # guarda las versiones exactas
pip install -r requirements.txt        # otra persona recrea el mismo entorno
```

Junto con el notebook, el `requirements.txt` es lo que hace que tu análisis corra igual en otra computadora dentro de un año. (Con conda: `environment.yml`.)

## Paso 6 — Lo que tiene el JupyterLab real y la práctica no

| En JupyterLab real | En esta práctica |
|---|---|
| **Terminal** integrada (Launcher → Terminal) | No: usa la [terminal de práctica](#/lab/terminal) |
| Instalar cualquier paquete con `%pip` | Solo pandas, numpy, matplotlib y la biblioteca estándar |
| Leer archivos de tu disco, bases de datos y APIs | Solo los archivos del explorador (y los que subas) |
| Conectarse a bases de datos (SQLAlchemy, conectores) | No |
| Varios kernels (Python, R, Julia, SQL) | Solo Python |
| Extensiones | No |
| Velocidad y memoria de tu computadora | Las del navegador (Pyodide) |

## Paso 7 — Extensiones útiles

| Extensión | Para |
|---|---|
| `jupyterlab-git` | Git con botones dentro de JupyterLab |
| `jupyterlab-lsp` | Autocompletado y errores mientras escribes, como en VS Code |
| `jupytext` | Guardar el notebook también como `.py` (mejor para Git) |
| `nbdime` | Ver diferencias entre versiones de un notebook |
| Jupyter AI | Asistente de IA dentro de JupyterLab (verifica siempre lo que propone) |

Se instalan con `pip install nombre` y aparecen al reiniciar JupyterLab.

## Paso 8 — Atajos y configuración

**Settings → Settings Editor** (o **Help → Show Keyboard Shortcuts**) muestra todos los atajos y permite cambiarlos. Los de este curso (Shift + Enter, A, B, M, Y, D D, Z, I I, 0 0) son los mismos que en JupyterLab real.

## Tu checklist de transición

- [ ] Abre un proyecto del curso en Colab o JupyterLab real y ejecútalo de punta a punta.
- [ ] Crea un entorno virtual para él y regístralo como kernel.
- [ ] Genera su `requirements.txt`.
- [ ] Exporta a HTML (File → Save and Export Notebook As → HTML) y ábrelo en el navegador.

## ✅ Lo que lograste

- Sabes instalar JupyterLab y trabajar con entornos y kernels.
- Instalas paquetes en el entorno correcto y fijas versiones.
- Conoces las diferencias con la práctica y cómo seguir.

:::ejercicio quiz
¿Por qué conviene un entorno virtual por proyecto?
- [ ] Porque JupyterLab no funciona sin él
- [x] Para que las versiones de las bibliotecas de un proyecto no rompan otro
- [ ] Porque es más rápido
- [ ] Para no instalar Python
:::

:::ejercicio quiz
Instalas un paquete con `!pip install x` pero `import x` sigue fallando. ¿Qué pasó probablemente?
- [ ] El paquete no existe
- [x] Se instaló en otro Python que no es el del kernel: hay que usar `%pip install x`
- [ ] Hay que renombrar el notebook
- [ ] Falta internet
:::

:::ejercicio quiz
¿Qué archivo permite que otra persona recree tu entorno con las mismas versiones?
- [ ] El .ipynb
- [ ] .venv
- [x] requirements.txt
- [ ] README.md
:::
