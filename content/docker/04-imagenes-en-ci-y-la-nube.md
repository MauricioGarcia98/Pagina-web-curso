---
titulo: Imágenes en CI, registros y contenedores en la nube
nivel: Experto
duracion: 55
resumen: En un equipo, nadie construye la imagen de producción en su computadora - la construye el CI en cada cambio, la etiqueta de forma que se sepa exactamente qué código tiene, la escanea en busca de vulnerabilidades, la publica en un registro y la nube la ejecuta como un trabajo programado. Aprendes a etiquetar con versión y commit, a frenar el pipeline ante vulnerabilidades críticas con arreglo disponible, a limitar memoria y CPU, y dónde se ejecutan los contenedores de datos en Azure, AWS y Google Cloud.
objetivos: Etiquetar imágenes de forma inmutable con versión y commit | Publicar imágenes en un registro desde GitHub Actions con caché | Decidir qué vulnerabilidades del escaneo frenan una publicación | Limitar memoria y CPU de un contenedor y entender qué pasa cuando se pasa | Elegir dónde ejecutar un contenedor de datos en cada nube
prerrequisitos: docker-compose-stack-de-datos | github-github-actions
autoevaluacion: ¿Por qué no se despliega con la etiqueta latest? | ¿Qué información debe tener la etiqueta de una imagen? | ¿Toda vulnerabilidad alta debe frenar la publicación? | ¿Qué pasa si el pipeline usa más memoria que su límite?
---

:::analogia En palabras simples
Una imagen publicada es como un lote de medicamentos: lleva un número de lote que dice exactamente cuándo y con qué se fabricó, pasa un control de calidad antes de salir, y nunca se reemplaza un lote por otro con el mismo número. Si algo falla en producción, con el número de lote sabes qué versión del código estaba corriendo.
:::

## Etiquetas inmutables

| Etiqueta | ¿Para desplegar? | Por qué |
|---|---|---|
| `latest` | No | Se mueve: hoy es una versión y mañana otra |
| `1.4.0` (versión) | Sí, si nunca se reescribe | Legible para personas |
| `sha-3f9c2ab` (commit) | Sí | Dice exactamente qué código tiene |
| `@sha256:…` (digest) | La más segura | Identifica el contenido exacto; no se puede reescribir |

Una práctica común: cada build de `main` publica `sha-<commit>` y, si es una versión, también `1.4.0`. Las ramas de prueba publican `<rama>-sha-<commit>`. Las etiquetas de Docker solo admiten letras, números, `_`, `.` y `-`, y hasta 128 caracteres: una rama `feature/Nuevo-Lote` hay que convertirla a `feature-nuevo-lote`.

## Construir y publicar en GitHub Actions

```yaml norun
name: imagen
on:
  push:
    branches: [main]
jobs:
  publicar:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v6
        with:
          push: true
          tags: ghcr.io/${{ github.repository }}/pipeline:sha-${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

La caché `type=gha` guarda las capas entre ejecuciones del CI, para que un runner nuevo no reconstruya todo desde cero ([documentación oficial](https://docs.docker.com/build/ci/github-actions/)). El token lo provee GitHub para cada ejecución: no hay que guardar una contraseña ([registro de contenedores de GitHub](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)).

## Escanear antes de publicar

Herramientas como Docker Scout o Trivy listan las vulnerabilidades conocidas (CVE) de los paquetes de la imagen, con su severidad y la versión que las corrige. Frenar por **todas** las vulnerabilidades altas paraliza al equipo (muchas no tienen arreglo todavía); la regla habitual es: **frenar si hay alguna crítica o alta que ya tiene versión corregida**, porque esa se arregla actualizando.

:::cuidado La imagen que nadie actualiza
Una imagen que pasó el escaneo hace seis meses hoy puede tener vulnerabilidades nuevas, aunque nadie haya cambiado el código. Reconstruye periódicamente (por ejemplo, una vez por semana) para tomar los parches de la imagen base, y vuelve a escanear.
:::

## Límites de recursos

Sin límites, un contenedor puede usar toda la memoria de la máquina. Con `--memory=2g` (o `deploy.resources.limits` en Compose, o los límites del servicio en la nube), si el proceso se pasa, el sistema lo mata: verás el código de salida **137** (OOMKilled). En un pipeline de datos, eso suele significar que se cargó todo un archivo en memoria cuando había que procesarlo por partes ([límites de recursos](https://docs.docker.com/engine/containers/resource_constraints/)).

## Dónde corre un contenedor de datos

| Nube | Para un trabajo que corre y termina (batch) | Para un servicio siempre encendido (una API) |
|---|---|---|
| Azure | Container Apps Jobs | Container Apps |
| AWS | ECS con Fargate (tareas programadas) o AWS Batch | ECS / App Runner |
| Google Cloud | Cloud Run Jobs | Cloud Run |

Un orquestador (Airflow, Lakeflow Jobs, Data Factory) dispara el trabajo, le pasa la configuración por variables de entorno y los secretos desde el gestor de secretos ([Container Apps Jobs](https://learn.microsoft.com/en-us/azure/container-apps/jobs), [Cloud Run Jobs](https://cloud.google.com/run/docs/create-jobs)).

:::practica python La puerta de calidad del escaneo
1. Ejecuta: un reporte de escaneo de ejemplo pasa por la regla "frenar si hay críticas o altas con arreglo disponible".
2. Mira por qué la vulnerabilidad alta de `libssl` sin arreglo no frena, y la de `requests` sí.
3. Cambia el umbral a `"MEDIA"` y mira qué pasa.

```python
ORDEN = {"BAJA": 1, "MEDIA": 2, "ALTA": 3, "CRITICA": 4}

reporte = [
    {"id": "CVE-2025-1111", "paquete": "requests", "severidad": "ALTA", "corregida_en": "2.32.4"},
    {"id": "CVE-2025-2222", "paquete": "libssl3", "severidad": "ALTA", "corregida_en": None},
    {"id": "CVE-2025-3333", "paquete": "urllib3", "severidad": "MEDIA", "corregida_en": "2.5.0"},
    {"id": "CVE-2025-4444", "paquete": "zlib", "severidad": "BAJA", "corregida_en": "1.3.1"},
]

def bloqueantes(reporte, umbral="ALTA"):
    return sorted(v["id"] for v in reporte if ORDEN[v["severidad"]] >= ORDEN[umbral] and v["corregida_en"])

b = bloqueantes(reporte)
print("¿Se publica?", "no" if b else "sí", b)
```

Reto: agrega una lista de excepciones aceptadas (por ejemplo, un CVE que el equipo de seguridad revisó y aceptó por 30 días) que no frene la publicación.

Documentación oficial: [Docker en GitHub Actions](https://docs.docker.com/build/ci/github-actions/) · [Docker Scout](https://docs.docker.com/scout/) · [Trivy](https://trivy.dev/latest/docs/) · [Límites de recursos](https://docs.docker.com/engine/containers/resource_constraints/)
:::

:::errores
- **Desplegar con `latest`.** No sabes qué código está corriendo ni puedes volver atrás con seguridad.
- **Reescribir una etiqueta de versión.** Rompe la reproducibilidad: publica una versión nueva.
- **Frenar por cualquier vulnerabilidad.** Frena por las graves que tienen arreglo; registra el resto.
- **Contenedores sin límite de memoria.** Uno se come la máquina y tira a los demás.
:::

:::entrevista
**Pregunta:** "El trabajo de ingesta en Cloud Run Jobs termina a veces con código 137. ¿Qué pasa y qué haces?"

**Respuesta modelo:** "137 es que el sistema mató el proceso por pasarse del límite de memoria (OOMKilled). Primero miro cuánta memoria usa y si hay días con archivos más grandes. La solución de fondo es procesar por partes (leer el archivo en lotes o en streaming) en lugar de cargarlo entero; subir el límite es un parche temporal. Y agrego una alarma sobre los reinicios del trabajo."
:::

## Ejercicios

:::ejercicio quiz
En producción, ¿qué referencia de imagen te permite saber exactamente qué código está corriendo y volver atrás con seguridad?
- [ ] `pipeline:latest`
- [ ] `pipeline:main`
- [x] `pipeline:sha-3f9c2ab` o, mejor aún, su digest `@sha256:…`
- [ ] `pipeline:estable`
:::

:::ejercicio python dificultad=Avanzado titulo="Las etiquetas de cada build"
Escribe `etiquetas(rama, sha, version=None)`. En la rama `main` devuelve `["sha-<7 primeros del sha>"]` y, si hay `version`, también la versión, en este orden: `[version, "sha-..."]`. En otras ramas devuelve `["<rama>-sha-<7>"]`, con la rama convertida a una etiqueta válida: minúsculas, y cada carácter que no sea letra, número, `.`, `_` o `-` reemplazado por `-`. Ninguna etiqueta puede pasar de 128 caracteres (recorta la parte de la rama si hace falta).
```python inicial
import re

def etiquetas(rama, sha, version=None):
    pass
```
```python solucion
import re

def etiquetas(rama, sha, version=None):
    corto = sha[:7]
    if rama == "main":
        return ([version] if version else []) + [f"sha-{corto}"]
    limpia = re.sub(r"[^a-z0-9._-]", "-", rama.lower())
    sufijo = f"-sha-{corto}"
    return [limpia[:128 - len(sufijo)] + sufijo]
```
```pista
`re.sub(r"[^a-z0-9._-]", "-", rama.lower())` reemplaza todo lo que no está permitido.
```
```pista
Para no pasar de 128, recorta la rama a `128 - len(sufijo)` caracteres antes de agregar el sufijo.
```
```python test
sha = "3f9c2ab7e1d4c0b9a8f7e6d5c4b3a2f1e0d9c8b7"
assert etiquetas("main", sha) == ["sha-3f9c2ab"]
assert etiquetas("main", sha, "1.4.0") == ["1.4.0", "sha-3f9c2ab"]
assert etiquetas("feature/Nuevo-Lote", sha) == ["feature-nuevo-lote-sha-3f9c2ab"], f"Obtuviste {etiquetas('feature/Nuevo-Lote', sha)}"
largo = etiquetas("x" * 300, sha)[0]
assert len(largo) == 128 and largo.endswith("-sha-3f9c2ab")
```
:::

:::ejercicio python dificultad=Avanzado titulo="¿Se puede publicar la imagen?"
Escribe `bloqueantes(reporte, umbral="ALTA", aceptadas=())`. `reporte` es una lista de vulnerabilidades `{"id", "severidad", "corregida_en"}` con severidad `BAJA`, `MEDIA`, `ALTA` o `CRITICA`. Devuelve la lista ordenada de los `id` que frenan la publicación: severidad igual o mayor al umbral, **con** versión corregida (no nula) y que no estén en `aceptadas`.
```python inicial
def bloqueantes(reporte, umbral="ALTA", aceptadas=()):
    pass
```
```python solucion
ORDEN = {"BAJA": 1, "MEDIA": 2, "ALTA": 3, "CRITICA": 4}

def bloqueantes(reporte, umbral="ALTA", aceptadas=()):
    return sorted(v["id"] for v in reporte
                  if ORDEN[v["severidad"]] >= ORDEN[umbral] and v["corregida_en"] and v["id"] not in aceptadas)
```
```pista
Un diccionario `{"BAJA": 1, ..., "CRITICA": 4}` convierte la severidad en un número comparable.
```
```python test
rep = [{"id": "C1", "severidad": "ALTA", "corregida_en": "2.0"}, {"id": "C2", "severidad": "ALTA", "corregida_en": None},
       {"id": "C3", "severidad": "MEDIA", "corregida_en": "1.1"}, {"id": "C4", "severidad": "CRITICA", "corregida_en": "3.1"}]
assert bloqueantes(rep) == ["C1", "C4"], f"Obtuviste {bloqueantes(rep)}"
assert bloqueantes(rep, "MEDIA") == ["C1", "C3", "C4"]
assert bloqueantes(rep, aceptadas=("C4",)) == ["C1"]
assert bloqueantes([]) == []
```
:::
