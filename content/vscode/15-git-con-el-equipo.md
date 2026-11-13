---
titulo: Git con el equipo - repositorio remoto, push, pull, pull requests y conflictos
nivel: 4 · Intermedio-avanzado
duracion: 50
resumen: Git se vuelve indispensable cuando trabajan varias personas. Cómo conectar tu repositorio con GitHub, subir (push) y traer (pull) cambios, el flujo de trabajo con ramas y pull requests que usan casi todos los equipos, cómo se ve un conflicto en VS Code y cómo resolverlo eligiendo qué versión queda.
objetivos: Crear un repositorio remoto y conectarlo con push | Traer los cambios del equipo con pull | Seguir el flujo rama → commits → push → pull request → revisión → merge | Reconocer y resolver un conflicto de merge en VS Code | Evitar los errores comunes al trabajar en equipo
prerrequisitos: vscode-ramas-e-historial
autoevaluacion: ¿Sabes qué diferencia hay entre commit y push? | ¿Sabes qué es un pull request? | ¿Sabes qué significan los marcadores <<<<<<< y >>>>>>>? | ¿Sabes por qué conviene hacer pull antes de empezar?
---

:::analogia En palabras simples
Tu repositorio local es tu cuaderno; GitHub es la carpeta compartida del equipo. **Commit** es escribir en tu cuaderno; **push** es subir tus páginas a la carpeta; **pull** es traer lo que subieron los demás. El pull request es pedir: "revisen estas páginas antes de agregarlas a la versión oficial".
:::

## Paso 1 — Conecta con GitHub

En la terminal integrada, dentro de `ventas_app` (con al menos un commit):

```bash
gh repo create ventas_app --private --source=. --push
```

Crea el repositorio en GitHub, lo conecta como `origin` y sube tu rama. En la práctica se crea en la [réplica de GitHub](#/github); en tu computadora, en GitHub de verdad (después de `gh auth login`).

| Comando | Hace |
|---|---|
| `git remote -v` | Muestra a dónde está conectado el repositorio |
| `git push` | Sube tus commits de la rama actual |
| `git push -u origin feature/x` | Sube una rama nueva y la deja asociada |
| `git pull` | Trae y aplica los commits nuevos del remoto |

En la vista de Git de VS Code, las flechas **↓** (pull) y **↑** (push) ejecutan lo mismo.

## Paso 2 — El flujo de trabajo del equipo

1. `git checkout main && git pull` — empiezas desde lo último.
2. `git checkout -b feature/algo` — una rama para tu cambio.
3. Commits pequeños mientras trabajas.
4. `git push -u origin feature/algo` — subes la rama.
5. **Pull request** (`gh pr create` o desde GitHub): describes qué cambia y por qué.
6. Alguien revisa, comenta, tú corriges con más commits en la misma rama.
7. Cuando está aprobado y los tests pasan, se fusiona en `main`.

:::tip Commits chicos, PR chicos
Un PR de 50 líneas se revisa en diez minutos y bien; uno de 2.000 líneas se aprueba sin leer. Divide el trabajo en cambios que se entiendan solos.
:::

## Paso 3 — Un conflicto

Un conflicto aparece cuando dos personas cambiaron **las mismas líneas** de un archivo. Al hacer `git pull` o `git merge`, Git no sabe con cuál quedarse y marca el archivo:

```text
<<<<<<< HEAD
UMBRAL = 8.0
=======
UMBRAL = 7.5
>>>>>>> feature/ajuste-umbral
```

| Marcador | Significa |
|---|---|
| `<<<<<<< HEAD` | Empieza tu versión (la de la rama donde estás) |
| `=======` | Separa las dos versiones |
| `>>>>>>> feature/…` | Termina la versión que llega de la otra rama |

## Paso 4 — Resolverlo en VS Code

1. El archivo aparece con **C** en el explorador y en la vista de Git.
2. VS Code real muestra encima del conflicto los botones **Aceptar cambio actual**, **Aceptar cambio entrante**, **Aceptar ambos** y **Comparar**. En la práctica, editas el texto a mano.
3. Deja el archivo como debe quedar (puede ser una de las dos versiones o una combinación) y **borra los tres marcadores**.
4. Guarda, `git add archivo` y `git commit`.

:::cuidado Resolver no es elegir al azar
Antes de elegir, pregunta: ¿por qué la otra persona cambió esa línea? Un conflicto en `UMBRAL` es una decisión de negocio, no técnica. Si no estás seguro, pregunta antes de fusionar.
:::

Para practicar conflictos con casos guiados está la lección [Git en equipo](#/l/fundamentos-git-en-equipo).

## Paso 5 — Errores comunes

| Error | Cómo evitarlo |
|---|---|
| Trabajar directo en `main` | Siempre una rama por cambio |
| Empezar sin `git pull` | Traer lo último antes de crear la rama |
| `git push --force` en una rama compartida | Borra el trabajo de otros: no lo uses salvo que sepas exactamente por qué |
| Subir datos o claves | `.gitignore` desde el primer commit |
| Commits enormes con "varios cambios" | Un commit, una idea |

## ✅ Lo que lograste

- Conectas un repositorio con GitHub y sincronizas con push y pull.
- Conoces el flujo de ramas y pull requests.
- Sabes leer y resolver un conflicto.

:::ejercicio quiz
Hiciste commit pero tu compañera no ve tus cambios en GitHub. ¿Qué falta?
- [ ] Otro commit
- [x] git push
- [ ] git pull
- [ ] Reiniciar VS Code
:::

:::ejercicio quiz
¿Qué indica `=======` dentro de un conflicto?
- [ ] El final del archivo
- [x] La separación entre tu versión y la que llega de la otra rama
- [ ] Una línea comentada
- [ ] Que el conflicto ya se resolvió
:::

:::ejercicio quiz
¿Qué es un pull request?
- [ ] Un comando para traer cambios
- [x] Un pedido para que el equipo revise tu rama antes de fusionarla en main
- [ ] Una copia de seguridad
- [ ] Un error de Git
:::
