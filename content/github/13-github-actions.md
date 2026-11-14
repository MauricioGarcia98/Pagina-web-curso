---
titulo: GitHub Actions - tests automáticos en cada push y cada pull request
nivel: 4 · Intermedio-avanzado
duracion: 55
resumen: GitHub Actions corre código por ti cuando pasa algo en el repositorio. Escribir tu primer workflow (ruff y pytest en cada push y PR), entender su estructura (on, jobs, steps, uses, run), leer una ejecución que falla, encontrar el error en el log, arreglarlo y ver el check en verde - el mismo flujo que usa cualquier equipo de datos.
objetivos: Explicar qué es CI y qué es un workflow | Escribir un workflow YAML con on, jobs y steps | Diferenciar uses de run | Leer el log de una ejecución fallida y encontrar el error | Arreglar y comprobar el check en verde
prerrequisitos: github-proyecto-contribuir-al-equipo
autoevaluacion: ¿Sabes dónde va un archivo de workflow? | ¿Sabes qué hace on pull_request? | ¿Sabes encontrar en el log qué paso falló? | ¿Sabes por qué python-version va entre comillas?
---

:::analogia En palabras simples
GitHub Actions es un ayudante que, cada vez que alguien sube código, lo descarga en una computadora limpia y corre la lista de comprobaciones que le dejaste escrita. Si algo falla, pone una ❌ roja junto al commit y avisa. Eso se llama **integración continua (CI)**.
:::

## Paso 1 — Dónde vive un workflow

Un workflow es un archivo YAML en **`.github/workflows/`** del repositorio. GitHub lee esa carpeta en cada push: no hay que activar nada.

En tu clon de `ventas-app` (en `main` actualizado), crea `.github/workflows/tests.yml`:

```yaml
name: tests
on:
  push:
    branches: [main]
  pull_request:
jobs:
  tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - run: pip install pytest ruff
      - run: ruff check .
      - run: pytest
```

## Paso 2 — Qué significa cada parte

| Clave | Significa |
|---|---|
| `name` | Nombre del workflow (y del check en los PRs) |
| `on` | Cuándo corre: aquí en cada push a main y en cada PR |
| `jobs` | Trabajos; cada uno corre en una máquina limpia |
| `runs-on` | El sistema de esa máquina (*runner*) |
| `steps` | Los pasos, en orden; si uno falla, los siguientes no corren |
| `uses` | Usa una **acción** ya hecha (`actions/checkout` descarga el repo, `setup-python` instala Python) |
| `run` | Corre un comando de la terminal |

:::cuidado El error clásico de YAML
`python-version: 3.10` sin comillas es el **número** 3.1, y GitHub instala Python 3.1 (o falla). Las versiones van siempre entre comillas: `"3.10"`, `"3.12"`. La práctica reproduce este error tal cual.
:::

## Paso 3 — Subir y ver la ejecución

```bash
git add .github/workflows/tests.yml
git commit -m "CI: ruff y pytest en cada push y pull request"
git push
```

Pestaña **Actions**:

```captura
archivo: github/g13-actions.webp
texto: La lista de ejecuciones: el workflow tests corrió con el commit que acabas de subir
```

Si dejaste el `import csv` sin usar de `resumen.py` (como en la lección 5), la ejecución falla. Ábrela:

```captura
archivo: github/g13-run.webp
texto: La ejecución en rojo con el job tests fallido
```

## Paso 4 — Leer el log

Haz clic en el job **tests**. Cada paso se despliega; el que falló está abierto con ❌:

```captura
archivo: github/g13-log.webp
texto: El paso ruff check falló - resumen.py línea 1, F401 csv imported but unused; pytest no llegó a correr
```

Cómo se lee:

- `resumen.py:1:1: F401 [*] 'csv' imported but unused` → archivo, línea, columna, código de regla y mensaje.
- `Error: Process completed with exit code 1.` → un comando que termina con código distinto de 0 hace fallar el paso.
- **Run pytest** aparece gris (omitido): después de un paso fallido, los demás no corren.

:::tip Reproduce en tu computadora
Lo que falla en CI se reproduce con el mismo comando local: `ruff check .`. Arreglar en tu máquina y subir es mucho más rápido que adivinar mirando el log. `ruff check . --fix` arregla los errores marcados con `[*]`.
:::

## Paso 5 — Arreglar y ver el verde

Quita la línea `import csv` de `resumen.py`:

```bash
git commit -am "Quita el import sin usar que marcó ruff (F401)"
git push
```

```captura
archivo: github/g13-actions-verde.webp
texto: La segunda ejecución quedó en verde
```

Desde ahora, cada PR muestra el check **tests** y el revisor sabe, sin correr nada, si el código pasa.

## Paso 6 — Desde la terminal

```bash
gh run list            # últimas ejecuciones
gh run view            # detalle de la última
```

## ✅ Lo que lograste

- Escribiste tu primer workflow de CI.
- Sabes qué es cada parte del YAML.
- Leíste un log fallido, encontraste el error, lo arreglaste y viste el check verde.

:::ejercicio quiz
¿Dónde tiene que estar un archivo de workflow para que GitHub lo ejecute?
- [ ] En la raíz del repositorio
- [x] En .github/workflows/
- [ ] En la pestaña Settings
- [ ] En una rama llamada actions
:::

:::ejercicio quiz
¿Qué diferencia hay entre `uses` y `run`?
- [ ] Ninguna
- [x] uses usa una acción ya hecha; run ejecuta un comando de la terminal
- [ ] run es para Python y uses para bash
- [ ] uses corre en paralelo
:::

:::ejercicio quiz
El paso `ruff check .` falla. ¿Qué pasa con el paso `pytest` que viene después?
- [ ] Corre igual
- [x] No corre: después de un paso fallido, los siguientes se omiten
- [ ] Corre dos veces
- [ ] Se convierte en un issue
:::

:::ejercicio quiz
Escribes `python-version: 3.10` sin comillas. ¿Qué pasa?
- [ ] Instala 3.10
- [x] YAML lo lee como el número 3.1 y pide Python 3.1
- [ ] Instala la última versión
- [ ] Da error de sintaxis siempre
:::
