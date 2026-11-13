---
titulo: Depurar - puntos de interrupción, paso a paso y variables para encontrar el error en minutos
nivel: 3 · Intermedio
duracion: 50
resumen: Cuando un script no falla pero da un resultado equivocado, el depurador es la herramienta. Con un script de descuentos que calcula mal el total, aprendes a poner puntos de interrupción, iniciar la depuración, avanzar paso a paso, mirar y vigilar variables, leer la pila de llamadas y usar la consola de depuración para probar hipótesis sin cambiar el código.
objetivos: Reconocer un error lógico (no hay traceback, pero el resultado está mal) | Poner y quitar puntos de interrupción | Iniciar la depuración y avanzar con continuar, paso a paso y salir | Leer variables, inspecciones y la pila de llamadas | Probar expresiones en la consola de depuración
prerrequisitos: vscode-proyecto-resumen-de-ventas
autoevaluacion: ¿Sabes qué es un error lógico? | ¿Sabes poner un punto de interrupción? | ¿Sabes qué diferencia hay entre F5 y F10? | ¿Sabes ver el valor de una variable en cada vuelta de un bucle?
---

:::analogia En palabras simples
Depurar es poner el programa en cámara lenta: lo detienes en una línea (punto de interrupción) y ves qué valor tiene cada variable en ese momento. En lugar de adivinar dónde está el error llenando todo de `print`, lo miras pasar.
:::

## Paso 1 — Un error que no da error

Crea **scripts/descuentos.py** con:

```python norun
precios = [100, 250, 80]
descuento = 0.1
total = 0
for precio in precios:
    total = precio * (1 - descuento)
print("Total:", total)
```

Ejecútalo con ▷:

```captura
archivo: vscode/v09-bug.webp
texto: El script corre sin errores, pero dice Total: 72.0
```

El total debería ser (100 + 250 + 80) × 0,9 = **387**. No hay traceback: es un **error lógico**. Python hizo exactamente lo que le pediste… que no era lo que querías.

## Paso 2 — Pon un punto de interrupción

1. Haz clic en el margen izquierdo de la **línea 5** (a la izquierda del número), o pon el cursor en la línea y presiona **F9**. Aparece un **punto rojo**.
2. Abre la vista **Ejecutar y depurar** (ícono del triángulo con el bicho).

```captura
archivo: vscode/v09-punto.webp
texto: El punto rojo en la línea 5 y el botón Ejecutar y depurar (2)
```

## Paso 3 — Inicia la depuración

Presiona **Ejecutar y depurar** (o **F5**). El programa arranca y se **detiene** en la línea 5, resaltada en amarillo.

```captura
archivo: vscode/v09-depurando.webp
texto: Detenido en la línea 5: las variables en la barra lateral (1) y la barra de depuración (2)
```

| Sección | Muestra |
|---|---|
| **Variables** | El valor de cada variable en este instante: `precios`, `descuento`, `total`, `precio` |
| **Inspección** | Expresiones que quieres vigilar (por ejemplo `total + precio`) |
| **Pila de llamadas** | En qué función estás y quién la llamó |
| **Puntos de interrupción** | La lista de todos los puntos rojos |

## Paso 4 — Avanza y observa

| Botón de la barra | Atajo | Hace |
|---|---|---|
| Continuar | **F5** | Sigue hasta el próximo punto de interrupción |
| Paso a paso por procedimientos | **F10** | Ejecuta la línea y se detiene en la siguiente |
| Paso a paso por instrucciones | **F11** | Entra dentro de la función que se llama en esta línea |
| Salir de la función | **Shift + F11** | Termina la función actual y vuelve a quien la llamó |
| Reiniciar | **Ctrl + Shift + F5** | Vuelve a empezar |
| Detener | **Shift + F5** | Termina la depuración |

Presiona **F5** para ir a la segunda vuelta del bucle:

```captura
archivo: vscode/v09-segunda-vuelta.webp
texto: Segunda vuelta: precio vale 250 y total vale 90.0, solo el primer precio con descuento
```

Ahí está: en cada vuelta, `total` **se reemplaza** en lugar de **sumarse**. La línea correcta es `total = total + precio * (1 - descuento)` (o `total += ...`).

## Paso 5 — Prueba la hipótesis antes de cambiar el código

En el panel, pestaña **CONSOLA DE DEPURACIÓN**, escribe expresiones mientras el programa está detenido:

```text
total + precio * (1 - descuento)
```

Te muestra el valor que tendría `total` con la corrección. Es la forma de comprobar una idea sin editar ni volver a ejecutar.

## Paso 6 — Corrige y vuelve a ejecutar

1. **Shift + F5** para detener.
2. Cambia la línea 5 por `total += precio * (1 - descuento)`.
3. Quita el punto de interrupción (clic en el punto rojo o F9).
4. Ejecuta: `Total: 387.0`.

:::tip Cuándo depurar y cuándo usar print
Un `print` sirve para una duda rápida. El depurador conviene cuando no sabes **dónde** está el problema, cuando hay bucles o funciones anidadas, o cuando necesitas ver muchas variables a la vez. Y no te deja `print` olvidados en el código.
:::

## ✅ Lo que lograste

- Reconoces un error lógico.
- Usas puntos de interrupción, paso a paso, variables y la consola de depuración.
- Encontraste y corregiste un error sin adivinar.

:::ejercicio quiz
Un script termina sin errores pero el total está mal. ¿Qué tipo de error es?
- [ ] SyntaxError
- [x] Un error lógico: el código hace algo distinto de lo que querías
- [ ] Un error del intérprete
- [ ] Un error de la terminal
:::

:::ejercicio quiz
Estás detenido en un punto de interrupción dentro de un bucle. ¿Qué tecla te lleva a la siguiente vuelta (al mismo punto)?
- [ ] F9
- [x] F5 (Continuar)
- [ ] F2
- [ ] Ctrl + S
:::

:::ejercicio quiz
¿Para qué sirve la consola de depuración?
- [ ] Para escribir comandos de bash
- [x] Para evaluar expresiones con las variables del momento en que el programa está detenido
- [ ] Para ver los errores de sintaxis
- [ ] Para instalar paquetes
:::
