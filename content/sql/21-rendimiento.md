---
titulo: Rendimiento: índices y planes de ejecución
nivel: Experto
duracion: 35
resumen: Cómo ejecuta el motor tu consulta, índices B-tree, EXPLAIN, consultas "sargables" y antipatrones.
---

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
