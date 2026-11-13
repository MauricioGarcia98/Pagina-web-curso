---
titulo: VS Code desde cero - qué es un editor de código y cómo se lee su pantalla
nivel: 1 · Básico
duracion: 30
resumen: Primer contacto con Visual Studio Code, el editor que usan casi todos los equipos de datos para escribir Python, SQL, dbt y pipelines. Qué es y en qué se diferencia de un notebook, cómo abrir una carpeta de trabajo y las seis zonas de la pantalla - barra de actividad, barra lateral, editor, panel, barra de estado y el buscador de la barra de título.
objetivos: Explicar para qué sirve un editor de código en un equipo de datos | Abrir una carpeta de trabajo | Reconocer las seis zonas de la pantalla de VS Code | Saber qué muestra cada ícono de la barra de actividad
prerrequisitos: fundamentos-bienvenida
autoevaluacion: ¿Sabes qué diferencia hay entre VS Code y un notebook? | ¿Sabes qué es la carpeta de trabajo? | ¿Sabes dónde se abre la terminal? | ¿Sabes qué informa la barra de estado?
---

:::tip Cómo usar este curso
Abre [VS Code de práctica](#/vscode) en otra pestaña y haz cada paso mientras lees. Las capturas son de esa misma app, que está conectada a la [terminal de práctica](#/lab/terminal): los archivos que crees en un lado aparecen en el otro, y el Python, Git y dbt que ejecutes son de verdad (simulados en tu navegador).

El curso tiene **24 lecciones en 6 niveles**. Cada nivel termina con un **proyecto real**, y cada proyecto te da menos ayuda que el anterior. Los menús de la práctica están en español, como en VS Code configurado en español; en la lección 23 vemos los nombres en inglés.
:::

:::analogia En palabras simples
Un notebook es un cuaderno donde pruebas ideas; VS Code es el taller donde construyes el proyecto completo: muchos archivos (scripts, SQL, configuraciones, tests), la terminal para ejecutarlos, Git para guardar versiones y un depurador para encontrar errores. Todo en una sola ventana.
:::

## Paso 1 — Para qué lo usa un equipo de datos

| Tarea | En VS Code |
|---|---|
| Escribir scripts de Python | Con colores, autocompletado y detección de errores |
| Modelos de dbt y consultas SQL | Archivos `.sql` con su `.yml`, ejecutados desde la terminal |
| DAGs de Airflow, pipelines, configuraciones | Muchos archivos en carpetas, que se editan juntos |
| Versionar con Git | Ver cambios, hacer commits y trabajar con ramas sin salir del editor |
| Encontrar errores | Depurador con puntos de interrupción y variables |

## Paso 2 — Abre una carpeta

VS Code no trabaja con archivos sueltos sino con una **carpeta de trabajo** (el proyecto).

1. Entra a [VS Code de práctica](#/vscode).
2. Presiona **Abrir la carpeta personal (~)**.

```captura
archivo: vscode/v01-pantalla.webp
texto: VS Code con la carpeta personal abierta y la pestaña de Bienvenida
```

:::nota code .
En la terminal (de la práctica o de tu computadora), `code .` abre VS Code en la carpeta donde estás parado. Es la forma más común de abrir un proyecto.
:::

## Paso 3 — Las seis zonas

```captura
archivo: vscode/v01-zonas.webp
texto: Las seis zonas de la pantalla, numeradas
```

| # | Zona | Para qué sirve |
|---|---|---|
| 1 | **Barra de actividad** | Cambia lo que muestra la barra lateral: explorador, buscar, Git, depurar, extensiones |
| 2 | **Barra lateral** | El explorador de archivos (o la vista que elegiste en 1) |
| 3 | **Editor** | Donde escribes; cada archivo abierto es una pestaña |
| 4 | **Panel** | Terminal, problemas, salida y consola de depuración |
| 5 | **Barra de estado** | Rama de Git, errores y advertencias, línea y columna, lenguaje, versión de Python |
| 6 | **Buscador de la barra de título** | Abre archivos por nombre y comandos |

## Paso 4 — La barra de actividad

| Ícono | Vista | Atajo |
|---|---|---|
| Dos hojas | Explorador | Ctrl + Shift + E |
| Lupa | Buscar en todos los archivos | Ctrl + Shift + F |
| Ramas | Control de código fuente (Git) | Ctrl + Shift + G |
| Triángulo con un bicho | Ejecutar y depurar | Ctrl + Shift + D |
| Cuadrados | Extensiones | Ctrl + Shift + X |

Haz clic en cada una para ver qué muestra y vuelve al **Explorador**. **Ctrl + B** oculta o muestra la barra lateral; **Ctrl + `** (acento grave) muestra u oculta la terminal.

## ✅ Lo que lograste

- Sabes para qué usa VS Code un equipo de datos.
- Abriste una carpeta de trabajo.
- Reconoces las zonas de la pantalla y las vistas de la barra de actividad.

:::ejercicio quiz
¿Qué abre VS Code cuando trabajas en un proyecto?
- [ ] Un solo archivo
- [x] Una carpeta de trabajo con todos los archivos del proyecto
- [ ] Un notebook
- [ ] Una base de datos
:::

:::ejercicio quiz
¿Dónde ves en qué rama de Git estás y cuántos errores tiene el código?
- [ ] En el explorador
- [x] En la barra de estado, abajo
- [ ] En la pestaña Bienvenida
- [ ] En el menú Archivo
:::

:::ejercicio quiz
¿Qué atajo muestra u oculta la terminal?
- [ ] Ctrl + T
- [x] Ctrl + ` (acento grave)
- [ ] Ctrl + Shift + T
- [ ] F5
:::
