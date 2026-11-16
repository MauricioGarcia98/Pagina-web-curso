---
titulo: SQL analítico - QUALIFY, ventanas y funciones de GoogleSQL
nivel: 4 · Intermedio-avanzado
duracion: 40
resumen: Obtienes el último pedido de cada cliente con QUALIFY, la variación mensual de pedidos y el porcentaje web con LAG, COUNTIF y SAFE_DIVIDE, y conoces las funciones de GoogleSQL que más se usan en análisis - fechas, texto, errores seguros y aproximaciones.
objetivos: Filtrar funciones de ventana con QUALIFY | Calcular variaciones y porcentajes con LAG, COUNTIF y SAFE_DIVIDE | Usar las funciones de fecha de GoogleSQL | Conocer SAFE_ y APPROX_
prerrequisitos: bigquery-paso-a-paso-time-travel
autoevaluacion: ¿Sabes qué filtra QUALIFY? | ¿Sabes qué devuelve SAFE_DIVIDE(1, 0)? | ¿Sabes calcular el porcentaje de web por mes? | ¿Sabes cuándo usar APPROX_COUNT_DISTINCT?
---

:::analogia Numerar y quedarse con el primero
`QUALIFY` es al resultado de una función de ventana lo que `HAVING` es al de un `GROUP BY`: primero numeras los pedidos de cada cliente del más reciente al más viejo y después te quedas con el número 1, sin subconsultas.
:::

## Paso 1 — QUALIFY

```sql norun
SELECT cliente_id, pedido_id, fecha_pedido, canal
FROM tienda.pedidos
WHERE fecha_pedido >= '2024-01-01'
QUALIFY ROW_NUMBER() OVER (PARTITION BY cliente_id ORDER BY fecha_pedido DESC, pedido_id DESC) = 1
ORDER BY cliente_id
LIMIT 10;
```

```captura
archivo: bigquery/q15-qualify.webp
texto: QUALIFY con ROW_NUMBER (1) - el último pedido de cada cliente en 2024 (2)
```

## Paso 2 — Ventanas y porcentajes

```sql norun
WITH mensual AS (
  SELECT DATE_TRUNC(fecha_pedido, MONTH) AS mes,
         COUNT(*) AS pedidos,
         COUNTIF(canal = 'web') AS web
  FROM tienda.pedidos
  WHERE fecha_pedido >= '2024-01-01'
  GROUP BY mes
)
SELECT mes, pedidos,
       pedidos - LAG(pedidos) OVER (ORDER BY mes) AS variacion,
       ROUND(SAFE_DIVIDE(web, pedidos) * 100, 1) AS pct_web
FROM mensual
ORDER BY mes;
```

```captura
archivo: bigquery/q15-ventana.webp
texto: La CTE con LAG y SAFE_DIVIDE (1) - pedidos por mes, variación contra el mes anterior y porcentaje web (2)
```

## Paso 3 — Funciones que más se usan

| Función | Para |
|---|---|
| `DATE_TRUNC(f, MONTH)`, `DATE_DIFF(a, b, DAY)`, `DATE_ADD(f, INTERVAL 7 DAY)` | Fechas |
| `FORMAT_DATE('%Y-%m', f)`, `PARSE_DATE('%d/%m/%Y', txt)` | Fechas a texto y texto a fechas |
| `COUNTIF(cond)`, `LOGICAL_OR(cond)` | Contar o comprobar condiciones |
| `SAFE_DIVIDE(a, b)`, `SAFE_CAST(x AS INT64)` | Devuelven `NULL` en lugar de fallar |
| `APPROX_COUNT_DISTINCT(x)` | Distintos aproximados, mucho más baratos en tablas enormes |
| `SELECT * EXCEPT(col)` | Todas las columnas menos algunas |
| `REGEXP_EXTRACT(txt, r'…')` | Extraer con expresiones regulares |

:::errores
- **Filtrar una ventana en el `WHERE`.** El `WHERE` se evalúa antes que las ventanas y da error; el filtro va en `QUALIFY`.
- **Dividir con `/`.** Si el divisor puede ser 0, la consulta falla; `SAFE_DIVIDE` devuelve NULL.
- **`LAG` sin `ORDER BY`.** Sin orden, "la fila anterior" no está definida y el resultado no tiene sentido.
:::

## ✅ Lo que lograste

- Filtraste con QUALIFY.
- Calculaste variaciones y porcentajes.
- Conoces las funciones clave de GoogleSQL.

:::ejercicio quiz
¿Qué filtra QUALIFY?
- [x] Filas según el resultado de una función de ventana
- [ ] Grupos después de GROUP BY
- [ ] Columnas
- [ ] Particiones
:::

:::ejercicio quiz
¿Qué devuelve SAFE_DIVIDE(1, 0)?
- [ ] Un error de división por cero
- [ ] 0
- [x] NULL
- [ ] Infinito
:::

:::ejercicio quiz
¿Cómo calculas el porcentaje de pedidos web por mes?
- [ ] COUNT(web) / 100
- [x] SAFE_DIVIDE(COUNTIF(canal = 'web'), COUNT(*)) * 100, agrupando por mes
- [ ] SUM(canal)
- [ ] AVG(canal = 'web') sobre toda la tabla, sin agrupar por mes
:::

:::ejercicio quiz
¿Cuándo conviene APPROX_COUNT_DISTINCT?
- [ ] Cuando hace falta el número exacto para facturar
- [x] Cuando un valor aproximado alcanza y la tabla es enorme: es mucho más barato
- [ ] Para contar exacto
- [ ] Solo en tablas chicas
:::
