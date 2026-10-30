---
titulo: ORDER BY, LIMIT y DISTINCT
nivel: Básico
duracion: 30
resumen: Ordenar resultados, paginar y eliminar duplicados.
objetivos: Ordenar resultados por una o varias columnas, ascendente o descendente | Obtener un "top N" correcto combinando `ORDER BY` y `LIMIT` | Paginar resultados con `LIMIT` y `OFFSET` | Quitar filas repetidas con `DISTINCT` y saber cuándo no es la solución
prerrequisitos: sql-where
autoevaluacion: ¿Puedes mostrar los 10 productos más caros, del más caro al más barato? | ¿Sabes por qué `LIMIT` sin `ORDER BY` no devuelve "los primeros"? | ¿Sabes desempatar un ranking agregando una segunda columna al `ORDER BY`? | ¿Puedes mostrar la segunda página de 15 resultados? | ¿Sabes qué hace `DISTINCT` cuando le das dos columnas?
---

<!-- estandar:escenario -->
:::escenario El top 5 de sueldos
Tomás, del área de personas, prepara la revisión salarial anual:

> "¿Me pasas los 5 empleados que más ganan, con su cargo? Y aparte, la lista de marcas que vendemos, sin repetidos, que la necesito para un formulario."

Las tablas no tienen un orden propio. Para un ranking necesitas **ordenar** y **cortar**, y para una lista de valores únicos, **quitar repetidos**.
:::
## Las tablas no tienen orden

Una idea que sorprende al principio: **las filas de una tabla no tienen un orden garantizado**. Si ejecutas `SELECT * FROM productos` dos veces, normalmente verás el mismo orden, pero es casualidad: depende de cómo están guardadas en disco, de si se borró o actualizó algo, de si el motor trabaja en paralelo (en Spark o BigQuery el orden cambia de una ejecución a otra). Si el orden **importa** para tu pregunta, tienes que pedirlo explícitamente con `ORDER BY`.

## ORDER BY: ordenar el resultado

```sql
SELECT nombre, precio
FROM productos
ORDER BY precio DESC
LIMIT 5;
```

| nombre | precio |
|---|---|
| Notebook Apple Sport | 2374.99 |
| Laptop Asus Classic 900 | 2251.99 |
| Notebook Asus Eco | 2079.99 |
| Laptop Apple Neo 700 | 2039.99 |
| Candado Specialized Pro 800 | 1945.99 |

- `ASC` (*ascending*, ascendente): de menor a mayor. Es el valor **por defecto**: si no escribes nada, ordena ascendente.
- `DESC` (*descending*, descendente): de mayor a menor.

Cómo ordena cada tipo de dato:

| Tipo | ASC significa | Ejemplo |
|---|---|---|
| Números | del más chico al más grande | 1, 2, 10, 100 |
| Texto | orden alfabético (según la "intercalación" del motor) | Argentina, Bolivia, Chile |
| Fechas `AAAA-MM-DD` | de la más antigua a la más reciente | 2022-01-01, 2024-12-31 |

:::cuidado Números guardados como texto
Si una columna guarda números como **texto**, el orden es alfabético: `'10'` va antes que `'9'` (porque compara el primer carácter: "1" < "9"). Si ves un orden raro, revisa el tipo de la columna y conviértela: `ORDER BY CAST(columna AS INTEGER)`.
:::

### Ordenar por varias columnas

Puedes ordenar por varias columnas separadas por comas. La segunda solo se usa para **desempatar** cuando la primera es igual, la tercera para desempatar la segunda, y así:

```sql
SELECT pais, ciudad, nombre
FROM clientes
ORDER BY pais ASC, ciudad ASC, nombre ASC
LIMIT 20;
```

Primero todos los de Argentina (ordenados por ciudad, y dentro de cada ciudad por nombre), después Bolivia, etc. Cada columna lleva su propio `ASC`/`DESC`: `ORDER BY pais ASC, precio DESC` es "países de la A a la Z y, dentro de cada país, del más caro al más barato".

:::analogia La guía telefónica
Una guía se ordena por apellido y, entre los que se apellidan igual, por nombre. "García, Ana" va antes que "García, Beto". Eso es `ORDER BY apellido, nombre`.
:::

### Ordenar por un cálculo o un alias

```sql
SELECT nombre, precio - costo AS ganancia
FROM productos
ORDER BY ganancia DESC
LIMIT 5;
```

Aquí **sí** puedes usar el alias `ganancia`. ¿Por qué en `ORDER BY` sí y en `WHERE` no? Lo explica la sección "El orden real de ejecución", más abajo. También puedes ordenar por una expresión que no aparece en el `SELECT` (`ORDER BY precio - costo DESC`) o por la posición de la columna (`ORDER BY 2 DESC` = por la segunda columna; funciona, pero es frágil: si agregas una columna al principio, cambia el significado).

:::nota ¿Dónde quedan los NULL al ordenar?
Los valores vacíos (`NULL`) no son ni grandes ni chicos. Cada motor decide: en SQLite y MySQL van **primero** en orden ascendente; en PostgreSQL y Oracle, **al final**. Puedes forzarlo con `NULLS FIRST` o `NULLS LAST` (SQLite 3.30+, PostgreSQL, Spark, BigQuery): `ORDER BY fecha_entrega DESC NULLS LAST`.
:::

```recorrido
titulo: ORDER BY y LIMIT paso a paso: los 3 productos más caros
estacion tabla: La tabla | icono=tabla
estacion orden: ORDER BY | icono=flujo
estacion limit: LIMIT | icono=x
estacion res: Resultado | icono=check
paso tabla: Sin orden
Las filas de una tabla no tienen un orden garantizado. Estos son 6 productos tal como salen.
>>> tabla
nombre,precio
Smartphone Apple Mini 300,484.99
Parlante Xiaomi Sport 900,425.99
Notebook Apple X,1044.99
Teclado Kingston Ultra 200,458.99
Juego de ollas Philips Plus 400,42.99
Mesa Muebles Sur Mini 500,40.99
paso orden: ORDER BY precio DESC
`ORDER BY precio DESC` ordena de mayor a menor (`DESC` = descendente; sin nada, o con `ASC`, sería de menor a mayor).
>>> tabla
nombre,precio
Notebook Apple X,1044.99
Smartphone Apple Mini 300,484.99
Teclado Kingston Ultra 200,458.99
Parlante Xiaomi Sport 900,425.99
Juego de ollas Philips Plus 400,42.99
Mesa Muebles Sur Mini 500,40.99
paso limit: LIMIT 3 corta
`LIMIT 3` se queda con las **primeras 3 filas del resultado ya ordenado**. Por eso el orden se aplica antes que el límite.
>>> sql
SELECT nombre, precio
FROM productos
ORDER BY precio DESC
LIMIT 3;
paso res: El top 3
Los 3 más caros de estos 6. Sin el ORDER BY, LIMIT 3 daría 3 productos cualquiera.
>>> tabla
nombre,precio
Notebook Apple X,1044.99
Smartphone Apple Mini 300,484.99
Teclado Kingston Ultra 200,458.99
```

## LIMIT: el "top N"

Combinado con `ORDER BY`, `LIMIT` responde preguntas de tipo **ranking**: "los 5 productos más caros", "los 10 clientes más antiguos", "el último pedido".

```sql
-- Los 10 clientes que se registraron primero
SELECT nombre, apellido, fecha_registro
FROM clientes
ORDER BY fecha_registro ASC
LIMIT 10;
```

:::cuidado LIMIT sin ORDER BY no es "los primeros"
`SELECT * FROM pedidos LIMIT 5` no te da "los 5 primeros pedidos": te da **5 pedidos cualesquiera**. Para "los 5 primeros", ordena por fecha. Para "el top 5", ordena por la métrica.
:::

:::cuidado Empates en el corte
"Los 3 productos más caros" con `LIMIT 3`: si el 3.º y el 4.º cuestan lo mismo, uno queda afuera y cuál depende del azar. Para un resultado estable, agrega una columna de desempate: `ORDER BY precio DESC, producto_id`. Para incluir todos los empatados necesitarás funciones de ventana (`RANK`), que verás más adelante.
:::

`LIMIT` no es estándar: cada motor tiene su forma de pedir “las primeras N filas”.

```motores
titulo: Los 5 productos más caros
[sqlite]
SELECT nombre, precio
FROM productos
ORDER BY precio DESC
LIMIT 5;
[postgres]
SELECT nombre, precio
FROM productos
ORDER BY precio DESC
LIMIT 5;
-- la forma estándar también vale: FETCH FIRST 5 ROWS ONLY
[mysql]
SELECT nombre, precio
FROM productos
ORDER BY precio DESC
LIMIT 5;
[sqlserver]
SELECT TOP (5) nombre, precio
FROM productos
ORDER BY precio DESC;
[oracle]
SELECT nombre, precio
FROM productos
ORDER BY precio DESC
FETCH FIRST 5 ROWS ONLY;
```

### Paginar con OFFSET

`OFFSET n` **salta** las primeras `n` filas. Sirve para mostrar resultados por páginas, como un buscador:

```sql
-- Página 3, con 10 resultados por página: salta 20 y toma 10
SELECT producto_id, nombre
FROM productos
ORDER BY producto_id
LIMIT 10 OFFSET 20;
```

La fórmula: `OFFSET = (número_de_página − 1) × tamaño_de_página`.

:::nota Cómo se escribe en otros motores
- PostgreSQL, MySQL, SQLite, Spark, BigQuery: `LIMIT 10 OFFSET 20`.
- SQL Server: `SELECT TOP 10 …` o `OFFSET 20 ROWS FETCH NEXT 10 ROWS ONLY`.
- Oracle y el estándar SQL: `FETCH FIRST 10 ROWS ONLY`.
:::

```motores
titulo: La tercera página de 10 productos
[sqlite]
SELECT producto_id, nombre
FROM productos
ORDER BY producto_id
LIMIT 10 OFFSET 20;
[postgres]
SELECT producto_id, nombre
FROM productos
ORDER BY producto_id
LIMIT 10 OFFSET 20;
[mysql]
-- MySQL también acepta LIMIT desde, cantidad
SELECT producto_id, nombre
FROM productos
ORDER BY producto_id
LIMIT 20, 10;
[sqlserver]
-- OFFSET … FETCH exige ORDER BY
SELECT producto_id, nombre
FROM productos
ORDER BY producto_id
OFFSET 20 ROWS FETCH NEXT 10 ROWS ONLY;
```

## DISTINCT: quitar repetidos

`DISTINCT` elimina las filas **repetidas** del resultado. Es la forma más rápida de responder "¿qué valores distintos hay en esta columna?":

```sql
SELECT DISTINCT pais
FROM clientes
ORDER BY pais;
```

La tabla tiene 2.000 clientes, pero el resultado son **11** filas, una por país.

`DISTINCT` se aplica a la **combinación** de todas las columnas del `SELECT`, no a la primera:

```sql
SELECT DISTINCT pais, segmento
FROM clientes
ORDER BY pais, segmento;
```

Devuelve **33** filas: cada combinación país + segmento (11 países × 3 segmentos). Si existe "Chile – Pyme" y "Chile – Consumidor", aparecen ambas.

:::cuidado DISTINCT no es un arreglo mágico
Si una consulta devuelve filas duplicadas que no esperabas, agregar `DISTINCT` "para que desaparezcan" suele **esconder** un error (típicamente, un `JOIN` mal hecho que multiplica filas). Primero entiende **por qué** se duplican. Además, `DISTINCT` obliga al motor a comparar todas las filas: en tablas grandes es costoso.
:::

## El orden de escritura y el orden real de ejecución

Las cláusulas se **escriben** siempre en este orden:

```sql norun
SELECT    columnas y cálculos
FROM      tabla
WHERE     condición sobre filas
ORDER BY  columnas
LIMIT     n OFFSET m;
```

Pero la base de datos las **ejecuta** en otro orden, que tiene mucha lógica:

| Paso | Cláusula | Qué hace |
|---|---|---|
| 1 | `FROM` | Busca la tabla |
| 2 | `WHERE` | Descarta las filas que no cumplen la condición |
| 3 | `SELECT` | Calcula las columnas pedidas y les pone alias |
| 4 | `DISTINCT` | Quita repetidos |
| 5 | `ORDER BY` | Ordena |
| 6 | `LIMIT` / `OFFSET` | Corta |

(Cuando aprendas `GROUP BY` y `HAVING`, se ubicarán entre `WHERE` y `SELECT`.)

Este orden explica varias cosas que parecían caprichos:

- En `WHERE` **no** puedes usar un alias del `SELECT`: cuando se ejecuta `WHERE` (paso 2), el `SELECT` (paso 3) todavía no calculó nada.
- En `ORDER BY` **sí** puedes usar alias: se ejecuta en el paso 5, cuando los alias ya existen.
- `LIMIT` se aplica **al final**: primero se filtra y se ordena todo, y recién después se cortan las filas. Por eso `ORDER BY … LIMIT 5` da el verdadero top 5.







<!-- estandar:errores -->
:::errores
- **`LIMIT` sin `ORDER BY`**: devuelve filas en el orden que la base las encuentre, que puede cambiar entre ejecuciones. Un "top 10" siempre necesita `ORDER BY`.
- **Empates en el corte**: si el producto 10 y el 11 cuestan lo mismo, `LIMIT 10` elige uno al azar. Agrega una columna de desempate (`ORDER BY precio DESC, producto_id`) para que el resultado sea siempre el mismo.
- **`DESC` solo afecta a la columna que lo tiene**: `ORDER BY pais, ventas DESC` ordena país de A a Z y ventas de mayor a menor dentro de cada país.
- **`DISTINCT` para "arreglar" duplicados de un JOIN**: si aparecen filas repetidas, casi siempre el problema es el JOIN. `DISTINCT` lo esconde y puede dar totales incorrectos.
:::

<!-- estandar:trabajo -->
:::trabajo
- Ordenar es caro en tablas grandes: la base tiene que ver **todas** las filas antes de saber cuál es la primera. Por eso en un pipeline no se ordena "por si acaso": se ordena solo el resultado final que alguien va a mirar.
- La paginación con `OFFSET` se vuelve lenta en páginas altas (`OFFSET 100000` lee y descarta cien mil filas). Las APIs y aplicaciones usan *keyset pagination*: `WHERE id > ultimo_id_visto ORDER BY id LIMIT 50`.
- Para rankings por grupo ("el top 3 de cada categoría") no alcanza con `ORDER BY` + `LIMIT`: se usan funciones de ventana, que verás más adelante.
:::

<!-- estandar:entrevista -->
:::entrevista "¿En qué orden ejecuta SQL las cláusulas de un SELECT?"
`FROM` → `WHERE` → `GROUP BY` → `HAVING` → `SELECT` → `DISTINCT` → `ORDER BY` → `LIMIT`. Por eso en `ORDER BY` sí puedes usar un alias definido en el `SELECT`, pero en `WHERE` no (todavía no existe cuando se filtra).
:::

## Resumen

- Sin `ORDER BY`, el orden de las filas no está garantizado.
- `ORDER BY col [ASC|DESC]`, con varias columnas para desempatar; acepta alias y expresiones.
- `LIMIT n` corta el resultado (top N con `ORDER BY`); `OFFSET` salta filas para paginar.
- `DISTINCT` devuelve combinaciones únicas de todas las columnas seleccionadas; no lo uses para tapar duplicados que no entiendes.
- Orden de ejecución: `FROM → WHERE → SELECT → DISTINCT → ORDER BY → LIMIT`.

## Ejercicios

:::ejercicio sql ordenado
Muestra `nombre` y `precio` de los **10 productos más baratos**, del más barato al más caro. Si hay empate de precio, ordena por `nombre`.
```sql solucion
SELECT nombre, precio FROM productos ORDER BY precio ASC, nombre ASC LIMIT 10;
```
:::

:::ejercicio sql ordenado
Muestra `nombre`, `apellido`, `cargo` y `salario` de los **5 empleados que más ganan**.
```sql solucion
SELECT nombre, apellido, cargo, salario FROM empleados ORDER BY salario DESC LIMIT 5;
```
:::

:::ejercicio sql ordenado
¿Qué **marcas** distintas hay en la tabla `productos`? Muéstralas ordenadas alfabéticamente (una columna llamada `marca`).
```sql solucion
SELECT DISTINCT marca FROM productos ORDER BY marca;
```
:::

:::ejercicio sql ordenado
Muestra las combinaciones únicas de `canal` y `metodo_pago` que existen en `pedidos`, ordenadas por `canal` y luego por `metodo_pago`.
```sql solucion
SELECT DISTINCT canal, metodo_pago FROM pedidos ORDER BY canal, metodo_pago;
```
:::

:::ejercicio sql ordenado
Muestra `producto_id` y `nombre` de los productos de la **segunda página** de 15 resultados, ordenados por `producto_id` (es decir, los productos que ocupan las posiciones 16 a 30).
```sql solucion
SELECT producto_id, nombre FROM productos ORDER BY producto_id LIMIT 15 OFFSET 15;
```
:::

:::ejercicio sql ordenado dificultad=Básico
Muestra `nombre` y `fecha_registro` de los **10 clientes más antiguos** (los que se registraron primero).
```sql solucion
SELECT nombre, fecha_registro FROM clientes ORDER BY fecha_registro LIMIT 10;
```
:::

:::ejercicio sql ordenado dificultad=Básico
Muestra los países distintos donde hay clientes, ordenados alfabéticamente (una columna `pais`).
```sql solucion
SELECT DISTINCT pais FROM clientes ORDER BY pais;
```
:::

:::ejercicio sql ordenado dificultad=Intermedio
Muestra `nombre`, `marca` y `precio` de los productos ordenados por `marca` (A→Z) y, dentro de cada marca, del **más caro al más barato**.
```pista
Cada columna del `ORDER BY` puede llevar su propia dirección.
```
```sql solucion
SELECT nombre, marca, precio FROM productos ORDER BY marca, precio DESC;
```
:::

:::ejercicio sql ordenado dificultad=Intermedio
Muestra `nombre`, `precio`, `costo` y la columna `margen` (precio − costo) de los **5 productos con mayor margen**.
```pista
Puedes ordenar por el alias de una columna calculada.
```
```sql solucion
SELECT nombre, precio, costo, precio - costo AS margen FROM productos ORDER BY margen DESC LIMIT 5;
```
:::

:::ejercicio sql ordenado dificultad=Avanzado
Muestra `empleado_id`, `nombre` y `salario` del empleado que ocupa el **puesto 3** del ranking de salarios (de mayor a menor). Si hay empates, desempata por `empleado_id`.
```pista
`LIMIT 1` con `OFFSET` te deja elegir “la fila número N”.
```
```pista
El puesto 3 se salta 2 filas: `OFFSET 2`. Agrega `empleado_id` al `ORDER BY` para desempatar.
```
```sql solucion
SELECT empleado_id, nombre, salario FROM empleados ORDER BY salario DESC, empleado_id LIMIT 1 OFFSET 2;
```
:::
