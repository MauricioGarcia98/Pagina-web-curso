---
titulo: Copy data a fondo - comodines, unir archivos y las métricas
nivel: 2 · Básico-intermedio
duracion: 40
resumen: La actividad Copy es la que más se usa en Data Factory. Filtras qué archivos copiar con un comodín, ves cómo cambian las métricas, unes los cuatro días en un solo archivo con Merge files y un nombre de salida, comparas el resultado en el almacenamiento y entiendes qué son las DIU y por qué importan en la factura.
objetivos: Filtrar archivos de origen con comodines | Leer filesRead, rowsCopied y DIU en la salida | Unir varios archivos en uno con Merge files | Dar nombre al archivo de destino | Explicar cómo se cobra una copia
prerrequisitos: data-factory-paso-a-paso-pipelines-y-el-lienzo
autoevaluacion: ¿Sabes qué comodín copia solo el día 15? | ¿Sabes qué hace Merge files con los encabezados? | ¿Sabes qué son las DIU? | ¿Sabes qué pasa si el comodín no encuentra ningún archivo?
---

## Paso 1 — Copiar un solo día con un comodín

En `pl_copiar_ventas`, pestaña **Source** de la copia, escribe en **Wildcard file name**: `*-11-15.csv`:

```captura
archivo: adf/b06-wildcard.webp
texto: El comodín: solo los archivos que terminan en -11-15.csv
```

| Comodín | Significa | Ejemplo |
|---|---|---|
| `*` | Cualquier cantidad de caracteres | `*.csv` = todos los CSV |
| `?` | Exactamente un carácter | `ventas_2026-11-1?.csv` = del 10 al 19 |

Haz **Debug** y abre el **Output**:

```captura
archivo: adf/b06-un-archivo.webp
texto: Ahora se leyó un solo archivo con cinco filas
```

## Paso 2 — Unir archivos: Merge files

Muchas veces el destino necesita **un solo archivo**. Borra el comodín y, en **Sink**:

1. Marca **Copy behavior: Merge files**.
2. **File name**: `ventas_historico.csv`.

```captura
archivo: adf/b06-merge.webp
texto: Merge files (1) y el nombre del archivo de salida (2)
```

Haz **Debug** y mira el **Output**:

```captura
archivo: adf/b06-merge-output.webp
texto: Cuatro archivos leídos, uno escrito, veinte filas
```

Data Factory deja **un solo encabezado** al principio y pega las filas de todos los archivos.

```captura
archivo: adf/b06-bronze.webp
texto: En bronze ahora está también ventas_historico.csv, con las veinte filas
```

Después de probar, desmarca Merge files y borra el nombre: el pipeline vuelve a copiar archivo por archivo.

:::tip ¿Unir o no unir?
En **bronze** conviene copiar archivo por archivo, tal como llegaron: si un día hay que reprocesar, se toma ese archivo. Unir tiene sentido cuando el destino lo pide (un sistema que espera un único archivo) o para no generar miles de archivos chicos.
:::

## Paso 3 — Las métricas de una copia

| Métrica | Para qué la miras |
|---|---|
| `filesRead` / `filesWritten` | ¿Copió todos los archivos que esperaba? |
| `rowsRead` / `rowsCopied` | ¿Se perdieron filas? Si difieren, hubo filas rechazadas |
| `dataRead` / `dataWritten` | El volumen, en bytes |
| `copyDuration` / `throughput` | Si una copia empieza a tardar más, algo cambió |
| `usedDataIntegrationUnits` | Las **DIU**: la potencia de cómputo que usó |

## Paso 4 — Cómo se cobra

Una **DIU** (*Data Integration Unit*) mezcla CPU, memoria y red. Una copia se cobra, a grandes rasgos, por **DIU × horas** de copia, más un costo por cada ejecución de actividad. Por eso la salida trae `billingReference` con `DIUHours`. Con archivos chicos la diferencia es mínima; con terabytes, ajustar las DIU y no copiar de más es dinero.

:::cuidado Si el comodín no encuentra nada
La copia **falla** con `UserErrorSourceBlobNotExist`. Lo provocas a propósito en la lección siguiente. En la lección 17 aprendes a verificar antes si el archivo llegó.
:::

## ✅ Lo que lograste

- Filtras archivos con comodines.
- Unes archivos con Merge files y eliges el nombre de salida.
- Lees las métricas y sabes qué se cobra.

:::ejercicio quiz
¿Qué comodín copia solo los archivos del 15 de noviembre?
- [ ] `*.csv`
- [x] `*-11-15.csv`
- [ ] `11-15`
- [ ] `?-11-15`
:::

:::ejercicio quiz
Con Merge files, cuatro CSV con encabezado se unen en uno. ¿Cuántos encabezados quedan?
- [x] Uno, al principio
- [ ] Cuatro
- [ ] Ninguno
- [ ] Depende del día
:::

:::ejercicio quiz
`rowsRead` dice 1000 y `rowsCopied` 990. ¿Qué indica?
- [ ] Que todo salió bien
- [x] Que diez filas no se copiaron y hay que revisar por qué
- [ ] Que el destino ya tenía diez filas
- [ ] Nada importante
:::

:::ejercicio quiz
¿Qué son las DIU?
- [ ] Un formato de archivo
- [x] Las unidades de potencia de cómputo que usa una copia, y que se cobran por hora
- [ ] Los reintentos de una actividad
- [ ] Un tipo de trigger
:::
