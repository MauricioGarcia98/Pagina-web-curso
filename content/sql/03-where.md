---
titulo: WHERE: filtrar filas
nivel: Básico
duracion: 35
resumen: Comparaciones, AND/OR/NOT, IN, BETWEEN y LIKE.
objetivos: Filtrar filas con `WHERE` usando comparaciones de números, textos y fechas | Combinar condiciones con `AND`, `OR` y `NOT` usando paréntesis cuando hace falta | Usar `IN`, `BETWEEN` y `LIKE` para filtros comunes | Detectar filtros que dejan afuera filas por mayúsculas o espacios
prerrequisitos: sql-select
autoevaluacion: ¿Puedes filtrar los clientes de un país concreto? | ¿Sabes por qué `canal = 'web' OR canal = 'app' AND metodo_pago = 'efectivo'` puede dar un resultado distinto al esperado? | ¿Puedes reescribir varios `OR` sobre la misma columna con `IN`? | ¿Sabes si `BETWEEN 10 AND 20` incluye el 10 y el 20? | ¿Puedes buscar los productos cuyo nombre contiene una palabra?
---

<!-- estandar:escenario -->
:::escenario Los clientes de Argentina
Camila, de marketing, prepara una campaña para Argentina:

> "Necesito la lista de clientes de Argentina con su ciudad. Ah, y aparte, los pedidos cancelados o devueltos del último mes, que quiero entender qué pasó."

Para eso no sirve ver toda la tabla: necesitas **filtrar** filas. Esta lección es sobre `WHERE`, la cláusula que más vas a escribir en tu vida.
:::
## Para qué sirve WHERE

`SELECT` decide **qué columnas** ves. `WHERE` decide **qué filas** ves: se queda solo con las que cumplen una **condición**. Es el filtro de cualquier pregunta de negocio: "los pedidos **de diciembre**", "los clientes **de Chile**", "los productos **sin stock**".

```sql
SELECT nombre, precio
FROM productos
WHERE precio > 1000;
```

El orden de escritura siempre es: `SELECT` → `FROM` → `WHERE` (y `LIMIT`, si lo usas, al final).

### Cómo piensa la base de datos

Imagina que la base recorre la tabla **fila por fila** y, para cada una, se hace la pregunta del `WHERE`:

| producto | precio | ¿precio > 1000? | ¿Aparece? |
|---|---|---|---|
| Smartphone Apple Mini 300 | 484.99 | falso | no |
| Notebook Apple X | 1044.99 | **verdadero** | **sí** |
| Parlante Xiaomi Sport 900 | 425.99 | falso | no |

Solo las filas donde la condición da **verdadero** pasan al resultado. (En realidad el motor es más astuto: con índices puede saltar directo a las filas que sirven. Pero el *resultado* es el mismo que si recorriera fila por fila, y pensarlo así nunca falla.)

:::analogia El colador
`WHERE` es un colador: echas toda la tabla y solo quedan las filas que "no pasan por los agujeros". Filtrar **no borra nada** de la tabla: la próxima consulta vuelve a tener todas las filas.
:::

## Operadores de comparación

| Operador | Significa | Ejemplo |
|---|---|---|
| `=` | igual | `pais = 'Chile'` |
| `<>` o `!=` | distinto | `estado <> 'cancelado'` |
| `>` / `>=` | mayor / mayor o igual | `precio >= 100` |
| `<` / `<=` | menor / menor o igual | `stock < 10` |

Funcionan con **números**, con **texto** y con **fechas**:

- Números: `stock = 0` → productos sin stock.
- Texto: `pais = 'Chile'`. **Comillas simples** siempre. Sin comillas (`pais = Chile`), SQL cree que `Chile` es el nombre de una columna y da error `no such column: Chile`.
- Fechas: en SQLite las fechas se guardan como texto `'AAAA-MM-DD'`, que se ordena igual que el tiempo, así que `fecha_pedido >= '2024-12-01'` funciona perfecto.

:::cuidado Mayúsculas y espacios en los textos
`pais = 'chile'` devuelve **0 filas**, porque en la tabla está escrito `'Chile'`. En la mayoría de los motores las comparaciones de texto distinguen mayúsculas, tildes y espacios: `'Perú'` no es `'Peru'`, ni `'Chile '` (con espacio al final) es `'Chile'`. Antes de filtrar por un texto, mira qué valores existen con `SELECT DISTINCT pais FROM clientes;` (verás `DISTINCT` en detalle más adelante: muestra cada valor una sola vez).
:::

## Combinar condiciones: AND, OR y NOT

| Operador | La fila pasa si… | Ejemplo |
|---|---|---|
| `A AND B` | se cumplen **las dos** | Apple **y** precio mayor a 1.500 |
| `A OR B` | se cumple **al menos una** | de Chile **o** de Perú |
| `NOT A` | **no** se cumple A | `NOT estado = 'entregado'` |

```sql
-- Productos de Apple de más de 1500
SELECT nombre, marca, precio
FROM productos
WHERE marca = 'Apple' AND precio > 1500;

-- Clientes de Chile o de Perú
SELECT nombre, pais
FROM clientes
WHERE pais = 'Chile' OR pais = 'Perú';
```

Un truco para no confundirte: `AND` **achica** el resultado (cada condición nueva deja menos filas) y `OR` lo **agranda** (cada condición nueva suma filas).

### La trampa de la prioridad: usa paréntesis

`AND` se evalúa **antes** que `OR`, igual que en matemática la multiplicación va antes que la suma. Mira cómo cambia el resultado. Queremos "pedidos de web o de app que fueron cancelados":

```sql
-- ❌ Sin paréntesis: 5.666 filas
SELECT COUNT(*) FROM pedidos
WHERE canal = 'web' OR canal = 'app' AND estado = 'cancelado';

-- ✅ Con paréntesis: 687 filas
SELECT COUNT(*) FROM pedidos
WHERE (canal = 'web' OR canal = 'app') AND estado = 'cancelado';
```

(`COUNT(*)` cuenta filas; lo verás en la lección de agregaciones.) La primera consulta se lee, para SQL, como `canal = 'web' OR (canal = 'app' AND estado = 'cancelado')`: **todos** los pedidos web (5.400, cancelados o no) más los de app cancelados. Es un error silencioso: no da mensaje de error, solo un número equivocado. **Regla práctica: si mezclas `AND` y `OR`, pon paréntesis siempre.**

## IN: comparar contra una lista

Cuando tienes muchos `OR` sobre la misma columna, `IN` es más corto y más legible:

```sql
SELECT nombre, pais
FROM clientes
WHERE pais IN ('Chile', 'Perú', 'Uruguay');
```

Es exactamente igual a `pais = 'Chile' OR pais = 'Perú' OR pais = 'Uruguay'`. Su opuesto es `NOT IN`:

```sql
SELECT pedido_id, estado
FROM pedidos
WHERE estado NOT IN ('cancelado', 'devuelto')
LIMIT 10;
```

:::nota Más adelante: IN con una subconsulta
La lista de `IN` también puede salir de otra consulta: "clientes **que están en** la lista de clientes que compraron en diciembre". Lo verás en la lección de subconsultas, junto con una trampa importante de `NOT IN` cuando la lista tiene valores vacíos (`NULL`).
:::

## BETWEEN: un rango (con los extremos incluidos)

```sql
SELECT nombre, precio
FROM productos
WHERE precio BETWEEN 100 AND 200;     -- equivale a: precio >= 100 AND precio <= 200
```

`BETWEEN` **incluye** ambos extremos: un producto de exactamente 100 o exactamente 200 aparece. El menor va primero: `BETWEEN 200 AND 100` devuelve 0 filas.

:::cuidado BETWEEN con fechas y horas
En `pedidos`, `fecha_pedido` es solo una fecha (`2024-12-31`), así que `BETWEEN '2024-12-01' AND '2024-12-31'` funciona. Pero en `eventos_web`, `fecha_hora` incluye la hora (`2024-12-31 18:45:10`), y ese valor es **mayor** que `'2024-12-31'` (como texto, es más largo), así que **queda afuera**:

```sql
-- ❌ Pierde todo lo del 31 de diciembre después de las 00:00: 1.595 filas
SELECT COUNT(*) FROM eventos_web WHERE fecha_hora BETWEEN '2024-12-01' AND '2024-12-31';

-- ✅ Rango semiabierto: desde el 1 (incluido) hasta el 1 del mes siguiente (excluido): 1.658 filas
SELECT COUNT(*) FROM eventos_web WHERE fecha_hora >= '2024-12-01' AND fecha_hora < '2025-01-01';
```

Los profesionales usan siempre la segunda forma (`>=` inicio y `<` día siguiente) para fechas: funciona con o sin hora.
:::

## LIKE: buscar patrones en textos

A veces no sabes el texto exacto, solo una parte. `LIKE` compara contra un **patrón** con dos comodines:

| Comodín | Significa | Ejemplo | Coincide con |
|---|---|---|---|
| `%` | cualquier cantidad de caracteres (incluso cero) | `'Laptop%'` | "Laptop", "Laptop Apple Neo 700" |
| `_` | exactamente **un** carácter | `'_ana'` | "Ana", "Dana" (no "Juana") |

```sql
SELECT nombre FROM productos WHERE nombre LIKE 'Laptop%';      -- empieza con Laptop
SELECT nombre FROM productos WHERE nombre LIKE '%Pro%';        -- contiene "Pro" en cualquier lugar
SELECT email  FROM clientes  WHERE email  LIKE '%@gmail.com';  -- termina en @gmail.com
SELECT nombre FROM productos WHERE nombre NOT LIKE '%Apple%';  -- no contiene Apple
```

Sin comodines, `LIKE 'Chile'` es igual que `= 'Chile'`.

:::nota Mayúsculas en LIKE según el motor
En SQLite, `LIKE` **no** distingue mayúsculas en letras simples (`'laptop%'` también encuentra "Laptop"). En PostgreSQL sí las distingue, y existe `ILIKE` para ignorarlas. En cualquier motor puedes normalizar: `WHERE LOWER(nombre) LIKE '%laptop%'`.
:::

:::experto LIKE '%texto' es lento
Un patrón que **empieza** con `%` obliga a revisar todas las filas: no puede usar un índice (como buscar en una guía telefónica todas las personas cuyo apellido *termina* en "ez"). `'texto%'` sí aprovecha índices. En tablas enormes, la búsqueda de texto libre se resuelve con índices especiales (*full-text search*).
:::

Que `LIKE` distinga mayúsculas o no depende del motor (y de su configuración):

```motores
titulo: Buscar sin importar mayúsculas
[sqlite]
-- LIKE ya ignora mayúsculas en las letras sin acento
SELECT nombre FROM productos
WHERE nombre LIKE '%samsung%'
LIMIT 5;
[postgres]
-- LIKE distingue mayúsculas: para ignorarlas está ILIKE
SELECT nombre FROM productos
WHERE nombre ILIKE '%samsung%'
LIMIT 5;
[mysql]
-- con la intercalación por defecto, LIKE no distingue mayúsculas ni acentos
SELECT nombre FROM productos
WHERE nombre LIKE '%samsung%'
LIMIT 5;
[sqlserver]
-- con la intercalación por defecto (CI = case insensitive), tampoco
SELECT TOP (5) nombre FROM productos
WHERE nombre LIKE '%samsung%';
[bigquery]
-- LIKE distingue mayúsculas: se compara en minúsculas
SELECT nombre FROM tienda.productos
WHERE LOWER(nombre) LIKE '%samsung%'
LIMIT 5;
```

## Filtrar por columnas calculadas

La condición puede usar cálculos:

```sql
-- Productos con margen de ganancia menor al 20 %
SELECT nombre, precio, costo
FROM productos
WHERE (precio - costo) / precio < 0.20;
```

Pero **no** puedes usar en el `WHERE` un alias definido en el `SELECT` (`WHERE margen < 0.20` falla en la mayoría de los motores), porque el `WHERE` se evalúa **antes** que el `SELECT`. Lo explicamos con detalle en la próxima lección.







<!-- estandar:errores -->
:::errores
- **Precedencia de AND y OR**: `AND` se evalúa antes que `OR`. `WHERE canal = 'web' OR canal = 'app' AND metodo_pago = 'efectivo'` significa "web (con cualquier pago) **o** app en efectivo". Pon paréntesis siempre que mezcles los dos: `(canal = 'web' OR canal = 'app') AND metodo_pago = 'efectivo'`.
- **Comparar con NULL usando `=`**: `WHERE telefono = NULL` nunca devuelve filas. Se usa `IS NULL` (lo verás en la lección de NULL).
- **Textos con distinta escritura**: `WHERE pais = 'argentina'` no encuentra `'Argentina'` en muchas bases. Si los datos están sucios, normaliza con `LOWER(TRIM(pais))`.
- **Fechas con hora y BETWEEN**: `BETWEEN '2024-12-01' AND '2024-12-31'` deja afuera todo lo que pasó el 31 después de las 00:00 si la columna tiene hora. Usa el rango semiabierto `>= '2024-12-01' AND < '2025-01-01'`.
:::

<!-- estandar:trabajo -->
:::trabajo
- Casi todas las consultas en producción filtran por **fecha**: "los pedidos de ayer", "el último mes". En tablas grandes, filtrar por la columna de partición (normalmente la fecha) es lo que hace que una consulta tarde segundos en vez de horas.
- Los filtros que vienen "del negocio" (qué cuenta como venta, qué estados se excluyen) se documentan y se acuerdan con el área. Un error típico de un junior es excluir `devuelto` cuando finanzas sí lo quiere ver, o al revés. Ante la duda, **pregunta y anota la definición**.
- `LIKE '%texto%'` no puede usar índices: en tablas grandes es lento. Para búsquedas de texto en serio se usan índices de texto completo u otras herramientas.
:::

<!-- estandar:entrevista -->
:::entrevista "¿Qué diferencia hay entre WHERE y HAVING?"
`WHERE` filtra **filas** antes de agrupar y no puede usar funciones de agregación. `HAVING` filtra **grupos** después del `GROUP BY` y sí puede usar `COUNT`, `SUM`, etc. Lo verás a fondo en la lección de GROUP BY; ya puedes dar la primera mitad de la respuesta.
:::

## Resumen

- `WHERE condición` deja solo las filas donde la condición es verdadera; no modifica la tabla.
- Comparaciones: `=`, `<>`, `>`, `>=`, `<`, `<=`. Texto entre comillas simples y escrito exacto.
- `AND` achica, `OR` agranda, `NOT` invierte. **Paréntesis** siempre que mezcles `AND` y `OR`.
- `IN (lista)` reemplaza varios `OR`; `BETWEEN a AND b` incluye extremos (cuidado con fechas con hora: usa `>=` y `<`).
- `LIKE` busca patrones con `%` (cualquier cosa) y `_` (un carácter).

## Ejercicios

:::ejercicio sql
Muestra `nombre`, `apellido` y `ciudad` de los clientes de **Argentina**.
```sql solucion
SELECT nombre, apellido, ciudad FROM clientes WHERE pais = 'Argentina';
```
:::

:::ejercicio sql
Muestra todas las columnas de los productos de la marca `Samsung` con precio **menor a 500**.
```sql solucion
SELECT * FROM productos WHERE marca = 'Samsung' AND precio < 500;
```
:::

:::ejercicio sql
Muestra `pedido_id`, `fecha_pedido` y `estado` de los pedidos cuyo estado sea `cancelado` **o** `devuelto`. Usa `IN`.
```sql solucion
SELECT pedido_id, fecha_pedido, estado FROM pedidos WHERE estado IN ('cancelado', 'devuelto');
```
:::

:::ejercicio sql
Muestra el `nombre` y `precio` de los productos cuyo nombre **contiene** la palabra `Ultra` y cuesten entre 100 y 600 (incluidos).
```sql solucion
SELECT nombre, precio FROM productos
WHERE nombre LIKE '%Ultra%' AND precio BETWEEN 100 AND 600;
```
```pista
Combina `LIKE '%Ultra%'` con `BETWEEN 100 AND 600` usando `AND`.
```
:::

:::ejercicio sql
Muestra `pedido_id`, `canal` y `metodo_pago` de los pedidos hechos por `web` **o** `app` pagados en `efectivo`. ¡Cuidado con los paréntesis!
```sql solucion
SELECT pedido_id, canal, metodo_pago FROM pedidos
WHERE (canal = 'web' OR canal = 'app') AND metodo_pago = 'efectivo';
```
:::

:::ejercicio sql
Muestra `nombre`, `cargo` y `salario` de los empleados que **no** son del departamento 2 (Ventas) y ganan **más de 4000**.
```sql solucion
SELECT nombre, cargo, salario FROM empleados WHERE departamento_id <> 2 AND salario > 4000;
```
:::

:::ejercicio sql dificultad=Básico
Muestra `nombre` y `stock` de los productos **sin stock** (stock igual a 0).
```sql solucion
SELECT nombre, stock FROM productos WHERE stock = 0;
```
:::

:::ejercicio sql dificultad=Básico
Muestra los pedidos (todas las columnas) hechos por `telefono` y pagados con `efectivo`.
```sql solucion
SELECT * FROM pedidos WHERE canal = 'telefono' AND metodo_pago = 'efectivo';
```
:::

:::ejercicio sql dificultad=Intermedio
Muestra `nombre`, `apellido` y `pais` de los clientes de **Uruguay, Paraguay o Bolivia** que sean del segmento `Pyme`.
```pista
Combina `IN (...)` para los países con `AND` para el segmento.
```
```sql solucion
SELECT nombre, apellido, pais FROM clientes WHERE pais IN ('Uruguay', 'Paraguay', 'Bolivia') AND segmento = 'Pyme';
```
:::

:::ejercicio sql dificultad=Intermedio
Muestra `nombre` y `precio` de los productos cuyo nombre **empieza con** `Notebook` y cuestan **menos de 1500**.
```pista
“Empieza con” es `LIKE 'Notebook%'`: el `%` va solo al final.
```
```sql solucion
SELECT nombre, precio FROM productos WHERE nombre LIKE 'Notebook%' AND precio < 1500;
```
:::

:::ejercicio sql dificultad=Avanzado
Muestra `detalle_id`, `cantidad` y `precio_unitario` de las líneas de `detalle_pedidos` cuyo importe sin descuento (`cantidad * precio_unitario`) **supera 3000**, o que tengan un descuento **de 20 % o más**.
```pista
Puedes filtrar por un cálculo directamente en el `WHERE`.
```
```pista
Dos condiciones unidas por `OR`; el descuento del 20 % es `descuento >= 0.2`.
```
```sql solucion
SELECT detalle_id, cantidad, precio_unitario FROM detalle_pedidos WHERE cantidad * precio_unitario > 3000 OR descuento >= 0.2;
```
:::
