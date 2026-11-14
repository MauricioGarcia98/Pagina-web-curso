---
titulo: Crear un repositorio y editar en la web - README, .gitignore, licencia y commits desde el navegador
nivel: 1 · Básico
duracion: 35
resumen: Cómo crear tu propio repositorio con las opciones correctas (nombre, descripción, público o privado, README, .gitignore y licencia) y hacer cambios sin salir del navegador - editar un archivo, previsualizarlo, escribir el mensaje del commit y elegir si va directo a main o a una rama nueva.
objetivos: Crear un repositorio con nombre, descripción y visibilidad adecuados | Inicializarlo con README, .gitignore y licencia | Editar un archivo en el navegador y previsualizarlo | Hacer un commit desde la web con un buen mensaje | Distinguir commit directo de commit en una rama nueva
prerrequisitos: github-recorrer-un-repositorio
autoevaluacion: ¿Sabes qué conviene elegir en .gitignore para un proyecto de Python? | ¿Sabes qué hace una licencia MIT? | ¿Sabes editar un archivo sin clonar el repositorio? | ¿Sabes cuándo conviene una rama en lugar de commit directo?
---

:::analogia En palabras simples
Crear un repositorio es abrir una carpeta nueva en la carpeta compartida del equipo, con un cartel (README), una lista de cosas que no se guardan (.gitignore) y las reglas de uso (licencia). Editar en la web es corregir un archivo directamente en esa carpeta, dejando anotado qué cambiaste.
:::

## Paso 1 — Crea el repositorio

1. Botón **+** de la barra superior → **New repository** (o **New** en el panel).
2. Completa:

```captura
archivo: github/g03-nuevo-repo.webp
texto: El nombre (1), Add a README (2), el .gitignore de Python (3) y la licencia (4)
```

| Campo | Qué poner |
|---|---|
| **Repository name** | Corto, en minúscula, con guiones: `ventas-app` |
| **Description** | Una línea: qué hace |
| **Public / Private** | Público: lo ve cualquiera (portafolio, código abierto). Privado: solo quienes invites (código de la empresa) |
| **Add a README file** | Sí: el repositorio arranca con un primer commit y una página que explica qué es |
| **Add .gitignore** | La plantilla de tu lenguaje (**Python**): evita subir `__pycache__/`, entornos virtuales, etc. |
| **Choose a license** | Para código público, **MIT** es la más simple: cualquiera puede usarlo citando el autor |

3. **Create repository**.

```captura
archivo: github/g03-repo-creado.webp
texto: El repositorio nuevo, con README, .gitignore y LICENSE en un primer commit
```

:::cuidado Público por error
Un repositorio público lo ve todo internet, y los buscadores lo indexan. Nunca subas datos de clientes, contraseñas ni código de tu empresa a un repositorio público. Si dudas, empieza privado: se puede hacer público después (Settings → General → Danger Zone).
:::

## Paso 2 — Edita un archivo en el navegador

1. En el README, presiona el **lápiz** (o abre el archivo y presiona el lápiz).
2. Agrega al final una sección `## Cómo se usa`.

```captura
archivo: github/g03-editar.webp
texto: El editor del navegador: pestañas Edit y Preview, y el botón Commit changes (1)
```

La pestaña **Preview** muestra cómo va a quedar (en un `.md`, con formato; en código, las diferencias).

## Paso 3 — El commit desde la web

Presiona **Commit changes…**:

```captura
archivo: github/g03-commit-web.webp
texto: El mensaje del commit (1) y Commit changes (2); abajo, la opción de crear una rama nueva y abrir un pull request
```

| Opción | Cuándo |
|---|---|
| **Commit directly to the main branch** | Cambios chicos en un repositorio tuyo (una errata en el README) |
| **Create a new branch … and start a pull request** | Cuando alguien tiene que revisar, o cuando `main` está protegida (nivel 4) |

Escribe el mensaje `README: sección Cómo se usa` y presiona **Commit changes**.

```captura
archivo: github/g03-repo-actualizado.webp
texto: El último commit del repositorio es el que acabas de hacer, y el README ya muestra la sección nueva
```

:::tip Cuándo editar en la web y cuándo en tu editor
La web sirve para cambios chicos: una errata, un README, una configuración. Para cambios de código que hay que probar, se clona el repositorio y se trabaja en VS Code (lección 5): en la web no puedes ejecutar los tests antes del commit.
:::

## ✅ Lo que lograste

- Creaste un repositorio con README, .gitignore y licencia.
- Editaste un archivo y lo previsualizaste en el navegador.
- Hiciste un commit desde la web eligiendo dónde va.

:::ejercicio quiz
¿Qué plantilla de .gitignore eliges para un proyecto de Python?
- [ ] None
- [x] Python, para no subir __pycache__, entornos virtuales y otros archivos generados
- [ ] Node
- [ ] Cualquiera, da igual
:::

:::ejercicio quiz
Vas a publicar tu proyecto de portafolio y quieres que otros puedan usarlo citándote. ¿Qué licencia es la más simple?
- [ ] Ninguna
- [x] MIT
- [ ] Una licencia privada
- [ ] Copyright de todos los derechos reservados
:::

:::ejercicio quiz
Quieres que alguien revise tu cambio antes de que llegue a main. ¿Qué eliges al hacer commit desde la web?
- [ ] Commit directly to the main branch
- [x] Create a new branch for this commit and start a pull request
- [ ] Cancel
- [ ] Ninguna, no se puede desde la web
:::
