---
titulo: Fechas y columnas nuevas - to_datetime, año, mes, día de la semana y columnas calculadas
nivel: 3 · Intermedio
duracion: 50
resumen: Casi todo análisis termina en "por mes" o "por año". Cómo convertir texto a fecha con to_datetime, sacar año, mes, período y día de la semana con .dt, filtrar por rangos de fechas, calcular diferencias en días, y crear columnas nuevas con operaciones, np.where, map y assign, sin bucles.
objetivos: Convertir una columna de texto a fecha con to_datetime | Extraer año, mes, período y día de la semana con .dt | Filtrar por un rango de fechas | Crear columnas con operaciones vectorizadas, np.where y map | Encadenar transformaciones con assign
prerrequisitos: jupyterlab-agrupar-y-resumir
autoevaluacion: ¿Sabes por qué hay que convertir la fecha antes de usar .dt? | ¿Sabes agrupar pedidos por mes sin mezclar años? | ¿Sabes crear una columna con dos valores según una condición? | ¿Sabes traducir códigos con map?
---

:::analogia En palabras simples
Una fecha guardada como texto (`"2024-03-15"`) es como una palabra: se puede leer, pero no se puede preguntar "¿en qué mes cae?". `to_datetime` la convierte en una fecha de verdad, y desde ahí `.dt` te deja preguntarle el año, el mes o el día de la semana.
:::

## Paso 1 — De texto a fecha

```python norun
pedidos["fecha_pedido"].dtype
```

Dice `object` o `str`: es texto. Conviértela:

```python norun
pedidos["fecha_pedido"] = pd.to_datetime(pedidos["fecha_pedido"])
pedidos["anio"] = pedidos["fecha_pedido"].dt.year
pedidos.groupby("anio").size()
```

```captura
archivo: jupyter/e10-fechas.webp
texto: Con la fecha convertida, .dt.year saca el año: 3.346, 4.021 y 4.633 pedidos
```

:::tip Convertir al cargar
`pd.read_csv("datos/pedidos.csv", parse_dates=["fecha_pedido"])` convierte la columna en el mismo paso de la carga.
:::

## Paso 2 — Lo que .dt sabe responder

| Escribes | Con 2024-03-15 da |
|---|---|
| `.dt.year` | 2024 |
| `.dt.month` | 3 |
| `.dt.day` | 15 |
| `.dt.day_name()` | Friday |
| `.dt.dayofweek` | 4 (lunes = 0) |
| `.dt.to_period("M")` | 2024-03 (año-mes: para agrupar por mes sin mezclar años) |
| `.dt.quarter` | 1 |

¿Qué día de la semana tiene más pedidos?

```python norun
pedidos["fecha_pedido"].dt.day_name().value_counts()
```

## Paso 3 — Filtrar por fechas

```python norun
pedidos_2024 = pedidos[(pedidos["fecha_pedido"] >= "2024-01-01") & (pedidos["fecha_pedido"] < "2025-01-01")]
len(pedidos_2024)
```

Da 4.633. Igual que en Excel y SQL: "mayor o igual al primer día" y "menor al primer día del período siguiente". Con la columna `anio` también vale `pedidos[pedidos["anio"] == 2024]`.

## Paso 4 — Diferencias entre fechas

```python norun
clientes = pd.read_csv("datos/clientes.csv", parse_dates=["fecha_registro"])
corte = pd.Timestamp("2024-12-31")
clientes["dias_cliente"] = (corte - clientes["fecha_registro"]).dt.days
clientes["dias_cliente"].describe()
```

Restar fechas da una duración (*timedelta*); `.dt.days` la pasa a días. Usa una **fecha de corte fija** en lugar de "hoy", para que el análisis se pueda repetir.

## Paso 5 — Columnas calculadas sin bucles

| Quieres | Escribes |
|---|---|
| Operación entre columnas | `df["total"] = df["cantidad"] * df["precio"]` |
| Dos valores según una condición | `df["tipo"] = np.where(df["canal"].isin(["web", "app"]), "online", "presencial")` |
| Traducir códigos | `df["canal_es"] = df["canal"].map({"web": "Web", "app": "App", "tienda": "Tienda", "telefono": "Teléfono"})` |
| Más de dos casos | `np.select([cond1, cond2], ["a", "b"], default="c")` |

(`np` es numpy: `import numpy as np`.)

:::cuidado Evita los bucles for sobre filas
`for i, fila in df.iterrows(): ...` funciona, pero es cientos de veces más lento que una operación sobre la columna entera. Con 12.000 filas no se nota; con 12 millones, sí. En pandas se piensa en columnas, no en filas (lo medimos en la lección 19).
:::

## Paso 6 — Encadenar con assign

```python norun
resumen_mes = (
    pedidos
    .assign(mes=pedidos["fecha_pedido"].dt.to_period("M"))
    .query("anio == 2024")
    .groupby("mes")
    .size()
)
resumen_mes
```

Cada línea es un paso y se lee de arriba abajo, como una receta. `assign` crea columnas sin modificar `pedidos`; `query` filtra con una condición escrita como texto.

## ✅ Lo que lograste

- Conviertes texto a fecha y extraes año, mes, período y día.
- Filtras por rangos y calculas diferencias en días.
- Creas columnas calculadas sin bucles y encadenas transformaciones.

:::ejercicio quiz
Escribes `pedidos["fecha_pedido"].dt.year` y da `AttributeError: Can only use .dt accessor with datetimelike values`. ¿Por qué?
- [ ] Porque la columna tiene nulos
- [x] Porque la columna todavía es texto: falta pd.to_datetime
- [ ] Porque .dt solo existe en Excel
- [ ] Porque hay que importar datetime
:::

:::ejercicio quiz
¿Qué conviene para agrupar por mes sin mezclar años?
- [ ] `.dt.month`
- [x] `.dt.to_period("M")`
- [ ] `.dt.day`
- [ ] `.dt.day_name()`
:::

:::ejercicio quiz
¿Cuál crea la columna `tipo` con "online" para web y app, y "presencial" para el resto?
- [ ] `df["tipo"] = "online" if df["canal"] in ["web","app"] else "presencial"`
- [x] `df["tipo"] = np.where(df["canal"].isin(["web", "app"]), "online", "presencial")`
- [ ] `df["tipo"] = df["canal"].replace("online")`
- [ ] `df["tipo"] = df.groupby("canal")`
:::
