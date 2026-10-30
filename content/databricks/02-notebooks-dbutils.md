---
titulo: Notebooks, magic commands y dbutils
nivel: Básico
duracion: 50
resumen: Qué es un notebook y dónde corre (serverless, clúster, SQL warehouse), celdas multilenguaje y magic commands, _sqldf, display, widgets y marcadores de parámetro en SQL, dbutils.fs, secretos, %run frente a dbutils.notebook.run y task values entre tareas de un job.
---

## Qué es un notebook

Un **notebook** es un documento interactivo formado por **celdas**. Cada celda tiene código (Python, SQL, Scala o R) o texto (Markdown), y se ejecuta por separado mostrando su resultado justo debajo: una tabla, un gráfico, un mensaje. Todas las celdas comparten el mismo **contexto**: una variable creada en la celda 1 existe en la celda 5.

Es la herramienta ideal para **explorar** datos y desarrollar paso a paso: lees una tabla, la miras, pruebas una transformación, corriges. En Databricks, además, el notebook está conectado a un cluster: el código PySpark de cada celda se ejecuta distribuido.

### Dónde corre tu código: el cómputo

Un notebook no hace nada solo: hay que **conectarlo** (*attach*) a un **cómputo**, el conjunto de máquinas que ejecuta las celdas. En Databricks hay tres tipos que vas a ver todo el tiempo:

| Cómputo | Qué es | Cuándo se usa |
|---|---|---|
| **Serverless** | Databricks administra las máquinas: arranca en segundos y cobras por uso | La opción por defecto en workspaces nuevos para notebooks y jobs |
| **Clúster** (*all-purpose* o de job) | Máquinas virtuales que tú configuras (tamaño, versión del *runtime*, librerías) | Cuando necesitas una configuración especial o librerías que serverless no admite |
| **SQL warehouse** | Cómputo optimizado solo para SQL | Celdas SQL, el editor de SQL, tableros y herramientas de BI |

El **Databricks Runtime** es la "versión" del cómputo: trae una versión de Spark, de Python y de las librerías. Por ejemplo, según las notas de versión oficiales, Databricks Runtime 17.3 LTS trae Spark 4.0, el 18 LTS trae Spark 4.1 y el 19 trae Spark 4.2. Las versiones marcadas **LTS** (*long term support*) se mantienen por más tiempo y son las que se usan en producción.

:::cuidado El orden de ejecución
En un notebook puedes ejecutar las celdas en cualquier orden, y eso es una trampa: una variable puede tener el valor de una ejecución vieja, o depender de una celda que borraste. Antes de dar por terminado un notebook (o de convertirlo en job), ejecútalo **completo de arriba a abajo** en un cluster limpio ("Run all" después de "Clear state"). Para producción, la lógica importante debería vivir en módulos `.py` versionados, y el notebook solo llamarla.
:::

## Magic commands

En un notebook de Python, una celda puede cambiar de lenguaje o de función con un comando “mágico” en la primera línea:

| Comando | Qué hace |
|---|---|
| `%sql` | La celda es SQL (el resultado se ve como tabla) |
| `%python`, `%scala`, `%r` | Cambia el lenguaje de la celda |
| `%md` | Texto en Markdown (documentación) |
| `%run ./otro_notebook` | Ejecuta otro notebook en el mismo contexto (comparte variables y funciones) |
| `%pip install paquete` | Instala una librería en el entorno del notebook |
| `%sh` | Comandos de shell en el driver |
| `%fs ls /Volumes/...` | Atajo de `dbutils.fs` |

```sql norun
%sql
SELECT canal, COUNT(*) AS pedidos
FROM main.ventas.pedidos
GROUP BY canal
```

Dos detalles que la documentación oficial remarca y que confunden al principio:

- **Cada lenguaje tiene su propio intérprete.** Una variable creada en una celda `%python` **no** existe en una celda `%scala`. Para pasar datos entre lenguajes se usa una tabla o una vista temporal: `df.createOrReplaceTempView("ventas")` en Python y `SELECT * FROM ventas` en SQL.
- **El resultado de una celda SQL queda en `_sqldf`.** Después de ejecutar una celda `%sql`, el resultado está disponible en Python como el DataFrame `_sqldf` (en clústeres; no en SQL warehouses). Se pisa con cada celda SQL nueva, así que si lo necesitas, guárdalo: `ventas_por_canal = _sqldf`.
- `%sh` corre **solo en el driver** (la máquina principal), no en todas las máquinas del clúster.

## display()

`display(df)` muestra una tabla interactiva con filtros y gráficos rápidos. En este curso, `display(df)` también funciona en los ejercicios de PySpark (muestra la tabla en texto).

```python
from pyspark.sql import functions as F
display(spark.table("pedidos").groupBy("canal").count())
```

## Widgets: parámetros del notebook

```python norun
dbutils.widgets.text("fecha", "2024-03-15", "Fecha a procesar")
dbutils.widgets.dropdown("entorno", "dev", ["dev", "prod"])
fecha = dbutils.widgets.get("fecha")
df = spark.table("main.bronze.pedidos").filter(f"fecha_pedido = '{fecha}'")
```

Cuando el notebook corre en un **job**, los parámetros del job llenan los widgets.

Desde SQL, los widgets se leen con **marcadores de parámetro** (`:nombre`), disponibles desde Databricks Runtime 15.2:

```sql norun
SELECT *
FROM main.bronze.pedidos
WHERE fecha_pedido = :fecha;

SHOW TABLES IN IDENTIFIER(:esquema);   -- IDENTIFIER() convierte el texto en un nombre de tabla o esquema
```

Los marcadores protegen contra la **inyección de SQL**: el valor del widget nunca se "pega" dentro del texto de la consulta, se pasa por separado. En código viejo verás `${fecha}` o `getArgument("fecha")`, la sintaxis anterior.

## dbutils.fs: archivos

```python norun
dbutils.fs.ls("/Volumes/main/crudo/archivos/")
dbutils.fs.cp("/Volumes/main/crudo/archivos/ventas.csv", "/Volumes/main/crudo/respaldo/ventas.csv")
dbutils.fs.mkdirs("/Volumes/main/crudo/archivos/2024/")
dbutils.fs.rm("/Volumes/main/crudo/tmp/", recurse=True)
dbutils.fs.head("/Volumes/main/crudo/archivos/ventas.csv")
```

:::nota DBFS y Volumes
Antes se usaba el **DBFS root** (`dbfs:/FileStore/...`) y los *mounts*. Con Unity Catalog, la forma recomendada para archivos es **Volumes** (`/Volumes/<catalogo>/<esquema>/<volumen>/...`), que tienen permisos gobernados.
:::

## dbutils.secrets: nunca escribas contraseñas

```python norun
token = dbutils.secrets.get(scope="kv-datos", key="api-token")
print(token)   # Databricks muestra [REDACTED]: el valor nunca aparece en el notebook
```

## Encadenar notebooks: %run, dbutils.notebook.run y los jobs

Cuando un proyecto crece, la lógica se reparte en varios notebooks o archivos. La documentación oficial compara las opciones:

| Método | Qué hace | Cuándo usarlo |
|---|---|---|
| **Archivos `.py` del workspace** (`import utilidades`) | Importas funciones como en cualquier proyecto de Python | La forma **recomendada** de reutilizar código: se versiona en Git y se prueba con tests |
| **`%run ./utilidades`** | Ejecuta el otro notebook **en el mismo contexto**: sus funciones y variables quedan disponibles | Compartir funciones cuando no puedes usar archivos `.py` |
| **`dbutils.notebook.run("./carga", 600, {"fecha": "2024-03-15"})`** | Ejecuta el otro notebook como un **job nuevo y separado**, con parámetros y un tiempo máximo (600 segundos), y devuelve el valor de su `dbutils.notebook.exit(...)` | Lógica dinámica que un job no puede expresar, por ejemplo "un notebook por cada tabla de un archivo de configuración" |
| **Lakeflow Jobs** | Un job con varias tareas, dependencias, horarios y reintentos | La forma **recomendada** de orquestar en producción |

```python norun
# notebook "carga": recibe un parámetro y devuelve un resultado
dbutils.widgets.text("tabla", "")
tabla = dbutils.widgets.get("tabla")
filas = spark.table(f"main.bronze.{tabla}").count()
dbutils.notebook.exit(str(filas))          # el valor de salida es siempre un texto

# notebook "orquestador": lo llama una vez por tabla
for t in ["pedidos", "clientes", "pagos"]:
    filas = dbutils.notebook.run("./carga", 600, {"tabla": t})
    print(t, filas)
```

### Pasar valores entre tareas de un job: task values

Dentro de un job de varias tareas, una tarea puede dejar un valor para las siguientes con `dbutils.jobs.taskValues`:

```python norun
# tarea "validar"
dbutils.jobs.taskValues.set(key="filas_validas", value=11850)

# tarea "publicar" (depende de "validar")
filas = dbutils.jobs.taskValues.get(taskKey="validar", key="filas_validas", default=0, debugValue=100)
```

- El valor debe poder escribirse como JSON y ocupar menos de 48 KB: igual que XCom en Airflow, sirve para **metadatos** (conteos, rutas, banderas), no para datos.
- `debugValue` es lo que devuelve cuando ejecutas el notebook a mano, fuera de un job (si no lo pones, da error).
- En la configuración del job también se puede usar `{{tasks.validar.values.filas_validas}}` como parámetro de otra tarea, o en una condición *if/else*.

:::errores
- **Usar variables de una celda `%python` en una celda `%scala`**: cada lenguaje tiene su intérprete. Pasa los datos por una vista temporal.
- **Concatenar el widget dentro del SQL** (`f"WHERE fecha = '{fecha}'"`): abre la puerta a inyección de SQL. Usa `:fecha` en SQL o `spark.sql("... :fecha", args={"fecha": fecha})`.
- **Orquestar producción con `dbutils.notebook.run` en un bucle**: cada llamada es un job efímero, sin reintentos por tarea ni historial claro. Usa Lakeflow Jobs.
- **Escribir contraseñas en el notebook**: quedan en el historial de versiones. Usa `dbutils.secrets`.
- **Dar por terminado un notebook sin "Run all" en un cómputo limpio**: puede depender de celdas ejecutadas en otro orden.
:::

:::trabajo
- El patrón más común en equipos maduros: el notebook es solo el **punto de entrada** (lee parámetros, llama funciones), y la lógica vive en archivos `.py` en una carpeta Git, con tests que corren en CI.
- Los notebooks de producción se versionan en **Git folders** (antes *Repos*) y se despliegan con **Declarative Automation Bundles**, nunca editándolos a mano en el workspace de producción.
- Para explorar datos, Databricks ofrece además **Genie Code** (el asistente de IA dentro del notebook) que genera, explica y depura código; hay que revisar siempre lo que propone.
:::

:::entrevista "¿Qué diferencia hay entre %run y dbutils.notebook.run?"
`%run` ejecuta otro notebook dentro del mismo contexto, así que sus funciones y variables quedan disponibles en el notebook que lo llama; sirve para compartir código, aunque hoy se recomienda importar archivos `.py`. `dbutils.notebook.run` ejecuta el notebook como un job separado, con parámetros y un tiempo máximo, y devuelve el valor que el otro notebook pasa a `dbutils.notebook.exit`; no comparte variables. Sirve para lógica dinámica, como recorrer una lista de tablas. Para orquestar producción con dependencias, horarios y reintentos, lo recomendado es un Lakeflow Job.
:::

## Ejercicios

:::ejercicio quiz
Tienes funciones auxiliares en el notebook `./utils` y quieres usarlas en tu notebook actual. ¿Qué escribes en una celda?

- [ ] `import utils`
- [x] `%run ./utils`
- [ ] `%sql utils`
- [ ] `dbutils.notebook.import("utils")`
:::

:::ejercicio quiz
¿Cómo lees un secreto llamado `sql-pass` del scope `kv-datos`?

- [ ] `dbutils.widgets.get("sql-pass")`
- [x] `dbutils.secrets.get(scope="kv-datos", key="sql-pass")`
- [ ] `spark.conf.get("sql-pass")`
- [ ] `os.environ["sql-pass"]`
:::

:::ejercicio pyspark
Simula un notebook parametrizado: la variable `fecha` (que en Databricks vendría de un widget) vale `"2024-12-24"`. Filtra `pedidos` por esa fecha y cuenta los pedidos por `canal`. Guarda en `resultado` (columnas `canal`, `count`).
```python inicial
fecha = "2024-12-24"   # en Databricks: dbutils.widgets.get("fecha")
```
```python solucion
from pyspark.sql import functions as F

fecha = "2024-12-24"
resultado = spark.table("pedidos").filter(F.col("fecha_pedido") == fecha).groupBy("canal").count()
```
:::

:::ejercicio quiz dificultad=Intermedio
Necesitas usar en Python el resultado de la celda `%sql` que acabas de ejecutar en un clúster. ¿Qué haces?

- [ ] No se puede: SQL y Python no comparten nada
- [x] Usas `_sqldf`, el DataFrame con el resultado de la última celda SQL (y lo guardas en otra variable si lo necesitas después)
- [ ] Copias la tabla a mano
- [ ] Usas `%run`
:::

:::ejercicio quiz dificultad=Intermedio
¿Cuál es la forma segura de usar el widget `fecha` en una consulta SQL de Databricks (Runtime 15.2 o superior)?

- [ ] `WHERE fecha_pedido = '${fecha}'`
- [x] `WHERE fecha_pedido = :fecha`
- [ ] `WHERE fecha_pedido = fecha`
- [ ] Concatenar el valor con un f-string de Python
:::

:::ejercicio quiz dificultad=Avanzado
La tarea `validar` de un job calcula cuántas filas son válidas, y la tarea `publicar` necesita ese número. ¿Qué usas?

- [ ] Una variable global de Python
- [ ] `%run ./validar`
- [x] `dbutils.jobs.taskValues.set(...)` en `validar` y `dbutils.jobs.taskValues.get(taskKey="validar", ...)` en `publicar`
- [ ] Un archivo de texto en el driver
:::
