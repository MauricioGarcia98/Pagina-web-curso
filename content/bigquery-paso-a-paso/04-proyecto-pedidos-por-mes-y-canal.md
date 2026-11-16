---
titulo: Proyecto 1 (guiado) - pedidos por mes y canal
nivel: 1 · Básico
duracion: 40
resumen: Comercial pide los pedidos del segundo semestre por mes y canal en una sola tabla. Escribes la consulta con DATE_TRUNC y COUNTIF, compruebas la estimación, la ejecutas e interpretas el resultado, y aprendes a leer los errores de GoogleSQL. Guiado paso a paso.
objetivos: Agrupar por mes con DATE_TRUNC | Pivotear con COUNTIF | Comprobar la estimación antes de ejecutar | Leer un error de GoogleSQL
prerrequisitos: bigquery-paso-a-paso-explorar-tablas
autoevaluacion: ¿Sabes qué hace DATE_TRUNC(fecha, MONTH)? | ¿Sabes qué cuenta COUNTIF? | ¿Sabes por qué el filtro de fecha bajó la estimación? | ¿Sabes qué significa "must be qualified with a dataset"?
---

:::escenario El pedido
Comercial: *"Quiero ver, mes a mes desde julio, cuántos pedidos entraron por web, app y tienda, y el total. En una tabla, una fila por mes."*
:::

## Paso 1 — La consulta

```sql norun
SELECT DATE_TRUNC(fecha_pedido, MONTH) AS mes,
       COUNTIF(canal = 'web') AS web,
       COUNTIF(canal = 'app') AS app,
       COUNTIF(canal = 'tienda') AS tienda,
       COUNT(*) AS total
FROM `tienda-andina-dev.tienda.pedidos`
WHERE fecha_pedido >= '2024-07-01'
GROUP BY mes
ORDER BY mes;
```

| Parte | Qué hace |
|---|---|
| `DATE_TRUNC(fecha_pedido, MONTH)` | Lleva cada fecha al primer día de su mes |
| `COUNTIF(condición)` | Cuenta solo las filas que cumplen la condición: una columna por canal |
| `WHERE fecha_pedido >= '2024-07-01'` | Filtra por la columna de partición: lee menos datos |

## Paso 2 — El resultado

```captura
archivo: bigquery/q04-resultado.webp
texto: La consulta (1) y una fila por mes con los pedidos por canal y el total (2)
```

El validador marca unos 15 KB: mucho menos que la tabla entera, porque lee 2 columnas y solo las particiones desde julio.

## Paso 3 — Un error a propósito

Escribe `FROM pedidos` sin el dataset:

```captura
archivo: bigquery/q04-error.webp
texto: El validador avisa antes de ejecutar - Table "pedidos" must be qualified with a dataset
```

| Error típico | Causa |
|---|---|
| `must be qualified with a dataset` | Falta el dataset: `tienda.pedidos` |
| `Not found: Table ...` | El nombre está mal o el dataset está en otra región |
| `Unrecognized name: x` | Esa columna no existe (o el alias está mal) |
| `SELECT list expression references column x which is neither grouped nor aggregated` | Falta `x` en el `GROUP BY` |

El validador muestra el error **antes** de gastar nada.

:::errores
- **Envolver la fecha en una función para filtrar** (`EXTRACT(MONTH FROM fecha_pedido) >= 7`): la consulta funciona, pero BigQuery ya no puede descartar particiones y lee más.
- **Olvidar el dataset en el nombre de la tabla.** `FROM pedidos` falla con "must be qualified with a dataset"; va `FROM tienda.pedidos`.
- **Reemplazar `COUNTIF` por `WHERE canal = 'web'`.** El `WHERE` elimina las filas de los otros canales y ya no puedes contar los tres en la misma consulta.
:::

## ✅ Lista de verificación

- [ ] Una fila por mes desde julio de 2024.
- [ ] Columnas web, app, tienda y total.
- [ ] La estimación es de KB, no de la tabla entera.

## Lo que aprendiste en el nivel 1

- Qué es BigQuery y Studio.
- Consultas, estimación de bytes y la información del job.
- Esquema, detalles, Preview y errores.

En el nivel 2: datasets, tablas, costos, caché y el historial de jobs.

:::ejercicio quiz
¿Qué devuelve DATE_TRUNC('2024-11-17', MONTH)?
- [x] 2024-11-01
- [ ] 2024-11-30
- [ ] 2024-11-17 a las 00:00
- [ ] 2024-12-01
:::

:::ejercicio quiz
¿Qué hace COUNTIF(canal = 'web')?
- [ ] Cuenta todas las filas
- [x] Cuenta solo las filas cuyo canal es web
- [ ] Filtra la tabla
- [ ] Da error
:::

:::ejercicio quiz
¿Por qué la consulta leyó solo unos KB?
- [x] Porque usa pocas columnas y filtra por la columna de partición
- [ ] Porque la tabla está vacía
- [ ] Porque usa LIMIT
- [ ] Porque la caché devuelve cualquier consulta por 0 bytes
:::

:::ejercicio quiz
"Table "pedidos" must be qualified with a dataset". ¿Qué falta?
- [ ] Un warehouse
- [x] El nombre del dataset: tienda.pedidos
- [ ] El rol BigQuery Job User
- [ ] Un GROUP BY por canal
:::
