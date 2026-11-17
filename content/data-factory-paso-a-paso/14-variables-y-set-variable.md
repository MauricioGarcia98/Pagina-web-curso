---
titulo: Variables y Set variable - calcular un valor una vez y reutilizarlo
nivel: 4 · Intermedio-avanzado
duracion: 35
resumen: Las variables guardan valores que cambian durante la ejecución. Creas la variable archivo, la calculas con una actividad Set variable a partir del parámetro, haces que la copia dependa de ese cálculo y la use con @variables('archivo'), y ves su valor en la salida - la mejor forma de depurar una expresión.
objetivos: Distinguir parámetro y variable | Crear una variable de pipeline | Asignarla con Set variable | Usar @variables() en otra actividad | Ver el valor calculado en la salida
prerrequisitos: data-factory-paso-a-paso-parametros-y-contenido-dinamico
autoevaluacion: ¿Sabes en qué se diferencia una variable de un parámetro? | ¿Sabes qué tipos de variable hay? | ¿Sabes por qué la copia tiene que depender del Set variable? | ¿Sabes dónde ves el valor que tomó?
---

:::analogia Una pizarra durante la jornada
Un parámetro es lo que te dicen al empezar el día; una variable es una pizarra donde vas anotando valores durante la jornada. Set variable escribe en la pizarra y las actividades siguientes la leen, siempre que esperen a que se haya escrito.
:::

## Paso 1 — Parámetro o variable

| | Parámetro | Variable |
|---|---|---|
| **Quién lo define** | Quien ejecuta (trigger, Trigger now) | El propio pipeline, durante la ejecución |
| **Cambia durante el run** | No | Sí, con **Set variable** (o Append variable) |
| **Se lee con** | `@pipeline().parameters.x` | `@variables('x')` |
| **Ejemplo** | La fecha a procesar | El nombre de archivo calculado, un contador, una lista |

## Paso 2 — Crear la variable

En `pl_ingesta_diaria`, haz clic en el lienzo vacío → **Variables → New**. Nombre `archivo`, tipo **String**:

```captura
archivo: adf/b14-variables.webp
texto: La variable archivo, de tipo String
```

Tipos en la práctica: **String**, **Boolean** y **Array**. En Data Factory real también hay **Integer**.

## Paso 3 — Set variable

Con nada seleccionado, agrega **Set variable** y llámala `Armar nombre`. En la pestaña **Variables**:

1. **Name**: `archivo`.
2. **Value**: `@concat('ventas_', pipeline().parameters.fecha, '.csv')`.

```captura
archivo: adf/b14-set-variable.webp
texto: La variable a asignar (1) y la expresión que calcula su valor (2)
```

## Paso 4 — Que la copia la use

En la copia, **General → Depends on**, marca `Armar nombre`. Y en **Source → Wildcard file name**: `@variables('archivo')`:

```captura
archivo: adf/b14-lienzo.webp
texto: Primero Armar nombre, después la copia (1), que usa la variable (2)
```

:::cuidado El orden importa
Si la copia **no depende** del Set variable, las dos corren a la vez y la copia puede leer la variable **vacía**. Toda actividad que usa una variable tiene que depender de la actividad que la asigna.
:::

## Paso 5 — Ver el valor

**Debug**, y abre el **Output** de `Armar nombre`:

```captura
archivo: adf/b14-output-variable.webp
texto: La salida de Set variable - el nombre y el valor calculado
```

`ventas_2026-11-15.csv`. Este truco sirve para **depurar cualquier expresión**: asígnala a una variable, ejecuta y mira qué valor tomó.

:::nota Dentro de un ForEach paralelo
Las variables son del **pipeline entero**, no de cada iteración. Si un ForEach corre en paralelo y cada iteración asigna la misma variable, se pisan entre sí. Dentro de un ForEach paralelo, usa `@item()` en lugar de variables.
:::

:::errores
- **Leer la variable antes de asignarla.** La copia tiene que depender de Set variable; si corren en paralelo, la encuentra vacía.
- **Confundir la sintaxis.** Las variables se leen con `@variables('archivo')`, no con `@pipeline().variables`.
- **Usar variables dentro de un ForEach en paralelo.** Son del pipeline completo y las vueltas se pisan; usa `@item()` o un pipeline hijo.
:::

## ✅ Lo que lograste

- Distingues parámetros y variables.
- Calculaste una variable con Set variable y la usaste en la copia.
- Sabes ver su valor para depurar expresiones.

:::ejercicio quiz
¿Qué valor cambia durante la ejecución?
- [ ] Un parámetro
- [x] Una variable
- [ ] Una expresión
- [ ] Un dataset
:::

:::ejercicio quiz
¿Cómo se lee la variable `archivo`?
- [x] `@variables('archivo')`
- [ ] `@pipeline().variables.archivo`
- [ ] `@archivo`
- [ ] `@parameters('archivo')`
:::

:::ejercicio quiz
La copia usa la variable pero a veces la encuentra vacía. ¿Qué falta?
- [ ] Un reintento
- [x] Que la copia dependa de la actividad Set variable
- [ ] Publicar
- [ ] Cambiar el tipo a Array
:::

:::ejercicio quiz
¿Cuál es una buena forma de ver qué devuelve una expresión complicada?
- [ ] Escribirla en la descripción del pipeline y publicarlo
- [x] Asignarla a una variable con Set variable y mirar la salida en Debug
- [ ] Publicarla y esperar
- [ ] Ejecutarla con Trigger now en producción
:::
