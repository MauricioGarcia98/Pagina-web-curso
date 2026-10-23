---
titulo: Datos, tablas y formatos de archivo
nivel: Básico
duracion: 35
resumen: Filas y columnas, tipos de datos, CSV, JSON, Parquet, bases de datos OLTP y OLAP.
---

Antes de aprender a consultar datos, conviene entender **cómo están guardados**: en tablas, con tipos, en archivos de distintos formatos y en distintos sistemas. Esta lección te da ese vocabulario, que vas a usar todos los días.

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

¿Por qué hace falta un id si ya tenemos el nombre? Porque puede haber dos "Lucía", y porque los nombres cambian (alguien corrige un apellido mal escrito). El número `1` **nunca cambia y nunca se repite**: es la forma segura de referirse a ese cliente.

### Tablas que se relacionan

Una empresa no tiene una sola tabla gigante: tiene varias, cada una sobre un tipo de cosa, conectadas por sus ids. En Tienda Andina, cada pedido dice **qué cliente** lo hizo guardando su `cliente_id`:

```text
clientes                                        pedidos
┌────────────┬──────────┬────────────┐        ┌───────────┬────────────┬──────────────┬───────┐
│ cliente_id │ nombre   │ pais       │        │ pedido_id │ cliente_id │ fecha_pedido │ canal │
├────────────┼──────────┼────────────┤        ├───────────┼────────────┼──────────────┼───────┤
│ 528        │ Paula    │ Argentina  │◄───────│ 1         │ 528        │ 2022-01-01   │ app   │
│ 970        │ Santiago │ Costa Rica │◄───────│ 2         │ 970        │ 2022-01-01   │ web   │
└────────────┴──────────┴────────────┘   └────│ 42        │ 528        │ 2022-01-06   │ web   │
                                              └───────────┴────────────┴──────────────┴───────┘
```

En `pedidos`, la columna `cliente_id` es una **clave foránea** (*foreign key*): apunta a la clave primaria de otra tabla. Así, el pedido no repite el nombre ni el país del cliente. Si Paula se muda a Chile, se cambia **en un solo lugar** y todos sus pedidos quedan bien. A esta forma de separar la información para no repetirla se la llama **normalización**. En SQL vas a volver a unir las tablas con `JOIN`.

Prueba a contar cuántos pedidos tiene cada uno de los primeros clientes. Todavía no tienes que entender la consulta, solo mirar el resultado:

```sql
SELECT c.cliente_id, c.nombre, c.pais, COUNT(p.pedido_id) AS pedidos
FROM clientes c
JOIN pedidos p ON p.cliente_id = c.cliente_id
GROUP BY c.cliente_id
ORDER BY c.cliente_id
LIMIT 5;
```

## Tipos de datos

Cada columna guarda un **tipo** de dato. Los más importantes:

| Tipo | Ejemplos | Nota |
|---|---|---|
| Entero (`INTEGER`) | 1, 42, -7 | Sin decimales |
| Decimal (`REAL`, `DOUBLE`, `DECIMAL`) | 19.99, 0.5 | Para dinero se prefiere `DECIMAL` (exacto) |
| Texto (`TEXT`, `VARCHAR`, `STRING`) | 'Lucía', 'web' | Va entre comillas simples en SQL |
| Fecha / hora (`DATE`, `TIMESTAMP`) | 2024-03-15, 2024-03-15 10:30:00 | Formato ISO: año-mes-día |
| Booleano (`BOOLEAN`) | verdadero / falso | En SQLite se usa 1 / 0 |
| Nulo (`NULL`) | — | Significa "no se sabe" o "no hay dato" |

¿Por qué importa el tipo? Porque cambia lo que puedes hacer y el resultado:

- Con números puedes **sumar y promediar**. Si el precio está guardado como texto, `'10' + '5'` puede dar `'105'` o un error, según el sistema.
- Los textos se **ordenan como en el diccionario**: `'9'` va **después** de `'10'`, porque se compara letra por letra y `'9'` > `'1'`. Por eso un número guardado como texto se ordena mal.
- Las fechas en formato **ISO** (`2024-03-15`, año-mes-día) se ordenan bien incluso como texto. `15/03/2024` no: el 15 de marzo quedaría antes que el 2 de enero.

:::tip ¿Por qué DECIMAL para el dinero?
Las computadoras guardan los decimales "normales" (`REAL`, `DOUBLE`) en binario, y algunos números no se pueden representar exactos: en Python, `0.1 + 0.2` da `0.30000000000000004`. Para un cálculo científico da igual; para la contabilidad de un banco, no. `DECIMAL(12, 2)` guarda exactamente dos decimales.
:::

Puedes preguntarle a la base de qué tipo es cada valor con `typeof` (una función de SQLite):

```sql
SELECT cliente_id, typeof(cliente_id) AS tipo_id,
       nombre,     typeof(nombre)     AS tipo_nombre,
       telefono,   typeof(telefono)   AS tipo_telefono
FROM clientes
WHERE telefono IS NULL
LIMIT 3;
```

:::cuidado NULL no es cero ni texto vacío
`NULL` significa **ausencia de valor**. Un cliente sin teléfono tiene `telefono = NULL`, que es distinto de `telefono = ''` (texto vacío) o de `0`. Le dedicaremos una lección entera.
:::

## Datos sucios: lo que llega de verdad

En los ejemplos de los libros los datos vienen perfectos. En la vida real, no. La tabla `clientes_crudo` tiene los clientes **como llegan** del sistema de origen, antes de limpiarlos:

```sql
SELECT registro_id, cliente_id, nombre, email, ciudad, fecha_carga
FROM clientes_crudo
WHERE cliente_id IN (524, 1638)
ORDER BY cliente_id, fecha_carga;
```

Mira lo que aparece: el mismo cliente (`1638`) cargado **cinco veces**: una con el nombre y el email en MAYÚSCULAS, otra con espacios sobrantes en el nombre y otra con la ciudad en minúsculas. Y otro cliente (`524`) llegó **sin email**. Limpiar esto (quitar duplicados, normalizar textos, decidir qué hacer con los vacíos) es una parte enorme del trabajo, y lo vas a practicar en SQL, Python, PySpark y dbt.

## Formatos de archivo

Los datos viajan en archivos. Estos son los que vas a ver siempre:

**CSV** (*comma-separated values*): texto plano, una fila por línea, valores separados por comas. Simple y universal (lo abre Excel, cualquier lenguaje y cualquier base de datos), pero:

- **No guarda tipos**: todo es texto. `0012` ¿es un código o el número 12?
- Si un valor tiene una coma adentro, tiene que ir **entre comillas**: `"Teclado, inalámbrico"`. Si alguien se olvida, las columnas se corren.
- No dice qué **codificación** usa (UTF-8, Latin-1). Si se lee con la equivocada, `Perú` aparece como `PerÃº`.
- Es **lento** para grandes volúmenes: para leer una columna hay que leer el archivo entero.

```text
cliente_id,nombre,pais
1,Lucía,España
2,Mateo,México
```

**JSON**: texto con estructura anidada (objetos `{}` y listas `[]`). Es el idioma de las APIs web. Permite cosas que un CSV no puede, como una **lista** de intereses o un **objeto** dirección dentro de cada cliente:

```json
{"cliente_id": 1, "nombre": "Lucía", "intereses": ["running", "tecnología"], "direccion": {"ciudad": "Madrid"}}
```

Para analizarlo, casi siempre hay que **aplanarlo** en columnas: `direccion.ciudad` pasa a ser una columna `ciudad`, y cada interés, una fila en otra tabla. Lo vas a hacer en Python y PySpark.

**Parquet**: formato **binario y columnar**. Guarda los tipos, comprime muchísimo y permite leer solo las columnas que necesitas. Es el estándar en big data (Spark, Databricks, BigQuery, Athena). No se puede abrir con un editor de texto: se lee con herramientas de datos.

**Delta Lake** (y sus primos **Iceberg** y **Hudi**): Parquet + un registro de transacciones. Agrega actualizaciones seguras (ACID), historial de versiones (*time travel*) y `MERGE`. Lo verás en Spark y Databricks.

| | CSV | JSON | Parquet | Delta |
|---|---|---|---|---|
| ¿Lo lee un humano? | Sí | Sí | No | No |
| ¿Guarda tipos? | No | Algunos | Sí | Sí |
| Datos anidados | No | Sí | Sí | Sí |
| Tamaño (los mismos datos) | 100 % | ~150 % | ~10–25 % | ~10–25 % |
| Leer una sola columna | Lee todo | Lee todo | Solo esa columna | Solo esa columna |
| Uso típico | Intercambio, exportes | APIs, eventos | Analítica | Lakehouse |

:::analogia ¿Por qué "columnar" es más rápido?
Imagina una biblioteca. En CSV cada libro es un cliente con todos sus datos; para saber "el país de todos", abres todos los libros. En Parquet hay un libro por columna: para saber el país de todos, abres **un solo libro**.
:::

## Dónde viven los datos

| Sistema | Para qué | Ejemplos |
|---|---|---|
| **Base de datos transaccional (OLTP)** | La app del día a día: registrar una venta, actualizar un stock. Muchas operaciones pequeñas y rápidas | PostgreSQL, MySQL, SQL Server |
| **Data warehouse (OLAP)** | Análisis: "ventas por mes de los últimos 5 años". Pocas consultas, pero enormes | Snowflake, BigQuery, Redshift, Synapse, Databricks SQL |
| **Data lake** | Archivos (CSV, JSON, Parquet) de cualquier tipo, baratos, en la nube | Amazon S3, Azure Data Lake Storage, Google Cloud Storage |
| **Lakehouse** | Lo mejor de ambos: archivos baratos en el lake con la fiabilidad de un warehouse (gracias a Delta o Iceberg) | Databricks, BigQuery + BigLake, Snowflake con Iceberg |

¿Por qué no se analiza directo en la base de la app? Porque una consulta de "ventas de los últimos 5 años" lee millones de filas, y mientras tanto la app, que necesita responder en milisegundos para que los clientes puedan comprar, se pone lenta. Por eso los datos se **copian** a un sistema pensado para analizar. Esa copia es, justamente, el pipeline que construye un ingeniero de datos.

| | OLTP (la app) | OLAP (el análisis) |
|---|---|---|
| Operación típica | "Guarda este pedido" | "Suma las ventas de 2024 por país" |
| Filas por operación | Una o pocas | Millones |
| Cuántas operaciones | Miles por segundo | Pocas, pero pesadas |
| Cómo guarda | Por filas | Por columnas |

## Nuestros datos: 8 empresas

En todo el curso usamos empresas ficticias con datos realistas. La principal es **Tienda Andina**, un e-commerce con 12 tablas: clientes, productos, categorías, pedidos, detalle de pedidos, pagos, empleados, departamentos, eventos web y más. Además hay **7 empresas más** para los casos de negocio: un banco, una plataforma de streaming, una app de viajes, una clínica, un SaaS, una aerolínea y una empresa de logística. En total son 38 tablas con más de 200.000 filas. Puedes explorarlas en [Los datos](#/datos).

## Ejercicios

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
