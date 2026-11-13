---
titulo: Productividad - editor dividido, modo zen, esquema, atajos y tareas para no repetir comandos
nivel: 5 · Avanzado
duracion: 40
resumen: Las herramientas que usan quienes pasan el día en VS Code. Dividir el editor para ver el modelo y su dependencia lado a lado, el modo zen para concentrarte, el esquema y las migas de pan para moverte en archivos largos, los atajos que más tiempo ahorran, editar los propios atajos y las tareas (tasks.json) para ejecutar con un atajo los comandos que repites todo el día.
objetivos: Dividir el editor y trabajar con dos archivos a la vez | Usar el modo zen y ocultar paneles | Navegar archivos largos con esquema, migas de pan e Ir a símbolo | Aplicar los atajos de mayor impacto | Automatizar comandos repetidos con tareas
prerrequisitos: vscode-extensiones-y-temas
autoevaluacion: ¿Sabes dividir el editor? | ¿Sabes saltar a una función en un archivo largo? | ¿Sabes cuáles son los atajos que más usas? | ¿Sabes qué es una tarea de VS Code?
---

:::analogia En palabras simples
Productividad en un editor no es escribir más rápido: es no perder el hilo. Ver los dos archivos que necesitas a la vez, no buscar con el mouse lo que está a un atajo, y no escribir diez veces por día el mismo comando.
:::

## Paso 1 — Dividir el editor

Abre `models/staging/stg_ventas.sql` y presiona **Ctrl + \\** (o el botón de dividir, arriba a la derecha):

```captura
archivo: vscode/v19-dividir.webp
texto: El editor dividido: dos vistas lado a lado, para comparar o editar un archivo mientras lees otro
```

Arrastra una pestaña a la otra mitad para tener **archivos distintos** a cada lado: por ejemplo, el modelo de staging a la izquierda y el mart que lo usa a la derecha. **Ctrl + 1 / Ctrl + 2** salta entre los grupos.

## Paso 2 — Espacio y concentración

| Acción | Atajo |
|---|---|
| Ocultar / mostrar la barra lateral | Ctrl + B |
| Ocultar / mostrar el panel | Ctrl + J |
| Modo zen (solo el editor, pantalla completa) | Ctrl + K, Z (salir: Esc dos veces) |
| Agrandar / achicar la letra | Ctrl + = / Ctrl + - |

## Paso 3 — Moverte en archivos largos

| Herramienta | Cómo |
|---|---|
| **Esquema** (sección del explorador) | Lista funciones, clases o títulos: clic para saltar |
| **Migas de pan** | Arriba del editor: clic en el último elemento para ver los símbolos del archivo |
| **Ir a símbolo** | Ctrl + Shift + O y escribe el nombre de la función |
| **Ir a la definición** (VS Code real con Pylance) | F12 sobre un nombre: abre donde está definido |
| **Volver** | Alt + ← vuelve a donde estabas |

## Paso 4 — Los atajos que más tiempo ahorran

| Atajo | Hace |
|---|---|
| Ctrl + P | Abrir archivo por nombre |
| Ctrl + Shift + P | Paleta de comandos |
| Ctrl + Shift + F | Buscar en todo el proyecto |
| Ctrl + D | Seleccionar la siguiente aparición |
| Alt + ↑ / ↓ | Mover líneas |
| Ctrl + / | Comentar |
| Ctrl + ` | Terminal |
| F5 / F9 | Depurar / punto de interrupción |
| Ctrl + Shift + G | Git |

En VS Code real, **Archivo → Preferencias → Métodos abreviados de teclado** (Ctrl + K Ctrl + S) muestra todos y permite cambiarlos. Hay mapas de atajos (*keymaps*) de otros editores como extensión, por si vienes de otro.

:::tip Aprende un atajo por semana
Nadie aprende cien atajos de golpe. Cada semana, elige la acción que más haces con el mouse, busca su atajo en la paleta (lo muestra al lado) y oblígate a usarlo. En dos meses trabajas el doble de fluido.
:::

## Paso 5 — Tareas: los comandos que repites

Si todo el día escribes `ruff check . && pytest`, conviértelo en una **tarea**. En VS Code real, un archivo `.vscode/tasks.json`:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "revisar y probar",
      "type": "shell",
      "command": "ruff check . && pytest",
      "group": { "kind": "test", "isDefault": true }
    }
  ]
}
```

Después: **Terminal → Ejecutar tarea…** (o un atajo) y se corre en la terminal. Como está en el repositorio, todo el equipo tiene las mismas tareas.

## ✅ Lo que lograste

- Trabajas con el editor dividido y controlas el espacio de la pantalla.
- Te mueves rápido en archivos largos.
- Conoces los atajos clave y cómo automatizar comandos con tareas.

:::ejercicio quiz
¿Cómo ves el modelo de staging y el mart que lo usa al mismo tiempo?
- [ ] Abriendo dos ventanas del navegador
- [x] Dividiendo el editor (Ctrl + \\) y poniendo un archivo en cada mitad
- [ ] Con la paleta de comandos
- [ ] No se puede
:::

:::ejercicio quiz
¿Qué atajo te deja saltar a una función por su nombre dentro del archivo abierto?
- [ ] Ctrl + P
- [x] Ctrl + Shift + O
- [ ] Ctrl + G
- [ ] F9
:::

:::ejercicio quiz
¿Para qué sirve tasks.json?
- [ ] Para guardar la lista de pendientes del proyecto
- [x] Para definir comandos que se ejecutan con un atajo, iguales para todo el equipo
- [ ] Para configurar el tema
- [ ] Para instalar extensiones
:::
