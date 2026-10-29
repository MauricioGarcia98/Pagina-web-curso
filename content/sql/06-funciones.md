---
titulo: Funciones de texto, números y conversiones
nivel: Básico
duracion: 35
resumen: UPPER, LOWER, TRIM, SUBSTR, REPLACE, LENGTH, INSTR, ROUND, CAST y la división entera.
objetivos: Limpiar y transformar textos con `UPPER`, `LOWER`, `TRIM`, `SUBSTR`, `INSTR` y `REPLACE` | Redondear y calcular porcentajes sin caer en la división entera | Convertir tipos con `CAST` y anticipar lo que puede salir mal | Leer y escribir funciones anidadas de adentro hacia afuera
prerrequisitos: sql-select | sql-null
autoevaluacion: ¿Puedes extraer el dominio de un email (lo que va después de la @)? | ¿Sabes por qué `SELECT 1 / 4` da 0 en SQLite y cómo obtener 0.25? | ¿Puedes calcular un margen en porcentaje redondeado a 1 decimal? | ¿Puedes normalizar un nombre con espacios y mayúsculas mezcladas? | ¿Sabes por qué poner una función sobre una columna en el `WHERE` puede hacer lenta una consulta?
---

<!-- estandar:escenario -->
:::escenario Los emails de los clientes
Camila, de marketing, quiere saber con qué proveedores de correo trabajan sus clientes:

> "¿Cuántos clientes usan Gmail, Hotmail, Outlook…? Quiero ajustar el diseño del newsletter. Y de paso, en la tabla de carga de clientes los nombres vienen con espacios y mayúsculas mezcladas: ¿se pueden limpiar?"

La información está, pero no en la forma en que la necesitas: hay que **cortar**, **limpiar** y **convertir**. Para eso están las funciones.
:::
## Qué es una función

Una **función** recibe uno o más valores (sus *argumentos*, entre paréntesis), hace algo con ellos y **devuelve un valor**. Ya usaste una: `ROUND(precio, 2)`. Las funciones se pueden usar en cualquier lugar donde iría un valor: en el `SELECT`, en el `WHERE`, en el `ORDER BY`, e incluso unas dentro de otras.

Esta lección cubre las funciones **escalares**: trabajan **fila por fila** (una fila entra, un valor sale). Más adelante verás las de **agregación** (muchas filas entran, un valor sale) y las de **ventana**.

:::analogia Las funciones de una calculadora
La tecla √ de una calculadora es una función: le das 16 y te devuelve 4. `UPPER` es una tecla que recibe `'hola'` y devuelve `'HOLA'`. Puedes encadenarlas: √(√16) = 2, igual que `UPPER(TRIM('  hola '))` = `'HOLA'`. Se resuelven de adentro hacia afuera.
:::

## Funciones de texto

Los datos de texto casi nunca vienen limpios: espacios de más, mayúsculas mezcladas, información pegada en un mismo campo. Estas funciones son tu caja de herramientas:

| Función | Qué hace | Ejemplo | Resultado |
|---|---|---|---|
| `UPPER(t)` / `LOWER(t)` | Pasa a mayúsculas / minúsculas | `LOWER('Chile')` | `chile` |
| `LENGTH(t)` | Cantidad de caracteres | `LENGTH('datos')` | `5` |
| `TRIM(t)` | Quita espacios al principio y al final (`LTRIM` solo izquierda, `RTRIM` solo derecha) | `TRIM('  ana ')` | `ana` |
| `SUBSTR(t, inicio, largo)` | Recorta un pedazo. **La primera posición es 1** (no 0) | `SUBSTR('2024-03-15', 1, 4)` | `2024` |
| `REPLACE(t, buscar, poner)` | Reemplaza todas las apariciones | `REPLACE('a-b-c', '-', '/')` | `a/b/c` |
| `INSTR(t, buscar)` | Posición donde aparece `buscar` (0 si no está) | `INSTR('ana@mail.com', '@')` | `4` |

### Por qué importa limpiar el texto

```sql
SELECT '  ana ' = 'ana'        AS sin_limpiar,
       TRIM('  ana ') = 'ana'  AS limpio,
       LENGTH('  ana ')        AS largo;
```

| sin_limpiar | limpio | largo |
|---|---|---|
| 0 | 1 | 6 |

(En SQLite, 0 = falso y 1 = verdadero.) Para la base de datos, `'  ana '` y `'ana'` son textos **distintos**. Si un sistema guardó un país como `'Chile '` con un espacio, `WHERE pais = 'Chile'` no lo encuentra. Por eso, en la capa de limpieza de un pipeline (la capa *silver*, que verás en el curso) es habitual aplicar `TRIM` y `LOWER`/`UPPER` a los campos de texto clave.

### Ejemplo paso a paso: extraer el dominio de un email

Queremos saber qué proveedores de correo usan los clientes. El dominio es lo que viene **después** de la `@`:

```sql
SELECT email,
       INSTR(email, '@')                      AS posicion_arroba,
       SUBSTR(email, INSTR(email, '@') + 1)   AS dominio
FROM clientes
WHERE email IS NOT NULL
LIMIT 5;
```

| email | posicion_arroba | dominio |
|---|---|---|
| lucia.aguilar@correo.com | 14 | correo.com |
| juan.flores@yahoo.com | 12 | yahoo.com |
| andres.perez@gmail.com | 13 | gmail.com |

1. `INSTR(email, '@')` busca la arroba: en `lucia.aguilar@correo.com` está en la posición 14.
2. `+ 1` → el dominio empieza en la posición 15.
3. `SUBSTR(email, 15)` → si no indicas el largo, toma **hasta el final**: `correo.com`.

Con la misma idea, `SUBSTR(email, 1, INSTR(email, '@') - 1)` da la parte de antes de la arroba (el usuario).

:::nota Los nombres cambian según el motor
| SQLite | PostgreSQL | SQL Server | MySQL / Spark / BigQuery |
|---|---|---|---|
| `SUBSTR` | `SUBSTRING` / `SUBSTR` | `SUBSTRING` | `SUBSTRING` / `SUBSTR` |
| `INSTR(t, s)` | `POSITION(s IN t)` / `STRPOS` | `CHARINDEX(s, t)` | `INSTR` / `LOCATE` / `STRPOS` |
| `LENGTH` | `LENGTH` | `LEN` | `LENGTH` |

Los conceptos son idénticos; ante la duda, busca "nombre de la función + nombre del motor".
:::

Las funciones de texto son de las que más cambian de nombre:

```motores
titulo: El dominio del email y su largo
[sqlite]
SELECT email,
       SUBSTR(email, INSTR(email, '@') + 1) AS dominio,
       LENGTH(email) AS largo
FROM clientes
WHERE email IS NOT NULL
LIMIT 3;
[postgres]
SELECT email,
       SPLIT_PART(email, '@', 2) AS dominio,
       LENGTH(email) AS largo
FROM clientes
WHERE email IS NOT NULL
LIMIT 3;
[mysql]
-- también existe SUBSTRING_INDEX(email, '@', -1)
SELECT email,
       SUBSTRING(email, LOCATE('@', email) + 1) AS dominio,
       CHAR_LENGTH(email) AS largo
FROM clientes
WHERE email IS NOT NULL
LIMIT 3;
[sqlserver]
SELECT TOP (3) email,
       SUBSTRING(email, CHARINDEX('@', email) + 1, LEN(email)) AS dominio,
       LEN(email) AS largo
FROM clientes
WHERE email IS NOT NULL;
[bigquery]
SELECT email,
       SPLIT(email, '@')[OFFSET(1)] AS dominio,
       LENGTH(email) AS largo
FROM tienda.clientes
WHERE email IS NOT NULL
LIMIT 3;
```

## Funciones numéricas

| Función | Qué hace | Ejemplo | Resultado |
|---|---|---|---|
| `ROUND(x, d)` | Redondea a `d` decimales | `ROUND(3.14159, 2)` | `3.14` |
| `ABS(x)` | Valor absoluto (quita el signo) | `ABS(-7)` | `7` |
| `x % y` | Resto de la división | `17 % 5` | `2` |
| `CEIL(x)` / `FLOOR(x)` | Redondea hacia arriba / hacia abajo (SQLite 3.35+) | `FLOOR(2.7)` | `2` |
| `MAX(a, b)` / `MIN(a, b)` | El mayor / menor de varios valores (en SQLite con 2+ argumentos) | `MAX(3, 9)` | `9` |
| `POWER(x, y)` / `SQRT(x)` | Potencia / raíz (SQLite 3.35+) | `POWER(2, 10)` | `1024` |

Usos frecuentes del resto (`%`): saber si un número es par (`id % 2 = 0`), repartir filas en grupos (`cliente_id % 10` da 10 grupos parecidos, útil para muestras o pruebas A/B).

:::nota MAX y MIN de varios valores
En SQLite `MAX(a, b)` con dos o más argumentos devuelve el mayor de esos valores (en la misma fila). En PostgreSQL, MySQL, Spark y BigQuery esa función se llama `GREATEST(a, b)` y la opuesta `LEAST(a, b)`. No las confundas con las funciones de agregación `MAX(columna)`, que buscan el máximo **entre filas**.
:::

## La división entera (otra vez, porque importa)

```sql
SELECT 7 / 2                AS division_entera,   -- 3
       7 / 2.0              AS division_real,     -- 3.5
       CAST(7 AS REAL) / 2  AS con_cast,          -- 3.5
       1.0 * 7 / 2          AS truco_uno_punto_cero;
```

Entero dividido entero da entero (en SQLite, PostgreSQL y SQL Server; en MySQL, Spark y BigQuery no). Cuando calcules un porcentaje, escribe **siempre** `100.0 * parte / total`: funciona en todos los motores.

```motores
titulo: 7 dividido 2
[sqlite]
SELECT 7 / 2 AS entera, 7 / 2.0 AS con_decimal, CAST(7 AS REAL) / 2 AS con_cast;
[postgres]
SELECT 7 / 2 AS entera, 7 / 2.0 AS con_decimal, 7::numeric / 2 AS con_cast;
[mysql]
-- en MySQL / siempre devuelve decimales; DIV es la división entera
SELECT 7 DIV 2 AS entera, 7 / 2 AS con_decimal;
[sqlserver]
SELECT 7 / 2 AS entera, 7 / 2.0 AS con_decimal, CAST(7 AS DECIMAL(10, 2)) / 2 AS con_cast;
```

## CAST: convertir de un tipo a otro

Cada valor tiene un **tipo**: entero (`INTEGER`), decimal (`REAL`, `DECIMAL`, `DOUBLE`), texto (`TEXT`, `VARCHAR`, `STRING`), fecha (`DATE`, `TIMESTAMP`). `CAST(valor AS tipo)` convierte:

```sql
SELECT CAST('42' AS INTEGER) + 1                      AS numero,       -- 43
       CAST(19.99 AS INTEGER)                         AS truncado,     -- 19
       CAST(producto_id AS TEXT) || '-' || marca      AS codigo
FROM productos
LIMIT 3;
```

Cuándo lo necesitas:

- **Datos crudos que llegan como texto**: en un CSV todo es texto; para sumar precios hay que convertirlos.
- **Armar códigos**: unir un número con un texto.
- **Forzar decimales**: `CAST(cantidad AS REAL) / total`.

:::cuidado CAST no redondea y puede "mentir"
- `CAST(19.99 AS INTEGER)` da **19**: trunca (corta los decimales), no redondea. Si quieres 20, usa `ROUND(19.99)`.
- En SQLite, `CAST('42abc' AS INTEGER)` da 42 y `CAST('abc' AS INTEGER)` da **0**, en silencio. En PostgreSQL o BigQuery esas conversiones dan **error**, y existen `TRY_CAST` / `SAFE_CAST` que devuelven `NULL` si no se puede convertir. En limpieza de datos, un `NULL` es mucho mejor que un 0 inventado.
:::

## Funciones anidadas: leer de adentro hacia afuera

```sql
SELECT nombre,
       UPPER(SUBSTR(TRIM(nombre), 1, 1)) || '.' AS inicial
FROM clientes
LIMIT 5;
```

1. `TRIM(nombre)` → quita espacios.
2. `SUBSTR(…, 1, 1)` → toma la primera letra.
3. `UPPER(…)` → la pasa a mayúscula.
4. `|| '.'` → le agrega un punto: `L.`

Si una expresión anidada te confunde, pruébala por partes en el laboratorio: primero `TRIM(nombre)`, luego agrega `SUBSTR`, y así.

## Funciones en el WHERE y en el ORDER BY

```sql
-- Clientes cuyo email es de gmail, sin importar mayúsculas
SELECT nombre, email
FROM clientes
WHERE LOWER(email) LIKE '%@gmail.com'
ORDER BY LENGTH(nombre) DESC
LIMIT 10;
```

:::experto Funciones sobre columnas y los índices
`WHERE LOWER(email) = 'ana@gmail.com'` no puede usar un índice normal sobre `email`, porque el índice guarda los valores originales, no los convertidos. En tablas grandes conviene guardar los datos ya normalizados (en minúsculas) en la capa limpia del pipeline, o crear un índice sobre la expresión. Lo verás en la lección de rendimiento.
:::





<!-- estandar:errores -->
:::errores
- **División entera**: `cantidad / total` con dos enteros da 0 en vez de 0,25. Multiplica por `1.0` o convierte con `CAST(x AS REAL)` antes de dividir.
- **`ROUND` en el lugar equivocado**: redondear cada línea y después sumar no da lo mismo que sumar y después redondear. En dinero, redondea **al final**.
- **`SUBSTR` empieza en 1**, no en 0 como en Python. `SUBSTR('hola', 1, 2)` es `'ho'`.
- **Funciones distintas en cada motor**: `INSTR` en SQLite es `POSITION` en PostgreSQL y `CHARINDEX` en SQL Server. Revisa la lección de dialectos cuando cambies de base.
- **`CAST` de texto sucio**: `CAST('12,5' AS REAL)` da `12` en SQLite (se detiene en la coma) sin avisar. Limpia antes con `REPLACE`.
:::

<!-- estandar:trabajo -->
:::trabajo
- La limpieza de textos (`TRIM`, `LOWER`, quitar acentos, normalizar teléfonos) se hace **una sola vez**, en la capa silver o en el modelo de staging de dbt, y todos leen de ahí. Si cada analista limpia a su manera, cada dashboard muestra un número distinto.
- Una función sobre la columna en el `WHERE` (`WHERE LOWER(email) = ...`, `WHERE strftime('%Y', fecha) = '2024'`) impide usar índices y el *partition pruning*. En tablas grandes se reescribe para dejar la columna "limpia": `WHERE fecha >= '2024-01-01' AND fecha < '2025-01-01'`.
- Para dinero, en producción se usa `DECIMAL(12,2)` (exacto) en vez de `REAL` (aproximado).
:::

## Resumen

- Las funciones escalares transforman un valor por fila; se pueden anidar y se leen de adentro hacia afuera.
- Texto: `UPPER`, `LOWER`, `TRIM`, `LENGTH`, `SUBSTR` (empieza en 1), `REPLACE`, `INSTR`.
- Números: `ROUND`, `ABS`, `%`, `CEIL`, `FLOOR`; `100.0 *` para evitar la división entera.
- `CAST` convierte tipos; trunca en vez de redondear y en SQLite puede devolver 0 en silencio.

## Ejercicios

:::ejercicio sql
Muestra el `nombre` de cada producto en **mayúsculas** con el alias `nombre_mayus` y su **largo** en caracteres con el alias `largo`. Solo productos de la marca `Nike`.
```sql solucion
SELECT UPPER(nombre) AS nombre_mayus, LENGTH(nombre) AS largo FROM productos WHERE marca = 'Nike';
```
:::

:::ejercicio sql
Muestra `cliente_id`, `email` y el **dominio** del email (lo que está después de la `@`) con el alias `dominio`, para los clientes con email del segmento `Corporativo`.
```sql solucion
SELECT cliente_id, email, SUBSTR(email, INSTR(email, '@') + 1) AS dominio
FROM clientes
WHERE email IS NOT NULL AND segmento = 'Corporativo';
```
```pista
`INSTR(email, '@')` da la posición de la arroba. Lo que quieres empieza una posición después.
```
:::

:::ejercicio sql ordenado
Muestra `nombre`, `precio`, `costo` y el **margen en porcentaje** `(precio - costo) / precio * 100` redondeado a 1 decimal, con el alias `margen_pct`. Ordena de mayor a menor margen (si empatan, por `nombre`) y muestra solo los 10 primeros.
```sql solucion
SELECT nombre, precio, costo, ROUND((precio - costo) / precio * 100, 1) AS margen_pct
FROM productos
ORDER BY margen_pct DESC, nombre
LIMIT 10;
```
:::

:::ejercicio sql
De la tabla `clientes_crudo` (datos sucios), muestra `registro_id`, el `nombre` **sin espacios a los lados y en minúsculas** (alias `nombre_limpio`) y el `email` en minúsculas (alias `email_limpio`).
```sql solucion
SELECT registro_id, LOWER(TRIM(nombre)) AS nombre_limpio, LOWER(email) AS email_limpio FROM clientes_crudo;
```
:::

:::ejercicio quiz
¿Cuánto vale `SELECT 1 / 4` en SQLite?

- [ ] 0.25
- [x] 0
- [ ] 1
- [ ] Error
```explicacion
Ambos operandos son enteros, así que la división es entera. Usa `1.0 / 4` para obtener 0.25.
```
:::
