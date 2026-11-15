---
titulo: Stages y COPY INTO - cargar archivos a una tabla
nivel: 3 · Intermedio
duracion: 45
resumen: Los datos llegan como archivos. Creas el stage interno carga_pedidos, subes un CSV, lo listas con LIST, intentas cargarlo sin decir que tiene encabezado para ver el error, y lo cargas bien con COPY INTO y un formato de archivo. También conoces los stages externos, PUT y las opciones de error.
objetivos: Crear un stage interno y subir archivos | Listar archivos con LIST | Cargar con COPY INTO y FILE_FORMAT | Leer el resultado y los errores de una carga | Conocer stages externos y opciones de error
prerrequisitos: snowflake-paso-a-paso-proyecto-entorno-de-desarrollo
autoevaluacion: ¿Sabes qué es un stage? | ¿Sabes por qué falló la primera carga? | ¿Sabes qué devuelve COPY INTO? | ¿Sabes la diferencia entre stage interno y externo?
---

:::escenario El pedido
Lucía: *"El sistema de la tienda deja cada día un CSV con los pedidos. Quiero cargarlo a `raw.pedidos_staging`."*
:::

## Paso 1 — Crear el stage

```sql norun
USE SCHEMA tienda_dev.raw;
CREATE STAGE carga_pedidos;
```

Un **stage** es una carpeta donde se dejan archivos antes de cargarlos. Este es **interno**: los archivos viven dentro de Snowflake.

## Paso 2 — Subir el archivo

En el explorador, abre `@CARGA_PEDIDOS` → **+ Files** y sube `pedidos_2026_11_14.csv`:

```captura
archivo: snowflake/s09-stage.webp
texto: El stage con + Files (1) y el archivo subido (2)
```

```sql norun
LIST @carga_pedidos;
```

```captura
archivo: snowflake/s09-list.webp
texto: LIST - nombre, tamaño, md5 y última modificación de cada archivo
```

:::nota Fuera de Snowsight
Desde la terminal se sube con el comando `PUT file:///datos/pedidos_2026_11_14.csv @carga_pedidos;` del Snowflake CLI o SnowSQL.
:::

## Paso 3 — La primera carga (con error)

```sql norun
CREATE TABLE pedidos_staging (
  pedido_id INT, cliente_id INT, fecha DATE, canal VARCHAR, total NUMBER(10,2)
);
COPY INTO pedidos_staging FROM @carga_pedidos;
```

```captura
archivo: snowflake/s09-error.webp
texto: CSV Error on Line 1 - la primera línea es el encabezado y "pedido_id" no es un número
```

Por defecto COPY INTO **aborta** la carga ante el primer error (`ON_ERROR = ABORT_STATEMENT`): no carga nada a medias.

## Paso 4 — Cargar bien

```sql norun
COPY INTO pedidos_staging
FROM @carga_pedidos
FILE_FORMAT = (TYPE = CSV SKIP_HEADER = 1);
```

```captura
archivo: snowflake/s09-copy.webp
texto: El COPY INTO con el formato (1) y el resultado - archivo LOADED con 5 filas leídas y 5 cargadas (2)
```

| Opción | Para |
|---|---|
| `FILE_FORMAT = (TYPE = CSV SKIP_HEADER = 1)` | Saltear el encabezado |
| `FIELD_DELIMITER = ';'` | Archivos separados por punto y coma |
| `PATTERN = '.*pedidos_.*[.]csv'` | Cargar solo los archivos que coinciden |
| `ON_ERROR = CONTINUE` | Cargar las filas buenas y saltear las malas |
| `CREATE FILE FORMAT csv_tienda ...` | Guardar el formato con nombre y reusarlo |

## Paso 5 — Stages externos

En producción, los archivos suelen estar en S3, Azure Blob Storage o Google Cloud Storage. Se crea un **stage externo** que apunta al bucket mediante una **storage integration** (la credencial la administra Snowflake, no va en el SQL):

```sql norun
CREATE STAGE ventas_s3
  URL = 's3://tienda-andina-landing/pedidos/'
  STORAGE_INTEGRATION = s3_tienda
  FILE_FORMAT = (TYPE = CSV SKIP_HEADER = 1);
```

## ✅ Lo que lograste

- Creaste un stage, subiste y listaste archivos.
- Cargaste con COPY INTO y entendiste el error.
- Conoces las opciones y los stages externos.

:::ejercicio quiz
¿Qué es un stage en Snowflake?
- [ ] Un warehouse
- [x] Una ubicación donde se dejan archivos antes de cargarlos
- [ ] Un rol
- [ ] Una vista
:::

:::ejercicio quiz
¿Por qué falló la primera carga?
- [ ] Porque faltaba el warehouse
- [x] Porque el archivo tiene encabezado y la primera fila no es un número
- [ ] Porque el stage estaba vacío
- [ ] Porque el rol no tenía permisos
:::

:::ejercicio quiz
¿Qué hace COPY INTO por defecto ante un error?
- [x] Aborta la carga entera
- [ ] Carga todo menos la fila mala
- [ ] Borra el archivo
- [ ] Nada
:::

:::ejercicio quiz
¿Cómo accede un stage externo a un bucket de S3 sin poner claves en el SQL?
- [ ] Con un comentario
- [x] Con una storage integration
- [ ] Con el usuario y contraseña en la URL
- [ ] No se puede
:::
