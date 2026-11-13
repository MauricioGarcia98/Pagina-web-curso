---
titulo: Python en celdas - Out y print, el orden de ejecución, los errores y reiniciar el kernel
nivel: 2 · Básico-intermedio
duracion: 40
resumen: Cómo se comporta Python dentro de un notebook. La diferencia entre lo que muestra print y el Out de la última línea, por qué el orden en que ejecutas las celdas importa más que el orden en que están escritas, cómo leer un error (traceback) de abajo hacia arriba, y cuándo reiniciar el kernel para comprobar que el notebook funciona de verdad.
objetivos: Distinguir la salida de print del valor Out de la última línea | Explicar el estado del kernel y el orden de ejecución | Leer un traceback y encontrar la línea que falla | Reiniciar el kernel y ejecutar todo para comprobar el notebook | Usar %whos para ver las variables en memoria
prerrequisitos: jupyterlab-proyecto-presupuesto-viaje
autoevaluacion: ¿Sabes por qué solo se ve el último valor de una celda? | ¿Sabes qué significan los números [5] y [3] fuera de orden? | ¿Sabes en qué línea de un traceback está el problema? | ¿Sabes cuándo reiniciar el kernel?
---

:::analogia En palabras simples
El kernel es como una pizarra donde Python va anotando las variables. Cada celda que ejecutas escribe o borra algo en la pizarra. Si ejecutas las celdas desordenadas, la pizarra queda distinta a lo que muestra el notebook de arriba abajo. Reiniciar el kernel es borrar la pizarra y empezar de cero.
:::

## Paso 1 — Out: el valor de la última línea

En un notebook nuevo de [JupyterLab de práctica](#/jupyter), ejecuta:

```python norun
import pandas as pd
pedidos = pd.read_csv("datos/pedidos.csv")
precio = 820
descuento = 0.1
precio * (1 - descuento)
```

```captura
archivo: jupyter/e05-out.webp
texto: La última línea de la celda se muestra como Out, con el mismo número que la celda
```

Solo la **última línea** se muestra, y solo si es un valor (no una asignación como `x = 5`). Las líneas de arriba se ejecutan, pero no muestran nada.

## Paso 2 — print: mostrar varias cosas

```python norun
print("Total con descuento:", precio * (1 - descuento))
precio
```

```captura
archivo: jupyter/e05-print.webp
texto: print muestra texto (1); la última línea se muestra como Out (2)
```

| | `print(...)` | Última línea |
|---|---|---|
| Cuántos | Todos los que escribas | Solo uno, el último |
| Cómo se ve | Texto plano | Formateado: una tabla de pandas se ve como tabla HTML |
| Se usa para | Mensajes, valores en un bucle | Mirar un resultado o una tabla |

:::tip Para ver una tabla en medio de la celda
`display(pedidos.head())` muestra la tabla con formato aunque no sea la última línea.
:::

## Paso 3 — El orden de ejecución manda

Los números entre corchetes cuentan el **orden** en que ejecutaste. Prueba:

1. Celda A: `x = 1` → ejecútala.
2. Celda B: `x = x + 10` → ejecútala. `x` vale 11.
3. Vuelve a ejecutar la celda B. Ahora `x` vale **21**, aunque el notebook "diga" lo mismo.

Si ves números como `[7]`, `[3]`, `[12]` desordenados, el resultado que ves puede no ser reproducible: depende de qué ejecutaste y cuántas veces.

:::cuidado El notebook que "funcionaba en mi computadora"
Si borras la celda que creaba una variable, la variable sigue en el kernel y todo parece andar. Mañana, al abrir el notebook, falla. Por eso, antes de entregar o compartir: **Kernel → Restart Kernel and Run All Cells**.
:::

## Paso 4 — Lee un error de abajo hacia arriba

Ejecuta algo que falla: `pedidos["columna_que_no_existe"]`.

```captura
archivo: jupyter/04-error.webp
texto: Un traceback: la última línea dice qué pasó; la ayuda de la práctica sugiere qué revisar
```

| Parte del traceback | Te dice |
|---|---|
| **Última línea** (`KeyError: 'columna_que_no_existe'`) | Qué error y con qué valor: empieza por acá |
| `Cell In[n], line k` | En qué celda y en qué línea de tu código |
| Las líneas del medio | Por dónde pasó dentro de pandas: casi nunca hace falta leerlas |

| Error | Causa típica |
|---|---|
| `NameError` | Usas una variable que no existe en el kernel (no ejecutaste la celda que la crea, o está mal escrita) |
| `KeyError` | Una columna o clave que no existe (revisa mayúsculas y espacios) |
| `SyntaxError` | Paréntesis, comillas o dos puntos que faltan |
| `FileNotFoundError` | La ruta del archivo está mal |
| `TypeError` | Operación entre tipos que no se mezclan (`"3" + 4`) |

## Paso 5 — Reinicia y ejecuta todo

1. Menú **Kernel**.

```captura
archivo: jupyter/05-menu-kernel.webp
texto: El menú Kernel: Restart Kernel and Run All Cells (1)
```

2. **Restart Kernel and Run All Cells…** → confirma.

```captura
archivo: jupyter/05-confirmar-reinicio.webp
texto: La confirmación: reiniciar borra todas las variables del kernel
```

3. Las celdas se ejecutan en orden, empezando por `[1]`.

```captura
archivo: jupyter/05-tras-reinicio.webp
texto: Después de reiniciar, la numeración vuelve a empezar desde [1]
```

| Opción del menú Kernel | Cuándo |
|---|---|
| Interrupt Kernel (I, I) | Una celda tarda demasiado: la detiene sin perder variables |
| Restart Kernel | El kernel quedó en un estado raro: borra todo |
| Restart Kernel and Run All Cells | Antes de entregar: prueba el notebook completo |
| Restart Kernel and Clear Outputs | Para guardar el notebook sin resultados |

## Paso 6 — ¿Qué hay en memoria? %whos

Escribe `%whos` en una celda: lista las variables del kernel, su tipo y un resumen. Los comandos que empiezan con `%` son **magics** de Jupyter (no son Python); los vemos en el nivel 4.

## ✅ Lo que lograste

- Sabes qué muestra una celda y cómo mostrar más cosas.
- Entiendes por qué importa el orden de ejecución.
- Lees errores y compruebas el notebook reiniciando el kernel.

:::ejercicio quiz
Una celda tiene tres líneas: `a = 5`, `a * 2`, `a * 3`. ¿Qué se muestra?
- [ ] 10 y 15
- [x] Solo 15, el valor de la última línea
- [ ] Solo 10
- [ ] Nada, porque no hay print
:::

:::ejercicio quiz
Ejecutas dos veces la celda `total = total + 100`. ¿Qué pasa?
- [ ] Nada, Jupyter ignora la segunda vez
- [x] Se suma 100 dos veces: el kernel recuerda el valor anterior
- [ ] Da error
- [ ] total vuelve a su valor inicial
:::

:::ejercicio quiz
¿Por dónde empiezas a leer un traceback?
- [ ] Por la primera línea
- [x] Por la última línea: dice el tipo de error y el valor que lo causó
- [ ] Por el medio, donde está pandas
- [ ] No se lee, se borra la celda
:::

:::ejercicio quiz
¿Qué haces antes de entregar un notebook?
- [ ] Borrar todas las salidas a mano
- [x] Kernel → Restart Kernel and Run All Cells, y verificar que corre sin errores
- [ ] Ejecutar la última celda
- [ ] Renombrarlo
:::
