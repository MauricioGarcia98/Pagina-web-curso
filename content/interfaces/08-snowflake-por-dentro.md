---
titulo: Snowflake por dentro - warehouses, bases, stages, Time Travel y costos
nivel: Intermedio
duracion: 45
resumen: Recorrido por Snowflake y su interfaz web (Snowsight) - la separación entre almacenamiento y cómputo, warehouses virtuales y créditos, bases y esquemas, hojas de SQL, stages y COPY INTO, Time Travel, UNDROP y clones, roles y permisos, y Query History. Con una carga completa de punta a punta.
objetivos: Explicar por qué en Snowflake el almacenamiento y el cómputo se pagan por separado | Crear y dimensionar un warehouse y estimar cuántos créditos consume | Cargar archivos con un stage y COPY INTO sin duplicar | Recuperar datos borrados con Time Travel y UNDROP | Dar permisos con roles siguiendo el mínimo privilegio
prerrequisitos: sql-select
autoevaluacion: ¿Sabes qué es un warehouse en Snowflake y cuándo cobra? | ¿Sabes por qué una consulta falla con "No active warehouse selected"? | ¿Sabes qué hace COPY INTO si lo ejecutas dos veces con los mismos archivos? | ¿Sabes cómo ver una tabla como estaba antes de un DELETE? | ¿Sabes por qué no conviene trabajar con ACCOUNTADMIN?
---

:::tip Practícalo mientras lees
Abre [Snowflake de práctica](#/snowflake). Corre en tu navegador sobre DuckDB con la base de la tienda del curso: no necesitas cuenta ni tarjeta. Imita la interfaz y el SQL de Snowflake, pero no es Snowflake: al final está la lista de lo que cambia.
:::

:::analogia En palabras simples
Snowflake es como un depósito enorme (el almacenamiento) con cocinas que se alquilan por minuto (los warehouses). Los datos están siempre guardados y se pagan por lo que ocupan; la cocina solo se paga mientras está encendida. Puedes tener una cocina chica para el equipo de análisis y una grande para la carga de la noche, sin que una le quite lugar a la otra.
:::

## Qué es Snowflake

**Snowflake** es un data warehouse en la nube que funciona en AWS, Azure o Google Cloud. Su idea central es separar tres capas:

| Capa | Qué hace | Cómo se paga |
|---|---|---|
| **Almacenamiento** | Guarda las tablas en un formato columnar comprimido (micro-particiones) | Por TB al mes |
| **Cómputo** | Los **warehouses virtuales** ejecutan las consultas | Por **créditos**, por segundo mientras están encendidos |
| **Servicios en la nube** | Autenticación, metadatos, optimizador, seguridad | Incluido casi siempre |

Como el cómputo está separado, varios equipos pueden consultar los mismos datos al mismo tiempo, cada uno con su warehouse, sin pisarse.

## Snowsight: la interfaz

| Sección | Para qué sirve |
|---|---|
| **Worksheets** | Hojas de SQL: escribes, ejecutas (Ctrl+Enter) y ves el resultado |
| **Databases** | Explorador de bases, esquemas, tablas, vistas y stages, con columnas y vista previa |
| **Query History** | Todo lo que se ejecutó: quién, con qué rol y warehouse, cuánto tardó y si falló |
| **Warehouses** | Crear, dimensionar, suspender y reanudar el cómputo |
| **Users & Roles** | Usuarios, roles y permisos |

Arriba de cada hoja hay dos selectores: **rol · warehouse** y **base.esquema**. Son el *contexto* de la sesión, lo mismo que ejecutar `USE ROLE`, `USE WAREHOUSE` y `USE SCHEMA`.

## Warehouses y créditos

Un warehouse tiene un **tamaño**: X-Small consume 1 crédito por hora, Small 2, Medium 4, y así se duplica en cada tamaño. Un tamaño más grande no es más caro por consulta si la consulta termina proporcionalmente más rápido; sirve para consultas pesadas, no para muchas consultas chicas (para eso existe el escalado multi-cluster).

```sql norun
CREATE WAREHOUSE etl_wh
  WAREHOUSE_SIZE = 'XSMALL'
  AUTO_SUSPEND = 60        -- se apaga tras 60 s sin consultas
  AUTO_RESUME = TRUE       -- se enciende solo al recibir una consulta
  INITIALLY_SUSPENDED = TRUE;

ALTER WAREHOUSE etl_wh SET WAREHOUSE_SIZE = 'SMALL';
ALTER WAREHOUSE etl_wh SUSPEND;
```

Reglas que conviene recordar:

- Se cobra **por segundo**, con un **mínimo de 60 segundos** cada vez que el warehouse arranca.
- Un warehouse suspendido **no cobra**. Por eso `AUTO_SUSPEND` bajo (60 a 300 segundos) es lo más importante para controlar costos.
- Si no hay warehouse en el contexto, una consulta falla con *No active warehouse selected in the current session*. La solución es `USE WAREHOUSE nombre;`.
- Algunas cosas no necesitan warehouse: `SHOW`, `DESCRIBE` y consultas que se responden solo con metadatos.

En la réplica, la página **Warehouses** suma los créditos de tus consultas con estas mismas reglas.

## Bases, esquemas y nombres

Toda tabla vive en `BASE.ESQUEMA.TABLA`. Los nombres sin comillas se guardan en **mayúsculas**: `ventas`, `Ventas` y `VENTAS` son la misma tabla; `"Ventas"`, con comillas, sería otra.

```sql norun
CREATE DATABASE analitica;
CREATE SCHEMA analitica.staging;
USE SCHEMA analitica.staging;
CREATE TABLE ventas (id INT, monto NUMBER(10,2), pais VARCHAR);
```

## Cargar archivos: stages y COPY INTO

Un **stage** es una carpeta donde quedan los archivos antes de cargarlos. Puede ser **interno** (los archivos viven en Snowflake; en Snowsight se suben con **+ Files**) o **externo** (apunta a un bucket de S3, un contenedor de Azure o GCS).

```sql norun
CREATE STAGE carga;
LIST @carga;

COPY INTO clientes_nuevos
FROM @carga
PATTERN = '.*clientes.*[.]csv'
FILE_FORMAT = (TYPE = CSV SKIP_HEADER = 1)
ON_ERROR = 'ABORT_STATEMENT';
```

`COPY INTO` **recuerda qué archivos ya cargó** en esa tabla (durante 64 días): si lo ejecutas otra vez, esos archivos aparecen como `LOAD_SKIPPED` y no se duplican filas. Para cargarlos de nuevo a propósito se usa `FORCE = TRUE`. Para cargas continuas sin programar nada existe **Snowpipe**, que ejecuta el `COPY` cada vez que llega un archivo.

## Time Travel, UNDROP y clones

Snowflake guarda las versiones anteriores de los datos durante un período de retención (1 día por defecto; hasta 90 en la edición Enterprise). Eso permite:

```sql norun
-- la tabla como estaba hace 5 minutos
SELECT * FROM ventas AT(OFFSET => -60*5);

-- la tabla justo antes de una sentencia (el Query ID sale de Query History)
SELECT * FROM ventas BEFORE(STATEMENT => '01b2c3d4-0000-0001');

-- recuperar las filas borradas
INSERT INTO ventas SELECT * FROM ventas BEFORE(STATEMENT => '01b2c3d4-0000-0001') WHERE pais = 'AR';

-- recuperar una tabla borrada
DROP TABLE ventas;
UNDROP TABLE ventas;
```

Un **clon** (`CREATE TABLE ventas_dev CLONE ventas;`) crea una copia que al principio no ocupa espacio: comparte las micro-particiones con el original y solo guarda lo que cambias. Se usa mucho para tener un entorno de pruebas con datos reales en segundos.

## Roles y permisos

En Snowflake los permisos se dan a **roles**, y los roles a usuarios. Los roles del sistema:

| Rol | Para qué |
|---|---|
| `ACCOUNTADMIN` | Todo, incluida la facturación. Úsalo solo para tareas de cuenta |
| `SECURITYADMIN` | Administra permisos y usuarios |
| `USERADMIN` | Crea usuarios y roles |
| `SYSADMIN` | Crea warehouses, bases y objetos: el rol de trabajo de ingeniería |
| `PUBLIC` | Lo tienen todos |

Para que un rol pueda leer una tabla necesita permiso en **toda la cadena**: el warehouse, la base, el esquema y la tabla.

```sql norun
USE ROLE SECURITYADMIN;   -- SYSADMIN no puede crear roles
CREATE ROLE analista;
GRANT USAGE ON WAREHOUSE compute_wh TO ROLE analista;
GRANT USAGE ON DATABASE tienda_andina TO ROLE analista;
GRANT USAGE ON SCHEMA tienda_andina.public TO ROLE analista;
GRANT SELECT ON ALL TABLES IN SCHEMA tienda_andina.public TO ROLE analista;
GRANT SELECT ON FUTURE TABLES IN SCHEMA tienda_andina.public TO ROLE analista;
GRANT ROLE analista TO USER alumno;

USE ROLE analista;       -- prueba el rol: solo puede leer ese esquema
```

En la réplica los permisos **se cumplen**: con `analista`, una tabla de otro esquema responde *does not exist or not authorized* (Snowflake no distingue "no existe" de "no tienes permiso", a propósito), y un warehouse sin `USAGE` responde *Insufficient privileges*.

`FUTURE TABLES` hace que las tablas que se creen después también queden con el permiso.

## Funciones propias de Snowflake

| Snowflake | Qué hace |
|---|---|
| `IFF(cond, a, b)` | Un `CASE WHEN` corto |
| `NVL(x, y)` | `COALESCE` de dos valores |
| `DATEADD(day, 7, fecha)` / `DATEDIFF(day, a, b)` | Sumar y restar fechas |
| `QUALIFY` | Filtrar por una función de ventana sin subconsulta |
| `columna:campo.sub::string` | Leer un campo de un JSON guardado como `VARIANT` |
| `LATERAL FLATTEN(input => arr)` | Convertir un array en filas |

## Un flujo completo

1. Crea un warehouse `etl_wh` X-Small con `AUTO_SUSPEND = 60` y úsalo.
2. Crea la base `analitica`, el esquema `staging` y un stage `carga`.
3. En **Databases**, abre el stage y agrega los archivos de ejemplo.
4. Crea la tabla `clientes_nuevos` y cárgala con `COPY INTO`. Ejecuta el `COPY` otra vez y mira el `LOAD_SKIPPED`.
5. Borra por error los clientes de un país con `DELETE` y recupéralos con `BEFORE(STATEMENT => ...)`.
6. Con `SECURITYADMIN`, crea el rol `analista` con permiso de lectura, asígnatelo y prueba qué puede y qué no.
7. Mira en **Warehouses** cuántos créditos usaste y en **Query History** todo lo que corrió.

## Qué tiene la réplica y qué no

| En la réplica | Todavía no |
|---|---|
| Hojas de SQL con contexto, explorador de objetos y vista previa | Notebooks, Streamlit, dashboards, Cortex (IA) |
| Warehouses con tamaño, auto-suspend, auto-resume y créditos | Multi-cluster, resource monitors, Query Acceleration |
| Bases, esquemas, tablas, vistas, clones | Data sharing, Marketplace, tablas Iceberg, dynamic tables |
| Stages internos, `LIST`, `REMOVE`, `COPY INTO` con `PATTERN`, `SKIP_HEADER`, `FORCE` | Stages externos, Snowpipe, `PUT`/`GET` desde SnowSQL |
| Time Travel (`AT`, `BEFORE`) y `UNDROP TABLE` | Fail-safe, retención configurable |
| Roles con jerarquía, `GRANT`/`REVOKE`, `SHOW GRANTS`; los permisos se hacen cumplir en cada consulta | Políticas de enmascaramiento y de filas, tags |

El motor por debajo es DuckDB: algunas funciones muy específicas de Snowflake pueden no estar o dar mensajes de error distintos.

:::ejercicio quiz
Ejecutas `SELECT * FROM ventas;` y Snowflake responde *No active warehouse selected in the current session*. ¿Qué haces?
- [ ] Creo una base de datos nueva
- [x] `USE WAREHOUSE compute_wh;` (o eliges un warehouse en el selector de la hoja)
- [ ] `GRANT SELECT ON ventas TO ROLE sysadmin;`
- [ ] Cambio el tamaño de la tabla
:::

:::ejercicio quiz
Un warehouse Medium (4 créditos por hora) se usa 15 minutos por día durante 30 días, con `AUTO_SUSPEND = 60`. ¿Cuántos créditos consume aproximadamente?
- [ ] 4
- [x] 30
- [ ] 120
- [ ] 2.880
:::

:::ejercicio quiz
Ejecutaste `COPY INTO clientes FROM @carga ...` y cargó 3 archivos. Lo ejecutas otra vez sin cambiar nada. ¿Qué pasa?
- [ ] Se duplican todas las filas
- [ ] Falla porque la tabla ya tiene datos
- [x] Los 3 archivos aparecen como `LOAD_SKIPPED`: Snowflake recuerda qué cargó
- [ ] Se borra la tabla y se vuelve a cargar
:::

:::ejercicio quiz
Alguien ejecutó un `DELETE` sin `WHERE` sobre `pedidos` hace 10 minutos. ¿Cómo recuperas los datos?
- [ ] No se puede: hay que pedir un backup a soporte
- [ ] `UNDROP TABLE pedidos;`
- [x] Con Time Travel: `INSERT INTO pedidos SELECT * FROM pedidos BEFORE(STATEMENT => '<id del DELETE>');`
- [ ] `ROLLBACK;` en otra hoja
:::

:::ejercicio quiz
Un analista nuevo necesita leer las tablas del esquema `ventas.public`. ¿Qué es lo recomendado?
- [ ] Darle el rol `ACCOUNTADMIN` para que no tenga problemas
- [x] Un rol `analista` con `USAGE` en el warehouse, la base y el esquema, y `SELECT` en las tablas, asignado a su usuario
- [ ] Compartirle el usuario y la contraseña de otra persona
- [ ] `GRANT ALL ON DATABASE ventas TO ROLE public;`
:::
