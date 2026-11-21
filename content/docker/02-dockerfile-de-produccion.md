---
titulo: Un Dockerfile de producción para un proyecto de datos
nivel: Avanzado
duracion: 60
resumen: Escribes, paso a paso, la imagen de un pipeline de Python como la pide un equipo en producción - versión fija de la base, dependencias con uv y su lockfile, build en dos etapas, usuario sin privilegios, configuración por variables de entorno, secretos que nunca quedan en la imagen y un comando en forma de lista para que el contenedor se detenga bien. El corrector revisa tu Dockerfile contra esa lista de requisitos.
objetivos: Instalar dependencias de Python con uv y el lockfile de forma reproducible | Ejecutar el contenedor con un usuario sin privilegios | Configurar el pipeline con variables de entorno leídas al arrancar | Usar secretos de build y de ejecución sin dejarlos en ninguna capa | Escribir CMD en forma de lista y explicar por qué importa para detener el contenedor
prerrequisitos: docker-capas-y-cache | local-python-uv
autoevaluacion: ¿Por qué uv sync --frozen y no uv sync a secas? | ¿Qué riesgo tiene correr el contenedor como root? | ¿Dónde va la contraseña de la base: en el Dockerfile, en un ARG o en otro lado? | ¿Qué diferencia hay entre CMD python app.py y CMD ["python", "app.py"]?
---

:::analogia En palabras simples
Un Dockerfile de producción es una receta escrita para que cualquiera la cocine igual, en cualquier cocina, sin acceso a tu alacena privada: ingredientes con marca y fecha (versiones fijas), pasos en orden (caché), sin la llave de la caja fuerte pegada en la receta (secretos) y con un cocinero que no tiene la llave de todo el edificio (usuario sin privilegios).
:::

## La lista de requisitos

| Requisito | Cómo se cumple | Por qué |
|---|---|---|
| Base con versión fija | `FROM python:3.13-slim` | Builds reproducibles |
| Dependencias reproducibles | `COPY pyproject.toml uv.lock ./` y `uv sync --frozen --no-dev` | `--frozen` instala exactamente el lockfile y falla si no coincide |
| Caché aprovechada | Dependencias antes que el código | Cambiar código no reinstala todo |
| Imagen final chica | Dos etapas: construir y ejecutar | Sin herramientas de build en producción |
| Sin privilegios | `RUN useradd ...` y `USER app` | Si alguien explota el proceso, no es root del contenedor |
| Configuración externa | `ENV` solo con valores no secretos; el resto al ejecutar | La misma imagen sirve en desarrollo y producción |
| Detención limpia | `CMD ["python", "-m", "pipeline"]` | El proceso recibe la señal de parada directamente |

```dockerfile norun
# syntax=docker/dockerfile:1
FROM python:3.13-slim AS construir
COPY --from=ghcr.io/astral-sh/uv:0.9.5 /uv /bin/uv
WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project
COPY src/ ./src/
RUN uv sync --frozen --no-dev

FROM python:3.13-slim
RUN useradd --create-home --uid 1000 app
WORKDIR /app
COPY --from=construir --chown=app:app /app /app
ENV PATH="/app/.venv/bin:$PATH" PYTHONUNBUFFERED=1
USER app
CMD ["python", "-m", "pipeline"]
```

La copia de `uv` desde su imagen oficial y el `--no-install-project` (instalar primero solo las dependencias, y el proyecto después) son los que recomienda la [guía oficial de uv con Docker](https://docs.astral.sh/uv/guides/integration/docker/). `PYTHONUNBUFFERED=1` hace que los `print` y los registros salgan enseguida en `docker logs`.

## Configuración y secretos

La imagen es **la misma** en desarrollo, prueba y producción; lo que cambia se pasa al ejecutar:

```bash norun
docker run --rm -e ENTORNO=prod -e DB_HOST=db.interna --env-file secretos.env tienda-pipeline:1.4.0
```

| Dato | Dónde va |
|---|---|
| Nivel de registro, nombre del entorno | `ENV` en el Dockerfile (con valor por defecto) o `-e` al ejecutar |
| Host de la base, rutas | `-e` al ejecutar |
| Contraseñas, tokens, claves | Un gestor de secretos (Key Vault, Secrets Manager) o variables inyectadas al ejecutar; **nunca** en el Dockerfile |
| Un token que hace falta **durante el build** (instalar desde un repositorio privado) | Un secreto de build: `RUN --mount=type=secret,id=token ...`, que no queda en ninguna capa |

:::cuidado ARG y ENV dejan rastro
Un `ARG TOKEN=...` o un `ENV DB_PASSWORD=...` queda guardado en la imagen: cualquiera con la imagen lo ve con `docker history` o `docker inspect`. Borrarlo en una capa posterior no sirve, porque la capa anterior sigue existiendo. Para el build, usa secretos de build ([documentación](https://docs.docker.com/build/building/secrets/)); para ejecutar, inyéctalos desde afuera.
:::

## CMD en forma de lista

`CMD python -m pipeline` (forma "shell") arranca un `sh` que a su vez arranca Python. Cuando Docker manda la señal de parada (`SIGTERM`), la recibe el `sh`, no tu programa, y a los 10 segundos Docker lo mata a la fuerza: tu pipeline no alcanza a cerrar conexiones ni a terminar de escribir. `CMD ["python", "-m", "pipeline"]` (forma "exec") ejecuta Python directamente y recibe la señal ([referencia del Dockerfile](https://docs.docker.com/reference/dockerfile/#cmd)).

:::practica python Una configuración que falla rápido y con claridad
1. Ejecuta: la función lee la configuración del pipeline desde un diccionario de variables de entorno, con valores por defecto y variables obligatorias.
2. Mira qué pasa si falta `DB_HOST`: el error dice exactamente qué falta, en lugar de fallar más tarde con un error confuso.
3. Agrega la variable `LOTE` (entero, por defecto 500) y valida que sea mayor que 0.

```python
import os

def cargar_config(env):
    faltan = [v for v in ("DB_HOST", "DB_PASSWORD") if not env.get(v)]
    if faltan:
        raise RuntimeError(f"Faltan variables de entorno: {', '.join(faltan)}")
    return {
        "entorno": env.get("ENTORNO", "dev"),
        "db_host": env["DB_HOST"],
        "db_password": env["DB_PASSWORD"],
        "nivel_log": env.get("NIVEL_LOG", "INFO").upper(),
    }

print(cargar_config({"DB_HOST": "localhost", "DB_PASSWORD": "x", "NIVEL_LOG": "debug"}))
try:
    cargar_config({"ENTORNO": "prod"})
except RuntimeError as e:
    print("error:", e)
# en el contenedor real: cargar_config(os.environ)
```

Reto: haz que la configuración nunca imprima la contraseña (por ejemplo, con un `__repr__` que la muestre como `***`).

Documentación oficial: [uv con Docker](https://docs.astral.sh/uv/guides/integration/docker/) · [Secretos de build](https://docs.docker.com/build/building/secrets/) · [Referencia del Dockerfile](https://docs.docker.com/reference/dockerfile/) · [Buenas prácticas](https://docs.docker.com/build/building/best-practices/)
:::

:::errores
- **`uv sync` o `pip install` sin lockfile.** Cada build puede instalar versiones distintas.
- **Correr como root.** Agrega un usuario y `USER`.
- **Secretos en `ARG` o `ENV`.** Quedan en la imagen para siempre.
- **`CMD` en forma shell.** El proceso no recibe la señal de parada.
- **Una imagen por entorno.** Construye una sola y configúrala al ejecutar.
:::

:::entrevista
**Pregunta:** "¿Cómo le pasas la contraseña de la base al contenedor del pipeline en producción?"

**Respuesta modelo:** "Nunca dentro de la imagen. El orquestador la inyecta al ejecutar: en Kubernetes, desde un Secret montado o, mejor, desde el gestor de secretos de la nube con identidad administrada, para que ni siquiera haya una contraseña si la base acepta autenticación por identidad. El programa la lee de una variable de entorno o de un archivo montado y falla al arrancar si falta. Así la misma imagen corre en todos los entornos."
:::

## Ejercicios

:::ejercicio quiz
Necesitas un token para instalar un paquete desde un repositorio privado durante el build. ¿Cuál es la forma correcta?
- [ ] `ARG TOKEN=abc123` y usarlo en el `RUN`
- [ ] `ENV TOKEN=abc123` y borrarlo con otro `RUN` al final
- [x] Un secreto de build: `RUN --mount=type=secret,id=token ...`, que no queda guardado en ninguna capa
- [ ] Copiar un archivo `.env` con el token y borrarlo después
:::

:::ejercicio python dificultad=Experto titulo="Escribe el Dockerfile de producción"
Escribe en la variable `DOCKERFILE` (un texto) el Dockerfile de producción de un pipeline de Python cuyo código está en `src/` y se ejecuta con `python -m pipeline`. El corrector verifica estos requisitos:
1. Todas las imágenes base `python` tienen versión (nada de `python` solo ni `:latest`).
2. Tiene **dos etapas o más** (dos `FROM`), y la final copia desde la primera con `COPY --from=`.
3. Copia `pyproject.toml` y `uv.lock` **antes** de copiar `src/`, y corre `uv sync` con `--frozen`.
4. Usa un usuario sin privilegios (`USER` distinto de `root` y de `0`).
5. No define variables con `PASSWORD`, `TOKEN`, `SECRET` o `KEY` en `ENV` ni `ARG`.
6. El último `CMD` está en forma de lista (empieza con `[`).
```python inicial
DOCKERFILE = """
FROM python:latest
COPY . .
RUN pip install uv && uv sync
CMD python -m pipeline
"""
```
```python solucion
DOCKERFILE = """
FROM python:3.13-slim AS construir
RUN pip install uv
WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev
COPY src/ ./src/

FROM python:3.13-slim
RUN useradd --create-home app
WORKDIR /app
COPY --from=construir --chown=app:app /app /app
ENV PATH="/app/.venv/bin:$PATH"
USER app
CMD ["python", "-m", "pipeline"]
"""
```
```pista
Empieza por la estructura: una etapa `AS construir` que instala y copia el código, y una etapa final que copia `--from=construir`, crea un usuario y lo usa.
```
```pista
El orden dentro de la primera etapa: `COPY pyproject.toml uv.lock ./`, después `RUN uv sync --frozen ...`, y recién después `COPY src/ ./src/`.
```
```python test
import re
lineas = [l.strip() for l in DOCKERFILE.splitlines() if l.strip() and not l.strip().startswith("#")]
ins = [(l.split()[0].upper(), l) for l in lineas]
froms = [l for i, l in ins if i == "FROM"]
for l in froms:
    img = l.split()[1]
    if img.startswith("python"):
        assert ":" in img and not img.endswith(":latest"), f"La imagen base debe tener versión fija: {l}"
assert len(froms) >= 2, "Debe tener al menos dos etapas (dos FROM)"
assert any(i == "COPY" and "--from=" in l for i, l in ins), "La etapa final debe copiar desde la primera con COPY --from="
idx_lock = next((k for k, (i, l) in enumerate(ins) if i == "COPY" and "uv.lock" in l and "pyproject.toml" in l), None)
idx_src = next((k for k, (i, l) in enumerate(ins) if i == "COPY" and "src" in l and "--from" not in l), None)
assert idx_lock is not None, "Falta copiar pyproject.toml y uv.lock"
assert idx_src is not None and idx_lock < idx_src, "pyproject.toml y uv.lock se copian antes que src/"
assert any(i == "RUN" and "uv sync" in l and "--frozen" in l for i, l in ins), "Falta RUN uv sync --frozen"
users = [l.split()[1] for i, l in ins if i == "USER"]
assert users and users[-1] not in ("root", "0"), "Falta un USER sin privilegios"
for i, l in ins:
    if i in ("ENV", "ARG"):
        assert not re.search(r"(PASSWORD|TOKEN|SECRET|KEY)\w*\s*=", l, re.I), f"No dejes secretos en la imagen: {l}"
cmds = [l for i, l in ins if i == "CMD"]
assert cmds and cmds[-1].split(None, 1)[1].startswith("["), "El CMD debe ir en forma de lista: CMD [\"python\", \"-m\", \"pipeline\"]"
```
:::

:::ejercicio python dificultad=Avanzado titulo="Configuración desde variables de entorno"
Escribe `cargar_config(env)` que reciba un diccionario de variables de entorno y devuelva `{"entorno", "db_host", "lote"}`. `DB_HOST` es obligatoria: si falta o está vacía, lanza `RuntimeError` con un mensaje que contenga `DB_HOST`. `ENTORNO` vale `"dev"` por defecto. `LOTE` es un entero, por defecto `500`; si no es un número entero mayor que 0, lanza `ValueError`.
```python inicial
def cargar_config(env):
    pass
```
```python solucion
def cargar_config(env):
    if not env.get("DB_HOST"):
        raise RuntimeError("Falta la variable de entorno DB_HOST")
    texto = env.get("LOTE", "500")
    try:
        lote = int(texto)
    except ValueError:
        raise ValueError(f"LOTE debe ser un entero y es {texto!r}")
    if lote <= 0:
        raise ValueError("LOTE debe ser mayor que 0")
    return {"entorno": env.get("ENTORNO", "dev"), "db_host": env["DB_HOST"], "lote": lote}
```
```pista
Las variables de entorno siempre son texto: `LOTE` llega como `"500"` y hay que convertirla con `int`.
```
```python test
assert cargar_config({"DB_HOST": "db"}) == {"entorno": "dev", "db_host": "db", "lote": 500}
assert cargar_config({"DB_HOST": "db", "ENTORNO": "prod", "LOTE": "50"})["lote"] == 50
for env in ({}, {"DB_HOST": ""}):
    try:
        cargar_config(env)
    except RuntimeError as e:
        assert "DB_HOST" in str(e), "El mensaje debe nombrar la variable que falta"
    else:
        raise AssertionError("Sin DB_HOST debe lanzar RuntimeError")
for malo in ("cero", "0", "-5"):
    try:
        cargar_config({"DB_HOST": "db", "LOTE": malo})
    except ValueError:
        pass
    else:
        raise AssertionError(f"LOTE={malo!r} debe lanzar ValueError")
```
:::
