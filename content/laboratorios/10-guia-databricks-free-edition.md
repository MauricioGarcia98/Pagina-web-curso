---
titulo: "Guía real: Databricks Free Edition paso a paso"
nivel: Básico
duracion: 70
resumen: Una guía para hacer en tu propia cuenta gratuita de Databricks - registrarte en Free Edition, recorrer la interfaz, consultar un dataset de ejemplo, subir un CSV del generador del curso a un volumen, crear una tabla con Unity Catalog, transformarla con un notebook de PySpark, programar un job y conocer los límites de la cuenta gratuita. Cada paso tiene lugar para tu captura de pantalla.
objetivos: Crear una cuenta de Databricks Free Edition | Ubicar en la interfaz el catálogo, el editor de SQL, los notebooks y los jobs | Consultar datos con SQL y con PySpark en cómputo serverless | Subir un archivo a un volumen y convertirlo en tabla | Programar un job de un notebook | Saber qué limita la cuenta gratuita
prerrequisitos: databricks-que-es-databricks | databricks-notebooks-dbutils
autoevaluacion: ¿Sabes qué es un volumen y en qué se diferencia de una tabla? | ¿Sabes qué nombre de tres partes tiene una tabla en Unity Catalog? | ¿Sabes qué pasa si superas la cuota de Free Edition?
---

:::escenario
Hasta ahora practicaste Databricks en el simulador del curso. Esta guía es para hacer lo mismo en un Databricks **de verdad**, sin pagar nada. Databricks Free Edition (que en 2025 reemplazó a la antigua *Community Edition*) es una versión gratuita pensada para estudiantes y para aprender: tiene la misma interfaz que usan las empresas, con cómputo *serverless* y algunos límites de uso.
:::

:::nota Cómo usar esta guía
Cada paso tiene un recuadro de **captura pendiente**. Cuando hagas el paso en tu cuenta, saca una captura de pantalla y súbela con el nombre que indica el recuadro: así la guía queda ilustrada con tu propia cuenta. Antes de subirla, tapa tu correo y cualquier dato personal. Los nombres de los botones son los de la documentación oficial de octubre de 2026; si la interfaz cambió, busca la opción con un nombre parecido.
:::

## Lo que vas a construir

1. Una cuenta de Free Edition con su workspace.
2. Una consulta SQL sobre un dataset de ejemplo.
3. El CSV de pedidos del generador del curso, subido a un **volumen**.
4. Una tabla `pedidos_crudos` creada desde ese archivo y una tabla limpia `pedidos_silver` hecha con PySpark.
5. Un **job** que ejecuta ese notebook todos los días.

Costo: **cero**. Free Edition no pide tarjeta de crédito.

## Paso 1: crear la cuenta

1. Entra a la página de registro de **Databricks Free Edition** (busca "Databricks Free Edition sign up" en tu buscador; la página es de `databricks.com`).
2. Elige cómo registrarte. Según la documentación, Free Edition permite tres formas: un código enviado a tu **correo**, **Google** o **Microsoft**.
3. Databricks crea un workspace para ti. Tarda unos segundos y te lleva directo a la página de inicio.

```captura
archivo: dbx-free-01-registro.png
texto: La página de registro de Free Edition con las opciones de inicio de sesión
```

```captura
archivo: dbx-free-02-inicio.png
texto: La página de inicio del workspace recién creado
```

:::cuidado Cuenta para uso personal
Según sus condiciones, Free Edition es para uso **no comercial**: aprender, prototipar, proyectos personales. No subas datos de tu trabajo ni datos personales de otras personas.
:::

## Paso 2: recorrer la interfaz

La barra lateral izquierda tiene las secciones que vas a usar en todo el curso. Haz clic en cada una para reconocerla:

| Sección | Qué es | Qué viste en el curso |
|---|---|---|
| **+ New** | Crear cualquier cosa: notebook, consulta, job, carga de datos | `databricks workspace import`, `bundle deploy` |
| **Workspace** | Tus carpetas y notebooks | `databricks workspace list` |
| **Catalog** | El explorador de Unity Catalog: catálogos, esquemas, tablas y volúmenes | `databricks catalogs list` |
| **SQL Editor** | Escribir y ejecutar SQL sobre un SQL warehouse | Las lecciones de Delta y Spark SQL |
| **Jobs & Pipelines** | Jobs programados y pipelines declarativos | Lakeflow Jobs y Declarative Pipelines |
| **Compute** | El cómputo; en Free Edition es solo serverless y un SQL warehouse | `databricks clusters list` |

```captura
archivo: dbx-free-03-barra-lateral.png
texto: La barra lateral con Workspace, Catalog, SQL Editor, Jobs & Pipelines y Compute
```

Abre **Catalog**. Vas a ver al menos el catálogo de tu workspace (tiene el mismo nombre que el workspace) con un esquema `default`, y el catálogo `samples` con datasets de ejemplo. Recuerda que en Unity Catalog todo se nombra con **tres partes**: `catalogo.esquema.tabla`.

```captura
archivo: dbx-free-04-catalogo.png
texto: Catalog Explorer con el catálogo del workspace y el catálogo samples
```

## Paso 3: tu primera consulta SQL

1. En la barra lateral, abre **SQL Editor**.
2. Arriba, comprueba que esté seleccionado el SQL warehouse (Free Edition trae uno, de tamaño 2X-Small).
3. Escribe y ejecuta:

```sql norun
SELECT pickup_zip, COUNT(*) AS viajes, ROUND(AVG(fare_amount), 2) AS tarifa_promedio
FROM samples.nyctaxi.trips
GROUP BY pickup_zip
ORDER BY viajes DESC
LIMIT 10;
```

Es el mismo SQL que practicaste; lo que cambia es que corre sobre una tabla Delta en la nube. La primera ejecución tarda un poco más porque el warehouse se enciende.

```captura
archivo: dbx-free-05-sql-editor.png
texto: El SQL Editor con la consulta y los 10 códigos postales con más viajes
```

## Paso 4: subir un archivo a un volumen

Un **volumen** es una carpeta gobernada por Unity Catalog para guardar **archivos** (CSV, JSON, imágenes, PDF). Una **tabla** guarda filas y columnas. El recorrido típico es: el archivo llega a un volumen (bronze) y desde ahí se crea una tabla.

1. En el curso, abre el **Generador de datos** (menú lateral), elige el escenario **Tienda online**, unos 500 clientes, el formato **CSV** y problemas **realista** (así hay algo que limpiar). Descarga el ZIP y descomprímelo: vas a usar `pedidos.csv`.
2. En Databricks, haz clic en **+ New** → **Add or upload data** → **Upload files to a volume**.
3. Elige como destino tu catálogo, el esquema `default` y crea un volumen llamado `crudo` (o usa **My Files**, el volumen personal, si la opción aparece).
4. Arrastra el CSV y confirma.

La documentación indica que desde la interfaz se pueden subir archivos de hasta 5 GB; para más grandes se usa el SDK de Python.

```captura
archivo: dbx-free-06-subir-volumen.png
texto: El diálogo Upload files to a volume con el CSV de pedidos
```

Desde un notebook, el archivo queda en una ruta como `/Volumes/<tu_catalogo>/default/crudo/pedidos.csv`: es la misma ruta que usaste con `dbutils.fs` y `databricks fs` en el módulo de Databricks.

## Paso 5: un notebook de PySpark

1. **+ New** → **Notebook**. Arriba, a la derecha, haz clic en **Connect** y elige el cómputo **Serverless**.
2. En la primera celda, crea la tabla cruda desde el archivo (reemplaza `<tu_catalogo>` por el nombre de tu catálogo; lo ves en Catalog):

```python norun
catalogo = "<tu_catalogo>"
ruta = f"/Volumes/{catalogo}/default/crudo/pedidos.csv"

crudos = spark.read.option("header", True).csv(ruta)
crudos.write.mode("overwrite").saveAsTable(f"{catalogo}.default.pedidos_crudos")
display(crudos.limit(5))
```

3. En la segunda celda, la capa silver: tipos con `try_cast` (en Free Edition corre Spark 4 con el modo ANSI), deduplicación y cuarentena, como en la lección de calidad:

```python norun
from pyspark.sql import functions as F
from pyspark.sql.window import Window

df = spark.table(f"{catalogo}.default.pedidos_crudos")
tipados = (df.withColumn("pedido_id", F.col("pedido_id").try_cast("int"))
             .withColumn("cliente_id", F.col("cliente_id").try_cast("int"))
             .withColumn("fecha_pedido", F.col("fecha_pedido").try_cast("timestamp"))
             .withColumn("cargado_en", F.col("cargado_en").try_cast("timestamp")))

# si un pedido llegó dos veces, nos quedamos con la carga más reciente
w = Window.partitionBy("pedido_id").orderBy(F.col("cargado_en").desc())
silver = (tipados.filter(F.col("pedido_id").isNotNull() & F.col("fecha_pedido").isNotNull())
                 .withColumn("rn", F.row_number().over(w))
                 .filter("rn = 1").drop("rn"))

silver.write.mode("overwrite").saveAsTable(f"{catalogo}.default.pedidos_silver")
print("crudos:", df.count(), "· silver:", silver.count(), "· descartados:", df.count() - silver.count())
```

Las columnas son las de `pedidos.csv` del escenario Tienda online (`pedido_id`, `cliente_id`, `fecha_pedido`, `canal`, `estado`, `metodo_pago` y `cargado_en`, el momento en que se cargó cada fila). Con problemas "realista", el generador agrega duplicados y fechas en formatos raros: los descartados que imprime la celda son esas filas. Si elegiste otro escenario, ajusta los nombres mirando la salida del `display`.

```captura
archivo: dbx-free-07-notebook.png
texto: El notebook conectado a serverless, con el conteo de filas crudas, silver y descartadas
```

4. Vuelve a **Catalog**: ahora aparecen `pedidos_crudos` y `pedidos_silver`. Haz clic en `pedidos_silver` y mira las pestañas **Columns**, **Sample data**, **History** (el historial de Delta) y **Lineage** (de qué tabla salió).

```captura
archivo: dbx-free-08-linaje.png
texto: La pestaña Lineage de pedidos_silver mostrando que viene de pedidos_crudos
```

## Paso 6: permisos con Unity Catalog

Como creaste la tabla, eres su **dueño**. Para dar acceso de lectura se usa `GRANT`, igual que en la lección de Unity Catalog. En el SQL Editor:

```sql norun
GRANT SELECT ON TABLE <tu_catalogo>.default.pedidos_silver TO `account users`;
SHOW GRANTS ON TABLE <tu_catalogo>.default.pedidos_silver;
```

También se puede hacer desde la interfaz: en la tabla, pestaña **Permissions** → **Grant**.

```captura
archivo: dbx-free-09-permisos.png
texto: La pestaña Permissions de la tabla con el permiso SELECT otorgado
```

## Paso 7: programar un job

1. Abre tu notebook y, arriba, haz clic en **Schedule** (o ve a **Jobs & Pipelines** → **Create** → **Job** y agrega una tarea de tipo *Notebook* que apunte a él).
2. Elige una frecuencia diaria y una hora.
3. Guarda y ejecútalo una vez a mano con **Run now** para comprobar que funciona.
4. En la pestaña **Runs** del job verás cada ejecución con su duración y su resultado. Es la misma información que `databricks jobs get-run` en la terminal del curso.

```captura
archivo: dbx-free-10-job.png
texto: El job con su programación diaria y una ejecución exitosa en la pestaña Runs
```

Free Edition permite hasta 5 tareas de jobs corriendo al mismo tiempo: alcanza de sobra para practicar.

## Los límites de Free Edition

Según la documentación oficial, estos son los límites principales:

| Recurso | Límite |
|---|---|
| Cómputo | Solo serverless (no puedes crear clústeres propios) y con tamaño y uso limitados |
| SQL warehouses | Uno, de tamaño 2X-Small |
| Jobs | Hasta 5 tareas corriendo a la vez |
| Lakeflow pipelines | Un pipeline activo por tipo |
| Lenguajes | Python y SQL (no R ni Scala) |
| Administración | Un workspace, sin consola de la cuenta, sin SSO |
| Uso | Solo no comercial; las cuentas sin uso por mucho tiempo pueden borrarse |

Si superas la cuota diaria de cómputo, el cómputo se apaga por el resto del día (y en casos extremos del mes), pero **tus datos y tu configuración no se borran**. Algunos límites se amplían verificando tu identidad con LinkedIn (aparece un botón **Verify identity** arriba si tu cuenta es elegible).

:::errores
- **Usar el nombre de tabla sin catálogo** (`pedidos_silver` a secas) y no encontrarla desde otro notebook: usa siempre las tres partes `catalogo.esquema.tabla`.
- **`cast` en lugar de `try_cast`** con datos sucios: en Spark 4 el notebook falla con `CAST_INVALID_INPUT`.
- **Buscar "Create cluster"**: en Free Edition no existe; todo corre en serverless.
- **Subir datos reales de tu empresa** a una cuenta personal.
- **Dejar un job cada 5 minutos** "para probar": consume la cuota diaria y el cómputo se apaga por el resto del día.
:::

:::trabajo
- Lo que hiciste es exactamente el día a día en Databricks: datos que llegan a un volumen, tablas Delta en Unity Catalog, notebooks que transforman y jobs que los programan.
- En una empresa, el paso siguiente es pasar el notebook a código versionado en Git y desplegarlo con Declarative Automation Bundles, como en la lección de bundles.
- Tu cuenta de Free Edition sirve para el portafolio: puedes mostrar el notebook, el linaje y el job en una entrevista.
:::

:::entrevista "¿Qué diferencia hay entre un volumen y una tabla en Unity Catalog?"
Un volumen guarda archivos en cualquier formato, como CSV, JSON, imágenes o PDF, con una ruta del tipo `/Volumes/catalogo/esquema/volumen/` y con permisos de Unity Catalog. Una tabla guarda datos estructurados en filas y columnas, normalmente en Delta, con esquema, historial y linaje. El flujo típico es que los archivos lleguen a un volumen y desde ahí se creen o actualicen tablas.
:::

## Práctica

:::ejercicio quiz dificultad=Básico
En Free Edition, ¿qué cómputo usa tu notebook?

- [ ] Un clúster que creas con el tamaño que quieras
- [x] Serverless: Databricks administra las máquinas; no se pueden crear clústeres propios
- [ ] Tu propia computadora
- [ ] Un clúster de GPU
:::

:::ejercicio quiz dificultad=Básico
Subiste `pedidos.csv` al volumen `crudo` del esquema `default` de tu catálogo `mi_ws`. ¿Cuál es su ruta?

- [ ] `dbfs:/FileStore/pedidos.csv`
- [x] `/Volumes/mi_ws/default/crudo/pedidos.csv`
- [ ] `mi_ws.default.pedidos`
- [ ] `C:\Volumes\pedidos.csv`
:::

:::ejercicio quiz dificultad=Intermedio
Superaste la cuota diaria de cómputo de Free Edition. ¿Qué pasa?

- [ ] Se borra tu workspace
- [x] El cómputo se apaga por el resto del día, pero tus datos y tu configuración se conservan
- [ ] Te cobran el exceso
- [ ] Se pierden las tablas creadas ese día
:::
