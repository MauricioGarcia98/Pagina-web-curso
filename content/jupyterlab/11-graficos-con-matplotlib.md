---
titulo: Gráficos con pandas y matplotlib - barras, líneas e histogramas que se entienden
nivel: 3 · Intermedio
duracion: 45
resumen: Cómo graficar directo desde pandas con .plot, cuándo usar barras, líneas o histogramas, cómo poner títulos y etiquetas que digan algo, ordenar las barras, armar dos gráficos lado a lado con subplots y guardar la imagen para un informe con savefig.
objetivos: Graficar una Series o DataFrame con .plot(kind=...) | Elegir el tipo de gráfico según la pregunta | Agregar título, etiquetas y orden | Combinar gráficos con plt.subplots | Guardar un gráfico como imagen con savefig
prerrequisitos: jupyterlab-fechas-y-columnas-nuevas
autoevaluacion: ¿Sabes graficar pedidos por canal en una línea? | ¿Sabes qué gráfico usar para una evolución mensual? | ¿Sabes poner un título con la conclusión? | ¿Sabes guardar el gráfico como PNG?
---

:::analogia En palabras simples
En pandas, un gráfico es un paso más al final de la cuenta: primero calculas la tabla (por canal, por mes) y después le agregas `.plot()`. Si la tabla está bien, el gráfico sale solo; si sale raro, casi siempre el problema está en la tabla.
:::

## Paso 1 — Barras en una línea

```python norun
ax = pedidos["canal"].value_counts().plot(kind="bar", title="Pedidos por canal", figsize=(7, 3))
ax.set_ylabel("pedidos")
```

```captura
archivo: jupyter/e11-barras.webp
texto: value_counts().plot(kind="bar"): las barras ya salen ordenadas de mayor a menor
```

- `kind=`: `"bar"` (barras verticales), `"barh"` (horizontales), `"line"`, `"hist"`, `"pie"`.
- `figsize=(ancho, alto)` en pulgadas.
- `.plot` devuelve los **ejes** (`ax`): con ellos pones etiquetas (`set_ylabel`, `set_xlabel`, `set_title`).

## Paso 2 — Líneas para el tiempo

```python norun
pedidos["fecha_pedido"] = pd.to_datetime(pedidos["fecha_pedido"])
por_mes = pedidos.groupby(pedidos["fecha_pedido"].dt.to_period("M")).size()
por_mes.plot(title="Pedidos por mes", figsize=(8, 3))
```

```captura
archivo: jupyter/04-linea-por-mes.webp
texto: La evolución mensual: se ve el crecimiento y el pico de fin de año
```

## Paso 3 — Qué gráfico para qué pregunta

| Pregunta | Gráfico | En pandas |
|---|---|---|
| Comparar categorías | Barras (horizontales si los nombres son largos) | `kind="bar"` / `"barh"` |
| Evolución en el tiempo | Líneas | `kind="line"` |
| Cómo se distribuye un número (montos, tiempos) | Histograma | `kind="hist", bins=30` |
| Partes de un total, pocas categorías | Torta (con moderación) | `kind="pie"` |

## Paso 4 — Títulos que dicen la conclusión

```python norun
import matplotlib.pyplot as plt
tasa = (pedidos.assign(c=pedidos["estado"] == "cancelado").groupby("canal")["c"].mean() * 100).sort_values()
ax = tasa.plot(kind="barh", figsize=(7, 3), title="La app cancela más que el resto (% de pedidos)")
ax.set_xlabel("% cancelados")
plt.show()
```

:::tip Tres reglas
1. El título dice **la conclusión**, no el tema ("La app cancela más" y no "Cancelaciones por canal").
2. Las barras **ordenadas** (`sort_values`), salvo que sea tiempo.
3. En barras, el eje empieza en cero (pandas lo hace por defecto: no lo cambies para "exagerar" diferencias).
:::

## Paso 5 — Dos gráficos lado a lado

```python norun
fig, (izq, der) = plt.subplots(1, 2, figsize=(10, 3))
pedidos["canal"].value_counts().plot(kind="bar", ax=izq, title="Por canal")
pedidos["estado"].value_counts().plot(kind="bar", ax=der, title="Por estado")
plt.tight_layout()
```

`plt.subplots(filas, columnas)` crea una figura con varios ejes; a cada `.plot` le dices en cuál dibujar con `ax=`.

## Paso 6 — Guardar la imagen

```python norun
ax = por_mes.plot(title="Pedidos por mes", figsize=(8, 3))
ax.figure.savefig("pedidos_por_mes.png", dpi=150, bbox_inches="tight")
```

El PNG aparece en el explorador de archivos; clic derecho → **Download** para llevarlo a un informe o una presentación.

## ✅ Lo que lograste

- Graficas desde pandas eligiendo el tipo según la pregunta.
- Pones títulos con conclusión, etiquetas y orden.
- Combinas gráficos y guardas imágenes.

:::ejercicio quiz
¿Qué gráfico usas para mostrar cómo se distribuyen los importes de los pedidos?
- [ ] Torta
- [ ] Líneas
- [x] Histograma
- [ ] Barras por canal
:::

:::ejercicio quiz
¿Qué devuelve `serie.plot(kind="bar")`?
- [ ] Una imagen PNG
- [x] Los ejes (ax) del gráfico, para agregar etiquetas o guardarlo
- [ ] La tabla de datos
- [ ] Nada
:::

:::ejercicio quiz
¿Cuál es un buen título para el gráfico de tasa de cancelación por canal?
- [ ] "Gráfico 1"
- [ ] "Cancelaciones"
- [x] "La app cancela más que el resto (% de pedidos)"
- [ ] "Datos de pedidos 2022-2024"
:::
