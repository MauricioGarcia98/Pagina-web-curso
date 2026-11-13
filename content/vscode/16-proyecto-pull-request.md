---
titulo: Proyecto 4 (entregables y pistas mínimas) - un cambio completo, de la rama al pull request
nivel: 4 · Intermedio-avanzado
duracion: 90
resumen: Te asignan un cambio en el proyecto ventas_app - agregar la validación de emails con sus tests - y tienes que entregarlo como se hace en un equipo - rama con nombre claro, commits pequeños con buenos mensajes, tests y ruff en verde, push, y un pull request con descripción, que revisas, ajustas y fusionas. Entregables y una rúbrica; pistas solo para lo difícil.
objetivos: Planificar un cambio en pasos que se puedan commitear | Trabajar en una rama con commits pequeños y mensajes útiles | Acompañar el cambio con tests y código limpio | Subir la rama y abrir un pull request con buena descripción | Responder a una revisión y fusionar
prerrequisitos: vscode-git-con-el-equipo
autoevaluacion: ¿Sabes dividir un cambio en commits? | ¿Sabes qué debe decir la descripción de un PR? | ¿Sabes comprobar que todo pasa antes de pedir revisión? | ¿Sabes fusionar y limpiar la rama?
---

:::escenario La tarea
Ticket del tablero del equipo: **VENTAS-42 · Validar emails antes de exportar clientes.** *"El archivo de clientes que mandamos a marketing tiene emails mal escritos (sin @, con espacios). Agregar a `src/limpieza.py` una función que diga si un email es válido, con tests, y dejar documentado en el README cómo se usa. Entregar como PR para revisión."*
:::

Sabes **qué** entregar. Las pistas están cerradas.

## Punto de partida

El repositorio `ventas_app` de las lecciones 13 a 15 (con `README.md`, `src/limpieza.py`, `.gitignore` y al menos un commit en `main`), conectado a la réplica de GitHub con `gh repo create`. Si no lo tienes, créalo primero siguiendo la lección 13.

## Entregable 1 — La rama

Una rama con nombre convencional que referencie el ticket, creada desde `main` actualizado.

<details><summary>💡 Pista</summary>

`git checkout main && git pull` y después `git checkout -b feature/VENTAS-42-validar-emails`.

</details>

## Entregable 2 — El código y los tests (en commits separados)

- `es_email_valido(email)` en `src/limpieza.py`: `True` si, después de quitar espacios, tiene exactamente una `@`, algo antes de la `@` y un punto en la parte de después.
- `tests/test_limpieza.py` con al menos cinco casos: uno válido, uno sin `@`, uno con dos `@`, uno sin punto en el dominio y uno con espacios alrededor (válido después de limpiar).
- `pytest` y `ruff check .` sin problemas.
- Al menos **tres commits**: la función, los tests, el README.

<details><summary>💡 Pista: importar desde tests/</summary>

Desde la raíz del proyecto, `pytest` encuentra `tests/test_limpieza.py`. Para importar `src/limpieza.py`, agrega un archivo vacío `tests/__init__.py` y en el test `from src.limpieza import es_email_valido`, o ejecuta con `python -m pytest`.

</details>

## Entregable 3 — El README

Una sección `## Validación de emails` que explique qué considera válido y un ejemplo de uso.

## Entregable 4 — El pull request

La rama subida (`git push -u origin …`) y un PR con:

- **Título** que diga qué cambia (no "cambios" ni el nombre de la rama).
- **Descripción** con: qué problema resuelve (el ticket), qué cambia, cómo se probó y qué queda fuera.

<details><summary>💡 Pista</summary>

`gh pr create --title "Valida emails antes de exportar clientes (VENTAS-42)" --body "..."`. Después mira el PR en la [réplica de GitHub](#/github).

</details>

## Entregable 5 — La revisión

Imagina que el revisor comenta: *"¿Y un email en mayúsculas, como ANA@CORREO.COM? ¿Es válido?"*. Decide, agrega el test correspondiente en un commit nuevo en la misma rama, súbelo y responde el comentario. Después fusiona el PR (`gh pr merge`) y borra la rama local.

## Rúbrica

| Criterio | Bien | Muy bien |
|---|---|---|
| Rama | Nombre claro, desde main | Desde main actualizado, con el ticket en el nombre |
| Commits | Tres o más con mensajes útiles | Cada commit es una idea y el proyecto funciona en cada uno |
| Tests | Cinco casos que pasan | Incluyen los bordes y el caso que pidió el revisor |
| Calidad | ruff sin problemas | Además formateado y sin código de prueba olvidado |
| PR | Título y descripción | La descripción explica problema, cambio, prueba y alcance |
| Revisión | Se corrigió lo pedido | Se respondió el comentario con la decisión tomada |

:::ejercicio quiz
¿Desde dónde conviene crear la rama de un cambio nuevo?
- [ ] Desde la rama de un compañero
- [x] Desde main actualizado con git pull
- [ ] Desde cualquier commit viejo
- [ ] No hace falta rama
:::

:::ejercicio quiz
¿Qué debería tener la descripción de un PR?
- [ ] Solo el nombre de la rama
- [x] Qué problema resuelve, qué cambia, cómo se probó y qué queda fuera
- [ ] El código completo
- [ ] Nada, el código se explica solo
:::

:::ejercicio quiz
El revisor pide un cambio. ¿Qué haces?
- [ ] Abro un PR nuevo desde cero
- [x] Hago el cambio en la misma rama, commit y push: el PR se actualiza solo
- [ ] Fusiono igual y lo arreglo después
- [ ] Borro el PR
:::
