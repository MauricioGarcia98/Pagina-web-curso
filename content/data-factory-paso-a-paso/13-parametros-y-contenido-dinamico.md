---
titulo: Parámetros y contenido dinámico - un pipeline para cualquier fecha
nivel: 4 · Intermedio-avanzado
duracion: 50
resumen: Un pipeline con la fecha fija sirve para un día; con un parámetro sirve para cualquiera, incluido reprocesar el mes pasado. Agregas el parámetro fecha a pl_ingesta_diaria, lo usas en el comodín del origen y en el nombre del destino con @pipeline().parameters, lo pruebas con Debug, y al publicar ves que Trigger now te pide el valor. Más una guía de las funciones de expresión que más se usan.
objetivos: Crear un parámetro de pipeline con valor por defecto | Usar @pipeline().parameters en propiedades dinámicas | Combinar funciones de texto y fecha | Pasar un valor distinto al ejecutar | Reprocesar un día pasado sin tocar el pipeline
prerrequisitos: data-factory-paso-a-paso-proyecto-en-produccion-con-horario
autoevaluacion: ¿Sabes dónde se crean los parámetros del pipeline? | ¿Sabes cómo se lee un parámetro en una expresión? | ¿Sabes quitar los guiones de una fecha? | ¿Sabes reprocesar el día 14 sin cambiar el pipeline?
---

:::escenario El pedido
Lucía: *"El sistema de la tienda de Bogotá reenvió el archivo del 14 porque el primero vino mal. Necesito reprocesar solo ese día, y que esto se pueda hacer siempre sin tocar el pipeline."*
:::

## Paso 1 — Qué es un parámetro

Un **parámetro** es un valor que se le pasa al pipeline **al ejecutarlo**. Tiene un valor por defecto y no cambia durante la ejecución. Es la forma de escribir un pipeline una vez y usarlo para cualquier fecha, tienda o carpeta.

## Paso 2 — Crear el parámetro

Abre `pl_ingesta_diaria` y haz clic en un espacio **vacío** del lienzo: abajo aparecen **Parameters** y **Variables** del pipeline. En **Parameters → New**, nombre `fecha`, valor por defecto `2026-11-15`:

```captura
archivo: adf/b13-parametro.webp
texto: El parámetro fecha con su valor por defecto
```

## Paso 3 — Usarlo en el origen y en el destino

En la copia, **Source → Wildcard file name**:

```text
ventas_@{pipeline().parameters.fecha}.csv
```

```captura
archivo: adf/b13-source.webp
texto: El comodín ahora toma el archivo del día que diga el parámetro
```

En **Sink → File name** (con Merge files marcado):

```text
ventas_@{replace(pipeline().parameters.fecha, '-', '')}.csv
```

```captura
archivo: adf/b13-sink.webp
texto: El nombre de salida con la fecha sin guiones
```

Con `fecha = 2026-11-15`, el origen busca `ventas_2026-11-15.csv` y el destino escribe `ventas_20261115.csv`.

## Paso 4 — Probar y ejecutar con otro valor

**Debug** usa el valor por defecto:

```captura
archivo: adf/b13-debug-output.webp
texto: Un archivo leído y cinco filas: solo el día 15
```

Publica con **Publish all** y haz **Add trigger → Trigger now**. Ahora el diálogo pide el parámetro: escribe `2026-11-14`:

```captura
archivo: adf/b13-trigger-param.webp
texto: Trigger now pide el valor del parámetro - aquí, el día a reprocesar
```

```captura
archivo: adf/b13-bronze.webp
texto: En bronze aparecen ventas_20261115.csv y ventas_20261114.csv
```

Reprocesaste el 14 sin tocar el pipeline. Un trigger también puede pasar parámetros: por ejemplo, `@trigger().scheduledTime` para que cada ejecución procese su propio día.

## Paso 5 — Las funciones más usadas

| Necesitas | Expresión | Resultado |
|---|---|---|
| Leer un parámetro | `@pipeline().parameters.fecha` | `2026-11-15` |
| Unir textos | `@concat('ventas_', pipeline().parameters.fecha)` | `ventas_2026-11-15` |
| Reemplazar | `@replace('2026-11-15', '-', '')` | `20261115` |
| Fecha actual | `@utcNow('yyyy-MM-dd')` | La fecha de hoy en UTC |
| Formatear | `@formatDateTime(utcNow(), 'yyyy/MM/dd')` | `2026/11/15` |
| Sumar días | `@addDays(utcNow(), -1, 'yyyy-MM-dd')` | Ayer |
| Comparar | `@equals(pipeline().parameters.tienda, 'Lima')` | `true` / `false` |
| Otros datos de la ejecución | `@pipeline().RunId`, `@pipeline().TriggerTime` | El ID y la hora del run |

:::cuidado Las expresiones distinguen comillas
Los textos dentro de una expresión van entre **comillas simples**: `'ventas_'`. Las comillas dobles o un paréntesis de menos dan `The expression … is not valid`. Si una expresión falla, pruébala por partes en un Set variable (lección siguiente).
:::

## ✅ Lo que lograste

- Creaste un parámetro y lo usaste en origen y destino.
- Ejecutaste el pipeline publicado con otro valor para reprocesar un día.
- Conoces las funciones de expresión más usadas.

:::ejercicio quiz
¿Cómo se lee el parámetro `fecha` dentro de una expresión?
- [ ] `@fecha`
- [ ] `@parameters('fecha')`
- [x] `@pipeline().parameters.fecha`
- [ ] `@variables('fecha')`
:::

:::ejercicio quiz
¿Qué devuelve `@replace('2026-11-14', '-', '')`?
- [ ] `2026 11 14`
- [x] `20261114`
- [ ] `14112026`
- [ ] `2026-11-14`
:::

:::ejercicio quiz
Tienes que reprocesar el día 3. ¿Qué haces?
- [ ] Cambio el valor por defecto, publico, ejecuto y lo vuelvo a cambiar
- [x] Trigger now con `fecha = 2026-11-03`, sin tocar el pipeline
- [ ] Copio el archivo a mano
- [ ] Creo otro pipeline
:::

:::ejercicio quiz
¿Qué expresión da la fecha de ayer en formato año-mes-día?
- [ ] `@utcNow() - 1`
- [x] `@addDays(utcNow(), -1, 'yyyy-MM-dd')`
- [ ] `@yesterday()`
- [ ] `@formatDateTime('ayer')`
:::
