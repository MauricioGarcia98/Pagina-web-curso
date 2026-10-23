---
titulo: Funciones de texto, números y conversiones
nivel: Básico
duracion: 25
resumen: UPPER, LOWER, TRIM, SUBSTR, REPLACE, LENGTH, INSTR, ROUND, CAST y la división entera.
---

Las **funciones** reciben valores y devuelven otro valor. Se usan en `SELECT`, `WHERE`, `ORDER BY`…

## Funciones de texto

| Función | Qué hace | Ejemplo | Resultado |
|---|---|---|---|
| `UPPER(t)` / `LOWER(t)` | Mayúsculas / minúsculas | `UPPER('hola')` | `HOLA` |
| `LENGTH(t)` | Largo del texto | `LENGTH('datos')` | `5` |
| `TRIM(t)` | Quita espacios a los lados (`LTRIM`, `RTRIM`) | `TRIM('  ana ')` | `ana` |
| `SUBSTR(t, inicio, largo)` | Recorta (la primera posición es 1) | `SUBSTR('2024-03-15', 1, 4)` | `2024` |
| `REPLACE(t, a, b)` | Reemplaza | `REPLACE('a-b-c', '-', '/')` | `a/b/c` |
| `INSTR(t, sub)` | Posición de `sub` (0 si no está) | `INSTR('ana@mail.com', '@')` | `4` |

```sql
SELECT email,
       SUBSTR(email, INSTR(email, '@') + 1) AS dominio,
       UPPER(SUBSTR(nombre, 1, 1)) || '.' AS inicial
FROM clientes
WHERE email IS NOT NULL
LIMIT 5;
```

:::nota Dialectos
`SUBSTR` también se llama `SUBSTRING`; `INSTR` es `POSITION(sub IN t)` en PostgreSQL y `CHARINDEX` en SQL Server; `LENGTH` es `LEN` en SQL Server.
:::

## Funciones numéricas

| Función | Ejemplo | Resultado |
|---|---|---|
| `ROUND(x, d)` | `ROUND(3.14159, 2)` | `3.14` |
| `ABS(x)` | `ABS(-7)` | `7` |
| `x % y` | `17 % 5` | `2` (resto) |
| `MIN(a, b)` / `MAX(a, b)` (SQLite) | `MAX(3, 9)` | `9` (en otros motores: `GREATEST` / `LEAST`) |
| `CEIL` / `FLOOR` | `FLOOR(2.7)` | `2` (SQLite ≥ 3.35) |

## ⚠️ La división entera

Cuando divides **dos enteros**, muchos motores (SQLite, PostgreSQL, SQL Server) devuelven un **entero** y descartan los decimales:

```sql
SELECT 7 / 2      AS division_entera,   -- 3
       7 / 2.0    AS division_real,     -- 3.5
       CAST(7 AS REAL) / 2 AS con_cast; -- 3.5
```

Es la causa de muchísimos porcentajes que dan 0. Solución: multiplica por `1.0` o usa `CAST`.

## CAST: convertir tipos

```sql
SELECT CAST('42' AS INTEGER) + 1      AS numero,
       CAST(19.99 AS INTEGER)         AS truncado,
       CAST(producto_id AS TEXT) || '-' || marca AS codigo
FROM productos LIMIT 3;
```

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
