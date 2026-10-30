---
titulo: SELECT: elegir columnas, alias y cálculos
nivel: Básico
duracion: 30
resumen: Seleccionar columnas específicas, renombrarlas con AS y calcular nuevas columnas.
objetivos: Elegir solo las columnas que necesitas, en el orden que quieras | Calcular columnas nuevas con operaciones aritméticas | Ponerles nombres claros a los resultados con `AS` | Combinar textos con `||` para armar columnas como el nombre completo
prerrequisitos: sql-introduccion
autoevaluacion: ¿Puedes mostrar tres columnas concretas de una tabla en el orden que te pidan? | ¿Sabes calcular el precio con IVA de cada producto y llamarlo `precio_con_iva`? | ¿Sabes por qué `SELECT nombre precio FROM productos` no da error pero está mal? | ¿Puedes armar `apellido, nombre` en una sola columna? | ¿Sabes por qué en producción se evita `SELECT *`?
---

<!-- estandar:escenario -->
:::escenario El listado de precios para Comercial
Valentina, la gerente comercial, te escribe:

> "Necesito un listado de productos para revisar precios con los proveedores: nombre, marca y precio, y una columna con el precio con IVA, que es lo que ve el cliente. No me mandes las 9 columnas de la tabla, que me pierdo."

Ya sabes ver una tabla completa con `SELECT *`. Ahora vas a aprender a **elegir** columnas, **calcular** columnas nuevas y **ponerles nombre**, para entregar exactamente lo que te pidieron.
:::
## Elegir columnas: pedir solo lo que necesitas

En la lección anterior usaste `SELECT *`, que trae **todas** las columnas. En la práctica casi nunca necesitas todas. Para elegir, escribe los nombres de las columnas **separados por comas**, en el orden en que quieres verlas:

```sql
SELECT nombre, apellido, pais
FROM clientes
LIMIT 5;
```

El resultado tiene exactamente esas tres columnas, en ese orden. Si escribes `SELECT pais, nombre`, primero verás el país. El orden de las columnas en el resultado lo decides tú, sin importar cómo esté guardada la tabla.

:::cuidado La coma, el error más común
- Una coma de más al final (`SELECT nombre, apellido, FROM clientes`) da error de sintaxis cerca de `FROM`.
- Una coma de menos (`SELECT nombre apellido FROM clientes`) **no** da error pero hace otra cosa: interpreta `apellido` como un **alias** de `nombre` (lo verás abajo). Verás una sola columna llamada `apellido` ¡que en realidad contiene los nombres!
:::

### ¿Por qué evitar `SELECT *` en código profesional?

| Motivo | Explicación |
|---|---|
| **Rendimiento** | En bases columnares (BigQuery, Snowflake, Redshift, Parquet en Spark) cada columna se guarda aparte. Pedir 3 columnas de 50 lee ~6 % de los datos. En la nube eso también es **dinero**: BigQuery y Athena cobran por datos leídos. |
| **Estabilidad** | Si alguien agrega una columna a la tabla, un `SELECT *` cambia su resultado y puede romper un reporte o una carga que esperaba cierta cantidad de columnas. |
| **Claridad** | Quien lea tu consulta sabe exactamente qué datos usas. |

`SELECT *` está perfecto para **explorar** una tabla con `LIMIT`. Para consultas que quedan en un reporte o un pipeline, nombra las columnas.

```recorrido
titulo: SELECT paso a paso: de la tabla completa a las columnas que pediste
estacion tabla: La tabla | icono=tabla
estacion from: FROM | icono=base
estacion select: SELECT | icono=lupa
estacion calc: Columna calculada | icono=transformar
estacion res: Resultado | icono=check
paso tabla: La tabla productos
Así se ven las primeras 6 filas de `productos` (tiene más columnas: categoría, marca, stock…). Queremos solo el nombre y el precio.
>>> tabla
producto_id,nombre,categoria_id,marca,precio,costo,stock
1,Smartphone Apple Mini 300,6,Apple,484.99,310.41,38
2,Parlante Xiaomi Sport 900,7,Xiaomi,425.99,242.21,0
3,Notebook Apple X,8,Apple,1044.99,718.28,468
4,Teclado Kingston Ultra 200,9,Kingston,458.99,291.39,124
5,Juego de ollas Philips Plus 400,10,Philips,42.99,31.51,438
6,Mesa Muebles Sur Mini 500,11,Muebles Sur,40.99,23.19,113
paso from: FROM elige de dónde leer
`FROM productos` le dice a la base **qué tabla** usar. Todavía no se eligió ninguna columna.
>>> sql
SELECT nombre, precio
FROM productos;
paso select: SELECT se queda con las columnas que nombras
De todas las columnas, solo quedan `nombre` y `precio`, **en el orden en que las escribiste**. Las filas son las mismas.
>>> tabla
nombre,precio
Smartphone Apple Mini 300,484.99
Parlante Xiaomi Sport 900,425.99
Notebook Apple X,1044.99
Teclado Kingston Ultra 200,458.99
Juego de ollas Philips Plus 400,42.99
Mesa Muebles Sur Mini 500,40.99
paso calc: También puedes calcular
Una columna puede ser una **cuenta**: `precio - costo` se calcula fila por fila, y `AS margen` le pone nombre.
>>> sql
SELECT nombre, precio, precio - costo AS margen
FROM productos;
paso res: El resultado
La base devuelve una **tabla nueva** con lo que pediste. La tabla `productos` no cambió: un SELECT solo lee.
>>> tabla
nombre,precio,margen
Smartphone Apple Mini 300,484.99,174.58
Parlante Xiaomi Sport 900,425.99,183.78
Notebook Apple X,1044.99,326.71
Teclado Kingston Ultra 200,458.99,167.6
Juego de ollas Philips Plus 400,42.99,11.48
Mesa Muebles Sur Mini 500,40.99,17.8
```

## Calcular columnas nuevas

Una columna del resultado no tiene que existir en la tabla: puede ser un **cálculo**. SQL entiende los operadores aritméticos de siempre:

| Operador | Significa | Ejemplo | Resultado |
|---|---|---|---|
| `+` | suma | `precio + 10` | precio más 10 |
| `-` | resta | `precio - costo` | la ganancia por unidad |
| `*` | multiplicación | `precio * stock` | valor del stock a precio de venta |
| `/` | división | `precio / 2` | la mitad |
| `%` | resto de la división (módulo) | `7 % 2` | `1` |

```sql
SELECT nombre, precio, costo, precio - costo
FROM productos
LIMIT 5;
```

El cálculo se hace **fila por fila**: para cada producto, SQL toma *su* precio y le resta *su* costo. No modifica la tabla; solo muestra el resultado.

### La trampa de la división entera

Prueba esta consulta:

```sql
SELECT 7 / 2, 7.0 / 2, 7 / 2.0, 7 % 2;
```

| 7 / 2 | 7.0 / 2 | 7 / 2.0 | 7 % 2 |
|---|---|---|---|
| 3 | 3.5 | 3.5 | 1 |

Cuando divides **dos enteros**, SQLite (y también PostgreSQL y SQL Server) devuelve un **entero**: descarta los decimales. `7 / 2` da `3`, no `3.5`. Para obtener decimales, basta que **uno** de los dos números sea decimal: `7.0 / 2` o multiplicar por `1.0`. Este error aparece muchísimo al calcular porcentajes (`ventas_chile / ventas_total` da `0`), así que recuérdalo: **`100.0 * parte / total`**.

### Redondear: ROUND

Los números decimales en las computadoras a veces muestran "ruido". Mira la ganancia del primer producto:

| nombre | precio | costo | precio - costo |
|---|---|---|---|
| Smartphone Apple Mini 300 | 484.99 | 310.41 | 174.57999999999998 |

Esto pasa porque la computadora guarda los decimales en binario y algunos (como 0,1) no se pueden representar exactos. La solución es redondear al mostrar: `ROUND(valor, decimales)`.

```sql
SELECT nombre, ROUND(precio - costo, 2) AS ganancia
FROM productos
LIMIT 5;
```

`ROUND(174.579999, 2)` da `174.58`. Con `ROUND(x, 0)` o `ROUND(x)` redondeas al entero.

:::experto Dinero y decimales en producción
En sistemas financieros reales los montos se guardan con tipos exactos (`DECIMAL(12,2)` / `NUMERIC`) o en **centavos enteros**, para que las sumas nunca pierdan un centavo. SQLite no tiene un tipo decimal exacto, por eso en el curso redondeamos el resultado final.
:::

## Ponerle nombre a una columna: alias con AS

Una columna calculada aparece con un nombre feo (`precio - costo`). Con `AS` le das un **alias**, un nombre para el resultado:

```sql
SELECT nombre,
       precio,
       costo,
       precio - costo AS ganancia,
       ROUND((precio - costo) / precio * 100, 1) AS margen_pct
FROM productos
LIMIT 5;
```

| nombre | precio | costo | ganancia | margen_pct |
|---|---|---|---|---|
| Smartphone Apple Mini 300 | 484.99 | 310.41 | 174.58 | 36.0 |
| Parlante Xiaomi Sport 900 | 425.99 | 242.21 | 183.78 | 43.1 |
| Notebook Apple X | 1044.99 | 718.28 | 326.71 | 31.3 |

Leamos `margen_pct` por partes, de adentro hacia afuera (como en matemática, primero los paréntesis):

1. `precio - costo` → la ganancia: 174,58.
2. `/ precio` → qué fracción del precio es ganancia: 174,58 / 484,99 = 0,36.
3. `* 100` → en porcentaje: 36.
4. `ROUND(…, 1)` → con un decimal: 36,0.

Reglas de los alias:

- Usa **`snake_case`**: minúsculas y palabras unidas con guion bajo (`margen_pct`, `precio_con_iva`). Es el estándar en datos.
- Si el alias tiene espacios o tildes, va entre **comillas dobles**: `AS "margen %"`. Funciona, pero es incómodo de usar después; mejor evitarlo.
- `AS` es opcional (`precio - costo ganancia` también funciona), pero escribirlo hace el código mucho más claro.
- Un alias también sirve para **renombrar** una columna existente: `SELECT nombre AS producto FROM productos`.

:::nota ¿Puedo usar el alias en el mismo SELECT?
No en la mayoría de los motores: `SELECT precio - costo AS ganancia, ganancia * 2 …` falla porque el alias "todavía no existe" mientras se calcula esa misma lista. Repite la expresión, o usa una subconsulta o CTE (lecciones 13 y 15). Entenderás por qué en la lección de `ORDER BY`, cuando veas el **orden en que SQL ejecuta** cada cláusula.
:::

Las comillas para los alias cambian según el motor. Elige el motor en las pestañas y prueba el ejemplo:

```motores
titulo: Un alias con espacios
[sqlite]
SELECT nombre, precio AS "precio de lista"
FROM productos
LIMIT 3;
[postgres]
SELECT nombre, precio AS "precio de lista"
FROM productos
LIMIT 3;
[mysql]
-- MySQL usa backticks para los identificadores
SELECT nombre, precio AS `precio de lista`
FROM productos
LIMIT 3;
[sqlserver]
-- SQL Server acepta corchetes (y también comillas dobles)
SELECT TOP (3) nombre, precio AS [precio de lista]
FROM productos;
[bigquery]
SELECT nombre, precio AS `precio de lista`
FROM tienda.productos
LIMIT 3;
```

## Texto: comillas simples y concatenación

En SQL, **el texto va entre comillas simples**: `'Chile'`, `'Cliente de '`. Las comillas dobles se reservan para nombres de columnas o alias especiales. Mezclarlas es uno de los errores más comunes al empezar.

Para **unir** textos (concatenar), SQLite, PostgreSQL y Oracle usan el operador `||`:

```sql
SELECT nombre || ' ' || apellido AS nombre_completo,
       'Cliente de ' || pais AS descripcion
FROM clientes
LIMIT 5;
```

| nombre_completo | descripcion |
|---|---|
| Lucía Aguilar | Cliente de España |
| Juan Flores | Cliente de México |
| Andrés Pérez | Cliente de Colombia |

Fíjate en el `' '` del medio: sin él obtendrías `LucíaAguilar`. Un **literal** (un valor escrito tal cual, como `' '` o `'Cliente de '`) se repite igual en cada fila.

Si un texto contiene una comilla simple (como `O'Brien`), se escribe **doble**: `'O''Brien'`.

:::nota Otros motores (dialectos)
- **SQL Server** usa `+` para concatenar: `nombre + ' ' + apellido`.
- **MySQL, Spark SQL, BigQuery** usan la función `CONCAT(nombre, ' ', apellido)` (BigQuery y Spark también aceptan `||`).
- En casi todos los motores, si uno de los valores es `NULL` (vacío), `||` devuelve `NULL`. Lo verás en la lección de `NULL`.
:::

Concatenar es una de las diferencias más comunes entre motores:

```motores
titulo: Nombre y apellido en una columna
[sqlite]
SELECT nombre || ' ' || apellido AS cliente
FROM clientes
LIMIT 3;
[postgres]
SELECT nombre || ' ' || apellido AS cliente
FROM clientes
LIMIT 3;
-- también: CONCAT(nombre, ' ', apellido), que trata NULL como texto vacío
[mysql]
-- en MySQL, || es el OR lógico: para concatenar se usa CONCAT
SELECT CONCAT(nombre, ' ', apellido) AS cliente
FROM clientes
LIMIT 3;
[sqlserver]
SELECT TOP (3) nombre + ' ' + apellido AS cliente
FROM clientes;
-- también: CONCAT(nombre, ' ', apellido)
[bigquery]
SELECT CONCAT(nombre, ' ', apellido) AS cliente
FROM tienda.clientes
LIMIT 3;
```

## Columnas sin tabla

`SELECT` también funciona como calculadora, sin `FROM`:

```sql
SELECT 1250 * 0.21 AS iva, ROUND(1250 * 1.21, 2) AS total, 'hola' || ' mundo' AS saludo;
```

Es muy útil para probar una expresión antes de usarla en una consulta grande.





<!-- estandar:errores -->
:::errores
- **Olvidar una coma**: `SELECT nombre precio FROM productos` no da error, pero muestra **una sola columna** llamada `precio` con el contenido de `nombre` (SQL entiende que `precio` es un alias). Si un resultado tiene menos columnas de las esperadas, busca la coma que falta.
- **Una coma de más** antes del `FROM` (`SELECT nombre, precio, FROM ...`): error de sintaxis "near FROM".
- **Comillas dobles para textos**: en SQL estándar, `"Apple"` es el nombre de una columna, no un texto. Los textos van con comillas simples: `'Apple'`.
- **Dividir enteros**: `SELECT 7 / 2` da `3` en SQLite, PostgreSQL y SQL Server. Si quieres decimales, multiplica por `1.0` o usa `CAST`.
- **Alias con espacios sin comillas**: `AS precio final` da error. Usa `precio_final` (recomendado) o `"precio final"`.
:::

<!-- estandar:trabajo -->
:::trabajo
- En producción se evita `SELECT *`: si mañana alguien agrega una columna a la tabla, tu consulta cambia sin avisar, y en plataformas columnares (BigQuery, Snowflake, Databricks) **pagas por cada columna leída**. Se nombran explícitamente las columnas necesarias.
- Los alias se escriben en `snake_case` (minúsculas con guiones bajos: `precio_con_iva`). Es la convención de casi todos los equipos de datos y de herramientas como dbt.
- Los cálculos de negocio (como el IVA) no se escriben "a mano" en cada consulta: se definen **una vez** en un modelo o una macro (lo verás en dbt), para que todos usen el mismo número. Si el IVA cambia, se corrige en un solo lugar.
:::

## Resumen

- `SELECT col1, col2` elige columnas y su orden; evita `SELECT *` fuera de la exploración.
- Puedes calcular con `+ - * / %`, fila por fila. Cuidado: entero / entero = entero; usa `100.0 *` para porcentajes.
- `ROUND(x, n)` redondea; `AS alias` nombra la columna del resultado (en `snake_case`).
- El texto va entre comillas simples y se une con `||` (o `CONCAT` en otros motores).

## Ejercicios

:::ejercicio sql
Muestra el `nombre`, la `marca` y el `precio` de **todos** los productos.
```sql solucion
SELECT nombre, marca, precio FROM productos;
```
:::

:::ejercicio sql
Para cada producto, muestra `nombre`, `precio` y una columna llamada `precio_con_iva` con el precio multiplicado por 1.21, **redondeado a 2 decimales**.
```sql solucion
SELECT nombre, precio, ROUND(precio * 1.21, 2) AS precio_con_iva
FROM productos;
```
```pista
`ROUND(precio * 1.21, 2) AS precio_con_iva`
```
:::

:::ejercicio sql
Muestra el `email` de cada empleado y una columna `nombre_completo` con el formato `apellido, nombre` (por ejemplo `García, Ana`).
```sql solucion
SELECT email, apellido || ', ' || nombre AS nombre_completo
FROM empleados;
```
```pista
Concatena con `||` y no olvides el texto `', '` entre comillas simples.
```
:::

:::ejercicio sql
Muestra `nombre`, `stock`, `costo` y el **valor del inventario** de cada producto (`stock * costo`) con el alias `valor_inventario`.
```sql solucion
SELECT nombre, stock, costo, stock * costo AS valor_inventario
FROM productos;
```
:::

:::ejercicio sql dificultad=Básico
Muestra `nombre`, `precio` y `costo` de los productos, y una columna `margen` con la diferencia entre precio y costo.
```sql solucion
SELECT nombre, precio, costo, precio - costo AS margen FROM productos;
```
:::

:::ejercicio sql dificultad=Básico
Muestra el `nombre` de cada producto y su precio con IVA del 21 % en una columna `precio_con_iva`, redondeado a 2 decimales.
```pista
El precio con IVA es `precio * 1.21`. Para redondear: `ROUND(valor, 2)`.
```
```sql solucion
SELECT nombre, ROUND(precio * 1.21, 2) AS precio_con_iva FROM productos;
```
:::

:::ejercicio sql dificultad=Básico
Muestra una sola columna `empleado` con el nombre y el apellido de cada empleado separados por un espacio (por ejemplo, `Camila Ríos`).
```sql solucion
SELECT nombre || ' ' || apellido AS empleado FROM empleados;
```
:::

:::ejercicio sql dificultad=Intermedio
Para cada línea de `detalle_pedidos`, muestra `detalle_id` y el `importe` de la línea: cantidad por precio unitario, aplicando el descuento (que es una fracción, por ejemplo 0.1 = 10 %). Redondea a 2 decimales.
```pista
Un descuento de 0.1 significa pagar el 90 %: `(1 - descuento)`.
```
```pista
`cantidad * precio_unitario * (1 - descuento)`, todo dentro de `ROUND(…, 2)`.
```
```sql solucion
SELECT detalle_id, ROUND(cantidad * precio_unitario * (1 - descuento), 2) AS importe FROM detalle_pedidos;
```
:::

:::ejercicio sql dificultad=Intermedio
Muestra `nombre` y una columna `margen_pct` con el margen de cada producto como porcentaje del precio (`(precio - costo) / precio * 100`), redondeado a 1 decimal.
```pista
Ojo con el orden de las operaciones: la resta va entre paréntesis.
```
```sql solucion
SELECT nombre, ROUND((precio - costo) / precio * 100, 1) AS margen_pct FROM productos;
```
:::

:::ejercicio sql dificultad=Intermedio
Arma una etiqueta para cada cliente en una columna `etiqueta`, con el formato `apellido, nombre (ciudad)`. Por ejemplo: `Aguilar, Lucía (Madrid)`.
```pista
Concatena varias piezas con `||`: columnas y textos entre comillas simples.
```
```sql solucion
SELECT apellido || ', ' || nombre || ' (' || ciudad || ')' AS etiqueta FROM clientes;
```
:::
