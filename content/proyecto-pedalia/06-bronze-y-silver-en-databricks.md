---
titulo: Bronze y silver en Databricks - leer el lago y aplicar el contrato
nivel: Intermedio
duracion: 55
resumen: Conectas Databricks al lago con una ubicación externa de Unity Catalog, lees los archivos de bronze con read_files y escribes la tabla silver de viajes aplicando cada regla del contrato - tipos, duplicados, viajes en curso, errores de reloj y bicis fuera de estación - y compruebas que la cuenta de control cierra.
objetivos: Crear una ubicación externa con una credencial de almacenamiento | Leer archivos del lago con read_files sin inferir tipos | Convertir texto a fechas con un formato explícito | Deduplicar con ROW_NUMBER y aplicar el contrato con reglas verificables | Comprobar que la cuenta de control cierra
prerrequisitos: proyecto-pedalia-ingesta-con-data-factory | interfaces-databricks-por-dentro
autoevaluacion: ¿Sabes qué es una ubicación externa y qué la autoriza? | ¿Sabes por qué en bronze todo se lee como texto? | ¿Sabes deduplicar con ROW_NUMBER? | ¿Sabes qué pasa con to_timestamp si una fecha no cumple el formato?
---

:::escenario Martes, 15:00
Los archivos ya están en bronze. Es hora de convertirlos en una tabla en la que finanzas pueda confiar. Antes de escribir una sola línea, abres `docs/contrato.md` en otra pestaña: cada regla de ese documento tiene que convertirse en una línea de SQL.
:::

:::analogia El colador con etiquetas
Silver es un colador, pero uno que no tira nada sin anotarlo. Lo repetido se aparta, lo que no terminó espera, lo imposible va a una caja de "revisar". Al final pesas lo que entró y lo que salió por cada agujero: si no suma, el colador tiene un agujero que no conocías.
:::

## 1. Conectar Databricks al lago

En Unity Catalog, para leer `abfss://…` hace falta una **ubicación externa** (external location): un permiso que dice "esta carpeta del lago se puede usar desde Databricks, con esta credencial". La credencial del workspace es la identidad del **Access Connector**, a la que ya le diste el rol en la cuenta.

Abre el [Databricks de práctica](#/databricks) → **SQL Editor** y ejecuta:

```sql norun
SHOW STORAGE CREDENTIALS;

CREATE EXTERNAL LOCATION lago_bronze
URL 'abfss://bronze@stpedaliadev.dfs.core.windows.net/'
WITH (STORAGE CREDENTIAL credencial_lago)
COMMENT 'Capa bronze de Pedalia';

CREATE EXTERNAL LOCATION lago_gold
URL 'abfss://gold@stpedaliadev.dfs.core.windows.net/'
WITH (STORAGE CREDENTIAL credencial_lago)
COMMENT 'Exportaciones gold para otros sistemas';
```

Prueba que puedes listar los archivos:

```sql norun
LIST 'abfss://bronze@stpedaliadev.dfs.core.windows.net/pedalia/viajes';
```

:::cuidado Si te da 403
*AuthorizationPermissionMismatch* quiere decir que la ubicación externa existe pero la identidad `unity-catalog-access-connector` no tiene un rol de datos en la cuenta. Es exactamente lo que pasa en Azure real cuando alguien olvida el paso de IAM. Vuelve a la lección del lago y asigna **Storage Blob Data Contributor**.
:::

## 2. El catálogo del proyecto

```sql norun
CREATE CATALOG IF NOT EXISTS pedalia;
CREATE SCHEMA IF NOT EXISTS pedalia.bronze;
CREATE SCHEMA IF NOT EXISTS pedalia.silver;
CREATE SCHEMA IF NOT EXISTS pedalia.gold;
```

## 3. Bronze: leer sin interpretar

En bronze **todo es texto**. Si dejas que Databricks adivine los tipos y un día llega `"N/A"` en una columna numérica, la lectura falla o, peor, convierte en silencio. Con `inferSchema => 'false'` guardas exactamente lo que vino:

```sql norun
CREATE OR REPLACE TABLE pedalia.bronze.viajes AS
SELECT *
FROM read_files(
  'abfss://bronze@stpedaliadev.dfs.core.windows.net/pedalia/viajes',
  format => 'csv', header => true, inferSchema => 'false'
);

SELECT COUNT(*) AS filas, COUNT(DISTINCT viaje_id) AS viajes FROM pedalia.bronze.viajes;
```

Compara con lo que anotaste en la terminal: `filas` tiene que ser igual a las líneas del archivo menos el encabezado.

## 4. Silver: el contrato en SQL

Una consulta, tres pasos con nombre (CTE). Cada paso corresponde a una parte del contrato:

```sql norun
CREATE OR REPLACE TABLE pedalia.silver.viajes AS
WITH tipado AS (
  -- 1. tipos: el formato de fecha va explícito, tal como dice el contrato
  SELECT
    CAST(viaje_id AS BIGINT)           AS viaje_id,
    bici_id,
    CAST(estacion_origen AS INT)       AS estacion_origen,
    CAST(estacion_destino AS INT)      AS estacion_destino,
    to_timestamp(inicio, 'yyyy-MM-dd HH:mm:ss') AS inicio,
    to_timestamp(fin, 'yyyy-MM-dd HH:mm:ss')    AS fin,
    tipo_usuario,
    CAST(monto AS DECIMAL(10,2))       AS monto
  FROM pedalia.bronze.viajes
),
numerados AS (
  -- 2. una fila por viaje: las repetidas tienen el mismo viaje_id
  SELECT *, ROW_NUMBER() OVER (PARTITION BY viaje_id ORDER BY inicio) AS rn
  FROM tipado
)
-- 3. reglas de validez del contrato
SELECT
  viaje_id, bici_id, estacion_origen,
  CASE WHEN estacion_destino = 99 THEN NULL ELSE estacion_destino END AS estacion_destino,
  inicio, fin,
  (unix_timestamp(fin) - unix_timestamp(inicio)) / 60.0 AS minutos,
  tipo_usuario, monto,
  estacion_destino = 99 AS fuera_de_estacion,
  CAST(inicio AS DATE) AS fecha
FROM numerados
WHERE rn = 1
  AND fin IS NOT NULL      -- en curso: todavía no
  AND fin >= inicio;       -- error de reloj: a cuarentena
```

:::nota Un formato explícito es una alarma
`to_timestamp(inicio, 'yyyy-MM-dd HH:mm:ss')` falla si llega una fecha con otro formato. Podrías usar `try_to_timestamp`, que devuelve NULL en vez de fallar, pero entonces los viajes con fecha rara desaparecerían en silencio (el filtro `fin IS NOT NULL` los saca). Por ahora preferimos que **falle y avise**. En la última lección vas a ver por qué esta decisión importa.
:::

## 5. La cuarentena

Lo que no entra en silver no se borra: se guarda con el motivo, para contarlo y avisar.

```sql norun
CREATE OR REPLACE TABLE pedalia.silver.viajes_cuarentena AS
SELECT b.*, 'error_reloj' AS motivo
FROM pedalia.bronze.viajes b
WHERE b.fin <> '' AND to_timestamp(b.fin, 'yyyy-MM-dd HH:mm:ss') < to_timestamp(b.inicio, 'yyyy-MM-dd HH:mm:ss');
```

## 6. La cuenta de control

```sql norun
SELECT
  (SELECT COUNT(*) FROM pedalia.bronze.viajes)                                   AS filas_archivo,
  (SELECT COUNT(*) - COUNT(DISTINCT viaje_id) FROM pedalia.bronze.viajes)        AS repetidas,
  (SELECT COUNT(DISTINCT viaje_id) FROM pedalia.bronze.viajes WHERE fin = '' OR fin IS NULL) AS en_curso,
  (SELECT COUNT(DISTINCT viaje_id) FROM pedalia.silver.viajes_cuarentena)        AS error_reloj,
  (SELECT COUNT(*) FROM pedalia.silver.viajes)                                   AS validos;
```

`filas_archivo − repetidas − en_curso − error_reloj` tiene que dar `validos`. Si da otra cosa, hay un caso que el contrato no previó: encuéntralo antes de seguir.

Cuando cierre, guarda la consulta de silver en el repositorio, en `sql/databricks/silver_viajes.sql`, con su PR.

:::errores
- **Inferir tipos en bronze**: el día que la fuente manda un valor raro, la carga se rompe o convierte mal sin avisar.
- **Usar `DISTINCT` para deduplicar**: si dos filas repetidas difieren en un detalle (un espacio, un monto corregido), `DISTINCT` deja las dos. `ROW_NUMBER` por la clave deja exactamente una.
- **Filtrar sin contar**: un `WHERE` que saca filas sin dejar registro hace que nadie sepa por qué el total bajó. La cuarentena y la cuenta de control lo hacen visible.
- **Usar la hora de fin para la fecha del viaje**: el contrato dice día de **inicio**. Un viaje que cruza la medianoche cambiaría de día y los ingresos no cuadrarían con finanzas.
:::

:::real En tu computadora y en la web real
En un Databricks real (Azure Databricks o la *Free Edition* en `databricks.com`):

1. **Catalog → External data → Credentials / External locations** conecta el lago con una *access connector* (identidad administrada), sin claves en los notebooks.
2. **Catalog → + → Create catalog** y los esquemas `bronze`, `silver`, `gold`.
3. **Workspace → Create → Notebook** (o *SQL Editor*): pegas el SQL de la lección y lo ejecutas con un **SQL warehouse** o un clúster.
4. La cuenta de control se corre en una celda aparte y su resultado se guarda en una tabla, para poder mostrarlo después.
:::

:::capturas Capturas para tu portafolio
Guárdalas en `docs/capturas/` del repositorio del proyecto y úsalas en el README.

- `06-catalogo.png`: el catálogo con los esquemas bronze y silver en *Catalog Explorer*.
- `06-silver.png`: el resultado de la consulta silver con la cantidad de filas.
- `06-control.png`: la cuenta de control cerrando (filas − descartes = válidos).

Antes de publicar, tapa con un rectángulo los correos, los IDs de suscripción y de tenant, los nombres de cuentas reales y cualquier clave o token.
:::

## Ejercicios

:::ejercicio quiz
Dos filas tienen el mismo `viaje_id` pero una trae el monto con un espacio al final. ¿Qué deduplica correctamente?
- [ ] `SELECT DISTINCT *`
- [x] `ROW_NUMBER() OVER (PARTITION BY viaje_id ORDER BY …)` y quedarse con `rn = 1`
- [ ] `GROUP BY` todas las columnas
- [ ] No hace falta: Databricks deduplica solo al crear la tabla
:::

:::ejercicio quiz
¿Qué autoriza a Databricks a leer `abfss://bronze@stpedaliadev.dfs.core.windows.net/`?
- [ ] Tener el workspace en la misma región que la cuenta
- [ ] Ser administrador del workspace
- [x] Una ubicación externa que cubre esa ruta, con una credencial cuya identidad tiene un rol de datos en la cuenta
- [ ] La clave de la cuenta escrita en la consulta
:::

:::ejercicio quiz
La cuenta de control da 2 viajes menos de lo esperado. ¿Qué haces?
- [ ] Nada: dos viajes no cambian los ingresos
- [ ] Sumas 2 a mano en gold
- [x] Buscas qué filas salieron de silver sin estar en ninguna categoría del contrato y decides con el equipo qué regla falta
- [ ] Borras silver y la vuelves a crear hasta que dé
:::

## Resumen

- Una **ubicación externa** + una **credencial** con rol en la cuenta = Databricks puede usar el lago.
- En **bronze** todo es texto; los tipos se aplican en silver, con formatos explícitos.
- Cada regla del contrato es una línea de SQL; lo descartado va a **cuarentena**.
- La **cuenta de control** prueba que la limpieza no perdió nada sin explicación.
