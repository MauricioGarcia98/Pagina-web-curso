---
titulo: JupyterLab desde cero - qué es un notebook y cómo se lee la pantalla
nivel: 1 · Básico
duracion: 30
resumen: Primer contacto con JupyterLab, la herramienta donde se analizan datos con Python celda por celda. Qué es un notebook y para qué lo usa un equipo de datos, las seis zonas de la pantalla (menú, barra lateral, explorador de archivos, pestañas, barra del notebook y barra de estado) y el Launcher para crear notebooks y archivos.
objetivos: Explicar qué es un notebook y por qué se usa en datos | Reconocer las seis zonas de la pantalla de JupyterLab | Abrir el Launcher y saber qué crea cada tarjeta | Distinguir un notebook (.ipynb) de un archivo de Python (.py)
prerrequisitos: fundamentos-bienvenida
autoevaluacion: ¿Sabes qué es un notebook? | ¿Sabes dónde ver los archivos de la carpeta? | ¿Sabes crear un notebook desde el Launcher? | ¿Sabes qué diferencia hay entre .ipynb y .py?
---

:::tip Cómo usar este curso
Abre [JupyterLab de práctica](#/jupyter) en otra pestaña y haz cada paso mientras lees. Las capturas son de esa misma app. Ejecuta **Python de verdad** en tu navegador (con pandas, numpy y matplotlib), y todo se guarda en tu navegador.

El curso tiene **24 lecciones en 6 niveles**. Cada nivel termina con un **proyecto real**, y cada proyecto te da menos ayuda que el anterior: el primero va paso a paso; el último es un pedido de trabajo con entregables y rúbrica. Si nunca programaste en Python, haz antes el módulo [Python](#/m/python) hasta variables y listas; aquí lo usamos desde lo más simple.
:::

:::analogia En palabras simples
Un notebook es un cuaderno de laboratorio: tiene bloques de texto que explican, bloques de código que hacen cuentas, y debajo de cada bloque de código queda escrito el resultado. Lo puedes leer de arriba abajo como un informe que además se puede volver a ejecutar.
:::

## Paso 1 — Para qué sirve JupyterLab

| Se usa para | Ejemplo |
|---|---|
| Explorar datos nuevos | "¿Qué tiene este CSV? ¿Hay nulos? ¿Cuántas filas?" |
| Analizar y graficar | "Pedidos por mes, por canal, por país" |
| Probar código antes de llevarlo a un pipeline | Una limpieza que después irá a Databricks o Airflow |
| Explicar un análisis | Texto, código y gráficos juntos en un mismo archivo |

Los notebooks de Databricks, Microsoft Fabric, Google Colab y VS Code funcionan con la misma idea: lo que aprendas acá lo usas en todos.

## Paso 2 — Abre JupyterLab y mira la pantalla

1. Entra a [JupyterLab de práctica](#/jupyter).
2. Se abre el notebook **Bienvenida.ipynb**. No ejecutes nada todavía.

```captura
archivo: jupyter/01-pantalla.webp
texto: JupyterLab recién abierto, con el notebook de bienvenida
```

## Paso 3 — Las seis zonas

```captura
archivo: jupyter/01-zonas.webp
texto: Las seis zonas de la pantalla, numeradas
```

| # | Zona | Para qué sirve |
|---|---|---|
| 1 | **Barra de menú** (File, Edit, View, Run, Kernel, Tabs, Settings, Help) | Todas las acciones; las más importantes están en **Run** y **Kernel** |
| 2 | **Barra lateral izquierda** | Cambia el panel: archivos, kernels en ejecución, tabla de contenidos |
| 3 | **Explorador de archivos** | La carpeta de trabajo: notebooks, scripts y la carpeta `datos/` |
| 4 | **Pestañas** | Cada archivo abierto es una pestaña, como en un navegador |
| 5 | **Barra del notebook** | Guardar, agregar celda, cortar, ejecutar, detener, reiniciar, tipo de celda |
| 6 | **Barra de estado** | El kernel (Python 3) y si está ocupado, el modo (Command/Edit) y la posición del cursor |

:::tip Arriba a la derecha: el kernel
En la barra del notebook, a la derecha, dice **Python 3 (ipykernel)** y hay un círculo. Vacío = el kernel está libre; lleno = está ejecutando algo. Es lo primero que miras cuando "no pasa nada".
:::

## Paso 4 — El Launcher

1. Haz clic en la pestaña **Launcher** (o el **+** de las pestañas).

```captura
archivo: jupyter/01-launcher.webp
texto: El Launcher: crea un notebook de Python (1) o un archivo .py (2)
```

| Tarjeta | Crea | Extensión |
|---|---|---|
| Notebook → Python 3 (ipykernel) | Un notebook nuevo | `.ipynb` |
| Other → Text File | Un archivo de texto | `.txt` |
| Other → Markdown File | Un documento con formato | `.md` |
| Other → Python File | Un script de Python | `.py` |

2. Vuelve a la pestaña **Bienvenida.ipynb**.

:::nota .ipynb y .py
Un **notebook** (`.ipynb`) guarda celdas de texto, código **y sus resultados**. Un **script** (`.py`) es solo código: se ejecuta de principio a fin, sin celdas. En el trabajo, se explora en notebooks y el código que se repite termina en scripts o módulos (lo vemos en el nivel 5).
:::

## ✅ Lo que lograste

- Sabes qué es un notebook y para qué se usa.
- Reconoces las zonas de JupyterLab y el estado del kernel.
- Sabes crear notebooks y archivos desde el Launcher.

:::ejercicio quiz
¿Qué guarda un archivo .ipynb que no guarda un .py?
- [ ] El código Python
- [x] Las celdas de texto y los resultados de cada celda
- [ ] Los datos del CSV
- [ ] La versión de Python
:::

:::ejercicio quiz
"Ejecuto una celda y no pasa nada." ¿Qué miras primero?
- [ ] El menú Help
- [x] El indicador del kernel: si está ocupado, todavía está calculando
- [ ] El explorador de archivos
- [ ] Las pestañas
:::

:::ejercicio quiz
¿Dónde creas un notebook nuevo de Python?
- [ ] En el menú Kernel
- [x] En el Launcher, tarjeta Python 3 (ipykernel), o en File → New → Notebook
- [ ] En la barra de estado
- [ ] Haciendo doble clic en datos/
:::
