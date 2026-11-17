---
titulo: El editor SQL - consultas, resultados, gráficos, parámetros y consultas guardadas
nivel: 2 · Básico-intermedio
duracion: 45
resumen: El SQL Editor es donde un analista o ingeniero pasa buena parte del día en Databricks. Pestañas, el navegador de esquemas, Run y Run selected, el límite de 1000 filas, el resultado como tabla y como gráfico, parámetros con dos puntos, guardar consultas en el workspace, la lista Queries y el historial de todo lo que corrió.
objetivos: Escribir y ejecutar consultas en el SQL Editor | Convertir un resultado en gráfico | Usar parámetros en una consulta | Guardar una consulta y encontrarla en Queries | Leer el Query History
prerrequisitos: databricks-paso-a-paso-proyecto-primer-analisis
autoevaluacion: ¿Sabes qué hace Run selected? | ¿Sabes por qué dice Run (1000)? | ¿Sabes escribir un parámetro? | ¿Sabes dónde quedan las consultas guardadas?
---

:::analogia En palabras simples
Si el notebook es un cuaderno para explorar y contar una historia, el editor SQL es la calculadora rápida: una pregunta, un resultado, un gráfico si hace falta, y guardar la consulta para la próxima vez.
:::

## Paso 1 — La pantalla

Menú **Lakehouse → SQL Editor**. Escribe:

```sql norun
SELECT canal, estado, COUNT(*) AS pedidos
FROM samples.tienda.pedidos
GROUP BY canal, estado
ORDER BY pedidos DESC
```

```captura
archivo: databricks/d05-editor.webp
texto: Pestañas (1), Run (2), el SQL warehouse que ejecuta (3), el editor (4) y el área de resultados (5)
```

| Parte | Para qué |
|---|---|
| **Pestañas** | Varias consultas abiertas a la vez; doble clic para renombrar |
| **Schema browser** (izquierda) | Los catálogos, esquemas y tablas; haz clic en una tabla para ver sus columnas |
| **Run (1000)** | Ejecuta toda la consulta; el 1000 es el límite de filas que trae a la pantalla |
| **Run selected** | Ejecuta solo el texto seleccionado: ideal para probar una parte de una consulta larga |
| **Format** | Ordena el SQL con mayúsculas y sangrías |
| **Warehouse** (3) | El cómputo para SQL: **Serverless Starter Warehouse** está siempre listo |

## Paso 2 — Ejecutar y leer el resultado

**Run** (o **Ctrl + Enter**):

```captura
archivo: databricks/d05-resultado.webp
texto: El resultado - pestaña Table, el botón + para gráficos, cantidad de filas y descarga
```

Debajo de la tabla ves cuántas filas devolvió y cuánto tardó. El ícono de descarga baja el resultado como CSV.

:::cuidado El límite de 1000 filas es de la pantalla, no de la consulta
Si tu consulta devuelve 50 000 filas, el motor las calcula todas pero el editor muestra 1000. Para un total, agrupa o cuenta en SQL; no cuentes filas en pantalla.
:::

## Paso 3 — Un gráfico del resultado

El **+** junto a **Table** abre el editor de visualizaciones:

```captura
archivo: databricks/d05-visualizacion.webp
texto: Tipo Bar (1), eje X canal (2), eje Y pedidos (3) y la vista previa (4)
```

```captura
archivo: databricks/d05-grafico.webp
texto: El gráfico queda como una pestaña junto a Table
```

Tipos disponibles: barras, líneas, área, torta, dispersión y contador (un solo número grande, para KPIs).

## Paso 4 — Parámetros

Un parámetro es un valor que se completa antes de ejecutar. Se escribe con dos puntos:

```sql norun
SELECT estado, COUNT(*) AS pedidos
FROM samples.tienda.pedidos
WHERE canal = :canal
GROUP BY estado
ORDER BY pedidos DESC
```

```captura
archivo: databricks/d05-parametros.webp
texto: El campo canal aparece arriba del editor (1); con app, el resultado (2) muestra 2261 entregados y 266 cancelados
```

Sirve para que otra persona use tu consulta sin tocar el SQL: cambia el valor y ejecuta.

## Paso 5 — Guardar y volver a encontrar

**Save** guarda la consulta en el workspace:

```captura
archivo: databricks/d05-guardar.webp
texto: Nombre (1) y carpeta (2) donde se guarda
```

Menú **Lakehouse → Queries** lista las consultas guardadas, y **Query History** todo lo que se ejecutó (desde el editor, los notebooks, los dashboards), con duración y estado:

```captura
archivo: databricks/d05-consultas.webp
texto: Queries - las consultas guardadas, con su carpeta y fecha
```

```captura
archivo: databricks/d05-historial.webp
texto: Query History - cada ejecución, de dónde vino y cuánto tardó
```

:::tip El historial es tu primera herramienta de diagnóstico
"¿Por qué el tablero está lento?" → **Query History**, ordena por duración. "¿Quién borró esa tabla?" → busca `DROP` en el historial. En Databricks real guarda 30 días y se puede consultar como tabla (`system.query.history`).
:::

:::errores
- **Confundir "Run (1000)" con lo que se lee.** El límite es de filas mostradas; la consulta puede leer toda la tabla.
- **Parámetros con `@` o `$`.** En Databricks SQL se escriben como `:pais`.
- **Buscar consultas de dashboards en Queries.** Las ejecuciones están en Query History.
:::

## ✅ Lo que lograste

- Ejecutas consultas y lees los resultados con sus límites.
- Haces gráficos y usas parámetros.
- Guardas consultas y las encuentras en Queries y en el historial.

:::ejercicio quiz
Tienes una consulta larga y quieres probar solo el SELECT interno. ¿Qué usas?
- [ ] Run
- [x] Seleccionas ese texto y usas Run selected
- [ ] Format
- [ ] Save
:::

:::ejercicio quiz
¿Qué significa "Run (1000)"?
- [ ] Que la consulta tarda 1000 ms
- [x] Que el editor muestra como máximo 1000 filas del resultado
- [ ] Que la consulta se repite 1000 veces
- [ ] Que solo lee 1000 filas de la tabla
:::

:::ejercicio quiz
¿Cómo se escribe un parámetro llamado pais?
- [ ] @pais
- [x] :pais
- [ ] $pais
- [ ] {pais}
:::

:::ejercicio quiz
¿Dónde ves cuánto tardó una consulta que corrió ayer desde un dashboard?
- [ ] En Queries
- [x] En Query History
- [ ] En Compute
- [ ] No se puede
:::
