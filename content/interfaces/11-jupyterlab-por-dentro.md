---
titulo: JupyterLab por dentro - notebooks, kernel, celdas y buenos hábitos
nivel: Básico
duracion: 40
resumen: Recorrido por JupyterLab, el entorno de notebooks más usado para explorar datos con Python - la interfaz, qué es un kernel, celdas de código y Markdown, el modo comando y el modo edición, el contador de ejecución, los comandos mágicos, el formato .ipynb y los hábitos que evitan el clásico "en mi notebook funcionaba".
objetivos: Reconocer las partes de la interfaz de JupyterLab | Explicar qué es el kernel y por qué las variables se pierden al reiniciarlo | Moverte con el modo comando y el modo edición usando el teclado | Usar comandos mágicos como %timeit, %%writefile y !ls | Saber cuándo un notebook está listo para compartir y cuándo conviene pasarlo a un script .py
prerrequisitos: python-funciones
autoevaluacion: ¿Sabes qué significa el número entre corchetes a la izquierda de una celda? | ¿Sabes por qué un notebook puede funcionar para ti y fallar para otra persona? | ¿Sabes cambiar una celda a Markdown sin usar el mouse? | ¿Sabes qué hace Restart Kernel and Run All Cells y por qué conviene usarlo antes de entregar? | ¿Sabes qué guarda un archivo .ipynb?
---

:::tip Practícalo mientras lees
Abre [JupyterLab de práctica](#/jupyter). Ejecuta Python de verdad en tu navegador (con Pyodide), con pandas, numpy y matplotlib, y los datos del curso en la carpeta `datos/`. No necesitas instalar nada. Al final está lo que cambia respecto del real. Los **🎯 Retos** siguen el orden de esta lección.
:::

:::analogia En palabras simples
Un notebook es como un cuaderno de laboratorio: escribes una idea, haces el experimento justo debajo y anotas el resultado. Cada celda es una página que puedes volver a ejecutar. El "kernel" es el ayudante que hace las cuentas y **se acuerda** de todo lo que ya calculaste, mientras no lo mandes a casa (reiniciar).
:::

## Qué es JupyterLab

**JupyterLab** es una aplicación web, de código abierto, del Proyecto Jupyter. Se usa para explorar datos, probar ideas y mostrar análisis con código, texto y gráficos en un mismo documento. Lo vas a encontrar en todas partes: en tu computadora (`pip install jupyterlab` y después `jupyter lab`), en Google Colab, en SageMaker Studio, en Azure Machine Learning y, con otra interfaz, en los notebooks de Databricks y de Fabric.

## La interfaz

| Parte | Dónde está | Para qué sirve |
|---|---|---|
| **Barra de menús** | Arriba | File, Edit, View, Run, Kernel, Tabs, Settings y Help |
| **Barra lateral izquierda** | A la izquierda | Explorador de archivos, kernels en ejecución, índice del notebook |
| **Área de trabajo** | Centro | Pestañas con notebooks, archivos de texto, CSV, terminales |
| **Launcher** | Una pestaña con tarjetas | Crear un notebook, un archivo de texto o de Python |
| **Barra de estado** | Abajo | Kernel y su estado (Idle, Busy), modo, línea y columna |

## El kernel: quien ejecuta tu código

El notebook es solo el documento. Quien ejecuta el código es el **kernel**, un proceso de Python que queda vivo esperando órdenes. Todo lo que ejecutas queda en su memoria.

- El círculo arriba a la derecha muestra si está **libre** (vacío) u **ocupado** (lleno).
- **Restart Kernel** lo apaga y lo vuelve a encender: se borran **todas** las variables. El texto de las celdas y las salidas que ya se ven quedan, pero las variables no.
- Si algo tarda demasiado, **Interrupt Kernel** (el cuadrado ■) corta lo que está corriendo.

## Celdas: código, Markdown y raw

| Tipo | Qué tiene | Cómo se ve al ejecutarla |
|---|---|---|
| **Code** | Código Python | Debajo aparece la salida: lo que imprimes, tablas, gráficos o errores |
| **Markdown** | Texto con formato (`#` títulos, `**negrita**`, listas, tablas) | Se muestra el texto formateado |
| **Raw** | Texto que no se ejecuta ni se formatea | Igual que lo escribiste |

Si la **última línea** de una celda de código es una expresión, Jupyter muestra su valor sin necesidad de `print`. Por eso `df.head()` al final de una celda dibuja la tabla. Si terminas la línea con `;`, no se muestra.

## El número entre corchetes

`[1]:`, `[2]:`, `[7]:`… es el **orden en que se ejecutaron** las celdas, no su posición en el notebook. `[*]:` significa que está corriendo y `[ ]:` que todavía no se ejecutó en este kernel.

:::tip La trampa más común
Si los números no van en orden de arriba abajo (por ejemplo `[5]`, `[2]`, `[9]`), el notebook depende de un orden que nadie más va a seguir. Antes de entregar o compartir: **Kernel → Restart Kernel and Run All Cells**. Si corre entero sin errores, está listo.
:::

## Modo comando y modo edición

Jupyter tiene dos modos, como vim:

- **Modo edición** (Enter o clic dentro de la celda): escribes código. El borde de la celda se resalta.
- **Modo comando** (Esc): las teclas son atajos sobre celdas enteras.

| En modo comando | Hace |
|---|---|
| `A` / `B` | Agrega una celda arriba / abajo |
| `D`, `D` | Borra la celda (dos veces D) |
| `Z` | Deshace el borrado |
| `M` / `Y` | Convierte en Markdown / en código |
| `X` / `C` / `V` | Corta / copia / pega celdas |
| `↑` `↓` | Cambia de celda |
| `0`, `0` | Reinicia el kernel |

En los dos modos: **Shift+Enter** ejecuta y pasa a la siguiente, **Ctrl+Enter** ejecuta y se queda, **Alt+Enter** ejecuta e inserta una celda nueva.

## Comandos mágicos y de shell

IPython, el kernel de Python de Jupyter, agrega comandos que empiezan con `%` (una línea) o `%%` (toda la celda). No son Python: los entiende el kernel.

| Comando | Para qué |
|---|---|
| `%pwd`, `%cd carpeta`, `%ls` | Ver y cambiar la carpeta actual |
| `%timeit sum(range(1000))` | Medir cuánto tarda una línea, repitiéndola muchas veces |
| `%%time` | Medir cuánto tarda la celda entera |
| `%%writefile utilidades.py` | Guardar el contenido de la celda en un archivo |
| `%run script.py` | Ejecutar un archivo y traer sus variables |
| `%who`, `%whos` | Listar las variables del kernel |
| `!ls`, `!head archivo.csv` | Ejecutar un comando de la terminal |
| `%pip install paquete` | Instalar un paquete en el entorno del kernel |

```text
%%writefile utilidades.py
def limpiar_email(email):
    return email.strip().lower()
```

Después, en otra celda: `from utilidades import limpiar_email`. Así el código que se repite sale del notebook y se puede probar y reutilizar.

## El formato .ipynb

Un notebook es un archivo **JSON** con extensión `.ipynb`. Adentro guarda cada celda con su tipo, su código y **sus salidas** (incluidas las imágenes de los gráficos codificadas en texto).

```json
{
 "cells": [
  { "cell_type": "markdown", "source": ["# Mi análisis"] },
  { "cell_type": "code", "execution_count": 1, "source": ["1 + 1"],
    "outputs": [{ "output_type": "execute_result", "data": { "text/plain": ["2"] } }] }
 ],
 "metadata": { "kernelspec": { "name": "python3" } },
 "nbformat": 4
}
```

Consecuencias prácticas:

- En Git, un `.ipynb` con salidas genera diferencias enormes y difíciles de revisar. Muchos equipos **limpian las salidas** antes de subirlo (Edit → Clear Outputs of All Cells, o herramientas como `nbstripout`).
- Las salidas pueden contener **datos sensibles** (una tabla de clientes, un email). Revisa antes de compartir.
- GitHub y VS Code muestran los `.ipynb` como notebooks, no como JSON.

## Notebook o script

| Úsalo para | Notebook | Script `.py` |
|---|---|---|
| Explorar datos nuevos | ✓ | |
| Mostrar un análisis con gráficos y explicación | ✓ | |
| Un pipeline que corre todos los días | | ✓ |
| Código que otros importan o prueban | | ✓ |

El camino habitual: exploras en el notebook, y lo que funciona lo pasas a funciones en archivos `.py` con pruebas. Herramientas como **papermill** permiten ejecutar notebooks con parámetros desde un orquestador, pero un script sigue siendo más fácil de probar y de revisar.

## Un flujo completo

1. Launcher → **Python 3 (ipykernel)** crea `Untitled.ipynb`. Clic derecho → **Rename** y ponle un nombre que diga qué hace.
2. Primera celda en Markdown (`Esc`, `M`): título y la pregunta que quieres responder.
3. `import pandas as pd` y `pd.read_csv("datos/pedidos.csv")`. Mira la tabla con `.head()`, `.info()` y `.describe()`.
4. Una celda por paso: limpiar, agrupar, graficar. Cada una con un título Markdown corto.
5. Lo que repites va a `utilidades.py` con `%%writefile`.
6. **Restart Kernel and Run All Cells**. Si todo corre de arriba abajo, guarda (`Ctrl+S`) y descarga el `.ipynb`.

## Qué tiene la réplica y qué no

| Tiene | No tiene |
|---|---|
| Python 3.13 real en tu navegador (Pyodide) con pandas, numpy y matplotlib | Instalar paquetes con `pip` (avisa en lugar de instalar) |
| Notebooks en formato `.ipynb` real: se descargan y abren en JupyterLab | Terminal, consola y extensiones |
| Modo comando y edición con los atajos principales | Interrumpir una celda que ya está corriendo (se corta sola a los 2 minutos) |
| Magics: `%timeit`, `%%time`, `%%writefile`, `%run`, `%pwd`, `%cd`, `%who`, `!ls`, `!head`… | Widgets interactivos y otros kernels (R, Julia) |
| Explorador de archivos, visor de CSV, editor de texto y vista previa de Markdown | Colaboración en tiempo real |

:::ejercicio quiz
Una celda muestra `[*]:` a la izquierda. ¿Qué significa?
- [ ] Que la celda tiene un error
- [x] Que se está ejecutando en este momento
- [ ] Que es una celda Markdown
- [ ] Que nunca se ejecutó
:::

:::ejercicio quiz
Reinicias el kernel y ejecutas solo la última celda, que usa la variable `ventas`. Aparece `NameError: name 'ventas' is not defined`. ¿Por qué?
- [ ] Porque el notebook se borró al reiniciar
- [x] Porque reiniciar borra las variables y la celda que define `ventas` todavía no se volvió a ejecutar
- [ ] Porque pandas no está instalado
- [ ] Porque los nombres de variables en español no funcionan
:::

:::ejercicio quiz
Estás en modo comando. ¿Qué tecla convierte la celda seleccionada en Markdown?
- [ ] A
- [ ] D
- [x] M
- [ ] Enter
:::

:::ejercicio quiz
¿Qué conviene hacer antes de compartir un notebook con tu equipo?
- [ ] Nada: si funcionó una vez, va a funcionar siempre
- [ ] Borrar todas las celdas Markdown para que sea más corto
- [x] Restart Kernel and Run All Cells, para comprobar que corre de arriba abajo sin depender del orden en que lo fuiste ejecutando
- [ ] Cambiar todas las celdas a Raw
:::

:::ejercicio quiz
¿Qué hace `%%writefile limpieza.py` en la primera línea de una celda?
- [ ] Ejecuta el archivo limpieza.py
- [x] Guarda el resto de la celda en el archivo limpieza.py
- [ ] Borra el archivo limpieza.py
- [ ] Convierte el notebook entero en un script
:::

:::ejercicio quiz
¿Por qué muchos equipos limpian las salidas de los `.ipynb` antes de subirlos a Git?
- [ ] Porque Git no acepta archivos JSON
- [ ] Porque sin salidas el notebook se ejecuta más rápido
- [x] Porque las salidas (tablas, imágenes) agrandan las diferencias entre versiones y pueden incluir datos sensibles
- [ ] Porque JupyterLab no puede abrir notebooks con salidas
:::
