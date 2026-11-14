---
titulo: Proyecto 2 (guiado, con pistas) - organizar el trabajo de un proyecto con issues
nivel: 2 · Básico-intermedio
duracion: 60
resumen: Tu líder te pide que el repositorio ventas-app deje de ser un archivo suelto y tenga el trabajo organizado - un README completo, un backlog de issues bien escritos con etiquetas y responsable, y el primero de ellos resuelto desde la terminal y cerrado automáticamente. Cada tarea dice qué hacer; los comandos están en pistas.
objetivos: Convertir un pedido en issues chicos con criterio de terminado | Etiquetar y asignar issues | Resolver un issue desde la terminal y cerrarlo con el mensaje del commit | Documentar el proyecto en el README con Markdown | Revisar el estado del proyecto con filtros
prerrequisitos: github-markdown-en-github
autoevaluacion: ¿Sabes dividir un pedido en issues? | ¿Sabes escribir el criterio de terminado de un issue? | ¿Sabes cerrar un issue desde un commit? | ¿Sabes ver qué falta con un filtro?
---

:::escenario El pedido
Mensaje de tu líder: *"Para `ventas-app` quiero ver el trabajo organizado antes de seguir: un README que explique qué es y cómo se usa, y el backlog en issues. Lo que falta: leer el CSV de ventas, los totales por canal, el ticket promedio, tests y un workflow de CI. Arrancá por el README y cerrá ese issue cuando esté."*
:::

No hay capturas de cada clic. Cada tarea dice **qué** hacer; los comandos están en la pista.

## Tarea 1 — El backlog

Crea **cinco issues**, uno por cada cosa que falta, más uno para el README:

| Issue | Etiqueta |
|---|---|
| Documentar el proyecto en el README | `documentation` |
| Leer el CSV de ventas | `enhancement` |
| Totales por canal | `enhancement` |
| Ticket promedio por canal | `enhancement` |
| Tests y CI | `enhancement` |

Cada uno con una descripción de dos o tres líneas que termine con **Terminado cuando:** y una condición verificable. Asígnate el del README.

<details><summary>💡 Pista</summary>

Pestaña Issues → New issue; las etiquetas y el responsable se eligen con la ruedita de la barra lateral. Desde la terminal también: `gh issue create --title "..." --body "..." --label documentation --assignee @me`.

</details>

## Tarea 2 — El README

Clona el repositorio (si no lo tienes), y escribe un README con: título y una línea, **Cómo se instala**, **Cómo se usa** (con un bloque de código), **Estructura** (una tabla con las carpetas) y **Estado** (una lista de tareas que enlace a los issues con `#n`).

<details><summary>💡 Pista</summary>

En la terminal de la práctica, `nano README.md` o `code .` para abrirlo en VS Code de práctica. Para la lista: `- [ ] Leer el CSV de ventas (#3)`.

</details>

## Tarea 3 — Cerrar el issue con el commit

Haz commit del README con un mensaje que **cierre el issue** del README, y súbelo a `main`.

<details><summary>💡 Pista</summary>

`git add README.md && git commit -m "README: instalación, uso y estado (Closes #N)" && git push`, con el número de tu issue. Un commit que llega a `main` con `Closes #N` cierra el issue igual que un PR.

</details>

## Tarea 4 — El estado del proyecto

Con el buscador de issues, encuentra: los abiertos con etiqueta `enhancement`, los cerrados y los asignados a ti. Anota cuántos hay de cada uno.

<details><summary>💡 Pista</summary>

`is:open label:enhancement`, `is:issue is:closed`, `assignee:@me`.

</details>

## ✔ Control

| Control | Esperado |
|---|---|
| Issues creados | 5 (o más si dividiste alguno) |
| Issues con etiqueta | Todos |
| Issues con "Terminado cuando:" | Todos |
| Issue del README | Cerrado por tu commit (se ve el enlace al commit en el issue) |
| `is:open label:enhancement` | 4 |
| README | Se ve con formato, con tabla, bloque de código y lista de tareas con enlaces `#n` |

## Entrega

Mensaje a tu líder: *"Listo: README completo y el backlog en 5 issues (4 abiertos de mejoras, el del README cerrado). Sigo por 'Leer el CSV de ventas'."*

## 🖥️ Hazlo también en GitHub real

En GitHub real hay además **Projects** (un tablero tipo Kanban con columnas Todo / In progress / Done que se llena con tus issues) y **Milestones** (agrupar issues por entrega). Pruébalos en tu repositorio de portafolio.

:::ejercicio quiz
¿Para qué sirve "Terminado cuando:" en un issue?
- [ ] Para poner la fecha límite
- [x] Para que quede claro qué condición verificable indica que el issue se puede cerrar
- [ ] Para asignar el issue
- [ ] No sirve
:::

:::ejercicio quiz
Un commit con `Closes #5` llega a main. ¿Qué pasa con el issue 5?
- [ ] Nada
- [x] Se cierra automáticamente y queda enlazado al commit
- [ ] Se borra
- [ ] Se reabre
:::

:::ejercicio quiz
¿Por qué conviene un issue por cada parte del trabajo en lugar de uno grande?
- [ ] Porque GitHub cobra por issue
- [x] Porque los issues chicos se terminan, se revisan y se cierran, y se ve el avance real
- [ ] Porque los grandes no tienen número
- [ ] No conviene
:::
