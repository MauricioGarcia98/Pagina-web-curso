---
titulo: Ramas e historial - trabajar en una rama, ver la historia y volver atrás sin miedo
nivel: 4 · Intermedio-avanzado
duracion: 45
resumen: Las ramas permiten trabajar en un cambio sin tocar la versión que funciona. Cómo crear y cambiar de rama, leer la rama actual en la barra de estado, ver la historia con git log y la línea de tiempo de VS Code, comparar contra commits anteriores, descartar cambios y fusionar una rama terminada.
objetivos: Crear una rama y cambiar entre ramas | Leer la rama actual en la barra de estado | Ver la historia del proyecto y de un archivo | Descartar cambios no guardados en un commit | Fusionar una rama con merge
prerrequisitos: vscode-git-en-vscode
autoevaluacion: ¿Sabes para qué sirve una rama? | ¿Sabes dónde ver en qué rama estás? | ¿Sabes ver la historia de un archivo? | ¿Sabes volver un archivo a como estaba en el último commit?
---

:::analogia En palabras simples
Una rama es una copia de trabajo paralela: en la rama `main` está la versión que funciona; en la rama `feature/validaciones` pruebas un cambio. Si sale bien, la juntas con `main`; si sale mal, la tiras y `main` nunca se enteró.
:::

## Paso 1 — Crea una rama

En la terminal integrada (dentro de `ventas_app`):

```bash
git checkout -b feature/validaciones
git log --oneline
```

```captura
archivo: vscode/v14-rama.webp
texto: La barra de estado muestra la rama actual (1); git log lista los commits (2)
```

- `git checkout -b nombre` crea la rama y se cambia a ella (también: `git switch -c nombre`).
- La **barra de estado**, abajo a la izquierda, muestra siempre la rama en la que estás. Mírala antes de hacer commit.

| Convención de nombres | Para |
|---|---|
| `feature/descripcion` | Algo nuevo |
| `fix/descripcion` | Una corrección |
| `docs/descripcion` | Documentación |

## Paso 2 — Trabaja en la rama

Agrega a `src/limpieza.py` una función `es_email_valido(email)` que devuelva `True` si el texto tiene una `@` y un punto después. Haz commit en la rama: `Agrega validación de emails`.

La rama `main` sigue igual: si haces `git checkout main`, la función desaparece del archivo; al volver (`git checkout feature/validaciones`), reaparece.

## Paso 3 — La historia de un archivo: línea de tiempo

Abre **README.md** y mira la sección **LÍNEA DE TIEMPO** del explorador:

```captura
archivo: vscode/v14-timeline.webp
texto: La línea de tiempo muestra los commits que tocaron este archivo, del más nuevo al más viejo
```

Un clic en un commit muestra cómo cambió el archivo en ese commit. Para la historia de todo el proyecto: `git log --oneline` (o `git log --oneline --graph --all` para ver las ramas).

## Paso 4 — Volver atrás

| Quieres | Cómo |
|---|---|
| Descartar los cambios de un archivo que no commiteaste | `git restore archivo` (en VS Code: botón de descartar en la vista de Git) |
| Sacar un archivo de lo preparado para commit | `git restore --staged archivo` |
| Ver cómo estaba un archivo en un commit | Clic en el commit de la línea de tiempo, o `git show HASH:archivo` |
| Deshacer un commit ya compartido | `git revert HASH` (crea un commit que lo deshace, sin reescribir la historia) |

:::cuidado Descartar es definitivo
`git restore` borra los cambios que no estaban en un commit: no hay Ctrl + Z. Antes de descartar, mira el diff.
:::

## Paso 5 — Fusionar la rama

Cuando la rama está lista:

```bash
git checkout main
git merge feature/validaciones
git branch -d feature/validaciones
```

`main` ahora tiene la validación. En un equipo, en lugar de fusionar en tu máquina, se abre un **pull request** para que alguien revise antes (lección 15 y proyecto 4).

## ✅ Lo que lograste

- Trabajas en ramas y sabes en cuál estás.
- Ves la historia del proyecto y de cada archivo.
- Descartas cambios, revisas versiones anteriores y fusionas ramas.

:::ejercicio quiz
¿Para qué sirve trabajar en una rama?
- [ ] Para que el código corra más rápido
- [x] Para hacer cambios sin tocar la versión que funciona hasta que estén listos
- [ ] Para tener una copia de seguridad en la nube
- [ ] Para borrar la historia
:::

:::ejercicio quiz
¿Dónde ves rápido en qué rama estás en VS Code?
- [ ] En el explorador
- [x] En la barra de estado, abajo a la izquierda
- [ ] En el título de cada pestaña
- [ ] En el README
:::

:::ejercicio quiz
Hiciste un commit que ya subiste y que el equipo descargó, y está mal. ¿Qué usas?
- [ ] git reset --hard y push --force
- [x] git revert, que crea un commit nuevo que lo deshace
- [ ] Borrar la carpeta .git
- [ ] git restore
:::
