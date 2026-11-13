---
titulo: Proyecto 3 (pedido con pistas) - el reporte comercial 2023 vs 2024 en un notebook
nivel: 3 · Intermedio
duracion: 90
resumen: La directora comercial quiere comparar 2024 contra 2023 - pedidos por estado, qué canal pierde más por cancelación y la evolución mensual - y que se pueda repetir el año que viene cambiando un solo valor. Recibes entregables y decides el código; las pistas están cerradas. Trabajas con los 12.000 pedidos, verificas con números de control y entregas notebook, gráfico y CSV.
objetivos: Traducir un pedido en tablas de resumen con groupby y pivot_table | Parametrizar el año de análisis en una variable | Calcular tasas por grupo y marcarlas contra un umbral | Graficar la evolución mensual con un título que concluye | Exportar resultados con to_csv y savefig
prerrequisitos: jupyterlab-graficos-con-matplotlib
autoevaluacion: ¿Sabes comparar dos años en una tabla? | ¿Sabes parametrizar un notebook? | ¿Sabes marcar los grupos que superan un umbral? | ¿Sabes exportar una tabla a CSV?
---

:::escenario El pedido
Mail de la directora comercial: *"Para el comité del jueves necesito ver cómo cerramos 2024 contra 2023: (1) cuántos pedidos hubo en cada estado, los dos años lado a lado; (2) de 2024, qué canal pierde más pedidos por cancelación; (3) la evolución mes a mes de 2024. Y que el año que viene lo podamos correr de nuevo sin rehacerlo."*
:::

Desde este proyecto **no hay pasos numerados**: hay entregables. Las pistas están cerradas; ábrelas solo si te trabas más de diez minutos.

## Estructura obligatoria del notebook

1. `# Reporte comercial` + contexto (Markdown).
2. **Parámetros**: una celda con `ANIO = 2024`, `ANIO_ANTERIOR = ANIO - 1` y `UMBRAL_CANCELACION = 8.0`. Ningún año ni umbral puede aparecer escrito en otro lugar del notebook.
3. Carga y preparación (`import pandas as pd`, `import numpy as np`, leer `datos/pedidos.csv` y convertir la fecha).
4. Una sección por entregable, con un subtítulo Markdown.
5. `## Conclusiones` con tres hallazgos con números.

## Entregable 1 — Estados por año

Una tabla con los estados en filas y los dos años en columnas (cantidad de pedidos), más una fila o columna de total.

<details><summary>💡 Pista</summary>

Convierte la fecha, crea `anio`, filtra los dos años con `isin([ANIO_ANTERIOR, ANIO])` y usa `pd.pivot_table(..., index="estado", columns="anio", values="pedido_id", aggfunc="count", margins=True)`.

</details>

## Entregable 2 — Cancelación por canal en el año

Por canal: pedidos del año, cancelados, % de cancelación y una columna `alerta` con `"revisar"` si supera el umbral (o vacío si no). Ordenada de mayor a menor tasa.

<details><summary>💡 Pista</summary>

```python norun
del_anio = pedidos[pedidos["anio"] == ANIO].assign(cancelado=lambda d: d["estado"] == "cancelado")
canal = del_anio.groupby("canal").agg(pedidos=("pedido_id", "count"), cancelados=("cancelado", "sum"))
canal["tasa"] = (canal["cancelados"] / canal["pedidos"] * 100).round(1)
canal["alerta"] = np.where(canal["tasa"] > UMBRAL_CANCELACION, "revisar", "")
```

</details>

## Entregable 3 — Evolución mensual

Pedidos por mes del año en un gráfico de líneas, con un título que diga la conclusión. Guarda la imagen como `pedidos_mensuales_{ANIO}.png`.

<details><summary>💡 Pista</summary>

`del_anio.groupby(del_anio["fecha_pedido"].dt.month).size()`, después `.plot(...)` y `ax.figure.savefig(f"pedidos_mensuales_{ANIO}.png", dpi=150, bbox_inches="tight")`. El `f` delante del texto reemplaza `{ANIO}` por su valor.

</details>

## Entregable 4 — Exportar

La tabla del entregable 2 como `cancelacion_por_canal_{ANIO}.csv` (con `to_csv`), para que el equipo de BI la cargue en Power BI.

<details><summary>💡 Pista</summary>

`canal.to_csv(f"cancelacion_por_canal_{ANIO}.csv")`. El archivo aparece en el explorador; clic derecho → Download.

</details>

## ✔ Números de control

| Control | 2023 | 2024 |
|---|---|---|
| Entregados | 3,115 | 3,597 |
| Cancelados | 332 | 371 |
| Pendientes | 168 | 183 |
| Total | 4,021 | 4,633 |

| Canal (2024) | Pedidos | Cancelados | % |
|---|---|---|---|
| app | 1,142 | 102 | 8.9 |
| web | 2,061 | 172 | 8.3 |
| tienda | 1,012 | 69 | 6.8 |
| telefono | 418 | 28 | 6.7 |

Pedidos por mes en 2024: enero **376**, julio **444**, diciembre **594**.

:::tip La prueba de la parametrización
Cambia `ANIO = 2024` por `ANIO = 2023`, **Restart Kernel and Run All Cells**, y el notebook entero tiene que funcionar y mostrar 2023 contra 2022 (y el CSV y el PNG con 2023 en el nombre). Si algo sigue diciendo 2024, quedó un año escrito a mano.
:::

## ✔ Lista de control antes de entregar

- [ ] Restart Kernel and Run All Cells corre sin errores.
- [ ] Ningún año ni umbral escrito fuera de la celda de parámetros.
- [ ] Los números coinciden con los de control.
- [ ] El gráfico tiene un título con la conclusión.
- [ ] Las conclusiones tienen tres hallazgos con números.
- [ ] Se generaron el PNG y el CSV con el año en el nombre.

## 🖥️ Hazlo también en JupyterLab real

En Jupyter real, este patrón (una celda de parámetros) es el que usa **papermill** para ejecutar el mismo notebook con distintos valores de forma automática, y el que usan los **widgets** de Databricks. Lo vemos en la lección 22.

:::ejercicio quiz
¿Por qué el año va en una variable `ANIO` y no escrito en cada celda?
- [ ] Porque pandas no acepta números en los filtros
- [x] Para repetir el reporte otro año cambiando un solo valor
- [ ] Para que el notebook ocupe menos
- [ ] Porque Jupyter lo exige
:::

:::ejercicio quiz
¿Qué hace `f"pedidos_mensuales_{ANIO}.png"` si ANIO vale 2024?
- [ ] Crea una carpeta
- [x] Da el texto pedidos_mensuales_2024.png
- [ ] Da error
- [ ] Guarda el gráfico
:::

:::ejercicio quiz
La tasa de cancelación de 2024 por canal se calcula como…
- [ ] cancelados del canal / cancelados totales
- [x] cancelados del canal en 2024 / pedidos del canal en 2024
- [ ] cancelados / entregados
- [ ] pedidos 2024 / pedidos 2023
:::
