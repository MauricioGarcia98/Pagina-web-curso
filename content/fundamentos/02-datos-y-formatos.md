---
titulo: Datos, tablas y formatos de archivo
nivel: Básico
duracion: 20
resumen: Filas y columnas, tipos de datos, CSV, JSON, Parquet, bases de datos OLTP y OLAP.
---

## Todo empieza con una tabla

La forma más común de organizar datos es una **tabla**, como una hoja de Excel:

| cliente_id | nombre | pais | fecha_registro |
|---|---|---|---|
| 1 | Lucía | España | 2024-04-07 |
| 2 | Mateo | México | 2023-01-15 |
| 3 | Sofía | Chile | 2022-11-30 |

- Cada **fila** (o *registro*) es una cosa: un cliente.
- Cada **columna** (o *campo*) es una característica: su nombre, su país…
- Una columna que identifica de forma única cada fila (aquí `cliente_id`) se llama **clave primaria** (*primary key*).

## Tipos de datos

Cada columna guarda un **tipo** de dato. Los más importantes:

| Tipo | Ejemplos | Nota |
|---|---|---|
| Entero (`INTEGER`) | 1, 42, -7 | Sin decimales |
| Decimal (`REAL`, `DOUBLE`, `DECIMAL`) | 19.99, 0.5 | Para dinero se prefiere `DECIMAL` (exacto) |
| Texto (`TEXT`, `VARCHAR`, `STRING`) | 'Lucía', 'web' | Va entre comillas simples en SQL |
| Fecha / hora (`DATE`, `TIMESTAMP`) | 2024-03-15, 2024-03-15 10:30:00 | Formato ISO: año-mes-día |
| Booleano (`BOOLEAN`) | verdadero / falso | En SQLite se usa 1 / 0 |
| Nulo (`NULL`) | — | Significa “no se sabe” o “no hay dato” |

:::cuidado NULL no es cero ni texto vacío
`NULL` significa **ausencia de valor**. Un cliente sin teléfono tiene `telefono = NULL`, que es distinto de `telefono = ''` (texto vacío) o de `0`. Le dedicaremos una lección entera.
:::

## Formatos de archivo

Los datos viajan en archivos. Estos son los que vas a ver siempre:

**CSV** (*comma-separated values*): texto plano, una fila por línea, valores separados por comas. Simple y universal, pero no guarda tipos (todo es texto) y es lento para grandes volúmenes.

```text
cliente_id,nombre,pais
1,Lucía,España
2,Mateo,México
```

**JSON**: texto con estructura anidada (objetos `{}` y listas `[]`). Es el idioma de las APIs web.

```json
{"cliente_id": 1, "nombre": "Lucía", "intereses": ["running", "tecnología"], "direccion": {"ciudad": "Madrid"}}
```

**Parquet**: formato **binario y columnar**. Guarda los tipos, comprime muchísimo y permite leer solo las columnas que necesitas. Es el estándar en big data (Spark, Databricks).

**Delta Lake**: Parquet + un registro de transacciones. Agrega actualizaciones seguras (ACID), historial de versiones (*time travel*) y `MERGE`. Lo verás en Spark y Databricks.

:::analogia ¿Por qué “columnar” es más rápido?
Imagina una biblioteca. En CSV cada libro es un cliente con todos sus datos; para saber “el país de todos”, abres todos los libros. En Parquet hay un libro por columna: para saber el país de todos, abres **un solo libro**.
:::

## Dónde viven los datos

| Sistema | Para qué | Ejemplos |
|---|---|---|
| **Base de datos transaccional (OLTP)** | La app del día a día: registrar una venta, actualizar un stock. Muchas operaciones pequeñas y rápidas. | PostgreSQL, MySQL, SQL Server |
| **Data warehouse (OLAP)** | Análisis: “ventas por mes de los últimos 5 años”. Pocas consultas, pero enormes. | Snowflake, BigQuery, Synapse, Databricks SQL |
| **Data lake** | Archivos (CSV, JSON, Parquet) de cualquier tipo, baratos, en la nube. | Azure Data Lake Storage, Amazon S3 |
| **Lakehouse** | Lo mejor de ambos: archivos baratos en el lake con la fiabilidad de un warehouse (gracias a Delta Lake). | Databricks |

## Nuestro dataset: Tienda Andina

En todo el curso usamos una empresa ficticia, **Tienda Andina**, con ~90.000 filas en 12 tablas: clientes, productos, pedidos, detalle de pedidos, pagos, empleados, eventos web y más. Puedes explorarla en [Los datos](#/datos).

:::ejercicio quiz
Quieres guardar 5 años de ventas (miles de millones de filas) para analizarlas con Spark, ocupando poco espacio y leyendo solo algunas columnas. ¿Qué formato elegirías?

- [ ] CSV
- [ ] JSON
- [x] Parquet (o Delta Lake)
- [ ] Un documento de Word
```explicacion
Parquet es columnar, comprimido y guarda tipos. Delta Lake agrega transacciones e historial sobre Parquet.
```
:::

:::ejercicio quiz
En la tabla `clientes`, algunos no tienen email registrado. ¿Qué valor tiene esa columna para ellos?

- [ ] 0
- [ ] La palabra 'vacío'
- [x] NULL
- [ ] Un error
:::

:::ejercicio quiz
La app móvil de un banco registra cada transferencia en el instante en que ocurre. ¿Qué tipo de sistema es?

- [x] Una base de datos transaccional (OLTP)
- [ ] Un data warehouse (OLAP)
- [ ] Un archivo CSV
- [ ] Airflow
:::
