---
titulo: Agrupar y resumir - groupby, agg y pivot_table para responder preguntas de negocio
nivel: 3 · Intermedio
duracion: 50
resumen: La operación central del análisis de datos. Cómo agrupar con groupby y calcular conteos, sumas, promedios y tasas por grupo, varias métricas a la vez con agg y nombres claros, agrupar por dos columnas, y armar tablas de doble entrada con pivot_table. Es el GROUP BY de SQL y la tabla dinámica de Excel, en una línea.
objetivos: Agrupar con groupby y calcular size, sum, mean | Calcular tasas por grupo con el promedio de una condición | Calcular varias métricas con agg y nombrarlas | Agrupar por dos columnas y usar reset_index | Construir tablas de doble entrada con pivot_table
prerrequisitos: jupyterlab-proyecto-perfil-de-pedidos
autoevaluacion: ¿Sabes contar pedidos por canal con groupby? | ¿Sabes calcular la tasa de cancelación de cada canal en una línea? | ¿Sabes nombrar las columnas de un agg? | ¿Sabes armar una tabla canal × estado?
---

:::analogia En palabras simples
`groupby` es separar las fichas en pilas (una por canal), hacer la misma cuenta en cada pila (contar, sumar, promediar) y juntar los resultados en una tabla. Esa idea ("separar, calcular, combinar") está detrás de la tabla dinámica de Excel, del GROUP BY de SQL y de casi todos los informes.
:::

Con `pedidos` cargado en un notebook de [JupyterLab de práctica](#/jupyter):

## Paso 1 — Contar por grupo

```python norun
pedidos.groupby("canal").size()
```

Da la cantidad de pedidos de cada canal (lo mismo que `value_counts`, pero ordenado por nombre). El patrón siempre es:

```text
df.groupby("columna_que_agrupa")["columna_que_calculo"].operación()
```

## Paso 2 — Una tasa por grupo

¿Qué porcentaje de pedidos cancela cada canal?

```python norun
pedidos["es_cancelado"] = pedidos["estado"] == "cancelado"
(pedidos.groupby("canal")["es_cancelado"].mean() * 100).round(1)
```

Resultado: app 8.9, telefono 7.4, tienda 7.8, web 7.8. El truco del proyecto anterior (`mean` de True/False = proporción), ahora para todos los grupos de una vez.

## Paso 3 — Varias métricas: agg con nombres

```python norun
resumen = pedidos.groupby("canal").agg(
    pedidos=("pedido_id", "count"),
    clientes=("cliente_id", "nunique"),
    tasa_cancelacion=("es_cancelado", "mean"),
)
resumen.sort_values("pedidos", ascending=False)
```

Cada línea es `nombre_nuevo=("columna", "operación")`. Operaciones comunes: `count`, `sum`, `mean`, `median`, `min`, `max`, `nunique`.

:::tip Nombres claros desde el principio
Con `agg(nombre=(...))` la tabla sale con columnas que se entienden (`pedidos`, `clientes`, `tasa_cancelacion`) en lugar de nombres repetidos. Es la diferencia entre una tabla que copias a un informe y una que hay que rehacer.
:::

## Paso 4 — Agrupar por dos columnas

```python norun
pedidos.groupby(["canal", "estado"]).size().reset_index(name="pedidos")
```

`reset_index` convierte el resultado agrupado en una tabla común, con `canal`, `estado` y `pedidos` como columnas: el formato "largo" que piden Power BI, SQL y los gráficos.

## Paso 5 — Tabla de doble entrada: pivot_table

```python norun
pd.pivot_table(pedidos, index="canal", columns="estado", values="pedido_id", aggfunc="count", margins=True)
```

```captura
archivo: jupyter/e09-pivot.webp
texto: pivot_table: canal en filas, estado en columnas, y los totales (All) con margins=True
```

| Parámetro | Es como en Excel |
|---|---|
| `index` | Rows |
| `columns` | Columns |
| `values` + `aggfunc` | Values + Summarize by |
| `margins=True` | Grand Total (aquí se llama **All**) |

## Paso 6 — Un groupby que ya conoces

```python norun
entregados = pedidos[pedidos["estado"] == "entregado"]
entregados.groupby("canal").size().sort_values(ascending=False)
```

```captura
archivo: jupyter/04-groupby.webp
texto: Filtrar primero y agrupar después: pedidos entregados por canal
```

El orden importa: **filtrar → agrupar → ordenar**. Es el mismo orden que `WHERE → GROUP BY → ORDER BY` en SQL.

## Equivalencias

| pandas | SQL | Excel |
|---|---|---|
| `df.groupby("canal").size()` | `SELECT canal, COUNT(*) … GROUP BY canal` | Tabla dinámica, Count |
| `df.groupby("canal")["monto"].sum()` | `SUM(monto) … GROUP BY canal` | Tabla dinámica, Sum |
| `pd.pivot_table(df, index=…, columns=…)` | `GROUP BY` + pivot | Tabla dinámica con Columns |

## ✅ Lo que lograste

- Agrupaste y calculaste conteos, tasas y varias métricas.
- Agrupaste por dos columnas y armaste tablas de doble entrada.
- Relacionaste groupby con SQL y con las tablas dinámicas.

:::ejercicio quiz
¿Qué calcula `pedidos.groupby("metodo_pago")["pedido_id"].count()`?
- [ ] La suma de los ids por método
- [x] Cuántos pedidos hay con cada método de pago
- [ ] Los métodos de pago distintos
- [ ] El promedio de pedidos
:::

:::ejercicio quiz
Tienes la columna `es_cancelado` (True/False). ¿Qué da `pedidos.groupby("canal")["es_cancelado"].mean()`?
- [ ] La cantidad de cancelados por canal
- [x] La proporción de pedidos cancelados de cada canal
- [ ] Un error, porque no se promedian booleanos
- [ ] El canal con más cancelados
:::

:::ejercicio quiz
¿Qué agrega `margins=True` en pivot_table?
- [ ] Bordes a la tabla
- [x] Una fila y una columna All con los totales
- [ ] Porcentajes
- [ ] Las filas vacías
:::

:::ejercicio quiz
¿En qué orden se responde "pedidos entregados por canal, de mayor a menor"?
- [ ] Ordenar, agrupar, filtrar
- [x] Filtrar entregados, agrupar por canal, ordenar
- [ ] Agrupar, filtrar, ordenar
- [ ] Da igual el orden
:::
