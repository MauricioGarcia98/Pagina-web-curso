---
titulo: Snowpipe, streams, tasks y dynamic tables - automatizar dentro de Snowflake
nivel: 6 · Avanzado completo
duracion: 45
resumen: Snowflake puede cargar, detectar cambios y transformar solo. Conoces Snowpipe (carga continua), streams (qué filas cambiaron), tasks (SQL programado), dynamic tables (tablas que se mantienen solas), Snowpark y el uso compartido de datos, con el SQL de cada uno y cuándo conviene frente a Airflow o dbt.
objetivos: Explicar Snowpipe y cuándo usarlo | Detectar cambios con un stream | Programar SQL con una task | Mantener una tabla con dynamic tables | Ubicar Snowpark, Cortex y Secure Data Sharing
prerrequisitos: snowflake-paso-a-paso-buenas-practicas
autoevaluacion: ¿Sabes en qué se diferencia Snowpipe de COPY INTO? | ¿Sabes qué devuelve un stream? | ¿Sabes qué hace TARGET_LAG? | ¿Sabes cuándo conviene Airflow en lugar de tasks?
---

:::tip Practícalo mientras lees
Todo lo de esta lección corre en el [Snowflake de práctica](#/snowflake): streams, tasks (con su historial en **Monitoring → Task History**), Snowpipe (en **Copy History**) y dynamic tables. El SQL es el de Snowflake real; solo cambian los nombres de las bases.
:::

```captura
archivo: snowflake/s22-tareas.webp
texto: Task History - el árbol de tareas (la raíz con su horario CRON y su hija con AFTER), su última corrida y la próxima
```

:::analogia Una línea de producción automática
Snowpipe es la cinta que recibe cada archivo apenas llega; un stream es el cuaderno donde se anota qué filas cambiaron; una task es el reloj que corre un SQL a horario; una dynamic table es una tabla que se mantiene sola a partir de una consulta. Juntas arman una línea que funciona sin que nadie apriete botones.
:::

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
texto: Copy History - el historial de cargas archivo por archivo: filas, stage y el primer error si falló
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

Tres cosas del Snowflake real que la práctica también exige, y que confunden la primera vez:

| Te aparece… | Por qué | Qué haces |
|---|---|---|
| `Cannot execute task, EXECUTE TASK privilege must be granted to owner role` | Para que una task corra sola, el rol dueño necesita un privilegio de la cuenta | `USE ROLE ACCOUNTADMIN; GRANT EXECUTE TASK ON ACCOUNT TO ROLE SYSADMIN;` |
| `Unable to update graph with root task … since that root task is not suspended` | No se puede cambiar un árbol de tareas mientras corre | `ALTER TASK raiz SUSPEND;`, el cambio, y `RESUME` de nuevo (primero las hijas, después la raíz) |
| La task corre pero no hace nada (`SKIPPED`) | Su `WHEN SYSTEM$STREAM_HAS_DATA(...)` dio falso: no había cambios nuevos | Es lo esperado: no gasta warehouse cuando no hay nada que procesar |

Una lectura del stream (`SELECT * FROM cambios_pedidos`) **no** lo vacía: solo lo consume un DML que lo use (el `MERGE` de la task). Cada fila trae `METADATA$ACTION` (INSERT o DELETE) y `METADATA$ISUPDATE`.

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

Declaras **qué** resultado quieres y **cuán atrasado** puede estar (`TARGET_LAG`); Snowflake se encarga de refrescarla, de forma incremental cuando puede. Reemplaza muchas combinaciones de stream + task. No admite `INSERT` ni `UPDATE` (la mantiene Snowflake) y su historial de refrescos está en **Task History → Dynamic Tables**.

:::practica snowflake CDC de punta a punta: stream, task, Snowpipe y dynamic table
1. Crea un stage y una tabla de llegada, y un pipe con `AUTO_INGEST = TRUE` que haga el `COPY INTO`. Sube un CSV al stage (Databases → el stage → **+ Files**) y ejecuta cualquier consulta: el pipe lo carga solo. Míralo en **Copy History**.
2. `CREATE STREAM cambios ON TABLE llegada;` y comprueba que `SELECT * FROM cambios` está vacío. Sube otro archivo: ahora el stream muestra las filas nuevas con `METADATA$ACTION = 'INSERT'`.
3. Crea una task con `WHEN SYSTEM$STREAM_HAS_DATA('cambios')` que haga `INSERT INTO historico SELECT … FROM cambios`. Dale `EXECUTE TASK` al rol dueño, haz `RESUME` y córrela con `EXECUTE TASK`.
4. En **Task History → Task Runs** verás un `SUCCEEDED`; córrela otra vez sin cambios nuevos y verás `SKIPPED`.
5. Crea una dynamic table con `TARGET_LAG = '1 minute'` sobre `historico` y prueba un `INSERT` en ella: el error te dice por qué no se puede.
:::

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

:::errores
- **Leer un stream y no consumirlo en una transacción DML.** El stream avanza solo cuando sus filas se usan en un INSERT, MERGE u otra escritura que confirma.
- **Tasks que quedan suspendidas.** Una task recién creada está suspendida; hay que hacer `ALTER TASK ... RESUME`.
- **Orquestar dentro de Snowflake lo que depende de sistemas externos.** Si hay APIs, avisos o pasos en otros servicios, conviene un orquestador.
:::

## ✅ Lo que lograste

- Conoces Snowpipe, streams, tasks y dynamic tables.
- Ubicas Snowpark, Cortex y Data Sharing.
- Sabes cuándo usar un orquestador.

:::ejercicio quiz
¿En qué se diferencia Snowpipe de un COPY INTO programado?
- [ ] Snowpipe carga solo archivos JSON
- [x] Snowpipe se dispara solo al llegar el archivo y usa cómputo serverless
- [ ] Snowpipe no carga CSV
- [ ] Snowpipe necesita ACCOUNTADMIN para cada archivo
:::

:::ejercicio quiz
¿Qué devuelve un stream?
- [x] Las filas que cambiaron en la tabla desde la última vez que se leyó
- [ ] Toda la tabla
- [ ] Las consultas que se ejecutaron sobre la tabla
- [ ] El historial de consultas
:::

:::ejercicio quiz
¿Qué indica TARGET_LAG en una dynamic table?
- [ ] El tamaño del warehouse
- [x] Cuánto puede atrasarse la tabla respecto de sus fuentes
- [ ] Cada cuántos minutos se borra la tabla
- [ ] Quién puede leerla
:::

:::ejercicio quiz
El flujo llama a una API, carga en Snowflake y avisa por Slack. ¿Qué conviene?
- [ ] Solo tasks, encadenadas con AFTER
- [x] Un orquestador como Airflow
- [ ] Una dynamic table
- [ ] Un stream
:::
