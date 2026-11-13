---
titulo: Git en VS Code - inicializar un repositorio, ver cambios, hacer commits y leer diferencias
nivel: 4 · Intermedio-avanzado
duracion: 50
resumen: Git guarda la historia de un proyecto; VS Code lo hace visual. Cómo inicializar un repositorio, qué significan las letras U, M y D del explorador, escribir un buen mensaje de commit, hacer commit desde la vista de control de código fuente, comparar cambios lado a lado y el .gitignore que evita subir datos y entornos. Cada botón ejecuta el comando de Git equivalente, para que veas qué hace.
objetivos: Inicializar un repositorio desde VS Code | Leer el estado de los archivos (nuevo, modificado, eliminado) | Escribir mensajes de commit útiles y hacer commit | Revisar los cambios de un archivo con la vista de diferencias | Usar .gitignore para no versionar datos, entornos ni secretos
prerrequisitos: vscode-proyecto-el-reporte-da-mal
autoevaluacion: ¿Sabes qué significa la U al lado de un archivo? | ¿Sabes escribir un buen mensaje de commit? | ¿Sabes ver qué cambió en un archivo antes de hacer commit? | ¿Sabes qué va en un .gitignore?
---

:::analogia En palabras simples
Un commit es una foto del proyecto con una descripción: "así quedó después de agregar la limpieza de emails". Git guarda todas las fotos en orden, y puedes volver a cualquiera o ver qué cambió entre dos. VS Code te muestra esas fotos y las diferencias con colores.
:::

## Paso 1 — Un proyecto nuevo

En la terminal integrada de [VS Code de práctica](#/vscode):

```bash
mkdir -p ~/ventas_app/src && cd ~/ventas_app && code .
```

VS Code se abre en `ventas_app`. Abre la vista **Control de código fuente** (Ctrl + Shift + G):

```captura
archivo: vscode/v13-sin-repo.webp
texto: La carpeta todavía no es un repositorio: Inicializar repositorio ejecuta git init
```

Presiona **Inicializar repositorio**. En la terminal ves `git init`: cada botón de esta vista ejecuta el comando de Git equivalente, a la vista.

## Paso 2 — Crea los primeros archivos

Con el explorador, crea:

- `README.md` con una línea que diga qué es el proyecto;
- `src/limpieza.py` con una función `limpiar_email`;
- `.gitignore` con:

```text
.venv/
__pycache__/
*.csv
```

Vuelve a la vista de Git:

```captura
archivo: vscode/v13-cambios.webp
texto: El cuadro del mensaje y el botón Commit (1) y la lista de CAMBIOS (2), con la letra de cada estado
```

| Letra | Significa |
|---|---|
| **U** | Nuevo (*untracked*): Git todavía no lo sigue |
| **M** | Modificado desde el último commit |
| **D** | Eliminado |
| **C** | En conflicto (lección 15) |

Las mismas letras aparecen en el explorador, al lado de cada archivo.

## Paso 3 — El .gitignore

`.gitignore` le dice a Git qué **no** guardar nunca:

| Patrón | Para no subir |
|---|---|
| `.venv/` | El entorno virtual (se recrea con `requirements.txt`) |
| `__pycache__/` | Archivos compilados de Python |
| `*.csv`, `datos/` | Datos (pesados y a veces personales) |
| `.env` | Contraseñas y claves |

:::cuidado Un secreto en Git es para siempre
Si subes una contraseña o una clave a un repositorio, aunque después la borres queda en la historia. Ponla en `.env`, agrégalo a `.gitignore` **antes** del primer commit, y si se te escapó, cambia la clave.
:::

## Paso 4 — El commit

1. Escribe el mensaje en el cuadro: `Estructura inicial del proyecto`.

```captura
archivo: vscode/v13-mensaje.webp
texto: El mensaje del commit (1) y el botón Commit (2)
```

2. Presiona **✓ Commit** (o Ctrl + Enter). En la terminal ves `git add -A && git commit -m "..."`, y la lista de cambios queda vacía.

| Mensaje débil | Mensaje útil |
|---|---|
| `cambios` | `Agrega limpieza de emails en src/limpieza.py` |
| `fix` | `Corrige el cálculo del bono para ventas de exactamente 20.000` |
| `asdf` | `README: cómo se ejecuta` |

Regla práctica: en imperativo, qué cambia y, si no es obvio, por qué. Un commit, una idea.

## Paso 5 — Ver qué cambió: la vista de diferencias

1. Agrega al README una sección `## Cómo se ejecuta`. Guarda.
2. En la vista de Git, haz clic en **README.md** (aparece con **M**).

```captura
archivo: vscode/v13-diff.webp
texto: La vista de diferencias: a la izquierda el último commit, a la derecha tu versión, con lo agregado en verde
```

Revisa **siempre** el diff antes de hacer commit: es donde aparecen el `print` de prueba olvidado, la contraseña que no debía estar o el archivo que cambiaste sin querer.

3. Haz commit: `README: cómo se ejecuta`.

## ✅ Lo que lograste

- Inicializaste un repositorio y lees el estado de cada archivo.
- Hiciste commits con mensajes útiles.
- Revisas diferencias antes de hacer commit y proteges datos y secretos con .gitignore.

:::ejercicio quiz
¿Qué significa la letra U al lado de un archivo en VS Code?
- [ ] Que está actualizado
- [x] Que es nuevo y Git todavía no lo sigue
- [ ] Que tiene un error
- [ ] Que está en uso
:::

:::ejercicio quiz
¿Cuál es el mejor mensaje de commit?
- [ ] `cambios varios`
- [ ] `fix`
- [x] `Corrige el filtro de cancelados en el resumen de ventas`
- [ ] `commit 3`
:::

:::ejercicio quiz
¿Qué conviene poner en .gitignore de un proyecto de datos?
- [ ] El README
- [ ] Los scripts .py
- [x] .venv/, __pycache__/, los datos y el .env con claves
- [ ] Nada
:::
