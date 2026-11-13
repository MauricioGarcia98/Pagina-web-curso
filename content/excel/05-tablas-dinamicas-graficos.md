---
titulo: Tablas dinámicas y gráficos - resumir miles de filas en segundos
nivel: Intermedio
duracion: 40
resumen: Cómo crear una tabla dinámica (PivotTable) paso a paso, qué va en Rows, Columns y Values, cómo leer los totales generales y cómo convertir el resumen en un gráfico de columnas o de torta. Con su equivalente en SQL para que veas que es la misma idea.
objetivos: Crear una tabla dinámica eligiendo filas, columnas, valores y operación | Leer los totales generales de una tabla dinámica | Graficar un resumen con columnas y con torta | Relacionar una tabla dinámica con GROUP BY de SQL
prerrequisitos: excel-ordenar-filtrar-limpiar
autoevaluacion: ¿Sabes qué va en Rows y qué en Values? | ¿Sabes qué significa Grand Total? | ¿Sabes qué gráfico usar para comparar canales? | ¿Sabes escribir la misma pregunta en SQL?
---

:::analogia En palabras simples
Una tabla dinámica es como pedirle a alguien: "agrupame los pedidos por canal y decime cuántos hay de cada estado". Tú eliges cómo agrupar; Excel cuenta, suma y arma la tabla.
:::

## Paso 1 — Abre el asistente de tabla dinámica

1. Ve a la hoja **pedidos** (pestaña de abajo).
2. Haz clic en cualquier celda de la tabla.
3. Pestaña **Insert** → **PivotTable**.

## Paso 2 — Elige qué resumir

En el diálogo:

1. **Rows**: `canal` (una fila por canal).
2. **Columns**: `estado` (una columna por estado). Es opcional.
3. **Values**: `pedido_id` (lo que se va a contar).
4. **Summarize by**: `Count` (contar).

```captura
archivo: excel/05-pivot-dialogo.webp
texto: (1) filas, (2) columnas, (3) valor y (4) operación
```

5. Presiona **OK**.

## Paso 3 — Lee el resultado

Se crea una hoja nueva, **PivotTable**:

```captura
archivo: excel/05-pivot-resultado.webp
texto: La tabla dinámica en su propia hoja
```

| Parte | Qué es |
|---|---|
| Fila `app` / columna `entregado` | Pedidos de la app que están entregados |
| Columna **Grand Total** | Total de cada canal (suma de la fila) |
| Fila **Grand Total** | Total de cada estado (suma de la columna) |
| Esquina inferior derecha | El total general: los 12.000 pedidos |

:::tip Es un GROUP BY
Esta tabla es lo mismo que en SQL:

```sql
SELECT canal, estado, COUNT(pedido_id) AS pedidos
FROM pedidos
GROUP BY canal, estado;
```

Si ya sabes una, sabes la otra.
:::

:::cuidado Es una foto del momento
En esta réplica la tabla dinámica es un resumen fijo: si cambian los datos, vuelve a crearla. En Excel real se actualiza con **Refresh** (clic derecho → Refresh).
:::

## Paso 4 — Grafica el resumen

1. En la hoja **PivotTable**, haz clic dentro de la tabla (por ejemplo en **A4**).
2. Pestaña **Insert** → **Column**.
3. Aparece un gráfico de columnas, con una serie por estado. Arrástralo por el título para moverlo; la ✕ lo borra.

```captura
archivo: excel/05-grafico.webp
texto: El gráfico de columnas creado desde la tabla dinámica
```

## Paso 5 — Un gráfico de torta

La torta sirve para mostrar **partes de un total** con pocas categorías.

1. Vuelve a **pedidos** y crea otra tabla dinámica: Rows = `metodo_pago`, Values = `pedido_id`, Count.
2. Haz clic dentro del resultado y elige **Insert → Pie**.

```captura
archivo: excel/05-torta.webp
texto: La proporción de pedidos por método de pago
```

| Quieres mostrar | Gráfico |
|---|---|
| Comparar categorías | Columnas o barras |
| Evolución en el tiempo | Líneas |
| Partes de un total, con pocas categorías | Torta |

## ✅ Lo que lograste

- Creaste una tabla dinámica y leíste sus totales.
- La convertiste en gráficos.
- Viste que es la misma idea que un GROUP BY.

:::ejercicio quiz
Quieres una fila por cada país y la suma de ventas. ¿Qué pones en Rows y qué en Values?
- [ ] Rows: ventas · Values: país (Count)
- [x] Rows: país · Values: ventas (Sum)
- [ ] Rows y Values: país
- [ ] Solo Columns: país
:::

:::ejercicio quiz
En una tabla dinámica, ¿qué es la columna Grand Total?
- [ ] El valor máximo de cada fila
- [x] La suma de cada fila
- [ ] La cantidad de columnas
- [ ] El promedio general
:::

:::ejercicio quiz
¿Qué gráfico conviene para mostrar cómo evolucionaron las ventas mes a mes?
- [ ] Torta
- [x] Líneas
- [ ] Ninguno: se muestra en una tabla
- [ ] Barras horizontales sin orden
:::
