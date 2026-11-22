---
titulo: Gold y exportación - las métricas de cada área y un job que las calcula
nivel: Intermedio
duracion: 45
resumen: Calculas en Databricks las tres tablas gold que pidió el negocio, las exportas como archivos al contenedor gold para que Snowflake y BigQuery las carguen, y empaquetas todo en un job con tareas SQL, que es lo que va a disparar Airflow todos los días.
objetivos: Construir tablas gold a partir de silver con el grano acordado | Unir con un maestro (estaciones) para agregar por barrio | Exportar resultados como archivos con INSERT OVERWRITE DIRECTORY | Crear un job de Databricks con tareas SQL encadenadas
prerrequisitos: proyecto-pedalia-bronze-y-silver-en-databricks
autoevaluacion: ¿Sabes cuál es el grano de cada tabla gold? | ¿Sabes por qué se exportan archivos en vez de dar acceso a Databricks? | ¿Sabes qué deja INSERT OVERWRITE DIRECTORY en el lago? | ¿Sabes qué pasa si una tarea del job falla?
---

:::escenario Miércoles, 10:00
Silver cierra. Lucía (finanzas) pregunta si ya puede ver algo. Todavía no: silver tiene un viaje por fila y ella quiere un número por día. Eso es gold.
:::

:::analogia La cocina y los platos
Silver son los ingredientes lavados y cortados. Gold son los platos servidos: cada área recibe el suyo, con la porción (el grano) que pidió. No se le da a cada comensal la bolsa de ingredientes para que cocine solo.
:::

## 1. El maestro de estaciones

Para agrupar por barrio necesitas saber en qué barrio está cada estación. Ese dato viene en `estaciones.json`, que subiste a landing. Agrega una ubicación externa de solo lectura para landing y carga el maestro:

```sql norun
CREATE EXTERNAL LOCATION lago_landing
URL 'abfss://landing@stpedaliadev.dfs.core.windows.net/'
WITH (STORAGE CREDENTIAL credencial_lago) READ ONLY;

CREATE OR REPLACE TABLE pedalia.silver.estaciones AS
SELECT CAST(estacion_id AS INT) AS estacion_id, nombre, barrio, CAST(capacidad AS INT) AS capacidad
FROM read_files('abfss://landing@stpedaliadev.dfs.core.windows.net/pedalia/estaciones', format => 'json');
```

## 2. Las tres tablas gold

Cada una con el grano que se acordó en la primera lección:

```sql norun
-- finanzas: un número por día y tipo de usuario
CREATE OR REPLACE TABLE pedalia.gold.ingresos_diarios AS
SELECT fecha, tipo_usuario, COUNT(*) AS viajes, SUM(monto) AS ingresos
FROM pedalia.silver.viajes
GROUP BY fecha, tipo_usuario;

-- marketing: un número por día y barrio de salida
CREATE OR REPLACE TABLE pedalia.gold.uso_por_barrio AS
SELECT v.fecha, e.barrio,
       COUNT(*) AS viajes,
       SUM(CASE WHEN v.tipo_usuario = 'pase_dia' THEN 1 ELSE 0 END) AS viajes_pase_dia
FROM pedalia.silver.viajes v
JOIN pedalia.silver.estaciones e ON e.estacion_id = v.estacion_origen
GROUP BY v.fecha, e.barrio;

-- operaciones: un número por día y estación de salida
CREATE OR REPLACE TABLE pedalia.gold.viajes_por_estacion AS
SELECT v.fecha, v.estacion_origen AS estacion_id, e.nombre, e.barrio,
       COUNT(*) AS viajes_salida,
       ROUND(AVG(v.minutos), 2) AS minutos_promedio,
       SUM(CASE WHEN v.fuera_de_estacion THEN 1 ELSE 0 END) AS fuera_de_estacion
FROM pedalia.silver.viajes v
JOIN pedalia.silver.estaciones e ON e.estacion_id = v.estacion_origen
GROUP BY v.fecha, v.estacion_origen, e.nombre, e.barrio;
```

Revisa los totales: la suma de `viajes` en las tres tablas tiene que ser la misma, e igual a las filas de silver. Si `uso_por_barrio` suma menos, hay viajes con una estación que no está en el maestro (el `JOIN` los dejó afuera).

## 3. Exportar gold para los otros sistemas

Snowflake y BigQuery no leen tablas de Databricks: leen **archivos**. El patrón más común es dejar cada tabla gold como archivos en una carpeta conocida del lago:

```sql norun
INSERT OVERWRITE DIRECTORY 'abfss://gold@stpedaliadev.dfs.core.windows.net/ingresos_diarios'
USING CSV OPTIONS ('header' = 'true')
SELECT * FROM pedalia.gold.ingresos_diarios;

INSERT OVERWRITE DIRECTORY 'abfss://gold@stpedaliadev.dfs.core.windows.net/uso_por_barrio'
USING CSV OPTIONS ('header' = 'true')
SELECT * FROM pedalia.gold.uso_por_barrio;
```

`OVERWRITE` reemplaza la carpeta completa: queda un archivo `part-00000-….csv` y un `_SUCCESS` vacío. Ese `_SUCCESS` es la señal, para quien lee, de que la escritura terminó entera. Míralo en el portal (contenedor `gold`) o con:

```bash
az storage blob list --account-name stpedaliadev -c gold -o table
```

:::nota ¿Por qué CSV y no Parquet?
En Databricks real exportarías Parquet: guarda los tipos, ocupa menos y lo leen Snowflake y BigQuery. En esta práctica la exportación es CSV para que puedas abrir el archivo y ver qué hay adentro. El patrón (carpeta por tabla + `_SUCCESS` + reemplazo completo) es el mismo.
:::

## 4. El job

Lo que acabas de correr a mano tiene que correr solo todos los días. En **Jobs & Pipelines → Create job**, nombre **`pedalia_transformar`**, con tres tareas de tipo **SQL** encadenadas:

| Tarea | Depende de | SQL |
|---|---|---|
| `bronze_y_silver` | — | crear `bronze.viajes`, `silver.estaciones`, `silver.viajes` y la cuarentena |
| `gold` | `bronze_y_silver` | las tres tablas gold |
| `exportar` | `gold` | los dos `INSERT OVERWRITE DIRECTORY` |

Pega en cada tarea el SQL correspondiente. Ejecuta el job con **Run now** y mira el gráfico de tareas: si `gold` falla, `exportar` no corre. Es lo mismo que va a pasar cuando lo dispare Airflow.

:::tip Recalcular todo o solo lo nuevo
Este job recalcula todo desde bronze en cada corrida (`CREATE OR REPLACE`). Con pocos días de datos es lo más simple y siempre da el mismo resultado: es **idempotente**. Cuando bronze tenga años, conviene procesar solo los días nuevos con `MERGE`. Anótalo en el README como el siguiente paso de escala.
:::

Guarda el SQL de gold y de la exportación en `sql/databricks/gold.sql` y súbelo con un PR.

:::errores
- **Mezclar granos en una tabla gold** (por ejemplo, filas por día y una fila de "total" en la misma tabla). Cualquier suma en Power BI lo cuenta dos veces.
- **JOIN que pierde filas sin avisar**: si el maestro no tiene una estación, el viaje desaparece de `uso_por_barrio`. Compara totales entre tablas.
- **Exportar sin `OVERWRITE`**: cada corrida agrega otro archivo y quien carga termina con los datos duplicados.
- **Leer la carpeta antes de que aparezca `_SUCCESS`**: un archivo a medio escribir se carga incompleto. Los procesos que leen deben esperar la marca.
:::

:::real En tu computadora y en la web real
En Databricks real, el job se crea en **Workflows → Jobs & Pipelines → Create job**: cada tarea es un notebook o un archivo SQL, con dependencias entre tareas, un horario (*Schedule*) y avisos por correo si falla (*Notifications*). La exportación a Parquet o CSV se escribe en un *external location* del lago, igual que acá.

Si trabajas con código versionado, define el job como **Declarative Automation Bundle** (`databricks bundle init`, `databricks bundle deploy`) y queda en el repositorio.
:::

:::capturas Capturas para tu portafolio
Guárdalas en `docs/capturas/` del repositorio del proyecto y úsalas en el README.

- `07-gold.png`: las tres tablas gold en el catálogo.
- `07-job.png`: el job con sus tareas encadenadas y la última ejecución en verde.

Antes de publicar, tapa con un rectángulo los correos, los IDs de suscripción y de tenant, los nombres de cuentas reales y cualquier clave o token.
:::

## Ejercicios

:::ejercicio quiz
¿Cuál es el grano de `gold.uso_por_barrio`?
- [ ] Un viaje por fila
- [x] Una fila por día y barrio de la estación de salida
- [ ] Una fila por barrio, con el total de todos los días
- [ ] Una fila por estación
:::

:::ejercicio quiz
La suma de `viajes` en `uso_por_barrio` es menor que las filas de `silver.viajes`. ¿Qué es lo más probable?
- [ ] Que `COUNT(*)` cuenta mal los NULL
- [x] Que hay viajes cuya estación de origen no está en el maestro de estaciones, y el JOIN los dejó afuera
- [ ] Que el CSV de exportación se cortó
- [ ] Que Databricks redondea los conteos
:::

:::ejercicio quiz
¿Para qué sirve el archivo `_SUCCESS` que deja la exportación?
- [ ] Guarda el resultado de las pruebas del job
- [ ] Contiene la cantidad de filas exportadas
- [x] Marca que la escritura terminó completa, para que nadie lea una carpeta a medio escribir
- [ ] Es un error de Databricks que se puede borrar
:::

## Resumen

- Gold = una tabla por necesidad de negocio, **con un grano claro**.
- Compara totales entre tablas para detectar **JOINs que pierden filas**.
- Los otros sistemas reciben **archivos en el lago**: una carpeta por tabla, reemplazo completo y marca `_SUCCESS`.
- Un **job** encadena las tareas; si una falla, las siguientes no corren.
