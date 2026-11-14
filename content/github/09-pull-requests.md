---
titulo: Pull requests - proponer un cambio para que el equipo lo vea antes de entrar a main
nivel: 3 · Intermedio
duracion: 45
resumen: El pull request (PR) es el corazón del trabajo en equipo en GitHub - una rama con cambios más una conversación para decidir si entran a main. Crear un PR desde la web y desde la terminal con gh, escribir un buen título y descripción, recorrer sus pestañas (Conversation, Commits, Files changed), los borradores y cómo un PR cierra issues.
objetivos: Explicar qué es un pull request y por qué existe | Crear un PR desde la web y con gh pr create | Escribir título y descripción útiles | Leer las pestañas Conversation, Commits y Files changed | Usar borradores y enlazar issues
prerrequisitos: github-proyecto-organizar-el-trabajo
autoevaluacion: ¿Sabes de qué rama a qué rama va un PR? | ¿Sabes crear un PR desde la terminal? | ¿Sabes qué poner en la descripción? | ¿Sabes qué muestra Files changed?
---

:::analogia En palabras simples
Un pull request es como entregar un borrador a tu jefe con una nota: "acá está lo que cambié, por qué, y cómo probarlo. ¿Lo revisas antes de que lo publiquemos?". La rama es el borrador; el PR es la entrega con la conversación.
:::

## Paso 1 — Qué es un PR

Un PR dice: **"quiero llevar los commits de la rama `feature/resumen` a `main`"**. Mientras está abierto:

- El equipo ve exactamente qué cambia, línea por línea.
- Se comenta, se pide cambios y se aprueba.
- Corren los tests automáticos (GitHub Actions, nivel 4).
- Si llegan commits nuevos a la rama, el PR se actualiza solo.

| Término | Significa |
|---|---|
| **base** | La rama que recibe los cambios (casi siempre `main`) |
| **compare** / **head** | Tu rama con los cambios |
| **merge** | Fusionar: los cambios entran a la base |

## Paso 2 — Crear el PR desde la terminal

En el nivel 2 subiste la rama `feature/resumen` de `ventas-app`. Si todavía no creaste el PR (o lo haces de nuevo con otra rama):

```bash
gh auth login
gh pr create --title "Agrega el resumen de ventas por canal" --body "Closes #1. Agrega totales_por_canal con un test que comprueba que se ignoran los cancelados."
```

`gh auth login` se hace una vez: conecta la terminal con tu cuenta. `gh pr create` crea el PR desde la rama en la que estás hacia la rama por defecto.

:::nota Desde la web también
Después de un `git push` de una rama nueva, GitHub muestra un aviso amarillo **"feature/resumen had recent pushes"** con el botón **Compare & pull request**. También: pestaña **Pull requests → New pull request**, eliges base y compare.
:::

## Paso 3 — La página del PR

```captura
archivo: github/g09-pr.webp
texto: El PR número 2 con sus pestañas: Conversation, Commits, Checks y Files changed
```

| Pestaña | Qué tiene |
|---|---|
| **Conversation** | La descripción, los comentarios, las revisiones y la caja de merge al final |
| **Commits** | Los commits de la rama que entrarían |
| **Checks** | Los tests automáticos (cuando hay workflows) |
| **Files changed** | El diff: qué líneas se agregan (verde) y cuáles se quitan (rojo) |

Fíjate en el número: es **#2** porque issues y PRs comparten la numeración del repositorio (el #1 es el issue).

## Paso 4 — Files changed

```captura
archivo: github/g09-archivos.webp
texto: Files changed: resumen.py y test_resumen.py completos en verde porque son archivos nuevos
```

Acá trabaja quien revisa. Pasando el mouse por una línea aparece un **+** azul para comentar esa línea (lo usas en la próxima lección).

## Paso 5 — Un buen título y una buena descripción

| Mal | Bien |
|---|---|
| "cambios" | "Agrega el resumen de ventas por canal" |
| "fix" | "Corrige el total cuando hay pedidos cancelados" |
| Descripción vacía | Qué cambia, por qué, cómo probarlo, qué issue cierra |

Una plantilla que sirve casi siempre:

```text
## Qué cambia
Agrega totales_por_canal() en resumen.py.

## Por qué
El reporte semanal necesita los totales por canal sin cancelados (#1).

## Cómo probarlo
pytest

Closes #1
```

:::tip El revisor no está en tu cabeza
Escribe la descripción para alguien que no sabe nada de lo que hiciste. Si el PR toca algo delicado (datos de producción, una tabla que usan otros), dilo arriba de todo.
:::

## Paso 6 — Borradores y PRs chicos

- **Draft pull request**: en el botón verde de crear, la flecha permite **Create draft pull request**. Sirve para mostrar trabajo a medio hacer y pedir opinión temprano; no se puede fusionar hasta marcarlo **Ready for review**. Con gh: `gh pr create --draft`.
- **PRs chicos**: un PR de 50 líneas se revisa en 10 minutos; uno de 1500 se aprueba sin leer. Un PR = una idea.

## ✅ Lo que lograste

- Sabes qué es un PR y para qué sirve.
- Creaste uno desde la terminal y recorriste sus pestañas.
- Sabes escribir título y descripción útiles.

:::ejercicio quiz
En un PR, ¿qué es la rama base?
- [ ] La rama donde hiciste los cambios
- [x] La rama que recibe los cambios, normalmente main
- [ ] La primera rama del repositorio
- [ ] Una copia de seguridad
:::

:::ejercicio quiz
¿Dónde ves exactamente qué líneas cambió un PR?
- [ ] En Conversation
- [ ] En Commits
- [x] En Files changed
- [ ] En Insights
:::

:::ejercicio quiz
Subes un commit nuevo a la rama de un PR abierto. ¿Qué pasa?
- [ ] Hay que crear otro PR
- [x] El PR se actualiza solo con el commit nuevo
- [ ] El PR se cierra
- [ ] El commit va directo a main
:::

:::ejercicio quiz
¿Para qué sirve un draft pull request?
- [ ] Para fusionar sin revisión
- [x] Para mostrar trabajo a medio hacer y pedir opinión sin que se pueda fusionar todavía
- [ ] Para borrar una rama
- [ ] Para crear un issue
:::
