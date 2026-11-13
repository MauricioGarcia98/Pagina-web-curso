---
titulo: Notebooks reproducibles - magics, archivos .py, rutas y el notebook que corre de arriba abajo
nivel: 4 · Intermedio-avanzado
duracion: 45
resumen: Un análisis vale si otra persona (o tú dentro de un mes) puede volver a ejecutarlo y obtener lo mismo. Las magics más útiles (%timeit, %%writefile, %run, %pwd, %ls, %whos), llevar funciones a un archivo .py e importarlas, guardar resultados intermedios, fijar semillas y fechas de corte, y la rutina para dejar un notebook reproducible.
objetivos: Usar las magics de línea y de celda más comunes | Escribir un módulo .py con %%writefile e importarlo | Medir tiempos con %timeit | Guardar y leer resultados intermedios en archivos | Aplicar la rutina de reproducibilidad antes de compartir
prerrequisitos: jupyterlab-limpiar-datos
autoevaluacion: ¿Sabes qué diferencia hay entre % y %%? | ¿Sabes crear un archivo .py desde una celda? | ¿Sabes por qué un análisis con TODAY no se repite igual? | ¿Sabes la rutina antes de compartir un notebook?
---

:::analogia En palabras simples
Un notebook reproducible es una receta que sale igual en cualquier cocina: tiene todos los ingredientes listados (imports y archivos), los pasos en orden (de arriba abajo) y ninguna medida "a ojo" (fechas de corte y parámetros escritos). Si solo sale bien en tu computadora y en el orden en que tú hiciste clic, no es una receta: es una anécdota.
:::

## Paso 1 — Magics: comandos de Jupyter, no de Python

| Magic | Hace |
|---|---|
| `%pwd` | Muestra la carpeta actual |
| `%ls` / `!ls` | Lista archivos |
| `%whos` | Variables en memoria con su tipo |
| `%time código` | Mide una ejecución |
| `%timeit código` | Mide muchas ejecuciones y da el promedio |
| `%run archivo.py` | Ejecuta un script |
| `%%writefile archivo.py` | (primera línea de la celda) guarda la celda como archivo |
| `%lsmagic` | Lista todas las magics disponibles |

`%` (una) afecta a **una línea**; `%%` (dos) a **toda la celda** y va en la primera línea.

## Paso 2 — Lleva funciones a un archivo .py

```python norun
%%writefile utilidades.py
def limpiar_email(email):
    return str(email).strip().lower()
```

La celda no se ejecuta como código: se guarda como `utilidades.py` (aparece en el explorador). En otra celda:

```python norun
from utilidades import limpiar_email
print(limpiar_email("  ANA@Correo.COM "))
%timeit limpiar_email(" X@Y.COM ")
```

```captura
archivo: jupyter/05-magics.webp
texto: %%writefile creó utilidades.py (1); el import y %timeit funcionan desde el notebook
```

:::tip Por qué un .py
Las funciones que usas en varios notebooks (limpiar emails, calcular tasas) van en un módulo `.py`: se corrigen en un solo lugar, se pueden probar y después se reutilizan en un pipeline. Es el primer paso del notebook al código de producción (nivel 5).
:::

:::nota Si editas el .py
Python importa un módulo una sola vez. Si cambias `utilidades.py`, reinicia el kernel (o usa `%load_ext autoreload` y `%autoreload 2` en Jupyter real) para que el notebook vea la versión nueva.
:::

## Paso 3 — Rutas y archivos intermedios

```python norun
limpio.to_csv("clientes_limpios.csv", index=False)
# en otro notebook o al día siguiente:
limpio = pd.read_csv("clientes_limpios.csv")
```

- `index=False` evita guardar el índice como una columna extra sin nombre.
- Usa rutas **relativas** (`datos/…`, `salidas/…`), nunca `C:\Users\ana\Desktop\…`: en otra computadora esa ruta no existe.

## Paso 4 — Lo que rompe la reproducibilidad

| Problema | Solución |
|---|---|
| Celdas ejecutadas en desorden | Restart Kernel and Run All Cells antes de compartir |
| `pd.Timestamp.today()` o `TODAY` en los cálculos | Una fecha de corte fija en la celda de parámetros |
| Muestras al azar (`df.sample(100)`) | Fijar la semilla: `df.sample(100, random_state=42)` |
| Variables que existen solo en tu kernel | Reiniciar y ejecutar todo lo detecta |
| Archivos que solo tienes tú | Documentar de dónde salen y guardarlos en la carpeta del proyecto |
| Versiones distintas de pandas | En Jupyter real, un `requirements.txt` (lección 23) |

## Paso 5 — La rutina antes de compartir

1. Celda de parámetros al principio (fechas, umbrales, rutas).
2. Imports todos juntos en la primera celda de código.
3. **Kernel → Restart Kernel and Run All Cells**.
4. Revisar que no haya errores ni celdas sin ejecutar.
5. Guardar (Ctrl + S) y descargar.

```captura
archivo: jupyter/05-tras-reinicio.webp
texto: Después de Restart and Run All, la numeración sale ordenada desde [1]: el notebook corre de arriba abajo
```

## ✅ Lo que lograste

- Usas magics para inspeccionar, medir y crear archivos.
- Llevas funciones a un .py y las importas.
- Conoces lo que rompe la reproducibilidad y la rutina para evitarlo.

:::ejercicio quiz
¿Qué diferencia hay entre `%timeit` y `%%timeit`?
- [ ] Ninguna
- [x] `%timeit` mide una línea; `%%timeit` (en la primera línea) mide toda la celda
- [ ] `%%timeit` es más preciso
- [ ] `%timeit` solo funciona con pandas
:::

:::ejercicio quiz
¿Qué hace una celda que empieza con `%%writefile utilidades.py`?
- [ ] Ejecuta el código y lo muestra
- [x] Guarda el contenido de la celda en el archivo utilidades.py sin ejecutarlo
- [ ] Importa utilidades.py
- [ ] Borra utilidades.py
:::

:::ejercicio quiz
Tu análisis usa `df.sample(500)` y cada vez da números distintos. ¿Qué haces?
- [ ] Nada, es normal
- [x] Fijar la semilla con random_state para que la muestra sea siempre la misma
- [ ] Usar más filas
- [ ] Reiniciar el kernel
:::
