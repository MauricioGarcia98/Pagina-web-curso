---
titulo: De la práctica a GitHub real - cuenta, autenticación, herramientas y tu perfil
nivel: 6 · Avanzado completo
duracion: 45
resumen: Todo lo que hiciste en la réplica funciona igual en github.com, con algunas diferencias. Crear tu cuenta con 2FA, autenticarte desde la terminal (gh auth login, HTTPS con token o SSH), GitHub Desktop, Codespaces, Copilot, el Student Pack, tu README de perfil y qué cosas de GitHub real no viste en la práctica.
objetivos: Crear una cuenta segura | Autenticar git y gh desde tu computadora | Elegir entre HTTPS y SSH | Conocer Desktop, Codespaces y Copilot | Armar un perfil que muestre tu trabajo
prerrequisitos: github-github-en-el-flujo-de-datos
autoevaluacion: ¿Sabes por qué git push ya no acepta tu contraseña? | ¿Sabes crear una clave SSH? | ¿Sabes qué es un README de perfil? | ¿Sabes qué diferencias hay entre la práctica y GitHub real?
---

:::analogia En palabras simples
La réplica fue el simulador de vuelo: los mismos botones, los mismos comandos, sin riesgo. Ahora toca el avión de verdad. La buena noticia es que el panel es el mismo; solo cambian algunos trámites (la cuenta, las llaves) y hay algunos instrumentos más.
:::

## Paso 1 — La cuenta

1. Entra a **github.com** → **Sign up**. El nombre de usuario aparece en todas tus URLs (`github.com/tu-usuario`): elige uno profesional.
2. Activa **2FA** (Settings → Password and authentication): una app autenticadora o una *passkey*. Guarda los códigos de recuperación.
3. En **Settings → Emails**, activa **Keep my email addresses private**: tus commits usarán una dirección `@users.noreply.github.com`.

```bash
git config --global user.name "Tu Nombre"
git config --global user.email "ID+usuario@users.noreply.github.com"
```

:::cuidado Capturas de tu cuenta
Si compartes capturas de tu GitHub real (en un curso, un foro, un portafolio), tapa tu correo, tus tokens y cualquier dato privado de repositorios del trabajo.
:::

## Paso 2 — Autenticarte desde la terminal

`git push` ya no acepta la contraseña de la cuenta. Tres caminos:

| Camino | Cómo | Para quién |
|---|---|---|
| **gh auth login** (recomendado) | Instala [GitHub CLI](https://cli.github.com), corre `gh auth login`, elige HTTPS y "Login with a web browser" | Casi todos: configura git y gh a la vez |
| **HTTPS + token** | Settings → Developer settings → *Fine-grained tokens*, con vencimiento y permisos mínimos; el token se usa como contraseña | Cuando no puedes instalar gh |
| **SSH** | `ssh-keygen -t ed25519 -C "tu-correo"`, copias `~/.ssh/id_ed25519.pub` en Settings → SSH keys, clonas con `git@github.com:usuario/repo.git` | Quien prefiere llaves; común en Linux |

Comprueba:

```bash
gh auth status
ssh -T git@github.com     # si usas SSH: "Hi usuario! You've successfully authenticated"
```

## Paso 3 — Herramientas

| Herramienta | Qué es |
|---|---|
| **VS Code** | Panel de control de código fuente con Git y la extensión *GitHub Pull Requests* para revisar PRs sin salir del editor |
| **GitHub Desktop** | Aplicación con botones para commit, push y ramas; útil para empezar, pero aprende la terminal igual |
| **Codespaces** | Un VS Code en el navegador con una máquina en la nube ya configurada (botón **Code → Codespaces**); tiene horas gratis por mes |
| **github.dev** | Apretando `.` en un repositorio se abre un editor web liviano (sin terminal) |
| **Copilot** | Asistente de IA en el editor y en GitHub; revisa siempre lo que sugiere como revisarías el PR de un compañero |
| **GitHub Mobile** | Revisar y aprobar PRs, responder notificaciones |

:::tip GitHub Student Developer Pack
Si estudias, el **Student Developer Pack** (education.github.com) da GitHub Pro, Copilot y créditos de varias herramientas gratis mientras estés estudiando.
:::

## Paso 4 — Tu perfil

- Un repositorio llamado **exactamente como tu usuario** (`tu-usuario/tu-usuario`) con un `README.md` se muestra arriba de tu perfil. Escribe quién eres, qué haces y enlaza tus tres mejores proyectos.
- **Pin** (fijar) hasta seis repositorios: los que más muestran lo que sabes hacer.
- Cada proyecto fijado con descripción, topics, README completo y CI en verde (la lista de control de la lección 21).
- El gráfico de contribuciones muestra constancia, pero los reclutadores miran los **proyectos**, no los cuadraditos verdes.

```text
# Hola, soy Ana 👋

Ingeniera de datos en formación. Construyo pipelines con Python, SQL, dbt y Databricks.

## Proyectos
- **ventas-app** — resumen de ventas con CI, tests y reporte automático
- **lakehouse-tienda** — capas bronze/silver/gold con PySpark y Delta
- **dbt-tienda** — modelos de dbt con tests y documentación publicada
```

## Paso 5 — Lo que en la práctica no viste (o viste simplificado)

| En GitHub real | Notas |
|---|---|
| Forks y PRs entre repositorios | El flujo open source de la lección 15 |
| Releases y etiquetas en la web | Lección 21 |
| Workflows programados (`schedule`) | Lección 22 |
| Environments con aprobación | Lección 22 |
| CODEOWNERS automático, Rulesets | Lecciones 14 y 15 |
| Projects (tableros), Discussions, Wiki | Organización del trabajo y la comunidad |
| Push protection activa en repos públicos | Lección 18 |
| Minutos de Actions limitados en repos privados | Los públicos son gratis; los privados tienen una cuota mensual gratuita |

## ✅ Lo que lograste

- Sabes crear una cuenta segura y autenticarte desde tu computadora.
- Conoces las herramientas del ecosistema.
- Sabes armar un perfil que muestra tu trabajo.
- Sabes qué diferencias hay entre la práctica y GitHub real.

:::ejercicio quiz
Haces git push en GitHub real y pide usuario y contraseña; pones tu contraseña y falla. ¿Por qué?
- [ ] La contraseña está mal
- [x] GitHub ya no acepta la contraseña de la cuenta para git: hay que usar gh auth login, un token o SSH
- [ ] El repositorio no existe
- [ ] Hay que esperar un día
:::

:::ejercicio quiz
¿Cómo consigues que aparezca un README arriba de tu perfil?
- [ ] Fijando cualquier repositorio
- [x] Creando un repositorio con el mismo nombre que tu usuario, con un README.md
- [ ] En Settings → Profile
- [ ] Pagando GitHub Pro
:::

:::ejercicio quiz
¿Qué miran sobre todo quienes revisan tu GitHub para un trabajo?
- [ ] Cuántos cuadraditos verdes tienes
- [x] Unos pocos proyectos bien documentados, con tests y que se puedan entender rápido
- [ ] Cuántos seguidores tienes
- [ ] Cuántos repositorios tienes, aunque estén vacíos
:::
