---
titulo: Snowflake y BigQuery - cada área recibe sus datos desde el lago
nivel: Intermedio
duracion: 50
resumen: Preparas los dos destinos. En Snowflake, para finanzas, creas la tabla, un stage externo que apunta al contenedor gold con un token SAS de solo lectura, y la carga idempotente con COPY INTO. En BigQuery, para marketing, creas el dataset y cargas desde Azure con LOAD DATA y una conexión. Pruebas las dos cargas a mano antes de automatizarlas.
objetivos: Generar un token SAS con permisos mínimos y fecha de vencimiento | Crear un stage externo en Snowflake y cargar con COPY INTO sin duplicar | Cargar archivos de Azure en BigQuery con LOAD DATA | Explicar qué hace idempotente a cada carga
prerrequisitos: proyecto-pedalia-gold-y-exportacion | interfaces-snowflake-por-dentro | interfaces-bigquery-por-dentro
autoevaluacion: ¿Sabes qué permisos necesita el token SAS de Snowflake y por qué no más? | ¿Sabes qué hace COPY INTO con un archivo que ya cargó? | ¿Sabes por qué se usa TRUNCATE + COPY INTO con FORCE en este proyecto? | ¿Sabes qué diferencia hay entre LOAD DATA INTO y LOAD DATA OVERWRITE?
---

:::escenario Miércoles, 15:00
Los archivos gold ya están en el lago. Lucía quiere verlos en Snowflake y Tomás en BigQuery. Ninguno de los dos va a entrar a Databricks: cada área trabaja en su herramienta, y tu trabajo es que los datos lleguen ahí, iguales y a tiempo.
:::

:::analogia El correo con llave
El lago es un edificio de casillas. Para que Snowflake retire las cartas de finanzas, le das una **llave que abre una sola casilla, solo para leer y que vence en una fecha** (el token SAS). No le das la llave maestra del edificio (la clave de la cuenta).
:::

## Parte 1 · Snowflake (finanzas)

### El token SAS

Un token SAS es un permiso firmado con alcance, permisos y vencimiento. Para leer una carpeta, Snowflake necesita **listar** (`l`) y **leer** (`r`), nada más:

```bash
az storage container generate-sas --account-name stpedaliadev -n gold \
  --permissions rl --expiry 2027-01-31T00:00Z -o tsv
```

Copia el resultado (empieza con `se=`). También puedes generarlo en el portal: cuenta → **Shared access signature**, con servicio Blob, tipos Container y Object, y permisos Read y List.

:::cuidado El token vence
Eso es bueno (si se filtra, deja de servir) y es una fuente clásica de incidentes: un día la carga falla con *AuthenticationFailed* porque venció el token. Anota la fecha en el README y, en producción, usa una **storage integration** (Snowflake se autentica con su propia identidad en Azure, sin tokens que vencen).
:::

### Tabla y stage

Abre el [Snowflake de práctica](#/snowflake) y ejecuta (reemplaza `<TOKEN>` por el que generaste):

```sql norun
USE ROLE SYSADMIN;
USE WAREHOUSE COMPUTE_WH;
CREATE DATABASE IF NOT EXISTS PEDALIA;
CREATE SCHEMA IF NOT EXISTS PEDALIA.FINANZAS;
USE SCHEMA PEDALIA.FINANZAS;

CREATE OR REPLACE TABLE INGRESOS_DIARIOS (
  FECHA DATE, TIPO_USUARIO STRING, VIAJES NUMBER, INGRESOS NUMBER(12, 2)
);

CREATE OR REPLACE STAGE LAGO_GOLD
  URL = 'azure://stpedaliadev.blob.core.windows.net/gold/'
  CREDENTIALS = (AZURE_SAS_TOKEN = '?<TOKEN>');

LIST @LAGO_GOLD;
```

`LIST` tiene que mostrar el `part-00000-….csv` de `ingresos_diarios/` y de `uso_por_barrio/` (el `_SUCCESS` no aparece: Snowflake no lo considera un dato).

### La carga idempotente

```sql norun
TRUNCATE TABLE INGRESOS_DIARIOS;
COPY INTO INGRESOS_DIARIOS
  FROM @LAGO_GOLD/ingresos_diarios/
  FILE_FORMAT = (TYPE = CSV SKIP_HEADER = 1)
  FORCE = TRUE;

SELECT FECHA, TIPO_USUARIO, VIAJES, INGRESOS FROM INGRESOS_DIARIOS ORDER BY FECHA, TIPO_USUARIO;
```

¿Por qué `TRUNCATE` y `FORCE = TRUE`? Porque la exportación de gold **reemplaza todo** en cada corrida. La tabla de Snowflake tiene que ser una copia exacta de ese archivo:

- Sin `TRUNCATE`, cada corrida agregaría las filas otra vez (duplicados).
- Sin `FORCE`, si el archivo no cambió de nombre, `COPY INTO` lo **saltea** (recuerda qué archivos ya cargó) y después del `TRUNCATE` la tabla quedaría vacía.

Ejecuta el bloque dos veces: el resultado tiene que ser idéntico. Eso es **idempotente**.

:::nota El otro patrón
Si cada día llegara un archivo nuevo con solo ese día (en vez de todo), lo correcto sería lo contrario: `COPY INTO` sin `FORCE`, que carga solo los archivos nuevos y saltea los ya cargados. Elegir el patrón depende de cómo escribe el productor.
:::

Guarda este SQL en `sql/snowflake/finanzas.sql` (sin el token: el token **nunca** va al repositorio).

## Parte 2 · BigQuery (marketing)

BigQuery puede cargar archivos de Azure Blob Storage con `LOAD DATA … FROM FILES` y una **conexión** a Azure (en la consola: Add data → Connections to external data sources). La conexión guarda cómo autenticarse; la consulta solo la nombra.

En el [BigQuery de práctica](#/bigquery):

```sql norun
CREATE SCHEMA IF NOT EXISTS pedalia_mkt;

LOAD DATA OVERWRITE pedalia_mkt.uso_por_barrio
FROM FILES (
  format = 'CSV',
  skip_leading_rows = 1,
  uris = ['azure://stpedaliadev.blob.core.windows.net/gold/uso_por_barrio/*.csv']
)
WITH CONNECTION `azure-eastus2.lago_pedalia`;

SELECT barrio, SUM(viajes) AS viajes, SUM(viajes_pase_dia) AS pase_dia
FROM pedalia_mkt.uso_por_barrio
GROUP BY barrio
ORDER BY pase_dia DESC;
```

`OVERWRITE` reemplaza la tabla completa: correrlo dos veces da lo mismo. Con `LOAD DATA INTO` agregarías filas en cada corrida.

Fíjate en el detalle del job: una carga **no cobra bytes procesados**. La consulta de abajo sí (mira la estimación arriba a la derecha antes de ejecutar).

Guarda el SQL en `sql/bigquery/marketing.sql`.

:::errores
- **Token SAS con todos los permisos** (`racwdl`) "para no tener problemas": quien lo encuentre puede borrar el contenedor. Lectura y listado alcanzan.
- **Token en el repositorio o en el DAG**: va en la configuración del stage (o en un secreto), nunca en un archivo versionado.
- **`COPY INTO` repetido sin pensar en la idempotencia**: según cómo escribe el productor, terminas con duplicados o con una tabla vacía.
- **`LOAD DATA INTO` en una carga diaria completa**: cada día suma todo de nuevo y los viajes de marketing se multiplican.
:::

## Ejercicios

:::ejercicio quiz
¿Qué permisos necesita el token SAS para que el stage de Snowflake pueda cargar los archivos de gold?
- [ ] Todos (racwdl), para evitar errores
- [x] Read y List: leer los archivos y listar la carpeta
- [ ] Write y Delete, porque COPY INTO mueve los archivos
- [ ] Ninguno: Snowflake entra con la clave de la cuenta
:::

:::ejercicio quiz
Haces `TRUNCATE` y después `COPY INTO` **sin** `FORCE = TRUE`, y el archivo de gold es el mismo de la corrida anterior. ¿Qué queda en la tabla?
- [ ] Los datos duplicados
- [ ] Los mismos datos que antes
- [x] La tabla vacía: COPY INTO saltea el archivo porque recuerda que ya lo cargó
- [ ] Un error de sintaxis
:::

:::ejercicio quiz
¿Por qué la carga de BigQuery usa `LOAD DATA OVERWRITE` y no `LOAD DATA INTO`?
- [ ] Porque `INTO` no acepta archivos de Azure
- [ ] Porque `OVERWRITE` es más barato
- [x] Porque el archivo trae todos los días cada vez; `INTO` agregaría todo de nuevo en cada corrida
- [ ] Porque `INTO` necesita que la tabla esté particionada
:::

## Resumen

- A otros sistemas se les da acceso **mínimo y con vencimiento** (token SAS r+l), o mejor, una integración con identidad propia.
- Una carga es **idempotente** si correrla dos veces da lo mismo; cómo lograrlo depende de cómo escribe el productor.
- Snowflake: stage externo + `COPY INTO` (con `TRUNCATE` y `FORCE` cuando el archivo trae todo).
- BigQuery: `LOAD DATA OVERWRITE … FROM FILES … WITH CONNECTION`; las cargas no cobran bytes procesados.
