---
titulo: SQL analítico - QUALIFY, funciones de ventana y muestreo
nivel: 4 · Intermedio-avanzado
duracion: 40
resumen: Snowflake tiene atajos de SQL que ahorran subconsultas. Obtienes el último pedido de cada cliente con QUALIFY, la variación mensual de pedidos con LAG, y conoces SAMPLE para explorar tablas grandes, más las funciones de Snowflake que más se usan.
objetivos: Filtrar por funciones de ventana con QUALIFY | Calcular variaciones con LAG y CTE | Explorar tablas grandes con SAMPLE | Conocer funciones propias de Snowflake
prerrequisitos: snowflake-paso-a-paso-undrop-y-clones
autoevaluacion: ¿Sabes qué filtra QUALIFY? | ¿Sabes qué devuelve LAG? | ¿Sabes para qué sirve SAMPLE? | ¿Sabes qué hace IFF?
---

## Paso 1 — QUALIFY

El último pedido de cada cliente:

```sql norun
SELECT cliente_id, pedido_id, fecha_pedido, canal
FROM pedidos
QUALIFY ROW_NUMBER() OVER (PARTITION BY cliente_id ORDER BY fecha_pedido DESC, pedido_id DESC) = 1
ORDER BY cliente_id
LIMIT 10;
```

```captura
archivo: snowflake/s15-qualify.webp
texto: QUALIFY con ROW_NUMBER (1) - una fila por cliente con su último pedido (2)
```

**QUALIFY** es a las funciones de ventana lo que `HAVING` es a `GROUP BY`: filtra después de calcularlas. Sin QUALIFY habría que envolver la consulta en una subconsulta y filtrar afuera.

## Paso 2 — Ventanas: variación mensual

```sql norun
WITH mensual AS (
  SELECT DATE_TRUNC('month', fecha_pedido) AS mes, COUNT(*) AS pedidos
  FROM pedidos
  GROUP BY 1
)
SELECT mes, pedidos,
       pedidos - LAG(pedidos) OVER (ORDER BY mes) AS variacion
FROM mensual
ORDER BY mes DESC
LIMIT 12;
```

```captura
archivo: snowflake/s15-ventana.webp
texto: La CTE con LAG (1) y los pedidos por mes con la diferencia contra el mes anterior (2)
```

| Función | Devuelve |
|---|---|
| `LAG(x)` / `LEAD(x)` | El valor de la fila anterior / siguiente |
| `ROW_NUMBER()`, `RANK()` | La posición dentro de la partición |
| `SUM(x) OVER (ORDER BY mes)` | Acumulado |
| `AVG(x) OVER (ORDER BY mes ROWS 2 PRECEDING)` | Media móvil de 3 meses |

## Paso 3 — Muestreo y funciones útiles

```sql norun
-- 10 % de las filas, al azar: para explorar sin leer toda la tabla
SELECT * FROM pedidos SAMPLE (10);
```

| Función | Para |
|---|---|
| `IFF(cond, a, b)` | Un `CASE` corto |
| `NVL(x, 0)`, `ZEROIFNULL(x)` | Reemplazar nulos |
| `DATEADD(day, -7, fecha)` / `DATEDIFF(day, a, b)` | Sumar y restar fechas |
| `TRY_TO_NUMBER(x)` | Convertir sin fallar (devuelve NULL si no puede) |
| `ARRAY_AGG(x)`, `OBJECT_CONSTRUCT(...)` | Armar arreglos y JSON |

## ✅ Lo que lograste

- Filtraste con QUALIFY.
- Calculaste variaciones con LAG.
- Conoces SAMPLE y funciones propias de Snowflake.

:::ejercicio quiz
¿Qué filtra QUALIFY?
- [ ] Filas antes de agrupar
- [ ] Grupos después de GROUP BY
- [x] Filas según el resultado de una función de ventana
- [ ] Columnas
:::

:::ejercicio quiz
¿Qué devuelve LAG(pedidos) OVER (ORDER BY mes)?
- [x] El número de pedidos del mes anterior
- [ ] El del mes siguiente
- [ ] El total de todos los meses
- [ ] El máximo
:::

:::ejercicio quiz
¿Para qué sirve SAMPLE (10)?
- [ ] Para borrar el 10 %
- [x] Para leer una muestra al azar del 10 % de las filas
- [ ] Para limitar a 10 filas exactas
- [ ] Para ordenar
:::

:::ejercicio quiz
¿Qué devuelve TRY_TO_NUMBER('abc')?
- [ ] Un error
- [ ] 0
- [x] NULL
- [ ] 'abc'
:::
