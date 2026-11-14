---
titulo: Fusionar un pull request - merge, squash, rebase y resolver conflictos
nivel: 3 · Intermedio
duracion: 50
resumen: El último paso del PR - fusionarlo. Las tres formas de hacerlo (merge commit, squash, rebase) y cuál usar, qué pasa con la rama y con los issues, cómo traer el resultado a tu computadora, y qué hacer cuando GitHub dice "This branch has conflicts" - resolverlos en la web o en la terminal.
objetivos: Fusionar un PR y confirmar el resultado | Elegir entre merge commit, squash y rebase | Borrar la rama y actualizar tu copia local | Provocar y resolver un conflicto en la web y en la terminal
prerrequisitos: github-revisar-codigo
autoevaluacion: ¿Sabes qué hace Squash and merge? | ¿Sabes qué hacer en tu computadora después de fusionar? | ¿Sabes por qué aparece un conflicto? | ¿Sabes qué significan las marcas <<<<<<< y >>>>>>>?
---

:::analogia En palabras simples
Fusionar es pasar el borrador aprobado al documento oficial. A veces, mientras tú escribías, otra persona cambió el mismo párrafo del documento oficial: eso es un conflicto, y alguien tiene que decidir qué versión queda.
:::

## Paso 1 — Fusionar

Con la aprobación de Camila, la caja al final del PR está en verde. Haz clic en **Merge pull request** y después en **Confirm merge**:

```captura
archivo: github/g11-confirmar-merge.webp
texto: La confirmación del merge con el mensaje "Merge pull request #2 from alumno/feature/resumen"
```

```captura
archivo: github/g11-fusionado.webp
texto: El PR quedó Merged (morado), con el botón Delete branch
```

Tres cosas pasaron:

1. Los commits de `feature/resumen` entraron a `main`.
2. El issue **#1** se cerró solo (por el `Closes #1`).
3. GitHub ofrece **Delete branch**: la rama ya cumplió su función. Bórrala (se puede restaurar).

```captura
archivo: github/g06-issue-cerrado.webp
texto: El issue 1 aparece cerrado, enlazado al PR que lo resolvió
```

## Paso 2 — Traer el resultado a tu computadora

`main` cambió en GitHub, pero tu copia local no se entera sola:

```bash
git switch main
git pull
git branch -d feature/resumen
```

## Paso 3 — Las tres formas de fusionar

La flecha junto al botón verde muestra el menú:

| Opción | Qué hace en main | Cuándo |
|---|---|---|
| **Create a merge commit** | Entran todos los commits de la rama + un commit de merge | Quieres conservar la historia completa |
| **Squash and merge** | Todos los commits de la rama se aplastan en **uno** | La rama tiene commits como "wip", "arreglo", "ahora sí": main queda limpia, un commit por PR |
| **Rebase and merge** | Los commits se copian uno por uno encima de main, sin commit de merge | Historia lineal conservando cada commit |

:::tip La más común en equipos de datos
Muchos equipos usan **Squash and merge**: cada PR es un solo commit en main con el título del PR. Si algo sale mal, se revierte un commit y listo. El administrador puede dejar habilitada solo una opción en **Settings → General**.
:::

Desde la terminal: `gh pr merge 2 --squash --delete-branch`.

## Paso 4 — Provocar un conflicto

Vamos a crearlo a propósito en `ventas-app`:

1. Crea una rama y cambia la primera línea de descripción del README:

```bash
git switch -c feature/readme
# edita README.md: cambia "Limpieza y resumen de las ventas de la tienda." por "Resumen semanal de ventas."
git commit -am "README: descripción más corta" && git push -u origin feature/readme
gh pr create --fill
```

2. Mientras tanto, en la web, edita el README **en main** (lápiz ✏️) y cambia **la misma línea** por "Scripts de ventas de Tienda Andina." → **Commit changes** directo a main.

3. Vuelve al PR. La caja dice **This branch has conflicts that must be resolved**, con el archivo en conflicto.

## Paso 5 — Resolver en la web

Haz clic en **Resolve conflicts**. GitHub muestra el archivo con marcas:

```text
<<<<<<< feature/readme
Resumen semanal de ventas.
=======
Scripts de ventas de Tienda Andina.
>>>>>>> main
```

| Marca | Significa |
|---|---|
| `<<<<<<< feature/readme` | Empieza tu versión |
| `=======` | Separa las dos versiones |
| `>>>>>>> main` | Termina la versión de main |

Deja el texto como debe quedar (puede ser una, la otra o una mezcla), **borra las tres marcas**, haz clic en **Mark as resolved** y **Commit merge**. El PR vuelve a estar verde.

## Paso 6 — Resolver en la terminal (lo más común en archivos de código)

```bash
git switch feature/readme
git pull origin main        # trae main a tu rama: aparece el conflicto
# abre README.md, deja la versión correcta y borra las marcas
git add README.md
git commit -m "Resuelve el conflicto con main"
git push
```

:::cuidado Las marcas no pueden quedar
Si haces commit con `<<<<<<<` dentro de un `.py`, el código ni siquiera corre. En la práctica, si pides revisión con marcas en el código, el revisor te lo marca. Antes de `git add`, busca: `grep -rn "<<<<<<<" .`
:::

## ✅ Lo que lograste

- Fusionaste un PR, cerraste el issue y borraste la rama.
- Sabes elegir entre merge commit, squash y rebase.
- Provocaste y resolviste un conflicto en la web y en la terminal.

:::ejercicio quiz
Tu rama tiene 7 commits ("wip", "arreglo", "ahora sí"…). Quieres un solo commit limpio en main. ¿Qué opción usas?
- [ ] Create a merge commit
- [x] Squash and merge
- [ ] Rebase and merge
- [ ] Close pull request
:::

:::ejercicio quiz
Fusionaste un PR en GitHub. ¿Qué haces en tu computadora para tener main al día?
- [ ] Nada, se actualiza sola
- [x] git switch main y git pull
- [ ] git push
- [ ] Clono el repositorio de nuevo
:::

:::ejercicio quiz
¿Cuándo aparece un conflicto?
- [ ] Siempre que dos personas trabajan en el mismo repositorio
- [x] Cuando las dos ramas cambiaron las mismas líneas de un archivo y git no puede decidir solo
- [ ] Cuando el PR no tiene descripción
- [ ] Cuando los tests fallan
:::

:::ejercicio quiz
Resolviste un conflicto pero dejaste la línea `=======` en el archivo. ¿Qué pasa?
- [ ] Nada, git la borra
- [x] La marca queda en el código y, en un .py, el programa ni siquiera corre
- [ ] GitHub la oculta
- [ ] Se crea un issue
:::
