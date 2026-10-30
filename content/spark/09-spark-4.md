---
titulo: "Spark 4: qué cambió y por qué te importa"
nivel: Avanzado
duracion: 50
resumen: Lo nuevo de Spark 4 (la versión estable es la 4.2) explicado desde cero con la documentación oficial - el modo ANSI activado por defecto y las funciones try_, Spark Connect, el tipo VARIANT para JSON, la sintaxis SQL con pipes y Spark Declarative Pipelines.
objetivos: Explicar qué cambia el modo ANSI y corregir consultas que fallan por él | Usar try_cast, try_divide y try_to_number para datos sucios | Explicar la arquitectura cliente-servidor de Spark Connect y sus límites | Guardar y consultar JSON con VARIANT | Leer y escribir consultas con la sintaxis pipe | Reconocer un pipeline declarativo
prerrequisitos: spark-arquitectura | spark-spark-sql
autoevaluacion: ¿Sabes por qué una consulta que funcionaba en Spark 3 falla en Spark 4? | ¿Sabes cuándo usar try_cast? | ¿Sabes qué no se puede hacer con Spark Connect? | ¿Sabes qué ventaja tiene VARIANT frente a guardar el JSON como texto?
---

:::escenario
El equipo actualizó el clúster de Spark 3.5 a Spark 4 un viernes. El lunes, el job de ventas falló con un error que nunca habían visto: `CAST_INVALID_INPUT: The value 'N/A' of the type "STRING" cannot be cast to "INT"`. El código no cambió. Lo que cambió fue una regla de Spark: ahora, cuando un dato no se puede convertir, Spark **avisa** en lugar de inventar un `NULL` en silencio. Esta lección explica ese cambio y las otras novedades que vas a encontrar en los proyectos actuales.
:::

## Las versiones, en una tabla

Spark sale con una versión grande (*major*) cada varios años y versiones menores varias veces por año. Databricks, EMR, Dataproc y Fabric incluyen versiones concretas de Spark en sus *runtimes*.

| Versión | Año | Lo más importante |
|---|---|---|
| Spark 3.0 | 2020 | Adaptive Query Execution (AQE) |
| Spark 3.4 | 2023 | Primera versión de Spark Connect |
| Spark 3.5 | 2023 | La última de la línea 3; muy usada todavía |
| **Spark 4.0** | 2025 | Modo ANSI por defecto, VARIANT, sintaxis pipe, Spark Connect maduro |
| Spark 4.1 | 2025 | Spark Declarative Pipelines |
| **Spark 4.2** | 2026 | La versión estable actual |

## 1. El modo ANSI: errores en vez de NULL silenciosos

**ANSI** es el organismo que publica el estándar del lenguaje SQL. Durante años Spark siguió las reglas de Hive (un sistema anterior), que eran "permisivas": si algo no se podía calcular, devolvía `NULL` y seguía. Desde Spark 4.0, la configuración `spark.sql.ansi.enabled` vale `true` por defecto: Spark sigue el estándar y **lanza un error** ante una operación inválida.

| Operación | Spark 3 (sin ANSI) | Spark 4 (ANSI) |
|---|---|---|
| `CAST('N/A' AS INT)` | `NULL` | Error `CAST_INVALID_INPUT` |
| `10 / 0` | `NULL` | Error `DIVIDE_BY_ZERO` |
| Un entero que se desborda (`2147483647 + 1` en `INT`) | Un número negativo sin sentido | Error de desbordamiento |
| `element_at(array, 10)` en un arreglo de 3 elementos | `NULL` | Error de índice fuera de rango |

¿Por qué es mejor? Porque un `NULL` silencioso es un **dato perdido que nadie ve**: si 30.000 montos tenían el texto `"1.200,50"` y Spark los convertía en `NULL`, la suma de ventas daba de menos y ningún test lo notaba. Con ANSI, el job falla y te obliga a decidir qué hacer con esos datos.

### Cómo manejar datos sucios a propósito: las funciones `try_`

Si **sabes** que una columna trae basura y quieres el comportamiento viejo **solo ahí**, usas las funciones `try_`, que devuelven `NULL` en lugar de fallar:

```sql norun
SELECT
  try_cast(monto_texto AS DECIMAL(12, 2))        AS monto,          -- NULL si no es un número
  try_divide(ingresos, visitas)                  AS ingreso_por_visita, -- NULL si visitas = 0
  try_to_number(precio_texto, '999,999.99')      AS precio,         -- NULL si no respeta el formato
  try_element_at(etiquetas, 5)                   AS quinta_etiqueta
FROM bronze.ventas_crudas;
```

En PySpark es lo mismo: `F.try_divide(...)`, `F.col("x").try_cast("int")` o `F.expr("try_cast(x AS INT)")`.

La buena práctica es usar `try_` en la capa **silver** (donde se limpian los datos) y además **contar** cuántos `NULL` se generaron, para que el problema no quede escondido:

```sql norun
SELECT COUNT(*) AS filas,
       COUNT(*) FILTER (WHERE monto_texto IS NOT NULL AND try_cast(monto_texto AS DECIMAL(12,2)) IS NULL) AS montos_invalidos
FROM bronze.ventas_crudas;
```

:::cuidado Desactivar ANSI no es la solución
Se puede volver al comportamiento anterior con `spark.conf.set("spark.sql.ansi.enabled", "false")`, y es tentador hacerlo el lunes del escenario para "que vuelva a andar". Es solo un parche temporal: esconde el problema de calidad que el error está mostrando. La solución es encontrar las filas malas y tratarlas con `try_cast` de forma explícita.
:::

## 2. Spark Connect: Spark como un servicio

En la lección de arquitectura viste que una aplicación de Spark tiene un **driver** (el proceso que planifica) y **executors** (los que procesan). Clásicamente, tu código Python corre **dentro** del mismo proceso que el driver. Spark Connect (desde 3.4, maduro en 4.0) separa las dos cosas, según la documentación oficial:

1. Tu código usa un **cliente liviano** (`pip install pyspark-client`), que puede correr en tu computadora, en un notebook o dentro de una aplicación web.
2. Cada operación de DataFrame se convierte en un **plan lógico sin resolver** (la descripción de lo que quieres hacer, no el resultado) y se envía al servidor por la red usando **gRPC**.
3. El servidor de Spark recibe el plan, lo optimiza y lo ejecuta como siempre en el clúster.
4. Los resultados vuelven al cliente en lotes de **Apache Arrow** (un formato columnar muy rápido de transferir).

```python norun
from pyspark.sql import SparkSession

# en lugar de arrancar Spark dentro de tu proceso, te conectas a un servidor remoto
spark = SparkSession.builder.remote("sc://servidor-spark:15002").getOrCreate()

df = spark.read.table("ventas")          # la API es la misma de siempre
df.groupBy("canal").count().show()       # el plan viaja al servidor; el resultado vuelve
```

Ventajas: el cliente es chico y no necesita Java; si tu programa se cae, el clúster sigue; y varias personas pueden compartir el mismo servidor de forma aislada. Es lo que usan por dentro **Databricks Connect**, el cómputo *serverless* de Databricks y los notebooks modernos.

Límites que hay que conocer (también de la documentación):

- **No hay RDDs**: Spark Connect solo entiende DataFrames y SQL. `df.rdd`, `sc.parallelize` y `SparkContext` no existen en el cliente.
- No puedes tocar la JVM del driver (`df._jdf`, `spark._jvm`): librerías viejas que lo hacen dejan de funcionar.
- Algunas configuraciones del clúster no se pueden cambiar desde la sesión.

Por eso el código moderno se escribe siempre con la API de DataFrames o SQL, nunca con RDDs.

## 3. VARIANT: JSON sin pelear con los esquemas

Muchos datos llegan como JSON: eventos de una app, respuestas de APIs. Hasta ahora había dos opciones malas:

- Guardarlo como **texto** (`STRING`) y parsearlo en cada consulta con `from_json` o `get_json_object`: lento, porque se vuelve a leer el texto cada vez.
- Convertirlo a un **STRUCT** con un esquema fijo: rápido, pero si mañana el JSON trae un campo nuevo, hay que cambiar el esquema y las cargas fallan.

Spark 4 agregó el tipo **VARIANT**: guarda el JSON en un formato binario eficiente, **sin** esquema fijo, y permite consultar sus campos directamente.

```sql norun
CREATE TABLE eventos (id BIGINT, datos VARIANT);

INSERT INTO eventos
SELECT 1, parse_json('{"tipo": "compra", "monto": 49.9, "items": [{"sku": "A1"}, {"sku": "B7"}]}');

SELECT
  datos:tipo::string                AS tipo,      -- el operador : navega el JSON
  datos:monto::decimal(10, 2)       AS monto,     -- :: convierte al tipo que necesitas
  datos:items[0].sku::string        AS primer_sku
FROM eventos;
```

- `parse_json(texto)` convierte el texto JSON a VARIANT (con `try_parse_json` si puede venir mal formado).
- `datos:campo` lee un campo; `[0]` entra en un arreglo; `.sku` entra en un objeto.
- `::tipo` convierte el valor al tipo SQL que necesitas.
- Si un campo no existe en una fila, el resultado es `NULL`, sin error: el esquema puede variar fila por fila.

Úsalo en **bronze** para guardar el JSON tal como llega sin perder nada, y extrae a columnas normales en **silver** los campos que el negocio usa siempre.

## 4. La sintaxis pipe: SQL que se lee de arriba hacia abajo

Un `SELECT` clásico se **escribe** en un orden (`SELECT … FROM … WHERE … GROUP BY`) pero se **ejecuta** en otro (primero `FROM`, luego `WHERE`, luego `GROUP BY`, y recién al final `SELECT`). Con varias subconsultas anidadas, leerlo es un ejercicio de paciencia. Spark 4 agregó la **sintaxis pipe** (`|>`), donde cada línea es un paso aplicado al resultado del anterior, en el orden en que ocurre:

```sql norun
-- SQL clásico
SELECT canal, COUNT(*) AS pedidos, ROUND(SUM(total), 2) AS ventas
FROM pedidos
WHERE estado <> 'cancelado'
GROUP BY canal
HAVING COUNT(*) > 100
ORDER BY ventas DESC;

-- La misma consulta con pipes
FROM pedidos
|> WHERE estado <> 'cancelado'
|> AGGREGATE COUNT(*) AS pedidos, ROUND(SUM(total), 2) AS ventas GROUP BY canal
|> WHERE pedidos > 100
|> ORDER BY ventas DESC;
```

Cómo leerla: "parto de `pedidos`, me quedo con los no cancelados, agrupo por canal calculando pedidos y ventas, me quedo con los canales de más de 100 pedidos, ordeno". Detalles:

- Se empieza con `FROM tabla` (o `TABLE tabla`).
- `AGGREGATE … GROUP BY …` reemplaza a `SELECT … GROUP BY`.
- Un `WHERE` después de agregar cumple la función del `HAVING`: no hace falta otra palabra.
- `|> EXTEND expresión AS nombre` agrega una columna sin repetir todas las demás, y `|> SET`, `|> DROP` y `|> AS alias` cambian, quitan o renombran.
- Se puede mezclar: se pueden agregar pasos `|>` al final de cualquier consulta normal.

Es opcional: la sintaxis clásica sigue funcionando y es la que vas a ver más. Pero para consultas largas de exploración, los pipes se parecen mucho a encadenar métodos de un DataFrame (`df.filter(...).groupBy(...).agg(...)`).

## 5. Spark Declarative Pipelines: decir qué tablas quieres, no cómo construirlas

En un pipeline "imperativo" tú escribes los pasos: leo esto, transformo, escribo en tal tabla, en este orden, y si falla vuelvo a intentar. En un pipeline **declarativo** describes **qué tablas deben existir y de qué consulta salen**, y el motor se ocupa del orden, de las dependencias, de los reintentos y de la ejecución incremental. Spark 4.1 incorporó este enfoque como **Spark Declarative Pipelines (SDP)**; es el mismo modelo que Databricks ofrece como **Lakeflow Declarative Pipelines** (antes Delta Live Tables).

```python norun
from pyspark import pipelines as dp
from pyspark.sql import functions as F

@dp.table                                   # tabla de streaming: procesa solo lo nuevo
def bronze_pedidos():
    return spark.readStream.format("json").load("/lago/landing/pedidos/")

@dp.materialized_view                       # vista materializada: se recalcula cuando cambia el origen
def ventas_por_dia():
    return (spark.read.table("bronze_pedidos")
              .groupBy(F.to_date("fecha").alias("dia"))
              .agg(F.sum("total").alias("ventas")))
```

- Cada función decorada **define** una tabla: el nombre de la tabla es el nombre de la función.
- `@dp.table` con una lectura `readStream` crea una **tabla de streaming** (incremental). `@dp.materialized_view` con una lectura normal crea una **vista materializada**.
- No hay `write` ni orden de ejecución: SDP ve que `ventas_por_dia` lee `bronze_pedidos` y construye primero la otra. Es la misma idea del `ref()` de dbt.
- Se ejecuta con la línea de comandos: `spark-pipelines init` crea el proyecto, `spark-pipelines dry-run` valida el grafo sin escribir datos y `spark-pipelines run` lo ejecuta.

:::errores
- **Actualizar a Spark 4 sin probar los jobs**: el modo ANSI hace fallar consultas que antes "funcionaban" devolviendo NULL. Antes de migrar, corre los jobs en un entorno de prueba con datos reales.
- **Desactivar ANSI globalmente** para que vuelva a andar: esconde datos rotos. Usa `try_cast` donde corresponde y cuenta los inválidos.
- **Usar RDDs o `df._jdf`** en código nuevo: no funciona en Spark Connect ni en el cómputo serverless.
- **Guardar JSON como STRING y parsearlo en cada consulta**: lento; usa VARIANT o extrae a columnas.
:::

:::trabajo
- Databricks Runtime 17 y posteriores usan Spark 4: si trabajas con Databricks, estas reglas ya te afectan.
- En las migraciones, el trabajo típico de un data engineer es correr los jobs en un entorno con Spark 4, juntar los errores `CAST_INVALID_INPUT` y `DIVIDE_BY_ZERO`, y decidir caso por caso: corregir el origen, usar `try_` o agregar una regla de calidad.
- VARIANT se volvió el estándar para ingerir eventos JSON en bronze, tanto en Spark como en Delta e Iceberg.
:::

:::entrevista "¿Qué cambió con el modo ANSI en Spark 4 y cómo lo manejarías en una migración?"
Desde Spark 4.0 `spark.sql.ansi.enabled` está activado por defecto, así que las operaciones inválidas, como convertir un texto que no es número, dividir por cero o desbordar un entero, lanzan un error en lugar de devolver NULL. Eso evita perder datos en silencio. En una migración correría los jobs en un entorno de prueba, identificaría las consultas que fallan, y para las columnas que sé que traen datos sucios usaría funciones `try_cast` o `try_divide` de forma explícita en silver, contando cuántas filas quedan nulas para monitorearlo. No desactivaría ANSI globalmente salvo como medida temporal.
:::

| Novedad | En una línea |
|---|---|
| Modo ANSI | Operaciones inválidas dan error en vez de NULL |
| `try_cast`, `try_divide` | NULL a propósito, solo donde lo decides |
| Spark Connect | Cliente liviano que envía planes a un servidor de Spark por gRPC; sin RDDs |
| VARIANT | JSON en formato binario, sin esquema fijo, consultable con `:` y `::` |
| Sintaxis pipe | `FROM t \|> WHERE … \|> AGGREGATE …` en el orden en que se ejecuta |
| Declarative Pipelines | Defines tablas con funciones; el motor decide orden y ejecución |

## Ejercicios

:::ejercicio quiz dificultad=Intermedio
Después de migrar a Spark 4, `SELECT CAST(cantidad AS INT) FROM bronze.lineas` falla con `CAST_INVALID_INPUT` porque algunas filas traen `'s/d'`. ¿Cuál es la mejor corrección?

- [ ] `spark.sql.ansi.enabled = false` en todo el clúster
- [x] `try_cast(cantidad AS INT)` en la capa silver y contar cuántas filas quedan NULL para monitorearlas
- [ ] Borrar las filas de bronze
- [ ] Volver a Spark 3.5
:::

:::ejercicio quiz dificultad=Básico
Con el modo ANSI activado, ¿qué devuelve `SELECT 10 / 0`?

- [ ] 0
- [ ] NULL
- [x] Un error `DIVIDE_BY_ZERO` (para obtener NULL se usa `try_divide`)
- [ ] Infinito
:::

:::ejercicio quiz dificultad=Intermedio
Tu librería interna usa `df.rdd.mapPartitions(...)`. ¿Qué pasa si la ejecutas con Spark Connect?

- [ ] Funciona igual
- [x] Falla: Spark Connect solo admite la API de DataFrames y SQL, no RDDs
- [ ] Funciona, pero más lento
- [ ] Se convierte sola a SQL
:::

:::ejercicio quiz dificultad=Intermedio
¿Qué ventaja tiene guardar eventos JSON como VARIANT en bronze frente a un STRUCT con esquema fijo?

- [ ] Ocupa siempre menos espacio
- [x] Acepta campos nuevos o distintos en cada fila sin cambiar el esquema ni romper la carga, y se consulta sin volver a parsear texto
- [ ] Permite usar RDDs
- [ ] Hace que el JSON sea válido aunque esté mal formado
:::

:::ejercicio quiz dificultad=Avanzado
En la sintaxis pipe, ¿qué hace el `WHERE` de `FROM pedidos |> AGGREGATE COUNT(*) AS n GROUP BY canal |> WHERE n > 100`?

- [ ] Filtra los pedidos antes de agrupar
- [x] Filtra el resultado ya agrupado, como un HAVING
- [ ] Da error: después de AGGREGATE no se puede filtrar
- [ ] Ordena por n
:::

:::ejercicio quiz dificultad=Avanzado
En Spark Declarative Pipelines, ¿cómo sabe el motor en qué orden construir las tablas?

- [ ] Por el orden de las funciones en el archivo
- [x] Por las lecturas: si `ventas_por_dia` lee `bronze_pedidos`, construye primero `bronze_pedidos`
- [ ] Hay que escribir las dependencias con `>>`
- [ ] Por orden alfabético
:::
