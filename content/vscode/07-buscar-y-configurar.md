---
titulo: Buscar en todo el proyecto y configurar VS Code - búsqueda global, settings y guardado automático
nivel: 2 · Básico-intermedio
duracion: 35
resumen: Encontrar dónde se usa una columna en todo el proyecto (scripts, SQL, YAML) en segundos, y dejar VS Code configurado a tu gusto. La búsqueda global con su lista de resultados, la pantalla de Configuración, el archivo settings.json que la respalda, el guardado automático, el tamaño de letra y por qué la configuración es un archivo que se puede versionar.
objetivos: Buscar un texto en todos los archivos del proyecto | Navegar los resultados de búsqueda por archivo y línea | Cambiar ajustes desde la pantalla de Configuración | Entender y editar settings.json | Activar el guardado automático
prerrequisitos: vscode-ejecutar-python
autoevaluacion: ¿Sabes encontrar todos los archivos que usan la columna canal? | ¿Sabes dónde se guarda la configuración? | ¿Sabes activar el guardado automático? | ¿Sabes por qué conviene un settings.json por proyecto?
---

:::analogia En palabras simples
La búsqueda global es el "buscar" de todo el proyecto a la vez: antes de cambiar el nombre de una columna, te dice todos los lugares donde aparece. La configuración es un archivo de texto con tus preferencias: por eso se puede copiar, compartir y versionar.
:::

## Paso 1 — Busca en todos los archivos

1. **Ctrl + Shift + F** (o la lupa de la barra de actividad).
2. Escribe `canal`.

```captura
archivo: vscode/v07-buscar-archivos.webp
texto: La búsqueda global (1) y los resultados agrupados por archivo con cada línea (2)
```

Aparece cada archivo que contiene `canal` (CSV, scripts de Python, modelos SQL, el schema.yml de dbt) con cuántas veces y en qué línea. Un clic en un resultado abre el archivo en esa línea.

:::tip Antes de renombrar una columna
"Vamos a renombrar `canal` a `canal_venta`." Busca primero en todo el proyecto: si aparece en 6 archivos (un script, dos modelos de dbt, un YAML de tests…), son 6 lugares a cambiar. La búsqueda global es la diferencia entre un cambio prolijo y un pipeline roto.
:::

## Paso 2 — La pantalla de Configuración

**Ctrl + ,** (o la ruedita de abajo a la izquierda → Configuración).

```captura
archivo: vscode/v07-ajustes.webp
texto: La Configuración: el buscador de ajustes (1) y el botón para abrir settings.json (2)
```

Ajustes que conviene conocer:

| Ajuste | Para qué |
|---|---|
| Tema de color | Claro, oscuro, alto contraste |
| Tamaño de fuente (`editor.fontSize`) | Más grande para leer mejor o presentar |
| Guardado automático (`files.autoSave`) | `afterDelay`: guarda solo un segundo después de dejar de escribir |
| Ajuste de línea (`editor.wordWrap`) | Que las líneas largas se vean sin desplazarte a la derecha |
| Minimapa (`editor.minimap.enabled`) | El mapa del archivo a la derecha |
| Tamaño de tabulación (`editor.tabSize`) | 4 en Python |

Usa el buscador de arriba: escribe `guardado` o `font` y aparecen solo esos ajustes.

## Paso 3 — settings.json: la configuración es texto

Presiona **{ } Abrir settings.json**. Ves algo así:

```json
{
  "workbench.colorTheme": "Dark Modern",
  "editor.fontSize": 14,
  "files.autoSave": "afterDelay"
}
```

Cada cambio de la pantalla de Configuración se escribe acá. También puedes editarlo a mano (cuidado con las comas: un error de JSON y VS Code avisa).

| Nivel | Archivo | Aplica a |
|---|---|---|
| Usuario | `settings.json` de tu usuario | Todos tus proyectos |
| Área de trabajo | `.vscode/settings.json` dentro del proyecto | Solo ese proyecto, y se puede subir a Git para todo el equipo |

:::nota En la práctica y en tu computadora
En esta práctica el archivo vive en `~/.config/Code/User/settings.json` y puedes verlo con `cat` en la terminal. En Windows real está en `%APPDATA%\Code\User\settings.json`; en Mac, en `~/Library/Application Support/Code/User/settings.json`.
:::

## Paso 4 — Activa el guardado automático

En Configuración, busca `guardado` y elige **afterDelay** en **Guardado automático**. Desde ahora, los cambios se guardan solos. Si prefieres control total, déjalo en **off** y usa Ctrl + S: lo importante es saber cuál de los dos tienes.

## ✅ Lo que lograste

- Buscas en todo el proyecto antes de cambiar algo.
- Configuras VS Code desde la pantalla y desde settings.json.
- Sabes la diferencia entre ajustes de usuario y del proyecto.

:::ejercicio quiz
Antes de renombrar la columna `canal`, ¿qué haces?
- [ ] La renombro en el script que tengo abierto
- [x] Ctrl + Shift + F para ver todos los archivos donde aparece
- [ ] Reinicio VS Code
- [ ] Borro los archivos que la usan
:::

:::ejercicio quiz
¿Dónde se guardan los ajustes que cambias en la pantalla de Configuración?
- [ ] En la nube de Microsoft obligatoriamente
- [x] En un archivo settings.json
- [ ] En el registro de Windows
- [ ] En cada archivo abierto
:::

:::ejercicio quiz
Quieres que todo el equipo use 4 espacios en Python en un proyecto. ¿Dónde lo configuras?
- [ ] En el settings.json de tu usuario
- [x] En .vscode/settings.json del proyecto, subido a Git
- [ ] En el README
- [ ] En cada archivo .py
:::
