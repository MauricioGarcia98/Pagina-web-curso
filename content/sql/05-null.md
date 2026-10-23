---
titulo: NULL: el valor que no es un valor
nivel: Básico
duracion: 30
resumen: IS NULL, COALESCE, NULLIF y la lógica de tres valores.
---

## Qué es NULL

`NULL` es la forma en que SQL dice **"no hay dato"**: el valor es desconocido, no aplica o nunca se cargó. No es un cero, no es un texto vacío, no es un espacio. Es **la ausencia** de valor.

| Situación | Valor correcto | ¿Por qué no otra cosa? |
|---|---|---|
| Cliente que no dio su teléfono | `NULL` | `0` o `''` parecerían un teléfono real (y vacío) |
| Pedido que todavía no se entregó | `fecha_entrega = NULL` | No existe una fecha de entrega aún |
| Producto con stock 0 | `0` | Aquí **sí** sabemos el valor: no hay unidades |
| El CEO no tiene jefe | `jefe_id = NULL` | No aplica |

En nuestra tabla `clientes`, de 2.000 clientes, **89** no tienen email y **268** no tienen teléfono.

:::analogia La casilla en blanco del formulario
Piensa en un formulario en papel. Si alguien escribe "0" en "cantidad de hijos", sabes que no tiene hijos. Si deja la casilla **en blanco**, no sabes nada: puede no tener, puede no haber querido responder, puede haberla salteado. `NULL` es la casilla en blanco. Y no puedes comparar dos casillas en blanco y decir que "son iguales": no sabes qué hay detrás de ninguna.
:::

## La trampa número uno de SQL: `= NULL`

```sql
-- ❌ Devuelve 0 filas, aunque hay 89 clientes sin email
SELECT COUNT(*) FROM clientes WHERE email = NULL;
```

¿Por qué? Porque cualquier comparación con `NULL` da como resultado… `NULL` (desconocido). La pregunta "¿este email desconocido es igual a otro valor desconocido?" no tiene respuesta. Y `WHERE` solo deja pasar las filas donde la condición es **verdadera**: lo desconocido se descarta.

Para preguntar por nulos existen dos operadores especiales:

```sql
-- ✅ Clientes sin email: 89
SELECT cliente_id, nombre, email FROM clientes WHERE email IS NULL;

-- ✅ Clientes con email: 1.911
SELECT COUNT(*) FROM clientes WHERE email IS NOT NULL;
```

### Los NULL desaparecen de los filtros "negativos"

Esto engaña incluso a gente con experiencia:

```sql
-- ¿Cuántos clientes NO tienen el email x@x.com? Uno esperaría 2.000…
SELECT COUNT(*) FROM clientes WHERE email <> 'x@x.com';
```

El resultado es **1.911**, no 2.000. Para los 89 clientes sin email, `NULL <> 'x@x.com'` es desconocido, y quedan afuera. Si quieres incluirlos, dilo explícitamente:

```sql
SELECT COUNT(*) FROM clientes WHERE email <> 'x@x.com' OR email IS NULL;
```

## La lógica de tres valores

En la mayoría de los lenguajes una condición es verdadera o falsa. En SQL hay un tercer resultado: **UNKNOWN** (desconocido), que aparece cada vez que hay un `NULL` en juego.

| Expresión | Resultado | Cómo pensarlo |
|---|---|---|
| `NULL = NULL` | UNKNOWN | Dos desconocidos no se pueden comparar |
| `NULL <> 5` | UNKNOWN | No sé si el desconocido es 5 |
| `NULL + 10` | `NULL` | "Algo desconocido más 10" sigue siendo desconocido |
| `'Hola ' \|\| NULL` | `NULL` | Concatenar con nada da nada |
| `TRUE AND UNKNOWN` | UNKNOWN | Depende del desconocido |
| `FALSE AND UNKNOWN` | **FALSE** | Ya con un falso, el `AND` es falso |
| `TRUE OR UNKNOWN` | **TRUE** | Ya con un verdadero, el `OR` es verdadero |
| `NOT UNKNOWN` | UNKNOWN | Negar lo desconocido sigue siendo desconocido |

La regla para recordar: **`WHERE` solo deja pasar TRUE**. Tanto FALSE como UNKNOWN quedan afuera.

:::cuidado NOT IN con un NULL en la lista
`5 NOT IN (1, 2, NULL)` equivale a `5 <> 1 AND 5 <> 2 AND 5 <> NULL` → `TRUE AND TRUE AND UNKNOWN` → **UNKNOWN**. Resultado: la condición **nunca** es verdadera y la consulta devuelve 0 filas, sin error. Pasa muchísimo con subconsultas (`WHERE cliente_id NOT IN (SELECT cliente_id FROM …)` cuando esa columna tiene algún `NULL`). La solución es `NOT EXISTS` o filtrar los nulos de la subconsulta; lo verás en la lección de subconsultas.
:::

## NULL en cálculos y funciones de agregación

En cálculos fila por fila, un `NULL` "contagia" todo: `precio * NULL` es `NULL`.

Pero las funciones de agregación (`COUNT`, `SUM`, `AVG`, `MIN`, `MAX`, que verás en detalle pronto) **ignoran** los `NULL`. Mira este ejemplo con tres alumnos, uno sin nota:

```sql
WITH notas(alumno, nota) AS (VALUES ('Ana', 8), ('Beto', NULL), ('Carla', 6))
SELECT COUNT(*)             AS filas,
       COUNT(nota)          AS con_nota,
       SUM(nota)            AS suma,
       AVG(nota)            AS promedio,
       AVG(COALESCE(nota, 0)) AS promedio_con_ceros
FROM notas;
```

| filas | con_nota | suma | promedio | promedio_con_ceros |
|---|---|---|---|---|
| 3 | 2 | 14 | 7.0 | 4.67 |

(No te preocupes por el `WITH … VALUES`: crea una tablita temporal para el ejemplo; lo verás en la lección de CTE.)

- `COUNT(*)` cuenta **filas**: 3.
- `COUNT(nota)` cuenta **valores no nulos**: 2.
- `AVG(nota)` = 14 / **2** = 7. Beto no cuenta.
- Si para el negocio "sin nota" significa "cero", tienes que decirlo: `AVG(COALESCE(nota, 0))` = 14 / 3 = 4,67.

Ninguno de los dos promedios es "el correcto": depende de qué significa el `NULL` en tu caso. Esa es una pregunta de negocio, no de SQL.

## COALESCE: reemplazar nulos por un valor

`COALESCE(a, b, c, …)` revisa los valores **de izquierda a derecha** y devuelve **el primero que no sea `NULL`**:

```sql
SELECT nombre,
       COALESCE(telefono, 'sin teléfono')         AS telefono,
       COALESCE(email, telefono, 'sin contacto')  AS contacto
FROM clientes
WHERE email IS NULL
LIMIT 5;
```

| nombre | telefono | contacto |
|---|---|---|
| María | +82 749 7455 | +82 749 7455 |
| Sofía | sin teléfono | sin contacto |
| Elena | +19 667 4127 | +19 667 4127 |

Para `contacto`: si hay email, usa el email; si no, el teléfono; si tampoco, el texto `'sin contacto'`. Es la herramienta más usada para limpiar datos y para dar valores por defecto.

Nombres en otros motores: `IFNULL(a, b)` (SQLite, MySQL), `ISNULL(a, b)` (SQL Server), `NVL(a, b)` (Oracle, Spark). `COALESCE` funciona en **todos**, así que es la que conviene aprender.

:::cuidado Los tipos tienen que coincidir
En motores estrictos (PostgreSQL, BigQuery, Spark), `COALESCE(precio, 'sin precio')` da error: no se puede mezclar un número con un texto en la misma columna. Usa un valor del mismo tipo (`COALESCE(precio, 0)`) o convierte (`COALESCE(CAST(precio AS TEXT), 'sin precio')`).
:::

## NULLIF: crear un NULL a propósito

`NULLIF(a, b)` devuelve `NULL` si `a` es igual a `b`; si no, devuelve `a`. Parece rara, pero tiene un uso estrella: **evitar la división por cero**.

```sql
SELECT nombre, precio, stock,
       precio / NULLIF(stock, 0) AS precio_por_unidad_en_stock
FROM productos
LIMIT 10;
```

Si `stock` es 0, `NULLIF(stock, 0)` devuelve `NULL`, y `precio / NULL` es `NULL` en lugar de un error (en PostgreSQL o SQL Server dividir por cero **detiene la consulta**; SQLite devuelve `NULL` igual, pero el hábito te salvará en otros motores). Otro uso: convertir textos vacíos en nulos de verdad, `NULLIF(TRIM(telefono), '')`.

## NULL al ordenar y al agrupar

- `ORDER BY`: los `NULL` van primero o último según el motor (ver lección anterior); usa `NULLS LAST` para controlarlo.
- `GROUP BY` y `DISTINCT`: todos los `NULL` se juntan en **un solo grupo**. Es la única situación en que SQL "trata a los NULL como iguales".

## Resumen

- `NULL` = sin dato. No es 0 ni `''`.
- Nunca `= NULL`: usa `IS NULL` / `IS NOT NULL`.
- Comparar con `NULL` da UNKNOWN y `WHERE` lo descarta; cuidado con `<>` y con `NOT IN`.
- Las agregaciones ignoran `NULL`: `COUNT(*)` ≠ `COUNT(columna)`.
- `COALESCE` reemplaza nulos; `NULLIF` crea nulos (ideal para evitar dividir por cero).

## Ejercicios

:::ejercicio sql
Muestra `cliente_id`, `nombre` y `apellido` de los clientes que **no tienen teléfono**.
```sql solucion
SELECT cliente_id, nombre, apellido FROM clientes WHERE telefono IS NULL;
```
:::

:::ejercicio sql
Muestra `pedido_id`, `canal` de los pedidos que **sí** tienen un empleado asignado (`empleado_id` no nulo) y que **no** son del canal `tienda`.
```sql solucion
SELECT pedido_id, canal FROM pedidos WHERE empleado_id IS NOT NULL AND canal <> 'tienda';
```
```pista
Los pedidos por teléfono también tienen vendedor.
```
:::

:::ejercicio sql
Muestra `nombre`, `apellido` y una columna `email_contacto` que tenga el email del cliente o, si no tiene, el texto `'sin email'`. Solo para los clientes de **Uruguay**.
```sql solucion
SELECT nombre, apellido, COALESCE(email, 'sin email') AS email_contacto
FROM clientes WHERE pais = 'Uruguay';
```
:::

:::ejercicio sql
Muestra `nombre`, `apellido` y `fecha_salida` de los empleados que **ya no trabajan** en la empresa (tienen fecha de salida), ordenados por `fecha_salida`.
```sql solucion
SELECT nombre, apellido, fecha_salida FROM empleados WHERE fecha_salida IS NOT NULL ORDER BY fecha_salida;
```
:::

:::ejercicio quiz
¿Qué devuelve `SELECT COUNT(*) FROM clientes WHERE telefono <> '123'` respecto a los clientes con teléfono NULL?

- [ ] Los cuenta, porque NULL es distinto de '123'
- [x] No los cuenta, porque `NULL <> '123'` es UNKNOWN
- [ ] Da un error
- [ ] Los cuenta dos veces
:::
