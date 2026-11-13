---
titulo: Celdas, modos y kernel - ejecutar código, el modo comando y los atajos de todos los días
nivel: 1 · Básico
duracion: 40
resumen: Lo esencial para trabajar en un notebook. Qué es una celda, la diferencia entre el modo comando (azul) y el modo edición (verde), cómo ejecutar con Shift+Enter, qué significa [*] y el número entre corchetes, qué hace el kernel, y los atajos A, B, M, Y y D D que usa todo el mundo.
objetivos: Distinguir el modo comando del modo edición | Ejecutar celdas con Shift+Enter, Ctrl+Enter y Alt+Enter | Leer los indicadores [ ], [*] y [n] | Agregar, borrar, mover y cambiar el tipo de celdas con el teclado | Entender qué hace el kernel
prerrequisitos: jupyterlab-la-pantalla
autoevaluacion: ¿Sabes en qué modo estás mirando la celda? | ¿Sabes qué significa [*]? | ¿Sabes agregar una celda debajo sin el mouse? | ¿Sabes qué es el kernel?
---

:::analogia En palabras simples
El **kernel** es un Python que queda encendido detrás del notebook, esperando órdenes. Cada vez que ejecutas una celda, le mandas ese pedazo de código; él lo ejecuta, **recuerda** las variables y te devuelve el resultado, que aparece debajo de la celda.
:::

## Paso 1 — Los dos modos

En [JupyterLab de práctica](#/jupyter), notebook **Bienvenida.ipynb**:

1. Haz clic en el **margen izquierdo** de la primera celda de código (donde dice `[ ]:`). La celda queda con una barra azul a la izquierda: **modo comando**. La barra de estado dice `Mode: Command`.

```captura
archivo: jupyter/02-modo-comando.webp
texto: Modo comando: la celda seleccionada (1) y el modo en la barra de estado (2)
```

2. Presiona **Enter**. Aparece el cursor dentro de la celda: **modo edición** (`Mode: Edit`).

```captura
archivo: jupyter/02-modo-edicion.webp
texto: Modo edición: el cursor dentro de la celda (1); la barra de estado lo indica (2)
```

3. Presiona **Esc** para volver al modo comando.

| Modo | Cómo entras | Las teclas… |
|---|---|---|
| **Comando** | Esc, o clic en el margen | son atajos para manejar celdas (A, B, M, D D…) |
| **Edición** | Enter, o clic dentro del código | escriben texto en la celda |

:::cuidado El error de todos los principiantes
Si estás en modo comando y escribes, cada letra es un atajo: la **D** dos veces borra la celda, la **M** la convierte en texto. Si algo raro le pasó a tu celda, presiona **Z** (en modo comando) para deshacer la última operación de celdas.
:::

## Paso 2 — Ejecuta una celda

1. Con la primera celda de código seleccionada, presiona **Shift + Enter**.
2. Mientras corre, el indicador muestra `[*]` y el círculo del kernel se llena.

```captura
archivo: jupyter/02-corriendo.webp
texto: [*] mientras la celda se ejecuta; el círculo del kernel (2) indica que está ocupado
```

3. Cuando termina, aparece la tabla de pedidos debajo, y el indicador cambia a un número.

```captura
archivo: jupyter/02-tabla-pandas.webp
texto: El resultado de la celda: las primeras filas de la tabla de pedidos
```

| Indicador | Significa |
|---|---|
| `[ ]:` | La celda nunca se ejecutó |
| `[*]:` | Se está ejecutando (o espera en la cola) |
| `[1]:`, `[2]:`… | El orden en que se ejecutó: la 1.ª, la 2.ª… |

| Atajo | Ejecuta y… |
|---|---|
| **Shift + Enter** | pasa a la celda siguiente (la que más se usa) |
| **Ctrl + Enter** | se queda en la misma celda |
| **Alt + Enter** | inserta una celda nueva debajo |

4. Ejecuta las celdas siguientes con Shift + Enter hasta ver el gráfico de barras.

```captura
archivo: jupyter/02-grafico.webp
texto: Los gráficos aparecen debajo de la celda que los crea
```

## Paso 3 — Maneja celdas con el teclado (modo comando)

| Tecla | Hace |
|---|---|
| **A** | Agrega una celda **arriba** (Above) |
| **B** | Agrega una celda **abajo** (Below) |
| **D, D** | Borra la celda (dos veces la D) |
| **Z** | Deshace la última operación de celdas |
| **M** | Convierte la celda en **Markdown** (texto) |
| **Y** | Convierte la celda en **código** |
| **↑ / ↓** (o K / J) | Selecciona la celda de arriba / abajo |
| **C / X / V** | Copia / corta / pega celdas |

Practica: selecciona la última celda, presiona **B** para agregar una nueva, Enter, escribe `2 + 2` y Shift + Enter. Después, con esa celda seleccionada en modo comando, presiona **D D** para borrarla y **Z** para recuperarla.

## Paso 4 — El kernel recuerda

Las variables que creas en una celda existen para todas las demás, **en el orden en que las ejecutaste**. La celda que carga `pedidos` tiene que correr antes que la que usa `pedidos`. Si abres el notebook mañana, el kernel arranca vacío: hay que volver a ejecutar desde arriba (**Run → Run All Cells**).

## ✅ Lo que lograste

- Distingues el modo comando del modo edición.
- Ejecutas celdas y lees sus indicadores.
- Manejas celdas con el teclado y sabes qué hace el kernel.

:::ejercicio quiz
Estás en modo comando y presionas D dos veces. ¿Qué pasa?
- [ ] Se duplica la celda
- [x] Se borra la celda (Z la recupera)
- [ ] Se descarga el notebook
- [ ] Nada
:::

:::ejercicio quiz
Una celda muestra `[*]:` hace un rato. ¿Qué significa?
- [ ] Que tiene un error
- [x] Que se está ejecutando o espera su turno en la cola del kernel
- [ ] Que nunca se ejecutó
- [ ] Que es una celda de Markdown
:::

:::ejercicio quiz
¿Qué atajo ejecuta la celda y pasa a la siguiente?
- [ ] Ctrl + Enter
- [x] Shift + Enter
- [ ] Alt + B
- [ ] Esc
:::

:::ejercicio quiz
Abres un notebook que ayer funcionaba y una celda da `NameError: name 'pedidos' is not defined`. ¿Por qué?
- [ ] El CSV se borró
- [x] El kernel arrancó vacío: hay que ejecutar antes la celda que crea pedidos
- [ ] pandas no está instalado
- [ ] El notebook está dañado
:::
