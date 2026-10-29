---
titulo: "Proyecto 1: Lakehouse de ventas con dbt, de DuckDB a Databricks"
nivel: Avanzado
duracion: 120
resumen: El proyecto base de todo portafolio de datos. Datos de una tienda online con duplicados, nulos, formatos rotos y datos tardíos; un pipeline medallón con dbt que corre primero en tu computadora con DuckDB y después en Databricks Free Edition; un modelo estrella con tests; un tablero; y un job programado. Valor - reemplazar un Excel manual de dos días por datos confiables cada mañana.
objetivos: Generar y explorar los datos crudos del proyecto con DuckDB | Construir staging, silver y gold con dbt y tests de calidad | Deduplicar, normalizar y convertir fechas con formatos mezclados | Diseñar un modelo estrella con su grano declarado | Llevar el mismo proyecto a Databricks con un volumen, dbt y un job programado
prerrequisitos: portafolio-como-armar-tu-portafolio | dbt-tests-docs
autoevaluacion: ¿Sabes cuál es el grano de tu tabla de hechos? | ¿Sabes deduplicar en staging con ROW_NUMBER? | ¿Sabes qué tests pusiste y por qué? | ¿Sabes cómo cambia el proyecto al pasar de DuckDB a Databricks? | ¿Puedes contar el valor del proyecto en una frase?
---

:::escenario
La gerente comercial de una tienda online arma cada mes un Excel con las ventas: exporta pedidos, los cruza a mano con productos y clientes, y tarda **dos días**. Los números nunca coinciden con los de Finanzas. Te pide "un tablero con las ventas de ayer, por país, canal y categoría, que se actualice solo". Este es el proyecto que más se repite en las empresas, y el que todo reclutador entiende.
:::

## Valor y alcance

| | Hoy | Con el proyecto |
|---|---|---|
| Frecuencia | Mensual | Diaria, 06:00 |
| Esfuerzo | 2 días por mes | 0 (automático) |
| Confianza | "No coincide con Finanzas" | Tests de calidad y definición única de "venta neta" |

**Fuera de alcance**: pronósticos, tiempo real. Escribirlo en el README demuestra criterio.

## Los datos

[🏭 Generar los datos del proyecto](#/generador?esc=ecommerce&n=2000&semilla=42&desde=2024-01-01&hasta=2024-12-31&duplicados=2&nulos=4&formatos=5&atipicos=1&huerfanos=1&tardios=3&mojibake=1) · Escenario **Tienda online**, 2.000 clientes, semilla 42, problemas "realista". Seis tablas: `clientes`, `productos`, `pedidos`, `detalle_pedidos`, `pagos` y `eventos_web`.

En la terminal del curso puedes explorarlos ya mismo:

```bash
generar-datos ecommerce --filas 500 --semilla 42 --problemas realista
duckdb -c "SELECT canal, COUNT(*) FROM '~/datos/generados/ecommerce/pedidos.csv' GROUP BY canal"
```

Vas a ver `web`, `WEB` y `  web`: el primer problema de calidad. Anótalo para la sección "Calidad de datos" del README.

## Arquitectura

```diagrama
titulo: Lakehouse de ventas - local y en Databricks
nodo raw: CSV crudos | icono=csv | col=0 | fila=0 | sub=data/raw o un volumen
nodo bronze: Bronze | icono=bucket | col=1 | fila=0 | color=naranja | sub=tal cual + _cargado_en
nodo silver: Silver (staging) | icono=dbt | col=2 | fila=0 | color=gris | sub=deduplicado, tipado,\nnormalizado
nodo gold: Gold (estrella) | icono=dbt | col=3 | fila=0 | color=amarillo | sub=fct_ventas + dimensiones
nodo bi: Tablero | icono=dashboard | col=3 | fila=1 | color=verde | sub=Streamlit local o\nAI/BI en Databricks
nodo orq: Orquestación | icono=orquestador | col=1 | fila=1 | color=violeta | sub=Job de Databricks\no Airflow local
nodo ci: CI | icono=githubactions | col=2 | fila=1 | sub=dbt build en cada PR
flecha raw -> bronze
flecha bronze -> silver
flecha silver -> gold
flecha gold -> bi
flecha orq -> bronze: dispara | estilo=punteada
flecha ci -> silver: prueba | estilo=punteada
```

## Fase 1: en tu computadora (gratis)

### 1. El proyecto

```bash
mkdir ventas-lakehouse && cd ventas-lakehouse && git init
uv init --python 3.12
uv add dbt-duckdb duckdb pandas streamlit
uv run dbt init transform        # elige duckdb
mkdir -p data/raw && echo "data/" >> .gitignore
# descomprime aquí el .zip del generador: data/raw/pedidos.csv, ...
```

`transform/profiles.yml` (o `~/.dbt/profiles.yml`):

```yaml
transform:
  target: dev
  outputs:
    dev:
      type: duckdb
      path: ../data/ventas.duckdb
      threads: 4
```

### 2. Bronze: las fuentes tal cual

En `models/sources.yml` declara las fuentes leyendo los CSV directamente (dbt-duckdb lo permite con `external_location`):

```yaml
version: 2
sources:
  - name: crudo
    meta:
      external_location: "read_csv_auto('../data/raw/{name}.csv', header=true, all_varchar=true)"
    tables:
      - name: pedidos
      - name: detalle_pedidos
      - name: clientes
      - name: productos
      - name: pagos
```

`all_varchar=true` lee todo como texto: las fechas con formatos mezclados y los números raros no rompen la carga. El tipado se hace en silver, a propósito.

### 3. Silver: limpiar con reglas explícitas

`models/staging/stg_pedidos.sql`:

```sql norun
with fuente as (
    select * from {{ source('crudo', 'pedidos') }}
),
tipado as (
    select
        cast(pedido_id as integer)                         as pedido_id,
        cast(cliente_id as integer)                        as cliente_id,
        cast(fecha_pedido as timestamp)                    as fecha_pedido,
        lower(trim(canal))                                 as canal,
        lower(trim(estado))                                as estado,
        nullif(lower(trim(metodo_pago)), '')               as metodo_pago,
        cast(cargado_en as timestamp)                      as cargado_en
    from fuente
),
dedup as (
    -- un reintento cargó algunos pedidos dos veces: nos quedamos con la primera carga
    select *, row_number() over (partition by pedido_id order by cargado_en) as rn
    from tipado
)
select * exclude (rn) from dedup where rn = 1
```

`models/staging/stg_clientes.sql` (fechas con dos formatos y textos con mojibake):

```sql norun
select
    cast(cliente_id as integer) as cliente_id,
    trim(nombre)                as nombre,
    lower(trim(email))          as email,
    trim(pais)                  as pais,
    coalesce(try_strptime(fecha_registro, '%Y-%m-%d'),
             try_strptime(fecha_registro, '%d/%m/%Y'))::date as fecha_registro
from {{ source('crudo', 'clientes') }}
qualify row_number() over (partition by cliente_id order by fecha_registro) = 1
```

:::cuidado El mojibake no se arregla con REPLACE en silver
`BogotÃ¡` viene de un archivo leído con la codificación equivocada. Lo correcto es corregir la lectura (o el sistema de origen) y documentarlo; un `replace` a mano solo cubre los casos que se te ocurrieron. En el proyecto, anótalo como hallazgo en la sección de calidad del README.
:::

### 4. Gold: el modelo estrella

| Tabla | Grano (una fila es…) | Columnas clave |
|---|---|---|
| `fct_ventas` | una línea de pedido entregado o enviado | fecha, cliente_id, producto_id, canal, cantidad, venta_neta, costo |
| `dim_cliente` | un cliente | país, segmento, fecha de registro |
| `dim_producto` | un producto | categoría, marca |
| `dim_fecha` | un día | año, mes, día de la semana, feriado |

`models/marts/fct_ventas.sql`:

```sql norun
select
    p.fecha_pedido::date                                   as fecha,
    p.pedido_id, p.cliente_id, d.producto_id, p.canal,
    d.cantidad,
    round(d.cantidad * d.precio_unitario * (1 - d.descuento), 2) as venta_neta,
    round(d.cantidad * pr.costo, 2)                        as costo
from {{ ref('stg_pedidos') }} p
join {{ ref('stg_detalle_pedidos') }} d using (pedido_id)
join {{ ref('stg_productos') }} pr using (producto_id)
where p.estado in ('entregado', 'enviado')
```

### 5. Tests: la definición de "confiable"

```yaml
models:
  - name: stg_pedidos
    columns:
      - name: pedido_id
        tests: [unique, not_null]
      - name: canal
        tests:
          - accepted_values: { values: ['web', 'app', 'tienda', 'telefono'] }
      - name: cliente_id
        tests:
          - relationships: { to: ref('stg_clientes'), field: cliente_id, severity: warn }
  - name: fct_ventas
    tests:
      - dbt_utils.expression_is_true: { expression: "venta_neta >= 0" }
```

Los huérfanos (`cliente_id` que no existe) quedan como **warn**: se reportan en el README con su cantidad y la decisión que tomaste (excluirlos, o asignarlos a un cliente "desconocido").

```bash
cd transform && uv run dbt build          # corre modelos y tests en orden
```

### 6. Un tablero rápido

```python norun
# app.py  →  uv run streamlit run app.py
import duckdb, streamlit as st
con = duckdb.connect("data/ventas.duckdb", read_only=True)
df = con.sql("select fecha, canal, sum(venta_neta) as ventas from fct_ventas group by all order by fecha").df()
st.title("Ventas diarias")
st.line_chart(df, x="fecha", y="ventas", color="canal")
```

## Fase 2: en Databricks Free Edition

1. **Catálogo y volumen**: en Free Edition el catálogo por defecto es `workspace`. Crea el esquema y un volumen para los archivos crudos:
   ```sql
   CREATE SCHEMA IF NOT EXISTS workspace.ventas;
   CREATE VOLUME IF NOT EXISTS workspace.ventas.crudo;
   ```
2. **Subir los CSV** desde tu computadora con la CLI (o arrastrando en la interfaz del volumen):
   ```bash
   databricks fs cp -r data/raw dbfs:/Volumes/workspace/ventas/crudo/
   ```
3. **Bronze** con `read_files` (lee CSV, JSON o Parquet de un volumen):
   ```sql
   CREATE OR REPLACE TABLE workspace.ventas.bronze_pedidos AS
   SELECT *, current_timestamp() AS _cargado_en, _metadata.file_path AS _archivo
   FROM read_files('/Volumes/workspace/ventas/crudo/pedidos.csv', format => 'csv', header => true);
   ```
4. **dbt en Databricks**: cambia el adaptador (`uv add dbt-databricks`) y el `profiles.yml` (host, `http_path` de un SQL warehouse, token o OAuth). Los modelos casi no cambian: `qualify`, `try_strptime` → `try_to_timestamp` y `exclude` → `except` son las diferencias de dialecto que vas a encontrar. Documéntalas: es un gran tema de entrevista.
5. **Tablero**: un tablero de AI/BI sobre `fct_ventas` y un **Job** programado a las 06:00 con una tarea de dbt (o un Asset Bundle, como en el proyecto 11).

## Entregables

- [ ] README con problema, resultado ("tablero diario en lugar de 2 días de Excel"), diagrama y cómo correrlo.
- [ ] Sección **Calidad de datos**: cuántos duplicados, nulos, formatos, huérfanos y tardíos encontraste y qué decidiste con cada uno.
- [ ] `dbt build` en verde, con tests de unicidad, nulos, valores aceptados y relaciones.
- [ ] Captura del tablero y del job programado.
- [ ] Sección **Dialectos**: qué cambió de DuckDB a Databricks.

## Práctica

:::ejercicio cli dificultad=Básico titulo="Los datos del proyecto"
Genera los datos del proyecto en la terminal: escenario `ecommerce`, 500 clientes, semilla 42, problemas `realista`.
```respuesta
todos: generar-datos ecommerce || --filas 500 || --semilla 42 || --problemas realista
```
```solucion
generar-datos ecommerce --filas 500 --semilla 42 --problemas realista
```
:::

:::ejercicio cli dificultad=Intermedio titulo="¿Hay pedidos duplicados?"
Con DuckDB, compara la cantidad de filas con la cantidad de `pedido_id` distintos en `~/datos/generados/ecommerce/pedidos.csv`.
```setup
generar-datos ecommerce --filas 500 --semilla 42 --problemas realista
```
```respuesta
duckdb -c ['"]SELECT COUNT\(\*\).*COUNT\(DISTINCT pedido_id\).*FROM.*pedidos\.csv.*['"]
```
```solucion
duckdb -c "SELECT COUNT(*) AS filas, COUNT(DISTINCT pedido_id) AS pedidos FROM '~/datos/generados/ecommerce/pedidos.csv'"
```
```pista
`SELECT COUNT(*), COUNT(DISTINCT pedido_id) FROM 'archivo.csv'`.
```
:::

:::ejercicio sql ordenado dificultad=Intermedio titulo="Staging: deduplicar pedidos"
`raw_pedidos` es la copia bronze, con pedidos cargados dos veces. Escribe la lógica de `stg_pedidos`: una fila por `pedido_id` (la de menor `cargado_en`), con `canal` normalizado (`LOWER(TRIM(canal))`). Devuelve `pedido_id`, `canal` y `cargado_en`, ordenado por `pedido_id`.
```sql setup
CREATE TABLE raw_pedidos (pedido_id TEXT, cliente_id TEXT, canal TEXT, estado TEXT, cargado_en TEXT);
INSERT INTO raw_pedidos VALUES
('1', '10', 'web', 'entregado', '2024-03-01 03:10:00'), ('2', '11', ' APP', 'entregado', '2024-03-01 03:10:00'),
('2', '11', 'app', 'entregado', '2024-03-01 03:45:00'), ('3', '12', 'Tienda ', 'cancelado', '2024-03-01 03:10:00'),
('4', '10', 'WEB', 'entregado', '2024-03-02 03:10:00'), ('4', '10', 'WEB', 'entregado', '2024-03-02 03:10:05');
```
```sql solucion
WITH d AS (
  SELECT pedido_id, LOWER(TRIM(canal)) AS canal, cargado_en,
         ROW_NUMBER() OVER (PARTITION BY pedido_id ORDER BY cargado_en) AS rn
  FROM raw_pedidos
)
SELECT CAST(pedido_id AS INTEGER) AS pedido_id, canal, cargado_en FROM d WHERE rn = 1 ORDER BY pedido_id;
```
```pista
`ROW_NUMBER() OVER (PARTITION BY pedido_id ORDER BY cargado_en)` y quédate con `rn = 1`.
```
:::

:::ejercicio sql ordenado dificultad=Avanzado titulo="Fechas con dos formatos"
`raw_clientes.fecha_registro` trae fechas como `2024-03-15` y como `15/03/2024`. Devuelve `cliente_id` y `fecha` en formato ISO (`AAAA-MM-DD`) para todos, ordenado por `cliente_id`.
```sql setup
CREATE TABLE raw_clientes (cliente_id INTEGER, fecha_registro TEXT);
INSERT INTO raw_clientes VALUES (1, '2024-03-15'), (2, '15/03/2024'), (3, '01/12/2023'), (4, '2023-07-09'), (5, NULL);
```
```sql solucion
SELECT cliente_id,
       CASE WHEN fecha_registro LIKE '__/__/____'
            THEN substr(fecha_registro, 7, 4) || '-' || substr(fecha_registro, 4, 2) || '-' || substr(fecha_registro, 1, 2)
            ELSE fecha_registro END AS fecha
FROM raw_clientes
ORDER BY cliente_id;
```
```pista
Reconoce el formato con `LIKE '__/__/____'` y reordena las partes con `substr`.
```
```explicacion
En DuckDB lo harías con `coalesce(try_strptime(x, '%Y-%m-%d'), try_strptime(x, '%d/%m/%Y'))` y en Databricks con `coalesce(try_to_timestamp(x, 'yyyy-MM-dd'), try_to_timestamp(x, 'dd/MM/yyyy'))`. El `NULL` se mantiene: no inventes fechas.
```
:::

:::ejercicio sql ordenado dificultad=Avanzado titulo="Gold: ventas netas por día y canal"
Con `stg_ped_gold` y `stg_det_gold` (las versiones limpias de pedidos y detalle), calcula la tabla gold `ventas_diarias`: por `fecha` y `canal`, la `venta_neta` (suma de cantidad × precio × (1 − descuento), 2 decimales), solo de pedidos `entregado` o `enviado`. Ordena por fecha y canal.
```sql setup
CREATE TABLE stg_ped_gold (pedido_id INTEGER, fecha TEXT, canal TEXT, estado TEXT);
INSERT INTO stg_ped_gold VALUES (1, '2024-03-01', 'web', 'entregado'), (2, '2024-03-01', 'app', 'entregado'), (3, '2024-03-01', 'web', 'cancelado'), (4, '2024-03-02', 'web', 'enviado');
CREATE TABLE stg_det_gold (pedido_id INTEGER, producto_id INTEGER, cantidad INTEGER, precio_unitario REAL, descuento REAL);
INSERT INTO stg_det_gold VALUES (1, 7, 2, 100, 0), (1, 8, 1, 50, 0.1), (2, 7, 1, 100, 0.2), (3, 9, 5, 30, 0), (4, 8, 3, 50, 0);
```
```sql solucion
SELECT p.fecha, p.canal, ROUND(SUM(d.cantidad * d.precio_unitario * (1 - d.descuento)), 2) AS venta_neta
FROM stg_ped_gold p
JOIN stg_det_gold d ON d.pedido_id = p.pedido_id
WHERE p.estado IN ('entregado', 'enviado')
GROUP BY p.fecha, p.canal
ORDER BY p.fecha, p.canal;
```
:::

:::ejercicio quiz dificultad=Intermedio
¿Cuál es el **grano** correcto de `fct_ventas` en este proyecto?

- [ ] Un pedido
- [x] Una línea de pedido (un producto dentro de un pedido)
- [ ] Un día por canal
- [ ] Un cliente por mes
:::

:::ejercicio quiz dificultad=Intermedio
El test `relationships` encuentra 12 pedidos con un `cliente_id` que no existe. ¿Qué haces?

- [ ] Borras el test para que `dbt build` pase
- [x] Lo dejas como `warn`, decides (excluir o asignar a "cliente desconocido"), y documentas cuántos son y por qué
- [ ] Inventas clientes con esos IDs
- [ ] Ignoras el problema
:::

:::ejercicio quiz dificultad=Avanzado
¿Por qué conviene leer bronze con `all_varchar=true` (todo como texto)?

- [ ] Porque ocupa menos espacio
- [x] Para que una fecha mal formada o un número raro no rompa la carga: los tipos se aplican en silver, con reglas explícitas y tests
- [ ] Porque dbt no soporta números
- [ ] Porque DuckDB no infiere tipos
:::

## Para ir más lejos

- Modelos **incrementales** en `fct_ventas` (`materialized='incremental'`, `unique_key`) con una ventana de relectura de 3 días para los datos tardíos.
- `dim_cliente` como **SCD tipo 2** con `dbt snapshot` (cambios de segmento o país).
- Comparar el tiempo y el costo del mismo `dbt build` en DuckDB y en Databricks.
