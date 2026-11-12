---
titulo: BigQuery por dentro - bytes procesados, particiones, clustering y costos
nivel: Intermedio
duracion: 45
resumen: Recorrido por BigQuery y su consola - proyecto, datasets y tablas, el editor con su validador de bytes, por qué se cobra por datos procesados y no por tiempo, particiones y clustering, la caché de resultados, cargas desde archivo, el historial de jobs y los hábitos que bajan la factura. Con las diferencias del dialecto GoogleSQL.
objetivos: Explicar qué cobra BigQuery en el modelo on-demand y leer la estimación antes de ejecutar | Reducir los bytes de una consulta eligiendo columnas y filtrando por la partición | Crear tablas con PARTITION BY y CLUSTER BY y saber cuándo conviene cada uno | Usar la caché, la vista previa y el filtro de partición obligatorio para no gastar de más | Reconocer las funciones propias de GoogleSQL
prerrequisitos: sql-select
autoevaluacion: ¿Sabes por qué SELECT * es caro en BigQuery aunque tenga LIMIT 10? | ¿Sabes qué muestra el validador del editor? | ¿Sabes qué pasa si filtras con EXTRACT(YEAR FROM fecha) en una tabla particionada por fecha? | ¿Sabes en qué se diferencia particionar de hacer clustering? | ¿Sabes cuándo una consulta sale de la caché?
---

:::tip Practícalo mientras lees
Abre [BigQuery de práctica](#/bigquery). Corre en tu navegador sobre DuckDB con la base de la tienda del curso: no necesitas cuenta de Google Cloud ni tarjeta. Calcula los bytes como lo hace BigQuery, pero no es BigQuery: al final está lo que cambia. Los **🎯 Retos** siguen el orden de esta lección.
:::

:::analogia En palabras simples
Imagina una biblioteca donde no pagas por entrar ni por el tiempo que te quedas: pagas por **cada página que el bibliotecario tiene que leer** para responder tu pregunta. Si pides "todo sobre los pedidos", lee todos los libros. Si pides "el canal de los pedidos de junio", va directo al estante de junio y lee solo esa columna. BigQuery cobra así: por lo que lee, no por lo que te devuelve.
:::

## Qué es BigQuery

**BigQuery** es el data warehouse de Google Cloud. Es *serverless*: no eliges máquinas ni tamaños; escribes la consulta y Google reparte el trabajo entre miles de procesadores.

La organización es de tres niveles:

| Nivel | Qué es | Ejemplo |
|---|---|---|
| **Proyecto** | La unidad de facturación y permisos | `tienda-andina-dev` |
| **Dataset** | Agrupa tablas y define la región | `tienda` |
| **Tabla** | Los datos | `pedidos` |

El nombre completo va entre comillas invertidas: `` `tienda-andina-dev.tienda.pedidos` ``. Dentro del mismo proyecto alcanza con `tienda.pedidos`.

## Cómo se cobra

Hay dos modelos de cómputo:

- **On-demand**: pagas por los **bytes que procesa cada consulta** (unos USD 6,25 por TiB; el primer TiB de cada mes es gratis). Es el modelo por defecto y el que simula la réplica.
- **Por capacidad** (ediciones): pagas por *slots* (unidades de cómputo) reservados, uses lo que uses. Conviene con consumo alto y parejo.

El almacenamiento se paga aparte, por GB al mes.

En on-demand, lo que importa no es cuánto tarda la consulta ni cuántas filas devuelve, sino **cuántos datos tuvo que leer**. Y BigQuery guarda cada columna por separado, así que solo lee las columnas que la consulta nombra.

## El validador: saber el costo antes de ejecutar

Arriba a la derecha del editor aparece un mensaje verde:

> ✓ This query will process **198 KB** when run.

Es un **dry run**: BigQuery analiza la consulta y calcula los bytes sin ejecutarla y sin cobrar. Mirarlo antes de pulsar **Run** es el hábito más importante de BigQuery.

Prueba estas tres consultas en la réplica y mira solo el validador:

```sql norun
SELECT * FROM tienda.pedidos;                    -- todas las columnas
SELECT canal, estado FROM tienda.pedidos;        -- dos columnas
SELECT * FROM tienda.pedidos LIMIT 10;           -- ¿LIMIT ayuda?
```

La tercera procesa lo mismo que la primera: **`LIMIT` recorta el resultado, no lo que se lee**. Para mirar cómo es una tabla, usa la pestaña **Preview**, que es gratis.

Un caso especial: `SELECT COUNT(*) FROM tienda.pedidos` procesa **0 B**, porque la cantidad de filas está en los metadatos de la tabla.

## Particiones

Una tabla **particionada** está dividida en bloques según el valor de una columna, casi siempre una fecha. Si la consulta filtra por esa columna, BigQuery ni abre las particiones que no hacen falta.

```sql norun
CREATE TABLE analitica.ventas (
  venta_id INT64,
  monto NUMERIC,
  pais STRING,
  fecha DATE
)
PARTITION BY fecha
OPTIONS (require_partition_filter = TRUE);
```

En la réplica, `tienda.pedidos` ya viene particionada por `fecha_pedido`. Compara:

```sql norun
SELECT canal FROM tienda.pedidos;                                      -- toda la tabla
SELECT canal FROM tienda.pedidos WHERE fecha_pedido >= '2024-06-01';   -- solo esas particiones
SELECT canal FROM tienda.pedidos WHERE EXTRACT(YEAR FROM fecha_pedido) = 2024;  -- ¡toda la tabla!
```

La última no aprovecha la partición: al envolver la columna en una función, BigQuery no puede saber qué particiones descartar. El filtro tiene que ser **directo sobre la columna**.

Con `require_partition_filter = TRUE`, una consulta que olvide el filtro se rechaza con *Cannot query over table … without a filter … that can be used for partition elimination*. Es la protección estándar para tablas grandes.

## Clustering

El **clustering** ordena los datos dentro de cada partición según hasta cuatro columnas. Cuando filtras por la primera, BigQuery salta los bloques que no la contienen.

```sql norun
CREATE TABLE analitica.eventos
PARTITION BY fecha
CLUSTER BY plataforma, evento
AS SELECT * FROM analitica.eventos_app;
```

| | Partición | Clustering |
|---|---|---|
| Sobre qué | Una columna (fecha o entero) | Hasta 4 columnas |
| Cuándo conviene | Casi todas las consultas filtran por fecha | Filtras seguido por columnas con muchos valores distintos |
| ¿La estimación lo refleja? | Sí | No: el validador da el máximo; lo cobrado al final es menor |

Se usan juntos: partición por fecha y clustering por lo que más se filtra.

## La caché de resultados

Si ejecutas exactamente la misma consulta y las tablas no cambiaron, BigQuery devuelve el resultado guardado (hasta 24 horas): **0 B procesados y sin costo**. En *Job information* aparece como *results cached*. No aplica si la consulta usa funciones que cambian, como `CURRENT_DATE()` o `RAND()`.

## Cargar datos

En un dataset, **Create table** crea una tabla desde un archivo (CSV, JSON por líneas, Parquet, Avro) con el esquema detectado automáticamente. Es un *load job* y **no tiene costo de consulta**: solo pagas el almacenamiento. Para datos que llegan todo el tiempo existen la Storage Write API y las transferencias programadas.

## Job history

Cada consulta o carga es un **job**. En **Job history** ves quién lo corrió, cuántos bytes procesó y facturó, cuánto tardó y si salió de la caché. Es el primer lugar donde se buscan las consultas caras; en un proyecto real se consulta también con `INFORMATION_SCHEMA.JOBS`.

## El dialecto: GoogleSQL

| GoogleSQL | Qué hace |
|---|---|
| `` `proyecto.dataset.tabla` `` | Nombres con comillas invertidas |
| `INT64`, `FLOAT64`, `STRING`, `BOOL`, `NUMERIC` | Los tipos |
| `SAFE_DIVIDE(a, b)` | Divide y devuelve `NULL` si `b` es 0 |
| `COUNTIF(condición)` | Cuenta las filas que cumplen |
| `DATE_TRUNC(fecha, MONTH)` | Primer día del mes (el orden de los argumentos es al revés que en PostgreSQL) |
| `DATE_DIFF(fin, inicio, DAY)` | Días entre dos fechas |
| `DATE_ADD(fecha, INTERVAL 7 DAY)` | Sumar a una fecha |
| `FORMAT_DATE('%Y-%m', fecha)` | Fecha a texto |
| `SELECT * EXCEPT (col)` | Todas las columnas menos algunas |
| `SAFE_CAST(x AS INT64)` | Convierte y devuelve `NULL` si no puede |
| `UPDATE` / `DELETE` | Siempre con `WHERE` (si no, error) |

## Un flujo completo

1. En **Studio**, ejecuta la consulta de ejemplo y lee *Job information*.
2. Cambia las columnas por `*` y mira el validador. Vuelve a dos columnas.
3. Ejecuta la misma consulta otra vez: sale de la caché.
4. Crea el dataset `analitica` y, con **Create table**, carga el archivo de ejemplo particionado por `fecha`.
5. Consulta la tabla filtrando por `fecha` y mira qué porcentaje se leyó.
6. Crea una tabla con `require_partition_filter` y comprueba que la consulta sin filtro se rechaza.
7. Abre **Costos**: tus consultas más caras y cuánto costarían a tamaño de empresa.

## Qué tiene la réplica y qué no

| En la réplica | Todavía no |
|---|---|
| Editor con validador de bytes, resultados y *Job information* | Pestañas *Execution details* y *Execution graph*, consultas programadas |
| Datasets, tablas, vistas, esquema, detalles y Preview | Tablas externas, BigLake, vistas materializadas, snapshots y time travel |
| `PARTITION BY`, `CLUSTER BY`, `require_partition_filter` | Particiones por ingesta y por rango de enteros, vencimiento de particiones |
| Caché de resultados, historial de jobs, página de costos | Reservas y ediciones (slots), `INFORMATION_SCHEMA`, cuotas |
| Carga de CSV y JSON con esquema automático | Parquet/Avro, streaming, Data Transfer Service |
| GoogleSQL: las funciones más usadas | `STRUCT`/`ARRAY` avanzados, BigQuery ML, funciones remotas |

Los bytes se calculan como en BigQuery (8 por número o fecha, 2 más el largo por texto), pero las tablas de práctica son chicas: la página **Costos** proyecta cuánto costaría cada consulta sobre tablas diez mil veces más grandes.

:::ejercicio quiz
`SELECT * FROM ventas LIMIT 10` sobre una tabla de 2 TB sin clustering. ¿Cuánto procesa?
- [ ] Solo las 10 filas que devuelve
- [x] Los 2 TB: LIMIT recorta el resultado, no lo que se lee
- [ ] Nada, porque LIMIT usa la caché
- [ ] 10 MB, el mínimo
:::

:::ejercicio quiz
El validador dice *This query will process 1.2 GB when run*. ¿Qué significa?
- [ ] Que la consulta ya se ejecutó y costó 1,2 GB
- [x] Que es una estimación (dry run): todavía no se ejecutó ni se cobró nada
- [ ] Que el resultado va a pesar 1,2 GB
- [ ] Que la tabla pesa 1,2 GB en total
:::

:::ejercicio quiz
`pedidos` está particionada por `fecha_pedido`. ¿Cuál de estas consultas lee menos datos?
- [ ] `WHERE EXTRACT(YEAR FROM fecha_pedido) = 2025`
- [ ] `WHERE FORMAT_DATE('%Y', fecha_pedido) = '2025'`
- [x] `WHERE fecha_pedido >= '2025-01-01' AND fecha_pedido < '2026-01-01'`
- [ ] Las tres leen lo mismo
:::

:::ejercicio quiz
Ejecutas la misma consulta dos veces seguidas y las tablas no cambiaron. ¿Qué pasa la segunda vez?
- [ ] Se cobra la mitad
- [ ] Se cobra lo mismo
- [x] Sale de la caché: 0 B procesados y sin costo
- [ ] BigQuery la rechaza por duplicada
:::

:::ejercicio quiz
Una tabla de eventos se consulta casi siempre por fecha y, dentro de la fecha, por `pais`. ¿Qué diseño conviene?
- [ ] Sin partición, con un índice por país
- [ ] Partición por `pais` y clustering por fecha
- [x] Partición por fecha y clustering por `pais`
- [ ] Una tabla distinta por cada país
:::

:::ejercicio quiz
Quieres ver las primeras filas de una tabla de 500 GB para entender qué tiene. ¿Qué es lo más barato?
- [ ] `SELECT * FROM tabla LIMIT 100`
- [x] La pestaña **Preview** de la tabla, que no ejecuta una consulta
- [ ] `SELECT * FROM tabla WHERE 1 = 1`
- [ ] Exportar la tabla a CSV
:::
