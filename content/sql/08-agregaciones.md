---
titulo: Funciones de agregación
nivel: Intermedio
duracion: 30
resumen: COUNT, SUM, AVG, MIN, MAX y COUNT(DISTINCT): resumir muchas filas en un número.
---

## De muchas filas a un número

Hasta ahora, cada fila del resultado correspondía a una fila de la tabla: si había 2.000 clientes, podías ver hasta 2.000 filas. Pero las preguntas de negocio casi nunca son "muéstrame los 12.000 pedidos", sino:

- ¿**Cuántos** pedidos hubo?
- ¿**Cuánto** facturamos en total?
- ¿Cuál es el ticket **promedio**?
- ¿Cuándo fue el **primer** y el **último** registro?

Para eso existen las **funciones de agregación**: toman **muchas filas** y devuelven **un solo valor** que las resume.

:::analogia La boleta del supermercado
Pasas 40 productos por la caja (40 filas). Al final la boleta te muestra: cantidad de artículos (`COUNT`), total a pagar (`SUM`), el producto más caro (`MAX`). Cuarenta filas se resumieron en unas pocas cifras. Eso hace una agregación.
:::

## Las cinco funciones básicas

| Función | Qué calcula | Funciona con |
|---|---|---|
| `COUNT(*)` | Cantidad de **filas** | Cualquier tabla |
| `COUNT(columna)` | Cantidad de valores **no nulos** de esa columna | Cualquier tipo |
| `COUNT(DISTINCT columna)` | Cantidad de valores **distintos** (no nulos) | Cualquier tipo |
| `SUM(columna)` | Suma | Números |
| `AVG(columna)` | Promedio | Números |
| `MIN(columna)` / `MAX(columna)` | Menor / mayor valor | Números, **textos** (orden alfabético) y **fechas** |

```sql
SELECT COUNT(*)              AS total_clientes,
       COUNT(email)          AS con_email,
       COUNT(DISTINCT pais)  AS paises,
       MIN(fecha_registro)   AS primer_registro,
       MAX(fecha_registro)   AS ultimo_registro
FROM clientes;
```

| total_clientes | con_email | paises | primer_registro | ultimo_registro |
|---|---|---|---|---|
| 2000 | 1911 | 11 | 2021-01-01 | 2024-11-01 |

Fíjate: 2.000 filas entraron y salió **una sola fila**. Cada columna del resultado es un resumen distinto de las mismas filas.

## Las tres versiones de COUNT

Es la función más usada y la que más confunde. Las tres responden preguntas distintas:

| Expresión | Pregunta que responde | En `clientes` |
|---|---|---|
| `COUNT(*)` | ¿Cuántas filas hay? | 2.000 |
| `COUNT(email)` | ¿Cuántas filas tienen email? | 1.911 |
| `COUNT(DISTINCT pais)` | ¿Cuántos países distintos aparecen? | 11 |

Y en `pedidos`:

```sql
SELECT COUNT(*)                   AS pedidos,
       COUNT(DISTINCT cliente_id) AS clientes_que_compraron
FROM pedidos;
```

Hay 12.000 pedidos hechos por **1.453** clientes distintos. Eso ya es información de negocio: de 2.000 clientes registrados, 547 nunca compraron. Confundir `COUNT(*)` con `COUNT(DISTINCT cliente_id)` es uno de los errores más caros en reportes: "tenemos 12.000 compradores" vs. "tenemos 1.453".

:::tip Un truco con COUNT
`COUNT(*) - COUNT(email)` = cantidad de clientes **sin** email (89). Como `COUNT(columna)` ignora los `NULL`, la resta los cuenta.
:::

## SUM y AVG

```sql
SELECT COUNT(*)                                  AS lineas,
       ROUND(SUM(cantidad * precio_unitario), 2) AS facturacion_bruta,
       ROUND(AVG(cantidad * precio_unitario), 2) AS importe_promedio_linea,
       MIN(precio_unitario)                      AS precio_minimo,
       MAX(precio_unitario)                      AS precio_maximo
FROM detalle_pedidos;
```

| lineas | facturacion_bruta | importe_promedio_linea | precio_minimo | precio_maximo |
|---|---|---|---|---|
| 25524 | 14878014.07 | 582.9 | 8.09 | 2374.99 |

Observa que dentro de `SUM` puede ir una **expresión**: primero se calcula `cantidad * precio_unitario` en cada fila, y después se suman todos esos resultados.

:::cuidado AVG ignora los NULL
`AVG(x)` es `SUM(x) / COUNT(x)`, **no** `SUM(x) / COUNT(*)`. Las filas con `NULL` no cuentan ni arriba ni abajo. Si para tu negocio un `NULL` significa "cero" (por ejemplo, un descuento no informado = sin descuento), escríbelo: `AVG(COALESCE(descuento, 0))`. Lo viste en la lección de `NULL`.
:::

:::cuidado El promedio de promedios
Si tienes el ticket promedio de cada país y los promedias, **no** obtienes el ticket promedio total (un país con 10 pedidos pesaría lo mismo que uno con 5.000). El promedio general siempre se calcula desde las filas originales: `SUM(total) / COUNT(*)`. Es una trampa clásica de entrevistas y del módulo de casos de negocio.
:::

## MIN y MAX con textos y fechas

`MIN` y `MAX` no son solo para números:

```sql
SELECT MIN(nombre) AS primero_alfabetico,   -- Agustín
       MAX(nombre) AS ultimo_alfabetico     -- Ximena
FROM clientes;

SELECT MIN(fecha_pedido) AS primer_pedido,
       MAX(fecha_pedido) AS ultimo_pedido
FROM pedidos;
```

Con fechas ISO, `MAX(fecha)` es la más reciente: así se responde "¿cuándo fue la última compra de cada cliente?" (con `GROUP BY`, en la próxima lección).

## Agregar con filtros: WHERE va antes

`WHERE` se aplica **antes** de agregar: primero se eligen las filas y después se resumen.

```sql
-- ¿Cuántos pedidos se cancelaron en 2024?
SELECT COUNT(*) AS cancelados_2024
FROM pedidos
WHERE estado = 'cancelado'
  AND fecha_pedido >= '2024-01-01' AND fecha_pedido < '2025-01-01';
```

### Contar varias cosas a la vez: agregación condicional

¿Y si quieres, en una misma consulta, el total de pedidos **y** los cancelados? Con `WHERE` no se puede (filtraría todo). El truco es sumar `1` solo cuando se cumple la condición:

```sql
SELECT COUNT(*) AS pedidos,
       SUM(CASE WHEN estado = 'cancelado' THEN 1 ELSE 0 END) AS cancelados,
       ROUND(100.0 * SUM(CASE WHEN estado = 'cancelado' THEN 1 ELSE 0 END) / COUNT(*), 2) AS pct_cancelados
FROM pedidos;
```

`CASE WHEN` (que verás en detalle en la lección 10) devuelve 1 para los cancelados y 0 para el resto; la suma de unos es la cantidad. Es una de las técnicas más usadas en análisis: la verás en casi todos los casos de negocio.

## Una regla importante: agregaciones y columnas sueltas

Sin `GROUP BY`, una consulta con agregaciones devuelve **una sola fila**. Por eso esto no tiene sentido:

```sql norun
SELECT nombre, COUNT(*) FROM clientes;   -- ❌ ¿qué "nombre" mostraría al lado del 2000?
```

Hay 2.000 nombres y un solo conteo: no hay una respuesta lógica. PostgreSQL, SQL Server, BigQuery y Spark dan **error**. SQLite y MySQL (en ciertos modos) lo permiten y muestran **un nombre cualquiera**, lo que es aún peor porque parece correcto. Si quieres "el conteo **por** algo", necesitas `GROUP BY`: es la próxima lección.

## Resumen

- Las agregaciones resumen muchas filas en un valor: `COUNT`, `SUM`, `AVG`, `MIN`, `MAX`.
- `COUNT(*)` cuenta filas; `COUNT(col)` cuenta no nulos; `COUNT(DISTINCT col)` cuenta valores distintos.
- `AVG` ignora los `NULL`; nunca promedies promedios.
- `WHERE` filtra antes de agregar; para contar con condición usa `SUM(CASE WHEN … THEN 1 ELSE 0 END)`.
- Sin `GROUP BY` el resultado es una sola fila: no mezcles columnas sueltas con agregaciones.

## Ejercicios

:::ejercicio sql
¿Cuántos productos hay y cuál es su precio **promedio** (redondeado a 2 decimales)? Columnas: `cantidad`, `precio_promedio`.
```sql solucion
SELECT COUNT(*) AS cantidad, ROUND(AVG(precio), 2) AS precio_promedio FROM productos;
```
:::

:::ejercicio sql
Muestra el precio **mínimo** y **máximo** de los productos de la marca `Apple`. Columnas: `minimo`, `maximo`.
```sql solucion
SELECT MIN(precio) AS minimo, MAX(precio) AS maximo FROM productos WHERE marca = 'Apple';
```
:::

:::ejercicio sql
¿Cuántos clientes **distintos** hicieron al menos un pedido? Columna: `clientes_con_pedidos`.
```sql solucion
SELECT COUNT(DISTINCT cliente_id) AS clientes_con_pedidos FROM pedidos;
```
:::

:::ejercicio sql
Calcula el **total de unidades vendidas** (`SUM(cantidad)`) y el **importe neto** total de todas las líneas de `detalle_pedidos`, donde importe neto = `cantidad * precio_unitario * (1 - descuento)`, redondeado a 2 decimales. Columnas: `unidades`, `importe_neto`.
```sql solucion
SELECT SUM(cantidad) AS unidades, ROUND(SUM(cantidad * precio_unitario * (1 - descuento)), 2) AS importe_neto
FROM detalle_pedidos;
```
:::

:::ejercicio sql
¿Cuántos clientes **no tienen** teléfono y cuántos no tienen email? Hazlo en una sola consulta, **sin WHERE**, usando la diferencia entre `COUNT(*)` y `COUNT(columna)`. Columnas: `sin_telefono`, `sin_email`.
```sql solucion
SELECT COUNT(*) - COUNT(telefono) AS sin_telefono, COUNT(*) - COUNT(email) AS sin_email FROM clientes;
```
:::
