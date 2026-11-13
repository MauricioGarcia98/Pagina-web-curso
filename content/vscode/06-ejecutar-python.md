---
titulo: Ejecutar Python desde VS Code - el botón ▷, la salida, los archivos que genera un script y el intérprete
nivel: 2 · Básico-intermedio
duracion: 40
resumen: Cómo correr un script y entender lo que pasa. El botón Ejecutar archivo, qué comando lanza en la terminal, leer la salida y los errores, un script real que resume ventas y escribe un CSV, ejecutar con argumentos, el intérprete de Python que muestra la barra de estado y la diferencia entre ejecutar un script y un notebook.
objetivos: Ejecutar un archivo de Python con ▷ o desde la terminal | Leer la salida y relacionar un error con su línea | Ejecutar un script que lee un CSV y escribe un resultado | Reconocer qué intérprete de Python usa VS Code | Distinguir script de notebook y saber cuándo usar cada uno
prerrequisitos: vscode-terminal-integrada
autoevaluacion: ¿Sabes qué comando ejecuta el botón ▷? | ¿Sabes encontrar la línea de un error desde la salida? | ¿Sabes dónde quedó el archivo que escribió el script? | ¿Sabes qué Python está usando VS Code?
---

:::analogia En palabras simples
Un script es una receta que se ejecuta entera, de la primera a la última línea, cada vez. El botón ▷ es un atajo: escribe por ti `python archivo.py` en la terminal.
:::

## Paso 1 — Ejecuta un script corto

1. Crea `scripts/hola.py` con:

```python norun
nombre = "Ana"
print(f"Hola, {nombre}")
```

2. Guarda y presiona **▷** (arriba a la derecha del editor).

```captura
archivo: vscode/v06-ejecutar.webp
texto: El botón Ejecutar (1): en la terminal (2) se ve el comando que lanzó y la salida
```

El ▷ guarda el archivo y escribe en la terminal `python ~/scripts/hola.py`. Atajos: **Ctrl + F5** (ejecutar sin depurar) y **F5** (depurar, nivel 3).

## Paso 2 — Un script real: resumen de ventas

Abre **scripts/resumen_ventas.py** y léelo antes de ejecutarlo:

| Líneas | Qué hace |
|---|---|
| `with open("datos/ventas_2024_12.csv"...)` | Abre el CSV de ventas de diciembre |
| `csv.DictReader(f)` | Lee cada fila como un diccionario (`fila["canal"]`) |
| `if fila["estado"] == "cancelado": continue` | Salta los cancelados |
| `totales[...] += float(fila["total"])` | Acumula las ventas por canal |
| `print(f"{canal:<10}...")` | Imprime una tabla alineada |
| `with open("datos/resumen_canales.csv", "w")` | Escribe el resultado en un CSV nuevo |

Presiona **▷**:

```captura
archivo: vscode/v06-resumen.webp
texto: La salida: ventas de diciembre por canal y el aviso del archivo escrito
```

El script imprimió web 237 pedidos y 309,633.38; app 143 y 183,748.86; tienda 126 y 129,482.33; teléfono 43 y 54,685.17. Además creó **datos/resumen_canales.csv**: búscalo en el explorador (botón **Actualizar** si no aparece) y ábrelo.

:::tip El script escribió un archivo
Muchos scripts de datos no "muestran" su resultado: lo **guardan** (un CSV, una tabla, un archivo en la nube). Después de ejecutar, comprueba siempre que el archivo de salida existe y tiene lo que esperabas.
:::

## Paso 3 — Cuando falla

Si un script tiene un error, la terminal muestra un **traceback**. La última línea dice el tipo de error; una línea más arriba dice `File ".../archivo.py", line 12`. Con **Ctrl + G** vas a esa línea. Los errores más comunes son los de la lección 5 de JupyterLab: `NameError`, `KeyError`, `FileNotFoundError`, `SyntaxError`, `TypeError`.

## Paso 4 — El intérprete de Python

En la barra de estado, a la derecha, aparece la versión de Python (por ejemplo **3.12**). En VS Code real ese botón abre **Seleccionar intérprete**: qué Python (y qué entorno virtual) usa el proyecto. Si un `import` funciona en la terminal pero VS Code lo marca con error, casi siempre es porque VS Code está usando otro intérprete (lección 23).

## Paso 5 — Script o notebook

| Usa un script (.py) cuando… | Usa un notebook (.ipynb) cuando… |
|---|---|
| El proceso se repite igual cada vez | Exploras datos nuevos |
| Lo va a ejecutar un pipeline o un compañero | Quieres ver tablas y gráficos paso a paso |
| Necesita tests y revisión de código | Documentas un análisis con texto y resultados |

VS Code abre los dos: en la lección 22 vemos los notebooks dentro de VS Code.

## ✅ Lo que lograste

- Ejecutas scripts con ▷ y desde la terminal.
- Lees la salida y los archivos que genera un script.
- Sabes qué es el intérprete y cuándo usar script o notebook.

:::ejercicio quiz
¿Qué hace el botón ▷ con un archivo .py?
- [ ] Lo compila a un .exe
- [x] Lo guarda y ejecuta python archivo.py en la terminal integrada
- [ ] Lo abre en un notebook
- [ ] Lo sube a GitHub
:::

:::ejercicio quiz
Un script termina sin errores pero no imprime nada. ¿Qué compruebas?
- [ ] Que tenga más print
- [x] Si escribió un archivo de salida (por ejemplo un CSV) y que exista con el contenido esperado
- [ ] Que la terminal esté maximizada
- [ ] Nada, si no hay errores está bien
:::

:::ejercicio quiz
Un import funciona en la terminal, pero VS Code lo subraya en rojo. ¿Qué es lo más probable?
- [ ] El paquete está roto
- [x] VS Code está usando otro intérprete de Python que el de la terminal
- [ ] Falta guardar
- [ ] El archivo tiene tildes
:::
