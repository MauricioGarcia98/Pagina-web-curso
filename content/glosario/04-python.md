# area: Python

## Python
alias: python3
nino: Python es un **idioma para darle instrucciones a la computadora** que se lee casi como inglés simple. Es como escribir una receta paso a paso que la computadora sigue sin equivocarse.
que: Un lenguaje de programación de propósito general, fácil de leer y con un ecosistema enorme para datos: pandas, PySpark, Airflow, dbt (escrito en Python), clientes de todas las nubes, requests para APIs, pytest para pruebas. En ingeniería de datos se usa para ingestas, transformaciones, orquestación y automatización.
ejemplo:
```python
pedidos = [{"id": 1, "total": 20.5}, {"id": 2, "total": 13.0}]
total = sum(p["total"] for p in pedidos)
print(f"Vendimos {total} en {len(pedidos)} pedidos")
```
para: Todo lo que SQL no hace bien: llamar APIs, leer archivos raros, lógica compleja, automatizar tareas y escribir pipelines.
ver: Variable, Función, Entorno virtual, pandas

## Variable
alias: variables
nino: Una variable es una **caja con una etiqueta**: en la caja "edad" guardas el número 8. Cuando necesitas la edad, buscas la caja por su etiqueta. Y puedes cambiar lo que hay adentro.
que: Un nombre que referencia un valor: `total = 359.97`. En Python no se declara el tipo; el valor lo tiene (`int`, `float`, `str`, `bool`, `list`, `dict`…). Por convención, los nombres van en `snake_case`.
ejemplo:
```python
ciudad = "Lima"
pedidos = 42
ticket_promedio = 1250.5 / pedidos
```
para: Guardar resultados intermedios y darles nombres que expliquen qué son.
ver: Función, Tipo de dato

## Función
alias: funciones, def
nino: Una función es una **máquina de jugo**: le pones naranjas (entradas), aprietas el botón y te da jugo (salida). La armas una vez y la usas todas las veces que quieras.
que: Un bloque de código con nombre que recibe **parámetros**, hace algo y **devuelve** un resultado con `return`. Permite reutilizar lógica, probarla por separado y darle un nombre que explique qué hace.
ejemplo:
```python
def precio_con_iva(precio: float, iva: float = 0.21) -> float:
    """Devuelve el precio con IVA, redondeado a 2 decimales."""
    return round(precio * (1 + iva), 2)

precio_con_iva(100)        # 121.0
```
para: Las reglas de negocio (validar un pedido, calcular un prorrateo) se escriben como funciones y se prueban con pytest.
ver: Prueba unitaria, Variable

## Lista
alias: list, listas
nino: Una lista es una **fila de cosas en orden**: los nombres de tus amigos, uno detrás del otro. Puedes agregar uno al final, sacar uno, o preguntar "¿quién es el tercero?".
que: Una colección **ordenada** y modificable de valores: `[3, 1, 2]`. Se accede por posición (empezando en 0), se recorre con `for` y se transforma con comprensiones (`[x * 2 for x in numeros]`).
ejemplo:
```python
ciudades = ["Lima", "Bogotá", "Quito"]
ciudades.append("Cusco")
ciudades[0]                          # 'Lima'
largas = [c for c in ciudades if len(c) > 4]
```
para: Guardar varias cosas del mismo tipo y procesarlas una por una.
ver: Diccionario, Bucle

## Diccionario
alias: dict, diccionarios
nino: Un diccionario es como una **agenda de teléfonos**: buscas por el nombre (la clave) y encuentras el número (el valor). No hace falta recorrer toda la agenda.
que: Una colección de pares **clave → valor**: `{"id": 1, "ciudad": "Lima"}`. Se accede por clave en tiempo constante. Es la forma natural de representar un registro o un objeto JSON en Python.
ejemplo:
```python
pedido = {"id": 1042, "estado": "entregado", "total": 359.97}
pedido["estado"]                     # 'entregado'
pedido.get("cupon", 0)               # 0 si no existe la clave
conteo = {}
for estado in ["ok", "error", "ok"]:
    conteo[estado] = conteo.get(estado, 0) + 1   # {'ok': 2, 'error': 1}
```
para: Representar registros, contar, agrupar y leer JSON.
ver: Lista, JSON

## Bucle
alias: for, while, loop
nino: Un bucle es **repetir algo para cada cosa**: "para cada amigo de la lista, mándale una invitación". En vez de escribir 30 veces "mandar invitación", lo escribes una vez dentro del bucle.
que: Estructura que repite instrucciones: `for` recorre una colección (lista, diccionario, archivo, rango) y `while` repite mientras se cumpla una condición. `break` corta el bucle y `continue` pasa al siguiente.
ejemplo:
```python
for linea in open("logs/pipeline.log"):
    if "ERROR" in linea:
        print(linea.strip())
```
para: Procesar archivos línea por línea, recorrer resultados de una API, reintentar algo hasta que funcione.
cuidado: Con muchos datos, recorrer fila por fila en Python es lento: para tablas grandes se usan operaciones vectorizadas (pandas) o SQL/Spark.
ver: Lista, pandas

## Excepción
alias: excepciones, try, except, error
nino: Una excepción es **un "¡ay!" del programa**: algo salió mal (el archivo no existe, dividiste por cero). Con `try/except` le enseñas qué hacer cuando pasa: "si el vaso se cae, trae otro".
que: Un error que interrumpe la ejecución (`FileNotFoundError`, `KeyError`, `ValueError`, `ZeroDivisionError`). Con `try: … except TipoDeError: …` se captura y se maneja; con `raise` se lanza una a propósito (por ejemplo, cuando un dato no cumple una regla).
ejemplo:
```python
try:
    tasa = ausentes / turnos
except ZeroDivisionError:
    tasa = None                       # día sin turnos: no hay tasa
if total < 0:
    raise ValueError(f"total negativo en el pedido {pedido_id}")
```
para: Que un pipeline falle con un mensaje claro (o se recupere) en vez de producir datos incorrectos.
cuidado: `except Exception: pass` esconde los errores: el pipeline "funciona" y los datos quedan mal. Captura solo lo que sabes manejar.
ver: Función, Prueba unitaria

## Prueba unitaria
alias: test, tests, pruebas, pytest, unit test
nino: Es **probar una pieza por separado antes de armar el juguete**: antes de armar el auto de carreras, pruebas que cada rueda gire bien. Si algo falla después, sabes que no es la rueda.
que: Código que verifica que una función hace lo que debe con casos conocidos, usando `assert`. Con **pytest**, cada función `test_*` en un archivo `test_*.py` es una prueba; `pytest` las corre todas y dice cuáles fallan. Las pruebas se ejecutan en cada cambio (CI).
ejemplo:
```python
# test_reglas.py
from reglas import precio_con_iva

def test_iva_por_defecto():
    assert precio_con_iva(100) == 121.0

def test_iva_reducido():
    assert precio_con_iva(100, iva=0.105) == 110.5
```
para: Cambiar código sin miedo: si rompes algo, una prueba lo avisa antes de que llegue a producción.
ver: Función, CI/CD

## Entorno virtual
alias: venv, virtualenv, .venv
nino: Es **una mochila distinta para cada materia**: en la de matemática llevas la calculadora y la regla; en la de arte, los pinceles. Así no mezclas cosas y siempre tienes lo justo para cada clase.
que: Una carpeta (normalmente `.venv`) con un intérprete de Python y sus propios paquetes, aislada del Python del sistema y de otros proyectos. Se crea con `python -m venv .venv` o `uv venv` y se activa con `source .venv/bin/activate`.
ejemplo: El proyecto A usa pandas 1.5 y el B pandas 2.2: cada uno tiene su `.venv` y no chocan.
para: Que cada proyecto tenga exactamente las versiones que necesita y se pueda reproducir en otra máquina.
cuidado: La carpeta `.venv` no va a Git: lo que se comparte es la lista de dependencias (`pyproject.toml` y el archivo de bloqueo).
ver: uv, Archivo de bloqueo, pip

## pip
alias: pip install
nino: pip es la **tienda de aplicaciones de Python**: le dices "quiero pandas" y lo descarga e instala.
que: El instalador de paquetes estándar de Python: descarga paquetes del índice PyPI (`pip install pandas`), los lista (`pip list`) y exporta versiones (`pip freeze > requirements.txt`). Siempre se usa dentro de un entorno virtual.
ejemplo:
```bash
python -m venv .venv && source .venv/bin/activate
pip install "pandas==2.2.3" duckdb
pip freeze > requirements.txt
```
para: Instalar las librerías de un proyecto.
ver: uv, Entorno virtual

## uv
alias: astral uv
nino: uv es como pip pero **con superpoderes**: instala todo muchísimo más rápido, crea la mochila (entorno virtual) solo y anota exactamente qué versiones usaste.
que: Gestor de proyectos y paquetes de Python (de Astral) que reemplaza a pip, venv, pip-tools y pyenv: `uv init` crea el proyecto, `uv add` agrega dependencias y actualiza `uv.lock`, `uv sync` deja el entorno igual al lock, `uv run` ejecuta dentro del entorno y `uv python install` instala versiones de Python.
ejemplo:
```bash
uv init ingesta && cd ingesta
uv add pandas duckdb
uv add --dev pytest ruff
uv run pytest
```
para: Proyectos reproducibles y rápidos de instalar, en tu máquina y en la CI.
ver: Entorno virtual, Archivo de bloqueo, pip

## Archivo de bloqueo
alias: lock file, uv.lock, requirements.txt, lockfile
nino: Es la **lista exacta de compras con marca y tamaño**: no dice "leche", dice "leche marca X, 1 litro, descremada". Así, si otra persona hace las compras, trae exactamente lo mismo.
que: Un archivo que registra la **versión exacta** de cada dependencia (y de las dependencias de las dependencias) instalada. Con él, cualquier máquina reconstruye el mismo entorno. Ejemplos: `uv.lock`, `poetry.lock`, `requirements.txt` con `==`, y en Terraform `.terraform.lock.hcl`.
ejemplo: `pyproject.toml` dice `pandas>=2.2`; `uv.lock` dice `pandas==2.2.3` y `numpy==2.1.3`. Mañana sale pandas 2.3, pero tu proyecto sigue instalando 2.2.3 hasta que decidas actualizar.
para: Evitar el "en mi máquina funciona" y que el pipeline se rompa solo cuando sale una versión nueva de una librería.
ver: uv, Entorno virtual

## pandas
alias: pd
nino: pandas es como **Excel dentro de Python**: tablas con filas y columnas que puedes filtrar, ordenar, sumar y unir escribiendo instrucciones en vez de hacer clics.
que: La librería de Python para manipular datos tabulares en memoria con **DataFrames**: leer CSV/Parquet/SQL, filtrar, agrupar (`groupby`), unir (`merge`), pivotear y escribir resultados. Funciona en una sola máquina y con datos que entran en la memoria.
ejemplo:
```python
import pandas as pd
df = pd.read_csv("datos/clientes.csv")
por_pais = df.groupby("pais").size().sort_values(ascending=False)
```
para: Análisis y transformaciones de datos chicos y medianos, scripts de ingesta, exploración.
cuidado: Con datos que no entran en memoria hay que pasar a DuckDB, Polars o Spark. Y los bucles fila por fila (`iterrows`) son muy lentos.
ver: DataFrame, Python, Spark

## Clase
alias: POO, programación orientada a objetos, class
nino: Una clase es un **molde para hacer galletitas**: el molde define la forma; cada galletita que sacas es un objeto. Todas tienen la misma forma, pero cada una puede tener distinto chocolate encima.
que: En programación orientada a objetos, una clase define un tipo de objeto con **atributos** (datos) y **métodos** (funciones que actúan sobre esos datos). Cada objeto creado a partir de ella es una instancia. En datos se usan para clientes de APIs, conectores y configuraciones (`dataclass`).
ejemplo:
```python
from dataclasses import dataclass

@dataclass
class Pedido:
    pedido_id: int
    total: float
    estado: str = "pendiente"

    def esta_entregado(self) -> bool:
        return self.estado == "entregado"
```
para: Agrupar datos y comportamiento relacionados; muchas librerías (Airflow, PySpark) se usan a través de clases.
ver: Función, Python

## Decorador
alias: decoradores, @
nino: Un decorador es **ponerle un accesorio a una función** sin cambiarla por dentro: como ponerle un casco a la bici; la bici es la misma, pero ahora además protege.
que: Una función que recibe otra función y le agrega comportamiento (medir el tiempo, reintentar, registrar logs). Se aplica con `@nombre` encima de la definición. Airflow (TaskFlow), pytest y muchas librerías los usan.
ejemplo:
```python
import time

def medir(f):
    def envuelta(*args, **kwargs):
        t = time.time()
        r = f(*args, **kwargs)
        print(f"{f.__name__} tardó {time.time() - t:.2f} s")
        return r
    return envuelta

@medir
def cargar(): ...
```
para: Reutilizar comportamientos transversales sin repetir código.
ver: Función, TaskFlow

## Generador
alias: yield, generadores
nino: Un generador es como una **máquina de pompas de jabón**: no fabrica todas las pompas de golpe; te da una cada vez que soplas. Así no necesitas un lugar enorme para guardarlas todas.
que: Una función que usa `yield` para producir valores **de a uno**, a pedido, en lugar de construir una lista completa en memoria. Ideal para procesar archivos o resultados de APIs muy grandes.
ejemplo:
```python
def paginas(api):
    pagina = 1
    while True:
        datos = api.get(pagina)
        if not datos:
            return
        yield from datos
        pagina += 1

for registro in paginas(api):     # procesa sin cargar todo en memoria
    ...
```
para: Leer datos grandes en streaming, paginar APIs, pipelines de procesamiento livianos.
ver: Bucle, API

## Linter
alias: ruff, flake8, formateador
nino: Es la **maestra que corrige la prolijidad**: no te dice si la respuesta está bien, pero marca la letra fea, las palabras mal escritas y las cosas que te olvidaste.
que: Herramientas que analizan el código sin ejecutarlo para encontrar errores probables (variables sin usar, imports que faltan) y aplicar un **formato estándar**. En Python, **ruff** hace las dos cosas (`ruff check`, `ruff format`); para SQL existe **sqlfluff**.
ejemplo: `ruff check .` encuentra `F401 'os' imported but unused`; `ruff format .` acomoda sangrías y comillas igual que el resto del equipo.
para: Código uniforme y menos errores tontos; se corre en pre-commit y en la CI.
ver: Prueba unitaria, CI/CD

## Variable de entorno
alias: variables de entorno, env, .env, environment variable
nino: Es una **nota pegada en la puerta de la casa** que cualquiera que entra puede leer: "la clave del wifi es…". Los programas leen esas notas para saber cómo configurarse, sin que la información esté escrita en el programa.
que: Un par nombre=valor que el sistema operativo le pasa a los programas (`HOME`, `PATH`, `AWS_PROFILE`, `POSTGRES_URL`). Se definen con `export NOMBRE=valor`, en un archivo `.env` (leído con python-dotenv) o por la plataforma (Airflow, Docker, la CI). Es la forma estándar de pasar **configuración y secretos** sin escribirlos en el código.
ejemplo:
```python
import os
url = os.environ["POSTGRES_URL"]          # falla si no está definida
entorno = os.getenv("ENTORNO", "dev")     # con valor por defecto
```
para: El mismo código corre en dev y en prod con distinta configuración.
cuidado: El archivo `.env` va en `.gitignore`. Se comparte un `.env.example` con los nombres, sin los valores.
ver: Secreto, PATH

## PATH
alias: $PATH
nino: Es la **lista de cajones donde la computadora busca las herramientas**. Cuando escribes `python`, revisa esos cajones en orden hasta encontrarlo. Si la herramienta está en un cajón que no está en la lista, dice "no la encuentro".
que: La variable de entorno con la lista de carpetas donde la terminal busca los programas que escribes. `echo $PATH` la muestra y `which python` dice qué archivo se ejecuta. Los instaladores (Homebrew, uv, el SDK de Google) agregan sus carpetas al PATH.
ejemplo: Instalaste Homebrew y `brew` da "command not found": falta agregar `/opt/homebrew/bin` al PATH (las líneas que muestra el instalador).
para: Entender y arreglar errores de "comando no encontrado" o de "se ejecuta otra versión".
ver: Variable de entorno, Terminal
