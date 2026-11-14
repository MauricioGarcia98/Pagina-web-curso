---
titulo: Markdown en GitHub - README, issues y comentarios que se leen bien
nivel: 2 · Básico-intermedio
duracion: 35
resumen: Todo lo que escribes en GitHub - README, issues, pull requests, comentarios - usa Markdown. Títulos, listas, listas de tareas, tablas, bloques de código con colores, enlaces a archivos, menciones, referencias a issues y commits, avisos destacados y la estructura de un README que la gente lee.
objetivos: Dar formato con títulos, listas, negrita, enlaces e imágenes | Escribir tablas, listas de tareas y bloques de código con lenguaje | Referenciar personas, issues, PRs y commits | Usar avisos destacados (NOTE, WARNING) | Estructurar un README útil
prerrequisitos: github-issues
autoevaluacion: ¿Sabes hacer una tabla en Markdown? | ¿Sabes mostrar código con colores de Python? | ¿Sabes enlazar un issue desde un comentario? | ¿Sabes qué secciones tiene un buen README?
---

:::analogia En palabras simples
Markdown es una forma de dar formato escribiendo símbolos simples: `#` para un título, `-` para una lista, `**` para negrita. GitHub lo convierte en una página prolija. Es el mismo Markdown de las celdas de JupyterLab, con algunos extras.
:::

## Paso 1 — Lo básico

| Escribes | Se ve |
|---|---|
| `# Título` / `## Sección` | Títulos |
| `**negrita**`, `*cursiva*` | **negrita**, *cursiva* |
| `- punto` / `1. paso` | Listas |
| `` `codigo` `` | `código` en línea |
| `[texto](https://…)` | Un enlace |
| `[ver el ETL](pipelines/etl.py)` | Enlace a un archivo del repositorio |
| `![diagrama](docs/diagrama.png)` | Una imagen del repositorio |
| `> cita` | Una cita |

## Paso 2 — Bloques de código y tablas

Un bloque de código con tres acentos graves y el lenguaje se muestra con colores:

````text
```python
def limpiar_email(email):
    return email.strip().lower()
```
````

Tablas:

```text
| Canal | Pedidos |
|---|---:|
| web | 237 |
| app | 143 |
```

(`---:` alinea a la derecha, útil para números.)

## Paso 3 — Listas de tareas

```text
- [x] Leer el CSV
- [ ] Totales por canal
- [ ] Tests
```

En un issue se ven como casillas que se pueden tildar, y GitHub muestra el progreso ("1 of 3 tasks"):

```captura
archivo: github/g06-issue.webp
texto: Un issue con su lista de tareas convertida en casillas
```

## Paso 4 — Referencias que GitHub entiende solo

| Escribes | GitHub lo convierte en |
|---|---|
| `@camila` | Mención: le llega una notificación |
| `#2` | Enlace al issue o PR número 2 |
| `tienda-andina/pipelines#3` | Un issue de otro repositorio |
| Un hash de commit (`9658e94`) | Enlace a ese commit |
| `Closes #2` (en un PR) | Cierra el issue al fusionar |

## Paso 5 — Avisos destacados

```text
> [!NOTE]
> El script lee datos/ventas.csv: créalo antes de ejecutar.

> [!WARNING]
> No subas el archivo .env: tiene contraseñas.
```

GitHub los muestra como recuadros de color (NOTE, TIP, IMPORTANT, WARNING, CAUTION).

## Paso 6 — El README que se lee

```captura
archivo: github/g03-repo-actualizado.webp
texto: Un README con título, descripción y la sección Cómo se usa
```

| Sección | Contenido |
|---|---|
| Título y una línea | Qué es |
| **Por qué** (opcional) | Qué problema resuelve |
| **Cómo se instala** | Requisitos y comandos exactos |
| **Cómo se usa** | El comando con un ejemplo de salida |
| **Estructura** | Qué hay en cada carpeta |
| **Cómo contribuir** | Ramas, tests, PR (o un enlace a CONTRIBUTING.md) |
| **Licencia** | MIT, etc. |

:::tip Un README se prueba
Pide a alguien que nunca vio el proyecto que lo siga al pie de la letra. Cada vez que te pregunte algo, falta una línea en el README.
:::

## ✅ Lo que lograste

- Das formato a README, issues y comentarios con Markdown.
- Usas tablas, código, tareas, referencias y avisos.
- Sabes qué secciones tiene un README útil.

:::ejercicio quiz
¿Cómo muestras un bloque de código de Python con colores en GitHub?
- [ ] Entre comillas
- [x] Entre tres acentos graves, con python después de los primeros
- [ ] Con ** al principio y al final
- [ ] No se puede
:::

:::ejercicio quiz
En un comentario escribes `#4`. ¿Qué pasa?
- [ ] Se convierte en un título
- [x] GitHub lo convierte en un enlace al issue o PR número 4
- [ ] Se borra
- [ ] Le llega una notificación a todos
:::

:::ejercicio quiz
¿Qué escribes para una casilla de tarea sin tildar?
- [x] `- [ ] tarea`
- [ ] `[x] tarea`
- [ ] `- () tarea`
- [ ] `* tarea`
:::
