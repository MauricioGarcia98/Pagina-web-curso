---
titulo: Spark SQL y el catálogo
nivel: Intermedio
duracion: 25
resumen: Vistas temporales, tablas administradas y externas, Unity Catalog y SQL desde PySpark.
---

Todo lo que aprendiste de SQL funciona en Spark. **Spark SQL** y la API de DataFrames comparten el mismo optimizador: elige el que haga tu código más claro (¡y puedes mezclarlos!).

### ¿SQL o DataFrames? El mismo motor

Esta es la idea más tranquilizadora del módulo: una consulta escrita en SQL y la misma lógica escrita con la API de DataFrames **producen exactamente el mismo plan** de ejecución. Ambas pasan por **Catalyst**, el optimizador de Spark:

```text
spark.sql("SELECT …")  ─┐
                         ├─▶  plan lógico  ─▶  Catalyst optimiza  ─▶  plan físico  ─▶  ejecución en el cluster
df.filter(…).groupBy(…) ─┘
```

No hay uno "más rápido". La elección es de **claridad y de equipo**:

| Usa SQL cuando… | Usa la API de DataFrames cuando… |
|---|---|
| La lógica es una consulta clásica (joins, agregaciones) | Necesitas construir la consulta dinámicamente (columnas en una lista, bucles, parámetros) |
| Trabajas con analistas que saben SQL | Quieres funciones reutilizables y testeables (`def limpiar(df) -> df`) |
| Es un modelo de dbt o un dashboard | Mezclas con lógica de Python (UDFs, validaciones) |

Y se pueden mezclar libremente: `spark.sql(…)` devuelve un DataFrame, y un DataFrame se puede registrar como vista para consultarlo con SQL.

## Vistas temporales: SQL sobre un DataFrame

```python norun
pedidos = spark.read.parquet("/lake/silver/pedidos")
pedidos.createOrReplaceTempView("pedidos")        # visible solo en esta SparkSession

top = spark.sql("""
    SELECT canal, COUNT(*) AS n
    FROM pedidos
    WHERE estado = 'entregado'
    GROUP BY canal
    ORDER BY n DESC
""")
top.show()
```

`createOrReplaceTempView("pedidos")` no copia datos: solo le pone un **nombre** al DataFrame para que SQL pueda referirse a él. La vista existe mientras dure la sesión de Spark (en Databricks, mientras el notebook esté conectado).

## El catálogo: dónde viven los nombres de las tablas

Un **catálogo** (o *metastore*) es la "guía telefónica" de las tablas: para cada nombre (`main.ventas.pedidos`) guarda **dónde** están los archivos, en qué **formato**, con qué **esquema** y quién tiene **permiso**. Spark consulta el catálogo cada vez que escribes `spark.table("…")` o un `FROM` en SQL. Es el mismo papel que cumplen el Glue Data Catalog en AWS y el catálogo de BigQuery en Google Cloud.

## Tablas en el catálogo

| Tipo | Qué es | Al hacer DROP |
|---|---|---|
| **Vista temporal** | Un nombre para un DataFrame en la sesión actual | Desaparece al cerrar la sesión |
| **Tabla administrada** (*managed*) | Spark/Databricks gestiona datos y metadatos | Se borran datos y metadatos |
| **Tabla externa** (*external*) | Los datos viven en una ruta tuya (`LOCATION`) | Solo se borran los metadatos |
| **Vista** | Consulta guardada en el catálogo | Se borra la definición |

```sql norun
CREATE TABLE IF NOT EXISTS main.ventas.pedidos (
  pedido_id BIGINT, cliente_id BIGINT, fecha_pedido DATE, estado STRING, canal STRING
) USING DELTA;

CREATE TABLE main.ventas.pedidos_ext
USING DELTA LOCATION 'abfss://lake@cuenta.dfs.core.windows.net/silver/pedidos';

CREATE OR REPLACE VIEW main.ventas.v_entregados AS
SELECT * FROM main.ventas.pedidos WHERE estado = 'entregado';
```

## Unity Catalog: el espacio de nombres de tres niveles

En Databricks con **Unity Catalog** las tablas se nombran `catalogo.esquema.tabla` (por ejemplo `main.ventas.pedidos` o `prod.gold.ventas_diarias`). Unity Catalog centraliza **permisos**, **linaje** (qué tabla sale de cuál) y **auditoría** para todos los workspaces.

## Funciones útiles de Spark SQL

```sql norun
SELECT
  date_trunc('MONTH', fecha_pedido)               AS mes,
  date_format(fecha_pedido, 'yyyy-MM')            AS mes_txt,
  datediff(current_date(), fecha_pedido)          AS dias,
  concat_ws(' ', nombre, apellido)                AS nombre_completo,
  collect_list(producto_id)                       AS productos,      -- agrega en un array
  size(collect_set(canal))                        AS canales_distintos,
  percentile_approx(monto, 0.5)                   AS mediana,
  try_cast(codigo AS INT)                         AS codigo_num      -- NULL en vez de error
FROM ...
```

:::ejercicio pyspark
Registra el DataFrame de la tabla `clientes` como vista temporal `cli` y, con `spark.sql`, cuenta los clientes por `pais` y `segmento`. Guarda el DataFrame resultante en `resultado` con columnas `pais`, `segmento`, `n`.
```python inicial
spark.table("clientes").createOrReplaceTempView("cli")
# resultado = spark.sql(...)
```
```python solucion
spark.table("clientes").createOrReplaceTempView("cli")
resultado = spark.sql("""
    SELECT pais, segmento, COUNT(*) AS n
    FROM cli
    GROUP BY pais, segmento
""")
```
:::

:::ejercicio pyspark
Con `spark.sql`, calcula los **5 productos con más unidades vendidas** uniendo las tablas `detalle_pedidos` y `productos` (ya están en el catálogo, sin crear vistas). Columnas: `nombre`, `unidades`. Ordena por unidades descendente y, si empatan, por nombre.
```python solucion
resultado = spark.sql("""
    SELECT p.nombre, SUM(d.cantidad) AS unidades
    FROM detalle_pedidos d JOIN productos p ON p.producto_id = d.producto_id
    GROUP BY p.nombre
    ORDER BY unidades DESC, p.nombre
    LIMIT 5
""")
```
:::

:::ejercicio quiz
Borras con `DROP TABLE` una tabla **externa**. ¿Qué pasa con sus archivos en el data lake?

- [ ] Se borran
- [x] Siguen ahí: solo se borra la definición en el catálogo
- [ ] Se mueven a la papelera
- [ ] Se convierten en una vista
:::
