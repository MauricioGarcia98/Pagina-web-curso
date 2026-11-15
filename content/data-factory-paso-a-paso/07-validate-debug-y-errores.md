---
titulo: Validate, Debug y los errores - leer un fallo y arreglarlo
nivel: 2 · Básico-intermedio
duracion: 40
resumen: Los pipelines fallan, y saber leer el error es la mitad del trabajo. Provocas un error de validación (una copia sin destino), un fallo en ejecución (un archivo que no llegó), lees el código y el mensaje del error, configuras reintentos para fallos pasajeros y encuentras todas tus pruebas en la pestaña Debug de Monitor.
objetivos: Distinguir errores de validación y errores de ejecución | Leer el código, el tipo y el mensaje de un error | Configurar reintentos y saber cuándo sirven | Encontrar las ejecuciones de Debug en Monitor | Seguir un método para diagnosticar fallos
prerrequisitos: data-factory-paso-a-paso-copy-data-a-fondo
autoevaluacion: ¿Sabes qué detecta Validate y qué no? | ¿Sabes dónde ver el mensaje completo de un error? | ¿Sabes cuándo un reintento ayuda y cuándo no? | ¿Sabes dónde quedan tus pruebas de Debug?
---

## Paso 1 — Un error de validación

En la copia de `pl_copiar_ventas`, pestaña **Sink**, deja el dataset vacío y haz **Validate**:

```captura
archivo: adf/b07-validacion-error.webp
texto: Pipeline validation output - "Found 1 error" con la actividad, el tipo y el mensaje
```

**Validate** encuentra lo que falta **antes** de ejecutar: datasets sin elegir, expresiones mal escritas, nombres repetidos. No puede saber si un archivo existe o si hay permisos: eso solo se ve al ejecutar. Vuelve a elegir `ds_bronze_ventas`.

## Paso 2 — Un error de ejecución

En **Source**, pon el comodín `*-11-16.csv` (ese día todavía no llegó) y haz **Debug**:

```captura
archivo: adf/b07-debug-falla.webp
texto: La actividad en rojo (1) y la salida con Failed (2)
```

El ícono de la columna **Error** muestra el detalle:

```captura
archivo: adf/b07-error-detalle.webp
texto: Error code 2200, Failure type UserError y el mensaje UserErrorSourceBlobNotExist con la carpeta y el patrón
```

| Parte | Qué dice | Para qué sirve |
|---|---|---|
| **Error code** | `2200` | El código de la familia del error (2200 = Copy) |
| **Failure type** | `UserError` | Es un problema de configuración o de datos, no de Azure |
| **Message** | `UserErrorSourceBlobNotExist … file pattern: *-11-16.csv` | **Lo importante**: qué buscó y dónde |

## Paso 3 — Un método para diagnosticar

1. **¿Qué actividad falló?** La que está en rojo.
2. **¿Qué dice el mensaje?** Lee el mensaje completo, no solo el código.
3. **¿Es mío o de afuera?** `UserError` casi siempre es configuración, permisos o datos. Un `SystemError` o un timeout puede ser pasajero.
4. **¿Qué cambió?** Si ayer funcionaba: ¿llegó el archivo?, ¿cambió el formato?, ¿alguien tocó un permiso?
5. **Reproduce con Debug** y arregla.

Los errores más comunes:

| Error | Causa típica |
|---|---|
| `AuthorizationPermissionMismatch` / `Forbidden` | A la identidad del factory le falta un rol |
| `FilesystemNotFound` | El contenedor no existe o está mal escrito |
| `UserErrorSourceBlobNotExist` | No hay archivos que coincidan con la ruta o el comodín |
| `The expression … is not valid` | Una expresión mal escrita (lección 13) |

## Paso 4 — Reintentos

En **General**, el campo **Retry** indica cuántas veces se reintenta una actividad que falla:

```captura
archivo: adf/b07-retry.webp
texto: Retry - cuántas veces reintentar antes de dar la actividad por fallida
```

:::tip Cuándo sirve reintentar
Un reintento ayuda con fallos **pasajeros**: un corte de red, un servicio ocupado, un archivo que todavía se está escribiendo. **No** ayuda con un error de configuración: si el archivo no existe o falta un rol, falla igual tres veces. En la vida real se usan 1 a 3 reintentos con un intervalo de unos minutos en las copias desde sistemas externos.
:::

Vuelve el reintento a 0 y borra el comodín.

## Paso 5 — Las pruebas en Monitor

**Monitor → Debug**:

```captura
archivo: adf/b07-monitor-debug.webp
texto: La pestaña Debug (1) con todas tus pruebas, la fallida incluida (2)
```

Monitor separa las ejecuciones **Triggered** (las de verdad) de las **Debug** (tus pruebas), para que una prueba fallida no se confunda con un incidente de producción.

## ✅ Lo que lograste

- Distingues errores de validación y de ejecución.
- Lees un error completo y sigues un método para diagnosticarlo.
- Sabes cuándo un reintento ayuda.

:::ejercicio quiz
¿Cuál de estos errores detecta Validate?
- [ ] Que el archivo no llegó
- [ ] Que falta un rol
- [x] Que la copia no tiene dataset de destino
- [ ] Que el servicio está caído
:::

:::ejercicio quiz
Una copia falla con UserErrorSourceBlobNotExist. ¿Qué revisas primero?
- [ ] Los permisos del factory
- [x] Que haya archivos en la carpeta que coincidan con el comodín
- [ ] El precio de las DIU
- [ ] El trigger
:::

:::ejercicio quiz
Falla por un rol faltante. ¿Sirve poner Retry = 3?
- [ ] Sí, al tercer intento funciona
- [x] No, va a fallar igual las tres veces: hay que asignar el rol
- [ ] Sí, Azure asigna el rol solo
- [ ] Depende de la hora
:::

:::ejercicio quiz
¿Dónde encuentras las pruebas que hiciste con Debug?
- [ ] En Manage
- [x] En Monitor, pestaña Debug
- [ ] En el portal, en el registro de actividad
- [ ] No quedan registradas
:::
