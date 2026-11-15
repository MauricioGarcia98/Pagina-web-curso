---
titulo: Snowpipe, streams, tasks y dynamic tables - automatizar dentro de Snowflake
nivel: 6 · Avanzado completo
duracion: 45
resumen: Snowflake puede cargar, detectar cambios y transformar solo. Conoces Snowpipe (carga continua), streams (qué filas cambiaron), tasks (SQL programado), dynamic tables (tablas que se mantienen solas), Snowpark y el uso compartido de datos, con el SQL de cada uno y cuándo conviene frente a Airflow o dbt.
objetivos: Explicar Snowpipe y cuándo usarlo | Detectar cambios con un stream | Programar SQL con una task | Mantener una tabla con dynamic tables | Ubicar Snowpark, Cortex y Secure Data Sharing
prerrequisitos: snowflake-paso-a-paso-buenas-practicas
autoevaluacion: ¿Sabes en qué se diferencia Snowpipe de COPY INTO? | ¿Sabes qué devuelve un stream? | ¿Sabes qué hace TARGET_LAG? | ¿Sabes cuándo conviene Airflow en lugar de tasks?
---

:::nota En la práctica
Estas funciones no están simuladas: la práctica te muestra qué son. El SQL de esta lección es el de Snowflake real.
:::

```captura
archivo: snowflake/s22-tareas.webp
texto: Task History - las ejecuciones de las tasks programadas (no simulado en la práctica)
```

## Paso 1 — Snowpipe: carga continua

```sql norun
CREATE PIPE raw.pipe_pedidos AUTO_INGEST = TRUE AS
COPY INTO raw.pedidos_staging FROM @ventas_s3 FILE_FORMAT = (TYPE = CSV SKIP_HEADER = 1);
```

| COPY INTO | Snowpipe |
|---|---|
| Lo ejecutas tú (o un orquestador) con un warehouse | Se dispara solo cuando llega un archivo al bucket (por un evento de la nube) |
| Por lotes | Continuo, en minutos |
| Paga el warehouse | Cómputo serverless de Snowflake |

```captura
archivo: snowflake/s22-copy.webp
texto: Copy History - el historial de cargas archivo por archivo (no simulado en la práctica)
```

## Paso 2 — Streams y tasks

```sql norun
-- un stream registra qué filas se insertaron, actualizaron o borraron desde la última vez que se leyó
CREATE STREAM raw.cambios_pedidos ON TABLE raw.pedidos_staging;

-- una task ejecuta SQL con un horario; solo corre si el stream tiene datos
CREATE TASK analitica.aplicar_pedidos
  WAREHOUSE = analisis_wh
  SCHEDULE = '15 MINUTE'
  WHEN SYSTEM$STREAM_HAS_DATA('raw.cambios_pedidos')
AS
  MERGE INTO analitica.pedidos_actuales t
  USING raw.cambios_pedidos s ON t.pedido_id = s.pedido_id
  WHEN MATCHED THEN UPDATE SET total = s.total
  WHEN NOT MATCHED THEN INSERT (pedido_id, cliente_id, fecha, canal, total)
                        VALUES (s.pedido_id, s.cliente_id, s.fecha, s.canal, s.total);

ALTER TASK analitica.aplicar_pedidos RESUME;   -- las tasks se crean suspendidas
```

## Paso 3 — Dynamic tables

```sql norun
CREATE DYNAMIC TABLE analitica.ventas_diarias
  TARGET_LAG = '1 hour'
  WAREHOUSE = analisis_wh
AS
  SELECT fecha, canal, SUM(total) AS ventas
  FROM analitica.pedidos_actuales
  GROUP BY fecha, canal;
```

Declaras **qué** resultado quieres y **cuán atrasado** puede estar (`TARGET_LAG`); Snowflake se encarga de refrescarla, de forma incremental cuando puede. Reemplaza muchas combinaciones de stream + task.

## Paso 4 — Más de la plataforma

| Función | Qué es |
|---|---|
| **Snowpark** | Escribir transformaciones en Python, Java o Scala que corren dentro de Snowflake |
| **Cortex AI** | Funciones de IA en SQL (resumir, clasificar, traducir, búsqueda semántica) |
| **Secure Data Sharing** | Compartir tablas con otra cuenta **sin copiarlas**; la base del Marketplace |
| **Streamlit in Snowflake** | Apps de datos en Python dentro de la cuenta |

## Paso 5 — ¿Dentro de Snowflake o con un orquestador?

| Si… | Conviene |
|---|---|
| Todo el flujo es SQL dentro de Snowflake | Tasks o dynamic tables |
| El flujo mezcla Snowflake con APIs, otros sistemas o avisos | Un orquestador como [Airflow](#/m/airflow-paso-a-paso) |
| El equipo transforma con modelos versionados y pruebas | dbt (puede generar dynamic tables) |

## ✅ Lo que lograste

- Conoces Snowpipe, streams, tasks y dynamic tables.
- Ubicas Snowpark, Cortex y Data Sharing.
- Sabes cuándo usar un orquestador.

:::ejercicio quiz
¿En qué se diferencia Snowpipe de un COPY INTO programado?
- [ ] No hay diferencia
- [x] Snowpipe se dispara solo al llegar el archivo y usa cómputo serverless
- [ ] Snowpipe no carga CSV
- [ ] Snowpipe necesita ACCOUNTADMIN para cada archivo
:::

:::ejercicio quiz
¿Qué devuelve un stream?
- [x] Las filas que cambiaron en la tabla desde la última vez que se leyó
- [ ] Toda la tabla
- [ ] Un video
- [ ] El historial de consultas
:::

:::ejercicio quiz
¿Qué indica TARGET_LAG en una dynamic table?
- [ ] El tamaño del warehouse
- [x] Cuánto puede atrasarse la tabla respecto de sus fuentes
- [ ] Cuántas filas tiene
- [ ] Quién puede leerla
:::

:::ejercicio quiz
El flujo llama a una API, carga en Snowflake y avisa por Slack. ¿Qué conviene?
- [ ] Solo tasks
- [x] Un orquestador como Airflow
- [ ] Una dynamic table
- [ ] Un stream
:::
