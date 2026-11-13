---
titulo: Proyecto 2 (guiado, con pistas) - el perfil de la tabla de pedidos para el equipo
nivel: 2 · Básico-intermedio
duracion: 60
resumen: Entraste a un equipo de datos y la líder te pide un primer informe sobre la tabla de pedidos - tamaño, calidad, cómo se reparten los pedidos y qué llama la atención. Esta vez cada tarea dice qué averiguar, y el código está en pistas que abres solo si te trabas. Terminas con un notebook ordenado, números de control para verificar y un resumen en Markdown.
objetivos: Planificar un perfil de datos con preguntas | Responder con shape, info, isna, value_counts, filtros y nunique | Interpretar un nulo con significado | Calcular tasas con filtros | Redactar hallazgos en Markdown dentro del notebook
prerrequisitos: jupyterlab-seleccionar-filtrar-ordenar
autoevaluacion: ¿Sabes armar un perfil de una tabla? | ¿Sabes explicar por qué una columna tiene nulos? | ¿Sabes calcular un porcentaje con dos filtros? | ¿Sabes escribir hallazgos con números?
---

:::escenario El pedido
Mensaje de tu líder: *"Bienvenida/o al equipo. Para arrancar, armame un notebook con el perfil de la tabla de pedidos: qué tamaño tiene, qué calidad, cómo se reparten los pedidos y si ves algo raro. Mañana lo repasamos juntos."*
:::

En este proyecto **no hay capturas de cada clic**: ya sabes moverte. Cada tarea dice **qué** averiguar; el código está en la pista. Intenta primero sin abrirla.

## Preparación

1. Crea `perfil_pedidos.ipynb` y una celda Markdown con el título `# Perfil de la tabla pedidos` y una línea de contexto.
2. Una celda de código que cargue los datos:

```python norun
import pandas as pd
pedidos = pd.read_csv("datos/pedidos.csv")
```

Antes de cada tarea, agrega una celda Markdown con el subtítulo (`## 1. Tamaño`, `## 2. Calidad`…). Así el notebook se lee como un informe.

## Tarea 1 — Tamaño y estructura

¿Cuántas filas y columnas tiene? ¿Qué columnas y de qué tipo?

<details><summary>💡 Pista</summary>

`pedidos.shape` y `pedidos.info()`.

</details>

## Tarea 2 — Calidad: nulos

¿Qué columnas tienen nulos y cuántos? ¿**Por qué** están vacíos? (Investiga en qué canales falta el dato.)

<details><summary>💡 Pista</summary>

`pedidos.isna().sum()` para contar. Para el porqué: `pedidos[pedidos["empleado_id"].isna()]["canal"].value_counts()`.

</details>

## Tarea 3 — Período

¿Desde qué fecha hasta qué fecha hay pedidos?

<details><summary>💡 Pista</summary>

`pedidos["fecha_pedido"].min()` y `.max()`. Como las fechas están en formato ISO (`2024-03-15`), el mínimo y el máximo de texto coinciden con las fechas más vieja y más nueva.

</details>

## Tarea 4 — Cómo se reparten

Porcentaje de pedidos por **canal** y por **estado**, y el **método de pago** más usado.

<details><summary>💡 Pista</summary>

`pedidos["canal"].value_counts(normalize=True)`; lo mismo con `"estado"` y `"metodo_pago"`. Multiplica por 100 y usa `.round(1)` para que se lea mejor.

</details>

## Tarea 5 — Clientes

¿Cuántos clientes **distintos** hicieron pedidos? ¿Cuál hizo más pedidos y cuántos?

<details><summary>💡 Pista</summary>

`pedidos["cliente_id"].nunique()` cuenta valores distintos. `pedidos["cliente_id"].value_counts().head(1)` da el que más se repite.

</details>

## Tarea 6 — ¿Qué canal cancela más?

Calcula el **% de pedidos cancelados de cada canal** (cancelados del canal / pedidos del canal). Hazlo al menos para app y web.

<details><summary>💡 Pista</summary>

```python norun
app = pedidos[pedidos["canal"] == "app"]
(app["estado"] == "cancelado").mean() * 100
```

`(condición).mean()` es el porcentaje de `True`: un truco que vas a usar siempre. En el nivel 3 lo haces para todos los canales de una vez con `groupby`.

</details>

## Tarea 7 — Lo más reciente

Muestra los 5 pedidos más recientes, solo con las columnas `pedido_id`, `fecha_pedido`, `canal` y `estado`.

<details><summary>💡 Pista</summary>

`pedidos.sort_values("fecha_pedido", ascending=False)[["pedido_id", "fecha_pedido", "canal", "estado"]].head()`

</details>

## ✔ Números de control

| Control | Valor esperado |
|---|---|
| Filas, columnas | 12,000, 7 |
| Nulos en empleado_id | 8,373 (todos los pedidos de web y app) |
| Período | 2022-01-01 a 2024-12-31 |
| Web / app / tienda / teléfono | 45.0 % / 24.8 % / 22.0 % / 8.2 % |
| Entregados | 77.4 % |
| Método de pago más usado | tarjeta_credito (5,428) |
| Clientes distintos | 1,453 |
| Cliente con más pedidos | el 1367, con 38 |
| % cancelados app / web | 8.9 % / 7.8 % |

## Tarea 8 — Los hallazgos (Markdown)

Al final, una celda Markdown `## Hallazgos` con 3 a 5 puntos, cada uno con un número. Por ejemplo:

<details><summary>Ver un ejemplo (después de escribir los tuyos)</summary>

- La tabla tiene 12.000 pedidos de 2022 a 2024 y no tiene nulos salvo en `empleado_id`.
- `empleado_id` está vacío en el 70 % de los pedidos, pero no es un error: web y app no tienen vendedor.
- La web concentra el 45 % de los pedidos; el teléfono solo el 8 %.
- La app es el canal que más cancela (8,9 %), un punto más que la web.

</details>

## Entrega

1. **Kernel → Restart Kernel and Run All Cells**: todo corre de arriba abajo sin errores.
2. **File → Save** y **File → Download** el `.ipynb`.
3. Mensaje: *"Te paso el perfil de pedidos. Lo principal: tabla limpia salvo empleado_id (vacío con sentido en web/app) y la app cancela más que el resto."*

## 🖥️ Hazlo también en JupyterLab real

Exporta `pedidos.csv` desde la práctica (clic derecho en el explorador → **Download**), súbelo a Google Colab o a tu JupyterLab y ejecuta el mismo notebook. Si los números coinciden, tu notebook es reproducible.

:::ejercicio quiz
¿Qué devuelve `(pedidos["estado"] == "cancelado").mean()`?
- [ ] La cantidad de pedidos cancelados
- [x] La proporción de pedidos cancelados (entre 0 y 1)
- [ ] El promedio de pedido_id de los cancelados
- [ ] Un error
:::

:::ejercicio quiz
¿Qué cuenta `pedidos["cliente_id"].nunique()`?
- [ ] Cuántas filas tiene la tabla
- [x] Cuántos clientes distintos hicieron pedidos
- [ ] Cuántos clientes tienen un solo pedido
- [ ] Cuántos nulos tiene cliente_id
:::

:::ejercicio quiz
Encuentras 8.373 nulos en empleado_id. ¿Qué haces antes de borrarlos o rellenarlos?
- [ ] Los borro: un nulo siempre es un error
- [ ] Los relleno con 0
- [x] Investigo por qué faltan; acá son los pedidos sin vendedor (web y app)
- [ ] Borro la columna
:::
