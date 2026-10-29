---
titulo: CTE recursivas: jerarquías y series
nivel: Avanzado
duracion: 40
resumen: Recorrer árboles (organigramas, categorías) y generar series de fechas.
objetivos: Explicar la estructura de una CTE recursiva: caso base, paso recursivo y condición de parada | Generar series de números y de fechas | Recorrer jerarquías (organigramas, categorías) calculando niveles y rutas | Rellenar huecos de un reporte con un calendario generado
prerrequisitos: sql-cte | sql-joins-avanzados
autoevaluacion: ¿Puedes generar los números del 1 al 20 con una CTE recursiva? | ¿Sabes qué pasa si olvidas la condición de parada? | ¿Puedes mostrar el organigrama completo con el nivel de cada persona? | ¿Puedes contar cuántas personas tiene a cargo, directa o indirectamente, un director? | ¿Puedes mostrar los pedidos de cada día de enero, incluidos los días con cero?
---

<!-- estandar:escenario -->
:::escenario El organigrama completo
Tomás, de personas, tiene que armar el organigrama:

> "Para cada director necesito saber cuánta gente tiene a cargo en total, no solo los que le reportan directo, sino también los de sus jefes de equipo, y así para abajo."

La tabla `empleados` solo dice quién es el jefe **directo** de cada persona. Para recorrer todos los niveles hace falta una consulta que se llame a sí misma: una **CTE recursiva**.
:::
## Datos con forma de árbol

Hay datos donde una fila apunta a **otra fila de la misma tabla**, formando una jerarquía:

- **Organigrama**: cada empleado tiene un `jefe_id`, que es otro empleado, que a su vez tiene jefe… hasta llegar al CEO.
- **Categorías**: "Laptops" está dentro de "Computadoras", que está dentro de "Tecnología".
- **Cuentas contables**, carpetas de archivos, comentarios con respuestas, rutas entre ciudades.

```text
categorias                                    el árbol que forman
categoria_id │ nombre       │ padre           Tecnología (1)
─────────────┼──────────────┼───────          ├── Computadoras (5)
1            │ Tecnología   │ NULL            │   └── Laptops (8)
5            │ Computadoras │ 1               ├── Celulares (6)
6            │ Celulares    │ 1               └── Audio (7)
7            │ Audio        │ 1
8            │ Laptops      │ 5
```

Con un self join (lección 12) subes **un** nivel: "el padre de Laptops es Computadoras". Pero ¿y si quieres **todos** los niveles, sin saber cuántos hay? Necesitarías un join para cada nivel, y la profundidad cambia. La solución es una **CTE recursiva**: una CTE que se usa **a sí misma** hasta que no hay más que recorrer.

## La estructura

```sql norun
WITH RECURSIVE nombre AS (
    -- 1. ANCLA (caso base): las filas con las que se empieza
    SELECT …
    UNION ALL
    -- 2. PASO RECURSIVO: a partir de las filas que ya están en "nombre", produce las siguientes
    SELECT … FROM tabla JOIN nombre ON …
)
SELECT * FROM nombre;
```

Cómo la ejecuta el motor:

1. Ejecuta el **ancla** → esas filas son la "vuelta 0".
2. Ejecuta el **paso recursivo** usando **solo las filas nuevas** de la vuelta anterior → vuelta 1.
3. Repite el paso 2 con las filas de la vuelta 1 → vuelta 2… y así.
4. Se **detiene** cuando una vuelta no produce ninguna fila nueva.
5. El resultado es la unión de todas las vueltas.

:::analogia Las fichas de dominó
El ancla es empujar la primera ficha. El paso recursivo es la regla "cada ficha que cae empuja a la siguiente". El proceso termina solo cuando ya no quedan fichas por caer. Si las fichas formaran un círculo, nunca terminaría: por eso la condición de parada es crucial.
:::

La palabra `RECURSIVE` es obligatoria en PostgreSQL y MySQL, y no existe en SQL Server ni en Oracle:

```motores
titulo: Números del 1 al 5
[sqlite]
WITH RECURSIVE serie(n) AS (
  SELECT 1
  UNION ALL
  SELECT n + 1 FROM serie WHERE n < 5
)
SELECT n FROM serie;
[postgres]
WITH RECURSIVE serie(n) AS (
  SELECT 1
  UNION ALL
  SELECT n + 1 FROM serie WHERE n < 5
)
SELECT n FROM serie;
-- atajo propio de PostgreSQL: SELECT generate_series(1, 5);
[mysql]
WITH RECURSIVE serie(n) AS (
  SELECT 1
  UNION ALL
  SELECT n + 1 FROM serie WHERE n < 5
)
SELECT n FROM serie;
[sqlserver]
WITH serie(n) AS (
  SELECT 1
  UNION ALL
  SELECT n + 1 FROM serie WHERE n < 5
)
SELECT n FROM serie;
[oracle]
WITH serie(n) AS (
  SELECT 1 FROM dual
  UNION ALL
  SELECT n + 1 FROM serie WHERE n < 5
)
SELECT n FROM serie;
```

## Ejemplo 1: generar una serie de números

El caso más simple, para entender la mecánica:

```sql
WITH RECURSIVE numeros(n) AS (
    SELECT 1                                  -- ancla: empiezo en 1
    UNION ALL
    SELECT n + 1 FROM numeros WHERE n < 10    -- paso: el siguiente, mientras sea menor a 10
)
SELECT n, n * n AS cuadrado FROM numeros;
```

| vuelta | qué produce |
|---|---|
| 0 (ancla) | 1 |
| 1 | 1 + 1 = 2 |
| 2 | 3 |
| … | … |
| 9 | 10 |
| 10 | nada (10 no es < 10): **fin** |

El `(n)` después del nombre define el nombre de la columna. `UNION ALL` es obligatorio entre ancla y paso.

:::cuidado La condición de parada
Sin `WHERE n < 10`, el paso recursivo produciría filas para siempre (en la práctica, hasta un límite de seguridad del motor o hasta llenar la memoria). Antes de ejecutar, pregúntate: **¿en qué momento el paso deja de devolver filas?** En un árbol, se detiene sola cuando llegas a las hojas (nadie tiene como jefe a un empleado sin subordinados). Si los datos tuvieran un **ciclo** (A es jefe de B y B jefe de A), también sería infinita: en ese caso agrega un límite de profundidad (`WHERE nivel < 20`).
:::

## Ejemplo 2: un calendario para rellenar huecos

Ya viste que `GROUP BY` no muestra los días **sin** datos. Un calendario generado con recursión, unido con `LEFT JOIN`, lo resuelve:

```sql
WITH RECURSIVE dias(dia) AS (
    SELECT '2024-12-20'
    UNION ALL
    SELECT date(dia, '+1 day') FROM dias WHERE dia < '2024-12-31'
)
SELECT d.dia, COUNT(p.pedido_id) AS pedidos
FROM dias d
LEFT JOIN pedidos p ON p.fecha_pedido = d.dia
GROUP BY d.dia;
```

| dia | pedidos |
|---|---|
| 2024-12-20 | 18 |
| 2024-12-21 | 24 |
| … | … |

Si algún día no hubiera tenido pedidos, aparecería con **0** en lugar de desaparecer. En reportes y gráficos esto es fundamental: un día faltante en un gráfico de líneas une puntos que no deberían unirse. (En Spark, BigQuery o PostgreSQL existen funciones que generan series directamente, como `sequence()` o `generate_series()`; la recursión funciona en todos.)

## Ejemplo 3: recorrer el organigrama completo

```sql
WITH RECURSIVE org AS (
    -- ancla: el CEO (no tiene jefe)
    SELECT empleado_id, nombre, cargo, jefe_id, 0 AS nivel, nombre AS ruta
    FROM empleados
    WHERE jefe_id IS NULL
    UNION ALL
    -- paso: los empleados cuyo jefe ya está en "org"
    SELECT e.empleado_id, e.nombre, e.cargo, e.jefe_id,
           o.nivel + 1,
           o.ruta || ' > ' || e.nombre
    FROM empleados e
    JOIN org o ON e.jefe_id = o.empleado_id
)
SELECT nivel, nombre, cargo, ruta
FROM org
ORDER BY nivel, nombre
LIMIT 25;
```

Qué pasa en cada vuelta:

| vuelta | quiénes entran | cuántos |
|---|---|---|
| 0 | el CEO | 1 |
| 1 | los que reportan al CEO (directores) | 8 |
| 2 | los que reportan a esos directores (gerentes) | 18 |
| 3 | los que reportan a los gerentes | 96 |
| 4 | nadie: **fin** | 0 |

Dos columnas se van "arrastrando" y calculando en cada vuelta:

- `nivel`: el del jefe + 1 → la profundidad en el organigrama.
- `ruta`: la ruta del jefe + el nombre propio → `Camila > Daniela > Pedro`. Muy útil para mostrar y para ordenar jerárquicamente.

Con este resultado puedes responder preguntas como "¿cuántas personas tiene a cargo (directa o indirectamente) cada director?" o "¿cuál es la masa salarial de cada rama?".

:::experto En el mundo real
- En los data warehouses, las jerarquías profundas suelen "aplanarse" en la etapa de transformación (una columna por nivel: `nivel_1`, `nivel_2`, `nivel_3`), justamente con una CTE recursiva, para que los usuarios de BI no tengan que escribir recursión.
- Spark SQL agregó soporte de CTE recursivas recién en versiones recientes; en Databricks antiguo se resolvía con bucles en PySpark. BigQuery y Snowflake las soportan con `WITH RECURSIVE`.
:::



<!-- estandar:errores -->
:::errores
- **Sin condición de parada**: la CTE crece para siempre (o hasta el límite del motor). Siempre incluye un `WHERE n < 20` o una condición que termine.
- **Ciclos en los datos**: si por error A es jefe de B y B es jefe de A, la recursión no termina. En jerarquías reales conviene limitar la profundidad (`WHERE nivel < 20`).
- **`UNION` en lugar de `UNION ALL`**: en la mayoría de los casos quieres `UNION ALL`; `UNION` quita duplicados en cada paso, es más lento y puede esconder errores.
- **Tipos que no coinciden** entre el caso base y el paso recursivo (por ejemplo, un texto que se alarga en cada nivel): algunos motores dan error. Convierte el caso base al tipo final con `CAST`.
:::

<!-- estandar:trabajo -->
:::trabajo
- En la práctica, la CTE recursiva más usada es el **calendario**: una fila por día, para que los reportes muestren los días sin ventas. En dbt se hace con la macro `date_spine`, y en Spark con `sequence()` + `explode()`.
- Las jerarquías profundas (categorías de productos, cuentas contables, organigramas) se suelen **aplanar** una vez en el pipeline: se guarda para cada elemento su ruta completa y su nivel, para que los reportes no necesiten recursión.
- Spark SQL no tuvo CTE recursivas durante muchos años (llegaron en versiones muy recientes). Muchos equipos todavía resuelven las jerarquías con bucles en PySpark.
:::

## Resumen

- Una CTE recursiva tiene **ancla** + `UNION ALL` + **paso recursivo** que se refiere a la propia CTE.
- El motor aplica el paso sobre las filas nuevas hasta que no aparecen más.
- Siempre debe haber una condición de parada (o un límite de profundidad si puede haber ciclos).
- Usos: series de números y fechas (calendarios para rellenar huecos), árboles (organigramas, categorías), rutas.
- Arrastra columnas como `nivel` y `ruta` para describir la posición en la jerarquía.

## Ejercicios

:::ejercicio sql
Genera los números del **1 al 20** y muestra solo los **pares**. Una columna: `n`.
```sql solucion
WITH RECURSIVE s(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM s WHERE n < 20)
SELECT n FROM s WHERE n % 2 = 0;
```
:::

:::ejercicio sql
Muestra la jerarquía completa de categorías con su **ruta**: `categoria_id`, `nombre`, `nivel` (0 para las raíces) y `ruta` con el formato `Tecnología > Computadoras > Laptops`.
```sql solucion
WITH RECURSIVE c AS (
  SELECT categoria_id, nombre, 0 AS nivel, nombre AS ruta FROM categorias WHERE categoria_padre_id IS NULL
  UNION ALL
  SELECT k.categoria_id, k.nombre, c.nivel + 1, c.ruta || ' > ' || k.nombre
  FROM categorias k JOIN c ON k.categoria_padre_id = c.categoria_id
)
SELECT categoria_id, nombre, nivel, ruta FROM c;
```
:::

:::ejercicio sql
¿Cuántas personas tiene **a su cargo en total** (directa o indirectamente) el empleado `2` (un director)? Una columna: `equipo_total`. No cuentes al propio empleado 2.
```sql solucion
WITH RECURSIVE sub AS (
  SELECT empleado_id FROM empleados WHERE jefe_id = 2
  UNION ALL
  SELECT e.empleado_id FROM empleados e JOIN sub s ON e.jefe_id = s.empleado_id
)
SELECT COUNT(*) AS equipo_total FROM sub;
```
```pista
Ancla: los que reportan directamente al 2. Paso: los que reportan a alguien que ya está en la CTE.
```
:::

:::ejercicio sql ordenado
Genera todos los días de **enero de 2024** y muestra cuántos pedidos hubo cada día, **incluyendo los días con 0**. Columnas: `dia`, `pedidos`. Ordena por día.
```sql solucion
WITH RECURSIVE d(dia) AS (
  SELECT '2024-01-01' UNION ALL SELECT date(dia, '+1 day') FROM d WHERE dia < '2024-01-31'
)
SELECT d.dia, COUNT(p.pedido_id) AS pedidos
FROM d LEFT JOIN pedidos p ON p.fecha_pedido = d.dia
GROUP BY d.dia
ORDER BY d.dia;
```
:::

:::ejercicio sql dificultad=Básico
Con una CTE recursiva, genera los números del **1 al 12** en una columna `mes`.
```sql solucion
WITH RECURSIVE serie(mes) AS (SELECT 1 UNION ALL SELECT mes + 1 FROM serie WHERE mes < 12)
SELECT mes FROM serie;
```
:::

:::ejercicio sql ordenado dificultad=Intermedio
Genera todas las fechas de **enero de 2024** (columna `dia`) con una CTE recursiva, ordenadas.
```pista
Empieza en `'2024-01-01'` y suma un día con `date(dia, '+1 day')` mientras sea menor a `'2024-01-31'`.
```
```sql solucion
WITH RECURSIVE dias(dia) AS (
  SELECT '2024-01-01'
  UNION ALL
  SELECT date(dia, '+1 day') FROM dias WHERE dia < '2024-01-31'
)
SELECT dia FROM dias ORDER BY dia;
```
:::

:::ejercicio sql ordenado dificultad=Avanzado
Cuenta los pedidos de **cada día de enero de 2024**, incluidos los días sin pedidos (con 0). Columnas: `dia`, `pedidos`. Ordena por día.
```pista
El calendario sale de una CTE recursiva; después `LEFT JOIN pedidos`.
```
```pista
Cuenta `p.pedido_id` (no `*`) para que los días vacíos den 0.
```
```sql solucion
WITH RECURSIVE dias(dia) AS (
  SELECT '2024-01-01'
  UNION ALL
  SELECT date(dia, '+1 day') FROM dias WHERE dia < '2024-01-31'
)
SELECT d.dia, COUNT(p.pedido_id) AS pedidos
FROM dias d
LEFT JOIN pedidos p ON p.fecha_pedido = d.dia
GROUP BY d.dia
ORDER BY d.dia;
```
:::

:::ejercicio sql dificultad=Avanzado
Muestra todas las categorías con su **ruta completa** desde la raíz (columna `ruta`, por ejemplo `Tecnología > Computadoras > Laptops`) y su `nivel` (0 para las principales). Columnas: `categoria_id`, `ruta`, `nivel`.
```pista
El caso base son las categorías sin padre, con `ruta = nombre` y `nivel = 0`.
```
```pista
El paso recursivo une `categorias c` con la CTE por `c.categoria_padre_id = r.categoria_id` y arma `r.ruta || ' > ' || c.nombre`.
```
```sql solucion
WITH RECURSIVE r(categoria_id, ruta, nivel) AS (
  SELECT categoria_id, nombre, 0 FROM categorias WHERE categoria_padre_id IS NULL
  UNION ALL
  SELECT c.categoria_id, r.ruta || ' > ' || c.nombre, r.nivel + 1
  FROM categorias c JOIN r ON c.categoria_padre_id = r.categoria_id
)
SELECT categoria_id, ruta, nivel FROM r;
```
:::

:::ejercicio sql dificultad=Avanzado
¿Cuántas personas tiene **a cargo**, directa o indirectamente, la directora de Ventas (`empleado_id = 2`)? Columna: `a_cargo`.
```pista
Recorre el organigrama hacia abajo empezando por los subordinados directos del empleado 2.
```
```pista
Caso base: `WHERE jefe_id = 2`. Paso: empleados cuyo `jefe_id` está en la CTE. Al final, `COUNT(*)`.
```
```sql solucion
WITH RECURSIVE equipo(empleado_id) AS (
  SELECT empleado_id FROM empleados WHERE jefe_id = 2
  UNION ALL
  SELECT e.empleado_id FROM empleados e JOIN equipo q ON e.jefe_id = q.empleado_id
)
SELECT COUNT(*) AS a_cargo FROM equipo;
```
:::

:::ejercicio quiz dificultad=Intermedio
¿Qué pasa si en una CTE recursiva olvidas la condición que la detiene (por ejemplo, `WHERE n < 10`)?

- [ ] El motor la detiene sola después de 100 filas en todos los casos
- [x] La recursión no termina (o el motor la corta con un error por límite de recursión)
- [ ] Devuelve solo el caso base
- [ ] Da un error de sintaxis antes de ejecutarse
:::
