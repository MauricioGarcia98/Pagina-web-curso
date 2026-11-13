---
titulo: La terminal integrada - ejecutar comandos sin salir del editor
nivel: 2 · Básico-intermedio
duracion: 40
resumen: Casi todo en datos se ejecuta desde la terminal - scripts, dbt, Git, pip, Airflow. Cómo abrir la terminal integrada, en qué carpeta arranca, los comandos que vas a usar a diario (pwd, ls, cd, head, cat, mkdir), varias terminales a la vez, copiar rutas al comando y leer la salida. Con el puente al curso completo de terminal.
objetivos: Abrir, cerrar y maximizar la terminal integrada | Saber en qué carpeta está parada la terminal y moverte con cd | Usar los comandos básicos para inspeccionar archivos | Abrir varias terminales y cambiar entre ellas | Recuperar y repetir comandos con las flechas
prerrequisitos: vscode-proyecto-carpeta-de-trabajo
autoevaluacion: ¿Sabes en qué carpeta arranca la terminal? | ¿Sabes ver las primeras líneas de un CSV? | ¿Sabes repetir el último comando? | ¿Sabes abrir una segunda terminal?
---

:::analogia En palabras simples
La terminal es una conversación escrita con la computadora: escribes una orden, presionas Enter y te contesta. Tenerla dentro de VS Code significa que escribes el código arriba y lo ejecutas abajo, sin cambiar de ventana.
:::

## Paso 1 — Abre la terminal

**Ctrl + `** (o menú **Terminal → Nueva terminal**, o **Ver → Terminal**). Aparece en el panel de abajo, parada en la **carpeta del proyecto**.

## Paso 2 — Los comandos de todos los días

Escribe en la terminal:

```bash
ls datos
head -3 datos/ventas_2024_12.csv
```

```captura
archivo: vscode/v05-terminal.webp
texto: La terminal integrada: ls lista los archivos y head muestra las primeras líneas del CSV
```

| Comando | Hace | Ejemplo |
|---|---|---|
| `pwd` | Dice en qué carpeta estás | `/home/alumno` |
| `ls` / `ls -la` | Lista archivos (con detalles y ocultos) | `ls datos` |
| `cd carpeta` / `cd ..` | Entra a una carpeta / sube una | `cd tienda_dbt` |
| `head -n 5 archivo` | Primeras líneas | Mirar un CSV sin abrirlo |
| `cat archivo` | Muestra el archivo completo | Archivos chicos |
| `mkdir -p a/b` | Crea carpetas | `mkdir -p salidas/2024` |
| `python archivo.py` | Ejecuta un script | `python scripts/resumen_ventas.py` |
| `clear` (o Ctrl + L) | Limpia la pantalla | |

:::tip Las flechas y el Tab
**↑** recupera los comandos anteriores (no vuelvas a escribirlos). **Tab** completa nombres de archivos y carpetas: escribe `cat dat` + Tab y se completa `datos/`.
:::

## Paso 3 — La carpeta importa

Un script que lee `datos/ventas_2024_12.csv` funciona si lo ejecutas **desde la carpeta que contiene `datos/`**. Si haces `cd scripts` y después `python resumen_ventas.py`, falla con `FileNotFoundError`: desde ahí la ruta `datos/…` no existe. Mira siempre la carpeta en el prompt (`alumno@academia:~/scripts$`).

## Paso 4 — Varias terminales

En la cabecera del panel:

| Botón | Hace |
|---|---|
| **+** | Abre otra terminal (por ejemplo, una para Git y otra para ejecutar) |
| Lista desplegable / nombre (`bash`) | Cambia entre terminales |
| Papelera | Cierra la terminal |
| **^** | Maximiza el panel |
| **x** | Oculta el panel (la terminal sigue viva) |

## Paso 5 — Del explorador a la terminal

Clic derecho sobre una carpeta del explorador → **Abrir en la terminal integrada**: la terminal arranca en esa carpeta. **Copiar ruta** copia la ruta de un archivo para pegarla en un comando.

:::nota Para dominar la terminal
Esta lección cubre lo que necesitas dentro de VS Code. El [laboratorio de terminal](#/lab/terminal) tiene misiones de cero a experto: tuberías, grep, permisos, variables de entorno, scripts de bash.
:::

## ✅ Lo que lograste

- Abres y manejas la terminal integrada.
- Usas los comandos básicos y sabes por qué importa la carpeta actual.
- Trabajas con varias terminales.

:::ejercicio quiz
Estás en `~/scripts` y ejecutas un script que lee `datos/ventas.csv` (la carpeta datos está en `~`). Da FileNotFoundError. ¿Qué haces?
- [ ] Reinstalo Python
- [x] Vuelvo a la carpeta del proyecto (`cd ..`) y lo ejecuto desde ahí
- [ ] Copio el CSV a todas las carpetas
- [ ] Cambio el nombre del CSV
:::

:::ejercicio quiz
¿Qué comando muestra las primeras 5 líneas de un archivo?
- [ ] `cat -5 archivo`
- [x] `head -n 5 archivo`
- [ ] `ls archivo`
- [ ] `top archivo`
:::

:::ejercicio quiz
¿Cómo repites el último comando sin escribirlo de nuevo?
- [ ] Ctrl + Z
- [x] Flecha ↑ y Enter
- [ ] Tab
- [ ] F5
:::
