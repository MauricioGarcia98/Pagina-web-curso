---
titulo: Proyecto 1 (guiado paso a paso) - el notebook del presupuesto de un viaje de trabajo
nivel: 1 · Básico
duracion: 45
resumen: Primer proyecto real. Te piden calcular y documentar el presupuesto de un viaje de tres días para una visita a un cliente. Creas un notebook con nombre claro, lo estructuras con títulos Markdown, haces las cuentas con variables de Python, muestras el resultado con un mensaje claro y lo entregas descargado. Cada paso explicado y con capturas.
objetivos: Crear y nombrar un notebook para una tarea concreta | Estructurar un notebook con títulos y explicaciones | Calcular con variables y mostrar resultados con print y f-strings | Verificar el resultado y entregar el .ipynb
prerrequisitos: jupyterlab-markdown-y-archivos
autoevaluacion: ¿Sabes armar un notebook con título, contexto y conclusión? | ¿Sabes calcular con variables? | ¿Sabes usar un f-string para mostrar un resultado? | ¿Sabes descargar el notebook?
---

:::escenario El pedido
Mensaje de tu líder: *"La semana que viene viajás tres días a ver al cliente de Lima. Armame el presupuesto en un notebook así queda documentado: pasajes 420, hotel 85 por noche (3 noches) y comidas 40 por día. Necesito el total y cuánto es por día."*
:::

Proyecto **guiado paso a paso**. En los próximos niveles tendrás cada vez menos instrucciones.

## Paso 1 — Crea y nombra el notebook

1. En [JupyterLab de práctica](#/jupyter): **File → New → Notebook**.
2. Clic derecho sobre **Untitled.ipynb** → **Rename** → `presupuesto_viaje_lima.ipynb`.

## Paso 2 — El título y el contexto (Markdown)

1. Selecciona la primera celda, presiona **Esc** y después **M** (Markdown). Enter para editar.
2. Escribe:

```text
# Presupuesto del viaje a Lima
Visita al cliente, 3 días. Montos en dólares.
```

3. **Shift + Enter**.

## Paso 3 — Los datos, en variables

En la celda de código que quedó abajo, escribe:

```python norun
pasajes = 420
hotel = 3 * 85
comidas = 3 * 40
total = pasajes + hotel + comidas
print(f"Total del viaje: {total} | por día: {total / 3:.2f}")
total
```

Qué hace cada línea:

| Línea | Significa |
|---|---|
| `pasajes = 420` | Guarda 420 en una variable llamada `pasajes` |
| `hotel = 3 * 85` | 3 noches × 85 = 255 |
| `total = pasajes + hotel + comidas` | Suma las tres variables |
| `print(f"... {total} ...")` | Muestra un texto; lo que va entre `{}` se reemplaza por su valor |
| `{total / 3:.2f}` | El total dividido 3, con **2 decimales** |
| `total` (última línea) | Jupyter muestra el valor de la última expresión como `Out` |

**Shift + Enter**.

```captura
archivo: jupyter/p1-viaje.webp
texto: El resultado: el texto del print (1) y el valor de la última línea (2)
```

:::tip print o la última línea
Lo que escribes en `print()` aparece como texto. La **última línea** de la celda, si es un valor, aparece al lado de `[n]:` en color: es el "Out" de la celda. En la próxima lección vemos la diferencia a fondo.
:::

## Paso 4 — Comprueba que es una receta

Cambia `pasajes = 420` por `pasajes = 380` y vuelve a ejecutar la celda (**Ctrl + Enter**). El total cambia a 755. Vuelve a dejar 420 y ejecuta otra vez.

## Paso 5 — La conclusión (Markdown)

Agrega una celda Markdown al final (**B**, **M**, Enter):

```text
## Conclusión
El viaje cuesta **795 dólares** (265 por día). El 53 % son los pasajes.
```

Y Shift + Enter.

## Paso 6 — Revisa antes de entregar

- [ ] El notebook se llama `presupuesto_viaje_lima.ipynb`.
- [ ] Tiene título, contexto, el cálculo y la conclusión.
- [ ] El total es **795** y por día **265.00**.
- [ ] Las cuentas usan variables, no números sueltos repetidos.
- [ ] **Run → Run All Cells** ejecuta todo sin errores, de arriba abajo.

## Paso 7 — Entrega

1. **File → Save Notebook** (Ctrl + S).
2. **File → Download**: se descarga el `.ipynb`.

```captura
archivo: jupyter/06-descargar.webp
texto: File → Download (1) descarga el notebook; Save (2) lo guarda
```

3. Mensaje de entrega: *"Te paso el notebook del presupuesto: total 795 USD (265 por día). Si cambia la tarifa del hotel, se actualiza cambiando una sola línea."*

## 🖥️ Hazlo también en JupyterLab real

- Opción sin instalar nada: **Google Colab** (colab.research.google.com) o **JupyterLite** (jupyter.org/try-jupyter) abren notebooks en el navegador.
- Opción profesional: instalar JupyterLab en tu computadora (lección 23).
- El `.ipynb` que descargaste se abre igual en cualquiera de ellos.

:::ejercicio quiz
¿Qué muestra `print(f"Total: {total / 3:.2f}")` si total vale 795?
- [ ] Total: {total / 3:.2f}
- [x] Total: 265.00
- [ ] Total: 265
- [ ] Total: 795/3
:::

:::ejercicio quiz
¿Por qué conviene guardar los montos en variables?
- [ ] Porque Python no suma números sueltos
- [x] Porque si cambia un dato se modifica una línea y todo se recalcula
- [ ] Porque ocupa menos memoria
- [ ] Porque el notebook no guarda números
:::

:::ejercicio quiz
¿Qué comprueba "Run All Cells" antes de entregar?
- [ ] Que el notebook tenga título
- [x] Que el notebook funciona de arriba abajo en orden, sin depender de celdas ejecutadas a mano
- [ ] Que el archivo pese poco
- [ ] Que no haya Markdown
:::
