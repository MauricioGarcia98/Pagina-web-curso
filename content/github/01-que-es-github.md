---
titulo: GitHub desde cero - qué es, para qué lo usa un equipo de datos y cómo se lee su pantalla
nivel: 1 · Básico
duracion: 30
resumen: Primer contacto con GitHub, la plataforma donde los equipos guardan su código, lo revisan y lo prueban automáticamente. La diferencia entre Git y GitHub, qué es un repositorio remoto, para qué sirven los issues, los pull requests y Actions en un equipo de datos, y la barra superior del panel de inicio.
objetivos: Explicar la diferencia entre Git y GitHub | Describir qué es un repositorio remoto y por qué un equipo lo necesita | Nombrar para qué sirven issues, pull requests y Actions | Reconocer la barra superior y el panel de inicio de GitHub
prerrequisitos: fundamentos-bienvenida
autoevaluacion: ¿Sabes qué hace Git y qué agrega GitHub? | ¿Sabes qué es un repositorio remoto? | ¿Sabes para qué sirve un pull request? | ¿Sabes dónde está la terminal de la práctica?
---

:::tip Cómo usar este curso
Abre [GitHub de práctica](#/github) en otra pestaña y haz cada paso mientras lees. Las capturas son de esa misma app. Está conectada a la [terminal de práctica](#/lab/terminal): lo que subes con `git push` aparece en GitHub al instante, y lo que fusionas en GitHub lo traes con `git pull`. Dos compañeras del equipo de datos, **Camila** y **Martín**, revisan tus pull requests cuando se lo pides.

El curso tiene **24 lecciones en 6 niveles**. Cada nivel termina con un **proyecto real**, y cada proyecto te da menos ayuda que el anterior. La app también tiene **🎯 Retos** que se corrigen solos. Si nunca usaste Git, conviene hacer antes la lección [Git en equipo](#/l/fundamentos-git-en-equipo) o el nivel 4 de [VS Code paso a paso](#/m/vscode).
:::

:::analogia En palabras simples
**Git** es el programa que guarda la historia de un proyecto en tu computadora: cada versión, quién la hizo y por qué. **GitHub** es el lugar en internet donde el equipo comparte esa historia: como una carpeta compartida, pero que además entiende el código, permite revisarlo antes de aceptarlo y lo prueba sola.
:::

## Paso 1 — Git y GitHub no son lo mismo

| | Git | GitHub |
|---|---|---|
| Qué es | Un programa | Una plataforma web |
| Dónde corre | En tu computadora | En internet |
| Para qué | Guardar versiones, ramas, historia | Compartir, revisar, discutir y automatizar |
| Sin internet | Funciona | No |
| Alternativas | — | GitLab, Bitbucket, Azure DevOps |

Tu repositorio **local** (en tu computadora) y el **remoto** (en GitHub) son dos copias de la misma historia. `git push` sube tus commits al remoto; `git pull` trae los de los demás.

## Paso 2 — Para qué lo usa un equipo de datos

| Herramienta de GitHub | En un equipo de datos |
|---|---|
| **Repositorios** | El código de los pipelines, modelos de dbt, DAGs de Airflow, notebooks |
| **Issues** | Las tareas y los errores: "el ETL no incluye México" |
| **Pull requests** | Proponer un cambio y que alguien lo revise antes de llegar a producción |
| **Actions** | Correr los tests en cada cambio y desplegar automáticamente |
| **Protección de ramas** | Que nadie suba a `main` sin revisión ni tests en verde |
| **Pages** | Publicar la documentación del proyecto |

## Paso 3 — El panel de inicio

Entra a [GitHub de práctica](#/github):

```captura
archivo: github/g01-dashboard.webp
texto: El panel de inicio: la barra superior (1) y el botón de la terminal de la práctica (2)
```

| Elemento de la barra superior | Para qué |
|---|---|
| ☰ y el logo | Menú y volver al inicio |
| Buscador (*Type / to search*) | Buscar repositorios, issues y código |
| Botón de terminal (solo en la práctica) | Abre la terminal conectada a estos repositorios |
| **+** | Crear un repositorio o un issue |
| Íconos de issues, pull requests y bandeja | Tus issues, tus PR y las notificaciones |
| Tu avatar | Tu perfil, tus repositorios y la configuración |

A la izquierda, **Top repositories** lista tus repositorios. En el centro, el botón **Abrir tienda-andina/pipelines** lleva al repositorio del equipo de datos con el que vamos a practicar.

## ✅ Lo que lograste

- Distingues Git de GitHub y local de remoto.
- Sabes para qué usa GitHub un equipo de datos.
- Reconoces el panel de inicio y la barra superior.

:::ejercicio quiz
¿Cuál es la diferencia entre Git y GitHub?
- [ ] Son lo mismo con distinto nombre
- [x] Git guarda la historia en tu computadora; GitHub es la plataforma donde el equipo la comparte, revisa y automatiza
- [ ] GitHub es el programa y Git la web
- [ ] Git solo funciona con internet
:::

:::ejercicio quiz
¿Qué hace `git push`?
- [ ] Trae los cambios del equipo
- [x] Sube tus commits del repositorio local al remoto
- [ ] Crea un repositorio nuevo
- [ ] Borra la rama
:::

:::ejercicio quiz
¿Para qué sirve un pull request?
- [ ] Para descargar un repositorio
- [x] Para proponer un cambio y que el equipo lo revise antes de fusionarlo
- [ ] Para reportar un error
- [ ] Para publicar una página
:::
