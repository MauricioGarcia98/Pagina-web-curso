---
titulo: SQL con el mismo método - pensar antes de escribir
nivel: Intermedio
duracion: 45
resumen: El mismo método sirve para SQL - decidir la granularidad del resultado, traducir filtrar/agrupar/agregar/ordenar a cláusulas, construir la consulta por capas con CTE y verificar contando filas. Incluye la trampa del JOIN que duplica.
objetivos: Responder "una fila por qué" antes de escribir la consulta | Traducir las cinco operaciones a cláusulas de SQL en el orden en que el motor las ejecuta | Construir una consulta difícil por capas, probando cada CTE | Detectar un JOIN que multiplica filas y corregirlo
prerrequisitos: logica-patrones | sql-group-by
autoevaluacion: ¿Sabes decir la granularidad del resultado antes de escribir? | ¿Sabes por qué no puedes usar un alias del SELECT en el WHERE? | ¿Sabes construir una consulta CTE por CTE? | ¿Cómo detectas que un JOIN duplicó filas?
---

:::analogia En palabras simples
Antes de armar un mueble miras la foto del mueble terminado. En SQL, la foto es **cómo se ve el resultado**: qué columnas tiene y qué representa cada fila. Si no sabes eso, vas a escribir consultas que "corren" pero responden otra pregunta.
:::

## Paso 1: una fila por qué

La pregunta más importante de SQL es: **¿qué representa cada fila del resultado?** Se llama *granularidad*.

| Pedido | Una fila por… | Pista en SQL |
|---|---|---|
| "Ventas por mes" | mes | `GROUP BY` mes |
| "Clientes que nunca compraron" | cliente | sin `GROUP BY`, filtro con `NOT EXISTS` |
| "Top 3 productos de cada categoría" | categoría + puesto | ventana con `ROW_NUMBER()` |
| "Ticket promedio" | una sola fila | agregado sin `GROUP BY` |

Dibuja el resultado en una hoja con dos o tres filas inventadas. Parece de principiante; es lo que hacen los seniors.

## Paso 2: las cinco operaciones son cláusulas

| Operación | Cláusula | Orden real de ejecución |
|---|---|---|
| De dónde | `FROM` / `JOIN` | 1 |
| Filtrar filas | `WHERE` | 2 |
| Agrupar | `GROUP BY` | 3 |
| Filtrar grupos | `HAVING` | 4 |
| Transformar / elegir columnas | `SELECT` | 5 |
| Ordenar y cortar | `ORDER BY` / `LIMIT` | 6 |

El orden de ejecución explica dos errores que todos cometen:

- **No puedes usar en `WHERE` un alias que inventaste en `SELECT`**: cuando corre el `WHERE`, el `SELECT` todavía no existe. PostgreSQL, SQL Server y MySQL dan error; SQLite, DuckDB y Snowflake lo aceptan como comodidad propia. No cuentes con eso: repite la expresión o usa una CTE.
- **No puedes filtrar por `SUM(...)` en `WHERE`**: la suma se calcula en el paso 3. Para filtrar grupos está `HAVING`.

## Paso 3: construye por capas

Una consulta difícil no se escribe de corrido. Se escribe **una CTE por subproblema**, y cada una se prueba sola, como las funciones de Python.

> "Clientes de Chile cuyo gasto en pedidos entregados supera el promedio de gasto de los clientes de Chile."

```sql
WITH gasto AS (                       -- 1. una fila por cliente: cuánto gastó
  SELECT p.cliente_id, SUM(d.cantidad * d.precio_unitario) AS gasto
  FROM pedidos p
  JOIN detalle_pedidos d ON d.pedido_id = p.pedido_id
  WHERE p.estado = 'entregado'
  GROUP BY p.cliente_id
),
chile AS (                            -- 2. solo los de Chile
  SELECT g.* FROM gasto g
  JOIN clientes c ON c.cliente_id = g.cliente_id
  WHERE c.pais = 'Chile'
)
SELECT cliente_id, ROUND(gasto, 2) AS gasto   -- 3. comparar con el promedio
FROM chile
WHERE gasto > (SELECT AVG(gasto) FROM chile)
ORDER BY gasto DESC;
```

Mientras la construyes, termina con `SELECT * FROM gasto LIMIT 5` para mirar la primera capa antes de seguir. Si está mal ahí, todo lo de arriba va a estar mal.

## Paso 4: verifica contando filas

Después de cada paso, pregúntate cuántas filas **deberían** salir y compáralo.

```sql
SELECT COUNT(*) AS filas, COUNT(DISTINCT pedido_id) AS pedidos
FROM pedidos;
```

Si `filas` y `pedidos` no coinciden en algo que debería tener una fila por pedido, hay duplicados.

## La trampa del JOIN que duplica

Unir `pedidos` con `detalle_pedidos` da **una fila por línea de detalle**, no por pedido. Si después cuentas pedidos con `COUNT(*)`, cuentas líneas.

| Lo que querías | Lo que escribiste | Lo correcto |
|---|---|---|
| Pedidos por canal | `COUNT(*)` después del JOIN | `COUNT(DISTINCT p.pedido_id)` |
| Pagos por pedido | `SUM(pagos.monto)` junto a otra tabla 1-a-muchos | Agregar cada tabla en su CTE y unir después |

Regla práctica: **agrega antes de unir** cuando juntas dos tablas que tienen muchas filas por la misma clave.

:::ejercicio quiz
"Cantidad de pedidos por mes y canal." ¿Cuál es la granularidad del resultado?
- [ ] Una fila por pedido
- [ ] Una fila por mes
- [x] Una fila por combinación de mes y canal
- [ ] Una sola fila
:::

:::ejercicio quiz
En PostgreSQL, ¿por qué falla `SELECT precio * 1.21 AS con_iva FROM productos WHERE con_iva > 100`?
- [ ] Porque no se puede multiplicar en SELECT
- [x] Porque el WHERE se ejecuta antes que el SELECT y el alias todavía no existe
- [ ] Porque falta un GROUP BY
- [ ] Porque los alias no pueden tener guion bajo
:::

:::ejercicio quiz
Unes `pedidos` con `detalle_pedidos` y haces `COUNT(*)` por canal. El número es más del doble de lo esperado. ¿Qué pasó?
- [ ] El motor tiene un error de redondeo
- [ ] Faltó un ORDER BY
- [x] El JOIN dejó una fila por línea de detalle; hay que contar `COUNT(DISTINCT pedido_id)`
- [ ] Hay que usar LEFT JOIN
:::

:::ejercicio sql dificultad=Básico
Primero la granularidad: **una fila por canal**. Cuenta los pedidos **entregados** de cada `canal`. Columnas: `canal`, `pedidos`.
```sql solucion
SELECT canal, COUNT(*) AS pedidos
FROM pedidos
WHERE estado = 'entregado'
GROUP BY canal;
```
```pista
Filtrar (WHERE estado) → agrupar (GROUP BY canal) → contar (COUNT(*)).
```
:::

:::ejercicio sql dificultad=Intermedio
¿Cuántos pedidos **distintos** incluyen al menos un producto de la marca `Apple`? Una sola fila con la columna `pedidos`. Cuidado: un pedido puede tener varias líneas de Apple.
```sql inicial
SELECT COUNT(*) AS pedidos
FROM detalle_pedidos d
JOIN productos pr ON pr.producto_id = d.producto_id
WHERE pr.marca = 'Apple';
```
```sql solucion
SELECT COUNT(DISTINCT d.pedido_id) AS pedidos
FROM detalle_pedidos d
JOIN productos pr ON pr.producto_id = d.producto_id
WHERE pr.marca = 'Apple';
```
```pista
El código inicial cuenta líneas de detalle. Lo que se pide es contar pedidos: `COUNT(DISTINCT d.pedido_id)`.
```
:::

:::ejercicio sql dificultad=Intermedio
Muestra los países con **más de 200 clientes**, de mayor a menor. Columnas: `pais`, `clientes`.
```sql solucion
SELECT pais, COUNT(*) AS clientes
FROM clientes
GROUP BY pais
HAVING COUNT(*) > 200
ORDER BY clientes DESC;
```
```pista
El filtro es sobre un conteo, es decir, sobre el grupo: va en `HAVING`, no en `WHERE`.
```
:::

:::ejercicio sql dificultad=Intermedio
¿Cuántos clientes **nunca** hicieron un pedido? Una fila con la columna `clientes`.
```sql solucion
SELECT COUNT(*) AS clientes
FROM clientes c
WHERE NOT EXISTS (SELECT 1 FROM pedidos p WHERE p.cliente_id = c.cliente_id);
```
```pista
Patrón bandera: para cada cliente, ¿existe algún pedido suyo? `NOT EXISTS (SELECT 1 FROM pedidos p WHERE p.cliente_id = c.cliente_id)`. También se puede con LEFT JOIN y `WHERE p.pedido_id IS NULL`.
```
:::

:::ejercicio sql dificultad=Avanzado
Por capas. Para cada `segmento` de cliente, calcula el **importe promedio por pedido entregado** (importe = suma de `cantidad * precio_unitario` de sus líneas), redondeado a 2. Columnas: `segmento`, `ticket_promedio`. Pista de granularidad: primero una fila por pedido, después una por segmento.
```sql solucion
WITH por_pedido AS (
  SELECT p.pedido_id, p.cliente_id, SUM(d.cantidad * d.precio_unitario) AS importe
  FROM pedidos p
  JOIN detalle_pedidos d ON d.pedido_id = p.pedido_id
  WHERE p.estado = 'entregado'
  GROUP BY p.pedido_id, p.cliente_id
)
SELECT c.segmento, ROUND(AVG(pp.importe), 2) AS ticket_promedio
FROM por_pedido pp
JOIN clientes c ON c.cliente_id = pp.cliente_id
GROUP BY c.segmento;
```
```pista
Si promedias directamente las líneas de detalle, obtienes el promedio por línea, no por pedido. Arma una CTE con una fila por pedido (su importe total) y recién después agrupa por segmento.
```
:::

:::ejercicio sql dificultad=Avanzado ordenado
Comparar con el anterior, en SQL. Cuenta los pedidos de cada año (`anio`, `pedidos`) y agrega la **diferencia con el año anterior** (`diferencia`, nula en el primer año). Ordena por año.
```sql solucion
WITH por_anio AS (
  SELECT CAST(strftime('%Y', fecha_pedido) AS INTEGER) AS anio, COUNT(*) AS pedidos
  FROM pedidos
  GROUP BY anio
)
SELECT anio, pedidos, pedidos - LAG(pedidos) OVER (ORDER BY anio) AS diferencia
FROM por_anio
ORDER BY anio;
```
```pista
Primero una fila por año (CTE). Después `LAG(pedidos) OVER (ORDER BY anio)` te da el valor de la fila anterior: es la variable `anterior` del bucle de Python.
```
:::
