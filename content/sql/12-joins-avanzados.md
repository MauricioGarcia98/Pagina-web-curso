---
titulo: LEFT, RIGHT, FULL, SELF y CROSS JOIN
nivel: Intermedio
duracion: 45
resumen: Conservar filas sin pareja, encontrar lo que falta (anti-join), unir una tabla consigo misma y productos cartesianos.
objetivos: Elegir entre `INNER`, `LEFT`, `FULL`, `SELF` y `CROSS JOIN` según la pregunta | Encontrar lo que falta con un anti-join (`LEFT JOIN … WHERE … IS NULL`) | Evitar que un filtro en el `WHERE` convierta un `LEFT JOIN` en un `INNER JOIN` | Recorrer relaciones dentro de una misma tabla con un self join
prerrequisitos: sql-joins
autoevaluacion: ¿Puedes listar los clientes que nunca compraron? | ¿Sabes por qué un filtro sobre la tabla derecha en el `WHERE` hace desaparecer las filas sin pareja, y dónde ponerlo? | ¿Puedes mostrar cada empleado con el nombre de su jefe, incluido el CEO? | ¿Puedes armar una grilla de canales por años con ceros donde no hubo pedidos? | ¿Sabes cuántas filas devuelve un `CROSS JOIN` de 4 canales y 3 años?
---

<!-- estandar:escenario -->
:::escenario Los clientes que nunca compraron
Camila, de marketing, quiere reactivar clientes:

> "Hay gente que se registró y nunca compró nada. ¿Cuántos son? Y aparte, Diego me dice que hay pedidos sin pagos aprobados: ¿me los pasas?"

Con `INNER JOIN` solo ves lo que **tiene** pareja. Las preguntas más valiosas del negocio suelen ser sobre lo que **falta**: clientes sin pedidos, pedidos sin pago, productos sin ventas. Para eso hacen falta los otros tipos de JOIN.
:::
## El problema que resuelven

`INNER JOIN` descarta las filas sin pareja. Muchas veces eso es justo lo que **no** quieres:

- "Lista **todos** los clientes con su cantidad de pedidos" → los que nunca compraron deben aparecer con 0.
- "¿Qué productos **nunca** se vendieron?" → justamente los que no tienen pareja en el detalle.
- "Ventas por mes, **incluidos** los meses sin ventas" → necesitas filas que no existen en los datos.

Para esto existen los **outer joins** (externos): `LEFT`, `RIGHT` y `FULL`.

## Las cinco formas de unir, con un ejemplo mínimo

Imagina dos tablitas:

```text
clientes            pedidos
id │ nombre         pedido │ cliente_id
───┼────────        ───────┼───────────
1  │ Ana            10     │ 1
2  │ Beto           11     │ 1
3  │ Carla          12     │ 4      ← cliente que no existe
```

| Tipo | Filas del resultado | En el ejemplo |
|---|---|---|
| `INNER JOIN` | Solo pares que coinciden | Ana-10, Ana-11 |
| `LEFT JOIN` | **Todas** las de la izquierda; sin pareja → `NULL` a la derecha | Ana-10, Ana-11, Beto-NULL, Carla-NULL |
| `RIGHT JOIN` | **Todas** las de la derecha; sin pareja → `NULL` a la izquierda | Ana-10, Ana-11, NULL-12 |
| `FULL OUTER JOIN` | Todas las de ambos lados | Ana-10, Ana-11, Beto-NULL, Carla-NULL, NULL-12 |
| `CROSS JOIN` | Todas las combinaciones, sin condición | 3 × 3 = 9 filas |

"Izquierda" es la tabla que está en el `FROM` (o la acumulada hasta ese punto) y "derecha" es la que está después del `JOIN`.

:::analogia La lista de invitados
`LEFT JOIN` es pasar lista con la planilla de invitados (izquierda) en la mano: lees **todos** los nombres de tu planilla y anotas al lado si vino o no. Los que no vinieron siguen en la planilla, con la casilla vacía (`NULL`). Los que vinieron sin estar invitados (filas de la derecha sin pareja) no aparecen en tu planilla.
:::

## LEFT JOIN en la práctica

```sql
SELECT c.cliente_id, c.nombre, p.pedido_id
FROM clientes c
LEFT JOIN pedidos p ON p.cliente_id = c.cliente_id
ORDER BY c.cliente_id
LIMIT 6;
```

| cliente_id | nombre | pedido_id |
|---|---|---|
| 1 | Lucía | NULL |
| 2 | Juan | NULL |
| 3 | Andrés | 10386 |
| 3 | Andrés | 10727 |
| … | … | … |

- Lucía y Juan no compraron nunca: aparecen **una vez**, con `NULL` en las columnas de `pedidos`.
- Andrés aparece una vez **por cada pedido** (igual que con `INNER`).
- En total: 12.000 filas de clientes con pedido + 547 clientes sin pedido = **12.547 filas**.

### Contar correctamente después de un LEFT JOIN

```sql
SELECT c.cliente_id, c.nombre, COUNT(p.pedido_id) AS pedidos
FROM clientes c
LEFT JOIN pedidos p ON p.cliente_id = c.cliente_id
GROUP BY c.cliente_id, c.nombre
ORDER BY pedidos
LIMIT 5;
```

Fíjate en `COUNT(p.pedido_id)` y no `COUNT(*)`. Para Lucía hay **una** fila (con `pedido_id` en `NULL`): `COUNT(*)` diría 1 pedido (¡falso!), mientras que `COUNT(p.pedido_id)` ignora el `NULL` y da **0**. Es un error muy común.

## El anti-join: encontrar lo que falta

"¿Qué clientes **nunca** compraron?" Haz un `LEFT JOIN` y quédate con las filas donde la derecha vino vacía:

```sql
SELECT c.cliente_id, c.nombre, c.fecha_registro
FROM clientes c
LEFT JOIN pedidos p ON p.cliente_id = c.cliente_id
WHERE p.pedido_id IS NULL;
```

Devuelve los 547 clientes sin pedidos. El patrón `LEFT JOIN … WHERE derecha.clave IS NULL` se llama **anti-join** y es de los más usados: productos sin ventas, empleados sin jefe asignado, pagos sin pedido, archivos que no se cargaron. (En la lección de subconsultas verás su hermano: `NOT EXISTS`.)

Para el `IS NULL`, usa una columna que **nunca** es nula cuando hay pareja (la clave primaria de la tabla derecha es lo más seguro).

## La trampa más común: filtrar la tabla derecha en el WHERE

Quieres "todos los clientes, con sus pedidos de 2024 si los tienen". El intento intuitivo:

```sql
-- ❌ Este "LEFT JOIN" se comporta como INNER: 4.633 filas, solo clientes que compraron en 2024
SELECT c.cliente_id, p.pedido_id
FROM clientes c
LEFT JOIN pedidos p ON p.cliente_id = c.cliente_id
WHERE p.fecha_pedido >= '2024-01-01';
```

¿Qué pasó? El `LEFT JOIN` sí conservó a los clientes sin pedidos (con `fecha_pedido` en `NULL`), pero después el `WHERE` evaluó `NULL >= '2024-01-01'` → UNKNOWN → **descartados**. La condición sobre la tabla derecha hay que ponerla **en el `ON`**:

```sql
-- ✅ Todos los clientes (2.000), con la cantidad de pedidos de 2024 (0 si no compraron)
SELECT c.cliente_id, COUNT(p.pedido_id) AS pedidos_2024
FROM clientes c
LEFT JOIN pedidos p
       ON p.cliente_id = c.cliente_id
      AND p.fecha_pedido >= '2024-01-01'
GROUP BY c.cliente_id
LIMIT 10;
```

La regla:

| Dónde pones la condición | Efecto en un LEFT JOIN |
|---|---|
| En el `ON` | Decide **qué filas de la derecha** se emparejan. Las de la izquierda se conservan todas |
| En el `WHERE` | Filtra el resultado **final**. Si es sobre la derecha, elimina las filas sin pareja |

Condiciones sobre la tabla **izquierda** (por ejemplo `c.pais = 'Chile'`) van en el `WHERE` sin problema.

## RIGHT y FULL OUTER JOIN

- `RIGHT JOIN` es un `LEFT JOIN` con las tablas al revés. `A RIGHT JOIN B` = `B LEFT JOIN A`. Casi nadie lo usa: es más fácil leer siempre de izquierda a derecha y poner la tabla "principal" primero.
- `FULL OUTER JOIN` conserva todo de ambos lados. Su uso clásico es **comparar dos fuentes**: "¿qué ids están solo en el sistema A, solo en el B, o en los dos?" (conciliaciones, migraciones, validar que una carga no perdió filas).

```sql
-- ¿Hay pedidos sin pago o pagos sin pedido?
SELECT CASE WHEN p.pedido_id IS NULL THEN 'pago sin pedido'
            WHEN g.pedido_id IS NULL THEN 'pedido sin pago'
            ELSE 'ok' END AS situacion,
       COUNT(*) AS filas
FROM pedidos p
FULL OUTER JOIN pagos g ON g.pedido_id = p.pedido_id
GROUP BY situacion;
```

:::nota Soporte
SQLite soporta `RIGHT` y `FULL OUTER JOIN` desde la versión 3.39 (la de este sitio lo soporta). MySQL no tiene `FULL OUTER JOIN` (se simula con un `LEFT` + `UNION` + un `RIGHT`).
:::

## SELF JOIN: una tabla consigo misma

A veces una tabla apunta **a sí misma**. En `empleados`, la columna `jefe_id` guarda el `empleado_id` de otro empleado. Para ver cada empleado con el nombre de su jefe, usas la misma tabla **dos veces**, con dos alias distintos, como si fueran dos tablas:

```sql
SELECT e.nombre AS empleado, e.cargo, j.nombre AS jefe, j.cargo AS cargo_jefe
FROM empleados e                               -- e = "el empleado"
LEFT JOIN empleados j ON j.empleado_id = e.jefe_id   -- j = "su jefe"
LIMIT 10;
```

| empleado | cargo | jefe | cargo_jefe |
|---|---|---|---|
| Camila | CEO | NULL | NULL |
| Camila | Director de Ventas | Camila | CEO |
| Daniela | Director de Marketing | Camila | CEO |

Es `LEFT` porque el CEO no tiene jefe: con `INNER` desaparecería. Otros usos del self join: comparar cada fila con la anterior (aunque las funciones de ventana lo hacen mejor), encontrar duplicados (`a.email = b.email AND a.id < b.id`), o pares de productos comprados juntos.

## CROSS JOIN: todas las combinaciones

`CROSS JOIN` no tiene condición: combina **cada** fila de la izquierda con **cada** fila de la derecha (producto cartesiano). Su uso legítimo es generar **grillas** completas, por ejemplo todos los pares canal × año, para después rellenar con ceros los que no tuvieron ventas:

```sql
SELECT canales.canal, anios.anio
FROM (SELECT DISTINCT canal FROM pedidos) AS canales
CROSS JOIN (SELECT DISTINCT strftime('%Y', fecha_pedido) AS anio FROM pedidos) AS anios
ORDER BY 1, 2;
```

4 canales × 3 años = 12 filas. Luego harías un `LEFT JOIN` de esa grilla con las ventas agregadas.

:::cuidado Explosión de filas
Un `CROSS JOIN` de dos tablas de 10.000 filas da 100 millones. Y un `JOIN` con un `ON` incompleto (por ejemplo, unir por `fecha` cuando la clave real es `fecha` + `tienda`) produce una "explosión" parecida sin avisar. Si un total te da sospechosamente grande, cuenta las filas antes y después de cada join.
:::

## Joins con condiciones que no son igualdad

El `ON` acepta **cualquier** condición, no solo `=`. Un uso típico es asignar cada fila a un **rango** definido en otra tabla:

```sql
WITH rangos(nombre, desde, hasta) AS (VALUES ('chico', 0, 100), ('mediano', 100, 1000), ('grande', 1000, 1e9))
SELECT r.nombre, COUNT(*) AS lineas
FROM detalle_pedidos d
JOIN rangos r ON d.precio_unitario >= r.desde AND d.precio_unitario < r.hasta
GROUP BY r.nombre;
```

Otros ejemplos reales: unir una venta con el **tipo de cambio vigente** en su fecha, o con la versión del cliente que estaba activa en ese momento (`fecha BETWEEN valido_desde AND valido_hasta`, lo verás en modelado y en los snapshots de dbt).





<!-- estandar:trabajo -->
:::trabajo
- El anti-join es una herramienta clave para la **calidad de datos**: "pedidos cuyo cliente no existe", "pagos sin pedido". En dbt existe un test listo para eso (`relationships`), que por dentro es un `LEFT JOIN … WHERE … IS NULL`.
- `FULL OUTER JOIN` se usa mucho para **conciliar** dos fuentes: lo que dice el sistema de pagos frente a lo que dice el banco. Las filas que solo están de un lado son exactamente las diferencias a investigar.
- Los `CROSS JOIN` con una tabla calendario son el truco estándar para que un reporte muestre ceros en lugar de huecos.
:::

<!-- estandar:entrevista -->
:::entrevista "¿LEFT JOIN … WHERE b.id IS NULL o NOT EXISTS?"
Las dos encuentran filas de A sin pareja en B y, en los motores modernos, suelen generar el mismo plan (un *anti join*). `NOT EXISTS` se lee mejor y no tiene la trampa de `NOT IN` con nulos. Lo importante en la respuesta es mencionar que `NOT IN` puede fallar si la subconsulta devuelve un NULL.
:::

## Resumen

- `LEFT JOIN` conserva todo lo de la izquierda; lo que no tiene pareja trae `NULL` a la derecha.
- Después de un `LEFT JOIN`, cuenta con `COUNT(derecha.clave)`, no con `COUNT(*)`.
- Anti-join: `LEFT JOIN … WHERE derecha.clave IS NULL` encuentra lo que falta.
- Condiciones sobre la tabla derecha van en el `ON`; en el `WHERE` convierten el `LEFT` en `INNER`.
- `FULL` sirve para comparar fuentes; `SELF JOIN` une una tabla consigo misma con dos alias; `CROSS JOIN` genera grillas.

## Ejercicios

:::ejercicio sql
Muestra `cliente_id`, `nombre` y `apellido` de los clientes que **nunca hicieron un pedido**.
```sql solucion
SELECT c.cliente_id, c.nombre, c.apellido
FROM clientes c LEFT JOIN pedidos p ON p.cliente_id = c.cliente_id
WHERE p.pedido_id IS NULL;
```
:::

:::ejercicio sql
Para **todos** los clientes de `Bolivia`, muestra `cliente_id`, `nombre` y la cantidad de pedidos (`pedidos`), incluyendo con 0 a quienes no compraron.
```sql solucion
SELECT c.cliente_id, c.nombre, COUNT(p.pedido_id) AS pedidos
FROM clientes c LEFT JOIN pedidos p ON p.cliente_id = c.cliente_id
WHERE c.pais = 'Bolivia'
GROUP BY c.cliente_id, c.nombre;
```
```pista
`COUNT(p.pedido_id)` (no `COUNT(*)`) para que los clientes sin pedidos den 0.
```
:::

:::ejercicio sql
Muestra `pedido_id`, `fecha_pedido` y `estado` de los pedidos **no cancelados** que **no tienen ningún pago aprobado**.
```sql solucion
SELECT p.pedido_id, p.fecha_pedido, p.estado
FROM pedidos p
LEFT JOIN pagos pg ON pg.pedido_id = p.pedido_id AND pg.estado = 'aprobado'
WHERE pg.pago_id IS NULL AND p.estado <> 'cancelado';
```
```pista
La condición `pg.estado = 'aprobado'` va en el `ON` (si la pones en el WHERE, el anti-join deja de funcionar).
```
:::

:::ejercicio sql
Muestra el nombre de cada empleado (`empleado`), su `cargo` y el nombre de su jefe (`jefe`). Incluye al CEO con `jefe` en NULL.
```sql solucion
SELECT e.nombre AS empleado, e.cargo, j.nombre AS jefe
FROM empleados e LEFT JOIN empleados j ON j.empleado_id = e.jefe_id;
```
:::

:::ejercicio sql
Para cada jefe, cuenta cuántas personas le reportan **directamente**. Columnas: `jefe_id`, `nombre` (del jefe), `subordinados`. Solo jefes con **más de 5** subordinados.
```sql solucion
SELECT j.empleado_id AS jefe_id, j.nombre, COUNT(*) AS subordinados
FROM empleados e JOIN empleados j ON j.empleado_id = e.jefe_id
GROUP BY j.empleado_id, j.nombre
HAVING COUNT(*) > 5;
```
:::

:::ejercicio sql ordenado
Crea una grilla con **todos** los canales y **todos** los años (2022, 2023, 2024) y la cantidad de pedidos `devuelto` de cada combinación, **incluyendo ceros**. Columnas: `canal`, `anio`, `devueltos`. Ordena por canal y año.
```sql solucion
SELECT c.canal, a.anio, COUNT(p.pedido_id) AS devueltos
FROM (SELECT DISTINCT canal FROM pedidos) c
CROSS JOIN (SELECT DISTINCT strftime('%Y', fecha_pedido) AS anio FROM pedidos) a
LEFT JOIN pedidos p ON p.canal = c.canal AND strftime('%Y', p.fecha_pedido) = a.anio AND p.estado = 'devuelto'
GROUP BY c.canal, a.anio
ORDER BY c.canal, a.anio;
```
```pista
CROSS JOIN de canales distintos y años distintos, y luego LEFT JOIN a pedidos con todas las condiciones en el `ON`.
```
:::
