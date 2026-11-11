---
titulo: Python profesional: entornos, paquetes, tests y estilo
nivel: Avanzado
duracion: 30
resumen: venv, pip, estructura de proyecto, pytest, logging, typing, linters y configuración.
objetivos: Aislar las dependencias de cada proyecto con entornos virtuales | Organizar un proyecto de Python en carpetas con código, tests y configuración | Escribir tests con pytest siguiendo preparar, ejecutar y verificar | Registrar el progreso con logging y leer secretos desde variables de entorno
prerrequisitos: python-funciones | fundamentos-git
autoevaluacion: ¿Puedes crear un entorno virtual, instalar paquetes y guardar las versiones? | ¿Puedes escribir un test con `assert` para una función de limpieza, incluidos los casos borde? | ¿Sabes qué nivel de log usar para "cargué 12.000 filas" y para "descarté 12 filas"? | ¿Sabes dónde debe estar la contraseña de la base de producción? | ¿Puedes señalar cinco problemas en un script "rápido" y cómo corregirlos?
---

<!-- estandar:escenario -->
:::escenario El script que solo funciona en la computadora de Pedro
Martín te pasa un script que alguien escribió hace un año:

> "Pedro se fue de la empresa y nadie más lo puede correr: tiene rutas de su computadora, una contraseña escrita adentro y ningún test. Convertilo en algo que el equipo pueda mantener."

Que el código funcione en tu computadora es el primer paso. Que **otros** lo puedan instalar, probar, entender y ejecutar en producción es lo que hace a un profesional.
:::
Escribir código que funciona en tu notebook es el primer paso. Escribir código que **otros pueden usar, probar y mantener** es lo que hace un profesional.

:::analogia En palabras simples
Escribir un programa que funciona en tu computadora es como cocinar en tu casa. Hacerlo de forma profesional es como cocinar en un restaurante: cada ingrediente etiquetado (dependencias), recetas probadas antes de servir (tests), un registro de lo que pasó en cada turno (logs) y la cocina siempre ordenada igual (estilo). Así cualquiera del equipo puede seguir tu trabajo.
:::

## Instalar Python en tu computadora

- Descarga Python 3.11 o superior desde python.org (en Windows marca “Add Python to PATH”), o usa el gestor de tu sistema.
- Editor recomendado: **VS Code** con la extensión de Python.
- Verifica: `python --version` (o `python3 --version`).

## Entornos virtuales: un proyecto, sus dependencias

Cada proyecto necesita versiones distintas de librerías. Un **entorno virtual** es una carpeta aislada con su propio Python y paquetes.

```bash norun
python -m venv .venv                 # crear
source .venv/bin/activate            # activar (Windows: .venv\Scripts\activate)
pip install pandas requests pytest   # instalar paquetes
pip freeze > requirements.txt        # guardar versiones exactas
pip install -r requirements.txt      # reinstalar en otra máquina
deactivate
```

:::nota Herramientas modernas
`uv` y `poetry` hacen lo mismo más rápido y con mejor manejo de versiones (`pyproject.toml`). En equipos nuevos se usa mucho **uv**: `uv venv`, `uv pip install`, `uv run`.
:::

## Estructura de un proyecto

```text
mi_pipeline/
├── pyproject.toml          # metadatos y dependencias
├── README.md
├── .gitignore              # .venv/, __pycache__/, .env
├── src/mi_pipeline/
│   ├── __init__.py
│   ├── extraer.py
│   ├── transformar.py
│   └── cargar.py
└── tests/
    └── test_transformar.py
```

## Tests con pytest

Un **test** es código que verifica que tu código hace lo que debe. Puede parecer trabajo extra, pero en datos es lo que te permite dormir tranquilo: si mañana alguien cambia la función `limpiar_email` y rompe un caso, el test falla **antes** de que el error llegue a producción y a los reportes.

Cada test sigue tres pasos (*arrange, act, assert*): **preparar** una entrada, **ejecutar** la función, **verificar** con `assert` que el resultado es el esperado. Con `pytest`, cualquier función cuyo nombre empiece con `test_`, en un archivo que empiece con `test_`, se ejecuta automáticamente con el comando `pytest`. En los equipos profesionales los tests corren solos en cada Pull Request (**CI**, integración continua): si alguno falla, no se puede fusionar el cambio.

Los ejercicios de este curso funcionan exactamente así: tu código + unos `assert` que lo verifican.

```python norun
# tests/test_transformar.py
import pytest
from mi_pipeline.transformar import limpiar_email

def test_limpia_espacios_y_mayusculas():
    assert limpiar_email("  Ana@Mail.COM ") == "ana@mail.com"

def test_email_vacio_devuelve_none():
    assert limpiar_email("") is None

@pytest.mark.parametrize("entrada", ["sin-arroba", "  ", None])
def test_invalidos(entrada):
    assert limpiar_email(entrada) is None
```

```recorrido
titulo: Un test que falla, se arregla y pasa
estacion test: El test | icono=prueba
estacion rojo: Falla | icono=x
estacion leer: Leer el error | icono=lupa
estacion fix: Arreglar | icono=transformar
estacion verde: Pasa | icono=check
paso test: Escribir lo que esperas
Un test es una función que empieza con `test_` y usa `assert`. Describe el comportamiento esperado con ejemplos concretos.
>>> python
# tests/test_limpieza.py
from limpieza import normalizar_nombre

def test_quita_espacios_y_capitaliza():
    assert normalizar_nombre("  ana ") == "Ana"

def test_nombre_vacio_devuelve_none():
    assert normalizar_nombre("   ") is None
paso rojo: pytest: uno falla
La primera versión de la función no contemplaba el nombre vacío.
>>> log
$ pytest -q
.F                                                          [100%]
=================================== FAILURES ===================================
_______________________ test_nombre_vacio_devuelve_none ________________________
>       assert normalizar_nombre("   ") is None
E       AssertionError: assert '' is None
E        +  where '' = normalizar_nombre('   ')
1 failed, 1 passed in 0.03s
paso leer: Leer el error
pytest muestra **qué** se esperaba y **qué** llegó: la función devolvió `''` (texto vacío) en lugar de `None`.
>>> texto
esperado: None
recibido: ''
paso fix: Arreglar el código, no el test
El test describe la regla de negocio; el código se adapta a ella.
>>> python
def normalizar_nombre(texto):
    limpio = texto.strip().title()
    return limpio or None
paso verde: Todo en verde
Desde ahora, si alguien rompe esta regla, el test lo avisa antes de que llegue a producción.
>>> log
$ pytest -q
..                                                          [100%]
2 passed in 0.02s
```

## Logging en vez de print

En producción nadie mira la pantalla: tu código corre a las 3 de la mañana en un servidor, dentro de Airflow o de un job de Databricks. Los mensajes van a **logs**, archivos o sistemas donde se guardan para revisarlos después (o para disparar alertas). El módulo `logging` agrega a cada mensaje la fecha, el **nivel** de importancia y de qué parte del código viene:

| Nivel | Para qué |
|---|---|
| `DEBUG` | Detalles para depurar (normalmente apagado en producción) |
| `INFO` | El progreso normal: "leí 3 archivos", "cargué 12.000 filas" |
| `WARNING` | Algo raro pero no grave: "descarté 12 filas inválidas" |
| `ERROR` | Algo falló |
| `CRITICAL` | El proceso no puede seguir |

```python
import logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s", force=True)
log = logging.getLogger("pipeline.ventas")

log.info("Leyendo %d archivos", 3)
log.warning("Se descartaron %d filas inválidas", 12)
log.error("No se pudo conectar a la base")
```

## Configuración y secretos

Nunca escribas contraseñas en el código. Léelas de **variables de entorno** (o de un gestor de secretos como Azure Key Vault):

```python norun
import os
password = os.environ["DB_PASSWORD"]               # falla si no existe: mejor que un default silencioso
entorno = os.getenv("AMBIENTE", "desarrollo")
```

## Estilo y calidad

- **PEP 8**: la guía de estilo oficial (4 espacios, `snake_case`, líneas no muy largas).
- **Ruff** o **Black**: formatean y revisan el código automáticamente.
- **mypy**: verifica los *type hints*.
- **pre-commit**: corre todo eso antes de cada commit.

## Ejemplo resuelto: de script suelto a código profesional

Martín te pasa este script, que alguien escribió hace un año y que "a veces falla":

```python norun
# limpiar.py
import csv
f = open("C:/Users/pedro/Desktop/clientes.csv")
for r in csv.reader(f):
    print(r[3].lower().strip())
password = "Andina2023!"
```

Problemas, uno por uno: una ruta que solo existe en la computadora de Pedro, un archivo que nunca se cierra, `r[3]` (¿qué columna es?), `print` en vez de logging, ninguna prueba, y una **contraseña** escrita en el código (que ya está en Git). Así queda la versión profesional, separada en una función que se puede probar:

```python
import csv
import io
import logging
import os

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s", force=True)
log = logging.getLogger("limpiar_emails")


def limpiar_email(email: str | None) -> str | None:
    """Devuelve el email en minúsculas y sin espacios, o None si no es válido."""
    if not email or "@" not in email:
        return None
    return email.strip().lower()


def procesar(archivo) -> list[str]:
    emails, descartados = [], 0
    for fila in csv.DictReader(archivo):          # por nombre de columna, no por posición
        e = limpiar_email(fila.get("email"))
        if e is None:
            descartados += 1
        else:
            emails.append(e)
    log.info("%d emails válidos, %d descartados", len(emails), descartados)
    return emails


# --- los tests (en un proyecto real irían en tests/test_limpiar.py) ---
def test_limpia_espacios_y_mayusculas():
    assert limpiar_email("  Ana@Mail.COM ") == "ana@mail.com"

def test_invalidos_devuelven_none():
    for malo in ["", None, "sin-arroba"]:
        assert limpiar_email(malo) is None

test_limpia_espacios_y_mayusculas()
test_invalidos_devuelven_none()
print("✓ tests OK")

# --- uso: la ruta y el secreto vienen de afuera ---
ruta = os.getenv("RUTA_CLIENTES", "datos/clientes.csv")
datos = io.StringIO("cliente_id,email\n1,  Ana@Mail.COM \n2,\n3,luis@correo.com\n")   # en tu máquina: open(ruta, encoding="utf-8")
print(procesar(datos))
```

Qué cambió y por qué:

| Antes | Después | Por qué |
|---|---|---|
| Ruta fija de una computadora | `os.getenv("RUTA_CLIENTES", ...)` | El mismo código corre en tu máquina, en CI y en producción |
| `r[3]` | `fila.get("email")` con `DictReader` | Si el archivo agrega una columna, no se rompe |
| Todo suelto | Una función pura `limpiar_email` | Se puede probar sola, con casos borde |
| `print` | `logging` con nivel y nombre | En producción los logs se guardan y se buscan |
| Sin pruebas | Tests con `assert` | Si alguien cambia la lógica y la rompe, se entera antes de producción |
| Contraseña en el código | Variable de entorno o gestor de secretos | El repositorio lo lee toda la empresa |

Y en el repositorio: un `pyproject.toml` (o `requirements.txt`) con las dependencias, un `.gitignore` con `.venv/` y `.env`, y CI que ejecute `pytest` y `ruff` en cada pull request.

<!-- estandar:errores -->
:::errores
- **Instalar paquetes sin entorno virtual**: terminan mezclados con los de otros proyectos y del sistema, y un día una actualización rompe todo.
- **`requirements.txt` sin versiones**: `pandas` a secas instala la última versión, que puede cambiar el comportamiento. Fija las versiones (`pandas==2.2.2`) o usa un archivo de bloqueo.
- **Tests que dependen de la red o de una base real**: son lentos y fallan por razones ajenas al código. Prueba las funciones de transformación con datos chicos escritos en el test.
- **Subir el `.env`**: agrega `.env` al `.gitignore` antes del primer commit.
:::

<!-- estandar:trabajo -->
:::trabajo
- En los equipos de datos, cada pull request ejecuta en CI los tests (`pytest`), el linter (`ruff`) y a veces el chequeo de tipos (`mypy`). Si algo falla, no se puede unir el cambio.
- Los logs de los pipelines terminan en sistemas centralizados (CloudWatch, Azure Monitor, Datadog), donde se buscan y se configuran alertas. Un buen mensaje de log incluye siempre **cuántas filas** se procesaron.
:::

## Ejercicios

:::ejercicio quiz
Clonaste un repo con un `requirements.txt`. ¿Cuál es el orden correcto?

- [ ] `pip install -r requirements.txt` y luego crear el entorno
- [x] Crear y activar un entorno virtual, y luego `pip install -r requirements.txt`
- [ ] Copiar las librerías de otro proyecto
- [ ] Instalar todo con `sudo pip` en el Python del sistema
:::

:::ejercicio quiz
¿Dónde debería estar la contraseña de la base de datos de producción?

- [ ] En una constante al inicio del script
- [ ] En el README para que el equipo la encuentre
- [x] En una variable de entorno o un gestor de secretos (Key Vault, Databricks secrets…)
- [ ] En un comentario del código
:::

:::ejercicio python
Escribe una función de test `test_suma_iva()` (estilo pytest, con `assert`) que verifique que `con_iva(100)` devuelve `121.0` y que `con_iva(0)` devuelve `0`. La función `con_iva` ya está escrita.
```python inicial
def con_iva(precio, tasa=0.21):
    return round(precio * (1 + tasa), 2)

def test_suma_iva():
    pass
```
```python solucion
def con_iva(precio, tasa=0.21):
    return round(precio * (1 + tasa), 2)

def test_suma_iva():
    assert con_iva(100) == 121.0
    assert con_iva(0) == 0
```
```python test
import inspect
src = inspect.getsource(test_suma_iva)
assert "assert" in src, "Tu test debe usar assert"
assert "con_iva(100)" in src and "con_iva(0)" in src, "Prueba con_iva(100) y con_iva(0)"
test_suma_iva()
_orig = con_iva
def con_iva(precio, tasa=0.21):
    return precio
try:
    test_suma_iva()
    raise AssertionError("Tu test no detecta una implementación incorrecta de con_iva")
except AssertionError as e:
    if "no detecta" in str(e):
        raise
```
:::

### Más práctica

:::ejercicio python titulo="Tu primer test"
Escribe la función `test_con_iva()` que verifique con `assert` que `con_iva(1000)` da `1190` y que `con_iva(0)` da `0`. (pytest ejecuta solo las funciones que empiezan con `test_`).
```python inicial
def con_iva(neto):
    return round(neto * 1.19)

def test_con_iva():
    pass
```
```python solucion
def con_iva(neto):
    return round(neto * 1.19)

def test_con_iva():
    assert con_iva(1000) == 1190
    assert con_iva(0) == 0
```
```python test
test_con_iva()
import inspect
src = inspect.getsource(test_con_iva)
assert src.count("assert") >= 2, "El test debe tener al menos dos assert"
_orig = con_iva
con_iva = lambda n: 0
try:
    test_con_iva(); _paso = True
except AssertionError:
    _paso = False
con_iva = _orig
assert not _paso, "Tu test no detecta una función rota: debe comparar contra los valores esperados"
```
:::

:::ejercicio python titulo="Probar el caso borde"
`promedio(valores)` falla con una lista vacía. Arréglala para que devuelva `None` en ese caso, y escribe `test_promedio()` que pruebe una lista normal y la vacía.
```python inicial
def promedio(valores):
    return sum(valores) / len(valores)

def test_promedio():
    pass
```
```python solucion
def promedio(valores):
    if not valores:
        return None
    return sum(valores) / len(valores)

def test_promedio():
    assert promedio([2, 4]) == 3
    assert promedio([]) is None
```
```python test
test_promedio()
assert promedio([]) is None and promedio([1, 2, 3]) == 2
```
:::

:::ejercicio python titulo="logging en vez de print"
Configura un logger llamado `etl` y registra con `logger.info` el mensaje `cargadas 120 filas` y con `logger.warning` el mensaje `3 filas rechazadas`. Usa `logging.getLogger("etl")`.
```python inicial
import logging
logger = None
```
```python solucion
import logging
logger = logging.getLogger("etl")
logger.info("cargadas %d filas", 120)
logger.warning("%d filas rechazadas", 3)
```
```python test
import logging
assert isinstance(logger, logging.Logger) and logger.name == "etl"
assert "print(" not in _codigo, "No uses print: usa el logger"
assert "logger.info" in _codigo and "logger.warning" in _codigo
```
:::

:::ejercicio python titulo="Configuración por entorno"
Escribe `leer_config(env)` que reciba un diccionario de variables de entorno y devuelva un diccionario con `tabla` (variable `TABLA`, por defecto `"pedidos"`), `lote` (variable `LOTE` como entero, por defecto `500`) y `debug` (`True` solo si `DEBUG` vale `"1"`).
```python inicial
def leer_config(env):
    pass
```
```python solucion
def leer_config(env):
    return {
        "tabla": env.get("TABLA", "pedidos"),
        "lote": int(env.get("LOTE", "500")),
        "debug": env.get("DEBUG") == "1",
    }
```
```python test
assert leer_config({}) == {"tabla": "pedidos", "lote": 500, "debug": False}
assert leer_config({"TABLA": "clientes", "LOTE": "50", "DEBUG": "1"}) == {"tabla": "clientes", "lote": 50, "debug": True}
```
:::

:::ejercicio python titulo="El secreto fuera del código"
Este código tiene la contraseña escrita adentro. Cámbialo para que la lea de `os.environ["DB_PASSWORD"]` y que, si no está definida, lance `RuntimeError("falta DB_PASSWORD")`. Guarda la función en `obtener_password()`.
```python inicial
import os

def obtener_password():
    return "Sup3rS3cr3t0!"
```
```python solucion
import os

def obtener_password():
    valor = os.environ.get("DB_PASSWORD")
    if not valor:
        raise RuntimeError("falta DB_PASSWORD")
    return valor
```
```python test
import os
assert "Sup3rS3cr3t0" not in _codigo, "La contraseña no puede quedar escrita en el código"
os.environ["DB_PASSWORD"] = "abc"
assert obtener_password() == "abc"
del os.environ["DB_PASSWORD"]
try:
    obtener_password(); assert False, "Sin la variable debería lanzar RuntimeError"
except RuntimeError as e:
    assert "DB_PASSWORD" in str(e)
```
:::

:::ejercicio python titulo="Refactorizar: funciones chicas"
El script hace todo junto. Sepáralo en `limpiar(filas)` (quita espacios y pasa a minúsculas el campo `email`), `validar(filas)` (deja las filas con `@` en el email) y `resumir(filas)` (devuelve la cantidad). Al final, `resultado = resumir(validar(limpiar(datos)))`.
```python inicial
datos = [{"email": " A@X.COM"}, {"email": "malo"}, {"email": "b@x.com "}]
n = 0
for f in datos:
    e = f["email"].strip().lower()
    if "@" in e:
        n += 1
resultado = n
```
```python solucion
datos = [{"email": " A@X.COM"}, {"email": "malo"}, {"email": "b@x.com "}]

def limpiar(filas):
    return [{**f, "email": f["email"].strip().lower()} for f in filas]

def validar(filas):
    return [f for f in filas if "@" in f["email"]]

def resumir(filas):
    return len(filas)

resultado = resumir(validar(limpiar(datos)))
```
```python test
assert resultado == 2
assert limpiar([{"email": " X@Y.Z "}]) == [{"email": "x@y.z"}]
assert validar([{"email": "a"}, {"email": "a@b"}]) == [{"email": "a@b"}]
assert resumir([1, 2, 3]) == 3
```
:::

:::ejercicio python titulo="Type hints"
Agrega type hints a `total_por_pais`: recibe una lista de tuplas `(str, float)` y devuelve `dict[str, float]`. Completa también el cuerpo.
```python inicial
def total_por_pais(ventas):
    pass
```
```python solucion
def total_por_pais(ventas: list[tuple[str, float]]) -> dict[str, float]:
    totales: dict[str, float] = {}
    for pais, monto in ventas:
        totales[pais] = totales.get(pais, 0.0) + monto
    return totales
```
```python test
assert total_por_pais([("CL", 10.0), ("PE", 5.0), ("CL", 2.5)]) == {"CL": 12.5, "PE": 5.0}
assert total_por_pais.__annotations__.get("return") is not None, "Falta la anotación del tipo de retorno (-> ...)"
assert "ventas" in total_por_pais.__annotations__, "Falta la anotación del parámetro ventas"
```
:::
