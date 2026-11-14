---
titulo: Clonar, subir y traer - el ida y vuelta entre tu computadora y GitHub
nivel: 2 · Básico-intermedio
duracion: 45
resumen: Cómo se conecta tu repositorio local con GitHub. Clonar un repositorio, trabajar en una rama, hacer commits y subirlos con push, traer los cambios del equipo con pull, iniciar sesión con la CLI de GitHub (gh) y leer lo que responde el servidor cuando subes una rama nueva.
objetivos: Clonar un repositorio de GitHub con git clone | Crear una rama, hacer commits y subirla con git push -u | Traer los cambios del remoto con git pull | Autenticarse con gh auth login | Leer la respuesta del servidor después de un push
prerrequisitos: github-proyecto-repositorio-portafolio
autoevaluacion: ¿Sabes qué crea git clone? | ¿Sabes qué hace -u en git push -u origin rama? | ¿Sabes cuándo hacer git pull? | ¿Sabes qué es origin?
---

:::analogia En palabras simples
Clonar es bajar a tu computadora una copia completa del proyecto, con toda su historia. Después trabajas tranquilo en tu copia; cuando tienes algo listo, lo **subes** (push), y cuando el equipo subió cosas, las **traes** (pull).
:::

## Paso 1 — Abre la terminal de la práctica

En [GitHub de práctica](#/github), el botón de terminal de la barra superior abre abajo la terminal conectada a estos repositorios.

## Paso 2 — Clona y crea una rama

```bash
cd ~
git clone https://github.com/alumno/ventas-app.git
cd ventas-app
git checkout -b feature/resumen
```

| Comando | Hace |
|---|---|
| `git clone URL` | Crea la carpeta `ventas-app` con todos los archivos y la historia, y la conecta al remoto como `origin` |
| `git remote -v` | Muestra a dónde está conectado (`origin` = la URL de GitHub) |
| `git checkout -b feature/resumen` | Crea una rama y se cambia a ella |

## Paso 3 — Commit y push

Crea un archivo `resumen.py` (en la práctica, con `nano resumen.py` o desde [VS Code de práctica](#/vscode) con `code .`) y después:

```bash
git add .
git commit -m "Agrega el resumen de ventas por canal"
git push -u origin feature/resumen
```

```captura
archivo: github/g05-push.webp
texto: El push de una rama nueva: el servidor responde con el enlace para crear un pull request
```

Fíjate en la respuesta del servidor:

| Línea | Significa |
|---|---|
| `Create a pull request for 'feature/resumen' on GitHub by visiting: …/pull/new/feature/resumen` | GitHub te ofrece abrir el PR de esa rama |
| `* [new branch] feature/resumen -> feature/resumen` | La rama se creó en el remoto |
| `rama 'feature/resumen' configurada para rastrear 'origin/feature/resumen'` | Gracias a `-u`, desde ahora basta con `git push` y `git pull` en esta rama |

## Paso 4 — Traer los cambios del equipo

```bash
git checkout main
git pull
```

`git pull` trae los commits nuevos del remoto y los aplica a tu rama. Regla: **antes de empezar algo nuevo, `git pull` en `main`**, así partes de lo último.

| Si `git pull` dice… | Significa |
|---|---|
| `Already up to date.` | No había nada nuevo |
| `Fast-forward` | Llegaron commits y se aplicaron sin conflicto |
| `CONFLICT` | Alguien cambió las mismas líneas que tú (lección 11) |

## Paso 5 — Iniciar sesión con gh

La CLI de GitHub (`gh`) permite crear repositorios, PRs e issues desde la terminal. La primera vez:

```bash
gh auth login
```

En la práctica responde sola; en tu computadora te muestra un código y abre el navegador para autorizar (lección 23). Después: `gh repo create`, `gh pr create`, `gh issue list`, `gh pr checks`…

:::cuidado GitHub no acepta contraseñas en la terminal
Desde 2021, `git push` con usuario y contraseña falla. Se usa `gh auth login`, un token personal o una clave SSH. Si alguna guía vieja te dice "escribe tu contraseña", ese paso ya no funciona.
:::

## ✅ Lo que lograste

- Clonas, trabajas en una rama, haces commit y subes con push.
- Traes los cambios del equipo con pull.
- Inicias sesión con gh para trabajar desde la terminal.

:::ejercicio quiz
¿Qué hace `git clone https://github.com/alumno/ventas-app.git`?
- [ ] Sube tu carpeta a GitHub
- [x] Baja una copia completa del repositorio, con su historia, y la conecta como origin
- [ ] Crea un repositorio vacío
- [ ] Copia solo el README
:::

:::ejercicio quiz
¿Para qué sirve el `-u` en `git push -u origin feature/x`?
- [ ] Para forzar el push
- [x] Para dejar la rama asociada al remoto: después basta con git push y git pull
- [ ] Para borrar la rama
- [ ] Para subir sin commit
:::

:::ejercicio quiz
¿Qué conviene hacer antes de crear una rama para un cambio nuevo?
- [ ] git push --force
- [x] git checkout main y git pull, para partir de lo último del equipo
- [ ] Borrar el repositorio local
- [ ] Nada
:::
