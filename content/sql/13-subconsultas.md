---
titulo: Subconsultas
nivel: Intermedio
duracion: 45
resumen: Consultas dentro de consultas: escalares, con IN, EXISTS, correlacionadas y tablas derivadas.
objetivos: Usar una subconsulta escalar para comparar contra un valor calculado (como el promedio) | Filtrar con `IN` y `EXISTS` usando el resultado de otra consulta | Escribir subconsultas correlacionadas y entender su costo | Usar tablas derivadas en el `FROM` para agregar en dos pasos
prerrequisitos: sql-group-by | sql-joins
autoevaluacion: ¿Puedes listar los empleados que ganan más que el promedio de la empresa? | ¿Puedes listar los productos más caros que el promedio de su propia categoría? | ¿Sabes cuándo una subconsulta escalar da error? | ¿Sabes por qué `NOT EXISTS` es más seguro que `NOT IN`? | ¿Puedes calcular un promedio de totales por pedido usando una tabla derivada?
---

<!-- estandar:escenario -->
:::escenario Los sueldos sobre el promedio
Tomás, de personas, sigue con la revisión salarial:

> "¿Quiénes ganan más que el promedio de la empresa? Y otra: ¿qué productos están más caros que el promedio de su categoría? Me lo pidió Valentina para revisar precios."

Para responder necesitas un número que **todavía no tienes** (el promedio) y usarlo dentro de otra consulta. Eso es una subconsulta: una consulta dentro de otra.
:::
## Una consulta dentro de otra

Algunas preguntas necesitan **dos pasos**: "¿qué productos cuestan más **que el promedio**?" Primero hay que calcular el promedio (374,28) y después comparar cada producto contra ese número. Podrías hacer dos consultas y copiar el número a mano, pero sería frágil: mañana el promedio cambia. Una **subconsulta** resuelve ambos pasos en una sola instrucción: es un `SELECT` escrito **entre paréntesis** dentro de otro `SELECT`.

:::analogia Preguntarle a un compañero
Estás armando un informe y necesitas un dato que tiene otra persona. Le preguntas, ella te responde, y usas su respuesta en tu informe. La subconsulta es esa pregunta al compañero: el motor la resuelve primero y usa el resultado en la consulta de afuera.
:::

Según **qué devuelve** la subconsulta, se usa en un lugar distinto:

| Tipo | Devuelve | Se usa en | Ejemplo |
|---|---|---|---|
| Escalar | **Un** valor (1 fila, 1 columna) | Donde iría un número o texto | `WHERE precio > (SELECT AVG(precio) …)` |
| De lista | **Una columna** con varias filas | Con `IN` / `NOT IN` | `WHERE cliente_id IN (SELECT …)` |
| De existencia | Cualquier cosa (solo importa si hay filas) | Con `EXISTS` / `NOT EXISTS` | `WHERE EXISTS (SELECT 1 …)` |
| Tabla derivada | Una tabla completa | En el `FROM`, con alias | `FROM (SELECT …) AS t` |

## 1. Subconsulta escalar: un solo valor

```sql
-- Productos más caros que el promedio
SELECT nombre, precio
FROM productos
WHERE precio > (SELECT AVG(precio) FROM productos)
ORDER BY precio;
```

Paso a paso:

1. El motor resuelve `(SELECT AVG(precio) FROM productos)` → `374.28`.
2. La consulta de afuera queda, en la práctica, como `WHERE precio > 374.28`.
3. Devuelve los 100 productos que superan ese valor.

Una subconsulta escalar también puede ir en el `SELECT`, para mostrar el valor de referencia al lado de cada fila:

```sql
SELECT nombre, precio,
       ROUND(precio - (SELECT AVG(precio) FROM productos), 2) AS diferencia_con_promedio
FROM productos
ORDER BY diferencia_con_promedio DESC
LIMIT 5;
```

:::cuidado Debe devolver exactamente un valor
Si la subconsulta escalar devuelve **varias filas**, PostgreSQL, SQL Server y otros motores dan error ("more than one row returned by a subquery used as an expression"); SQLite toma la primera en silencio. Si devuelve **cero** filas, el resultado es `NULL`. Asegúrate de que sea una agregación (`AVG`, `MAX`, `COUNT`) o un filtro por clave única.
:::

## 2. Subconsulta con IN: una lista de valores

`IN` ya lo conoces con listas escritas a mano (`pais IN ('Chile', 'Perú')`). La lista también puede salir de una consulta:

```sql
-- Clientes que alguna vez compraron por teléfono
SELECT cliente_id, nombre, apellido
FROM clientes
WHERE cliente_id IN (SELECT cliente_id FROM pedidos WHERE canal = 'telefono');
```

1. La subconsulta produce la lista de `cliente_id` con pedidos telefónicos (con repetidos: no importa).
2. La consulta de afuera deja los clientes cuyo id **está en** esa lista: 596 clientes.

¿Por qué no un `JOIN`? Porque un cliente con 5 pedidos telefónicos aparecería **5 veces** con un join; con `IN` aparece **una**. `IN` responde "¿está o no está?", sin multiplicar filas. Esto se llama **semi-join**.

Una subconsulta con `IN` puede tener sus propios joins:

```sql
-- Clientes que compraron algún producto Apple
SELECT cliente_id, nombre FROM clientes
WHERE cliente_id IN (
  SELECT p.cliente_id
  FROM pedidos p
  JOIN detalle_pedidos d ON d.pedido_id = p.pedido_id
  JOIN productos pr      ON pr.producto_id = d.producto_id
  WHERE pr.marca = 'Apple'
);
```

## 3. EXISTS: ¿hay al menos una fila?

`EXISTS (subconsulta)` es verdadero si la subconsulta devuelve **alguna** fila, sin importar qué columnas. Por eso se escribe `SELECT 1`: el contenido da igual.

```sql
SELECT c.cliente_id, c.nombre
FROM clientes c
WHERE EXISTS (
  SELECT 1
  FROM pedidos p
  WHERE p.cliente_id = c.cliente_id      -- ← usa una columna de la consulta de afuera
    AND p.canal = 'telefono'
);
```

Es el mismo resultado que el `IN` de arriba. La diferencia es que la subconsulta **menciona** `c.cliente_id`, una columna de afuera: se evalúa "para cada cliente". El motor puede detenerse en cuanto encuentra **la primera** coincidencia, por eso `EXISTS` suele ser muy eficiente.

## La trampa de NOT IN con NULL (caso real)

Para lo opuesto ("lo que **no** está") tienes `NOT IN` y `NOT EXISTS`. Parecen equivalentes, pero no lo son cuando hay `NULL`. Mira este caso real con los datos del curso: queremos los clientes cuyo id no coincide con ningún `jefe_id` de la tabla `empleados` (es un ejemplo artificial, pero muestra el problema):

```sql
-- ❌ Devuelve 0 filas
SELECT COUNT(*) FROM clientes
WHERE cliente_id NOT IN (SELECT jefe_id FROM empleados);

-- ✅ Devuelve 1.973 filas
SELECT COUNT(*) FROM clientes c
WHERE NOT EXISTS (SELECT 1 FROM empleados e WHERE e.jefe_id = c.cliente_id);
```

¿Por qué el primero da 0? El CEO tiene `jefe_id = NULL`, así que la lista contiene un `NULL`. Para cualquier cliente, `cliente_id NOT IN (…, NULL)` significa `cliente_id <> … AND cliente_id <> NULL`, y esa última comparación es UNKNOWN: **ninguna** fila pasa. Sin error, sin aviso: solo un resultado vacío.

:::tip Regla práctica
Para "lo que no está", usa **`NOT EXISTS`** o el anti-join (`LEFT JOIN … WHERE … IS NULL`). Si usas `NOT IN`, agrega `WHERE columna IS NOT NULL` dentro de la subconsulta.
:::

## 4. Subconsultas correlacionadas

Una subconsulta es **correlacionada** cuando usa columnas de la consulta de afuera (como el `EXISTS` de arriba). Conceptualmente se ejecuta **una vez por cada fila** de afuera:

```sql
-- Cada producto comparado con el precio promedio de SU categoría
SELECT p.nombre, p.categoria_id, p.precio,
       (SELECT ROUND(AVG(p2.precio), 2)
        FROM productos p2
        WHERE p2.categoria_id = p.categoria_id) AS promedio_categoria
FROM productos p
LIMIT 10;
```

| nombre | categoria_id | precio | promedio_categoria |
|---|---|---|---|
| Smartphone Apple Mini 300 | 6 | 484.99 | 665.49 |
| Parlante Xiaomi Sport 900 | 7 | 425.99 | 239.1 |
| Notebook Apple X | 8 | 1044.99 | 1015.92 |

Para el smartphone (categoría 6), la subconsulta calcula el promedio de **la categoría 6**; para el parlante, el de **la 7**. Fíjate que la tabla aparece dos veces con alias distintos (`p` afuera, `p2` adentro), como en un self join.

:::experto Rendimiento de las correlacionadas
Con 300 productos no importa, pero con millones de filas "una subconsulta por fila" puede ser lento si el motor no la optimiza. Las alternativas habituales son un `JOIN` contra una tabla agregada (`JOIN (SELECT categoria_id, AVG(precio) … GROUP BY categoria_id)`) o una **función de ventana** (`AVG(precio) OVER (PARTITION BY categoria_id)`), que verás pronto y es la forma más elegante.
:::

## 5. Tablas derivadas: una subconsulta en el FROM

El resultado de cualquier `SELECT` es, a su vez, una tabla. Por eso puedes ponerlo en el `FROM` y consultarlo como si existiera. Es la herramienta para **agregar dos veces**:

```sql
-- ¿Cuántos pedidos hace en promedio un cliente (entre los que compraron)?
SELECT ROUND(AVG(n), 2) AS promedio_pedidos
FROM (
  SELECT cliente_id, COUNT(*) AS n      -- paso 1: pedidos por cliente
  FROM pedidos
  GROUP BY cliente_id
) AS t;                                 -- paso 2: promedio de esos conteos
```

Resultado: **8,26** pedidos por cliente. No hay forma de hacerlo en un solo nivel: `AVG(COUNT(*))` no está permitido, porque no se pueden anidar agregaciones directamente.

La tabla derivada **necesita un alias** (`AS t`), aunque no lo uses.

## Legibilidad: cuando las subconsultas se anidan

Una subconsulta dentro de otra dentro de otra se lee "de adentro hacia afuera", y se vuelve difícil muy rápido. En la lección 15 aprenderás las **CTE** (`WITH`), que permiten escribir los mismos pasos **en orden, de arriba hacia abajo**, con nombres. Para todo lo que tenga más de un nivel de anidamiento, usa CTE.




<!-- estandar:errores -->
:::errores
- **Subconsulta escalar que devuelve varias filas**: `WHERE precio > (SELECT precio FROM productos WHERE marca = 'Apple')` falla (o toma solo la primera fila, según el motor). Una subconsulta escalar debe devolver **una fila y una columna**: agrégala con `AVG`, `MAX`, etc.
- **`NOT IN` con nulos**: si la subconsulta devuelve algún `NULL`, `NOT IN` no devuelve nada. Usa `NOT EXISTS` o filtra los nulos.
- **Correlacionar con la tabla equivocada**: en una correlacionada, la columna de afuera tiene que llevar el alias de afuera (`p.categoria_id`). Si no pones alias, SQL puede tomar la columna de la tabla de adentro y la condición siempre se cumple.
- **Subconsultas anidadas en tres niveles**: funcionan, pero nadie las puede leer ni revisar. Pásalas a CTE (próxima lección).
:::

<!-- estandar:trabajo -->
:::trabajo
- Las subconsultas correlacionadas se ejecutan, en principio, **una vez por fila** de afuera. Los optimizadores modernos suelen reescribirlas como JOIN, pero no siempre. En tablas grandes, revisa el plan o reescríbelas con una CTE + JOIN o con funciones de ventana.
- En revisión de código, una subconsulta de más de 10 líneas casi siempre recibe el comentario "pásala a una CTE con nombre". La legibilidad es una exigencia del equipo, no un detalle estético.
:::

<!-- estandar:entrevista -->
:::entrevista "Encuentra los productos más caros que el promedio de su categoría"
Hay tres formas, y conviene mencionar al menos dos: una subconsulta correlacionada (`WHERE precio > (SELECT AVG(precio) FROM productos p2 WHERE p2.categoria_id = p.categoria_id)`), una CTE con el promedio por categoría unida por `categoria_id`, o una función de ventana `AVG(precio) OVER (PARTITION BY categoria_id)`. La de ventana lee la tabla una sola vez.
:::

## Resumen

- Una subconsulta es un `SELECT` entre paréntesis dentro de otro.
- Escalar (un valor) → donde iría un valor; de lista → con `IN`; `EXISTS` → "¿hay al menos una?"; en el `FROM` → tabla derivada con alias.
- `IN`/`EXISTS` no multiplican filas como un `JOIN` (semi-join).
- `NOT IN` con un `NULL` en la lista devuelve vacío: usa `NOT EXISTS`.
- Las correlacionadas usan columnas de afuera; las tablas derivadas permiten agregar dos veces.

## Ejercicios

:::ejercicio sql
Muestra `nombre`, `apellido` y `salario` de los empleados que ganan **más que el salario promedio** de toda la empresa.
```sql solucion
SELECT nombre, apellido, salario FROM empleados WHERE salario > (SELECT AVG(salario) FROM empleados);
```
:::

:::ejercicio sql
Muestra `producto_id` y `nombre` de los productos que **nunca** se vendieron con un descuento del 20% (`descuento = 0.2`). Usa `NOT EXISTS`.
```sql solucion
SELECT pr.producto_id, pr.nombre FROM productos pr
WHERE NOT EXISTS (SELECT 1 FROM detalle_pedidos d WHERE d.producto_id = pr.producto_id AND d.descuento = 0.2);
```
:::

:::ejercicio sql
Muestra `nombre`, `categoria_id` y `precio` de los productos cuyo precio es **mayor que el promedio de su propia categoría** (subconsulta correlacionada).
```sql solucion
SELECT p.nombre, p.categoria_id, p.precio FROM productos p
WHERE p.precio > (SELECT AVG(p2.precio) FROM productos p2 WHERE p2.categoria_id = p.categoria_id);
```
:::

:::ejercicio sql
¿Cuál es el **promedio de unidades por pedido**? Primero suma las unidades de cada pedido en una tabla derivada y luego promedia, redondeando a 2. Columna: `unidades_promedio`.
```sql solucion
SELECT ROUND(AVG(unidades), 2) AS unidades_promedio
FROM (SELECT pedido_id, SUM(cantidad) AS unidades FROM detalle_pedidos GROUP BY pedido_id) t;
```
:::

:::ejercicio sql
Muestra el `pedido_id` y la `fecha_pedido` del (o de los) pedido(s) con el **importe neto más alto** de toda la historia, y ese importe redondeado a 2 (`total`).
```sql solucion
SELECT p.pedido_id, p.fecha_pedido, ROUND(t.total, 2) AS total
FROM pedidos p
JOIN (SELECT pedido_id, SUM(cantidad * precio_unitario * (1 - descuento)) AS total FROM detalle_pedidos GROUP BY pedido_id) t
  ON t.pedido_id = p.pedido_id
WHERE t.total = (SELECT MAX(total) FROM (SELECT SUM(cantidad * precio_unitario * (1 - descuento)) AS total FROM detalle_pedidos GROUP BY pedido_id));
```
```pista
Calcula el total por pedido en una tabla derivada, y compáralo con el máximo de esos totales (otra subconsulta).
```
:::

:::ejercicio sql dificultad=Básico
Muestra `nombre` y `precio` de los productos **más caros que el precio promedio** de todos los productos.
```sql solucion
SELECT nombre, precio FROM productos WHERE precio > (SELECT AVG(precio) FROM productos);
```
:::

:::ejercicio sql dificultad=Intermedio
Muestra `nombre` y `apellido` de los clientes que hicieron **al menos un pedido con `billetera_virtual`**. Usa `IN` con una subconsulta.
```pista
La subconsulta devuelve la lista de `cliente_id` que cumplen la condición.
```
```sql solucion
SELECT nombre, apellido FROM clientes WHERE cliente_id IN (SELECT cliente_id FROM pedidos WHERE metodo_pago = 'billetera_virtual');
```
:::

:::ejercicio sql dificultad=Intermedio
Muestra `pedido_id` de los pedidos que **no tienen ningún pago aprobado**. Usa `NOT EXISTS`.
```pista
`NOT EXISTS (SELECT 1 FROM pagos pg WHERE pg.pedido_id = p.pedido_id AND …)`.
```
```sql solucion
SELECT p.pedido_id FROM pedidos p WHERE NOT EXISTS (SELECT 1 FROM pagos pg WHERE pg.pedido_id = p.pedido_id AND pg.estado = 'aprobado');
```
:::

:::ejercicio sql dificultad=Avanzado
Muestra `nombre`, `marca` y `precio` de los productos que son **los más caros de su marca** (puede haber más de uno por marca si empatan). Usa una subconsulta correlacionada.
```pista
Para cada producto, compara su precio con el máximo de **su** marca.
```
```pista
`WHERE precio = (SELECT MAX(p2.precio) FROM productos p2 WHERE p2.marca = p.marca)`.
```
```sql solucion
SELECT nombre, marca, precio FROM productos p WHERE precio = (SELECT MAX(p2.precio) FROM productos p2 WHERE p2.marca = p.marca);
```
:::

:::ejercicio sql dificultad=Avanzado
¿Cuál es el **promedio de pedidos por cliente**, contando solo a los clientes que compraron? Redondea a 2 decimales. Columna: `promedio`.
```pista
Primero una tabla derivada con los pedidos de cada cliente (`GROUP BY cliente_id`).
```
```pista
Después el promedio sobre esa tabla: `SELECT AVG(n) FROM (…) AS t`.
```
```sql solucion
SELECT ROUND(AVG(n), 2) AS promedio FROM (SELECT cliente_id, COUNT(*) AS n FROM pedidos GROUP BY cliente_id) AS t;
```
:::
