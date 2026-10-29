---
titulo: Rendimiento: índices y planes de ejecución
nivel: Experto
duracion: 35
resumen: Cómo ejecuta el motor tu consulta, índices B-tree, EXPLAIN, consultas "sargables" y antipatrones.
objetivos: Leer un plan de ejecución e identificar si una consulta usa un índice o recorre toda la tabla | Explicar qué es un índice, cuándo ayuda y qué cuesta | Reescribir filtros para que sean sargables | Aplicar una checklist de optimización en el orden correcto
prerrequisitos: sql-joins | sql-funciones
autoevaluacion: ¿Puedes explicar con una analogía qué es un índice? | ¿Sabes por qué `WHERE strftime('%Y', fecha_pedido) = '2024'` no usa el índice y cómo reescribirlo? | ¿Sabes qué columnas de un índice compuesto `(pais, ciudad)` sirven para filtrar solo por ciudad? | ¿Puedes leer un `EXPLAIN QUERY PLAN` y distinguir `SCAN` de `SEARCH`? | ¿Sabes por qué agregar muchos índices puede empeorar una tabla?
---

<!-- estandar:escenario -->
:::escenario La consulta que tarda 10 minutos
Martín, tu líder, te reenvía un mensaje del equipo de BI:

> "El dashboard de ventas tarda 10 minutos en cargar y los gerentes se quejan. La consulta es esta. ¿Puedes ver qué pasa?"

Que una consulta dé el resultado correcto es la mitad del trabajo. La otra mitad es que lo dé **rápido** y **sin gastar de más**. Esta lección te enseña a mirar dentro del motor para entender por qué una consulta es lenta.
:::
Una consulta correcta pero lenta es un problema en producción. Para optimizar, primero hay que entender **cómo** ejecuta el motor tu consulta.

## El optimizador y el plan de ejecución

Cuando envías una consulta, el motor:

1. La **analiza** (parser) y verifica que tablas y columnas existan.
2. El **optimizador** genera varios planes posibles (¿qué tabla leo primero?, ¿uso un índice?, ¿qué algoritmo de join?) y estima su costo con **estadísticas** de las tablas.
3. **Ejecuta** el plan más barato.

Con `EXPLAIN QUERY PLAN` (SQLite) o `EXPLAIN` / `EXPLAIN ANALYZE` (PostgreSQL, Spark, Databricks) ves el plan:

```sql
EXPLAIN QUERY PLAN
SELECT * FROM pedidos WHERE cliente_id = 42;
```

Verás `SEARCH pedidos USING INDEX idx_pedidos_cliente (cliente_id=?)`: el motor usa un **índice** en vez de recorrer toda la tabla. Compara con:

```sql
EXPLAIN QUERY PLAN
SELECT * FROM pedidos WHERE metodo_pago = 'efectivo';
```

Aquí verás `SCAN pedidos`: un recorrido completo (*full table scan*), porque no hay índice sobre `metodo_pago`.

## ¿Qué es un índice?

:::analogia El índice de un libro
Para encontrar “funciones de ventana” en un libro de 800 páginas, no lo lees entero: vas al índice alfabético, que te dice “página 412”. Un índice de base de datos es igual: una estructura ordenada (normalmente un **árbol B**, *B-tree*) que lleva rápidamente de un valor a las filas que lo contienen.
:::

```sql
CREATE INDEX idx_pedidos_metodo ON pedidos(metodo_pago);
EXPLAIN QUERY PLAN SELECT * FROM pedidos WHERE metodo_pago = 'efectivo';
```

**Ventajas**: búsquedas, joins y ordenamientos mucho más rápidos.
**Costos**: ocupan espacio y hacen más lentos los `INSERT`/`UPDATE`/`DELETE` (hay que mantener el índice).

### Índices compuestos y la regla del prefijo

Un índice en `(cliente_id, fecha_pedido)` sirve para filtrar por `cliente_id` o por `cliente_id` + `fecha_pedido`, pero **no** solo por `fecha_pedido` (igual que una guía telefónica ordenada por apellido y nombre no sirve para buscar solo por nombre).

## Consultas “sargables”

Una condición es **sargable** (*Search ARGument ABLE*) si el motor puede usar un índice para resolverla. Envolver la columna en una función suele **impedirlo**:

| ❌ No sargable | ✅ Sargable |
|---|---|
| `WHERE strftime('%Y', fecha_pedido) = '2024'` | `WHERE fecha_pedido >= '2024-01-01' AND fecha_pedido < '2025-01-01'` |
| `WHERE UPPER(email) = 'ANA@MAIL.COM'` | Guardar el email normalizado, o un índice sobre la expresión |
| `WHERE precio * 1.21 > 100` | `WHERE precio > 100 / 1.21` |
| `WHERE nombre LIKE '%ana'` | `WHERE nombre LIKE 'ana%'` (el comodín al inicio impide usar el índice) |

## Antipatrones frecuentes

- **`SELECT *`** en tablas anchas: traes columnas que no usas (en Parquet/Spark lee mucho más disco).
- **Subconsultas correlacionadas** sobre tablas grandes: pueden ejecutarse una vez por fila. Prueba un JOIN o una ventana.
- **`DISTINCT` para “arreglar” duplicados** que vienen de un JOIN mal hecho: arregla el JOIN.
- **`OR` entre columnas distintas** a veces impide índices: a veces conviene `UNION ALL`.
- **Funciones sobre columnas en el JOIN** (`ON CAST(a.id AS TEXT) = b.id`): tipos distintos impiden índices; normaliza los tipos.
- **`NOT IN` con subconsultas que pueden tener NULL**: resultado incorrecto (y suele ser lento).

## En el mundo big data (Spark, Databricks, Snowflake, BigQuery)

Los data warehouses columnares casi no usan índices B-tree. En su lugar optimizan con:

- **Particionado**: archivos separados por, por ejemplo, fecha. Un filtro por fecha lee solo esas carpetas (*partition pruning*).
- **Estadísticas min/max por archivo** (*data skipping*), clustering / Z-ORDER / Liquid Clustering en Delta Lake.
- **Leer solo las columnas necesarias** (*column pruning*) y **empujar filtros** hacia la lectura (*predicate pushdown*).

Lo verás en detalle en el módulo de Spark.

## Cómo combina tablas el motor: los algoritmos de join

Cuando escribes un `JOIN`, el optimizador elige **cómo** emparejar las filas. Conocer las tres estrategias te ayuda a leer planes (en Spark las verás con estos mismos nombres):

| Algoritmo | Cómo funciona | Cuándo es bueno |
|---|---|---|
| **Nested loop** (bucle anidado) | Para cada fila de A, busca sus parejas en B (idealmente con un índice) | A es chica y B tiene índice en la columna de unión |
| **Hash join** | Construye una tabla *hash* (un diccionario) con la tabla chica y recorre la grande consultándolo | Tablas grandes sin índice, uniones por igualdad. El más común en analítica |
| **Merge join** (sort-merge) | Ordena ambas por la clave y las recorre en paralelo, como un cierre relámpago | Datos ya ordenados o muy grandes (Spark lo usa por defecto entre tablas grandes) |

:::analogia Buscar a tus compañeros en una fiesta
*Nested loop*: por cada persona de tu lista, recorres la fiesta buscándola (lento sin un "índice", es decir, sin saber dónde está cada uno). *Hash join*: primero armas un mapa "nombre → mesa" de la lista chica y después recorres la fiesta una vez, consultando el mapa. *Merge join*: ordenas ambas listas alfabéticamente y las comparas de arriba hacia abajo a la vez.
:::

```motores
titulo: Ver el plan de ejecución
[sqlite]
EXPLAIN QUERY PLAN
SELECT * FROM pedidos WHERE cliente_id = 42;
[postgres]
-- ANALYZE ejecuta la consulta y muestra los tiempos reales
EXPLAIN ANALYZE
SELECT * FROM pedidos WHERE cliente_id = 42;
[mysql norun]
EXPLAIN ANALYZE
SELECT * FROM pedidos WHERE cliente_id = 42;
[sqlserver norun]
-- en SSMS: Ctrl+M (plan real) o Ctrl+L (plan estimado)
SET STATISTICS PROFILE ON;
SELECT * FROM pedidos WHERE cliente_id = 42;
```

## Cómo leer un plan de SQLite

`EXPLAIN QUERY PLAN` muestra una línea por paso. Las palabras clave:

| Verás | Significa | ¿Bueno o malo? |
|---|---|---|
| `SCAN tabla` | Recorre **toda** la tabla | Malo en tablas grandes si filtrabas por pocos valores |
| `SEARCH tabla USING INDEX idx (col=?)` | Usa un índice para ir directo | Bueno |
| `USING COVERING INDEX` | El índice tiene todas las columnas necesarias: ni siquiera lee la tabla | Muy bueno |
| `USE TEMP B-TREE FOR ORDER BY / GROUP BY` | Tiene que ordenar en una estructura temporal | Costoso con muchos datos |

```sql
EXPLAIN QUERY PLAN
SELECT c.pais, COUNT(*)
FROM pedidos p JOIN clientes c ON c.cliente_id = p.cliente_id
WHERE p.fecha_pedido >= '2024-12-01'
GROUP BY c.pais;
```

En PostgreSQL usa `EXPLAIN ANALYZE` (ejecuta la consulta y muestra los tiempos **reales** de cada paso, además de las filas estimadas vs. reales: una gran diferencia indica estadísticas desactualizadas). En Spark y Databricks, `df.explain()` o la pestaña SQL de la Spark UI.

## Checklist de optimización (en orden)

1. **¿La consulta es correcta?** Optimizar algo mal hecho es perder el tiempo. Verifica conteos y totales.
2. **¿Lee menos datos?** Filtra lo antes posible (`WHERE` antes que `HAVING`), elige columnas, filtra por partición.
3. **¿Los filtros son sargables?** Nada de funciones sobre la columna filtrada.
4. **¿Los joins están bien?** Claves correctas, mismos tipos, sin multiplicar filas por un `ON` incompleto.
5. **¿Hay índice (o partición/clustering) para los filtros y joins frecuentes?**
6. **Mira el plan** antes y después de cada cambio. Mide, no adivines.



<!-- estandar:trabajo -->
:::trabajo
- En los data warehouses en la nube (BigQuery, Snowflake, Databricks SQL) casi no hay índices como en PostgreSQL. Lo que manda es **leer menos**: particionar por fecha, agrupar los datos por las columnas más filtradas (*clustering*, Z-ORDER, Liquid Clustering) y seleccionar solo las columnas necesarias. La idea de fondo es la misma: no recorrer lo que no hace falta.
- Optimizar sin medir es adivinar. El flujo profesional es: medir cuánto tarda y cuánto lee, mirar el plan, cambiar **una** cosa y volver a medir.
- En la nube, rendimiento es plata: en BigQuery se paga por byte leído y en Snowflake o Databricks, por tiempo de cómputo. Una consulta 10 veces más eficiente es una factura 10 veces más chica.
:::

<!-- estandar:entrevista -->
:::entrevista "Una consulta que antes tardaba 2 segundos ahora tarda 2 minutos. ¿Qué haces?"
Una buena respuesta es un método: 1) ¿Cambió el volumen de datos o la consulta? 2) Mirar el plan de ejecución: ¿dejó de usar un índice o de podar particiones? 3) Revisar si las estadísticas están desactualizadas. 4) Buscar cambios recientes (un JOIN nuevo que multiplica filas, una función sobre una columna filtrada). 5) Probar la corrección y medir.
:::

## Ejercicios

:::ejercicio quiz
¿Cuál de estos filtros puede aprovechar un índice sobre `fecha_pedido`?

- [ ] `WHERE strftime('%Y-%m', fecha_pedido) = '2024-03'`
- [x] `WHERE fecha_pedido >= '2024-03-01' AND fecha_pedido < '2024-04-01'`
- [ ] `WHERE date(fecha_pedido, '+1 day') = '2024-03-02'`
- [ ] Ninguno
:::

:::ejercicio quiz
Hay un índice compuesto en `(pais, ciudad)`. ¿Qué consulta **no** lo puede usar eficientemente para filtrar?

- [ ] `WHERE pais = 'Chile'`
- [ ] `WHERE pais = 'Chile' AND ciudad = 'Santiago'`
- [x] `WHERE ciudad = 'Santiago'`
- [ ] Todas lo usan igual
```explicacion
Regla del prefijo: el índice está ordenado primero por país; buscar solo por ciudad obliga a revisarlo entero.
```
:::

:::ejercicio sql
Reescribe esta consulta para que sea **sargable** (mismo resultado): `SELECT pedido_id FROM pedidos WHERE strftime('%Y', fecha_pedido) = '2023' AND canal = 'app'`.
```sql solucion
SELECT pedido_id FROM pedidos WHERE fecha_pedido >= '2023-01-01' AND fecha_pedido < '2024-01-01' AND canal = 'app';
```
```explicacion
El resultado es el mismo; la diferencia es que la versión con rango permite usar un índice sobre `fecha_pedido`. (El corrector solo verifica el resultado: ¡la buena práctica depende de ti!)
```
:::

:::ejercicio quiz
Agregas 5 índices nuevos a una tabla donde se insertan 10.000 filas por segundo. ¿Qué es lo más probable?

- [ ] Las inserciones se vuelven más rápidas
- [x] Las inserciones se vuelven más lentas, porque cada índice debe actualizarse
- [ ] No cambia nada
- [ ] La tabla deja de aceptar inserciones
:::

:::ejercicio sql dificultad=Intermedio
Esta consulta cuenta los pedidos de 2024, pero no puede usar un índice sobre `fecha_pedido` porque aplica una función a la columna:

`SELECT COUNT(*) AS pedidos FROM pedidos WHERE strftime('%Y', fecha_pedido) = '2024';`

Reescríbela de forma **sargable** (que pueda usar el índice) y que devuelva lo mismo.
```pista
Compara la columna “desnuda” contra un rango de fechas.
```
```sql solucion
SELECT COUNT(*) AS pedidos FROM pedidos WHERE fecha_pedido >= '2024-01-01' AND fecha_pedido < '2025-01-01';
```
:::

:::ejercicio sql dificultad=Intermedio
Reescribe de forma sargable: `SELECT nombre FROM productos WHERE precio * 1.21 > 1210;` (precio con IVA mayor a 1210).
```pista
Pasa la operación al otro lado: `precio > 1210 / 1.21`.
```
```sql solucion
SELECT nombre FROM productos WHERE precio > 1210 / 1.21;
```
:::

:::ejercicio quiz dificultad=Intermedio
Hay un índice sobre `clientes(email)`. ¿Cuál de estos filtros **no** puede aprovecharlo para buscar?

- [ ] `WHERE email = 'ana@correo.com'`
- [ ] `WHERE email LIKE 'ana%'`
- [x] `WHERE email LIKE '%@gmail.com'`
- [ ] `WHERE email IN ('a@x.com', 'b@x.com')`
```explicacion
Un comodín al principio obliga a revisar todos los valores: el índice está ordenado por el comienzo del texto.
```
:::

:::ejercicio quiz dificultad=Avanzado
Tienes un índice compuesto `(cliente_id, fecha_pedido)`. ¿Qué consulta lo aprovecha **mejor**?

- [ ] `WHERE fecha_pedido = '2024-05-01'`
- [x] `WHERE cliente_id = 42 AND fecha_pedido >= '2024-01-01'`
- [ ] `WHERE fecha_pedido >= '2024-01-01' OR cliente_id = 42`
- [ ] `WHERE strftime('%Y', fecha_pedido) = '2024'`
```explicacion
Un índice compuesto se usa de izquierda a derecha: primero la igualdad sobre la primera columna, después el rango sobre la segunda.
```
:::

:::ejercicio quiz dificultad=Intermedio
Una consulta de un tablero hace `SELECT *` sobre una tabla de 80 columnas y solo usa 3. En un almacén columnar (BigQuery, Snowflake, Databricks), ¿qué cambia si pides solo esas 3?

- [ ] Nada: el costo depende de las filas, no de las columnas
- [x] Lee y cobra mucho menos, porque los formatos columnares leen solo las columnas pedidas
- [ ] Es más lenta, porque el motor tiene que elegir columnas
- [ ] Solo cambia si además agregas LIMIT
:::

:::ejercicio quiz dificultad=Avanzado
Una consulta une `pedidos` (12.000 filas) con `detalle_pedidos` (25.000) por `pedido_id`, sin índices sobre esa columna en el detalle. ¿Qué algoritmo de join suele elegir un motor moderno?

- [ ] Nested loop sin índice, recorriendo el detalle una vez por cada pedido
- [x] Hash join: arma una tabla hash con la tabla chica y recorre la grande una sola vez
- [ ] Un producto cartesiano y después un filtro
- [ ] Ninguno: el motor exige un índice para hacer el join
:::
