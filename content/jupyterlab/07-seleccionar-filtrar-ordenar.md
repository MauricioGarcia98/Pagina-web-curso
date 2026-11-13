---
titulo: Seleccionar, filtrar y ordenar - quedarte con las filas y columnas que responden la pregunta
nivel: 2 · Básico-intermedio
duracion: 45
resumen: Las operaciones más usadas en pandas. Elegir una o varias columnas, filtrar filas con condiciones (y combinarlas con & y |), filtrar por una lista de valores con isin, ordenar con sort_values, quedarte con los primeros con head y nlargest, y seleccionar con loc. Cada una con su equivalente en SQL y en Excel.
objetivos: Seleccionar columnas con [] y [[ ]] | Filtrar filas con condiciones y combinarlas con & y | | Filtrar por varios valores con isin | Ordenar con sort_values por una o varias columnas | Usar loc para filas y columnas a la vez
prerrequisitos: jupyterlab-pandas-cargar-y-explorar
autoevaluacion: ¿Sabes la diferencia entre df["a"] y df[["a"]]? | ¿Sabes filtrar con dos condiciones? | ¿Sabes por qué cada condición va entre paréntesis? | ¿Sabes ordenar de mayor a menor?
---

:::analogia En palabras simples
Filtrar en pandas es lo mismo que el filtro de Excel o el `WHERE` de SQL: escribes la condición y te quedas con las filas que la cumplen. La diferencia es que queda escrito, y mañana se repite igual con un clic.
:::

Seguimos con `pedidos` cargado (si reiniciaste: `import pandas as pd` y `pedidos = pd.read_csv("datos/pedidos.csv")`).

## Paso 1 — Seleccionar columnas

| Escribes | Obtienes |
|---|---|
| `pedidos["canal"]` | **Una** columna (Series) |
| `pedidos[["canal", "estado"]]` | Una **tabla** con esas columnas (DataFrame): ojo, doble corchete |
| `pedidos.drop(columns=["empleado_id"])` | Todas menos esa |

## Paso 2 — Filtrar filas con una condición

```python norun
cancelados = pedidos[pedidos["estado"] == "cancelado"]
len(cancelados)
```

Da **967**. Cómo funciona: `pedidos["estado"] == "cancelado"` da una columna de `True`/`False` (una por fila); al ponerla entre corchetes, pandas se queda con las filas `True`.

| Operador | Significa |
|---|---|
| `==` / `!=` | igual / distinto |
| `>`, `>=`, `<`, `<=` | comparaciones |

## Paso 3 — Dos condiciones: & (y), | (o)

```python norun
cancel_web = pedidos[(pedidos["canal"] == "web") & (pedidos["estado"] == "cancelado")]
cancel_web.shape
```

```captura
archivo: jupyter/e07-filtro.webp
texto: Dos condiciones con &: 421 pedidos web cancelados
```

| En pandas | En Python común | En SQL |
|---|---|---|
| `&` | `and` | `AND` |
| `\|` | `or` | `OR` |
| `~` | `not` | `NOT` |

:::cuidado Los paréntesis son obligatorios
`pedidos["canal"] == "web" & pedidos["estado"] == "cancelado"` sin paréntesis da un error confuso, porque `&` se evalúa antes que `==`. Pon **cada condición entre paréntesis**. Y usa `&`/`|`, nunca `and`/`or`, con columnas de pandas.
:::

## Paso 4 — Varios valores: isin

```python norun
perdidos = pedidos[pedidos["estado"].isin(["cancelado", "devuelto"])]
len(perdidos)
```

Da **1.473** (967 cancelados + 506 devueltos). Es el `IN (...)` de SQL. Para "todos menos": `~pedidos["estado"].isin([...])`.

## Paso 5 — Ordenar

```python norun
pedidos.sort_values("fecha_pedido", ascending=False).head()
```

```captura
archivo: jupyter/e07-orden.webp
texto: sort_values con ascending=False: los pedidos más recientes primero
```

| Quieres | Escribes |
|---|---|
| De menor a mayor | `sort_values("col")` |
| De mayor a menor | `sort_values("col", ascending=False)` |
| Por dos columnas | `sort_values(["canal", "fecha_pedido"], ascending=[True, False])` |
| Los 3 más grandes de una columna numérica | `df.nlargest(3, "col")` |

:::tip No cambia la tabla original
`sort_values` y los filtros **devuelven una tabla nueva**: `pedidos` sigue igual. Si quieres guardarlo, asígnalo: `pedidos_ordenados = pedidos.sort_values(...)`.
:::

## Paso 6 — loc: filas y columnas a la vez

```python norun
pedidos.loc[pedidos["canal"] == "telefono", ["pedido_id", "fecha_pedido", "estado"]]
```

`loc[filas, columnas]`: la condición elige las filas y la lista elige las columnas. Es la forma más clara cuando necesitas las dos cosas, y la correcta para **modificar** valores de algunas filas (`pedidos.loc[cond, "col"] = valor`).

## Equivalencias

| pandas | SQL | Excel |
|---|---|---|
| `df[df["estado"] == "cancelado"]` | `WHERE estado = 'cancelado'` | Filtro: estado = cancelado |
| `df[["a", "b"]]` | `SELECT a, b` | Ocultar columnas |
| `df.sort_values("f", ascending=False)` | `ORDER BY f DESC` | Sort Z→A |
| `df["estado"].isin([...])` | `estado IN (...)` | Filtro con varios valores |

## ✅ Lo que lograste

- Seleccionas columnas y filtras filas con una o varias condiciones.
- Ordenas y te quedas con los primeros.
- Usas loc para elegir filas y columnas a la vez.

:::ejercicio quiz
¿Qué devuelve `pedidos[["canal"]]` (doble corchete)?
- [ ] Una Series con la columna canal
- [x] Un DataFrame de una sola columna
- [ ] Un error
- [ ] La lista de canales distintos
:::

:::ejercicio quiz
¿Cuál filtra los pedidos de la app pagados en efectivo?
- [ ] `pedidos[pedidos["canal"] == "app" and pedidos["metodo_pago"] == "efectivo"]`
- [ ] `pedidos[pedidos["canal"] == "app" & pedidos["metodo_pago"] == "efectivo"]`
- [x] `pedidos[(pedidos["canal"] == "app") & (pedidos["metodo_pago"] == "efectivo")]`
- [ ] `pedidos.filter("app", "efectivo")`
:::

:::ejercicio quiz
¿Cómo te quedas con los pedidos que NO son de tienda?
- [x] `pedidos[pedidos["canal"] != "tienda"]`
- [ ] `pedidos[pedidos["canal"] == not "tienda"]`
- [ ] `pedidos.drop("tienda")`
- [ ] `pedidos[pedidos["canal"].isin("tienda")]`
:::

:::ejercicio quiz
Después de `pedidos.sort_values("fecha_pedido")`, ¿cómo queda `pedidos`?
- [ ] Ordenada por fecha
- [x] Igual que antes: sort_values devuelve una tabla nueva
- [ ] Vacía
- [ ] Con una columna nueva
:::
