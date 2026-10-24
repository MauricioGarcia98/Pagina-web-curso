---
titulo: CTE: consultas legibles con WITH
nivel: Avanzado
duracion: 35
resumen: Common Table Expressions para dividir un problema en pasos con nombre.
objetivos: Reescribir una consulta anidada como una secuencia de pasos con `WITH` | Encadenar varias CTE donde cada una usa la anterior | Usar CTE para calcular métricas en dos niveles (por pedido y después por cliente) | Explicar por qué los equipos prefieren CTE para código que otros van a mantener
prerrequisitos: sql-subconsultas
autoevaluacion: ¿Puedes escribir la sintaxis de una consulta con dos CTE encadenadas sin mirar? | ¿Puedes encontrar los clientes que gastaron más de tres veces el promedio usando CTE? | ¿Sabes dónde van las comas entre CTE y dónde no? | ¿Puedes crear una pequeña tabla de datos "a mano" dentro de una CTE? | ¿Sabes si una CTE hace más rápida una consulta?
---

<!-- estandar:escenario -->
:::escenario Los clientes VIP
Valentina quiere lanzar un programa de fidelización:

> "Quiero saber quiénes son nuestros clientes VIP: los que gastaron mucho más que el promedio. Digamos más de tres veces. Y necesito que la lógica quede clara, porque marketing la va a revisar."

Con subconsultas se puede, pero el resultado se lee de adentro hacia afuera y nadie lo entiende. Las **CTE** permiten escribirlo como una receta: primero esto, después aquello. Es como escriben SQL los equipos profesionales.
:::
## El problema: consultas que se leen de adentro hacia afuera

Con subconsultas puedes resolver problemas de varios pasos, pero el código se lee **al revés**: lo primero que se ejecuta está en el paréntesis más profundo, y para entender la consulta tienes que empezar por el medio. Con dos o tres niveles de anidamiento, nadie (ni tú dentro de un mes) entiende qué hace.

Una **CTE** (*Common Table Expression*, "expresión de tabla común") resuelve esto: le pones **nombre** a cada paso y los escribes **en orden**, de arriba hacia abajo, antes de la consulta final. Se declara con la palabra `WITH`.

:::analogia La receta de cocina
Una receta no dice "cocina (lo que resulta de mezclar (lo que resulta de picar (las cebollas)))". Dice: **1.** Pica las cebollas. **2.** Mézclalas con los tomates. **3.** Cocina la mezcla. Cada paso tiene un resultado con nombre que usa el siguiente. Las CTE son eso: pasos con nombre.
:::

## La sintaxis

```sql norun
WITH nombre_del_paso AS (
    SELECT …            -- una consulta cualquiera
)
SELECT …
FROM nombre_del_paso;   -- se usa como si fuera una tabla
```

Un ejemplo real: los 10 clientes que más compraron (solo pedidos entregados).

```sql
WITH ventas_por_cliente AS (
    SELECT p.cliente_id,
           SUM(d.cantidad * d.precio_unitario * (1 - d.descuento)) AS total
    FROM pedidos p
    JOIN detalle_pedidos d ON d.pedido_id = p.pedido_id
    WHERE p.estado = 'entregado'
    GROUP BY p.cliente_id
)
SELECT c.nombre, c.apellido, c.pais, ROUND(v.total, 2) AS total
FROM ventas_por_cliente v
JOIN clientes c ON c.cliente_id = v.cliente_id
ORDER BY v.total DESC
LIMIT 10;
```

Se lee como un texto:

1. **Primero** calculo `ventas_por_cliente`: una fila por cliente con su total comprado.
2. **Después** uno ese resultado con `clientes` para mostrar nombre y país, y me quedo con los 10 mayores.

Compárala con la versión con subconsulta: `FROM (SELECT p.cliente_id, SUM(…) … GROUP BY p.cliente_id) v JOIN clientes …`. Hace lo mismo, pero el paso 1 queda enterrado dentro del `FROM`.

:::nota Importante: una CTE existe solo dentro de su consulta
La CTE no crea una tabla en la base de datos. Es un nombre temporal que vive **solo durante esa instrucción**. Si ejecutas otra consulta después, `ventas_por_cliente` ya no existe. Para guardar resultados de forma permanente se usan tablas o vistas (lección 19) o modelos de dbt.
:::

## Varias CTE encadenadas: un pipeline en miniatura

Puedes declarar varias CTE separadas **por comas** (con un único `WITH` al principio). Cada una puede usar las anteriores:

```sql
WITH pedidos_2024 AS (                       -- paso 1: filtrar
    SELECT * FROM pedidos WHERE fecha_pedido >= '2024-01-01'
),
por_cliente AS (                              -- paso 2: contar por cliente
    SELECT cliente_id, COUNT(*) AS pedidos FROM pedidos_2024 GROUP BY cliente_id
),
distribucion AS (                             -- paso 3: ¿cuántos clientes hicieron 1, 2, 3… pedidos?
    SELECT pedidos, COUNT(*) AS clientes FROM por_cliente GROUP BY pedidos
)
SELECT * FROM distribucion ORDER BY pedidos;
```

| pedidos | clientes |
|---|---|
| 1 | 344 |
| 2 | 235 |
| 3 | 167 |
| 4 | 124 |
| … | … |

La respuesta de negocio: en 2024, 344 clientes compraron **una sola vez**, 235 dos veces, y así. Es una **distribución de frecuencia**, y necesitó dos agregaciones seguidas, imposible en una sola consulta plana.

Fíjate en la estructura: **filtrar → transformar → agregar → presentar**. Es la misma forma que tiene un pipeline de datos completo. No es casualidad: así se escriben los modelos de dbt.

:::cuidado Errores de sintaxis típicos
- Escribir `WITH` en cada paso: solo va **una vez**, al principio. Los demás se separan con coma.
- Poner una coma **después** de la última CTE (antes del `SELECT` final): error de sintaxis.
- Terminar con la CTE sin un `SELECT` final: el `WITH` siempre va seguido de la consulta principal.
:::

## Ventajas que hacen que todos los profesionales usen CTE

| Ventaja | En la práctica |
|---|---|
| **Legibilidad** | Cada paso tiene un nombre que explica qué hace (`clientes_activos`, `ventas_mensuales`) |
| **Depuración** | Para revisar un paso, cambia el `SELECT` final por `SELECT * FROM paso_intermedio LIMIT 20` y mira qué hay |
| **Reutilización** | Una CTE se puede usar **varias veces** en la misma consulta (por ejemplo, unir `ventas_mensuales` consigo misma para comparar con el mes anterior) |
| **Revisión de código** | En un *pull request*, un compañero entiende los pasos sin descifrar paréntesis |
| **Es el estilo de dbt** | En dbt, cada modelo es una cadena de CTE: importaciones, transformaciones, resultado final |

### El estilo dbt: CTE de importación

En proyectos profesionales verás este patrón: las primeras CTE solo "importan" las tablas (sin transformarlas), y después vienen los pasos lógicos.

```sql
WITH src_pedidos AS (
    SELECT * FROM pedidos
),
src_detalle AS (
    SELECT * FROM detalle_pedidos
),
totales AS (
    SELECT pedido_id, SUM(cantidad * precio_unitario) AS total
    FROM src_detalle
    GROUP BY pedido_id
),
final AS (
    SELECT p.pedido_id, p.cliente_id, p.fecha_pedido, t.total
    FROM src_pedidos p
    JOIN totales t ON t.pedido_id = p.pedido_id
)
SELECT * FROM final
LIMIT 5;
```

(En dbt las importaciones se escriben `pedidos AS (SELECT * FROM {{ ref('stg_pedidos') }})`; aquí usamos el prefijo `src_` porque SQLite no permite que una CTE se llame igual que la tabla que lee.) Parece redundante, pero al principio del archivo ves de un vistazo **de qué tablas depende** el modelo, y el `SELECT * FROM final` del final permite depurar cambiando una sola palabra.

## CTE con datos escritos a mano

Una CTE también puede contener datos literales con `VALUES`. Lo usamos en varias lecciones para crear tablitas de ejemplo o tablas de parámetros:

```sql
WITH metas(canal, meta_mensual) AS (
    VALUES ('web', 200), ('app', 110), ('tienda', 100), ('telefono', 40)
)
SELECT p.canal, COUNT(*) AS pedidos_dic_2024, m.meta_mensual,
       CASE WHEN COUNT(*) >= m.meta_mensual THEN 'cumplió' ELSE 'no cumplió' END AS estado
FROM pedidos p
JOIN metas m ON m.canal = p.canal
WHERE p.fecha_pedido >= '2024-12-01' AND p.fecha_pedido < '2025-01-01'
GROUP BY p.canal, m.meta_mensual;
```

:::experto ¿Las CTE hacen más rápida la consulta?
No necesariamente. La mayoría de los motores modernos (PostgreSQL 12+, Spark, Snowflake, BigQuery) **expanden** las CTE como si fueran subconsultas y optimizan todo junto, así que el rendimiento es el mismo. Algunos motores pueden "materializarlas" (calcular una vez y guardar el resultado), lo que ayuda si la usas muchas veces y perjudica si impide filtrar antes. Úsalas por **claridad**; si el rendimiento importa, mide con el plan de ejecución (lección 21).
:::

## Lo que viene: CTE recursivas

Hay un tipo especial de CTE que se usa **a sí misma** para recorrer jerarquías (el organigrama de la empresa, categorías dentro de categorías) o generar secuencias (todos los días de un año). Lo verás en la lección 18.



<!-- estandar:trabajo -->
:::trabajo
- En dbt, **cada modelo** es una sucesión de CTE: una por cada fuente (`with pedidos as (select * from {{ ref('stg_pedidos') }})`), una por cada paso de lógica y un `select` final. Si aprendes a pensar en CTE, ya escribes como un analytics engineer.
- Nombra las CTE por **lo que contienen** (`ventas_por_cliente`, `clientes_vip`), no por el paso (`paso1`, `tmp`). Quien revise tu código lee los nombres como si fuera un índice.
- Para depurar, puedes cambiar el `SELECT` final por `SELECT * FROM una_cte_intermedia LIMIT 20` y ver qué hay en ese paso, sin tocar nada más.
:::

<!-- estandar:entrevista -->
:::entrevista "¿Qué diferencia hay entre una CTE, una subconsulta y una tabla temporal?"
Una **CTE** y una **subconsulta** existen solo durante esa consulta; la CTE tiene nombre, se puede reutilizar dentro de la consulta y permite recursión. Una **tabla temporal** se guarda (en memoria o disco) durante la sesión y se puede consultar varias veces e indexar, lo que conviene cuando un resultado intermedio caro se usa en muchas consultas.
:::

## Resumen

- `WITH nombre AS (SELECT …)` crea un paso con nombre que se usa como una tabla en la consulta principal.
- Varias CTE se separan con comas; cada una puede usar las anteriores. Un solo `WITH` al principio.
- Existen solo durante la consulta; no crean tablas.
- Ventajas: legibilidad, depuración paso a paso, reutilización. Es el estilo de dbt.
- Patrón profesional: importaciones → pasos lógicos → `final` → `SELECT * FROM final`.

## Ejercicios

:::ejercicio sql
Usando una CTE llamada `totales` con el importe neto por pedido, muestra cuántos pedidos (`pedidos`) y el promedio de importe (`ticket_promedio`, redondeado a 2) **por canal**. Columnas: `canal`, `pedidos`, `ticket_promedio`. Incluye todos los estados.
```sql solucion
WITH totales AS (
  SELECT pedido_id, SUM(cantidad * precio_unitario * (1 - descuento)) AS total
  FROM detalle_pedidos GROUP BY pedido_id
)
SELECT p.canal, COUNT(*) AS pedidos, ROUND(AVG(t.total), 2) AS ticket_promedio
FROM pedidos p JOIN totales t ON t.pedido_id = p.pedido_id
GROUP BY p.canal;
```
:::

:::ejercicio sql
Encuentra los **clientes VIP**: los que gastaron (en pedidos `entregado`) **más de 3 veces el gasto promedio** de los clientes que compraron. Muestra `cliente_id` y `gasto` (redondeado a 2). Usa dos CTE: una con el gasto por cliente y otra con el promedio.
```sql solucion
WITH gasto AS (
  SELECT p.cliente_id, SUM(d.cantidad * d.precio_unitario * (1 - d.descuento)) AS gasto
  FROM pedidos p JOIN detalle_pedidos d ON d.pedido_id = p.pedido_id
  WHERE p.estado = 'entregado'
  GROUP BY p.cliente_id
),
promedio AS (
  SELECT AVG(gasto) AS prom FROM gasto
)
SELECT g.cliente_id, ROUND(g.gasto, 2) AS gasto
FROM gasto g, promedio
WHERE g.gasto > 3 * promedio.prom;
```
```pista
En la consulta final puedes unir `gasto` con `promedio` (que tiene una sola fila) usando `FROM gasto g, promedio` o un `CROSS JOIN`.
```
:::

:::ejercicio sql ordenado
Calcula la **facturación neta mensual** de 2024 (pedidos no cancelados) y la cantidad de clientes **distintos** que compraron cada mes. Columnas: `mes` (formato `YYYY-MM`), `facturacion` (redondeada a 2), `clientes`. Ordena por mes.
```sql solucion
WITH lineas AS (
  SELECT strftime('%Y-%m', p.fecha_pedido) AS mes, p.cliente_id,
         d.cantidad * d.precio_unitario * (1 - d.descuento) AS importe
  FROM pedidos p JOIN detalle_pedidos d ON d.pedido_id = p.pedido_id
  WHERE p.estado <> 'cancelado' AND p.fecha_pedido >= '2024-01-01'
)
SELECT mes, ROUND(SUM(importe), 2) AS facturacion, COUNT(DISTINCT cliente_id) AS clientes
FROM lineas
GROUP BY mes
ORDER BY mes;
```
:::
