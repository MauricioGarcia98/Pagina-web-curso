---
titulo: Rendimiento y buenas prácticas en pandas - vectorizar, medir, ahorrar memoria y evitar trampas
nivel: 5 · Avanzado
duracion: 45
resumen: Lo que separa un notebook que tarda horas de uno que tarda segundos, y uno que da resultados raros de uno confiable. Medir con %timeit, reemplazar bucles por operaciones vectorizadas, reducir memoria con tipos adecuados (category, enteros chicos), leer solo lo necesario, la advertencia SettingWithCopy y cuándo pandas deja de ser la herramienta correcta.
objetivos: Medir el tiempo de una celda o una línea con %timeit | Reemplazar bucles e iterrows por operaciones vectorizadas | Medir y reducir memoria con memory_usage y category | Leer solo columnas y filas necesarias | Evitar la advertencia SettingWithCopy usando loc y copy
prerrequisitos: jupyterlab-funciones-y-modulos
autoevaluacion: ¿Sabes medir cuánto tarda una línea? | ¿Sabes por qué iterrows es lento? | ¿Sabes cuánta memoria usa un DataFrame? | ¿Sabes cuándo pasar de pandas a SQL o Spark?
---

:::analogia En palabras simples
Un bucle sobre filas es como pagar en el supermercado producto por producto, haciendo una fila nueva cada vez. Una operación vectorizada es pasar todo el carrito por la caja de una vez. Con 10 productos da igual; con 10 millones, es la diferencia entre segundos y horas.
:::

## Paso 1 — Mide antes de optimizar

```python norun
%timeit pedidos["estado"].value_counts()
```

`%timeit` ejecuta la línea muchas veces y da el promedio (por ejemplo `512 µs ± 8 µs per loop`). Para medir una celda entera, `%%timeit` en la primera línea. Optimiza solo lo que medido es lento.

## Paso 2 — Vectorizar en lugar de recorrer filas

Calcular el importe de cada línea del detalle, de dos formas:

```python norun
detalle = pd.read_csv("datos/detalle_pedidos.csv")

def con_bucle(df):
    out = []
    for _, fila in df.iterrows():
        out.append(fila["cantidad"] * fila["precio_unitario"] * (1 - fila["descuento"]))
    return out

%timeit -n 1 -r 1 con_bucle(detalle)
%timeit detalle["cantidad"] * detalle["precio_unitario"] * (1 - detalle["descuento"])
```

La versión vectorizada (la segunda) es **cientos de veces más rápida**: pandas hace la cuenta en C sobre la columna entera.

| En lugar de | Usa |
|---|---|
| `for` + `iterrows` | Operaciones entre columnas |
| `if` dentro de un bucle | `np.where`, `np.select` |
| `apply` con una función simple | El método vectorizado (`.str`, `.dt`, aritmética) |
| Varios `merge` dentro de un bucle | Un solo merge con la tabla completa |

:::tip apply no es vectorizar
`df["x"].apply(funcion)` se lee lindo, pero por dentro es un bucle. Úsalo cuando no hay alternativa vectorizada (lógica compleja), no por costumbre.
:::

## Paso 3 — Memoria

```python norun
pedidos.memory_usage(deep=True).sum() / 1e6     # megabytes
pedidos.memory_usage(deep=True)
```

Las columnas de texto ocupan mucho. Si tienen pocos valores distintos (canal, estado, método de pago), conviértelas a `category`:

```python norun
for col in ["estado", "canal", "metodo_pago"]:
    pedidos[col] = pedidos[col].astype("category")
pedidos.memory_usage(deep=True).sum() / 1e6
```

La tabla pasa a ocupar una fracción. Con archivos de millones de filas, es la diferencia entre que el kernel se quede sin memoria o no.

## Paso 4 — Lee solo lo que necesitas

```python norun
pd.read_csv("datos/pedidos.csv", usecols=["pedido_id", "fecha_pedido", "estado"], dtype={"estado": "category"})
```

| Parámetro | Para |
|---|---|
| `usecols=[...]` | Leer solo algunas columnas |
| `dtype={...}` | Fijar tipos al leer (y ahorrar memoria) |
| `parse_dates=[...]` | Convertir fechas al leer |
| `nrows=1000` | Probar con las primeras filas |
| `chunksize=100_000` | Procesar archivos enormes por partes |

## Paso 5 — La advertencia SettingWithCopy

```python norun
web = pedidos[pedidos["canal"] == "web"]
web["tipo"] = "online"      # en pandas 2: ⚠ SettingWithCopyWarning
```

Con pandas 2 (todavía muy usado en empresas), pandas avisa que `web` podría ser una "vista" de `pedidos` y no sabe si querías modificar la original. Las dos formas correctas:

```python norun
web = pedidos[pedidos["canal"] == "web"].copy()   # quiero una tabla nueva
web["tipo"] = "online"

pedidos.loc[pedidos["canal"] == "web", "tipo"] = "online"   # quiero modificar la original
```

:::nota pandas 3 y Copy-on-Write
Desde pandas 3.0, el modo *Copy-on-Write* está activado siempre: modificar un filtro nunca cambia la tabla original y esta advertencia desaparece. Esta práctica usa pandas 3, así que aquí no la vas a ver; sí en muchos entornos de trabajo con pandas 2. Con `.copy()` o `loc` tu código es claro en las dos versiones.
:::

## Paso 6 — Cuándo pandas ya no alcanza

| Situación | Herramienta |
|---|---|
| Hasta algunos millones de filas en memoria | pandas |
| Archivos más grandes que la memoria en una sola máquina | DuckDB o Polars (desde el mismo notebook) |
| Datos en una base de datos | SQL: lleva a pandas solo el resultado agregado |
| Decenas o cientos de millones de filas, procesos diarios | Spark (Databricks, Fabric) |

Lo que aprendiste (filtrar, agrupar, unir) es igual en todas: cambia la sintaxis. Puedes compararlo en los módulos [SQL](#/m/sql) y [PySpark](#/m/pyspark).

## ✅ Lo que lograste

- Mides tiempos y optimizas lo que de verdad es lento.
- Vectorizas en lugar de recorrer filas.
- Reduces memoria y lees solo lo necesario.
- Evitas SettingWithCopy y sabes cuándo cambiar de herramienta.

:::ejercicio quiz
¿Cuál es la forma más rápida de calcular `cantidad * precio` para un millón de filas?
- [ ] Un for con iterrows
- [ ] apply con una función lambda
- [x] `df["cantidad"] * df["precio"]`
- [ ] Un for sobre range(len(df))
:::

:::ejercicio quiz
¿Qué columnas conviene pasar a category?
- [ ] Las de ids únicos
- [x] Las de texto con pocos valores distintos (canal, estado)
- [ ] Las de montos
- [ ] Todas
:::

:::ejercicio quiz
Aparece SettingWithCopyWarning al crear una columna en un filtro. ¿Qué haces si quieres una tabla nueva?
- [ ] Ignorarla siempre
- [x] Agregar .copy() al filtro antes de crear la columna
- [ ] Reiniciar el kernel
- [ ] Usar iterrows
:::
