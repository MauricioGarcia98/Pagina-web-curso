---
titulo: Python profesional: entornos, paquetes, tests y estilo
nivel: Avanzado
duracion: 30
resumen: venv, pip, estructura de proyecto, pytest, logging, typing, linters y configuración.
---

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

Un **test** es código que verifica que tu código hace lo que debe. Se ejecutan con `pytest` y corren automáticamente en cada Pull Request (CI).

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

En producción no ves la pantalla: los mensajes van a **logs**. El módulo `logging` agrega nivel, fecha y origen:

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
