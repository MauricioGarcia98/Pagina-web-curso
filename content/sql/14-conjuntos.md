---
titulo: UNION, INTERSECT y EXCEPT
nivel: Intermedio
duracion: 30
resumen: Combinar resultados de varias consultas verticalmente.
objetivos: Apilar resultados de varias consultas con `UNION` y `UNION ALL` | Elegir entre `UNION` y `UNION ALL` según si quieres eliminar repetidos | Encontrar coincidencias y diferencias entre dos conjuntos con `INTERSECT` y `EXCEPT` | Comparar dos tablas para validar un pipeline
prerrequisitos: sql-where
autoevaluacion: ¿Sabes qué diferencia hay entre `UNION` y `UNION ALL`, y cuál es más rápido? | ¿Sabes qué condiciones deben cumplir las consultas para poder unirlas con `UNION`? | ¿Puedes encontrar los clientes que compraron en 2022 pero no en 2024? | ¿Puedes encontrar los clientes que compraron por web y también en tienda? | ¿Sabes cómo usar `EXCEPT` para comprobar que dos tablas son iguales?
---

<!-- estandar:escenario -->
:::escenario Los clientes que se fueron
Camila quiere entender la fuga de clientes:

> "¿Qué clientes compraron en 2022 y nunca más volvieron en 2024? Y al revés, ¿quiénes compran tanto online como en la tienda física? Esos son nuestros mejores clientes."

Son preguntas sobre **conjuntos** de clientes: los de un año menos los de otro, los que están en los dos grupos. SQL tiene operadores pensados exactamente para eso.
:::
## Combinar resultados "hacia abajo"

Los `JOIN` combinan tablas **a lo ancho**: pegan columnas de una tabla al lado de las de otra. Los **operadores de conjuntos** combinan resultados **a lo largo**: apilan las filas de una consulta **debajo** de las de otra.

```text
JOIN (a lo ancho)                 UNION (a lo largo)
┌────┬──────┐ + ┌──────┐          ┌──────────┐
│ id │ col1 │   │ col2 │          │ consulta │
└────┴──────┘   └──────┘          │    A     │
        =                         ├──────────┤
┌────┬──────┬──────┐              │ consulta │
│ id │ col1 │ col2 │              │    B     │
└────┴──────┴──────┘              └──────────┘
```

Cuándo los necesitas:

- Juntar datos **parecidos** que viven en tablas distintas: ventas de la tienda online + ventas de la tienda física; clientes + empleados en un directorio único.
- Unir tablas **particionadas** por periodo: `ventas_2023` + `ventas_2024`.
- Comparar dos listas: ¿qué ids están en ambas? ¿Cuáles están solo en una?

## Los cuatro operadores

| Operador | Resultado | Analogía con dos listas de invitados |
|---|---|---|
| `UNION ALL` | Todas las filas de ambas, **con** repetidos | Juntar las dos listas tal cual |
| `UNION` | Todas las filas de ambas, **sin** repetidos | Juntarlas y tachar los nombres repetidos |
| `INTERSECT` | Solo las filas que están en **las dos** | Quienes están invitados por ambos |
| `EXCEPT` | Las filas de la primera que **no** están en la segunda | Invitados solo de la primera lista |

(`EXCEPT` se llama `MINUS` en Oracle.)

## Las reglas

1. Las consultas deben tener **la misma cantidad de columnas**.
2. Las columnas se emparejan **por posición**, no por nombre: la primera con la primera, la segunda con la segunda. Los tipos deben ser compatibles.
3. Los **nombres** de las columnas del resultado salen de la **primera** consulta.
4. `ORDER BY` va **una sola vez, al final**, y ordena el resultado completo.

```sql
-- Directorio de contactos: clientes de Uruguay y empleados de Recursos Humanos
SELECT nombre, apellido, email, 'cliente' AS tipo FROM clientes  WHERE pais = 'Uruguay'
UNION ALL
SELECT nombre, apellido, email, 'empleado'        FROM empleados WHERE departamento_id = 8
ORDER BY apellido;
```

Fíjate en la columna literal `tipo`: le agrega a cada fila una etiqueta de **de dónde vino**. Es una práctica muy buena cuando apilas fuentes distintas: después puedes filtrar o contar por origen.

:::cuidado El orden de las columnas importa, no su nombre
Si escribes `SELECT nombre, apellido …` arriba y `SELECT apellido, nombre …` abajo, SQL **no** da error: apila apellidos en la columna `nombre`. Revisa que las columnas estén en el mismo orden en todas las consultas.
:::

## UNION vs UNION ALL

```sql
SELECT (SELECT COUNT(*) FROM (SELECT ciudad FROM clientes UNION     SELECT ciudad FROM departamentos)) AS con_union,
       (SELECT COUNT(*) FROM (SELECT ciudad FROM clientes UNION ALL SELECT ciudad FROM departamentos)) AS con_union_all;
```

| con_union | con_union_all |
|---|---|
| 24 | 2009 |

`UNION ALL` apila las 2.000 ciudades de clientes y las 9 de departamentos (2.009 filas, con muchísimas repetidas). `UNION` además elimina repetidos y deja las **24 ciudades distintas**.

:::tip Usa UNION ALL por defecto
`UNION` tiene que comparar todas las filas para eliminar duplicados (ordenar o "hashear" todo el resultado), lo cual es costoso con muchos datos. Y a veces los duplicados son **información válida** (dos ventas idénticas son dos ventas). Usa `UNION ALL` salvo que **quieras** eliminar repetidos.
:::

```recorrido
titulo: UNION contra UNION ALL, con los mismos datos
estacion a: Consulta A | icono=tabla
estacion b: Consulta B | icono=tabla
estacion all: UNION ALL | icono=capas
estacion union: UNION | icono=check
paso a: Primera consulta
Los canales de los pedidos 101 a 104.
>>> tabla
pedido_id,canal
101,web
102,web
103,web
104,web
paso b: Segunda consulta
Los canales de los pedidos 103 a 106. Los pedidos 103 y 104 están en las dos.
>>> tabla
pedido_id,canal
103,web
104,web
105,web
106,web
paso all: UNION ALL: apila todo
Pone las filas de B debajo de las de A, **sin mirar** si se repiten. Es rápido: no tiene que comparar nada.
>>> tabla
pedido_id,canal
101,web
102,web
103,web
104,web
103,web
104,web
105,web
106,web
paso union: UNION: apila y quita repetidas
Además de apilar, elimina las filas **idénticas** (todas las columnas iguales). Para eso tiene que comparar, lo que cuesta más. Úsalo solo cuando de verdad quieras quitar duplicados.
>>> tabla
pedido_id,canal
101,web
102,web
103,web
104,web
105,web
106,web
```

## INTERSECT y EXCEPT

```sql
-- Ciudades donde hay clientes Y alguna oficina de la empresa
SELECT ciudad FROM clientes
INTERSECT
SELECT ciudad FROM departamentos;
```

Devuelve 7 ciudades (Bogotá, Buenos Aires, Ciudad de México, Lima, Madrid, Montevideo, Santiago).

```sql
-- Ciudades con clientes pero SIN oficina
SELECT ciudad FROM clientes
EXCEPT
SELECT ciudad FROM departamentos
ORDER BY ciudad;
```

`INTERSECT` y `EXCEPT` eliminan repetidos (como `UNION`). Tienen equivalentes con `EXISTS` y `NOT EXISTS`, pero cuando comparas **filas completas** de varias columnas, son mucho más cortos y claros.

:::experto EXCEPT para probar pipelines
Un uso profesional: verificar que dos versiones de una tabla son idénticas (por ejemplo, después de migrar un proceso). `(A EXCEPT B)` y `(B EXCEPT A)` deben dar **cero** filas. Si alguna devuelve algo, esas son exactamente las filas que difieren. Es un test de regresión barato y potente.
:::

```motores
titulo: Clientes que nunca compraron, con EXCEPT
[sqlite]
SELECT cliente_id FROM clientes
EXCEPT
SELECT cliente_id FROM pedidos
ORDER BY cliente_id;
[postgres]
SELECT cliente_id FROM clientes
EXCEPT
SELECT cliente_id FROM pedidos
ORDER BY cliente_id;
[mysql]
-- disponible desde MySQL 8.0.31; antes se usaba NOT EXISTS
SELECT cliente_id FROM clientes
EXCEPT
SELECT cliente_id FROM pedidos
ORDER BY cliente_id;
[sqlserver]
SELECT cliente_id FROM clientes
EXCEPT
SELECT cliente_id FROM pedidos
ORDER BY cliente_id;
[oracle]
-- Oracle lo llama MINUS
SELECT cliente_id FROM clientes
MINUS
SELECT cliente_id FROM pedidos
ORDER BY cliente_id;
```

## Apilar y después agregar

Para agregar sobre el resultado apilado, envuélvelo en una tabla derivada (o una CTE):

```sql
SELECT tipo, COUNT(*) AS personas
FROM (
  SELECT 'cliente'  AS tipo FROM clientes
  UNION ALL
  SELECT 'empleado' AS tipo FROM empleados
) AS todos
GROUP BY tipo;
```



<!-- estandar:errores -->
:::errores
- **Usar `UNION` cuando querías todas las filas**: `UNION` elimina duplicados. Si apilas las ventas de dos meses y dos ventas son idénticas, una desaparece. Para apilar datos, usa `UNION ALL`.
- **Columnas en distinto orden**: `UNION` empareja por **posición**, no por nombre. `SELECT nombre, ciudad ... UNION SELECT ciudad, nombre ...` mezcla ciudades con nombres sin dar error.
- **`ORDER BY` en cada parte**: solo se permite un `ORDER BY`, al final de todo.
- **`EXCEPT` no es simétrico**: `A EXCEPT B` (lo que está en A y no en B) no es lo mismo que `B EXCEPT A`.
:::

<!-- estandar:trabajo -->
:::trabajo
- `UNION ALL` es la forma estándar de juntar datos que llegan partidos: una tabla por país, por año o por sistema de origen. En dbt existe la macro `union_relations` para hacerlo con tablas que tienen columnas distintas.
- `EXCEPT` en las dos direcciones es una prueba clásica de **regresión** en pipelines: después de reescribir un modelo, comparas el resultado nuevo con el viejo. Si `nuevo EXCEPT viejo` y `viejo EXCEPT nuevo` están vacíos, tu cambio no alteró los datos.
- `UNION` (sin ALL) obliga a la base a ordenar o comparar todas las filas para quitar duplicados: en tablas grandes, es mucho más lento.
:::

## Resumen

- Los operadores de conjuntos apilan filas; los `JOIN` agregan columnas.
- Misma cantidad de columnas, emparejadas por **posición**; nombres de la primera consulta; un único `ORDER BY` al final.
- `UNION ALL` conserva repetidos (y es más rápido); `UNION` los elimina.
- `INTERSECT` = filas en ambas; `EXCEPT` = filas solo en la primera. Útiles para comparar tablas.
- Agrega una columna literal de origen cuando apilas fuentes distintas.

## Ejercicios

:::ejercicio sql
Muestra una lista **sin duplicados** de todas las ciudades donde hay clientes **o** departamentos. Una columna: `ciudad`.
```sql solucion
SELECT ciudad FROM clientes UNION SELECT ciudad FROM departamentos;
```
:::

:::ejercicio sql
¿Qué `cliente_id` compraron en **2022** pero **no** volvieron a comprar en **2024**? Usa `EXCEPT`.
```sql solucion
SELECT cliente_id FROM pedidos WHERE fecha_pedido < '2023-01-01' AND fecha_pedido >= '2022-01-01'
EXCEPT
SELECT cliente_id FROM pedidos WHERE fecha_pedido >= '2024-01-01';
```
:::

:::ejercicio sql
¿Qué `cliente_id` compraron por el canal `web` **y también** por el canal `tienda`? Usa `INTERSECT`.
```sql solucion
SELECT cliente_id FROM pedidos WHERE canal = 'web'
INTERSECT
SELECT cliente_id FROM pedidos WHERE canal = 'tienda';
```
:::

:::ejercicio sql dificultad=Básico
Arma una sola lista de ciudades (columna `ciudad`, sin repetir) donde hay **clientes o departamentos**.
```sql solucion
SELECT ciudad FROM clientes UNION SELECT ciudad FROM departamentos;
```
:::

:::ejercicio sql dificultad=Básico
¿Qué `cliente_id` hicieron pedidos tanto por `web` como por `app`? Usa `INTERSECT`.
```sql solucion
SELECT cliente_id FROM pedidos WHERE canal = 'web'
INTERSECT
SELECT cliente_id FROM pedidos WHERE canal = 'app';
```
:::

:::ejercicio sql dificultad=Intermedio
¿Qué `cliente_id` compraron en 2023 pero **no** en 2024? Usa `EXCEPT`.
```pista
Dos consultas con rangos de fechas distintos y `EXCEPT` en el medio.
```
```sql solucion
SELECT cliente_id FROM pedidos WHERE fecha_pedido >= '2023-01-01' AND fecha_pedido < '2024-01-01'
EXCEPT
SELECT cliente_id FROM pedidos WHERE fecha_pedido >= '2024-01-01' AND fecha_pedido < '2025-01-01';
```
:::

:::ejercicio sql dificultad=Intermedio
Arma una lista de “personas” con dos columnas: `tipo` (`'cliente'` o `'empleado'`) y `email`, con los clientes y empleados que tienen email. Usa `UNION ALL`.
```pista
Cada `SELECT` agrega una columna constante con el tipo.
```
```sql solucion
SELECT 'cliente' AS tipo, email FROM clientes WHERE email IS NOT NULL
UNION ALL
SELECT 'empleado' AS tipo, email FROM empleados WHERE email IS NOT NULL;
```
:::

:::ejercicio sql dificultad=Avanzado
Cuenta cuántas personas hay de cada tipo en la lista anterior (clientes con email y empleados con email). Columnas: `tipo`, `personas`.
```pista
Pon el `UNION ALL` en una subconsulta (o CTE) y agrupa encima.
```
```sql solucion
SELECT tipo, COUNT(*) AS personas
FROM (
  SELECT 'cliente' AS tipo, email FROM clientes WHERE email IS NOT NULL
  UNION ALL
  SELECT 'empleado' AS tipo, email FROM empleados WHERE email IS NOT NULL
) AS t
GROUP BY tipo;
```
:::

:::ejercicio sql dificultad=Avanzado
¿Cuántos clientes compraron en **los tres años** (2022, 2023 y 2024)? Columna: `clientes`.
```pista
Tres conjuntos de `cliente_id`, uno por año, unidos con `INTERSECT`.
```
```pista
Envuelve el resultado en `SELECT COUNT(*) FROM (…)`.
```
```sql solucion
SELECT COUNT(*) AS clientes FROM (
  SELECT cliente_id FROM pedidos WHERE strftime('%Y', fecha_pedido) = '2022'
  INTERSECT
  SELECT cliente_id FROM pedidos WHERE strftime('%Y', fecha_pedido) = '2023'
  INTERSECT
  SELECT cliente_id FROM pedidos WHERE strftime('%Y', fecha_pedido) = '2024'
) AS t;
```
:::

:::ejercicio quiz dificultad=Intermedio
`SELECT ciudad FROM clientes UNION ALL SELECT ciudad FROM departamentos` devuelve 2.009 filas y con `UNION` devuelve 24. ¿Por qué?

- [ ] `UNION ALL` incluye los NULL y `UNION` no
- [x] `UNION` quita las filas repetidas; `UNION ALL` las conserva
- [ ] `UNION` ordena el resultado y descarta filas
- [ ] Es un error: los dos deberían devolver lo mismo
:::
