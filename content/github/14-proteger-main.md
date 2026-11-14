---
titulo: Proteger main - reglas para que nada entre sin PR, aprobación y tests en verde
nivel: 4 · Intermedio-avanzado
duracion: 45
resumen: En un equipo de datos, main es lo que corre en producción. Las reglas de protección de rama obligan a que todo cambio entre por pull request, con al menos una aprobación y los checks de CI en verde. Crear la regla, ver cómo rechaza un push directo (GH006), cómo bloquea un PR con tests en rojo y qué opciones conviene activar.
objetivos: Explicar por qué se protege main | Crear una regla que exija PR, aprobación y un check | Reconocer el error GH006 y recuperarse | Ver un PR bloqueado por checks o falta de aprobación | Conocer las opciones de rulesets en GitHub real
prerrequisitos: github-github-actions
autoevaluacion: ¿Sabes qué pasa si haces push directo a una main protegida? | ¿Sabes cómo exigir que pasen los tests antes de fusionar? | ¿Sabes deshacer un commit local que no pudiste subir? | ¿Sabes qué es un required status check?
---

:::analogia En palabras simples
Proteger main es como poner una regla en una cocina de restaurante: ningún plato sale al salón sin que el jefe de cocina lo pruebe. Aunque seas el dueño, el plato pasa por el control.
:::

## Paso 1 — Crear la regla

En `ventas-app`: **Settings → Branches → Add classic branch protection rule**.

```captura
archivo: github/g14-regla.webp
texto: La regla para main - patrón main (1), exigir pull request con 1 aprobación (2) y exigir el check tests (3)
```

| Opción | Qué obliga |
|---|---|
| **Branch name pattern**: `main` | A qué rama(s) aplica (admite comodines: `release/*`) |
| **Require a pull request before merging** | Nada entra por push directo |
| **Required approvals**: 1 | Al menos una aprobación de otra persona |
| **Require status checks to pass** → `tests` | El check del workflow tiene que estar en verde |

Guarda con **Create**:

```captura
archivo: github/g14-reglas.webp
texto: La regla creada - Require 1 approval y 1 required check
```

:::nota El nombre del check
El check se llama como el **job** del workflow (`tests`). Si renombras el job, la regla espera un check que nunca llega y los PRs quedan bloqueados para siempre ("Expected — Waiting for status to be reported").
:::

## Paso 2 — Intentar un push directo

```bash
git switch main
# cambia cualquier línea del README
git commit -am "Cambio directo a main"
git push
```

```captura
archivo: github/g14-push-rechazado.webp
texto: GH006 - Protected branch update failed - Changes must be made through a pull request
```

## Paso 3 — Recuperarte del commit que no pudo subir

Tu `main` local tiene un commit que GitHub no acepta. Dos caminos:

| Quieres | Comandos |
|---|---|
| **Conservar** el cambio | `git switch -c feature/readme-cambio` → `git push -u origin feature/readme-cambio` → PR. Después `git switch main && git reset --hard origin/main` |
| **Descartarlo** | `git reset --hard origin/main` |

`git reset --hard origin/main` deja tu main igual a la de GitHub. **Borra los cambios no subidos de esa rama**: úsalo solo cuando ya los guardaste en otra rama o no los quieres.

## Paso 4 — Un PR bloqueado

Crea un PR que rompa algo (por ejemplo, que vuelva a agregar `import csv` sin usar). En la caja de merge vas a ver:

- **Some checks were not successful** — el check `tests` en rojo.
- **Review required** — falta la aprobación.
- **Merging is blocked** y el botón gris.

Arregla, sube, pide revisión: cuando las dos condiciones se cumplen, el botón vuelve a verde. Ese es el ciclo normal en un equipo.

:::cuidado "Soy admin, puedo saltearla"
El dueño del repositorio ve la opción de fusionar igual (**bypass**). La opción **Do not allow bypassing the above settings** (o *Include administrators*) aplica la regla también a los admins. En producción, actívala: los incidentes más caros empiezan con "era un cambio chiquito".
:::

## Paso 5 — Más opciones útiles

| Opción | Para qué |
|---|---|
| **Require branches to be up to date before merging** | El PR tiene que tener lo último de main (evita que dos PRs verdes por separado rompan main juntos) |
| **Require conversation resolution** | No se fusiona con comentarios sin resolver |
| **Dismiss stale approvals** | Un push nuevo anula las aprobaciones viejas |
| **Require review from Code Owners** | Aprobación de los dueños del área tocada (lección 15) |
| **Restrict deletions / Block force pushes** | Nadie borra ni reescribe main |

## Paso 6 — En GitHub real: rulesets

GitHub real tiene además **Rulesets** (Settings → Rules → Rulesets): las mismas reglas pero con más control (varias reglas por rama, aplicar a toda una organización, modo *Evaluate* para probar sin bloquear). Las *classic branch protection rules* que usaste siguen funcionando y son las que vas a ver en la mayoría de los repositorios.

## ✅ Lo que lograste

- Protegiste main con PR, aprobación y check obligatorios.
- Viste el rechazo GH006 y sabes recuperarte.
- Sabes por qué un PR queda bloqueado y cómo destrabarlo.

:::ejercicio quiz
Main está protegida y haces `git push` directo. ¿Qué pasa?
- [ ] Se sube con una advertencia
- [x] GitHub lo rechaza con GH006 y pide hacerlo por pull request
- [ ] Se crea un PR automáticamente
- [ ] Se borra la regla
:::

:::ejercicio quiz
¿Cómo exiges que los tests pasen antes de fusionar?
- [ ] Escribiéndolo en el README
- [x] Con Require status checks to pass y el nombre del check (el job del workflow)
- [ ] Con Required approvals
- [ ] No se puede
:::

:::ejercicio quiz
Hiciste un commit en main local que no pudiste subir y quieres conservarlo. ¿Qué haces?
- [ ] git reset --hard origin/main directamente
- [x] Creo una rama desde ahí, la subo y abro un PR; después dejo main igual a origin/main
- [ ] git push --force
- [ ] Borro el repositorio
:::
