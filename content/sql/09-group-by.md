---
titulo: GROUP BY y HAVING
nivel: Intermedio
duracion: 40
resumen: Agrupar filas para calcular totales por categoría, y filtrar grupos.
---

## De "un total" a "un total por cada…"

La lección anterior te dio **un** número para toda la tabla: 2.000 clientes. Pero el negocio pregunta casi siempre **"por"**: clientes **por país**, ventas **por mes**, pedidos **por canal**, ticket promedio **por segmento**. Eso es `GROUP BY`: divide las filas en **grupos** según el valor de una o más columnas y calcula la agregación **dentro de cada grupo**.

```sql
SELECT pais, COUNT(*) AS clientes
FROM clientes
GROUP BY pais
ORDER BY clientes DESC;
```

| pais | clientes |
|---|---|
| México | 387 |
| Argentina | 363 |
| Colombia | 312 |
| España | 300 |
| … | … |

El resultado tiene **una fila por cada país distinto** (11 filas), con su conteo.

:::analogia Separar caramelos por color
Tienes una bolsa con caramelos de colores. `GROUP BY color` los separa en montoncitos, uno por color. `COUNT(*)` cuenta cada montoncito y `SUM(peso)` pesa cada uno. Al final tienes **una fila por montoncito**, no una por caramelo.
:::

## Cómo funciona por dentro, paso a paso

Para `SELECT canal, COUNT(*) AS pedidos, SUM(…) AS cancelados FROM pedidos GROUP BY canal`:

1. **FROM**: toma las 12.000 filas de `pedidos`.
2. **GROUP BY canal**: las reparte en 4 montones: `app`, `telefono`, `tienda`, `web`.
3. **SELECT**: para cada montón calcula las agregaciones y escribe **una fila**.

```sql
SELECT canal,
       COUNT(*) AS pedidos,
       SUM(CASE WHEN estado = 'cancelado' THEN 1 ELSE 0 END) AS cancelados
FROM pedidos
GROUP BY canal;
```

| canal | pedidos | cancelados |
|---|---|---|
| app | 2973 | 266 |
| telefono | 982 | 73 |
| tienda | 2645 | 207 |
| web | 5400 | 421 |

Comprueba: 2.973 + 982 + 2.645 + 5.400 = 12.000. Los grupos **reparten** todas las filas sin repetir ni perder ninguna.

## La regla de oro

> Toda columna del `SELECT` debe estar **en el `GROUP BY`** o **dentro de una función de agregación**.

¿Por qué? Porque cada fila del resultado representa **un grupo**. Si pones `nombre` en el `SELECT` agrupando por `pais`, en el grupo "Chile" hay 167 nombres distintos: ¿cuál mostraría? No hay respuesta. En cambio `pais` tiene un único valor por grupo (por definición), y `COUNT(*)` también.

```sql
-- ❌ nombre no está agrupado ni agregado
SELECT pais, nombre, COUNT(*) FROM clientes GROUP BY pais;

-- ✅ Agrupar por varias columnas: un grupo por cada combinación
SELECT pais, segmento, COUNT(*) AS clientes
FROM clientes
GROUP BY pais, segmento
ORDER BY pais, segmento;
```

Con dos columnas en el `GROUP BY`, cada grupo es una **combinación**: "Argentina – Consumidor", "Argentina – Corporativo", "Argentina – Pyme", "Bolivia – Consumidor"… (33 grupos).

## Agrupar por una expresión

El grupo no tiene que ser una columna tal cual: puede ser un cálculo. El caso más común es agrupar fechas por **mes** o **año**:

```sql
SELECT strftime('%Y', fecha_pedido) AS anio,
       COUNT(*) AS pedidos
FROM pedidos
GROUP BY anio
ORDER BY anio;
```

| anio | pedidos |
|---|---|
| 2022 | 3346 |
| 2023 | 4021 |
| 2024 | 4633 |

Si agruparas por `fecha_pedido` directamente obtendrías una fila por **día** (más de mil filas). Al transformar la fecha a año, todos los días de 2022 caen en el mismo grupo.

:::nota ¿Puedo usar el alias en el GROUP BY?
SQLite, PostgreSQL, MySQL, Spark y BigQuery aceptan `GROUP BY anio` (el alias del `SELECT`). SQL Server y Oracle no: allí debes repetir la expresión (`GROUP BY strftime('%Y', fecha_pedido)`). También existe `GROUP BY 1` (la primera columna del `SELECT`), muy usado en análisis rápido.
:::

## HAVING: filtrar grupos

`WHERE` filtra **filas**, antes de agrupar. ¿Y si quieres filtrar por el **resultado** de una agregación, como "las ciudades con más de 100 clientes"? No puedes usar `WHERE COUNT(*) > 100`, porque cuando se ejecuta el `WHERE` los grupos todavía no existen. Para eso está `HAVING`: filtra **grupos**, después de agrupar.

```sql
SELECT ciudad, COUNT(*) AS clientes
FROM clientes
GROUP BY ciudad
HAVING COUNT(*) > 100
ORDER BY clientes DESC;
```

| ciudad | clientes |
|---|---|
| Buenos Aires | 201 |
| Ciudad de México | 179 |
| Madrid | 153 |
| … | … |

### WHERE y HAVING juntos

| | `WHERE` | `HAVING` |
|---|---|---|
| Qué filtra | Filas individuales | Grupos |
| Cuándo | **Antes** de agrupar | **Después** de agrupar |
| Puede usar agregaciones | No | Sí |
| Ejemplo | `WHERE estado = 'entregado'` | `HAVING SUM(total) > 10000` |

```sql
-- Clientes con más de 10 pedidos ENTREGADOS
SELECT cliente_id, COUNT(*) AS pedidos_entregados
FROM pedidos
WHERE estado = 'entregado'          -- 1) solo filas entregadas
GROUP BY cliente_id                 -- 2) un grupo por cliente
HAVING COUNT(*) > 10                -- 3) solo los grupos con más de 10
ORDER BY pedidos_entregados DESC;
```

:::tip Filtra lo antes posible
Si una condición se puede escribir en `WHERE` (no usa agregaciones), ponla en `WHERE`, no en `HAVING`. El resultado es el mismo pero el motor agrupa menos filas, y la consulta se entiende mejor.
:::

## El orden lógico de ejecución (versión completa)

SQL se **escribe** en un orden y se **ejecuta** en otro. Esta tabla explica casi todos los errores de principiante:

| Paso | Cláusula | Qué hace |
|---|---|---|
| 1 | `FROM` / `JOIN` | Junta las tablas |
| 2 | `WHERE` | Filtra filas |
| 3 | `GROUP BY` | Forma grupos |
| 4 | `HAVING` | Filtra grupos |
| 5 | `SELECT` | Calcula columnas y alias |
| 6 | `DISTINCT` | Quita duplicados |
| 7 | `ORDER BY` | Ordena (ya puede usar alias) |
| 8 | `LIMIT` / `OFFSET` | Recorta |

Consecuencias:

- `WHERE COUNT(*) > 5` → error: en el paso 2 no hay grupos.
- `WHERE margen > 0.3` (alias) → error en el estándar: en el paso 2 el `SELECT` no se ejecutó.
- `ORDER BY clientes DESC` (alias) → funciona: en el paso 7 los alias ya existen.

## Errores frecuentes

:::cuidado Agrupar de más
Si agrupas por `cliente_id, fecha_pedido` cuando querías "por cliente", obtienes una fila por cliente **y día**. Antes de escribir el `GROUP BY`, define el **grano** del resultado: "quiero una fila por ______". Lo que pongas en el blanco es exactamente lo que va en el `GROUP BY`.
:::

:::cuidado Grupos que no aparecen
`GROUP BY` solo crea grupos para los valores que **existen** en los datos. Si en marzo no hubo ventas, marzo no aparece (no aparece con 0). Para mostrar los meses vacíos necesitas un calendario y un `LEFT JOIN` (lecciones de JOIN y CTE recursivas).
:::

## Resumen

- `GROUP BY col` crea un grupo por cada valor distinto y calcula las agregaciones dentro de cada grupo.
- Regla de oro: todo lo del `SELECT` va en el `GROUP BY` o dentro de una agregación.
- Puedes agrupar por expresiones (año, mes) y por varias columnas (combinaciones).
- `WHERE` filtra filas antes; `HAVING` filtra grupos después.
- Define el grano ("una fila por…") antes de escribir el `GROUP BY`.

## Ejercicios

:::ejercicio sql
Cuenta cuántos pedidos hay de cada `estado`. Columnas: `estado`, `pedidos`.
```sql solucion
SELECT estado, COUNT(*) AS pedidos FROM pedidos GROUP BY estado;
```
:::

:::ejercicio sql
Para cada `marca`, muestra la cantidad de productos (`productos`) y el precio promedio redondeado a 2 decimales (`precio_promedio`).
```sql solucion
SELECT marca, COUNT(*) AS productos, ROUND(AVG(precio), 2) AS precio_promedio FROM productos GROUP BY marca;
```
:::

:::ejercicio sql ordenado
Cuenta los pedidos por **año** (alias `anio`, como texto de 4 dígitos) y `canal`. Ordena por año y luego por canal. Columnas: `anio`, `canal`, `pedidos`.
```sql solucion
SELECT strftime('%Y', fecha_pedido) AS anio, canal, COUNT(*) AS pedidos
FROM pedidos
GROUP BY anio, canal
ORDER BY anio, canal;
```
:::

:::ejercicio sql
Muestra los clientes (`cliente_id`) que hicieron **10 o más pedidos**, con la cantidad (`pedidos`).
```sql solucion
SELECT cliente_id, COUNT(*) AS pedidos FROM pedidos GROUP BY cliente_id HAVING COUNT(*) >= 10;
```
```pista
Agrupa por `cliente_id` y filtra los grupos con `HAVING COUNT(*) >= 10`.
```
:::

:::ejercicio sql
Para cada `pedido_id` de `detalle_pedidos`, calcula el importe neto total (`SUM(cantidad * precio_unitario * (1 - descuento))`, redondeado a 2) con el alias `total`. Muestra solo los pedidos cuyo total supera **3000**.
```sql solucion
SELECT pedido_id, ROUND(SUM(cantidad * precio_unitario * (1 - descuento)), 2) AS total
FROM detalle_pedidos
GROUP BY pedido_id
HAVING SUM(cantidad * precio_unitario * (1 - descuento)) > 3000;
```
:::

:::ejercicio sql
Por `departamento_id`, muestra cuántos empleados **activos** (sin `fecha_salida`) hay (`empleados`) y su salario promedio redondeado a 0 decimales (`salario_promedio`). Solo departamentos con **al menos 5** empleados activos.
```sql solucion
SELECT departamento_id, COUNT(*) AS empleados, ROUND(AVG(salario), 0) AS salario_promedio
FROM empleados
WHERE fecha_salida IS NULL
GROUP BY departamento_id
HAVING COUNT(*) >= 5;
```
```pista
Los empleados activos se filtran con `WHERE` (antes de agrupar); la condición de 5 o más va en `HAVING`.
```
:::

:::ejercicio quiz
Quieres las categorías con un precio promedio mayor a 300. ¿Dónde va la condición `AVG(precio) > 300`?

- [ ] En el WHERE
- [x] En el HAVING
- [ ] En el ORDER BY
- [ ] En el FROM
:::
