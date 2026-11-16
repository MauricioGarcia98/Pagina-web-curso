---
titulo: Cargar datos - de un archivo a una tabla particionada
nivel: 3 · Intermedio
duracion: 35
resumen: Los eventos de la app llegan en un CSV. Creas la tabla eventos_app desde un archivo con Create table, con el esquema autodetectado y particionada por fecha, la revisas y conoces las otras formas de cargar - LOAD DATA, bq load, tablas externas sobre Cloud Storage y streaming.
objetivos: Crear una tabla desde un archivo | Particionar al cargar | Revisar el esquema detectado | Elegir entre carga por lotes, tablas externas y streaming
prerrequisitos: bigquery-paso-a-paso-particiones-y-clustering
autoevaluacion: ¿Sabes cuánto cuesta una carga por lotes? | ¿Sabes qué es autodetect? | ¿Sabes qué es una tabla externa? | ¿Sabes cuándo conviene streaming?
---

:::analogia Mudar los muebles o ir al depósito
Cargar un archivo es mudar los muebles a tu casa: la mudanza es gratis, pagas el espacio y después todo está a mano. Una tabla externa es dejarlos en el depósito (Cloud Storage) e ir a buscarlos cada vez que los necesitas: más lento y sin todas las comodidades.
:::

## Paso 1 — Create table

En el dataset `analitica`, **Create table**:

```captura
archivo: bigquery/q10-crear.webp
texto: Create table - desde un archivo (aquí, el de ejemplo del curso), tabla eventos_app y partición por la columna fecha
```

En la práctica puedes subir tu propio CSV o JSON por líneas; el de ejemplo trae 600 eventos de la app en 60 días.

## Paso 2 — La tabla cargada

```captura
archivo: bigquery/q10-tabla.webp
texto: eventos_app (1) - el esquema detectado con fecha como columna de partición (2)
```

**Auto detect** deduce los tipos mirando los datos. Para producción conviene un **esquema explícito**: si mañana un archivo trae `"N/A"` en una columna numérica, el esquema fijo rechaza la fila en lugar de cambiar el tipo.

## Paso 3 — Otras formas de cargar

```sql norun
-- con SQL, desde Cloud Storage
LOAD DATA INTO analitica.eventos_app
PARTITION BY fecha
FROM FILES (format = 'CSV', skip_leading_rows = 1, uris = ['gs://tienda-andina-landing/eventos/*.csv']);
```

```bash norun
# con la CLI
bq load --source_format=CSV --skip_leading_rows=1 --time_partitioning_field=fecha \
  analitica.eventos_app gs://tienda-andina-landing/eventos/*.csv
```

| Forma | Cuándo | Costo |
|---|---|---|
| **Carga por lotes** (Create table, `LOAD DATA`, `bq load`) | Archivos que llegan cada hora o cada día | Gratis; se paga el almacenamiento |
| **Tabla externa / BigLake** | Consultar archivos en Cloud Storage sin cargarlos | Se paga al consultarlos |
| **Streaming** (Storage Write API) | Datos que tienen que estar al instante | Por volumen ingerido |
| **Data Transfer Service** | Fuentes conocidas (Google Ads, S3, otros) a horario | Según la fuente |

:::errores
- **Autodetectar el esquema en producción.** Un archivo con un valor raro puede cambiar el tipo de una columna; en producción el esquema va explícito.
- **Cargar sin partición una tabla que va a crecer.** Particionarla después obliga a recrearla; decídelo al crearla.
- **Usar streaming cuando alcanza con lotes.** La carga por lotes es gratis; la escritura en streaming se paga y solo tiene sentido si necesitas los datos al instante.
:::

## ✅ Lo que lograste

- Creaste una tabla particionada desde un archivo.
- Revisaste el esquema detectado.
- Conoces las otras formas de cargar.

:::ejercicio quiz
¿Cuánto cuesta una carga por lotes en BigQuery?
- [ ] USD 6,25 por TiB
- [x] Nada: se paga el almacenamiento
- [ ] Una tarifa por archivo
- [ ] Lo mismo que consultar los bytes cargados
:::

:::ejercicio quiz
¿Qué hace Auto detect?
- [x] Deduce el esquema y los tipos mirando los datos del archivo
- [ ] Borra las filas malas
- [ ] Crea la partición sola
- [ ] Comprime el archivo
:::

:::ejercicio quiz
¿Qué es una tabla externa?
- [ ] Una tabla de otro proyecto
- [x] Una tabla que lee los archivos en Cloud Storage sin cargarlos a BigQuery
- [ ] Una vista
- [ ] Una tabla cargada en otra región
:::

:::ejercicio quiz
¿Por qué conviene un esquema explícito en producción?
- [ ] Porque autodetect cobra por cada archivo
- [x] Para que un archivo con datos raros falle en lugar de cambiar los tipos de la tabla
- [ ] Porque autodetect no existe
- [ ] Porque es más barato
:::
