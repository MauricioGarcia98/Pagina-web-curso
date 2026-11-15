---
titulo: Get Metadata y ForEach - recorrer los archivos de una carpeta
nivel: 4 · Intermedio-avanzado
duracion: 50
resumen: Cuando hay que hacer algo con cada archivo, Data Factory lista la carpeta con Get Metadata y la recorre con ForEach. Armas pl_copiar_carpeta - listar los archivos de raw/ventas, recorrerlos y copiar cada uno con @item().name -, entras y sales del ForEach, lees childItems en la salida y ves una fila por iteración en Debug.
objetivos: Listar una carpeta con Get Metadata y childItems | Recorrer una lista con ForEach | Usar @item() dentro del bucle | Entrar y salir de las actividades del ForEach | Leer las iteraciones en la salida
prerrequisitos: data-factory-paso-a-paso-variables-y-set-variable
autoevaluacion: ¿Sabes qué devuelve childItems? | ¿Sabes qué expresión va en Items? | ¿Sabes cómo se llama cada elemento dentro del bucle? | ¿Sabes qué pasa si un ForEach contiene otro?
---

## Paso 1 — El patrón "listar y recorrer"

```text
Get Metadata (childItems)  ──▶  ForEach (items = la lista)  ──▶  [ adentro: Copy con @item().name ]
```

Sirve cuando no sabes cuántos archivos hay ni cómo se llaman, y quieres tratar cada uno por separado: copiarlo, registrarlo, validarlo.

## Paso 2 — Get Metadata

Crea un pipeline `pl_copiar_carpeta`. Agrega **Get Metadata**, llámala `Listar archivos` y en **Settings**:

1. **Dataset**: `ds_raw_ventas` (la carpeta, sin archivo).
2. **Field list**: **childItems**.

```captura
archivo: adf/b15-get-metadata.webp
texto: El dataset de la carpeta (1) y el campo childItems (2)
```

| Campo | Devuelve |
|---|---|
| **childItems** | Los archivos y subcarpetas, cada uno con `name` y `type` |
| **exists** | `true` o `false` (sin fallar si no existe) |
| **itemName**, **itemType**, **size**, **lastModified** | Datos de un archivo o carpeta |
| **columnCount** | Cuántas columnas tiene un archivo |

## Paso 3 — ForEach

Con `Listar archivos` seleccionada, agrega **ForEach** (`Por cada archivo`). En **Settings → Items**:

```text
@activity('Listar archivos').output.childItems
```

```captura
archivo: adf/b15-foreach.webp
texto: Sequential (1) y la lista a recorrer (2)
```

`@activity('nombre').output` lee la salida de una actividad anterior. Es la forma de pasar datos de una actividad a otra.

## Paso 4 — Adentro del ForEach

Haz clic en **Activities** dentro de la caja del ForEach (o en **Editar actividades**). Arriba aparece la ruta: estás **dentro** del bucle. Agrega una copia `Copiar archivo`:

- **Source**: `ds_raw_ventas`, **Wildcard file name**: `@item().name`.
- **Sink**: `ds_bronze_ventas`.

```captura
archivo: adf/b15-dentro-foreach.webp
texto: La ruta pipeline › ForEach › Activities (1) y la copia dentro del bucle (2)
```

```captura
archivo: adf/b15-copy-item.webp
texto: @item().name - el nombre del archivo de esta vuelta
```

En cada vuelta, `@item()` es un elemento de childItems, por ejemplo `{"name": "ventas_2026-11-12.csv", "type": "File"}`, así que `@item().name` es el nombre del archivo. Vuelve al pipeline con la ruta de arriba.

## Paso 5 — Probar

**Debug**:

```captura
archivo: adf/b15-debug.webp
texto: Listar archivos, el ForEach y una copia por cada archivo: [0], [1], [2]…
```

El **Output** de `Listar archivos`:

```captura
archivo: adf/b15-child-items.webp
texto: childItems - los cuatro archivos con su nombre y tipo
```

## Paso 6 — Secuencial o en paralelo, y los límites

| Opción | Qué hace |
|---|---|
| **Sequential** marcado | Una vuelta después de otra |
| **Sequential** desmarcado + **Batch count** | Hasta *n* vueltas a la vez (por defecto 20, máximo 50) |

:::cuidado Límites de ForEach
- Un **ForEach no puede contener otro ForEach**. Para recorrer dos niveles, el ForEach de afuera llama con **Execute Pipeline** a otro pipeline que tiene el segundo ForEach.
- En paralelo, **no uses variables** dentro del bucle (se pisan entre vueltas): usa `@item()`.
- En la práctica, las vueltas corren en orden aunque elijas paralelo; en Data Factory real corren a la vez.
:::

## ✅ Lo que lograste

- Listaste una carpeta con Get Metadata.
- Recorriste la lista con ForEach y copiaste cada archivo con `@item().name`.
- Conoces los límites de ForEach.

:::ejercicio quiz
¿Qué campo de Get Metadata da la lista de archivos de una carpeta?
- [ ] itemName
- [x] childItems
- [ ] exists
- [ ] size
:::

:::ejercicio quiz
¿Qué va en Items del ForEach para recorrer esa lista?
- [ ] `@item().name`
- [x] `@activity('Listar archivos').output.childItems`
- [ ] `@variables('lista')`
- [ ] `childItems`
:::

:::ejercicio quiz
Dentro del bucle, ¿cómo obtienes el nombre del archivo de esta vuelta?
- [x] `@item().name`
- [ ] `@pipeline().name`
- [ ] `@activity('ForEach').name`
- [ ] `@name`
:::

:::ejercicio quiz
Necesitas recorrer carpetas y, dentro de cada una, sus archivos. ¿Cómo?
- [ ] Un ForEach dentro de otro
- [x] Un ForEach que llama con Execute Pipeline a otro pipeline con el segundo ForEach
- [ ] No se puede
- [ ] Con un trigger
:::
