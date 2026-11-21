---
titulo: Capas, caché y el orden del Dockerfile
nivel: Avanzado
duracion: 55
resumen: Una imagen de Docker es una pila de capas, una por instrucción del Dockerfile, y Docker reutiliza las capas que no cambiaron. Entender esa caché es la diferencia entre un build de 10 segundos y uno de 10 minutos en cada cambio de código. Aprendes a predecir qué capas se reconstruyen, a ordenar el Dockerfile para aprovechar la caché, a achicar imágenes con builds de varias etapas y a revisar un Dockerfile contra las buenas prácticas oficiales.
objetivos: Explicar qué es una capa y qué invalida su caché | Predecir qué instrucciones se vuelven a ejecutar cuando cambia un archivo | Ordenar un Dockerfile de Python para que cambiar el código no reinstale las dependencias | Achicar la imagen final con un build multi-etapa | Revisar un Dockerfile y encontrar los problemas más comunes
prerrequisitos: local-docker
autoevaluacion: ¿Por qué COPY . . antes de instalar dependencias hace lentos todos los builds? | ¿Qué pasa con las capas siguientes cuando una se invalida? | ¿Qué queda en la imagen final de un build multi-etapa? | ¿Por qué no conviene usar la etiqueta latest?
---

:::analogia En palabras simples
Armar una imagen es como cocinar una torta en capas, anotando cada capa. Si cambias la crema del medio, tienes que rehacer la crema **y todo lo que va encima**, pero el bizcochuelo de abajo sirve. Por eso conviene poner abajo lo que casi nunca cambia (el sistema y las dependencias) y arriba lo que cambias todos los días (tu código).
:::

## Una capa por instrucción

```dockerfile norun
FROM python:3.13-slim              # capa 1: la imagen base
WORKDIR /app                       # capa 2
COPY pyproject.toml uv.lock ./     # capa 3: solo los archivos de dependencias
RUN pip install uv && uv sync --frozen --no-dev   # capa 4: instalar dependencias (lento)
COPY src/ ./src/                   # capa 5: tu código
CMD ["uv", "run", "python", "-m", "src.pipeline"]
```

Al construir, Docker revisa cada instrucción en orden. La caché de una capa se invalida cuando:

| Instrucción | Se invalida si… |
|---|---|
| `FROM` | Cambia la imagen base (otra etiqueta o un digest nuevo) |
| `COPY` / `ADD` | Cambia el contenido de **alguno** de los archivos copiados |
| `RUN` | Cambia el texto del comando |
| **Cualquiera** | **Se invalidó una capa anterior**: desde ahí se reconstruye todo |

La última regla es la clave. Con el orden de arriba, cambiar un archivo de `src/` reconstruye solo la capa 5: las dependencias quedan en caché. Si en cambio copiaras todo con `COPY . .` antes del `RUN uv sync`, cualquier cambio de código reinstalaría todas las dependencias. Así lo explica la [documentación de la caché de Docker](https://docs.docker.com/build/cache/).

:::tip El archivo .dockerignore
`COPY . .` copia **todo** el contexto de build: también `.git`, `.venv`, datos de prueba y archivos `.env`. Además de hacer el build lento, invalida la caché cada vez que cambia cualquiera de ellos y puede meter secretos en la imagen. Un `.dockerignore` (como `.gitignore`) los deja afuera.
:::

## Imágenes más chicas: build multi-etapa

Las herramientas para compilar o instalar (compiladores, cachés de pip) no hacen falta para **ejecutar**. Un build multi-etapa instala en una etapa y copia a la final solo lo necesario:

```dockerfile norun
FROM python:3.13-slim AS construir
WORKDIR /app
RUN pip install uv
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev
COPY src/ ./src/

FROM python:3.13-slim
WORKDIR /app
COPY --from=construir /app /app
RUN useradd --create-home app
USER app
ENV PATH="/app/.venv/bin:$PATH"
CMD ["python", "-m", "src.pipeline"]
```

La imagen final no tiene `uv` ni las cachés de instalación: solo Python, el entorno virtual y tu código ([documentación de builds multi-etapa](https://docs.docker.com/build/building/multi-stage/)).

:::cuidado La etiqueta latest
`FROM python:latest` significa "la versión más nueva que exista el día del build". El mismo Dockerfile construido en marzo y en septiembre da imágenes distintas, y un pipeline que andaba se rompe sin que nadie haya tocado nada. Fija la versión (`python:3.13-slim`) y, para máxima reproducibilidad, el digest (`python:3.13-slim@sha256:...`).
:::

:::practica python Simular la caché con dos órdenes distintos
1. Ejecuta: la función recorre las instrucciones y marca cuáles se reconstruyen cuando cambia un archivo.
2. Compara los dos Dockerfiles: el que copia todo primero reinstala dependencias por un cambio en `src/pipeline.py`; el ordenado no.
3. Cambia el archivo modificado a `uv.lock` y mira qué pasa en cada uno.

```python
def reconstruidas(instrucciones, cambiados):
    invalido, res = False, []
    for i, ins in enumerate(instrucciones):
        partes = ins.split()
        if partes[0] in ("COPY", "ADD"):
            fuentes = partes[1:-1]
            if any(f == "." or c == f or c.startswith(f.rstrip("/") + "/") for f in fuentes for c in cambiados):
                invalido = True
        if invalido:
            res.append(i)
    return res

malo = ["FROM python:3.13-slim", "WORKDIR /app", "COPY . .", "RUN pip install uv && uv sync", "CMD python -m src.pipeline"]
bueno = ["FROM python:3.13-slim", "WORKDIR /app", "COPY pyproject.toml uv.lock ./", "RUN pip install uv && uv sync",
         "COPY src/ ./src/", "CMD python -m src.pipeline"]

for nombre, df in (("todo primero", malo), ("ordenado", bueno)):
    r = reconstruidas(df, {"src/pipeline.py"})
    print(f"{nombre:13}", [df[i] for i in r])
```

Reto: agrega la regla de que un `RUN` también se invalida si cambia su texto (pasa una lista de instrucciones "anteriores" y compara).

Documentación oficial: [Caché de build](https://docs.docker.com/build/cache/) · [Builds multi-etapa](https://docs.docker.com/build/building/multi-stage/) · [Buenas prácticas](https://docs.docker.com/build/building/best-practices/) · [Contexto de build y .dockerignore](https://docs.docker.com/build/concepts/context/)
:::

:::errores
- **`COPY . .` antes de instalar dependencias.** Cada cambio de código reinstala todo.
- **Sin `.dockerignore`.** El contexto arrastra `.git`, `.venv` y quizás un `.env` con secretos.
- **`FROM ...:latest`.** El build deja de ser reproducible.
- **Una sola etapa con todo.** La imagen final carga compiladores y cachés que no usa.
:::

:::entrevista
**Pregunta:** "El build de nuestra imagen tarda 8 minutos aunque solo cambiamos una línea de código. ¿Qué miras?"

**Respuesta modelo:** "El orden del Dockerfile: seguramente se copia todo el proyecto antes de instalar las dependencias, así que cualquier cambio invalida la capa del `pip install`. Copiaría primero solo `pyproject.toml` y el lockfile, instalaría, y recién después copiaría el código. Agregaría un `.dockerignore` y, en CI, usaría la caché del registro (`--cache-from`) para que los runners nuevos no empiecen de cero."
:::

## Ejercicios

:::ejercicio quiz
Cambias una línea de `src/transformar.py`. ¿Qué capas se reconstruyen con el Dockerfile ordenado (dependencias primero, código al final)?
- [ ] Todas, porque cambió el proyecto
- [ ] Ninguna: Docker detecta que es un cambio chico
- [x] Solo la del `COPY src/` y las que vienen después
- [ ] Solo la del `FROM`
:::

:::ejercicio python dificultad=Avanzado titulo="¿Qué capas se reconstruyen?"
Escribe `reconstruidas(instrucciones, cambiados)` que devuelva los **índices** de las instrucciones que se vuelven a ejecutar. Reglas: un `COPY` o `ADD` se invalida si alguno de los archivos cambiados coincide con alguna de sus fuentes (todas las palabras entre la instrucción y el destino, que es la última): la fuente `.` coincide con cualquier archivo; una fuente que termina en `/` coincide con los archivos dentro de esa carpeta; si no, tiene que ser igual. Una vez invalidada una instrucción, se reconstruyen ella y **todas las siguientes**. Las demás instrucciones solo se reconstruyen si se invalidó una anterior.
```python inicial
def reconstruidas(instrucciones, cambiados):
    pass
```
```python solucion
def reconstruidas(instrucciones, cambiados):
    invalido, res = False, []
    for i, ins in enumerate(instrucciones):
        partes = ins.split()
        if not invalido and partes[0] in ("COPY", "ADD"):
            for f in partes[1:-1]:
                for c in cambiados:
                    if f == "." or c == f or (f.endswith("/") and c.startswith(f)):
                        invalido = True
        if invalido:
            res.append(i)
    return res
```
```pista
Recorre las instrucciones con una bandera `invalido`. En cada `COPY`/`ADD`, las fuentes son `partes[1:-1]`.
```
```pista
Una fuente `src/` coincide con `src/pipeline.py` porque el archivo empieza con ella; `uv.lock` solo coincide con `uv.lock`.
```
```python test
bueno = ["FROM python:3.13-slim", "WORKDIR /app", "COPY pyproject.toml uv.lock ./", "RUN uv sync", "COPY src/ ./src/", "CMD python -m src"]
assert reconstruidas(bueno, {"src/pipeline.py"}) == [4, 5], f"Obtuviste {reconstruidas(bueno, {'src/pipeline.py'})}"
assert reconstruidas(bueno, {"uv.lock"}) == [2, 3, 4, 5]
assert reconstruidas(bueno, {"README.md"}) == []
malo = ["FROM python:3.13-slim", "COPY . .", "RUN uv sync", "CMD python -m src"]
assert reconstruidas(malo, {"README.md"}) == [1, 2, 3], "COPY . . se invalida con cualquier archivo"
assert reconstruidas(bueno, set()) == []
```
:::

:::ejercicio python dificultad=Experto titulo="Revisar un Dockerfile"
Escribe `revisar(texto)` que reciba un Dockerfile y devuelva la lista **ordenada alfabéticamente** de los problemas encontrados, con estos códigos:
- `"BASE_SIN_VERSION"`: algún `FROM` usa una imagen sin etiqueta (`FROM python`) o con `:latest`. (Ignora `FROM etapa` cuando `etapa` es el nombre de una etapa anterior, definida con `AS`.)
- `"SIN_USER"`: no hay ninguna instrucción `USER` (el contenedor corre como root).
- `"COPIA_TODO_ANTES"`: hay un `COPY . ` (copiar todo el contexto) **antes** del primer `RUN` que contiene `pip install` o `uv sync`.
- `"SECRETO_EN_IMAGEN"`: alguna línea `ENV` o `ARG` define una variable cuyo nombre contiene `PASSWORD`, `TOKEN`, `SECRET` o `KEY` (sin importar mayúsculas) con un valor (`=`).

Ignora líneas vacías y comentarios (`#`). Las instrucciones pueden estar en minúsculas.
```python inicial
def revisar(texto):
    pass
```
```python solucion
import re

def revisar(texto):
    lineas = [l.strip() for l in texto.splitlines() if l.strip() and not l.strip().startswith("#")]
    problemas = set()
    etapas = set()
    hay_user = False
    copia_todo = False
    instalo = False
    for l in lineas:
        partes = l.split()
        ins = partes[0].upper()
        if ins == "FROM":
            imagen = partes[1]
            if imagen.lower() not in etapas:
                nombre = imagen.split("@")[0].split("/")[-1]
                if ":" not in nombre or nombre.endswith(":latest"):
                    problemas.add("BASE_SIN_VERSION")
            if len(partes) >= 4 and partes[2].upper() == "AS":
                etapas.add(partes[3].lower())
        elif ins == "USER":
            hay_user = True
        elif ins == "COPY" and len(partes) >= 3 and "." in partes[1:-1] and not instalo:
            copia_todo = True
        elif ins == "RUN" and ("pip install" in l or "uv sync" in l):
            if copia_todo and not instalo:
                problemas.add("COPIA_TODO_ANTES")
            instalo = True
        elif ins in ("ENV", "ARG"):
            for nombre in re.findall(r"([A-Za-z_][A-Za-z0-9_]*)\s*=", l):
                if re.search(r"PASSWORD|TOKEN|SECRET|KEY", nombre, re.I):
                    problemas.add("SECRETO_EN_IMAGEN")
    if not hay_user:
        problemas.add("SIN_USER")
    return sorted(problemas)
```
```pista
Recorre las líneas útiles y guarda banderas: si ya viste un `USER`, si ya copiaste todo (`.` entre las fuentes) y si ya instalaste dependencias.
```
```pista
Para `FROM`, la etiqueta va después de `:` en el último tramo del nombre (`registro:5000/equipo/python:3.13` tiene etiqueta). Guarda los nombres de etapa (`AS construir`) para no marcarlos.
```
```python test
bueno = """
# imagen de producción
FROM python:3.13-slim AS construir
WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN pip install uv && uv sync --frozen
COPY src/ ./src/
FROM python:3.13-slim
COPY --from=construir /app /app
USER app
CMD ["python", "-m", "src"]
"""
assert revisar(bueno) == [], f"El Dockerfile bueno no debería tener problemas: {revisar(bueno)}"
malo = """
from python
copy . .
run pip install -r requirements.txt
ENV DB_PASSWORD=supersecreta
"""
assert revisar(malo) == ["BASE_SIN_VERSION", "COPIA_TODO_ANTES", "SECRETO_EN_IMAGEN", "SIN_USER"], f"Obtuviste {revisar(malo)}"
assert revisar("FROM python:latest\nUSER app") == ["BASE_SIN_VERSION"]
assert revisar("FROM registro:5000/equipo/python:3.13\nUSER app\nARG api_token") == [], "ARG sin valor no deja un secreto en la imagen"
assert revisar("FROM python:3.13\nRUN uv sync\nCOPY . .\nUSER app") == [], "Copiar todo después de instalar está bien"
```
:::
