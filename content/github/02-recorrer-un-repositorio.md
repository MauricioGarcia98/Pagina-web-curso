---
titulo: Recorrer un repositorio - archivos, README, ramas, historial e issues
nivel: 1 · Básico
duracion: 35
resumen: Cómo leer un repositorio que no conoces, como el primer día en un equipo nuevo. Las pestañas del repositorio, el README, la lista de archivos con su último commit, el selector de ramas, el botón Code para clonar, la vista de un archivo, el historial de commits y la lista de issues con sus etiquetas.
objetivos: Reconocer las partes de la página de un repositorio | Leer el README y la descripción del repositorio | Abrir un archivo y ver quién lo cambió por última vez | Recorrer el historial de commits | Leer la lista de issues y sus etiquetas
prerrequisitos: github-que-es-github
autoevaluacion: ¿Sabes qué muestra la lista de archivos además de los nombres? | ¿Sabes dónde está la URL para clonar? | ¿Sabes ver todos los commits de un repositorio? | ¿Sabes qué indica una etiqueta en un issue?
---

:::analogia En palabras simples
Un repositorio es como la carpeta compartida de un proyecto, pero con memoria: cada archivo sabe quién lo cambió, cuándo y por qué. El README es el cartel de la puerta: lo primero que lees para saber qué hay adentro.
:::

## Paso 1 — La página del repositorio

Abre [tienda-andina/pipelines](#/github/tienda-andina/pipelines):

```captura
archivo: github/g02-repo.webp
texto: Las pestañas (1), la barra de ramas y botones (2), la lista de archivos (3), el README (4) y la sección About (5)
```

| # | Parte | Qué muestra |
|---|---|---|
| 1 | **Pestañas** | Code, Issues (con cuántos abiertos), Pull requests, Actions, Security, Insights, Settings |
| 2 | **Barra de ramas** | La rama que estás viendo (`main`), cuántas ramas y tags hay, buscar un archivo, **Add file** y **Code** |
| 3 | **Lista de archivos** | Cada archivo o carpeta con el mensaje y la fecha de su **último commit**; arriba, el último commit del repositorio y el total de commits |
| 4 | **README** | El archivo README.md mostrado con formato: qué es el proyecto y cómo se usa |
| 5 | **About** | Descripción, temas (*topics*), licencia, estrellas y lenguajes |

:::tip Leer un repositorio nuevo
Orden recomendado: (1) el README, (2) la estructura de carpetas, (3) los últimos commits para ver qué se está cambiando, (4) los issues abiertos para saber qué falta. En diez minutos entiendes de qué se trata.
:::

## Paso 2 — El botón Code

Presiona el botón verde **Code**:

```captura
archivo: github/g02-boton-code.webp
texto: El menú Code: la URL para clonar (HTTPS, SSH o GitHub CLI) y Download ZIP
```

- **HTTPS**: `https://github.com/tienda-andina/pipelines.git`, la URL para `git clone`.
- **SSH** y **GitHub CLI**: otras formas de clonar (lección 23).
- **Clonar en la terminal de práctica** (solo en la práctica) y **Download ZIP**: una copia sin historia de Git.

## Paso 3 — Un archivo

Haz clic en la carpeta **pipelines** y después en **etl.py**:

```captura
archivo: github/g02-archivo.webp
texto: Un archivo: la ruta, el último commit que lo cambió, el código con números de línea y los botones Raw, copiar, descargar y editar
```

| Botón | Hace |
|---|---|
| **Blame** | Muestra qué commit cambió cada línea (útil para preguntar "¿por qué está esto?") |
| **History** | Los commits que tocaron este archivo |
| **Raw** | El archivo sin formato |
| Lápiz | Editarlo en el navegador (lección 3) |

## Paso 4 — El historial

En la página del repositorio, haz clic en **2 Commits** (arriba de la lista de archivos):

```captura
archivo: github/g02-commits.webp
texto: El historial: cada commit con su mensaje, autor, fecha y su identificador (hash)
```

Cada commit tiene un **hash** (por ejemplo `ef356a5`): su identificador único. Un clic en el commit muestra exactamente qué cambió.

## Paso 5 — Los issues

Pestaña **Issues**:

```captura
archivo: github/g02-issues.webp
texto: Los issues abiertos del equipo, con etiquetas como enhancement, good first issue o help wanted
```

| Etiqueta | Significa |
|---|---|
| `bug` | Algo no funciona |
| `enhancement` | Algo nuevo o una mejora |
| `good first issue` | Buen punto de partida para alguien que recién llega |
| `help wanted` | El equipo necesita ayuda con esto |
| `documentation` | Mejoras en la documentación |

El issue **#2 Agregar tests al ETL** es `good first issue`: lo vas a resolver en el proyecto 3.

## ✅ Lo que lograste

- Lees la página de un repositorio y su README.
- Sabes dónde está la URL para clonar.
- Recorres archivos, historial e issues.

:::ejercicio quiz
En la lista de archivos, al lado de cada nombre aparece un mensaje. ¿Qué es?
- [ ] Un comentario del archivo
- [x] El mensaje del último commit que cambió ese archivo
- [ ] La descripción del repositorio
- [ ] Un error
:::

:::ejercicio quiz
¿Dónde encuentras la URL para clonar un repositorio?
- [ ] En la pestaña Settings
- [x] En el botón verde Code
- [ ] En el README
- [ ] En Insights
:::

:::ejercicio quiz
¿Qué indica la etiqueta `good first issue`?
- [ ] Que el issue es urgente
- [x] Que es un buen punto de partida para alguien nuevo en el proyecto
- [ ] Que ya está resuelto
- [ ] Que es un error grave
:::
