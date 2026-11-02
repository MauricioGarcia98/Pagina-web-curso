---
titulo: GitHub por dentro - qué es cada parte y para qué sirve
nivel: Intermedio
duracion: 50
resumen: Recorrido completo por GitHub - repositorio, pestaña Code, issues, pull requests con revisión, merge, squash y rebase, conflictos, GitHub Actions (workflows, jobs, steps, checks, secretos), protección de ramas, Pages, escaneo de secretos y la CLI gh. Con un flujo de equipo de datos de punta a punta.
objetivos: Ubicar cada pestaña de un repositorio y para qué sirve | Recorrer el flujo rama → push → pull request → revisión → checks → merge | Leer y escribir un workflow de GitHub Actions y entender por qué un check queda en rojo | Proteger main para que todo entre por pull request con tests en verde | Elegir entre merge, squash y rebase, y resolver un conflicto
prerrequisitos: fundamentos-git | fundamentos-git-en-equipo
autoevaluacion: ¿Sabes qué diferencia hay entre un issue y un pull request? | ¿Sabes qué pasa con el PR si haces push a su rama? | ¿Sabes por qué no puedes aprobar tu propio pull request? | ¿Sabes qué es un check requerido y dónde se configura? | ¿Sabes qué hacer si una clave llegó a un commit?
---

:::tip Practícalo mientras lees
Abre el [GitHub de práctica](#/github/tienda-andina/pipelines) y su terminal (ícono de terminal arriba a la derecha). Es la misma máquina del curso: lo que subes con `git push` aparece en la página al instante. Los **🎯 Retos** de GitHub siguen el mismo orden que esta lección.
:::

## Qué es GitHub (y qué no es)

**Git** es el programa que guarda la historia de tu código en tu computadora: commits, ramas, fusiones. **GitHub** es un servicio web que guarda una copia de ese repositorio (el **remoto**, normalmente llamado `origin`) y le agrega todo lo que necesita un equipo: revisar cambios antes de aceptarlos, conversar sobre tareas, correr pruebas automáticas y publicar.

| Git (en tu máquina) | GitHub (en la web) |
|---|---|
| `git commit`, `git switch`, `git merge` | Pull requests, revisiones, issues |
| Historia local | Copia compartida del repositorio |
| Funciona sin internet | Necesita `git push` / `git pull` para sincronizar |
| No ejecuta nada por sí solo | **Actions** corre tus pruebas en cada cambio |

GitLab, Bitbucket y Azure Repos hacen lo mismo con otros nombres (en GitLab el pull request se llama *merge request*).

## El repositorio: la barra de pestañas

Arriba de cada repositorio está `dueño / nombre`, si es **Public** o **Private**, y los botones **Watch** (notificaciones), **Fork** (copia en tu cuenta) y **Star** (marcador). Debajo, las pestañas:

| Pestaña | Para qué sirve |
|---|---|
| **Code** | Los archivos de una rama, su historia y el README |
| **Issues** | Tareas, errores e ideas, con conversación |
| **Pull requests** | Propuestas de cambio para revisar antes de fusionarlas |
| **Actions** | Las ejecuciones automáticas (pruebas, despliegues) |
| **Security** | Alertas: secretos expuestos, dependencias con vulnerabilidades |
| **Insights** | Actividad y quién contribuye |
| **Settings** | Configuración: ramas protegidas, secretos, Pages, colaboradores |

## La pestaña Code

- **Selector de rama** (`main ▾`): todo lo que ves es de esa rama. Al lado, cuántas ramas y tags hay.
- **Go to file** (atajo `t`): buscar un archivo por nombre.
- **Add file**: crear o subir archivos desde el navegador.
- **Code ▾** (botón verde): la URL para `git clone` (HTTPS o SSH) y **Download ZIP**.
- **Última fila de commit**: autor, mensaje, ✓/✗ de los checks de ese commit, y **N Commits** para ver la historia.
- **Lista de archivos**: para cada uno, el último commit que lo cambió.
- **README**: el archivo `README.md` se muestra como página. Es la portada del proyecto: qué hace, cómo correrlo y cómo contribuir.
- **About** (derecha): descripción, temas, licencia y lenguajes.

Al abrir un archivo tienes **Code / Blame** (qué commit escribió cada línea: útil para entender por qué algo está como está), **History** (commits que lo tocaron), **Raw** y el lápiz para **editarlo en el navegador**. Si la rama está protegida, el commit va a una rama nueva con su pull request.

## Issues: las tareas

Un **issue** describe algo por hacer o un problema: título, descripción en Markdown, **etiquetas** (`bug`, `enhancement`, `good first issue`…), **asignados** y comentarios. Se cierra como *completed* (resuelto) o *not planned* (no se hará).

Lo más útil: si un pull request dice en su descripción **`Closes #2`** (o `Fixes #2`, `Resolves #2`), al fusionarse **cierra el issue #2 automáticamente**. Y cualquier `#2` en un commit o comentario queda enlazado.

## Pull requests: el centro del trabajo en equipo

Un **pull request (PR)** pide fusionar una rama (*compare*, la tuya) en otra (*base*, normalmente `main`). El flujo:

1. `git switch -c tests-etl` → cambias → `git commit` → `git push -u origin tests-etl`.
2. GitHub ofrece **Compare & pull request**. Escribes título y descripción (qué cambia, por qué, cómo probarlo).
3. Pides revisión (**Reviewers**). Mientras tanto corren los **checks** (Actions).
4. Si te piden cambios, haces más commits en **la misma rama** y `git push`: el PR se actualiza solo.
5. Con aprobación y checks en verde, **Merge**. Después: `git switch main && git pull`.

Las pestañas de un PR:

| Pestaña | Qué tiene |
|---|---|
| **Conversation** | Descripción, comentarios, revisiones y la caja de merge |
| **Commits** | Los commits de la rama que no están en la base |
| **Checks** | Los resultados de Actions para el último commit |
| **Files changed** | El diff: verde lo agregado, rojo lo quitado. Aquí se comenta **línea por línea** |

### Revisar

En *Files changed*, el **+** al lado de una línea abre un comentario. Al terminar, **Review changes** con tres opciones: **Comment** (opinión), **Approve** (aprobar) o **Request changes** (pedir cambios antes de fusionar). **El autor no puede aprobar su propio PR**: la gracia es que otra persona mire. Un comentario de línea se cierra con **Resolve conversation** cuando quedó atendido.

### La caja de merge

Resume si se puede fusionar:

- **Review required / Changes approved / Changes requested**: el estado de las revisiones.
- **All checks have passed / Some checks were not successful**: los checks.
- **No conflicts / This branch has conflicts**: si Git puede fusionar solo.
- **Merging is blocked**: alguna regla de protección no se cumple (y dice cuál).

### Merge, squash o rebase

| Botón | Qué queda en main | Cuándo |
|---|---|---|
| **Create a merge commit** | Todos los commits de la rama + un commit de fusión | Quieres conservar la historia tal cual |
| **Squash and merge** | **Un solo commit** con todo el cambio | Muchos commits chicos ("arreglo", "otra vez"): main queda limpia. Lo más común en equipos |
| **Rebase and merge** | Los commits de la rama, uno tras otro, sin commit de fusión | Historia lineal conservando cada commit |

### Conflictos

Si tu rama y `main` cambiaron **las mismas líneas**, GitHub muestra *This branch has conflicts*. Dos caminos: **Resolve conflicts** en la web (editas el archivo y borras las marcas `<<<<<<<`, `=======`, `>>>>>>>`), o en la terminal `git pull origin main`, resuelves, `git add`, `git commit` y `git push`. **HEAD** es lo que hay en la base; lo de abajo de `=======` viene de tu rama.

## GitHub Actions: pruebas automáticas

Un **workflow** es un archivo YAML en `.github/workflows/`. Ejemplo de un equipo de datos:

```yaml
name: CI
on:
  pull_request:
    branches: [ main ]
  push:
    branches: [ main ]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - run: pip install -r requirements.txt
      - run: pytest
```

| Parte | Qué es |
|---|---|
| `on` | **Cuándo** corre: `push`, `pull_request`, `schedule` (cron), `workflow_dispatch` (botón manual) |
| `jobs` | Trabajos; corren en paralelo salvo que uno diga `needs: otro` |
| `runs-on` | La máquina (**runner**): `ubuntu-latest` es una VM nueva y vacía en cada ejecución |
| `steps` | Pasos en orden: `uses` usa una acción hecha por otros; `run` ejecuta comandos de bash |
| `actions/checkout` | Copia el repositorio al runner. **Sin este paso la carpeta está vacía** |
| `${{ secrets.X }}` | Un secreto de *Settings → Secrets*; en el log aparece como `***` |
| `if:` | Condición: `if: github.ref == 'refs/heads/main'` o `if: failure()` |

Cada job aparece como un **check** en el PR, con su nombre (`test`). Si un paso termina con código distinto de 0 (un test que falla, `exit 1`), el job queda en **rojo** y el log muestra el error. Errores clásicos: olvidar `checkout`, la sangría del YAML, y `python-version: 3.10` **sin comillas**, que YAML lee como el número `3.1`.

## Proteger main

En **Settings → Branches → Add rule** (o *Rulesets*) para `main`:

| Regla | Efecto |
|---|---|
| **Require a pull request before merging** | Nadie hace `git push` directo a main: el push se rechaza con *GH006: Protected branch update failed* |
| **Required approvals** | Cuántas aprobaciones necesita el PR |
| **Dismiss stale approvals** | Un commit nuevo anula las aprobaciones viejas |
| **Require status checks to pass** | Los checks elegidos (por ejemplo `test`) tienen que estar en verde |
| **Require branches to be up to date** | La rama tiene que tener lo último de main (botón *Update branch*) |
| **Do not allow bypassing** | Las reglas aplican también a los administradores |

Es la configuración de casi cualquier equipo: main siempre funciona porque todo entró revisado y probado.

## Secretos, Security y Pages

- **Secrets and variables → Actions**: claves y contraseñas que usan los workflows. Nunca en el código.
- **Security → Secret scanning**: GitHub detecta claves conocidas (AWS, Azure, tokens) en los commits. Si una clave llegó a un commit, **borrarla en otro commit no alcanza**: sigue en la historia. Hay que **rotarla** (crear otra e invalidar la vieja).
- **Pages**: publica un sitio estático (un `index.html`, o el README convertido en página) en `https://usuario.github.io/repositorio/`. Se activa en *Settings → Pages* desde una rama o con un workflow.

## La CLI gh

| Comando | Qué hace |
|---|---|
| `gh repo create mi-repo --public --source=. --push` | Crea el repositorio y sube la carpeta actual |
| `gh pr create --fill` | Abre un PR con el mensaje del último commit |
| `gh pr checks` / `gh pr view` | Estado de checks y revisiones |
| `gh pr merge 4 --squash --delete-branch` | Fusiona con squash y borra la rama |
| `gh issue create -t "…"` / `gh issue list` | Issues |
| `gh run list` / `gh run view --log-failed` | Ejecuciones de Actions y el log de lo que falló |
| `gh browse` | Abre el repositorio en el navegador |

## Qué tiene la réplica y qué no

| En la réplica | Todavía no |
|---|---|
| Code, Blame, History, editar/crear/subir archivos, ramas, commits con diff | Forks, tags y releases, Codespaces, github.dev |
| Issues con etiquetas, asignados y cierre por `Closes #N` | Projects, milestones, Discussions, Wiki |
| PRs con revisión por línea, revisores simulados, merge/squash/rebase, conflictos en la web, borradores | Revisores reales, CODEOWNERS, merge queue |
| Actions con YAML, expresiones, matrix, needs, secretos, artefactos; los `run:` corren en la bash del curso | Acciones de terceros (se dan por buenas), Docker, runners de Windows/macOS |
| Protección de ramas, secretos, Pages, escaneo de secretos, `gh` | Rulesets nuevos, Dependabot, notificaciones por correo |

:::ejercicio quiz
Hiciste push de dos commits más a la rama de tu pull request abierto. ¿Qué pasa con el PR?
- [ ] Hay que cerrarlo y abrir uno nuevo
- [x] Se actualiza solo: muestra los commits nuevos y los checks vuelven a correr
- [ ] Los commits nuevos van directo a main
- [ ] No pasa nada hasta que alguien aprueba
:::

:::ejercicio quiz
Tu PR tiene los checks en verde pero el botón dice **Merging is blocked**: *At least 1 approving review is required*. ¿Qué haces?
- [ ] Apruebo mi propio PR
- [x] Pido revisión a alguien del equipo en Reviewers
- [ ] Hago git push directo a main
- [ ] Borro la regla de protección
:::

:::ejercicio quiz
En el PR, el check `test` está en rojo y el log dice `ls: no se puede acceder a 'tests'` antes de `pytest`. ¿Qué falta más probablemente en el workflow?
- [ ] `runs-on: windows-latest`
- [x] El paso `uses: actions/checkout@v4`
- [ ] Un secreto
- [ ] `on: push`
:::

:::ejercicio quiz
Una rama tiene 12 commits como "fix", "otra vez", "ahora sí". Quieres que main quede con un solo commit claro. ¿Qué método de merge eliges?
- [ ] Create a merge commit
- [x] Squash and merge
- [ ] Rebase and merge
- [ ] Cualquiera, el resultado es igual
:::

:::ejercicio quiz
Subiste por error una clave de AWS en un commit y lo detectas una hora después. ¿Qué es lo **primero** que hay que hacer?
- [ ] Borrar la línea en un commit nuevo y listo
- [ ] Hacer el repositorio privado
- [x] Rotar la clave (invalidarla y crear otra), y después limpiar el código y usar un secreto
- [ ] Nada, si nadie la vio
:::
