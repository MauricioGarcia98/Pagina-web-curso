---
titulo: Tablas dinámicas - resumir miles de filas sin escribir fórmulas
nivel: 5 · Avanzado
duracion: 50
resumen: La herramienta de análisis más usada de Excel. Cómo crear una tabla dinámica (PivotTable), qué va en Rows, Columns y Values, cuándo contar y cuándo sumar o promediar, cómo leer los totales y cómo comprobar el resultado contra tus fórmulas. Con su equivalente en SQL, sobre pedidos, pagos y clientes reales.
objetivos: Crear una tabla dinámica eligiendo filas, columnas, valores y operación | Elegir entre Count, Sum, Average, Max y Min según la pregunta | Leer los totales generales | Verificar una tabla dinámica contra COUNTIFS o SUMIFS | Relacionar una tabla dinámica con GROUP BY
prerrequisitos: excel-proyecto-unir-y-limpiar
autoevaluacion: ¿Sabes qué va en Rows y qué en Values? | ¿Sabes cuándo usar Count y cuándo Sum? | ¿Sabes qué significa Grand Total? | ¿Sabes escribir la misma pregunta en SQL?
---

:::analogia En palabras simples
Una tabla dinámica es como pedirle a alguien: "agrupame los pedidos por canal y decime cuántos hay de cada estado". Tú eliges **cómo agrupar** y **qué calcular**; Excel cuenta, suma y arma la tabla. Es la misma pregunta que hiciste con COUNTIFS en el nivel 3, pero sin escribir una fórmula por celda.
:::

## Paso 1 — Abre el asistente

1. Ve a la hoja **pedidos** (Data → Get Data → pedidos si no la tienes).
2. Haz clic en cualquier celda de la tabla.
3. Pestaña **Insert** → **PivotTable**.

## Paso 2 — Elige qué resumir

1. **Rows**: `canal` (una fila por canal).
2. **Columns**: `estado` (una columna por estado). Es opcional.
3. **Values**: `pedido_id` (lo que se va a contar).
4. **Summarize by**: `Count`.

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

Si sabes una, sabes la otra. En Power BI, una matriz con canal en filas y estado en columnas hace exactamente lo mismo.
:::

## Paso 4 — Count, Sum, Average: ¿qué operación?

| Pregunta | Values | Summarize by |
|---|---|---|
| ¿Cuántos pedidos hay por canal? | pedido_id | **Count** |
| ¿Cuánta plata entró por estado de pago? | monto | **Sum** |
| ¿Cuál es el pago promedio? | monto | **Average** |
| ¿Cuál fue el pago más grande? | monto | **Max** |

Pruébalo con dinero:

1. Ve a la hoja **pagos** (Data → Get Data → pagos).
2. Insert → PivotTable: Rows = `estado`, Values = `monto`, Summarize by = **Sum** → OK.
3. El total de **aprobado** debe ser **12,848,059.57**: el mismo número que te dio `SUMIF` en la lección 10.

:::cuidado Contar un número no es sumarlo
Si eliges Values = `pedido_id` con **Sum**, Excel suma los números de pedido (1 + 2 + 3…): un resultado sin sentido. Los ids se **cuentan**; los montos y las cantidades se **suman**.
:::

## Paso 5 — Verifica siempre

Una tabla dinámica es tan confiable como los datos y los campos que elegiste. Antes de entregar, compara una celda contra una fórmula:

| Celda de la tabla dinámica | Fórmula de control | Debe dar |
|---|---|---|
| web / cancelado | `=COUNTIFS(pedidos!F:F,"web",pedidos!E:E,"cancelado")` | lo mismo |
| Total general | `=COUNTA(pedidos!A:A)-1` | 12,000 |
| aprobado (Sum de monto) | `=SUMIF(pagos!E:E,"aprobado",pagos!D:D)` | 12,848,059.57 |

Si no coinciden, lo más común es haber elegido otro campo en Values o haber creado la tabla con otra hoja activa.

## Paso 6 — Una por cliente: país y segmento

1. Carga **clientes** y crea una tabla dinámica: Rows = `pais`, Values = `cliente_id`, **Count**.
2. ¿Qué país tiene más clientes? (México, 387.)
3. Otra: Rows = `pais`, Columns = `segmento`, Values = `cliente_id`, Count. Ahora ves cuántos clientes Corporativo, Consumidor y Pyme hay en cada país.

:::cuidado Es una foto del momento
En esta réplica la tabla dinámica es un resumen fijo: si cambian los datos, vuelve a crearla. En Excel real se actualiza con **clic derecho → Refresh** (o **Data → Refresh All**), pero tampoco lo hace sola: si te olvidas de actualizar, presentas números viejos.
:::

## Paso 7 — En Excel real hay más

En Excel real, el panel **PivotTable Fields** permite arrastrar campos a cuatro zonas (Filters, Columns, Rows, Values), agrupar fechas por mes o año con un clic derecho → **Group**, mostrar valores como **% del total** (**Show Values As**) y agregar **segmentaciones** (Slicers) para filtrar con botones. Lo vemos en la lección 23.

## ✅ Lo que lograste

- Creaste tablas dinámicas que cuentan, suman y promedian.
- Las verificaste contra fórmulas.
- Viste que una tabla dinámica es un GROUP BY.

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
Eliges Values = pedido_id y Summarize by = Sum. ¿Qué obtienes?
- [ ] La cantidad de pedidos
- [x] La suma de los números de pedido: un número sin significado
- [ ] El monto vendido
- [ ] Un error
:::

:::ejercicio quiz
¿Cuál es el equivalente en SQL de una tabla dinámica con Rows = canal y Values = pedido_id (Count)?
- [ ] `SELECT canal FROM pedidos ORDER BY canal`
- [x] `SELECT canal, COUNT(pedido_id) FROM pedidos GROUP BY canal`
- [ ] `SELECT COUNT(*) FROM pedidos`
- [ ] `SELECT DISTINCT canal FROM pedidos`
:::
