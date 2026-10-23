---
titulo: Notebooks, magic commands y dbutils
nivel: Básico
duracion: 30
resumen: Celdas multi-lenguaje, %sql, %run, %pip, display, widgets, dbutils.fs y dbutils.secrets.
---

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
