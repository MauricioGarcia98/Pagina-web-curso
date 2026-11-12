---
titulo: Proyecto integrador - un mismo dato cruzando Airflow, Databricks, Snowflake, Fabric y Power BI
nivel: Avanzado
duracion: 75
resumen: Proyecto guiado que conecta las herramientas de práctica entre sí, como en un equipo real - Airflow dispara un job de Databricks que construye una tabla gold, Snowflake carga un archivo con COPY INTO, Fabric guarda una tabla en un lakehouse y Power BI importa las tres fuentes en un mismo modelo. Incluye qué revisar en cada herramienta cuando algo falla.
objetivos: Orquestar un job de Databricks desde un DAG de Airflow usando una conexión | Seguir una corrida de punta a punta, del log de Airflow a la corrida del job | Importar en Power BI tablas de Snowflake, Databricks y Fabric | Saber en qué herramienta buscar cuando un paso de la cadena falla | Explicar por qué cada herramienta ocupa su lugar en la arquitectura
prerrequisitos: interfaces-airflow-por-dentro | interfaces-databricks-por-dentro | interfaces-snowflake-por-dentro
autoevaluacion: ¿Sabes qué necesita Airflow para hablar con Databricks? | ¿Sabes dónde ver por qué falló un job que disparó Airflow? | ¿Sabes qué diferencia hay entre importar y consultar en directo desde Power BI? | ¿Sabes qué consulta ejecuta Power BI en Snowflake al importar una tabla? | ¿Sabes por qué el orquestador no debería transformar los datos él mismo?
---

:::tip Cómo trabajar este proyecto
Abre cada herramienta en una pestaña del navegador: [Airflow](#/airflow), [Databricks](#/databricks), [Snowflake](#/snowflake), [Fabric](#/fabric) y [Power BI](#/powerbi). Todas comparten el mismo navegador: lo que haces en una lo ve la otra. Los **🎯 Retos** de Databricks y Snowflake tienen un nivel "Con otras herramientas" que se marca solo cuando completas cada conexión.
:::

:::analogia En palabras simples
Hasta ahora practicaste cada herramienta por separado, como quien aprende a usar el horno, la heladera y la balanza. En una cocina de verdad se usan juntas: alguien decide el orden (el orquestador), alguien cocina (el motor de cómputo), alguien guarda (el warehouse) y alguien sirve el plato (el tablero). Este proyecto es cocinar un plato entero.
:::

## Qué vas a construir

Tienda Andina quiere un tablero con las ventas por canal y por país, actualizado cada mañana. El equipo se reparte así:

| Pieza | Herramienta | Qué hace |
|---|---|---|
| Orquestación | **Airflow** | Decide cuándo corre cada cosa y avisa si algo falla |
| Transformación | **Databricks** | Un job construye la tabla gold `ventas_por_canal` |
| Warehouse | **Snowflake** | Guarda `ventas_pais`, cargada con `COPY INTO` o creada con SQL |
| Lakehouse | **Fabric** | Guarda una tabla de clientes en un lakehouse |
| Tablero | **Power BI** | Importa las tres fuentes y arma el informe |

En una empresa real no se suelen usar Databricks, Snowflake y Fabric a la vez para lo mismo: se elige una plataforma. Aquí están las tres para que practiques cómo se conecta Power BI a cada una.

## Paso 1 · El job en Databricks

Un **job** es una tarea programable de Databricks. Este crea la tabla gold a partir de los pedidos de muestra.

Abre la terminal (la de [Airflow](#/airflow) sirve: botón **Terminal**) y crea el job con la CLI:

```bash
databricks jobs create --json '{"name":"carga_gold","tasks":[{"task_key":"construir","sql_task":{"query":{"query_text":"CREATE OR REPLACE TABLE main.default.ventas_por_canal AS SELECT canal, COUNT(*) AS pedidos FROM samples.tienda.pedidos GROUP BY canal"}}}]}'
```

La respuesta trae el **`job_id`**: anótalo. También lo ves en [Databricks](#/databricks) → **Jobs & Pipelines** → el job → *Job details*.

> En Databricks real, una tarea SQL apunta a una consulta guardada o a un archivo `.sql` del repositorio, y necesita un SQL warehouse. La réplica acepta el texto de la consulta para que el ejemplo sea corto.

## Paso 2 · La conexión en Airflow

Airflow no guarda direcciones ni tokens en el código del DAG: usa **conexiones**. El operador de Databricks busca por defecto una llamada `databricks_default`.

```bash
airflow connections add databricks_default --conn-type databricks --conn-host https://adb-1234567890123456.7.azuredatabricks.net
```

(O en la interfaz: **Admin → Connections → +**.) En un entorno real, la conexión lleva además un token o, mejor, un service principal.

## Paso 3 · El DAG que orquesta

Crea el archivo `~/airflow/dags/orquesta_gold.py` (con `nano` o `vim`) y reemplaza `123` por tu `job_id`:

```python norun
from datetime import datetime

from airflow.sdk import DAG
from airflow.providers.databricks.operators.databricks import DatabricksRunNowOperator
from airflow.providers.standard.operators.empty import EmptyOperator

with DAG(
    dag_id="orquesta_gold",
    schedule="0 6 * * *",          # todos los días a las 6:00
    start_date=datetime(2026, 1, 1),
    catchup=False,
    tags=["tienda", "gold"],
):
    construir = DatabricksRunNowOperator(task_id="construir_gold", job_id=123)
    avisar = EmptyOperator(task_id="avisar_al_equipo")

    construir >> avisar
```

En [Airflow](#/airflow) → **Dags**, despausa `orquesta_gold` y pulsa **Trigger**. Mira la **Grid**: `construir_gold` pasa a verde y después `avisar_al_equipo`.

Ahora sigue la corrida al otro lado:

- En el **log** de `construir_gold` verás `Run submitted with run_id: …` y el estado final del job.
- En [Databricks](#/databricks) → **Jobs & Pipelines** → `carga_gold` → **Runs**, la corrida aparece con *trigger* **API**: la disparó Airflow, no una persona.
- En **Catalog** → `main` → `default` está la tabla `ventas_por_canal`.

Fíjate que Airflow **no movió ni un dato**: solo le pidió a Databricks que hiciera el trabajo y esperó el resultado. Esa es la regla del orquestador.

### Rómpelo a propósito

Cambia el `job_id` del DAG por uno que no existe y dispara otra vez. La tarea falla con `Job 999 does not exist`, y `avisar_al_equipo` queda en naranja (`upstream_failed`). Corrige el archivo y usa **Clear** sobre la tarea para volver a correr solo desde ahí.

## Paso 4 · Una tabla en Snowflake

En [Snowflake](#/snowflake), abre una hoja y ejecuta:

```sql norun
CREATE DATABASE analitica;
CREATE SCHEMA gold;

CREATE TABLE ventas_pais AS
SELECT c.pais, COUNT(DISTINCT p.pedido_id) AS pedidos
FROM tienda_andina.public.pedidos p
JOIN tienda_andina.public.clientes c ON c.cliente_id = p.cliente_id
GROUP BY c.pais;
```

Si quieres practicar la carga de archivos, crea un stage, agrega los archivos de ejemplo y usa `COPY INTO` como en la lección de Snowflake.

## Paso 5 · Una tabla en Fabric

En [Fabric](#/fabric): crea un workspace, dentro un **lakehouse** (`lh_ventas`), sube o genera un archivo en **Files** y conviértelo con **Load to Tables**. Con eso ya hay una tabla Delta en OneLake.

## Paso 6 · Power BI junta todo

En [Power BI](#/powerbi) → **Obtener datos**:

1. **Azure Databricks** → acepta el host y la ruta HTTP → marca `default.ventas_por_canal` → **Cargar**.
2. **Snowflake** → servidor, warehouse y base `ANALITICA` → marca `GOLD.VENTAS_PAIS` → **Cargar**.
3. **Lakehouses y warehouses de Fabric** → marca tu tabla → **Cargar**.

Arma un gráfico de columnas con `canal` y `pedidos`, y otro con `pais` y `pedidos`.

Dos cosas para observar:

- En **Transformar datos**, el primer paso de cada consulta (*Origen*) muestra el conector que se usó: `Snowflake.Databases(...)`, `Databricks.Catalogs(...)` o `Lakehouse.Contents(...)`.
- En Snowflake → **Query History** aparece el `SELECT * FROM ANALITICA.GOLD.VENTAS_PAIS` que hizo Power BI, con el warehouse que usó. **Importar** copia los datos al modelo: cada actualización es una consulta que consume créditos. La alternativa, **DirectQuery**, no copia nada pero consulta en cada clic del informe.

## Cuando algo falla: dónde mirar

| Síntoma | Dónde empezar |
|---|---|
| El tablero muestra datos viejos | Power BI: ¿se actualizó el modelo? Después, ¿corrió el DAG? |
| La tarea de Airflow está en rojo | El **log** del último intento: dice si falló la conexión, el job no existe o el job terminó mal |
| El job terminó en `FAILED` | Databricks → la corrida → la tarea que falló y su error |
| Power BI no puede importar de Snowflake | ¿Existe el warehouse? ¿El rol tiene permisos? Query History muestra el error exacto |
| Las tareas siguientes quedaron en naranja | No fallaron: no corrieron porque falló una anterior (`upstream_failed`) |

La idea que se repite: **cada herramienta deja su propio registro**, y se sigue la cadena de atrás hacia adelante hasta el primer eslabón que falló.

:::ejercicio quiz
Tu DAG usa `DatabricksRunNowOperator` y la tarea falla con *The conn_id `databricks_default` isn't defined*. ¿Qué falta?
- [ ] Instalar Spark en el worker de Airflow
- [x] Crear la conexión `databricks_default` en Admin → Connections (o con `airflow connections add`)
- [ ] Cambiar el `schedule` del DAG
- [ ] Subir el job a GitHub
:::

:::ejercicio quiz
La tarea de Airflow está en rojo y el log dice que el job terminó con `result_state: FAILED`. ¿Dónde está el detalle del error?
- [ ] En Admin → Variables de Airflow
- [ ] En Power BI
- [x] En Databricks: Jobs & Pipelines → el job → la corrida que disparó Airflow → la tarea que falló
- [ ] En Query History de Snowflake
:::

:::ejercicio quiz
¿Por qué se dice que el orquestador "no debe transformar datos"?
- [ ] Porque Airflow no sabe ejecutar Python
- [x] Porque su trabajo es decidir el orden y vigilar; el trabajo pesado lo hace el motor (Databricks, Snowflake), que escala y deja su propio registro
- [ ] Porque está prohibido por la licencia
- [ ] Porque así el DAG tiene menos tareas
:::

:::ejercicio quiz
Importaste en Power BI una tabla de Snowflake. Una hora después, la tabla cambia en Snowflake. ¿Qué ve el informe?
- [ ] Los datos nuevos al instante
- [x] Los datos del momento de la importación, hasta que se actualice el modelo
- [ ] Un error de conexión
- [ ] Una tabla vacía
:::

:::ejercicio quiz
En el DAG, `construir_gold` falla y `avisar_al_equipo` queda en `upstream_failed`. Corriges el problema. ¿Qué haces?
- [ ] Borro el DAG y lo creo de nuevo
- [ ] Marco las dos tareas como success
- [x] **Clear** sobre `construir_gold` con *downstream*: vuelve a correr esa y las que dependen de ella
- [ ] Espero al día siguiente
:::

:::ejercicio quiz
En Snowflake → Query History aparece un `SELECT * FROM ANALITICA.GOLD.VENTAS_PAIS` que no escribiste. ¿De dónde salió?
- [ ] Es un error de la réplica
- [x] Lo ejecutó Power BI al importar la tabla, usando el warehouse que elegiste
- [ ] Lo ejecutó Airflow
- [ ] Snowflake lo corre solo cada hora
:::
