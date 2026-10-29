---
titulo: "Spark en tu máquina: PySpark local, Jupyter y spark-submit"
nivel: Intermedio
duracion: 50
resumen: Instala Java y PySpark, entiende qué significa correr Spark en modo local, desarrolla en notebooks de Jupyter dentro de VS Code, mira la Spark UI y ejecuta un job completo con spark-submit. Incluye la alternativa en Docker y cómo dimensionar la memoria.
objetivos: Instalar Java 17 y PySpark y comprobar que Spark arranca | Explicar el modo local[*] y en qué se diferencia de un clúster | Desarrollar con PySpark en un notebook de Jupyter y leer la Spark UI | Ejecutar un script de PySpark con spark-submit y ajustar la memoria del driver | Leer y escribir Parquet particionado en tu disco
prerrequisitos: local-python-uv | pyspark-sparksession
autoevaluacion: ¿Sabes por qué Spark necesita Java? | ¿Sabes qué significa master local[*]? | ¿Sabes abrir la Spark UI y qué mirar? | ¿Puedes correr un script con spark-submit? | ¿Sabes qué hacer si aparece OutOfMemoryError?
---

:::escenario Probar antes de pagar el clúster
En Rápido, los jobs de Spark corren en Dataproc y cada prueba levanta un clúster que tarda minutos y cuesta. Tu líder te dice:

> "Desarrolla el job en tu máquina con una muestra de los datos. Spark en modo local es el mismo motor: si funciona con 16 000 pedidos en tu laptop, va a funcionar con 16 millones en el clúster. Solo cambia dónde corre."
:::

## Spark en modo local

En un clúster, Spark tiene un **driver** (coordina) y varios **executors** en distintas máquinas (procesan). En **modo local**, todo corre en **un proceso de tu computadora**, y los "executors" son los núcleos de tu procesador.

```diagrama
titulo: El mismo código, dos lugares donde correr
nodo cod: job.py | icono=codigo | col=0 | fila=0 | color=azul | sub=PySpark
nodo loc: local[*] | icono=equipo | col=1 | fila=0 | color=verde | sub=driver + 1 hilo\npor núcleo
nodo cl: Clúster | icono=spark | col=1 | fila=1 | color=naranja | sub=driver + N executors\n(Dataproc, EMR, Databricks)
nodo dat: Muestra en tu disco | icono=archivos | col=2 | fila=0 | color=gris | sub=data/*.csv, *.parquet
nodo lago: Lago en la nube | icono=bucket | col=2 | fila=1 | color=gris | sub=gs://, s3://, abfss://
flecha cod -> loc: spark-submit --master local[*]
flecha cod -> cl: spark-submit en el clúster
flecha loc -> dat
flecha cl -> lago
```

| `--master` | Qué significa |
|---|---|
| `local` | Un solo hilo (útil para depurar) |
| `local[4]` | 4 hilos |
| `local[*]` | Un hilo por núcleo de tu procesador (lo normal) |
| `yarn`, `spark://…`, `k8s://…` | Un clúster real |

## 1. Instalar Java y PySpark

Spark está escrito en Scala y corre sobre la **JVM** (Java): PySpark necesita Java instalado. Usa Java 17 (compatible con Spark 3.5).

```bash norun
# Ubuntu / WSL
sudo apt install -y openjdk-17-jdk
# macOS
brew install openjdk@17
sudo ln -sfn $(brew --prefix)/opt/openjdk@17/libexec/openjdk.jdk /Library/Java/JavaVirtualMachines/openjdk-17.jdk

java -version
```

Si tienes varias versiones de Java, apunta `JAVA_HOME` a la 17 (en `~/.bashrc` o `~/.zshrc`): `export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64` (Ubuntu) o `export JAVA_HOME=$(/usr/libexec/java_home -v 17)` (macOS).

Y PySpark en el proyecto:

```bash norun
uv init spark-rapido && cd spark-rapido
uv add pyspark==3.5.3 pandas pyarrow
uv add --dev jupyter ipykernel
uv run python -c "from pyspark.sql import SparkSession; print(SparkSession.builder.master('local[*]').getOrCreate().version)"
```

## 2. Un notebook en VS Code

Crea `explorar.ipynb`, elige el kernel de `.venv` (arriba a la derecha) y:

```python norun
from pyspark.sql import SparkSession, functions as F

spark = (SparkSession.builder
         .master("local[*]")
         .appName("explorar-rapido")
         .config("spark.sql.shuffle.partitions", "8")   # 200 por defecto: demasiadas para una laptop
         .getOrCreate())

pedidos = spark.read.csv("data/delivery_pedidos.csv", header=True, inferSchema=True)
pedidos.printSchema()

(pedidos.filter(F.col("estado") == "entregado")
        .groupBy("ciudad")
        .agg(F.count("*").alias("entregados"),
             F.round(F.avg((F.unix_timestamp("entregado") - F.unix_timestamp("creado")) / 60), 1).alias("min_promedio"))
        .orderBy(F.desc("entregados"))
        .show())
```

:::tip spark.sql.shuffle.partitions
Por defecto, cada `groupBy` o `join` reparte los datos en **200** particiones: pensado para clústeres. En tu laptop con datos chicos, son 200 tareas diminutas y todo va lento. Con 8 (o el doble de tus núcleos) vuela. En Spark 3 con AQE activado, Spark las ajusta solo en parte.
:::

## 3. La Spark UI

Mientras la sesión está abierta, Spark sirve una interfaz web en **`http://localhost:4040`** (4041, 4042… si ya hay otra sesión). Ahí ves:

| Pestaña | Qué mirar |
|---|---|
| **Jobs** | Cada acción (`show`, `count`, `write`) es un job; cuánto tardó |
| **Stages** | Las etapas separadas por *shuffles*; si una tarea tarda mucho más que las otras, hay **skew** |
| **SQL / DataFrame** | El plan físico: dónde hay `Exchange` (shuffle) y si un join fue `BroadcastHashJoin` |
| **Storage** | Lo que guardaste con `cache()` |
| **Executors** | Memoria usada y errores |

## 4. Un job con spark-submit

El notebook es para explorar; el job que va a producción es un script:

```python norun
# jobs/mart_diario.py
import sys
from pyspark.sql import SparkSession, functions as F

def main(entrada, salida):
    spark = SparkSession.builder.appName("mart-diario").getOrCreate()
    p = spark.read.csv(entrada, header=True, inferSchema=True)
    mart = (p.withColumn("fecha", F.to_date("creado"))
             .groupBy("ciudad", "fecha")
             .agg(F.count("*").alias("pedidos"),
                  F.sum(F.when(F.col("estado") == "entregado", F.col("subtotal")).otherwise(0)).alias("gmv")))
    (mart.write.mode("overwrite")
         .partitionBy("fecha")
         .parquet(salida))
    spark.stop()

if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
```

```bash norun
uv run spark-submit --master "local[*]" --driver-memory 4g \
  jobs/mart_diario.py data/delivery_pedidos.csv salida/mart_diario
ls salida/mart_diario | head      # fecha=2024-01-01/  fecha=2024-01-02/  …  _SUCCESS
```

- El script **no** fija `.master(...)`: lo decide quien lo ejecuta (`--master local[*]` en tu máquina, el clúster en producción). Así el mismo archivo sirve en los dos lados.
- `partitionBy("fecha")` crea una carpeta por fecha: después, leer un día lee solo esa carpeta.
- `_SUCCESS` es el archivo que Spark deja cuando el job terminó bien: otros procesos lo usan como señal.

## 5. La alternativa: Spark en Docker

Si no quieres instalar Java, la imagen `jupyter/pyspark-notebook` trae Python, Java, Spark y Jupyter:

```bash norun
docker run -d --name spark -p 8888:8888 -p 4040:4040 -v "$PWD":/home/jovyan/work jupyter/pyspark-notebook
docker logs spark          # copia la URL con el token y ábrela en el navegador
```

Tus archivos aparecen en la carpeta `work/` del Jupyter.

<!-- estandar:errores -->
:::errores
- **`JAVA_HOME is not set`** o **`Java gateway process exited before sending its port number`**: falta Java o `JAVA_HOME` apunta a una versión incompatible (Spark 3.5 funciona con Java 8, 11 y 17).
- **`java.lang.OutOfMemoryError: Java heap space`**: el driver tiene poca memoria (1 GB por defecto). Sube con `--driver-memory 4g` o `.config("spark.driver.memory", "4g")` **antes** de crear la sesión, o trabaja con una muestra más chica. Nunca hagas `.collect()` o `.toPandas()` de algo grande.
- **Todo anda lentísimo con datos chicos**: las 200 particiones de shuffle. Bájalas.
- **`Path does not exist`**: las rutas relativas son desde donde ejecutaste el comando, no desde el script.
- **Versiones distintas de PySpark en tu máquina y en el clúster**: fija la misma versión (`pyspark==3.5.3`) para no descubrir diferencias en producción.
:::

<!-- estandar:trabajo -->
:::trabajo
- El flujo habitual: explorar en un notebook con una muestra → pasar la lógica a funciones en un módulo → probar esas funciones con **pytest** y un `SparkSession` local (`local[2]`) → el job llama a esas funciones y se despliega por CI.
- En Databricks se trabaja igual en local con **Databricks Connect** (el código corre en tu VS Code y los cálculos en el clúster) o con un Spark local para las pruebas unitarias.
- Las pruebas de Spark se hacen con DataFrames chicos construidos en la prueba (`spark.createDataFrame([...])`) y se comparan resultados esperados: rápidas y sin depender de archivos.
:::

## Ejercicios

:::ejercicio quiz
¿Qué significa `--master local[*]`?

- [ ] Usar todos los clústeres disponibles
- [x] Correr Spark en tu máquina, con un hilo por cada núcleo del procesador
- [ ] Correr Spark sin paralelismo
- [ ] Conectarse al clúster por defecto de la empresa
:::

:::ejercicio quiz
Tu notebook falla con `OutOfMemoryError: Java heap space` justo después de `df.toPandas()` sobre 50 millones de filas. ¿Qué haces primero?

- [ ] Reinstalar Java
- [x] No traer todo al driver: agregar o filtrar en Spark antes, o traer una muestra; si hace falta, subir `spark.driver.memory`
- [ ] Subir las particiones de shuffle a 2000
- [ ] Usar `cache()`
:::

:::ejercicio quiz
¿Por qué el script de producción no lleva `.master("local[*]")` en el código?

- [ ] Porque da error
- [x] Porque dónde corre lo decide quien lo ejecuta (`spark-submit --master …`), y así el mismo script sirve en local y en el clúster
- [ ] Porque local[*] es lento
- [ ] Porque `master` solo se puede usar en notebooks
:::

:::ejercicio cli
Comprueba que tienes Java instalado y su versión (Spark lo necesita).
```respuesta
java -version
java --version
```
:::

:::ejercicio cli
En `~/spark-rapido` está el job `jobs/mart_diario.py`. Ejecútalo con `spark-submit` en modo local usando todos los núcleos.
```respuesta
spark-submit --master ["']?local\[\*\]["']? jobs/mart_diario\.py.*
uv run spark-submit --master ["']?local\[\*\]["']? jobs/mart_diario\.py.*
```
```solucion
spark-submit --master "local[*]" jobs/mart_diario.py
```
```setup
mkdir -p ~/spark-rapido/jobs
cd ~/spark-rapido
printf 'print("job mart_diario: ok")\n' > jobs/mart_diario.py
```
:::
