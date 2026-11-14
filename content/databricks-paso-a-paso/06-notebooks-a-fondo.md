---
titulo: Notebooks a fondo - comandos mágicos, widgets, dbutils, gráficos y el menú File
nivel: 2 · Básico-intermedio
duracion: 50
resumen: Lo que convierte un notebook en una herramienta de trabajo - los comandos mágicos (%sql, %md, %fs, %sh, %run, %pip), widgets para parametrizar, dbutils para archivos y secretos, gráficos sobre los resultados, el menú File (exportar, clonar, mover) y las buenas prácticas para que un notebook sea legible y reproducible.
objetivos: Usar los comandos mágicos según la tarea | Crear widgets y leerlos desde Python y SQL | Conocer dbutils y sus familias | Hacer un gráfico dentro del notebook | Exportar, clonar y organizar notebooks
prerrequisitos: databricks-paso-a-paso-editor-sql
autoevaluacion: ¿Sabes qué hace %run? | ¿Sabes crear un widget desplegable? | ¿Sabes leer un widget desde SQL? | ¿Sabes exportar un notebook?
---

:::analogia En palabras simples
Los comandos mágicos son como los botones de una radio: con uno cambias a SQL, con otro a texto, con otro ves archivos. Los widgets son los diales que alguien puede girar sin abrir el aparato: cambias el canal o la fecha y el notebook hace lo mismo con otros datos.
:::

## Paso 1 — Comandos mágicos

Van en la primera línea de la celda:

| Comando | Hace |
|---|---|
| `%sql` | La celda es SQL |
| `%python` | La celda es Python (en un notebook SQL) |
| `%md` | Texto con formato Markdown |
| `%fs ls /Volumes/main/default/` | Comandos de archivos (`ls`, `head`, `cp`, `rm`, `mkdirs`) |
| `%sh` | Un comando de la terminal del driver (`ls`, `pip list`, `date`) |
| `%run ./otro_notebook` | Ejecuta otro notebook dentro de este: sus variables y funciones quedan disponibles |
| `%pip install paquete` | Instala una librería solo para este notebook |

```captura
archivo: databricks/d06-magics.webp
texto: %fs ls lista los volúmenes (1) y %sh corre un comando en la máquina (2)
```

:::nota %run y la organización
Un patrón muy usado: un notebook `utilidades` con funciones de limpieza y conexiones, y cada notebook de trabajo empieza con `%run ./utilidades`. Un cambio en las funciones se aplica a todos.
:::

## Paso 2 — Widgets: parámetros del notebook

```python norun
dbutils.widgets.dropdown("canal", "web", ["web", "app", "tienda", "telefono"], "Canal")
dbutils.widgets.text("minimo", "10", "Mínimo de pedidos")
```

Al ejecutarla aparece una barra arriba del notebook con los dos controles. Se leen así:

```python norun
canal = dbutils.widgets.get("canal")
minimo = int(dbutils.widgets.get("minimo"))
df = spark.table("samples.tienda.pedidos").filter(f"canal = '{canal}'")
display(df.groupBy("estado").count().filter(f"count >= {minimo}"))
```

```captura
archivo: databricks/d06-widgets.webp
texto: La barra de widgets (1) y el resultado filtrado por el canal elegido (2)
```

En SQL, el widget se usa con dos puntos: `WHERE canal = :canal`.

| Tipo | Para |
|---|---|
| `text` | Un valor libre (fecha, ruta) |
| `dropdown` | Elegir uno de una lista |
| `combobox` | Lista o valor libre |
| `multiselect` | Varios de una lista |

Los widgets son lo que un **job** usa para pasar parámetros al notebook (nivel 4): el job define `fecha=2024-12-01` y el notebook lo lee con `dbutils.widgets.get("fecha")`. `dbutils.widgets.removeAll()` los quita.

## Paso 3 — dbutils

| Familia | Ejemplos |
|---|---|
| `dbutils.fs` | `ls`, `head`, `cp`, `mv`, `rm`, `mkdirs`, `put`: lo mismo que `%fs`, desde Python |
| `dbutils.widgets` | Los parámetros del paso 2 |
| `dbutils.secrets` | `get("scope", "clave")`: leer una contraseña sin que aparezca en el código (nivel 5) |
| `dbutils.notebook` | `exit("valor")`: terminar el notebook devolviendo un valor al job |
| `dbutils.jobs.taskValues` | Pasar valores entre tareas de un job |

`dbutils.fs.help()` muestra la ayuda de cada familia.

## Paso 4 — Gráficos en el notebook

Todo resultado tabular (SQL o `display()`) tiene el **+** junto a **Table**, igual que en el editor SQL:

```captura
archivo: databricks/d06-grafico-celda.webp
texto: Un gráfico de torta como segunda pestaña del resultado (1), debajo de la celda (2)
```

El gráfico se guarda con el notebook: quien lo abra lo ve sin volver a configurarlo.

## Paso 5 — El menú File

```captura
archivo: databricks/d06-menu-file.webp
texto: File - clonar, renombrar, mover, exportar e importar
```

| Opción | Para |
|---|---|
| **Clone** | Una copia para probar sin romper el original |
| **Rename / Move** | Ordenar en carpetas |
| **Export** | Descargar como archivo fuente (`.py` o `.sql` con las celdas separadas por `# COMMAND ----------`) para subirlo a Git |
| **Import** (en Workspace) | Traer un notebook exportado o un `.ipynb` |

## Paso 6 — Buenas prácticas

- **Una celda de texto al principio**: qué hace, qué tablas lee, qué tablas escribe.
- **Parámetros arriba, en widgets**: nada de fechas escritas a mano en el medio del código.
- **Celdas chicas, una idea por celda**: se depura más fácil.
- **Run all debe funcionar de arriba abajo**: si depende de que ejecutes algo a mano en otro orden, un job va a fallar.
- **Sin credenciales en el código**: `dbutils.secrets.get`.

## ✅ Lo que lograste

- Usas los comandos mágicos y `dbutils`.
- Parametrizas con widgets desde Python y SQL.
- Haces gráficos, exportas y organizas notebooks.

:::ejercicio quiz
¿Qué hace `%run ./utilidades`?
- [ ] Borra el notebook utilidades
- [x] Ejecuta ese notebook dentro del actual y deja disponibles sus funciones y variables
- [ ] Lo exporta
- [ ] Lo programa como job
:::

:::ejercicio quiz
Un job tiene que pasarle la fecha a tu notebook. ¿Cómo la recibe el notebook?
- [ ] Con input()
- [x] Con dbutils.widgets.get("fecha")
- [ ] Leyendo un archivo
- [ ] No se puede
:::

:::ejercicio quiz
¿Cómo usas el widget canal dentro de una celda %sql?
- [ ] ${{canal}}
- [x] :canal
- [ ] widgets.canal
- [ ] No se puede desde SQL
:::

:::ejercicio quiz
¿Por qué "Run all" debe funcionar de arriba abajo?
- [ ] Porque es más rápido
- [x] Porque un job ejecuta el notebook en ese orden, sin nadie que corra celdas a mano
- [ ] Porque Databricks lo exige
- [ ] No importa el orden
:::
