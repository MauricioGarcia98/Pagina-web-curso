---
titulo: Lookup, If Condition y Fail - leer una configuración y decidir
nivel: 5 · Avanzado
duracion: 55
resumen: Un pipeline que decide - si llegó el archivo del día, lo copia; si no, falla con un mensaje claro en lugar de un error técnico. Lees una tabla de configuración con Lookup, armas pl_validar_llegada con Get Metadata, If Condition y Fail, lo ves fallar con tu propio mensaje para un día sin archivo y pasar por la rama verdadera para un día con archivo.
objetivos: Leer filas de un archivo con Lookup | Distinguir firstRow y value en la salida de Lookup | Bifurcar con If Condition y una expresión booleana | Fallar a propósito con un mensaje y código propios | Probar las dos ramas con un parámetro
prerrequisitos: data-factory-paso-a-paso-proyecto-devoluciones-en-paralelo
autoevaluacion: ¿Sabes cuándo desmarcar First row only? | ¿Sabes qué tiene que devolver la expresión de un If? | ¿Sabes para qué sirve fallar a propósito? | ¿Sabes probar la rama False?
---

:::escenario El pedido
Lucía: *"Cuando una tienda no manda el archivo, la copia falla con 'UserErrorSourceBlobNotExist' y la guardia pierde media hora entendiendo qué pasó. Quiero que el pipeline revise primero si el archivo llegó y, si no, falle diciendo eso en castellano."*
:::

## Paso 1 — Lookup: leer una configuración

En `config/tablas_a_copiar.csv` hay una tabla de control. Crea el dataset `ds_config_tablas` (contenedor `config`, archivo `tablas_a_copiar.csv`) y mira la vista previa:

```captura
archivo: adf/b17-config.webp
texto: La tabla de control - qué fuente, con qué patrón y si está activa
```

Crea `pl_leer_config` con una actividad **Lookup** (`Leer config`): dataset `ds_config_tablas` y **First row only** desmarcado:

```captura
archivo: adf/b17-lookup.webp
texto: El dataset (1) y First row only desmarcado (2)
```

**Debug** y abre el **Output**:

```captura
archivo: adf/b17-lookup-output.webp
texto: count (3) y value: una lista con las tres filas como objetos
```

| First row only | La salida tiene | Se lee con |
|---|---|---|
| **Marcado** | `firstRow`: un objeto | `@activity('Leer config').output.firstRow.fuente` |
| **Desmarcado** | `count` y `value`: una lista | `@activity('Leer config').output.value` (para un ForEach) |

Lookup devuelve como máximo **5000 filas** (o 4 MB): es para configuraciones y listas de control, no para mover datos.

## Paso 2 — El pipeline que decide

Crea `pl_validar_llegada` con un parámetro `fecha` (valor por defecto `2026-11-16`, un día sin archivo):

1. **Get Metadata** `Listar ventas` sobre `ds_raw_ventas`, con childItems.
2. **If Condition** `Llego el archivo`, conectada después, con la expresión:

```text
@contains(string(activity('Listar ventas').output.childItems), pipeline().parameters.fecha)
```

```captura
archivo: adf/b17-if.webp
texto: La expresión (1) y las dos ramas, True y False (2)
```

`string(...)` convierte la lista a texto y `contains` busca la fecha adentro. La expresión de un If **tiene que devolver `true` o `false`**: funciones como `equals`, `greater`, `contains`, `and`, `or`, `not`.

## Paso 3 — Las ramas

En **True** (botón *True · editar*), una copia `Copiar ventas` con comodín `ventas_@{pipeline().parameters.fecha}.csv` hacia bronze.

En **False**, una actividad **Fail** `Falta el archivo`:

- **Fail message**: `@concat('No llegó el archivo de ventas del ', pipeline().parameters.fecha)`
- **Error code**: `ARCHIVO_FALTANTE`

```captura
archivo: adf/b17-fail.webp
texto: Dentro de la rama False (1) - el mensaje (2) y el código (3) del error
```

## Paso 4 — Probar las dos ramas

**Debug** con `fecha = 2026-11-16`:

```captura
archivo: adf/b17-debug-falla.webp
texto: Listar ventas bien, el If por la rama False, y Fail termina el pipeline con error
```

El detalle del error es **tuyo**:

```captura
archivo: adf/b17-fail-error.webp
texto: Error code ARCHIVO_FALTANTE - "No llegó el archivo de ventas del 2026-11-16"
```

Cambia el parámetro a `2026-11-15` y vuelve a ejecutar:

```captura
archivo: adf/b17-debug-ok.webp
texto: Ahora el If va por la rama True y copia el archivo
```

:::tip ¿Por qué fallar a propósito?
Un pipeline que "termina bien" sin haber copiado nada es peor que uno que falla: nadie se entera y el informe del día sale vacío. **Fail** convierte una situación de negocio ("no llegó el archivo") en un error visible, con un mensaje que la guardia entiende sin abrir el pipeline, y que dispara las alertas de la lección 11.
:::

## ✅ Lo que lograste

- Lees configuraciones con Lookup y sabes usar `firstRow` y `value`.
- Bifurcas con If Condition y una expresión booleana.
- Fallas a propósito con un mensaje claro y probaste las dos ramas.

:::ejercicio quiz
Quieres recorrer todas las filas de una tabla de control con un ForEach. ¿Cómo configuras el Lookup?
- [ ] First row only marcado
- [x] First row only desmarcado, y usas `output.value`
- [ ] No se puede con Lookup
- [ ] Con childItems
:::

:::ejercicio quiz
¿Qué tiene que devolver la expresión de un If Condition?
- [ ] Un número
- [ ] Un texto
- [x] true o false
- [ ] Una lista
:::

:::ejercicio quiz
¿Para qué sirve la actividad Fail?
- [ ] Para borrar el pipeline
- [x] Para terminar el pipeline con un error propio, con mensaje y código claros
- [ ] Para reintentar
- [ ] Para saltar una actividad
:::

:::ejercicio quiz
¿Cuántas filas devuelve Lookup como máximo?
- [ ] 100
- [x] 5000
- [ ] Ilimitadas
- [ ] 1
:::
