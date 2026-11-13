---
titulo: pandas para empezar - cargar un CSV y conocer una tabla en cinco comandos
nivel: 2 · Básico-intermedio
duracion: 45
resumen: pandas es la biblioteca con la que se trabajan tablas en Python. Cómo cargar un CSV con read_csv, qué es un DataFrame, y los comandos que se usan siempre al recibir datos nuevos - shape, head, info, describe, columns, dtypes, isna y value_counts - para saber qué tienes antes de analizar.
objetivos: Cargar un CSV en un DataFrame con read_csv | Ver tamaño, columnas y primeras filas | Leer info() para tipos de dato y nulos | Resumir columnas numéricas con describe() | Contar valores de una columna con value_counts()
prerrequisitos: jupyterlab-python-en-celdas
autoevaluacion: ¿Sabes cuántas filas tiene una tabla sin mirarla entera? | ¿Sabes qué columnas tienen nulos? | ¿Sabes leer count, mean y 50% en describe? | ¿Sabes contar cuántos pedidos hay por canal?
---

:::analogia En palabras simples
Un **DataFrame** es una tabla de Excel dentro de Python: filas, columnas con nombre y un índice (el número de fila). La diferencia es que en vez de hacer clic, le haces preguntas escribiendo una línea. Los cinco comandos de esta lección son el "primer vistazo" que hace cualquier analista con un archivo nuevo.
:::

## Paso 1 — Carga el CSV

En un notebook nuevo ([JupyterLab de práctica](#/jupyter)):

```python norun
import pandas as pd
pedidos = pd.read_csv("datos/pedidos.csv")
pedidos.head()
```

- `import pandas as pd`: carga la biblioteca y la llama `pd` (todo el mundo usa ese nombre).
- `pd.read_csv(...)`: lee el archivo y devuelve un DataFrame.
- `.head()`: las primeras 5 filas. `.head(10)` muestra 10; `.tail()` las últimas.

```captura
archivo: jupyter/02-tabla-pandas.webp
texto: head() muestra las primeras filas como tabla
```

## Paso 2 — Tamaño y columnas

```python norun
pedidos.shape
```

Da `(12000, 7)`: **12.000 filas y 7 columnas**. Es una tupla (filas, columnas), sin paréntesis de función.

```python norun
pedidos.columns
```

Lista los nombres de las columnas: `pedido_id`, `cliente_id`, `empleado_id`, `fecha_pedido`, `estado`, `canal`, `metodo_pago`.

## Paso 3 — info(): tipos y nulos

```python norun
pedidos.info()
```

```captura
archivo: jupyter/04-info.webp
texto: info() muestra cada columna, cuántos valores no nulos tiene y su tipo
```

| Lo que miras | Qué te dice |
|---|---|
| `RangeIndex: 12000 entries` | La cantidad de filas |
| `Non-Null Count` | Cuántos valores **no** están vacíos por columna |
| `Dtype` | `int64` (enteros), `float64` (decimales), `object`/`str` (texto) |

`empleado_id` tiene solo **3.627** no nulos y es `float64` (pandas usa decimales para poder representar el vacío como `NaN`).

:::tip Un nulo también es un dato
¿Por qué falta el empleado en 8.373 pedidos? Investígalo: `pedidos[pedidos["empleado_id"].isna()]["canal"].value_counts()` muestra que son **todos** los pedidos de web y app: ahí no interviene un vendedor. No es un error, es información. Antes de "limpiar" un nulo, pregunta por qué está.
:::

## Paso 4 — describe(): resumen de los números

```python norun
pedidos.describe()
```

```captura
archivo: jupyter/e06-describe.webp
texto: describe() resume cada columna numérica: cantidad, promedio, desvío, mínimo, cuartiles y máximo
```

| Fila | Significa |
|---|---|
| count | Valores no nulos |
| mean | Promedio |
| std | Desvío estándar: cuánto se alejan los valores del promedio |
| min / max | Mínimo y máximo |
| 25% / 50% / 75% | Cuartiles: el 50% es la **mediana** |

:::cuidado describe() de un id no significa nada
El "promedio de pedido_id" (6000.5) es un número sin sentido: es un identificador, no una cantidad. describe() resume todo lo numérico; tú decides qué tiene sentido mirar. En la lección 17 lo usamos con importes, donde sí importa.
:::

## Paso 5 — value_counts(): contar categorías

```python norun
pedidos["canal"].value_counts()
```

```captura
archivo: jupyter/e06-value-counts.webp
texto: value_counts() cuenta cuántas veces aparece cada valor, de mayor a menor
```

- `pedidos["canal"]` toma **una columna** (una *Series*).
- `.value_counts()` cuenta cada valor: web 5.400, app 2.973, tienda 2.645, telefono 982.
- `.value_counts(normalize=True)` da proporciones: web es el 45 %.

## Paso 6 — Nulos de un vistazo

```python norun
pedidos.isna().sum()
```

Da la cantidad de nulos por columna. Con `.isna().mean()` obtienes el **porcentaje**.

## La ficha del primer vistazo

| Pregunta | Comando |
|---|---|
| ¿Cuántas filas y columnas? | `df.shape` |
| ¿Cómo se ve? | `df.head()` |
| ¿Qué tipos y cuántos nulos? | `df.info()` |
| ¿Cómo se distribuyen los números? | `df.describe()` |
| ¿Qué valores tiene una categoría? | `df["col"].value_counts()` |
| ¿Cuántos nulos por columna? | `df.isna().sum()` |

## ✅ Lo que lograste

- Cargaste un CSV y conoces su tamaño, columnas, tipos y nulos.
- Resumiste números y contaste categorías.
- Sabes que un nulo puede tener significado.

:::ejercicio quiz
¿Qué devuelve `pedidos.shape`?
- [ ] Las primeras 5 filas
- [x] Una tupla (filas, columnas), por ejemplo (12000, 7)
- [ ] Los tipos de cada columna
- [ ] La cantidad de nulos
:::

:::ejercicio quiz
En info(), una columna muestra 3627 non-null de 12000 filas. ¿Qué significa?
- [ ] Que tiene 3627 valores distintos
- [x] Que 8373 filas tienen ese dato vacío
- [ ] Que la columna está mal cargada
- [ ] Que hay 3627 duplicados
:::

:::ejercicio quiz
¿Qué comando cuenta cuántos pedidos hay en cada estado?
- [ ] `pedidos.count("estado")`
- [x] `pedidos["estado"].value_counts()`
- [ ] `pedidos.describe("estado")`
- [ ] `pedidos.estado.sum()`
:::

:::ejercicio quiz
En describe(), ¿qué fila es la mediana?
- [ ] mean
- [ ] std
- [x] 50%
- [ ] count
:::
