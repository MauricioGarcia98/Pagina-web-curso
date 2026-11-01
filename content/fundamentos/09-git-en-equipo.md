---
titulo: Git en equipo - ramas, pull, conflictos y pull requests
nivel: Intermedio
duracion: 55
resumen: Lo que pasa cuando no trabajas solo. Tu push rechazado, el primer conflicto, stash, rebase y el pull request que revisa tu equipo, practicado con una compañera que sube cambios mientras trabajas.
objetivos: Clonar un repositorio y trabajar en una rama propia | Entender por qué un push es rechazado y cómo traer los cambios del equipo | Leer y resolver un conflicto de fusión | Guardar cambios a medias con stash | Elegir entre merge y rebase para actualizar tu rama | Abrir y fusionar un pull request
prerrequisitos: fundamentos-git
autoevaluacion: ¿Sabes por qué Git rechazó tu push y qué hacer? | ¿Puedes explicar qué significa cada parte de un conflicto (<<<<<<<, =======, >>>>>>>)? | ¿Sabes deshacer una fusión que se complicó? | ¿Sabes cuándo usar stash? | ¿Sabes por qué no se hace rebase de una rama que otros ya usan? | ¿Sabes qué debe tener un buen pull request?
---

:::escenario Tu primer push rechazado
Martín te pide: *"Marketing quiere que el ETL incluya Colombia. Es un cambio de una línea en `pipelines/etl.py`."* Clonas el repositorio, cambias la línea, haces commit y `git push`. Y Git responde con un `! [rejected]` en rojo.

No rompiste nada. Mientras tú trabajabas, **Camila subió un cambio a la misma línea** (agregó México). Esto pasa varias veces por semana en cualquier equipo. En esta lección lo vives en la terminal: el repositorio de práctica `https://github.com/tienda-andina/pipelines` tiene una compañera que sube cambios mientras trabajas.
:::

## El repositorio remoto

Hasta ahora usaste Git solo en tu computadora. En un equipo hay además un **repositorio remoto** (en GitHub, GitLab o Azure DevOps) que es la versión compartida. Cada persona tiene su copia y sincroniza con el remoto:

| Comando | Qué hace |
|---|---|
| `git clone URL` | Copia el remoto completo (con toda la historia) a tu computadora |
| `git fetch` | Trae lo nuevo del remoto **sin tocar** tus archivos (actualiza `origin/main`) |
| `git pull` | `fetch` + fusiona lo nuevo en tu rama |
| `git push` | Sube tus commits al remoto |

`origin` es el nombre del remoto, y `origin/main` es "cómo estaba `main` en el remoto la última vez que miré". `git status` te dice si tu rama está **adelantada** (tienes commits que el remoto no tiene), **atrasada** (el remoto tiene commits que tú no) o si **divergieron** (las dos cosas).

:::analogia El documento compartido sin edición en vivo
Imagina un documento que cada uno descarga, edita en su computadora y vuelve a subir. Si dos personas cambian el mismo párrafo, al subir el segundo hay que decidir qué queda. Git hace eso, pero en vez de pisar el trabajo del otro te **frena** y te pide que lo resuelvas.
:::

## Trabajar en una rama

En un equipo casi nunca se trabaja directo en `main`. Cada tarea va en su **rama**:

```bash norun
git switch -c feature/colombia      # crea la rama y te cambia a ella
# ... editas, pruebas ...
git add pipelines/etl.py
git commit -m "Agrega Colombia a los países del ETL"
git push -u origin feature/colombia # sube la rama (-u: la próxima vez alcanza con git push)
```

Nombres típicos: `feature/…` (algo nuevo), `fix/…` (un arreglo), `chore/…` (mantenimiento). La rama aísla tu trabajo: `main` sigue funcionando mientras tú pruebas.

## Push rechazado: traer primero, subir después

```text norun
 ! [rejected]        main -> main (fetch first)
ayuda: Las actualizaciones fueron rechazadas porque el remoto contiene trabajo que
ayuda: no tienes localmente.
```

Git no te deja pisar el trabajo de otra persona. La solución es siempre la misma: **traer los cambios (`git pull`), integrarlos y volver a subir**. Si las dos personas tocaron partes distintas, Git los junta solo. Si tocaron **las mismas líneas**, hay un conflicto.

## Anatomía de un conflicto

```text norun
$ git pull
Auto-fusionando pipelines/etl.py
CONFLICTO (contenido): Conflicto de fusión en pipelines/etl.py
Fusión automática falló; arregla los conflictos y luego haz commit del resultado.
```

Git escribió en el archivo **las dos versiones**, separadas por marcas:

```text norun
FECHA_INICIO = "2024-01-01"
<<<<<<< HEAD
PAISES = ["Chile", "Perú", "Colombia"]
=======
PAISES = ["Chile", "Perú", "México"]
>>>>>>> origin/main
```

- Entre `<<<<<<< HEAD` y `=======`: **tu** versión.
- Entre `=======` y `>>>>>>> origin/main`: la versión **que llegó** (la de Camila).

Resolver es **decidir qué queda** (a veces una, a veces la otra, casi siempre una combinación), **borrar las tres marcas** y avisarle a Git:

```text norun
PAISES = ["Chile", "Perú", "México", "Colombia"]
```

```bash norun
git add pipelines/etl.py      # "este archivo ya está resuelto"
git commit -m "Une Colombia (marketing) y México (Camila)"
git push
```

:::cuidado Las marcas no se van solas
Si haces `git add` con las marcas todavía en el archivo, Git te deja hacer commit… y el código queda roto (`<<<<<<<` no es Python válido). Antes de `git add`, busca: `grep -n "<<<<<<<\|>>>>>>>" pipelines/etl.py` no debería mostrar nada.
:::

:::tip ¿Te equivocaste resolviendo?
`git merge --abort` deshace la fusión y te deja como antes del `git pull`. Respira y vuelve a empezar. Y si no entiendes qué cambió la otra persona, pregúntale: resolver un conflicto es una conversación, no una adivinanza.
:::

## stash: guardar algo a medias

Estás a mitad de un cambio y te piden algo urgente en otra rama. Git no te deja cambiar de rama con cambios que se pisarían, y no quieres hacer commit de algo incompleto. `git stash` guarda tus cambios en un cajón y deja el árbol limpio:

```bash norun
git stash                     # guarda y limpia
git switch main               # haces lo urgente…
git switch feature/colombia
git stash pop                 # recuperas lo que tenías
```

`git stash list` muestra lo guardado. Úsalo para pausas cortas: lo que dura más de un día merece un commit en una rama.

## merge o rebase para actualizar tu rama

Tu rama `feature/colombia` salió de `main` hace dos días y `main` avanzó. Para ponerte al día hay dos formas:

| | `git merge origin/main` | `git rebase origin/main` |
|---|---|---|
| Qué hace | Crea un commit de fusión que junta las dos historias | Reescribe tus commits como si hubieras empezado desde el `main` nuevo |
| Historia | Fiel a lo que pasó, con ramas que se cruzan | Lineal, más fácil de leer |
| Conflictos | Los resuelves una vez | Los resuelves commit por commit (`git rebase --continue`) |
| Peligro | Ninguno | **Cambia los hashes**: nunca lo hagas sobre una rama que otras personas ya bajaron |

La regla de oro: **rebase solo de tu rama privada; merge para todo lo compartido**. Muchos equipos usan `git pull --rebase` para traer cambios a su rama sin commits de fusión.

## El pull request

Un **pull request** (PR, o *merge request* en GitLab) es pedirle al equipo: "revisen mi rama y, si está bien, fusiónenla en `main`". Ahí pasan tres cosas:

1. **Revisión de código**: alguien lee tu cambio, pregunta y sugiere. Es la forma más efectiva de aprender (y de encontrar errores antes de producción).
2. **Checks automáticos**: GitHub Actions corre los tests, el linter, `dbt build`… Si algo falla, el PR no se fusiona.
3. **Historia**: el PR queda como registro de **por qué** cambió algo.

```bash norun
gh pr create --title "Agrega Colombia al ETL" --body "Pedido de marketing (ticket DATA-142). Probado con datos de octubre: +312 filas."
gh pr view 1        # estado, checks y si se puede fusionar
gh pr merge 1 --squash
git switch main && git pull
```

Un buen PR es **chico** (se revisa en 15 minutos), explica **qué** cambia y **por qué**, y dice **cómo se probó**.

:::trabajo
En la mayoría de los equipos `main` está protegida: nadie hace push directo, todo entra por PR con al menos una aprobación y los checks en verde. Tu primera semana vas a abrir PRs chicos y vas a recibir comentarios: no son críticas personales, son la forma en que el equipo cuida el código. Responder "buena observación, lo cambio" o "lo dejé así porque…" es parte del trabajo.
:::

:::errores
- Trabajar directo en `main` y hacer push sin pull.
- Hacer `git add` con las marcas de conflicto adentro.
- `git push --force` para "arreglar" un rechazo: pisa el trabajo de tus compañeros.
- Rebase de una rama que otra persona ya bajó.
- PRs gigantes que nadie puede revisar.
:::

:::entrevista "¿Cómo resuelves un conflicto de merge?"
Leo qué cambió cada lado (`git status`, el diff, y si hace falta hablo con quien hizo el otro cambio). Edito el archivo para que quede la combinación correcta, borro las marcas, corro los tests, `git add` y commit. Si me equivoco, `git merge --abort` y empiezo de nuevo. Para evitarlos: ramas cortas, PRs chicos y traer `main` seguido.
:::

## Practica

Cada ejercicio prepara el repositorio cuando haces clic en su terminal. El comando `reiniciar-remoto` que verás en la preparación es del curso: deja el remoto de práctica como nuevo.

:::ejercicio cli
Clona el repositorio del equipo: `https://github.com/tienda-andina/pipelines`.
```setup
cd ~
rm -rf pipelines
reiniciar-remoto https://github.com/tienda-andina/pipelines
```
```respuesta
git clone https://github\.com/tienda-andina/pipelines(\.git)?/?
```
```solucion
git clone https://github.com/tienda-andina/pipelines
```
:::

:::ejercicio cli
Ya estás dentro del repositorio clonado. Crea una rama llamada `feature/colombia` y cámbiate a ella, en un solo comando.
```setup
cd ~
rm -rf pipelines
reiniciar-remoto https://github.com/tienda-andina/pipelines
git clone https://github.com/tienda-andina/pipelines
cd ~/pipelines
```
```respuesta
git switch -c feature/colombia
git checkout -b feature/colombia
```
```solucion
git switch -c feature/colombia
```
:::

:::ejercicio cli
Hiciste tu commit en `main` (agregaste Colombia). Mira cómo está tu rama respecto del remoto con el comando que muestra el estado.
```setup
cd ~
rm -rf pipelines
reiniciar-remoto https://github.com/tienda-andina/pipelines
git clone https://github.com/tienda-andina/pipelines
cd ~/pipelines
sed -i 's/"Perú"]/"Perú", "Colombia"]/' pipelines/etl.py
git commit -am "Agrega Colombia"
```
```respuesta
git status
```
```solucion
git status
```
:::

:::ejercicio cli
Intenta subir tu commit con `git push`. (El comando falla a propósito: Camila subió algo antes. Lee bien el mensaje).
```setup
cd ~
rm -rf pipelines
reiniciar-remoto https://github.com/tienda-andina/pipelines
git clone https://github.com/tienda-andina/pipelines
cd ~/pipelines
sed -i 's/"Perú"]/"Perú", "Colombia"]/' pipelines/etl.py
git commit -am "Agrega Colombia"
```
```respuesta
git push
git push origin main
```
```solucion
git push
```
:::

:::ejercicio cli
El push fue rechazado. Trae los cambios del remoto y fusiónalos en tu rama (el comando falla con un conflicto: es lo esperado).
```setup
cd ~
rm -rf pipelines
reiniciar-remoto https://github.com/tienda-andina/pipelines
git clone https://github.com/tienda-andina/pipelines
cd ~/pipelines
sed -i 's/"Perú"]/"Perú", "Colombia"]/' pipelines/etl.py
git commit -am "Agrega Colombia"
git push
```
```respuesta
git pull
git pull origin main
```
```solucion
git pull
```
:::

:::ejercicio cli
Estás en medio del conflicto. Busca en `pipelines/etl.py` las líneas con las marcas `<<<<<<<` y `>>>>>>>` usando `grep -n` (para ver en qué líneas están).
```setup
cd ~
rm -rf pipelines
reiniciar-remoto https://github.com/tienda-andina/pipelines
git clone https://github.com/tienda-andina/pipelines
cd ~/pipelines
sed -i 's/"Perú"]/"Perú", "Colombia"]/' pipelines/etl.py
git commit -am "Agrega Colombia"
git pull
```
```respuesta
grep (-n|-nE|-En|-E -n|-n -E) .*(<<<<<<<|>>>>>>>).* (\./)?pipelines/etl\.py
```
```solucion
grep -n "<<<<<<<\|>>>>>>>" pipelines/etl.py
```
```pista
`grep -n "texto" archivo` muestra las líneas que contienen el texto, con su número. Para buscar dos textos: `"<<<<<<<\|>>>>>>>"`.
```
:::

:::ejercicio cli
Te equivocaste resolviendo y quieres volver a como estabas antes del `git pull`. Deshaz la fusión.
```setup
cd ~
rm -rf pipelines
reiniciar-remoto https://github.com/tienda-andina/pipelines
git clone https://github.com/tienda-andina/pipelines
cd ~/pipelines
sed -i 's/"Perú"]/"Perú", "Colombia"]/' pipelines/etl.py
git commit -am "Agrega Colombia"
git pull
```
```respuesta
git merge --abort
```
```solucion
git merge --abort
```
:::

:::ejercicio cli
Resolviste el conflicto: dejaste `PAISES = ["Chile", "Perú", "México", "Colombia"]` y borraste las marcas. Márcalo como resuelto agregando el archivo.
```setup
cd ~
rm -rf pipelines
reiniciar-remoto https://github.com/tienda-andina/pipelines
git clone https://github.com/tienda-andina/pipelines
cd ~/pipelines
sed -i 's/"Perú"]/"Perú", "Colombia"]/' pipelines/etl.py
git commit -am "Agrega Colombia"
git pull
sed -i '/^<<<<<<< /d; /^=======$/d; /^>>>>>>> /d; /"Colombia"\]$/d' pipelines/etl.py
sed -i 's/"México"]/"México", "Colombia"]/' pipelines/etl.py
```
```respuesta
git add (\./)?pipelines/etl\.py
git add \.
git add -A
```
```solucion
git add pipelines/etl.py
```
:::

:::ejercicio cli
Estás a mitad de un cambio en el README y te piden algo urgente. Guarda tus cambios sin hacer commit, para dejar el árbol limpio.
```setup
cd ~
rm -rf pipelines
reiniciar-remoto https://github.com/tienda-andina/pipelines
git clone https://github.com/tienda-andina/pipelines
cd ~/pipelines
echo "Pendiente: documentar el filtro de fechas" >> README.md
```
```respuesta
git stash
git stash push
git stash push -m ['"].+['"]
git stash save ['"].+['"]
```
```solucion
git stash
```
:::

:::ejercicio cli
Ya terminaste lo urgente. Recupera los cambios que guardaste en el stash (y sácalos del cajón).
```setup
cd ~
rm -rf pipelines
reiniciar-remoto https://github.com/tienda-andina/pipelines
git clone https://github.com/tienda-andina/pipelines
cd ~/pipelines
echo "Pendiente: documentar el filtro de fechas" >> README.md
git stash
```
```respuesta
git stash pop
```
```solucion
git stash pop
```
:::

:::ejercicio cli
Estás en tu rama `feature/colombia` y `origin/main` avanzó (ya hiciste `git fetch`). Reescribe tu rama sobre `origin/main` con **rebase**.
```setup
cd ~
rm -rf pipelines
reiniciar-remoto https://github.com/tienda-andina/pipelines
git clone https://github.com/tienda-andina/pipelines
cd ~/pipelines
git switch -c feature/colombia
echo "- Colombia agregado por pedido de marketing" >> README.md
git commit -am "Documenta Colombia"
git fetch
```
```respuesta
git rebase origin/main
```
```solucion
git rebase origin/main
```
:::

:::ejercicio cli
Tu rama `feature/colombia` está lista y ya la subiste. Abre un pull request con el título `Agrega Colombia al ETL` (ya iniciaste sesión con `gh auth login`).
```setup
cd ~
rm -rf pipelines
reiniciar-remoto https://github.com/tienda-andina/pipelines
git clone https://github.com/tienda-andina/pipelines
cd ~/pipelines
gh auth login
git switch -c feature/colombia
echo "- Colombia" >> README.md
git commit -am "Agrega Colombia"
git push -u origin feature/colombia
```
```respuesta
gh pr create (.* )?(--title|-t) ['"]Agrega Colombia al ETL['"].*
```
```solucion
gh pr create --title "Agrega Colombia al ETL" --body "Pedido de marketing"
```
:::

:::ejercicio quiz
Tu compañera ya bajó tu rama `feature/ventas` para revisarla. Quieres ponerla al día con `main`. ¿Qué haces?
- [ ] `git rebase main` y `git push --force`
- [x] `git merge main` (o `git pull origin main`) y `git push`
- [ ] Borras la rama y la creas de nuevo
- [ ] Nada: Git lo actualiza solo
```explicacion
El rebase reescribe los commits (cambian los hashes) y obliga a hacer push forzado: la copia de tu compañera queda desincronizada. En una rama compartida, merge.
```
:::

:::ejercicio quiz
¿Cuál es el mejor pull request?
- [ ] 2.000 líneas en 40 archivos, título "cambios", sin descripción
- [x] 60 líneas, título "Agrega Colombia al ETL", descripción con el ticket, el porqué y cómo se probó
- [ ] Un PR por cada línea cambiada
- [ ] El que no tiene tests, porque se revisa más rápido
```explicacion
Chico, claro y con contexto: se revisa en minutos y queda como documentación de por qué cambió el código.
```
:::
