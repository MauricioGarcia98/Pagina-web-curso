---
titulo: Funciones, módulos y pruebas - del código repetido a herramientas que se reutilizan
nivel: 5 · Avanzado
duracion: 50
resumen: Cuando copias la misma celda tres veces, es hora de una función. Cómo escribir funciones claras con parámetros, valores por defecto y docstring, cómo probarlas con assert, llevarlas a un módulo .py, editarlo en el editor de JupyterLab y usarlo desde varios notebooks. El paso que convierte un análisis en código que otros pueden usar.
objetivos: Escribir funciones con parámetros, valores por defecto y docstring | Probar funciones con assert y casos borde | Crear y editar un módulo .py desde JupyterLab | Importar funciones propias en un notebook | Escribir funciones que reciben y devuelven DataFrames
prerrequisitos: jupyterlab-analisis-exploratorio
autoevaluacion: ¿Sabes cuándo conviene una función? | ¿Sabes probar una función con assert? | ¿Sabes qué es un caso borde? | ¿Sabes importar una función de tu propio .py?
---

:::analogia En palabras simples
Una función es una receta con nombre: "tasa(parte, total)". La escribes una vez, la pruebas una vez, y la usas en todos lados. Si la receta tiene un error, lo corriges en un solo lugar y queda corregido en todos los notebooks que la usan.
:::

## Paso 1 — Tu primera función

```python norun
def tasa(parte, total):
    return round(parte / total * 100, 1)
```

```python norun
assert tasa(1, 4) == 25.0
tasa(371, 4633)
```

```captura
archivo: jupyter/e18-funcion.webp
texto: La función tasa, una prueba con assert y su uso: 8.0 % de pedidos cancelados en 2024
```

| Parte | Significa |
|---|---|
| `def tasa(parte, total):` | Define la función y sus **parámetros** |
| El cuerpo indentado | Lo que hace (4 espacios) |
| `return` | Lo que devuelve |

## Paso 2 — Parámetros por defecto y docstring

```python norun
def tasa(parte, total, decimales=1):
    """Porcentaje de parte sobre total. Devuelve None si total es 0."""
    if total == 0:
        return None
    return round(parte / total * 100, decimales)
```

- `decimales=1` es un **valor por defecto**: `tasa(1, 3)` usa 1 decimal; `tasa(1, 3, decimales=3)` usa 3.
- El texto entre `"""` es el **docstring**: lo que muestra `tasa?` o Shift + Tab en Jupyter real.

## Paso 3 — Pruébala, incluidos los casos borde

```python norun
assert tasa(1, 4) == 25.0
assert tasa(0, 10) == 0.0
assert tasa(5, 0) is None          # caso borde: dividir por cero
assert tasa(1, 3, decimales=2) == 33.33
```

Un **caso borde** es una entrada en el límite: cero, vacío, nulo, un solo elemento. Es donde se rompen las funciones. Si una prueba falla, `assert` detiene la celda y te dice cuál.

## Paso 4 — Funciones que reciben y devuelven tablas

```python norun
def resumen_por(df, columna):
    """Pedidos y tasa de cancelación por los valores de una columna."""
    return (df.assign(cancelado=df["estado"] == "cancelado")
              .groupby(columna)
              .agg(pedidos=("pedido_id", "count"), tasa_cancelacion=("cancelado", "mean"))
              .sort_values("pedidos", ascending=False))

resumen_por(pedidos, "canal")
resumen_por(pedidos, "metodo_pago")
```

La misma lógica sirve para cualquier columna: lo que antes eran dos celdas copiadas ahora es una función con un parámetro.

## Paso 5 — Al módulo: un .py que editas en JupyterLab

1. Crea el archivo con `%%writefile metricas.py` (primera línea de una celda) y pega las funciones `tasa` y `resumen_por`, con su `import pandas as pd` arriba.
2. En el explorador, haz doble clic en el `.py`: se abre en el **editor de texto** de JupyterLab, con colores de Python.

```captura
archivo: jupyter/e18-editor-py.webp
texto: Un archivo .py abierto en el editor de JupyterLab (1): se edita como texto y se guarda con Ctrl+S
```

3. En el notebook: `from metricas import tasa, resumen_por`.

:::nota Cambios en el .py
Después de editar y guardar el `.py`, reinicia el kernel para que el notebook importe la versión nueva (en Jupyter real, `%load_ext autoreload` y `%autoreload 2` lo hacen automático).
:::

## Paso 6 — Buenas prácticas

| Práctica | Por qué |
|---|---|
| Nombres que dicen qué hacen (`limpiar_email`, no `f1`) | Se entiende sin leer el cuerpo |
| Una función, una tarea | Más fácil de probar y reutilizar |
| No modificar el DataFrame de entrada (devolver uno nuevo) | Evita efectos sorpresa en otras celdas |
| Sin variables globales adentro (todo por parámetro) | Funciona igual en cualquier notebook |
| Pruebas al lado de la función | Si alguien la cambia, sabe si la rompió |

## ✅ Lo que lograste

- Escribiste funciones con parámetros, valores por defecto y docstring.
- Las probaste con assert, incluidos los casos borde.
- Las llevaste a un módulo .py y las importaste.

:::ejercicio quiz
¿Qué devuelve `tasa(1, 3)` si la función es `def tasa(parte, total, decimales=1): return round(parte / total * 100, decimales)`?
- [ ] 33
- [x] 33.3
- [ ] 33.33
- [ ] 0.33
:::

:::ejercicio quiz
¿Qué es un caso borde?
- [ ] Un error de sintaxis
- [x] Una entrada en el límite (cero, vacío, nulo) donde las funciones suelen fallar
- [ ] La última línea de la función
- [ ] Un parámetro opcional
:::

:::ejercicio quiz
Editas metricas.py pero el notebook sigue usando la versión vieja. ¿Qué haces?
- [ ] Borro el archivo y lo vuelvo a crear
- [x] Reinicio el kernel (o uso autoreload) y vuelvo a importar
- [ ] Cambio el nombre de la función
- [ ] Guardo el notebook
:::
