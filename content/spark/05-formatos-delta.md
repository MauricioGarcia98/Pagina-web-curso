---
titulo: Formatos, Delta Lake y arquitectura medallón
nivel: Intermedio
duracion: 35
resumen: CSV vs Parquet, particionado en disco, Delta Lake (ACID, time travel, MERGE) y bronze/silver/gold.
---

## Formatos de archivo en el lake

| Formato | Tipo | Esquema | Compresión | Lectura selectiva | Uso típico |
|---|---|---|---|---|---|
| CSV | Texto, filas | No (todo texto) | Mala | No | Intercambio, ingestas simples |
| JSON | Texto, anidado | Inferido | Mala | No | APIs, eventos |
| Avro | Binario, filas | Sí | Buena | No | Streaming, Kafka |
| **Parquet** | Binario, **columnar** | Sí | Excelente | **Sí** (columnas y min/max) | Analítica |
| **Delta** | Parquet + log de transacciones | Sí (+ evolución) | Excelente | Sí + data skipping | **Estándar en Databricks** |

## Particionado en disco

Al escribir puedes **particionar por una columna**: Spark crea una carpeta por valor.

```python norun
(df.write
   .mode("overwrite")
   .partitionBy("anio", "mes")
   .parquet("/lake/silver/pedidos"))
```

```text
/lake/silver/pedidos/anio=2024/mes=1/part-0000.parquet
/lake/silver/pedidos/anio=2024/mes=2/part-0000.parquet
...
```

Un filtro `WHERE anio = 2024 AND mes = 2` lee **solo esa carpeta** (*partition pruning*).

:::cuidado No particiones de más
Particionar por una columna con muchos valores (por ejemplo `cliente_id`) genera millones de archivos diminutos: el famoso **problema de los archivos pequeños**, que hace todo lentísimo. Regla: particiona por columnas de baja cardinalidad (fecha, país) y solo si cada partición tendrá al menos ~1 GB. En Delta moderno, prefiere **Liquid Clustering**.
:::

## Delta Lake

Un data lake de Parquet “pelado” tiene problemas: si un job falla a la mitad quedan archivos a medias; no puedes hacer `UPDATE` o `DELETE` fácilmente; dos procesos que escriben a la vez se pisan. **Delta Lake** lo resuelve agregando un **registro de transacciones** (`_delta_log/`) junto a los archivos Parquet:

- **ACID**: cada escritura es atómica; los lectores nunca ven datos a medias.
- **UPDATE, DELETE y MERGE** (upserts).
- **Time travel**: consultar versiones anteriores.
- **Schema enforcement y evolution**: rechaza datos con un esquema incorrecto, o lo evoluciona si lo permites.
- **OPTIMIZE / Z-ORDER / Liquid Clustering** para compactar archivos y acelerar filtros.
- Lectura y escritura **batch y streaming** sobre la misma tabla.

```sql norun
-- Upsert de cambios en la tabla de clientes
MERGE INTO silver.clientes AS t
USING bronze.clientes_cambios AS s
ON t.cliente_id = s.cliente_id
WHEN MATCHED AND s.operacion = 'DELETE' THEN DELETE
WHEN MATCHED THEN UPDATE SET *
WHEN NOT MATCHED THEN INSERT *;

-- Historial y time travel
DESCRIBE HISTORY silver.clientes;
SELECT * FROM silver.clientes VERSION AS OF 3;
RESTORE TABLE silver.clientes TO VERSION AS OF 3;

-- Mantenimiento
OPTIMIZE silver.clientes ZORDER BY (pais);
VACUUM silver.clientes RETAIN 168 HOURS;
```

## Arquitectura medallón (bronze, silver, gold)

La forma estándar de organizar un lakehouse en capas de calidad creciente:

| Capa | Contenido | Ejemplo |
|---|---|---|
| 🥉 **Bronze** | Datos **crudos**, tal como llegan, más metadatos de ingesta (fecha de carga, archivo de origen). Append-only. | JSON de la API de pedidos |
| 🥈 **Silver** | Datos **limpios y conformados**: tipos correctos, deduplicados, validados, unidos con referencias. | `pedidos`, `clientes` limpios |
| 🥇 **Gold** | Datos **listos para el negocio**: agregados, métricas, esquema estrella para BI y ML. | `ventas_diarias_por_pais`, `dim_cliente` |

:::tip Por qué conservar bronze
Si mañana descubres un error en la limpieza, puedes **reprocesar** silver y gold desde bronze sin volver a pedir los datos al origen (que quizá ya no existan).
:::

:::ejercicio quiz
¿Qué agrega Delta Lake sobre archivos Parquet?

- [ ] Una interfaz gráfica
- [x] Un registro de transacciones que permite ACID, MERGE, time travel y evolución de esquema
- [ ] Compresión de imágenes
- [ ] Convertir los archivos a CSV
:::

:::ejercicio quiz
¿En qué capa guardarías la tabla `ventas_mensuales_por_categoria` que consume el tablero de la gerencia?

- [ ] Bronze
- [ ] Silver
- [x] Gold
- [ ] En ninguna: se calcula a mano en Excel
:::

:::ejercicio quiz
Quieres particionar una tabla de 50 GB de eventos. ¿Qué columna es mejor candidata?

- [ ] `evento_id` (único por fila)
- [ ] `usuario_id` (2 millones de valores)
- [x] `fecha` (365 valores por año)
- [ ] `timestamp` con segundos
:::
