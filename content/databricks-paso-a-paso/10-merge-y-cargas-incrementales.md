---
titulo: MERGE y cargas incrementales - actualizar sin reescribir todo
nivel: 3 · Intermedio
duracion: 45
resumen: En producción las tablas no se reescriben enteras cada día - llegan cambios y se aplican. MERGE INTO para insertar lo nuevo y actualizar lo existente en una sola sentencia (upsert), COPY INTO para cargar solo los archivos que todavía no entraron, y los patrones para no duplicar filas - claves, idempotencia y qué pasa si una carga corre dos veces.
objetivos: Escribir un MERGE INTO con las tres ramas | Cargar archivos nuevos con COPY INTO | Explicar qué es idempotencia y por qué importa | Elegir entre overwrite, append, MERGE y COPY INTO | Verificar una carga incremental con el historial
prerrequisitos: databricks-paso-a-paso-tablas-delta-e-historial
autoevaluacion: ¿Sabes qué hace WHEN NOT MATCHED? | ¿Sabes por qué COPY INTO no duplica si lo corres dos veces? | ¿Sabes qué es un upsert? | ¿Sabes cuándo conviene overwrite?
---

:::analogia En palabras simples
Actualizar una agenda de contactos: no la copias entera cada vez que alguien cambia de teléfono. Buscas la persona; si está, corriges el número; si no está, la agregas. Eso, en una sola operación, es un **MERGE**. Y si cada día te llega una hoja nueva de contactos, **COPY INTO** carga las hojas que todavía no pasaste, sin repetir las de ayer.
:::

## Paso 1 — El problema

Tienes `main.default.productos_precio` con 20 productos y te llegan precios nuevos para 5 (y podría venir alguno nuevo). Opciones:

| Opción | Problema |
|---|---|
| Reescribir la tabla con `overwrite` | Funciona con 20 filas; con 200 millones, no |
| `INSERT` de los 5 | Quedan duplicados: el precio viejo y el nuevo |
| `UPDATE` + `INSERT` por separado | Dos pasos, y entre uno y otro la tabla está a medias |
| **`MERGE`** | Un solo paso, atómico |

## Paso 2 — MERGE INTO

```sql norun
CREATE OR REPLACE TABLE main.default.productos_precio AS
SELECT producto_id, nombre, precio FROM samples.tienda.productos LIMIT 20;

MERGE INTO main.default.productos_precio AS destino
USING (
  SELECT producto_id, nombre, precio * 1.10 AS precio FROM samples.tienda.productos LIMIT 5
) AS origen
ON destino.producto_id = origen.producto_id
WHEN MATCHED THEN UPDATE SET precio = origen.precio
WHEN NOT MATCHED THEN INSERT *;
```

```captura
archivo: databricks/d10-merge.webp
texto: El MERGE (1) y su resultado (2) - cuántas filas se actualizaron, insertaron y borraron
```

| Parte | Significa |
|---|---|
| `MERGE INTO destino USING origen ON clave` | La tabla que cambia, de dónde vienen los cambios y cómo se emparejan |
| `WHEN MATCHED THEN UPDATE` | La fila existe: actualizar |
| `WHEN NOT MATCHED THEN INSERT` | No existe: insertar |
| `WHEN NOT MATCHED BY SOURCE THEN DELETE` | Existe en destino pero ya no en origen: borrar (opcional) |

Las condiciones admiten filtros: `WHEN MATCHED AND origen.precio <> destino.precio THEN UPDATE …` actualiza solo lo que cambió.

:::cuidado La clave tiene que ser única en el origen
Si el origen trae dos filas con el mismo `producto_id`, el `MERGE` falla ("multiple source rows matched"). Antes de un `MERGE`, deduplica el origen (`QUALIFY ROW_NUMBER() OVER (PARTITION BY producto_id ORDER BY fecha DESC) = 1`).
:::

## Paso 3 — COPY INTO: solo los archivos nuevos

Para archivos que van llegando a un volumen:

```sql norun
CREATE TABLE IF NOT EXISTS main.default.devoluciones_raw
  (pedido_id INT, fecha DATE, categoria STRING, canal STRING, motivo STRING, monto DOUBLE);

COPY INTO main.default.devoluciones_raw
FROM '/Volumes/main/default/raw/devoluciones.csv'
FILEFORMAT = CSV
FORMAT_OPTIONS ('header' = 'true', 'inferSchema' = 'true');
```

```captura
archivo: databricks/d10-copy-into-1.webp
texto: La primera vez carga las 12 filas del archivo
```

```captura
archivo: databricks/d10-copy-into.webp
texto: La segunda vez, 0 filas - el archivo ya estaba cargado
```

`COPY INTO` recuerda qué archivos ya procesó: puedes correrlo todos los días sobre la misma carpeta (`FROM '/Volumes/main/default/raw/'`) y solo entran los archivos nuevos.

## Paso 4 — Idempotencia

Una carga es **idempotente** si correrla dos veces deja el mismo resultado que correrla una. Importa porque en producción las cosas se reintentan: un job falla a la mitad y vuelve a correr, alguien lo lanza de nuevo "por las dudas".

| Operación | ¿Idempotente? |
|---|---|
| `INSERT INTO` / `append` | **No**: duplica |
| `overwrite` | Sí (reescribe todo) |
| `MERGE` por clave | Sí |
| `COPY INTO` | Sí (por archivo) |
| Pipeline con tabla de streaming | Sí (nivel 4) |

## Paso 5 — Cuál usar

| Situación | Usa |
|---|---|
| Tabla chica que se recalcula entera | `overwrite` |
| Llegan cambios de filas existentes y filas nuevas | `MERGE` |
| Llegan archivos nuevos a una carpeta | `COPY INTO` (o un pipeline) |
| Solo se agregan eventos que nunca cambian, con control de duplicados aguas arriba | `append` |

Verifícalo siempre con el historial: `DESCRIBE HISTORY` muestra en `operationMetrics` cuántas filas insertó, actualizó o borró cada operación.

## ✅ Lo que lograste

- Escribes un `MERGE` con sus ramas.
- Cargas archivos nuevos con `COPY INTO` sin duplicar.
- Eliges la operación según el caso y entiendes la idempotencia.

:::ejercicio quiz
¿Qué hace WHEN NOT MATCHED THEN INSERT * en un MERGE?
- [ ] Borra las filas que no coinciden
- [x] Inserta en el destino las filas del origen que no existían
- [ ] Actualiza todas las filas
- [ ] Nada
:::

:::ejercicio quiz
Corres COPY INTO dos veces sobre la misma carpeta sin archivos nuevos. ¿Qué pasa la segunda vez?
- [ ] Duplica todas las filas
- [x] No carga nada: ya procesó esos archivos
- [ ] Da error
- [ ] Borra la tabla
:::

:::ejercicio quiz
Un job de carga con INSERT INTO falló a la mitad y lo relanzaron. ¿Qué riesgo hay?
- [ ] Ninguno
- [x] Filas duplicadas: INSERT INTO no es idempotente
- [ ] Que se borre la tabla
- [ ] Que cambie el esquema
:::

:::ejercicio quiz
El origen del MERGE trae dos filas con la misma clave. ¿Qué pasa?
- [ ] Toma la primera
- [x] El MERGE falla: hay que deduplicar el origen antes
- [ ] Inserta las dos
- [ ] Toma la última
:::
