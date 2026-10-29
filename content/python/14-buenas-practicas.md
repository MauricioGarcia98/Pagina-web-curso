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
