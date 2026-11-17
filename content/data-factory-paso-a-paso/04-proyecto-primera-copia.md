---
titulo: Proyecto 1 (guiado) - la primera copia de raw a bronze
nivel: 1 · Básico
duracion: 45
resumen: Tu primer pipeline - copiar las ventas de las tiendas de raw a bronze. Lo creas desde Ingest, le pones nombre, eliges origen y destino, lo validas, lo pruebas con Debug, lees las métricas de la copia y compruebas en el portal que los archivos llegaron. Cada paso con su captura y una lista de verificación.
objetivos: Crear un pipeline con una actividad Copy data | Configurar origen y destino con datasets | Validar y probar con Debug | Leer la salida de una copia (filas, archivos, duración) | Verificar el resultado en el almacenamiento
prerrequisitos: data-factory-paso-a-paso-datasets
autoevaluacion: ¿Sabes qué hace Debug y qué no? | ¿Sabes dónde ver cuántas filas se copiaron? | ¿Sabes verificar en el portal que llegaron los archivos? | ¿Sabes por qué conviene renombrar la actividad?
---

:::escenario El pedido
Lucía: *"Empecemos simple: un pipeline que copie todos los CSV de `raw/ventas` a `bronze/ventas`. Pruébalo y muéstrame cuántas filas copió."*
:::

## Paso 1 — Crear el pipeline

En **Home**, haz clic en **Ingest**. Se crea un pipeline con una actividad **Copy data**:

```captura
archivo: adf/b04-pipeline-nuevo.webp
texto: El editor de pipelines - las actividades (1), el lienzo (2) y las propiedades de la actividad elegida (3)
```

| Zona | Qué tiene |
|---|---|
| **Actividades** (izquierda) | Todo lo que se puede agregar, por grupo |
| **Lienzo** (centro) | Las actividades del pipeline y sus flechas |
| **Propiedades** (abajo) | Las pestañas de la actividad elegida: General, Source, Sink… |
| **Barra** (arriba) | Validate, Debug, Add trigger, Code, Rename, Delete |

Con **Rename**, llámalo `pl_copiar_ventas`. Haz clic en la actividad y en **General** ponle nombre: `Copiar ventas a bronze`. Un nombre claro es lo que verás en Monitor cuando algo falle.

## Paso 2 — Origen y destino

Pestaña **Source**, dataset `ds_raw_ventas`:

```captura
archivo: adf/b04-source.webp
texto: Source - el dataset de origen (1) y el comodín de archivos (2), vacío por ahora
```

Pestaña **Sink** (el destino), dataset `ds_bronze_ventas`:

```captura
archivo: adf/b04-sink.webp
texto: Sink - el dataset de destino (1) y la opción de unir archivos (2), sin marcar
```

## Paso 3 — Validate

**Validate** revisa que no falte nada obligatorio:

```captura
archivo: adf/b04-validar.webp
texto: Validate (1) - "Your pipeline has been validated. No errors were found." (2)
```

## Paso 4 — Debug

**Debug** ejecuta el pipeline **tal como está ahora**, sin publicar. Copia de verdad:

```captura
archivo: adf/b04-debug.webp
texto: Debug (1) y la salida (2) - la actividad terminó en Succeeded
```

En la tabla de salida, el ícono de **Output** muestra el detalle:

```captura
archivo: adf/b04-output.webp
texto: La salida de la copia - archivos leídos y escritos, filas, bytes, duración y DIU usadas
```

| Métrica | Valor | Qué significa |
|---|---|---|
| `filesRead` / `filesWritten` | 4 / 4 | Los cuatro días de ventas |
| `rowsRead` / `rowsCopied` | 20 / 20 | Cinco ventas por archivo, todas copiadas |
| `usedDataIntegrationUnits` | 4 | La potencia que usó la copia (y que se paga) |
| `billingReference` | DIUHours | Cómo se factura: unidades por hora |

## Paso 5 — Verificar en el almacenamiento

En el portal, `sttiendaandinadev` → **Containers → bronze**:

```captura
archivo: adf/b04-bronze.webp
texto: Los cuatro archivos en bronze/ventas
```

:::errores
- **Probar con Trigger now antes de publicar.** Para probar el borrador se usa Debug.
- **Dejar "Copy data1" como nombre.** En Monitor y en los errores no sabrás qué copia falló.
- **No mirar las filas copiadas.** Un Succeeded con cero filas no es éxito; revisa el Output.
:::

## ✅ Lista de verificación

- [ ] El pipeline se llama `pl_copiar_ventas` y la actividad `Copiar ventas a bronze`.
- [ ] Validate no muestra errores.
- [ ] Debug terminó en **Succeeded**.
- [ ] La salida dice `rowsCopied: 20` y `filesWritten: 4`.
- [ ] En `bronze/ventas` están los cuatro archivos.

:::cuidado Debug no es producción
Debug sirve para probar mientras diseñas: no necesita publicar y no lo dispara ningún trigger. Pero **sí mueve datos de verdad** y **sí cuesta**. En un factory real, apunta tus pruebas a datos de dev, no de producción.
:::

## Lo que aprendiste en el nivel 1

- Las piezas de Data Factory y las zonas del Studio.
- Linked services con identidad administrada y el error de permisos.
- Datasets, Preview data y su JSON.
- Tu primer pipeline, probado con Debug y verificado.

:::ejercicio quiz
¿Qué ejecuta Debug?
- [ ] La última versión publicada
- [x] El pipeline tal como está en el editor, sin necesidad de publicar
- [ ] Solo la validación
- [ ] Una copia de prueba con las primeras 100 filas
:::

:::ejercicio quiz
¿Dónde ves cuántas filas copió la actividad?
- [ ] En el dataset
- [x] En el Output de la actividad, en la salida de Debug o en Monitor
- [ ] En el linked service
- [ ] En el portal, en Tags
:::

:::ejercicio quiz
¿Cómo se llama la pestaña del destino en Copy data?
- [ ] Target
- [ ] Output
- [x] Sink
- [ ] Destination
:::

:::ejercicio quiz
¿Por qué conviene renombrar "Copy data1"?
- [ ] Porque Data Factory lo exige
- [x] Porque es lo que verás en Monitor y en los errores; un nombre claro dice qué falló
- [ ] Porque los nombres con números no se pueden publicar
- [ ] No conviene: Monitor muestra el tipo de actividad, no el nombre
:::
