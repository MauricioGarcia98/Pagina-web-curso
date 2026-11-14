---
titulo: Proyecto 1 (guiado paso a paso) - tu repositorio de portafolio de datos
nivel: 1 · Básico
duracion: 45
resumen: Primer proyecto real. Creas el repositorio que va a reunir tus proyectos de datos - el que vas a mostrar en entrevistas - con un README que presenta quién sos, qué sabés hacer y qué proyectos hay, una licencia y un .gitignore, y lo actualizas desde el navegador con commits claros. Paso a paso con capturas, y la versión para hacerlo en GitHub real.
objetivos: Crear un repositorio público para portafolio con las opciones correctas | Escribir un README que presente tu perfil y tus proyectos | Actualizar el repositorio con commits desde la web | Revisar el resultado con una lista de control
prerrequisitos: github-crear-y-editar-en-la-web
autoevaluacion: ¿Sabes qué va en el README de un portafolio? | ¿Sabes crear el repositorio con README, licencia y .gitignore? | ¿Sabes hacer commits con mensajes claros desde la web? | ¿Sabes revisar que no haya datos personales?
---

:::escenario El pedido
Te lo pide tu mentora: *"Armá un repositorio `portafolio-datos` en tu GitHub con un README que diga quién sos, qué herramientas manejás y una tabla con los proyectos que vas a ir sumando. Es lo primero que va a mirar un reclutador: que se entienda en 30 segundos."*
:::

Proyecto **guiado paso a paso**.

## Paso 1 — Crea el repositorio

En [GitHub de práctica](#/github) → **New**:

- **Repository name**: `portafolio-datos`
- **Description**: `Mis proyectos de ingeniería y análisis de datos`
- **Public**
- **Add a README file**, **.gitignore: Python**, **License: MIT**

```captura
archivo: github/g03-nuevo-repo.webp
texto: Las opciones al crear el repositorio: nombre, README, .gitignore y licencia
```

Presiona **Create repository**.

## Paso 2 — El README de presentación

Abre el README con el **lápiz** y reemplaza el contenido por:

```text
# Portafolio de datos

Hola, soy Ana. Estoy aprendiendo ingeniería de datos: SQL, Python, dbt y la nube.

## Herramientas

| Área | Herramientas |
|---|---|
| Datos | SQL, pandas, dbt |
| Ingeniería | Python, Git, GitHub Actions |
| Nube | Databricks, Azure |

## Proyectos

| Proyecto | Qué hace | Estado |
|---|---|---|
| ventas-app | Resume las ventas por canal con tests y CI | En curso |

## Contacto

LinkedIn: (tu perfil)
```

Usa **Preview** para ver cómo queda. Cambia "Ana" por tu nombre (o un nombre ficticio si practicas).

## Paso 3 — El commit

**Commit changes…** → mensaje `README: presentación, herramientas y proyectos` → **Commit directly to the main branch** → **Commit changes**.

```captura
archivo: github/g03-commit-web.webp
texto: El mensaje del commit y el botón para confirmarlo
```

## Paso 4 — Un segundo commit

Vuelve a editar el README y agrega una fila a la tabla de proyectos (por ejemplo, el análisis de diciembre del curso de JupyterLab). Mensaje: `README: agrega proyecto de análisis de ventas`. Ahora el repositorio tiene historia: abre **Commits** y verás tus dos cambios con su mensaje.

## Paso 5 — Revisa antes de compartir

- [ ] El README se entiende en 30 segundos: quién, qué herramientas, qué proyectos.
- [ ] Tiene LICENSE (MIT) y .gitignore (Python).
- [ ] La descripción del repositorio (About) está completa.
- [ ] Los mensajes de commit dicen qué cambió.
- [ ] No hay datos personales que no quieras publicar (teléfono, dirección, documento).

## 🖥️ Hazlo también en GitHub real

1. Crea una cuenta en github.com (gratis) con un usuario profesional (nombre-apellido, no un apodo).
2. Activa la verificación en dos pasos (Settings → Password and authentication).
3. Repite los pasos: el formulario de **New repository** y el editor web son iguales.
4. Truco: un repositorio con **el mismo nombre que tu usuario** (por ejemplo `ana-perez/ana-perez`) muestra su README en tu perfil público. Es la portada de tu GitHub.

:::ejercicio quiz
¿Qué debería tener el README de un portafolio?
- [ ] El código de todos los proyectos
- [x] Quién sos, qué herramientas manejás y una lista de proyectos con enlaces
- [ ] Solo el título
- [ ] Tu dirección y tu teléfono
:::

:::ejercicio quiz
¿Por qué conviene un usuario profesional en GitHub?
- [ ] Porque GitHub lo exige
- [x] Porque aparece en tus enlaces, tu CV y tus commits: es parte de tu presentación profesional
- [ ] Porque los apodos no funcionan
- [ ] Para tener más estrellas
:::

:::ejercicio quiz
¿Qué muestra GitHub en tu perfil si creas un repositorio con el mismo nombre que tu usuario?
- [ ] Nada
- [x] El README de ese repositorio, como portada del perfil
- [ ] Tus contraseñas
- [ ] Todos tus repositorios privados
:::
